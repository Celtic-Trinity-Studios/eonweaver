/**
 * Eon Weaver — Dashboard View
 * Campaign home: town cards (population, granary), one-month quick simulate, and shortcuts.
 */
import { getState, setState } from '../stores/appState.js';
import { apiGetTowns, apiCreateTown } from '../api/towns.js';
import { apiGetCalendar, calendarToString } from '../api/settings.js';
import { apiRunSimulation, apiApplySimulation, apiGetCampaignRules } from '../api/simulation.js';
import { navigate } from '../router.js';
import { confirmAiCost } from '../components/AiCostConfirm.js';
import { showModal, closeModal } from '../components/Modal.js';
import { showToast } from '../components/Toast.js';
import { apiHubOverview } from '../api/campaignHub.js';
import { apiTableStatus, apiPortalRead } from '../api/groundwork.js';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function asTowns(res) {
  return Array.isArray(res) ? res : (res?.towns || []);
}

export default function DashboardView(container) {
  const state = getState();
  const campaignName = state.currentCampaign?.name || 'Your campaign';

  container.innerHTML = `
    <div class="view-dashboard">
      <header class="view-header">
        <div class="view-header-left">
          <div>
            <h1>Campaign Dashboard</h1>
            <p class="view-subtitle" id="dash-campaign-line">${esc(campaignName)}</p>
          </div>
        </div>
        <div class="view-header-right dash-shortcuts">
          <button type="button" class="btn-secondary btn-sm" data-dash-route="sessions">Sessions</button>
          <button type="button" class="btn-secondary btn-sm" data-dash-route="settings">Settings</button>
          <button type="button" class="btn-secondary btn-sm" data-dash-route="world-simulate">World Simulate</button>
          <button type="button" class="btn-secondary btn-sm" data-dash-route="calendar">Calendar</button>
          <button type="button" class="btn-secondary btn-sm" data-dash-route="wiki">Lore Codex</button>
        </div>
      </header>

      <div class="dashboard-grid">
        <div class="dash-card dash-card-calendar">
          <h3>Calendar</h3>
          <div class="dash-calendar-display" id="dash-calendar">Loading...</div>
          <p class="dash-card-note">Advances when you simulate time.</p>
        </div>

        <div class="dash-card dash-card-stats">
          <h3>World Stats</h3>
          <div id="dash-world-stats" class="dash-stats-grid">Loading...</div>
        </div>

        <div class="dash-card" id="dash-tonight">
          <h3>Next session</h3>
          <div id="dash-tonight-body">Loading...</div>
          <div id="dash-table-status"></div>
        </div>
      </div>

      <section class="dash-card dash-towns-panel">
        <div class="dash-towns-head">
          <h3>Your Towns</h3>
          <button type="button" class="btn-primary btn-sm" id="dash-new-town-btn">+ New Town</button>
        </div>
        <div id="dash-town-list" class="dash-town-list">Loading...</div>
      </section>

      <div id="dash-quick-sim" class="dash-card dash-quick-sim" hidden></div>
    </div>
  `;

  container.querySelectorAll('[data-dash-route]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.dataset.dashRoute));
  });

  container.querySelector('#dash-new-town-btn')?.addEventListener('click', () => {
    openNewTownModal(container);
  });

  loadDashboardData(container);
}

function openNewTownModal(container) {
  const modal = showModal({
    title: 'New town',
    content: `
      <div class="form-group">
        <label for="dash-town-name">Name</label>
        <input type="text" id="dash-town-name" class="form-input" maxlength="120" placeholder="e.g. Firsthold" autofocus>
      </div>
      <div class="form-group">
        <label for="dash-town-sub">Subtitle</label>
        <input type="text" id="dash-town-sub" class="form-input" maxlength="200" placeholder="Region, realm, or epithet">
      </div>
      <div class="dash-modal-actions">
        <button type="button" class="btn-primary" id="dash-town-create">Create town</button>
      </div>
    `,
  });

  const nameInput = modal.el.querySelector('#dash-town-name');
  const subInput = modal.el.querySelector('#dash-town-sub');
  const createBtn = modal.el.querySelector('#dash-town-create');
  nameInput?.focus();

  const submit = async () => {
    const name = nameInput?.value.trim() || '';
    if (!name) {
      showToast('Enter a town name.', 'warning');
      nameInput?.focus();
      return;
    }
    createBtn.disabled = true;
    try {
      await apiCreateTown(name, subInput?.value.trim() || '');
      closeModal();
      showToast(`${name} created.`, 'success');
      await loadDashboardData(container);
    } catch (err) {
      createBtn.disabled = false;
      showToast(err.message || 'Could not create town.', 'error');
    }
  };

  createBtn?.addEventListener('click', submit);
  modal.el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  });
}

function openTown(townId) {
  setState({ currentTownId: townId });
  navigate(`town/${townId}`);
}

