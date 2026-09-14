<?php

/**
 * Real crew-vs-crew Wars — see db/schema.sql's `crew_war_queue`/`crew_wars`/`crew_war_attacks`.
 * By default a crew is auto-entered into a new War the moment it has none (`getOrStartWar` below,
 * `force = false`) — matching a real, currently-active crew waiting in `crew_war_queue` if one
 * exists, or a same-ish-division "bot" crew otherwise (real rows — see the seed block in
 * db/schema.sql — so the whole War, opponent included, is genuinely persisted, not computed
 * client-side). A crew's leader/co-leader can turn this off (`crews.war_auto_match_enabled`, see
 * crews.php's updateCrew) so their crew only ever enters a War when a member explicitly asks for
 * one (`POST /crew-wars/start`, `force = true`) — covering both "I don't want to always be at war"
 * and "let me choose when."
 *
 * Real-crew matchmaking only ever pairs against a crew with genuine recent member activity (see
 * `crewHasRecentActivity`) — an abandoned crew sitting stale in the queue is evicted instead of
 * ever being matched, since a War against a crew that can't fight back isn't a War.
 *
 * Every "attack" is one real logged workout during an active War — real or bot, both sides log
 * real rows to `crew_war_attacks` (bot attacks are generated lazily on read, deterministically
 * scheduled, same "resolve on next read, no cron" idea crew-duels.php already uses — see
 * generateDueBotAttacks). This is what powers the attack feed, not just a running total.
 *
 * Routes (all require auth, see index.php):
 *   GET  /crew-wars/active  -> this crew's current War, or `{ war: null }` if it has none and
 *                              auto-match is off — never silently starts one in that case
 *   POST /crew-wars/start   -> leader/co-leader only: start (or match into) a War right now,
 *                              regardless of the auto-match setting
 *   POST /crew-wars/attack  -> record one attack from the caller's just-finished workout
 */
function handleCrewWars(PDO $pdo, string $userId, string $method, ?array $body, array $segments): void
{
    $sub = $segments[1] ?? null;

    if ($sub === 'active' && $method === 'GET') {
        respondWithActiveWar($pdo, $userId);
        return;
    }

    if ($sub === 'start' && $method === 'POST') {
        handleStartWar($pdo, $userId);
        return;
    }

    if ($sub === 'attack' && $method === 'POST') {
        recordAttack($pdo, $userId, $body ?? []);
        return;
    }

    errorResponse('Not found', 404);
}

const WAR_DURATION_MS = 3 * 24 * 60 * 60 * 1000;
// A real crew with nobody having trained in this long is treated as abandoned for matchmaking
// purposes — long enough that someone on a normal rest/deload week never gets flagged, short
// enough that a War (itself only WAR_DURATION_MS long) doesn't get handed a dead opponent.
const WAR_MATCH_ACTIVITY_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const ATTACK_PR_BONUS = 250;
const BOT_ATTACK_MIN_INTERVAL_MS = 8 * 60 * 60 * 1000;
// One attack is supposed to be one just-finished real workout (see the doc comment above) — these
// guard against a client (or a raw replayed request, bypassing the app entirely) inflating a
// crew's War score with an implausible volume or by firing the same "finished workout" repeatedly.
// Generous on purpose: this is an abuse ceiling, not a fairness/anti-cheat mechanism — a bot attack
// already tops out at 9,000kg (see generateDueBotAttacks), so a real session should never need to
// exceed this by much even on a very heavy multi-exercise day.
const MAX_ATTACK_VOLUME_KG = 20000;
const MAX_ATTACK_PR_COUNT = 10;
const MIN_ATTACK_INTERVAL_MS = 2 * 60 * 1000;
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

/** True if any real member of `$crewId` has completed a real workout within the last
 * WAR_MATCH_ACTIVITY_WINDOW_MS — used to keep matchmaking from pairing a crew against one that's
 * effectively abandoned. Bot crews are always "active" by definition (see isBotCrew) — their
 * attacks are generated on a schedule, never from real member activity. */
