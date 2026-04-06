/**
 * Eon Weaver — D&D 3.5e Metamagic Automation Engine
 * Handles Heighten, Empower, Maximize, etc. with auto-adjusted spell slot calculations.
 */
import { FEATS } from './featData35e.js';

/* ═══════════════════════════════════════════════════════════
   METAMAGIC FEAT DEFINITIONS
   ═══════════════════════════════════════════════════════════ */

/**
 * Get all metamagic feats from the feat data.
 * @returns {Object.<string, {slotIncrease: number, benefit: string}>}
 */
export function getMetamagicFeats() {
    const result = {};
    for (const [name, feat] of Object.entries(FEATS)) {
        if (feat.category === 'metamagic') {
            result[name] = {
                slotIncrease: feat.slotIncrease || 0,
                benefit: feat.benefit || '',
                prereqs: feat.prereqs || {},
            };
        }
    }
    return result;
}

/**
 * Get metamagic feats that a character knows.
 * @param {string} featsString - Comma-separated feat list from character data
 * @returns {Array<{name: string, slotIncrease: number, benefit: string}>}
 */
export function getKnownMetamagicFeats(featsString) {
    if (!featsString) return [];
    const knownFeats = featsString.split(',').map(f => f.trim().toLowerCase());
    const allMeta = getMetamagicFeats();
    const result = [];
    for (const [name, meta] of Object.entries(allMeta)) {
        if (knownFeats.some(kf => kf === name.toLowerCase() || kf.startsWith(name.toLowerCase()))) {
            result.push({ name, ...meta });
        }
    }
    return result;
}

/* ═══════════════════════════════════════════════════════════
   METAMAGIC SPELL SLOT CALCULATIONS
   ═══════════════════════════════════════════════════════════ */

/**
 * Calculate the effective spell slot level when applying metamagic feats.
 * @param {number} baseSpellLevel - The base level of the spell (0-9)
 * @param {string[]} appliedMetamagic - Array of metamagic feat names being applied
 * @returns {{effectiveLevel: number, totalIncrease: number, breakdown: string[]}}
 */
export function calculateMetamagicSlot(baseSpellLevel, appliedMetamagic = []) {
    const allMeta = getMetamagicFeats();
    let totalIncrease = 0;
    const breakdown = [];

    for (const metaName of appliedMetamagic) {
        const meta = allMeta[metaName];
        if (!meta) continue;

        // Heighten Spell is special — it doesn't have a fixed increase
        if (metaName === 'Heighten Spell') {
            // Heighten is handled separately — it sets the effective level directly
            breakdown.push(`${metaName}: variable (set manually)`);
            continue;
        }

        totalIncrease += meta.slotIncrease;
        breakdown.push(`${metaName}: +${meta.slotIncrease} slot level`);
    }

    const effectiveLevel = Math.min(9, baseSpellLevel + totalIncrease);

    return {
        effectiveLevel,
        totalIncrease,
        breakdown,
        isValid: effectiveLevel <= 9,
    };
}

/**
 * Calculate the effective slot for a Heightened spell.
 * Heighten Spell raises the effective level to any level the caster can cast.
 * @param {number} baseSpellLevel - Original spell level
 * @param {number} targetLevel - Desired effective spell level
 * @param {number} maxCastableLevel - Highest spell level the caster can cast
 * @returns {{effectiveLevel: number, isValid: boolean, dcBonus: number}}
 */
export function calculateHeightenedSlot(baseSpellLevel, targetLevel, maxCastableLevel = 9) {
    const isValid = targetLevel >= baseSpellLevel && targetLevel <= maxCastableLevel;
    return {
        effectiveLevel: isValid ? targetLevel : baseSpellLevel,
        isValid,
        dcBonus: isValid ? (targetLevel - baseSpellLevel) : 0,
    };
}

/**
 * Get available metamagic combinations for a spell, given the caster's max spell level.
 * Filters out combinations that would exceed the caster's maximum spell slot.
 * @param {number} baseSpellLevel - The spell's base level
 * @param {number} maxSlotLevel - The caster's highest available spell slot level
 * @param {Array} knownMetamagic - Metamagic feats the caster knows
 * @returns {Array<{feats: string[], effectiveLevel: number, breakdown: string[]}>}
 */
