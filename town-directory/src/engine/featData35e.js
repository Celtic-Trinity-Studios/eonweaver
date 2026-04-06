/**
 * Eon Weaver — D&D 3.5e Feat Data
 * All SRD feats with prerequisites and categories.
 * Used by: Level-Up Wizard (feat picker), Character Sheet (feat validation), AI Level-Up (context).
 */

/**
 * Feat categories:
 * - general: Available to any character meeting prerequisites
 * - fighter: Selectable as fighter bonus feats
 * - metamagic: Modify spells, selectable as wizard bonus feats
 * - item_creation: Create magic items, selectable as wizard bonus feats
 */

export const FEATS = {
    // ── General Feats ─────────────────────────────────────
    'Acrobatic': {
        category: 'general', prereqs: {},
        benefit: '+2 bonus on Jump and Tumble checks.',
    },
    'Agile': {
        category: 'general', prereqs: {},
        benefit: '+2 bonus on Balance and Escape Artist checks.',
    },
    'Alertness': {
        category: 'general', prereqs: {},
        benefit: '+2 bonus on Listen and Spot checks.',
    },
    'Animal Affinity': {
        category: 'general', prereqs: {},
        benefit: '+2 bonus on Handle Animal and Ride checks.',
    },
    'Armor Proficiency (Light)': {
        category: 'general', prereqs: {},
        benefit: 'No armor check penalty on attacks while wearing light armor.',
    },
    'Armor Proficiency (Medium)': {
        category: 'general', prereqs: { feats: ['Armor Proficiency (Light)'] },
        benefit: 'No armor check penalty on attacks while wearing medium armor.',
    },
    'Armor Proficiency (Heavy)': {
        category: 'general', prereqs: { feats: ['Armor Proficiency (Medium)'] },
        benefit: 'No armor check penalty on attacks while wearing heavy armor.',
    },
    'Athletic': {
        category: 'general', prereqs: {},
        benefit: '+2 bonus on Climb and Swim checks.',
    },
    'Augment Summoning': {
        category: 'general', prereqs: { feats: ['Spell Focus (Conjuration)'] },
        benefit: 'Summoned creatures gain +4 Str and +4 Con.',
    },
    'Blind-Fight': {
        category: 'fighter', prereqs: {},
        benefit: 'In melee, every time you miss because of concealment, you can reroll.',
    },
    'Combat Casting': {
        category: 'general', prereqs: {},
        benefit: '+4 bonus on Concentration checks made to cast defensively.',
    },
    'Combat Expertise': {
        category: 'fighter', prereqs: { int: 13 },
        benefit: 'Trade attack bonus for AC bonus (up to -5/+5).',
    },
    'Combat Reflexes': {
        category: 'fighter', prereqs: {},
        benefit: 'Make additional attacks of opportunity equal to Dex modifier.',
    },
    'Cleave': {
        category: 'fighter', prereqs: { str: 13, feats: ['Power Attack'] },
        benefit: 'Extra melee attack after dropping a foe.',
    },
    'Deceitful': {
        category: 'general', prereqs: {},
        benefit: '+2 bonus on Disguise and Forgery checks.',
    },
    'Deflect Arrows': {
        category: 'fighter', prereqs: { dex: 13, feats: ['Improved Unarmed Strike'] },
        benefit: 'Deflect one ranged attack per round.',
    },
    'Deft Hands': {
        category: 'general', prereqs: {},
        benefit: '+2 bonus on Sleight of Hand and Use Rope checks.',
    },
    'Diligent': {
        category: 'general', prereqs: {},
        benefit: '+2 bonus on Appraise and Decipher Script checks.',
    },
    'Dodge': {
        category: 'fighter', prereqs: { dex: 13 },
        benefit: '+1 dodge bonus to AC against a selected target.',
    },
    'Endurance': {
        category: 'general', prereqs: {},
        benefit: '+4 bonus on checks or saves involving endurance.',
    },
    'Eschew Materials': {
        category: 'general', prereqs: {},
        benefit: 'Cast spells without material components costing 1 gp or less.',
    },
    'Extra Turning': {
        category: 'general', prereqs: { classFeatures: ['Turn/Rebuke Undead'] },
        benefit: '+4 extra turning attempts per day.',
    },
    'Far Shot': {
        category: 'fighter', prereqs: { feats: ['Point Blank Shot'] },
        benefit: 'Range increment is ×1.5 (or ×2 for thrown weapons).',
    },
    'Great Cleave': {
        category: 'fighter', prereqs: { str: 13, bab: 4, feats: ['Power Attack', 'Cleave'] },
        benefit: 'No limit on cleave attacks per round.',
    },
    'Great Fortitude': {
        category: 'general', prereqs: {},
        benefit: '+2 bonus on Fortitude saves.',
    },
    'Greater Spell Focus': {
        category: 'general', prereqs: { feats: ['Spell Focus'] },
        benefit: '+1 to DC of spells from selected school (stacks with Spell Focus).',
    },
    'Greater Spell Penetration': {
        category: 'general', prereqs: { feats: ['Spell Penetration'] },
        benefit: '+2 bonus on caster level checks to overcome SR (stacks).',
    },
    'Greater Two-Weapon Fighting': {
        category: 'fighter', prereqs: { dex: 19, bab: 11, feats: ['Two-Weapon Fighting', 'Improved Two-Weapon Fighting'] },
        benefit: 'Third off-hand attack at -10 penalty.',
    },
    'Greater Weapon Focus': {
        category: 'fighter', prereqs: { bab: 8, feats: ['Weapon Focus'], classFeatures: ['Fighter 8'] },
        benefit: '+1 bonus on attack rolls (stacks with Weapon Focus).',
    },
    'Greater Weapon Specialization': {
        category: 'fighter', prereqs: { bab: 12, feats: ['Weapon Focus', 'Weapon Specialization', 'Greater Weapon Focus'], classFeatures: ['Fighter 12'] },
        benefit: '+2 bonus on damage rolls (stacks).',
    },
    'Improved Bull Rush': {
        category: 'fighter', prereqs: { str: 13, feats: ['Power Attack'] },
        benefit: '+4 bonus on bull rush attempts, no AoO.',
    },
    'Improved Counterspell': {
        category: 'general', prereqs: {},
        benefit: 'Counter with a spell of the same school, one level higher.',
    },
    'Improved Critical': {
        category: 'fighter', prereqs: { bab: 8 },
        benefit: 'Double the threat range of selected weapon.',
    },
    'Improved Disarm': {
        category: 'fighter', prereqs: { int: 13, feats: ['Combat Expertise'] },
        benefit: '+4 bonus on disarm attempts, no AoO.',
    },
    'Improved Feint': {
        category: 'fighter', prereqs: { int: 13, feats: ['Combat Expertise'] },
        benefit: 'Feint in combat as a move action.',
    },
    'Improved Grapple': {
        category: 'fighter', prereqs: { dex: 13, feats: ['Improved Unarmed Strike'] },
        benefit: '+4 bonus on grapple checks, no AoO.',
    },
    'Improved Initiative': {
        category: 'fighter', prereqs: {},
        benefit: '+4 bonus on initiative checks.',
    },
    'Improved Overrun': {
        category: 'fighter', prereqs: { str: 13, feats: ['Power Attack'] },
        benefit: '+4 bonus on overrun attempt, no AoO. Target can\'t avoid.',
    },
    'Improved Precise Shot': {
        category: 'fighter', prereqs: { dex: 19, bab: 11, feats: ['Point Blank Shot', 'Precise Shot'] },
        benefit: 'No penalty for shooting into melee, ignore less than total cover/concealment.',
    },
    'Improved Shield Bash': {
        category: 'fighter', prereqs: { feats: ['Shield Proficiency'] },
        benefit: 'Keep shield bonus to AC when shield bashing.',
    },
    'Improved Sunder': {
        category: 'fighter', prereqs: { str: 13, feats: ['Power Attack'] },
        benefit: '+4 bonus on sunder attempts, no AoO.',
    },
    'Improved Trip': {
        category: 'fighter', prereqs: { int: 13, feats: ['Combat Expertise'] },
        benefit: '+4 bonus on trip attempts, no AoO. Free attack on success.',
    },
    'Improved Turning': {
        category: 'general', prereqs: { classFeatures: ['Turn/Rebuke Undead'] },
        benefit: '+1 to turning damage roll.',
    },
    'Improved Two-Weapon Fighting': {
        category: 'fighter', prereqs: { dex: 17, bab: 6, feats: ['Two-Weapon Fighting'] },
        benefit: 'Second off-hand attack at -5 penalty.',
    },
    'Improved Unarmed Strike': {
        category: 'fighter', prereqs: {},
        benefit: 'Considered armed when unarmed. Deal lethal or nonlethal damage.',
    },
    'Investigator': {
        category: 'general', prereqs: {},
        benefit: '+2 bonus on Gather Information and Search checks.',
    },
    'Iron Will': {
        category: 'general', prereqs: {},
        benefit: '+2 bonus on Will saves.',
    },
    'Leadership': {
        category: 'general', prereqs: { characterLevel: 6 },
        benefit: 'Attract a cohort and followers.',
    },
    'Lightning Reflexes': {
        category: 'general', prereqs: {},
        benefit: '+2 bonus on Reflex saves.',
    },
    'Magical Aptitude': {
        category: 'general', prereqs: {},
        benefit: '+2 bonus on Spellcraft and Use Magic Device checks.',
    },
    'Manyshot': {
        category: 'fighter', prereqs: { dex: 17, bab: 6, feats: ['Point Blank Shot', 'Rapid Shot'] },
        benefit: 'Fire two or more arrows as a standard action.',
    },
    'Martial Weapon Proficiency': {
        category: 'general', prereqs: {},
        benefit: 'No penalty on attack rolls with selected martial weapon.',
    },
    'Maximize Spell': {
        category: 'metamagic', prereqs: {},
        benefit: 'All variable numeric effects maximized. Uses +3 spell slot.',
        slotIncrease: 3,
    },
    'Mobility': {
        category: 'fighter', prereqs: { dex: 13, feats: ['Dodge'] },
        benefit: '+4 dodge bonus to AC against AoO from movement.',
    },
    'Mounted Archery': {
        category: 'fighter', prereqs: { feats: ['Mounted Combat'] },
        benefit: 'Halve penalties for ranged attacks while mounted.',
    },
    'Mounted Combat': {
        category: 'fighter', prereqs: { ranks: { ride: 1 } },
        benefit: 'Negate hits on your mount with Ride check.',
    },
    'Natural Spell': {
        category: 'general', prereqs: { wis: 13, classFeatures: ['Wild Shape'] },
        benefit: 'Cast spells while in wild shape.',
    },
    'Negotiator': {
        category: 'general', prereqs: {},
        benefit: '+2 bonus on Diplomacy and Sense Motive checks.',
    },
    'Nimble Fingers': {
        category: 'general', prereqs: {},
        benefit: '+2 bonus on Disable Device and Open Lock checks.',
    },
    'Persuasive': {
        category: 'general', prereqs: {},
        benefit: '+2 bonus on Bluff and Intimidate checks.',
    },
    'Point Blank Shot': {
        category: 'fighter', prereqs: {},
        benefit: '+1 bonus on ranged attack and damage within 30 feet.',
    },
    'Power Attack': {
        category: 'fighter', prereqs: { str: 13 },
        benefit: 'Trade attack bonus for damage (up to BAB).',
    },
    'Precise Shot': {
        category: 'fighter', prereqs: { feats: ['Point Blank Shot'] },
        benefit: 'No penalty for shooting into melee.',
    },
    'Quick Draw': {
        category: 'fighter', prereqs: { bab: 1 },
        benefit: 'Draw a weapon as a free action.',
    },
    'Rapid Reload': {
        category: 'fighter', prereqs: {},
        benefit: 'Reload a crossbow more quickly.',
    },
    'Rapid Shot': {
        category: 'fighter', prereqs: { dex: 13, feats: ['Point Blank Shot'] },
        benefit: 'Extra ranged attack at -2 penalty to all attacks.',
    },
    'Run': {
        category: 'general', prereqs: {},
        benefit: 'Run at ×5 speed, +4 Jump after running start.',
    },
    'Self-Sufficient': {
        category: 'general', prereqs: {},
        benefit: '+2 bonus on Heal and Survival checks.',
    },
    'Shield Proficiency': {
        category: 'general', prereqs: {},
        benefit: 'No penalty on attack rolls with shields.',
    },
    'Shot on the Run': {
        category: 'fighter', prereqs: { dex: 13, bab: 4, feats: ['Point Blank Shot', 'Dodge', 'Mobility'] },
        benefit: 'Move before and after a ranged attack.',
    },
    'Snatch Arrows': {
        category: 'fighter', prereqs: { dex: 15, feats: ['Improved Unarmed Strike', 'Deflect Arrows'] },
        benefit: 'Catch ranged weapons instead of deflecting.',
    },
    'Spell Focus': {
        category: 'general', prereqs: {},
        benefit: '+1 to DC of spells from selected school.',
    },
    'Spell Penetration': {
        category: 'general', prereqs: {},
        benefit: '+2 bonus on caster level checks to overcome spell resistance.',
    },
    'Spring Attack': {
        category: 'fighter', prereqs: { dex: 13, bab: 4, feats: ['Dodge', 'Mobility'] },
        benefit: 'Move before and after a melee attack.',
    },
    'Stealthy': {
        category: 'general', prereqs: {},
        benefit: '+2 bonus on Hide and Move Silently checks.',
    },
    'Stunning Fist': {
        category: 'fighter', prereqs: { dex: 13, wis: 13, bab: 8, feats: ['Improved Unarmed Strike'] },
        benefit: 'Stun an opponent with unarmed attack (Fort save negates).',
    },
    'Toughness': {
        category: 'general', prereqs: {},
        benefit: '+3 hit points.',
    },
    'Tower Shield Proficiency': {
        category: 'general', prereqs: { feats: ['Shield Proficiency'] },
        benefit: 'No penalty on attack rolls when using a tower shield.',
    },
    'Track': {
        category: 'general', prereqs: {},
        benefit: 'Use Survival skill to follow tracks.',
    },
    'Trample': {
        category: 'fighter', prereqs: { feats: ['Mounted Combat'] },
        benefit: 'When mounted, overrun as a standard action.',
    },
    'Two-Weapon Defense': {
        category: 'fighter', prereqs: { dex: 15, feats: ['Two-Weapon Fighting'] },
        benefit: '+1 shield bonus to AC when wielding two weapons.',
    },
    'Two-Weapon Fighting': {
        category: 'fighter', prereqs: { dex: 15 },
        benefit: 'Reduce two-weapon fighting penalties.',
    },
    'Weapon Finesse': {
        category: 'fighter', prereqs: { bab: 1 },
        benefit: 'Use Dex instead of Str on attack rolls with light weapons.',
    },
    'Weapon Focus': {
        category: 'fighter', prereqs: { bab: 1 },
        benefit: '+1 bonus on attack rolls with selected weapon.',
    },
    'Weapon Specialization': {
        category: 'fighter', prereqs: { bab: 4, feats: ['Weapon Focus'], classFeatures: ['Fighter 4'] },
        benefit: '+2 bonus on damage rolls with selected weapon.',
    },
    'Whirlwind Attack': {
        category: 'fighter', prereqs: { dex: 13, int: 13, bab: 4, feats: ['Combat Expertise', 'Dodge', 'Mobility', 'Spring Attack'] },
        benefit: 'Make one melee attack against every adjacent opponent.',
    },

    // ── Metamagic Feats ───────────────────────────────────
    'Empower Spell': {
        category: 'metamagic', prereqs: {},
        benefit: 'All variable numeric effects increased by 50%. Uses +2 spell slot.',
        slotIncrease: 2,
    },
    'Enlarge Spell': {
        category: 'metamagic', prereqs: {},
        benefit: 'Double spell range. Uses +1 spell slot.',
        slotIncrease: 1,
    },
    'Extend Spell': {
        category: 'metamagic', prereqs: {},
        benefit: 'Double spell duration. Uses +1 spell slot.',
        slotIncrease: 1,
    },
    'Heighten Spell': {
        category: 'metamagic', prereqs: {},
        benefit: 'Treat spell as higher level for all purposes. Slot equals new level.',
        slotIncrease: 0, // variable: uses actual new level
    },
    'Quicken Spell': {
        category: 'metamagic', prereqs: {},
        benefit: 'Cast spell as a swift action. Uses +4 spell slot.',
        slotIncrease: 4,
    },
    'Silent Spell': {
        category: 'metamagic', prereqs: {},
        benefit: 'Cast without verbal components. Uses +1 spell slot.',
        slotIncrease: 1,
    },
    'Still Spell': {
        category: 'metamagic', prereqs: {},
        benefit: 'Cast without somatic components. Uses +1 spell slot.',
        slotIncrease: 1,
    },
    'Widen Spell': {
        category: 'metamagic', prereqs: {},
        benefit: 'Double spell area. Uses +3 spell slot.',
        slotIncrease: 3,
    },

    // ── Item Creation Feats ───────────────────────────────
    'Brew Potion': {
        category: 'item_creation', prereqs: { casterLevel: 3 },
        benefit: 'Create potions of spells up to 3rd level.',
    },
    'Craft Magic Arms and Armor': {
        category: 'item_creation', prereqs: { casterLevel: 5 },
        benefit: 'Create magic weapons, armor, and shields.',
    },
    'Craft Rod': {
        category: 'item_creation', prereqs: { casterLevel: 9 },
        benefit: 'Create magic rods.',
    },
    'Craft Staff': {
        category: 'item_creation', prereqs: { casterLevel: 12 },
        benefit: 'Create magic staffs.',
    },
    'Craft Wand': {
        category: 'item_creation', prereqs: { casterLevel: 5 },
        benefit: 'Create magic wands.',
    },
    'Craft Wondrous Item': {
        category: 'item_creation', prereqs: { casterLevel: 3 },
        benefit: 'Create wondrous items.',
    },
    'Forge Ring': {
        category: 'item_creation', prereqs: { casterLevel: 12 },
        benefit: 'Create magic rings.',
    },
    'Scribe Scroll': {
        category: 'item_creation', prereqs: { casterLevel: 1 },
        benefit: 'Create magic scrolls.',
    },
};

