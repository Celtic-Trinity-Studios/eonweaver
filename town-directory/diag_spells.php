<?php
header('Content-Type: text/html; charset=utf-8');
if (($_GET['key'] ?? '') !== 'diag2024')
    die('Use ?key=diag2024');
$baseDir = file_exists(__DIR__ . '/config.php') ? __DIR__ : (realpath(__DIR__ . '/..') ?: __DIR__);
require_once $baseDir . '/config.php';
require_once $baseDir . '/db.php';
if (file_exists($baseDir . '/helpers.php'))
    require_once $baseDir . '/helpers.php';
$pdo = getDB();
$townId = (int) ($_GET['town_id'] ?? 34);

echo '<pre style="background:#111;color:#eee;padding:20px;font-size:14px;">';
echo "=== QUICK SPELL TEST (town=$townId) ===\n\n";

// Find first Adept in this town
$chars = $pdo->prepare("SELECT id, name, class, level, role FROM characters WHERE town_id = ? AND status = 'Alive' AND class LIKE 'Adept%' LIMIT 1");
$chars->execute([$townId]);
$ch = $chars->fetch(PDO::FETCH_ASSOC);

if (!$ch) {
    echo "No Adept found in town $townId\n";
    // list all classes
    $all = $pdo->prepare("SELECT class, COUNT(*) as c FROM characters WHERE town_id = ? AND status='Alive' GROUP BY class");
    $all->execute([$townId]);
    foreach ($all->fetchAll(PDO::FETCH_ASSOC) as $r)
        echo "  {$r['class']}: {$r['c']}\n";
    echo '</pre>';
    exit;
}

echo "Found: #{$ch['id']} {$ch['name']} (class={$ch['class']}, level={$ch['level']}, role={$ch['role']})\n\n";

// Test parseSpellLevelForClass with the actual SRD data
echo "--- Testing parseSpellLevelForClass ---\n";
$testSpell = srdQuery('3.5e', "SELECT name, level FROM spells WHERE level LIKE '%Cleric 0%' LIMIT 1");
if ($testSpell) {
    $ts = $testSpell[0];
    echo "Test spell: {$ts['name']} level=\"{$ts['level']}\"\n";

    // parseSpellLevelForClass is in simulate.php which we can't require
    // So let's inline the test
    $levelStr = $ts['level'];
    $keys = ['Clr', 'Cleric', 'Adp', 'Adept', 'Sorcerer/Wizard', 'Sor/Wiz'];
    foreach ($keys as $k) {
        $parts = preg_split('/[,;]/', $levelStr);
        $found = null;
        foreach ($parts as $part) {
            $part = trim($part);
            if (preg_match('/^(.+?)\s+(\d+)$/', $part, $m)) {
                $cls = trim($m[1]);
                $lvl = (int) $m[2];
                if (strcasecmp($cls, $k) === 0 || stripos($cls, $k) !== false || stripos($k, $cls) !== false) {
                    $found = $lvl;
                    break;
                }
            }
        }
        echo "  parseSpellLevelForClass(\"...\", \"$k\") => " . ($found !== null ? $found : "null") . "\n";
    }
}

// Count Adp spells available
$adpCounts = [];
for ($sl = 0; $sl <= 5; $sl++) {
    $c = srdQuery('3.5e', "SELECT COUNT(*) as c FROM spells WHERE level LIKE '%Adp $sl%'");
    $adpCounts[$sl] = $c[0]['c'] ?? 0;
}
echo "\n--- Adp spells per level ---\n";
foreach ($adpCounts as $sl => $cnt) {
    echo "  Level $sl: $cnt spells\n";
}

// Count Cleric spells (fallback)
echo "\n--- Cleric spells per level ---\n";
for ($sl = 0; $sl <= 2; $sl++) {
    $c = srdQuery('3.5e', "SELECT COUNT(*) as c FROM spells WHERE level LIKE '%Cleric $sl%'");
    echo "  Level $sl: {$c[0]['c']} spells\n";
}

echo "\n=== DONE ===\n";
echo '</pre>';
