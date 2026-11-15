/**
 * Battlemap groundwork: image URL, grid, procedural rooms, notes, and fog rectangles.
 * A full VTT renderer is not attached.
 */
import { showToast } from '../components/Toast.js';
import {
  apiBattlemaps,
  apiBattlemapSave,
  apiBattlemapProcedural,
  apiBattlemapDelete,
  apiMarkSave,
  apiMarkDelete,
} from '../api/groundwork.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export default function BattlemapsView(container) {
  let maps = [];
  let selected = 0;

  container.innerHTML = `
    <div class="view-dashboard">
      <header class="view-header">
        <div>
          <h1>Battlemaps</h1>
          <p class="view-subtitle">Upload a link to an image, sketch rooms, and drop notes or fog rectangles. Drawing tokens in real time is still the encounter table.</p>
        </div>
      </header>
      <div id="bmap-root">Loading…</div>
    </div>
  `;

  load();

  async function load() {
    try {
      const res = await apiBattlemaps();
      maps = res.maps || [];
      if (!maps.find((m) => m.id === selected)) selected = maps[0]?.id || 0;
      render();
    } catch (err) {
      container.querySelector('#bmap-root').textContent = err.message;
    }
  }

  function render() {
    const map = maps.find((m) => m.id === selected) || null;
    const root = container.querySelector('#bmap-root');
    root.innerHTML = `
      <div class="hub-split">
        <aside class="dash-card hub-list">
          <button type="button" class="btn-primary btn-sm" id="bmap-new">+ Map</button>
          <button type="button" class="btn-secondary btn-sm" id="bmap-gen">Generate rooms</button>
          <div class="hub-list-items">
            ${maps.map((m) => `<button type="button" class="hub-list-btn${m.id === selected ? ' is-selected' : ''}" data-id="${m.id}"><strong>${esc(m.title)}</strong><span>${(m.layout || []).length} rooms · ${(m.marks || []).length} marks</span></button>`).join('') || '<p class="muted">No battlemaps yet.</p>'}
          </div>
        </aside>
        <form class="dash-card hub-editor">
          ${map ? editor(map) : '<p class="muted">Create a map or generate a room sketch.</p>'}
        </form>
      </div>
    `;
    root.querySelector('#bmap-new')?.addEventListener('click', async () => {
      const title = prompt('Map title');
      if (!title) return;
      const res = await apiBattlemapSave({ title });
      selected = res.id;
      await load();
    });
    root.querySelector('#bmap-gen')?.addEventListener('click', async () => {
      const res = await apiBattlemapProcedural('Room sketch', 6);
      selected = res.id;
      showToast('Room sketch saved.', 'success');
      await load();
    });
    root.querySelectorAll('.hub-list-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        selected = parseInt(btn.dataset.id, 10);
        render();
      });
    });
    root.querySelector('form')?.addEventListener('submit', (e) => e.preventDefault());
    if (!map) return;
    root.querySelector('#bmap-save')?.addEventListener('click', async () => {
      try {
        await apiBattlemapSave({
          id: map.id,
          title: root.querySelector('#bmap-title').value,
          image_url: root.querySelector('#bmap-image').value,
          grid_cols: parseInt(root.querySelector('#bmap-cols').value, 10) || 20,
          grid_rows: parseInt(root.querySelector('#bmap-rows').value, 10) || 20,
          notes: root.querySelector('#bmap-notes').value,
          layout: map.layout || [],
        });
        showToast('Map saved.', 'success');
        await load();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
    root.querySelector('#bmap-delete')?.addEventListener('click', async () => {
      if (!confirm('Delete this battlemap?')) return;
      await apiBattlemapDelete(map.id);
      selected = 0;
      await load();
    });
    root.querySelector('#bmap-mark')?.addEventListener('click', async () => {
      const kind = root.querySelector('#bmap-kind').value;
      await apiMarkSave({
        map_id: map.id,
        kind,
        label: root.querySelector('#bmap-label').value || (kind === 'fog' ? 'Fog' : 'Note'),
        body: root.querySelector('#bmap-mark-body').value,
        x_pct: 12,
        y_pct: 12,
        w_pct: kind === 'fog' ? 25 : 0,
        h_pct: kind === 'fog' ? 18 : 0,
        player_visible: kind !== 'fog',
      });
      await load();
    });
    root.querySelectorAll('[data-del-mark]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await apiMarkDelete(parseInt(btn.dataset.delMark, 10));
        await load();
      });
    });
  }
}

function editor(map) {
  const rooms = (map.layout || []).map((room) => `<li>${esc(room.name)} · ${room.w}×${room.h} at ${room.x},${room.y}</li>`).join('');
  const marks = (map.marks || []).map((mark) => `
    <li>${esc(mark.kind)} · ${esc(mark.label)}
      <button type="button" class="btn-secondary btn-sm" data-del-mark="${mark.id}">Remove</button>
    </li>
  `).join('');
  return `
    <div class="form-group"><label>Title</label><input id="bmap-title" class="form-input" value="${esc(map.title)}"></div>
    <div class="form-group"><label>Image URL</label><input id="bmap-image" class="form-input" value="${esc(map.image_url)}" placeholder="https://…"></div>
    <div class="hub-form-row">
      <div class="form-group"><label>Grid columns</label><input id="bmap-cols" class="form-input" type="number" min="5" max="100" value="${map.grid_cols}"></div>
      <div class="form-group"><label>Grid rows</label><input id="bmap-rows" class="form-input" type="number" min="5" max="100" value="${map.grid_rows}"></div>
    </div>
    <div class="form-group"><label>Notes</label><textarea id="bmap-notes" class="form-input" rows="2">${esc(map.notes)}</textarea></div>
    ${rooms ? `<p>Rooms</p><ul>${rooms}</ul>` : ''}
    <h3>Marks</h3>
    <ul>${marks || '<li class="muted">No notes or fog yet.</li>'}</ul>
    <div class="hub-form-row">
      <div class="form-group"><label>Kind</label>
        <select id="bmap-kind" class="form-input"><option value="note">Note</option><option value="marker">Marker</option><option value="fog">Fog</option></select>
      </div>
      <div class="form-group"><label>Label</label><input id="bmap-label" class="form-input"></div>
    </div>
    <div class="form-group"><label>Detail</label><input id="bmap-mark-body" class="form-input" placeholder="What the mark says, or what the fog hides"></div>
    <div class="dash-quick-actions">
      <button type="button" class="btn-secondary" id="bmap-mark">Add mark</button>
      <button type="button" class="btn-primary" id="bmap-save">Save map</button>
      <button type="button" class="btn-danger" id="bmap-delete">Delete</button>
    </div>
  `;
}
