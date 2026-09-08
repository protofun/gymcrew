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
require_once __DIR__ . '/routes/crew-live-sessions.php';
require_once __DIR__ . '/routes/crew-activity-events.php';
require_once __DIR__ . '/routes/crew-duels.php';
require_once __DIR__ . '/routes/admin-challenges.php';
require_once __DIR__ . '/routes/nutrition-meals.php';
require_once __DIR__ . '/routes/nutrition-logs.php';
require_once __DIR__ . '/routes/nutrition-off.php';
require_once __DIR__ . '/routes/nutrition-food-photo.php';
require_once __DIR__ . '/routes/state.php';
require_once __DIR__ . '/routes/waitlist.php';
require_once __DIR__ . '/routes/athlete-signup.php';

// Strips a configurable base path (e.g. "/api" when this lives at a domain root alongside other
// things) so routes below only ever see "profile", "workouts", "workouts/123", etc. Computed before
// the CORS/OPTIONS handling below since the waitlist route's permissive CORS override needs to know
// the path even for a preflight OPTIONS request, not just the real POST that follows it.
$path = trim((string) parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$basePath = trim((string) env('API_BASE_PATH', ''), '/');
if ($basePath !== '' && str_starts_with($path, $basePath)) {
    $path = trim(substr($path, strlen($basePath)), '/');
}

// These routes are allowed from any origin, not just CORS_ORIGIN (which locks the rest of the API
// to the PWA's own domain) — they're all called from the marketing site (landingpage/*.html),
// separate static pages, possibly on their own domain, with no Clerk session at all. Low
// sensitivity either way. This has to be decided before the OPTIONS short-circuit below, since a
// cross-origin browser sends the *preflight* OPTIONS request first and never gets to the real
// request if that preflight's CORS header doesn't already allow it.
$publicMarketingPaths = [
    'waitlist', 'athlete-signup', 'athlete-join', 'athlete-login', 'athlete-profile', 'athlete-crew-icon',
    'athlete-username-available', 'athlete-crewname-available', 'athlete-crew-by-invite', 'athlete-app-link',
];
$corsOrigin = in_array($path, $publicMarketingPaths, true) ? '*' : env('CORS_ORIGIN', '*');
header('Access-Control-Allow-Origin: ' . $corsOrigin);
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Public, no auth — see handleUsernameAvailability's doc comment for why this one route is exempt
// from the JWT gate below (the onboarding wizard needs it before an account exists).
if ($path === 'username-available' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    handleUsernameAvailability(getPdo(), $_GET['username'] ?? null);
    exit;
}

// Public, no auth — see the CORS comment above for why these are also exempt from the JWT gate.
if ($path === 'waitlist' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $decoded = $raw ? json_decode($raw, true) : [];
    handleWaitlistSignup(getPdo(), is_array($decoded) ? $decoded : []);
    exit;
}

if ($path === 'athlete-signup' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $decoded = $raw ? json_decode($raw, true) : [];
    handleAthleteSignupCreate(getPdo(), is_array($decoded) ? $decoded : []);
    exit;
}

if ($path === 'athlete-join' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $decoded = $raw ? json_decode($raw, true) : [];
    handleAthleteJoinCrew(getPdo(), is_array($decoded) ? $decoded : []);
    exit;
}

if ($path === 'athlete-login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $decoded = $raw ? json_decode($raw, true) : [];
    handleAthleteLogin(getPdo(), is_array($decoded) ? $decoded : []);
    exit;
}

if ($path === 'athlete-profile' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    handleAthleteProfile(getPdo());
    exit;
}

if ($path === 'athlete-crew-icon' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $decoded = $raw ? json_decode($raw, true) : [];
    handleAthleteCrewIcon(getPdo(), is_array($decoded) ? $decoded : []);
    exit;
}

if ($path === 'athlete-username-available' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    handleAthleteUsernameAvailable(getPdo(), $_GET['username'] ?? null);
    exit;
}

if ($path === 'athlete-crewname-available' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    handleAthleteCrewNameAvailable(getPdo(), $_GET['name'] ?? null);
    exit;
}

if ($path === 'athlete-crew-by-invite' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    handleAthleteCrewByInvite(getPdo(), $_GET['code'] ?? null);
    exit;
}

if ($path === 'athlete-app-link' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    handleAthleteAppLink(getPdo());
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
    case 'crew-live-sessions':
        handleCrewLiveSessions($pdo, $userId, $method, $body, $segments);
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
    case 'nutrition-meals':
        handleNutritionMeals($pdo, $userId, $method, $body, $resourceId);
        break;
    case 'nutrition-logs':
        handleNutritionLogs($pdo, $userId, $method, $body, $segments);
        break;
    case 'nutrition-off':
        handleNutritionOff($pdo, $method, $segments);
        break;
    case 'nutrition-food-photo':
        handleNutritionFoodPhoto($pdo, $userId, $method, $body);
        break;
    case 'state':
        handleState($pdo, $userId, $method, $body, $resourceId);
        break;
    case 'state-batch':
        handleStateBatch($pdo, $userId, $method, $_GET['keys'] ?? null);
        break;
    default:
        errorResponse('Not found', 404);
}
