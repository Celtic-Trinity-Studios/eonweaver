<?php
/**
 * Intake Actions — Two-phase character generation
 * Phase 1 (intake_roster): Generate lightweight character list in ONE AI call
 * Phase 2 (intake_flesh):  Flesh out stubs (batched LLM — up to 10 stubs per call, shared prompt)
 *
 * Called from simulate.php BEFORE the switch block:
 *   if ($action === 'intake_roster' || $action === 'intake_flesh') { require ...; exit; }
 *
 * Variables available: $userId, $uid, $input, $action
 */

/**
 * Semicolon-separated attack lines for CharacterSheet parseAttacks() (+bonus and NdN per segment).
 * Splits on " and " so multiple natural/manufactured weapons become separate attacks.
 */
function intakeMonsterAtkForSheet(?string $attack, ?string $fullAttack): string
{
    $a = trim(preg_replace('/\s+/', ' ', (string) $attack));
    $f = trim(preg_replace('/\s+/', ' ', (string) $fullAttack));
    $bits = [];
    if ($a !== '') {
        $bits[] = $a;
    }
    if ($f !== '' && strcasecmp($f, $a) !== 0) {
        $bits[] = $f;
    }
    $merged = trim(implode(' ', $bits));
    if ($merged === '') {
        return '';
    }
    $segments = preg_split('/\s+and\s+/i', $merged);
    $out = [];
    foreach ($segments as $seg) {
        $seg = trim($seg);
        if ($seg !== '' && !in_array($seg, $out, true)) {
            $out[] = $seg;
        }
    }

    return implode('; ', $out);
}

/**
 * Extra gear text: keywords for WEAPON_DB matching, treasure, space/reach (CharacterSheet / combat helpers).
 */
function intakeMonsterGearSupplement(?string $attack, ?string $fullAttack, ?string $treasure, ?string $space, ?string $reach): string
{
    $text = strtolower((string) $attack . ' ' . (string) $fullAttack);
    $needles = [
        'longsword', 'short sword', 'greatsword', 'greataxe', 'greatclub', 'morningstar', 'warhammer', 'battleaxe',
        'heavy flail', 'flail', 'mace', 'heavy mace', 'light mace', 'dagger', 'rapier', 'scimitar', 'quarterstaff',
        'trident', 'longspear', 'shortspear', 'glaive', 'halberd', 'falchion', 'lance', 'scythe', 'club', 'sickle',
        'handaxe', 'throwing axe', 'shortbow', 'longbow', 'light crossbow', 'heavy crossbow', 'hand crossbow', 'javelin', 'sling',
        'spear', 'whip', 'spiked chain', 'pick', 'heavy pick', 'ranseur', 'guisarme', 'kukri',
        'bite', 'claw', 'claws', 'gore', 'slam', 'sting', 'tail slap', 'tentacle', 'talon', 'talons', 'hoof', 'wing',
    ];
    $found = [];
    foreach ($needles as $kw) {
        if (strpos($text, $kw) !== false) {
            $found[] = $kw;
        }
    }
    $found = array_unique($found);
    $parts = [];
    if (!empty($found)) {
        $parts[] = implode(', ', $found);
    }
    $t = trim((string) $treasure);
    if ($t !== '') {
        $parts[] = 'Treasure ' . $t;
    }
    $sp = trim((string) $space);
    $re = trim((string) $reach);
    if ($sp !== '' || $re !== '') {
        $parts[] = trim("Space {$sp} / Reach {$re}");
    }

    return implode('; ', array_filter($parts));
}

/**
 * Parse challenge rating to float (handles "1/2", "30").
 */
function intakeParseCrToFloat(?string $cr): float
{
    $cr = trim((string) $cr);
    if ($cr === '' || $cr === '—' || $cr === '-') {
        return 0.0;
    }
    if (strpos($cr, '/') !== false) {
        $parts = explode('/', $cr, 2);
        $d = floatval($parts[1] ?? 1);

        return $d > 0 ? (floatval($parts[0]) / $d) : 0.0;
    }

    return floatval($cr);
}

