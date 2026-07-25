<?php
/**
 * Eon Weaver — Shared Helper Functions
 * Reusable functions used by both api.php and simulate.php.
 */

require_once __DIR__ . '/app_public_lib.php';
require_once __DIR__ . '/tier_economics.php';
require_once __DIR__ . '/pricing.php';
require_once __DIR__ . '/llm_training_dataset.php';

/**
 * Metadata OpenRouter expects on chat requests (HTTP-Referer + X-Title).
 * Always uses APP_PUBLIC_URL (production brand), even when the request hits staging.
 * Override in config.php: APP_PUBLIC_URL and APP_PUBLIC_TITLE (see config.example.php).
 *
 * @param string|null $xTitle If non-empty, used as X-Title; otherwise APP_PUBLIC_TITLE / APP_NAME.
 */
function openRouterAppHeaders(?string $xTitle = null): array
{
    $url = ew_app_attribution_base_url();
    $title = ($xTitle !== null && $xTitle !== '')
        ? $xTitle
        : (defined('APP_PUBLIC_TITLE') ? APP_PUBLIC_TITLE : (defined('APP_NAME') ? APP_NAME : 'Eon Weaver'));

    return [
        'HTTP-Referer: ' . $url,
        'X-Title: ' . $title,
    ];
}

/**
 * JSON-encode a chat/completions POST body for OpenRouter.
 * Uses JSON_INVALID_UTF8_SUBSTITUTE so prompts containing bad DB bytes still produce valid JSON
 * (avoids HTTP 400 "JSON parsing failed" when json_encode would otherwise return false).
 *
 * @param array<string,mixed> $data
 */
function ew_json_encode_openrouter_body(array $data): string
{
    $flags = JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE;
    $json = json_encode($data, $flags);
    if ($json === false) {
        throw new Exception('Failed to encode OpenRouter request JSON: ' . json_last_error_msg());
    }

    return $json;
}

/**
 * Determine effective item type from stored type + name keywords.
 * Handles cases where SRD lookup failed and item_type is 'gear'.
 */
function detectItemType($storedType, $itemName)
{
    if ($storedType === 'weapon' || $storedType === 'armor' || $storedType === 'shield') {
        return $storedType;
    }
    $n = strtolower(trim($itemName));
    // Check shields FIRST (before armor, since "shield" contains no armor keywords)
    $shieldWords = ['shield', 'buckler'];
    foreach ($shieldWords as $w) {
        if (strpos($n, $w) !== false)
            return 'shield';
    }
    // Check armor
    $armorWords = ['armor', 'mail', 'plate', 'breastplate', 'chain shirt', 'hide armor', 'scale mail'];
    foreach ($armorWords as $w) {
        if (strpos($n, $w) !== false)
            return 'armor';
    }
    // Check weapons
    $weaponWords = [
        'sword',
        'dagger',
        'axe',
        'bow',
        'crossbow',
        'mace',
        'hammer',
        'spear',
        'staff',
        'quarterstaff',
        'sickle',
        'club',
        'flail',
        'morningstar',
        'scimitar',
        'rapier',
        'trident',
        'javelin',
        'sling',
        'lance',
        'halberd',
        'glaive',
        'scythe',
        'falchion',
        'warhammer',
        'battleaxe',
        'greataxe',
        'greatsword',
        'shortbow',
        'longbow'
    ];
    foreach ($weaponWords as $w) {
        if (strpos($n, $w) !== false)
            return 'weapon';
    }
    return $storedType; // unchanged
}

/**
 * Recalculate character AC & attack string from equipped items.
 * Uses D&D 3.5e rules: AC = 10 + DEX mod (capped by armor) + armor + shield + size.
 */
