<?php

/**
 * Real crew-vs-crew Wars — see db/schema.sql's `crew_war_queue`/`crew_wars`/`crew_war_contributions`.
 * Unlike the old "Challenge Another Crew" flow (src/lib/challenge-progress.ts's
 * simulatedOpponentProgress — a hash, not a real opponent), every War here is two genuinely
 * different crews with real member contributions.
 *
 * Matchmaking is automatic and synchronous: joining the queue immediately tries to pair with
 * whoever else is waiting, closest in power. There's no cron in this setup, so a War's end is
 * resolved lazily — whichever side reads /crew-wars/active first after `ends_at` passes settles it.
 *
 * Routes (all require auth, see index.php):
 *   GET    /crew-wars/active     -> this crew's current/most recent War, plus queue status
 *   POST   /crew-wars/queue      -> join matchmaking (leader/co-leader only); pairs immediately if possible
 *   DELETE /crew-wars/queue      -> leave matchmaking
 *   POST   /crew-wars/contribute -> log this workout's volume toward an active War (best-effort, no-op if none)
 */
function handleCrewWars(PDO $pdo, string $userId, string $method, ?array $body, array $segments): void
{
    $sub = $segments[1] ?? null;

    if ($sub === 'active' && $method === 'GET') {
        respondWithActiveWar($pdo, $userId);
        return;
    }

    if ($sub === 'queue' && $method === 'POST') {
        queueForWar($pdo, $userId);
        return;
    }

    if ($sub === 'queue' && $method === 'DELETE') {
        leaveWarQueue($pdo, $userId);
        return;
    }

    if ($sub === 'contribute' && $method === 'POST') {
        contributeToWar($pdo, $userId, $body ?? []);
        return;
    }

    errorResponse('Not found', 404);
}

const WAR_DURATION_MS = 3 * 24 * 60 * 60 * 1000;

/** Sum of every member's XP — a real, already-stored signal, used purely to pair similarly-strong
 * crews. Deliberately not the client's fuller `computeCrewWeeklyPower` volume calculation (that
 * logic lives in the app, not the backend) — this only needs to be "close enough" for matchmaking. */
function crewPowerSnapshot(PDO $pdo, string $crewId): int
{
    $stmt = $pdo->prepare(
        'SELECT COALESCE(SUM(pl.xp), 0) AS power
         FROM crew_members cm
         LEFT JOIN profile_level pl ON pl.user_id = cm.user_id
         WHERE cm.crew_id = ?'
    );
    $stmt->execute([$crewId]);
    return (int) $stmt->fetch()['power'];
}

function activeWarForCrew(PDO $pdo, string $crewId): ?array
{
    $stmt = $pdo->prepare(
        "SELECT * FROM crew_wars WHERE (crew_a_id = ? OR crew_b_id = ?) ORDER BY created_at DESC LIMIT 1"
    );
    $stmt->execute([$crewId, $crewId]);
    $war = $stmt->fetch();
    return $war ?: null;
}

function resolveWarIfEnded(PDO $pdo, array $war): array
{
    $now = (int) round(microtime(true) * 1000);
    if ($war['status'] !== 'active' || (int) $war['ends_at'] > $now) {
        return $war;
    }

    $winnerId = null;
    if ((float) $war['crew_a_score'] > (float) $war['crew_b_score']) {
        $winnerId = $war['crew_a_id'];
    } elseif ((float) $war['crew_b_score'] > (float) $war['crew_a_score']) {
        $winnerId = $war['crew_b_id'];
    }

    // Guarded by `status = 'active'` so a race with another request resolving the same War at the
    // same time only ever applies once.
    $pdo->prepare("UPDATE crew_wars SET status = 'completed', winner_crew_id = ? WHERE id = ? AND status = 'active'")
        ->execute([$winnerId, $war['id']]);

    $stmt = $pdo->prepare('SELECT * FROM crew_wars WHERE id = ?');
    $stmt->execute([$war['id']]);
    return $stmt->fetch();
}

