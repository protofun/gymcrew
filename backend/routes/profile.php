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
    return $json;
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

        $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        jsonResponse(profileRowToJson($stmt->fetch() ?: null, $userId));
        return;
    }

    errorResponse('Method not allowed', 405);
}
