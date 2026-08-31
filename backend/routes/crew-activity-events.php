<?php

/**
 * The crew-internal motivation feed — see db/schema.sql's `crew_activity_events`. This is the real,
 * timestamped activity feed src/lib/notifications.ts previously had no data source for ("No
 * fabricated crew/social events, since there's no real timestamped activity feed to draw those from
 * yet"). Clients log an event right after detecting it themselves (PR / streak milestone / long
 * session / division up); every crewmate can then read the crew's feed.
 *
 * Routes (all require auth, see index.php):
 *   POST /crew-activity-events            -> log an event for the caller's crew (best-effort, no-op if not in a crew)
 *   GET  /crew-activity-events?since=<ms> -> the caller's crew's events since a timestamp (default: last 14 days)
 */
function handleCrewActivityEvents(PDO $pdo, string $userId, string $method, ?array $body): void
{
    if ($method === 'POST') {
        recordCrewActivityEvent($pdo, $userId, $body ?? []);
        return;
    }

    if ($method === 'GET') {
        respondWithCrewActivityEvents($pdo, $userId);
        return;
    }

    errorResponse('Method not allowed', 405);
}

const CREW_ACTIVITY_EVENT_TYPES = ['pr', 'streak', 'long_session', 'division_up'];

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

    $pdo->prepare(
        'INSERT INTO crew_activity_events (crew_id, user_id, event_type, payload_json, created_at) VALUES (?, ?, ?, ?, ?)'
    )->execute([
        $crewId,
        $userId,
        $eventType,
        json_encode($data['payload'] ?? (object) []),
        (int) round(microtime(true) * 1000),
    ]);

    jsonResponse(['ok' => true, 'recorded' => true], 201);
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

    $events = array_map(function (array $row): array {
        return [
            'id' => (int) $row['id'],
            'userId' => $row['user_id'],
            'userName' => $row['full_name'] ?: 'Member',
            'eventType' => $row['event_type'],
            'payload' => json_decode($row['payload_json'], true),
            'createdAt' => (int) $row['created_at'],
        ];
    }, $stmt->fetchAll());

    jsonResponse($events);
}
