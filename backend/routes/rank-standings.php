<?php

/**
 * Real "where do you stand at your own gym" per-lift rank (see src/app/(tabs)/ranks.tsx's "MY GYM"
 * scope) — replaces src/lib/lift-rank-cards.ts's old `gymStandingForCard`, a deterministic
 * hash-based fake roster with no backend behind it at all. Peers are real users who share the
 * caller's own free-text `gym_name` (see onboarding-store.ts's comment on that field — no gym
 * directory yet, just a label) and gender (bodyweight/gender-normalized comparison, per the
 * product spec), ranked by best_weight_kg / their own weight_kg for that exercise.
 *
 * Routes:
 *   GET /rank-standings?exerciseIds=a,b,c  -> { [exerciseId]: { gymRank, gymPoolSize } | null }
 */

/** Below this, a "rank" is just the caller alone — an honest "not enough data yet" beats a
 * misleadingly precise "#1 of 1". */
const RANK_STANDINGS_MIN_POOL_SIZE = 2;

function handleRankStandings(PDO $pdo, string $userId, string $method): void
{
    if ($method !== 'GET') {
        errorResponse('Method not allowed', 405);
        return;
    }

    $exerciseIds = array_values(array_unique(array_filter(array_map('trim', explode(',', (string) ($_GET['exerciseIds'] ?? ''))))));
    if (!$exerciseIds) {
        jsonResponse((object) []);
        return;
    }

    $meStmt = $pdo->prepare('SELECT gender, weight_kg, gym_name FROM users WHERE id = ?');
    $meStmt->execute([$userId]);
    $me = $meStmt->fetch();
    $myGymName = $me ? trim((string) ($me['gym_name'] ?? '')) : '';
    $myGender = $me['gender'] ?? null;
    $myWeightKg = $me ? (float) ($me['weight_kg'] ?? 0) : 0;

    // Nothing computable without a gym name, gender, and bodyweight on file — the wizard collects
    // all three, but a Founding Athlete linked in from gymcrew.site (see profile.php's
    // maybeLinkFoundingAthlete) may not have finished it yet.
    if (!$myGender || $myGymName === '' || $myWeightKg <= 0) {
        jsonResponse(array_fill_keys($exerciseIds, null));
        return;
    }

    $placeholders = implode(',', array_fill(0, count($exerciseIds), '?'));
    $stmt = $pdo->prepare(
        "SELECT pr.exercise_id, pr.user_id, pr.best_weight_kg / u.weight_kg AS ratio, u.gym_name
         FROM personal_records pr
         JOIN users u ON u.id = pr.user_id
         WHERE pr.exercise_id IN ($placeholders) AND u.gender = ? AND u.weight_kg IS NOT NULL AND u.weight_kg > 0"
    );
    $stmt->execute(array_merge($exerciseIds, [$myGender]));

    $byExercise = [];
    foreach ($stmt->fetchAll() as $row) {
        $byExercise[$row['exercise_id']][] = $row;
    }

    $result = [];
    foreach ($exerciseIds as $exerciseId) {
        $rows = $byExercise[$exerciseId] ?? [];

        $myRow = null;
        foreach ($rows as $row) {
            if ($row['user_id'] === $userId) {
                $myRow = $row;
                break;
            }
        }
        if ($myRow === null) {
            // No real PR for this exercise — nothing to rank.
            $result[$exerciseId] = null;
            continue;
        }

        $pool = array_values(array_filter($rows, function (array $row) use ($myGymName): bool {
            return trim((string) $row['gym_name']) === $myGymName;
        }));
        $poolSize = count($pool);
        if ($poolSize < RANK_STANDINGS_MIN_POOL_SIZE) {
            $result[$exerciseId] = null;
            continue;
        }

        $myRatio = (float) $myRow['ratio'];
        $better = 0;
        foreach ($pool as $row) {
            if ((float) $row['ratio'] > $myRatio) {
                $better++;
            }
        }
        $result[$exerciseId] = ['gymRank' => $better + 1, 'gymPoolSize' => $poolSize];
    }

    jsonResponse($result);
}
