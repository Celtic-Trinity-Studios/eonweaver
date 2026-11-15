<?php
/**
 * AI Scribe Controller (Phase 3)
 * Handles Context-Aware AI Generation for Lore, Quests, Dungeons, Items, and Traps.
 */

if ($action === 'scribe_generate') {
    $townId = (int) ($input['town_id'] ?? 0);
    $generatorType = $input['generator_type'] ?? 'lore';
    $params = $input; // all other params
    
    // Resolve campaign ID
    $campId = 0;
    if ($townId > 0) {
        $townRows = query('SELECT campaign_id FROM towns WHERE id = ?', [$townId], $uid);
        if ($townRows) $campId = (int)$townRows[0]['campaign_id'];
    } else {
        // Fallback: same as api.php / sim — active campaign from campaigns table (no users.active_campaign_id column required)
        $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$userId], 0);
        if ($activeCamp) {
            $campId = (int) $activeCamp[0]['id'];
        }
    }

    // Build the World Context
    $worldContext = buildWorldContext($userId, $campId, $townId);

    $editionRows = query('SELECT dnd_edition FROM users WHERE id = ?', [$userId], 0);
    $dndEdition = ($editionRows && !empty($editionRows[0]['dnd_edition'])) ? $editionRows[0]['dnd_edition'] : '3.5e';

    // Construct Prompt based on Generator Type
    $prompt = buildGeneratorPrompt($generatorType, $params, $worldContext, $userId, $campId, $dndEdition);

    // Call OpenRouter
    $apiKey = resolveApiKey('OPENROUTER_KEY_SIM_RUN', $userId);
    $openRouterUrl = "https://openrouter.ai/api/v1/chat/completions";
    $model = defined("OPENROUTER_MODEL") ? OPENROUTER_MODEL : "google/gemini-2.5-flash";

    $temp = 1.05;
    $maxTokens = 4096;
    if ($generatorType === 'dungeon' || $generatorType === 'lore') {
        $temp = 1.15;
        $maxTokens = 8192;
    } elseif ($generatorType === 'quest' && !scribeAllowsInventedGeography($params)) {
        $temp = 0.75;
    }

    $scribeReqPayload = ew_openrouter_apply_profile([
        "model" => $model,
        "messages" => [["role" => "user", "content" => $prompt]],
        "temperature" => $temp,
        "max_tokens" => $maxTokens,
    ], 'creative');
    $payload = ew_json_encode_openrouter_body($scribeReqPayload);
    
    $ch = curl_init($openRouterUrl);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => array_merge([
            "Authorization: Bearer {$apiKey}",
            "Content-Type: application/json"
        ], openRouterAppHeaders()),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 120,
        CURLOPT_SSL_VERIFYPEER => true
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);
    resetDB();

    if ($httpCode !== 200 || !$response) {
        throw new Exception("Scribe API error (HTTP {$httpCode}): " . ($curlErr ?: substr($response ?: '', 0, 300)));
    }

    $data = json_decode($response, true);
    if (is_array($data)) {
        ew_openrouter_log_chat_completion('scribe_generate', $scribeReqPayload, $data, [
            'generator_type' => $generatorType,
            'town_id' => $townId,
        ]);
    }
    ew_track_ai_fixed_billing(
        $userId,
        $data['usage'] ?? null,
        ew_pricing_scribe_wallet_raw((string) $generatorType),
        'scribe_generator'
    );
    
    $generatedText = $data["choices"][0]["message"]["content"] ?? "";
    if (!is_string($generatedText)) {
        $generatedText = '';
    }
    $generatedText = preg_replace('/<think>.*?<\/think>\s*/s', '', $generatedText) ?? $generatedText;
    $generatedText = trim($generatedText);

    $ingest = null;
    $autoIngest = !isset($input['auto_ingest_lore']) || !empty($input['auto_ingest_lore']);
    if ($autoIngest && $campId > 0 && $generatedText !== '') {
        require_once __DIR__ . '/lore_lib.php';
        $ingestTitle = scribeExtractTitle($generatedText, 'Untitled lore');
        try {
            $ingest = loreIngestFromAi(
                $userId,
                $campId,
                $ingestTitle,
                $generatedText,
                (string) $generatorType,
                null,
                null
            );
        } catch (Exception $e) {
            $ingest = ['status' => 'error', 'message' => $e->getMessage()];
        }
    }

    simRespond(['ok' => true, 'content' => $generatedText, 'lore_ingest' => $ingest]);
}

