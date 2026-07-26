/**
 * Eon Weaver — Town Relationship Graph
 * Force-directed canvas graph of living NPCs linked by relationship type.
 */

export const REL_TYPE_COLORS = {
  romantic: '#e85d8a',
  friend: '#5cb85c',
  ally: '#2aa8a0',
  acquaintance: '#7a9e7a',
  family: '#d4a84b',
  parent: '#c9a227',
  mentor: '#5b8fd9',
  student: '#7ba3e0',
  rival: '#e0a020',
  enemy: '#e05050',
};

const REL_TYPE_LABELS = {
  romantic: 'Romantic',
  friend: 'Friend',
  ally: 'Ally',
  acquaintance: 'Acquaintance',
  family: 'Family',
  parent: 'Parent',
  mentor: 'Mentor',
  student: 'Student',
  rival: 'Rival',
  enemy: 'Enemy',
};

const NODE_R = 22;
const LABEL_H = 14;

function relColor(type) {
  const t = String(type || '').toLowerCase();
  return REL_TYPE_COLORS[t] || '#888888';
}

function isLiving(c) {
  const s = String(c?.status || 'Alive').trim();
  return s.toLowerCase() !== 'deceased';
}

function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {HTMLElement} host
 * @param {{ relationships: array, characters: array, variant?: 'page'|'embed'|'sheet', egoId?: number|string }} opts
 * @returns {{ destroy: () => void }}
 */
