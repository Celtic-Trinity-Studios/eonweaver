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