function scribeExtractTitle(string $body, string $fallback = 'Untitled'): string
{
    if (preg_match('/^#\s+(.+)$/m', $body, $m)) {
        $t = trim($m[1]);
        $t = preg_replace('/\*\*(.+?)\*\*/', '$1', $t);
        return mb_substr($t, 0, 512);
    }
    $norm = str_replace("\r\n", "\n", $body);
    $line = strtok($norm, "\n");
    $line = trim((string) $line);
    if ($line !== '') {
        return mb_substr(preg_replace('/^#+\s*/', '', $line), 0, 512);
    }
    return $fallback;
}

/**
 * @return array{0: ?int, 1: ?int} [campaign_id, town_id]
 */
function scribeResolveScope(int $userId, int $townId): array
{
    if ($townId > 0) {
        $townRows = query('SELECT id, campaign_id FROM towns WHERE id = ? AND user_id = ?', [$townId, $userId], 0);
        if (!$townRows) {
            throw new Exception('Town not found or access denied.');
        }
        $camp = $townRows[0]['campaign_id'];
        $campId = ($camp !== null && $camp !== '') ? (int) $camp : null;
        return [$campId, $townId];
    }
    $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$userId], 0);
    $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;
    return [$campId, null];
}

/**
 * Checkbox or hook text explicitly allows inventing geography / factions outside saved lore.
 */
function scribeAllowsInventedGeography(array $params): bool
{
    if (!empty($params['invent_locations'])) {
        return true;
    }
    $h = strtolower($params['custom'] ?? '');
    if ($h === '') {
        return false;
    }
    return (bool) preg_match(
        '/\b(original (setting|realm|continent|world|location)|standalone (adventure|quest)|make up (a |the )?(place|location|realm|town|region)|invent (a |the )?(place|location|realm|faction|town)|new (continent|realm|plane|setting|dimension)|unrelated to (this|the) (world|campaign|setting)|outside (the |this )?(campaign|setting|world)|one[- ]shot elsewhere)\b/',
        $h
    );
}

/**
 * Loads campaign_rules for Scribe — campaign-scoped row first, then legacy NULL campaign_id fallback.
 *
 * @return array<string,mixed>|null
 */
function scribeFetchCampaignRules(int $userId, int $campId): ?array
{
    if ($campId > 0) {
        $rows = query(
            'SELECT rules_text, campaign_description, homebrew_settings FROM campaign_rules WHERE user_id = ? AND campaign_id = ? ORDER BY updated_at DESC LIMIT 1',
            [$userId, $campId],
            0
        );
        if ($rows) {
            return $rows[0];
        }
    }
    $rows = query(
        'SELECT rules_text, campaign_description, homebrew_settings FROM campaign_rules WHERE user_id = ? AND campaign_id IS NULL ORDER BY updated_at DESC LIMIT 1',
        [$userId],
        0
    );
    return $rows ? $rows[0] : null;
}

/**
 * Builds a context string from saved campaign + town data (canonical for grounded generation).
 */
