<?php

/**
 * AI meal-photo scan — the app sends a photo of a plate, Google's Gemini (free tier) splits it into
 * its separate foods, estimates each portion in grams and its macros, and the client shows that as
 * an editable list before anything is logged. The client never talks to Gemini itself:
 * GEMINI_API_KEY lives only in .env on this server.
 *
 * The free Gemini quota is shared by every user of the app, not per user, so each user gets a daily
 * allowance (see mealScanDailyLimit) tracked in `meal_photo_scans`. The photo is sent to Gemini and
 * thrown away — it's never saved here. Estimates from a photo are only that, which is why the client
 * always lets the user correct the result: either by editing grams, or by describing what's wrong in
 * words (`hint`) and having the same photo analysed again with that correction. A correction counts
 * as a scan of its own.
 *
 *   GET  /nutrition-photo-scan  ->  { limit, used, remaining }   (limit/remaining are null = unlimited)
 *   POST /nutrition-photo-scan  ->  { items: [{ name, grams, calories, proteinG, carbsG, fatG }], quota }
 *        body: { imageBase64, contentType, hint?, previousItems?: [{ name, grams }] }
 */

// Everyone gets this many scans a day for now. Once subscriptions exist this drops to 1 for free
// users, and subscribers become unlimited (see mealScanDailyLimit).
const MEAL_SCAN_FREE_PER_DAY = 5;
// Developer accounts (same people as DEVELOPER_MODE_EMAILS in src/store/developer-mode-store.ts —
// keep the two in sync) are unlimited. Matched against `users.email`, which is only ever written from
// Clerk's verified email (see routes/profile.php), never from client input.
const MEAL_SCAN_UNLIMITED_EMAILS = ['jaimy.mathon@gmail.com', 'akb.koycu@gmail.com'];
const MEAL_SCAN_MAX_IMAGE_BYTES = 4 * 1024 * 1024; // decoded size — the client sends a compressed JPEG
const MEAL_SCAN_MAX_ITEMS = 12;
const MEAL_SCAN_MAX_HINT_LENGTH = 300;
const MEAL_SCAN_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const GEMINI_DEFAULT_MODEL = 'gemini-3.5-flash-lite';

const MEAL_SCAN_PROMPT = <<<'PROMPT'
You are a nutrition assistant. Look at this photo of a meal and break it down into its separate components:
list every distinct food and drink you can see as its own item. A plate with chicken, rice and broccoli is three
items, not one "chicken meal". Split mixed dishes into their main visible components (for example pasta, tomato
sauce and minced meat) whenever you can tell them apart.
For each item give a short generic English name, your best estimate of its portion in grams (use ml as grams for
drinks), and the calories (kcal), protein, carbs and fat in grams for that whole portion, as it is prepared in the photo.
Include visible sauces, dressings and oils as their own items. Do not invent items you cannot see.
If the photo does not contain food or drink, return an empty list.
PROMPT;

