<?php
/**
 * Campaign handout maps (MAP-CM-05).
 * Upload an image, drop markers, and attach each marker to lore, a town, an NPC, or an encounter.
 * Separate from the strategic world map used for travel.
 */

const CAMPAIGN_MAP_LIMIT = 30;
const CAMPAIGN_MAP_POI_LIMIT = 400;
const CAMPAIGN_MAP_LINK_TYPES = ['none', 'lore', 'town', 'character', 'encounter'];

function campaignMapEnsureSchema(): void
{
    execute(
        'CREATE TABLE IF NOT EXISTS campaign_maps (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            campaign_id INT NOT NULL,
            title VARCHAR(160) NOT NULL,
            notes TEXT NULL,
            image_url VARCHAR(500) DEFAULT NULL,
            image_width INT NOT NULL DEFAULT 0,
            image_height INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            KEY idx_campaign_maps_owner (user_id, campaign_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        [],
        0
    );
    execute(
        'CREATE TABLE IF NOT EXISTS campaign_map_pois (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            campaign_id INT NOT NULL,
            map_id INT NOT NULL,
            name VARCHAR(160) NOT NULL,
            notes TEXT NULL,
            x_pct DECIMAL(8,5) NOT NULL,
            y_pct DECIMAL(8,5) NOT NULL,
            link_type VARCHAR(20) NOT NULL DEFAULT \'none\',
            link_id INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            KEY idx_cmap_pois_map (map_id),
            KEY idx_cmap_pois_owner (user_id, campaign_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        [],
        0
    );
}

function campaignMapActiveCampaignId(int $uid): int
{
    $row = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
    if (!$row) {
        throw new Exception('No active campaign selected.');
    }
    return (int) $row[0]['id'];
}

function campaignMapRequireOwned(int $uid, int $campId, int $mapId): array
{
    $rows = query(
        'SELECT * FROM campaign_maps WHERE id = ? AND user_id = ? AND campaign_id = ? LIMIT 1',
        [$mapId, $uid, $campId],
        0
    );
    if (!$rows) {
        throw new Exception('Map not found.');
    }
    return $rows[0];
}

function campaignMapUnlinkFiles(int $uid, int $mapId): void
{
    $dir = __DIR__ . '/uploads/campaign_maps/' . $uid;
    if (!is_dir($dir)) {
        return;
    }
    foreach (glob($dir . '/map_' . $mapId . '.*') ?: [] as $old) {
        if (is_file($old)) {
            @unlink($old);
        }
    }
}

function campaignMapFormatMap(array $row, int $poiCount = 0): array
{
    return [
        'id' => (int) $row['id'],
        'title' => (string) ($row['title'] ?? ''),
        'notes' => (string) ($row['notes'] ?? ''),
        'image_url' => (string) ($row['image_url'] ?? ''),
        'image_width' => (int) ($row['image_width'] ?? 0),
        'image_height' => (int) ($row['image_height'] ?? 0),
        'poi_count' => $poiCount,
        'updated_at' => (string) ($row['updated_at'] ?? ''),
    ];
}

function campaignMapClampPct($value): float
{
    $n = (float) $value;
    if ($n < 0) {
        $n = 0;
    }
    if ($n > 100) {
        $n = 100;
    }
    return round($n, 5);
}

function campaignMapClip(string $value, int $max): string
{
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $max);
    }
    return substr($value, 0, $max);
}

