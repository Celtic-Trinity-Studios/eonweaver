/**
 * Eon Weaver — D&D 3.5e Spellcasting Engine
 * Pure calculation logic for spell slots, bonus spells, DCs, and caster types.
 */

/* ═══════════════════════════════════════════════════════════
   CASTER DEFINITIONS
   ═══════════════════════════════════════════════════════════ */

export const CASTER_INFO = {
    Wizard: { type: 'prepared', source: 'arcane', ability: 'INT', abilKey: 'int_', maxSpellLevel: 9, startsAt: 1, useSpellbook: true },
    Sorcerer: { type: 'spontaneous', source: 'arcane', ability: 'CHA', abilKey: 'cha', maxSpellLevel: 9, startsAt: 1 },
    Cleric: { type: 'prepared', source: 'divine', ability: 'WIS', abilKey: 'wis', maxSpellLevel: 9, startsAt: 1, hasDomains: true },
    Druid: { type: 'prepared', source: 'divine', ability: 'WIS', abilKey: 'wis', maxSpellLevel: 9, startsAt: 1 },
    Bard: { type: 'spontaneous', source: 'arcane', ability: 'CHA', abilKey: 'cha', maxSpellLevel: 6, startsAt: 1 },
    Paladin: { type: 'prepared', source: 'divine', ability: 'WIS', abilKey: 'wis', maxSpellLevel: 4, startsAt: 4 },
    Ranger: { type: 'prepared', source: 'divine', ability: 'WIS', abilKey: 'wis', maxSpellLevel: 4, startsAt: 4 },
    Adept: { type: 'prepared', source: 'divine', ability: 'WIS', abilKey: 'wis', maxSpellLevel: 5, startsAt: 1 },
};

/**
 * Get caster info for a class name.
 * Returns null if the class is not a caster.
 */
export function getCasterInfo(className) {
    if (!className) return null;
    const key = Object.keys(CASTER_INFO).find(
        k => className.toLowerCase().includes(k.toLowerCase())
    );
    return key ? { ...CASTER_INFO[key], className: key } : null;
}

/* ═══════════════════════════════════════════════════════════
   SPELL SLOTS FROM CLASS PROGRESSION
   ═══════════════════════════════════════════════════════════ */

/**
 * Parse class_progression row's slots_0..slots_9 into an array of base slots.
 * Returns array of length 10: [cantrips, 1st, 2nd, ..., 9th]
 * A value of null means "cannot cast this level", 0 means "0 base but may get bonus spells"
 */
export function parseProgressionSlots(progressionRow) {
    const slots = [];
    for (let i = 0; i <= 9; i++) {
        const val = progressionRow?.[`slots_${i}`];
        if (val === null || val === undefined || val === '' || val === '—' || val === '-') {
            slots.push(null);
        } else {
            slots.push(parseInt(val) || 0);
        }
    }
    return slots;
}

/* ═══════════════════════════════════════════════════════════
   BONUS SPELLS (from ability score)
   ═══════════════════════════════════════════════════════════ */

/**
 * Calculate bonus spells per day from ability modifier.
 * D&D 3.5e PHB Table 1-1:
 *   Bonus spells for level L = 1 + floor((mod - L) / 4) if mod >= L
 *   No bonus spells for cantrips (level 0)
 */
export function bonusSpells(abilityMod, spellLevel) {
    if (spellLevel <= 0) return 0; // No bonus cantrips
    if (abilityMod < spellLevel) return 0; // Not high enough
    return 1 + Math.floor((abilityMod - spellLevel) / 4);
}

/**
 * Get the maximum spell level a caster can cast based on ability score.
 * Must have ability score >= 10 + spell level.
 */
export function maxCastableLevel(abilityScore) {
    if (!abilityScore || abilityScore < 10) return -1;
    return abilityScore - 10;
}

/* ═══════════════════════════════════════════════════════════
   FULL SPELL SLOT CALCULATION
   ═══════════════════════════════════════════════════════════ */

/**
 * Calculate complete spells-per-day for a character.
 * @param {object} progressionRow - Row from class_progression table for this class/level
 * @param {number} abilityScore - The caster's key ability score (e.g., INT for Wizard)
 * @param {object} casterInfo - From getCasterInfo()
 * @returns {Array<{level, base, bonus, total, dc, available}>} spell slot info per level
 */
export function calculateSpellSlots(progressionRow, abilityScore, casterInfo) {
    const baseSlots = parseProgressionSlots(progressionRow);
    const abilMod = Math.floor(((abilityScore || 10) - 10) / 2);
    const maxLevel = maxCastableLevel(abilityScore);
    const results = [];

    for (let lvl = 0; lvl <= (casterInfo?.maxSpellLevel || 9); lvl++) {
        const base = baseSlots[lvl];
        if (base === null) {
            // Can't cast this level at all at current class level
            results.push({ level: lvl, base: null, bonus: 0, total: 0, dc: 0, available: false });
            continue;
        }

        const canCast = lvl === 0 || lvl <= maxLevel;
        const bonus = canCast ? bonusSpells(abilMod, lvl) : 0;
        const total = canCast ? base + bonus : 0;
        const dc = canCast ? 10 + lvl + abilMod : 0;

        results.push({
            level: lvl,
            base,
            bonus,
            total,
            dc,
            available: canCast && total > 0,
        });
    }

    return results;
}

