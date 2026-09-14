<?php

/** Boundaries for a period selector (today | 7d | 30d | all), plus the matching prior period of
 * equal length for a comparison — everything in epoch milliseconds. */
function periodBoundsMs(string $period): array
{
    $now = (int) round(microtime(true) * 1000);
    if ($period === 'today') {
        $start = (int) strtotime('today midnight') * 1000;
        return [$start, $now, $start - 86400000, $start];
    }
    if ($period === '30d') {
        $start = $now - 30 * 86400000;
        return [$start, $now, $start - 30 * 86400000, $start];
    }
    if ($period === 'all') {
        return [0, $now, null, null];
    }
    // Default: 7d
    $start = $now - 7 * 86400000;
    return [$start, $now, $start - 7 * 86400000, $start];
}

/** Powers the Analytics page's "Launch Performance" section — a period selector (today/7d/30d/all)
 * with comparison against the equivalent prior period, plus three real time-series charts. */
function respondWithLaunchPerformance(PDO $pdo): void
{
    $period = (string) ($_GET['period'] ?? '7d');
    if (!in_array($period, ['today', '7d', '30d', 'all'], true)) {
        $period = '7d';
    }
    [$start, , $prevStart, $prevEnd] = periodBoundsMs($period);

    $totalUsers = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE id != 'bot-system'")->fetchColumn();

    $newUsersStmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE id != 'bot-system' AND created_at >= FROM_UNIXTIME(? / 1000)");
    $newUsersStmt->execute([$start]);
    $newUsersInPeriod = (int) $newUsersStmt->fetchColumn();

    $newUsersChangePercent = null;
    if ($prevStart !== null) {
        $prevStmt = $pdo->prepare(
            "SELECT COUNT(*) FROM users WHERE id != 'bot-system' AND created_at >= FROM_UNIXTIME(? / 1000) AND created_at < FROM_UNIXTIME(? / 1000)"
        );
        $prevStmt->execute([$prevStart, $prevEnd]);
        $newUsersPrev = (int) $prevStmt->fetchColumn();
        if ($newUsersPrev > 0) {
            $newUsersChangePercent = (int) round((($newUsersInPeriod - $newUsersPrev) / $newUsersPrev) * 100);
        }
    }

    $todayStartMs = (int) strtotime('today midnight') * 1000;
    $dauStmt = $pdo->prepare('SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE created_at >= ?');
    $dauStmt->execute([$todayStartMs]);
    $dau = (int) $dauStmt->fetchColumn();

    $nowMs = (int) round(microtime(true) * 1000);
    $wauStmt = $pdo->prepare('SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE created_at >= ?');
    $wauStmt->execute([$nowMs - 7 * 86400000]);
    $wau = (int) $wauStmt->fetchColumn();

    $returningStmt = $pdo->prepare(
        "SELECT COUNT(*) FROM (
           SELECT user_id FROM analytics_events WHERE created_at >= ? AND user_id IS NOT NULL
           GROUP BY user_id HAVING COUNT(DISTINCT DATE(FROM_UNIXTIME(created_at / 1000))) > 1
         ) t"
    );
    $returningStmt->execute([$start]);
    $returningUsersInPeriod = (int) $returningStmt->fetchColumn();

    $sessionDurationStmt = $pdo->prepare(
        "SELECT AVG(duration) FROM (
           SELECT (MAX(created_at) - MIN(created_at)) / 1000 AS duration FROM analytics_events
           WHERE created_at >= ? GROUP BY session_id HAVING COUNT(*) > 1
         ) s"
    );
    $sessionDurationStmt->execute([$start]);
    $avgSessionDurationSeconds = (int) round((float) ($sessionDurationStmt->fetchColumn() ?: 0));

    $sessionsPerUserStmt = $pdo->prepare(
        'SELECT COUNT(DISTINCT session_id) / GREATEST(COUNT(DISTINCT user_id), 1) FROM analytics_events WHERE created_at >= ?'
    );
    $sessionsPerUserStmt->execute([$start]);
    $sessionsPerUser = round((float) $sessionsPerUserStmt->fetchColumn(), 1);

    // Chart window: the period itself, except "all" is capped to the last 90 days so the chart
    // stays readable — the stat cards above still reflect the true all-time totals.
    $chartStart = $period === 'all' ? $nowMs - 90 * 86400000 : $start;

    $dauSeriesStmt = $pdo->prepare(
        'SELECT DATE(FROM_UNIXTIME(created_at / 1000)) AS d, COUNT(DISTINCT user_id) AS c
         FROM analytics_events WHERE created_at >= ? GROUP BY d ORDER BY d ASC'
    );
    $dauSeriesStmt->execute([$chartStart]);
    $dailyActiveUsers = array_map(fn(array $r): array => ['date' => $r['d'], 'count' => (int) $r['c']], $dauSeriesStmt->fetchAll());

    $newUsersSeriesStmt = $pdo->prepare(
        "SELECT DATE(created_at) AS d, COUNT(*) AS c FROM users
         WHERE id != 'bot-system' AND created_at >= FROM_UNIXTIME(? / 1000) GROUP BY d ORDER BY d ASC"
    );
    $newUsersSeriesStmt->execute([$chartStart]);
    $newUsersPerDay = array_map(fn(array $r): array => ['date' => $r['d'], 'count' => (int) $r['c']], $newUsersSeriesStmt->fetchAll());

    $baselineStmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE id != 'bot-system' AND created_at < FROM_UNIXTIME(? / 1000)");
    $baselineStmt->execute([$chartStart]);
    $running = (int) $baselineStmt->fetchColumn();
    $usersOverTime = [];
    foreach ($newUsersPerDay as $row) {
        $running += $row['count'];
        $usersOverTime[] = ['date' => $row['date'], 'count' => $running];
    }

    jsonResponse([
        'period' => $period,
        'totalUsers' => $totalUsers,
        'newUsersInPeriod' => $newUsersInPeriod,
        'newUsersChangePercent' => $newUsersChangePercent,
        'dau' => $dau,
        'wau' => $wau,
        'returningUsersInPeriod' => $returningUsersInPeriod,
        'avgSessionDurationSeconds' => $avgSessionDurationSeconds,
        'sessionsPerUser' => $sessionsPerUser,
        'usersOverTime' => $usersOverTime,
        'dailyActiveUsers' => $dailyActiveUsers,
        'newUsersPerDay' => $newUsersPerDay,
    ]);
}

