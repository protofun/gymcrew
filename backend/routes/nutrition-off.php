<?php

/**
 * Open Food Facts integration (see NUTRITION.md sections 5, 12, 34, 36) — Level 5/6 of the food
 * database priority. The client never talks to Open Food Facts directly: every request goes
 * through here so results can be cached (db/schema.sql's `off_products_cache`, shared across every
 * user — Open Food Facts data is public product data, not anyone's private info) and so this one
 * place can honor OFF's request to send a real, identifying User-Agent.
 *
 * Open Food Facts is contributed voluntarily and can be incomplete or wrong (see their own data
 * quality disclaimer) — every product returned here keeps `source: "open_food_facts"` and its
 * barcode so the client never presents it as GymCrew-verified data.
 */

const OFF_USER_AGENT = 'GymCrew - React Native - Version 1.0 - https://gymcrew.app';
const OFF_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — product data rarely changes this often

/** Builds the classic Open Food Facts search URL — shared by the live per-request search below and
 * scripts/off-preload.php's daily bulk cache warm-up, so both ask for results the same way (most
 * popular/most-scanned first, via `sort_by`, so a term with thousands of matches still leads with
 * the ones people actually buy). `$page` lets a caller page deeper into a term's full result set
 * (Open Food Facts has 3M+ products — any single page is always a slice, never "everything"). */
function offBuildSearchUrl(string $term, int $pageSize, int $page = 1): string
{
    return 'https://world.openfoodfacts.org/cgi/search.pl?' . http_build_query([
        'search_terms' => $term,
        'search_simple' => 1,
        'action' => 'process',
        'json' => 1,
        'page_size' => $pageSize,
        'page' => $page,
        'sort_by' => 'unique_scans_n',
    ]);
}

function offHttpGetJson(string $url): ?array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['User-Agent: ' . OFF_USER_AGENT],
        CURLOPT_TIMEOUT => 8,
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($response === false || $error !== '' || $status >= 400) {
        error_log("Open Food Facts request failed ($url, status $status): " . ($error ?: $response));
        return null;
    }

    $decoded = json_decode($response, true);
    return is_array($decoded) ? $decoded : null;
}

/** Converts one raw OFF `product` object into GymCrew's normalized shape, or null if it doesn't
 * have enough real nutrition data to be useful (no name, or no calories). Nutriments are read from
 * the `_100g` fields — Open Food Facts overwhelmingly reports per 100g/100ml, so every OFF-sourced
 * food is stored as "per 100 g" here regardless of the product's own free-text serving size. */
function offNormalizeProduct(array $product): ?array
{
    $barcode = $product['code'] ?? $product['_id'] ?? null;
    $name = trim((string) ($product['product_name'] ?? ''));
    if (!$barcode || $name === '') {
        return null;
    }

    $nutriments = $product['nutriments'] ?? [];
    $calories = $nutriments['energy-kcal_100g'] ?? null;
    if ($calories === null) {
        return null;
    }

    $sodiumMg = null;
    if (isset($nutriments['sodium_100g'])) {
        $sodiumMg = ((float) $nutriments['sodium_100g']) * 1000;
    } elseif (isset($nutriments['salt_100g'])) {
        $sodiumMg = ((float) $nutriments['salt_100g']) * 1000 / 2.5;
    }

    return [
        'barcode' => (string) $barcode,
        'name' => $name,
        'brand' => $product['brands'] ?? null,
        'serving_size' => 100,
        'serving_unit' => 'g',
        'calories' => (float) $calories,
        'protein_g' => (float) ($nutriments['proteins_100g'] ?? 0),
        'carbs_g' => (float) ($nutriments['carbohydrates_100g'] ?? 0),
        'fat_g' => (float) ($nutriments['fat_100g'] ?? 0),
        'fiber_g' => isset($nutriments['fiber_100g']) ? (float) $nutriments['fiber_100g'] : null,
        'sugar_g' => isset($nutriments['sugars_100g']) ? (float) $nutriments['sugars_100g'] : null,
        'saturated_fat_g' => isset($nutriments['saturated-fat_100g']) ? (float) $nutriments['saturated-fat_100g'] : null,
        'sodium_mg' => $sodiumMg,
        // Prefer the small front-of-pack image (fast to load in a list/detail thumbnail) over the
        // full-size one; falls back to whatever `image_url` OFF does have.
        'photo_url' => $product['image_front_small_url'] ?? $product['image_url'] ?? null,
        'raw_json' => json_encode($product),
    ];
}

