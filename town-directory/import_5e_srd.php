<?php
/**
 * Eon Weaver — 5e SRD Importer (Edition-Specific Database)
 * Downloads JSON from GitHub's 5e-bits/5e-database repo and imports
 * into the edition-specific SRD database.
 *
 * Usage: import_5e_srd.php?key=setup2024&edition=5e
 *        import_5e_srd.php?key=setup2024&edition=5e2024
 */
header('Content-Type: text/plain');
set_time_limit(300);

$key = $_GET['key'] ?? '';
if ($key !== 'setup2024') {
    die('Invalid key');
}

$edition = $_GET['edition'] ?? '5e';
if (!in_array($edition, ['5e', '5e2024'])) {
    die('Invalid edition. Use 5e or 5e2024');
}

$ghBase = $edition === '5e2024'
    ? 'https://raw.githubusercontent.com/5e-bits/5e-database/main/src/2024/'
    : 'https://raw.githubusercontent.com/5e-bits/5e-database/main/src/2014/';

require_once __DIR__ . '/db.php';
$pdo = getSrdDB($edition);

$results = [];

function fetchJson($url)
{
    $ctx = stream_context_create(['http' => ['timeout' => 30, 'user_agent' => 'Eon Weaver/1.0']]);
    $raw = @file_get_contents($url, false, $ctx);
    if ($raw === false)
        return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// ═══════════════════════════════════════════════════════════
// IMPORT RACES
// ═══════════════════════════════════════════════════════════
echo "Fetching races...\n";
flush();
$races = fetchJson($ghBase . '5e-SRD-Races.json');
if (!empty($races)) {
    $pdo->exec('TRUNCATE TABLE races');
    $stmt = $pdo->prepare('INSERT INTO races (name, size, speed, ability_mods, traits, languages) VALUES (?,?,?,?,?,?)');
    foreach ($races as $r) {
        $name = $r['name'] ?? 'Unknown';
        $speed = $r['speed'] ?? 30;
        $size = $r['size'] ?? 'Medium';
        $mods = [];
        foreach (($r['ability_bonuses'] ?? []) as $ab) {
            $aName = $ab['ability_score']['name'] ?? '';
            $bonus = $ab['bonus'] ?? 0;
            if ($aName && $bonus)
                $mods[] = "$aName " . ($bonus > 0 ? "+$bonus" : "$bonus");
        }
        $abilityMods = $mods ? implode(', ', $mods) : 'None';
        $traitNames = [];
        foreach (($r['traits'] ?? []) as $t) {
            $traitNames[] = $t['name'] ?? '';
        }
        $traits = implode(', ', array_filter($traitNames));
        $langs = [];
        foreach (($r['languages'] ?? []) as $l) {
            $langs[] = $l['name'] ?? '';
        }
        $languages = implode(', ', array_filter($langs));
        $stmt->execute([$name, $size, $speed, $abilityMods, $traits, $languages]);
    }
    $results[] = "✅ Imported " . count($races) . " races";
} else {
    $results[] = "⚠️ No races data available";
}

// ═══════════════════════════════════════════════════════════
// IMPORT CLASSES
// ═══════════════════════════════════════════════════════════
echo "Fetching classes...\n";
flush();
$classes = fetchJson($ghBase . '5e-SRD-Classes.json');
if (!empty($classes)) {
    $pdo->exec('TRUNCATE TABLE classes');
    $stmt = $pdo->prepare('INSERT INTO classes (name, hit_die, bab_type, good_saves, skills_per_level, class_skills, class_features) VALUES (?,?,?,?,?,?,?)');
    $skills5e = fetchJson($ghBase . '5e-SRD-Skills.json');
    $skillNames = array_map(fn($s) => $s['name'] ?? '', $skills5e);

    foreach ($classes as $c) {
        $name = $c['name'] ?? 'Unknown';
        $hitDie = 'd' . ($c['hit_die'] ?? 8);
        $babType = 'Proficiency';
        $saves = [];
        foreach (($c['saving_throws'] ?? []) as $st) {
            $saves[] = $st['name'] ?? '';
        }
        $goodSaves = implode(', ', $saves);
        $skillsPerLevel = 2;
        $classSkillList = [];
        foreach (($c['proficiency_choices'] ?? []) as $pc) {
            $desc = $pc['desc'] ?? '';
            if (stripos($desc, 'skill') !== false) {
                $skillsPerLevel = $pc['choose'] ?? 2;
            }
            foreach (($pc['from']['options'] ?? []) as $opt) {
                $pName = $opt['item']['name'] ?? ($opt['name'] ?? '');
                $pName = preg_replace('/^Skill:\s*/i', '', $pName);
                if ($pName && in_array($pName, $skillNames)) {
                    $classSkillList[] = $pName;
                }
            }
        }
        $classSkills = implode(', ', array_unique($classSkillList));
        $subclasses = [];
        foreach (($c['subclasses'] ?? []) as $sc) {
            $subclasses[] = $sc['name'] ?? '';
        }
        $features = $subclasses ? 'Subclasses: ' . implode(', ', $subclasses) : '';
        $stmt->execute([$name, $hitDie, $babType, $goodSaves, $skillsPerLevel, $classSkills, $features]);
    }
    $results[] = "✅ Imported " . count($classes) . " classes";
} else {
    $results[] = "⚠️ No classes data available";
}

// ═══════════════════════════════════════════════════════════
// IMPORT SKILLS
// ═══════════════════════════════════════════════════════════
echo "Fetching skills...\n";
flush();
$skills = fetchJson($ghBase . '5e-SRD-Skills.json');
if (!empty($skills)) {
    $pdo->exec('TRUNCATE TABLE skills');
    $stmt = $pdo->prepare('INSERT INTO skills (name, ability, trained_only, armor_check_penalty, description) VALUES (?,?,?,?,?)');
    foreach ($skills as $s) {
        $name = $s['name'] ?? 'Unknown';
        $ability = $s['ability_score']['name'] ?? '';
        $desc = '';
        foreach (($s['desc'] ?? []) as $d) {
            $desc .= $d . "\n";
        }
        $stmt->execute([$name, $ability, 0, 0, trim($desc)]);
    }
    $results[] = "✅ Imported " . count($skills) . " skills";
} else {
    $results[] = "⚠️ No skills data available";
}

// ═══════════════════════════════════════════════════════════
// IMPORT FEATS
// ═══════════════════════════════════════════════════════════
echo "Fetching feats...\n";
flush();
$feats = fetchJson($ghBase . '5e-SRD-Feats.json');
if (!empty($feats)) {
    $pdo->exec('TRUNCATE TABLE feats');
    $stmt = $pdo->prepare('INSERT INTO feats (name, type, prerequisites, benefit, description) VALUES (?,?,?,?,?)');
    foreach ($feats as $f) {
        $name = $f['name'] ?? 'Unknown';
        $prereqs = [];
        foreach (($f['prerequisites'] ?? []) as $p) {
            if (isset($p['ability_score'])) {
                $prereqs[] = ($p['ability_score']['name'] ?? '') . ' ' . ($p['minimum_score'] ?? 0);
            } elseif (isset($p['proficiency'])) {
                $prereqs[] = $p['proficiency']['name'] ?? '';
            }
        }
        $prereqStr = $prereqs ? implode(', ', $prereqs) : 'None';
        $desc = '';
        foreach (($f['desc'] ?? []) as $d) {
            $desc .= $d . "\n";
        }
        $stmt->execute([$name, 'General', $prereqStr, trim($desc), trim($desc)]);
    }
    $results[] = "✅ Imported " . count($feats) . " feats";
} else {
    $results[] = "⚠️ No feats data available";
}

// ═══════════════════════════════════════════════════════════
// IMPORT EQUIPMENT
// ═══════════════════════════════════════════════════════════
echo "Fetching equipment...\n";
flush();
$equipment = fetchJson($ghBase . '5e-SRD-Equipment.json');
if (!empty($equipment)) {
    $pdo->exec('TRUNCATE TABLE equipment');
    $stmt = $pdo->prepare('INSERT INTO equipment (name, category, cost, weight, damage, critical, properties) VALUES (?,?,?,?,?,?,?)');
    foreach ($equipment as $e) {
        $name = $e['name'] ?? 'Unknown';
        $cat = $e['equipment_category']['name'] ?? '';
        $cost = isset($e['cost']) ? ($e['cost']['quantity'] ?? 0) . ' ' . ($e['cost']['unit'] ?? 'gp') : '';
        $weight = isset($e['weight']) ? $e['weight'] . ' lb' : '';
        $damage = isset($e['damage']) ? ($e['damage']['damage_dice'] ?? '') . ' ' . ($e['damage']['damage_type']['name'] ?? '') : '';
        $props = [];
        foreach (($e['properties'] ?? []) as $p) {
            $props[] = $p['name'] ?? '';
        }
        $stmt->execute([$name, $cat, $cost, $weight, $damage, '', implode(', ', array_filter($props))]);
    }
    $results[] = "✅ Imported " . count($equipment) . " equipment items";
} else {
    $results[] = "⚠️ No equipment data available";
}

// ═══════════════════════════════════════════════════════════
// IMPORT SPELLS
// ═══════════════════════════════════════════════════════════
echo "Fetching spells...\n";
flush();
$spells = fetchJson($ghBase . '5e-SRD-Spells.json');
if (!empty($spells)) {
    $pdo->exec('TRUNCATE TABLE spells');
    $stmt = $pdo->prepare('INSERT INTO spells (name, school, subschool, descriptor_text, level, components, casting_time, spell_range, duration, saving_throw, spell_resistance, short_description, description) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
    foreach ($spells as $sp) {
        $name = $sp['name'] ?? 'Unknown';
        $school = $sp['school']['name'] ?? '';
        $levelParts = [];
        foreach (($sp['classes'] ?? []) as $cls) {
            $levelParts[] = ($cls['name'] ?? '') . ' ' . ($sp['level'] ?? 0);
        }
        $level = implode(', ', $levelParts);
        $comps = implode(', ', $sp['components'] ?? []);
        if ($sp['material'] ?? '')
            $comps .= ' (' . $sp['material'] . ')';
        $dcType = isset($sp['dc']) ? ($sp['dc']['dc_type']['name'] ?? '') . ' save' : 'None';
        $desc = implode("\n", $sp['desc'] ?? []);
        $shortDesc = mb_substr(strip_tags(trim($desc)), 0, 200);
        $stmt->execute([$name, $school, '', '', $level, $comps, $sp['casting_time'] ?? '', $sp['range'] ?? '', $sp['duration'] ?? '', $dcType, '', $shortDesc, trim($desc)]);
    }
    $results[] = "✅ Imported " . count($spells) . " spells";
} else {
    $results[] = "⚠️ No spells data available";
}

// ═══════════════════════════════════════════════════════════
// IMPORT MONSTERS
// ═══════════════════════════════════════════════════════════
echo "Fetching monsters...\n";
flush();
$monsters = fetchJson($ghBase . '5e-SRD-Monsters.json');
if (!empty($monsters)) {
    $pdo->exec('TRUNCATE TABLE monsters');
    $cols = $pdo->query("DESCRIBE monsters")->fetchAll(PDO::FETCH_COLUMN);
    $hasFamily = in_array('family', $cols);
    $sql = 'INSERT INTO monsters (' . ($hasFamily ? 'family, ' : '') . 'name, size, type, descriptor_text, hit_dice, armor_class, challenge_rating, alignment, environment) VALUES (' . ($hasFamily ? '?,' : '') . '?,?,?,?,?,?,?,?,?)';
    $stmt = $pdo->prepare($sql);
    foreach ($monsters as $m) {
        $acArr = $m['armor_class'] ?? [];
        $ac = is_array($acArr) && !empty($acArr) ? ($acArr[0]['value'] ?? '?') : '?';
        $hp = ($m['hit_points'] ?? 0) . ' (' . ($m['hit_dice'] ?? '') . ')';
        $vals = [$m['name'] ?? 'Unknown', $m['size'] ?? '', $m['type'] ?? '', $m['subtype'] ?? '', $hp, (string) $ac, (string) ($m['challenge_rating'] ?? '0'), $m['alignment'] ?? '', ''];
        if ($hasFamily)
            array_unshift($vals, '');
        $stmt->execute($vals);
    }
    $results[] = "✅ Imported " . count($monsters) . " monsters";
} else {
    $results[] = "⚠️ No monsters data available";
}

// ═══════════════════════════════════════════════════════════
// IMPORT MAGIC ITEMS
// ═══════════════════════════════════════════════════════════
echo "Fetching magic items...\n";
flush();
$items = fetchJson($ghBase . '5e-SRD-Magic-Items.json');
if (!empty($items)) {
    $pdo->exec('TRUNCATE TABLE items');
    $cols = $pdo->query("DESCRIBE items")->fetchAll(PDO::FETCH_COLUMN);
    $colList = ['name', 'category'];
    $placeList = ['?', '?'];
    foreach (['subcategory', 'aura', 'caster_level', 'price', 'weight'] as $oc) {
        if (in_array($oc, $cols)) {
            $colList[] = $oc;
            $placeList[] = '?';
        }
    }

    $stmt = $pdo->prepare('INSERT INTO items (' . implode(',', $colList) . ') VALUES (' . implode(',', $placeList) . ')');
    foreach ($items as $it) {
        $cat = $it['equipment_category']['name'] ?? '';
        $rarity = isset($it['rarity']) ? ($it['rarity']['name'] ?? '') : '';
        $vals = [$it['name'] ?? 'Unknown', $cat];
        foreach (['subcategory', 'aura', 'caster_level', 'price', 'weight'] as $oc) {
            if (in_array($oc, $cols)) {
                $vals[] = ($oc === 'subcategory' ? $rarity : '');
            }
        }

        $stmt->execute($vals);
    }
    $results[] = "✅ Imported " . count($items) . " magic items";
} else {
    $results[] = "⚠️ No magic items data available";
}

echo "\n=== 5e SRD Import Complete (edition=$edition) ===\n\n";
echo implode("\n", $results) . "\n\nDone!\n";
