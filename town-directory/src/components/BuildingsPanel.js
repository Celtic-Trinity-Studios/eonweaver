/**
 * Eon Weaver — Buildings Panel
 * Displays and manages buildings and rooms for a town.
 * Rendered as a wide modal accessible from TownView.
 */
import {
  apiGetBuildings, apiSaveBuilding, apiDeleteBuilding,
  apiSaveRoom, apiDeleteRoom, apiAssignCharacterBuilding
} from '../api/buildings.js';
import { apiGetCharacters } from '../api/characters.js';
import { showModal } from './Modal.js';

/* building type icons */
const BUILDING_ICONS = {
  tavern: '🍺', inn: '🛏️', shop: '🏪', temple: '⛪', shrine: '🕯️',
  guild: '⚒️', barracks: '🏰', residence: '🏠', mansion: '🏛️',
  farm: '🌾', stable: '🐴', warehouse: '📦', market: '🧺',
  smithy: '⚔️', library: '📚', tower: '🗼', prison: '⛓️',
  cemetery: '⚰️', dock: '⚓', gate: '🚪', wall: '🧱',
  other: '🏗️'
};

const ROOM_TYPES = [
  'common', 'bedroom', 'kitchen', 'storage', 'workshop',
  'cellar', 'attic', 'office', 'chapel', 'armory',
  'stable', 'courtyard', 'dungeon', 'throne', 'other'
];

const STATUS_COLORS = {
  completed: '#66bb6a', under_construction: '#ffab40',
  planned: '#90a4ae', damaged: '#ff9800', destroyed: '#ff5252'
};

/**
 * Opens the buildings panel as a wide modal
 */
export async function openBuildingsPanel(townId) {
  let buildings = [];
  let characters = [];

  const { el: modalBody, close } = showModal({
    title: '🏘️ Town Buildings & Rooms',
    width: 'wide',
    content: '<div class="cs-loading" style="padding:2rem;text-align:center;">Loading buildings...</div>'
  });

  try {
    const [bRes, cRes] = await Promise.all([
      apiGetBuildings(townId),
      apiGetCharacters(townId)
    ]);
    buildings = bRes.buildings || [];
    characters = (cRes.characters || []).filter(c => c.status !== 'Deceased');
  } catch (e) {
    console.error('[BuildingsPanel] Load failed:', e);
    if (modalBody) {
      modalBody.innerHTML = `<div class="bld-empty">❌ Failed to load: ${e.message}</div>`;
    }
    return;
  }

  if (!modalBody || !modalBody.parentNode) return;

  renderBuildingsPanel(modalBody, buildings, townId, characters);
}


