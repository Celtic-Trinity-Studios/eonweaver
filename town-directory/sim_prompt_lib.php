<?php
/**
 * Compress simulation LLM prompts: tiered NPC roster + bounded history.
 * Used by sim_run.php, sim_single_town.php, sim_world.php.
 */

require_once __DIR__ . '/toon_lib.php';

/**
 * Optional config.php defines — tighter values = smaller prompts (may reduce coherence).
 * All functions clamp to safe ranges.
 */
if (!function_exists('ew_sim_budget_roster_detail_cap')) {
    function ew_sim_budget_roster_detail_cap(): int
    {
        $v = defined('EW_SIM_ROSTER_DETAIL_CAP') ? (int) EW_SIM_ROSTER_DETAIL_CAP : 10;

        return max(4, min(24, $v));
    }
}

if (!function_exists('ew_sim_budget_chunk_roster_detail_cap')) {
    function ew_sim_budget_chunk_roster_detail_cap(): int
    {
        $v = defined('EW_SIM_CHUNK_ROSTER_DETAIL_CAP') ? (int) EW_SIM_CHUNK_ROSTER_DETAIL_CAP : 10;

        return max(4, min(24, $v));
    }
}

if (!function_exists('ew_sim_budget_rolling_summary_prompt_max')) {
    function ew_sim_budget_rolling_summary_prompt_max(): int
    {
        $v = defined('EW_SIM_ROLLING_SUMMARY_PROMPT_MAX') ? (int) EW_SIM_ROLLING_SUMMARY_PROMPT_MAX : 2400;

        return max(400, min(12000, $v));
    }
}

if (!function_exists('ew_sim_budget_history_recent_when_rolling')) {
    function ew_sim_budget_history_recent_when_rolling(): int
    {
        $v = defined('EW_SIM_HISTORY_RECENT_WHEN_ROLLING') ? (int) EW_SIM_HISTORY_RECENT_WHEN_ROLLING : 1;

        return max(1, min(3, $v));
    }
}

if (!function_exists('ew_sim_budget_history_recent_body_max')) {
    function ew_sim_budget_history_recent_body_max(): int
    {
        $v = defined('EW_SIM_HISTORY_RECENT_BODY_MAX') ? (int) EW_SIM_HISTORY_RECENT_BODY_MAX : 1200;

        return max(200, min(8000, $v));
    }
}

if (!function_exists('ew_sim_budget_history_recent_keep')) {
    function ew_sim_budget_history_recent_keep(): int
    {
        $v = defined('EW_SIM_HISTORY_RECENT_KEEP') ? (int) EW_SIM_HISTORY_RECENT_KEEP : 2;

        return max(1, min(8, $v));
    }
}

if (!function_exists('ew_sim_budget_history_older_digest_max')) {
    function ew_sim_budget_history_older_digest_max(): int
    {
        $v = defined('EW_SIM_HISTORY_OLDER_DIGEST_MAX') ? (int) EW_SIM_HISTORY_OLDER_DIGEST_MAX : 120;

        return max(40, min(800, $v));
    }
}

if (!function_exists('ew_sim_budget_history_max_older_lines')) {
    function ew_sim_budget_history_max_older_lines(): int
    {
        $v = defined('EW_SIM_HISTORY_MAX_OLDER_LINES') ? (int) EW_SIM_HISTORY_MAX_OLDER_LINES : 20;

        return max(4, min(40, $v));
    }
}

if (!function_exists('ew_sim_roster_spouse_cell')) {
    /** Single cell for spouse / partner columns in TOON roster rows. */
    function ew_sim_roster_spouse_cell(array $c): string
    {
        $sp = trim((string) ($c['spouse'] ?? ''));
        if ($sp === '' || strcasecmp($sp, 'None') === 0) {
            return '';
        }
        $label = trim((string) ($c['spouse_label'] ?? ''));
        if ($label === '') {
            $label = 'Spouse';
        }

        return "{$label}: {$sp}";
    }
}

if (!function_exists('ew_sim_roster_relationships_cell')) {
    function ew_sim_roster_relationships_cell(array $c, array $relsByChar): string
    {
        $name = (string) ($c['name'] ?? '');
        if ($name === '' || empty($relsByChar[$name])) {
            return '';
        }

        return implode('; ', $relsByChar[$name]);
    }
}

