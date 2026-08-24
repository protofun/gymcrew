<?php

function workoutRowToJson(array $row): array
{
    return [
        'id' => $row['id'],
        'name' => $row['name'],
        'completedAt' => (int) $row['completed_at'],
        'durationSeconds' => (int) $row['duration_seconds'],
        'unit' => $row['unit'],
        'notes' => $row['notes'] ?? '',
        'volumeKg' => (float) $row['volume_kg'],
        'completedSets' => (int) $row['completed_sets'],
        'exercises' => json_decode($row['exercises_json'], true),
        'muscleIntensity' => json_decode($row['muscle_intensity_json'], true),
        'prs' => json_decode($row['prs_json'], true),
    ];
}

function handleWorkouts(PDO $pdo, string $userId, string $method, ?array $body, ?string $id): void
{
    if ($method === 'GET') {
        $stmt = $pdo->prepare('SELECT * FROM workouts WHERE user_id = ? ORDER BY completed_at DESC');
        $stmt->execute([$userId]);
        jsonResponse(array_map('workoutRowToJson', $stmt->fetchAll()));
        return;
    }

    if ($method === 'POST') {
        $data = $body ?? [];
        if (!isset($data['id'], $data['name'], $data['completedAt'])) {
            errorResponse('id, name, and completedAt are required');
        }

        $pdo->prepare('INSERT IGNORE INTO users (id) VALUES (?)')->execute([$userId]);

        $stmt = $pdo->prepare(
            'INSERT INTO workouts
                (id, user_id, name, completed_at, duration_seconds, unit, notes, volume_kg, completed_sets, exercises_json, muscle_intensity_json, prs_json)
             VALUES
                (:id, :user_id, :name, :completed_at, :duration_seconds, :unit, :notes, :volume_kg, :completed_sets, :exercises_json, :muscle_intensity_json, :prs_json)
             ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                completed_at = VALUES(completed_at),
                duration_seconds = VALUES(duration_seconds),
                unit = VALUES(unit),
                notes = VALUES(notes),
                volume_kg = VALUES(volume_kg),
                completed_sets = VALUES(completed_sets),
                exercises_json = VALUES(exercises_json),
                muscle_intensity_json = VALUES(muscle_intensity_json),
                prs_json = VALUES(prs_json)'
        );
        $stmt->execute([
            ':id' => $data['id'],
            ':user_id' => $userId,
            ':name' => $data['name'],
            ':completed_at' => $data['completedAt'],
            ':duration_seconds' => $data['durationSeconds'] ?? 0,
            ':unit' => $data['unit'] ?? 'kg',
            ':notes' => $data['notes'] ?? '',
            ':volume_kg' => $data['volumeKg'] ?? 0,
            ':completed_sets' => $data['completedSets'] ?? 0,
            ':exercises_json' => json_encode($data['exercises'] ?? []),
            ':muscle_intensity_json' => json_encode($data['muscleIntensity'] ?? []),
            ':prs_json' => json_encode($data['prs'] ?? []),
        ]);
        jsonResponse(['ok' => true], 201);
        return;
    }

    if ($method === 'PUT' && $id !== null) {
        $data = $body ?? [];
        $stmt = $pdo->prepare('UPDATE workouts SET notes = ? WHERE id = ? AND user_id = ?');
        $stmt->execute([$data['notes'] ?? '', $id, $userId]);
        jsonResponse(['ok' => true]);
        return;
    }

    errorResponse('Method not allowed', 405);
}
