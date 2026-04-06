/**
 * Eon Weaver — Rules Adapter
 * Routes game mechanic calls to the correct edition engine.
 * All edition-specific logic goes through this adapter so views/components
 * don't need to know which edition is active.
 */
import * as rules35e from './rules35e.js';
import * as combat35e from './combat35e.js';
import { getState } from '../stores/appState.js';

/* ── Edition Engine Registry ───────────────────────────── */
const engines = {
    '3.5e': { rules: rules35e, combat: combat35e },
    // '5e':   { rules: rules5e,  combat: combat5e  },
    // '5e2024': { rules: rules5e2024, combat: combat5e2024 },
};

/**
 * Get the current campaign's edition.
 * Falls back to '3.5e' if not set.
 */
export function getEdition() {
    const state = getState();
    return state.activeCampaign?.edition || '3.5e';
}

/**
 * Get the rules engine for the current (or specified) edition.
 */
export function getRulesEngine(edition) {
    const ed = edition || getEdition();
    return engines[ed]?.rules || engines['3.5e'].rules;
}

/**
 * Get the combat engine for the current (or specified) edition.
 */
export function getCombatEngine(edition) {
    const ed = edition || getEdition();
    return engines[ed]?.combat || engines['3.5e'].combat;
}

/**
 * Check if the current edition is a specific one.
 */
export function isEdition(ed) {
    return getEdition() === ed;
}

/**
 * Get all supported edition keys.
 */
export function getSupportedEditions() {
    return Object.keys(engines);
}

/* ── Convenience re-exports (use current edition) ──────── */
// These proxy to the active rules engine so callers don't need to import the adapter pattern everywhere.

export function parseClass(cls) { return getRulesEngine().parseClass(cls); }
export function abilityMod(score) { return getRulesEngine().abilityMod(score); }
export function calcBAB(className, level) { return getRulesEngine().calcBAB(className, level); }
export function calcBaseSave(level, isGood) { return getRulesEngine().calcBaseSave(level, isGood); }
export function xpForLevel(level) { return getRulesEngine().xpForLevel(level); }
export function levelFromXP(xp) { return getRulesEngine().levelFromXP(xp); }
export function parseGearWeapons(gear, character) { return getCombatEngine().parseGearWeapons(gear, character); }
