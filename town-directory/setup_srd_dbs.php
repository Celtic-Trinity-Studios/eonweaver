<?php
/**
 * Eon Weaver — SRD Database Setup & Migration (All-in-One)
 *
 * This script does EVERYTHING:
 *   1. Creates the 3 edition-specific SRD databases (if your user has CREATE DATABASE privilege)
 *   2. Creates all tables in each database
 *   3. Migrates existing data from the old shared srd_* tables
 *   4. Verifies the migration
 *
 * Usage: setup_srd_dbs.php?key=setup2024
 *
 * DELETE THIS FILE after successful migration.
 */
header('Content-Type: text/html; charset=utf-8');
set_time_limit(600);
ini_set('memory_limit', '512M');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

$SETUP_KEY = 'setup2024';
if (($_GET['key'] ?? '') !== $SETUP_KEY) {
    die('Access denied. Use ?key=' . $SETUP_KEY);
}

$results = [];
$errors = 0;

// ═══════════════════════════════════════════════════════════
// STEP 1: CREATE DATABASES
// ═══════════════════════════════════════════════════════════
$results[] = '<h2>Step 1: Create Databases</h2>';

// Connect to MySQL without selecting a database
try {
    $rootDsn = 'mysql:host=' . DB_HOST . ';charset=' . DB_CHARSET;
    $rootPdo = new PDO($rootDsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);

    foreach (SRD_DBS as $edition => $cfg) {
        $dbName = is_array($cfg) ? $cfg['db'] : $cfg;
        try {
            $rootPdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            $results[] = "✅ Database <code>{$dbName}</code> created (or already exists)";
        } catch (PDOException $e) {
            if (stripos($e->getMessage(), 'Access denied') !== false || stripos($e->getMessage(), '1044') !== false) {
                $results[] = "⚠️ Cannot auto-create <code>{$dbName}</code> — need to create in Hostinger panel";
                $results[] = "   <em>Error: " . htmlspecialchars($e->getMessage()) . "</em>";
                $errors++;
            } else {
                throw $e;
            }
        }
    }

    // Try to grant privileges (likely won't work on shared hosting, that's OK)
    foreach (SRD_DBS as $edition => $cfg) {
        $dbName = is_array($cfg) ? $cfg['db'] : $cfg;
        try {
            $rootPdo->exec("GRANT ALL PRIVILEGES ON `{$dbName}`.* TO '" . DB_USER . "'@'%'");
        } catch (PDOException $e) {
            // Expected to fail on shared hosting — user already has access if DB was created via panel
        }
    }

} catch (PDOException $e) {
    $results[] = "⚠️ Could not connect without database: " . htmlspecialchars($e->getMessage());
    $results[] = "   Trying to proceed anyway (databases may already exist)...";
}

if ($errors > 0) {
    $results[] = '';
    $results[] = '<div style="background:#3d2f1f;border:1px solid #f90;padding:12px;border-radius:6px;margin:10px 0">';
    $results[] = '<strong style="color:#f90">⚠️ Could not auto-create databases (normal on shared hosting).</strong><br>';
    $results[] = 'Attempting to connect with per-database credentials...';
    $results[] = '</div>';
}

// ═══════════════════════════════════════════════════════════
// STEP 2: CREATE TABLES
// ═══════════════════════════════════════════════════════════
$results[] = '<h2>Step 2: Create Tables</h2>';

// Reset error counter — Step 1 failures don't matter if we can connect
$errors = 0;

// Test if we can connect to each SRD database
$dbsReady = [];
foreach (SRD_DBS as $edition => $cfg) {
    $dbName = is_array($cfg) ? $cfg['db'] : $cfg;
    try {
        $testPdo = getSrdDB($edition);
        $dbsReady[$edition] = true;
        $results[] = "✅ Connected to <code>{$dbName}</code>";
    } catch (PDOException $e) {
        $dbsReady[$edition] = false;
        $results[] = "❌ Cannot connect to <code>{$dbName}</code>: " . htmlspecialchars($e->getMessage());
        $errors++;
    }
}

