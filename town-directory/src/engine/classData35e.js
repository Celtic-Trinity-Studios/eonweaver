/**
 * Eon Weaver — D&D 3.5e Class Progression Data
 * Complete level 1-20 tables for all 11 PHB base classes.
 * Each class has: hitDie, babType, goodSaves, skillsPerLevel, classSkills,
 * and a progression array with per-level features, spells/day, and special abilities.
 */

/* ── Save Progression Helpers ──────────────────────────── */
export function goodSave(lvl) { return 2 + Math.floor(lvl / 2); }
export function poorSave(lvl) { return Math.floor(lvl / 3); }

/* ── BAB Progression Helpers ───────────────────────────── */
export function fullBAB(lvl) { return lvl; }
export function threeQtrBAB(lvl) { return Math.floor(lvl * 3 / 4); }
export function halfBAB(lvl) { return Math.floor(lvl / 2); }

/* ── Spells Per Day Tables ─────────────────────────────── */

// Cleric/Druid spells per day (0th through 9th) — does NOT include domain slot
const CLERIC_SPELLS = [
    //  0   1   2   3   4   5   6   7   8   9
    [3, 1 + 1],                                          // Lv1 — +1 = domain
    [4, 2 + 1],
    [4, 2 + 1, 1 + 1],
    [5, 3 + 1, 2 + 1],
    [5, 3 + 1, 2 + 1, 1 + 1],
    [5, 3 + 1, 3 + 1, 2 + 1],
    [6, 4 + 1, 3 + 1, 2 + 1, 1 + 1],
    [6, 4 + 1, 3 + 1, 3 + 1, 2 + 1],
    [6, 4 + 1, 4 + 1, 3 + 1, 2 + 1, 1 + 1],
    [6, 4 + 1, 4 + 1, 3 + 1, 3 + 1, 2 + 1],
    [6, 5 + 1, 4 + 1, 4 + 1, 3 + 1, 2 + 1, 1 + 1],
    [6, 5 + 1, 4 + 1, 4 + 1, 3 + 1, 3 + 1, 2 + 1],
    [6, 5 + 1, 5 + 1, 4 + 1, 4 + 1, 3 + 1, 2 + 1, 1 + 1],
    [6, 5 + 1, 5 + 1, 4 + 1, 4 + 1, 3 + 1, 3 + 1, 2 + 1],
    [6, 5 + 1, 5 + 1, 5 + 1, 4 + 1, 4 + 1, 3 + 1, 2 + 1, 1 + 1],
    [6, 5 + 1, 5 + 1, 5 + 1, 4 + 1, 4 + 1, 3 + 1, 3 + 1, 2 + 1],
    [6, 5 + 1, 5 + 1, 5 + 1, 5 + 1, 4 + 1, 4 + 1, 3 + 1, 2 + 1, 1 + 1],
    [6, 5 + 1, 5 + 1, 5 + 1, 5 + 1, 4 + 1, 4 + 1, 3 + 1, 3 + 1, 2 + 1],
    [6, 5 + 1, 5 + 1, 5 + 1, 5 + 1, 5 + 1, 4 + 1, 4 + 1, 3 + 1, 3 + 1],
    [6, 5 + 1, 5 + 1, 5 + 1, 5 + 1, 5 + 1, 4 + 1, 4 + 1, 4 + 1, 4 + 1],
];

// Wizard spells per day (0th through 9th)
const WIZARD_SPELLS = [
    [3, 1],
    [4, 2],
    [4, 2, 1],
    [4, 3, 2],
    [4, 3, 2, 1],
    [4, 3, 3, 2],
    [4, 4, 3, 2, 1],
    [4, 4, 3, 3, 2],
    [4, 4, 4, 3, 2, 1],
    [4, 4, 4, 3, 3, 2],
    [4, 4, 4, 4, 3, 2, 1],
    [4, 4, 4, 4, 3, 3, 2],
    [4, 4, 4, 4, 4, 3, 2, 1],
    [4, 4, 4, 4, 4, 3, 3, 2],
    [4, 4, 4, 4, 4, 4, 3, 2, 1],
    [4, 4, 4, 4, 4, 4, 3, 3, 2],
    [4, 4, 4, 4, 4, 4, 4, 3, 2, 1],
    [4, 4, 4, 4, 4, 4, 4, 3, 3, 2],
    [4, 4, 4, 4, 4, 4, 4, 4, 3, 3],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
];

