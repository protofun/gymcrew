<?php

/**
 * Marketing plans per social platform: the admin adds their own socials (no fixed list), and tracks
 * post ideas for each one from idea -> planned -> posted. Once posted, performance (views/likes/
 * comments/shares) is logged by hand afterwards — nothing here is fetched from any platform's API.
 * See db/schema.sql's `marketing_socials` / `marketing_post_ideas`.
 *
 * Routes (admin-auth only, dispatched from routes/admin.php):
 *   GET    /admin/marketing/socials       -> every social, in display order
 *   POST   /admin/marketing/socials       -> { name, handle?, color? }
 *   PUT    /admin/marketing/socials/:id   -> partial update
 *   DELETE /admin/marketing/socials/:id   -> also deletes its post ideas (ON DELETE CASCADE)
 *   GET    /admin/marketing/ideas         -> every post idea, across all socials
 *   POST   /admin/marketing/ideas         -> { socialId, title, description?, status?, plannedDate? }
 *   PUT    /admin/marketing/ideas/:id     -> partial update (status, performance fields, notes, ...)
 *   DELETE /admin/marketing/ideas/:id
 */
function respondWithMarketingSocials(PDO $pdo): void
{
    $rows = $pdo->query('SELECT * FROM marketing_socials ORDER BY display_order ASC, created_at ASC')->fetchAll();
    jsonResponse(['socials' => array_map('marketingSocialJson', $rows)]);
}

function marketingSocialJson(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'name' => $row['name'],
        'handle' => $row['handle'],
        'color' => $row['color'],
        'displayOrder' => (int) $row['display_order'],
        'createdAt' => (int) $row['created_at'],
    ];
}

function createMarketingSocial(PDO $pdo, array $data): void
{
    $name = trim((string) ($data['name'] ?? ''));
    if ($name === '') {
        errorResponse('name is required');
        return;
    }
    $maxOrderStmt = $pdo->query('SELECT COALESCE(MAX(display_order), -1) FROM marketing_socials');
    $nextOrder = (int) $maxOrderStmt->fetchColumn() + 1;
    $pdo->prepare('INSERT INTO marketing_socials (name, handle, color, display_order, created_at) VALUES (?, ?, ?, ?, ?)')
        ->execute([
            $name,
            trim((string) ($data['handle'] ?? '')) ?: null,
            trim((string) ($data['color'] ?? '')) ?: null,
            $nextOrder,
            (int) round(microtime(true) * 1000),
        ]);
    jsonResponse(['ok' => true, 'id' => (int) $pdo->lastInsertId()]);
}

function updateMarketingSocial(PDO $pdo, string $id, array $data): void
{
    $fields = [];
    $params = [];
    foreach (['name', 'handle', 'color'] as $key) {
        if (array_key_exists($key, $data)) {
            $value = trim((string) $data[$key]);
            if ($key === 'name' && $value === '') {
                errorResponse('name cannot be empty');
                return;
            }
            $fields[] = "$key = ?";
            $params[] = ($value === '' && $key !== 'name') ? null : $value;
        }
    }
    if (array_key_exists('displayOrder', $data)) {
        $fields[] = 'display_order = ?';
        $params[] = (int) $data['displayOrder'];
    }
    if (empty($fields)) {
        errorResponse('Nothing to update');
        return;
    }
    $params[] = $id;
    $pdo->prepare('UPDATE marketing_socials SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
    jsonResponse(['ok' => true]);
}

function deleteMarketingSocial(PDO $pdo, string $id): void
{
    $pdo->prepare('DELETE FROM marketing_socials WHERE id = ?')->execute([$id]);
    jsonResponse(['ok' => true]);
}

function respondWithMarketingIdeas(PDO $pdo): void
{
    $rows = $pdo->query('SELECT * FROM marketing_post_ideas ORDER BY created_at DESC')->fetchAll();
    jsonResponse(['ideas' => array_map('marketingIdeaJson', $rows)]);
}

function marketingIdeaJson(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'socialId' => (int) $row['social_id'],
        'title' => $row['title'],
        'description' => $row['description'],
        'status' => $row['status'],
        'plannedDate' => $row['planned_date'],
        'postedAt' => $row['posted_at'] !== null ? (int) $row['posted_at'] : null,
        'views' => $row['views'] !== null ? (int) $row['views'] : null,
        'likes' => $row['likes'] !== null ? (int) $row['likes'] : null,
        'comments' => $row['comments'] !== null ? (int) $row['comments'] : null,
        'shares' => $row['shares'] !== null ? (int) $row['shares'] : null,
        'notes' => $row['notes'],
        'createdAt' => (int) $row['created_at'],
        'updatedAt' => (int) $row['updated_at'],
    ];
}

