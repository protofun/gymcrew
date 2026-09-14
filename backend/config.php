<?php

/** Loads KEY=VALUE lines from .env into getenv()/$_ENV — no Composer dependency needed for this. */
function loadEnv(string $path): void
{
    if (!file_exists($path)) {
        return;
    }
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' || str_starts_with($trimmed, '#')) {
            continue;
        }
        [$key, $value] = array_pad(explode('=', $trimmed, 2), 2, '');
        $key = trim($key);
        $value = trim($value);
        if ($key !== '') {
            putenv("$key=$value");
            $_ENV[$key] = $value;
        }
    }
}

loadEnv(__DIR__ . '/.env');

function env(string $key, ?string $default = null): ?string
{
    $value = getenv($key);
    return $value === false ? $default : $value;
}

/** This API's own public base URL (scheme + host + base path), derived from the request rather
 * than hardcoded — works whether it's deployed at a subdomain root or a sub-path (see
 * API_BASE_PATH in .env.example). Used to build absolute URLs for files this backend saves itself
 * (see routes/crews.php's crew-icon upload) so the URL works from any client, not just relative to
 * wherever the request happened to come from. */
function publicBaseUrl(): string
{
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $base = rtrim(str_replace('index.php', '', $_SERVER['SCRIPT_NAME'] ?? ''), '/');
    return "$scheme://$host$base";
}

const UPLOADED_IMAGE_MAX_BYTES = 3 * 1024 * 1024; // decoded size — generous for a compressed square photo
const UPLOADED_IMAGE_EXT_BY_CONTENT_TYPE = ['image/png' => 'png', 'image/webp' => 'webp', 'image/jpeg' => 'jpg'];

/**
 * Decodes a base64 (bare or data-URI) image, validates it, saves it under `uploads/$subdir/`, and
 * returns its public URL — the one shared implementation of "turn a base64 photo into a saved
 * file" for every upload endpoint (crew icons, Founding Athlete profile/crew photos, ...) instead
 * of each one reimplementing it. On any validation failure this already calls `errorResponse`
 * itself and returns null — callers should `return;` immediately when they get null back.
 */
function saveUploadedImage(string $subdir, string $filenamePrefix, string $imageBase64, string $contentType): ?string
{
    $raw = $imageBase64;
    if (str_starts_with($raw, 'data:')) {
        $raw = explode(',', $raw, 2)[1] ?? '';
    }

    $bytes = base64_decode($raw, true);
    if ($bytes === false || $bytes === '') {
        errorResponse('Invalid image data');
        return null;
    }
    if (strlen($bytes) > UPLOADED_IMAGE_MAX_BYTES) {
        errorResponse('Image is too large (max 3MB)');
        return null;
    }

    $ext = UPLOADED_IMAGE_EXT_BY_CONTENT_TYPE[$contentType] ?? 'jpg';

    $uploadDir = __DIR__ . '/uploads/' . $subdir;
    if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
        errorResponse('Could not prepare upload storage', 500);
        return null;
    }

    $filename = $filenamePrefix . '-' . bin2hex(random_bytes(6)) . '.' . $ext;
    if (file_put_contents("$uploadDir/$filename", $bytes) === false) {
        errorResponse('Could not save image', 500);
        return null;
    }

    return publicBaseUrl() . '/uploads/' . $subdir . '/' . $filename;
}

/**
 * Server-to-server call to Clerk's Backend API (never reachable from a client — CLERK_SECRET_KEY
 * never leaves this file). Used only by the Founding Athlete <-> real-app-account bridge (see
 * routes/athlete-signup.php's createClerkUserForFoundingAthlete / createClerkSignInTicket). Returns
 * null on any failure — including CLERK_SECRET_KEY simply not being configured, which callers treat
 * as "that feature is disabled here," never as a fatal error.
 */
function clerkApiRequest(string $method, string $path, array $body = []): ?array
{
    $secretKey = env('CLERK_SECRET_KEY', '');
    if ($secretKey === '') {
        return null;
    }

    $ch = curl_init('https://api.clerk.com/v1' . $path);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $secretKey, 'Content-Type: application/json'],
        CURLOPT_POSTFIELDS => $method === 'GET' ? null : json_encode($body),
        CURLOPT_TIMEOUT => 10,
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false || $curlError !== '' || $status >= 400) {
        error_log("Clerk API $method $path failed (status $status): " . ($curlError ?: $response));
        return null;
    }

    $decoded = json_decode($response, true);
    return is_array($decoded) ? $decoded : null;
}

/**
 * Sends one or more push notifications via Expo's push service — no SDK, no auth token needed for
 * this volume (see https://docs.expo.dev/push-notifications/sending-notifications/#http2-api).
 * `$messages` is a list of `['to' => expoPushToken, 'title' => ..., 'body' => ..., 'data' => [...]]`.
 * Best-effort: logs and swallows any failure rather than throwing, since a push failing must never
 * break the request that triggered it (e.g. logging a PR shouldn't fail just because a crewmate's
 * token has gone stale).
 */
function sendExpoPushNotifications(array $messages): void
{
    if (empty($messages)) {
        return;
    }

    $ch = curl_init('https://exp.host/--/api/v2/push/send');
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => 'POST',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
        CURLOPT_POSTFIELDS => json_encode($messages),
        CURLOPT_TIMEOUT => 10,
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false || $curlError !== '' || $status >= 400) {
        error_log("Expo push send failed (status $status): " . ($curlError ?: $response));
    }
}

function getPdo(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $host = env('DB_HOST', 'localhost');
        $name = env('DB_NAME');
        $user = env('DB_USER');
        $pass = env('DB_PASS');
        $dsn = "mysql:host=$host;dbname=$name;charset=utf8mb4";
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}
