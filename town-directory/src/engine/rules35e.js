/**
 * Eon Weaver — D&D 3.5e Rules Engine
 * Core calculation logic extracted from app.js.
 */

/* ── Class Abbreviation Map ─────────────────────────────── */
export const CLASS_MAP = {
    'ftr': 'Fighter', 'rog': 'Rogue', 'clr': 'Cleric', 'wiz': 'Wizard',
    'pal': 'Paladin', 'rgr': 'Ranger', 'bbn': 'Barbarian', 'brd': 'Bard',
    'drd': 'Druid', 'mnk': 'Monk', 'sor': 'Sorcerer', 'com': 'Commoner',
    'exp': 'Expert', 'war': 'Warrior', 'ari': 'Aristocrat', 'adp': 'Adept',
    'con': 'Conjurer', 'div': 'Diviner', 'evo': 'Evoker', 'abj': 'Abjurer',
    'tra': 'Transmuter', 'art': 'Artificer', 'hex': 'Hexblade',
    'duskblade': 'Duskblade', 'swashbuckler': 'Swashbuckler',
};

/**
 * Parse "Ftr3" or "Fighter 3" into { name, level }.
 */
export function parseClass(cls) {
    if (!cls) return { name: '', level: 0 };
    const m = cls.match(/^([A-Za-z]+)\s*(\d+)$/);
    if (!m) return { name: cls, level: 0 };
    const abbr = m[1].toLowerCase();
    const level = parseInt(m[2]) || 0;
    const name = CLASS_MAP[abbr] || m[1];
    return { name, level };
}

/* ── BAB Calculations ───────────────────────────────────── */
const FULL_BAB = ['fighter', 'barbarian', 'paladin', 'ranger', 'warrior'];
const THREE_QUARTER_BAB = ['cleric', 'druid', 'monk', 'rogue', 'bard', 'expert', 'aristocrat', 'adept'];
// Everything else is 1/2 BAB

export function calcBAB(className, level) {
    const name = (className || '').toLowerCase();
    if (FULL_BAB.includes(name)) return level;
    if (THREE_QUARTER_BAB.includes(name)) return Math.floor(level * 0.75);
    return Math.floor(level * 0.5);
}

/**
 * Calculate iterative attack bonuses from BAB.
 * e.g. BAB +6 → [+6, +1]
 */
export function calcAttackBonuses(bab, atkMod = 0) {
    const attacks = [];
    let current = bab + atkMod;
    while (current > 0 || attacks.length === 0) {
        attacks.push(current);
        current -= 5;
        if (current <= 0 && attacks.length > 1) break;
        if (attacks.length >= 4) break; // max 4 iteratives
    }
    return attacks;
}

/* ── Save Calculations ──────────────────────────────────── */
export function calcBaseSave(level, isGood) {
    if (isGood) return 2 + Math.floor(level / 2);
    return Math.floor(level / 3);
}

/* ── Skill Ranks ────────────────────────────────────────── */
export function maxSkillRanks(level, isClassSkill) {
    const max = level + 3;
    return isClassSkill ? max : Math.floor(max / 2);
}

/* ── XP Thresholds (3.5e) ───────────────────────────────── */
export function xpForLevel(level) {
    // D&D 3.5e: Level N requires N*(N-1)*500 XP
    return level * (level - 1) * 500;
}

export function levelFromXP(xp) {
    // Find highest level whose threshold is <= xp
    let lvl = 1;
    while (xpForLevel(lvl + 1) <= xp) lvl++;
    return lvl;
}

/* ── Ability Modifier ───────────────────────────────────── */
export function abilityMod(score) {
    return Math.floor((score - 10) / 2);
}

/* ── Size Modifiers ─────────────────────────────────────── */
export const SIZE_MODS = {
    Fine: 8, Diminutive: 4, Tiny: 2, Small: 1,
    Medium: 0, Large: -1, Huge: -2, Gargantuan: -4, Colossal: -8,
};

export function sizeModAC(size) {
    return SIZE_MODS[size] || 0;
}

