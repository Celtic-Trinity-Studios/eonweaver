<?php
/**
 * Tier economics — monthly platform AI ceilings (raw OpenRouter tokens / calendar month).
 *
 * EC wallet model: usage is tracked in user_token_usage and deducted from credit_balance.
 * Retail list prices live in tier_limits.php (`price_usd_month`; paid anchors $5 / $10 / $20 / $40 USD/mo
 * as of 2026 — tune there). Default caps are derived so
 * that **if someone maxed the ceiling**, implied variable cost at **your** loaded $/EC does
 * not exceed **EW_MONTHLY_CAP_ARPU_FRACTION** of that tier’s monthly ARPU (Stripe/fees/extra
 * headroom sit above this band).
 *
 * Telemetry anchor (order of magnitude): ~123k raw tokens ≈ US$0.099 blended OpenRouter-style
 * on a heavy town burst → ~**$0.80/M raw** → at **200_000** raw/EC ≈ **$0.16/EC** maintainer.
 * Default **EW_MONTHLY_CAP_ARPU_FRACTION = 0.45** → at full monthly cap, imputed variable is
 * **45%** of list price → **~55%** of ARPU left for fees, hosting, support, and margin (tune in
 * `config.php` to bias conservative vs aggressive).
 *
 * Optional `config.php` overrides (see config.example.php):
 *   EW_EC_MAINTAINER_COST_USD   — blended cost to you for ~1.00 displayed EC (default 0.15)
 *   EW_MONTHLY_CAP_ARPU_FRACTION — max share of list ARPU that full-cap burn may represent (default 0.45)
 *   TOKENS_PER_CREDIT           — raw tokens per 1 EC display (default 200000)
 *
 * Legacy retail top-up story (US$0.22 / 1.5 EC) is independent; tune maintainer constants to reality.
 *
 * Override any tier via site_settings key token_limit_{tier} (non-negative integer).
 * **0** = no monthly platform cap (wallet-only for that tier; Free defaults to 0).
 */
if (!function_exists('query')) {
    require_once __DIR__ . '/db.php';
}

/**
 * Default monthly raw-token ceilings — computed from tier list prices and maintainer unit economics.
 *
 * Formula (Apprentice): floor( (price_usd_month × fraction) / maintainer_cost_per_ec × tokens_per_ec ).
 * Adventurer / Guild Master / World Builder use fixed monthly EC allowances (converted with TOKENS_PER_CREDIT).
 * Free tier: **0** raw cap (no monthly allotment)—platform AI is limited by **credit_balance** only
 * (starter ~1.5 EC on signup). Paid tiers use the formula or fixed EC map below.
 */
function ew_tier_monthly_ec_cap_fixed(): array
{
    return [
        'adventurer' => 40,
        'guild_master' => 85,
        'world_builder' => 150,
    ];
}

function ew_tier_monthly_raw_cap_defaults(): array
{
    static $cached = null;
    if ($cached !== null) {
        return $cached;
    }
    require_once __DIR__ . '/tier_limits.php';
    $maintainerUsdPerEc = defined('EW_EC_MAINTAINER_COST_USD') ? (float) constant('EW_EC_MAINTAINER_COST_USD') : 0.15;
    if ($maintainerUsdPerEc < 0.0001) {
        $maintainerUsdPerEc = 0.15;
    }
    $arpuFrac = defined('EW_MONTHLY_CAP_ARPU_FRACTION') ? (float) constant('EW_MONTHLY_CAP_ARPU_FRACTION') : 0.45;
    if ($arpuFrac <= 0.0 || $arpuFrac > 1.0) {
        $arpuFrac = 0.45;
    }
    $tokensPerEc = defined('TOKENS_PER_CREDIT') ? (int) constant('TOKENS_PER_CREDIT') : 200000;
    if ($tokensPerEc < 1000) {
        $tokensPerEc = 200000;
    }
    $byId = ew_tier_default_limits_by_id();
    $fixedEc = ew_tier_monthly_ec_cap_fixed();
    $cached = [];
    foreach (ew_subscription_tier_ids() as $id) {
        $price = (float) ($byId[$id]['price_usd_month'] ?? 0);
        if ($price <= 0.0) {
            $cached[$id] = 0;
            continue;
        }
        if (isset($fixedEc[$id])) {
            $ec = (int) $fixedEc[$id];
            $cached[$id] = (int) max(1, $ec * $tokensPerEc);
            continue;
        }
        $maxUsd = $price * $arpuFrac;
        $maxEc = $maxUsd / $maintainerUsdPerEc;
        $cached[$id] = (int) max(1, floor($maxEc * $tokensPerEc));
    }
    return $cached;
}

function ew_monthly_raw_cap_for_tier(string $tier): int
{
    $tier = strtolower(trim($tier));
    if ($tier === '') {
        $tier = 'free';
    }
    $defaults = ew_tier_monthly_raw_cap_defaults();
    $fallback = (int) ($defaults[$tier] ?? $defaults['free']);
    $key = 'token_limit_' . $tier;
    try {
        $rows = query('SELECT value FROM site_settings WHERE `key` = ? LIMIT 1', [$key], 0);
        if ($rows && array_key_exists('value', $rows[0]) && $rows[0]['value'] !== null) {
            $raw = trim((string) $rows[0]['value']);
            if ($raw !== '') {
                return max(0, (int) $raw);
            }
        }
    } catch (Throwable $e) {
        // fail-open
    }
    return max(0, $fallback);
}

function ew_monthly_tokens_used_sum(int $userId): int
{
    $ym = date('Y-m');
    try {
        $rows = query(
            'SELECT COALESCE(SUM(tokens_used), 0) AS t FROM user_token_usage WHERE user_id = ? AND `year_month` = ?',
            [$userId, $ym],
            0
        );
        return (int) ($rows[0]['t'] ?? 0);
    } catch (Throwable $e) {
        return 0;
    }
}

function ew_monthly_platform_cap_exceeded(int $userId, string $tier): bool
{
    $cap = ew_monthly_raw_cap_for_tier($tier);
    if ($cap <= 0) {
        return false;
    }
    return ew_monthly_tokens_used_sum($userId) >= $cap;
}

/**
 * If platform-wallet AI should be blocked, return a user-facing reason; otherwise null.
 * BYOK (OpenRouter key in Settings) → never blocked here.
 */
function ew_platform_wallet_blocked(int $userId, string $tier): ?string
{
    try {
        $rows = query('SELECT credit_balance, gemini_api_key FROM users WHERE id = ?', [$userId], 0);
        $balance = $rows ? (int) ($rows[0]['credit_balance'] ?? 0) : 0;
        $userKey = trim($rows ? (string) ($rows[0]['gemini_api_key'] ?? '') : '');
        if ($userKey !== '') {
            return null;
        }
        if ($balance <= 0) {
            return 'No Eon Credits left on your platform wallet. Add your OpenRouter API key under ⚙️ Settings to use your own account, or top up credits.';
        }
        if (ew_monthly_platform_cap_exceeded($userId, $tier)) {
            return 'Monthly AI usage limit reached for your subscription tier. Try again next calendar month, upgrade, add more Eon Credits if your plan allows, or use your own OpenRouter API key under ⚙️ Settings.';
        }
        return null;
    } catch (Throwable $e) {
        return null;
    }
}
