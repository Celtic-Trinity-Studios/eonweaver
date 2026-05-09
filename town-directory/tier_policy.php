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

/**
 * Town / world / chunked AI simulation — not included on free demo tier.
 */
function ew_require_non_free_for_major_ai_simulation(int $userId): void
{
    if (ew_user_subscription_tier($userId) === 'free') {
        throw new Exception(
            'AI town & world simulation is not included on the Free demo tier. '
            . 'Upgrade for simulation, or keep using calendar, roster, wiki, and manual editing at no cost.'
        );
    }
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
 * Call before inserting a new character (free tier only).
 */
function ew_assert_free_tier_population_cap(int $userId, int $townId, int $uid): void
{
    if (ew_user_subscription_tier($userId) !== 'free') {
        return;
    }
    $cap = ew_free_tier_max_residents();
    $n = ew_count_town_residents($townId, $uid);
    if ($n >= $cap) {
        throw new Exception(
            "Free demo towns are limited to {$cap} residents. Remove a character or upgrade for larger settlements."
        );
    }
}
