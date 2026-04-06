/**
 * Eon Weaver — D&D 3.5e Prestige Class Data
 * Core SRD prestige classes with prerequisites and progression.
 */

export const PRESTIGE_CLASSES = {
    'Arcane Archer': {
        hitDie: 8, babType: 'full', goodSaves: ['fort', 'ref'],
        skillsPerLevel: 4, maxLevel: 10,
        prereqs: {
            bab: 6,
            feats: ['Point Blank Shot', 'Precise Shot', 'Weapon Focus (longbow)'],
            race: ['Elf', 'Half-Elf'],
            spellAbility: 'Must be able to cast 1st-level arcane spells',
        },
        description: 'Masters of ranged combat who imbue arrows with magical power.',
        features: [
            { level: 1, name: 'Enhance Arrow +1' },
            { level: 2, name: 'Imbue Arrow' },
            { level: 3, name: 'Enhance Arrow +2' },
            { level: 4, name: 'Seeker Arrow' },
            { level: 5, name: 'Enhance Arrow +3' },
            { level: 6, name: 'Phase Arrow' },
            { level: 7, name: 'Enhance Arrow +4' },
            { level: 8, name: 'Hail of Arrows' },
            { level: 9, name: 'Enhance Arrow +5' },
            { level: 10, name: 'Arrow of Death' },
        ],
    },
    'Arcane Trickster': {
        hitDie: 4, babType: '1/2', goodSaves: ['ref', 'will'],
        skillsPerLevel: 4, maxLevel: 10,
        prereqs: {
            alignment: 'Nonlawful',
            skills: { 'decipher script': 7, 'disable device': 7, 'escape artist': 7, 'knowledge (arcana)': 4 },
            spellAbility: 'Able to cast mage hand and 3rd-level arcane spells',
            classFeatures: ['Sneak Attack +2d6'],
        },
        description: 'Rogues who supplement their natural cunning with arcane magic.',
        features: [
            { level: 1, name: 'Ranged Legerdemain', spellProgression: true },
            { level: 2, name: 'Sneak Attack +1d6', spellProgression: true },
            { level: 3, name: 'Impromptu Sneak Attack 1/day', spellProgression: true },
            { level: 5, name: 'Sneak Attack +2d6', spellProgression: true },
            { level: 7, name: 'Impromptu Sneak Attack 2/day', spellProgression: true },
            { level: 8, name: 'Sneak Attack +3d6', spellProgression: true },
        ],
    },
    'Assassin': {
        hitDie: 6, babType: '3/4', goodSaves: ['ref'],
        skillsPerLevel: 4, maxLevel: 10,
        prereqs: {
            alignment: 'Evil',
            skills: { 'disguise': 4, 'hide': 8, 'move silently': 8 },
            special: 'Must kill someone for no other reason than joining the assassins',
        },
        description: 'Professional killers who study the art of death.',
        features: [
            { level: 1, name: 'Sneak Attack +1d6, Death Attack, Poison Use, Spells' },
            { level: 2, name: '+1 save vs poison, Uncanny Dodge' },
            { level: 3, name: 'Sneak Attack +2d6' },
            { level: 4, name: '+2 save vs poison' },
            { level: 5, name: 'Sneak Attack +3d6, Improved Uncanny Dodge' },
            { level: 6, name: '+3 save vs poison' },
            { level: 7, name: 'Sneak Attack +4d6' },
            { level: 8, name: '+4 save vs poison, Hide in Plain Sight' },
            { level: 9, name: 'Sneak Attack +5d6' },
            { level: 10, name: '+5 save vs poison' },
        ],
    },
    'Blackguard': {
        hitDie: 10, babType: 'full', goodSaves: ['fort'],
        skillsPerLevel: 2, maxLevel: 10,
        prereqs: {
            bab: 6,
            alignment: 'Evil',
            skills: { 'hide': 5, 'knowledge (religion)': 2 },
            feats: ['Cleave', 'Improved Sunder', 'Power Attack'],
        },
        description: 'Fallen paladins and evil champions who serve dark powers.',
        features: [
            { level: 1, name: 'Aura of Evil, Detect Good, Poison Use' },
            { level: 2, name: 'Dark Blessing, Smite Good 1/day' },
            { level: 3, name: 'Aura of Despair, Command Undead' },
            { level: 4, name: 'Sneak Attack +1d6' },
            { level: 5, name: 'Fiendish Servant, Smite Good 2/day' },
            { level: 7, name: 'Sneak Attack +2d6' },
            { level: 10, name: 'Sneak Attack +3d6, Smite Good 3/day' },
        ],
    },
    'Dragon Disciple': {
        hitDie: 12, babType: '3/4', goodSaves: ['fort', 'will'],
        skillsPerLevel: 2, maxLevel: 10,
        prereqs: {
            race: 'Non-dragon',
            spellAbility: 'Able to cast arcane spells without preparation (Sorcerer or Bard)',
            languages: ['Draconic'],
        },
        description: 'Sorcerers who embrace their draconic heritage.',
        features: [
            { level: 1, name: 'Natural Armor +1' },
            { level: 2, name: 'Str +2, Claws and Bite' },
            { level: 3, name: 'Breath Weapon (2d8)' },
            { level: 4, name: 'Str +2, Natural Armor +1' },
            { level: 5, name: 'Blindsense 30ft' },
            { level: 6, name: 'Con +2' },
            { level: 7, name: 'Breath Weapon (4d8), Natural Armor +1' },
            { level: 8, name: 'Int +2' },
            { level: 9, name: 'Wings' },
            { level: 10, name: 'Blindsense 60ft, Dragon Apotheosis' },
        ],
    },
    'Duelist': {
        hitDie: 10, babType: 'full', goodSaves: ['ref'],
        skillsPerLevel: 4, maxLevel: 10,
        prereqs: {
            bab: 6,
            skills: { 'perform': 3, 'tumble': 5 },
            feats: ['Dodge', 'Mobility', 'Weapon Finesse'],
        },
        description: 'Agile sword fighters who rely on speed and precision.',
        features: [
            { level: 1, name: 'Canny Defense' },
            { level: 2, name: 'Improved Reaction +2, Parry' },
            { level: 3, name: 'Enhanced Mobility' },
            { level: 4, name: 'Grace' },
            { level: 5, name: 'Precise Strike +1d6' },
            { level: 6, name: 'Acrobatic Charge' },
            { level: 7, name: 'Elaborate Parry' },
            { level: 8, name: 'Improved Reaction +4' },
            { level: 9, name: 'Deflect Arrows' },
            { level: 10, name: 'Precise Strike +2d6, Crippling Strike' },
        ],
    },
    'Dwarven Defender': {
        hitDie: 12, babType: 'full', goodSaves: ['fort', 'will'],
        skillsPerLevel: 2, maxLevel: 10,
        prereqs: {
            alignment: 'Lawful',
            bab: 7,
            race: ['Dwarf'],
            feats: ['Dodge', 'Endurance', 'Toughness'],
        },
        description: 'Dwarven warriors who specialize in holding positions.',
        features: [
            { level: 1, name: 'Defensive Stance 1/day' },
            { level: 2, name: 'Uncanny Dodge' },
            { level: 3, name: 'Defensive Stance 2/day' },
            { level: 4, name: 'Trap Sense +1' },
            { level: 5, name: 'Defensive Stance 3/day' },
            { level: 6, name: 'Improved Uncanny Dodge, DR 3/-' },
            { level: 7, name: 'Defensive Stance 4/day' },
            { level: 8, name: 'Trap Sense +2, Mobile Defense' },
            { level: 9, name: 'Defensive Stance 5/day' },
            { level: 10, name: 'DR 6/-' },
        ],
    },
    'Eldritch Knight': {
        hitDie: 6, babType: 'full', goodSaves: ['fort'],
        skillsPerLevel: 2, maxLevel: 10,
        prereqs: {
            feats: ['Martial Weapon Proficiency'],
            spellAbility: 'Able to cast 3rd-level arcane spells',
        },
        description: 'Fighters who wield both blade and spell.',
        features: [
            { level: 1, name: 'Bonus Feat' },
            { level: 2, name: 'Spellcasting (+1 existing class)', spellProgression: true },
        ],
    },
    'Hierophant': {
        hitDie: 8, babType: '1/2', goodSaves: ['fort', 'will'],
        skillsPerLevel: 2, maxLevel: 5,
        prereqs: {
            feats: ['any metamagic or item creation feat'],
            spellAbility: 'Able to cast 7th-level divine spells',
        },
        description: 'Divine spellcasters who transcend mortal limits.',
        features: [
            { level: 1, name: 'Special Ability', spellProgression: true },
            { level: 2, name: 'Special Ability', spellProgression: true },
            { level: 3, name: 'Special Ability', spellProgression: true },
            { level: 4, name: 'Special Ability', spellProgression: true },
            { level: 5, name: 'Special Ability', spellProgression: true },
        ],
    },
    'Loremaster': {
        hitDie: 4, babType: '1/2', goodSaves: ['will'],
        skillsPerLevel: 4, maxLevel: 10,
        prereqs: {
            skills: { 'knowledge (any two)': 10 },
            feats: ['any three metamagic or item creation feats'],
            spellAbility: 'Able to cast 7 different divination spells',
        },
        description: 'Seekers of ancient knowledge and forgotten lore.',
        features: [
            { level: 1, name: 'Secret', spellProgression: true },
            { level: 2, name: 'Lore', spellProgression: true },
            { level: 3, name: 'Secret', spellProgression: true },
            { level: 4, name: 'Bonus Language', spellProgression: true },
            { level: 5, name: 'Secret', spellProgression: true },
            { level: 6, name: 'Greater Lore', spellProgression: true },
            { level: 7, name: 'Secret', spellProgression: true },
            { level: 8, name: 'Bonus Language', spellProgression: true },
            { level: 9, name: 'Secret', spellProgression: true },
            { level: 10, name: 'True Lore', spellProgression: true },
        ],
    },
    'Mystic Theurge': {
        hitDie: 4, babType: '1/2', goodSaves: ['will'],
        skillsPerLevel: 2, maxLevel: 10,
        prereqs: {
            spellAbility: 'Able to cast 2nd-level divine spells AND 2nd-level arcane spells',
        },
        description: 'Masters of both arcane and divine magic.',
        features: [
            { level: 1, name: '+1 arcane / +1 divine spellcasting', dualProgression: true },
        ],
    },
    'Shadowdancer': {
        hitDie: 8, babType: '3/4', goodSaves: ['ref'],
        skillsPerLevel: 6, maxLevel: 10,
        prereqs: {
            skills: { 'move silently': 8, 'hide': 10, 'perform (dance)': 5 },
            feats: ['Dodge', 'Mobility', 'Combat Reflexes'],
        },
        description: 'Warriors of shadow who blend martial skill with dark magic.',
        features: [
            { level: 1, name: 'Hide in Plain Sight' },
            { level: 2, name: 'Evasion, Darkvision, Uncanny Dodge' },
            { level: 3, name: 'Shadow Illusion, Summon Shadow' },
            { level: 4, name: 'Shadow Jump 20ft' },
            { level: 5, name: 'Defensive Roll, Improved Uncanny Dodge' },
            { level: 6, name: 'Shadow Jump 40ft, Summon Shadow (2)' },
            { level: 7, name: 'Slippery Mind' },
            { level: 8, name: 'Shadow Jump 80ft' },
            { level: 9, name: 'Summon Shadow (3)' },
            { level: 10, name: 'Shadow Jump 160ft, Improved Evasion' },
        ],
    },
    'Thaumaturgist': {
        hitDie: 4, babType: '1/2', goodSaves: ['will'],
        skillsPerLevel: 2, maxLevel: 5,
        prereqs: {
            feats: ['Spell Focus (Conjuration)'],
            spellAbility: 'Able to cast lesser planar ally',
        },
        description: 'Specialists in summoning extraplanar creatures.',
        features: [
            { level: 1, name: 'Improved Ally', spellProgression: true },
            { level: 2, name: 'Augment Summoning', spellProgression: true },
            { level: 3, name: 'Extended Summoning', spellProgression: true },
            { level: 4, name: 'Contingent Conjuration', spellProgression: true },
            { level: 5, name: 'Planar Cohort', spellProgression: true },
        ],
    },
};

