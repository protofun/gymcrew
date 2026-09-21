<?php

/**
 * Admin panel — account management for one user: edit their personal data, set a new password, and
 * sign them out everywhere. Dispatched from routes/admin.php's handleAdmin() (auth already verified).
 *
 * Passwords live in Clerk, not in our database — there is nothing to read back, and this never
 * tries to: the password is write-only, sent straight to Clerk's Backend API (see config.php's
 * clerkApiRequest) and never stored, returned or written to the audit log.
 *
 * Routes:
 *   PUT  /admin/users/:id/profile   -> any of { email, fullName, username, gender, heightCm, weightKg, age,
 *                                       gymName, goal, experienceLevel } -> the refreshed user detail
 *   POST /admin/users/:id/password  -> { password, signOutEverywhere? } -> { ok }
 *   POST /admin/users/:id/sign-out  -> { ok, revoked } (revokes every active session)
 */

/** camelCase JSON key => users column, for the profile fields an admin may change (email is handled
 * separately below since it has to change in Clerk too). */
const ADMIN_EDITABLE_PROFILE_COLUMNS = [
    'fullName' => 'full_name',
    'username' => 'username',
    'gender' => 'gender',
    'heightCm' => 'height_cm',
    'weightKg' => 'weight_kg',
    'age' => 'age',
    'gymName' => 'gym_name',
    'goal' => 'goal',
    'experienceLevel' => 'experience_level',
];

const ADMIN_PASSWORD_MIN_LENGTH = 8;
const ADMIN_PASSWORD_MAX_LENGTH = 72; // Clerk hashes with bcrypt, which ignores anything past 72 bytes

/** True if `$id` is a real (non-bot) account — the routes below are for real people only. */
function adminUserExists(PDO $pdo, string $id): bool
{
    $stmt = $pdo->prepare("SELECT 1 FROM users WHERE id = ? AND id != 'bot-system'");
    $stmt->execute([$id]);
    return (bool) $stmt->fetchColumn();
}

/** Validates one profile field, returning `[ok, cleanedValue]` — `ok` false means the error response
 * has already been sent and the caller must stop. An empty value clears the field (NULL). */
function cleanAdminProfileField(PDO $pdo, string $userId, string $key, $value): array
{
    if ($value === null || (is_string($value) && trim($value) === '')) {
        return [true, null];
    }

    switch ($key) {
        case 'username':
            $username = strtolower(trim((string) $value));
            if (!preg_match(USERNAME_PATTERN, $username)) {
                errorResponse('Username must be 3-20 characters: lowercase letters, numbers, and underscores only.');
                return [false, null];
            }
            if (!isUsernameAvailable($pdo, $username, $userId)) {
                errorResponse('That username is already taken.', 409);
                return [false, null];
            }
            return [true, $username];

        case 'gender':
            if (!in_array($value, ['male', 'female'], true)) {
                errorResponse('Gender must be male or female');
                return [false, null];
            }
            return [true, $value];

        case 'heightCm':
        case 'age':
            $limits = $key === 'heightCm' ? [50, 260] : [10, 100];
            if (!is_numeric($value) || (int) $value < $limits[0] || (int) $value > $limits[1]) {
                errorResponse("$key must be between {$limits[0]} and {$limits[1]}");
                return [false, null];
            }
            return [true, (int) $value];

        case 'weightKg':
            if (!is_numeric($value) || (float) $value < 20 || (float) $value > 400) {
                errorResponse('weightKg must be between 20 and 400');
                return [false, null];
            }
            return [true, round((float) $value, 2)];

        default: // fullName, gymName, goal, experienceLevel — free text
            return [true, mb_substr(trim((string) $value), 0, 255)];
    }
}