/** Daily scan allowance for this user — null means unlimited. */
function mealScanDailyLimit(PDO $pdo, string $userId): ?int
{
    $stmt = $pdo->prepare('SELECT email FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $email = strtolower(trim((string) $stmt->fetchColumn()));
    if ($email !== '' && in_array($email, MEAL_SCAN_UNLIMITED_EMAILS, true)) {
        return null;
    }
    return MEAL_SCAN_FREE_PER_DAY;
}

/** Scans this user has made since midnight (server time). Counted server-side so the client can't
 * lie about it. */
function mealScansUsedToday(PDO $pdo, string $userId): int
{
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM meal_photo_scans WHERE user_id = ? AND scanned_at >= ?');
    $stmt->execute([$userId, strtotime('today') * 1000]);
    return (int) $stmt->fetchColumn();
}

function mealScanQuota(PDO $pdo, string $userId): array
{
    $limit = mealScanDailyLimit($pdo, $userId);
    $used = mealScansUsedToday($pdo, $userId);
    return ['limit' => $limit, 'used' => $used, 'remaining' => $limit === null ? null : max(0, $limit - $used)];
}

function handleNutritionPhotoScan(PDO $pdo, string $userId, string $method, ?array $body): void
{
    if ($method === 'GET') {
        jsonResponse(mealScanQuota($pdo, $userId));
        return;
    }
    if ($method !== 'POST') {
        errorResponse('Method not allowed', 405);
        return;
    }

    if ((string) env('GEMINI_API_KEY', '') === '') {
        errorResponse('Meal scanning is not available right now', 503);
        return;
    }

    $data = $body ?? [];
    $raw = (string) ($data['imageBase64'] ?? '');
    if (str_starts_with($raw, 'data:')) {
        $raw = explode(',', $raw, 2)[1] ?? '';
    }
    $bytes = $raw === '' ? false : base64_decode($raw, true);
    if ($bytes === false || $bytes === '') {
        errorResponse('imageBase64 is required');
        return;
    }
    if (strlen($bytes) > MEAL_SCAN_MAX_IMAGE_BYTES) {
        errorResponse('Image is too large (max 4MB)');
        return;
    }
    // Trust the file's own header over whatever content type the client claims.
    $imageInfo = @getimagesizefromstring($bytes);
    $mimeType = $imageInfo['mime'] ?? '';
    if (!in_array($mimeType, MEAL_SCAN_ALLOWED_TYPES, true)) {
        errorResponse('Invalid image data');
        return;
    }

    $hint = mealScanCleanText((string) ($data['hint'] ?? ''), MEAL_SCAN_MAX_HINT_LENGTH);
    $previousItems = mealScanCleanPreviousItems($data['previousItems'] ?? []);

    $pdo->prepare('INSERT IGNORE INTO users (id) VALUES (?)')->execute([$userId]);

    // Reserve the scan first, then check the count — two requests racing each other can't both slip
    // under the limit. A scan that ends up failing is given back below.
    $pdo->prepare('INSERT INTO meal_photo_scans (user_id, scanned_at) VALUES (?, ?)')->execute([$userId, (int) (microtime(true) * 1000)]);
    $scanId = (int) $pdo->lastInsertId();

    $limit = mealScanDailyLimit($pdo, $userId);
    if ($limit !== null && mealScansUsedToday($pdo, $userId) > $limit) {
        $pdo->prepare('DELETE FROM meal_photo_scans WHERE id = ?')->execute([$scanId]);
        errorResponse("You've used all your AI scans for today. They reset tomorrow.", 429);
        return;
    }

    try {
        $items = geminiAnalyzeMealPhoto(base64_encode($bytes), $mimeType, $hint, $previousItems);
    } catch (RuntimeException $e) {
        $pdo->prepare('DELETE FROM meal_photo_scans WHERE id = ?')->execute([$scanId]);
        errorResponse($e->getMessage(), $e->getCode() ?: 502);
        return;
    }

    jsonResponse(['items' => $items, 'quota' => mealScanQuota($pdo, $userId)]);
}

/** The base prompt, plus — when the user is correcting an earlier result — what that result said and
 * what they say is wrong with it. */
function mealScanPrompt(string $hint, array $previousItems): string
{
    if ($hint === '') {
        return MEAL_SCAN_PROMPT;
    }

    $previous = implode(', ', array_map(fn(array $item) => $item['name'] . ' (' . $item['grams'] . ' g)', $previousItems));
    return MEAL_SCAN_PROMPT
        . "\n\nA first analysis of this same photo was reviewed by the user, who says it is not right."
        . ($previous !== '' ? " That analysis listed: $previous." : '')
        . "\nThe user's correction: " . json_encode($hint, JSON_UNESCAPED_UNICODE)
        . "\nRedo the full list, taking the correction into account. Treat the user's correction as more reliable than what you can make out in the photo.";
}

/** Free text from the client, flattened to one line and length-capped before it goes into a prompt. */
function mealScanCleanText(string $text, int $maxLength): string
{
    return trim(mb_substr((string) preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $text), 0, $maxLength));
}

