<?php

function waterLogRowToJson(array $row): array
{
    return [
        'id' => $row['id'],
        'amountMl' => (int) $row['amount_ml'],
        'dateKey' => $row['date_key'],
        'loggedAt' => (int) $row['logged_at'],
    ];
}

/** Daily water intake (see db/schema.sql's `water_logs`) — same flat-log shape as food_logs, just
 * simpler (no macros, no meal slot). */
function handleNutritionWater(PDO $pdo, string $userId, string $method, ?array $body, ?string $id): void
{
    if ($method === 'GET') {
        $dateKey = $_GET['date'] ?? null;
        $start = $_GET['start'] ?? null;
        $end = $_GET['end'] ?? null;

        if ($dateKey) {
            $stmt = $pdo->prepare('SELECT * FROM water_logs WHERE user_id = ? AND date_key = ? ORDER BY logged_at ASC');
            $stmt->execute([$userId, $dateKey]);
        } elseif ($start && $end) {
            $stmt = $pdo->prepare('SELECT * FROM water_logs WHERE user_id = ? AND date_key BETWEEN ? AND ? ORDER BY logged_at ASC');
            $stmt->execute([$userId, $start, $end]);
        } else {
            errorResponse('date or start/end is required');
            return;
        }

        jsonResponse(array_map('waterLogRowToJson', $stmt->fetchAll()));
        return;
    }

    if ($method === 'POST') {
        $data = $body ?? [];
        if (!isset($data['id'], $data['amountMl'], $data['dateKey'])) {
            errorResponse('id, amountMl, and dateKey are required');
        }

        $pdo->prepare('INSERT IGNORE INTO users (id) VALUES (?)')->execute([$userId]);

        $stmt = $pdo->prepare('INSERT INTO water_logs (id, user_id, amount_ml, date_key, logged_at) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$data['id'], $userId, $data['amountMl'], $data['dateKey'], $data['loggedAt'] ?? (int) round(microtime(true) * 1000)]);
        jsonResponse(['ok' => true], 201);
        return;
    }

    if ($method === 'DELETE' && $id !== null) {
        $stmt = $pdo->prepare('DELETE FROM water_logs WHERE id = ? AND user_id = ?');
        $stmt->execute([$id, $userId]);
        jsonResponse(['ok' => true]);
        return;
    }

    errorResponse('Method not allowed', 405);
}
