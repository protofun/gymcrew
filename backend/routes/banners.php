<?php

/**
 * In-app banners and popups — deals with a promo code, important notices, feature news. Created in
 * the admin panel's "Banners & Promos" page (admin CRUD below), shown in the app (the app-facing
 * handleBanners below, behind the normal Clerk JWT gate). Replaces the old single-message
 * announcement: see db/schema.sql's `app_banners`.
 *
 * A banner is live when it is switched on AND now falls inside its optional start/end window AND
 * the caller belongs to its audience. Audiences are worked out on the server from real data, never
 * from anything the client says about itself.
 *
 * App routes:
 *   GET  /banners            -> every banner this user should see right now
 *   POST /banners/:id/view   -> counts one impression
 *   POST /banners/:id/click  -> counts one tap on the banner's button
 *
 * Admin routes (dispatched from routes/admin.php):
 *   GET    /admin/banners
 *   POST   /admin/banners        -> full banner
 *   PUT    /admin/banners/:id    -> any subset of the fields (e.g. just { active: false })
 *   DELETE /admin/banners/:id
 */

const BANNER_KINDS = ['info', 'deal', 'important', 'success'];
const BANNER_DISPLAYS = ['banner', 'popup'];
const BANNER_PLACEMENTS = ['home', 'log', 'crew', 'ranks', 'profile'];
const BANNER_AUDIENCES = ['all', 'new', 'no_crew', 'in_crew', 'founding', 'no_workout'];
const BANNER_NEW_USER_DAYS = 14;

function nowMs(): int
{
    return (int) round(microtime(true) * 1000);
}

// ---- App-facing ----

function handleBanners(PDO $pdo, string $userId, string $method, array $segments): void
{
    $id = $segments[1] ?? null;
    $action = $segments[2] ?? null;

    if ($id === null && $method === 'GET') {
        respondWithLiveBanners($pdo, $userId);
        return;
    }
    if ($id !== null && $method === 'POST' && ($action === 'view' || $action === 'click')) {
        $column = $action === 'view' ? 'views' : 'clicks';
        $pdo->prepare("UPDATE app_banners SET $column = $column + 1 WHERE id = ?")->execute([(int) $id]);
        jsonResponse(['ok' => true]);
        return;
    }
    errorResponse('Not found', 404);
}

/** What the server knows about this user that an audience can target. A user without a row yet (first
 * request of a brand-new account) counts as new, crew-less and without workouts. */
function bannerAudienceFacts(PDO $pdo, string $userId): array
{
    $stmt = $pdo->prepare(
        'SELECT u.created_at, u.founding_athlete_id,
                (SELECT COUNT(*) FROM crew_members cm WHERE cm.user_id = u.id) AS crew_count,
                (SELECT COUNT(*) FROM workouts w WHERE w.user_id = u.id) AS workout_count
         FROM users u WHERE u.id = ?'
    );
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    if (!$row) {
        return ['new' => true, 'no_crew' => true, 'in_crew' => false, 'founding' => false, 'no_workout' => true];
    }

    return [
        'new' => strtotime((string) $row['created_at']) >= strtotime('-' . BANNER_NEW_USER_DAYS . ' days'),
        'no_crew' => (int) $row['crew_count'] === 0,
        'in_crew' => (int) $row['crew_count'] > 0,
        'founding' => $row['founding_athlete_id'] !== null,
        'no_workout' => (int) $row['workout_count'] === 0,
    ];
}

function respondWithLiveBanners(PDO $pdo, string $userId): void
{
    $now = nowMs();
    $stmt = $pdo->prepare(
        'SELECT * FROM app_banners
         WHERE active = 1 AND (starts_at IS NULL OR starts_at <= ?) AND (ends_at IS NULL OR ends_at > ?)
         ORDER BY priority DESC, created_at DESC'
    );
    $stmt->execute([$now, $now]);

    $facts = bannerAudienceFacts($pdo, $userId);
    $banners = [];
    foreach ($stmt->fetchAll() as $row) {
        if ($row['audience'] !== 'all' && empty($facts[$row['audience']])) {
            continue;
        }
        $banners[] = [
            'id' => (int) $row['id'],
            'kind' => $row['kind'],
            'display' => $row['display'],
            'placement' => $row['placement'],
            'title' => $row['title'],
            'message' => $row['message'],
            'ctaLabel' => $row['cta_label'],
            'ctaUrl' => $row['cta_url'],
            'promoCode' => $row['promo_code'],
            'endsAt' => $row['ends_at'] !== null ? (int) $row['ends_at'] : null,
            'dismissible' => (bool) $row['dismissible'],
        ];
    }
    jsonResponse($banners);
}

