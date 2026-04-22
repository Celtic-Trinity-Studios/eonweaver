/**
 * Eon Weaver — World Simulate View
 * Runs AI simulation across ALL towns in the campaign sequentially.
 * Includes inter-town movement for characters with sufficient residency.
 */
import { getState, setState } from '../stores/appState.js';
import { navigate } from '../router.js';
import { apiGetTowns } from '../api/towns.js';
import { apiGetCharacters, apiMoveCharacter } from '../api/characters.js';
import {
  apiRunSimulation,
  apiApplySimulation,
  apiGetCampaignRules,
  apiPlanSimulation,
} from '../api/simulation.js';
import { apiGetCalendar, calendarToString } from '../api/settings.js';
import { updateSidebarCalendar } from '../components/Sidebar.js';

const MIN_RESIDENCY_MONTHS = 6; // Must live in town this many months before eligible to move

export default function WorldSimulateView(container) {
  container.innerHTML = `
    <div class="view-simulation">
      <header class="view-header">
        <h1>🌍 World Simulate</h1>
        <div class="view-header-right">
          <button class="btn-secondary btn-sm" id="ws-back-btn">← Dashboard</button>
        </div>
      </header>

      <div class="dash-card" style="margin-bottom:1rem;padding:1rem;">
        <p style="color:var(--text-secondary);margin:0;">
          Run a simulation across <strong>every town</strong> in your campaign.
          Each town will be simulated sequentially, and characters may move between towns.
        </p>
      </div>

      <!-- Config -->
      <div class="sim-config" id="ws-config">
        <div class="sim-config-row">
          <div class="sim-field">
            <label>⏱️ Months to Simulate (per town)</label>
            <div class="sim-months-group" id="ws-months-group"></div>
          </div>
          <div class="sim-field">
            <label>📅 Days (Partial Month)</label>
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <input type="number" id="ws-days" class="form-input" min="0" max="30" value="0" style="width:70px;text-align:center;" title="Days to simulate within each month (0 = full month)">
              <span style="font-size:0.75rem;color:var(--text-muted)">0 = full month</span>
            </div>
          </div>
          <div class="sim-field">
            <label>👥 Intake (Force Arrivals per town)</label>
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <input type="number" id="ws-intake-count" class="form-input" min="0" max="50" value="0" style="width:70px;text-align:center;" title="Number of people to force into EACH town (0 = natural only)">
              <span style="font-size:0.75rem;color:var(--text-muted)">0 = natural only</span>
            </div>
          </div>
        </div>
        <div class="sim-field">
          <label>📝 World-wide Instructions</label>
          <textarea id="ws-instructions" class="form-input" rows="3"
            placeholder="Instructions that apply to ALL towns...&#10;e.g., 'A harsh winter hits the land' or 'Trade routes are disrupted'"></textarea>
          <small class="settings-hint" style="margin-top:0.25rem;display:block;">📜 Campaign rules are loaded automatically from <a href="/dev/settings" style="color:var(--accent)">⚙️ Settings</a>.</small>
        </div>
        <div class="sim-actions">
          <button class="btn-primary" id="ws-run-btn">🌍 Run World Simulation</button>
          <span class="sim-status" id="ws-status"></span>
        </div>
      </div>

      <!-- Town List -->
      <div id="ws-town-list" style="margin-top:1rem;"></div>

      <!-- Progress -->
      <div class="sim-progress" id="ws-progress" style="display:none;">
        <div class="sim-progress-bar">
          <div class="sim-progress-fill" id="ws-progress-fill"></div>
        </div>
        <p class="sim-progress-text" id="ws-progress-text">Preparing world simulation...</p>
      </div>

      <!-- Results -->
      <div id="ws-results" style="display:none;"></div>
    </div>
  `;

  let selectedMonths = 1;

  // Back button
  container.querySelector('#ws-back-btn').addEventListener('click', () => navigate('dashboard'));

  // Load towns and calendar
  loadWorldData(container);

  async function loadWorldData(cont) {
    try {
      const [townsRes, calRes, rulesRes] = await Promise.all([
        apiGetTowns(),
        apiGetCalendar().catch(() => null),
        apiGetCampaignRules().catch(() => ({})),
      ]);

      const towns = Array.isArray(townsRes) ? townsRes : (townsRes.towns || []);

      // Build months buttons (1-12)
      const monthsGroup = cont.querySelector('#ws-months-group');
      const cal = calRes?.calendar;
      const monthNames = cal?.months || [];
      let buttonsHtml = '';
      for (let i = 1; i <= 12; i++) {
        const tooltip = monthNames[i - 1] ? ` title="${monthNames[i - 1].name || monthNames[i - 1]}"` : '';
        buttonsHtml += `<button class="sim-month-btn${i === 1 ? ' active' : ''}" data-months="${i}"${tooltip}>${i}</button>`;
      }
      monthsGroup.innerHTML = buttonsHtml;

      monthsGroup.querySelectorAll('.sim-month-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          monthsGroup.querySelectorAll('.sim-month-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          selectedMonths = parseInt(btn.dataset.months) || 1;
        });
      });

      // Render town list
      const townListEl = cont.querySelector('#ws-town-list');
      if (towns.length === 0) {
        townListEl.innerHTML = `<div class="dash-card" style="text-align:center;padding:2rem;">
          <h3 style="color:var(--text-muted)">No Towns</h3>
          <p>Create towns from the <a href="/dev/dashboard">Dashboard</a> first.</p>
        </div>`;
        return;
      }

      // Fetch population counts
      const charPromises = towns.map(t => apiGetCharacters(t.id).catch(() => ({ characters: [] })));
      const charResults = await Promise.all(charPromises);

      townListEl.innerHTML = `
        <div class="dash-card" style="padding:1rem;">
          <h3 style="margin-bottom:0.75rem;">🏰 Towns to Simulate</h3>
          <div style="margin-bottom:0.5rem;">
            <label style="cursor:pointer;font-size:0.8rem;">
              <input type="checkbox" id="ws-select-all" checked> Select All
            </label>
          </div>
          <div class="ws-town-grid">
            ${towns.map((t, i) => {
        const chars = charResults[i]?.characters || [];
        const alive = chars.filter(c => (c.status || 'Alive') !== 'Deceased').length;
        return `
                <div class="ws-town-card" data-town-id="${t.id}">
                  <label class="ws-town-check">
                    <input type="checkbox" class="ws-town-cb" data-town-id="${t.id}" checked>
                    <div class="ws-town-info">
                      <span class="ws-town-name">${t.name}</span>
                      <span class="ws-town-pop">${alive} residents</span>
                    </div>
                  </label>
                  <div class="ws-town-status" id="ws-status-${t.id}"></div>
                  <textarea class="form-input ws-town-instructions" data-town-id="${t.id}" rows="2"
                    placeholder="Instructions for ${t.name} only..."
                    style="margin-top:0.4rem;font-size:0.75rem;resize:vertical;min-height:2.4rem;"></textarea>
                </div>
              `;
      }).join('')}
          </div>
        </div>
      `;

      // Select all toggle
      cont.querySelector('#ws-select-all')?.addEventListener('change', (e) => {
        cont.querySelectorAll('.ws-town-cb').forEach(cb => { cb.checked = e.target.checked; });
      });

      // Wire run button
      cont.querySelector('#ws-run-btn').addEventListener('click', () => {
        runWorldSimulation(cont, towns, rulesRes, charResults, calRes);
      });

    } catch (err) {
      cont.querySelector('#ws-town-list').innerHTML =
        `<div class="dash-card" style="padding:1rem;color:var(--error);">Error loading data: ${err.message}</div>`;
    }
  }

  async function runWorldSimulation(cont, allTowns, rules, charResults, calRes) {
    const selectedIds = new Set();
    cont.querySelectorAll('.ws-town-cb:checked').forEach(cb => {
      selectedIds.add(parseInt(cb.dataset.townId));
    });
    const towns = allTowns.filter(t => selectedIds.has(t.id));

    if (towns.length === 0) {
      alert('Select at least one town to simulate.');
      return;
    }

    const worldInstructions = cont.querySelector('#ws-instructions')?.value?.trim() || '';
    const intakeCount = Math.max(0, Math.min(50, parseInt(cont.querySelector('#ws-intake-count')?.value) || 0));
    const selectedDays = Math.max(0, Math.min(100, parseInt(cont.querySelector('#ws-days')?.value) || 0));

    // Collect per-town instructions
    const perTownInstructions = {};
    cont.querySelectorAll('.ws-town-instructions').forEach(ta => {
      const tid = parseInt(ta.dataset.townId);
      const val = ta.value.trim();
      if (val) perTownInstructions[tid] = val;
    });

    // Smart instruction routing: check if world-wide instructions mention
    // a specific town name — if so, only send them to that town
    const townNames = allTowns.map(t => t.name.toLowerCase());
    function getInstructionsForTown(town) {
      let parts = [];
      if (worldInstructions) {
        const lowerInstr = worldInstructions.toLowerCase();
        // Check if the instructions mention any town by name
        const mentionedTowns = allTowns.filter(t => lowerInstr.includes(t.name.toLowerCase()));
        if (mentionedTowns.length === 0) {
          // No town mentioned — apply to all (true world-wide)
          parts.push(worldInstructions);
        } else if (mentionedTowns.some(t => t.id === town.id)) {
          // This town IS mentioned — apply these instructions
          parts.push(worldInstructions);
        }
        // If other towns are mentioned but not this one — skip world instructions for this town
      }
      if (perTownInstructions[town.id]) {
        parts.push(perTownInstructions[town.id]);
      }
      return parts.join('\n\n');
    }

    // UI setup
    const runBtn = cont.querySelector('#ws-run-btn');
    const progressEl = cont.querySelector('#ws-progress');
    const progressFill = cont.querySelector('#ws-progress-fill');
    const progressText = cont.querySelector('#ws-progress-text');
    const resultsEl = cont.querySelector('#ws-results');

    runBtn.disabled = true;
    runBtn.textContent = '⏳ Simulating...';
    progressEl.style.display = '';
    resultsEl.style.display = 'none';
    resultsEl.innerHTML = '';

    // Create simulation log modal
    let logOverlay = document.createElement('div');
    logOverlay.className = 'sim-log-overlay';
    logOverlay.innerHTML = `
      <div class="sim-log-modal">
        <div class="sim-log-header">
          <h3>🌍 World Simulation Log</h3>
          <button class="sim-log-close" id="sim-log-close-btn" style="display:none;" title="Close">✕</button>
        </div>
        <div class="sim-log-body" id="sim-log-body"></div>
        <div class="sim-log-footer">
          <div class="sim-log-progress"><div class="sim-log-progress-fill" id="sim-log-fill" style="width:0%"></div></div>
          <span class="sim-log-percent" id="sim-log-pct">0%</span>
        </div>
      </div>
    `;
    document.body.appendChild(logOverlay);

    const logBody = document.getElementById('sim-log-body');
    const logFill = document.getElementById('sim-log-fill');
    const logPct = document.getElementById('sim-log-pct');
    const logCloseBtn = document.getElementById('sim-log-close-btn');

    function simLog(icon, html, cssClass = '') {
      const entry = document.createElement('div');
      entry.className = 'sim-log-entry' + (cssClass ? ` ${cssClass}` : '');
      entry.innerHTML = `<span class="sim-log-icon">${icon}</span><span class="sim-log-text">${html}</span>`;
      logBody.appendChild(entry);
      logBody.scrollTop = logBody.scrollHeight;
    }

    function updateLogProgress(pct) {
      logFill.style.width = `${pct}%`;
      logPct.textContent = `${Math.round(pct)}%`;
    }

    simLog('🚀', `Starting simulation: <strong>${towns.length} town${towns.length > 1 ? 's' : ''}</strong> × <strong>${selectedMonths} month${selectedMonths > 1 ? 's' : ''}</strong>`);


    const totalSteps = selectedMonths * towns.length + selectedMonths; // +1 movement pass per month
    let completed = 0;
    const allBirths = [];
    const allDeaths = [];
    const allArrivals = [];
    const allEvents = [];
    const movements = [];
    let totalAutoLevelups = 0;
    const allLevelups = [];

    // Per-town accumulator for status display
    const townTotals = {};
    towns.forEach(t => { townTotals[t.id] = { arrivals: 0, births: 0, deaths: 0 }; });

    // Per-town narrative accumulator
    const townNarratives = {};
    towns.forEach(t => { townNarratives[t.id] = []; });
    const townErrors = {};

    // Get calendar month names for display
    const cal = calRes?.calendar;
    const calMonthNames = cal?.month_names || [];
    const calCurrentMonth = (cal?.current_month || 1) - 1; // 0-indexed starting month

    // Phase 0: Run forced intake for each town (months=0 mode)
    if (intakeCount > 0) {
      for (const town of towns) {
        const statusEl = cont.querySelector(`#ws-status-${town.id}`);
        try {
          progressText.textContent = `Intake: Adding ${intakeCount} characters to ${town.name}...`;
          if (statusEl) statusEl.innerHTML = '<span style="color:var(--warning);">⏳ Intake...</span>';
          simLog('👥', `Adding <strong>${intakeCount}</strong> characters to <strong>${town.name}</strong>...`);

          const intakeResult = await apiRunSimulation(town.id, 0, rules, getInstructionsForTown(town), intakeCount);

          if (intakeResult.simulation) {
            const ch = intakeResult.simulation.changes || {};
            await apiApplySimulation(town.id, ch, null, 0);
            const arrivals = (ch.new_characters || []).map(a => ({ ...a, town: town.name, townId: town.id, month: 0 }));
            allArrivals.push(...arrivals);
            townTotals[town.id].arrivals += arrivals.length;
            if (statusEl) statusEl.innerHTML = `<span style="color:var(--success);">✅ +${arrivals.length} intake</span>`;
            simLog('✅', `<strong>${town.name}</strong>: +${arrivals.length} new residents`, 'sim-log-success');
          }
        } catch (err) {
          townErrors[town.id] = (townErrors[town.id] || '') + ` Intake: ${err.message}`;
          if (statusEl) statusEl.innerHTML = `<span style="color:var(--error);">❌ Intake failed</span>`;
          simLog('❌', `<strong>${town.name}</strong> intake failed: ${err.message}`, 'sim-log-error');
        }
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    // Phase 1: Planning — get AI roadmap for each town (only for multi-month)
    const townPlans = {};
    if (selectedMonths > 1) {
      for (const town of towns) {
        const statusEl = cont.querySelector(`#ws-status-${town.id}`);
        try {
          progressText.textContent = `Planning ${town.name} (${selectedMonths} months)...`;
          if (statusEl) statusEl.innerHTML = '<span style="color:var(--warning);">📋 Planning...</span>';
          simLog('📋', `Planning <strong>${town.name}</strong> (${selectedMonths} months)...`);

          const planResult = await apiPlanSimulation(town.id, selectedMonths, rules, getInstructionsForTown(town));
          if (planResult.plan) {
            townPlans[town.id] = planResult.plan;
            console.log(`[WorldSim] Plan for ${town.name}:`, JSON.stringify(planResult.plan).slice(0, 800));
            if (statusEl) statusEl.innerHTML = '<span style="color:var(--success);">📋 Planned</span>';
          }
        } catch (err) {
          console.warn(`[WorldSim] Planning failed for ${town.name}:`, err.message);
          // Planning failure is not critical — continue without plan
        }
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // Month-by-month: simulate ALL towns for month 1, then month 2, etc.
    for (let month = 1; month <= selectedMonths; month++) {

      // Simulate each town for this month
      for (const town of towns) {
        const statusEl = cont.querySelector(`#ws-status-${town.id}`);

        // Build month instructions with plan context
        let monthInstructions = getInstructionsForTown(town);

        // Inject the plan for this month if available
        const plan = townPlans[town.id];
        if (plan) {
          const monthPlan = (plan.plan || []).find(p => p.month === month);
          const arrivalDetails = (plan.arrival_details || []).filter(a => a.month === month);
          const deathDetails = (plan.death_details || []).filter(d => d.month === month);

          let planContext = `[SIMULATION PLAN for month ${month}/${selectedMonths}]\n`;
          if (plan.summary) planContext += `Overview: ${plan.summary}\n`;
          if (monthPlan) {
            planContext += `This month's plan: ${monthPlan.events || 'Normal activity'}\n`;
            if (monthPlan.arrivals > 0) planContext += `PLANNED ARRIVALS this month: ${monthPlan.arrivals} new character(s). You MUST generate ${monthPlan.arrivals} new_characters.\n`;
            if (monthPlan.deaths > 0) planContext += `PLANNED DEATHS this month: ${monthPlan.deaths}. You MUST add death(s) to the changes.\n`;
            if (monthPlan.births > 0) planContext += `PLANNED BIRTHS this month: ${monthPlan.births}.\n`;
          }
          if (arrivalDetails.length > 0) {
            planContext += `Arrival details: ${arrivalDetails.map(a => a.description).join('; ')}\n`;
          }
          if (deathDetails.length > 0) {
            planContext += `Death details: ${deathDetails.map(d => `${d.name}: ${d.reason}`).join('; ')}\n`;
          }
          planContext += `[END PLAN]\n\n`;
          monthInstructions = planContext + monthInstructions;
        }

        try {
          progressText.textContent = `Month ${month}/${selectedMonths} — Simulating ${town.name}...`;
          progressFill.style.width = `${(completed / totalSteps) * 100}%`;
          updateLogProgress((completed / totalSteps) * 100);
          if (statusEl) statusEl.innerHTML = `<span style="color:var(--warning);">⏳ Month ${month}...</span>`;
          simLog('⏳', `Month <strong>${month}/${selectedMonths}</strong> — Simulating <strong>${town.name}</strong>...`);

          const result = await apiRunSimulation(town.id, 1, rules, monthInstructions, 0, selectedDays);

          if (result.simulation) {
            // Debug: log the actual response structure
            console.log(`[WorldSim] ${town.name} Month ${month}:`, JSON.stringify(result.simulation).slice(0, 500));

            // The AI may return data under "changes" or at the top level
            const sim = result.simulation;
            const ch = sim.changes || {};

            // Check both paths for each data type
            const newChars = ch.new_characters || sim.new_characters || [];
            const deathsList = ch.deaths || sim.deaths || [];
            const birthsList = ch.births || sim.births || [];
            const eventsList = ch.events || sim.events || [];

            const applyMonths = selectedDays > 0 ? 0 : 1;
            const applyDays = selectedDays > 0 ? selectedDays : 0;
            await apiApplySimulation(town.id, ch, sim.new_history_entry || null, applyMonths, applyDays)
              .then(applyRes => {
                if (applyRes?.applied?.auto_levelups) {
                  totalAutoLevelups += applyRes.applied.auto_levelups;
                  townTotals[town.id].levelups = (townTotals[town.id].levelups || 0) + applyRes.applied.auto_levelups;
                }
                if (applyRes?.applied?.levelup_details?.length) {
                  allLevelups.push(...applyRes.applied.levelup_details.map(lu => ({ ...lu, town: town.name, townId: town.id, month })));
                }
                // Use server's actual death/arrival counts for accuracy
                if (applyRes?.applied) {
                  const actualDeaths = applyRes.applied.deaths || 0;
                  const actualArrivals = applyRes.applied.new_characters || 0;
                  // Override frontend counts with server truth
                  townTotals[town.id]._serverDeaths = (townTotals[town.id]._serverDeaths || 0) + actualDeaths;
                  townTotals[town.id]._serverArrivals = (townTotals[town.id]._serverArrivals || 0) + actualArrivals;
                  // Log successful death matches
                  if (applyRes.applied.death_details?.length) {
                    applyRes.applied.death_details.forEach(dd => {
                      simLog('💀', `<strong>${town.name}</strong>: ${dd.name} — ${dd.reason}`, 'sim-log-death');
                    });
                  }
                  // Log failed deaths
                  if (applyRes.applied.deaths_failed?.length) {
                    applyRes.applied.deaths_failed.forEach(f => {
                      simLog('⚠️', `<strong>${town.name}</strong>: Death not applied — ${f}`, 'sim-log-error');
                    });
                  }
                  // Log failed arrivals
                  if (applyRes.applied.arrivals_failed?.length) {
                    applyRes.applied.arrivals_failed.forEach(f => {
                      simLog('⚠️', `<strong>${town.name}</strong>: Arrival not applied — ${f}`, 'sim-log-error');
                    });
                  }
                }
                // Debug: log calendar advancement info
                if (applyRes?.debug_info) {
                  console.log(`[WorldSim] Apply debug for ${town.name}:`, JSON.stringify(applyRes.debug_info));
                }
                if (applyRes?.applied?.calendar) {
                  simLog('📅', `<strong>${town.name}</strong>: ${applyRes.applied.calendar}`);
                }
              });

            const births = birthsList.map(b => ({ ...b, town: town.name, townId: town.id, month }));
            const deaths = deathsList.map(d => ({ ...d, town: town.name, townId: town.id, month }));
            const arrivals = newChars.map(a => ({ ...a, town: town.name, townId: town.id, month }));
            const events = eventsList.map(e => ({ ...e, town: town.name, townId: town.id, month }));

            allBirths.push(...births);
            allDeaths.push(...deaths);
            allArrivals.push(...arrivals);
            allEvents.push(...events);

            townTotals[town.id].arrivals += arrivals.length;
            townTotals[town.id].births += births.length;
            townTotals[town.id].deaths += deaths.length;
            townNarratives[town.id].push(result.simulation.new_history_entry?.content || '');

            if (statusEl) {
              const t = townTotals[town.id];
              const lvlText = t.levelups ? ` ⬆${t.levelups}` : '';
              statusEl.innerHTML = `<span style="color:var(--success);">✅ ${month}/${selectedMonths}</span>
                <span style="font-size:0.7rem;color:var(--text-muted);margin-left:0.5rem;">
                  +${t.arrivals} 👤  ${t.births} 👶  ${t.deaths} 💀${lvlText}
                </span>`;
            }
          } else {
            if (statusEl) statusEl.innerHTML = `<span style="color:var(--error);">⚠️ Month ${month} no data</span>`;
            simLog('⚠️', `<strong>${town.name}</strong> month ${month}: No simulation data returned`);
          }
        } catch (err) {
          // Retry up to 2 times on ANY error with exponential backoff
          let retrySuccess = false;
          const maxRetries = 2;
          const retryDelays = [5000, 10000];
          for (let attempt = 1; attempt <= maxRetries && !retrySuccess; attempt++) {
            const delay = retryDelays[attempt - 1] || 10000;
            if (statusEl) statusEl.innerHTML = `<span style="color:var(--warning);">🔄 Retry ${attempt}/${maxRetries} M${month}...</span>`;
            simLog('🔄', `<strong>${town.name}</strong> M${month}: Retry ${attempt}/${maxRetries} after error: ${err.message.slice(0, 60)}...`);
            await new Promise(r => setTimeout(r, delay));
            try {
              const retry = await apiRunSimulation(town.id, 1, rules, monthInstructions, 0, selectedDays);
              if (retry.simulation) {
                const ch = retry.simulation.changes || {};
                const retryApplyMonths = selectedDays > 0 ? 0 : 1;
                const retryApplyDays = selectedDays > 0 ? selectedDays : 0;
                const retryApplyRes = await apiApplySimulation(town.id, ch, retry.simulation.new_history_entry || null, retryApplyMonths, retryApplyDays);
                const births = (ch.births || retry.simulation.births || []).map(b => ({ ...b, town: town.name, townId: town.id, month }));
                const deaths = (ch.deaths || retry.simulation.deaths || []).map(d => ({ ...d, town: town.name, townId: town.id, month }));
                const arrivals = (ch.new_characters || retry.simulation.new_characters || []).map(a => ({ ...a, town: town.name, townId: town.id, month }));
                const events = (ch.events || retry.simulation.events || []).map(e => ({ ...e, town: town.name, townId: town.id, month }));
                allBirths.push(...births); allDeaths.push(...deaths); allArrivals.push(...arrivals); allEvents.push(...events);
                townTotals[town.id].arrivals += arrivals.length;
                townTotals[town.id].births += births.length;
                townTotals[town.id].deaths += deaths.length;
                townNarratives[town.id].push(retry.simulation.new_history_entry?.content || '');
                if (retryApplyRes?.applied?.auto_levelups) {
                  totalAutoLevelups += retryApplyRes.applied.auto_levelups;
                  townTotals[town.id].levelups = (townTotals[town.id].levelups || 0) + retryApplyRes.applied.auto_levelups;
                }
                if (retryApplyRes?.applied?.levelup_details?.length) {
                  allLevelups.push(...retryApplyRes.applied.levelup_details.map(lu => ({ ...lu, town: town.name, townId: town.id, month })));
                }
                if (statusEl) { const t = townTotals[town.id]; const lvlText = t.levelups ? ` ⬆${t.levelups}` : ''; statusEl.innerHTML = `<span style="color:var(--success);">✅ ${month}/${selectedMonths}</span> <span style="font-size:0.7rem;color:var(--text-muted);margin-left:0.5rem;">+${t.arrivals} 👤  ${t.births} 👶  ${t.deaths} 💀${lvlText}</span>`; }
                simLog('✅', `<strong>${town.name}</strong> M${month}: Retry ${attempt} succeeded!`, 'sim-log-success');
                retrySuccess = true;
              }
            } catch (retryErr) {
              if (attempt === maxRetries) {
                townErrors[town.id] = (townErrors[town.id] || '') + ` Month ${month}: ${retryErr.message}`;
                if (statusEl) statusEl.innerHTML = `<span style="color:var(--error);">❌ M${month}: Failed after ${maxRetries} retries</span>`;
                simLog('❌', `<strong>${town.name}</strong> M${month}: Failed after ${maxRetries} retries — ${retryErr.message.slice(0, 60)}`, 'sim-log-error');
              }
            }
          }
          if (!retrySuccess && maxRetries === 0) {
            townErrors[town.id] = (townErrors[town.id] || '') + ` Month ${month}: ${err.message}`;
            if (statusEl) statusEl.innerHTML = `<span style="color:var(--error);">❌ M${month}: ${err.message.slice(0, 30)}</span>`;
            simLog('❌', `<strong>${town.name}</strong> M${month}: ${err.message.slice(0, 80)}`, 'sim-log-error');
          }
        }

        // Small delay between calls to avoid rate limiting
        await new Promise(r => setTimeout(r, 1500));

        completed++;
      }

      // Movement pass after each month (if multiple towns)
      progressText.textContent = `Month ${month}/${selectedMonths} — Checking movement...`;
      if (towns.length >= 2) {
        try {
          const freshCharResults = await Promise.all(
            towns.map(t => apiGetCharacters(t.id).catch(() => ({ characters: [] })))
          );

          for (let i = 0; i < towns.length; i++) {
            const town = towns[i];
            const livingChars = (freshCharResults[i]?.characters || [])
              .filter(c => (c.status || 'Alive') === 'Alive');

            // Only exclude key leadership roles from moving
            const excludeRoles = ['mayor', 'chieftain', 'chief', 'lord', 'lady', 'captain of the guard', 'town leader'];
            const chars = livingChars
              .filter(c => parseInt(c.months_in_town || 0) >= MIN_RESIDENCY_MONTHS)
              .filter(c => {
                const role = (c.role || '').toLowerCase().trim();
                return !excludeRoles.some(r => role.includes(r));
              });

            if (chars.length === 0) continue;

            // ~20% chance per eligible character, max 2 per town per month
            const movers = chars.filter(() => Math.random() < 0.20).slice(0, 2);

            for (const mover of movers) {
              const otherTowns = towns.filter(t => t.id !== town.id);
              const destTown = otherTowns[Math.floor(Math.random() * otherTowns.length)];

              try {
                await apiMoveCharacter(mover.id, town.id, destTown.id);
                movements.push({
                  name: mover.name, class: mover.class, level: mover.level,
                  fromTown: town.name, fromTownId: town.id,
                  toTown: destTown.name, toTownId: destTown.id,
                  monthsLived: parseInt(mover.months_in_town || 0), month
                });
                simLog('🚶', `<strong>${mover.name}</strong> moved from ${town.name} → ${destTown.name}`);
              } catch { /* skip failed moves */ }
            }
          }
        } catch { /* movement pass failed, not critical */ }
      }
      completed++;
    }

    // Build summaries from accumulated data
    const summaries = towns.map(town => {
      const t = townTotals[town.id];
      // Build per-month narrative entries
      const narrativeEntries = (townNarratives[town.id] || []).map((content, i) => ({
        month: i + 1,
        content: content || '',
      })).filter(e => e.content);
      const error = townErrors[town.id];
      return {
        town: town.name, townId: town.id,
        ok: !error,
        births: t.births, deaths: t.deaths,
        arrivals: t.arrivals, events: allEvents.filter(e => e.townId === town.id).length,
        narrativeEntries,
        error: error || '',
      };
    });

    progressFill.style.width = '100%';
    progressText.textContent = `✅ World simulation complete! (${towns.length} towns × ${selectedMonths} months)`;
    runBtn.disabled = false;
    runBtn.textContent = '🌍 Run World Simulation';

    // Final log entries
    updateLogProgress(100);
    // Compute server-truth totals
    let serverTotalArrivals = 0, serverTotalDeaths = 0;
    Object.values(townTotals).forEach(t => {
      serverTotalArrivals += (t._serverArrivals || 0);
      serverTotalDeaths += (t._serverDeaths || 0);
    });
    const totalA = serverTotalArrivals || allArrivals.length;
    const totalB = allBirths.length;
    const totalD = serverTotalDeaths || allDeaths.length;
    const totalE = allEvents.length;
    const totalM = movements.length;
    simLog('🏁', `<strong>Simulation complete!</strong> Arrivals: ${totalA} | Births: ${totalB} | Deaths: ${totalD} | Events: ${totalE} | Moves: ${totalM}`, 'sim-log-success');
    if (Object.keys(townErrors).length > 0) {
      simLog('⚠️', `${Object.keys(townErrors).length} town(s) had errors — check results below.`);
    }

    // Show the close button
    logCloseBtn.style.display = '';
    logCloseBtn.addEventListener('click', () => {
      logOverlay.remove();
    });
    // Also close on overlay click (outside modal)
    logOverlay.addEventListener('click', (e) => {
      if (e.target === logOverlay) logOverlay.remove();
    });

    // Refresh sidebar calendar after simulation
    try {
      const calRefresh = await apiGetCalendar();
      if (calRefresh?.calendar) {
        setState({ calendar: calRefresh.calendar });
        updateSidebarCalendar(calRefresh.calendar);
      }
    } catch (e) { /* non-fatal */ }

    // Render tabbed summary
    renderWorldResults(resultsEl, summaries, selectedMonths, allBirths, allDeaths, allArrivals, allEvents, movements, calMonthNames, calCurrentMonth, totalAutoLevelups, allLevelups);
  }


  function renderWorldResults(el, summaries, months, births, deaths, arrivals, events, movements, calMonthNames = [], calCurrentMonth = 0, autoLevelups = 0, levelups = []) {
    el.style.display = '';

    const success = summaries.filter(s => s.ok);
    const failed = summaries.filter(s => !s.ok);
    const totalBirths = births.length;
    const totalDeaths = deaths.length;
    const totalArrivals = arrivals.length;
    const totalEvents = events.length;

    el.innerHTML = `
      <div class="dash-card" style="padding:1.5rem;margin-top:1rem;">
        <h2 style="color:var(--accent);margin-bottom:1rem;">🌍 World Simulation Summary — ${months} Month${months > 1 ? 's' : ''}</h2>

        <div class="stats-cards" style="margin-bottom:1rem;">
          <div class="stat-card"><div class="stat-card-value">${success.length}</div><div class="stat-card-label">Towns</div></div>
          <div class="stat-card"><div class="stat-card-value">${totalArrivals}</div><div class="stat-card-label">Arrivals</div></div>
          <div class="stat-card"><div class="stat-card-value">${totalBirths}</div><div class="stat-card-label">Births</div></div>
          <div class="stat-card stat-card-muted"><div class="stat-card-value">${totalDeaths}</div><div class="stat-card-label">Deaths</div></div>
          <div class="stat-card"><div class="stat-card-value">${totalEvents}</div><div class="stat-card-label">Events</div></div>
          <div class="stat-card"><div class="stat-card-value">${movements.length}</div><div class="stat-card-label">Moves</div></div>
          ${autoLevelups > 0 ? `<div class="stat-card" style="border-color:var(--success);"><div class="stat-card-value" style="color:var(--success);">${autoLevelups}</div><div class="stat-card-label">⬆️ Level Ups</div></div>` : ''}
        </div>

        ${failed.length ? `
          <div style="margin-bottom:1rem;padding:0.75rem;background:rgba(224,85,85,0.1);border-radius:8px;">
            <strong style="color:var(--error);">⚠️ ${failed.length} town(s) failed:</strong>
            ${failed.map(f => `<div style="margin-top:0.25rem;font-size:0.8rem;">${f.town}: ${f.error}</div>`).join('')}
          </div>
        ` : ''}

        <!-- Tabs -->
        <div class="detail-tabs" id="ws-result-tabs">
          <button class="detail-tab active" data-tab="narratives">📖 Narratives</button>
          <button class="detail-tab" data-tab="arrivals">👤 Arrivals (${totalArrivals})</button>
          <button class="detail-tab" data-tab="births">👶 Births (${totalBirths})</button>
          <button class="detail-tab" data-tab="deaths">💀 Deaths (${totalDeaths})</button>
          <button class="detail-tab" data-tab="events">📜 Events (${totalEvents})</button>
          ${levelups.length ? `<button class="detail-tab" data-tab="levelups">⬆️ Level Ups (${levelups.length})</button>` : ''}
          <button class="detail-tab" data-tab="movement">🚶 Movement (${movements.length})</button>
        </div>

        <!-- Tab Content: Narratives -->
        <div class="detail-tab-content active" id="ws-tab-narratives">
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
            <label style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">MONTH</label>
            <select class="form-input" id="ws-narrative-month-filter" style="width:auto;min-width:120px;">
              <option value="all">All Months</option>
              ${Array.from({ length: months }, (_, i) => {
      const monthIdx = (calCurrentMonth + i) % (calMonthNames.length || 12);
      const name = calMonthNames[monthIdx] || `Month ${i + 1}`;
      const label = typeof name === 'object' ? name.name : name;
      return `<option value="${i + 1}">${label}</option>`;
    }).join('')}
            </select>
          </div>
          <div id="ws-narrative-list"></div>
        </div>

        <!-- Tab Content: Arrivals -->
        <div class="detail-tab-content" id="ws-tab-arrivals">
          ${arrivals.length ? `
            <table class="srd-table srd-table-sm" style="margin-top:0.5rem;">
              <thead><tr><th>Name</th><th>Race</th><th>Class</th><th>Town</th></tr></thead>
              <tbody>
                ${arrivals.map(a => `<tr>
                  <td style="font-weight:600;">${a.name || 'Unknown'}</td>
                  <td>${a.race || '—'}</td>
                  <td>${a.class || '—'}</td>
                  <td style="color:var(--accent);">${a.town}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          ` : '<p class="muted" style="padding:1rem;">No arrivals this period.</p>'}
        </div>

        <!-- Tab Content: Births -->
        <div class="detail-tab-content" id="ws-tab-births">
          ${births.length ? `
            <table class="srd-table srd-table-sm" style="margin-top:0.5rem;">
              <thead><tr><th>Name</th><th>Parents</th><th>Town</th></tr></thead>
              <tbody>
                ${births.map(b => `<tr>
                  <td style="font-weight:600;">${b.child_name || b.name || 'Unknown'}</td>
                  <td>${b.parents || b.parent_names || '—'}</td>
                  <td style="color:var(--accent);">${b.town}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          ` : '<p class="muted" style="padding:1rem;">No births this period.</p>'}
        </div>

        <!-- Tab Content: Deaths -->
        <div class="detail-tab-content" id="ws-tab-deaths">
          ${deaths.length ? `
            <table class="srd-table srd-table-sm" style="margin-top:0.5rem;">
              <thead><tr><th>Name</th><th>Cause</th><th>Town</th></tr></thead>
              <tbody>
                ${deaths.map(d => `<tr>
                  <td style="font-weight:600;">${d.name || 'Unknown'}</td>
                  <td>${d.cause || d.reason || '—'}</td>
                  <td style="color:var(--accent);">${d.town}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          ` : '<p class="muted" style="padding:1rem;">No deaths this period.</p>'}
        </div>

        <!-- Tab Content: Events -->
        <div class="detail-tab-content" id="ws-tab-events">
          ${events.length ? events.map(e => `
            <div class="ws-narrative-card">
              <div class="ws-narrative-header">
                <span style="font-weight:600;color:var(--text-primary);">${e.title || e.type || 'Event'}</span>
                <span class="ws-narrative-stats">${e.town}</span>
              </div>
              ${e.description ? `<div class="ws-narrative-body">${e.description}</div>` : ''}
            </div>
          `).join('') : '<p class="muted" style="padding:1rem;">No events this period.</p>'}
        </div>

        <!-- Tab Content: Level Ups -->
        ${levelups.length ? `
        <div class="detail-tab-content" id="ws-tab-levelups">
          <table class="srd-table srd-table-sm" style="margin-top:0.5rem;">
            <thead><tr><th>Name</th><th>Class</th><th>Level</th><th>XP</th><th>Town</th></tr></thead>
            <tbody>
              ${levelups.map(lu => `<tr>
                <td style="font-weight:600;">${lu.name}</td>
                <td>${lu.class || '—'}</td>
                <td><span style="color:var(--text-muted);">${lu.old_level}</span> → <span style="color:var(--success);font-weight:700;">${lu.new_level}</span></td>
                <td style="color:var(--text-secondary);">${lu.xp?.toLocaleString() || '—'}</td>
                <td style="color:var(--accent);">${lu.town}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <!-- Tab Content: Movement -->
        <div class="detail-tab-content" id="ws-tab-movement">
          ${movements.length ? `
            <table class="srd-table srd-table-sm" style="margin-top:0.5rem;">
              <thead><tr><th>Name</th><th>Class</th><th>From</th><th>To</th><th>Months Lived</th></tr></thead>
              <tbody>
                ${movements.map(m => `<tr>
                  <td style="font-weight:600;">${m.name}</td>
                  <td>${m.class} ${m.level}</td>
                  <td>${m.fromTown}</td>
                  <td style="color:var(--accent);">→ ${m.toTown}</td>
                  <td style="text-align:center;">${m.monthsLived}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          ` : `<p class="muted" style="padding:1rem;">No character movement this period. Characters must live in a town for at least ${MIN_RESIDENCY_MONTHS} months before they may relocate.</p>`}
        </div>
      </div>
    `;

    // Tab switching
    el.querySelectorAll('.detail-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        el.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
        el.querySelectorAll('.detail-tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        el.querySelector(`#ws-tab-${tab.dataset.tab}`)?.classList.add('active');
      });
    });

    // Narrative rendering with month filter
    const narrativeList = el.querySelector('#ws-narrative-list');
    const monthFilter = el.querySelector('#ws-narrative-month-filter');

    function renderNarratives() {
      const selMonth = monthFilter.value;

      if (!success.length) {
        narrativeList.innerHTML = '<p class="muted" style="padding:1rem;">No results.</p>';
        return;
      }

      let html = '';
      for (const s of success) {
        const entries = selMonth === 'all'
          ? s.narrativeEntries
          : s.narrativeEntries.filter(e => String(e.month) === selMonth);

        if (entries.length === 0) continue;

        for (const entry of entries) {
          const mIdx = (calCurrentMonth + entry.month - 1) % (calMonthNames.length || 12);
          const mName = calMonthNames[mIdx] || `Month ${entry.month}`;
          const mLabel = typeof mName === 'object' ? mName.name : mName;
          html += `
            <div class="ws-narrative-card">
              <div class="ws-narrative-header">
                <span class="ws-narrative-town" style="cursor:pointer;" data-town-id="${s.townId}">${s.town}</span>
                <span class="ws-narrative-stats">${mLabel}</span>
              </div>
              <div class="ws-narrative-body">${entry.content}</div>
            </div>
          `;
        }
      }

      narrativeList.innerHTML = html || '<p class="muted" style="padding:1rem;">No narratives for this month.</p>';

      // Wire town name clicks in the rendered narratives
      narrativeList.querySelectorAll('[data-town-id]').forEach(link => {
        link.addEventListener('click', () => {
          const townId = parseInt(link.dataset.townId);
          setState({ currentTownId: townId });
          navigate('town/' + townId);
        });
      });
    }

    // Initial render & wire filter
    renderNarratives();
    monthFilter.addEventListener('change', renderNarratives);

    // Click town name to navigate (for non-narrative tabs)
    el.querySelectorAll('[data-town-id]').forEach(link => {
      link.addEventListener('click', () => {
        const townId = parseInt(link.dataset.townId);
        setState({ currentTownId: townId });
        navigate('town/' + townId);
      });
    });
  }
}
