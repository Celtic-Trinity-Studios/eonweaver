<?php
/**
 * Eon Weaver — Shared Helper Functions
 * Reusable functions used by both api.php and simulate.php.
 */

/**
 * Determine effective item type from stored type + name keywords.
 * Handles cases where SRD lookup failed and item_type is 'gear'.
 */
function detectItemType($storedType, $itemName)
{
    if ($storedType === 'weapon' || $storedType === 'armor' || $storedType === 'shield') {
        return $storedType;
    }
    $n = strtolower(trim($itemName));
    // Check shields FIRST (before armor, since "shield" contains no armor keywords)
    $shieldWords = ['shield', 'buckler'];
    foreach ($shieldWords as $w) {
        if (strpos($n, $w) !== false)
            return 'shield';
    }
    // Check armor
    $armorWords = ['armor', 'mail', 'plate', 'breastplate', 'chain shirt', 'hide armor', 'scale mail'];
    foreach ($armorWords as $w) {
        if (strpos($n, $w) !== false)
            return 'armor';
    }
    // Check weapons
    $weaponWords = [
        'sword',
        'dagger',
        'axe',
        'bow',
        'crossbow',
        'mace',
        'hammer',
        'spear',
        'staff',
        'quarterstaff',
        'sickle',
        'club',
        'flail',
        'morningstar',
        'scimitar',
        'rapier',
        'trident',
        'javelin',
        'sling',
        'lance',
        'halberd',
        'glaive',
        'scythe',
        'falchion',
        'warhammer',
        'battleaxe',
        'greataxe',
        'greatsword',
        'shortbow',
        'longbow'
    ];
    foreach ($weaponWords as $w) {
        if (strpos($n, $w) !== false)
            return 'weapon';
    }
    return $storedType; // unchanged
}

/**
 * Recalculate character AC & attack string from equipped items.
 * Uses D&D 3.5e rules: AC = 10 + DEX mod (capped by armor) + armor + shield + size.
 */
function recalcCharStats($charId, $uid)
{
    $charRows = query('SELECT * FROM characters WHERE id = ?', [$charId], $uid);
    if (empty($charRows))
        return;
    $char = $charRows[0];

    $dex = (int) ($char['dex'] ?? 10);
    $str = (int) ($char['str'] ?? 10);
    $dexMod = (int) floor(($dex - 10) / 2);
    $strMod = (int) floor(($str - 10) / 2);

    $race = $char['race'] ?? 'Human';
    $smallRaces = ['Gnome', 'Halfling', 'Goblin'];
    $sizeMod = in_array($race, $smallRaces) ? 1 : 0;

    $classStr = $char['class'] ?? 'Commoner 1';
    preg_match('/^(.+?)\s+(\d+)$/', trim($classStr), $clsM);
    $className = $clsM ? trim($clsM[1]) : 'Commoner';
    $level = $clsM ? (int) $clsM[2] : 1;
    $babFull = ['Fighter', 'Barbarian', 'Paladin', 'Ranger', 'Warrior'];
    $bab34 = ['Cleric', 'Druid', 'Rogue', 'Monk', 'Bard', 'Adept', 'Expert', 'Aristocrat'];
    if (in_array($className, $babFull)) {
        $bab = $level;
    } elseif (in_array($className, $bab34)) {
        $bab = (int) floor($level * 3 / 4);
    } else {
        $bab = (int) floor($level / 2);
    }

    $equipped = query('SELECT * FROM character_equipment WHERE character_id = ? AND equipped = 1', [$charId], $uid);

    $armorBonus = 0;
    $shieldBonus = 0;
    $maxDexFromArmor = 99;
    $weaponName = '';
    $weaponDamage = '';
    $weaponCrit = '20/x2';
    $weaponRanged = false;

    $armorBonuses = [
        'padded armor' => [1, 8],
        'leather armor' => [2, 6],
        'studded leather armor' => [3, 5],
        'chain shirt' => [4, 4],
        'hide armor' => [3, 4],
        'scale mail' => [4, 3],
        'chainmail' => [5, 2],
        'breastplate' => [5, 3],
        'splint mail' => [6, 0],
        'banded mail' => [6, 1],
        'half-plate' => [7, 0],
        'full plate' => [8, 1]
    ];
    $shieldBonuses = [
        'buckler' => 1,
        'light wooden shield' => 1,
        'light steel shield' => 1,
        'heavy wooden shield' => 2,
        'heavy steel shield' => 2,
        'tower shield' => 4
    ];

    foreach ($equipped as $item) {
        $name = strtolower(trim($item['item_name'] ?? ''));
        $props = json_decode($item['properties'] ?? '{}', true) ?: [];
        // Use smart type detection: stored type + name keywords
        $type = detectItemType($item['item_type'] ?? 'gear', $item['item_name'] ?? '');

        // If stored type was wrong, fix it in the DB for future
        if ($type !== ($item['item_type'] ?? 'gear')) {
            try {
                execute('UPDATE character_equipment SET item_type = ? WHERE id = ?', [$type, $item['id']], $uid);
            } catch (Exception $e) { /* non-fatal */
            }
        }

        if ($type === 'armor') {
            if (isset($armorBonuses[$name])) {
                $armorBonus = $armorBonuses[$name][0];
                $maxDexFromArmor = $armorBonuses[$name][1];
            } else {
                // Try partial match against armor table
                foreach ($armorBonuses as $aName => $aVal) {
                    if (strpos($name, $aName) !== false || strpos($aName, $name) !== false) {
                        $armorBonus = $aVal[0];
                        $maxDexFromArmor = $aVal[1];
                        break;
                    }
                }
                if ($armorBonus === 0) {
                    $armorBonus = (int) ($props['armor_bonus'] ?? 2);
                }
            }
        } elseif ($type === 'shield') {
            if (isset($shieldBonuses[$name])) {
                $shieldBonus = $shieldBonuses[$name];
            } else {
                // Try partial match against shield table
                foreach ($shieldBonuses as $sName => $sVal) {
                    if (strpos($name, $sName) !== false || strpos($sName, $name) !== false) {
                        $shieldBonus = $sVal;
                        break;
                    }
                }
                if ($shieldBonus === 0) {
                    $shieldBonus = (int) ($props['shield_bonus'] ?? 1);
                }
            }
        } elseif ($type === 'weapon' && empty($weaponName)) {
            $weaponName = $item['item_name'];
            $weaponDamage = $props['damage'] ?? '';
            $weaponCrit = $props['critical'] ?? '20/x2';
            $srdProps = $props['srd_properties'] ?? '';
            $weaponRanged = (stripos($srdProps, 'range') !== false || stripos($name, 'bow') !== false || stripos($name, 'crossbow') !== false || stripos($name, 'sling') !== false);
        }
    }

    $effectiveDex = min($dexMod, $maxDexFromArmor);
    $totalAC = 10 + $effectiveDex + $armorBonus + $shieldBonus + $sizeMod;
    $touchAC = 10 + $effectiveDex + $sizeMod;
    $flatAC = 10 + $armorBonus + $shieldBonus + $sizeMod;
    $acStr = "$totalAC, touch $touchAC, flat-footed $flatAC";

    if ($weaponName) {
        $atkMod = $weaponRanged ? ($bab + $dexMod) : ($bab + $strMod);
        $atkStr = ($atkMod >= 0 ? '+' : '') . $atkMod;
        $dmgMod = $weaponRanged ? 0 : $strMod;
        $dmgStr = $weaponDamage;
        if ($dmgStr && $dmgMod != 0) {
            $dmgStr .= ($dmgMod >= 0 ? '+' : '') . $dmgMod;
        }
        $atkType = $weaponRanged ? 'Ranged' : 'Melee';
        $atk = "$atkType: $weaponName $atkStr ($dmgStr, $weaponCrit)";
    } else {
        $atkMod = $bab + $strMod;
        $atkStr = ($atkMod >= 0 ? '+' : '') . $atkMod;
        $atk = "Melee: unarmed $atkStr (1d3" . ($strMod != 0 ? (($strMod >= 0 ? '+' : '') . $strMod) : '') . ", 20/x2)";
    }

    execute('UPDATE characters SET ac = ?, atk = ? WHERE id = ?', [$acStr, $atk, $charId], $uid);
}

