<?php
            $townId = (int) ($input['town_id'] ?? 0);
            $changes = $input['changes'] ?? [];

            verifyTownOwnership($userId, $townId, $uid);

            // Resolve D&D edition for SRD queries
            $userSettings = query('SELECT dnd_edition FROM users WHERE id = ?', [$userId], 0);
            $dndEdition = $userSettings ? ($userSettings[0]['dnd_edition'] ?? '3.5e') : '3.5e';

            $applied = ['new_characters' => 0, 'deaths' => 0, 'relationships' => 0, 'xp' => 0, 'stats' => 0, 'roles' => 0, 'history' => 0];
            $debugInfo = []; // Temporary debug output

            // Increment months_in_town for all living characters in this town
            // Keep raw value: 0 = intake only (no XP/level-ups), 1+ = simulated months
            $monthsElapsed = (int) ($input['months_elapsed'] ?? 1);
            if ($monthsElapsed > 0) {
                try {
                    execute("UPDATE characters SET months_in_town = months_in_town + ? WHERE town_id = ? AND status = 'Alive'", [$monthsElapsed, $townId], $uid);
                } catch (Exception $e) { /* column might not exist yet */ }
            }

            // New characters — check closed borders setting
            $metaRowsCB = query('SELECT value FROM town_meta WHERE town_id = ? AND `key` = ?', [$townId, 'gen_rules'], $uid);
            $genRulesCB = $metaRowsCB ? (json_decode($metaRowsCB[0]['value'] ?? '{}', true) ?: []) : [];
            if (!empty($genRulesCB['closed_borders']) && !empty($changes['new_characters'])) {
                // Filter: only allow births (age 0 or reason mentions "born")
                $changes['new_characters'] = array_values(array_filter($changes['new_characters'], function ($nc) {
                    $age = (int) ($nc['age'] ?? 99);
                    $reason = strtolower($nc['reason'] ?? $nc['reason_for_arrival'] ?? '');
                    return $age === 0 || strpos($reason, 'born') !== false || strpos($reason, 'birth') !== false;
                }));
            }

            if (!empty($changes['new_characters'])) {
                // â”€â”€ D&D 3.5e Calculation Tables â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                $raceSpeeds = [
                    'Human' => 30,
                    'Elf' => 30,
                    'Half-Elf' => 30,
                    'Half-Orc' => 30,
                    'Dwarf' => 20,
                    'Gnome' => 20,
                    'Halfling' => 20
                ];
                $raceLangs = [
                    'Human' => 'Common',
                    'Elf' => 'Common, Elven',
                    'Dwarf' => 'Common, Dwarven',
                    'Gnome' => 'Common, Gnome',
                    'Halfling' => 'Common, Halfling',
                    'Half-Elf' => 'Common, Elven',
                    'Half-Orc' => 'Common, Orc'
                ];
                $raceSizes = ['Gnome' => 'Small', 'Halfling' => 'Small'];
                // Good saves by class (fort, ref, will)
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
                // BAB progression by class
                $babFull = ['Fighter', 'Barbarian', 'Paladin', 'Ranger', 'Warrior'];
                $bab34 = ['Cleric', 'Druid', 'Rogue', 'Monk', 'Bard', 'Adept', 'Expert', 'Aristocrat'];

                // ── Extend tables with custom homebrew content ──────
                try {
                    require_once $baseDir . '/user_db.php';
                    $customRacesApply = userQuery($userId, "SELECT name, speed, size, languages FROM custom_races ORDER BY name");
                    foreach ($customRacesApply as $cr) {
                        $rName = $cr['name'];
                        if (!isset($raceSpeeds[$rName])) $raceSpeeds[$rName] = (int) ($cr['speed'] ?: 30);
                        if (!isset($raceLangs[$rName]))  $raceLangs[$rName] = $cr['languages'] ?: 'Common';
                        if (!isset($raceSizes[$rName]) && strtolower($cr['size'] ?? 'Medium') !== 'medium') {
                            $raceSizes[$rName] = $cr['size'];
                        }
                    }
                    $customClassesApply = userQuery($userId, "SELECT name, hit_die, bab_type, good_saves FROM custom_classes ORDER BY name");
                    foreach ($customClassesApply as $cc) {
                        $cName = $cc['name'];
                        // Add custom class hit dice
                        if (!isset($hitDice[$cName])) {
                            $hdMatch = preg_match('/d(\d+)/', $cc['hit_die'] ?? 'd8', $hdm);
                            $hitDice[$cName] = $hdMatch ? (int) $hdm[1] : 8;
                        }
                        // Add custom class BAB type
                        $babType = $cc['bab_type'] ?? '3/4';
                        if ($babType === 'Full' && !in_array($cName, $babFull)) $babFull[] = $cName;
                        elseif ($babType === '3/4' && !in_array($cName, $bab34)) $bab34[] = $cName;
                        // Add custom class good saves
                        if (!isset($classGoodSaves[$cName])) {
                            $saveParts = array_map('trim', explode(',', strtolower($cc['good_saves'] ?? '')));
                            $goodSaveKeys = [];
                            foreach ($saveParts as $sp) {
                                if (stripos($sp, 'fort') !== false) $goodSaveKeys[] = 'fort';
                                if (stripos($sp, 'ref') !== false) $goodSaveKeys[] = 'ref';
                                if (stripos($sp, 'will') !== false) $goodSaveKeys[] = 'will';
                            }
                            $classGoodSaves[$cName] = $goodSaveKeys;
                        }
                    }
                } catch (Exception $e) {
                    // user_db may not exist yet — fine
                }
                // $babHalf = everything else (Wizard, Sorcerer, Commoner)

                foreach ($changes['new_characters'] as $nc) {
                    $charName = trim($nc['name'] ?? 'Unknown');
                    if (!$charName || $charName === 'Unknown')
                        continue;
                    $existing = query('SELECT id FROM characters WHERE town_id = ? AND name = ? LIMIT 1', [$townId, $charName], $uid);
                    if (!empty($existing))
                        continue;

                    $aiRawData = json_encode($nc, JSON_UNESCAPED_UNICODE);
                    $isCreature = !empty($nc['is_creature']);

                    $classStr = $nc['class'] ?? 'Commoner 1';
                    preg_match('/^(.+?)\s+(\d+)$/', trim($classStr), $clsMatch);
                    $className = $clsMatch ? trim($clsMatch[1]) : 'Commoner';
                    $level = $clsMatch ? (int) $clsMatch[2] : 1;
                    if ($isCreature && isset($nc['level'])) {
                        $level = (int) $nc['level'];
                    }

                    $race = $nc['race'] ?? 'Human';
                    $aiHasStats = isset($nc['str']) && (int) $nc['str'] > 0;
                    if ($aiHasStats) {
                        $str = (int) ($nc['str'] ?? 10);
                        $dex = (int) ($nc['dex'] ?? 10);
                        $con = (int) ($nc['con'] ?? 10);
                        $int_ = (int) ($nc['int_'] ?? 10);
                        $wis = (int) ($nc['wis'] ?? 10);
                        $cha = (int) ($nc['cha'] ?? 10);
                    } else {
                        $rolled = rollAbilityScores($race, $userId);
                        $str = $rolled['str'];
                        $dex = $rolled['dex'];
                        $con = $rolled['con'];
                        $int_ = $rolled['int_'];
                        $wis = $rolled['wis'];
                        $cha = $rolled['cha'];
                    }
                    $strMod = (int) floor(($str - 10) / 2);
                    $dexMod = (int) floor(($dex - 10) / 2);
                    $conMod = (int) floor(($con - 10) / 2);
                    $wisMod = (int) floor(($wis - 10) / 2);

                    if ($isCreature) {
                        // CREATURE PATH: Use SRD stats directly, no recalc
                        $hp = (int) ($nc['hp'] ?? 1);
                        $ac = $nc['ac'] ?? '10';
                        $atk = $nc['atk'] ?? '';
                        $saves = $nc['saves'] ?? '';
                        if (empty($saves) && (isset($nc['fort']) || isset($nc['ref']) || isset($nc['will']))) {
                            $fmtMod = function ($v) { return ($v >= 0 ? '+' : '') . $v; };
                            $saves = 'Fort ' . $fmtMod((int)($nc['fort'] ?? 0)) . ', Ref ' . $fmtMod((int)($nc['ref'] ?? 0)) . ', Will ' . $fmtMod((int)($nc['will'] ?? 0));
                        }
                        $init = ($dexMod >= 0 ? '+' : '') . $dexMod;
                        $spd = $nc['speed'] ?? '30 ft';
                        $hd = $level . 'd8';
                        $grappleStr = '';
                        $cr = '-';
                        if (preg_match('/CR\s+([\d\/]+)/', $nc['reason'] ?? '', $crm)) {
                            $cr = $crm[1];
                        }
                        if (is_numeric($ac)) {
                            $acNum = (int) $ac;
                            $touchAc = 10 + $dexMod;
                            $flatAc = $acNum - $dexMod;
                            if ($acNum > 10) {
                                $ac = "$acNum, touch $touchAc, flat-footed $flatAc";
                            }
                        }
                        $languages = $int_ >= 3 ? 'Common' : '-';
                    } else {
                        // NPC PATH: Calculate from class tables
                        $init = ($dexMod >= 0 ? '+' : '') . $dexMod;
                        $spd = ($raceSpeeds[$race] ?? 30) . ' ft';
                        $hd_val = $hitDice[$className] ?? 6;
                        $hd = $level . 'd' . $hd_val;
                        $hp = max(1, $hd_val + $conMod);
                        for ($i = 2; $i <= $level; $i++) {
                            $hp += max(1, (int) floor($hd_val / 2 + 1) + $conMod);
                        }
                        if (in_array($className, $babFull)) {
                            $bab = $level;
                        } elseif (in_array($className, $bab34)) {
                            $bab = (int) floor($level * 3 / 4);
                        } else {
                            $bab = (int) floor($level / 2);
                        }
                        $goodSaves = $classGoodSaves[$className] ?? [];
                        $fortBase = in_array('fort', $goodSaves) ? (int) floor($level / 2) + 2 : (int) floor($level / 3);
                        $refBase = in_array('ref', $goodSaves) ? (int) floor($level / 2) + 2 : (int) floor($level / 3);
                        $willBase = in_array('will', $goodSaves) ? (int) floor($level / 2) + 2 : (int) floor($level / 3);
                        $fortTotal = $fortBase + $conMod;
                        $refTotal = $refBase + $dexMod;
                        $willTotal = $willBase + $wisMod;
                        $fmtMod = function ($v) { return ($v >= 0 ? '+' : '') . $v; };
                        $saves = 'Fort ' . $fmtMod($fortTotal) . ', Ref ' . $fmtMod($refTotal) . ', Will ' . $fmtMod($willTotal);
                        $sizeMod = isset($raceSizes[$race]) ? -1 : 0;
                        $grappleMod = ($sizeMod !== 0) ? $bab + $strMod - 4 : $bab + $strMod;
                        $grappleStr = ($grappleMod >= 0 ? '+' : '') . $grappleMod;
                        $atk = $nc['atk'] ?? '';
                        if (empty(trim($atk))) {
                            $atkBonus = $bab + $strMod;
                            $atkStr = ($atkBonus >= 0 ? '+' : '') . $atkBonus;
                            $atk = 'Melee: ' . $atkStr . ' (weapon)';
                        }
                        $languages = $nc['languages'] ?? ($raceLangs[$race] ?? 'Common');
                        $npcClasses = ['Commoner', 'Expert', 'Warrior', 'Adept', 'Aristocrat'];
                        if (in_array($className, $npcClasses)) {
                            $cr = $level <= 1 ? '1/2' : (string) ($level - 1);
                        } else {
                            $cr = (string) $level;
                        }
                        $ac = $nc['ac'] ?? '';
                        if (is_numeric($ac)) {
                            $acNum = (int) $ac;
                            $touchAc = 10 + $dexMod + ($sizeMod !== 0 ? 1 : 0);
                            $flatAc = $acNum - $dexMod;
                            if ($acNum > 10 && $flatAc != $acNum) {
                                $ac = "$acNum, touch $touchAc, flat-footed $flatAc";
                            }
                        }
                    }

                    try {
                        $historyText = trim($nc['reason'] ?? $nc['history'] ?? '');
                        execute('INSERT INTO characters (town_id, name, race, class, level, gender, age, status, alignment,
                            hp, hd, ac, init, spd, grapple, atk, saves,
                            str, dex, con, int_, wis, cha,
                            spouse, spouse_label, role, skills_feats, feats, gear,
                            languages, xp, cr, history, ai_data)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
                            $townId, $charName, $race, $className, $level,
                            $nc['gender'] ?? '', (int) ($nc['age'] ?? 0),
                            $nc['status'] ?? 'Alive', $nc['alignment'] ?? '',
                            $hp, $hd, $ac, $init, $spd, $grappleStr, $atk, $saves,
                            $str, $dex, $con, $int_, $wis, $cha,
                            $nc['spouse'] ?? 'None', $nc['spouse_label'] ?? '',
                            is_array($nc['role'] ?? '') ? implode(', ', $nc['role']) : ($nc['role'] ?? ''),
                            is_array($nc['skills_feats'] ?? '') ? implode(', ', $nc['skills_feats']) : ($nc['skills_feats'] ?? ''),
                            is_array($nc['feats'] ?? '') ? implode(', ', $nc['feats']) : ($nc['feats'] ?? ''),
                            is_array($nc['gear'] ?? '') ? implode(', ', $nc['gear']) : ($nc['gear'] ?? ''),
                            $languages, 0, $cr, $historyText, $aiRawData
                        ], $uid);
                    } catch (Exception $e) {
                        try {
                            execute('INSERT INTO characters (town_id, name, race, class, level, gender, age, status, alignment, hp, ac, str, dex, con, int_, wis, cha, spouse, spouse_label, role, skills_feats, feats, gear, ai_data)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
                                $townId, $charName, $race, $className, $level,
                                $nc['gender'] ?? '', (int) ($nc['age'] ?? 0),
                                $nc['status'] ?? 'Alive', $nc['alignment'] ?? '',
                                $hp, $ac, $str, $dex, $con, $int_, $wis, $cha,
                                $nc['spouse'] ?? 'None', $nc['spouse_label'] ?? '',
                                is_array($nc['role'] ?? '') ? implode(', ', $nc['role']) : ($nc['role'] ?? ''),
                                is_array($nc['skills_feats'] ?? '') ? implode(', ', $nc['skills_feats']) : ($nc['skills_feats'] ?? ''),
                                is_array($nc['feats'] ?? '') ? implode(', ', $nc['feats']) : ($nc['feats'] ?? ''),
                                is_array($nc['gear'] ?? '') ? implode(', ', $nc['gear']) : ($nc['gear'] ?? ''),
                                $aiRawData
                            ], $uid);
                        } catch (Exception $e2) { /* non-fatal */ }
                    }
                    $applied['new_characters']++;

                    // Skip equipment/spells/skills for creatures
                    if ($isCreature) continue;

                    // Auto-shop: buy SRD equipment
                    $newCharRows = query(
                        'SELECT id FROM characters WHERE town_id = ? AND name = ? ORDER BY id DESC LIMIT 1',
                        [$townId, $charName], $uid
                    );
                    if (!empty($newCharRows)) {
                        $newCharId = (int) $newCharRows[0]['id'];

                        static $srdEquipCache = null;
                        if ($srdEquipCache === null) {
                            $srdEquipCache = srdQuery($dndEdition, 'SELECT id, name, category, cost, weight, damage, critical, properties FROM equipment');
                        }
                        $srdByName = [];
                        foreach ($srdEquipCache as $srd) {
                            $srdByName[strtolower(trim($srd['name']))] = $srd;
                        }

                        $shopLists = [
                            'Fighter' => ['longsword', 'chainmail', 'heavy wooden shield', 'backpack', 'belt pouch', 'dagger', 'waterskin', 'rations (trail)'],
                            'Barbarian' => ['greataxe', 'leather armor', 'backpack', 'belt pouch', 'dagger', 'waterskin', 'rations (trail)', 'javelin'],
                            'Paladin' => ['longsword', 'chainmail', 'heavy wooden shield', 'backpack', 'belt pouch', 'waterskin', 'holy symbol (silver)'],
                            'Ranger' => ['longsword', 'leather armor', 'shortbow', 'dagger', 'backpack', 'belt pouch', 'waterskin', 'rations (trail)'],
                            'Cleric' => ['heavy mace', 'scale mail', 'heavy wooden shield', 'backpack', 'belt pouch', 'waterskin', 'holy symbol (wooden)'],
                            'Druid' => ['quarterstaff', 'leather armor', 'light wooden shield', 'backpack', 'belt pouch', 'waterskin', 'holly and mistletoe'],
                            'Wizard' => ['quarterstaff', 'dagger', 'backpack', 'belt pouch', 'spellbook', 'spell component pouch', 'ink', 'inkpen', 'parchment'],
                            'Sorcerer' => ['light crossbow', 'dagger', 'backpack', 'belt pouch', 'spell component pouch', 'waterskin', 'rations (trail)'],
                            'Rogue' => ['short sword', 'leather armor', 'dagger', 'backpack', 'belt pouch', "thieves' tools", 'waterskin', 'rations (trail)'],
                            'Bard' => ['rapier', 'leather armor', 'backpack', 'belt pouch', 'waterskin', 'musical instrument', 'rations (trail)'],
                            'Monk' => ['quarterstaff', 'backpack', 'belt pouch', 'waterskin', 'rations (trail)'],
                            'Warrior' => ['longsword', 'scale mail', 'heavy wooden shield', 'backpack', 'belt pouch', 'dagger', 'waterskin'],
                            'Expert' => ['dagger', "artisan's tools", 'backpack', 'belt pouch', 'waterskin', 'rations (trail)'],
                            'Aristocrat' => ['rapier', "noble's outfit", 'backpack', 'belt pouch', 'waterskin'],
                            'Adept' => ['quarterstaff', 'backpack', 'belt pouch', 'waterskin', 'holy symbol (wooden)', 'rations (trail)'],
                            'Commoner' => ['dagger', "peasant's outfit", 'belt pouch', 'waterskin'],
                        ];
                        $shopItems = $shopLists[$className] ?? $shopLists['Commoner'];

                        // Add role-appropriate clothing if not already in list
                        $hasClothing = false;
                        $clothingNames = ['outfit', 'vestments'];
                        foreach ($shopItems as $si) {
                            foreach ($clothingNames as $cn) {
                                if (stripos($si, $cn) !== false) {
                                    $hasClothing = true;
                                    break 2;
                                }
                            }
                        }
                        if (!$hasClothing) {
                            $role = strtolower($nc['role'] ?? '');
                            if (strpos($role, 'scholar') !== false || strpos($role, 'sage') !== false) {
                                $shopItems[] = 'scholar\'s outfit';
                            } elseif (strpos($role, 'craft') !== false || strpos($role, 'smith') !== false || strpos($role, 'carpenter') !== false) {
                                $shopItems[] = 'artisan\'s outfit';
                            } elseif (strpos($role, 'noble') !== false || strpos($role, 'diplomat') !== false) {
                                $shopItems[] = 'courtier\'s outfit';
                            } elseif (strpos($role, 'entertainer') !== false || strpos($role, 'bard') !== false) {
                                $shopItems[] = 'entertainer\'s outfit';
                            } elseif (strpos($role, 'priest') !== false || strpos($role, 'cleric') !== false) {
                                $shopItems[] = 'cleric\'s vestments';
                            } elseif (strpos($role, 'guard') !== false || strpos($role, 'soldier') !== false || strpos($role, 'mercenary') !== false) {
                                $shopItems[] = 'traveler\'s outfit';
                            } else {
                                $shopItems[] = 'peasant\'s outfit';
                            }
                        }

                        $equippedWeapon = false;
                        $equippedArmor = false;
                        $equippedShield = false;
                        $sortOrder = 0;
                        $gearNames = []; // Track for the gear text field

                        foreach ($shopItems as $itemLookup) {
                            $lookupName = strtolower(trim($itemLookup));
                            $srdMatch = $srdByName[$lookupName] ?? null;

                            // Try partial match
                            if (!$srdMatch) {
                                foreach ($srdByName as $srdName => $srdItem) {
                                    if (strpos($srdName, $lookupName) !== false || strpos($lookupName, $srdName) !== false) {
                                        $srdMatch = $srdItem;
                                        break;
                                    }
                                }
                            }

                            $sortOrder++;
                            $itemName = $srdMatch ? $srdMatch['name'] : $itemLookup;
                            $itemType = 'gear';
                            $slot = null;
                            $equipped = 0;
                            $weight = 0;
                            $srdRef = '';
                            $props = '{}';

                            if ($srdMatch) {
                                $srdRef = 'srd_equipment:' . $srdMatch['id'];
                                $weight = (float) preg_replace('/[^\d.]/', '', $srdMatch['weight'] ?? '0');
                                $cat = strtolower($srdMatch['category'] ?? '');
                                $srdNameLower = strtolower($srdMatch['name']);

                                if (strpos($cat, 'weapon') !== false) {
                                    $itemType = 'weapon';
                                } elseif (strpos($cat, 'armor') !== false || strpos($cat, 'shield') !== false) {
                                    if (strpos($srdNameLower, 'shield') !== false || strpos($srdNameLower, 'buckler') !== false) {
                                        $itemType = 'shield';
                                    } else {
                                        $itemType = 'armor';
                                    }
                                }

                                $propData = [];
                                if (!empty($srdMatch['damage']))
                                    $propData['damage'] = $srdMatch['damage'];
                                if (!empty($srdMatch['critical']))
                                    $propData['critical'] = $srdMatch['critical'];
                                if (!empty($srdMatch['cost']))
                                    $propData['cost'] = $srdMatch['cost'];
                                if (!empty($srdMatch['properties']))
                                    $propData['srd_properties'] = $srdMatch['properties'];
                                $props = json_encode($propData);
                            }

                            // Fallback: detect type by name keywords if still 'gear'
                            if ($itemType === 'gear') {
                                $itemType = detectItemType('gear', $itemName);
                            }

                            // Auto-equip
                            if ($itemType === 'weapon' && !$equippedWeapon) {
                                $slot = 'main_hand';
                                $equipped = 1;
                                $equippedWeapon = true;
                            } elseif ($itemType === 'armor' && !$equippedArmor) {
                                $slot = 'armor';
                                $equipped = 1;
                                $equippedArmor = true;
                            } elseif ($itemType === 'shield' && !$equippedShield) {
                                $slot = 'off_hand';
                                $equipped = 1;
                                $equippedShield = true;
                            }

                            $gearNames[] = $itemName;

                            try {
                                execute(
                                    'INSERT INTO character_equipment (character_id, item_name, item_type, slot, quantity, weight, properties, srd_ref, equipped, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)',
                                    [$newCharId, $itemName, $itemType, $slot, 1, $weight, $props, $srdRef, $equipped, $sortOrder],
                                    $uid
                                );
                            } catch (Exception $eqErr) { /* non-fatal */
                            }
                        }

                        // Update the character's gear text field and recalc AC/ATK
                        $gearText = implode(', ', $gearNames);
                        execute('UPDATE characters SET gear = ? WHERE id = ?', [$gearText, $newCharId], $uid);
                        recalcCharStats($newCharId, $uid);

                        // â”€â”€ Auto-Spell Selection for Caster NPCs â”€â”€â”€â”€â”€â”€
                        autoSelectSpellsForCaster($newCharId, $className, $level, $nc['role'] ?? '', $dndEdition, $uid);

                        // â”€â”€ Auto-Assign Skills & Feats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                        // AI may return feats/skills as arrays or strings â€” normalize to strings
                        $aiSkillsRaw = $nc['skills_feats'] ?? '';
                        $aiFeatsRaw  = $nc['feats'] ?? '';
                        if (is_array($aiSkillsRaw)) $aiSkillsRaw = implode(', ', $aiSkillsRaw);
                        if (is_array($aiFeatsRaw))  $aiFeatsRaw  = implode(', ', $aiFeatsRaw);
                        autoAssignSkillsAndFeats($newCharId, $className, $level, $race, $str, $dex, $con, $int_, $wis, $cha, $nc['role'] ?? '', (string)$aiSkillsRaw, (string)$aiFeatsRaw, $uid);
                    }
                }
            }

            // Deaths
            if (!empty($changes['deaths'])) {
                foreach ($changes['deaths'] as $d) {
                    execute(
                        "UPDATE characters SET status = 'Deceased' WHERE town_id = ? AND name = ? AND status = 'Alive'",
                        [$townId, $d['name']],
                        $uid
                    );
                    $applied['deaths']++;
                }
            }

            // â”€â”€ XP gains â€” skip entirely during intake (monthsElapsed=0) â”€â”€
           if ($monthsElapsed > 0) {
            // Look up current game date for the XP log
            $calRow = query('SELECT current_month, current_year, era_name, month_names FROM calendar WHERE user_id = ?', [$userId], 0);
            $gameDate = '';
            if ($calRow) {
                $cm = (int) ($calRow[0]['current_month'] ?? 1);
                $cy = $calRow[0]['current_year'] ?? '';
                $era = $calRow[0]['era_name'] ?? '';
                $mNames = json_decode($calRow[0]['month_names'] ?? '[]', true) ?: [];
                $mLabel = $mNames[$cm - 1] ?? "Month $cm";
                $gameDate = "{$mLabel}, {$cy} {$era}";
            }

            $xpReceivedNames = []; // Track who got AI-generated XP
            if (!empty($changes['xp_gains'])) {
                foreach ($changes['xp_gains'] as $x) {
                    $gain = (int) ($x['xp_gained'] ?? 0);
                    if ($gain > 0) {
                        // Apply level-based diminishing returns
                        $charLevelRow = query('SELECT id, level FROM characters WHERE town_id = ? AND name = ? LIMIT 1', [$townId, $x['name']], $uid);
                        $charLevel = $charLevelRow ? (int) ($charLevelRow[0]['level'] ?? 1) : 1;
                        $charDbId = $charLevelRow ? (int) $charLevelRow[0]['id'] : 0;
                        $gain = applyXpDiminishing($gain, $charLevel);

                        if ($gain > 0) {
                            execute(
                                'UPDATE characters SET xp = COALESCE(xp, 0) + ? WHERE town_id = ? AND name = ?',
                                [$gain, $townId, $x['name']],
                                $uid
                            );
                            $applied['xp']++;
                            $xpReceivedNames[] = $x['name'];

                            // Log to XP log with tags
                            if ($charDbId) {
                                try {
                                    $tagsJson = !empty($x['tags']) ? json_encode($x['tags']) : null;
                                    execute(
                                        'INSERT INTO character_xp_log (character_id, town_id, xp_gained, reason, source, game_date, xp_tags) VALUES (?, ?, ?, ?, ?, ?, ?)',
                                        [$charDbId, $townId, $gain, trim($x['reason'] ?? 'Simulation activity'), 'ai', $gameDate, $tagsJson],
                                        $uid
                                    );
                                } catch (Exception $logE) { /* table may not exist yet */ }
                            }
                        }
                    }
                }
            }

            // Server-side XP fallback: grant small XP to living characters who
            // didn't receive any from the AI, using the Growth Score system.
            $npcClasses = ['Commoner', 'Expert', 'Warrior', 'Adept', 'Aristocrat'];

            // Load town difficulty for fallback calculation
            $diffMetaFb = query('SELECT value FROM town_meta WHERE town_id = ? AND `key` = ?', [$townId, 'difficulty_level'], $uid);
            $diffLevelFb = $diffMetaFb ? trim($diffMetaFb[0]['value']) : 'struggling';
            $diffMultsFb = ['peaceful' => 1.0, 'struggling' => 1.5, 'frontier' => 2.0, 'warzone' => 3.0];
            $diffMultFb = $diffMultsFb[$diffLevelFb] ?? 1.5;

            // Fallback reasons for server-generated XP
            $fallbackReasons = [
                'Daily duties and routine work',
                'Training and practice',
                'Guard duty and patrols',
                'Crafting and trade',
                'Community service',
                'Exploration of surrounding area',
                'Study and self-improvement',
                'Mentoring younger residents',
                'Tending livestock and fields',
                'Maintenance and repairs',
            ];

            $missedChars = query(
                "SELECT id, name, class, level, role FROM characters WHERE town_id = ? AND status = 'Alive'",
                [$townId],
                $uid
            );
            foreach ($missedChars as $mc) {
                if (in_array($mc['name'], $xpReceivedNames)) continue; // already got AI XP

                // Determine if NPC or PC class
                $classStr = trim($mc['class'] ?? 'Commoner');
                $classParts = preg_split('/[\/ ]*\/[\/ ]*/', $classStr);
                $isNpc = true;
                foreach ($classParts as $part) {
                    $clean = preg_replace('/\s+\d+$/', '', trim($part));
                    if ($clean !== '' && !in_array($clean, $npcClasses)) {
                        $isNpc = false;
                        break;
                    }
                }

                // Fallback: routine tag score (activity=routine, all else=none)
                // NPC: ~5 base, PC: ~10 base
                $baseScore = $isNpc ? mt_rand(3, 8) : mt_rand(8, 15);
                $xpGain = (int) floor($baseScore * $diffMultFb) * $monthsElapsed;

                // Apply diminishing returns
                $charLevel = (int) ($mc['level'] ?? 1);
                $xpGain = applyXpDiminishing($xpGain, $charLevel);

                if ($xpGain > 0) {
                    execute(
                        'UPDATE characters SET xp = COALESCE(xp, 0) + ? WHERE id = ?',
                        [$xpGain, $mc['id']],
                        $uid
                    );
                    $applied['xp']++;

                    // Pick a contextual reason based on role
                    $role = trim($mc['role'] ?? '');
                    if ($role) {
                        $reason = ucfirst($role) . ' duties and responsibilities';
                    } else {
                        $reason = $fallbackReasons[array_rand($fallbackReasons)];
                    }

                    // Log to XP log
                    try {
                        execute(
                            'INSERT INTO character_xp_log (character_id, town_id, xp_gained, reason, source, game_date) VALUES (?, ?, ?, ?, ?, ?)',
                            [$mc['id'], $townId, $xpGain, $reason, 'system', $gameDate],
                            $uid
                        );
                    } catch (Exception $logE) { /* table may not exist yet */ }
                }
            }
           } // end if ($monthsElapsed > 0) â€” XP block

            // â”€â”€ Auto Level-Up: check all living characters for XP thresholds â”€â”€
            // Loop until no more level-ups are possible (handles multi-level jumps)
            $applied['auto_levelups'] = 0;
            $applied['levelup_details'] = [];
            $maxPasses = 20; // Safety: prevent infinite loops
            for ($pass = 0; $pass < $maxPasses; $pass++) {
                $leveledAny = false;
                $livingChars = query(
                    "SELECT id, name, class, level, xp, str, dex, con, int_, wis, cha, race, hp, hd, saves, atk, feats, skills_feats, role FROM characters WHERE town_id = ? AND status = 'Alive'",
                    [$townId],
                    $uid
                );
                foreach ($livingChars as $lc) {
                    $xp = (int) ($lc['xp'] ?? 0);
                    // Use the level column directly (more reliable than parsing class string)
                    $totalLevel = (int) ($lc['level'] ?? 1);
                    if ($totalLevel < 1)
                        $totalLevel = 1;

                    // D&D 3.5e: Level N requires N*(N-1)*500 XP
                    $nextLevel = $totalLevel + 1;
                    $xpNeeded = $nextLevel * ($nextLevel - 1) * 500;

                    if ($xp >= $xpNeeded) {
                        // Ensure the class string has a level number for autoLevelUp's regex
                        $classStr = $lc['class'] ?? 'Commoner';
                        if (!preg_match('/\d/', $classStr)) {
                            // Class stored without number (e.g. "Warrior") â€” append current level
                            $classStr = trim($classStr) . ' ' . $totalLevel;
                        }
                        $lc['class'] = $classStr;
                        $oldLevel = $totalLevel;

                        $levelUpResult = autoLevelUp($lc, $dndEdition, $uid);
                        if ($levelUpResult) {
                            $applied['auto_levelups']++;
                            $applied['levelup_details'][] = [
                                'name' => $lc['name'],
                                'class' => preg_replace('/\s+\d+$/', '', $lc['class']),
                                'old_level' => $oldLevel,
                                'new_level' => $oldLevel + 1,
                                'xp' => $xp
                            ];
                            $leveledAny = true;
                        }
                    }
                }
                if (!$leveledAny)
                    break; // No more level-ups possible
            }

            // Stat changes
            if (!empty($changes['stat_changes'])) {
                $allowedFields = ['hp', 'ac', 'str', 'dex', 'con', 'int_', 'wis', 'cha', 'age', 'role', 'title', 'class', 'alignment'];
                foreach ($changes['stat_changes'] as $s) {
                    $field = $s['field'] ?? '';
                    if (!in_array($field, $allowedFields))
                        continue;
                    $newVal = $s['new_value'] ?? '';
                    execute(
                        "UPDATE characters SET {$field} = ? WHERE town_id = ? AND name = ?",
                        [$newVal, $townId, $s['name']],
                        $uid
                    );
                    $applied['stats']++;
                }
            }

            // Role changes
            if (!empty($changes['role_changes'])) {
                foreach ($changes['role_changes'] as $rc) {
                    execute(
                        'UPDATE characters SET role = ? WHERE town_id = ? AND name = ?',
                        [$rc['new_role'], $townId, $rc['name']],
                        $uid
                    );
                    $applied['roles']++;
                }
            }

            /* â”€â”€ Apply Social Simulation Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

            // Helper: resolve character name â†’ id within this town
            $charNameCache = null;
            $resolveCharId = function ($name) use ($townId, $uid, &$charNameCache) {
                if ($charNameCache === null) {
                    $charNameCache = [];
                    $rows = query('SELECT id, name FROM characters WHERE town_id = ?', [$townId], $uid);
                    foreach ($rows as $r)
                        $charNameCache[strtolower(trim($r['name']))] = (int) $r['id'];
                }
                return $charNameCache[strtolower(trim($name))] ?? null;
            };

            // NPC Memories
            if (!empty($changes['memories'])) {
                $applied['memories'] = 0;
                foreach ($changes['memories'] as $mem) {
                    $charName = trim($mem['character_name'] ?? '');
                    $cid = $resolveCharId($charName);
                    if (!$cid)
                        continue;
                    $relatedId = null;
                    if (!empty($mem['related_character'])) {
                        $relatedId = $resolveCharId($mem['related_character']);
                    }
                    try {
                        execute(
                            'INSERT INTO character_memories (character_id, memory_type, content, sentiment, related_char_id, importance, game_date) VALUES (?,?,?,?,?,?,?)',
                            [
                                $cid,
                                $mem['type'] ?? 'event',
                                $mem['content'] ?? '',
                                max(-5, min(5, (int) ($mem['sentiment'] ?? 0))),
                                $relatedId,
                                max(1, min(10, (int) ($mem['importance'] ?? 5))),
                                $mem['game_date'] ?? ''
                            ],
                            $uid
                        );
                        $applied['memories']++;
                    } catch (Exception $e) { /* non-fatal */
                    }
                }
            }

            // Faction Changes
            if (!empty($changes['faction_changes'])) {
                $applied['factions'] = 0;
                foreach ($changes['faction_changes'] as $fc) {
                    $action = $fc['action'] ?? '';
                    $factionName = trim($fc['faction_name'] ?? '');
                    if (!$factionName)
                        continue;

                    if ($action === 'create') {
                        // Create new faction
                        $existing = query('SELECT id FROM factions WHERE town_id = ? AND name = ?', [$townId, $factionName], $uid);
                        if (empty($existing)) {
                            $leaderId = !empty($fc['character_name']) ? $resolveCharId($fc['character_name']) : null;
                            try {
                                insertAndGetId(
                                    'INSERT INTO factions (town_id, name, faction_type, description, leader_id, influence, status) VALUES (?,?,?,?,?,?,?)',
                                    [
                                        $townId,
                                        $factionName,
                                        $fc['faction_type'] ?? 'social',
                                        $fc['description'] ?? '',
                                        $leaderId,
                                        max(1, min(10, (int) ($fc['influence'] ?? 3))),
                                        'active'
                                    ],
                                    $uid
                                );
                                $applied['factions']++;
                            } catch (Exception $e) { /* non-fatal */
                            }
                        }
                    } elseif ($action === 'add_member') {
                        $cid = !empty($fc['character_name']) ? $resolveCharId($fc['character_name']) : null;
                        if (!$cid)
                            continue;
                        $factionRows = query('SELECT id FROM factions WHERE town_id = ? AND name = ?', [$townId, $factionName], $uid);
                        if (!empty($factionRows)) {
                            $fid = (int) $factionRows[0]['id'];
                            try {
                                execute(
                                    'INSERT INTO faction_members (faction_id, character_id, role, loyalty) VALUES (?,?,?,?)
                                     ON DUPLICATE KEY UPDATE role=VALUES(role), loyalty=VALUES(loyalty)',
                                    [$fid, $cid, $fc['role'] ?? 'member', 5],
                                    $uid
                                );
                                $applied['factions']++;
                            } catch (Exception $e) { /* non-fatal */
                            }
                        }
                    } elseif ($action === 'remove_member') {
                        $cid = !empty($fc['character_name']) ? $resolveCharId($fc['character_name']) : null;
                        if (!$cid)
                            continue;
                        $factionRows = query('SELECT id FROM factions WHERE town_id = ? AND name = ?', [$townId, $factionName], $uid);
                        if (!empty($factionRows)) {
                            execute('DELETE FROM faction_members WHERE faction_id = ? AND character_id = ?', [(int) $factionRows[0]['id'], $cid], $uid);
                            $applied['factions']++;
                        }
                    }
                }
            }

            // Incidents (crimes, mysteries)
            if (!empty($changes['incidents'])) {
                $applied['incidents'] = 0;
                foreach ($changes['incidents'] as $inc) {
                    $summary = trim($inc['summary'] ?? '');
                    if (!$summary)
                        continue;
                    try {
                        $incId = insertAndGetId(
                            'INSERT INTO town_incidents (town_id, incident_type, status, severity, summary, motive, game_date) VALUES (?,?,?,?,?,?,?)',
                            [
                                $townId,
                                $inc['type'] ?? 'general',
                                'active',
                                max(1, min(10, (int) ($inc['severity'] ?? 3))),
                                $summary,
                                $inc['motive'] ?? '',
                                $inc['game_date'] ?? ''
                            ],
                            $uid
                        );
                        // Add participants
                        if (!empty($inc['perpetrator'])) {
                            $pid = $resolveCharId($inc['perpetrator']);
                            if ($pid) {
                                execute(
                                    'INSERT INTO incident_participants (incident_id, character_id, role, knows_truth) VALUES (?,?,?,?)',
                                    [$incId, $pid, 'perpetrator', 1],
                                    $uid
                                );
                            }
                        }
                        if (!empty($inc['victim'])) {
                            $vid = $resolveCharId($inc['victim']);
                            if ($vid) {
                                execute(
                                    'INSERT INTO incident_participants (incident_id, character_id, role, knows_truth) VALUES (?,?,?,?)',
                                    [$incId, $vid, 'victim', 0],
                                    $uid
                                );
                            }
                        }
                        if (!empty($inc['witnesses']) && is_array($inc['witnesses'])) {
                            foreach ($inc['witnesses'] as $wName) {
                                $wid = $resolveCharId(trim($wName));
                                if ($wid) {
                                    execute(
                                        'INSERT INTO incident_participants (incident_id, character_id, role, knows_truth) VALUES (?,?,?,?)',
                                        [$incId, $wid, 'witness', 0],
                                        $uid
                                    );
                                }
                            }
                        }
                        $applied['incidents']++;
                    } catch (Exception $e) { /* non-fatal */
                    }
                }
            }

            // NPC-NPC Relationships (from social simulation)
            if (!empty($changes['new_relationships'])) {
                // Check if these are the new social format (with character1/character2 keys)
                foreach ($changes['new_relationships'] as $r) {
                    $name1 = trim($r['character1'] ?? $r['char1'] ?? '');
                    $name2 = trim($r['character2'] ?? $r['char2'] ?? '');
                    $relType = trim($r['type'] ?? 'acquaintance');

                    // If it's a spouse-type relationship, handle the old way (update spouse fields)
                    if (in_array(strtolower($relType), ['husband', 'wife', 'spouse', 'husband/wife'])) {
                        // Original spouse logic from existing code
                        $label1 = 'Spouse';
                        $label2 = 'Spouse';
                        $c1 = query('SELECT gender FROM characters WHERE town_id = ? AND name = ?', [$townId, $name1], $uid);
                        $c2 = query('SELECT gender FROM characters WHERE town_id = ? AND name = ?', [$townId, $name2], $uid);
                        $g1 = $c1 ? $c1[0]['gender'] : '';
                        $g2 = $c2 ? $c2[0]['gender'] : '';
                        $label1 = ($g2 === 'M') ? 'Husband' : 'Wife';
                        $label2 = ($g1 === 'M') ? 'Husband' : 'Wife';
                        execute(
                            'UPDATE characters SET spouse = ?, spouse_label = ? WHERE town_id = ? AND name = ?',
                            [$name2, $label1, $townId, $name1],
                            $uid
                        );
                        execute(
                            'UPDATE characters SET spouse = ?, spouse_label = ? WHERE town_id = ? AND name = ?',
                            [$name1, $label2, $townId, $name2],
                            $uid
                        );
                        $applied['relationships']++;
                    }

                    // Also store in character_relationships table for all types
                    $cid1 = $resolveCharId($name1);
                    $cid2 = $resolveCharId($name2);
                    if ($cid1 && $cid2 && $cid1 !== $cid2) {
                        // Map spouse types to 'romantic' for the relationship table
                        $mappedType = in_array(strtolower($relType), ['husband', 'wife', 'spouse', 'husband/wife']) ? 'romantic' : strtolower($relType);
                        $disposition = (int) ($r['disposition'] ?? 0);
                        if (!$disposition) {
                            // Infer from type
                            $dispMap = ['friend' => 5, 'ally' => 4, 'romantic' => 8, 'mentor' => 5, 'student' => 4, 'rival' => -3, 'enemy' => -7, 'acquaintance' => 1];
                            $disposition = $dispMap[$mappedType] ?? 0;
                        }
                        try {
                            execute(
                                'INSERT INTO character_relationships (char1_id, char2_id, rel_type, disposition, reason) VALUES (?,?,?,?,?)
                                 ON DUPLICATE KEY UPDATE rel_type=VALUES(rel_type), disposition=VALUES(disposition), reason=VALUES(reason)',
                                [$cid1, $cid2, $mappedType, $disposition, $r['reason'] ?? ''],
                                $uid
                            );
                        } catch (Exception $e) { /* non-fatal, unique constraint may fire */
                        }
                    }
                }
            }
            if (!empty($input['history_entry'])) {
                $h = $input['history_entry'];
                $maxSort = query('SELECT COALESCE(MAX(sort_order), 0) as m FROM history WHERE town_id = ?', [$townId], $uid);
                $nextSort = ($maxSort[0]['m'] ?? 0) + 1;
                execute(
                    'INSERT INTO history (town_id, heading, content, sort_order) VALUES (?, ?, ?, ?)',
                    [$townId, $h['heading'] ?? 'Simulation', $h['content'] ?? '', $nextSort],
                    $uid
                );
                $applied['history'] = 1;
            }

            // Apply building changes
            $applied['buildings'] = 0;
            if (!empty($changes['building_changes'])) {
                foreach ($changes['building_changes'] as $bc) {
                    $action = strtolower(trim($bc['action'] ?? ''));
                    $bName = trim($bc['name'] ?? '');
                    if (!$bName)
                        continue;

                    switch ($action) {
                        case 'start':
                            $buildTime = max(1, min(12, (int) ($bc['build_time'] ?? 2)));
                            $desc = trim($bc['description'] ?? '');
                            // Check if building already exists
                            $exists = query('SELECT id FROM town_buildings WHERE town_id = ? AND name = ?', [$townId, $bName], $uid);
                            if (empty($exists)) {
                                execute(
                                    'INSERT INTO town_buildings (town_id, name, status, build_progress, build_time, description) VALUES (?, ?, ?, ?, ?, ?)',
                                    [$townId, $bName, 'under_construction', 0, $buildTime, $desc],
                                    $uid
                                );
                                $applied['buildings']++;
                            }
                            break;
                        case 'progress':
                            $row = query('SELECT id, build_progress, build_time FROM town_buildings WHERE town_id = ? AND name = ? AND status = ?', [$townId, $bName, 'under_construction'], $uid);
                            if (!empty($row)) {
                                $newProgress = $row[0]['build_progress'] + 1;
                                if ($newProgress >= $row[0]['build_time']) {
                                    execute('UPDATE town_buildings SET status = ?, build_progress = ?, completed_at = NOW() WHERE id = ?', ['completed', $row[0]['build_time'], $row[0]['id']], $uid);
                                } else {
                                    execute('UPDATE town_buildings SET build_progress = ? WHERE id = ?', [$newProgress, $row[0]['id']], $uid);
                                }
                                $applied['buildings']++;
                            }
                            break;
                        case 'complete':
                            execute('UPDATE town_buildings SET status = ?, build_progress = build_time, completed_at = NOW() WHERE town_id = ? AND name = ? AND status IN (?, ?)', ['completed', $townId, $bName, 'under_construction', 'planned'], $uid);
                            $applied['buildings']++;
                            break;
                        case 'damage':
                            execute('UPDATE town_buildings SET status = ? WHERE town_id = ? AND name = ?', ['damaged', $townId, $bName], $uid);
                            $applied['buildings']++;
                            break;
                        case 'destroy':
                            execute('UPDATE town_buildings SET status = ? WHERE town_id = ? AND name = ?', ['destroyed', $townId, $bName], $uid);
                            $applied['buildings']++;
                            break;
                    }
                }
            }

            // Advance calendar by N months (skip if months=0)
            $monthsElapsed = (int) ($input['months_elapsed'] ?? 0);
            if ($monthsElapsed > 0) {
                $cal = query('SELECT * FROM calendar WHERE user_id = ?', [$uid], $uid);

                // If no calendar row, create one with defaults
                if (!$cal) {
                    execute(
                        'INSERT INTO calendar (user_id, current_year, current_month, current_day, era_name, months_per_year, month_names, days_per_month) VALUES (?, 1490, 1, 1, ?, 12, ?, 30)',
                        [$uid, 'DR', '["Hammer","Alturiak","Ches","Tarsakh","Mirtul","Kythorn","Flamerule","Eleasis","Eleint","Marpenoth","Uktar","Nightal"]'],
                        $uid
                    );
                    $cal = query('SELECT * FROM calendar WHERE user_id = ?', [$uid], $uid);
                }

                if ($cal) {
                    $mpy = (int) ($cal[0]['months_per_year'] ?? 12);
                    $year = (int) ($cal[0]['current_year'] ?? 1490);
                    $month = (int) ($cal[0]['current_month'] ?? 1);
                    $month += $monthsElapsed;
                    while ($month > $mpy) {
                        $month -= $mpy;
                        $year++;
                    }
                    execute(
                        'UPDATE calendar SET current_year=?, current_month=? WHERE user_id=?',
                        [$year, $month, $uid],
                        $uid
                    );
                    $applied['calendar'] = "Advanced to month $month of year $year";
                    $mNames = json_decode($cal[0]['month_names'] ?? '[]', true) ?: [];
                    $applied['calendar_date'] = [
                        'month' => $month,
                        'year' => $year,
                        'era' => trim($cal[0]['era_name'] ?? 'DR'),
                        'month_name' => $mNames[$month - 1] ?? "Month $month"
                    ];
                }
            }

            simRespond(['ok' => true, 'applied' => $applied, 'debug_info' => $debugInfo]);

        /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
           SIMULATE CHUNK â€” one town, one month, one category
           categories: story | population | social | stats
           â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */