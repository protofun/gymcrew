<?php

/**
 * Remote controls for the app, edited on the admin panel's "App Controls" page (stored in
 * `app_settings`, see routes/admin-ops.php's updateSetting) and read by the app on launch.
 *
 * Public — no Clerk JWT — on purpose: maintenance mode and "please update" have to reach people who
 * are signed out, or whose session is the very thing that's broken. It only ever returns those
 * switches, never user data.
 *
 *   GET /app-config -> {
 *     maintenance: { enabled, message },
 *     update:      { minVersion, message, iosUrl, androidUrl },
 *     features:    { aiMealScan }
 *   }
 *
 * Settings keys: maintenance_enabled ('1'/'0'), maintenance_message, min_app_version (e.g. "1.2.0"),
 * update_message, update_url_ios, update_url_android, ai_scan_enabled ('1'/'0'), ai_scan_daily_limit.
 */

/** One app_settings value, or `$default` if it was never set (or is empty). */
function getAppSetting(PDO $pdo, string $key, string $default = ''): string
{
    $stmt = $pdo->prepare('SELECT setting_value FROM app_settings WHERE setting_key = ?');
    $stmt->execute([$key]);
    $value = $stmt->fetchColumn();
    return $value === false || $value === '' ? $default : (string) $value;
}

function handleAppConfig(PDO $pdo): void
{
    $settings = [];
    foreach ($pdo->query('SELECT setting_key, setting_value FROM app_settings')->fetchAll() as $row) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }

    // A flipped switch has to take effect on the next launch, not whenever a cache expires.
    header('Cache-Control: no-store');
    jsonResponse([
        'maintenance' => [
            'enabled' => ($settings['maintenance_enabled'] ?? '0') === '1',
            'message' => $settings['maintenance_message'] ?? '',
        ],
        'update' => [
            'minVersion' => $settings['min_app_version'] ?? '',
            'message' => $settings['update_message'] ?? '',
            'iosUrl' => $settings['update_url_ios'] ?? '',
            'androidUrl' => $settings['update_url_android'] ?? '',
        ],
        'features' => [
            'aiMealScan' => ($settings['ai_scan_enabled'] ?? '1') !== '0',
        ],
    ]);
}
