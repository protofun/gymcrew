<?php

/**
 * The GymCrew admin panel's API — entirely separate auth from the rest of this backend (see
 * admin-auth.php): a self-issued JWT from a real login (admin_users table), not a Clerk session.
 * Every route below except POST /admin/login requires a valid admin Bearer token.
 *
 * Every query here deliberately excludes the permanent illustrative bot account/crews (see
 * db/schema.sql's `bot-system` user and `bot-crew-*` crews) — they're fake data that exists only
 * to give Crew Wars/leaderboards something to render, never real users an admin needs to manage.
 *
 * Routes:
 *   POST   /admin/login                    -> { email, password } -> { token, admin }
 *   GET    /admin/me                       -> the logged-in admin
 *   GET    /admin/stats                    -> dashboard aggregates
 *   GET    /admin/users?search=&page=      -> paginated user list
 *   GET    /admin/users/:id                -> one user's detail
 *   PUT    /admin/users/:id                -> { banned: true|false }
 *   DELETE /admin/users/:id                -> permanently deletes the account and all its data
 *   GET    /admin/crews?search=&page=      -> paginated crew list
 *   GET    /admin/crews/:id                -> one crew's detail + members
 *   PUT    /admin/crews/:id                -> { disabled: true|false }
 *   DELETE /admin/crews/:id                -> permanently deletes the crew
 *   GET    /admin/reports?status=          -> content reports (see routes/reports.php)
 *   PUT    /admin/reports/:id              -> { status: 'resolved' }
 *   GET    /admin/support?status=          -> support tickets (see routes/support.php)
 *   GET    /admin/support/:id              -> one ticket + its full reply thread
 *   PUT    /admin/support/:id              -> { status: 'resolved' }
 *   POST   /admin/support/:id/reply        -> { body } -> admin reply, reopens a resolved ticket
 *   GET    /admin/notes?targetType=&targetId= -> internal notes for a user/crew/support ticket
 *   POST   /admin/notes                    -> { targetType, targetId, note }
 *   DELETE /admin/notes/:id
 *   GET    /admin/tasks                    -> the admin task board (all tasks)
 *   POST   /admin/tasks                    -> { title, description?, status?, dueDate?, assignedAdminId? }
 *   PUT    /admin/tasks/:id                -> partial update (title/description/status/dueDate/assignedAdminId)
 *   DELETE /admin/tasks/:id
 *   GET    /admin/roadmap                  -> all roadmap items (admin view, any status)
 *   POST   /admin/roadmap                  -> { title, description?, status? }
 *   PUT    /admin/roadmap/:id              -> partial update
 *   DELETE /admin/roadmap/:id
 *   GET    /admin/analytics                -> richer chart data for the Dashboard/Reports pages
 *   GET    /admin/admins                   -> other admin accounts
 *   POST   /admin/admins                   -> { email, password } -> create an admin
 *   DELETE /admin/admins/:id               -> remove an admin (not yourself, not the last one)
 *   GET    /admin/announcements            -> recent app-wide announcements
 *   POST   /admin/announcements            -> { message } -> create + activate one
 *   PUT    /admin/announcements/:id        -> { active: false } -> deactivate
 *   POST   /admin/email/broadcast          -> { subject, body, bodyHtml?, audience: 'all'|'single', userId? }
 */
