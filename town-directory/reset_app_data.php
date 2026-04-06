<?php
/**
 * Eon Weaver — Reset Application Data
 *
 * Wipes ALL user/campaign/town/character data from the main database.
 * SRD edition databases are NOT touched.
 *
 * Usage: reset_app_data.php?key=setup2024&confirm=yes
 *
 * DELETE THIS FILE after use!
 */
header('Content-Type: text/html; charset=utf-8');
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

$SETUP_KEY = 'setup2024';
if (($_GET['key'] ?? '') !== $SETUP_KEY) {
    die('Access denied. Use ?key=' . $SETUP_KEY);
}

$pdo = getDB();
$results = [];

// ═══════════════════════════════════════════════════════════
// SAFETY CHECK — require &confirm=yes
// ═══════════════════════════════════════════════════════════
if (($_GET['confirm'] ?? '') !== 'yes') {
    // Show current data counts so user knows what they're about to delete
    echo '<!DOCTYPE html><html><head><title>Reset App Data — Confirm</title>';
    echo '<style>';
    echo 'body { font-family: "Segoe UI", monospace; background: #0f0f1e; color: #e0e0e0; padding: 30px; line-height: 1.8; max-width: 800px; margin: 0 auto; }';
    echo 'h1 { color: #f44; border-bottom: 2px solid #f44; padding-bottom: 10px; }';
    echo 'h2 { color: #7c8aff; }';
    echo 'strong { color: #f5c518; }';
    echo 'code { color: #4fc978; background: #1a1a30; padding: 2px 8px; border-radius: 4px; }';
    echo '.warn { background: #3d1f1f; border: 2px solid #f44; padding: 16px; border-radius: 8px; margin: 20px 0; }';
    echo 'a.btn { display: inline-block; background: #d32; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 16px; }';
    echo 'a.btn:hover { background: #f44; }';
    echo '</style>';
    echo '</head><body>';
    echo '<h1>⚠️ Eon Weaver — Reset Application Data</h1>';

    echo '<div class="warn">';
    echo '<strong style="color:#f44;font-size:1.2em">This will DELETE all application data!</strong><br>';
    echo 'SRD databases will NOT be affected.';
    echo '</div>';

    echo '<h2>Current Data (will be deleted):</h2>';

    $tables = [
        'users',
        'campaigns',
        'towns',
        'characters',
        'character_equipment',
        'history',
        'town_meta',
        'campaign_rules',
        'calendar',
        'site_settings',
        'user_credits',
        'factions',
        'events',
        'rumors',
        'timeline_log',
        'party_members',
        'encounters',
        'encounter_groups',
        'encounter_participants',
    ];

    foreach ($tables as $t) {
        try {
            $cnt = $pdo->query("SELECT COUNT(*) FROM {$t}")->fetchColumn();
            $emoji = $cnt > 0 ? '📊' : '○';
            echo "<div>{$emoji} <strong>{$t}</strong>: {$cnt} rows</div>";
        } catch (Exception $e) {
            echo "<div>○ <strong>{$t}</strong>: table not found</div>";
        }
    }

    echo '<h2>SRD Databases (will NOT be touched):</h2>';
    foreach (SRD_DBS as $edition => $cfg) {
        $dbName = is_array($cfg) ? $cfg['db'] : $cfg;
        try {
            $cnt = 0;
            $tables_srd = getSrdDB($edition)->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
            foreach ($tables_srd as $st) {
                $cnt += getSrdDB($edition)->query("SELECT COUNT(*) FROM {$st}")->fetchColumn();
            }
            echo "<div>🔒 <strong>{$edition}</strong> ({$dbName}): {$cnt} rows — SAFE</div>";
        } catch (Exception $e) {
            echo "<div>🔒 <strong>{$edition}</strong> ({$dbName}): cannot connect</div>";
        }
    }

    echo '<br><a class="btn" href="?key=' . $SETUP_KEY . '&confirm=yes">🗑️ Yes, wipe all application data</a>';
    echo '&nbsp;&nbsp;&nbsp;<span style="color:#888">or close this page to cancel</span>';
    echo '</body></html>';
    exit;
}

// ═══════════════════════════════════════════════════════════
// CONFIRMED — WIPE ALL APPLICATION DATA
// ═══════════════════════════════════════════════════════════
$results[] = '<h2>Disabling Foreign Key Checks</h2>';
$pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
$results[] = '✅ Foreign key checks disabled';

$results[] = '<h2>Truncating Application Tables</h2>';

