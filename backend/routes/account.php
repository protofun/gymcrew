<?php

/**
 * Deleting a GymCrew account must remove this user's row from every table that isn't already
 * cascade-deleted by MySQL, and vice versa: `users` is the root every other app table's
 * `ON DELETE CASCADE` foreign key points at (see db/schema.sql), so removing this one row is
 * enough to also drop the user's workouts, personal_records, personal_record_history,
 * body_log_entries, profile_level, user_state rows, and their crew_members membership. Call this
 * BEFORE deleting the Clerk account (see src/app/profile/account.tsx) — the JWT this endpoint
 * authenticates with stops being valid the moment Clerk's side is gone.
 *
 * One known, accepted limitation: `crews.created_by` also cascades, so a user who FOUNDED a crew
 * deleting their account deletes the whole crew (and every other member's membership) with it —
 * crew ownership transfer is a separate, not-yet-built feature.
 */
function handleAccount(PDO $pdo, string $userId, string $method): void
{
    if ($method === 'DELETE') {
        $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$userId]);
        jsonResponse(['ok' => true]);
        return;
    }

    errorResponse('Method not allowed', 405);
}