function crewHasRecentActivity(PDO $pdo, string $crewId): bool
{
    if (isBotCrew($crewId)) {
        return true;
    }

    $cutoff = (int) round(microtime(true) * 1000) - WAR_MATCH_ACTIVITY_WINDOW_MS;
    $stmt = $pdo->prepare(
        'SELECT 1 FROM workouts w
         JOIN crew_members cm ON cm.user_id = w.user_id
         WHERE cm.crew_id = ? AND w.completed_at >= ?
         LIMIT 1'
    );
    $stmt->execute([$crewId, $cutoff]);
    return (bool) $stmt->fetch();
}

/**
 * The best real, currently-active opponent waiting in `crew_war_queue`, closest in power first —
 * `null` if the queue has nobody active right now. A queued crew with no recent activity is
 * evicted as it's passed over (not just skipped) so the queue self-cleans of abandoned crews over
 * time instead of accumulating them forever. Race-safe the same way the original single-candidate
 * version was: only a successful DELETE (rowCount > 0) actually claims a candidate, so two crews
 * racing to match the same queued one can't both win it.
 */
function findActiveQueuedOpponent(PDO $pdo, int $crewPower): ?string
{
    $stmt = $pdo->prepare('SELECT crew_id FROM crew_war_queue ORDER BY ABS(crew_power - ?) ASC, queued_at ASC');
    $stmt->execute([$crewPower]);

    foreach ($stmt->fetchAll() as $row) {
        $candidateId = $row['crew_id'];
        if (!crewHasRecentActivity($pdo, $candidateId)) {
            $pdo->prepare('DELETE FROM crew_war_queue WHERE crew_id = ?')->execute([$candidateId]);
            continue;
        }

        $deleteStmt = $pdo->prepare('DELETE FROM crew_war_queue WHERE crew_id = ?');
        $deleteStmt->execute([$candidateId]);
        if ($deleteStmt->rowCount() > 0) {
            return $candidateId;
        }
    }

    return null;
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
 * Returns `$crewId`'s active War, or starts one, or returns `null` — depending on `$force`:
 *  - An already-active War (or one that just got resolved and immediately replaced, when allowed)
 *    is always returned first, regardless of `$force`.
 *  - Without an active War: `$force = true` (a member explicitly asked, see `handleStartWar`)
 *    always starts one. `$force = false` (the passive path — `respondWithActiveWar`/`recordAttack`)
 *    only starts one if this crew's own `war_auto_match_enabled` is still on; otherwise returns
 *    `null` so the crew genuinely sits without a War until someone asks for one.
 *
 * Starting one matches a real, currently-active crew waiting in `crew_war_queue` (closest in
 * power) if one exists, otherwise an immediate match against the nearest-division bot crew —
 * `$crewId` also gets queued for real matchmaking in the background so a genuine opponent can
 * still be found later without ever leaving the crew stuck waiting for one.
 */
function getOrStartWar(PDO $pdo, string $crewId, bool $force): ?array
{
    $existing = activeWarForCrew($pdo, $crewId);
    if ($existing) {
        $existing = resolveWarIfEnded($pdo, $existing);
        if ($existing['status'] === 'active') {
            return $existing;
        }
    }

    if (!$force) {
        $autoStmt = $pdo->prepare('SELECT war_auto_match_enabled FROM crews WHERE id = ?');
        $autoStmt->execute([$crewId]);
        $autoRow = $autoStmt->fetch();
        if (!$autoRow || !(bool) $autoRow['war_auto_match_enabled']) {
            return null;
        }
    }

    $crewPower = crewPowerSnapshot($pdo, $crewId);
    $now = (int) round(microtime(true) * 1000);

    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM crew_war_queue WHERE crew_id = ?')->execute([$crewId]);

        $opponentCrewId = findActiveQueuedOpponent($pdo, $crewPower);

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

    $war = getOrStartWar($pdo, $crewId, false);
    if ($war === null) {
        jsonResponse(['war' => null]);
        return;
    }
    generateDueBotAttacks($pdo, $war);

    // Re-fetch — generateDueBotAttacks may have just updated the score columns.
    $stmt = $pdo->prepare('SELECT * FROM crew_wars WHERE id = ?');
    $stmt->execute([$war['id']]);
    $war = $stmt->fetch();

    jsonResponse(['war' => warJson($pdo, $war, $crewId)]);
}

/** A member explicitly asking for a War right now — see `getOrStartWar`'s `$force = true` path.
 * Leader/co-leader only, same gate as every other crew-wide setting/action in crews.php. */
function handleStartWar(PDO $pdo, string $userId): void
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

    $war = getOrStartWar($pdo, $crewId, true);
    generateDueBotAttacks($pdo, $war);

    $stmt = $pdo->prepare('SELECT * FROM crew_wars WHERE id = ?');
    $stmt->execute([$war['id']]);
    $war = $stmt->fetch();

    jsonResponse(['war' => warJson($pdo, $war, $crewId)]);
}

