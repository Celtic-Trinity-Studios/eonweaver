/**
 * Encounter table — place roster tokens, edit live HP, export a Foundry scene.
 */
import { navigate } from '../router.js';
import { setState } from '../stores/appState.js';
import { showToast } from '../components/Toast.js';
import {
  apiGetEncounterTable,
  apiSaveEncounterTableToken,
  apiDeleteEncounterTableToken,
  apiSaveEncounterTableHp,
  apiClearEncounterTableImage,
  apiExportEncounterTableFoundry,
  apiUploadEncounterTable,
  encounterTableAssetUrl,
} from '../api/encounterTable.js';

const CELL = 48;
const STATUS_OPTIONS = ['Alive', 'Deceased', 'Absent', 'Missing', 'Unknown'];

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || '?';
}

export default function EncounterTableView(container, params) {
  const encounterId = params?.id ? parseInt(params.id, 10) : 0;
  let model = null;
  let armedId = null;
  let selectedId = null;
  let drag = null;

  container.innerHTML = `
    <div class="etable">
      <header class="view-header">
        <button type="button" class="btn-secondary btn-sm" id="etable-back">← Encounter</button>
        <div>
          <h1 id="etable-title">Table</h1>
          <p class="etable-lead">Tokens use the character sheet. Saving HP or status writes back to that character and to this encounter’s tracker. The Foundry file includes only people on the grid, each stamped with their Eon Weaver character id. Foundry does not import that file by itself.</p>
        </div>
        <div class="view-header-actions">
          <button type="button" class="btn-secondary btn-sm" id="etable-upload-btn">Upload map</button>
          <button type="button" class="btn-secondary btn-sm" id="etable-clear-btn">Clear map</button>
          <button type="button" class="btn-primary btn-sm" id="etable-export-btn">Download Foundry scene</button>
          <input type="file" id="etable-file" accept="image/jpeg,image/png,image/webp,image/gif" hidden>
        </div>
      </header>
      <div class="etable-body">
        <aside class="dash-card etable-roster">
          <h3>Roster</h3>
          <p class="muted etable-hint">Click a name, then a square. Drag a token to move it.</p>
          <div id="etable-roster"></div>
          <h3>Initiative</h3>
          <ol id="etable-init" class="etable-init"></ol>
        </aside>
        <div class="etable-board-wrap dash-card">
          <div id="etable-board" class="etable-grid"></div>
        </div>
        <aside class="dash-card etable-inspector" id="etable-inspector">
          <p class="muted">Select a token to edit HP.</p>
        </aside>
      </div>
    </div>`;

  const board = container.querySelector('#etable-board');
  const rosterEl = container.querySelector('#etable-roster');
  const initEl = container.querySelector('#etable-init');
  const inspector = container.querySelector('#etable-inspector');

  container.querySelector('#etable-back').addEventListener('click', () => {
    navigate(encounterId ? `encounters/${encounterId}` : 'encounters');
  });
  container.querySelector('#etable-upload-btn').addEventListener('click', () => {
    container.querySelector('#etable-file').click();
  });
  container.querySelector('#etable-file').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const res = await apiUploadEncounterTable(encounterId, file);
      if (model?.table) model.table.image_url = res.url;
      renderBoard();
      showToast('Map image saved.');
    } catch (err) {
      showToast(err.message || 'Upload failed.', 'error');
    }
  });
  container.querySelector('#etable-clear-btn').addEventListener('click', async () => {
    if (!model?.table?.image_url) return;
    try {
      await apiClearEncounterTableImage(encounterId);
      model.table.image_url = '';
      renderBoard();
    } catch (err) {
      showToast(err.message || 'Could not clear the map.', 'error');
    }
  });
  container.querySelector('#etable-export-btn').addEventListener('click', async () => {
    try {
      const payload = await apiExportEncounterTableFoundry(encounterId);
      const { ok, error, ...rest } = payload;
      if (error) throw new Error(error);
      if (!rest.actors || !rest.actors.length) {
        showToast('Place at least one token before downloading.', 'warning');
        return;
      }
      const blob = new Blob([JSON.stringify(rest, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const safe = String(model?.encounter?.name || 'encounter').replace(/[^\w\-]+/g, '_').slice(0, 40);
      a.download = `eonweaver-foundry-${safe}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      showToast(err.message || 'Export failed.', 'error');
    }
  });

  function people() {
    return model?.participants || [];
  }

  function person(id) {
    return people().find((p) => p.character_id === id) || null;
  }

  function renderRoster() {
    const list = people();
    if (!list.length) {
      rosterEl.innerHTML = '<p class="muted">Add characters on the encounter page first.</p>';
      initEl.innerHTML = '';
      return;
    }
    rosterEl.innerHTML = list.map((p) => {
      const armed = armedId === p.character_id ? ' is-armed' : '';
      const placed = p.placed ? 'On grid' : 'Not placed';
      const dead = String(p.status) === 'Deceased' ? ' · Deceased' : '';
      return `<button type="button" class="etable-roster-btn${armed}" data-character-id="${p.character_id}">
        <span class="etable-roster-name">${escHtml(p.name)}</span>
        <span class="etable-roster-meta">${escHtml(p.side)} · ♥ ${p.hp}${dead} · ${placed}</span>
      </button>`;
    }).join('');
    const ordered = [...list].sort((a, b) => (b.initiative || 0) - (a.initiative || 0));
    initEl.innerHTML = ordered.map((p) => (
      `<li><span>${escHtml(p.name)}</span><strong>${p.initiative || 0}</strong></li>`
    )).join('');
  }

  function renderBoard() {
    if (!model?.table) {
      board.innerHTML = '';
      return;
    }
    const cols = model.table.grid_cols || 20;
    const rows = model.table.grid_rows || 14;
    const image = encounterTableAssetUrl(model.table.image_url);
    board.style.gridTemplateColumns = `repeat(${cols}, ${CELL}px)`;
    board.style.width = `${cols * CELL}px`;
    board.style.height = `${rows * CELL}px`;
    board.style.backgroundImage = image ? `url("${image.replace(/"/g, '')}")` : '';
    const cells = [];
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        cells.push(`<div class="etable-cell" data-gx="${x}" data-gy="${y}"></div>`);
      }
    }
    const tokens = people().filter((p) => p.placed).map((p) => {
      const dead = String(p.status) === 'Deceased';
      const down = !dead && Number(p.hp) <= 0;
      const selected = selectedId === p.character_id ? ' is-selected' : '';
      const portrait = encounterTableAssetUrl(p.portrait_url);
      const face = portrait
        ? `<img alt="" src="${escHtml(portrait)}">`
        : `<span>${escHtml(initials(p.name))}</span>`;
      return `<button type="button" class="etable-token${dead ? ' etable-token-dead' : ''}${down ? ' etable-token-down' : ''}${selected}"
        data-character-id="${p.character_id}" data-side="${escHtml(p.side)}"
        style="left:${(p.grid_x || 0) * CELL}px;top:${(p.grid_y || 0) * CELL}px"
        title="${escHtml(p.name)}">
        ${face}
        ${dead ? '<i class="etable-skull">☠</i>' : ''}
      </button>`;
    }).join('');
    board.innerHTML = cells.join('') + tokens;
    board.classList.toggle('is-armed', armedId != null);
  }

  function renderInspector() {
    const p = person(selectedId);
    if (!p) {
      inspector.innerHTML = '<p class="muted">Select a token to edit HP. Deceased characters from simulation show a skull.</p>';
      return;
    }
    const statuses = STATUS_OPTIONS.includes(p.status) ? STATUS_OPTIONS : [p.status, ...STATUS_OPTIONS];
    const options = statuses.map((s) => (
      `<option value="${escHtml(s)}"${s === p.status ? ' selected' : ''}>${escHtml(s)}</option>`
    )).join('');
    const trackerNote = Number(p.tracker_hp) !== Number(p.hp)
      ? `<p class="muted">Encounter tracker currently has ${p.tracker_hp} HP. Saving here copies the number below onto the sheet and the tracker.</p>`
      : '';
    inspector.innerHTML = `
      <h3>${escHtml(p.name)}</h3>
      <p class="muted">${escHtml([p.race, p.class].filter(Boolean).join(' '))}${p.level ? ` · L${p.level}` : ''} · AC ${p.ac} · Init ${p.initiative}</p>
      ${trackerNote}
      <label class="etable-field">HP
        <input id="etable-hp" class="form-input" type="number" min="0" max="9999" value="${Number(p.hp) || 0}">
      </label>
      <label class="etable-field">Status
        <select id="etable-status" class="form-input">${options}</select>
      </label>
      <div class="etable-inspector-actions">
        <button type="button" class="btn-primary btn-sm" id="etable-save-hp">Save to sheet</button>
        <button type="button" class="btn-secondary btn-sm" id="etable-open-sheet">Open sheet</button>
        <button type="button" class="btn-secondary btn-sm" id="etable-remove">Remove from grid</button>
      </div>`;
    inspector.querySelector('#etable-save-hp').addEventListener('click', () => saveHp(p));
    inspector.querySelector('#etable-open-sheet').addEventListener('click', () => {
      setState({ pendingMapCharacterId: p.character_id, currentTownId: p.town_id });
      navigate(`town/${p.town_id}`);
    });
    inspector.querySelector('#etable-remove').addEventListener('click', () => removeToken(p.character_id));
  }

  function renderAll() {
    const title = container.querySelector('#etable-title');
    if (title) title.textContent = model?.encounter?.name ? `${model.encounter.name} — Table` : 'Table';
    renderRoster();
    renderBoard();
    renderInspector();
  }

  async function place(characterId, gridX, gridY) {
    const p = person(characterId);
    if (!p) return;
    const prev = { placed: p.placed, grid_x: p.grid_x, grid_y: p.grid_y };
    p.placed = true;
    p.grid_x = gridX;
    p.grid_y = gridY;
    selectedId = characterId;
    armedId = null;
    renderAll();
    try {
      await apiSaveEncounterTableToken(encounterId, characterId, gridX, gridY);
    } catch (err) {
      p.placed = prev.placed;
      p.grid_x = prev.grid_x;
      p.grid_y = prev.grid_y;
      renderAll();
      showToast(err.message || 'Could not place that token.', 'error');
    }
  }

  async function removeToken(characterId) {
    const p = person(characterId);
    if (!p) return;
    try {
      await apiDeleteEncounterTableToken(encounterId, characterId);
      p.placed = false;
      p.grid_x = null;
      p.grid_y = null;
      p.token_id = null;
      if (selectedId === characterId) selectedId = null;
      renderAll();
    } catch (err) {
      showToast(err.message || 'Could not remove that token.', 'error');
    }
  }

  async function saveHp(p) {
    const hp = Math.max(0, Math.min(9999, parseInt(inspector.querySelector('#etable-hp').value, 10) || 0));
    const status = inspector.querySelector('#etable-status').value;
    try {
      await apiSaveEncounterTableHp(encounterId, p.character_id, hp, status);
      p.hp = hp;
      p.tracker_hp = hp;
      p.status = status;
      if (hp > p.max_hp) p.max_hp = hp;
      renderAll();
      showToast('Saved to the character sheet.', 'success');
    } catch (err) {
      showToast(err.message || 'Could not save HP.', 'error');
    }
  }

  rosterEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-character-id]');
    if (!btn) return;
    const id = parseInt(btn.dataset.characterId, 10);
    const p = person(id);
    if (!p) return;
    if (p.placed) {
      selectedId = id;
      armedId = null;
    } else {
      armedId = armedId === id ? null : id;
      selectedId = id;
    }
    renderAll();
  });

  board.addEventListener('click', (e) => {
    if (e.target.closest('.etable-token')) return;
    const cell = e.target.closest('[data-gx]');
    if (!cell || armedId == null) return;
    place(armedId, parseInt(cell.dataset.gx, 10), parseInt(cell.dataset.gy, 10));
  });

  board.addEventListener('pointerdown', (e) => {
    const token = e.target.closest('.etable-token');
    if (!token) return;
    e.preventDefault();
    token.setPointerCapture(e.pointerId);
    drag = {
      id: parseInt(token.dataset.characterId, 10),
      x: e.clientX,
      y: e.clientY,
      moved: false,
      pointerId: e.pointerId,
    };
  });

  board.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4) drag.moved = true;
  });

  board.addEventListener('pointerup', (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const current = drag;
    drag = null;
    if (!current.moved) {
      selectedId = current.id;
      armedId = null;
      renderAll();
      return;
    }
    const rect = board.getBoundingClientRect();
    const cols = model?.table?.grid_cols || 20;
    const rows = model?.table?.grid_rows || 14;
    const gx = Math.max(0, Math.min(cols - 1, Math.floor((e.clientX - rect.left) / CELL)));
    const gy = Math.max(0, Math.min(rows - 1, Math.floor((e.clientY - rect.top) / CELL)));
    place(current.id, gx, gy);
  });

  async function load() {
    if (!encounterId) {
      container.querySelector('#etable-title').textContent = 'Table';
      rosterEl.innerHTML = '<p class="muted">Open an encounter and choose Table.</p>';
      return;
    }
    try {
      model = await apiGetEncounterTable(encounterId);
      renderAll();
    } catch (err) {
      rosterEl.innerHTML = `<p class="error-state">${escHtml(err.message || 'Could not load the table.')}</p>`;
    }
  }

  load();
}
