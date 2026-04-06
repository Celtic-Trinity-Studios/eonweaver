/**
 * Simulation API module
 */
import { simFetch } from './client.js';
import { apiFetch } from './client.js';

export function apiRunSimulation(townId, months, rules, instructions, numArrivals = 0) {
    return simFetch('run_simulation', { town_id: townId, months, rules, instructions, num_arrivals: numArrivals });
}

export function apiPlanSimulation(townId, months, rules, instructions) {
    return simFetch('plan_simulation', { town_id: townId, months, rules, instructions });
}

export function apiApplySimulation(townId, changes, historyEntry, monthsElapsed = 0) {
    return simFetch('apply_simulation', {
        town_id: townId,
        changes,
        history_entry: historyEntry,
        months_elapsed: monthsElapsed,
    });
}

export function apiRunWorldSimulation(months, rules, instructions) {
    return simFetch('simulate_world', { months, rules, instructions });
}

export function apiSimChunk(townId, monthNum, totalMonths, category, rules, instructions, priorContext, extraParams = {}) {
    return simFetch('simulate_chunk', {
        town_id: townId,
        month_num: monthNum,
        total_months: totalMonths,
        category,
        rules,
        instructions,
        prior_context: priorContext,
        ...extraParams,
    });
}

export function apiDebugLlm() {
    return simFetch('debug_llm', {});
}

export function apiIntakeRoster(townId, numArrivals, rules, instructions) {
    return simFetch('intake_roster', { town_id: townId, num_arrivals: numArrivals, rules, instructions });
}

export function apiIntakeFlesh(townId, stubs, rules) {
    return simFetch('intake_flesh', { town_id: townId, stubs, rules });
}

export function apiIntakeCreature(townId, creatureName, count, instructions) {
    return simFetch('intake_creature', { town_id: townId, creature_name: creatureName, count, instructions });
}

export function apiGetCampaignRules() {
    return apiFetch('get_campaign_rules');
}

export function apiSaveCampaignRules(rulesText, campaignDescription, homebrewSettings = {}) {
    return apiFetch('save_campaign_rules', { method: 'POST', body: { rules_text: rulesText, campaign_description: campaignDescription, homebrew_settings: homebrewSettings } });
}

export function apiAutoAssignSpells(characterId) {
    return simFetch('auto_assign_spells', { character_id: characterId });
}

export function apiAutoAssignSpellsTown(townId, force = false) {
    return simFetch('auto_assign_spells_town', { town_id: townId, force });
}

export function apiQuickLevelUp(townId, characterId) {
    return simFetch('quick_level_up', { town_id: townId, character_id: characterId });
}
