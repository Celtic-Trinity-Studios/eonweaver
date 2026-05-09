import { apiWikiAutolinkRefresh, apiWikiDelete, apiWikiGet, apiWikiGraph, apiWikiList, apiWikiSave } from '../api/wiki.js';
import { showToast } from '../components/Toast.js';

function esc(v) {
  return String(v || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function seededPos(index, width, height) {
  const golden = 2.399963229728653;
  const r = Math.min(width, height) * 0.36 * Math.sqrt((index + 1) / 80);
  const a = index * golden;
  return {
    x: width * 0.5 + Math.cos(a) * r,
    y: height * 0.5 + Math.sin(a) * r,
  };
}

export default function WikiView(container) {
  container.innerHTML = `
    <div class="view-simulation">
      <header class="view-header">
        <h1>🔵 Worldbuilding Wiki & Lore</h1>
        <p class="view-subtitle">Article codex scaffold + auto-link refresh + lightweight relationship graph preview.</p>
      </header>
      <div class="dash-card" style="padding:1rem;margin-bottom:1rem;">
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:flex-end;">
          <div class="sim-field" style="min-width:220px;">
            <label>Article title</label>
            <input id="wiki-title" class="form-input" placeholder="e.g. Kingdom of Kharb">
          </div>
          <div class="sim-field" style="min-width:180px;">
            <label>Slug (optional)</label>
            <input id="wiki-slug" class="form-input" placeholder="auto-from-title">
          </div>
          <button class="btn-primary" id="wiki-save">Save Article</button>
          <button class="btn-secondary" id="wiki-refresh-links">AI Auto Cross-Link Refresh</button>
        </div>
        <textarea id="wiki-body" class="form-input" style="margin-top:0.6rem;min-height:8rem;" placeholder="Write lore here..."></textarea>
      </div>
      <div class="dash-card" style="padding:1rem;margin-bottom:1rem;">
        <h3 style="margin:0 0 0.5rem;">Wiki Articles</h3>
        <div id="wiki-list" class="muted">Loading…</div>
      </div>
      <div class="dash-card" style="padding:1rem;">
        <h3 style="margin:0 0 0.5rem;">Relationship Web Visualization (Framework)</h3>
        <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.5rem;flex-wrap:wrap;">
          <label class="muted" style="font-size:0.8rem;">Min disposition:</label>
          <input id="wiki-rel-min" class="form-input" type="number" value="-10" min="-10" max="10" style="max-width:90px;">
          <label class="muted" style="font-size:0.8rem;">Max disposition:</label>
          <input id="wiki-rel-max" class="form-input" type="number" value="10" min="-10" max="10" style="max-width:90px;">
          <button class="btn-secondary btn-sm" id="wiki-rel-apply">Apply filter</button>
        </div>
        <svg id="wiki-graph" viewBox="0 0 800 260" style="width:100%;height:260px;border:1px solid var(--border);border-radius:8px;background:rgba(0,0,0,0.14);"></svg>
        <div id="wiki-rel-list" class="muted" style="margin-top:0.6rem;max-height:10rem;overflow:auto;"></div>
      </div>
    </div>
  `;

  const listEl = container.querySelector('#wiki-list');
  const graphEl = container.querySelector('#wiki-graph');
  const titleInput = container.querySelector('#wiki-title');
  const slugInput = container.querySelector('#wiki-slug');
  const bodyInput = container.querySelector('#wiki-body');
  const relListEl = container.querySelector('#wiki-rel-list');

  let relMin = -10;
  let relMax = 10;

  async function renderList() {
    const res = await apiWikiList();
    const articles = res.articles || [];
    if (!articles.length) {
      listEl.innerHTML = '<div class="muted">No wiki articles yet.</div>';
      return;
    }
    listEl.innerHTML = `
      <div style="display:grid;gap:0.35rem;">
        ${articles.map((a) => `
          <div style="display:flex;gap:0.35rem;align-items:stretch;flex-wrap:wrap;">
            <button type="button" class="btn-secondary wiki-open-article" data-article-id="${a.id}" style="text-align:left;flex:1;min-width:12rem;">
              ${esc(a.title)} <span class="muted" style="font-size:0.75rem;">(${esc(a.slug)})</span>
            </button>
            <button type="button" class="btn-secondary wiki-del-article" data-article-id="${a.id}" style="color:var(--danger,#c45);">Delete</button>
          </div>
        `).join('')}
      </div>
    `;
    listEl.querySelectorAll('.wiki-del-article').forEach((btn) => {
      btn.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        const articleId = parseInt(btn.dataset.articleId || '0', 10);
        if (!articleId) return;
        if (!window.confirm('Delete this wiki article and its auto-links?')) return;
        try {
          await apiWikiDelete(articleId);
          if (parseInt(titleInput.dataset.articleId || '0', 10) === articleId) {
            titleInput.value = '';
            slugInput.value = '';
            bodyInput.value = '';
            titleInput.dataset.articleId = '';
          }
          showToast('Article deleted.', 'success');
          await renderList();
          await renderGraph();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
    listEl.querySelectorAll('.wiki-open-article').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const articleId = parseInt(btn.dataset.articleId || '0', 10);
        if (!articleId) return;
        try {
          const got = await apiWikiGet({ articleId });
          titleInput.value = got.article?.title || '';
          slugInput.value = got.article?.slug || '';
          bodyInput.value = got.article?.body || '';
          titleInput.dataset.articleId = String(articleId);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  }

  async function renderGraph() {
    const graph = await apiWikiGraph();
    const nodes = graph.nodes || [];
    const links = graph.links || [];
    const relWeb = (graph.relationship_web || []).filter((r) => {
      const d = Number(r.disposition ?? 0);
      return d >= relMin && d <= relMax;
    });
    const width = 780;
    const height = 240;
    const nodePos = new Map();
    nodes.forEach((n, i) => {
      nodePos.set(n.slug, {
        ...seededPos(i, width, height),
        vx: 0,
        vy: 0,
        title: n.title,
      });
    });

    const edgePairs = links
      .map((l) => ({ a: nodePos.get(l.from_slug), b: nodePos.get(l.to_slug), w: Number(l.weight || 1) }))
      .filter((e) => e.a && e.b);

    for (let iter = 0; iter < 120; iter++) {
      const vals = Array.from(nodePos.values());
      for (let i = 0; i < vals.length; i++) {
        for (let j = i + 1; j < vals.length; j++) {
          const a = vals[i];
          const b = vals[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist2 = Math.max(20, dx * dx + dy * dy);
          const rep = 2600 / dist2;
          const fx = (dx / Math.sqrt(dist2)) * rep;
          const fy = (dy / Math.sqrt(dist2)) * rep;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }

      edgePairs.forEach(({ a, b, w }) => {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const target = 82;
        const pull = (dist - target) * 0.0035 * Math.max(0.45, Math.min(2, w));
        const fx = (dx / dist) * pull;
        const fy = (dy / dist) * pull;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      });

      vals.forEach((p) => {
        p.vx *= 0.82;
        p.vy *= 0.82;
        p.x += p.vx;
        p.y += p.vy;
        p.x = Math.max(28, Math.min(width - 28, p.x));
        p.y = Math.max(34, Math.min(height - 22, p.y));
      });
    }
    const lines = links
      .map((l) => {
        const a = nodePos.get(l.from_slug);
        const b = nodePos.get(l.to_slug);
        if (!a || !b) return '';
        const widthByWeight = Math.max(1, Math.min(3, Number(l.weight || 1)));
        return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="rgba(96,165,250,0.45)" stroke-width="${widthByWeight.toFixed(2)}" />`;
      })
      .join('');
    const circles = Array.from(nodePos.values())
      .map((p) => `<g><circle cx="${p.x}" cy="${p.y}" r="8" fill="#c4a35a"></circle><text x="${p.x + 10}" y="${p.y + 4}" fill="#ddd" font-size="11">${esc(p.title)}</text></g>`)
      .join('');
    const relCount = relWeb.length;
    graphEl.innerHTML = `<rect x="0" y="0" width="${width}" height="${height}" fill="transparent"></rect>${lines}${circles}
      <text x="10" y="20" fill="#9ca3af" font-size="12">Wiki nodes: ${nodes.length} · Auto links: ${links.length} · Relationship edges: ${relCount}</text>`;
    relListEl.innerHTML = relWeb.slice(0, 200).map((r) => `
      <div style="padding:0.2rem 0;border-bottom:1px solid var(--border);">
        ${esc(r.char1_name)} ↔ ${esc(r.char2_name)} · ${esc(r.relationship_type || 'link')}
        <span class="muted">(disp ${Number(r.disposition || 0).toFixed(2)})</span>
      </div>
    `).join('') || '<div class="muted">No relationship edges in this filter.</div>';
  }

  container.querySelector('#wiki-save').addEventListener('click', async () => {
    try {
      await apiWikiSave({
        id: parseInt(titleInput.dataset.articleId || '0', 10) || undefined,
        title: titleInput.value.trim(),
        slug: slugInput.value.trim(),
        body: bodyInput.value,
      });
      titleInput.dataset.articleId = '';
      showToast('Wiki article saved.', 'success');
      await renderList();
      await renderGraph();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  container.querySelector('#wiki-refresh-links').addEventListener('click', async () => {
    try {
      await apiWikiAutolinkRefresh();
      showToast('Auto-link graph refreshed.', 'success');
      await renderGraph();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  container.querySelector('#wiki-rel-apply').addEventListener('click', async () => {
    relMin = Number(container.querySelector('#wiki-rel-min').value || -10);
    relMax = Number(container.querySelector('#wiki-rel-max').value || 10);
    if (relMin > relMax) {
      const tmp = relMin;
      relMin = relMax;
      relMax = tmp;
    }
    try {
      await renderGraph();
      showToast('Relationship filter applied.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  Promise.all([renderList(), renderGraph()]).catch((err) => {
    listEl.textContent = err.message;
  });
}

