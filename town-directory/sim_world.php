<?php
            $months = max(0, min(24, (int) ($input['months'] ?? 1)));
            $rules = trim($input['rules'] ?? '');
            $instructions = trim($input['instructions'] ?? '');

            // Get API key
            $apiKey = resolveApiKey('OPENROUTER_KEY_SIM_WORLD', $userId);

            // Get user settings — edition from active campaign, world sim from campaign_rules
            $activeCampW = query('SELECT id, dnd_edition FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$userId], 0);
            $dndEdition = $activeCampW ? ($activeCampW[0]['dnd_edition'] ?? '3.5e') : '3.5e';
            $activeCampIdW = $activeCampW ? (int) $activeCampW[0]['id'] : null;
            // Load campaign-scoped world sim settings from campaign_rules
            if ($activeCampIdW) {
                $crRowsW = query('SELECT relationship_speed, birth_rate, death_threshold, child_growth, conflict_frequency FROM campaign_rules WHERE user_id = ? AND campaign_id = ?', [$userId, $activeCampIdW], 0);
            } else {
                $crRowsW = query('SELECT relationship_speed, birth_rate, death_threshold, child_growth, conflict_frequency FROM campaign_rules WHERE user_id = ? AND campaign_id IS NULL', [$userId], 0);
            }
            $crW = $crRowsW ? $crRowsW[0] : [];
            $relSpeed = $crW['relationship_speed'] ?? 'normal';
            $birthRate = $crW['birth_rate'] ?? 'normal';
            $deathThreshold = $crW['death_threshold'] ?? '50';
            $childGrowth = $crW['child_growth'] ?? 'realistic';
            $conflictFreq = $crW['conflict_frequency'] ?? 'occasional';

            // Loop all user towns (filter by active campaign if available)
            $allTowns = query('SELECT id, name FROM towns WHERE user_id = ? AND (is_party_base = 0 OR is_party_base IS NULL)' . ($activeCampIdW ? ' AND campaign_id = ?' : ''), $activeCampIdW ? [$userId, $activeCampIdW] : [$userId], $uid);
            if (empty($allTowns))
                throw new Exception('No towns found to simulate.');

            $popText = $deathThreshold === 'unlimited'
                ? 'No population cap.'
                : "Population over {$deathThreshold} increases death rate.";

            $results = [];
            foreach ($allTowns as $town) {
                $tId = (int) $town['id'];
                $tName = $town['name'];
                $chars = query('SELECT * FROM characters WHERE town_id = ? ORDER BY name', [$tId], $uid);
                $hist = query('SELECT heading, content FROM history WHERE town_id = ? ORDER BY sort_order', [$tId], $uid);

                $metaRows = query('SELECT `key`, value FROM town_meta WHERE town_id = ?', [$tId], $uid);
                $townMeta = [];
                foreach ($metaRows as $m)
                    $townMeta[$m['key']] = $m['value'];
                $demographics = trim($townMeta['demographics'] ?? '');
                $demoText = $demographics ? "\nMANDATORY RACE DISTRIBUTION (set by DM — follow EXACTLY): {$demographics}. Any new arrivals or births MUST match these race percentages. Do NOT generate races not listed here." : "";

                // Per-town difficulty level
                $diffLevelAll = trim($townMeta['difficulty_level'] ?? 'struggling');
                $diffMultsAll = ['peaceful' => 1.0, 'struggling' => 1.5, 'frontier' => 2.0, 'warzone' => 3.0];
                $diffMultAll = $diffMultsAll[$diffLevelAll] ?? 1.5;

                $roster = [];
                foreach ($chars as $c) {
                    $e = "{$c['name']} — {$c['race']} {$c['class']}, Age {$c['age']}, {$c['gender']}";
                    $e .= ", Status:{$c['status']}";
                    if ($c['spouse'] && $c['spouse'] !== 'None')
                        $e .= ", {$c['spouse_label']}:{$c['spouse']}";
                    if ($c['role'])
                        $e .= ", Role:{$c['role']}";
                    $e .= ", XP:{$c['xp']}, HP:{$c['hp']}, AC:{$c['ac']}";
                    $roster[] = $e;
                }
                $rosterText = implode("\n", $roster);
                $charCount = count($chars);
                $historyText = '';
                foreach ($hist as $h)
                    $historyText .= "### {$h['heading']}\n{$h['content']}\n\n";

                if ($months === 0) {
                    $prompt = "You are a D&D {$dndEdition} world manager. No time passes. Add new characters or relationships to \"{$tName}\".\n{$demoText}\nAll new characters MUST start at exactly Level 1 (0 XP) unless instructions override.\nTown ({$charCount} residents):\n(CRITICAL: Do NOT reuse names from this roster. Use highly unique D&D names.)\n{$rosterText}\n\nInstructions: {$instructions}\n\nRespond ONLY valid JSON with fields: summary, new_characters, new_relationships, stat_changes, xp_gains (empty), deaths (MUST be empty), role_changes, history_entry.";
                } else {
                    $prompt = "You are a D&D {$dndEdition} simulation engine. Simulate {$months} month(s) in \"{$tName}\" (pop {$charCount}).\nSettings: relSpeed={$relSpeed}, birthRate={$birthRate}, deathRule={$popText}, childGrowth={$childGrowth}, conflict={$conflictFreq}\n{$demoText}\nAll new characters MUST start at exactly Level 1 (0 XP) unless instructions override.\nXP: Town difficulty={$diffLevelAll} (x{$diffMultAll}). Use Growth Score tags for XP.\nRules: {$rules}\nInstructions: {$instructions}\n\nRoster:\n(CRITICAL: Do NOT reuse names from this roster. Use highly unique D&D names.)\n{$rosterText}\n\nHistory:\n{$historyText}\n\nRespond ONLY valid JSON with the standard simulation structure (summary, events, changes:{new_characters,deaths,new_relationships,xp_gains,stat_changes,role_changes}, new_history_entry).";
                }

                // ── LLM routing: local first, Gemini fallback ──
                $simText = null;
                if (defined('LLAMA_HOST') && LLAMA_HOST && isLocalLLMAvailable()) {
                    try {
                        $simText = callLocalLLM('[INST] ' . $prompt . ' [/INST]', 4096);
                    } catch (Exception $le) {
                        $simText = null; // fall through to Gemini
                    }
                }
                if ($simText === null) {
                    $openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
                    $payload = json_encode([
                        'model' => defined('OPENROUTER_MODEL_SMART') ? OPENROUTER_MODEL_SMART : (defined('OPENROUTER_MODEL') ? OPENROUTER_MODEL : 'google/gemini-2.5-flash'),
                        'messages' => [['role' => 'user', 'content' => $prompt]],
                        'temperature' => 0.8,
                        'max_tokens' => 32768
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
                        CURLOPT_TIMEOUT => 120,
                        CURLOPT_SSL_VERIFYPEER => true
                    ]);
                    $resp = curl_exec($ch);
                    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    curl_close($ch);
                    resetDB();
                    if ($code !== 200) {
                        $results[] = ['town_id' => $tId, 'town_name' => $tName, 'error' => 'OpenRouter API error for this town'];
                        continue;
                    }
                    $orResp = json_decode($resp, true);
                    $simText = $orResp['choices'][0]['message']['content'] ?? '';
                    // Track token usage (hidden)
                    if (!empty($orResp['usage'])) {
                        trackTokenUsage($userId, $orResp['usage']);
                    }
                }
                resetDB();
                $sim = robustJsonDecode($simText);
                $results[] = ['town_id' => $tId, 'town_name' => $tName, 'simulation' => $sim ?? ['error' => 'Parse failed: ' . json_last_error_msg(), 'raw' => substr($simText, 0, 200)]];
            }

            simRespond(['ok' => true, 'simulations' => $results, 'months' => $months]);

        /* ═══════════════════════════════════════════════════════════
           GENERATE PORTRAIT PROMPT — Use LLM to create an AI image prompt
           ═══════════════════════════════════════════════════════════ */
