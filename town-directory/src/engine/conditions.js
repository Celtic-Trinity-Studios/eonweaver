/**
 * Eon Weaver — Conditions & Active Effects Engine
 * D&D 3.5e condition effects with duration tracking, stacking rules,
 * auto-modifier calculation, and buff/debuff management.
 */

/* ── Core D&D 3.5e Conditions with Mechanical Effects ───── */
export const CONDITIONS = {
    blinded: {
        name: 'Blinded', category: 'condition',
        effects: { ac: -2, attackRolls: -2, loseDexToAC: true, movementHalved: true },
        description: 'Cannot see. -2 AC, loses Dex bonus to AC. -2 on most Str/Dex skill checks.',
    },
    dazzled: {
        name: 'Dazzled', category: 'condition',
        effects: { attackRolls: -1, spotChecks: -1, searchChecks: -1 },
        description: '-1 penalty on attack rolls, Search/Spot checks.',
    },
    deafened: {
        name: 'Deafened', category: 'condition',
        effects: { initiative: -4, spellFailure: 20 },
        description: '-4 initiative. 20% arcane spell failure for verbal components.',
    },
    entangled: {
        name: 'Entangled', category: 'condition',
        effects: { attackRolls: -2, dex: -4, movementHalved: true },
        description: '-2 attack rolls, -4 Dex. Movement halved.',
    },
    exhausted: {
        name: 'Exhausted', category: 'condition',
        effects: { str: -6, dex: -6, movementHalved: true },
        description: '-6 to Str and Dex. Move at half speed. Cannot run or charge.',
    },
    fatigued: {
        name: 'Fatigued', category: 'condition',
        effects: { str: -2, dex: -2 },
        description: '-2 to Str and Dex. Cannot run or charge.',
    },
    frightened: {
        name: 'Frightened', category: 'condition',
        effects: { attackRolls: -2, savingThrows: -2, skillChecks: -2, abilityChecks: -2, flees: true },
        description: '-2 on attacks, saves, skills, ability checks. Must flee from source.',
    },
    flatFooted: {
        name: 'Flat-Footed', category: 'condition',
        effects: { loseDexToAC: true },
        description: 'Loses Dex bonus to AC. Cannot make AoO.',
    },
    grappled: {
        name: 'Grappled', category: 'condition',
        effects: { loseDexToAC: true, attackRolls: -4 },
        description: 'Loses Dex to AC vs non-grapplers. -4 attacks vs non-grapplers.',
    },
    invisible: {
        name: 'Invisible', category: 'buff',
        effects: { attackRolls: 2 },
        description: '+2 on attack rolls. Opponents flat-footed to you.',
    },
    panicked: {
        name: 'Panicked', category: 'condition',
        effects: { attackRolls: -2, savingThrows: -2, flees: true, dropsItems: true },
        description: '-2 on saves. Must flee. Drops what is held.',
    },
    paralyzed: {
        name: 'Paralyzed', category: 'condition',
        effects: { str: -999, dex: -999, helpless: true },
        description: 'Helpless. Cannot move or act. Effective Str and Dex of 0.',
    },
    prone: {
        name: 'Prone', category: 'condition',
        effects: { meleeAttackRolls: -4, acVsMelee: -4, acVsRanged: 4 },
        description: '-4 melee attacks. -4 AC vs melee. +4 AC vs ranged.',
    },
    shaken: {
        name: 'Shaken', category: 'condition',
        effects: { attackRolls: -2, savingThrows: -2, skillChecks: -2, abilityChecks: -2 },
        description: '-2 on attacks, saves, skills, ability checks.',
    },
    sickened: {
        name: 'Sickened', category: 'condition',
        effects: { attackRolls: -2, weaponDamage: -2, savingThrows: -2, skillChecks: -2, abilityChecks: -2 },
        description: '-2 on attacks, damage, saves, skills, ability checks.',
    },
    stunned: {
        name: 'Stunned', category: 'condition',
        effects: { loseDexToAC: true, ac: -2, dropsItems: true },
        description: 'Drops held items. Cannot act. -2 AC. Loses Dex to AC.',
    },
    nauseated: {
        name: 'Nauseated', category: 'condition',
        effects: { canOnlyMove: true },
        description: 'Unable to attack, cast spells, or concentrate. Can only take a single move action.',
    },
    confused: {
        name: 'Confused', category: 'condition',
        effects: {},
        description: 'Acts randomly. Roll d% each round to determine behavior.',
    },
    fascinated: {
        name: 'Fascinated', category: 'condition',
        effects: { spotChecks: -4, listenChecks: -4 },
        description: '-4 on skill checks made reactively. Stands/sits quietly, taking no actions.',
    },
    cowering: {
        name: 'Cowering', category: 'condition',
        effects: { loseDexToAC: true, ac: -2 },
        description: 'Frozen in fear. Loses Dex to AC, -2 AC.',
    },
    dazed: {
        name: 'Dazed', category: 'condition',
        effects: {},
        description: 'Unable to act. No AC penalty.',
    },
    energyDrained: {
        name: 'Energy Drained', category: 'condition',
        effects: {}, // -1 per negative level to attacks, saves, skills, abilities, effective level
        description: 'Negative levels. -1 per level on attacks, saves, skills, abilities, CL, effective level.',
    },
    petrified: {
        name: 'Petrified', category: 'condition',
        effects: { helpless: true },
        description: 'Turned to stone. Effectively unconscious.',
    },
};