function buildWorldContext($userId, $campId, $townId) {
    global $uid;
    $context = "=== CAMPAIGN WORLD CONTEXT (CANON — treat as authoritative over generic fantasy) ===\n";

    if ($campId > 0) {
        $cinf = query('SELECT name, description, dnd_edition FROM campaigns WHERE id = ? AND user_id = ?', [$campId, $userId], 0);
        if ($cinf) {
            $context .= 'Campaign: ' . ($cinf[0]['name'] ?? 'Unnamed') . "\n";
            $context .= 'Edition: ' . ($cinf[0]['dnd_edition'] ?? '') . "\n";
            $cd = trim($cinf[0]['description'] ?? '');
            if ($cd !== '') {
                $context .= "Campaign record (summary): {$cd}\n";
            }
            $context .= "\n";
        }
    }

    $rulesRow = scribeFetchCampaignRules($userId, $campId);
    if ($rulesRow) {
        $setting = trim($rulesRow['campaign_description'] ?? '');
        $rules = trim($rulesRow['rules_text'] ?? '');
        if ($setting !== '') {
            $context .= "WORLD / CAMPAIGN LORE (⚙️ Settings → stored description — primary canon text):\n{$setting}\n\n";
        }
        if ($rules !== '') {
            $context .= "HOUSE RULES & DM NOTES:\n{$rules}\n\n";
        }
        $hb = trim((string) ($rulesRow['homebrew_settings'] ?? ''));
        if ($hb !== '' && $hb !== '{}') {
            if (strlen($hb) > 4000) {
                $hb = substr($hb, 0, 4000) . "\n...[homebrew_settings truncated]";
            }
            $context .= "HOMEBREW / EXTRA (JSON):\n{$hb}\n\n";
        }
        if ($setting === '' && $rules === '' && ($hb === '' || $hb === '{}')) {
            $context .= "(Settings row exists but description/rules are empty — lean on settlements + NPC lists below + user prompt. Avoid inventing a full unseen world atlas.)\n\n";
        }
    } else {
        $context .= "(No ⚙️ Settings / campaign_rules row found — use settlements + NPCs + user prompt only; do NOT fabricate continents or major factions.)\n\n";
    }

    if ($campId > 0) {
        require_once __DIR__ . '/lore_lib.php';
        $context .= loreBuildContextForAi($userId, $campId);
    }

    if ($campId > 0) {
        $settles = query('SELECT id, name, subtitle FROM towns WHERE campaign_id = ? AND user_id = ? ORDER BY name', [$campId, $userId], $uid);
        if ($settles) {
            $context .= "KNOWN SETTLEMENTS IN THIS CAMPAIGN:\n";
            foreach ($settles as $tw) {
                $line = '- ' . $tw['name'];
                $st = trim($tw['subtitle'] ?? '');
                if ($st !== '') {
                    $line .= " — {$st}";
                }
                $context .= $line . "\n";
            }
            $context .= "\n";
        }

        $npcWide = query(
            "SELECT c.name, c.race, c.class, c.role, t.name AS town_name FROM characters c
             INNER JOIN towns t ON c.town_id = t.id
             WHERE t.campaign_id = ? AND t.user_id = ? AND COALESCE(TRIM(c.status), '') <> 'Deceased'
             ORDER BY RAND() LIMIT 22",
            [$campId, $userId],
            $uid
        );
        if ($npcWide) {
            $context .= "SAMPLE NPCS ACROSS THE CAMPAIGN (prefer these names/roles over new ones):\n";
            foreach ($npcWide as $npc) {
                $context .= "- {$npc['name']} ({$npc['race']} {$npc['class']}, {$npc['role']}) — {$npc['town_name']}\n";
            }
            $context .= "\n";
        }
    }

    if ($townId > 0) {
        $town = query('SELECT name FROM towns WHERE id = ? AND user_id = ?', [$townId, $userId], 0);
        if ($town) {
            // In-game date lives on calendar (not towns); align with get_calendar / save_calendar.
            $cy = 1490;
            $cm = 1;
            if ($campId > 0) {
                $calRows = query(
                    'SELECT current_year, current_month FROM calendar WHERE user_id = ? AND campaign_id = ? LIMIT 1',
                    [$userId, $campId],
                    0
                );
            } else {
                $calRows = query(
                    'SELECT current_year, current_month FROM calendar WHERE user_id = ? AND campaign_id IS NULL LIMIT 1',
                    [$userId],
                    0
                );
            }
            if ($calRows && !empty($calRows[0])) {
                $cy = (int) ($calRows[0]['current_year'] ?? 1490);
                $cm = (int) ($calRows[0]['current_month'] ?? 1);
            }
            $context .= "PRIMARY FOCUS — TOWN: {$town[0]['name']}\n";
            $context .= "In-game date: Year {$cy}, Month {$cm}\n\n";

            $history = query('SELECT heading, content FROM history WHERE town_id = ? ORDER BY sort_order DESC LIMIT 8', [$townId], $uid);
            if ($history) {
                $context .= "Recent history ({$town[0]['name']}):\n";
                foreach (array_reverse($history) as $h) {
                    $context .= "- {$h['heading']}: {$h['content']}\n";
                }
                $context .= "\n";
            }

            $npcs = query("SELECT name, race, class, role FROM characters WHERE town_id = ? AND COALESCE(TRIM(status), '') <> 'Deceased' ORDER BY RAND() LIMIT 18", [$townId], $uid);
            if ($npcs) {
                $context .= "Notable NPCs in {$town[0]['name']} (use these first):\n";
                foreach ($npcs as $npc) {
                    $context .= "- {$npc['name']} ({$npc['race']} {$npc['class']}, Role: {$npc['role']})\n";
                }
                $context .= "\n";
            }
        }
    }

    $context .= "=== END CANON CONTEXT ===\n\n";
    return $context;
}

/**
 * Dungeon Architect: encounters must name creatures that roster import can resolve (SRD + Homebrew → Monsters).
 */