if (!function_exists('ew_sim_demographics_toon_snapshot')) {
    /**
     * Compact demographics block for arrival-generation prompts.
     *
     * @param array<string,int> $raceCounts
     * @param array<string,int> $classCounts
     * @param array<string,int> $genderCounts
     */
    function ew_sim_demographics_toon_snapshot(int $charCount, array $raceCounts, array $classCounts, array $genderCounts, string $demographics): string
    {
        $parts = [];
        $parts[] = 'population: ' . $charCount;
        $raceRows = [];
        foreach ($raceCounts as $race => $cnt) {
            $raceRows[] = ['race' => (string) $race, 'count' => (int) $cnt];
        }
        if ($raceRows !== []) {
            usort($raceRows, function ($a, $b) {
                return strcmp($a['race'], $b['race']);
            });
            $parts[] = ew_toon_fenced(ew_toon_tabular_inner('race_counts', ['race', 'count'], $raceRows, ','));
        }
        $classRows = [];
        foreach ($classCounts as $cl => $cnt) {
            $classRows[] = ['class' => (string) $cl, 'count' => (int) $cnt];
        }
        if ($classRows !== []) {
            usort($classRows, function ($a, $b) {
                return strcmp($a['class'], $b['class']);
            });
            $parts[] = ew_toon_fenced(ew_toon_tabular_inner('class_counts', ['class', 'count'], $classRows, ','));
        }
        $genderRows = [
            ['code' => 'M', 'count' => (int) ($genderCounts['M'] ?? 0)],
            ['code' => 'F', 'count' => (int) ($genderCounts['F'] ?? 0)],
        ];
        $parts[] = ew_toon_fenced(ew_toon_tabular_inner('gender_counts', ['code', 'count'], $genderRows, ','));
        $dm = trim($demographics);
        if ($dm !== '') {
            $parts[] = "demographic_targets (DM):\n{$dm}";
        }

        return implode("\n\n", $parts);
    }
}

if (!function_exists('ew_sim_plan_roster_toon_alive')) {
    /**
     * Alive-resident table for sim_plan.php (tabular TOON).
     *
     * @param list<array<string,mixed>> $characters
     */
    function ew_sim_plan_roster_toon_alive(array $characters): string
    {
        $rows = [];
        foreach ($characters as $c) {
            if (($c['status'] ?? 'Alive') !== 'Alive') {
                continue;
            }
            $rows[] = [
                'npc_id' => (int) ($c['id'] ?? 0),
                'name' => (string) ($c['name'] ?? ''),
                'race' => (string) ($c['race'] ?? ''),
                'class' => (string) ($c['class'] ?? ''),
                'gender' => (string) ($c['gender'] ?? ''),
                'age' => (int) ($c['age'] ?? 0),
                'role' => (string) ($c['role'] ?? ''),
            ];
        }
        $n = count($rows);
        if ($n === 0) {
            return '(no alive residents)';
        }
        $fields = ['npc_id', 'name', 'race', 'class', 'gender', 'age', 'role'];

        return ew_toon_fenced(ew_toon_tabular_inner('alive_residents', $fields, $rows, "\t"));
    }
}

if (!function_exists('ew_sim_truncate')) {
    function ew_sim_truncate(string $text, int $maxChars): string
    {
        $t = trim($text);
        if ($t === '' || strlen($t) <= $maxChars) {
            return $t;
        }
        if ($maxChars <= 3) {
            return '...';
        }
        return rtrim(substr($t, 0, $maxChars - 3)) . '...';
    }
}

if (!function_exists('ew_sim_class_level')) {
    /** Best-effort class level from "Fighter 5" style class string. */
    function ew_sim_class_level(string $classStr): int
    {
        if (preg_match('/\s+(\d+)\s*$/', trim($classStr), $m)) {
            return max(1, (int) $m[1]);
        }
        return 1;
    }
}

