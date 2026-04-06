/**
 * Campaigns API module
 * Full CRUD for multi-campaign support.
 */
import { apiFetch } from './client.js';

export function apiGetCampaigns() {
    return apiFetch('campaigns');
}

export function apiCreateCampaign(name, dnd_edition = '3.5e', description = '') {
    return apiFetch('create_campaign', { method: 'POST', body: { name, dnd_edition, description } });
}

export function apiUpdateCampaign(campaignId, updates) {
    return apiFetch('update_campaign', { method: 'POST', body: { campaign_id: campaignId, ...updates } });
}

export function apiDeleteCampaign(campaignId) {
    return apiFetch('delete_campaign', { method: 'POST', body: { campaign_id: campaignId } });
}

export function apiSwitchCampaign(campaignId) {
    return apiFetch('switch_campaign', { method: 'POST', body: { campaign_id: campaignId } });
}
