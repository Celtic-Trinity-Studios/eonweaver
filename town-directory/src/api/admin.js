/**
 * Admin API module — admin-only endpoints for full cross-account database management
 */
import { apiFetch } from './client.js';

// ── Overview ──
export function apiAdminOverview() {
    return apiFetch('admin_overview');
}

// ── Members ──
export function apiAdminMembers() {
    return apiFetch('admin_members');
}

export function apiAdminUpdateMember(userId, data) {
    return apiFetch('admin_update_member', { method: 'POST', body: { user_id: userId, ...data } });
}

export function apiAdminDeleteMember(userId) {
    return apiFetch('admin_delete_member', { method: 'DELETE', body: { user_id: userId } });
}

// ── User drill-down ──
export function apiAdminUserCampaigns(userId) {
    return apiFetch('admin_user_campaigns', { params: { user_id: userId } });
}

export function apiAdminUserTowns(userId, campaignId = 0) {
    const params = { user_id: userId };
    if (campaignId) params.campaign_id = campaignId;
    return apiFetch('admin_user_towns', { params });
}

export function apiAdminTownCharacters(townId) {
    return apiFetch('admin_town_characters', { params: { town_id: townId } });
}

export function apiAdminCharacterDetail(characterId) {
    return apiFetch('admin_character_detail', { params: { character_id: characterId } });
}

// ── Edit operations ──
export function apiAdminUpdateCharacter(characterId, data) {
    return apiFetch('admin_update_character', { method: 'POST', body: { character_id: characterId, data } });
}

export function apiAdminDeleteCharacter(characterId) {
    return apiFetch('admin_delete_character', { method: 'DELETE', body: { character_id: characterId } });
}

export function apiAdminUpdateTown(townId, data) {
    return apiFetch('admin_update_town', { method: 'POST', body: { town_id: townId, data } });
}

export function apiAdminDeleteTown(townId) {
    return apiFetch('admin_delete_town', { method: 'DELETE', body: { town_id: townId } });
}

export function apiAdminUpdateCampaign(campaignId, data) {
    return apiFetch('admin_update_campaign', { method: 'POST', body: { campaign_id: campaignId, data } });
}

// ── Town sub-data ──
export function apiAdminTownMeta(townId) {
    return apiFetch('admin_town_meta', { params: { town_id: townId } });
}

export function apiAdminTownBuildings(townId) {
    return apiFetch('admin_town_buildings', { params: { town_id: townId } });
}

export function apiAdminTownHistory(townId) {
    return apiFetch('admin_town_history', { params: { town_id: townId } });
}

export function apiAdminTownFactions(townId) {
    return apiFetch('admin_town_factions', { params: { town_id: townId } });
}

// ── Campaign sub-data ──
export function apiAdminCampaignRules(campaignId) {
    return apiFetch('admin_campaign_rules', { params: { campaign_id: campaignId } });
}

export function apiAdminCalendar(campaignId) {
    return apiFetch('admin_calendar', { params: { campaign_id: campaignId } });
}

// ── Token Usage ──
export function apiAdminTokenUsage() {
    return apiFetch('admin_token_usage');
}

// ── Site Settings ──
export function apiAdminSiteSettings() {
    return apiFetch('admin_site_settings');
}

export function apiAdminUpdateSiteSetting(key, value) {
    return apiFetch('admin_update_site_setting', { method: 'POST', body: { key, value } });
}

// ── Global Listings ──
export function apiAdminAllTowns() {
    return apiFetch('admin_all_towns');
}

export function apiAdminAllCampaigns() {
    return apiFetch('admin_all_campaigns');
}

// ── Town Meta CRUD ──
export function apiAdminUpdateMeta(townId, key, value) {
    return apiFetch('admin_update_meta', { method: 'POST', body: { town_id: townId, key, value } });
}

export function apiAdminDeleteMeta(townId, key) {
    return apiFetch('admin_delete_meta', { method: 'DELETE', body: { town_id: townId, key } });
}

// ── Credit Balance (Eon Credits Wallet) ──
export function apiAdminAdjustCredits(userId, amount, mode = 'add') {
    return apiFetch('admin_adjust_credits', { method: 'POST', body: { user_id: userId, amount, mode } });
}
