<?php
/**
 * Groundwork for features that have a home but no model call yet.
 *
 * Stores companions, battlemaps (grid, marks, fog, a simple room layout),
 * content blocks, generation jobs, share links, portal activity,
 * player-created characters, and which homebrew players may use.
 * Generation jobs keep the prompt. They do not call OpenRouter.
 */

function gwEnsureSchema(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    execute(
        'CREATE TABLE IF NOT EXISTS character_companions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            campaign_id INT NOT NULL,
            character_id INT NOT NULL,
            kind VARCHAR(20) NOT NULL DEFAULT \'familiar\',
            name VARCHAR(160) NOT NULL,
            notes TEXT NULL,
            statblock TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            KEY idx_gw_comp (user_id, character_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        [],
        0
    );
    execute(
        'CREATE TABLE IF NOT EXISTS player_characters (
            id INT AUTO_INCREMENT PRIMARY KEY,
            owner_user_id INT NOT NULL,
            player_user_id INT NOT NULL,
            campaign_id INT NOT NULL,
            character_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_gw_pc (character_id),
            KEY idx_gw_pc_player (player_user_id, campaign_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        [],
        0
    );
    execute(
        'CREATE TABLE IF NOT EXISTS battlemaps (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            campaign_id INT NOT NULL,
            title VARCHAR(160) NOT NULL,
            image_url VARCHAR(500) NOT NULL DEFAULT \'\',
            grid_cols INT NOT NULL DEFAULT 20,
            grid_rows INT NOT NULL DEFAULT 20,
            layout_json TEXT NULL,
            notes TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            KEY idx_gw_bmap (user_id, campaign_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        [],
        0
    );
    execute(
        'CREATE TABLE IF NOT EXISTS battlemap_marks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            campaign_id INT NOT NULL,
            map_id INT NOT NULL,
            kind VARCHAR(20) NOT NULL DEFAULT \'note\',
            x_pct DECIMAL(8,4) NOT NULL DEFAULT 0,
            y_pct DECIMAL(8,4) NOT NULL DEFAULT 0,
            w_pct DECIMAL(8,4) NOT NULL DEFAULT 0,
            h_pct DECIMAL(8,4) NOT NULL DEFAULT 0,
            label VARCHAR(160) NOT NULL DEFAULT \'\',
            body TEXT NULL,
            player_visible TINYINT(1) NOT NULL DEFAULT 0,
            KEY idx_gw_marks (map_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        [],
        0
    );
    execute(
        'CREATE TABLE IF NOT EXISTS content_blocks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            campaign_id INT NOT NULL,
            owner_type VARCHAR(20) NOT NULL,
            owner_id INT NOT NULL,
            sort_order INT NOT NULL DEFAULT 0,
            block_type VARCHAR(20) NOT NULL DEFAULT \'prose\',
            title VARCHAR(160) NOT NULL DEFAULT \'\',
            body TEXT NULL,
            regen_prompt TEXT NULL,
            KEY idx_gw_blocks (user_id, owner_type, owner_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        [],
        0
    );
    execute(
        'CREATE TABLE IF NOT EXISTS generation_jobs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            campaign_id INT NOT NULL,
            kind VARCHAR(40) NOT NULL,
            source_type VARCHAR(20) NOT NULL,
            source_id INT NOT NULL DEFAULT 0,
            instruction TEXT NULL,
            prompt MEDIUMTEXT NULL,
            status VARCHAR(20) NOT NULL DEFAULT \'ready\',
            result_text MEDIUMTEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            KEY idx_gw_jobs (user_id, campaign_id, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        [],
        0
    );
    execute(
        'CREATE TABLE IF NOT EXISTS share_links (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            campaign_id INT NOT NULL,
            target_type VARCHAR(20) NOT NULL,
            target_id INT NOT NULL,
            token_hash CHAR(64) NOT NULL,
            label VARCHAR(160) NOT NULL DEFAULT \'\',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_gw_share (token_hash),
            KEY idx_gw_share_target (user_id, target_type, target_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        [],
        0
    );
    execute(
        'CREATE TABLE IF NOT EXISTS portal_activity (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            campaign_id INT NOT NULL,
            kind VARCHAR(40) NOT NULL,
            summary VARCHAR(240) NOT NULL,
            ref_key VARCHAR(80) NOT NULL DEFAULT \'\',
            read_at DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            KEY idx_gw_portal (user_id, campaign_id, read_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        [],
        0
    );
    execute(
        'CREATE TABLE IF NOT EXISTS homebrew_player_access (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            campaign_id INT NOT NULL,
            content_type VARCHAR(20) NOT NULL,
            content_id INT NOT NULL,
            UNIQUE KEY uniq_gw_hb (user_id, campaign_id, content_type, content_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        [],
        0
    );
    try {
        execute('ALTER TABLE user_files ADD COLUMN folder VARCHAR(100) DEFAULT \'content\'', [], 0);
    } catch (Throwable $e) { /* column exists */ }
    $done = true;
}

function gwClip(string $value, int $max): string
{
    $value = trim($value);
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $max);
    }
    return substr($value, 0, $max);
}

function gwActiveCampaignId(int $uid): int
{
    $row = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
    if (!$row) {
        throw new Exception('No active campaign selected.');
    }
    return (int) $row[0]['id'];
}

function gwLogPortal(int $ownerId, int $campaignId, string $kind, string $summary, string $refKey = ''): void
{
    gwEnsureSchema();
    $summary = gwClip($summary, 240);
    if ($summary === '') {
        return;
    }
    if ($refKey !== '') {
        execute(
            'DELETE FROM portal_activity WHERE user_id = ? AND campaign_id = ? AND ref_key = ? AND read_at IS NULL',
            [$ownerId, $campaignId, gwClip($refKey, 80)],
            0
        );
    }
    insertAndGetId(
        'INSERT INTO portal_activity (user_id, campaign_id, kind, summary, ref_key) VALUES (?, ?, ?, ?, ?)',
        [$ownerId, $campaignId, gwClip($kind, 40), $summary, gwClip($refKey, 80)],
        0
    );
}

function gwPartyBase(int $ownerId, int $campaignId): array
{
    $rows = query(
        'SELECT id, name FROM towns WHERE user_id = ? AND campaign_id = ? AND is_party_base = 1 LIMIT 1',
        [$ownerId, $campaignId],
        0
    );
    if (!$rows) {
        $id = insertAndGetId(
            'INSERT INTO towns (user_id, campaign_id, name, subtitle, is_party_base) VALUES (?, ?, ?, ?, 1)',
            [$ownerId, $campaignId, 'Party', 'Adventuring party'],
            0
        );
        return ['id' => $id, 'name' => 'Party'];
    }
    return ['id' => (int) $rows[0]['id'], 'name' => (string) $rows[0]['name']];
}

function gwCampaignOwner(int $uid, int $requestedCampaignId): array
{
    if ($requestedCampaignId > 0) {
        require_once __DIR__ . '/campaign_seats_lib.php';
        ew_ensure_campaign_seats();
        $role = ew_caller_seat_role($uid, $requestedCampaignId);
        if ($role === null) {
            throw new Exception('You do not have a seat at that table.');
        }
        $camp = ew_campaign_row($requestedCampaignId);
        return ['campaign_id' => $requestedCampaignId, 'owner_id' => (int) $camp['user_id'], 'role' => $role];
    }
    $campId = gwActiveCampaignId($uid);
    return ['campaign_id' => $campId, 'owner_id' => $uid, 'role' => 'dm'];
}

function gwHomebrewRows(int $userId, ?int $campaignId, array $tables): array
{
    require_once __DIR__ . '/user_db.php';
    $out = [];
    foreach ($tables as $type => $table) {
        try {
            if ($campaignId) {
                $rows = userQuery($userId, "SELECT id, name FROM {$table} WHERE campaign_id = ? OR campaign_id IS NULL ORDER BY name LIMIT 80", [$campaignId]);
            } else {
                $rows = userQuery($userId, "SELECT id, name FROM {$table} ORDER BY name LIMIT 80");
            }
        } catch (Throwable $e) {
            continue;
        }
        foreach ($rows as $row) {
            $out[] = ['content_type' => $type, 'content_id' => (int) $row['id'], 'name' => (string) $row['name']];
        }
    }
    return $out;
}

function gwApprovedHomebrewLine(int $userId, ?int $campaignId): string
{
    $rows = gwHomebrewRows($userId, $campaignId, [
        'race' => 'custom_races',
        'class' => 'custom_classes',
        'feat' => 'custom_feats',
        'spell' => 'custom_spells',
        'equipment' => 'custom_equipment',
        'monster' => 'custom_monsters',
    ]);
    if (!$rows) {
        return '';
    }
    $grouped = [];
    foreach ($rows as $row) {
        $grouped[$row['content_type']][] = $row['name'];
    }
    $lines = [];
    foreach ($grouped as $type => $names) {
        $lines[] = strtoupper($type) . 'S: ' . implode(', ', $names);
    }
    return "\n- HOMEBREW ON THIS CAMPAIGN (races, classes, feats, spells, gear, monsters — use when they fit): " . implode(' | ', $lines);
}

function gwRooms(int $count): array
{
    $count = max(3, min(12, $count));
    $rooms = [];
    for ($i = 0; $i < $count; $i++) {
        $rooms[] = [
            'id' => $i + 1,
            'name' => 'Room ' . ($i + 1),
            'x' => ($i % 4) * 5,
            'y' => intdiv($i, 4) * 5,
            'w' => 3 + ($i % 3),
            'h' => 3 + (($i + 1) % 3),
            'door_to' => $i === 0 ? [] : [$i],
        ];
    }
    return $rooms;
}

function gwFormatMap(array $row, array $marks = []): array
{
    $layout = json_decode((string) ($row['layout_json'] ?? ''), true);
    return [
        'id' => (int) $row['id'],
        'title' => (string) $row['title'],
        'image_url' => (string) ($row['image_url'] ?? ''),
        'grid_cols' => (int) $row['grid_cols'],
        'grid_rows' => (int) $row['grid_rows'],
        'layout' => is_array($layout) ? $layout : [],
        'notes' => (string) ($row['notes'] ?? ''),
        'marks' => $marks,
    ];
}

function gwFormatMark(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'kind' => (string) $row['kind'],
        'x_pct' => (float) $row['x_pct'],
        'y_pct' => (float) $row['y_pct'],
        'w_pct' => (float) $row['w_pct'],
        'h_pct' => (float) $row['h_pct'],
        'label' => (string) $row['label'],
        'body' => (string) ($row['body'] ?? ''),
        'player_visible' => !empty($row['player_visible']),
    ];
}

function gwBuildPrompt(string $kind, string $instruction, string $source): string
{
    $kind = gwClip($kind, 40);
    $instruction = gwClip($instruction, 4000);
    $source = gwClip($source, 12000);
    return "Tool: {$kind}\nInstruction: {$instruction}\n\nSource:\n{$source}\n\nWrite the draft in markdown. Do not invent a rules citation you were not given.";
}

function gwHandle(string $action, ?array $input): void
{
    $input = $input ?? [];
    gwEnsureSchema();

    if ($action === 'gw_share_read') {
        $token = trim((string) ($input['token'] ?? $_GET['token'] ?? ''));
        if ($token === '') {
            throw new Exception('Missing share token.');
        }
        $hash = hash('sha256', $token);
        $rows = query('SELECT * FROM share_links WHERE token_hash = ? LIMIT 1', [$hash], 0);
        if (!$rows) {
            throw new Exception('Share link not found.');
        }
        $link = $rows[0];
        $targetType = (string) $link['target_type'];
        $targetId = (int) $link['target_id'];
        $owner = (int) $link['user_id'];
        if ($targetType === 'wiki') {
            $page = query('SELECT title, body FROM wiki_articles WHERE id = ? AND user_id = ? LIMIT 1', [$targetId, $owner], 0);
            if (!$page) {
                throw new Exception('Shared page is gone.');
            }
            respond(['ok' => true, 'title' => $page[0]['title'], 'body' => $page[0]['body'], 'target_type' => 'wiki']);
        }
        if ($targetType === 'scribe') {
            $page = query('SELECT title, body FROM scribe_library WHERE id = ? AND user_id = ? LIMIT 1', [$targetId, $owner], 0);
            if (!$page) {
                throw new Exception('Shared piece is gone.');
            }
            respond(['ok' => true, 'title' => $page[0]['title'], 'body' => $page[0]['body'], 'target_type' => 'scribe']);
        }
        throw new Exception('Unknown share target.');
    }

    $user = requireAuth();
    $uid = (int) $user['id'];

    if ($action === 'gw_table_status') {
        $campId = gwActiveCampaignId($uid);
        $base = gwPartyBase($uid, $campId);
        $unread = query(
            'SELECT COUNT(*) AS c FROM portal_activity WHERE user_id = ? AND campaign_id = ? AND read_at IS NULL',
            [$uid, $campId],
            0
        );
        $items = query(
            'SELECT id, kind, summary, created_at FROM portal_activity WHERE user_id = ? AND campaign_id = ? AND read_at IS NULL ORDER BY id DESC LIMIT 8',
            [$uid, $campId],
            0
        );
        respond([
            'ok' => true,
            'party_location' => $base,
            'unread' => (int) ($unread[0]['c'] ?? 0),
            'activity' => $items ?: [],
        ]);
    }

    if ($action === 'gw_portal_read') {
        $campId = gwActiveCampaignId($uid);
        execute(
            'UPDATE portal_activity SET read_at = NOW() WHERE user_id = ? AND campaign_id = ? AND read_at IS NULL',
            [$uid, $campId],
            0
        );
        respond(['ok' => true]);
    }

    if ($action === 'gw_companions') {
        $characterId = (int) ($input['character_id'] ?? $_GET['character_id'] ?? 0);
        $campId = gwActiveCampaignId($uid);
        $rows = query(
            'SELECT * FROM character_companions WHERE user_id = ? AND campaign_id = ? AND character_id = ? ORDER BY id',
            [$uid, $campId, $characterId],
            0
        );
        $out = [];
        foreach ($rows ?: [] as $row) {
            $out[] = [
                'id' => (int) $row['id'],
                'kind' => $row['kind'],
                'name' => $row['name'],
                'notes' => (string) ($row['notes'] ?? ''),
                'statblock' => (string) ($row['statblock'] ?? ''),
            ];
        }
        respond(['ok' => true, 'companions' => $out]);
    }

    if ($action === 'gw_companion_save') {
        $campId = gwActiveCampaignId($uid);
        $name = gwClip((string) ($input['name'] ?? ''), 160);
        if ($name === '') {
            throw new Exception('Companion needs a name.');
        }
        $kind = in_array($input['kind'] ?? '', ['familiar', 'mount', 'pet'], true) ? $input['kind'] : 'familiar';
        $id = (int) ($input['id'] ?? 0);
        $characterId = (int) ($input['character_id'] ?? 0);
        if ($characterId <= 0) {
            throw new Exception('character_id is required.');
        }
        $notes = gwClip((string) ($input['notes'] ?? ''), 4000);
        $stat = gwClip((string) ($input['statblock'] ?? ''), 8000);
        if ($id > 0) {
            execute(
                'UPDATE character_companions SET kind = ?, name = ?, notes = ?, statblock = ? WHERE id = ? AND user_id = ? AND campaign_id = ?',
                [$kind, $name, $notes, $stat, $id, $uid, $campId],
                0
            );
        } else {
            $id = insertAndGetId(
                'INSERT INTO character_companions (user_id, campaign_id, character_id, kind, name, notes, statblock) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [$uid, $campId, $characterId, $kind, $name, $notes, $stat],
                0
            );
        }
        respond(['ok' => true, 'id' => $id]);
    }

    if ($action === 'gw_companion_delete') {
        $campId = gwActiveCampaignId($uid);
        execute('DELETE FROM character_companions WHERE id = ? AND user_id = ? AND campaign_id = ?', [(int) ($input['id'] ?? 0), $uid, $campId], 0);
        respond(['ok' => true]);
    }

    if ($action === 'gw_battlemaps') {
        $campId = gwActiveCampaignId($uid);
        $maps = query('SELECT * FROM battlemaps WHERE user_id = ? AND campaign_id = ? ORDER BY updated_at DESC', [$uid, $campId], 0);
        $out = [];
        foreach ($maps ?: [] as $map) {
            $marks = query('SELECT * FROM battlemap_marks WHERE map_id = ? AND user_id = ? ORDER BY id', [(int) $map['id'], $uid], 0);
            $formatted = [];
            foreach ($marks ?: [] as $mark) {
                $formatted[] = gwFormatMark($mark);
            }
            $out[] = gwFormatMap($map, $formatted);
        }
        respond(['ok' => true, 'maps' => $out]);
    }

    if ($action === 'gw_battlemap_save') {
        $campId = gwActiveCampaignId($uid);
        $title = gwClip((string) ($input['title'] ?? ''), 160);
        if ($title === '') {
            throw new Exception('Battlemap needs a title.');
        }
        $id = (int) ($input['id'] ?? 0);
        $image = gwClip((string) ($input['image_url'] ?? ''), 500);
        $cols = max(5, min(100, (int) ($input['grid_cols'] ?? 20)));
        $rowsN = max(5, min(100, (int) ($input['grid_rows'] ?? 20)));
        $notes = gwClip((string) ($input['notes'] ?? ''), 4000);
        $layout = json_encode(is_array($input['layout'] ?? null) ? $input['layout'] : [], JSON_UNESCAPED_UNICODE);
        if ($id > 0) {
            execute(
                'UPDATE battlemaps SET title = ?, image_url = ?, grid_cols = ?, grid_rows = ?, layout_json = ?, notes = ? WHERE id = ? AND user_id = ? AND campaign_id = ?',
                [$title, $image, $cols, $rowsN, $layout, $notes, $id, $uid, $campId],
                0
            );
        } else {
            $id = insertAndGetId(
                'INSERT INTO battlemaps (user_id, campaign_id, title, image_url, grid_cols, grid_rows, layout_json, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [$uid, $campId, $title, $image, $cols, $rowsN, $layout, $notes],
                0
            );
        }
        respond(['ok' => true, 'id' => $id]);
    }

    if ($action === 'gw_battlemap_procedural') {
        $campId = gwActiveCampaignId($uid);
        $title = gwClip((string) ($input['title'] ?? 'Generated rooms'), 160);
        $rooms = gwRooms((int) ($input['rooms'] ?? 6));
        $id = insertAndGetId(
            'INSERT INTO battlemaps (user_id, campaign_id, title, grid_cols, grid_rows, layout_json, notes) VALUES (?, ?, ?, 24, 18, ?, ?)',
            [$uid, $campId, $title !== '' ? $title : 'Generated rooms', json_encode($rooms), 'Procedural room sketch. Fog and notes are marks.'],
            0
        );
        respond(['ok' => true, 'id' => $id, 'layout' => $rooms]);
    }

    if ($action === 'gw_battlemap_delete') {
        $campId = gwActiveCampaignId($uid);
        $id = (int) ($input['id'] ?? 0);
        execute('DELETE FROM battlemap_marks WHERE map_id = ? AND user_id = ? AND campaign_id = ?', [$id, $uid, $campId], 0);
        execute('DELETE FROM battlemaps WHERE id = ? AND user_id = ? AND campaign_id = ?', [$id, $uid, $campId], 0);
        respond(['ok' => true]);
    }

    if ($action === 'gw_mark_save') {
        $campId = gwActiveCampaignId($uid);
        $mapId = (int) ($input['map_id'] ?? 0);
        $own = query('SELECT id FROM battlemaps WHERE id = ? AND user_id = ? AND campaign_id = ?', [$mapId, $uid, $campId], 0);
        if (!$own) {
            throw new Exception('Battlemap not found.');
        }
        $kind = in_array($input['kind'] ?? '', ['note', 'fog', 'marker'], true) ? $input['kind'] : 'note';
        $id = insertAndGetId(
            'INSERT INTO battlemap_marks (user_id, campaign_id, map_id, kind, x_pct, y_pct, w_pct, h_pct, label, body, player_visible)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $uid,
                $campId,
                $mapId,
                $kind,
                (float) ($input['x_pct'] ?? 10),
                (float) ($input['y_pct'] ?? 10),
                (float) ($input['w_pct'] ?? ($kind === 'fog' ? 20 : 0)),
                (float) ($input['h_pct'] ?? ($kind === 'fog' ? 15 : 0)),
                gwClip((string) ($input['label'] ?? ''), 160),
                gwClip((string) ($input['body'] ?? ''), 2000),
                !empty($input['player_visible']) ? 1 : 0,
            ],
            0
        );
        respond(['ok' => true, 'id' => $id]);
    }

    if ($action === 'gw_mark_delete') {
        $campId = gwActiveCampaignId($uid);
        execute('DELETE FROM battlemap_marks WHERE id = ? AND user_id = ? AND campaign_id = ?', [(int) ($input['id'] ?? 0), $uid, $campId], 0);
        respond(['ok' => true]);
    }

    if ($action === 'gw_blocks') {
        $campId = gwActiveCampaignId($uid);
        $ownerType = gwClip((string) ($input['owner_type'] ?? $_GET['owner_type'] ?? 'draft'), 20);
        $ownerId = (int) ($input['owner_id'] ?? $_GET['owner_id'] ?? 0);
        $rows = query(
            'SELECT * FROM content_blocks WHERE user_id = ? AND campaign_id = ? AND owner_type = ? AND owner_id = ? ORDER BY sort_order, id',
            [$uid, $campId, $ownerType, $ownerId],
            0
        );
        $out = [];
        foreach ($rows ?: [] as $row) {
            $out[] = [
                'id' => (int) $row['id'],
                'block_type' => $row['block_type'],
                'title' => $row['title'],
                'body' => (string) ($row['body'] ?? ''),
                'regen_prompt' => (string) ($row['regen_prompt'] ?? ''),
                'sort_order' => (int) $row['sort_order'],
            ];
        }
        respond(['ok' => true, 'blocks' => $out]);
    }

    if ($action === 'gw_block_save') {
        $campId = gwActiveCampaignId($uid);
        $types = ['prose', 'callout', 'dc', 'treasure', 'map'];
        $type = in_array($input['block_type'] ?? '', $types, true) ? $input['block_type'] : 'prose';
        $id = (int) ($input['id'] ?? 0);
        $title = gwClip((string) ($input['title'] ?? ''), 160);
        $body = gwClip((string) ($input['body'] ?? ''), 12000);
        $ownerType = gwClip((string) ($input['owner_type'] ?? 'draft'), 20);
        $ownerId = (int) ($input['owner_id'] ?? 0);
        if ($id > 0) {
            execute(
                'UPDATE content_blocks SET block_type = ?, title = ?, body = ? WHERE id = ? AND user_id = ? AND campaign_id = ?',
                [$type, $title, $body, $id, $uid, $campId],
                0
            );
        } else {
            $id = insertAndGetId(
                'INSERT INTO content_blocks (user_id, campaign_id, owner_type, owner_id, sort_order, block_type, title, body) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [$uid, $campId, $ownerType, $ownerId, (int) ($input['sort_order'] ?? 0), $type, $title, $body],
                0
            );
        }
        respond(['ok' => true, 'id' => $id]);
    }

    if ($action === 'gw_block_delete') {
        $campId = gwActiveCampaignId($uid);
        execute('DELETE FROM content_blocks WHERE id = ? AND user_id = ? AND campaign_id = ?', [(int) ($input['id'] ?? 0), $uid, $campId], 0);
        respond(['ok' => true]);
    }

    if ($action === 'gw_queue_generation') {
        $campId = gwActiveCampaignId($uid);
        $kind = gwClip((string) ($input['kind'] ?? 'draft'), 40);
        $sourceType = gwClip((string) ($input['source_type'] ?? 'draft'), 20);
        $sourceId = (int) ($input['source_id'] ?? 0);
        $instruction = gwClip((string) ($input['instruction'] ?? ''), 4000);
        $source = gwClip((string) ($input['source'] ?? ''), 12000);
        if ($source === '' && $sourceType === 'block' && $sourceId > 0) {
            $block = query('SELECT title, body, regen_prompt FROM content_blocks WHERE id = ? AND user_id = ? LIMIT 1', [$sourceId, $uid], 0);
            if ($block) {
                $source = trim($block[0]['title'] . "\n" . $block[0]['body']);
                if ($instruction === '') {
                    $instruction = (string) ($block[0]['regen_prompt'] ?? '');
                }
                execute('UPDATE content_blocks SET regen_prompt = ? WHERE id = ? AND user_id = ?', [$instruction, $sourceId, $uid], 0);
            }
        }
        $prompt = gwBuildPrompt($kind, $instruction, $source);
        $jobId = insertAndGetId(
            'INSERT INTO generation_jobs (user_id, campaign_id, kind, source_type, source_id, instruction, prompt, status) VALUES (?, ?, ?, ?, ?, ?, ?, \'ready\')',
            [$uid, $campId, $kind, $sourceType, $sourceId, $instruction, $prompt],
            0
        );
        respond([
            'ok' => true,
            'job_id' => $jobId,
            'status' => 'ready',
            'prompt' => $prompt,
            'note' => 'Prompt stored. The model is not called from this action.',
        ]);
    }

    if ($action === 'gw_file_recap') {
        $campId = gwActiveCampaignId($uid);
        require_once __DIR__ . '/campaign_hub_lib.php';
        require_once __DIR__ . '/lore_lib.php';
        $session = hubRequireSession($uid, $campId, (int) ($input['id'] ?? 0));
        $body = trim((string) ($session['recap'] ?? ''));
        if ($body === '') {
            throw new Exception('Write a recap before filing it.');
        }
        $title = 'Session: ' . (string) $session['title'];
        $ingest = loreIngestFromAi($uid, $campId, $title, $body, 'session', 'session:' . (int) $session['id'], 'history');
        gwLogPortal($uid, $campId, 'recap', 'Recap filed: ' . (string) $session['title'], 'recap:' . (int) $session['id']);
        respond(['ok' => true, 'ingest' => $ingest]);
    }

    if ($action === 'gw_seed_sessions') {
        $campId = gwActiveCampaignId($uid);
        require_once __DIR__ . '/campaign_hub_lib.php';
        $draftId = (int) ($input['id'] ?? 0);
        $rows = query('SELECT * FROM campaign_workshop_drafts WHERE id = ? AND user_id = ? AND campaign_id = ? LIMIT 1', [$draftId, $uid, $campId], 0);
        if (!$rows) {
            throw new Exception('Draft not found.');
        }
        $body = (string) ($rows[0]['body'] ?? '');
        $parts = preg_split('/\n(?=#{1,3} )/', $body) ?: [];
        $created = [];
        foreach ($parts as $part) {
            $part = trim($part);
            if ($part === '') {
                continue;
            }
            $lines = preg_split('/\n/', $part);
            $title = trim((string) preg_replace('/^#{1,3}\s*/', '', (string) ($lines[0] ?? 'Session')));
            if ($title === '') {
                $title = 'Session';
            }
            $goals = trim(implode("\n", array_slice($lines, 1)));
            $saved = hubSaveSession($uid, $campId, [
                'title' => gwClip($title, 200),
                'status' => 'planned',
                'goals' => gwClip($goals, 4000),
                'prep_notes' => 'Seeded from outline draft #' . $draftId,
            ]);
            $created[] = $saved;
            if (count($created) >= 12) {
                break;
            }
        }
        if (!$created) {
            throw new Exception('Add markdown headings (# Session title) to the outline first.');
        }
        respond(['ok' => true, 'sessions' => $created]);
    }

    if ($action === 'gw_share_create') {
        $campId = gwActiveCampaignId($uid);
        $targetType = ($input['target_type'] ?? '') === 'scribe' ? 'scribe' : 'wiki';
        $targetId = (int) ($input['target_id'] ?? 0);
        if ($targetId <= 0) {
            throw new Exception('Save the page first.');
        }
        $token = bin2hex(random_bytes(16));
        insertAndGetId(
            'INSERT INTO share_links (user_id, campaign_id, target_type, target_id, token_hash, label) VALUES (?, ?, ?, ?, ?, ?)',
            [$uid, $campId, $targetType, $targetId, hash('sha256', $token), gwClip((string) ($input['label'] ?? ''), 160)],
            0
        );
        respond(['ok' => true, 'token' => $token, 'path' => 'share/' . $token]);
    }

    if ($action === 'gw_homebrew_access') {
        $campId = gwActiveCampaignId($uid);
        $allowed = query(
            'SELECT content_type, content_id FROM homebrew_player_access WHERE user_id = ? AND campaign_id = ?',
            [$uid, $campId],
            0
        );
        $flag = [];
        foreach ($allowed ?: [] as $row) {
            $flag[$row['content_type'] . ':' . $row['content_id']] = true;
        }
        $catalog = [];
        foreach (gwHomebrewRows($uid, $campId, ['race' => 'custom_races', 'class' => 'custom_classes', 'feat' => 'custom_feats', 'spell' => 'custom_spells']) as $row) {
            $row['player_ok'] = !empty($flag[$row['content_type'] . ':' . $row['content_id']]);
            $catalog[] = $row;
        }
        respond(['ok' => true, 'items' => $catalog]);
    }

    if ($action === 'gw_homebrew_access_set') {
        $campId = gwActiveCampaignId($uid);
        $type = gwClip((string) ($input['content_type'] ?? ''), 20);
        $contentId = (int) ($input['content_id'] ?? 0);
        if (!in_array($type, ['race', 'class', 'feat', 'spell'], true) || $contentId <= 0) {
            throw new Exception('Unknown homebrew row.');
        }
        if (!empty($input['player_ok'])) {
            execute(
                'INSERT IGNORE INTO homebrew_player_access (user_id, campaign_id, content_type, content_id) VALUES (?, ?, ?, ?)',
                [$uid, $campId, $type, $contentId],
                0
            );
        } else {
            execute(
                'DELETE FROM homebrew_player_access WHERE user_id = ? AND campaign_id = ? AND content_type = ? AND content_id = ?',
                [$uid, $campId, $type, $contentId],
                0
            );
        }
        respond(['ok' => true]);
    }

    if ($action === 'gw_player_options') {
        $ctx = gwCampaignOwner($uid, (int) ($input['campaign_id'] ?? $_GET['campaign_id'] ?? 0));
        $owner = (int) $ctx['owner_id'];
        $campId = (int) $ctx['campaign_id'];
        $items = [];
        if ($ctx['role'] === 'dm') {
            $res = query('SELECT content_type, content_id FROM homebrew_player_access WHERE user_id = ? AND campaign_id = ?', [$owner, $campId], 0);
        } else {
            $res = query('SELECT content_type, content_id FROM homebrew_player_access WHERE user_id = ? AND campaign_id = ?', [$owner, $campId], 0);
        }
        $flag = [];
        foreach ($res ?: [] as $row) {
            $flag[$row['content_type'] . ':' . $row['content_id']] = true;
        }
        foreach (gwHomebrewRows($owner, $campId, ['race' => 'custom_races', 'class' => 'custom_classes']) as $row) {
            $ok = !empty($flag[$row['content_type'] . ':' . $row['content_id']]);
            if ($ctx['role'] !== 'dm' && !$ok) {
                continue;
            }
            $row['player_ok'] = $ok;
            $items[] = $row;
        }
        $mine = query(
            'SELECT pc.character_id, c.name, c.race, c.class, c.level, c.portrait_url
             FROM player_characters pc
             JOIN characters c ON c.id = pc.character_id
             WHERE pc.player_user_id = ? AND pc.campaign_id = ?',
            [$uid, $campId],
            0
        );
        respond(['ok' => true, 'role' => $ctx['role'], 'campaign_id' => $campId, 'options' => $items, 'characters' => $mine ?: []]);
    }

    if ($action === 'gw_create_pc') {
        $ctx = gwCampaignOwner($uid, (int) ($input['campaign_id'] ?? 0));
        $name = gwClip((string) ($input['name'] ?? ''), 120);
        if ($name === '') {
            throw new Exception('Character needs a name.');
        }
        $base = gwPartyBase((int) $ctx['owner_id'], (int) $ctx['campaign_id']);
        $race = gwClip((string) ($input['race'] ?? 'Human'), 80);
        $class = gwClip((string) ($input['class'] ?? 'Fighter'), 80);
        $level = max(1, min(20, (int) ($input['level'] ?? 1)));
        $charId = insertAndGetId(
            'INSERT INTO characters (town_id, name, race, class, level, status, hp, str, dex, con, int_, wis, cha, alignment) VALUES (?, ?, ?, ?, ?, \'Alive\', ?, 10, 10, 10, 10, 10, 10, \'N\')',
            [$base['id'], $name, $race, $class, $level, max(1, $level * 8)],
            0
        );
        insertAndGetId(
            'INSERT INTO player_characters (owner_user_id, player_user_id, campaign_id, character_id) VALUES (?, ?, ?, ?)',
            [(int) $ctx['owner_id'], $uid, (int) $ctx['campaign_id'], $charId],
            0
        );
        try {
            insertAndGetId(
                'INSERT INTO party_members (user_id, character_id, sort_order) VALUES (?, ?, 0)',
                [(int) $ctx['owner_id'], $charId],
                0
            );
        } catch (Throwable $e) { /* already in the party */ }
        $portrait = gwClip((string) ($input['portrait_url'] ?? ''), 500);
        if ($portrait !== '') {
            execute('UPDATE characters SET portrait_url = ? WHERE id = ?', [$portrait, $charId], 0);
        }
        respond(['ok' => true, 'id' => $charId, 'town_id' => $base['id'], 'town_name' => $base['name']]);
    }

    if ($action === 'gw_set_portrait') {
        $charId = (int) ($input['character_id'] ?? 0);
        $url = gwClip((string) ($input['portrait_url'] ?? ''), 500);
        $own = query('SELECT owner_user_id FROM player_characters WHERE character_id = ? AND player_user_id = ? LIMIT 1', [$charId, $uid], 0);
        $dmTown = query(
            'SELECT t.user_id FROM characters c JOIN towns t ON t.id = c.town_id WHERE c.id = ? AND t.user_id = ? LIMIT 1',
            [$charId, $uid],
            0
        );
        if (!$own && !$dmTown) {
            throw new Exception('You cannot change that portrait.');
        }
        execute('UPDATE characters SET portrait_url = ? WHERE id = ?', [$url, $charId], 0);
        respond(['ok' => true]);
    }

    if ($action === 'gw_folders') {
        require_once __DIR__ . '/user_db.php';
        try {
            $names = userQuery($uid, 'SELECT DISTINCT folder AS name FROM user_files WHERE folder IS NOT NULL AND folder <> \'\' ORDER BY folder');
        } catch (Throwable $e) {
            $names = [];
        }
        respond(['ok' => true, 'folders' => array_map(fn($r) => (string) $r['name'], $names ?: [])]);
    }

    if ($action === 'gw_file_folder') {
        require_once __DIR__ . '/user_db.php';
        $fileId = (int) ($input['file_id'] ?? 0);
        $folder = gwClip((string) ($input['folder'] ?? 'content'), 100);
        if ($folder === '') {
            $folder = 'content';
        }
        userExecute($uid, 'UPDATE user_files SET folder = ? WHERE id = ?', [$folder, $fileId]);
        respond(['ok' => true]);
    }

    throw new Exception('Unknown groundwork action.');
}
