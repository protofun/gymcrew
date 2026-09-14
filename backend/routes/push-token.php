<?php

/**
 * Registers the caller's device for push notifications (see lib/push-notifications.ts and
 * config.php's sendExpoPushNotifications). One token per account — the last device to register
 * wins, same simplification as most single-device-push setups until multi-device is worth it.
 *
 * Routes (requires auth, see index.php):
 *   PUT /push-token -> { token } -> { ok: true }
 */
function handlePushToken(PDO $pdo, string $userId, string $method, ?array $body): void
{
    if ($method !== 'PUT') {
        errorResponse('Method not allowed', 405);
        return;
    }

    $token = trim((string) (($body ?? [])['token'] ?? ''));
    if ($token === '') {
        errorResponse('token is required');
        return;
    }

    $pdo->prepare('INSERT IGNORE INTO users (id) VALUES (?)')->execute([$userId]);
    $pdo->prepare('UPDATE users SET expo_push_token = ? WHERE id = ?')->execute([$token, $userId]);

    jsonResponse(['ok' => true]);
}