function recalcCharStats($charId, $uid)
{
    $charRows = query('SELECT * FROM characters WHERE id = ?', [$charId], $uid);
    if (empty($charRows))
        return;
    $char = $charRows[0];

    $dex = (int) ($char['dex'] ?? 10);
    $str = (int) ($char['str'] ?? 10);
    $dexMod = (int) floor(($dex - 10) / 2);
    $strMod = (int) floor(($str - 10) / 2);

    $race = $char['race'] ?? 'Human';
    $smallRaces = ['Gnome', 'Halfling', 'Goblin'];
    $sizeMod = in_array($race, $smallRaces) ? 1 : 0;

    $classStr = $char['class'] ?? 'Commoner 1';
    preg_match('/^(.+?)\s+(\d+)$/', trim($classStr), $clsM);
    $className = $clsM ? trim($clsM[1]) : 'Commoner';
    $level = $clsM ? (int) $clsM[2] : 1;
    $babFull = ['Fighter', 'Barbarian', 'Paladin', 'Ranger', 'Warrior'];
    $bab34 = ['Cleric', 'Druid', 'Rogue', 'Monk', 'Bard', 'Adept', 'Expert', 'Aristocrat'];
    if (in_array($className, $babFull)) {
        $bab = $level;
    } elseif (in_array($className, $bab34)) {
        $bab = (int) floor($level * 3 / 4);
    } else {
        $bab = (int) floor($level / 2);
    }

    $equipped = query('SELECT * FROM character_equipment WHERE character_id = ? AND equipped = 1', [$charId], $uid);

    $armorBonus = 0;
    $shieldBonus = 0;
    $maxDexFromArmor = 99;
    $weaponName = '';
    $weaponDamage = '';
    $weaponCrit = '20/x2';
    $weaponRanged = false;

    $armorBonuses = [
        'padded armor' => [1, 8],
        'leather armor' => [2, 6],
        'studded leather armor' => [3, 5],
        'chain shirt' => [4, 4],
        'hide armor' => [3, 4],
        'scale mail' => [4, 3],
        'chainmail' => [5, 2],
        'breastplate' => [5, 3],
        'splint mail' => [6, 0],
        'banded mail' => [6, 1],
        'half-plate' => [7, 0],
        'full plate' => [8, 1]
    ];
    $shieldBonuses = [
        'buckler' => 1,
        'light wooden shield' => 1,
        'light steel shield' => 1,
        'heavy wooden shield' => 2,
        'heavy steel shield' => 2,
        'tower shield' => 4
    ];

    foreach ($equipped as $item) {
        $name = strtolower(trim($item['item_name'] ?? ''));
        $props = json_decode($item['properties'] ?? '{}', true) ?: [];
        // Use smart type detection: stored type + name keywords
        $type = detectItemType($item['item_type'] ?? 'gear', $item['item_name'] ?? '');

        // If stored type was wrong, fix it in the DB for future
        if ($type !== ($item['item_type'] ?? 'gear')) {
            try {
                execute('UPDATE character_equipment SET item_type = ? WHERE id = ?', [$type, $item['id']], $uid);
            } catch (Exception $e) { /* non-fatal */
            }
        }

        if ($type === 'armor') {
            if (isset($armorBonuses[$name])) {
                $armorBonus = $armorBonuses[$name][0];
                $maxDexFromArmor = $armorBonuses[$name][1];
            } else {
                // Try partial match against armor table
                foreach ($armorBonuses as $aName => $aVal) {
                    if (strpos($name, $aName) !== false || strpos($aName, $name) !== false) {
                        $armorBonus = $aVal[0];
                        $maxDexFromArmor = $aVal[1];
                        break;
                    }
                }
                if ($armorBonus === 0) {
                    $armorBonus = (int) ($props['armor_bonus'] ?? 2);
                }
            }
        } elseif ($type === 'shield') {
            if (isset($shieldBonuses[$name])) {
                $shieldBonus = $shieldBonuses[$name];
            } else {
                // Try partial match against shield table
                foreach ($shieldBonuses as $sName => $sVal) {
                    if (strpos($name, $sName) !== false || strpos($sName, $name) !== false) {
                        $shieldBonus = $sVal;
                        break;
                    }
                }
                if ($shieldBonus === 0) {
                    $shieldBonus = (int) ($props['shield_bonus'] ?? 1);
                }
            }
        } elseif ($type === 'weapon' && empty($weaponName)) {
            $weaponName = $item['item_name'];
            $weaponDamage = $props['damage'] ?? '';
            $weaponCrit = $props['critical'] ?? '20/x2';
            $srdProps = $props['srd_properties'] ?? '';
            $weaponRanged = (stripos($srdProps, 'range') !== false || stripos($name, 'bow') !== false || stripos($name, 'crossbow') !== false || stripos($name, 'sling') !== false);
        }
    }

    $effectiveDex = min($dexMod, $maxDexFromArmor);
    $totalAC = 10 + $effectiveDex + $armorBonus + $shieldBonus + $sizeMod;
    $touchAC = 10 + $effectiveDex + $sizeMod;
    $flatAC = 10 + $armorBonus + $shieldBonus + $sizeMod;
    $acStr = "$totalAC, touch $touchAC, flat-footed $flatAC";

    if ($weaponName) {
        $atkMod = $weaponRanged ? ($bab + $dexMod) : ($bab + $strMod);
        $atkStr = ($atkMod >= 0 ? '+' : '') . $atkMod;
        $dmgMod = $weaponRanged ? 0 : $strMod;
        $dmgStr = $weaponDamage;
        if ($dmgStr && $dmgMod != 0) {
            $dmgStr .= ($dmgMod >= 0 ? '+' : '') . $dmgMod;
        }
        $atkType = $weaponRanged ? 'Ranged' : 'Melee';
        $atk = "$atkType: $weaponName $atkStr ($dmgStr, $weaponCrit)";
    } else {
        $atkMod = $bab + $strMod;
        $atkStr = ($atkMod >= 0 ? '+' : '') . $atkMod;
        $atk = "Melee: unarmed $atkStr (1d3" . ($strMod != 0 ? (($strMod >= 0 ? '+' : '') . $strMod) : '') . ", 20/x2)";
    }

    execute('UPDATE characters SET ac = ?, atk = ? WHERE id = ?', [$acStr, $atk, $charId], $uid);
}

