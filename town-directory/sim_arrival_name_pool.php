<?php
/**
 * Server-side reserved names for simulation arrivals: fewer duplicate rejects, less LLM invent-a-name work.
 * Fills the pool from the master NPC store (`character_sheet_library` — merged reusable sheets), then procedural generateRoster().
 */

require_once __DIR__ . '/roster_generator.php';
require_once __DIR__ . '/character_sheet_library.php';

/**
 * How many reserved outsider names to prepare for one simulation request.
 */
function ew_sim_arrival_name_pool_target_count(int $charCount, int $simMonths): int
{
    $m = max(1, $simMonths);

    return min(40, max(12, (int) ceil($charCount / 6) + $m * 2));
}

/**
 * Pull reserved-name slots from the master NPC table (`character_sheet_library`).
 *
 * @param array<string, bool> $existingLower keyed by strtolower(trim(name))
 * @return list<array{name: string, race: string, class: string, gender: string, age: int, alignment: string, role: string, _library_sheet_id?: int, _name_source: string}>
 */
function ew_sim_fetch_master_npc_arrival_slots(
    int $userId,
    ?int $campaignId,
    string $dndEdition,
    int $townId,
    int $uid,
    array &$existingLower,
    int $maxLib
): array {
    if ($maxLib <= 0) {
        return [];
    }
    $ck = ew_sheet_lib_campaign_key($campaignId);
    $dnd = trim($dndEdition) !== '' ? trim($dndEdition) : '3.5e';
    try {
        $rows = query(
            'SELECT id, name, sheet_json FROM character_sheet_library
             WHERE user_id = ? AND campaign_key = ? AND dnd_edition = ?
             ORDER BY updated_at DESC LIMIT 120',
            [$userId, $ck, $dnd],
            $uid
        );
    } catch (Throwable $e) {
        return [];
    }
    $out = [];
    foreach ($rows ?: [] as $row) {
        if (count($out) >= $maxLib) {
            break;
        }
        $name = trim((string) ($row['name'] ?? ''));
        if ($name === '') {
            continue;
        }
        $nn = ew_sheet_lib_name_norm($name);
        if ($nn === '' || isset($existingLower[$nn])) {
            continue;
        }
        try {
            $inTown = query(
                'SELECT 1 FROM characters WHERE town_id = ? AND LOWER(TRIM(name)) = ? AND COALESCE(TRIM(status), \'\') <> ? LIMIT 1',
                [$townId, $nn, 'Deceased'],
                $uid
            );
        } catch (Throwable $e) {
            continue;
        }
        if (!empty($inTown)) {
            continue;
        }
        $json = trim((string) ($row['sheet_json'] ?? ''));
        $sheet = $json !== '' ? json_decode($json, true) : null;
        if (!is_array($sheet)) {
            continue;
        }
        $hist = trim((string) ($sheet['history'] ?? $sheet['reason'] ?? ''));
        if (strlen($hist) < 12) {
            continue;
        }
        $out[] = [
            'name' => $name,
            'race' => trim((string) ($sheet['race'] ?? 'Human')),
            'class' => trim((string) ($sheet['class'] ?? 'Commoner 1')),
            'gender' => strtoupper(substr(trim((string) ($sheet['gender'] ?? 'M')), 0, 1)) === 'F' ? 'F' : 'M',
            'age' => (int) ($sheet['age'] ?? 25),
            'alignment' => trim((string) ($sheet['alignment'] ?? 'TN')),
            'role' => trim((string) ($sheet['role'] ?? '')),
            '_library_sheet_id' => (int) ($row['id'] ?? 0),
            '_name_source' => 'master_npc',
        ];
        $existingLower[$nn] = true;
    }

    return $out;
}

/**
 * @return list<string>
 */
function ew_sim_demographics_enforced_races_for_count(string $demographics, int $need, string $dndEdition): array
{
    $enforcedRaceList = [];
    $demoEntries = ew_parse_town_demographics_entries($demographics);
    if (empty($demoEntries) || $need <= 0) {
        return $enforcedRaceList;
    }
    $totalPct = array_sum(array_column($demoEntries, 'pct'));
    if ($totalPct <= 0) {
        $totalPct = 100;
    }
    $raceCounts_tmp = [];
    $totalAssigned = 0;
    foreach ($demoEntries as $idx => $entry) {
        $exact = ($entry['pct'] / $totalPct) * $need;
        $floored = (int) floor($exact);
        $raceCounts_tmp[$idx] = [
            'race' => $entry['race'],
            'count' => $floored,
            'remainder' => $exact - $floored,
        ];
        $totalAssigned += $floored;
    }
    $remainingSlots = $need - $totalAssigned;
    if ($remainingSlots > 0) {
        $sortedIdx = array_keys($raceCounts_tmp);
        usort($sortedIdx, function ($a, $b) use ($raceCounts_tmp) {
            return $raceCounts_tmp[$b]['remainder'] <=> $raceCounts_tmp[$a]['remainder'];
        });
        for ($ri = 0; $ri < $remainingSlots && $ri < count($sortedIdx); $ri++) {
            $raceCounts_tmp[$sortedIdx[$ri]]['count']++;
        }
    }
    foreach ($raceCounts_tmp as $rc) {
        for ($ei = 0; $ei < $rc['count']; $ei++) {
            $enforcedRaceList[] = $rc['race'];
        }
    }
    shuffle($enforcedRaceList);

    return ew_resolve_other_race_slots($enforcedRaceList, $demographics, $dndEdition);
}

