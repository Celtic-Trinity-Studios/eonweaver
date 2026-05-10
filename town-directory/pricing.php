<?php
/**
 * Fixed Eon wallet prices (raw token units, same as credit_balance deductions).
 * Intake formulas MUST stay in sync with src/constants/pricing.js — change both together.
 */

/** Per intake_flesh OpenRouter call: shared prompt + feat slice + per-stub completion (1–10 stubs per call). */
function ew_pricing_intake_flesh_batch_wallet_raw(int $stubCount): int
{
    $n = max(1, min(10, $stubCount));

    return 9000 + 550 * $n;
}

/**
 * Total wallet charge for standard NPC intake (procedural roster + batched flesh only).
 */
function ew_pricing_intake_standard_npc_wallet_raw(int $npcCount): int
{
    $n = max(0, $npcCount);
    $total = 0;
    for ($i = 0; $i < $n; $i += 10) {
        $c = min(10, $n - $i);
        $total += ew_pricing_intake_flesh_batch_wallet_raw($c);
    }

    return $total;
}

/** One AI roster call (creature / custom-demographics roster path). */
function ew_pricing_intake_roster_ai_wallet_raw(int $numArrivals): int
{
    $n = max(1, min(150, $numArrivals));

    return 4000 + 280 * $n;
}

/** intake_custom — single full character JSON from the model. */
function ew_pricing_intake_custom_wallet_raw(): int
{
    return 6500;
}

// ── Simulation & related (must match src/constants/pricing.js) ─────────────

/** Main sim_run / sim_single_town bundle (one OpenRouter completion). */
function ew_pricing_sim_run_wallet_raw(int $months, int $population, int $numTowns = 1): int
{
    $months = max(1, $months);
    $popFactor = max(1.0, $population / 50.0);
    $nt = max(1, $numTowns);

    return (int) round(7600 * $popFactor * $months * $nt);
}

/** One forced-arrival character in sim_run months=0 (same scale as one flesh stub). */
function ew_pricing_sim_forced_arrival_one_wallet_raw(): int
{
    return ew_pricing_intake_flesh_batch_wallet_raw(1);
}

/** Macro simulation chunk (story / population / …). */
function ew_pricing_sim_chunk_wallet_raw(string $category): int
{
    $map = [
        'story' => 5200,
        'population' => 5600,
        'character_build' => 6400,
        'social' => 5900,
        'stats' => 4900,
    ];

    return $map[$category] ?? 5000;
}

/** Portrait prompt helper. */
function ew_pricing_portrait_prompt_wallet_raw(): int
{
    return 1900;
}

/** Campaign / town year weather. */
function ew_pricing_weather_year_wallet_raw(): int
{
    return 5200;
}

function ew_pricing_random_encounter_wallet_raw(): int
{
    return 3400;
}

function ew_pricing_loot_gen_wallet_raw(): int
{
    return 2900;
}

function ew_pricing_magic_shop_wallet_raw(): int
{
    return 4000;
}

/** Planning (per sim_plan call). */
function ew_pricing_sim_planning_wallet_raw(int $numTowns, int $months): int
{
    $nt = max(1, $numTowns);
    if ($months <= 1) {
        return 1800 * $nt;
    }

    return 2500 * $nt;
}

/** Scribe generator (per request). */
function ew_pricing_scribe_wallet_raw(string $generatorType): int
{
    $map = [
        'item' => 900,
        'trap' => 900,
        'weather' => 900,
        'lore' => 3000,
        'quest' => 3500,
        'dungeon' => 4500,
    ];

    return $map[$generatorType] ?? 2000;
}

function ew_pricing_level_up_wallet_raw(): int
{
    return 2500;
}

/** Sidebar “custom AI” short prompt (CharacterImport). */
function ew_pricing_custom_prompt_wallet_raw(): int
{
    return 2000;
}

/** Auto-assign spells town-wide. */
function ew_pricing_auto_spells_wallet_raw(int $casterCount): int
{
    $n = max(1, $casterCount);

    return max(1300, (int) round($n * 200));
}