/**
 * USD total OpenRouter reports on the completion `usage` object (when present).
 */
function ew_openrouter_usage_cost_usd(array $usage): float
{
    if (!array_key_exists('cost', $usage)) {
        return 0.0;
    }
    $c = $usage['cost'];
    if (is_string($c)) {
        $c = trim($c);
    }
    if (!is_numeric($c)) {
        return 0.0;
    }
    $f = (float) $c;
    return $f > 0 ? $f : 0.0;
}

/**
 * Ensures analytics tables have cost_usd (OpenRouter-reported spend). Safe to call repeatedly.
 */
function ew_ensure_ai_usage_cost_columns(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    try {
        execute(
            'ALTER TABLE user_token_usage ADD COLUMN cost_usd DECIMAL(16,8) NOT NULL DEFAULT 0 AFTER tokens_used',
            [],
            0
        );
    } catch (Throwable $e) { /* column exists */
    }
    try {
        execute(
            'ALTER TABLE metrics_ai_calls ADD COLUMN cost_usd DECIMAL(16,8) NOT NULL DEFAULT 0 AFTER tokens',
            [],
            0
        );
    } catch (Throwable $e) { /* column exists */
    }
}

/**
 * Raw token total from an OpenRouter-style usage object.
 */
function ew_ai_usage_total_tokens_from_response(array $usage): int
{
    $totalTokens = (int) ($usage['total_tokens'] ?? 0);
    if ($totalTokens <= 0) {
        $totalTokens = (int) ($usage['prompt_tokens'] ?? 0) + (int) ($usage['completion_tokens'] ?? 0);
    }

    return $totalTokens;
}

/**
 * Log one completion to analytics / metrics only (no wallet change).
 */
function ew_ai_log_usage_analytics_row(int $userId, array $usage, ?string $featureKey = null): void
{
    global $LAST_RESOLVED_FEATURE_KEY;
    if (!$featureKey) {
        $featureKey = $LAST_RESOLVED_FEATURE_KEY ?? 'global';
    }
    if (!$userId) {
        return;
    }

    $totalTokens = ew_ai_usage_total_tokens_from_response($usage);
    if ($totalTokens <= 0) {
        return;
    }

    $costUsd = ew_openrouter_usage_cost_usd($usage);
    $yearMonth = date('Y-m');

    try {
        ew_ensure_ai_usage_cost_columns();

        execute(
            "INSERT INTO user_token_usage (user_id, `year_month`, feature_key, tokens_used, cost_usd, call_count, updated_at)
             VALUES (?, ?, ?, ?, ?, 1, NOW())
             ON DUPLICATE KEY UPDATE
                tokens_used = tokens_used + VALUES(tokens_used),
                cost_usd = cost_usd + VALUES(cost_usd),
                call_count = call_count + 1,
                updated_at = NOW()",
            [$userId, $yearMonth, $featureKey, $totalTokens, $costUsd],
            0
        );

        if (file_exists(__DIR__ . '/metrics_lib.php')) {
            require_once __DIR__ . '/metrics_lib.php';
            ew_record_ai_usage_daily($userId, $featureKey, $totalTokens, $costUsd);
        }
    } catch (Exception $e) {
        error_log("Token analytics log failed for user {$userId}: " . $e->getMessage());
    }
}

/**
 * Deduct an exact raw amount from the platform wallet (no per-0.01-EC bucket rounding).
 */