// ---- Admin ----

/** 'live' | 'scheduled' | 'expired' | 'off' — what the admin list shows next to each banner. */
function bannerStatus(array $row, int $now): string
{
    if (!$row['active']) {
        return 'off';
    }
    if ($row['starts_at'] !== null && (int) $row['starts_at'] > $now) {
        return 'scheduled';
    }
    if ($row['ends_at'] !== null && (int) $row['ends_at'] <= $now) {
        return 'expired';
    }
    return 'live';
}

function adminBannerJson(array $row, int $now): array
{
    return [
        'id' => (int) $row['id'],
        'kind' => $row['kind'],
        'display' => $row['display'],
        'placement' => $row['placement'],
        'title' => $row['title'],
        'message' => $row['message'],
        'ctaLabel' => $row['cta_label'],
        'ctaUrl' => $row['cta_url'],
        'promoCode' => $row['promo_code'],
        'audience' => $row['audience'],
        'startsAt' => $row['starts_at'] !== null ? (int) $row['starts_at'] : null,
        'endsAt' => $row['ends_at'] !== null ? (int) $row['ends_at'] : null,
        'dismissible' => (bool) $row['dismissible'],
        'priority' => (int) $row['priority'],
        'active' => (bool) $row['active'],
        'status' => bannerStatus($row, $now),
        'views' => (int) $row['views'],
        'clicks' => (int) $row['clicks'],
        'createdAt' => (int) $row['created_at'],
    ];
}

function respondWithAdminBanners(PDO $pdo): void
{
    $now = nowMs();
    $stmt = $pdo->query('SELECT * FROM app_banners ORDER BY active DESC, priority DESC, created_at DESC LIMIT 200');
    jsonResponse(array_map(fn(array $row) => adminBannerJson($row, $now), $stmt->fetchAll()));
}

/** Turns a banner's stored row back into the same camelCase shape the admin form sends, so a partial
 * update ({ active: false }) can be merged over it and validated as one whole banner. */
function bannerRowToInput(array $row): array
{
    return [
        'kind' => $row['kind'], 'display' => $row['display'], 'placement' => $row['placement'],
        'title' => $row['title'], 'message' => $row['message'],
        'ctaLabel' => $row['cta_label'], 'ctaUrl' => $row['cta_url'], 'promoCode' => $row['promo_code'],
        'audience' => $row['audience'], 'startsAt' => $row['starts_at'], 'endsAt' => $row['ends_at'],
        'dismissible' => (bool) $row['dismissible'], 'priority' => (int) $row['priority'], 'active' => (bool) $row['active'],
    ];
}

/** Validates a full banner and returns the DB column values — or null after already sending the
 * error response, so callers just `return;`. */
