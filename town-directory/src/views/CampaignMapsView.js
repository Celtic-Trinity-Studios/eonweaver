/**
 * Handout maps (MAP-CM-05): upload an image, pan/zoom, drop markers,
 * and inspect each marker in a sidebar linked to lore, a town, an NPC, or an encounter.
 * Distinct from the strategic World Map used for travel.
 */
import { navigate } from '../router.js';
import { setState } from '../stores/appState.js';
import { showToast } from '../components/Toast.js';
import {
  apiCampaignMapLinkOptions,
  apiDeleteCampaignMap,
  apiDeleteCampaignMapPoi,
  apiGetCampaignMap,
  apiListCampaignMaps,
  apiSaveCampaignMap,
  apiSaveCampaignMapPoi,
  apiUploadCampaignMap,
  campaignMapAssetUrl,
} from '../api/campaignMaps.js';

const DRAG_MIN_PX = 6;
const LINK_LABELS = {
  none: 'No link',
  lore: 'Lore page',
  town: 'Town',
  character: 'NPC',
  encounter: 'Encounter',
};

export default function CampaignMapsView(container, params) {
  const requestedId = params?.id ? parseInt(params.id, 10) : 0;

  container.innerHTML = `
    <div class="view-campaign-maps">
      <header class="view-header">
        <h1>📌 Handout Maps</h1>
        <div class="view-header-right">
          <span id="cmap-status" class="sim-status"></span>
          <button type="button" class="btn-secondary btn-sm" id="cmap-back-btn">← Dashboard</button>
        </div>
      </header>
      <p class="muted cmap-lead">Upload a continent, city, or dungeon image. Drop markers, then click one to edit its notes and open the linked lore page, town, NPC, or encounter. This is separate from the strategic World Map.</p>
      <div class="cmap-body">
        <aside class="dash-card cmap-maps" id="cmap-map-list">
          <div class="cmap-maps-head">
            <h2>Maps</h2>
            <button type="button" class="btn-primary btn-sm" id="cmap-new-btn">+ New</button>
          </div>
          <form id="cmap-new-form" class="cmap-new-form" hidden>
            <input type="text" id="cmap-new-title" class="form-input" maxlength="160" placeholder="Map title" required>
            <div class="cmap-new-actions">
              <button type="submit" class="btn-primary btn-sm">Create</button>
              <button type="button" class="btn-secondary btn-sm" id="cmap-new-cancel">Cancel</button>
            </div>
          </form>
          <div id="cmap-map-items" class="cmap-map-items"></div>
        </aside>
        <section class="dash-card cmap-canvas">
          <div class="cmap-canvas-bar">
            <input type="text" id="cmap-title" class="form-input" maxlength="160" placeholder="Map title" disabled>
            <button type="button" class="btn-secondary btn-sm" id="cmap-save-meta">Save title</button>
            <label class="btn-secondary btn-sm cmap-upload-label">
              Upload image
              <input type="file" id="cmap-upload" accept="image/png,image/jpeg,image/webp,image/gif" hidden>
            </label>
            <button type="button" class="btn-secondary btn-sm" id="cmap-place-btn" disabled>Place marker</button>
            <button type="button" class="btn-secondary btn-sm" id="cmap-zoom-out" title="Zoom out">－</button>
            <button type="button" class="btn-secondary btn-sm" id="cmap-zoom-in" title="Zoom in">＋</button>
            <button type="button" class="btn-secondary btn-sm" id="cmap-reset-view">Reset view</button>
            <button type="button" class="btn-danger btn-sm" id="cmap-delete-map" disabled>Delete map</button>
          </div>
          <p class="muted cmap-hint">Drag to pan. Scroll to zoom. Arm <strong>Place marker</strong>, then click the image. Click a marker to open it in the sidebar. Drag a marker to move it.</p>
          <div id="cmap-wrap" class="cmap-stage-wrap">
            <div id="cmap-empty" class="cmap-empty">Create a map, then upload an image.</div>
            <div id="cmap-stage" class="cmap-stage" hidden>
              <img id="cmap-image" alt="" draggable="false">
              <div id="cmap-pins" class="cmap-pin-layer"></div>
            </div>
          </div>
          <div class="cmap-legend" aria-hidden="true">
            <span><i data-link="none"></i> Unlinked</span>
            <span><i data-link="lore"></i> Lore</span>
            <span><i data-link="town"></i> Town</span>
            <span><i data-link="character"></i> NPC</span>
            <span><i data-link="encounter"></i> Encounter</span>
          </div>
        </section>
        <aside class="dash-card cmap-inspector" id="cmap-inspector"></aside>
      </div>
    </div>
  `;

  const state = {
    maps: [],
    map: null,
    pois: [],
    links: { towns: [], characters: [], encounters: [], articles: [], characters_truncated: false },
    selectedId: null,
    draft: null,
    dirty: false,
    placeArmed: false,
    suppressClick: false,
    viewport: { width: 0, height: 0, scale: 1, minScale: 0.1, maxScale: 8, tx: 0, ty: 0 },
  };

  const statusEl = container.querySelector('#cmap-status');
  const listEl = container.querySelector('#cmap-map-items');
  const wrap = container.querySelector('#cmap-wrap');
  const stage = container.querySelector('#cmap-stage');
  const emptyEl = container.querySelector('#cmap-empty');
  const imageEl = container.querySelector('#cmap-image');
  const pinsEl = container.querySelector('#cmap-pins');
  const titleInput = container.querySelector('#cmap-title');
  const placeBtn = container.querySelector('#cmap-place-btn');
  const deleteMapBtn = container.querySelector('#cmap-delete-map');
  const inspector = container.querySelector('#cmap-inspector');
  const newForm = container.querySelector('#cmap-new-form');

  let panMove = null;
  let panUp = null;

  container.querySelector('#cmap-back-btn')?.addEventListener('click', () => navigate('dashboard'));
  container.querySelector('#cmap-new-btn')?.addEventListener('click', () => {
    newForm.hidden = false;
    container.querySelector('#cmap-new-title')?.focus();
  });
  container.querySelector('#cmap-new-cancel')?.addEventListener('click', () => {
    newForm.hidden = true;
    newForm.reset();
  });
  newForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    createMap();
  });
  container.querySelector('#cmap-save-meta')?.addEventListener('click', saveMapMeta);
  titleInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveMapMeta();
    }
  });
  container.querySelector('#cmap-upload')?.addEventListener('change', onUpload);
  placeBtn?.addEventListener('click', () => {
    if (!state.map?.image_url) {
      setStatus('Upload an image before placing markers.', true);
      return;
    }
    state.placeArmed = !state.placeArmed;
    syncPlaceButton();
  });
  container.querySelector('#cmap-zoom-in')?.addEventListener('click', () => zoomByFactor(1.2));
  container.querySelector('#cmap-zoom-out')?.addEventListener('click', () => zoomByFactor(1 / 1.2));
  container.querySelector('#cmap-reset-view')?.addEventListener('click', () => resetViewport(true));
  deleteMapBtn?.addEventListener('click', deleteMap);
  wrap.addEventListener('wheel', onWheel, { passive: false });
  wrap.addEventListener('mousedown', onWrapMouseDown);
  wrap.addEventListener('click', onWrapClick);
  imageEl.addEventListener('load', onImageLoad);

  const onKeyDown = (e) => {
    if (e.key !== 'Escape') return;
    if (state.placeArmed) {
      state.placeArmed = false;
      syncPlaceButton();
      return;
    }
    if (state.selectedId) {
      clearSelection(false);
    }
  };
  window.addEventListener('keydown', onKeyDown);

  init().catch((err) => setStatus(err.message || 'Could not load maps.', true));

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    detachPan();
  };

  async function init() {
    setStatus('Loading maps…');
    const [listRes, linkRes] = await Promise.all([
      apiListCampaignMaps(),
      apiCampaignMapLinkOptions().catch(() => ({ towns: [], characters: [], encounters: [], articles: [] })),
    ]);
    state.maps = listRes.maps || [];
    state.links = {
      towns: linkRes.towns || [],
      characters: linkRes.characters || [],
      encounters: linkRes.encounters || [],
      articles: linkRes.articles || [],
      characters_truncated: !!linkRes.characters_truncated,
    };
    renderMapList();
    const preferred = requestedId && state.maps.some((m) => m.id === requestedId)
      ? requestedId
      : (state.maps[0]?.id || 0);
    if (preferred) {
      await openMap(preferred, false);
      setStatus('');
    } else {
      renderEmptyCanvas();
      renderInspector();
      setStatus('No handout maps yet.');
    }
  }

  async function createMap() {
    const title = container.querySelector('#cmap-new-title')?.value.trim();
    if (!title) {
      setStatus('Give the map a title.', true);
      return;
    }
    try {
      const res = await apiSaveCampaignMap({ title, notes: '' });
      newForm.hidden = true;
      newForm.reset();
      state.maps = [res.map, ...state.maps.filter((m) => m.id !== res.map.id)];
      renderMapList();
      await openMap(res.map.id, true);
      setStatus(`Created “${res.map.title}”. Upload an image to start placing markers.`);
    } catch (err) {
      setStatus(err.message, true);
    }
  }

  async function openMap(id, pushUrl) {
    if (!(await clearSelection(true))) return;
    const res = await apiGetCampaignMap(id);
    state.map = res.map;
    state.pois = res.pois || [];
    state.selectedId = null;
    state.draft = null;
    state.dirty = false;
    state.placeArmed = false;
    const idx = state.maps.findIndex((m) => m.id === res.map.id);
    if (idx >= 0) state.maps[idx] = res.map;
    else state.maps.unshift(res.map);
    titleInput.value = res.map.title || '';
    titleInput.disabled = false;
    placeBtn.disabled = !res.map.image_url;
    deleteMapBtn.disabled = false;
    renderMapList();
    hydrateImage();
    renderPins();
    renderInspector();
    syncPlaceButton();
    const base = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
    const url = `${base}/campaign-maps/${res.map.id}`.replace(/\/+/g, '/');
    const method = pushUrl ? 'pushState' : 'replaceState';
    window.history[method]({}, '', url);
  }

  async function saveMapMeta() {
    if (!state.map) return;
    const title = titleInput.value.trim();
    if (!title) {
      setStatus('Map title is required.', true);
      return;
    }
    try {
      const res = await apiSaveCampaignMap({
        id: state.map.id,
        title,
        notes: state.map.notes || '',
      });
      state.map = { ...state.map, ...res.map };
      const idx = state.maps.findIndex((m) => m.id === state.map.id);
      if (idx >= 0) state.maps[idx] = { ...state.maps[idx], ...res.map };
      renderMapList();
      setStatus('Map title saved.');
    } catch (err) {
      setStatus(err.message, true);
    }
  }

  async function onUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !state.map) return;
    setStatus('Uploading image…');
    try {
      const upload = await apiUploadCampaignMap(state.map.id, file);
      const meta = await loadImageMeta(campaignMapAssetUrl(upload.url));
      const res = await apiSaveCampaignMap({
        id: state.map.id,
        title: titleInput.value.trim() || state.map.title,
        notes: state.map.notes || '',
        image_url: upload.url,
        image_width: meta.width,
        image_height: meta.height,
      });
      state.map = res.map;
      const idx = state.maps.findIndex((m) => m.id === state.map.id);
      if (idx >= 0) state.maps[idx] = res.map;
      placeBtn.disabled = false;
      hydrateImage();
      renderPins();
      renderMapList();
      setStatus('Image saved.');
    } catch (err) {
      setStatus(err.message, true);
    }
  }

  async function deleteMap() {
    if (!state.map) return;
    if (!confirm(`Delete “${state.map.title}” and its markers?`)) return;
    try {
      await apiDeleteCampaignMap(state.map.id);
      state.maps = state.maps.filter((m) => m.id !== state.map.id);
      state.map = null;
      state.pois = [];
      state.draft = null;
      state.selectedId = null;
      renderMapList();
      if (state.maps[0]) {
        await openMap(state.maps[0].id, true);
      } else {
        renderEmptyCanvas();
        renderInspector();
        const base = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
        window.history.replaceState({}, '', `${base}/campaign-maps`.replace(/\/+/g, '/'));
      }
      setStatus('Map deleted.');
    } catch (err) {
      setStatus(err.message, true);
    }
  }

  function renderMapList() {
    if (!state.maps.length) {
      listEl.innerHTML = '<p class="muted">No maps yet.</p>';
      return;
    }
    listEl.innerHTML = state.maps.map((map) => {
      const count = Number(map.poi_count) || 0;
      return `
      <button type="button" class="cmap-map-item${state.map?.id === map.id ? ' is-active' : ''}" data-map-id="${map.id}">
        <span class="cmap-map-item-title">${escapeHtml(map.title)}</span>
        <span class="cmap-map-item-meta">${count} marker${count === 1 ? '' : 's'}</span>
      </button>`;
    }).join('');
    listEl.querySelectorAll('[data-map-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.mapId, 10);
        if (id && id !== state.map?.id) {
          openMap(id, true).catch((err) => setStatus(err.message, true));
        }
      });
    });
  }

  function renderEmptyCanvas() {
    titleInput.value = '';
    titleInput.disabled = true;
    placeBtn.disabled = true;
    deleteMapBtn.disabled = true;
    imageEl.removeAttribute('src');
    stage.hidden = true;
    emptyEl.hidden = false;
    emptyEl.textContent = 'Create a map, then upload an image.';
    pinsEl.innerHTML = '';
    syncPlaceButton();
  }

  function hydrateImage() {
    if (!state.map?.image_url) {
      imageEl.removeAttribute('src');
      stage.hidden = true;
      emptyEl.hidden = false;
      emptyEl.textContent = 'Upload an image to place markers.';
      state.viewport.width = 0;
      state.viewport.height = 0;
      return;
    }
    emptyEl.hidden = true;
    stage.hidden = false;
    const next = campaignMapAssetUrl(state.map.image_url);
    if (imageEl.getAttribute('src') !== next) {
      imageEl.src = next;
    }
    imageEl.alt = state.map.title || 'Campaign map';
    if (imageEl.complete && imageEl.naturalWidth > 0) onImageLoad();
  }

  function onImageLoad() {
    const width = Number(state.map?.image_width) || imageEl.naturalWidth;
    const height = Number(state.map?.image_height) || imageEl.naturalHeight;
    if (!(width > 0) || !(height > 0)) return;
    state.viewport.width = width;
    state.viewport.height = height;
    stage.style.width = `${width}px`;
    stage.style.height = `${height}px`;
    resetViewport(true);
  }

  function applyTransform() {
    stage.style.transform = `translate(${state.viewport.tx}px, ${state.viewport.ty}px) scale(${state.viewport.scale})`;
  }

  function clampViewport() {
    const rect = wrap.getBoundingClientRect();
    const scaledW = state.viewport.width * state.viewport.scale;
    const scaledH = state.viewport.height * state.viewport.scale;
    if (scaledW <= rect.width) state.viewport.tx = (rect.width - scaledW) / 2;
    else state.viewport.tx = Math.max(rect.width - scaledW, Math.min(0, state.viewport.tx));
    if (scaledH <= rect.height) state.viewport.ty = (rect.height - scaledH) / 2;
    else state.viewport.ty = Math.max(rect.height - scaledH, Math.min(0, state.viewport.ty));
  }

  function resetViewport(fit) {
    if (!(state.viewport.width > 0) || !(state.viewport.height > 0)) return;
    const rect = wrap.getBoundingClientRect();
    if (!(rect.width > 0) || !(rect.height > 0)) return;
    const fitScale = Math.min(rect.width / state.viewport.width, rect.height / state.viewport.height);
    state.viewport.minScale = Math.max(0.05, fitScale);
    state.viewport.scale = fit ? state.viewport.minScale : Math.max(state.viewport.minScale, Math.min(state.viewport.scale, state.viewport.maxScale));
    const scaledW = state.viewport.width * state.viewport.scale;
    const scaledH = state.viewport.height * state.viewport.scale;
    state.viewport.tx = (rect.width - scaledW) / 2;
    state.viewport.ty = (rect.height - scaledH) / 2;
    applyTransform();
  }

  function zoomByFactor(factor) {
    if (!(state.viewport.width > 0)) return;
    const rect = wrap.getBoundingClientRect();
    applyZoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
  }

  function applyZoomAt(clientX, clientY, factor) {
    const oldScale = state.viewport.scale;
    const next = Math.max(state.viewport.minScale, Math.min(oldScale * factor, state.viewport.maxScale));
    if (Math.abs(next - oldScale) < 0.0001) return;
    const rect = wrap.getBoundingClientRect();
    const xIn = clientX - rect.left;
    const yIn = clientY - rect.top;
    const mapX = (xIn - state.viewport.tx) / oldScale;
    const mapY = (yIn - state.viewport.ty) / oldScale;
    state.viewport.scale = next;
    state.viewport.tx = xIn - mapX * next;
    state.viewport.ty = yIn - mapY * next;
    clampViewport();
    applyTransform();
  }

  function onWheel(e) {
    if (!state.map?.image_url) return;
    e.preventDefault();
    applyZoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 1 / 1.12);
  }

  function pctFromClient(clientX, clientY) {
    const rect = wrap.getBoundingClientRect();
    const mapX = (clientX - rect.left - state.viewport.tx) / state.viewport.scale;
    const mapY = (clientY - rect.top - state.viewport.ty) / state.viewport.scale;
    return {
      xPct: (mapX / state.viewport.width) * 100,
      yPct: (mapY / state.viewport.height) * 100,
    };
  }

  function onWrapMouseDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest('.cmap-pin')) return;
    if (!state.map?.image_url) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const startTx = state.viewport.tx;
    const startTy = state.viewport.ty;
    panMove = (ev) => {
      state.viewport.tx = startTx + (ev.clientX - startX);
      state.viewport.ty = startTy + (ev.clientY - startY);
      clampViewport();
      applyTransform();
      state.suppressClick = true;
      wrap.classList.add('is-panning');
    };
    panUp = (ev) => {
      detachPan();
      const moved = Math.hypot(ev.clientX - startX, ev.clientY - startY) > DRAG_MIN_PX;
      wrap.classList.remove('is-panning');
      if (!moved) state.suppressClick = false;
      else setTimeout(() => { state.suppressClick = false; }, 0);
    };
    window.addEventListener('mousemove', panMove);
    window.addEventListener('mouseup', panUp);
  }

  function detachPan() {
    if (panMove) window.removeEventListener('mousemove', panMove);
    if (panUp) window.removeEventListener('mouseup', panUp);
    panMove = null;
    panUp = null;
  }

  async function onWrapClick(e) {
    if (state.suppressClick) return;
    if (e.target.closest('.cmap-pin')) return;
    if (!state.placeArmed || !state.map?.image_url) return;
    const raw = pctFromClient(e.clientX, e.clientY);
    if (raw.xPct < 0 || raw.xPct > 100 || raw.yPct < 0 || raw.yPct > 100) return;
    const xPct = roundPct(raw.xPct);
    const yPct = roundPct(raw.yPct);
    if (state.selectedId === 'draft' && state.draft) {
      state.draft.x_pct = xPct;
      state.draft.y_pct = yPct;
      state.placeArmed = false;
      syncPlaceButton();
      renderPins();
      return;
    }
    if (!(await clearSelection(true))) return;
    state.draft = {
      name: 'New marker',
      notes: '',
      x_pct: xPct,
      y_pct: yPct,
      link_type: 'none',
      link_id: null,
    };
    state.selectedId = 'draft';
    state.dirty = false;
    state.placeArmed = false;
    syncPlaceButton();
    renderPins();
    renderInspector();
    inspector.querySelector('#cmap-poi-name')?.focus();
    inspector.querySelector('#cmap-poi-name')?.select();
  }

  function markerItems() {
    const items = state.pois.map((poi) => ({ ...poi, key: String(poi.id) }));
    if (state.draft && state.selectedId === 'draft') {
      items.push({ ...state.draft, id: 'draft', key: 'draft', link_type: state.draft.link_type || 'none' });
    }
    return items;
  }

  function renderPins() {
    pinsEl.innerHTML = markerItems().map((poi) => `
      <button type="button" class="cmap-pin${String(state.selectedId) === poi.key ? ' is-selected' : ''}"
        data-poi-key="${escapeHtml(poi.key)}" data-link="${escapeHtml(poi.link_type || 'none')}"
        style="left:${Number(poi.x_pct)}%;top:${Number(poi.y_pct)}%"
        title="${escapeHtml(poi.name)}">
        <span class="cmap-pin-dot"></span>
        <span class="cmap-pin-label">${escapeHtml(poi.name)}</span>
      </button>
    `).join('');
    pinsEl.querySelectorAll('.cmap-pin').forEach((pin) => bindPin(pin));
  }

  function bindPin(pin) {
    let moved = false;
    let startX = 0;
    let startY = 0;
    const key = pin.dataset.poiKey;
    pin.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      const move = (ev) => {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > DRAG_MIN_PX) moved = true;
        const pct = pctFromClient(ev.clientX, ev.clientY);
        const x = roundPct(pct.xPct);
        const y = roundPct(pct.yPct);
        pin.style.left = `${x}%`;
        pin.style.top = `${y}%`;
        pin.dataset.x = String(x);
        pin.dataset.y = String(y);
      };
      const up = async () => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
        if (!moved) return;
        state.suppressClick = true;
        setTimeout(() => { state.suppressClick = false; }, 0);
        const x = Number(pin.dataset.x);
        const y = Number(pin.dataset.y);
        await moveMarker(key, x, y);
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    });
    pin.addEventListener('click', (e) => {
      e.stopPropagation();
      if (moved) return;
      selectKey(key);
    });
  }

  async function moveMarker(key, xPct, yPct) {
    if (key === 'draft' && state.draft) {
      state.draft.x_pct = xPct;
      state.draft.y_pct = yPct;
      return;
    }
    const poi = state.pois.find((p) => String(p.id) === key);
    if (!poi || !state.map) return;
    const prevX = poi.x_pct;
    const prevY = poi.y_pct;
    poi.x_pct = xPct;
    poi.y_pct = yPct;
    try {
      const res = await apiSaveCampaignMapPoi(poiPayload(poi));
      replacePoi(res.poi);
      if (String(state.selectedId) === key) renderInspector();
    } catch (err) {
      poi.x_pct = prevX;
      poi.y_pct = prevY;
      setStatus(err.message, true);
      renderPins();
    }
  }

  function poiPayload(poi) {
    return {
      id: poi.id,
      map_id: state.map.id,
      name: poi.name,
      notes: poi.notes || '',
      x_pct: poi.x_pct,
      y_pct: poi.y_pct,
      link_type: poi.link_type || 'none',
      link_id: poi.link_id || 0,
    };
  }

  function replacePoi(poi) {
    const idx = state.pois.findIndex((p) => p.id === poi.id);
    if (idx >= 0) state.pois[idx] = poi;
    else state.pois.push(poi);
    const mapIdx = state.maps.findIndex((m) => m.id === state.map?.id);
    if (mapIdx >= 0) state.maps[mapIdx] = { ...state.maps[mapIdx], poi_count: state.pois.length };
    renderPins();
    renderMapList();
  }

  async function selectKey(key) {
    if (String(state.selectedId) === key) return;
    if (!(await clearSelection(true))) return;
    state.selectedId = key === 'draft' ? 'draft' : parseInt(key, 10);
    state.dirty = false;
    state.placeArmed = false;
    syncPlaceButton();
    renderPins();
    renderInspector();
  }

  async function clearSelection(ask) {
    if (state.selectedId === 'draft' && state.dirty && ask) {
      if (!confirm('Discard this unsaved marker?')) return false;
    } else if (state.selectedId && state.selectedId !== 'draft' && state.dirty && ask) {
      if (!confirm('Discard unsaved marker edits?')) return false;
    }
    state.selectedId = null;
    state.draft = null;
    state.dirty = false;
    renderPins();
    renderInspector();
    return true;
  }

  function currentPoi() {
    if (state.selectedId === 'draft') return state.draft;
    return state.pois.find((p) => p.id === state.selectedId) || null;
  }

  function renderInspector() {
    const poi = currentPoi();
    if (!state.map) {
      inspector.innerHTML = '<div class="cmap-inspector-empty"><h2>Marker</h2><p class="muted">Create a map to start.</p></div>';
      return;
    }
    if (!poi) {
      inspector.innerHTML = `
        <div class="cmap-inspector-empty">
          <h2>Marker</h2>
          <p class="muted">Click <strong>Place marker</strong>, then click the image. Select a marker to edit its name, notes, and link.</p>
          <label class="cmap-field">Map notes
            <textarea id="cmap-map-notes" class="form-input" maxlength="4000" rows="5" placeholder="What this sheet is for">${escapeHtml(state.map.notes || '')}</textarea>
          </label>
          <button type="button" class="btn-secondary btn-sm" id="cmap-save-notes">Save map notes</button>
        </div>`;
      inspector.querySelector('#cmap-save-notes')?.addEventListener('click', saveMapNotes);
      return;
    }
    const type = poi.link_type || 'none';
    inspector.innerHTML = `
      <h2>${poi.id ? 'Marker' : 'New marker'}</h2>
      <label class="cmap-field">Name
        <input type="text" id="cmap-poi-name" class="form-input" maxlength="160" value="${escapeHtml(poi.name || '')}">
      </label>
      <label class="cmap-field">Notes
        <textarea id="cmap-poi-notes" class="form-input" maxlength="4000" rows="5">${escapeHtml(poi.notes || '')}</textarea>
      </label>
      <label class="cmap-field">Link
        <select id="cmap-poi-type" class="form-input">
          ${Object.entries(LINK_LABELS).map(([value, label]) => `<option value="${value}"${value === type ? ' selected' : ''}>${label}</option>`).join('')}
        </select>
      </label>
      <label class="cmap-field" id="cmap-link-target-field">
        <span id="cmap-link-target-label">Target</span>
        <select id="cmap-poi-target" class="form-input"></select>
      </label>
      <p id="cmap-link-summary" class="muted cmap-link-summary"></p>
      <div class="cmap-inspector-actions">
        <button type="button" class="btn-primary btn-sm" id="cmap-poi-save">Save marker</button>
        <button type="button" class="btn-secondary btn-sm" id="cmap-poi-open">Open link</button>
        <button type="button" class="btn-danger btn-sm" id="cmap-poi-delete">${poi.id ? 'Delete' : 'Discard'}</button>
      </div>
    `;
    const typeSel = inspector.querySelector('#cmap-poi-type');
    const targetSel = inspector.querySelector('#cmap-poi-target');
    fillTargets(type, poi.link_id);
    typeSel.addEventListener('change', () => {
      state.dirty = true;
      fillTargets(typeSel.value, 0);
    });
    inspector.querySelector('#cmap-poi-name')?.addEventListener('input', () => { state.dirty = true; });
    inspector.querySelector('#cmap-poi-notes')?.addEventListener('input', () => { state.dirty = true; });
    targetSel.addEventListener('change', () => { state.dirty = true; });
    inspector.querySelector('#cmap-poi-save')?.addEventListener('click', () => savePoi().catch((err) => setStatus(err.message, true)));
    inspector.querySelector('#cmap-poi-open')?.addEventListener('click', () => openLinked().catch((err) => setStatus(err.message, true)));
    inspector.querySelector('#cmap-poi-delete')?.addEventListener('click', () => deletePoi().catch((err) => setStatus(err.message, true)));
  }

  function fillTargets(type, selectedId) {
    const field = inspector.querySelector('#cmap-link-target-field');
    const select = inspector.querySelector('#cmap-poi-target');
    const summary = inspector.querySelector('#cmap-link-summary');
    if (!field || !select) return;
    if (type === 'none') {
      field.hidden = true;
      if (summary) summary.textContent = 'This marker stays on the map with no linked page.';
      return;
    }
    field.hidden = false;
    const options = optionsFor(type);
    const label = inspector.querySelector('#cmap-link-target-label');
    if (label) label.textContent = LINK_LABELS[type] || 'Target';
    if (!options.length) {
      select.innerHTML = '<option value="">Nothing to link yet</option>';
      if (summary) summary.textContent = emptyLinkMessage(type);
      return;
    }
    select.innerHTML = options.map((opt) => `<option value="${opt.id}"${Number(selectedId) === opt.id ? ' selected' : ''}>${escapeHtml(opt.label)}</option>`).join('');
    if (summary) {
      summary.textContent = state.links.characters_truncated && type === 'character'
        ? 'Showing the first 1000 characters.'
        : '';
    }
  }

  function optionsFor(type) {
    if (type === 'lore') {
      return state.links.articles.map((a) => ({ id: a.id, label: a.title || `Lore ${a.id}` }));
    }
    if (type === 'town') {
      return state.links.towns.map((t) => ({ id: t.id, label: t.name }));
    }
    if (type === 'encounter') {
      return state.links.encounters.map((enc) => ({ id: enc.id, label: enc.name }));
    }
    if (type === 'character') {
      return state.links.characters.map((c) => {
        const bits = [c.name];
        const rc = [c.race, c.class].filter(Boolean).join(' ');
        if (rc) bits.push(rc);
        if (c.town_name) bits.push(c.town_name);
        if (String(c.status || '').toLowerCase() === 'deceased') bits.push('deceased');
        return { id: c.id, label: bits.join(' · ') };
      });
    }
    return [];
  }

  function emptyLinkMessage(type) {
    if (type === 'lore') return 'No lore pages yet. Create one in the Lore Codex.';
    if (type === 'town') return 'No towns in this campaign yet.';
    if (type === 'character') return 'No characters to link yet.';
    if (type === 'encounter') return 'No encounters yet.';
    return '';
  }

  function readForm() {
    const poi = currentPoi();
    if (!poi) return null;
    const type = inspector.querySelector('#cmap-poi-type')?.value || 'none';
    const target = parseInt(inspector.querySelector('#cmap-poi-target')?.value || '0', 10);
    return {
      ...poi,
      name: inspector.querySelector('#cmap-poi-name')?.value.trim() || '',
      notes: inspector.querySelector('#cmap-poi-notes')?.value.trim() || '',
      link_type: type,
      link_id: type === 'none' ? null : (target || null),
    };
  }

  async function savePoi() {
    const form = readForm();
    if (!form || !state.map) return null;
    if (!form.name) {
      setStatus('Marker name is required.', true);
      return null;
    }
    const res = await apiSaveCampaignMapPoi({
      id: form.id || 0,
      map_id: state.map.id,
      name: form.name,
      notes: form.notes,
      x_pct: form.x_pct,
      y_pct: form.y_pct,
      link_type: form.link_type,
      link_id: form.link_id || 0,
    });
    if (!form.id) {
      state.draft = null;
      state.pois.push(res.poi);
    } else {
      replacePoi(res.poi);
    }
    state.selectedId = res.poi.id;
    state.dirty = false;
    const mapIdx = state.maps.findIndex((m) => m.id === state.map.id);
    if (mapIdx >= 0) state.maps[mapIdx] = { ...state.maps[mapIdx], poi_count: state.pois.length };
    renderPins();
    renderMapList();
    renderInspector();
    setStatus(`Saved “${res.poi.name}”.`);
    return res.poi;
  }

  async function deletePoi() {
    const poi = currentPoi();
    if (!poi) return;
    if (!poi.id) {
      state.draft = null;
      state.selectedId = null;
      state.dirty = false;
      renderPins();
      renderInspector();
      return;
    }
    if (!confirm(`Delete marker “${poi.name}”?`)) return;
    await apiDeleteCampaignMapPoi(poi.id);
    state.pois = state.pois.filter((p) => p.id !== poi.id);
    state.selectedId = null;
    state.dirty = false;
    const mapIdx = state.maps.findIndex((m) => m.id === state.map?.id);
    if (mapIdx >= 0) state.maps[mapIdx] = { ...state.maps[mapIdx], poi_count: state.pois.length };
    renderPins();
    renderMapList();
    renderInspector();
    setStatus('Marker deleted.');
  }

  async function openLinked() {
    let poi = currentPoi();
    if (!poi) return;
    if (state.dirty || !poi.id) {
      poi = await savePoi();
      if (!poi) return;
    }
    const id = Number(poi.link_id || 0);
    if (!id || poi.link_type === 'none') {
      setStatus('Choose a link, then open it.', true);
      return;
    }
    if (poi.link_missing) {
      setStatus('That link no longer exists.', true);
      return;
    }
    if (poi.link_type === 'lore') {
      navigate(`wiki?article=${id}`);
      return;
    }
    if (poi.link_type === 'town') {
      navigate(`town/${id}`);
      return;
    }
    if (poi.link_type === 'encounter') {
      navigate(`encounters/${id}`);
      return;
    }
    if (poi.link_type === 'character') {
      const known = state.links.characters.find((c) => c.id === id);
      const townId = Number(poi.link_town_id || known?.town_id || 0);
      if (!townId) {
        setStatus('That character has no town roster to open.', true);
        return;
      }
      setState({ pendingMapCharacterId: id, currentTownId: townId });
      navigate(`town/${townId}`);
    }
  }

  async function saveMapNotes() {
    if (!state.map) return;
    const notes = inspector.querySelector('#cmap-map-notes')?.value.trim() || '';
    try {
      const res = await apiSaveCampaignMap({
        id: state.map.id,
        title: titleInput.value.trim() || state.map.title,
        notes,
      });
      state.map = { ...state.map, ...res.map, notes };
      setStatus('Map notes saved.');
    } catch (err) {
      setStatus(err.message, true);
    }
  }

  function syncPlaceButton() {
    placeBtn.classList.toggle('is-armed', state.placeArmed);
    placeBtn.textContent = state.placeArmed ? 'Click the map…' : 'Place marker';
    wrap.classList.toggle('is-placing', state.placeArmed);
  }

  function setStatus(message, isError = false) {
    statusEl.textContent = message || '';
    statusEl.style.color = isError ? 'var(--error, #f87171)' : '';
    if (isError && message) showToast(message, 'error');
  }
}

function roundPct(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Number(n.toFixed(5))));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function loadImageMeta(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Could not read uploaded image dimensions.'));
    img.src = url;
  });
}