function ew_wallet_deduct_exact_raw(int $userId, int $rawTokens): void
{
    if (!$userId || $rawTokens <= 0) {
        return;
    }

    try {
        execute(
            'UPDATE users SET credit_balance = GREATEST(0, credit_balance - ?) WHERE id = ?',
            [$rawTokens, $userId],
            0
        );
    } catch (Exception $e) {
        error_log("Wallet deduct failed for user {$userId}: " . $e->getMessage());
    }
}

/**
 * Intake flesh: log each OpenRouter usage row, then charge one fixed batch price (see pricing.php).
 *
 * @param array<int, array|null> $usageSnapshots
 */
function ew_track_intake_flesh_billing(int $userId, int $stubCountInBatch, array $usageSnapshots, ?string $featureKey = null): void
{
    if (!$featureKey) {
        $featureKey = 'intake_flesh';
    }
    foreach ($usageSnapshots as $u) {
        if (is_array($u) && !empty($u)) {
            ew_ai_log_usage_analytics_row($userId, $u, $featureKey);
        }
    }
    $bill = ew_pricing_intake_flesh_batch_wallet_raw($stubCountInBatch);
    ew_wallet_deduct_exact_raw($userId, $bill);
}

/** AI roster phase (creature / non-procedural roster). */
function ew_track_intake_roster_ai_billing(int $userId, int $numArrivals, ?array $usage): void
{
    if (is_array($usage) && !empty($usage)) {
        ew_ai_log_usage_analytics_row($userId, $usage, 'intake_roster');
    }
    ew_wallet_deduct_exact_raw($userId, ew_pricing_intake_roster_ai_wallet_raw($numArrivals));
}

/** intake_custom full character generation. */
function ew_track_intake_custom_billing(int $userId, ?array $usage): void
{
    if (is_array($usage) && !empty($usage)) {
        ew_ai_log_usage_analytics_row($userId, $usage, 'intake_custom');
    }
    ew_wallet_deduct_exact_raw($userId, ew_pricing_intake_custom_wallet_raw());
}

/**
 * Log OpenRouter usage to analytics and deduct a fixed catalog raw amount from the platform wallet.
 * All AI features use pricing.php — no usage-based bucket rounding.
 */
function ew_track_ai_fixed_billing(int $userId, ?array $usage, int $walletRawTokens, ?string $featureKey = null): void
{
    if ($walletRawTokens <= 0 || !$userId) {
        return;
    }
    if (is_array($usage) && !empty($usage)) {
        ew_ai_log_usage_analytics_row($userId, $usage, $featureKey);
    }
    ew_wallet_deduct_exact_raw($userId, $walletRawTokens);
}

/**
 * Check if a user has credits remaining in their wallet.
 * Returns true if they should be BLOCKED (no credits left).
 *
 * @param int $userId  The user's ID
 * @param string $tier The user's subscription tier (unused in wallet model, kept for compat)
 * @return bool True if over budget (should be blocked)
 */
function checkTokenBudget($userId, $tier = 'free')
{
    return ew_platform_wallet_blocked($userId, $tier) !== null;
}

/**
 * Get a user's current credit balance.
 *
 * @param int $userId The user's ID
 * @return int The current credit balance
 */
function getCreditBalance($userId)
{
    $rows = query("SELECT credit_balance FROM users WHERE id = ?", [$userId], 0);
    return $rows ? (int) $rows[0]['credit_balance'] : 0;
}


/**
 * Roll a random level for a new NPC based on town gen_rules.
 * If intake_level is set (> 0), returns that exact level.
 * Otherwise rolls weighted: 60% L1, 25% L2, 10% L3, 5% L4+
 * Result is always capped at max_level.
 *
 * @param array $genRules  Decoded gen_rules JSON from town_meta
 * @return int The level to assign
 */
function rollIntakeLevel($genRules)
{
    $intakeLevel = isset($genRules['intake_level']) ? (int) $genRules['intake_level'] : 0;
    $maxLevel = isset($genRules['max_level']) ? (int) $genRules['max_level'] : 20;
    if ($maxLevel <= 0) $maxLevel = 20;

    if ($intakeLevel > 0) {
        return min($intakeLevel, $maxLevel);
    }

    // Weighted random roll
    $roll = random_int(1, 100);
    if ($roll <= 60) {
        $level = 1;
    } elseif ($roll <= 85) {
        $level = 2;
    } elseif ($roll <= 95) {
        $level = 3;
    } else {
        $level = random_int(4, min(6, $maxLevel));
    }

    return min($level, $maxLevel);
}

