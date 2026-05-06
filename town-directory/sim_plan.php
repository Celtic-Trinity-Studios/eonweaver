<?php
            $townId = (int) ($input['town_id'] ?? 0);
            $months = max(1, min(24, (int) ($input['months'] ?? 1)));
            $rulesRaw = $input['rules'] ?? '';
            $rules = is_string($rulesRaw) ? trim($rulesRaw) : (is_array($rulesRaw) ? json_encode($rulesRaw) : '');
            $instructions = is_string($input['instructions'] ?? '') ? trim($input['instructions'] ?? '') : '';

            verifyTownOwnership($userId, $townId, $uid);

            $apiKey = resolveApiKey('OPENROUTER_KEY_SIM_PLAN', $userId);

            $town = query('SELECT * FROM towns WHERE id = ?', [$townId], $uid);
            if (!$town)
                throw new Exception('Town not found.');
            $townName = $town[0]['name'];

            $characters = query('SELECT name, race, class, gender, age, role, status FROM characters WHERE town_id = ? ORDER BY name', [$townId], $uid);
            $charCount = count($characters);
            $aliveCount = count(array_filter($characters, fn($c) => ($c['status'] ?? 'Alive') === 'Alive'));

            // Build quick roster summary
            $rosterSummary = [];
            foreach ($characters as $c) {
                if (($c['status'] ?? 'Alive') !== 'Alive')
                    continue;
                $rosterSummary[] = "{$c['name']} ({$c['race']} {$c['class']}, {$c['gender']}, age {$c['age']}, {$c['role']})";
            }
            $rosterText = implode("\n", $rosterSummary);

            // Calendar info
            $campId = $town[0]['campaign_id'] ?? null;
            if ($campId) {
                $calRow = query('SELECT current_month, current_year, era_name, month_names FROM calendar WHERE user_id = ? AND campaign_id = ?', [$userId, $campId], 0);
            } else {
                $calRow = query('SELECT current_month, current_year, era_name, month_names FROM calendar WHERE user_id = ? AND campaign_id IS NULL', [$userId], 0);
            }
            $cal = $calRow[0] ?? ['current_month' => 1, 'current_year' => 1490, 'era_name' => 'DR', 'month_names' => '["Hammer","Alturiak","Ches","Tarsakh","Mirtul","Kythorn","Flamerule","Eleasis","Eleint","Marpenoth","Uktar","Nightal"]'];
            $monthNames = json_decode($cal['month_names'], true) ?? [];
            $startMonth = (int) $cal['current_month'];
            $year = (int) $cal['current_year'];
            $era = $cal['era_name'] ?? 'DR';

            // Build month labels
            $monthLabels = [];
            for ($i = 0; $i < $months; $i++) {
                $idx = ($startMonth - 1 + $i) % count($monthNames);
                $mName = $monthNames[$idx] ?? "Month " . ($i + 1);
                $mName = is_array($mName) ? ($mName['name'] ?? "Month " . ($i + 1)) : $mName;
                $monthLabels[] = $mName;
            }
            $monthLabelStr = implode(', ', $monthLabels);

            $planPrompt = <<<PLAN
You are a D&D world simulation planner. Plan what happens to the settlement of {$townName} over {$months} months.

## Settlement: {$townName}
- Population: {$aliveCount} alive residents
- Calendar months: {$monthLabelStr}, Year {$year} {$era}

## Current Residents:
{$rosterText}

## Campaign Rules:
{$rules}

## DM Instructions:
{$instructions}

## Your Task:
Create a realistic month-by-month roadmap. For a settlement of {$aliveCount} people over {$months} months, you should plan:

- **Arrivals**: 1-3 new people per 6 months (travelers, refugees, merchants settling down). For {$months} months expect roughly {max(1, intval($months * $aliveCount / 60))} new arrivals total.
- **Deaths**: Roughly 1 per 12 months for small settlements (old age, accident, illness, violence). Specify WHO from the roster might die and why.
- **Births**: EXTREMELY rare. A couple MUST have an established romantic relationship for AT LEAST 9 months before a child can be born (accounting for courtship + 9-month gestation for humans). Elves/dwarves take YEARS. For short simulations (1-6 months), births should almost NEVER happen unless a couple was already in a long-term relationship from previous history. One-night stands can produce fatherless children but this is uncommon. At most 1 birth per 12 months for a small settlement.
- **Major Events**: 1-2 per 3 months (festivals, attacks, discoveries, disputes, trade caravans, weather events).
- **Role Changes**: People taking on new jobs, promotions, demotions.

Respond with ONLY a JSON object like this (no markdown, no code fences):
{
  "plan": [
    {"month": 1, "month_name": "{$monthLabels[0]}", "arrivals": 0, "deaths": 0, "births": 0, "events": "Brief description of what happens"},
    {"month": 2, "month_name": "...", "arrivals": 1, "deaths": 0, "births": 0, "events": "A wandering merchant arrives seeking shelter..."}
  ],
  "arrival_details": [{"month": 2, "description": "A grizzled half-orc ex-soldier seeking a quiet retirement"}],
  "death_details": [{"month": 8, "name": "Character Name", "reason": "Dies of old age"}],
  "summary": "Brief 1-2 sentence overview of the planned period"
}
PLAN;

            // Quick AI call with low token limit
            $openRouterUrl = "https://openrouter.ai/api/v1/chat/completions";
            $model = defined("OPENROUTER_MODEL_CHEAP") ? OPENROUTER_MODEL_CHEAP : (defined("OPENROUTER_MODEL") ? OPENROUTER_MODEL : "google/gemini-2.5-flash-lite");
            $payload = json_encode([
                "model" => $model,
                "messages" => [["role" => "user", "content" => $planPrompt]],
                "temperature" => 0.8,
                "max_tokens" => 4096
            ]);

            $ch = curl_init($openRouterUrl);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $payload,
                CURLOPT_HTTPHEADER => array_merge([
                    "Content-Type: application/json",
                    "Authorization: Bearer $apiKey",
                ], openRouterAppHeaders(
                    (defined('APP_PUBLIC_TITLE') ? APP_PUBLIC_TITLE : 'Eon Scribe') . ' Planner'
                )),
                CURLOPT_TIMEOUT => 60
            ]);
            $response = curl_exec($ch);
            curl_close($ch);

            $respData = json_decode($response, true);
            $planText = $respData['choices'][0]['message']['content'] ?? '';
            // Track token usage (hidden)
            if (!empty($respData['usage'])) {
                trackTokenUsage($userId, $respData['usage']);
            }

            // Try to parse as JSON
            $planText = preg_replace('/^`+\w*\s*/m', '', $planText);
            $planText = preg_replace('/`+\s*$/m', '', $planText);
            $planJson = json_decode(trim($planText), true);

            if (!$planJson) {
                // Try extracting JSON from response
                if (preg_match('/\{[\s\S]*\}/m', $planText, $matches)) {
                    $planJson = json_decode($matches[0], true);
                }
            }

            simRespond([
                'ok' => true,
                'plan' => $planJson ?: ['summary' => $planText, 'plan' => []],
                'town_id' => $townId,
                'months' => $months
            ]);

        /* ═══════════════════════════════════════════════════════════
           RUN SIMULATION — Call Gemini API
           ═══════════════════════════════════════════════════════════ */