/** Powers the Analytics page's "User Funnel" section. Each stage is this app's real adoption count
 * for that action (not a strictly-gated sequential funnel — e.g. nothing stops a user from viewing
 * their rank before finishing a workout), shown in the order the spec asked for. "First Workout
 * Started" is the one stage with no dedicated table (an abandoned, never-synced workout leaves no
 * row anywhere) — it comes from the workout_started event and so only reflects usage since that
 * event started flowing into analytics_events. */
function respondWithProductFunnel(PDO $pdo): void
{
    $totalUsers = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE id != 'bot-system'")->fetchColumn();

    $profileCompleted = (int) $pdo->query(
        "SELECT COUNT(*) FROM users WHERE id != 'bot-system' AND gender IS NOT NULL AND weight_kg IS NOT NULL AND goal IS NOT NULL"
    )->fetchColumn();

    $crewJoined = (int) $pdo->query(
        "SELECT COUNT(DISTINCT cm.user_id) FROM crew_members cm JOIN users u ON u.id = cm.user_id WHERE u.id != 'bot-system'"
    )->fetchColumn();

    $workoutStarted = (int) $pdo->query(
        "SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE event_type = 'workout_started' AND user_id IS NOT NULL"
    )->fetchColumn();

    $workoutCompleted = (int) $pdo->query(
        "SELECT COUNT(DISTINCT w.user_id) FROM workouts w JOIN users u ON u.id = w.user_id WHERE u.id != 'bot-system'"
    )->fetchColumn();

    $rankViewed = (int) $pdo->query(
        "SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE screen_name LIKE '/ranks%' AND user_id IS NOT NULL"
    )->fetchColumn();

    $mealLogged = (int) $pdo->query(
        "SELECT COUNT(DISTINCT f.user_id) FROM food_logs f JOIN users u ON u.id = f.user_id WHERE u.id != 'bot-system'"
    )->fetchColumn();

    $returned = (int) $pdo->query(
        "SELECT COUNT(*) FROM (
           SELECT user_id FROM analytics_events WHERE user_id IS NOT NULL
           GROUP BY user_id HAVING COUNT(DISTINCT DATE(FROM_UNIXTIME(created_at / 1000))) > 1
         ) t"
    )->fetchColumn();

    $stages = [
        ['key' => 'signup', 'label' => 'Signup', 'count' => $totalUsers],
        ['key' => 'profile_completed', 'label' => 'Profile Completed', 'count' => $profileCompleted],
        ['key' => 'crew', 'label' => 'Crew Created/Joined', 'count' => $crewJoined],
        ['key' => 'workout_started', 'label' => 'First Workout Started', 'count' => $workoutStarted],
        ['key' => 'workout_completed', 'label' => 'First Workout Completed', 'count' => $workoutCompleted],
        ['key' => 'rank_viewed', 'label' => 'Rank Viewed', 'count' => $rankViewed],
        ['key' => 'meal_logged', 'label' => 'Meal Logged', 'count' => $mealLogged],
        ['key' => 'returned', 'label' => 'Returned', 'count' => $returned],
    ];

    $biggestDropOff = null;
    $result = [];
    $prevCount = $totalUsers;
    foreach ($stages as $i => $stage) {
        $conversionPercent = $totalUsers > 0 ? (int) round(($stage['count'] / $totalUsers) * 100) : 0;
        $dropOffPercent = ($i > 0 && $prevCount > 0) ? (int) round((($prevCount - $stage['count']) / $prevCount) * 100) : 0;
        if ($i > 0 && ($biggestDropOff === null || $dropOffPercent > $biggestDropOff['dropOffPercent'])) {
            $biggestDropOff = ['fromLabel' => $stages[$i - 1]['label'], 'toLabel' => $stage['label'], 'dropOffPercent' => $dropOffPercent];
        }
        $result[] = [
            'key' => $stage['key'],
            'label' => $stage['label'],
            'count' => $stage['count'],
            'conversionPercent' => $conversionPercent,
            'dropOffPercent' => $dropOffPercent,
        ];
        $prevCount = $stage['count'];
    }

    jsonResponse(['stages' => $result, 'biggestDropOff' => $biggestDropOff]);
}