/** Same shape either way: a fresh `offNormalizeProduct()` result and a `off_products_cache` row use
 * identical snake_case keys, so this one mapper serves both the live-search branch (straight off a
 * freshly normalized product, no DB round trip needed) and every cache read below. */
function offRowToFoodJson(array $row): array
{
    return [
        'id' => 'off-' . $row['barcode'],
        'name' => $row['name'],
        'brand' => $row['brand'],
        'source' => 'open_food_facts',
        'barcode' => $row['barcode'],
        'servingSize' => (float) $row['serving_size'],
        'servingUnit' => $row['serving_unit'],
        'calories' => (float) $row['calories'],
        'proteinG' => (float) $row['protein_g'],
        'carbsG' => (float) $row['carbs_g'],
        'fatG' => (float) $row['fat_g'],
        'fiberG' => $row['fiber_g'] !== null ? (float) $row['fiber_g'] : null,
        'sugarG' => $row['sugar_g'] !== null ? (float) $row['sugar_g'] : null,
        'saturatedFatG' => $row['saturated_fat_g'] !== null ? (float) $row['saturated_fat_g'] : null,
        'sodiumMg' => $row['sodium_mg'] !== null ? (float) $row['sodium_mg'] : null,
        'photoUrl' => $row['photo_url'] ?? null,
    ];
}

function offUpsertCache(PDO $pdo, array $normalized): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO off_products_cache (barcode, name, brand, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, saturated_fat_g, sodium_mg, photo_url, raw_json, fetched_at)
         VALUES (:barcode, :name, :brand, :serving_size, :serving_unit, :calories, :protein_g, :carbs_g, :fat_g, :fiber_g, :sugar_g, :saturated_fat_g, :sodium_mg, :photo_url, :raw_json, :fetched_at)
         ON DUPLICATE KEY UPDATE
            name = VALUES(name), brand = VALUES(brand), serving_size = VALUES(serving_size), serving_unit = VALUES(serving_unit),
            calories = VALUES(calories), protein_g = VALUES(protein_g), carbs_g = VALUES(carbs_g), fat_g = VALUES(fat_g),
            fiber_g = VALUES(fiber_g), sugar_g = VALUES(sugar_g), saturated_fat_g = VALUES(saturated_fat_g), sodium_mg = VALUES(sodium_mg),
            photo_url = VALUES(photo_url), raw_json = VALUES(raw_json), fetched_at = VALUES(fetched_at)'
    );
    $stmt->execute([
        ':barcode' => $normalized['barcode'],
        ':name' => $normalized['name'],
        ':brand' => $normalized['brand'],
        ':serving_size' => $normalized['serving_size'],
        ':serving_unit' => $normalized['serving_unit'],
        ':calories' => $normalized['calories'],
        ':protein_g' => $normalized['protein_g'],
        ':carbs_g' => $normalized['carbs_g'],
        ':fat_g' => $normalized['fat_g'],
        ':fiber_g' => $normalized['fiber_g'],
        ':sugar_g' => $normalized['sugar_g'],
        ':saturated_fat_g' => $normalized['saturated_fat_g'],
        ':sodium_mg' => $normalized['sodium_mg'],
        ':photo_url' => $normalized['photo_url'],
        ':raw_json' => $normalized['raw_json'],
        ':fetched_at' => (int) round(microtime(true) * 1000),
    ]);
}

/** Barcode lookup — cache first, Open Food Facts only on a cache miss/staleness (see
 * OFF_CACHE_TTL_MS). Returns `['found' => false]` (not an error) for a barcode OFF genuinely
 * doesn't have, or has with no usable nutrition data — see NUTRITION.md section 12's "We don't
 * have this one yet" flow, which needs to tell that apart from a real failure. */
