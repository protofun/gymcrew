<?php

/**
 * One-time (or re-run-anytime) admin account seeder — creates or updates the admin_users row for
 * ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD (set those two temporarily in the live .env first, see
 * .env.example). The password is hashed with bcrypt before it ever touches the database — this
 * script never logs or echoes the plaintext password back.
 *
 * CLI only, same precedent as scripts/off-preload.php and
 * scripts/backfill-founding-athlete-clerk-users.php — trigger it via Hostinger's hPanel -> Advanced
 * -> Cron Jobs (add a job pointing at this file's path, use "Run Now" once, then delete the cron
 * job). Safe to re-run: upserts by email, so re-running after changing ADMIN_SEED_PASSWORD in .env
 * just resets that admin's password — handy for a password reset without touching the database
 * directly.
 *
 * Once the initial admin exists, more admins can be added from the panel itself (Admin Management
 * page) — this script only ever needs to run again if every admin account is somehow locked out.
 */

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    echo 'This script is CLI-only.';
    exit(1);
}

require_once __DIR__ . '/../config.php';

$email = strtolower(trim((string) env('ADMIN_SEED_EMAIL', '')));
$password = (string) env('ADMIN_SEED_PASSWORD', '');

if ($email === '' || $password === '') {
    echo "Set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD in .env first, then run this again.\n";
    exit(1);
}
if (strlen($password) < 8) {
    echo "ADMIN_SEED_PASSWORD is too short (8+ characters).\n";
    exit(1);
}

$pdo = getPdo();
$hash = password_hash($password, PASSWORD_BCRYPT);

$existing = $pdo->prepare('SELECT id FROM admin_users WHERE email = ?');
$existing->execute([$email]);
$row = $existing->fetch();

if ($row) {
    $pdo->prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?')->execute([$hash, $row['id']]);
    echo "Updated existing admin: $email\n";
} else {
    $id = 'admin-' . bin2hex(random_bytes(8));
    $pdo->prepare('INSERT INTO admin_users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)')
        ->execute([$id, $email, $hash, (int) round(microtime(true) * 1000)]);
    echo "Created admin: $email\n";
}

echo "Done. You can now remove ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD from .env if you'd like — they're only read by this script.\n";
