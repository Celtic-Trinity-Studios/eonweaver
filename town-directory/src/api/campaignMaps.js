import { apiFetch } from './client.js';

const _base = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
const UPLOAD_URL = `${_base}/upload_campaign_map.php`;

export function apiListCampaignMaps() {
  return apiFetch('list_campaign_maps');
}

export function apiGetCampaignMap(id) {
  return apiFetch('get_campaign_map', { params: { id } });
}

export function apiCampaignMapLinkOptions() {
  return apiFetch('campaign_map_link_options');
}

export function apiSaveCampaignMap(payload) {
  return apiFetch('save_campaign_map', { method: 'POST', body: payload });
}

export function apiDeleteCampaignMap(id) {
  return apiFetch('delete_campaign_map', { method: 'POST', body: { id } });
}

export function apiSaveCampaignMapPoi(payload) {
  return apiFetch('save_campaign_map_poi', { method: 'POST', body: payload });
}

export function apiDeleteCampaignMapPoi(id) {
  return apiFetch('delete_campaign_map_poi', { method: 'POST', body: { id } });
}

/** Root-relative URL so images load from /campaign-maps/:id as well as /. */
export function campaignMapAssetUrl(url) {
  if (!url) return '';
  if (/^(https?:|data:)/i.test(url)) return url;
  const path = String(url).replace(/^\/+/, '');
  return `${_base}/${path}`;
}

export async function apiUploadCampaignMap(mapId, file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('map_id', String(mapId));
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
        'Upload endpoint returned the app page instead of JSON. On the server, upload_campaign_map.php is missing or blocked—redeploy including that file.'
      );
    }
    throw new Error(`Upload failed (${res.status}): ${text.slice(0, 200) || 'invalid response'}`);
  }
  if (!res.ok || !data.ok || data.error) {
    throw new Error(data.error || `Upload failed (${res.status})`);
  }
  return data;
}
