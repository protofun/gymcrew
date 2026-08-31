<?php

/**
 * Real, genuinely shared crews — see db/schema.sql's `crews`/`crew_members` tables. Unlike
 * routes/state.php's generic blob (which only ever stores "this account's own view"), every write
 * here lands on ONE shared row that every real member sees and edits together.
 *
 * Routes (all require auth, see index.php):
 *   GET    /crews/mine                 -> this account's crew (with members), or null
 *   POST   /crews                      -> create a crew (fails if already in one)
 *   POST   /crews/join                 -> join via invite code (fails if already in one, full, etc.)
 *   PUT    /crews/:id                  -> update settings (leader/co-leader only)
 *   POST   /crews/:id/leave            -> leave (auto-deletes the crew if it was the last member)
 *   DELETE /crews/:id/members/:userId  -> kick a member (leader/co-leader only)
 *   GET    /crews/:id/activity         -> every member's real recent workouts/PRs/profile — powers
 *                                          the Overview tab's muscle-balance and recent-achievement
 *                                          cards with genuine crewmate data instead of a mock
 *                                          generator (see lib/crew-muscle-balance.ts,
 *                                          lib/crew-achievements.ts). No new tables — just queries
 *                                          `workouts`/`personal_records`/`users` filtered to the
 *                                          crew's real membership.
 */

/** A stable, decent-looking placeholder avatar for a member who hasn't uploaded/generated a real
 * photo yet (see routes/profile.php's avatarUrl) — deterministic on user id so the same person
 * always gets the same one, unlike the random picsum.photos placeholder this replaces. DiceBear's
 * API needs no key and is free to hotlink directly. */
function defaultAvatarUrl(string $userId): string
{
    return 'https://api.dicebear.com/9.x/avataaars/png?seed=' . urlencode($userId) . '&size=200';
}

function handleCrews(PDO $pdo, string $userId, string $method, ?array $body, array $segments): void
{
    // segments[0] is always "crews" (that's how we got routed here) — everything after is ours.
    $sub = $segments[1] ?? null;

    if ($sub === 'mine' && $method === 'GET') {
        respondWithMyCrew($pdo, $userId);
        return;
    }

    if ($sub === 'join' && $method === 'POST') {
        joinCrew($pdo, $userId, $body ?? []);
        return;
    }

    if ($sub === null && $method === 'POST') {
        createCrew($pdo, $userId, $body ?? []);
        return;
    }

    // Everything below operates on a specific crew id: /crews/:id[...]
    $crewId = $sub;
    if ($crewId === null) {
        errorResponse('Not found', 404);
        return;
    }

    if (count($segments) === 2 && $method === 'PUT') {
        updateCrew($pdo, $userId, $crewId, $body ?? []);
        return;
    }

    if (count($segments) === 3 && $segments[2] === 'leave' && $method === 'POST') {
        leaveCrew($pdo, $userId, $crewId);
        return;
    }

    if (count($segments) === 4 && $segments[2] === 'members' && $method === 'DELETE') {
        kickMember($pdo, $userId, $crewId, $segments[3]);
        return;
    }

    if (count($segments) === 3 && $segments[2] === 'activity' && $method === 'GET') {
        respondWithCrewActivity($pdo, $userId, $crewId);
        return;
    }

    errorResponse('Not found', 404);
}

