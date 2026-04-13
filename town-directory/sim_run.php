<?php
            $townId = (int) ($input['town_id'] ?? 0);
            $months = max(0, min(24, (int) ($input['months'] ?? 1)));  // 0 = intake mode
            $days = max(0, min(30, (int) ($input['days'] ?? 0)));      // 0 = full month
            $rulesRaw = $input['rules'] ?? '';
            $rules = is_string($rulesRaw) ? trim($rulesRaw) : (is_array($rulesRaw) ? json_encode($rulesRaw) : '');
            $instructions = is_string($input['instructions'] ?? '') ? trim($input['instructions'] ?? '') : '';

            verifyTownOwnership($userId, $townId, $uid);

            // ── Token budget check (hidden) ─────────────────────
            $uTierRows = query('SELECT subscription_tier FROM users WHERE id = ?', [$userId], 0);
            $uTier = $uTierRows ? ($uTierRows[0]['subscription_tier'] ?? 'free') : 'free';
            if (checkTokenBudget($userId, $uTier)) {
                throw new Exception('You\'ve used a lot of AI this month. Usage resets on the 1st. Consider subscribing for higher limits.');
            }

            if (!defined('OPENROUTER_API_KEY') || !OPENROUTER_API_KEY) {
                // Read from user's own API key — in shared DB
                $keyRows = query("SELECT gemini_api_key FROM users WHERE id = ?", [$userId], 0);
                $apiKey = $keyRows ? ($keyRows[0]['gemini_api_key'] ?? '') : '';
                if (!$apiKey) {
                    throw new Exception('No OpenRouter API key set. Go to ⚙️ Settings to add your key.');
                }
            } else {
                $apiKey = OPENROUTER_API_KEY;
            }

            // Gather town data (per-user DB)
            $town = query('SELECT * FROM towns WHERE id = ?', [$townId], $uid);
            if (!$town)
                throw new Exception('Town not found.');
            $townName = $town[0]['name'];

            // Read user's simulation settings (shared DB)
            $userSettings = query('SELECT dnd_edition, xp_speed, relationship_speed, birth_rate, death_threshold, child_growth, conflict_frequency FROM users WHERE id = ?', [$userId], 0);
            $dndEdition = $userSettings ? ($userSettings[0]['dnd_edition'] ?? '3.5e') : '3.5e';
            $xpSpeed = $userSettings ? ($userSettings[0]['xp_speed'] ?? 'normal') : 'normal';
            $relSpeed = $userSettings ? ($userSettings[0]['relationship_speed'] ?? 'normal') : 'normal';
            $birthRate = $userSettings ? ($userSettings[0]['birth_rate'] ?? 'normal') : 'normal';
            $deathThreshold = $userSettings ? ($userSettings[0]['death_threshold'] ?? '50') : '50';
            $childGrowth = $userSettings ? ($userSettings[0]['child_growth'] ?? 'realistic') : 'realistic';
            $conflictFreq = $userSettings ? ($userSettings[0]['conflict_frequency'] ?? 'occasional') : 'occasional';

            $characters = query('SELECT * FROM characters WHERE town_id = ? ORDER BY name', [$townId], $uid);
            $history = query('SELECT heading, content FROM history WHERE town_id = ? ORDER BY sort_order', [$townId], $uid);

            // Load existing relationships so the AI knows social dynamics
            $charIdMap = [];
            $charNameMap = [];
            foreach ($characters as $c) {
                $charIdMap[$c['id']] = $c['name'];
                $charNameMap[$c['name']] = $c['id'];
            }
            $relationships = [];
            $relsByChar = [];
            if (!empty($charIdMap)) {
                $charIds = array_keys($charIdMap);
                $placeholders = implode(',', array_fill(0, count($charIds), '?'));
                $rels = query(
                    "SELECT char1_id, char2_id, rel_type, disposition, reason FROM character_relationships WHERE char1_id IN ($placeholders) OR char2_id IN ($placeholders)",
                    array_merge($charIds, $charIds),
                    $uid
                );
                foreach ($rels as $rel) {
                    $n1 = $charIdMap[$rel['char1_id']] ?? null;
                    $n2 = $charIdMap[$rel['char2_id']] ?? null;
                    if ($n1 && $n2) {
                        $relStr = "{$rel['rel_type']}(disp:{$rel['disposition']})";
                        $relsByChar[$n1][] = "{$n2}={$relStr}";
                        $relsByChar[$n2][] = "{$n1}={$relStr}";
                    }
                }
            }

            // Load SRD reference data for D&D-legal character generation (edition-specific DB)
            $srdFeats = srdQuery($dndEdition, 'SELECT name, type, prerequisites FROM feats ORDER BY name');
            $srdEquipment = srdQuery($dndEdition, 'SELECT name, category, cost, weight FROM equipment ORDER BY category, name');

            // ── Load Custom (Homebrew) Content ──────────
            require_once $baseDir . '/user_db.php';
            $customRaces = [];
            $customClasses = [];
            $customFeats = [];
            try {
                $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$userId], 0);
                $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;
                if ($campId) {
                    $customRaces = userQuery($userId, "SELECT * FROM custom_races WHERE campaign_id = ? OR campaign_id IS NULL ORDER BY name", [$campId]);
                    $customClasses = userQuery($userId, "SELECT * FROM custom_classes WHERE campaign_id = ? OR campaign_id IS NULL ORDER BY name", [$campId]);
                    $customFeats = userQuery($userId, "SELECT * FROM custom_feats WHERE campaign_id = ? OR campaign_id IS NULL ORDER BY name", [$campId]);
                } else {
                    $customRaces = userQuery($userId, "SELECT * FROM custom_races ORDER BY name");
                    $customClasses = userQuery($userId, "SELECT * FROM custom_classes ORDER BY name");
                    $customFeats = userQuery($userId, "SELECT * FROM custom_feats ORDER BY name");
                }
            } catch (Exception $e) {
                // No user DB yet — that's fine, just use SRD only
            }

            // Build custom races reference for AI prompt
            $customRaceRef = '';
            if (!empty($customRaces)) {
                $raceNames = array_map(function($r) {
                    $mods = $r['ability_mods'] ? " ({$r['ability_mods']})" : '';
                    return $r['name'] . $mods;
                }, $customRaces);
                $customRaceRef = "\n  HOMEBREW RACES AVAILABLE: " . implode(', ', $raceNames);
            }

            // Build custom classes reference for AI prompt
            $customClassRef = '';
            if (!empty($customClasses)) {
                $classNames = array_map(function($c) {
                    return "{$c['name']} ({$c['hit_die']}";
                }, $customClasses);
                $customClassRef = "\n  HOMEBREW CLASSES AVAILABLE: " . implode(', ', $classNames);
            }

            // Build curated feat list grouped by type
            $featsByType = [];
            foreach ($srdFeats as $f) {
                $type = $f['type'] ?: 'General';
                if (!isset($featsByType[$type]))
                    $featsByType[$type] = [];
                $prereq = $f['prerequisites'] ? " (Prereq: {$f['prerequisites']})" : '';
                $featsByType[$type][] = $f['name'] . $prereq;
            }
            // Add custom feats to the feat reference
            foreach ($customFeats as $cf) {
                $type = $cf['type'] ?: 'General';
                if (!isset($featsByType[$type]))
                    $featsByType[$type] = [];
                $prereq = $cf['prerequisites'] ? " (Prereq: {$cf['prerequisites']})" : '';
                $featsByType[$type][] = $cf['name'] . $prereq . ' [HOMEBREW]';
            }
            $featRef = '';
            // Prioritize relevant categories
            $featOrder = ['General', 'Fighter', 'Metamagic', 'Item Creation', 'Divine', 'Epic'];
            foreach ($featOrder as $type) {
                if (isset($featsByType[$type])) {
                    $featRef .= "  {$type}: " . implode(', ', array_slice($featsByType[$type], 0, 40)) . "\n";
                }
            }

            // Build curated equipment list grouped by category
            $equipByCategory = [];
            foreach ($srdEquipment as $e) {
                $cat = $e['category'] ?: 'General';
                if (!isset($equipByCategory[$cat]))
                    $equipByCategory[$cat] = [];
                $equipByCategory[$cat][] = $e['name'];
            }
            $equipRef = '';
            foreach ($equipByCategory as $cat => $items) {
                $equipRef .= "  {$cat}: " . implode(', ', array_slice($items, 0, 30)) . "\n";
            }

            // Build character roster for the prompt — include relationships
            $roster = [];
            foreach ($characters as $c) {
                $entry = "{$c['name']} — {$c['race']} {$c['class']}, Age {$c['age']}, {$c['gender']}";
                $entry .= ", Status: {$c['status']}";
                if ($c['spouse'] && $c['spouse'] !== 'None') {
                    $label = $c['spouse_label'] ?: 'Spouse';
                    $entry .= ", {$label}: {$c['spouse']}";
                }
                if ($c['role'])
                    $entry .= ", Role: {$c['role']}";
                $entry .= ", HP:{$c['hp']}, AC:{$c['ac']}, STR:{$c['str']}, DEX:{$c['dex']}, CON:{$c['con']}, INT:{$c['int_']}, WIS:{$c['wis']}, CHA:{$c['cha']}";
                $entry .= ", Alignment:{$c['alignment']}";
                $entry .= ", XP:{$c['xp']}";
                // Append known relationships
                if (!empty($relsByChar[$c['name']])) {
                    $entry .= ", Relationships: [" . implode('; ', $relsByChar[$c['name']]) . "]";
                }
                $roster[] = $entry;
            }

            // Build history summary
            $historyText = '';
            if ($history) {
                $historyText = "\n\n## Recent Town History:\n";
                foreach ($history as $h) {
                    $historyText .= "### {$h['heading']}\n{$h['content']}\n\n";
                }
            }

            // Population threshold text
            $popText = $deathThreshold === 'unlimited'
                ? 'There is no population cap — death rate stays natural regardless of population size.'
                : "When population exceeds {$deathThreshold} residents, increase death rate — overpopulation attracts larger predators, brings plagues, and strains resources.";

            // Town difficulty level (from town_meta)
            $difficultyMeta = query('SELECT value FROM town_meta WHERE town_id = ? AND `key` = ?', [$townId, 'difficulty_level'], $uid);
            $difficultyLevel = $difficultyMeta ? trim($difficultyMeta[0]['value']) : 'struggling';
            $diffMultipliers = ['peaceful' => 1.0, 'struggling' => 1.5, 'frontier' => 2.0, 'warzone' => 3.0];
            $diffMult = $diffMultipliers[$difficultyLevel] ?? 1.5;

            // Build the Gemini prompt
            $charCount = count($characters);
            $rosterText = implode("\n", $roster);

            if ($months === 0) {
                // ══════════════════════════════════════════════════════════
                // CHARACTER INTAKE MODE — One character per AI request
                // ══════════════════════════════════════════════════════════
                $numArrivals = max(1, min(100, (int) ($input['num_arrivals'] ?? 5)));
                $startTime = time(); // Track start time for timeout guard
                $timeLimit = 100;    // Bail before Hostinger's ~120s web server timeout

                // Gather context: existing names, demographics, campaign info
                $existingNames = array_map(function ($c) {
                    return $c['name'];
                }, $characters);

                // Load town demographics targets from town_meta
                $metaRows = query('SELECT `key`, value FROM town_meta WHERE town_id = ?', [$townId], $uid);
                $townMeta = [];
                foreach ($metaRows as $m)
                    $townMeta[$m['key']] = $m['value'];
                $demographics = trim($townMeta['demographics'] ?? '');

                // Load campaign rules
                $campaignRulesRows = query('SELECT rules_text FROM campaign_rules WHERE user_id = ?', [$userId], $uid);
                $campaignRules = $campaignRulesRows ? trim($campaignRulesRows[0]['rules_text'] ?? '') : '';

                // Build racial demographics snapshot
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
                if ($demographics) {
                    $demoSnap .= "\nDemographic Targets (set by DM):\n{$demographics}\n";
                }

                // Determine model & endpoint
                $openRouterUrl = "https://openrouter.ai/api/v1/chat/completions";
                $model = defined("OPENROUTER_MODEL_CHEAP") ? OPENROUTER_MODEL_CHEAP : (defined("OPENROUTER_MODEL") ? OPENROUTER_MODEL : "google/gemini-2.5-flash");

                // Generate characters one at a time
                $newCharacters = [];
                $failures = 0;
                $maxFailures = 5;

                for ($charIdx = 0; $charIdx < $numArrivals; $charIdx++) {
                    // Time guard: abort before Hostinger kills us with an HTML 500
                    $elapsed = time() - $startTime;
                    if ($elapsed >= $timeLimit) {
                        break; // Return whatever we have so far
                    }

                    $allNames = array_merge($existingNames, array_map(function ($c) {
                        return $c['name'];
                    }, $newCharacters));
                    $existingNamesList = !empty($allNames) ? implode(', ', $allNames) : '(none yet)';
                    $currentPop = $charCount + count($newCharacters);
                    $charNum = $charIdx + 1;

                    // Only apply user instructions to the first character;
                    // after that, emphasize DIVERSITY so we don't get 40 identical dwarf fighters
                    $instrBlock = '';
                    if ($charIdx === 0 && $instructions) {
                        $instrBlock = <<<INSTR

## USER INSTRUCTIONS (apply to THIS character ONLY):
{$instructions}
INSTR;
                    } else if ($instructions && $charIdx > 0) {
                        $instrBlock = <<<INSTR

## NOTE: The user requested specific characters (see below) but those have ALREADY been created.
## DO NOT create another character matching these instructions. Create someone COMPLETELY DIFFERENT.
## Original request (ALREADY FULFILLED): {$instructions}
INSTR;
                    }

                    // Build list of recently generated names for anti-pattern guidance
                    $recentNames = array_map(function ($c) {
                        return $c['name'];
                    }, array_slice($newCharacters, -10));
                    $namePatternWarning = '';
                    if (count($recentNames) >= 3) {
                        $namePatternWarning = "\n- CRITICAL: Recent names are: " . implode(', ', $recentNames) . ". Do NOT follow the same naming pattern. Use a COMPLETELY DIFFERENT style of name (different culture, different syllable patterns, different prefixes/suffixes).";
                    }

                    $singlePrompt = <<<SPROMPT
You are a D&D {$dndEdition} character generator. Generate exactly ONE new character for "{$townName}".
This is character #{$charNum} of {$numArrivals} being added.

## TOWN DEMOGRAPHICS:
{$demoSnap}

## CAMPAIGN SETTING:
{$campaignRules}
{$rules}

## TOWN HISTORY:
{$historyText}
{$instrBlock}

## EXISTING RESIDENTS (DO NOT duplicate any name):
{$existingNamesList}

## DEMOGRAPHIC GUIDANCE:
- Look at the current racial and class breakdown. Fill gaps (no healer? consider Adept. No smith? consider Expert blacksmith).
- Maintain gender balance. If there are more M than F, lean toward F, and vice versa.
- If the DM set demographic targets above, try to match them.
- MOST townspeople: NPC classes (Commoner, Expert, Warrior, Adept, Aristocrat). Player classes RARE (1 in 10 max).
- New characters default to Level 1, UNLESS the DM explicitly states a higher level in the instructions below.
- VARY the race! Do NOT make every character the same race. Mix Humans, Elves, Dwarves, Halflings, Gnomes, Half-Elves, Half-Orcs.{$customRaceRef}
- VARY the class! A town needs farmers, merchants, blacksmiths, bakers, tavern keepers, priests — not just fighters.{$customClassRef}{$namePatternWarning}

## NAME DIVERSITY (CRITICAL):
- Every name MUST be unique and sound DIFFERENT from existing names.
- Do NOT use the same naming conventions repeatedly (e.g., not all "Stone-" or "Iron-" prefixed dwarven names).
- Mix naming cultures: some names simple and common (Tom, Mary), some exotic, some with titles or nicknames.
- NEVER repeat a surname pattern. If there's already a "Stonefist", do NOT create "Stonehand" or "Stonebrow".

## D&D {$dndEdition} CHARACTER RULES:
- Do NOT generate ability scores (str/dex/con/int_/wis/cha), HP, AC, atk, or gear — the system calculates these automatically.
- Feats: Level 1 = 1 feat. Humans = 2 feats. Fighters/Warriors = +1 bonus combat feat. ONLY from this list:
{$featRef}
- Skills: pick appropriate class skills (Craft, Profession, Listen, etc). The system will calculate bonuses.
- Casters: list spells in the "spells" field. Non-casters: spells = "".

## BACKGROUND:
Give this character a vivid backstory in the "reason" field:
- Why they came to {$townName}, where they came from
- A personal detail, goal, or secret
- Reference the campaign setting/history if relevant
- Make them feel like a real person with a life before arriving

## OUTPUT (VALID JSON ONLY, no markdown):
{"changes":{"new_characters":[{"name":"Full Name","race":"Human","class":"Commoner 1","gender":"M","age":25,"alignment":"NG","role":"Farmer","skills_feats":"Craft (farming), Profession (farmer)","feats":"Skill Focus (Craft)","spells":"","reason":"Fled the war in the eastern provinces, seeking a quiet life. Former soldier who lost his family. Dreams of owning a plot of land."}]}}
SPROMPT;

                    $payload = json_encode([
                        "model" => $model,
                        "messages" => [["role" => "user", "content" => $singlePrompt]],
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
                        CURLOPT_TIMEOUT => 30,
                        CURLOPT_SSL_VERIFYPEER => true
                    ]);
                    $response = curl_exec($ch);
                    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    curl_close($ch);
                    resetDB();

                    if ($httpCode !== 200 || !$response) {
                        $failures++;
                        if ($failures >= $maxFailures)
                            break;
                        continue;
                    }

                    $data = json_decode($response, true);
                    // Track token usage (hidden)
                    if (!empty($data['usage'])) {
                        trackTokenUsage($userId, $data['usage']);
                    }
                    $respText = $data["choices"][0]["message"]["content"] ?? "";
                    $respText = preg_replace('/^\s*```json\s*/i', '', $respText);
                    $respText = preg_replace('/\s*```\s*$/', '', $respText);
                    $respText = trim($respText);

                    // Parse with control-char sanitization
                    $parsed = json_decode($respText, true);
                    if (json_last_error() !== JSON_ERROR_NONE) {
                        $cleaned = '';
                        $inStr = false;
                        $esc = false;
                        for ($si = 0, $slen = strlen($respText); $si < $slen; $si++) {
                            $sc = $respText[$si];
                            if ($esc) {
                                $cleaned .= $sc;
                                $esc = false;
                                continue;
                            }
                            if ($sc === '\\' && $inStr) {
                                $cleaned .= $sc;
                                $esc = true;
                                continue;
                            }
                            if ($sc === '"') {
                                $inStr = !$inStr;
                                $cleaned .= $sc;
                                continue;
                            }
                            if ($inStr && ord($sc) < 0x20) {
                                $cleaned .= ' ';
                                continue;
                            }
                            $cleaned .= $sc;
                        }
                        $parsed = json_decode($cleaned, true);
                    }

                    if (!$parsed || empty($parsed['changes']['new_characters'][0])) {
                        $failures++;
                        if ($failures >= $maxFailures)
                            break;
                        continue;
                    }

                    $newChar = $parsed['changes']['new_characters'][0];
                    // Dedup check
                    if (in_array($newChar['name'] ?? '', $allNames)) {
                        $charIdx--;
                        $failures++;
                        if ($failures >= $maxFailures)
                            break;
                        continue;
                    }
                    $newCharacters[] = $newChar;
                    $failures = 0;

                    // Update demographic counts for next iteration
                    $r = $newChar['race'] ?? 'Human';
                    $raceCounts[$r] = ($raceCounts[$r] ?? 0) + 1;
                    $cl = preg_replace('/\s+\d+$/', '', $newChar['class'] ?? 'Commoner');
                    $classCounts[$cl] = ($classCounts[$cl] ?? 0) + 1;
                    $g = strtoupper(substr($newChar['gender'] ?? 'M', 0, 1));
                    $genderCounts[$g] = ($genderCounts[$g] ?? 0) + 1;

                    // Rebuild demographic snapshot
                    $demoSnap = "Current population: " . ($charCount + count($newCharacters)) . "\n";
                    $parts = [];
                    foreach ($raceCounts as $race => $cnt)
                        $parts[] = "{$race}: {$cnt}";
                    $demoSnap .= "Races: " . implode(', ', $parts) . "\n";
                    $parts = [];
                    foreach ($classCounts as $cl2 => $cnt)
                        $parts[] = "{$cl2}: {$cnt}";
                    $demoSnap .= "Classes: " . implode(', ', $parts) . "\n";
                    $demoSnap .= "Gender: M={$genderCounts['M']}, F={$genderCounts['F']}\n";
                    if ($demographics) {
                        $demoSnap .= "\nDemographic Targets (set by DM):\n{$demographics}\n";
                    }
                }

                // Build final simulation response
                $finalCount = count($newCharacters);
                $summary = "{$finalCount} new residents have arrived in {$townName}.";
                if ($finalCount < $numArrivals) {
                    $summary .= " (AI generated {$finalCount} of {$numArrivals} requested)";
                }

                $simulation = [
                    'summary' => $summary,
                    'events' => [],
                    'changes' => [
                        'new_characters' => $newCharacters,
                        'deaths' => [],
                        'new_relationships' => [],
                        'xp_gains' => [],
                        'stat_changes' => [],
                        'role_changes' => []
                    ]
                ];

                // Intake complete — send response
                simRespond([
                    'ok' => true,
                    'simulation' => $simulation,
                    'town_id' => $townId,
                    'months' => $months
                ]);
                // Intake complete — send response (simRespond calls exit)

            } else {
                // ── Full Time Simulation ─────────────────────────────

                // Load biome and buildings for context
                $metaRows2 = query('SELECT `key`, value FROM town_meta WHERE town_id = ?', [$townId], $uid);
                $townMeta2 = [];
                foreach ($metaRows2 as $m2)
                    $townMeta2[$m2['key']] = $m2['value'];
                $biome = trim($townMeta2['biome'] ?? '');
                $settlementType2 = trim($townMeta2['settlement_type'] ?? '');
                $demographics2 = trim($townMeta2['demographics'] ?? '');
                $biomeBlock = $biome ? "\n## BIOME/TERRAIN: {$biome}\nALL buildings, resources, and infrastructure MUST be appropriate for this environment. Do NOT suggest structures that would not exist in {$biome} terrain.\n" : '';

                // Check for closed borders setting
                $genRulesJson = json_decode($townMeta2['gen_rules'] ?? '{}', true) ?: [];
                $closedBorders = !empty($genRulesJson['closed_borders']);
                $closedBordersBlock = '';
                if ($closedBorders) {
                    $closedBordersBlock = "\n## CLOSED BORDERS — NO NEW ARRIVALS\nThis town has CLOSED BORDERS. You MUST NOT generate any new arrivals in the new_characters array.\nThe ONLY exception is BIRTHS from existing romantic couples — newborn children are allowed.\nDo NOT add travelers, refugees, merchants, or any outsiders. The new_characters array should be EMPTY unless a birth occurs.\n";
                }

                // Build demographics block for simulation prompt
                $demoBlock = '';
                if ($demographics2) {
                    $demoBlock = "\n## \u26a0\ufe0f\u26a0\ufe0f\u26a0\ufe0f MANDATORY RACE DISTRIBUTION \u26a0\ufe0f\u26a0\ufe0f\u26a0\ufe0f"
                        . "\nThe DM has set STRICT race targets for this settlement. You MUST follow them for ALL new characters:"
                        . "\n{$demographics2}"
                        . "\n"
                        . "\nRULES:"
                        . "\n1. EVERY new arrival MUST be one of the races listed above."
                        . "\n2. Match the PERCENTAGES. If 'Goblin Kin 75%' then AT LEAST 3 out of 4 new characters MUST be Goblin Kin."
                        . "\n3. Do NOT generate Human, Elf, Dwarf, Halfling, Gnome, Half-Elf, Half-Orc unless explicitly in the list."
                        . "\n4. 'Other' means uncommon D&D monster races (Kobold, Bugbear, Lizardfolk, Kenku, Tiefling, etc)."
                        . "\n5. Violating these race rules makes your entire response INVALID."
                        . "\n";
                }

                // Settlement type context for full simulation
                $settlementTypeLabels2 = [
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
                $settlementLabel2 = $settlementTypeLabels2[$settlementType2] ?? '';
                $settlementBlock2 = '';
                if ($settlementLabel2) {
                    $settlementBlock2 = "\n## SETTLEMENT TYPE: {$settlementLabel2}\nThis location is a **{$settlementLabel2}**, NOT a standard town. Events, buildings, and new arrivals should be appropriate for this type of settlement. For example: a Cave System might have tunnels instead of streets, a Dungeon might have monster lairs instead of shops.\n";
                }

                $existingBuildings = query('SELECT name, status, build_progress, build_time, description FROM town_buildings WHERE town_id = ?', [$townId], $uid);
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
                $buildingContext = count($buildingLines) > 0
                    ? "## EXISTING BUILDINGS:\n" . implode("\n", $buildingLines)
                    : "## EXISTING BUILDINGS: NONE — this is empty land with no structures.";

                // Load calendar for date context in history entries
                $campId = $town[0]['campaign_id'] ?? null;
                if ($campId) {
                    $calRows = query('SELECT * FROM calendar WHERE user_id = ? AND campaign_id = ?', [$userId, $campId], $uid);
                } else {
                    $calRows = query('SELECT * FROM calendar WHERE user_id = ? AND campaign_id IS NULL', [$userId], $uid);
                }
                $calData = $calRows ? $calRows[0] : null;

                // Defaults if no calendar row exists
                $curMonth = 1;
                $curYear = 1490;
                $eraName = 'DR';
                $mpy = 12;
                $daysPerMonthArr = array_fill(0, 12, 30);
                $monthNamesList = ['Hammer', 'Alturiak', 'Ches', 'Tarsakh', 'Mirtul', 'Kythorn', 'Flamerule', 'Eleasis', 'Eleint', 'Marpenoth', 'Uktar', 'Nightal'];
                if ($calData) {
                    $curMonth = (int) ($calData['current_month'] ?? 1);
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
                    if (!empty($decoded))
                        $monthNamesList = $decoded;
                }
                // Current month's specific day count
                $daysPerMonth = $daysPerMonthArr[$curMonth - 1] ?? 30;
                $curMonthName = $monthNamesList[$curMonth - 1] ?? "Month $curMonth";

                // Build numbered month reference
                $numberedMonths = [];
                for ($mi = 0; $mi < count($monthNamesList); $mi++) {
                    $numberedMonths[] = ($mi + 1) . " = " . $monthNamesList[$mi];
                }
                $monthRef = implode(', ', $numberedMonths);

                $calBlock = <<<CAL

## ⚠️ CALENDAR — MANDATORY MONTH NAMES (DO NOT INVENT YOUR OWN):
Current date: {$curMonthName}, Year {$curYear} {$eraName}
This world has {$mpy} months per year. The month names are:
{$monthRef}

CRITICAL: You MUST use EXACTLY these month names in the new_history_entry heading and in event descriptions.
Example heading: "{$curMonthName}, {$curYear} {$eraName}: Title Here"
DO NOT invent month names like "Sunstone", "Frostfall", "Thaw", etc. Use ONLY the names listed above.
CAL;

                // ── Weather context (from town_meta) ────
                $weatherBlock = '';
                $weatherJson = $townMeta2['weather_year'] ?? '';
                if ($weatherJson) {
                    $weatherData = json_decode($weatherJson, true);
                    if ($weatherData && !empty($weatherData['months'])) {
                        // Find current month's weather
                        $curMonthWeather = null;
                        foreach ($weatherData['months'] as $wm) {
                            if (($wm['month'] ?? 0) == $curMonth) {
                                $curMonthWeather = $wm;
                                break;
                            }
                        }
                        if ($curMonthWeather) {
                            $weatherBlock = "\n## CURRENT WEATHER ({$curMonthName}):\n";
                            $weatherBlock .= "- Temperature: " . ($curMonthWeather['avg_temp'] ?? 'unknown') . "\n";
                            $weatherBlock .= "- Conditions: " . ($curMonthWeather['weather_pattern'] ?? 'unknown') . "\n";
                            $weatherBlock .= "- Precipitation: " . ($curMonthWeather['precipitation'] ?? 'unknown') . "\n";
                            if (!empty($curMonthWeather['description'])) {
                                $weatherBlock .= "- " . $curMonthWeather['description'] . "\n";
                            }
                            if (!empty($curMonthWeather['notable_events'])) {
                                $weatherBlock .= "Notable weather events: " . implode(', ', $curMonthWeather['notable_events']) . "\n";
                            }
                            $weatherBlock .= "IMPORTANT: Reference this weather in your narrative. Weather affects daily life, travel, farming, construction, and combat.\n";
                        }
                    }
                }

                // Pre-compute partial-month text for prompt
                $partialText = '';
                if ($days > 0) {
                    $partialText = " (PARTIAL: only the first {$days} days of the month — scale all events, XP, arrivals, etc. proportionally to {$days}/{$daysPerMonth} of a full month)";
                }

                $prompt = <<<PROMPT

{$demoBlock}
## SYSTEM RULES (D&D {$dndEdition}):
- All game mechanics MUST follow D&D {$dndEdition} rules exactly.

## XP GROWTH SYSTEM:
This town's difficulty level is "{$difficultyLevel}" (multiplier: x{$diffMult}).

For each character who gains XP, you MUST assign these five monthly tags:
- activity: idle / routine / active / intense (scores: 0 / 5 / 15 / 30)
- danger: none / low / moderate / high / lethal (scores: 0 / 5 / 15 / 35 / 60)
- role_pressure: none / local / leadership / crisis (scores: 0 / 5 / 15 / 30)
- personal_change: none / setback / breakthrough / transformation (scores: 0 / 5 / 15 / 30)
- class_relevance: none / partial / strong (scores: 0 / 5 / 15)

Calculate: base_xp = sum of tag scores
Then: xp_gained = floor(base_xp * {$diffMult}) + event_xp

Guidelines for event_xp (one-time monthly bonuses, use 0 for uneventful months):
- Minor deed: 5-10
- Difficult breakthrough: 10-25
- Survived serious threat: 20-50
- Defeated major threat: 50-150
- Led through disaster: 50-200

Typical monthly totals should be:
- Peaceful villager with a class: 10-25 XP
- Village specialist or guard: 25-50 XP
- Troubled settlement defender: 50-100 XP
- Frontier hero: 80-150 XP
- Major story month: 150-300 XP

NPC classes (Commoner, Expert, Warrior, Adept, Aristocrat) should ALWAYS gain LESS than PC classes in comparable situations.

DM Override: If the DM's instructions below specify exact XP for a character, honor that amount exactly.

## BRIEF CHARACTER GENERATION RULES (for any new arrivals/births):
- Do NOT generate ability scores (str/dex/con/int_/wis/cha), HP, AC, atk, or gear — the system auto-generates these.
- Most NPCs: NPC classes (Commoner, Expert, Warrior, Adept). Player classes RARE. Default Level 1 unless DM instructions specify otherwise.{$customClassRef}
- Available races: Human, Elf, Dwarf, Halfling, Gnome, Half-Elf, Half-Orc.{$customRaceRef}
- Feats: 1 at L1 (Humans 2). Use common SRD feats (Alertness, Toughness, Skill Focus, Dodge, Weapon Focus, Power Attack, etc).
- Skills: pick appropriate class skills. The system will calculate bonuses.
- NAMING: Use WILDLY diverse naming styles. Mix Anglo, Celtic, Norse, Mediterranean, Slavic, Arabic, East Asian, African, Polynesian, invented fantasy, and archaic names. NO two new characters should share the same first syllable. Every character MUST have a completely unique first AND last name not seen in the roster.
- BANNED FIRST NAMES (AI over-uses these — NEVER use): Elara, Lyra, Lyria, Theron, Seraphina, Kael, Aelara, Elowen, Rowan, Thorne, Astra, Kaelen, Isolde, Alaric, Lysander, Cassian, Aurelia, Selene, Eldric, Zephyr, Nyx, Orion, Sylas, Briar, Ember, Vesper, Corvus, Liora, Thalion, Arianne, Caelum, Ravenna, Fenris, Seren, Astrid, Mira, Vex, Kira, Caspian, Faelar, Cerys, Brynjar, Caladwen, Eamon, Rhiannon, Galen, Torin, Eira, Lirael, Aldric, Iris, Wren, Sage, Luna, Celeste, Sorrel, Ash, Raven, Dusk, Storm, Frost, Vale, Wilder, Fern, Ivy, Hazel, Cedar, Linden, Birch.
- BANNED SURNAMES (AI recycles these constantly — NEVER use): Meadowlight, Thornvale, Greenleaf, Fairfax, Brightwood, Darkhollow, Ironforge, Stormwind, Blackthorn, Silverbrook, Goldleaf, Moonshadow, Starweaver, Dawnfire, Nightshade, Willowmere, Oakenshield, Stoneheart, Frostborne, Flamecrest, Sunblade, Shadowmere, Ravenwood, Wolfbane, Hawthorne, Whitmore, Ashford, Blackwood, Redcliffe, Holloway, Dunbar, Reed, Windwalker.
- BETTER NAME EXAMPLES: Mabari Tcheko, Idris al-Fadl, Suki Tanabe, Bogdan Kreshnik, Njeri Oduya, Piotr Skaraborg, Ximena Cuervo, Tahani zo Nkosi, Dragan Vulic, Umeko Hashi, Fiachna mac Dara, Kalindi Deshpande, Oskar Hulgaard.
## WORLD SIMULATION SETTINGS:
- Relationship Formation Speed: {$relSpeed}. Characters forge relationships over time — romantic, friendly, AND hostile.
- Birth Rate: {$birthRate}. Births require an ESTABLISHED romantic relationship of at least 9 months PLUS race-appropriate gestation (Human ~9mo, Elf ~12mo, Dwarf ~12mo, Halfling ~8mo). Do NOT generate births unless a couple clearly had enough time together. One-night stands producing fatherless children are uncommon but possible. For new settlements or short simulations, births should be VERY rare.
- Child Growth: {$childGrowth}.
- Population & Death: {$popText} Current population: {$charCount}.
- Conflict & Events Frequency: {$conflictFreq}. This controls how often dangerous and dramatic events occur.
{$biomeBlock}
{$settlementBlock2}
{$buildingContext}
{$calBlock}
{$weatherBlock}

## BUILDING & CONSTRUCTION RULES:
- The town ONLY has the buildings listed above. Do NOT assume buildings exist that are not listed.
- Each month you MUST propose 1-3 building changes using the building_changes array.
- Actions: "start" (begin new construction), "progress" (advance an under_construction building by 1 month), "complete" (mark a building finished — only when build_progress reaches build_time).
- Build times: Small structures (shed, well, fence, lean-to): 1 month. Medium (house, shop, smithy, bakery): 2-3 months. Large (temple, barracks, mill, inn): 4-6 months.
- When starting: provide build_time (integer months) and a brief description.
- When progressing: just name the building and use action "progress".
- A settlement NEEDS shelter, water, and food production FIRST. Then workshops, then community buildings.
- If buildings are under_construction, you MUST progress them each month until complete.

## MANDATORY: FAMILY & RELATIONSHIP TRACKING
This is CRITICAL — the town tracks a SOCIAL WEB of relationships. You MUST follow these rules:

### When a child is born:
1. Create the child as a new_character with age 0, race matching parent(s), Commoner 1.
2. You MUST add TWO new_relationships entries:
   - {"char1": "Parent1 Name", "char2": "Child Name", "type": "parent", "reason": "Born to Parent1 and Parent2"}
   - {"char1": "Parent2 Name", "char2": "Child Name", "type": "parent", "reason": "Born to Parent1 and Parent2"}
3. If the parents are not already in a relationship, also create their romantic relationship.
4. Set the child's spouse to "None" and spouse_label to "".

### Relationship types (use these EXACT strings for "type"):
- "romantic" — couples, lovers, betrothed
- "parent" — parent-to-child (the char1 is the parent, char2 is the child)
- "friend" — close friends, allies, drinking buddies
- "rival" — professional competitors, jealous neighbours, people who dislike each other
- "enemy" — hatred, blood feuds, bitter grudges
- "mentor" — master/apprentice, teacher/student
- "ally" — political or professional allies who aren't necessarily friends

## MANDATORY: CONFLICT, DRAMA & STRIFE
A realistic town is NOT a utopia. You MUST include conflict and tension:

### REQUIREMENTS (scaled to conflict setting: {$conflictFreq}):
- At MINIMUM, every simulation MUST generate at least 1-2 NEGATIVE events or relationships.
- Create RIVALRIES, ENEMIES, PROBLEMS.
- The AI MUST NOT make everyone friends. A town with zero enemies/rivals is UNREALISTIC.
- Evil-aligned characters SHOULD scheme, steal, manipulate, or cause harm.
- Chaotic characters should buck authority and break rules sometimes.

### VARIETY in Relationship Formation:
- 30-40% negative (rival, enemy)
- 30-40% platonic (friend, ally, mentor)
- 20-30% romantic

## Current Residents ({$charCount} characters):
(CRITICAL: Do NOT reuse any first names from this roster for new arrivals. Every new character MUST have a unique first name not seen below. Also do NOT use any BANNED names listed above.)
{$rosterText}
{$historyText}

## Campaign Rules:
{$rules}

## Additional Instructions for this Simulation:
{$instructions}

{$closedBordersBlock}
{$demoBlock}
## Your Task:
Simulate {$months} month(s){$partialText} of time passing. You MUST include:
- XP gains, new relationships (positive AND negative), births, deaths, drama, events, role changes.
- Use the CALENDAR MONTH NAMES (not "Month 1") in all history entries and event descriptions.

## ⚠️ DEATH SYSTEM — HOW DEATHS WORK:
You do NOT pick specific characters to die. Instead, describe the death scenario and what KIND of person dies.
The system will automatically match the best fitting character from the roster.
Provide: reason (narrative), plus optional matching hints: preferred_class, preferred_role, age_category, preferred_alignment.
- age_category: "elderly" (50+), "adult" (18-49), "young" (0-17), or "any"
- preferred_class: e.g. "Commoner", "Warrior", "Expert"
- preferred_role: e.g. "Guard", "Farmer", "Blacksmith"
- preferred_alignment: e.g. "CE", "NG" — useful for deaths caused by villainy or heroism
The system will find the best match. If no match exists, the death is skipped.

## CRITICAL: Output Format
You MUST respond with ONLY a valid JSON object (no markdown, no code fences, JUST the raw JSON) in this exact structure:
{
  "summary": "1-2 paragraph narrative summary",
  "events": [{"month": 1, "description": "What happened"}],
  "changes": {
    "new_characters": [{"name":"Full Name","race":"Human","class":"Commoner 1","gender":"M or F","age":25,"alignment":"NG","role":"Farmer","skills_feats":"Craft, Profession","feats":"Skill Focus","reason":"Born to... / Arrived..."}],
    "deaths": [{"reason":"Died of old age, passing peacefully","preferred_class":"Commoner","age_category":"elderly"},{"reason":"Killed by wolves while on patrol","preferred_class":"Warrior","preferred_role":"Guard","age_category":"adult"}],
    "new_relationships": [{"char1":"Name","char2":"Name","type":"rival","reason":"Why"}],
    "xp_gains": [{"name":"Character Name","xp_gained":65,"reason":"What they did","tags":{"activity":"active","danger":"moderate","role_pressure":"leadership","personal_change":"none","class_relevance":"strong"}}],
    "stat_changes": [{"name":"Character Name","field":"hp","old_value":"10","new_value":"12","reason":"Why"}],
    "role_changes": [{"name":"Character Name","old_role":"Farmer","new_role":"Guard","reason":"Why"}],
    "building_changes": [{"action":"start","name":"Communal Shelter","build_time":2,"description":"A large thatched-roof shelter for the settlers"},{"action":"progress","name":"Well"},{"action":"complete","name":"Palisade Fence"}]
  },
  "new_history_entry": {"heading":"Hammer, 1490 DR: Title of Events","content":"Detailed narrative using calendar month names"}
}

REMINDER: In xp_gains, stat_changes, role_changes, and new_relationships — ALL character names MUST be copied EXACTLY from the "Current Residents" roster above. Deaths use criteria-based matching, so no name is needed.
PROMPT;
            } // end if($months===0) else

            // ── LLM: prefer local first, fall back to OpenRouter ────────────
            $text = null;
            $llmSource = "gemini";

            if (defined("LLAMA_HOST") && LLAMA_HOST && isLocalLLMAvailable()) {
                $llamaPrompt = "[INST] " . $prompt . " [/INST]";
                $text = callLocalLLM($llamaPrompt, 4096);
                $llmSource = "local";
                resetDB();
            }

            if ($text === null) {
                // Fall back to OpenRouter
                $openRouterUrl = "https://openrouter.ai/api/v1/chat/completions";
                $model = defined("OPENROUTER_MODEL_CHEAP") ? OPENROUTER_MODEL_CHEAP : (defined("OPENROUTER_MODEL") ? OPENROUTER_MODEL : "google/gemini-2.5-flash-lite");
                $maxTok = 65536;
                $payload = json_encode([
                    "model" => $model,
                    "messages" => [["role" => "user", "content" => $prompt]],
                    "temperature" => 0.8,
                    "max_tokens" => $maxTok
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
                    CURLOPT_TIMEOUT => 180,
                    CURLOPT_SSL_VERIFYPEER => true
                ]);
                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $curlErr = curl_error($ch);
                curl_close($ch);
                resetDB();

                if ($httpCode !== 200) {
                    throw new Exception("OpenRouter API error (HTTP {$httpCode}): " . substr($response, 0, 500));
                }
                $data = json_decode($response, true);
                // Track token usage (hidden)
                if (!empty($data['usage'])) {
                    trackTokenUsage($userId, $data['usage']);
                }
                $text = $data["choices"][0]["message"]["content"] ?? "";
            }

            // ── Parse JSON response ───────────────────────────────────
            $simulation = robustJsonDecode($text);

            if ($simulation === null) {
                throw new Exception('Failed to parse Gemini response as JSON: ' . json_last_error_msg() . "\n\nRaw response:\n" . substr($text, 0, 500));
            }

            simRespond([
                'ok' => true,
                'simulation' => $simulation,
                'town_id' => $townId,
                'months' => $months
            ]);

        /* ═══════════════════════════════════════════════════════════
           APPLY SIMULATION — Write approved changes to DB
           ═══════════════════════════════════════════════════════════ */
