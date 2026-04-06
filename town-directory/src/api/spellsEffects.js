/**
 * Eon Weaver — Spellcasting & Effects API Client
 * CRUD operations for spells known, prepared, spellbook, active effects, and level history.
 */
import { apiFetch } from './client.js';

/* ── Spells Known (Spontaneous Casters) ──────────────── */

export async function apiGetSpellsKnown(characterId) {
    const res = await apiFetch('get_spells_known', { params: { character_id: characterId } });
    return res.spells || [];
}

export async function apiSaveSpellKnown(data) {
    return apiFetch('save_spell_known', { method: 'POST', body: data });
}

export async function apiDeleteSpellKnown(id) {
    return apiFetch('delete_spell_known', { method: 'POST', body: { id } });
}

/* ── Spells Prepared (Prepared Casters) ──────────────── */

export async function apiGetSpellsPrepared(characterId) {
    const res = await apiFetch('get_spells_prepared', { params: { character_id: characterId } });
    return res.spells || [];
}

export async function apiSaveSpellPrepared(data) {
    return apiFetch('save_spell_prepared', { method: 'POST', body: data });
}

export async function apiDeleteSpellPrepared(id) {
    return apiFetch('delete_spell_prepared', { method: 'POST', body: { id } });
}

export async function apiClearSpellsPrepared(characterId) {
    return apiFetch('clear_spells_prepared', { method: 'POST', body: { character_id: characterId } });
}

export async function apiMarkSpellUsed(id, used = true) {
    return apiFetch('mark_spell_used', { method: 'POST', body: { id, used: used ? 1 : 0 } });
}

export async function apiRestAllSpells(characterId) {
    return apiFetch('rest_all_spells', { method: 'POST', body: { character_id: characterId } });
}

/* ── Wizard Spellbook ────────────────────────────────── */

export async function apiGetSpellbook(characterId) {
    const res = await apiFetch('get_spellbook', { params: { character_id: characterId } });
    return res.spells || [];
}

export async function apiSaveSpellbookEntry(data) {
    return apiFetch('save_spellbook_entry', { method: 'POST', body: data });
}

export async function apiDeleteSpellbookEntry(id) {
    return apiFetch('delete_spellbook_entry', { method: 'POST', body: { id } });
}

/* ── Active Effects (Conditions/Buffs) ───────────────── */

export async function apiGetActiveEffects(characterId) {
    const res = await apiFetch('get_active_effects', { params: { character_id: characterId } });
    return res.effects || [];
}

export async function apiSaveActiveEffect(data) {
    return apiFetch('save_active_effect', { method: 'POST', body: data });
}

export async function apiDeleteActiveEffect(id) {
    return apiFetch('delete_active_effect', { method: 'POST', body: { id } });
}

export async function apiClearActiveEffects(characterId) {
    return apiFetch('clear_active_effects', { method: 'POST', body: { character_id: characterId } });
}

/* ── Level History (Multiclassing) ───────────────────── */

export async function apiGetLevelHistory(characterId) {
    const res = await apiFetch('get_level_history', { params: { character_id: characterId } });
    return res.levels || [];
}

export async function apiSaveLevelHistory(data) {
    return apiFetch('save_level_history', { method: 'POST', body: data });
}

/* ── Structured Level Up ─────────────────────────────── */

export async function apiApplyLevelUp(data) {
    return apiFetch('apply_level_up', { method: 'POST', body: data });
}
