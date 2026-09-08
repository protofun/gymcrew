<?php

/**
 * Photo upload for a user's own custom foods (see NUTRITION.md section 3's "photo on food
 * detail/edit" ask). Custom foods themselves stay client-side (see data/nutrition-foods.ts's doc
 * comment), but a photo is too big to shuttle around inside the JSON blob every custom-food push
 * already does — so it gets its own upload, exactly like crew icons (crews.php's uploadCrewIcon):
 * accept a base64 photo, save it, hand back a public URL, and the client stores that URL directly
 * on its own Food record's `photoUrl` field.
 */
function handleNutritionFoodPhoto(PDO $pdo, string $userId, string $method, ?array $body): void
{
    if ($method !== 'POST') {
        errorResponse('Method not allowed', 405);
        return;
    }

    $data = $body ?? [];
    $raw = (string) ($data['imageBase64'] ?? '');
    if ($raw === '') {
        errorResponse('imageBase64 is required');
        return;
    }

    $pdo->prepare('INSERT IGNORE INTO users (id) VALUES (?)')->execute([$userId]);

    $contentType = (string) ($data['contentType'] ?? 'image/jpeg');
    $url = saveUploadedImage('food-photos', $userId . '-' . bin2hex(random_bytes(4)), $raw, $contentType);
    if ($url === null) {
        return; // saveUploadedImage already sent the error response
    }

    jsonResponse(['url' => $url], 201);
}
