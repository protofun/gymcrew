<?php

/**
 * User-generated-content reports — lets a signed-in user flag a Crew (its name/icon) or a specific
 * member as objectionable. No admin UI reads these yet; for now they're reviewed directly via
 * phpMyAdmin (see db/schema.sql's content_reports table). This exists to satisfy the baseline
 * "report objectionable content" requirement every UGC app needs (Apple App Store Review Guideline
 * 1.2) — not a full moderation system.
 *
 * Routes (all require auth, see index.php):
 *   POST /reports -> { targetType: 'crew'|'user', targetId, reason, details? } -> { ok: true }
 */

const REPORT_REASONS = ['inappropriate_name', 'inappropriate_photo', 'harassment', 'spam', 'other'];

function handleReports(PDO $pdo, string $userId, string $method, ?array $body): void
{
    if ($method !== 'POST') {
        errorResponse('Method not allowed', 405);
        return;
    }

    $data = $body ?? [];
    $targetType = $data['targetType'] ?? null;
    $targetId = isset($data['targetId']) ? trim((string) $data['targetId']) : '';
    $reason = $data['reason'] ?? null;
    $details = isset($data['details']) ? trim((string) $data['details']) : null;
    if ($details === '') $details = null;
    if ($details !== null) $details = mb_substr($details, 0, 500);

    if (!in_array($targetType, ['crew', 'user'], true) || $targetId === '') {
        errorResponse('A valid targetType and targetId are required.');
        return;
    }
    if (!in_array($reason, REPORT_REASONS, true)) {
        errorResponse('A valid reason is required.');
        return;
    }

    $pdo->prepare(
        'INSERT INTO content_reports (reporter_user_id, target_type, target_id, reason, details, created_at)
         VALUES (?, ?, ?, ?, ?, ?)'
    )->execute([$userId, $targetType, $targetId, $reason, $details, (int) round(microtime(true) * 1000)]);

    jsonResponse(['ok' => true]);
}
