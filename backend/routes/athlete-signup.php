<?php

/**
 * Pre-launch "Founding Athlete" signups from the marketing site — see db/schema.sql's
 * `founding_athletes`/`founding_crews`/`founding_crew_members`. Public, no Clerk JWT: these are
 * real accounts of their own (email + password), separate from the real app's Clerk-backed `users`
 * table, since none of these people have used the real app yet. Registered as public routes
 * directly in index.php, the same way /waitlist already is.
 *
 * Two ways to get an account here: found your own Crew (landingpage/athlete-signup.html, a
 * Founding Athlete — leader of a brand-new founding_crews row), or join someone else's via their
 * invite link (landingpage/join.html, a regular member — a founding_crew_members row, no crew of
 * their own). Every authenticated response below reports which one you are as `role`.
 *
 * Routes:
 *   POST /athlete-signup             -> creates the athlete + their own Crew (leader), returns
 *                                        { token, athlete, crew, role: 'leader' }
 *   POST /athlete-join               -> { ...same fields as signup except crewName/crewDescription/
 *                                        crewImage*, plus inviteCode } -> creates the athlete as a
 *                                        member of the crew that invite code belongs to, returns
 *                                        { token, athlete, crew, role: 'member' }
 *   POST /athlete-login              -> { email, password } -> { token, athlete, crew, role }
 *   GET  /athlete-profile            -> Authorization: Bearer <token> -> { athlete, crew, role }
 *   POST /athlete-crew-icon          -> Authorization: Bearer <token>, { imageBase64, contentType }
 *                                        -> { logoUrl } — leader only
 *   GET  /athlete-username-available -> ?username=x -> { available }, checked live as the wizard's
 *                                        username step is typed, same idea as the real app's
 *                                        /username-available (profile.php) but against this table
 *   GET  /athlete-crewname-available -> ?name=x -> { available }, same idea for the crew-name step
 *   GET  /athlete-crew-by-invite     -> ?code=FA-XXXXXX -> { crew, leaderName } or 404 — powers the
 *                                        public invite-link landing page (landingpage/join.html)
 *   GET  /athlete-app-link           -> Authorization: Bearer <token> -> { appUrl } — a gymcrew://
 *                                        deep link carrying a one-time Clerk sign-in ticket, so
 *                                        tapping "Open the App" signs the SAME real account straight
 *                                        in instead of landing on a fresh sign-up screen (see
 *                                        createClerkUserForFoundingAthlete, src/app/auth-handoff.tsx)
 */

const ATHLETE_MIN_PASSWORD_LENGTH = 8;

function athleteJson(array $athlete): array
{
    return [
        'id' => $athlete['id'],
        'fullName' => $athlete['full_name'],
        'email' => $athlete['email'],
        'username' => $athlete['username'],
        'profilePictureUrl' => $athlete['profile_picture_url'],
    ];
}

function foundingCrewJson(array $crew, int $memberCount, ?string $leaderName): array
{
    return [
        'id' => $crew['id'],
        'name' => $crew['name'],
        'description' => $crew['description'],
        'logoUrl' => $crew['logo_url'],
        'inviteCode' => $crew['invite_code'],
        'memberCount' => $memberCount,
        'leaderName' => $leaderName,
    ];
}

function isValidUsername(string $username): bool
{
    return (bool) preg_match('/^[a-z0-9_]{3,20}$/', $username);
}

/** Every founding_crew_members row plus the leader themselves. */
function crewMemberCount(PDO $pdo, string $crewId): int
{
    $stmt = $pdo->prepare('SELECT COUNT(*) AS c FROM founding_crew_members WHERE crew_id = ?');
    $stmt->execute([$crewId]);
    return 1 + (int) $stmt->fetch()['c'];
}

function crewLeaderName(PDO $pdo, string $leaderAthleteId): ?string
{
    $stmt = $pdo->prepare('SELECT full_name, username FROM founding_athletes WHERE id = ?');
    $stmt->execute([$leaderAthleteId]);
    $row = $stmt->fetch();
    return $row ? ($row['full_name'] ?: $row['username']) : null;
}

