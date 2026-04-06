/**
 * Encounter System API module
 */
import { apiFetch } from './client.js';

// ── Party ──────────────────────────────────────────
export function apiGetParty() {
    return apiFetch('get_party');
}

export function apiAddPartyMember(characterId) {
    return apiFetch('add_party_member', { method: 'POST', body: { character_id: characterId } });
}

export function apiRemovePartyMember(characterId) {
    return apiFetch('remove_party_member', { method: 'POST', body: { character_id: characterId } });
}

// ── Encounters ─────────────────────────────────────
export function apiGetEncounters() {
    return apiFetch('get_encounters');
}

export function apiCreateEncounter(name, description = '') {
    return apiFetch('create_encounter', { method: 'POST', body: { name, description } });
}

export function apiGetEncounter(id) {
    return apiFetch(`get_encounter&id=${id}`);
}

export function apiDeleteEncounter(encounterId) {
    return apiFetch('delete_encounter', { method: 'POST', body: { encounter_id: encounterId } });
}

export function apiUpdateEncounter(encounterId, updates) {
    return apiFetch('update_encounter', { method: 'POST', body: { encounter_id: encounterId, ...updates } });
}

// ── Encounter Groups ──────────────────────────────
export function apiCreateEncounterGroup(encounterId, name) {
    return apiFetch('create_encounter_group', { method: 'POST', body: { encounter_id: encounterId, name } });
}

export function apiRenameEncounterGroup(groupId, name) {
    return apiFetch('rename_encounter_group', { method: 'POST', body: { group_id: groupId, name } });
}

export function apiDeleteEncounterGroup(groupId) {
    return apiFetch('delete_encounter_group', { method: 'POST', body: { group_id: groupId } });
}

// ── Participants ──────────────────────────────────
export function apiAddParticipant(encounterId, characterId, side = 'enemy', groupId = null) {
    return apiFetch('add_participant', { method: 'POST', body: { encounter_id: encounterId, character_id: characterId, side, group_id: groupId } });
}

export function apiRemoveParticipant(participantId) {
    return apiFetch('remove_participant', { method: 'POST', body: { participant_id: participantId } });
}

export function apiUpdateParticipant(participantId, updates) {
    return apiFetch('update_participant', { method: 'POST', body: { participant_id: participantId, ...updates } });
}
