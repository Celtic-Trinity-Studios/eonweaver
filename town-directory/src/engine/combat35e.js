/**
 * Eon Weaver — Combat Math Engine
 * Weapon database and combat calculations from app.js.
 */
import { abilityMod } from './rules35e.js';

/* ── D&D 3.5 Weapon Database ───────────────────────────── */
export const WEAPON_DB = {
    'dagger': { dmg: '1d4', crit: '19-20/×2', type: 'P', cat: 'Light', size: 'T', ranged: false },
    'handaxe': { dmg: '1d6', crit: '20/×3', type: 'S', cat: 'Light', size: 'S', ranged: false },
    'light hammer': { dmg: '1d4', crit: '20/×2', type: 'B', cat: 'Light', size: 'S', ranged: false },
    'punching dagger': { dmg: '1d4', crit: '20/×3', type: 'P', cat: 'Light', size: 'T', ranged: false },
    'sickle': { dmg: '1d6', crit: '20/×2', type: 'S', cat: 'Light', size: 'S', ranged: false },
    'short sword': { dmg: '1d6', crit: '19-20/×2', type: 'P', cat: 'Light', size: 'S', ranged: false },
    'club': { dmg: '1d6', crit: '20/×2', type: 'B', cat: '1-Handed', size: 'M', ranged: false },
    'longsword': { dmg: '1d8', crit: '19-20/×2', type: 'S', cat: '1-Handed', size: 'M', ranged: false },
    'rapier': { dmg: '1d6', crit: '18-20/×2', type: 'P', cat: '1-Handed', size: 'M', ranged: false },
    'scimitar': { dmg: '1d6', crit: '18-20/×2', type: 'S', cat: '1-Handed', size: 'M', ranged: false },
    'warhammer': { dmg: '1d8', crit: '20/×3', type: 'B', cat: '1-Handed', size: 'M', ranged: false },
    'battleaxe': { dmg: '1d8', crit: '20/×3', type: 'S', cat: '1-Handed', size: 'M', ranged: false },
    'flail': { dmg: '1d8', crit: '20/×2', type: 'B', cat: '1-Handed', size: 'M', ranged: false },
    'mace': { dmg: '1d8', crit: '20/×2', type: 'B', cat: '1-Handed', size: 'M', ranged: false },
    'heavy mace': { dmg: '1d8', crit: '20/×2', type: 'B', cat: '1-Handed', size: 'M', ranged: false },
    'morningstar': { dmg: '1d8', crit: '20/×2', type: 'B&P', cat: '1-Handed', size: 'M', ranged: false },
    'shortspear': { dmg: '1d6', crit: '20/×2', type: 'P', cat: '1-Handed', size: 'M', ranged: false },
    'trident': { dmg: '1d8', crit: '20/×2', type: 'P', cat: '1-Handed', size: 'M', ranged: false },
    'greatsword': { dmg: '2d6', crit: '19-20/×2', type: 'S', cat: '2-Handed', size: 'M', ranged: false },
    'greataxe': { dmg: '1d12', crit: '20/×3', type: 'S', cat: '2-Handed', size: 'M', ranged: false },
    'greatclub': { dmg: '1d10', crit: '20/×2', type: 'B', cat: '2-Handed', size: 'M', ranged: false },
    'longspear': { dmg: '1d8', crit: '20/×3', type: 'P', cat: '2-Handed', size: 'M', ranged: false },
    'quarterstaff': { dmg: '1d6', crit: '20/×2', type: 'B', cat: '2-Handed', size: 'M', ranged: false },
    'glaive': { dmg: '1d10', crit: '20/×3', type: 'S', cat: '2-Handed', size: 'M', ranged: false },
    'halberd': { dmg: '1d10', crit: '20/×3', type: 'P&S', cat: '2-Handed', size: 'M', ranged: false },
    'heavy flail': { dmg: '1d10', crit: '19-20/×2', type: 'B', cat: '2-Handed', size: 'M', ranged: false },
    'lance': { dmg: '1d8', crit: '20/×3', type: 'P', cat: '2-Handed', size: 'M', ranged: false },
    'scythe': { dmg: '2d4', crit: '20/×4', type: 'P&S', cat: '2-Handed', size: 'M', ranged: false },
    'falchion': { dmg: '2d4', crit: '18-20/×2', type: 'S', cat: '2-Handed', size: 'M', ranged: false },
    'shortbow': { dmg: '1d6', crit: '20/×3', type: 'P', cat: '2-Handed', size: 'M', ranged: true },
    'longbow': { dmg: '1d8', crit: '20/×3', type: 'P', cat: '2-Handed', size: 'M', ranged: true },
    'light crossbow': { dmg: '1d8', crit: '19-20/×2', type: 'P', cat: '2-Handed', size: 'M', ranged: true },
    'heavy crossbow': { dmg: '1d10', crit: '19-20/×2', type: 'P', cat: '2-Handed', size: 'M', ranged: true },
    'hand crossbow': { dmg: '1d4', crit: '19-20/×2', type: 'P', cat: 'Light', size: 'T', ranged: true },
    'javelin': { dmg: '1d6', crit: '20/×2', type: 'P', cat: '1-Handed', size: 'M', ranged: true },
    'sling': { dmg: '1d4', crit: '20/×2', type: 'B', cat: '2-Handed', size: 'S', ranged: true },
    'throwing axe': { dmg: '1d6', crit: '20/×2', type: 'S', cat: 'Light', size: 'S', ranged: true },
    'pitchfork': { dmg: '1d6', crit: '20/×2', type: 'P', cat: '2-Handed', size: 'M', ranged: false },
    'shovel': { dmg: '1d6', crit: '20/×2', type: 'B', cat: '2-Handed', size: 'M', ranged: false },
};