/** Powers the "Workout Analytics" page. exercises_json has no normalized sets table backing it
 * (see schema.sql's note on workouts.exercises_json) — sets/reps/most-popular-exercise numbers are
 * decoded from JSON here rather than via SQL aggregates. Capped to the most recent 5000 workouts;
 * early access is nowhere near that, and it keeps this bounded once it is. */
function respondWithWorkoutAnalytics(PDO $pdo): void
{
    $todayStartMs = (int) strtotime('today midnight') * 1000;
    $weekAgoMs = (int) round(microtime(true) * 1000) - 7 * 86400000;

    $totalWorkouts = (int) $pdo->query('SELECT COUNT(*) FROM workouts')->fetchColumn();

    $todayStmt = $pdo->prepare('SELECT COUNT(*) FROM workouts WHERE completed_at >= ?');
    $todayStmt->execute([$todayStartMs]);
    $workoutsToday = (int) $todayStmt->fetchColumn();

    $weekStmt = $pdo->prepare('SELECT COUNT(*) FROM workouts WHERE completed_at >= ?');
    $weekStmt->execute([$weekAgoMs]);
    $workoutsThisWeek = (int) $weekStmt->fetchColumn();

    $avgPerUser = round((float) $pdo->query('SELECT COUNT(*) / GREATEST(COUNT(DISTINCT user_id), 1) FROM workouts')->fetchColumn(), 1);
    $avgDurationSeconds = (int) round((float) ($pdo->query('SELECT AVG(duration_seconds) FROM workouts WHERE duration_seconds > 0')->fetchColumn() ?: 0));
    $totalVolumeKg = round((float) $pdo->query('SELECT COALESCE(SUM(volume_kg), 0) FROM workouts')->fetchColumn(), 1);
    $totalPrs = (int) $pdo->query('SELECT COUNT(*) FROM personal_record_history')->fetchColumn();

    $prCountsStmt = $pdo->query('SELECT exercise_id, COUNT(*) AS c FROM personal_record_history GROUP BY exercise_id');
    $prCounts = [];
    foreach ($prCountsStmt->fetchAll() as $r) {
        $prCounts[$r['exercise_id']] = (int) $r['c'];
    }

    $rowsStmt = $pdo->query('SELECT user_id, exercises_json, muscle_intensity_json FROM workouts ORDER BY completed_at DESC LIMIT 5000');

    $exercisesLogged = 0;
    $setsLogged = 0;
    $repsLogged = 0;
    $exerciseStats = [];
    $muscleStats = [];

    while ($row = $rowsStmt->fetch()) {
        $exercises = json_decode((string) $row['exercises_json'], true) ?: [];
        $exercisesLogged += count($exercises);

        foreach ($exercises as $ex) {
            $exId = $ex['exerciseId'] ?? 'unknown';
            $name = $ex['name'] ?? 'Unknown';
            if (!isset($exerciseStats[$exId])) {
                $exerciseStats[$exId] = ['name' => $name, 'users' => [], 'sets' => 0, 'volume' => 0.0];
            }
            $exerciseStats[$exId]['users'][$row['user_id']] = true;

            foreach (($ex['sets'] ?? []) as $set) {
                if (empty($set['completed'])) {
                    continue;
                }
                $setsLogged++;
                $exerciseStats[$exId]['sets']++;
                $reps = (int) ($set['reps'] ?? 0);
                $weight = (float) ($set['weightKg'] ?? 0);
                $repsLogged += $reps;
                $exerciseStats[$exId]['volume'] += $reps * $weight;
            }
        }

        $muscleIntensity = json_decode((string) $row['muscle_intensity_json'], true) ?: [];
        foreach ($muscleIntensity as $muscle => $intensity) {
            $muscleStats[$muscle] = ($muscleStats[$muscle] ?? 0) + (float) $intensity;
        }
    }

    arsort($muscleStats);
    $topMuscleGroups = [];
    foreach (array_slice($muscleStats, 0, 8, true) as $muscle => $score) {
        $topMuscleGroups[] = ['label' => (string) $muscle, 'count' => (int) round($score)];
    }

    uasort($exerciseStats, fn(array $a, array $b): int => $b['sets'] <=> $a['sets']);
    $topExercises = [];
    $i = 0;
    foreach ($exerciseStats as $exId => $stats) {
        if ($i++ >= 10) {
            break;
        }
        $topExercises[] = [
            'exerciseName' => $stats['name'],
            'users' => count($stats['users']),
            'sets' => $stats['sets'],
            'volumeKg' => round($stats['volume'], 1),
            'prs' => $prCounts[$exId] ?? 0,
        ];
    }

    jsonResponse([
        'totalWorkouts' => $totalWorkouts,
        'workoutsToday' => $workoutsToday,
        'workoutsThisWeek' => $workoutsThisWeek,
        'avgWorkoutsPerUser' => $avgPerUser,
        'avgDurationSeconds' => $avgDurationSeconds,
        'exercisesLogged' => $exercisesLogged,
        'setsLogged' => $setsLogged,
        'repsLogged' => $repsLogged,
        'totalVolumeKg' => $totalVolumeKg,
        'prsAchieved' => $totalPrs,
        'topExercises' => $topExercises,
        'topMuscleGroups' => $topMuscleGroups,
    ]);
}

