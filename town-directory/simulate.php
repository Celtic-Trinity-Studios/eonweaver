<?php
/**
 * Town Directory — AI Simulation Engine
 * Uses Gemini API to simulate time passing in a D&D town.
 * 
 * Endpoints:
 *   action=run_simulation   — Generate proposed changes via Gemini
 *   action=apply_simulation — Apply approved changes to the database
 */
// Surface PHP errors as JSON instead of blank 500 pages
ini_set('display_errors', 0);
error_reporting(E_ALL);
register_shutdown_function(function () {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        if (!headers_sent()) {
            header('Content-Type: application/json');
            http_response_code(500);
        }
        echo json_encode([
            'error' => 'PHP Fatal: ' . $err['message'],
            'file' => basename($err['file']),
            'line' => $err['line'],
        ]);
    }
});
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

set_time_limit(300); // LLM calls can take 60-120s — allow up to 5 min

// Smart base dir: use __DIR__ if auth.php exists here, otherwise parent (for /dev/)
$baseDir = file_exists(__DIR__ . '/auth.php') ? __DIR__ : (realpath(__DIR__ . '/..') ?: __DIR__);
require_once $baseDir . '/auth.php';
require_once $baseDir . '/config.php';
require_once $baseDir . '/db.php';
require_once $baseDir . '/llm_local.php';
require_once $baseDir . '/helpers.php';

$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true) ?? [];

