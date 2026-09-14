<?php

/**
 * One-time backfill for founding_athletes rows that never got a matching real Clerk user — see
 * routes/athlete-signup.php's createClerkUserForFoundingAthlete, which is called at signup time but
 * is best-effort: it silently no-ops if CLERK_SECRET_KEY wasn't configured yet (see config.php's
 * clerkApiRequest), which is exactly what happened for every athlete who signed up before that key
 * was ever added to the live .env. Without a clerk_user_id, /athlete-app-link (the "Open the App"
 * button on gymcrew.site) has no account to mint a sign-in ticket for, and the person has no real
 * app account to sign into at all — even though their founding_athletes signup itself succeeded.
 *
 * Only the bcrypt hash of each athlete's original password was ever stored, never the plaintext, so
 * this can't recreate their Clerk account with the SAME password — it mints a fresh random one
 * instead. That's fine: nobody needs to know it. The "Open the App" button signs in via a one-time
 * Clerk ticket (src/app/(auth)/auth-handoff.tsx), never a typed password, so it starts working for
 * them the moment this has run — no re-signup, no password reset needed. Anyone who'd rather type a
 * password in the app directly can just use "Forgot password" there once they're in.
 *
 * CLI only. Run this ONCE, after confirming CLERK_SECRET_KEY is actually set in the live .env (see
 * this script's own check below — it refuses to do anything until that's true). Trigger it via
 * Hostinger's hPanel -> Advanced -> Cron Jobs (add a job pointing at this file's path, run it once
 * manually if hPanel offers a "Run Now", then delete the cron job — same mechanism scripts/
 * off-preload.php already documents in backend/README.md).
 *
 * Safe to re-run: only ever touches founding_athletes rows where clerk_user_id IS NULL, so anyone
 * already linked (by this script or by a normal signup after the env var was fixed) is left alone.
 */

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    echo 'This script is CLI-only.';
    exit(1);
}

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../routes/athlete-signup.php';

$secretKey = env('CLERK_SECRET_KEY', '');
if ($secretKey === '') {
    echo "CLERK_SECRET_KEY is not set in .env — add it first (Clerk dashboard -> API Keys -> Secret Key), then run this again.\n";
    exit(1);
}

$pdo = getPdo();
$stmt = $pdo->query('SELECT id, full_name, email FROM founding_athletes WHERE clerk_user_id IS NULL ORDER BY created_at ASC');
$athletes = $stmt->fetchAll();

if (count($athletes) === 0) {
    echo "Nothing to do — every founding athlete already has a linked Clerk account.\n";
    exit(0);
}

echo 'Found ' . count($athletes) . " founding athlete(s) with no linked Clerk account yet.\n\n";

$linked = 0;
$failed = 0;

foreach ($athletes as $athlete) {
    // Never shared with or needed by the athlete — they sign in via the ticket-based "Open the App"
    // flow, not this password.
    $randomPassword = bin2hex(random_bytes(16));
    $clerkUserId = createClerkUserForFoundingAthlete($athlete['email'], $athlete['full_name'], $randomPassword);

    if ($clerkUserId === null) {
        echo "FAILED  {$athlete['email']} (id {$athlete['id']}) — see the PHP error log for the Clerk API response.\n";
        $failed++;
        continue;
    }

    $pdo->prepare('UPDATE founding_athletes SET clerk_user_id = ? WHERE id = ?')->execute([$clerkUserId, $athlete['id']]);
    echo "LINKED  {$athlete['email']} (id {$athlete['id']}) -> Clerk user {$clerkUserId}\n";
    $linked++;
}

echo "\nDone: $linked linked, $failed failed.\n";
if ($failed > 0) {
    echo "Failures are usually an email that already has a Clerk account from some other path (e.g. they'd already signed up in the app directly with that email) — check the error log for the exact reason before re-running.\n";
}
