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
 *   POST   /crews/:id/icon             -> upload a real photo as the crew icon (leader/co-leader
 *                                          only) — saves the decoded image under uploads/crew-icons/
 *                                          and stores its public URL in `icon`, same field a preset
 *                                          key or a DiceBear-generated URL already used.
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

    if ($sub === 'discover' && $method === 'GET') {
        respondWithDiscoverableCrews($pdo, $userId);
        return;
    }

    if ($sub === 'leaderboard' && $method === 'GET') {
        respondWithCrewLeaderboard($pdo, $userId);
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

    if (count($segments) === 3 && $segments[2] === 'xp' && $method === 'POST') {
        awardCrewXp($pdo, $userId, $crewId, $body ?? []);
        return;
    }

    if (count($segments) === 3 && $segments[2] === 'icon' && $method === 'POST') {
        uploadCrewIcon($pdo, $userId, $crewId, $body ?? []);
        return;
    }

    if (count($segments) === 3 && $segments[2] === 'leave' && $method === 'POST') {
        leaveCrew($pdo, $userId, $crewId);
        return;
    }

    if (count($segments) === 3 && $segments[2] === 'join-public' && $method === 'POST') {
        joinPublicCrew($pdo, $userId, $crewId);
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

/** Same 20-tier ladder as src/lib/division.ts's `DIVISIONS` — keep both in sync if it ever changes. */
const CREW_DIVISION_ORDER = [
    'Rookie', 'Novice', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Elite', 'Master',
    'Grandmaster', 'Champion', 'Titan', 'Mythic', 'Immortal', 'Legend', 'Overlord', 'Supreme',
    'Conqueror', 'Dominator', 'Apex',
];

/** Same as src/lib/division.ts's `DIVISION_XP_REQUIRED` — XP needed to climb OUT of each division. */
const CREW_DIVISION_XP_REQUIRED = [
    'Rookie' => 500, 'Novice' => 750, 'Bronze' => 1100, 'Silver' => 1600, 'Gold' => 2300,
    'Platinum' => 3300, 'Diamond' => 4700, 'Elite' => 6700, 'Master' => 9600, 'Grandmaster' => 13800,
    'Champion' => 19800, 'Titan' => 28500, 'Mythic' => 41000, 'Immortal' => 59000, 'Legend' => 85000,
    'Overlord' => 122000, 'Supreme' => 176000, 'Conqueror' => 253000, 'Dominator' => 364000,
];

/**
 * Server-side port of src/lib/division.ts's `advanceDivision` — the authority now has to live here
 * too, since XP grants are applied server-side (see `awardCrewXp`), not just locally. Adds
 * `$xpGained`, rolling over into however many divisions it covers, and returns
 * [newXp, newDivision, divisionsNewlyReached] (the last one empty unless it actually climbed).
 */
function advanceCrewDivision(int $currentXp, string $currentDivision, int $xpGained): array
{
    $xp = $currentXp + $xpGained;
    $division = in_array($currentDivision, CREW_DIVISION_ORDER, true) ? $currentDivision : 'Rookie';
    $newlyReached = [];

    while (true) {
        $index = array_search($division, CREW_DIVISION_ORDER, true);
        $next = $index < count(CREW_DIVISION_ORDER) - 1 ? CREW_DIVISION_ORDER[$index + 1] : null;
        $required = CREW_DIVISION_XP_REQUIRED[$division] ?? null;
        if ($next === null || $required === null || $xp < $required) break;
        $xp -= $required;
        $division = $next;
        $newlyReached[] = $division;
    }

    return [$xp, $division, $newlyReached];
}

/**
 * Adds real crew XP for a completed challenge/battle (see src/components/ChallengesTab.tsx) —
 * open to any crew member, not just leader/co-leader (unlike `updateCrew`), since any member's
 * action can earn it. `awardKey` (a stable id for "this specific completion", e.g. a weekly-
 * challenge instance id, or "<battleId>:battle-win") is the idempotency guard: every crew member's
 * device independently detects the same completion, so without this the same reward would apply
 * once per member instead of once per crew. See db/schema.sql's `crew_xp_awards`.
 */
function awardCrewXp(PDO $pdo, string $userId, string $crewId, array $data): void
{
    $role = myRoleInCrew($pdo, $userId, $crewId);
    if ($role === null) {
        errorResponse('Not a member of this crew', 403);
        return;
    }

    $awardKey = trim((string) ($data['awardKey'] ?? ''));
    // Capped well above any real single-completion reward client-side today (a few hundred XP) —
    // a member's device is trusted for the reward *amount* of a real completion, but not for an
    // arbitrary number.
    $amount = min(max(0, (int) ($data['amount'] ?? 0)), 1000);
    if ($amount <= 0 || $awardKey === '') {
        errorResponse('amount and awardKey are required');
        return;
    }

    $now = (int) round(microtime(true) * 1000);
    try {
        $pdo->prepare('INSERT INTO crew_xp_awards (crew_id, award_key, amount, awarded_by, awarded_at) VALUES (?, ?, ?, ?, ?)')
            ->execute([$crewId, $awardKey, $amount, $userId, $now]);
    } catch (Throwable $e) {
        // Duplicate (crew_id, award_key) — another member's device already reported this exact
        // completion. Not an error: the crew's current state (already reflecting that award) is
        // exactly what this device should converge to.
        jsonResponse(crewWithMembersJson($pdo, $crewId));
        return;
    }

    $crewStmt = $pdo->prepare('SELECT xp, division, division_history_json FROM crews WHERE id = ?');
    $crewStmt->execute([$crewId]);
    $crew = $crewStmt->fetch();
    if (!$crew) {
        errorResponse('Crew not found', 404);
        return;
    }

    [$newXp, $newDivision, $newlyReached] = advanceCrewDivision((int) $crew['xp'], $crew['division'], $amount);

    if ($newlyReached) {
        $history = json_decode((string) $crew['division_history_json'], true) ?: [];
        foreach ($newlyReached as $division) {
            $history[] = ['division' => $division, 'reachedAt' => $now];
        }
        $pdo->prepare('UPDATE crews SET xp = ?, division = ?, division_history_json = ? WHERE id = ?')
            ->execute([$newXp, $newDivision, json_encode($history), $crewId]);
    } else {
        $pdo->prepare('UPDATE crews SET xp = ? WHERE id = ?')->execute([$newXp, $crewId]);
    }

    jsonResponse(crewWithMembersJson($pdo, $crewId));
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
        'warAutoMatchEnabled' => (bool) $crew['war_auto_match_enabled'],
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

/**
 * Crews set to "Public" (see crew/settings.tsx's PRIVACY_DESCRIPTION — "Anyone can find and join
 * this crew instantly") — the browse list for build-crew/discover.tsx. The caller's own crew (if
 * any) is excluded; joining only makes sense when crew-less, same rule `joinCrew` above enforces.
 * Lightweight by design (no member list) — just enough to decide whether to join, same shape
 * CrewCard already renders elsewhere.
 */
function respondWithDiscoverableCrews(PDO $pdo, string $userId): void
{
    $myCrewId = findMyCrewId($pdo, $userId);

    $stmt = $pdo->prepare(
        "SELECT c.id, c.name, c.tagline, c.icon, c.training_type, c.max_members,
                (SELECT COUNT(*) FROM crew_members WHERE crew_id = c.id) AS member_count
         FROM crews c
         WHERE c.privacy = 'public' AND c.id != ?
         ORDER BY c.created_at DESC
         LIMIT 50"
    );
    $stmt->execute([$myCrewId ?? '']);

    $crews = array_map(function (array $row): array {
        return [
            'id' => $row['id'],
            'name' => $row['name'],
            'tagline' => $row['tagline'],
            'icon' => $row['icon'],
            'trainingType' => $row['training_type'],
            'memberCount' => (int) $row['member_count'],
            'maxMembers' => (int) $row['max_members'],
        ];
    }, $stmt->fetchAll());

    jsonResponse($crews);
}

/**
 * Real crews (including the permanent illustrative bot crews seeded above — genuine rows, not
 * client-side mock data) in the caller's own crew's division, ranked by `xp` — a fair comparison
 * since every crew in the same division shares the same rolling XP scale (see
 * `advanceCrewDivision`). Replaces the old client-side static `OTHER_CREWS_POWER` mock — see
 * src/app/crew/leaderboard.tsx. `myDivision` is `null` when the caller isn't in a crew at all.
 */
function respondWithCrewLeaderboard(PDO $pdo, string $userId): void
{
    $myCrewId = findMyCrewId($pdo, $userId);
    if ($myCrewId === null) {
        jsonResponse(['crews' => [], 'myDivision' => null]);
        return;
    }

    $divisionStmt = $pdo->prepare('SELECT division FROM crews WHERE id = ?');
    $divisionStmt->execute([$myCrewId]);
    $myDivision = $divisionStmt->fetch()['division'] ?? 'Rookie';

    $stmt = $pdo->prepare('SELECT id, name, icon, xp FROM crews WHERE division = ? ORDER BY xp DESC LIMIT 50');
    $stmt->execute([$myDivision]);
    $crews = array_map(function (array $row): array {
        return ['id' => $row['id'], 'name' => $row['name'], 'icon' => $row['icon'], 'xp' => (int) $row['xp']];
    }, $stmt->fetchAll());

    jsonResponse(['crews' => $crews, 'myDivision' => $myDivision]);
}

/** Instant-join for a crew found via Discover — the "public" privacy tier's whole point (see
 * respondWithDiscoverableCrews above), unlike `joinCrew`'s invite-code gate. */
function joinPublicCrew(PDO $pdo, string $userId, string $crewId): void
{
    if (findMyCrewId($pdo, $userId) !== null) {
        errorResponse('Already in a crew — leave it first', 409);
        return;
    }

    $stmt = $pdo->prepare("SELECT id, max_members FROM crews WHERE id = ? AND privacy = 'public'");
    $stmt->execute([$crewId]);
    $crew = $stmt->fetch();
    if (!$crew) {
        errorResponse('Crew not found', 404);
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
        'warAutoMatchEnabled' => 'war_auto_match_enabled',
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

    if ($sets) {
        $pdo->prepare('UPDATE crews SET ' . implode(', ', $sets) . ' WHERE id = :id')->execute($values);
    }

    jsonResponse(crewWithMembersJson($pdo, $crewId));
}

/** Accepts a base64-encoded photo (client sends a data URI or bare base64 via expo-image-picker's
 * `base64: true` option), saves it under uploads/crew-icons/ (see config.php's saveUploadedImage,
 * shared with every other upload-a-photo endpoint), and stores the resulting public URL as the
 * crew's icon — the same `icon` field a preset key or DiceBear URL already occupies, so every
 * reader (CrewIconBadge) already handles it via its existing "starts with http" branch. */
function uploadCrewIcon(PDO $pdo, string $userId, string $crewId, array $data): void
{
    $role = myRoleInCrew($pdo, $userId, $crewId);
    if ($role !== 'leader' && $role !== 'co-leader') {
        errorResponse('Only the crew leader or co-leader can change the crew photo', 403);
        return;
    }

    $raw = (string) ($data['imageBase64'] ?? '');
    if ($raw === '') {
        errorResponse('imageBase64 is required');
        return;
    }

    $contentType = (string) ($data['contentType'] ?? 'image/jpeg');
    $url = saveUploadedImage('crew-icons', $crewId, $raw, $contentType);
    if ($url === null) {
        return; // saveUploadedImage already sent the error response
    }

    $pdo->prepare('UPDATE crews SET icon = ? WHERE id = ?')->execute([$url, $crewId]);
    jsonResponse(['icon' => $url]);
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