if (!function_exists('ew_sim_priority_score')) {
    /**
     * Higher = more likely to get a full-detail roster line (social hubs, trouble, leaders).
     *
     * @param array<string,mixed> $c character row
     */
    function ew_sim_priority_score(array $c, int $relationshipCount): int
    {
        $score = $relationshipCount * 5;
        $role = strtolower((string) ($c['role'] ?? ''));
        $keywords = ['mayor', 'elder', 'captain', 'commander', 'priest', 'acolyte', 'guild', 'merchant', 'lord', 'lady', 'sheriff', 'guard', 'blacksmith', 'healer', 'innkeep', 'bailiff', 'magistrate', 'council'];
        foreach ($keywords as $kw) {
            if ($role !== '' && strpos($role, $kw) !== false) {
                $score += 22;
                break;
            }
        }
        $status = strtolower((string) ($c['status'] ?? ''));
        if ($status !== '' && $status !== 'alive') {
            $score += 12;
        }
        $age = (int) ($c['age'] ?? 0);
        if ($age >= 0 && $age <= 16) {
            $score += 4;
        }
        $score += ew_sim_class_level((string) ($c['class'] ?? '')) * 2;
        $xp = (int) ($c['xp'] ?? 0);
        if ($xp > 10000) {
            $score += 8;
        } elseif ($xp > 3000) {
            $score += 4;
        }
        return $score;
    }
}

if (!function_exists('ew_sim_roster_id_prefix')) {
    /** Stable NPC handle matching characters.id (send to LLM + parse back). */
    function ew_sim_roster_id_prefix(array $c): string
    {
        $id = (int) ($c['id'] ?? 0);

        return $id > 0 ? "NPC_{$id}: " : '';
    }
}

if (!function_exists('ew_sim_roster_line_main_run')) {
    /** @param array<string,mixed> $c */
    function ew_sim_roster_line_main_run(array $c, array $relsByChar): string
    {
        $pre = ew_sim_roster_id_prefix($c);
        $name = $c['name'] ?? '';
        $entry = $pre . "{$name} — {$c['race']} {$c['class']}, Age {$c['age']}, {$c['gender']}";
        $entry .= ", Status: {$c['status']}";
        if (!empty($c['spouse']) && $c['spouse'] !== 'None') {
            $label = $c['spouse_label'] ?: 'Spouse';
            $entry .= ", {$label}: {$c['spouse']}";
        }
        if (!empty($c['role'])) {
            $entry .= ", Role: {$c['role']}";
        }
        $entry .= ", HP:{$c['hp']}, AC:{$c['ac']}, STR:{$c['str']}, DEX:{$c['dex']}, CON:{$c['con']}, INT:{$c['int_']}, WIS:{$c['wis']}, CHA:{$c['cha']}";
        $entry .= ", Alignment:{$c['alignment']}";
        $entry .= ", XP:{$c['xp']}";
        if (!empty($relsByChar[$name])) {
            $entry .= ', Relationships: [' . implode('; ', $relsByChar[$name]) . ']';
        }
        return $entry;
    }
}

if (!function_exists('ew_sim_roster_line_simple')) {
    /** @param array<string,mixed> $c */
    function ew_sim_roster_line_simple(array $c): string
    {
        $pre = ew_sim_roster_id_prefix($c);
        $e = $pre . "{$c['name']} — {$c['race']} {$c['class']}, Age {$c['age']}, {$c['gender']}";
        $e .= ", Status:{$c['status']}";
        if (!empty($c['spouse']) && $c['spouse'] !== 'None') {
            $e .= ", {$c['spouse_label']}:{$c['spouse']}";
        }
        if (!empty($c['role'])) {
            $e .= ", Role:{$c['role']}";
        }
        $e .= ", XP:{$c['xp']}, HP:{$c['hp']}, AC:{$c['ac']}";
        return $e;
    }
}

if (!function_exists('ew_sim_roster_line_compact')) {
    /** @param array<string,mixed> $c */
    function ew_sim_roster_line_compact(array $c): string
    {
        $pre = ew_sim_roster_id_prefix($c);
        $n = $c['name'] ?? '';
        $race = $c['race'] ?? '';
        $cls = $c['class'] ?? '';
        $role = trim((string) ($c['role'] ?? ''));
        $roleBit = $role !== '' ? " | {$role}" : '';
        return $pre . "{$n} | {$race} {$cls}{$roleBit} | {$c['gender']} age {$c['age']} | {$c['status']} | align {$c['alignment']}";
    }
}

