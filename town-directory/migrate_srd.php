<?php
/**
 * Eon Weaver — SRD Data Migration
 *
 * Copies data from the old shared srd_* tables (with edition column)
 * into the new edition-specific databases.
 *
 * PREREQUISITE: Run setup_srd_dbs.php first to create the new databases and tables.
 *
 * Usage: migrate_srd.php?key=setup2024
 */
header('Content-Type: text/html; charset=utf-8');
set_time_limit(300);
ini_set('memory_limit', '512M');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

$SETUP_KEY = 'setup2024';
if (($_GET['key'] ?? '') !== $SETUP_KEY) {
    die('Access denied. Use ?key=' . $SETUP_KEY);
}

$pdo = getDB(); // Main database (old shared tables)
$results = [];

/**
 * Migrate rows from a shared srd_* table to the edition-specific database.
 * Strips the 'edition' column since it's no longer needed.
 */
function migrateTable($pdo, string $edition, string $oldTable, string $newTable, &$results)
{
    // Read all rows for this edition from the old table
    try {
        $rows = $pdo->query("SELECT * FROM {$oldTable} WHERE edition = '{$edition}'")->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        // Table might not exist in old DB
        $results[] = "⏭️ {$oldTable}: table not found in main DB, skipping";
        return 0;
    }

    if (empty($rows)) {
        // Try without edition filter (for old data that may not have edition set)
        $allRows = $pdo->query("SELECT * FROM {$oldTable}")->fetchAll(PDO::FETCH_ASSOC);
        // Only use unfiltered rows if the table has no edition column or all are the target edition
        if (!empty($allRows) && !isset($allRows[0]['edition'])) {
            $rows = $allRows;
        } elseif (empty($rows)) {
            $results[] = "⏭️ {$oldTable} [{$edition}]: no rows to migrate";
            return 0;
        }
    }

    $srdDb = getSrdDB($edition);

    // Clear target table
    $srdDb->exec("TRUNCATE TABLE {$newTable}");

    // Get column list from the new table
    $newCols = $srdDb->query("DESCRIBE {$newTable}")->fetchAll(PDO::FETCH_COLUMN);

    $count = 0;
    foreach ($rows as $row) {
        // Remove edition and id columns — id will auto-increment in new DB
        unset($row['edition']);
        unset($row['id']);

        // Only keep columns that exist in the new table
        $filtered = [];
        foreach ($row as $col => $val) {
            if (in_array($col, $newCols)) {
                $filtered[$col] = $val;
            }
        }

        if (empty($filtered))
            continue;

        $cols = implode(',', array_keys($filtered));
        $placeholders = implode(',', array_fill(0, count($filtered), '?'));
        try {
            $stmt = $srdDb->prepare("INSERT INTO {$newTable} ({$cols}) VALUES ({$placeholders})");
            $stmt->execute(array_values($filtered));
            $count++;
        } catch (Exception $e) {
            if ($count < 3) {
                $results[] = "   ⚠️ Row error in {$newTable}: " . $e->getMessage();
            }
        }
    }

    $results[] = "✅ {$newTable}: migrated {$count} / " . count($rows) . " rows from {$oldTable} [{$edition}]";
    return $count;
}

// ═══════════════════════════════════════════════════════════
// MIGRATE 3.5e DATA
// ═══════════════════════════════════════════════════════════
$results[] = '<strong>═══ Migrating D&D 3.5e Data ═══</strong>';

$tableMappings = [
    'srd_races' => 'races',
    'srd_classes' => 'classes',
    'srd_skills' => 'skills',
    'srd_feats' => 'feats',
    'srd_equipment' => 'equipment',
    'srd_spells' => 'spells',
    'srd_monsters' => 'monsters',
    'srd_powers' => 'powers',
    'srd_domains' => 'domains',
    'srd_items' => 'items',
    'srd_class_progression' => 'class_progression',
];

foreach ($tableMappings as $oldTable => $newTable) {
    migrateTable($pdo, '3.5e', $oldTable, $newTable, $results);
}

// ═══════════════════════════════════════════════════════════
// MIGRATE 5e DATA
// ═══════════════════════════════════════════════════════════
$results[] = '';
$results[] = '<strong>═══ Migrating D&D 5e (2014) Data ═══</strong>';

$tableMappings5e = [
    'srd_races' => 'races',
    'srd_classes' => 'classes',
    'srd_skills' => 'skills',
    'srd_feats' => 'feats',
    'srd_equipment' => 'equipment',
    'srd_spells' => 'spells',
    'srd_monsters' => 'monsters',
    'srd_items' => 'items',
];

foreach ($tableMappings5e as $oldTable => $newTable) {
    migrateTable($pdo, '5e', $oldTable, $newTable, $results);
}

// ═══════════════════════════════════════════════════════════
// MIGRATE 5e2024 DATA
// ═══════════════════════════════════════════════════════════
$results[] = '';
$results[] = '<strong>═══ Migrating D&D 5e (2024) Data ═══</strong>';

foreach ($tableMappings5e as $oldTable => $newTable) {
    migrateTable($pdo, '5e2024', $oldTable, $newTable, $results);
}

// ═══════════════════════════════════════════════════════════
// VERIFICATION
// ═══════════════════════════════════════════════════════════
$results[] = '';
$results[] = '<strong>═══ Verification ═══</strong>';

foreach (['3.5e', '5e', '5e2024'] as $ed) {
    $cfg = SRD_DBS[$ed] ?? null;
    $dbName = is_array($cfg) ? $cfg['db'] : ($cfg ?? '?');
    $tables = getSrdDB($ed)->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    $counts = [];
    foreach ($tables as $t) {
        $cnt = getSrdDB($ed)->query("SELECT COUNT(*) FROM {$t}")->fetchColumn();
        if ($cnt > 0) {
            $counts[] = "{$t}={$cnt}";
        }
    }
    $results[] = "📊 {$ed} ({$dbName}): " . (empty($counts) ? 'empty' : implode(', ', $counts));
}

$results[] = '';
$results[] = '🎉 <strong>Migration complete!</strong>';
$results[] = 'The old shared srd_* tables in the main DB can be dropped once you verify everything works.';
$results[] = '<strong>Delete this file after migration.</strong>';

// Output
echo '<!DOCTYPE html><html><head><title>SRD Migration</title>';
echo '<style>body{font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:20px;line-height:1.8}h1{color:#f5c518}strong{color:#f5c518}code{color:#4fc978;background:#252540;padding:2px 6px;border-radius:3px}</style>';
echo '</head><body><h1>Eon Weaver — SRD Data Migration</h1>';
foreach ($results as $r)
    echo "<div>$r</div>";
echo '</body></html>';