/* ── Prerequisite Checking ─────────────────────────────── */

/**
 * Check if a character meets all prerequisites for a feat.
 * @param {string} featName - Name of the feat
 * @param {Object} character - Character data:
 *   { str, dex, con, int_, wis, cha, level, bab, feats: string[],
 *     classFeatures: string[], casterLevel, className, classLevel }
 * @returns {{ eligible: boolean, missing: string[] }}
 */
export function checkFeatPrereqs(featName, character) {
    const feat = FEATS[featName];
    if (!feat) return { eligible: false, missing: ['Feat not found'] };

    const prereqs = feat.prereqs || {};
    const missing = [];

    // Ability score checks
    const abilityMap = { str: 'str', dex: 'dex', con: 'con', int: 'int_', wis: 'wis', cha: 'cha' };
    for (const [ab, key] of Object.entries(abilityMap)) {
        if (prereqs[ab] && (parseInt(character[key]) || 10) < prereqs[ab]) {
            missing.push(`${ab.toUpperCase()} ${prereqs[ab]}+`);
        }
    }

    // BAB check
    if (prereqs.bab && (character.bab || 0) < prereqs.bab) {
        missing.push(`BAB +${prereqs.bab}+`);
    }

    // Character level check
    if (prereqs.characterLevel && (character.level || 1) < prereqs.characterLevel) {
        missing.push(`Character Level ${prereqs.characterLevel}+`);
    }

    // Caster level check
    if (prereqs.casterLevel && (character.casterLevel || 0) < prereqs.casterLevel) {
        missing.push(`Caster Level ${prereqs.casterLevel}+`);
    }

    // Required feats
    if (prereqs.feats) {
        const charFeats = (character.feats || []).map(f => f.toLowerCase());
        for (const reqFeat of prereqs.feats) {
            // For feats like "Spell Focus", we accept "Spell Focus (Conjuration)" etc.
            const found = charFeats.some(cf => cf === reqFeat.toLowerCase() || cf.startsWith(reqFeat.toLowerCase() + ' '));
            if (!found) missing.push(reqFeat);
        }
    }

    // Required class features
    if (prereqs.classFeatures) {
        const charFeatures = (character.classFeatures || []).map(f => f.toLowerCase());
        for (const reqFeature of prereqs.classFeatures) {
            // "Fighter 4" means must have 4+ levels of Fighter
            const classMatch = reqFeature.match(/^(\w+)\s+(\d+)$/);
            if (classMatch) {
                const reqClass = classMatch[1].toLowerCase();
                const reqLevel = parseInt(classMatch[2]);
                if ((character.className || '').toLowerCase() !== reqClass || (character.classLevel || 0) < reqLevel) {
                    missing.push(`${classMatch[1]} level ${reqLevel}+`);
                }
            } else if (!charFeatures.some(cf => cf.includes(reqFeature.toLowerCase()))) {
                missing.push(reqFeature);
            }
        }
    }

    // Skill rank checks
    if (prereqs.ranks) {
        for (const [skill, minRanks] of Object.entries(prereqs.ranks)) {
            const charRanks = character.skillRanks?.[skill.toLowerCase()] || 0;
            if (charRanks < minRanks) {
                missing.push(`${skill} ${minRanks}+ ranks`);
            }
        }
    }

    return { eligible: missing.length === 0, missing };
}

