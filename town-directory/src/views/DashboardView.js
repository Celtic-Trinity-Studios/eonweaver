/**
 * Eon Weaver — Dashboard View
 * Campaign overview: list of towns, quick stats, recent activity.
 */
import { getState, setState } from '../stores/appState.js';
import { apiGetTowns } from '../api/towns.js';
import { apiGetCalendar, calendarToString } from '../api/settings.js';
import { apiRunSimulation, apiApplySimulation, apiGetCampaignRules } from '../api/simulation.js';
import { navigate } from '../router.js';
import { confirmAiCost } from '../components/AiCostConfirm.js';

export default function DashboardView(container) {
  const state = getState();

  container.innerHTML = `
    <div class="view-dashboard">
      <header class="view-header">
        <h1>Campaign Dashboard</h1>
        <p class="view-subtitle">Overview of your world</p>
      </header>

      <div class="dashboard-grid">
        <div class="dash-card dash-card-calendar">
          <h3>Calendar</h3>
          <div class="dash-calendar-display" id="dash-calendar">
            ${state.calendar ? calendarToString(state.calendar) : 'Loading...'}
          </div>
        </div>

        <div class="dash-card dash-card-towns">
          <h3>Your Towns</h3>
          <div id="dash-town-list" class="dash-town-list">Loading...</div>
          <button class="btn-primary btn-sm" id="dash-new-town-btn">+ New Town</button>
        </div>

        <div class="dash-card dash-card-stats">
          <h3>World Stats</h3>
          <div id="dash-world-stats" class="dash-stats-grid">Loading...</div>
        </div>
      </div>

      <!-- World Simulation Panel (hidden by default) -->
      <div id="world-sim-panel" class="dash-card" style="display:none;margin-top:1rem;">
        <h3>World Simulation</h3>
        <div id="world-sim-content"></div>
      </div>
    </div>
  `;

  // Load data
  loadDashboardData(container);

  // New town button
  container.querySelector('#dash-new-town-btn')?.addEventListener('click', () => {
    const name = prompt('Enter town name:');
    if (name) {
      import('../api/towns.js').then(({ apiCreateTown }) => {
        apiCreateTown(name, '').then(() => loadDashboardData(container));
      });
    }
  });
}

