<?php

/**
 * App-wide, admin-curated challenges — see db/schema.sql's `admin_challenges`. Same shape as a
 * weekly challenge (data/challenges.ts's ChallengeMetric) but hand-authored and left running until
 * manually stopped instead of rotating weekly. Write access (create/update/delete) is gated to a
 * short hardcoded list of admin accounts by email (ADMIN_CHALLENGE_EMAILS below) — there's no real
 * roles system in this app, this is a stopgap for a couple of trusted admins, not a permissions
 * model to build on.
 *
 * Routes (all require auth, see index.php):
 *   GET    /admin-challenges       -> admin caller: every challenge (active + inactive), for the
 *                                      management screen; anyone else: only active ones, for their
 *                                      own Challenges tab
 *   POST   /admin-challenges       -> create (admin only)
 *   PUT    /admin-challenges/:id   -> update, including isActive (admin only)
 *   DELETE /admin-challenges/:id   -> delete (admin only)
 */

const ADMIN_CHALLENGE_EMAILS = ['jaimy.mathon@gmail.com', 'akb.koycu@gmail.com'];

function isAdminUser(PDO $pdo, string $userId): bool
{
    $stmt = $pdo->prepare('SELECT email FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    if (!$row || !$row['email']) {
        return false;
    }
    foreach (ADMIN_CHALLENGE_EMAILS as $adminEmail) {
        if (strcasecmp($row['email'], $adminEmail) === 0) {
            return true;
        }
    }
    return false;
}

function handleAdminChallenges(PDO $pdo, string $userId, string $method, ?array $body, array $segments): void
{
    $sub = $segments[1] ?? null;
    $isAdmin = isAdminUser($pdo, $userId);

    if ($sub === null && $method === 'GET') {
        respondWithAdminChallenges($pdo, $isAdmin);
        return;
    }

    if (!$isAdmin) {
        errorResponse('Admins only', 403);
        return;
    }

    if ($sub === null && $method === 'POST') {
        createAdminChallenge($pdo, $userId, $body ?? []);
        return;
    }

    if ($sub !== null && $method === 'PUT') {
        updateAdminChallenge($pdo, $sub, $body ?? []);
        return;
    }

    if ($sub !== null && $method === 'DELETE') {
        deleteAdminChallenge($pdo, $sub);
        return;
    }

    errorResponse('Not found', 404);
}

function adminChallengeJson(array $row): array
{
    return [
        'id' => $row['id'],
        'name' => $row['name'],
        'description' => $row['description'],
        'metric' => json_decode($row['metric_json'], true),
        'unit' => $row['unit'],
        'perMemberTarget' => (int) $row['per_member_target'],
        'icon' => $row['icon'],
        'isActive' => (bool) $row['is_active'],
        'isSummerChallenge' => (bool) $row['is_summer_challenge'],
        'createdAt' => (int) $row['created_at'],
        'updatedAt' => (int) $row['updated_at'],
    ];
}

function respondWithAdminChallenges(PDO $pdo, bool $isAdmin): void
{
    $stmt = $isAdmin
        ? $pdo->query('SELECT * FROM admin_challenges ORDER BY created_at DESC')
        : $pdo->query('SELECT * FROM admin_challenges WHERE is_active = 1 ORDER BY created_at DESC');
    jsonResponse(array_map('adminChallengeJson', $stmt->fetchAll()));
}

/** Same metric shapes as the client's ChallengeMetric union (data/challenges.ts) — only the
 * discriminant is checked server-side; the admin form is the only writer and always sends a
 * well-formed shape for whichever type it picks. */
function isValidMetric($metric): bool
{
    return is_array($metric)
        && isset($metric['type'])
        && in_array($metric['type'], ['muscleVolume', 'totalVolume', 'totalWorkouts', 'totalSets', 'exerciseVolume', 'exerciseReps'], true);
}

function createAdminChallenge(PDO $pdo, string $userId, array $data): void
{
    $name = trim((string) ($data['name'] ?? ''));
    $unit = trim((string) ($data['unit'] ?? ''));
    $perMemberTarget = isset($data['perMemberTarget']) ? (int) $data['perMemberTarget'] : 0;
    $metric = $data['metric'] ?? null;

    if ($name === '' || $unit === '' || $perMemberTarget <= 0 || !isValidMetric($metric)) {
        errorResponse('name, unit, a positive perMemberTarget, and a valid metric are required');
        return;
    }

    $id = 'admin-challenge-' . bin2hex(random_bytes(8));
    $now = (int) round(microtime(true) * 1000);

    $pdo->prepare(
        'INSERT INTO admin_challenges (id, name, description, metric_json, unit, per_member_target, icon, is_active, is_summer_challenge, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $id,
        $name,
        trim((string) ($data['description'] ?? '')),
        json_encode($metric),
        $unit,
        $perMemberTarget,
        trim((string) ($data['icon'] ?? '')) ?: 'flag-outline',
        array_key_exists('isActive', $data) && empty($data['isActive']) ? 0 : 1,
        !empty($data['isSummerChallenge']) ? 1 : 0,
        $userId,
        $now,
        $now,
    ]);

    $stmt = $pdo->prepare('SELECT * FROM admin_challenges WHERE id = ?');
    $stmt->execute([$id]);
    jsonResponse(adminChallengeJson($stmt->fetch()), 201);
}

function updateAdminChallenge(PDO $pdo, string $id, array $data): void
{
    $stmt = $pdo->prepare('SELECT * FROM admin_challenges WHERE id = ?');
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        errorResponse('Not found', 404);
        return;
    }

    $columnMap = ['name' => 'name', 'description' => 'description', 'unit' => 'unit', 'icon' => 'icon'];
    $sets = [];
    $values = [':id' => $id];
    foreach ($columnMap as $jsonKey => $column) {
        if (array_key_exists($jsonKey, $data)) {
            $sets[] = "$column = :$column";
            $values[":$column"] = $data[$jsonKey];
        }
    }
    if (array_key_exists('perMemberTarget', $data)) {
        $sets[] = 'per_member_target = :per_member_target';
        $values[':per_member_target'] = (int) $data['perMemberTarget'];
    }
    if (array_key_exists('metric', $data)) {
        if (!isValidMetric($data['metric'])) {
            errorResponse('Invalid metric');
            return;
        }
        $sets[] = 'metric_json = :metric_json';
        $values[':metric_json'] = json_encode($data['metric']);
    }
    if (array_key_exists('isActive', $data)) {
        $sets[] = 'is_active = :is_active';
        $values[':is_active'] = empty($data['isActive']) ? 0 : 1;
    }
    if (array_key_exists('isSummerChallenge', $data)) {
        $sets[] = 'is_summer_challenge = :is_summer_challenge';
        $values[':is_summer_challenge'] = empty($data['isSummerChallenge']) ? 0 : 1;
    }

    if ($sets) {
        $sets[] = 'updated_at = :updated_at';
        $values[':updated_at'] = (int) round(microtime(true) * 1000);
        $pdo->prepare('UPDATE admin_challenges SET ' . implode(', ', $sets) . ' WHERE id = :id')->execute($values);
    }

    $stmt = $pdo->prepare('SELECT * FROM admin_challenges WHERE id = ?');
    $stmt->execute([$id]);
    jsonResponse(adminChallengeJson($stmt->fetch()));
}

function deleteAdminChallenge(PDO $pdo, string $id): void
{
    $pdo->prepare('DELETE FROM admin_challenges WHERE id = ?')->execute([$id]);
    jsonResponse(['ok' => true]);
}