function simRespond(array $data): void
{
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/* ── Robust JSON decode with multi-stage sanitization ── */
function robustJsonDecode(string $text): ?array {
    // Strip markdown code fences
    $text = preg_replace('/^\s*`+\w*\s*/i', '', $text);
    $text = preg_replace('/\s*`+\s*$/', '', $text);
    $text = trim($text);

    // Stage 1: Replace control chars inside JSON string values
    $preSanitized = preg_replace_callback('/"(?:[^"\\\\]|\\\\.)*"/s', function ($m) {
        return str_replace(["\n", "\r", "\t"], [' ', '', ' '], $m[0]);
    }, $text);
    $result = json_decode($preSanitized, true);
    if (json_last_error() === JSON_ERROR_NONE) return $result;

    // Stage 2: Try raw
    $result = json_decode($text, true);
    if (json_last_error() === JSON_ERROR_NONE) return $result;

    // Stage 3: Char-by-char sanitization
    $cleaned = '';
    $inStr = false;
    $esc = false;
    for ($ci = 0, $clen = strlen($text); $ci < $clen; $ci++) {
        $ch = $text[$ci];
        if ($esc) { $cleaned .= $ch; $esc = false; continue; }
        if ($ch === '\\' && $inStr) { $cleaned .= $ch; $esc = true; continue; }
        if ($ch === '"') { $inStr = !$inStr; $cleaned .= $ch; continue; }
        if ($inStr && ord($ch) < 0x20) { $cleaned .= ' '; continue; }
        $cleaned .= $ch;
    }
    $result = json_decode($cleaned, true);
    if (json_last_error() === JSON_ERROR_NONE) return $result;

    // Stage 4: Strip all non-printable
    $text2 = preg_replace('/[\x00-\x1F\x7F]/u', ' ', $text);
    $result = json_decode($text2, true);
    if (json_last_error() === JSON_ERROR_NONE) return $result;

    // Stage 5: Strip non-ASCII entirely
    $text3 = preg_replace('/[^\x20-\x7E]/u', '', $text);
    $result = json_decode($text3, true);
    if (json_last_error() === JSON_ERROR_NONE) return $result;

    return null; // all stages failed
}

/* ── Level-based XP diminishing returns ── */
function applyXpDiminishing(int $xpGained, int $level): int {
    if ($level <= 3) return $xpGained;
    if ($level <= 6) return (int) floor($xpGained * 0.75);
    if ($level <= 10) return (int) floor($xpGained * 0.50);
    return (int) floor($xpGained * 0.25); // 11+
}

/* ═══════════════════════════════════════════════════════════
   SERVER-SIDE ABILITY SCORE GENERATION
   Rolls 4d6-drop-lowest for each stat + applies racial modifiers.
   This saves ~30-40% tokens per character by removing stats from AI.
   ═══════════════════════════════════════════════════════════ */
function roll4d6DropLowest(): int
{
    $dice = [mt_rand(1, 6), mt_rand(1, 6), mt_rand(1, 6), mt_rand(1, 6)];
    rsort($dice);
    return $dice[0] + $dice[1] + $dice[2]; // drop lowest
}

function rollAbilityScores(string $race = 'Human', int $userId = 0): array
{
    // Roll raw scores
    $scores = [
        'str' => roll4d6DropLowest(),
        'dex' => roll4d6DropLowest(),
        'con' => roll4d6DropLowest(),
        'int_' => roll4d6DropLowest(),
        'wis' => roll4d6DropLowest(),
        'cha' => roll4d6DropLowest(),
    ];
    // Apply racial modifiers (D&D 3.5e PHB)
    $racialMods = [
        'Dwarf' => ['con' => 2, 'cha' => -2],
        'Elf' => ['dex' => 2, 'con' => -2],
        'Gnome' => ['con' => 2, 'str' => -2],
        'Halfling' => ['dex' => 2, 'str' => -2],
        'Half-Orc' => ['str' => 2, 'int_' => -2, 'cha' => -2],
        'Human' => [],
        'Half-Elf' => [],
    ];
    $mods = $racialMods[$race] ?? null;

    // If race not in SRD table, look up custom race from user's SQLite DB
    if ($mods === null && $userId > 0) {
        try {
            require_once __DIR__ . '/user_db.php';
            $customRace = userQuery($userId, "SELECT ability_mods FROM custom_races WHERE name = ? LIMIT 1", [$race]);
            if (!empty($customRace) && !empty($customRace[0]['ability_mods'])) {
                $mods = [];
                // Parse "Str +2, Dex -2" format
                foreach (explode(',', $customRace[0]['ability_mods']) as $part) {
                    $part = trim($part);
                    if (preg_match('/^(Str|Dex|Con|Int|Wis|Cha)\s*([+-]\d+)$/i', $part, $m)) {
                        $key = strtolower($m[1]) === 'int' ? 'int_' : strtolower($m[1]);
                        $mods[$key] = (int) $m[2];
                    }
                }
            } else {
                $mods = []; // Custom race with no mods
            }
        } catch (Exception $e) {
            $mods = [];
        }
    }
    if ($mods === null) $mods = [];

    foreach ($mods as $stat => $mod) {
        $scores[$stat] = max(3, $scores[$stat] + $mod);
    }
    return $scores;
}

try {
    requireAuth();
    $userId = (int) $_SESSION['user_id'];
    $uid = $userId;

    // Handle two-phase intake actions (defined in separate file)
    if ($action === 'intake_roster' || $action === 'intake_flesh' || $action === 'intake_creature' || $action === 'intake_custom') {
        require __DIR__ . '/intake_actions.php';
        exit;
    }
    
    // Handle AI Scribe actions
    if ($action === 'scribe_generate' || $action === 'scribe_save' || $action === 'scribe_get_history') {
        require __DIR__ . '/scribe_actions.php';
        exit;
    }

    switch ($action) {

        /* -- DEBUG: LLM connectivity test -- */
        case 'debug_llm':
            // Check OpenRouter API key
            $apiKey = '';
            $keySource = 'none';
            try {
                $apiKey = resolveApiKey('OPENROUTER_API_KEY', $userId);
                $keySource = 'resolved successfully';
            } catch (Exception $e) {
                $keySource = 'NOT FOUND';
            }

            $model = defined('OPENROUTER_MODEL') ? OPENROUTER_MODEL : '(not set)';
            $result = [
                'api_key_source' => $keySource,
                'api_key_set' => !empty($apiKey),
                'api_key_preview' => $apiKey ? substr($apiKey, 0, 8) . '...' . substr($apiKey, -4) : '(empty)',
                'model' => $model,
                'php_version' => PHP_VERSION,
            ];

            // Test OpenRouter API with a minimal request
            if ($apiKey) {
                $ch = curl_init('https://openrouter.ai/api/v1/models');
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_TIMEOUT => 10,
                    CURLOPT_HTTPHEADER => array_merge(
                        ['Authorization: Bearer ' . $apiKey],
                        openRouterAppHeaders()
                    ),
                ]);
                $resp = curl_exec($ch);
                $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $curlErr = curl_error($ch);
                curl_close($ch);

                $result['openrouter_http_code'] = $code;
                $result['openrouter_reachable'] = ($code === 200);
                $result['curl_error'] = $curlErr ?: null;
                if ($code === 200 && $resp) {
                    $data = json_decode($resp, true);
                    $totalModels = count($data['data'] ?? []);
                    $result['total_models'] = $totalModels;
                } elseif ($resp) {
                    $result['error_response'] = substr($resp, 0, 300);
                }
            }

            simRespond($result);
            break;

        /* ═══════════════════════════════════════════════════════════
           PLAN SIMULATION — Lightweight AI roadmap for multi-month sim
           ═══════════════════════════════════════════════════════════ */
        case 'plan_simulation':
            require __DIR__ . '/sim_plan.php';
            break;
        case 'run_simulation':
            require __DIR__ . '/sim_run.php';
            break;
        case 'apply_simulation':
            require __DIR__ . '/sim_apply.php';
            break;
        case 'simulate_chunk':
            $tId = (int) ($input['town_id'] ?? 0);
            $monthNum = (int) ($input['month_num'] ?? 1);   // current month (1-based)
            $totalMonths = max(1, min(24, (int) ($input['total_months'] ?? 1)));
            $category = trim($input['category'] ?? 'story');
            $rules = trim($input['rules'] ?? '');
            $instructions = trim($input['instructions'] ?? '');
            $priorContext = trim($input['prior_context'] ?? '');
            if (!$tId)
                throw new Exception('Missing town_id');
            if (!in_array($category, ['story', 'population', 'character_build', 'social', 'stats']))
                throw new Exception("Unknown category: $category");

            // API key
            $featureKey = ($category === 'story') ? 'OPENROUTER_KEY_SIM_STORY' : 'OPENROUTER_KEY_SIM_STRUCTURED';
            $apiKey = resolveApiKey($featureKey, $userId);

            // Town & user settings
            $townRow = query('SELECT id, name, campaign_id FROM towns WHERE id = ? AND user_id = ?', [$tId, $userId], $uid);
            if (empty($townRow))
                throw new Exception('Town not found.');
            $tName = $townRow[0]['name'];
            $townCampIdC = $townRow[0]['campaign_id'] ?? null;

            $metaRows = query('SELECT `key`, value FROM town_meta WHERE town_id = ?', [$tId], $uid);
            $townMeta = [];
            foreach ($metaRows as $m)
                $townMeta[$m['key']] = $m['value'];
            $demographics = trim($townMeta['demographics'] ?? '');
            $biome = trim($townMeta['biome'] ?? '');

            // Edition from campaign, sim settings from campaign_rules
            $dndEdition = '3.5e';
            if ($townCampIdC) {
                $campRowC = query('SELECT dnd_edition FROM campaigns WHERE id = ?', [$townCampIdC], 0);
                if ($campRowC) $dndEdition = $campRowC[0]['dnd_edition'] ?? '3.5e';
            }
            if ($townCampIdC) {
                $crC = query('SELECT relationship_speed, birth_rate, death_threshold, child_growth, conflict_frequency FROM campaign_rules WHERE user_id = ? AND campaign_id = ?', [$userId, $townCampIdC], 0);
            } else {
                $crC = query('SELECT relationship_speed, birth_rate, death_threshold, child_growth, conflict_frequency FROM campaign_rules WHERE user_id = ? AND campaign_id IS NULL', [$userId], 0);
            }
            $crc = $crC ? $crC[0] : [];
            $xpSpeed = 'normal';
            $relSpeed = $crc['relationship_speed'] ?? 'normal';
            $birthRate = $crc['birth_rate'] ?? 'normal';
            $deathThreshold = $crc['death_threshold'] ?? '50';
            $conflictFreq = $crc['conflict_frequency'] ?? 'occasional';
            $xpCaps = ['very slow' => 25, 'slow' => 50, 'normal' => 100, 'fast' => 200, 'very fast' => 500];
            $xpMax = $xpCaps[$xpSpeed] ?? 50;
            $popText = $deathThreshold === 'unlimited' ? 'No population cap.' : "Pop over {$deathThreshold} increases death rate.";

            // Build roster
            $chars = query('SELECT * FROM characters WHERE town_id = ? ORDER BY name', [$tId], $uid);
            $roster = [];
            foreach ($chars as $c) {
                $e = "{$c['name']} — {$c['race']} {$c['class']}, Age {$c['age']}, {$c['gender']}, Status:{$c['status']}";
                if ($c['role'])
                    $e .= ", Role:{$c['role']}";
                $e .= ", XP:{$c['xp']}";
                $roster[] = $e;
            }
            $rosterText = implode("\n", $roster);
            $charCount = count($chars);

            $biomeBlock = $biome ? " | Biome: {$biome}" : '';
            $ctx = $priorContext ? "Prior events:\n{$priorContext}\n\n" : '';

            // Load existing buildings
            $existingBuildings = query('SELECT name, status, build_progress, build_time, description FROM town_buildings WHERE town_id = ?', [$tId], $uid);
            $buildingLines = [];
            foreach ($existingBuildings as $b) {
                $line = "- {$b['name']} [{$b['status']}]";
                if ($b['status'] === 'under_construction') {
                    $line .= " (progress: {$b['build_progress']}/{$b['build_time']} months)";
                }
                if ($b['description'])
                    $line .= " — {$b['description']}";
                $buildingLines[] = $line;
            }
            $buildingText = count($buildingLines) > 0
                ? "EXISTING BUILDINGS:\n" . implode("\n", $buildingLines)
                : "EXISTING BUILDINGS: NONE — this is empty land with no structures.";

            // Settlement type context for world simulate
            $stType = trim($townMeta['settlement_type'] ?? '');
            $stLabels = [
                'village' => 'Village', 'walled_town' => 'Walled Town', 'fortress' => 'Fortress',
                'cave_system' => 'Cave System', 'underground_warren' => 'Underground Warren',
                'ruins' => 'Ruins', 'camp' => 'Camp', 'nomadic' => 'Nomadic Caravan',
                'treetop' => 'Treetop Settlement', 'floating' => 'Floating/Ship',
                'burrow' => 'Burrow/Den', 'nest' => 'Nest/Hive', 'dungeon' => 'Dungeon',
                'temple' => 'Temple Complex', 'mine' => 'Mine', 'tower' => 'Tower',
                'outpost' => 'Outpost', 'port' => 'Port', 'planar' => 'Planar Site',
            ];
            $stLabel = $stLabels[$stType] ?? '';
            $stBlock = $stLabel ? " | Type: {$stLabel}" : '';

            $base = "D&D {$dndEdition} | Town: \"{$tName}\"{$biomeBlock}{$stBlock} | Month {$monthNum} of {$totalMonths}\n{$ctx}{$buildingText}\n\nCURRENT ROSTER (CRITICAL: Do NOT reuse any names from this roster. Use highly unique D&D names):\n{$rosterText}";

            // Category-specific prompt
            switch ($category) {
                case 'story':
                    $biomeRule = $biome ? "\nBIOME CONSTRAINT: This town is in a {$biome} environment. ALL buildings, resources, and infrastructure MUST be appropriate for this biome. Do NOT suggest structures or resources that would not exist in this terrain (e.g. no mines in sandy desert, no fishing docks inland, no ice-houses in tropics)." : '';
                    $prompt = "{$base}\nRules: {$rules}\nInstructions: {$instructions}{$biomeRule}

BUILDING RULES:
- The town ONLY has the buildings listed above. Do NOT assume buildings exist that are not listed.
- You may propose starting NEW construction (action: \"start\"), advancing IN-PROGRESS buildings (action: \"progress\"), completing FINISHED buildings (action: \"complete\"), or damaging/destroying existing ones.
- build_time is the total months needed to construct. Small structures (shed, well, fence): 1 month. Medium (house, shop, smithy): 2-3 months. Large (temple, barracks, mill): 4-6 months.
- Only propose 1-3 building changes per month maximum. Construction requires workers and resources.
- When starting new construction, provide a brief description of the building.

Describe the STORY EVENTS this month (conflict={$conflictFreq}).
Respond ONLY with valid JSON:
{\"summary\":\"string\",\"events\":[\"string\"],\"history_entry\":{\"heading\":\"string\",\"content\":\"string\"},\"building_changes\":[{\"action\":\"start|progress|complete|damage|destroy\",\"name\":\"Building Name\",\"build_time\":3,\"description\":\"brief description\"}]}";
                    break;
                case 'population':
                    $demoText = $demographics ? " Town Target Demographics (strict adherence expected): {$demographics}." : "";
                    $numArrivals = (int) ($input['num_arrivals'] ?? 0);
                    // Check for closed borders
                    $genRulesPop = json_decode($townMeta['gen_rules'] ?? '{}', true) ?: [];
                    $closedBordersPop = !empty($genRulesPop['closed_borders']);
                    if ($numArrivals > 0) {
                        $arrivalInstruction = "IMPORTANT: EXACTLY {$numArrivals} new people are arriving in this town. Your 'arrivals' array MUST contain EXACTLY {$numArrivals} entries. Use highly unique, diverse, and rare authentic D&D fantasy names (e.g. Kaelen Vane, Vexia Nor). NEVER use real-world names. Do NOT repeat names from the Roster. Do NOT generate any deaths.{$demoText} All new characters MUST start at exactly Level 1 (0 XP) unless the additional instructions say otherwise.";
                    } elseif ($closedBordersPop) {
                        $arrivalInstruction = "CLOSED BORDERS: This town has CLOSED BORDERS. NO new arrivals are allowed. The arrivals array MUST be EMPTY unless a BIRTH occurs from an existing romantic couple. Birth rate: {$birthRate}. BIRTHS: Only if a romantic couple has existed for 9+ months AND race gestation is met. Death rule: {$popText}. Keep deaths rare unless instructed otherwise.{$demoText}";
                    } else {
                        $arrivalInstruction = "Birth rate: {$birthRate}. Death rule: {$popText}. Who naturally arrives, is born, or dies this month? BIRTHS: Only if a romantic couple has existed for 9+ months AND race gestation is met (Human 9mo, Elf 12mo, Dwarf 12mo). Do NOT invent births for couples that just formed. One-night-stand children are uncommon. Use highly unique D&D fantasy names. Do NOT repeat names from the Roster. Keep deaths rare unless instructed otherwise.{$demoText} All new characters MUST start at exactly Level 1 (0 XP) unless the additional instructions say otherwise.";
                    }
                    $prompt = "{$base}\n{$arrivalInstruction}\nInstructions: {$instructions}\n\nFull stats will be generated per-character separately. Respond with ONLY valid JSON, no extra text:\n{\"arrivals\":[{\"name\":\"[D&D NAME]\",\"race\":\"\",\"class\":\"\",\"age\":0,\"gender\":\"\",\"reason_for_arrival\":\"\"}],\"deaths\":[{\"name\":\"\",\"cause\":\"\"}]}";
                    break;
                case 'character_build':
                    // Build ONE full character — extra params come from input
                    $charName = trim($input['char_name'] ?? 'Unknown');
                    $charRace = trim($input['char_race'] ?? 'Human');
                    $charClass = trim($input['char_class'] ?? 'Commoner');
                    $charAge = (int) ($input['char_age'] ?? 20);
                    $charGender = trim($input['char_gender'] ?? 'Unknown');
                    $charContext = trim($input['char_context'] ?? '');
                    $prompt = "D&D {$dndEdition} character sheet request.\nTown: \"{$tName}\" | Name: {$charName} | Race: {$charRace} | Class: {$charClass} | Age: {$charAge} | Gender: {$charGender}\nContext: {$charContext}\nRules: {$rules}\n\nGenerate full D&D stats for a LEVEL 1 character (0 XP) unless instructed otherwise. The 'name' field MUST be exactly \"{$charName}\" \u2014 do not change it.\nRespond with ONLY valid JSON, no other text:\n{\"name\":\"{$charName}\",\"race\":\"\",\"class\":\"\",\"age\":0,\"gender\":\"\",\"status\":\"Alive\",\"hp\":0,\"ac\":0,\"xp\":0,\"cr\":\"\",\"alignment\":\"\",\"str\":0,\"dex\":0,\"con\":0,\"int_\":0,\"wis\":0,\"cha\":0,\"skills_feats\":\"\",\"gear\":\"\",\"history\":\"\",\"role\":\"\"}";
                    break;
                case 'social':
                    // Fetch existing social data to include in prompt
                    $charIds = array_column($chars, 'id');
                    $existingRels = [];
                    if (!empty($charIds)) {
                        $ph = implode(',', array_fill(0, count($charIds), '?'));
                        $existingRels = query(
                            "SELECT cr.*, c1.name as char1_name, c2.name as char2_name
                             FROM character_relationships cr
                             JOIN characters c1 ON c1.id = cr.char1_id
                             JOIN characters c2 ON c2.id = cr.char2_id
                             WHERE cr.char1_id IN ($ph) OR cr.char2_id IN ($ph)",
                            array_merge($charIds, $charIds),
                            $uid
                        );
                    }
                    $existingFactions = query('SELECT name, faction_type, description, influence, public_goal, status FROM factions WHERE town_id = ?', [$tId], $uid);
                    $activeIncidents = query("SELECT incident_type, status, summary FROM town_incidents WHERE town_id = ? AND status != 'resolved' ORDER BY created_at DESC LIMIT 5", [$tId], $uid);

                    $relText = '';
                    if (!empty($existingRels)) {
                        $relText = "\nExisting Relationships:\n";
                        foreach ($existingRels as $r) {
                            $relText .= "  {$r['char1_name']} ↔ {$r['char2_name']}: {$r['rel_type']} (disposition: {$r['disposition']}/10)\n";
                        }
                    }
                    $facText = '';
                    if (!empty($existingFactions)) {
                        $facText = "\nExisting Factions:\n";
                        foreach ($existingFactions as $f) {
                            $facText .= "  {$f['name']} ({$f['faction_type']}, influence:{$f['influence']}/10): {$f['description']}\n";
                        }
                    }
                    $incText = '';
                    if (!empty($activeIncidents)) {
                        $incText = "\nOngoing Incidents:\n";
                        foreach ($activeIncidents as $inc) {
                            $incText .= "  [{$inc['incident_type']}] {$inc['summary']} — Status: {$inc['status']}\n";
                        }
                    }

                    $prompt = "{$base}\nRelationship speed: {$relSpeed}.\nInstructions: {$instructions}\n{$relText}{$facText}{$incText}

What SOCIAL CHANGES occurred this month? Consider:
- New or changing NPC-NPC relationships (friendships, rivalries, romances)
- NPC memories formed from significant events
- Faction formation or changes (new groups, shifting alliances, power struggles)
- Crimes or mysteries (theft, sabotage, disappearances)
- PC reputation effects from recent events

Respond ONLY with valid JSON:
{\"new_relationships\":[{\"character1\":\"\",\"character2\":\"\",\"type\":\"friend|rival|enemy|ally|mentor|student|romantic\",\"disposition\":0,\"reason\":\"\"}],\"role_changes\":[{\"name\":\"\",\"new_role\":\"\"}],\"memories\":[{\"character_name\":\"\",\"content\":\"\",\"sentiment\":0,\"importance\":5,\"related_character\":\"\"}],\"faction_changes\":[{\"action\":\"create|add_member|remove_member\",\"faction_name\":\"\",\"character_name\":\"\",\"role\":\"\",\"description\":\"\"}],\"incidents\":[{\"type\":\"theft|murder|sabotage|mystery|conspiracy\",\"summary\":\"\",\"severity\":3,\"perpetrator\":\"\",\"victim\":\"\",\"witnesses\":[]}]}";
                    break;
                case 'stats':
                    $prompt = "{$base}\nXP budget: {$xpMax} per character this month.\nInstructions: {$instructions}\n\nAssign XP gains and any stat changes earned this month.\nRespond ONLY with valid JSON:\n{\"xp_gains\":[{\"name\":\"\",\"amount\":0,\"reason\":\"\"}],\"stat_changes\":[{\"name\":\"\",\"field\":\"\",\"new_value\":\"\"}]}";
                    break;
            }

            // LLM call
            $chunkText = null;
            if (defined('LLAMA_HOST') && LLAMA_HOST && isLocalLLMAvailable()) {
                try {
                    $chunkText = callLocalLLM('[INST] ' . $prompt . ' [/INST]', 512);
                } catch (Exception $le) {
                    $chunkText = null;
                }
            }
            if ($chunkText === null) {
                $openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
                $payload = json_encode([
                    'model' => ($category === 'story' && defined('OPENROUTER_MODEL_SMART')) ? OPENROUTER_MODEL_SMART : (defined('OPENROUTER_MODEL_CHEAP') ? OPENROUTER_MODEL_CHEAP : 'google/gemini-2.5-flash'),
                    'messages' => [['role' => 'user', 'content' => $prompt]],
                    'temperature' => 0.8,
                    'max_tokens' => 2048
                ]);
                $ch = curl_init($openRouterUrl);
                curl_setopt_array($ch, [
                    CURLOPT_POST => true,
                    CURLOPT_POSTFIELDS => $payload,
                    CURLOPT_HTTPHEADER => array_merge([
                        "Authorization: Bearer {$apiKey}",
                        "Content-Type: application/json"
                    ], openRouterAppHeaders()),
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_TIMEOUT => 90,
                    CURLOPT_SSL_VERIFYPEER => true
                ]);
                $resp = curl_exec($ch);
                $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                resetDB();
                if ($code !== 200)
                    throw new Exception("OpenRouter error for chunk {$category}: " . substr($resp, 0, 100));
                $gr = json_decode($resp, true);
                // Track token usage (hidden)
                if (!empty($gr['usage'])) {
                    trackTokenUsage($userId, $gr['usage']);
                }
                $chunkText = $gr['choices'][0]['message']['content'] ?? '';
            }
            resetDB();
            $chunkData = robustJsonDecode($chunkText);
            simRespond([
                'ok' => true,
                'town_id' => $tId,
                'month' => $monthNum,
                'category' => $category,
                'data' => $chunkData ?? ['error' => 'parse_failed', 'raw' => substr($chunkText, 0, 200)],
            ]);
            break;


        case 'simulate_single_town':
            require __DIR__ . '/sim_single_town.php';
            break;
        case 'simulate_world':
            require __DIR__ . '/sim_world.php';
            break;
        case 'generate_portrait_prompt':
            $characterDesc = trim($input['character'] ?? '');
            if (!$characterDesc)
                throw new Exception('No character description provided.');

            // API key
            $apiKey = resolveApiKey('OPENROUTER_KEY_PORTRAIT', $userId);

            $prompt = <<<PROMPT
You are an expert AI art prompt engineer specializing in D&D fantasy character portraits.

Given the following D&D character details, generate an optimized image prompt for AI art generators (Midjourney, DALL-E, Stable Diffusion).

CHARACTER DETAILS:
{$characterDesc}

REQUIREMENTS:
- Create a highly detailed, vivid prompt that would produce a stunning fantasy portrait
- Include: physical appearance (build based on stats, facial features, skin tone for race), clothing and armor (based on gear), pose, expression, background appropriate to their role
- Use artistic style keywords: digital painting, D&D fantasy art, dramatic lighting, detailed face, cinematic composition
- Keep the prompt under 200 words
- Do NOT include any explanation — output ONLY the image prompt text itself, nothing else
PROMPT;

            $promptText = null;
            // Try local LLM first
            if (defined('LLAMA_HOST') && LLAMA_HOST && isLocalLLMAvailable()) {
                try {
                    $promptText = callLocalLLM('[INST] ' . $prompt . ' [/INST]', 512);
                } catch (Exception $le) {
                    $promptText = null;
                }
            }

            // Fall back to OpenRouter
            if ($promptText === null) {
                $openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
                $model = defined('OPENROUTER_MODEL_CHEAP') ? OPENROUTER_MODEL_CHEAP : (defined('OPENROUTER_MODEL') ? OPENROUTER_MODEL : 'google/gemini-2.5-flash');
                $payload = json_encode([
                    'model' => $model,
                    'messages' => [['role' => 'user', 'content' => $prompt]],
                    'temperature' => 0.9,
                    'max_tokens' => 512
                ]);
                $ch = curl_init($openRouterUrl);
                curl_setopt_array($ch, [
                    CURLOPT_POST => true,
                    CURLOPT_POSTFIELDS => $payload,
                    CURLOPT_HTTPHEADER => array_merge([
                        "Authorization: Bearer {$apiKey}",
                        "Content-Type: application/json"
                    ], openRouterAppHeaders()),
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_TIMEOUT => 30,
                    CURLOPT_SSL_VERIFYPEER => true
                ]);
                $resp = curl_exec($ch);
                $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                resetDB();

                if ($code !== 200) {
                    $err = json_decode($resp, true);
                    $msg = $err['error']['message'] ?? substr($resp, 0, 200);
                    throw new Exception("AI prompt generation failed: $msg");
                }
                $orResp = json_decode($resp, true);
                // Track token usage (hidden)
                if (!empty($orResp['usage'])) {
                    trackTokenUsage($userId, $orResp['usage']);
                }
                $promptText = trim($orResp['choices'][0]['message']['content'] ?? '');
            }

            if (!$promptText) {
                throw new Exception('LLM returned an empty prompt.');
            }

            simRespond(['ok' => true, 'prompt' => $promptText]);
            break;

        /* ── LEVEL UP ─────────────────────────────────────────────── */
        case 'level_up':
            require __DIR__ . '/sim_level_up.php';
            break;
        case 'quick_level_up':
            $townId = (int) ($input['town_id'] ?? 0);
            $charId = (int) ($input['character_id'] ?? 0);

            verifyTownOwnership($userId, $townId, $uid);

            if (!$charId)
                throw new Exception('No character ID provided.');

            // Load character before level up
            $charsBefore = query('SELECT * FROM characters WHERE id = ? AND town_id = ?', [$charId, $townId], $uid);
            if (!$charsBefore)
                throw new Exception('Character not found.');
            $charBefore = $charsBefore[0];

            // Get old level
            $oldClassStr = $charBefore['class'] ?? 'Commoner 1';
            preg_match_all('/(\d+)/', $oldClassStr, $lvlMatches);
            $oldTotalLevel = 0;
            foreach ($lvlMatches[1] as $lv)
                $oldTotalLevel += (int) $lv;
            if ($oldTotalLevel < 1)
                $oldTotalLevel = (int) ($charBefore['level'] ?? 1);

            // Resolve edition
            $userSettings = query('SELECT dnd_edition FROM users WHERE id = ?', [$userId], 0);
            $dndEdition = $userSettings ? ($userSettings[0]['dnd_edition'] ?? '3.5e') : '3.5e';

            // Run deterministic level up
            $success = autoLevelUp($charBefore, $dndEdition, $uid);
            if (!$success)
                throw new Exception('Auto level-up failed.');

            // Read back
            $charsAfter = query('SELECT * FROM characters WHERE id = ? AND town_id = ?', [$charId, $townId], $uid);
            $charAfter = $charsAfter ? $charsAfter[0] : [];

            // Get level history for summary
            $newTotalLevel = $oldTotalLevel + 1;
            $histRow = query('SELECT * FROM character_level_history WHERE character_id = ? AND level_number = ?', [$charId, $newTotalLevel], $uid);
            $histEntry = $histRow ? $histRow[0] : [];

            // Build summary
            $summary = [];
            if (($charBefore['hp'] ?? '') !== ($charAfter['hp'] ?? ''))
                $summary[] = "HP: {$charBefore['hp']} → {$charAfter['hp']}";
            if (($charBefore['saves'] ?? '') !== ($charAfter['saves'] ?? ''))
                $summary[] = "Saves updated";
            if (($charBefore['feats'] ?? '') !== ($charAfter['feats'] ?? ''))
                $summary[] = "New feats: " . trim(str_replace($charBefore['feats'] ?? '', '', $charAfter['feats'] ?? ''), ', ');
            if (!empty($histEntry['ability_increase']))
                $summary[] = strtoupper($histEntry['ability_increase']) . " +1";
            if (($charBefore['cr'] ?? '') !== ($charAfter['cr'] ?? ''))
                $summary[] = "CR: {$charAfter['cr']}";

            // Set XP to minimum for the new level (D&D 3.5e: level*(level-1)*500)
            $minXp = $newTotalLevel * ($newTotalLevel - 1) * 500;
            query('UPDATE characters SET xp = ?, level = ? WHERE id = ? AND town_id = ?', [$minXp, $newTotalLevel, $charId, $townId], $uid);
            // Re-read after XP update
            $charsAfter = query('SELECT * FROM characters WHERE id = ? AND town_id = ?', [$charId, $townId], $uid);
            $charAfter = $charsAfter ? $charsAfter[0] : $charAfter;

            simRespond([
                'ok' => true,
                'character' => $charAfter,
                'old_character' => $charBefore,
                'old_level' => $oldTotalLevel,
                'new_level' => $newTotalLevel,
                'summary' => implode("\n", $summary) ?: 'Level up complete.',
                'history_entry' => $histEntry,
            ]);
            break;

        /* ═══════════════════════════════════════════════════════
           AUTO-ASSIGN SPELLS (for existing characters)
           ═══════════════════════════════════════════════════════ */
        case 'auto_assign_spells':
            $charId = (int) ($input['character_id'] ?? 0);
            if (!$charId)
                throw new Exception('Character ID required.');

            $char = query('SELECT * FROM characters WHERE id = ?', [$charId], $uid);
            if (!$char)
                throw new Exception('Character not found.');
            $char = $char[0];

            // Parse class — class column may be just "Adept" or "Adept 1"
            preg_match('/^([A-Za-z]+)/', $char['class'] ?? '', $clsMatch);
            $className = $clsMatch ? $clsMatch[1] : '';
            // Use dedicated level column first, fall back to parsing from class string
            $level = (int) ($char['level'] ?? 0);
            if ($level <= 0) {
                preg_match('/(\d+)/', $char['class'] ?? '', $lvlMatch);
                $level = $lvlMatch ? (int) $lvlMatch[1] : 1;
            }
            $role = $char['role'] ?? '';

            $dndEdition = $input['edition'] ?? '3.5e';
            autoSelectSpellsForCaster($charId, $className, $level, $role, $dndEdition, $uid);

            // Count what was assigned
            $knownCount = query('SELECT COUNT(*) as cnt FROM character_spells_known WHERE character_id = ?', [$charId], $uid);
            $prepCount = query('SELECT COUNT(*) as cnt FROM character_spells_prepared WHERE character_id = ?', [$charId], $uid);
            $kCnt = $knownCount[0]['cnt'] ?? 0;
            $pCnt = $prepCount[0]['cnt'] ?? 0;

            simRespond([
                'ok' => true,
                'message' => "Assigned {$kCnt} spells known, {$pCnt} prepared for {$char['name']} ({$className} {$level}, role: {$role})",
                'spells_known' => (int) $kCnt,
                'spells_prepared' => (int) $pCnt,
            ]);
            break;

        case 'auto_assign_spells_town':
            $townId = (int) ($input['town_id'] ?? 0);
            if (!$townId)
                throw new Exception('Town ID required.');
            verifyTownOwnership($uid, $townId, $uid);

            $dndEdition = $input['edition'] ?? '3.5e';
            $casterClassNames = ['Wizard', 'Sorcerer', 'Cleric', 'Druid', 'Bard', 'Paladin', 'Ranger', 'Adept'];

            $allChars = query("SELECT * FROM characters WHERE town_id = ? AND status = 'Alive'", [$townId], $uid);
            $assigned = 0;
            $results = [];
            $debugAll = [];

            foreach ($allChars as $ch) {
                preg_match('/^([A-Za-z]+)/', $ch['class'] ?? '', $cm);
                $cn = $cm ? $cm[1] : '';
                if (!in_array($cn, $casterClassNames))
                    continue;

                $lv = (int) ($ch['level'] ?? 0);
                if ($lv <= 0) {
                    preg_match('/(\d+)/', $ch['class'] ?? '', $lm);
                    $lv = $lm ? (int) $lm[1] : 1;
                }

                // Check if already has spells
                $existing = query('SELECT COUNT(*) as cnt FROM character_spells_known WHERE character_id = ?', [(int) $ch['id']], $uid);
                $existingPrepared = query('SELECT COUNT(*) as cnt FROM character_spells_prepared WHERE character_id = ?', [(int) $ch['id']], $uid);
                $hasSpells = ((int) ($existing[0]['cnt'] ?? 0)) > 0 || ((int) ($existingPrepared[0]['cnt'] ?? 0)) > 0;

                // Only assign if no spells yet (unless force is set)
                if ($hasSpells && !($input['force'] ?? false))
                    continue;

                $dbg = autoSelectSpellsForCaster((int) $ch['id'], $cn, $lv, $ch['role'] ?? '', $dndEdition, $uid);
                $assigned++;
                $results[] = $ch['name'] . " ({$cn} {$lv})";
                $debugAll[] = $dbg;
            }

            simRespond([
                'ok' => true,
                'message' => "Assigned spells to {$assigned} casters",
                'assigned' => $assigned,
                'characters' => $results,
                'debug' => $debugAll ?? [],
            ]);
            break;

        /* ═══════════════════════════════════════════════════════
           GENERATE WEATHER — Full year weather via single AI call
           Saved to town_meta key 'weather_year'
           ═══════════════════════════════════════════════════════ */
        case 'generate_weather':
            $townId = (int) ($input['town_id'] ?? 0);
            if (!$townId) throw new Exception('Missing town_id');
            verifyTownOwnership($userId, $townId, $uid);

            // Token budget check
            $uTierRows = query('SELECT subscription_tier FROM users WHERE id = ?', [$userId], 0);
            $uTier = $uTierRows ? ($uTierRows[0]['subscription_tier'] ?? 'free') : 'free';
            if (checkTokenBudget($userId, $uTier)) {
                throw new Exception('Token budget exceeded. Usage resets on the 1st.');
            }

            // API key
            $apiKey = resolveApiKey('OPENROUTER_KEY_WEATHER', $userId);

            // Load town meta for biome
            $metaRows = query('SELECT `key`, value FROM town_meta WHERE town_id = ?', [$townId], $uid);
            $townMeta = [];
            foreach ($metaRows as $m) $townMeta[$m['key']] = $m['value'];
            $biome = trim($townMeta['biome'] ?? 'Temperate Forest');

            // Load town info
            $town = query('SELECT * FROM towns WHERE id = ?', [$townId], $uid);
            if (!$town) throw new Exception('Town not found.');
            $townName = $town[0]['name'];

            // Load calendar
            $campId = $town[0]['campaign_id'] ?? null;
            if ($campId) {
                $calRows = query('SELECT * FROM calendar WHERE user_id = ? AND campaign_id = ?', [$userId, $campId], $uid);
            } else {
                $calRows = query('SELECT * FROM calendar WHERE user_id = ? AND campaign_id IS NULL', [$userId], $uid);
            }
            $calData = $calRows ? $calRows[0] : null;

            $curYear = 1490;
            $eraName = 'DR';
            $mpy = 12;
            $daysPerMonthArr = array_fill(0, 12, 30);
            $monthNamesList = ['Hammer', 'Alturiak', 'Ches', 'Tarsakh', 'Mirtul', 'Kythorn', 'Flamerule', 'Eleasis', 'Eleint', 'Marpenoth', 'Uktar', 'Nightal'];
            if ($calData) {
                $curYear = (int) ($calData['current_year'] ?? 1490);
                $eraName = trim($calData['era_name'] ?? 'DR');
                $mpy = (int) ($calData['months_per_year'] ?? 12);
                // days_per_month: JSON array or legacy single int
                $dpmRaw = $calData['days_per_month'] ?? '30';
                $dpmDecoded = json_decode($dpmRaw, true);
                if (is_array($dpmDecoded)) {
                    $daysPerMonthArr = $dpmDecoded;
                } else {
                    $daysPerMonthArr = array_fill(0, $mpy, (int)($dpmRaw ?: 30));
                }
                $decoded = json_decode($calData['month_names'] ?? '[]', true);
                if (!empty($decoded)) $monthNamesList = $decoded;
            }

            // Build month names JSON for the prompt
            $monthNamesJson = [];
            $monthInfoLines = [];
            for ($mi = 0; $mi < $mpy; $mi++) {
                $mName = $monthNamesList[$mi] ?? "Month " . ($mi + 1);
                $mDays = $daysPerMonthArr[$mi] ?? 30;
                $monthNamesJson[] = $mName;
                $monthInfoLines[] = ($mi + 1) . ". {$mName} ({$mDays} days)";
            }
            $monthInfoStr = implode("\n", $monthInfoLines);

            $weatherPrompt = <<<WPROMPT
You are a D&D weather and climate expert. Generate a FULL YEAR of weather patterns for the settlement "{$townName}".

## ENVIRONMENT:
- Biome/Terrain: {$biome}
- Calendar Year: {$curYear} {$eraName}
- Calendar: {$mpy} months per year (each month may have different day counts)
- Months:
{$monthInfoStr}

## RULES:
- Weather MUST be consistent with the biome. A desert gets heat and sandstorms, not snow. An arctic tundra gets blizzards, not heatwaves.
- Seasons should progress naturally through the year (winter → spring → summer → fall in temperate; wet/dry seasons in tropical, etc.)
- Each month should feel distinct but connected to adjacent months.
- Include 1-3 notable weather events per month (storms, unusual weather, etc.)
- Temperature should be in both Fahrenheit and Celsius.
- Make the weather feel LIVED IN — these are conditions that affect daily life, farming, trade, and combat.

## OUTPUT (VALID JSON ONLY, no markdown, no code fences):
{
  "year": {$curYear},
  "biome": "{$biome}",
  "months": [
    {
      "month": 1,
      "name": "Month Name",
      "avg_temp": "45°F / 7°C",
      "weather_pattern": "Cold rain with occasional sleet",
      "precipitation": "moderate",
      "wind": "gusty",
      "description": "Narrative description of the month's weather and how it affects the settlement...",
      "notable_events": ["Heavy frost (days 1-5)", "Thunderstorm (day 12)", "Clear spell (days 20-25)"]
    }
  ]
}

Generate EXACTLY {$mpy} months using the month names listed above, in order. Every month entry MUST have all fields shown.
WPROMPT;

            // Make AI call
            $openRouterUrl = "https://openrouter.ai/api/v1/chat/completions";
            $model = defined("OPENROUTER_MODEL_CHEAP") ? OPENROUTER_MODEL_CHEAP : (defined("OPENROUTER_MODEL") ? OPENROUTER_MODEL : "google/gemini-2.5-flash");
            $payload = json_encode([
                "model" => $model,
                "messages" => [["role" => "user", "content" => $weatherPrompt]],
                "temperature" => 0.8,
                "max_tokens" => 8192,
            ]);
            $ch = curl_init($openRouterUrl);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $payload,
                CURLOPT_HTTPHEADER => array_merge([
                    "Authorization: Bearer {$apiKey}",
                    "Content-Type: application/json"
                ], openRouterAppHeaders()),
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 60,
                CURLOPT_SSL_VERIFYPEER => true
            ]);
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            resetDB();

            if ($httpCode !== 200 || !$response) {
                throw new Exception("AI weather generation failed (HTTP {$httpCode})");
            }

            $data = json_decode($response, true);
            if (!empty($data['usage'])) {
                trackTokenUsage($userId, $data['usage']);
            }
            $respText = $data["choices"][0]["message"]["content"] ?? "";
            $weatherData = robustJsonDecode($respText);

            if (!$weatherData || empty($weatherData['months'])) {
                throw new Exception('AI returned invalid weather data. Try again.');
            }

            // Save to town_meta
            $weatherJson = json_encode($weatherData, JSON_UNESCAPED_UNICODE);
            // Upsert
            $existing = query('SELECT id FROM town_meta WHERE town_id = ? AND `key` = ?', [$townId, 'weather_year'], $uid);
            if ($existing) {
                query('UPDATE town_meta SET value = ? WHERE town_id = ? AND `key` = ?', [$weatherJson, $townId, 'weather_year'], $uid);
            } else {
                query('INSERT INTO town_meta (town_id, `key`, value) VALUES (?, ?, ?)', [$townId, 'weather_year', $weatherJson], $uid);
            }

            simRespond([
                'ok' => true,
                'weather' => $weatherData,
                'months_generated' => count($weatherData['months']),
            ]);
            break;

        /* ═══════════════════════════════════════════════════════
           AI RANDOM ENCOUNTER GENERATOR
           Generates level-appropriate monsters for a random encounter
           ═══════════════════════════════════════════════════════ */
        case 'generate_random_encounter':
            $townId = (int) ($input['town_id'] ?? 0);
            $partyLevel = (int) ($input['party_level'] ?? 3);
            $partySize = (int) ($input['party_size'] ?? 4);
            $difficulty = trim($input['difficulty'] ?? 'medium');
            $environment = trim($input['environment'] ?? '');
            $notes = trim($input['notes'] ?? '');

            // Token budget check
            $uTierRows = query('SELECT subscription_tier FROM users WHERE id = ?', [$userId], 0);
            $uTier = $uTierRows ? ($uTierRows[0]['subscription_tier'] ?? 'free') : 'free';
            if (checkTokenBudget($userId, $uTier)) {
                throw new Exception('Token budget exceeded. Usage resets on the 1st.');
            }

            $apiKey = resolveApiKey('OPENROUTER_KEY_SIM_STRUCTURED', $userId);

            // Load biome from town meta if available
            if ($townId > 0) {
                $metaRows = query('SELECT `key`, value FROM town_meta WHERE town_id = ?', [$townId], $uid);
                foreach ($metaRows as $m) {
                    if ($m['key'] === 'biome' && !$environment) $environment = $m['value'];
                }
            }
            if (!$environment) $environment = 'Temperate Forest';

            // Load campaign context
            $loreContext = '';
            $campRow = $townId ? query('SELECT campaign_id FROM towns WHERE id = ? AND user_id = ?', [$townId, $userId], $uid) : [];
            $campId = $campRow ? ($campRow[0]['campaign_id'] ?? null) : null;
            if ($campId) {
                $loreRow = query('SELECT lore, house_rules FROM campaign_rules WHERE user_id = ? AND campaign_id = ?', [$userId, $campId], 0);
                if ($loreRow && !empty($loreRow[0]['lore'])) {
                    $loreContext = "\nCampaign Lore: " . substr($loreRow[0]['lore'], 0, 500);
                }
            }

            $difficultyGuide = [
                'easy' => 'CR should be 1-2 below party level. Straightforward fight.',
                'medium' => 'CR should be around party level. A fair challenge.',
                'hard' => 'CR should be 1-2 above party level. Dangerous fight.',
                'deadly' => 'CR should be 3+ above party level. Could be lethal.',
            ];
            $diffDesc = $difficultyGuide[$difficulty] ?? $difficultyGuide['medium'];

            $rePrompt = <<<REPROMPT
You are a D&D 3.5e encounter designer. Generate a random encounter for a party.

PARAMETERS:
- Party Level: {$partyLevel} (average)
- Party Size: {$partySize} members
- Difficulty: {$difficulty} — {$diffDesc}
- Environment/Biome: {$environment}
{$loreContext}
{$notes}

RULES:
- Use only SRD-legal D&D 3.5e monsters
- Include the CR for each monster
- Provide a brief encounter description/setup
- Include tactical notes for the DM
- The total encounter XP should be appropriate for the difficulty level

Respond ONLY with valid JSON, no extra text:
{
  "encounter_name": "Short descriptive name",
  "description": "2-3 sentence narrative setup for this encounter",
  "environment_details": "Specific terrain and conditions",
  "monsters": [
    {"name": "Monster Name", "cr": 2, "count": 3, "notes": "tactical note"}
  ],
  "total_xp": 0,
  "difficulty_rating": "easy|medium|hard|deadly",
  "tactics": "How the monsters fight — formation, strategy, retreat conditions",
  "treasure_hint": "Brief note about what treasure might be found"
}
REPROMPT;

            $openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
            $model = defined('OPENROUTER_MODEL_CHEAP') ? OPENROUTER_MODEL_CHEAP : 'google/gemini-2.5-flash';
            $payload = json_encode([
                'model' => $model,
                'messages' => [['role' => 'user', 'content' => $rePrompt]],
                'temperature' => 0.9,
                'max_tokens' => 2048
            ]);
            $ch = curl_init($openRouterUrl);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $payload,
                CURLOPT_HTTPHEADER => array_merge([
                    "Authorization: Bearer {$apiKey}",
                    "Content-Type: application/json"
                ], openRouterAppHeaders()),
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 60,
                CURLOPT_SSL_VERIFYPEER => true
            ]);
            $resp = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            resetDB();

            if ($httpCode !== 200 || !$resp)
                throw new Exception("AI encounter generation failed (HTTP {$httpCode})");

            $data = json_decode($resp, true);
            if (!empty($data['usage'])) trackTokenUsage($userId, $data['usage']);
            $respText = $data['choices'][0]['message']['content'] ?? '';

            // Try to extract JSON if wrapped in markdown or extra text
            if (preg_match('/\{[\s\S]*\}/u', $respText, $jsonMatch)) {
                $respText = $jsonMatch[0];
            }

            $encounterData = robustJsonDecode($respText);
            if (!$encounterData || !isset($encounterData['monsters'])) {
                // Return raw text for debugging
                $preview = substr($respText, 0, 200);
                throw new Exception("AI returned invalid encounter data. Preview: {$preview}");
            }

            simRespond(['ok' => true, 'encounter' => $encounterData]);
            break;

        /* ═══════════════════════════════════════════════════════
           AI LOOT & TREASURE GENERATOR
           Generates level-appropriate treasure for post-combat rewards
           ═══════════════════════════════════════════════════════ */
        case 'generate_loot':
            $partyLevel = (int) ($input['party_level'] ?? 3);
            $encounterCr = trim($input['encounter_cr'] ?? '');
            $lootType = trim($input['loot_type'] ?? 'standard');
            $monsterType = trim($input['monster_type'] ?? '');
            $notes = trim($input['notes'] ?? '');

            // Token budget check
            $uTierRows = query('SELECT subscription_tier FROM users WHERE id = ?', [$userId], 0);
            $uTier = $uTierRows ? ($uTierRows[0]['subscription_tier'] ?? 'free') : 'free';
            if (checkTokenBudget($userId, $uTier)) {
                throw new Exception('Token budget exceeded. Usage resets on the 1st.');
            }

            $apiKey = resolveApiKey('OPENROUTER_KEY_SIM_STRUCTURED', $userId);

            $lootTypes = [
                'standard' => 'Standard treasure appropriate for the CR (DMG Table 3-5). Mix of coins, gems, and items.',
                'hoard' => 'A large dragon-style treasure hoard. Significantly more than standard.',
                'individual' => 'What a single monster carries. Modest pocket change and personal items.',
                'quest_reward' => 'A quest reward from an NPC or patron. More curated and story-appropriate.',
            ];
            $lootDesc = $lootTypes[$lootType] ?? $lootTypes['standard'];

            $lootPrompt = <<<LPROMPT
