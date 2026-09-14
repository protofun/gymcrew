<?php

/**
 * App-facing (read-only) view of the admin panel's "Page Management" announcement banner — see
 * db/schema.sql's app_announcements and routes/admin.php's createAnnouncement/updateAnnouncement.
 * Behind the normal Clerk JWT gate (any signed-in user), unlike /admin/* which has its own auth.
 *
 * Routes:
 *   GET /announcement -> { message: string } | null
 */
function handleAnnouncement(PDO $pdo): void
{
    $stmt = $pdo->query('SELECT message FROM app_announcements WHERE active = 1 ORDER BY created_at DESC LIMIT 1');
    $row = $stmt->fetch();
    jsonResponse($row ? ['message' => $row['message']] : null);
}