/* ── Common Buff/Debuff Spells ──────────────────────────── */
export const SPELL_EFFECTS = {
    bless: {
        name: 'Bless', category: 'buff', bonusType: 'morale',
        effects: { attackRolls: 1, savingThrowsVsFear: 1 },
        description: '+1 morale bonus on attack rolls and saves vs fear.',
    },
    bane: {
        name: 'Bane', category: 'debuff', bonusType: 'morale',
        effects: { attackRolls: -1, savingThrowsVsFear: -1 },
        description: '-1 morale penalty on attack rolls and saves vs fear.',
    },
    shield_of_faith: {
        name: 'Shield of Faith', category: 'buff', bonusType: 'deflection',
        effects: { ac: 2 }, // +2 at CL 1, increases
        description: '+2 deflection bonus to AC.',
    },
    barkskin: {
        name: 'Barkskin', category: 'buff', bonusType: 'enhancement',
        effects: { naturalArmor: 2 }, // +2 at CL 3, increases
        description: '+2 enhancement bonus to natural armor.',
    },
    bulls_strength: {
        name: "Bull's Strength", category: 'buff', bonusType: 'enhancement',
        effects: { str: 4 },
        description: '+4 enhancement bonus to Strength.',
    },
    cats_grace: {
        name: "Cat's Grace", category: 'buff', bonusType: 'enhancement',
        effects: { dex: 4 },
        description: '+4 enhancement bonus to Dexterity.',
    },
    bears_endurance: {
        name: "Bear's Endurance", category: 'buff', bonusType: 'enhancement',
        effects: { con: 4 },
        description: '+4 enhancement bonus to Constitution.',
    },
    foxs_cunning: {
        name: "Fox's Cunning", category: 'buff', bonusType: 'enhancement',
        effects: { int_: 4 },
        description: '+4 enhancement bonus to Intelligence.',
    },
    owls_wisdom: {
        name: "Owl's Wisdom", category: 'buff', bonusType: 'enhancement',
        effects: { wis: 4 },
        description: '+4 enhancement bonus to Wisdom.',
    },
    eagles_splendor: {
        name: "Eagle's Splendor", category: 'buff', bonusType: 'enhancement',
        effects: { cha: 4 },
        description: '+4 enhancement bonus to Charisma.',
    },
    haste: {
        name: 'Haste', category: 'buff', bonusType: 'untyped',
        effects: { attackRolls: 1, ac: 1, refSave: 1, extraAttack: true, speed: 30 },
        description: '+1 attack, +1 AC, +1 Ref, extra attack, +30ft speed.',
    },
    slow: {
        name: 'Slow', category: 'debuff', bonusType: 'untyped',
        effects: { attackRolls: -1, ac: -1, refSave: -1, movementHalved: true },
        description: '-1 attack, -1 AC, -1 Ref, half speed, one action per round.',
    },
    prayer: {
        name: 'Prayer', category: 'buff', bonusType: 'luck',
        effects: { attackRolls: 1, weaponDamage: 1, skillChecks: 1, savingThrows: 1 },
        description: '+1 luck bonus to attacks, damage, skills, saves.',
    },
    rage: {
        name: 'Barbarian Rage', category: 'buff', bonusType: 'morale',
        effects: { str: 4, con: 4, willSave: 2, ac: -2 },
        description: '+4 Str, +4 Con, +2 Will, -2 AC. Cannot use skills requiring patience/concentration.',
    },
    greater_rage: {
        name: 'Greater Rage', category: 'buff', bonusType: 'morale',
        effects: { str: 6, con: 6, willSave: 3, ac: -2 },
        description: '+6 Str, +6 Con, +3 Will, -2 AC.',
    },
    inspire_courage_1: {
        name: 'Inspire Courage +1', category: 'buff', bonusType: 'morale',
        effects: { attackRolls: 1, weaponDamage: 1, savingThrowsVsFear: 1, savingThrowsVsCharm: 1 },
        description: '+1 morale bonus on attack/damage and saves vs charm/fear.',
    },
};

/* ── Duration Types ────────────────────────────────────── */
export const DURATION_TYPES = {
    rounds: 'Rounds',
    minutes: 'Minutes',
    hours: 'Hours',
    permanent: 'Permanent',
    concentration: 'Concentration',
    instantaneous: 'Instantaneous',
};

/* ── Bonus Type Stacking Rules ─────────────────────────── */
// Same bonus type from different sources: only the highest applies (except dodge & untyped)
const STACKING_TYPES = {
    dodge: true,      // Dodge bonuses always stack
    untyped: true,    // Untyped bonuses always stack
    circumstance: true, // Circumstance bonuses stack if from different sources
    // All other types (enhancement, morale, deflection, luck, etc.) do NOT stack
};

