<?php
/**
 * Town Directory ΓÇö API Router
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
// Admin Accounts + Discord tier sync; see setup_mysql.php users migrations
try { execute('ALTER TABLE users ADD COLUMN discord_user_id VARCHAR(32) DEFAULT NULL', [], 0); } catch (Exception $e) { /* already exists */ }
try { execute('ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255) DEFAULT NULL', [], 0); } catch (Exception $e) { /* already exists */ }
try { execute('ALTER TABLE users ADD COLUMN stripe_subscription_id VARCHAR(255) DEFAULT NULL', [], 0); } catch (Exception $e) { /* already exists */ }
try { execute('ALTER TABLE users ADD COLUMN stripe_subscription_status VARCHAR(32) DEFAULT NULL', [], 0); } catch (Exception $e) { /* already exists */ }
try { execute('ALTER TABLE users ADD COLUMN subscription_ec_seed_tier VARCHAR(20) DEFAULT NULL', [], 0); } catch (Exception $e) { /* already exists */ }
try { execute('ALTER TABLE users ADD COLUMN subscription_started_at DATETIME DEFAULT NULL', [], 0); } catch (Exception $e) { /* already exists */ }
try { execute('ALTER TABLE users ADD COLUMN subscription_renews_at DATETIME DEFAULT NULL', [], 0); } catch (Exception $e) { /* already exists */ }
try {
    execute(
        'CREATE TABLE IF NOT EXISTS stripe_ec_invoice_grants (
            invoice_id VARCHAR(255) NOT NULL PRIMARY KEY,
            user_id INT NOT NULL,
            amount_raw BIGINT NOT NULL,
            tier_id VARCHAR(20) NOT NULL,
            billing_reason VARCHAR(64) DEFAULT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_stripe_ec_grants_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        [],
        0
    );
} catch (Exception $e) { /* non-fatal */ }
try { execute('ALTER TABLE users ADD COLUMN is_debug TINYINT(1) NOT NULL DEFAULT 0', [], 0); } catch (Exception $e) { /* already exists */ }
try {
    $byokRetired = query("SELECT `key` FROM site_settings WHERE `key` = 'byok_retired_v1' LIMIT 1", [], 0);
    if (!$byokRetired) {
        execute("UPDATE users SET gemini_api_key = '' WHERE TRIM(COALESCE(gemini_api_key, '')) <> ''", [], 0);
        execute("INSERT INTO site_settings (`key`, value, updated_at) VALUES ('byok_retired_v1', '1', NOW())", [], 0);
    }
} catch (Exception $e) { /* non-fatal */ }
try {
    execute(
        'CREATE TABLE IF NOT EXISTS world_maps (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            campaign_id INT NULL,
            map_image_url VARCHAR(500) DEFAULT NULL,
            map_image_width INT NOT NULL DEFAULT 0,
            map_image_height INT NOT NULL DEFAULT 0,
            miles_per_pixel DECIMAL(12,6) NOT NULL DEFAULT 1.000000,
            travel_hours_per_day DECIMAL(6,2) NOT NULL DEFAULT 8.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_world_map_user_campaign (user_id, campaign_id),
            KEY idx_world_maps_user (user_id),
            KEY idx_world_maps_campaign (campaign_id)
        )',
        [],
        0
    );
} catch (Exception $e) { /* table exists or unsupported migration */ }
try {
    execute(
        'CREATE TABLE IF NOT EXISTS world_map_locations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            campaign_id INT NULL,
            town_id INT NOT NULL,
            location_name VARCHAR(200) NOT NULL,
            x_pct DECIMAL(8,5) NOT NULL,
            y_pct DECIMAL(8,5) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_world_map_pin (user_id, campaign_id, town_id),
            KEY idx_world_map_locations_user (user_id),
            KEY idx_world_map_locations_campaign (campaign_id),
            KEY idx_world_map_locations_town (town_id)
        )',
        [],
        0
    );
} catch (Exception $e) { /* table exists or unsupported migration */ }
try {
    execute(
        'CREATE TABLE IF NOT EXISTS world_map_skipped_towns (
            user_id INT NOT NULL,
            campaign_id INT NOT NULL,
            town_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, campaign_id, town_id),
            KEY idx_wm_skip_campaign (campaign_id),
            KEY idx_wm_skip_town (town_id)
        )',
        [],
        0
    );
} catch (Exception $e) { /* already exists */ }

try {
    execute(
        'ALTER TABLE user_token_usage ADD COLUMN cost_usd DECIMAL(16,8) NOT NULL DEFAULT 0 AFTER tokens_used',
        [],
        0
    );
} catch (Exception $e) { /* column exists */
}
try {
    execute(
        'ALTER TABLE metrics_ai_calls ADD COLUMN cost_usd DECIMAL(16,8) NOT NULL DEFAULT 0 AFTER tokens',
        [],
        0
    );
} catch (Exception $e) { /* column exists */
}

$action = $_GET['action'] ?? '';
$input = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true) ?? [];
}