function updateAdminUserProfile(PDO $pdo, string $adminId, string $adminEmail, string $id, array $data): void
{
    if (!adminUserExists($pdo, $id)) {
        errorResponse('User not found', 404);
        return;
    }

    $sets = [];
    $values = [];
    $changed = [];
    foreach (ADMIN_EDITABLE_PROFILE_COLUMNS as $key => $column) {
        if (!array_key_exists($key, $data)) {
            continue;
        }
        [$ok, $clean] = cleanAdminProfileField($pdo, $id, $key, $data[$key]);
        if (!$ok) {
            return;
        }
        $sets[] = "$column = ?";
        $values[] = $clean;
        $changed[] = $key;
    }

    // Email goes first-and-alone through Clerk: our `users.email` only ever mirrors Clerk's primary
    // email (see routes/profile.php), so changing just our column would be silently undone the next
    // time the app syncs — and the person still couldn't sign in with the new address.
    if (array_key_exists('email', $data)) {
        $newEmail = strtolower(trim((string) $data['email']));
        if (!filter_var($newEmail, FILTER_VALIDATE_EMAIL)) {
            errorResponse('That is not a valid email address');
            return;
        }

        $currentStmt = $pdo->prepare('SELECT email FROM users WHERE id = ?');
        $currentStmt->execute([$id]);
        if (strtolower((string) $currentStmt->fetchColumn()) !== $newEmail) {
            $takenStmt = $pdo->prepare('SELECT 1 FROM users WHERE email = ? AND id != ?');
            $takenStmt->execute([$newEmail, $id]);
            if ($takenStmt->fetchColumn()) {
                errorResponse('Another account already uses that email address', 409);
                return;
            }

            $error = changeClerkPrimaryEmail($id, $newEmail);
            if ($error !== null) {
                errorResponse($error, 502);
                return;
            }
            $sets[] = 'email = ?';
            $values[] = $newEmail;
            $changed[] = 'email';
        }
    }

    if (empty($sets)) {
        errorResponse('Nothing to update');
        return;
    }

    $values[] = $id;
    $pdo->prepare('UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($values);

    // Field names only — never the values, the audit log isn't a place to copy personal data into.
    logAdminAction($pdo, $adminId, $adminEmail, 'update_user_profile', 'user', $id, implode(', ', $changed));
    respondWithAdminUserDetail($pdo, $id);
}

/** Makes `$newEmail` the account's verified primary email in Clerk and removes the old address, so
 * it can't be used to sign in any more. Returns null on success, or an error message to show. */
function changeClerkPrimaryEmail(string $clerkUserId, string $newEmail): ?string
{
    $error = null;
    $clerkUser = clerkApiRequest('GET', '/users/' . rawurlencode($clerkUserId), [], $error);
    if ($clerkUser === null) {
        return $error ?? 'Could not reach Clerk';
    }

    $oldPrimaryId = $clerkUser['primary_email_address_id'] ?? null;
    $existingId = null;
    foreach ($clerkUser['email_addresses'] ?? [] as $emailRow) {
        if (strtolower((string) ($emailRow['email_address'] ?? '')) === $newEmail) {
            $existingId = $emailRow['id'] ?? null;
        }
    }

    if ($existingId !== null) {
        // The account already has this address (e.g. as a secondary one) — just promote it.
        $result = clerkApiRequest('PATCH', '/users/' . rawurlencode($clerkUserId), ['primary_email_address_id' => $existingId], $error);
    } else {
        // Created as already verified: the admin is vouching for the address, no confirmation mail.
        $result = clerkApiRequest('POST', '/email_addresses', [
            'user_id' => $clerkUserId,
            'email_address' => $newEmail,
            'verified' => true,
            'primary' => true,
        ], $error);
    }
    if ($result === null) {
        return $error ?? 'Clerk did not accept that email address';
    }

    if ($oldPrimaryId !== null && $oldPrimaryId !== $existingId) {
        clerkApiRequest('DELETE', '/email_addresses/' . rawurlencode((string) $oldPrimaryId));
    }
    return null;
}

function setAdminUserPassword(PDO $pdo, string $adminId, string $adminEmail, string $id, array $data): void
{
    $password = (string) ($data['password'] ?? '');
    if (strlen($password) < ADMIN_PASSWORD_MIN_LENGTH) {
        errorResponse('The password must be at least ' . ADMIN_PASSWORD_MIN_LENGTH . ' characters');
        return;
    }
    if (strlen($password) > ADMIN_PASSWORD_MAX_LENGTH) {
        errorResponse('The password can be at most ' . ADMIN_PASSWORD_MAX_LENGTH . ' characters');
        return;
    }
    if (!adminUserExists($pdo, $id)) {
        errorResponse('User not found', 404);
        return;
    }

    $signOutEverywhere = ($data['signOutEverywhere'] ?? true) !== false;

    // Clerk's own password rules (e.g. its breached-password check) stay on, so a weak or leaked
    // password comes back as a readable error here rather than being forced through.
    $error = null;
    $result = clerkApiRequest('PATCH', '/users/' . rawurlencode($id), [
        'password' => $password,
        'sign_out_of_other_sessions' => $signOutEverywhere,
    ], $error);
    if ($result === null) {
        errorResponse($error ?? 'Could not change the password', 502);
        return;
    }

    logAdminAction($pdo, $adminId, $adminEmail, 'set_user_password', 'user', $id, $signOutEverywhere ? 'signed out of other sessions' : null);
    jsonResponse(['ok' => true]);
}

function signOutAdminUserEverywhere(PDO $pdo, string $adminId, string $adminEmail, string $id): void
{
    if (!adminUserExists($pdo, $id)) {
        errorResponse('User not found', 404);
        return;
    }

    $error = null;
    $sessions = clerkApiRequest('GET', '/sessions?status=active&user_id=' . rawurlencode($id), [], $error);
    if ($sessions === null) {
        errorResponse($error ?? 'Could not reach Clerk', 502);
        return;
    }

    // Clerk answers with either a plain list or a paginated `{ data: [...] }`, depending on API version.
    $list = isset($sessions['data']) && is_array($sessions['data']) ? $sessions['data'] : $sessions;
    $revoked = 0;
    foreach ($list as $session) {
        if (isset($session['id']) && clerkApiRequest('POST', '/sessions/' . rawurlencode((string) $session['id']) . '/revoke') !== null) {
            $revoked++;
        }
    }

    logAdminAction($pdo, $adminId, $adminEmail, 'sign_out_user', 'user', $id, "$revoked session(s)");
    jsonResponse(['ok' => true, 'revoked' => $revoked]);
}
