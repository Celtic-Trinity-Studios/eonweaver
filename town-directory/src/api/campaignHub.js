import { apiFetch } from './client.js';

export function apiHubOverview() {
  return apiFetch('hub_overview');
}

export function apiHubBundle() {
  return apiFetch('hub_bundle');
}

export function apiHubSessionSave(session) {
  return apiFetch('hub_session_save', { method: 'POST', body: session });
}

export function apiHubSessionDelete(id) {
  return apiFetch('hub_session_delete', { method: 'POST', body: { id } });
}

export function apiHubBeatSave(beat) {
  return apiFetch('hub_beat_save', { method: 'POST', body: beat });
}

export function apiHubBeatDelete(id) {
  return apiFetch('hub_beat_delete', { method: 'POST', body: { id } });
}

export function apiHubTableSave(table) {
  return apiFetch('hub_table_save', { method: 'POST', body: table });
}

export function apiHubTableDelete(id) {
  return apiFetch('hub_table_delete', { method: 'POST', body: { id } });
}

export function apiHubTableRoll(id) {
  return apiFetch('hub_table_roll', { method: 'POST', body: { id } });
}

export function apiHubDraftSave(draft) {
  return apiFetch('hub_draft_save', { method: 'POST', body: draft });
}

export function apiHubDraftDelete(id) {
  return apiFetch('hub_draft_delete', { method: 'POST', body: { id } });
}

export function apiHubPlayerBoard(campaignId) {
  return apiFetch('hub_player_board', { params: { campaign_id: campaignId } });
}
