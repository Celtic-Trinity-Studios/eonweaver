<?php
            $townId = (int) ($input['town_id'] ?? 0);
            $charId = (int) ($input['character_id'] ?? 0);

            verifyTownOwnership($userId, $townId, $uid);

            if (!$charId)
                throw new Exception('No character ID provided.');

            $apiKey = resolveApiKey('OPENROUTER_KEY_LEVEL_UP', $userId);

            // Load character
            $chars = query('SELECT * FROM characters WHERE id = ? AND town_id = ?', [$charId, $townId], $uid);
            if (!$chars)
                throw new Exception('Character not found.');
            $char = $chars[0];

            // Resolve edition for SRD lookups
            $userSettings = query('SELECT dnd_edition FROM users WHERE id = ?', [$userId], 0);
            $dndEdition = $userSettings ? ($userSettings[0]['dnd_edition'] ?? '3.5e') : '3.5e';

            // Load SRD data
            $srdFeats = srdQuery($dndEdition, 'SELECT name, type, prerequisites FROM feats ORDER BY name');

            $featRef = '';
            $featsByType = [];
            foreach ($srdFeats as $f) {
                $type = $f['type'] ?: 'General';
                if (!isset($featsByType[$type]))
                    $featsByType[$type] = [];
                $prereq = $f['prerequisites'] ? " (Prereq: {$f['prerequisites']})" : '';
                $featsByType[$type][] = $f['name'] . $prereq;
            }
            foreach (['General', 'Fighter', 'Metamagic', 'Item Creation'] as $type) {
                if (isset($featsByType[$type])) {
                    $featRef .= "  {$type}: " . implode(', ', array_slice($featsByType[$type], 0, 40)) . "\n";
                }
            }

            // Determine current level
            $classStr = $char['class'] ?? 'Commoner 1';
            preg_match_all('/(\d+)/', $classStr, $levelMatches);
            $currentTotalLevel = 0;
            foreach ($levelMatches[1] as $lv)
                $currentTotalLevel += (int) $lv;
            if ($currentTotalLevel < 1)
                $currentTotalLevel = 1;
            $newTotalLevel = $currentTotalLevel + 1;

            // Build character JSON for the AI
            $charJson = json_encode([
                'name' => $char['name'],
                'race' => $char['race'],
                'class' => $char['class'],
                'gender' => $char['gender'],
                'age' => $char['age'],
                'alignment' => $char['alignment'],
                'hp' => $char['hp'],
                'hd' => $char['hd'],
                'ac' => $char['ac'],
                'init' => $char['init'],
                'spd' => $char['spd'],
                'str' => $char['str'],
                'dex' => $char['dex'],
                'con' => $char['con'],
                'int_' => $char['int_'],
                'wis' => $char['wis'],
                'cha' => $char['cha'],
                'saves' => $char['saves'],
                'atk' => $char['atk'],
                'feats' => $char['feats'],
                'skills_feats' => $char['skills_feats'],
                'gear' => $char['gear'],
                'languages' => $char['languages'],
                'cr' => $char['cr'],
                'role' => $char['role'],
                'history' => $char['history'],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            $prompt = "You are a D&D 3.5e rules engine. Level up this character from total level {$currentTotalLevel} to {$newTotalLevel}.\n\n";
            $prompt .= "## CURRENT CHARACTER:\n{$charJson}\n\n";
            $prompt .= "## D&D 3.5e LEVEL-UP RULES — FOLLOW EXACTLY:\n\n";
            $prompt .= "### Class Level Increase\n";
            $prompt .= "- Increase the PRIMARY class level by 1\n";
            $prompt .= "- For multiclass, increase the class that makes the most sense\n\n";
            $prompt .= "### Hit Points\n";
            $prompt .= "- Roll the class Hit Die + CON modifier (min +1 HP gain)\n";
            $prompt .= "- Hit Dice: Barbarian d12, Fighter/Paladin/Ranger/Warrior d10, Cleric/Druid/Monk d8, Rogue/Bard/Expert/Adept d6, Wizard/Sorcerer/Commoner/Aristocrat d4\n";
            $prompt .= "- Update hp and hd fields\n\n";
            $prompt .= "### Base Attack Bonus\n";
            $prompt .= "- Good BAB (+1/level): Fighter, Barbarian, Ranger, Paladin, Warrior\n";
            $prompt .= "- Medium BAB (+3/4): Cleric, Druid, Monk, Rogue, Bard, Expert, Adept\n";
            $prompt .= "- Poor BAB (+1/2): Wizard, Sorcerer, Commoner, Aristocrat\n";
            $prompt .= "- Update atk field\n\n";
            $prompt .= "### Saving Throws\n";
            $prompt .= "- Good saves: 2 + level/2\n";
            $prompt .= "- Poor saves: level/3\n";
            $prompt .= "- Update saves field\n\n";
            $prompt .= "### Skills\n";
            $prompt .= "- Allocate new skill points logically. Max ranks = level+3 for class skills\n";
            $prompt .= "- Update skills_feats field\n\n";
            $prompt .= "### Feats\n";
            $prompt .= "- New general feat at levels 3, 6, 9, 12, 15, 18\n";
            $prompt .= "- Fighter bonus feat at even class levels\n";
            $prompt .= "- Available SRD feats:\n{$featRef}\n";
            $prompt .= "- Update feats field\n\n";
            $prompt .= "### Ability Score Increase\n";
            $prompt .= "- At levels 4, 8, 12, 16, 20: +1 to ONE ability score\n\n";
            $prompt .= "### Spellcasting (if applicable)\n";
            $prompt .= "- Update spell slots/spells known\n\n";
            $prompt .= "### CR\n- Update CR\n\n";
            $prompt .= "### History\n- Append a brief training note\n\n";
            $prompt .= "## DO NOT change: name, race, gender, gear\n\n";
            $prompt .= "## RESPONSE FORMAT:\nValid JSON only. Same keys as input plus one additional key:\n- level_up_summary: A brief bullet-point summary of what changed (e.g. +5 HP rolled 4+1 CON, BAB +1 to +2, New feat: Power Attack, +1 STR level 4 ability increase)\nNo markdown fences, no explanation outside the JSON.\n";

            // Call OpenRouter
            $openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
            $payload = [
                'model' => defined('OPENROUTER_MODEL_SMART') ? OPENROUTER_MODEL_SMART : (defined('OPENROUTER_MODEL') ? OPENROUTER_MODEL : 'google/gemini-2.5-flash'),
                'messages' => [['role' => 'user', 'content' => $prompt]],
                'temperature' => 0.5,
            ];
            $ch = curl_init($openRouterUrl);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($payload),
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'Authorization: Bearer ' . $apiKey,
                ],
                CURLOPT_TIMEOUT => 120,
            ]);
            $resp = curl_exec($ch);
            $curlError = curl_error($ch);
            curl_close($ch);

            if (!$resp)
                throw new Exception("API connection failed: $curlError");
            $decoded = json_decode($resp, true);
            if (isset($decoded['error']))
                throw new Exception("API error: " . ($decoded['error']['message'] ?? 'Unknown'));

            $aiContent = $decoded['choices'][0]['message']['content'] ?? '';
            // Track token usage (hidden)
            if (!empty($decoded['usage'])) {
                trackTokenUsage($userId, $decoded['usage']);
            }
            $aiContent = preg_replace('/^\s*`+\w*\s*/i', '', trim($aiContent));
            $aiContent = preg_replace('/\s*`+\s*$/', '', $aiContent);

            $updated = json_decode($aiContent, true);
            if (!$updated)
                throw new Exception('Failed to parse AI response.');

            // Save to database
            $saveFields = [
                'class',
                'hp',
                'hd',
                'ac',
                'init',
                'spd',
                'str',
                'dex',
                'con',
                'int_',
                'wis',
                'cha',
                'saves',
                'atk',
                'feats',
                'skills_feats',
                'languages',
                'cr',
                'ecl',
                'role',
                'history'
            ];

            $sets = [];
            $params = [];
            foreach ($saveFields as $field) {
                if (isset($updated[$field]) && $updated[$field] !== null) {
                    $sets[] = "$field = ?";
                    $params[] = (string) $updated[$field];
                }
            }
            if ($sets) {
                $params[] = $charId;
                $params[] = $townId;
                query('UPDATE characters SET ' . implode(', ', $sets) . ' WHERE id = ? AND town_id = ?', $params, $uid);
            }

            // Set XP to minimum for the new level (D&D 3.5e: level*(level-1)*500)
            $minXp = $newTotalLevel * ($newTotalLevel - 1) * 500;
            query('UPDATE characters SET xp = ?, level = ? WHERE id = ? AND town_id = ?', [$minXp, $newTotalLevel, $charId, $townId], $uid);

            // Read back
            $savedChars = query('SELECT * FROM characters WHERE id = ? AND town_id = ?', [$charId, $townId], $uid);
            $savedChar = $savedChars ? $savedChars[0] : $updated;

            simRespond([
                'ok' => true,
                'character' => $savedChar,
                'old_level' => $currentTotalLevel,
                'new_level' => $newTotalLevel,
                'summary' => $updated['level_up_summary'] ?? 'Level up complete.',
            ]);

        /* ── QUICK LEVEL UP (Deterministic, no AI) ───────────── */
