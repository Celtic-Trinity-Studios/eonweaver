/**
 * Town map on the roster's character panel.
 * The map is an uploaded image that fits the tab. Drag a roster row onto it to place that resident.
 */
import { getState, setState, subscribe } from '../stores/appState.js';
import { showToast } from './Toast.js';
import {
  apiGetTownMap,
  apiSaveTownMapPin,
  apiDeleteTownMapPin,
  apiClearTownMapImage,
  apiSaveTownMapProp,
  apiDeleteTownMapProp,
  apiUploadTownMap,
  townMapAssetUrl,
} from '../api/townMap.js';
import { gridFromImageData } from './townMapGrid.js';
import { describeMap, drawMap, generateMap, randomMapSeed } from '../engine/mapGenerator.js';

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fitImage(img, scroll, zoom) {
  if (!scroll || !img?.naturalWidth || !img.naturalHeight) return;
  const maxW = Math.max(1, scroll.clientWidth - 16);
  const maxH = Math.max(1, scroll.clientHeight - 16);
  const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight) * zoom;
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  img.style.width = `${width}px`;
  img.style.height = `${height}px`;
  const wrap = img.closest('.tmap-image-wrap');
  if (wrap) {
    wrap.style.width = `${width}px`;
    wrap.style.height = `${height}px`;
  }
  const stage = scroll.querySelector('.tmap-stage');
  if (stage) {
    const pad = 16;
    stage.style.width = `${Math.max(scroll.clientWidth, width + pad)}px`;
    stage.style.height = `${Math.max(scroll.clientHeight, height + pad)}px`;
  }
}

function guessMapKind(name) {
  const n = String(name || '').toLowerCase();
  if (/\b(cave|cavern|grotto|mine|den|burrow|tomb)\b/.test(n)) return 'cave';
  if (/\b(inn|tavern|house|hall|shop|temple|tower|manor|keep|guild|barn|hut|cabin|fort|home|store|chapel|cottage)\b/.test(n)) return 'building';
  return 'dungeon';
}

function pinInitials(name) {
  const parts = String(name || '?').trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || '?';
}

/**
 * Wire Character / Map tabs on the roster detail panel.
 * Returns an unsubscribe function.
 */
