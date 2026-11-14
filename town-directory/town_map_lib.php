<?php
/**
 * Per-town map image and resident pins (percent of the image).
 */

const TOWN_MAP_PROP_LIMIT = 400;

function townMapEnsureSchema(): void
{
    execute(
        'CREATE TABLE IF NOT EXISTS town_maps (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            town_id INT NOT NULL,
            image_url VARCHAR(500) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_town_map (user_id, town_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        [],
        0
    );
    execute(
        'CREATE TABLE IF NOT EXISTS town_map_pins (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            town_id INT NOT NULL,
            character_id INT NOT NULL,
            x_pct DECIMAL(8,5) NOT NULL,
            y_pct DECIMAL(8,5) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_town_map_pin (town_id, character_id),
            KEY idx_town_map_pins_owner (user_id, town_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        [],
        0
    );
    execute(
        'CREATE TABLE IF NOT EXISTS town_map_props (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            town_id INT NOT NULL,
            kind VARCHAR(16) NOT NULL,
            x_pct DECIMAL(8,5) NOT NULL,
            y_pct DECIMAL(8,5) NOT NULL,
            facing CHAR(1) NOT NULL DEFAULT \'h\',
            state VARCHAR(16) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            KEY idx_town_map_props_owner (user_id, town_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        [],
        0
    );
}

function townMapRequireTown(int $uid, int $townId): array
{
    $rows = query(
        'SELECT id, name FROM towns WHERE id = ? AND user_id = ? LIMIT 1',
        [$townId, $uid],
        0
    );
    if (!$rows) {
        throw new Exception('Town not found.');
    }
    return $rows[0];
}

function townMapEnsureRow(int $uid, int $townId): array
{
    $rows = query(
        'SELECT * FROM town_maps WHERE user_id = ? AND town_id = ? LIMIT 1',
        [$uid, $townId],
        0
    );
    if ($rows) {
        return $rows[0];
    }
    insertAndGetId(
        'INSERT INTO town_maps (user_id, town_id) VALUES (?, ?)',
        [$uid, $townId],
        0
    );
    $rows = query(
        'SELECT * FROM town_maps WHERE user_id = ? AND town_id = ? LIMIT 1',
        [$uid, $townId],
        0
    );
    if (!$rows) {
        throw new Exception('Could not open the town map.');
    }
    return $rows[0];
}

function townMapUnlinkImages(int $uid, int $townId): void
{
    $dir = __DIR__ . '/uploads/town_maps/' . $uid;
    if (!is_dir($dir)) {
        return;
    }
    foreach (glob($dir . '/town_' . $townId . '.*') ?: [] as $path) {
        if (is_file($path)) {
            @unlink($path);
        }
    }
}

function townMapImageUrlOk(int $uid, int $townId, string $url): bool
{
    $path = strtok($url, '?');
    $path = str_replace('\\', '/', (string) $path);
    $path = ltrim($path, '/');
    return (bool) preg_match(
        '#^uploads/town_maps/' . $uid . '/town_' . $townId . '\.(jpg|png|webp|gif)$#',
        $path
    );
}

function townMapSetImageUrl(int $uid, int $townId, ?string $url): void
{
    $row = townMapEnsureRow($uid, $townId);
    execute(
        'UPDATE town_maps SET image_url = ? WHERE id = ? AND user_id = ?',
        [$url, (int) $row['id'], $uid],
        0
    );
}

function townMapPins(int $uid, int $townId): array
{
    $rows = query(
        'SELECT p.character_id, p.x_pct, p.y_pct, c.name, c.status
         FROM town_map_pins p
         JOIN characters c ON c.id = p.character_id AND c.town_id = p.town_id
         WHERE p.user_id = ? AND p.town_id = ?
         ORDER BY c.name',
        [$uid, $townId],
        0
    );
    $out = [];
    foreach ($rows as $row) {
        $out[] = [
            'character_id' => (int) $row['character_id'],
            'x_pct' => (float) $row['x_pct'],
            'y_pct' => (float) $row['y_pct'],
            'name' => (string) ($row['name'] ?? ''),
            'status' => (string) ($row['status'] ?? ''),
        ];
    }
    return $out;
}

function townMapFormatProp(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'kind' => (string) $row['kind'],
        'x_pct' => (float) $row['x_pct'],
        'y_pct' => (float) $row['y_pct'],
        'facing' => ($row['facing'] ?? '') === 'v' ? 'v' : 'h',
        'state' => (string) ($row['state'] ?? ''),
    ];
}

function townMapProps(int $uid, int $townId): array
{
    $rows = query(
        'SELECT id, kind, x_pct, y_pct, facing, state
         FROM town_map_props
         WHERE user_id = ? AND town_id = ?
         ORDER BY id',
        [$uid, $townId],
        0
    );
    $out = [];
    foreach ($rows as $row) {
        $out[] = townMapFormatProp($row);
    }
    return $out;
}

function townMapPropState(string $kind, string $state): string
{
    $allowed = $kind === 'door'
        ? ['closed', 'open', 'locked']
        : ['armed', 'sprung', 'disarmed'];
    if (!in_array($state, $allowed, true)) {
        return $allowed[0];
    }
    return $state;
}

function townMapClampPct($value): float
{
    $n = (float) $value;
    if ($n < 0) {
        return 0.0;
    }
    if ($n > 100) {
        return 100.0;
    }
    return $n;
}

function townMapHandle(string $action, $input): void
{
    if (!is_array($input)) {
        $input = [];
    }
    $user = requireAuth();
    $uid = (int) $user['id'];
    townMapEnsureSchema();

    $townId = (int) ($input['town_id'] ?? $_GET['town_id'] ?? 0);
    if ($townId <= 0) {
        throw new Exception('Town is required.');
    }
    townMapRequireTown($uid, $townId);
    $map = townMapEnsureRow($uid, $townId);

    if ($action === 'get_town_map') {
        respond([
            'ok' => true,
            'town_id' => $townId,
            'image_url' => (string) ($map['image_url'] ?? ''),
            'pins' => townMapPins($uid, $townId),
            'props' => townMapProps($uid, $townId),
        ]);
    }

    if ($action === 'save_town_map_pin') {
        $characterId = (int) ($input['character_id'] ?? 0);
        if ($characterId <= 0) {
            throw new Exception('Choose a resident to place.');
        }
        $owned = query(
            'SELECT id FROM characters WHERE id = ? AND town_id = ? LIMIT 1',
            [$characterId, $townId],
            0
        );
        if (!$owned) {
            throw new Exception('That resident is not in this town.');
        }
        $x = townMapClampPct($input['x_pct'] ?? 0);
        $y = townMapClampPct($input['y_pct'] ?? 0);
        execute(
            'INSERT INTO town_map_pins (user_id, town_id, character_id, x_pct, y_pct)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE x_pct = VALUES(x_pct), y_pct = VALUES(y_pct)',
            [$uid, $townId, $characterId, $x, $y],
            0
        );
        respond(['ok' => true, 'character_id' => $characterId, 'x_pct' => $x, 'y_pct' => $y]);
    }

    if ($action === 'delete_town_map_pin') {
        $characterId = (int) ($input['character_id'] ?? 0);
        execute(
            'DELETE FROM town_map_pins WHERE user_id = ? AND town_id = ? AND character_id = ?',
            [$uid, $townId, $characterId],
            0
        );
        respond(['ok' => true]);
    }

    if ($action === 'clear_town_map_image') {
        townMapUnlinkImages($uid, $townId);
        townMapSetImageUrl($uid, $townId, null);
        execute(
            'DELETE FROM town_map_props WHERE user_id = ? AND town_id = ?',
            [$uid, $townId],
            0
        );
        respond(['ok' => true]);
    }

    if ($action === 'save_town_map_prop') {
        $id = (int) ($input['id'] ?? 0);
        $x = townMapClampPct($input['x_pct'] ?? 0);
        $y = townMapClampPct($input['y_pct'] ?? 0);
        $facing = (($input['facing'] ?? '') === 'v') ? 'v' : 'h';
        if ($id > 0) {
            $rows = query(
                'SELECT id, kind FROM town_map_props WHERE id = ? AND user_id = ? AND town_id = ? LIMIT 1',
                [$id, $uid, $townId],
                0
            );
            if (!$rows) {
                throw new Exception('That mark is not on this map.');
            }
            $kind = (string) $rows[0]['kind'];
            $state = townMapPropState($kind, (string) ($input['state'] ?? ''));
            execute(
                'UPDATE town_map_props SET x_pct = ?, y_pct = ?, facing = ?, state = ? WHERE id = ? AND user_id = ?',
                [$x, $y, $facing, $state, $id, $uid],
                0
            );
        } else {
            $kind = (string) ($input['kind'] ?? '');
            if ($kind !== 'door' && $kind !== 'trap') {
                throw new Exception('Choose a door or a trap.');
            }
            $countRows = query(
                'SELECT COUNT(*) AS n FROM town_map_props WHERE user_id = ? AND town_id = ?',
                [$uid, $townId],
                0
            );
            $count = (int) ($countRows[0]['n'] ?? 0);
            if ($count >= TOWN_MAP_PROP_LIMIT) {
                throw new Exception('This map already has the maximum number of doors and traps.');
            }
            $state = townMapPropState($kind, (string) ($input['state'] ?? ''));
            $id = insertAndGetId(
                'INSERT INTO town_map_props (user_id, town_id, kind, x_pct, y_pct, facing, state) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [$uid, $townId, $kind, $x, $y, $facing, $state],
                0
            );
        }
        $saved = query(
            'SELECT id, kind, x_pct, y_pct, facing, state FROM town_map_props WHERE id = ? AND user_id = ? LIMIT 1',
            [$id, $uid],
            0
        );
        if (!$saved) {
            throw new Exception('Could not save that mark.');
        }
        respond(['ok' => true, 'prop' => townMapFormatProp($saved[0])]);
    }

    if ($action === 'delete_town_map_prop') {
        $id = (int) ($input['id'] ?? 0);
        execute(
            'DELETE FROM town_map_props WHERE id = ? AND user_id = ? AND town_id = ?',
            [$id, $uid, $townId],
            0
        );
        respond(['ok' => true]);
    }

    throw new Exception('Unknown town map action.');
}