/** Powers the "Crew Analytics" page. Invite sent/accepted counts come from analytics_events
 * (crew_invite_shared/copied, crew_joined_via_code) — global totals, not reliably attributable to
 * a single crew, since nothing links an invite share back to who eventually used it. */
function respondWithCrewAnalytics(PDO $pdo): void
{
    $todayStartMs = (int) strtotime('today midnight') * 1000;
    $sevenDaysAgoMs = (int) round(microtime(true) * 1000) - 7 * 86400000;

    $totalCrews = (int) $pdo->query("SELECT COUNT(*) FROM crews WHERE id NOT LIKE 'bot-crew-%'")->fetchColumn();

    $newTodayStmt = $pdo->prepare("SELECT COUNT(*) FROM crews WHERE id NOT LIKE 'bot-crew-%' AND created_at >= ?");
    $newTodayStmt->execute([$todayStartMs]);
    $newCrewsToday = (int) $newTodayStmt->fetchColumn();

    $sizeRow = $pdo->query(
        "SELECT AVG(member_count) AS avg_size, MAX(member_count) AS max_size FROM (
           SELECT c.id, COUNT(cm.user_id) AS member_count FROM crews c
           LEFT JOIN crew_members cm ON cm.crew_id = c.id
           WHERE c.id NOT LIKE 'bot-crew-%' GROUP BY c.id
         ) t"
    )->fetch();
    $avgCrewSize = round((float) ($sizeRow['avg_size'] ?? 0), 1);
    $largestCrewSize = (int) ($sizeRow['max_size'] ?? 0);

    $invitesSent = (int) $pdo->query("SELECT COUNT(*) FROM analytics_events WHERE event_type IN ('crew_invite_shared', 'crew_invite_copied')")->fetchColumn();
    $invitesAccepted = (int) $pdo->query("SELECT COUNT(*) FROM analytics_events WHERE event_type = 'crew_joined_via_code'")->fetchColumn();

    $topCrewsStmt = $pdo->query(
        "SELECT c.id, c.name,
           (SELECT COUNT(*) FROM crew_members cm WHERE cm.crew_id = c.id) AS member_count,
           (SELECT COUNT(*) FROM workouts w JOIN crew_members cm2 ON cm2.user_id = w.user_id WHERE cm2.crew_id = c.id) AS workout_count,
           (SELECT COUNT(*) FROM personal_record_history h JOIN crew_members cm3 ON cm3.user_id = h.user_id WHERE cm3.crew_id = c.id) AS pr_count,
           (SELECT COUNT(*) FROM workouts w2 JOIN crew_members cm4 ON cm4.user_id = w2.user_id WHERE cm4.crew_id = c.id AND w2.completed_at >= $sevenDaysAgoMs) AS recent_activity
         FROM crews c WHERE c.id NOT LIKE 'bot-crew-%'
         ORDER BY recent_activity DESC, workout_count DESC LIMIT 10"
    );
    $topCrews = array_map(fn(array $r): array => [
        'id' => $r['id'],
        'name' => $r['name'],
        'members' => (int) $r['member_count'],
        'workouts' => (int) $r['workout_count'],
        'prs' => (int) $r['pr_count'],
        'recentActivity' => (int) $r['recent_activity'],
    ], $topCrewsStmt->fetchAll());

    jsonResponse([
        'totalCrews' => $totalCrews,
        'newCrewsToday' => $newCrewsToday,
        'avgCrewSize' => $avgCrewSize,
        'largestCrewSize' => $largestCrewSize,
        'mostActiveCrew' => $topCrews[0]['name'] ?? null,
        'invitesSent' => $invitesSent,
        'invitesAccepted' => $invitesAccepted,
        'topCrews' => $topCrews,
    ]);
}