/**
 * Get all feats a character is eligible to take.
 * @param {Object} character - Same as checkFeatPrereqs
 * @param {Object} [options] - { category: 'fighter'|'metamagic'|'item_creation' } to filter by category
 * @returns {Array<{ name: string, feat: Object, eligible: boolean, missing: string[] }>}
 */
export function getEligibleFeats(character, options = {}) {
    const charFeats = (character.feats || []).map(f => f.toLowerCase());

    return Object.entries(FEATS).map(([name, feat]) => {
        // Filter by category if specified
        if (options.category && feat.category !== options.category && feat.category !== 'general') return null;
        // Fighter bonus feats: allow 'fighter' category + general feats
        if (options.category === 'fighter' && feat.category !== 'fighter' && feat.category !== 'general') return null;
        // Wizard bonus feats: metamagic + item creation
        if (options.category === 'wizard_bonus' && feat.category !== 'metamagic' && feat.category !== 'item_creation') return null;

        // Skip if already taken (unless it's a feat that can be taken multiple times)
        if (charFeats.includes(name.toLowerCase())) return null;

        const { eligible, missing } = checkFeatPrereqs(name, character);
        return { name, ...feat, eligible, missing };
    }).filter(Boolean);
}

/**
 * Get all metamagic feats with slot increase info.
 */
export function getMetamagicFeats() {
    return Object.entries(FEATS)
        .filter(([, f]) => f.category === 'metamagic')
        .map(([name, f]) => ({ name, ...f }));
}

/**
 * Get feat categories for display grouping.
 */
export function getFeatCategories() {
    return {
        general: 'General',
        fighter: 'Fighter Bonus',
        metamagic: 'Metamagic',
        item_creation: 'Item Creation',
    };
}