function handleOffBarcodeLookup(PDO $pdo, string $barcode): void
{
    $stmt = $pdo->prepare('SELECT * FROM off_products_cache WHERE barcode = ?');
    $stmt->execute([$barcode]);
    $cached = $stmt->fetch();

    $now = (int) round(microtime(true) * 1000);
    if ($cached && ($now - (int) $cached['fetched_at']) < OFF_CACHE_TTL_MS) {
        jsonResponse(['found' => true, 'food' => offRowToFoodJson($cached)]);
        return;
    }

    $response = offHttpGetJson('https://world.openfoodfacts.org/api/v2/product/' . urlencode($barcode) . '.json');
    $product = $response && ($response['status'] ?? 0) === 1 ? ($response['product'] ?? null) : null;
    $normalized = $product ? offNormalizeProduct($product) : null;

    if (!$normalized) {
        // Fall back to a stale cache entry rather than nothing, if we have one — better than losing
        // a product OFF briefly failed to serve.
        if ($cached) {
            jsonResponse(['found' => true, 'food' => offRowToFoodJson($cached)]);
            return;
        }
        jsonResponse(['found' => false]);
        return;
    }

    offUpsertCache($pdo, $normalized);
    jsonResponse(['found' => true, 'food' => offRowToFoodJson($normalized)]);
}

/** Text search — Open Food Facts is *always* queried live, on every call (see NUTRITION.md
 * section 5/2's "so much food there's no end to it": Open Food Facts has 3M+ products, and only
 * ever answering from the local cache silently hides everything the cache hasn't happened to see
 * yet). The cache still matters — it's merged in for page 1 so already-seen products render
 * instantly, and every live result gets upserted into it — but it is never treated as "enough" on
 * its own the way an earlier version of this endpoint did. `$page` pages deeper into Open Food
 * Facts' own result set for this term, so a search that has hundreds of real matches is actually
 * reachable, not capped at one page. Debouncing/throttling search-as-you-type is the client's job
 * (see src/hooks/use-debounced-value.ts) — that's what keeps this affordable, not skipping the
 * live call. */
function handleOffSearch(PDO $pdo, string $query, int $page): void
{
    $pageSize = 40;
    $trimmed = trim($query);
    if ($trimmed === '') {
        jsonResponse(['results' => [], 'hasMore' => false, 'page' => $page]);
        return;
    }

    $results = [];
    $seenBarcodes = [];

    // Cache is only consulted on page 1 — it has no real pagination semantics of its own (it's a
    // flat table, not "OFF's page 2"), so re-checking it on later pages would just repeat page 1's
    // results instead of surfacing anything new.
    if ($page === 1) {
        $stmt = $pdo->prepare('SELECT * FROM off_products_cache WHERE name LIKE ? OR brand LIKE ? ORDER BY fetched_at DESC LIMIT ?');
        $like = '%' . $trimmed . '%';
        $stmt->bindValue(1, $like);
        $stmt->bindValue(2, $like);
        $stmt->bindValue(3, $pageSize, PDO::PARAM_INT);
        $stmt->execute();
        $cachedRows = $stmt->fetchAll();
        $results = array_map('offRowToFoodJson', $cachedRows);
        $seenBarcodes = array_column($cachedRows, 'barcode');
    }

    $response = offHttpGetJson(offBuildSearchUrl($trimmed, $pageSize, $page));
    $products = $response['products'] ?? [];
    $totalCount = isset($response['count']) ? (int) $response['count'] : null;

    foreach ($products as $product) {
        $normalized = offNormalizeProduct($product);
        if (!$normalized || in_array($normalized['barcode'], $seenBarcodes, true)) {
            continue;
        }
        offUpsertCache($pdo, $normalized);
        $seenBarcodes[] = $normalized['barcode'];
        $results[] = offRowToFoodJson($normalized);
    }

    // "More to page through" if Open Food Facts itself reports more results beyond this page, or
    // (no reported count) this page came back full — either way, a partial/empty page means we've
    // actually reached the end of this term's real matches.
    $hasMore = $totalCount !== null ? ($page * $pageSize) < $totalCount : count($products) >= $pageSize;

    jsonResponse(['results' => $results, 'hasMore' => $hasMore, 'page' => $page]);
}

function handleNutritionOff(PDO $pdo, string $method, array $segments): void
{
    if ($method !== 'GET') {
        errorResponse('Method not allowed', 405);
        return;
    }

    $sub = $segments[1] ?? null;

    if ($sub === 'barcode' && isset($segments[2])) {
        handleOffBarcodeLookup($pdo, $segments[2]);
        return;
    }

    if ($sub === 'search') {
        $page = max(1, (int) ($_GET['page'] ?? 1));
        handleOffSearch($pdo, $_GET['q'] ?? '', $page);
        return;
    }

    errorResponse('Not found', 404);
}