function renderBuildingsPanel(container, buildings, townId, characters) {
  // Count unassigned characters
  const assignedIds = new Set();
  buildings.forEach(b => (b.residents || []).forEach(r => assignedIds.add(r.id)));
  const unassigned = characters.filter(c => !assignedIds.has(c.id));

  const completedB = buildings.filter(b => b.status === 'completed');
  const otherB = buildings.filter(b => b.status !== 'completed');

  container.innerHTML = `
    <div class="bld-panel">
      <div class="bld-summary-bar">
        <span class="bld-stat">🏗️ <strong>${buildings.length}</strong> building${buildings.length !== 1 ? 's' : ''}</span>
        <span class="bld-stat">👥 <strong>${characters.length - unassigned.length}</strong> assigned</span>
        <span class="bld-stat bld-stat-warn">🚶 <strong>${unassigned.length}</strong> unassigned</span>
      </div>

      <div class="bld-grid" id="bld-grid">
        ${buildings.length ? buildings.map(b => renderBuildingCard(b, characters)).join('') :
          '<div class="bld-empty"><div class="bld-empty-icon">🏗️</div>No buildings yet — add one below</div>'}
      </div>

      ${unassigned.length ? `
        <div class="bld-unassigned-section">
          <div class="bld-section-title">🚶 Unassigned Characters <span class="bld-count">${unassigned.length}</span></div>
          <div class="bld-unassigned-list">
            ${unassigned.map(c => `<span class="bld-char-badge" data-char-id="${c.id}" title="${c.race || ''} ${c.class || ''} ${c.level || ''}">${c.name}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      <div class="bld-add-bar">
        <button class="social-add-btn bld-add-btn" id="bld-add-building-btn">+ Add Building</button>
      </div>
    </div>
  `;

  // Wire add building button
  container.querySelector('#bld-add-building-btn')?.addEventListener('click', () => {
    openBuildingFormModal(townId, characters, null, () => refreshPanel(container, townId, characters));
  });

  // Wire building card interactions
  container.querySelectorAll('.bld-card').forEach(card => {
    const bid = parseInt(card.dataset.buildingId);
    const building = buildings.find(b => parseInt(b.id) === bid);
    if (!building) return;

    // Edit building
    card.querySelector('.bld-edit-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openBuildingFormModal(townId, characters, building, () => refreshPanel(container, townId, characters));
    });

    // Delete building
    card.querySelector('.bld-delete-btn')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`Delete "${building.name}"? Characters will be unassigned.`)) return;
      try {
        await apiDeleteBuilding(townId, bid);
        refreshPanel(container, townId, characters);
      } catch (err) { alert(err.message); }
    });

    // Add room
    card.querySelector('.bld-add-room-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openRoomFormModal(bid, null, () => refreshPanel(container, townId, characters));
    });

    // Assign character
    card.querySelector('.bld-assign-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openAssignCharModal(townId, bid, building.name, characters, buildings, () => refreshPanel(container, townId, characters));
    });

    // Edit rooms
    card.querySelectorAll('.bld-room-edit').forEach(roomEl => {
      roomEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const rid = parseInt(roomEl.dataset.roomId);
        const room = (building.rooms || []).find(r => parseInt(r.id) === rid);
        if (room) openRoomFormModal(bid, room, () => refreshPanel(container, townId, characters));
      });
    });

    // Delete rooms
    card.querySelectorAll('.bld-room-del').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const rid = parseInt(btn.dataset.roomId);
        if (!confirm('Delete this room?')) return;
        try {
          await apiDeleteRoom(bid, rid);
          refreshPanel(container, townId, characters);
        } catch (err) { alert(err.message); }
      });
    });

    // Unassign resident
    card.querySelectorAll('.bld-resident-remove').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const cid = parseInt(btn.dataset.charId);
        try {
          await apiAssignCharacterBuilding(townId, cid, null);
          refreshPanel(container, townId, characters);
        } catch (err) { alert(err.message); }
      });
    });
  });
}


