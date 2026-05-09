import { apiFetch } from './client.js';

export function apiPlayerPortalSnapshot(townId = 0) {
  const params = {};
  if (townId) params.town_id = townId;
  return apiFetch('player_portal_snapshot', { params });
}

const _base = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
const API_BASE = `${_base}/api.php`;

export async function apiPlayerPortalPublicSnapshot(token, townId = 0) {
  const params = new URLSearchParams();
  params.set('action', 'player_portal_public_snapshot');
  params.set('token', token || '');
  if (townId) params.set('town_id', String(townId));
  const res = await fetch(`${API_BASE}?${params.toString()}`, {
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.error) {
    throw new Error((data && data.error) || `HTTP ${res.status}`);
  }
  return data;
}

export function apiPlayerPortalTokens() {
  return apiFetch('player_portal_tokens');
}

export function apiPlayerPortalTokenCreate({ label, scope, expiresInDays = 180 } = {}) {
  return apiFetch('player_portal_token_create', {
    method: 'POST',
    body: {
      label: label || 'Player Share Link',
      scope: scope || { read_only: true },
      expires_in_days: expiresInDays,
    },
  });
}

export function apiPlayerPortalTokenRevoke(tokenId) {
  return apiFetch('player_portal_token_revoke', {
    method: 'POST',
    body: { token_id: tokenId },
  });
}

export function apiPlayerPortalTokenScopeUpdate(tokenId, scope) {
  return apiFetch('player_portal_token_scope_update', {
    method: 'POST',
    body: { token_id: tokenId, scope },
  });
}