function scribeDungeonMonsterNamingBlock(int $userId, int $campId, string $dndEdition): string
{
    $block = "=== CREATURE & ENCOUNTER RULES (MANDATORY FOR ROSTER IMPORT) ===\n";
    $block .= "This dungeon may be imported into the game. EVERY creature species you mention MUST already exist as either (1) a monster in the SRD bestiary for this edition, OR (2) an entry in the user's Homebrew → Monsters list below.\n";
    $block .= "Use EXACT names as they appear in those sources (e.g. \"Goblin\", \"Owlbear\", \"Orc\", \"Zombie\"). Do not invent new creature species or use vague labels like \"shadow beast\" unless that exact name appears in Homebrew below.\n";
    $block .= "Named people use a personal name plus an exact species (e.g. \"**Snarl Kem** — Orc Warrior 1\").\n";
    $block .= "Room text may say how many of a species are in that room. The ## NPCs list does not. Every person there is their own bullet. A bullet named \"Orcs\", \"Guards\", or \"Laborers\" is invalid.\n\n";

    try {
        $sampleRows = srdQuery($dndEdition, 'SELECT name FROM monsters ORDER BY RAND() LIMIT 120', []);
        $sample = [];
        foreach ($sampleRows as $r) {
            if (!empty($r['name'])) {
                $sample[] = $r['name'];
            }
        }
        $sample = array_values(array_unique($sample));
        if (!empty($sample)) {
            $block .= "Examples of VALID SRD creature names (random sample — the full list is much larger): " . implode(', ', $sample) . "\n\n";
        }
    } catch (Exception $e) {
        $block .= "(SRD sample unavailable — still restrict creatures to real OGL/SRD monster names for this edition.)\n\n";
    }

    try {
        require_once __DIR__ . '/user_db.php';
        $campaignForMonsters = $campId > 0 ? $campId : null;
        if ($campaignForMonsters === null) {
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$userId], 0);
            $campaignForMonsters = $activeCamp ? (int) $activeCamp[0]['id'] : null;
        }
        if ($campaignForMonsters) {
            $customRows = userQuery($userId, 'SELECT name FROM custom_monsters WHERE campaign_id = ? OR campaign_id IS NULL ORDER BY name', [$campaignForMonsters]);
        } else {
            $customRows = userQuery($userId, 'SELECT name FROM custom_monsters WHERE campaign_id IS NULL ORDER BY name');
        }
        $names = [];
        foreach ($customRows as $cr) {
            if (!empty($cr['name'])) {
                $names[] = $cr['name'];
            }
        }
        if (!empty($names)) {
            $block .= "ALLOWED HOMEBREW MONSTER NAMES (use these strings EXACTLY when you mean these creatures): " . implode(', ', $names) . "\n\n";
        } else {
            $block .= "No Homebrew monsters on file — use SRD creature names only. Add entries under ⚙️ Homebrew → Monsters if you need customs.\n\n";
        }
    } catch (Exception $e) {
        $block .= "(Homebrew monster list unavailable — use SRD names only.)\n\n";
    }

    return $block;
}

function scribePickOne(array $options): string
{
    if ($options === []) {
        return '';
    }

    return $options[random_int(0, count($options) - 1)];
}

/** How many separate people a dungeon of this size actually has on site. */
function scribeDungeonHeadcount(string $size): int
{
    return match ($size) {
        'small' => random_int(4, 7),
        'large' => random_int(12, 18),
        default => random_int(7, 12),
    };
}

/**
 * Recent library titles so a second click cannot reprint the last commission.
 */
function scribeRecentAvoidBlock(int $userId, int $campId, string $type): string
{
    if ($userId <= 0) {
        return '';
    }
    try {
        $rows = query(
            'SELECT title FROM scribe_library WHERE user_id = ? AND generator_type = ? AND (campaign_id <=> ?) ORDER BY updated_at DESC LIMIT 8',
            [$userId, $type, $campId > 0 ? $campId : null],
            0
        );
    } catch (Exception $e) {
        return '';
    }
    $titles = [];
    foreach ($rows ?: [] as $row) {
        $title = trim((string) ($row['title'] ?? ''));
        if ($title !== '' && strcasecmp($title, 'Untitled') !== 0 && strcasecmp($title, 'Untitled lore') !== 0) {
            $titles[] = $title;
        }
    }
    if ($titles === []) {
        return '';
    }

    return "ALREADY WRITTEN FOR THIS CAMPAIGN (do not reuse these titles, premises, proper names, or room sequences):\n- "
        . implode("\n- ", $titles) . "\n\n";
}

