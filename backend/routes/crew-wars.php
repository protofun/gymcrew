<?php

/**
 * Real crew-vs-crew Wars — see db/schema.sql's `crew_war_queue`/`crew_wars`/`crew_war_attacks`.
 * A crew is never without a War to fight: `ensureActiveWar` below auto-starts a new one the moment
 * there isn't an active one, matching a real crew waiting in `crew_war_queue` if one exists, or
 * instantly a same-ish-division "bot" crew otherwise (real rows — see the seed block in
 * db/schema.sql — so the whole War, opponent included, is genuinely persisted, not computed
 * client-side). The old leader-gated "Find a War" / "Searching…" flow is gone — War is fully
 * passive now, same as the Weekly League's always-on weekly cycle.
 *
 * Every "attack" is one real logged workout during an active War — real or bot, both sides log
 * real rows to `crew_war_attacks` (bot attacks are generated lazily on read, deterministically
 * scheduled, same "resolve on next read, no cron" idea crew-duels.php already uses — see
 * generateDueBotAttacks). This is what powers the attack feed, not just a running total.
 *
 * Routes (all require auth, see index.php):
 *   GET  /crew-wars/active  -> this crew's current War (auto-starts one if there wasn't one)
 *   POST /crew-wars/attack  -> record one attack from the caller's just-finished workout
 */
function handleCrewWars(PDO $pdo, string $userId, string $method, ?array $body, array $segments): void
{
    $sub = $segments[1] ?? null;

    if ($sub === 'active' && $method === 'GET') {
        respondWithActiveWar($pdo, $userId);
        return;
    }

    if ($sub === 'attack' && $method === 'POST') {
        recordAttack($pdo, $userId, $body ?? []);
        return;
    }

    errorResponse('Not found', 404);
}

const WAR_DURATION_MS = 3 * 24 * 60 * 60 * 1000;
const ATTACK_PR_BONUS = 250;
const BOT_ATTACK_MIN_INTERVAL_MS = 8 * 60 * 60 * 1000;
const BOT_ATTACK_MAX_INTERVAL_MS = 16 * 60 * 60 * 1000;

const DIVISION_ORDER = [
    'Rookie', 'Novice', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Elite', 'Master',
    'Grandmaster', 'Champion', 'Titan', 'Mythic', 'Immortal', 'Legend', 'Overlord', 'Supreme',
    'Conqueror', 'Dominator', 'Apex',
];

/** Matches the bot crews seeded in db/schema.sql — division is looked up live from `crews` rather
 * than duplicated here, this is just which ids are bots at all (see isBotCrew). */
function isBotCrew(string $crewId): bool
{
    return str_starts_with($crewId, 'bot-crew-');
}

function warHash(string $value): int
{
    $hash = 0;
    $len = strlen($value);
    for ($i = 0; $i < $len; $i++) {
        $hash = ($hash * 31 + ord($value[$i])) & 0x7FFFFFFF;
    }
    return $hash;
}

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