/**
 * Override the level in a class string (e.g. "Warrior 6" → "Warrior 2").
 *
 * @param string $classStr  The original class string like "Commoner 1"
 * @param int    $newLevel  The level to set
 * @return string The updated class string
 */
function applyLevelToClass($classStr, $newLevel)
{
    $classStr = trim($classStr);
    if (preg_match('/^(.+?)\s+\d+$/', $classStr, $m)) {
        return trim($m[1]) . ' ' . $newLevel;
    }
    // No level found in string — append
    return $classStr . ' ' . $newLevel;
}

/**
 * Resolve the OpenRouter API key for a platform AI call.
 * Order: per-feature constant → global OPENROUTER_API_KEY.
 *
 * If $requireCredits is true (default), users must have credit_balance > 0
 * or the call is rejected here — gating EVERY paid AI call site through one function.
 * Pass false only for free connectivity tests like `debug_llm`.
 */
function resolveApiKey(string $featureKey, int $userId, bool $requireCredits = true): string {
    global $LAST_RESOLVED_FEATURE_KEY;
    $LAST_RESOLVED_FEATURE_KEY = str_replace('OPENROUTER_KEY_', '', $featureKey);

    if ($requireCredits) {
        $rows = query('SELECT credit_balance, subscription_tier FROM users WHERE id = ?', [$userId], 0);
        $balance = $rows ? (int) ($rows[0]['credit_balance'] ?? 0) : 0;
        if ($balance <= 0) {
            throw new Exception('Insufficient Eon Credits — your wallet is empty. Top up credits or upgrade your plan on 💎 Plans.');
        }
        $subTier = trim((string) ($rows[0]['subscription_tier'] ?? 'free'));
        if ($subTier === '') {
            $subTier = 'free';
        }
        if (ew_monthly_platform_cap_exceeded($userId, $subTier)) {
            throw new Exception('Monthly AI usage limit reached for your subscription tier. Try again next calendar month or upgrade on 💎 Plans.');
        }
    }

    if (defined($featureKey) && constant($featureKey)) {
        return constant($featureKey);
    }
    if (defined('OPENROUTER_API_KEY') && OPENROUTER_API_KEY) {
        return OPENROUTER_API_KEY;
    }

    throw new Exception('Platform AI is not configured on this server. Please contact support.');
}

/**
 * Resolve which OpenRouter key to use for account-balance / key-status probes (admin only).
 */
function ew_openrouter_probe_api_key(): string
{
    if (defined('OPENROUTER_MANAGEMENT_KEY') && OPENROUTER_MANAGEMENT_KEY) {
        return (string) OPENROUTER_MANAGEMENT_KEY;
    }
    if (defined('OPENROUTER_API_KEY') && OPENROUTER_API_KEY) {
        return (string) OPENROUTER_API_KEY;
    }
    return '';
}

/**
 * Low-level GET against OpenRouter with a short timeout.
 *
 * @return array{ok:bool, http:int, data:?array, error:?string}
 */
function ew_openrouter_get_json(string $path, string $apiKey): array
{
    $url = 'https://openrouter.ai/api/v1' . $path;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_HTTPHEADER => array_merge(
            [
                'Authorization: Bearer ' . $apiKey,
                'Content-Type: application/json',
            ],
            openRouterAppHeaders('Eon Weaver Admin')
        ),
    ]);
    $raw = curl_exec($ch);
    $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($raw === false || $err) {
        return ['ok' => false, 'http' => $http, 'data' => null, 'error' => $err ?: 'curl failed'];
    }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return ['ok' => false, 'http' => $http, 'data' => null, 'error' => 'Invalid JSON from OpenRouter'];
    }
    if ($http < 200 || $http >= 300) {
        $msg = $decoded['error']['message'] ?? ('HTTP ' . $http);
        return ['ok' => false, 'http' => $http, 'data' => $decoded, 'error' => (string) $msg];
    }
    return ['ok' => true, 'http' => $http, 'data' => $decoded, 'error' => null];
}

/**
 * Fetch OpenRouter remaining balance / key limits for the admin dashboard.
 * Caches ~60s so live overview refresh does not spam OpenRouter.
 *
 * Account remaining requires a management/provisioning key (OPENROUTER_MANAGEMENT_KEY).
 * Regular keys still return usage + optional per-key limit_remaining via /api/v1/key.
 *
 * @return array<string,mixed>
 */
