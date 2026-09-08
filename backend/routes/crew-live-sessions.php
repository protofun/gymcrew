<?php

/**
 * A crew's real, currently-in-progress workout — genuinely shared (one row every crew member sees
 * and polls), unlike the old `led-workout` user_state blob it replaces (see db/schema.sql's comment
 * on `user_state` — that one only ever synced back to the SAME account's own other devices, never
 * to real crewmates, so "join Sam's workout" only ever worked against a hardcoded fake session).
 *
 * No pre-planning: the leader just starts their own normal workout and taps "Lead a Crew Workout" —
 * whatever exercises they add/log as they actually train get pushed here (see PUT /exercises below),
 * not chosen up front. Joiners get a one-time snapshot of the leader's exercises *at the moment they
 * join* to start their own workout from — after that each person logs independently, same as any
 * other workout. (A joiner re-polling to pick up exercises the leader adds *after* they joined is a
 * reasonable follow-up, not built here.)
 *
 * Staleness: no cron/websockets in this setup, so an inactive session (leader hasn't pushed an
 * update in CREW_LIVE_SESSION_STALE_MS) is treated as ended the next time anyone reads it — same
 * lazy-resolve pattern crew-wars.php uses for `ends_at`.
 *
 * Routes (all require auth, see index.php):
 *   GET  /crew-live-sessions/active     -> this crew's current live session, or null
 *   POST /crew-live-sessions            -> leader starts one (ends any existing one for the crew first)
 *   PUT  /crew-live-sessions/exercises  -> leader pushes their current exercise list (called as they log)
 *   POST /crew-live-sessions/join       -> add yourself as a participant, returns the current session
 *   POST /crew-live-sessions/end        -> leader ends it early
 */

const CREW_LIVE_SESSION_STALE_MS = 3 * 60 * 60 * 1000; // 3 hours with no update from the leader

function handleCrewLiveSessions(PDO $pdo, string $userId, string $method, ?array $body, array $segments): void
{
    $sub = $segments[1] ?? null;

    if ($sub === 'active' && $method === 'GET') {
        respondWithActiveLiveSession($pdo, $userId);
        return;
    }

    if ($sub === null && $method === 'POST') {
        startLiveSession($pdo, $userId, $body ?? []);
        return;
    }

    if ($sub === 'exercises' && $method === 'PUT') {
        updateLiveSessionExercises($pdo, $userId, $body ?? []);
        return;
    }

    if ($sub === 'join' && $method === 'POST') {
        joinLiveSession($pdo, $userId);
        return;
    }

    if ($sub === 'end' && $method === 'POST') {
        endLiveSession($pdo, $userId);
        return;
    }

    errorResponse('Not found', 404);
}

function activeLiveSessionForCrew(PDO $pdo, string $crewId): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM crew_live_sessions WHERE crew_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1');
    $stmt->execute([$crewId]);
    $session = $stmt->fetch();
    return $session ?: null;
}

/** Auto-ends (and returns null for) a session the leader has gone quiet on — guarded by `ended_at IS
 * NULL` so a race with another request resolving the same staleness only ever applies once. */
function resolveLiveSessionIfStale(PDO $pdo, array $session): ?array
{
    $now = (int) round(microtime(true) * 1000);
    if ((int) $session['updated_at'] > $now - CREW_LIVE_SESSION_STALE_MS) {
        return $session;
    }
    $pdo->prepare('UPDATE crew_live_sessions SET ended_at = ? WHERE id = ? AND ended_at IS NULL')
        ->execute([$now, $session['id']]);
    return null;
}

function liveSessionJson(PDO $pdo, array $session): array
{
    $leaderStmt = $pdo->prepare('SELECT full_name FROM users WHERE id = ?');
    $leaderStmt->execute([$session['leader_id']]);
    $leaderName = $leaderStmt->fetch()['full_name'] ?? 'A crewmate';

    return [
        'id' => $session['id'],
        'leaderId' => $session['leader_id'],
        'leaderName' => $leaderName,
        'workoutName' => $session['workout_name'],
        'exercises' => json_decode($session['exercises_json'], true),
        'participantIds' => json_decode($session['participant_ids_json'], true),
        'startedAt' => (int) $session['started_at'],
        'updatedAt' => (int) $session['updated_at'],
    ];
}

