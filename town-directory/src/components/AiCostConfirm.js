/**
 * Eon Weaver — AI Cost Confirmation Modal
 * Shows approximate Token Credit (TC) cost before any AI operation.
 * The user must click Proceed or Cancel before the operation runs.
 *
 * CREDIT SCALE:
 *   1 TC ≈ 1 full town simulation (100 pop × 12 months)
 *   Rough order-of-magnitude estimates from typical prompt sizes (see server / OpenRouter usage).
 *
 * Cost estimates (in TC):
 *   - Simulation (1 town, 100 pop, 12 months): ~1.0 TC
 *   - Simulation (1 town, 50 pop, 1 month):    ~0.04 TC
 *   - World Sim (3 towns × 100 pop × 12 mo):   ~3.0 TC
 *   - Intake (5 NPCs):                         ~0.03 TC
 *   - Scribe Generate:                         ~0.02 TC
 *   - Custom AI Prompt:                        ~0.01 TC
 */

import { TOKENS_PER_CREDIT, formatWalletTc } from '../constants/credits.js';
import { apiGetUsage } from '../api/settings.js';

/**
 * Cached usage so multiple confirm prompts in quick succession don't all hit the API.
 * Refreshes after every modal open and after every successful operation upstream
 * (callers can manually nudge by calling `refreshUsageCache()` after their action completes).
 */
let usageCache = null;
let usageCachePromise = null;

async function loadUsage(force = false) {
    if (!force && usageCache) return usageCache;
    if (usageCachePromise) return usageCachePromise;
    usageCachePromise = apiGetUsage()
        .then((res) => {
            usageCache = res && res.ok ? res : { ok: false };
            return usageCache;
        })
        .catch(() => ({ ok: false }))
        .finally(() => { usageCachePromise = null; });
    return usageCachePromise;
}

/** Allow callers to invalidate the cache after they spend credits. */
export function refreshUsageCache() {
    usageCache = null;
}

/**
 * Cost estimate lookup table.
 * Each entry returns { tokens, label } given the operation params.
 * `tokens` is the raw internal token estimate; displayed as TC via conversion.
 */