function recordAttack(PDO $pdo, string $userId, array $data): void
{
    $volumeKg = isset($data['volumeKg']) ? (float) $data['volumeKg'] : 0;
    $volumeKg = min($volumeKg, MAX_ATTACK_VOLUME_KG);
    $prCount = isset($data['prCount']) ? max(0, min(MAX_ATTACK_PR_COUNT, (int) $data['prCount'])) : 0;
    $workoutName = isset($data['workoutName']) ? trim((string) $data['workoutName']) : null;
    if ($workoutName === '') $workoutName = null;

    $crewId = findMyCrewId($pdo, $userId);
    if ($volumeKg <= 0 || $crewId === null) {
        jsonResponse(['ok' => true, 'attacked' => false]);
        return;
    }

    // No active War and auto-match is off — nothing to attack. A member has to tap "Start War"
    // first (see handleStartWar); a finished workout alone no longer drags the crew into one.
    $war = getOrStartWar($pdo, $crewId, false);
    if ($war === null) {
        jsonResponse(['ok' => true, 'attacked' => false]);
        return;
    }
    generateDueBotAttacks($pdo, $war);

    // A real user finishes at most one workout at a time — this can only trip on a replayed/looped
    // request, not on normal use (see MIN_ATTACK_INTERVAL_MS's comment above).
    $lastStmt = $pdo->prepare('SELECT MAX(attacked_at) AS last_at FROM crew_war_attacks WHERE war_id = ? AND user_id = ?');
    $lastStmt->execute([$war['id'], $userId]);
    $lastAt = (int) ($lastStmt->fetch()['last_at'] ?? 0);
    $now = (int) round(microtime(true) * 1000);
    if ($lastAt > 0 && $now - $lastAt < MIN_ATTACK_INTERVAL_MS) {
        jsonResponse(['ok' => true, 'attacked' => false]);
        return;
    }

    $nameStmt = $pdo->prepare('SELECT full_name FROM users WHERE id = ?');
    $nameStmt->execute([$userId]);
    $attackerName = $nameStmt->fetch()['full_name'] ?: 'You';

    $score = $volumeKg + $prCount * ATTACK_PR_BONUS;

    $pdo->prepare(
        'INSERT INTO crew_war_attacks (war_id, crew_id, user_id, attacker_name, workout_name, volume_kg, pr_count, score, attacked_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([$war['id'], $crewId, $userId, $attackerName, $workoutName, $volumeKg, $prCount, $score, $now]);

    $column = $war['crew_a_id'] === $crewId ? 'crew_a_score' : 'crew_b_score';
    $pdo->prepare("UPDATE crew_wars SET $column = $column + ? WHERE id = ?")->execute([$score, $war['id']]);

    jsonResponse(['ok' => true, 'attacked' => true, 'score' => $score]);
}