/**
 * Track AI token usage for a user.
 * Call this after every OpenRouter API response — pass the usage object
 * from the response JSON ($data['usage']).
 *
 * @param int $userId  The user's ID (from shared DB)
 * @param array $usage The 'usage' object from OpenRouter response
 */
function trackTokenUsage($userId, $usage)
{
    if (!$userId || !$usage) return;

    $totalTokens = (int) ($usage['total_tokens'] ?? 0);
    if ($totalTokens <= 0) {
        // Estimate from prompt + completion if total not provided
        $totalTokens = (int) ($usage['prompt_tokens'] ?? 0) + (int) ($usage['completion_tokens'] ?? 0);
    }
    if ($totalTokens <= 0) return;

    $yearMonth = date('Y-m'); // e.g. "2026-03"

    try {
        execute(
            "INSERT INTO user_token_usage (user_id, `year_month`, tokens_used, call_count, updated_at)
             VALUES (?, ?, ?, 1, NOW())
             ON DUPLICATE KEY UPDATE
                tokens_used = tokens_used + VALUES(tokens_used),
                call_count = call_count + 1,
                updated_at = NOW()",
            [$userId, $yearMonth, $totalTokens],
            0 // shared DB
        );
    } catch (Exception $e) {
        // Non-fatal — don't break simulation if tracking fails
        error_log("Token tracking failed for user {$userId}: " . $e->getMessage());
    }
}

/**
 * Check if a user has exceeded their hidden monthly token budget.
 * Returns true if they're OVER budget (should be blocked).
 *
 * @param int $userId  The user's ID
 * @param string $tier The user's subscription tier ('free' or 'subscriber')
 * @return bool True if over budget
 */
function checkTokenBudget($userId, $tier = 'free')
{
    $yearMonth = date('Y-m');

    // Load limits from site_settings (admin-adjustable without code deploy)
    $limitKey = 'token_limit_' . $tier;
    $limitRows = query("SELECT value FROM site_settings WHERE `key` = ?", [$limitKey], 0);
    $limit = $limitRows ? (int) $limitRows[0]['value'] : ($tier === 'subscriber' ? 5000000 : 500000);

    // 0 or negative limit = unlimited (safety override)
    if ($limit <= 0) return false;

    $usageRows = query(
        "SELECT tokens_used FROM user_token_usage WHERE user_id = ? AND `year_month` = ?",
        [$userId, $yearMonth],
        0
    );
    $used = $usageRows ? (int) $usageRows[0]['tokens_used'] : 0;

    return $used >= $limit;
}
