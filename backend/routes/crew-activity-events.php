<?php

/**
 * The crew-internal motivation feed — see db/schema.sql's `crew_activity_events`. This is the real,
 * timestamped activity feed src/lib/notifications.ts previously had no data source for ("No
 * fabricated crew/social events, since there's no real timestamped activity feed to draw those from
 * yet"). Clients log an event right after detecting it themselves (PR / streak milestone / long
 * session / division up); every crewmate can then read the crew's feed.
 *
 * Routes (all require auth, see index.php):
 *   POST /crew-activity-events               -> log an event for the caller's crew (best-effort, no-op if not in a crew)
 *   GET  /crew-activity-events?since=<ms>    -> the caller's crew's events since a timestamp (default: last 14 days), each with a `reactions` summary
 *   POST /crew-activity-events/:id/react     -> { emoji } — toggle the caller's reaction to one event (see `crew_activity_reactions`)
 */
function handleCrewActivityEvents(PDO $pdo, string $userId, string $method, ?array $body, array $segments): void
{
    $eventId = $segments[1] ?? null;
    $sub = $segments[2] ?? null;

    if ($eventId !== null && $sub === 'react' && $method === 'POST') {
        reactToCrewActivityEvent($pdo, $userId, (int) $eventId, $body ?? []);
        return;
    }

    if ($eventId === null && $method === 'POST') {
        recordCrewActivityEvent($pdo, $userId, $body ?? []);
        return;
    }

    if ($eventId === null && $method === 'GET') {
        respondWithCrewActivityEvents($pdo, $userId);
        return;
    }

    errorResponse('Not found', 404);
}

const CREW_ACTIVITY_EVENT_TYPES = ['pr', 'streak', 'long_session', 'division_up'];

// Fixed, deliberately small reaction set — a lightweight tap-react, not open emoji picking/full
// chat. Client mirrors this in lib/api.ts's CREW_ACTIVITY_REACTION_EMOJIS; keep both in sync.
const CREW_ACTIVITY_REACTION_EMOJIS = ['🔥', '👏'];

/**
 * Toggle-react to one crew activity event with one of the fixed emoji above — reacting again with
 * the same emoji removes it (enforced by `crew_activity_reactions`'s unique key, not read-then-write
 * logic, so it's race-safe under a rapid double-tap). Scoped to the caller's own crew: an event id
 * from another crew 404s rather than confirming it exists.
 */
function reactToCrewActivityEvent(PDO $pdo, string $userId, int $eventId, array $data): void
{
    $emoji = $data['emoji'] ?? '';
    if (!in_array($emoji, CREW_ACTIVITY_REACTION_EMOJIS, true)) {
        errorResponse('Invalid emoji');
        return;
    }

    $crewId = findMyCrewId($pdo, $userId);
    if ($crewId === null) {
        errorResponse('You are not in a crew', 404);
        return;
    }

    $eventStmt = $pdo->prepare('SELECT id FROM crew_activity_events WHERE id = ? AND crew_id = ?');
    $eventStmt->execute([$eventId, $crewId]);
    if (!$eventStmt->fetch()) {
        errorResponse('Not found', 404);
        return;
    }

    $existingStmt = $pdo->prepare('SELECT id FROM crew_activity_reactions WHERE event_id = ? AND user_id = ? AND emoji = ?');
    $existingStmt->execute([$eventId, $userId, $emoji]);
    if ($existingStmt->fetch()) {
        $pdo->prepare('DELETE FROM crew_activity_reactions WHERE event_id = ? AND user_id = ? AND emoji = ?')
            ->execute([$eventId, $userId, $emoji]);
    } else {
        $pdo->prepare('INSERT INTO crew_activity_reactions (event_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?)')
            ->execute([$eventId, $userId, $emoji, (int) round(microtime(true) * 1000)]);
    }

    $summary = reactionsSummaryForEvents($pdo, [$eventId], $userId);
    jsonResponse(['eventId' => $eventId, 'reactions' => $summary[$eventId]]);
}

/**
 * Batched reaction counts + "did I react" for a set of event ids, one query regardless of how many
 * events — used by both the react endpoint (a single id) and the feed listing below (up to 200).
 * Every event in `$eventIds` always comes back with every allowed emoji present at zero/false, so
 * callers never need to guard against a missing key just because nobody's reacted yet.
 */
function reactionsSummaryForEvents(PDO $pdo, array $eventIds, string $userId): array
{
    $summary = [];
    foreach ($eventIds as $id) {
        $summary[$id] = [];
        foreach (CREW_ACTIVITY_REACTION_EMOJIS as $emoji) {
            $summary[$id][$emoji] = ['count' => 0, 'reacted' => false];
        }
    }
    if (empty($eventIds)) {
        return $summary;
    }

    $placeholders = implode(',', array_fill(0, count($eventIds), '?'));
    $stmt = $pdo->prepare(
        "SELECT event_id, emoji, COUNT(*) AS cnt, SUM(user_id = ?) AS mine
         FROM crew_activity_reactions
         WHERE event_id IN ($placeholders)
         GROUP BY event_id, emoji"
    );
    $stmt->execute([$userId, ...$eventIds]);
    foreach ($stmt->fetchAll() as $row) {
        $eventId = (int) $row['event_id'];
        $emoji = $row['emoji'];
        if (!isset($summary[$eventId][$emoji])) {
            continue; // an emoji from before CREW_ACTIVITY_REACTION_EMOJIS shrank, if it ever does
        }
        $summary[$eventId][$emoji] = ['count' => (int) $row['cnt'], 'reacted' => ((int) $row['mine']) > 0];
    }
    return $summary;
}