async function loadDashboardData(container) {
  try {
    const townsRes = await apiGetTowns();
    const towns = Array.isArray(townsRes) ? townsRes : (townsRes.towns || []);
    setState({ towns });

    // Render town list
    const townListEl = container.querySelector('#dash-town-list');
    if (townListEl) {
      if (towns.length === 0) {
        townListEl.innerHTML = '<p class="muted">No towns yet. Create one to get started!</p>';
      } else {
        townListEl.innerHTML = towns.map(t => `
          <div class="dash-town-item" data-town-id="${t.id}">
            <span class="dash-town-name">${t.name}</span>
            <span class="dash-town-sub">${t.subtitle || ''}</span>
          </div>
        `).join('');

        // Click to navigate to town
        townListEl.querySelectorAll('.dash-town-item').forEach(item => {
          item.addEventListener('click', () => {
            navigate(`town/${item.dataset.townId}`);
          });
        });
      }
    }

    // World stats
    const statsEl = container.querySelector('#dash-world-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="stat-item"><span class="stat-value">${towns.length}</span><span class="stat-label">Towns</span></div>
      `;
    }

    // Calendar
    try {
      const calRes = await apiGetCalendar();
      if (calRes.calendar) {
        setState({ calendar: calRes.calendar });
        const calEl = container.querySelector('#dash-calendar');
        if (calEl) calEl.textContent = calendarToString(calRes.calendar);
      }
    } catch (e) { /* ignore */ }
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

/* ---- World Simulation ---- */
async function startWorldSimulation(container) {
  const panel = container.querySelector('#world-sim-panel');
  const content = container.querySelector('#world-sim-content');
  if (!panel || !content) return;

  // Get towns
  const townsRes = await apiGetTowns();
  const towns = Array.isArray(townsRes) ? townsRes : (townsRes.towns || []);
  if (towns.length === 0) {
    alert('No towns to simulate.');
    return;
  }

  // Get campaign rules
  let rules = '';
  try {
    const rulesRes = await apiGetCampaignRules();
    rules = rulesRes.rules_text || '';
  } catch (e) { /* no rules */ }

  panel.style.display = '';
  content.innerHTML =
    '<div class="wsim-config">' +
    '  <div class="sim-field"><label>Months to Simulate</label>' +
    '    <div class="sim-months-group">' +
    '      <button class="sim-month-btn" data-months="1">1</button>' +
    '      <button class="sim-month-btn active" data-months="3">3</button>' +
    '      <button class="sim-month-btn" data-months="6">6</button>' +
    '      <button class="sim-month-btn" data-months="12">12</button>' +
    '      <input type="number" id="wsim-months-custom" class="form-input" min="1" max="24" placeholder="Custom" style="width:70px;">' +
    '    </div>' +
    '  </div>' +
    '  <div class="sim-field"><label>Instructions (applied to all towns)</label>' +
    '    <textarea id="wsim-instructions" class="form-input" rows="2" placeholder="Optional instructions for all towns..."></textarea>' +
    '  </div>' +
    '  <div style="margin-top:0.75rem;">' +
    '    <strong>Towns to simulate (' + towns.length + '):</strong> ' +
    towns.map(t => t.name).join(', ') +
    '  </div>' +
    '  <div style="margin-top:0.75rem;">' +
    '    <button class="btn-primary" id="wsim-start-btn">Start World Simulation</button>' +
    '    <button class="btn-secondary" id="wsim-cancel-btn" style="margin-left:0.5rem;">Cancel</button>' +
    '  </div>' +
    '</div>';

  // Month buttons
  let selectedMonths = 3;
  content.querySelectorAll('.sim-month-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      content.querySelectorAll('.sim-month-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedMonths = parseInt(btn.dataset.months);
      content.querySelector('#wsim-months-custom').value = '';
    });
  });
  content.querySelector('#wsim-months-custom')?.addEventListener('change', (e) => {
    const v = parseInt(e.target.value);
    if (v > 0) {
      selectedMonths = v;
      content.querySelectorAll('.sim-month-btn').forEach(b => b.classList.remove('active'));
    }
  });

  // Cancel
  content.querySelector('#wsim-cancel-btn')?.addEventListener('click', () => {
    panel.style.display = 'none';
  });

  // Start
  content.querySelector('#wsim-start-btn')?.addEventListener('click', async () => {
    const instructions = content.querySelector('#wsim-instructions')?.value || '';
    // Show AI cost confirmation
    const proceed = await confirmAiCost('worldSimulation', {
      months: selectedMonths,
      towns: towns.map(() => ({ population: 50 })),
      intakeCount: 0,
    });
    if (!proceed) return;
    await runWorldSim(content, towns, selectedMonths, rules, instructions);
  });
}

async function runWorldSim(content, towns, months, rules, instructions) {
  content.innerHTML =
    '<div class="wsim-progress">' +
    '  <div class="wsim-status-header">Simulating ' + towns.length + ' town' + (towns.length !== 1 ? 's' : '') + ' for ' + months + ' month' + (months !== 1 ? 's' : '') + '...</div>' +
    '  <div id="wsim-town-list" class="wsim-town-list"></div>' +
    '  <div id="wsim-current" class="wsim-current"></div>' +
    '</div>';

  const listEl = content.querySelector('#wsim-town-list');
  const currentEl = content.querySelector('#wsim-current');

  // Build town status list
  listEl.innerHTML = towns.map((t, i) =>
    '<div class="wsim-town-row" id="wsim-row-' + i + '">' +
    '  <span class="wsim-town-name">' + t.name + '</span>' +
    '  <span class="wsim-town-status" id="wsim-status-' + i + '">Pending</span>' +
    '</div>'
  ).join('');

  let applied = 0, skipped = 0, failed = 0;

  for (let i = 0; i < towns.length; i++) {
    const town = towns[i];
    const statusEl = content.querySelector('#wsim-status-' + i);
    const rowEl = content.querySelector('#wsim-row-' + i);
    if (rowEl) rowEl.classList.add('wsim-active');
    if (statusEl) statusEl.textContent = 'Simulating...';

    try {
      const result = await apiRunSimulation(town.id, months, rules, instructions, 0);
      const sim = result.simulation;
      const newChars = sim?.changes?.new_characters?.length || 0;
      const deaths = sim?.changes?.deaths?.length || 0;
      const events = sim?.events?.length || 0;

      if (statusEl) statusEl.textContent = 'Done - Review';
      if (rowEl) rowEl.classList.remove('wsim-active');

      // Show summary and ask apply/skip
      const action = await showTownResult(currentEl, town, sim, newChars, deaths, events, months);

      if (action === 'apply') {
        await apiApplySimulation(town.id, sim.changes, sim.new_history_entry, months);
        if (statusEl) { statusEl.textContent = 'Applied'; statusEl.classList.add('wsim-applied'); }
        applied++;
      } else {
        if (statusEl) { statusEl.textContent = 'Skipped'; statusEl.classList.add('wsim-skipped'); }
        skipped++;
      }
    } catch (err) {
      if (statusEl) { statusEl.textContent = 'Error: ' + err.message.substring(0, 50); statusEl.classList.add('wsim-error'); }
      if (rowEl) rowEl.classList.remove('wsim-active');
      failed++;
    }
  }

  // Final summary
  currentEl.innerHTML =
    '<div class="wsim-final">' +
    '  <h3>World Simulation Complete</h3>' +
    '  <p>' + applied + ' town' + (applied !== 1 ? 's' : '') + ' applied, ' +
    skipped + ' skipped, ' + failed + ' failed</p>' +
    '  <button class="btn-primary" id="wsim-done-btn">Done</button>' +
    '</div>';

  content.querySelector('#wsim-done-btn')?.addEventListener('click', () => {
    navigate('dashboard');
  });
}

function showTownResult(el, town, sim, newChars, deaths, events, months) {
  return new Promise((resolve) => {
    const summary = sim?.summary || 'Simulation complete.';
    el.innerHTML =
      '<div class="wsim-review">' +
      '  <h4>' + town.name + ' - Results</h4>' +
      '  <p class="wsim-summary">' + summary + '</p>' +
      '  <div class="wsim-result-stats">' +
      '    <span>New Characters: ' + newChars + '</span>' +
      '    <span>Deaths: ' + deaths + '</span>' +
      '    <span>Events: ' + events + '</span>' +
      '  </div>' +
      '  <div class="wsim-review-actions">' +
      '    <button class="btn-primary" id="wsim-apply-btn">Apply Changes</button>' +
      '    <button class="btn-secondary" id="wsim-skip-btn">Skip</button>' +
      '  </div>' +
      '</div>';

    el.querySelector('#wsim-apply-btn')?.addEventListener('click', () => resolve('apply'));
    el.querySelector('#wsim-skip-btn')?.addEventListener('click', () => resolve('skip'));
  });
}