if ($errors > 0 && count(array_filter($dbsReady)) === 0) {
    // Can't proceed at all
    $results[] = '';
    $results[] = '<div style="background:#3d1f1f;border:1px solid #f44;padding:12px;border-radius:6px;margin:10px 0">';
    $results[] = '<strong style="color:#f44">⛔ Cannot connect to any SRD databases.</strong><br>';
    $results[] = 'Create these databases in your Hostinger panel and ensure the users have access:';
    $results[] = '<ol>';
    foreach (SRD_DBS as $edition => $cfg) {
        $dn = is_array($cfg) ? $cfg['db'] : $cfg;
        $results[] = '<li><code>' . $dn . '</code> (for ' . $edition . ')</li>';
    }
    $results[] = '</ol>';
    $results[] = '</div>';
    goto output;
}

// ── 3.5e Tables (full set) ─────────────────────────────────
if ($dbsReady['3.5e'] ?? false) {
    $srd35 = getSrdDB('3.5e');
    $results[] = '';
    $results[] = '<strong>═══ D&D 3.5e Tables ═══</strong>';

    $srd35->exec("CREATE TABLE IF NOT EXISTS races (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        size VARCHAR(20) DEFAULT 'Medium',
        speed INT DEFAULT 30,
        ability_mods TEXT DEFAULT '',
        traits TEXT,
        languages TEXT DEFAULT '',
        INDEX idx_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $srd35->exec("CREATE TABLE IF NOT EXISTS classes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        hit_die VARCHAR(10) DEFAULT '',
        bab_type VARCHAR(20) DEFAULT '',
        good_saves VARCHAR(50) DEFAULT '',
        skills_per_level INT DEFAULT 2,
        class_skills TEXT DEFAULT '',
        class_features TEXT,
        INDEX idx_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $srd35->exec("CREATE TABLE IF NOT EXISTS skills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        subtype VARCHAR(100) DEFAULT '',
        ability VARCHAR(10) DEFAULT '',
        psionic VARCHAR(10) DEFAULT 'No',
        trained_only TINYINT(1) DEFAULT 0,
        armor_check_penalty TINYINT(1) DEFAULT 0,
        description TEXT,
        synergy TEXT,
        full_text MEDIUMTEXT,
        reference VARCHAR(200) DEFAULT '',
        INDEX idx_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $srd35->exec("CREATE TABLE IF NOT EXISTS feats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        type VARCHAR(50) DEFAULT 'General',
        multiple VARCHAR(10) DEFAULT 'No',
        stack VARCHAR(10) DEFAULT 'No',
        prerequisites TEXT DEFAULT '',
        benefit TEXT,
        special TEXT,
        normal_text TEXT,
        description TEXT,
        full_text MEDIUMTEXT,
        reference VARCHAR(200) DEFAULT '',
        INDEX idx_name (name),
        INDEX idx_type (type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $srd35->exec("CREATE TABLE IF NOT EXISTS equipment (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        category VARCHAR(100) DEFAULT '',
        subcategory VARCHAR(100) DEFAULT '',
        cost VARCHAR(50) DEFAULT '',
        dmg_s VARCHAR(50) DEFAULT '',
        dmg_m VARCHAR(50) DEFAULT '',
        armor_bonus VARCHAR(20) DEFAULT '',
        max_dex VARCHAR(20) DEFAULT '',
        weight VARCHAR(50) DEFAULT '',
        damage VARCHAR(50) DEFAULT '',
        critical VARCHAR(50) DEFAULT '',
        acp VARCHAR(20) DEFAULT '',
        spell_failure VARCHAR(20) DEFAULT '',
        range_increment VARCHAR(50) DEFAULT '',
        type_text VARCHAR(100) DEFAULT '',
        properties TEXT,
        full_text MEDIUMTEXT,
        reference VARCHAR(200) DEFAULT '',
        INDEX idx_name (name),
        INDEX idx_category (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $srd35->exec("CREATE TABLE IF NOT EXISTS spells (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        altname VARCHAR(200) DEFAULT '',
        school VARCHAR(100) DEFAULT '',
        subschool VARCHAR(100) DEFAULT '',
        descriptor_text VARCHAR(200) DEFAULT '',
        level VARCHAR(200) DEFAULT '',
        components VARCHAR(200) DEFAULT '',
        casting_time VARCHAR(200) DEFAULT '',
        spell_range VARCHAR(200) DEFAULT '',
        target TEXT,
        area TEXT,
        effect TEXT,
        duration VARCHAR(200) DEFAULT '',
        saving_throw VARCHAR(200) DEFAULT '',
        spell_resistance VARCHAR(100) DEFAULT '',
        short_description TEXT,
        description MEDIUMTEXT,
        material_components TEXT,
        focus TEXT,
        xp_cost TEXT,
        full_text MEDIUMTEXT,
        reference VARCHAR(200) DEFAULT '',
        INDEX idx_name (name),
        INDEX idx_school (school),
        INDEX idx_level (level(100))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $srd35->exec("CREATE TABLE IF NOT EXISTS monsters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        family VARCHAR(200) DEFAULT '',
        name VARCHAR(200) NOT NULL,
        altname VARCHAR(200) DEFAULT '',
        size VARCHAR(50) DEFAULT '',
        type VARCHAR(100) DEFAULT '',
        descriptor_text VARCHAR(200) DEFAULT '',
        hit_dice VARCHAR(200) DEFAULT '',
        initiative VARCHAR(100) DEFAULT '',
        speed VARCHAR(200) DEFAULT '',
        armor_class VARCHAR(300) DEFAULT '',
        base_attack VARCHAR(100) DEFAULT '',
        grapple VARCHAR(100) DEFAULT '',
        attack TEXT,
        full_attack TEXT,
        space VARCHAR(50) DEFAULT '',
        reach VARCHAR(50) DEFAULT '',
        special_attacks TEXT,
        special_qualities TEXT,
        saves VARCHAR(200) DEFAULT '',
        abilities VARCHAR(200) DEFAULT '',
        skills TEXT,
        feats TEXT,
        bonus_feats TEXT,
        epic_feats TEXT,
        environment TEXT,
        organization TEXT,
        challenge_rating VARCHAR(50) DEFAULT '',
        treasure VARCHAR(200) DEFAULT '',
        alignment VARCHAR(200) DEFAULT '',
        advancement TEXT,
        level_adjustment VARCHAR(50) DEFAULT '',
        special_abilities TEXT,
        stat_block TEXT,
        full_text MEDIUMTEXT,
        reference VARCHAR(200) DEFAULT '',
        INDEX idx_name (name),
        INDEX idx_type (type),
        INDEX idx_cr (challenge_rating),
        INDEX idx_family (family)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $srd35->exec("CREATE TABLE IF NOT EXISTS powers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        discipline VARCHAR(100) DEFAULT '',
        subdiscipline VARCHAR(100) DEFAULT '',
        descriptor_text VARCHAR(200) DEFAULT '',
        level VARCHAR(200) DEFAULT '',
        display VARCHAR(200) DEFAULT '',
        manifesting_time VARCHAR(200) DEFAULT '',
        power_range VARCHAR(200) DEFAULT '',
        target TEXT,
        area TEXT,
        effect TEXT,
        duration VARCHAR(200) DEFAULT '',
        saving_throw VARCHAR(200) DEFAULT '',
        power_points VARCHAR(50) DEFAULT '',
        power_resistance VARCHAR(100) DEFAULT '',
        short_description TEXT,
        description MEDIUMTEXT,
        augment MEDIUMTEXT,
        xp_cost TEXT,
        full_text MEDIUMTEXT,
        reference VARCHAR(200) DEFAULT '',
        INDEX idx_name (name),
        INDEX idx_discipline (discipline)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $srd35->exec("CREATE TABLE IF NOT EXISTS domains (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        granted_powers TEXT,
        spell_1 VARCHAR(200) DEFAULT '',
        spell_2 VARCHAR(200) DEFAULT '',
        spell_3 VARCHAR(200) DEFAULT '',
        spell_4 VARCHAR(200) DEFAULT '',
        spell_5 VARCHAR(200) DEFAULT '',
        spell_6 VARCHAR(200) DEFAULT '',
        spell_7 VARCHAR(200) DEFAULT '',
        spell_8 VARCHAR(200) DEFAULT '',
        spell_9 VARCHAR(200) DEFAULT '',
        full_text MEDIUMTEXT,
        reference VARCHAR(200) DEFAULT '',
        INDEX idx_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $srd35->exec("CREATE TABLE IF NOT EXISTS items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        category VARCHAR(100) DEFAULT '',
        subcategory VARCHAR(100) DEFAULT '',
        special_ability VARCHAR(10) DEFAULT 'No',
        aura VARCHAR(200) DEFAULT '',
        caster_level VARCHAR(50) DEFAULT '',
        price VARCHAR(200) DEFAULT '',
        manifester_level VARCHAR(50) DEFAULT '',
        prereq TEXT,
        cost VARCHAR(200) DEFAULT '',
        weight VARCHAR(50) DEFAULT '',
        full_text MEDIUMTEXT,
        reference VARCHAR(200) DEFAULT '',
        INDEX idx_name (name),
        INDEX idx_category (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $srd35->exec("CREATE TABLE IF NOT EXISTS class_progression (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        level INT NOT NULL,
        base_attack_bonus VARCHAR(50) DEFAULT '',
        fort_save VARCHAR(20) DEFAULT '',
        ref_save VARCHAR(20) DEFAULT '',
        will_save VARCHAR(20) DEFAULT '',
        special TEXT,
        caster_level VARCHAR(20) DEFAULT '',
        ac_bonus VARCHAR(20) DEFAULT '',
        flurry_of_blows VARCHAR(50) DEFAULT '',
        unarmed_damage VARCHAR(50) DEFAULT '',
        unarmored_speed_bonus VARCHAR(20) DEFAULT '',
        power_level VARCHAR(50) DEFAULT '',
        points_per_day VARCHAR(50) DEFAULT '',
        powers_known VARCHAR(50) DEFAULT '',
        slots_0 VARCHAR(20) DEFAULT '',
        slots_1 VARCHAR(20) DEFAULT '',
        slots_2 VARCHAR(20) DEFAULT '',
        slots_3 VARCHAR(20) DEFAULT '',
        slots_4 VARCHAR(20) DEFAULT '',
        slots_5 VARCHAR(20) DEFAULT '',
        slots_6 VARCHAR(20) DEFAULT '',
        slots_7 VARCHAR(20) DEFAULT '',
        slots_8 VARCHAR(20) DEFAULT '',
        slots_9 VARCHAR(20) DEFAULT '',
        reference VARCHAR(200) DEFAULT '',
        INDEX idx_name (name),
        INDEX idx_level (level)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $results[] = '✅ All 11 tables created for 3.5e';
}

// ── 5e / 5e2024 Tables (shared schema) ─────────────────────
foreach (['5e' => '5e (2014)', '5e2024' => '5e (2024)'] as $edKey => $edLabel) {
    if (!($dbsReady[$edKey] ?? false))
        continue;

    $srd5e = getSrdDB($edKey);
    $results[] = '';
    $results[] = "<strong>═══ D&D {$edLabel} Tables ═══</strong>";

    $srd5e->exec("CREATE TABLE IF NOT EXISTS races (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        size VARCHAR(20) DEFAULT 'Medium',
        speed INT DEFAULT 30,
        ability_mods TEXT DEFAULT '',
        traits TEXT,
        languages TEXT DEFAULT '',
        INDEX idx_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $srd5e->exec("CREATE TABLE IF NOT EXISTS classes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        hit_die VARCHAR(10) DEFAULT '',
        bab_type VARCHAR(20) DEFAULT '',
        good_saves VARCHAR(50) DEFAULT '',
        skills_per_level INT DEFAULT 2,
        class_skills TEXT DEFAULT '',
        class_features TEXT,
        INDEX idx_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $srd5e->exec("CREATE TABLE IF NOT EXISTS skills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        ability VARCHAR(10) DEFAULT '',
        trained_only TINYINT(1) DEFAULT 0,
        armor_check_penalty TINYINT(1) DEFAULT 0,
        description TEXT,
        INDEX idx_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $srd5e->exec("CREATE TABLE IF NOT EXISTS feats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        type VARCHAR(50) DEFAULT 'General',
        prerequisites TEXT DEFAULT '',
        benefit TEXT,
        description TEXT,
        INDEX idx_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $srd5e->exec("CREATE TABLE IF NOT EXISTS equipment (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        category VARCHAR(100) DEFAULT '',
        cost VARCHAR(50) DEFAULT '',
        weight VARCHAR(50) DEFAULT '',
        damage VARCHAR(50) DEFAULT '',
        critical VARCHAR(50) DEFAULT '',
        properties TEXT,
        INDEX idx_name (name),
        INDEX idx_category (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $srd5e->exec("CREATE TABLE IF NOT EXISTS spells (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        school VARCHAR(100) DEFAULT '',
        subschool VARCHAR(100) DEFAULT '',
        descriptor_text VARCHAR(200) DEFAULT '',
        level VARCHAR(200) DEFAULT '',
        components VARCHAR(200) DEFAULT '',
        casting_time VARCHAR(200) DEFAULT '',
        spell_range VARCHAR(200) DEFAULT '',
        duration VARCHAR(200) DEFAULT '',
        saving_throw VARCHAR(200) DEFAULT '',
        spell_resistance VARCHAR(100) DEFAULT '',
        short_description TEXT,
        description MEDIUMTEXT,
        INDEX idx_name (name),
        INDEX idx_school (school)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $srd5e->exec("CREATE TABLE IF NOT EXISTS monsters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        family VARCHAR(200) DEFAULT '',
        name VARCHAR(200) NOT NULL,
        size VARCHAR(50) DEFAULT '',
        type VARCHAR(100) DEFAULT '',
        descriptor_text VARCHAR(200) DEFAULT '',
        hit_dice VARCHAR(200) DEFAULT '',
        armor_class VARCHAR(300) DEFAULT '',
        challenge_rating VARCHAR(50) DEFAULT '',
        alignment VARCHAR(200) DEFAULT '',
        environment TEXT,
        INDEX idx_name (name),
        INDEX idx_type (type),
        INDEX idx_cr (challenge_rating)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $srd5e->exec("CREATE TABLE IF NOT EXISTS items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        category VARCHAR(100) DEFAULT '',
        subcategory VARCHAR(100) DEFAULT '',
        aura VARCHAR(200) DEFAULT '',
        caster_level VARCHAR(50) DEFAULT '',
        price VARCHAR(200) DEFAULT '',
        weight VARCHAR(50) DEFAULT '',
        INDEX idx_name (name),
        INDEX idx_category (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $results[] = "✅ All 8 tables created for {$edLabel}";
}

// ═══════════════════════════════════════════════════════════
// STEP 3: MIGRATE DATA from old shared srd_* tables
// ═══════════════════════════════════════════════════════════
$results[] = '<h2>Step 3: Migrate Data</h2>';

$pdo = getDB(); // Main database with old shared tables

/**
 * Migrate rows from a shared srd_* table to the edition-specific database.
 */
function migrateTable($pdo, string $edition, string $oldTable, string $newTable, &$results)
{
    if (!isset(SRD_DBS[$edition]))
        return 0;

    // Check if old table exists
    try {
        $pdo->query("SELECT 1 FROM {$oldTable} LIMIT 1");
    } catch (Exception $e) {
        $results[] = "⏭️ {$oldTable}: not found in main DB, skipping";
        return 0;
    }

    // Check if new table already has data
    try {
        $existingCount = getSrdDB($edition)->query("SELECT COUNT(*) FROM {$newTable}")->fetchColumn();
        if ($existingCount > 0) {
            $results[] = "⏭️ {$newTable} [{$edition}]: already has {$existingCount} rows, skipping";
            return $existingCount;
        }
    } catch (Exception $e) {
        $results[] = "❌ {$newTable}: cannot check target table — " . $e->getMessage();
        return 0;
    }

    // Check if edition column exists in old table
    $hasEdition = false;
    try {
        $cols = $pdo->query("DESCRIBE {$oldTable}")->fetchAll(PDO::FETCH_COLUMN);
        $hasEdition = in_array('edition', $cols);
    } catch (Exception $e) {
    }

    // Read rows from old table
    if ($hasEdition) {
        $rows = $pdo->query("SELECT * FROM {$oldTable} WHERE edition = '{$edition}'")->fetchAll(PDO::FETCH_ASSOC);
        // If no rows for this edition and it's 3.5e, try without filter (old data before edition column was added)
        if (empty($rows) && $edition === '3.5e') {
            $rows = $pdo->query("SELECT * FROM {$oldTable}")->fetchAll(PDO::FETCH_ASSOC);
        }
    } else {
        // No edition column — only migrate to 3.5e (the default/original edition)
        if ($edition !== '3.5e') {
            $results[] = "⏭️ {$oldTable} [{$edition}]: no edition column, only migrating to 3.5e";
            return 0;
        }
        $rows = $pdo->query("SELECT * FROM {$oldTable}")->fetchAll(PDO::FETCH_ASSOC);
    }

    if (empty($rows)) {
        $results[] = "⏭️ {$oldTable} [{$edition}]: no rows to migrate";
        return 0;
    }

    $srdDb = getSrdDB($edition);

    // Get column list from the new table
    $newCols = $srdDb->query("DESCRIBE {$newTable}")->fetchAll(PDO::FETCH_COLUMN);

    $count = 0;
    $errCount = 0;
    foreach ($rows as $row) {
        // Remove edition and id columns
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

        $colStr = implode(',', array_keys($filtered));
        $placeholders = implode(',', array_fill(0, count($filtered), '?'));
        try {
            $stmt = $srdDb->prepare("INSERT INTO {$newTable} ({$colStr}) VALUES ({$placeholders})");
            $stmt->execute(array_values($filtered));
            $count++;
        } catch (Exception $e) {
            $errCount++;
            if ($errCount <= 2) {
                $results[] = "   ⚠️ Row error in {$newTable}: " . $e->getMessage();
            }
        }
    }

    $suffix = $errCount > 0 ? " ({$errCount} errors)" : '';
    $results[] = "✅ {$newTable}: migrated {$count} / " . count($rows) . " rows from {$oldTable}{$suffix}";
    return $count;
}

// Table mappings: old_table => new_table
$allTables = [
    'srd_races' => 'races',
    'srd_classes' => 'classes',
    'srd_skills' => 'skills',
    'srd_feats' => 'feats',
    'srd_equipment' => 'equipment',
    'srd_spells' => 'spells',
    'srd_monsters' => 'monsters',
    'srd_items' => 'items',
];
$tables35only = [
    'srd_powers' => 'powers',
    'srd_domains' => 'domains',
    'srd_class_progression' => 'class_progression',
];

// Migrate 3.5e
if ($dbsReady['3.5e'] ?? false) {
    $results[] = '<strong>═══ Migrating 3.5e Data ═══</strong>';
    foreach (array_merge($allTables, $tables35only) as $old => $new) {
        migrateTable($pdo, '3.5e', $old, $new, $results);
    }
}

// Migrate 5e
if ($dbsReady['5e'] ?? false) {
    $results[] = '';
    $results[] = '<strong>═══ Migrating 5e (2014) Data ═══</strong>';
    foreach ($allTables as $old => $new) {
        migrateTable($pdo, '5e', $old, $new, $results);
    }
}

// Migrate 5e2024
if ($dbsReady['5e2024'] ?? false) {
    $results[] = '';
    $results[] = '<strong>═══ Migrating 5e (2024) Data ═══</strong>';
    foreach ($allTables as $old => $new) {
        migrateTable($pdo, '5e2024', $old, $new, $results);
    }
}

// ═══════════════════════════════════════════════════════════
// STEP 4: VERIFICATION
// ═══════════════════════════════════════════════════════════
$results[] = '<h2>Step 4: Verification</h2>';

foreach (['3.5e', '5e', '5e2024'] as $ed) {
    if (!($dbsReady[$ed] ?? false)) {
        $results[] = "⏭️ {$ed}: database not available";
        continue;
    }

    $cfg = SRD_DBS[$ed];
    $dbName = is_array($cfg) ? $cfg['db'] : $cfg;
    $tables = getSrdDB($ed)->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    $counts = [];
    $total = 0;
    foreach ($tables as $t) {
        $cnt = getSrdDB($ed)->query("SELECT COUNT(*) FROM {$t}")->fetchColumn();
        $total += $cnt;
        $counts[] = "{$t}=<strong>{$cnt}</strong>";
    }
    $emoji = $total > 0 ? '📊' : '⚠️';
    $results[] = "{$emoji} <strong>{$ed}</strong> ({$dbName}): " . count($tables) . " tables, " . $total . " total rows";
    $results[] = "   " . implode(', ', $counts);
}

// ═══════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════
$results[] = '<h2>Summary</h2>';

$allGood = count(array_filter($dbsReady)) === 3;
if ($allGood) {
    $results[] = '🎉 <strong style="color:#4fc978;font-size:1.2em">All SRD databases are set up and data has been migrated!</strong>';
    $results[] = '';
    $results[] = 'The old shared <code>srd_*</code> tables in the main database can be dropped once you verify everything works.';
    $results[] = '<strong style="color:#f5c518">⚠️ Delete this script from the server!</strong>';
} else {
    $results[] = '⚠️ Some databases could not be set up. See errors above.';
    $results[] = 'Create the missing databases in Hostinger panel and re-run this script.';
}

// ═══════════════════════════════════════════════════════════
// OUTPUT
// ═══════════════════════════════════════════════════════════
output:
echo '<!DOCTYPE html><html><head><title>SRD Database Setup</title>';
echo '<style>';
echo 'body { font-family: "Segoe UI", monospace; background: #0f0f1e; color: #e0e0e0; padding: 30px; line-height: 1.8; max-width: 900px; margin: 0 auto; }';
echo 'h1 { color: #f5c518; border-bottom: 2px solid #f5c518; padding-bottom: 10px; }';
echo 'h2 { color: #7c8aff; margin-top: 30px; border-bottom: 1px solid #333; padding-bottom: 5px; }';
echo 'strong { color: #f5c518; }';
echo 'code { color: #4fc978; background: #1a1a30; padding: 2px 8px; border-radius: 4px; font-family: "Cascadia Mono", monospace; }';
echo 'em { color: #888; font-size: 0.85em; }';
echo '</style>';
echo '</head><body>';
echo '<h1>⚔️ Eon Weaver — SRD Database Setup & Migration</h1>';
foreach ($results as $r)
    echo "<div>{$r}</div>";
echo '</body></html>';
