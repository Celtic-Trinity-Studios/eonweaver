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
        // Fallback to active campaign
        $userRows = query('SELECT active_campaign_id FROM users WHERE id = ?', [$userId], 0);
        if ($userRows) $campId = (int)$userRows[0]['active_campaign_id'];
    }

    // Build the World Context
    $worldContext = buildWorldContext($userId, $campId, $townId);
    
    // Construct Prompt based on Generator Type
    $prompt = buildGeneratorPrompt($generatorType, $params, $worldContext);

    // Call OpenRouter
    $apiKey = resolveApiKey('OPENROUTER_KEY_SIM_RUN', $userId);
    $openRouterUrl = "https://openrouter.ai/api/v1/chat/completions";
    $model = defined("OPENROUTER_MODEL") ? OPENROUTER_MODEL : "google/gemini-2.5-flash";

    $payload = json_encode([
        "model" => $model,
        "messages" => [["role" => "user", "content" => $prompt]],
        "temperature" => 0.8,
        "max_tokens" => 4096
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
 * Builds a massive context string containing active lore, rules, and NPC state
 * so the AI knows exactly what's happening in the world.
 */
function buildWorldContext($userId, $campId, $townId) {
    global $uid;
    $context = "=== CAMPAIGN WORLD CONTEXT ===\n";
    
    // 1. Campaign Rules / Setting
    if ($campId) {
        $camp = query('SELECT rules_text, campaign_description FROM campaign_rules WHERE user_id = ? AND campaign_id = ?', [$userId, $campId], 0);
        if ($camp) {
            $context .= "Setting Description: " . ($camp[0]['campaign_description'] ?? 'Standard D&D fantasy') . "\n";
            $context .= "House Rules: " . ($camp[0]['rules_text'] ?? 'None') . "\n\n";
        }
    }
    
    // 2. Town Context (if focused on a town)
    if ($townId > 0) {
        $town = query('SELECT name, current_year, current_month FROM towns WHERE id = ?', [$townId], $uid);
        if ($town) {
            $context .= "Current Location: Town of {$town[0]['name']}\n";
            $context .= "Current Date: Year {$town[0]['current_year']}, Month {$town[0]['current_month']}\n\n";
            
            // Town History (Last 5 events)
            $history = query('SELECT heading, content FROM history WHERE town_id = ? ORDER BY sort_order DESC LIMIT 5', [$townId], $uid);
            if ($history) {
                $context .= "Recent History of {$town[0]['name']}:\n";
                foreach (array_reverse($history) as $h) {
                    $context .= "- {$h['heading']}: {$h['content']}\n";
                }
                $context .= "\n";
            }
            
            // Notable NPCs (Leaders, high level)
            $npcs = query("SELECT name, race, class, role FROM characters WHERE town_id = ? AND is_dead = 0 ORDER BY RAND() LIMIT 15", [$townId], $uid);
            if ($npcs) {
                $context .= "Notable Local NPCs:\n";
                foreach ($npcs as $npc) {
                    $context .= "- {$npc['name']} ({$npc['race']} {$npc['class']}, Role: {$npc['role']})\n";
                }
                $context .= "\n";
            }
        }
    }
    
    $context .= "===============================\n\n";
    return $context;
}

/**
 * Maps generator inputs to specific AI instructional prompts.
 */
function buildGeneratorPrompt($type, $params, $context) {
    $prompt = $context;
    $prompt .= "You are the 'AI Scribe', an expert Dungeon Master assistant generating content for this D&D campaign.\n";
    $prompt .= "CRITICAL INSTRUCTION: Use the WORLD CONTEXT above to embed the generated content deeply into the existing world. Mention specific NPCs, recent events, or the town's name where appropriate. Make it feel alive and interconnected.\n\n";
    
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
        $prompt .= "TASK: Design a Quest/Adventure.\n";
        $prompt .= "TYPE: {$qtype}\nLEVEL RANGE: {$level}\nCORE HOOK: {$hook}\n";
        $prompt .= "\nFORMATTING: Use Markdown. Include sections for:\n# [Quest Title]\n## The Hook\n## Key Objectives\n## Expected Encounters\n## Complications / Twists\n## Rewards";
    }
    elseif ($type === 'dungeon') {
        $theme = $params['theme'] ?? 'Ancient Ruins';
        $size = $params['size'] ?? 'medium';
        $level = $params['level'] ?? 'Any Level';
        $prompt .= "TASK: Design a Dungeon.\n";
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
