<?php
/**
 * Macro Simulation / Wiki / Integration framework helpers.
 * Framework-only scaffolding for upcoming phases.
 */

function ensureMacroFrameworkTables(): void
{
    try {
        execute(
            'CREATE TABLE IF NOT EXISTS campaign_macro_state (
                campaign_id INT NOT NULL PRIMARY KEY,
                current_month_index INT NOT NULL DEFAULT 0,
                season VARCHAR(20) NOT NULL DEFAULT "spring",
                weather_pattern VARCHAR(60) NOT NULL DEFAULT "temperate",
                climate_stress DECIMAL(8,3) NOT NULL DEFAULT 0.000,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )',
            [],
            0
        );
    } catch (Exception $e) {
        // noop - table may already exist on host with stricter DDL behavior
    }

    try {
        execute(
            'CREATE TABLE IF NOT EXISTS town_macro_metrics (
                id INT AUTO_INCREMENT PRIMARY KEY,
                campaign_id INT NOT NULL,
                town_id INT NOT NULL,
                supply_index DECIMAL(10,3) NOT NULL DEFAULT 1.000,
                demand_index DECIMAL(10,3) NOT NULL DEFAULT 1.000,
                food_stores DECIMAL(12,2) NOT NULL DEFAULT 100.00,
                stability_index DECIMAL(10,3) NOT NULL DEFAULT 1.000,
                population_estimate INT NOT NULL DEFAULT 0,
                trade_score DECIMAL(10,3) NOT NULL DEFAULT 1.000,
                weather_impact DECIMAL(10,3) NOT NULL DEFAULT 0.000,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_town_macro_metrics (campaign_id, town_id),
                KEY idx_town_macro_campaign (campaign_id),
                KEY idx_town_macro_town (town_id)
            )',
            [],
            0
        );
    } catch (Exception $e) {
        // noop
    }

    try {
        execute(
            'CREATE TABLE IF NOT EXISTS wiki_articles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                campaign_id INT NOT NULL,
                slug VARCHAR(180) NOT NULL,
                title VARCHAR(180) NOT NULL,
                body MEDIUMTEXT NOT NULL,
                tags_json TEXT DEFAULT NULL,
                is_auto_generated TINYINT(1) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_wiki_slug (user_id, campaign_id, slug),
                KEY idx_wiki_campaign (campaign_id),
                KEY idx_wiki_user_campaign (user_id, campaign_id)
            )',
            [],
            0
        );
    } catch (Exception $e) {
        // noop
    }

    try {
        execute(
            'CREATE TABLE IF NOT EXISTS wiki_links (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                campaign_id INT NOT NULL,
                from_slug VARCHAR(180) NOT NULL,
                to_slug VARCHAR(180) NOT NULL,
                weight DECIMAL(8,3) NOT NULL DEFAULT 1.000,
                auto_generated TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_wiki_link (user_id, campaign_id, from_slug, to_slug),
                KEY idx_wiki_links_campaign (campaign_id)
            )',
            [],
            0
        );
    } catch (Exception $e) {
        // noop
    }

    try {
        execute(
            'CREATE TABLE IF NOT EXISTS integration_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                campaign_id INT NOT NULL,
                key_name VARCHAR(120) NOT NULL,
                value_json TEXT DEFAULT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_integration_setting (user_id, campaign_id, key_name),
                KEY idx_integration_campaign (campaign_id)
            )',
            [],
            0
        );
    } catch (Exception $e) {
        // noop
    }

    try {
        execute(
            'CREATE TABLE IF NOT EXISTS macro_trade_routes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                campaign_id INT NOT NULL,
                from_town_id INT NOT NULL,
                to_town_id INT NOT NULL,
                route_strength DECIMAL(10,3) NOT NULL DEFAULT 1.000,
                risk_index DECIMAL(10,3) NOT NULL DEFAULT 0.200,
                last_caravan_at TIMESTAMP NULL DEFAULT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_macro_trade_route (campaign_id, from_town_id, to_town_id),
                KEY idx_macro_trade_campaign (campaign_id)
            )',
            [],
            0
        );
    } catch (Exception $e) {
        // noop
    }

    try {
        execute(
            'CREATE TABLE IF NOT EXISTS macro_weather_events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                campaign_id INT NOT NULL,
                month_index INT NOT NULL,
                season VARCHAR(20) NOT NULL,
                weather_pattern VARCHAR(60) NOT NULL,
                severity DECIMAL(8,3) NOT NULL DEFAULT 0.000,
                narrative VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                KEY idx_macro_weather_campaign_month (campaign_id, month_index)
            )',
            [],
            0
        );
    } catch (Exception $e) {
        // noop
    }

    try {
        execute(
            'CREATE TABLE IF NOT EXISTS macro_demographics_snapshots (
                id INT AUTO_INCREMENT PRIMARY KEY,
                campaign_id INT NOT NULL,
                town_id INT NOT NULL,
                month_index INT NOT NULL,
                living_population INT NOT NULL DEFAULT 0,
                child_population INT NOT NULL DEFAULT 0,
                elder_population INT NOT NULL DEFAULT 0,
                workforce_population INT NOT NULL DEFAULT 0,
                growth_rate DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_macro_demo_snapshot (campaign_id, town_id, month_index),
                KEY idx_macro_demo_campaign (campaign_id)
            )',
            [],
            0
        );
    } catch (Exception $e) {
        // noop
    }

    try {
        execute(
            'CREATE TABLE IF NOT EXISTS player_portal_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                campaign_id INT NOT NULL,
                token_hash VARCHAR(96) NOT NULL,
                label VARCHAR(120) DEFAULT NULL,
                scope_json TEXT DEFAULT NULL,
                is_revoked TINYINT(1) NOT NULL DEFAULT 0,
                expires_at DATETIME DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_accessed_at DATETIME DEFAULT NULL,
                UNIQUE KEY uniq_player_portal_token (token_hash),
                KEY idx_player_portal_user_campaign (user_id, campaign_id)
            )',
            [],
            0
        );
    } catch (Exception $e) {
        // noop
    }

    try {
        execute(
            'CREATE TABLE IF NOT EXISTS integration_jobs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                campaign_id INT NOT NULL,
                job_type VARCHAR(80) NOT NULL,
                payload_json TEXT DEFAULT NULL,
                status VARCHAR(20) NOT NULL DEFAULT "queued",
                result_json TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                KEY idx_integration_jobs_campaign (campaign_id),
                KEY idx_integration_jobs_type (job_type)
            )',
            [],
            0
        );
    } catch (Exception $e) {
        // noop
    }
}