function cleanBannerInput(array $in): ?array
{
    $kind = (string) ($in['kind'] ?? 'info');
    $display = (string) ($in['display'] ?? 'banner');
    $placement = (string) ($in['placement'] ?? 'home');
    $audience = (string) ($in['audience'] ?? 'all');
    foreach ([['kind', $kind, BANNER_KINDS], ['display', $display, BANNER_DISPLAYS], ['placement', $placement, BANNER_PLACEMENTS], ['audience', $audience, BANNER_AUDIENCES]] as [$name, $value, $allowed]) {
        if (!in_array($value, $allowed, true)) {
            errorResponse("Invalid $name");
            return null;
        }
    }

    $message = trim((string) ($in['message'] ?? ''));
    if ($message === '') {
        errorResponse('A message is required');
        return null;
    }
    $title = trim((string) ($in['title'] ?? ''));

    $ctaLabel = trim((string) ($in['ctaLabel'] ?? ''));
    $ctaUrl = trim((string) ($in['ctaUrl'] ?? ''));
    if (($ctaLabel === '') !== ($ctaUrl === '')) {
        errorResponse('A button needs both a label and a link');
        return null;
    }
    // Either a screen inside the app ("/profile/subscription") or a secure web link — never anything
    // else (javascript:, http:, protocol-relative "//host"), since the app opens this on tap.
    if ($ctaUrl !== '' && !(preg_match('#^/(?!/)#', $ctaUrl) || str_starts_with($ctaUrl, 'https://'))) {
        errorResponse('The button link must start with / (a screen in the app) or https://');
        return null;
    }

    $promoCode = strtoupper(trim((string) ($in['promoCode'] ?? '')));
    if ($promoCode !== '' && !preg_match('/^[A-Z0-9_-]{1,40}$/', $promoCode)) {
        errorResponse('The promo code can only contain letters, numbers, - and _');
        return null;
    }

    $startsAt = isset($in['startsAt']) && $in['startsAt'] !== '' ? (int) $in['startsAt'] : null;
    $endsAt = isset($in['endsAt']) && $in['endsAt'] !== '' ? (int) $in['endsAt'] : null;
    if ($startsAt !== null && $endsAt !== null && $endsAt <= $startsAt) {
        errorResponse('The end must be after the start');
        return null;
    }

    return [
        'kind' => $kind,
        'display' => $display,
        'placement' => $placement,
        'title' => $title !== '' ? mb_substr($title, 0, 120) : null,
        'message' => mb_substr($message, 0, 500),
        'cta_label' => $ctaLabel !== '' ? mb_substr($ctaLabel, 0, 40) : null,
        'cta_url' => $ctaUrl !== '' ? mb_substr($ctaUrl, 0, 500) : null,
        'promo_code' => $promoCode !== '' ? $promoCode : null,
        'audience' => $audience,
        'starts_at' => $startsAt,
        'ends_at' => $endsAt,
        // A popup is always closable with its "Got it" button — a popup nobody could dismiss would
        // block the whole app.
        'dismissible' => $display === 'popup' || !empty($in['dismissible']) ? 1 : 0,
        'priority' => max(-100, min(100, (int) ($in['priority'] ?? 0))),
        'active' => !empty($in['active']) ? 1 : 0,
    ];
}

function createAdminBanner(PDO $pdo, string $adminId, string $adminEmail, array $data): void
{
    $data += ['dismissible' => true, 'active' => true];
    $fields = cleanBannerInput($data);
    if ($fields === null) {
        return;
    }

    $now = nowMs();
    $fields += ['created_by' => $adminId, 'created_at' => $now, 'updated_at' => $now];
    $columns = array_keys($fields);
    $pdo->prepare(
        'INSERT INTO app_banners (' . implode(', ', $columns) . ') VALUES (' . implode(', ', array_fill(0, count($columns), '?')) . ')'
    )->execute(array_values($fields));
    // Read before logAdminAction below — that inserts a row of its own and would replace this id.
    $bannerId = (int) $pdo->lastInsertId();

    logAdminAction($pdo, $adminId, $adminEmail, 'create_banner', 'banner', (string) $bannerId, mb_substr($fields['message'], 0, 200));
    jsonResponse(['ok' => true, 'id' => $bannerId], 201);
}

function updateAdminBanner(PDO $pdo, string $adminId, string $adminEmail, string $id, array $data): void
{
    $stmt = $pdo->prepare('SELECT * FROM app_banners WHERE id = ?');
    $stmt->execute([$id]);
    $existing = $stmt->fetch();
    if (!$existing) {
        errorResponse('Banner not found', 404);
        return;
    }

    $fields = cleanBannerInput(array_merge(bannerRowToInput($existing), $data));
    if ($fields === null) {
        return;
    }

    $fields['updated_at'] = nowMs();
    $sets = implode(', ', array_map(fn(string $column) => "$column = ?", array_keys($fields)));
    $pdo->prepare("UPDATE app_banners SET $sets WHERE id = ?")->execute([...array_values($fields), $id]);

    // Switching on/off is the everyday action, so it gets its own audit entry instead of a generic edit.
    $action = array_keys($data) === ['active'] ? ($data['active'] ? 'enable_banner' : 'disable_banner') : 'update_banner';
    logAdminAction($pdo, $adminId, $adminEmail, $action, 'banner', $id);
    jsonResponse(['ok' => true]);
}

function deleteAdminBanner(PDO $pdo, string $adminId, string $adminEmail, string $id): void
{
    $pdo->prepare('DELETE FROM app_banners WHERE id = ?')->execute([$id]);
    logAdminAction($pdo, $adminId, $adminEmail, 'delete_banner', 'banner', $id);
    jsonResponse(['ok' => true]);
}
