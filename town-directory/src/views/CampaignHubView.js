/**
 * Campaign Hub — sessions (plan + recap), prep timeline, roll tables, and workshop drafts.
 * Generators listed here save a draft. They do not call the model yet.
 */
import {
  apiHubBundle,
  apiHubSessionSave,
  apiHubSessionDelete,
  apiHubBeatSave,
  apiHubBeatDelete,
  apiHubTableSave,
  apiHubTableDelete,
  apiHubTableRoll,
  apiHubDraftSave,
  apiHubDraftDelete,
} from '../api/campaignHub.js';
import { apiGetTowns } from '../api/towns.js';
import { apiGetEncounters } from '../api/encounters.js';
import { apiFileRecap, apiQueueGeneration, apiSeedSessions, apiBlockSave, apiBlocks } from '../api/groundwork.js';
import { showToast } from '../components/Toast.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function parseIds(text) {
  return String(text || '').split(/[^0-9]+/).map((n) => parseInt(n, 10)).filter((n) => n > 0);
}

function checklistToText(items) {
  return (items || []).map((item) => `${item.done ? '[x] ' : '[ ] '}${item.text}`).join('\n');
}

function textToChecklist(text) {
  return String(text || '').split('\n').map((line) => line.trim()).filter(Boolean).map((line) => ({
    done: /^\[x\]/i.test(line),
    text: line.replace(/^\[[ xX]\]\s*/, ''),
  })).filter((item) => item.text);
}

const TABS = [
  { id: 'sessions', label: 'Sessions' },
  { id: 'timeline', label: 'Prep timeline' },
  { id: 'tables', label: 'Roll tables' },
  { id: 'workshop', label: 'Workshop drafts' },
];

