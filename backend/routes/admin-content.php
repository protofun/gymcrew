<?php

/**
 * Admin panel — content management for the app-facing changelog, FAQ, feedback board, and status
 * page. Dispatched from routes/admin.php's handleAdmin(). The app-facing read side of each of
 * these lives in routes/content.php (changelog/FAQ/status) and routes/feedback.php.
 */

// ---- Changelog ----

function respondWithChangelog(PDO $pdo): void
{
    $stmt = $pdo->query('SELECT * FROM changelog_entries ORDER BY created_at DESC LIMIT 100');
    jsonResponse(array_map(fn(array $row) => [
        'id' => (int) $row['id'], 'version' => $row['version'], 'title' => $row['title'],
        'description' => $row['description'], 'createdAt' => (int) $row['created_at'],
    ], $stmt->fetchAll()));
}

function createChangelogEntry(PDO $pdo, string $adminId, array $data): void
{
    $version = trim((string) ($data['version'] ?? ''));
    $title = trim((string) ($data['title'] ?? ''));
    if ($version === '' || $title === '') {
        errorResponse('version and title are required');
        return;
    }
    $description = isset($data['description']) ? mb_substr(trim((string) $data['description']), 0, 2000) : null;
    if ($description === '') $description = null;

    $pdo->prepare('INSERT INTO changelog_entries (version, title, description, created_by, created_at) VALUES (?, ?, ?, ?, ?)')
        ->execute([mb_substr($version, 0, 32), mb_substr($title, 0, 255), $description, $adminId, (int) round(microtime(true) * 1000)]);

    jsonResponse(['id' => (int) $pdo->lastInsertId()], 201);
}

function deleteChangelogEntry(PDO $pdo, string $id): void
{
    $pdo->prepare('DELETE FROM changelog_entries WHERE id = ?')->execute([$id]);
    jsonResponse(['ok' => true]);
}

// ---- FAQ ----

function respondWithAdminFaq(PDO $pdo): void
{
    $stmt = $pdo->query('SELECT * FROM faq_items ORDER BY display_order ASC, created_at ASC');
    jsonResponse(array_map(fn(array $row) => [
        'id' => (int) $row['id'], 'question' => $row['question'], 'answer' => $row['answer'], 'displayOrder' => (int) $row['display_order'],
    ], $stmt->fetchAll()));
}

function createFaqItem(PDO $pdo, array $data): void
{
    $question = trim((string) ($data['question'] ?? ''));
    $answer = trim((string) ($data['answer'] ?? ''));
    if ($question === '' || $answer === '') {
        errorResponse('question and answer are required');
        return;
    }

    $pdo->prepare('INSERT INTO faq_items (question, answer, display_order, created_at) VALUES (?, ?, ?, ?)')
        ->execute([mb_substr($question, 0, 255), mb_substr($answer, 0, 2000), (int) ($data['displayOrder'] ?? 0), (int) round(microtime(true) * 1000)]);

    jsonResponse(['id' => (int) $pdo->lastInsertId()], 201);
}

function updateFaqItem(PDO $pdo, string $id, array $data): void
{
    $sets = [];
    $values = [];
    if (array_key_exists('question', $data)) { $sets[] = 'question = ?'; $values[] = mb_substr(trim((string) $data['question']), 0, 255); }
    if (array_key_exists('answer', $data)) { $sets[] = 'answer = ?'; $values[] = mb_substr(trim((string) $data['answer']), 0, 2000); }
    if (array_key_exists('displayOrder', $data)) { $sets[] = 'display_order = ?'; $values[] = (int) $data['displayOrder']; }

    if (!$sets) {
        errorResponse('Nothing to update');
        return;
    }
    $values[] = $id;
    $pdo->prepare('UPDATE faq_items SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($values);
    jsonResponse(['ok' => true]);
}

function deleteFaqItem(PDO $pdo, string $id): void
{
    $pdo->prepare('DELETE FROM faq_items WHERE id = ?')->execute([$id]);
    jsonResponse(['ok' => true]);
}

// ---- Feedback board (admin triage) ----

const FEEDBACK_STATUSES = ['open', 'planned', 'declined', 'shipped'];

function respondWithAdminFeedback(PDO $pdo): void
{
    $stmt = $pdo->query(
        "SELECT f.*, u.full_name FROM feedback_items f LEFT JOIN users u ON u.id = f.user_id ORDER BY f.votes_count DESC, f.created_at DESC LIMIT 200"
    );
    jsonResponse(array_map(fn(array $row) => [
        'id' => (int) $row['id'], 'title' => $row['title'], 'description' => $row['description'],
        'status' => $row['status'], 'votesCount' => (int) $row['votes_count'],
        'userName' => $row['full_name'] ?: 'Unknown', 'createdAt' => (int) $row['created_at'],
    ], $stmt->fetchAll()));
}

function updateAdminFeedback(PDO $pdo, string $id, array $data): void
{
    $status = $data['status'] ?? null;
    if (!in_array($status, FEEDBACK_STATUSES, true)) {
        errorResponse('A valid status is required');
        return;
    }
    $pdo->prepare('UPDATE feedback_items SET status = ? WHERE id = ?')->execute([$status, $id]);
    jsonResponse(['ok' => true]);
}

function deleteAdminFeedback(PDO $pdo, string $id): void
{
    $pdo->prepare('DELETE FROM feedback_items WHERE id = ?')->execute([$id]);
    jsonResponse(['ok' => true]);
}

// ---- Status page ----

function respondWithStatusHistory(PDO $pdo): void
{
    $stmt = $pdo->query('SELECT * FROM status_updates ORDER BY created_at DESC LIMIT 50');
    jsonResponse(array_map(fn(array $row) => [
        'id' => (int) $row['id'], 'status' => $row['status'], 'message' => $row['message'], 'createdAt' => (int) $row['created_at'],
    ], $stmt->fetchAll()));
}

function createStatusUpdate(PDO $pdo, string $adminId, array $data): void
{
    $status = $data['status'] ?? null;
    if (!in_array($status, ['operational', 'degraded', 'down'], true)) {
        errorResponse('A valid status is required');
        return;
    }
    $message = isset($data['message']) ? mb_substr(trim((string) $data['message']), 0, 500) : null;
    if ($message === '') $message = null;

    $pdo->prepare('INSERT INTO status_updates (status, message, created_by, created_at) VALUES (?, ?, ?, ?)')
        ->execute([$status, $message, $adminId, (int) round(microtime(true) * 1000)]);

    jsonResponse(['ok' => true], 201);
}
