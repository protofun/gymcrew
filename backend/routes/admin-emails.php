<?php

/**
 * Every email address stored anywhere in the database, in one list — for copy-all / export from the
 * admin panel (see admin/src/pages/EmailAddresses.tsx). Deliberately a plain union of every table
 * that holds an address, each row tagged with its `source`, so the page can filter per table and by
 * date entirely client-side (this is a small dataset, not analytics-scale).
 *
 * Route (admin-auth only, dispatched from routes/admin.php):
 *   GET /admin/emails -> { emails: [{ email, source, name, createdAt }] } newest first
 *
 * Sources: users, founding_athletes, waitlist, support, contacts, admins. `createdAt` is always
 * epoch milliseconds (the `users` table stores a DATETIME, the rest a BIGINT of ms — normalised
 * here so the client never has to care). The permanent `bot-system` account is excluded like
 * everywhere else in the admin API.
 */
function respondWithAdminEmails(PDO $pdo): void
{
    $queries = [
        'users' => "SELECT email, full_name AS name, UNIX_TIMESTAMP(created_at) * 1000 AS created_at
                    FROM users WHERE id != 'bot-system' AND email IS NOT NULL AND email != ''",
        'founding_athletes' => "SELECT email, full_name AS name, created_at FROM founding_athletes WHERE email != ''",
        'waitlist' => "SELECT email, source AS name, created_at FROM waitlist_signups WHERE email != ''",
        'support' => "SELECT contact_email AS email, NULL AS name, created_at
                      FROM support_messages WHERE contact_email IS NOT NULL AND contact_email != ''",
        'contacts' => "SELECT email, name, created_at FROM admin_contacts WHERE email != ''",
        'admins' => "SELECT email, NULL AS name, created_at FROM admin_users WHERE email != ''",
    ];

    $emails = [];
    foreach ($queries as $source => $sql) {
        try {
            foreach ($pdo->query($sql)->fetchAll() as $row) {
                $emails[] = [
                    'email' => strtolower(trim((string) $row['email'])),
                    'source' => $source,
                    'name' => $row['name'] !== null && $row['name'] !== '' ? (string) $row['name'] : null,
                    'createdAt' => (int) $row['created_at'],
                ];
            }
        } catch (Throwable $e) {
            // A table that doesn't exist yet on this database (schema not fully imported) must not
            // take the whole list down — skip just that source.
            continue;
        }
    }

    usort($emails, fn($a, $b) => $b['createdAt'] <=> $a['createdAt']);
    jsonResponse(['emails' => $emails]);
}