function respondWithActiveLiveSession(PDO $pdo, string $userId): void
{
    $crewId = findMyCrewId($pdo, $userId);
    if ($crewId === null) {
        errorResponse('You are not in a crew', 404);
        return;
    }

    $session = activeLiveSessionForCrew($pdo, $crewId);
    if ($session) {
        $session = resolveLiveSessionIfStale($pdo, $session);
    }
    jsonResponse(['session' => $session ? liveSessionJson($pdo, $session) : null]);
}

function startLiveSession(PDO $pdo, string $userId, array $data): void
{
    $crewId = findMyCrewId($pdo, $userId);
    if ($crewId === null) {
        errorResponse('You are not in a crew', 404);
        return;
    }

    $workoutName = trim((string) ($data['workoutName'] ?? ''));
    if ($workoutName === '') {
        errorResponse('workoutName is required');
        return;
    }

    $now = (int) round(microtime(true) * 1000);

    // Restarting (e.g. leader closed and reopened the tab) just supersedes whatever was there —
    // there's only ever meant to be one active session per crew.
    $existing = activeLiveSessionForCrew($pdo, $crewId);
    if ($existing) {
        $pdo->prepare('UPDATE crew_live_sessions SET ended_at = ? WHERE id = ?')->execute([$now, $existing['id']]);
    }

    $sessionId = 'live-' . bin2hex(random_bytes(8));
    $pdo->prepare(
        'INSERT INTO crew_live_sessions
            (id, crew_id, leader_id, workout_name, exercises_json, participant_ids_json, started_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $sessionId,
        $crewId,
        $userId,
        $workoutName,
        json_encode($data['exercises'] ?? []),
        json_encode([$userId]),
        $now,
        $now,
    ]);

    $stmt = $pdo->prepare('SELECT * FROM crew_live_sessions WHERE id = ?');
    $stmt->execute([$sessionId]);
    jsonResponse(['session' => liveSessionJson($pdo, $stmt->fetch())], 201);
}

function updateLiveSessionExercises(PDO $pdo, string $userId, array $data): void
{
    $crewId = findMyCrewId($pdo, $userId);
    if ($crewId === null) {
        errorResponse('You are not in a crew', 404);
        return;
    }

    $session = activeLiveSessionForCrew($pdo, $crewId);
    if (!$session || $session['leader_id'] !== $userId) {
        errorResponse('You are not leading an active session', 404);
        return;
    }

    $now = (int) round(microtime(true) * 1000);
    $pdo->prepare('UPDATE crew_live_sessions SET exercises_json = ?, updated_at = ? WHERE id = ?')
        ->execute([json_encode($data['exercises'] ?? []), $now, $session['id']]);

    jsonResponse(['ok' => true]);
}

function joinLiveSession(PDO $pdo, string $userId): void
{
    $crewId = findMyCrewId($pdo, $userId);
    if ($crewId === null) {
        errorResponse('You are not in a crew', 404);
        return;
    }

    $session = activeLiveSessionForCrew($pdo, $crewId);
    if (!$session) {
        errorResponse('No active session for your crew', 404);
        return;
    }

    $participantIds = json_decode($session['participant_ids_json'], true) ?: [];
    if (!in_array($userId, $participantIds, true)) {
        $participantIds[] = $userId;
        $pdo->prepare('UPDATE crew_live_sessions SET participant_ids_json = ? WHERE id = ?')
            ->execute([json_encode($participantIds), $session['id']]);
    }

    $stmt = $pdo->prepare('SELECT * FROM crew_live_sessions WHERE id = ?');
    $stmt->execute([$session['id']]);
    jsonResponse(['session' => liveSessionJson($pdo, $stmt->fetch())]);
}

function endLiveSession(PDO $pdo, string $userId): void
{
    $crewId = findMyCrewId($pdo, $userId);
    if ($crewId === null) {
        errorResponse('You are not in a crew', 404);
        return;
    }

    $session = activeLiveSessionForCrew($pdo, $crewId);
    if (!$session || $session['leader_id'] !== $userId) {
        jsonResponse(['ok' => true]);
        return;
    }

    $now = (int) round(microtime(true) * 1000);
    $pdo->prepare('UPDATE crew_live_sessions SET ended_at = ? WHERE id = ?')->execute([$now, $session['id']]);
    jsonResponse(['ok' => true]);
}
