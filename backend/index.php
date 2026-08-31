<?php

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/routes/profile.php';
require_once __DIR__ . '/routes/account.php';
require_once __DIR__ . '/routes/profile_level.php';
require_once __DIR__ . '/routes/workouts.php';
require_once __DIR__ . '/routes/records.php';
require_once __DIR__ . '/routes/body_log.php';
require_once __DIR__ . '/routes/crews.php';
require_once __DIR__ . '/routes/crew-wars.php';
require_once __DIR__ . '/routes/crew-activity-events.php';
require_once __DIR__ . '/routes/crew-duels.php';
require_once __DIR__ . '/routes/admin-challenges.php';
require_once __DIR__ . '/routes/state.php';

header('Access-Control-Allow-Origin: ' . env('CORS_ORIGIN', '*'));
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Strips a configurable base path (e.g. "/api" when this lives at a domain root alongside other
// things) so routes below only ever see "profile", "workouts", "workouts/123", etc. Computed before
// the auth gate below since the one public route (username-available) needs it too.
$path = trim((string) parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$basePath = trim((string) env('API_BASE_PATH', ''), '/');
if ($basePath !== '' && str_starts_with($path, $basePath)) {
    $path = trim(substr($path, strlen($basePath)), '/');
}

// Public, no auth — see handleUsernameAvailability's doc comment for why this one route is exempt
// from the JWT gate below (the onboarding wizard needs it before an account exists).
if ($path === 'username-available' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    handleUsernameAvailability(getPdo(), $_GET['username'] ?? null);
    exit;
}

$token = getBearerToken();
if (!$token) {
    errorResponse('Missing Authorization header', 401);
}

$jwksUrl = env('CLERK_JWKS_URL', '');
if (!$jwksUrl) {
    errorResponse('Server misconfigured: CLERK_JWKS_URL is not set', 500);
}

$userId = verifyClerkJwt($token, $jwksUrl);
if (!$userId) {
    errorResponse('Invalid or expired token', 401);
}

$segments = $path === '' ? [] : explode('/', $path);
$resource = $segments[0] ?? '';
$resourceId = $segments[1] ?? null;
$method = $_SERVER['REQUEST_METHOD'];

$body = null;
if (in_array($method, ['POST', 'PUT'], true)) {
    $raw = file_get_contents('php://input');
    $decoded = $raw ? json_decode($raw, true) : [];
    $body = is_array($decoded) ? $decoded : [];
}

$pdo = getPdo();

switch ($resource) {
    case 'profile':
        handleProfile($pdo, $userId, $method, $body);
        break;
    case 'account':
        handleAccount($pdo, $userId, $method);
        break;
    case 'profile-level':
        handleProfileLevel($pdo, $userId, $method, $body);
        break;
    case 'workouts':
        handleWorkouts($pdo, $userId, $method, $body, $resourceId);
        break;
    case 'records':
        handleRecords($pdo, $userId, $method, $body, $segments);
        break;
    case 'body-log':
        handleBodyLog($pdo, $userId, $method, $body, $resourceId);
        break;
    case 'crews':
        handleCrews($pdo, $userId, $method, $body, $segments);
        break;
    case 'crew-wars':
        handleCrewWars($pdo, $userId, $method, $body, $segments);
        break;
    case 'crew-activity-events':
        handleCrewActivityEvents($pdo, $userId, $method, $body);
        break;
    case 'crew-duels':
        handleCrewDuels($pdo, $userId, $method, $body, $segments);
        break;
    case 'admin-challenges':
        handleAdminChallenges($pdo, $userId, $method, $body, $segments);
        break;
    case 'state':
        handleState($pdo, $userId, $method, $body, $resourceId);
        break;
    default:
        errorResponse('Not found', 404);
}
