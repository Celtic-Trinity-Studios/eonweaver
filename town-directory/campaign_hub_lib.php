<?php
/**
 * Campaign hub framework (CM-01, CM-02, CM-03, CM-04, GEN-22, workshop drafts).
 *
 * Sessions hold the planner and the recap on one record.
 * Timeline beats are DM prep (arcs, deadlines, foreshadowing), separate from simulated town history.
 * Roll tables store weighted rows and roll them.
 * Workshop drafts are the save slot for generators that do not call the model yet
 * (outline, puzzle, deity, feat, spell, familiar, mount, shop, organization).
 */

function hubEnsureSchema(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    execute(
        'CREATE TABLE IF NOT EXISTS campaign_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            campaign_id INT NOT NULL,
            title VARCHAR(200) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT \'planned\',
            real_date DATE NULL,
            in_game_label VARCHAR(160) NOT NULL DEFAULT \'\',
            goals TEXT NULL,
            checklist_json TEXT NULL,
            town_ids_json TEXT NULL,
            encounter_ids_json TEXT NULL,
            prep_notes TEXT NULL,
            recap TEXT NULL,
            xp_notes TEXT NULL,
            loot_notes TEXT NULL,
            npc_outcomes TEXT NULL,
            player_visible TINYINT(1) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            KEY idx_hub_sessions_owner (user_id, campaign_id, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        [],
        0
    );
    execute(
        'CREATE TABLE IF NOT EXISTS campaign_timeline_beats (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            campaign_id INT NOT NULL,
            title VARCHAR(200) NOT NULL,
            when_label VARCHAR(160) NOT NULL DEFAULT \'\',
            kind VARCHAR(20) NOT NULL DEFAULT \'note\',
            body TEXT NULL,
            status VARCHAR(20) NOT NULL DEFAULT \'open\',
            sort_order INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            KEY idx_hub_beats_owner (user_id, campaign_id, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        [],
        0
    );
    execute(
        'CREATE TABLE IF NOT EXISTS campaign_roll_tables (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            campaign_id INT NOT NULL,
            title VARCHAR(200) NOT NULL,
            notes TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            KEY idx_hub_tables_owner (user_id, campaign_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        [],
        0
    );
    execute(
        'CREATE TABLE IF NOT EXISTS campaign_roll_rows (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            campaign_id INT NOT NULL,
            table_id INT NOT NULL,
            label VARCHAR(200) NOT NULL,
            weight INT NOT NULL DEFAULT 1,
            detail TEXT NULL,
            sort_order INT NOT NULL DEFAULT 0,
            KEY idx_hub_rows_table (table_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        [],
        0
    );
    execute(
        'CREATE TABLE IF NOT EXISTS campaign_workshop_drafts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            campaign_id INT NOT NULL,
            kind VARCHAR(40) NOT NULL,
            title VARCHAR(200) NOT NULL,
            prompt TEXT NULL,
            body TEXT NULL,
            status VARCHAR(20) NOT NULL DEFAULT \'draft\',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            KEY idx_hub_drafts_owner (user_id, campaign_id, kind)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        [],
        0
    );
    $done = true;
}

function hubWorkshopCatalog(): array
{
    return [
        ['id' => 'outline', 'label' => 'Campaign outline', 'track' => 'CM-04', 'blurb' => 'Acts, villain ladder, and the sessions you mean to run. Save the outline here. AI seeding is not connected yet.'],
        ['id' => 'puzzle', 'label' => 'Puzzle', 'track' => 'GEN-09', 'blurb' => 'Setup, clues, solution, and skill DCs. Write it by hand until the generator is wired.'],
        ['id' => 'deity', 'label' => 'Deity', 'track' => 'GEN-17', 'blurb' => 'Name, portfolio, and church. A lore page can be written from this draft later.'],
        ['id' => 'feat', 'label' => 'Feat', 'track' => 'GEN-11', 'blurb' => 'Draft a feat. Saving into the homebrew library is a later step.'],
        ['id' => 'spell', 'label' => 'Spell', 'track' => 'GEN-06', 'blurb' => 'Draft a spell. Saving into the homebrew library is a later step.'],
        ['id' => 'familiar', 'label' => 'Familiar', 'track' => 'GEN-18', 'blurb' => 'Companion concept and bond. Sheet hooks come later.'],
        ['id' => 'mount', 'label' => 'Mount', 'track' => 'GEN-19', 'blurb' => 'Mount concept. Sheet hooks come later.'],
        ['id' => 'shop', 'label' => 'Shop', 'track' => 'GEN-08', 'blurb' => 'Mundane or specialty shop tied to a town, kept as a draft until the shop generator is generalized.'],
        ['id' => 'organization', 'label' => 'Organization', 'track' => 'GEN-20', 'blurb' => 'Party, guild, or cult seed. Factions already exist; this draft is the brief that will create them.'],
    ];
}

function hubActiveCampaignId(int $uid): int
{
    $row = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
    if (!$row) {
        throw new Exception('No active campaign selected.');
    }
    return (int) $row[0]['id'];
}

function hubClip(string $value, int $max): string
{
    $value = trim($value);
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $max);
    }
    return substr($value, 0, $max);
}

function hubJsonList($raw): array
{
    if (is_array($raw)) {
        return $raw;
    }
    if (!is_string($raw) || trim($raw) === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function hubIntList($raw): array
{
    $out = [];
    foreach (hubJsonList($raw) as $value) {
        $n = (int) $value;
        if ($n > 0) {
            $out[$n] = $n;
        }
    }
    return array_values($out);
}

function hubChecklist($raw): array
{
    $out = [];
    foreach (hubJsonList($raw) as $item) {
        if (is_string($item)) {
            $text = hubClip($item, 300);
        } elseif (is_array($item)) {
            $text = hubClip((string) ($item['text'] ?? ''), 300);
        } else {
            continue;
        }
        if ($text === '') {
            continue;
        }
        $out[] = [
            'text' => $text,
            'done' => is_array($item) && !empty($item['done']),
        ];
        if (count($out) >= 40) {
            break;
        }
    }
    return $out;
}

function hubDateOrNull($value): ?string
{
    $value = trim((string) $value);
    if ($value === '') {
        return null;
    }
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
        throw new Exception('Real-world date must be YYYY-MM-DD.');
    }
    return $value;
}

function hubOneOf(string $value, array $allowed, string $fallback): string
{
    return in_array($value, $allowed, true) ? $value : $fallback;
}

function hubFormatSession(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'title' => (string) ($row['title'] ?? ''),
        'status' => (string) ($row['status'] ?? 'planned'),
        'real_date' => !empty($row['real_date']) ? substr((string) $row['real_date'], 0, 10) : '',
        'in_game_label' => (string) ($row['in_game_label'] ?? ''),
        'goals' => (string) ($row['goals'] ?? ''),
        'checklist' => hubChecklist($row['checklist_json'] ?? ''),
        'town_ids' => hubIntList($row['town_ids_json'] ?? ''),
        'encounter_ids' => hubIntList($row['encounter_ids_json'] ?? ''),
        'prep_notes' => (string) ($row['prep_notes'] ?? ''),
        'recap' => (string) ($row['recap'] ?? ''),
        'xp_notes' => (string) ($row['xp_notes'] ?? ''),
        'loot_notes' => (string) ($row['loot_notes'] ?? ''),
        'npc_outcomes' => (string) ($row['npc_outcomes'] ?? ''),
        'player_visible' => !empty($row['player_visible']),
        'updated_at' => (string) ($row['updated_at'] ?? ''),
    ];
}

function hubFormatBeat(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'title' => (string) ($row['title'] ?? ''),
        'when_label' => (string) ($row['when_label'] ?? ''),
        'kind' => (string) ($row['kind'] ?? 'note'),
        'body' => (string) ($row['body'] ?? ''),
        'status' => (string) ($row['status'] ?? 'open'),
        'sort_order' => (int) ($row['sort_order'] ?? 0),
    ];
}

function hubFormatRow(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'label' => (string) ($row['label'] ?? ''),
        'weight' => (int) ($row['weight'] ?? 1),
        'detail' => (string) ($row['detail'] ?? ''),
        'sort_order' => (int) ($row['sort_order'] ?? 0),
    ];
}