const MARKETING_IDEA_STATUSES = ['idea', 'planned', 'posted'];

function createMarketingIdea(PDO $pdo, array $data): void
{
    $socialId = (int) ($data['socialId'] ?? 0);
    $title = trim((string) ($data['title'] ?? ''));
    if ($socialId <= 0 || $title === '') {
        errorResponse('socialId and title are required');
        return;
    }
    $status = in_array($data['status'] ?? null, MARKETING_IDEA_STATUSES, true) ? $data['status'] : 'idea';
    $plannedDate = trim((string) ($data['plannedDate'] ?? '')) ?: null;
    $now = (int) round(microtime(true) * 1000);
    $pdo->prepare(
        'INSERT INTO marketing_post_ideas (social_id, title, description, status, planned_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    )->execute([$socialId, $title, trim((string) ($data['description'] ?? '')) ?: null, $status, $plannedDate, $now, $now]);
    jsonResponse(['ok' => true, 'id' => (int) $pdo->lastInsertId()]);
}

function updateMarketingIdea(PDO $pdo, string $id, array $data): void
{
    $fields = [];
    $params = [];

    if (array_key_exists('title', $data)) {
        $title = trim((string) $data['title']);
        if ($title === '') {
            errorResponse('title cannot be empty');
            return;
        }
        $fields[] = 'title = ?';
        $params[] = $title;
    }
    if (array_key_exists('description', $data)) {
        $fields[] = 'description = ?';
        $params[] = trim((string) $data['description']) ?: null;
    }
    if (array_key_exists('status', $data)) {
        if (!in_array($data['status'], MARKETING_IDEA_STATUSES, true)) {
            errorResponse('Invalid status');
            return;
        }
        $fields[] = 'status = ?';
        $params[] = $data['status'];
        // Stamps the moment it first becomes "posted" — the client only ever sends the fields the
        // performance form actually edits (views/likes/...), not postedAt itself.
        if ($data['status'] === 'posted') {
            $fields[] = 'posted_at = COALESCE(posted_at, ?)';
            $params[] = (int) round(microtime(true) * 1000);
        }
    }
    if (array_key_exists('plannedDate', $data)) {
        $fields[] = 'planned_date = ?';
        $params[] = trim((string) $data['plannedDate']) ?: null;
    }
    foreach (['views', 'likes', 'comments', 'shares'] as $key) {
        if (array_key_exists($key, $data)) {
            $value = $data[$key];
            $fields[] = "$key = ?";
            $params[] = ($value === null || $value === '') ? null : max(0, (int) $value);
        }
    }
    if (array_key_exists('notes', $data)) {
        $fields[] = 'notes = ?';
        $params[] = trim((string) $data['notes']) ?: null;
    }
    if (empty($fields)) {
        errorResponse('Nothing to update');
        return;
    }
    $fields[] = 'updated_at = ?';
    $params[] = (int) round(microtime(true) * 1000);
    $params[] = $id;
    $pdo->prepare('UPDATE marketing_post_ideas SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
    jsonResponse(['ok' => true]);
}

function deleteMarketingIdea(PDO $pdo, string $id): void
{
    $pdo->prepare('DELETE FROM marketing_post_ideas WHERE id = ?')->execute([$id]);
    jsonResponse(['ok' => true]);
}