function respondWithCrewActivity(PDO $pdo, string $userId, string $crewId): void
{
    if (myRoleInCrew($pdo, $userId, $crewId) === null) {
        errorResponse('Not a member of this crew', 403);
        return;
    }

    $memberIdsStmt = $pdo->prepare('SELECT user_id FROM crew_members WHERE crew_id = ?');
    $memberIdsStmt->execute([$crewId]);
    $memberIds = array_column($memberIdsStmt->fetchAll(), 'user_id');
    if (!$memberIds) {
        jsonResponse(['members' => (object) []]);
        return;
    }

    $placeholders = implode(',', array_fill(0, count($memberIds), '?'));

    // Every workout, not just a recent window — the Stats tab's "All Time" range and challenge
    // trends both need real history further back than "this week," and there's no server-side way
    // to know in advance how far a given client-side call needs to look. Fine at this app's actual
    // scale (a handful of real users so far); revisit with a date-range param if crews grow large
    // enough for this to matter.
    $workoutsStmt = $pdo->prepare(
        "SELECT * FROM workouts WHERE user_id IN ($placeholders) ORDER BY completed_at DESC"
    );
    $workoutsStmt->execute($memberIds);
    $workoutsByUser = [];
    foreach ($workoutsStmt->fetchAll() as $row) {
        $workoutsByUser[$row['user_id']][] = workoutRowToJson($row);
    }

    $recordsStmt = $pdo->prepare("SELECT * FROM personal_records WHERE user_id IN ($placeholders)");
    $recordsStmt->execute($memberIds);
    $recordsByUser = [];
    foreach ($recordsStmt->fetchAll() as $row) {
        $recordsByUser[$row['user_id']][$row['exercise_id']] = recordRowToJson($row);
    }

    $profileStmt = $pdo->prepare("SELECT id, gender, weight_kg FROM users WHERE id IN ($placeholders)");
    $profileStmt->execute($memberIds);
    $profileByUser = [];
    foreach ($profileStmt->fetchAll() as $row) {
        $profileByUser[$row['id']] = [
            'gender' => $row['gender'],
            'weightKg' => $row['weight_kg'] !== null ? (float) $row['weight_kg'] : null,
        ];
    }

    $members = [];
    foreach ($memberIds as $memberId) {
        $members[$memberId] = [
            'recentWorkouts' => $workoutsByUser[$memberId] ?? [],
            'records' => $recordsByUser[$memberId] ?? (object) [],
            'profile' => $profileByUser[$memberId] ?? ['gender' => null, 'weightKg' => null],
        ];
    }

    jsonResponse(['members' => $members]);
}

function generateInviteCode(): string
{
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I — avoids lookalike confusion
    $code = '';
    for ($i = 0; $i < 8; $i++) {
        $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    }
    return $code;
}

/** The crew_id a user currently belongs to, or null. */
function findMyCrewId(PDO $pdo, string $userId): ?string
{
    $stmt = $pdo->prepare('SELECT crew_id FROM crew_members WHERE user_id = ?');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    return $row ? $row['crew_id'] : null;
}

/** This user's role in `$crewId`, or null if they're not a member. */
function myRoleInCrew(PDO $pdo, string $userId, string $crewId): ?string
{
    $stmt = $pdo->prepare('SELECT role FROM crew_members WHERE crew_id = ? AND user_id = ?');
    $stmt->execute([$crewId, $userId]);
    $row = $stmt->fetch();
    return $row ? $row['role'] : null;
}

/** True if `$name` is free to take — either no crew has it (case-insensitively), or `$excludeCrewId`
 * already does (so renaming a crew to its own current name never trips the check). */
function isCrewNameAvailable(PDO $pdo, string $name, ?string $excludeCrewId = null): bool
{
    $stmt = $pdo->prepare('SELECT id FROM crews WHERE LOWER(name) = LOWER(?)');
    $stmt->execute([$name]);
    $row = $stmt->fetch();
    return !$row || $row['id'] === $excludeCrewId;
}

function crewWithMembersJson(PDO $pdo, string $crewId): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM crews WHERE id = ?');
    $stmt->execute([$crewId]);
    $crew = $stmt->fetch();
    if (!$crew) return null;

    $membersStmt = $pdo->prepare(
        'SELECT cm.user_id, cm.role, cm.joined_at, u.full_name, u.username, u.avatar_url,
                COALESCE(pl.xp, 0) AS xp, COALESCE(pl.division, "Rookie") AS division
         FROM crew_members cm
         JOIN users u ON u.id = cm.user_id
         LEFT JOIN profile_level pl ON pl.user_id = cm.user_id
         WHERE cm.crew_id = ?
         ORDER BY cm.joined_at ASC'
    );
    $membersStmt->execute([$crewId]);

    $members = array_map(function (array $row) {
        $name = $row['full_name'] ?: 'Member';
        // Real, unique usernames only exist going forward (see routes/profile.php) — an account that
        // onboarded before that falls back to a slug of their name, same as every account used to get.
        $username = $row['username'] ?: (strtolower(preg_replace('/[^a-z0-9]/i', '', $name)) ?: 'member');
        return [
            'id' => $row['user_id'],
            'name' => $name,
            'username' => $username,
            'avatarUrl' => $row['avatar_url'] ?: defaultAvatarUrl($row['user_id']),
            'level' => (int) $row['xp'],
            'division' => $row['division'],
            'role' => $row['role'],
            'isAdmin' => $row['role'] !== 'member',
        ];
    }, $membersStmt->fetchAll());

    return [
        'id' => $crew['id'],
        'name' => $crew['name'],
        'tagline' => $crew['tagline'],
        'icon' => $crew['icon'],
        'trainingType' => $crew['training_type'],
        'privacy' => $crew['privacy'],
        'joinRequestsEnabled' => (bool) $crew['join_requests_enabled'],
        'maxMembers' => (int) $crew['max_members'],
        'inviteCode' => $crew['invite_code'],
        'xp' => (int) $crew['xp'],
        'division' => $crew['division'],
        'divisionHistory' => json_decode($crew['division_history_json'], true),
        'createdAt' => (int) $crew['created_at'],
        'members' => $members,
    ];
}