function hubFormatDraft(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'kind' => (string) ($row['kind'] ?? ''),
        'title' => (string) ($row['title'] ?? ''),
        'prompt' => (string) ($row['prompt'] ?? ''),
        'body' => (string) ($row['body'] ?? ''),
        'status' => (string) ($row['status'] ?? 'draft'),
        'updated_at' => (string) ($row['updated_at'] ?? ''),
    ];
}

function hubLoadSessions(int $uid, int $campId): array
{
    $rows = query(
        'SELECT * FROM campaign_sessions
         WHERE user_id = ? AND campaign_id = ?
         ORDER BY FIELD(status, \'planned\', \'ran\', \'archived\'), (real_date IS NULL), real_date ASC, id DESC',
        [$uid, $campId],
        0
    );
    return array_map('hubFormatSession', $rows ?: []);
}

function hubLoadBeats(int $uid, int $campId): array
{
    $rows = query(
        'SELECT * FROM campaign_timeline_beats
         WHERE user_id = ? AND campaign_id = ?
         ORDER BY sort_order ASC, id ASC',
        [$uid, $campId],
        0
    );
    return array_map('hubFormatBeat', $rows ?: []);
}

function hubLoadTables(int $uid, int $campId): array
{
    $tables = query(
        'SELECT * FROM campaign_roll_tables WHERE user_id = ? AND campaign_id = ? ORDER BY title ASC, id ASC',
        [$uid, $campId],
        0
    );
    $out = [];
    foreach ($tables ?: [] as $table) {
        $rows = query(
            'SELECT * FROM campaign_roll_rows WHERE table_id = ? AND user_id = ? ORDER BY sort_order ASC, id ASC',
            [(int) $table['id'], $uid],
            0
        );
        $out[] = [
            'id' => (int) $table['id'],
            'title' => (string) $table['title'],
            'notes' => (string) ($table['notes'] ?? ''),
            'rows' => array_map('hubFormatRow', $rows ?: []),
        ];
    }
    return $out;
}

function hubLoadDrafts(int $uid, int $campId): array
{
    $rows = query(
        'SELECT * FROM campaign_workshop_drafts
         WHERE user_id = ? AND campaign_id = ?
         ORDER BY updated_at DESC, id DESC',
        [$uid, $campId],
        0
    );
    return array_map('hubFormatDraft', $rows ?: []);
}

function hubRequireSession(int $uid, int $campId, int $id): array
{
    $rows = query(
        'SELECT * FROM campaign_sessions WHERE id = ? AND user_id = ? AND campaign_id = ? LIMIT 1',
        [$id, $uid, $campId],
        0
    );
    if (!$rows) {
        throw new Exception('Session not found.');
    }
    return $rows[0];
}

function hubSaveSession(int $uid, int $campId, array $input): array
{
    $title = hubClip((string) ($input['title'] ?? ''), 200);
    if ($title === '') {
        throw new Exception('Session needs a title.');
    }
    $count = query('SELECT COUNT(*) AS c FROM campaign_sessions WHERE user_id = ? AND campaign_id = ?', [$uid, $campId], 0);
    $id = (int) ($input['id'] ?? 0);
    if ($id <= 0 && (int) ($count[0]['c'] ?? 0) >= 200) {
        throw new Exception('This campaign already has 200 sessions.');
    }
    $status = hubOneOf((string) ($input['status'] ?? 'planned'), ['planned', 'ran', 'archived'], 'planned');
    $fields = [
        $title,
        $status,
        hubDateOrNull($input['real_date'] ?? ''),
        hubClip((string) ($input['in_game_label'] ?? ''), 160),
        hubClip((string) ($input['goals'] ?? ''), 8000),
        json_encode(hubChecklist($input['checklist'] ?? []), JSON_UNESCAPED_UNICODE),
        json_encode(hubIntList($input['town_ids'] ?? []), JSON_UNESCAPED_UNICODE),
        json_encode(hubIntList($input['encounter_ids'] ?? []), JSON_UNESCAPED_UNICODE),
        hubClip((string) ($input['prep_notes'] ?? ''), 8000),
        hubClip((string) ($input['recap'] ?? ''), 20000),
        hubClip((string) ($input['xp_notes'] ?? ''), 4000),
        hubClip((string) ($input['loot_notes'] ?? ''), 4000),
        hubClip((string) ($input['npc_outcomes'] ?? ''), 8000),
        !empty($input['player_visible']) ? 1 : 0,
    ];
    if ($id > 0) {
        hubRequireSession($uid, $campId, $id);
        execute(
            'UPDATE campaign_sessions SET
                title = ?, status = ?, real_date = ?, in_game_label = ?, goals = ?, checklist_json = ?,
                town_ids_json = ?, encounter_ids_json = ?, prep_notes = ?, recap = ?, xp_notes = ?,
                loot_notes = ?, npc_outcomes = ?, player_visible = ?
             WHERE id = ? AND user_id = ? AND campaign_id = ?',
            array_merge($fields, [$id, $uid, $campId]),
            0
        );
    } else {
        $id = insertAndGetId(
            'INSERT INTO campaign_sessions (
                user_id, campaign_id, title, status, real_date, in_game_label, goals, checklist_json,
                town_ids_json, encounter_ids_json, prep_notes, recap, xp_notes, loot_notes, npc_outcomes, player_visible
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            array_merge([$uid, $campId], $fields),
            0
        );
    }
    $saved = hubRequireSession($uid, $campId, $id);
    if (!empty($input['player_visible'])) {
        require_once __DIR__ . '/groundwork_lib.php';
        gwLogPortal($uid, $campId, 'session', 'Session shared: ' . $title, 'session:' . $id);
    }
    return hubFormatSession($saved);
}

function hubSaveBeat(int $uid, int $campId, array $input): array
{
    $title = hubClip((string) ($input['title'] ?? ''), 200);
    if ($title === '') {
        throw new Exception('Timeline beat needs a title.');
    }
    $id = (int) ($input['id'] ?? 0);
    $kind = hubOneOf((string) ($input['kind'] ?? 'note'), ['arc', 'deadline', 'foreshadow', 'note'], 'note');
    $status = hubOneOf((string) ($input['status'] ?? 'open'), ['open', 'done'], 'open');
    $when = hubClip((string) ($input['when_label'] ?? ''), 160);
    $body = hubClip((string) ($input['body'] ?? ''), 8000);
    $sort = (int) ($input['sort_order'] ?? 0);
    if ($id > 0) {
        $own = query(
            'SELECT id FROM campaign_timeline_beats WHERE id = ? AND user_id = ? AND campaign_id = ? LIMIT 1',
            [$id, $uid, $campId],
            0
        );
        if (!$own) {
            throw new Exception('Timeline beat not found.');
        }
        execute(
            'UPDATE campaign_timeline_beats
             SET title = ?, when_label = ?, kind = ?, body = ?, status = ?, sort_order = ?
             WHERE id = ? AND user_id = ? AND campaign_id = ?',
            [$title, $when, $kind, $body, $status, $sort, $id, $uid, $campId],
            0
        );
    } else {
        $count = query('SELECT COUNT(*) AS c FROM campaign_timeline_beats WHERE user_id = ? AND campaign_id = ?', [$uid, $campId], 0);
        if ((int) ($count[0]['c'] ?? 0) >= 200) {
            throw new Exception('This campaign already has 200 timeline beats.');
        }
        $id = insertAndGetId(
            'INSERT INTO campaign_timeline_beats (user_id, campaign_id, title, when_label, kind, body, status, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [$uid, $campId, $title, $when, $kind, $body, $status, $sort],
            0
        );
    }
    $rows = query('SELECT * FROM campaign_timeline_beats WHERE id = ? LIMIT 1', [$id], 0);
    return hubFormatBeat($rows[0]);
}

function hubSaveTable(int $uid, int $campId, array $input): array
{
    $title = hubClip((string) ($input['title'] ?? ''), 200);
    if ($title === '') {
        throw new Exception('Roll table needs a title.');
    }
    $notes = hubClip((string) ($input['notes'] ?? ''), 4000);
    $id = (int) ($input['id'] ?? 0);
    if ($id > 0) {
        $own = query(
            'SELECT id FROM campaign_roll_tables WHERE id = ? AND user_id = ? AND campaign_id = ? LIMIT 1',
            [$id, $uid, $campId],
            0
        );
        if (!$own) {
            throw new Exception('Roll table not found.');
        }
        execute(
            'UPDATE campaign_roll_tables SET title = ?, notes = ? WHERE id = ? AND user_id = ? AND campaign_id = ?',
            [$title, $notes, $id, $uid, $campId],
            0
        );
    } else {
        $count = query('SELECT COUNT(*) AS c FROM campaign_roll_tables WHERE user_id = ? AND campaign_id = ?', [$uid, $campId], 0);
        if ((int) ($count[0]['c'] ?? 0) >= 40) {
            throw new Exception('This campaign already has 40 roll tables.');
        }
        $id = insertAndGetId(
            'INSERT INTO campaign_roll_tables (user_id, campaign_id, title, notes) VALUES (?, ?, ?, ?)',
            [$uid, $campId, $title, $notes],
            0
        );
    }
    execute('DELETE FROM campaign_roll_rows WHERE table_id = ? AND user_id = ? AND campaign_id = ?', [$id, $uid, $campId], 0);
    $rows = is_array($input['rows'] ?? null) ? $input['rows'] : [];
    $order = 0;
    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }
        $label = hubClip((string) ($row['label'] ?? ''), 200);
        if ($label === '') {
            continue;
        }
        $weight = max(0, min(1000, (int) ($row['weight'] ?? 1)));
        $detail = hubClip((string) ($row['detail'] ?? ''), 2000);
        insertAndGetId(
            'INSERT INTO campaign_roll_rows (user_id, campaign_id, table_id, label, weight, detail, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?)',
            [$uid, $campId, $id, $label, $weight, $detail, $order],
            0
        );
        $order++;
        if ($order >= 80) {
            break;
        }
    }
    $tables = hubLoadTables($uid, $campId);
    foreach ($tables as $table) {
        if ((int) $table['id'] === $id) {
            return $table;
        }
    }
    throw new Exception('Roll table could not be reloaded.');
}