function handleAdmin(PDO $pdo, string $method, ?array $body, array $segments): void
{
    $secret = env('ADMIN_JWT_SECRET', '');
    if ($secret === '') {
        errorResponse('Admin panel is not configured (ADMIN_JWT_SECRET missing in .env)', 503);
        return;
    }

    $sub = $segments[1] ?? null;
    $id = $segments[2] ?? null;
    $data = $body ?? [];

    if ($sub === 'login' && $method === 'POST') {
        adminLogin($pdo, $secret, $data);
        return;
    }

    $admin = requireAdminAuth($secret);

    if ($sub === 'me' && $method === 'GET') {
        $totpStmt = $pdo->prepare('SELECT totp_secret FROM admin_users WHERE id = ?');
        $totpStmt->execute([$admin['sub']]);
        $totpRow = $totpStmt->fetch();
        jsonResponse(['id' => $admin['sub'], 'email' => $admin['email'], 'totpEnabled' => $totpRow && $totpRow['totp_secret'] !== null]);
        return;
    }

    if ($sub === 'stats' && $method === 'GET') {
        respondWithAdminStats($pdo);
        return;
    }

    if ($sub === 'live-now' && $method === 'GET') {
        respondWithLiveNow($pdo);
        return;
    }

    if ($sub === 'activity-feed' && $method === 'GET') {
        respondWithActivityFeed($pdo);
        return;
    }

    if ($sub === 'launch-performance' && $method === 'GET') {
        respondWithLaunchPerformance($pdo);
        return;
    }

    if ($sub === 'product-funnel' && $method === 'GET') {
        respondWithProductFunnel($pdo);
        return;
    }

    if ($sub === 'workout-analytics' && $method === 'GET') {
        respondWithWorkoutAnalytics($pdo);
        return;
    }

    if ($sub === 'crew-analytics' && $method === 'GET') {
        respondWithCrewAnalytics($pdo);
        return;
    }

    if ($sub === 'ranking-analytics' && $method === 'GET') {
        respondWithRankingAnalytics($pdo);
        return;
    }

    if ($sub === 'retention' && $method === 'GET') {
        respondWithRetention($pdo);
        return;
    }

    if ($sub === 'pwa-adoption' && $method === 'GET') {
        respondWithPwaAdoption($pdo);
        return;
    }

    if ($sub === 'insights' && $method === 'GET') {
        respondWithInsights($pdo);
        return;
    }

    if ($sub === 'activity-heatmap' && $method === 'GET') {
        respondWithActivityHeatmap($pdo);
        return;
    }

    // Named "journal", not "event-log" — ad blockers commonly block any URL path containing
    // "event" as a generic analytics/tracking heuristic, which silently killed this exact route
    // (showed as a blocked request with zero response, not a real HTTP error).
    if ($sub === 'journal') {
        if ($id === 'types' && $method === 'GET') { respondWithEventTypes($pdo); return; }
        if ($id === null && $method === 'GET') { respondWithEventLog($pdo); return; }
    }

    if ($sub === 'users') {
        $userAction = $segments[3] ?? null;
        if ($id === null && $method === 'GET') { respondWithAdminUsers($pdo); return; }
        if ($id !== null && $userAction === 'records' && $method === 'GET') { respondWithUserRecords($pdo, $id); return; }
        if ($id !== null && $userAction === 'records' && $method === 'PUT') { upsertUserRecord($pdo, (string) $admin['sub'], (string) $admin['email'], $id, $data); return; }
        if ($id !== null && $userAction === 'workouts' && $method === 'GET') { respondWithUserWorkouts($pdo, $id); return; }
        if ($id !== null && $userAction === 'crew' && $method === 'PUT') { moveUserCrew($pdo, (string) $admin['sub'], (string) $admin['email'], $id, $data); return; }
        if ($id !== null && $userAction === 'activity' && $method === 'GET') { respondWithUserEventActivity($pdo, $id); return; }
        if ($id !== null && $method === 'GET') { respondWithAdminUserDetail($pdo, $id); return; }
        if ($id !== null && $method === 'PUT') { updateAdminUser($pdo, (string) $admin['sub'], (string) $admin['email'], $id, $data); return; }
        if ($id !== null && $method === 'DELETE') { deleteAdminUser($pdo, (string) $admin['sub'], (string) $admin['email'], $id); return; }
    }

    if ($sub === 'crews') {
        if ($id === null && $method === 'GET') { respondWithAdminCrews($pdo); return; }
        if ($id !== null && $method === 'GET') { respondWithAdminCrewDetail($pdo, $id); return; }
        if ($id !== null && $method === 'PUT') { updateAdminCrew($pdo, (string) $admin['sub'], (string) $admin['email'], $id, $data); return; }
        if ($id !== null && $method === 'DELETE') { deleteAdminCrew($pdo, (string) $admin['sub'], (string) $admin['email'], $id); return; }
    }

    if ($sub === 'reports') {
        if ($id === null && $method === 'GET') { respondWithAdminReports($pdo); return; }
        if ($id !== null && $method === 'PUT') { updateAdminReport($pdo, (string) $admin['sub'], (string) $admin['email'], $id, $data); return; }
    }

    if ($sub === 'support') {
        if ($id === null && $method === 'GET') { respondWithAdminSupport($pdo); return; }
        if ($id !== null && ($segments[3] ?? null) === 'reply' && $method === 'POST') { replyToSupportTicketAdmin($pdo, (string) $admin['sub'], $id, $data); return; }
        if ($id !== null && $method === 'GET') { respondWithAdminSupportDetail($pdo, $id); return; }
        if ($id !== null && $method === 'PUT') { updateAdminSupport($pdo, (string) $admin['sub'], (string) $admin['email'], $id, $data); return; }
    }

    if ($sub === 'notes') {
        if ($id === null && $method === 'GET') { respondWithAdminNotes($pdo); return; }
        if ($id === null && $method === 'POST') { createAdminNote($pdo, (string) $admin['sub'], $data); return; }
        if ($id !== null && $method === 'DELETE') { deleteAdminNote($pdo, $id); return; }
    }

    if ($sub === 'tasks') {
        if ($id === null && $method === 'GET') { respondWithAdminTasks($pdo); return; }
        if ($id === null && $method === 'POST') { createAdminTask($pdo, (string) $admin['sub'], $data); return; }
        if ($id !== null && $method === 'PUT') { updateAdminTask($pdo, $id, $data); return; }
        if ($id !== null && $method === 'DELETE') { deleteAdminTask($pdo, $id); return; }
    }

    if ($sub === 'roadmap') {
        if ($id === null && $method === 'GET') { respondWithAdminRoadmap($pdo); return; }
        if ($id === null && $method === 'POST') { createAdminRoadmapItem($pdo, (string) $admin['sub'], $data); return; }
        if ($id !== null && $method === 'PUT') { updateAdminRoadmapItem($pdo, $id, $data); return; }
        if ($id !== null && $method === 'DELETE') { deleteAdminRoadmapItem($pdo, $id); return; }
    }

    if ($sub === 'analytics') {
        if ($id === null && $method === 'GET') { respondWithAdminAnalytics($pdo); return; }
        if ($id === 'events' && $method === 'GET') { respondWithEventsOverview($pdo); return; }
    }

    if ($sub === 'audit-log' && $method === 'GET') {
        respondWithAuditLog($pdo);
        return;
    }

    if ($sub === 'settings') {
        if ($method === 'GET') { respondWithSettings($pdo); return; }
        if ($method === 'PUT') { updateSetting($pdo, $data); return; }
    }

    if ($sub === '2fa') {
        $action = $segments[2] ?? null;
        if ($action === 'enroll' && $method === 'POST') { enrollTotp($pdo, (string) $admin['sub'], (string) $admin['email']); return; }
        if ($action === 'confirm' && $method === 'POST') { confirmTotp($pdo, (string) $admin['sub'], $data); return; }
        if ($action === 'disable' && $method === 'POST') { disableTotp($pdo, (string) $admin['sub']); return; }
    }

    if ($sub === 'records') {
        if ($id === 'top' && $method === 'GET') { respondWithTopRecords($pdo); return; }
        if ($id === 'delete' && $method === 'POST') { deleteRecord($pdo, $data); return; }
    }

    if ($sub === 'crew-wars') {
        if ($id === 'active' && $method === 'GET') { respondWithActiveCrewWars($pdo); return; }
        if ($id !== null && ($segments[3] ?? null) === 'end' && $method === 'POST') { forceEndCrewWar($pdo, $id); return; }
    }

    if ($sub === 'push' && $id === 'broadcast' && $method === 'POST') {
        sendAdminPushBroadcast($pdo, $data);
        return;
    }

    if ($sub === 'onboarding-funnel' && $method === 'GET') {
        respondWithOnboardingFunnel($pdo);
        return;
    }

    if ($sub === 'export') {
        if ($id === 'users' && $method === 'GET') { respondWithExportUsers($pdo); return; }
        if ($id === 'crews' && $method === 'GET') { respondWithExportCrews($pdo); return; }
        if ($id === 'workouts' && $method === 'GET') { respondWithExportWorkoutSummary($pdo); return; }
    }

    if ($sub === 'changelog') {
        if ($id === null && $method === 'GET') { respondWithChangelog($pdo); return; }
        if ($id === null && $method === 'POST') { createChangelogEntry($pdo, (string) $admin['sub'], $data); return; }
        if ($id !== null && $method === 'DELETE') { deleteChangelogEntry($pdo, $id); return; }
    }

    if ($sub === 'faq') {
        if ($id === null && $method === 'GET') { respondWithAdminFaq($pdo); return; }
        if ($id === null && $method === 'POST') { createFaqItem($pdo, $data); return; }
        if ($id !== null && $method === 'PUT') { updateFaqItem($pdo, $id, $data); return; }
        if ($id !== null && $method === 'DELETE') { deleteFaqItem($pdo, $id); return; }
    }

    if ($sub === 'feedback') {
        if ($id === null && $method === 'GET') { respondWithAdminFeedback($pdo); return; }
        if ($id !== null && $method === 'PUT') { updateAdminFeedback($pdo, $id, $data); return; }
        if ($id !== null && $method === 'DELETE') { deleteAdminFeedback($pdo, $id); return; }
    }

    if ($sub === 'status') {
        if ($id === null && $method === 'GET') { respondWithStatusHistory($pdo); return; }
        if ($id === null && $method === 'POST') { createStatusUpdate($pdo, (string) $admin['sub'], $data); return; }
    }

    if ($sub === 'admins') {
        if ($id === null && $method === 'GET') { respondWithAdmins($pdo); return; }
        if ($id === null && $method === 'POST') { createAdmin($pdo, (string) $admin['sub'], (string) $admin['email'], $data); return; }
        if ($id !== null && $method === 'DELETE') { deleteAdmin($pdo, (string) $admin['sub'], (string) $admin['email'], $id); return; }
    }

    if ($sub === 'announcements') {
        if ($id === null && $method === 'GET') { respondWithAnnouncements($pdo); return; }
        if ($id === null && $method === 'POST') { createAnnouncement($pdo, (string) $admin['sub'], (string) $admin['email'], $data); return; }
        if ($id !== null && $method === 'PUT') { updateAnnouncement($pdo, $id, $data); return; }
    }

    if ($sub === 'email' && ($segments[2] ?? null) === 'broadcast' && $method === 'POST') {
        sendBroadcastEmail($pdo, $data);
        return;
    }

    errorResponse('Not found', 404);
}

