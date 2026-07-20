import {
  apiWikiAutolinkRefresh,
  apiWikiDelete,
  apiWikiGet,
  apiWikiGraph,
  apiWikiList,
  apiWikiPendingList,
  apiWikiPendingResolve,
  apiWikiSave,
} from '../api/wiki.js';
import { showToast } from '../components/Toast.js';
import { escHtml, renderLoreMarkdown } from '../utils/loreMarkdown.js';
import { navigate } from '../router.js';

const CATEGORIES = [
  { id: '', label: 'All categories' },
  { id: 'place', label: 'Place' },
  { id: 'npc', label: 'NPC' },
  { id: 'faction', label: 'Faction' },
  { id: 'item', label: 'Item' },
  { id: 'plot', label: 'Plot' },
  { id: 'deity', label: 'Deity' },
  { id: 'other', label: 'Other' },
];

function seededPos(index, width, height) {
  const golden = 2.399963229728653;
  const r = Math.min(width, height) * 0.36 * Math.sqrt((index + 1) / 80);
  const a = index * golden;
  return {
    x: width * 0.5 + Math.cos(a) * r,
    y: height * 0.5 + Math.sin(a) * r,
  };
}

function parseTagsInput(raw) {
  return String(raw || '')
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function readQueryArticle() {
  try {
    const sp = new URLSearchParams(window.location.search);
    const id = parseInt(sp.get('article') || sp.get('id') || '0', 10);
    const slug = (sp.get('slug') || '').trim();
    return { id: Number.isFinite(id) ? id : 0, slug };
  } catch {
    return { id: 0, slug: '' };
  }
}

export default function WikiView(container) {
  container.innerHTML = `
    <div class="view-lore">
      <header class="view-header">
        <h1>🔵 Lore Codex</h1>
        <p class="view-subtitle">Editable lore pages with [[cross-links]], auto-links, and AI ingest from Scribe.</p>
      </header>

      <div id="lore-pending-panel" class="dash-card lore-pending-panel" hidden></div>

      <div class="lore-layout">
        <aside class="dash-card lore-sidebar">
          <div class="lore-sidebar-tools">
            <input id="lore-search" class="form-input" type="search" placeholder="Search pages…">
            <select id="lore-filter-cat" class="form-select">
              ${CATEGORIES.map((c) => `<option value="${c.id}">${escHtml(c.label)}</option>`).join('')}
            </select>
            <button type="button" class="btn-primary w-full" id="lore-new">+ New page</button>
            <button type="button" class="btn-secondary w-full" id="lore-refresh-links">Refresh cross-links</button>
          </div>
          <div id="lore-list" class="lore-list muted">Loading…</div>
        </aside>

        <section class="dash-card lore-editor-panel">
          <div class="lore-editor-toolbar">
            <div class="lore-field-row">
              <div class="sim-field lore-grow">
                <label for="lore-title">Title</label>
                <input id="lore-title" class="form-input" placeholder="e.g. Kingdom of Kharb">
              </div>
              <div class="sim-field" style="min-width:9rem;">
                <label for="lore-slug">Slug</label>
                <input id="lore-slug" class="form-input" placeholder="auto">
              </div>
              <div class="sim-field" style="min-width:8rem;">
                <label for="lore-category">Category</label>
                <select id="lore-category" class="form-select">
                  ${CATEGORIES.filter((c) => c.id).map((c) => `<option value="${c.id}">${escHtml(c.label)}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="lore-field-row">
              <div class="sim-field lore-grow">
                <label for="lore-tags">Tags (comma-separated)</label>
                <input id="lore-tags" class="form-input" placeholder="capital, intrigue">
              </div>
              <div class="sim-field lore-grow">
                <label for="lore-aliases">Aliases (for auto-link)</label>
                <input id="lore-aliases" class="form-input" placeholder="Kharb, The Kingdom">
              </div>
            </div>
            <div class="lore-flags">
              <label class="lore-check"><input type="checkbox" id="lore-player-visible"> Player visible</label>
              <label class="lore-check"><input type="checkbox" id="lore-locked"> Lock (AI cannot overwrite)</label>
              <span id="lore-meta-badges" class="lore-meta-badges"></span>
            </div>
            <div class="lore-actions">
              <button type="button" class="btn-primary" id="lore-save">Save page</button>
              <button type="button" class="btn-secondary" id="lore-insert-link">Insert [[link]]</button>
              <button type="button" class="btn-secondary" id="lore-toggle-preview">Preview</button>
              <button type="button" class="btn-danger" id="lore-delete" hidden>Delete</button>
            </div>
          </div>

          <div class="lore-body-split">
            <textarea id="lore-body" class="form-input lore-body" spellcheck="true"
              placeholder="Write lore in markdown. Cross-link with [[Page Title]] or [[Page Title|display text]]."></textarea>
            <div id="lore-preview" class="lore-preview" hidden></div>
          </div>

          <div class="sim-field" style="margin-top:0.75rem;">
            <label for="lore-dm-notes">DM notes (never shown to players)</label>
            <textarea id="lore-dm-notes" class="form-input" rows="2" placeholder="Secrets, railroading notes…"></textarea>
          </div>

          <div class="lore-link-panels">
            <div>
              <h3 class="lore-panel-title">Outgoing links</h3>
              <div id="lore-outlinks" class="muted lore-link-list">Save or open a page to see links.</div>
            </div>
            <div>
              <h3 class="lore-panel-title">Backlinks</h3>
              <div id="lore-backlinks" class="muted lore-link-list">—</div>
            </div>
          </div>
        </section>
      </div>

      <div class="dash-card lore-graph-card">
        <div class="lore-graph-head">
          <h3 style="margin:0;">Lore graph</h3>
          <select id="lore-graph-cat" class="form-select" style="max-width:12rem;">
            ${CATEGORIES.map((c) => `<option value="${c.id}">${escHtml(c.label)}</option>`).join('')}
          </select>
        </div>
        <svg id="lore-graph" viewBox="0 0 800 280" class="lore-graph-svg"></svg>
        <p class="muted" style="margin:0.4rem 0 0;font-size:0.8rem;">Click a node to open that page. Edge thickness reflects link weight; manual [[links]] outweigh title mentions.</p>
      </div>
    </div>
  `;

  const els = {
    list: container.querySelector('#lore-list'),
    search: container.querySelector('#lore-search'),
    filterCat: container.querySelector('#lore-filter-cat'),
    title: container.querySelector('#lore-title'),
    slug: container.querySelector('#lore-slug'),
    category: container.querySelector('#lore-category'),
    tags: container.querySelector('#lore-tags'),
    aliases: container.querySelector('#lore-aliases'),
    body: container.querySelector('#lore-body'),
    preview: container.querySelector('#lore-preview'),
    dmNotes: container.querySelector('#lore-dm-notes'),
    playerVisible: container.querySelector('#lore-player-visible'),
    locked: container.querySelector('#lore-locked'),
    badges: container.querySelector('#lore-meta-badges'),
    outlinks: container.querySelector('#lore-outlinks'),
    backlinks: container.querySelector('#lore-backlinks'),
    pending: container.querySelector('#lore-pending-panel'),
    graph: container.querySelector('#lore-graph'),
    graphCat: container.querySelector('#lore-graph-cat'),
    deleteBtn: container.querySelector('#lore-delete'),
    togglePreview: container.querySelector('#lore-toggle-preview'),
  };

  let articlesCache = [];
  let currentId = 0;
  let previewMode = false;
  let searchTimer = null;

  function clearEditor() {
    currentId = 0;
    els.title.value = '';
    els.slug.value = '';
    els.category.value = 'other';
    els.tags.value = '';
    els.aliases.value = '';
    els.body.value = '';
    els.dmNotes.value = '';
    els.playerVisible.checked = false;
    els.locked.checked = false;
    els.badges.innerHTML = '';
    els.deleteBtn.hidden = true;
    els.outlinks.textContent = 'Save or open a page to see links.';
    els.backlinks.textContent = '—';
    if (previewMode) renderPreview();
  }

  function fillEditor(article, backlinks = [], outlinks = []) {
    currentId = parseInt(article?.id || '0', 10) || 0;
    els.title.value = article?.title || '';
    els.slug.value = article?.slug || '';
    els.category.value = article?.category || 'other';
    els.tags.value = (article?.tags || []).join(', ');
    els.aliases.value = (article?.aliases || []).join(', ');
    els.body.value = article?.body || '';
    els.dmNotes.value = article?.dm_notes || '';
    els.playerVisible.checked = !!Number(article?.player_visible);
    els.locked.checked = !!Number(article?.is_locked);
    els.deleteBtn.hidden = !currentId;
    const badges = [];
    if (Number(article?.is_auto_generated)) badges.push('<span class="lore-badge lore-badge--ai">AI</span>');
    if (Number(article?.is_locked)) badges.push('<span class="lore-badge lore-badge--lock">Locked</span>');
    if (Number(article?.player_visible)) badges.push('<span class="lore-badge lore-badge--player">Players</span>');
    if (article?.entity_type) {
      badges.push(`<span class="lore-badge">${escHtml(article.entity_type)} #${escHtml(article.entity_id)}</span>`);
    }
    els.badges.innerHTML = badges.join(' ');
    renderLinkLists(backlinks, outlinks);
    if (previewMode) renderPreview();
  }

  function renderLinkLists(backlinks, outlinks) {
    els.outlinks.innerHTML = (outlinks || []).length
      ? outlinks.map((l) => `
          <button type="button" class="lore-link-chip" data-article-id="${l.to_id || ''}" data-slug="${escHtml(l.to_slug)}">
            ${escHtml(l.to_title || l.to_slug)}
            <span class="muted">${Number(l.auto_generated) ? 'auto' : 'manual'}</span>
          </button>`).join('')
      : '<span class="muted">No outgoing links yet. Use [[Title]] or matching page titles.</span>';
    els.backlinks.innerHTML = (backlinks || []).length
      ? backlinks.map((l) => `
          <button type="button" class="lore-link-chip" data-article-id="${l.from_id || ''}" data-slug="${escHtml(l.from_slug)}">
            ${escHtml(l.from_title || l.from_slug)}
            <span class="muted">${Number(l.auto_generated) ? 'auto' : 'manual'}</span>
          </button>`).join('')
      : '<span class="muted">Nothing links here yet.</span>';

    container.querySelectorAll('.lore-link-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.articleId || '0', 10);
        const slug = btn.dataset.slug || '';
        openArticle({ articleId: id, slug });
      });
    });
  }

  function renderPreview() {
    els.preview.innerHTML = renderLoreMarkdown(els.body.value, {
      onWikilink: (title, label) =>
        `<a href="#" class="lore-wikilink" data-lore-title="${escHtml(title)}">${escHtml(label)}</a>`,
    });
    els.preview.querySelectorAll('.lore-wikilink').forEach((a) => {
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        const title = a.dataset.loreTitle || '';
        const hit = articlesCache.find(
          (x) => x.title === title || x.slug === title
            || (x.aliases || []).some((al) => al === title),
        );
        if (hit) openArticle({ articleId: hit.id });
        else showToast(`No page titled “${title}” yet — save with [[${title}]] to create a stub.`, 'info');
      });
    });
  }

  function setPreviewMode(on) {
    previewMode = on;
    els.body.hidden = on;
    els.preview.hidden = !on;
    els.togglePreview.textContent = on ? 'Edit' : 'Preview';
    if (on) renderPreview();
  }

  async function openArticle({ articleId = 0, slug = '' } = {}) {
    try {
      const got = await apiWikiGet({ articleId, slug });
      fillEditor(got.article, got.backlinks || [], got.outlinks || []);
      highlightActiveInList();
    } catch (err) {
      showToast(err.message || 'Could not open page.', 'error');
    }
  }

  function highlightActiveInList() {
    els.list.querySelectorAll('.lore-list-item').forEach((el) => {
      el.classList.toggle('active', parseInt(el.dataset.articleId || '0', 10) === currentId);
    });
  }

  async function renderList() {
    const q = els.search.value.trim();
    const category = els.filterCat.value;
    const res = await apiWikiList({ q, category });
    articlesCache = res.articles || [];
    if (!articlesCache.length) {
      els.list.innerHTML = '<div class="muted">No lore pages yet. Create one or generate with AI Scribe.</div>';
      return;
    }
    els.list.innerHTML = articlesCache.map((a) => `
      <button type="button" class="lore-list-item ${parseInt(a.id, 10) === currentId ? 'active' : ''}"
        data-article-id="${a.id}">
        <span class="lore-list-title">${escHtml(a.title)}</span>
        <span class="lore-list-meta">
          <span class="lore-cat">${escHtml(a.category || 'other')}</span>
          ${Number(a.is_auto_generated) ? '<span title="AI">✦</span>' : ''}
          ${Number(a.is_locked) ? '<span title="Locked">🔒</span>' : ''}
          ${Number(a.player_visible) ? '<span title="Player visible">👁</span>' : ''}
        </span>
      </button>
    `).join('');
    els.list.querySelectorAll('.lore-list-item').forEach((btn) => {
      btn.addEventListener('click', () => openArticle({ articleId: parseInt(btn.dataset.articleId, 10) }));
    });
  }

  async function renderPending() {
    try {
      const res = await apiWikiPendingList();
      const pending = res.pending || [];
      if (!pending.length) {
        els.pending.hidden = true;
        els.pending.innerHTML = '';
        return;
      }
      els.pending.hidden = false;
      els.pending.innerHTML = `
        <h3 style="margin:0 0 0.5rem;">Pending AI lore updates (${pending.length})</h3>
        <p class="muted" style="margin:0 0 0.75rem;font-size:0.85rem;">
          These pages are locked or DM-edited, so AI output was queued instead of overwriting.
        </p>
        <div class="lore-pending-list">
          ${pending.map((p) => `
            <div class="lore-pending-item" data-pending-id="${p.id}">
              <div>
                <strong>${escHtml(p.proposed_title)}</strong>
                <span class="muted"> · ${escHtml(p.source_generator || 'ai')} · ${escHtml(p.created_at || '')}</span>
                <pre class="lore-pending-body">${escHtml((p.proposed_body || '').slice(0, 600))}${(p.proposed_body || '').length > 600 ? '…' : ''}</pre>
              </div>
              <div class="lore-pending-actions">
                <button type="button" class="btn-primary btn-sm lore-pend-accept">Replace</button>
                <button type="button" class="btn-secondary btn-sm lore-pend-append">Append</button>
                <button type="button" class="btn-secondary btn-sm lore-pend-skip">Skip</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
      els.pending.querySelectorAll('.lore-pending-item').forEach((row) => {
        const id = parseInt(row.dataset.pendingId, 10);
        row.querySelector('.lore-pend-accept')?.addEventListener('click', () => resolvePending(id, 'accept'));
        row.querySelector('.lore-pend-append')?.addEventListener('click', () => resolvePending(id, 'append'));
        row.querySelector('.lore-pend-skip')?.addEventListener('click', () => resolvePending(id, 'skip'));
      });
    } catch (err) {
      els.pending.hidden = true;
    }
  }

  async function resolvePending(pendingId, resolution) {
    try {
      const res = await apiWikiPendingResolve(pendingId, resolution);
      showToast(
        resolution === 'skip' ? 'Pending update skipped.' : `Pending update ${resolution}ed.`,
        'success',
      );
      await Promise.all([renderPending(), renderList(), renderGraph()]);
      if (res.article?.id) {
        await openArticle({ articleId: res.article.id });
      }
    } catch (err) {
      showToast(err.message || 'Resolve failed.', 'error');
    }
  }

  async function renderGraph() {
    const category = els.graphCat.value;
    const graph = await apiWikiGraph({ category });
    const nodes = graph.nodes || [];
    const links = graph.links || [];
    const width = 780;
    const height = 260;
    const nodePos = new Map();
    nodes.forEach((n, i) => {
      nodePos.set(n.slug, {
        ...seededPos(i, width, height),
        vx: 0,
        vy: 0,
        title: n.title,
        id: n.id,
        category: n.category,
      });
    });

    const edgePairs = links
      .map((l) => ({ a: nodePos.get(l.from_slug), b: nodePos.get(l.to_slug), w: Number(l.weight || 1) }))
      .filter((e) => e.a && e.b);

    for (let iter = 0; iter < 100; iter++) {
      const vals = Array.from(nodePos.values());
      for (let i = 0; i < vals.length; i++) {
        for (let j = i + 1; j < vals.length; j++) {
          const a = vals[i];
          const b = vals[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist2 = Math.max(20, dx * dx + dy * dy);
          const rep = 2200 / dist2;
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
        const pull = (dist - 90) * 0.0035 * Math.max(0.45, Math.min(2, w));
        a.vx += (dx / dist) * pull;
        a.vy += (dy / dist) * pull;
        b.vx -= (dx / dist) * pull;
        b.vy -= (dy / dist) * pull;
      });
      vals.forEach((p) => {
        p.vx *= 0.82;
        p.vy *= 0.82;
        p.x = Math.max(28, Math.min(width - 28, p.x + p.vx));
        p.y = Math.max(34, Math.min(height - 22, p.y + p.vy));
      });
    }

    const lines = links.map((l) => {
      const a = nodePos.get(l.from_slug);
      const b = nodePos.get(l.to_slug);
      if (!a || !b) return '';
      const sw = Math.max(1, Math.min(3.5, Number(l.weight || 1)));
      const stroke = Number(l.auto_generated) ? 'rgba(96,165,250,0.35)' : 'rgba(196,163,90,0.65)';
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${stroke}" stroke-width="${sw.toFixed(2)}" />`;
    }).join('');

    const circles = Array.from(nodePos.entries()).map(([slug, p]) => `
      <g class="lore-graph-node" data-article-id="${p.id || ''}" data-slug="${escHtml(slug)}" style="cursor:pointer;">
        <circle cx="${p.x}" cy="${p.y}" r="9" fill="#c4a35a"></circle>
        <title>${escHtml(p.title)}</title>
        <text x="${p.x + 11}" y="${p.y + 4}" fill="#ddd" font-size="11">${escHtml(p.title)}</text>
      </g>`).join('');

    els.graph.innerHTML = `<rect x="0" y="0" width="${width}" height="${height}" fill="transparent"></rect>
      ${lines}${circles}
      <text x="10" y="18" fill="#9ca3af" font-size="12">Pages: ${nodes.length} · Links: ${links.length}</text>`;

    els.graph.querySelectorAll('.lore-graph-node').forEach((g) => {
      g.addEventListener('click', () => {
        const id = parseInt(g.dataset.articleId || '0', 10);
        const slug = g.dataset.slug || '';
        openArticle({ articleId: id, slug });
      });
    });
  }

  async function savePage() {
    try {
      const payload = {
        id: currentId || undefined,
        title: els.title.value.trim(),
        slug: els.slug.value.trim(),
        body: els.body.value,
        category: els.category.value,
        tags: parseTagsInput(els.tags.value),
        aliases: parseTagsInput(els.aliases.value),
        player_visible: els.playerVisible.checked,
        is_locked: els.locked.checked,
        dm_notes: els.dmNotes.value,
      };
      const res = await apiWikiSave(payload);
      fillEditor(res.article, res.backlinks || [], res.outlinks || []);
      showToast('Lore page saved. Cross-links refreshed.', 'success');
      await Promise.all([renderList(), renderGraph(), renderPending()]);
    } catch (err) {
      showToast(err.message || 'Save failed.', 'error');
    }
  }

  container.querySelector('#lore-new').addEventListener('click', () => {
    clearEditor();
    els.title.focus();
  });

  container.querySelector('#lore-save').addEventListener('click', savePage);

  container.querySelector('#lore-delete').addEventListener('click', async () => {
    if (!currentId) return;
    if (!window.confirm('Delete this lore page and its links?')) return;
    try {
      await apiWikiDelete(currentId);
      clearEditor();
      showToast('Page deleted.', 'success');
      await Promise.all([renderList(), renderGraph(), renderPending()]);
    } catch (err) {
      showToast(err.message || 'Delete failed.', 'error');
    }
  });

  container.querySelector('#lore-refresh-links').addEventListener('click', async () => {
    try {
      const res = await apiWikiAutolinkRefresh();
      showToast(`Cross-links refreshed (${(res.links || []).length} edges).`, 'success');
      await renderGraph();
      if (currentId) await openArticle({ articleId: currentId });
    } catch (err) {
      showToast(err.message || 'Refresh failed.', 'error');
    }
  });

  container.querySelector('#lore-insert-link').addEventListener('click', () => {
    const titles = articlesCache.map((a) => a.title).filter(Boolean);
    let pick = titles[0] || 'Page Title';
    if (titles.length) {
      const choice = window.prompt(`Insert wikilink. Existing pages:\n${titles.slice(0, 20).join(', ')}\n\nTitle:`, pick);
      if (choice === null) return;
      pick = choice.trim() || pick;
    } else {
      const choice = window.prompt('Page title for [[wikilink]]:', pick);
      if (choice === null) return;
      pick = choice.trim() || pick;
    }
    const insert = `[[${pick}]]`;
    const ta = els.body;
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? start;
    ta.value = ta.value.slice(0, start) + insert + ta.value.slice(end);
    ta.focus();
    ta.selectionStart = ta.selectionEnd = start + insert.length;
    if (previewMode) renderPreview();
  });

  els.togglePreview.addEventListener('click', () => setPreviewMode(!previewMode));

  els.search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      renderList().catch((err) => showToast(err.message, 'error'));
    }, 220);
  });
  els.filterCat.addEventListener('change', () => {
    renderList().catch((err) => showToast(err.message, 'error'));
  });
  els.graphCat.addEventListener('change', () => {
    renderGraph().catch((err) => showToast(err.message, 'error'));
  });

  // Deep-link: /wiki?article=123 or ?slug=foo
  const boot = readQueryArticle();

  Promise.all([renderList(), renderGraph(), renderPending()])
    .then(async () => {
      if (boot.id || boot.slug) {
        await openArticle({ articleId: boot.id, slug: boot.slug });
      }
    })
    .catch((err) => {
      els.list.textContent = err.message || 'Failed to load lore.';
    });

  return () => {
    clearTimeout(searchTimer);
  };
}

/** Navigate to lore page for an entity (character sheet, etc.). */
export async function openLoreForEntity(entityType, entityId, title) {
  const { apiWikiEntityPage } = await import('../api/wiki.js');
  const res = await apiWikiEntityPage({ entityType, entityId, title });
  const id = res.article?.id;
  if (id) navigate(`wiki?article=${id}`);
  return res.article;
}