try {

    require_once __DIR__ . '/helpers.php';
    require_once __DIR__ . '/tier_limits.php';
    require_once __DIR__ . '/sim_prompt_lib.php';
    require_once __DIR__ . '/macro_framework_lib.php';
    require_once __DIR__ . '/user_db.php';
    ensureMacroFrameworkTables();

    switch ($action) {

        /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
           AUTH ΓÇö uses shared DB (userId=0)
           ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
        case 'register':
            $user = register($input['username'] ?? '', $input['email'] ?? '', $input['password'] ?? '');
            $payload = ['ok' => true, 'user' => $user];
            if (!empty($user['needs_verification'])) {
                $payload['needs_verification'] = true;
            }
            respond($payload);
            break;

        case 'resend_verification':
            resendVerificationEmail($input['email'] ?? '');
            respond(['ok' => true, 'message' => 'If an unverified account exists for this email, a confirmation message has been sent.']);
            break;

        /* Public ΓÇö deploy/infra smoke (no secrets). */
        case 'infra_health':
            $dbConnected = false;
            $tables = [];
            $requiredTables = [
                'users', 'campaigns', 'towns', 'characters',
                'integration_settings', 'integration_jobs',
            ];
            try {
                $pdo = getDB();
                $dbConnected = true;
                $existing = [];
                $stmt = $pdo->query('SHOW TABLES');
                while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
                    $existing[] = (string) ($row[0] ?? '');
                }
                foreach ($requiredTables as $table) {
                    $tables[$table] = in_array($table, $existing, true);
                }
            } catch (Throwable $e) {
                $dbConnected = false;
            }
            $schemaOk = $dbConnected && !in_array(false, $tables, true);
            respond([
                'ok' => true,
                'php' => PHP_VERSION,
                'db_connected' => $dbConnected,
                'schema_ok' => $schemaOk,
                'tables' => $tables,
            ]);
            break;

        /* Public ΓÇö anonymous server-side metrics ping (no auth). Each visit is one row. */
        case 'ping_visit':
            require_once __DIR__ . '/metrics_lib.php';
            $route = (string) ($input['route'] ?? 'unknown');
            $referrer = (string) ($input['referrer'] ?? ($_SERVER['HTTP_REFERER'] ?? ''));
            $u = currentUser();
            ew_record_pageview($route, $referrer, $u ? (int) $u['id'] : null);
            respond(['ok' => true]);
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
                $udata = query(
                    'SELECT subscription_tier, role, COALESCE(email_verified, 1) AS email_verified,
                            COALESCE(is_debug, 0) AS is_debug
                     FROM users WHERE id = ?',
                    [(int) $user['id']],
                    0
                );
                $user['subscription_tier'] = $udata[0]['subscription_tier'] ?? 'free';
                $user['role'] = $udata[0]['role'] ?? 'user';
                $user['email_verified'] = (int) ($udata[0]['email_verified'] ?? 1);
                $user['is_debug'] = (int) ($udata[0]['is_debug'] ?? 0) === 1;
                $tier = $user['subscription_tier'];
                $user['show_free_tier_ads'] = ($tier === 'free' && defined('ADSENSE_FREE_TIER_CLIENT') && ADSENSE_FREE_TIER_CLIENT);
                $user['adsense_client_id'] = (defined('ADSENSE_FREE_TIER_CLIENT') && ADSENSE_FREE_TIER_CLIENT) ? ADSENSE_FREE_TIER_CLIENT : '';
                $user['adsense_slot_sidebar'] = defined('ADSENSE_FREE_TIER_SLOT_SIDEBAR') ? ADSENSE_FREE_TIER_SLOT_SIDEBAR : '';
                // Get active campaign
                $camps = query('SELECT id, name, dnd_edition, description FROM campaigns WHERE user_id = ? AND is_active = 1 ORDER BY id LIMIT 1', [(int) $user['id']], 0);
                $user['active_campaign'] = $camps[0] ?? null;
            }
            respond($user ? ['ok' => true, 'user' => $user] : ['ok' => false, 'user' => null]);
            break;

        case 'get_usage':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $udata = query(
                'SELECT subscription_tier, credit_balance, stripe_subscription_status FROM users WHERE id = ?',
                [$uid],
                0
            );
            $tier = $udata[0]['subscription_tier'] ?? 'free';
            require_once __DIR__ . '/stripe_billing_lib.php';
            ew_stripe_maybe_grant_subscription_wallet_seed(
                $uid,
                ew_normalize_subscription_tier((string) $tier),
                (string) ($udata[0]['stripe_subscription_status'] ?? '')
            );
            try {
                ew_stripe_reconcile_subscription_ec_grants($uid);
            } catch (Throwable $e) { /* non-fatal */ }
            $udata = query('SELECT credit_balance FROM users WHERE id = ?', [$uid], 0);
            $creditBalance = (int) ($udata[0]['credit_balance'] ?? 0);
            $yearMonth = date('Y-m');

            // Get usage this month (for analytics display)
            $usageRows = query(
                "SELECT COALESCE(SUM(tokens_used), 0) as tokens_used, COALESCE(SUM(call_count), 0) as call_count FROM user_token_usage WHERE user_id = ? AND `year_month` = ?",
                [$uid, $yearMonth], 0
            );
            $tokensUsed = (int) ($usageRows[0]['tokens_used'] ?? 0);
            $callCount = (int) ($usageRows[0]['call_count'] ?? 0);

            $tokenLimit = ew_monthly_raw_cap_for_tier($tier);
            $percentage = ($tokenLimit > 0)
                ? (int) min(100, floor(($tokensUsed * 100) / $tokenLimit))
                : 0;

            $tierLabels = ['free' => 'Free', 'apprentice' => 'Apprentice', 'adventurer' => 'Adventurer', 'guild_master' => 'Guild Master', 'world_builder' => 'World Builder'];
            respond([
                'ok' => true,
                'tier' => $tier,
                'tier_label' => $tierLabels[$tier] ?? $tier,
                'credit_balance' => $creditBalance,
                'tokens_used_this_month' => $tokensUsed,
                'tokens_used' => $tokensUsed,
                'token_limit' => $tokenLimit,
                'percentage' => $percentage,
                'call_count' => $callCount,
                'year_month' => $yearMonth,
            ]);
            break;

        /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
           CAMPAIGNS ΓÇö multi-campaign support
           ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
        case 'campaigns':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $camps = query('SELECT id, name, dnd_edition, description, is_active, created_at FROM campaigns WHERE user_id = ? ORDER BY created_at', [$uid], 0);
            // Count towns per campaign
            foreach ($camps as &$c) {
                $cnt = query('SELECT COUNT(*) as c FROM towns WHERE campaign_id = ? AND (is_party_base = 0 OR is_party_base IS NULL)', [(int) $c['id']], $uid);
                $c['town_count'] = (int) ($cnt[0]['c'] ?? 0);
            }
            $udata = query('SELECT subscription_tier FROM users WHERE id = ?', [$uid], 0);
            $tier = ew_normalize_subscription_tier((string) ($udata[0]['subscription_tier'] ?? 'free'));
            $tierCatalog = ew_tier_public_catalog();
            foreach ($tierCatalog as &$tcRow) {
                $tcRow['monthly_raw_token_cap'] = ew_monthly_raw_cap_for_tier($tcRow['id']);
            }
            unset($tcRow);
            respond([
                'ok' => true,
                'campaigns' => $camps,
                'tier' => $tier,
                'max_campaigns' => ew_tier_max_campaigns($tier),
                'max_towns' => ew_tier_max_towns_per_campaign($tier),
                'tier_catalog' => $tierCatalog,
            ]);
            break;

        case 'subscription_catalog':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $udata = query(
                'SELECT subscription_tier, stripe_subscription_status FROM users WHERE id = ?',
                [$uid],
                0
            );
            $tier = ew_normalize_subscription_tier((string) ($udata[0]['subscription_tier'] ?? 'free'));
            require_once __DIR__ . '/stripe_billing_lib.php';
            ew_stripe_maybe_grant_subscription_wallet_seed(
                $uid,
                $tier,
                (string) ($udata[0]['stripe_subscription_status'] ?? '')
            );
            $tierCatalog = ew_tier_public_catalog();
            foreach ($tierCatalog as &$tcRow) {
                $tcRow['monthly_raw_token_cap'] = ew_monthly_raw_cap_for_tier($tcRow['id']);
            }
            unset($tcRow);
            require_once __DIR__ . '/stripe_billing_lib.php';
            $billing = ew_stripe_billing_public_status($uid);
            respond([
                'ok' => true,
                'tier' => $tier,
                'tier_catalog' => $tierCatalog,
                'billing_enabled' => $billing['billing_enabled'],
                'stripe_subscription_status' => $billing['stripe_subscription_status'],
                'has_active_subscription' => $billing['has_active_subscription'],
                'subscription_started_at' => $billing['subscription_started_at'],
                'subscription_renews_at' => $billing['subscription_renews_at'],
            ]);
            break;

        case 'billing_checkout':
            $user = requireAuth();
            $uid = (int) $user['id'];
            require_once __DIR__ . '/stripe_billing_lib.php';
            $targetTier = trim((string) ($input['tier'] ?? ''));
            if ($targetTier === '') {
                throw new Exception('Missing tier');
            }
            $result = ew_stripe_begin_checkout($uid, $targetTier);
            respond(['ok' => true, 'url' => $result['url'], 'mode' => $result['mode']]);
            break;

        case 'billing_portal':
            $user = requireAuth();
            $uid = (int) $user['id'];
            require_once __DIR__ . '/stripe_billing_lib.php';
            $result = ew_stripe_billing_portal_url($uid);
            respond(['ok' => true, 'url' => $result['url']]);
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
            $udata = query('SELECT subscription_tier FROM users WHERE id = ?', [$uid], 0);
            $tier = ew_normalize_subscription_tier((string) ($udata[0]['subscription_tier'] ?? 'free'));
            $maxCamps = ew_tier_max_campaigns($tier);
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

        /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
           TOWNS ΓÇö per-user, scoped to active campaign
           ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
        case 'towns':
            $user = requireAuth();
            $uid = (int) $user['id'];
            // Get active campaign
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;
            if ($campId) {
                ensureTownMacroRows($campId);
                $towns = query(
                    'SELECT t.id, t.name, t.subtitle, t.campaign_id, t.created_at, t.updated_at,
                            m.food_stores AS macro_food_stores,
                            m.supply_index AS macro_supply_index,
                            m.demand_index AS macro_demand_index,
                            m.stability_index AS macro_stability_index
                     FROM towns t
                     LEFT JOIN town_macro_metrics m ON m.town_id = t.id AND m.campaign_id = t.campaign_id
                     WHERE t.user_id = ? AND t.campaign_id = ? AND (t.is_party_base = 0 OR t.is_party_base IS NULL) AND (t.is_encounter_town = 0 OR t.is_encounter_town IS NULL)
                     ORDER BY t.name',
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
                $cnt = query(
                    'SELECT COUNT(*) AS c, COALESCE(SUM(CASE WHEN COALESCE(TRIM(status), \'\') = \'Deceased\' THEN 0 ELSE 1 END), 0) AS alive_c FROM characters WHERE town_id = ?',
                    [$t['id']],
                    $uid
                );
                $t['character_count'] = (int) ($cnt[0]['c'] ?? 0);
                $t['alive_character_count'] = (int) ($cnt[0]['alive_c'] ?? 0);
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
                    [$uid, $campId, 'ΓÜö∩╕Å Encounter Arena', 'System town for encounter creatures'],
                    $uid
                );
                respond(['ok' => true, 'town_id' => (int) $encTownId, 'town_name' => 'ΓÜö∩╕Å Encounter Arena']);
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
                $tier = ew_normalize_subscription_tier((string) ($udata[0]['subscription_tier'] ?? 'free'));
                $maxTowns = ew_tier_max_towns_per_campaign($tier);
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
                    [$uid, 'Party Camp', 'Home base for the adventuring party ΓÇö excluded from simulations.'],
                    $uid
                );
                $base = [['id' => $baseId, 'name' => 'Party Camp']];
            }
            respond(['ok' => true, 'party_base' => $base[0]]);
            break;

        /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
           CHARACTERS
           ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
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
                'level',
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
                require_once __DIR__ . '/tier_policy.php';
                ew_assert_free_tier_population_cap($uid, $townId, $uid);
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

        /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
               CHARACTER EQUIPMENT
               ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
        case 'get_equipment':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $charId = (int) ($_GET['character_id'] ?? 0);
            // Verify ownership through character ΓåÆ town ΓåÆ user
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

        /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
           HISTORY
           ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
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
            $entries = $input['entries'] ?? [];
            foreach ($entries as $i => $e) {
                execute(
                    'INSERT INTO history (town_id, heading, content, sort_order) VALUES (?, ?, ?, ?)',
                    [$townId, $e['heading'] ?? '', $e['content'] ?? '', $i],
                    $uid
                );
            }
            if (empty($entries)) {
                ew_sim_rolling_summary_upsert($townId, '', $uid);
            } else {
                $rebuilt = ew_sim_rebuild_rolling_summary_from_editor_entries($entries);
                ew_sim_rolling_summary_upsert($townId, $rebuilt, $uid);
            }
            respond(['ok' => true]);
            break;

        /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
           TOWN METADATA
           ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
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

        /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
           TOWN BUILDINGS & ROOMS
           ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
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
            // Verify ownership via building ΓåÆ town ΓåÆ user
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

        /* ΓöÇΓöÇ Character XP Log ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
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

        /* ΓöÇΓöÇ Add Combat XP Log Entry ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
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

        /* ΓöÇΓöÇ Calendar (per-user) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
        case 'get_calendar':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;

            if ($campId) {
                $rows = query('SELECT * FROM calendar WHERE user_id = ? AND campaign_id = ?', [$uid, $campId], $uid);
                // Legacy row stored before campaign_id existed ΓÇö attach to active campaign once
                if (empty($rows)) {
                    $legacy = query('SELECT * FROM calendar WHERE user_id = ? AND campaign_id IS NULL LIMIT 1', [$uid], $uid);
                    if (!empty($legacy)) {
                        try {
                            execute('UPDATE calendar SET campaign_id = ? WHERE id = ?', [$campId, (int) $legacy[0]['id']], $uid);
                        } catch (Exception $e) { /* unique conflict ΓÇö ignore, fall through to orphan rescue */ }
                        $rows = query('SELECT * FROM calendar WHERE user_id = ? AND campaign_id = ?', [$uid, $campId], $uid);
                    }
                }
                // Legacy single-row rescue: legacy schema had PRIMARY KEY on user_id, so there's
                // only ONE calendar row per user. If campaign_id is stale, reattach to active
                // campaign. Only do this when the user has exactly ONE calendar row total ΓÇö once
                // they have multiple (post-PK migration), each campaign keeps its own row.
                if (empty($rows)) {
                    $allRows = query('SELECT * FROM calendar WHERE user_id = ? ORDER BY id ASC', [$uid], $uid);
                    if (count($allRows) === 1) {
                        try {
                            execute('UPDATE calendar SET campaign_id = ? WHERE id = ?', [$campId, (int) $allRows[0]['id']], $uid);
                        } catch (Exception $e) { /* ignore */ }
                        $rows = query('SELECT * FROM calendar WHERE user_id = ? AND campaign_id = ?', [$uid, $campId], $uid);
                    }
                }
            } else {
                $rows = query('SELECT * FROM calendar WHERE user_id = ? AND campaign_id IS NULL', [$uid], $uid);
                if (empty($rows)) {
                    $rows = query('SELECT * FROM calendar WHERE user_id = ? ORDER BY id ASC LIMIT 1', [$uid], $uid);
                }
            }
            $cal = $rows[0] ?? [
                'current_year' => 0,
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

            $defaultWeekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            $defaultWeekAbbrev = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
            $dow = (int) ($cal['days_per_week'] ?? 7);
            $dow = max(1, min(14, $dow));
            $cal['days_per_week'] = $dow;
            $wn = json_decode($cal['weekday_names'] ?? '', true);
            $wa = json_decode($cal['weekday_abbrev'] ?? '', true);
            if (!is_array($wn)) {
                $wn = [];
            }
            if (!is_array($wa)) {
                $wa = [];
            }
            if (count($wn) === 0 && count($wa) === 0) {
                $wn = array_slice($defaultWeekNames, 0, min(7, $dow));
                $wa = array_slice($defaultWeekAbbrev, 0, min(7, $dow));
            }
            while (count($wn) < $dow) {
                $wn[] = 'Day ' . (count($wn) + 1);
            }
            while (count($wa) < $dow) {
                $wa[] = 'D' . (count($wa) + 1);
            }
            $cal['weekday_names'] = array_slice(array_values($wn), 0, $dow);
            $cal['weekday_abbrev'] = array_slice(array_values($wa), 0, $dow);

            respond(['ok' => true, 'calendar' => $cal]);
            break;

        case 'calendar_weather_moon':
            $user = requireAuth();
            $uid = (int) $user['id'];
            require_once __DIR__ . '/calendar_display_lib.php';
            require_once __DIR__ . '/weather_daily_lib.php';

            $townId = (int) ($_GET['town_id'] ?? $input['town_id'] ?? 0);
            $year = (int) ($_GET['year'] ?? $input['year'] ?? 0);
            $month = max(1, (int) ($_GET['month'] ?? $input['month'] ?? 1));
            $lunarCycle = max(4, min(64, (int) ($_GET['lunar_cycle_days'] ?? $input['lunar_cycle_days'] ?? 28)));

            if ($townId <= 0) {
                throw new Exception('Missing town_id.');
            }
            verifyTownOwnership($uid, $townId, $uid);

            $cal = ew_calendar_load_for_user($uid);
            $mpy = (int) ($cal['months_per_year'] ?? 12);
            $month = min($month, $mpy);
            $dpm = $cal['days_per_month'];
            if (!is_array($dpm)) {
                $dpm = array_fill(0, $mpy, 30);
            }
            $dim = (int) ($dpm[$month - 1] ?? 30);
            $monthNames = $cal['month_names'];
            $monthName = $monthNames[$month - 1] ?? "Month {$month}";
            $dpw = (int) ($cal['days_per_week'] ?? 7);

            $metaRows = query('SELECT `key`, value FROM town_meta WHERE town_id = ?', [$townId], $uid);
            $townMeta = [];
            foreach ($metaRows as $m) {
                $townMeta[$m['key']] = $m['value'];
            }

            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : 0;

            $weatherData = null;
            $weatherSource = 'none';
            if ($campId > 0) {
                $worldRows = query(
                    'SELECT value_json FROM integration_settings WHERE user_id = ? AND campaign_id = ? AND key_name = ? LIMIT 1',
                    [$uid, $campId, 'world_weather_year'],
                    0
                );
                if (!empty($worldRows[0]['value_json'])) {
                    $worldPayload = json_decode($worldRows[0]['value_json'], true);
                    $weatherData = ew_weather_from_integration_value($worldPayload);
                    if ($weatherData) {
                        $weatherSource = 'campaign_world';
                    }
                }
            }
            if (!$weatherData) {
                $weatherJson = $townMeta['weather_year'] ?? '';
                $legacy = $weatherJson ? json_decode($weatherJson, true) : null;
                if (is_array($legacy) && !empty($legacy['months'])) {
                    $weatherData = $legacy;
                    $weatherSource = 'town_legacy';
                }
            }
            $curMonthWeather = null;
            if ($weatherData && !empty($weatherData['months'])) {
                foreach ($weatherData['months'] as $wm) {
                    if ((int) ($wm['month'] ?? 0) === $month) {
                        $curMonthWeather = $wm;
                        break;
                    }
                }
            }

            $cy = (int) ($cal['current_year'] ?? 0);
            $cm = (int) ($cal['current_month'] ?? 1);
            $cd = (int) ($cal['current_day'] ?? 1);

            $absFirst = ew_calendar_absolute_day($year, $month, 1, $dpm, $mpy);
            $leading = (($absFirst - 1) % $dpw + $dpw) % $dpw;

            $locY = null;
            if ($campId > 0) {
                $locRows = query(
                    'SELECT y_pct FROM world_map_locations WHERE user_id = ? AND campaign_id = ? AND town_id = ? LIMIT 1',
                    [$uid, $campId, $townId],
                    0
                );
            } else {
                $locRows = query(
                    'SELECT y_pct FROM world_map_locations WHERE user_id = ? AND campaign_id IS NULL AND town_id = ? LIMIT 1',
                    [$uid, $townId],
                    0
                );
            }
            if (!empty($locRows[0]['y_pct'])) {
                $locY = (float) $locRows[0]['y_pct'];
            }
            if ($curMonthWeather) {
                $curMonthWeather = ew_weather_localize_month_for_town($curMonthWeather, $locY, (string) ($townMeta['biome'] ?? ''));
            }

            $daysOut = [];
            for ($d = 1; $d <= $dim; $d++) {
                $abs = ew_calendar_absolute_day($year, $month, $d, $dpm, $mpy);
                $moon = ew_moon_phase_for_absolute_day($abs, $lunarCycle);
                $weatherItem = null;
                if ($curMonthWeather) {
                    $dw = ew_weather_build_daily_context($curMonthWeather, $townId, $year, $month, $d, $dim, 0);
                    $det = $dw['detail'];
                    $weatherItem = [
                        'temp_display' => $det['temp_display'],
                        'precipitation' => $det['precipitation'],
                        'wind' => $det['wind'],
                        'odd_event' => $det['odd_event'],
                        'summary' => trim(($det['temp_display'] ?? '') . ' ┬╖ ' . ($det['precipitation'] ?? '') . ', ' . ($det['wind'] ?? '')),
                    ];
                }
                $daysOut[] = [
                    'day' => $d,
                    'is_today' => ($year === $cy && $month === $cm && $d === $cd),
                    'weather' => $weatherItem,
                    'moon' => $moon,
                ];
            }

            respond([
                'ok' => true,
                'town_id' => $townId,
                'year' => $year,
                'month' => $month,
                'month_name' => $monthName,
                'days_in_month' => $dim,
                'months_per_year' => $mpy,
                'days_per_week' => $dpw,
                'weekday_abbrev' => $cal['weekday_abbrev'],
                'grid_leading_blanks' => $leading,
                'has_weather_year' => $curMonthWeather !== null,
                'weather_source' => $weatherSource,
                'lunar_cycle_days' => $lunarCycle,
                'days' => $daysOut,
            ]);
            break;

        case 'save_calendar':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;

            $c = $input['calendar'] ?? [];
            $monthNames = $c['month_names'] ?? [];
            $weekdayNames = $c['weekday_names'] ?? [];
            $weekdayAbbrev = $c['weekday_abbrev'] ?? [];
            $daysPerWeek = max(1, min(14, (int) ($c['days_per_week'] ?? 7)));
            execute(
                'INSERT INTO calendar (user_id, campaign_id, current_year, current_month, current_day, era_name, months_per_year, month_names, days_per_month, days_per_week, weekday_names, weekday_abbrev)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    current_year=VALUES(current_year), current_month=VALUES(current_month),
                    current_day=VALUES(current_day), era_name=VALUES(era_name),
                    months_per_year=VALUES(months_per_year), month_names=VALUES(month_names),
                    days_per_month=VALUES(days_per_month),
                    days_per_week=VALUES(days_per_week), weekday_names=VALUES(weekday_names), weekday_abbrev=VALUES(weekday_abbrev)',
                [
                    $uid,
                    $campId,
                    (int) ($c['current_year'] ?? 0),
                    (int) ($c['current_month'] ?? 1),
                    (int) ($c['current_day'] ?? 1),
                    trim($c['era_name'] ?? 'DR'),
                    (int) ($c['months_per_year'] ?? 12),
                    json_encode(array_values($monthNames)),
                    is_array($c['days_per_month'] ?? null) ? json_encode(array_values($c['days_per_month'])) : (string)((int)($c['days_per_month'] ?? 30)),
                    $daysPerWeek,
                    json_encode(array_values(is_array($weekdayNames) ? $weekdayNames : [])),
                    json_encode(array_values(is_array($weekdayAbbrev) ? $weekdayAbbrev : [])),
                ],
                $uid
            );
            respond(['ok' => true]);
            break;

        /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
           SRD REFERENCE ΓÇö each edition has its own database
           Pass ?edition=5e to override, otherwise uses campaign/user setting
           ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
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

        /* ΓöÇΓöÇ Campaign Rules & Description ΓÇö per-campaign ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
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

            // Upsert by (user_id, campaign_id) ΓÇö must handle NULL campaign_id explicitly
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
                // No row exists at all ΓÇö insert fresh
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

        /* ΓöÇΓöÇ Site Settings (per-user) ΓÇö global user prefs only ΓöÇΓöÇ */
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
            // Legacy keys ignored (community NPC pool is always on).
            if (in_array($settingKey, ['npc_sheet_pool_opt_in', 'use_community_npc_intake'], true)) {
                respond(['ok' => true]);
                break;
            }
            $allowed = ['dnd_edition', 'xp_speed', 'npc_xp_speed'];
            if (!in_array($settingKey, $allowed))
                throw new Exception("Invalid setting: $settingKey");
            execute("UPDATE users SET {$settingKey} = ? WHERE id = ?", [$value, $uid], 0);
            respond(['ok' => true]);
            break;

        /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
           ENCOUNTER SYSTEM
           ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */

        // ΓöÇΓöÇ Party (persistent) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

        // ΓöÇΓöÇ Encounters ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

        // ΓöÇΓöÇ Encounter Groups ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

        // ΓöÇΓöÇ Encounter Participants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

        /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
           SOCIAL SYSTEMS
           ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */

        // ΓöÇΓöÇ Bulk fetch all social data for a town ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

        // ΓöÇΓöÇ Character Relationships ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

        // ΓöÇΓöÇ Family Tree ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

        // ΓöÇΓöÇ Character Memories ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

        // ΓöÇΓöÇ Factions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

        // ΓöÇΓöÇ Town Incidents ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

        // ΓöÇΓöÇ PC Reputation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

        // ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
        // Phase 1: Spellcasting System
        // ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

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

        // ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
        // Phase 1: Active Effects (Conditions/Buffs)
        // ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

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

        // ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
        // Phase 1: Level History (Multiclassing)
        // ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

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

        // ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
        // Phase 1: Structured Level Up
        // ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

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

        /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
           MOVE CHARACTER BETWEEN TOWNS
           ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
        /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
           BUG REPORTS ΓÇö Discord webhook
           ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
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

            // Optional travel estimate context from world map pins.
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;
            $travel = null;
            if ($campId) {
                $mapRows = query(
                    'SELECT miles_per_pixel, travel_hours_per_day FROM world_maps WHERE user_id = ? AND campaign_id = ? LIMIT 1',
                    [$uid, $campId],
                    0
                );
                if ($mapRows) {
                    $map = $mapRows[0];
                    $pins = query(
                        'SELECT town_id, x_pct, y_pct FROM world_map_locations WHERE user_id = ? AND campaign_id = ? AND town_id IN (?, ?)',
                        [$uid, $campId, $fromTownId, $toTownId],
                        0
                    );
                    if (count($pins) === 2) {
                        $byTown = [];
                        foreach ($pins as $p) {
                            $byTown[(int) $p['town_id']] = $p;
                        }
                        if (isset($byTown[$fromTownId]) && isset($byTown[$toTownId])) {
                            $dx = (float) $byTown[$toTownId]['x_pct'] - (float) $byTown[$fromTownId]['x_pct'];
                            $dy = (float) $byTown[$toTownId]['y_pct'] - (float) $byTown[$fromTownId]['y_pct'];
                            $pixelDistance = sqrt(($dx * $dx) + ($dy * $dy)) * 1000.0;
                            $milesPerPixel = max(0.000001, (float) $map['miles_per_pixel']);
                            $hoursPerDay = max(1.0, (float) $map['travel_hours_per_day']);
                            $miles = $pixelDistance * $milesPerPixel;
                            $days = $miles / (24.0 * ($hoursPerDay / 8.0));
                            $travel = [
                                'distance_miles' => round($miles, 2),
                                'travel_days' => round($days, 2),
                            ];
                        }
                    }
                }
            }

            respond([
                'ok' => true,
                'message' => "{$charRow[0]['name']} moved to new town.",
                'character_id' => $charId,
                'to_town_id' => $toTownId,
                'travel' => $travel,
            ]);
            break;

        case 'get_world_map':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;

            $mapRows = $campId
                ? query(
                    'SELECT map_image_url, map_image_width, map_image_height, miles_per_pixel, travel_hours_per_day FROM world_maps WHERE user_id = ? AND campaign_id = ? LIMIT 1',
                    [$uid, $campId],
                    0
                )
                : [];
            $map = $mapRows ? $mapRows[0] : null;
            $locations = $campId
                ? query(
                    'SELECT l.id, l.town_id, l.location_name, l.x_pct, l.y_pct, t.name AS town_name
                     FROM world_map_locations l
                     LEFT JOIN towns t ON t.id = l.town_id
                     WHERE l.user_id = ? AND l.campaign_id = ?
                     ORDER BY l.location_name',
                    [$uid, $campId],
                    0
                )
                : [];
            $skippedRows = $campId
                ? query(
                    'SELECT town_id FROM world_map_skipped_towns WHERE user_id = ? AND campaign_id = ?',
                    [$uid, $campId],
                    0
                )
                : [];
            $skippedTownIds = array_map(fn($r) => (int) $r['town_id'], $skippedRows ?: []);

            respond([
                'ok' => true,
                'campaign_id' => $campId,
                'map' => $map,
                'locations' => $locations,
                'skipped_town_ids' => $skippedTownIds,
            ]);
            break;

        case 'save_world_map_settings':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;
            if (!$campId)
                throw new Exception('No active campaign selected.');

            $mapImageUrl = trim((string) ($input['map_image_url'] ?? ''));
            $width = (int) ($input['map_image_width'] ?? 0);
            $height = (int) ($input['map_image_height'] ?? 0);
            $milesPerPixel = max(0.000001, (float) ($input['miles_per_pixel'] ?? 1));
            $hoursPerDay = max(1.0, (float) ($input['travel_hours_per_day'] ?? 8));

            $existing = query('SELECT id FROM world_maps WHERE user_id = ? AND campaign_id = ? LIMIT 1', [$uid, $campId], 0);
            if ($existing) {
                execute(
                    'UPDATE world_maps SET map_image_url = ?, map_image_width = ?, map_image_height = ?, miles_per_pixel = ?, travel_hours_per_day = ?, updated_at = NOW() WHERE id = ?',
                    [$mapImageUrl ?: null, $width, $height, $milesPerPixel, $hoursPerDay, (int) $existing[0]['id']],
                    0
                );
            } else {
                execute(
                    'INSERT INTO world_maps (user_id, campaign_id, map_image_url, map_image_width, map_image_height, miles_per_pixel, travel_hours_per_day) VALUES (?,?,?,?,?,?,?)',
                    [$uid, $campId, $mapImageUrl ?: null, $width, $height, $milesPerPixel, $hoursPerDay],
                    0
                );
            }

            respond(['ok' => true]);
            break;

        case 'set_world_map_town_skip':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;
            if (!$campId)
                throw new Exception('No active campaign selected.');
            $townId = (int) ($input['town_id'] ?? 0);
            $skip = !empty($input['skip']);
            if (!$townId)
                throw new Exception('Town is required.');
            verifyTownOwnership($uid, $townId, $uid);
            if ($skip) {
                execute(
                    'DELETE FROM world_map_locations WHERE user_id = ? AND campaign_id = ? AND town_id = ?',
                    [$uid, $campId, $townId],
                    0
                );
                execute(
                    'INSERT INTO world_map_skipped_towns (user_id, campaign_id, town_id) VALUES (?,?,?)
                     ON DUPLICATE KEY UPDATE town_id = town_id',
                    [$uid, $campId, $townId],
                    0
                );
            } else {
                execute(
                    'DELETE FROM world_map_skipped_towns WHERE user_id = ? AND campaign_id = ? AND town_id = ?',
                    [$uid, $campId, $townId],
                    0
                );
            }
            respond(['ok' => true, 'town_id' => $townId, 'skip' => $skip]);
            break;

        case 'apply_world_map_calibration':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;
            if (!$campId)
                throw new Exception('No active campaign selected.');
            $x1 = (float) ($input['x1_pct'] ?? -1);
            $y1 = (float) ($input['y1_pct'] ?? -1);
            $x2 = (float) ($input['x2_pct'] ?? -1);
            $y2 = (float) ($input['y2_pct'] ?? -1);
            $miles = (float) ($input['miles'] ?? 0);
            foreach ([$x1, $y1, $x2, $y2] as $v) {
                if ($v < 0 || $v > 100)
                    throw new Exception('Calibration points must use positions on the map (0ΓÇô100%).');
            }
            if ($miles <= 0)
                throw new Exception('Enter a positive distance in miles.');
            $dx = $x2 - $x1;
            $dy = $y2 - $y1;
            $pixelDistance = sqrt(($dx * $dx) + ($dy * $dy)) * 1000.0;
            if ($pixelDistance <= 0)
                throw new Exception('Pick two different points on the map.');
            $milesPerPixel = $miles / $pixelDistance;

            $existing = query('SELECT id FROM world_maps WHERE user_id = ? AND campaign_id = ? LIMIT 1', [$uid, $campId], 0);
            if ($existing) {
                execute(
                    'UPDATE world_maps SET miles_per_pixel = ?, updated_at = NOW() WHERE id = ?',
                    [max(0.000001, $milesPerPixel), (int) $existing[0]['id']],
                    0
                );
            } else {
                throw new Exception('Upload and save a world map image before calibrating.');
            }
            respond([
                'ok' => true,
                'miles_per_pixel' => round($milesPerPixel, 8),
                'segment_map_units' => round($pixelDistance, 4),
            ]);
            break;

        case 'save_world_map_pin':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;
            if (!$campId)
                throw new Exception('No active campaign selected.');

            $townId = (int) ($input['town_id'] ?? 0);
            $x = (float) ($input['x_pct'] ?? -1);
            $y = (float) ($input['y_pct'] ?? -1);
            if (!$townId)
                throw new Exception('Town is required.');
            if ($x < 0 || $x > 100 || $y < 0 || $y > 100)
                throw new Exception('Pin coordinates must be between 0 and 100.');

            verifyTownOwnership($uid, $townId, $uid);
            execute(
                'DELETE FROM world_map_skipped_towns WHERE user_id = ? AND campaign_id = ? AND town_id = ?',
                [$uid, $campId, $townId],
                0
            );
            $townRows = query('SELECT name FROM towns WHERE id = ? LIMIT 1', [$townId], $uid);
            $townName = $townRows ? (string) $townRows[0]['name'] : ('Town #' . $townId);

            $existing = query(
                'SELECT id FROM world_map_locations WHERE user_id = ? AND campaign_id = ? AND town_id = ? LIMIT 1',
                [$uid, $campId, $townId],
                0
            );
            if ($existing) {
                execute(
                    'UPDATE world_map_locations SET location_name = ?, x_pct = ?, y_pct = ?, updated_at = NOW() WHERE id = ?',
                    [$townName, $x, $y, (int) $existing[0]['id']],
                    0
                );
            } else {
                execute(
                    'INSERT INTO world_map_locations (user_id, campaign_id, town_id, location_name, x_pct, y_pct) VALUES (?,?,?,?,?,?)',
                    [$uid, $campId, $townId, $townName, $x, $y],
                    0
                );
            }

            respond(['ok' => true, 'town_id' => $townId, 'location_name' => $townName, 'x_pct' => $x, 'y_pct' => $y]);
            break;

        case 'delete_world_map_pin':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;
            if (!$campId)
                throw new Exception('No active campaign selected.');
            $townId = (int) ($input['town_id'] ?? 0);
            if (!$townId)
                throw new Exception('Town is required.');
            execute(
                'DELETE FROM world_map_locations WHERE user_id = ? AND campaign_id = ? AND town_id = ?',
                [$uid, $campId, $townId],
                0
            );
            respond(['ok' => true]);
            break;

        case 'estimate_travel_time':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $fromTownId = (int) ($_GET['from_town_id'] ?? ($input['from_town_id'] ?? 0));
            $toTownId = (int) ($_GET['to_town_id'] ?? ($input['to_town_id'] ?? 0));
            if (!$fromTownId || !$toTownId || $fromTownId === $toTownId)
                throw new Exception('Valid source and destination towns are required.');
            verifyTownOwnership($uid, $fromTownId, $uid);
            verifyTownOwnership($uid, $toTownId, $uid);

            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;
            if (!$campId)
                throw new Exception('No active campaign selected.');

            $mapRows = query(
                'SELECT miles_per_pixel, travel_hours_per_day FROM world_maps WHERE user_id = ? AND campaign_id = ? LIMIT 1',
                [$uid, $campId],
                0
            );
            if (!$mapRows)
                throw new Exception('No world map configured for this campaign yet.');

            $skipRows = query(
                'SELECT town_id FROM world_map_skipped_towns WHERE user_id = ? AND campaign_id = ? AND town_id IN (?, ?)',
                [$uid, $campId, $fromTownId, $toTownId],
                0
            );
            if (!empty($skipRows)) {
                throw new Exception('One or both towns are set to ΓÇ£not on map.ΓÇ¥ Turn that off for those towns or place pins to estimate travel.');
            }

            $pins = query(
                'SELECT town_id, x_pct, y_pct FROM world_map_locations WHERE user_id = ? AND campaign_id = ? AND town_id IN (?, ?)',
                [$uid, $campId, $fromTownId, $toTownId],
                0
            );
            if (count($pins) !== 2)
                throw new Exception('Both towns must be pinned on the world map.');
            $byTown = [];
            foreach ($pins as $p) {
                $byTown[(int) $p['town_id']] = $p;
            }
            if (!isset($byTown[$fromTownId]) || !isset($byTown[$toTownId]))
                throw new Exception('Could not resolve map pins for both towns.');

            $dx = (float) $byTown[$toTownId]['x_pct'] - (float) $byTown[$fromTownId]['x_pct'];
            $dy = (float) $byTown[$toTownId]['y_pct'] - (float) $byTown[$fromTownId]['y_pct'];
            $pixelDistance = sqrt(($dx * $dx) + ($dy * $dy)) * 1000.0;

            $milesPerPixel = max(0.000001, (float) $mapRows[0]['miles_per_pixel']);
            $hoursPerDay = max(1.0, (float) $mapRows[0]['travel_hours_per_day']);
            $miles = $pixelDistance * $milesPerPixel;
            $daysAt24 = $miles / 24.0;
            $daysAdjusted = $daysAt24 / ($hoursPerDay / 8.0);

            respond([
                'ok' => true,
                'from_town_id' => $fromTownId,
                'to_town_id' => $toTownId,
                'distance_miles' => round($miles, 2),
                'travel_days' => round($daysAdjusted, 2),
                'travel_hours_per_day' => round($hoursPerDay, 2),
                'miles_per_pixel' => round($milesPerPixel, 6),
            ]);
            break;

        /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
           ADMIN ΓÇö Requires admin role
           (Primary admin handlers are further below in the
            "cross-account database management" section)
           ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */

        case 'admin_token_usage':
            requireAdmin();
            try {
                $rows = query(
                    'SELECT u.username, t.user_id, t.`year_month`, t.feature_key, t.tokens_used,
                            COALESCE(t.cost_usd, 0) AS cost_usd, t.call_count
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

        /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
           CAMPAIGN RULES ΓÇö World Context for AI (per-campaign)
           ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
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

        /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
           CUSTOM CONTENT ΓÇö Homebrew SRD (per-user SQLite DB)
           Each user gets their own content.db file.
           ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
        case 'get_custom_content':
            $user = requireAuth();
            $uid = (int) $user['id'];
            // Get active campaign from shared MySQL
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;

            $result = [];
            $tables = ['custom_races', 'custom_classes', 'custom_feats', 'custom_spells', 'custom_equipment', 'custom_monsters'];
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

        case 'save_custom_monster':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $d = $input['monster'] ?? [];
            $itemId = (int) ($d['id'] ?? 0);
            $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
            $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;

            if ($itemId > 0) {
                userExecute($uid, 'UPDATE custom_monsters SET name=?, cr=?, type_line=?, hit_dice=?, armor_class=?, abilities=?, stat_summary=? WHERE id=?', [
                    trim($d['name'] ?? ''),
                    trim($d['cr'] ?? '1'),
                    trim($d['type_line'] ?? ''),
                    trim($d['hit_dice'] ?? '2d8'),
                    trim($d['armor_class'] ?? '14'),
                    trim($d['abilities'] ?? ''),
                    trim($d['stat_summary'] ?? ''),
                    $itemId
                ]);
                respond(['ok' => true, 'id' => $itemId]);
            } else {
                $name = trim($d['name'] ?? '');
                if (!$name) throw new Exception('Monster name is required.');
                $newId = userInsert($uid,
                    'INSERT INTO custom_monsters (campaign_id, name, cr, type_line, hit_dice, armor_class, abilities, stat_summary) VALUES (?,?,?,?,?,?,?,?)',
                    [$campId, $name, trim($d['cr'] ?? '1'), trim($d['type_line'] ?? ''),
                     trim($d['hit_dice'] ?? '2d8'), trim($d['armor_class'] ?? '14'),
                     trim($d['abilities'] ?? ''), trim($d['stat_summary'] ?? '')]
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
            $validTypes = ['custom_races', 'custom_classes', 'custom_feats', 'custom_spells', 'custom_equipment', 'custom_monsters'];
            if (!in_array($contentType, $validTypes)) throw new Exception('Invalid content_type.');
            userExecute($uid, "DELETE FROM $contentType WHERE id = ?", [$contentId]);
            respond(['ok' => true]);
            break;

        /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
           USER FILES ΓÇö Per-account content library (SQLite)
           ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
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
            $tier = ew_normalize_subscription_tier((string) ($udata[0]['subscription_tier'] ?? 'free'));
            $lim = ew_tier_limits_for_user_tier($tier);
            respond([
                'ok' => true,
                'files' => $files,
                'storage_used' => $totalSize,
                'storage_limit' => $lim['content_max_storage_bytes'],
                'file_count' => count($files),
                'file_limit' => $lim['content_max_files'],
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

        /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
           ADMIN ΓÇö cross-account database management
           ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */

        case 'admin_metrics':
            requireAdmin();
            $period = max(7, min(180, (int) ($_GET['period'] ?? 30)));
            $today = date('Y-m-d');
            $start = date('Y-m-d', strtotime("-" . ($period - 1) . " days"));

            // Helper ΓÇö fill missing days with zero so chart x-axis is contiguous.
            $fillDays = function (array $rows, string $valueKey) use ($period) {
                $byDay = [];
                foreach ($rows as $r) {
                    $byDay[$r['day']] = (int) $r[$valueKey];
                }
                $out = [];
                for ($i = $period - 1; $i >= 0; $i--) {
                    $d = date('Y-m-d', strtotime("-{$i} days"));
                    $out[] = ['day' => $d, 'value' => $byDay[$d] ?? 0];
                }
                return $out;
            };

            // Daily unique visitors (anon + logged-in dedupe via visitor_hash) ----------
            try {
                $vRows = query(
                    "SELECT DATE(day) AS day, COUNT(DISTINCT visitor_hash) AS c
                     FROM metrics_pageviews
                     WHERE day >= ?
                     GROUP BY day",
                    [$start], 0
                );
                $dailyVisitors = $fillDays($vRows, 'c');
            } catch (Throwable $e) { $dailyVisitors = []; }

            // Daily signups -----------------------------------------------------------
            $sRows = query(
                "SELECT DATE(created_at) AS day, COUNT(*) AS c
                 FROM users
                 WHERE created_at >= ?
                 GROUP BY DATE(created_at)",
                [$start . ' 00:00:00'], 0
            );
            $dailySignups = $fillDays($sRows, 'c');

            // Daily AI tokens ---------------------------------------------------------
            try {
                $tRows = query(
                    "SELECT day, SUM(tokens) AS c
                     FROM metrics_ai_calls
                     WHERE day >= ?
                     GROUP BY day",
                    [$start], 0
                );
                $dailyTokens = $fillDays($tRows, 'c');
            } catch (Throwable $e) { $dailyTokens = []; }

            // Daily OpenRouter-reported USD (same window as tokens)
            try {
                $costRows = query(
                    "SELECT day, SUM(cost_usd) AS c
                     FROM metrics_ai_calls
                     WHERE day >= ?
                     GROUP BY day",
                    [$start], 0
                );
                $fillDaysUsd = function (array $rows, string $valueKey) use ($period) {
                    $byDay = [];
                    foreach ($rows as $r) {
                        $byDay[$r['day']] = (float) $r[$valueKey];
                    }
                    $out = [];
                    for ($i = $period - 1; $i >= 0; $i--) {
                        $d = date('Y-m-d', strtotime("-{$i} days"));
                        $out[] = ['day' => $d, 'value' => $byDay[$d] ?? 0.0];
                    }
                    return $out;
                };
                $dailyCostUsd = $fillDaysUsd($costRows, 'c');
            } catch (Throwable $e) { $dailyCostUsd = []; }

            // Tier breakdown ----------------------------------------------------------
            $tiers = query(
                "SELECT subscription_tier AS tier, COUNT(*) AS c FROM users GROUP BY subscription_tier",
                [], 0
            );
            $tierBreakdown = [];
            foreach ($tiers as $t) {
                $tierBreakdown[$t['tier'] ?: 'free'] = (int) $t['c'];
            }

            // Verification funnel -----------------------------------------------------
            $totalUsers = (int) (query('SELECT COUNT(*) AS c FROM users', [], 0)[0]['c'] ?? 0);
            $verified = (int) (query('SELECT COUNT(*) AS c FROM users WHERE COALESCE(email_verified,1) = 1', [], 0)[0]['c'] ?? 0);
            $firstAi = (int) (query('SELECT COUNT(DISTINCT user_id) AS c FROM user_token_usage', [], 0)[0]['c'] ?? 0);
            $paidAny = (int) (query("SELECT COUNT(*) AS c FROM users WHERE subscription_tier IS NOT NULL AND subscription_tier <> 'free'", [], 0)[0]['c'] ?? 0);
            $verificationFunnel = [
                'signups' => $totalUsers,
                'verified' => $verified,
                'first_ai_call' => $firstAi,
                'paid' => $paidAny,
            ];

            // Abuse log (last 7 days, non-success) -----------------------------------
            try {
                $abuse = query(
                    "SELECT DATE(created_at) AS day, outcome, email_domain, ip, created_at
                     FROM signup_attempts
                     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                       AND outcome IS NOT NULL
                       AND outcome NOT IN ('success', 'pending_verify', 'pending', 'unknown')
                     ORDER BY id DESC
                     LIMIT 200",
                    [], 0
                );
                $abuseAgg = query(
                    "SELECT outcome, COUNT(*) AS c
                     FROM signup_attempts
                     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                       AND outcome IS NOT NULL AND outcome <> 'unknown'
                     GROUP BY outcome
                     ORDER BY c DESC",
                    [], 0
                );
            } catch (Throwable $e) {
                $abuse = [];
                $abuseAgg = [];
            }

            // Feature usage (current month) ------------------------------------------
            $ym = date('Y-m');
            $featureUsage = query(
                "SELECT feature_key,
                        COALESCE(SUM(tokens_used),0) AS tokens,
                        COALESCE(SUM(cost_usd),0) AS cost_usd,
                        COALESCE(SUM(call_count),0) AS calls
                 FROM user_token_usage
                 WHERE `year_month` = ?
                 GROUP BY feature_key
                 ORDER BY calls DESC",
                [$ym], 0
            );

            // Retention (last 6 weeks) -----------------------------------------------
            // For each cohort week, % of users who returned in week+1, +2, +3, +4.
            try {
                $cohorts = [];
                for ($w = 5; $w >= 0; $w--) {
                    $weekStart = date('Y-m-d', strtotime("monday this week -{$w} weeks"));
                    $weekEnd = date('Y-m-d', strtotime($weekStart . ' +6 days'));
                    $cohortUsers = query(
                        "SELECT id FROM users WHERE created_at BETWEEN ? AND ?",
                        [$weekStart . ' 00:00:00', $weekEnd . ' 23:59:59'], 0
                    );
                    $cohortIds = array_map(fn($r) => (int) $r['id'], $cohortUsers);
                    $size = count($cohortIds);
                    $row = ['week_start' => $weekStart, 'size' => $size, 'w1' => null, 'w2' => null, 'w3' => null, 'w4' => null];
                    if ($size > 0) {
                        $idsPh = implode(',', array_fill(0, $size, '?'));
                        for ($n = 1; $n <= 4; $n++) {
                            $rangeStart = date('Y-m-d', strtotime($weekStart . " +" . ($n * 7) . " days"));
                            $rangeEnd = date('Y-m-d', strtotime($rangeStart . ' +6 days'));
                            // Skip future windows
                            if ($rangeStart > $today) {
                                $row["w{$n}"] = null;
                                continue;
                            }
                            $params = array_merge([$rangeStart, $rangeEnd . ' 23:59:59'], $cohortIds);
                            try {
                                $back = query(
                                    "SELECT COUNT(DISTINCT user_id) AS c FROM metrics_pageviews
                                     WHERE day BETWEEN ? AND ? AND user_id IN ($idsPh)",
                                    $params, 0
                                );
                                $row["w{$n}"] = (int) ($back[0]['c'] ?? 0);
                            } catch (Throwable $e) {
                                $row["w{$n}"] = null;
                            }
                        }
                    }
                    $cohorts[] = $row;
                }
            } catch (Throwable $e) { $cohorts = []; }

            respond([
                'ok' => true,
                'period_days' => $period,
                'daily_visitors' => $dailyVisitors,
                'daily_signups' => $dailySignups,
                'daily_tokens' => $dailyTokens,
                'daily_cost_usd' => $dailyCostUsd ?? [],
                'tier_breakdown' => $tierBreakdown,
                'verification_funnel' => $verificationFunnel,
                'feature_usage' => $featureUsage,
                'abuse_log' => $abuse,
                'abuse_aggregate' => $abuseAgg,
                'retention_cohorts' => $cohorts,
            ]);
            break;

        case 'admin_overview':
            requireAdmin();
            $totalUsers = query('SELECT COUNT(*) as c FROM users', [], 0)[0]['c'] ?? 0;
            $totalTowns = query('SELECT COUNT(*) as c FROM towns', [], 0)[0]['c'] ?? 0;
            $totalChars = query('SELECT COUNT(*) as c FROM characters', [], 0)[0]['c'] ?? 0;
            $totalCamps = query('SELECT COUNT(*) as c FROM campaigns', [], 0)[0]['c'] ?? 0;
            $ym = date('Y-m');
            $monthlyTokens = query("SELECT COALESCE(SUM(tokens_used),0) as t FROM user_token_usage WHERE `year_month` = ?", [$ym], 0)[0]['t'] ?? 0;
            $monthlyCalls = query("SELECT COALESCE(SUM(call_count),0) as c FROM user_token_usage WHERE `year_month` = ?", [$ym], 0)[0]['c'] ?? 0;
            $monthlyCostUsd = (float) (query(
                "SELECT COALESCE(SUM(cost_usd),0) AS s FROM user_token_usage WHERE `year_month` = ?",
                [$ym],
                0
            )[0]['s'] ?? 0);
            $activeUsers = query("SELECT COUNT(DISTINCT user_id) as c FROM user_token_usage WHERE `year_month` = ?", [$ym], 0)[0]['c'] ?? 0;
            respond([
                'ok' => true,
                'total_users' => (int) $totalUsers,
                'total_towns' => (int) $totalTowns,
                'total_characters' => (int) $totalChars,
                'total_campaigns' => (int) $totalCamps,
                'monthly_tokens' => (int) $monthlyTokens,
                'monthly_calls' => (int) $monthlyCalls,
                'monthly_cost_usd' => round($monthlyCostUsd, 8),
                'active_users' => (int) $activeUsers,
                'month' => $ym,
            ]);
            break;

        case 'admin_members':
            requireAdmin();
            $members = query(
                "SELECT u.id, u.username, u.email, u.subscription_tier, u.role, u.credit_balance, u.created_at, u.discord_user_id,
                    u.subscription_started_at, u.subscription_renews_at, u.stripe_subscription_status,
                    COALESCE(u.is_debug, 0) AS is_debug,
                    (SELECT COUNT(*) FROM campaigns WHERE user_id = u.id) as campaign_count,
                    (SELECT COUNT(*) FROM towns WHERE user_id = u.id) as town_count,
                    COALESCE((SELECT SUM(tokens_used) FROM user_token_usage WHERE user_id = u.id AND `year_month` = ?), 0) as tokens_this_month,
                    COALESCE((SELECT SUM(call_count) FROM user_token_usage WHERE user_id = u.id AND `year_month` = ?), 0) as calls_this_month
                 FROM users u ORDER BY u.created_at DESC",
                [date('Y-m'), date('Y-m')],
                0
            );
            foreach ($members as &$m) {
                $m['is_debug'] = (int) ($m['is_debug'] ?? 0) === 1;
                $m['subscription_started_at'] = !empty($m['subscription_started_at'])
                    ? gmdate('c', strtotime($m['subscription_started_at'] . ' UTC'))
                    : null;
                $m['subscription_renews_at'] = !empty($m['subscription_renews_at'])
                    ? gmdate('c', strtotime($m['subscription_renews_at'] . ' UTC'))
                    : null;
            }
            unset($m);
            respond(['ok' => true, 'members' => $members]);
            break;

        case 'admin_update_member':
            requireAdmin();
            $targetId = (int) ($input['user_id'] ?? 0);
            if (!$targetId) throw new Exception('Missing user_id');
            $updates = [];
            $params = [];
            $syncDiscordTier = false;
            if (isset($input['subscription_tier'])) {
                $updates[] = 'subscription_tier = ?';
                $params[] = $input['subscription_tier'];
                $syncDiscordTier = true;
            }
            if (isset($input['role'])) {
                $updates[] = 'role = ?';
                $params[] = $input['role'];
            }
            if (array_key_exists('is_debug', $input)) {
                $updates[] = 'is_debug = ?';
                $params[] = filter_var($input['is_debug'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
            }
            if (isset($input['username'])) {
                $updates[] = 'username = ?';
                $params[] = trim($input['username']);
            }
            if (isset($input['email'])) {
                $updates[] = 'email = ?';
                $params[] = trim($input['email']);
            }
            if (array_key_exists('discord_user_id', $input)) {
                $did = trim((string) $input['discord_user_id']);
                if ($did === '') {
                    $updates[] = 'discord_user_id = NULL';
                } else {
                    if (!preg_match('/^\d{7,30}$/', $did)) {
                        throw new Exception('Invalid Discord user ID (numeric snowflake only).');
                    }
                    $updates[] = 'discord_user_id = ?';
                    $params[] = $did;
                }
                $syncDiscordTier = true;
            }
            if (empty($updates)) throw new Exception('No fields to update');
            $params[] = $targetId;
            execute('UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = ?', $params, 0);
            $discordSync = null;
            if ($syncDiscordTier) {
                require_once __DIR__ . '/discord_member_sync_lib.php';
                $discordSync = ew_discord_member_tier_sync($targetId);
            }
            $out = ['ok' => true];
            if ($discordSync !== null) {
                $out['discord_sync'] = $discordSync;
            }
            respond($out);
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
            try {
                execute('DELETE FROM npc_reuse_generated WHERE character_id = ?', [$charId], 0);
            } catch (Exception $e) {
                /* table may be absent on very old DBs */
            }
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

        case 'admin_site_settings':
            requireAdmin();
            execute(
                "INSERT IGNORE INTO site_settings (`key`, value, updated_at) VALUES ('signup_rate_limit_ip_allowlist', '', NOW())",
                [],
                0
            );
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

        case 'admin_npc_flavor_pool':
            requireAdmin();
            try {
                $detailId = (int) ($_GET['row_id'] ?? 0);
                if ($detailId > 0) {
                    $one = query(
                        'SELECT p.id, p.user_id, u.username, p.dnd_edition, p.profile_hash, p.flavor_hash, p.is_creature, p.skills_feats, p.feats, p.reason, p.full_sheet_json, p.created_at
                         FROM npc_flavor_pool p LEFT JOIN users u ON u.id = p.user_id WHERE p.id = ? LIMIT 1',
                        [$detailId],
                        0
                    );
                    if (empty($one)) {
                        throw new Exception('Pool row not found');
                    }
                    respond(['ok' => true, 'row' => $one[0]]);
                    break;
                }
                $statsOnly = isset($_GET['stats']) && (string) $_GET['stats'] === '1';
                if ($statsOnly) {
                    $totalRow = query('SELECT COUNT(*) AS c FROM npc_flavor_pool', [], 0);
                    $total = (int) ($totalRow[0]['c'] ?? 0);
                    $reuseArchiveTotal = 0;
                    try {
                        $ar = query('SELECT COUNT(*) AS c FROM npc_reuse_generated', [], 0);
                        $reuseArchiveTotal = (int) ($ar[0]['c'] ?? 0);
                    } catch (Exception $e) {
                    }
                    $byEdition = query('SELECT dnd_edition, COUNT(*) AS cnt FROM npc_flavor_pool GROUP BY dnd_edition ORDER BY cnt DESC', [], 0);
                    $topUsers = query(
                        'SELECT p.user_id, COALESCE(u.username, CONCAT(\'user#\', p.user_id)) AS username, COUNT(*) AS cnt FROM npc_flavor_pool p LEFT JOIN users u ON u.id = p.user_id GROUP BY p.user_id, u.username ORDER BY cnt DESC LIMIT 30',
                        [],
                        0
                    );
                    respond(['ok' => true, 'stats' => ['total' => $total, 'reuse_archive_total' => $reuseArchiveTotal, 'by_edition' => $byEdition, 'top_users' => $topUsers]]);
                    break;
                }
                $limit = min(200, max(1, (int) ($_GET['limit'] ?? 50)));
                $offset = max(0, (int) ($_GET['offset'] ?? 0));
                $userFilter = (int) ($_GET['user_id'] ?? 0);
                if ($userFilter > 0) {
                    $rows = query(
                        'SELECT p.id, p.user_id, u.username, p.dnd_edition, p.profile_hash, p.flavor_hash, LEFT(p.reason, 240) AS reason_preview, CHAR_LENGTH(p.reason) AS reason_len, p.created_at
                         FROM npc_flavor_pool p
                         LEFT JOIN users u ON u.id = p.user_id
                         WHERE p.user_id = ?
                         ORDER BY p.id DESC
                         LIMIT ? OFFSET ?',
                        [$userFilter, $limit, $offset],
                        0
                    );
                    $cntRow = query('SELECT COUNT(*) AS c FROM npc_flavor_pool WHERE user_id = ?', [$userFilter], 0);
                } else {
                    $rows = query(
                        'SELECT p.id, p.user_id, u.username, p.dnd_edition, p.profile_hash, p.flavor_hash, LEFT(p.reason, 240) AS reason_preview, CHAR_LENGTH(p.reason) AS reason_len, p.created_at
                         FROM npc_flavor_pool p
                         LEFT JOIN users u ON u.id = p.user_id
                         ORDER BY p.id DESC
                         LIMIT ? OFFSET ?',
                        [$limit, $offset],
                        0
                    );
                    $cntRow = query('SELECT COUNT(*) AS c FROM npc_flavor_pool', [], 0);
                }
                $fullCount = (int) ($cntRow[0]['c'] ?? 0);
                respond(['ok' => true, 'rows' => $rows ?: [], 'total_matching' => $fullCount, 'limit' => $limit, 'offset' => $offset]);
            } catch (Exception $e) {
                throw new Exception('NPC flavor pool: ' . $e->getMessage() . ' (Run setup_mysql.php if the table is missing.)');
            }
            break;

        case 'admin_npc_flavor_delete':
            requireAdmin();
            $delId = (int) ($input['id'] ?? 0);
            if ($delId <= 0) {
                throw new Exception('Missing id');
            }
            execute('DELETE FROM npc_flavor_pool WHERE id = ?', [$delId], 0);
            respond(['ok' => true, 'deleted_id' => $delId]);
            break;

        case 'admin_npc_reuse_generated':
            requireAdmin();
            try {
                $oneId = (int) ($_GET['id'] ?? 0);
                if ($oneId > 0) {
                    $one = query(
                        'SELECT g.*, COALESCE(u.username, CONCAT(\'user#\', g.user_id)) AS username FROM npc_reuse_generated g LEFT JOIN users u ON u.id = g.user_id WHERE g.id = ? LIMIT 1',
                        [$oneId],
                        0
                    );
                    if (empty($one)) {
                        throw new Exception('Reuse archive row not found');
                    }
                    respond(['ok' => true, 'row' => $one[0]]);
                    break;
                }
                $limit = min(200, max(1, (int) ($_GET['limit'] ?? 40)));
                $offset = max(0, (int) ($_GET['offset'] ?? 0));
                $userFilter = (int) ($_GET['user_id'] ?? 0);
                if ($userFilter > 0) {
                    $rows = query(
                        'SELECT g.id AS archive_id, g.user_id, COALESCE(u.username, CONCAT(\'user#\', g.user_id)) AS username,
                                g.town_id, g.character_id, g.created_at, g.full_sheet_json, t.name AS town_name,
                                c.name AS c_name, c.race AS c_race, c.class AS c_class, c.level AS c_level, c.hp AS c_hp,
                                c.status AS c_status, c.alignment AS c_alignment, c.role AS c_role,
                                (c.id IS NOT NULL) AS char_present
                         FROM npc_reuse_generated g
                         LEFT JOIN users u ON u.id = g.user_id
                         LEFT JOIN towns t ON t.id = g.town_id
                         LEFT JOIN characters c ON c.id = g.character_id
                         WHERE g.user_id = ?
                         ORDER BY g.id DESC
                         LIMIT ? OFFSET ?',
                        [$userFilter, $limit, $offset],
                        0
                    );
                    $cntRow = query('SELECT COUNT(*) AS c FROM npc_reuse_generated WHERE user_id = ?', [$userFilter], 0);
                } else {
                    $rows = query(
                        'SELECT g.id AS archive_id, g.user_id, COALESCE(u.username, CONCAT(\'user#\', g.user_id)) AS username,
                                g.town_id, g.character_id, g.created_at, g.full_sheet_json, t.name AS town_name,
                                c.name AS c_name, c.race AS c_race, c.class AS c_class, c.level AS c_level, c.hp AS c_hp,
                                c.status AS c_status, c.alignment AS c_alignment, c.role AS c_role,
                                (c.id IS NOT NULL) AS char_present
                         FROM npc_reuse_generated g
                         LEFT JOIN users u ON u.id = g.user_id
                         LEFT JOIN towns t ON t.id = g.town_id
                         LEFT JOIN characters c ON c.id = g.character_id
                         ORDER BY g.id DESC
                         LIMIT ? OFFSET ?',
                        [$limit, $offset],
                        0
                    );
                    $cntRow = query('SELECT COUNT(*) AS c FROM npc_reuse_generated', [], 0);
                }
                $fullCount = (int) ($cntRow[0]['c'] ?? 0);
                foreach ($rows ?: [] as &$r) {
                    $jsonRaw = $r['full_sheet_json'] ?? '';
                    $present = !empty($r['char_present']);
                    unset($r['char_present']);
                    if ($present) {
                        $r['name'] = trim((string) ($r['c_name'] ?? ''));
                        $r['race'] = trim((string) ($r['c_race'] ?? ''));
                        $r['class'] = trim((string) ($r['c_class'] ?? ''));
                        $r['level'] = (int) ($r['c_level'] ?? 0);
                        $r['hp'] = $r['c_hp'] !== null && $r['c_hp'] !== '' ? (string) $r['c_hp'] : '';
                        $r['status'] = trim((string) ($r['c_status'] ?? 'Alive'));
                        $r['alignment'] = trim((string) ($r['c_alignment'] ?? ''));
                        $r['role'] = trim((string) ($r['c_role'] ?? ''));
                    } else {
                        $j = json_decode($jsonRaw, true);
                        if (!is_array($j)) {
                            $j = [];
                        }
                        $r['name'] = (string) ($j['name'] ?? '');
                        $r['race'] = (string) ($j['race'] ?? '');
                        $r['class'] = (string) ($j['class'] ?? '');
                        $lv = isset($j['level']) ? (int) $j['level'] : 0;
                        if ($lv <= 0 && !empty($r['class']) && preg_match('/(\d+)\s*$/', $r['class'], $m)) {
                            $lv = (int) $m[1];
                        }
                        $r['level'] = $lv;
                        $r['hp'] = (string) ($j['hp'] ?? '');
                        $r['status'] = (string) ($j['status'] ?? 'Alive');
                        $r['alignment'] = (string) ($j['alignment'] ?? '');
                        $r['role'] = (string) ($j['role'] ?? '');
                    }
                    $cid = (int) ($r['character_id'] ?? 0);
                    $r['char_missing'] = !$present && $cid > 0;
                    if (!empty($r['char_missing'])) {
                        $r['name'] = '(deleted)';
                        $r['race'] = 'ΓÇö';
                        $r['class'] = 'ΓÇö';
                        $r['level'] = 0;
                        $r['hp'] = '';
                        $r['status'] = 'ΓÇö';
                        $r['alignment'] = 'ΓÇö';
                        $r['role'] = 'ΓÇö';
                    }
                    foreach (['c_name', 'c_race', 'c_class', 'c_level', 'c_hp', 'c_status', 'c_alignment', 'c_role'] as $ck) {
                        unset($r[$ck]);
                    }
                    unset($r['full_sheet_json']);
                }
                unset($r);
                respond(['ok' => true, 'rows' => $rows ?: [], 'total_matching' => $fullCount, 'limit' => $limit, 'offset' => $offset]);
            } catch (Exception $e) {
                throw new Exception('npc_reuse_generated: ' . $e->getMessage() . ' (Run setup_mysql.php if the table is missing.)');
            }
            break;

        case 'admin_npc_reuse_generated_delete':
            requireAdmin();
            $rid = (int) ($input['id'] ?? 0);
            if ($rid <= 0) {
                throw new Exception('Missing id');
            }
            execute('DELETE FROM npc_reuse_generated WHERE id = ?', [$rid], 0);
            respond(['ok' => true, 'deleted_id' => $rid]);
            break;

        case 'admin_llm_training_analyze':
            requireAdmin();
            require_once __DIR__ . '/llm_training_dataset.php';
            $minHours = max(1.0, min(8760.0, (float) ($_GET['min_hours_between_repeats'] ?? 48)));
            $minLines = max(50, min(5000000, (int) ($_GET['min_total_lines'] ?? 1500)));
            $maxLines = max(1000, min(5000000, (int) ($_GET['max_lines'] ?? 300000)));
            $path = __DIR__ . '/private_data/llm_training.jsonl';
            $out = [
                'ok' => true,
                'path' => 'private_data/llm_training.jsonl',
                'file_exists' => is_file($path),
                'file_size_bytes' => is_file($path) ? (int) filesize($path) : 0,
                'lines_read' => 0,
                'parse_errors' => 0,
                'ts_invalid' => 0,
                'unique_fingerprints' => 0,
                'repeat_occurrences' => 0,
                'repeat_pair_violations' => 0,
                'repeat_violation_rate' => null,
                'worst_min_gap_hours' => null,
                'median_min_gap_hours' => null,
                'worst_offenders' => [],
                'launch_ready' => false,
                'criteria' => [
                    'min_hours_between_repeats' => $minHours,
                    'min_total_lines' => $minLines,
                    'max_lines_scanned' => $maxLines,
                ],
                'notes' => 'Launch-ready means: enough lines and no consecutive duplicate fingerprints closer than the minimum hour threshold.',
            ];
            if (!is_file($path) || !is_readable($path)) {
                respond($out);
                break;
            }
            $byFp = [];
            $fpPreview = [];
            $fh = @fopen($path, 'rb');
            if (!$fh) {
                $out['notes'] = 'Could not open file for reading.';
                respond($out);
                break;
            }
            $n = 0;
            $rawLines = 0;
            while (!feof($fh) && $n < $maxLines && $rawLines < $maxLines * 50) {
                $rawLines++;
                $line = fgets($fh);
                if ($line === false) {
                    break;
                }
                $line = trim($line);
                if ($line === '') {
                    continue;
                }
                $n++;
                $rec = json_decode($line, true);
                if (!is_array($rec)) {
                    $out['parse_errors']++;
                    continue;
                }
                $tsRaw = $rec['ts'] ?? '';
                $tu = strtotime((string) $tsRaw);
                if ($tu === false || $tu <= 0) {
                    $out['ts_invalid']++;
                    continue;
                }
                $fp = ew_llm_training_record_fingerprint($rec);
                if (!isset($byFp[$fp])) {
                    $byFp[$fp] = [];
                    $msgs = isset($rec['messages']) && is_array($rec['messages']) ? $rec['messages'] : [];
                    $pv = '';
                    for ($i = count($msgs) - 1; $i >= 0; $i--) {
                        if (($msgs[$i]['role'] ?? '') === 'assistant') {
                            $pv = trim((string) ($msgs[$i]['content'] ?? ''));
                            break;
                        }
                    }
                    $fpPreview[$fp] = strlen($pv) > 140 ? substr($pv, 0, 140) . 'ΓÇª' : $pv;
                }
                $byFp[$fp][] = $tu;
            }
            $scanTruncated = ($n >= $maxLines && !feof($fh));
            fclose($fh);
            $out['scan_truncated'] = $scanTruncated;
            $out['lines_read'] = $n;
            $out['unique_fingerprints'] = count($byFp);
            $perFpMins = [];
            $violations = 0;
            $repeatPairs = 0;
            foreach ($byFp as $fp => $tses) {
                $c = count($tses);
                if ($c < 2) {
                    continue;
                }
                sort($tses, SORT_NUMERIC);
                $localMinGapH = null;
                for ($i = 1; $i < $c; $i++) {
                    $repeatPairs++;
                    $gapH = ($tses[$i] - $tses[$i - 1]) / 3600.0;
                    if ($localMinGapH === null || $gapH < $localMinGapH) {
                        $localMinGapH = $gapH;
                    }
                    if ($gapH < $minHours) {
                        $violations++;
                    }
                }
                if ($localMinGapH !== null) {
                    $perFpMins[] = $localMinGapH;
                }
            }
            $out['repeat_occurrences'] = $repeatPairs;
            $out['repeat_pair_violations'] = $violations;
            if ($repeatPairs > 0) {
                $out['repeat_violation_rate'] = round($violations / $repeatPairs, 6);
            }
            if ($perFpMins !== []) {
                $out['worst_min_gap_hours'] = round(min($perFpMins), 4);
                sort($perFpMins, SORT_NUMERIC);
                $mid = (int) floor((count($perFpMins) - 1) / 2);
                $out['median_min_gap_hours'] = round($perFpMins[$mid], 4);
            }
            $validLines = $out['lines_read'] - $out['parse_errors'] - $out['ts_invalid'];
            $out['valid_lines'] = $validLines;
            $out['diversity_ratio'] = $validLines > 0 ? round($out['unique_fingerprints'] / $validLines, 6) : null;
            $linesOk = $validLines >= $minLines;
            $spacingOk = $violations === 0;
            $out['launch_ready'] = $linesOk && $spacingOk;
            if ($scanTruncated) {
                $out['notes'] .= ' Scan stopped at the line cap before EOF ΓÇö raise max lines for a complete pass.';
            }
            $out['checks'] = [
                'enough_lines' => $linesOk,
                'no_too_soon_repeats' => $spacingOk,
            ];
            $off = [];
            foreach ($byFp as $fp => $tses) {
                if (count($tses) < 2) {
                    continue;
                }
                sort($tses, SORT_NUMERIC);
                $minGh = PHP_FLOAT_MAX;
                for ($i = 1; $i < count($tses); $i++) {
                    $g = ($tses[$i] - $tses[$i - 1]) / 3600.0;
                    if ($g < $minGh) {
                        $minGh = $g;
                    }
                }
                if ($minGh === PHP_FLOAT_MAX) {
                    continue;
                }
                $off[] = [
                    'fp' => substr($fp, 0, 12),
                    'occurrences' => count($tses),
                    'min_gap_hours' => round($minGh, 4),
                    'preview' => $fpPreview[$fp] ?? '',
                ];
            }
            usort($off, function ($a, $b) {
                return ($a['min_gap_hours'] <=> $b['min_gap_hours']);
            });
            $out['worst_offenders'] = array_slice($off, 0, 12);
            respond($out);
            break;

        case 'admin_character_sheet_library':
            requireAdmin();
            $detailId = (int) ($_GET['library_id'] ?? 0);
            if ($detailId > 0) {
                $one = query(
                    'SELECT l.*, COALESCE(u.username, CONCAT(\'user#\', l.user_id)) AS owner_username
                     FROM character_sheet_library l
                     INNER JOIN users u ON u.id = l.user_id
                     WHERE l.id = ?',
                    [$detailId],
                    0
                );
                if (empty($one)) {
                    throw new Exception('Library row not found');
                }
                respond(['ok' => true, 'row' => $one[0]]);
                break;
            }
            $limit = min(200, max(1, (int) ($_GET['limit'] ?? 40)));
            $offset = max(0, (int) ($_GET['offset'] ?? 0));
            $userFilter = (int) ($_GET['user_id'] ?? 0);
            $q = trim((string) ($_GET['q'] ?? ''));
            $campaignKeyRaw = isset($_GET['campaign_key']) ? trim((string) $_GET['campaign_key']) : '';
            $where = '1=1';
            $params = [];
            if ($userFilter > 0) {
                $where .= ' AND l.user_id = ?';
                $params[] = $userFilter;
            }
            if ($q !== '') {
                $where .= ' AND l.name LIKE ?';
                $like = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $q) . '%';
                $params[] = $like;
            }
            if ($campaignKeyRaw !== '') {
                $where .= ' AND l.campaign_key = ?';
                $params[] = (int) $campaignKeyRaw;
            }
            $cntRow = query(
                "SELECT COUNT(*) AS c FROM character_sheet_library l WHERE $where",
                $params,
                0
            );
            $fullCount = (int) ($cntRow[0]['c'] ?? 0);
            $qparams = array_merge($params, [$limit, $offset]);
            $rows = query(
                "SELECT l.id, l.user_id, l.campaign_key, l.dnd_edition, l.name, l.name_norm, l.created_at, l.updated_at,
                        CHAR_LENGTH(l.sheet_json) AS sheet_json_bytes,
                        COALESCE(u.username, CONCAT('user#', l.user_id)) AS owner_username
                 FROM character_sheet_library l
                 INNER JOIN users u ON u.id = l.user_id
                 WHERE $where
                 ORDER BY l.id DESC
                 LIMIT ? OFFSET ?",
                $qparams,
                0
            );
            respond(['ok' => true, 'rows' => $rows ?: [], 'total_matching' => $fullCount, 'limit' => $limit, 'offset' => $offset]);
            break;

        case 'admin_update_character_sheet_library':
            requireAdmin();
            require_once __DIR__ . '/character_sheet_library.php';
            $libId = (int) ($input['library_id'] ?? 0);
            if (!$libId) {
                throw new Exception('Missing library_id');
            }
            $d = $input['data'] ?? [];
            $sets = [];
            $vals = [];
            if (array_key_exists('name', $d)) {
                $nm = trim((string) $d['name']);
                if ($nm === '') {
                    throw new Exception('Name cannot be empty');
                }
                $sets[] = 'name = ?';
                $vals[] = $nm;
                $sets[] = 'name_norm = ?';
                $vals[] = ew_sheet_lib_name_norm($nm);
            }
            if (array_key_exists('campaign_key', $d)) {
                $sets[] = 'campaign_key = ?';
                $vals[] = (int) $d['campaign_key'];
            }
            if (array_key_exists('dnd_edition', $d)) {
                $de = trim((string) $d['dnd_edition']);
                if ($de === '') {
                    throw new Exception('dnd_edition cannot be empty');
                }
                if (strlen($de) > 10) {
                    throw new Exception('dnd_edition too long');
                }
                $sets[] = 'dnd_edition = ?';
                $vals[] = $de;
            }
            if (array_key_exists('sheet_json', $d)) {
                $sj = (string) $d['sheet_json'];
                if ($sj === '') {
                    throw new Exception('sheet_json cannot be empty');
                }
                json_decode($sj, true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    throw new Exception('sheet_json must be valid JSON: ' . json_last_error_msg());
                }
                $sets[] = 'sheet_json = ?';
                $vals[] = $sj;
            }
            if (empty($sets)) {
                throw new Exception('No fields to update');
            }
            $vals[] = $libId;
            try {
                execute('UPDATE character_sheet_library SET ' . implode(', ', $sets) . ' WHERE id = ?', $vals, 0);
            } catch (Exception $e) {
                if (strpos($e->getMessage(), 'Duplicate') !== false || strpos($e->getMessage(), '1062') !== false) {
                    throw new Exception('Update failed: a row with this user, campaign, edition, and normalized name already exists.');
                }
                throw $e;
            }
            respond(['ok' => true]);
            break;

        case 'admin_delete_character_sheet_library':
            requireAdmin();
            $libId = (int) ($input['library_id'] ?? 0);
            if (!$libId) {
                throw new Exception('Missing library_id');
            }
            try {
                execute('UPDATE characters SET library_sheet_id = NULL WHERE library_sheet_id = ?', [$libId], 0);
            } catch (Exception $e) {
                /* column may be absent on very old DBs */
            }
            execute('DELETE FROM character_sheet_library WHERE id = ?', [$libId], 0);
            respond(['ok' => true]);
            break;

        /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
           PHASE FRAMEWORK ΓÇö Macro sim / player portal / wiki
           ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */

        case 'macro_framework_overview':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $campaignId = getActiveCampaignIdForUser($uid);
            $state = ensureCampaignMacroBaseline($campaignId);
            ensureTownMacroRows($campaignId);
            $metrics = getMacroTownMetricsEnriched($campaignId);

            $phaseRoadmap = [
                ['phase' => 5, 'title' => 'Macro Simulation & World Dynamics', 'target' => 'Q2 2027', 'unlock' => 10000],
                ['phase' => 6, 'title' => 'Usability, Players & Integration', 'target' => 'Q4 2027', 'unlock' => 15000],
                ['phase' => 7, 'title' => 'Worldbuilding Wiki & Lore System', 'target' => 'Q4 2027', 'unlock' => 15000],
            ];

            respond([
                'ok' => true,
                'campaign_id' => $campaignId,
                'macro_state' => $state,
                'town_metrics' => $metrics,
                'framework_flags' => [
                    'dynamic_economy_trade' => true,
                    'weather_seasons' => true,
                    'medieval_demographics' => true,
                    'player_portal' => true,
                    'mobile_redesign' => true,
                    'vtt_export' => true,
                    'discord_bot_integration' => true,
                    'wiki_articles' => true,
                    'wiki_auto_linking' => true,
                    'relationship_web_viz' => true,
                ],
                'phase_roadmap' => $phaseRoadmap,
            ]);
            break;

        case 'macro_simulate_month':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $campaignId = getActiveCampaignIdForUser($uid);
            $months = (int) ($input['months'] ?? 1);
            $note = trim((string) ($input['note'] ?? ''));
            $state = runMacroMonthTick($campaignId, $months, $note);
            $metrics = getMacroTownMetricsEnriched($campaignId);
            respond([
                'ok' => true,
                'campaign_id' => $campaignId,
                'macro_state' => $state,
                'town_metrics' => $metrics,
                'note' => $note,
                'engine' => 'framework_tick_v2',
            ]);
            break;

        case 'macro_town_metrics':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $campaignId = getActiveCampaignIdForUser($uid);
            ensureTownMacroRows($campaignId);
            ensureMacroTradeRoutes($campaignId);
            respond([
                'ok' => true,
                'campaign_id' => $campaignId,
                'town_metrics' => getMacroTownMetricsEnriched($campaignId),
                'trade_routes' => getMacroTradeRoutes($campaignId),
            ]);
            break;

        case 'macro_trade_routes':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $campaignId = getActiveCampaignIdForUser($uid);
            ensureMacroTradeRoutes($campaignId);
            respond([
                'ok' => true,
                'campaign_id' => $campaignId,
                'routes' => getMacroTradeRoutes($campaignId),
            ]);
            break;

        case 'macro_weather_log':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $campaignId = getActiveCampaignIdForUser($uid);
            $limit = max(10, min(240, (int) ($_GET['limit'] ?? 60)));
            $rows = query(
                'SELECT month_index, season, weather_pattern, severity, narrative, created_at
                 FROM macro_weather_events
                 WHERE campaign_id = ?
                 ORDER BY month_index DESC, id DESC
                 LIMIT ' . $limit,
                [$campaignId],
                0
            );
            respond(['ok' => true, 'campaign_id' => $campaignId, 'events' => $rows]);
            break;

        case 'macro_demographics':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $campaignId = getActiveCampaignIdForUser($uid);
            $townId = (int) ($_GET['town_id'] ?? 0);
            $limit = max(6, min(240, (int) ($_GET['limit'] ?? 48)));
            $sql = 'SELECT d.*, t.name AS town_name
                    FROM macro_demographics_snapshots d
                    JOIN towns t ON t.id = d.town_id
                    WHERE d.campaign_id = ?';
            $params = [$campaignId];
            if ($townId > 0) {
                $sql .= ' AND d.town_id = ?';
                $params[] = $townId;
            }
            $sql .= ' ORDER BY d.month_index DESC LIMIT ' . $limit;
            $rows = query($sql, $params, 0);
            respond(['ok' => true, 'campaign_id' => $campaignId, 'snapshots' => $rows]);
            break;

        case 'player_portal_snapshot':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $campaignId = getActiveCampaignIdForUser($uid);
            $townId = (int) ($_GET['town_id'] ?? 0);
            $townSql = 'SELECT id, name, subtitle FROM towns WHERE user_id = ? AND campaign_id = ?';
            $townParams = [$uid, $campaignId];
            if ($townId > 0) {
                $townSql .= ' AND id = ?';
                $townParams[] = $townId;
            }
            $towns = query($townSql . ' ORDER BY name', $townParams, 0);
            $townIds = array_map(fn($t) => (int) $t['id'], $towns);
            $characters = [];
            if (!empty($townIds)) {
                $in = implode(',', array_fill(0, count($townIds), '?'));
                $characters = query(
                    "SELECT id, town_id, name, race, class, level, status, title
                     FROM characters
                     WHERE town_id IN ($in) AND (status IS NULL OR status != 'deceased')
                     ORDER BY town_id, name",
                    $townIds,
                    0
                );
            }
            $history = [];
            if (!empty($townIds)) {
                $in = implode(',', array_fill(0, count($townIds), '?'));
                $history = query(
                    "SELECT id, town_id, heading, content, sort_order
                     FROM history
                     WHERE town_id IN ($in)
                     ORDER BY sort_order DESC
                     LIMIT 100",
                    $townIds,
                    0
                );
            }
            $lore = [];
            try {
                require_once __DIR__ . '/lore_lib.php';
                $lore = lorePlayerVisibleArticles($uid, $campaignId);
            } catch (Exception $e) {
                $lore = [];
            }
            respond([
                'ok' => true,
                'campaign_id' => $campaignId,
                'read_only' => true,
                'towns' => $towns,
                'characters' => $characters,
                'history' => $history,
                'lore' => $lore,
            ]);
            break;

        case 'player_portal_public_snapshot':
            $token = trim((string) ($_GET['token'] ?? ''));
            if ($token === '') {
                throw new Exception('Missing token.');
            }
            $tokenHash = hash('sha256', $token);
            $tokRows = query(
                'SELECT * FROM player_portal_tokens
                 WHERE token_hash = ? AND is_revoked = 0
                   AND (expires_at IS NULL OR expires_at > NOW())
                 LIMIT 1',
                [$tokenHash],
                0
            );
            if (!$tokRows) {
                throw new Exception('Invalid or expired token.');
            }
            $tok = $tokRows[0];
            $uid = (int) $tok['user_id'];
            $campaignId = (int) $tok['campaign_id'];
            $scope = json_decode($tok['scope_json'] ?? '{}', true) ?: [];
            $townId = (int) ($_GET['town_id'] ?? 0);
            $allowedTownIds = array_map('intval', $scope['town_ids'] ?? []);

            $townSql = 'SELECT id, name, subtitle FROM towns WHERE user_id = ? AND campaign_id = ?';
            $townParams = [$uid, $campaignId];
            if (!empty($allowedTownIds)) {
                $in = implode(',', array_fill(0, count($allowedTownIds), '?'));
                $townSql .= " AND id IN ($in)";
                foreach ($allowedTownIds as $tid) {
                    $townParams[] = $tid;
                }
            }
            if ($townId > 0) {
                $townSql .= ' AND id = ?';
                $townParams[] = $townId;
            }
            $towns = query($townSql . ' ORDER BY name', $townParams, 0);
            $townIds = array_map(fn($t) => (int) $t['id'], $towns);
            $characters = [];
            $history = [];
            if (!empty($townIds)) {
                $in = implode(',', array_fill(0, count($townIds), '?'));
                $characters = query(
                    "SELECT id, town_id, name, race, class, level, status, title
                     FROM characters
                     WHERE town_id IN ($in) AND (status IS NULL OR status != 'deceased')
                     ORDER BY town_id, name",
                    $townIds,
                    0
                );
                $history = query(
                    "SELECT id, town_id, heading, content, sort_order
                     FROM history
                     WHERE town_id IN ($in)
                     ORDER BY sort_order DESC
                     LIMIT 100",
                    $townIds,
                    0
                );
            }

            execute(
                'UPDATE player_portal_tokens SET last_accessed_at = NOW() WHERE id = ?',
                [(int) $tok['id']],
                0
            );

            $lore = [];
            try {
                require_once __DIR__ . '/lore_lib.php';
                $lore = lorePlayerVisibleArticles($uid, $campaignId);
            } catch (Exception $e) {
                $lore = [];
            }

            respond([
                'ok' => true,
                'campaign_id' => $campaignId,
                'token_label' => $tok['label'] ?? 'Player Portal',
                'read_only' => true,
                'towns' => $towns,
                'characters' => $characters,
                'history' => $history,
                'lore' => $lore,
            ]);
            break;

        case 'player_portal_tokens':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $campaignId = getActiveCampaignIdForUser($uid);
            $rows = query(
                'SELECT id, label, scope_json, is_revoked, expires_at, created_at, last_accessed_at
                 FROM player_portal_tokens
                 WHERE user_id = ? AND campaign_id = ?
                 ORDER BY created_at DESC',
                [$uid, $campaignId],
                0
            );
            respond(['ok' => true, 'campaign_id' => $campaignId, 'tokens' => $rows]);
            break;

        case 'player_portal_token_create':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $campaignId = getActiveCampaignIdForUser($uid);
            $label = trim((string) ($input['label'] ?? 'Player Share Link'));
            $scopeJson = json_encode($input['scope'] ?? ['read_only' => true], JSON_UNESCAPED_UNICODE);
            $days = max(1, min(3650, (int) ($input['expires_in_days'] ?? 180)));
            $rawToken = bin2hex(random_bytes(24));
            $tokenHash = hash('sha256', $rawToken);
            execute(
                'INSERT INTO player_portal_tokens (user_id, campaign_id, token_hash, label, scope_json, expires_at)
                 VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))',
                [$uid, $campaignId, $tokenHash, $label, $scopeJson, $days],
                0
            );
            respond([
                'ok' => true,
                'campaign_id' => $campaignId,
                'token' => $rawToken,
                'token_hash' => $tokenHash,
            ]);
            break;

        case 'player_portal_token_revoke':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $campaignId = getActiveCampaignIdForUser($uid);
            $tokenId = (int) ($input['token_id'] ?? 0);
            if ($tokenId <= 0) {
                throw new Exception('Missing token_id.');
            }
            execute(
                'UPDATE player_portal_tokens
                 SET is_revoked = 1
                 WHERE id = ? AND user_id = ? AND campaign_id = ?',
                [$tokenId, $uid, $campaignId],
                0
            );
            respond(['ok' => true, 'token_id' => $tokenId]);
            break;

        case 'player_portal_token_scope_update':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $campaignId = getActiveCampaignIdForUser($uid);
            $tokenId = (int) ($input['token_id'] ?? 0);
            if ($tokenId <= 0) {
                throw new Exception('Missing token_id.');
            }
            $scope = $input['scope'] ?? ['read_only' => true];
            if (!is_array($scope)) {
                throw new Exception('scope must be an object.');
            }
            $scopeJson = json_encode($scope, JSON_UNESCAPED_UNICODE);
            execute(
                'UPDATE player_portal_tokens
                 SET scope_json = ?
                 WHERE id = ? AND user_id = ? AND campaign_id = ?',
                [$scopeJson, $tokenId, $uid, $campaignId],
                0
            );
            respond(['ok' => true, 'token_id' => $tokenId]);
            break;

        case 'town_campaign_export':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $townId = (int) ($_GET['town_id'] ?? 0);
            if ($townId <= 0) {
                throw new Exception('town_id is required.');
            }
            verifyTownOwnership($uid, $townId, $uid);
            $campaignId = getActiveCampaignIdForUser($uid);

            $townRows = query(
                'SELECT id, name, subtitle, is_party_base, is_encounter_town, campaign_id, updated_at, created_at
                 FROM towns WHERE id = ? AND user_id = ? LIMIT 1',
                [$townId, $uid],
                $uid
            );
            if (!$townRows) {
                throw new Exception('Town not found.');
            }
            $town = $townRows[0];

            $campaign = null;
            if ($campaignId) {
                $campRows = query(
                    'SELECT id, name, dnd_edition, description, is_active FROM campaigns WHERE id = ? AND user_id = ? LIMIT 1',
                    [$campaignId, $uid],
                    0
                );
                $campaign = $campRows[0] ?? null;
            }

            $metaRows = query('SELECT `key`, value FROM town_meta WHERE town_id = ?', [$townId], $uid);
            $meta = [];
            foreach ($metaRows as $m) {
                $meta[$m['key']] = $m['value'];
            }

            $history = query(
                'SELECT heading, content, sort_order FROM history WHERE town_id = ? ORDER BY sort_order ASC',
                [$townId],
                $uid
            ) ?: [];

            $characters = query(
                'SELECT * FROM characters WHERE town_id = ? ORDER BY
                   CASE WHEN status = \'Alive\' OR status IS NULL OR status = \'\' THEN 0 ELSE 1 END,
                   name ASC',
                [$townId],
                $uid
            ) ?: [];
            // Strip non-narrative / oversized fields from character sheets
            foreach ($characters as &$chStrip) {
                unset($chStrip['ai_data'], $chStrip['portrait_url'], $chStrip['portrait_prompt'], $chStrip['sheet_source_character_id']);
            }
            unset($chStrip);

            $charIds = array_map(fn($c) => (int) $c['id'], $characters);
            $memoriesByChar = [];
            $equipmentByChar = [];
            if (!empty($charIds)) {
                $placeholders = implode(',', array_fill(0, count($charIds), '?'));
                try {
                    $memRows = query(
                        "SELECT character_id, memory_type, content, sentiment, related_char_id, related_pc,
                                faction_id, importance, game_date
                         FROM character_memories
                         WHERE character_id IN ($placeholders)
                         ORDER BY importance DESC, id ASC",
                        $charIds,
                        $uid
                    ) ?: [];
                    foreach ($memRows as $mem) {
                        $cid = (int) $mem['character_id'];
                        unset($mem['character_id']);
                        $memoriesByChar[$cid][] = $mem;
                    }
                } catch (Exception $e) { /* table may be missing on old DBs */ }
                try {
                    $eqRows = query(
                        "SELECT character_id, item_name, item_type, slot, quantity, weight, properties, equipped
                         FROM character_equipment
                         WHERE character_id IN ($placeholders)
                         ORDER BY equipped DESC, item_name ASC",
                        $charIds,
                        $uid
                    ) ?: [];
                    foreach ($eqRows as $eq) {
                        $cid = (int) $eq['character_id'];
                        unset($eq['character_id']);
                        $equipmentByChar[$cid][] = $eq;
                    }
                } catch (Exception $e) { /* optional */ }
            }
            foreach ($characters as &$ch) {
                $cid = (int) $ch['id'];
                $ch['memories'] = $memoriesByChar[$cid] ?? [];
                $ch['equipment'] = $equipmentByChar[$cid] ?? [];
            }
            unset($ch);

            $buildings = query(
                'SELECT * FROM town_buildings WHERE town_id = ? ORDER BY sort_order, name',
                [$townId],
                $uid
            ) ?: [];
            foreach ($buildings as &$b) {
                $bid = (int) $b['id'];
                $b['rooms'] = query(
                    'SELECT name, room_type, description, sort_order FROM building_rooms WHERE building_id = ? ORDER BY sort_order, name',
                    [$bid],
                    $uid
                ) ?: [];
                if (!empty($b['owner_id'])) {
                    $ownerRow = query('SELECT name FROM characters WHERE id = ?', [(int) $b['owner_id']], $uid);
                    $b['owner_name'] = $ownerRow[0]['name'] ?? '';
                } else {
                    $b['owner_name'] = '';
                }
                $b['residents'] = query(
                    'SELECT id, name, class, level, role, status FROM characters WHERE building_id = ? AND town_id = ? ORDER BY name',
                    [$bid, $townId],
                    $uid
                ) ?: [];
            }
            unset($b);

            // Social graph (same shape as get_social_data)
            $placeholders = !empty($charIds) ? implode(',', array_fill(0, count($charIds), '?')) : '0';
            $relationships = !empty($charIds) ? query(
                "SELECT cr.rel_type, cr.disposition, cr.public_rel, cr.reason, cr.started_date,
                        c1.name as char1_name, c2.name as char2_name
                 FROM character_relationships cr
                 JOIN characters c1 ON c1.id = cr.char1_id
                 JOIN characters c2 ON c2.id = cr.char2_id
                 WHERE cr.char1_id IN ($placeholders) OR cr.char2_id IN ($placeholders)
                 ORDER BY cr.updated_at DESC",
                array_merge($charIds, $charIds),
                $uid
            ) : [];

            $factions = query('SELECT * FROM factions WHERE town_id = ? ORDER BY name', [$townId], $uid) ?: [];
            foreach ($factions as &$f) {
                $f['members'] = query(
                    'SELECT fm.role, fm.loyalty, fm.joined_date, c.name as character_name
                     FROM faction_members fm JOIN characters c ON c.id = fm.character_id
                     WHERE fm.faction_id = ? ORDER BY fm.role DESC, c.name',
                    [(int) $f['id']],
                    $uid
                ) ?: [];
                $f['relations'] = query(
                    'SELECT fr.disposition, fr.reason, f2.name as target_name
                     FROM faction_relations fr JOIN factions f2 ON f2.id = fr.target_faction_id
                     WHERE fr.faction_id = ?',
                    [(int) $f['id']],
                    $uid
                ) ?: [];
            }
            unset($f);

            $incidents = query(
                'SELECT * FROM town_incidents WHERE town_id = ? ORDER BY created_at DESC',
                [$townId],
                $uid
            ) ?: [];
            foreach ($incidents as &$inc) {
                $inc['participants'] = query(
                    'SELECT ip.role, ip.knows_truth, ip.alibi, c.name as character_name
                     FROM incident_participants ip JOIN characters c ON c.id = ip.character_id
                     WHERE ip.incident_id = ?',
                    [(int) $inc['id']],
                    $uid
                ) ?: [];
                $inc['clues'] = query(
                    'SELECT clue_text, location, points_to, found, skill_check, red_herring
                     FROM incident_clues WHERE incident_id = ? ORDER BY id',
                    [(int) $inc['id']],
                    $uid
                ) ?: [];
            }
            unset($inc);

            $reputation = query(
                'SELECT pc_name, disposition, reason, faction_id, character_id
                 FROM pc_reputation WHERE town_id = ? ORDER BY pc_name',
                [$townId],
                $uid
            ) ?: [];

            $rules = [
                'rules_text' => '',
                'campaign_description' => '',
            ];
            if ($campaignId) {
                $ruleRows = query(
                    'SELECT rules_text, campaign_description FROM campaign_rules
                     WHERE user_id = ? AND campaign_id = ? ORDER BY updated_at DESC LIMIT 1',
                    [$uid, $campaignId],
                    $uid
                );
                if ($ruleRows) {
                    $rules['rules_text'] = $ruleRows[0]['rules_text'] ?? '';
                    $rules['campaign_description'] = $ruleRows[0]['campaign_description'] ?? '';
                }
            }

            $calendar = null;
            if ($campaignId) {
                $calRows = query(
                    'SELECT current_year, current_month, current_day, month_names, era_name
                     FROM calendar WHERE user_id = ? AND campaign_id = ? LIMIT 1',
                    [$uid, $campaignId],
                    $uid
                );
                $calendar = $calRows[0] ?? null;
                if ($calendar && !empty($calendar['month_names'])) {
                    $decoded = json_decode($calendar['month_names'], true);
                    if (is_array($decoded)) {
                        $calendar['month_names'] = $decoded;
                    }
                }
            }

            $wiki = [];
            try {
                if ($campaignId) {
                    $wiki = query(
                        'SELECT slug, title, body, tags_json, updated_at
                         FROM wiki_articles WHERE user_id = ? AND campaign_id = ?
                         ORDER BY title ASC',
                        [$uid, $campaignId],
                        0
                    ) ?: [];
                    foreach ($wiki as &$w) {
                        $w['tags'] = json_decode($w['tags_json'] ?? '[]', true) ?: [];
                        unset($w['tags_json']);
                    }
                    unset($w);
                }
            } catch (Exception $e) {
                $wiki = [];
            }

            $scribe = [];
            try {
                if ($campaignId) {
                    $scribe = query(
                        'SELECT generator_type, title, body, town_id, updated_at
                         FROM scribe_library
                         WHERE user_id = ? AND (campaign_id <=> ?)
                           AND (town_id IS NULL OR town_id = ?)
                         ORDER BY updated_at DESC
                         LIMIT 200',
                        [$uid, $campaignId, $townId],
                        0
                    ) ?: [];
                }
            } catch (Exception $e) {
                $scribe = [];
            }

            $worldLocations = [];
            try {
                if ($campaignId) {
                    $worldLocations = query(
                        'SELECT location_name, x_pct, y_pct
                         FROM world_map_locations
                         WHERE user_id = ? AND campaign_id = ? AND town_id = ?
                         ORDER BY location_name',
                        [$uid, $campaignId, $townId],
                        0
                    ) ?: [];
                }
            } catch (Exception $e) {
                $worldLocations = [];
            }

            respond([
                'ok' => true,
                'format' => 'eonweaver.town_campaign_export.v1',
                'generated_at' => gmdate('c'),
                'campaign' => $campaign,
                'calendar' => $calendar,
                'campaign_rules' => $rules,
                'town' => [
                    'id' => (int) $town['id'],
                    'name' => $town['name'],
                    'subtitle' => $town['subtitle'] ?? '',
                    'is_party_base' => (int) ($town['is_party_base'] ?? 0),
                    'is_encounter_town' => (int) ($town['is_encounter_town'] ?? 0),
                    'meta' => $meta,
                    'history' => $history,
                    'buildings' => $buildings,
                    'characters' => $characters,
                    'social' => [
                        'relationships' => $relationships,
                        'factions' => $factions,
                        'incidents' => $incidents,
                        'reputation' => $reputation,
                    ],
                    'world_map_locations' => $worldLocations,
                ],
                'wiki' => $wiki,
                'scribe_library' => $scribe,
            ]);
            break;

        case 'vtt_export_payload':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $campaignId = getActiveCampaignIdForUser($uid);
            $adapter = trim((string) ($_GET['adapter'] ?? 'native'));
            $towns = query('SELECT id, name, subtitle FROM towns WHERE user_id = ? AND campaign_id = ? ORDER BY name', [$uid, $campaignId], 0);
            $characters = query(
                "SELECT id, town_id, name, race, class, level, hp, ac, alignment, status, role, title
                 FROM characters
                 WHERE town_id IN (SELECT id FROM towns WHERE user_id = ? AND campaign_id = ?)
                 ORDER BY town_id, name",
                [$uid, $campaignId],
                0
            );
            $buildings = query(
                "SELECT id, town_id, name, building_type, status, progress_months, required_months
                 FROM town_buildings
                 WHERE town_id IN (SELECT id FROM towns WHERE user_id = ? AND campaign_id = ?)
                 ORDER BY town_id, name",
                [$uid, $campaignId],
                0
            );
            $payload = [
                'ok' => true,
                'format' => 'eonweaver.vtt.v1',
                'generated_at' => gmdate('c'),
                'campaign_id' => $campaignId,
                'adapter' => $adapter,
                'towns' => $towns,
                'characters' => $characters,
                'buildings' => $buildings,
                'adapter_hints' => [
                    'supported' => ['native', 'foundry_vtt', 'roll20'],
                    'notes' => 'Framework transform only. Field mapping will be tuned per target VTT.',
                ],
            ];

            if ($adapter === 'foundry_vtt') {
                $payload['format'] = 'foundry-vtt.eonweaver.framework.v1';
                $payload['actors'] = array_map(function ($c) {
                    return [
                        'name' => $c['name'] ?? 'Unnamed',
                        'type' => 'npc',
                        'system' => [
                            'details' => [
                                'level' => (int) ($c['level'] ?? 0),
                                'alignment' => $c['alignment'] ?? '',
                            ],
                            'attributes' => [
                                'ac' => ['value' => (int) ($c['ac'] ?? 0)],
                                'hp' => ['value' => (int) ($c['hp'] ?? 0), 'max' => (int) ($c['hp'] ?? 0)],
                            ],
                        ],
                        'flags' => [
                            'eonweaver' => [
                                'character_id' => (int) ($c['id'] ?? 0),
                                'town_id' => (int) ($c['town_id'] ?? 0),
                            ],
                        ],
                    ];
                }, $characters);
            } elseif ($adapter === 'roll20') {
                $payload['format'] = 'roll20.eonweaver.framework.v1';
                $payload['journal_entries'] = array_map(function ($c) {
                    return [
                        'name' => $c['name'] ?? 'Unnamed',
                        'bio' => trim(($c['race'] ?? '') . ' ' . ($c['class'] ?? '') . ' L' . ($c['level'] ?? 0)),
                        'gmnotes' => json_encode([
                            'eon_character_id' => (int) ($c['id'] ?? 0),
                            'town_id' => (int) ($c['town_id'] ?? 0),
                            'hp' => (int) ($c['hp'] ?? 0),
                            'ac' => (int) ($c['ac'] ?? 0),
                            'alignment' => $c['alignment'] ?? '',
                        ], JSON_UNESCAPED_UNICODE),
                    ];
                }, $characters);
            }
            respond($payload);
            break;

        case 'integration_status':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $campaignId = getActiveCampaignIdForUser($uid);
            $rows = query(
                'SELECT key_name, value_json, updated_at FROM integration_settings WHERE user_id = ? AND campaign_id = ? ORDER BY key_name',
                [$uid, $campaignId],
                0
            );
            $settings = [];
            foreach ($rows as $r) {
                $settings[$r['key_name']] = [
                    'value' => json_decode($r['value_json'] ?: 'null', true),
                    'updated_at' => $r['updated_at'] ?? null,
                ];
            }
            respond([
                'ok' => true,
                'campaign_id' => $campaignId,
                'settings' => ew_sanitize_integration_settings_for_client($settings),
                'jobs' => query(
                    'SELECT id, job_type, status, created_at, updated_at
                     FROM integration_jobs
                     WHERE user_id = ? AND campaign_id = ?
                     ORDER BY id DESC
                     LIMIT 25',
                    [$uid, $campaignId],
                    0
                ),
                'supported' => ['discord_bot', 'vtt_export_targets', 'player_portal_links'],
            ]);
            break;

        case 'integration_update':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $campaignId = getActiveCampaignIdForUser($uid);
            $key = trim((string) ($input['key_name'] ?? ''));
            if ($key === '') {
                throw new Exception('Missing key_name.');
            }
            $value = $input['value'] ?? null;
            if ($key === 'discord_bot' && is_array($value) && !empty($value['keep_webhook'])) {
                $prev = ew_integration_setting_value($uid, $campaignId, 'discord_bot');
                $value['webhook_url'] = trim((string) ($prev['webhook_url'] ?? ''));
                unset($value['keep_webhook']);
            }
            $valueJson = json_encode($value, JSON_UNESCAPED_UNICODE);
            execute(
                'INSERT INTO integration_settings (user_id, campaign_id, key_name, value_json)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_at = NOW()',
                [$uid, $campaignId, $key, $valueJson],
                0
            );
            respond(['ok' => true, 'key_name' => $key]);
            break;

        case 'integration_test_discord':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $campaignId = getActiveCampaignIdForUser($uid);
            $discord = ew_integration_setting_value($uid, $campaignId, 'discord_bot');
            $webhookUrl = trim((string) ($discord['webhook_url'] ?? ''));
            $enabled = !empty($discord['enabled']);
            if ($webhookUrl === '' || !$enabled) {
                throw new Exception('Save an enabled Discord webhook for this campaign first.');
            }
            require_once __DIR__ . '/discord.php';
            $campaignRows = query('SELECT name FROM campaigns WHERE id = ? AND user_id = ? LIMIT 1', [$campaignId, $uid], 0);
            $campaignName = $campaignRows[0]['name'] ?? 'Campaign';
            $payload = [
                'content' => 'Eon Weaver integration test',
                'embeds' => [[
                    'title' => 'Integration test',
                    'description' => 'If you see this, your campaign Discord webhook is configured correctly.',
                    'color' => 0x4caf50,
                    'fields' => [
                        ['name' => 'Campaign', 'value' => $campaignName, 'inline' => true],
                        ['name' => 'Time (UTC)', 'value' => gmdate('Y-m-d H:i:s'), 'inline' => true],
                    ],
                ]],
            ];
            if (function_exists('ew_discord_apply_branded_webhook_profile')) {
                ew_discord_apply_branded_webhook_profile($payload);
            }
            $send = sendDiscordWebhook($webhookUrl, $payload);
            if (empty($send['ok'])) {
                throw new Exception($send['error'] ?? 'Discord webhook request failed.');
            }
            respond(['ok' => true, 'message' => 'Test message sent to Discord.']);
            break;

        case 'integration_queue_discord':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $campaignId = getActiveCampaignIdForUser($uid);
            $eventType = trim((string) ($input['event_type'] ?? 'manual_ping'));
            $payloadJson = json_encode($input['payload'] ?? [], JSON_UNESCAPED_UNICODE);
            $jobId = insertAndGetId(
                'INSERT INTO integration_jobs (user_id, campaign_id, job_type, payload_json, status)
                 VALUES (?, ?, ?, ?, "queued")',
                [$uid, $campaignId, 'discord:' . $eventType, $payloadJson],
                0
            );
            respond(['ok' => true, 'job_id' => $jobId, 'status' => 'queued']);
            break;

        case 'integration_process_job':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $campaignId = getActiveCampaignIdForUser($uid);
            $jobId = (int) ($input['job_id'] ?? 0);
            if ($jobId <= 0) {
                throw new Exception('Missing job_id.');
            }
            $rows = query(
                'SELECT * FROM integration_jobs
                 WHERE id = ? AND user_id = ? AND campaign_id = ?
                 LIMIT 1',
                [$jobId, $uid, $campaignId],
                0
            );
            if (!$rows) {
                throw new Exception('Integration job not found.');
            }
            $job = $rows[0];
            $result = [
                'processed_at' => gmdate('c'),
                'framework' => true,
                'note' => 'Framework processor simulated completion.',
                'job_type' => $job['job_type'] ?? '',
            ];
            execute(
                'UPDATE integration_jobs
                 SET status = "completed", result_json = ?, updated_at = NOW()
                 WHERE id = ?',
                [json_encode($result, JSON_UNESCAPED_UNICODE), $jobId],
                0
            );
            respond(['ok' => true, 'job_id' => $jobId, 'status' => 'completed', 'result' => $result]);
            break;

        case 'wiki_list':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $campaignId = getActiveCampaignIdForUser($uid);
            require_once __DIR__ . '/lore_lib.php';
            loreEnsureSchema();
            $q = trim((string) ($_GET['q'] ?? ''));
            $category = trim((string) ($_GET['category'] ?? ''));
            $sql = 'SELECT id, slug, title, category, tags_json, aliases_json, is_auto_generated,
                           player_visible, is_locked, entity_type, entity_id, source_generator,
                           created_at, updated_at
                    FROM wiki_articles
                    WHERE user_id = ? AND campaign_id = ?';
            $params = [$uid, $campaignId];
            if ($category !== '') {
                $sql .= ' AND category = ?';
                $params[] = loreNormalizeCategory($category);
            }
            if ($q !== '') {
                $sql .= ' AND (title LIKE ? OR slug LIKE ? OR body LIKE ? OR COALESCE(aliases_json, \'\') LIKE ?)';
                $like = '%' . $q . '%';
                $params[] = $like;
                $params[] = $like;
                $params[] = $like;
                $params[] = $like;
            }
            $sql .= ' ORDER BY updated_at DESC LIMIT 500';
            $articles = query($sql, $params, 0) ?: [];
            $formatted = [];
            foreach ($articles as $a) {
                $formatted[] = loreFormatArticleRow($a);
            }
            $pendingCount = 0;
            try {
                $pc = query(
                    'SELECT COUNT(*) AS c FROM wiki_pending_ingest WHERE user_id = ? AND campaign_id = ? AND status = \'pending\'',
                    [$uid, $campaignId],
                    0
                );
                $pendingCount = (int) ($pc[0]['c'] ?? 0);
            } catch (Exception $e) {
                $pendingCount = 0;
            }
            respond([
                'ok' => true,
                'campaign_id' => $campaignId,
                'articles' => $formatted,
                'pending_count' => $pendingCount,
            ]);
            break;

        case 'wiki_get':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $campaignId = getActiveCampaignIdForUser($uid);
            require_once __DIR__ . '/lore_lib.php';
            loreEnsureSchema();
            $articleId = (int) ($_GET['article_id'] ?? (($input ?? [])['article_id'] ?? 0));
            $slug = trim((string) ($_GET['slug'] ?? (($input ?? [])['slug'] ?? '')));
            if ($articleId <= 0 && $slug === '') {
                throw new Exception('Provide article_id or slug.');
            }
            if ($articleId > 0) {
                $rows = query(
                    'SELECT * FROM wiki_articles WHERE id = ? AND user_id = ? AND campaign_id = ? LIMIT 1',
                    [$articleId, $uid, $campaignId],
                    0
                );
            } else {
                $rows = query(
                    'SELECT * FROM wiki_articles WHERE slug = ? AND user_id = ? AND campaign_id = ? LIMIT 1',
                    [$slug, $uid, $campaignId],
                    0
                );
            }
            if (!$rows) {
                throw new Exception('Article not found.');
            }
            $article = loreFormatArticleRow($rows[0]);
            $backlinks = loreGetBacklinks($uid, $campaignId, (string) $article['slug']);
            $outlinks = loreGetOutlinks($uid, $campaignId, (string) $article['slug']);
            respond([
                'ok' => true,
                'article' => $article,
                'backlinks' => $backlinks,
                'outlinks' => $outlinks,
            ]);
            break;

        case 'wiki_save':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $campaignId = getActiveCampaignIdForUser($uid);
            require_once __DIR__ . '/lore_lib.php';
            $articleIn = $input['article'] ?? [];
            if (!is_array($articleIn)) {
                throw new Exception('Invalid article payload.');
            }
            $saved = loreSaveArticle($uid, $campaignId, $articleIn);
            $backlinks = loreGetBacklinks($uid, $campaignId, (string) ($saved['slug'] ?? ''));
            $outlinks = loreGetOutlinks($uid, $campaignId, (string) ($saved['slug'] ?? ''));
            respond([
                'ok' => true,
                'article' => $saved,
                'backlinks' => $backlinks,
                'outlinks' => $outlinks,
            ]);
            break;

        case 'wiki_delete':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $campaignId = getActiveCampaignIdForUser($uid);
            require_once __DIR__ . '/lore_lib.php';
            loreEnsureSchema();
            $articleId = (int) ($input['article_id'] ?? 0);
            if ($articleId <= 0) {
                throw new Exception('Missing article_id.');
            }
            $rows = query(
                'SELECT slug FROM wiki_articles WHERE id = ? AND user_id = ? AND campaign_id = ? LIMIT 1',
                [$articleId, $uid, $campaignId],
                0
            );
            if (!$rows) {
                throw new Exception('Article not found.');
            }
            $slug = (string) ($rows[0]['slug'] ?? '');
            execute('DELETE FROM wiki_articles WHERE id = ? AND user_id = ? AND campaign_id = ?', [$articleId, $uid, $campaignId], 0);
            execute(
                'DELETE FROM wiki_links WHERE user_id = ? AND campaign_id = ? AND (from_slug = ? OR to_slug = ?)',
                [$uid, $campaignId, $slug, $slug],
                0
            );
            execute(
                'UPDATE wiki_pending_ingest SET status = \'skipped\', resolved_at = NOW()
                 WHERE user_id = ? AND campaign_id = ? AND article_id = ? AND status = \'pending\'',
                [$uid, $campaignId, $articleId],
                0
            );
            respond(['ok' => true, 'article_id' => $articleId]);
            break;

        case 'wiki_autolink_refresh':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $campaignId = getActiveCampaignIdForUser($uid);
            require_once __DIR__ . '/lore_lib.php';
            $result = loreAutolinkRefreshCampaign($uid, $campaignId);
            respond($result);
            break;

        case 'wiki_graph':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $campaignId = getActiveCampaignIdForUser($uid);
            require_once __DIR__ . '/lore_lib.php';
            loreEnsureSchema();
            $category = trim((string) ($_GET['category'] ?? ''));
            $sql = 'SELECT id, slug, title, category, is_auto_generated, player_visible, is_locked, updated_at
                    FROM wiki_articles WHERE user_id = ? AND campaign_id = ?';
            $params = [$uid, $campaignId];
            if ($category !== '') {
                $sql .= ' AND category = ?';
                $params[] = loreNormalizeCategory($category);
            }
            $sql .= ' ORDER BY title';
            $articles = query($sql, $params, 0) ?: [];
            $links = query(
                'SELECT from_slug, to_slug, weight, auto_generated FROM wiki_links WHERE user_id = ? AND campaign_id = ? ORDER BY from_slug, to_slug',
                [$uid, $campaignId],
                0
            ) ?: [];
            $relWeb = query(
                "SELECT cr.char1_id, cr.char2_id, cr.relationship_type, cr.disposition,
                        c1.name AS char1_name, c2.name AS char2_name
                 FROM character_relationships cr
                 JOIN characters c1 ON c1.id = cr.char1_id
                 JOIN characters c2 ON c2.id = cr.char2_id
                 JOIN towns t ON t.id = c1.town_id
                 WHERE t.campaign_id = ?
                 ORDER BY cr.id DESC
                 LIMIT 600",
                [$campaignId],
                0
            ) ?: [];
            respond([
                'ok' => true,
                'campaign_id' => $campaignId,
                'nodes' => $articles,
                'links' => $links,
                'relationship_web' => $relWeb,
            ]);
            break;

        case 'wiki_pending_list':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $campaignId = getActiveCampaignIdForUser($uid);
            require_once __DIR__ . '/lore_lib.php';
            respond([
                'ok' => true,
                'campaign_id' => $campaignId,
                'pending' => loreListPending($uid, $campaignId),
            ]);
            break;

        case 'wiki_pending_resolve':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $campaignId = getActiveCampaignIdForUser($uid);
            require_once __DIR__ . '/lore_lib.php';
            $pendingId = (int) ($input['pending_id'] ?? 0);
            $resolution = (string) ($input['resolution'] ?? '');
            if ($pendingId <= 0) {
                throw new Exception('Missing pending_id.');
            }
            $result = loreResolvePending($uid, $campaignId, $pendingId, $resolution);
            respond($result);
            break;

        case 'wiki_ingest':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $campaignId = getActiveCampaignIdForUser($uid);
            require_once __DIR__ . '/lore_lib.php';
            $title = trim((string) ($input['title'] ?? ''));
            $body = (string) ($input['body'] ?? '');
            $gen = trim((string) ($input['generator_type'] ?? 'lore'));
            $cat = isset($input['category']) ? (string) $input['category'] : null;
            $ref = isset($input['source_ref']) ? (string) $input['source_ref'] : null;
            if ($body === '') {
                throw new Exception('body is required.');
            }
            $result = loreIngestFromAi($uid, $campaignId, $title, $body, $gen, $ref, $cat);
            respond(array_merge(['ok' => true], $result));
            break;

        case 'wiki_entity_page':
            $user = requireAuth();
            $uid = (int) $user['id'];
            $campaignId = getActiveCampaignIdForUser($uid);
            require_once __DIR__ . '/lore_lib.php';
            $entityType = trim((string) (($input ?? [])['entity_type'] ?? $_GET['entity_type'] ?? ''));
            $entityId = (int) (($input ?? [])['entity_id'] ?? $_GET['entity_id'] ?? 0);
            $title = trim((string) (($input ?? [])['title'] ?? $_GET['title'] ?? ''));
            if ($entityType === '' || $entityId <= 0) {
                throw new Exception('entity_type and entity_id are required.');
            }
            if ($title === '') {
                $title = ucfirst($entityType) . ' #' . $entityId;
            }
            $article = loreGetOrCreateForEntity($uid, $campaignId, $entityType, $entityId, $title);
            respond(['ok' => true, 'article' => $article]);
            break;

        default:
            http_response_code(400);
            respond(['error' => "Unknown action: $action"]);
    }
} catch (Throwable $e) {
    http_response_code(400);
    respond(['error' => $e->getMessage()]);
}

/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
   HELPERS
   ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */

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