// Sorcerer spells per day
const SORCERER_SPELLS_PER_DAY = [
    [5, 3],
    [6, 4],
    [6, 5],
    [6, 6, 3],
    [6, 6, 4],
    [6, 6, 5, 3],
    [6, 6, 6, 4],
    [6, 6, 6, 5, 3],
    [6, 6, 6, 6, 4],
    [6, 6, 6, 6, 5, 3],
    [6, 6, 6, 6, 6, 4],
    [6, 6, 6, 6, 6, 5, 3],
    [6, 6, 6, 6, 6, 6, 4],
    [6, 6, 6, 6, 6, 6, 5, 3],
    [6, 6, 6, 6, 6, 6, 6, 4],
    [6, 6, 6, 6, 6, 6, 6, 5, 3],
    [6, 6, 6, 6, 6, 6, 6, 6, 4],
    [6, 6, 6, 6, 6, 6, 6, 6, 5, 3],
    [6, 6, 6, 6, 6, 6, 6, 6, 6, 4],
    [6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
];

// Sorcerer spells known
const SORCERER_SPELLS_KNOWN = [
    [4, 2],          // Lv1
    [5, 2],
    [5, 3],
    [6, 3, 1],
    [6, 4, 2],
    [7, 4, 2, 1],
    [7, 5, 3, 2],
    [8, 5, 3, 2, 1],
    [8, 5, 4, 3, 2],
    [9, 5, 4, 3, 2, 1],
    [9, 5, 5, 4, 3, 2],
    [9, 5, 5, 4, 3, 2, 1],
    [9, 5, 5, 4, 4, 3, 2],
    [9, 5, 5, 4, 4, 3, 2, 1],
    [9, 5, 5, 4, 4, 4, 3, 2],
    [9, 5, 5, 4, 4, 4, 3, 2, 1],
    [9, 5, 5, 4, 4, 4, 3, 3, 2],
    [9, 5, 5, 4, 4, 4, 3, 3, 2, 1],
    [9, 5, 5, 4, 4, 4, 3, 3, 3, 2],
    [9, 5, 5, 4, 4, 4, 3, 3, 3, 3],
];

// Bard spells per day
const BARD_SPELLS_PER_DAY = [
    [2],              // Lv1
    [3, 0],
    [3, 1],
    [3, 2, 0],
    [3, 3, 1],
    [3, 3, 2],
    [3, 3, 2, 0],
    [3, 3, 3, 1],
    [3, 3, 3, 2],
    [3, 3, 3, 2, 0],
    [3, 3, 3, 3, 1],
    [3, 3, 3, 3, 2],
    [3, 3, 3, 3, 2, 0],
    [4, 3, 3, 3, 3, 1],
    [4, 4, 3, 3, 3, 2],
    [4, 4, 4, 3, 3, 2, 0],
    [4, 4, 4, 4, 3, 3, 1],
    [4, 4, 4, 4, 4, 3, 2],
    [4, 4, 4, 4, 4, 4, 3],
    [4, 4, 4, 4, 4, 4, 4],
];

// Bard spells known
const BARD_SPELLS_KNOWN = [
    [4],              // Lv1
    [5, 2],
    [6, 3],
    [6, 3, 2],
    [6, 4, 3],
    [6, 4, 3],
    [6, 4, 4, 2],
    [6, 4, 4, 3],
    [6, 4, 4, 3],
    [6, 4, 4, 4, 2],
    [6, 4, 4, 4, 3],
    [6, 4, 4, 4, 3],
    [6, 4, 4, 4, 4, 2],
    [6, 4, 4, 4, 4, 3],
    [6, 4, 4, 4, 4, 3],
    [6, 5, 4, 4, 4, 4, 2],
    [6, 5, 5, 4, 4, 4, 3],
    [6, 5, 5, 5, 4, 4, 3],
    [6, 5, 5, 5, 5, 4, 4],
    [6, 5, 5, 5, 5, 5, 4],
];

// Paladin spells per day (starts at level 4)
const PALADIN_SPELLS = [
    null, null, null, // Lv1-3: no spells
    [0],              // Lv4
    [0],
    [1],
    [1],
    [1, 0],
    [1, 0],
    [1, 1],
    [1, 1, 0],
    [1, 1, 1],
    [1, 1, 1],
    [2, 1, 1, 0],
    [2, 1, 1, 1],
    [2, 2, 1, 1],
    [2, 2, 2, 1],
    [3, 2, 2, 1],
    [3, 3, 3, 2],
    [3, 3, 3, 3],
];

// Ranger spells per day (starts at level 4)
const RANGER_SPELLS = [
    null, null, null, // Lv1-3: no spells
    [0],              // Lv4
    [0],
    [1],
    [1],
    [1, 0],
    [1, 0],
    [1, 1],
    [1, 1, 0],
    [1, 1, 1],
    [1, 1, 1],
    [2, 1, 1, 0],
    [2, 1, 1, 1],
    [2, 2, 1, 1],
    [2, 2, 2, 1],
    [3, 2, 2, 1],
    [3, 3, 3, 2],
    [3, 3, 3, 3],
];

// Druid spells per day (identical to Cleric)
const DRUID_SPELLS = CLERIC_SPELLS;

/* ── Class Feature Progression ─────────────────────────── */

function barbarianFeatures(lvl) {
    const f = [];
    if (lvl >= 1) f.push('Fast Movement', 'Illiteracy', 'Rage 1/day');
    if (lvl >= 2) f.push('Uncanny Dodge');
    if (lvl >= 3) f.push('Trap Sense +' + Math.floor(lvl / 3));
    if (lvl >= 4) { const rages = 1 + Math.floor((lvl - 1) / 4); f[2] = `Rage ${rages}/day`; }
    if (lvl >= 5) f.push('Improved Uncanny Dodge');
    if (lvl >= 7) f.push('Damage Reduction ' + Math.floor((lvl - 4) / 3) + '/-');
    if (lvl >= 11) f.push('Greater Rage');
    if (lvl >= 14) f.push('Indomitable Will');
    if (lvl >= 17) f.push('Tireless Rage');
    if (lvl >= 20) f.push('Mighty Rage');
    return f;
}

function bardFeatures(lvl) {
    const f = ['Bardic Music', 'Bardic Knowledge', 'Countersong', 'Fascinate'];
    if (lvl >= 3) f.push('Inspire Competence');
    if (lvl >= 6) f.push('Suggestion');
    if (lvl >= 9) f.push('Inspire Greatness');
    if (lvl >= 12) f.push('Song of Freedom');
    if (lvl >= 15) f.push('Inspire Heroics');
    if (lvl >= 18) f.push('Mass Suggestion');
    return f;
}

function clericFeatures(lvl) {
    const f = ['Turn/Rebuke Undead', 'Domain Powers', 'Spontaneous Casting (cure/inflict)'];
    return f;
}

function druidFeatures(lvl) {
    const f = ['Animal Companion', 'Nature Sense', 'Wild Empathy'];
    if (lvl >= 2) f.push('Woodland Stride');
    if (lvl >= 3) f.push('Trackless Step');
    if (lvl >= 4) f.push('Resist Nature\'s Lure');
    if (lvl >= 5) f.push('Wild Shape 1/day');
    if (lvl >= 6) f.push('Wild Shape 2/day');
    if (lvl >= 7) f.push('Wild Shape 3/day');
    if (lvl >= 9) f.push('Venom Immunity');
    if (lvl >= 10) f.push('Wild Shape 4/day');
    if (lvl >= 12) f.push('Wild Shape (Plant)');
    if (lvl >= 13) f.push('A Thousand Faces');
    if (lvl >= 15) f.push('Timeless Body');
    if (lvl >= 16) f.push('Wild Shape (Elemental)');
    return f;
}

function fighterFeatures(lvl) {
    const f = [];
    // Bonus feats at levels 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20
    const bonusFeatLevels = [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
    const count = bonusFeatLevels.filter(l => l <= lvl).length;
    if (count > 0) f.push(`Bonus Combat Feats (${count})`);
    return f;
}

function monkFeatures(lvl) {
    const unarmed = ['1d6', '1d6', '1d6', '1d8', '1d8', '1d8', '1d8',
        '1d10', '1d10', '1d10', '1d10', '2d6', '2d6', '2d6', '2d6',
        '2d8', '2d8', '2d8', '2d8', '2d10'];
    const f = ['Flurry of Blows', `Unarmed Strike ${unarmed[Math.min(lvl - 1, 19)]}`];
    if (lvl >= 1) f.push('AC Bonus +' + Math.floor(lvl / 5));
    if (lvl >= 2) f.push('Evasion');
    if (lvl >= 3) f.push('Still Mind', `Speed Bonus +${Math.floor((lvl + 2) / 3) * 10}ft`);
    if (lvl >= 4) f.push('Ki Strike (magic)');
    if (lvl >= 5) f.push('Purity of Body');
    if (lvl >= 7) f.push('Wholeness of Body');
    if (lvl >= 9) f.push('Improved Evasion');
    if (lvl >= 10) f.push('Ki Strike (lawful)');
    if (lvl >= 11) f.push('Diamond Body', 'Greater Flurry');
    if (lvl >= 12) f.push('Abundant Step');
    if (lvl >= 13) f.push('Diamond Soul');
    if (lvl >= 15) f.push('Quivering Palm');
    if (lvl >= 16) f.push('Ki Strike (adamantine)');
    if (lvl >= 17) f.push('Timeless Body', 'Tongue of Sun and Moon');
    if (lvl >= 19) f.push('Empty Body');
    if (lvl >= 20) f.push('Perfect Self');
    return f;
}

function paladinFeatures(lvl) {
    const f = ['Aura of Good', 'Detect Evil', 'Smite Evil 1/day'];
    if (lvl >= 2) f.push('Divine Grace', 'Lay on Hands');
    if (lvl >= 3) f.push('Aura of Courage', 'Divine Health');
    if (lvl >= 4) f.push('Turn Undead');
    if (lvl >= 5) { const smites = 1 + Math.floor((lvl - 1) / 4); f[2] = `Smite Evil ${smites}/day`; f.push('Special Mount'); }
    if (lvl >= 6) f.push('Remove Disease 1/week');
    return f;
}

function rangerFeatures(lvl) {
    const fe = 1 + Math.floor(lvl / 5);
    const f = [`${fe} Favored Enem${fe > 1 ? 'ies' : 'y'}`, 'Track', 'Wild Empathy'];
    if (lvl >= 2) f.push('Combat Style');
    if (lvl >= 3) f.push('Endurance');
    if (lvl >= 4) f.push('Animal Companion');
    if (lvl >= 6) f.push('Improved Combat Style');
    if (lvl >= 7) f.push('Woodland Stride');
    if (lvl >= 8) f.push('Swift Tracker');
    if (lvl >= 9) f.push('Evasion');
    if (lvl >= 11) f.push('Combat Style Mastery');
    if (lvl >= 13) f.push('Camouflage');
    if (lvl >= 17) f.push('Hide in Plain Sight');
    return f;
}

function rogueFeatures(lvl) {
    const sa = Math.ceil(lvl / 2);
    const f = [`Sneak Attack +${sa}d6`, 'Trapfinding'];
    if (lvl >= 2) f.push('Evasion');
    if (lvl >= 3) f.push('Trap Sense +' + Math.floor(lvl / 3));
    if (lvl >= 4) f.push('Uncanny Dodge');
    if (lvl >= 8) f.push('Improved Uncanny Dodge');
    // Special abilities at 10, 13, 16, 19
    const specials = Math.max(0, Math.floor((lvl - 7) / 3));
    if (specials > 0) f.push(`Special Abilities (${specials})`);
    return f;
}

function sorcererFeatures(lvl) {
    const f = ['Summon Familiar'];
    return f;
}

function wizardFeatures(lvl) {
    const f = ['Summon Familiar', 'Scribe Scroll'];
    const bonusFeats = [5, 10, 15, 20].filter(l => l <= lvl).length;
    if (bonusFeats > 0) f.push(`Bonus Metamagic/Item Creation Feat (${bonusFeats})`);
    return f;
}

/* ── Main Class Data Export ────────────────────────────── */

export const CLASS_DATA = {
    Barbarian: {
        hitDie: 12, babType: 'full', goodSaves: ['fort'], skillsPerLevel: 4,
        castingAbility: null, spellsPerDay: null, spellsKnown: null,
        castingType: null,
        classSkills: ['climb', 'craft', 'handle animal', 'intimidate', 'jump', 'listen', 'ride', 'survival', 'swim'],
        bonusFeatLevels: [],
        getFeatures: barbarianFeatures,
    },
    Bard: {
        hitDie: 6, babType: '3/4', goodSaves: ['ref', 'will'], skillsPerLevel: 6,
        castingAbility: 'cha', spellsPerDay: BARD_SPELLS_PER_DAY, spellsKnown: BARD_SPELLS_KNOWN,
        castingType: 'spontaneous', maxSpellLevel: 6,
        classSkills: ['appraise', 'balance', 'bluff', 'climb', 'concentration', 'craft', 'decipher script',
            'diplomacy', 'disguise', 'escape artist', 'gather information', 'hide', 'jump', 'knowledge',
            'listen', 'move silently', 'perform', 'profession', 'sense motive', 'sleight of hand',
            'speak language', 'spellcraft', 'swim', 'tumble', 'use magic device'],
        bonusFeatLevels: [],
        getFeatures: bardFeatures,
    },
    Cleric: {
        hitDie: 8, babType: '3/4', goodSaves: ['fort', 'will'], skillsPerLevel: 2,
        castingAbility: 'wis', spellsPerDay: CLERIC_SPELLS, spellsKnown: null,
        castingType: 'prepared', maxSpellLevel: 9, hasDomainSlot: true,
        classSkills: ['concentration', 'craft', 'diplomacy', 'heal', 'knowledge (arcana)',
            'knowledge (history)', 'knowledge (religion)', 'knowledge (the planes)', 'profession', 'spellcraft'],
        bonusFeatLevels: [],
        getFeatures: clericFeatures,
    },
    Druid: {
        hitDie: 8, babType: '3/4', goodSaves: ['fort', 'will'], skillsPerLevel: 4,
        castingAbility: 'wis', spellsPerDay: DRUID_SPELLS, spellsKnown: null,
        castingType: 'prepared', maxSpellLevel: 9,
        classSkills: ['concentration', 'craft', 'diplomacy', 'handle animal', 'heal',
            'knowledge (nature)', 'listen', 'profession', 'ride', 'spellcraft', 'spot',
            'survival', 'swim'],
        bonusFeatLevels: [],
        getFeatures: druidFeatures,
    },
    Fighter: {
        hitDie: 10, babType: 'full', goodSaves: ['fort'], skillsPerLevel: 2,
        castingAbility: null, spellsPerDay: null, spellsKnown: null,
        castingType: null,
        classSkills: ['climb', 'craft', 'handle animal', 'intimidate', 'jump', 'ride', 'swim'],
        bonusFeatLevels: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
        getFeatures: fighterFeatures,
    },
    Monk: {
        hitDie: 8, babType: '3/4', goodSaves: ['fort', 'ref', 'will'], skillsPerLevel: 4,
        castingAbility: null, spellsPerDay: null, spellsKnown: null,
        castingType: null,
        classSkills: ['balance', 'climb', 'concentration', 'craft', 'diplomacy', 'escape artist',
            'hide', 'jump', 'knowledge (arcana)', 'knowledge (religion)', 'listen',
            'move silently', 'perform', 'profession', 'sense motive', 'spot', 'swim', 'tumble'],
        bonusFeatLevels: [1, 2, 6],
        getFeatures: monkFeatures,
    },
    Paladin: {
        hitDie: 10, babType: 'full', goodSaves: ['fort'], skillsPerLevel: 2,
        castingAbility: 'wis', spellsPerDay: PALADIN_SPELLS, spellsKnown: null,
        castingType: 'prepared', maxSpellLevel: 4,
        classSkills: ['concentration', 'craft', 'diplomacy', 'handle animal', 'heal',
            'knowledge (nobility)', 'knowledge (religion)', 'profession', 'ride', 'sense motive'],
        bonusFeatLevels: [],
        getFeatures: paladinFeatures,
    },
    Ranger: {
        hitDie: 8, babType: 'full', goodSaves: ['fort', 'ref'], skillsPerLevel: 6,
        castingAbility: 'wis', spellsPerDay: RANGER_SPELLS, spellsKnown: null,
        castingType: 'prepared', maxSpellLevel: 4,
        classSkills: ['climb', 'concentration', 'craft', 'handle animal', 'heal', 'hide',
            'jump', 'knowledge (dungeoneering)', 'knowledge (geography)', 'knowledge (nature)',
            'listen', 'move silently', 'profession', 'ride', 'search', 'spot', 'survival',
            'swim', 'use rope'],
        bonusFeatLevels: [],
        getFeatures: rangerFeatures,
    },
    Rogue: {
        hitDie: 6, babType: '3/4', goodSaves: ['ref'], skillsPerLevel: 8,
        castingAbility: null, spellsPerDay: null, spellsKnown: null,
        castingType: null,
        classSkills: ['appraise', 'balance', 'bluff', 'climb', 'craft', 'decipher script',
            'diplomacy', 'disable device', 'disguise', 'escape artist', 'forgery',
            'gather information', 'hide', 'intimidate', 'jump', 'knowledge (local)',
            'listen', 'move silently', 'open lock', 'perform', 'profession',
            'search', 'sense motive', 'sleight of hand', 'spot', 'swim', 'tumble',
            'use magic device', 'use rope'],
        bonusFeatLevels: [],
        getFeatures: rogueFeatures,
    },
    Sorcerer: {
        hitDie: 4, babType: '1/2', goodSaves: ['will'], skillsPerLevel: 2,
        castingAbility: 'cha', spellsPerDay: SORCERER_SPELLS_PER_DAY, spellsKnown: SORCERER_SPELLS_KNOWN,
        castingType: 'spontaneous', maxSpellLevel: 9,
        classSkills: ['bluff', 'concentration', 'craft', 'knowledge (arcana)', 'profession', 'spellcraft'],
        bonusFeatLevels: [],
        getFeatures: sorcererFeatures,
    },
    Wizard: {
        hitDie: 4, babType: '1/2', goodSaves: ['will'], skillsPerLevel: 2,
        castingAbility: 'int', spellsPerDay: WIZARD_SPELLS, spellsKnown: null,
        castingType: 'prepared', maxSpellLevel: 9, hasSpellbook: true,
        classSkills: ['concentration', 'craft', 'decipher script', 'knowledge (all)', 'profession', 'spellcraft'],
        bonusFeatLevels: [5, 10, 15, 20],
        getFeatures: wizardFeatures,
    },
};

/* ── NPC Classes ───────────────────────────────────────── */
export const NPC_CLASS_DATA = {
    Adept: {
        hitDie: 6, babType: '1/2', goodSaves: ['will'], skillsPerLevel: 2,
        castingAbility: 'wis', castingType: 'prepared', maxSpellLevel: 5,
        classSkills: ['concentration', 'craft', 'handle animal', 'heal', 'knowledge (all)', 'profession', 'spellcraft', 'survival'],
    },
    Aristocrat: {
        hitDie: 8, babType: '3/4', goodSaves: ['will'], skillsPerLevel: 4,
        castingAbility: null, castingType: null,
        classSkills: ['appraise', 'bluff', 'diplomacy', 'disguise', 'forgery', 'gather information',
            'intimidate', 'knowledge (all)', 'listen', 'perform', 'ride', 'sense motive', 'speak language',
            'spot', 'swim', 'survival'],
    },
    Commoner: {
        hitDie: 4, babType: '1/2', goodSaves: [], skillsPerLevel: 2,
        castingAbility: null, castingType: null,
        classSkills: ['climb', 'craft', 'handle animal', 'jump', 'listen', 'profession', 'ride', 'spot', 'swim', 'use rope'],
    },
    Expert: {
        hitDie: 6, babType: '3/4', goodSaves: ['will'], skillsPerLevel: 6,
        castingAbility: null, castingType: null,
        classSkills: [], // Expert chooses any 10 skills as class skills
    },
    Warrior: {
        hitDie: 8, babType: 'full', goodSaves: ['fort'], skillsPerLevel: 2,
        castingAbility: null, castingType: null,
        classSkills: ['climb', 'handle animal', 'intimidate', 'jump', 'ride', 'swim'],
    },
};

/* ── Lookup Helpers ────────────────────────────────────── */

/**
 * Get class data by name (case-insensitive). Searches PC then NPC classes.
 */
export function getClassData(name) {
    const key = Object.keys(CLASS_DATA).find(k => k.toLowerCase() === (name || '').toLowerCase());
    if (key) return { ...CLASS_DATA[key], name: key, isNPC: false };
    const npcKey = Object.keys(NPC_CLASS_DATA).find(k => k.toLowerCase() === (name || '').toLowerCase());
    if (npcKey) return { ...NPC_CLASS_DATA[npcKey], name: npcKey, isNPC: true };
    return null;
}

/**
 * Calculate BAB for a class at a given level.
 */
export function calcClassBAB(className, level) {
    const cls = getClassData(className);
    if (!cls) return Math.floor(level / 2);
    if (cls.babType === 'full') return fullBAB(level);
    if (cls.babType === '3/4') return threeQtrBAB(level);
    return halfBAB(level);
}

/**
 * Get base saves for a class at a given level.
 * Returns { fort, ref, will }
 */
export function calcClassSaves(className, level) {
    const cls = getClassData(className);
    const goodSaves = cls?.goodSaves || [];
    return {
        fort: goodSaves.includes('fort') ? goodSave(level) : poorSave(level),
        ref: goodSaves.includes('ref') ? goodSave(level) : poorSave(level),
        will: goodSaves.includes('will') ? goodSave(level) : poorSave(level),
    };
}

/**
 * Get spells per day for a class at a given level.
 * Returns array indexed by spell level, or null if non-caster.
 */
export function getSpellsPerDay(className, level) {
    const cls = getClassData(className);
    if (!cls?.spellsPerDay) return null;
    const idx = level - 1;
    if (idx < 0 || idx >= cls.spellsPerDay.length) return null;
    return cls.spellsPerDay[idx] || null;
}

/**
 * Get spells known for a spontaneous caster at a given level.
 * Returns array indexed by spell level, or null.
 */
export function getSpellsKnown(className, level) {
    const cls = getClassData(className);
    if (!cls?.spellsKnown) return null;
    const idx = level - 1;
    if (idx < 0 || idx >= cls.spellsKnown.length) return null;
    return cls.spellsKnown[idx] || null;
}

/**
 * Calculate bonus spells per day from ability modifier.
 * 3.5e: bonus spell of level N if ability mod >= N.
 * Returns array of bonus slots indexed by spell level.
 */
export function bonusSpells(abilityScore) {
    const mod = Math.floor((abilityScore - 10) / 2);
    const bonus = [0]; // 0th-level spells get no bonus
    for (let spellLvl = 1; spellLvl <= 9; spellLvl++) {
        bonus[spellLvl] = mod >= spellLvl ? 1 + Math.floor((mod - spellLvl) / 4) : 0;
    }
    return bonus;
}

/**
 * Get the class features list for a class at a given level.
 */
export function getClassFeatures(className, level) {
    const cls = getClassData(className);
    if (!cls?.getFeatures) return [];
    return cls.getFeatures(level);
}

/**
 * Check if a level grants a general feat (every 3rd level: 1, 3, 6, 9, 12, 15, 18).
 * Note: level 1 always grants a feat.
 */
export function isFeatLevel(characterLevel) {
    return characterLevel === 1 || characterLevel % 3 === 0;
}

/**
 * Check if a level grants a bonus feat for a given class.
 */
export function isBonusFeatLevel(className, classLevel) {
    const cls = getClassData(className);
    return cls?.bonusFeatLevels?.includes(classLevel) || false;
}

/**
 * Get skill points per level for a class at a given level.
 * At level 1, multiply by 4.
 */
export function getSkillPoints(className, intMod, classLevel, isHuman = false) {
    const cls = getClassData(className);
    const base = (cls?.skillsPerLevel || 2) + intMod;
    const perLevel = Math.max(1, base); // Minimum 1 skill point per level
    if (classLevel === 1) {
        return (perLevel * 4) + (isHuman ? 4 : 0); // Humans get +4 at 1st level
    }
    return perLevel + (isHuman ? 1 : 0);
}

/**
 * Check if a skill is a class skill for the given class.
 */
export function isClassSkill(className, skillName) {
    const cls = getClassData(className);
    if (!cls?.classSkills) return false;
    const lower = skillName.toLowerCase();
    // Handle "knowledge (all)" which means all knowledge subskills are class skills
    if (cls.classSkills.includes('knowledge (all)') && lower.startsWith('knowledge')) return true;
    return cls.classSkills.some(s => s === lower || lower.startsWith(s));
}