/**
 * @param array<int, array<string, mixed>> $characters
 * @param array<string, string> $townMeta key => value from town_meta
 * @param list<array{name: string, type?: string, hit_die?: string}> $customClasses
 * @return list<array<string, mixed>>
 */
function ew_sim_build_arrival_name_pool(
    int $townId,
    int $userId,
    int $uid,
    ?int $campaignId,
    string $dndEdition,
    array $characters,
    array $townMeta,
    int $simMonths,
    array $customClasses = []
): array {
    $charCount = count($characters);
    $target = ew_sim_arrival_name_pool_target_count($charCount, $simMonths);
    $existingNames = [];
    foreach ($characters as $c) {
        $n = trim((string) ($c['name'] ?? ''));
        if ($n !== '') {
            $existingNames[] = $n;
        }
    }
    $existingLower = [];
    foreach ($existingNames as $en) {
        $ln = strtolower(trim($en));
        if ($ln !== '') {
            $existingLower[$ln] = true;
        }
    }
    $genderCounts = ['M' => 0, 'F' => 0];
    $existingRoleCounts = [];
    foreach ($characters as $c) {
        $g = strtoupper(substr(trim((string) ($c['gender'] ?? 'M')), 0, 1));
        $genderCounts[$g === 'F' ? 'F' : 'M']++;
        $role = strtolower(trim((string) ($c['role'] ?? '')));
        if ($role !== '') {
            $existingRoleCounts[$role] = ($existingRoleCounts[$role] ?? 0) + 1;
        }
    }
    $histCheck = [];
    try {
        $histCheck = query('SELECT 1 FROM history WHERE town_id = ? LIMIT 1', [$townId], $uid);
    } catch (Throwable $e) {
    }
    $isNewSettlement = ($charCount === 0 && empty($histCheck));

    $libCap = min(14, (int) ceil($target / 2));
    $libSlots = ew_sim_fetch_master_npc_arrival_slots($userId, $campaignId, $dndEdition, $townId, $uid, $existingLower, $libCap);
    $libNames = array_map(function ($s) {
        return (string) ($s['name'] ?? '');
    }, $libSlots);

    $need = $target - count($libSlots);
    $proc = [];
    if ($need > 0) {
        $demographics = trim($townMeta['demographics'] ?? '');
        $enforcedRaceList = ew_sim_demographics_enforced_races_for_count($demographics, $need, $dndEdition);
        $proc = generateRoster($need, [
            'existingNames' => array_merge($existingNames, $libNames),
            'enforcedRaceList' => $enforcedRaceList,
            'settlementType' => trim($townMeta['settlement_type'] ?? ''),
            'biome' => trim($townMeta['biome'] ?? ''),
            'isNewSettlement' => $isNewSettlement,
            'instructions' => '',
            'existingRoles' => $existingRoleCounts,
            'genderCounts' => $genderCounts,
            'customClasses' => $customClasses,
        ]);
        foreach ($proc as &$p) {
            $p['_name_source'] = 'procedural';
        }
        unset($p);
    }

    return array_values(array_merge($libSlots, $proc));
}

/**
 * True = apply server-reserved name from pool (not a birth, not a creature).
 */
function ew_sim_arrival_should_bind_server_name(array $nc): bool
{
    if (!empty($nc['is_creature'])) {
        return false;
    }
    $age = (int) ($nc['age'] ?? 99);
    $reason = strtolower((string) ($nc['reason'] ?? $nc['reason_for_arrival'] ?? ''));
    if ($age <= 1 && preg_match('/\b(born|birth|newborn|infant|birthed|baby of|child of)\b/i', $reason)) {
        return false;
    }

    return true;
}

/**
 * Prompt fragment: instruct model to use reserved names in order for outsiders.
 */
function ew_sim_arrival_pool_prompt_block(array $pool): string
{
    if (empty($pool)) {
        return '';
    }
    $lines = [];
    $i = 0;
    foreach ($pool as $slot) {
        $nm = trim((string) ($slot['name'] ?? ''));
        if ($nm === '') {
            continue;
        }
        $i++;
        $tag = (!empty($slot['_name_source']) && ($slot['_name_source'] === 'master_npc' || $slot['_name_source'] === 'sheet_library'))
            ? ' [master NPC — reused]'
            : '';
        $lines[] = "{$i}. {$nm}{$tag}";
    }
    if ($lines === []) {
        return '';
    }

    return "\n## RESERVED OUTSIDER NAMES (SERVER — USE IN ORDER)\n"
        . "These full names are NOT on the current roster. Some came from your **master NPC** pool (reusable merged sheets); the rest are procedural. "
        . "For each OUTSIDE arrival in changes.new_characters (travelers, refugees, merchants, etc.), "
        . "use the next line **verbatim** as `name` (same spelling). Your summary and events must use that exact name. "
        . "Newborn children of existing residents may use a different invented name (not from this list).\n"
        . implode("\n", $lines) . "\n";
}