You are a D&D 3.5e treasure generator following DMG guidelines.

PARAMETERS:
- Party Level: {$partyLevel}
- Encounter CR: {$encounterCr}
- Loot Type: {$lootType} — {$lootDesc}
- Monster Type: {$monsterType}
{$notes}

RULES:
- Follow D&D 3.5e treasure value guidelines (DMG Table 3-5)
- Include a mix of coins (cp, sp, gp, pp), gems, art objects, and magic items
- Magic items should be level-appropriate (no +5 swords for level 3 parties)
- Provide gold piece value estimates for gems and art objects
- Include interesting flavor text for special items

Respond ONLY with valid JSON, no extra text:
{
  "coins": {"cp": 0, "sp": 0, "gp": 0, "pp": 0},
  "total_coin_value_gp": 0,
  "gems": [{"name": "Gem Name", "value_gp": 50, "description": "appearance"}],
  "art_objects": [{"name": "Art Object", "value_gp": 100, "description": "appearance"}],
  "mundane_items": [{"name": "Item", "value_gp": 10, "description": "brief note"}],
  "magic_items": [{"name": "Magic Item +1", "value_gp": 2000, "description": "properties and appearance", "aura": "faint evocation"}],
  "total_value_gp": 0,
  "flavor_text": "Brief narrative about finding this treasure"
}
LPROMPT;

            $openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
            $model = defined('OPENROUTER_MODEL_CHEAP') ? OPENROUTER_MODEL_CHEAP : 'google/gemini-2.5-flash';
            $payload = json_encode([
                'model' => $model,
                'messages' => [['role' => 'user', 'content' => $lootPrompt]],
                'temperature' => 0.9,
                'max_tokens' => 1024
            ]);
            $ch = curl_init($openRouterUrl);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $payload,
                CURLOPT_HTTPHEADER => array_merge([
                    "Authorization: Bearer {$apiKey}",
                    "Content-Type: application/json"
                ], openRouterAppHeaders()),
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 60,
                CURLOPT_SSL_VERIFYPEER => true
            ]);
            $resp = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            resetDB();

            if ($httpCode !== 200 || !$resp)
                throw new Exception("AI loot generation failed (HTTP {$httpCode})");

            $data = json_decode($resp, true);
            if (!empty($data['usage'])) trackTokenUsage($userId, $data['usage']);
            $respText = $data['choices'][0]['message']['content'] ?? '';
            $lootData = robustJsonDecode($respText);
            if (!$lootData)
                throw new Exception('AI returned invalid loot data. Try again.');

            simRespond(['ok' => true, 'loot' => $lootData]);
            break;

        /* ═══════════════════════════════════════════════════════
           AI MAGIC SHOP GENERATOR
           Generates a level-appropriate magic item shop inventory
           ═══════════════════════════════════════════════════════ */
        case 'generate_magic_shop':
            $townId = (int) ($input['town_id'] ?? 0);
            $shopType = trim($input['shop_type'] ?? 'general');
            $partyLevel = (int) ($input['party_level'] ?? 3);
            $settlementSize = trim($input['settlement_size'] ?? 'small town');
            $budget = trim($input['budget'] ?? '');
            $notes = trim($input['notes'] ?? '');

            // Token budget check
            $uTierRows = query('SELECT subscription_tier FROM users WHERE id = ?', [$userId], 0);
            $uTier = $uTierRows ? ($uTierRows[0]['subscription_tier'] ?? 'free') : 'free';
            if (checkTokenBudget($userId, $uTier)) {
                throw new Exception('Token budget exceeded. Usage resets on the 1st.');
            }

            $apiKey = resolveApiKey('OPENROUTER_KEY_SIM_STRUCTURED', $userId);

            // Load town info if available
            $townName = 'Unknown Settlement';
            $biome = '';
            if ($townId > 0) {
                $townRow = query('SELECT name FROM towns WHERE id = ? AND user_id = ?', [$townId, $userId], $uid);
                if ($townRow) $townName = $townRow[0]['name'];
                $metaRows = query('SELECT `key`, value FROM town_meta WHERE town_id = ?', [$townId], $uid);
                foreach ($metaRows as $m) {
                    if ($m['key'] === 'biome') $biome = $m['value'];
                    if ($m['key'] === 'settlement_type') $settlementSize = $m['value'];
                }
            }

            $shopTypes = [
                'general' => 'A general magic goods emporium. Mix of weapons, armor, potions, scrolls, wondrous items.',
                'weapons_armor' => 'A specialized magical armory. Focuses on enchanted weapons and armor.',
                'potions_scrolls' => 'An alchemist/scribe shop. Potions, scrolls, and wands.',
                'wondrous' => 'A curiosity shop. Wondrous items, rings, and strange artifacts.',
                'divine' => 'A temple marketplace. Divine scrolls, holy items, healing potions.',
            ];
            $shopDesc = $shopTypes[$shopType] ?? $shopTypes['general'];

            $shopPrompt = <<<SPROMPT