/** Builds the full { crew, memberCount, leaderName } payload for a crew row in one call. */
function foundingCrewJsonFor(PDO $pdo, array $crew): array
{
    return foundingCrewJson($crew, crewMemberCount($pdo, $crew['id']), crewLeaderName($pdo, $crew['athlete_id']));
}

/** An athlete is either the leader of their own Crew (founding_crews.athlete_id) or a member of
 * someone else's (founding_crew_members) — never both, never neither once they have an account.
 * Returns ['crew' => array|null, 'role' => 'leader'|'member'|null]. */
function resolveAthleteCrewAndRole(PDO $pdo, string $athleteId): array
{
    $leaderStmt = $pdo->prepare('SELECT * FROM founding_crews WHERE athlete_id = ?');
    $leaderStmt->execute([$athleteId]);
    $crew = $leaderStmt->fetch();
    if ($crew) {
        return ['crew' => $crew, 'role' => 'leader'];
    }

    $memberStmt = $pdo->prepare(
        'SELECT fc.* FROM founding_crew_members fcm
         JOIN founding_crews fc ON fc.id = fcm.crew_id
         WHERE fcm.athlete_id = ?'
    );
    $memberStmt->execute([$athleteId]);
    $crew = $memberStmt->fetch();
    return ['crew' => $crew ?: null, 'role' => $crew ? 'member' : null];
}

function handleAthleteUsernameAvailable(PDO $pdo, ?string $username): void
{
    $username = strtolower(trim((string) $username));
    if (!isValidUsername($username)) {
        jsonResponse(['available' => false]);
        return;
    }
    $stmt = $pdo->prepare('SELECT 1 FROM founding_athletes WHERE username = ?');
    $stmt->execute([$username]);
    jsonResponse(['available' => !$stmt->fetch()]);
}

function handleAthleteCrewNameAvailable(PDO $pdo, ?string $name): void
{
    $name = trim((string) $name);
    if ($name === '') {
        jsonResponse(['available' => false]);
        return;
    }
    $stmt = $pdo->prepare('SELECT 1 FROM founding_crews WHERE LOWER(name) = LOWER(?)');
    $stmt->execute([$name]);
    jsonResponse(['available' => !$stmt->fetch()]);
}

function handleAthleteCrewByInvite(PDO $pdo, ?string $inviteCode): void
{
    $inviteCode = strtoupper(trim((string) $inviteCode));
    if ($inviteCode === '') {
        errorResponse('Invite code is required', 404);
        return;
    }

    $stmt = $pdo->prepare('SELECT * FROM founding_crews WHERE invite_code = ?');
    $stmt->execute([$inviteCode]);
    $crew = $stmt->fetch();
    if (!$crew) {
        errorResponse('Invite link not found', 404);
        return;
    }

    jsonResponse([
        'crew' => foundingCrewJsonFor($pdo, $crew),
        'leaderName' => crewLeaderName($pdo, $crew['athlete_id']),
    ]);
}

/** Shared validation + row-creation for both /athlete-signup and /athlete-join — the two only ever
 * differ in what happens to founding_crews/founding_crew_members afterward. Returns the new
 * athlete's id, or null if it already sent an error response (validation failure or a 409). */