export function mountTownRosterMap(root) {
  const tabs = root.querySelector('#detail-mode-tabs');
  const mapPane = root.querySelector('#town-map-pane');
  const charPane = root.querySelector('#detail-area');
  if (!tabs || !mapPane || !charPane) return () => {};

  let mode = 'character';
  let painting = false;
  let paintKey = '';
  let fitObserver = null;
  let genFitObserver = null;
  let zoom = 1;
  let snapOn = true;
  let placeKind = '';
  let pointer = null;
  let hoverId = '';
  let cache = { townId: 0, image_url: '', pins: [], props: [], loaded: false, error: '', grid: null };
  const gen = { kind: 'dungeon', size: 'medium', seed: 0, userKind: false, layout: null };

  function pinFor(id) {
    const n = Number(id);
    if (!n) return null;
    return cache.pins.find((p) => Number(p.character_id) === n) || null;
  }

  function hintText() {
    const townName = getState().currentTown?.name || 'Town';
    if (cache.error) return cache.error;
    if (!cache.image_url) return `${townName} — generate a map, or upload a picture.`;
    if (placeKind === 'door') {
      return `${townName} — click the map to drop a door. Click Door again when you are done.`;
    }
    if (placeKind === 'trap') {
      return `${townName} — click the map to drop a trap. Click Trap again when you are done.`;
    }
    const gridNote = cache.grid
      ? (snapOn ? '5 ft squares, snap on.' : '5 ft squares, snap off.')
      : 'No square grid found on this picture.';
    return `${townName} — drag a resident onto the map. ${gridNote}`;
  }

  function pointOnImage(e) {
    const img = mapPane.querySelector('.tmap-image');
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (x < 0 || y < 0 || x > 100 || y > 100) return null;
    return { x, y };
  }

  function ensureShell() {
    if (mapPane.querySelector('#tmap-scroll')) return;
    mapPane.innerHTML = `
      <div class="tmap">
        <div class="tmap-toolbar">
          <p class="tmap-hint" id="tmap-hint"></p>
          <div class="tmap-toolbar-actions">
            <button type="button" class="btn-secondary btn-sm" id="tmap-upload-btn">Upload map</button>
            <button type="button" class="btn-secondary btn-sm" id="tmap-generate-btn">Generate</button>
            <button type="button" class="btn-secondary btn-sm" id="tmap-clear-btn" hidden>Remove map</button>
            <button type="button" class="btn-secondary btn-sm" id="tmap-snap" title="Snap tokens to 5-foot squares">Snap</button>
            <div class="tmap-zoom">
              <button type="button" class="btn-secondary btn-sm" id="tmap-zoom-out" title="Zoom out">−</button>
              <span class="tmap-zoom-label" id="tmap-zoom-label">100%</span>
              <button type="button" class="btn-secondary btn-sm" id="tmap-zoom-in" title="Zoom in">+</button>
            </div>
            <input type="file" id="tmap-file" accept="image/jpeg,image/png,image/webp,image/gif" hidden>
          </div>
        </div>
        <div class="tmap-gen" id="tmap-gen" hidden>
          <div class="tmap-gen-card" role="dialog" aria-modal="true" aria-label="Generate map">
            <div class="tmap-gen-bar">
              <strong class="tmap-gen-title">Generate map</strong>
              <label class="tmap-gen-field">Kind
                <select id="tmap-gen-kind" class="form-select">
                  <option value="dungeon">Dungeon</option>
                  <option value="cave">Cave</option>
                  <option value="building">Building</option>
                </select>
              </label>
              <label class="tmap-gen-field">Size
                <select id="tmap-gen-size" class="form-select">
                  <option value="small">Small</option>
                  <option value="medium" selected>Medium</option>
                  <option value="large">Large</option>
                </select>
              </label>
              <label class="tmap-gen-field">Seed
                <input id="tmap-gen-seed" class="form-input" inputmode="numeric" maxlength="9" autocomplete="off" aria-label="Seed">
              </label>
              <button type="button" class="btn-secondary btn-sm" id="tmap-gen-again">Another</button>
              <button type="button" class="btn-secondary btn-sm" id="tmap-gen-close">Close</button>
            </div>
            <p class="tmap-gen-note" id="tmap-gen-note"></p>
            <div class="tmap-gen-preview">
              <canvas id="tmap-gen-preview"></canvas>
            </div>
            <div class="tmap-gen-actions">
              <button type="button" class="btn-primary btn-sm" id="tmap-gen-use">Use this map</button>
            </div>
          </div>
        </div>
        <div class="tmap-placebar" id="tmap-placebar">
          <span class="tmap-placebar-label">Place</span>
          <button type="button" class="btn-secondary btn-sm" id="tmap-door">Door</button>
          <button type="button" class="btn-secondary btn-sm" id="tmap-trap">Trap</button>
          <span class="tmap-placebar-note" id="tmap-place-note">Click Door or Trap, then click the map. These are marks you add. They are separate from the drawing.</span>
        </div>
        <div class="tmap-scroll" id="tmap-scroll"></div>
      </div>`;
    mapPane.querySelector('#tmap-upload-btn').addEventListener('click', () => {
      mapPane.querySelector('#tmap-file')?.click();
    });
    mapPane.querySelector('#tmap-file').addEventListener('change', onFile);
    mapPane.querySelector('#tmap-generate-btn').addEventListener('click', openGenerator);
    mapPane.querySelector('#tmap-gen-close').addEventListener('click', closeGenerator);
    mapPane.querySelector('#tmap-gen-again').addEventListener('click', anotherMap);
    mapPane.querySelector('#tmap-gen-use').addEventListener('click', () => {
      applyGenerated().catch((err) => showToast(err.message || 'Could not save the generated map.', 'error'));
    });
    mapPane.querySelector('#tmap-gen-kind').addEventListener('change', () => {
      gen.userKind = true;
      renderGenerated();
    });
    mapPane.querySelector('#tmap-gen-size').addEventListener('change', renderGenerated);
    mapPane.querySelector('#tmap-gen-seed').addEventListener('change', commitSeed);
    mapPane.querySelector('#tmap-gen-seed').addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      e.currentTarget.blur();
    });
    mapPane.querySelector('#tmap-gen').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeGenerator();
    });
    mapPane.querySelector('#tmap-clear-btn').addEventListener('click', onClear);
    mapPane.querySelector('#tmap-snap').addEventListener('click', () => {
      snapOn = !snapOn;
      updateSnapButton();
      const hint = mapPane.querySelector('#tmap-hint');
      if (hint) hint.textContent = hintText();
    });
    mapPane.querySelector('#tmap-door').addEventListener('click', () => setPlaceKind('door'));
    mapPane.querySelector('#tmap-trap').addEventListener('click', () => setPlaceKind('trap'));
    const scroll = mapPane.querySelector('#tmap-scroll');
    scroll.addEventListener('dragover', onDragOver);
    scroll.addEventListener('dragleave', onDragLeave);
    scroll.addEventListener('drop', onDrop);
    scroll.addEventListener('pointerdown', onPointerDown);
    scroll.addEventListener('pointermove', onPointerMove);
    scroll.addEventListener('pointerup', onPointerUp);
    scroll.addEventListener('pointercancel', onPointerUp);
    scroll.addEventListener('wheel', onWheel, { passive: false });
    scroll.addEventListener('contextmenu', onContextMenu);
    scroll.addEventListener('pointerover', onPointerOver);
    scroll.addEventListener('pointerout', onPointerOut);
    scroll.addEventListener('dblclick', onDoubleClick);
    scroll.addEventListener('scroll', () => {
      closeTokenMenu();
      closeHover();
      closeDesc();
    });
    mapPane.querySelector('#tmap-zoom-in').addEventListener('click', () => setZoom(zoom * 1.25));
    mapPane.querySelector('#tmap-zoom-out').addEventListener('click', () => setZoom(zoom / 1.25));
    const previewBox = mapPane.querySelector('.tmap-gen-preview');
    if (previewBox && typeof ResizeObserver !== 'undefined') {
      genFitObserver = new ResizeObserver(() => fitGeneratedPreview());
      genFitObserver.observe(previewBox);
    }
    updateSnapButton();
  }

  function fitGeneratedPreview() {
    const canvas = mapPane.querySelector('#tmap-gen-preview');
    const box = canvas?.parentElement;
    if (!canvas || !box || !canvas.width || !canvas.height) return;
    const maxW = box.clientWidth;
    const maxH = box.clientHeight;
    if (maxW < 8 || maxH < 8) return;
    const scale = Math.min(maxW / canvas.width, maxH / canvas.height);
    canvas.style.width = `${Math.max(1, Math.floor(canvas.width * scale))}px`;
    canvas.style.height = `${Math.max(1, Math.floor(canvas.height * scale))}px`;
  }

  function bindFit() {
    const scroll = mapPane.querySelector('#tmap-scroll');
    const img = mapPane.querySelector('.tmap-image');
    if (!scroll || !img) return;
    const run = () => {
      fitImage(img, scroll, zoom);
      readGrid(img);
      applyTokenScale();
    };
    if (img.complete) run();
    img.addEventListener('load', run);
    fitObserver?.disconnect();
    fitObserver = new ResizeObserver(run);
    fitObserver.observe(scroll);
    updateZoomLabel();
  }

  function updateZoomLabel() {
    const label = mapPane.querySelector('#tmap-zoom-label');
    if (label) label.textContent = `${Math.round(zoom * 100)}%`;
  }

  function updateSnapButton() {
    const btn = mapPane.querySelector('#tmap-snap');
    if (!btn) return;
    const ready = !!cache.grid;
    btn.disabled = !ready;
    btn.classList.toggle('is-on', ready && snapOn);
    btn.title = ready
      ? 'Snap medium creatures to one 5-foot square'
      : 'No square grid found on this picture';
  }

  function updatePlaceButtons() {
    const ready = !!cache.image_url;
    const door = mapPane.querySelector('#tmap-door');
    const trap = mapPane.querySelector('#tmap-trap');
    if (door) {
      door.disabled = !ready;
      door.classList.toggle('is-on', ready && placeKind === 'door');
    }
    if (trap) {
      trap.disabled = !ready;
      trap.classList.toggle('is-on', ready && placeKind === 'trap');
    }
    mapPane.querySelector('#tmap-scroll')?.classList.toggle('is-placing', ready && !!placeKind);
    const note = mapPane.querySelector('#tmap-place-note');
    if (!note) return;
    if (!ready) {
      note.textContent = 'Generate or upload a map, then click Door or Trap and click the picture.';
      return;
    }
    if (placeKind === 'door') {
      note.textContent = 'Click the map to drop a door. Click the door to open it. Right-click it to lock, turn, or remove it.';
      return;
    }
    if (placeKind === 'trap') {
      note.textContent = 'Click the map to drop a trap. Click the trap to spring it. Right-click it to disarm or remove it.';
      return;
    }
    note.textContent = 'Click Door or Trap, then click the map. These are marks you add. They are separate from the drawing.';
  }

  function setPlaceKind(kind) {
    placeKind = placeKind === kind ? '' : kind;
    closeTokenMenu();
    closeHover();
    updatePlaceButtons();
    const hint = mapPane.querySelector('#tmap-hint');
    if (hint) hint.textContent = hintText();
  }

  function readGrid(img) {
    if (!img?.naturalWidth || !img.naturalHeight) return;
    const src = img.currentSrc || img.src;
    if (cache.gridSrc === src) return;
    cache.gridSrc = src;
    const maxDim = 900;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, w, h);
    let grid = null;
    try {
      grid = gridFromImageData(ctx.getImageData(0, 0, w, h).data, w, h, scale);
    } catch (err) {
      grid = null;
    }
    cache.grid = grid;
    updateSnapButton();
    const hint = mapPane.querySelector('#tmap-hint');
    if (hint) hint.textContent = hintText();
  }

  function applyTokenScale() {
    const img = mapPane.querySelector('.tmap-image');
    const wrap = mapPane.querySelector('.tmap-image-wrap');
    if (!img || !wrap) return;
    const displayW = img.getBoundingClientRect().width || parseFloat(img.style.width) || 0;
    let cell = 36 * zoom;
    if (cache.grid && img.naturalWidth && displayW) {
      cell = (cache.grid.cell / img.naturalWidth) * displayW;
    }
    wrap.style.setProperty('--tmap-cell', `${Math.max(8, cell)}px`);
  }

  function snapPoint(point) {
    if (!point || !snapOn || !cache.grid) return point;
    const img = mapPane.querySelector('.tmap-image');
    if (!img?.naturalWidth || !img.naturalHeight) return point;
    const { cell, originX, originY } = cache.grid;
    if (!cell) return point;
    const px = (point.x / 100) * img.naturalWidth;
    const py = (point.y / 100) * img.naturalHeight;
    const col = Math.round((px - originX) / cell - 0.5);
    const row = Math.round((py - originY) / cell - 0.5);
    const maxCol = Math.max(0, Math.floor((img.naturalWidth - originX) / cell) - 1);
    const maxRow = Math.max(0, Math.floor((img.naturalHeight - originY) / cell) - 1);
    const cx = originX + (Math.min(maxCol, Math.max(0, col)) + 0.5) * cell;
    const cy = originY + (Math.min(maxRow, Math.max(0, row)) + 0.5) * cell;
    return {
      x: Math.min(100, Math.max(0, (cx / img.naturalWidth) * 100)),
      y: Math.min(100, Math.max(0, (cy / img.naturalHeight) * 100)),
    };
  }

  function snapDoor(point) {
    if (!point) return null;
    const img = mapPane.querySelector('.tmap-image');
    if (!snapOn || !cache.grid || !img?.naturalWidth || !img.naturalHeight) {
      return { x: point.x, y: point.y, facing: 'h' };
    }
    const { cell, originX, originY } = cache.grid;
    if (!cell) return { x: point.x, y: point.y, facing: 'h' };
    const px = (point.x / 100) * img.naturalWidth;
    const py = (point.y / 100) * img.naturalHeight;
    const col = (px - originX) / cell;
    const row = (py - originY) / cell;
    const vLine = Math.round(col);
    const hLine = Math.round(row);
    const distV = Math.abs(col - vLine);
    const distH = Math.abs(row - hLine);
    if (Math.min(distV, distH) > 0.45) {
      return { x: point.x, y: point.y, facing: distV <= distH ? 'v' : 'h' };
    }
    const maxCol = Math.max(0, Math.round((img.naturalWidth - originX) / cell));
    const maxRow = Math.max(0, Math.round((img.naturalHeight - originY) / cell));
    let facing = 'h';
    let cx = px;
    let cy = py;
    if (Math.abs(col - vLine) <= Math.abs(row - hLine)) {
      facing = 'v';
      const line = Math.min(maxCol, Math.max(0, vLine));
      const cellRow = Math.min(Math.max(0, Math.floor(row)), Math.max(0, maxRow - 1));
      cx = originX + line * cell;
      cy = originY + (cellRow + 0.5) * cell;
    } else {
      const line = Math.min(maxRow, Math.max(0, hLine));
      const cellCol = Math.min(Math.max(0, Math.floor(col)), Math.max(0, maxCol - 1));
      cx = originX + (cellCol + 0.5) * cell;
      cy = originY + line * cell;
    }
    return {
      x: Math.min(100, Math.max(0, (cx / img.naturalWidth) * 100)),
      y: Math.min(100, Math.max(0, (cy / img.naturalHeight) * 100)),
      facing,
    };
  }

  function propFor(id) {
    const n = Number(id);
    if (!n) return null;
    return (cache.props || []).find((p) => Number(p.id) === n) || null;
  }

  function propKey() {
    return (cache.props || []).map((p) => `${p.id}:${p.kind}:${p.x_pct}:${p.y_pct}:${p.facing}:${p.state}`).join(',');
  }

  function propButton(prop) {
    const id = Number(prop.id);
    const kind = prop.kind === 'trap' ? 'trap' : 'door';
    const facing = prop.facing === 'v' ? 'v' : 'h';
    const state = kind === 'trap'
      ? (prop.state === 'sprung' || prop.state === 'disarmed' ? prop.state : 'armed')
      : (prop.state === 'open' || prop.state === 'locked' ? prop.state : 'closed');
    const cls = kind === 'trap'
      ? `tmap-prop tmap-trap is-${state}`
      : `tmap-prop tmap-door is-${facing} is-${state}`;
    const name = kind === 'trap' ? 'Trap' : 'Door';
    return `<button type="button" class="${cls}" data-prop-id="${id}" style="left:${Number(prop.x_pct)}%;top:${Number(prop.y_pct)}%" aria-label="${name}, ${state}"></button>`;
  }

  function setZoom(next, clientX, clientY) {
    const scroll = mapPane.querySelector('#tmap-scroll');
    const img = mapPane.querySelector('.tmap-image');
    const wrap = mapPane.querySelector('.tmap-image-wrap');
    const clamped = Math.min(4, Math.max(0.4, next));
    if (!scroll || !img || !wrap || !img.naturalWidth) {
      zoom = clamped;
      updateZoomLabel();
      return;
    }
    const scrollRect = scroll.getBoundingClientRect();
    const anchorX = clientX == null ? scrollRect.left + scrollRect.width / 2 : clientX;
    const anchorY = clientY == null ? scrollRect.top + scrollRect.height / 2 : clientY;
    const before = wrap.getBoundingClientRect();
    const px = before.width ? (anchorX - before.left) / before.width : 0.5;
    const py = before.height ? (anchorY - before.top) / before.height : 0.5;
    zoom = clamped;
    fitImage(img, scroll, zoom);
    applyTokenScale();
    const after = wrap.getBoundingClientRect();
    const view = scroll.getBoundingClientRect();
    const leftInContent = scroll.scrollLeft + (after.left - view.left);
    const topInContent = scroll.scrollTop + (after.top - view.top);
    scroll.scrollLeft = leftInContent + px * after.width - (anchorX - view.left);
    scroll.scrollTop = topInContent + py * after.height - (anchorY - view.top);
    updateZoomLabel();
  }

  function paint() {
    const keepHover = hoverId;
    closeTokenMenu();
    closeHover();
    ensureShell();
    const hint = mapPane.querySelector('#tmap-hint');
    const scroll = mapPane.querySelector('#tmap-scroll');
    const clearBtn = mapPane.querySelector('#tmap-clear-btn');
    if (hint) hint.textContent = hintText();
    if (clearBtn) clearBtn.hidden = !cache.image_url;
    updatePlaceButtons();
    if (!scroll) return;
    if (!cache.image_url) {
      placeKind = '';
      fitObserver?.disconnect();
      scroll.innerHTML = '<div class="tmap-empty">Generate a dungeon, cave, or building, or upload a JPG, PNG, WEBP, or GIF. Drag a resident onto the picture to place them once.</div>';
      updatePlaceButtons();
      return;
    }
    const selectedId = Number(getState().selectedCharId);
    const characters = getState().currentTown?.characters || [];
    const pins = cache.pins.map((pin) => {
      const id = Number(pin.character_id);
      const live = characters.find((c) => Number(c.id) === id || Number(c.dbId) === id);
      const name = live?.name || pin.name || 'Resident';
      const dead = (live?.status || pin.status) === 'Deceased' ? ' is-dead' : '';
      const on = id === selectedId ? ' is-selected' : '';
      const portrait = live?.portrait_url ? townMapAssetUrl(live.portrait_url) : '';
      const face = portrait
        ? `<img class="tmap-pin-img" alt="" draggable="false" src="${escHtml(portrait)}">`
        : `<span class="tmap-pin-fallback">${escHtml(pinInitials(name))}</span>`;
      return `<button type="button" class="tmap-pin${on}${dead}" data-char-id="${id}" style="left:${Number(pin.x_pct)}%;top:${Number(pin.y_pct)}%"><span class="tmap-pin-face">${face}</span><span class="tmap-pin-name">${escHtml(name)}</span></button>`;
    }).join('');
    scroll.innerHTML = `
      <div class="tmap-stage">
        <div class="tmap-image-wrap">
          <img class="tmap-image" alt="Town map" draggable="false" src="${escHtml(townMapAssetUrl(cache.image_url))}">
          ${(cache.props || []).map(propButton).join('')}
          ${pins}
        </div>
      </div>`;
    bindFit();
    if (keepHover) {
      const pin = scroll.querySelector(`.tmap-pin[data-char-id="${keepHover}"]`);
      if (pin) showHover(pin);
    }
  }

  async function load(townId) {
    if (cache.townId !== townId) placeKind = '';
    cache = { townId, image_url: '', pins: [], props: [], loaded: false, error: '' };
    try {
      const res = await apiGetTownMap(townId);
      if (cache.townId !== townId) return;
      cache.image_url = res.image_url || '';
      cache.pins = Array.isArray(res.pins) ? res.pins : [];
      cache.props = Array.isArray(res.props) ? res.props : [];
      cache.loaded = true;
    } catch (err) {
      if (cache.townId !== townId) return;
      cache.error = err.message || 'Could not load the town map.';
      cache.loaded = true;
    }
  }

  async function refresh() {
    if (mode !== 'map' || painting) return;
    const townId = Number(getState().currentTown?.id) || 0;
    ensureShell();
    if (townId && cache.townId && cache.townId !== townId) {
      closeGenerator();
      gen.userKind = false;
      gen.seed = 0;
      gen.layout = null;
    }
    if (townId && (!cache.loaded || cache.townId !== townId)) {
      painting = true;
      try {
        await load(townId);
      } finally {
        painting = false;
      }
    }
    if (mode !== 'map') return;
    const pinKey = cache.pins.map((p) => `${p.character_id}:${p.x_pct}:${p.y_pct}`).join(',');
    const key = `${cache.townId}|${cache.image_url}|${cache.error}|${getState().selectedCharId || ''}|${pinKey}|${propKey()}|${placeKind}`;
    const changed = key !== paintKey;
    paintKey = key;
    if (changed) paint();
  }

  function markPainted() {
    const pinKey = cache.pins.map((p) => `${p.character_id}:${p.x_pct}:${p.y_pct}`).join(',');
    paintKey = `${cache.townId}|${cache.image_url}|${cache.error}|${getState().selectedCharId || ''}|${pinKey}|${propKey()}|${placeKind}`;
  }

  async function placeResident(characterId, x, y) {
    const townId = Number(getState().currentTown?.id) || 0;
    const id = Number(characterId);
    if (!townId || !id || !cache.image_url) return;
    await apiSaveTownMapPin(townId, id, x, y);
    const characters = getState().currentTown?.characters || [];
    const live = characters.find((c) => Number(c.id) === id || Number(c.dbId) === id);
    const existing = pinFor(id);
    if (existing) {
      existing.x_pct = x;
      existing.y_pct = y;
    } else {
      cache.pins.push({
        character_id: id,
        x_pct: x,
        y_pct: y,
        name: live?.name || '',
        status: live?.status || '',
      });
    }
    const row = root.querySelector(`.char-row[data-id="${id}"]`);
    if (row) row.click();
    else setState({ selectedCharId: id });
    paint();
    markPainted();
  }

  async function persistProp(prop) {
    const townId = Number(getState().currentTown?.id) || 0;
    if (!townId) return null;
    const res = await apiSaveTownMapProp({
      town_id: townId,
      id: Number(prop.id) || 0,
      kind: prop.kind === 'trap' ? 'trap' : 'door',
      x_pct: prop.x_pct,
      y_pct: prop.y_pct,
      facing: prop.facing === 'v' ? 'v' : 'h',
      state: prop.state,
    });
    const saved = res.prop;
    if (!saved) return null;
    const idx = (cache.props || []).findIndex((p) => Number(p.id) === Number(saved.id));
    if (idx >= 0) cache.props[idx] = saved;
    else cache.props.push(saved);
    paint();
    markPainted();
    return saved;
  }

  async function removeProp(propId) {
    const townId = Number(getState().currentTown?.id) || 0;
    const id = Number(propId);
    if (!townId || !id || !propFor(id)) return;
    await apiDeleteTownMapProp(townId, id);
    cache.props = cache.props.filter((p) => Number(p.id) !== id);
    paint();
    markPainted();
  }

  async function placeProp(kind, point) {
    const snapped = kind === 'door' ? snapDoor(point) : { ...snapPoint(point), facing: 'h' };
    if (!snapped) return;
    await persistProp({
      kind,
      x_pct: snapped.x,
      y_pct: snapped.y,
      facing: snapped.facing || 'h',
      state: kind === 'trap' ? 'armed' : 'closed',
    });
  }

  async function cycleProp(id) {
    const prop = propFor(id);
    if (!prop) return;
    if (prop.kind === 'door') {
      if (prop.state === 'locked') {
        showToast('That door is locked. Right-click it to unlock.', 'info');
        return;
      }
      await persistProp({ ...prop, state: prop.state === 'open' ? 'closed' : 'open' });
      return;
    }
    if (prop.state === 'disarmed') {
      showToast('That trap is disarmed. Right-click it to arm it.', 'info');
      return;
    }
    await persistProp({ ...prop, state: prop.state === 'sprung' ? 'armed' : 'sprung' });
  }

  function closeGenerator() {
    const panel = mapPane.querySelector('#tmap-gen');
    if (panel) panel.hidden = true;
  }

  function openGenerator() {
    ensureShell();
    const panel = mapPane.querySelector('#tmap-gen');
    if (!panel) return;
    if (!gen.userKind) {
      gen.kind = guessMapKind(getState().currentTown?.name);
      const kindSel = mapPane.querySelector('#tmap-gen-kind');
      if (kindSel) kindSel.value = gen.kind;
    }
    const sizeSel = mapPane.querySelector('#tmap-gen-size');
    if (sizeSel) sizeSel.value = gen.size;
    if (!gen.seed) gen.seed = randomMapSeed();
    panel.hidden = false;
    renderGenerated();
  }

  function renderGenerated() {
    const kindSel = mapPane.querySelector('#tmap-gen-kind');
    const sizeSel = mapPane.querySelector('#tmap-gen-size');
    if (kindSel) gen.kind = kindSel.value === 'cave' || kindSel.value === 'building' ? kindSel.value : 'dungeon';
    if (sizeSel) gen.size = sizeSel.value === 'small' || sizeSel.value === 'large' ? sizeSel.value : 'medium';
    if (!gen.seed) gen.seed = randomMapSeed();
    const seedInput = mapPane.querySelector('#tmap-gen-seed');
    if (seedInput && document.activeElement !== seedInput) seedInput.value = String(gen.seed);
    gen.layout = generateMap({ kind: gen.kind, size: gen.size, seed: gen.seed });
    const canvas = mapPane.querySelector('#tmap-gen-preview');
    const note = mapPane.querySelector('#tmap-gen-note');
    if (canvas) drawMap(canvas, gen.layout);
    if (note) note.textContent = `${describeMap(gen.layout)}. ${gen.layout.blurb}`;
    fitGeneratedPreview();
    requestAnimationFrame(fitGeneratedPreview);
  }

  function anotherMap() {
    gen.seed = randomMapSeed();
    const seedInput = mapPane.querySelector('#tmap-gen-seed');
    if (seedInput) seedInput.value = String(gen.seed);
    renderGenerated();
  }

  function commitSeed() {
    const seedInput = mapPane.querySelector('#tmap-gen-seed');
    const n = parseInt(seedInput?.value || '', 10);
    gen.seed = Number.isFinite(n) && n > 0 ? n : randomMapSeed();
    if (seedInput) seedInput.value = String(gen.seed);
    renderGenerated();
  }

  async function applyGenerated() {
    const townId = Number(getState().currentTown?.id) || 0;
    const layout = gen.layout;
    const canvas = mapPane.querySelector('#tmap-gen-preview');
    if (!townId || !layout || !canvas) return;
    const placed = (cache.pins?.length || 0) + (cache.props?.length || 0);
    if (cache.image_url) {
      const extra = placed ? ' People, doors, and traps already on the map stay at their old positions.' : '';
      if (!window.confirm(`Replace the current map with this generated one?${extra}`)) return;
    }
    const useBtn = mapPane.querySelector('#tmap-gen-use');
    if (useBtn) useBtn.disabled = true;
    try {
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((value) => {
          if (value) resolve(value);
          else reject(new Error('Could not draw that map.'));
        }, 'image/png');
      });
      const file = new File([blob], `map-${layout.kind}-${layout.seed}.png`, { type: 'image/png' });
      const uploaded = await apiUploadTownMap(townId, file);
      cache.townId = townId;
      cache.image_url = uploaded.url || '';
      cache.loaded = true;
      cache.error = '';
      cache.grid = null;
      cache.gridSrc = '';
      closeGenerator();
      paint();
      markPainted();
      showToast('Generated map saved.', 'success');
    } catch (err) {
      showToast(err.message || 'Could not save the generated map.', 'error');
    } finally {
      if (useBtn) useBtn.disabled = false;
    }
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    const townId = Number(getState().currentTown?.id) || 0;
    if (!file || !townId) return;
    const btn = mapPane.querySelector('#tmap-upload-btn');
    if (btn) btn.disabled = true;
    try {
      const uploaded = await apiUploadTownMap(townId, file);
      cache.townId = townId;
      cache.image_url = uploaded.url || '';
      cache.loaded = true;
      cache.error = '';
      cache.grid = null;
      cache.gridSrc = '';
      paint();
      markPainted();
      showToast('Town map uploaded.', 'success');
    } catch (err) {
      showToast(err.message || 'Upload failed.', 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function onClear() {
    const townId = Number(getState().currentTown?.id) || 0;
    if (!townId || !cache.image_url) return;
    try {
      await apiClearTownMapImage(townId);
      cache.image_url = '';
      cache.props = [];
      cache.grid = null;
      cache.gridSrc = '';
      placeKind = '';
      paint();
      markPainted();
    } catch (err) {
      showToast(err.message || 'Could not remove the map.', 'error');
    }
  }

  async function removeResident(characterId) {
    const townId = Number(getState().currentTown?.id) || 0;
    const id = Number(characterId);
    if (!townId || !id || !pinFor(id)) return;
    await apiDeleteTownMapPin(townId, id);
    cache.pins = cache.pins.filter((p) => Number(p.character_id) !== id);
    paint();
    markPainted();
  }

  function closeTokenMenu() {
    document.getElementById('tmap-token-menu')?.remove();
  }

  function closeHover() {
    document.getElementById('tmap-hover')?.remove();
  }

  function closeDesc() {
    document.getElementById('tmap-desc')?.remove();
  }

  function residentFacts(id) {
    const n = Number(id);
    const characters = getState().currentTown?.characters || [];
    const live = characters.find((c) => Number(c.id) === n || Number(c.dbId) === n);
    const pin = pinFor(id);
    const gender = String(live?.gender || '').trim();
    let sex = '—';
    if (/^m(ale)?$/i.test(gender)) sex = 'Male';
    else if (/^f(emale)?$/i.test(gender)) sex = 'Female';
    else if (gender) sex = gender;
    return {
      name: live?.name || pin?.name || 'Resident',
      sex,
      age: live?.age ? String(live.age) : '—',
      hp: live?.hp ? String(live.hp) : '—',
      description: String(live?.history || '').trim(),
    };
  }

  function placeFloat(el, anchor, preferAbove) {
    const margin = 8;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let x = anchor.left + anchor.width / 2 - w / 2;
    let y = preferAbove ? anchor.top - h - 8 : anchor.bottom + 8;
    if (y < margin) y = anchor.bottom + 8;
    if (y + h > window.innerHeight - margin) y = Math.max(margin, anchor.top - h - 8);
    if (x < margin) x = margin;
    if (x + w > window.innerWidth - margin) x = Math.max(margin, window.innerWidth - margin - w);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }

  function showHover(pin) {
    if (pointer?.kind === 'pin' || pointer?.kind === 'prop' || document.getElementById('tmap-desc')) return;
    hoverId = pin.getAttribute('data-char-id') || '';
    hoverId = pin.getAttribute('data-char-id') || '';
    const facts = residentFacts(pin.getAttribute('data-char-id'));
    let card = document.getElementById('tmap-hover');
    if (!card) {
      card = document.createElement('div');
      card.id = 'tmap-hover';
      card.className = 'tmap-hover';
      card.innerHTML = '<strong></strong><div class="tmap-hover-meta"></div>';
      document.body.appendChild(card);
    }
    card.querySelector('strong').textContent = facts.name;
    card.querySelector('.tmap-hover-meta').textContent = `Sex ${facts.sex}   ·   Age ${facts.age}   ·   HP ${facts.hp}`;
    placeFloat(card, pin.getBoundingClientRect(), true);
  }

  function openDesc(pin) {
    closeHover();
    closeTokenMenu();
    closeDesc();
    const facts = residentFacts(pin.getAttribute('data-char-id'));
    const pop = document.createElement('div');
    pop.id = 'tmap-desc';
    pop.className = 'tmap-desc';
    pop.innerHTML = '<div class="tmap-desc-head"><strong></strong><button type="button" class="tmap-desc-close" aria-label="Close">×</button></div><p></p>';
    pop.querySelector('strong').textContent = facts.name;
    pop.querySelector('p').textContent = facts.description || 'No description recorded.';
    document.body.appendChild(pop);
    placeFloat(pop, pin.getBoundingClientRect(), false);
    pop.querySelector('button').addEventListener('click', () => closeDesc());
  }

  function openFloatMenu(clientX, clientY, items) {
    closeTokenMenu();
    const menu = document.createElement('div');
    menu.id = 'tmap-token-menu';
    menu.className = 'tmap-token-menu';
    menu.innerHTML = items.map((item, i) => (
      `<button type="button" class="tmap-token-menu-item${item.danger ? ' is-danger' : ''}" data-i="${i}">${escHtml(item.label)}</button>`
    )).join('');
    document.body.appendChild(menu);
    const margin = 8;
    let x = clientX;
    let y = clientY;
    if (x + menu.offsetWidth > window.innerWidth - margin) x = window.innerWidth - margin - menu.offsetWidth;
    if (y + menu.offsetHeight > window.innerHeight - margin) y = window.innerHeight - margin - menu.offsetHeight;
    menu.style.left = `${Math.max(margin, x)}px`;
    menu.style.top = `${Math.max(margin, y)}px`;
    menu.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = items[Number(btn.dataset.i)];
        closeTokenMenu();
        item?.run();
      });
    });
  }

  function openTokenMenu(pin, clientX, clientY) {
    const id = pin.getAttribute('data-char-id');
    openFloatMenu(clientX, clientY, [{
      label: 'Delete from map',
      danger: true,
      run: () => {
        removeResident(id).catch((err) => {
          showToast(err.message || 'Could not take that resident off the map.', 'error');
        });
      },
    }]);
  }

  function openPropMenu(el, clientX, clientY) {
    const prop = propFor(el.getAttribute('data-prop-id'));
    if (!prop) return;
    const fail = (err) => showToast(err.message || 'Could not update that mark.', 'error');
    const items = [];
    if (prop.kind === 'door') {
      items.push({
        label: prop.state === 'open' ? 'Close' : 'Open',
        run: () => persistProp({ ...prop, state: prop.state === 'open' ? 'closed' : 'open' }).catch(fail),
      });
      items.push({
        label: prop.state === 'locked' ? 'Unlock' : 'Lock',
        run: () => persistProp({ ...prop, state: prop.state === 'locked' ? 'closed' : 'locked' }).catch(fail),
      });
      items.push({
        label: 'Turn',
        run: () => persistProp({ ...prop, facing: prop.facing === 'v' ? 'h' : 'v' }).catch(fail),
      });
    } else {
      items.push({
        label: prop.state === 'sprung' ? 'Reset' : 'Spring',
        run: () => persistProp({ ...prop, state: prop.state === 'sprung' ? 'armed' : 'sprung' }).catch(fail),
      });
      items.push({
        label: prop.state === 'disarmed' ? 'Arm' : 'Disarm',
        run: () => persistProp({ ...prop, state: prop.state === 'disarmed' ? 'armed' : 'disarmed' }).catch(fail),
      });
    }
    items.push({
      label: 'Remove',
      danger: true,
      run: () => removeProp(prop.id).catch(fail),
    });
    openFloatMenu(clientX, clientY, items);
  }

  function showPropHover(el) {
    if (pointer?.kind === 'pin' || pointer?.kind === 'prop') return;
    const prop = propFor(el.getAttribute('data-prop-id'));
    if (!prop) return;
    hoverId = `prop-${prop.id}`;
    const name = prop.kind === 'trap' ? 'Trap' : 'Door';
    const state = String(prop.state || 'closed').replace(/^./, (c) => c.toUpperCase());
    let card = document.getElementById('tmap-hover');
    if (!card) {
      card = document.createElement('div');
      card.id = 'tmap-hover';
      card.className = 'tmap-hover';
      card.innerHTML = '<strong></strong><div class="tmap-hover-meta"></div>';
      document.body.appendChild(card);
    }
    card.querySelector('strong').textContent = name;
    card.querySelector('.tmap-hover-meta').textContent = state;
    placeFloat(card, el.getBoundingClientRect(), true);
  }

  function selectResident(id) {
    const row = root.querySelector(`.char-row[data-id="${id}"]`);
    if (row) row.click();
    else setState({ selectedCharId: Number(id) });
  }

  function onContextMenu(e) {
    const pin = e.target.closest('.tmap-pin');
    const prop = e.target.closest('.tmap-prop');
    closeTokenMenu();
    if (pin) {
      e.preventDefault();
      openTokenMenu(pin, e.clientX, e.clientY);
      return;
    }
    if (!prop) return;
    e.preventDefault();
    openPropMenu(prop, e.clientX, e.clientY);
  }

  function onKeyDown(e) {
    if (e.key !== 'Escape') return;
    const panel = mapPane.querySelector('#tmap-gen');
    if (panel && !panel.hidden) {
      closeGenerator();
      return;
    }
    closeTokenMenu();
    closeDesc();
    if (!placeKind) return;
    placeKind = '';
    updatePlaceButtons();
    const hint = mapPane.querySelector('#tmap-hint');
    if (hint) hint.textContent = hintText();
  }

  function onDocPointerDown(e) {
    const menu = document.getElementById('tmap-token-menu');
    if (menu && !menu.contains(e.target)) closeTokenMenu();
    const desc = document.getElementById('tmap-desc');
    if (desc && !desc.contains(e.target)) closeDesc();
  }

  function onPointerOver(e) {
    const prop = e.target.closest('.tmap-prop');
    if (prop) {
      showPropHover(prop);
      return;
    }
    const pin = e.target.closest('.tmap-pin');
    if (!pin) return;
    showHover(pin);
  }

  function onPointerOut(e) {
    const prop = e.target.closest('.tmap-prop');
    if (prop) {
      if (e.relatedTarget && prop.contains(e.relatedTarget)) return;
      hoverId = '';
      closeHover();
      return;
    }
    const pin = e.target.closest('.tmap-pin');
    if (!pin) return;
    if (e.relatedTarget && pin.contains(e.relatedTarget)) return;
    hoverId = '';
    closeHover();
  }

  function onDoubleClick(e) {
    const hit = e.target.closest('.tmap-pin');
    if (!hit) return;
    e.preventDefault();
    const id = hit.getAttribute('data-char-id');
    const pin = mapPane.querySelector(`.tmap-pin[data-char-id="${id}"]`) || hit;
    openDesc(pin);
  }

  function onPointerDown(e) {
    if (e.button !== 0) return;
    const scroll = mapPane.querySelector('#tmap-scroll');
    const pin = e.target.closest('.tmap-pin');
    if (pin) {
      pointer = { kind: 'pin', id: pin.getAttribute('data-char-id'), x: e.clientX, y: e.clientY, moved: false, point: null };
      pin.setPointerCapture?.(e.pointerId);
      e.preventDefault();
      return;
    }
    const prop = e.target.closest('.tmap-prop');
    if (prop) {
      pointer = { kind: 'prop', id: prop.getAttribute('data-prop-id'), x: e.clientX, y: e.clientY, moved: false, point: null };
      prop.setPointerCapture?.(e.pointerId);
      e.preventDefault();
      return;
    }
    if (!scroll || !e.target.closest('.tmap-image-wrap, .tmap-stage')) return;
    if (placeKind) {
      pointer = {
        kind: 'place',
        placeKind,
        x: e.clientX,
        y: e.clientY,
        clientX: e.clientX,
        clientY: e.clientY,
        moved: false,
        sl: scroll.scrollLeft,
        st: scroll.scrollTop,
      };
      scroll.setPointerCapture?.(e.pointerId);
      return;
    }
    pointer = { kind: 'pan', x: e.clientX, y: e.clientY, sl: scroll.scrollLeft, st: scroll.scrollTop };
    scroll.setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e) {
    if (!pointer) return;
    const scroll = mapPane.querySelector('#tmap-scroll');
    if (pointer.kind === 'place') {
      pointer.clientX = e.clientX;
      pointer.clientY = e.clientY;
      if (Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y) > 4) {
        pointer.kind = 'pan';
        pointer.moved = true;
      } else {
        return;
      }
    }
    if (pointer.kind === 'pan' && scroll) {
      scroll.scrollLeft = pointer.sl - (e.clientX - pointer.x);
      scroll.scrollTop = pointer.st - (e.clientY - pointer.y);
      return;
    }
    if (pointer.kind === 'prop') {
      if (Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y) > 4) {
        pointer.moved = true;
        closeHover();
      }
      if (!pointer.moved) return;
      const raw = pointOnImage(e);
      const prop = propFor(pointer.id);
      const point = prop?.kind === 'door' ? snapDoor(raw) : { ...snapPoint(raw), facing: prop?.facing || 'h' };
      const el = mapPane.querySelector(`.tmap-prop[data-prop-id="${pointer.id}"]`);
      if (!point || !el) return;
      el.style.left = `${point.x}%`;
      el.style.top = `${point.y}%`;
      if (prop?.kind === 'door') {
        el.classList.toggle('is-h', point.facing !== 'v');
        el.classList.toggle('is-v', point.facing === 'v');
      }
      pointer.point = point;
      return;
    }
    if (pointer.kind !== 'pin') return;
    if (Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y) > 4) {
      pointer.moved = true;
      closeHover();
    }
    if (!pointer.moved) return;
    const point = snapPoint(pointOnImage(e));
    const pin = mapPane.querySelector(`.tmap-pin[data-char-id="${pointer.id}"]`);
    if (!point || !pin) return;
    pin.style.left = `${point.x}%`;
    pin.style.top = `${point.y}%`;
    pointer.point = point;
  }

  async function onPointerUp() {
    if (!pointer) return;
    const current = pointer;
    pointer = null;
    if (current.kind === 'place') {
      if (current.moved) return;
      const point = pointOnImage({ clientX: current.clientX, clientY: current.clientY });
      if (!point) return;
      try {
        await placeProp(current.placeKind, point);
      } catch (err) {
        showToast(err.message || 'Could not place that.', 'error');
      }
      return;
    }
    if (current.kind === 'prop' && current.moved && current.point) {
      const prop = propFor(current.id);
      if (!prop) return;
      try {
        await persistProp({
          ...prop,
          x_pct: current.point.x,
          y_pct: current.point.y,
          facing: current.point.facing || prop.facing,
        });
      } catch (err) {
        paint();
        markPainted();
        showToast(err.message || 'Could not move that mark.', 'error');
      }
      return;
    }
    if (current.kind === 'prop') {
      try {
        await cycleProp(current.id);
      } catch (err) {
        showToast(err.message || 'Could not update that mark.', 'error');
      }
      return;
    }
    if (current.kind === 'pin' && current.moved && current.point) {
      try {
        await placeResident(current.id, current.point.x, current.point.y);
      } catch (err) {
        showToast(err.message || 'Could not move that resident.', 'error');
      }
      return;
    }
    if (current.kind === 'pin') selectResident(current.id);
  }

  function onWheel(e) {
    if (!cache.image_url) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setZoom(zoom * factor, e.clientX, e.clientY);
  }

  function onDragOver(e) {
    if (!cache.image_url) return;
    const types = [...(e.dataTransfer?.types || [])];
    if (!types.includes('text/plain')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    mapPane.querySelector('#tmap-scroll')?.classList.add('is-dragover');
  }

  function onDragLeave(e) {
    const scroll = mapPane.querySelector('#tmap-scroll');
    if (scroll && !scroll.contains(e.relatedTarget)) scroll.classList.remove('is-dragover');
  }

  async function onDrop(e) {
    e.preventDefault();
    mapPane.querySelector('#tmap-scroll')?.classList.remove('is-dragover');
    const id = Number(e.dataTransfer?.getData('text/plain'));
    const point = snapPoint(pointOnImage(e));
    if (!id || !point) return;
    try {
      await placeResident(id, point.x, point.y);
    } catch (err) {
      showToast(err.message || 'Could not place that resident.', 'error');
    }
  }

  function show(next) {
    mode = next === 'map' ? 'map' : 'character';
    tabs.querySelectorAll('.detail-mode-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.detailTab === mode);
    });
    charPane.hidden = mode !== 'character';
    mapPane.hidden = mode !== 'map';
    if (mode === 'map') refresh();
  }

  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-detail-tab]');
    if (!btn) return;
    show(btn.dataset.detailTab);
  });

  root.querySelector('#list-body')?.addEventListener('dragstart', (e) => {
    const row = e.target.closest('.char-row');
    if (!row || !e.dataTransfer) return;
    e.dataTransfer.setData('text/plain', row.dataset.id || '');
    e.dataTransfer.effectAllowed = 'copy';
  });

  const unsub = subscribe(() => {
    if (mode === 'map') refresh();
  });
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('pointerdown', onDocPointerDown);
  return () => {
    fitObserver?.disconnect();
    genFitObserver?.disconnect();
    closeTokenMenu();
    closeHover();
    closeDesc();
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('pointerdown', onDocPointerDown);
    unsub();
  };
}
