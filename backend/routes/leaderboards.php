<?php

/**
 * Real individual-player leaderboards (Global/Gym scopes — see src/app/crew/leaderboard.tsx),
 * which previously rendered a static mock roster (src/data/player-leaderboard.ts), including a
 * hardcoded stand-in for "you". Power score uses the exact same bodyweight-ratio formula as the
 * client's own Ranks tab (src/lib/lift-rank-cards.ts's SCORE_PER_BODYWEIGHT_RATIO), and division
 * uses the same absolute power cutoffs as src/lib/division.ts's `divisionForPlayerPower` — keep
 * both in sync if either ever changes. The "Crews" scope lives in routes/crews.php instead (see
 * respondWithCrewLeaderboard) since it reads straight from the `crews` table that file already owns.
 *
 * Routes:
 *   GET /leaderboards/players?scope=global|gym  -> real players in the caller's own division
 */

const PLAYER_POWER_PER_BODYWEIGHT_RATIO = 4000;

/** The player (division cutoffs, by power) or crew (XP required to climb out of each division)
 * rank ladder — admin-editable (see the admin panel's Rank Tiers page, routes/admin.php's rank-tier
 * endpoints, db/schema.sql's `rank_tier_config`). Both used to be separate hardcoded PHP arrays here
 * and in crews.php; this is now the one server-side source both read from. The client's own copy
 * (src/lib/division.ts) is NOT wired to this — still needs updating by hand if these ever change,
 * same as before. Cached per request since this can be read once per leaderboard/crew-XP request,
 * not once per row. */
function getRankTierConfig(PDO $pdo, string $scope): array
{
    static $cache = [];
    if (isset($cache[$scope])) {
        return $cache[$scope];
    }
    $stmt = $pdo->prepare('SELECT name, threshold FROM rank_tier_config WHERE scope = ? ORDER BY tier_order ASC');
    $stmt->execute([$scope]);
    $cache[$scope] = array_map(fn(array $r): array => ['name' => $r['name'], 'threshold' => (int) $r['threshold']], $stmt->fetchAll());
    return $cache[$scope];
}

/** Highest division whose cutoff `$power` clears — same rule as the client's own version. */
function divisionForPlayerPower(PDO $pdo, float $power): string
{
    $result = 'Rookie';
    foreach (getRankTierConfig($pdo, 'player') as $tier) {
        if ($power >= $tier['threshold']) {
            $result = $tier['name'];
        } else {
            break;
        }
    }
    return $result;
}

function handleLeaderboards(PDO $pdo, string $userId, string $method, array $segments): void
{
    $sub = $segments[1] ?? null;

    if ($sub === 'players' && $method === 'GET') {
        $scope = ($_GET['scope'] ?? 'global') === 'gym' ? 'gym' : 'global';
        respondWithPlayerLeaderboard($pdo, $userId, $scope);
        return;
    }

    errorResponse('Not found', 404);
}

/** Same cap as the Ranks tab's own auto-curated board (see ranks-board.ts's
 * MAX_AUTO_RANKS_BOARD_SIZE) — without this, someone who's simply logged a lot of different
 * exercises (accessory/machine lifts included) would rack up power far beyond what their own
 * Ranks tab ever shows them, since a handful of high-ratio machine lifts can dwarf the 9 major
 * barbell lifts a real strength-standard table is normally checked against. */
const LEADERBOARD_POWER_MAX_LIFTS = 12;

/**
 * Every real user's power score = their `LEADERBOARD_POWER_MAX_LIFTS` highest (best_weight_kg /
 * their own weight_kg) ratios, summed and scaled by PLAYER_POWER_PER_BODYWEIGHT_RATIO — the same
 * per-lift formula the Ranks tab uses for each card's own score, just approximating that tab's
 * "top 12" curation by raw ratio instead of by tier (replicating the exact tier-based curation,
 * which needs a full strength-standard table per exercise, isn't worth it just for a leaderboard
 * ranking). Only ever ranks against real users in the caller's own division — an empty result (no
 * one else there yet) is left for the client's existing "No one has reached this division yet"
 * empty state to show honestly, rather than padding it with anything invented.
 */
function respondWithPlayerLeaderboard(PDO $pdo, string $userId, string $scope): void
{
    $meStmt = $pdo->prepare('SELECT gym_name FROM users WHERE id = ?');
    $meStmt->execute([$userId]);
    $myGymName = $meStmt->fetch()['gym_name'] ?? null;

    if ($scope === 'gym' && (!$myGymName || trim((string) $myGymName) === '')) {
        jsonResponse(['players' => [], 'myDivision' => null]);
        return;
    }

    // Deliberately not aggregated in SQL (a plain SUM/GROUP BY here is exactly the bug this cap
    // exists to fix) — every row is fetched and the top-N-per-user selection happens below in PHP,
    // since picking "this user's own top 12 ratios" isn't expressible as a plain GROUP BY, and
    // Hostinger's MySQL/MariaDB version isn't guaranteed to have window functions.
    $sql = 'SELECT u.id, u.full_name, u.avatar_url, u.gym_name, pr.best_weight_kg / u.weight_kg AS ratio
            FROM personal_records pr
            JOIN users u ON u.id = pr.user_id
            WHERE u.weight_kg IS NOT NULL AND u.weight_kg > 0';
    $params = [];
    if ($scope === 'gym') {
        $sql .= ' AND u.gym_name = ?';
        $params[] = $myGymName;
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $byUser = [];
    foreach ($stmt->fetchAll() as $row) {
        $uid = $row['id'];
        if (!isset($byUser[$uid])) {
            $byUser[$uid] = ['fullName' => $row['full_name'], 'avatarUrl' => $row['avatar_url'], 'gymName' => $row['gym_name'], 'ratios' => []];
        }
        $byUser[$uid]['ratios'][] = (float) $row['ratio'];
    }

    $players = [];
    foreach ($byUser as $uid => $data) {
        $topRatios = $data['ratios'];
        rsort($topRatios);
        $topRatios = array_slice($topRatios, 0, LEADERBOARD_POWER_MAX_LIFTS);
        $power = (int) round(array_sum($topRatios) * PLAYER_POWER_PER_BODYWEIGHT_RATIO);
        $players[] = [
            'id' => $uid,
            'name' => $data['fullName'] ?: 'GymCrew Athlete',
            'avatarUrl' => $data['avatarUrl'] ?: ('https://api.dicebear.com/9.x/avataaars/png?seed=' . urlencode($uid) . '&size=200'),
            'power' => $power,
            'gymName' => $data['gymName'],
            'isMe' => $uid === $userId,
        ];
    }

    $me = null;
    foreach ($players as $player) {
        if ($player['isMe']) {
            $me = $player;
            break;
        }
    }
    // No real PRs logged yet — nothing to rank the caller against, regardless of who else shows up.
    if ($me === null) {
        jsonResponse(['players' => [], 'myDivision' => null]);
        return;
    }

    $myDivision = divisionForPlayerPower($pdo, $me['power']);
    $inMyDivision = array_values(array_filter($players, function (array $player) use ($pdo, $myDivision): bool {
        return divisionForPlayerPower($pdo, $player['power']) === $myDivision;
    }));
    usort($inMyDivision, function (array $a, array $b): int {
        return $b['power'] <=> $a['power'];
    });

    jsonResponse(['players' => array_slice($inMyDivision, 0, 50), 'myDivision' => $myDivision]);
}
