/**
 * Eon Weaver — D&D 3.5e Encumbrance Engine
 * Load calculation, coin weight, container nesting, load tier penalties.
 */

/* ── Carrying Capacity by STR Score (Medium biped) ───── */
// Index = STR score (0-29), value = [light, medium, heavy] in lbs
const CARRY_TABLE = [
    [0, 0, 0],         // 0 (dead)
    [3, 6, 10],        // 1
    [6, 13, 20],       // 2
    [10, 20, 30],      // 3
    [13, 26, 40],      // 4
    [16, 33, 50],      // 5
    [20, 40, 60],      // 6
    [23, 46, 70],      // 7
    [26, 53, 80],      // 8
    [30, 60, 90],      // 9
    [33, 66, 100],     // 10
    [38, 76, 115],     // 11
    [43, 86, 130],     // 12
    [50, 100, 150],    // 13
    [58, 116, 175],    // 14
    [66, 133, 200],    // 15
    [76, 153, 230],    // 16
    [86, 173, 260],    // 17
    [100, 200, 300],   // 18
    [116, 233, 350],   // 19
    [133, 266, 400],   // 20
    [153, 306, 460],   // 21
    [173, 346, 520],   // 22
    [200, 400, 600],   // 23
    [233, 466, 700],   // 24
    [266, 533, 800],   // 25
    [306, 613, 920],   // 26
    [346, 693, 1040],  // 27
    [400, 800, 1200],  // 28
    [466, 933, 1400],  // 29
];

// For STR 30+, each 10 points quadruples the base
function getCarryCapacity(str) {
    if (str <= 0) return { light: 0, medium: 0, heavy: 0 };
    if (str <= 29) {
        const [light, medium, heavy] = CARRY_TABLE[str];
        return { light, medium, heavy };
    }
    // For 30+: find base (STR mod 10 + 20), multiply by 4 per 10 above 20
    const base = (str % 10) + 20;
    const multiplier = Math.pow(4, Math.floor((str - 20) / 10));
    const [bl, bm, bh] = CARRY_TABLE[base];
    return {
        light: Math.floor(bl * multiplier),
        medium: Math.floor(bm * multiplier),
        heavy: Math.floor(bh * multiplier),
    };
}

/* ── Size Multipliers for Carrying Capacity ────────────── */
const SIZE_CARRY_MULT = {
    Fine: 1 / 8, Diminutive: 1 / 4, Tiny: 1 / 2, Small: 3 / 4,
    Medium: 1, Large: 2, Huge: 4, Gargantuan: 8, Colossal: 16,
};

// Quadrupeds carry ×1.5
const QUADRUPED_MULT = 1.5;

/* ── Load Tier Effects ─────────────────────────────────── */
export const LOAD_TIERS = {
    light: {
        name: 'Light Load',
        maxDex: Infinity,
        checkPenalty: 0,
        speed30: 30,
        speed20: 20,
        runMultiplier: 4,
    },
    medium: {
        name: 'Medium Load',
        maxDex: 3,
        checkPenalty: -3,
        speed30: 20,
        speed20: 15,
        runMultiplier: 4,
    },
    heavy: {
        name: 'Heavy Load',
        maxDex: 1,
        checkPenalty: -6,
        speed30: 20,
        speed20: 15,
        runMultiplier: 3,
    },
    overloaded: {
        name: 'Overloaded',
        maxDex: 0,
        checkPenalty: -6,
        speed30: 5,
        speed20: 5,
        runMultiplier: 0, // can't run
    },
};

/* ── Magic Containers ──────────────────────────────────── */
export const MAGIC_CONTAINERS = {
    'bag of holding i': { capacity: 250, weight: 15, effectiveWeight: 15 },
    'bag of holding ii': { capacity: 500, weight: 25, effectiveWeight: 25 },
    'bag of holding iii': { capacity: 1000, weight: 35, effectiveWeight: 35 },
    'bag of holding iv': { capacity: 1500, weight: 60, effectiveWeight: 60 },
    'handy haversack': { capacity: 120, weight: 5, effectiveWeight: 5 },
    'portable hole': { capacity: 6000, weight: 0, effectiveWeight: 0 },
};

/* ── Coin Weight ───────────────────────────────────────── */
const COINS_PER_LB = 50; // 50 coins = 1 lb

/**
 * Calculate total coin weight from a purse object.
 * @param {{ pp?: number, gp?: number, ep?: number, sp?: number, cp?: number }} coins
 * @returns {number} Weight in lbs
 */
export function coinWeight(coins) {
    const total = (coins.pp || 0) + (coins.gp || 0) + (coins.ep || 0) + (coins.sp || 0) + (coins.cp || 0);
    return total / COINS_PER_LB;
}

