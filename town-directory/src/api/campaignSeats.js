import { apiFetch } from './client.js';

export function apiCampaignSeats(campaignId = 0) {
  const params = {};
  if (campaignId) params.campaign_id = campaignId;
  return apiFetch('campaign_seats', { params });
}

export function apiCampaignSeatInvite({ campaignId = 0, role = 'player', email = '' } = {}) {
  return apiFetch('campaign_seat_invite', {
    method: 'POST',
    body: { campaign_id: campaignId, role, email },
  });
}

export function apiCampaignSeatRevoke(seatId, campaignId = 0) {
  return apiFetch('campaign_seat_revoke', {
    method: 'POST',
    body: { seat_id: seatId, campaign_id: campaignId },
  });
}

export function apiCampaignSeatRole(seatId, role, campaignId = 0) {
  return apiFetch('campaign_seat_role', {
    method: 'POST',
    body: { seat_id: seatId, role, campaign_id: campaignId },
  });
}

export function apiCampaignInvitePreview(token) {
  return apiFetch('campaign_invite_preview', { params: { token } });
}

export function apiCampaignInviteAccept({ token = '', seatId = 0 } = {}) {
  return apiFetch('campaign_invite_accept', {
    method: 'POST',
    body: { token, seat_id: seatId },
  });
}

export function apiMyTables() {
  return apiFetch('my_tables');
}

export function apiPlayerSeatSnapshot(campaignId) {
  return apiFetch('player_seat_snapshot', { params: { campaign_id: campaignId } });
}

export function apiPlayerSeatLeave(campaignId) {
  return apiFetch('player_seat_leave', {
    method: 'POST',
    body: { campaign_id: campaignId },
  });
}