function hubRollTable(int $uid, int $campId, int $tableId): array
{
    $own = query(
        'SELECT id, title FROM campaign_roll_tables WHERE id = ? AND user_id = ? AND campaign_id = ? LIMIT 1',
        [$tableId, $uid, $campId],
        0
    );
    if (!$own) {
        throw new Exception('Roll table not found.');
    }
    $rows = query(
        'SELECT * FROM campaign_roll_rows WHERE table_id = ? AND user_id = ? AND weight > 0 ORDER BY sort_order ASC, id ASC',
        [$tableId, $uid],
        0
    );
    if (!$rows) {
        throw new Exception('Add at least one row with a weight above 0.');
    }
    $total = 0;
    foreach ($rows as $row) {
        $total += (int) $row['weight'];
    }
    $pick = random_int(1, $total);
    $cursor = 0;
    $chosen = $rows[count($rows) - 1];
    foreach ($rows as $row) {
        $cursor += (int) $row['weight'];
        if ($pick <= $cursor) {
            $chosen = $row;
            break;
        }
    }
    return [
        'table_id' => $tableId,
        'table_title' => (string) $own[0]['title'],
        'roll' => $pick,
        'total_weight' => $total,
        'row' => hubFormatRow($chosen),
    ];
}

function hubKindIds(): array
{
    return array_column(hubWorkshopCatalog(), 'id');
}

