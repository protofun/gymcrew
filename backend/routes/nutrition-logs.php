<?php

function foodLogRowToJson(array $row): array
{
    return [
        'id' => $row['id'],
        'foodId' => $row['food_id'],
        'mealId' => $row['meal_id'],
        'name' => $row['name'],
        'mealSlot' => $row['meal_slot'],
        'quantity' => (float) $row['quantity'],
        'unit' => $row['unit'],
        'calories' => (float) $row['calories'],
        'proteinG' => (float) $row['protein_g'],
        'carbsG' => (float) $row['carbs_g'],
        'fatG' => (float) $row['fat_g'],
        'dateKey' => $row['date_key'],
        'loggedAt' => (int) $row['logged_at'],
    ];
}

/**
 * The daily food log (see db/schema.sql's `food_logs`). `$segments` is the full path split on '/'
 * — `nutrition-logs/copy-day` is a POST sub-action (see below), everything else is the plain
 * REST shape (`nutrition-logs`, `nutrition-logs/:id`).
 */
function handleNutritionLogs(PDO $pdo, string $userId, string $method, ?array $body, array $segments): void
{
    $sub = $segments[1] ?? null;

    if ($method === 'POST' && $sub === 'copy-day') {
        handleCopyDay($pdo, $userId, $body ?? []);
        return;
    }

    if ($method === 'GET') {
        $dateKey = $_GET['date'] ?? null;
        $start = $_GET['start'] ?? null;
        $end = $_GET['end'] ?? null;

        if ($dateKey) {
            $stmt = $pdo->prepare('SELECT * FROM food_logs WHERE user_id = ? AND date_key = ? ORDER BY logged_at ASC');
            $stmt->execute([$userId, $dateKey]);
        } elseif ($start && $end) {
            $stmt = $pdo->prepare('SELECT * FROM food_logs WHERE user_id = ? AND date_key BETWEEN ? AND ? ORDER BY logged_at ASC');
            $stmt->execute([$userId, $start, $end]);
        } else {
            errorResponse('date or start/end is required');
            return;
        }

        jsonResponse(array_map('foodLogRowToJson', $stmt->fetchAll()));
        return;
    }

    if ($method === 'POST') {
        $data = $body ?? [];
        if (!isset($data['name'], $data['dateKey'])) {
            errorResponse('name and dateKey are required');
        }

        $pdo->prepare('INSERT IGNORE INTO users (id) VALUES (?)')->execute([$userId]);

        $entryId = $data['id'] ?? ('food-log-' . bin2hex(random_bytes(8)));
        $loggedAt = $data['loggedAt'] ?? (int) round(microtime(true) * 1000);

        $stmt = $pdo->prepare(
            'INSERT INTO food_logs (id, user_id, food_id, meal_id, name, meal_slot, quantity, unit, calories, protein_g, carbs_g, fat_g, date_key, logged_at)
             VALUES (:id, :user_id, :food_id, :meal_id, :name, :meal_slot, :quantity, :unit, :calories, :protein_g, :carbs_g, :fat_g, :date_key, :logged_at)'
        );
        $stmt->execute([
            ':id' => $entryId,
            ':user_id' => $userId,
            ':food_id' => $data['foodId'] ?? null,
            ':meal_id' => $data['mealId'] ?? null,
            ':name' => $data['name'],
            ':meal_slot' => $data['mealSlot'] ?? 'snacks',
            ':quantity' => $data['quantity'] ?? 1,
            ':unit' => $data['unit'] ?? 'g',
            ':calories' => $data['calories'] ?? 0,
            ':protein_g' => $data['proteinG'] ?? 0,
            ':carbs_g' => $data['carbsG'] ?? 0,
            ':fat_g' => $data['fatG'] ?? 0,
            ':date_key' => $data['dateKey'],
            ':logged_at' => $loggedAt,
        ]);

        $stmt = $pdo->prepare('SELECT * FROM food_logs WHERE id = ? AND user_id = ?');
        $stmt->execute([$entryId, $userId]);
        jsonResponse(foodLogRowToJson($stmt->fetch()), 201);
        return;
    }

    if ($method === 'DELETE' && $sub !== null) {
        $stmt = $pdo->prepare('DELETE FROM food_logs WHERE id = ? AND user_id = ?');
        $stmt->execute([$sub, $userId]);
        jsonResponse(['ok' => true]);
        return;
    }

    errorResponse('Method not allowed', 405);
}

/** Duplicates every entry logged on `fromDateKey` onto `toDateKey` (see NUTRITION.md section 32's
 * "Copy Yesterday") — new ids/timestamps, same snapshot macros, so editing today's copies never
 * touches yesterday's real log. */
function handleCopyDay(PDO $pdo, string $userId, array $body): void
{
    $fromDateKey = $body['fromDateKey'] ?? null;
    $toDateKey = $body['toDateKey'] ?? null;
    if (!$fromDateKey || !$toDateKey) {
        errorResponse('fromDateKey and toDateKey are required');
        return;
    }

    $stmt = $pdo->prepare('SELECT * FROM food_logs WHERE user_id = ? AND date_key = ? ORDER BY logged_at ASC');
    $stmt->execute([$userId, $fromDateKey]);
    $sourceRows = $stmt->fetchAll();

    $insert = $pdo->prepare(
        'INSERT INTO food_logs (id, user_id, food_id, meal_id, name, meal_slot, quantity, unit, calories, protein_g, carbs_g, fat_g, date_key, logged_at)
         VALUES (:id, :user_id, :food_id, :meal_id, :name, :meal_slot, :quantity, :unit, :calories, :protein_g, :carbs_g, :fat_g, :date_key, :logged_at)'
    );

    $copied = [];
    foreach ($sourceRows as $row) {
        $newId = 'food-log-' . bin2hex(random_bytes(8));
        $insert->execute([
            ':id' => $newId,
            ':user_id' => $userId,
            ':food_id' => $row['food_id'],
            ':meal_id' => $row['meal_id'],
            ':name' => $row['name'],
            ':meal_slot' => $row['meal_slot'],
            ':quantity' => $row['quantity'],
            ':unit' => $row['unit'],
            ':calories' => $row['calories'],
            ':protein_g' => $row['protein_g'],
            ':carbs_g' => $row['carbs_g'],
            ':fat_g' => $row['fat_g'],
            ':date_key' => $toDateKey,
            ':logged_at' => (int) round(microtime(true) * 1000),
        ]);
        $row['id'] = $newId;
        $row['date_key'] = $toDateKey;
        $copied[] = foodLogRowToJson($row);
    }

    jsonResponse($copied, 201);
}