/**
 * Get prestige class data by name (case-insensitive).
 */
export function getPrestigeClass(name) {
    const key = Object.keys(PRESTIGE_CLASSES).find(k => k.toLowerCase() === (name || '').toLowerCase());
    return key ? { ...PRESTIGE_CLASSES[key], name: key } : null;
}

/**
 * Get all prestige class names.
 */
export function getAllPrestigeClasses() {
    return Object.keys(PRESTIGE_CLASSES);
}

/**
 * Check if a character meets prestige class prerequisites.
 * Returns { eligible: boolean, missing: string[] }
 */
export function checkPrestigePrereqs(className, character) {
    const prc = PRESTIGE_CLASSES[className];
    if (!prc) return { eligible: false, missing: ['Class not found'] };

    const prereqs = prc.prereqs;
    const missing = [];

    if (prereqs.bab && (character.bab || 0) < prereqs.bab) {
        missing.push(`BAB +${prereqs.bab}+`);
    }

    if (prereqs.alignment) {
        const align = (character.alignment || '').toLowerCase();
        const req = prereqs.alignment.toLowerCase();
        if (req === 'evil' && !align.includes('evil')) missing.push('Must be Evil alignment');
        if (req === 'lawful' && !align.includes('lawful')) missing.push('Must be Lawful alignment');
        if (req === 'nonlawful' && align.includes('lawful')) missing.push('Must be non-Lawful alignment');
    }

    if (prereqs.race) {
        const races = Array.isArray(prereqs.race) ? prereqs.race : [prereqs.race];
        const charRace = (character.race || '').toLowerCase();
        if (!races.some(r => charRace === r.toLowerCase())) {
            missing.push(`Race: ${races.join(' or ')}`);
        }
    }

    if (prereqs.feats) {
        const charFeats = (character.feats || []).map(f => f.toLowerCase());
        for (const f of prereqs.feats) {
            if (!charFeats.some(cf => cf.includes(f.toLowerCase()))) {
                missing.push(`Feat: ${f}`);
            }
        }
    }

    if (prereqs.skills) {
        for (const [skill, ranks] of Object.entries(prereqs.skills)) {
            const charRanks = character.skillRanks?.[skill.toLowerCase()] || 0;
            if (charRanks < ranks) {
                missing.push(`${skill} ${ranks}+ ranks`);
            }
        }
    }

    if (prereqs.spellAbility) {
        missing.push(`Spellcasting: ${prereqs.spellAbility}`);
        // Note: This is a soft check — DM must verify manually
    }

    if (prereqs.classFeatures) {
        for (const cf of prereqs.classFeatures) {
            if (!(character.classFeatures || []).some(f => f.toLowerCase().includes(cf.toLowerCase()))) {
                missing.push(`Class Feature: ${cf}`);
            }
        }
    }

    if (prereqs.special) {
        missing.push(`Special: ${prereqs.special}`);
    }

    return { eligible: missing.length === 0, missing };
}
