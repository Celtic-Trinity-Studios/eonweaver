/**
 * Eon Weaver — AI Cost Confirmation Modal
 * Shows Token Credit (EC) cost before any AI operation.
 * The user must click Proceed or Cancel before the operation runs.
 *
 * CREDIT SCALE:
 *   1 EC (display) maps from raw wallet tokens via TOKENS_PER_CREDIT in credits.js.
 *   All operations listed here use fixed catalog prices (see pricing.php / constants/pricing.js);
 *   the modal shows exact debits where exactPrice is true.
 */

import { TOKENS_PER_CREDIT, formatWalletTc } from '../constants/credits.js';
import {
    intakeStandardNpcWalletRaw,
    intakeFullAiCreatureWalletRaw,
    simForcedIntakeWalletRaw,
    singleTownSimTotalWalletRaw,
    worldSimulatePhasedWalletRaw,
    worldSimulateDashboardWalletRaw,
    scribeWalletRaw,
    levelUpWalletRaw,
    customPromptWalletRaw,
    autoSpellsWalletRaw,
    simPlanningWalletRaw,
} from '../constants/pricing.js';
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
     * Town Simulation (SimulationView): matches sim_run sequence — intake mode uses per-arrival
     * fixed pricing; month mode uses one catalog debit per API call (1 month per call when span > 1).
     */
    simulation: ({ months = 1, population = 50, intakeCount = 0 } = {}) => {
        const m = Number(months) || 0;
        const pop = Math.max(1, Number(population) || 50);
        const ic = Math.max(0, Number(intakeCount) || 0);
        const tokens = singleTownSimTotalWalletRaw(m, pop, ic);
        let label;
        if (m === 0) {
            label = `Intake mode (${Math.max(1, ic)} arrival${Math.max(1, ic) > 1 ? 's' : ''})`;
        } else if (m <= 1) {
            label = `${m} month — ~${pop} residents`;
        } else {
            label = `${m} months (${m} API calls) — ~${pop} residents`;
        }
        return { tokens, label: `Simulation — ${label}`, exactPrice: true };
    },

    /**
     * Town setup intake (must match pricing.php). Default: procedural roster + batched flesh only.
     * Pass aiRoster: true if instructions force an LLM roster for every arrival (creature-style path).
     * simForced: sim_run months=0 forced arrivals (per-arrival debits), not wizard intake.
     */
    intake: ({ count = 1, aiRoster = false, simForced = false } = {}) => {
        const n = Math.max(1, count);
        const tokens = simForced
            ? simForcedIntakeWalletRaw(n)
            : (aiRoster ? intakeFullAiCreatureWalletRaw(n) : intakeStandardNpcWalletRaw(n));
        return {
            tokens,
            label: `Intake — ${count} NPC${count > 1 ? 's' : ''}`,
            exactPrice: true,
        };
    },

    levelUp: () => ({
        tokens: levelUpWalletRaw(),
        label: 'AI Level Up — 1 character',
        exactPrice: true,
    }),

    scribe: ({ generatorType = 'content' }) => {
        const labels = {
            lore: 'Lore Scribe', quest: 'Quest Forge', dungeon: 'Dungeon Architect',
            item: 'Item Enchanter', trap: 'Trap Designer', weather: 'Weather Generation',
        };
        return {
            tokens: scribeWalletRaw(generatorType),
            label: `AI Scribe — ${labels[generatorType] || 'Content Generation'}`,
            exactPrice: true,
        };
    },

    customPrompt: () => ({
        tokens: customPromptWalletRaw(),
        label: 'AI Character Generation',
        exactPrice: true,
    }),

    autoSpells: ({ count = 1 }) => {
        const c = Math.max(1, Number(count) || 1);
        return {
            tokens: autoSpellsWalletRaw(c),
            label: `Auto-assign Spells — ${c} caster${c > 1 ? 's' : ''}`,
            exactPrice: true,
        };
    },

    /** One sim_plan call (per town in world sim); numTowns is the argument passed to pricing.php. */
    planning: ({ numTowns = 1, months = 2 } = {}) => {
        const nt = Math.max(1, Number(numTowns) || 1);
        const mo = Number(months) || 1;
        return {
            tokens: simPlanningWalletRaw(nt, mo),
            label: `Simulation Planning — ${nt} town${nt > 1 ? 's' : ''} × ${mo} month${mo > 1 ? 's' : ''}`,
            exactPrice: true,
        };
    },

    /**
     * World simulation: `billingMode` `phased` (WorldSimulateView) or `dashboard` (one sim_run per town).
     */
    worldSimulation: ({ months = 1, towns = [], intakeCount = 0, billingMode = 'phased' } = {}) => {
        const numTowns = towns.length || 1;
        const pops = towns.length > 0
            ? towns.map((t) => Math.max(1, t.population || 50))
            : [50];
        const m = Math.max(1, Number(months) || 1);
        const ic = Math.max(0, Number(intakeCount) || 0);
        const tokens = billingMode === 'dashboard'
            ? worldSimulateDashboardWalletRaw(m, pops)
            : worldSimulatePhasedWalletRaw(m, pops, ic);
        return {
            tokens,
            label: `World Simulation — ${numTowns} town${numTowns > 1 ? 's' : ''} × ${m} month${m > 1 ? 's' : ''}`,
            exactPrice: true,
        };
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
 * Round a TC value up to the nearest 0.01 EC (legacy display path when exactPrice is false).
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

    const est = estimator(params);
    const tokens = est.tokens;
    const label = est.label;
    const exactPrice = !!est.exactPrice;

    // Free operations skip the modal
    if (tokens === 0) return Promise.resolve(true);

    const tc = tokensToCredits(tokens);
    const displayValue = exactPrice ? formatWalletTc(tc) : formatCredits(tc);
    const prefix = exactPrice || displayValue.startsWith('<') ? '' : '~';
    const billedTcForHeadroom = exactPrice ? tc : roundUpCredits(tc);
    const modalTitle = exactPrice ? 'AI Credit Price' : 'AI Credit Estimate';
    const modalNote = exactPrice
        ? 'This is the exact wallet debit for this action (fixed catalog pricing). Provider token counts are still logged for analytics.'
        : '1 TC ≈ one full town simulation (100 pop × 12 months). Actual usage may vary.';

    return new Promise(async (resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal ai-cost-modal';
        overlay.style.display = 'flex';

        overlay.innerHTML = `
            <div class="modal-content ai-cost-content">
                <div class="ai-cost-icon">🪙</div>
                <h2 class="ai-cost-title">${modalTitle}</h2>
                <p class="ai-cost-operation">${label}</p>
                <div class="ai-cost-amount">
                    <span class="ai-cost-value">${prefix}${displayValue}</span>
                    <span class="ai-cost-unit">Eon Credits (EC)</span>
                </div>
                <div class="ai-cost-balance" id="ai-cost-balance">
                    <span class="ai-cost-balance-label">Your wallet:</span>
                    <span class="ai-cost-balance-value">…</span>
                </div>
                <div class="ai-cost-warn" id="ai-cost-warn" style="display:none"></div>
                <p class="ai-cost-note">${modalNote}</p>
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
            balanceEl.querySelector('.ai-cost-balance-value').textContent =
                `${formatWalletTc(balanceTc)} EC`;

            proceedBtn.disabled = false;

            if (rawBalance <= 0) {
                proceedBtn.disabled = true;
                proceedBtn.textContent = '🚫 Insufficient credits';
                warnEl.style.display = '';
                warnEl.innerHTML =
                    'Your wallet is empty. Top up credits or upgrade your plan on <strong>💎 Plans</strong>.';
                balanceEl.classList.add('ai-cost-balance-low');
                return;
            }

            // Soft red advisory: estimate exceeds balance, but we still allow the run.
            // Real usage may come in well under the estimate, and if it overshoots
            // the backend caps the deduction at 0 (no overdraft).
            if (rawBalance < tokens) {
                warnEl.style.display = '';
                warnEl.innerHTML = exactPrice
                    ? `Heads up — this action debits a fixed <strong>${displayValue} EC</strong>, but your balance is <strong>${formatWalletTc(balanceTc)} EC</strong>. The run may fail when the server checks credits.`
                    : `Heads up — the estimate (~${displayValue} EC) is higher than your current balance (${formatWalletTc(balanceTc)} EC). ` +
                      `Estimates are approximate; you'll only be charged for actual tokens used, capped at your remaining balance.`;
                balanceEl.classList.add('ai-cost-balance-low');
                return;
            }

            // Soft amber: would leave less than 25% headroom after the action.
            if (rawBalance - tokens < tokens * 0.25) {
                warnEl.style.display = '';
                warnEl.classList.add('ai-cost-warn-soft');
                warnEl.textContent = `Heads up — this will leave roughly ${formatWalletTc(Math.max(0, balanceTc - billedTcForHeadroom))} EC.`;
            }
        } catch (e) {
            // Same fail-open path as above
            balanceEl.querySelector('.ai-cost-balance-value').textContent = 'unknown';
            proceedBtn.disabled = false;
        }
    });
}
