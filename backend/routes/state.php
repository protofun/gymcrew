<?php

/**
 * Generic per-user JSON blob storage — GET/PUT a whole object under an arbitrary `$key` (e.g.
 * "goals", "currency", "cosmetics"). See db/schema.sql's `user_state` table for why this is one
 * shared table/route instead of one per store.
 */
function handleState(PDO $pdo, string $userId, string $method, ?array $body, ?string $key): void
{
    if (!$key) {
        errorResponse('Missing state key', 400);
    }

    if ($method === 'GET') {
        $stmt = $pdo->prepare('SELECT data_json FROM user_state WHERE user_id = ? AND state_key = ?');
        $stmt->execute([$userId, $key]);
        $row = $stmt->fetch();
        jsonResponse($row ? json_decode($row['data_json'], true) : null);
        return;
    }

    if ($method === 'PUT') {
        $pdo->prepare('INSERT IGNORE INTO users (id) VALUES (?)')->execute([$userId]);

        $stmt = $pdo->prepare(
            'INSERT INTO user_state (user_id, state_key, data_json, updated_at)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE data_json = VALUES(data_json), updated_at = VALUES(updated_at)'
        );
        $stmt->execute([$userId, $key, json_encode($body ?? []), (int) round(microtime(true) * 1000)]);
        jsonResponse(['ok' => true]);
        return;
    }

    errorResponse('Method not allowed', 405);
}