export default function CampaignHubView(container) {
  const state = {
    tab: 'sessions',
    sessions: [],
    beats: [],
    tables: [],
    drafts: [],
    catalog: [],
    towns: [],
    encounters: [],
    kind: 'outline',
    selected: { sessions: 0, timeline: 0, tables: 0, workshop: 0 },
    roll: null,
  };

  container.innerHTML = `
    <div class="view-dashboard view-hub">
      <header class="view-header">
        <div>
          <h1>Campaign Hub</h1>
          <p class="view-subtitle">Plan the next session, keep a prep timeline, roll weighted tables, and park drafts for generators that are not wired to the model yet.</p>
        </div>
      </header>
      <div class="hub-tabs" role="tablist">
        ${TABS.map((tab) => `<button type="button" class="btn-secondary btn-sm hub-tab" data-tab="${tab.id}" role="tab">${tab.label}</button>`).join('')}
      </div>
      <div id="hub-panel">Loading…</div>
    </div>
  `;

  container.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.tab = btn.dataset.tab;
      state.roll = null;
      paintTabs();
      renderPanel();
    });
  });

  load();

  function paintTabs() {
    container.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.classList.toggle('is-selected', btn.dataset.tab === state.tab);
    });
  }

  async function load(keepSelection = false) {
    const panel = container.querySelector('#hub-panel');
    try {
      const [res, townsRes, encRes] = await Promise.all([
        apiHubBundle(),
        apiGetTowns().catch(() => ({ towns: [] })),
        apiGetEncounters().catch(() => ({ encounters: [] })),
      ]);
      if (!container.isConnected) return;
      state.towns = Array.isArray(townsRes) ? townsRes : (townsRes.towns || []);
      state.encounters = encRes.encounters || [];
      state.sessions = res.sessions || [];
      state.beats = res.beats || [];
      state.tables = res.tables || [];
      state.drafts = res.drafts || [];
      state.catalog = res.catalog || [];
      if (!state.catalog.find((item) => item.id === state.kind) && state.catalog[0]) {
        state.kind = state.catalog[0].id;
      }
      if (!keepSelection) {
        state.selected.sessions = state.sessions[0]?.id || 0;
        state.selected.timeline = state.beats[0]?.id || 0;
        state.selected.tables = state.tables[0]?.id || 0;
        const firstDraft = state.drafts.find((d) => d.kind === state.kind);
        state.selected.workshop = firstDraft?.id || 0;
      }
      paintTabs();
      renderPanel();
    } catch (err) {
      if (panel) panel.innerHTML = `<p class="dash-load-error">${esc(err.message || 'Could not load the hub.')}</p>`;
    }
  }

  function renderPanel() {
    const panel = container.querySelector('#hub-panel');
    if (!panel) return;
    if (state.tab === 'sessions') renderSessions(panel);
    else if (state.tab === 'timeline') renderTimeline(panel);
    else if (state.tab === 'tables') renderTables(panel);
    else renderWorkshop(panel);
    panel.querySelectorAll('form').forEach((form) => {
      form.addEventListener('submit', (e) => e.preventDefault());
    });
  }

  function renderSessions(panel) {
    const current = state.sessions.find((s) => s.id === state.selected.sessions) || blankSession();
    panel.innerHTML = `
      <div class="hub-split">
        <aside class="dash-card hub-list">
          <button type="button" class="btn-primary btn-sm" id="hub-new">+ Session</button>
          <div class="hub-list-items">
            ${state.sessions.map((s) => `
              <button type="button" class="hub-list-btn${s.id === current.id ? ' is-selected' : ''}" data-id="${s.id}">
                <strong>${esc(s.title)}</strong>
                <span>${esc(s.status)}${s.real_date ? ` · ${esc(s.real_date)}` : ''}${s.player_visible ? ' · players' : ''}</span>
              </button>
            `).join('') || '<p class="muted">No sessions yet.</p>'}
          </div>
        </aside>
        ${sessionForm(current, state.towns, state.encounters)}
      </div>
    `;
    panel.querySelector('#hub-new')?.addEventListener('click', () => {
      state.selected.sessions = 0;
      renderPanel();
    });
    panel.querySelectorAll('.hub-list-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selected.sessions = parseInt(btn.dataset.id, 10);
        renderPanel();
      });
    });
    panel.querySelector('#hub-session-save')?.addEventListener('click', () => saveSession(panel, current.id));
    panel.querySelector('#hub-file-recap')?.addEventListener('click', async () => {
      if (!current.id) return;
      try {
        const res = await apiFileRecap(current.id);
        showToast(res.ingest?.status === 'created' ? 'Recap filed into the lore codex.' : 'Recap sent to the lore queue.', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
    panel.querySelector('#hub-queue-recap')?.addEventListener('click', async () => {
      try {
        const res = await apiQueueGeneration({
          kind: 'recap',
          source_type: 'session',
          source_id: current.id,
          instruction: 'Summarize the prep notes into a player-facing recap.',
          source: panel.querySelector('#hub-prep')?.value || '',
        });
        showToast(`Generation job ${res.job_id} stored. The model is not called yet.`, 'info');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
    panel.querySelector('#hub-session-delete')?.addEventListener('click', async () => {
      if (!current.id) return;
      if (!confirm(`Delete “${current.title}”?`)) return;
      try {
        await apiHubSessionDelete(current.id);
        state.selected.sessions = 0;
        showToast('Session deleted.', 'success');
        await load(false);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  async function saveSession(panel, id) {
    const body = {
      id,
      title: panel.querySelector('#hub-title')?.value || '',
      status: panel.querySelector('#hub-status')?.value || 'planned',
      real_date: panel.querySelector('#hub-real-date')?.value || '',
      in_game_label: panel.querySelector('#hub-in-game')?.value || '',
      goals: panel.querySelector('#hub-goals')?.value || '',
      checklist: textToChecklist(panel.querySelector('#hub-checklist')?.value || ''),
      town_ids: [...panel.querySelectorAll('.hub-town:checked')].map((el) => parseInt(el.value, 10)),
      encounter_ids: [...panel.querySelectorAll('.hub-enc:checked')].map((el) => parseInt(el.value, 10)),
      prep_notes: panel.querySelector('#hub-prep')?.value || '',
      recap: panel.querySelector('#hub-recap')?.value || '',
      xp_notes: panel.querySelector('#hub-xp')?.value || '',
      loot_notes: panel.querySelector('#hub-loot')?.value || '',
      npc_outcomes: panel.querySelector('#hub-npc')?.value || '',
      player_visible: !!panel.querySelector('#hub-visible')?.checked,
    };
    try {
      const res = await apiHubSessionSave(body);
      state.selected.sessions = res.session?.id || 0;
      showToast('Session saved.', 'success');
      await load(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function renderTimeline(panel) {
    const current = state.beats.find((b) => b.id === state.selected.timeline) || blankBeat();
    panel.innerHTML = `
      <p class="hub-note">This timeline is prep: arcs, deadlines, and foreshadowing. Town history from simulation stays on the town.</p>
      <div class="hub-split">
        <aside class="dash-card hub-list">
          <button type="button" class="btn-primary btn-sm" id="hub-new">+ Beat</button>
          <div class="hub-list-items">
            ${state.beats.map((b) => `
              <button type="button" class="hub-list-btn${b.id === current.id ? ' is-selected' : ''}" data-id="${b.id}">
                <strong>${esc(b.title)}</strong>
                <span>${esc(b.kind)} · ${esc(b.status)}${b.when_label ? ` · ${esc(b.when_label)}` : ''}</span>
              </button>
            `).join('') || '<p class="muted">No beats yet.</p>'}
          </div>
        </aside>
        <form class="dash-card hub-editor" id="hub-form">
          <div class="form-group"><label>Title</label><input id="hub-title" class="form-input" value="${esc(current.title)}"></div>
          <div class="hub-form-row">
            <div class="form-group"><label>Kind</label>
              <select id="hub-kind" class="form-input">
                ${['arc', 'deadline', 'foreshadow', 'note'].map((k) => `<option value="${k}"${current.kind === k ? ' selected' : ''}>${k}</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label>Status</label>
              <select id="hub-status" class="form-input">
                <option value="open"${current.status === 'open' ? ' selected' : ''}>Open</option>
                <option value="done"${current.status === 'done' ? ' selected' : ''}>Done</option>
              </select>
            </div>
          </div>
          <div class="form-group"><label>When</label><input id="hub-when" class="form-input" value="${esc(current.when_label)}" placeholder="Before the gate falls, month of Highsummer…"></div>
          <div class="form-group"><label>Notes</label><textarea id="hub-body" class="form-input" rows="6">${esc(current.body)}</textarea></div>
          <div class="dash-quick-actions">
            <button type="button" class="btn-primary" id="hub-save">Save beat</button>
            ${current.id ? '<button type="button" class="btn-danger" id="hub-delete">Delete</button>' : ''}
          </div>
        </form>
      </div>
    `;
    panel.querySelector('#hub-new')?.addEventListener('click', () => {
      state.selected.timeline = 0;
      renderPanel();
    });
    panel.querySelectorAll('.hub-list-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selected.timeline = parseInt(btn.dataset.id, 10);
        renderPanel();
      });
    });
    panel.querySelector('#hub-save')?.addEventListener('click', async () => {
      try {
        const res = await apiHubBeatSave({
          id: current.id,
          title: panel.querySelector('#hub-title')?.value || '',
          kind: panel.querySelector('#hub-kind')?.value || 'note',
          status: panel.querySelector('#hub-status')?.value || 'open',
          when_label: panel.querySelector('#hub-when')?.value || '',
          body: panel.querySelector('#hub-body')?.value || '',
          sort_order: current.sort_order || 0,
        });
        state.selected.timeline = res.beat?.id || 0;
        showToast('Beat saved.', 'success');
        await load(true);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
    panel.querySelector('#hub-delete')?.addEventListener('click', async () => {
      if (!current.id || !confirm(`Delete “${current.title}”?`)) return;
      try {
        await apiHubBeatDelete(current.id);
        state.selected.timeline = 0;
        showToast('Beat deleted.', 'success');
        await load(false);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  function renderTables(panel) {
    const current = state.tables.find((t) => t.id === state.selected.tables) || { id: 0, title: '', notes: '', rows: [] };
    const rows = current.rows?.length ? current.rows : [{ label: '', weight: 1, detail: '' }];
    panel.innerHTML = `
      <div class="hub-split">
        <aside class="dash-card hub-list">
          <button type="button" class="btn-primary btn-sm" id="hub-new">+ Table</button>
          <div class="hub-list-items">
            ${state.tables.map((t) => `
              <button type="button" class="hub-list-btn${t.id === current.id ? ' is-selected' : ''}" data-id="${t.id}">
                <strong>${esc(t.title)}</strong>
                <span>${(t.rows || []).length} rows</span>
              </button>
            `).join('') || '<p class="muted">No tables yet.</p>'}
          </div>
        </aside>
        <form class="dash-card hub-editor" id="hub-form">
          <div class="form-group"><label>Title</label><input id="hub-title" class="form-input" value="${esc(current.title)}" placeholder="Rumors, encounters, loot…"></div>
          <div class="form-group"><label>Notes</label><input id="hub-notes" class="form-input" value="${esc(current.notes || '')}"></div>
          <div id="hub-rows">
            ${rows.map((row) => rowFields(row)).join('')}
          </div>
          <button type="button" class="btn-secondary btn-sm" id="hub-add-row">+ Row</button>
          <div class="dash-quick-actions">
            <button type="button" class="btn-primary" id="hub-save">Save table</button>
            ${current.id ? '<button type="button" class="btn-secondary" id="hub-roll">Roll</button>' : ''}
            ${current.id ? '<button type="button" class="btn-danger" id="hub-delete">Delete</button>' : ''}
          </div>
          <div id="hub-roll-result">${state.roll && state.roll.table_id === current.id ? rollHtml(state.roll) : ''}</div>
        </form>
      </div>
    `;
    const rowsEl = panel.querySelector('#hub-rows');
    panel.querySelector('#hub-add-row')?.addEventListener('click', () => {
      rowsEl.insertAdjacentHTML('beforeend', rowFields({ label: '', weight: 1, detail: '' }));
      bindRowRemoves(rowsEl);
    });
    bindRowRemoves(rowsEl);
    panel.querySelector('#hub-new')?.addEventListener('click', () => {
      state.selected.tables = 0;
      state.roll = null;
      renderPanel();
    });
    panel.querySelectorAll('.hub-list-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selected.tables = parseInt(btn.dataset.id, 10);
        state.roll = null;
        renderPanel();
      });
    });
    panel.querySelector('#hub-save')?.addEventListener('click', async () => {
      const collected = [...panel.querySelectorAll('[data-row]')].map((row) => ({
        label: row.querySelector('.hub-row-label')?.value || '',
        weight: parseInt(row.querySelector('.hub-row-weight')?.value || '1', 10) || 0,
        detail: row.querySelector('.hub-row-detail')?.value || '',
      })).filter((row) => row.label.trim());
      try {
        const res = await apiHubTableSave({
          id: current.id,
          title: panel.querySelector('#hub-title')?.value || '',
          notes: panel.querySelector('#hub-notes')?.value || '',
          rows: collected,
        });
        state.selected.tables = res.table?.id || 0;
        showToast('Table saved.', 'success');
        await load(true);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
    panel.querySelector('#hub-roll')?.addEventListener('click', async () => {
      if (!current.id) return;
      try {
        const res = await apiHubTableRoll(current.id);
        state.roll = res.result;
        const slot = panel.querySelector('#hub-roll-result');
        if (slot) slot.innerHTML = rollHtml(res.result);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
    panel.querySelector('#hub-delete')?.addEventListener('click', async () => {
      if (!current.id || !confirm(`Delete “${current.title}”?`)) return;
      try {
        await apiHubTableDelete(current.id);
        state.selected.tables = 0;
        state.roll = null;
        showToast('Table deleted.', 'success');
        await load(false);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  function renderWorkshop(panel) {
    const catalog = state.catalog.length ? state.catalog : [{ id: 'outline', label: 'Campaign outline', track: 'CM-04', blurb: '' }];
    const meta = catalog.find((item) => item.id === state.kind) || catalog[0];
    const visible = state.drafts.filter((d) => d.kind === meta.id);
    const current = visible.find((d) => d.id === state.selected.workshop) || { id: 0, kind: meta.id, title: '', prompt: '', body: '', status: 'draft' };
    panel.innerHTML = `
      <p class="hub-note">${esc(meta.blurb || '')} <span class="muted">${esc(meta.track || '')}</span></p>
      <div class="hub-kind-row">
        ${catalog.map((item) => `
          <button type="button" class="btn-secondary btn-sm hub-kind${item.id === meta.id ? ' is-selected' : ''}" data-kind="${esc(item.id)}">${esc(item.label)}</button>
        `).join('')}
      </div>
      <div class="hub-split">
        <aside class="dash-card hub-list">
          <button type="button" class="btn-primary btn-sm" id="hub-new">+ Draft</button>
          <div class="hub-list-items">
            ${visible.map((d) => `
              <button type="button" class="hub-list-btn${d.id === current.id ? ' is-selected' : ''}" data-id="${d.id}">
                <strong>${esc(d.title)}</strong>
                <span>${esc(d.status)}</span>
              </button>
            `).join('') || '<p class="muted">No drafts for this tool.</p>'}
          </div>
        </aside>
        <form class="dash-card hub-editor">
          <div class="form-group"><label>Title</label><input id="hub-title" class="form-input" value="${esc(current.title)}"></div>
          <div class="form-group"><label>Status</label>
            <select id="hub-status" class="form-input">
              <option value="draft"${current.status !== 'canon' ? ' selected' : ''}>Draft</option>
              <option value="canon"${current.status === 'canon' ? ' selected' : ''}>Canon (kept)</option>
            </select>
          </div>
          <div class="form-group"><label>Seed notes</label><textarea id="hub-prompt" class="form-input" rows="3" placeholder="What you would hand an AI generator later.">${esc(current.prompt)}</textarea></div>
          <div class="form-group"><label>Draft</label><textarea id="hub-body" class="form-input" rows="10">${esc(current.body)}</textarea></div>
          <div class="dash-quick-actions">
            <button type="button" class="btn-primary" id="hub-save">Save draft</button>
            ${current.id && meta.id === 'outline' ? '<button type="button" class="btn-secondary" id="hub-seed">Create sessions from headings</button>' : ''}
            ${current.id ? '<button type="button" class="btn-secondary" id="hub-queue">Queue generation</button>' : ''}
            ${current.id ? '<button type="button" class="btn-secondary" id="hub-block">Add a block</button>' : ''}
            ${current.id ? '<button type="button" class="btn-danger" id="hub-delete">Delete</button>' : ''}
            <div id="hub-blocks"></div>
          </div>
        </form>
      </div>
    `;
    panel.querySelectorAll('[data-kind]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.kind = btn.dataset.kind;
        const next = state.drafts.find((d) => d.kind === state.kind);
        state.selected.workshop = next?.id || 0;
        renderPanel();
      });
    });
    panel.querySelector('#hub-new')?.addEventListener('click', () => {
      state.selected.workshop = 0;
      renderPanel();
    });
    panel.querySelectorAll('.hub-list-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selected.workshop = parseInt(btn.dataset.id, 10);
        renderPanel();
      });
    });
    panel.querySelector('#hub-save')?.addEventListener('click', async () => {
      try {
        const res = await apiHubDraftSave({
          id: current.id,
          kind: meta.id,
          title: panel.querySelector('#hub-title')?.value || '',
          status: panel.querySelector('#hub-status')?.value || 'draft',
          prompt: panel.querySelector('#hub-prompt')?.value || '',
          body: panel.querySelector('#hub-body')?.value || '',
        });
        state.selected.workshop = res.draft?.id || 0;
        state.kind = res.draft?.kind || state.kind;
        showToast('Draft saved.', 'success');
        await load(true);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
    if (current.id) {
      apiBlocks('draft', current.id).then((res) => {
        const slot = panel.querySelector('#hub-blocks');
        if (!slot) return;
        const blocks = res.blocks || [];
        slot.innerHTML = blocks.length ? `<ul>${blocks.map((b) => `<li>${esc(b.block_type)} · ${esc(b.title || 'Untitled')}</li>`).join('')}</ul>` : '';
      }).catch(() => {});
    }
    panel.querySelector('#hub-seed')?.addEventListener('click', async () => {
      try {
        const res = await apiSeedSessions(current.id);
        showToast(`Created ${res.sessions?.length || 0} sessions from headings.`, 'success');
        state.tab = 'sessions';
        await load(false);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
    panel.querySelector('#hub-queue')?.addEventListener('click', async () => {
      try {
        const res = await apiQueueGeneration({
          kind: meta.id,
          source_type: 'draft',
          source_id: current.id,
          instruction: panel.querySelector('#hub-prompt')?.value || '',
          source: panel.querySelector('#hub-body')?.value || '',
        });
        showToast(`Generation job ${res.job_id} stored. The model is not called yet.`, 'info');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
    panel.querySelector('#hub-block')?.addEventListener('click', async () => {
      try {
        const saved = await apiBlockSave({
          owner_type: 'draft',
          owner_id: current.id,
          block_type: 'callout',
          title: 'Callout',
          body: panel.querySelector('#hub-body')?.value || '',
        });
        await apiQueueGeneration({
          kind: 'block',
          source_type: 'block',
          source_id: saved.id,
          instruction: 'Regenerate this block only.',
          source: panel.querySelector('#hub-body')?.value || '',
        });
        showToast(`Block ${saved.id} saved and a regenerate job was queued. The model is not called yet.`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
    panel.querySelector('#hub-delete')?.addEventListener('click', async () => {
      if (!current.id || !confirm(`Delete “${current.title}”?`)) return;
      try {
        await apiHubDraftDelete(current.id);
        state.selected.workshop = 0;
        showToast('Draft deleted.', 'success');
        await load(false);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
}

function blankSession() {
  return {
    id: 0, title: '', status: 'planned', real_date: '', in_game_label: '', goals: '',
    checklist: [], town_ids: [], encounter_ids: [], prep_notes: '', recap: '',
    xp_notes: '', loot_notes: '', npc_outcomes: '', player_visible: false,
  };
}

function blankBeat() {
  return { id: 0, title: '', when_label: '', kind: 'note', body: '', status: 'open', sort_order: 0 };
}

function sessionForm(current, towns = [], encounters = []) {
  return `
    <form class="dash-card hub-editor">
      <div class="form-group"><label>Title</label><input id="hub-title" class="form-input" value="${esc(current.title)}" placeholder="The gate at dusk"></div>
      <div class="hub-form-row">
        <div class="form-group"><label>Status</label>
          <select id="hub-status" class="form-input">
            ${['planned', 'ran', 'archived'].map((s) => `<option value="${s}"${current.status === s ? ' selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Real-world date</label><input id="hub-real-date" class="form-input" type="date" value="${esc(current.real_date)}"></div>
        <div class="form-group"><label>In-game date</label><input id="hub-in-game" class="form-input" value="${esc(current.in_game_label)}" placeholder="12 Highsummer, 412"></div>
      </div>
      <div class="form-group"><label>Goals</label><textarea id="hub-goals" class="form-input" rows="3">${esc(current.goals)}</textarea></div>
      <div class="form-group"><label>Prep checklist</label><textarea id="hub-checklist" class="form-input" rows="4" placeholder="[ ] Maps printed&#10;[x] Recap sent">${esc(checklistToText(current.checklist))}</textarea></div>
      <div class="form-group"><label>Towns</label><div class="hub-checks">${(towns || []).map((t) => `<label class="hub-check"><input type="checkbox" class="hub-town" value="${t.id}"${(current.town_ids || []).includes(Number(t.id)) ? ' checked' : ''}> ${esc(t.name)}</label>`).join('') || '<span class="muted">No towns yet.</span>'}</div></div>
      <div class="form-group"><label>Encounters</label><div class="hub-checks">${(encounters || []).map((enc) => `<label class="hub-check"><input type="checkbox" class="hub-enc" value="${enc.id}"${(current.encounter_ids || []).includes(Number(enc.id)) ? ' checked' : ''}> ${esc(enc.name)}</label>`).join('') || '<span class="muted">No encounters yet.</span>'}</div></div>
      <div class="form-group"><label>Prep notes (DM only)</label><textarea id="hub-prep" class="form-input" rows="3">${esc(current.prep_notes)}</textarea></div>
      <div class="form-group"><label>Recap</label><textarea id="hub-recap" class="form-input" rows="4" placeholder="What actually happened. Players see this only if the session is visible.">${esc(current.recap)}</textarea></div>
      <div class="hub-form-row">
        <div class="form-group"><label>XP</label><textarea id="hub-xp" class="form-input" rows="2">${esc(current.xp_notes)}</textarea></div>
        <div class="form-group"><label>Loot</label><textarea id="hub-loot" class="form-input" rows="2">${esc(current.loot_notes)}</textarea></div>
      </div>
      <div class="form-group"><label>NPC outcomes</label><textarea id="hub-npc" class="form-input" rows="2">${esc(current.npc_outcomes)}</textarea></div>
      <label class="hub-check"><input type="checkbox" id="hub-visible"${current.player_visible ? ' checked' : ''}> Player visible (title, goals, and recap on My tables)</label>
      <div class="dash-quick-actions">
        <button type="button" class="btn-primary" id="hub-session-save">Save session</button>
        ${current.id ? '<button type="button" class="btn-secondary" id="hub-file-recap" title="Save the session first so the recap is stored">File recap into lore</button>' : ''}
        ${current.id ? '<button type="button" class="btn-secondary" id="hub-queue-recap">Queue recap summary</button>' : ''}
        ${current.id ? '<button type="button" class="btn-danger" id="hub-session-delete">Delete</button>' : ''}
      </div>
    </form>
  `;
}

function rowFields(row) {
  return `
    <div class="hub-table-row" data-row>
      <input class="form-input hub-row-label" value="${esc(row.label)}" placeholder="Result">
      <input class="form-input hub-row-weight" type="number" min="0" max="1000" value="${esc(row.weight ?? 1)}" title="Weight">
      <input class="form-input hub-row-detail" value="${esc(row.detail || '')}" placeholder="Detail">
      <button type="button" class="btn-secondary btn-sm" data-remove-row>Remove</button>
    </div>
  `;
}

function bindRowRemoves(rowsEl) {
  rowsEl.querySelectorAll('[data-remove-row]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const rows = rowsEl.querySelectorAll('[data-row]');
      if (rows.length <= 1) {
        const only = rows[0];
        only.querySelector('.hub-row-label').value = '';
        only.querySelector('.hub-row-detail').value = '';
        only.querySelector('.hub-row-weight').value = '1';
        return;
      }
      btn.closest('[data-row]')?.remove();
    });
  });
}

function rollHtml(result) {
  if (!result?.row) return '';
  return `
    <div class="hub-roll">
      <strong>${esc(result.row.label)}</strong>
      <span class="muted">roll ${esc(result.roll)} of ${esc(result.total_weight)}</span>
      ${result.row.detail ? `<p>${esc(result.row.detail)}</p>` : ''}
    </div>
  `;
}
