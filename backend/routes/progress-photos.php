<?php

/**
 * A user's own progress photos — list/create/delete. Photo storage mirrors crew icons and food
 * photos (`saveUploadedImage` in config.php): the client sends a base64 image, this saves it under
 * uploads/progress-photos and stores only the resulting URL. See db/schema.sql's `progress_photos`
 * for the table this reads/writes.
 */
function progressPhotoRowToJson(array $row): array
{
    return [
        'id' => $row['id'],
        'pose' => $row['pose'],
        'photoUrl' => $row['photo_url'],
        'capturedAt' => (int) $row['captured_at'],
    ];
}

function handleProgressPhotos(PDO $pdo, string $userId, string $method, ?array $body, array $segments): void
{
    if ($method === 'GET') {
        $pose = $_GET['pose'] ?? null;
        if ($pose !== null) {
            $stmt = $pdo->prepare('SELECT * FROM progress_photos WHERE user_id = ? AND pose = ? ORDER BY captured_at DESC');
            $stmt->execute([$userId, $pose]);
        } else {
            $stmt = $pdo->prepare('SELECT * FROM progress_photos WHERE user_id = ? ORDER BY captured_at DESC');
            $stmt->execute([$userId]);
        }
        jsonResponse(array_map('progressPhotoRowToJson', $stmt->fetchAll()));
        return;
    }

    if ($method === 'POST') {
        $data = $body ?? [];
        $raw = (string) ($data['imageBase64'] ?? '');
        $pose = (string) ($data['pose'] ?? '');
        if ($raw === '' || $pose === '') {
            errorResponse('imageBase64 and pose are required');
            return;
        }

        $pdo->prepare('INSERT IGNORE INTO users (id) VALUES (?)')->execute([$userId]);

        $contentType = (string) ($data['contentType'] ?? 'image/jpeg');
        $url = saveUploadedImage('progress-photos', $userId . '-' . $pose, $raw, $contentType);
        if ($url === null) {
            return; // saveUploadedImage already sent the error response
        }

        $id = 'progress-photo-' . bin2hex(random_bytes(8));
        $capturedAt = isset($data['capturedAt']) ? (int) $data['capturedAt'] : (int) round(microtime(true) * 1000);
        $createdAt = (int) round(microtime(true) * 1000);

        $stmt = $pdo->prepare(
            'INSERT INTO progress_photos (id, user_id, pose, photo_url, captured_at, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$id, $userId, $pose, $url, $capturedAt, $createdAt]);

        jsonResponse(['id' => $id, 'pose' => $pose, 'photoUrl' => $url, 'capturedAt' => $capturedAt], 201);
        return;
    }

    if ($method === 'DELETE') {
        $id = $segments[1] ?? null;
        if ($id === null) {
            errorResponse('Photo id is required');
            return;
        }
        $stmt = $pdo->prepare('DELETE FROM progress_photos WHERE id = ? AND user_id = ?');
        $stmt->execute([$id, $userId]);
        jsonResponse(['ok' => true]);
        return;
    }

    errorResponse('Method not allowed', 405);
}