function getActiveCampaignIdForUser(int $uid): int
{
    $row = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
    if (!$row) {
        throw new Exception('No active campaign selected.');
    }
    return (int) $row[0]['id'];
}

function macroSeasonForIndex(int $monthIndex): string
{
    $mod = ($monthIndex % 12 + 12) % 12;
    if ($mod < 3)
        return 'spring';
    if ($mod < 6)
        return 'summer';
    if ($mod < 9)
        return 'autumn';
    return 'winter';
}

function macroWeatherForSeason(string $season): string
{
    switch ($season) {
        case 'summer':
            return 'dry_heat';
        case 'autumn':
            return 'cool_rain';
        case 'winter':
            return 'frost_front';
        default:
            return 'mild_breeze';
    }
}

function ensureCampaignMacroBaseline(int $campaignId): array
{
    $rows = query('SELECT * FROM campaign_macro_state WHERE campaign_id = ? LIMIT 1', [$campaignId], 0);
    if ($rows) {
        return $rows[0];
    }
    execute(
        'INSERT INTO campaign_macro_state (campaign_id, current_month_index, season, weather_pattern, climate_stress)
         VALUES (?, 0, "spring", "temperate", 0)',
        [$campaignId],
        0
    );
    $rows = query('SELECT * FROM campaign_macro_state WHERE campaign_id = ? LIMIT 1', [$campaignId], 0);
    return $rows ? $rows[0] : [];
}

function ensureTownMacroRows(int $campaignId): void
{
    $towns = query('SELECT id FROM towns WHERE campaign_id = ? AND (is_party_base = 0 OR is_party_base IS NULL)', [$campaignId], 0);
    foreach ($towns as $t) {
        $townId = (int) $t['id'];
        $existing = query('SELECT id FROM town_macro_metrics WHERE campaign_id = ? AND town_id = ? LIMIT 1', [$campaignId, $townId], 0);
        if ($existing) {
            continue;
        }
        $popRows = query('SELECT COUNT(*) as c FROM characters WHERE town_id = ? AND status != "deceased"', [$townId], 0);
        $pop = (int) ($popRows[0]['c'] ?? 0);
        execute(
            'INSERT INTO town_macro_metrics (campaign_id, town_id, population_estimate) VALUES (?, ?, ?)',
            [$campaignId, $townId, $pop],
            0
        );
    }
}

