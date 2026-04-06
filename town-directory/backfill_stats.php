<?php
/**
 * backfill_stats.php — Recalculates missing combat stats for existing characters
 * Fills in: init, spd, saves, hd, grapple, languages, xp, cr
 * Run once to fix characters generated before the server-side calculation was added.
 */

// Smart base dir — same pattern as simulate.php
$baseDir = file_exists(__DIR__ . '/auth.php') ? __DIR__ : (realpath(__DIR__ . '/..') ?: __DIR__);
require_once $baseDir . '/auth.php';
require_once $baseDir . '/db.php';

header('Content-Type: application/json');

try {
    requireAuth();
    $uid = (int) $_SESSION['user_id'];
} catch (Exception $e) {
    echo json_encode(['ok' => false, 'error' => 'Unauthorized: ' . $e->getMessage()]);
    exit;
}

$hitDice = [
    'Commoner' => 4,
    'Expert' => 6,
    'Warrior' => 8,
    'Adept' => 6,
    'Aristocrat' => 8,
    'Fighter' => 10,
    'Cleric' => 8,
    'Wizard' => 4,
    'Rogue' => 6,
    'Ranger' => 8,
    'Barbarian' => 12,
    'Bard' => 6,
    'Paladin' => 10,
    'Monk' => 8,
    'Druid' => 8,
    'Sorcerer' => 4
];
$raceSpeeds = [
    'Human' => 30,
    'Elf' => 30,
    'Half-Elf' => 30,
    'Half-Orc' => 30,
    'Dwarf' => 20,
    'Gnome' => 20,
    'Halfling' => 20
];
$raceLangs = [
    'Human' => 'Common',
    'Elf' => 'Common, Elven',
    'Dwarf' => 'Common, Dwarven',
    'Gnome' => 'Common, Gnome',
    'Halfling' => 'Common, Halfling',
    'Half-Elf' => 'Common, Elven',
    'Half-Orc' => 'Common, Orc'
];
$raceSizes = ['Gnome' => 'Small', 'Halfling' => 'Small'];
$classGoodSaves = [
    'Fighter' => ['fort'],
    'Barbarian' => ['fort'],
    'Paladin' => ['fort'],
    'Ranger' => ['fort', 'ref'],
    'Monk' => ['fort', 'ref', 'will'],
    'Rogue' => ['ref'],
    'Bard' => ['ref', 'will'],
    'Cleric' => ['fort', 'will'],
    'Druid' => ['fort', 'will'],
    'Wizard' => ['will'],
    'Sorcerer' => ['will'],
    'Commoner' => [],
    'Expert' => [],
    'Warrior' => ['fort'],
    'Adept' => ['will'],
    'Aristocrat' => ['will']
];
$babFull = ['Fighter', 'Barbarian', 'Paladin', 'Ranger', 'Warrior'];
$bab34 = ['Cleric', 'Druid', 'Rogue', 'Monk', 'Bard', 'Adept', 'Expert', 'Aristocrat'];
$npcClasses = ['Commoner', 'Expert', 'Warrior', 'Adept', 'Aristocrat'];
$fmtMod = function ($v) {
    return ($v >= 0 ? '+' : '') . $v; };

// Get all characters for this user's towns
$allChars = query("SELECT c.* FROM characters c JOIN towns t ON c.town_id = t.id WHERE t.user_id = ?", [$uid], $uid);

$updated = 0;
$skipped = 0;
$details = [];

