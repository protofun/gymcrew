<?php

function bodyLogRowToJson(array $row): array
{
    return [
        'id' => $row['id'],
        'loggedAt' => (int) $row['logged_at'],
        'weightKg' => (float) $row['weight_kg'],
        'bodyFatPercent' => $row['body_fat_percent'] !== null ? (float) $row['body_fat_percent'] : null,
    ];
}

function handleBodyLog(PDO $pdo, string $userId, string $method, ?array $body, ?string $id): void
{
    if ($method === 'GET') {
        $stmt = $pdo->prepare('SELECT * FROM body_log_entries WHERE user_id = ? ORDER BY logged_at DESC');
        $stmt->execute([$userId]);
        jsonResponse(array_map('bodyLogRowToJson', $stmt->fetchAll()));
        return;
    }

    if ($method === 'POST') {
        $data = $body ?? [];
        if (!isset($data['weightKg'])) {
            errorResponse('weightKg is required');
        }

        $pdo->prepare('INSERT IGNORE INTO users (id) VALUES (?)')->execute([$userId]);

        $entryId = $data['id'] ?? ('body-log-' . (int) round(microtime(true) * 1000));
        $loggedAt = $data['loggedAt'] ?? (int) round(microtime(true) * 1000);
        $bodyFatPercent = $data['bodyFatPercent'] ?? null;

        $stmt = $pdo->prepare(
            'INSERT INTO body_log_entries (id, user_id, logged_at, weight_kg, body_fat_percent) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([$entryId, $userId, $loggedAt, (float) $data['weightKg'], $bodyFatPercent]);

        jsonResponse([
            'id' => $entryId,
            'loggedAt' => (int) $loggedAt,
            'weightKg' => (float) $data['weightKg'],
            'bodyFatPercent' => $bodyFatPercent !== null ? (float) $bodyFatPercent : null,
        ], 201);
        return;
    }

    if ($method === 'DELETE' && $id !== null) {
        $stmt = $pdo->prepare('DELETE FROM body_log_entries WHERE id = ? AND user_id = ?');
        $stmt->execute([$id, $userId]);
        jsonResponse(['ok' => true]);
        return;
    }

    errorResponse('Method not allowed', 405);
}