/** Powers the "Ranking Analytics" page. Division order must match src/lib/division.ts's DIVISIONS
 * exactly (lowest to highest) — that file, not this list, is the source of truth if it ever changes. */
function respondWithRankingAnalytics(PDO $pdo): void
{
    $divisionOrder = [
        'Rookie', 'Novice', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Elite', 'Master', 'Grandmaster',
        'Champion', 'Titan', 'Mythic', 'Immortal', 'Legend', 'Overlord', 'Supreme', 'Conqueror', 'Dominator', 'Apex',
    ];
    $divisionIndex = array_flip($divisionOrder);

    $rankPageViews = (int) $pdo->query("SELECT COUNT(*) FROM analytics_events WHERE screen_name LIKE '/ranks%'")->fetchColumn();
    $rankCalculations = (int) $pdo->query("SELECT COUNT(*) FROM analytics_events WHERE event_type = 'rank_lift_tracked'")->fetchColumn();

    $todayStartMs = (int) strtotime('today midnight') * 1000;
    $prsTodayStmt = $pdo->prepare('SELECT COUNT(*) FROM personal_record_history WHERE achieved_at >= ?');
    $prsTodayStmt->execute([$todayStartMs]);
    $prsToday = (int) $prsTodayStmt->fetchColumn();
    $totalPrs = (int) $pdo->query('SELECT COUNT(*) FROM personal_record_history')->fetchColumn();

    $rawDist = [];
    foreach ($pdo->query("SELECT division, COUNT(*) AS c FROM profile_level pl JOIN users u ON u.id = pl.user_id WHERE u.id != 'bot-system' GROUP BY division")->fetchAll() as $r) {
        $rawDist[$r['division']] = (int) $r['c'];
    }
    $divisionDistribution = [];
    foreach ($divisionOrder as $div) {
        $divisionDistribution[] = ['label' => $div, 'count' => $rawDist[$div] ?? 0];
    }

    // Most improved: earliest division reached more than 30 days ago vs. current division.
    $thirtyDaysAgoMs = (int) round(microtime(true) * 1000) - 30 * 86400000;
    $historyStmt = $pdo->query(
        "SELECT pl.user_id, u.full_name, pl.division AS current_division, pl.division_history_json
         FROM profile_level pl JOIN users u ON u.id = pl.user_id WHERE u.id != 'bot-system'"
    );

    $improved = [];
    foreach ($historyStmt->fetchAll() as $row) {
        $history = json_decode((string) $row['division_history_json'], true) ?: [];
        if (count($history) < 2) {
            continue;
        }

        $earliestDivision = $history[0]['division'] ?? null;
        foreach ($history as $entry) {
            if (($entry['reachedAt'] ?? 0) >= $thirtyDaysAgoMs) {
                break;
            }
            $earliestDivision = $entry['division'];
        }

        $currentIndex = $divisionIndex[$row['current_division']] ?? null;
        $earliestIndex = $divisionIndex[$earliestDivision] ?? null;
        if ($currentIndex === null || $earliestIndex === null) {
            continue;
        }

        $improvement = $currentIndex - $earliestIndex;
        if ($improvement > 0) {
            $improved[] = [
                'userId' => $row['user_id'],
                'userName' => $row['full_name'] ?: 'Unknown',
                'previousDivision' => $earliestDivision,
                'currentDivision' => $row['current_division'],
                'improvement' => $improvement,
            ];
        }
    }
    usort($improved, fn(array $a, array $b): int => $b['improvement'] <=> $a['improvement']);

    jsonResponse([
        'rankPageViews' => $rankPageViews,
        'rankCalculations' => $rankCalculations,
        'prsToday' => $prsToday,
        'totalPrs' => $totalPrs,
        'divisionDistribution' => $divisionDistribution,
        'mostImproved' => array_slice($improved, 0, 10),
    ]);
}