function renderBuildingCard(b, characters) {
  const icon = BUILDING_ICONS[b.building_type] || BUILDING_ICONS.other;
  const statusColor = STATUS_COLORS[b.status] || '#888';
  const statusLabel = (b.status || 'completed').replace(/_/g, ' ');
  const rooms = b.rooms || [];
  const residents = b.residents || [];

  return `
    <div class="bld-card" data-building-id="${b.id}" data-status="${b.status || 'completed'}">
      <div class="bld-card-header">
        <span class="bld-card-icon">${icon}</span>
        <div class="bld-card-info">
          <div class="bld-card-name">${b.name}</div>
          <div class="bld-card-type">${(b.building_type || 'other').replace(/_/g, ' ')}${b.owner_name ? ' — 👤 ' + b.owner_name : ''}</div>
        </div>
        <span class="bld-status-badge" style="background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}44">${statusLabel}</span>
        <div class="bld-card-actions">
          <button class="bld-action-btn bld-edit-btn" title="Edit">✏️</button>
          <button class="bld-action-btn bld-delete-btn" title="Delete">🗑️</button>
        </div>
      </div>
      ${b.description ? `<div class="bld-card-desc">${b.description}</div>` : ''}

      ${b.status === 'under_construction' ? `
        <div class="bld-progress-wrap">
          <div class="bld-progress-bar">
            <div class="bld-progress-fill" style="width:${Math.min(100, ((b.build_progress || 0) / Math.max(1, b.build_time || 1)) * 100)}%"></div>
          </div>
          <span class="bld-progress-label">${b.build_progress || 0}/${b.build_time || 1} months</span>
        </div>
      ` : ''}

      ${rooms.length ? `
        <div class="bld-rooms-section">
          <div class="bld-rooms-title">Rooms <span class="bld-count">${rooms.length}</span></div>
          <div class="bld-rooms-list">
            ${rooms.map(r => `
              <div class="bld-room-chip" data-room-id="${r.id}">
                <span class="bld-room-name bld-room-edit" data-room-id="${r.id}">${roomTypeIcon(r.room_type)} ${r.name}</span>
                <button class="bld-room-del" data-room-id="${r.id}" title="Delete room">×</button>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="bld-residents-section">
        <div class="bld-residents-title">Residents <span class="bld-count">${residents.length}</span></div>
        <div class="bld-residents-list">
          ${residents.map(r => `
            <span class="bld-resident-badge">
              ${r.name} <span class="bld-resident-detail">${r.class || ''} ${r.level || ''}</span>
              <button class="bld-resident-remove" data-char-id="${r.id}" title="Unassign">×</button>
            </span>
          `).join('')}
          ${residents.length === 0 ? '<span class="bld-no-residents">No residents</span>' : ''}
        </div>
      </div>

      <div class="bld-card-footer">
        <button class="social-add-btn bld-add-room-btn" style="font-size:.62rem;padding:1px 6px;">+ Room</button>
        <button class="social-add-btn bld-assign-btn" style="font-size:.62rem;padding:1px 6px;">+ Assign Character</button>
      </div>
    </div>
  `;
}


function roomTypeIcon(type) {
  const icons = {
    common: '🪑', bedroom: '🛏️', kitchen: '🍳', storage: '📦', workshop: '🔧',
    cellar: '🪜', attic: '🏚️', office: '📋', chapel: '🕯️', armory: '⚔️',
    stable: '🐴', courtyard: '🌳', dungeon: '⛓️', throne: '👑', other: '🚪'
  };
  return icons[type] || '🚪';
}


async function refreshPanel(container, townId, characters) {
  try {
    const [bRes, cRes] = await Promise.all([
      apiGetBuildings(townId),
      apiGetCharacters(townId)
    ]);
    const chars = (cRes.characters || []).filter(c => c.status !== 'Deceased');
    renderBuildingsPanel(container, bRes.buildings || [], townId, chars);
  } catch (e) { console.error('Failed to refresh buildings:', e); }
}


/* ── Modal Forms ─────────────────────────────────────────── */

function openBuildingFormModal(townId, characters, existing, onDone) {
  const isEdit = !!existing;
  const title = isEdit ? '✏️ Edit Building' : '🏗️ Add Building';

  const typeOptions = Object.keys(BUILDING_ICONS).map(t =>
    `<option value="${t}" ${(existing?.building_type || 'other') === t ? 'selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`
  ).join('');

  const statusOptions = ['completed', 'under_construction', 'planned', 'damaged', 'destroyed'].map(s =>
    `<option value="${s}" ${(existing?.status || 'completed') === s ? 'selected' : ''}>${s.replace(/_/g, ' ')}</option>`
  ).join('');

  const charOptions = characters.map(c =>
    `<option value="${c.id}" ${parseInt(existing?.owner_id) === c.id ? 'selected' : ''}>${c.name}</option>`
  ).join('');

  const { el: m, close } = showModal({
    title, width: 'narrow',
    content: `<div class="modal-form">
      <label>Building Name</label>
      <input type="text" id="bld-name" class="form-input" placeholder="e.g. The Rusty Tankard" value="${existing?.name || ''}">
      <label>Type</label>
      <select id="bld-type" class="form-select">${typeOptions}</select>
      <label>Status</label>
      <select id="bld-status" class="form-select">${statusOptions}</select>
      <label>Description</label>
      <textarea id="bld-desc" class="form-input" rows="2" placeholder="What is this building?">${existing?.description || ''}</textarea>
      <label>Owner (optional)</label>
      <select id="bld-owner" class="form-select">
        <option value="">— None —</option>
        ${charOptions}
      </select>
      <button class="btn-primary" id="bld-save-btn" style="margin-top:.75rem;width:100%">${isEdit ? 'Save Changes' : 'Create Building'}</button>
    </div>`
  });

  m.querySelector('#bld-save-btn')?.addEventListener('click', async () => {
    const name = m.querySelector('#bld-name').value.trim();
    if (!name) return alert('Name required');
    const btn = m.querySelector('#bld-save-btn');
    btn.disabled = true; btn.textContent = 'Saving...';
    try {
      await apiSaveBuilding(townId, {
        id: existing?.id || 0,
        name,
        building_type: m.querySelector('#bld-type').value,
        status: m.querySelector('#bld-status').value,
        description: m.querySelector('#bld-desc').value,
        owner_id: m.querySelector('#bld-owner').value || null,
        sort_order: existing?.sort_order || 0,
        build_progress: existing?.build_progress || 0,
        build_time: existing?.build_time || 1
      });
      close();
      onDone();
    } catch (e) { alert(e.message); btn.disabled = false; btn.textContent = isEdit ? 'Save Changes' : 'Create Building'; }
  });
}


function openRoomFormModal(buildingId, existing, onDone) {
  const isEdit = !!existing;
  const title = isEdit ? '✏️ Edit Room' : '🚪 Add Room';

  const typeOptions = ROOM_TYPES.map(t =>
    `<option value="${t}" ${(existing?.room_type || 'common') === t ? 'selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`
  ).join('');

  const { el: m, close } = showModal({
    title, width: 'narrow',
    content: `<div class="modal-form">
      <label>Room Name</label>
      <input type="text" id="room-name" class="form-input" placeholder="e.g. Main Hall" value="${existing?.name || ''}">
      <label>Type</label>
      <select id="room-type" class="form-select">${typeOptions}</select>
      <label>Description</label>
      <textarea id="room-desc" class="form-input" rows="2" placeholder="What's in this room?">${existing?.description || ''}</textarea>
      <button class="btn-primary" id="room-save-btn" style="margin-top:.75rem;width:100%">${isEdit ? 'Save Changes' : 'Add Room'}</button>
    </div>`
  });

  m.querySelector('#room-save-btn')?.addEventListener('click', async () => {
    const name = m.querySelector('#room-name').value.trim();
    if (!name) return alert('Name required');
    const btn = m.querySelector('#room-save-btn');
    btn.disabled = true; btn.textContent = 'Saving...';
    try {
      await apiSaveRoom(buildingId, {
        id: existing?.id || 0,
        name,
        room_type: m.querySelector('#room-type').value,
        description: m.querySelector('#room-desc').value,
        sort_order: existing?.sort_order || 0
      });
      close();
      onDone();
    } catch (e) { alert(e.message); btn.disabled = false; btn.textContent = isEdit ? 'Save Changes' : 'Add Room'; }
  });
}


function openAssignCharModal(townId, buildingId, buildingName, characters, buildings, onDone) {
  // Find chars NOT already assigned to this building
  const currentResidents = new Set();
  const bld = buildings.find(b => parseInt(b.id) === buildingId);
  if (bld) (bld.residents || []).forEach(r => currentResidents.add(parseInt(r.id)));
  const available = characters.filter(c => !currentResidents.has(c.id));

  if (!available.length) {
    alert('All characters are already assigned to this building or deceased.');
    return;
  }

  const { el: m, close } = showModal({
    title: `👤 Assign to ${buildingName}`, width: 'narrow',
    content: `<div class="modal-form">
      <label>Character</label>
      <select id="assign-char" class="form-select">
        ${available.map(c => `<option value="${c.id}">${c.name} (${c.class || '?'} ${c.level || ''})</option>`).join('')}
      </select>
      <button class="btn-primary" id="assign-save-btn" style="margin-top:.75rem;width:100%">Assign Character</button>
    </div>`
  });

  m.querySelector('#assign-save-btn')?.addEventListener('click', async () => {
    const charId = parseInt(m.querySelector('#assign-char').value);
    const btn = m.querySelector('#assign-save-btn');
    btn.disabled = true; btn.textContent = 'Assigning...';
    try {
      await apiAssignCharacterBuilding(townId, charId, buildingId);
      close();
      onDone();
    } catch (e) { alert(e.message); btn.disabled = false; btn.textContent = 'Assign Character'; }
  });
}
