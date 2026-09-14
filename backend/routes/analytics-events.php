<?php

/** Powers the admin panel's Analytics page "Product Analytics" section and the User Detail
 * "Behavior" tab — all queried straight from our own analytics_events table (see routes/track.php,
 * schema.sql), not a third-party analytics API. */
function respondWithEventsOverview(PDO $pdo): void
{
    $fourteenDaysAgo = (int) round((microtime(true) - 14 * 86400) * 1000);
    $sevenDaysAgo = (int) round((microtime(true) - 7 * 86400) * 1000);

    $activeUsersStmt = $pdo->prepare(
        "SELECT DATE(FROM_UNIXTIME(created_at / 1000)) AS d, COUNT(DISTINCT user_id) AS c
         FROM analytics_events WHERE created_at >= ? GROUP BY d ORDER BY d ASC"
    );
    $activeUsersStmt->execute([$fourteenDaysAgo]);
    $activeUsersTrend = array_map(
        fn(array $row): array => ['date' => $row['d'], 'count' => (int) $row['c']],
        $activeUsersStmt->fetchAll()
    );

    $topScreensStmt = $pdo->prepare(
        "SELECT screen_name AS label, COUNT(*) AS c FROM analytics_events
         WHERE event_type = 'screen_view' AND screen_name IS NOT NULL AND created_at >= ?
         GROUP BY screen_name ORDER BY c DESC LIMIT 8"
    );
    $topScreensStmt->execute([$sevenDaysAgo]);
    $topScreens = array_map(
        fn(array $row): array => ['label' => $row['label'], 'count' => (int) $row['c']],
        $topScreensStmt->fetchAll()
    );

    $topActionsStmt = $pdo->prepare(
        "SELECT event_type AS label, COUNT(*) AS c FROM analytics_events
         WHERE event_type != 'screen_view' AND created_at >= ?
         GROUP BY event_type ORDER BY c DESC LIMIT 8"
    );
    $topActionsStmt->execute([$sevenDaysAgo]);
    $topActions = array_map(
        fn(array $row): array => ['label' => $row['label'], 'count' => (int) $row['c']],
        $topActionsStmt->fetchAll()
    );

    $sessionDurationStmt = $pdo->prepare(
        "SELECT AVG(duration) AS avg_duration FROM (
           SELECT (MAX(created_at) - MIN(created_at)) / 1000 AS duration
           FROM analytics_events WHERE created_at >= ? GROUP BY session_id HAVING COUNT(*) > 1
         ) sessions"
    );
    $sessionDurationStmt->execute([$sevenDaysAgo]);
    $avgSessionDurationSeconds = (int) round((float) ($sessionDurationStmt->fetchColumn() ?: 0));

    jsonResponse([
        'activeUsersTrend' => $activeUsersTrend,
        'topScreens' => $topScreens,
        'topActions' => $topActions,
        'avgSessionDurationSeconds' => $avgSessionDurationSeconds,
    ]);
}

/** Powers the Dashboard's "Live Now" section. Prefers real source-of-truth tables (workouts,
 * personal_record_history, crews, crew_members, food_logs) over analytics_events wherever one
 * exists — those are written directly by their own routes regardless of whether the client's
 * telemetry call succeeds, so they can't under-count the way an event-only metric could.
 * "workoutsStartedToday" has no dedicated table (a started-but-abandoned workout is never synced),
 * so that one number alone comes from the workout_started event. */
