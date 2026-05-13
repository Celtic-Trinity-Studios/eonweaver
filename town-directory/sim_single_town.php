<?php
            require_once __DIR__ . '/sim_prompt_lib.php';
            require_once __DIR__ . '/sim_arrival_name_pool.php';
            require_once __DIR__ . '/macro_framework_lib.php';

            $tId = (int) ($input['town_id'] ?? 0);
            $months = max(0, min(24, (int) ($input['months'] ?? 1)));
            $rules = trim($input['rules'] ?? '');
            $instructions = trim($input['instructions'] ?? '');
            if (!$tId)
                throw new Exception('Missing town_id');

            // Get API key
            $apiKey = resolveApiKey('OPENROUTER_KEY_SIM_SINGLE', $userId);

            // Verify town belongs to user
            $townRow = query('SELECT id, name, campaign_id FROM towns WHERE id = ? AND user_id = ?', [$tId, $userId], $uid);
            if (empty($townRow))
                throw new Exception('Town not found.');
            $tName = $townRow[0]['name'];

            // User settings — edition from campaign, world sim from campaign_rules
            $townCampIdSt = $townRow[0]['campaign_id'] ?? null;
            $dndEdition = '3.5e';
            if ($townCampIdSt) {
                $campRowSt = query('SELECT dnd_edition FROM campaigns WHERE id = ?', [$townCampIdSt], 0);
                if ($campRowSt) $dndEdition = $campRowSt[0]['dnd_edition'] ?? '3.5e';
            }
            if ($townCampIdSt) {
                $crSt = query('SELECT relationship_speed, birth_rate, death_threshold, child_growth, conflict_frequency FROM campaign_rules WHERE user_id = ? AND campaign_id = ?', [$userId, $townCampIdSt], 0);
            } else {
                $crSt = query('SELECT relationship_speed, birth_rate, death_threshold, child_growth, conflict_frequency FROM campaign_rules WHERE user_id = ? AND campaign_id IS NULL', [$userId], 0);
            }
            $crs = $crSt ? $crSt[0] : [];
            $relSpeed = $crs['relationship_speed'] ?? 'normal';
            $birthRate = $crs['birth_rate'] ?? 'normal';
            $deathThreshold = $crs['death_threshold'] ?? '50';
            $childGrowth = $crs['child_growth'] ?? 'realistic';
            $conflictFreq = $crs['conflict_frequency'] ?? 'occasional';
            $popText = $deathThreshold === 'unlimited' ? 'No population cap.' : "Population over {$deathThreshold} increases death rate.";

            // Town difficulty level
            $diffMetaSt = query('SELECT value FROM town_meta WHERE town_id = ? AND `key` = ?', [$tId, 'difficulty_level'], $uid);
            $diffLevelSt = $diffMetaSt ? trim($diffMetaSt[0]['value']) : 'struggling';
            $diffMultsSt = ['peaceful' => 1.0, 'struggling' => 1.5, 'frontier' => 2.0, 'warzone' => 3.0];
            $diffMultSt = $diffMultsSt[$diffLevelSt] ?? 1.5;

            // Load demographics for race distribution
            $allMetaSt = query('SELECT `key`, value FROM town_meta WHERE town_id = ?', [$tId], $uid);
            $townMetaSt = [];
            foreach ($allMetaSt as $m) $townMetaSt[$m['key']] = $m['value'];
            $demographicsSt = trim($townMetaSt['demographics'] ?? '');
            $demoTextSt = $demographicsSt ? "\nMANDATORY RACE DISTRIBUTION (set by DM — follow EXACTLY): {$demographicsSt}. Any new arrivals or births MUST match these race percentages. Do NOT generate races not listed here." : "";

            // Check for closed borders setting
            $genRulesSt = json_decode($townMetaSt['gen_rules'] ?? '{}', true) ?: [];
            $closedBordersSt = !empty($genRulesSt['closed_borders']);
            $closedBordersTextSt = $closedBordersSt ? "\nCLOSED BORDERS: This town has CLOSED BORDERS. Do NOT generate any new arrivals. The ONLY new characters allowed are births from existing romantic couples. The new_characters array should be EMPTY unless a birth occurs." : "";

            $macroFoodLineSt = ($townCampIdSt ?? null)
                ? (macroFoodEconomyPromptLine($tId, (int) $townCampIdSt) . macroFoodAutonomyDirective($tId, (int) $townCampIdSt))
                : '';

            // Build prompt
            $chars = query('SELECT * FROM characters WHERE town_id = ? ORDER BY name', [$tId], $uid);
            $hist = query('SELECT heading, content FROM history WHERE town_id = ? ORDER BY sort_order', [$tId], $uid);
            $rollingMetaRow = query('SELECT value FROM town_meta WHERE town_id = ? AND `key` = ?', [$tId, EW_SIM_ROLLING_SUMMARY_KEY], $uid);
            $rollingSummary = $rollingMetaRow ? trim((string) ($rollingMetaRow[0]['value'] ?? '')) : '';
            $rollingSummary = ew_sim_rolling_summary_maybe_seed($tId, $hist, $rollingSummary, $uid);
            $rosterText = ew_sim_tiered_roster_simple($chars, ew_sim_budget_roster_detail_cap());
            $charCount = count($chars);
            $historyText = ew_sim_prompt_history_block($hist, $rollingSummary);

            $arrivalNamePool = ew_sim_build_arrival_name_pool(
                $tId,
                $userId,
                $uid,
                $townCampIdSt ? (int) $townCampIdSt : null,
                $dndEdition,
                $chars,
                $townMetaSt,
                max(1, (int) $months),
                []
            );
            $arrivalPoolPrompt = ew_sim_arrival_pool_prompt_block($arrivalNamePool);

            if ($months === 0) {
                $prompt = "You are a D&D {$dndEdition} world manager. No time passes. Add new characters or relationships to \"{$tName}\".\n{$macroFoodLineSt}\n\nTown ({$charCount} residents):\nRoster is TOON tabular — npc_id = characters.id.\n(CRITICAL — NEW ARRIVALS: " . ew_sim_new_arrival_naming_rules() . ")\n{$arrivalPoolPrompt}\n{$rosterText}\n\nInstructions: {$instructions}\n\nRespond ONLY valid JSON with fields: summary, new_characters, new_relationships, stat_changes, xp_gains (empty), deaths (MUST be empty), role_changes, history_entry.";
            } else {
                $prompt = "You are a D&D {$dndEdition} simulation engine. Simulate {$months} month(s) in \"{$tName}\" (pop {$charCount}).\nSettings: relSpeed={$relSpeed}, birthRate={$birthRate}, deathRule={$popText}, childGrowth={$childGrowth}, conflict={$conflictFreq}\n{$demoTextSt}{$closedBordersTextSt}{$macroFoodLineSt}\nXP: Town difficulty={$diffLevelSt} (x{$diffMultSt}). Use Growth Score tags for XP.\nRules: {$rules}\nInstructions: {$instructions}\n\nRoster (TOON tabular — npc_id = database character id):\n(CRITICAL — NEW ARRIVALS: " . ew_sim_new_arrival_naming_rules() . ")\n{$arrivalPoolPrompt}\n{$rosterText}\n\nHistory:\n{$historyText}\n\nIn changes, prefer numeric character_id from roster for xp_gains, stat_changes, role_changes; character1_id/character2_id for relationships (names optional).\n\nRespond ONLY valid JSON with the standard simulation structure (summary, events, changes:{new_characters,deaths,new_relationships,xp_gains,stat_changes,role_changes}, new_history_entry).";
            }

            // LLM routing: local first, Gemini fallback
            $simText = null;
            $singleTownOrUsage = null;
            if (defined('LLAMA_HOST') && LLAMA_HOST && isLocalLLMAvailable()) {
                try {
                    $simText = callLocalLLM('[INST] ' . $prompt . ' [/INST]', (int) (LLAMA_MAX_TOKENS ?? 1024));
                } catch (Exception $le) {
                    $simText = null;
                }
            }
            if ($simText === null) {
                $openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
                $reqPayloadArr = [
                    'model' => defined('OPENROUTER_MODEL_SMART') ? OPENROUTER_MODEL_SMART : (defined('OPENROUTER_MODEL') ? OPENROUTER_MODEL : 'google/gemini-2.5-flash'),
                    'messages' => [['role' => 'user', 'content' => $prompt]],
                    'temperature' => 0.8,
                    'max_tokens' => 8192
                ];
                $payload = json_encode($reqPayloadArr);
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
                    throw new Exception("OpenRouter API error for {$tName}: " . substr($resp, 0, 100));
                $orResp = json_decode($resp, true);
                $singleTownOrUsage = $orResp['usage'] ?? null;
                $simText = $orResp['choices'][0]['message']['content'] ?? '';
                if (is_array($orResp)) {
                    ew_openrouter_log_chat_completion('sim_single_town', $reqPayloadArr, $orResp, ['town_id' => $tId, 'months' => $months]);
                }
            }
            resetDB();
            $sim = robustJsonDecode($simText);
            if ($simText !== null && $simText !== '') {
                ew_track_ai_fixed_billing(
                    $userId,
                    $singleTownOrUsage,
                    ew_pricing_sim_run_wallet_raw(max(1, $months), $charCount, 1),
                    'sim_single_town'
                );
            }
            simRespond([
                'ok' => true,
                'town_id' => $tId,
                'town_name' => $tName,
                'simulation' => $sim ?? ['error' => 'Parse failed: ' . json_last_error_msg(), 'raw' => substr($simText, 0, 300)],
                'arrival_name_pool' => $arrivalNamePool,
            ]);

        /* ═══════════════════════════════════════════════════════════
           SIMULATE WORLD — All towns for this user
           ═══════════════════════════════════════════════════════════ */
