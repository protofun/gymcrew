<?php

/**
 * Peer duels — a lightweight "who does more today" 1-on-1 challenge between two crewmates. See
 * db/schema.sql's `crew_duels`. Resolved lazily (same pattern as crew_wars.php) by comparing each
 * side's real `workouts` for the target date once that date has passed.
 *
 * Day boundaries are computed in UTC (there's no per-user timezone stored server-side) — close
 * enough for "who trained more today" at this app's scale; a user right at a UTC day edge could see
 * a workout counted a day off, which is an acceptable simplification for now.
 *
 * Routes (all require auth, see index.php):
 *   GET  /crew-duels             -> caller's crew's duels (pending/accepted/declined/completed), newest first
 *   POST /crew-duels             -> propose a duel: { opponentUserId, metric: 'volume'|'sets', targetDateKey: 'yyyy-mm-dd' }
 *   POST /crew-duels/:id/respond -> { accept: boolean } — opponent only
 */
function handleCrewDuels(PDO $pdo, string $userId, string $method, ?array $body, array $segments): void
{
    $sub = $segments[1] ?? null;

    if ($sub === null && $method === 'GET') {
        respondWithCrewDuels($pdo, $userId);
        return;
    }

    if ($sub === null && $method === 'POST') {
        createDuel($pdo, $userId, $body ?? []);
        return;
    }

    if ($sub !== null && ($segments[2] ?? null) === 'respond' && $method === 'POST') {
        respondToDuel($pdo, $userId, $sub, $body ?? []);
        return;
    }

    errorResponse('Not found', 404);
}

/** [startMs, endMs) for a yyyy-mm-dd date key, treated as a UTC calendar day. */
function duelDateBoundsMs(string $dateKey): array
{
    $start = DateTime::createFromFormat('!Y-m-d', $dateKey, new DateTimeZone('UTC'));
    $startMs = ((int) $start->getTimestamp()) * 1000;
    return [$startMs, $startMs + 24 * 60 * 60 * 1000];
}

function metricTotalForUserOnDate(PDO $pdo, string $userId, string $metric, string $dateKey): float
{
    [$startMs, $endMs] = duelDateBoundsMs($dateKey);
    $column = $metric === 'sets' ? 'completed_sets' : 'volume_kg';
    $stmt = $pdo->prepare(
        "SELECT COALESCE(SUM($column), 0) AS total FROM workouts WHERE user_id = ? AND completed_at >= ? AND completed_at < ?"
    );
    $stmt->execute([$userId, $startMs, $endMs]);
    return (float) $stmt->fetch()['total'];
}

function resolveDuelIfDue(PDO $pdo, array $duel): array
{
    if ($duel['status'] !== 'accepted') {
        return $duel;
    }

    [, $endMs] = duelDateBoundsMs($duel['target_date_key']);
    if ($endMs > (int) round(microtime(true) * 1000)) {
        return $duel;
    }

    $challengerTotal = metricTotalForUserOnDate($pdo, $duel['challenger_id'], $duel['metric'], $duel['target_date_key']);
    $opponentTotal = metricTotalForUserOnDate($pdo, $duel['opponent_id'], $duel['metric'], $duel['target_date_key']);

    $winnerId = null;
    if ($challengerTotal > $opponentTotal) {
        $winnerId = $duel['challenger_id'];
    } elseif ($opponentTotal > $challengerTotal) {
        $winnerId = $duel['opponent_id'];
    }

    // Guarded by `status = 'accepted'` so a concurrent read from the other side only resolves once.
    $pdo->prepare("UPDATE crew_duels SET status = 'completed', winner_id = ? WHERE id = ? AND status = 'accepted'")
        ->execute([$winnerId, $duel['id']]);

    $stmt = $pdo->prepare('SELECT * FROM crew_duels WHERE id = ?');
    $stmt->execute([$duel['id']]);
    return $stmt->fetch();
}