/**
 * A fresh roll on every request. Gemini otherwise mode-collapses an identical canon prompt
 * into one dungeon, especially while thinking is enabled.
 */
function scribeFreshCommissionBlock(string $type): string
{
    $nonce = bin2hex(random_bytes(4));
    $block = "FRESH COMMISSION {$nonce}: This is a new piece, not a revision. Honor every name the user typed. A second click must change the people, the job they are doing, and the order of events.\n";
    if ($type === 'lore') {
        $angle = scribePickOne([
            'a debt between two households and the object pledged for it',
            'a tool, boat, or animal that went missing this season and who had it last',
            'a burial, inheritance, or boundary marker people are fighting over',
            'a mill, ferry, well, or road and the person who controls it',
            'a local rule people are dodging, and the one official enforcing it',
            'a building or harvest that failed and the person being blamed',
            'a new arrival who took someone\'s work, bed, or stall',
            'a hunt, catch, or mine shift that came back short',
        ]);
        $block .= "LORE ROLL (binding for this click): Center the piece on {$angle}. Do not retell the last legend with new adjectives.\n\n";
        return $block;
    }
    if ($type === 'quest') {
        $hook = scribePickOne([
            'the patron is wrong about one concrete fact',
            'someone else already has the objective and is using it',
            'the trip is short; the trouble is the people at the destination',
            'two locals want opposite outcomes from the same job',
            'the pay is a favor, a key, a bed, or a waived debt, not a coin pile',
            'there is a deadline of a few days, tied to weather, a shift change, or a shipment',
        ]);
        $block .= "QUEST ROLL (binding for this click): {$hook}. Name each person involved on their own line. Do not reprint the last hook.\n\n";
        return $block;
    }
    if ($type === 'item') {
        $job = scribePickOne([
            'fishing', 'masonry', 'childbirth', 'bookkeeping', 'mining', 'cooking', 'herding', 'ferry work', 'brewing', 'surgery',
        ]);
        $drawback = scribePickOne([
            'it is heavy', 'it is loud', 'it needs fuel', 'it stains what it touches', 'it only works when wet', 'it only works in the dark', 'it numbs the hand that holds it',
        ]);
        $block .= "ITEM ROLL (binding for this click): Made for {$job}. The power is narrow. Drawback: {$drawback}. The last owner was a specific worker. Do not reprint the last item.\n\n";
        return $block;
    }
    if ($type === 'trap') {
        $built = scribePickOne([
            'the people who work here, out of the site\'s own materials',
            'a poacher protecting a cache',
            'a mason who left it unfinished',
            'livestock keepers protecting a pen',
        ]);
        $protects = scribePickOne([
            'a food store', 'a door someone sleeps behind', 'a tool crib', 'a prisoner', 'a water source', 'a single strongbox',
        ]);
        $block .= "TRAP ROLL (binding for this click): Built by {$built}. It protects {$protects}. Include a tell a local would notice. Do not reprint the last trap.\n\n";
        return $block;
    }
    if ($type !== 'dungeon') {
        return $block . "\n";
    }

    $layout = scribePickOne([
        'a vertical shaft with side galleries at different depths',
        'a dry upper floor over a flooded lower level',
        'a ring of rooms around one central hazard',
        'a linear descent that doubles back through a collapsed wing',
        'a sprawling work-site with a single finished ceremonial room',
        'stacked eras: an occupied top, a ruined middle, and an older sealed bottom',
        'two parallel paths that meet only at the end',
        'a small finished complex with most of the danger in the approaches and the doors',
    ]);
    $pressure = scribePickOne([
        'rising water or a tide that changes which rooms are usable',
        'unstable stone and a collapse that has already cut the site in two',
        'residual magic that misbehaves in one wing only',
        'spores, smoke, or bad air that forces a route',
        'clockwork or ritual machinery that resets a hazard',
        'extreme heat or cold in the lowest rooms',
        'darkness that is magical in one area and ordinary everywhere else',
        'a siege or cave-in still in progress when the party arrives',
    ]);
    $motive = scribePickOne([
        'the occupants are guarding a prisoner or a secret, not a hoard',
        'two factions share the site and are already at odds',
        'this was a workplace or shrine and is now a nest',
        'looters arrived first and are trapped inside with the original occupants',
        'someone is building or repairing the place, not merely camping in it',
        'the occupants are trying to leave and have trapped the way out',
        'the site is a waystation: most rooms are stores, pens, or barracks, with one real secret',
        'a single powerful creature is using weaker ones as labor',
    ]);
    $setpiece = scribePickOne([
        'a machine, gate, or font the occupants are using',
        'a vertical feature (well, chimney, pit, or lift) that connects two keyed areas',
        'a room whose treasure is a problem, not a reward',
        'a breach into an older, different ruin',
        'a living quarters that shows who is really in charge',
        'an unfinished project that explains the theme',
    ]);

    $block .= "DUNGEON ROLL (binding for this commission — do not fall back to a generic stacked crypt with a boss in the last room):\n";
    $block .= "- Layout: {$layout}\n";
    $block .= "- Environmental pressure: {$pressure}\n";
    $block .= "- Why it is occupied: {$motive}\n";
    $block .= "- Set piece: {$setpiece}\n\n";

    return $block;
}

