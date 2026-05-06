/**
 * Eon Weaver — AI Cost Confirmation Modal
 * Shows approximate Token Credit (TC) cost before any AI operation.
 * The user must click Proceed or Cancel before the operation runs.
 *
 * CREDIT SCALE:
 *   1 TC ≈ 1 full town simulation (100 pop × 12 months)
 *   Based on actual usage data: 1 town × 100 pop × 12 months ≈ 182K raw tokens
 *
 * Cost estimates (in TC):
 *   - Simulation (1 town, 100 pop, 12 months): ~1.0 TC
 *   - Simulation (1 town, 50 pop, 1 month):    ~0.04 TC
 *   - World Sim (3 towns × 100 pop × 12 mo):   ~3.0 TC
 *   - Intake (5 NPCs):                         ~0.03 TC
 *   - Scribe Generate:                         ~0.02 TC
 *   - Custom AI Prompt:                        ~0.01 TC
 */

/**
 * Conversion: raw tokens → Token Credits (TC).
 * Calibrated so that 1 town × 100 pop × 12 months ≈ 1.0 TC.
 */
const TOKENS_PER_CREDIT = 182_000;

/**
 * Cost estimate lookup table.
 * Each entry returns { tokens, label } given the operation params.
 * `tokens` is the raw internal token estimate; displayed as TC via conversion.
 */
const COST_ESTIMATES = {
    /**
     * Town Simulation: 5 AI calls per month per town.
     * ~7.6K raw tokens for a ~50-char town, scaling with population.
     */
    simulation: ({ months = 1, population = 50, numTowns = 1 }) => {
        const popFactor = Math.max(1, population / 50);
        const basePerMonth = Math.round(7600 * popFactor);
        const total = basePerMonth * months * numTowns;
        let label = `${months} month${months > 1 ? 's' : ''}`;
        if (numTowns > 1) label += ` × ${numTowns} town${numTowns > 1 ? 's' : ''}`;
        label += ` (~${population} chars)`;
        return { tokens: total, label: `Simulation — ${label}` };
    },

    /**
     * Intake mode: roster stubs + fleshing out.
     */
    intake: ({ count = 1 }) => {
        const total = Math.round(count * 1050);
        return { tokens: total, label: `Intake — ${count} character${count > 1 ? 's' : ''}` };
    },

    /**
     * Level Up: complex rules call.
     */
    levelUp: () => {
        return { tokens: 2500, label: 'AI Level Up — 1 character' };
    },

    /**
     * Scribe (Lore, Quest, Dungeon, Item, Trap generators)
     */
    scribe: ({ generatorType = 'content' }) => {
        const labels = {
            lore: 'Lore Scribe', quest: 'Quest Forge', dungeon: 'Dungeon Architect',
            item: 'Item Enchanter', trap: 'Trap Designer', weather: 'Weather Generation',
        };
        return { tokens: 3800, label: `AI Scribe — ${labels[generatorType] || 'Content Generation'}` };
    },

    /**
     * Custom AI character prompt
     */
    customPrompt: () => {
        return { tokens: 1300, label: 'AI Character Generation' };
    },

    /**
     * Auto-assign spells (town-wide)
     */
    autoSpells: ({ count = 1 }) => {
        const total = Math.max(1300, Math.round(count * 200));
        return { tokens: total, label: `Auto-assign Spells — ~${count} caster${count > 1 ? 's' : ''}` };
    },

    /**
     * Planning phase for multi-month simulation
     */
    planning: ({ numTowns = 1 }) => {
        const total = 2500 * numTowns;
        return { tokens: total, label: `Simulation Planning — ${numTowns} town${numTowns > 1 ? 's' : ''}` };
    },

    /**
     * World Simulation (multiple towns × months)
     * Includes planning + simulation + movement overhead
     */
    worldSimulation: ({ months = 1, towns = [], intakeCount = 0 }) => {
        const numTowns = towns.length || 1;
        const avgPop = towns.length > 0
            ? Math.round(towns.reduce((s, t) => s + (t.population || 50), 0) / numTowns)
            : 50;
        const planTokens = months > 1 ? 2500 * numTowns : 0;
        const popFactor = Math.max(1, avgPop / 50);
        const simTokens = Math.round(7600 * popFactor) * months * numTowns;
        const intakeTokens = intakeCount > 0 ? intakeCount * 1050 * numTowns : 0;
        const total = planTokens + simTokens + intakeTokens;
        return { tokens: total, label: `World Simulation — ${numTowns} town${numTowns > 1 ? 's' : ''} × ${months} month${months > 1 ? 's' : ''}` };
    },

    /**
     * Debug LLM (free — just a connectivity test)
     */
    debugLlm: () => {
        return { tokens: 0, label: 'Debug LLM Connection (Free)' };
    },
};

/**
 * Convert raw token estimate to human-scale Token Credits (TC).
 */
function tokensToCredits(tokens) {
    return tokens / TOKENS_PER_CREDIT;
}

/**
 * Format TC into a clean, human-readable string.
 * Examples: "~1.0", "~0.3", "~3.2", "<0.01"
 */
function formatCredits(tc) {
    if (tc >= 10) return tc.toFixed(0);
    if (tc >= 1) return tc.toFixed(1);
    if (tc >= 0.1) return tc.toFixed(1);
    if (tc >= 0.01) return tc.toFixed(2);
    return '<0.01';
}

/**
 * Show the AI cost confirmation modal.
 *
 * @param {string} operationType — key from COST_ESTIMATES (e.g. 'simulation', 'intake', 'scribe')
 * @param {Object} params — parameters passed to the cost estimator function
 * @returns {Promise<boolean>} — resolves true if user clicks Proceed, false if Cancel
 */
export function confirmAiCost(operationType, params = {}) {
    const estimator = COST_ESTIMATES[operationType];
    if (!estimator) {
        console.warn(`[AiCostConfirm] Unknown operation type: ${operationType}`);
        return Promise.resolve(true);
    }

    const { tokens, label } = estimator(params);

    // Free operations skip the modal
    if (tokens === 0) return Promise.resolve(true);

    const tc = tokensToCredits(tokens);
    const displayValue = formatCredits(tc);
    // Use ~ prefix except for the <0.01 case which already has its own prefix
    const prefix = displayValue.startsWith('<') ? '' : '~';

    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal ai-cost-modal';
        overlay.style.display = 'flex';

        overlay.innerHTML = `
            <div class="modal-content ai-cost-content">
                <div class="ai-cost-icon">🪙</div>
                <h2 class="ai-cost-title">AI Credit Estimate</h2>
                <p class="ai-cost-operation">${label}</p>
                <div class="ai-cost-amount">
                    <span class="ai-cost-value">${prefix}${displayValue}</span>
                    <span class="ai-cost-unit">Token Credits</span>
                </div>
                <p class="ai-cost-note">1 TC ≈ one full town simulation (100 pop × 12 months). Actual usage may vary.</p>
                <div class="ai-cost-actions">
                    <button class="btn-primary ai-cost-proceed" id="ai-cost-proceed">✨ Proceed</button>
                    <button class="btn-secondary ai-cost-cancel" id="ai-cost-cancel">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        function cleanup(result) {
            overlay.remove();
            resolve(result);
        }

        overlay.querySelector('#ai-cost-proceed').addEventListener('click', () => cleanup(true));
        overlay.querySelector('#ai-cost-cancel').addEventListener('click', () => cleanup(false));

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cleanup(false);
        });

        const escHandler = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', escHandler);
                cleanup(false);
            }
        };
        document.addEventListener('keydown', escHandler);
    });
}