/** The closest-division bot crew to `$crewId`'s own division — a real row, see db/schema.sql. */
function nearestBotCrewId(PDO $pdo, string $crewId): string
{
    $stmt = $pdo->prepare('SELECT division FROM crews WHERE id = ?');
    $stmt->execute([$crewId]);
    $division = $stmt->fetch()['division'] ?? 'Rookie';
    $myIndex = array_search($division, DIVISION_ORDER, true);
    $myIndex = $myIndex === false ? 0 : $myIndex;

    $botStmt = $pdo->query("SELECT id, division FROM crews WHERE id LIKE 'bot-crew-%'");
    $best = 'bot-crew-beast-mode';
    $bestDistance = PHP_INT_MAX;
    foreach ($botStmt->fetchAll() as $bot) {
        $botIndex = array_search($bot['division'], DIVISION_ORDER, true);
        if ($botIndex === false) continue;
        $distance = abs($myIndex - $botIndex);
        if ($distance < $bestDistance) {
            $bestDistance = $distance;
            $best = $bot['id'];
        }
    }
    return $best;
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

/**
 * Guarantees `$crewId` has an active War, starting one if it doesn't: a real crew already waiting
 * in `crew_war_queue` (closest in power) if there is one, otherwise an immediate match against the
 * nearest-division bot crew — `$crewId` also gets queued for real matchmaking in the background so
 * a genuine opponent can still be found later without ever leaving the crew stuck waiting for one.
 */
function ensureActiveWar(PDO $pdo, string $crewId): array
{
    $existing = activeWarForCrew($pdo, $crewId);
    if ($existing) {
        $existing = resolveWarIfEnded($pdo, $existing);
        if ($existing['status'] === 'active') {
            return $existing;
        }
    }

    $crewPower = crewPowerSnapshot($pdo, $crewId);
    $now = (int) round(microtime(true) * 1000);

    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM crew_war_queue WHERE crew_id = ?')->execute([$crewId]);

        $matchStmt = $pdo->prepare(
            'SELECT crew_id FROM crew_war_queue ORDER BY ABS(crew_power - ?) ASC, queued_at ASC LIMIT 1'
        );
        $matchStmt->execute([$crewPower]);
        $opponent = $matchStmt->fetch();

        $opponentCrewId = null;
        if ($opponent) {
            $deleteOpponent = $pdo->prepare('DELETE FROM crew_war_queue WHERE crew_id = ?');
            $deleteOpponent->execute([$opponent['crew_id']]);
            if ($deleteOpponent->rowCount() > 0) {
                $opponentCrewId = $opponent['crew_id'];
            }
        }

        if ($opponentCrewId === null) {
            $pdo->prepare('INSERT INTO crew_war_queue (crew_id, crew_power, queued_at) VALUES (?, ?, ?)')
                ->execute([$crewId, $crewPower, $now]);
            $opponentCrewId = nearestBotCrewId($pdo, $crewId);
        }

        $warId = 'war-' . bin2hex(random_bytes(8));
        $pdo->prepare(
            'INSERT INTO crew_wars (id, crew_a_id, crew_b_id, started_at, ends_at, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([$warId, $crewId, $opponentCrewId, $now, $now + WAR_DURATION_MS, $now]);

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    $stmt = $pdo->prepare('SELECT * FROM crew_wars WHERE id = ?');
    $stmt->execute([$warId]);
    return $stmt->fetch();
}

/** Writes any of the bot opponent's scheduled attacks whose time has come into real
 * `crew_war_attacks` rows and bumps the running score — lazy, on read, no cron, same idea
 * crew-duels.php's resolveDuelIfDue already uses, just producing real rows instead of only a
 * number. Deterministic (hashed off the War id + slot index), so re-running it is always a no-op
 * past whatever's already been written — the unique key on (war_id, crew_id, attacked_at) also
 * guards a concurrent double-read from double-inserting the same slot. */
function generateDueBotAttacks(PDO $pdo, array $war): void
{
    $botCrewId = null;
    if (isBotCrew($war['crew_a_id'])) $botCrewId = $war['crew_a_id'];
    elseif (isBotCrew($war['crew_b_id'])) $botCrewId = $war['crew_b_id'];
    if ($botCrewId === null) return;

    $now = (int) round(microtime(true) * 1000);
    $upTo = min($now, (int) $war['ends_at']);

    $names = ['Alex', 'Sam', 'Jordan', 'Mike', 'Chris', 'Taylor', 'Casey', 'Morgan'];
    $workouts = ['Push Day', 'Pull Day', 'Leg Day', 'Upper Body', 'Full Body'];

    $slotIndex = 0;
    $slotTime = (int) $war['started_at'];
    while (true) {
        $seed = warHash($war['id'] . ':' . $slotIndex);
        $interval = BOT_ATTACK_MIN_INTERVAL_MS + ($seed % (BOT_ATTACK_MAX_INTERVAL_MS - BOT_ATTACK_MIN_INTERVAL_MS));
        $slotTime += $interval;
        if ($slotTime > $upTo) break;

        $volumeKg = 2500 + ($seed % 6500); // one plausible session's volume, ~2,500-9,000kg
        $prCount = ($seed % 5) === 0 ? 1 : 0; // ~1 in 5 bot attacks lands a "PR"
        $score = $volumeKg + $prCount * ATTACK_PR_BONUS;
        $name = $names[$seed % count($names)];
        $workoutName = $workouts[intdiv($seed, 7) % count($workouts)];

        try {
            $pdo->prepare(
                'INSERT INTO crew_war_attacks (war_id, crew_id, user_id, attacker_name, workout_name, volume_kg, pr_count, score, attacked_at)
                 VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)'
            )->execute([$war['id'], $botCrewId, $name, $workoutName, $volumeKg, $prCount, $score, $slotTime]);

            $column = $war['crew_a_id'] === $botCrewId ? 'crew_a_score' : 'crew_b_score';
            $pdo->prepare("UPDATE crew_wars SET $column = $column + ? WHERE id = ?")->execute([$score, $war['id']]);
        } catch (PDOException $e) {
            // Unique (war_id, crew_id, attacked_at) — another request already wrote this exact
            // slot between our check and our insert. Nothing to do, it's already there.
        }

        $slotIndex++;
    }
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

    $attacksStmt = $pdo->prepare(
        'SELECT crew_id, attacker_name, workout_name, volume_kg, pr_count, score, attacked_at
         FROM crew_war_attacks WHERE war_id = ? ORDER BY attacked_at DESC LIMIT 20'
    );
    $attacksStmt->execute([$war['id']]);
    $recentAttacks = array_map(function (array $row) use ($myCrewId): array {
        return [
            'attackerName' => $row['attacker_name'],
            'workoutName' => $row['workout_name'],
            'volumeKg' => (float) $row['volume_kg'],
            'prCount' => (int) $row['pr_count'],
            'score' => (float) $row['score'],
            'attackedAt' => (int) $row['attacked_at'],
            'isMine' => $row['crew_id'] === $myCrewId,
        ];
    }, $attacksStmt->fetchAll());

    $contributorsStmt = $pdo->prepare(
        'SELECT user_id, attacker_name, SUM(score) AS total
         FROM crew_war_attacks WHERE war_id = ? AND crew_id = ? AND user_id IS NOT NULL
         GROUP BY user_id, attacker_name ORDER BY total DESC LIMIT 5'
    );
    $contributorsStmt->execute([$war['id'], $myCrewId]);
    $topContributors = array_map(function (array $row): array {
        return ['userId' => $row['user_id'], 'name' => $row['attacker_name'], 'volumeKg' => (float) $row['total']];
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
        'recentAttacks' => $recentAttacks,
    ];
}

function respondWithActiveWar(PDO $pdo, string $userId): void
{
    $crewId = findMyCrewId($pdo, $userId);
    if ($crewId === null) {
        errorResponse('You are not in a crew', 404);
        return;
    }

    $war = ensureActiveWar($pdo, $crewId);
    generateDueBotAttacks($pdo, $war);

    // Re-fetch — generateDueBotAttacks may have just updated the score columns.
    $stmt = $pdo->prepare('SELECT * FROM crew_wars WHERE id = ?');
    $stmt->execute([$war['id']]);
    $war = $stmt->fetch();

    jsonResponse(['war' => warJson($pdo, $war, $crewId)]);
}

function recordAttack(PDO $pdo, string $userId, array $data): void
{
    $volumeKg = isset($data['volumeKg']) ? (float) $data['volumeKg'] : 0;
    $prCount = isset($data['prCount']) ? max(0, (int) $data['prCount']) : 0;
    $workoutName = isset($data['workoutName']) ? trim((string) $data['workoutName']) : null;
    if ($workoutName === '') $workoutName = null;

    $crewId = findMyCrewId($pdo, $userId);
    if ($volumeKg <= 0 || $crewId === null) {
        jsonResponse(['ok' => true, 'attacked' => false]);
        return;
    }

    $war = ensureActiveWar($pdo, $crewId);
    generateDueBotAttacks($pdo, $war);
    if ($war['status'] !== 'active') {
        jsonResponse(['ok' => true, 'attacked' => false]);
        return;
    }

    $nameStmt = $pdo->prepare('SELECT full_name FROM users WHERE id = ?');
    $nameStmt->execute([$userId]);
    $attackerName = $nameStmt->fetch()['full_name'] ?: 'You';

    $now = (int) round(microtime(true) * 1000);
    $score = $volumeKg + $prCount * ATTACK_PR_BONUS;

    $pdo->prepare(
        'INSERT INTO crew_war_attacks (war_id, crew_id, user_id, attacker_name, workout_name, volume_kg, pr_count, score, attacked_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([$war['id'], $crewId, $userId, $attackerName, $workoutName, $volumeKg, $prCount, $score, $now]);

    $column = $war['crew_a_id'] === $crewId ? 'crew_a_score' : 'crew_b_score';
    $pdo->prepare("UPDATE crew_wars SET $column = $column + ? WHERE id = ?")->execute([$score, $war['id']]);

    jsonResponse(['ok' => true, 'attacked' => true, 'score' => $score]);
}
