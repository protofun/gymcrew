<?php

/**
 * Instagram/TikTok handles collected via the app's "Connect Your Socials" overlay — see
 * db/schema.sql's `user_socials`. Read by the admin panel's Social Verification page so an admin
 * can manually check whether someone is actually posting about GymCrew.
 *
 * Routes (all require auth, see index.php):
 *   GET  /user-socials/mine -> { instagramHandle, tiktokHandle } | null (null = not submitted yet,
 *                               which is what the app's overlay checks to decide whether to show)
 *   POST /user-socials      -> { instagramHandle, tiktokHandle } — submit or update the caller's own
 */
function handleUserSocials(PDO $pdo, string $userId, string $method, ?array $body, array $segments): void
{
    $sub = $segments[1] ?? null;

    if ($sub === 'mine' && $method === 'GET') {
        respondWithMySocials($pdo, $userId);
        return;
    }

    if ($sub === null && $method === 'POST') {
        submitSocials($pdo, $userId, $body ?? []);
        return;
    }

    errorResponse('Not found', 404);
}

function respondWithMySocials(PDO $pdo, string $userId): void
{
    $stmt = $pdo->prepare('SELECT instagram_handle, tiktok_handle FROM user_socials WHERE user_id = ?');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();

    if (!$row) {
        jsonResponse(null);
        return;
    }

    jsonResponse(['instagramHandle' => $row['instagram_handle'], 'tiktokHandle' => $row['tiktok_handle']]);
}

/** Strips a leading "@" and surrounding whitespace — people naturally type/paste handles either
 * way, and normalizing here means the admin panel and any future @-prefixed display are consistent
 * regardless of how it was entered. */
function normalizeHandle(string $raw): string
{
    return ltrim(trim($raw), '@');
}

function submitSocials(PDO $pdo, string $userId, array $data): void
{
    $instagramHandle = normalizeHandle((string) ($data['instagramHandle'] ?? ''));
    $tiktokHandle = normalizeHandle((string) ($data['tiktokHandle'] ?? ''));

    if ($instagramHandle === '' || $tiktokHandle === '') {
        errorResponse('instagramHandle and tiktokHandle are both required');
        return;
    }

    // Upsert, not insert-only — resubmitting (e.g. a typo'd handle) replaces the previous value and
    // clears any prior review, since that review was of the old handle.
    $pdo->prepare(
        'INSERT INTO user_socials (user_id, instagram_handle, tiktok_handle, submitted_at, reviewed_at, reviewed_by, is_promoting, admin_notes)
         VALUES (?, ?, ?, ?, NULL, NULL, NULL, \'\')
         ON DUPLICATE KEY UPDATE
           instagram_handle = VALUES(instagram_handle),
           tiktok_handle = VALUES(tiktok_handle),
           submitted_at = VALUES(submitted_at),
           reviewed_at = NULL,
           reviewed_by = NULL,
           is_promoting = NULL'
    )->execute([$userId, $instagramHandle, $tiktokHandle, (int) round(microtime(true) * 1000)]);

    jsonResponse(['ok' => true]);
}
