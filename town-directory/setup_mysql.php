<?php
/**
 * Eon Weaver — MySQL Database Setup
 *
 * Run ONCE after uploading files to eonweaver.com.
 * Access: https://eonweaver.com/setup_mysql.php?key=setup2024
 *
 * After running successfully, DELETE this file or restrict access.
 */
require_once __DIR__ . '/db.php';

$SETUP_KEY = 'setup2024';
if (($_GET['key'] ?? '') !== $SETUP_KEY) {
    die('Access denied. Use ?key=' . $SETUP_KEY);
}

$pdo = getDB();
$results = [];

try {
    // ═══════════════════════════════════════════════════════
    // CORE TABLES
    // ═══════════════════════════════════════════════════════

    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id                  INT AUTO_INCREMENT PRIMARY KEY,
        username            VARCHAR(50) UNIQUE NOT NULL,
        email               VARCHAR(255) UNIQUE NOT NULL,
        password_hash       TEXT NOT NULL,
        gemini_api_key      TEXT DEFAULT '',
        dnd_edition         VARCHAR(20) DEFAULT '3.5e',
        xp_speed            VARCHAR(20) DEFAULT 'normal',
        relationship_speed  VARCHAR(20) DEFAULT 'normal',
        birth_rate          VARCHAR(20) DEFAULT 'normal',
        death_threshold     VARCHAR(20) DEFAULT '50',
        child_growth        VARCHAR(20) DEFAULT 'realistic',
        conflict_frequency  VARCHAR(20) DEFAULT 'occasional',
        created_at          DATETIME DEFAULT NOW()
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ users table';

    // Migration: add subscription_tier column
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free'");
        $results[] = '✅ Added subscription_tier column';
    } catch (Exception $e) { /* already exists */
    }

    // Migration: add npc_xp_speed column
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN npc_xp_speed VARCHAR(20) DEFAULT 'normal' AFTER xp_speed");
        $results[] = '✅ Added npc_xp_speed column';
    } catch (Exception $e) { /* already exists */
    }

    // ── Campaigns table ──
    $pdo->exec("CREATE TABLE IF NOT EXISTS campaigns (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        user_id         INT NOT NULL,
        name            VARCHAR(255) NOT NULL DEFAULT 'My Campaign',
        dnd_edition     VARCHAR(10) NOT NULL DEFAULT '3.5e',
        description     TEXT DEFAULT '',
        is_active       TINYINT(1) NOT NULL DEFAULT 1,
        created_at      DATETIME DEFAULT NOW(),
        updated_at      DATETIME DEFAULT NOW(),
        INDEX idx_campaigns_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ campaigns table';

    $pdo->exec("CREATE TABLE IF NOT EXISTS towns (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        user_id         INT NOT NULL,
        campaign_id     INT DEFAULT NULL,
        name            VARCHAR(255) NOT NULL,
        subtitle        TEXT DEFAULT '',
        is_party_base   TINYINT(1) NOT NULL DEFAULT 0,
        created_at      DATETIME DEFAULT NOW(),
        updated_at      DATETIME DEFAULT NOW(),
        INDEX idx_towns_user (user_id),
        INDEX idx_towns_campaign (campaign_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ towns table';

    // Migration: add is_party_base column
    try {
        $pdo->exec("ALTER TABLE towns ADD COLUMN is_party_base TINYINT(1) NOT NULL DEFAULT 0");
        $results[] = '✅ Added is_party_base column';
    } catch (Exception $e) { /* already exists */
    }

    // Migration: add campaign_id column to towns
    try {
        $pdo->exec("ALTER TABLE towns ADD COLUMN campaign_id INT DEFAULT NULL AFTER user_id");
        $pdo->exec("ALTER TABLE towns ADD INDEX idx_towns_campaign (campaign_id)");
        $results[] = '✅ Added campaign_id to towns';
    } catch (Exception $e) { /* already exists */
    }

    // Migration: create default campaigns for users who have towns but no campaign
    $usersWithoutCampaign = query("SELECT DISTINCT u.id, u.dnd_edition FROM users u WHERE u.id NOT IN (SELECT user_id FROM campaigns)", [], 0);
    foreach ($usersWithoutCampaign as $u) {
        $edition = $u['dnd_edition'] ?? '3.5e';
        execute("INSERT INTO campaigns (user_id, name, dnd_edition) VALUES (?, 'My Campaign', ?)", [(int) $u['id'], $edition], 0);
        $cid = (int) $pdo->lastInsertId();
        execute("UPDATE towns SET campaign_id = ? WHERE user_id = ? AND campaign_id IS NULL", [$cid, (int) $u['id']], 0);
        $results[] = "✅ Created default campaign (id=$cid) for user {$u['id']}";
    }

    // Flag dracolumina as legendary tier
    execute("UPDATE users SET subscription_tier = 'subscriber' WHERE username = 'dracolumina'", [], 0);

    $pdo->exec("CREATE TABLE IF NOT EXISTS characters (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        town_id         INT NOT NULL,
        name            VARCHAR(255) NOT NULL,
        race            VARCHAR(100) DEFAULT '',
        class           VARCHAR(100) DEFAULT '',
        level           INT DEFAULT 1,
        status          VARCHAR(50) DEFAULT 'Alive',
        title           VARCHAR(100) DEFAULT '',
        gender          VARCHAR(20) DEFAULT '',
        spouse          VARCHAR(255) DEFAULT 'None',
        spouse_label    VARCHAR(50) DEFAULT '',
        age             INT,
        xp              INT DEFAULT 0,
        cr              VARCHAR(20) DEFAULT '',
        ecl             VARCHAR(20) DEFAULT '',
        hp              INT,
        hd              VARCHAR(50) DEFAULT '',
        ac              VARCHAR(50) DEFAULT '',
        init            VARCHAR(50) DEFAULT '',
        spd             VARCHAR(50) DEFAULT '',
        grapple         VARCHAR(50) DEFAULT '',
        atk             TEXT DEFAULT '',
        alignment       VARCHAR(20) DEFAULT '',
        saves           VARCHAR(100) DEFAULT '',
        str             INT, dex INT, con INT,
        int_            INT, wis INT, cha INT,
        languages       TEXT DEFAULT '',
        skills_feats    TEXT,
        feats           TEXT DEFAULT '',
        gear            TEXT,
        role            VARCHAR(255) DEFAULT '',
        history         TEXT DEFAULT '',
        ai_data         TEXT DEFAULT '',
        portrait_url    TEXT DEFAULT '',
        portrait_prompt TEXT DEFAULT '',
        INDEX idx_chars_town (town_id),
        FOREIGN KEY (town_id) REFERENCES towns(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ characters table';

    // Add portrait_prompt column if missing (for existing databases)
    try {
        $pdo->exec("ALTER TABLE characters ADD COLUMN portrait_prompt TEXT DEFAULT '' AFTER portrait_url");
        $results[] = '✅ Added portrait_prompt column';
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            $results[] = '⏭️ portrait_prompt column already exists';
        }
    }

    // Add months_in_town column if missing
    try {
        $pdo->exec("ALTER TABLE characters ADD COLUMN months_in_town INT DEFAULT 0");
        $results[] = '✅ Added months_in_town column';
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            $results[] = '⏭️ months_in_town column already exists';
        }
    }

    // Add domains column (Cleric domain selections, e.g. "War, Healing")
    try {
        $pdo->exec("ALTER TABLE characters ADD COLUMN domains VARCHAR(255) DEFAULT '' AFTER feats");
        $results[] = '✅ Added domains column';
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            $results[] = '⏭️ domains column already exists';
        }
    }

    // ── Character Equipment Table ────────────────────────────
    $pdo->exec("CREATE TABLE IF NOT EXISTS character_equipment (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        character_id  INT NOT NULL,
        item_name     VARCHAR(255) NOT NULL,
        item_type     VARCHAR(50) DEFAULT 'gear',
        slot          VARCHAR(50) DEFAULT NULL,
        quantity      INT DEFAULT 1,
        weight        DECIMAL(6,2) DEFAULT 0,
        properties    TEXT DEFAULT '',
        srd_ref       VARCHAR(255) DEFAULT '',
        equipped      TINYINT(1) DEFAULT 0,
        sort_order    INT DEFAULT 0,
        INDEX idx_charequip (character_id),
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ character_equipment table';

    $pdo->exec("CREATE TABLE IF NOT EXISTS history (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        town_id     INT NOT NULL,
        heading     TEXT NOT NULL,
        content     LONGTEXT NOT NULL,
        sort_order  INT DEFAULT 0,
        INDEX idx_history_town (town_id),
        FOREIGN KEY (town_id) REFERENCES towns(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ history table';

    $pdo->exec("CREATE TABLE IF NOT EXISTS town_meta (
        id      INT AUTO_INCREMENT PRIMARY KEY,
        town_id INT NOT NULL,
        `key`   VARCHAR(100) NOT NULL,
        value   TEXT,
        UNIQUE KEY unique_town_key (town_id, `key`),
        FOREIGN KEY (town_id) REFERENCES towns(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ town_meta table';

    $pdo->exec("CREATE TABLE IF NOT EXISTS town_buildings (
        id               INT AUTO_INCREMENT PRIMARY KEY,
        town_id          INT NOT NULL,
        name             VARCHAR(150) NOT NULL,
        status           VARCHAR(30) DEFAULT 'planned',
        build_progress   INT DEFAULT 0,
        build_time       INT DEFAULT 1,
        description      TEXT DEFAULT '',
        created_at       DATETIME DEFAULT NOW(),
        completed_at     DATETIME NULL,
        INDEX idx_town_buildings (town_id),
        FOREIGN KEY (town_id) REFERENCES towns(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ town_buildings table';

    // Migration: upgrade town_buildings with type, owner, sort, and map coordinates
    $buildingCols = [
        ['town_buildings', 'building_type', "VARCHAR(50) DEFAULT 'other'"],
        ['town_buildings', 'owner_id', "INT NULL"],
        ['town_buildings', 'sort_order', "INT DEFAULT 0"],
        ['town_buildings', 'map_x', "INT DEFAULT 0"],
        ['town_buildings', 'map_y', "INT DEFAULT 0"],
        ['town_buildings', 'map_w', "INT DEFAULT 1"],
        ['town_buildings', 'map_h', "INT DEFAULT 1"],
    ];
    foreach ($buildingCols as [$tbl, $col, $def]) {
        try {
            $pdo->exec("ALTER TABLE $tbl ADD COLUMN $col $def");
            $results[] = "✅ Added $tbl.$col";
        } catch (Exception $e) { /* already exists */ }
    }

    // Building Rooms table
    $pdo->exec("CREATE TABLE IF NOT EXISTS building_rooms (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        building_id     INT NOT NULL,
        name            VARCHAR(150) NOT NULL,
        room_type       VARCHAR(50) DEFAULT 'common',
        description     TEXT DEFAULT '',
        sort_order      INT DEFAULT 0,
        map_x           INT DEFAULT 0,
        map_y           INT DEFAULT 0,
        INDEX idx_rooms_building (building_id),
        FOREIGN KEY (building_id) REFERENCES town_buildings(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ building_rooms table';

    // Migration: add building_id to characters
    try {
        $pdo->exec("ALTER TABLE characters ADD COLUMN building_id INT NULL");
        $pdo->exec("ALTER TABLE characters ADD INDEX idx_char_building (building_id)");
        $results[] = '✅ Added characters.building_id';
    } catch (Exception $e) { /* already exists */ }

    $pdo->exec("CREATE TABLE IF NOT EXISTS campaign_rules (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        user_id     INT NOT NULL,
        rules_text  LONGTEXT DEFAULT '',
        updated_at  DATETIME DEFAULT NOW(),
        UNIQUE KEY unique_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ campaign_rules table';

    // Migration: add campaign_description column
    try {
        $pdo->exec("ALTER TABLE campaign_rules ADD COLUMN campaign_description LONGTEXT DEFAULT '' AFTER rules_text");
        $results[] = '✅ Added campaign_description column';
    } catch (Exception $e) { /* already exists */
    }

    $pdo->exec("CREATE TABLE IF NOT EXISTS calendar (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        user_id         INT NOT NULL,
        campaign_id     INT DEFAULT NULL,
        current_year    INT DEFAULT 1490,
        current_month   INT DEFAULT 1,
        current_day     INT DEFAULT 1,
        era_name        VARCHAR(50) DEFAULT 'DR',
        months_per_year INT DEFAULT 12,
        month_names     TEXT DEFAULT '[\"Hammer\",\"Alturiak\",\"Ches\",\"Tarsakh\",\"Mirtul\",\"Kythorn\",\"Flamerule\",\"Eleasis\",\"Eleint\",\"Marpenoth\",\"Uktar\",\"Nightal\"]',
        days_per_month  VARCHAR(500) DEFAULT '30',
        UNIQUE KEY unique_user_camp (user_id, campaign_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ calendar table';

    // Migration: make calendar campaign-specific
    try {
        $pdo->exec("ALTER TABLE calendar ADD COLUMN campaign_id INT DEFAULT NULL AFTER user_id");
        $pdo->exec("ALTER TABLE calendar ADD INDEX idx_calendar_campaign (campaign_id)");
        $pdo->exec("ALTER TABLE calendar DROP INDEX unique_user");
        $pdo->exec("ALTER TABLE calendar ADD UNIQUE KEY unique_user_camp (user_id, campaign_id)");
        
        // Link existing calendars to the user's active campaign
        $pdo->exec("UPDATE calendar c JOIN campaigns camp ON c.user_id = camp.user_id AND camp.is_active = 1 SET c.campaign_id = camp.id WHERE c.campaign_id IS NULL");
        
        $results[] = '✅ Upgraded calendar to be campaign-specific';
    } catch (Exception $e) { /* already exists or keys mismatch, ignore */ }

    // Migration: days_per_month from INT to VARCHAR (supports JSON array for per-month day counts)
    try {
        $pdo->exec("ALTER TABLE calendar MODIFY COLUMN days_per_month VARCHAR(500) DEFAULT '30'");
        $results[] = '✅ Upgraded days_per_month to support per-month day counts';
    } catch (Exception $e) { /* already varchar, ignore */ }

    $pdo->exec("CREATE TABLE IF NOT EXISTS site_settings (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        `key`       VARCHAR(100) UNIQUE NOT NULL,
        value       TEXT DEFAULT '',
        updated_at  DATETIME DEFAULT NOW()
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ site_settings table';

    // ═══════════════════════════════════════════════════════
    // FUTURE-READY TABLES (credits, factions, events, etc.)
    // ═══════════════════════════════════════════════════════

    $pdo->exec("CREATE TABLE IF NOT EXISTS user_credits (
        user_id         INT PRIMARY KEY,
        tier            VARCHAR(20) DEFAULT 'free',
        credits_rem     INT DEFAULT 50,
        credits_max     INT DEFAULT 50,
        reset_period    VARCHAR(20) DEFAULT 'daily',
        reset_at        DATETIME,
        lifetime_spent  INT DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ user_credits table';

    // ── Hidden Token Usage Tracking ──────────────────────
    // Tracks monthly AI token consumption per user. Invisible to users.
    // Admin can adjust monthly_token_limit in site_settings to throttle.
    $pdo->exec("CREATE TABLE IF NOT EXISTS user_token_usage (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        user_id         INT NOT NULL,
        `year_month`    VARCHAR(7) NOT NULL,
        tokens_used     BIGINT DEFAULT 0,
        call_count      INT DEFAULT 0,
        updated_at      DATETIME DEFAULT NOW(),
        UNIQUE KEY unique_user_month (user_id, `year_month`),
        INDEX idx_usage_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ user_token_usage table';

    // Seed default token limits into site_settings
    try {
        $pdo->exec("INSERT IGNORE INTO site_settings (`key`, value) VALUES ('token_limit_free', '500000')");
        $pdo->exec("INSERT IGNORE INTO site_settings (`key`, value) VALUES ('token_limit_subscriber', '5000000')");
        $results[] = '✅ Seeded default token limits';
    } catch (Exception $e) { /* already exists */ }


    $pdo->exec("CREATE TABLE IF NOT EXISTS factions (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        town_id     INT NOT NULL,
        name        VARCHAR(255) NOT NULL,
        alignment   VARCHAR(20) DEFAULT '',
        disposition VARCHAR(50) DEFAULT 'neutral',
        notes       TEXT DEFAULT '',
        FOREIGN KEY (town_id) REFERENCES towns(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ factions table';

    $pdo->exec("CREATE TABLE IF NOT EXISTS events (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        town_id         INT NOT NULL,
        trigger_date    VARCHAR(100),
        type            VARCHAR(50) DEFAULT 'general',
        description     TEXT NOT NULL,
        resolved        TINYINT(1) DEFAULT 0,
        outcome         TEXT DEFAULT '',
        FOREIGN KEY (town_id) REFERENCES towns(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ events table';

    $pdo->exec("CREATE TABLE IF NOT EXISTS rumors (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        town_id         INT NOT NULL,
        known_by        TEXT DEFAULT '',
        content         TEXT NOT NULL,
        is_truth        TINYINT(1) DEFAULT 0,
        source_event_id INT,
        FOREIGN KEY (town_id) REFERENCES towns(id) ON DELETE CASCADE,
        FOREIGN KEY (source_event_id) REFERENCES events(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ rumors table';

    $pdo->exec("CREATE TABLE IF NOT EXISTS timeline_log (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        town_id         INT NOT NULL,
        calendar_date   VARCHAR(100) NOT NULL,
        entry_type      VARCHAR(50) DEFAULT 'general',
        description     TEXT NOT NULL,
        actor           VARCHAR(255) DEFAULT '',
        changed_by      INT,
        FOREIGN KEY (town_id) REFERENCES towns(id) ON DELETE CASCADE,
        FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ timeline_log table';

    // ═══════════════════════════════════════════════════════
    // ENCOUNTER SYSTEM TABLES
    // ═══════════════════════════════════════════════════════

    $pdo->exec("CREATE TABLE IF NOT EXISTS party_members (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        user_id         INT NOT NULL,
        character_id    INT NOT NULL,
        sort_order      INT DEFAULT 0,
        added_at        DATETIME DEFAULT NOW(),
        UNIQUE KEY unique_party (user_id, character_id),
        INDEX idx_party_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ party_members table';

    $pdo->exec("CREATE TABLE IF NOT EXISTS encounters (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        user_id         INT NOT NULL,
        name            VARCHAR(255) NOT NULL,
        description     TEXT DEFAULT '',
        status          VARCHAR(20) DEFAULT 'setup',
        current_round   INT DEFAULT 0,
        current_turn    INT DEFAULT 0,
        created_at      DATETIME DEFAULT NOW(),
        updated_at      DATETIME DEFAULT NOW(),
        INDEX idx_enc_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ encounters table';

    $pdo->exec("CREATE TABLE IF NOT EXISTS encounter_groups (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        encounter_id    INT NOT NULL,
        name            VARCHAR(255) NOT NULL,
        sort_order      INT DEFAULT 0,
        INDEX idx_eg_enc (encounter_id),
        FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ encounter_groups table';

    $pdo->exec("CREATE TABLE IF NOT EXISTS encounter_participants (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        encounter_id    INT NOT NULL,
        character_id    INT NOT NULL,
        group_id        INT DEFAULT NULL,
        side            VARCHAR(20) DEFAULT 'enemy',
        initiative      INT DEFAULT 0,
        initiative_mod  INT DEFAULT 0,
        current_hp      INT DEFAULT 0,
        max_hp          INT DEFAULT 0,
        temp_hp         INT DEFAULT 0,
        conditions      JSON DEFAULT NULL,
        is_active       TINYINT(1) DEFAULT 1,
        notes           TEXT DEFAULT '',
        INDEX idx_ep_enc (encounter_id),
        INDEX idx_ep_char (character_id),
        FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE,
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
        FOREIGN KEY (group_id) REFERENCES encounter_groups(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ encounter_participants table';

    // ═══════════════════════════════════════════════════════
    // SRD REFERENCE TABLES
    // ═══════════════════════════════════════════════════════

    $pdo->exec("CREATE TABLE IF NOT EXISTS srd_races (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        name            VARCHAR(100) NOT NULL,
        size            VARCHAR(20) DEFAULT 'Medium',
        speed           INT DEFAULT 30,
        ability_mods    TEXT DEFAULT '',
        traits          TEXT,
        languages       TEXT DEFAULT ''
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ srd_races table (legacy)';

    $pdo->exec("CREATE TABLE IF NOT EXISTS srd_classes (
        id                  INT AUTO_INCREMENT PRIMARY KEY,
        name                VARCHAR(100) NOT NULL,
        hit_die             VARCHAR(10) DEFAULT '',
        bab_type            VARCHAR(20) DEFAULT '',
        good_saves          VARCHAR(50) DEFAULT '',
        skills_per_level    INT DEFAULT 2,
        class_skills        TEXT DEFAULT '',
        class_features      TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ srd_classes table (legacy)';

    // Migration: add class_skills column if missing
    try {
        $pdo->exec("ALTER TABLE srd_classes ADD COLUMN class_skills TEXT DEFAULT '' AFTER skills_per_level");
        $results[] = '✅ Added class_skills column';
    } catch (Exception $e) { /* column already exists */
    }

    $pdo->exec("CREATE TABLE IF NOT EXISTS srd_skills (
        id                  INT AUTO_INCREMENT PRIMARY KEY,
        name                VARCHAR(100) NOT NULL,
        ability             VARCHAR(10) DEFAULT '',
        trained_only        TINYINT(1) DEFAULT 0,
        armor_check_penalty TINYINT(1) DEFAULT 0,
        description         TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ srd_skills table (legacy)';

    $pdo->exec("CREATE TABLE IF NOT EXISTS srd_feats (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        name            VARCHAR(100) NOT NULL,
        type            VARCHAR(50) DEFAULT 'General',
        prerequisites   TEXT DEFAULT '',
        benefit         TEXT,
        description     TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ srd_feats table (legacy)';

    $pdo->exec("CREATE TABLE IF NOT EXISTS srd_equipment (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        name        VARCHAR(100) NOT NULL,
        category    VARCHAR(100) DEFAULT '',
        cost        VARCHAR(50) DEFAULT '',
        weight      VARCHAR(50) DEFAULT '',
        damage      VARCHAR(50) DEFAULT '',
        critical    VARCHAR(50) DEFAULT '',
        properties  TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ srd_equipment table (legacy)';

    // ═══════════════════════════════════════════════════════
    // SEED SRD DATA into Edition-Specific 3.5e Database
    // ═══════════════════════════════════════════════════════
    $results[] = '';
    $results[] = '<strong>═══ SRD EDITION DATABASE (3.5e) ═══</strong>';

    try {
        $srd35 = getSrdDB('3.5e');

        // Create core tables if they don't exist
        $srd35->exec("CREATE TABLE IF NOT EXISTS races (
            id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL,
            size VARCHAR(20) DEFAULT 'Medium', speed INT DEFAULT 30,
            ability_mods TEXT DEFAULT '', traits TEXT, languages TEXT DEFAULT '',
            INDEX idx_name (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $srd35->exec("CREATE TABLE IF NOT EXISTS classes (
            id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL,
            hit_die VARCHAR(10) DEFAULT '', bab_type VARCHAR(20) DEFAULT '',
            good_saves VARCHAR(50) DEFAULT '', skills_per_level INT DEFAULT 2,
            class_skills TEXT DEFAULT '', class_features TEXT,
            INDEX idx_name (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $srd35->exec("CREATE TABLE IF NOT EXISTS skills (
            id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL,
            ability VARCHAR(10) DEFAULT '', trained_only TINYINT(1) DEFAULT 0,
            armor_check_penalty TINYINT(1) DEFAULT 0, description TEXT,
            INDEX idx_name (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $srd35->exec("CREATE TABLE IF NOT EXISTS feats (
            id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(200) NOT NULL,
            type VARCHAR(50) DEFAULT 'General', prerequisites TEXT DEFAULT '',
            benefit TEXT, description TEXT, INDEX idx_name (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $srd35->exec("CREATE TABLE IF NOT EXISTS equipment (
            id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(200) NOT NULL,
            category VARCHAR(100) DEFAULT '', cost VARCHAR(50) DEFAULT '',
            weight VARCHAR(50) DEFAULT '', damage VARCHAR(50) DEFAULT '',
            critical VARCHAR(50) DEFAULT '', properties TEXT,
            INDEX idx_name (name), INDEX idx_category (category)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        // -- Races --
        $races = [
            ['Human', 'Medium', 30, '+1 feat, +4 skill pts at 1st level', 'Bonus feat, bonus skills', 'Common'],
            ['Dwarf', 'Medium', 20, 'Con +2, Cha -2', 'Darkvision 60ft, stonecunning, stability, +2 vs poison/spells', 'Common, Dwarven'],
            ['Elf', 'Medium', 30, 'Dex +2, Con -2', 'Immunity to sleep, +2 vs enchantment, low-light vision', 'Common, Elven'],
            ['Gnome', 'Small', 20, 'Con +2, Str -2', 'Low-light vision, +2 vs illusions, +1 DC illusions', 'Common, Gnome'],
            ['Half-Elf', 'Medium', 30, 'None', 'Immunity to sleep, +2 vs enchantment, low-light vision', 'Common, Elven'],
            ['Half-Orc', 'Medium', 30, 'Str +2, Int -2, Cha -2', 'Darkvision 60ft, orc blood', 'Common, Orc'],
            ['Halfling', 'Small', 20, 'Dex +2, Str -2', '+2 Climb/Jump/Listen/Move Silently, +1 all saves', 'Common, Halfling'],
        ];
        $cnt = $srd35->query("SELECT COUNT(*) as c FROM races")->fetch()['c'];
        if ($cnt == 0) {
            $stmt = $srd35->prepare('INSERT INTO races (name, size, speed, ability_mods, traits, languages) VALUES (?,?,?,?,?,?)');
            foreach ($races as $r)
                $stmt->execute($r);
            $results[] = '✅ Seeded ' . count($races) . ' races (3.5e DB)';
        } else {
            $results[] = '⏭️ 3.5e races already seeded (' . $cnt . ')';
        }

        // -- Classes --
        $classes = [
            ['Barbarian', 'd12', 'Full', 'Fort', 4, 'Rage 1/day, fast movement, illiteracy'],
            ['Bard', 'd6', '3/4', 'Ref, Will', 6, 'Bardic music, bardic knowledge, spells'],
            ['Cleric', 'd8', '3/4', 'Fort, Will', 2, 'Turn/rebuke undead, domains, spells'],
            ['Druid', 'd8', '3/4', 'Fort, Will', 4, 'Animal companion, nature sense, wild empathy, spells'],
            ['Fighter', 'd10', 'Full', 'Fort', 2, 'Bonus feats (every even level)'],
            ['Monk', 'd8', '3/4', 'Fort, Ref, Will', 4, 'Flurry of blows, unarmed strike, AC bonus, evasion'],
            ['Paladin', 'd10', 'Full', 'Fort', 2, 'Smite evil, divine grace, lay on hands, spells'],
            ['Ranger', 'd8', 'Full', 'Fort, Ref', 6, 'Favored enemy, track, combat style, animal companion'],
            ['Rogue', 'd6', '3/4', 'Ref', 8, 'Sneak attack, trapfinding, evasion, uncanny dodge'],
            ['Sorcerer', 'd4', '1/2', 'Will', 2, 'Spontaneous arcane spells, familiar'],
            ['Wizard', 'd4', '1/2', 'Will', 2, 'Prepared arcane spells, familiar, scribe scroll'],
            ['Adept', 'd6', '1/2', 'Will', 2, 'NPC class. Divine spells, familiar (5th level)'],
            ['Aristocrat', 'd8', '3/4', 'Fort, Ref, Will', 4, 'NPC class. Broad skill access'],
            ['Commoner', 'd4', '1/2', 'None', 2, 'NPC class. Simple weapon proficiency only'],
            ['Expert', 'd6', '3/4', 'Will', 6, 'NPC class. 10 class skills of choice'],
            ['Warrior', 'd8', 'Full', 'Fort', 2, 'NPC class. Simple/martial proficiency, all armor'],
        ];
        $cnt = $srd35->query("SELECT COUNT(*) as c FROM classes")->fetch()['c'];
        if ($cnt == 0) {
            $stmt = $srd35->prepare('INSERT INTO classes (name, hit_die, bab_type, good_saves, skills_per_level, class_features) VALUES (?,?,?,?,?,?)');
            foreach ($classes as $c)
                $stmt->execute($c);
            $results[] = '✅ Seeded ' . count($classes) . ' classes (3.5e DB)';
        } else {
            $results[] = '⏭️ 3.5e classes already seeded (' . $cnt . ')';
        }

        // Seed class skills
        $classSkills = [
            'Barbarian' => 'Climb,Craft,Handle Animal,Intimidate,Jump,Listen,Ride,Survival,Swim',
            'Bard' => 'Appraise,Balance,Bluff,Climb,Concentration,Craft,Decipher Script,Diplomacy,Disguise,Escape Artist,Gather Information,Hide,Jump,Knowledge (Arcana),Knowledge (Local),Listen,Move Silently,Perform,Profession,Sense Motive,Sleight of Hand,Spellcraft,Swim,Tumble,Use Magic Device',
            'Cleric' => 'Concentration,Craft,Diplomacy,Heal,Knowledge (Arcana),Knowledge (Religion),Profession,Spellcraft',
            'Druid' => 'Concentration,Craft,Diplomacy,Handle Animal,Heal,Knowledge (Nature),Listen,Profession,Ride,Spellcraft,Spot,Survival,Swim',
            'Fighter' => 'Climb,Craft,Handle Animal,Intimidate,Jump,Ride,Swim',
            'Monk' => 'Balance,Climb,Concentration,Craft,Diplomacy,Escape Artist,Hide,Jump,Knowledge (Arcana),Knowledge (Religion),Listen,Move Silently,Perform,Profession,Sense Motive,Spot,Swim,Tumble',
            'Paladin' => 'Concentration,Craft,Diplomacy,Handle Animal,Heal,Knowledge (Religion),Profession,Ride,Sense Motive',
            'Ranger' => 'Climb,Concentration,Craft,Handle Animal,Heal,Hide,Jump,Knowledge (Nature),Listen,Move Silently,Profession,Ride,Search,Spot,Survival,Swim,Use Rope',
            'Rogue' => 'Appraise,Balance,Bluff,Climb,Craft,Decipher Script,Diplomacy,Disable Device,Disguise,Escape Artist,Forgery,Gather Information,Hide,Intimidate,Jump,Knowledge (Local),Listen,Move Silently,Open Lock,Perform,Profession,Search,Sense Motive,Sleight of Hand,Spot,Swim,Tumble,Use Magic Device,Use Rope',
            'Sorcerer' => 'Bluff,Concentration,Craft,Knowledge (Arcana),Profession,Spellcraft',
            'Wizard' => 'Concentration,Craft,Decipher Script,Knowledge (Arcana),Knowledge (Religion),Knowledge (Nature),Knowledge (Local),Profession,Spellcraft',
            'Adept' => 'Concentration,Craft,Handle Animal,Heal,Knowledge (Arcana),Knowledge (Religion),Profession,Spellcraft,Survival',
            'Aristocrat' => 'Appraise,Bluff,Diplomacy,Disguise,Forgery,Gather Information,Handle Animal,Intimidate,Knowledge (Arcana),Knowledge (Religion),Knowledge (Nature),Knowledge (Local),Listen,Perform,Ride,Sense Motive,Spot,Swim',
            'Commoner' => 'Climb,Craft,Handle Animal,Jump,Listen,Profession,Ride,Spot,Swim,Use Rope',
            'Expert' => 'Any 10 skills of choice',
            'Warrior' => 'Climb,Handle Animal,Intimidate,Jump,Ride,Swim',
        ];
        $stmt = $srd35->prepare('UPDATE classes SET class_skills = ? WHERE name = ?');
        foreach ($classSkills as $name => $skills) {
            $stmt->execute([$skills, $name]);
        }
        $results[] = '✅ Updated class skills (3.5e DB)';

        // -- Skills --
        $skills = [
            ['Appraise', 'Int', 0, 0],
            ['Balance', 'Dex', 0, 1],
            ['Bluff', 'Cha', 0, 0],
            ['Climb', 'Str', 0, 1],
            ['Concentration', 'Con', 0, 0],
            ['Craft', 'Int', 0, 0],
            ['Decipher Script', 'Int', 1, 0],
            ['Diplomacy', 'Cha', 0, 0],
            ['Disable Device', 'Int', 1, 0],
            ['Disguise', 'Cha', 0, 0],
            ['Escape Artist', 'Dex', 0, 1],
            ['Forgery', 'Int', 0, 0],
            ['Gather Information', 'Cha', 0, 0],
            ['Handle Animal', 'Cha', 1, 0],
            ['Heal', 'Wis', 0, 0],
            ['Hide', 'Dex', 0, 1],
            ['Intimidate', 'Cha', 0, 0],
            ['Jump', 'Str', 0, 1],
            ['Knowledge (Arcana)', 'Int', 1, 0],
            ['Knowledge (Religion)', 'Int', 1, 0],
            ['Knowledge (Nature)', 'Int', 1, 0],
            ['Knowledge (Local)', 'Int', 1, 0],
            ['Listen', 'Wis', 0, 0],
            ['Move Silently', 'Dex', 0, 1],
            ['Open Lock', 'Dex', 1, 0],
            ['Perform', 'Cha', 0, 0],
            ['Profession', 'Wis', 1, 0],
            ['Ride', 'Dex', 0, 0],
            ['Search', 'Int', 0, 0],
            ['Sense Motive', 'Wis', 0, 0],
            ['Sleight of Hand', 'Dex', 1, 1],
            ['Spellcraft', 'Int', 1, 0],
            ['Spot', 'Wis', 0, 0],
            ['Survival', 'Wis', 0, 0],
            ['Swim', 'Str', 0, 1],
            ['Tumble', 'Dex', 1, 1],
            ['Use Magic Device', 'Cha', 1, 0],
            ['Use Rope', 'Dex', 0, 0],
        ];
        $cnt = $srd35->query("SELECT COUNT(*) as c FROM skills")->fetch()['c'];
        if ($cnt == 0) {
            $stmt = $srd35->prepare('INSERT INTO skills (name, ability, trained_only, armor_check_penalty) VALUES (?,?,?,?)');
            foreach ($skills as $s)
                $stmt->execute($s);
            $results[] = '✅ Seeded ' . count($skills) . ' skills (3.5e DB)';
        } else {
            $results[] = '⏭️ 3.5e skills already seeded (' . $cnt . ')';
        }

        // -- Core Feats --
        $feats = [
            ['Power Attack', 'General', 'Str 13', 'Trade attack bonus for damage'],
            ['Cleave', 'General', 'Str 13, Power Attack', 'Extra attack after dropping foe'],
            ['Combat Expertise', 'General', 'Int 13', 'Trade attack for AC'],
            ['Improved Trip', 'General', 'Int 13, Combat Expertise', '+4 trip, free attack on success'],
            ['Dodge', 'General', 'Dex 13', '+1 dodge AC vs one opponent'],
            ['Mobility', 'General', 'Dex 13, Dodge', '+4 AC vs AoO from movement'],
            ['Spring Attack', 'General', 'Dex 13, Dodge, Mobility, BAB +4', 'Move before and after melee attack'],
            ['Weapon Focus', 'General', 'BAB +1', '+1 attack with chosen weapon'],
            ['Weapon Specialization', 'General', 'Fighter 4, Weapon Focus', '+2 damage with chosen weapon'],
            ['Weapon Finesse', 'General', 'BAB +1', 'Use Dex instead of Str for light melee'],
            ['Two-Weapon Fighting', 'General', 'Dex 15', 'Reduced penalties for two-weapon'],
            ['Point Blank Shot', 'General', 'None', '+1 attack/damage within 30ft'],
            ['Precise Shot', 'General', 'Point Blank Shot', 'No penalty shooting into melee'],
            ['Rapid Shot', 'General', 'Dex 13, Point Blank Shot', 'Extra ranged attack at -2'],
            ['Improved Initiative', 'General', 'None', '+4 initiative'],
            ['Toughness', 'General', 'None', '+3 hit points'],
            ['Iron Will', 'General', 'None', '+2 Will saves'],
            ['Great Fortitude', 'General', 'None', '+2 Fort saves'],
            ['Lightning Reflexes', 'General', 'None', '+2 Ref saves'],
            ['Combat Casting', 'General', 'None', '+4 Concentration for defensive casting'],
            ['Spell Focus', 'General', 'None', '+1 DC for chosen school'],
            ['Spell Penetration', 'General', 'None', '+2 caster level checks to overcome SR'],
            ['Track', 'General', 'None', 'Use Survival to follow tracks'],
            ['Endurance', 'General', 'None', '+4 to checks vs nonlethal damage'],
            ['Alertness', 'General', 'None', '+2 Listen and Spot'],
            ['Skill Focus', 'General', 'None', '+3 to chosen skill'],
            ['Improved Unarmed Strike', 'General', 'None', 'No AoO for unarmed attacks'],
            ['Extra Turning', 'General', 'Turn/Rebuke Undead', '+4 turn/rebuke attempts per day'],
            ['Mounted Combat', 'General', 'Ride 1 rank', 'Negate hit on mount with Ride check'],
            ['Exotic Weapon Proficiency', 'General', 'BAB +1', 'No penalty with chosen exotic weapon'],
        ];
        $cnt = $srd35->query("SELECT COUNT(*) as c FROM feats")->fetch()['c'];
        if ($cnt == 0) {
            $stmt = $srd35->prepare('INSERT INTO feats (name, type, prerequisites, benefit) VALUES (?,?,?,?)');
            foreach ($feats as $f)
                $stmt->execute($f);
            $results[] = '✅ Seeded ' . count($feats) . ' feats (3.5e DB)';
        } else {
            $results[] = '⏭️ 3.5e feats already seeded (' . $cnt . ')';
        }

        // -- Equipment --
        $equipment = [
            ['Dagger', 'Simple Melee', '2 gp', '1 lb', '1d4', '19-20/x2', 'Light, thrown 10ft'],
            ['Quarterstaff', 'Simple Melee', '0 gp', '4 lb', '1d6/1d6', 'x2', 'Double weapon'],
            ['Crossbow, Light', 'Simple Ranged', '35 gp', '4 lb', '1d8', '19-20/x2', 'Range 80ft'],
            ['Longsword', 'Martial Melee', '15 gp', '4 lb', '1d8', '19-20/x2', ''],
            ['Short Sword', 'Martial Melee', '10 gp', '2 lb', '1d6', '19-20/x2', 'Light'],
            ['Rapier', 'Martial Melee', '20 gp', '2 lb', '1d6', '18-20/x2', 'Finesse'],
            ['Greatsword', 'Martial Melee', '50 gp', '8 lb', '2d6', '19-20/x2', 'Two-handed'],
            ['Greataxe', 'Martial Melee', '20 gp', '12 lb', '1d12', 'x3', 'Two-handed'],
            ['Battleaxe', 'Martial Melee', '10 gp', '6 lb', '1d8', 'x3', ''],
            ['Longbow', 'Martial Ranged', '75 gp', '3 lb', '1d8', 'x3', 'Range 100ft'],
            ['Shortbow', 'Martial Ranged', '30 gp', '2 lb', '1d6', 'x3', 'Range 60ft'],
            ['Leather', 'Light Armor', '10 gp', '15 lb', '', '', 'AC +2, Max Dex +6, ACP 0'],
            ['Chain Shirt', 'Light Armor', '100 gp', '25 lb', '', '', 'AC +4, Max Dex +4, ACP -2'],
            ['Chainmail', 'Medium Armor', '150 gp', '40 lb', '', '', 'AC +5, Max Dex +2, ACP -5'],
            ['Full Plate', 'Heavy Armor', '1500 gp', '50 lb', '', '', 'AC +8, Max Dex +1, ACP -6'],
            ['Buckler', 'Shield', '15 gp', '5 lb', '', '', 'AC +1, ACP -1'],
            ['Shield, Heavy Steel', 'Shield', '20 gp', '15 lb', '', '', 'AC +2, ACP -2'],
        ];
        $cnt = $srd35->query("SELECT COUNT(*) as c FROM equipment")->fetch()['c'];
        if ($cnt == 0) {
            $stmt = $srd35->prepare('INSERT INTO equipment (name, category, cost, weight, damage, critical, properties) VALUES (?,?,?,?,?,?,?)');
            foreach ($equipment as $e)
                $stmt->execute($e);
            $results[] = '✅ Seeded ' . count($equipment) . ' equipment (3.5e DB)';
        } else {
            $results[] = '⏭️ 3.5e equipment already seeded (' . $cnt . ')';
        }

    } catch (Exception $e) {
        $results[] = '⚠️ SRD 3.5e DB: ' . htmlspecialchars($e->getMessage());
        $results[] = '   (Run setup_srd_dbs.php first, or create the databases in hosting panel)';
    }

    $results[] = '';
    $results[] = '<strong>═══ SOCIAL SYSTEMS ═══</strong>';

    // ═══════════════════════════════════════════════════════
    // CHARACTER MEMORIES
    // ═══════════════════════════════════════════════════════
    $pdo->exec("CREATE TABLE IF NOT EXISTS character_memories (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        character_id    INT NOT NULL,
        memory_type     VARCHAR(30) DEFAULT 'event',
        content         TEXT NOT NULL,
        sentiment       TINYINT DEFAULT 0,
        related_char_id INT NULL,
        related_pc      VARCHAR(100) NULL,
        faction_id      INT NULL,
        importance      TINYINT DEFAULT 5,
        game_date       VARCHAR(50) DEFAULT '',
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_mem_char (character_id),
        INDEX idx_mem_importance (importance),
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ character_memories table';

    // Add memory_summary column to characters table
    try {
        $pdo->exec("ALTER TABLE characters ADD COLUMN memory_summary TEXT DEFAULT ''");
        $results[] = '✅ Added memory_summary column to characters';
    } catch (Exception $e) { /* already exists */
    }

    // ═══════════════════════════════════════════════════════
    // CHARACTER RELATIONSHIPS (bilateral)
    // ═══════════════════════════════════════════════════════
    $pdo->exec("CREATE TABLE IF NOT EXISTS character_relationships (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        char1_id        INT NOT NULL,
        char2_id        INT NOT NULL,
        rel_type        VARCHAR(30) DEFAULT 'acquaintance',
        disposition     TINYINT DEFAULT 0,
        public_rel      TINYINT(1) DEFAULT 1,
        reason          TEXT DEFAULT '',
        started_date    VARCHAR(50) DEFAULT '',
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_rel_c1 (char1_id),
        INDEX idx_rel_c2 (char2_id),
        UNIQUE KEY unique_rel (char1_id, char2_id, rel_type),
        FOREIGN KEY (char1_id) REFERENCES characters(id) ON DELETE CASCADE,
        FOREIGN KEY (char2_id) REFERENCES characters(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ character_relationships table';

    // ═══════════════════════════════════════════════════════
    // FACTIONS (upgrade existing table with new columns)
    // ═══════════════════════════════════════════════════════
    $factionCols = [
        "ADD COLUMN faction_type VARCHAR(30) DEFAULT 'social'",
        "ADD COLUMN description TEXT DEFAULT ''",
        "ADD COLUMN leader_id INT NULL",
        "ADD COLUMN influence TINYINT DEFAULT 3",
        "ADD COLUMN public_goal VARCHAR(255) DEFAULT ''",
        "ADD COLUMN secret_goal VARCHAR(255) DEFAULT ''",
        "ADD COLUMN formed_date VARCHAR(50) DEFAULT ''",
        "ADD COLUMN status VARCHAR(20) DEFAULT 'active'",
        "ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
    ];
    foreach ($factionCols as $col) {
        try {
            $pdo->exec("ALTER TABLE factions $col");
        } catch (Exception $e) { /* already exists */
        }
    }
    $results[] = '✅ factions table upgraded';

    // ═══════════════════════════════════════════════════════
    // FACTION MEMBERS
    // ═══════════════════════════════════════════════════════
    $pdo->exec("CREATE TABLE IF NOT EXISTS faction_members (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        faction_id      INT NOT NULL,
        character_id    INT NOT NULL,
        role            VARCHAR(50) DEFAULT 'member',
        loyalty         TINYINT DEFAULT 5,
        joined_date     VARCHAR(50) DEFAULT '',
        UNIQUE KEY unique_membership (faction_id, character_id),
        INDEX idx_fm_faction (faction_id),
        INDEX idx_fm_char (character_id),
        FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE CASCADE,
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ faction_members table';

    // ═══════════════════════════════════════════════════════
    // FACTION RELATIONS (how factions feel about each other)
    // ═══════════════════════════════════════════════════════
    $pdo->exec("CREATE TABLE IF NOT EXISTS faction_relations (
        id                  INT AUTO_INCREMENT PRIMARY KEY,
        faction_id          INT NOT NULL,
        target_faction_id   INT NOT NULL,
        disposition         TINYINT DEFAULT 0,
        reason              VARCHAR(255) DEFAULT '',
        UNIQUE KEY unique_frel (faction_id, target_faction_id),
        FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE CASCADE,
        FOREIGN KEY (target_faction_id) REFERENCES factions(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ faction_relations table';

    // ═══════════════════════════════════════════════════════
    // PC REPUTATION
    // ═══════════════════════════════════════════════════════
    $pdo->exec("CREATE TABLE IF NOT EXISTS pc_reputation (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        town_id         INT NOT NULL,
        pc_name         VARCHAR(100) NOT NULL,
        character_id    INT NULL,
        faction_id      INT NULL,
        disposition     TINYINT DEFAULT 0,
        reason          TEXT DEFAULT '',
        last_interaction VARCHAR(50) DEFAULT '',
        INDEX idx_pcrep_town (town_id),
        INDEX idx_pcrep_pc (pc_name),
        FOREIGN KEY (town_id) REFERENCES towns(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ pc_reputation table';

    // ═══════════════════════════════════════════════════════
    // TOWN INCIDENTS (crimes, mysteries, plots)
    // ═══════════════════════════════════════════════════════
    $pdo->exec("CREATE TABLE IF NOT EXISTS town_incidents (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        town_id         INT NOT NULL,
        incident_type   VARCHAR(30) DEFAULT 'general',
        status          VARCHAR(20) DEFAULT 'active',
        severity        TINYINT DEFAULT 3,
        summary         TEXT NOT NULL,
        motive          VARCHAR(255) DEFAULT '',
        evidence_found  TEXT DEFAULT '',
        game_date       VARCHAR(50) DEFAULT '',
        discovered_date VARCHAR(50) DEFAULT '',
        solved_date     VARCHAR(50) DEFAULT '',
        dm_notes        TEXT DEFAULT '',
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_incident_town (town_id),
        INDEX idx_incident_status (status),
        FOREIGN KEY (town_id) REFERENCES towns(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ town_incidents table';

    // ═══════════════════════════════════════════════════════
    // INCIDENT PARTICIPANTS
    // ═══════════════════════════════════════════════════════
    $pdo->exec("CREATE TABLE IF NOT EXISTS incident_participants (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        incident_id     INT NOT NULL,
        character_id    INT NOT NULL,
        role            VARCHAR(30) DEFAULT 'witness',
        knows_truth     TINYINT(1) DEFAULT 0,
        alibi           VARCHAR(255) DEFAULT '',
        UNIQUE KEY unique_ip (incident_id, character_id),
        INDEX idx_ip_incident (incident_id),
        FOREIGN KEY (incident_id) REFERENCES town_incidents(id) ON DELETE CASCADE,
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ incident_participants table';

    // ═══════════════════════════════════════════════════════
    // INCIDENT CLUES
    // ═══════════════════════════════════════════════════════
    $pdo->exec("CREATE TABLE IF NOT EXISTS incident_clues (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        incident_id     INT NOT NULL,
        clue_text       TEXT NOT NULL,
        location        VARCHAR(100) DEFAULT '',
        points_to       INT NULL,
        found           TINYINT(1) DEFAULT 0,
        skill_check     VARCHAR(50) DEFAULT '',
        red_herring     TINYINT(1) DEFAULT 0,
        INDEX idx_clue_incident (incident_id),
        FOREIGN KEY (incident_id) REFERENCES town_incidents(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ incident_clues table';

    // Character XP Log — tracks every XP gain per character per simulation
    $pdo->exec("CREATE TABLE IF NOT EXISTS character_xp_log (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        character_id    INT NOT NULL,
        town_id         INT NOT NULL,
        xp_gained       INT NOT NULL DEFAULT 0,
        reason          VARCHAR(500) DEFAULT '',
        source          VARCHAR(50) DEFAULT 'simulation',
        game_date       VARCHAR(100) DEFAULT '',
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_xplog_char (character_id),
        INDEX idx_xplog_town (town_id),
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ character_xp_log table';

    // Migration: add xp_tags column for Growth Score system
    try {
        $pdo->exec("ALTER TABLE character_xp_log ADD COLUMN xp_tags JSON DEFAULT NULL AFTER game_date");
        $results[] = '✅ Added xp_tags column to character_xp_log';
    } catch (Exception $e) { /* already exists */ }

    // ═══════════════════════════════════════════════════════
    // CUSTOM CONTENT TABLES (Homebrew SRD content per user)
    // ═══════════════════════════════════════════════════════
    $results[] = '';
    $results[] = '<strong>═══ CUSTOM CONTENT TABLES ═══</strong>';

    $pdo->exec("CREATE TABLE IF NOT EXISTS custom_races (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        user_id         INT NOT NULL,
        campaign_id     INT NULL,
        name            VARCHAR(100) NOT NULL,
        size            VARCHAR(20) DEFAULT 'Medium',
        speed           INT DEFAULT 30,
        ability_mods    TEXT DEFAULT '',
        traits          TEXT DEFAULT '',
        languages       TEXT DEFAULT '',
        created_at      DATETIME DEFAULT NOW(),
        INDEX idx_cr_user (user_id),
        INDEX idx_cr_campaign (user_id, campaign_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ custom_races table';

    $pdo->exec("CREATE TABLE IF NOT EXISTS custom_classes (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        user_id         INT NOT NULL,
        campaign_id     INT NULL,
        name            VARCHAR(100) NOT NULL,
        hit_die         VARCHAR(10) DEFAULT 'd8',
        bab_type        VARCHAR(20) DEFAULT '3/4',
        good_saves      VARCHAR(50) DEFAULT '',
        skills_per_level INT DEFAULT 2,
        class_skills    TEXT DEFAULT '',
        class_features  TEXT DEFAULT '',
        created_at      DATETIME DEFAULT NOW(),
        INDEX idx_cc_user (user_id),
        INDEX idx_cc_campaign (user_id, campaign_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ custom_classes table';

    $pdo->exec("CREATE TABLE IF NOT EXISTS custom_feats (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        user_id         INT NOT NULL,
        campaign_id     INT NULL,
        name            VARCHAR(200) NOT NULL,
        type            VARCHAR(50) DEFAULT 'General',
        prerequisites   TEXT DEFAULT '',
        benefit         TEXT DEFAULT '',
        description     TEXT DEFAULT '',
        created_at      DATETIME DEFAULT NOW(),
        INDEX idx_cf_user (user_id),
        INDEX idx_cf_campaign (user_id, campaign_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ custom_feats table';

    $pdo->exec("CREATE TABLE IF NOT EXISTS custom_spells (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        user_id         INT NOT NULL,
        campaign_id     INT NULL,
        name            VARCHAR(200) NOT NULL,
        level           INT DEFAULT 0,
        school          VARCHAR(50) DEFAULT '',
        casting_time    VARCHAR(100) DEFAULT '1 standard action',
        `range`         VARCHAR(100) DEFAULT '',
        duration        VARCHAR(100) DEFAULT '',
        components      VARCHAR(200) DEFAULT '',
        description     TEXT DEFAULT '',
        classes         VARCHAR(500) DEFAULT '',
        created_at      DATETIME DEFAULT NOW(),
        INDEX idx_cs_user (user_id),
        INDEX idx_cs_campaign (user_id, campaign_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ custom_spells table';

    $pdo->exec("CREATE TABLE IF NOT EXISTS custom_equipment (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        user_id         INT NOT NULL,
        campaign_id     INT NULL,
        name            VARCHAR(200) NOT NULL,
        category        VARCHAR(100) DEFAULT '',
        cost            VARCHAR(50) DEFAULT '',
        weight          VARCHAR(50) DEFAULT '',
        damage          VARCHAR(50) DEFAULT '',
        critical        VARCHAR(50) DEFAULT '',
        properties      TEXT DEFAULT '',
        created_at      DATETIME DEFAULT NOW(),
        INDEX idx_ce_user (user_id),
        INDEX idx_ce_campaign (user_id, campaign_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ custom_equipment table';

    // ═══════════════════════════════════════════════════════
    // USER FILES (per-account content library)
    // ═══════════════════════════════════════════════════════
    $pdo->exec("CREATE TABLE IF NOT EXISTS user_files (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        user_id         INT NOT NULL,
        campaign_id     INT NULL,
        filename        VARCHAR(255) NOT NULL,
        original_name   VARCHAR(255) NOT NULL,
        file_type       VARCHAR(50) DEFAULT 'document',
        mime_type       VARCHAR(100) DEFAULT '',
        file_size       INT DEFAULT 0,
        description     TEXT DEFAULT '',
        folder          VARCHAR(100) DEFAULT 'content',
        uploaded_at     DATETIME DEFAULT NOW(),
        INDEX idx_uf_user (user_id),
        INDEX idx_uf_campaign (user_id, campaign_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ user_files table';

    $results[] = '';
    $results[] = '🎉 Setup complete! <strong>Delete this file now.</strong>';

} catch (Exception $e) {
    $results[] = '❌ Error: ' . htmlspecialchars($e->getMessage());
    $results[] = '<br><small>Check your DB_HOST, DB_NAME, DB_USER, DB_PASS in config.php</small>';
}

// ═══════════════════════════════════════════════════════
// Phase 1 — Spellcasting, Effects & Multiclass Tables
// ═══════════════════════════════════════════════════════
try {
    // Spells Known (spontaneous casters: Sorcerer, Bard)
    $pdo->exec("CREATE TABLE IF NOT EXISTS character_spells_known (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        character_id    INT NOT NULL,
        spell_name      VARCHAR(200) NOT NULL,
        spell_level     INT NOT NULL DEFAULT 0,
        class_name      VARCHAR(100) DEFAULT '',
        source          VARCHAR(100) DEFAULT 'SRD',
        notes           TEXT DEFAULT '',
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_char_spell_class (character_id, spell_name, class_name),
        INDEX idx_csk_char (character_id),
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ character_spells_known table';

    // Spells Prepared (prepared casters: Cleric, Druid, Wizard, Paladin, Ranger)
    $pdo->exec("CREATE TABLE IF NOT EXISTS character_spells_prepared (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        character_id    INT NOT NULL,
        spell_name      VARCHAR(200) NOT NULL,
        spell_level     INT NOT NULL DEFAULT 0,
        slot_level      INT NOT NULL DEFAULT 0,
        class_name      VARCHAR(100) DEFAULT '',
        is_domain       TINYINT(1) DEFAULT 0,
        metamagic       VARCHAR(200) DEFAULT '',
        used            TINYINT(1) DEFAULT 0,
        INDEX idx_csp_char (character_id),
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ character_spells_prepared table';

    // Wizard Spellbook
    $pdo->exec("CREATE TABLE IF NOT EXISTS character_spellbook (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        character_id    INT NOT NULL,
        spell_name      VARCHAR(200) NOT NULL,
        spell_level     INT NOT NULL DEFAULT 0,
        pages           INT DEFAULT 1,
        source          VARCHAR(200) DEFAULT 'Starting spellbook',
        acquired_date   VARCHAR(50) DEFAULT '',
        UNIQUE KEY uk_char_spellbook (character_id, spell_name),
        INDEX idx_csb_char (character_id),
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ character_spellbook table';

    // Active Effects (conditions, buffs, debuffs)
    $pdo->exec("CREATE TABLE IF NOT EXISTS character_active_effects (
        id                  INT AUTO_INCREMENT PRIMARY KEY,
        character_id        INT NOT NULL,
        effect_key          VARCHAR(100) NOT NULL,
        effect_name         VARCHAR(200) DEFAULT '',
        category            VARCHAR(50) DEFAULT 'condition',
        bonus_type          VARCHAR(50) DEFAULT 'untyped',
        effects_json        TEXT DEFAULT '',
        duration_type       VARCHAR(50) DEFAULT 'permanent',
        duration_remaining  INT DEFAULT 0,
        source              VARCHAR(200) DEFAULT '',
        caster_level        INT DEFAULT 0,
        applied_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_cae_char (character_id),
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ character_active_effects table';

    // Character Level History (for multiclassing)
    $pdo->exec("CREATE TABLE IF NOT EXISTS character_level_history (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        character_id    INT NOT NULL,
        level_number    INT NOT NULL,
        class_name      VARCHAR(100) NOT NULL,
        hp_gained       INT DEFAULT 0,
        skill_points    INT DEFAULT 0,
        feat_chosen     VARCHAR(200) DEFAULT '',
        bonus_feat      VARCHAR(200) DEFAULT '',
        ability_increase VARCHAR(10) DEFAULT '',
        notes           TEXT DEFAULT '',
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_char_level (character_id, level_number),
        INDEX idx_clh_char (character_id),
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $results[] = '✅ character_level_history table';

    // ── Safe column migrations ────────────────────────────
    // Add columns that may be missing from older installs
    $migrations = [
        ['characters', 'ai_data', "TEXT DEFAULT ''"],
        ['characters', 'hd', "VARCHAR(50) DEFAULT ''"],
        ['characters', 'init', "VARCHAR(20) DEFAULT ''"],
        ['characters', 'spd', "VARCHAR(20) DEFAULT '30 ft'"],
        ['characters', 'grapple', "VARCHAR(20) DEFAULT ''"],
        ['characters', 'saves', "VARCHAR(100) DEFAULT ''"],
        ['characters', 'languages', "VARCHAR(255) DEFAULT 'Common'"],
        ['characters', 'cr', "VARCHAR(20) DEFAULT ''"],
        ['characters', 'history', "TEXT DEFAULT ''"],
        ['characters', 'xp', "INT DEFAULT 0"],
        ['characters', 'level', "INT DEFAULT 1"],
        ['characters', 'months_in_town', "INT DEFAULT 0"],
    ];
    foreach ($migrations as [$tbl, $col, $def]) {
        $check = $pdo->query("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '$tbl' AND COLUMN_NAME = '$col'")->fetchColumn();
        if (!$check) {
            $pdo->exec("ALTER TABLE $tbl ADD COLUMN $col $def");
            $results[] = "✅ Added column $tbl.$col";
        }
    }

    // ── Data migration: split class/level ─────────────────
    // Converts "Fighter 3" → class="Fighter", level=3
    // Only runs on rows where class contains a trailing number
    try {
        $needsSplit = $pdo->query("SELECT id, class FROM characters WHERE class REGEXP '[A-Za-z]+ [0-9]+$' AND (level IS NULL OR level <= 1)")->fetchAll(PDO::FETCH_ASSOC);
        $splitCount = 0;
        if ($needsSplit) {
            $upd = $pdo->prepare("UPDATE characters SET class = ?, level = ? WHERE id = ?");
            foreach ($needsSplit as $row) {
                $cls = trim($row['class']);
                // Handle multiclass: "Expert 14 / Barbarian 1"
                if (strpos($cls, '/') !== false) {
                    $parts = array_map('trim', explode('/', $cls));
                    $names = [];
                    $totalLevel = 0;
                    foreach ($parts as $part) {
                        if (preg_match('/^(.+?)\s+(\d+)$/', $part, $pm)) {
                            $names[] = trim($pm[1]);
                            $totalLevel += (int) $pm[2];
                        } else {
                            $names[] = $part;
                        }
                    }
                    $upd->execute([implode(' / ', $names), $totalLevel ?: 1, $row['id']]);
                } else {
                    // Single class: "Fighter 3"
                    if (preg_match('/^(.+?)\s+(\d+)$/', $cls, $sm)) {
                        $upd->execute([trim($sm[1]), (int) $sm[2], $row['id']]);
                    }
                }
                $splitCount++;
            }
        }
        if ($splitCount > 0) {
            $results[] = "✅ Split class/level for $splitCount characters";
        }
    } catch (Exception $me) {
        $results[] = '⚠️ Class/level migration: ' . htmlspecialchars($me->getMessage());
    }

    // -- Add homebrew_settings JSON column to campaign_rules --
    try {
        $pdo->exec("ALTER TABLE campaign_rules ADD COLUMN homebrew_settings TEXT DEFAULT '{}' AFTER campaign_description");
        $results[] = '✅ Added homebrew_settings column to campaign_rules';
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            $results[] = '⏭️ homebrew_settings column already exists';
        } else {
            $results[] = '⚠️ homebrew_settings migration: ' . htmlspecialchars($e->getMessage());
        }
    }

    // -- Add role column to users (admin system) --
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'");
        $results[] = '✅ Added role column to users';
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            $results[] = '⏭️ role column already exists';
        } else {
            $results[] = '⚠️ role migration: ' . htmlspecialchars($e->getMessage());
        }
    }

    // -- Create admin account (CelticTrinityStudios) --
    try {
        $adminExists = $pdo->query("SELECT id FROM users WHERE username = 'CelticTrinityStudios'")->fetch();
        if (!$adminExists) {
            $adminHash = password_hash('@Jdsdm14e', PASSWORD_BCRYPT);
            $pdo->prepare("INSERT INTO users (username, email, password_hash, role, subscription_tier) VALUES (?, ?, ?, 'admin', 'subscriber')")
                ->execute(['CelticTrinityStudios', 'admin@Eon Weaver.local', $adminHash]);
            $results[] = '✅ Created admin account: CelticTrinityStudios';
        } else {
            // Ensure role is set to admin
            $pdo->exec("UPDATE users SET role = 'admin' WHERE username = 'CelticTrinityStudios'");
            $results[] = '⏭️ Admin account already exists — role verified';
        }
    } catch (Exception $e) {
        $results[] = '⚠️ Admin account: ' . htmlspecialchars($e->getMessage());
    }

} catch (Exception $e) {
    $results[] = '⚠️ Phase 1 tables: ' . htmlspecialchars($e->getMessage());
}

header('Content-Type: text/html; charset=utf-8');
echo '<!DOCTYPE html><html><head><title>Eon Weaver Setup — MySQL</title>';
echo '<style>body{font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:20px;line-height:1.8}h1{color:#f5c518}strong{color:#f5c518}</style>';
echo '</head><body><h1>Eon Weaver — MySQL Setup</h1>';
foreach ($results as $r)
    echo "<div>$r</div>";
echo '</body></html>';