/* ═══════════════════════════════════════════════════════════
   SPELLS KNOWN TABLE (for Spontaneous casters)
   D&D 3.5e PHB Tables 3-4 (Bard) and 3-17 (Sorcerer)
   ═══════════════════════════════════════════════════════════ */

// Sorcerer Spells Known: [level] = [0th, 1st, 2nd, ..., 9th]
const SORCERER_KNOWN = {
    1: [4, 2],
    2: [5, 2],
    3: [5, 3],
    4: [6, 3, 1],
    5: [6, 4, 2],
    6: [7, 4, 2, 1],
    7: [7, 5, 3, 2],
    8: [8, 5, 3, 2, 1],
    9: [8, 5, 4, 3, 2],
    10: [9, 5, 4, 3, 2, 1],
    11: [9, 5, 5, 4, 3, 2],
    12: [9, 5, 5, 4, 3, 2, 1],
    13: [9, 5, 5, 4, 4, 3, 2],
    14: [9, 5, 5, 4, 4, 3, 2, 1],
    15: [9, 5, 5, 4, 4, 4, 3, 2],
    16: [9, 5, 5, 4, 4, 4, 3, 2, 1],
    17: [9, 5, 5, 4, 4, 4, 3, 3, 2],
    18: [9, 5, 5, 4, 4, 4, 3, 3, 2, 1],
    19: [9, 5, 5, 4, 4, 4, 3, 3, 3, 2],
    20: [9, 5, 5, 4, 4, 4, 3, 3, 3, 3],
};

// Bard Spells Known
const BARD_KNOWN = {
    1: [4],
    2: [5, 2],
    3: [6, 3],
    4: [6, 3, 2],
    5: [6, 4, 3],
    6: [6, 4, 3],
    7: [6, 4, 4, 2],
    8: [6, 4, 4, 3],
    9: [6, 4, 4, 3],
    10: [6, 4, 4, 4, 2],
    11: [6, 4, 4, 4, 3],
    12: [6, 4, 4, 4, 3],
    13: [6, 4, 4, 4, 4, 2],
    14: [6, 4, 4, 4, 4, 3],
    15: [6, 4, 4, 4, 4, 3],
    16: [6, 5, 4, 4, 4, 4, 2],
    17: [6, 5, 5, 4, 4, 4, 3],
    18: [6, 5, 5, 5, 4, 4, 3],
    19: [6, 5, 5, 5, 5, 4, 4],
    20: [6, 5, 5, 5, 5, 5, 4],
};

/**
 * Get the max number of spells a spontaneous caster can know at each level.
 * Returns array where index = spell level, value = max spells known (or null if can't learn that level)
 */
export function getSpellsKnownLimits(className, classLevel) {
    const lvl = Math.min(20, Math.max(1, classLevel || 1));
    let table;
    if (className?.toLowerCase().includes('sorcerer')) table = SORCERER_KNOWN;
    else if (className?.toLowerCase().includes('bard')) table = BARD_KNOWN;
    else return null; // Not a spontaneous caster

    const row = table[lvl] || [];
    const result = [];
    for (let i = 0; i <= 9; i++) {
        result.push(row[i] !== undefined ? row[i] : null);
    }
    return result;
}

/* ═══════════════════════════════════════════════════════════
   SRD SPELL LEVEL PARSER
   Parses "Brd 1, Sor/Wiz 2, Clr 3" into { Bard: 1, Sorcerer: 2, Wizard: 2, Cleric: 3 }
   ═══════════════════════════════════════════════════════════ */

const CLASS_ABBREV_MAP = {
    'Brd': 'Bard', 'Sor': 'Sorcerer', 'Wiz': 'Wizard', 'Clr': 'Cleric',
    'Drd': 'Druid', 'Pal': 'Paladin', 'Rgr': 'Ranger', 'Adp': 'Adept',
    // Full names also work
    'Bard': 'Bard', 'Sorcerer': 'Sorcerer', 'Wizard': 'Wizard', 'Cleric': 'Cleric',
    'Druid': 'Druid', 'Paladin': 'Paladin', 'Ranger': 'Ranger', 'Adept': 'Adept',
};

/**
 * Parse SRD spell level string into a map of className -> spellLevel.
 * e.g. "Brd 1, Sor/Wiz 2, Clr 3" => { Bard: 1, Sorcerer: 2, Wizard: 2, Cleric: 3 }
 */
export function parseSpellLevels(levelStr) {
    if (!levelStr) return {};
    const result = {};
    // Split by comma, each part like "Sor/Wiz 2" or "Clr 3"
    for (const part of levelStr.split(',').map(s => s.trim())) {
        const m = part.match(/^(.+?)\s+(\d+)$/);
        if (!m) continue;
        const classes = m[1].split('/').map(s => s.trim());
        const level = parseInt(m[2]);
        for (const cls of classes) {
            const fullName = CLASS_ABBREV_MAP[cls] || cls;
            result[fullName] = level;
        }
    }
    return result;
}

/**
 * Check if a spell is available to a specific class and at what level.
 * Returns the spell level for that class, or null if not available.
 */
export function spellLevelForClass(spellLevelStr, className) {
    const levels = parseSpellLevels(spellLevelStr);
    // Check direct match and common variants
    if (levels[className] !== undefined) return levels[className];
    // Try partial match (e.g., "Wizard" matches "Sor/Wiz")
    for (const [cls, lvl] of Object.entries(levels)) {
        if (cls.toLowerCase().includes(className.toLowerCase()) ||
            className.toLowerCase().includes(cls.toLowerCase())) {
            return lvl;
        }
    }
    return null;
}
