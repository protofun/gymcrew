<?php

/**
 * Every cost and every bit of income for the app/business, manually logged — see db/schema.sql's
 * `finance_entries`. Not connected to any real payment processor (there is no subscription billing
 * built yet — see AGENTS.md); this is the admin's own bookkeeping log, entered by hand. Totals are
 * computed client-side from the full list rather than a separate summary endpoint, since this is a
 * small, manually-entered dataset, not analytics-scale data.
 *
 * Routes (admin-auth only, dispatched from routes/admin.php):
 *   GET    /admin/finance       -> every entry, newest first
 *   POST   /admin/finance       -> { type, amount, category?, description?, occurredOn, recurring?, notes? }
 *   PUT    /admin/finance/:id   -> partial update
 *   DELETE /admin/finance/:id
 */
const FINANCE_TYPES = ['cost', 'income'];
const FINANCE_RECURRING = ['none', 'monthly', 'yearly'];

function respondWithFinanceEntries(PDO $pdo): void
{
    $rows = $pdo->query('SELECT * FROM finance_entries ORDER BY occurred_on DESC, created_at DESC')->fetchAll();
    jsonResponse(['entries' => array_map('financeEntryJson', $rows)]);
}

function financeEntryJson(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'type' => $row['type'],
        'category' => $row['category'],
        'description' => $row['description'],
        // Sent as a plain euro amount (float) — the client never needs to know this is stored in cents.
        'amount' => round(((int) $row['amount_cents']) / 100, 2),
        'currency' => $row['currency'],
        'occurredOn' => $row['occurred_on'],
        'recurring' => $row['recurring'],
        'notes' => $row['notes'],
        'createdAt' => (int) $row['created_at'],
        'updatedAt' => (int) $row['updated_at'],
    ];
}

function createFinanceEntry(PDO $pdo, array $data): void
{
    $type = $data['type'] ?? null;
    $occurredOn = trim((string) ($data['occurredOn'] ?? ''));
    $amount = isset($data['amount']) ? (float) $data['amount'] : null;
    if (!in_array($type, FINANCE_TYPES, true) || $amount === null || $amount < 0 || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $occurredOn)) {
        errorResponse('type, a non-negative amount, and occurredOn (YYYY-MM-DD) are required');
        return;
    }
    $recurring = in_array($data['recurring'] ?? null, FINANCE_RECURRING, true) ? $data['recurring'] : 'none';
    $now = (int) round(microtime(true) * 1000);
    $pdo->prepare(
        'INSERT INTO finance_entries (type, category, description, amount_cents, currency, occurred_on, recurring, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $type,
        trim((string) ($data['category'] ?? '')) ?: null,
        trim((string) ($data['description'] ?? '')) ?: null,
        (int) round($amount * 100),
        trim((string) ($data['currency'] ?? 'EUR')) ?: 'EUR',
        $occurredOn,
        $recurring,
        trim((string) ($data['notes'] ?? '')) ?: null,
        $now,
        $now,
    ]);
    jsonResponse(['ok' => true, 'id' => (int) $pdo->lastInsertId()]);
}

function updateFinanceEntry(PDO $pdo, string $id, array $data): void
{
    $fields = [];
    $params = [];

    if (array_key_exists('type', $data)) {
        if (!in_array($data['type'], FINANCE_TYPES, true)) {
            errorResponse('Invalid type');
            return;
        }
        $fields[] = 'type = ?';
        $params[] = $data['type'];
    }
    if (array_key_exists('category', $data)) {
        $fields[] = 'category = ?';
        $params[] = trim((string) $data['category']) ?: null;
    }
    if (array_key_exists('description', $data)) {
        $fields[] = 'description = ?';
        $params[] = trim((string) $data['description']) ?: null;
    }
    if (array_key_exists('amount', $data)) {
        $amount = (float) $data['amount'];
        if ($amount < 0) {
            errorResponse('amount cannot be negative');
            return;
        }
        $fields[] = 'amount_cents = ?';
        $params[] = (int) round($amount * 100);
    }
    if (array_key_exists('occurredOn', $data)) {
        $occurredOn = trim((string) $data['occurredOn']);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $occurredOn)) {
            errorResponse('occurredOn must be YYYY-MM-DD');
            return;
        }
        $fields[] = 'occurred_on = ?';
        $params[] = $occurredOn;
    }
    if (array_key_exists('recurring', $data)) {
        if (!in_array($data['recurring'], FINANCE_RECURRING, true)) {
            errorResponse('Invalid recurring value');
            return;
        }
        $fields[] = 'recurring = ?';
        $params[] = $data['recurring'];
    }
    if (array_key_exists('notes', $data)) {
        $fields[] = 'notes = ?';
        $params[] = trim((string) $data['notes']) ?: null;
    }
    if (empty($fields)) {
        errorResponse('Nothing to update');
        return;
    }
    $fields[] = 'updated_at = ?';
    $params[] = (int) round(microtime(true) * 1000);
    $params[] = $id;
    $pdo->prepare('UPDATE finance_entries SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
    jsonResponse(['ok' => true]);
}

function deleteFinanceEntry(PDO $pdo, string $id): void
{
    $pdo->prepare('DELETE FROM finance_entries WHERE id = ?')->execute([$id]);
    jsonResponse(['ok' => true]);
}
