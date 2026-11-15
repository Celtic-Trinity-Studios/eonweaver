import { navigate } from '../router.js';
import {
  apiCampaignInviteAccept,
  apiCampaignSeatInvite,
  apiMyTables,
  apiPlayerSeatLeave,
  apiPlayerSeatSnapshot,
} from '../api/campaignSeats.js';
import { apiGetCurrentUser } from '../api/auth.js';
import { setState } from '../stores/appState.js';
import { setCurrentEdition } from '../api/srd.js';
import { showToast } from '../components/Toast.js';
import { apiHubPlayerBoard } from '../api/campaignHub.js';

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

function editionLabel(edition) {
  return { '3.5e': '3.5e', '5e': '5e 2014', '5e2024': '5e 2024' }[edition] || edition || '';
}

export default function MyTablesView(container, params) {
  const requestedId = parseInt(params?.id || '0', 10) || 0;
  container.innerHTML = `
    <div class="view-simulation">
      <header class="view-header">
        <h1>My tables</h1>
        <p class="view-subtitle">Campaigns you joined with this account. The DM still owns the world.</p>
      </header>
      <div id="my-tables-root" class="muted">Loading…</div>
    </div>
  `;
  const root = container.querySelector('#my-tables-root');

  apiMyTables()
    .then((res) => render(root, res, requestedId))
    .catch((err) => {
      root.textContent = err.message;
    });
}

function render(root, res, requestedId) {
  const tables = res.tables || [];
  const pending = res.pending || [];
  const selected = tables.find((t) => Number(t.campaign_id) === requestedId) || tables[0] || null;

  root.innerHTML = `
    ${pending.length ? `
      <div class="dash-card" style="padding:1rem;margin-bottom:1rem;">
        <h3 style="margin:0 0 0.5rem;">Waiting for you</h3>
        ${pending.map((p) => `
          <div class="seat-row">
            <div>
              <strong>${esc(p.name)}</strong>
              <span class="muted"> · ${esc(roleLabel(p.role))} · DM ${esc(p.dm_username || '')}</span>
            </div>
            <button class="btn-primary btn-sm" data-accept-seat="${p.seat_id}">Accept</button>
          </div>
        `).join('')}
      </div>
    ` : ''}
    ${tables.length ? `
      <div class="dash-card" style="padding:1rem;margin-bottom:1rem;">
        <div class="seat-switcher">
          ${tables.map((t) => `
            <button type="button" class="btn-secondary btn-sm${selected && Number(selected.campaign_id) === Number(t.campaign_id) ? ' is-selected' : ''}" data-open-table="${t.campaign_id}">
              ${esc(t.name)} <span class="muted">(${esc(roleLabel(t.role))})</span>
            </button>
          `).join('')}
        </div>
      </div>
      <div id="table-snapshot" class="dash-card" style="padding:1rem;">Loading table…</div>
    ` : `
      <div class="dash-card" style="padding:1rem;">
        <p>You are not seated at a table yet.</p>
        <p class="muted">Ask your DM to invite you from Player Portal. Open the link while signed in to this account.</p>
      </div>
    `}
  `;

  root.querySelectorAll('[data-accept-seat]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        const accepted = await apiCampaignInviteAccept({ seatId: parseInt(btn.dataset.acceptSeat, 10) });
        showToast(`You joined ${accepted.campaign_name}.`, 'success');
        const me = await apiGetCurrentUser();
        if (me.user) setState({ user: me.user });
        navigate('my-tables/' + accepted.campaign_id);
      } catch (err) {
        btn.disabled = false;
        showToast(err.message, 'error');
      }
    });
  });

  root.querySelectorAll('[data-open-table]').forEach((btn) => {
    btn.addEventListener('click', () => {
      navigate('my-tables/' + btn.dataset.openTable);
    });
  });

  if (selected) {
    loadSnapshot(root.querySelector('#table-snapshot'), selected);
  }
}