const COST_ESTIMATES = {
    /**
     * Town Simulation: ~1 LLM call per month.
     * Token budget scales with simulated span + roster size.
     */
    simulation: ({ months = 1, population = 50, numTowns = 1 }) => {
        const popFactor = Math.max(1, population / 50);
        const total = Math.round(7600 * popFactor * Math.max(1, months) * numTowns);
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
     * Scribe (Lore, Quest, Dungeon, Item, Trap, Weather generators)
     * Per-type estimates calibrated against observed actual usage.
     * Item / Trap / Weather are short, single-object responses;
     * Lore / Quest / Dungeon are multi-paragraph and run longer prompts/outputs.
     */
    scribe: ({ generatorType = 'content' }) => {
        const tokenBudget = {
            item: 900,
            trap: 900,
            weather: 900,
            lore: 3000,
            quest: 3500,
            dungeon: 4500,
        };
        const labels = {
            lore: 'Lore Scribe', quest: 'Quest Forge', dungeon: 'Dungeon Architect',
            item: 'Item Enchanter', trap: 'Trap Designer', weather: 'Weather Generation',
        };
        return {
            tokens: tokenBudget[generatorType] || 2000,
            label: `AI Scribe — ${labels[generatorType] || 'Content Generation'}`,
        };
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
        const simTokens = Math.round(7600 * popFactor * Math.max(1, months) * numTowns);
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
 * Round a TC value up to the nearest 0.01 EC. Matches the server-side
 * billing bucket — see helpers.php trackTokenUsage().
 */
function roundUpCredits(tc) {
    const n = Number(tc) || 0;
    if (n <= 0) return 0;
    return Math.ceil(n * 100) / 100;
}

/**
 * Format TC into a clean, human-readable string.
 * Always rounds UP to the nearest 0.01 EC so the displayed value matches
 * what the wallet is actually charged.
 * Examples: "1.00", "0.30", "0.01"
 */
function formatCredits(tc) {
    const rounded = roundUpCredits(tc);
    if (rounded >= 10) return rounded.toFixed(0);
    if (rounded >= 1) return rounded.toFixed(2);
    return rounded.toFixed(2);
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

    return new Promise(async (resolve) => {
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
                <div class="ai-cost-balance" id="ai-cost-balance">
                    <span class="ai-cost-balance-label">Your wallet:</span>
                    <span class="ai-cost-balance-value">…</span>
                </div>
                <div class="ai-cost-warn" id="ai-cost-warn" style="display:none"></div>
                <p class="ai-cost-note">1 TC ≈ one full town simulation (100 pop × 12 months). Actual usage may vary.</p>
                <div class="ai-cost-actions">
                    <button class="btn-primary ai-cost-proceed" id="ai-cost-proceed" disabled>✨ Proceed</button>
                    <button class="btn-secondary ai-cost-cancel" id="ai-cost-cancel">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const proceedBtn = overlay.querySelector('#ai-cost-proceed');
        const balanceEl = overlay.querySelector('#ai-cost-balance');
        const warnEl = overlay.querySelector('#ai-cost-warn');

        function cleanup(result) {
            overlay.remove();
            resolve(result);
        }

        proceedBtn.addEventListener('click', () => {
            if (proceedBtn.disabled) return;
            // Invalidate cache: balance changes after every spend.
            refreshUsageCache();
            cleanup(true);
        });
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

        // Load wallet, then unlock or block Proceed.
        try {
            const usage = await loadUsage();
            if (!usage || !usage.ok) {
                // Failed to load — fail-open so users on legacy paths aren't bricked.
                balanceEl.querySelector('.ai-cost-balance-value').textContent = 'unknown';
                proceedBtn.disabled = false;
                return;
            }

            // Compare in raw tokens (integers) to mirror the backend wallet exactly
            // and avoid floating-point boundary glitches around small balances.
            const rawBalance = Number(usage.credit_balance) || 0;
            const balanceTc = rawBalance / TOKENS_PER_CREDIT;
            const hasByok = !!usage.has_byok_key;
            balanceEl.querySelector('.ai-cost-balance-value').textContent =
                `${formatWalletTc(balanceTc)} EC` + (hasByok ? ' (using your own OpenRouter key)' : '');

            // Default: allow proceed once we know the balance. Only the hard-empty
            // branch below re-disables it.
            proceedBtn.disabled = false;

            if (hasByok) {
                // Pays from their own account; never gate.
                return;
            }

            // Hard gate: ONLY block when the wallet is actually empty. The backend
            // refuses any call with balance <= 0 (helpers.php resolveApiKey), and
            // estimates are advisory only — they're routinely off by 2–5×, so we
            // never want to lock someone out who has *some* credit.
            if (rawBalance <= 0) {
                proceedBtn.disabled = true;
                proceedBtn.textContent = '🚫 Insufficient credits';
                warnEl.style.display = '';
                warnEl.innerHTML =
                    `Your wallet is empty. Add credits, or set your own OpenRouter key under <strong>⚙️ Settings</strong> to use your own account (no platform charge).`;
                balanceEl.classList.add('ai-cost-balance-low');
                return;
            }

            // Soft red advisory: estimate exceeds balance, but we still allow the run.
            // Real usage may come in well under the estimate, and if it overshoots
            // the backend caps the deduction at 0 (no overdraft).
            if (rawBalance < tokens) {
                warnEl.style.display = '';
                warnEl.innerHTML =
                    `Heads up — the estimate (~${displayValue} EC) is higher than your current balance (${formatWalletTc(balanceTc)} EC). ` +
                    `Estimates are approximate; you'll only be charged for actual tokens used, capped at your remaining balance.`;
                balanceEl.classList.add('ai-cost-balance-low');
                return;
            }

            // Soft amber: would leave less than 25% headroom after the action.
            // Subtract the rounded-up billed amount, matching server-side bucket billing.
            const billedTc = roundUpCredits(tc);
            if (rawBalance - tokens < tokens * 0.25) {
                warnEl.style.display = '';
                warnEl.classList.add('ai-cost-warn-soft');
                warnEl.textContent = `Heads up — this will leave roughly ${formatWalletTc(Math.max(0, balanceTc - billedTc))} EC.`;
            }
        } catch (e) {
            // Same fail-open path as above
            balanceEl.querySelector('.ai-cost-balance-value').textContent = 'unknown';
            proceedBtn.disabled = false;
        }
    });
}