/**
 * Maps generator inputs to specific AI instructional prompts.
 */
function buildGeneratorPrompt($type, $params, $context, $userId = 0, $campId = 0, $dndEdition = '3.5e') {
    $prompt = $context;
    $invent = scribeAllowsInventedGeography($params);

    $prompt .= "You are the 'AI Scribe', an expert Dungeon Master assistant for THIS campaign only.\n";
    $prompt .= "GROUNDING: The CANON CONTEXT block above is the source of truth for geography, themes, and existing people. Tie names, tensions, and locations to that text.\n";
    $prompt .= "When you mention an existing lore page or invent a named subject that deserves its own entry, use wiki syntax [[Page Title]] so the lore codex can cross-link.\n";
    if (!$invent) {
        $prompt .= "STRICT MODE: Do NOT invent major new regions, kingdoms, continent-scale politics, villainous organizations, or signature NPCs that never appear in the CONTEXT. ";
        $prompt .= "If you need a minor site (a cellar, alley, barn, stretch of road, minor cave) you may add it only if it fits next to a named settlement or feature already in CONTEXT — label it clearly as local and small-scale.\n";
        $prompt .= "If the CONTEXT is thin, stay vague about unknown geography instead of fabricating a big world.\n";
        $prompt .= "People who exist only inside this piece are minor locals. Give each one a personal name. Do not treat a species or a job as a single character.\n";
    } else {
        $prompt .= "CREATIVE MODE: The user opted in to invented places or said so in the hook — you may add original locations or factions, but still reuse NPCs and themes from CONTEXT where they fit.\n";
    }
    $prompt .= "\n";
    $prompt .= scribeFreshCommissionBlock((string) $type);
    $prompt .= scribeRecentAvoidBlock((int) $userId, (int) $campId, (string) $type);

    if ($type === 'lore') {
        $topic = $params['topic'] ?? 'Unknown Topic';
        $ltype = $params['type'] ?? 'legend';
        $custom = $params['custom'] ?? '';
        $prompt .= "TASK: Generate a rich, descriptive piece of Lore about: \"{$topic}\"\n";
        $prompt .= "LORE TYPE: {$ltype}\n";
        if ($custom) $prompt .= "SPECIAL INSTRUCTIONS: {$custom}\n";
        $prompt .= "\nFORMATTING: Use Markdown. Start with a catchy title (# Title), provide 2-4 paragraphs of concrete text about what people do and what is physically there. Include a 'Hooks / Rumors' bulleted list at the end.";
        $prompt .= "\nIf people matter, end with ## NPCs: two to five bullets, one person each, `- **Given Surname** — species, what they are doing`. No bullet named for a group.";
    } 
    elseif ($type === 'quest') {
        $qtype = $params['type'] ?? 'fetch';
        $level = $params['level'] ?? 'Any Level';
        $hook = $params['custom'] ?? '';
        $prompt .= "TASK: Design a Quest/Adventure hook and outline using ONLY the campaign canon above for place names, factions, and patrons — unless CREATIVE MODE is on.\n";
        $prompt .= "TYPE: {$qtype}\nLEVEL RANGE: {$level}\nUSER CORE HOOK (honor this; fold it into canon, do not contradict it): {$hook}\n";
        if (!$invent) {
            $prompt .= "QUEST CONSTRAINTS:\n";
            $prompt .= "- Anchor the patron, stakes, or clues to NPCs/places ALREADY in CONTEXT (prioritize PRIMARY FOCUS town if listed).\n";
            $prompt .= "- Do NOT name-drop new realms, continents, imperial capitals, or famous villains absent from CONTEXT.\n";
            $prompt .= "- Rumors should sound like gossip that locals in listed settlements could plausibly say.\n";
        }
        $prompt .= "\nFORMATTING: Use Markdown. Include sections for:\n# [Quest Title]\n## The Hook\n## Key Objectives\n## Expected Encounters\n## Complications / Twists\n## Rewards\n## NPCs";
        $prompt .= "\n## NPCs is one bullet per person involved (`- **Given Surname** — species class level, their stake`). A patron, a rival, and a worker are three bullets. \"The guards\" is not a bullet.";
    }
    elseif ($type === 'dungeon') {
        $prompt .= scribeDungeonMonsterNamingBlock((int) $userId, (int) $campId, $dndEdition);
        $theme = trim((string) ($params['theme'] ?? ''));
        $themeRolled = false;
        if ($theme === '') {
            $themeRolled = true;
            $theme = scribePickOne([
                'Flooded shrine',
                'Collapsed mine',
                'Buried menagerie',
                'Smuggler cistern',
                'Plague hospital',
                'Siege tunnel',
                'Root-choked barrow',
                'Glass foundry under a settlement',
                'Observatory cellar',
                'Half-built fortress',
                'Ossuary workshop',
                'Sunken customs house',
            ]);
        }
        $size = $params['size'] ?? 'medium';
        $level = $params['level'] ?? 'Any Level';
        $custom = trim($params['custom'] ?? '');
        $prompt .= "TASK: Design a Dungeon.\n";
        if (!$invent) {
            $prompt .= "Place the site near or beneath a KNOWN settlement or landmark from CONTEXT; describe travel from there. No new continents.\n";
        }
        $prompt .= "THEME: {$theme}\n";
        if ($themeRolled) {
            $prompt .= "The user left the theme blank. The theme above was rolled for THIS request. Do not substitute a generic ancient ruin.\n";
        }
        $prompt .= "SIZE: {$size}\nLEVEL RANGE: {$level}\n";
        $prompt .= "Make the floor plan match the DUNGEON ROLL. Each keyed area must be a different situation, not the same room renumbered.\n";
        $head = scribeDungeonHeadcount((string) $size);
        $prompt .= "OCCUPANTS: These are minor people who work or squat here, not new kingdoms or signature villains. Name every one of them.\n";
        $prompt .= "NPC ROSTER (binding): The ## NPCs section is exactly {$head} bullets and nothing else. Each bullet is one person, in this shape: `- **Given Surname** — Species Class Level, the job they are doing right now.` Species is an exact SRD or Homebrew name such as Orc, Goblin, or Human. Most are 1st-level Commoners or Warriors. At most one is in charge, and that person is only a level or two above the others. A bullet whose name is a species, a plural, or a shared job (Orcs, Guards, Laborers) is invalid.\n";
        if ($custom !== '') {
            $prompt .= "USER CONSTRAINTS (binding — monster types, factions, tone, forbidden creatures, or special requirements): {$custom}\n";
        }
        $prompt .= "\nFORMATTING: Use Markdown. Start with intro paragraphs (no heading required). Then each keyed room or area MUST start with its own line '## Room Title' or '## Area N: Name'. Describe what is in the room: objects, the named people who are there, exits, traps, and treasure.";
        $prompt .= "\nAfter the rooms, add '## NPCs' using the NPC ROSTER count and shape above, one person per bullet, so each can be imported into the roster.";
    }
    elseif ($type === 'item') {
        $itype = $params['type'] ?? 'wondrous';
        $power = $params['power'] ?? 'medium';
        $theme = $params['theme'] ?? '';
        $prompt .= "TASK: Design a Magic Item.\n";
        $prompt .= "ITEM TYPE: {$itype}\nPOWER LEVEL: {$power}\nTHEME: {$theme}\n";
        $prompt .= "\nFORMATTING: Use Markdown. Provide the item name as a # Header, followed by its basic stats (Aura, Caster Level, Slot), a physical description, its mechanical effects/abilities in bullet points, and a short paragraph of its history in the world.";
    }
    elseif ($type === 'trap') {
        $ttype = $params['type'] ?? 'mechanical';
        $cr = $params['cr'] ?? '1';
        $loc = $params['location'] ?? '';
        $prompt .= "TASK: Design a D&D Trap.\n";
        $prompt .= "TYPE: {$ttype}\nCHALLENGE RATING: CR {$cr}\nLOCATION CONTEXT: {$loc}\n";
        $prompt .= "\nFORMATTING: Use Markdown. Provide the Trap Name as a # Header. List its trigger, reset mechanism, Search DC, Disable Device DC, and the exact effects (Attack bonus, damage dice, saving throw DCs). Include a brief description of how it looks when triggered.";
    }
    
    return $prompt;
}

