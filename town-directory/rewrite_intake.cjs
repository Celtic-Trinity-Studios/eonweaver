const fs = require('fs');
const filepath = 'simulate.php';
const lines = fs.readFileSync(filepath, 'utf8').split('\n');

// The intake code builds $simulation and ends at line 493 (];)  
// Then we need to add:
// 1. Close the intake if block, respond, and add the else block
// 2. The time simulation prompt
// 3. The LLM calling code
// 4. The JSON parsing code
// 5. Then simRespond for the else path

// We need to replace lines 493-500 (the current broken transition)
// Line 493: ];  (end of $simulation assignment)
// Line 494: (blank)
// Line 495: simRespond([  
// Line 496-499: rest of simRespond
// Line 500: ]);
// Line 501: break;

// After intake, we need to simRespond and break for the intake path,
// then have the else for time simulation

const insertAfter = 493; // after the $simulation = [...]; line (0-indexed: 492)

const timeSimCode = `
                // Intake complete — send response
                simRespond([
                    'ok' => true,
                    'simulation' => $simulation,
                    'town_id' => $townId,
                    'months' => $months
                ]);
                break 2; // exit both if and switch

            } else {
                // ── Full Time Simulation ─────────────────────────────
                $prompt = <<<PROMPT

## SYSTEM RULES (D&D {$dndEdition}):
- All game mechanics MUST follow D&D {$dndEdition} rules exactly.
- XP HARD LIMIT: Speed is "{$xpSpeed}". Maximum {$xpMax} XP per character PER MONTH. For this {$months}-month simulation, total xp_gained per character MUST NOT exceed {$xpTotal}. Most should gain well below the cap. Vary it randomly.

## MANDATORY CHARACTER GENERATION RULES (D&D 3.5e LEGAL):
Every new character MUST be fully generated following D&D {$dndEdition} rules exactly:

### Ability Scores (4d6 drop lowest):
- Scores range 3-18 before racial modifiers. Apply racial modifiers: Human: none. Dwarf: +2 CON/-2 CHA. Elf: +2 DEX/-2 CON. Gnome: +2 CON/-2 STR. Halfling: +2 DEX/-2 STR. Half-Orc: +2 STR/-2 INT/-2 CHA.
- Most NPCs have average-ish scores (8-14). Vary them realistically. NOT all 10s.

### Hit Points:
- HP = Hit Die MAX at level 1 + CON modifier.
- Commoner d4, Expert d6, Warrior d8, Adept d6, Aristocrat d8, Fighter d10, Cleric d8, Wizard d4, Rogue d6, Ranger d8, Barbarian d12, Bard d6, Paladin d10, Monk d8, Druid d8, Sorcerer d4.

### Armor Class:
- AC = 10 + armor bonus + shield bonus + DEX mod. Most commoners: 10-12. Guards: 14-17.

### Classes:
- Most townspeople: NPC classes (Commoner, Expert, Warrior, Adept, Aristocrat). Player classes RARE (1 in 10).
- Children/babies use Commoner 1.
- ALL new characters MUST be Level 1.

### Feats (MANDATORY - NEVER LEAVE EMPTY):
- Level 1: 1 feat. Humans: 2 feats. Fighters/Warriors: +1 bonus combat feat.
- ONLY use feats from the official SRD feat list:
{$featRef}
- A character with an EMPTY feats field is INVALID.

### Skills (MANDATORY):
- Skill points at Level 1 = (class skill points + INT mod) x 4.
- Commoner 2+INT, Expert 6+INT, Warrior 2+INT, Adept 2+INT, Aristocrat 4+INT.
- Format: "Craft (farming) +5, Listen +2"

### Gear (MANDATORY - SRD ITEMS ONLY):
- Use ONLY real D&D 3.5e SRD equipment. Do NOT invent items.
- WEAPONS (use these exact names): dagger, handaxe, light hammer, sickle, short sword, club, longsword, rapier, scimitar, warhammer, battleaxe, flail, mace, heavy mace, morningstar, shortspear, trident, greatsword, greataxe, greatclub, longspear, quarterstaff, glaive, halberd, lance, scythe, falchion, shortbow, longbow, light crossbow, heavy crossbow, javelin, sling.
- ARMOR (use these exact names): padded armor, leather armor, studded leather armor, chain shirt, chainmail, breastplate, splint mail, banded mail, half-plate, full plate.
- SHIELDS: buckler, light wooden shield, light steel shield, heavy wooden shield, heavy steel shield, tower shield.
- CLOTHING: peasant's outfit, traveler's outfit, artisan's outfit, scholar's outfit, courtier's outfit, noble's outfit, explorer's outfit, monk's outfit, cleric's vestments, entertainer's outfit.
- ADVENTURING GEAR: backpack, bedroll, belt pouch, candle, flint and steel, rope (50 ft.), sack, torch, waterskin, rations (trail), ink, inkpen, parchment, spell component pouch, holy symbol (wooden), holy symbol (silver), spellbook, healer's kit, thieves' tools, artisan's tools, musical instrument.
- Additional SRD gear:
{$equipRef}
- Every character needs: clothing, at least one weapon (even dagger), role-specific tools.

## WORLD SIMULATION SETTINGS:
- Relationship Formation Speed: {$relSpeed}. Characters forge relationships over time — romantic, friendly, AND hostile.
- Birth Rate: {$birthRate}. Established couples may have children.
- Child Growth: {$childGrowth}.
- Population & Death: {$popText} Current population: {$charCount}.
- Conflict & Events Frequency: {$conflictFreq}. This controls how often dangerous and dramatic events occur.

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
(CRITICAL: Do NOT reuse any names from this roster for new arrivals.)
{$rosterText}
{$historyText}

## Campaign Rules:
{$rules}

## Additional Instructions for this Simulation:
{$instructions}

## Your Task:
Simulate {$months} month(s) of time passing. You MUST include:
- XP gains, new relationships (positive AND negative), births, deaths, new arrivals, drama, events, role changes.

## CRITICAL: Output Format
You MUST respond with ONLY a valid JSON object (no markdown, no code fences, JUST the raw JSON) in this exact structure:
{
  "summary": "1-2 paragraph narrative summary",
  "events": [{"month": 1, "description": "What happened"}],
  "changes": {
    "new_characters": [{"name":"Full Name","race":"Human","class":"Commoner 1","gender":"M or F","age":25,"status":"Alive","alignment":"NG","hp":4,"ac":10,"str":10,"dex":10,"con":10,"int_":10,"wis":10,"cha":10,"spouse":"None","spouse_label":"","role":"Farmer","skills_feats":"Craft +4","feats":"Skill Focus","gear":"Hoe, dagger","reason":"Born to... / Arrived..."}],
    "deaths": [{"name":"Character Name","reason":"How they died"}],
    "new_relationships": [{"char1":"Name","char2":"Name","type":"rival","reason":"Why"}],
    "xp_gains": [{"name":"Character Name","xp_gained":100,"reason":"What they did"}],
    "stat_changes": [{"name":"Character Name","field":"hp","old_value":"10","new_value":"12","reason":"Why"}],
    "role_changes": [{"name":"Character Name","old_role":"Farmer","new_role":"Guard","reason":"Why"}]
  },
  "new_history_entry": {"heading":"Months X-Y: Title","content":"Detailed narrative"}
}
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
                $model = defined("OPENROUTER_MODEL_SMART") ? OPENROUTER_MODEL_SMART : (defined("OPENROUTER_MODEL") ? OPENROUTER_MODEL : "google/gemini-2.5-flash");
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
                        "HTTP-Referer: https://worldscribe.online",
                        "X-Title: Ashenholm",
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
                $text = $data["choices"][0]["message"]["content"] ?? "";
            }

            // ── Parse JSON response ───────────────────────────────────
            $text = preg_replace('/^\\s*\`\`\`json\\s*/i', '', $text);
            $text = preg_replace('/\\s*\`\`\`\\s*$/', '', $text);
            $text = trim($text);

            // First, try plain decode
            $simulation = json_decode($text, true);

            // If that fails, sanitize control chars inside JSON strings (char-by-char)
            if (json_last_error() !== JSON_ERROR_NONE) {
                $cleaned = '';
                $inStr = false;
                $esc = false;
                for ($ci = 0, $clen = strlen($text); $ci < $clen; $ci++) {
                    $ch = $text[$ci];
                    if ($esc) { $cleaned .= $ch; $esc = false; continue; }
                    if ($ch === '\\\\' && $inStr) { $cleaned .= $ch; $esc = true; continue; }
                    if ($ch === '"') { $inStr = !$inStr; $cleaned .= $ch; continue; }
                    if ($inStr && ord($ch) < 0x20) { $cleaned .= ' '; continue; }
                    $cleaned .= $ch;
                }
                $simulation = json_decode($cleaned, true);
            }

            // Aggressive fallback
            if (json_last_error() !== JSON_ERROR_NONE) {
                $text2 = preg_replace('/[^\\x20-\\x7E\\x0A\\x0D\\x09]/u', '', $text);
                $simulation = json_decode($text2, true);
            }
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception('Failed to parse Gemini response as JSON: ' . json_last_error_msg() . "\\n\\nRaw response:\\n" . substr($text, 0, 500));
            }

            simRespond([
                'ok' => true,
                'simulation' => $simulation,
                'town_id' => $townId,
                'months' => $months
            ]);`;

// Find where to insert: after line 493 (the ];) and before break/apply_simulation
// Replace lines 493 through 501 (the broken transition + old simRespond + break)
const replaceStart = 492; // 0-indexed line 493
const replaceEnd = 501;   // 0-indexed line 502 (exclusive), which is the blank before apply_simulation

const before = lines.slice(0, replaceStart);
const after = lines.slice(replaceEnd);
const newLines = [...before, ...timeSimCode.split('\n'), ...after];

fs.writeFileSync(filepath, newLines.join('\n'), 'utf8');
console.log(`Done! Old: ${lines.length} lines, New: ${newLines.length} lines`);
console.log(`Replaced lines ${replaceStart + 1}-${replaceEnd} with time simulation code`);