if (!function_exists('ew_sim_tiered_roster_main_run')) {
    /**
     * Full mechanical detail for the highest-priority NPCs; compact tabular rows for the rest.
     * Uses TOON tabular format (tab-separated) for token efficiency.
     *
     * @param list<array<string,mixed>> $characters
     * @param array<string,list<string>> $relsByChar
     */
    function ew_sim_tiered_roster_main_run(array $characters, array $relsByChar, int $detailMax = 10): string
    {
        $n = count($characters);
        if ($n === 0) {
            return '(no residents)';
        }
        $detailMax = max(4, min(24, $detailMax));
        $delim = "\t";
        $detailFields = ['npc_id', 'name', 'race', 'class', 'age', 'gender', 'status', 'spouse', 'role', 'hp', 'ac', 'str', 'dex', 'con', 'int_val', 'wis', 'cha', 'alignment', 'xp', 'relationships'];
        $compactFields = ['npc_id', 'name', 'race', 'class', 'role', 'gender', 'age', 'status', 'alignment'];

        $makeDetailRow = function (array $c) use ($relsByChar): array {
            return [
                'npc_id' => (int) ($c['id'] ?? 0),
                'name' => (string) ($c['name'] ?? ''),
                'race' => (string) ($c['race'] ?? ''),
                'class' => (string) ($c['class'] ?? ''),
                'age' => (int) ($c['age'] ?? 0),
                'gender' => (string) ($c['gender'] ?? ''),
                'status' => (string) ($c['status'] ?? ''),
                'spouse' => ew_sim_roster_spouse_cell($c),
                'role' => (string) ($c['role'] ?? ''),
                'hp' => $c['hp'] ?? '',
                'ac' => $c['ac'] ?? '',
                'str' => $c['str'] ?? '',
                'dex' => $c['dex'] ?? '',
                'con' => $c['con'] ?? '',
                'int_val' => $c['int_'] ?? '',
                'wis' => $c['wis'] ?? '',
                'cha' => $c['cha'] ?? '',
                'alignment' => (string) ($c['alignment'] ?? ''),
                'xp' => $c['xp'] ?? '',
                'relationships' => ew_sim_roster_relationships_cell($c, $relsByChar),
            ];
        };

        $makeCompactRow = function (array $c): array {
            return [
                'npc_id' => (int) ($c['id'] ?? 0),
                'name' => (string) ($c['name'] ?? ''),
                'race' => (string) ($c['race'] ?? ''),
                'class' => (string) ($c['class'] ?? ''),
                'role' => (string) ($c['role'] ?? ''),
                'gender' => (string) ($c['gender'] ?? ''),
                'age' => (int) ($c['age'] ?? 0),
                'status' => (string) ($c['status'] ?? ''),
                'alignment' => (string) ($c['alignment'] ?? ''),
            ];
        };

        if ($n <= $detailMax) {
            $rows = [];
            foreach ($characters as $c) {
                $rows[] = $makeDetailRow($c);
            }

            return "## Current Residents ({$n} — TOON tabular; npc_id = characters.id; int_val = INT score)\n"
                . ew_toon_fenced(ew_toon_tabular_inner('residents', $detailFields, $rows, $delim));
        }

        $scored = [];
        foreach ($characters as $idx => $c) {
            $nm = $c['name'] ?? '';
            $rc = isset($relsByChar[$nm]) ? count($relsByChar[$nm]) : 0;
            $scored[] = ['c' => $c, 'score' => ew_sim_priority_score($c, $rc), 'idx' => $idx];
        }
        usort($scored, function ($a, $b) {
            if ($a['score'] !== $b['score']) {
                return $b['score'] <=> $a['score'];
            }

            return strcmp((string) ($a['c']['name'] ?? ''), (string) ($b['c']['name'] ?? ''));
        });

        $detailSet = [];
        $detailRows = [];
        for ($i = 0; $i < $detailMax && $i < count($scored); $i++) {
            $c = $scored[$i]['c'];
            $detailSet[$c['name'] ?? ''] = true;
            $detailRows[] = $makeDetailRow($c);
        }

        $compactRows = [];
        foreach ($characters as $c) {
            $nm = $c['name'] ?? '';
            if (isset($detailSet[$nm])) {
                continue;
            }
            $compactRows[] = $makeCompactRow($c);
        }
        usort($compactRows, function ($a, $b) {
            return strcmp((string) $a['name'], (string) $b['name']);
        });

        return "## Current Residents ({$n} total — TOON tabular; npc_id = characters.id)\n"
            . "### Priority NPCs ({$detailMax} max — full mechanics + relationships; int_val = INT score)\n"
            . ew_toon_fenced(ew_toon_tabular_inner('residents_priority', $detailFields, $detailRows, $delim))
            . "### Other residents (compact)\n"
            . ew_toon_fenced(ew_toon_tabular_inner('residents_other', $compactFields, $compactRows, $delim));
    }
}

