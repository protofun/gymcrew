<?php

/**
 * Daily bulk warm-up of `off_products_cache` (see db/schema.sql) — runs a curated list of common
 * food search terms against Open Food Facts once and caches every result, so that when a real user
 * searches "chicken" or "banana" a moment later, nutrition-off.php's handleOffSearch answers
 * straight from the database instead of waiting on a live Open Food Facts round trip. That live
 * fallback still exists for anything this list doesn't cover (a specific brand, an unusual product)
 * — this script just makes the common case fast.
 *
 * CLI only, not a web route (see the guard below) — schedule it as a Hostinger hPanel Cron Job:
 *   hPanel -> Advanced -> Cron Jobs -> Add New Cron Job
 *   Command: php /home/<your-user>/path/to/backend/scripts/off-preload.php
 *   Common Settings: Once Per Day (pick a quiet hour, e.g. 4:00 AM)
 * See backend/README.md for the full walkthrough.
 *
 * Safe to re-run any time (every write is an upsert, see offUpsertCache) and safe to edit the term
 * list below — add whatever your users actually search for often that isn't turning up fast yet.
 */

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    echo 'This script is CLI-only.';
    exit(1);
}

set_time_limit(0);

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../routes/nutrition-off.php';

// A broad set of everyday gym-nutrition search terms, English and Dutch (Open Food Facts has deep
// coverage of Dutch/Belgian supermarket products, e.g. Albert Heijn, Jumbo) — covers most of what
// NUTRITION.md's own examples show people actually logging. Extend freely.
$PRELOAD_TERMS = [
    // Proteins
    'chicken breast', 'chicken', 'kip', 'kipfilet', 'turkey', 'kalkoen', 'beef', 'rundvlees', 'steak',
    'ground beef', 'gehakt', 'pork', 'varkensvlees', 'salmon', 'zalm', 'tuna', 'tonijn', 'shrimp',
    'garnalen', 'eggs', 'ei', 'eieren', 'tofu', 'tempeh', 'cottage cheese', 'kwark', 'greek yogurt',
    'griekse yoghurt', 'whey protein', 'wei-eiwit', 'protein shake', 'eiwitshake', 'protein bar',
    'eiwitreep', 'protein powder',
    // Carbs
    'rice', 'rijst', 'brown rice', 'zilvervliesrijst', 'pasta', 'noodles', 'bread', 'brood',
    'whole wheat bread', 'volkoren brood', 'oats', 'havermout', 'muesli', 'granola', 'cereal',
    'cornflakes', 'potato', 'aardappel', 'sweet potato', 'zoete aardappel', 'quinoa', 'couscous',
    'banana', 'banaan', 'apple', 'appel', 'orange', 'sinaasappel', 'berries', 'bessen', 'grapes',
    'druiven', 'rice cakes', 'rijstwafels',
    // Fats
    'olive oil', 'olijfolie', 'avocado', 'almonds', 'amandelen', 'peanut butter', 'pindakaas',
    'cashews', 'walnuts', 'walnoten', 'butter', 'boter', 'cheese', 'kaas', 'seeds', 'zaden',
    // Vegetables
    'broccoli', 'spinach', 'spinazie', 'carrot', 'wortel', 'tomato', 'tomaat', 'cucumber', 'komkommer',
    'salad', 'sla', 'bell pepper', 'paprika', 'onion', 'ui', 'mushroom', 'champignons', 'beans',
    'bonen', 'lentils', 'linzen', 'chickpeas', 'kikkererwten', 'hummus',
    // Dairy & drinks
    'milk', 'melk', 'almond milk', 'amandelmelk', 'oat milk', 'havermelk', 'yogurt', 'yoghurt',
    'water', 'coffee', 'koffie', 'tea', 'thee', 'juice', 'sap', 'soda', 'frisdrank', 'energy drink',
    'protein yogurt',
    // Snacks & extras
    'chocolate', 'chocolade', 'cookies', 'koekjes', 'chips', 'ice cream', 'ijs', 'nuts', 'noten',
    'granola bar', 'stroopwafel', 'hagelslag', 'peanut butter cup', 'dark chocolate',
    // Fast food / meals
    'pizza', 'burger', 'hamburger', 'fries', 'patat', 'sandwich', 'broodje', 'sushi', 'wrap',
    'burrito', 'salad bowl', 'soup', 'soep',
];

$pdo = getPdo();
$totalUpserted = 0;
$startedAt = time();

echo 'Preloading ' . count($PRELOAD_TERMS) . " Open Food Facts search terms into off_products_cache...\n";

foreach ($PRELOAD_TERMS as $term) {
    $response = offHttpGetJson(offBuildSearchUrl($term, 40));
    $products = $response['products'] ?? [];

    $upserted = 0;
    foreach ($products as $product) {
        $normalized = offNormalizeProduct($product);
        if (!$normalized) {
            continue;
        }
        offUpsertCache($pdo, $normalized);
        $upserted++;
    }

    echo str_pad("\"$term\"", 28) . "-> $upserted products cached\n";
    $totalUpserted += $upserted;

    // Stay well under Open Food Facts' rate limits — one request every ~500ms, not a burst.
    usleep(500000);
}

$elapsed = time() - $startedAt;
echo "Done in {$elapsed}s. $totalUpserted product rows upserted across " . count($PRELOAD_TERMS) . " search terms.\n";
