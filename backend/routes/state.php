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

/**
 * Reads several state keys in one round trip — on sign-in, the app pulls ~15 of these generic
 * blobs (goals, currency, cosmetics, ...) plus the active-workout draft, and issuing that many
 * separate HTTPS requests to this backend was the main reason Home/Crew took so long to show real
 * data (each request pays its own full network + PHP bootstrap cost, and the browser only runs a
 * handful of them at once). One query for every key at once, keyed by the comma-separated `keys`
 * query param. See lib/backend-sync.ts's `pullState`, which batches its callers into this.
 */
function handleStateBatch(PDO $pdo, string $userId, string $method, ?string $keysParam): void
{
    if ($method !== 'GET') {
        errorResponse('Method not allowed', 405);
    }

    $keys = array_values(array_filter(array_map('trim', explode(',', (string) $keysParam))));
    if (!$keys) {
        jsonResponse((object) []);
        return;
    }

    $placeholders = implode(',', array_fill(0, count($keys), '?'));
    $stmt = $pdo->prepare("SELECT state_key, data_json FROM user_state WHERE user_id = ? AND state_key IN ($placeholders)");
    $stmt->execute([$userId, ...$keys]);

    // Every requested key comes back in the result, `null` for ones with nothing saved yet — same
    // per-key contract as the single-key GET above, just batched.
    $result = array_fill_keys($keys, null);
    while ($row = $stmt->fetch()) {
        $result[$row['state_key']] = json_decode($row['data_json'], true);
    }
    jsonResponse($result);
}
