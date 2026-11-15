import { apiFetch } from './client.js';

export function apiTableStatus() {
  return apiFetch('gw_table_status');
}

export function apiPortalRead() {
  return apiFetch('gw_portal_read', { method: 'POST', body: {} });
}

export function apiCompanions(characterId) {
  return apiFetch('gw_companions', { params: { character_id: characterId } });
}

export function apiCompanionSave(companion) {
  return apiFetch('gw_companion_save', { method: 'POST', body: companion });
}

export function apiCompanionDelete(id) {
  return apiFetch('gw_companion_delete', { method: 'POST', body: { id } });
}

export function apiBattlemaps() {
  return apiFetch('gw_battlemaps');
}

export function apiBattlemapSave(map) {
  return apiFetch('gw_battlemap_save', { method: 'POST', body: map });
}

export function apiBattlemapProcedural(title, rooms = 6) {
  return apiFetch('gw_battlemap_procedural', { method: 'POST', body: { title, rooms } });
}

export function apiBattlemapDelete(id) {
  return apiFetch('gw_battlemap_delete', { method: 'POST', body: { id } });
}

export function apiMarkSave(mark) {
  return apiFetch('gw_mark_save', { method: 'POST', body: mark });
}

export function apiMarkDelete(id) {
  return apiFetch('gw_mark_delete', { method: 'POST', body: { id } });
}

export function apiBlocks(ownerType, ownerId) {
  return apiFetch('gw_blocks', { params: { owner_type: ownerType, owner_id: ownerId } });
}

export function apiBlockSave(block) {
  return apiFetch('gw_block_save', { method: 'POST', body: block });
}

export function apiBlockDelete(id) {
  return apiFetch('gw_block_delete', { method: 'POST', body: { id } });
}

export function apiQueueGeneration(job) {
  return apiFetch('gw_queue_generation', { method: 'POST', body: job });
}

export function apiFileRecap(sessionId) {
  return apiFetch('gw_file_recap', { method: 'POST', body: { id: sessionId } });
}

export function apiSeedSessions(draftId) {
  return apiFetch('gw_seed_sessions', { method: 'POST', body: { id: draftId } });
}

export function apiShareCreate(targetType, targetId, label = '') {
  return apiFetch('gw_share_create', { method: 'POST', body: { target_type: targetType, target_id: targetId, label } });
}

export function apiShareRead(token) {
  return apiFetch('gw_share_read', { params: { token } });
}

export function apiHomebrewAccess() {
  return apiFetch('gw_homebrew_access');
}

export function apiHomebrewAccessSet(contentType, contentId, playerOk) {
  return apiFetch('gw_homebrew_access_set', {
    method: 'POST',
    body: { content_type: contentType, content_id: contentId, player_ok: playerOk },
  });
}

export function apiPlayerOptions(campaignId = 0) {
  return apiFetch('gw_player_options', { params: campaignId ? { campaign_id: campaignId } : {} });
}

export function apiCreatePc(body) {
  return apiFetch('gw_create_pc', { method: 'POST', body });
}

export function apiSetPortrait(characterId, portraitUrl) {
  return apiFetch('gw_set_portrait', { method: 'POST', body: { character_id: characterId, portrait_url: portraitUrl } });
}

export function apiFolders() {
  return apiFetch('gw_folders');
}

export function apiFileFolder(fileId, folder) {
  return apiFetch('gw_file_folder', { method: 'POST', body: { file_id: fileId, folder } });
}