foreach ($allChars as $ch) {
    // Parse class + level
    $classStr = $ch['class'] ?? 'Commoner 1';
    preg_match('/^(.+?)\s+(\d+)$/', trim($classStr), $m);
    $className = $m ? trim($m[1]) : 'Commoner';
    $level = $m ? (int) $m[2] : 1;

    $str = (int) ($ch['str'] ?? 10);
    $dex = (int) ($ch['dex'] ?? 10);
    $con = (int) ($ch['con'] ?? 10);
    $int_ = (int) ($ch['int_'] ?? 10);
    $wis = (int) ($ch['wis'] ?? 10);
    $strMod = (int) floor(($str - 10) / 2);
    $dexMod = (int) floor(($dex - 10) / 2);
    $conMod = (int) floor(($con - 10) / 2);
    $wisMod = (int) floor(($wis - 10) / 2);
    $race = $ch['race'] ?? 'Human';

    $updates = [];
    $params = [];

    // Init
    if (empty($ch['init'])) {
        $updates[] = 'init = ?';
        $params[] = $fmtMod($dexMod);
    }

    // Speed
    if (empty($ch['spd'])) {
        $updates[] = 'spd = ?';
        $params[] = ($raceSpeeds[$race] ?? 30) . ' ft';
    }

    // Hit Dice
    if (empty($ch['hd'])) {
        $hd_val = $hitDice[$className] ?? 6;
        $updates[] = 'hd = ?';
        $params[] = $level . 'd' . $hd_val;
    }

    // BAB (needed for saves + grapple)
    if (in_array($className, $babFull))
        $bab = $level;
    elseif (in_array($className, $bab34))
        $bab = (int) floor($level * 3 / 4);
    else
        $bab = (int) floor($level / 2);

    // Saves
    if (empty($ch['saves'])) {
        $goodSaves = $classGoodSaves[$className] ?? [];
        $fortBase = in_array('fort', $goodSaves) ? (int) floor($level / 2) + 2 : (int) floor($level / 3);
        $refBase = in_array('ref', $goodSaves) ? (int) floor($level / 2) + 2 : (int) floor($level / 3);
        $willBase = in_array('will', $goodSaves) ? (int) floor($level / 2) + 2 : (int) floor($level / 3);
        $updates[] = 'saves = ?';
        $params[] = 'Fort ' . $fmtMod($fortBase + $conMod) . ', Ref ' . $fmtMod($refBase + $dexMod) . ', Will ' . $fmtMod($willBase + $wisMod);
    }

    // Grapple
    if (empty($ch['grapple'])) {
        $sizePenalty = isset($raceSizes[$race]) ? -4 : 0;
        $updates[] = 'grapple = ?';
        $params[] = $fmtMod($bab + $strMod + $sizePenalty);
    }

    // Languages
    if (empty($ch['languages'])) {
        $updates[] = 'languages = ?';
        $params[] = $raceLangs[$race] ?? 'Common';
    }

    // XP — default to 0 if null
    if ($ch['xp'] === null || $ch['xp'] === '') {
        $updates[] = 'xp = ?';
        $params[] = 0;
    }

    // CR
    if (empty($ch['cr'])) {
        $updates[] = 'cr = ?';
        $params[] = in_array($className, $npcClasses) ? ($level <= 1 ? '1/2' : (string) ($level - 1)) : (string) $level;
    }

    // AC enhancement — add touch/flat-footed if missing
    $ac = trim($ch['ac'] ?? '');
    if (is_numeric($ac) && stripos($ac, 'touch') === false) {
        $acNum = (int) $ac;
        $isSmall = isset($raceSizes[$race]);
        $touchAc = 10 + $dexMod + ($isSmall ? 1 : 0);
        $flatAc = $acNum - $dexMod;
        $updates[] = 'ac = ?';
        $params[] = "$acNum, touch $touchAc, flat-footed $flatAc";
    }

    if (count($updates) > 0) {
        $params[] = $ch['id'];
        $sql = "UPDATE characters SET " . implode(', ', $updates) . " WHERE id = ?";
        execute($sql, $params, $uid);
        $updated++;
        $details[] = $ch['name'] . ': ' . implode(', ', array_map(fn($u) => explode(' =', $u)[0], $updates));
    } else {
        $skipped++;
    }
}

echo json_encode([
    'ok' => true,
    'updated' => $updated,
    'skipped' => $skipped,
    'total' => count($allChars),
    'message' => "Backfilled $updated characters, $skipped already complete.",
    'details' => array_slice($details, 0, 20) // Show first 20 for debugging
]);