function createFoundingAthlete(PDO $pdo, array $data): ?string
{
    $fullName = trim((string) ($data['fullName'] ?? ''));
    $email = strtolower(trim((string) ($data['email'] ?? '')));
    $password = (string) ($data['password'] ?? '');
    $username = strtolower(trim((string) ($data['username'] ?? '')));

    if ($fullName === '') {
        errorResponse('Full name is required');
        return null;
    }
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        errorResponse('A valid email is required');
        return null;
    }
    if (strlen($password) < ATHLETE_MIN_PASSWORD_LENGTH) {
        errorResponse('Password must be at least ' . ATHLETE_MIN_PASSWORD_LENGTH . ' characters');
        return null;
    }
    if (!isValidUsername($username)) {
        errorResponse('Username must be 3-20 characters — lowercase letters, numbers, and underscores only');
        return null;
    }

    $existsStmt = $pdo->prepare('SELECT 1 FROM founding_athletes WHERE email = ?');
    $existsStmt->execute([$email]);
    if ($existsStmt->fetch()) {
        errorResponse('An account with that email already exists — try logging in instead.', 409);
        return null;
    }

    $usernameStmt = $pdo->prepare('SELECT 1 FROM founding_athletes WHERE username = ?');
    $usernameStmt->execute([$username]);
    if ($usernameStmt->fetch()) {
        errorResponse('That username is already taken.', 409);
        return null;
    }

    $athleteId = 'athlete-' . bin2hex(random_bytes(8));

    $profilePictureUrl = null;
    $profileBase64 = (string) ($data['profilePictureBase64'] ?? '');
    if ($profileBase64 !== '') {
        $contentType = (string) ($data['profilePictureContentType'] ?? 'image/jpeg');
        $profilePictureUrl = saveUploadedImage('athlete-profiles', $athleteId, $profileBase64, $contentType);
        if ($profilePictureUrl === null) {
            return null; // saveUploadedImage already sent the error response
        }
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $token = bin2hex(random_bytes(32));
    $now = (int) round(microtime(true) * 1000);

    $pdo->prepare(
        'INSERT INTO founding_athletes (id, full_name, email, password_hash, username, profile_picture_url, auth_token, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([$athleteId, $fullName, $email, $passwordHash, $username, $profilePictureUrl, $token, $now]);

    // Best-effort: mints the real app account right away (same email + password) so opening the
    // app later is a one-tap sign-in via /athlete-app-link's ticket, not a second signup. Never
    // blocks or fails the marketing-site signup itself — a null here just means the person signs
    // into the app normally the first time instead, same as before this existed.
    $clerkUserId = createClerkUserForFoundingAthlete($email, $fullName, $password);
    if ($clerkUserId !== null) {
        $pdo->prepare('UPDATE founding_athletes SET clerk_user_id = ? WHERE id = ?')->execute([$clerkUserId, $athleteId]);
    }

    return $athleteId;
}

/** Creates the matching real Clerk user for a brand-new founding athlete, reusing the same email +
 * password they just chose here — `skip_password_checks` because we've already enforced our own
 * minimum (ATHLETE_MIN_PASSWORD_LENGTH) and Clerk's own complexity rules shouldn't retroactively
 * reject a password this person already committed to. Returns null (never throws) if
 * CLERK_SECRET_KEY isn't configured, or if Clerk rejects the call for any reason (e.g. this email
 * already has a real Clerk account from some other path) — that account simply won't get the
 * one-tap app handoff, nothing else about signup is affected. */
function createClerkUserForFoundingAthlete(string $email, string $fullName, string $password): ?string
{
    $nameParts = explode(' ', trim($fullName), 2);
    $result = clerkApiRequest('POST', '/users', [
        'email_address' => [$email],
        'password' => $password,
        'skip_password_checks' => true,
        'skip_password_requirement' => false,
        'first_name' => $nameParts[0] ?? '',
        'last_name' => $nameParts[1] ?? '',
    ]);
    return $result['id'] ?? null;
}

/** A short-lived, single-use Clerk sign-in token for `$clerkUserId` — consumed client-side via
 * `signIn.ticket({ ticket })` (see src/app/auth-handoff.tsx) to sign that account straight in, no
 * credentials re-entered. Minted fresh per request rather than cached, since a ticket is meant to
 * be used once. Returns null if CLERK_SECRET_KEY isn't configured or the call fails. */
function createClerkSignInTicket(string $clerkUserId): ?string
{
    $result = clerkApiRequest('POST', '/sign_in_tokens', [
        'user_id' => $clerkUserId,
        'expires_in_seconds' => 300,
    ]);
    return $result['token'] ?? null;
}

function handleAthleteSignupCreate(PDO $pdo, array $data): void
{
    $crewName = trim((string) ($data['crewName'] ?? ''));
    $crewDescription = trim((string) ($data['crewDescription'] ?? ''));
    if ($crewName === '') {
        errorResponse('Crew name is required');
        return;
    }
    $crewNameStmt = $pdo->prepare('SELECT 1 FROM founding_crews WHERE LOWER(name) = LOWER(?)');
    $crewNameStmt->execute([$crewName]);
    if ($crewNameStmt->fetch()) {
        errorResponse('That Crew name is already taken.', 409);
        return;
    }

    $pdo->beginTransaction();
    try {
        $athleteId = createFoundingAthlete($pdo, $data);
        if ($athleteId === null) {
            $pdo->rollBack();
            return; // createFoundingAthlete already sent the error response
        }

        $crewId = 'fcrew-' . bin2hex(random_bytes(8));
        $logoUrl = null;
        $crewImageBase64 = (string) ($data['crewImageBase64'] ?? '');
        if ($crewImageBase64 !== '') {
            $contentType = (string) ($data['crewImageContentType'] ?? 'image/jpeg');
            $logoUrl = saveUploadedImage('founding-crew-logos', $crewId, $crewImageBase64, $contentType);
            if ($logoUrl === null) {
                $pdo->rollBack();
                return;
            }
        }

        $inviteCode = 'FA-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
        $now = (int) round(microtime(true) * 1000);
        $pdo->prepare(
            'INSERT INTO founding_crews (id, athlete_id, name, description, logo_url, invite_code, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        )->execute([$crewId, $athleteId, $crewName, $crewDescription, $logoUrl, $inviteCode, $now]);

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    $athleteStmt = $pdo->prepare('SELECT * FROM founding_athletes WHERE id = ?');
    $athleteStmt->execute([$athleteId]);
    $athlete = $athleteStmt->fetch();
    $crewStmt = $pdo->prepare('SELECT * FROM founding_crews WHERE id = ?');
    $crewStmt->execute([$crewId]);
    $crew = $crewStmt->fetch();

    jsonResponse([
        'token' => $athlete['auth_token'],
        'athlete' => athleteJson($athlete),
        'crew' => foundingCrewJsonFor($pdo, $crew),
        'role' => 'leader',
    ], 201);
}

function handleAthleteJoinCrew(PDO $pdo, array $data): void
{
    $inviteCode = strtoupper(trim((string) ($data['inviteCode'] ?? '')));
    if ($inviteCode === '') {
        errorResponse('Invite code is required');
        return;
    }
    $crewStmt = $pdo->prepare('SELECT * FROM founding_crews WHERE invite_code = ?');
    $crewStmt->execute([$inviteCode]);
    $crew = $crewStmt->fetch();
    if (!$crew) {
        errorResponse('Invite link not found', 404);
        return;
    }

    $pdo->beginTransaction();
    try {
        $athleteId = createFoundingAthlete($pdo, $data);
        if ($athleteId === null) {
            $pdo->rollBack();
            return; // createFoundingAthlete already sent the error response
        }

        $memberId = 'fcrewmember-' . bin2hex(random_bytes(8));
        $now = (int) round(microtime(true) * 1000);
        $pdo->prepare(
            'INSERT INTO founding_crew_members (id, crew_id, athlete_id, joined_at) VALUES (?, ?, ?, ?)'
        )->execute([$memberId, $crew['id'], $athleteId, $now]);

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    $athleteStmt = $pdo->prepare('SELECT * FROM founding_athletes WHERE id = ?');
    $athleteStmt->execute([$athleteId]);
    $athlete = $athleteStmt->fetch();

    jsonResponse([
        'token' => $athlete['auth_token'],
        'athlete' => athleteJson($athlete),
        'crew' => foundingCrewJsonFor($pdo, $crew),
        'role' => 'member',
    ], 201);
}

function handleAthleteLogin(PDO $pdo, array $data): void
{
    $email = strtolower(trim((string) ($data['email'] ?? '')));
    $password = (string) ($data['password'] ?? '');

    $stmt = $pdo->prepare('SELECT * FROM founding_athletes WHERE email = ?');
    $stmt->execute([$email]);
    $athlete = $stmt->fetch();

    if (!$athlete || !password_verify($password, $athlete['password_hash'])) {
        errorResponse('Incorrect email or password', 401);
        return;
    }

    $token = bin2hex(random_bytes(32));
    $pdo->prepare('UPDATE founding_athletes SET auth_token = ? WHERE id = ?')->execute([$token, $athlete['id']]);
    $athlete['auth_token'] = $token;

    $resolved = resolveAthleteCrewAndRole($pdo, $athlete['id']);
    $crew = $resolved['crew'];

    jsonResponse([
        'token' => $token,
        'athlete' => athleteJson($athlete),
        'crew' => $crew ? foundingCrewJsonFor($pdo, $crew) : null,
        'role' => $resolved['role'],
    ]);
}

/** Shared by every athlete-authenticated route below — looks up the bearer token against
 * founding_athletes.auth_token, sending its own 401 on failure. Callers should `return;`
 * immediately when this returns null. */
function requireAthlete(PDO $pdo): ?array
{
    $token = getBearerToken();
    if (!$token) {
        errorResponse('Missing Authorization header', 401);
        return null;
    }

    $stmt = $pdo->prepare('SELECT * FROM founding_athletes WHERE auth_token = ?');
    $stmt->execute([$token]);
    $athlete = $stmt->fetch();
    if (!$athlete) {
        errorResponse('Invalid or expired session', 401);
        return null;
    }

    return $athlete;
}

function handleAthleteProfile(PDO $pdo): void
{
    $athlete = requireAthlete($pdo);
    if ($athlete === null) {
        return;
    }

    $resolved = resolveAthleteCrewAndRole($pdo, $athlete['id']);
    $crew = $resolved['crew'];

    jsonResponse([
        'athlete' => athleteJson($athlete),
        'crew' => $crew ? foundingCrewJsonFor($pdo, $crew) : null,
        'role' => $resolved['role'],
    ]);
}

/** Powers the "Open the App" button on the success screen — mints a fresh Clerk sign-in ticket for
 * this athlete's linked real account and hands back a gymcrew:// deep link that signs them straight
 * in (see src/app/auth-handoff.tsx). 409 if createFoundingAthlete's best-effort Clerk user creation
 * never happened or hasn't landed yet (no CLERK_SECRET_KEY configured, or that call failed) —
 * there's no real account to sign into yet, so the client should just fall back to the normal
 * in-app sign-up/sign-in screen instead. */
function handleAthleteAppLink(PDO $pdo): void
{
    $athlete = requireAthlete($pdo);
    if ($athlete === null) {
        return;
    }

    if (!$athlete['clerk_user_id']) {
        errorResponse('App account not ready yet — open the app and sign in with the same email instead.', 409);
        return;
    }

    $ticket = createClerkSignInTicket($athlete['clerk_user_id']);
    if ($ticket === null) {
        errorResponse('Could not prepare app sign-in. Please try again.', 502);
        return;
    }

    jsonResponse(['appUrl' => 'gymcrew://auth-handoff?ticket=' . urlencode($ticket)]);
}

function handleAthleteCrewIcon(PDO $pdo, array $data): void
{
    $athlete = requireAthlete($pdo);
    if ($athlete === null) {
        return;
    }

    $crewStmt = $pdo->prepare('SELECT * FROM founding_crews WHERE athlete_id = ?');
    $crewStmt->execute([$athlete['id']]);
    $crew = $crewStmt->fetch();
    if (!$crew) {
        errorResponse('Only the crew leader can change the Crew photo', 403);
        return;
    }

    $raw = (string) ($data['imageBase64'] ?? '');
    if ($raw === '') {
        errorResponse('imageBase64 is required');
        return;
    }

    $contentType = (string) ($data['contentType'] ?? 'image/jpeg');
    $url = saveUploadedImage('founding-crew-logos', $crew['id'], $raw, $contentType);
    if ($url === null) {
        return; // saveUploadedImage already sent the error response
    }

    $pdo->prepare('UPDATE founding_crews SET logo_url = ? WHERE id = ?')->execute([$url, $crew['id']]);
    jsonResponse(['logoUrl' => $url]);
}
