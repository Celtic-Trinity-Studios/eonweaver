/**
 * Town actions shared by the roster, town stats, and the relationship network.
 * Character and Map stay in their own cluster so they do not wrap to the left.
 */
import { navigate } from '../router.js';

const ACTION_KEY = 'ew-town-action';
const MAP_KEY = 'ew-town-map';

const CURRENT_ID = { stats: 'town-stats-btn', network: 'town-network-btn' };

function btn(id, label, current, { danger = false, attrs = '' } = {}) {
  const kind = danger ? 'btn-danger' : 'btn-secondary';
  const on = CURRENT_ID[current] === id ? ' is-current' : '';
  return `<button type="button" class="${kind} btn-sm${on}" id="${id}"${attrs}>${label}</button>`;
}

export function townToolbarBarHtml({ current = '' } = {}) {
  const characterOn = current === 'character' ? ' active' : '';
  const mapOn = current === 'map' ? ' active' : '';
  return `
    <div class="town-toolbar-bar">
      <div class="town-toolbar-actions">
        ${btn('town-stats-btn', 'Stats', current)}
        ${btn('town-settings-btn', 'Settings', current)}
        ${btn('town-buildings-btn', '🏘️ Buildings', current, { attrs: ' style="border-color:rgba(184,115,51,0.3);color:var(--accent,#B87333)"' })}
        ${btn('town-social-btn', '🤝 Social', current, { attrs: ' style="border-color:rgba(245,197,24,0.3);color:var(--accent,#f5c518)"' })}
        ${btn('town-network-btn', '🕸️ Network', current, { attrs: ' style="border-color:rgba(245,197,24,0.3);color:var(--accent,#f5c518)"' })}
        ${btn('town-history-btn', 'History', current)}
        ${btn('town-export-btn', 'Export', current, { attrs: ' title="Export town history and data as Word (.docx) or Markdown for campaign planning"' })}
        ${btn('town-import-btn', 'Import', current)}
        ${btn('town-purge-btn', '☠️ Purge Town Data', current, { danger: true, attrs: ' title="Delete population and/or buildings"' })}
        ${btn('town-delete-btn', 'Delete Town', current, { danger: true })}
      </div>
      <div class="detail-mode-tabs" id="detail-mode-tabs">
        <button type="button" class="detail-mode-tab${characterOn}" data-detail-tab="character">Character</button>
        <button type="button" class="detail-mode-tab${mapOn}" data-detail-tab="map">Map</button>
      </div>
    </div>`;
}

/** Stats and Network stay on their pages. Other actions return to the roster and run there. */
export function bindTownToolbar(root, townId) {
  root.querySelector('#detail-mode-tabs')?.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-detail-tab]');
    if (!tab || !townId) return;
    if (tab.dataset.detailTab === 'map') sessionStorage.setItem(MAP_KEY, '1');
    else sessionStorage.removeItem(MAP_KEY);
    navigate('town/' + townId);
  });

  root.querySelector('#town-stats-btn')?.addEventListener('click', () => {
    if (townId) navigate('townstats/' + townId);
  });
  root.querySelector('#town-network-btn')?.addEventListener('click', () => {
    if (townId) navigate('relationships/' + townId);
  });

  ['#town-settings-btn', '#town-buildings-btn', '#town-social-btn', '#town-history-btn', '#town-export-btn', '#town-import-btn', '#town-purge-btn', '#town-delete-btn'].forEach((sel) => {
    root.querySelector(sel)?.addEventListener('click', () => {
      if (!townId) return;
      sessionStorage.setItem(ACTION_KEY, sel);
      navigate('town/' + townId);
    });
  });
}

export function consumePendingTownAction(root) {
  const pending = sessionStorage.getItem(ACTION_KEY);
  if (!pending) return;
  sessionStorage.removeItem(ACTION_KEY);
  root.querySelector(pending)?.click();
}

export function consumePendingTownMap(showMap) {
  if (sessionStorage.getItem(MAP_KEY) !== '1') return;
  sessionStorage.removeItem(MAP_KEY);
  showMap();
}
