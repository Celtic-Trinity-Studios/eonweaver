import { apiFetch } from './client.js';

const _base = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
const UPLOAD_URL = `${_base}/upload_world_map.php`;

export function apiGetWorldMap() {
  return apiFetch('get_world_map');
}

export function apiSaveWorldMapSettings(payload) {
  return apiFetch('save_world_map_settings', { method: 'POST', body: payload });
}

export function apiSaveWorldMapPin(townId, xPct, yPct) {
  return apiFetch('save_world_map_pin', {
    method: 'POST',
    body: { town_id: townId, x_pct: xPct, y_pct: yPct },
  });
}

export function apiDeleteWorldMapPin(townId) {
  return apiFetch('delete_world_map_pin', {
    method: 'POST',
    body: { town_id: townId },
  });
}

export function apiEstimateTravelTime(fromTownId, toTownId) {
  return apiFetch('estimate_travel_time', {
    params: { from_town_id: fromTownId, to_town_id: toTownId },
  });
}

export function apiSetWorldMapTownSkip(townId, skip) {
  return apiFetch('set_world_map_town_skip', {
    method: 'POST',
    body: { town_id: townId, skip: !!skip },
  });
}

export function apiApplyWorldMapCalibration(body) {
  return apiFetch('apply_world_map_calibration', { method: 'POST', body });
}

export async function apiUploadWorldMap(file) {
  const formData = new FormData();
  formData.append('file', file);
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
        'Upload endpoint returned the app page instead of JSON. On the server, upload_world_map.php is missing or blocked—redeploy including that file.'
      );
    }
    throw new Error(`Upload failed (${res.status}): ${text.slice(0, 200) || 'invalid response'}`);
  }
  if (!res.ok || !data.ok || data.error) {
    throw new Error(data.error || `Upload failed (${res.status})`);
  }
  return data;
}
