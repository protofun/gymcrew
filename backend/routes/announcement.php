<?php

/**
 * Legacy single-message banner endpoint, kept only because app builds released before banners existed
 * (see routes/banners.php) still call it. Answers with the top live "everyone, home screen, banner"
 * banner's message, exactly the shape those builds expect. New builds use GET /banners instead.
 * Behind the normal Clerk JWT gate (any signed-in user), unlike /admin/* which has its own auth.
 *
 * Routes:
 *   GET /announcement -> { message: string } | null
 */
function handleAnnouncement(PDO $pdo): void
{
    $now = (int) round(microtime(true) * 1000);
    $stmt = $pdo->prepare(
        "SELECT message FROM app_banners
         WHERE active = 1 AND display = 'banner' AND placement = 'home' AND audience = 'all'
           AND (starts_at IS NULL OR starts_at <= ?) AND (ends_at IS NULL OR ends_at > ?)
         ORDER BY priority DESC, created_at DESC LIMIT 1"
    );
    $stmt->execute([$now, $now]);
    $row = $stmt->fetch();
    jsonResponse($row ? ['message' => $row['message']] : null);
}
