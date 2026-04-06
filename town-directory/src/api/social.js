/**
 * Eon Weaver — Social Systems API
 * CRUD operations for relationships, factions, incidents, memories, and reputation.
 */
import { apiFetch } from './client.js';

/* ── Bulk Fetch ──────────────────────────────────────────── */

export async function apiGetSocialData(townId) {
    return apiFetch('get_social_data', { params: { town_id: townId } });
}

/* ── Relationships ───────────────────────────────────────── */

export async function apiSaveRelationship(data) {
    return apiFetch('save_relationship', { method: 'POST', body: data });
}

export async function apiDeleteRelationship(id) {
    return apiFetch('delete_relationship', { method: 'POST', body: { id } });
}

/* ── Memories ────────────────────────────────────────────── */

export async function apiGetMemories(characterId) {
    const res = await apiFetch('get_memories', { params: { character_id: characterId } });
    return res.memories || [];
}

export async function apiSaveMemory(data) {
    return apiFetch('save_memory', { method: 'POST', body: data });
}

export async function apiDeleteMemory(id) {
    return apiFetch('delete_memory', { method: 'POST', body: { id } });
}

/* ── Factions ────────────────────────────────────────────── */

export async function apiGetFactions(townId) {
    const res = await apiFetch('get_factions', { params: { town_id: townId } });
    return res.factions || [];
}

export async function apiSaveFaction(data) {
    return apiFetch('save_faction', { method: 'POST', body: data });
}

export async function apiDeleteFaction(id) {
    return apiFetch('delete_faction', { method: 'POST', body: { id } });
}

export async function apiSaveFactionMember(data) {
    return apiFetch('save_faction_member', { method: 'POST', body: data });
}

export async function apiDeleteFactionMember(factionId, characterId) {
    return apiFetch('delete_faction_member', { method: 'POST', body: { faction_id: factionId, character_id: characterId } });
}

/* ── Faction Relations (inter-faction diplomacy) ────────── */

export async function apiSaveFactionRelation(data) {
    return apiFetch('save_faction_relation', { method: 'POST', body: data });
}

export async function apiDeleteFactionRelation(factionId, targetFactionId) {
    return apiFetch('delete_faction_relation', { method: 'POST', body: { faction_id: factionId, target_faction_id: targetFactionId } });
}

export async function apiGetIncidents(townId) {
    const res = await apiFetch('get_incidents', { params: { town_id: townId } });
    return res.incidents || [];
}

export async function apiSaveIncident(data) {
    return apiFetch('save_incident', { method: 'POST', body: data });
}

export async function apiDeleteIncident(id) {
    return apiFetch('delete_incident', { method: 'POST', body: { id } });
}

export async function apiSaveIncidentParticipant(data) {
    return apiFetch('save_incident_participant', { method: 'POST', body: data });
}

export async function apiDeleteIncidentParticipant(incidentId, characterId) {
    return apiFetch('delete_incident_participant', { method: 'POST', body: { incident_id: incidentId, character_id: characterId } });
}

export async function apiSaveClue(data) {
    return apiFetch('save_clue', { method: 'POST', body: data });
}

export async function apiDeleteClue(id) {
    return apiFetch('delete_clue', { method: 'POST', body: { id } });
}

/* ── Reputation ──────────────────────────────────────────── */

export async function apiGetReputation(townId) {
    const res = await apiFetch('get_reputation', { params: { town_id: townId } });
    return res.reputation || [];
}

export async function apiSaveReputation(data) {
    return apiFetch('save_reputation', { method: 'POST', body: data });
}

export async function apiDeleteReputation(id) {
    return apiFetch('delete_reputation', { method: 'POST', body: { id } });
}
