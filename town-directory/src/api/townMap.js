import { apiFetch } from './client.js';

const _base = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
const UPLOAD_URL = `${_base}/upload_town_map.php`;

export function apiGetTownMap(townId) {
  return apiFetch('get_town_map', { params: { town_id: townId } });
}

export function apiSaveTownMapPin(townId, characterId, xPct, yPct) {
  return apiFetch('save_town_map_pin', {
    method: 'POST',
    body: { town_id: townId, character_id: characterId, x_pct: xPct, y_pct: yPct },
  });
}

export function apiDeleteTownMapPin(townId, characterId) {
  return apiFetch('delete_town_map_pin', {
    method: 'POST',
    body: { town_id: townId, character_id: characterId },
  });
}

export function apiClearTownMapImage(townId) {
  return apiFetch('clear_town_map_image', {
    method: 'POST',
    body: { town_id: townId },
  });
}

export function apiSaveTownMapProp(body) {
  return apiFetch('save_town_map_prop', { method: 'POST', body });
}

export function apiDeleteTownMapProp(townId, propId) {
  return apiFetch('delete_town_map_prop', {
    method: 'POST',
    body: { town_id: townId, id: propId },
  });
}

export function townMapAssetUrl(url) {
  if (!url) return '';
  if (/^(https?:|data:)/i.test(url)) return url;
  const path = String(url).replace(/^\/+/, '');
  return `${_base}/${path}`;
}

export async function apiUploadTownMap(townId, file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('town_id', String(townId));
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
      throw new Error('Upload endpoint returned the app page instead of JSON. upload_town_map.php is missing on the server.');
    }
    throw new Error(`Upload failed (${res.status}): ${text.slice(0, 200) || 'invalid response'}`);
  }
  if (!res.ok || !data.ok || data.error) {
    throw new Error(data.error || `Upload failed (${res.status})`);
  }
  return data;
}