function duelJson(PDO $pdo, string $duelId): array
{
    $stmt = $pdo->prepare('SELECT * FROM crew_duels WHERE id = ?');
    $stmt->execute([$duelId]);
    $duel = resolveDuelIfDue($pdo, $stmt->fetch());

    $namesStmt = $pdo->prepare('SELECT id, full_name FROM users WHERE id IN (?, ?)');
    $namesStmt->execute([$duel['challenger_id'], $duel['opponent_id']]);
    $names = [];
    foreach ($namesStmt->fetchAll() as $row) {
        $names[$row['id']] = $row['full_name'] ?: 'Member';
    }

    return [
        'id' => $duel['id'],
        'challengerId' => $duel['challenger_id'],
        'challengerName' => $names[$duel['challenger_id']] ?? 'Member',
        'opponentId' => $duel['opponent_id'],
        'opponentName' => $names[$duel['opponent_id']] ?? 'Member',
        'metric' => $duel['metric'],
        'targetDateKey' => $duel['target_date_key'],
        'status' => $duel['status'],
        'winnerId' => $duel['winner_id'],
        'createdAt' => (int) $duel['created_at'],
    ];
}

function respondWithCrewDuels(PDO $pdo, string $userId): void
{
    $crewId = findMyCrewId($pdo, $userId);
    if ($crewId === null) {
        jsonResponse([]);
        return;
    }

    $stmt = $pdo->prepare('SELECT id FROM crew_duels WHERE crew_id = ? ORDER BY created_at DESC LIMIT 50');
    $stmt->execute([$crewId]);
    $duels = array_map(fn (array $row): array => duelJson($pdo, $row['id']), $stmt->fetchAll());

    jsonResponse($duels);
}

function createDuel(PDO $pdo, string $userId, array $data): void
{
    $opponentUserId = trim((string) ($data['opponentUserId'] ?? ''));
    $metric = $data['metric'] ?? '';
    $targetDateKey = trim((string) ($data['targetDateKey'] ?? ''));

    if (
        $opponentUserId === ''
        || !in_array($metric, ['volume', 'sets'], true)
        || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $targetDateKey)
    ) {
        errorResponse('opponentUserId, metric, and targetDateKey are required');
        return;
    }
    if ($opponentUserId === $userId) {
        errorResponse('You cannot challenge yourself');
        return;
    }

    $crewId = findMyCrewId($pdo, $userId);
    if ($crewId === null) {
        errorResponse('You are not in a crew', 404);
        return;
    }
    if (myRoleInCrew($pdo, $opponentUserId, $crewId) === null) {
        errorResponse('That member is not in your crew', 404);
        return;
    }

    $duelId = 'duel-' . bin2hex(random_bytes(8));
    $pdo->prepare(
        'INSERT INTO crew_duels (id, crew_id, challenger_id, opponent_id, metric, target_date_key, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    )->execute([$duelId, $crewId, $userId, $opponentUserId, $metric, $targetDateKey, (int) round(microtime(true) * 1000)]);

    jsonResponse(duelJson($pdo, $duelId), 201);
}

function respondToDuel(PDO $pdo, string $userId, string $duelId, array $data): void
{
    $stmt = $pdo->prepare('SELECT * FROM crew_duels WHERE id = ?');
    $stmt->execute([$duelId]);
    $duel = $stmt->fetch();
    if (!$duel) {
        errorResponse('Not found', 404);
        return;
    }
    if ($duel['opponent_id'] !== $userId) {
        errorResponse('Only the challenged member can respond', 403);
        return;
    }
    if ($duel['status'] !== 'pending') {
        errorResponse('This duel has already been responded to', 409);
        return;
    }

    $accept = !empty($data['accept']);
    $pdo->prepare('UPDATE crew_duels SET status = ? WHERE id = ?')
        ->execute([$accept ? 'accepted' : 'declined', $duelId]);

    jsonResponse(duelJson($pdo, $duelId));
}
