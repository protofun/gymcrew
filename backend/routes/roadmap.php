<?php

/**
 * App-facing (read-only) view of the roadmap the admin panel manages — see db/schema.sql's
 * roadmap_items and routes/admin.php's roadmap CRUD. Behind the normal Clerk JWT gate (any
 * signed-in user), same as routes/announcement.php.
 *
 * Routes:
 *   GET /roadmap -> [{ id, title, description, status, updatedAt }]
 */
function handleRoadmap(PDO $pdo, string $method): void
{
    if ($method !== 'GET') {
        errorResponse('Method not allowed', 405);
        return;
    }

    $stmt = $pdo->query(
        'SELECT id, title, description, status, updated_at FROM roadmap_items ORDER BY display_order ASC, created_at DESC'
    );

    jsonResponse(array_map(function (array $row): array {
        return [
            'id' => (int) $row['id'],
            'title' => $row['title'],
            'description' => $row['description'],
            'status' => $row['status'],
            'updatedAt' => (int) $row['updated_at'],
        ];
    }, $stmt->fetchAll()));
}