You are a D&D 3.5e magic shop inventory generator following DMG settlement wealth guidelines.

PARAMETERS:
- Settlement: {$townName} ({$settlementSize})
- Biome: {$biome}
- Shop Type: {$shopType} — {$shopDesc}
- Party Level: {$partyLevel}
- Budget Hint: {$budget}
{$notes}

RULES:
- Follow D&D 3.5e pricing (DMG/SRD magic item costs)
- Settlement size limits item availability: hamlets have very basic items, metropolises have rare ones
- Include pricing in gold pieces
- Include mix of price ranges (cheap consumables to pricier permanent items)
- Generate 8-15 items appropriate for the settlement and party level
- Include the shopkeeper name and a brief personality note
- Potions, scrolls, and wands should list the spell and caster level

Respond ONLY with valid JSON, no extra text:
{
  "shop_name": "Creative shop name",
  "shopkeeper": {"name": "NPC Name", "race": "Race", "description": "Brief personality"},
  "specialty": "What this shop is known for",
  "items": [
    {"name": "Item Name", "type": "weapon|armor|potion|scroll|wand|ring|wondrous|rod|staff", "price_gp": 0, "description": "Brief properties and appearance", "stock": 1}
  ],
  "services": [
    {"name": "Identify (Arcane)", "price_gp": 100, "description": "Identify magic item properties"}
  ],
  "total_inventory_value_gp": 0,
  "flavor_text": "Brief description of the shop atmosphere"
}
SPROMPT;

            $openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
            $model = defined('OPENROUTER_MODEL_CHEAP') ? OPENROUTER_MODEL_CHEAP : 'google/gemini-2.5-flash';
            $payload = json_encode([
                'model' => $model,
                'messages' => [['role' => 'user', 'content' => $shopPrompt]],
                'temperature' => 0.9,
                'max_tokens' => 1536
            ]);
            $ch = curl_init($openRouterUrl);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $payload,
                CURLOPT_HTTPHEADER => array_merge([
                    "Authorization: Bearer {$apiKey}",
                    "Content-Type: application/json"
                ], openRouterAppHeaders()),
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 60,
                CURLOPT_SSL_VERIFYPEER => true
            ]);
            $resp = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            resetDB();

            if ($httpCode !== 200 || !$resp)
                throw new Exception("AI magic shop generation failed (HTTP {$httpCode})");

            $data = json_decode($resp, true);
            if (!empty($data['usage'])) trackTokenUsage($userId, $data['usage']);
            $respText = $data['choices'][0]['message']['content'] ?? '';
            $shopData = robustJsonDecode($respText);
            if (!$shopData)
                throw new Exception('AI returned invalid shop data. Try again.');

            simRespond(['ok' => true, 'shop' => $shopData]);
            break;

        default:
            throw new Exception("Unknown simulation action: $action");
    }

} catch (Exception $e) {
    http_response_code(400);
    simRespond(['error' => $e->getMessage()]);
}

