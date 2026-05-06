<?php
/**
 * Eon Weaver — Data Migration Script
 * Copies ALL data from old WorldScribe database to new EonWeaver database.
 * Both databases are on the same host (localhost).
 *
 * Access on your host e.g.: https://eonscribe.com/migrate_data.php?key=migrate2026
 */

set_time_limit(300); // 5 minutes max
ini_set('memory_limit', '256M');

$MIGRATE_KEY = 'migrate2026';
if (($_GET['key'] ?? '') !== $MIGRATE_KEY) {
    die('Access denied. Use ?key=' . $MIGRATE_KEY);
}

// ── Old database credentials ────────────────────────────
$OLD_DB = 'u902447017_WorldScribe';
$OLD_USER = 'u902447017_WSSnarf';
$OLD_PASS = '@Jdsdm14e';

// ── New database (from config.php) ──────────────────────
require_once __DIR__ . '/config.php';

$results = [];
$errors = [];

echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Eon Weaver — Data Migration</title>';
echo '<style>body{background:#0a0a1a;color:#e0e0e0;font-family:monospace;padding:30px;max-width:900px;margin:0 auto}';
echo 'h1{color:#c8a415}.ok{color:#4caf50}.err{color:#e74c3c}.skip{color:#ff9800}.info{color:#64b5f6}</style>';
echo '</head><body><h1>Eon Weaver — Data Migration</h1>';
echo '<p class="info">Migrating from <strong>' . $OLD_DB . '</strong> → <strong>' . DB_NAME . '</strong></p>';
echo '<hr>';

// Flush output incrementally
function out($msg, $class = 'ok') {
    echo "<div class=\"$class\">$msg</div>";
    ob_flush(); flush();
}

try {
    // Connect to OLD database
    $old = new PDO(
        "mysql:host=localhost;dbname=$OLD_DB;charset=utf8mb4",
        $OLD_USER, $OLD_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
    out("✅ Connected to OLD database ($OLD_DB)");

    // Connect to NEW database
    $new = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET,
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
    out("✅ Connected to NEW database (" . DB_NAME . ")");

    // Disable foreign key checks during migration
    $new->exec("SET FOREIGN_KEY_CHECKS = 0");
    out("⚙️ Foreign key checks disabled", 'info');

    // Tables to migrate in dependency order
    // Each entry: [table_name, optional_column_override]
    // We preserve all IDs so foreign keys stay intact
    $tables = [
        'users',
        'campaigns',
        'towns',
        'characters',
        'character_equipment',
        'history',
        'town_meta',
        'town_buildings',
        'building_rooms',
        'campaign_rules',
        'calendar',
        'site_settings',
        'user_credits',
        'user_token_usage',
        'factions',
        'faction_members',
        'faction_relations',
        'events',
        'rumors',
        'timeline_log',
        'party_members',
        'encounters',
        'encounter_groups',
        'encounter_participants',
        'character_memories',
        'character_relationships',
        'town_incidents',
        'incident_participants',
        'incident_clues',
        'pc_reputation',
        'character_xp_log',
        'character_spells_known',
        'character_spells_prepared',
        'character_spellbook',
        'character_active_effects',
        'character_level_history',
        // Legacy SRD tables (in main DB)
        'srd_races',
        'srd_classes',
        'srd_skills',
        'srd_feats',
        'srd_equipment',
    ];

    $totalRows = 0;

    foreach ($tables as $table) {
        try {
            // Check if table exists in old DB
            $check = $old->query("SHOW TABLES LIKE '$table'");
            if ($check->rowCount() === 0) {
                out("⏭️ $table — does not exist in old DB, skipping", 'skip');
                continue;
            }

            // Check if table exists in new DB
            $checkNew = $new->query("SHOW TABLES LIKE '$table'");
            if ($checkNew->rowCount() === 0) {
                out("⏭️ $table — does not exist in new DB, skipping", 'skip');
                continue;
            }

            // Count existing rows in new DB
            $existingCount = (int)$new->query("SELECT COUNT(*) FROM `$table`")->fetchColumn();
            
            // Count rows in old DB
            $oldCount = (int)$old->query("SELECT COUNT(*) FROM `$table`")->fetchColumn();

            if ($oldCount === 0) {
                out("⏭️ $table — empty in old DB (0 rows)", 'skip');
                continue;
            }

            if ($existingCount > 0) {
                out("⚠️ $table — new DB already has $existingCount rows, CLEARING first…", 'skip');
                $new->exec("DELETE FROM `$table`");
            }

            // Get column names from old table
            $colStmt = $old->query("SHOW COLUMNS FROM `$table`");
            $columns = [];
            while ($col = $colStmt->fetch()) {
                $columns[] = '`' . $col['Field'] . '`';
            }

            // Get column names from new table
            $newColStmt = $new->query("SHOW COLUMNS FROM `$table`");
            $newColumns = [];
            while ($col = $newColStmt->fetch()) {
                $newColumns[] = $col['Field'];
            }

            // Only migrate columns that exist in BOTH old and new tables
            $commonCols = [];
            foreach ($columns as $c) {
                $cleanName = trim($c, '`');
                if (in_array($cleanName, $newColumns)) {
                    $commonCols[] = '`' . $cleanName . '`';
                }
            }

            $colList = implode(', ', $commonCols);
            $placeholders = implode(', ', array_fill(0, count($commonCols), '?'));

            // Fetch all rows from old DB
            $rows = $old->query("SELECT $colList FROM `$table`")->fetchAll(PDO::FETCH_NUM);
            
            // Insert into new DB in batches
            $insertSql = "INSERT INTO `$table` ($colList) VALUES ($placeholders)";
            $stmt = $new->prepare($insertSql);

            $inserted = 0;
            foreach ($rows as $row) {
                try {
                    $stmt->execute($row);
                    $inserted++;
                } catch (PDOException $e) {
                    // Skip duplicate key errors, log others
                    if (strpos($e->getMessage(), 'Duplicate entry') === false) {
                        $errors[] = "$table row error: " . $e->getMessage();
                    }
                }
            }

            $totalRows += $inserted;
            out("✅ $table — migrated $inserted / $oldCount rows");

            // Reset auto-increment to match
            try {
                $maxId = $old->query("SELECT MAX(id) FROM `$table`")->fetchColumn();
                if ($maxId) {
                    $new->exec("ALTER TABLE `$table` AUTO_INCREMENT = " . ($maxId + 1));
                }
            } catch (Exception $e) { /* table might not have an id column */ }

        } catch (Exception $e) {
            out("❌ $table — " . htmlspecialchars($e->getMessage()), 'err');
            $errors[] = "$table: " . $e->getMessage();
        }
    }

    // Re-enable foreign key checks
    $new->exec("SET FOREIGN_KEY_CHECKS = 1");
    out("", 'info');
    out("⚙️ Foreign key checks re-enabled", 'info');

    echo '<hr>';
    out("🎉 Migration complete! Total rows migrated: <strong>$totalRows</strong>");

    if (count($errors) > 0) {
        echo '<hr><h2 style="color:#e74c3c">Errors (' . count($errors) . ')</h2>';
        foreach ($errors as $err) {
            out(htmlspecialchars($err), 'err');
        }
    }

    echo '<br><p class="info"><strong>⚠️ DELETE this file after migration!</strong></p>';

} catch (Exception $e) {
    out("❌ FATAL: " . htmlspecialchars($e->getMessage()), 'err');
    echo '<br><p>Check your database credentials. Old DB: ' . $OLD_DB . ', New DB: ' . DB_NAME . '</p>';
}

echo '</body></html>';