export function getValidMetamagicCombinations(baseSpellLevel, maxSlotLevel, knownMetamagic) {
    if (!knownMetamagic || knownMetamagic.length === 0) return [];

    const combinations = [];

    // Single metamagic applications
    for (const meta of knownMetamagic) {
        if (meta.name === 'Heighten Spell') {
            // Generate heighten options for each valid target level
            for (let targetLvl = baseSpellLevel + 1; targetLvl <= maxSlotLevel; targetLvl++) {
                combinations.push({
                    feats: [`Heighten Spell (to ${targetLvl})`],
                    effectiveLevel: targetLvl,
                    breakdown: [`Heighten Spell: raised to level ${targetLvl} (+${targetLvl - baseSpellLevel} DC)`],
                });
            }
            continue;
        }

        const effectiveLevel = baseSpellLevel + meta.slotIncrease;
        if (effectiveLevel <= maxSlotLevel) {
            combinations.push({
                feats: [meta.name],
                effectiveLevel,
                breakdown: [`${meta.name}: +${meta.slotIncrease} (uses level ${effectiveLevel} slot)`],
            });
        }
    }

    // Double metamagic combinations (non-Heighten only)
    const nonHeighten = knownMetamagic.filter(m => m.name !== 'Heighten Spell');
    for (let i = 0; i < nonHeighten.length; i++) {
        for (let j = i + 1; j < nonHeighten.length; j++) {
            const totalIncrease = nonHeighten[i].slotIncrease + nonHeighten[j].slotIncrease;
            const effectiveLevel = baseSpellLevel + totalIncrease;
            if (effectiveLevel <= maxSlotLevel) {
                combinations.push({
                    feats: [nonHeighten[i].name, nonHeighten[j].name],
                    effectiveLevel,
                    breakdown: [
                        `${nonHeighten[i].name}: +${nonHeighten[i].slotIncrease}`,
                        `${nonHeighten[j].name}: +${nonHeighten[j].slotIncrease}`,
                        `Total: uses level ${effectiveLevel} slot`,
                    ],
                });
            }
        }
    }

    return combinations.sort((a, b) => a.effectiveLevel - b.effectiveLevel);
}

/* ═══════════════════════════════════════════════════════════
   METAMAGIC EFFECT RESOLUTION
   ═══════════════════════════════════════════════════════════ */

/**
 * Apply metamagic effects to spell damage/healing.
 * @param {string} baseDamage - e.g. "5d6" or "3d8+5"
 * @param {string[]} appliedMetamagic - Metamagic feat names
 * @returns {{damage: string, notes: string[]}}
 */
export function applyMetamagicEffects(baseDamage, appliedMetamagic = []) {
    const notes = [];
    let damage = baseDamage;

    // Parse base damage
    const diceMatch = baseDamage.match(/(\d+)d(\d+)([+-]\d+)?/);
    if (!diceMatch) return { damage, notes: ['Could not parse damage dice'] };

    const numDice = parseInt(diceMatch[1]);
    const dieSize = parseInt(diceMatch[2]);
    const bonus = parseInt(diceMatch[3] || '0');

    for (const metaName of appliedMetamagic) {
        switch (metaName) {
            case 'Empower Spell':
                // All variable numeric effects increased by 50%
                notes.push('Empower: All variable effects ×1.5 (round down)');
                damage = `${baseDamage} ×1.5`;
                break;

            case 'Maximize Spell':
                // All variable numeric values are maximized
                {
                    const maxDmg = (numDice * dieSize) + bonus;
                    damage = `${maxDmg}`;
                    notes.push(`Maximize: ${numDice}d${dieSize}${bonus ? (bonus > 0 ? '+' + bonus : bonus) : ''} → ${maxDmg}`);
                }
                break;

            case 'Quicken Spell':
                notes.push('Quicken: Cast as swift action (1/round)');
                break;

            case 'Silent Spell':
                notes.push('Silent: No verbal component required');
                break;

            case 'Still Spell':
                notes.push('Still: No somatic component required');
                break;

            case 'Widen Spell':
                notes.push('Widen: Area of effect doubled');
                break;

            case 'Extend Spell':
                notes.push('Extend: Duration doubled');
                break;

            case 'Enlarge Spell':
                notes.push('Enlarge: Range doubled');
                break;
        }
    }

    // Empower + Maximize combined = maximize then add 50%
    if (appliedMetamagic.includes('Empower Spell') && appliedMetamagic.includes('Maximize Spell')) {
        const maxDmg = (numDice * dieSize) + bonus;
        const empowered = Math.floor(maxDmg * 1.5);
        damage = `${empowered}`;
        // Replace individual notes with combined
        const filtered = notes.filter(n => !n.startsWith('Empower:') && !n.startsWith('Maximize:'));
        filtered.push(`Maximize+Empower: ${numDice}d${dieSize}${bonus ? (bonus > 0 ? '+' + bonus : bonus) : ''} → ${maxDmg} → ×1.5 = ${empowered}`);
        return { damage, notes: filtered };
    }

    return { damage, notes };
}