/* ═══════════════════════════════════════════════════════════
   AUTO-SPELL SELECTION FOR GENERATED CASTERS
   Selects optimal SRD spells based on class, level, and NPC role.
   ═══════════════════════════════════════════════════════════ */
function autoSelectSpellsForCaster(int $charId, string $className, int $level, string $role, string $edition, int $uid): array
{
    $debug = ['charId' => $charId, 'class' => $className, 'level' => $level, 'role' => $role];

    $casterClasses = [
        'Wizard' => ['Sorcerer/Wizard', 'arcane', 'prepared'],
        'Sorcerer' => ['Sorcerer/Wizard', 'arcane', 'spontaneous'],
        'Cleric' => ['Cleric', 'divine', 'prepared'],
        'Druid' => ['Druid', 'divine', 'prepared'],
        'Bard' => ['Bard', 'arcane', 'spontaneous'],
        'Paladin' => ['Paladin', 'divine', 'prepared'],
        'Ranger' => ['Ranger', 'divine', 'prepared'],
        'Adept' => ['Adp', 'divine', 'prepared'],
    ];

    if (!isset($casterClasses[$className])) {
        $debug['error'] = 'Not a caster class';
        return $debug;
    }

    $casterInfo = $casterClasses[$className];
    $srdLevelKey = $casterInfo[0];
    $castType = $casterInfo[2];
    $debug['srdKey'] = $srdLevelKey;
    $debug['castType'] = $castType;

    $maxSpellLevel = calcMaxSpellLevel($className, $level);
    if ($maxSpellLevel < 0) {
        $debug['error'] = "Can't cast yet (maxSpellLevel=$maxSpellLevel)";
        return $debug;
    }
    $debug['maxSpellLevel'] = $maxSpellLevel;

    $spellLimits = getSpellLimits($className, $level);
    $debug['spellLimits'] = $spellLimits;

    $allSpells = srdQuery($edition, 'SELECT id, name, school, level, short_description FROM spells ORDER BY name');
    $debug['totalSrdSpells'] = count($allSpells);
    if (empty($allSpells)) {
        $debug['error'] = 'No SRD spells found in database';
        return $debug;
    }

    // Parse each spell's level for this class
    $classSpells = [];
    for ($sl = 0; $sl <= $maxSpellLevel; $sl++) {
        $classSpells[$sl] = [];
    }

    foreach ($allSpells as $spell) {
        $levelStr = $spell['level'] ?? '';
        $spellLevel = parseSpellLevelForClass($levelStr, $srdLevelKey);

        // Fallback for classes not in SRD level strings
        if ($spellLevel === null) {
            $fallbackKeys = [
                'Adp' => ['Cleric', 'Druid'],
                'Paladin' => ['Cleric'],
                'Ranger' => ['Druid'],
            ];
            foreach ($fallbackKeys[$srdLevelKey] ?? [] as $altKey) {
                $spellLevel = parseSpellLevelForClass($levelStr, $altKey);
                if ($spellLevel !== null)
                    break;
            }
        }

        if ($spellLevel !== null && $spellLevel >= 0 && $spellLevel <= $maxSpellLevel) {
            $classSpells[$spellLevel][] = $spell;
        }
    }

    $debug['spellsFoundPerLevel'] = array_map('count', $classSpells);

    $roleLower = strtolower($role);
    $spellPriority = getSpellPrioritiesForRole($roleLower, $className);

    $selectedSpells = [];
    for ($sl = 0; $sl <= $maxSpellLevel; $sl++) {
        $available = $classSpells[$sl] ?? [];
        if (empty($available))
            continue;
        $limit = $spellLimits[$sl] ?? 0;
        if ($limit <= 0)
            continue;

        $scored = [];
        foreach ($available as $spell) {
            $score = scoreSpellForRole($spell, $spellPriority);
            $scored[] = ['spell' => $spell, 'score' => $score];
        }
        usort($scored, fn($a, $b) => $b['score'] - $a['score']);
        $picked = array_slice($scored, 0, $limit);
        foreach ($picked as $p) {
            $selectedSpells[] = ['spell' => $p['spell'], 'level' => $sl];
        }
    }

    $debug['selectedCount'] = count($selectedSpells);
    $debug['selectedNames'] = array_map(fn($s) => $s['spell']['name'] . ' (L' . $s['level'] . ')', $selectedSpells);

    if (empty($selectedSpells)) {
        $debug['error'] = 'No spells selected';
        return $debug;
    }

    // Insert into character_spells_known
    $knownOk = 0;
    $knownErr = [];
    foreach ($selectedSpells as $ss) {
        try {
            execute(
                'INSERT INTO character_spells_known (character_id, spell_name, spell_level, class_name, source, notes) VALUES (?,?,?,?,?,?)
                 ON DUPLICATE KEY UPDATE spell_level=VALUES(spell_level)',
                [$charId, $ss['spell']['name'], $ss['level'], $className, 'Auto-selected', 'Optimal for ' . $role],
                $uid
            );
            $knownOk++;
        } catch (Exception $e) {
            $knownErr[] = $e->getMessage();
        }
    }
    $debug['knownInserted'] = $knownOk;
    if ($knownErr)
        $debug['knownErrors'] = $knownErr;

    // For prepared casters, insert into spells_prepared
    $prepOk = 0;
    $prepErr = [];
    if ($castType === 'prepared') {
        try {
            execute('DELETE FROM character_spells_prepared WHERE character_id = ? AND class_name = ?', [$charId, $className], $uid);
        } catch (Exception $e) {
            $prepErr[] = 'DELETE: ' . $e->getMessage();
        }

        foreach ($selectedSpells as $ss) {
            try {
                execute(
                    'INSERT INTO character_spells_prepared (character_id, spell_name, spell_level, slot_level, class_name, is_domain, metamagic, used) VALUES (?,?,?,?,?,?,?,?)',
                    [$charId, $ss['spell']['name'], $ss['level'], $ss['level'], $className, 0, '', 0],
                    $uid
                );
                $prepOk++;
            } catch (Exception $e) {
                $prepErr[] = $e->getMessage();
            }
        }
    }
    $debug['prepInserted'] = $prepOk;
    if ($prepErr)
        $debug['prepErrors'] = $prepErr;

    // Wizards: spellbook
    if ($className === 'Wizard') {
        foreach ($selectedSpells as $ss) {
            try {
                execute(
                    'INSERT INTO character_spellbook (character_id, spell_name, spell_level, pages, source) VALUES (?,?,?,?,?)
                     ON DUPLICATE KEY UPDATE pages=VALUES(pages)',
                    [$charId, $ss['spell']['name'], $ss['level'], max(1, $ss['level']), 'Starting spellbook'],
                    $uid
                );
            } catch (Exception $e) { /* non-fatal */
            }
        }
    }

    return $debug;
}




/**
 * Get max castable spell level for a class at a given level.
 */