function ew_fetch_openrouter_balance(bool $forceRefresh = false): array
{
    $cacheFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'ew_openrouter_balance_cache.json';
    $ttl = 60;
    if (!$forceRefresh && is_file($cacheFile)) {
        $raw = @file_get_contents($cacheFile);
        $cached = $raw ? json_decode($raw, true) : null;
        if (is_array($cached) && (($cached['fetched_at'] ?? 0) > (time() - $ttl))) {
            return $cached;
        }
    }

    $out = [
        'ok' => false,
        'fetched_at' => time(),
        'source' => null,
        'remaining_usd' => null,
        'total_credits' => null,
        'total_usage' => null,
        'key_label' => null,
        'key_limit' => null,
        'key_limit_remaining' => null,
        'key_usage' => null,
        'key_usage_monthly' => null,
        'error' => null,
        'hint' => null,
    ];

    $mgmtKey = (defined('OPENROUTER_MANAGEMENT_KEY') && OPENROUTER_MANAGEMENT_KEY)
        ? (string) OPENROUTER_MANAGEMENT_KEY
        : '';
    $apiKey = (defined('OPENROUTER_API_KEY') && OPENROUTER_API_KEY)
        ? (string) OPENROUTER_API_KEY
        : ew_openrouter_probe_api_key();

    if ($mgmtKey === '' && $apiKey === '') {
        $out['error'] = 'No OpenRouter API key configured';
        $out['hint'] = 'Set OPENROUTER_API_KEY (and optionally OPENROUTER_MANAGEMENT_KEY) in config.php';
        @file_put_contents($cacheFile, json_encode($out));
        return $out;
    }

    // Prefer account-level remaining (management key only).
    $creditsKey = $mgmtKey !== '' ? $mgmtKey : $apiKey;
    $credits = ew_openrouter_get_json('/credits', $creditsKey);
    if ($credits['ok'] && isset($credits['data']['data']) && is_array($credits['data']['data'])) {
        $d = $credits['data']['data'];
        $total = isset($d['total_credits']) ? (float) $d['total_credits'] : null;
        $used = isset($d['total_usage']) ? (float) $d['total_usage'] : null;
        $out['ok'] = true;
        $out['source'] = 'account';
        $out['total_credits'] = $total;
        $out['total_usage'] = $used;
        if ($total !== null && $used !== null) {
            $out['remaining_usd'] = round($total - $used, 6);
        }
    } elseif (($credits['http'] ?? 0) === 403) {
        $out['hint'] = 'Account balance needs OPENROUTER_MANAGEMENT_KEY in config.php (regular keys return 403 on /credits).';
    } elseif (!$credits['ok'] && $credits['error']) {
        $out['error'] = $credits['error'];
    }

    // Always probe /key with the main API key for limit + usage context.
    $keyProbeKey = $apiKey !== '' ? $apiKey : $mgmtKey;
    if ($keyProbeKey !== '') {
        $keyRes = ew_openrouter_get_json('/key', $keyProbeKey);
        if ($keyRes['ok'] && isset($keyRes['data']['data']) && is_array($keyRes['data']['data'])) {
            $kd = $keyRes['data']['data'];
            $out['key_label'] = isset($kd['label']) ? (string) $kd['label'] : null;
            $out['key_limit'] = array_key_exists('limit', $kd) ? $kd['limit'] : null;
            $out['key_limit_remaining'] = array_key_exists('limit_remaining', $kd) ? $kd['limit_remaining'] : null;
            $out['key_usage'] = isset($kd['usage']) ? (float) $kd['usage'] : null;
            $out['key_usage_monthly'] = isset($kd['usage_monthly']) ? (float) $kd['usage_monthly'] : null;
            if ($out['remaining_usd'] === null && $out['key_limit_remaining'] !== null) {
                $out['ok'] = true;
                $out['source'] = 'key_limit';
                $out['remaining_usd'] = round((float) $out['key_limit_remaining'], 6);
            } elseif ($out['remaining_usd'] === null) {
                // No account remaining and unlimited key — still useful to show monthly key spend
                $out['ok'] = true;
                if ($out['source'] === null) {
                    $out['source'] = 'key_usage';
                }
            }
        } elseif (!$out['ok'] && $keyRes['error']) {
            $out['error'] = $keyRes['error'];
        }
    }

    if (!$out['ok'] && !$out['error']) {
        $out['error'] = 'Could not read OpenRouter balance';
    }

    @file_put_contents($cacheFile, json_encode($out));
    return $out;
}

