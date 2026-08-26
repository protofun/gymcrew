<?php

/**
 * TEMPORARY diagnostic script — upload to public_html/api/diag.php, visit it once in a browser
 * or via curl, then DELETE it from the server. Reports whether the DB connection actually works
 * and, if not, the exact PDO error — without ever printing DB_PASS.
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json');

$host = env('DB_HOST', 'localhost');
$name = env('DB_NAME');
$user = env('DB_USER');
$pass = env('DB_PASS') ?? '';

/** Reveals just enough to spot a stray quote/typo/whitespace without leaking the real password. */
function maskSecret(string $value): string
{
    $len = strlen($value);
    if ($len === 0) return '(empty)';
    if ($len <= 2) return str_repeat('*', $len) . " (len=$len)";
    return $value[0] . str_repeat('*', $len - 2) . $value[$len - 1] . " (len=$len)";
}

$result = [
    'php_version' => PHP_VERSION,
    'pdo_mysql_loaded' => extension_loaded('pdo_mysql'),
    'env_loaded' => [
        'DB_HOST' => $host,
        'DB_NAME' => $name,
        'DB_USER' => maskSecret($user ?? ''),
        'DB_PASS' => maskSecret($pass),
    ],
];

try {
    $pdo = getPdo();
    $stmt = $pdo->query('SELECT 1');
    $result['db_connection'] = 'ok';
    $result['test_query'] = $stmt->fetchColumn();

    $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    $result['tables'] = $tables;
} catch (Throwable $e) {
    $result['db_connection'] = 'error';
    $result['error_class'] = get_class($e);
    $result['error_message'] = $e->getMessage();
}

echo json_encode($result, JSON_PRETTY_PRINT);
