<?php
/**
 * Town Directory — API Router
 * All frontend JS calls route through this file.
 *
 * Usage: api.php?action=<action_name>
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/auth.php';

// Ensure is_encounter_town column exists (one-time migration)
try { execute('ALTER TABLE towns ADD COLUMN is_encounter_town TINYINT(1) NOT NULL DEFAULT 0', [], 0); } catch (Exception $e) { /* already exists */ }

$action = $_GET['action'] ?? '';
$input = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true) ?? [];
}

try {

    require_once __DIR__ . '/helpers.php';
    require_once __DIR__ . '/user_db.php';

    switch ($action) {

        /* ═══════════════════════════════════════════════════
           AUTH — uses shared DB (userId=0)
           ═══════════════════════════════════════════════════ */
        case 'register':
            $user = register($input['username'] ?? '', $input['email'] ?? '', $input['password'] ?? '', $input['beta_key'] ?? '');
            respond(['ok' => true, 'user' => $user]);
            break;

        case 'login':
            $user = login($input['login'] ?? '', $input['password'] ?? '');
            respond(['ok' => true, 'user' => $user]);
            break;

        case 'logout':
            logout();
            respond(['ok' => true]);
            break;

        case 'me':
            $user = currentUser();
            if ($user) {
                // Add subscription tier + role + active campaign
                $udata = query('SELECT subscription_tier, role FROM users WHERE id = ?', [(int) $user['id']], 0);
                $user['subscription_tier'] = $udata[0]['subscription_tier'] ?? 'free';
                $user['role'] = $udata[0]['role'] ?? 'user';
                // Get active campaign
                $camps = query('SELECT id, name, dnd_edition, description FROM campaigns WHERE user_id = ? AND is_active = 1 ORDER BY id LIMIT 1', [(int) $user['id']], 0);
                $user['active_campaign'] = $camps[0] ?? null;
            }
            respond($user ? ['ok' => true, 'user' => $user] : ['ok' => false, 'user' => null]);
            break;

        case 'get_usage':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $udata = query('SELECT subscription_tier, credit_balance FROM users WHERE id = ?', [$uid], 0);
            $tier = $udata[0]['subscription_tier'] ?? 'free';
            $creditBalance = (int) ($udata[0]['credit_balance'] ?? 0);
            $yearMonth = date('Y-m');

            // Get usage this month (for analytics display)
            $usageRows = query(
                "SELECT COALESCE(SUM(tokens_used), 0) as tokens_used, COALESCE(SUM(call_count), 0) as call_count FROM user_token_usage WHERE user_id = ? AND `year_month` = ?",
                [$uid, $yearMonth], 0
            );
            $tokensUsed = (int) ($usageRows[0]['tokens_used'] ?? 0);
            $callCount = (int) ($usageRows[0]['call_count'] ?? 0);

            $tierLabels = ['free' => 'Free', 'apprentice' => 'Apprentice', 'adventurer' => 'Adventurer', 'guild_master' => 'Guild Master', 'world_builder' => 'World Builder'];
            respond([
                'ok' => true,
                'tier' => $tier,
                'tier_label' => $tierLabels[$tier] ?? $tier,
                'credit_balance' => $creditBalance,
                'tokens_used_this_month' => $tokensUsed,
                'call_count' => $callCount,
                'year_month' => $yearMonth,
            ]);
            break;

        /* ═══════════════════════════════════════════════════
           CAMPAIGNS — multi-campaign support
           ═══════════════════════════════════════════════════ */
        case 'campaigns':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $camps = query('SELECT id, name, dnd_edition, description, is_active, created_at FROM campaigns WHERE user_id = ? ORDER BY created_at', [$uid], 0);
            // Count towns per campaign
            foreach ($camps as &$c) {
                $cnt = query('SELECT COUNT(*) as c FROM towns WHERE campaign_id = ? AND (is_party_base = 0 OR is_party_base IS NULL)', [(int) $c['id']], $uid);
                $c['town_count'] = (int) ($cnt[0]['c'] ?? 0);
            }
            // Tier info — four tiers: free, adventurer, guild_master, world_builder
            $udata = query('SELECT subscription_tier FROM users WHERE id = ?', [$uid], 0);
            $tier = $udata[0]['subscription_tier'] ?? 'free';
            $limits = ['free' => 1, 'apprentice' => 2, 'adventurer' => 3, 'guild_master' => 10, 'world_builder' => 999];
            $townLimits = ['free' => 3, 'apprentice' => 4, 'adventurer' => 5, 'guild_master' => 10, 'world_builder' => 999];
            respond(['ok' => true, 'campaigns' => $camps, 'tier' => $tier, 'max_campaigns' => $limits[$tier] ?? 1, 'max_towns' => $townLimits[$tier] ?? 3]);
            break;

        case 'create_campaign':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $name = trim($input['name'] ?? '');
            $edition = trim($input['dnd_edition'] ?? '3.5e');
            $desc = trim($input['description'] ?? '');
            if (!$name)
                throw new Exception('Campaign name is required.');
            if (!in_array($edition, ['3.5e', '5e', '5e2024']))
                $edition = '3.5e';
            // Check tier limit — four tiers: free, adventurer, guild_master, world_builder
            $udata = query('SELECT subscription_tier FROM users WHERE id = ?', [$uid], 0);
            $tier = $udata[0]['subscription_tier'] ?? 'free';
            $limits = ['free' => 1, 'apprentice' => 2, 'adventurer' => 3, 'guild_master' => 10, 'world_builder' => 999];
            $maxCamps = $limits[$tier] ?? 1;
            $existing = query('SELECT COUNT(*) as c FROM campaigns WHERE user_id = ?', [$uid], 0);
            $currentCount = (int) ($existing[0]['c'] ?? 0);
            if ($currentCount >= $maxCamps)
                throw new Exception("Your $tier tier allows up to $maxCamps campaign(s). Upgrade to create more.");
            // Deactivate other campaigns, activate the new one
            execute('UPDATE campaigns SET is_active = 0 WHERE user_id = ?', [$uid], 0);
            $cid = insertAndGetId('INSERT INTO campaigns (user_id, name, dnd_edition, description, is_active) VALUES (?,?,?,?,1)', [$uid, $name, $edition, $desc], 0);
            respond(['ok' => true, 'campaign' => ['id' => $cid, 'name' => $name, 'dnd_edition' => $edition, 'description' => $desc]]);
            break;

        case 'update_campaign':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $cid = (int) ($input['campaign_id'] ?? 0);
            // Verify ownership
            $camp = query('SELECT id FROM campaigns WHERE id = ? AND user_id = ?', [$cid, $uid], 0);
            if (!$camp)
                throw new Exception('Campaign not found.');
            $updates = [];
            $params = [];
            if (isset($input['name'])) {
                $updates[] = 'name = ?';
                $params[] = trim($input['name']);
            }
            if (isset($input['dnd_edition'])) {
                $ed = trim($input['dnd_edition']);
                if (in_array($ed, ['3.5e', '5e', '5e2024'])) {
                    $updates[] = 'dnd_edition = ?';
                    $params[] = $ed;
                }
            }
            if (isset($input['description'])) {
                $updates[] = 'description = ?';
                $params[] = trim($input['description']);
            }
            if ($updates) {
                $updates[] = 'updated_at = NOW()';
                $params[] = $cid;
                execute('UPDATE campaigns SET ' . implode(', ', $updates) . ' WHERE id = ?', $params, 0);
            }
            respond(['ok' => true]);
            break;

        case 'delete_campaign':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $cid = (int) ($input['campaign_id'] ?? 0);
            $camp = query('SELECT id FROM campaigns WHERE id = ? AND user_id = ?', [$cid, $uid], 0);
            if (!$camp)
                throw new Exception('Campaign not found.');
            // Delete towns in the campaign first (cascade chars)
            $townIds = query('SELECT id FROM towns WHERE campaign_id = ?', [$cid], $uid);
            foreach ($townIds as $t) {
                execute('DELETE FROM characters WHERE town_id = ?', [(int) $t['id']], $uid);
            }
            execute('DELETE FROM towns WHERE campaign_id = ?', [$cid], $uid);
            execute('DELETE FROM campaigns WHERE id = ?', [$cid], 0);
            // Activate another campaign if none active
            $active = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            if (!$active) {
                $any = query('SELECT id FROM campaigns WHERE user_id = ? ORDER BY id LIMIT 1', [$uid], 0);
                if ($any)
                    execute('UPDATE campaigns SET is_active = 1 WHERE id = ?', [(int) $any[0]['id']], 0);
            }
            respond(['ok' => true]);
            break;

        case 'switch_campaign':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $cid = (int) ($input['campaign_id'] ?? 0);
            $camp = query('SELECT id FROM campaigns WHERE id = ? AND user_id = ?', [$cid, $uid], 0);
            if (!$camp)
                throw new Exception('Campaign not found.');
            execute('UPDATE campaigns SET is_active = 0 WHERE user_id = ?', [$uid], 0);
            execute('UPDATE campaigns SET is_active = 1 WHERE id = ?', [$cid], 0);
            $campData = query('SELECT id, name, dnd_edition, description FROM campaigns WHERE id = ?', [$cid], 0);
            respond(['ok' => true, 'campaign' => $campData[0] ?? null]);
            break;

        /* ═══════════════════════════════════════════════════
           TOWNS — per-user, scoped to active campaign
           ═══════════════════════════════════════════════════ */
        case 'towns':
            $user = requireAuth();
            $uid = (int) $user['id'];
            // Get active campaign
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;
            if ($campId) {
                $towns = query(
                    'SELECT id, name, subtitle, campaign_id, created_at, updated_at FROM towns WHERE user_id = ? AND campaign_id = ? AND (is_party_base = 0 OR is_party_base IS NULL) AND (is_encounter_town = 0 OR is_encounter_town IS NULL) ORDER BY name',
                    [$uid, $campId],
                    $uid
                );
            } else {
                $towns = query(
                    'SELECT id, name, subtitle, campaign_id, created_at, updated_at FROM towns WHERE user_id = ? AND (is_party_base = 0 OR is_party_base IS NULL) AND (is_encounter_town = 0 OR is_encounter_town IS NULL) ORDER BY name',
                    [$uid],
                    $uid
                );
            }
            foreach ($towns as &$t) {
                $cnt = query('SELECT COUNT(*) as c FROM characters WHERE town_id = ?', [$t['id']], $uid);
                $t['character_count'] = (int) ($cnt[0]['c'] ?? 0);
            }
            respond(['ok' => true, 'towns' => $towns]);
            break;

        case 'ensure_encounter_town':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;
            // Ensure the is_encounter_town column exists
            try {
                execute('ALTER TABLE towns ADD COLUMN is_encounter_town TINYINT(1) NOT NULL DEFAULT 0', [], 0);
            } catch (Exception $e) { /* column already exists */ }
            // Look for existing encounter town in this campaign
            $existing = query(
                'SELECT id, name FROM towns WHERE user_id = ? AND campaign_id = ? AND is_encounter_town = 1 LIMIT 1',
                [$uid, $campId], $uid
            );
            if ($existing) {
                respond(['ok' => true, 'town_id' => (int) $existing[0]['id'], 'town_name' => $existing[0]['name']]);
            } else {
                // Create the encounter town (bypasses tier limits)
                $encTownId = insertAndGetId(
                    'INSERT INTO towns (user_id, campaign_id, name, subtitle, is_encounter_town) VALUES (?, ?, ?, ?, 1)',
                    [$uid, $campId, '⚔️ Encounter Arena', 'System town for encounter creatures'],
                    $uid
                );
                respond(['ok' => true, 'town_id' => (int) $encTownId, 'town_name' => '⚔️ Encounter Arena']);
            }
            break;

        case 'create_town':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $name = trim($input['name'] ?? '');
            $subtitle = trim($input['subtitle'] ?? '');
            if (!$name)
                throw new Exception('Town name is required.');
            // Link to active campaign
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;
            // Check town limit per tier
            if ($campId) {
                $udata = query('SELECT subscription_tier FROM users WHERE id = ?', [$uid], 0);
                $tier = $udata[0]['subscription_tier'] ?? 'free';
                $townLimits = ['free' => 3, 'apprentice' => 4, 'adventurer' => 5, 'guild_master' => 10, 'world_builder' => 999];
                $maxTowns = $townLimits[$tier] ?? 3;
                $existingTowns = query('SELECT COUNT(*) as c FROM towns WHERE campaign_id = ? AND (is_party_base = 0 OR is_party_base IS NULL) AND (is_encounter_town = 0 OR is_encounter_town IS NULL)', [$campId], $uid);
                $currentTownCount = (int) ($existingTowns[0]['c'] ?? 0);
                if ($currentTownCount >= $maxTowns)
                    throw new Exception("Your plan allows up to $maxTowns towns per campaign. Upgrade to create more.");
            }
            $id = insertAndGetId(
                'INSERT INTO towns (user_id, campaign_id, name, subtitle) VALUES (?, ?, ?, ?)',
                [$uid, $campId, $name, $subtitle],
                $uid
            );
            respond(['ok' => true, 'town' => ['id' => $id, 'name' => $name, 'subtitle' => $subtitle]]);
            break;

        case 'update_town':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $townId = (int) ($input['town_id'] ?? 0);
            verifyTownOwnership($uid, $townId, $uid);
            execute(
                "UPDATE towns SET name = ?, subtitle = ?, updated_at = NOW() WHERE id = ?",
                [trim($input['name'] ?? ''), trim($input['subtitle'] ?? ''), $townId],
                $uid
            );
            respond(['ok' => true]);
            break;

        case 'delete_town':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $townId = (int) ($input['town_id'] ?? 0);
            verifyTownOwnership($uid, $townId, $uid);
            // Prevent deleting the party base
            $isBase = query('SELECT is_party_base FROM towns WHERE id = ?', [$townId], $uid);
            if (!empty($isBase) && $isBase[0]['is_party_base'])
                throw new Exception('Cannot delete the Party Camp.');
            execute('DELETE FROM town_meta WHERE town_id = ?', [$townId], $uid);
            execute('DELETE FROM history WHERE town_id = ?', [$townId], $uid);
            execute('DELETE FROM characters WHERE town_id = ?', [$townId], $uid);
            execute('DELETE FROM towns WHERE id = ?', [$townId], $uid);
            respond(['ok' => true]);
            break;

        case 'purge_population':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $townId = (int) ($input['town_id'] ?? 0);
            $purgePop = !isset($input['purge_population']) || $input['purge_population'];
            $purgeBld = !empty($input['purge_buildings']);
            verifyTownOwnership($uid, $townId, $uid);

            if ($purgePop) {
                // Get all character IDs in this town for cascading deletes
                $charRows = query('SELECT id FROM characters WHERE town_id = ?', [$townId], $uid);
                $charIds = array_map(fn($r) => (int) $r['id'], $charRows);

                if (!empty($charIds)) {
                    $placeholders = implode(',', array_fill(0, count($charIds), '?'));

                    // Delete character-linked data
                    try { execute("DELETE FROM character_equipment WHERE character_id IN ($placeholders)", $charIds, $uid); } catch (Exception $e) {}
                    try { execute("DELETE FROM character_xp_log WHERE character_id IN ($placeholders)", $charIds, $uid); } catch (Exception $e) {}
                    try { execute("DELETE FROM character_memories WHERE character_id IN ($placeholders)", $charIds, $uid); } catch (Exception $e) {}
                    try { execute("DELETE FROM character_relationships WHERE char1_id IN ($placeholders) OR char2_id IN ($placeholders)", array_merge($charIds, $charIds), $uid); } catch (Exception $e) {}
                    try { execute("DELETE FROM character_spells_known WHERE character_id IN ($placeholders)", $charIds, $uid); } catch (Exception $e) {}
                    try { execute("DELETE FROM character_spells_prepared WHERE character_id IN ($placeholders)", $charIds, $uid); } catch (Exception $e) {}
                    try { execute("DELETE FROM character_spellbook WHERE character_id IN ($placeholders)", $charIds, $uid); } catch (Exception $e) {}
                    try { execute("DELETE FROM character_active_effects WHERE character_id IN ($placeholders)", $charIds, $uid); } catch (Exception $e) {}
                    try { execute("DELETE FROM character_level_history WHERE character_id IN ($placeholders)", $charIds, $uid); } catch (Exception $e) {}
                    try { execute("DELETE FROM faction_members WHERE character_id IN ($placeholders)", $charIds, $uid); } catch (Exception $e) {}
                    try { execute("DELETE FROM incident_participants WHERE character_id IN ($placeholders)", $charIds, $uid); } catch (Exception $e) {}
                    try { execute("DELETE FROM party_members WHERE character_id IN ($placeholders)", $charIds, $uid); } catch (Exception $e) {}
                    try { execute("DELETE FROM pc_reputation WHERE character_id IN ($placeholders)", $charIds, $uid); } catch (Exception $e) {}
                }

                // Delete all characters
                execute('DELETE FROM characters WHERE town_id = ?', [$townId], $uid);
                
                // Clear building assignments (owner_id references characters)
                try { execute('UPDATE town_buildings SET owner_id = NULL WHERE town_id = ?', [$townId], $uid); } catch (Exception $e) {}
            }

            if ($purgeBld) {
                if (!$purgePop) {
                    try { execute('UPDATE characters SET building_id = NULL WHERE town_id = ?', [$townId], $uid); } catch (Exception $e) {}
                }
                execute('DELETE FROM town_buildings WHERE town_id = ?', [$townId], $uid);
            }

            respond(['ok' => true, 'purged' => ($purgePop && isset($charIds) ? count($charIds) : 0)]);
            break;

        case 'get_party_base':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $base = query('SELECT id, name FROM towns WHERE user_id = ? AND is_party_base = 1 LIMIT 1', [$uid], $uid);
            if (empty($base)) {
                $baseId = insertAndGetId(
                    'INSERT INTO towns (user_id, name, subtitle, is_party_base) VALUES (?, ?, ?, 1)',
                    [$uid, 'Party Camp', 'Home base for the adventuring party — excluded from simulations.'],
                    $uid
                );
                $base = [['id' => $baseId, 'name' => 'Party Camp']];
            }
            respond(['ok' => true, 'party_base' => $base[0]]);
            break;

        /* ═══════════════════════════════════════════════════
           CHARACTERS
           ═══════════════════════════════════════════════════ */
        case 'characters':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $townId = (int) ($_GET['town_id'] ?? 0);
            verifyTownOwnership($uid, $townId, $uid);
            $chars = query('SELECT * FROM characters WHERE town_id = ? ORDER BY name', [$townId], $uid);
            respond(['ok' => true, 'characters' => $chars]);
            break;

        case 'save_character':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $townId = (int) ($input['town_id'] ?? 0);
            verifyTownOwnership($uid, $townId, $uid);
            $d = $input['character'] ?? [];
            $charId = (int) ($d['id'] ?? 0);

            $fields = [
                'name',
                'race',
                'class',
                'status',
                'title',
                'gender',
                'spouse',
                'spouse_label',
                'age',
                'xp',
                'cr',
                'ecl',
                'hp',
                'hd',
                'ac',
                'init',
                'spd',
                'grapple',
                'atk',
                'alignment',
                'saves',
                'str',
                'dex',
                'con',
                'int_',
                'wis',
                'cha',
                'languages',
                'skills_feats',
                'feats',
                'domains',
                'gear',
                'role',
                'history',
                'portrait_url',
                'portrait_prompt',
                'building_id'
            ];

            if ($charId > 0) {
                // Only update fields that were actually sent
                $sets = [];
                $vals = [];
                foreach ($fields as $f) {
                    if (array_key_exists($f, $d)) {
                        $sets[] = "$f = ?";
                        $vals[] = $d[$f];
                    }
                }
                if (empty($sets)) {
                    respond(['ok' => true, 'id' => $charId, 'note' => 'No fields to update']);
                }
                $vals[] = $charId;
                $vals[] = $townId;
                execute('UPDATE characters SET ' . implode(', ', $sets) . ' WHERE id = ? AND town_id = ?', $vals, $uid);
                respond(['ok' => true, 'id' => $charId]);
            } else {
                $cols = ['town_id'];
                $placeholders = ['?'];
                $vals = [$townId];
                foreach ($fields as $f) {
                    $cols[] = $f;
                    $placeholders[] = '?';
                    $vals[] = $d[$f] ?? null;
                }
                $newId = insertAndGetId(
                    'INSERT INTO characters (' . implode(',', $cols) . ') VALUES (' . implode(',', $placeholders) . ')',
                    $vals,
                    $uid
                );
                respond(['ok' => true, 'id' => $newId]);
            }
            execute("UPDATE towns SET updated_at = NOW() WHERE id = ?", [$townId], $uid);
            break;

        case 'delete_character':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $townId = (int) ($input['town_id'] ?? 0);
            $charId = (int) ($input['character_id'] ?? 0);
            verifyTownOwnership($uid, $townId, $uid);
            execute('DELETE FROM characters WHERE id = ? AND town_id = ?', [$charId, $townId], $uid);
            respond(['ok' => true]);
            break;

        /* ═══════════════════════════════════════════════════
               CHARACTER EQUIPMENT
               ═══════════════════════════════════════════════════ */
        case 'get_equipment':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $charId = (int) ($_GET['character_id'] ?? 0);
            // Verify ownership through character → town → user
            $charRow = query('SELECT c.town_id FROM characters c JOIN towns t ON c.town_id = t.id WHERE c.id = ? AND t.user_id = ?', [$charId, $uid], $uid);
            if (empty($charRow))
                respond(['ok' => false, 'error' => 'Character not found']);
            $items = query('SELECT * FROM character_equipment WHERE character_id = ? ORDER BY equipped DESC, sort_order, item_name', [$charId], $uid);
            respond(['ok' => true, 'equipment' => $items]);
            break;

        case 'save_equipment':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $charId = (int) ($input['character_id'] ?? 0);
            $charRow = query('SELECT c.town_id FROM characters c JOIN towns t ON c.town_id = t.id WHERE c.id = ? AND t.user_id = ?', [$charId, $uid], $uid);
            if (empty($charRow))
                respond(['ok' => false, 'error' => 'Character not found']);
            $item = $input['item'] ?? [];
            $itemId = (int) ($item['id'] ?? 0);
            if ($itemId > 0) {
                execute('UPDATE character_equipment SET item_name=?, item_type=?, slot=?, quantity=?, weight=?, properties=?, srd_ref=?, equipped=?, sort_order=? WHERE id=? AND character_id=?', [
                    $item['item_name'] ?? '',
                    $item['item_type'] ?? 'gear',
                    $item['slot'] ?? null,
                    (int) ($item['quantity'] ?? 1),
                    (float) ($item['weight'] ?? 0),
                    $item['properties'] ?? '',
                    $item['srd_ref'] ?? '',
                    (int) ($item['equipped'] ?? 0),
                    (int) ($item['sort_order'] ?? 0),
                    $itemId,
                    $charId
                ], $uid);
                respond(['ok' => true, 'id' => $itemId]);
            } else {
                $newId = insertAndGetId('INSERT INTO character_equipment (character_id, item_name, item_type, slot, quantity, weight, properties, srd_ref, equipped, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)', [
                    $charId,
                    $item['item_name'] ?? '',
                    $item['item_type'] ?? 'gear',
                    $item['slot'] ?? null,
                    (int) ($item['quantity'] ?? 1),
                    (float) ($item['weight'] ?? 0),
                    $item['properties'] ?? '',
                    $item['srd_ref'] ?? '',
                    (int) ($item['equipped'] ?? 0),
                    (int) ($item['sort_order'] ?? 0)
                ], $uid);
                respond(['ok' => true, 'id' => $newId]);
            }
            break;

        case 'delete_equipment':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $charId = (int) ($input['character_id'] ?? 0);
            $itemId = (int) ($input['item_id'] ?? 0);
            $charRow = query('SELECT c.town_id FROM characters c JOIN towns t ON c.town_id = t.id WHERE c.id = ? AND t.user_id = ?', [$charId, $uid], $uid);
            if (empty($charRow))
                respond(['ok' => false, 'error' => 'Character not found']);
            execute('DELETE FROM character_equipment WHERE id = ? AND character_id = ?', [$itemId, $charId], $uid);
            respond(['ok' => true]);
            break;

        case 'equip_item':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $charId = (int) ($input['character_id'] ?? 0);
            $itemId = (int) ($input['item_id'] ?? 0);
            $slot = $input['slot'] ?? null;
            $charRow = query('SELECT c.town_id FROM characters c JOIN towns t ON c.town_id = t.id WHERE c.id = ? AND t.user_id = ?', [$charId, $uid], $uid);
            if (empty($charRow))
                respond(['ok' => false, 'error' => 'Character not found']);
            // Unequip anything currently in that slot
            if ($slot) {
                execute('UPDATE character_equipment SET equipped = 0, slot = NULL WHERE character_id = ? AND slot = ?', [$charId, $slot], $uid);
            }
            execute('UPDATE character_equipment SET equipped = 1, slot = ? WHERE id = ? AND character_id = ?', [$slot, $itemId, $charId], $uid);
            recalcCharStats($charId, $uid);
            // Return updated AC/ATK so frontend can update immediately
            $updated = query('SELECT ac, atk FROM characters WHERE id = ?', [$charId], $uid);
            respond(['ok' => true, 'ac' => $updated[0]['ac'] ?? '', 'atk' => $updated[0]['atk'] ?? '']);
            break;

        case 'unequip_item':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $charId = (int) ($input['character_id'] ?? 0);
            $itemId = (int) ($input['item_id'] ?? 0);
            $charRow = query('SELECT c.town_id FROM characters c JOIN towns t ON c.town_id = t.id WHERE c.id = ? AND t.user_id = ?', [$charId, $uid], $uid);
            if (empty($charRow))
                respond(['ok' => false, 'error' => 'Character not found']);
            execute('UPDATE character_equipment SET equipped = 0, slot = NULL WHERE id = ? AND character_id = ?', [$itemId, $charId], $uid);
            recalcCharStats($charId, $uid);
            // Return updated AC/ATK so frontend can update immediately
            $updated = query('SELECT ac, atk FROM characters WHERE id = ?', [$charId], $uid);
            respond(['ok' => true, 'ac' => $updated[0]['ac'] ?? '', 'atk' => $updated[0]['atk'] ?? '']);
            break;

        /* ═══════════════════════════════════════════════════
           HISTORY
           ═══════════════════════════════════════════════════ */
        case 'history':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $townId = (int) ($_GET['town_id'] ?? 0);
            verifyTownOwnership($uid, $townId, $uid);
            $hist = query('SELECT * FROM history WHERE town_id = ? ORDER BY sort_order', [$townId], $uid);
            respond(['ok' => true, 'history' => $hist]);
            break;

        case 'save_history':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $townId = (int) ($input['town_id'] ?? 0);
            verifyTownOwnership($uid, $townId, $uid);
            execute('DELETE FROM history WHERE town_id = ?', [$townId], $uid);
            foreach (($input['entries'] ?? []) as $i => $e) {
                execute(
                    'INSERT INTO history (town_id, heading, content, sort_order) VALUES (?, ?, ?, ?)',
                    [$townId, $e['heading'] ?? '', $e['content'] ?? '', $i],
                    $uid
                );
            }
            respond(['ok' => true]);
            break;

        /* ═══════════════════════════════════════════════════
           TOWN METADATA
           ═══════════════════════════════════════════════════ */
        case 'town_meta':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $townId = (int) ($_GET['town_id'] ?? 0);
            verifyTownOwnership($uid, $townId, $uid);
            $meta = query('SELECT `key`, value FROM town_meta WHERE town_id = ?', [$townId], $uid);
            $result = [];
            foreach ($meta as $m)
                $result[$m['key']] = $m['value'];
            respond(['ok' => true, 'meta' => $result]);
            break;

        case 'save_meta':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $townId = (int) ($input['town_id'] ?? 0);
            verifyTownOwnership($uid, $townId, $uid);
            $key = $input['key'] ?? '';
            $value = $input['value'] ?? '';
            execute('DELETE FROM town_meta WHERE town_id = ? AND `key` = ?', [$townId, $key], $uid);
            execute('INSERT INTO town_meta (town_id, `key`, value) VALUES (?, ?, ?)', [$townId, $key, $value], $uid);
            respond(['ok' => true]);
            break;

        /* ═══════════════════════════════════════════════════
           TOWN BUILDINGS & ROOMS
           ═══════════════════════════════════════════════════ */
        case 'get_buildings':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $townId = (int) ($_GET['town_id'] ?? 0);
            verifyTownOwnership($uid, $townId, $uid);
            $buildings = query('SELECT * FROM town_buildings WHERE town_id = ? ORDER BY sort_order, name', [$townId], $uid);
            // Attach rooms and resident count to each building
            foreach ($buildings as &$b) {
                $bid = (int) $b['id'];
                $b['rooms'] = query('SELECT * FROM building_rooms WHERE building_id = ? ORDER BY sort_order, name', [$bid], $uid) ?: [];
                $resCount = query('SELECT COUNT(*) as c FROM characters WHERE building_id = ? AND town_id = ?', [$bid, $townId], $uid);
                $b['resident_count'] = (int) ($resCount[0]['c'] ?? 0);
                // Attach owner name if set
                if (!empty($b['owner_id'])) {
                    $ownerRow = query('SELECT name FROM characters WHERE id = ?', [(int) $b['owner_id']], $uid);
                    $b['owner_name'] = $ownerRow[0]['name'] ?? '';
                }
                // Attach list of residents (just id + name for assignment UI)
                $b['residents'] = query('SELECT id, name, class, level, role FROM characters WHERE building_id = ? AND town_id = ? ORDER BY name', [$bid, $townId], $uid) ?: [];
            }
            unset($b);
            respond(['ok' => true, 'buildings' => $buildings ?: []]);
            break;

        case 'save_building':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $townId = (int) ($input['town_id'] ?? 0);
            verifyTownOwnership($uid, $townId, $uid);
            $d = $input['building'] ?? [];
            $buildingId = (int) ($d['id'] ?? 0);

            if ($buildingId > 0) {
                // Update existing building
                execute('UPDATE town_buildings SET name=?, building_type=?, status=?, description=?, owner_id=?, sort_order=?, build_progress=?, build_time=? WHERE id=? AND town_id=?', [
                    trim($d['name'] ?? ''),
                    $d['building_type'] ?? 'other',
                    $d['status'] ?? 'completed',
                    $d['description'] ?? '',
                    ($d['owner_id'] ?? null) ?: null,
                    (int) ($d['sort_order'] ?? 0),
                    (int) ($d['build_progress'] ?? 0),
                    (int) ($d['build_time'] ?? 1),
                    $buildingId,
                    $townId
                ], $uid);
                respond(['ok' => true, 'id' => $buildingId]);
            } else {
                // Create new building
                $name = trim($d['name'] ?? '');
                if (!$name) throw new Exception('Building name is required.');
                $newId = insertAndGetId(
                    'INSERT INTO town_buildings (town_id, name, building_type, status, description, owner_id, sort_order, build_progress, build_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        $townId,
                        $name,
                        $d['building_type'] ?? 'other',
                        $d['status'] ?? 'completed',
                        $d['description'] ?? '',
                        ($d['owner_id'] ?? null) ?: null,
                        (int) ($d['sort_order'] ?? 0),
                        (int) ($d['build_progress'] ?? 0),
                        (int) ($d['build_time'] ?? 1)
                    ],
                    $uid
                );
                respond(['ok' => true, 'id' => $newId]);
            }
            break;

        case 'delete_building':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $townId = (int) ($input['town_id'] ?? 0);
            $buildingId = (int) ($input['building_id'] ?? 0);
            verifyTownOwnership($uid, $townId, $uid);
            // Unassign any characters from this building
            execute('UPDATE characters SET building_id = NULL WHERE building_id = ? AND town_id = ?', [$buildingId, $townId], $uid);
            // Rooms cascade-delete via FK
            execute('DELETE FROM town_buildings WHERE id = ? AND town_id = ?', [$buildingId, $townId], $uid);
            respond(['ok' => true]);
            break;

        case 'get_rooms':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $buildingId = (int) ($_GET['building_id'] ?? 0);
            // Verify ownership via building → town → user
            $bRow = query('SELECT tb.town_id FROM town_buildings tb JOIN towns t ON t.id = tb.town_id WHERE tb.id = ? AND t.user_id = ?', [$buildingId, $uid], $uid);
            if (!$bRow) throw new Exception('Building not found');
            $rooms = query('SELECT * FROM building_rooms WHERE building_id = ? ORDER BY sort_order, name', [$buildingId], $uid);
            respond(['ok' => true, 'rooms' => $rooms ?: []]);
            break;

        case 'save_room':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $buildingId = (int) ($input['building_id'] ?? 0);
            $bRow = query('SELECT tb.town_id FROM town_buildings tb JOIN towns t ON t.id = tb.town_id WHERE tb.id = ? AND t.user_id = ?', [$buildingId, $uid], $uid);
            if (!$bRow) throw new Exception('Building not found');
            $d = $input['room'] ?? [];
            $roomId = (int) ($d['id'] ?? 0);

            if ($roomId > 0) {
                execute('UPDATE building_rooms SET name=?, room_type=?, description=?, sort_order=? WHERE id=? AND building_id=?', [
                    trim($d['name'] ?? ''),
                    $d['room_type'] ?? 'common',
                    $d['description'] ?? '',
                    (int) ($d['sort_order'] ?? 0),
                    $roomId,
                    $buildingId
                ], $uid);
                respond(['ok' => true, 'id' => $roomId]);
            } else {
                $name = trim($d['name'] ?? '');
                if (!$name) throw new Exception('Room name is required.');
                $newId = insertAndGetId(
                    'INSERT INTO building_rooms (building_id, name, room_type, description, sort_order) VALUES (?, ?, ?, ?, ?)',
                    [$buildingId, $name, $d['room_type'] ?? 'common', $d['description'] ?? '', (int) ($d['sort_order'] ?? 0)],
                    $uid
                );
                respond(['ok' => true, 'id' => $newId]);
            }
            break;

        case 'delete_room':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $buildingId = (int) ($input['building_id'] ?? 0);
            $roomId = (int) ($input['room_id'] ?? 0);
            $bRow = query('SELECT tb.town_id FROM town_buildings tb JOIN towns t ON t.id = tb.town_id WHERE tb.id = ? AND t.user_id = ?', [$buildingId, $uid], $uid);
            if (!$bRow) throw new Exception('Building not found');
            execute('DELETE FROM building_rooms WHERE id = ? AND building_id = ?', [$roomId, $buildingId], $uid);
            respond(['ok' => true]);
            break;

        case 'assign_character_building':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $townId = (int) ($input['town_id'] ?? 0);
            $charId = (int) ($input['character_id'] ?? 0);
            $buildingId = ($input['building_id'] ?? null);
            verifyTownOwnership($uid, $townId, $uid);
            // Allow null to unassign
            execute('UPDATE characters SET building_id = ? WHERE id = ? AND town_id = ?',
                [$buildingId ?: null, $charId, $townId], $uid);
            respond(['ok' => true]);
            break;

        /* ── Character XP Log ─────────────────────────── */
        case 'get_xp_log':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $charId = (int) ($_GET['character_id'] ?? 0);
            if (!$charId) throw new Exception('Missing character_id');
            // Verify ownership through the character's town
            $charRow = query('SELECT town_id FROM characters WHERE id = ?', [$charId], $uid);
            if (!$charRow) throw new Exception('Character not found');
            verifyTownOwnership($uid, (int) $charRow[0]['town_id'], $uid);
            $logs = query(
                'SELECT xp_gained, reason, source, game_date, created_at FROM character_xp_log WHERE character_id = ? ORDER BY created_at DESC LIMIT 100',
                [$charId],
                $uid
            );
            respond(['ok' => true, 'xp_log' => $logs ?: []]);
            break;

        /* ── Add Combat XP Log Entry ──────────────────── */
        case 'add_combat_xp':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $data = json_decode(file_get_contents('php://input'), true);
            $charId = (int) ($data['character_id'] ?? 0);
            $townId = (int) ($data['town_id'] ?? 0);
            $xpGained = (int) ($data['xp_gained'] ?? 0);
            $reason = trim($data['reason'] ?? 'Combat XP');
            $source = trim($data['source'] ?? 'encounter');

            if (!$charId || !$townId || !$xpGained) throw new Exception('Missing required fields');

            // Verify ownership
            verifyTownOwnership($uid, $townId, $uid);

            execute(
                'INSERT INTO character_xp_log (character_id, town_id, xp_gained, reason, source, game_date) VALUES (?, ?, ?, ?, ?, NOW())',
                [$charId, $townId, $xpGained, $reason, $source],
                $uid
            );

            respond(['ok' => true]);
            break;

        /* ── Calendar (per-user) ────────────────────────── */
        case 'get_calendar':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;

            if ($campId) {
                $rows = query('SELECT * FROM calendar WHERE user_id = ? AND campaign_id = ?', [$uid, $campId], $uid);
            } else {
                $rows = query('SELECT * FROM calendar WHERE user_id = ? AND campaign_id IS NULL', [$uid], $uid);
            }
            $cal = $rows[0] ?? [
                'current_year' => 1490,
                'current_month' => 1,
                'current_day' => 1,
                'era_name' => 'DR',
                'months_per_year' => 12,
                'days_per_month' => '[30,30,30,30,30,30,30,30,30,30,30,30]',
                'month_names' => '["Hammer","Alturiak","Ches","Tarsakh","Mirtul","Kythorn","Flamerule","Eleasis","Eleint","Marpenoth","Uktar","Nightal"]'
            ];
            $cal['month_names'] = json_decode($cal['month_names'], true) ?? [];
            // days_per_month: decode JSON array, or expand legacy single int to array
            $dpmRaw = $cal['days_per_month'];
            $dpmDecoded = json_decode($dpmRaw, true);
            if (is_array($dpmDecoded)) {
                $cal['days_per_month'] = $dpmDecoded;
            } else {
                $dpmVal = (int) ($dpmRaw ?: 30);
                $mpy = (int) ($cal['months_per_year'] ?? 12);
                $cal['days_per_month'] = array_fill(0, $mpy, $dpmVal);
            }
            respond(['ok' => true, 'calendar' => $cal]);
            break;

        case 'save_calendar':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;

            $c = $input['calendar'] ?? [];
            $monthNames = $c['month_names'] ?? [];
            execute(
                'INSERT INTO calendar (user_id, campaign_id, current_year, current_month, current_day, era_name, months_per_year, month_names, days_per_month)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    current_year=VALUES(current_year), current_month=VALUES(current_month),
                    current_day=VALUES(current_day), era_name=VALUES(era_name),
                    months_per_year=VALUES(months_per_year), month_names=VALUES(month_names),
                    days_per_month=VALUES(days_per_month)',
                [
                    $uid,
                    $campId,
                    (int) ($c['current_year'] ?? 1490),
                    (int) ($c['current_month'] ?? 1),
                    (int) ($c['current_day'] ?? 1),
                    trim($c['era_name'] ?? 'DR'),
                    (int) ($c['months_per_year'] ?? 12),
                    json_encode(array_values($monthNames)),
                    is_array($c['days_per_month'] ?? null) ? json_encode(array_values($c['days_per_month'])) : (string)((int)($c['days_per_month'] ?? 30)),
                ],
                $uid
            );
            respond(['ok' => true]);
            break;

        /* ═══════════════════════════════════════════════════
           SRD REFERENCE — each edition has its own database
           Pass ?edition=5e to override, otherwise uses campaign/user setting
           ═══════════════════════════════════════════════════ */
        case 'srd_races':
        case 'srd_classes':
        case 'srd_skills':
        case 'srd_feats':
        case 'srd_equipment':
        case 'srd_spells':
        case 'srd_spell_detail':
        case 'srd_monsters':
        case 'srd_monster_detail':
        case 'srd_powers':
        case 'srd_power_detail':
        case 'srd_domains':
        case 'srd_items':
        case 'srd_item_detail':
        case 'srd_class_progression':
            // Resolve edition: URL param > active campaign > user setting > default
            $edition = $_GET['edition'] ?? '';
            if (!$edition) {
                try {
                    $user = requireAuth();
                    $uid = (int) $user['id'];
                    // Try active campaign first
                    $campRow = query('SELECT dnd_edition FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
                    if ($campRow) {
                        $edition = $campRow[0]['dnd_edition'] ?? '3.5e';
                    } else {
                        // Fallback to user setting
                        $erow = query('SELECT dnd_edition FROM users WHERE id = ?', [$uid], 0);
                        $edition = $erow[0]['dnd_edition'] ?? '3.5e';
                    }
                } catch (Exception $e) {
                    $edition = '3.5e';
                }
            }

            switch ($action) {
                case 'srd_races':
                    respond(['ok' => true, 'data' => srdQuery($edition, 'SELECT * FROM races ORDER BY name'), 'edition' => $edition]);
                    break;
                case 'srd_classes':
                    respond(['ok' => true, 'data' => srdQuery($edition, 'SELECT * FROM classes ORDER BY name'), 'edition' => $edition]);
                    break;
                case 'srd_skills':
                    respond(['ok' => true, 'data' => srdQuery($edition, 'SELECT * FROM skills ORDER BY name'), 'edition' => $edition]);
                    break;
                case 'srd_feats':
                    $search = $_GET['search'] ?? '';
                    $sql = 'SELECT * FROM feats';
                    $p = [];
                    if ($search) {
                        $sql .= ' WHERE name LIKE ?';
                        $p[] = "%$search%";
                    }
                    $sql .= ' ORDER BY name';
                    respond(['ok' => true, 'data' => srdQuery($edition, $sql, $p), 'edition' => $edition]);
                    break;
                case 'srd_equipment':
                    $category = $_GET['category'] ?? '';
                    $search = $_GET['search'] ?? '';
                    $sql = 'SELECT * FROM equipment';
                    $p = [];
                    $where = [];
                    if ($search) {
                        $where[] = 'name LIKE ?';
                        $p[] = "%$search%";
                    } elseif ($category) {
                        $where[] = 'category = ?';
                        $p[] = $category;
                    }
                    if ($where)
                        $sql .= ' WHERE ' . implode(' AND ', $where);
                    $sql .= ' ORDER BY category, name';
                    respond(['ok' => true, 'data' => srdQuery($edition, $sql, $p), 'edition' => $edition]);
                    break;
                case 'srd_spells':
                    $search = $_GET['search'] ?? '';
                    $school = $_GET['school'] ?? '';
                    $level = $_GET['level'] ?? '';
                    $sql = 'SELECT id, name, school, subschool, descriptor_text, level, components, casting_time, spell_range, duration, saving_throw, spell_resistance, short_description FROM spells';
                    $p = [];
                    $where = [];
                    if ($search) {
                        $where[] = 'name LIKE ?';
                        $p[] = "%$search%";
                    }
                    if ($school) {
                        $where[] = 'school = ?';
                        $p[] = $school;
                    }
                    if ($level) {
                        $where[] = 'level LIKE ?';
                        $p[] = "%$level%";
                    }
                    if ($where)
                        $sql .= ' WHERE ' . implode(' AND ', $where);
                    $sql .= ' ORDER BY name';
                    respond(['ok' => true, 'data' => srdQuery($edition, $sql, $p), 'edition' => $edition]);
                    break;
                case 'srd_spell_detail':
                    $id = (int) ($_GET['id'] ?? 0);
                    respond(['ok' => true, 'data' => (srdQuery($edition, 'SELECT * FROM spells WHERE id=?', [$id]))[0] ?? null]);
                    break;
                case 'srd_monsters':
                    $search = $_GET['search'] ?? '';
                    $type = $_GET['type'] ?? '';
                    $sql = 'SELECT id, family, name, size, type, descriptor_text, hit_dice, armor_class, challenge_rating, alignment, environment FROM monsters';
                    $p = [];
                    $where = [];
                    if ($search) {
                        $where[] = 'name LIKE ?';
                        $p[] = "%$search%";
                    }
                    if ($type) {
                        $where[] = 'type LIKE ?';
                        $p[] = "%$type%";
                    }
                    if ($where)
                        $sql .= ' WHERE ' . implode(' AND ', $where);
                    $sql .= ' ORDER BY name';
                    respond(['ok' => true, 'data' => srdQuery($edition, $sql, $p), 'edition' => $edition]);
                    break;
                case 'srd_monster_detail':
                    $id = (int) ($_GET['id'] ?? 0);
                    respond(['ok' => true, 'data' => (srdQuery($edition, 'SELECT * FROM monsters WHERE id=?', [$id]))[0] ?? null]);
                    break;
                case 'srd_powers':
                    $search = $_GET['search'] ?? '';
                    $discipline = $_GET['discipline'] ?? '';
                    $sql = 'SELECT id, name, discipline, subdiscipline, descriptor_text, level, power_points, short_description FROM powers';
                    $p = [];
                    $where = [];
                    if ($search) {
                        $where[] = 'name LIKE ?';
                        $p[] = "%$search%";
                    }
                    if ($discipline) {
                        $where[] = 'discipline = ?';
                        $p[] = $discipline;
                    }
                    if ($where)
                        $sql .= ' WHERE ' . implode(' AND ', $where);
                    $sql .= ' ORDER BY name';
                    respond(['ok' => true, 'data' => srdQuery($edition, $sql, $p), 'edition' => $edition]);
                    break;
                case 'srd_power_detail':
                    $id = (int) ($_GET['id'] ?? 0);
                    respond(['ok' => true, 'data' => (srdQuery($edition, 'SELECT * FROM powers WHERE id=?', [$id]))[0] ?? null]);
                    break;
                case 'srd_domains':
                    respond(['ok' => true, 'data' => srdQuery($edition, 'SELECT * FROM domains ORDER BY name'), 'edition' => $edition]);
                    break;
                case 'srd_items':
                    $search = $_GET['search'] ?? '';
                    $category = $_GET['category'] ?? '';
                    $sql = 'SELECT id, name, category, subcategory, aura, caster_level, price, weight FROM items';
                    $p = [];
                    $where = [];
                    if ($search) {
                        $where[] = 'name LIKE ?';
                        $p[] = "%$search%";
                    }
                    if ($category) {
                        $where[] = 'category = ?';
                        $p[] = $category;
                    }
                    if ($where)
                        $sql .= ' WHERE ' . implode(' AND ', $where);
                    $sql .= ' ORDER BY category, name';
                    respond(['ok' => true, 'data' => srdQuery($edition, $sql, $p), 'edition' => $edition]);
                    break;
                case 'srd_item_detail':
                    $id = (int) ($_GET['id'] ?? 0);
                    respond(['ok' => true, 'data' => (srdQuery($edition, 'SELECT * FROM items WHERE id=?', [$id]))[0] ?? null]);
                    break;
                case 'srd_class_progression':
                    $className = $_GET['class'] ?? '';
                    if (!$className) {
                        respond(['ok' => true, 'data' => []]);
                    } else {
                        respond(['ok' => true, 'data' => srdQuery($edition, 'SELECT * FROM class_progression WHERE name=? ORDER BY level', [$className]), 'edition' => $edition]);
                    }
                    break;
            }
            break;

        /* ── Campaign Rules & Description — per-campaign ────────────────────── */
        case 'get_campaign_rules':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;
            if ($campId) {
                $rows = query('SELECT rules_text, campaign_description, homebrew_settings, relationship_speed, birth_rate, death_threshold, child_growth, conflict_frequency, sell_rate FROM campaign_rules WHERE user_id = ? AND campaign_id = ? ORDER BY updated_at DESC LIMIT 1', [$uid, $campId], $uid);
                // Fallback: check for legacy rows with NULL campaign_id
                if (empty($rows)) {
                    $rows = query('SELECT rules_text, campaign_description, homebrew_settings, relationship_speed, birth_rate, death_threshold, child_growth, conflict_frequency, sell_rate FROM campaign_rules WHERE user_id = ? AND campaign_id IS NULL ORDER BY updated_at DESC LIMIT 1', [$uid], $uid);
                }
            } else {
                $rows = query('SELECT rules_text, campaign_description, homebrew_settings, relationship_speed, birth_rate, death_threshold, child_growth, conflict_frequency, sell_rate FROM campaign_rules WHERE user_id = ? AND campaign_id IS NULL ORDER BY updated_at DESC LIMIT 1', [$uid], $uid);
            }
            $r = $rows ? $rows[0] : [];
            respond([
                'ok' => true,
                'rules_text' => $r['rules_text'] ?? '',
                'campaign_description' => $r['campaign_description'] ?? '',
                'homebrew_settings' => $r ? json_decode($r['homebrew_settings'] ?? '{}', true) : new \stdClass(),
                'relationship_speed' => $r['relationship_speed'] ?? 'normal',
                'birth_rate' => $r['birth_rate'] ?? 'normal',
                'death_threshold' => $r['death_threshold'] ?? '50',
                'child_growth' => $r['child_growth'] ?? 'realistic',
                'conflict_frequency' => $r['conflict_frequency'] ?? 'occasional',
                'sell_rate' => $r['sell_rate'] ?? '50',
            ]);
            break;

        case 'save_campaign_rules':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;
            $text = trim($input['rules_text'] ?? '');
            $desc = trim($input['campaign_description'] ?? '');
            $homebrew = isset($input['homebrew_settings']) ? json_encode($input['homebrew_settings'], JSON_UNESCAPED_UNICODE) : '{}';
            $relSpeed = $input['relationship_speed'] ?? 'normal';
            $birthRate = $input['birth_rate'] ?? 'normal';
            $deathThreshold = $input['death_threshold'] ?? '50';
            $childGrowth = $input['child_growth'] ?? 'realistic';
            $conflictFreq = $input['conflict_frequency'] ?? 'occasional';
            $sellRate = $input['sell_rate'] ?? '50';

            // Upsert by (user_id, campaign_id) — must handle NULL campaign_id explicitly
            // Also handles legacy rows where campaign_id is NULL but should be updated
            if ($campId) {
                $existing = query('SELECT id FROM campaign_rules WHERE user_id = ? AND campaign_id = ?', [$uid, $campId], 0);
                // Fallback: check for legacy rows with NULL campaign_id
                if (empty($existing)) {
                    $existing = query('SELECT id FROM campaign_rules WHERE user_id = ? AND campaign_id IS NULL', [$uid], 0);
                    // If found, migrate: update the row AND set campaign_id
                    if ($existing) {
                        $primaryId = (int) $existing[0]['id'];
                        execute(
                            'UPDATE campaign_rules SET campaign_id = ?, rules_text = ?, campaign_description = ?, homebrew_settings = ?, relationship_speed = ?, birth_rate = ?, death_threshold = ?, child_growth = ?, conflict_frequency = ?, sell_rate = ?, updated_at = NOW() WHERE id = ?',
                            [$campId, $text, $desc, $homebrew, $relSpeed, $birthRate, $deathThreshold, $childGrowth, $conflictFreq, $sellRate, $primaryId],
                            $uid
                        );
                        // Clean up any duplicates
                        if (count($existing) > 1) {
                            $dupeIds = array_map(function ($r) { return (int) $r['id']; }, array_slice($existing, 1));
                            $placeholders = implode(',', array_fill(0, count($dupeIds), '?'));
                            execute("DELETE FROM campaign_rules WHERE id IN ($placeholders)", $dupeIds, $uid);
                        }
                        respond(['ok' => true]);
                        break;
                    }
                }
            } else {
                $existing = query('SELECT id FROM campaign_rules WHERE user_id = ? AND campaign_id IS NULL', [$uid], 0);
            }
            if ($existing) {
                // Update the first matching row
                $primaryId = (int) $existing[0]['id'];
                execute(
                    'UPDATE campaign_rules SET rules_text = ?, campaign_description = ?, homebrew_settings = ?, relationship_speed = ?, birth_rate = ?, death_threshold = ?, child_growth = ?, conflict_frequency = ?, sell_rate = ?, updated_at = NOW() WHERE id = ?',
                    [$text, $desc, $homebrew, $relSpeed, $birthRate, $deathThreshold, $childGrowth, $conflictFreq, $sellRate, $primaryId],
                    $uid
                );
                // Clean up any duplicate rows
                if (count($existing) > 1) {
                    $dupeIds = array_map(function ($r) { return (int) $r['id']; }, array_slice($existing, 1));
                    $placeholders = implode(',', array_fill(0, count($dupeIds), '?'));
                    execute("DELETE FROM campaign_rules WHERE id IN ($placeholders)", $dupeIds, $uid);
                }
            } else {
                // No row exists at all — insert fresh
                try {
                    execute(
                        'INSERT INTO campaign_rules (user_id, campaign_id, rules_text, campaign_description, homebrew_settings, relationship_speed, birth_rate, death_threshold, child_growth, conflict_frequency, sell_rate, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
                        [$uid, $campId, $text, $desc, $homebrew, $relSpeed, $birthRate, $deathThreshold, $childGrowth, $conflictFreq, $sellRate],
                        $uid
                    );
                } catch (Exception $insertErr) {
                    // If INSERT fails (old unique_user key), fall back to UPDATE any existing row for this user
                    execute(
                        'UPDATE campaign_rules SET campaign_id = ?, rules_text = ?, campaign_description = ?, homebrew_settings = ?, relationship_speed = ?, birth_rate = ?, death_threshold = ?, child_growth = ?, conflict_frequency = ?, sell_rate = ?, updated_at = NOW() WHERE user_id = ? LIMIT 1',
                        [$campId, $text, $desc, $homebrew, $relSpeed, $birthRate, $deathThreshold, $childGrowth, $conflictFreq, $sellRate, $uid],
                        $uid
                    );
                }
            }
            respond(['ok' => true]);
            break;

        /* ── Site Settings (per-user) — global user prefs only ── */
        case 'get_settings':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $rows = query(
                'SELECT dnd_edition, xp_speed, npc_xp_speed FROM users WHERE id = ?',
                [$uid],
                0
            );
            respond([
                'ok' => true,
                'settings' => [
                    'dnd_edition' => $rows[0]['dnd_edition'] ?? '3.5e',
                    'xp_speed' => $rows[0]['xp_speed'] ?? 'normal',
                    'npc_xp_speed' => $rows[0]['npc_xp_speed'] ?? 'normal',
                ]
            ]);
            break;

        case 'save_settings':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $settingKey = $input['key'] ?? '';
            $value = $input['value'] ?? '';
            $allowed = ['dnd_edition', 'xp_speed', 'npc_xp_speed'];
            if (!in_array($settingKey, $allowed))
                throw new Exception("Invalid setting: $settingKey");
            execute("UPDATE users SET {$settingKey} = ? WHERE id = ?", [$value, $uid], 0);
            respond(['ok' => true]);
            break;

        /* ═══════════════════════════════════════════════════
           ENCOUNTER SYSTEM
           ═══════════════════════════════════════════════════ */

        // ── Party (persistent) ─────────────────────────────
        case 'get_party':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $members = query(
                'SELECT pm.id as party_member_id, pm.character_id, pm.sort_order, c.*, t.name as town_name
                 FROM party_members pm
                 JOIN characters c ON c.id = pm.character_id
                 JOIN towns t ON t.id = c.town_id
                 WHERE pm.user_id = ?
                 ORDER BY pm.sort_order',
                [$uid],
                $uid
            );
            respond(['ok' => true, 'party' => $members]);
            break;

        case 'add_party_member':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $charId = (int) ($input['character_id'] ?? 0);
            if (!$charId)
                throw new Exception('character_id required');
            // Verify the character belongs to user
            $char = query('SELECT c.id FROM characters c JOIN towns t ON t.id = c.town_id WHERE c.id = ? AND t.user_id = ?', [$charId, $uid], $uid);
            if (!$char)
                throw new Exception('Character not found or access denied');
            $maxOrder = query('SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM party_members WHERE user_id = ?', [$uid], $uid);
            $nextOrder = (int) ($maxOrder[0]['next_order'] ?? 1);
            execute(
                'INSERT IGNORE INTO party_members (user_id, character_id, sort_order) VALUES (?, ?, ?)',
                [$uid, $charId, $nextOrder],
                $uid
            );
            respond(['ok' => true]);
            break;

        case 'remove_party_member':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $charId = (int) ($input['character_id'] ?? 0);
            execute('DELETE FROM party_members WHERE user_id = ? AND character_id = ?', [$uid, $charId], $uid);
            respond(['ok' => true]);
            break;

        // ── Encounters ─────────────────────────────────────
        case 'get_encounters':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $encounters = query(
                'SELECT e.*, (SELECT COUNT(*) FROM encounter_participants ep WHERE ep.encounter_id = e.id) as participant_count
                 FROM encounters e WHERE e.user_id = ? ORDER BY e.updated_at DESC',
                [$uid],
                $uid
            );
            respond(['ok' => true, 'encounters' => $encounters]);
            break;

        case 'create_encounter':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $name = trim($input['name'] ?? '');
            if (!$name)
                throw new Exception('Encounter name required');
            $desc = trim($input['description'] ?? '');
            $id = insertAndGetId(
                'INSERT INTO encounters (user_id, name, description) VALUES (?, ?, ?)',
                [$uid, $name, $desc],
                $uid
            );
            respond(['ok' => true, 'id' => $id]);
            break;

        case 'get_encounter':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $encId = (int) ($_GET['id'] ?? 0);
            $enc = query('SELECT * FROM encounters WHERE id = ? AND user_id = ?', [$encId, $uid], $uid);
            if (!$enc)
                throw new Exception('Encounter not found');
            $encounter = $enc[0];
            // Load groups
            $encounter['groups'] = query(
                'SELECT * FROM encounter_groups WHERE encounter_id = ? ORDER BY sort_order',
                [$encId],
                $uid
            );
            // Load participants with character data
            $encounter['participants'] = query(
                'SELECT ep.*, c.name, c.race, c.class, c.level, c.xp, c.cr, c.town_id,
                        c.hp as base_hp, c.ac as base_ac,
                        c.str, c.dex, c.con, c.int_, c.wis, c.cha, c.gear, c.feats, c.atk,
                        c.alignment, c.status as char_status, t.name as town_name
                 FROM encounter_participants ep
                 JOIN characters c ON c.id = ep.character_id
                 JOIN towns t ON t.id = c.town_id
                 WHERE ep.encounter_id = ?
                 ORDER BY ep.initiative DESC, ep.initiative_mod DESC',
                [$encId],
                $uid
            );
            respond(['ok' => true, 'encounter' => $encounter]);
            break;

        case 'delete_encounter':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $encId = (int) ($input['encounter_id'] ?? 0);
            execute('DELETE FROM encounters WHERE id = ? AND user_id = ?', [$encId, $uid], $uid);
            respond(['ok' => true]);
            break;

        case 'update_encounter':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $encId = (int) ($input['encounter_id'] ?? 0);
            $enc = query('SELECT id FROM encounters WHERE id = ? AND user_id = ?', [$encId, $uid], $uid);
            if (!$enc)
                throw new Exception('Encounter not found');
            $sets = [];
            $vals = [];
            foreach (['name', 'description', 'status', 'current_round', 'current_turn'] as $f) {
                if (array_key_exists($f, $input)) {
                    $sets[] = "$f = ?";
                    $vals[] = $input[$f];
                }
            }
            if (!empty($sets)) {
                $sets[] = "updated_at = NOW()";
                $vals[] = $encId;
                execute('UPDATE encounters SET ' . implode(', ', $sets) . ' WHERE id = ?', $vals, $uid);
            }
            respond(['ok' => true]);
            break;

        // ── Encounter Groups ───────────────────────────────
        case 'create_encounter_group':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $encId = (int) ($input['encounter_id'] ?? 0);
            $enc = query('SELECT id FROM encounters WHERE id = ? AND user_id = ?', [$encId, $uid], $uid);
            if (!$enc)
                throw new Exception('Encounter not found');
            $name = trim($input['name'] ?? 'New Group');
            $maxOrder = query('SELECT COALESCE(MAX(sort_order), 0) + 1 as n FROM encounter_groups WHERE encounter_id = ?', [$encId], $uid);
            $id = insertAndGetId(
                'INSERT INTO encounter_groups (encounter_id, name, sort_order) VALUES (?, ?, ?)',
                [$encId, $name, (int) ($maxOrder[0]['n'] ?? 1)],
                $uid
            );
            respond(['ok' => true, 'id' => $id]);
            break;

        case 'rename_encounter_group':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $groupId = (int) ($input['group_id'] ?? 0);
            $name = trim($input['name'] ?? '');
            if (!$name)
                throw new Exception('Group name required');
            execute(
                'UPDATE encounter_groups eg JOIN encounters e ON e.id = eg.encounter_id SET eg.name = ? WHERE eg.id = ? AND e.user_id = ?',
                [$name, $groupId, $uid],
                $uid
            );
            respond(['ok' => true]);
            break;

        case 'delete_encounter_group':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $groupId = (int) ($input['group_id'] ?? 0);
            // Unset group_id on participants before deleting
            execute(
                'UPDATE encounter_participants ep JOIN encounter_groups eg ON eg.id = ep.group_id JOIN encounters e ON e.id = eg.encounter_id SET ep.group_id = NULL WHERE eg.id = ? AND e.user_id = ?',
                [$groupId, $uid],
                $uid
            );
            execute(
                'DELETE eg FROM encounter_groups eg JOIN encounters e ON e.id = eg.encounter_id WHERE eg.id = ? AND e.user_id = ?',
                [$groupId, $uid],
                $uid
            );
            respond(['ok' => true]);
            break;

        // ── Encounter Participants ─────────────────────────
        case 'add_participant':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $encId = (int) ($input['encounter_id'] ?? 0);
            $charId = (int) ($input['character_id'] ?? 0);
            $side = $input['side'] ?? 'enemy';
            $groupId = isset($input['group_id']) ? (int) $input['group_id'] : null;
            // Verify encounter ownership
            $enc = query('SELECT id FROM encounters WHERE id = ? AND user_id = ?', [$encId, $uid], $uid);
            if (!$enc)
                throw new Exception('Encounter not found');
            // Get character HP for snapshot
            $char = query('SELECT hp, dex FROM characters c JOIN towns t ON t.id = c.town_id WHERE c.id = ? AND t.user_id = ?', [$charId, $uid], $uid);
            if (!$char)
                throw new Exception('Character not found');
            $hp = (int) ($char[0]['hp'] ?? 1);
            $dexMod = floor(((int) ($char[0]['dex'] ?? 10) - 10) / 2);
            $id = insertAndGetId(
                'INSERT INTO encounter_participants (encounter_id, character_id, group_id, side, current_hp, max_hp, initiative_mod) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [$encId, $charId, $groupId, $side, $hp, $hp, $dexMod],
                $uid
            );
            respond(['ok' => true, 'id' => $id]);
            break;

        case 'remove_participant':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $partId = (int) ($input['participant_id'] ?? 0);
            execute(
                'DELETE ep FROM encounter_participants ep JOIN encounters e ON e.id = ep.encounter_id WHERE ep.id = ? AND e.user_id = ?',
                [$partId, $uid],
                $uid
            );
            respond(['ok' => true]);
            break;

        case 'update_participant':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $partId = (int) ($input['participant_id'] ?? 0);
            // Verify ownership
            $check = query(
                'SELECT ep.id FROM encounter_participants ep JOIN encounters e ON e.id = ep.encounter_id WHERE ep.id = ? AND e.user_id = ?',
                [$partId, $uid],
                $uid
            );
            if (!$check)
                throw new Exception('Participant not found');
            $sets = [];
            $vals = [];
            foreach (['group_id', 'side', 'initiative', 'initiative_mod', 'current_hp', 'max_hp', 'temp_hp', 'is_active', 'notes'] as $f) {
                if (array_key_exists($f, $input)) {
                    $sets[] = "$f = ?";
                    $vals[] = $input[$f];
                }
            }
            if (array_key_exists('conditions', $input)) {
                $sets[] = "conditions = ?";
                $vals[] = json_encode($input['conditions']);
            }
            if (!empty($sets)) {
                $vals[] = $partId;
                execute('UPDATE encounter_participants SET ' . implode(', ', $sets) . ' WHERE id = ?', $vals, $uid);
            }
            respond(['ok' => true]);
            break;

        /* ═══════════════════════════════════════════════════
           SOCIAL SYSTEMS
           ═══════════════════════════════════════════════════ */

        // ── Bulk fetch all social data for a town ─────────
        case 'get_social_data':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $townId = (int) ($_GET['town_id'] ?? 0);
            verifyTownOwnership($uid, $townId, $uid);

            // Character IDs in this town
            $charIds = array_column(query('SELECT id FROM characters WHERE town_id = ?', [$townId], $uid), 'id');
            $placeholders = !empty($charIds) ? implode(',', array_fill(0, count($charIds), '?')) : '0';

            // Relationships (for chars in this town)
            $relationships = !empty($charIds) ? query(
                "SELECT cr.*, c1.name as char1_name, c2.name as char2_name
                 FROM character_relationships cr
                 JOIN characters c1 ON c1.id = cr.char1_id
                 JOIN characters c2 ON c2.id = cr.char2_id
                 WHERE cr.char1_id IN ($placeholders) OR cr.char2_id IN ($placeholders)
                 ORDER BY cr.updated_at DESC",
                array_merge($charIds, $charIds),
                $uid
            ) : [];

            // Factions
            $factions = query('SELECT * FROM factions WHERE town_id = ? ORDER BY name', [$townId], $uid);
            foreach ($factions as &$f) {
                $f['members'] = query(
                    'SELECT fm.*, c.name as character_name FROM faction_members fm JOIN characters c ON c.id = fm.character_id WHERE fm.faction_id = ? ORDER BY fm.role DESC, c.name',
                    [(int) $f['id']],
                    $uid
                );
                $f['relations'] = query(
                    'SELECT fr.*, f2.name as target_name FROM faction_relations fr JOIN factions f2 ON f2.id = fr.target_faction_id WHERE fr.faction_id = ?',
                    [(int) $f['id']],
                    $uid
                );
            }

            // Incidents
            $incidents = query('SELECT * FROM town_incidents WHERE town_id = ? ORDER BY created_at DESC', [$townId], $uid);
            foreach ($incidents as &$inc) {
                $inc['participants'] = query(
                    'SELECT ip.*, c.name as character_name FROM incident_participants ip JOIN characters c ON c.id = ip.character_id WHERE ip.incident_id = ?',
                    [(int) $inc['id']],
                    $uid
                );
                $inc['clues'] = query(
                    'SELECT * FROM incident_clues WHERE incident_id = ? ORDER BY id',
                    [(int) $inc['id']],
                    $uid
                );
            }

            // PC Reputation
            $reputation = query('SELECT * FROM pc_reputation WHERE town_id = ? ORDER BY pc_name', [$townId], $uid);

            respond([
                'ok' => true,
                'relationships' => $relationships,
                'factions' => $factions,
                'incidents' => $incidents,
                'reputation' => $reputation
            ]);
            break;

        // ── Character Relationships ────────────────────────
        case 'save_relationship':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $relId = (int) ($input['id'] ?? 0);
            $char1 = (int) ($input['char1_id'] ?? 0);
            $char2 = (int) ($input['char2_id'] ?? 0);
            $relType = trim($input['rel_type'] ?? 'acquaintance');
            $disposition = max(-10, min(10, (int) ($input['disposition'] ?? 0)));
            $publicRel = (int) ($input['public_rel'] ?? 1);
            $reason = trim($input['reason'] ?? '');
            $startedDate = trim($input['started_date'] ?? '');

            if (!$char1 || !$char2)
                throw new Exception('Both character IDs required.');
            if ($char1 === $char2)
                throw new Exception('Cannot create relationship with self.');

            if ($relId > 0) {
                execute(
                    'UPDATE character_relationships SET rel_type=?, disposition=?, public_rel=?, reason=?, started_date=? WHERE id=?',
                    [$relType, $disposition, $publicRel, $reason, $startedDate, $relId],
                    $uid
                );
                respond(['ok' => true, 'id' => $relId]);
            } else {
                $newId = insertAndGetId(
                    'INSERT INTO character_relationships (char1_id, char2_id, rel_type, disposition, public_rel, reason, started_date) VALUES (?,?,?,?,?,?,?)
                     ON DUPLICATE KEY UPDATE rel_type=VALUES(rel_type), disposition=VALUES(disposition), reason=VALUES(reason)',
                    [$char1, $char2, $relType, $disposition, $publicRel, $reason, $startedDate],
                    $uid
                );
                respond(['ok' => true, 'id' => $newId]);
            }
            break;

        case 'delete_relationship':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $relId = (int) ($input['id'] ?? 0);
            if (!$relId)
                throw new Exception('Relationship ID required.');
            execute('DELETE FROM character_relationships WHERE id = ?', [$relId], $uid);
            respond(['ok' => true]);
            break;

        // ── Family Tree ───────────────────────────────────────
        case 'get_family_tree':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $charId = (int) ($_GET['character_id'] ?? 0);
            if (!$charId)
                throw new Exception('character_id required.');

            // Verify character ownership
            $charCheck = query(
                'SELECT c.id FROM characters c JOIN towns t ON t.id = c.town_id WHERE c.id = ? AND t.user_id = ?',
                [$charId, $uid], $uid
            );
            if (!$charCheck)
                throw new Exception('Character not found or access denied.');

            // Get ALL family-type relationships for this user's characters (cross-town)
            $allUserCharIds = array_column(
                query('SELECT c.id FROM characters c JOIN towns t ON t.id = c.town_id WHERE t.user_id = ?', [$uid], $uid),
                'id'
            );
            if (empty($allUserCharIds)) {
                respond(['ok' => true, 'links' => [], 'members' => []]);
                break;
            }

            $ph = implode(',', array_fill(0, count($allUserCharIds), '?'));
            $familyRels = query(
                "SELECT cr.id, cr.char1_id, cr.char2_id, cr.rel_type, cr.reason, cr.disposition
                 FROM character_relationships cr
                 WHERE cr.rel_type = 'family'
                   AND (cr.char1_id IN ($ph) OR cr.char2_id IN ($ph))",
                array_merge($allUserCharIds, $allUserCharIds),
                $uid
            );

            // Collect unique character IDs from family links
            $memberIds = [$charId];
            foreach ($familyRels as $rel) {
                $memberIds[] = (int) $rel['char1_id'];
                $memberIds[] = (int) $rel['char2_id'];
            }
            $memberIds = array_values(array_unique($memberIds));
            $mph = implode(',', array_fill(0, count($memberIds), '?'));

            // Fetch character data for all family members
            $members = query(
                "SELECT c.id, c.name, c.race, c.class, c.level, c.gender, c.age,
                        c.status, c.portrait_url, c.alignment, c.role, c.title, c.town_id,
                        t.name as town_name
                 FROM characters c
                 JOIN towns t ON t.id = c.town_id
                 WHERE c.id IN ($mph)",
                $memberIds,
                $uid
            );

            // Build links array (using reason field for family_role)
            $links = [];
            foreach ($familyRels as $rel) {
                $links[] = [
                    'id' => (int) $rel['id'],
                    'char1_id' => (int) $rel['char1_id'],
                    'char2_id' => (int) $rel['char2_id'],
                    'family_role' => $rel['reason'] ?: 'family',
                ];
            }

            respond([
                'ok' => true,
                'root_id' => $charId,
                'links' => $links,
                'members' => $members,
            ]);
            break;

        case 'save_family_link':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $char1 = (int) ($input['char1_id'] ?? 0);
            $char2 = (int) ($input['char2_id'] ?? 0);
            $familyRole = trim($input['family_role'] ?? 'parent');

            if (!$char1 || !$char2)
                throw new Exception('Both character IDs required.');
            if ($char1 === $char2)
                throw new Exception('Cannot create family link with self.');

            $allowed = ['parent', 'sibling', 'spouse'];
            if (!in_array($familyRole, $allowed))
                throw new Exception('Invalid family_role. Use: parent, sibling, or spouse.');

            // Verify both characters belong to user
            $check = query(
                'SELECT c.id FROM characters c JOIN towns t ON t.id = c.town_id WHERE c.id IN (?,?) AND t.user_id = ?',
                [$char1, $char2, $uid], $uid
            );
            if (count($check) < 2)
                throw new Exception('One or both characters not found or access denied.');

            $newId = insertAndGetId(
                'INSERT INTO character_relationships (char1_id, char2_id, rel_type, disposition, public_rel, reason)
                 VALUES (?,?,?,?,?,?)
                 ON DUPLICATE KEY UPDATE reason=VALUES(reason), disposition=VALUES(disposition)',
                [$char1, $char2, 'family', 10, 1, $familyRole],
                $uid
            );
            respond(['ok' => true, 'id' => $newId]);
            break;

        case 'delete_family_link':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $relId = (int) ($input['id'] ?? 0);
            if (!$relId)
                throw new Exception('Link ID required.');
            execute('DELETE FROM character_relationships WHERE id = ? AND rel_type = ?', [$relId, 'family'], $uid);
            respond(['ok' => true]);
            break;

        // ── Character Memories ─────────────────────────────
        case 'get_memories':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $charId = (int) ($_GET['character_id'] ?? 0);
            $memories = query(
                'SELECT cm.*, c2.name as related_char_name FROM character_memories cm LEFT JOIN characters c2 ON c2.id = cm.related_char_id WHERE cm.character_id = ? ORDER BY cm.importance DESC, cm.created_at DESC',
                [$charId],
                $uid
            );
            respond(['ok' => true, 'memories' => $memories]);
            break;

        case 'save_memory':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $memId = (int) ($input['id'] ?? 0);
            $charId = (int) ($input['character_id'] ?? 0);
            if (!$charId)
                throw new Exception('Character ID required.');

            if ($memId > 0) {
                execute(
                    'UPDATE character_memories SET memory_type=?, content=?, sentiment=?, related_char_id=?, related_pc=?, faction_id=?, importance=?, game_date=? WHERE id=? AND character_id=?',
                    [
                        $input['memory_type'] ?? 'event',
                        $input['content'] ?? '',
                        max(-5, min(5, (int) ($input['sentiment'] ?? 0))),
                        ($input['related_char_id'] ?? null) ?: null,
                        $input['related_pc'] ?? null,
                        ($input['faction_id'] ?? null) ?: null,
                        max(1, min(10, (int) ($input['importance'] ?? 5))),
                        $input['game_date'] ?? '',
                        $memId,
                        $charId
                    ],
                    $uid
                );
                respond(['ok' => true, 'id' => $memId]);
            } else {
                $newId = insertAndGetId(
                    'INSERT INTO character_memories (character_id, memory_type, content, sentiment, related_char_id, related_pc, faction_id, importance, game_date) VALUES (?,?,?,?,?,?,?,?,?)',
                    [
                        $charId,
                        $input['memory_type'] ?? 'event',
                        $input['content'] ?? '',
                        max(-5, min(5, (int) ($input['sentiment'] ?? 0))),
                        ($input['related_char_id'] ?? null) ?: null,
                        $input['related_pc'] ?? null,
                        ($input['faction_id'] ?? null) ?: null,
                        max(1, min(10, (int) ($input['importance'] ?? 5))),
                        $input['game_date'] ?? ''
                    ],
                    $uid
                );
                respond(['ok' => true, 'id' => $newId]);
            }
            break;

        case 'delete_memory':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $memId = (int) ($input['id'] ?? 0);
            if (!$memId)
                throw new Exception('Memory ID required.');
            execute('DELETE FROM character_memories WHERE id = ?', [$memId], $uid);
            respond(['ok' => true]);
            break;

        // ── Factions ──────────────────────────────────────
        case 'get_factions':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $townId = (int) ($_GET['town_id'] ?? 0);
            verifyTownOwnership($uid, $townId, $uid);
            $factions = query('SELECT f.*, c.name as leader_name FROM factions f LEFT JOIN characters c ON c.id = f.leader_id WHERE f.town_id = ? ORDER BY f.name', [$townId], $uid);
            foreach ($factions as &$f) {
                $f['members'] = query(
                    'SELECT fm.*, c.name as character_name FROM faction_members fm JOIN characters c ON c.id = fm.character_id WHERE fm.faction_id = ? ORDER BY fm.role DESC, c.name',
                    [(int) $f['id']],
                    $uid
                );
                $f['member_count'] = count($f['members']);
            }
            respond(['ok' => true, 'factions' => $factions]);
            break;

        case 'save_faction':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $factionId = (int) ($input['id'] ?? 0);
            $townId = (int) ($input['town_id'] ?? 0);
            if (!$townId)
                throw new Exception('Town ID required.');
            verifyTownOwnership($uid, $townId, $uid);

            if ($factionId > 0) {
                execute(
                    'UPDATE factions SET name=?, alignment=?, disposition=?, faction_type=?, description=?, leader_id=?, influence=?, public_goal=?, secret_goal=?, status=?, notes=? WHERE id=? AND town_id=?',
                    [
                        trim($input['name'] ?? ''),
                        $input['alignment'] ?? '',
                        $input['disposition'] ?? 'neutral',
                        $input['faction_type'] ?? 'social',
                        $input['description'] ?? '',
                        ($input['leader_id'] ?? null) ?: null,
                        max(1, min(10, (int) ($input['influence'] ?? 3))),
                        $input['public_goal'] ?? '',
                        $input['secret_goal'] ?? '',
                        $input['status'] ?? 'active',
                        $input['notes'] ?? '',
                        $factionId,
                        $townId
                    ],
                    $uid
                );
                respond(['ok' => true, 'id' => $factionId]);
            } else {
                $name = trim($input['name'] ?? '');
                if (!$name)
                    throw new Exception('Faction name required.');
                $newId = insertAndGetId(
                    'INSERT INTO factions (town_id, name, alignment, disposition, faction_type, description, leader_id, influence, public_goal, secret_goal, status, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
                    [
                        $townId,
                        $name,
                        $input['alignment'] ?? '',
                        $input['disposition'] ?? 'neutral',
                        $input['faction_type'] ?? 'social',
                        $input['description'] ?? '',
                        ($input['leader_id'] ?? null) ?: null,
                        max(1, min(10, (int) ($input['influence'] ?? 3))),
                        $input['public_goal'] ?? '',
                        $input['secret_goal'] ?? '',
                        $input['status'] ?? 'active',
                        $input['notes'] ?? ''
                    ],
                    $uid
                );
                respond(['ok' => true, 'id' => $newId]);
            }
            break;

        case 'delete_faction':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $factionId = (int) ($input['id'] ?? 0);
            if (!$factionId)
                throw new Exception('Faction ID required.');
            execute('DELETE FROM faction_members WHERE faction_id = ?', [$factionId], $uid);
            execute('DELETE FROM faction_relations WHERE faction_id = ? OR target_faction_id = ?', [$factionId, $factionId], $uid);
            execute('DELETE FROM factions WHERE id = ?', [$factionId], $uid);
            respond(['ok' => true]);
            break;

        case 'save_faction_member':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $factionId = (int) ($input['faction_id'] ?? 0);
            $charId = (int) ($input['character_id'] ?? 0);
            if (!$factionId || !$charId)
                throw new Exception('Faction ID and character ID required.');
            execute(
                'INSERT INTO faction_members (faction_id, character_id, role, loyalty, joined_date) VALUES (?,?,?,?,?)
                 ON DUPLICATE KEY UPDATE role=VALUES(role), loyalty=VALUES(loyalty)',
                [
                    $factionId,
                    $charId,
                    $input['role'] ?? 'member',
                    max(1, min(10, (int) ($input['loyalty'] ?? 5))),
                    $input['joined_date'] ?? ''
                ],
                $uid
            );
            respond(['ok' => true]);
            break;

        case 'delete_faction_member':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $factionId = (int) ($input['faction_id'] ?? 0);
            $charId = (int) ($input['character_id'] ?? 0);
            if (!$factionId || !$charId)
                throw new Exception('Faction ID and character ID required.');
            execute('DELETE FROM faction_members WHERE faction_id = ? AND character_id = ?', [$factionId, $charId], $uid);
            respond(['ok' => true]);
            break;

        case 'save_faction_relation':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $factionId = (int) ($input['faction_id'] ?? 0);
            $targetId = (int) ($input['target_faction_id'] ?? 0);
            if (!$factionId || !$targetId)
                throw new Exception('Both faction IDs required.');
            if ($factionId === $targetId)
                throw new Exception('Cannot create relation with self.');
            execute(
                'INSERT INTO faction_relations (faction_id, target_faction_id, relation_type, disposition) VALUES (?,?,?,?)
                 ON DUPLICATE KEY UPDATE relation_type=VALUES(relation_type), disposition=VALUES(disposition)',
                [
                    $factionId,
                    $targetId,
                    $input['relation_type'] ?? 'neutral',
                    max(-10, min(10, (int) ($input['disposition'] ?? 0)))
                ],
                $uid
            );
            respond(['ok' => true]);
            break;

        case 'delete_faction_relation':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $factionId = (int) ($input['faction_id'] ?? 0);
            $targetId = (int) ($input['target_faction_id'] ?? 0);
            if (!$factionId || !$targetId)
                throw new Exception('Both faction IDs required.');
            execute('DELETE FROM faction_relations WHERE faction_id = ? AND target_faction_id = ?', [$factionId, $targetId], $uid);
            respond(['ok' => true]);
            break;

        // ── Town Incidents ────────────────────────────────
        case 'get_incidents':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $townId = (int) ($_GET['town_id'] ?? 0);
            verifyTownOwnership($uid, $townId, $uid);
            $incidents = query('SELECT * FROM town_incidents WHERE town_id = ? ORDER BY created_at DESC', [$townId], $uid);
            foreach ($incidents as &$inc) {
                $inc['participants'] = query(
                    'SELECT ip.*, c.name as character_name FROM incident_participants ip JOIN characters c ON c.id = ip.character_id WHERE ip.incident_id = ?',
                    [(int) $inc['id']],
                    $uid
                );
                $inc['clues'] = query('SELECT * FROM incident_clues WHERE incident_id = ? ORDER BY id', [(int) $inc['id']], $uid);
            }
            respond(['ok' => true, 'incidents' => $incidents]);
            break;

        case 'save_incident':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $incId = (int) ($input['id'] ?? 0);
            $townId = (int) ($input['town_id'] ?? 0);
            if (!$townId)
                throw new Exception('Town ID required.');
            verifyTownOwnership($uid, $townId, $uid);

            if ($incId > 0) {
                execute(
                    'UPDATE town_incidents SET incident_type=?, status=?, severity=?, summary=?, motive=?, evidence_found=?, game_date=?, discovered_date=?, solved_date=?, dm_notes=? WHERE id=? AND town_id=?',
                    [
                        $input['incident_type'] ?? 'general',
                        $input['status'] ?? 'active',
                        max(1, min(10, (int) ($input['severity'] ?? 3))),
                        $input['summary'] ?? '',
                        $input['motive'] ?? '',
                        $input['evidence_found'] ?? '',
                        $input['game_date'] ?? '',
                        $input['discovered_date'] ?? '',
                        $input['solved_date'] ?? '',
                        $input['dm_notes'] ?? '',
                        $incId,
                        $townId
                    ],
                    $uid
                );
                respond(['ok' => true, 'id' => $incId]);
            } else {
                $newId = insertAndGetId(
                    'INSERT INTO town_incidents (town_id, incident_type, status, severity, summary, motive, evidence_found, game_date, discovered_date, dm_notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
                    [
                        $townId,
                        $input['incident_type'] ?? 'general',
                        $input['status'] ?? 'active',
                        max(1, min(10, (int) ($input['severity'] ?? 3))),
                        $input['summary'] ?? '',
                        $input['motive'] ?? '',
                        $input['evidence_found'] ?? '',
                        $input['game_date'] ?? '',
                        $input['discovered_date'] ?? '',
                        $input['dm_notes'] ?? ''
                    ],
                    $uid
                );
                respond(['ok' => true, 'id' => $newId]);
            }
            break;

        case 'delete_incident':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $incId = (int) ($input['id'] ?? 0);
            if (!$incId)
                throw new Exception('Incident ID required.');
            execute('DELETE FROM incident_clues WHERE incident_id = ?', [$incId], $uid);
            execute('DELETE FROM incident_participants WHERE incident_id = ?', [$incId], $uid);
            execute('DELETE FROM town_incidents WHERE id = ?', [$incId], $uid);
            respond(['ok' => true]);
            break;

        case 'save_incident_participant':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $incId = (int) ($input['incident_id'] ?? 0);
            $charId = (int) ($input['character_id'] ?? 0);
            if (!$incId || !$charId)
                throw new Exception('Incident and character IDs required.');
            execute(
                'INSERT INTO incident_participants (incident_id, character_id, role, knows_truth, alibi) VALUES (?,?,?,?,?)
                 ON DUPLICATE KEY UPDATE role=VALUES(role), knows_truth=VALUES(knows_truth), alibi=VALUES(alibi)',
                [
                    $incId,
                    $charId,
                    $input['role'] ?? 'witness',
                    (int) ($input['knows_truth'] ?? 0),
                    $input['alibi'] ?? ''
                ],
                $uid
            );
            respond(['ok' => true]);
            break;

        case 'delete_incident_participant':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $incId = (int) ($input['incident_id'] ?? 0);
            $charId = (int) ($input['character_id'] ?? 0);
            execute('DELETE FROM incident_participants WHERE incident_id = ? AND character_id = ?', [$incId, $charId], $uid);
            respond(['ok' => true]);
            break;

        case 'save_clue':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $clueId = (int) ($input['id'] ?? 0);
            $incId = (int) ($input['incident_id'] ?? 0);
            if (!$incId)
                throw new Exception('Incident ID required.');

            if ($clueId > 0) {
                execute(
                    'UPDATE incident_clues SET clue_text=?, location=?, points_to=?, found=?, skill_check=?, red_herring=? WHERE id=?',
                    [
                        $input['clue_text'] ?? '',
                        $input['location'] ?? '',
                        ($input['points_to'] ?? null) ?: null,
                        (int) ($input['found'] ?? 0),
                        $input['skill_check'] ?? '',
                        (int) ($input['red_herring'] ?? 0),
                        $clueId
                    ],
                    $uid
                );
                respond(['ok' => true, 'id' => $clueId]);
            } else {
                $newId = insertAndGetId(
                    'INSERT INTO incident_clues (incident_id, clue_text, location, points_to, found, skill_check, red_herring) VALUES (?,?,?,?,?,?,?)',
                    [
                        $incId,
                        $input['clue_text'] ?? '',
                        $input['location'] ?? '',
                        ($input['points_to'] ?? null) ?: null,
                        (int) ($input['found'] ?? 0),
                        $input['skill_check'] ?? '',
                        (int) ($input['red_herring'] ?? 0)
                    ],
                    $uid
                );
                respond(['ok' => true, 'id' => $newId]);
            }
            break;

        case 'delete_clue':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $clueId = (int) ($input['id'] ?? 0);
            if (!$clueId)
                throw new Exception('Clue ID required.');
            execute('DELETE FROM incident_clues WHERE id = ?', [$clueId], $uid);
            respond(['ok' => true]);
            break;

        // ── PC Reputation ─────────────────────────────────
        case 'get_reputation':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $townId = (int) ($_GET['town_id'] ?? 0);
            verifyTownOwnership($uid, $townId, $uid);
            $rep = query(
                'SELECT pr.*, c.name as character_name, f.name as faction_name FROM pc_reputation pr LEFT JOIN characters c ON c.id = pr.character_id LEFT JOIN factions f ON f.id = pr.faction_id WHERE pr.town_id = ? ORDER BY pr.pc_name',
                [$townId],
                $uid
            );
            respond(['ok' => true, 'reputation' => $rep]);
            break;

        case 'save_reputation':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $repId = (int) ($input['id'] ?? 0);
            $townId = (int) ($input['town_id'] ?? 0);
            if (!$townId)
                throw new Exception('Town ID required.');
            verifyTownOwnership($uid, $townId, $uid);

            if ($repId > 0) {
                execute(
                    'UPDATE pc_reputation SET pc_name=?, character_id=?, faction_id=?, disposition=?, reason=?, last_interaction=? WHERE id=?',
                    [
                        $input['pc_name'] ?? '',
                        ($input['character_id'] ?? null) ?: null,
                        ($input['faction_id'] ?? null) ?: null,
                        max(-10, min(10, (int) ($input['disposition'] ?? 0))),
                        $input['reason'] ?? '',
                        $input['last_interaction'] ?? '',
                        $repId
                    ],
                    $uid
                );
            } else {
                $repId = insertAndGetId(
                    'INSERT INTO pc_reputation (town_id, pc_name, character_id, faction_id, disposition, reason, last_interaction) VALUES (?,?,?,?,?,?,?)',
                    [
                        $townId,
                        $input['pc_name'] ?? '',
                        ($input['character_id'] ?? null) ?: null,
                        ($input['faction_id'] ?? null) ?: null,
                        max(-10, min(10, (int) ($input['disposition'] ?? 0))),
                        $input['reason'] ?? '',
                        $input['last_interaction'] ?? ''
                    ],
                    $uid
                );
            }
            respond(['ok' => true, 'id' => $repId]);
            break;

        case 'delete_reputation':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $repId = (int) ($input['id'] ?? 0);
            if (!$repId)
                throw new Exception('Reputation ID required.');
            execute('DELETE FROM pc_reputation WHERE id = ?', [$repId], $uid);
            respond(['ok' => true]);
            break;

        // ═══════════════════════════════════════════════════
        // Phase 1: Spellcasting System
        // ═══════════════════════════════════════════════════

        case 'get_spells_known':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $charId = (int) ($_GET['character_id'] ?? 0);
            $spells = query('SELECT * FROM character_spells_known WHERE character_id = ? ORDER BY spell_level, spell_name', [$charId], $uid);
            respond(['ok' => true, 'spells' => $spells]);
            break;

        case 'save_spell_known':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $charId = (int) ($input['character_id'] ?? 0);
            if (!$charId)
                throw new Exception('Character ID required.');
            execute(
                'INSERT INTO character_spells_known (character_id, spell_name, spell_level, class_name, source, notes) VALUES (?,?,?,?,?,?)
                 ON DUPLICATE KEY UPDATE spell_level=VALUES(spell_level), source=VALUES(source), notes=VALUES(notes)',
                [
                    $charId,
                    $input['spell_name'] ?? '',
                    (int) ($input['spell_level'] ?? 0),
                    $input['class_name'] ?? '',
                    $input['source'] ?? 'SRD',
                    $input['notes'] ?? ''
                ],
                $uid
            );
            respond(['ok' => true]);
            break;

        case 'delete_spell_known':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $id = (int) ($input['id'] ?? 0);
            if (!$id)
                throw new Exception('Spell ID required.');
            execute('DELETE FROM character_spells_known WHERE id = ?', [$id], $uid);
            respond(['ok' => true]);
            break;

        case 'get_spells_prepared':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $charId = (int) ($_GET['character_id'] ?? 0);
            $spells = query('SELECT * FROM character_spells_prepared WHERE character_id = ? ORDER BY slot_level, spell_name', [$charId], $uid);
            respond(['ok' => true, 'spells' => $spells]);
            break;

        case 'save_spell_prepared':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $charId = (int) ($input['character_id'] ?? 0);
            if (!$charId)
                throw new Exception('Character ID required.');
            $id = (int) ($input['id'] ?? 0);
            if ($id > 0) {
                execute(
                    'UPDATE character_spells_prepared SET spell_name=?, spell_level=?, slot_level=?, class_name=?, is_domain=?, metamagic=?, used=? WHERE id=? AND character_id=?',
                    [
                        $input['spell_name'] ?? '',
                        (int) ($input['spell_level'] ?? 0),
                        (int) ($input['slot_level'] ?? 0),
                        $input['class_name'] ?? '',
                        (int) ($input['is_domain'] ?? 0),
                        $input['metamagic'] ?? '',
                        (int) ($input['used'] ?? 0),
                        $id,
                        $charId
                    ],
                    $uid
                );
            } else {
                $id = insertAndGetId(
                    'INSERT INTO character_spells_prepared (character_id, spell_name, spell_level, slot_level, class_name, is_domain, metamagic, used) VALUES (?,?,?,?,?,?,?,?)',
                    [
                        $charId,
                        $input['spell_name'] ?? '',
                        (int) ($input['spell_level'] ?? 0),
                        (int) ($input['slot_level'] ?? 0),
                        $input['class_name'] ?? '',
                        (int) ($input['is_domain'] ?? 0),
                        $input['metamagic'] ?? '',
                        0
                    ],
                    $uid
                );
            }
            respond(['ok' => true, 'id' => $id]);
            break;

        case 'delete_spell_prepared':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $id = (int) ($input['id'] ?? 0);
            if (!$id)
                throw new Exception('ID required.');
            execute('DELETE FROM character_spells_prepared WHERE id = ?', [$id], $uid);
            respond(['ok' => true]);
            break;

        case 'clear_spells_prepared':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $charId = (int) ($input['character_id'] ?? 0);
            if (!$charId)
                throw new Exception('Character ID required.');
            execute('DELETE FROM character_spells_prepared WHERE character_id = ?', [$charId], $uid);
            respond(['ok' => true]);
            break;

        case 'mark_spell_used':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $id = (int) ($input['id'] ?? 0);
            $used = (int) ($input['used'] ?? 1);
            execute('UPDATE character_spells_prepared SET used = ? WHERE id = ?', [$used, $id], $uid);
            respond(['ok' => true]);
            break;

        case 'rest_all_spells':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $charId = (int) ($input['character_id'] ?? 0);
            if (!$charId)
                throw new Exception('Character ID required.');
            execute('UPDATE character_spells_prepared SET used = 0 WHERE character_id = ?', [$charId], $uid);
            respond(['ok' => true]);
            break;

        case 'get_spellbook':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $charId = (int) ($_GET['character_id'] ?? 0);
            $spells = query('SELECT * FROM character_spellbook WHERE character_id = ? ORDER BY spell_level, spell_name', [$charId], $uid);
            respond(['ok' => true, 'spells' => $spells]);
            break;

        case 'save_spellbook_entry':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $charId = (int) ($input['character_id'] ?? 0);
            if (!$charId)
                throw new Exception('Character ID required.');
            execute(
                'INSERT INTO character_spellbook (character_id, spell_name, spell_level, pages, source, acquired_date) VALUES (?,?,?,?,?,?)
                 ON DUPLICATE KEY UPDATE pages=VALUES(pages), source=VALUES(source)',
                [
                    $charId,
                    $input['spell_name'] ?? '',
                    (int) ($input['spell_level'] ?? 0),
                    (int) ($input['pages'] ?? 1),
                    $input['source'] ?? 'Starting spellbook',
                    $input['acquired_date'] ?? ''
                ],
                $uid
            );
            respond(['ok' => true]);
            break;

        case 'delete_spellbook_entry':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $id = (int) ($input['id'] ?? 0);
            if (!$id)
                throw new Exception('ID required.');
            execute('DELETE FROM character_spellbook WHERE id = ?', [$id], $uid);
            respond(['ok' => true]);
            break;

        // ═══════════════════════════════════════════════════
        // Phase 1: Active Effects (Conditions/Buffs)
        // ═══════════════════════════════════════════════════

        case 'get_active_effects':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $charId = (int) ($_GET['character_id'] ?? 0);
            $effects = query('SELECT * FROM character_active_effects WHERE character_id = ? ORDER BY applied_at', [$charId], $uid);
            // Parse JSON effects field
            foreach ($effects as &$eff) {
                $eff['effects'] = json_decode($eff['effects_json'] ?? '{}', true) ?: [];
            }
            respond(['ok' => true, 'effects' => $effects]);
            break;

        case 'save_active_effect':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $charId = (int) ($input['character_id'] ?? 0);
            if (!$charId)
                throw new Exception('Character ID required.');
            $effectsJson = json_encode($input['effects'] ?? []);
            $id = insertAndGetId(
                'INSERT INTO character_active_effects (character_id, effect_key, effect_name, category, bonus_type, effects_json, duration_type, duration_remaining, source, caster_level) VALUES (?,?,?,?,?,?,?,?,?,?)',
                [
                    $charId,
                    $input['effect_key'] ?? '',
                    $input['effect_name'] ?? '',
                    $input['category'] ?? 'condition',
                    $input['bonus_type'] ?? 'untyped',
                    $effectsJson,
                    $input['duration_type'] ?? 'permanent',
                    (int) ($input['duration_remaining'] ?? 0),
                    $input['source'] ?? '',
                    (int) ($input['caster_level'] ?? 0)
                ],
                $uid
            );
            respond(['ok' => true, 'id' => $id]);
            break;

        case 'delete_active_effect':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $id = (int) ($input['id'] ?? 0);
            if (!$id)
                throw new Exception('Effect ID required.');
            execute('DELETE FROM character_active_effects WHERE id = ?', [$id], $uid);
            respond(['ok' => true]);
            break;

        case 'clear_active_effects':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $charId = (int) ($input['character_id'] ?? 0);
            if (!$charId)
                throw new Exception('Character ID required.');
            execute('DELETE FROM character_active_effects WHERE character_id = ?', [$charId], $uid);
            respond(['ok' => true]);
            break;

        // ═══════════════════════════════════════════════════
        // Phase 1: Level History (Multiclassing)
        // ═══════════════════════════════════════════════════

        case 'get_level_history':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $charId = (int) ($_GET['character_id'] ?? 0);
            $history = query('SELECT * FROM character_level_history WHERE character_id = ? ORDER BY level_number', [$charId], $uid);
            respond(['ok' => true, 'levels' => $history]);
            break;

        case 'save_level_history':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $charId = (int) ($input['character_id'] ?? 0);
            $levelNum = (int) ($input['level_number'] ?? 0);
            if (!$charId || !$levelNum)
                throw new Exception('Character ID and level number required.');
            execute(
                'INSERT INTO character_level_history (character_id, level_number, class_name, hp_gained, skill_points, feat_chosen, bonus_feat, ability_increase, notes) VALUES (?,?,?,?,?,?,?,?,?)
                 ON DUPLICATE KEY UPDATE class_name=VALUES(class_name), hp_gained=VALUES(hp_gained), skill_points=VALUES(skill_points), feat_chosen=VALUES(feat_chosen), bonus_feat=VALUES(bonus_feat), ability_increase=VALUES(ability_increase), notes=VALUES(notes)',
                [
                    $charId,
                    $levelNum,
                    $input['class_name'] ?? '',
                    (int) ($input['hp_gained'] ?? 0),
                    (int) ($input['skill_points'] ?? 0),
                    $input['feat_chosen'] ?? '',
                    $input['bonus_feat'] ?? '',
                    $input['ability_increase'] ?? '',
                    $input['notes'] ?? ''
                ],
                $uid
            );
            respond(['ok' => true]);
            break;

        // ═══════════════════════════════════════════════════
        // Phase 1: Structured Level Up
        // ═══════════════════════════════════════════════════

        case 'apply_level_up':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $charId = (int) ($input['character_id'] ?? 0);
            if (!$charId)
                throw new Exception('Character ID required.');

            $char = query('SELECT * FROM characters WHERE id = ?', [$charId], $uid);
            if (!$char)
                throw new Exception('Character not found.');
            $char = $char[0];

            $className = $input['class_name'] ?? '';
            $hpGained = (int) ($input['hp_gained'] ?? 0);
            $newLevel = (int) ($input['new_level'] ?? 0);
            $newClass = $input['new_class_string'] ?? '';
            $newHp = (int) ($input['new_hp'] ?? 0);
            $newSaves = $input['new_saves'] ?? '';
            $newBab = $input['new_bab'] ?? '';
            $featChosen = $input['feat_chosen'] ?? '';
            $bonusFeat = $input['bonus_feat'] ?? '';
            $abilityIncrease = $input['ability_increase'] ?? '';
            $newFeats = $input['new_feats_string'] ?? '';
            $newSkills = $input['new_skills_string'] ?? '';

            // Update the character
            $updates = [];
            $params = [];
            if ($newClass) {
                $updates[] = 'class = ?';
                $params[] = $newClass;
            }
            if ($newLevel) {
                $updates[] = 'level = ?';
                $params[] = $newLevel;
            }
            if ($newHp) {
                $updates[] = 'hp = ?';
                $params[] = $newHp;
            }
            if ($newSaves) {
                $updates[] = 'saves = ?';
                $params[] = $newSaves;
            }
            if ($newBab) {
                $updates[] = 'atk = ?';
                $params[] = $newBab;
            }
            if ($newFeats) {
                $updates[] = 'feats = ?';
                $params[] = $newFeats;
            }
            if ($newSkills) {
                $updates[] = 'skills_feats = ?';
                $params[] = $newSkills;
            }
            // Ability increase
            if ($abilityIncrease) {
                $abCol = strtolower($abilityIncrease);
                if ($abCol === 'int')
                    $abCol = 'int_';
                if (in_array($abCol, ['str', 'dex', 'con', 'int_', 'wis', 'cha'])) {
                    $updates[] = "$abCol = $abCol + 1";
                }
            }

            if ($updates) {
                $params[] = $charId;
                execute('UPDATE characters SET ' . implode(', ', $updates) . ' WHERE id = ?', $params, $uid);
            }

            // Record in level history
            execute(
                'INSERT INTO character_level_history (character_id, level_number, class_name, hp_gained, skill_points, feat_chosen, bonus_feat, ability_increase) VALUES (?,?,?,?,?,?,?,?)
                 ON DUPLICATE KEY UPDATE class_name=VALUES(class_name), hp_gained=VALUES(hp_gained), feat_chosen=VALUES(feat_chosen), bonus_feat=VALUES(bonus_feat), ability_increase=VALUES(ability_increase)',
                [
                    $charId,
                    $newLevel,
                    $className,
                    $hpGained,
                    (int) ($input['skill_points_spent'] ?? 0),
                    $featChosen,
                    $bonusFeat,
                    $abilityIncrease
                ],
                $uid
            );

            // Save new spells known if provided
            if (!empty($input['new_spells_known'])) {
                foreach ($input['new_spells_known'] as $sp) {
                    execute(
                        'INSERT INTO character_spells_known (character_id, spell_name, spell_level, class_name, source) VALUES (?,?,?,?,?)
                         ON DUPLICATE KEY UPDATE spell_level=VALUES(spell_level)',
                        [
                            $charId,
                            $sp['spell_name'],
                            (int) ($sp['spell_level'] ?? 0),
                            $sp['class_name'] ?? $className,
                            'Level Up'
                        ],
                        $uid
                    );
                }
            }

            // Set XP to minimum for the new level (D&D 3.5e: level*(level-1)*500)
            $minXp = $newLevel * ($newLevel - 1) * 500;
            execute('UPDATE characters SET xp = ? WHERE id = ?', [$minXp, $charId], $uid);

            respond(['ok' => true, 'message' => "Leveled up to $newClass"]);
            break;

        /* ═══════════════════════════════════════════════════════
           MOVE CHARACTER BETWEEN TOWNS
           ═══════════════════════════════════════════════════════ */
        /* ═══════════════════════════════════════════════════
           BUG REPORTS — Discord webhook
           ═══════════════════════════════════════════════════ */
        case 'submit_bug_report':
            $user = requireAuth();
            $title = trim($input['title'] ?? '');
            $description = trim($input['description'] ?? '');
            $steps = trim($input['steps'] ?? '');
            $severity = trim($input['severity'] ?? 'medium');
            $page = trim($input['page'] ?? '');
            $browser = trim($input['browser'] ?? '');

            if (!$title)
                throw new Exception('Bug report title is required.');
            if (strlen($title) > 200)
                throw new Exception('Title too long (max 200 chars).');

            require_once __DIR__ . '/discord.php';
            $result = sendDiscordBugReport(
                $title,
                $description,
                $steps,
                $severity,
                $user['username'] ?? 'Unknown',
                $page,
                $browser
            );

            if (!$result['ok']) {
                throw new Exception('Failed to send bug report: ' . ($result['error'] ?? 'Unknown error'));
            }

            respond(['ok' => true, 'message' => 'Bug report submitted! Thank you.']);
            break;

        /* ═══════════════════════════════════════════════════
           DEPLOY NOTIFICATIONS — Discord webhook (via server)
           ═══════════════════════════════════════════════════ */
        case 'send_deploy_notification':
            // Simple key auth — not session-based since deploy scripts call this
            $key = $_GET['key'] ?? ($input['key'] ?? '');
            if ($key !== 'ew_deploy_2026') {
                throw new Exception('Unauthorized');
            }
            $env = trim($input['environment'] ?? 'Dev');
            $desc = trim($input['description'] ?? "A new version has been deployed to $env.");
            $changes = $input['changes'] ?? [];

            require_once __DIR__ . '/discord.php';
            $result = sendDiscordUpdate("$env Deploy", $desc, $changes);

            if (!$result['ok']) {
                throw new Exception('Failed to send notification: ' . ($result['error'] ?? 'Unknown error'));
            }

            respond(['ok' => true, 'message' => 'Deploy notification sent to Discord.']);
            break;

        case 'move_character':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $charId = (int) ($input['character_id'] ?? 0);
            $fromTownId = (int) ($input['from_town_id'] ?? 0);
            $toTownId = (int) ($input['to_town_id'] ?? 0);

            if (!$charId || !$fromTownId || !$toTownId || $fromTownId === $toTownId)
                throw new Exception('Invalid move parameters.');

            verifyTownOwnership($uid, $fromTownId, $uid);
            verifyTownOwnership($uid, $toTownId, $uid);

            // Verify character exists and belongs to source town
            $charRow = query('SELECT id, name, months_in_town, status FROM characters WHERE id = ? AND town_id = ?', [$charId, $fromTownId], $uid);
            if (!$charRow)
                throw new Exception('Character not found in source town.');

            if (($charRow[0]['status'] ?? 'Alive') !== 'Alive')
                throw new Exception('Cannot move a deceased character.');

            // Move: update town_id, reset months_in_town
            execute('UPDATE characters SET town_id = ?, months_in_town = 0 WHERE id = ?', [$toTownId, $charId], $uid);

            respond(['ok' => true, 'message' => "{$charRow[0]['name']} moved to new town.", 'character_id' => $charId, 'to_town_id' => $toTownId]);
            break;

        /* ═══════════════════════════════════════════════════
           ADMIN — Requires admin role
           (Primary admin handlers are further below in the
            "cross-account database management" section)
           ═══════════════════════════════════════════════════ */

        case 'admin_token_usage':
            requireAdmin();
            try {
                $rows = query(
                    'SELECT u.username, t.user_id, t.`year_month`, t.feature_key, t.tokens_used, t.call_count
                     FROM user_token_usage t
                     JOIN users u ON u.id = t.user_id
                     ORDER BY t.`year_month` DESC, t.tokens_used DESC',
                    [], 0
                );
            } catch (\PDOException $e) {
                $rows = [];
            } catch (\Exception $e) {
                $rows = [];
            }
            respond(['ok' => true, 'usage' => $rows]);
            break;

        /* ═══════════════════════════════════════════════════
           CAMPAIGN RULES — World Context for AI (per-campaign)
           ═══════════════════════════════════════════════════ */
        case 'get_campaign_rules':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;
            if ($campId) {
                $rows = query('SELECT rules_text, campaign_description, homebrew_settings, relationship_speed, birth_rate, death_threshold, child_growth, conflict_frequency, sell_rate FROM campaign_rules WHERE user_id = ? AND campaign_id = ?', [$uid, $campId], 0);
            } else {
                $rows = query('SELECT rules_text, campaign_description, homebrew_settings, relationship_speed, birth_rate, death_threshold, child_growth, conflict_frequency, sell_rate FROM campaign_rules WHERE user_id = ? AND campaign_id IS NULL', [$uid], 0);
            }
            $r = $rows ? $rows[0] : [];
            $hb = $r['homebrew_settings'] ?? '{}';
            $hbDecoded = json_decode($hb, true) ?: [];
            respond([
                'ok' => true,
                'rules_text' => $r['rules_text'] ?? '',
                'campaign_description' => $r['campaign_description'] ?? '',
                'homebrew_settings' => $hbDecoded ?: (object) [],
                'relationship_speed' => $r['relationship_speed'] ?? 'normal',
                'birth_rate' => $r['birth_rate'] ?? 'normal',
                'death_threshold' => $r['death_threshold'] ?? '50',
                'child_growth' => $r['child_growth'] ?? 'realistic',
                'conflict_frequency' => $r['conflict_frequency'] ?? 'occasional',
                'sell_rate' => $r['sell_rate'] ?? '50',
            ]);
            break;

        case 'save_campaign_rules':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;
            $rulesText = trim($input['rules_text'] ?? '');
            $campDesc = trim($input['campaign_description'] ?? '');
            $hbSettings = $input['homebrew_settings'] ?? [];
            $hbJson = json_encode($hbSettings, JSON_UNESCAPED_UNICODE);
            $relSpeed = $input['relationship_speed'] ?? 'normal';
            $birthRate = $input['birth_rate'] ?? 'normal';
            $deathThreshold = $input['death_threshold'] ?? '50';
            $childGrowth = $input['child_growth'] ?? 'realistic';
            $conflictFreq = $input['conflict_frequency'] ?? 'occasional';
            $sellRate = $input['sell_rate'] ?? '50';

            // Upsert by (user_id, campaign_id)
            if ($campId) {
                $existing = query('SELECT id FROM campaign_rules WHERE user_id = ? AND campaign_id = ?', [$uid, $campId], 0);
            } else {
                $existing = query('SELECT id FROM campaign_rules WHERE user_id = ? AND campaign_id IS NULL', [$uid], 0);
            }
            if ($existing) {
                execute(
                    'UPDATE campaign_rules SET rules_text = ?, campaign_description = ?, homebrew_settings = ?, relationship_speed = ?, birth_rate = ?, death_threshold = ?, child_growth = ?, conflict_frequency = ?, sell_rate = ?, updated_at = NOW() WHERE id = ?',
                    [$rulesText, $campDesc, $hbJson, $relSpeed, $birthRate, $deathThreshold, $childGrowth, $conflictFreq, $sellRate, (int) $existing[0]['id']],
                    0
                );
            } else {
                execute(
                    'INSERT INTO campaign_rules (user_id, campaign_id, rules_text, campaign_description, homebrew_settings, relationship_speed, birth_rate, death_threshold, child_growth, conflict_frequency, sell_rate, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
                    [$uid, $campId, $rulesText, $campDesc, $hbJson, $relSpeed, $birthRate, $deathThreshold, $childGrowth, $conflictFreq, $sellRate],
                    0
                );
            }
            respond(['ok' => true]);
            break;

        /* ═══════════════════════════════════════════════════
           CUSTOM CONTENT — Homebrew SRD (per-user SQLite DB)
           Each user gets their own content.db file.
           ═══════════════════════════════════════════════════ */
        case 'get_custom_content':
            $user = requireAuth();
            $uid = (int) $user['id'];
            // Get active campaign from shared MySQL
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;

            $result = [];
            $tables = ['custom_races', 'custom_classes', 'custom_feats', 'custom_spells', 'custom_equipment'];
            foreach ($tables as $tbl) {
                try {
                    if ($campId) {
                        $rows = userQuery($uid, "SELECT * FROM $tbl WHERE campaign_id = ? OR campaign_id IS NULL ORDER BY name", [$campId]);
                    } else {
                        $rows = userQuery($uid, "SELECT * FROM $tbl ORDER BY name");
                    }
                    $result[$tbl] = $rows;
                } catch (Exception $e) {
                    $result[$tbl] = [];
                }
            }
            respond(['ok' => true, 'content' => $result]);
            break;

        case 'save_custom_race':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $d = $input['race'] ?? [];
            $itemId = (int) ($d['id'] ?? 0);
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;

            if ($itemId > 0) {
                userExecute($uid, 'UPDATE custom_races SET name=?, size=?, speed=?, ability_mods=?, traits=?, languages=? WHERE id=?', [
                    trim($d['name'] ?? ''), $d['size'] ?? 'Medium', (int) ($d['speed'] ?? 30),
                    $d['ability_mods'] ?? '', $d['traits'] ?? '', $d['languages'] ?? '',
                    $itemId
                ]);
                respond(['ok' => true, 'id' => $itemId]);
            } else {
                $name = trim($d['name'] ?? '');
                if (!$name) throw new Exception('Race name is required.');
                $newId = userInsert($uid,
                    'INSERT INTO custom_races (campaign_id, name, size, speed, ability_mods, traits, languages) VALUES (?,?,?,?,?,?,?)',
                    [$campId, $name, $d['size'] ?? 'Medium', (int) ($d['speed'] ?? 30),
                     $d['ability_mods'] ?? '', $d['traits'] ?? '', $d['languages'] ?? '']
                );
                respond(['ok' => true, 'id' => $newId]);
            }
            break;

        case 'save_custom_class':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $d = $input['class'] ?? [];
            $itemId = (int) ($d['id'] ?? 0);
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;

            if ($itemId > 0) {
                userExecute($uid, 'UPDATE custom_classes SET name=?, hit_die=?, bab_type=?, good_saves=?, skills_per_level=?, class_skills=?, class_features=? WHERE id=?', [
                    trim($d['name'] ?? ''), $d['hit_die'] ?? 'd8', $d['bab_type'] ?? '3/4',
                    $d['good_saves'] ?? '', (int) ($d['skills_per_level'] ?? 2),
                    $d['class_skills'] ?? '', $d['class_features'] ?? '',
                    $itemId
                ]);
                respond(['ok' => true, 'id' => $itemId]);
            } else {
                $name = trim($d['name'] ?? '');
                if (!$name) throw new Exception('Class name is required.');
                $newId = userInsert($uid,
                    'INSERT INTO custom_classes (campaign_id, name, hit_die, bab_type, good_saves, skills_per_level, class_skills, class_features) VALUES (?,?,?,?,?,?,?,?)',
                    [$campId, $name, $d['hit_die'] ?? 'd8', $d['bab_type'] ?? '3/4',
                     $d['good_saves'] ?? '', (int) ($d['skills_per_level'] ?? 2),
                     $d['class_skills'] ?? '', $d['class_features'] ?? '']
                );
                respond(['ok' => true, 'id' => $newId]);
            }
            break;

        case 'save_custom_feat':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $d = $input['feat'] ?? [];
            $itemId = (int) ($d['id'] ?? 0);
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;

            $modifiers = json_encode($d['modifiers'] ?? [], JSON_UNESCAPED_UNICODE);

            if ($itemId > 0) {
                userExecute($uid, 'UPDATE custom_feats SET name=?, type=?, prerequisites=?, benefit=?, description=?, modifiers=? WHERE id=?', [
                    trim($d['name'] ?? ''), $d['type'] ?? 'General', $d['prerequisites'] ?? '',
                    $d['benefit'] ?? '', $d['description'] ?? '', $modifiers,
                    $itemId
                ]);
                respond(['ok' => true, 'id' => $itemId]);
            } else {
                $name = trim($d['name'] ?? '');
                if (!$name) throw new Exception('Feat name is required.');
                $newId = userInsert($uid,
                    'INSERT INTO custom_feats (campaign_id, name, type, prerequisites, benefit, description, modifiers) VALUES (?,?,?,?,?,?,?)',
                    [$campId, $name, $d['type'] ?? 'General', $d['prerequisites'] ?? '',
                     $d['benefit'] ?? '', $d['description'] ?? '', $modifiers]
                );
                respond(['ok' => true, 'id' => $newId]);
            }
            break;

        case 'save_custom_spell':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $d = $input['spell'] ?? [];
            $itemId = (int) ($d['id'] ?? 0);
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;

            if ($itemId > 0) {
                userExecute($uid, 'UPDATE custom_spells SET name=?, level=?, school=?, casting_time=?, range=?, duration=?, components=?, description=?, classes=? WHERE id=?', [
                    trim($d['name'] ?? ''), (int) ($d['level'] ?? 0), $d['school'] ?? '',
                    $d['casting_time'] ?? '1 standard action', $d['range'] ?? '',
                    $d['duration'] ?? '', $d['components'] ?? '', $d['description'] ?? '',
                    $d['classes'] ?? '',
                    $itemId
                ]);
                respond(['ok' => true, 'id' => $itemId]);
            } else {
                $name = trim($d['name'] ?? '');
                if (!$name) throw new Exception('Spell name is required.');
                $newId = userInsert($uid,
                    'INSERT INTO custom_spells (campaign_id, name, level, school, casting_time, range, duration, components, description, classes) VALUES (?,?,?,?,?,?,?,?,?,?)',
                    [$campId, $name, (int) ($d['level'] ?? 0), $d['school'] ?? '',
                     $d['casting_time'] ?? '1 standard action', $d['range'] ?? '',
                     $d['duration'] ?? '', $d['components'] ?? '', $d['description'] ?? '',
                     $d['classes'] ?? '']
                );
                respond(['ok' => true, 'id' => $newId]);
            }
            break;

        case 'save_custom_equipment':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $d = $input['equipment'] ?? [];
            $itemId = (int) ($d['id'] ?? 0);
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;

            if ($itemId > 0) {
                userExecute($uid, 'UPDATE custom_equipment SET name=?, category=?, cost=?, weight=?, damage=?, critical=?, properties=? WHERE id=?', [
                    trim($d['name'] ?? ''), $d['category'] ?? '', $d['cost'] ?? '',
                    $d['weight'] ?? '', $d['damage'] ?? '', $d['critical'] ?? '',
                    $d['properties'] ?? '',
                    $itemId
                ]);
                respond(['ok' => true, 'id' => $itemId]);
            } else {
                $name = trim($d['name'] ?? '');
                if (!$name) throw new Exception('Equipment name is required.');
                $newId = userInsert($uid,
                    'INSERT INTO custom_equipment (campaign_id, name, category, cost, weight, damage, critical, properties) VALUES (?,?,?,?,?,?,?,?)',
                    [$campId, $name, $d['category'] ?? '', $d['cost'] ?? '',
                     $d['weight'] ?? '', $d['damage'] ?? '', $d['critical'] ?? '',
                     $d['properties'] ?? '']
                );
                respond(['ok' => true, 'id' => $newId]);
            }
            break;

        case 'delete_custom_content':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $contentType = $input['content_type'] ?? '';
            $contentId = (int) ($input['content_id'] ?? 0);
            if (!$contentId) throw new Exception('Missing content_id.');
            $validTypes = ['custom_races', 'custom_classes', 'custom_feats', 'custom_spells', 'custom_equipment'];
            if (!in_array($contentType, $validTypes)) throw new Exception('Invalid content_type.');
            userExecute($uid, "DELETE FROM $contentType WHERE id = ?", [$contentId]);
            respond(['ok' => true]);
            break;

        /* ═══════════════════════════════════════════════════
           USER FILES — Per-account content library (SQLite)
           ═══════════════════════════════════════════════════ */
        case 'get_user_files':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;
            try {
                if ($campId) {
                    $files = userQuery($uid,
                        'SELECT * FROM user_files WHERE campaign_id = ? OR campaign_id IS NULL ORDER BY uploaded_at DESC',
                        [$campId]
                    );
                } else {
                    $files = userQuery($uid, 'SELECT * FROM user_files ORDER BY uploaded_at DESC');
                }
                // Build URLs
                foreach ($files as &$f) {
                    $f['url'] = "users/{$uid}/content/{$f['filename']}";
                }
                unset($f);
            } catch (Exception $e) {
                $files = [];
            }
            // Storage stats
            $totalSize = 0;
            foreach ($files as $f) $totalSize += (int) ($f['file_size'] ?? 0);
            $udata = query('SELECT subscription_tier FROM users WHERE id = ?', [$uid], 0);
            $tier = $udata[0]['subscription_tier'] ?? 'free';
            $storageLimits = ['free' => 20 * 1024 * 1024, 'apprentice' => 50 * 1024 * 1024, 'adventurer' => 100 * 1024 * 1024, 'guild_master' => 500 * 1024 * 1024, 'world_builder' => 2048 * 1024 * 1024];
            $fileLimits = ['free' => 10, 'apprentice' => 25, 'adventurer' => 50, 'guild_master' => 200, 'world_builder' => 9999];
            respond([
                'ok' => true,
                'files' => $files,
                'storage_used' => $totalSize,
                'storage_limit' => $storageLimits[$tier] ?? $storageLimits['free'],
                'file_count' => count($files),
                'file_limit' => $fileLimits[$tier] ?? $fileLimits['free'],
            ]);
            break;

        case 'delete_user_file':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $fileId = (int) ($input['file_id'] ?? 0);
            if (!$fileId) throw new Exception('Missing file_id.');
            // Get file info to delete from disk
            $frow = userQuery($uid, 'SELECT filename FROM user_files WHERE id = ?', [$fileId]);
            if ($frow) {
                $filepath = __DIR__ . "/users/{$uid}/content/{$frow[0]['filename']}";
                if (file_exists($filepath)) @unlink($filepath);
            }
            userExecute($uid, 'DELETE FROM user_files WHERE id = ?', [$fileId]);
            respond(['ok' => true]);
            break;

        /* ═══════════════════════════════════════════════════
           ADMIN — cross-account database management
           ═══════════════════════════════════════════════════ */

        case 'admin_overview':
            requireAdmin();
            $totalUsers = query('SELECT COUNT(*) as c FROM users', [], 0)[0]['c'] ?? 0;
            $totalTowns = query('SELECT COUNT(*) as c FROM towns', [], 0)[0]['c'] ?? 0;
            $totalChars = query('SELECT COUNT(*) as c FROM characters', [], 0)[0]['c'] ?? 0;
            $totalCamps = query('SELECT COUNT(*) as c FROM campaigns', [], 0)[0]['c'] ?? 0;
            $ym = date('Y-m');
            $monthlyTokens = query("SELECT COALESCE(SUM(tokens_used),0) as t FROM user_token_usage WHERE `year_month` = ?", [$ym], 0)[0]['t'] ?? 0;
            $monthlyCalls = query("SELECT COALESCE(SUM(call_count),0) as c FROM user_token_usage WHERE `year_month` = ?", [$ym], 0)[0]['c'] ?? 0;
            $activeUsers = query("SELECT COUNT(DISTINCT user_id) as c FROM user_token_usage WHERE `year_month` = ?", [$ym], 0)[0]['c'] ?? 0;
            respond([
                'ok' => true,
                'total_users' => (int) $totalUsers,
                'total_towns' => (int) $totalTowns,
                'total_characters' => (int) $totalChars,
                'total_campaigns' => (int) $totalCamps,
                'monthly_tokens' => (int) $monthlyTokens,
                'monthly_calls' => (int) $monthlyCalls,
                'active_users' => (int) $activeUsers,
                'month' => $ym,
            ]);
            break;

        case 'admin_members':
            requireAdmin();
            $members = query(
                "SELECT u.id, u.username, u.email, u.subscription_tier, u.role, u.credit_balance, u.created_at,
                    (SELECT COUNT(*) FROM campaigns WHERE user_id = u.id) as campaign_count,
                    (SELECT COUNT(*) FROM towns WHERE user_id = u.id) as town_count,
                    COALESCE((SELECT SUM(tokens_used) FROM user_token_usage WHERE user_id = u.id AND `year_month` = ?), 0) as tokens_this_month,
                    COALESCE((SELECT SUM(call_count) FROM user_token_usage WHERE user_id = u.id AND `year_month` = ?), 0) as calls_this_month
                 FROM users u ORDER BY u.created_at DESC",
                [date('Y-m'), date('Y-m')],
                0
            );
            respond(['ok' => true, 'members' => $members]);
            break;

        case 'admin_update_member':
            requireAdmin();
            $targetId = (int) ($input['user_id'] ?? 0);
            if (!$targetId) throw new Exception('Missing user_id');
            $updates = [];
            $params = [];
            if (isset($input['subscription_tier'])) {
                $updates[] = 'subscription_tier = ?';
                $params[] = $input['subscription_tier'];
            }
            if (isset($input['role'])) {
                $updates[] = 'role = ?';
                $params[] = $input['role'];
            }
            if (isset($input['username'])) {
                $updates[] = 'username = ?';
                $params[] = trim($input['username']);
            }
            if (isset($input['email'])) {
                $updates[] = 'email = ?';
                $params[] = trim($input['email']);
            }
            if (empty($updates)) throw new Exception('No fields to update');
            $params[] = $targetId;
            execute('UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = ?', $params, 0);
            respond(['ok' => true]);
            break;

        case 'admin_adjust_credits':
            requireAdmin();
            $targetId = (int) ($input['user_id'] ?? 0);
            if (!$targetId) throw new Exception('Missing user_id');
            $amount = (int) ($input['amount'] ?? 0);
            $mode = $input['mode'] ?? 'add'; // 'add', 'set', or 'subtract'
            if ($mode === 'set') {
                execute('UPDATE users SET credit_balance = ? WHERE id = ?', [max(0, $amount), $targetId], 0);
            } elseif ($mode === 'subtract') {
                execute('UPDATE users SET credit_balance = GREATEST(0, credit_balance - ?) WHERE id = ?', [abs($amount), $targetId], 0);
            } else {
                // Default: add
                execute('UPDATE users SET credit_balance = credit_balance + ? WHERE id = ?', [abs($amount), $targetId], 0);
            }
            $newBalance = query('SELECT credit_balance FROM users WHERE id = ?', [$targetId], 0);
            respond(['ok' => true, 'new_balance' => (int) ($newBalance[0]['credit_balance'] ?? 0)]);
            break;

        case 'admin_delete_member':
            requireAdmin();
            $targetId = (int) ($input['user_id'] ?? 0);
            if (!$targetId) throw new Exception('Missing user_id');
            // Prevent self-delete
            $adminUser = currentUser();
            if ((int) $adminUser['id'] === $targetId)
                throw new Exception('Cannot delete your own account.');
            // CASCADE deletes handle campaigns, towns, characters, etc.
            execute('DELETE FROM users WHERE id = ?', [$targetId], 0);
            respond(['ok' => true]);
            break;

        case 'admin_user_campaigns':
            requireAdmin();
            $targetId = (int) ($_GET['user_id'] ?? 0);
            if (!$targetId) throw new Exception('Missing user_id');
            $camps = query(
                'SELECT c.*, (SELECT COUNT(*) FROM towns WHERE campaign_id = c.id) as town_count FROM campaigns c WHERE c.user_id = ? ORDER BY c.created_at',
                [$targetId],
                0
            );
            respond(['ok' => true, 'campaigns' => $camps]);
            break;

        case 'admin_user_towns':
            requireAdmin();
            $targetId = (int) ($_GET['user_id'] ?? 0);
            $campId = (int) ($_GET['campaign_id'] ?? 0);
            if (!$targetId) throw new Exception('Missing user_id');
            $sql = 'SELECT t.*, (SELECT COUNT(*) FROM characters WHERE town_id = t.id) as character_count FROM towns t WHERE t.user_id = ?';
            $params = [$targetId];
            if ($campId) {
                $sql .= ' AND t.campaign_id = ?';
                $params[] = $campId;
            }
            $sql .= ' ORDER BY t.name';
            $towns = query($sql, $params, 0);
            respond(['ok' => true, 'towns' => $towns]);
            break;

        case 'admin_town_characters':
            requireAdmin();
            $townId = (int) ($_GET['town_id'] ?? 0);
            if (!$townId) throw new Exception('Missing town_id');
            $chars = query('SELECT * FROM characters WHERE town_id = ? ORDER BY name', [$townId], 0);
            respond(['ok' => true, 'characters' => $chars]);
            break;

        case 'admin_update_character':
            requireAdmin();
            $charId = (int) ($input['character_id'] ?? 0);
            if (!$charId) throw new Exception('Missing character_id');
            $d = $input['data'] ?? [];
            $fields = [
                'name','race','class','level','status','title','gender','spouse','spouse_label',
                'age','xp','cr','ecl','hp','hd','ac','init','spd','grapple','atk','alignment',
                'saves','str','dex','con','int_','wis','cha','languages','skills_feats','feats',
                'domains','gear','role','history','portrait_url','portrait_prompt','building_id'
            ];
            $sets = [];
            $vals = [];
            foreach ($fields as $f) {
                if (array_key_exists($f, $d)) {
                    $sets[] = "`$f` = ?";
                    $vals[] = $d[$f];
                }
            }
            if (empty($sets)) throw new Exception('No fields to update');
            $vals[] = $charId;
            execute('UPDATE characters SET ' . implode(', ', $sets) . ' WHERE id = ?', $vals, 0);
            respond(['ok' => true]);
            break;

        case 'admin_delete_character':
            requireAdmin();
            $charId = (int) ($input['character_id'] ?? 0);
            if (!$charId) throw new Exception('Missing character_id');
            execute('DELETE FROM characters WHERE id = ?', [$charId], 0);
            respond(['ok' => true]);
            break;

        case 'admin_update_town':
            requireAdmin();
            $townId = (int) ($input['town_id'] ?? 0);
            if (!$townId) throw new Exception('Missing town_id');
            $d = $input['data'] ?? [];
            $sets = [];
            $vals = [];
            if (isset($d['name'])) { $sets[] = 'name = ?'; $vals[] = trim($d['name']); }
            if (isset($d['subtitle'])) { $sets[] = 'subtitle = ?'; $vals[] = trim($d['subtitle']); }
            if (isset($d['is_party_base'])) { $sets[] = 'is_party_base = ?'; $vals[] = (int) $d['is_party_base']; }
            if (empty($sets)) throw new Exception('No fields to update');
            $sets[] = 'updated_at = NOW()';
            $vals[] = $townId;
            execute('UPDATE towns SET ' . implode(', ', $sets) . ' WHERE id = ?', $vals, 0);
            respond(['ok' => true]);
            break;

        case 'admin_delete_town':
            requireAdmin();
            $townId = (int) ($input['town_id'] ?? 0);
            if (!$townId) throw new Exception('Missing town_id');
            execute('DELETE FROM characters WHERE town_id = ?', [$townId], 0);
            execute('DELETE FROM history WHERE town_id = ?', [$townId], 0);
            execute('DELETE FROM town_meta WHERE town_id = ?', [$townId], 0);
            execute('DELETE FROM town_buildings WHERE town_id = ?', [$townId], 0);
            execute('DELETE FROM towns WHERE id = ?', [$townId], 0);
            respond(['ok' => true]);
            break;

        case 'admin_update_campaign':
            requireAdmin();
            $campId = (int) ($input['campaign_id'] ?? 0);
            if (!$campId) throw new Exception('Missing campaign_id');
            $d = $input['data'] ?? [];
            $sets = [];
            $vals = [];
            if (isset($d['name'])) { $sets[] = 'name = ?'; $vals[] = trim($d['name']); }
            if (isset($d['dnd_edition'])) { $sets[] = 'dnd_edition = ?'; $vals[] = trim($d['dnd_edition']); }
            if (isset($d['description'])) { $sets[] = 'description = ?'; $vals[] = trim($d['description']); }
            if (isset($d['is_active'])) { $sets[] = 'is_active = ?'; $vals[] = (int) $d['is_active']; }
            if (empty($sets)) throw new Exception('No fields to update');
            $sets[] = 'updated_at = NOW()';
            $vals[] = $campId;
            execute('UPDATE campaigns SET ' . implode(', ', $sets) . ' WHERE id = ?', $vals, 0);
            respond(['ok' => true]);
            break;

        case 'admin_token_usage':
            requireAdmin();
            $usage = query(
                "SELECT u.username, t.user_id, t.year_month, t.feature_key, t.tokens_used, t.call_count
                 FROM user_token_usage t
                 JOIN users u ON u.id = t.user_id
                 ORDER BY t.year_month DESC, t.tokens_used DESC",
                [],
                0
            );
            respond(['ok' => true, 'usage' => $usage]);
            break;

        case 'admin_site_settings':
            requireAdmin();
            $settings = query('SELECT * FROM site_settings ORDER BY `key`', [], 0);
            respond(['ok' => true, 'settings' => $settings]);
            break;

        case 'admin_update_site_setting':
            requireAdmin();
            $key = trim($input['key'] ?? '');
            $value = $input['value'] ?? '';
            if (!$key) throw new Exception('Missing key');
            execute(
                "INSERT INTO site_settings (`key`, value, updated_at) VALUES (?, ?, NOW())
                 ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()",
                [$key, $value],
                0
            );
            respond(['ok' => true]);
            break;

        case 'admin_town_meta':
            requireAdmin();
            $townId = (int) ($_GET['town_id'] ?? 0);
            if (!$townId) throw new Exception('Missing town_id');
            $meta = query('SELECT * FROM town_meta WHERE town_id = ?', [$townId], 0);
            respond(['ok' => true, 'meta' => $meta]);
            break;

        case 'admin_town_buildings':
            requireAdmin();
            $townId = (int) ($_GET['town_id'] ?? 0);
            if (!$townId) throw new Exception('Missing town_id');
            $buildings = query('SELECT * FROM town_buildings WHERE town_id = ? ORDER BY sort_order, name', [$townId], 0);
            respond(['ok' => true, 'buildings' => $buildings]);
            break;

        case 'admin_town_history':
            requireAdmin();
            $townId = (int) ($_GET['town_id'] ?? 0);
            if (!$townId) throw new Exception('Missing town_id');
            $history = query('SELECT * FROM history WHERE town_id = ? ORDER BY sort_order', [$townId], 0);
            respond(['ok' => true, 'history' => $history]);
            break;

        case 'admin_town_factions':
            requireAdmin();
            $townId = (int) ($_GET['town_id'] ?? 0);
            if (!$townId) throw new Exception('Missing town_id');
            $factions = query('SELECT * FROM factions WHERE town_id = ?', [$townId], 0);
            respond(['ok' => true, 'factions' => $factions]);
            break;

        case 'admin_campaign_rules':
            requireAdmin();
            $campId = (int) ($_GET['campaign_id'] ?? 0);
            if (!$campId) throw new Exception('Missing campaign_id');
            $rules = query('SELECT * FROM campaign_rules WHERE campaign_id = ?', [$campId], 0);
            respond(['ok' => true, 'rules' => $rules[0] ?? null]);
            break;

        case 'admin_calendar':
            requireAdmin();
            $campId = (int) ($_GET['campaign_id'] ?? 0);
            if (!$campId) throw new Exception('Missing campaign_id');
            $cal = query('SELECT * FROM calendar WHERE campaign_id = ?', [$campId], 0);
            respond(['ok' => true, 'calendar' => $cal[0] ?? null]);
            break;

        case 'admin_character_detail':
            requireAdmin();
            $charId = (int) ($_GET['character_id'] ?? 0);
            if (!$charId) throw new Exception('Missing character_id');
            $char = query('SELECT * FROM characters WHERE id = ?', [$charId], 0);
            if (!$char) throw new Exception('Character not found');
            $equipment = query('SELECT * FROM character_equipment WHERE character_id = ? ORDER BY equipped DESC, sort_order', [$charId], 0);
            $xpLog = query('SELECT * FROM character_xp_log WHERE character_id = ? ORDER BY created_at DESC LIMIT 50', [$charId], 0);
            $memories = query('SELECT * FROM character_memories WHERE character_id = ? ORDER BY importance DESC LIMIT 50', [$charId], 0);
            $relationships = query(
                "SELECT cr.*, c1.name as char1_name, c2.name as char2_name
                 FROM character_relationships cr
                 LEFT JOIN characters c1 ON cr.char1_id = c1.id
                 LEFT JOIN characters c2 ON cr.char2_id = c2.id
                 WHERE cr.char1_id = ? OR cr.char2_id = ?",
                [$charId, $charId],
                0
            );
            $spellsKnown = query('SELECT * FROM character_spells_known WHERE character_id = ?', [$charId], 0);
            $effects = query('SELECT * FROM character_active_effects WHERE character_id = ?', [$charId], 0);
            $levelHistory = query('SELECT * FROM character_level_history WHERE character_id = ? ORDER BY level_number', [$charId], 0);
            respond([
                'ok' => true,
                'character' => $char[0],
                'equipment' => $equipment ?: [],
                'xp_log' => $xpLog ?: [],
                'memories' => $memories ?: [],
                'relationships' => $relationships ?: [],
                'spells_known' => $spellsKnown ?: [],
                'active_effects' => $effects ?: [],
                'level_history' => $levelHistory ?: [],
            ]);
            break;

        case 'admin_all_towns':
            requireAdmin();
            $towns = query(
                "SELECT t.*, u.username as owner_name, c.name as campaign_name,
                    (SELECT COUNT(*) FROM characters WHERE town_id = t.id) as character_count
                 FROM towns t
                 JOIN users u ON u.id = t.user_id
                 LEFT JOIN campaigns c ON c.id = t.campaign_id
                 ORDER BY u.username, t.name",
                [], 0
            );
            respond(['ok' => true, 'towns' => $towns]);
            break;

        case 'admin_all_campaigns':
            requireAdmin();
            $camps = query(
                "SELECT c.*, u.username as owner_name,
                    (SELECT COUNT(*) FROM towns WHERE campaign_id = c.id) as town_count
                 FROM campaigns c
                 JOIN users u ON u.id = c.user_id
                 ORDER BY u.username, c.name",
                [], 0
            );
            respond(['ok' => true, 'campaigns' => $camps]);
            break;

        case 'admin_update_meta':
            requireAdmin();
            $townId = (int) ($input['town_id'] ?? 0);
            $key = trim($input['key'] ?? '');
            $value = $input['value'] ?? '';
            if (!$townId || !$key) throw new Exception('Missing town_id or key');
            execute('DELETE FROM town_meta WHERE town_id = ? AND `key` = ?', [$townId, $key], 0);
            execute('INSERT INTO town_meta (town_id, `key`, value) VALUES (?, ?, ?)', [$townId, $key, $value], 0);
            respond(['ok' => true]);
            break;

        case 'admin_delete_meta':
            requireAdmin();
            $townId = (int) ($input['town_id'] ?? 0);
            $key = trim($input['key'] ?? '');
            if (!$townId || !$key) throw new Exception('Missing town_id or key');
            execute('DELETE FROM town_meta WHERE town_id = ? AND `key` = ?', [$townId, $key], 0);
            respond(['ok' => true]);
            break;

        default:
            http_response_code(400);
            respond(['error' => "Unknown action: $action"]);
    }
} catch (Exception $e) {
    http_response_code(400);
    respond(['error' => $e->getMessage()]);
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

function respond(array $data): void
{
    echo json_encode($data);
    exit;
}

function verifyTownOwnership(int $userId, int $townId, int $dbUid = 0): void
{
    if ($townId <= 0)
        throw new Exception('Invalid town ID.');
    $rows = query('SELECT id FROM towns WHERE id = ? AND user_id = ?', [$townId, $userId], $dbUid);
    if (!$rows) {
        http_response_code(403);
        respond(['error' => 'Town not found or access denied.']);
    }
}
