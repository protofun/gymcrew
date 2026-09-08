<?php

/**
 * Public waitlist signups from the marketing landing page
 * (landingpage/GymCrew Landing (standalone).html) — see db/schema.sql's `waitlist_signups`.
 * No auth: a visitor joining the waitlist has no account yet. Wired into index.php as the one
 * other public route besides username-available, ahead of the JWT gate.
 *
 * Routes:
 *   POST /waitlist  -> { email, source? } -> stores it (idempotent — resubmitting the same email
 *                       is still an "ok" response, not an error)
 */
function handleWaitlistSignup(PDO $pdo, array $data): void
{
    $email = strtolower(trim((string) ($data['email'] ?? '')));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        errorResponse('A valid email is required');
        return;
    }

    $source = isset($data['source']) ? trim((string) $data['source']) : null;
    if ($source === '') {
        $source = null;
    }

    $now = (int) round(microtime(true) * 1000);
    $pdo->prepare('INSERT IGNORE INTO waitlist_signups (email, source, created_at) VALUES (?, ?, ?)')
        ->execute([$email, $source, $now]);

    jsonResponse(['ok' => true]);
}