function recordCrewActivityEvent(PDO $pdo, string $userId, array $data): void
{
    $eventType = $data['eventType'] ?? '';
    if (!in_array($eventType, CREW_ACTIVITY_EVENT_TYPES, true)) {
        errorResponse('Invalid eventType');
        return;
    }

    $crewId = findMyCrewId($pdo, $userId);
    if ($crewId === null) {
        jsonResponse(['ok' => true, 'recorded' => false]);
        return;
    }

    $payload = $data['payload'] ?? (object) [];

    $pdo->prepare(
        'INSERT INTO crew_activity_events (crew_id, user_id, event_type, payload_json, created_at) VALUES (?, ?, ?, ?, ?)'
    )->execute([
        $crewId,
        $userId,
        $eventType,
        json_encode($payload),
        (int) round(microtime(true) * 1000),
    ]);

    pushCrewActivityEvent($pdo, $crewId, $userId, $eventType, $payload);

    jsonResponse(['ok' => true, 'recorded' => true], 201);
}

/** Mirrors src/lib/notifications.ts's `describeCrewEvent` phrasing, so a push and the in-app bell
 * read the same way. */
function describeCrewActivityEvent(string $actorName, string $eventType, array $payload): string
{
    switch ($eventType) {
        case 'pr':
            $exercise = $payload['exerciseName'] ?? 'a lift';
            $weight = $payload['weightKg'] ?? '?';
            return "{$actorName} hit a new PR — {$exercise} {$weight}kg.";
        case 'streak':
            $days = $payload['days'] ?? '?';
            return "{$actorName} is on a {$days}-day streak.";
        case 'long_session':
            $duration = $payload['durationMinutes'] ?? '?';
            return "{$actorName} just crushed a {$duration}-minute session.";
        case 'division_up':
            $division = $payload['division'] ?? 'a new division';
            return "{$actorName} reached {$division}.";
        default:
            return "{$actorName} made progress.";
    }
}

/**
 * Push-notifies every OTHER member of the crew who has a registered device (see
 * routes/push-token.php) — best-effort, never blocks or fails the request that logged the event.
 * No per-preference filtering yet (crewChallengeAlerts lives in the client's generic state blob,
 * not a queryable column) — a v1 simplification, not a bug: everyone in the crew gets notified of
 * everyone else's moments, same as the in-app feed already shows today.
 */
function pushCrewActivityEvent(PDO $pdo, string $crewId, string $actorUserId, string $eventType, $payload): void
{
    $actorStmt = $pdo->prepare('SELECT full_name FROM users WHERE id = ?');
    $actorStmt->execute([$actorUserId]);
    $actorName = $actorStmt->fetch()['full_name'] ?: 'A crewmate';

    $payloadArray = is_array($payload) ? $payload : (array) $payload;
    $body = describeCrewActivityEvent($actorName, $eventType, $payloadArray);

    $tokensStmt = $pdo->prepare(
        'SELECT cm.user_id, u.expo_push_token
         FROM crew_members cm
         JOIN users u ON u.id = cm.user_id
         WHERE cm.crew_id = ? AND cm.user_id != ? AND u.expo_push_token IS NOT NULL'
    );
    $tokensStmt->execute([$crewId, $actorUserId]);

    $messages = [];
    foreach ($tokensStmt->fetchAll() as $row) {
        $messages[] = ['to' => $row['expo_push_token'], 'title' => 'Crew Activity', 'body' => $body, 'data' => ['type' => 'crew_activity']];
    }

    sendExpoPushNotifications($messages);
}

function respondWithCrewActivityEvents(PDO $pdo, string $userId): void
{
    $crewId = findMyCrewId($pdo, $userId);
    if ($crewId === null) {
        jsonResponse([]);
        return;
    }

    $defaultSince = (int) round(microtime(true) * 1000) - 14 * 24 * 60 * 60 * 1000;
    $since = isset($_GET['since']) ? (int) $_GET['since'] : $defaultSince;

    $stmt = $pdo->prepare(
        'SELECT e.id, e.user_id, e.event_type, e.payload_json, e.created_at, u.full_name
         FROM crew_activity_events e
         JOIN users u ON u.id = e.user_id
         WHERE e.crew_id = ? AND e.created_at >= ?
         ORDER BY e.created_at DESC
         LIMIT 200'
    );
    $stmt->execute([$crewId, $since]);
    $rows = $stmt->fetchAll();

    $eventIds = array_map(fn (array $row): int => (int) $row['id'], $rows);
    $reactions = reactionsSummaryForEvents($pdo, $eventIds, $userId);

    $events = array_map(function (array $row) use ($reactions): array {
        $id = (int) $row['id'];
        return [
            'id' => $id,
            'userId' => $row['user_id'],
            'userName' => $row['full_name'] ?: 'Member',
            'eventType' => $row['event_type'],
            'payload' => json_decode($row['payload_json'], true),
            'createdAt' => (int) $row['created_at'],
            'reactions' => $reactions[$id],
        ];
    }, $rows);

    jsonResponse($events);
}