// Order doesn't matter since FK checks are off, but list logically
$appTables = [
    // Encounter system (depend on characters)
    'encounter_participants',
    'encounter_groups',
    'encounters',
    'party_members',
    // Character data
    'character_equipment',
    'characters',
    // Town data
    'timeline_log',
    'rumors',
    'events',
    'factions',
    'history',
    'town_meta',
    'towns',
    // Campaign/user data
    'campaign_rules',
    'calendar',
    'user_credits',
    'campaigns',
    'site_settings',
    // Users last
    'users',
];

$totalCleared = 0;
foreach ($appTables as $t) {
    try {
        $cnt = $pdo->query("SELECT COUNT(*) FROM {$t}")->fetchColumn();
        $pdo->exec("TRUNCATE TABLE {$t}");
        $totalCleared += $cnt;
        $results[] = "✅ {$t}: cleared {$cnt} rows";
    } catch (Exception $e) {
        $results[] = "⏭️ {$t}: " . $e->getMessage();
    }
}

// Also drop the old legacy srd_* tables from the main DB (data is in edition DBs now)
$results[] = '<h2>Dropping Legacy SRD Tables</h2>';
$legacySrd = [
    'srd_races',
    'srd_classes',
    'srd_skills',
    'srd_feats',
    'srd_equipment',
    'srd_spells',
    'srd_monsters',
    'srd_items',
    'srd_powers',
    'srd_domains',
    'srd_class_progression',
];
foreach ($legacySrd as $t) {
    try {
        $pdo->exec("DROP TABLE IF EXISTS {$t}");
        $results[] = "✅ Dropped {$t}";
    } catch (Exception $e) {
        $results[] = "⏭️ {$t}: " . $e->getMessage();
    }
}

$pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
$results[] = '';
$results[] = '✅ Foreign key checks re-enabled';

// ═══════════════════════════════════════════════════════════
// VERIFY SRD IS INTACT
// ═══════════════════════════════════════════════════════════
$results[] = '<h2>SRD Database Verification (untouched)</h2>';
foreach (['3.5e', '5e', '5e2024'] as $ed) {
    $cfg = SRD_DBS[$ed] ?? null;
    $dbName = is_array($cfg) ? $cfg['db'] : ($cfg ?? '?');
    try {
        $total = 0;
        $details = [];
        $tables = getSrdDB($ed)->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
        foreach ($tables as $st) {
            $cnt = (int) getSrdDB($ed)->query("SELECT COUNT(*) FROM {$st}")->fetchColumn();
            $total += $cnt;
            if ($cnt > 0)
                $details[] = "{$st}={$cnt}";
        }
        $results[] = "🔒 <strong>{$ed}</strong> ({$dbName}): {$total} rows — " . implode(', ', $details);
    } catch (Exception $e) {
        $results[] = "⚠️ {$ed}: " . $e->getMessage();
    }
}

// ═══════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════
$results[] = '<h2>Summary</h2>';
$results[] = "🗑️ <strong style='color:#f44;font-size:1.2em'>Cleared {$totalCleared} rows of application data.</strong>";
$results[] = '🔒 <strong style="color:#4fc978">SRD databases are intact and untouched.</strong>';
$results[] = '';
$results[] = 'You can now run <a href="setup_mysql.php?key=' . $SETUP_KEY . '" style="color:#7c8aff">setup_mysql.php</a> to re-create tables and start fresh.';
$results[] = '<strong style="color:#f5c518">⚠️ Delete this script from the server!</strong>';

// ═══════════════════════════════════════════════════════════
// OUTPUT
// ═══════════════════════════════════════════════════════════
echo '<!DOCTYPE html><html><head><title>Reset Complete</title>';
echo '<style>';
echo 'body { font-family: "Segoe UI", monospace; background: #0f0f1e; color: #e0e0e0; padding: 30px; line-height: 1.8; max-width: 900px; margin: 0 auto; }';
echo 'h1 { color: #f44; border-bottom: 2px solid #f44; padding-bottom: 10px; }';
echo 'h2 { color: #7c8aff; margin-top: 30px; border-bottom: 1px solid #333; padding-bottom: 5px; }';
echo 'strong { color: #f5c518; }';
echo 'code { color: #4fc978; background: #1a1a30; padding: 2px 8px; border-radius: 4px; }';
echo '</style>';
echo '</head><body>';
echo '<h1>🗑️ Eon Weaver — Application Data Reset</h1>';
foreach ($results as $r)
    echo "<div>{$r}</div>";
echo '</body></html>';