function respondWithLiveNow(PDO $pdo): void
{
    $nowMs = (int) round(microtime(true) * 1000);
    $fiveMinAgo = $nowMs - 5 * 60 * 1000;
    $tenMinAgo = $nowMs - 10 * 60 * 1000;
    $oneDayAgo = $nowMs - 24 * 60 * 60 * 1000;
    $todayStartMs = (int) strtotime('today midnight') * 1000;
    $todayStartDateTime = date('Y-m-d H:i:s', (int) ($todayStartMs / 1000));

    $usersOnlineStmt = $pdo->prepare('SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE created_at >= ? AND user_id IS NOT NULL');
    $usersOnlineStmt->execute([$fiveMinAgo]);
    $usersOnline = (int) $usersOnlineStmt->fetchColumn();

    $activeSessionsStmt = $pdo->prepare('SELECT COUNT(DISTINCT session_id) FROM analytics_events WHERE created_at >= ?');
    $activeSessionsStmt->execute([$fiveMinAgo]);
    $activeSessions = (int) $activeSessionsStmt->fetchColumn();

    // Sessions whose very first-ever event falls in the last 10 minutes — genuinely new arrivals,
    // not just someone resuming a session that's already been open for hours.
    $newSessionsStmt = $pdo->prepare(
        'SELECT COUNT(*) FROM (
           SELECT session_id, MIN(created_at) AS first_seen FROM analytics_events
           WHERE created_at >= ? GROUP BY session_id HAVING first_seen >= ?
         ) t'
    );
    $newSessionsStmt->execute([$oneDayAgo, $tenMinAgo]);
    $newSessionsLast10Min = (int) $newSessionsStmt->fetchColumn();

    $newUsersTodayStmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE id != 'bot-system' AND created_at >= ?");
    $newUsersTodayStmt->execute([$todayStartDateTime]);
    $newUsersToday = (int) $newUsersTodayStmt->fetchColumn();

    $sessionsTodayStmt = $pdo->prepare('SELECT COUNT(DISTINCT session_id) FROM analytics_events WHERE created_at >= ?');
    $sessionsTodayStmt->execute([$todayStartMs]);
    $sessionsToday = (int) $sessionsTodayStmt->fetchColumn();

    $workoutsStartedTodayStmt = $pdo->prepare("SELECT COUNT(*) FROM analytics_events WHERE event_type = 'workout_started' AND created_at >= ?");
    $workoutsStartedTodayStmt->execute([$todayStartMs]);
    $workoutsStartedToday = (int) $workoutsStartedTodayStmt->fetchColumn();

    $workoutsCompletedTodayStmt = $pdo->prepare('SELECT COUNT(*) FROM workouts WHERE completed_at >= ?');
    $workoutsCompletedTodayStmt->execute([$todayStartMs]);
    $workoutsCompletedToday = (int) $workoutsCompletedTodayStmt->fetchColumn();

    $prsTodayStmt = $pdo->prepare('SELECT COUNT(*) FROM personal_record_history WHERE achieved_at >= ?');
    $prsTodayStmt->execute([$todayStartMs]);
    $prsToday = (int) $prsTodayStmt->fetchColumn();

    $crewsCreatedTodayStmt = $pdo->prepare("SELECT COUNT(*) FROM crews WHERE created_at >= ? AND id NOT LIKE 'bot-crew-%'");
    $crewsCreatedTodayStmt->execute([$todayStartMs]);
    $crewsCreatedToday = (int) $crewsCreatedTodayStmt->fetchColumn();

    $crewJoinsTodayStmt = $pdo->prepare("SELECT COUNT(*) FROM crew_members WHERE joined_at >= ? AND role != 'leader'");
    $crewJoinsTodayStmt->execute([$todayStartMs]);
    $crewJoinsToday = (int) $crewJoinsTodayStmt->fetchColumn();

    $mealsLoggedTodayStmt = $pdo->prepare('SELECT COUNT(*) FROM food_logs WHERE logged_at >= ?');
    $mealsLoggedTodayStmt->execute([$todayStartMs]);
    $mealsLoggedToday = (int) $mealsLoggedTodayStmt->fetchColumn();

    jsonResponse([
        'usersOnline' => $usersOnline,
        'activeSessions' => $activeSessions,
        'newSessionsLast10Min' => $newSessionsLast10Min,
        'newUsersToday' => $newUsersToday,
        'sessionsToday' => $sessionsToday,
        'workoutsStartedToday' => $workoutsStartedToday,
        'workoutsCompletedToday' => $workoutsCompletedToday,
        'prsToday' => $prsToday,
        'crewsCreatedToday' => $crewsCreatedToday,
        'crewJoinsToday' => $crewJoinsToday,
        'mealsLoggedToday' => $mealsLoggedToday,
    ]);
}

/** Powers the Dashboard's real-time activity feed — a chronological merge of six real event
 * sources (never analytics_events itself, which could miss a beat if the client's telemetry call
 * fails; these are all written directly by their own routes). Each branch is capped at 30 and
 * pre-sorted so MySQL doesn't have to fully materialize any one source before the final merge. */
