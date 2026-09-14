<?php

/**
 * Accepts one product-analytics event from the app (see src/lib/analytics.ts) — screen views and
 * named in-app actions. First-party: stored in our own analytics_events table (schema.sql) and
 * read back by the admin panel's Analytics page / User Detail "Behavior" tab (see
 * routes/analytics-events.php), never sent to a third-party analytics API.
 *
 * Routes (requires auth, see index.php):
 *   POST /activity -> { eventType, sessionId, screenName?, properties? } -> { ok: true }
 *
 * Dispatched as "/activity", not "/track" — ad blockers commonly block any URL path containing
 * "track" as a generic analytics heuristic, which would silently drop this data for real users.
 */
function handleTrack(PDO $pdo, string $userId, string $method, ?array $body): void
{
    if ($method !== 'POST') {
        errorResponse('Method not allowed', 405);
        return;
    }

    $data = $body ?? [];
    $eventType = trim((string) ($data['eventType'] ?? ''));
    $sessionId = trim((string) ($data['sessionId'] ?? ''));
    if ($eventType === '' || $sessionId === '') {
        errorResponse('eventType and sessionId are required', 422);
        return;
    }

    $screenName = isset($data['screenName']) && $data['screenName'] !== '' ? mb_substr((string) $data['screenName'], 0, 255) : null;
    $properties = isset($data['properties']) && is_array($data['properties']) ? json_encode($data['properties']) : null;

    $pdo->prepare(
        'INSERT INTO analytics_events (user_id, session_id, event_type, screen_name, properties_json, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )->execute([$userId, mb_substr($sessionId, 0, 64), mb_substr($eventType, 0, 64), $screenName, $properties, (int) round(microtime(true) * 1000)]);

    jsonResponse(['ok' => true]);
}