if ($action === 'scribe_save') {
    $townIdIn = (int) ($input['town_id'] ?? 0);
    $contentId = (int) ($input['content_id'] ?? 0);
    $generatorType = preg_replace('/[^a-z0-9_-]/i', '', (string) ($input['generator_type'] ?? 'lore'));
    if ($generatorType === '') {
        $generatorType = 'lore';
    }
    $rawData = $input['generated_data'] ?? '';
    $body = is_string($rawData) ? $rawData : json_encode($rawData);
    $body = is_string($body) ? $body : '';
    $titleIn = trim((string) ($input['title'] ?? ''));

    if (strlen($body) > 120000) {
        throw new Exception('Content too large (max ~120k characters).');
    }

    [$campId, $resolvedTown] = scribeResolveScope($userId, $townIdIn);
    $title = $titleIn !== '' ? mb_substr($titleIn, 0, 512) : scribeExtractTitle($body, 'Untitled piece');

    if ($contentId > 0) {
        $rows = query('SELECT id FROM scribe_library WHERE id = ? AND user_id = ?', [$contentId, $userId], 0);
        if (!$rows) {
            throw new Exception('Saved entry not found.');
        }
        execute(
            'UPDATE scribe_library SET generator_type = ?, title = ?, body = ?, town_id = ?, campaign_id = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
            [$generatorType, $title, $body, $resolvedTown, $campId, $contentId, $userId],
            $uid
        );
        resetDB();
        $ingest = null;
        if (!empty($input['ingest_lore']) && $campId > 0) {
            require_once __DIR__ . '/lore_lib.php';
            $ingest = loreIngestFromAi($userId, (int) $campId, $title, $body, $generatorType, 'scribe:' . $contentId, null);
        }
        simRespond(['ok' => true, 'id' => $contentId, 'lore_ingest' => $ingest]);
    }

    $newId = insertAndGetId(
        'INSERT INTO scribe_library (user_id, campaign_id, town_id, generator_type, title, body) VALUES (?, ?, ?, ?, ?, ?)',
        [$userId, $campId, $resolvedTown, $generatorType, $title, $body],
        $uid
    );
    resetDB();
    $ingest = null;
    if ((!isset($input['ingest_lore']) || !empty($input['ingest_lore'])) && $campId > 0) {
        require_once __DIR__ . '/lore_lib.php';
        try {
            $ingest = loreIngestFromAi($userId, (int) $campId, $title, $body, $generatorType, 'scribe:' . $newId, null);
        } catch (Exception $e) {
            $ingest = ['status' => 'error', 'message' => $e->getMessage()];
        }
    }
    simRespond(['ok' => true, 'id' => $newId, 'lore_ingest' => $ingest]);
}