export function sizeModGrapple(size) {
    return -(SIZE_MODS[size] || 0) * (size === 'Fine' || size === 'Diminutive' ? 2 : 1);
    // Actually grapple uses a different scale, but this is a simplification
}

/* ── Multiclass Helpers ────────────────────────────────── */

/**
 * Calculate total BAB for a multiclass character.
 * Each class contributes its own BAB based on its own level.
 * @param {Array<{name: string, level: number}>} classes - Parsed class entries
 * @returns {number} Total BAB
 */
export function calcMulticlassBAB(classes) {
    let total = 0;
    for (const c of classes) {
        total += calcBAB(c.name, c.level);
    }
    return total;
}

/**
 * Calculate total saves for a multiclass character.
 * Each class contributes its own base saves.
 * @param {Array<{name: string, level: number}>} classes - Parsed class entries
 * @returns {{fort: number, ref: number, will: number}}
 */
const CLASS_GOOD_SAVES = {
    fighter: ['fort'], barbarian: ['fort'], paladin: ['fort'],
    ranger: ['fort', 'ref'], monk: ['fort', 'ref', 'will'],
    rogue: ['ref'], bard: ['ref', 'will'],
    cleric: ['fort', 'will'], druid: ['fort', 'will'],
    wizard: ['will'], sorcerer: ['will'],
    commoner: [], expert: [], warrior: ['fort'],
    adept: ['will'], aristocrat: ['will'],
};

export function calcMulticlassSaves(classes) {
    const saves = { fort: 0, ref: 0, will: 0 };
    for (const c of classes) {
        const good = CLASS_GOOD_SAVES[c.name.toLowerCase()] || [];
        saves.fort += calcBaseSave(c.level, good.includes('fort'));
        saves.ref += calcBaseSave(c.level, good.includes('ref'));
        saves.will += calcBaseSave(c.level, good.includes('will'));
    }
    return saves;
}

/**
 * Check if a multiclass character suffers an XP penalty (3.5e rules).
 * A character with two or more classes that differ by more than 1 level
 * (excluding their favored class) gets a -20% XP penalty per offending pair.
 * @param {Array<{name: string, level: number}>} classes
 * @param {string} race - Character race (determines favored class)
 * @returns {{hasPenalty: boolean, penaltyPercent: number, details: string}}
 */
const RACE_FAVORED_CLASS = {
    'Human': 'any', 'Half-Elf': 'any',
    'Dwarf': 'Fighter', 'Elf': 'Wizard', 'Gnome': 'Bard',
    'Halfling': 'Rogue', 'Half-Orc': 'Barbarian',
};

export function checkMulticlassXPPenalty(classes, race) {
    if (classes.length < 2) return { hasPenalty: false, penaltyPercent: 0, details: '' };
    const favored = RACE_FAVORED_CLASS[race] || 'any';

    // Filter out the favored class (highest level class for "any")
    let filtered = [...classes];
    if (favored === 'any') {
        // Humans/Half-Elves: highest-level class is favored
        const maxLvl = Math.max(...filtered.map(c => c.level));
        const favIdx = filtered.findIndex(c => c.level === maxLvl);
        if (favIdx >= 0) filtered.splice(favIdx, 1);
    } else {
        const favIdx = filtered.findIndex(c => c.name === favored);
        if (favIdx >= 0) filtered.splice(favIdx, 1);
    }

    if (filtered.length < 2) return { hasPenalty: false, penaltyPercent: 0, details: '' };

    // Check if any two remaining classes differ by more than 1
    let penalty = 0;
    const levels = filtered.map(c => c.level);
    const max = Math.max(...levels);
    const min = Math.min(...levels);
    if (max - min > 1) {
        penalty = 20;
    }
    return {
        hasPenalty: penalty > 0,
        penaltyPercent: penalty,
        details: penalty > 0
            ? `${filtered.map(c => `${c.name} ${c.level}`).join(', ')} differ by more than 1 level → -${penalty}% XP`
            : '',
    };
}