/** The names + grams of the earlier result, as sent back by the client for a correction. */
function mealScanCleanPreviousItems($raw): array
{
    $items = [];
    $rawItems = is_array($raw) ? array_slice($raw, 0, MEAL_SCAN_MAX_ITEMS) : [];
    foreach ($rawItems as $item) {
        $name = is_array($item) ? mealScanCleanText((string) ($item['name'] ?? ''), 80) : '';
        if ($name !== '') {
            $items[] = ['name' => $name, 'grams' => (int) round(max(0, min((float) ($item['grams'] ?? 0), 2000)))];
        }
    }
    return $items;
}

/** Sends the photo to Gemini and returns the cleaned-up list of foods. Throws a RuntimeException
 * whose message is safe to show the user and whose code is the HTTP status to answer with. */
function geminiAnalyzeMealPhoto(string $imageBase64, string $mimeType, string $hint = '', array $previousItems = []): array
{
    $model = env('GEMINI_MODEL', '') ?: GEMINI_DEFAULT_MODEL;
    $number = ['type' => 'NUMBER'];
    $payload = [
        'contents' => [[
            'parts' => [
                ['text' => mealScanPrompt($hint, $previousItems)],
                ['inline_data' => ['mime_type' => $mimeType, 'data' => $imageBase64]],
            ],
        ]],
        'generationConfig' => [
            'temperature' => 0.2,
            'responseMimeType' => 'application/json',
            'responseSchema' => [
                'type' => 'OBJECT',
                'properties' => [
                    'items' => [
                        'type' => 'ARRAY',
                        'items' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'name' => ['type' => 'STRING'],
                                'grams' => $number,
                                'calories' => $number,
                                'protein_g' => $number,
                                'carbs_g' => $number,
                                'fat_g' => $number,
                            ],
                            'required' => ['name', 'grams', 'calories', 'protein_g', 'carbs_g', 'fat_g'],
                        ],
                    ],
                ],
                'required' => ['items'],
            ],
        ],
    ];

    $ch = curl_init('https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model) . ':generateContent');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'x-goog-api-key: ' . env('GEMINI_API_KEY')],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_TIMEOUT => 25,
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false || $curlError !== '' || $status >= 400) {
        error_log("Gemini meal scan failed (status $status): " . ($curlError ?: $response));
        // 429 = the shared free quota is used up for now (per minute or per day).
        if ($status === 429) {
            throw new RuntimeException('AI scan is busy right now. Try again in a bit, or log this meal by searching.', 503);
        }
        throw new RuntimeException("Couldn't analyse that photo. Try again.", 502);
    }

    $decoded = json_decode($response, true);
    $text = $decoded['candidates'][0]['content']['parts'][0]['text'] ?? null;
    $result = is_string($text) ? json_decode($text, true) : null;
    if (!is_array($result) || !is_array($result['items'] ?? null)) {
        error_log('Gemini meal scan returned an unexpected response: ' . substr((string) $response, 0, 500));
        throw new RuntimeException("Couldn't analyse that photo. Try again.", 502);
    }

    return mealScanCleanItems($result['items']);
}

/** Keeps only sane items — the model's output is untrusted, so a missing name, a 40 kg portion or a
 * negative macro is dropped/clamped here rather than logged into someone's day. */
function mealScanCleanItems(array $rawItems): array
{
    $items = [];
    foreach (array_slice($rawItems, 0, MEAL_SCAN_MAX_ITEMS) as $raw) {
        if (!is_array($raw)) {
            continue;
        }
        $name = trim(mb_substr((string) ($raw['name'] ?? ''), 0, 80));
        $grams = (float) ($raw['grams'] ?? 0);
        if ($name === '' || $grams < 1) {
            continue;
        }
        $items[] = [
            'name' => $name,
            'grams' => round(min($grams, 2000)),
            'calories' => round(max(0, min((float) ($raw['calories'] ?? 0), 5000))),
            'proteinG' => round(max(0, min((float) ($raw['protein_g'] ?? 0), 500)), 1),
            'carbsG' => round(max(0, min((float) ($raw['carbs_g'] ?? 0), 800)), 1),
            'fatG' => round(max(0, min((float) ($raw['fat_g'] ?? 0), 500)), 1),
        ];
    }
    return $items;
}
