import { apiFetch } from './client.js';

const _base = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
const UPLOAD_URL = `${_base}/upload_encounter_table.php`;

export function apiGetEncounterTable(encounterId) {
  return apiFetch('get_encounter_table', { params: { encounter_id: encounterId } });
}

export function apiSaveEncounterTableToken(encounterId, characterId, gridX, gridY) {
  return apiFetch('save_encounter_table_token', {
    method: 'POST',
    body: { encounter_id: encounterId, character_id: characterId, grid_x: gridX, grid_y: gridY },
  });
}

export function apiDeleteEncounterTableToken(encounterId, characterId) {
  return apiFetch('delete_encounter_table_token', {
    method: 'POST',
    body: { encounter_id: encounterId, character_id: characterId },
  });
}

export function apiSaveEncounterTableHp(encounterId, characterId, hp, status) {
  return apiFetch('save_encounter_table_hp', {
    method: 'POST',
    body: { encounter_id: encounterId, character_id: characterId, hp, status },
  });
}

export function apiClearEncounterTableImage(encounterId) {
  return apiFetch('clear_encounter_table_image', {
    method: 'POST',
    body: { encounter_id: encounterId },
  });
}

export function apiExportEncounterTableFoundry(encounterId) {
  return apiFetch('export_encounter_table_foundry', { params: { encounter_id: encounterId } });
}

export function encounterTableAssetUrl(url) {
  if (!url) return '';
  if (/^(https?:|data:)/i.test(url)) return url;
  const path = String(url).replace(/^\/+/, '');
  return `${_base}/${path}`;
}

export async function apiUploadEncounterTable(encounterId, file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('encounter_id', String(encounterId));
  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    body: formData,
    credentials: 'same-origin',
  });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch (e) {
    const looksLikeSpa = /<html[\s>]|<!doctype html/i.test(text);
    if (looksLikeSpa) {
      throw new Error(
        'Upload endpoint returned the app page instead of JSON. On the server, upload_encounter_table.php is missing or blocked—redeploy including that file.'
      );
    }
    throw new Error(`Upload failed (${res.status}): ${text.slice(0, 200) || 'invalid response'}`);
  }
  if (!res.ok || !data.ok || data.error) {
    throw new Error(data.error || `Upload failed (${res.status})`);
  }
  return data;
}