/**
 * Redact a Discord webhook URL for API responses (never return full URL to the browser).
 *
 * @return array{webhook_configured: bool, webhook_hint: string}
 */
function ew_redact_webhook_url_for_api(?string $url): array
{
    $url = trim((string) $url);
    if ($url === '') {
        return ['webhook_configured' => false, 'webhook_hint' => ''];
    }
    $hint = strlen($url) > 12 ? ('…' . substr($url, -8)) : '…configured';

    return ['webhook_configured' => true, 'webhook_hint' => $hint];
}

/** Strip secrets from integration_settings before JSON to the SPA. */
function ew_sanitize_integration_settings_for_client(array $settings): array
{
    foreach ($settings as $key => &$row) {
        if ($key !== 'discord_bot' || !is_array($row['value'] ?? null)) {
            continue;
        }
        $url = trim((string) ($row['value']['webhook_url'] ?? ''));
        $redact = ew_redact_webhook_url_for_api($url);
        unset($row['value']['webhook_url']);
        $row['value'] = array_merge($row['value'], $redact);
    }
    unset($row);

    return $settings;
}

/** Load one integration_settings row value for the active campaign. */
function ew_integration_setting_value(int $userId, int $campaignId, string $keyName): ?array
{
    $rows = query(
        'SELECT value_json FROM integration_settings WHERE user_id = ? AND campaign_id = ? AND key_name = ? LIMIT 1',
        [$userId, $campaignId, $keyName],
        0
    );
    if (!$rows) {
        return null;
    }
    $decoded = json_decode($rows[0]['value_json'] ?: 'null', true);

    return is_array($decoded) ? $decoded : null;
}

/**
 * Undirected social link types — one row per pair (either char order is the same edge).
 * Directional types (parent / mentor / student / family) keep char1→char2 meaning.
 */
function ew_relationship_is_undirected(string $relType): bool
{
    $t = strtolower(trim($relType));
    return in_array($t, [
        'friend',
        'rival',
        'enemy',
        'ally',
        'romantic',
        'acquaintance',
        'husband',
        'wife',
        'spouse',
        'husband/wife',
    ], true);
}

/**
 * Canonical char order for undirected types (lower id first). Directional types unchanged.
 *
 * @return array{0:int,1:int}
 */
function ew_normalize_relationship_pair(int $char1, int $char2, string $relType): array
{
    if ($char1 === $char2) {
        throw new Exception('Cannot create relationship with self.');
    }
    if (!ew_relationship_is_undirected($relType)) {
        return [$char1, $char2];
    }
    return $char1 < $char2 ? [$char1, $char2] : [$char2, $char1];
}

/**
 * Upsert a character_relationships row, collapsing A→B / B→A duplicates for undirected types.
 * Pass $forceUndirected for family+spouse (family is otherwise directional for parent links).
 *
 * @return int Relationship id kept
 */
