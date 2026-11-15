<?php
/**
 * Encounter table: a grid of live character tokens for one encounter.
 * HP and status save back to the character sheet and the encounter tracker.
 * Foundry export includes only tokens placed on the grid.
 */

function encounterTableEnsureSchema(): void
{
    execute(
        'CREATE TABLE IF NOT EXISTS encounter_tables (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            encounter_id INT NOT NULL,
            image_url VARCHAR(500) DEFAULT NULL,
            grid_cols INT NOT NULL DEFAULT 20,
            grid_rows INT NOT NULL DEFAULT 14,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_encounter_table (user_id, encounter_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        [],
        0
    );
    execute(
        'CREATE TABLE IF NOT EXISTS encounter_table_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            table_id INT NOT NULL,
            character_id INT NOT NULL,
            grid_x INT NOT NULL DEFAULT 0,
            grid_y INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_table_character (table_id, character_id),
            KEY idx_etable_tokens_owner (user_id, table_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        [],
        0
    );
}

function encounterTableRequireEncounter(int $uid, int $encounterId): array
{
    $rows = query(
        'SELECT id, name, description, status, current_round, current_turn FROM encounters WHERE id = ? AND user_id = ? LIMIT 1',
        [$encounterId, $uid],
        0
    );
    if (!$rows) {
        throw new Exception('Encounter not found.');
    }
    return $rows[0];
}

function encounterTableEnsureRow(int $uid, int $encounterId): array
{
    $rows = query(
        'SELECT * FROM encounter_tables WHERE user_id = ? AND encounter_id = ? LIMIT 1',
        [$uid, $encounterId],
        0
    );
    if ($rows) {
        return $rows[0];
    }
    insertAndGetId(
        'INSERT INTO encounter_tables (user_id, encounter_id) VALUES (?, ?)',
        [$uid, $encounterId],
        0
    );
    $rows = query(
        'SELECT * FROM encounter_tables WHERE user_id = ? AND encounter_id = ? LIMIT 1',
        [$uid, $encounterId],
        0
    );
    if (!$rows) {
        throw new Exception('Could not open the encounter table.');
    }
    return $rows[0];
}

function encounterTableUnlinkImages(int $uid, int $encounterId): void
{
    $dir = __DIR__ . '/uploads/encounter_tables/' . $uid;
    if (!is_dir($dir)) {
        return;
    }
    foreach (glob($dir . '/enc_' . $encounterId . '.*') ?: [] as $path) {
        if (is_file($path)) {
            @unlink($path);
        }
    }
}

function encounterTableImageUrlOk(int $uid, int $encounterId, string $url): bool
{
    $path = strtok($url, '?');
    $path = str_replace('\\', '/', (string) $path);
    $path = ltrim($path, '/');
    return (bool) preg_match(
        '#^uploads/encounter_tables/' . $uid . '/enc_' . $encounterId . '\.(jpg|png|webp|gif)$#',
        $path
    );
}

function encounterTableSetImageUrl(int $uid, int $encounterId, ?string $url): void
{
    $table = encounterTableEnsureRow($uid, $encounterId);
    execute(
        'UPDATE encounter_tables SET image_url = ? WHERE id = ? AND user_id = ?',
        [$url, (int) $table['id'], $uid],
        0
    );
}

function encounterTableParticipants(int $uid, int $encounterId, int $tableId): array
{
    $rows = query(
        'SELECT c.id AS character_id, c.town_id, c.name, c.race, c.class, c.level, c.hp, c.ac,
                c.alignment, c.status, c.str, c.dex, c.con, c.int_ AS intel, c.wis, c.cha,
                c.portrait_url, c.role,
                ep.id AS participant_id, ep.side, ep.initiative, ep.initiative_mod,
                ep.current_hp, ep.max_hp, ep.temp_hp,
                tok.id AS token_id, tok.grid_x, tok.grid_y
         FROM encounter_participants ep
         JOIN characters c ON c.id = ep.character_id
         JOIN towns tw ON tw.id = c.town_id AND tw.user_id = ?
         LEFT JOIN encounter_table_tokens tok ON tok.table_id = ? AND tok.character_id = c.id
         WHERE ep.encounter_id = ?
         ORDER BY ep.initiative DESC, c.name',
        [$uid, $tableId, $encounterId],
        0
    );
    $out = [];
    foreach ($rows as $row) {
        $sheetHp = (int) ($row['hp'] ?? 0);
        $trackerHp = (int) ($row['current_hp'] ?? $sheetHp);
        $maxHp = (int) ($row['max_hp'] ?? 0);
        if ($maxHp < $sheetHp) {
            $maxHp = $sheetHp;
        }
        if ($maxHp < 1) {
            $maxHp = max(1, $sheetHp);
        }
        $out[] = [
            'character_id' => (int) $row['character_id'],
            'town_id' => (int) $row['town_id'],
            'participant_id' => (int) $row['participant_id'],
            'name' => (string) ($row['name'] ?? 'Unnamed'),
            'race' => (string) ($row['race'] ?? ''),
            'class' => (string) ($row['class'] ?? ''),
            'level' => (int) ($row['level'] ?? 0),
            'hp' => $sheetHp,
            'tracker_hp' => $trackerHp,
            'max_hp' => $maxHp,
            'temp_hp' => (int) ($row['temp_hp'] ?? 0),
            'ac' => (int) ($row['ac'] ?? 0),
            'alignment' => (string) ($row['alignment'] ?? ''),
            'status' => (string) ($row['status'] ?? 'Alive'),
            'str' => (int) ($row['str'] ?? 10),
            'dex' => (int) ($row['dex'] ?? 10),
            'con' => (int) ($row['con'] ?? 10),
            'int' => (int) ($row['intel'] ?? 10),
            'wis' => (int) ($row['wis'] ?? 10),
            'cha' => (int) ($row['cha'] ?? 10),
            'portrait_url' => (string) ($row['portrait_url'] ?? ''),
            'role' => (string) ($row['role'] ?? ''),
            'side' => (string) ($row['side'] ?? 'enemy'),
            'initiative' => (int) ($row['initiative'] ?? 0),
            'initiative_mod' => (int) ($row['initiative_mod'] ?? 0),
            'token_id' => $row['token_id'] !== null ? (int) $row['token_id'] : null,
            'grid_x' => $row['grid_x'] !== null ? (int) $row['grid_x'] : null,
            'grid_y' => $row['grid_y'] !== null ? (int) $row['grid_y'] : null,
            'placed' => $row['token_id'] !== null,
        ];
    }
    return $out;
}

function encounterTableRequireParticipant(int $uid, int $encounterId, int $characterId): array
{
    $rows = query(
        'SELECT ep.id, c.town_id, c.hp
         FROM encounter_participants ep
         JOIN encounters e ON e.id = ep.encounter_id AND e.user_id = ?
         JOIN characters c ON c.id = ep.character_id
         JOIN towns tw ON tw.id = c.town_id AND tw.user_id = ?
         WHERE ep.encounter_id = ? AND ep.character_id = ?
         LIMIT 1',
        [$uid, $uid, $encounterId, $characterId],
        0
    );
    if (!$rows) {
        throw new Exception('That character is not in this encounter.');
    }
    return $rows[0];
}

function encounterTableFoundryActor(array $p, int $encounterId): array
{
    $ability = static function (int $score): array {
        return ['value' => $score];
    };
    $side = (string) ($p['side'] ?? 'enemy');
    $disposition = $side === 'party' ? 1 : ($side === 'enemy' ? -1 : 0);
    return [
        'name' => $p['name'],
        'type' => 'npc',
        'system' => [
            'details' => [
                'level' => (int) $p['level'],
                'alignment' => $p['alignment'],
                'race' => $p['race'],
                'biography' => ['value' => trim($p['race'] . ' ' . $p['class'])],
                'cr' => 0,
            ],
            'attributes' => [
                'ac' => ['value' => (int) $p['ac']],
                'hp' => ['value' => (int) $p['hp'], 'max' => (int) $p['max_hp']],
            ],
            'abilities' => [
                'str' => $ability((int) $p['str']),
                'dex' => $ability((int) $p['dex']),
                'con' => $ability((int) $p['con']),
                'int' => $ability((int) $p['int']),
                'wis' => $ability((int) $p['wis']),
                'cha' => $ability((int) $p['cha']),
            ],
        ],
        'prototypeToken' => [
            'name' => $p['name'],
            'width' => 1,
            'height' => 1,
            'disposition' => $disposition,
        ],
        'flags' => [
            'eonweaver' => [
                'character_id' => (int) $p['character_id'],
                'town_id' => (int) $p['town_id'],
                'encounter_id' => $encounterId,
            ],
        ],
    ];
}

function encounterTableFoundryBundle(array $encounter, array $table, array $participants): array
{
    $cell = 100;
    $cols = max(4, (int) $table['grid_cols']);
    $rows = max(4, (int) $table['grid_rows']);
    $actors = [];
    $tokens = [];
    foreach ($participants as $p) {
        if (empty($p['placed'])) {
            continue;
        }
        $actors[] = encounterTableFoundryActor($p, (int) $encounter['id']);
        $side = (string) ($p['side'] ?? 'enemy');
        $tokens[] = [
            'name' => $p['name'],
            'x' => (int) $p['grid_x'] * $cell,
            'y' => (int) $p['grid_y'] * $cell,
            'width' => 1,
            'height' => 1,
            'disposition' => $side === 'party' ? 1 : ($side === 'enemy' ? -1 : 0),
            'actorLink' => false,
            'flags' => [
                'eonweaver' => [
                    'character_id' => (int) $p['character_id'],
                    'town_id' => (int) $p['town_id'],
                ],
            ],
        ];
    }
    return [
        'format' => 'foundry-vtt.eonweaver.scene.v1',
        'generated_at' => gmdate('c'),
        'note' => 'Actors and scene tokens for the people on this encounter grid. Each actor carries flags.eonweaver.character_id so a later export refers to the same character. Foundry does not import this file by itself.',
        'encounter' => [
            'id' => (int) $encounter['id'],
            'name' => (string) $encounter['name'],
        ],
        'actors' => $actors,
        'scene' => [
            'name' => (string) $encounter['name'],
            'width' => $cols * $cell,
            'height' => $rows * $cell,
            'grid' => ['size' => $cell, 'type' => 1, 'distance' => 5, 'units' => 'ft'],
            'tokens' => $tokens,
        ],
    ];
}

function encounterTableHandle(string $action, $input): void
{
    if (!is_array($input)) {
        $input = [];
    }
    $user = requireAuth();
    $uid = (int) $user['id'];
    encounterTableEnsureSchema();

    $encounterId = (int) ($input['encounter_id'] ?? $_GET['encounter_id'] ?? 0);
    if ($encounterId <= 0) {
        throw new Exception('Encounter is required.');
    }
    $encounter = encounterTableRequireEncounter($uid, $encounterId);
    $table = encounterTableEnsureRow($uid, $encounterId);
    $tableId = (int) $table['id'];

    if ($action === 'get_encounter_table') {
        respond([
            'ok' => true,
            'encounter' => [
                'id' => (int) $encounter['id'],
                'name' => (string) $encounter['name'],
                'status' => (string) ($encounter['status'] ?? 'setup'),
            ],
            'table' => [
                'id' => $tableId,
                'image_url' => (string) ($table['image_url'] ?? ''),
                'grid_cols' => (int) $table['grid_cols'],
                'grid_rows' => (int) $table['grid_rows'],
            ],
            'participants' => encounterTableParticipants($uid, $encounterId, $tableId),
        ]);
    }

    if ($action === 'save_encounter_table_token') {
        $characterId = (int) ($input['character_id'] ?? 0);
        encounterTableRequireParticipant($uid, $encounterId, $characterId);
        $cols = max(1, (int) $table['grid_cols']);
        $rows = max(1, (int) $table['grid_rows']);
        $x = max(0, min($cols - 1, (int) ($input['grid_x'] ?? 0)));
        $y = max(0, min($rows - 1, (int) ($input['grid_y'] ?? 0)));
        $existing = query(
            'SELECT id FROM encounter_table_tokens WHERE table_id = ? AND character_id = ? LIMIT 1',
            [$tableId, $characterId],
            0
        );
        if ($existing) {
            execute(
                'UPDATE encounter_table_tokens SET grid_x = ?, grid_y = ? WHERE id = ? AND user_id = ?',
                [$x, $y, (int) $existing[0]['id'], $uid],
                0
            );
        } else {
            insertAndGetId(
                'INSERT INTO encounter_table_tokens (user_id, table_id, character_id, grid_x, grid_y) VALUES (?, ?, ?, ?, ?)',
                [$uid, $tableId, $characterId, $x, $y],
                0
            );
        }
        respond(['ok' => true, 'character_id' => $characterId, 'grid_x' => $x, 'grid_y' => $y]);
    }

    if ($action === 'delete_encounter_table_token') {
        $characterId = (int) ($input['character_id'] ?? 0);
        execute(
            'DELETE FROM encounter_table_tokens WHERE table_id = ? AND character_id = ? AND user_id = ?',
            [$tableId, $characterId, $uid],
            0
        );
        respond(['ok' => true]);
    }

    if ($action === 'save_encounter_table_hp') {
        $characterId = (int) ($input['character_id'] ?? 0);
        $part = encounterTableRequireParticipant($uid, $encounterId, $characterId);
        $hp = max(0, min(9999, (int) ($input['hp'] ?? 0)));
        $townId = (int) $part['town_id'];
        execute(
            'UPDATE characters SET hp = ? WHERE id = ? AND town_id = ?',
            [$hp, $characterId, $townId],
            0
        );
        $status = trim((string) ($input['status'] ?? ''));
        $allowed = ['Alive', 'Deceased', 'Absent', 'Missing', 'Unknown'];
        if (in_array($status, $allowed, true)) {
            execute(
                'UPDATE characters SET status = ? WHERE id = ? AND town_id = ?',
                [$status, $characterId, $townId],
                0
            );
        }
        execute(
            'UPDATE encounter_participants
             SET current_hp = ?, max_hp = GREATEST(max_hp, ?)
             WHERE id = ? AND encounter_id = ?',
            [$hp, $hp, (int) $part['id'], $encounterId],
            0
        );
        respond(['ok' => true, 'hp' => $hp, 'status' => $status]);
    }

    if ($action === 'clear_encounter_table_image') {
        encounterTableUnlinkImages($uid, $encounterId);
        encounterTableSetImageUrl($uid, $encounterId, null);
        respond(['ok' => true]);
    }

    if ($action === 'export_encounter_table_foundry') {
        $participants = encounterTableParticipants($uid, $encounterId, $tableId);
        $bundle = encounterTableFoundryBundle($encounter, $table, $participants);
        $bundle['ok'] = true;
        respond($bundle);
    }

    throw new Exception('Unknown encounter table action.');
}