if (!function_exists('ew_sim_tiered_roster_simple')) {
    /**
     * TOON tabular roster for multi-town / chunked sims (no relationship strings).
     *
     * @param list<array<string,mixed>> $characters
     */
    function ew_sim_tiered_roster_simple(array $characters, int $detailMax = 10): string
    {
        $n = count($characters);
        if ($n === 0) {
            return '(no residents)';
        }
        $detailMax = max(4, min(24, $detailMax));
        $delim = "\t";
        $detailFields = ['npc_id', 'name', 'race', 'class', 'age', 'gender', 'status', 'spouse', 'role', 'xp', 'hp', 'ac'];
        $compactFields = ['npc_id', 'name', 'race', 'class', 'role', 'gender', 'age', 'status', 'alignment'];

        $makeDetailRow = function (array $c): array {
            return [
                'npc_id' => (int) ($c['id'] ?? 0),
                'name' => (string) ($c['name'] ?? ''),
                'race' => (string) ($c['race'] ?? ''),
                'class' => (string) ($c['class'] ?? ''),
                'age' => (int) ($c['age'] ?? 0),
                'gender' => (string) ($c['gender'] ?? ''),
                'status' => (string) ($c['status'] ?? ''),
                'spouse' => ew_sim_roster_spouse_cell($c),
                'role' => (string) ($c['role'] ?? ''),
                'xp' => $c['xp'] ?? '',
                'hp' => $c['hp'] ?? '',
                'ac' => $c['ac'] ?? '',
            ];
        };

        $makeCompactRow = function (array $c): array {
            return [
                'npc_id' => (int) ($c['id'] ?? 0),
                'name' => (string) ($c['name'] ?? ''),
                'race' => (string) ($c['race'] ?? ''),
                'class' => (string) ($c['class'] ?? ''),
                'role' => (string) ($c['role'] ?? ''),
                'gender' => (string) ($c['gender'] ?? ''),
                'age' => (int) ($c['age'] ?? 0),
                'status' => (string) ($c['status'] ?? ''),
                'alignment' => (string) ($c['alignment'] ?? ''),
            ];
        };

        if ($n <= $detailMax) {
            $rows = [];
            foreach ($characters as $c) {
                $rows[] = $makeDetailRow($c);
            }

            return "## Current Residents ({$n} — TOON tabular; npc_id = characters.id)\n"
                . ew_toon_fenced(ew_toon_tabular_inner('residents', $detailFields, $rows, $delim));
        }

        $scored = [];
        foreach ($characters as $idx => $c) {
            $scored[] = ['c' => $c, 'score' => ew_sim_priority_score($c, 0), 'idx' => $idx];
        }
        usort($scored, function ($a, $b) {
            if ($a['score'] !== $b['score']) {
                return $b['score'] <=> $a['score'];
            }

            return strcmp((string) ($a['c']['name'] ?? ''), (string) ($b['c']['name'] ?? ''));
        });

        $detailSet = [];
        $detailRows = [];
        for ($i = 0; $i < $detailMax && $i < count($scored); $i++) {
            $c = $scored[$i]['c'];
            $detailSet[$c['name'] ?? ''] = true;
            $detailRows[] = $makeDetailRow($c);
        }

        $compactRows = [];
        foreach ($characters as $c) {
            if (isset($detailSet[$c['name'] ?? ''])) {
                continue;
            }
            $compactRows[] = $makeCompactRow($c);
        }
        usort($compactRows, function ($a, $b) {
            return strcmp((string) $a['name'], (string) $b['name']);
        });

        return "## Current Residents ({$n} total — TOON tabular; npc_id = characters.id)\n"
            . "### Full detail ({$detailMax} key NPCs)\n"
            . ew_toon_fenced(ew_toon_tabular_inner('residents_priority', $detailFields, $detailRows, $delim))
            . "### Other residents (compact)\n"
            . ew_toon_fenced(ew_toon_tabular_inner('residents_other', $compactFields, $compactRows, $delim));
    }
}

