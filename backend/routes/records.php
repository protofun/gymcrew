<?php

function recordRowToJson(array $row): array
{
    return [
        'exerciseId' => $row['exercise_id'],
        'exerciseName' => $row['exercise_name'],
        'bestWeightKg' => (float) $row['best_weight_kg'],
        'bestReps' => (int) $row['best_reps'],
        'achievedAt' => (int) $row['achieved_at'],
    ];
}

function handleRecords(PDO $pdo, string $userId, string $method, ?array $body): void
{
    if ($method === 'GET') {
        $stmt = $pdo->prepare('SELECT * FROM personal_records WHERE user_id = ?');
        $stmt->execute([$userId]);
        $records = [];
        foreach ($stmt->fetchAll() as $row) {
            $records[$row['exercise_id']] = recordRowToJson($row);
        }
        jsonResponse($records);
        return;
    }

    if ($method === 'POST') {
        $data = $body ?? [];
        if (!isset($data['exerciseId'], $data['exerciseName'], $data['weightKg'], $data['reps'])) {
            errorResponse('exerciseId, exerciseName, weightKg, and reps are required');
        }

        $exerciseId = $data['exerciseId'];
        $weightKg = (float) $data['weightKg'];
        $reps = (int) $data['reps'];

        $pdo->prepare('INSERT IGNORE INTO users (id) VALUES (?)')->execute([$userId]);

        $stmt = $pdo->prepare('SELECT best_weight_kg, achieved_at FROM personal_records WHERE user_id = ? AND exercise_id = ?');
        $stmt->execute([$userId, $exerciseId]);
        $existing = $stmt->fetch();

        $previousBestKg = $existing ? (float) $existing['best_weight_kg'] : null;
        $previousAchievedAt = $existing ? (int) $existing['achieved_at'] : null;
        $isNewRecord = $existing === false || $weightKg > $previousBestKg;

        if ($isNewRecord) {
            $achievedAt = (int) round(microtime(true) * 1000);
            $upsert = $pdo->prepare(
                'INSERT INTO personal_records (user_id, exercise_id, exercise_name, best_weight_kg, best_reps, achieved_at)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    exercise_name = VALUES(exercise_name),
                    best_weight_kg = VALUES(best_weight_kg),
                    best_reps = VALUES(best_reps),
                    achieved_at = VALUES(achieved_at)'
            );
            $upsert->execute([$userId, $exerciseId, $data['exerciseName'], $weightKg, $reps, $achievedAt]);
        }

        jsonResponse([
            'isNewRecord' => $isNewRecord,
            'previousBestKg' => $previousBestKg,
            'previousAchievedAt' => $previousAchievedAt,
        ]);
        return;
    }

    errorResponse('Method not allowed', 405);
}