function hubSaveDraft(int $uid, int $campId, array $input): array
{
    $kind = (string) ($input['kind'] ?? '');
    if (!in_array($kind, hubKindIds(), true)) {
        throw new Exception('Unknown workshop kind.');
    }
    $title = hubClip((string) ($input['title'] ?? ''), 200);
    if ($title === '') {
        throw new Exception('Draft needs a title.');
    }
    $id = (int) ($input['id'] ?? 0);
    $status = hubOneOf((string) ($input['status'] ?? 'draft'), ['draft', 'canon'], 'draft');
    $prompt = hubClip((string) ($input['prompt'] ?? ''), 4000);
    $body = hubClip((string) ($input['body'] ?? ''), 20000);
    if ($id > 0) {
        $own = query(
            'SELECT id FROM campaign_workshop_drafts WHERE id = ? AND user_id = ? AND campaign_id = ? LIMIT 1',
            [$id, $uid, $campId],
            0
        );
        if (!$own) {
            throw new Exception('Draft not found.');
        }
        execute(
            'UPDATE campaign_workshop_drafts SET kind = ?, title = ?, prompt = ?, body = ?, status = ? WHERE id = ? AND user_id = ? AND campaign_id = ?',
            [$kind, $title, $prompt, $body, $status, $id, $uid, $campId],
            0
        );
    } else {
        $count = query('SELECT COUNT(*) AS c FROM campaign_workshop_drafts WHERE user_id = ? AND campaign_id = ?', [$uid, $campId], 0);
        if ((int) ($count[0]['c'] ?? 0) >= 200) {
            throw new Exception('This campaign already has 200 workshop drafts.');
        }
        $id = insertAndGetId(
            'INSERT INTO campaign_workshop_drafts (user_id, campaign_id, kind, title, prompt, body, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)',
            [$uid, $campId, $kind, $title, $prompt, $body, $status],
            0
        );
    }
    $rows = query('SELECT * FROM campaign_workshop_drafts WHERE id = ? LIMIT 1', [$id], 0);
    return hubFormatDraft($rows[0]);
}