/**
 * Prefer exact/prefix matches and lowest CR — avoids random "Ancient Force Dragon" on vague tokens.
 */
function intakeRankMonstersForRequest(array $monsters, string $requestedName): array
{
    $req = strtolower(trim($requestedName));
    if ($req === '' || empty($monsters)) {
        return $monsters;
    }
    usort($monsters, function ($a, $b) use ($req) {
        $an = strtolower(trim($a['name'] ?? ''));
        $bn = strtolower(trim($b['name'] ?? ''));
        $ta = 9;
        $tb = 9;
        if ($an === $req) {
            $ta = 0;
        } elseif (strpos($an, $req) === 0) {
            $ta = 1;
        } elseif (strpos($an, $req) !== false) {
            $ta = 2;
        }
        if ($bn === $req) {
            $tb = 0;
        } elseif (strpos($bn, $req) === 0) {
            $tb = 1;
        } elseif (strpos($bn, $req) !== false) {
            $tb = 2;
        }
        if ($ta !== $tb) {
            return $ta <=> $tb;
        }
        $cra = intakeParseCrToFloat($a['challenge_rating'] ?? '0');
        $crb = intakeParseCrToFloat($b['challenge_rating'] ?? '0');
        if ($cra != $crb) {
            return $cra <=> $crb;
        }

        return strlen($an) <=> strlen($bn);
    });

    return $monsters;
}

/**
 * Map Homebrew SQLite custom_monsters row into SRD-shaped keys for intake_creature.
 */
function intakeCustomMonsterSqliteRowToSrdShape(array $cm): array
{
    $sum = trim((string) ($cm['stat_summary'] ?? ''));

    return [
        'name' => $cm['name'] ?? 'Creature',
        'type' => trim((string) ($cm['type_line'] ?? '')) !== '' ? trim($cm['type_line']) : 'Magical Beast',
        'hit_dice' => trim((string) ($cm['hit_dice'] ?? '')) !== '' ? trim($cm['hit_dice']) : '2d8',
        'armor_class' => trim((string) ($cm['armor_class'] ?? '')) !== '' ? trim($cm['armor_class']) : '14',
        'abilities' => trim((string) ($cm['abilities'] ?? '')) !== '' ? trim($cm['abilities']) : 'Str 14, Dex 12, Con 13, Int 2, Wis 12, Cha 6',
        'saves' => '',
        'speed' => '30 ft.',
        'attack' => '',
        'full_attack' => '',
        'special_attacks' => '',
        'special_qualities' => $sum !== '' ? $sum : '',
        'skills' => '',
        'feats' => '',
        'alignment' => 'N',
        'challenge_rating' => trim((string) ($cm['cr'] ?? '')) !== '' ? trim($cm['cr']) : '1',
        'initiative' => '+0',
        'base_attack' => '+1',
        'grapple' => '',
        'environment' => '',
        'organization' => '',
        'advancement' => '',
        'treasure' => '',
        'space' => '5 ft.',
        'reach' => '5 ft.',
        '_homebrew_custom' => true,
        '_homebrew_notes' => $sum,
    ];
}

/**
 * Look up user's Homebrew monsters when SRD has no match.
 *
 * @return array<int, array<string,mixed>>
 */