function warJson(PDO $pdo, array $war, string $viewerCrewId): array
{
    $isCrewA = $war['crew_a_id'] === $viewerCrewId;
    $myCrewId = $isCrewA ? $war['crew_a_id'] : $war['crew_b_id'];
    $opponentCrewId = $isCrewA ? $war['crew_b_id'] : $war['crew_a_id'];
    $myScore = $isCrewA ? (float) $war['crew_a_score'] : (float) $war['crew_b_score'];
    $opponentScore = $isCrewA ? (float) $war['crew_b_score'] : (float) $war['crew_a_score'];

    $crewStmt = $pdo->prepare('SELECT id, name, icon, division FROM crews WHERE id IN (?, ?)');
    $crewStmt->execute([$myCrewId, $opponentCrewId]);
    $crewsById = [];
    foreach ($crewStmt->fetchAll() as $row) {
        $crewsById[$row['id']] = $row;
    }

    $contributorsStmt = $pdo->prepare(
        'SELECT wc.user_id, u.full_name, SUM(wc.volume_kg) AS total
         FROM crew_war_contributions wc
         JOIN users u ON u.id = wc.user_id
         WHERE wc.war_id = ? AND wc.crew_id = ?
         GROUP BY wc.user_id, u.full_name
         ORDER BY total DESC
         LIMIT 5'
    );
    $contributorsStmt->execute([$war['id'], $myCrewId]);
    $topContributors = array_map(function (array $row): array {
        return [
            'userId' => $row['user_id'],
            'name' => $row['full_name'] ?: 'Member',
            'volumeKg' => (float) $row['total'],
        ];
    }, $contributorsStmt->fetchAll());

    $won = null;
    if ($war['status'] === 'completed') {
        $won = $war['winner_crew_id'] === null ? null : ($war['winner_crew_id'] === $myCrewId);
    }

    return [
        'id' => $war['id'],
        'status' => $war['status'],
        'startedAt' => (int) $war['started_at'],
        'endsAt' => (int) $war['ends_at'],
        'myScore' => $myScore,
        'opponentScore' => $opponentScore,
        'won' => $won,
        'opponent' => [
            'id' => $opponentCrewId,
            'name' => $crewsById[$opponentCrewId]['name'] ?? 'Unknown Crew',
            'icon' => $crewsById[$opponentCrewId]['icon'] ?? 'gorilla',
            'division' => $crewsById[$opponentCrewId]['division'] ?? 'Rookie',
        ],
        'topContributors' => $topContributors,
    ];
}

function respondWithActiveWar(PDO $pdo, string $userId): void
{
    $crewId = findMyCrewId($pdo, $userId);
    if ($crewId === null) {
        errorResponse('You are not in a crew', 404);
        return;
    }

    $queueStmt = $pdo->prepare('SELECT 1 FROM crew_war_queue WHERE crew_id = ?');
    $queueStmt->execute([$crewId]);
    $queued = (bool) $queueStmt->fetch();

    $war = activeWarForCrew($pdo, $crewId);
    if (!$war) {
        jsonResponse(['war' => null, 'queued' => $queued]);
        return;
    }

    $war = resolveWarIfEnded($pdo, $war);
    jsonResponse(['war' => warJson($pdo, $war, $crewId), 'queued' => $queued]);
}