/**
 * Parse a gear string to extract coin amounts.
 * @param {string} gearStr - Gear string from character
 * @returns {{ pp: number, gp: number, ep: number, sp: number, cp: number }}
 */
export function parseCoinsFromGear(gearStr) {
    const purse = { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };
    if (!gearStr) return purse;
    const moneyRegex = /(\d+(?:,\d+)?)\s*(pp|gp|sp|cp|ep)/gi;
    let m;
    while ((m = moneyRegex.exec(gearStr)) !== null) {
        purse[m[2].toLowerCase()] += parseInt(m[1].replace(',', ''));
    }
    return purse;
}

/**
 * Calculate full encumbrance for a character.
 * @param {Object} params
 * @param {number} params.strScore - STR ability score
 * @param {string} [params.size='Medium'] - Character size
 * @param {boolean} [params.quadruped=false] - Is a quadruped
 * @param {Array} [params.equipment=[]] - Array of { weight, container, name }
 * @param {Object} [params.coins] - { pp, gp, ep, sp, cp }
 * @param {string} [params.gear=''] - Gear string (fallback for coins)
 * @returns {Object} Full encumbrance breakdown
 */
export function calculateEncumbrance({
    strScore = 10,
    size = 'Medium',
    quadruped = false,
    equipment = [],
    coins = null,
    gear = '',
}) {
    // 1. Calculate carrying capacity
    const rawCapacity = getCarryCapacity(strScore);
    const sizeMult = SIZE_CARRY_MULT[size] || 1;
    const quadMult = quadruped ? QUADRUPED_MULT : 1;
    const mult = sizeMult * quadMult;

    const capacity = {
        light: Math.floor(rawCapacity.light * mult),
        medium: Math.floor(rawCapacity.medium * mult),
        heavy: Math.floor(rawCapacity.heavy * mult),
        liftOverHead: Math.floor(rawCapacity.heavy * mult),       // = heavy load
        liftOffGround: Math.floor(rawCapacity.heavy * mult * 2),  // 2× heavy
        pushDrag: Math.floor(rawCapacity.heavy * mult * 5),       // 5× heavy
    };

    // 2. Calculate total item weight
    let totalEquipWeight = 0;
    let containerContents = 0; // weight stored in magic containers
    const containers = [];

    for (const item of equipment) {
        const itemWeight = parseFloat(item.weight) || 0;
        const itemName = (item.item_name || item.name || '').toLowerCase();

        // Check if this is a magic container
        const container = Object.entries(MAGIC_CONTAINERS).find(([key]) => itemName.includes(key));
        if (container) {
            containers.push({
                name: item.item_name || item.name,
                ...container[1],
                contents: item.container_weight || 0, // weight of items stored inside
            });
            totalEquipWeight += container[1].effectiveWeight;
        } else if (item.container) {
            // Item is inside a container — its weight doesn't count toward carried weight
            // if the container is magical
            const inMagic = containers.some(c => c.name?.toLowerCase() === item.container?.toLowerCase());
            if (inMagic) {
                containerContents += itemWeight;
            } else {
                totalEquipWeight += itemWeight;
            }
        } else {
            totalEquipWeight += itemWeight * (item.quantity || 1);
        }
    }

    // 3. Calculate coin weight
    const purse = coins || parseCoinsFromGear(gear);
    const cWeight = coinWeight(purse);

    // 4. Total weight
    const totalWeight = totalEquipWeight + cWeight;

    // 5. Determine load tier
    let tier;
    if (totalWeight <= capacity.light) tier = 'light';
    else if (totalWeight <= capacity.medium) tier = 'medium';
    else if (totalWeight <= capacity.heavy) tier = 'heavy';
    else tier = 'overloaded';

    const tierEffects = LOAD_TIERS[tier];

    // 6. Calculate percentage for display
    const pct = capacity.heavy > 0 ? Math.min(100, (totalWeight / capacity.heavy) * 100) : 0;

    return {
        totalWeight: Math.round(totalWeight * 10) / 10,
        equipmentWeight: Math.round(totalEquipWeight * 10) / 10,
        coinWeight: Math.round(cWeight * 10) / 10,
        containerContents: Math.round(containerContents * 10) / 10,
        capacity,
        tier,
        tierName: tierEffects.name,
        effects: tierEffects,
        percentage: Math.round(pct),
        coins: purse,
        containers,
    };
}

/**
 * Get a compact display string for encumbrance.
 */
export function encumbranceLabel(enc) {
    return `${enc.totalWeight} lbs (${enc.tierName}) — ${enc.percentage}%`;
}

/**
 * Export the carrying capacity calculator for standalone use.
 */
export { getCarryCapacity };
