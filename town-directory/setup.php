<?php
/**
 * Town Directory — Database Setup (SQLite)
 * 
 * Run this ONCE to create all tables and seed SRD data.
 * Access via browser: https://ctsgame.com/Towns/setup.php?key=setup2024
 * 
 * After running, DELETE this file or password-protect it.
 */
require_once __DIR__ . '/db.php';

$SETUP_PASSWORD = 'setup2024';
if (($_GET['key'] ?? '') !== $SETUP_PASSWORD) {
    die('Access denied. Use ?key=' . $SETUP_PASSWORD);
}

$pdo = getDB();
$results = [];

try {
    // ═══════════════════════════════════════════════════════
    // CORE TABLES
    // ═══════════════════════════════════════════════════════

    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
    )");
    $results[] = '✅ users table';

    // Add API key column if not present
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN gemini_api_key TEXT DEFAULT ''");
        $results[] = '✅ users.gemini_api_key column added';
    } catch (Exception $e) {
        // Column already exists, skip
    }
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN dnd_edition TEXT DEFAULT '3.5e'");
        $results[] = '✅ users.dnd_edition column added';
    } catch (Exception $e) {
    }
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN xp_speed TEXT DEFAULT 'normal'");
        $results[] = '✅ users.xp_speed column added';
    } catch (Exception $e) {
    }
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN relationship_speed TEXT DEFAULT 'normal'");
        $results[] = '✅ users.relationship_speed column added';
    } catch (Exception $e) {
    }
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN birth_rate TEXT DEFAULT 'normal'");
        $results[] = '✅ users.birth_rate column added';
    } catch (Exception $e) {
    }
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN death_threshold TEXT DEFAULT '50'");
        $results[] = '✅ users.death_threshold column added';
    } catch (Exception $e) {
    }
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN child_growth TEXT DEFAULT 'realistic'");
        $results[] = '✅ users.child_growth column added';
    } catch (Exception $e) {
    }
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN conflict_frequency TEXT DEFAULT 'occasional'");
        $results[] = '✅ users.conflict_frequency column added';
    } catch (Exception $e) {
    }

    $pdo->exec("CREATE TABLE IF NOT EXISTS towns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        subtitle TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    )");
    $results[] = '✅ towns table';

    $pdo->exec("CREATE TABLE IF NOT EXISTS characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        town_id INTEGER NOT NULL REFERENCES towns(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        race TEXT DEFAULT '',
        class TEXT DEFAULT '',
        status TEXT DEFAULT 'Alive',
        title TEXT DEFAULT '',
        gender TEXT DEFAULT '',
        spouse TEXT DEFAULT 'None',
        spouse_label TEXT DEFAULT '',
        age INTEGER,
        xp INTEGER,
        cr TEXT DEFAULT '',
        ecl TEXT DEFAULT '',
        hp INTEGER,
        hd TEXT DEFAULT '',
        ac TEXT DEFAULT '',
        init TEXT DEFAULT '',
        spd TEXT DEFAULT '',
        grapple TEXT DEFAULT '',
        atk TEXT DEFAULT '',
        alignment TEXT DEFAULT '',
        saves TEXT DEFAULT '',
        str INTEGER,
        dex INTEGER,
        con INTEGER,
        int_ INTEGER,
        wis INTEGER,
        cha INTEGER,
        languages TEXT DEFAULT '',
        skills_feats TEXT,
        gear TEXT,
        role TEXT DEFAULT ''
    )");
    $results[] = '✅ characters table';

    try {
        $pdo->exec("ALTER TABLE characters ADD COLUMN feats TEXT DEFAULT ''");
        $results[] = '✅ characters.feats column added';
    } catch (Exception $e) {
    }

    try {
        $pdo->exec("ALTER TABLE characters ADD COLUMN history TEXT DEFAULT ''");
        $results[] = '✅ characters.history column added';
    } catch (Exception $e) {
    }

    try {
        $pdo->exec("ALTER TABLE characters ADD COLUMN portrait_url TEXT DEFAULT ''");
        $results[] = '✅ characters.portrait_url column added';
    } catch (Exception $e) {
    }

    $pdo->exec("CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        town_id INTEGER NOT NULL REFERENCES towns(id) ON DELETE CASCADE,
        heading TEXT NOT NULL,
        content TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0
    )");
    $results[] = '✅ history table';

    $pdo->exec("CREATE TABLE IF NOT EXISTS town_meta (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        town_id INTEGER NOT NULL REFERENCES towns(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        value TEXT,
        UNIQUE(town_id, key)
    )");
    $results[] = '✅ town_meta table';

    $pdo->exec("CREATE TABLE IF NOT EXISTS campaign_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rules_text TEXT DEFAULT '',
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(user_id)
    )");
    $results[] = '✅ campaign_rules table';

    $pdo->exec("CREATE TABLE IF NOT EXISTS site_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        `key` TEXT UNIQUE NOT NULL,
        value TEXT DEFAULT '',
        updated_at TEXT DEFAULT (datetime('now'))
    )");
    $results[] = '✅ site_settings table';

    // ═══════════════════════════════════════════════════════
    // SRD REFERENCE TABLES
    // ═══════════════════════════════════════════════════════

    $pdo->exec("CREATE TABLE IF NOT EXISTS srd_races (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        size TEXT DEFAULT 'Medium',
        speed INTEGER DEFAULT 30,
        ability_mods TEXT DEFAULT '',
        traits TEXT,
        languages TEXT DEFAULT ''
    )");
    $results[] = '✅ srd_races table';

    $pdo->exec("CREATE TABLE IF NOT EXISTS srd_classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        hit_die TEXT DEFAULT '',
        bab_type TEXT DEFAULT '',
        good_saves TEXT DEFAULT '',
        skills_per_level INTEGER DEFAULT 2,
        class_features TEXT
    )");
    $results[] = '✅ srd_classes table';

    $pdo->exec("CREATE TABLE IF NOT EXISTS srd_skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        ability TEXT DEFAULT '',
        trained_only INTEGER DEFAULT 0,
        armor_check_penalty INTEGER DEFAULT 0,
        description TEXT
    )");
    $results[] = '✅ srd_skills table';

    $pdo->exec("CREATE TABLE IF NOT EXISTS srd_feats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'General',
        prerequisites TEXT DEFAULT '',
        benefit TEXT,
        description TEXT
    )");
    $results[] = '✅ srd_feats table';

    $pdo->exec("CREATE TABLE IF NOT EXISTS srd_equipment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT DEFAULT '',
        cost TEXT DEFAULT '',
        weight TEXT DEFAULT '',
        damage TEXT DEFAULT '',
        critical TEXT DEFAULT '',
        properties TEXT
    )");
    $results[] = '✅ srd_equipment table';

    // ═══════════════════════════════════════════════════════
    // SEED SRD DATA
    // ═══════════════════════════════════════════════════════

    // -- Races --
    $races = [
        ['Human', 'Medium', 30, '+1 feat, +4 skill pts at 1st level', 'Bonus feat, bonus skills', 'Common'],
        ['Dwarf', 'Medium', 20, 'Con +2, Cha -2', 'Darkvision 60ft, stonecunning, stability, +2 vs poison/spells, +1 vs orcs/goblins, +4 dodge vs giants, stonecutting', 'Common, Dwarven'],
        ['Elf', 'Medium', 30, 'Dex +2, Con -2', 'Immunity to sleep, +2 vs enchantment, low-light vision, proficient with longsword/rapier/bows, +2 Listen/Search/Spot', 'Common, Elven'],
        ['Gnome', 'Small', 20, 'Con +2, Str -2', 'Low-light vision, +2 vs illusions, +1 DC illusions, +1 attack vs kobolds/goblins, +4 dodge vs giants, +2 Listen/Craft(Alchemy)', 'Common, Gnome'],
        ['Half-Elf', 'Medium', 30, 'None', 'Immunity to sleep, +2 vs enchantment, low-light vision, +1 Listen/Search/Spot, +2 Diplomacy/Gather Information', 'Common, Elven'],
        ['Half-Orc', 'Medium', 30, 'Str +2, Int -2, Cha -2', 'Darkvision 60ft, orc blood', 'Common, Orc'],
        ['Halfling', 'Small', 20, 'Dex +2, Str -2', '+2 Climb/Jump/Listen/Move Silently, +1 all saves, +2 morale vs fear, +1 attack with thrown/slings', 'Common, Halfling'],
    ];
    $cnt = query("SELECT COUNT(*) as c FROM srd_races")[0]['c'];
    if ($cnt == 0) {
        $stmt = $pdo->prepare('INSERT INTO srd_races (name, size, speed, ability_mods, traits, languages) VALUES (?,?,?,?,?,?)');
        foreach ($races as $r)
            $stmt->execute($r);
        $results[] = '✅ Seeded ' . count($races) . ' races';
    } else {
        $results[] = '⏭️ Races already seeded (' . $cnt . ')';
    }

    // -- Classes --
    $classes = [
        ['Barbarian', 'd12', 'Full', 'Fort', 4, 'Rage 1/day, fast movement, illiteracy'],
        ['Bard', 'd6', '3/4', 'Ref, Will', 6, 'Bardic music, bardic knowledge, spells'],
        ['Cleric', 'd8', '3/4', 'Fort, Will', 2, 'Turn/rebuke undead, domains, spells'],
        ['Druid', 'd8', '3/4', 'Fort, Will', 4, 'Animal companion, nature sense, wild empathy, spells'],
        ['Fighter', 'd10', 'Full', 'Fort', 2, 'Bonus feats (every even level)'],
        ['Monk', 'd8', '3/4', 'Fort, Ref, Will', 4, 'Flurry of blows, unarmed strike, AC bonus, evasion'],
        ['Paladin', 'd10', 'Full', 'Fort', 2, 'Smite evil, divine grace, lay on hands, aura of courage, spells'],
        ['Ranger', 'd8', 'Full', 'Fort, Ref', 6, 'Favored enemy, track, combat style, animal companion, spells'],
        ['Rogue', 'd6', '3/4', 'Ref', 8, 'Sneak attack, trapfinding, evasion, uncanny dodge, trap sense'],
        ['Sorcerer', 'd4', '1/2', 'Will', 2, 'Spontaneous arcane spells, familiar'],
        ['Wizard', 'd4', '1/2', 'Will', 2, 'Prepared arcane spells, familiar, scribe scroll, bonus metamagic/item creation feats'],
        ['Adept', 'd6', '1/2', 'Will', 2, 'NPC class. Divine spells, familiar (5th level)'],
        ['Aristocrat', 'd8', '3/4', 'Fort, Ref, Will', 4, 'NPC class. Broad skill access'],
        ['Commoner', 'd4', '1/2', 'None', 2, 'NPC class. Simple weapon proficiency only'],
        ['Expert', 'd6', '3/4', 'Will', 6, 'NPC class. 10 class skills of choice'],
        ['Warrior', 'd8', 'Full', 'Fort', 2, 'NPC class. Simple/martial proficiency, all armor/shields'],
    ];
    $cnt = query("SELECT COUNT(*) as c FROM srd_classes")[0]['c'];
    if ($cnt == 0) {
        $stmt = $pdo->prepare('INSERT INTO srd_classes (name, hit_die, bab_type, good_saves, skills_per_level, class_features) VALUES (?,?,?,?,?,?)');
        foreach ($classes as $c)
            $stmt->execute($c);
        $results[] = '✅ Seeded ' . count($classes) . ' classes';
    } else {
        $results[] = '⏭️ Classes already seeded (' . $cnt . ')';
    }

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
    $cnt = query("SELECT COUNT(*) as c FROM srd_skills")[0]['c'];
    if ($cnt == 0) {
        $stmt = $pdo->prepare('INSERT INTO srd_skills (name, ability, trained_only, armor_check_penalty) VALUES (?,?,?,?)');
        foreach ($skills as $s)
            $stmt->execute($s);
        $results[] = '✅ Seeded ' . count($skills) . ' skills';
    } else {
        $results[] = '⏭️ Skills already seeded (' . $cnt . ')';
    }

    // -- Core Feats --
    $feats = [
        ['Power Attack', 'General', 'Str 13', 'Trade attack bonus for damage'],
        ['Cleave', 'General', 'Str 13, Power Attack', 'Extra attack after dropping foe'],
        ['Great Cleave', 'General', 'Str 13, Cleave, BAB +4', 'Unlimited cleave attacks'],
        ['Combat Expertise', 'General', 'Int 13', 'Trade attack for AC'],
        ['Improved Trip', 'General', 'Int 13, Combat Expertise', '+4 trip, free attack on success'],
        ['Improved Disarm', 'General', 'Int 13, Combat Expertise', '+4 disarm, no AoO'],
        ['Dodge', 'General', 'Dex 13', '+1 dodge AC vs one opponent'],
        ['Mobility', 'General', 'Dex 13, Dodge', '+4 AC vs AoO from movement'],
        ['Spring Attack', 'General', 'Dex 13, Dodge, Mobility, BAB +4', 'Move before and after melee attack'],
        ['Weapon Focus', 'General', 'BAB +1', '+1 attack with chosen weapon'],
        ['Weapon Specialization', 'General', 'Fighter 4, Weapon Focus', '+2 damage with chosen weapon'],
        ['Weapon Finesse', 'General', 'BAB +1', 'Use Dex instead of Str for light melee'],
        ['Two-Weapon Fighting', 'General', 'Dex 15', 'Reduced penalties for two-weapon'],
        ['Improved Two-Weapon Fighting', 'General', 'Dex 17, TWF, BAB +6', 'Second off-hand attack'],
        ['Point Blank Shot', 'General', 'None', '+1 attack/damage within 30ft'],
        ['Precise Shot', 'General', 'Point Blank Shot', 'No penalty shooting into melee'],
        ['Rapid Shot', 'General', 'Dex 13, Point Blank Shot', 'Extra ranged attack at -2'],
        ['Manyshot', 'General', 'Dex 17, Rapid Shot, BAB +6', 'Fire multiple arrows at once'],
        ['Improved Initiative', 'General', 'None', '+4 initiative'],
        ['Toughness', 'General', 'None', '+3 hit points'],
        ['Iron Will', 'General', 'None', '+2 Will saves'],
        ['Great Fortitude', 'General', 'None', '+2 Fort saves'],
        ['Lightning Reflexes', 'General', 'None', '+2 Ref saves'],
        ['Combat Casting', 'General', 'None', '+4 Concentration for defensive casting'],
        ['Spell Focus', 'General', 'None', '+1 DC for chosen school'],
        ['Greater Spell Focus', 'General', 'Spell Focus', '+1 DC (stacks)'],
        ['Spell Penetration', 'General', 'None', '+2 caster level checks to overcome SR'],
        ['Scribe Scroll', 'Item Creation', 'Caster level 1', 'Create magic scrolls'],
        ['Brew Potion', 'Item Creation', 'Caster level 3', 'Create magic potions'],
        ['Craft Wondrous Item', 'Item Creation', 'Caster level 3', 'Create wondrous items'],
        ['Track', 'General', 'None', 'Use Survival to follow tracks'],
        ['Endurance', 'General', 'None', '+4 to checks vs nonlethal damage'],
        ['Run', 'General', 'None', 'Run 5x speed, +4 Jump after running start'],
        ['Alertness', 'General', 'None', '+2 Listen and Spot'],
        ['Negotiator', 'General', 'None', '+2 Diplomacy and Sense Motive'],
        ['Persuasive', 'General', 'None', '+2 Bluff and Intimidate'],
        ['Stealthy', 'General', 'None', '+2 Hide and Move Silently'],
        ['Skill Focus', 'General', 'None', '+3 to chosen skill'],
        ['Improved Unarmed Strike', 'General', 'None', 'No AoO for unarmed attacks'],
        ['Stunning Fist', 'General', 'Dex 13, Wis 13, IUS, BAB +8', 'Stun opponent on unarmed hit'],
        ['Deflect Arrows', 'General', 'Dex 13, IUS', 'Deflect one ranged attack per round'],
        ['Extra Turning', 'General', 'Turn/Rebuke Undead', '+4 turn/rebuke attempts per day'],
        ['Lingering Song', 'General', 'Bardic Music', 'Bardic music effects last 1 minute after stopping'],
        ['Exotic Weapon Proficiency', 'General', 'BAB +1', 'No penalty with chosen exotic weapon'],
        ['Mounted Combat', 'General', 'Ride 1 rank', 'Negate hit on mount with Ride check'],
    ];
    $cnt = query("SELECT COUNT(*) as c FROM srd_feats")[0]['c'];
    if ($cnt == 0) {
        $stmt = $pdo->prepare('INSERT INTO srd_feats (name, type, prerequisites, benefit) VALUES (?,?,?,?)');
        foreach ($feats as $f)
            $stmt->execute($f);
        $results[] = '✅ Seeded ' . count($feats) . ' feats';
    } else {
        $results[] = '⏭️ Feats already seeded (' . $cnt . ')';
    }

    // -- Equipment --
    $equipment = [
        ['Dagger', 'Simple Melee', '2 gp', '1 lb', '1d4', '19-20/x2', 'Light, thrown 10ft'],
        ['Mace, Light', 'Simple Melee', '5 gp', '4 lb', '1d6', 'x2', 'Light'],
        ['Mace, Heavy', 'Simple Melee', '12 gp', '8 lb', '1d8', 'x2', ''],
        ['Club', 'Simple Melee', '0 gp', '3 lb', '1d6', 'x2', 'Thrown 10ft'],
        ['Quarterstaff', 'Simple Melee', '0 gp', '4 lb', '1d6/1d6', 'x2', 'Double weapon'],
        ['Sickle', 'Simple Melee', '6 gp', '2 lb', '1d6', 'x2', 'Trip'],
        ['Spear', 'Simple Melee', '2 gp', '6 lb', '1d8', 'x3', 'Thrown 20ft'],
        ['Longspear', 'Simple Melee', '5 gp', '9 lb', '1d8', 'x3', 'Reach'],
        ['Crossbow, Light', 'Simple Ranged', '35 gp', '4 lb', '1d8', '19-20/x2', 'Range 80ft'],
        ['Crossbow, Heavy', 'Simple Ranged', '50 gp', '8 lb', '1d10', '19-20/x2', 'Range 120ft'],
        ['Dart', 'Simple Ranged', '5 sp', '0.5 lb', '1d4', 'x2', 'Thrown, range 20ft'],
        ['Sling', 'Simple Ranged', '0 gp', '0 lb', '1d4', 'x2', 'Range 50ft'],
        ['Longsword', 'Martial Melee', '15 gp', '4 lb', '1d8', '19-20/x2', ''],
        ['Short Sword', 'Martial Melee', '10 gp', '2 lb', '1d6', '19-20/x2', 'Light'],
        ['Rapier', 'Martial Melee', '20 gp', '2 lb', '1d6', '18-20/x2', 'Finesse'],
        ['Scimitar', 'Martial Melee', '15 gp', '4 lb', '1d6', '18-20/x2', ''],
        ['Greatsword', 'Martial Melee', '50 gp', '8 lb', '2d6', '19-20/x2', 'Two-handed'],
        ['Greataxe', 'Martial Melee', '20 gp', '12 lb', '1d12', 'x3', 'Two-handed'],
        ['Battleaxe', 'Martial Melee', '10 gp', '6 lb', '1d8', 'x3', ''],
        ['Warhammer', 'Martial Melee', '12 gp', '5 lb', '1d8', 'x3', ''],
        ['Flail', 'Martial Melee', '8 gp', '5 lb', '1d8', 'x2', 'Trip, disarm'],
        ['Halberd', 'Martial Melee', '10 gp', '12 lb', '1d10', 'x3', 'Trip, two-handed'],
        ['Longbow', 'Martial Ranged', '75 gp', '3 lb', '1d8', 'x3', 'Range 100ft'],
        ['Shortbow', 'Martial Ranged', '30 gp', '2 lb', '1d6', 'x3', 'Range 60ft'],
        ['Bastard Sword', 'Exotic Melee', '35 gp', '6 lb', '1d10', '19-20/x2', 'One-handed with EWP'],
        ['Dwarven Waraxe', 'Exotic Melee', '30 gp', '8 lb', '1d10', 'x3', 'One-handed for dwarves/EWP'],
        ['Padded', 'Light Armor', '5 gp', '10 lb', '', '', 'AC +1, Max Dex +8, ACP 0'],
        ['Leather', 'Light Armor', '10 gp', '15 lb', '', '', 'AC +2, Max Dex +6, ACP 0'],
        ['Studded Leather', 'Light Armor', '25 gp', '20 lb', '', '', 'AC +3, Max Dex +5, ACP -1'],
        ['Chain Shirt', 'Light Armor', '100 gp', '25 lb', '', '', 'AC +4, Max Dex +4, ACP -2'],
        ['Hide', 'Medium Armor', '15 gp', '25 lb', '', '', 'AC +3, Max Dex +4, ACP -3'],
        ['Scale Mail', 'Medium Armor', '50 gp', '30 lb', '', '', 'AC +4, Max Dex +3, ACP -4'],
        ['Chainmail', 'Medium Armor', '150 gp', '40 lb', '', '', 'AC +5, Max Dex +2, ACP -5'],
        ['Breastplate', 'Medium Armor', '200 gp', '30 lb', '', '', 'AC +5, Max Dex +3, ACP -4'],
        ['Splint Mail', 'Heavy Armor', '200 gp', '45 lb', '', '', 'AC +6, Max Dex +0, ACP -7'],
        ['Banded Mail', 'Heavy Armor', '250 gp', '35 lb', '', '', 'AC +6, Max Dex +1, ACP -6'],
        ['Half Plate', 'Heavy Armor', '600 gp', '50 lb', '', '', 'AC +7, Max Dex +0, ACP -7'],
        ['Full Plate', 'Heavy Armor', '1500 gp', '50 lb', '', '', 'AC +8, Max Dex +1, ACP -6'],
        ['Buckler', 'Shield', '15 gp', '5 lb', '', '', 'AC +1, ACP -1'],
        ['Shield, Light Wooden', 'Shield', '3 gp', '5 lb', '', '', 'AC +1, ACP -1'],
        ['Shield, Light Steel', 'Shield', '9 gp', '6 lb', '', '', 'AC +1, ACP -1'],
        ['Shield, Heavy Wooden', 'Shield', '7 gp', '10 lb', '', '', 'AC +2, ACP -2'],
        ['Shield, Heavy Steel', 'Shield', '20 gp', '15 lb', '', '', 'AC +2, ACP -2'],
    ];
    $cnt = query("SELECT COUNT(*) as c FROM srd_equipment")[0]['c'];
    if ($cnt == 0) {
        $stmt = $pdo->prepare('INSERT INTO srd_equipment (name, category, cost, weight, damage, critical, properties) VALUES (?,?,?,?,?,?,?)');
        foreach ($equipment as $e)
            $stmt->execute($e);
        $results[] = '✅ Seeded ' . count($equipment) . ' equipment items';
    } else {
        $results[] = '⏭️ Equipment already seeded (' . $cnt . ')';
    }

    $results[] = '';
    $results[] = '🎉 Setup complete! Delete this file or change the password.';

} catch (Exception $e) {
    $results[] = '❌ Error: ' . $e->getMessage();
}

// Output results
header('Content-Type: text/html; charset=utf-8');
echo '<!DOCTYPE html><html><head><title>Town Directory Setup</title>';
echo '<style>body{font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:20px;line-height:1.8}h1{color:#f5c518}</style>';
echo '</head><body><h1>Town Directory — Setup (SQLite)</h1>';
foreach ($results as $r)
    echo "<div>$r</div>";
echo '</body></html>';
