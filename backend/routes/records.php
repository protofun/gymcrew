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

function handleRecords(PDO $pdo, string $userId, string $method, ?array $body, array $segments): void
{
    if (($segments[1] ?? null) === 'history' && $method === 'GET') {
        respondWithRecordHistory($pdo, $userId, $segments[2] ?? '');
        return;
    }

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

            // Append-only — see db/schema.sql's `personal_record_history` comment. This is what
            // makes a genuine multi-tier "Rank History" timeline possible instead of an invented one.
            $pdo->prepare(
                'INSERT INTO personal_record_history (user_id, exercise_id, weight_kg, reps, achieved_at) VALUES (?, ?, ?, ?, ?)'
            )->execute([$userId, $exerciseId, $weightKg, $reps, $achievedAt]);
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

function respondWithRecordHistory(PDO $pdo, string $userId, string $exerciseId): void
{
    if ($exerciseId === '') {
        errorResponse('exerciseId is required', 400);
        return;
    }

    $stmt = $pdo->prepare(
        'SELECT weight_kg, reps, achieved_at FROM personal_record_history WHERE user_id = ? AND exercise_id = ? ORDER BY achieved_at ASC'
    );
    $stmt->execute([$userId, $exerciseId]);

    $rows = array_map(function (array $row): array {
        return [
            'weightKg' => (float) $row['weight_kg'],
            'reps' => (int) $row['reps'],
            'achievedAt' => (int) $row['achieved_at'],
        ];
    }, $stmt->fetchAll());

    jsonResponse($rows);
}