function campaignMapAssertLink(int $uid, int $campId, string $type, ?int $linkId): void
{
    if (!in_array($type, CAMPAIGN_MAP_LINK_TYPES, true)) {
        throw new Exception('Unknown marker link type.');
    }
    if ($type === 'none') {
        return;
    }
    if (!$linkId || $linkId <= 0) {
        throw new Exception('Choose something to link this marker to.');
    }
    if ($type === 'lore') {
        $rows = query(
            'SELECT id FROM wiki_articles WHERE id = ? AND user_id = ? AND campaign_id = ? LIMIT 1',
            [$linkId, $uid, $campId],
            0
        );
        if (!$rows) {
            throw new Exception('That lore page is not in this campaign.');
        }
        return;
    }
    if ($type === 'town') {
        $rows = query(
            'SELECT id FROM towns WHERE id = ? AND user_id = ? AND campaign_id = ? LIMIT 1',
            [$linkId, $uid, $campId],
            0
        );
        if (!$rows) {
            throw new Exception('That town is not in this campaign.');
        }
        return;
    }
    if ($type === 'character') {
        $rows = query(
            'SELECT c.id
             FROM characters c
             JOIN towns t ON t.id = c.town_id
             WHERE c.id = ? AND t.user_id = ?
               AND (t.campaign_id = ? OR t.is_party_base = 1)
               AND (t.is_encounter_town = 0 OR t.is_encounter_town IS NULL)
             LIMIT 1',
            [$linkId, $uid, $campId],
            0
        );
        if (!$rows) {
            throw new Exception('That character is not in this campaign.');
        }
        return;
    }
    $rows = query(
        'SELECT id FROM encounters WHERE id = ? AND user_id = ? LIMIT 1',
        [$linkId, $uid],
        0
    );
    if (!$rows) {
        throw new Exception('That encounter was not found.');
    }
}

/**
 * @param array<int, array<string, mixed>> $rows
 * @return array<int, array<string, mixed>>
 */
function campaignMapDecoratePois(int $uid, int $campId, array $rows): array
{
    $ids = ['lore' => [], 'town' => [], 'character' => [], 'encounter' => []];
    foreach ($rows as $row) {
        $type = (string) ($row['link_type'] ?? 'none');
        $id = (int) ($row['link_id'] ?? 0);
        if ($id > 0 && isset($ids[$type])) {
            $ids[$type][$id] = true;
        }
    }

    $labels = [];
    $townOfChar = [];

    if ($ids['lore']) {
        $list = array_keys($ids['lore']);
        $in = implode(',', array_fill(0, count($list), '?'));
        $found = query(
            "SELECT id, title FROM wiki_articles WHERE user_id = ? AND campaign_id = ? AND id IN ($in)",
            array_merge([$uid, $campId], $list),
            0
        );
        foreach ($found as $item) {
            $labels['lore:' . (int) $item['id']] = (string) $item['title'];
        }
    }
    if ($ids['town']) {
        $list = array_keys($ids['town']);
        $in = implode(',', array_fill(0, count($list), '?'));
        $found = query(
            "SELECT id, name FROM towns WHERE user_id = ? AND id IN ($in)",
            array_merge([$uid], $list),
            0
        );
        foreach ($found as $item) {
            $labels['town:' . (int) $item['id']] = (string) $item['name'];
        }
    }
    if ($ids['character']) {
        $list = array_keys($ids['character']);
        $in = implode(',', array_fill(0, count($list), '?'));
        $found = query(
            "SELECT c.id, c.name, c.town_id, t.name AS town_name
             FROM characters c
             JOIN towns t ON t.id = c.town_id
             WHERE t.user_id = ? AND c.id IN ($in)",
            array_merge([$uid], $list),
            0
        );
        foreach ($found as $item) {
            $cid = (int) $item['id'];
            $labels['character:' . $cid] = (string) $item['name'];
            $townOfChar[$cid] = (int) $item['town_id'];
        }
    }
    if ($ids['encounter']) {
        $list = array_keys($ids['encounter']);
        $in = implode(',', array_fill(0, count($list), '?'));
        $found = query(
            "SELECT id, name FROM encounters WHERE user_id = ? AND id IN ($in)",
            array_merge([$uid], $list),
            0
        );
        foreach ($found as $item) {
            $labels['encounter:' . (int) $item['id']] = (string) $item['name'];
        }
    }

    $out = [];
    foreach ($rows as $row) {
        $type = (string) ($row['link_type'] ?? 'none');
        if (!in_array($type, CAMPAIGN_MAP_LINK_TYPES, true)) {
            $type = 'none';
        }
        $linkId = (int) ($row['link_id'] ?? 0);
        $key = $type . ':' . $linkId;
        $label = ($type !== 'none' && $linkId > 0) ? ($labels[$key] ?? '') : '';
        $out[] = [
            'id' => (int) $row['id'],
            'map_id' => (int) $row['map_id'],
            'name' => (string) ($row['name'] ?? ''),
            'notes' => (string) ($row['notes'] ?? ''),
            'x_pct' => (float) $row['x_pct'],
            'y_pct' => (float) $row['y_pct'],
            'link_type' => $type,
            'link_id' => $linkId > 0 ? $linkId : null,
            'link_label' => $label,
            'link_missing' => $type !== 'none' && $linkId > 0 && $label === '',
            'link_town_id' => $type === 'character' ? ($townOfChar[$linkId] ?? null) : null,
        ];
    }
    return $out;
}

