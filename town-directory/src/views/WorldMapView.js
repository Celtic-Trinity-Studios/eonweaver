import { navigate } from '../router.js';
import { setState } from '../stores/appState.js';
import { apiGetTowns } from '../api/towns.js';
import {
  apiApplyWorldMapCalibration,
  apiDeleteWorldMapPin,
  apiEstimateTravelTime,
  apiGetWorldMap,
  apiSaveWorldMapPin,
  apiSaveWorldMapSettings,
  apiSetWorldMapTownSkip,
  apiUploadWorldMap,
} from '../api/worldMap.js';

const CAL_DRAG_MIN_PX = 6;

export default function WorldMapView(container) {
  container.innerHTML = `
    <div class="view-simulation">
      <header class="view-header">
        <h1>🗺️ World Map & Travel</h1>
        <div class="view-header-right">
          <button class="btn-secondary btn-sm" id="wm-back-btn">← Dashboard</button>
        </div>
      </header>

      <div class="dash-card" style="padding:1rem;margin-bottom:1rem;">
        <div style="display:flex;gap:1rem;flex-wrap:wrap;align-items:flex-end;">
          <div class="sim-field" style="min-width:240px;">
            <label>Upload World Map</label>
            <input type="file" id="wm-upload" class="form-input" accept="image/png,image/jpeg,image/webp,image/gif">
          </div>
          <div class="sim-field" style="max-width:170px;">
            <label title="Adjusted automatically when you calibrate; you can edit manually.">Scale (mi / unit)</label>
            <input type="number" id="wm-miles-per-pixel" class="form-input" min="0.000001" step="0.0001" value="1">
          </div>
          <div class="sim-field" style="max-width:170px;">
            <label>Travel Hours / Day</label>
            <input type="number" id="wm-hours-per-day" class="form-input" min="1" max="24" step="0.5" value="8">
          </div>
          <button class="btn-primary" id="wm-save-settings-btn">💾 Save Settings</button>
          <span id="wm-status" class="sim-status"></span>
        </div>
      </div>

      <div class="dash-card" style="padding:1rem;margin-bottom:1rem;">
        <h3 style="margin:0 0 0.5rem 0;">Towns on the map</h3>
        <p class="muted" style="margin:0 0 0.75rem 0;font-size:0.85rem;">
          <strong>Hide from map</strong> — town stays in your campaign but has no pin (nothing to click here for roster).
          Pinned towns show a marker; <strong>click a pin</strong> to open that town’s roster.
        </p>
        <div id="wm-town-table-wrap"></div>
      </div>

      <div class="dash-card" style="padding:1rem;">
        <div style="display:flex;flex-wrap:wrap;gap:0.75rem;align-items:center;margin-bottom:0.5rem;">
          <button type="button" class="btn-secondary" id="wm-cal-arm-btn">📏 Calibrate scale on map</button>
          <button type="button" class="btn-secondary" id="wm-zoom-out-btn" title="Zoom out">－</button>
          <button type="button" class="btn-secondary" id="wm-zoom-in-btn" title="Zoom in">＋</button>
          <button type="button" class="btn-secondary" id="wm-reset-view-btn">Reset view</button>
          <span id="wm-cal-arm-hint" class="muted" style="font-size:0.85rem;display:none;"></span>
        </div>
        <p class="muted" style="margin:0 0 0.55rem 0;font-size:0.8rem;">
          Click map to place a pin, then choose the town. Drag map to pan, use mouse wheel (or buttons) to zoom.
        </p>
        <div id="wm-map-wrap" style="position:relative;border:1px solid var(--border);border-radius:10px;min-height:360px;background:rgba(255,255,255,0.03);overflow:hidden;">
          <div id="wm-map-empty" style="padding:2rem;text-align:center;color:var(--text-muted);">Upload a world map image to start.</div>
          <div id="wm-map-stage" style="display:none;position:absolute;left:0;top:0;transform-origin:0 0;">
            <img id="wm-map-image" alt="World map" style="display:block;width:100%;height:100%;user-select:none;pointer-events:none;">
            <svg id="wm-cal-svg" viewBox="0 0 100 100" preserveAspectRatio="none" style="display:none;position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;">
              <line id="wm-cal-line" x1="0" y1="0" x2="0" y2="0" stroke="var(--accent, #c4a35a)" stroke-width="0.45" stroke-dasharray="1.5 0.75" />
              <circle id="wm-cal-a" r="1" fill="var(--success, #22c55e)" style="display:none" />
              <circle id="wm-cal-b" r="1" fill="var(--warning, #f59e0b)" style="display:none" />
            </svg>
            <div id="wm-pin-layer" style="position:absolute;inset:0;pointer-events:none;z-index:2;"></div>
          </div>
        </div>
        <div id="wm-pin-picker" class="dash-card" style="display:none;margin-top:0.7rem;padding:0.75rem;">
          <div id="wm-pin-picker-summary" class="muted" style="font-size:0.8rem;margin-bottom:0.45rem;"></div>
          <div style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:flex-end;">
            <div class="sim-field" style="min-width:220px;margin:0;">
              <label>Town for this pin</label>
              <select id="wm-pin-picker-town" class="form-input"></select>
            </div>
            <button type="button" class="btn-primary" id="wm-pin-picker-apply">Place pin</button>
            <button type="button" class="btn-secondary" id="wm-pin-picker-cancel">Cancel</button>
          </div>
        </div>
        <div id="wm-cal-apply" style="display:none;margin-top:0.75rem;flex-wrap:wrap;gap:0.75rem;align-items:flex-end;" class="sim-config-row">
          <div class="sim-field" style="max-width:14rem;">
            <label>This line’s distance (miles)</label>
            <input type="number" id="wm-cal-miles" class="form-input" min="0.0001" step="any" placeholder="e.g. 120">
          </div>
          <button class="btn-primary" type="button" id="wm-cal-apply-btn">Apply calibration</button>
          <button class="btn-secondary" type="button" id="wm-cal-clear-btn">Clear line</button>
        </div>
      </div>

      <div class="dash-card" style="padding:1rem;margin-top:1rem;">
        <h3 style="margin:0 0 0.75rem 0;">Pinned locations</h3>
        <div id="wm-pins-list" class="muted">No pinned towns yet.</div>
      </div>

      <div class="dash-card" style="padding:1rem;margin-top:1rem;">
        <h3 style="margin:0 0 0.75rem 0;">Travel estimator</h3>
        <p class="muted" style="font-size:0.8rem;margin:0 0 0.5rem 0;">Uses pinned towns only (not hidden-from-map).</p>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;align-items:flex-end;">
          <div class="sim-field" style="min-width:200px;">
            <label>From</label>
            <select id="wm-travel-from" class="form-input"></select>
          </div>
          <div class="sim-field" style="min-width:200px;">
            <label>To</label>
            <select id="wm-travel-to" class="form-input"></select>
          </div>
          <button class="btn-secondary" id="wm-estimate-btn">Estimate</button>
          <div id="wm-estimate-result" class="sim-status"></div>
        </div>
      </div>
    </div>
  `;

  const state = {
    towns: [],
    map: null,
    locations: [],
    skippedIds: new Set(),
    calArmed: false,
    cal: null,
    calDrag: null,
    suppressMapClick: false,
    pendingPin: null,
    viewport: {
      width: 0,
      height: 0,
      scale: 1,
      minScale: 1,
      maxScale: 6,
      tx: 0,
      ty: 0,
      panDrag: null,
    },
  };

  let onCalMove = null;
  let onCalUp = null;

  const statusEl = container.querySelector('#wm-status');
  const mapWrap = container.querySelector('#wm-map-wrap');
  const mapStage = container.querySelector('#wm-map-stage');
  const mapEmpty = container.querySelector('#wm-map-empty');
  const mapImage = container.querySelector('#wm-map-image');
  const pinLayer = container.querySelector('#wm-pin-layer');
  const calSvg = container.querySelector('#wm-cal-svg');
  const calLine = container.querySelector('#wm-cal-line');
  const calCircleA = container.querySelector('#wm-cal-a');
  const calCircleB = container.querySelector('#wm-cal-b');
  const calApplyRow = container.querySelector('#wm-cal-apply');
  const calMilesInput = container.querySelector('#wm-cal-miles');
  const calArmBtn = container.querySelector('#wm-cal-arm-btn');
  const calArmHint = container.querySelector('#wm-cal-arm-hint');
  const resetViewBtn = container.querySelector('#wm-reset-view-btn');
  const zoomInBtn = container.querySelector('#wm-zoom-in-btn');
  const zoomOutBtn = container.querySelector('#wm-zoom-out-btn');
  const pinPicker = container.querySelector('#wm-pin-picker');
  const pinPickerSelect = container.querySelector('#wm-pin-picker-town');
  const pinPickerApplyBtn = container.querySelector('#wm-pin-picker-apply');
  const pinPickerCancelBtn = container.querySelector('#wm-pin-picker-cancel');
  const pinPickerSummary = container.querySelector('#wm-pin-picker-summary');

  container.querySelector('#wm-back-btn')?.addEventListener('click', () => navigate('dashboard'));
  container.querySelector('#wm-upload')?.addEventListener('change', onUpload);
  container.querySelector('#wm-save-settings-btn')?.addEventListener('click', saveSettings);
  container.querySelector('#wm-estimate-btn')?.addEventListener('click', estimateTravel);
  container.querySelector('#wm-cal-apply-btn')?.addEventListener('click', applyCalibration);
  container.querySelector('#wm-cal-clear-btn')?.addEventListener('click', clearCalibrationLine);
  calArmBtn?.addEventListener('click', toggleCalArmed);
  resetViewBtn?.addEventListener('click', () => resetViewport(true));
  zoomInBtn?.addEventListener('click', () => zoomByFactor(1.2));
  zoomOutBtn?.addEventListener('click', () => zoomByFactor(1 / 1.2));
  pinPickerApplyBtn?.addEventListener('click', confirmPendingPin);
  pinPickerCancelBtn?.addEventListener('click', cancelPendingPin);
  mapWrap.addEventListener('wheel', onMapWheel, { passive: false });
  mapImage.addEventListener('load', onMapImageLoad);
  mapWrap.addEventListener('mousedown', onMapMouseDown);
  mapWrap.addEventListener('click', onMapClick);

  const onKeyDown = (e) => {
    if (e.key === 'Escape' && state.calArmed) {
      disarmCalibration();
      return;
    }
    if (e.key === 'Escape' && state.pendingPin) {
      cancelPendingPin();
    }
  };
  window.addEventListener('keydown', onKeyDown);

  init().catch((err) => {
    setStatus(`Error loading world map: ${err.message}`, true);
  });

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    detachCalDragListeners();
    hidePinPicker();
  };

  function detachCalDragListeners() {
    if (onCalMove) window.removeEventListener('mousemove', onCalMove);
    if (onCalUp) window.removeEventListener('mouseup', onCalUp);
    onCalMove = null;
    onCalUp = null;
  }

  async function init() {
    const [townRes, mapRes] = await Promise.all([apiGetTowns(), apiGetWorldMap()]);
    state.towns = Array.isArray(townRes) ? townRes : (townRes.towns || []);
    state.map = mapRes.map || null;
    state.locations = Array.isArray(mapRes.locations) ? mapRes.locations : [];
    const skipArr = mapRes.skipped_town_ids || mapRes.skipped_townIds || [];
    state.skippedIds = new Set((skipArr || []).map((id) => parseInt(id, 10)));

    renderTownTable();
    renderTownSelects();
    hydrateMapState();
    renderPins();
    renderPinsList();
    syncCalArmUI();
    updateCalVisual();
  }

  function setStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.style.color = isError ? 'var(--error)' : 'var(--text-secondary)';
  }

  function toggleCalArmed() {
    if (state.calArmed) {
      disarmCalibration();
    } else {
      state.calArmed = true;
      clearCalibrationLine(false);
      syncCalArmUI();
      setStatus('Drag on the map to draw a reference line, then enter miles.');
    }
  }

  function disarmCalibration() {
    state.calArmed = false;
    state.calDrag = null;
    detachCalDragListeners();
    syncCalArmUI();
    if (!state.cal) {
      calSvg.style.display = 'none';
    }
  }

  function syncCalArmUI() {
    calArmBtn.textContent = state.calArmed ? 'Cancel calibration' : '📏 Calibrate scale on map';
    calArmHint.style.display = state.calArmed ? '' : 'none';
    calArmHint.textContent = state.calArmed
      ? 'Click and drag on the map along a known distance (scale bar, road, etc.). Press Esc to cancel.'
      : '';
    mapWrap.style.cursor = state.calArmed ? 'crosshair' : 'grab';
  }

  function renderTownTable() {
    const wrap = container.querySelector('#wm-town-table-wrap');
    if (!state.towns.length) {
      wrap.innerHTML = '<p class="muted">No towns in this campaign yet.</p>';
      return;
    }
    wrap.innerHTML = `
      <div style="overflow-x:auto;">
        <table class="srd-table srd-table-sm" style="margin:0;">
          <thead><tr><th>Town</th><th style="text-align:center;width:10rem;">Hide from map</th></tr></thead>
          <tbody>
            ${state.towns.map((t) => `
              <tr>
                <td>${escapeHtml(t.name)}</td>
                <td style="text-align:center;">
                  <input type="checkbox" class="wm-skip-cb" data-town-id="${t.id}" ${state.skippedIds.has(t.id) ? 'checked' : ''}
                    title="No pin — map click won’t open this town from here">
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
    wrap.querySelectorAll('.wm-skip-cb').forEach((cb) => {
      cb.addEventListener('change', async () => {
        const townId = parseInt(cb.dataset.townId, 10);
        const skip = cb.checked;
        try {
          await apiSetWorldMapTownSkip(townId, skip);
          if (skip) {
            state.skippedIds.add(townId);
            state.locations = state.locations.filter((l) => parseInt(l.town_id, 10) !== townId);
          } else {
            state.skippedIds.delete(townId);
          }
          renderTownSelects();
          renderPins();
          renderPinsList();
          if (state.pendingPin && state.skippedIds.has(parseInt(pinPickerSelect.value || '0', 10))) {
            cancelPendingPin();
          }
          setStatus(skip ? 'Town hidden from map (pin removed).' : 'Town can be pinned on the map again.');
        } catch (err) {
          setStatus(err.message, true);
          cb.checked = !skip;
        }
      });
    });
  }

  function renderTownSelects() {
    const fromSelect = container.querySelector('#wm-travel-from');
    const toSelect = container.querySelector('#wm-travel-to');

    const travelTowns = state.towns.filter((t) => !state.skippedIds.has(t.id));
    const tOpt =
      '<option value="">Select town</option>' +
      travelTowns.map((t) => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
    fromSelect.innerHTML = tOpt;
    toSelect.innerHTML = tOpt;
  }

  function hydrateMapState() {
    const milesPerPixel = container.querySelector('#wm-miles-per-pixel');
    const hoursPerDay = container.querySelector('#wm-hours-per-day');
    milesPerPixel.value = state.map?.miles_per_pixel || 1;
    hoursPerDay.value = state.map?.travel_hours_per_day || 8;
    if (state.map?.map_image_url) {
      mapImage.src = state.map.map_image_url;
      mapStage.style.display = '';
      mapEmpty.style.display = 'none';
      if (mapImage.complete && mapImage.naturalWidth > 0) {
        onMapImageLoad();
      }
    } else {
      mapImage.removeAttribute('src');
      mapStage.style.display = 'none';
      mapEmpty.style.display = '';
      hidePinPicker();
      state.viewport.width = 0;
      state.viewport.height = 0;
    }
  }

  async function onUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('Uploading map...');
    try {
      const upload = await apiUploadWorldMap(file);
      const imageData = await loadImageMeta(upload.url);
      await apiSaveWorldMapSettings({
        map_image_url: upload.url,
        map_image_width: imageData.width,
        map_image_height: imageData.height,
        miles_per_pixel: parseFloat(container.querySelector('#wm-miles-per-pixel').value || '1'),
        travel_hours_per_day: parseFloat(container.querySelector('#wm-hours-per-day').value || '8'),
      });
      state.map = {
        ...(state.map || {}),
        map_image_url: upload.url,
        map_image_width: imageData.width,
        map_image_height: imageData.height,
      };
      hydrateMapState();
      renderPins();
      setStatus('Map uploaded and saved.');
    } catch (err) {
      setStatus(`Upload failed: ${err.message}`, true);
    }
  }

  async function saveSettings() {
    if (!state.map?.map_image_url) {
      setStatus('Upload a world map image first.', true);
      return;
    }
    try {
      await apiSaveWorldMapSettings({
        map_image_url: state.map.map_image_url,
        map_image_width: state.map.map_image_width || 0,
        map_image_height: state.map.map_image_height || 0,
        miles_per_pixel: parseFloat(container.querySelector('#wm-miles-per-pixel').value || '1'),
        travel_hours_per_day: parseFloat(container.querySelector('#wm-hours-per-day').value || '8'),
      });
      if (state.map) {
        state.map.miles_per_pixel = parseFloat(container.querySelector('#wm-miles-per-pixel').value || '1');
        state.map.travel_hours_per_day = parseFloat(container.querySelector('#wm-hours-per-day').value || '8');
      }
      setStatus('World map settings saved.');
    } catch (err) {
      setStatus(`Could not save settings: ${err.message}`, true);
    }
  }

  function onMapImageLoad() {
    const imageWidth = Number(state.map?.map_image_width) || mapImage.naturalWidth;
    const imageHeight = Number(state.map?.map_image_height) || mapImage.naturalHeight;
    if (!(imageWidth > 0) || !(imageHeight > 0)) return;
    state.viewport.width = imageWidth;
    state.viewport.height = imageHeight;
    mapStage.style.width = `${imageWidth}px`;
    mapStage.style.height = `${imageHeight}px`;
    resetViewport(true);
  }

  function applyViewportTransform() {
    mapStage.style.transform = `translate(${state.viewport.tx}px, ${state.viewport.ty}px) scale(${state.viewport.scale})`;
  }

  function clampViewport() {
    const rect = mapWrap.getBoundingClientRect();
    const scaledWidth = state.viewport.width * state.viewport.scale;
    const scaledHeight = state.viewport.height * state.viewport.scale;

    if (scaledWidth <= rect.width) {
      state.viewport.tx = (rect.width - scaledWidth) / 2;
    } else {
      const minTx = rect.width - scaledWidth;
      state.viewport.tx = Math.max(minTx, Math.min(0, state.viewport.tx));
    }

    if (scaledHeight <= rect.height) {
      state.viewport.ty = (rect.height - scaledHeight) / 2;
    } else {
      const minTy = rect.height - scaledHeight;
      state.viewport.ty = Math.max(minTy, Math.min(0, state.viewport.ty));
    }
  }

  function resetViewport(centerOnly = false) {
    if (!(state.viewport.width > 0) || !(state.viewport.height > 0)) return;
    const rect = mapWrap.getBoundingClientRect();
    if (!(rect.width > 0) || !(rect.height > 0)) return;
    const fit = Math.min(rect.width / state.viewport.width, rect.height / state.viewport.height);
    state.viewport.minScale = Math.max(0.1, fit);
    if (!centerOnly) {
      state.viewport.scale = Math.max(state.viewport.minScale, Math.min(state.viewport.scale, state.viewport.maxScale));
    } else {
      state.viewport.scale = state.viewport.minScale;
    }
    const scaledWidth = state.viewport.width * state.viewport.scale;
    const scaledHeight = state.viewport.height * state.viewport.scale;
    state.viewport.tx = (rect.width - scaledWidth) / 2;
    state.viewport.ty = (rect.height - scaledHeight) / 2;
    applyViewportTransform();
  }

  function zoomByFactor(factor) {
    if (!(state.viewport.width > 0) || !(state.viewport.height > 0)) return;
    const rect = mapWrap.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    applyZoomAt(centerX, centerY, factor);
  }

  function applyZoomAt(clientX, clientY, factor) {
    const oldScale = state.viewport.scale;
    const nextScale = Math.max(state.viewport.minScale, Math.min(oldScale * factor, state.viewport.maxScale));
    if (Math.abs(nextScale - oldScale) < 0.0001) return;
    const rect = mapWrap.getBoundingClientRect();
    const xInWrap = clientX - rect.left;
    const yInWrap = clientY - rect.top;
    const mapX = (xInWrap - state.viewport.tx) / oldScale;
    const mapY = (yInWrap - state.viewport.ty) / oldScale;
    state.viewport.scale = nextScale;
    state.viewport.tx = xInWrap - mapX * nextScale;
    state.viewport.ty = yInWrap - mapY * nextScale;
    clampViewport();
    applyViewportTransform();
  }

  function onMapWheel(e) {
    if (!state.map?.map_image_url) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    applyZoomAt(e.clientX, e.clientY, factor);
  }

  function pctFromClient(clientX, clientY) {
    const rect = mapWrap.getBoundingClientRect();
    const xInWrap = clientX - rect.left;
    const yInWrap = clientY - rect.top;
    const mapX = (xInWrap - state.viewport.tx) / state.viewport.scale;
    const mapY = (yInWrap - state.viewport.ty) / state.viewport.scale;
    const xPct = (mapX / state.viewport.width) * 100;
    const yPct = (mapY / state.viewport.height) * 100;
    return { xPct: round(xPct), yPct: round(yPct) };
  }

  function onMapMouseDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest('.wm-map-pin')) return;
    if (e.target.closest('button,a,input,select,label')) return;
    if (!state.map?.map_image_url) return;
    if (e.target !== mapWrap && e.target !== mapStage && e.target !== mapImage && e.target !== mapEmpty && e.target !== calSvg) return;

    if (!state.calArmed) {
      state.viewport.panDrag = {
        startX: e.clientX,
        startY: e.clientY,
        startTx: state.viewport.tx,
        startTy: state.viewport.ty,
      };
      onCalMove = (ev) => {
        if (!state.viewport.panDrag) return;
        const dx = ev.clientX - state.viewport.panDrag.startX;
        const dy = ev.clientY - state.viewport.panDrag.startY;
        state.viewport.tx = state.viewport.panDrag.startTx + dx;
        state.viewport.ty = state.viewport.panDrag.startTy + dy;
        clampViewport();
        applyViewportTransform();
        state.suppressMapClick = true;
        mapWrap.style.cursor = 'grabbing';
      };
      onCalUp = (ev) => {
        detachCalDragListeners();
        if (!state.viewport.panDrag) return;
        const dx = ev.clientX - state.viewport.panDrag.startX;
        const dy = ev.clientY - state.viewport.panDrag.startY;
        const moved = Math.sqrt(dx * dx + dy * dy) > CAL_DRAG_MIN_PX;
        state.viewport.panDrag = null;
        if (!moved) {
          state.suppressMapClick = false;
        } else {
          setTimeout(() => {
            state.suppressMapClick = false;
          }, 0);
        }
        syncCalArmUI();
      };
      window.addEventListener('mousemove', onCalMove);
      window.addEventListener('mouseup', onCalUp);
      return;
    }

    e.preventDefault();
    const { xPct, yPct } = pctFromClient(e.clientX, e.clientY);
    state.calDrag = {
      x1: xPct,
      y1: yPct,
      startClientX: e.clientX,
      startClientY: e.clientY,
      curX: xPct,
      curY: yPct,
    };
    state.suppressMapClick = true;
    onCalMove = (ev) => {
      if (!state.calDrag) return;
      const p = pctFromClient(ev.clientX, ev.clientY);
      state.calDrag.curX = p.xPct;
      state.calDrag.curY = p.yPct;
      drawCalSegment(state.calDrag.x1, state.calDrag.y1, state.calDrag.curX, state.calDrag.curY, true);
    };
    onCalUp = (ev) => {
      detachCalDragListeners();
      const drag = state.calDrag;
      state.calDrag = null;
      if (!drag) return;

      const dxPx = ev.clientX - drag.startClientX;
      const dyPx = ev.clientY - drag.startClientY;
      const lenPx = Math.sqrt(dxPx * dxPx + dyPx * dyPx);

      const endPt = pctFromClient(ev.clientX, ev.clientY);
      const x2 = round(endPt.xPct);
      const y2 = round(endPt.yPct);

      setTimeout(() => {
        state.suppressMapClick = false;
      }, 0);

      if (lenPx < CAL_DRAG_MIN_PX) {
        setStatus('Drag farther to draw a calibration line (or cancel).', true);
        disarmCalibration();
        updateCalVisual();
        return;
      }

      if (drag.x1 === x2 && drag.y1 === y2) {
        disarmCalibration();
        updateCalVisual();
        return;
      }

      state.cal = { x1: drag.x1, y1: drag.y1, x2, y2 };
      disarmCalibration();
      calMilesInput.value = '';
      calApplyRow.style.display = 'flex';
      updateCalVisual();
      setStatus('Enter the real-world miles for that line, then Apply calibration.');
    };

    window.addEventListener('mousemove', onCalMove);
    window.addEventListener('mouseup', onCalUp);
    if (state.calDrag) {
      drawCalSegment(state.calDrag.x1, state.calDrag.y1, state.calDrag.curX, state.calDrag.curY, true);
    }
  }

  function onMapClick(e) {
    if (state.suppressMapClick) return;
    if (e.target.closest('.wm-map-pin')) return;
    if (e.target.closest('button,a,input,select,label')) return;
    if (!state.map?.map_image_url) return;
    if (state.calArmed) return;
    if (e.target !== mapWrap && e.target !== mapStage && e.target !== mapImage && e.target !== mapEmpty && e.target !== calSvg) return;

    const pinTowns = state.towns.filter((t) => !state.skippedIds.has(t.id));
    if (!pinTowns.length) {
      setStatus('No available towns to pin (all hidden or none exist).', true);
      return;
    }

    const { xPct, yPct } = pctFromClient(e.clientX, e.clientY);
    state.pendingPin = { xPct, yPct };
    pinPickerSelect.innerHTML = pinTowns
      .map((t) => `<option value="${t.id}">${escapeHtml(t.name)}</option>`)
      .join('');
    pinPickerSummary.textContent = `Pin location: ${xPct.toFixed(2)}%, ${yPct.toFixed(2)}%`;
    pinPicker.style.display = '';
    pinPickerApplyBtn.focus();
  }

  function hidePinPicker() {
    pinPicker.style.display = 'none';
  }

  function cancelPendingPin() {
    state.pendingPin = null;
    hidePinPicker();
  }

  function confirmPendingPin() {
    if (!state.pendingPin) return;
    const townId = parseInt(pinPickerSelect.value || '0', 10);
    if (!townId) {
      setStatus('Choose a town before placing the pin.', true);
      return;
    }
    placePin(townId, state.pendingPin.xPct, state.pendingPin.yPct);
    state.pendingPin = null;
    hidePinPicker();
  }

  async function placePin(townId, xPct, yPct) {
    try {
      await apiSaveWorldMapPin(townId, xPct, yPct);
      const town = state.towns.find((t) => t.id === townId);
      const existingIdx = state.locations.findIndex((l) => parseInt(l.town_id, 10) === townId);
      const location = {
        town_id: townId,
        town_name: town?.name || `Town ${townId}`,
        location_name: town?.name || `Town ${townId}`,
        x_pct: xPct,
        y_pct: yPct,
      };
      if (existingIdx >= 0) state.locations.splice(existingIdx, 1, location);
      else state.locations.push(location);
      if (state.skippedIds.has(townId)) {
        state.skippedIds.delete(townId);
        const cb = container.querySelector(`.wm-skip-cb[data-town-id="${townId}"]`);
        if (cb) cb.checked = false;
      }
      renderPins();
      renderPinsList();
      renderTownTable();
      hidePinPicker();
      setStatus(`Pinned ${location.town_name}. Click the pin to open roster.`);
    } catch (err) {
      setStatus(`Could not pin town: ${err.message}`, true);
    }
  }

  function drawCalSegment(x1, y1, x2, y2, interim) {
    calSvg.style.display = '';
    calCircleA.setAttribute('cx', x1);
    calCircleA.setAttribute('cy', y1);
    calCircleA.style.display = '';
    calCircleB.setAttribute('cx', x2);
    calCircleB.setAttribute('cy', y2);
    calCircleB.style.display = '';
    calLine.setAttribute('x1', String(x1));
    calLine.setAttribute('y1', String(y1));
    calLine.setAttribute('x2', String(x2));
    calLine.setAttribute('y2', String(y2));
    if (interim) {
      calApplyRow.style.display = 'none';
    }
  }

  function updateCalVisual() {
    if (state.cal) {
      drawCalSegment(state.cal.x1, state.cal.y1, state.cal.x2, state.cal.y2, false);
      calSvg.style.display = '';
      calApplyRow.style.display = 'flex';
    } else if (!state.calDrag) {
      calLine.setAttribute('x1', '0');
      calLine.setAttribute('y1', '0');
      calLine.setAttribute('x2', '0');
      calLine.setAttribute('y2', '0');
      calCircleA.style.display = 'none';
      calCircleB.style.display = 'none';
      if (!state.calArmed) {
        calSvg.style.display = 'none';
      }
    }
  }

  function clearCalibrationLine(clearMilesInput = true) {
    state.cal = null;
    if (clearMilesInput) calMilesInput.value = '';
    calApplyRow.style.display = 'none';
    updateCalVisual();
  }

  async function applyCalibration() {
    if (!state.cal) {
      setStatus('Draw a line on the map first (Calibrate scale on map).', true);
      return;
    }
    const miles = parseFloat(calMilesInput.value || '0');
    if (!(miles > 0)) {
      setStatus('Enter the distance in miles.', true);
      return;
    }
    try {
      const res = await apiApplyWorldMapCalibration({
        x1_pct: state.cal.x1,
        y1_pct: state.cal.y1,
        x2_pct: state.cal.x2,
        y2_pct: state.cal.y2,
        miles,
      });
      const mpp = res.miles_per_pixel;
      container.querySelector('#wm-miles-per-pixel').value = mpp;
      if (state.map) state.map.miles_per_pixel = mpp;
      await saveSettings();
      setStatus(`Scale updated from your line (${mpp.toFixed(6)} mi/unit).`);
      clearCalibrationLine();
      disarmCalibration();
    } catch (err) {
      setStatus(err.message, true);
    }
  }

  function renderPins() {
    pinLayer.innerHTML = '';
    if (!state.map?.map_image_url) return;
    state.locations.forEach((loc) => {
      const tid = parseInt(loc.town_id, 10);
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'wm-map-pin';
      pin.dataset.townId = String(tid);
      pin.title = `Open roster: ${loc.town_name || loc.location_name || 'Town'}`;
      pin.setAttribute('aria-label', pin.title);
      pin.style.cssText = [
        'position:absolute',
        `left:${loc.x_pct}%`,
        `top:${loc.y_pct}%`,
        'transform:translate(-50%,-100%)',
        'pointer-events:auto',
        'cursor:pointer',
        'border:none',
        'padding:0',
        'background:transparent',
        'line-height:1',
        'text-align:center',
      ].join(';');
      pin.innerHTML = `
        <span style="font-size:1.25rem;display:block;">📍</span>
        <span style="font-size:0.7rem;background:rgba(0,0,0,0.78);padding:0.12rem 0.4rem;border-radius:6px;white-space:nowrap;color:#fff;display:inline-block;max-width:10rem;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(loc.town_name || loc.location_name)}</span>
      `;
      pin.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        setState({ currentTownId: tid });
        navigate(`town/${tid}`);
      });
      pinLayer.appendChild(pin);
    });
  }

  function renderPinsList() {
    const list = container.querySelector('#wm-pins-list');
    if (!state.locations.length) {
      list.innerHTML = '<div class="muted">No pinned towns yet.</div>';
      return;
    }
    list.innerHTML = state.locations.map((loc) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0.4rem 0;border-bottom:1px solid var(--border);gap:0.5rem;">
        <span>${escapeHtml(loc.town_name || loc.location_name)}
          <span class="muted">(${Number(loc.x_pct).toFixed(2)}%, ${Number(loc.y_pct).toFixed(2)}%)</span>
          <button type="button" class="btn-secondary btn-sm wm-open-roster" data-town-id="${loc.town_id}" style="margin-left:0.35rem;padding:0.15rem 0.45rem;font-size:0.75rem;">Roster</button>
        </span>
        <button class="btn-secondary btn-sm" data-del-town="${loc.town_id}">Remove pin</button>
      </div>
    `).join('');
    list.querySelectorAll('.wm-open-roster').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tid = parseInt(btn.dataset.townId, 10);
        setState({ currentTownId: tid });
        navigate(`town/${tid}`);
      });
    });
    list.querySelectorAll('[data-del-town]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const townId = parseInt(btn.dataset.delTown, 10);
        try {
          await apiDeleteWorldMapPin(townId);
          state.locations = state.locations.filter((l) => parseInt(l.town_id, 10) !== townId);
          renderPins();
          renderPinsList();
          setStatus('Pin removed.');
        } catch (err) {
          setStatus(`Could not remove pin: ${err.message}`, true);
        }
      });
    });
  }

  async function estimateTravel() {
    const fromTownId = parseInt(container.querySelector('#wm-travel-from').value || '0', 10);
    const toTownId = parseInt(container.querySelector('#wm-travel-to').value || '0', 10);
    const resultEl = container.querySelector('#wm-estimate-result');
    if (!fromTownId || !toTownId || fromTownId === toTownId) {
      resultEl.textContent = 'Pick two different towns.';
      resultEl.style.color = 'var(--error)';
      return;
    }
    resultEl.textContent = 'Estimating...';
    resultEl.style.color = 'var(--text-secondary)';
    try {
      const res = await apiEstimateTravelTime(fromTownId, toTownId);
      resultEl.textContent = `${res.distance_miles} miles (~${res.travel_days} days)`;
      resultEl.style.color = 'var(--success)';
    } catch (err) {
      resultEl.textContent = err.message;
      resultEl.style.color = 'var(--error)';
    }
  }
}

function round(n) {
  return Math.max(0, Math.min(100, Number(n.toFixed(5))));
}

function escapeHtml(value) {
  return String(value || '')
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