function adminLogin(PDO $pdo, string $secret, array $data): void
{
    $email = strtolower(trim((string) ($data['email'] ?? '')));
    $password = (string) ($data['password'] ?? '');
    if ($email === '' || $password === '') {
        errorResponse('Email and password are required');
        return;
    }

    $stmt = $pdo->prepare('SELECT id, email, password_hash, totp_secret FROM admin_users WHERE email = ?');
    $stmt->execute([$email]);
    $adminRow = $stmt->fetch();

    if (!$adminRow || !password_verify($password, $adminRow['password_hash'])) {
        errorResponse('Incorrect email or password', 401);
        return;
    }

    if ($adminRow['totp_secret'] !== null) {
        $code = trim((string) ($data['code'] ?? ''));
        if ($code === '') {
            // Password was correct, but this account has 2FA — the client shows a code-entry step
            // and calls /admin/login again with the same email/password plus `code`, rather than a
            // separate endpoint, so a wrong password still never reveals whether 2FA is even on.
            jsonResponse(['requiresTotp' => true]);
            return;
        }
        if (!verifyTotpCode($adminRow['totp_secret'], $code)) {
            errorResponse('Incorrect authenticator code', 401);
            return;
        }
    }

    logAdminAction($pdo, $adminRow['id'], $adminRow['email'], 'login');

    jsonResponse([
        'token' => mintAdminJwt($adminRow['id'], $adminRow['email'], $secret),
        'admin' => ['id' => $adminRow['id'], 'email' => $adminRow['email']],
    ]);
}

function respondWithAdminStats(PDO $pdo): void
{
    $totalUsers = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE id != 'bot-system'")->fetchColumn();
    $newUsers7d = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE id != 'bot-system' AND created_at >= (NOW() - INTERVAL 7 DAY)")->fetchColumn();
    $bannedUsers = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE banned_at IS NOT NULL")->fetchColumn();
    $totalCrews = (int) $pdo->query("SELECT COUNT(*) FROM crews WHERE id NOT LIKE 'bot-crew-%'")->fetchColumn();
    $totalWorkouts = (int) $pdo->query('SELECT COUNT(*) FROM workouts')->fetchColumn();
    $now = (int) round(microtime(true) * 1000);
    $sevenDaysAgo = $now - 7 * 24 * 60 * 60 * 1000;
    $workouts7dStmt = $pdo->prepare('SELECT COUNT(*) FROM workouts WHERE completed_at >= ?');
    $workouts7dStmt->execute([$sevenDaysAgo]);
    $workouts7d = (int) $workouts7dStmt->fetchColumn();
    $openReports = (int) $pdo->query("SELECT COUNT(*) FROM content_reports WHERE status = 'open'")->fetchColumn();
    $openSupport = (int) $pdo->query("SELECT COUNT(*) FROM support_messages WHERE status = 'open'")->fetchColumn();

    // Signups per day for the last 30 days — a real growth chart, not a placeholder.
    $signupsStmt = $pdo->query(
        "SELECT DATE(created_at) AS day, COUNT(*) AS count
         FROM users
         WHERE id != 'bot-system' AND created_at >= (NOW() - INTERVAL 30 DAY)
         GROUP BY DATE(created_at)
         ORDER BY day ASC"
    );
    $signupsByDay = array_map(fn(array $row) => ['date' => $row['day'], 'count' => (int) $row['count']], $signupsStmt->fetchAll());

    jsonResponse([
        'totalUsers' => $totalUsers,
        'newUsers7d' => $newUsers7d,
        'bannedUsers' => $bannedUsers,
        'totalCrews' => $totalCrews,
        'totalWorkouts' => $totalWorkouts,
        'workouts7d' => $workouts7d,
        'openReports' => $openReports,
        'openSupport' => $openSupport,
        'signupsByDay' => $signupsByDay,
    ]);
}

function paginationParams(): array
{
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $limit = min(100, max(1, (int) ($_GET['limit'] ?? 25)));
    return [$page, $limit, ($page - 1) * $limit];
}

/** The Users list — extended (see admin panel's "Improve the Users Page" section) with per-user
 * activity computed via correlated subqueries: workout/PR/meal counts, session count, last active,
 * crew, division, and whether this user has ever been seen running the installed PWA (derived from
 * analytics_events' "standalone" property — see src/lib/analytics.ts). Fine at early-access scale;
 * revisit with a nightly rollup table if the user base grows enough to make this slow. */