/** Powers the "Retention" page — standard cohort retention (% of users active N days after
 * signup, among users old enough for day N to have fully elapsed). Early access just launched, so
 * day 14/30 cohorts will legitimately show little to no data yet — that's correct, not a bug. */
function respondWithRetention(PDO $pdo): void
{
    $days = [1, 3, 7, 14, 30];
    $result = [];

    foreach ($days as $n) {
        $cohortStmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE id != 'bot-system' AND created_at <= (NOW() - INTERVAL $n DAY)");
        $cohortStmt->execute();
        $cohortSize = (int) $cohortStmt->fetchColumn();

        if ($cohortSize === 0) {
            $result[] = ['day' => $n, 'retainedPercent' => null, 'cohortSize' => 0];
            continue;
        }

        $retainedStmt = $pdo->prepare(
            "SELECT COUNT(DISTINCT u.id) FROM users u
             JOIN analytics_events ae ON ae.user_id = u.id
             WHERE u.id != 'bot-system' AND u.created_at <= (NOW() - INTERVAL $n DAY)
               AND ae.created_at >= (UNIX_TIMESTAMP(u.created_at) + $n * 86400) * 1000"
        );
        $retainedStmt->execute();
        $retainedCount = (int) $retainedStmt->fetchColumn();

        $result[] = ['day' => $n, 'retainedPercent' => (int) round(($retainedCount / $cohortSize) * 100), 'cohortSize' => $cohortSize];
    }

    $returningUsers = (int) $pdo->query(
        "SELECT COUNT(*) FROM (
           SELECT user_id FROM analytics_events WHERE user_id IS NOT NULL
           GROUP BY user_id HAVING COUNT(DISTINCT DATE(FROM_UNIXTIME(created_at / 1000))) > 1
         ) t"
    )->fetchColumn();

    jsonResponse(['retention' => $result, 'returningUsers' => $returningUsers]);
}

/** Powers the Analytics page's "PWA Adoption" section — "installed" is derived from the
 * "standalone" property every event already carries (see src/lib/analytics.ts's detectPlatform),
 * not a separate table. A native iOS/Android build doesn't exist yet (Early Access is PWA-only —
 * see the launch brief), so "platform" here is always ios/android/web-desktop from a browser. */
function respondWithPwaAdoption(PDO $pdo): void
{
    $totalUsers = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE id != 'bot-system'")->fetchColumn();

    $installedStmt = $pdo->query(
        "SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE user_id IS NOT NULL AND JSON_EXTRACT(properties_json, '$.standalone') = true"
    );
    $installed = (int) $installedStmt->fetchColumn();

    $byPlatform = [];
    $platformStmt = $pdo->query(
        "SELECT JSON_UNQUOTE(JSON_EXTRACT(properties_json, '$.platform')) AS platform,
                COUNT(DISTINCT CASE WHEN JSON_EXTRACT(properties_json, '$.standalone') = true THEN user_id END) AS installed_c,
                COUNT(DISTINCT user_id) AS total_c
         FROM analytics_events WHERE user_id IS NOT NULL AND JSON_EXTRACT(properties_json, '$.platform') IS NOT NULL
         GROUP BY platform"
    );
    foreach ($platformStmt->fetchAll() as $r) {
        $byPlatform[$r['platform']] = ['installed' => (int) $r['installed_c'], 'total' => (int) $r['total_c']];
    }

    $pwaOpens = (int) $pdo->query("SELECT COUNT(*) FROM analytics_events WHERE event_type = 'pwa_opened'")->fetchColumn();

    jsonResponse([
        'totalUsers' => $totalUsers,
        'installed' => $installed,
        'notInstalled' => max(0, $totalUsers - $installed),
        'installationRatePercent' => $totalUsers > 0 ? (int) round(($installed / $totalUsers) * 100) : 0,
        'iosInstalls' => $byPlatform['ios']['installed'] ?? 0,
        'androidInstalls' => $byPlatform['android']['installed'] ?? 0,
        'mobileUsers' => ($byPlatform['ios']['total'] ?? 0) + ($byPlatform['android']['total'] ?? 0),
        'desktopUsers' => $byPlatform['web-desktop']['total'] ?? 0,
        'pwaOpens' => $pwaOpens,
    ]);
}

