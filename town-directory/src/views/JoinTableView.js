import { appHref } from '../router.js';
import { apiCampaignInviteAccept, apiCampaignInvitePreview } from '../api/campaignSeats.js';
import { apiGetCurrentUser } from '../api/auth.js';
import { setState } from '../stores/appState.js';
import { setCurrentEdition } from '../api/srd.js';
import { showToast } from '../components/Toast.js';

const JOIN_KEY = 'ew_pending_join_token';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function roleLabel(role) {
  if (role === 'co_dm') return 'Co-DM';
  if (role === 'dm') return 'DM';
  return 'Player';
}

export default function JoinTableView(container, params) {
  const token = String(params?.id || '').trim();
  container.innerHTML = `
    <div class="view-simulation">
      <header class="view-header">
        <h1>Take your seat</h1>
        <p class="view-subtitle">This invite puts your account at someone else's table.</p>
      </header>
      <div class="dash-card" style="padding:1rem;" id="join-card">Loading invite…</div>
    </div>
  `;
  const card = container.querySelector('#join-card');
  if (!token) {
    card.textContent = 'This page needs an invite link from your DM.';
    return;
  }

  apiCampaignInvitePreview(token)
    .then((res) => renderPreview(card, token, res))
    .catch((err) => {
      sessionStorage.removeItem(JOIN_KEY);
      card.innerHTML = `<p>${esc(err.message)}</p><p><a href="${esc(appHref('my-tables'))}">Back to my tables</a></p>`;
    });
}

function renderPreview(card, token, res) {
  const hint = res.email_hint
    ? `<p class="muted">Addressed to ${esc(res.email_hint)}.</p>`
    : '<p class="muted">Any signed-in account can accept this link. It works once.</p>';
  const block = res.block_reason ? `<p>${esc(res.block_reason)}</p>` : '';
  const accept = res.can_accept
    ? '<button class="btn-primary" id="join-accept">Accept and open the table</button>'
    : (res.already_member
      ? `<p><a class="btn-primary" href="${esc(appHref('my-tables/' + res.campaign_id))}">Open the table</a></p>`
      : '');
  card.innerHTML = `
    <h2 style="margin:0 0 0.35rem;">${esc(res.campaign_name || 'Campaign')}</h2>
    <p>${esc(res.dm_username || 'The DM')} invited you as <strong>${esc(roleLabel(res.role))}</strong>.</p>
    ${res.description ? `<p>${esc(res.description)}</p>` : ''}
    ${hint}
    ${block}
    ${accept}
  `;
  card.querySelector('#join-accept')?.addEventListener('click', async () => {
    const btn = card.querySelector('#join-accept');
    btn.disabled = true;
    try {
      const accepted = await apiCampaignInviteAccept({ token });
      sessionStorage.removeItem(JOIN_KEY);
      const me = await apiGetCurrentUser();
      if (me.user) {
        setState({ user: me.user });
        if (me.user.active_campaign) {
          setState({ currentCampaign: me.user.active_campaign });
          setCurrentEdition(me.user.active_campaign.dnd_edition);
        }
      }
      showToast(accepted.already_member ? 'You are already at this table.' : `You joined ${accepted.campaign_name}.`, 'success');
      const dest = appHref('my-tables/' + (accepted.campaign_id || res.campaign_id));
      window.history.replaceState({}, '', dest);
      window.dispatchEvent(new Event('ew-refresh-shell'));
    } catch (err) {
      btn.disabled = false;
      showToast(err.message, 'error');
    }
  });
}