function respondWithAdminUsers(PDO $pdo): void
{
    [$page, $limit, $offset] = paginationParams();
    $search = trim((string) ($_GET['search'] ?? ''));
    $filter = trim((string) ($_GET['filter'] ?? ''));

    $where = "u.id != 'bot-system'";
    $params = [];
    if ($search !== '') {
        $where .= ' AND (u.email LIKE ? OR u.full_name LIKE ? OR u.username LIKE ?)';
        $like = "%$search%";
        $params = [$like, $like, $like];
    }

    $baseSelect =
        "SELECT u.id, u.email, u.full_name, u.username, u.gym_name, u.created_at, u.banned_at, u.founding_athlete_id,
         (SELECT COUNT(*) FROM workouts w WHERE w.user_id = u.id) AS workout_count,
         (SELECT COUNT(*) FROM personal_records pr WHERE pr.user_id = u.id) AS pr_count,
         (SELECT COUNT(*) FROM food_logs f WHERE f.user_id = u.id) AS meal_count,
         (SELECT COUNT(DISTINCT ae.session_id) FROM analytics_events ae WHERE ae.user_id = u.id) AS session_count,
         (SELECT MAX(ae2.created_at) FROM analytics_events ae2 WHERE ae2.user_id = u.id) AS last_active_ms,
         (SELECT JSON_UNQUOTE(JSON_EXTRACT(ae3.properties_json, '$.platform')) FROM analytics_events ae3 WHERE ae3.user_id = u.id ORDER BY ae3.created_at DESC LIMIT 1) AS device_platform,
         EXISTS (SELECT 1 FROM analytics_events ae4 WHERE ae4.user_id = u.id AND JSON_EXTRACT(ae4.properties_json, '$.standalone') = true) AS pwa_installed,
         cr.name AS crew_name, pl.division AS division
         FROM users u
         LEFT JOIN crew_members cm ON cm.user_id = u.id
         LEFT JOIN crews cr ON cr.id = cm.crew_id
         LEFT JOIN profile_level pl ON pl.user_id = u.id
         WHERE $where";

    $todayStartMs = (int) strtotime('today midnight') * 1000;
    $sevenDaysAgo = date('Y-m-d H:i:s', strtotime('-7 days'));

    $filterClauses = [
        'active_today' => "last_active_ms >= $todayStartMs",
        'new' => "created_at >= '$sevenDaysAgo'",
        'no_workout' => 'workout_count = 0',
        'no_crew' => 'crew_name IS NULL',
        'no_return' => 'session_count <= 1',
        'pwa_installed' => 'pwa_installed = 1',
        'pwa_not_installed' => 'pwa_installed = 0',
    ];
    $filterClause = $filterClauses[$filter] ?? '';
    $filterSql = $filterClause !== '' ? "WHERE $filterClause" : '';

    // One execution, not two: the old version ran this same subquery-heavy SELECT twice (once for
    // COUNT(*), once for the page), doubling the DB cost for no reason at early-access scale —
    // fetch every matching row once and paginate in PHP instead. Revisit with real SQL-level
    // pagination if the user base ever grows enough to make holding all rows in memory a problem.
    try {
        $rowsStmt = $pdo->prepare("SELECT * FROM ($baseSelect) t $filterSql ORDER BY created_at DESC");
        $rowsStmt->execute($params);
        $allRows = $rowsStmt->fetchAll();
    } catch (\Throwable $e) {
        errorResponse('Users query failed: ' . $e->getMessage(), 500);
        return;
    }

    $total = count($allRows);
    $pagedRows = array_slice($allRows, $offset, $limit);

    $users = array_map(function (array $row): array {
        return [
            'id' => $row['id'],
            'email' => $row['email'],
            'fullName' => $row['full_name'],
            'username' => $row['username'],
            'gymName' => $row['gym_name'],
            'createdAt' => $row['created_at'],
            'banned' => $row['banned_at'] !== null,
            'isFoundingAthlete' => $row['founding_athlete_id'] !== null,
            'workoutCount' => (int) $row['workout_count'],
            'prCount' => (int) $row['pr_count'],
            'mealCount' => (int) $row['meal_count'],
            'sessionCount' => (int) $row['session_count'],
            'lastActiveAt' => $row['last_active_ms'] !== null ? (int) $row['last_active_ms'] : null,
            'devicePlatform' => $row['device_platform'],
            'pwaInstalled' => (bool) $row['pwa_installed'],
            'crewName' => $row['crew_name'],
            'division' => $row['division'],
        ];
    }, $pagedRows);

    jsonResponse(['users' => $users, 'total' => $total, 'page' => $page, 'limit' => $limit]);
}

function respondWithAdminUserDetail(PDO $pdo, string $id): void
{
    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    if (!$user) {
        errorResponse('User not found', 404);
        return;
    }

    $workoutCountStmt = $pdo->prepare('SELECT COUNT(*) FROM workouts WHERE user_id = ?');
    $workoutCountStmt->execute([$id]);

    $crewStmt = $pdo->prepare(
        'SELECT c.id, c.name, cm.role FROM crew_members cm JOIN crews c ON c.id = cm.crew_id WHERE cm.user_id = ?'
    );
    $crewStmt->execute([$id]);
    $crew = $crewStmt->fetch();

    jsonResponse([
        'id' => $user['id'],
        'email' => $user['email'],
        'fullName' => $user['full_name'],
        'username' => $user['username'],
        'avatarUrl' => $user['avatar_url'],
        'gender' => $user['gender'],
        'heightCm' => $user['height_cm'] !== null ? (int) $user['height_cm'] : null,
        'weightKg' => $user['weight_kg'] !== null ? (float) $user['weight_kg'] : null,
        'age' => $user['age'] !== null ? (int) $user['age'] : null,
        'gymName' => $user['gym_name'],
        'goal' => $user['goal'],
        'experienceLevel' => $user['experience_level'],
        'createdAt' => $user['created_at'],
        'banned' => $user['banned_at'] !== null,
        'isFoundingAthlete' => $user['founding_athlete_id'] !== null,
        'hasPushToken' => $user['expo_push_token'] !== null,
        'workoutCount' => (int) $workoutCountStmt->fetchColumn(),
        'crew' => $crew ? ['id' => $crew['id'], 'name' => $crew['name'], 'role' => $crew['role']] : null,
    ]);
}

function updateAdminUser(PDO $pdo, string $adminId, string $adminEmail, string $id, array $data): void
{
    if (!array_key_exists('banned', $data)) {
        errorResponse('Nothing to update');
        return;
    }
    $bannedAt = $data['banned'] ? date('Y-m-d H:i:s') : null;
    $pdo->prepare('UPDATE users SET banned_at = ? WHERE id = ?')->execute([$bannedAt, $id]);
    logAdminAction($pdo, $adminId, $adminEmail, $data['banned'] ? 'ban_user' : 'unban_user', 'user', $id);
    jsonResponse(['ok' => true]);
}

function deleteAdminUser(PDO $pdo, string $adminId, string $adminEmail, string $id): void
{
    logAdminAction($pdo, $adminId, $adminEmail, 'delete_user', 'user', $id);
    // Same cascade as routes/account.php's self-delete (every other table's FK points back to
    // `users` with ON DELETE CASCADE) — see db/schema.sql.
    $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
    jsonResponse(['ok' => true]);
}

function respondWithAdminCrews(PDO $pdo): void
{
    [$page, $limit, $offset] = paginationParams();
    $search = trim((string) ($_GET['search'] ?? ''));

    $where = "c.id NOT LIKE 'bot-crew-%'";
    $params = [];
    if ($search !== '') {
        $where .= ' AND c.name LIKE ?';
        $params[] = "%$search%";
    }

    $totalStmt = $pdo->prepare("SELECT COUNT(*) FROM crews c WHERE $where");
    $totalStmt->execute($params);
    $total = (int) $totalStmt->fetchColumn();

    $stmt = $pdo->prepare(
        "SELECT c.id, c.name, c.tagline, c.icon, c.privacy, c.division, c.xp, c.created_at, c.disabled_at,
                (SELECT COUNT(*) FROM crew_members WHERE crew_id = c.id) AS member_count
         FROM crews c WHERE $where ORDER BY c.created_at DESC LIMIT $limit OFFSET $offset"
    );
    $stmt->execute($params);

    $crews = array_map(function (array $row): array {
        return [
            'id' => $row['id'],
            'name' => $row['name'],
            'tagline' => $row['tagline'],
            'icon' => $row['icon'],
            'privacy' => $row['privacy'],
            'division' => $row['division'],
            'xp' => (int) $row['xp'],
            'memberCount' => (int) $row['member_count'],
            'createdAt' => $row['created_at'],
            'disabled' => $row['disabled_at'] !== null,
        ];
    }, $stmt->fetchAll());

    jsonResponse(['crews' => $crews, 'total' => $total, 'page' => $page, 'limit' => $limit]);
}