function respondWithActivityFeed(PDO $pdo): void
{
    $stmt = $pdo->query(
        "(SELECT 'user_registered' AS type, UNIX_TIMESTAMP(u.created_at) * 1000 AS ts, u.full_name AS user_name, NULL AS detail
          FROM users u WHERE u.id != 'bot-system' ORDER BY u.created_at DESC LIMIT 30)
         UNION ALL
         (SELECT 'crew_created', c.created_at, u.full_name, c.name
          FROM crews c JOIN users u ON u.id = c.created_by
          WHERE c.id NOT LIKE 'bot-crew-%' ORDER BY c.created_at DESC LIMIT 30)
         UNION ALL
         (SELECT 'crew_joined', cm.joined_at, u.full_name, cr.name
          FROM crew_members cm JOIN users u ON u.id = cm.user_id JOIN crews cr ON cr.id = cm.crew_id
          WHERE cm.role != 'leader' ORDER BY cm.joined_at DESC LIMIT 30)
         UNION ALL
         (SELECT 'workout_completed', w.completed_at, u.full_name, w.name
          FROM workouts w JOIN users u ON u.id = w.user_id ORDER BY w.completed_at DESC LIMIT 30)
         UNION ALL
         (SELECT 'pr_achieved', h.achieved_at, u.full_name, COALESCE(pr.exercise_name, h.exercise_id)
          FROM personal_record_history h
          JOIN users u ON u.id = h.user_id
          LEFT JOIN personal_records pr ON pr.user_id = h.user_id AND pr.exercise_id = h.exercise_id
          ORDER BY h.achieved_at DESC LIMIT 30)
         UNION ALL
         (SELECT 'meal_logged', f.logged_at, u.full_name, f.name
          FROM food_logs f JOIN users u ON u.id = f.user_id ORDER BY f.logged_at DESC LIMIT 30)
         ORDER BY ts DESC LIMIT 30"
    );

    $entries = array_map(function (array $row): array {
        return [
            'type' => $row['type'],
            'timestamp' => (int) $row['ts'],
            'userName' => $row['user_name'] ?: 'Someone',
            'detail' => $row['detail'],
        ];
    }, $stmt->fetchAll());

    jsonResponse(['entries' => $entries]);
}

/** Recent raw events for one user — powers the User Detail "Behavior" tab. */
function respondWithUserEventActivity(PDO $pdo, string $userId): void
{
    $stmt = $pdo->prepare(
        'SELECT event_type, screen_name, created_at FROM analytics_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 30'
    );
    $stmt->execute([$userId]);

    $events = array_map(function (array $row): array {
        return [
            'event' => $row['event_type'],
            'label' => $row['screen_name'],
            'timestamp' => date('c', (int) ($row['created_at'] / 1000)),
        ];
    }, $stmt->fetchAll());

    jsonResponse(['events' => $events]);
}

/** Powers the admin panel's Event Log page — every single row in analytics_events, raw, with
 * filters. Unlike the Dashboard's Activity Feed (a curated, human-readable merge of six real
 * tables) or the User Detail Behavior tab (one user, capped at 30), this is the literal, complete
 * telemetry stream: every event_type, every screen_name, every properties_json payload. */
function respondWithEventLog(PDO $pdo): void
{
    [$page, $limit, $offset] = paginationParams();
    $userId = trim((string) ($_GET['userId'] ?? ''));
    $eventType = trim((string) ($_GET['eventType'] ?? ''));
    $search = trim((string) ($_GET['search'] ?? ''));

    $where = '1=1';
    $params = [];
    if ($userId !== '') {
        $where .= ' AND ae.user_id = ?';
        $params[] = $userId;
    }
    if ($eventType !== '') {
        $where .= ' AND ae.event_type = ?';
        $params[] = $eventType;
    }
    if ($search !== '') {
        $where .= ' AND (ae.event_type LIKE ? OR ae.screen_name LIKE ?)';
        $like = "%$search%";
        $params[] = $like;
        $params[] = $like;
    }

    $totalStmt = $pdo->prepare("SELECT COUNT(*) FROM analytics_events ae WHERE $where");
    $totalStmt->execute($params);
    $total = (int) $totalStmt->fetchColumn();

    $stmt = $pdo->prepare(
        "SELECT ae.id, ae.user_id, u.full_name, u.email, ae.session_id, ae.event_type, ae.screen_name, ae.properties_json, ae.created_at
         FROM analytics_events ae
         LEFT JOIN users u ON u.id = ae.user_id
         WHERE $where
         ORDER BY ae.created_at DESC LIMIT $limit OFFSET $offset"
    );
    $stmt->execute($params);

    $entries = array_map(function (array $row): array {
        return [
            'id' => (int) $row['id'],
            'userId' => $row['user_id'],
            'userName' => $row['full_name'] ?: $row['email'],
            'sessionId' => $row['session_id'],
            'eventType' => $row['event_type'],
            'screenName' => $row['screen_name'],
            'properties' => $row['properties_json'] !== null ? json_decode((string) $row['properties_json'], true) : null,
            'timestamp' => (int) $row['created_at'],
        ];
    }, $stmt->fetchAll());

    jsonResponse(['entries' => $entries, 'total' => $total, 'page' => $page, 'limit' => $limit]);
}

/** Distinct event types seen so far — populates the Event Log page's event-type filter dropdown. */
function respondWithEventTypes(PDO $pdo): void
{
    $stmt = $pdo->query('SELECT DISTINCT event_type FROM analytics_events ORDER BY event_type ASC');
    jsonResponse(['eventTypes' => array_column($stmt->fetchAll(), 'event_type')]);
}
