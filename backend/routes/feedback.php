<?php

/**
 * App-facing feature-request board — users submit ideas and upvote others' (see
 * db/schema.sql's feedback_items/feedback_votes). Admin triage lives in routes/admin-content.php.
 *
 * Routes (all require auth, see index.php):
 *   GET  /feedback              -> all items, sorted by votes, with whether the caller has voted
 *   POST /feedback              -> { title, description? } -> creates one, auto-votes it
 *   POST /feedback/:id/vote     -> upvote (idempotent)
 *   DELETE /feedback/:id/vote   -> remove the caller's upvote
 */
function handleFeedback(PDO $pdo, string $userId, string $method, ?array $body, array $segments): void
{
    $id = $segments[1] ?? null;
    $data = $body ?? [];

    if ($id === null && $method === 'GET') {
        respondWithFeedback($pdo, $userId);
        return;
    }
    if ($id === null && $method === 'POST') {
        createFeedbackItem($pdo, $userId, $data);
        return;
    }
    if ($id !== null && ($segments[2] ?? null) === 'vote' && $method === 'POST') {
        voteFeedback($pdo, $userId, $id);
        return;
    }
    if ($id !== null && ($segments[2] ?? null) === 'vote' && $method === 'DELETE') {
        unvoteFeedback($pdo, $userId, $id);
        return;
    }

    errorResponse('Not found', 404);
}

function respondWithFeedback(PDO $pdo, string $userId): void
{
    $stmt = $pdo->prepare(
        "SELECT f.*, (SELECT COUNT(*) FROM feedback_votes fv WHERE fv.feedback_id = f.id AND fv.user_id = ?) AS my_vote
         FROM feedback_items f
         WHERE f.status != 'declined'
         ORDER BY f.votes_count DESC, f.created_at DESC
         LIMIT 200"
    );
    $stmt->execute([$userId]);

    jsonResponse(array_map(fn(array $row) => [
        'id' => (int) $row['id'], 'title' => $row['title'], 'description' => $row['description'],
        'status' => $row['status'], 'votesCount' => (int) $row['votes_count'],
        'hasVoted' => (int) $row['my_vote'] > 0, 'createdAt' => (int) $row['created_at'],
    ], $stmt->fetchAll()));
}

function createFeedbackItem(PDO $pdo, string $userId, array $data): void
{
    $title = trim((string) ($data['title'] ?? ''));
    if ($title === '') {
        errorResponse('title is required');
        return;
    }
    $description = isset($data['description']) ? mb_substr(trim((string) $data['description']), 0, 1000) : null;
    if ($description === '') $description = null;

    $pdo->beginTransaction();
    try {
        $now = (int) round(microtime(true) * 1000);
        $pdo->prepare('INSERT INTO feedback_items (user_id, title, description, votes_count, created_at) VALUES (?, ?, ?, 1, ?)')
            ->execute([$userId, mb_substr($title, 0, 255), $description, $now]);
        $id = (int) $pdo->lastInsertId();
        $pdo->prepare('INSERT INTO feedback_votes (feedback_id, user_id, created_at) VALUES (?, ?, ?)')->execute([$id, $userId, $now]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    jsonResponse(['id' => $id], 201);
}

function voteFeedback(PDO $pdo, string $userId, string $id): void
{
    $existing = $pdo->prepare('SELECT 1 FROM feedback_votes WHERE feedback_id = ? AND user_id = ?');
    $existing->execute([$id, $userId]);
    if ($existing->fetch()) {
        jsonResponse(['ok' => true]);
        return;
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare('INSERT INTO feedback_votes (feedback_id, user_id, created_at) VALUES (?, ?, ?)')
            ->execute([$id, $userId, (int) round(microtime(true) * 1000)]);
        $pdo->prepare('UPDATE feedback_items SET votes_count = votes_count + 1 WHERE id = ?')->execute([$id]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    jsonResponse(['ok' => true]);
}

function unvoteFeedback(PDO $pdo, string $userId, string $id): void
{
    $existing = $pdo->prepare('SELECT 1 FROM feedback_votes WHERE feedback_id = ? AND user_id = ?');
    $existing->execute([$id, $userId]);
    if (!$existing->fetch()) {
        jsonResponse(['ok' => true]);
        return;
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM feedback_votes WHERE feedback_id = ? AND user_id = ?')->execute([$id, $userId]);
        $pdo->prepare('UPDATE feedback_items SET votes_count = GREATEST(0, votes_count - 1) WHERE id = ?')->execute([$id]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    jsonResponse(['ok' => true]);
}