/** Re-sync living population counts from characters into town_macro_metrics (after sims / intake). */
function refreshTownMacroPopulations(int $campaignId): void
{
    $towns = query('SELECT id FROM towns WHERE campaign_id = ? AND (is_party_base = 0 OR is_party_base IS NULL)', [$campaignId], 0);
    foreach ($towns as $t) {
        $townId = (int) $t['id'];
        $popRows = query(
            'SELECT COUNT(*) as c FROM characters WHERE town_id = ? AND (status IS NULL OR status != "deceased")',
            [$townId],
            0
        );
        $pop = (int) ($popRows[0]['c'] ?? 0);
        execute(
            'UPDATE town_macro_metrics SET population_estimate = ? WHERE campaign_id = ? AND town_id = ?',
            [$pop, $campaignId, $townId],
            0
        );
    }
}

function getMacroTownMetrics(int $campaignId): array
{
    return query(
        'SELECT m.*, t.name AS town_name
         FROM town_macro_metrics m
         JOIN towns t ON t.id = m.town_id
         WHERE m.campaign_id = ?
         ORDER BY t.name',
        [$campaignId],
        0
    );
}

function ensureMacroTradeRoutes(int $campaignId): void
{
    $towns = query(
        'SELECT id FROM towns WHERE campaign_id = ? AND (is_party_base = 0 OR is_party_base IS NULL) ORDER BY id',
        [$campaignId],
        0
    );
    $townIds = array_map(fn($t) => (int) $t['id'], $towns);
    $count = count($townIds);
    for ($i = 0; $i < $count; $i++) {
        for ($j = $i + 1; $j < $count; $j++) {
            $a = $townIds[$i];
            $b = $townIds[$j];
            execute(
                'INSERT INTO macro_trade_routes (campaign_id, from_town_id, to_town_id, route_strength, risk_index)
                 VALUES (?, ?, ?, 1.000, 0.200)
                 ON DUPLICATE KEY UPDATE updated_at = NOW()',
                [$campaignId, $a, $b],
                0
            );
        }
    }
}

function getMacroTradeRoutes(int $campaignId): array
{
    return query(
        'SELECT r.*,
                t1.name AS from_town_name,
                t2.name AS to_town_name
         FROM macro_trade_routes r
         JOIN towns t1 ON t1.id = r.from_town_id
         JOIN towns t2 ON t2.id = r.to_town_id
         WHERE r.campaign_id = ?
         ORDER BY t1.name, t2.name',
        [$campaignId],
        0
    );
}

