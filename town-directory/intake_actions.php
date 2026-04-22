<?php
/**
 * Intake Actions — Two-phase character generation
 * Phase 1 (intake_roster): Generate lightweight character list in ONE AI call
 * Phase 2 (intake_flesh):  Flesh out stubs with full D&D stats + backstory
 *
 * Called from simulate.php BEFORE the switch block:
 *   if ($action === 'intake_roster' || $action === 'intake_flesh') { require ...; exit; }
 *
 * Variables available: $userId, $uid, $input, $action
 */

// ═══════════════════════════════════════════════════════════
// INTAKE ROSTER — Phase 1: Generate lightweight character list
// ═══════════════════════════════════════════════════════════
if ($action === 'intake_roster') {
    $townId = (int) ($input['town_id'] ?? 0);
    $numArrivals = max(1, min(100, (int) ($input['num_arrivals'] ?? 10)));
    $rules = trim($input['rules'] ?? '');
    $instructions = trim($input['instructions'] ?? '');

    verifyTownOwnership($userId, $townId, $uid);

    // Resolve API key
    $apiKey = resolveApiKey('OPENROUTER_KEY_INTAKE_ROSTER', $userId);

    $town = query('SELECT * FROM towns WHERE id = ?', [$townId], $uid);
    if (!$town)
        throw new Exception('Town not found.');
    $townName = $town[0]['name'];
    $intakeCampId = $town[0]['campaign_id'] ?? null;

    // Edition from campaign
    $dndEdition = '3.5e';
    if ($intakeCampId) {
        $campRowI = query('SELECT dnd_edition FROM campaigns WHERE id = ?', [$intakeCampId], 0);
        if ($campRowI) $dndEdition = $campRowI[0]['dnd_edition'] ?? '3.5e';
    }

    $characters = query('SELECT name, race, class, gender, role FROM characters WHERE town_id = ? ORDER BY name', [$townId], $uid);
    $existingNames = array_map(function ($c) {
        return $c['name'];
    }, $characters);
    $existingNamesList = !empty($existingNames) ? implode(', ', $existingNames) : '(none yet)';
    $charCount = count($characters);

    // Demographic snapshot
    $raceCounts = [];
    $classCounts = [];
    $genderCounts = ['M' => 0, 'F' => 0];
    foreach ($characters as $c) {
        $r = $c['race'] ?? 'Unknown';
        $raceCounts[$r] = ($raceCounts[$r] ?? 0) + 1;
        $cl = preg_replace('/\s+\d+$/', '', $c['class'] ?? 'Unknown');
        $classCounts[$cl] = ($classCounts[$cl] ?? 0) + 1;
        $g = strtoupper(substr($c['gender'] ?? 'M', 0, 1));
        $genderCounts[$g] = ($genderCounts[$g] ?? 0) + 1;
    }
    $demoSnap = "Current population: {$charCount}\n";
    if (!empty($raceCounts)) {
        $parts = [];
        foreach ($raceCounts as $race => $cnt)
            $parts[] = "{$race}: {$cnt}";
        $demoSnap .= "Races: " . implode(', ', $parts) . "\n";
    }
    if (!empty($classCounts)) {
        $parts = [];
        foreach ($classCounts as $cl => $cnt)
            $parts[] = "{$cl}: {$cnt}";
        $demoSnap .= "Classes: " . implode(', ', $parts) . "\n";
    }
    $demoSnap .= "Gender: M={$genderCounts['M']}, F={$genderCounts['F']}\n";

    $metaRows = query('SELECT `key`, value FROM town_meta WHERE town_id = ?', [$townId], $uid);
    $townMeta = [];
    foreach ($metaRows as $m)
        $townMeta[$m['key']] = $m['value'];
    $demographics = trim($townMeta['demographics'] ?? '');
    $biome = trim($townMeta['biome'] ?? '');
    $settlementType = trim($townMeta['settlement_type'] ?? '');
    if ($demographics)
        $demoSnap .= "\nDemographic Targets:\n{$demographics}\n";
    if ($biome)
        $demoSnap .= "\nBiome/Terrain: {$biome}\n";
    if ($settlementType)
        $demoSnap .= "\nSettlement Type: {$settlementType}\n";

    // Campaign rules scoped by campaign
    // Load gen_rules for level constraints
    $genRulesIA = json_decode($townMeta['gen_rules'] ?? '{}', true) ?: [];
    $iaIntakeLevel = isset($genRulesIA['intake_level']) ? (int) $genRulesIA['intake_level'] : 0;
    $iaMaxLevel = isset($genRulesIA['max_level']) ? (int) $genRulesIA['max_level'] : 20;
    $iaExampleLevel = $iaIntakeLevel > 0 ? $iaIntakeLevel : 1;
    if ($iaIntakeLevel > 0) {
        $iaLevelRule = "⚠️ MANDATORY: ALL new characters MUST be Level {$iaIntakeLevel}. Every class field MUST end with ' {$iaIntakeLevel}'. Do NOT generate any character at a different level.";
    } else {
        $iaLevelRule = "Most new arrivals are low-level (1-3), but occasional higher-level characters (4-6) add variety.";
    }
    if ($iaMaxLevel > 0 && $iaMaxLevel < 20) {
        $iaLevelRule .= " ⚠️ MAX LEVEL: {$iaMaxLevel}. No character may exceed this level.";
    }

    // Campaign rules scoped by campaign
    if ($intakeCampId) {
        $campaignRulesRows = query('SELECT rules_text, campaign_description FROM campaign_rules WHERE user_id = ? AND campaign_id = ?', [$userId, $intakeCampId], 0);
    } else {
        $campaignRulesRows = query('SELECT rules_text, campaign_description FROM campaign_rules WHERE user_id = ? AND campaign_id IS NULL', [$userId], 0);
    }
    $campaignRules = $campaignRulesRows ? trim($campaignRulesRows[0]['rules_text'] ?? '') : '';
    $campaignDesc = $campaignRulesRows ? trim($campaignRulesRows[0]['campaign_description'] ?? '') : '';

    // ── Load Custom (Homebrew) Content for AI prompt ──
    $customRaceRef = '';
    $customClassRef = '';
    try {
        require_once $baseDir . '/user_db.php';
        $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$userId], 0);
        $campIdIntake = $activeCamp ? (int) $activeCamp[0]['id'] : null;
        if ($campIdIntake) {
            $customRacesIntake = userQuery($userId, "SELECT name, ability_mods FROM custom_races WHERE campaign_id = ? OR campaign_id IS NULL ORDER BY name", [$campIdIntake]);
            $customClassesIntake = userQuery($userId, "SELECT name, hit_die FROM custom_classes WHERE campaign_id = ? OR campaign_id IS NULL ORDER BY name", [$campIdIntake]);
        } else {
            $customRacesIntake = userQuery($userId, "SELECT name, ability_mods FROM custom_races ORDER BY name");
            $customClassesIntake = userQuery($userId, "SELECT name, hit_die FROM custom_classes ORDER BY name");
        }
        if (!empty($customRacesIntake)) {
            $rn = array_map(function($r) { return $r['name']; }, $customRacesIntake);
            $customRaceRef = "\n- HOMEBREW RACES AVAILABLE (may also use these): " . implode(', ', $rn);
        }
        if (!empty($customClassesIntake)) {
            $cn = array_map(function($c) { return "{$c['name']} ({$c['hit_die']})"; }, $customClassesIntake);
            $customClassRef = "\n- HOMEBREW CLASSES AVAILABLE (may also use these): " . implode(', ', $cn);
        }
    } catch (Exception $e) {
        // No user DB yet — fine
    }

    $history = query('SELECT heading, content FROM history WHERE town_id = ? ORDER BY sort_order', [$townId], $uid);
    $historyText = '';
    if ($history) {
        $historyText = "\n## Town History:\n";
        foreach (array_slice($history, -5) as $h)
            $historyText .= "### {$h['heading']}\n{$h['content']}\n\n";
    }

    // Settlement type descriptions for the AI
    $settlementTypeLabels = [
        'village' => 'Village / Hamlet', 'walled_town' => 'Walled Town', 'fortress' => 'Fortress / Keep',
        'cave_system' => 'Cave System', 'underground_warren' => 'Underground Warren',
        'ruins' => 'Ruins / Abandoned Structure', 'camp' => 'Camp / Encampment',
        'nomadic' => 'Nomadic / Caravan', 'treetop' => 'Treetop Settlement',
        'floating' => 'Floating / Ship', 'burrow' => 'Burrow / Den', 'nest' => 'Nest / Hive',
        'dungeon' => 'Dungeon', 'temple' => 'Temple / Shrine Complex',
        'mine' => 'Mine / Quarry', 'tower' => 'Tower / Spire',
        'outpost' => 'Outpost / Watchtower', 'port' => 'Port / Harbor',
        'planar' => 'Planar / Extraplanar Site',
    ];
    $settlementLabel = $settlementTypeLabels[$settlementType] ?? '';
    $settlementBlock = '';
    if ($settlementLabel) {
        $settlementBlock = "\n## SETTLEMENT TYPE:\nThis location is a **{$settlementLabel}**. Generate characters/creatures appropriate for this type of settlement. Buildings, roles, and infrastructure should match this location type — NOT a standard town.\n";
    }

    $instrBlock = $instructions ? "\n## USER INSTRUCTIONS:\n{$instructions}\n" : '';
    $campDescBlock = $campaignDesc ? "\n## CAMPAIGN WORLD:\n{$campaignDesc}\n" : '';
    $biomeBlock = $biome ? "\n## BIOME:\nThis town is in a {$biome} environment. Character roles/professions should be appropriate for this terrain.\n" : '';

    // Detect whether the user is requesting creatures/monsters rather than NPCs
    $isCreatureIntake = false;
    if ($instructions) {
        // Check if instructions mention known monster/creature keywords
        $creaturePatterns = '/\b(stirge|goblin|kobold|orc|skeleton|zombie|rat|wolf|spider|bat|snake|bear|ogre|troll|undead|beast|creature|monster|animal|vermin|aberration|ooze|elemental|fiend|fey|dragon|worg|hyena|dire|ghoul|wight|wraith|bandit|gnoll|lizardfolk|bugbear|hobgoblin|minotaur|harpy|imp|demon|devil|slime|ant|scorpion|centipede|crocodile|shark|owl|hawk|eagle|plague|swarm|pest|infestation|moved? in|nest|lair|den|hive|burrow)\b/i';
        $isCreatureIntake = preg_match($creaturePatterns, $instructions);
    }

    // Race enforcement list — filled by demographics computation, applied after AI returns
    $enforcedRaceList = [];

    // ═══════════════════════════════════════════════════════════
    // STANDARD NPC MODE — Procedural generation (NO AI credits)
    // Creature intakes skip this and fall through to the AI path below
    // ═══════════════════════════════════════════════════════════
    if (!$isCreatureIntake) {
        require_once $baseDir . '/roster_generator.php';

        $existingCount = count($existingNames);
        $hasHistory = !empty($history);
        $isNewSettlement = ($existingCount === 0 && !$hasHistory);

        // Compute race enforcement list from demographics (if set)
        if ($demographics) {
            $demoParts = array_map('trim', explode(',', $demographics));
            $demoEntries = [];
            foreach ($demoParts as $part) {
                if (preg_match('/^(.+?)\s+(\d+)%?$/', trim($part), $dm)) {
                    $demoEntries[] = ['race' => trim($dm[1]), 'pct' => (int) $dm[2]];
                }
            }

            if (!empty($demoEntries)) {
                $totalPct = array_sum(array_column($demoEntries, 'pct'));
                if ($totalPct <= 0) $totalPct = 100;
                $raceCounts_tmp = [];
                $totalAssigned = 0;
                foreach ($demoEntries as $idx => $entry) {
                    $exact = ($entry['pct'] / $totalPct) * $numArrivals;
                    $floored = (int) floor($exact);
                    $raceCounts_tmp[$idx] = [
                        'race' => $entry['race'],
                        'count' => $floored,
                        'remainder' => $exact - $floored,
                    ];
                    $totalAssigned += $floored;
                }
                $remainingSlots = $numArrivals - $totalAssigned;
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
            }
        }

        // Build existing role counts for gap analysis
        $existingRoleCounts = [];
        foreach ($characters as $c) {
            $role = strtolower(trim($c['role'] ?? ''));
            if ($role) $existingRoleCounts[$role] = ($existingRoleCounts[$role] ?? 0) + 1;
        }

        // Gather custom classes from homebrew content
        $customClassData = [];
        try {
            require_once $baseDir . '/user_db.php';
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$userId], 0);
            $campIdForClasses = $activeCamp ? (int) $activeCamp[0]['id'] : null;
            if ($campIdForClasses) {
                $customClassData = userQuery($userId, "SELECT name, hit_die FROM custom_classes WHERE campaign_id = ? OR campaign_id IS NULL ORDER BY name", [$campIdForClasses]);
            } else {
                $customClassData = userQuery($userId, "SELECT name, hit_die FROM custom_classes ORDER BY name");
            }
        } catch (Exception $e) {
            // No user DB yet — fine
        }

        // Generate roster procedurally — instant, no API call
        $validRoster = generateRoster($numArrivals, [
            'existingNames'    => $existingNames,
            'enforcedRaceList' => $enforcedRaceList,
            'settlementType'   => $settlementType,
            'biome'            => $biome,
            'isNewSettlement'  => $isNewSettlement,
            'instructions'     => $instructions,
            'existingRoles'    => $existingRoleCounts,
            'genderCounts'     => $genderCounts,
            'customClasses'    => $customClassData,
        ]);

        simRespond(['ok' => true, 'roster' => $validRoster, 'town_id' => $townId, 'is_creature_intake' => false]);
    }
    // ═══════════════════════════════════════════════════════════
    // CREATURE MODE continues below (AI-based)
    // ═══════════════════════════════════════════════════════════

    if ($isCreatureIntake) {
        // CREATURE MODE — skip diversity rules, honor user instructions
        $rosterPrompt = "You are a D&D {$dndEdition} creature/monster roster generator. Generate a list of EXACTLY {$numArrivals} creatures for \"{$townName}\".
For each creature provide ONLY: name, race, class, gender, age, role, alignment.

{$campDescBlock}
{$biomeBlock}
{$settlementBlock}

## CREATURE INSTRUCTIONS:
{$instructions}

## RULES:
- Follow the user's instructions EXACTLY. If they say 'Stirges', generate Stirges. If they say 'goblins', generate Goblins.
- 'race' = the creature type (e.g. 'Stirge', 'Goblin', 'Dire Rat', 'Wolf', 'Skeleton')
- 'class' = the creature's MONSTER TYPE and Hit Dice ONLY. Do NOT assign NPC or player classes.
  * For TRUE MONSTERS/BEASTS/VERMIN: use creature type + HD, e.g. 'Magical Beast 1', 'Vermin 1', 'Aberration 3', 'Undead 2', 'Animal 2', 'Monstrous Humanoid 3'.
  * For INTELLIGENT HUMANOIDS that are traditionally monsters (goblins, kobolds, orcs, hobgoblins, bugbears, gnolls, lizardfolk): use 'Humanoid 1' — they arrive with NO class. They can take class levels later through leveling up.
  * NEVER assign Warrior, Fighter, Rogue, Commoner, Expert, or any other NPC/player class to creatures in monster intake. They get their racial HD only.
- 'name' = give each creature a simple name or identifier. For unintelligent creatures, use descriptive names like 'Stirge Alpha', 'Stirge #2', 'Scarred Stirge'. For intelligent creatures, give proper names.
- 'gender' = 'M' or 'F' (or 'N' for genderless creatures like undead, constructs, vermin)
- 'role' = what they do in this location (e.g. 'Hunter', 'Guard', 'Nest Builder', 'Alpha', 'Scout', 'Drone')
- 'alignment' = appropriate for the creature type per D&D rules
- age = approximate age in years
- EVERY creature must have a UNIQUE name.

{$campaignRules}
{$rules}

## EXISTING NAMES (DO NOT duplicate any):
{$existingNamesList}

## OUTPUT (VALID JSON ONLY — no markdown, no code fences, JUST the raw JSON array):
[{\"name\":\"Stirge Alpha\",\"race\":\"Stirge\",\"class\":\"Magical Beast 1\",\"gender\":\"N\",\"age\":2,\"role\":\"Alpha\",\"alignment\":\"N\"},...]";
    } else {
        // STANDARD NPC MODE
        $existingCount = count($existingNames);
        $hasHistory = !empty($history);
        $noBuildingsRule = '';
        if ($existingCount === 0 && !$hasHistory) {
            $noBuildingsRule = "\n- IMPORTANT: This is a BRAND NEW settlement with NO existing buildings or infrastructure. Do NOT assign roles that imply buildings exist (e.g. Baker, Innkeeper, Shopkeeper, Miner). Instead use arrival/frontier roles like: Settler, Laborer, Traveler, Drifter, Wanderer, Homesteader, Pioneer, Refugee, Pilgrim, Prospector, Scout, Forager, Herder, Trapper. Buildings are constructed over time through simulation — they do not exist yet.\n";
        }

        // Build race distribution rule from demographics (if set)
        $standardRaces = ['human', 'elf', 'dwarf', 'halfling', 'gnome', 'half-elf', 'half-orc'];
        $hasCustomDemographics = false;
        $raceRule = '- VARY races: ~50% Human, ~15% Halfling, ~10% Dwarf, ~10% Elf, ~5% Gnome, ~5% Half-Elf, ~5% Half-Orc.';
        $nameRule = 'Use WILDLY diverse naming styles. Mix Anglo (John, Margaret), Celtic (Bran, Niamh), Norse (Bjorn, Sigrid), Mediterranean (Marco, Isadora), Slavic (Dmitri, Katya), Arabic (Rashid, Fatima), East Asian (Kenji, Mei), invented fantasy, and archaic names. NO two names should share the same first syllable. Every name must feel like a DIFFERENT person from a DIFFERENT background.';
        $exampleRace = 'Human';

        if ($demographics) {
            // Parse "Goblin Kin 75%, Insect 10%, Rodent 10%, Other 5%"
            $demoParts = array_map('trim', explode(',', $demographics));
            $demoEntries = [];
            foreach ($demoParts as $part) {
                if (preg_match('/^(.+?)\s+(\d+)%?$/', trim($part), $dm)) {
                    $demoEntries[] = ['race' => trim($dm[1]), 'pct' => (int) $dm[2]];
                    // Check if any race is non-standard
                    if (!in_array(strtolower(trim($dm[1])), $standardRaces)) {
                        $hasCustomDemographics = true;
                    }
                }
            }

            if (!empty($demoEntries)) {
                // Pre-compute EXACT headcounts per race using largest-remainder method
                // This ensures the counts sum to exactly $numArrivals instead of relying
                // on the AI to interpret percentages (which it does poorly)
                $totalPct = array_sum(array_column($demoEntries, 'pct'));
                if ($totalPct <= 0) $totalPct = 100;
                $raceCounts_tmp = [];
                $totalAssigned = 0;
                foreach ($demoEntries as $idx => $entry) {
                    $exact = ($entry['pct'] / $totalPct) * $numArrivals;
                    $floored = (int) floor($exact);
                    $raceCounts_tmp[$idx] = [
                        'race' => $entry['race'],
                        'pct' => $entry['pct'],
                        'count' => $floored,
                        'remainder' => $exact - $floored,
                    ];
                    $totalAssigned += $floored;
                }
                // Distribute remaining slots to entries with largest remainders
                $remainingSlots = $numArrivals - $totalAssigned;
                if ($remainingSlots > 0) {
                    $sortedIdx = array_keys($raceCounts_tmp);
                    usort($sortedIdx, function ($a, $b) use ($raceCounts_tmp) {
                        return $raceCounts_tmp[$b]['remainder'] <=> $raceCounts_tmp[$a]['remainder'];
                    });
                    for ($ri = 0; $ri < $remainingSlots && $ri < count($sortedIdx); $ri++) {
                        $raceCounts_tmp[$sortedIdx[$ri]]['count']++;
                    }
                }
                // Build instruction string with exact counts instead of percentages
                $raceCountParts = [];
                foreach ($raceCounts_tmp as $rc) {
                    if ($rc['count'] > 0) {
                        $raceCountParts[] = "EXACTLY {$rc['count']} {$rc['race']}";
                    }
                }
                $raceCountStr = implode(', ', $raceCountParts);
                // Build flat list of race assignments for post-AI enforcement
                foreach ($raceCounts_tmp as $rc) {
                    for ($ei = 0; $ei < $rc['count']; $ei++) {
                        $enforcedRaceList[] = $rc['race'];
                    }
                }
                shuffle($enforcedRaceList); // randomize which slot gets which race
                $raceRule = "- RACE DISTRIBUTION (set by the DM — follow these EXACT COUNTS, no exceptions): {$raceCountStr}. Total must be EXACTLY {$numArrivals}. Do NOT substitute, add, or remove any races. Every character's race MUST come from this list with these exact counts.";
                $exampleRace = $demoEntries[0]['race'];
            }
        }

        // Adapt naming rules for non-standard populations
        if ($hasCustomDemographics) {
            $nameRule = 'Use names appropriate for the race/creature type. Goblins get goblin names, beasts get descriptive names, etc. VARY naming styles within each race. NO two names should follow the same pattern.';
        }
        $rosterPrompt = "You are a D&D {$dndEdition} character roster generator. Generate a list of EXACTLY {$numArrivals} new characters for \"{$townName}\".
For each character provide ONLY: name, race, class, gender, age, role, alignment.

{$campDescBlock}
{$biomeBlock}
{$settlementBlock}
## TOWN DEMOGRAPHICS:
{$demoSnap}

## CAMPAIGN RULES:
{$campaignRules}
{$rules}
{$historyText}
{$instrBlock}
## EXISTING NAMES (DO NOT duplicate any):
{$existingNamesList}

## DIVERSITY RULES:
- EVERY character must have a UNIQUE first name. Never reuse the same first name twice in this list or from the existing names.
- BANNED FIRST NAMES (the AI over-uses these — NEVER use them): Elara, Lyra, Theron, Seraphina, Kael, Aelara, Elowen, Rowan, Thorne, Astra, Kaelen, Isolde, Alaric, Lysander, Cassian, Aurelia, Selene, Eldric, Zephyr, Nyx, Orion, Sylas, Briar, Ember, Vesper, Ashwyn, Corvus, Liora, Thalion, Arianne, Elowyn, Caelum, Sable, Ravenna, Fenris, Seren, Astrid, Mira, Vera, Vex, Kira.
{$raceRule}{$customRaceRef}
- VARY classes: NPC classes DOMINATE. At least 70% should be Commoner, Expert, Warrior, Adept, or Aristocrat. Player classes (Fighter, Rogue, Cleric, Wizard, etc.) are RARE — max 1 in 10.{$customClassRef}
- VARY roles: Use roles appropriate for the settlement type and current state.{$noBuildingsRule}
- VARY names: {$nameRule}
- VARY gender: Roughly 50/50 split (unless the race/creature type has a different norm).
- VARY ages: Mix young adults, middle-aged, and elderly. Include 1-2 children if appropriate.
- class format: \"ClassName Level\" e.g. \"Expert 1\", \"Commoner 1\". {$iaLevelRule}

## OUTPUT (VALID JSON ONLY — no markdown, no code fences, JUST the raw JSON array):
[{\"name\":\"Full Name\",\"race\":\"{$exampleRace}\",\"class\":\"Warrior {$iaExampleLevel}\",\"gender\":\"M\",\"age\":34,\"role\":\"Guard\",\"alignment\":\"NG\"},...]";
    }

    $openRouterUrl = "https://openrouter.ai/api/v1/chat/completions";
    $model = defined("OPENROUTER_MODEL_CHEAP") ? OPENROUTER_MODEL_CHEAP : (defined("OPENROUTER_MODEL") ? OPENROUTER_MODEL : "google/gemini-2.5-flash");

    $payload = json_encode([
        "model" => $model,
        "messages" => [["role" => "user", "content" => $rosterPrompt]],
        "temperature" => 0.95,
        "max_tokens" => 16384
    ]);
    $ch = curl_init($openRouterUrl);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer {$apiKey}",
            "HTTP-Referer: https://eonweaver.com",
            "X-Title: Eon Weaver",
            "Content-Type: application/json"
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 90,
        CURLOPT_SSL_VERIFYPEER => true
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);
    resetDB();

    if ($httpCode !== 200 || !$response) {
        throw new Exception("Roster API error (HTTP {$httpCode}): " . ($curlErr ?: substr($response ?: '', 0, 300)));
    }

    $data = json_decode($response, true);
    $finishReason = $data["choices"][0]["finish_reason"] ?? "";
    // Track token usage (hidden)
    if (!empty($data['usage'])) {
        trackTokenUsage($userId, $data['usage']);
    }
    $respText = $data["choices"][0]["message"]["content"] ?? "";
    $respText = preg_replace('/^\s*`+\w*\s*/i', '', $respText);
    $respText = preg_replace('/\s*`+\s*$/', '', $respText);
    $respText = trim($respText);

    $roster = json_decode($respText, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        $cleaned = preg_replace('/[\x00-\x1F\x7F]/u', ' ', $respText);
        $roster = json_decode($cleaned, true);
    }

    // Truncated response recovery — try to salvage partial JSON array
    if ((!is_array($roster) || empty($roster)) && strlen($respText) > 50) {
        // Attempt 1: Find last complete object and close the array
        $lastBrace = strrpos($respText, '}');
        if ($lastBrace !== false) {
            $trimmed = substr($respText, 0, $lastBrace + 1);
            // Ensure it starts with [
            if ($trimmed[0] !== '[') $trimmed = '[' . $trimmed;
            $trimmed .= ']';
            $roster = json_decode($trimmed, true);
        }
        // Attempt 2: Extract individual objects via regex
        if (!is_array($roster) || empty($roster)) {
            preg_match_all('/\{[^{}]+\}/s', $respText, $matches);
            if (!empty($matches[0])) {
                $roster = [];
                foreach ($matches[0] as $objStr) {
                    $obj = json_decode($objStr, true);
                    if (is_array($obj) && !empty($obj['name'])) {
                        $roster[] = $obj;
                    }
                }
            }
        }
        if (!empty($roster)) {
            error_log("Intake: recovered " . count($roster) . " characters from truncated response (finish_reason={$finishReason})");
        }
    }

    if (!is_array($roster) || empty($roster)) {
        throw new Exception('Failed to parse roster: ' . json_last_error_msg() . "\n" . substr($respText, 0, 300));
    }

    // Validate and normalize
    $validRoster = [];
    foreach ($roster as $r) {
        if (empty($r['name']))
            continue;
        $entry = [
            'name' => trim($r['name']),
            'race' => trim($r['race'] ?? 'Human'),
            'class' => trim($r['class'] ?? 'Commoner 1'),
            'gender' => strtoupper(substr(trim($r['gender'] ?? 'M'), 0, 1)) === 'F' ? 'F' : 'M',
            'age' => max(0, (int) ($r['age'] ?? 25)),
            'role' => trim($r['role'] ?? ''),
            'alignment' => trim($r['alignment'] ?? 'TN'),
        ];
        // Tag creature intake entries so Phase 2 knows to skip class features
        if ($isCreatureIntake) {
            $entry['is_creature'] = true;
        }
        $validRoster[] = $entry;
    }

    // Truncate to exactly the requested count
    $validRoster = array_slice($validRoster, 0, $numArrivals);

    // ── Enforce race distribution: override AI race assignments with computed targets ──
    if (!empty($enforcedRaceList) && !$isCreatureIntake) {
        // Pad or trim the enforcement list to match the actual roster size
        $rosterLen = count($validRoster);
        while (count($enforcedRaceList) < $rosterLen) {
            $enforcedRaceList[] = $enforcedRaceList[array_rand($enforcedRaceList)];
        }
        $enforcedRaceList = array_slice($enforcedRaceList, 0, $rosterLen);
        // Override each character's race
        for ($ei = 0; $ei < $rosterLen; $ei++) {
            $validRoster[$ei]['race'] = $enforcedRaceList[$ei];
        }
    }

    // ── Enforce level from gen_rules: server-side level assignment ──
    // Roll a weighted-random level per character BEFORE sending to Phase 2 AI,
    // so the AI generates the correct number of feats/skills for the assigned level.
    if (!$isCreatureIntake) {
        for ($li = 0; $li < count($validRoster); $li++) {
            $rolledLevel = rollIntakeLevel($genRulesIA);
            $validRoster[$li]['class'] = applyLevelToClass($validRoster[$li]['class'], $rolledLevel);
        }
    }

    simRespond(['ok' => true, 'roster' => $validRoster, 'town_id' => $townId, 'is_creature_intake' => $isCreatureIntake]);
}


// ═══════════════════════════════════════════════════════════
// INTAKE FLESH OUT — Phase 2: Add stats & backstory to stubs
// ═══════════════════════════════════════════════════════════
elseif ($action === 'intake_flesh') {
    $townId = (int) ($input['town_id'] ?? 0);
    $stubs = $input['stubs'] ?? [];
    $rules = trim($input['rules'] ?? '');

    verifyTownOwnership($userId, $townId, $uid);
    if (empty($stubs))
        throw new Exception('No character stubs provided.');

    $apiKey = resolveApiKey('OPENROUTER_KEY_INTAKE_FLESH', $userId);

    $town = query('SELECT * FROM towns WHERE id = ?', [$townId], $uid);
    $townName = $town ? $town[0]['name'] : 'Unknown';

    $userSettings = query('SELECT dnd_edition FROM users WHERE id = ?', [$userId], 0);
    $dndEdition = $userSettings ? ($userSettings[0]['dnd_edition'] ?? '3.5e') : '3.5e';

    // Load SRD feats
    $srdFeats = srdQuery($dndEdition, 'SELECT name, type, prerequisites FROM feats ORDER BY name');
    $featsByType = [];
    foreach ($srdFeats as $f) {
        $type = $f['type'] ?: 'General';
        if (!isset($featsByType[$type]))
            $featsByType[$type] = [];
        $prereq = $f['prerequisites'] ? " (Prereq: {$f['prerequisites']})" : '';
        $featsByType[$type][] = $f['name'] . $prereq;
    }
    $featRef = '';
    foreach (['General', 'Fighter', 'Metamagic'] as $type) {
        if (isset($featsByType[$type])) {
            $featRef .= "  {$type}: " . implode(', ', array_slice($featsByType[$type], 0, 30)) . "\n";
        }
    }

    // Campaign rules scoped by campaign
    if ($intakeCampId) {
        $campaignRulesRows = query('SELECT rules_text, campaign_description FROM campaign_rules WHERE user_id = ? AND campaign_id = ?', [$userId, $intakeCampId], 0);
    } else {
        $campaignRulesRows = query('SELECT rules_text, campaign_description FROM campaign_rules WHERE user_id = ? AND campaign_id IS NULL', [$userId], 0);
    }
    $campaignRules = $campaignRulesRows ? trim($campaignRulesRows[0]['rules_text'] ?? '') : '';
    $campaignDesc = $campaignRulesRows ? trim($campaignRulesRows[0]['campaign_description'] ?? '') : '';

    $openRouterUrl = "https://openrouter.ai/api/v1/chat/completions";
    $model = defined("OPENROUTER_MODEL_CHEAP") ? OPENROUTER_MODEL_CHEAP : (defined("OPENROUTER_MODEL") ? OPENROUTER_MODEL : "google/gemini-2.5-flash");

    $startTime = time();
    $timeLimit = 100;
    $fleshedChars = [];

    foreach ($stubs as $stub) {
        if (time() - $startTime >= $timeLimit)
            break;

        $sn = trim($stub['name'] ?? 'Unknown');
        $sr = trim($stub['race'] ?? 'Human');
        $sc = trim($stub['class'] ?? 'Commoner 1');
        $sg = ($stub['gender'] ?? 'M');
        $sa = (int) ($stub['age'] ?? 25);
        $srl = trim($stub['role'] ?? '');
        $sal = trim($stub['alignment'] ?? 'TN');
        $isCreature = !empty($stub['is_creature']);

        $campDescLine = $campaignDesc ? "\nWorld Setting: {$campaignDesc}" : '';

        if ($isCreature) {
            // CREATURE MODE — no class features, just a backstory reason
            $fleshPrompt = "Generate creature details for this D&D {$dndEdition} creature in \"{$townName}\":
Name: {$sn} | Race/Type: {$sr} | Monster Type: {$sc} | Gender: {$sg} | Age: {$sa} | Role: {$srl} | Alignment: {$sal}
{$campDescLine}
Campaign Rules: {$campaignRules}
{$rules}

Rules:
- This is a MONSTER/CREATURE, NOT a classed character. Do NOT assign any player or NPC class.
- DO NOT generate ability scores, HP, AC, gear, or spells. The system will use the creature's standard stat block.
- Do NOT generate feats or skills — the creature uses its racial/monster abilities only.
- 'class' field must remain exactly as given: \"{$sc}\" — this represents the creature's monster type and HD.
- Generate a brief 'reason' (1-2 sentences) for why this creature is in/near {$townName}.

OUTPUT (VALID JSON ONLY, no markdown):
{\"name\":\"{$sn}\",\"race\":\"{$sr}\",\"class\":\"{$sc}\",\"gender\":\"{$sg}\",\"age\":{$sa},\"status\":\"Alive\",\"alignment\":\"{$sal}\",\"role\":\"{$srl}\",\"skills_feats\":\"\",\"feats\":\"\",\"reason\":\"...\",\"is_creature\":true}";
        } else {
            // STANDARD NPC MODE
            $fleshPrompt = "Generate character details for this D&D {$dndEdition} character in \"{$townName}\":
Name: {$sn} | Race: {$sr} | Class: {$sc} | Gender: {$sg} | Age: {$sa} | Role: {$srl} | Alignment: {$sal}
{$campDescLine}
Campaign Rules: {$campaignRules}
{$rules}

Rules:
- DO NOT generate ability scores (str/dex/con/int/wis/cha), HP, AC, ATK, gear, or spells. These are auto-calculated by the system.
- Feats: 1 at 1st level + 1 per 3 levels. Humans get 1 extra at 1st. Fighters/Warriors get bonus combat feats. Pick from valid feats:
{$featRef}
- Skills: Pick appropriate class/cross-class skills. Just list them by name.

Backstory \"reason\": 2-3 sentences — why they came to {$townName}, a personal detail/goal/secret. Tie their backstory into the world setting and town history if possible.

OUTPUT (VALID JSON ONLY, no markdown):
{\"name\":\"{$sn}\",\"race\":\"{$sr}\",\"class\":\"{$sc}\",\"gender\":\"{$sg}\",\"age\":{$sa},\"status\":\"Alive\",\"alignment\":\"{$sal}\",\"role\":\"{$srl}\",\"skills_feats\":\"Skill1, Skill2, Skill3\",\"feats\":\"Feat1, Feat2\",\"reason\":\"...\"}";
        }


        $payload = json_encode([
            "model" => $model,
            "messages" => [["role" => "user", "content" => $fleshPrompt]],
            "temperature" => 0.9,
            "max_tokens" => 1024
        ]);
        $ch2 = curl_init($openRouterUrl);
        curl_setopt_array($ch2, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => [
                "Authorization: Bearer {$apiKey}",
                "HTTP-Referer: https://eonweaver.com",
                "X-Title: Eon Weaver",
                "Content-Type: application/json"
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => true
        ]);
        $resp2 = curl_exec($ch2);
        $code2 = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
        curl_close($ch2);
        resetDB();

        if ($code2 !== 200 || !$resp2)
            continue;

        $d2 = json_decode($resp2, true);
        $t2 = $d2["choices"][0]["message"]["content"] ?? "";
        // Track token usage (hidden)
        if (!empty($d2['usage'])) {
            trackTokenUsage($userId, $d2['usage']);
        }
        $t2 = preg_replace('/^\s*`+\w*\s*/i', '', $t2);
        $t2 = preg_replace('/\s*`+\s*$/', '', $t2);
        $t2 = trim($t2);

        $parsed = json_decode($t2, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $t2clean = preg_replace('/[\x00-\x1F\x7F]/u', ' ', $t2);
            $parsed = json_decode($t2clean, true);
        }
        if ($parsed && isset($parsed['name'])) {
            $fleshedChars[] = $parsed;
        }
    }

    simRespond(['ok' => true, 'characters' => $fleshedChars, 'town_id' => $townId]);
}

// ═══════════════════════════════════════════════════════════
// INTAKE CREATURE — SRD-based monster intake (NO AI credits)
// Looks up monster in the SRD database and creates characters
// with real stat block data. Only AI used: names for multiples.
// ═══════════════════════════════════════════════════════════
elseif ($action === 'intake_creature') {
    $townId = (int) ($input['town_id'] ?? 0);
    $creatureName = trim($input['creature_name'] ?? '');
    $count = max(1, min(100, (int) ($input['count'] ?? 1)));
    $instructions = trim($input['instructions'] ?? '');

    verifyTownOwnership($userId, $townId, $uid);
    if (!$creatureName)
        throw new Exception('Creature name is required');

    // Resolve edition
    $userSettings = query('SELECT dnd_edition FROM users WHERE id = ?', [$userId], 0);
    $dndEdition = $userSettings ? ($userSettings[0]['dnd_edition'] ?? '3.5e') : '3.5e';

    // Look up ALL matching creatures in SRD using cascading search strategies
    // Strategy 1: Search by NAME
    $monsters = srdQuery($dndEdition, 'SELECT * FROM monsters WHERE name LIKE ? ORDER BY name', ["%{$creatureName}%"]);
    if (empty($monsters)) {
        $monsters = srdQuery($dndEdition, 'SELECT * FROM monsters WHERE name = ? LIMIT 1', [$creatureName]);
    }
    // Strategy 2: Search by TYPE field (e.g. "Humanoid (Goblinoid)", "Vermin", "Magical Beast")
    if (empty($monsters)) {
        $monsters = srdQuery($dndEdition, 'SELECT * FROM monsters WHERE type LIKE ? ORDER BY name', ["%{$creatureName}%"]);
    }
    // Strategy 3: Search by FAMILY field (groups related monsters)
    if (empty($monsters)) {
        $monsters = srdQuery($dndEdition, 'SELECT * FROM monsters WHERE family LIKE ? ORDER BY name', ["%{$creatureName}%"]);
    }
    // Strategy 4: Search by DESCRIPTOR field
    if (empty($monsters)) {
        $monsters = srdQuery($dndEdition, 'SELECT * FROM monsters WHERE descriptor_text LIKE ? ORDER BY name', ["%{$creatureName}%"]);
    }
    // Strategy 5: Category-to-name mappings for demographic categories
    if (empty($monsters)) {
        $categoryMap = [
            'goblinoid' => ['Goblin', 'Hobgoblin', 'Bugbear'],
            'insect' => ['Monstrous Spider', 'Monstrous Centipede', 'Monstrous Scorpion', 'Giant Ant', 'Giant Bee', 'Giant Wasp', 'Giant Beetle'],
            'bug' => ['Monstrous Spider', 'Monstrous Centipede', 'Monstrous Scorpion'],
            'arachnid' => ['Monstrous Spider', 'Monstrous Scorpion'],
            'beast' => null, // use type search below
            'vermin' => null,
            'undead' => null,
            'construct' => null,
            'plant' => null,
            'humanoid' => null,
            'aberration' => null,
            'animal' => null,
            'dragon' => null,
            'elemental' => null,
            'fey' => null,
            'giant' => null,
            'ooze' => null,
            'outsider' => null,
            'magical beast' => null,
            'monstrous humanoid' => null,
        ];
        $lowerName = strtolower($creatureName);
        if (isset($categoryMap[$lowerName])) {
            $nameList = $categoryMap[$lowerName];
            if ($nameList) {
                // Search by specific names
                $placeholders = implode(',', array_fill(0, count($nameList), '?'));
                $monsters = srdQuery($dndEdition, "SELECT * FROM monsters WHERE name IN ({$placeholders}) ORDER BY name", $nameList);
                if (empty($monsters)) {
                    // Also try LIKE for each name
                    foreach ($nameList as $n) {
                        $found = srdQuery($dndEdition, 'SELECT * FROM monsters WHERE name LIKE ? ORDER BY name', ["%{$n}%"]);
                        if (!empty($found)) $monsters = array_merge($monsters, $found);
                    }
                }
            } else {
                // null means use as-is type search (already tried), try broader
                $monsters = srdQuery($dndEdition, 'SELECT * FROM monsters WHERE type LIKE ? ORDER BY name', ["%{$lowerName}%"]);
            }
        }
    }
    if (empty($monsters)) {
        throw new Exception("Creature '{$creatureName}' not found in the SRD. Check the SRD Browser for valid monster names.");
    }


    // ── Max CR Filter: limit creatures by town's max_cr setting ──
    $maxCR = null;
    try {
        $townMeta = query('SELECT value FROM town_meta WHERE town_id = ? AND `key` = ?', [$townId, 'gen_rules'], $uid);
        if (!empty($townMeta)) {
            $genRules = json_decode($townMeta[0]['value'], true);
            if (!empty($genRules['max_cr'])) {
                $maxCR = floatval($genRules['max_cr']);
            }
        }
    } catch (Exception $e) { /* ignore */ }

    if ($maxCR !== null) {
        $monsters = array_filter($monsters, function($m) use ($maxCR) {
            $cr = $m['challenge_rating'] ?? '1';
            // Handle fractional CRs like "1/2", "1/4", "1/8"
            if (strpos($cr, '/') !== false) {
                $parts = explode('/', $cr);
                $crVal = floatval($parts[0]) / floatval($parts[1]);
            } else {
                $crVal = floatval($cr);
            }
            return $crVal <= $maxCR;
        });
        $monsters = array_values($monsters); // re-index
        if (empty($monsters)) {
            throw new Exception("No creatures found with CR ≤ {$maxCR}. Try raising the Max CR limit in Town Settings.");
        }
    }

    // Get existing names to avoid duplicates
    $existingNames = array_column(
        query('SELECT name FROM characters WHERE town_id = ?', [$townId], $uid) ?: [],
        'name'
    );
    // Alignment code lookup table (used per creature)
    $alMap = [
        'always lawful good' => 'LG', 'usually lawful good' => 'LG', 'lawful good' => 'LG',
        'always neutral good' => 'NG', 'usually neutral good' => 'NG', 'neutral good' => 'NG',
        'always chaotic good' => 'CG', 'usually chaotic good' => 'CG', 'chaotic good' => 'CG',
        'always lawful neutral' => 'LN', 'usually lawful neutral' => 'LN', 'lawful neutral' => 'LN',
        'always true neutral' => 'TN', 'always neutral' => 'TN', 'usually neutral' => 'TN', 'neutral' => 'TN',
        'always chaotic neutral' => 'CN', 'usually chaotic neutral' => 'CN', 'chaotic neutral' => 'CN',
        'always lawful evil' => 'LE', 'usually lawful evil' => 'LE', 'lawful evil' => 'LE',
        'always neutral evil' => 'NE', 'usually neutral evil' => 'NE', 'neutral evil' => 'NE',
        'always chaotic evil' => 'CE', 'usually chaotic evil' => 'CE', 'chaotic evil' => 'CE',
    ];

    // Name adjective pools
    $nameAdjectives = ['Scarred', 'Old', 'Young', 'Fierce', 'Cunning', 'Wild', 'Dark', 'Silent',
        'Swift', 'Hungry', 'Pale', 'Large', 'Small', 'Grizzled', 'Spotted', 'Gaunt',
        'Sharp', 'Mangy', 'Sleek', 'Ragged', 'Bristled', 'Crooked', 'One-Eyed',
        'Battle-Worn', 'Stout', 'Lean', 'Feral', 'Wary', 'Bold', 'Dusty'];

    // Fantasy name pools for intelligent creatures
    $goblinNames = ['Grik', 'Snag', 'Blort', 'Nix', 'Vrek', 'Zub', 'Mog', 'Skrit', 'Dreg', 'Gnak',
        'Blix', 'Rakk', 'Torv', 'Yig', 'Snik', 'Gurk', 'Plix', 'Brak', 'Zik', 'Korr',
        'Tak', 'Wurg', 'Flik', 'Snog', 'Krag', 'Plip', 'Drib', 'Glub', 'Mek', 'Jub'];
    $orcNames = ['Gruk', 'Thrak', 'Morg', 'Gash', 'Urzog', 'Brug', 'Krag', 'Droog', 'Lurtz', 'Shagrat',
        'Bolg', 'Goroth', 'Muzgash', 'Lagduf', 'Radbug', 'Ufthak', 'Snaga', 'Gorbag', 'Mauhur', 'Ugluk'];
    // Dragon-style names for intelligent dragons/drakes
    $dragonNames = ['Arxenthos', 'Vyrmaxis', 'Kaelthusar', 'Zephynax', 'Scoriath', 'Thalvex', 'Ixamond',
        'Pyralis', 'Cryovex', 'Ashendarr', 'Mordrekk', 'Glintscale', 'Umbrahex', 'Solvarix', 'Nightfang',
        'Stormjaw', 'Emberclaw', 'Frostmaw', 'Thunderwing', 'Shadowmere', 'Venomscale', 'Ironhide',
        'Blazefury', 'Cindervex', 'Duskwyrm', 'Galethax', 'Nytheros', 'Ravokk', 'Thalorr', 'Veldraxis'];

    $characters = [];
    $usedNames = $existingNames;
    $monsterCount = count($monsters);

    for ($i = 0; $i < $count; $i++) {
        // RANDOMLY select a monster from all SRD matches for each individual
        $monster = $monsters[array_rand($monsters)];

        // Parse this monster's stats
        $mName = $monster['name'] ?? $creatureName;
        $mType = $monster['type'] ?? 'Unknown';
        $mHD = $monster['hit_dice'] ?? '1d8';
        $mAC = $monster['armor_class'] ?? '10';
        $mAbilities = $monster['abilities'] ?? '';
        $mSaves = $monster['saves'] ?? '';
        $mSpeed = $monster['speed'] ?? '30 ft.';
        $mAttack = $monster['attack'] ?? '';
        $mFullAttack = $monster['full_attack'] ?? '';
        $mSpecialAtk = $monster['special_attacks'] ?? '';
        $mSpecialQual = $monster['special_qualities'] ?? '';
        $mSkills = $monster['skills'] ?? '';
        $mFeats = $monster['feats'] ?? '';
        $mAlignment = $monster['alignment'] ?? 'N';
        $mCR = $monster['challenge_rating'] ?? '1';
        $mSize = $monster['size'] ?? 'Medium';
        $mEnvironment = $monster['environment'] ?? '';
        $mBAB = $monster['base_attack'] ?? '';
        $mGrapple = $monster['grapple'] ?? '';
        $mSpace = $monster['space'] ?? '5 ft.';
        $mReach = $monster['reach'] ?? '5 ft.';

        // Parse ability scores from "Str 13, Dex 15, Con 10, Int 2, Wis 12, Cha 6" format
        $abilities = ['str' => 10, 'dex' => 10, 'con' => 10, 'int' => 10, 'wis' => 10, 'cha' => 10];
        if (preg_match_all('/\b(Str|Dex|Con|Int|Wis|Cha)\s+(\d+|-)/i', $mAbilities, $aMatches, PREG_SET_ORDER)) {
            foreach ($aMatches as $am) {
                $key = strtolower($am[1]);
                $val = ($am[2] === '-' || $am[2] === '—') ? 0 : (int) $am[2];
                if (isset($abilities[$key])) $abilities[$key] = $val;
            }
        }

        // Parse HP from hit dice like "3d8+6 (19 hp)" or "2d10 (11 hp)"
        $hp = 1;
        if (preg_match('/\((\d+)\s*hp\)/i', $mHD, $hpMatch)) {
            $hp = (int) $hpMatch[1];
        } elseif (preg_match('/(\d+)d(\d+)([+-]\d+)?/', $mHD, $hdMatch)) {
            $numDice = (int) $hdMatch[1];
            $dieSide = (int) $hdMatch[2];
            $bonus = isset($hdMatch[3]) ? (int) $hdMatch[3] : 0;
            $hp = (int) (($numDice * ($dieSide + 1)) / 2) + $bonus;
        }

        // Parse AC number
        $ac = 10;
        if (preg_match('/^(\d+)/', $mAC, $acMatch)) {
            $ac = (int) $acMatch[1];
        }

        // Condense alignment to code
        $alCode = 'TN';
        $alLower = strtolower(trim($mAlignment));
        foreach ($alMap as $phrase => $code) {
            if (strpos($alLower, $phrase) !== false) {
                $alCode = $code;
                break;
            }
        }

        // Determine HD count for "level" field
        $hdCount = 1;
        if (preg_match('/^(\d+)d/', $mHD, $hdcMatch)) {
            $hdCount = (int) $hdcMatch[1];
        }

        // Parse saves "Fort +4, Ref +6, Will +1"
        $saves = ['fort' => 0, 'ref' => 0, 'will' => 0];
        if (preg_match_all('/\b(Fort|Ref|Will)\s*([+-]?\d+)/i', $mSaves, $sMatches, PREG_SET_ORDER)) {
            foreach ($sMatches as $sm) {
                $key = strtolower($sm[1]);
                $saves[$key] = (int) $sm[2];
            }
        }

        // Build creature class string like "Magical Beast 3" (type + HD)
        $creatureClass = trim($mType) . ' ' . $hdCount;

        // Build gear/attack string
        $gearParts = [];
        if ($mAttack) $gearParts[] = "Attack: {$mAttack}";
        if ($mFullAttack && $mFullAttack !== $mAttack) $gearParts[] = "Full Attack: {$mFullAttack}";
        $gearStr = implode('; ', $gearParts);

        // Build ATK string from base_attack and grapple
        $atkStr = '';
        if ($mBAB) $atkStr .= "BAB {$mBAB}";
        if ($mGrapple) $atkStr .= ($atkStr ? ', ' : '') . "Grapple {$mGrapple}";

        // Build special abilities string for reason/backstory
        $specialParts = [];
        if ($mSpecialAtk) $specialParts[] = "Special Attacks: {$mSpecialAtk}";
        if ($mSpecialQual) $specialParts[] = "Special Qualities: {$mSpecialQual}";
        $specialStr = implode('. ', $specialParts);

        // Check if creature is intelligent (Int >= 3)
        $isIntelligent = $abilities['int'] >= 3;
        // Generate unique name
        $name = '';
        if ($count === 1) {
            $name = $mName;
        } elseif ($isIntelligent) {
            // Use fantasy names for intelligent creatures
            $nameLower = strtolower($mName);
            $namePool = $goblinNames;
            if (stripos($nameLower, 'dragon') !== false || stripos($nameLower, 'drake') !== false || stripos($nameLower, 'wyrm') !== false) {
                $namePool = $dragonNames;
            } elseif (stripos($nameLower, 'orc') !== false || stripos($nameLower, 'ogre') !== false) {
                $namePool = $orcNames;
            }
            // Pick a random name from the pool
            $attempts = 0;
            do {
                $name = $namePool[array_rand($namePool)];
                $attempts++;
                if ($attempts > 30) {
                    $name = $mName . ' #' . ($i + 1);
                    break;
                }
            } while (in_array($name, $usedNames));
        } else {
            // Descriptive name for unintelligent creatures
            if ($count <= count($nameAdjectives)) {
                $adj = $nameAdjectives[$i % count($nameAdjectives)];
                $name = "{$adj} {$mName}";
            } else {
                $name = $mName . ' #' . ($i + 1);
            }
        }

        // Ensure unique
        $baseName = $name;
        $suffix = 2;
        while (in_array($name, $usedNames)) {
            $name = "{$baseName} {$suffix}";
            $suffix++;
        }
        $usedNames[] = $name;

        // Randomize HP per individual (+/- 25% for real variation)
        $hpVariance = max(1, (int) ($hp * 0.25));
        $charHp = max(1, $hp + random_int(-$hpVariance, $hpVariance));

        $characters[] = [
            'name' => $name,
            'race' => $mName,
            'class' => $creatureClass,
            'gender' => random_int(0, 1) ? 'M' : 'F',
            'age' => random_int(1, max(2, (int) ($hdCount * 3))),
            'level' => $hdCount,
            'status' => 'Alive',
            'alignment' => $alCode,
            'role' => $instructions ?: ($isIntelligent ? 'Resident' : 'Wildlife'),
            'str' => $abilities['str'],
            'dex' => $abilities['dex'],
            'con' => $abilities['con'],
            'int_' => $abilities['int'],
            'wis' => $abilities['wis'],
            'cha' => $abilities['cha'],
            'hp' => $charHp,
            'ac' => $ac,
            'fort' => $saves['fort'],
            'ref' => $saves['ref'],
            'will' => $saves['will'],
            'atk' => $atkStr,
            'gear' => $gearStr,
            'feats' => $mFeats ?: '',
            'skills_feats' => $mSkills ?: '',
            'speed' => $mSpeed,
            'reason' => "A {$mSize} {$mType} (CR {$mCR}). {$specialStr}",
            'is_creature' => true,
        ];
    }

    // Return the monster stat block info too for the frontend confirmation
    simRespond([
        'ok' => true,
        'characters' => $characters,
        'town_id' => $townId,
        'monster_info' => [
            'name' => $creatureName . ($monsterCount > 1 ? " ({$monsterCount} varieties)" : ''),
            'type' => $mType,
            'cr' => $mCR,
            'hd' => $mHD,
            'size' => $mSize,
            'count' => count($characters),
        ]
    ]);
}

// ==========================================================
// INTAKE CUSTOM - Generate a single character from a freeform prompt
// One AI call, returns a complete character ready to save.
// ==========================================================
elseif ($action === 'intake_custom') {
    $townId = (int) ($input['town_id'] ?? 0);
    $prompt = trim($input['prompt'] ?? '');
    $levelRange = trim($input['level_range'] ?? '');

    verifyTownOwnership($userId, $townId, $uid);
    if (!$prompt)
        throw new Exception('Character description is required.');

    $apiKey = resolveApiKey('OPENROUTER_KEY_INTAKE_CUSTOM', $userId);

    $town = query('SELECT * FROM towns WHERE id = ?', [$townId], $uid);
    $townName = $town ? $town[0]['name'] : 'Unknown';
    $intakeCampId = $town ? ($town[0]['campaign_id'] ?? null) : null;

    // Edition from campaign
    $dndEdition = '3.5e';
    if ($intakeCampId) {
        $campRowI = query('SELECT dnd_edition FROM campaigns WHERE id = ?', [$intakeCampId], 0);
        if ($campRowI) $dndEdition = $campRowI[0]['dnd_edition'] ?? '3.5e';
    }

    $characters = query('SELECT name FROM characters WHERE town_id = ? ORDER BY name', [$townId], $uid);
    $existingNames = array_map(function ($c) { return $c['name']; }, $characters ?: []);
    $existingNamesList = !empty($existingNames) ? implode(', ', $existingNames) : '(none)';

    // Campaign rules scoped by campaign
    if ($intakeCampId) {
        $campaignRulesRows = query('SELECT rules_text, campaign_description FROM campaign_rules WHERE user_id = ? AND campaign_id = ?', [$userId, $intakeCampId], 0);
    } else {
        $campaignRulesRows = query('SELECT rules_text, campaign_description FROM campaign_rules WHERE user_id = ? AND campaign_id IS NULL', [$userId], 0);
    }
    $campaignRules = $campaignRulesRows ? trim($campaignRulesRows[0]['rules_text'] ?? '') : '';
    $campaignDesc = $campaignRulesRows ? trim($campaignRulesRows[0]['campaign_description'] ?? '') : '';

    $srdFeats = srdQuery($dndEdition, 'SELECT name, type, prerequisites FROM feats ORDER BY name');
    $featRef = '';
    $featsByType = [];
    foreach ($srdFeats as $f) {
        $type = $f['type'] ?: 'General';
        if (!isset($featsByType[$type])) $featsByType[$type] = [];
        $prereq = $f['prerequisites'] ? " (Prereq: {$f['prerequisites']})" : '';
        $featsByType[$type][] = $f['name'] . $prereq;
    }
    foreach (['General', 'Fighter', 'Metamagic'] as $type) {
        if (isset($featsByType[$type])) {
            $featRef .= "  {$type}: " . implode(', ', array_slice($featsByType[$type], 0, 30)) . "\n";
        }
    }

    $campDescBlock = $campaignDesc ? "\nWorld Setting: {$campaignDesc}" : '';
    $levelBlock = $levelRange ? "\nLevel Range: {$levelRange}" : '';

    $customPrompt = "You are a D&D {$dndEdition} character creator. Generate ONE complete character based on the user's description below.

## USER DESCRIPTION:
{$prompt}
{$levelBlock}

## LOCATION:
Town: \"{$townName}\"
{$campDescBlock}
{$campaignRules}

## RULES:
- Create a COMPLETE character with full ability scores (Str, Dex, Con, Int, Wis, Cha).
- Ability scores should be appropriate for the race and class. Use values between 8-18.
- HP should be calculated correctly based on class hit die + Con modifier x level.
- AC should reflect their equipment/armor.
- Generate appropriate feats. Pick from valid feats:
{$featRef}
- Generate relevant skills for their class and background.
- Give them appropriate gear/equipment for their class, level, and role.
- Write a rich 2-4 sentence backstory ('history') that ties into their description.
- Name MUST NOT duplicate any existing name: {$existingNamesList}
- 'class' format: 'ClassName Level', e.g. 'Fighter 5', 'Expert 3'.
- 'gender' must be 'M' or 'F'.
- All ability scores and hp must be NUMBERS, not strings.

## OUTPUT (VALID JSON ONLY - no markdown, no code fences, JUST the raw JSON object):
{\"name\":\"Character Name\",\"race\":\"Race\",\"class\":\"ClassName Level\",\"gender\":\"M\",\"age\":30,\"status\":\"Alive\",\"alignment\":\"NG\",\"role\":\"Role in town\",\"str\":14,\"dex\":12,\"con\":13,\"int_\":10,\"wis\":11,\"cha\":10,\"hp\":22,\"ac\":\"16\",\"init\":\"+1\",\"spd\":\"30\",\"saves\":\"Fort +4, Ref +1, Will +1\",\"skills_feats\":\"Climb +5, Intimidate +3\",\"feats\":\"Power Attack, Cleave\",\"gear\":\"longsword, chain shirt, shield\",\"languages\":\"Common, Dwarven\",\"history\":\"A brief backstory...\"}";

    $openRouterUrl = "https://openrouter.ai/api/v1/chat/completions";
    $model = defined("OPENROUTER_MODEL") ? OPENROUTER_MODEL : "google/gemini-2.5-flash";

    $payload = json_encode([
        "model" => $model,
        "messages" => [["role" => "user", "content" => $customPrompt]],
        "temperature" => 0.9,
        "max_tokens" => 2048
    ]);
    $ch = curl_init($openRouterUrl);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer {$apiKey}",
            "HTTP-Referer: https://eonweaver.com",
            "X-Title: Eon Weaver",
            "Content-Type: application/json"
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 60,
        CURLOPT_SSL_VERIFYPEER => true
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);
    resetDB();

    if ($httpCode !== 200 || !$response) {
        throw new Exception("AI API error (HTTP {$httpCode}): " . ($curlErr ?: substr($response ?: '', 0, 300)));
    }

    $data = json_decode($response, true);
    if (!empty($data['usage'])) {
        trackTokenUsage($userId, $data['usage']);
    }
    $respText = $data["choices"][0]["message"]["content"] ?? "";
    $respText = preg_replace('/^\s*`+\w*\s*/i', '', $respText);
    $respText = preg_replace('/\s*`+\s*$/', '', $respText);
    $respText = trim($respText);

    $parsed = json_decode($respText, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        $cleaned = preg_replace('/[\x00-\x1F\x7F]/u', ' ', $respText);
        $parsed = json_decode($cleaned, true);
    }
    if (!$parsed || !isset($parsed['name'])) {
        throw new Exception('Failed to parse AI response. Raw: ' . substr($respText, 0, 300));
    }

    foreach (['str', 'dex', 'con', 'int_', 'wis', 'cha', 'hp'] as $field) {
        $val = $parsed[$field] ?? ($field === 'int_' ? ($parsed['int'] ?? 10) : 10);
        $parsed[$field] = (int) $val;
    }
    if (isset($parsed['int'])) {
        if (!isset($parsed['int_']) || !$parsed['int_']) $parsed['int_'] = (int) $parsed['int'];
        unset($parsed['int']);
    }
    $parsed['status'] = $parsed['status'] ?? 'Alive';
    $parsed['age'] = (int) ($parsed['age'] ?? 25);

    simRespond(['ok' => true, 'character' => $parsed, 'town_id' => $townId]);
}