function ew_upsert_character_relationship(
    int $char1,
    int $char2,
    string $relType,
    int $disposition,
    string $reason,
    int $uid,
    int $publicRel = 1,
    string $startedDate = '',
    bool $forceUndirected = false
): int {
    $relType = strtolower(trim($relType));
    if ($relType === '') {
        $relType = 'acquaintance';
    }
    $disposition = max(-10, min(10, $disposition));
    $undirected = $forceUndirected || ew_relationship_is_undirected($relType);
    if ($undirected) {
        [$c1, $c2] = $char1 < $char2 ? [$char1, $char2] : [$char2, $char1];
    } else {
        [$c1, $c2] = ew_normalize_relationship_pair($char1, $char2, $relType);
    }

    if ($undirected) {
        $existing = query(
            'SELECT id FROM character_relationships
             WHERE rel_type = ?
               AND ((char1_id = ? AND char2_id = ?) OR (char1_id = ? AND char2_id = ?))
             ORDER BY id ASC',
            [$relType, $c1, $c2, $c2, $c1],
            $uid
        );
    } else {
        $existing = query(
            'SELECT id FROM character_relationships
             WHERE rel_type = ? AND char1_id = ? AND char2_id = ?
             ORDER BY id ASC',
            [$relType, $c1, $c2],
            $uid
        );
    }

    if (!empty($existing)) {
        // Prefer a row already in canonical order so we never UPDATE into unique_rel
        $keepId = (int) $existing[0]['id'];
        if ($undirected && count($existing) > 1) {
            $canon = query(
                'SELECT id FROM character_relationships
                 WHERE rel_type = ? AND char1_id = ? AND char2_id = ?
                 ORDER BY id ASC LIMIT 1',
                [$relType, $c1, $c2],
                $uid
            );
            if (!empty($canon)) {
                $keepId = (int) $canon[0]['id'];
            }
        }
        foreach ($existing as $ex) {
            $exId = (int) $ex['id'];
            if ($exId === $keepId) {
                continue;
            }
            execute('DELETE FROM character_relationships WHERE id = ?', [$exId], $uid);
        }
        execute(
            'UPDATE character_relationships
             SET char1_id = ?, char2_id = ?, disposition = ?, public_rel = ?, reason = ?, started_date = ?
             WHERE id = ?',
            [$c1, $c2, $disposition, $publicRel, $reason, $startedDate, $keepId],
            $uid
        );
        return $keepId;
    }

    return insertAndGetId(
        'INSERT INTO character_relationships (char1_id, char2_id, rel_type, disposition, public_rel, reason, started_date)
         VALUES (?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE disposition=VALUES(disposition), reason=VALUES(reason),
           public_rel=VALUES(public_rel), started_date=VALUES(started_date)',
        [$c1, $c2, $relType, $disposition, $publicRel, $reason, $startedDate],
        $uid
    );
}

/**
 * Delete reverse-direction duplicates for undirected types among the given characters.
 * Keeps one row per (type, unordered pair): prefers already-canonical order, else lowest id.
 * Deletes extras first, then rewrites orientation — never UPDATE into a live unique_rel conflict.
 *
 * @param int[] $charIds
 * @return int Number of duplicate rows removed
 */
function ew_collapse_undirected_relationship_duplicates(array $charIds, int $uid): int
{
    $charIds = array_values(array_unique(array_map('intval', $charIds)));
    if (count($charIds) < 2) {
        return 0;
    }
    $ph = implode(',', array_fill(0, count($charIds), '?'));
    $rows = query(
        "SELECT id, char1_id, char2_id, rel_type
         FROM character_relationships
         WHERE char1_id IN ($ph) OR char2_id IN ($ph)
         ORDER BY id ASC",
        array_merge($charIds, $charIds),
        $uid
    );
    if (!$rows) {
        return 0;
    }

    /** @var array<string, list<array{id:int,char1_id:int,char2_id:int}>> $groups */
    $groups = [];
    foreach ($rows as $row) {
        $type = strtolower(trim((string) ($row['rel_type'] ?? '')));
        if (!ew_relationship_is_undirected($type)) {
            continue;
        }
        $a = (int) $row['char1_id'];
        $b = (int) $row['char2_id'];
        $lo = min($a, $b);
        $hi = max($a, $b);
        $key = $type . ':' . $lo . ':' . $hi;
        $groups[$key][] = [
            'id' => (int) $row['id'],
            'char1_id' => $a,
            'char2_id' => $b,
            'lo' => $lo,
            'hi' => $hi,
        ];
    }

    $removed = 0;
    foreach ($groups as $members) {
        if (count($members) === 1) {
            $only = $members[0];
            if ($only['char1_id'] !== $only['lo'] || $only['char2_id'] !== $only['hi']) {
                // Sole reverse-order row — safe to flip (no sibling on unique_rel)
                try {
                    execute(
                        'UPDATE character_relationships SET char1_id = ?, char2_id = ? WHERE id = ?',
                        [$only['lo'], $only['hi'], $only['id']],
                        $uid
                    );
                } catch (Exception $e) {
                    // Ignore rare races; load still works with reverse orientation
                }
            }
            continue;
        }

        // Prefer a row already in canonical (lo, hi) order; else lowest id
        $keep = null;
        foreach ($members as $m) {
            if ($m['char1_id'] === $m['lo'] && $m['char2_id'] === $m['hi']) {
                $keep = $m;
                break;
            }
        }
        if ($keep === null) {
            $keep = $members[0];
        }

        foreach ($members as $m) {
            if ($m['id'] === $keep['id']) {
                continue;
            }
            execute('DELETE FROM character_relationships WHERE id = ?', [$m['id']], $uid);
            $removed++;
        }

        if ($keep['char1_id'] !== $keep['lo'] || $keep['char2_id'] !== $keep['hi']) {
            try {
                execute(
                    'UPDATE character_relationships SET char1_id = ?, char2_id = ? WHERE id = ?',
                    [$keep['lo'], $keep['hi'], $keep['id']],
                    $uid
                );
            } catch (Exception $e) {
                // Kept reverse orientation rather than fail the social panel
            }
        }
    }
    return $removed;
}
