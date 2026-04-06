<?php
/**
 * Eon Weaver — Seed Adept Spell List into SRD Database
 * 
 * The Adept NPC class has its own spell list (DMG p.107 / d20srd.org)
 * that is NOT included in standard SRD spell data exports.
 * This script updates the spells table level field to include "Adp X"
 * for every spell on the Adept list.
 *
 * Run: https://eonweaver.com/seed_adept_spells.php?key=setup2024
 */
require_once __DIR__ . '/db.php';

$SETUP_KEY = 'setup2024';
if (($_GET['key'] ?? '') !== $SETUP_KEY) {
    die('Access denied. Use ?key=' . $SETUP_KEY);
}

// Adept Spell List from d20srd.org/srd/npcClasses/adept.htm
$adeptSpells = [
    // 0-Level
    0 => [
        'Create Water',
        'Cure Minor Wounds',
        'Detect Magic',
        'Ghost Sound',
        'Guidance',
        'Light',
        'Mending',
        'Purify Food and Drink',
        'Read Magic',
        'Touch of Fatigue',
    ],
    // 1st Level
    1 => [
        'Bless',
        'Burning Hands',
        'Cause Fear',
        'Command',
        'Comprehend Languages',
        'Cure Light Wounds',
        'Detect Chaos',
        'Detect Evil',
        'Detect Good',
        'Detect Law',
        'Endure Elements',
        'Obscuring Mist',
        'Protection from Chaos',
        'Protection from Evil',
        'Protection from Good',
        'Protection from Law',
        'Sleep',
    ],
    // 2nd Level
    2 => [
        'Aid',
        'Animal Trance',
        "Bear's Endurance",
        "Bull's Strength",
        "Cat's Grace",
        'Cure Moderate Wounds',
        'Darkness',
        'Delay Poison',
        'Invisibility',
        'Mirror Image',
        'Resist Energy',
        'Scorching Ray',
        'See Invisibility',
        'Web',
    ],
    // 3rd Level
    3 => [
        'Animate Dead',
        'Bestow Curse',
        'Contagion',
        'Continual Flame',
        'Cure Serious Wounds',
        'Daylight',
        'Deeper Darkness',
        'Lightning Bolt',
        'Neutralize Poison',
        'Remove Curse',
        'Remove Disease',
        'Tongues',
    ],
    // 4th Level
    4 => [
        'Cure Critical Wounds',
        'Minor Creation',
        'Polymorph',
        'Restoration',
        'Stoneskin',
        'Wall of Fire',
    ],
    // 5th Level
    5 => [
        'Baleful Polymorph',
        'Break Enchantment',
        'Commune',
        'Heal',
        'Major Creation',
        'Raise Dead',
        'True Seeing',
        'Wall of Stone',
    ],
];

$results = [];
$updated = 0;
$notFound = [];

try {
    $srd = getSrdDB('3.5e');

    foreach ($adeptSpells as $level => $spells) {
        foreach ($spells as $spellName) {
            // Find the spell in the SRD database (case-insensitive match)
            $stmt = $srd->prepare("SELECT id, name, level FROM spells WHERE LOWER(name) = LOWER(?) LIMIT 1");
            $stmt->execute([$spellName]);
            $row = $stmt->fetch();

            if (!$row) {
                $notFound[] = "$spellName (Adp $level)";
                continue;
            }

            $currentLevel = $row['level'] ?? '';

            // Check if Adp is already in the level string
            if (stripos($currentLevel, 'Adp') !== false) {
                continue; // Already has Adept level
            }

            // Append ", Adp X" to the level string
            $newLevel = $currentLevel ? "$currentLevel, Adp $level" : "Adp $level";

            $upd = $srd->prepare("UPDATE spells SET level = ? WHERE id = ?");
            $upd->execute([$newLevel, $row['id']]);
            $updated++;
            $results[] = "✅ {$row['name']}: added Adp $level";
        }
    }

    $results[] = "";
    $results[] = "=== Summary ===";
    $results[] = "✅ Updated $updated spells with Adept class levels";
    if ($notFound) {
        $results[] = "⚠️ Not found in SRD DB: " . implode(', ', $notFound);
    }
} catch (Exception $e) {
    $results[] = '❌ Error: ' . htmlspecialchars($e->getMessage());
}

header('Content-Type: text/html; charset=utf-8');
echo '<!DOCTYPE html><html><head><title>Seed Adept Spells</title>';
echo '<style>body{font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:20px;line-height:1.8}h1{color:#f5c518}</style>';
echo '</head><body><h1>Seed Adept Spell List</h1>';
foreach ($results as $r)
    echo "<div>$r</div>";
echo '</body></html>';