function respondWithAdminCrewDetail(PDO $pdo, string $id): void
{
    $stmt = $pdo->prepare('SELECT * FROM crews WHERE id = ?');
    $stmt->execute([$id]);
    $crew = $stmt->fetch();
    if (!$crew) {
        errorResponse('Crew not found', 404);
        return;
    }

    $membersStmt = $pdo->prepare(
        'SELECT u.id, u.full_name, u.username, cm.role FROM crew_members cm JOIN users u ON u.id = cm.user_id WHERE cm.crew_id = ? ORDER BY cm.joined_at ASC'
    );
    $membersStmt->execute([$id]);

    jsonResponse([
        'id' => $crew['id'],
        'name' => $crew['name'],
        'tagline' => $crew['tagline'],
        'icon' => $crew['icon'],
        'trainingType' => $crew['training_type'],
        'privacy' => $crew['privacy'],
        'maxMembers' => (int) $crew['max_members'],
        'inviteCode' => $crew['invite_code'],
        'xp' => (int) $crew['xp'],
        'division' => $crew['division'],
        'createdAt' => $crew['created_at'],
        'disabled' => $crew['disabled_at'] !== null,
        'members' => array_map(fn(array $row) => ['id' => $row['id'], 'fullName' => $row['full_name'], 'username' => $row['username'], 'role' => $row['role']], $membersStmt->fetchAll()),
    ]);
}

function updateAdminCrew(PDO $pdo, string $adminId, string $adminEmail, string $id, array $data): void
{
    if (!array_key_exists('disabled', $data)) {
        errorResponse('Nothing to update');
        return;
    }
    $disabledAt = $data['disabled'] ? date('Y-m-d H:i:s') : null;
    $pdo->prepare('UPDATE crews SET disabled_at = ? WHERE id = ?')->execute([$disabledAt, $id]);
    logAdminAction($pdo, $adminId, $adminEmail, $data['disabled'] ? 'disable_crew' : 'enable_crew', 'crew', $id);
    jsonResponse(['ok' => true]);
}

function deleteAdminCrew(PDO $pdo, string $adminId, string $adminEmail, string $id): void
{
    logAdminAction($pdo, $adminId, $adminEmail, 'delete_crew', 'crew', $id);
    $pdo->prepare('DELETE FROM crews WHERE id = ?')->execute([$id]);
    jsonResponse(['ok' => true]);
}

function respondWithAdminReports(PDO $pdo): void
{
    $status = $_GET['status'] ?? null;
    $where = '1=1';
    $params = [];
    if (in_array($status, ['open', 'resolved'], true)) {
        $where = 'r.status = ?';
        $params[] = $status;
    }

    $stmt = $pdo->prepare(
        "SELECT r.id, r.target_type, r.target_id, r.reason, r.details, r.status, r.created_at, u.full_name AS reporter_name
         FROM content_reports r
         LEFT JOIN users u ON u.id = r.reporter_user_id
         WHERE $where
         ORDER BY r.created_at DESC
         LIMIT 200"
    );
    $stmt->execute($params);

    $reports = array_map(function (array $row): array {
        return [
            'id' => (int) $row['id'],
            'targetType' => $row['target_type'],
            'targetId' => $row['target_id'],
            'reason' => $row['reason'],
            'details' => $row['details'],
            'status' => $row['status'],
            'reporterName' => $row['reporter_name'] ?: 'Unknown',
            'createdAt' => (int) $row['created_at'],
        ];
    }, $stmt->fetchAll());

    jsonResponse($reports);
}

function updateAdminReport(PDO $pdo, string $adminId, string $adminEmail, string $id, array $data): void
{
    $status = $data['status'] ?? null;
    if (!in_array($status, ['open', 'resolved'], true)) {
        errorResponse('A valid status is required');
        return;
    }
    $pdo->prepare('UPDATE content_reports SET status = ? WHERE id = ?')->execute([$status, $id]);
    logAdminAction($pdo, $adminId, $adminEmail, 'update_report', 'report', $id, "status=$status");
    jsonResponse(['ok' => true]);
}

function respondWithAdminSupport(PDO $pdo): void
{
    $status = $_GET['status'] ?? null;
    $where = '1=1';
    $params = [];
    if (in_array($status, ['open', 'resolved'], true)) {
        $where = 's.status = ?';
        $params[] = $status;
    }

    $stmt = $pdo->prepare(
        "SELECT s.id, s.message, s.contact_email, s.status, s.created_at, u.full_name, u.email AS user_email
         FROM support_messages s
         LEFT JOIN users u ON u.id = s.user_id
         WHERE $where
         ORDER BY s.created_at DESC
         LIMIT 200"
    );
    $stmt->execute($params);

    $messages = array_map(function (array $row): array {
        return [
            'id' => (int) $row['id'],
            'message' => $row['message'],
            'contactEmail' => $row['contact_email'] ?: $row['user_email'],
            'userName' => $row['full_name'] ?: 'Unknown',
            'status' => $row['status'],
            'createdAt' => (int) $row['created_at'],
        ];
    }, $stmt->fetchAll());

    jsonResponse($messages);
}

function updateAdminSupport(PDO $pdo, string $adminId, string $adminEmail, string $id, array $data): void
{
    $status = $data['status'] ?? null;
    if (!in_array($status, ['open', 'resolved'], true)) {
        errorResponse('A valid status is required');
        return;
    }
    $pdo->prepare('UPDATE support_messages SET status = ? WHERE id = ?')->execute([$status, $id]);
    logAdminAction($pdo, $adminId, $adminEmail, 'update_support', 'support', $id, "status=$status");
    jsonResponse(['ok' => true]);
}

/** The full two-way conversation for one ticket — see routes/support.php's supportTicketJson/
 * supportRepliesJson (shared helpers, same JSON shape the app itself reads). */
