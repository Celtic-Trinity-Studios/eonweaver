<?php
/**
 * Eon Weaver — SRD Import from SQLite (3.5e Edition Database)
 * 
 * Reads dnd35.db (SQLite) and imports all SRD data into the
 * edition-specific 3.5e MySQL database.
 * 
 * Usage: Visit this file in browser, or run via CLI: php import_srd.php
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

set_time_limit(300);
ini_set('memory_limit', '512M');

$results = [];

try {
    $pdo = getSrdDB('3.5e');

    // ─── Locate SQLite file ─────────────────────────────
    $sqliteFile = __DIR__ . '/dnd35.db';
    if (!file_exists($sqliteFile)) {
        throw new Exception("dnd35.db not found at: $sqliteFile — upload it to the same directory as this script.");
    }

    $sqlite = new PDO("sqlite:$sqliteFile");
    $sqlite->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $results[] = "✅ Connected to dnd35.db (" . round(filesize($sqliteFile) / 1024) . " KB)";

    // ═══════════════════════════════════════════════════════
    // 1. CREATE NEW TABLES (if they don't exist)
    // ═══════════════════════════════════════════════════════

    $pdo->exec("CREATE TABLE IF NOT EXISTS spells (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        name            VARCHAR(200) NOT NULL,
        altname         VARCHAR(200) DEFAULT '',
        school          VARCHAR(100) DEFAULT '',
        subschool       VARCHAR(100) DEFAULT '',
        descriptor_text VARCHAR(200) DEFAULT '',
        level           VARCHAR(200) DEFAULT '',
        components      VARCHAR(200) DEFAULT '',
        casting_time    VARCHAR(200) DEFAULT '',
        spell_range     VARCHAR(200) DEFAULT '',
        target          TEXT,
        area            TEXT,
        effect          TEXT,
        duration        VARCHAR(200) DEFAULT '',
        saving_throw    VARCHAR(200) DEFAULT '',
        spell_resistance VARCHAR(100) DEFAULT '',
        short_description TEXT,
        description     MEDIUMTEXT,
        material_components TEXT,
        focus           TEXT,
        xp_cost         TEXT,
        full_text       MEDIUMTEXT,
        reference       VARCHAR(200) DEFAULT '',
        INDEX idx_spell_name (name),
        INDEX idx_spell_school (school),
        INDEX idx_spell_level (level(100))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ spells table ready';

    $pdo->exec("CREATE TABLE IF NOT EXISTS monsters (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        family          VARCHAR(200) DEFAULT '',
        name            VARCHAR(200) NOT NULL,
        altname         VARCHAR(200) DEFAULT '',
        size            VARCHAR(50) DEFAULT '',
        type            VARCHAR(100) DEFAULT '',
        descriptor_text VARCHAR(200) DEFAULT '',
        hit_dice        VARCHAR(200) DEFAULT '',
        initiative      VARCHAR(100) DEFAULT '',
        speed           VARCHAR(200) DEFAULT '',
        armor_class     VARCHAR(300) DEFAULT '',
        base_attack     VARCHAR(100) DEFAULT '',
        grapple         VARCHAR(100) DEFAULT '',
        attack          TEXT,
        full_attack     TEXT,
        space           VARCHAR(50) DEFAULT '',
        reach           VARCHAR(50) DEFAULT '',
        special_attacks TEXT,
        special_qualities TEXT,
        saves           VARCHAR(200) DEFAULT '',
        abilities       VARCHAR(200) DEFAULT '',
        skills          TEXT,
        feats           TEXT,
        bonus_feats     TEXT,
        epic_feats      TEXT,
        environment     TEXT,
        organization    TEXT,
        challenge_rating VARCHAR(50) DEFAULT '',
        treasure        VARCHAR(200) DEFAULT '',
        alignment       VARCHAR(200) DEFAULT '',
        advancement     TEXT,
        level_adjustment VARCHAR(50) DEFAULT '',
        special_abilities TEXT,
        stat_block      TEXT,
        full_text       MEDIUMTEXT,
        reference       VARCHAR(200) DEFAULT '',
        INDEX idx_monster_name (name),
        INDEX idx_monster_type (type),
        INDEX idx_monster_cr (challenge_rating),
        INDEX idx_monster_family (family)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ monsters table ready';

    $pdo->exec("CREATE TABLE IF NOT EXISTS powers (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        name            VARCHAR(200) NOT NULL,
        discipline      VARCHAR(100) DEFAULT '',
        subdiscipline   VARCHAR(100) DEFAULT '',
        descriptor_text VARCHAR(200) DEFAULT '',
        level           VARCHAR(200) DEFAULT '',
        display         VARCHAR(200) DEFAULT '',
        manifesting_time VARCHAR(200) DEFAULT '',
        power_range     VARCHAR(200) DEFAULT '',
        target          TEXT,
        area            TEXT,
        effect          TEXT,
        duration        VARCHAR(200) DEFAULT '',
        saving_throw    VARCHAR(200) DEFAULT '',
        power_points    VARCHAR(50) DEFAULT '',
        power_resistance VARCHAR(100) DEFAULT '',
        short_description TEXT,
        description     MEDIUMTEXT,
        augment         MEDIUMTEXT,
        xp_cost         TEXT,
        full_text       MEDIUMTEXT,
        reference       VARCHAR(200) DEFAULT '',
        INDEX idx_power_name (name),
        INDEX idx_power_discipline (discipline)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ powers table ready';

    $pdo->exec("CREATE TABLE IF NOT EXISTS domains (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        name            VARCHAR(100) NOT NULL,
        granted_powers  TEXT,
        spell_1         VARCHAR(200) DEFAULT '',
        spell_2         VARCHAR(200) DEFAULT '',
        spell_3         VARCHAR(200) DEFAULT '',
        spell_4         VARCHAR(200) DEFAULT '',
        spell_5         VARCHAR(200) DEFAULT '',
        spell_6         VARCHAR(200) DEFAULT '',
        spell_7         VARCHAR(200) DEFAULT '',
        spell_8         VARCHAR(200) DEFAULT '',
        spell_9         VARCHAR(200) DEFAULT '',
        full_text       MEDIUMTEXT,
        reference       VARCHAR(200) DEFAULT '',
        INDEX idx_domain_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ domains table ready';

    $pdo->exec("CREATE TABLE IF NOT EXISTS class_progression (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        name            VARCHAR(100) NOT NULL,
        level           INT NOT NULL,
        base_attack_bonus VARCHAR(50) DEFAULT '',
        fort_save       VARCHAR(20) DEFAULT '',
        ref_save        VARCHAR(20) DEFAULT '',
        will_save       VARCHAR(20) DEFAULT '',
        special         TEXT,
        caster_level    VARCHAR(20) DEFAULT '',
        ac_bonus        VARCHAR(20) DEFAULT '',
        flurry_of_blows VARCHAR(50) DEFAULT '',
        unarmed_damage  VARCHAR(50) DEFAULT '',
        unarmored_speed_bonus VARCHAR(20) DEFAULT '',
        power_level     VARCHAR(50) DEFAULT '',
        points_per_day  VARCHAR(50) DEFAULT '',
        powers_known    VARCHAR(50) DEFAULT '',
        slots_0         VARCHAR(20) DEFAULT '',
        slots_1         VARCHAR(20) DEFAULT '',
        slots_2         VARCHAR(20) DEFAULT '',
        slots_3         VARCHAR(20) DEFAULT '',
        slots_4         VARCHAR(20) DEFAULT '',
        slots_5         VARCHAR(20) DEFAULT '',
        slots_6         VARCHAR(20) DEFAULT '',
        slots_7         VARCHAR(20) DEFAULT '',
        slots_8         VARCHAR(20) DEFAULT '',
        slots_9         VARCHAR(20) DEFAULT '',
        reference       VARCHAR(200) DEFAULT '',
        INDEX idx_classprog_name (name),
        INDEX idx_classprog_level (level)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ class_progression table ready';

    // Also extend srd_feats and srd_equipment if needed
    try {
        $pdo->exec("ALTER TABLE feats ADD COLUMN full_text MEDIUMTEXT AFTER description");
    } catch (Exception $e) {
    }
    try {
        $pdo->exec("ALTER TABLE feats ADD COLUMN reference VARCHAR(200) DEFAULT '' AFTER full_text");
    } catch (Exception $e) {
    }
    try {
        $pdo->exec("ALTER TABLE feats ADD COLUMN multiple VARCHAR(10) DEFAULT 'No' AFTER type");
    } catch (Exception $e) {
    }
    try {
        $pdo->exec("ALTER TABLE feats ADD COLUMN stack VARCHAR(10) DEFAULT 'No' AFTER multiple");
    } catch (Exception $e) {
    }
    try {
        $pdo->exec("ALTER TABLE feats ADD COLUMN special TEXT AFTER benefit");
    } catch (Exception $e) {
    }
    try {
        $pdo->exec("ALTER TABLE feats ADD COLUMN normal_text TEXT AFTER special");
    } catch (Exception $e) {
    }

    try {
        $pdo->exec("ALTER TABLE equipment ADD COLUMN subcategory VARCHAR(100) DEFAULT '' AFTER category");
    } catch (Exception $e) {
    }
    try {
        $pdo->exec("ALTER TABLE equipment ADD COLUMN dmg_s VARCHAR(50) DEFAULT '' AFTER cost");
    } catch (Exception $e) {
    }
    try {
        $pdo->exec("ALTER TABLE equipment ADD COLUMN dmg_m VARCHAR(50) DEFAULT '' AFTER dmg_s");
    } catch (Exception $e) {
    }
    try {
        $pdo->exec("ALTER TABLE equipment ADD COLUMN armor_bonus VARCHAR(20) DEFAULT '' AFTER dmg_m");
    } catch (Exception $e) {
    }
    try {
        $pdo->exec("ALTER TABLE equipment ADD COLUMN max_dex VARCHAR(20) DEFAULT '' AFTER armor_bonus");
    } catch (Exception $e) {
    }
    try {
        $pdo->exec("ALTER TABLE equipment ADD COLUMN acp VARCHAR(20) DEFAULT '' AFTER max_dex");
    } catch (Exception $e) {
    }
    try {
        $pdo->exec("ALTER TABLE equipment ADD COLUMN spell_failure VARCHAR(20) DEFAULT '' AFTER acp");
    } catch (Exception $e) {
    }
    try {
        $pdo->exec("ALTER TABLE equipment ADD COLUMN range_increment VARCHAR(50) DEFAULT '' AFTER spell_failure");
    } catch (Exception $e) {
    }
    try {
        $pdo->exec("ALTER TABLE equipment ADD COLUMN type_text VARCHAR(100) DEFAULT '' AFTER range_increment");
    } catch (Exception $e) {
    }
    try {
        $pdo->exec("ALTER TABLE equipment ADD COLUMN full_text MEDIUMTEXT AFTER properties");
    } catch (Exception $e) {
    }
    try {
        $pdo->exec("ALTER TABLE equipment ADD COLUMN reference VARCHAR(200) DEFAULT '' AFTER full_text");
    } catch (Exception $e) {
    }

    try {
        $pdo->exec("ALTER TABLE skills ADD COLUMN subtype VARCHAR(100) DEFAULT '' AFTER name");
    } catch (Exception $e) {
    }
    try {
        $pdo->exec("ALTER TABLE skills ADD COLUMN psionic VARCHAR(10) DEFAULT 'No' AFTER ability");
    } catch (Exception $e) {
    }
    try {
        $pdo->exec("ALTER TABLE skills ADD COLUMN synergy TEXT AFTER description");
    } catch (Exception $e) {
    }
    try {
        $pdo->exec("ALTER TABLE skills ADD COLUMN full_text MEDIUMTEXT AFTER synergy");
    } catch (Exception $e) {
    }
    try {
        $pdo->exec("ALTER TABLE skills ADD COLUMN reference VARCHAR(200) DEFAULT '' AFTER full_text");
    } catch (Exception $e) {
    }

    $results[] = '✅ Extended existing tables with new columns';

    // ═══════════════════════════════════════════════════════
    // 2. IMPORT DATA
    // ═══════════════════════════════════════════════════════

    // Helper: import a table
    function importTable($sqlite, $pdo, $sqliteTable, $mysqlTable, $columnMap, &$results)
    {
        // Clear existing data
        $pdo->exec("TRUNCATE TABLE $mysqlTable");

        $rows = $sqlite->query("SELECT * FROM [$sqliteTable]")->fetchAll(PDO::FETCH_ASSOC);
        if (empty($rows)) {
            $results[] = "⏭️ $sqliteTable: no rows to import";
            return 0;
        }

        // Build insert using column map
        $mysqlCols = array_values($columnMap);
        $placeholders = implode(',', array_fill(0, count($mysqlCols), '?'));
        $colNames = implode(',', $mysqlCols);
        $stmt = $pdo->prepare("INSERT INTO $mysqlTable ($colNames) VALUES ($placeholders)");

        $count = 0;
        foreach ($rows as $row) {
            $values = [];
            foreach ($columnMap as $sqliteCol => $mysqlCol) {
                $val = $row[$sqliteCol] ?? null;
                // Clean up HTML in full_text fields
                if ($val !== null && is_string($val)) {
                    $val = trim($val);
                }
                $values[] = $val;
            }
            try {
                $stmt->execute($values);
                $count++;
            } catch (Exception $e) {
                // Skip duplicates or errors, continue
                if ($count < 3)
                    $results[] = "   ⚠️ Row error: " . $e->getMessage();
            }
        }
        $results[] = "✅ $mysqlTable: imported $count / " . count($rows) . " rows";
        return $count;
    }

    // ─── Spells ─────────────────────────────────────────
    importTable($sqlite, $pdo, 'spell', 'spells', [
        'name' => 'name',
        'altname' => 'altname',
        'school' => 'school',
        'subschool' => 'subschool',
        'descriptor' => 'descriptor_text',
        'level' => 'level',
        'components' => 'components',
        'casting_time' => 'casting_time',
        'range' => 'spell_range',
        'target' => 'target',
        'area' => 'area',
        'effect' => 'effect',
        'duration' => 'duration',
        'saving_throw' => 'saving_throw',
        'spell_resistance' => 'spell_resistance',
        'short_description' => 'short_description',
        'description' => 'description',
        'material_components' => 'material_components',
        'focus' => 'focus',
        'xp_cost' => 'xp_cost',
        'full_text' => 'full_text',
        'reference' => 'reference',
    ], $results);

    // ─── Monsters ───────────────────────────────────────
    importTable($sqlite, $pdo, 'monster', 'monsters', [
        'family' => 'family',
        'name' => 'name',
        'altname' => 'altname',
        'size' => 'size',
        'type' => 'type',
        'descriptor' => 'descriptor_text',
        'hit_dice' => 'hit_dice',
        'initiative' => 'initiative',
        'speed' => 'speed',
        'armor_class' => 'armor_class',
        'base_attack' => 'base_attack',
        'grapple' => 'grapple',
        'attack' => 'attack',
        'full_attack' => 'full_attack',
        'space' => 'space',
        'reach' => 'reach',
        'special_attacks' => 'special_attacks',
        'special_qualities' => 'special_qualities',
        'saves' => 'saves',
        'abilities' => 'abilities',
        'skills' => 'skills',
        'feats' => 'feats',
        'bonus_feats' => 'bonus_feats',
        'epic_feats' => 'epic_feats',
        'environment' => 'environment',
        'organization' => 'organization',
        'challenge_rating' => 'challenge_rating',
        'treasure' => 'treasure',
        'alignment' => 'alignment',
        'advancement' => 'advancement',
        'level_adjustment' => 'level_adjustment',
        'special_abilities' => 'special_abilities',
        'stat_block' => 'stat_block',
        'full_text' => 'full_text',
        'reference' => 'reference',
    ], $results);

    // ─── Feats ──────────────────────────────────────────
    importTable($sqlite, $pdo, 'feat', 'feats', [
        'name' => 'name',
        'type' => 'type',
        'multiple' => 'multiple',
        'stack' => 'stack',
        'prerequisite' => 'prerequisites',
        'benefit' => 'benefit',
        'normal' => 'normal_text',
        'special' => 'special',
        'full_text' => 'full_text',
        'reference' => 'reference',
    ], $results);

    // ─── Equipment / Items ──────────────────────────────
    importTable($sqlite, $pdo, 'equipment', 'equipment', [
        'name' => 'name',
        'family' => 'category',
        'category' => 'subcategory',
        'cost' => 'cost',
        'dmg_s' => 'dmg_s',
        'dmg_m' => 'dmg_m',
        'armor_shield_bonus' => 'armor_bonus',
        'maximum_dex_bonus' => 'max_dex',
        'weight' => 'weight',
        'critical' => 'critical',
        'armor_check_penalty' => 'acp',
        'arcane_spell_failure_chance' => 'spell_failure',
        'range_increment' => 'range_increment',
        'type' => 'type_text',
        'full_text' => 'full_text',
        'reference' => 'reference',
    ], $results);

    // ─── Skills ─────────────────────────────────────────
    importTable($sqlite, $pdo, 'skill', 'skills', [
        'name' => 'name',
        'subtype' => 'subtype',
        'key_ability' => 'ability',
        'psionic' => 'psionic',
        'trained' => 'trained_only',
        'armor_check' => 'armor_check_penalty',
        'description' => 'description',
        'synergy' => 'synergy',
        'full_text' => 'full_text',
        'reference' => 'reference',
    ], $results);

    // ─── Psionic Powers ─────────────────────────────────
    importTable($sqlite, $pdo, 'power', 'powers', [
        'name' => 'name',
        'discipline' => 'discipline',
        'subdiscipline' => 'subdiscipline',
        'descriptor' => 'descriptor_text',
        'level' => 'level',
        'display' => 'display',
        'manifesting_time' => 'manifesting_time',
        'range' => 'power_range',
        'target' => 'target',
        'area' => 'area',
        'effect' => 'effect',
        'duration' => 'duration',
        'saving_throw' => 'saving_throw',
        'power_points' => 'power_points',
        'power_resistance' => 'power_resistance',
        'short_description' => 'short_description',
        'description' => 'description',
        'augment' => 'augment',
        'xp_cost' => 'xp_cost',
        'full_text' => 'full_text',
        'reference' => 'reference',
    ], $results);

    // ─── Domains ────────────────────────────────────────
    importTable($sqlite, $pdo, 'domain', 'domains', [
        'name' => 'name',
        'granted_powers' => 'granted_powers',
        'spell_1' => 'spell_1',
        'spell_2' => 'spell_2',
        'spell_3' => 'spell_3',
        'spell_4' => 'spell_4',
        'spell_5' => 'spell_5',
        'spell_6' => 'spell_6',
        'spell_7' => 'spell_7',
        'spell_8' => 'spell_8',
        'spell_9' => 'spell_9',
        'full_text' => 'full_text',
        'reference' => 'reference',
    ], $results);

    // ─── Class Progression ──────────────────────────────
    importTable($sqlite, $pdo, 'class_table', 'class_progression', [
        'name' => 'name',
        'level' => 'level',
        'base_attack_bonus' => 'base_attack_bonus',
        'fort_save' => 'fort_save',
        'ref_save' => 'ref_save',
        'will_save' => 'will_save',
        'special' => 'special',
        'caster_level' => 'caster_level',
        'ac_bonus' => 'ac_bonus',
        'flurry_of_blows' => 'flurry_of_blows',
        'unarmed_damage' => 'unarmed_damage',
        'unarmored_speed_bonus' => 'unarmored_speed_bonus',
        'power_level' => 'power_level',
        'points_per_day' => 'points_per_day',
        'powers_known' => 'powers_known',
        'slots_0' => 'slots_0',
        'slots_1' => 'slots_1',
        'slots_2' => 'slots_2',
        'slots_3' => 'slots_3',
        'slots_4' => 'slots_4',
        'slots_5' => 'slots_5',
        'slots_6' => 'slots_6',
        'slots_7' => 'slots_7',
        'slots_8' => 'slots_8',
        'slots_9' => 'slots_9',
        'reference' => 'reference',
    ], $results);

    // ─── Magic Items ────────────────────────────────────
    // The 'item' table in SQLite has 1680 magic items — import into a new table
    $pdo->exec("CREATE TABLE IF NOT EXISTS items (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        name            VARCHAR(200) NOT NULL,
        category        VARCHAR(100) DEFAULT '',
        subcategory     VARCHAR(100) DEFAULT '',
        special_ability VARCHAR(10) DEFAULT 'No',
        aura            VARCHAR(200) DEFAULT '',
        caster_level    VARCHAR(50) DEFAULT '',
        price           VARCHAR(200) DEFAULT '',
        manifester_level VARCHAR(50) DEFAULT '',
        prereq          TEXT,
        cost            VARCHAR(200) DEFAULT '',
        weight          VARCHAR(50) DEFAULT '',
        full_text       MEDIUMTEXT,
        reference       VARCHAR(200) DEFAULT '',
        INDEX idx_item_name (name),
        INDEX idx_item_cat (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ items table ready';

    importTable($sqlite, $pdo, 'item', 'items', [
        'name' => 'name',
        'category' => 'category',
        'subcategory' => 'subcategory',
        'special_ability' => 'special_ability',
        'aura' => 'aura',
        'caster_level' => 'caster_level',
        'price' => 'price',
        'manifester_level' => 'manifester_level',
        'prereq' => 'prereq',
        'cost' => 'cost',
        'weight' => 'weight',
        'full_text' => 'full_text',
        'reference' => 'reference',
    ], $results);

    $sqlite = null; // Close SQLite
    $results[] = '';
    $results[] = '🎉 <strong>SRD 3.5e import complete!</strong>';
    $results[] = 'Data imported into the dedicated 3.5e database.';

} catch (Exception $e) {
    $results[] = '❌ Error: ' . htmlspecialchars($e->getMessage());
}

// ─── Output ─────────────────────────────────────────────
header('Content-Type: text/html; charset=utf-8');
echo '<!DOCTYPE html><html><head><title>SRD Import</title>';
echo '<style>body{font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:20px;line-height:1.8}h1{color:#f5c518}strong{color:#f5c518}code{color:#4fc978;background:#252540;padding:2px 6px;border-radius:3px}</style>';
echo '</head><body><h1>Eon Weaver — SRD Import</h1>';
foreach ($results as $r)
    echo "<div>$r</div>";
echo '</body></html>';
