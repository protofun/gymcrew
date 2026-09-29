<?php

/**
 * A plain saved contact list for the admin's own outreach work — leads, gyms, influencers, press —
 * entirely separate from `users` (real app accounts). See db/schema.sql's `admin_contacts`.
 *
 * Routes (admin-auth only, dispatched from routes/admin.php):
 *   GET    /admin/contacts       -> every saved contact, newest first
 *   POST   /admin/contacts       -> { email, name?, category?, note? }
 *   PUT    /admin/contacts/:id   -> partial update (any of the same fields)
 *   DELETE /admin/contacts/:id
 */
function respondWithAdminContacts(PDO $pdo): void
{
    $rows = $pdo->query('SELECT * FROM admin_contacts ORDER BY created_at DESC')->fetchAll();
    jsonResponse(['contacts' => array_map('adminContactJson', $rows)]);
}

function adminContactJson(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'email' => $row['email'],
        'name' => $row['name'],
        'category' => $row['category'],
        'note' => $row['note'],
        'createdAt' => (int) $row['created_at'],
        'updatedAt' => (int) $row['updated_at'],
    ];
}

function createAdminContact(PDO $pdo, array $data): void
{
    $email = trim((string) ($data['email'] ?? ''));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        errorResponse('A valid email is required');
        return;
    }
    $now = (int) round(microtime(true) * 1000);
    try {
        $pdo->prepare(
            'INSERT INTO admin_contacts (email, name, category, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([
            $email,
            trim((string) ($data['name'] ?? '')) ?: null,
            trim((string) ($data['category'] ?? '')) ?: null,
            trim((string) ($data['note'] ?? '')) ?: null,
            $now,
            $now,
        ]);
    } catch (Throwable $e) {
        errorResponse('That email is already saved');
        return;
    }
    jsonResponse(['ok' => true]);
}

function updateAdminContact(PDO $pdo, string $id, array $data): void
{
    $fields = [];
    $params = [];
    foreach (['email', 'name', 'category', 'note'] as $key) {
        if (!array_key_exists($key, $data)) {
            continue;
        }
        $value = trim((string) $data[$key]);
        if ($key === 'email' && ($value === '' || !filter_var($value, FILTER_VALIDATE_EMAIL))) {
            errorResponse('A valid email is required');
            return;
        }
        $fields[] = "$key = ?";
        $params[] = ($value === '' && $key !== 'email') ? null : $value;
    }
    if (empty($fields)) {
        errorResponse('Nothing to update');
        return;
    }
    $fields[] = 'updated_at = ?';
    $params[] = (int) round(microtime(true) * 1000);
    $params[] = $id;
    try {
        $pdo->prepare('UPDATE admin_contacts SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
    } catch (Throwable $e) {
        errorResponse('That email is already saved');
        return;
    }
    jsonResponse(['ok' => true]);
}

function deleteAdminContact(PDO $pdo, string $id): void
{
    $pdo->prepare('DELETE FROM admin_contacts WHERE id = ?')->execute([$id]);
    jsonResponse(['ok' => true]);
}