function respondWithAdminSupportDetail(PDO $pdo, string $id): void
{
    $stmt = $pdo->prepare(
        'SELECT s.*, u.full_name, u.email AS user_email FROM support_messages s LEFT JOIN users u ON u.id = s.user_id WHERE s.id = ?'
    );
    $stmt->execute([$id]);
    $ticket = $stmt->fetch();
    if (!$ticket) {
        errorResponse('Ticket not found', 404);
        return;
    }

    jsonResponse([
        'ticket' => [
            'id' => (int) $ticket['id'],
            'message' => $ticket['message'],
            'status' => $ticket['status'],
            'userName' => $ticket['full_name'] ?: 'Unknown',
            'contactEmail' => $ticket['contact_email'] ?: $ticket['user_email'],
            'userId' => $ticket['user_id'],
            'createdAt' => (int) $ticket['created_at'],
        ],
        'replies' => supportRepliesJson($pdo, (int) $ticket['id']),
    ]);
}

function replyToSupportTicketAdmin(PDO $pdo, string $adminId, string $id, array $data): void
{
    $stmt = $pdo->prepare('SELECT id FROM support_messages WHERE id = ?');
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        errorResponse('Ticket not found', 404);
        return;
    }

    $replyBody = trim((string) ($data['body'] ?? ''));
    if ($replyBody === '') {
        errorResponse('body is required');
        return;
    }
    $replyBody = mb_substr($replyBody, 0, 2000);

    $pdo->prepare(
        'INSERT INTO support_replies (support_message_id, sender_type, sender_id, body, created_at) VALUES (?, "admin", ?, ?, ?)'
    )->execute([$id, $adminId, $replyBody, (int) round(microtime(true) * 1000)]);

    jsonResponse(['ok' => true], 201);
}

const ADMIN_NOTE_TARGET_TYPES = ['user', 'crew', 'support'];

function respondWithAdminNotes(PDO $pdo): void
{
    $targetType = $_GET['targetType'] ?? '';
    $targetId = $_GET['targetId'] ?? '';
    if (!in_array($targetType, ADMIN_NOTE_TARGET_TYPES, true) || $targetId === '') {
        errorResponse('A valid targetType and targetId are required');
        return;
    }

    $stmt = $pdo->prepare(
        'SELECT n.id, n.note, n.created_by, n.created_at, a.email AS admin_email
         FROM admin_notes n LEFT JOIN admin_users a ON a.id = n.created_by
         WHERE n.target_type = ? AND n.target_id = ? ORDER BY n.created_at DESC'
    );
    $stmt->execute([$targetType, $targetId]);

    jsonResponse(array_map(function (array $row): array {
        return [
            'id' => (int) $row['id'],
            'note' => $row['note'],
            'createdByEmail' => $row['admin_email'] ?: 'Removed admin',
            'createdAt' => (int) $row['created_at'],
        ];
    }, $stmt->fetchAll()));
}

function createAdminNote(PDO $pdo, string $adminId, array $data): void
{
    $targetType = $data['targetType'] ?? '';
    $targetId = trim((string) ($data['targetId'] ?? ''));
    $note = trim((string) ($data['note'] ?? ''));

    if (!in_array($targetType, ADMIN_NOTE_TARGET_TYPES, true) || $targetId === '') {
        errorResponse('A valid targetType and targetId are required');
        return;
    }
    if ($note === '') {
        errorResponse('note is required');
        return;
    }
    $note = mb_substr($note, 0, 2000);

    $pdo->prepare('INSERT INTO admin_notes (target_type, target_id, note, created_by, created_at) VALUES (?, ?, ?, ?, ?)')
        ->execute([$targetType, $targetId, $note, $adminId, (int) round(microtime(true) * 1000)]);

    jsonResponse(['ok' => true], 201);
}

function deleteAdminNote(PDO $pdo, string $id): void
{
    $pdo->prepare('DELETE FROM admin_notes WHERE id = ?')->execute([$id]);
    jsonResponse(['ok' => true]);
}

const ADMIN_TASK_STATUSES = ['todo', 'in_progress', 'done'];

function respondWithAdminTasks(PDO $pdo): void
{
    $stmt = $pdo->query('SELECT * FROM admin_tasks ORDER BY due_date IS NULL, due_date ASC, created_at DESC');
    jsonResponse(array_map('adminTaskJson', $stmt->fetchAll()));
}

function adminTaskJson(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'title' => $row['title'],
        'description' => $row['description'],
        'status' => $row['status'],
        'dueDate' => $row['due_date'],
        'assignedAdminId' => $row['assigned_admin_id'],
        'createdBy' => $row['created_by'],
        'createdAt' => (int) $row['created_at'],
        'updatedAt' => (int) $row['updated_at'],
    ];
}