function calcMaxSpellLevel(string $className, int $level): int
{
    // Full casters (Wizard, Cleric, Druid, Sorcerer): gain spell levels at odd-ish levels
    $fullCasterMap = [ // level => max spell level
        1 => 0,
        2 => 1,
        3 => 1,
        4 => 2,
        5 => 2,
        6 => 3,
        7 => 3,
        8 => 4,
        9 => 4,
        10 => 5,
        11 => 5,
        12 => 6,
        13 => 6,
        14 => 7,
        15 => 7,
        16 => 8,
        17 => 8,
        18 => 9,
        19 => 9,
        20 => 9
    ];
    // Sorcerer learns spells one level later
    $sorcererMap = [
        1 => 0,
        2 => 0,
        3 => 1,
        4 => 1,
        5 => 2,
        6 => 2,
        7 => 3,
        8 => 3,
        9 => 4,
        10 => 4,
        11 => 5,
        12 => 5,
        13 => 6,
        14 => 6,
        15 => 7,
        16 => 7,
        17 => 8,
        18 => 8,
        19 => 9,
        20 => 9
    ];
    $bardMap = [
        1 => 0,
        2 => 0,
        3 => 1,
        4 => 1,
        5 => 1,
        6 => 2,
        7 => 2,
        8 => 2,
        9 => 3,
        10 => 3,
        11 => 3,
        12 => 4,
        13 => 4,
        14 => 4,
        15 => 5,
        16 => 5,
        17 => 5,
        18 => 6,
        19 => 6,
        20 => 6
    ];
    $halfCasterMap = [ // Paladin, Ranger: start casting at level 4
        1 => -1,
        2 => -1,
        3 => -1,
        4 => 1,
        5 => 1,
        6 => 1,
        7 => 1,
        8 => 2,
        9 => 2,
        10 => 2,
        11 => 2,
        12 => 3,
        13 => 3,
        14 => 3,
        15 => 3,
        16 => 4,
        17 => 4,
        18 => 4,
        19 => 4,
        20 => 4
    ];
    $adeptMap = [
        1 => 1,
        2 => 1,
        3 => 1,
        4 => 2,
        5 => 2,
        6 => 2,
        7 => 2,
        8 => 3,
        9 => 3,
        10 => 3,
        11 => 3,
        12 => 4,
        13 => 4,
        14 => 4,
        15 => 4,
        16 => 5,
        17 => 5,
        18 => 5,
        19 => 5,
        20 => 5
    ];

    $lvl = min($level, 20);
    switch ($className) {
        case 'Wizard':
        case 'Cleric':
        case 'Druid':
            return $fullCasterMap[$lvl] ?? 0;
        case 'Sorcerer':
            return $sorcererMap[$lvl] ?? 0;
        case 'Bard':
            return $bardMap[$lvl] ?? 0;
        case 'Paladin':
        case 'Ranger':
            return $halfCasterMap[$lvl] ?? -1;
        case 'Adept':
            return $adeptMap[$lvl] ?? 0;
        default:
            return -1;
    }
}

/**
 * Get number of spells known/preparable for each spell level.
 */
function getSpellLimits(string $className, int $level): array
{
    // Spontaneous casters: spells known
    // Prepared casters: reasonable preparation list
    $lvl = min($level, 20);

    // Full caster base: generous selection
    // These are "how many spells to auto-pick" — not spell slots
    switch ($className) {
        case 'Wizard':
            // Wizards start with all 0-level + 3+INT mod 1st-level, gain 2/level
            $base = [4]; // 4 cantrips
            if ($lvl >= 1)
                $base[1] = 3; // 3 first-level
            for ($sl = 2; $sl <= 9; $sl++) {
                if (calcMaxSpellLevel($className, $lvl) >= $sl)
                    $base[$sl] = 2;
            }
            return $base;
        case 'Sorcerer':
            $knownTable = [
                1 => [4, 2],
                2 => [5, 2],
                3 => [5, 3],
                4 => [6, 3, 1],
                5 => [6, 4, 2],
                6 => [7, 4, 2, 1],
                7 => [7, 5, 3, 2],
                8 => [8, 5, 3, 2, 1],
                9 => [8, 5, 4, 3, 2],
                10 => [9, 5, 4, 3, 2, 1],
                11 => [9, 5, 5, 4, 3, 2],
                12 => [9, 5, 5, 4, 3, 2, 1],
                13 => [9, 5, 5, 4, 4, 3, 2],
                14 => [9, 5, 5, 4, 4, 3, 2, 1],
                15 => [9, 5, 5, 4, 4, 4, 3, 2],
                16 => [9, 5, 5, 4, 4, 4, 3, 2, 1],
                17 => [9, 5, 5, 4, 4, 4, 3, 3, 2],
                18 => [9, 5, 5, 4, 4, 4, 3, 3, 2, 1],
                19 => [9, 5, 5, 4, 4, 4, 3, 3, 3, 2],
                20 => [9, 5, 5, 4, 4, 4, 3, 3, 3, 3]
            ];
            return $knownTable[$lvl] ?? [4, 2];
        case 'Bard':
            $knownTable = [
                1 => [4],
                2 => [5, 2],
                3 => [6, 3],
                4 => [6, 3, 2],
                5 => [6, 4, 3],
                6 => [6, 4, 3],
                7 => [6, 4, 4, 2],
                8 => [6, 4, 4, 3],
                9 => [6, 4, 4, 3],
                10 => [6, 4, 4, 4, 2],
                11 => [6, 4, 4, 4, 3],
                12 => [6, 4, 4, 4, 3],
                13 => [6, 4, 4, 4, 4, 2],
                14 => [6, 4, 4, 4, 4, 3],
                15 => [6, 4, 4, 4, 4, 3],
                16 => [6, 5, 4, 4, 4, 4, 2],
                17 => [6, 5, 5, 4, 4, 4, 3],
                18 => [6, 5, 5, 5, 4, 4, 3],
                19 => [6, 5, 5, 5, 5, 4, 4],
                20 => [6, 5, 5, 5, 5, 5, 4]
            ];
            return $knownTable[$lvl] ?? [4];
        case 'Cleric':
        case 'Druid':
            // Prepared: they can prepare any spell, so give them a reasonable starter kit
            $base = [3]; // 3 cantrips
            for ($sl = 1; $sl <= calcMaxSpellLevel($className, $lvl); $sl++) {
                $base[$sl] = max(2, 4 - $sl + 1); // More low-level, fewer high-level
            }
            return $base;
        case 'Paladin':
        case 'Ranger':
            if ($lvl < 4)
                return [];
            $maxSL = calcMaxSpellLevel($className, $lvl);
            $base = [];
            for ($sl = 1; $sl <= $maxSL; $sl++) {
                $base[$sl] = 2;
            }
            return $base;
        case 'Adept':
            $base = [3];
            for ($sl = 1; $sl <= calcMaxSpellLevel($className, $lvl); $sl++) {
                $base[$sl] = 2;
            }
            return $base;
        default:
            return [];
    }
}

/**
 * Parse spell level string to find the level for a specific class.
 * e.g., "Brd 1, Sor/Wiz 2, Clr 3" => for "Sor/Wiz" returns 2
 */
function parseSpellLevelForClass(string $levelStr, string $classKey): ?int
{
    // Match patterns like "Sor/Wiz 2" or "Clr 3" or "Drd 1"
    $parts = preg_split('/[,;]/', $levelStr);
    foreach ($parts as $part) {
        $part = trim($part);
        if (preg_match('/^(.+?)\s+(\d+)$/', $part, $m)) {
            $cls = trim($m[1]);
            $lvl = (int) $m[2];
            if (strcasecmp($cls, $classKey) === 0)
                return $lvl;
            // Handle combined keys like "Sor/Wiz"
            if (stripos($cls, $classKey) !== false)
                return $lvl;
            if (stripos($classKey, $cls) !== false)
                return $lvl;
        }
    }
    return null;
}

/**
 * Get spell selection priorities based on role.
 */
function getSpellPrioritiesForRole(string $role, string $className): array
{
    // Define school/keyword priorities for different roles
    $priorities = [
        'schools' => [],   // Preferred schools
        'keywords' => [],  // Keywords in spell name/description that are good
        'avoid' => [],     // Schools/keywords to deprioritize
    ];

    // Healer/Priest roles
    if (preg_match('/heal|priest|medic|doctor|cleric|temple|divine/', $role)) {
        $priorities['schools'] = ['Conjuration', 'Necromancy', 'Abjuration'];
        $priorities['keywords'] = ['cure', 'heal', 'restoration', 'remove', 'protection', 'bless', 'aid', 'shield', 'sanctuary', 'prayer', 'revive'];
        $priorities['avoid'] = ['inflict', 'animate dead', 'harm'];
    }
    // Combat/Guard roles
    elseif (preg_match('/guard|warrior|soldier|combat|fighter|mercenary|captain|militia/', $role)) {
        $priorities['schools'] = ['Evocation', 'Abjuration', 'Transmutation'];
        $priorities['keywords'] = ['magic weapon', 'shield', 'protection', 'bull', 'bear', 'cat', 'fire', 'lightning', 'force', 'magic missile', 'haste', 'fly', 'mage armor'];
    }
    // Sage/Scholar roles
    elseif (preg_match('/sage|scholar|librarian|researcher|scribe|lore/', $role)) {
        $priorities['schools'] = ['Divination', 'Transmutation', 'Abjuration'];
        $priorities['keywords'] = ['detect', 'identify', 'read', 'comprehend', 'know', 'legend', 'arcane', 'see', 'true', 'locate', 'scry'];
    }
    // Trickster/Thief roles
    elseif (preg_match('/thief|rogue|spy|trickster|shadow|assassin/', $role)) {
        $priorities['schools'] = ['Illusion', 'Enchantment', 'Transmutation'];
        $priorities['keywords'] = ['invisible', 'charm', 'sleep', 'disguise', 'silence', 'knock', 'alter', 'darkness', 'shadow', 'suggestion', 'dominate'];
    }
    // Nature/Druid roles
    elseif (preg_match('/druid|nature|forest|wild|animal|ranger|hunter/', $role)) {
        $priorities['schools'] = ['Transmutation', 'Conjuration', 'Evocation'];
        $priorities['keywords'] = ['animal', 'plant', 'nature', 'wild', 'beast', 'storm', 'stone', 'bark', 'entangle', 'flame', 'summon', 'speak with'];
    }
    // Entertainer/Bard roles
    elseif (preg_match('/bard|entertainer|minstrel|musician|performer/', $role)) {
        $priorities['schools'] = ['Enchantment', 'Illusion', 'Transmutation'];
        $priorities['keywords'] = ['charm', 'fascinate', 'suggestion', 'glibness', 'heroism', 'inspire', 'sound', 'silence', 'illusion', 'cure'];
    }
    // Craftsman/Artisan roles
    elseif (preg_match('/craft|smith|artisan|maker|builder|artificer/', $role)) {
        $priorities['schools'] = ['Transmutation', 'Conjuration', 'Abjuration'];
        $priorities['keywords'] = ['mending', 'fabricate', 'make', 'create', 'repair', 'stone', 'metal', 'wood', 'shape', 'harden'];
    }
    // Default: balanced selection
    else {
        // Class-specific defaults
        if (in_array($className, ['Wizard', 'Sorcerer'])) {
            $priorities['schools'] = ['Evocation', 'Abjuration', 'Transmutation'];
            $priorities['keywords'] = ['magic missile', 'shield', 'mage armor', 'detect', 'light', 'prestidigitation', 'fireball', 'sleep', 'charm'];
        } elseif ($className === 'Cleric') {
            $priorities['schools'] = ['Conjuration', 'Abjuration', 'Divination'];
            $priorities['keywords'] = ['cure', 'bless', 'shield of faith', 'detect', 'protection', 'sanctuary'];
        } elseif ($className === 'Druid') {
            $priorities['schools'] = ['Transmutation', 'Conjuration', 'Evocation'];
            $priorities['keywords'] = ['entangle', 'cure', 'animal', 'speak', 'flame', 'call lightning'];
        } elseif ($className === 'Adept') {
            $priorities['schools'] = ['Conjuration', 'Divination', 'Abjuration'];
            $priorities['keywords'] = ['cure', 'detect', 'light', 'mending', 'protection', 'bless'];
        }
    }

    return $priorities;
}

/**
 * Score a spell for how well it matches a role's priorities.
 */
function scoreSpellForRole(array $spell, array $priorities): int
{
    $score = 10; // Base score
    $spellName = strtolower($spell['name'] ?? '');
    $spellSchool = $spell['school'] ?? '';
    $spellDesc = strtolower($spell['short_description'] ?? '');

    // School bonus
    if (in_array($spellSchool, $priorities['schools'])) {
        $score += 20;
    }

    // Keyword bonus
    foreach ($priorities['keywords'] as $kw) {
        if (strpos($spellName, strtolower($kw)) !== false || strpos($spellDesc, strtolower($kw)) !== false) {
            $score += 15;
        }
    }

    // Avoid penalty
    foreach ($priorities['avoid'] ?? [] as $avoid) {
        if (strpos($spellName, strtolower($avoid)) !== false || strpos($spellDesc, strtolower($avoid)) !== false) {
            $score -= 30;
        }
    }

    // Bonus for universally useful spells
    $universals = ['light', 'detect magic', 'read magic', 'mending', 'prestidigitation', 'cure light wounds', 'cure minor wounds', 'mage armor', 'shield', 'magic missile'];
    if (in_array($spellName, $universals)) {
        $score += 10;
    }

    // Small random factor for variety
    $score += mt_rand(0, 5);

    return max(0, $score);
}


/* ═══════════════════════════════════════════════════════════
   AUTO LEVEL-UP — Deterministic 3.5e Rules
   No AI needed — follows strict class progression math.
   ═══════════════════════════════════════════════════════════ */
