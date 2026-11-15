/**
 * Guided PC creation groundwork.
 * Saves a living character on the party town. Players only see homebrew the DM marked for the table.
 * The 3.5e level-up wizard is unchanged; this records name, ancestry, class, level, and a portrait URL.
 */
import { getState } from '../stores/appState.js';
import { apiMyTables } from '../api/campaignSeats.js';
import { showToast } from '../components/Toast.js';
import {
  apiPlayerOptions,
  apiCreatePc,
  apiSetPortrait,
  apiHomebrewAccessSet,
} from '../api/groundwork.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export default function PlayerCreateView(container) {
  container.innerHTML = `
    <div class="view-dashboard">
      <header class="view-header">
        <div>
          <h1>New character</h1>
          <p class="view-subtitle">A short create path for the party. Approved homebrew races and classes appear beside the written names.</p>
        </div>
      </header>
      <div id="pc-root">Loading…</div>
    </div>
  `;
  const root = container.querySelector('#pc-root');
  resolveCampaignId()
    .then((campaignId) => apiPlayerOptions(campaignId).then((res) => ({ res, campaignId })))
    .then(({ res, campaignId }) => render(root, res, campaignId))
    .catch((err) => {
      root.textContent = err.message;
    });
}

async function resolveCampaignId() {
  const owned = getState().currentCampaign?.id || 0;
  if (owned) return owned;
  const tables = await apiMyTables();
  return tables.tables?.[0]?.campaign_id || 0;
}

function render(root, res, campaignId) {
  const races = (res.options || []).filter((o) => o.content_type === 'race');
  const classes = (res.options || []).filter((o) => o.content_type === 'class');
  const isDm = res.role === 'dm';
  root.innerHTML = `
    <form class="dash-card hub-editor">
      <div class="form-group"><label>Name</label><input id="pc-name" class="form-input" required></div>
      <div class="hub-form-row">
        <div class="form-group"><label>Ancestry</label><input id="pc-race" class="form-input" value="Human" list="pc-races"></div>
        <div class="form-group"><label>Class</label><input id="pc-class" class="form-input" value="Fighter" list="pc-classes"></div>
        <div class="form-group"><label>Level</label><input id="pc-level" class="form-input" type="number" min="1" max="20" value="1"></div>
      </div>
      <datalist id="pc-races">${races.map((r) => `<option value="${esc(r.name)}">`).join('')}</datalist>
      <datalist id="pc-classes">${classes.map((r) => `<option value="${esc(r.name)}">`).join('')}</datalist>
      <div class="form-group"><label>Portrait URL</label><input id="pc-portrait" class="form-input" placeholder="https://… optional"></div>
      <p class="hub-note">The character is saved on the party town with ability scores of 10. Open the sheet afterward to fill the rest. A 5e campaign still uses the 3.5e sheet layout, with a 5e level-up note on the sheet.</p>
      <button type="button" class="btn-primary" id="pc-save">Create character</button>
      <div id="pc-result"></div>
    </form>
    ${isDm ? `
      <section class="dash-card" style="margin-top:1rem;">
        <h3>Homebrew players may choose</h3>
        <p class="hub-note">Checked rows show up for seated players on this page. Intake already sees your homebrew names.</p>
        <div id="pc-access">
          ${(res.options || []).map((item) => `
            <label class="hub-check">
              <input type="checkbox" data-type="${esc(item.content_type)}" data-id="${item.content_id}" ${item.player_ok ? 'checked' : ''}>
              ${esc(item.content_type)} · ${esc(item.name)}
            </label>
          `).join('') || '<p class="muted">No custom races or classes yet.</p>'}
        </div>
      </section>
    ` : ''}
    <section class="dash-card" style="margin-top:1rem;">
      <h3>Your characters</h3>
      <ul>
        ${(res.characters || []).map((c) => `
          <li>
            <strong>${esc(c.name)}</strong> ${esc(c.race || '')} ${esc(c.class || '')} ${esc(c.level || '')}
            <input class="form-input" data-portrait-for="${c.character_id}" value="${esc(c.portrait_url || '')}" placeholder="Portrait URL" style="margin-top:.35rem;">
          </li>
        `).join('') || '<li class="muted">None yet.</li>'}
      </ul>
    </section>
  `;
  root.querySelector('#pc-save')?.addEventListener('click', async () => {
    try {
      const created = await apiCreatePc({
        campaign_id: campaignId,
        name: root.querySelector('#pc-name').value,
        race: root.querySelector('#pc-race').value,
        class: root.querySelector('#pc-class').value,
        level: parseInt(root.querySelector('#pc-level').value, 10) || 1,
        portrait_url: root.querySelector('#pc-portrait').value,
      });
      showToast(`Created on ${created.town_name}.`, 'success');
      root.querySelector('#pc-result').textContent = `Saved as character ${created.id}.`;
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
  root.querySelectorAll('[data-type]').forEach((box) => {
    box.addEventListener('change', async () => {
      try {
        await apiHomebrewAccessSet(box.dataset.type, parseInt(box.dataset.id, 10), box.checked);
      } catch (err) {
        box.checked = !box.checked;
        showToast(err.message, 'error');
      }
    });
  });
  root.querySelectorAll('[data-portrait-for]').forEach((input) => {
    input.addEventListener('change', async () => {
      try {
        await apiSetPortrait(parseInt(input.dataset.portraitFor, 10), input.value.trim());
        showToast('Portrait saved.', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}
