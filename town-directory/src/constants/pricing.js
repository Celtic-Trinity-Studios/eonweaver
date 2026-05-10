/**
 * Fixed wallet prices (raw token units). MUST match town-directory/pricing.php.
 */

/** One intake_flesh call (1–10 stubs). */
export function intakeFleshBatchWalletRaw(stubCount) {
    const n = Math.min(10, Math.max(1, stubCount | 0));
    return 9000 + 550 * n;
}

/** Procedural roster + batched flesh for N town NPCs (wizard default path). */
export function intakeStandardNpcWalletRaw(npcCount) {
    const n = Math.max(0, npcCount | 0);
    let total = 0;
    for (let i = 0; i < n; i += 10) {
        const c = Math.min(10, n - i);
        total += intakeFleshBatchWalletRaw(c);
    }
    return total;
}

/** One AI roster call (creature / LLM roster path). */
export function intakeRosterAiWalletRaw(numArrivals) {
    const n = Math.min(150, Math.max(1, numArrivals | 0));
    return 4000 + 280 * n;
}

/** intake_custom — full AI character JSON. */
export function intakeCustomWalletRaw() {
    return 6500;
}

/** Roster + flesh when both use AI for N arrivals (creature-style path). */
export function intakeFullAiCreatureWalletRaw(n) {
    const c = Math.max(1, n | 0);
    return intakeRosterAiWalletRaw(c) + intakeStandardNpcWalletRaw(c);
}

/** sim_run months=0: one OpenRouter call per forced arrival (matches PHP per-stub flesh rate). */
export function simForcedIntakeWalletRaw(arrivalCount) {
    const n = Math.max(1, arrivalCount | 0);
    return n * intakeFleshBatchWalletRaw(1);
}

/** Main town simulation bundle (sim_run / sim_single_town / sim_world per town). */
export function simRunWalletRaw(months, population, numTowns = 1) {
    const m = Math.max(1, months | 0);
    const popFactor = Math.max(1, (population | 0) / 50);
    const nt = Math.max(1, numTowns | 0);
    return Math.round(7600 * popFactor * m * nt);
}

const SIM_CHUNK = {
    story: 5200,
    population: 5600,
    character_build: 6400,
    social: 5900,
    stats: 4900,
};

export function simChunkWalletRaw(category) {
    return SIM_CHUNK[category] ?? 5000;
}

export function portraitPromptWalletRaw() {
    return 1900;
}

export function weatherYearWalletRaw() {
    return 5200;
}

export function randomEncounterWalletRaw() {
    return 3400;
}

export function lootGenWalletRaw() {
    return 2900;
}

export function magicShopWalletRaw() {
    return 4000;
}

export function simPlanningWalletRaw(numTowns, months) {
    const nt = Math.max(1, numTowns | 0);
    const mo = Number(months) || 0;
    if (mo <= 1) {
        return 1800 * nt;
    }
    return 2500 * nt;
}

/**
 * Single-town SimulationView total: months===0 → forced-arrival pricing (PHP uses max(1, num_arrivals)).
 * months>=1 → one sim_run charge per calendar month (same as the client’s 1-month API loop).
 */
export function singleTownSimTotalWalletRaw(months, population, intakeCount = 0) {
    const pop = Math.max(1, Number(population) || 0);
    const m = Number(months) || 0;
    const ic = Math.max(0, Number(intakeCount) || 0);
    if (m === 0) {
        return simForcedIntakeWalletRaw(Math.max(1, ic));
    }
    if (m <= 1) {
        return simRunWalletRaw(Math.max(1, m), pop, 1);
    }
    let total = 0;
    for (let i = 0; i < m; i++) {
        total += simRunWalletRaw(1, pop, 1);
    }
    return total;
}

/** Dashboard quick world sim: one sim_run per town for the full month span. */
export function worldSimulateDashboardWalletRaw(months, townPopulations) {
    const m = Math.max(1, Number(months) || 0);
    const pops = Array.isArray(townPopulations) && townPopulations.length
        ? townPopulations.map((p) => Math.max(1, Number(p) || 0))
        : [50];
    return pops.reduce((sum, pop) => sum + simRunWalletRaw(m, pop, 1), 0);
}

/**
 * WorldSimulateView: optional intake per town, planning per town when months>1,
 * then one sim_run per town per calendar month (matches actual API sequence).
 */
export function worldSimulatePhasedWalletRaw(months, townPopulations, intakeCount = 0) {
    const M = Math.max(1, Number(months) || 0);
    const pops = Array.isArray(townPopulations) && townPopulations.length
        ? townPopulations.map((p) => Math.max(1, Number(p) || 0))
        : [50];
    const ic = Math.max(0, Number(intakeCount) || 0);
    let total = 0;
    if (ic > 0) {
        for (let i = 0; i < pops.length; i++) {
            total += simForcedIntakeWalletRaw(ic);
        }
    }
    if (M > 1) {
        for (let i = 0; i < pops.length; i++) {
            total += simPlanningWalletRaw(1, M);
        }
    }
    for (let i = 0; i < pops.length; i++) {
        for (let mo = 0; mo < M; mo++) {
            total += simRunWalletRaw(1, pops[i], 1);
        }
    }
    return total;
}

const SCRIBE = {
    item: 900,
    trap: 900,
    weather: 900,
    lore: 3000,
    quest: 3500,
    dungeon: 4500,
};

export function scribeWalletRaw(generatorType) {
    return SCRIBE[generatorType] ?? 2000;
}

export function levelUpWalletRaw() {
    return 2500;
}

export function customPromptWalletRaw() {
    return 2000;
}

export function autoSpellsWalletRaw(casterCount) {
    const n = Math.max(1, casterCount | 0);
    return Math.max(1300, Math.round(n * 200));
}
