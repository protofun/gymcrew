<?php

/**
 * App-facing (read-only) views of admin-managed content — changelog, FAQ, and system status. All
 * behind the normal Clerk JWT gate, same as routes/announcement.php/roadmap.php. Management lives
 * in routes/admin-content.php.
 *
 * Routes:
 *   GET /changelog -> [{ id, version, title, description, createdAt }]
 *   GET /faq       -> [{ id, question, answer }]
 *   GET /status    -> { status, message, createdAt } | null
 */
function handleChangelog(PDO $pdo, string $method): void
{
    if ($method !== 'GET') {
        errorResponse('Method not allowed', 405);
        return;
    }
    $stmt = $pdo->query('SELECT id, version, title, description, created_at FROM changelog_entries ORDER BY created_at DESC LIMIT 50');
    jsonResponse(array_map(fn(array $row) => [
        'id' => (int) $row['id'], 'version' => $row['version'], 'title' => $row['title'],
        'description' => $row['description'], 'createdAt' => (int) $row['created_at'],
    ], $stmt->fetchAll()));
}

function handleFaq(PDO $pdo, string $method): void
{
    if ($method !== 'GET') {
        errorResponse('Method not allowed', 405);
        return;
    }
    $stmt = $pdo->query('SELECT id, question, answer FROM faq_items ORDER BY display_order ASC, created_at ASC');
    jsonResponse(array_map(fn(array $row) => ['id' => (int) $row['id'], 'question' => $row['question'], 'answer' => $row['answer']], $stmt->fetchAll()));
}

function handleStatus(PDO $pdo, string $method): void
{
    if ($method !== 'GET') {
        errorResponse('Method not allowed', 405);
        return;
    }
    $stmt = $pdo->query('SELECT status, message, created_at FROM status_updates ORDER BY created_at DESC LIMIT 1');
    $row = $stmt->fetch();
    jsonResponse($row ? ['status' => $row['status'], 'message' => $row['message'], 'createdAt' => (int) $row['created_at']] : null);
}
