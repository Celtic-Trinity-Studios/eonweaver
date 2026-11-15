<?php
/**
 * Subscription tier helpers — shared DB (userId 0).
 */
require_once __DIR__ . '/db.php';

function ew_user_subscription_tier(int $userId): string
{
    static $cache = [];
    if (isset($cache[$userId])) {
        return $cache[$userId];
    }
    $r = query('SELECT subscription_tier FROM users WHERE id = ?', [$userId], 0);
    $t = $r ? ($r[0]['subscription_tier'] ?? 'free') : 'free';
    $cache[$userId] = $t;
    return $t;
}

function ew_free_tier_max_residents(): int
{
    return defined('FREE_TIER_MAX_RESIDENTS') ? max(1, (int) FREE_TIER_MAX_RESIDENTS) : 15;
}

function ew_count_town_residents(int $townId, int $uid): int
{
    $r = query('SELECT COUNT(*) AS c FROM characters WHERE town_id = ?', [$townId], $uid);
    return (int) ($r[0]['c'] ?? 0);
}

/**
 * Roster size is not tier-gated. Kept so older callers still resolve.
 * AI spend is limited by credit_balance only.
 */
function ew_assert_free_tier_population_cap(int $userId, int $townId, int $uid): void
{
    unset($userId, $townId, $uid);
}