function autoLevelUp(array $char, string $edition, int $uid): bool
{
    $charId = (int) $char['id'];

    // Parse current class string (e.g., "Fighter 3" or "Cleric 2/Fighter 1")
    preg_match_all('/([A-Za-z\s]+?)\s+(\d+)/', $char['class'] ?? 'Commoner 1', $classMatches, PREG_SET_ORDER);
    if (empty($classMatches))
        return false;

    // Find the primary class (highest level, or first)
    $primaryClass = trim($classMatches[0][1]);
    $primaryLevel = (int) $classMatches[0][2];
    $totalLevel = 0;
    foreach ($classMatches as $cm) {
        $totalLevel += (int) $cm[2];
    }

    $newClassLevel = $primaryLevel + 1;
    $newTotalLevel = $totalLevel + 1;

    // ── Hit Dice & HP ──────────────────────────────────────
    $hitDice = [
        'Commoner' => 4,
        'Expert' => 6,
        'Warrior' => 8,
        'Adept' => 6,
        'Aristocrat' => 8,
        'Fighter' => 10,
        'Cleric' => 8,
        'Wizard' => 4,
        'Rogue' => 6,
        'Ranger' => 8,
        'Barbarian' => 12,
        'Bard' => 6,
        'Paladin' => 10,
        'Monk' => 8,
        'Druid' => 8,
        'Sorcerer' => 4
    ];
    $hdVal = $hitDice[$primaryClass] ?? 6;
    $conMod = (int) floor(((int) ($char['con'] ?? 10) - 10) / 2);
    $hpGain = max(1, (int) floor($hdVal / 2 + 1) + $conMod); // Average roll + CON
    $newHp = (int) ($char['hp'] ?? 1) + $hpGain;
    $newHd = $newClassLevel . 'd' . $hdVal;

    // ── BAB ────────────────────────────────────────────────
    $babFull = ['Fighter', 'Barbarian', 'Paladin', 'Ranger', 'Warrior'];
    $bab34 = ['Cleric', 'Druid', 'Rogue', 'Monk', 'Bard', 'Adept', 'Expert', 'Aristocrat'];
    if (in_array($primaryClass, $babFull)) {
        $bab = $newClassLevel;
    } elseif (in_array($primaryClass, $bab34)) {
        $bab = (int) floor($newClassLevel * 3 / 4);
    } else {
        $bab = (int) floor($newClassLevel / 2);
    }

    // ── Saves ──────────────────────────────────────────────
    $classGoodSaves = [
        'Fighter' => ['fort'],
        'Barbarian' => ['fort'],
        'Paladin' => ['fort'],
        'Ranger' => ['fort', 'ref'],
        'Monk' => ['fort', 'ref', 'will'],
        'Rogue' => ['ref'],
        'Bard' => ['ref', 'will'],
        'Cleric' => ['fort', 'will'],
        'Druid' => ['fort', 'will'],
        'Wizard' => ['will'],
        'Sorcerer' => ['will'],
        'Commoner' => [],
        'Expert' => [],
        'Warrior' => ['fort'],
        'Adept' => ['will'],
        'Aristocrat' => ['will']
    ];
    $goodSaves = $classGoodSaves[$primaryClass] ?? [];
    $strMod = (int) floor(((int) ($char['str'] ?? 10) - 10) / 2);
    $dexMod = (int) floor(((int) ($char['dex'] ?? 10) - 10) / 2);
    $wisMod = (int) floor(((int) ($char['wis'] ?? 10) - 10) / 2);

    $fortBase = in_array('fort', $goodSaves) ? (int) floor($newClassLevel / 2) + 2 : (int) floor($newClassLevel / 3);
    $refBase = in_array('ref', $goodSaves) ? (int) floor($newClassLevel / 2) + 2 : (int) floor($newClassLevel / 3);
    $willBase = in_array('will', $goodSaves) ? (int) floor($newClassLevel / 2) + 2 : (int) floor($newClassLevel / 3);
    $fmtMod = function ($v) {
        return ($v >= 0 ? '+' : '') . $v;
    };
    $saves = 'Fort ' . $fmtMod($fortBase + $conMod) . ', Ref ' . $fmtMod($refBase + $dexMod) . ', Will ' . $fmtMod($willBase + $wisMod);

    // ── Build new class string — store just the name, level is separate ──
    // For multiclass: "Fighter/Wizard" with level being total level
    $newClassStr = '';
    foreach ($classMatches as $i => $cm) {
        $cn = trim($cm[1]);
        $newClassStr .= ($newClassStr ? '/' : '') . $cn;
    }

    // ── Ability Score Increase at 4, 8, 12, 16, 20 ──────────
    $abilityIncrease = '';
    if ($newTotalLevel % 4 === 0) {
        // Increase the class's primary ability
        $primaryAbility = getPrimaryAbility($primaryClass);
        if ($primaryAbility) {
            $abilityIncrease = $primaryAbility;
        }
    }

    // ── Feat at levels 1, 3, 6, 9, 12... ────────────────────
    $newFeat = '';
    if ($newTotalLevel === 1 || $newTotalLevel % 3 === 0) {
        // Pick an appropriate feat
        $combatFeats = ['Power Attack', 'Cleave', 'Weapon Focus', 'Dodge', 'Improved Initiative', 'Combat Reflexes', 'Great Cleave', 'Improved Bull Rush', 'Improved Sunder'];
        $generalFeats = ['Toughness', 'Alertness', 'Endurance', 'Iron Will', 'Great Fortitude', 'Lightning Reflexes', 'Run', 'Self-Sufficient', 'Stealthy', 'Persuasive', 'Athletic', 'Negotiator'];
        $casterFeats = ['Combat Casting', 'Spell Focus', 'Spell Penetration', 'Augment Summoning', 'Improved Counterspell'];

        $existingFeats = strtolower($char['feats'] ?? '');
        $pool = [];
        if (in_array($primaryClass, ['Fighter', 'Barbarian', 'Paladin', 'Ranger', 'Warrior', 'Monk'])) {
            $pool = array_merge($combatFeats, $generalFeats);
        } elseif (in_array($primaryClass, ['Wizard', 'Sorcerer', 'Cleric', 'Druid', 'Adept', 'Bard'])) {
            $pool = array_merge($casterFeats, $generalFeats);
        } else {
            $pool = $generalFeats;
        }
        shuffle($pool);
        foreach ($pool as $feat) {
            if (strpos($existingFeats, strtolower($feat)) === false) {
                $newFeat = $feat;
                break;
            }
        }
    }
    // Fighter/Warrior bonus combat feats at even levels
    $bonusFeat = '';
    if (in_array($primaryClass, ['Fighter', 'Warrior']) && $newClassLevel % 2 === 0) {
        $bonusCombat = ['Weapon Specialization', 'Greater Weapon Focus', 'Improved Critical', 'Spring Attack', 'Whirlwind Attack', 'Blind-Fight', 'Improved Disarm', 'Improved Trip'];
        $existingFeats = strtolower($char['feats'] ?? '');
        shuffle($bonusCombat);
        foreach ($bonusCombat as $feat) {
            if (strpos($existingFeats, strtolower($feat)) === false && strtolower($feat) !== strtolower($newFeat)) {
                $bonusFeat = $feat;
                break;
            }
        }
    }

    // ── Update DB ──────────────────────────────────────────
    $updates = 'class = ?, hp = ?, hd = ?, saves = ?, level = ?';
    $params = [$newClassStr, $newHp, $newHd, $saves, $newTotalLevel];

    // Apply ability increase
    if ($abilityIncrease) {
        $abCol = strtolower($abilityIncrease);
        if ($abCol === 'int')
            $abCol = 'int_';
        if (in_array($abCol, ['str', 'dex', 'con', 'int_', 'wis', 'cha'])) {
            $updates .= ", $abCol = $abCol + 1";
        }
    }

    // Append new feats
    $featsToAdd = array_filter([$newFeat, $bonusFeat]);
    if (!empty($featsToAdd)) {
        $currentFeats = trim($char['feats'] ?? '');
        $allFeats = $currentFeats ? $currentFeats . ', ' . implode(', ', $featsToAdd) : implode(', ', $featsToAdd);
        $updates .= ', feats = ?';
        $params[] = $allFeats;
    }

    // CR update
    $npcClasses = ['Commoner', 'Expert', 'Warrior', 'Adept', 'Aristocrat'];
    $cr = in_array($primaryClass, $npcClasses) ? ($newClassLevel <= 1 ? '1/2' : (string) ($newClassLevel - 1)) : (string) $newTotalLevel;
    $updates .= ', cr = ?';
    $params[] = $cr;

    $params[] = $charId;
    try {
        execute("UPDATE characters SET $updates WHERE id = ?", $params, $uid);
    } catch (Exception $e) {
        return false;
    }

    // Recalculate AC/ATK from equipment
    recalcCharStats($charId, $uid);

    // Update skill ranks for the new level
    $charRow = query('SELECT str, dex, con, int_, wis, cha, race, role, skills_feats, feats FROM characters WHERE id = ?', [$charId], $uid);
    if ($charRow) {
        $cr2 = $charRow[0];
        autoAssignSkillsAndFeats(
            $charId,
            $primaryClass,
            $newTotalLevel,
            $cr2['race'] ?? 'Human',
            (int) ($cr2['str'] ?? 10),
            (int) ($cr2['dex'] ?? 10),
            (int) ($cr2['con'] ?? 10),
            (int) ($cr2['int_'] ?? 10),
            (int) ($cr2['wis'] ?? 10),
            (int) ($cr2['cha'] ?? 10),
            $cr2['role'] ?? '',
            (string) ($cr2['skills_feats'] ?? ''),
            (string) ($cr2['feats'] ?? ''),
            $uid
        );
    }

    // Record in level history
    $featNote = !empty($featsToAdd) ? ' | Feats: ' . implode(', ', $featsToAdd) : '';
    try {
        execute(
            'INSERT INTO character_level_history (character_id, level_number, class_name, hp_gained, ability_increase, notes) VALUES (?,?,?,?,?,?)
             ON DUPLICATE KEY UPDATE class_name=VALUES(class_name), hp_gained=VALUES(hp_gained), ability_increase=VALUES(ability_increase), notes=VALUES(notes)',
            [$charId, $newTotalLevel, $primaryClass, $hpGain, $abilityIncrease, 'Auto-leveled during simulation' . $featNote],
            $uid
        );
    } catch (Exception $e) { /* non-fatal */
    }


    // Auto-select new spells for casters at new level
    autoSelectSpellsForCaster($charId, $primaryClass, $newClassLevel, $char['role'] ?? '', $edition, $uid);

    return true;
}

/**
 * Get the primary ability score for a class (used for auto ability increases).
 */
function getPrimaryAbility(string $className): string
{
    $map = [
        'Fighter' => 'str',
        'Barbarian' => 'str',
        'Paladin' => 'cha',
        'Ranger' => 'dex',
        'Monk' => 'wis',
        'Rogue' => 'dex',
        'Bard' => 'cha',
        'Cleric' => 'wis',
        'Druid' => 'wis',
        'Wizard' => 'int',
        'Sorcerer' => 'cha',
        'Warrior' => 'str',
        'Expert' => 'int',
        'Adept' => 'wis',
        'Aristocrat' => 'cha',
        'Commoner' => 'con',
    ];
    return $map[$className] ?? 'con';
}

/* ═══════════════════════════════════════════════════════════
   AUTO-ASSIGN SKILLS & FEATS — Deterministic 3.5e Rules
   Calculates skill points and assigns ranks to class skills.
   Picks appropriate feats if AI didn't provide them.
   ═══════════════════════════════════════════════════════════ */
