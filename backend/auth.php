<?php

/**
 * Verifies Clerk session JWTs by hand (no Composer / firebase/php-jwt dependency) so the whole
 * backend can be deployed to plain Hostinger shared hosting via FTP with zero install step —
 * everything here uses only PHP's built-in openssl/json functions.
 */

function getBearerToken(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if ($header === '' && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $header = $headers['Authorization'] ?? '';
    }
    if (preg_match('/Bearer\s+(.+)/i', $header, $matches)) {
        return trim($matches[1]);
    }
    return null;
}

function base64UrlDecode(string $data): string
{
    $remainder = strlen($data) % 4;
    if ($remainder) {
        $data .= str_repeat('=', 4 - $remainder);
    }
    return base64_decode(strtr($data, '-_', '+/'));
}

function derLength(int $length): string
{
    if ($length <= 0x7f) {
        return chr($length);
    }
    $bytes = ltrim(pack('N', $length), "\x00");
    return chr(0x80 | strlen($bytes)) . $bytes;
}

function derInteger(string $bytes): string
{
    if ($bytes === '' || (ord($bytes[0]) & 0x80)) {
        $bytes = "\x00" . $bytes;
    }
    return "\x02" . derLength(strlen($bytes)) . $bytes;
}

function derSequence(string $contents): string
{
    return "\x30" . derLength(strlen($contents)) . $contents;
}

/** Builds a PEM "PUBLIC KEY" (X.509 SubjectPublicKeyInfo) from a JWK's RSA modulus/exponent. */
function jwkToPem(string $nB64, string $eB64): string
{
    $modulus = derInteger(base64UrlDecode($nB64));
    $exponent = derInteger(base64UrlDecode($eB64));
    $rsaPublicKey = derSequence($modulus . $exponent);

    // SEQUENCE { OID rsaEncryption, NULL } — the fixed AlgorithmIdentifier for RSA public keys.
    $algorithmIdentifier = hex2bin('300d06092a864886f70d0101010500');
    $bitString = "\x03" . derLength(strlen($rsaPublicKey) + 1) . "\x00" . $rsaPublicKey;
    $spki = derSequence($algorithmIdentifier . $bitString);

    return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($spki), 64, "\n") . "-----END PUBLIC KEY-----\n";
}

/** Fetches (and file-caches for an hour) Clerk's JWKS, returning the key matching `$kid`. */
function findJwk(string $jwksUrl, string $kid): ?array
{
    $cacheFile = sys_get_temp_dir() . '/gymcrew_clerk_jwks.json';
    $jwks = null;

    if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < 3600)) {
        $jwks = json_decode((string) file_get_contents($cacheFile), true);
    }

    if (!$jwks) {
        $raw = @file_get_contents($jwksUrl);
        if ($raw === false) {
            return null;
        }
        $jwks = json_decode($raw, true);
        if ($jwks) {
            file_put_contents($cacheFile, $raw);
        }
    }

    foreach (($jwks['keys'] ?? []) as $key) {
        if (($key['kid'] ?? '') === $kid) {
            return $key;
        }
    }
    return null;
}

/** Verifies a Clerk RS256 session JWT and returns the user id (`sub` claim), or null if invalid. */
function verifyClerkJwt(string $token, string $jwksUrl): ?string
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }
    [$headerB64, $payloadB64, $signatureB64] = $parts;

    $header = json_decode(base64UrlDecode($headerB64), true);
    $payload = json_decode(base64UrlDecode($payloadB64), true);
    if (!$header || !$payload || ($header['alg'] ?? '') !== 'RS256') {
        return null;
    }

    $jwk = findJwk($jwksUrl, $header['kid'] ?? '');
    if (!$jwk || ($jwk['kty'] ?? '') !== 'RSA') {
        return null;
    }

    $publicKey = openssl_pkey_get_public(jwkToPem($jwk['n'], $jwk['e']));
    if (!$publicKey) {
        return null;
    }

    $signedData = $headerB64 . '.' . $payloadB64;
    $signature = base64UrlDecode($signatureB64);
    if (openssl_verify($signedData, $signature, $publicKey, OPENSSL_ALGO_SHA256) !== 1) {
        return null;
    }

    if (isset($payload['exp']) && time() >= (int) $payload['exp']) {
        return null;
    }

    return $payload['sub'] ?? null;
}