if (!function_exists('ew_sim_history_markdown')) {
    /**
     * Rolling digest of older history + last N entries with larger body budget.
     *
     * @param list<array{heading?:string,content?:string}> $historyRows
     */
    function ew_sim_history_markdown(array $historyRows, int $recentKeep = 2, int $recentBodyMax = 1200, int $olderDigestMax = 120, int $maxOlderLines = 20): string
    {
        if (empty($historyRows)) {
            return '';
        }
        $recentKeep = max(1, min(8, $recentKeep));
        $maxOlderLines = max(4, min(40, $maxOlderLines));
        $blocks = [];
        $n = count($historyRows);
        if ($n > $recentKeep) {
            $older = array_slice($historyRows, 0, $n - $recentKeep);
            $omittedOlder = 0;
            if (count($older) > $maxOlderLines) {
                $omittedOlder = count($older) - $maxOlderLines;
                $older = array_slice($older, -$maxOlderLines);
            }
            $digest = ["## Earlier town history (digest — do not contradict)\n"];
            if ($omittedOlder > 0) {
                $digest[] = "- _(+{$omittedOlder} older months in Town History only)_";
            }
            foreach ($older as $h) {
                $head = trim((string) ($h['heading'] ?? 'Untitled'));
                $body = ew_sim_truncate(trim((string) ($h['content'] ?? '')), $olderDigestMax);
                $digest[] = "- **{$head}** — {$body}";
            }
            $blocks[] = implode("\n", $digest);
        }
        $recent = array_slice($historyRows, -$recentKeep);
        $rb = ["## Recent town history (last " . count($recent) . " entr" . (count($recent) === 1 ? 'y' : 'ies') . ")\n"];
        foreach ($recent as $h) {
            $head = trim((string) ($h['heading'] ?? 'Untitled'));
            $content = ew_sim_truncate(trim((string) ($h['content'] ?? '')), $recentBodyMax);
            $rb[] = "### {$head}\n{$content}\n";
        }
        $blocks[] = implode("\n", $rb);
        return "\n\n" . implode("\n\n", $blocks) . "\n";
    }
}

if (!defined('EW_SIM_ROLLING_SUMMARY_KEY')) {
    define('EW_SIM_ROLLING_SUMMARY_KEY', 'sim_rolling_summary');
}

