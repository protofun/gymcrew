<?php

function handleProfileLevel(PDO $pdo, string $userId, string $method, ?array $body): void
{
    if ($method === 'GET') {
        $stmt = $pdo->prepare('SELECT xp, division, division_history_json FROM profile_level WHERE user_id = ?');
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        if (!$row) {
            jsonResponse(null);
            return;
        }
        jsonResponse([
            'xp' => (int) $row['xp'],
            'division' => $row['division'],
            'divisionHistory' => json_decode($row['division_history_json'], true),
        ]);
        return;
    }

    if ($method === 'PUT') {
        $data = $body ?? [];
        if (!isset($data['xp'], $data['division'], $data['divisionHistory'])) {
            errorResponse('xp, division, and divisionHistory are required');
        }

        $stmt = $pdo->prepare(
            'INSERT INTO profile_level (user_id, xp, division, division_history_json, updated_at)
             VALUES (:user_id, :xp, :division, :division_history_json, :updated_at)
             ON DUPLICATE KEY UPDATE
                xp = VALUES(xp),
                division = VALUES(division),
                division_history_json = VALUES(division_history_json),
                updated_at = VALUES(updated_at)'
        );
        $stmt->execute([
            ':user_id' => $userId,
            ':xp' => (int) $data['xp'],
            ':division' => $data['division'],
            ':division_history_json' => json_encode($data['divisionHistory']),
            ':updated_at' => (int) round(microtime(true) * 1000),
        ]);
        jsonResponse(['ok' => true]);
        return;
    }

    errorResponse('Method not allowed', 405);
}
