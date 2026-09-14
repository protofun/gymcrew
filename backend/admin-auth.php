<?php

/**
 * Self-issued HS256 JWTs for the admin panel — completely separate from the Clerk-based end-user
 * auth in auth.php (the admin panel has its own login, not a Clerk account). No Composer
 * dependency, same "plain Hostinger shared hosting, FTP deploy" constraint as the rest of this
 * backend — HS256 needs only `hash_hmac`, already built into PHP.
 */

function base64UrlEncode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/** Signs and returns a short-lived admin session token. `$secret` is ADMIN_JWT_SECRET (see
 * config.php) — never hardcoded, never committed. */
function mintAdminJwt(string $adminId, string $email, string $secret): string
{
    $header = base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = base64UrlEncode(json_encode([
        'sub' => $adminId,
        'email' => $email,
        'iat' => time(),
        'exp' => time() + 12 * 60 * 60, // 12h — re-login after that, same as a typical admin console session
    ]));
    $signature = base64UrlEncode(hash_hmac('sha256', "$header.$payload", $secret, true));
    return "$header.$payload.$signature";
}

/** Verifies an admin JWT's signature and expiry, returning its payload (`sub`/`email`) or null. */
function verifyAdminJwt(string $token, string $secret): ?array
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }
    [$headerB64, $payloadB64, $signatureB64] = $parts;

    $expectedSignature = base64UrlEncode(hash_hmac('sha256', "$headerB64.$payloadB64", $secret, true));
    if (!hash_equals($expectedSignature, $signatureB64)) {
        return null;
    }

    $payload = json_decode(base64UrlDecode($payloadB64), true);
    if (!$payload || !isset($payload['exp']) || time() >= (int) $payload['exp']) {
        return null;
    }

    return $payload;
}

/** Reads and verifies the Authorization header for an admin route, or ends the request with 401.
 * Every admin.php route except POST /admin/login calls this first. */
function requireAdminAuth(string $secret): array
{
    $token = getBearerToken();
    if (!$token) {
        errorResponse('Missing Authorization header', 401);
    }

    $payload = verifyAdminJwt($token, $secret);
    if (!$payload) {
        errorResponse('Invalid or expired admin session', 401);
    }

    return $payload;
}