function campaignMapHandle(string $action, ?array $input): void
{
    $user = requireAuth();
    campaignMapEnsureSchema();
    $uid = (int) $user['id'];
    $campId = campaignMapActiveCampaignId($uid);
    $input = $input ?? [];

    if ($action === 'list_campaign_maps') {
        $maps = query(
            'SELECT m.*, (SELECT COUNT(*) FROM campaign_map_pois p WHERE p.map_id = m.id) AS poi_count
             FROM campaign_maps m
             WHERE m.user_id = ? AND m.campaign_id = ?
             ORDER BY m.updated_at DESC, m.id DESC',
            [$uid, $campId],
            0
        );
        $formatted = [];
        foreach ($maps as $map) {
            $formatted[] = campaignMapFormatMap($map, (int) ($map['poi_count'] ?? 0));
        }
        respond(['ok' => true, 'maps' => $formatted]);
    }

    if ($action === 'get_campaign_map') {
        $mapId = (int) ($_GET['id'] ?? $input['id'] ?? 0);
        $map = campaignMapRequireOwned($uid, $campId, $mapId);
        $pois = query(
            'SELECT * FROM campaign_map_pois WHERE map_id = ? AND user_id = ? AND campaign_id = ? ORDER BY id',
            [$mapId, $uid, $campId],
            0
        );
        $count = count($pois);
        respond([
            'ok' => true,
            'map' => campaignMapFormatMap($map, $count),
            'pois' => campaignMapDecoratePois($uid, $campId, $pois),
        ]);
    }

    if ($action === 'campaign_map_link_options') {
        $towns = query(
            'SELECT id, name FROM towns
             WHERE user_id = ? AND campaign_id = ?
               AND (is_encounter_town = 0 OR is_encounter_town IS NULL)
             ORDER BY name
             LIMIT 400',
            [$uid, $campId],
            0
        );
        $chars = query(
            'SELECT c.id, c.name, c.race, c.class, c.status, c.town_id, t.name AS town_name
             FROM characters c
             JOIN towns t ON t.id = c.town_id
             WHERE t.user_id = ?
               AND (t.campaign_id = ? OR t.is_party_base = 1)
               AND (t.is_encounter_town = 0 OR t.is_encounter_town IS NULL)
             ORDER BY c.name
             LIMIT 1001',
            [$uid, $campId],
            0
        );
        $truncated = count($chars) > 1000;
        if ($truncated) {
            $chars = array_slice($chars, 0, 1000);
        }
        $encounters = query(
            'SELECT id, name FROM encounters WHERE user_id = ? ORDER BY name LIMIT 400',
            [$uid],
            0
        );
        $articles = [];
        try {
            $articles = query(
                'SELECT id, title, category FROM wiki_articles
                 WHERE user_id = ? AND campaign_id = ?
                 ORDER BY title
                 LIMIT 500',
                [$uid, $campId],
                0
            );
        } catch (Exception $e) {
            $articles = [];
        }
        $fmt = static function (array $rows, array $keys): array {
            $out = [];
            foreach ($rows as $row) {
                $item = [];
                foreach ($keys as $key) {
                    $item[$key] = $row[$key] ?? '';
                }
                $item['id'] = (int) ($row['id'] ?? 0);
                if (isset($row['town_id'])) {
                    $item['town_id'] = (int) $row['town_id'];
                }
                $out[] = $item;
            }
            return $out;
        };
        respond([
            'ok' => true,
            'towns' => $fmt($towns, ['name']),
            'characters' => $fmt($chars, ['name', 'race', 'class', 'status', 'town_name']),
            'characters_truncated' => $truncated,
            'encounters' => $fmt($encounters, ['name']),
            'articles' => $fmt($articles, ['title', 'category']),
        ]);
    }

    if ($action === 'save_campaign_map') {
        $mapId = (int) ($input['id'] ?? 0);
        $title = campaignMapClip(trim((string) ($input['title'] ?? '')), 160);
        if ($title === '') {
            throw new Exception('Map title is required.');
        }
        $notes = campaignMapClip(trim((string) ($input['notes'] ?? '')), 4000);
        $hasImage = array_key_exists('image_url', $input);
        $imageUrl = campaignMapClip(trim((string) ($input['image_url'] ?? '')), 500);
        $width = max(0, (int) ($input['image_width'] ?? 0));
        $height = max(0, (int) ($input['image_height'] ?? 0));
        $imagePath = strtok($imageUrl, '?') ?: '';
        if ($hasImage && $imagePath !== '' && !preg_match('#^uploads/campaign_maps/' . $uid . '/map_\d+\.(jpg|png|webp|gif)$#', $imagePath)) {
            throw new Exception('Map image path is not valid.');
        }

        if ($mapId > 0) {
            campaignMapRequireOwned($uid, $campId, $mapId);
            if ($hasImage) {
                execute(
                    'UPDATE campaign_maps
                     SET title = ?, notes = ?, image_url = ?, image_width = ?, image_height = ?, updated_at = NOW()
                     WHERE id = ? AND user_id = ? AND campaign_id = ?',
                    [$title, $notes, $imageUrl !== '' ? $imageUrl : null, $width, $height, $mapId, $uid, $campId],
                    0
                );
            } else {
                execute(
                    'UPDATE campaign_maps SET title = ?, notes = ?, updated_at = NOW() WHERE id = ? AND user_id = ? AND campaign_id = ?',
                    [$title, $notes, $mapId, $uid, $campId],
                    0
                );
            }
        } else {
            $count = query(
                'SELECT COUNT(*) AS c FROM campaign_maps WHERE user_id = ? AND campaign_id = ?',
                [$uid, $campId],
                0
            );
            if ((int) ($count[0]['c'] ?? 0) >= CAMPAIGN_MAP_LIMIT) {
                throw new Exception('This campaign already has the maximum number of handout maps (' . CAMPAIGN_MAP_LIMIT . ').');
            }
            $mapId = insertAndGetId(
                'INSERT INTO campaign_maps (user_id, campaign_id, title, notes, image_url, image_width, image_height)
                 VALUES (?,?,?,?,?,?,?)',
                [$uid, $campId, $title, $notes, null, 0, 0],
                0
            );
        }
        $saved = campaignMapRequireOwned($uid, $campId, $mapId);
        $poiCountRow = query('SELECT COUNT(*) AS c FROM campaign_map_pois WHERE map_id = ?', [$mapId], 0);
        respond([
            'ok' => true,
            'map' => campaignMapFormatMap($saved, (int) ($poiCountRow[0]['c'] ?? 0)),
        ]);
    }

    if ($action === 'delete_campaign_map') {
        $mapId = (int) ($input['id'] ?? 0);
        campaignMapRequireOwned($uid, $campId, $mapId);
        execute('DELETE FROM campaign_map_pois WHERE map_id = ? AND user_id = ? AND campaign_id = ?', [$mapId, $uid, $campId], 0);
        execute('DELETE FROM campaign_maps WHERE id = ? AND user_id = ? AND campaign_id = ?', [$mapId, $uid, $campId], 0);
        campaignMapUnlinkFiles($uid, $mapId);
        respond(['ok' => true]);
    }

    if ($action === 'save_campaign_map_poi') {
        $mapId = (int) ($input['map_id'] ?? 0);
        campaignMapRequireOwned($uid, $campId, $mapId);
        $poiId = (int) ($input['id'] ?? 0);
        $name = campaignMapClip(trim((string) ($input['name'] ?? '')), 160);
        if ($name === '') {
            throw new Exception('Marker name is required.');
        }
        $notes = campaignMapClip(trim((string) ($input['notes'] ?? '')), 4000);
        $x = campaignMapClampPct($input['x_pct'] ?? 0);
        $y = campaignMapClampPct($input['y_pct'] ?? 0);
        $type = (string) ($input['link_type'] ?? 'none');
        $linkId = (int) ($input['link_id'] ?? 0);
        if ($type === 'none') {
            $linkId = 0;
        }
        campaignMapAssertLink($uid, $campId, $type, $linkId > 0 ? $linkId : null);

        if ($poiId > 0) {
            $existing = query(
                'SELECT id FROM campaign_map_pois WHERE id = ? AND map_id = ? AND user_id = ? AND campaign_id = ? LIMIT 1',
                [$poiId, $mapId, $uid, $campId],
                0
            );
            if (!$existing) {
                throw new Exception('Marker not found.');
            }
            execute(
                'UPDATE campaign_map_pois
                 SET name = ?, notes = ?, x_pct = ?, y_pct = ?, link_type = ?, link_id = ?, updated_at = NOW()
                 WHERE id = ?',
                [$name, $notes, $x, $y, $type, $linkId > 0 ? $linkId : null, $poiId],
                0
            );
        } else {
            $count = query('SELECT COUNT(*) AS c FROM campaign_map_pois WHERE map_id = ?', [$mapId], 0);
            if ((int) ($count[0]['c'] ?? 0) >= CAMPAIGN_MAP_POI_LIMIT) {
                throw new Exception('This map already has the maximum number of markers (' . CAMPAIGN_MAP_POI_LIMIT . ').');
            }
            $poiId = insertAndGetId(
                'INSERT INTO campaign_map_pois
                    (user_id, campaign_id, map_id, name, notes, x_pct, y_pct, link_type, link_id)
                 VALUES (?,?,?,?,?,?,?,?,?)',
                [$uid, $campId, $mapId, $name, $notes, $x, $y, $type, $linkId > 0 ? $linkId : null],
                0
            );
        }
        execute('UPDATE campaign_maps SET updated_at = NOW() WHERE id = ?', [$mapId], 0);
        $saved = query('SELECT * FROM campaign_map_pois WHERE id = ? LIMIT 1', [$poiId], 0);
        $decorated = campaignMapDecoratePois($uid, $campId, $saved);
        respond(['ok' => true, 'poi' => $decorated[0]]);
    }

    if ($action === 'delete_campaign_map_poi') {
        $poiId = (int) ($input['id'] ?? 0);
        $rows = query(
            'SELECT id, map_id FROM campaign_map_pois WHERE id = ? AND user_id = ? AND campaign_id = ? LIMIT 1',
            [$poiId, $uid, $campId],
            0
        );
        if (!$rows) {
            throw new Exception('Marker not found.');
        }
        execute('DELETE FROM campaign_map_pois WHERE id = ? AND user_id = ?', [$poiId, $uid], 0);
        respond(['ok' => true]);
    }

    throw new Exception('Unknown campaign map action.');
}