function autoAssignSkillsAndFeats(
    int $charId,
    string $className,
    int $level,
    string $race,
    int $str,
    int $dex,
    int $con,
    int $int_,
    int $wis,
    int $cha,
    string $role,
    string $aiSkills,
    string $aiFeats,
    int $uid
): void {
    $intMod = (int) floor(($int_ - 10) / 2);
    $dexMod = (int) floor(($dex - 10) / 2);
    $strMod = (int) floor(($str - 10) / 2);
    $wisMod = (int) floor(($wis - 10) / 2);
    $chaMod = (int) floor(($cha - 10) / 2);

    // ── Skill points per level by class (D&D 3.5e) ──
    $skillPointsPerLevel = [
        'Barbarian' => 4,
        'Bard' => 6,
        'Cleric' => 2,
        'Druid' => 4,
        'Fighter' => 2,
        'Monk' => 4,
        'Paladin' => 2,
        'Ranger' => 6,
        'Rogue' => 8,
        'Sorcerer' => 2,
        'Wizard' => 2,
        'Commoner' => 2,
        'Expert' => 6,
        'Warrior' => 2,
        'Adept' => 2,
        'Aristocrat' => 4,
    ];
    $base = $skillPointsPerLevel[$className] ?? 2;
    $perLevel = max(1, $base + $intMod); // Min 1 skill point per level
    $humanBonus = (stripos($race, 'Human') !== false) ? 1 : 0;
    // Level 1 gets (base+INT)*4 + human bonus*4; subsequent get (base+INT)+human
    $totalPoints = ($perLevel + $humanBonus) * 4; // Level 1 quadrupled
    for ($i = 2; $i <= $level; $i++) {
        $totalPoints += $perLevel + $humanBonus;
    }

    // ── Class skills by class ──
    $classSkills = [
        'Fighter' => ['Climb', 'Craft', 'Handle Animal', 'Intimidate', 'Jump', 'Ride', 'Swim'],
        'Barbarian' => ['Climb', 'Craft', 'Handle Animal', 'Intimidate', 'Jump', 'Listen', 'Ride', 'Survival', 'Swim'],
        'Paladin' => ['Concentration', 'Craft', 'Diplomacy', 'Handle Animal', 'Heal', 'Knowledge (religion)', 'Ride', 'Sense Motive'],
        'Ranger' => ['Climb', 'Craft', 'Handle Animal', 'Heal', 'Hide', 'Jump', 'Knowledge (nature)', 'Listen', 'Move Silently', 'Ride', 'Search', 'Spot', 'Survival', 'Swim', 'Use Rope'],
        'Cleric' => ['Concentration', 'Craft', 'Diplomacy', 'Heal', 'Knowledge (arcana)', 'Knowledge (religion)', 'Spellcraft'],
        'Druid' => ['Concentration', 'Craft', 'Diplomacy', 'Handle Animal', 'Heal', 'Knowledge (nature)', 'Listen', 'Ride', 'Spellcraft', 'Spot', 'Survival', 'Swim'],
        'Wizard' => ['Concentration', 'Craft', 'Decipher Script', 'Knowledge (arcana)', 'Knowledge (religion)', 'Spellcraft'],
        'Sorcerer' => ['Bluff', 'Concentration', 'Craft', 'Knowledge (arcana)', 'Spellcraft'],
        'Rogue' => ['Appraise', 'Balance', 'Bluff', 'Climb', 'Craft', 'Decipher Script', 'Diplomacy', 'Disable Device', 'Disguise', 'Escape Artist', 'Gather Information', 'Hide', 'Intimidate', 'Jump', 'Listen', 'Move Silently', 'Open Lock', 'Search', 'Sense Motive', 'Sleight of Hand', 'Spot', 'Tumble', 'Use Rope'],
        'Bard' => ['Appraise', 'Balance', 'Bluff', 'Climb', 'Concentration', 'Craft', 'Decipher Script', 'Diplomacy', 'Disguise', 'Escape Artist', 'Gather Information', 'Hide', 'Jump', 'Knowledge (arcana)', 'Listen', 'Move Silently', 'Perform', 'Sense Motive', 'Sleight of Hand', 'Spellcraft', 'Tumble', 'Use Magic Device'],
        'Monk' => ['Balance', 'Climb', 'Concentration', 'Craft', 'Diplomacy', 'Escape Artist', 'Hide', 'Jump', 'Knowledge (arcana)', 'Knowledge (religion)', 'Listen', 'Move Silently', 'Perform', 'Sense Motive', 'Spot', 'Swim', 'Tumble'],
        'Warrior' => ['Climb', 'Handle Animal', 'Intimidate', 'Jump', 'Ride', 'Swim'],
        'Expert' => ['Appraise', 'Craft', 'Diplomacy', 'Gather Information', 'Knowledge (local)', 'Listen', 'Profession', 'Search', 'Sense Motive', 'Spot'],
        'Aristocrat' => ['Appraise', 'Bluff', 'Diplomacy', 'Disguise', 'Gather Information', 'Handle Animal', 'Intimidate', 'Knowledge (local)', 'Listen', 'Perform', 'Ride', 'Sense Motive', 'Spot'],
        'Adept' => ['Concentration', 'Craft', 'Handle Animal', 'Heal', 'Knowledge (arcana)', 'Knowledge (religion)', 'Spellcraft', 'Survival'],
        'Commoner' => ['Climb', 'Craft', 'Handle Animal', 'Jump', 'Listen', 'Profession', 'Ride', 'Spot', 'Swim', 'Use Rope'],
    ];

    // Skill ability mappings
    $skillAbility = [
        'Appraise' => 'int',
        'Balance' => 'dex',
        'Bluff' => 'cha',
        'Climb' => 'str',
        'Concentration' => 'con',
        'Craft' => 'int',
        'Decipher Script' => 'int',
        'Diplomacy' => 'cha',
        'Disable Device' => 'int',
        'Disguise' => 'cha',
        'Escape Artist' => 'dex',
        'Forgery' => 'int',
        'Gather Information' => 'cha',
        'Handle Animal' => 'cha',
        'Heal' => 'wis',
        'Hide' => 'dex',
        'Intimidate' => 'cha',
        'Jump' => 'str',
        'Knowledge (arcana)' => 'int',
        'Knowledge (local)' => 'int',
        'Knowledge (nature)' => 'int',
        'Knowledge (religion)' => 'int',
        'Listen' => 'wis',
        'Move Silently' => 'dex',
        'Open Lock' => 'dex',
        'Perform' => 'cha',
        'Profession' => 'wis',
        'Ride' => 'dex',
        'Search' => 'int',
        'Sense Motive' => 'wis',
        'Sleight of Hand' => 'dex',
        'Spellcraft' => 'int',
        'Spot' => 'wis',
        'Survival' => 'wis',
        'Swim' => 'str',
        'Tumble' => 'dex',
        'Use Magic Device' => 'cha',
        'Use Rope' => 'dex',
    ];
    $abilityMods = [
        'str' => $strMod,
        'dex' => $dexMod,
        'con' => (int) floor(($con - 10) / 2),
        'int' => $intMod,
        'wis' => $wisMod,
        'cha' => $chaMod
    ];

    // ── Prioritize skills by role ──
    $roleLower = strtolower($role);
    $rolePriority = [];
    if (strpos($roleLower, 'guard') !== false || strpos($roleLower, 'soldier') !== false || strpos($roleLower, 'mercenary') !== false) {
        $rolePriority = ['Intimidate', 'Spot', 'Listen', 'Climb', 'Jump', 'Swim', 'Ride'];
    } elseif (strpos($roleLower, 'smith') !== false || strpos($roleLower, 'craft') !== false || strpos($roleLower, 'carpenter') !== false || strpos($roleLower, 'artisan') !== false) {
        $rolePriority = ['Craft', 'Appraise', 'Profession', 'Spot', 'Listen'];
    } elseif (strpos($roleLower, 'merchant') !== false || strpos($roleLower, 'trader') !== false || strpos($roleLower, 'shopkeep') !== false) {
        $rolePriority = ['Appraise', 'Diplomacy', 'Sense Motive', 'Bluff', 'Gather Information', 'Profession'];
    } elseif (strpos($roleLower, 'farmer') !== false || strpos($roleLower, 'herder') !== false) {
        $rolePriority = ['Handle Animal', 'Profession', 'Craft', 'Ride', 'Survival', 'Spot'];
    } elseif (strpos($roleLower, 'healer') !== false || strpos($roleLower, 'priest') !== false || strpos($roleLower, 'cleric') !== false) {
        $rolePriority = ['Heal', 'Knowledge (religion)', 'Concentration', 'Diplomacy', 'Spellcraft'];
    } elseif (strpos($roleLower, 'thief') !== false || strpos($roleLower, 'scout') !== false || strpos($roleLower, 'spy') !== false) {
        $rolePriority = ['Hide', 'Move Silently', 'Open Lock', 'Disable Device', 'Search', 'Spot', 'Listen', 'Tumble'];
    } elseif (strpos($roleLower, 'noble') !== false || strpos($roleLower, 'mayor') !== false || strpos($roleLower, 'leader') !== false) {
        $rolePriority = ['Diplomacy', 'Sense Motive', 'Knowledge (local)', 'Intimidate', 'Bluff', 'Gather Information', 'Ride'];
    } elseif (strpos($roleLower, 'bard') !== false || strpos($roleLower, 'entertainer') !== false || strpos($roleLower, 'minstrel') !== false) {
        $rolePriority = ['Perform', 'Diplomacy', 'Gather Information', 'Bluff', 'Tumble', 'Listen'];
    } elseif (strpos($roleLower, 'wizard') !== false || strpos($roleLower, 'mage') !== false || strpos($roleLower, 'scholar') !== false) {
        $rolePriority = ['Knowledge (arcana)', 'Spellcraft', 'Concentration', 'Decipher Script', 'Knowledge (religion)'];
    } elseif (strpos($roleLower, 'hunter') !== false || strpos($roleLower, 'tracker') !== false || strpos($roleLower, 'woodsman') !== false) {
        $rolePriority = ['Survival', 'Spot', 'Listen', 'Hide', 'Move Silently', 'Handle Animal', 'Knowledge (nature)'];
    } elseif (strpos($roleLower, 'innkeep') !== false || strpos($roleLower, 'tavern') !== false || strpos($roleLower, 'cook') !== false) {
        $rolePriority = ['Profession', 'Diplomacy', 'Gather Information', 'Sense Motive', 'Listen', 'Craft'];
    }

    // Build ordered skill list: role priorities first, then remaining class skills
    $myClassSkills = $classSkills[$className] ?? $classSkills['Commoner'];
    $orderedSkills = [];
    foreach ($rolePriority as $rp) {
        if (in_array($rp, $myClassSkills) && !in_array($rp, $orderedSkills)) {
            $orderedSkills[] = $rp;
        }
    }
    foreach ($myClassSkills as $cs) {
        if (!in_array($cs, $orderedSkills)) {
            $orderedSkills[] = $cs;
        }
    }

    // Also parse AI-suggested skills and add them if they're class skills
    if ($aiSkills) {
        $aiSkillNames = array_map('trim', preg_split('/[,;]/', $aiSkills));
        foreach ($aiSkillNames as $ais) {
            // Strip any modifiers
            $clean = preg_replace('/\s*[+-]?\d+$/', '', $ais);
            $clean = trim($clean);
            // Check if it's a valid class skill
            foreach ($myClassSkills as $cs) {
                if (stripos($cs, $clean) !== false || stripos($clean, $cs) !== false) {
                    // Move to front if not already prioritized
                    if (!in_array($cs, array_slice($orderedSkills, 0, count($rolePriority)))) {
                        $key = array_search($cs, $orderedSkills);
                        if ($key !== false) {
                            unset($orderedSkills[$key]);
                            $orderedSkills = array_values($orderedSkills);
                        }
                        array_splice($orderedSkills, count($rolePriority), 0, [$cs]);
                    }
                    break;
                }
            }
        }
    }

    // Distribute skill points — max ranks = level + 3 (class skills)
    $maxRanks = $level + 3;
    $skillRanks = [];
    $pointsLeft = $totalPoints;

    foreach ($orderedSkills as $sk) {
        if ($pointsLeft <= 0)
            break;
        // Invest proportionally: top skills get more ranks
        $invest = min($maxRanks, max(1, (int) ceil($pointsLeft / max(1, count($orderedSkills) - count($skillRanks)))));
        $invest = min($invest, $pointsLeft);
        $skillRanks[$sk] = $invest;
        $pointsLeft -= $invest;
    }

    // Spread remaining points to under-maxed skills
    while ($pointsLeft > 0) {
        $invested = false;
        foreach ($orderedSkills as $sk) {
            if ($pointsLeft <= 0)
                break;
            $current = $skillRanks[$sk] ?? 0;
            if ($current < $maxRanks) {
                $add = min($maxRanks - $current, $pointsLeft);
                $skillRanks[$sk] = $current + $add;
                $pointsLeft -= $add;
                $invested = true;
            }
        }
        if (!$invested)
            break; // All skills maxed
    }

    // Format as "Skill Name +total" (ranks + ability mod)
    $skillParts = [];
    foreach ($skillRanks as $sk => $ranks) {
        $ab = $skillAbility[$sk] ?? 'int';
        $abMod = $abilityMods[$ab] ?? 0;
        $total = $ranks + $abMod;
        $sign = $total >= 0 ? '+' : '';
        $skillParts[] = "{$sk} {$sign}{$total}";
    }
    $skillsStr = implode(', ', $skillParts);

    // ── Feats ──
    $featsStr = is_array($aiFeats) ? implode(', ', $aiFeats) : trim($aiFeats);
    if (empty($featsStr)) {
        // Pick default feats: 1 at level 1, humans get 1 extra, fighters get bonus combat feat
        $numFeats = 1;
        if (stripos($race, 'Human') !== false)
            $numFeats++;
        if (in_array($className, ['Fighter', 'Warrior']))
            $numFeats++;
        // Additional feats at levels 3, 6, 9, etc.
        $numFeats += (int) floor($level / 3);

        $combatFeats = ['Power Attack', 'Cleave', 'Weapon Focus', 'Dodge', 'Improved Initiative', 'Combat Reflexes', 'Point Blank Shot', 'Rapid Shot', 'Weapon Finesse', 'Two-Weapon Fighting'];
        $generalFeats = ['Toughness', 'Alertness', 'Endurance', 'Iron Will', 'Great Fortitude', 'Lightning Reflexes', 'Run', 'Self-Sufficient', 'Stealthy', 'Persuasive', 'Negotiator', 'Deceitful', 'Nimble Fingers', 'Athletic'];
        $casterFeats = ['Combat Casting', 'Spell Focus', 'Scribe Scroll', 'Brew Potion'];
        $skillFeats = ['Skill Focus (Craft)', 'Skill Focus (Profession)', 'Skill Focus (Heal)', 'Skill Focus (Diplomacy)', 'Skill Focus (Listen)', 'Skill Focus (Spot)'];

        $availableFeats = [];
        if (in_array($className, ['Fighter', 'Barbarian', 'Paladin', 'Ranger', 'Warrior', 'Monk'])) {
            $availableFeats = array_merge($combatFeats, $generalFeats);
        } elseif (in_array($className, ['Wizard', 'Sorcerer', 'Cleric', 'Druid', 'Adept', 'Bard'])) {
            $availableFeats = array_merge($casterFeats, $generalFeats);
        } else {
            $availableFeats = array_merge($generalFeats, $skillFeats);
        }
        shuffle($availableFeats);
        $pickedFeats = array_slice($availableFeats, 0, $numFeats);
        $featsStr = implode(', ', $pickedFeats);
    }

    // Update the character
    try {
        execute(
            'UPDATE characters SET skills_feats = ?, feats = ? WHERE id = ?',
            [$skillsStr, $featsStr, $charId],
            $uid
        );
    } catch (Exception $e) { /* non-fatal */
    }
}


/* ── Helpers ─────────────────────────────────────────────────── */
function verifyTownOwnership(int $userId, int $townId, int $dbUid = 0): void
{
    if ($townId <= 0)
        throw new Exception('Invalid town ID.');
    $rows = query('SELECT id FROM towns WHERE id = ? AND user_id = ?', [$townId, $userId], $dbUid);
    if (!$rows)
        throw new Exception('Town not found or access denied.');
}
