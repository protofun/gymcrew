<?php

/**
 * In-app support — a two-way conversation per ticket (see db/schema.sql's support_messages +
 * support_replies), reviewed and answered from the admin panel (routes/admin.php).
 *
 * Routes (all require auth, see index.php):
 *   POST /support              -> { message, email? } -> creates a new ticket -> { ok: true, id }
 *   GET  /support               -> the caller's own tickets (list, newest first)
 *   GET  /support/:id           -> one of the caller's own tickets + its full reply thread
 *   POST /support/:id/reply     -> { body } -> adds the caller's reply, reopens a resolved ticket
 */
function handleSupport(PDO $pdo, string $userId, string $method, ?array $body, array $segments): void
{
    $id = $segments[1] ?? null;
    $data = $body ?? [];

    if ($id === null && $method === 'POST') {
        createSupportTicket($pdo, $userId, $data);
        return;
    }

    if ($id === null && $method === 'GET') {
        respondWithMySupportTickets($pdo, $userId);
        return;
    }

    if ($id !== null && ($segments[2] ?? null) === 'reply' && $method === 'POST') {
        replyToSupportTicket($pdo, $userId, $id, $data);
        return;
    }

    if ($id !== null && $method === 'GET') {
        respondWithSupportTicketDetail($pdo, $userId, $id);
        return;
    }

    errorResponse('Not found', 404);
}

function createSupportTicket(PDO $pdo, string $userId, array $data): void
{
    $message = trim((string) ($data['message'] ?? ''));
    if ($message === '') {
        errorResponse('message is required');
        return;
    }
    $message = mb_substr($message, 0, 2000);

    $email = isset($data['email']) ? trim((string) $data['email']) : null;
    if ($email === '') $email = null;
    if ($email !== null) $email = mb_substr($email, 0, 255);

    $pdo->prepare(
        'INSERT INTO support_messages (user_id, message, contact_email, created_at) VALUES (?, ?, ?, ?)'
    )->execute([$userId, $message, $email, (int) round(microtime(true) * 1000)]);

    jsonResponse(['ok' => true, 'id' => (int) $pdo->lastInsertId()], 201);
}

function respondWithMySupportTickets(PDO $pdo, string $userId): void
{
    $stmt = $pdo->prepare('SELECT id, message, status, created_at FROM support_messages WHERE user_id = ? ORDER BY created_at DESC');
    $stmt->execute([$userId]);

    jsonResponse(array_map(function (array $row): array {
        return ['id' => (int) $row['id'], 'message' => $row['message'], 'status' => $row['status'], 'createdAt' => (int) $row['created_at']];
    }, $stmt->fetchAll()));
}

/** Ownership-checked: only the ticket's own creator can read or reply to it — `$userId` always
 * comes from the JWT, never the client-supplied `:id`. */
function findOwnedSupportTicket(PDO $pdo, string $userId, string $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM support_messages WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $userId]);
    $ticket = $stmt->fetch();
    return $ticket ?: null;
}

function respondWithSupportTicketDetail(PDO $pdo, string $userId, string $id): void
{
    $ticket = findOwnedSupportTicket($pdo, $userId, $id);
    if (!$ticket) {
        errorResponse('Ticket not found', 404);
        return;
    }

    jsonResponse(['ticket' => supportTicketJson($ticket), 'replies' => supportRepliesJson($pdo, (int) $ticket['id'])]);
}

function replyToSupportTicket(PDO $pdo, string $userId, string $id, array $data): void
{
    $ticket = findOwnedSupportTicket($pdo, $userId, $id);
    if (!$ticket) {
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
        'INSERT INTO support_replies (support_message_id, sender_type, sender_id, body, created_at) VALUES (?, "user", ?, ?, ?)'
    )->execute([$ticket['id'], $userId, $replyBody, (int) round(microtime(true) * 1000)]);

    // A user replying to a ticket the admin had marked resolved means it isn't, in fact, resolved.
    if ($ticket['status'] === 'resolved') {
        $pdo->prepare("UPDATE support_messages SET status = 'open' WHERE id = ?")->execute([$ticket['id']]);
    }

    jsonResponse(['ok' => true], 201);
}

function supportTicketJson(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'message' => $row['message'],
        'status' => $row['status'],
        'createdAt' => (int) $row['created_at'],
    ];
}

function supportRepliesJson(PDO $pdo, int $ticketId): array
{
    $stmt = $pdo->prepare('SELECT id, sender_type, sender_id, body, created_at FROM support_replies WHERE support_message_id = ? ORDER BY created_at ASC');
    $stmt->execute([$ticketId]);

    return array_map(function (array $row): array {
        return [
            'id' => (int) $row['id'],
            'senderType' => $row['sender_type'],
            'body' => $row['body'],
            'createdAt' => (int) $row['created_at'],
        ];
    }, $stmt->fetchAll());
}