/**
 * Parse a character's gear text to find weapon references.
 * Returns an array of weapon objects with calculated bonuses.
 */
export function parseGearWeapons(gear, character) {
    if (!gear) return [];
    const weapons = [];
    const gearLower = gear.toLowerCase();

    for (const [name, data] of Object.entries(WEAPON_DB)) {
        if (gearLower.includes(name)) {
            const strMod = character.str ? abilityMod(parseInt(character.str)) : 0;
            const dexMod = character.dex ? abilityMod(parseInt(character.dex)) : 0;
            const atkMod = data.ranged ? dexMod : strMod;

            // Check for enhancement bonuses like "+1 longsword"
            const enhMatch = gearLower.match(new RegExp(`\\+(\\d)\\s*${name}`));
            const enhancement = enhMatch ? parseInt(enhMatch[1]) : 0;

            weapons.push({
                name: enhancement ? `+${enhancement} ${name}` : name,
                ...data,
                atkMod,
                enhancement,
                strMod,
                dexMod,
            });
        }
    }

    return weapons;
}

/* ── D&D 3.5e Armor Database ────────────────────────────── */
export const ARMOR_DB = {
    'padded armor': { ac: 1, maxDex: 8, checkPenalty: 0, weight: 10, type: 'light', arcFail: 5 },
    'leather armor': { ac: 2, maxDex: 6, checkPenalty: 0, weight: 15, type: 'light', arcFail: 10 },
    'studded leather': { ac: 3, maxDex: 5, checkPenalty: -1, weight: 20, type: 'light', arcFail: 15 },
    'studded leather armor': { ac: 3, maxDex: 5, checkPenalty: -1, weight: 20, type: 'light', arcFail: 15 },
    'chain shirt': { ac: 4, maxDex: 4, checkPenalty: -2, weight: 25, type: 'light', arcFail: 20 },
    'hide armor': { ac: 3, maxDex: 4, checkPenalty: -3, weight: 25, type: 'medium', arcFail: 20 },
    'scale mail': { ac: 4, maxDex: 3, checkPenalty: -4, weight: 30, type: 'medium', arcFail: 25 },
    'chainmail': { ac: 5, maxDex: 2, checkPenalty: -5, weight: 40, type: 'medium', arcFail: 30 },
    'breastplate': { ac: 5, maxDex: 3, checkPenalty: -4, weight: 30, type: 'medium', arcFail: 25 },
    'splint mail': { ac: 6, maxDex: 0, checkPenalty: -7, weight: 45, type: 'heavy', arcFail: 40 },
    'banded mail': { ac: 6, maxDex: 1, checkPenalty: -6, weight: 35, type: 'heavy', arcFail: 35 },
    'half-plate': { ac: 7, maxDex: 0, checkPenalty: -7, weight: 50, type: 'heavy', arcFail: 40 },
    'full plate': { ac: 8, maxDex: 1, checkPenalty: -6, weight: 50, type: 'heavy', arcFail: 35 },
};

export const SHIELD_DB = {
    'buckler': { ac: 1, checkPenalty: -1, weight: 5, arcFail: 5 },
    'light wooden shield': { ac: 1, checkPenalty: -1, weight: 5, arcFail: 5 },
    'light steel shield': { ac: 1, checkPenalty: -1, weight: 6, arcFail: 5 },
    'heavy wooden shield': { ac: 2, checkPenalty: -2, weight: 10, arcFail: 15 },
    'heavy steel shield': { ac: 2, checkPenalty: -2, weight: 15, arcFail: 15 },
    'tower shield': { ac: 4, checkPenalty: -10, weight: 45, arcFail: 50 },
};

/**
 * Calculate AC from equipped items for a character.
 * @param {Array} equipment - Array of equipment items from DB
 * @param {Object} character - Character object with ability scores
 * @returns {Object} { total, touch, flatFooted, armorBonus, shieldBonus, dexBonus, sizeBonus, maxDex, checkPenalty }
 */
export function calcEquippedAC(equipment, character) {
    const dexMod = character.dex ? abilityMod(parseInt(character.dex)) : 0;
    let armorBonus = 0, shieldBonus = 0, maxDex = 99, checkPenalty = 0;

    const equipped = equipment.filter(e => e.equipped);
    for (const item of equipped) {
        const name = (item.item_name || '').toLowerCase();
        const armorData = ARMOR_DB[name];
        const shieldData = SHIELD_DB[name];
        if (armorData && (item.slot === 'armor' || item.item_type === 'armor')) {
            armorBonus = Math.max(armorBonus, armorData.ac);
            maxDex = Math.min(maxDex, armorData.maxDex);
            checkPenalty += armorData.checkPenalty;
        }
        if (shieldData && (item.slot === 'off_hand' || item.item_type === 'shield')) {
            shieldBonus = Math.max(shieldBonus, shieldData.ac);
            checkPenalty += shieldData.checkPenalty;
        }
        // Handle magic enhancement bonuses
        const enhMatch = name.match(/^\+(\d)/);
        if (enhMatch) {
            const enh = parseInt(enhMatch[1]);
            const baseName = name.replace(/^\+\d\s*/, '');
            if (ARMOR_DB[baseName]) armorBonus += enh;
            if (SHIELD_DB[baseName]) shieldBonus += enh;
        }
    }

    const effectiveDex = Math.min(dexMod, maxDex);
    const sizeBonus = 0; // TODO: derive from race size
    const total = 10 + armorBonus + shieldBonus + effectiveDex + sizeBonus;
    const touch = 10 + effectiveDex + sizeBonus;
    const flatFooted = 10 + armorBonus + shieldBonus + sizeBonus;

    return { total, touch, flatFooted, armorBonus, shieldBonus, dexBonus: effectiveDex, sizeBonus, maxDex, checkPenalty };
}
