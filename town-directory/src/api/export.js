import { apiFetch } from './client.js';

/**
 * Fetch a full town campaign-planning export payload.
 * @param {number|string} townId
 */
export function apiTownCampaignExport(townId) {
  return apiFetch('town_campaign_export', {
    params: { town_id: townId },
    cache: 'no-store',
  });
}