export function mountRelationshipGraph(host, opts = {}) {
  const relationships = Array.isArray(opts.relationships) ? opts.relationships : [];
  const characters = Array.isArray(opts.characters) ? opts.characters : [];
  const variant = opts.variant === 'page' || opts.variant === 'sheet' ? opts.variant : 'embed';
  const egoIdRaw = opts.egoId != null ? Number(opts.egoId) : null;
  const egoId = Number.isFinite(egoIdRaw) ? egoIdRaw : null;
  const egoMode = egoId != null;

  const charById = new Map();
  for (const c of characters) {
    const id = Number(c.id ?? c.dbId);
    if (!Number.isFinite(id)) continue;
    charById.set(id, c);
  }

  const nameFromRel = new Map();
  for (const r of relationships) {
    const a = Number(r.char1_id);
    const b = Number(r.char2_id);
    if (Number.isFinite(a) && r.char1_name) nameFromRel.set(a, r.char1_name);
    if (Number.isFinite(b) && r.char2_name) nameFromRel.set(b, r.char2_name);
  }

  const livingIds = new Set();
  for (const [id, c] of charById) {
    if (isLiving(c)) livingIds.add(id);
  }
  for (const id of nameFromRel.keys()) {
    if (!charById.has(id)) livingIds.add(id);
    else if (isLiving(charById.get(id))) livingIds.add(id);
  }
  // Ego sheet: always include the subject even if status is missing/odd
  if (egoMode) livingIds.add(egoId);

  const edges = [];
  const linkedIds = new Set();
  for (const r of relationships) {
    const a = Number(r.char1_id);
    const b = Number(r.char2_id);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) continue;
    if (egoMode && a !== egoId && b !== egoId) continue;
    if (!livingIds.has(a) || !livingIds.has(b)) continue;
    const type = String(r.rel_type || 'acquaintance').toLowerCase();
    edges.push({
      source: a,
      target: b,
      type,
      disposition: parseInt(r.disposition, 10) || 0,
      reason: r.reason || '',
      name1: r.char1_name || charById.get(a)?.name || nameFromRel.get(a) || `#${a}`,
      name2: r.char2_name || charById.get(b)?.name || nameFromRel.get(b) || `#${b}`,
    });
    linkedIds.add(a);
    linkedIds.add(b);
  }

  if (!edges.length) {
    const emptyMsg = egoMode
      ? 'No relationships to graph for this character'
      : 'No living NPC relationships to graph';
    host.innerHTML = `<div class="social-empty"><div class="social-empty-icon">🤝</div>${emptyMsg}</div>`;
    return { destroy() { host.innerHTML = ''; } };
  }

  const typesPresent = [...new Set(edges.map((e) => e.type))].sort();
  const enabledTypes = new Set(typesPresent);

  const nodes = [];
  const nodeById = new Map();
  for (const id of linkedIds) {
    const c = charById.get(id) || {};
    const isEgo = egoMode && id === egoId;
    const n = {
      id,
      name: c.name || nameFromRel.get(id) || `#${id}`,
      portrait_url: c.portrait_url || '',
      x: isEgo ? 0 : (Math.random() - 0.5) * 280,
      y: isEgo ? 0 : (Math.random() - 0.5) * 200,
      vx: 0,
      vy: 0,
      img: null,
      fixed: false,
      // Ego star layout: keep subject centered unless the user drags them
      pinCenter: isEgo,
    };
    if (n.portrait_url) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { n.img = img; };
      img.src = n.portrait_url;
    }
    nodes.push(n);
    nodeById.set(id, n);
  }

  const simEdges = edges.map((e) => ({
    ...e,
    sourceNode: nodeById.get(e.source),
    targetNode: nodeById.get(e.target),
  })).filter((e) => e.sourceNode && e.targetNode);

  const variantClass = variant === 'page' ? ' rel-graph--page' : variant === 'sheet' ? ' rel-graph--sheet' : '';
  const canvasAria = egoMode
    ? 'Personal relationship graph — only connections for this character'
    : 'Relationship graph — click a person to focus their connections';

  host.innerHTML = `
    <div class="rel-graph${variantClass}">
      <div class="rel-graph-toolbar">
        <button type="button" class="rel-graph-filter-btn" id="rg-filters-btn" aria-expanded="false">
          <span class="rel-graph-filter-icon" aria-hidden="true">☰</span> Filters
        </button>
        <button type="button" class="rel-graph-filter-btn" id="rg-clear-focus" hidden title="Show all relationships">Clear focus</button>
        <div class="rel-graph-legend" id="rg-legend"></div>
      </div>
      <div class="rel-graph-filters" id="rg-filters" hidden></div>
      <div class="rel-graph-stage">
        <canvas class="rel-graph-canvas" id="rg-canvas" aria-label="${canvasAria}"></canvas>
        <div class="rel-graph-tooltip" id="rg-tooltip" hidden></div>
        <div class="rel-graph-zoom">
          <button type="button" id="rg-zoom-in" title="Zoom in">+</button>
          <button type="button" id="rg-zoom-out" title="Zoom out">−</button>
          <button type="button" id="rg-fit" title="Fit to view">⊡</button>
        </div>
      </div>
    </div>
  `;

  const canvas = host.querySelector('#rg-canvas');
  const tooltip = host.querySelector('#rg-tooltip');
  const filtersEl = host.querySelector('#rg-filters');
  const legendEl = host.querySelector('#rg-legend');
  const filterBtn = host.querySelector('#rg-filters-btn');
  const clearFocusBtn = host.querySelector('#rg-clear-focus');
  const stage = host.querySelector('.rel-graph-stage');

  filtersEl.innerHTML = typesPresent.map((t) => `
    <label class="rel-graph-filter-item">
      <input type="checkbox" data-rel-type="${escapeHtml(t)}" checked>
      <span class="rel-graph-swatch" style="background:${relColor(t)}"></span>
      ${escapeHtml(REL_TYPE_LABELS[t] || t)}
    </label>
  `).join('');

  function renderLegend() {
    legendEl.innerHTML = typesPresent
      .filter((t) => enabledTypes.has(t))
      .map((t) => `
        <span class="rel-graph-legend-item">
          <span class="rel-graph-swatch" style="background:${relColor(t)}"></span>
          ${escapeHtml(REL_TYPE_LABELS[t] || t)}
        </span>
      `).join('');
  }
  renderLegend();

  function setFocus(id) {
    focusId = id;
    if (clearFocusBtn) {
      if (focusId == null) clearFocusBtn.setAttribute('hidden', '');
      else clearFocusBtn.removeAttribute('hidden');
    }
  }

  clearFocusBtn?.addEventListener('click', () => setFocus(null));

  filterBtn.addEventListener('click', () => {
    const open = filtersEl.hasAttribute('hidden');
    if (open) filtersEl.removeAttribute('hidden');
    else filtersEl.setAttribute('hidden', '');
    filterBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  filtersEl.addEventListener('change', (ev) => {
    const cb = ev.target.closest('input[data-rel-type]');
    if (!cb) return;
    const t = cb.dataset.relType;
    if (cb.checked) enabledTypes.add(t);
    else enabledTypes.delete(t);
    renderLegend();
  });

  let width = 0;
  let height = 420;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let scale = 1;
  let panX = 0;
  let panY = 0;
  let dragging = null;
  let panning = false;
  let panStart = null;
  let hoverEdge = null;
  /** @type {number|null} focused character id — dim everyone else except direct neighbors */
  let focusId = egoMode ? egoId : null;
  let pointerDownAt = null;
  let didDrag = false;
  let raf = 0;
  let running = true;
  let cooled = 0;

  function resize() {
    const rect = stage.getBoundingClientRect();
    width = Math.max(320, Math.floor(rect.width));
    height = Math.max(320, Math.floor(rect.height || 420));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  function visibleEdges() {
    return simEdges.filter((e) => enabledTypes.has(e.type));
  }

  function visibleNodeIds(visEdges) {
    const ids = new Set();
    for (const e of visEdges) {
      ids.add(e.source);
      ids.add(e.target);
    }
    return ids;
  }

  /** Focused node + nodes sharing a visible edge with it. */
  function focusBrightIds(visEdges) {
    if (focusId == null) return null;
    const bright = new Set([focusId]);
    for (const e of visEdges) {
      if (e.source === focusId) bright.add(e.target);
      else if (e.target === focusId) bright.add(e.source);
    }
    return bright;
  }

  function edgeInFocus(e, bright) {
    if (!bright) return true;
    return bright.has(e.source) && bright.has(e.target)
      && (e.source === focusId || e.target === focusId);
  }

  function tick() {
    const vis = visibleEdges();
    const visIds = visibleNodeIds(vis);
    const active = nodes.filter((n) => visIds.has(n.id));
    if (!active.length) return;

    const alpha = Math.max(0.02, 0.28 - cooled * 0.002);
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i];
        const b = active[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist2 = dx * dx + dy * dy || 1;
        const dist = Math.sqrt(dist2);
        const force = (9000 / dist2) * alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        if (!a.fixed) { a.vx -= fx; a.vy -= fy; }
        if (!b.fixed) { b.vx += fx; b.vy += fy; }
      }
    }
    for (const e of vis) {
      const a = e.sourceNode;
      const b = e.targetNode;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const target = 90;
      const force = (dist - target) * 0.04 * alpha;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      if (!a.fixed) { a.vx += fx; a.vy += fy; }
      if (!b.fixed) { b.vx -= fx; b.vy -= fy; }
    }
    let cx = 0;
    let cy = 0;
    for (const n of active) { cx += n.x; cy += n.y; }
    cx /= active.length;
    cy /= active.length;
    for (const n of active) {
      if (n.fixed) continue;
      if (n.pinCenter) {
        n.vx = 0;
        n.vy = 0;
        n.x = 0;
        n.y = 0;
        continue;
      }
      n.vx += (0 - cx) * 0.01 * alpha;
      n.vy += (0 - cy) * 0.01 * alpha;
      n.vx *= 0.85;
      n.vy *= 0.85;
      n.x += n.vx;
      n.y += n.vy;
    }
    cooled = Math.min(cooled + 1, 200);
  }

  function screenToWorld(sx, sy) {
    return {
      x: (sx - width / 2 - panX) / scale,
      y: (sy - height / 2 - panY) / scale,
    };
  }

  function hitNode(sx, sy) {
    const w = screenToWorld(sx, sy);
    const vis = visibleEdges();
    const visIds = visibleNodeIds(vis);
    let best = null;
    let bestD = NODE_R + 4;
    for (const n of nodes) {
      if (!visIds.has(n.id)) continue;
      const d = Math.hypot(n.x - w.x, n.y - w.y);
      if (d < bestD) { bestD = d; best = n; }
    }
    return best;
  }

  function hitEdge(sx, sy) {
    const w = screenToWorld(sx, sy);
    const vis = visibleEdges();
    let best = null;
    let bestD = 8 / scale;
    for (const e of vis) {
      const a = e.sourceNode;
      const b = e.targetNode;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len2 = dx * dx + dy * dy || 1;
      let t = ((w.x - a.x) * dx + (w.y - a.y) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = a.x + t * dx;
      const py = a.y + t * dy;
      const d = Math.hypot(w.x - px, w.y - py);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  function draw() {
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    const grid = 28;
    for (let x = 0; x < width; x += grid) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += grid) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(width / 2 + panX, height / 2 + panY);
    ctx.scale(scale, scale);

    const vis = visibleEdges();
    const visIds = visibleNodeIds(vis);
    const bright = focusBrightIds(vis);

    for (const e of vis) {
      const a = e.sourceNode;
      const b = e.targetNode;
      const thick = 1.2 + Math.min(3, Math.abs(e.disposition) / 4);
      const focused = edgeInFocus(e, bright);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = relColor(e.type);
      if (bright && !focused) {
        ctx.globalAlpha = 0.12;
      } else {
        ctx.globalAlpha = hoverEdge === e ? 1 : 0.85;
      }
      ctx.lineWidth = (hoverEdge === e && focused ? thick + 1 : thick) / scale;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    for (const n of nodes) {
      if (!visIds.has(n.id)) continue;
      const isBright = !bright || bright.has(n.id);
      const isFocus = focusId === n.id;
      ctx.globalAlpha = isBright ? 1 : 0.18;

      ctx.beginPath();
      ctx.arc(n.x, n.y, NODE_R, 0, Math.PI * 2);
      ctx.fillStyle = isFocus ? '#3a3a48' : '#2a2a32';
      ctx.fill();
      ctx.strokeStyle = isFocus ? 'rgba(245,197,24,0.85)' : 'rgba(255,255,255,0.25)';
      ctx.lineWidth = (isFocus ? 2.5 : 1.5) / scale;
      ctx.stroke();

      if (n.img && n.img.complete && n.img.naturalWidth) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(n.x, n.y, NODE_R - 1.5, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(n.img, n.x - NODE_R, n.y - NODE_R, NODE_R * 2, NODE_R * 2);
        ctx.restore();
      } else {
        ctx.fillStyle = '#c8c4bc';
        ctx.font = `600 ${12 / scale}px system-ui,sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials(n.name), n.x, n.y);
      }

      ctx.fillStyle = isBright ? 'rgba(240,236,228,0.92)' : 'rgba(240,236,228,0.35)';
      ctx.font = `${isFocus ? '600' : '500'} ${11 / scale}px system-ui,sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const label = n.name.length > 16 ? `${n.name.slice(0, 14)}…` : n.name;
      ctx.fillText(label, n.x, n.y + NODE_R + 4 / scale);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function loop() {
    if (!running) return;
    tick();
    draw();
    raf = requestAnimationFrame(loop);
  }

  function fitView() {
    const vis = visibleEdges();
    const visIds = visibleNodeIds(vis);
    const active = nodes.filter((n) => visIds.has(n.id));
    if (!active.length) return;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const n of active) {
      minX = Math.min(minX, n.x - NODE_R);
      maxX = Math.max(maxX, n.x + NODE_R);
      minY = Math.min(minY, n.y - NODE_R);
      maxY = Math.max(maxY, n.y + NODE_R + LABEL_H);
    }
    const bw = Math.max(40, maxX - minX);
    const bh = Math.max(40, maxY - minY);
    const pad = 48;
    scale = Math.max(0.35, Math.min(2.2, Math.min((width - pad) / bw, (height - pad) / bh)));
    panX = -((minX + maxX) / 2) * scale;
    panY = -((minY + maxY) / 2) * scale;
    cooled = 0;
  }

  function canvasPos(ev) {
    const rect = canvas.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  }

  canvas.addEventListener('pointerdown', (ev) => {
    canvas.setPointerCapture(ev.pointerId);
    const { x, y } = canvasPos(ev);
    pointerDownAt = { x, y };
    didDrag = false;
    const n = hitNode(x, y);
    if (n) {
      dragging = n;
      n.fixed = true;
      if (n.pinCenter) n.pinCenter = false;
      cooled = 0;
    } else {
      panning = true;
      panStart = { x, y, panX, panY };
    }
  });

  canvas.addEventListener('pointermove', (ev) => {
    const { x, y } = canvasPos(ev);
    if (pointerDownAt && (Math.hypot(x - pointerDownAt.x, y - pointerDownAt.y) > 5)) {
      didDrag = true;
    }
    if (dragging) {
      const w = screenToWorld(x, y);
      dragging.x = w.x;
      dragging.y = w.y;
      dragging.vx = 0;
      dragging.vy = 0;
      return;
    }
    if (panning && panStart) {
      panX = panStart.panX + (x - panStart.x);
      panY = panStart.panY + (y - panStart.y);
      return;
    }
    const edge = hitEdge(x, y);
    hoverEdge = edge;
    if (edge) {
      const dVal = edge.disposition;
      tooltip.hidden = false;
      tooltip.innerHTML = `<strong>${escapeHtml(edge.name1)}</strong> ↔ <strong>${escapeHtml(edge.name2)}</strong><br>
        <span style="color:${relColor(edge.type)}">${escapeHtml(REL_TYPE_LABELS[edge.type] || edge.type)}</span>
        (${dVal > 0 ? '+' : ''}${dVal})
        ${edge.reason ? `<br><em>${escapeHtml(edge.reason)}</em>` : ''}`;
      tooltip.style.left = `${Math.min(width - 200, x + 12)}px`;
      tooltip.style.top = `${Math.min(height - 80, y + 12)}px`;
      canvas.style.cursor = 'pointer';
    } else {
      const n = hitNode(x, y);
      tooltip.hidden = true;
      canvas.style.cursor = n ? 'grab' : 'default';
    }
  });

  function endPointer(ev) {
    const startedOnNode = !!dragging;
    const startedOnEmpty = !!panning;
    if (dragging) {
      dragging.fixed = false;
      dragging = null;
    }
    panning = false;
    panStart = null;

    // Click (not drag): focus that person; click again or empty space clears
    // Ego graphs already filter to one person — skip focus toggling
    if (!didDrag && ev && !egoMode) {
      const { x, y } = canvasPos(ev);
      const n = hitNode(x, y);
      if (startedOnNode && n) {
        setFocus(focusId === n.id ? null : n.id);
      } else if (startedOnEmpty && !n) {
        setFocus(null);
      }
    }

    pointerDownAt = null;
    didDrag = false;
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', () => {
    if (!dragging) {
      hoverEdge = null;
      tooltip.hidden = true;
    }
  });

  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const factor = ev.deltaY > 0 ? 0.92 : 1.08;
    scale = Math.max(0.3, Math.min(3, scale * factor));
  }, { passive: false });

  host.querySelector('#rg-zoom-in')?.addEventListener('click', () => {
    scale = Math.min(3, scale * 1.15);
  });
  host.querySelector('#rg-zoom-out')?.addEventListener('click', () => {
    scale = Math.max(0.3, scale / 1.15);
  });
  host.querySelector('#rg-fit')?.addEventListener('click', () => fitView());

  const ro = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(() => { resize(); })
    : null;
  if (ro) ro.observe(stage);

  resize();
  for (let i = 0; i < 80; i++) tick();
  fitView();
  loop();

  return {
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      host.innerHTML = '';
    },
  };
}
