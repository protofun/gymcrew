<?php

/**
 * Admin-composed messages targeted at specific users — see db/schema.sql's `admin_messages`. Sent
 * from the admin panel's User Management "Send Message" bulk action, shown in the app as a
 * blocking-until-dismissed overlay (see AdminMessageOverlay) rather than a push notification, since
 * a push can be missed or ignored entirely outside the app.
 *
 * Routes (all require auth, see index.php):
 *   GET  /admin-messages/pending  -> the caller's own undismissed messages, oldest first
 *   POST /admin-messages/:id/dismiss -> mark one of the caller's own messages dismissed
 */
function handleAdminMessages(PDO $pdo, string $userId, string $method, ?array $body, array $segments): void
{
    $id = $segments[1] ?? null;
    $sub = $segments[2] ?? null;

    if ($id === 'pending' && $method === 'GET') {
        respondWithPendingAdminMessages($pdo, $userId);
        return;
    }

    if ($id !== null && $id !== 'pending' && $sub === 'dismiss' && $method === 'POST') {
        dismissAdminMessage($pdo, $userId, (int) $id);
        return;
    }

    errorResponse('Not found', 404);
}

function respondWithPendingAdminMessages(PDO $pdo, string $userId): void
{
    $stmt = $pdo->prepare(
        'SELECT id, message, sent_at FROM admin_messages WHERE user_id = ? AND dismissed_at IS NULL ORDER BY sent_at ASC'
    );
    $stmt->execute([$userId]);

    jsonResponse(array_map(fn (array $row): array => [
        'id' => (int) $row['id'],
        'message' => $row['message'],
        'sentAt' => (int) $row['sent_at'],
    ], $stmt->fetchAll()));
}

/** Scoped to `user_id = ?` so a user can only ever dismiss their own message, never guess another
 * message id and silently mark it read on someone else's behalf. */
function dismissAdminMessage(PDO $pdo, string $userId, int $messageId): void
{
    $stmt = $pdo->prepare('UPDATE admin_messages SET dismissed_at = ? WHERE id = ? AND user_id = ?');
    $stmt->execute([(int) round(microtime(true) * 1000), $messageId, $userId]);
    if ($stmt->rowCount() === 0) {
        errorResponse('Not found', 404);
        return;
    }
    jsonResponse(['ok' => true]);
}