async function loadSnapshot(host, table) {
  if (!host) return;
  try {
    const snap = await apiPlayerSeatSnapshot(table.campaign_id);
    const towns = snap.towns || [];
    const townName = (id) => towns.find((t) => Number(t.id) === Number(id))?.name || '';
    const chars = snap.characters || [];
    const lore = snap.lore || [];
    const history = snap.history || [];
    const roster = snap.roster || [];
    const coDm = snap.role === 'co_dm';
    host.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:0.75rem;flex-wrap:wrap;align-items:flex-start;">
        <div>
          <h2 style="margin:0;">${esc(snap.campaign_name || table.name)}</h2>
          <p class="muted" style="margin:0.25rem 0 0;">
            ${esc(editionLabel(snap.dnd_edition))} · you are ${esc(roleLabel(snap.role))} · DM ${esc(snap.dm_username || '')}
          </p>
        </div>
        <button class="btn-secondary btn-sm" id="leave-table">Leave table</button>
      </div>
      ${snap.description ? `<p>${esc(snap.description)}</p>` : ''}
      <div id="seat-board" class="seat-board">Loading the next session…</div>
      <p class="help-tip">This view is read-only. Town edits, simulation, and notes stay on the DM's account.</p>
      <p><strong>At the table:</strong> ${roster.map((r) => `${esc(r.username)} (${esc(roleLabel(r.role))})`).join(', ') || '—'}</p>
      ${coDm ? `
        <div class="seat-invite-box">
          <h3 style="margin:0 0 0.4rem;">Invite a player</h3>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:flex-end;">
            <div class="sim-field" style="min-width:220px;flex:1;">
              <label>Email (optional)</label>
              <input id="codm-invite-email" class="form-input" type="email" placeholder="player@example.com">
            </div>
            <button class="btn-primary btn-sm" id="codm-invite-btn">Create invite</button>
          </div>
          <div id="codm-invite-result" class="muted" style="margin-top:0.45rem;"></div>
        </div>
      ` : ''}
      <div style="display:flex;gap:1rem;flex-wrap:wrap;margin:0.75rem 0;">
        <span><strong>Towns:</strong> ${towns.length}</span>
        <span><strong>Characters:</strong> ${chars.length}</span>
        <span><strong>Lore pages:</strong> ${lore.length}</span>
      </div>
      ${lore.length ? `
        <h3>Lore</h3>
        <ul class="seat-lore">
          ${lore.slice(0, 40).map((a) => `<li><strong>${esc(a.title)}</strong> <span class="muted">${esc(a.category || '')}</span></li>`).join('')}
        </ul>
      ` : ''}
      <h3>Characters</h3>
      <div style="overflow:auto;max-height:22rem;border:1px solid var(--border);border-radius:8px;">
        <table class="srd-table srd-table-sm">
          <thead><tr><th>Town</th><th>Name</th><th>Class</th><th>Level</th><th>Status</th></tr></thead>
          <tbody>
            ${chars.slice(0, 150).map((c) => `
              <tr>
                <td>${esc(townName(c.town_id))}</td>
                <td>${esc(c.name)}</td>
                <td>${esc(c.class)}</td>
                <td>${esc(c.level)}</td>
                <td>${esc(c.status || 'living')}</td>
              </tr>
            `).join('') || '<tr><td colspan="5" class="muted">No characters yet.</td></tr>'}
          </tbody>
        </table>
      </div>
      ${history.length ? `
        <h3>Recent history</h3>
        <ul class="seat-lore">
          ${history.slice(0, 12).map((h) => `<li><strong>${esc(h.heading || 'Note')}</strong> <span class="muted">${esc(townName(h.town_id))}</span></li>`).join('')}
        </ul>
      ` : ''}
    `;

    const board = host.querySelector('#seat-board');
    if (board) {
      apiHubPlayerBoard(snap.campaign_id)
        .then((res) => {
          const next = res.next_session;
          const recap = res.latest_recap;
          board.innerHTML = `
            <h3>Next session</h3>
            ${next ? `
              <p><strong>${esc(next.title)}</strong>${next.real_date || next.in_game_label ? ` <span class="muted">${esc([next.real_date, next.in_game_label].filter(Boolean).join(' · '))}</span>` : ''}</p>
              ${next.goals ? `<p>${esc(next.goals)}</p>` : '<p class="muted">Your DM has not written goals for this one.</p>'}
            ` : '<p class="muted">No upcoming session has been shared yet.</p>'}
            ${recap ? `<h3>Last recap</h3><p><strong>${esc(recap.title)}</strong></p><p>${esc(recap.recap)}</p>` : ''}
          `;
        })
        .catch((err) => {
          board.textContent = err.message;
        });
    }

    host.querySelector('#leave-table')?.addEventListener('click', async () => {
      if (!confirm(`Leave ${snap.campaign_name || 'this table'}? You will need a new invite to come back.`)) return;
      try {
        await apiPlayerSeatLeave(snap.campaign_id);
        const me = await apiGetCurrentUser();
        if (me.user) {
          setState({
            user: me.user,
            currentCampaign: me.user.active_campaign || null,
          });
          if (me.user.active_campaign) setCurrentEdition(me.user.active_campaign.dnd_edition);
        }
        showToast('You left the table.', 'success');
        const still = (me.user?.joined_tables || []).length || (me.user?.pending_table_invites || []).length;
        if (!me.user?.active_campaign && !still) {
          window.dispatchEvent(new Event('ew-refresh-shell'));
        } else {
          navigate('my-tables');
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    host.querySelector('#codm-invite-btn')?.addEventListener('click', async () => {
      const resultEl = host.querySelector('#codm-invite-result');
      try {
        const email = host.querySelector('#codm-invite-email')?.value.trim() || '';
        const created = await apiCampaignSeatInvite({ campaignId: snap.campaign_id, role: 'player', email });
        const url = joinUrl(created.join_path);
        resultEl.innerHTML = `<div><strong>Invite link</strong> (shown once)</div><input class="form-input" readonly value="${esc(url)}">`
          + `<p class="muted">${esc(created.mail_note || (created.mail_sent ? 'Email sent.' : 'Copy this link to your player.'))}</p>`;
        showToast('Invite created.', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  } catch (err) {
    host.textContent = err.message;
  }
}

function joinUrl(joinPath) {
  const base = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
  const clean = String(joinPath || '').replace(/^\/+/, '');
  const path = (base ? `${base}/${clean}` : `/${clean}`).replace(/\/+/g, '/');
  return window.location.origin + path;
}