if ($action === 'scribe_get_history') {
    $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$userId], 0);
    $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;

    $rows = query(
        'SELECT id, town_id, generator_type, title,
                SUBSTRING(body, 1, 240) AS preview,
                CHAR_LENGTH(body) AS body_chars,
                updated_at
         FROM scribe_library
         WHERE user_id = ? AND (campaign_id <=> ?)
         ORDER BY updated_at DESC
         LIMIT 200',
        [$userId, $campId],
        $uid
    );
    resetDB();
    simRespond(['ok' => true, 'entries' => $rows]);
}

if ($action === 'scribe_library_get') {
    $id = (int) ($input['id'] ?? 0);
    if ($id <= 0) {
        throw new Exception('Invalid id.');
    }
    $rows = query(
        'SELECT id, campaign_id, town_id, generator_type, title, body, created_at, updated_at FROM scribe_library WHERE id = ? AND user_id = ?',
        [$id, $userId],
        $uid
    );
    resetDB();
    if (!$rows) {
        throw new Exception('Entry not found.');
    }
    simRespond(['ok' => true, 'entry' => $rows[0]]);
}

if ($action === 'scribe_delete') {
    $id = (int) ($input['id'] ?? 0);
    if ($id <= 0) {
        throw new Exception('Invalid id.');
    }
    $n = execute('DELETE FROM scribe_library WHERE id = ? AND user_id = ?', [$id, $userId], $uid);
    resetDB();
    simRespond(['ok' => true, 'deleted' => $n > 0]);
}

if (!in_array($action, ['scribe_generate', 'scribe_save', 'scribe_get_history', 'scribe_library_get', 'scribe_delete'], true)) {
    simRespond(['ok' => false, 'error' => 'Unknown scribe action']);
}