function runMacroMonthTick(int $campaignId, int $months = 1, string $operatorNote = ''): array
{
    $months = max(1, min(12, (int) $months));
    $operatorNote = trim($operatorNote);
    $state = ensureCampaignMacroBaseline($campaignId);
    ensureTownMacroRows($campaignId);
    ensureMacroTradeRoutes($campaignId);
    refreshTownMacroPopulations($campaignId);

    $monthIndex = (int) ($state['current_month_index'] ?? 0);
    for ($i = 0; $i < $months; $i++) {
        $monthIndex++;
        $season = macroSeasonForIndex($monthIndex);
        $weather = macroWeatherForSeason($season);
        $seasonSupply = ($season === 'summer') ? 0.055 : (($season === 'winter') ? -0.085 : 0.02);
        $seasonDemand = ($season === 'winter') ? 0.06 : 0.025;
        $weatherImpact = ($weather === 'frost_front') ? -0.12 : (($weather === 'dry_heat') ? -0.03 : 0.01);
        $severity = abs($weatherImpact) + (($season === 'winter') ? 0.05 : 0.0);

        $isLastMonth = ($i === $months - 1);
        $narrative = 'Seasonal macro tick';
        if ($operatorNote !== '' && $isLastMonth) {
            $narrative = function_exists('mb_substr')
                ? mb_substr($operatorNote, 0, 255, 'UTF-8')
                : substr($operatorNote, 0, 255);
        }

        execute(
            'INSERT INTO macro_weather_events (campaign_id, month_index, season, weather_pattern, severity, narrative)
             VALUES (?, ?, ?, ?, ?, ?)',
            [
                $campaignId,
                $monthIndex,
                $season,
                $weather,
                round($severity, 3),
                $narrative,
            ],
            0
        );

        $rows = getMacroTownMetrics($campaignId);
        foreach ($rows as $row) {
            $townId = (int) $row['town_id'];
            $supply = (float) $row['supply_index'];
            $demand = (float) $row['demand_index'];
            $stability = (float) $row['stability_index'];
            $food = (float) $row['food_stores'];
            $trade = (float) $row['trade_score'];
            $pop = max(1, (int) $row['population_estimate']);

            $supply = max(0.1, $supply + $seasonSupply + (($trade - 1.0) * 0.02));
            $demand = max(0.1, $demand + $seasonDemand + ($pop / 10000.0));
            $food = max(0.0, $food + (($supply - $demand) * 14.0));
            $stability = max(0.1, min(2.5, $stability + (($food > 80) ? 0.015 : -0.02) + $weatherImpact * 0.25));
            $trade = max(0.1, min(3.0, $trade + (($supply > $demand) ? 0.01 : -0.008)));

            execute(
                'UPDATE town_macro_metrics
                 SET supply_index = ?, demand_index = ?, food_stores = ?, stability_index = ?, trade_score = ?, weather_impact = ?, population_estimate = ?
                 WHERE campaign_id = ? AND town_id = ?',
                [
                    round($supply, 3),
                    round($demand, 3),
                    round($food, 2),
                    round($stability, 3),
                    round($trade, 3),
                    round($weatherImpact, 3),
                    $pop,
                    $campaignId,
                    $townId,
                ],
                0
            );

            $children = (int) floor($pop * 0.22);
            $elders = (int) floor($pop * 0.11);
            $workforce = max(0, $pop - $children - $elders);
            $growthRate = (($supply - $demand) * 0.012) + (($stability - 1.0) * 0.01);

            execute(
                'INSERT INTO macro_demographics_snapshots
                    (campaign_id, town_id, month_index, living_population, child_population, elder_population, workforce_population, growth_rate)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    living_population = VALUES(living_population),
                    child_population = VALUES(child_population),
                    elder_population = VALUES(elder_population),
                    workforce_population = VALUES(workforce_population),
                    growth_rate = VALUES(growth_rate)',
                [
                    $campaignId,
                    $townId,
                    $monthIndex,
                    $pop,
                    $children,
                    $elders,
                    $workforce,
                    round($growthRate, 4),
                ],
                0
            );
        }

        $routes = getMacroTradeRoutes($campaignId);
        foreach ($routes as $route) {
            $strength = max(0.1, min(5.0, (float) $route['route_strength'] + (($season === 'summer') ? 0.03 : -0.01)));
            $risk = max(0.01, min(2.0, (float) $route['risk_index'] + (($season === 'winter') ? 0.02 : -0.004)));
            execute(
                'UPDATE macro_trade_routes
                 SET route_strength = ?, risk_index = ?, last_caravan_at = NOW()
                 WHERE id = ?',
                [round($strength, 3), round($risk, 3), (int) $route['id']],
                0
            );
        }
    }

    $season = macroSeasonForIndex($monthIndex);
    $weather = macroWeatherForSeason($season);
    execute(
        'UPDATE campaign_macro_state
         SET current_month_index = ?, season = ?, weather_pattern = ?, climate_stress = climate_stress + ?
         WHERE campaign_id = ?',
        [
            $monthIndex,
            $season,
            $weather,
            ($season === 'winter' ? 0.07 : 0.03),
            $campaignId,
        ],
        0
    );

    $stateRows = query('SELECT * FROM campaign_macro_state WHERE campaign_id = ? LIMIT 1', [$campaignId], 0);
    return $stateRows ? $stateRows[0] : [];
}

/**
 * Run one macro month per in-game month simulated (chunks internally; cap 120).
 * Operator note is attached to the final simulated month only.
 */
function runMacroTicksForSimulatedMonths(int $campaignId, int $totalMonths, string $operatorNote = ''): array
{
    $totalMonths = max(0, min(120, (int) $totalMonths));
    if ($totalMonths === 0) {
        $rows = query('SELECT * FROM campaign_macro_state WHERE campaign_id = ? LIMIT 1', [$campaignId], 0);
        return $rows ? $rows[0] : [];
    }
    $note = trim($operatorNote);
    $remaining = $totalMonths;
    $state = [];
    while ($remaining > 0) {
        $chunk = min(12, $remaining);
        $isLastChunk = $remaining <= $chunk;
        $remaining -= $chunk;
        $chunkNote = ($isLastChunk && $note !== '') ? $note : '';
        $state = runMacroMonthTick($campaignId, $chunk, $chunkNote);
    }
    return $state;
}