function intakeFetchCustomMonstersForCreature(int $userId, int $townId, int $uid, string $creatureName, array $nameVariants): array
{
    require_once __DIR__ . '/user_db.php';
    $campId = null;
    if ($townId > 0) {
        $tc = query('SELECT campaign_id FROM towns WHERE id = ?', [$townId], $uid);
        if ($tc && isset($tc[0])) {
            $v = $tc[0]['campaign_id'] ?? null;
            $campId = ($v !== null && $v !== '') ? (int) $v : null;
        }
    }
    $terms = array_values(array_unique(array_filter(array_merge([trim($creatureName)], $nameVariants), function ($t) {
        return trim((string) $t) !== '';
    })));
    $seen = [];
    $out = [];
    foreach ($terms as $term) {
        $term = trim((string) $term);
        if (strlen($term) < 2) {
            continue;
        }
        try {
            if ($campId) {
                $rows = userQuery($userId, 'SELECT * FROM custom_monsters WHERE (campaign_id = ? OR campaign_id IS NULL) AND (LOWER(TRIM(name)) = LOWER(?) OR name LIKE ?) LIMIT 8', [$campId, $term, '%' . $term . '%']);
            } else {
                $rows = userQuery($userId, 'SELECT * FROM custom_monsters WHERE campaign_id IS NULL AND (LOWER(TRIM(name)) = LOWER(?) OR name LIKE ?) LIMIT 8', [$term, '%' . $term . '%']);
            }
        } catch (Exception $e) {
            continue;
        }
        foreach ($rows as $cm) {
            $cid = (int) ($cm['id'] ?? 0);
            if ($cid && isset($seen[$cid])) {
                continue;
            }
            if ($cid) {
                $seen[$cid] = true;
            }
            $out[] = intakeCustomMonsterSqliteRowToSrdShape($cm);
        }
        if (!empty($out)) {
            break;
        }
    }

    return $out;
}

/**
 * Group consecutive stubs so each group is either all creatures or all NPCs (batched prompts differ).
 *
 * @param array[] $stubs
 * @return array<int, array{creature: bool, stubs: array}>
 */
function ew_intake_group_stubs_by_creature_flag(array $stubs): array
{
    $groups = [];
    foreach ($stubs as $stub) {
        $isC = !empty($stub['is_creature']);
        $n = count($groups);
        if ($n === 0 || $groups[$n - 1]['creature'] !== $isC) {
            $groups[] = ['creature' => $isC, 'stubs' => [$stub]];
        } else {
            $groups[$n - 1]['stubs'][] = $stub;
        }
    }

    return $groups;
}

/**
 * Decode a JSON array of character objects from model output (tolerates fences / light noise).
 *
 * @return array<int, array>|null
 */
function ew_intake_decode_json_character_array(string $raw): ?array
{
    $t = trim(preg_replace('/^\s*`+\w*\s*/i', '', $raw));
    $t = preg_replace('/\s*`+\s*$/', '', $t);
    $t = trim($t);
    $arr = json_decode($t, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($arr)) {
        $t2 = preg_replace('/[\x00-\x1F\x7F]/u', ' ', $t);
        $arr = json_decode($t2, true);
    }
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($arr)) {
        return null;
    }
    if (isset($arr['characters']) && is_array($arr['characters'])) {
        $arr = $arr['characters'];
    }

    return array_values($arr);
}

/**
 * Phase 2: flesh one stub (single OpenRouter round-trip). Used as fallback inside batches.
 *
 * @return array<string, mixed>|null
 */
function ew_intake_flesh_single_stub(
    array $stub,
    bool $isCreature,
    string $townName,
    string $dndEdition,
    string $campaignDesc,
    string $campaignRules,
    string $rules,
    string $featRef,
    string $apiKey,
    string $model,
    string $openRouterUrl,
    int $userId
): ?array {
    $sn = trim($stub['name'] ?? 'Unknown');
    $sr = trim($stub['race'] ?? 'Human');
    $sc = trim($stub['class'] ?? 'Commoner 1');
    $sg = ($stub['gender'] ?? 'M');
    $sa = (int) ($stub['age'] ?? 25);
    $srl = trim($stub['role'] ?? '');
    $sal = trim($stub['alignment'] ?? 'TN');

    $campDescLine = $campaignDesc ? "\nWorld Setting: {$campaignDesc}" : '';

    if ($isCreature) {
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
        'model' => $model,
        'messages' => [['role' => 'user', 'content' => $fleshPrompt]],
        'temperature' => 0.9,
        'max_tokens' => 1024,
    ]);
    $ch2 = curl_init($openRouterUrl);
    curl_setopt_array($ch2, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => array_merge([
            "Authorization: Bearer {$apiKey}",
            'Content-Type: application/json',
        ], openRouterAppHeaders()),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 90,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $resp2 = curl_exec($ch2);
    $code2 = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
    curl_close($ch2);
    resetDB();

    if ($code2 !== 200 || !$resp2) {
        return null;
    }

    $d2 = json_decode($resp2, true);
    $t2 = $d2['choices'][0]['message']['content'] ?? '';
    if (!empty($d2['usage'])) {
        ew_track_intake_flesh_billing($userId, 1, [$d2['usage']]);
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
        return $parsed;
    }

    return null;
}

