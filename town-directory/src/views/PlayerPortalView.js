import {
  apiPlayerPortalPublicSnapshot,
  apiPlayerPortalSnapshot,
  apiPlayerPortalTokenCreate,
  apiPlayerPortalTokenRevoke,
  apiPlayerPortalTokenScopeUpdate,
  apiPlayerPortalTokens,
} from '../api/playerPortal.js';
import { showToast } from '../components/Toast.js';

export default function PlayerPortalView(container) {
  container.innerHTML = `
    <div class="view-simulation">
      <header class="view-header">
        <h1>🔶 Player Portal (Read-Only Framework)</h1>
        <p class="view-subtitle">Preview what a player-facing read-only portal can expose.</p>
      </header>
      <div class="dash-card" style="padding:1rem;">
        <div id="player-portal-content" class="muted">Loading…</div>
      </div>
      <div class="dash-card" style="padding:1rem;margin-top:1rem;">
        <h3 style="margin:0 0 0.5rem;">Share Tokens (Framework)</h3>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:flex-end;margin-bottom:0.5rem;">
          <div class="sim-field" style="min-width:220px;">
            <label>Label</label>
            <input id="ppt-label" class="form-input" value="Players - Read Only">
          </div>
          <div class="sim-field" style="max-width:130px;">
            <label>Expires (days)</label>
            <input id="ppt-days" class="form-input" type="number" min="1" max="3650" value="180">
          </div>
          <button class="btn-primary" id="ppt-create">Create token</button>
        </div>
        <div id="ppt-last-token" class="muted" style="margin-bottom:0.5rem;"></div>
        <div id="ppt-list" class="muted">Loading…</div>
      </div>
      <div class="dash-card" style="padding:1rem;margin-top:1rem;">
        <h3 style="margin:0 0 0.5rem;">Public Token Preview (Framework)</h3>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:flex-end;">
          <div class="sim-field" style="min-width:260px;flex:1;">
            <label>Token</label>
            <input id="ppt-preview-token" class="form-input" placeholder="paste raw token">
          </div>
          <button class="btn-secondary" id="ppt-preview-btn">Load Public Snapshot</button>
        </div>
        <pre id="ppt-preview-output" style="margin-top:0.6rem;max-height:18rem;overflow:auto;background:rgba(0,0,0,0.2);padding:0.75rem;border-radius:8px;"></pre>
      </div>
    </div>
  `;

  const target = container.querySelector('#player-portal-content');
  const tokenListEl = container.querySelector('#ppt-list');
  const lastTokenEl = container.querySelector('#ppt-last-token');
  const previewOut = container.querySelector('#ppt-preview-output');
  let availableTowns = [];

  async function refreshTokens() {
    const res = await apiPlayerPortalTokens();
    const tokens = res.tokens || [];
    tokenListEl.innerHTML = tokens.length
      ? tokens.map((t) => `
        <div style="display:flex;justify-content:space-between;gap:0.5rem;align-items:center;padding:0.3rem 0;border-bottom:1px solid var(--border);">
          <span>
            <strong>${t.label || 'Token'}</strong>
            <span class="muted">(id ${t.id}) ${t.is_revoked ? 'revoked' : 'active'} · expires ${t.expires_at || 'never'}</span>
            <span class="muted" style="display:block;font-size:0.74rem;">scope: ${t.scope_json || '{}'}</span>
          </span>
          ${
            t.is_revoked
              ? ''
              : `<div style="display:flex;gap:0.35rem;flex-wrap:wrap;">
                  <button class="btn-secondary btn-sm ppt-scope" data-token-id="${t.id}">Set town scope</button>
                  <button class="btn-secondary btn-sm ppt-revoke" data-token-id="${t.id}">Revoke</button>
                </div>`
          }
        </div>
      `).join('')
      : '<div class="muted">No share tokens yet.</div>';

    tokenListEl.querySelectorAll('.ppt-revoke').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const tokenId = parseInt(btn.dataset.tokenId || '0', 10);
        if (!tokenId) return;
        try {
          await apiPlayerPortalTokenRevoke(tokenId);
          showToast('Player portal token revoked.', 'success');
          await refreshTokens();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
    tokenListEl.querySelectorAll('.ppt-scope').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const tokenId = parseInt(btn.dataset.tokenId || '0', 10);
        if (!tokenId) return;
        const map = new Map(availableTowns.map((t) => [String(t.id), t.name]));
        const promptMsg = `Enter town IDs separated by commas for this token scope.\nAvailable towns:\n${
          availableTowns.map((t) => `${t.id}: ${t.name}`).join('\n') || '(none)'
        }\n\nLeave blank for all towns.`;
        const raw = window.prompt(promptMsg, '');
        if (raw === null) return;
        const ids = raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .filter((s) => map.has(s))
          .map((s) => parseInt(s, 10));
        try {
          await apiPlayerPortalTokenScopeUpdate(tokenId, { read_only: true, town_ids: ids });
          showToast('Token scope updated.', 'success');
          await refreshTokens();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  }

  container.querySelector('#ppt-create').addEventListener('click', async () => {
    try {
      const label = container.querySelector('#ppt-label').value.trim() || 'Players - Read Only';
      const days = parseInt(container.querySelector('#ppt-days').value || '180', 10);
      const created = await apiPlayerPortalTokenCreate({ label, expiresInDays: days });
      lastTokenEl.innerHTML = `<strong>New token:</strong> <code>${created.token}</code> <span class="muted">(store this now; only shown once)</span>`;
      showToast('Player portal token created.', 'success');
      await refreshTokens();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  container.querySelector('#ppt-preview-btn').addEventListener('click', async () => {
    try {
      const token = container.querySelector('#ppt-preview-token').value.trim();
      if (!token) {
        previewOut.textContent = 'Paste a token first.';
        return;
      }
      const res = await apiPlayerPortalPublicSnapshot(token);
      previewOut.textContent = JSON.stringify(res, null, 2);
      showToast('Public snapshot loaded.', 'success');
    } catch (err) {
      previewOut.textContent = err.message;
      showToast(err.message, 'error');
    }
  });

  apiPlayerPortalSnapshot()
    .then(async (res) => {
      const towns = res.towns || [];
      availableTowns = towns;
      const chars = res.characters || [];
      const history = res.history || [];
      const lore = res.lore || [];
      target.innerHTML = `
        <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:0.75rem;">
          <span><strong>Towns:</strong> ${towns.length}</span>
          <span><strong>Visible Characters:</strong> ${chars.length}</span>
          <span><strong>Recent History Entries:</strong> ${history.length}</span>
          <span><strong>Player lore pages:</strong> ${lore.length}</span>
        </div>
        <div class="help-tip" style="margin:0 0 0.75rem 0;">
          Player-visible lore pages (flagged in Lore Codex) are included in portal snapshots.
        </div>
        ${lore.length ? `
        <div style="margin-bottom:0.75rem;">
          <h4 style="margin:0 0 0.35rem;">Lore (player-visible)</h4>
          <ul style="margin:0;padding-left:1.2rem;">
            ${lore.slice(0, 40).map((a) => `<li><strong>${String(a.title || '').replace(/</g, '&lt;')}</strong> <span class="muted">(${String(a.category || 'other')})</span></li>`).join('')}
          </ul>
        </div>` : ''}
        <div style="overflow:auto;max-height:22rem;border:1px solid var(--border);border-radius:8px;">
          <table class="srd-table srd-table-sm">
            <thead><tr><th>Town</th><th>Name</th><th>Class</th><th>Level</th><th>Status</th></tr></thead>
            <tbody>
              ${chars.slice(0, 120).map((c) => `
                <tr>
                  <td>${towns.find((t) => Number(t.id) === Number(c.town_id))?.name || c.town_id}</td>
                  <td>${c.name || ''}</td>
                  <td>${c.class || ''}</td>
                  <td>${c.level || ''}</td>
                  <td>${c.status || 'living'}</td>
                </tr>
              `).join('') || '<tr><td colspan="5" class="muted">No character data.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
      await refreshTokens();
    })
    .catch((err) => {
      target.textContent = err.message;
      tokenListEl.textContent = err.message;
    });
}