function queueForWar(PDO $pdo, string $userId): void
{
    $crewId = findMyCrewId($pdo, $userId);
    if ($crewId === null) {
        errorResponse('You are not in a crew', 404);
        return;
    }

    $role = myRoleInCrew($pdo, $userId, $crewId);
    if ($role !== 'leader' && $role !== 'co-leader') {
        errorResponse('Only the crew leader or co-leader can start a War', 403);
        return;
    }

    $existingWar = activeWarForCrew($pdo, $crewId);
    if ($existingWar && $existingWar['status'] === 'active') {
        errorResponse('Your crew is already in a War', 409);
        return;
    }

    $crewPower = crewPowerSnapshot($pdo, $crewId);
    $now = (int) round(microtime(true) * 1000);

    $pdo->beginTransaction();
    try {
        // Re-queuing (e.g. reopening the tab) just refreshes the snapshot instead of erroring.
        $pdo->prepare('DELETE FROM crew_war_queue WHERE crew_id = ?')->execute([$crewId]);

        $matchStmt = $pdo->prepare(
            'SELECT crew_id FROM crew_war_queue ORDER BY ABS(crew_power - ?) ASC, queued_at ASC LIMIT 1'
        );
        $matchStmt->execute([$crewPower]);
        $opponent = $matchStmt->fetch();

        if (!$opponent) {
            $pdo->prepare('INSERT INTO crew_war_queue (crew_id, crew_power, queued_at) VALUES (?, ?, ?)')
                ->execute([$crewId, $crewPower, $now]);
            $pdo->commit();
            jsonResponse(['status' => 'queued']);
            return;
        }

        $deleteOpponent = $pdo->prepare('DELETE FROM crew_war_queue WHERE crew_id = ?');
        $deleteOpponent->execute([$opponent['crew_id']]);
        if ($deleteOpponent->rowCount() === 0) {
            // Lost a race with another crew's matchmaking attempt — queue ourselves instead of erroring.
            $pdo->prepare('INSERT INTO crew_war_queue (crew_id, crew_power, queued_at) VALUES (?, ?, ?)')
                ->execute([$crewId, $crewPower, $now]);
            $pdo->commit();
            jsonResponse(['status' => 'queued']);
            return;
        }

        $warId = 'war-' . bin2hex(random_bytes(8));
        $pdo->prepare(
            'INSERT INTO crew_wars (id, crew_a_id, crew_b_id, started_at, ends_at, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([$warId, $crewId, $opponent['crew_id'], $now, $now + WAR_DURATION_MS, $now]);

        $pdo->commit();

        $warStmt = $pdo->prepare('SELECT * FROM crew_wars WHERE id = ?');
        $warStmt->execute([$warId]);
        jsonResponse(['status' => 'matched', 'war' => warJson($pdo, $warStmt->fetch(), $crewId)], 201);
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function leaveWarQueue(PDO $pdo, string $userId): void
{
    $crewId = findMyCrewId($pdo, $userId);
    if ($crewId === null) {
        errorResponse('You are not in a crew', 404);
        return;
    }

    $pdo->prepare('DELETE FROM crew_war_queue WHERE crew_id = ?')->execute([$crewId]);
    jsonResponse(['ok' => true]);
}

function contributeToWar(PDO $pdo, string $userId, array $data): void
{
    $volumeKg = isset($data['volumeKg']) ? (float) $data['volumeKg'] : 0;
    $crewId = findMyCrewId($pdo, $userId);
    if ($volumeKg <= 0 || $crewId === null) {
        jsonResponse(['ok' => true, 'contributed' => false]);
        return;
    }

    $now = (int) round(microtime(true) * 1000);
    $stmt = $pdo->prepare(
        "SELECT id, crew_a_id FROM crew_wars WHERE (crew_a_id = ? OR crew_b_id = ?) AND status = 'active' AND ends_at > ?"
    );
    $stmt->execute([$crewId, $crewId, $now]);
    $war = $stmt->fetch();
    if (!$war) {
        jsonResponse(['ok' => true, 'contributed' => false]);
        return;
    }

    $pdo->prepare(
        'INSERT INTO crew_war_contributions (war_id, crew_id, user_id, volume_kg, contributed_at) VALUES (?, ?, ?, ?, ?)'
    )->execute([$war['id'], $crewId, $userId, $volumeKg, $now]);

    $column = $war['crew_a_id'] === $crewId ? 'crew_a_score' : 'crew_b_score';
    $pdo->prepare("UPDATE crew_wars SET $column = $column + ? WHERE id = ?")->execute([$volumeKg, $war['id']]);

    jsonResponse(['ok' => true, 'contributed' => true]);
}