if (!function_exists('ew_sim_rolling_summary_append_entry')) {
    /** One new line for the stored rolling blob (heading + truncated body). */
    function ew_sim_rolling_summary_append_entry(string $existing, string $heading, string $content): string
    {
        $heading = trim($heading);
        $body = trim(preg_replace('/\s+/', ' ', (string) $content));
        $body = ew_sim_truncate($body, 280);
        if ($heading === '' && $body === '') {
            return $existing;
        }
        $line = ($heading !== '' ? "**{$heading}** — " : '') . $body;
        $base = trim($existing);
        return $base === '' ? $line : ($base . "\n" . $line);
    }

    /** Bound stored summary size (keep start + end so founding + recent years survive). */
    function ew_sim_rolling_summary_store_trim(string $s, int $max = 8000): string
    {
        $s = trim($s);
        if ($s === '' || strlen($s) <= $max) {
            return $s;
        }
        $headKeep = 1000;
        $sepLen = 80;
        $tailKeep = $max - $headKeep - $sepLen;
        if ($tailKeep < 800) {
            $tailKeep = 800;
            $headKeep = min($headKeep, $max - $tailKeep - $sepLen);
        }
        $head = rtrim(substr($s, 0, $headKeep));
        $tail = substr($s, -$tailKeep);
        return $head . "\n\n... (middle of rolling summary omitted; full months in Town History) ...\n\n" . $tail;
    }

    /** Prefer the newest tail when squeezing for the LLM prompt. */
    function ew_sim_rolling_summary_for_prompt(string $s, int $max = 2400): string
    {
        $s = trim($s);
        if ($s === '' || strlen($s) <= $max) {
            return $s;
        }
        return "...(earlier rolling summary truncated)\n\n" . substr($s, -($max - 45));
    }

    function ew_sim_rolling_summary_upsert(int $townId, string $value, int $uid): void
    {
        $key = EW_SIM_ROLLING_SUMMARY_KEY;
        $row = query('SELECT id FROM town_meta WHERE town_id = ? AND `key` = ?', [$townId, $key], $uid);
        if (!empty($row)) {
            execute('UPDATE town_meta SET value = ? WHERE town_id = ? AND `key` = ?', [$value, $townId, $key], $uid);
        } else {
            execute('INSERT INTO town_meta (town_id, `key`, value) VALUES (?, ?, ?)', [$townId, $key, $value], $uid);
        }
    }

    function ew_sim_rolling_summary_merge_from_apply(int $townId, string $heading, string $content, int $uid): void
    {
        $row = query('SELECT value FROM town_meta WHERE town_id = ? AND `key` = ?', [$townId, EW_SIM_ROLLING_SUMMARY_KEY], $uid);
        $cur = $row ? trim((string) ($row[0]['value'] ?? '')) : '';
        $cur = ew_sim_rolling_summary_store_trim($cur, 8000);
        $next = ew_sim_rolling_summary_append_entry($cur, $heading, $content);
        $next = ew_sim_rolling_summary_store_trim($next, 8000);
        ew_sim_rolling_summary_upsert($townId, $next, $uid);
    }

    /**
     * @param list<array{heading?:string,content?:string}> $historyRows
     */
    function ew_sim_rolling_summary_seed_from_history(array $historyRows, int $excludeLast = 3, int $maxDigestLines = 16): string
    {
        $n = count($historyRows);
        if ($n <= $excludeLast) {
            return '';
        }
        $older = array_slice($historyRows, 0, $n - $excludeLast);
        $omitted = 0;
        if (count($older) > $maxDigestLines) {
            $omitted = count($older) - $maxDigestLines;
            $older = array_slice($older, 0, $maxDigestLines);
        }
        $lines = [];
        if ($omitted > 0) {
            $lines[] = "[Archive seed: {$omitted} older history entr" . ($omitted === 1 ? 'y' : 'ies') . " not shown below; see Town History for the full record.]";
        } else {
            $lines[] = '[Archive seed from existing Town History — one line per past entry]';
        }
        foreach ($older as $h) {
            $head = trim((string) ($h['heading'] ?? 'Untitled'));
            $body = ew_sim_truncate(trim((string) ($h['content'] ?? '')), 100);
            $lines[] = "- **{$head}** — {$body}";
        }
        return implode("\n", $lines);
    }

    /**
     * If meta is empty but the DB has a long archive, seed once so prompts shrink immediately.
     *
     * @param list<array{heading?:string,content?:string}> $historyRows
     */
    function ew_sim_rolling_summary_maybe_seed(int $townId, array $historyRows, string $currentRolling, int $uid, int $minEntries = 18): string
    {
        $cur = trim($currentRolling);
        if ($cur !== '') {
            return $cur;
        }
        if (count($historyRows) < $minEntries) {
            return '';
        }
        $seed = ew_sim_rolling_summary_seed_from_history($historyRows, 2, 16);
        $seed = ew_sim_rolling_summary_store_trim($seed, 8000);
        if ($seed !== '') {
            ew_sim_rolling_summary_upsert($townId, $seed, $uid);
        }
        return $seed;
    }

    /**
     * Rebuild stored summary from the History editor payload (full replace).
     *
     * @param list<array{heading?:string,content?:string}> $entries
     */
    function ew_sim_rebuild_rolling_summary_from_editor_entries(array $entries): string
    {
        $blob = '';
        foreach ($entries as $e) {
            $blob = ew_sim_rolling_summary_append_entry($blob, (string) ($e['heading'] ?? ''), (string) ($e['content'] ?? ''));
        }
        return ew_sim_rolling_summary_store_trim($blob, 8000);
    }

    /**
     * Prompt block: prefer town_meta rolling summary + only the last few DB history rows when summary exists.
     *
     * @param list<array{heading?:string,content?:string}> $historyRows
     */
    function ew_sim_prompt_history_block(array $historyRows, string $rollingStored): string
    {
        $rolling = trim($rollingStored);
        $recentWhenRolling = ew_sim_budget_history_recent_when_rolling();
        $recentBodyMax = ew_sim_budget_history_recent_body_max();
        if ($rolling === '' && empty($historyRows)) {
            return '';
        }
        $blocks = [];
        if ($rolling !== '') {
            $blocks[] = "## Rolling summary (town_meta)\n"
                . ew_sim_rolling_summary_for_prompt($rolling, ew_sim_budget_rolling_summary_prompt_max())
                . "\nContinuity backbone; do not contradict lightly.";
        }
        if (empty($historyRows)) {
            return $blocks ? "\n\n" . implode("\n\n", $blocks) . "\n" : '';
        }
        if ($rolling !== '') {
            $recentBodyCap = min($recentBodyMax, 720);
            $recent = array_slice($historyRows, -$recentWhenRolling);
            $lines = ['## Latest history (newest last)'];
            foreach ($recent as $h) {
                $head = trim((string) ($h['heading'] ?? 'Untitled'));
                $content = ew_sim_truncate(trim((string) ($h['content'] ?? '')), $recentBodyCap);
                $lines[] = "### {$head}\n{$content}\n";
            }
            $blocks[] = implode("\n", $lines);
            return "\n\n" . implode("\n\n", $blocks) . "\n";
        }

        return ew_sim_history_markdown(
            $historyRows,
            ew_sim_budget_history_recent_keep(),
            $recentBodyMax,
            ew_sim_budget_history_older_digest_max(),
            ew_sim_budget_history_max_older_lines()
        );
    }
}

