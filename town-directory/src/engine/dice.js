/**
 * Eon Weaver — Dice Roller Engine
 * Parse and roll dice expressions like "2d6+3", "1d20", "4d6 drop lowest".
 */

/**
 * Roll a single die (1 to sides).
 */
export function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

/**
 * Roll multiple dice: returns array of individual results.
 */
export function rollDice(count, sides) {
    const results = [];
    for (let i = 0; i < count; i++) {
        results.push(rollDie(sides));
    }
    return results;
}

/**
 * Parse and evaluate a dice expression string.
 * Supports: "2d6", "2d6+3", "1d20-1", "4d6k3" (keep highest 3)
 * Returns { rolls: number[], kept: number[], modifier: number, total: number, expression: string }
 */
export function roll(expression) {
    const expr = expression.trim().toLowerCase();

    // Match NdS patterns with optional k (keep) and modifier
    const match = expr.match(/^(\d+)d(\d+)(?:k(\d+))?(?:\s*([+-])\s*(\d+))?$/);
    if (!match) {
        // Try plain number
        const num = parseInt(expr);
        if (!isNaN(num)) {
            return { rolls: [num], kept: [num], modifier: 0, total: num, expression: expr };
        }
        throw new Error(`Invalid dice expression: "${expression}"`);
    }

    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const keep = match[3] ? parseInt(match[3]) : count;
    const modSign = match[4] || '+';
    const modVal = match[5] ? parseInt(match[5]) : 0;
    const modifier = modSign === '-' ? -modVal : modVal;

    const rolls = rollDice(count, sides);

    // Keep highest N
    const sorted = [...rolls].sort((a, b) => b - a);
    const kept = sorted.slice(0, keep);

    const total = kept.reduce((sum, v) => sum + v, 0) + modifier;

    return { rolls, kept, modifier, total, expression: expr };
}

/**
 * Roll ability scores: 4d6 drop lowest, 6 times.
 * Returns array of 6 scores.
 */
export function rollAbilityScores() {
    const scores = [];
    for (let i = 0; i < 6; i++) {
        const result = roll('4d6k3');
        scores.push(result.total);
    }
    return scores;
}

/**
 * Calculate ability modifier from score.
 */
export function abilityMod(score) {
    return Math.floor((score - 10) / 2);
}

/**
 * Format a modifier as "+2" or "-1".
 */
export function formatMod(mod) {
    return mod >= 0 ? `+${mod}` : `${mod}`;
}
