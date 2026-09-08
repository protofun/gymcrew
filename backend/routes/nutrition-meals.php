<?php

function mealRowToJson(array $row): array
{
    return [
        'id' => $row['id'],
        'kind' => $row['kind'],
        'name' => $row['name'],
        'description' => $row['description'] ?? '',
        'items' => json_decode($row['items_json'], true),
        'totalCalories' => (float) $row['total_calories'],
        'totalProteinG' => (float) $row['total_protein_g'],
        'totalCarbsG' => (float) $row['total_carbs_g'],
        'totalFatG' => (float) $row['total_fat_g'],
        'createdAt' => (int) $row['created_at'],
        'updatedAt' => (int) $row['updated_at'],
    ];
}

/** Saved meals & shakes (see db/schema.sql's `meals` table — `kind` is the only thing telling them
 * apart, matching the app's own "same data shape, different presentation" treatment of the two). */
function handleNutritionMeals(PDO $pdo, string $userId, string $method, ?array $body, ?string $id): void
{
    if ($method === 'GET') {
        $stmt = $pdo->prepare('SELECT * FROM meals WHERE user_id = ? ORDER BY updated_at DESC');
        $stmt->execute([$userId]);
        jsonResponse(array_map('mealRowToJson', $stmt->fetchAll()));
        return;
    }

    if ($method === 'POST') {
        $data = $body ?? [];
        if (!isset($data['name'], $data['items']) || !is_array($data['items'])) {
            errorResponse('name and items are required');
        }

        $pdo->prepare('INSERT IGNORE INTO users (id) VALUES (?)')->execute([$userId]);

        $mealId = $data['id'] ?? ('meal-' . bin2hex(random_bytes(8)));
        $now = (int) round(microtime(true) * 1000);

        $stmt = $pdo->prepare(
            'INSERT INTO meals (id, user_id, kind, name, description, items_json, total_calories, total_protein_g, total_carbs_g, total_fat_g, created_at, updated_at)
             VALUES (:id, :user_id, :kind, :name, :description, :items_json, :total_calories, :total_protein_g, :total_carbs_g, :total_fat_g, :created_at, :updated_at)'
        );
        $stmt->execute([
            ':id' => $mealId,
            ':user_id' => $userId,
            ':kind' => $data['kind'] ?? 'meal',
            ':name' => $data['name'],
            ':description' => $data['description'] ?? '',
            ':items_json' => json_encode($data['items']),
            ':total_calories' => $data['totalCalories'] ?? 0,
            ':total_protein_g' => $data['totalProteinG'] ?? 0,
            ':total_carbs_g' => $data['totalCarbsG'] ?? 0,
            ':total_fat_g' => $data['totalFatG'] ?? 0,
            ':created_at' => $now,
            ':updated_at' => $now,
        ]);

        $stmt = $pdo->prepare('SELECT * FROM meals WHERE id = ? AND user_id = ?');
        $stmt->execute([$mealId, $userId]);
        jsonResponse(mealRowToJson($stmt->fetch()), 201);
        return;
    }

    if ($method === 'PUT' && $id !== null) {
        $data = $body ?? [];
        $stmt = $pdo->prepare(
            'UPDATE meals SET name = ?, description = ?, items_json = ?, total_calories = ?, total_protein_g = ?, total_carbs_g = ?, total_fat_g = ?, updated_at = ?
             WHERE id = ? AND user_id = ?'
        );
        $stmt->execute([
            $data['name'] ?? '',
            $data['description'] ?? '',
            json_encode($data['items'] ?? []),
            $data['totalCalories'] ?? 0,
            $data['totalProteinG'] ?? 0,
            $data['totalCarbsG'] ?? 0,
            $data['totalFatG'] ?? 0,
            (int) round(microtime(true) * 1000),
            $id,
            $userId,
        ]);

        $stmt = $pdo->prepare('SELECT * FROM meals WHERE id = ? AND user_id = ?');
        $stmt->execute([$id, $userId]);
        $row = $stmt->fetch();
        if (!$row) {
            errorResponse('Meal not found', 404);
        }
        jsonResponse(mealRowToJson($row));
        return;
    }

    if ($method === 'DELETE' && $id !== null) {
        $stmt = $pdo->prepare('DELETE FROM meals WHERE id = ? AND user_id = ?');
        $stmt->execute([$id, $userId]);
        jsonResponse(['ok' => true]);
        return;
    }

    errorResponse('Method not allowed', 405);
}
