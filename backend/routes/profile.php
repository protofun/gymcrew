<?php

/** camelCase JSON key => snake_case DB column, for the profile fields the app actually persists. */
const PROFILE_COLUMN_MAP = [
    'email' => 'email',
    'fullName' => 'full_name',
    'gender' => 'gender',
    'heightCm' => 'height_cm',
    'weightKg' => 'weight_kg',
    'age' => 'age',
    'gymName' => 'gym_name',
    'goal' => 'goal',
    'experienceLevel' => 'experience_level',
];

function profileRowToJson(?array $row, string $userId): array
{
    if (!$row) {
        return ['id' => $userId];
    }
    $json = ['id' => $row['id']];
    foreach (PROFILE_COLUMN_MAP as $jsonKey => $column) {
        $value = $row[$column];
        if ($value === null) {
            $json[$jsonKey] = null;
        } elseif ($jsonKey === 'heightCm' || $jsonKey === 'age') {
            $json[$jsonKey] = (int) $value;
        } elseif ($jsonKey === 'weightKg') {
            $json[$jsonKey] = (float) $value;
        } else {
            $json[$jsonKey] = $value;
        }
    }
    return $json;
}

function handleProfile(PDO $pdo, string $userId, string $method, ?array $body): void
{
    if ($method === 'GET') {
        $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        jsonResponse(profileRowToJson($stmt->fetch() ?: null, $userId));
        return;
    }

    if ($method === 'PUT') {
        $data = $body ?? [];

        // Ensure the row exists, then only touch columns the caller actually sent — this is a
        // partial update (Partial<OnboardingData> on the client), not a full replace.
        $pdo->prepare('INSERT IGNORE INTO users (id) VALUES (?)')->execute([$userId]);

        $sets = [];
        $values = [':id' => $userId];
        foreach (PROFILE_COLUMN_MAP as $jsonKey => $column) {
            if (array_key_exists($jsonKey, $data)) {
                $sets[] = "$column = :$column";
                $values[":$column"] = $data[$jsonKey];
            }
        }

        if ($sets) {
            $sql = 'UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = :id';
            $pdo->prepare($sql)->execute($values);
        }

        $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        jsonResponse(profileRowToJson($stmt->fetch() ?: null, $userId));
        return;
    }

    errorResponse('Method not allowed', 405);
}