/**
 * One LLM call for up to 10 stubs of the same mode (NPC vs creature). Falls back to per-stub on failure.
 *
 * @param array[] $chunk
 * @return array[]
 */
function ew_intake_flesh_batch_chunk(
    array $chunk,
    bool $allCreatures,
    string $townName,
    string $dndEdition,
    string $campaignDesc,
    string $campaignRules,
    string $rules,
    string $featRef,
    string $apiKey,
    string $model,
    string $openRouterUrl,
    int $userId
): array {
    $n = count($chunk);
    if ($n === 0) {
        return [];
    }

    if ($n === 1) {
        $one = ew_intake_flesh_single_stub(
            $chunk[0],
            $allCreatures,
            $townName,
            $dndEdition,
            $campaignDesc,
            $campaignRules,
            $rules,
            $featRef,
            $apiKey,
            $model,
            $openRouterUrl,
            $userId
        );

        return $one ? [$one] : [];
    }

    $stubLines = [];
    foreach ($chunk as $idx => $stub) {
        $sn = trim($stub['name'] ?? 'Unknown');
        $sr = trim($stub['race'] ?? 'Human');
        $sc = trim($stub['class'] ?? 'Commoner 1');
        $sg = $stub['gender'] ?? 'M';
        $sa = (int) ($stub['age'] ?? 25);
        $srl = trim($stub['role'] ?? '');
        $sal = trim($stub['alignment'] ?? 'TN');
        $stubLines[] = ($idx + 1) . ". Name: {$sn} | Race: {$sr} | Class: {$sc} | Gender: {$sg} | Age: {$sa} | Role: {$srl} | Alignment: {$sal}";
    }
    $stubBlock = implode("\n", $stubLines);
    $campDescLine = $campaignDesc ? "\nWorld Setting: {$campaignDesc}\n" : '';

    if ($allCreatures) {
        $batchPrompt = "Generate creature flavor details for {$n} D&D {$dndEdition} creatures in \"{$townName}\".
{$campDescLine}Campaign Rules: {$campaignRules}
{$rules}

STUBS (output array index MUST match line order — element [0] = line 1, etc.):
{$stubBlock}

Rules:
- MONSTERS/CREATURES only — no player/NPC classes.
- DO NOT output ability scores, HP, AC, gear, spells, feats (beyond empty string), or skills lists beyond empty strings.
- Copy \"name\", \"race\", \"class\", \"gender\", \"age\", \"alignment\", \"role\" EXACTLY from each stub line.
- Each object: \"status\":\"Alive\", \"skills_feats\":\"\", \"feats\":\"\", \"reason\" (1-2 sentences why near {$townName}), \"is_creature\":true.

OUTPUT: Valid JSON array ONLY, exactly {$n} objects. No markdown or commentary.";
    } else {
        $batchPrompt = "Generate NPC flavor details for {$n} D&D {$dndEdition} characters in \"{$townName}\".
{$campDescLine}Campaign Rules: {$campaignRules}
{$rules}

STUBS (output array index MUST match line order — element [0] = line 1, etc.):
{$stubBlock}

Rules:
- DO NOT generate ability scores, HP, AC, ATK, gear, or spells (system-calculated).
- Feats: 1 at 1st level + 1 per 3 levels. Humans get 1 extra at 1st. Fighters/Warriors get bonus combat feats. Pick from:
{$featRef}
- Skills: class/cross-class skill names only in \"skills_feats\".
- Copy \"name\", \"race\", \"class\", \"gender\", \"age\", \"alignment\", \"role\" EXACTLY from each stub line.
- Each object: \"status\":\"Alive\", \"skills_feats\", \"feats\", \"reason\" (2-3 sentences).

OUTPUT: Valid JSON array ONLY, exactly {$n} objects. No markdown or commentary.";
    }

    $maxTok = min(8192, max(2048, (int) (600 * $n + 900)));

    $payload = json_encode([
        'model' => $model,
        'messages' => [['role' => 'user', 'content' => $batchPrompt]],
        'temperature' => 0.85,
        'max_tokens' => $maxTok,
    ]);
    $ch2 = curl_init($openRouterUrl);
    curl_setopt_array($ch2, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => array_merge([
            "Authorization: Bearer {$apiKey}",
            'Content-Type: application/json',
        ], openRouterAppHeaders()),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 120,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $resp2 = curl_exec($ch2);
    $code2 = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
    curl_close($ch2);
    resetDB();

    if ($code2 !== 200 || !$resp2) {
        $fb = [];
        foreach ($chunk as $stub) {
            $one = ew_intake_flesh_single_stub(
                $stub,
                $allCreatures,
                $townName,
                $dndEdition,
                $campaignDesc,
                $campaignRules,
                $rules,
                $featRef,
                $apiKey,
                $model,
                $openRouterUrl,
                $userId
            );
            if ($one) {
                $fb[] = $one;
            }
        }

        return $fb;
    }

    $d2 = json_decode($resp2, true);
    $t2 = $d2['choices'][0]['message']['content'] ?? '';

    $parsedArr = ew_intake_decode_json_character_array($t2);

    $usageForBatch = [];

    if ($parsedArr !== null && count($parsedArr) === $n) {
        if (!empty($d2['usage'])) {
            $usageForBatch[] = $d2['usage'];
        }
        ew_track_intake_flesh_billing($userId, $n, $usageForBatch);
    } else {
        if (!empty($d2['usage'])) {
            $usageForBatch[] = $d2['usage'];
        }

        $payloadRetry = json_encode([
            'model' => $model,
            'messages' => [['role' => 'user', 'content' => $batchPrompt . "\n\nREMINDER: Output ONLY a JSON array of exactly {$n} objects. No markdown. Index order must match the stub list."]],
            'temperature' => 0.35,
            'max_tokens' => $maxTok,
        ]);
        $chR = curl_init($openRouterUrl);
        curl_setopt_array($chR, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payloadRetry,
            CURLOPT_HTTPHEADER => array_merge([
                "Authorization: Bearer {$apiKey}",
                'Content-Type: application/json',
            ], openRouterAppHeaders()),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 120,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $respR = curl_exec($chR);
        $codeR = curl_getinfo($chR, CURLINFO_HTTP_CODE);
        curl_close($chR);
        resetDB();

        if ($codeR === 200 && $respR) {
            $dR = json_decode($respR, true);
            if (!empty($dR['usage'])) {
                $usageForBatch[] = $dR['usage'];
            }
            $tR = $dR['choices'][0]['message']['content'] ?? '';
            $parsedArr = ew_intake_decode_json_character_array($tR);
        }

        if ($parsedArr !== null && count($parsedArr) === $n) {
            ew_track_intake_flesh_billing($userId, $n, $usageForBatch);
        } else {
            foreach ($usageForBatch as $uLog) {
                ew_ai_log_usage_analytics_row($userId, $uLog, 'intake_flesh');
            }
        }
    }

    if ($parsedArr === null || count($parsedArr) !== $n) {
        $fb = [];
        foreach ($chunk as $stub) {
            $one = ew_intake_flesh_single_stub(
                $stub,
                $allCreatures,
                $townName,
                $dndEdition,
                $campaignDesc,
                $campaignRules,
                $rules,
                $featRef,
                $apiKey,
                $model,
                $openRouterUrl,
                $userId
            );
            if ($one) {
                $fb[] = $one;
            }
        }

        return $fb;
    }

    $out = [];
    for ($i = 0; $i < $n; $i++) {
        $row = $parsedArr[$i];
        if (!is_array($row) || empty($row['name'])) {
            $fb = [];
            foreach ($chunk as $stub) {
                $one = ew_intake_flesh_single_stub(
                    $stub,
                    $allCreatures,
                    $townName,
                    $dndEdition,
                    $campaignDesc,
                    $campaignRules,
                    $rules,
                    $featRef,
                    $apiKey,
                    $model,
                    $openRouterUrl,
                    $userId
                );
                if ($one) {
                    $fb[] = $one;
                }
            }

            return $fb;
        }
        $out[] = $row;
    }

    return $out;
}

// ═══════════════════════════════════════════════════════════
// INTAKE ROSTER — Phase 1: Generate lightweight character list
// ═══════════════════════════════════════════════════════════
if ($action === 'intake_roster') {
    $townId = (int) ($input['town_id'] ?? 0);
    $numArrivals = max(1, min(150, (int) ($input['num_arrivals'] ?? 10)));
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
    $existingNamesBlock = empty($existingNames)
        ? '(none yet)'
        : ew_toon_fenced(ew_toon_primitive_array_line('existing_character_names', $existingNames, "\t"));
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

    $metaRows = query('SELECT `key`, value FROM town_meta WHERE town_id = ?', [$townId], $uid);
    $townMeta = [];
    foreach ($metaRows as $m)
        $townMeta[$m['key']] = $m['value'];
    $demographics = trim($townMeta['demographics'] ?? '');
    $biome = trim($townMeta['biome'] ?? '');
    $settlementType = trim($townMeta['settlement_type'] ?? '');
    $demoSnap = ew_sim_demographics_toon_snapshot($charCount, $raceCounts, $classCounts, $genderCounts, $demographics);
    if ($biome !== '') {
        $demoSnap .= "\n\nBiome/Terrain: {$biome}";
    }
    if ($settlementType !== '') {
        $demoSnap .= "\n\nSettlement Type: {$settlementType}";
    }

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
{$existingNamesBlock}

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
{$existingNamesBlock}

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
        "max_tokens" => 32768
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

    // Bill only after a usable roster exists (fixed price; see pricing.php).
    ew_track_intake_roster_ai_billing($userId, $numArrivals, $data['usage'] ?? null);

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

    $intakeCampId = ($town && !empty($town[0]['campaign_id'])) ? (int) $town[0]['campaign_id'] : null;
    $dndEdition = '3.5e';
    if ($intakeCampId) {
        $campRowFlesh = query('SELECT dnd_edition FROM campaigns WHERE id = ?', [$intakeCampId], 0);
        if ($campRowFlesh) {
            $dndEdition = $campRowFlesh[0]['dnd_edition'] ?? '3.5e';
        }
    } else {
        $userSettings = query('SELECT dnd_edition FROM users WHERE id = ?', [$userId], 0);
        $dndEdition = $userSettings ? ($userSettings[0]['dnd_edition'] ?? '3.5e') : '3.5e';
    }

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
    $timeLimit = 180;
    $fleshedChars = [];

    // One LLM call per up-to-10 stubs (shared feat/rules prompt) — see ew_intake_flesh_batch_chunk().
    $fleshBatchSize = 10;
    $groups = ew_intake_group_stubs_by_creature_flag($stubs);
    foreach ($groups as $group) {
        $creature = $group['creature'];
        $list = $group['stubs'];
        for ($gi = 0; $gi < count($list); $gi += $fleshBatchSize) {
            if (time() - $startTime >= $timeLimit) {
                break 2;
            }
            $chunk = array_slice($list, $gi, $fleshBatchSize);
            $part = ew_intake_flesh_batch_chunk(
                $chunk,
                $creature,
                $townName,
                $dndEdition,
                $campaignDesc,
                $campaignRules,
                $rules,
                $featRef,
                $apiKey,
                $model,
                $openRouterUrl,
                $userId
            );
            foreach ($part as $row) {
                $fleshedChars[] = $row;
            }
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
    $overrideName = trim($input['override_name'] ?? '');
    $reqMaxCrInput = null;
    if (isset($input['max_challenge_rating']) && $input['max_challenge_rating'] !== '' && $input['max_challenge_rating'] !== null) {
        $rm = floatval($input['max_challenge_rating']);
        if ($rm > 0) {
            $reqMaxCrInput = $rm;
        }
    }

    verifyTownOwnership($userId, $townId, $uid);
    if (!$creatureName)
        throw new Exception('Creature name is required');

    // Resolve edition
    $userSettings = query('SELECT dnd_edition FROM users WHERE id = ?', [$userId], 0);
    $dndEdition = $userSettings ? ($userSettings[0]['dnd_edition'] ?? '3.5e') : '3.5e';

    // Try plural/singular variants ("goblins" → "goblin") so LIKE matches SRD names
    $nameVariants = [$creatureName];
    $cnLow = strtolower($creatureName);
    if (strlen($creatureName) >= 4 && preg_match('/s$/i', $creatureName) && !preg_match('/ss$/i', $cnLow)) {
        $nameVariants[] = substr($creatureName, 0, -1);
    }
    if (strlen($creatureName) >= 5 && preg_match('/ies$/i', $creatureName)) {
        $nameVariants[] = substr($creatureName, 0, -3) . 'y';
    }
    $nameVariants = array_values(array_unique(array_filter($nameVariants)));

    // Look up ALL matching creatures in SRD using cascading search strategies
    // Strategy 1: Search by NAME (each variant)
    $monsters = [];
    foreach ($nameVariants as $term) {
        $monsters = srdQuery($dndEdition, 'SELECT * FROM monsters WHERE name LIKE ? ORDER BY name', ["%{$term}%"]);
        if (!empty($monsters))
            break;
        $monsters = srdQuery($dndEdition, 'SELECT * FROM monsters WHERE name = ? LIMIT 1', [$term]);
        if (!empty($monsters))
            break;
    }
    // Strategy 2: Search by TYPE field (e.g. "Humanoid (Goblinoid)", "Vermin", "Magical Beast")
    if (empty($monsters)) {
        foreach ($nameVariants as $term) {
            $monsters = srdQuery($dndEdition, 'SELECT * FROM monsters WHERE type LIKE ? ORDER BY name', ["%{$term}%"]);
            if (!empty($monsters))
                break;
        }
    }
    // Strategy 3: Search by FAMILY field (groups related monsters)
    if (empty($monsters)) {
        foreach ($nameVariants as $term) {
            $monsters = srdQuery($dndEdition, 'SELECT * FROM monsters WHERE family LIKE ? ORDER BY name', ["%{$term}%"]);
            if (!empty($monsters))
                break;
        }
    }
    // Strategy 4: Search by DESCRIPTOR field
    if (empty($monsters)) {
        foreach ($nameVariants as $term) {
            $monsters = srdQuery($dndEdition, 'SELECT * FROM monsters WHERE descriptor_text LIKE ? ORDER BY name', ["%{$term}%"]);
            if (!empty($monsters))
                break;
        }
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
        $monsters = intakeFetchCustomMonstersForCreature($userId, $townId, $uid, $creatureName, $nameVariants);
    }
    if (empty($monsters)) {
        throw new Exception("Creature '{$creatureName}' not found in the SRD or Homebrew → Monsters.");
    }


    // ── Max CR Filter: town gen_rules + optional request cap (Scribe imports use a sane default) ──
    $townMaxCr = null;
    try {
        $townMeta = query('SELECT value FROM town_meta WHERE town_id = ? AND `key` = ?', [$townId, 'gen_rules'], $uid);
        if (!empty($townMeta)) {
            $genRules = json_decode($townMeta[0]['value'], true);
            if (!empty($genRules['max_cr'])) {
                $townMaxCr = floatval($genRules['max_cr']);
            }
        }
    } catch (Exception $e) { /* ignore */ }

    $effectiveMaxCr = null;
    if ($townMaxCr !== null) {
        $effectiveMaxCr = $townMaxCr;
    }
    if ($reqMaxCrInput !== null) {
        $effectiveMaxCr = $effectiveMaxCr === null ? $reqMaxCrInput : min($effectiveMaxCr, $reqMaxCrInput);
    }

    if ($effectiveMaxCr !== null) {
        $monsters = array_filter($monsters, function ($m) use ($effectiveMaxCr) {
            return intakeParseCrToFloat($m['challenge_rating'] ?? '1') <= $effectiveMaxCr;
        });
        $monsters = array_values($monsters); // re-index
        if (empty($monsters)) {
            throw new Exception("No creatures found with CR ≤ {$effectiveMaxCr}. Try raising Max CR in Town Settings or use a more specific creature name.");
        }
    }

    $monsters = intakeRankMonstersForRequest($monsters, $creatureName);

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
        // Best-ranked match (exact name / lowest CR), not a random epic variant
        $monster = $monsters[0];

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
        $mTreasure = $monster['treasure'] ?? '';
        $mInit = $monster['initiative'] ?? '';

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

        // Gear + atk for CharacterSheet parseAttacks / parseGearWeapons
        $atkLine = intakeMonsterAtkForSheet($mAttack, $mFullAttack);
        $atkStr = $atkLine;
        if ($atkStr === '') {
            if ($mBAB) {
                $atkStr = 'BAB ' . $mBAB;
            }
            if ($mGrapple) {
                $atkStr .= ($atkStr !== '' ? '; ' : '') . 'Grapple ' . $mGrapple;
            }
        }

        $gearParts = [];
        if ($mBAB) {
            $gearParts[] = 'BAB ' . $mBAB;
        }
        if ($mGrapple) {
            $gearParts[] = 'Grapple ' . $mGrapple;
        }
        if ($mAttack) {
            $gearParts[] = "Attack: {$mAttack}";
        }
        if ($mFullAttack && $mFullAttack !== $mAttack) {
            $gearParts[] = "Full Attack: {$mFullAttack}";
        }
        $geoSup = intakeMonsterGearSupplement($mAttack, $mFullAttack, $mTreasure, $mSpace, $mReach);
        if ($geoSup !== '') {
            $gearParts[] = $geoSup;
        }
        $gearStr = implode('; ', array_filter($gearParts));

        $initStr = '';
        if (preg_match('/([+-]\d+)/', (string) $mInit, $im)) {
            $initStr = $im[1];
        }

        // Build special abilities string for reason/backstory
        $specialParts = [];
        if ($mSpecialAtk) $specialParts[] = "Special Attacks: {$mSpecialAtk}";
        if ($mSpecialQual) $specialParts[] = "Special Qualities: {$mSpecialQual}";
        $specialStr = implode('. ', $specialParts);

        // Check if creature is intelligent (Int >= 3)
        $isIntelligent = $abilities['int'] >= 3;
        // Generate unique name (optional story name when importing a single creature)
        $name = '';
        if ($count === 1 && $overrideName !== '') {
            $name = $overrideName;
        } elseif ($count === 1) {
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
            'cr' => $mCR,
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
            'init' => $initStr,
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
    $existingNamesToon = empty($existingNames)
        ? '(none)'
        : ew_toon_fenced(ew_toon_primitive_array_line('existing_character_names', $existingNames, "\t"));

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
- Name MUST NOT duplicate any name in this TOON list (literal \"(none)\" means no residents yet):
{$existingNamesToon}
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
    $curlErr = curl_error($ch);
    curl_close($ch);
    resetDB();

    if ($httpCode !== 200 || !$response) {
        throw new Exception("AI API error (HTTP {$httpCode}): " . ($curlErr ?: substr($response ?: '', 0, 300)));
    }

    $data = json_decode($response, true);
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

    ew_track_intake_custom_billing($userId, $data['usage'] ?? null);

    simRespond(['ok' => true, 'character' => $parsed, 'town_id' => $townId]);
}
