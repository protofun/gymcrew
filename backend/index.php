<?php

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/admin-auth.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/routes/profile.php';
require_once __DIR__ . '/routes/account.php';
require_once __DIR__ . '/routes/profile_level.php';
require_once __DIR__ . '/routes/workouts.php';
require_once __DIR__ . '/routes/records.php';
require_once __DIR__ . '/routes/body_log.php';
require_once __DIR__ . '/routes/progress-photos.php';
require_once __DIR__ . '/routes/crews.php';
require_once __DIR__ . '/routes/crew-wars.php';
require_once __DIR__ . '/routes/crew-live-sessions.php';
require_once __DIR__ . '/routes/crew-activity-events.php';
require_once __DIR__ . '/routes/crew-duels.php';
require_once __DIR__ . '/routes/leaderboards.php';
require_once __DIR__ . '/routes/rank-standings.php';
require_once __DIR__ . '/routes/admin-challenges.php';
require_once __DIR__ . '/routes/nutrition-meals.php';
require_once __DIR__ . '/routes/nutrition-logs.php';
require_once __DIR__ . '/routes/nutrition-off.php';
require_once __DIR__ . '/routes/nutrition-food-photo.php';
require_once __DIR__ . '/routes/nutrition-photo-scan.php';
require_once __DIR__ . '/routes/nutrition-water.php';
require_once __DIR__ . '/routes/state.php';
require_once __DIR__ . '/routes/reports.php';
require_once __DIR__ . '/routes/push-token.php';
require_once __DIR__ . '/routes/support.php';
require_once __DIR__ . '/routes/waitlist.php';
require_once __DIR__ . '/routes/athlete-signup.php';
require_once __DIR__ . '/routes/admin.php';
require_once __DIR__ . '/routes/admin-ops.php';
require_once __DIR__ . '/routes/admin-content.php';
require_once __DIR__ . '/routes/analytics-events.php';
require_once __DIR__ . '/routes/launch-analytics.php';
require_once __DIR__ . '/routes/track.php';
require_once __DIR__ . '/routes/announcement.php';
require_once __DIR__ . '/routes/admin-users.php';
require_once __DIR__ . '/routes/roadmap.php';
require_once __DIR__ . '/routes/content.php';
require_once __DIR__ . '/routes/feedback.php';
require_once __DIR__ . '/routes/user-socials.php';
require_once __DIR__ . '/routes/admin-messages.php';

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
// The admin panel is a separate static web app (its own origin) with its own auth entirely (see
// admin-auth.php) — same "not the PWA, needs its own CORS carve-out" reasoning as the marketing
// paths above, not a loosening of the main app's CORS lock.
$isAdminPath = $path === 'admin' || str_starts_with($path, 'admin/');
$corsOrigin = (in_array($path, $publicMarketingPaths, true) || $isAdminPath) ? '*' : env('CORS_ORIGIN', '*');
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

// Dispatched here, before the Clerk JWT gate below — the admin panel authenticates with its own
// self-issued token (see admin-auth.php), never a Clerk session. handleAdmin() does its own auth
// check internally (every route but POST /admin/login requires it).
if ($isAdminPath) {
    $raw = file_get_contents('php://input');
    $decoded = $raw ? json_decode($raw, true) : [];
    handleAdmin(getPdo(), $_SERVER['REQUEST_METHOD'], is_array($decoded) ? $decoded : [], explode('/', $path));
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
    case 'progress-photos':
        handleProgressPhotos($pdo, $userId, $method, $body, $segments);
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
        handleCrewActivityEvents($pdo, $userId, $method, $body, $segments);
        break;
    case 'crew-duels':
        handleCrewDuels($pdo, $userId, $method, $body, $segments);
        break;
    case 'leaderboards':
        handleLeaderboards($pdo, $userId, $method, $segments);
        break;
    case 'rank-standings':
        handleRankStandings($pdo, $userId, $method);
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
    case 'nutrition-photo-scan':
        handleNutritionPhotoScan($pdo, $userId, $method, $body);
        break;
    case 'nutrition-water':
        handleNutritionWater($pdo, $userId, $method, $body, $resourceId);
        break;
    case 'state':
        handleState($pdo, $userId, $method, $body, $resourceId);
        break;
    case 'state-batch':
        handleStateBatch($pdo, $userId, $method, $_GET['keys'] ?? null);
        break;
    case 'reports':
        handleReports($pdo, $userId, $method, $body);
        break;
    case 'announcement':
        handleAnnouncement($pdo);
        break;
    case 'roadmap':
        handleRoadmap($pdo, $method);
        break;
    case 'changelog':
        handleChangelog($pdo, $method);
        break;
    case 'faq':
        handleFaq($pdo, $method);
        break;
    case 'status':
        handleStatus($pdo, $method);
        break;
    case 'feedback':
        handleFeedback($pdo, $userId, $method, $body, $segments);
        break;
    case 'push-token':
        handlePushToken($pdo, $userId, $method, $body);
        break;
    case 'support':
        handleSupport($pdo, $userId, $method, $body, $segments);
        break;
    case 'user-socials':
        handleUserSocials($pdo, $userId, $method, $body, $segments);
        break;
    case 'admin-messages':
        handleAdminMessages($pdo, $userId, $method, $body, $segments);
        break;
    // Named "activity", not "track" — ad blockers routinely block any URL path containing
    // "track" as a generic analytics heuristic, which would silently drop this app's own
    // first-party telemetry for a meaningful share of real users (confirmed: the admin panel's
    // near-identical "/event-log" endpoint was blocked this same way before being renamed).
    case 'activity':
        handleTrack($pdo, $userId, $method, $body);
        break;
    default:
        errorResponse('Not found', 404);
}
