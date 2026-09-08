<?php

/** camelCase JSON key => snake_case DB column, for the profile fields the app actually persists. */
const PROFILE_COLUMN_MAP = [
    'email' => 'email',
    'fullName' => 'full_name',
    'username' => 'username',
    'avatarUrl' => 'avatar_url',
    'gender' => 'gender',
    'heightCm' => 'height_cm',
    'weightKg' => 'weight_kg',
    'age' => 'age',
    'gymName' => 'gym_name',
    'goal' => 'goal',
    'experienceLevel' => 'experience_level',
];

const USERNAME_PATTERN = '/^[a-z0-9_]{3,20}$/';

/** True if `$username` is free to take — either nobody has it, or `$userId` already does (so saving
 * your own unchanged username never trips the uniqueness check). Shared between the PUT handler
 * below and the public availability check in index.php, so the two can never disagree. */
function isUsernameAvailable(PDO $pdo, string $username, string $userId): bool
{
    $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ?');
    $stmt->execute([$username]);
    $row = $stmt->fetch();
    return !$row || $row['id'] === $userId;
}

function profileRowToJson(?array $row, string $userId): array
{
    if (!$row) {
        return ['id' => $userId];
    }
    $json = ['id' => $row['id']];
    foreach (PROFILE_COLUMN_MAP as $jsonKey => $column) {
        $value = $row[$column];
        if ($value === null) {
            $json[$jsonKey] = null;
        } elseif ($jsonKey === 'heightCm' || $jsonKey === 'age') {
            $json[$jsonKey] = (int) $value;
        } elseif ($jsonKey === 'weightKg') {
            $json[$jsonKey] = (float) $value;
        } else {
            $json[$jsonKey] = $value;
        }
    }
    $json['isFoundingAthlete'] = $row['founding_athlete_id'] !== null;
    return $json;
}

/**
 * If this account's email matches a marketing-site founding_athletes row (see
 * routes/athlete-signup.php) that hasn't been linked to a real account yet, adopts their Founding
 * Athlete status and Crew automatically — so someone who signed up there before this app existed
 * doesn't have to redo any of it (create a second account, recreate/rejoin a Crew) once they
 * actually sign up for real with the same email. Idempotent and cheap: no-ops instantly once
 * users.founding_athlete_id is set, which is permanent. Called from both GET and PUT /profile so
 * linking happens the moment an email is available, however that came to be (see personal-info.tsx
 * pushing it mid-onboarding), without needing a dedicated endpoint or client-side trigger.
 */