async function loadDashboardData(container) {
  if (!container.isConnected) return;
  const townListEl = container.querySelector('#dash-town-list');
  const statsEl = container.querySelector('#dash-world-stats');
  const calEl = container.querySelector('#dash-calendar');

  try {
    const [townsRes, calRes, hubRes, tableRes] = await Promise.all([
      apiGetTowns(),
      apiGetCalendar().catch(() => null),
      apiHubOverview().catch(() => null),
      apiTableStatus().catch(() => null),
    ]);
    if (!container.isConnected) return;

    const towns = asTowns(townsRes);
    setState({ towns });

    if (calRes?.calendar) {
      setState({ calendar: calRes.calendar });
      if (calEl) calEl.textContent = calendarToString(calRes.calendar);
    } else if (calEl && !getState().calendar) {
      calEl.textContent = 'No calendar yet';
    } else if (calEl && getState().calendar) {
      calEl.textContent = calendarToString(getState().calendar);
    }

    const living = towns.reduce((sum, t) => sum + (Number(t.alive_character_count) || 0), 0);
    const total = towns.reduce((sum, t) => sum + (Number(t.character_count) || 0), 0);
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="stat-item"><span class="stat-value">${towns.length}</span><span class="stat-label">Towns</span></div>
        <div class="stat-item"><span class="stat-value">${living}</span><span class="stat-label">Living</span></div>
        <div class="stat-item"><span class="stat-value">${total}</span><span class="stat-label">Roster</span></div>
      `;
    }

    renderTownList(container, towns);
    paintTonight(container, hubRes?.next_session || null, hubRes?.open_beats, !hubRes);
    paintTableStatus(container, tableRes);
  } catch (err) {
    console.error('Dashboard load error:', err);
    if (townListEl) {
      townListEl.innerHTML = `<p class="dash-load-error">Could not load towns. ${esc(err.message || '')}</p>`;
    }
    if (statsEl) statsEl.innerHTML = '<p class="muted">Unavailable</p>';
    paintTonight(container, null, null, true);
  }
}

function paintTonight(container, session, openBeats, failed = false) {
  const el = container.querySelector('#dash-tonight-body');
  if (!el) return;
  const beats = openBeats > 0
    ? `<p class="dash-card-note">${openBeats} open prep beat${openBeats === 1 ? '' : 's'}.</p>`
    : '';
  if (failed) {
    el.innerHTML = `<p class="muted">Session planner unavailable.</p>`;
    return;
  }
  if (!session) {
    el.innerHTML = `
      <p class="muted">No session planned.</p>
      <button type="button" class="btn-secondary btn-sm" id="dash-open-sessions">Open session planner</button>
    `;
  } else {
    const when = [session.real_date, session.in_game_label].filter(Boolean).join(' · ');
    const goals = session.goals ? `<p class="dash-quick-summary">${esc(String(session.goals).slice(0, 220))}</p>` : '';
    el.innerHTML = `
      <strong>${esc(session.title)}</strong>
      ${when ? `<p class="dash-card-note">${esc(when)}</p>` : ''}
      ${goals}
      ${beats}
      <button type="button" class="btn-secondary btn-sm" id="dash-open-sessions">Open session</button>
    `;
  }
  el.querySelector('#dash-open-sessions')?.addEventListener('click', () => navigate('sessions'));
}

function paintTableStatus(container, tableRes) {
  const el = container.querySelector('#dash-table-status');
  if (!el) return;
  if (!tableRes) {
    el.innerHTML = '';
    return;
  }
  const place = tableRes.party_location?.name ? `Party is based in ${tableRes.party_location.name}.` : '';
  const unread = Number(tableRes.unread) || 0;
  const items = (tableRes.activity || []).map((item) => `<li>${esc(item.summary)}</li>`).join('');
  el.innerHTML = `
    ${place ? `<p class="dash-card-note">${esc(place)}</p>` : ''}
    <p class="dash-card-note">${unread} unread player update${unread === 1 ? '' : 's'}.</p>
    ${items ? `<ul>${items}</ul>` : ''}
    ${unread ? '<button type="button" class="btn-secondary btn-sm" id="dash-mark-read">Mark read</button>' : ''}
  `;
  el.querySelector('#dash-mark-read')?.addEventListener('click', async () => {
    await apiPortalRead();
    el.querySelector('#dash-mark-read')?.remove();
  });
}

function renderTownList(container, towns) {
  const townListEl = container.querySelector('#dash-town-list');
  if (!townListEl) return;

  if (!towns.length) {
    townListEl.innerHTML = `
      <div class="dash-empty">
        <p>No towns yet. Create one, then open the roster or run a month of simulation from here.</p>
        <button type="button" class="btn-secondary btn-sm" id="dash-empty-settings">Set campaign tone in Settings</button>
      </div>
    `;
    townListEl.querySelector('#dash-empty-settings')?.addEventListener('click', () => navigate('settings'));
    return;
  }

  townListEl.innerHTML = towns.map((t) => {
    const alive = Number(t.alive_character_count) || 0;
    const total = Number(t.character_count) || 0;
    const buried = Math.max(0, total - alive);
    const food = t.macro_food_stores != null && t.macro_food_stores !== ''
      ? `<span class="dash-town-food" title="Macro granary index">🌾 ${Number(t.macro_food_stores).toFixed(0)}</span>`
      : '';
    const subtitle = t.subtitle ? `<span class="dash-town-sub">${esc(t.subtitle)}</span>` : '';
    return `
      <article class="dash-town-card">
        <button type="button" class="dash-town-open" data-action="open" data-town-id="${t.id}">
          <span class="dash-town-name">${esc(t.name)}</span>
          ${subtitle}
          <span class="dash-town-meta">
            <span>${alive} living${buried ? ` · ${buried} in the graveyard` : ''}</span>
            ${food}
          </span>
        </button>
        <div class="dash-town-actions">
          <button type="button" class="btn-secondary btn-sm" data-action="stats" data-town-id="${t.id}">Stats</button>
          <button type="button" class="btn-secondary btn-sm" data-action="sim" data-town-id="${t.id}">1 month</button>
        </div>
      </article>
    `;
  }).join('');

  townListEl.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const townId = parseInt(btn.dataset.townId, 10);
      const town = towns.find((t) => Number(t.id) === townId);
      if (!town) return;
      if (btn.dataset.action === 'stats') {
        setState({ currentTownId: townId });
        navigate(`townstats/${townId}`);
        return;
      }
      if (btn.dataset.action === 'sim') {
        quickSimulate(container, town);
        return;
      }
      openTown(townId);
    });
  });
}

async function quickSimulate(container, town) {
  const panel = container.querySelector('#dash-quick-sim');
  if (!panel) return;

  const pop = Math.max(1, Number(town.alive_character_count) || Number(town.character_count) || 50);
  const proceed = await confirmAiCost('simulation', {
    months: 1,
    population: pop,
    intakeCount: 0,
  });
  if (!proceed || !container.isConnected) return;

  panel.hidden = false;
  panel.innerHTML = `<h3>One month — ${esc(town.name)}</h3><p>Running simulation…</p>`;
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  let rules = '';
  try {
    const rulesRes = await apiGetCampaignRules();
    rules = rulesRes.rules_text || '';
  } catch { /* campaign rules are optional */ }

  try {
    const result = await apiRunSimulation(town.id, 1, rules, '', 0);
    if (!container.isConnected) return;
    const sim = result.simulation || {};
    const changes = sim.changes || {};
    const newChars = changes.new_characters?.length || 0;
    const deaths = changes.deaths?.length || 0;
    const events = sim.events?.length || 0;
    const summary = sim.summary || 'Simulation complete. Review before applying.';

    panel.innerHTML = `
      <h3>One month — ${esc(town.name)}</h3>
      <p class="dash-quick-summary">${esc(summary)}</p>
      <div class="dash-quick-stats">
        <span>New characters: ${newChars}</span>
        <span>Deaths: ${deaths}</span>
        <span>Events: ${events}</span>
      </div>
      <div class="dash-quick-actions">
        <button type="button" class="btn-primary" id="dash-sim-apply">Apply changes</button>
        <button type="button" class="btn-secondary" id="dash-sim-skip">Discard</button>
        <button type="button" class="btn-secondary" id="dash-sim-full">Open full simulation</button>
      </div>
    `;

    panel.querySelector('#dash-sim-skip')?.addEventListener('click', () => {
      panel.hidden = true;
      panel.innerHTML = '';
      showToast('Simulation discarded. Nothing was saved.', 'info');
    });
    panel.querySelector('#dash-sim-full')?.addEventListener('click', () => {
      setState({ currentTownId: town.id });
      navigate('simulation');
    });
    panel.querySelector('#dash-sim-apply')?.addEventListener('click', async () => {
      const applyBtn = panel.querySelector('#dash-sim-apply');
      if (applyBtn) {
        applyBtn.disabled = true;
        applyBtn.textContent = 'Applying…';
      }
      try {
        await apiApplySimulation(town.id, changes, sim.new_history_entry || null, 1, 0, {
          arrivalNamePool: result.arrival_name_pool,
        });
        showToast(`Applied one month in ${town.name}.`, 'success');
        panel.hidden = true;
        panel.innerHTML = '';
        const cal = getState().calendar;
        const calEl = container.querySelector('#dash-calendar');
        if (cal && calEl) calEl.textContent = calendarToString(cal);
        await loadDashboardData(container);
      } catch (err) {
        if (applyBtn) {
          applyBtn.disabled = false;
          applyBtn.textContent = 'Apply changes';
        }
        showToast(err.message || 'Apply failed.', 'error');
      }
    });
  } catch (err) {
    panel.innerHTML = `
      <h3>One month — ${esc(town.name)}</h3>
      <p class="dash-load-error">${esc(err.message || 'Simulation failed.')}</p>
      <button type="button" class="btn-secondary btn-sm" id="dash-sim-close">Close</button>
    `;
    panel.querySelector('#dash-sim-close')?.addEventListener('click', () => {
      panel.hidden = true;
      panel.innerHTML = '';
    });
  }
}
