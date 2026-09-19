<?php

/**
 * Admin panel — operational tooling: audit log, app-wide settings, 2FA, rank/crew-war moderation,
 * the push-notification composer, onboarding funnel stats, and raw data for the Reports Center's
 * CSV exports. Dispatched from routes/admin.php's handleAdmin() — same auth (already verified by
 * the time any function here runs), just split into a second file for readability.
 */

/** Records one admin action — called from routes/admin.php's mutation functions (ban, delete,
 * resolve, etc.) and from adminLogin() below for successful logins. Best-effort: never throws, an
 * audit-log write must never be the reason a real action fails. */
function logAdminAction(PDO $pdo, string $adminId, string $adminEmail, string $action, ?string $targetType = null, ?string $targetId = null, ?string $details = null): void
{
    try {
        $pdo->prepare(
            'INSERT INTO admin_audit_log (admin_id, admin_email, action, target_type, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )->execute([$adminId, $adminEmail, $action, $targetType, $targetId, $details, (int) round(microtime(true) * 1000)]);
    } catch (Throwable $e) {
        error_log('logAdminAction failed: ' . $e->getMessage());
    }
}

function respondWithAuditLog(PDO $pdo): void
{
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $limit = 50;
    $offset = ($page - 1) * $limit;

    $total = (int) $pdo->query('SELECT COUNT(*) FROM admin_audit_log')->fetchColumn();
    $stmt = $pdo->query("SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT $limit OFFSET $offset");

    $entries = array_map(function (array $row): array {
        return [
            'id' => (int) $row['id'],
            'adminEmail' => $row['admin_email'],
            'action' => $row['action'],
            'targetType' => $row['target_type'],
            'targetId' => $row['target_id'],
            'details' => $row['details'],
            'createdAt' => (int) $row['created_at'],
        ];
    }, $stmt->fetchAll());

    jsonResponse(['entries' => $entries, 'total' => $total, 'page' => $page, 'limit' => $limit]);
}

function respondWithSettings(PDO $pdo): void
{
    $stmt = $pdo->query('SELECT setting_key, setting_value FROM app_settings');
    $settings = [];
    foreach ($stmt->fetchAll() as $row) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
    jsonResponse($settings);
}

function updateSetting(PDO $pdo, array $data): void
{
    $key = trim((string) ($data['key'] ?? ''));
    $value = (string) ($data['value'] ?? '');
    if ($key === '') {
        errorResponse('key is required');
        return;
    }

    $pdo->prepare(
        'INSERT INTO app_settings (setting_key, setting_value, updated_at) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = VALUES(updated_at)'
    )->execute([$key, mb_substr($value, 0, 500), (int) round(microtime(true) * 1000)]);

    jsonResponse(['ok' => true]);
}

// ---- TOTP (RFC 6238) — hand-written, same "no Composer dependency" rule as auth.php/admin-auth.php ----

function base32Encode(string $data): string
{
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $bits = '';
    foreach (str_split($data) as $char) {
        $bits .= str_pad(decbin(ord($char)), 8, '0', STR_PAD_LEFT);
    }
    $output = '';
    foreach (str_split($bits, 5) as $chunk) {
        $chunk = str_pad($chunk, 5, '0', STR_PAD_RIGHT);
        $output .= $alphabet[bindec($chunk)];
    }
    return $output;
}

function base32Decode(string $data): string
{
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $data = strtoupper(preg_replace('/[^A-Z2-7]/i', '', $data));
    $bits = '';
    foreach (str_split($data) as $char) {
        $pos = strpos($alphabet, $char);
        if ($pos === false) continue;
        $bits .= str_pad(decbin($pos), 5, '0', STR_PAD_LEFT);
    }
    $bytes = '';
    foreach (str_split($bits, 8) as $byte) {
        if (strlen($byte) < 8) continue;
        $bytes .= chr(bindec($byte));
    }
    return $bytes;
}

/** The current 6-digit TOTP for `$secret` (base32), 30-second step — same algorithm every
 * authenticator app (Google/Microsoft/Authy) uses. */
function totpCode(string $secretBase32, ?int $timestamp = null): string
{
    $key = base32Decode($secretBase32);
    $counter = intdiv($timestamp ?? time(), 30);
    $counterBytes = pack('N*', 0) . pack('N*', $counter); // 8-byte big-endian counter

    $hash = hash_hmac('sha1', $counterBytes, $key, true);
    $offset = ord($hash[19]) & 0xf;
    $binary = ((ord($hash[$offset]) & 0x7f) << 24)
        | ((ord($hash[$offset + 1]) & 0xff) << 16)
        | ((ord($hash[$offset + 2]) & 0xff) << 8)
        | (ord($hash[$offset + 3]) & 0xff);

    return str_pad((string) ($binary % 1000000), 6, '0', STR_PAD_LEFT);
}

/** Accepts the current code or one step early/late — clock drift between the admin's phone and
 * this server is common enough that a zero-tolerance check would lock people out constantly. */
function verifyTotpCode(string $secretBase32, string $code): bool
{
    $now = time();
    foreach ([-30, 0, 30] as $drift) {
        if (hash_equals(totpCode($secretBase32, $now + $drift), $code)) {
            return true;
        }
    }
    return false;
}

function enrollTotp(PDO $pdo, string $adminId, string $adminEmail): void
{
    $secret = base32Encode(random_bytes(20));
    $otpauth = 'otpauth://totp/' . rawurlencode("GymCrew Admin:$adminEmail") . '?secret=' . $secret . '&issuer=' . rawurlencode('GymCrew Admin');
    // Not saved yet — confirmTotp() below only persists it once the admin proves they scanned it
    // correctly, so a browser refresh mid-setup never leaves 2FA half-enabled with a secret nobody has.
    jsonResponse(['secret' => $secret, 'otpauthUrl' => $otpauth]);
}

function confirmTotp(PDO $pdo, string $adminId, array $data): void
{
    $secret = (string) ($data['secret'] ?? '');
    $code = (string) ($data['code'] ?? '');
    if ($secret === '' || $code === '') {
        errorResponse('secret and code are required');
        return;
    }
    if (!verifyTotpCode($secret, $code)) {
        errorResponse('Incorrect code — check your authenticator app and try again', 401);
        return;
    }

    $pdo->prepare('UPDATE admin_users SET totp_secret = ? WHERE id = ?')->execute([$secret, $adminId]);
    jsonResponse(['ok' => true]);
}

function disableTotp(PDO $pdo, string $adminId): void
{
    $pdo->prepare('UPDATE admin_users SET totp_secret = NULL WHERE id = ?')->execute([$adminId]);
    jsonResponse(['ok' => true]);
}

// ---- Rank / PR moderation ----

/** The heaviest logged PRs, newest first within ties — not an automated "cheater" flag (too easy
 * to false-positive on a genuinely strong lifter), just a sorted list an admin can eyeball and
 * spot-check. Excludes the bot account. */
function respondWithTopRecords(PDO $pdo): void
{
    $limit = min(200, max(1, (int) ($_GET['limit'] ?? 50)));
    $stmt = $pdo->prepare(
        "SELECT pr.user_id, pr.exercise_id, pr.exercise_name, pr.best_weight_kg, pr.best_reps, pr.achieved_at, u.full_name, u.email
         FROM personal_records pr JOIN users u ON u.id = pr.user_id
         WHERE pr.user_id != 'bot-system'
         ORDER BY pr.best_weight_kg DESC LIMIT $limit"
    );
    $stmt->execute();

    jsonResponse(array_map(function (array $row): array {
        return [
            'userId' => $row['user_id'],
            'userName' => $row['full_name'] ?: $row['email'] ?: 'Unknown',
            'exerciseId' => $row['exercise_id'],
            'exerciseName' => $row['exercise_name'],
            'weightKg' => (float) $row['best_weight_kg'],
            'reps' => (int) $row['best_reps'],
            'achievedAt' => (int) $row['achieved_at'],
        ];
    }, $stmt->fetchAll()));
}

function deleteRecord(PDO $pdo, array $data): void
{
    $userId = (string) ($data['userId'] ?? '');
    $exerciseId = (string) ($data['exerciseId'] ?? '');
    if ($userId === '' || $exerciseId === '') {
        errorResponse('userId and exerciseId are required');
        return;
    }
    $pdo->prepare('DELETE FROM personal_records WHERE user_id = ? AND exercise_id = ?')->execute([$userId, $exerciseId]);
    jsonResponse(['ok' => true]);
}

// ---- Social verification (see routes/user-socials.php for the app-facing side) ----

/** Every submitted Instagram/TikTok handle, newest submission first, joined with the user's name so
 * the Social Verification page doesn't need a second lookup per row. */
// A submission needs a (re-)check once it's never been reviewed, or its last review is old enough
// that a week has genuinely passed since — the honest, no-scraping stand-in for "a weekly sync that
// checks whether they're still promoting": nothing runs automatically, but the admin panel surfaces
// exactly who's due for a manual look so a real weekly review habit doesn't quietly lapse.
const SOCIAL_REVIEW_STALE_MS = 7 * 24 * 60 * 60 * 1000;

function respondWithSocialSubmissions(PDO $pdo): void
{
    $stmt = $pdo->query(
        'SELECT s.user_id, s.instagram_handle, s.tiktok_handle, s.submitted_at, s.reviewed_at, s.reviewed_by,
                s.is_promoting, s.admin_notes, u.full_name, u.email
         FROM user_socials s JOIN users u ON u.id = s.user_id
         ORDER BY s.submitted_at DESC'
    );

    $now = (int) round(microtime(true) * 1000);
    jsonResponse(array_map(function (array $row) use ($now): array {
        $reviewedAt = $row['reviewed_at'] !== null ? (int) $row['reviewed_at'] : null;
        return [
            'userId' => $row['user_id'],
            'userName' => $row['full_name'] ?: $row['email'] ?: 'Unknown',
            'instagramHandle' => $row['instagram_handle'],
            'tiktokHandle' => $row['tiktok_handle'],
            'submittedAt' => (int) $row['submitted_at'],
            'reviewedAt' => $reviewedAt,
            'reviewedBy' => $row['reviewed_by'],
            'isPromoting' => $row['is_promoting'] === null ? null : (bool) $row['is_promoting'],
            'adminNotes' => $row['admin_notes'],
            'needsRecheck' => $reviewedAt === null || ($now - $reviewedAt) > SOCIAL_REVIEW_STALE_MS,
        ];
    }, $stmt->fetchAll()));
}

/** An admin's manual verdict after actually opening the linked profiles and checking for GymCrew
 * posts — `isPromoting: null` explicitly clears a previous verdict back to "not reviewed" rather
 * than being rejected, so a wrong call can be undone. */
function reviewSocialSubmission(PDO $pdo, string $adminId, string $adminEmail, string $targetUserId, array $data): void
{
    if (!array_key_exists('isPromoting', $data)) {
        errorResponse('isPromoting is required');
        return;
    }
    $isPromoting = $data['isPromoting'];
    if ($isPromoting !== null && !is_bool($isPromoting)) {
        errorResponse('isPromoting must be true, false, or null');
        return;
    }
    $notes = trim((string) ($data['notes'] ?? ''));

    $stmt = $pdo->prepare(
        'UPDATE user_socials SET is_promoting = ?, admin_notes = ?, reviewed_at = ?, reviewed_by = ? WHERE user_id = ?'
    );
    $stmt->execute([$isPromoting, $notes, (int) round(microtime(true) * 1000), $adminEmail, $targetUserId]);
    if ($stmt->rowCount() === 0) {
        errorResponse('Not found', 404);
        return;
    }

    $verdict = $isPromoting === null ? 'cleared' : ($isPromoting ? 'promoting' : 'not promoting');
    logAdminAction($pdo, $adminId, $adminEmail, 'review_socials', 'user', $targetUserId, $verdict);
    jsonResponse(['ok' => true]);
}

// ---- Admin messages (see routes/admin-messages.php for the app-facing side) ----

/** One row per recipient, all carrying the same message text — sent from User Management's
 * "Send Message" bulk action, one or many recipients at once. Silently skips any id that isn't a
 * real user rather than failing the whole batch over one bad id. */
function sendAdminMessage(PDO $pdo, string $adminId, string $adminEmail, array $data): void
{
    $userIds = is_array($data['userIds'] ?? null) ? array_values(array_unique(array_map('strval', $data['userIds']))) : [];
    $message = trim((string) ($data['message'] ?? ''));

    if (empty($userIds)) {
        errorResponse('userIds is required and must be a non-empty array');
        return;
    }
    if ($message === '') {
        errorResponse('message is required');
        return;
    }

    $now = (int) round(microtime(true) * 1000);
    $stmt = $pdo->prepare('INSERT INTO admin_messages (user_id, message, sent_by, sent_at) VALUES (?, ?, ?, ?)');
    $sent = 0;
    foreach ($userIds as $targetUserId) {
        try {
            $stmt->execute([$targetUserId, $message, $adminEmail, $now]);
            $sent++;
        } catch (PDOException $e) {
            // Foreign key violation — $targetUserId doesn't exist. Skip it, keep going.
        }
    }

    // target_id is VARCHAR(64) — too short for a joined list of user ids once more than a couple are
    // selected, so the recipient count + message go in `details` (500 chars, hence the truncation)
    // instead.
    $detail = "$sent recipient(s): $message";
    logAdminAction($pdo, $adminId, $adminEmail, 'send_admin_message', 'user', null, mb_substr($detail, 0, 500));
    jsonResponse(['ok' => true, 'sent' => $sent]);
}

// ---- Crew Wars moderation ----

function respondWithActiveCrewWars(PDO $pdo): void
{
    $stmt = $pdo->query(
        "SELECT w.*, ca.name AS crew_a_name, cb.name AS crew_b_name
         FROM crew_wars w
         JOIN crews ca ON ca.id = w.crew_a_id
         JOIN crews cb ON cb.id = w.crew_b_id
         WHERE w.status = 'active'
         ORDER BY w.started_at DESC"
    );

    jsonResponse(array_map(function (array $row): array {
        return [
            'id' => $row['id'],
            'crewAId' => $row['crew_a_id'],
            'crewAName' => $row['crew_a_name'],
            'crewAScore' => (float) $row['crew_a_score'],
            'crewBId' => $row['crew_b_id'],
            'crewBName' => $row['crew_b_name'],
            'crewBScore' => (float) $row['crew_b_score'],
            'startedAt' => (int) $row['started_at'],
            'endsAt' => (int) $row['ends_at'],
        ];
    }, $stmt->fetchAll()));
}

function forceEndCrewWar(PDO $pdo, string $id): void
{
    $stmt = $pdo->prepare('SELECT * FROM crew_wars WHERE id = ?');
    $stmt->execute([$id]);
    $war = $stmt->fetch();
    if (!$war) {
        errorResponse('War not found', 404);
        return;
    }

    $winner = null;
    if ((float) $war['crew_a_score'] > (float) $war['crew_b_score']) $winner = $war['crew_a_id'];
    elseif ((float) $war['crew_b_score'] > (float) $war['crew_a_score']) $winner = $war['crew_b_id'];

    $pdo->prepare("UPDATE crew_wars SET status = 'completed', winner_crew_id = ?, ends_at = ? WHERE id = ?")
        ->execute([$winner, (int) round(microtime(true) * 1000), $id]);

    jsonResponse(['ok' => true]);
}

// ---- Push notification composer ----

function sendAdminPushBroadcast(PDO $pdo, array $data): void
{
    $title = trim((string) ($data['title'] ?? ''));
    $body = trim((string) ($data['body'] ?? ''));
    $audience = $data['audience'] ?? 'all';

    if ($title === '' || $body === '') {
        errorResponse('title and body are required');
        return;
    }

    if ($audience === 'single') {
        $userId = (string) ($data['userId'] ?? '');
        $stmt = $pdo->prepare('SELECT expo_push_token FROM users WHERE id = ? AND expo_push_token IS NOT NULL');
        $stmt->execute([$userId]);
        $tokens = array_column($stmt->fetchAll(), 'expo_push_token');
    } elseif ($audience === 'crew') {
        $crewId = (string) ($data['crewId'] ?? '');
        $stmt = $pdo->prepare(
            'SELECT u.expo_push_token FROM crew_members cm JOIN users u ON u.id = cm.user_id
             WHERE cm.crew_id = ? AND u.expo_push_token IS NOT NULL'
        );
        $stmt->execute([$crewId]);
        $tokens = array_column($stmt->fetchAll(), 'expo_push_token');
    } else {
        $stmt = $pdo->query("SELECT expo_push_token FROM users WHERE id != 'bot-system' AND expo_push_token IS NOT NULL AND banned_at IS NULL");
        $tokens = array_column($stmt->fetchAll(), 'expo_push_token');
    }

    $messages = array_map(fn(string $token) => ['to' => $token, 'title' => $title, 'body' => $body, 'data' => ['type' => 'admin_broadcast']], $tokens);
    sendExpoPushNotifications($messages);

    jsonResponse(['ok' => true, 'sent' => count($messages)]);
}

// ---- Onboarding funnel ----

function respondWithOnboardingFunnel(PDO $pdo): void
{
    $steps = [
        'accountCreated' => "id != 'bot-system'",
        'nameSet' => "full_name IS NOT NULL AND full_name != ''",
        'usernameSet' => "username IS NOT NULL",
        'bodyStatsSet' => "gender IS NOT NULL AND height_cm IS NOT NULL AND weight_kg IS NOT NULL",
        'gymSet' => "gym_name IS NOT NULL AND gym_name != ''",
        'goalSet' => "goal IS NOT NULL AND goal != ''",
    ];

    $funnel = [];
    foreach ($steps as $key => $condition) {
        $count = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE id != 'bot-system' AND $condition")->fetchColumn();
        $funnel[] = ['step' => $key, 'count' => $count];
    }

    jsonResponse($funnel);
}

// ---- Reports Center (Reports & Exports page) — full datasets for client-side CSV export ----

function respondWithExportUsers(PDO $pdo): void
{
    $stmt = $pdo->query(
        "SELECT id, email, full_name, username, gym_name, goal, experience_level, created_at, banned_at
         FROM users WHERE id != 'bot-system' ORDER BY created_at DESC LIMIT 5000"
    );
    jsonResponse($stmt->fetchAll());
}

function respondWithExportCrews(PDO $pdo): void
{
    $stmt = $pdo->query(
        "SELECT c.id, c.name, c.privacy, c.division, c.xp, c.created_at, c.disabled_at,
                (SELECT COUNT(*) FROM crew_members WHERE crew_id = c.id) AS member_count
         FROM crews c WHERE c.id NOT LIKE 'bot-crew-%' ORDER BY c.created_at DESC LIMIT 5000"
    );
    jsonResponse($stmt->fetchAll());
}

function respondWithExportWorkoutSummary(PDO $pdo): void
{
    $stmt = $pdo->query(
        "SELECT u.id AS user_id, u.full_name, u.email, COUNT(w.id) AS workout_count, COALESCE(SUM(w.volume_kg), 0) AS total_volume_kg
         FROM users u LEFT JOIN workouts w ON w.user_id = u.id
         WHERE u.id != 'bot-system'
         GROUP BY u.id, u.full_name, u.email
         ORDER BY workout_count DESC LIMIT 5000"
    );
    jsonResponse($stmt->fetchAll());
}

// ---- User Detail: Ranks / Workouts / Crew management (see admin.php's `users/{id}/...` routes) ----

function respondWithUserRecords(PDO $pdo, string $userId): void
{
    $stmt = $pdo->prepare(
        'SELECT exercise_id, exercise_name, best_weight_kg, best_reps, achieved_at FROM personal_records WHERE user_id = ? ORDER BY achieved_at DESC'
    );
    $stmt->execute([$userId]);

    jsonResponse(array_map(function (array $row): array {
        return [
            'exerciseId' => $row['exercise_id'],
            'exerciseName' => $row['exercise_name'],
            'weightKg' => (float) $row['best_weight_kg'],
            'reps' => (int) $row['best_reps'],
            'achievedAt' => (int) $row['achieved_at'],
        ];
    }, $stmt->fetchAll()));
}

function upsertUserRecord(PDO $pdo, string $adminId, string $adminEmail, string $userId, array $data): void
{
    $exerciseId = trim((string) ($data['exerciseId'] ?? ''));
    $weightKg = (float) ($data['weightKg'] ?? 0);
    $reps = (int) ($data['reps'] ?? 0);
    if ($exerciseId === '' || $weightKg <= 0 || $reps <= 0) {
        errorResponse('exerciseId, weightKg and reps are required', 422);
        return;
    }

    $stmt = $pdo->prepare('UPDATE personal_records SET best_weight_kg = ?, best_reps = ?, achieved_at = ? WHERE user_id = ? AND exercise_id = ?');
    $stmt->execute([$weightKg, $reps, (int) round(microtime(true) * 1000), $userId, $exerciseId]);
    if ($stmt->rowCount() === 0) {
        errorResponse('Record not found', 404);
        return;
    }

    logAdminAction($pdo, $adminId, $adminEmail, 'edit_record', 'user', $userId, "$exerciseId -> {$weightKg}kg x {$reps}");
    jsonResponse(['ok' => true]);
}

function respondWithUserWorkouts(PDO $pdo, string $userId): void
{
    $stmt = $pdo->prepare(
        'SELECT id, name, completed_at, duration_seconds, volume_kg, completed_sets FROM workouts WHERE user_id = ? ORDER BY completed_at DESC LIMIT 20'
    );
    $stmt->execute([$userId]);

    jsonResponse(array_map(function (array $row): array {
        return [
            'id' => $row['id'],
            'name' => $row['name'],
            'completedAt' => (int) $row['completed_at'],
            'durationSeconds' => (int) $row['duration_seconds'],
            'volumeKg' => (float) $row['volume_kg'],
            'completedSets' => (int) $row['completed_sets'],
        ];
    }, $stmt->fetchAll()));
}

/** Moves a user to a different crew (or removes them, when crewId is null) — crew_members.user_id
 * is unique, so this is always a delete-then-insert, never a second membership. */
function moveUserCrew(PDO $pdo, string $adminId, string $adminEmail, string $userId, array $data): void
{
    $crewId = isset($data['crewId']) && $data['crewId'] !== '' ? (string) $data['crewId'] : null;

    if ($crewId !== null) {
        $checkStmt = $pdo->prepare('SELECT id FROM crews WHERE id = ?');
        $checkStmt->execute([$crewId]);
        if (!$checkStmt->fetch()) {
            errorResponse('Crew not found', 404);
            return;
        }
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM crew_members WHERE user_id = ?')->execute([$userId]);
        if ($crewId !== null) {
            $pdo->prepare('INSERT INTO crew_members (crew_id, user_id, role, joined_at) VALUES (?, ?, "member", ?)')
                ->execute([$crewId, $userId, (int) round(microtime(true) * 1000)]);
        }
        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        errorResponse('Failed to update crew membership', 500);
        return;
    }

    logAdminAction($pdo, $adminId, $adminEmail, 'move_crew', 'user', $userId, $crewId ?? 'removed from crew');
    jsonResponse(['ok' => true]);
}