function createAdminTask(PDO $pdo, string $adminId, array $data): void
{
    $title = trim((string) ($data['title'] ?? ''));
    if ($title === '') {
        errorResponse('title is required');
        return;
    }
    $title = mb_substr($title, 0, 255);

    $description = isset($data['description']) ? mb_substr(trim((string) $data['description']), 0, 2000) : null;
    if ($description === '') $description = null;

    $status = in_array($data['status'] ?? null, ADMIN_TASK_STATUSES, true) ? $data['status'] : 'todo';
    $dueDate = !empty($data['dueDate']) ? $data['dueDate'] : null;
    $assignedAdminId = !empty($data['assignedAdminId']) ? $data['assignedAdminId'] : null;
    $now = (int) round(microtime(true) * 1000);

    $pdo->prepare(
        'INSERT INTO admin_tasks (title, description, status, due_date, assigned_admin_id, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([$title, $description, $status, $dueDate, $assignedAdminId, $adminId, $now, $now]);

    jsonResponse(['id' => (int) $pdo->lastInsertId()], 201);
}

function updateAdminTask(PDO $pdo, string $id, array $data): void
{
    $sets = [];
    $values = [];

    if (array_key_exists('title', $data)) {
        $title = trim((string) $data['title']);
        if ($title === '') {
            errorResponse('title cannot be empty');
            return;
        }
        $sets[] = 'title = ?';
        $values[] = mb_substr($title, 0, 255);
    }
    if (array_key_exists('description', $data)) {
        $description = trim((string) ($data['description'] ?? ''));
        $sets[] = 'description = ?';
        $values[] = $description === '' ? null : mb_substr($description, 0, 2000);
    }
    if (array_key_exists('status', $data)) {
        if (!in_array($data['status'], ADMIN_TASK_STATUSES, true)) {
            errorResponse('A valid status is required');
            return;
        }
        $sets[] = 'status = ?';
        $values[] = $data['status'];
    }
    if (array_key_exists('dueDate', $data)) {
        $sets[] = 'due_date = ?';
        $values[] = $data['dueDate'] ?: null;
    }
    if (array_key_exists('assignedAdminId', $data)) {
        $sets[] = 'assigned_admin_id = ?';
        $values[] = $data['assignedAdminId'] ?: null;
    }

    if (!$sets) {
        errorResponse('Nothing to update');
        return;
    }

    $sets[] = 'updated_at = ?';
    $values[] = (int) round(microtime(true) * 1000);
    $values[] = $id;

    $pdo->prepare('UPDATE admin_tasks SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($values);
    jsonResponse(['ok' => true]);
}

function deleteAdminTask(PDO $pdo, string $id): void
{
    $pdo->prepare('DELETE FROM admin_tasks WHERE id = ?')->execute([$id]);
    jsonResponse(['ok' => true]);
}

const ROADMAP_STATUSES = ['planned', 'in_progress', 'shipped'];

function respondWithAdminRoadmap(PDO $pdo): void
{
    $stmt = $pdo->query('SELECT * FROM roadmap_items ORDER BY display_order ASC, created_at DESC');
    jsonResponse(array_map('adminRoadmapItemJson', $stmt->fetchAll()));
}

function adminRoadmapItemJson(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'title' => $row['title'],
        'description' => $row['description'],
        'status' => $row['status'],
        'displayOrder' => (int) $row['display_order'],
        'createdAt' => (int) $row['created_at'],
        'updatedAt' => (int) $row['updated_at'],
    ];
}

function createAdminRoadmapItem(PDO $pdo, string $adminId, array $data): void
{
    $title = trim((string) ($data['title'] ?? ''));
    if ($title === '') {
        errorResponse('title is required');
        return;
    }
    $title = mb_substr($title, 0, 255);

    $description = isset($data['description']) ? mb_substr(trim((string) $data['description']), 0, 1000) : null;
    if ($description === '') $description = null;

    $status = in_array($data['status'] ?? null, ROADMAP_STATUSES, true) ? $data['status'] : 'planned';
    $now = (int) round(microtime(true) * 1000);

    $pdo->prepare('INSERT INTO roadmap_items (title, description, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        ->execute([$title, $description, $status, $adminId, $now, $now]);

    jsonResponse(['id' => (int) $pdo->lastInsertId()], 201);
}

function updateAdminRoadmapItem(PDO $pdo, string $id, array $data): void
{
    $sets = [];
    $values = [];

    if (array_key_exists('title', $data)) {
        $title = trim((string) $data['title']);
        if ($title === '') {
            errorResponse('title cannot be empty');
            return;
        }
        $sets[] = 'title = ?';
        $values[] = mb_substr($title, 0, 255);
    }
    if (array_key_exists('description', $data)) {
        $description = trim((string) ($data['description'] ?? ''));
        $sets[] = 'description = ?';
        $values[] = $description === '' ? null : mb_substr($description, 0, 1000);
    }
    if (array_key_exists('status', $data)) {
        if (!in_array($data['status'], ROADMAP_STATUSES, true)) {
            errorResponse('A valid status is required');
            return;
        }
        $sets[] = 'status = ?';
        $values[] = $data['status'];
    }
    if (array_key_exists('displayOrder', $data)) {
        $sets[] = 'display_order = ?';
        $values[] = (int) $data['displayOrder'];
    }

    if (!$sets) {
        errorResponse('Nothing to update');
        return;
    }

    $sets[] = 'updated_at = ?';
    $values[] = (int) round(microtime(true) * 1000);
    $values[] = $id;

    $pdo->prepare('UPDATE roadmap_items SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($values);
    jsonResponse(['ok' => true]);
}

function deleteAdminRoadmapItem(PDO $pdo, string $id): void
{
    $pdo->prepare('DELETE FROM roadmap_items WHERE id = ?')->execute([$id]);
    jsonResponse(['ok' => true]);
}

/**
 * Extra chart data beyond respondWithAdminStats's headline numbers — feeds the richer
 * Dashboard/Reports visualizations. Kept as a separate endpoint (not folded into /admin/stats) so
 * the fast headline numbers never wait on these heavier GROUP BY queries.
 */
function respondWithAdminAnalytics(PDO $pdo): void
{
    // Workouts logged per day, last 14 days.
    $workoutsStmt = $pdo->query(
        "SELECT DATE(created_at) AS day, COUNT(*) AS count FROM workouts
         WHERE created_at >= (NOW() - INTERVAL 14 DAY) GROUP BY DATE(created_at) ORDER BY day ASC"
    );
    $workoutsByDay = array_map(fn(array $row) => ['date' => $row['day'], 'count' => (int) $row['count']], $workoutsStmt->fetchAll());

    // Crew growth — cumulative would need a running total in PHP; per-day creation count is enough
    // to see momentum, same shape as signupsByDay.
    $crewsStmt = $pdo->query(
        "SELECT DATE(FROM_UNIXTIME(created_at / 1000)) AS day, COUNT(*) AS count FROM crews
         WHERE id NOT LIKE 'bot-crew-%' AND created_at >= (UNIX_TIMESTAMP(NOW() - INTERVAL 30 DAY) * 1000)
         GROUP BY day ORDER BY day ASC"
    );
    $crewsByDay = array_map(fn(array $row) => ['date' => $row['day'], 'count' => (int) $row['count']], $crewsStmt->fetchAll());

    // Crew privacy split — for a donut chart.
    $privacyStmt = $pdo->query("SELECT privacy, COUNT(*) AS count FROM crews WHERE id NOT LIKE 'bot-crew-%' GROUP BY privacy");
    $crewsByPrivacy = array_map(fn(array $row) => ['label' => $row['privacy'], 'count' => (int) $row['count']], $privacyStmt->fetchAll());

    // Crew division distribution — for a bar chart.
    $divisionStmt = $pdo->query("SELECT division, COUNT(*) AS count FROM crews WHERE id NOT LIKE 'bot-crew-%' GROUP BY division");
    $crewsByDivision = array_map(fn(array $row) => ['label' => $row['division'], 'count' => (int) $row['count']], $divisionStmt->fetchAll());

    // Reports by reason — for the Reports page's bar chart.
    $reasonStmt = $pdo->query('SELECT reason, COUNT(*) AS count FROM content_reports GROUP BY reason');
    $reportsByReason = array_map(fn(array $row) => ['label' => $row['reason'], 'count' => (int) $row['count']], $reasonStmt->fetchAll());

    // Support tickets opened per day, last 14 days.
    $supportStmt = $pdo->query(
        "SELECT DATE(FROM_UNIXTIME(created_at / 1000)) AS day, COUNT(*) AS count FROM support_messages
         WHERE created_at >= (UNIX_TIMESTAMP(NOW() - INTERVAL 14 DAY) * 1000) GROUP BY day ORDER BY day ASC"
    );
    $supportByDay = array_map(fn(array $row) => ['date' => $row['day'], 'count' => (int) $row['count']], $supportStmt->fetchAll());

    jsonResponse([
        'workoutsByDay' => $workoutsByDay,
        'crewsByDay' => $crewsByDay,
        'crewsByPrivacy' => $crewsByPrivacy,
        'crewsByDivision' => $crewsByDivision,
        'reportsByReason' => $reportsByReason,
        'supportByDay' => $supportByDay,
    ]);
}

function respondWithAdmins(PDO $pdo): void
{
    $stmt = $pdo->query('SELECT id, email, created_at FROM admin_users ORDER BY created_at ASC');
    jsonResponse(array_map(fn(array $row) => ['id' => $row['id'], 'email' => $row['email'], 'createdAt' => (int) $row['created_at']], $stmt->fetchAll()));
}

function createAdmin(PDO $pdo, string $adminId, string $adminEmail, array $data): void
{
    $email = strtolower(trim((string) ($data['email'] ?? '')));
    $password = (string) ($data['password'] ?? '');
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        errorResponse('A valid email is required');
        return;
    }
    if (strlen($password) < 8) {
        errorResponse('Password must be at least 8 characters');
        return;
    }

    $existing = $pdo->prepare('SELECT id FROM admin_users WHERE email = ?');
    $existing->execute([$email]);
    if ($existing->fetch()) {
        errorResponse('An admin with that email already exists', 409);
        return;
    }

    $id = 'admin-' . bin2hex(random_bytes(8));
    $pdo->prepare('INSERT INTO admin_users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)')
        ->execute([$id, $email, password_hash($password, PASSWORD_BCRYPT), (int) round(microtime(true) * 1000)]);

    logAdminAction($pdo, $adminId, $adminEmail, 'create_admin', 'admin', $id, $email);
    jsonResponse(['id' => $id, 'email' => $email], 201);
}

function deleteAdmin(PDO $pdo, string $callerId, string $callerEmail, string $targetId): void
{
    if ($callerId === $targetId) {
        errorResponse("You can't remove your own admin account while logged in as it.", 409);
        return;
    }

    $count = (int) $pdo->query('SELECT COUNT(*) FROM admin_users')->fetchColumn();
    if ($count <= 1) {
        errorResponse('At least one admin account must always exist', 409);
        return;
    }

    $pdo->prepare('DELETE FROM admin_users WHERE id = ?')->execute([$targetId]);
    logAdminAction($pdo, $callerId, $callerEmail, 'delete_admin', 'admin', $targetId);
    jsonResponse(['ok' => true]);
}

function respondWithAnnouncements(PDO $pdo): void
{
    $stmt = $pdo->query('SELECT id, message, active, created_at FROM app_announcements ORDER BY created_at DESC LIMIT 50');
    jsonResponse(array_map(
        fn(array $row) => ['id' => (int) $row['id'], 'message' => $row['message'], 'active' => (bool) $row['active'], 'createdAt' => (int) $row['created_at']],
        $stmt->fetchAll()
    ));
}

function createAnnouncement(PDO $pdo, string $adminId, string $adminEmail, array $data): void
{
    $message = trim((string) ($data['message'] ?? ''));
    if ($message === '') {
        errorResponse('message is required');
        return;
    }
    $message = mb_substr($message, 0, 500);

    $pdo->beginTransaction();
    try {
        $pdo->exec('UPDATE app_announcements SET active = 0 WHERE active = 1');
        $pdo->prepare('INSERT INTO app_announcements (message, active, created_by, created_at) VALUES (?, 1, ?, ?)')
            ->execute([$message, $adminId, (int) round(microtime(true) * 1000)]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    logAdminAction($pdo, $adminId, $adminEmail, 'publish_announcement', 'announcement', null, $message);
    jsonResponse(['ok' => true], 201);
}

function updateAnnouncement(PDO $pdo, string $id, array $data): void
{
    if (($data['active'] ?? null) !== false) {
        errorResponse('Only deactivating is supported here — create a new announcement to activate one');
        return;
    }
    $pdo->prepare('UPDATE app_announcements SET active = 0 WHERE id = ?')->execute([$id]);
    jsonResponse(['ok' => true]);
}

/**
 * Sends a plain-text email via PHP's built-in mail() — no SMTP library needed, works on most
 * Hostinger shared hosting for the account's own domain (see .env.example's ADMIN_EMAIL_FROM).
 * Best-effort per recipient: one failed address never stops the rest from sending. Fine at
 * early-access scale; revisit with a real transactional-email provider if the user base grows
 * large enough for this loop to matter.
 */
function sendBroadcastEmail(PDO $pdo, array $data): void
{
    $subject = trim((string) ($data['subject'] ?? ''));
    $body = trim((string) ($data['body'] ?? ''));
    $bodyHtml = trim((string) ($data['bodyHtml'] ?? ''));
    $audience = $data['audience'] ?? 'all';

    if ($subject === '' || ($body === '' && $bodyHtml === '')) {
        errorResponse('subject and body are required');
        return;
    }

    $from = env('ADMIN_EMAIL_FROM', '');
    if ($from === '') {
        errorResponse('ADMIN_EMAIL_FROM is not configured in .env');
        return;
    }

    if ($audience === 'single') {
        $userId = (string) ($data['userId'] ?? '');
        $stmt = $pdo->prepare('SELECT email FROM users WHERE id = ? AND email IS NOT NULL');
        $stmt->execute([$userId]);
        $emails = array_column($stmt->fetchAll(), 'email');
    } elseif ($audience === 'founding') {
        $stmt = $pdo->query("SELECT email FROM users WHERE id != 'bot-system' AND email IS NOT NULL AND banned_at IS NULL AND founding_athlete_id IS NOT NULL");
        $emails = array_column($stmt->fetchAll(), 'email');
    } else {
        $stmt = $pdo->query("SELECT email FROM users WHERE id != 'bot-system' AND email IS NOT NULL AND banned_at IS NULL");
        $emails = array_column($stmt->fetchAll(), 'email');
    }

    $sent = 0;
    foreach ($emails as $email) {
        if (sendOneEmail($email, $subject, $body, $bodyHtml, $from)) {
            $sent++;
        }
    }

    jsonResponse(['ok' => true, 'sent' => $sent, 'total' => count($emails)]);
}

/**
 * Sends one email, HTML if the panel's drag-and-drop email builder produced markup (see
 * admin/src/pages/Email.tsx), otherwise plain text. A multipart/alternative message when both are
 * present, so plain-text mail clients still get something readable instead of raw HTML tags.
 */
function sendOneEmail(string $to, string $subject, string $textBody, string $htmlBody, string $from): bool
{
    $fromHeader = "From: GymCrew <$from>\r\n";

    if ($htmlBody === '') {
        $headers = $fromHeader . "Content-Type: text/plain; charset=UTF-8";
        return @mail($to, $subject, $textBody, $headers);
    }

    $boundary = 'gymcrew-' . bin2hex(random_bytes(8));
    $headers = $fromHeader . "MIME-Version: 1.0\r\nContent-Type: multipart/alternative; boundary=\"$boundary\"";

    $plainFallback = $textBody !== '' ? $textBody : trim(strip_tags($htmlBody));

    $message = "--$boundary\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n\r\n"
        . $plainFallback . "\r\n\r\n"
        . "--$boundary\r\n"
        . "Content-Type: text/html; charset=UTF-8\r\n\r\n"
        . $htmlBody . "\r\n\r\n"
        . "--$boundary--";

    return @mail($to, $subject, $message, $headers);
}