function hubPlayerBoard(int $uid, int $campaignId): array
{
    require_once __DIR__ . '/campaign_seats_lib.php';
    ew_ensure_campaign_seats();
    $role = ew_caller_seat_role($uid, $campaignId);
    if ($role === null) {
        throw new Exception('You do not have a seat at that table.');
    }
    $camp = ew_campaign_row($campaignId);
    $ownerId = (int) $camp['user_id'];
    hubEnsureSchema();
    $next = query(
        'SELECT * FROM campaign_sessions
         WHERE user_id = ? AND campaign_id = ? AND player_visible = 1 AND status = \'planned\'
         ORDER BY (real_date IS NULL), real_date ASC, id ASC
         LIMIT 1',
        [$ownerId, $campaignId],
        0
    );
    $recap = query(
        'SELECT * FROM campaign_sessions
         WHERE user_id = ? AND campaign_id = ? AND player_visible = 1 AND status = \'ran\'
           AND TRIM(COALESCE(recap, \'\')) <> \'\'
         ORDER BY updated_at DESC, id DESC
         LIMIT 1',
        [$ownerId, $campaignId],
        0
    );
    $publicSession = function (?array $row): ?array {
        if (!$row) {
            return null;
        }
        $full = hubFormatSession($row);
        return [
            'id' => $full['id'],
            'title' => $full['title'],
            'status' => $full['status'],
            'real_date' => $full['real_date'],
            'in_game_label' => $full['in_game_label'],
            'goals' => $full['goals'],
            'recap' => $full['recap'],
        ];
    };
    return [
        'next_session' => $publicSession($next[0] ?? null),
        'latest_recap' => $publicSession($recap[0] ?? null),
    ];
}

function hubHandle(string $action, ?array $input): void
{
    $user = requireAuth();
    hubEnsureSchema();
    $uid = (int) $user['id'];
    $input = $input ?? [];

    if ($action === 'hub_player_board') {
        $campaignId = (int) ($input['campaign_id'] ?? $_GET['campaign_id'] ?? 0);
        if ($campaignId <= 0) {
            throw new Exception('campaign_id is required.');
        }
        respond(['ok' => true] + hubPlayerBoard($uid, $campaignId));
    }

    $campId = hubActiveCampaignId($uid);

    if ($action === 'hub_overview') {
        $sessions = hubLoadSessions($uid, $campId);
        $next = null;
        foreach ($sessions as $session) {
            if ($session['status'] === 'planned') {
                $next = $session;
                break;
            }
        }
        $beats = hubLoadBeats($uid, $campId);
        $open = 0;
        foreach ($beats as $beat) {
            if ($beat['status'] === 'open') {
                $open++;
            }
        }
        respond([
            'ok' => true,
            'next_session' => $next,
            'open_beats' => $open,
            'table_count' => count(hubLoadTables($uid, $campId)),
        ]);
    }

    if ($action === 'hub_bundle') {
        respond([
            'ok' => true,
            'sessions' => hubLoadSessions($uid, $campId),
            'beats' => hubLoadBeats($uid, $campId),
            'tables' => hubLoadTables($uid, $campId),
            'drafts' => hubLoadDrafts($uid, $campId),
            'catalog' => hubWorkshopCatalog(),
        ]);
    }

    if ($action === 'hub_session_save') {
        respond(['ok' => true, 'session' => hubSaveSession($uid, $campId, $input)]);
    }
    if ($action === 'hub_session_delete') {
        $id = (int) ($input['id'] ?? 0);
        hubRequireSession($uid, $campId, $id);
        execute('DELETE FROM campaign_sessions WHERE id = ? AND user_id = ? AND campaign_id = ?', [$id, $uid, $campId], 0);
        respond(['ok' => true]);
    }
    if ($action === 'hub_beat_save') {
        respond(['ok' => true, 'beat' => hubSaveBeat($uid, $campId, $input)]);
    }
    if ($action === 'hub_beat_delete') {
        $id = (int) ($input['id'] ?? 0);
        execute('DELETE FROM campaign_timeline_beats WHERE id = ? AND user_id = ? AND campaign_id = ?', [$id, $uid, $campId], 0);
        respond(['ok' => true]);
    }
    if ($action === 'hub_table_save') {
        respond(['ok' => true, 'table' => hubSaveTable($uid, $campId, $input)]);
    }
    if ($action === 'hub_table_delete') {
        $id = (int) ($input['id'] ?? 0);
        execute('DELETE FROM campaign_roll_rows WHERE table_id = ? AND user_id = ? AND campaign_id = ?', [$id, $uid, $campId], 0);
        execute('DELETE FROM campaign_roll_tables WHERE id = ? AND user_id = ? AND campaign_id = ?', [$id, $uid, $campId], 0);
        respond(['ok' => true]);
    }
    if ($action === 'hub_table_roll') {
        $id = (int) ($input['id'] ?? $_GET['id'] ?? 0);
        respond(['ok' => true, 'result' => hubRollTable($uid, $campId, $id)]);
    }
    if ($action === 'hub_draft_save') {
        respond(['ok' => true, 'draft' => hubSaveDraft($uid, $campId, $input)]);
    }
    if ($action === 'hub_draft_delete') {
        $id = (int) ($input['id'] ?? 0);
        execute('DELETE FROM campaign_workshop_drafts WHERE id = ? AND user_id = ? AND campaign_id = ?', [$id, $uid, $campId], 0);
        respond(['ok' => true]);
    }

    throw new Exception('Unknown campaign hub action.');
}
