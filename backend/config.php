<?php

/** Loads KEY=VALUE lines from .env into getenv()/$_ENV — no Composer dependency needed for this. */
function loadEnv(string $path): void
{
    if (!file_exists($path)) {
        return;
    }
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' || str_starts_with($trimmed, '#')) {
            continue;
        }
        [$key, $value] = array_pad(explode('=', $trimmed, 2), 2, '');
        $key = trim($key);
        $value = trim($value);
        if ($key !== '') {
            putenv("$key=$value");
            $_ENV[$key] = $value;
        }
    }
}

loadEnv(__DIR__ . '/.env');

function env(string $key, ?string $default = null): ?string
{
    $value = getenv($key);
    return $value === false ? $default : $value;
}

function getPdo(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $host = env('DB_HOST', 'localhost');
        $name = env('DB_NAME');
        $user = env('DB_USER');
        $pass = env('DB_PASS');
        $dsn = "mysql:host=$host;dbname=$name;charset=utf8mb4";
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}