function maybeLinkFoundingAthlete(PDO $pdo, string $userId): void
{
    $userStmt = $pdo->prepare('SELECT email, founding_athlete_id FROM users WHERE id = ?');
    $userStmt->execute([$userId]);
    $user = $userStmt->fetch();
    if (!$user || $user['founding_athlete_id'] !== null || !$user['email']) {
        return;
    }

    $athleteStmt = $pdo->prepare('SELECT * FROM founding_athletes WHERE email = LOWER(?)');
    $athleteStmt->execute([trim($user['email'])]);
    $athlete = $athleteStmt->fetch();
    if (!$athlete) {
        return;
    }

    // Someone else already claimed this founding_athletes row under a different real account —
    // email is unique on both sides so this shouldn't be reachable, but guards a race regardless.
    $claimedStmt = $pdo->prepare('SELECT 1 FROM users WHERE founding_athlete_id = ?');
    $claimedStmt->execute([$athlete['id']]);
    if ($claimedStmt->fetch()) {
        return;
    }

    $resolved = resolveAthleteCrewAndRole($pdo, $athlete['id']);

    $pdo->beginTransaction();
    try {
        $pdo->prepare('UPDATE users SET founding_athlete_id = ? WHERE id = ?')->execute([$athlete['id'], $userId]);

        if ($resolved['crew'] !== null && findMyCrewId($pdo, $userId) === null) {
            linkOrCreateRealCrewFromFounding($pdo, $userId, $resolved['crew']);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

/** Finds the real crew already minted from this founding_crews row (by an earlier member of the
 * same pre-launch crew signing up for real first) and joins `$userId` to it, or mints it fresh with
 * `$userId` as its leader if nobody has yet — regardless of whether they were the founding leader
 * or just the first of that founding crew to actually create a real account. */
function linkOrCreateRealCrewFromFounding(PDO $pdo, string $userId, array $foundingCrew): void
{
    $existingStmt = $pdo->prepare('SELECT id, max_members FROM crews WHERE founding_crew_id = ?');
    $existingStmt->execute([$foundingCrew['id']]);
    $existing = $existingStmt->fetch();

    if ($existing) {
        $countStmt = $pdo->prepare('SELECT COUNT(*) AS c FROM crew_members WHERE crew_id = ?');
        $countStmt->execute([$existing['id']]);
        if ((int) $countStmt->fetch()['c'] >= (int) $existing['max_members']) {
            // Filled up in the real app before this founding member ever arrived — extremely
            // unlikely pre-launch; leave them crew-less rather than failing the whole link.
            return;
        }
        $pdo->prepare('INSERT INTO crew_members (crew_id, user_id, role, joined_at) VALUES (?, ?, "member", ?)')
            ->execute([$existing['id'], $userId, (int) round(microtime(true) * 1000)]);
        return;
    }

    $name = $foundingCrew['name'];
    if (!isCrewNameAvailable($pdo, $name)) {
        $name = mb_substr($name, 0, 240) . ' (Founding)';
        if (!isCrewNameAvailable($pdo, $name)) {
            $name = mb_substr($foundingCrew['name'], 0, 230) . '-' . substr($foundingCrew['id'], -6);
        }
    }

    $realCrewId = 'crew-' . bin2hex(random_bytes(8));
    $now = (int) round(microtime(true) * 1000);
    $inviteCode = generateInviteCode();
    for ($attempt = 0; $attempt < 5; $attempt++) {
        $check = $pdo->prepare('SELECT 1 FROM crews WHERE invite_code = ?');
        $check->execute([$inviteCode]);
        if (!$check->fetch()) break;
        $inviteCode = generateInviteCode();
    }

    $pdo->prepare(
        'INSERT INTO crews
            (id, name, tagline, icon, training_type, privacy, join_requests_enabled, max_members, invite_code, founding_crew_id, division_history_json, created_by, created_at)
         VALUES
            (:id, :name, :tagline, :icon, :training_type, :privacy, :join_requests_enabled, :max_members, :invite_code, :founding_crew_id, :division_history_json, :created_by, :created_at)'
    )->execute([
        ':id' => $realCrewId,
        ':name' => $name,
        ':tagline' => mb_substr((string) $foundingCrew['description'], 0, 255),
        ':icon' => $foundingCrew['logo_url'] ?: 'gorilla',
        ':training_type' => '',
        ':privacy' => 'invite-only',
        ':join_requests_enabled' => 1,
        ':max_members' => 8,
        ':invite_code' => $inviteCode,
        ':founding_crew_id' => $foundingCrew['id'],
        ':division_history_json' => json_encode([['division' => 'Rookie', 'reachedAt' => $now]]),
        ':created_by' => $userId,
        ':created_at' => $now,
    ]);

    $pdo->prepare('INSERT INTO crew_members (crew_id, user_id, role, joined_at) VALUES (?, ?, "leader", ?)')
        ->execute([$realCrewId, $userId, $now]);
}

/**
 * Public (no auth) — the onboarding wizard collects a username before the account exists, so there's
 * no session yet to check it against the authenticated PUT /profile path below. Only ever returns a
 * yes/no on a username string, no user data, so it's safe to leave outside the auth gate (see
 * index.php, which routes here before verifying the Clerk JWT).
 */
function handleUsernameAvailability(PDO $pdo, ?string $username): void
{
    $username = strtolower(trim((string) $username));
    $available = (bool) preg_match(USERNAME_PATTERN, $username) && isUsernameAvailable($pdo, $username, '');
    jsonResponse(['available' => $available]);
}

function handleProfile(PDO $pdo, string $userId, string $method, ?array $body): void
{
    if ($method === 'GET') {
        maybeLinkFoundingAthlete($pdo, $userId);
        $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        jsonResponse(profileRowToJson($stmt->fetch() ?: null, $userId));
        return;
    }

    if ($method === 'PUT') {
        $data = $body ?? [];

        if (array_key_exists('username', $data) && $data['username'] !== null) {
            $username = strtolower(trim((string) $data['username']));
            if (!preg_match(USERNAME_PATTERN, $username)) {
                errorResponse('Username must be 3-20 characters: lowercase letters, numbers, and underscores only.');
                return;
            }
            if (!isUsernameAvailable($pdo, $username, $userId)) {
                errorResponse('That username is already taken.', 409);
                return;
            }
            $data['username'] = $username;
        }

        // Ensure the row exists, then only touch columns the caller actually sent — this is a
        // partial update (Partial<OnboardingData> on the client), not a full replace.
        $pdo->prepare('INSERT IGNORE INTO users (id) VALUES (?)')->execute([$userId]);

        $sets = [];
        $values = [':id' => $userId];
        foreach (PROFILE_COLUMN_MAP as $jsonKey => $column) {
            if (array_key_exists($jsonKey, $data)) {
                $sets[] = "$column = :$column";
                $values[":$column"] = $data[$jsonKey];
            }
        }

        if ($sets) {
            $sql = 'UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = :id';
            $pdo->prepare($sql)->execute($values);
        }

        maybeLinkFoundingAthlete($pdo, $userId);

        $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        jsonResponse(profileRowToJson($stmt->fetch() ?: null, $userId));
        return;
    }

    errorResponse('Method not allowed', 405);
}