if (!function_exists('ew_sim_resolve_character_ref_row')) {
    /**
     * Map simulation JSON reference to a resident row. Prefer numeric DB id (characters.id).
     *
     * @param array<string,mixed> $ref supports character_id, npc_id ("NPC_12" or "12"), name (legacy)
     * @return array{id:int,name:string}|null
     */
    function ew_sim_resolve_character_ref_row(int $townId, int $uid, array $ref): ?array
    {
        $cid = null;
        if (isset($ref['character_id']) && $ref['character_id'] !== '' && $ref['character_id'] !== null) {
            $cid = (int) $ref['character_id'];
        }
        if ((!$cid || $cid < 1) && isset($ref['npc_id'])) {
            $raw = trim((string) $ref['npc_id']);
            if (preg_match('/^(?:NPC_)?(\d+)$/i', $raw, $m)) {
                $cid = (int) $m[1];
            }
        }
        if ($cid && $cid > 0) {
            $row = query('SELECT id, name FROM characters WHERE id = ? AND town_id = ? LIMIT 1', [$cid, $townId], $uid);
            if (!empty($row)) {
                return ['id' => (int) $row[0]['id'], 'name' => $row[0]['name']];
            }

            return null;
        }
        $nm = trim((string) ($ref['name'] ?? ''));
        if ($nm !== '') {
            $row = query('SELECT id, name FROM characters WHERE town_id = ? AND name = ? LIMIT 1', [$townId, $nm], $uid);
            if (!empty($row)) {
                return ['id' => (int) $row[0]['id'], 'name' => $row[0]['name']];
            }
        }

        return null;
    }
}

if (!function_exists('ew_sim_resolve_relationship_endpoint')) {
    /**
     * Resolve one end of new_relationships (flexible keys from AI).
     *
     * @return array{id:int,name:string}|null
     */
    function ew_sim_resolve_relationship_endpoint(int $townId, int $uid, array $r, int $which): ?array
    {
        if ($which !== 1 && $which !== 2) {
            return null;
        }
        $ref = [];
        if ($which === 1) {
            if (isset($r['character1_id']) && $r['character1_id'] !== '' && (int) $r['character1_id'] > 0) {
                $ref['character_id'] = $r['character1_id'];
            } elseif (isset($r['char1_id']) && $r['char1_id'] !== '' && (int) $r['char1_id'] > 0) {
                $ref['character_id'] = $r['char1_id'];
            } else {
                $v = trim((string) ($r['character1'] ?? $r['char1'] ?? ''));
                if ($v === '') {
                    return null;
                }
                if (preg_match('/^NPC_(\d+)$/i', $v, $m)) {
                    $ref['character_id'] = (int) $m[1];
                } else {
                    $ref['name'] = $v;
                }
            }
        } else {
            if (isset($r['character2_id']) && $r['character2_id'] !== '' && (int) $r['character2_id'] > 0) {
                $ref['character_id'] = $r['character2_id'];
            } elseif (isset($r['char2_id']) && $r['char2_id'] !== '' && (int) $r['char2_id'] > 0) {
                $ref['character_id'] = $r['char2_id'];
            } else {
                $v = trim((string) ($r['character2'] ?? $r['char2'] ?? ''));
                if ($v === '') {
                    return null;
                }
                if (preg_match('/^NPC_(\d+)$/i', $v, $m)) {
                    $ref['character_id'] = (int) $m[1];
                } else {
                    $ref['name'] = $v;
                }
            }
        }

        return ew_sim_resolve_character_ref_row($townId, $uid, $ref);
    }
}