/**
 * Active effect on a character.
 * @typedef {Object} ActiveEffect
 * @property {string} key - Effect key (condition or spell key)
 * @property {string} name - Display name
 * @property {string} category - 'condition', 'buff', 'debuff', 'custom'
 * @property {string} bonusType - Bonus type for stacking: 'enhancement', 'morale', 'untyped', etc.
 * @property {Object} effects - Modifier map
 * @property {string} durationType - 'rounds', 'minutes', 'hours', 'permanent', 'concentration'
 * @property {number} durationRemaining - Remaining duration in the durationType unit
 * @property {string} source - What caused this effect
 * @property {number} casterLevel - Caster level of the effect (for dispelling)
 */

/**
 * Calculate total modifiers from all active effects with stacking rules.
 * @param {ActiveEffect[]} activeEffects - Array of active effects
 * @returns {Object} Merged modifiers after applying stacking rules
 */
export function calculateTotalModifiers(activeEffects) {
    // Group modifiers by stat and bonus type
    const byStatAndType = {};

    for (const effect of activeEffects) {
        const type = effect.bonusType || 'untyped';
        for (const [stat, value] of Object.entries(effect.effects || {})) {
            if (typeof value !== 'number') continue; // skip boolean flags
            if (!byStatAndType[stat]) byStatAndType[stat] = {};
            if (!byStatAndType[stat][type]) byStatAndType[stat][type] = [];
            byStatAndType[stat][type].push(value);
        }
    }

    // Apply stacking rules
    const result = {};
    for (const [stat, types] of Object.entries(byStatAndType)) {
        let total = 0;
        for (const [type, values] of Object.entries(types)) {
            if (STACKING_TYPES[type]) {
                // Stacking type: sum all values
                total += values.reduce((s, v) => s + v, 0);
            } else {
                // Non-stacking: take highest bonus and lowest penalty separately
                const bonuses = values.filter(v => v > 0);
                const penalties = values.filter(v => v < 0);
                if (bonuses.length) total += Math.max(...bonuses);
                if (penalties.length) total += Math.min(...penalties);
            }
        }
        if (total !== 0) result[stat] = total;
    }

    // Also collect boolean flags
    for (const effect of activeEffects) {
        for (const [stat, value] of Object.entries(effect.effects || {})) {
            if (typeof value === 'boolean' && value) {
                result[stat] = true;
            }
        }
    }

    return result;
}

/**
 * Advance time: decrement durations and remove expired effects.
 * @param {ActiveEffect[]} effects - Current active effects
 * @param {string} unit - 'rounds', 'minutes', 'hours'
 * @param {number} amount - Amount to advance
 * @returns {{ active: ActiveEffect[], expired: ActiveEffect[] }}
 */
export function advanceTime(effects, unit = 'rounds', amount = 1) {
    const active = [];
    const expired = [];

    for (const e of effects) {
        if (e.durationType === 'permanent' || e.durationType === 'instantaneous') {
            active.push({ ...e });
            continue;
        }
        if (e.durationType === unit) {
            const remaining = (e.durationRemaining || 0) - amount;
            if (remaining <= 0) {
                expired.push(e);
            } else {
                active.push({ ...e, durationRemaining: remaining });
            }
        } else {
            // Different unit — keep as-is
            active.push({ ...e });
        }
    }

    return { active, expired };
}

/**
 * Create an active effect from a condition or spell key.
 */
export function createEffect({ key, durationType = 'permanent', duration = 0, source = '', casterLevel = 0, customEffects = null }) {
    // Look up in conditions first, then spell effects
    const base = CONDITIONS[key] || SPELL_EFFECTS[key];
    if (!base && !customEffects) return null;

    return {
        key,
        name: base?.name || key,
        category: base?.category || 'custom',
        bonusType: base?.bonusType || 'untyped',
        effects: customEffects || { ...(base?.effects || {}) },
        description: base?.description || '',
        durationType,
        durationRemaining: duration,
        source,
        casterLevel,
        appliedAt: Date.now(),
    };
}

/**
 * Get a condition by key.
 */
export function getCondition(key) {
    return CONDITIONS[key] || null;
}

/**
 * Get all condition keys.
 */
export function getAllConditions() {
    return Object.keys(CONDITIONS);
}

/**
 * Get all spell effect keys.
 */
export function getAllSpellEffects() {
    return Object.keys(SPELL_EFFECTS);
}

/**
 * Format remaining duration for display.
 */
export function formatDuration(effect) {
    if (effect.durationType === 'permanent') return 'Permanent';
    if (effect.durationType === 'concentration') return 'Concentration';
    if (effect.durationType === 'instantaneous') return 'Instantaneous';
    const n = effect.durationRemaining || 0;
    const unit = effect.durationType || 'rounds';
    return `${n} ${unit}`;
}
