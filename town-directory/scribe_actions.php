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
    
    // Construct Prompt based on Generator Type
    $prompt = buildGeneratorPrompt($generatorType, $params, $worldContext);

    // Call OpenRouter
    $apiKey = resolveApiKey('OPENROUTER_KEY_SIM_RUN', $userId);
    $openRouterUrl = "https://openrouter.ai/api/v1/chat/completions";
    $model = defined("OPENROUTER_MODEL") ? OPENROUTER_MODEL : "google/gemini-2.5-flash";

    $temp = 0.8;
    if ($generatorType === 'quest' && !scribeAllowsInventedGeography($params)) {
        $temp = 0.55;
    }

    $payload = json_encode([
        "model" => $model,
        "messages" => [["role" => "user", "content" => $prompt]],
        "temperature" => $temp,
        "max_tokens" => 4096
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
    if (!empty($data['usage'])) {
        trackTokenUsage($userId, $data['usage'], 'scribe_generator');
    }
    
    $generatedText = $data["choices"][0]["message"]["content"] ?? "";
    $generatedText = trim($generatedText);

    simRespond(['ok' => true, 'content' => $generatedText]);
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
             WHERE t.campaign_id = ? AND t.user_id = ? AND c.is_dead = 0
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
        $town = query('SELECT name, current_year, current_month FROM towns WHERE id = ?', [$townId], $uid);
        if ($town) {
            $context .= "PRIMARY FOCUS — TOWN: {$town[0]['name']}\n";
            $context .= "In-game date: Year {$town[0]['current_year']}, Month {$town[0]['current_month']}\n\n";

            $history = query('SELECT heading, content FROM history WHERE town_id = ? ORDER BY sort_order DESC LIMIT 8', [$townId], $uid);
            if ($history) {
                $context .= "Recent history ({$town[0]['name']}):\n";
                foreach (array_reverse($history) as $h) {
                    $context .= "- {$h['heading']}: {$h['content']}\n";
                }
                $context .= "\n";
            }

            $npcs = query("SELECT name, race, class, role FROM characters WHERE town_id = ? AND is_dead = 0 ORDER BY RAND() LIMIT 18", [$townId], $uid);
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
 * Maps generator inputs to specific AI instructional prompts.
 */
function buildGeneratorPrompt($type, $params, $context) {
    $prompt = $context;
    $invent = scribeAllowsInventedGeography($params);

    $prompt .= "You are the 'AI Scribe', an expert Dungeon Master assistant for THIS campaign only.\n";
    $prompt .= "GROUNDING: The CANON CONTEXT block above is the source of truth for geography, themes, and existing people. Tie names, tensions, and locations to that text.\n";
    if (!$invent) {
        $prompt .= "STRICT MODE: Do NOT invent major new regions, kingdoms, continent-scale politics, villainous organizations, or signature NPCs that never appear in the CONTEXT. ";
        $prompt .= "If you need a minor site (a cellar, alley, barn, stretch of road, minor cave) you may add it only if it fits next to a named settlement or feature already in CONTEXT — label it clearly as local and small-scale.\n";
        $prompt .= "If the CONTEXT is thin, stay vague about unknown geography instead of fabricating a big world.\n";
    } else {
        $prompt .= "CREATIVE MODE: The user opted in to invented places or said so in the hook — you may add original locations or factions, but still reuse NPCs and themes from CONTEXT where they fit.\n";
    }
    $prompt .= "\n";

    if ($type === 'lore') {
        $topic = $params['topic'] ?? 'Unknown Topic';
        $ltype = $params['type'] ?? 'legend';
        $custom = $params['custom'] ?? '';
        $prompt .= "TASK: Generate a rich, descriptive piece of Lore about: \"{$topic}\"\n";
        $prompt .= "LORE TYPE: {$ltype}\n";
        if ($custom) $prompt .= "SPECIAL INSTRUCTIONS: {$custom}\n";
        $prompt .= "\nFORMATTING: Use Markdown. Start with a catchy title (# Title), provide 2-4 paragraphs of evocative text. Include a 'Hooks / Rumors' bulleted list at the end.";
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
        $prompt .= "\nFORMATTING: Use Markdown. Include sections for:\n# [Quest Title]\n## The Hook\n## Key Objectives\n## Expected Encounters\n## Complications / Twists\n## Rewards";
    }
    elseif ($type === 'dungeon') {
        $theme = $params['theme'] ?? 'Ancient Ruins';
        $size = $params['size'] ?? 'medium';
        $level = $params['level'] ?? 'Any Level';
        $prompt .= "TASK: Design a Dungeon.\n";
        if (!$invent) {
            $prompt .= "Place the site near or beneath a KNOWN settlement or landmark from CONTEXT; describe travel from there. No new continents.\n";
        }
        $prompt .= "THEME: {$theme}\nSIZE: {$size}\nLEVEL RANGE: {$level}\n";
        $prompt .= "\nFORMATTING: Use Markdown. Start with a description of the entrance. Then list the major rooms/areas (e.g., '## Area 1: The Foyer'). For each room, briefly describe the sensory details, monsters, traps, or treasure.";
    }
    elseif ($type === 'item') {
        $itype = $params['type'] ?? 'wondrous';
        $power = $params['power'] ?? 'medium';
        $theme = $params['theme'] ?? '';
        $prompt .= "TASK: Design a Magic Item.\n";
        $prompt .= "ITEM TYPE: {$itype}\nPOWER LEVEL: {$power}\nTHEME: {$theme}\n";
        $prompt .= "\nFORMATTING: Use Markdown. Provide the item name as a # Header, followed by its basic stats (Aura, Caster Level, Slot), an evocative physical description, its mechanical effects/abilities in bullet points, and a short paragraph of its history/lore in the world.";
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