/** Powers the Dashboard's "Needs Attention" card. Every check here is a simple, documented
 * threshold over real counts — nothing here is a guess or a fabricated conclusion. Thresholds are
 * heuristic (chosen to flag genuinely lopsided ratios, not to always show something) and can be
 * tuned freely; each triggered insight carries the exact numbers behind it so the admin can judge
 * for themselves rather than trust the label. Returns an empty list when nothing looks off. */
function respondWithInsights(PDO $pdo): void
{
    $totalUsers = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE id != 'bot-system'")->fetchColumn();
    if ($totalUsers < 10) {
        jsonResponse(['insights' => [], 'note' => 'Not enough users yet for reliable insights (fewer than 10).']);
        return;
    }

    $insights = [];

    $workoutCompletedUsers = (int) $pdo->query(
        "SELECT COUNT(DISTINCT w.user_id) FROM workouts w JOIN users u ON u.id = w.user_id WHERE u.id != 'bot-system'"
    )->fetchColumn();
    $workoutCompletionRate = (int) round(($workoutCompletedUsers / $totalUsers) * 100);
    if ($workoutCompletionRate < 30) {
        $insights[] = [
            'severity' => 'warning',
            'title' => 'Low first-workout completion',
            'detail' => "Only {$workoutCompletionRate}% of users ({$workoutCompletedUsers} of {$totalUsers}) have logged a completed workout.",
        ];
    }

    $crewUsers = (int) $pdo->query(
        "SELECT COUNT(DISTINCT cm.user_id) FROM crew_members cm JOIN users u ON u.id = cm.user_id WHERE u.id != 'bot-system'"
    )->fetchColumn();
    $crewRate = (int) round(($crewUsers / $totalUsers) * 100);
    if ($crewRate < 30) {
        $insights[] = [
            'severity' => 'info',
            'title' => 'Most users have no crew',
            'detail' => "Only {$crewRate}% of users ({$crewUsers} of {$totalUsers}) have created or joined a crew.",
        ];
    }

    $installed = (int) $pdo->query(
        "SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE user_id IS NOT NULL AND JSON_EXTRACT(properties_json, '$.standalone') = true"
    )->fetchColumn();
    $installRate = (int) round(($installed / $totalUsers) * 100);
    if ($installRate < 30) {
        $insights[] = [
            'severity' => 'info',
            'title' => 'Low PWA installation rate',
            'detail' => "Only {$installRate}% of users ({$installed} of {$totalUsers}) have installed the PWA to their home screen.",
        ];
    }

    $returningUsers = (int) $pdo->query(
        "SELECT COUNT(*) FROM (
           SELECT user_id FROM analytics_events WHERE user_id IS NOT NULL
           GROUP BY user_id HAVING COUNT(DISTINCT DATE(FROM_UNIXTIME(created_at / 1000))) > 1
         ) t"
    )->fetchColumn();
    $returnRate = (int) round(($returningUsers / $totalUsers) * 100);
    if ($workoutCompletedUsers > 10 && $returnRate < 20) {
        $insights[] = [
            'severity' => 'warning',
            'title' => 'High workout activity but low return rate',
            'detail' => "{$workoutCompletedUsers} users have completed a workout, but only {$returnRate}% of all users ({$returningUsers} of {$totalUsers}) have come back on a second day.",
        ];
    }

    $rankPageViews = (int) $pdo->query("SELECT COUNT(*) FROM analytics_events WHERE screen_name LIKE '/ranks%'")->fetchColumn();
    $rankLiftTracked = (int) $pdo->query("SELECT COUNT(*) FROM analytics_events WHERE event_type = 'rank_lift_tracked'")->fetchColumn();
    if ($rankPageViews > 50 && ($rankLiftTracked / $rankPageViews) < 0.1) {
        $engagementPercent = (int) round(($rankLiftTracked / $rankPageViews) * 100);
        $insights[] = [
            'severity' => 'info',
            'title' => 'Rank page has high traffic but low engagement',
            'detail' => "The Rank screen has {$rankPageViews} views but only {$rankLiftTracked} lift-tracking actions ({$engagementPercent}% engagement).",
        ];
    }

    // Biggest onboarding drop-off — same stage order as the Product Funnel section.
    $profileCompleted = (int) $pdo->query(
        "SELECT COUNT(*) FROM users WHERE id != 'bot-system' AND gender IS NOT NULL AND weight_kg IS NOT NULL AND goal IS NOT NULL"
    )->fetchColumn();
    $stages = [
        ['label' => 'Signup', 'count' => $totalUsers],
        ['label' => 'Profile Completed', 'count' => $profileCompleted],
        ['label' => 'Crew Created/Joined', 'count' => $crewUsers],
        ['label' => 'First Workout Completed', 'count' => $workoutCompletedUsers],
    ];
    $biggestDrop = null;
    for ($i = 1; $i < count($stages); $i++) {
        $prevCount = $stages[$i - 1]['count'];
        if ($prevCount <= 0) {
            continue;
        }
        $dropPercent = (int) round((($prevCount - $stages[$i]['count']) / $prevCount) * 100);
        if ($biggestDrop === null || $dropPercent > $biggestDrop['dropPercent']) {
            $biggestDrop = ['from' => $stages[$i - 1]['label'], 'to' => $stages[$i]['label'], 'dropPercent' => $dropPercent];
        }
    }
    if ($biggestDrop !== null && $biggestDrop['dropPercent'] > 40) {
        $insights[] = [
            'severity' => 'warning',
            'title' => 'Large drop-off in onboarding',
            'detail' => "{$biggestDrop['dropPercent']}% of users drop off between \"{$biggestDrop['from']}\" and \"{$biggestDrop['to']}\".",
        ];
    }

    $nowMs = (int) round(microtime(true) * 1000);
    $thisWeekStmt = $pdo->prepare('SELECT COUNT(*) FROM analytics_events WHERE created_at >= ?');
    $thisWeekStmt->execute([$nowMs - 7 * 86400000]);
    $thisWeek = (int) $thisWeekStmt->fetchColumn();
    $lastWeekStmt = $pdo->prepare('SELECT COUNT(*) FROM analytics_events WHERE created_at >= ? AND created_at < ?');
    $lastWeekStmt->execute([$nowMs - 14 * 86400000, $nowMs - 7 * 86400000]);
    $lastWeek = (int) $lastWeekStmt->fetchColumn();
    if ($lastWeek >= 50 && $thisWeek < $lastWeek * 0.8) {
        $declinePercent = (int) round((1 - $thisWeek / $lastWeek) * 100);
        $insights[] = [
            'severity' => 'warning',
            'title' => 'Overall app usage declining',
            'detail' => "Event volume is down {$declinePercent}% this week ({$thisWeek}) vs. last week ({$lastWeek}).",
        ];
    }

    jsonResponse(['insights' => $insights, 'note' => null]);
}

/** Powers the Dashboard's "Launch Activity Heatmap" — event density by day-of-week × hour over the
 * last 30 days. MySQL's DAYOFWEEK() is 1=Sunday..7=Saturday; normalized to 0=Monday..6=Sunday here
 * for a conventional Mon-first grid. */
function respondWithActivityHeatmap(PDO $pdo): void
{
    $thirtyDaysAgoMs = (int) round(microtime(true) * 1000) - 30 * 86400000;
    $stmt = $pdo->prepare(
        'SELECT DAYOFWEEK(FROM_UNIXTIME(created_at / 1000)) AS dow, HOUR(FROM_UNIXTIME(created_at / 1000)) AS hr, COUNT(*) AS c
         FROM analytics_events WHERE created_at >= ? GROUP BY dow, hr'
    );
    $stmt->execute([$thirtyDaysAgoMs]);

    $grid = array_fill(0, 7, array_fill(0, 24, 0));
    foreach ($stmt->fetchAll() as $row) {
        $day = ((int) $row['dow'] + 5) % 7;
        $grid[$day][(int) $row['hr']] = (int) $row['c'];
    }

    jsonResponse(['grid' => $grid, 'days' => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']]);
}