function respondWithMyCrew(PDO $pdo, string $userId): void
{
    $crewId = findMyCrewId($pdo, $userId);
    jsonResponse($crewId ? crewWithMembersJson($pdo, $crewId) : null);
}

function createCrew(PDO $pdo, string $userId, array $data): void
{
    $name = trim((string) ($data['name'] ?? ''));
    if ($name === '') {
        errorResponse('name is required');
        return;
    }
    if (findMyCrewId($pdo, $userId) !== null) {
        errorResponse('Already in a crew — leave it first', 409);
        return;
    }
    if (!isCrewNameAvailable($pdo, $name)) {
        errorResponse('That crew name is already taken.', 409);
        return;
    }

    $crewId = 'crew-' . bin2hex(random_bytes(8));
    $now = (int) round(microtime(true) * 1000);

    $inviteCode = generateInviteCode();
    // Astronomically unlikely, but the invite_code column is UNIQUE — retry a few times rather
    // than ever 500 on a collision.
    for ($attempt = 0; $attempt < 5; $attempt++) {
        $check = $pdo->prepare('SELECT 1 FROM crews WHERE invite_code = ?');
        $check->execute([$inviteCode]);
        if (!$check->fetch()) break;
        $inviteCode = generateInviteCode();
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare(
            'INSERT INTO crews
                (id, name, tagline, icon, training_type, privacy, join_requests_enabled, max_members, invite_code, division_history_json, created_by, created_at)
             VALUES
                (:id, :name, :tagline, :icon, :training_type, :privacy, :join_requests_enabled, :max_members, :invite_code, :division_history_json, :created_by, :created_at)'
        )->execute([
            ':id' => $crewId,
            ':name' => $name,
            ':tagline' => $data['tagline'] ?? '',
            ':icon' => $data['icon'] ?? 'gorilla',
            ':training_type' => $data['trainingType'] ?? '',
            ':privacy' => in_array($data['privacy'] ?? '', ['invite-only', 'open', 'public'], true) ? $data['privacy'] : 'invite-only',
            ':join_requests_enabled' => 1,
            ':max_members' => isset($data['maxMembers']) ? (int) $data['maxMembers'] : 8,
            ':invite_code' => $inviteCode,
            ':division_history_json' => json_encode([['division' => 'Rookie', 'reachedAt' => $now]]),
            ':created_by' => $userId,
            ':created_at' => $now,
        ]);

        $pdo->prepare('INSERT INTO crew_members (crew_id, user_id, role, joined_at) VALUES (?, ?, "leader", ?)')
            ->execute([$crewId, $userId, $now]);

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    jsonResponse(crewWithMembersJson($pdo, $crewId), 201);
}

function joinCrew(PDO $pdo, string $userId, array $data): void
{
    $inviteCode = trim((string) ($data['inviteCode'] ?? ''));
    if ($inviteCode === '') {
        errorResponse('inviteCode is required');
        return;
    }
    if (findMyCrewId($pdo, $userId) !== null) {
        errorResponse('Already in a crew — leave it first', 409);
        return;
    }

    $stmt = $pdo->prepare('SELECT id, max_members FROM crews WHERE invite_code = ?');
    $stmt->execute([strtoupper($inviteCode)]);
    $crew = $stmt->fetch();
    if (!$crew) {
        errorResponse('Invalid invite code', 404);
        return;
    }

    $countStmt = $pdo->prepare('SELECT COUNT(*) AS c FROM crew_members WHERE crew_id = ?');
    $countStmt->execute([$crew['id']]);
    if ((int) $countStmt->fetch()['c'] >= (int) $crew['max_members']) {
        errorResponse('This crew is full', 409);
        return;
    }

    $pdo->prepare('INSERT INTO crew_members (crew_id, user_id, role, joined_at) VALUES (?, ?, "member", ?)')
        ->execute([$crew['id'], $userId, (int) round(microtime(true) * 1000)]);

    jsonResponse(crewWithMembersJson($pdo, $crew['id']));
}

function updateCrew(PDO $pdo, string $userId, string $crewId, array $data): void
{
    $role = myRoleInCrew($pdo, $userId, $crewId);
    if ($role !== 'leader' && $role !== 'co-leader') {
        errorResponse('Only the crew leader or co-leader can change settings', 403);
        return;
    }

    if (array_key_exists('name', $data)) {
        $data['name'] = trim((string) $data['name']);
        if ($data['name'] === '') {
            errorResponse('name is required');
            return;
        }
        if (!isCrewNameAvailable($pdo, $data['name'], $crewId)) {
            errorResponse('That crew name is already taken.', 409);
            return;
        }
    }

    $columnMap = [
        'name' => 'name',
        'tagline' => 'tagline',
        'icon' => 'icon',
        'trainingType' => 'training_type',
        'joinRequestsEnabled' => 'join_requests_enabled',
        'maxMembers' => 'max_members',
    ];
    $sets = [];
    $values = [':id' => $crewId];
    foreach ($columnMap as $jsonKey => $column) {
        if (array_key_exists($jsonKey, $data)) {
            $sets[] = "$column = :$column";
            $values[":$column"] = is_bool($data[$jsonKey]) ? ($data[$jsonKey] ? 1 : 0) : $data[$jsonKey];
        }
    }
    if (array_key_exists('privacy', $data) && in_array($data['privacy'], ['invite-only', 'open', 'public'], true)) {
        $sets[] = 'privacy = :privacy';
        $values[':privacy'] = $data['privacy'];
    }
    // xp/division updates (crew-level progress, e.g. from a completed challenge) — same shape as
    // profile_level, applied by whichever member's action earned it, not leader-gated.
    if (isset($data['xp'], $data['division'], $data['divisionHistory'])) {
        $sets[] = 'xp = :xp, division = :division, division_history_json = :division_history_json';
        $values[':xp'] = (int) $data['xp'];
        $values[':division'] = $data['division'];
        $values[':division_history_json'] = json_encode($data['divisionHistory']);
    }

    if ($sets) {
        $pdo->prepare('UPDATE crews SET ' . implode(', ', $sets) . ' WHERE id = :id')->execute($values);
    }

    jsonResponse(crewWithMembersJson($pdo, $crewId));
}

function leaveCrew(PDO $pdo, string $userId, string $crewId): void
{
    $role = myRoleInCrew($pdo, $userId, $crewId);
    if ($role === null) {
        errorResponse('Not a member of this crew', 404);
        return;
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM crew_members WHERE crew_id = ? AND user_id = ?')->execute([$crewId, $userId]);

        $countStmt = $pdo->prepare('SELECT COUNT(*) AS c FROM crew_members WHERE crew_id = ?');
        $countStmt->execute([$crewId]);
        $remaining = (int) $countStmt->fetch()['c'];

        if ($remaining === 0) {
            // Cascades to crew_members too, but that's already empty at this point.
            $pdo->prepare('DELETE FROM crews WHERE id = ?')->execute([$crewId]);
        } elseif ($role === 'leader') {
            // Promote whoever joined earliest among those left (co-leader first if any).
            $nextLeaderStmt = $pdo->prepare(
                'SELECT user_id FROM crew_members WHERE crew_id = ? ORDER BY (role = "co-leader") DESC, joined_at ASC LIMIT 1'
            );
            $nextLeaderStmt->execute([$crewId]);
            $nextLeader = $nextLeaderStmt->fetch();
            if ($nextLeader) {
                $pdo->prepare('UPDATE crew_members SET role = "leader" WHERE crew_id = ? AND user_id = ?')
                    ->execute([$crewId, $nextLeader['user_id']]);
            }
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    jsonResponse(['ok' => true]);
}

function kickMember(PDO $pdo, string $userId, string $crewId, string $targetUserId): void
{
    $myRole = myRoleInCrew($pdo, $userId, $crewId);
    if ($myRole !== 'leader' && $myRole !== 'co-leader') {
        errorResponse('Only the crew leader or co-leader can remove members', 403);
        return;
    }
    if ($targetUserId === $userId) {
        errorResponse('Use leave instead of kicking yourself', 400);
        return;
    }

    $targetRole = myRoleInCrew($pdo, $targetUserId, $crewId);
    if ($targetRole === 'leader' || ($targetRole === 'co-leader' && $myRole !== 'leader')) {
        errorResponse('You cannot remove this member', 403);
        return;
    }

    $pdo->prepare('DELETE FROM crew_members WHERE crew_id = ? AND user_id = ?')->execute([$crewId, $targetUserId]);
    jsonResponse(['ok' => true]);
}
