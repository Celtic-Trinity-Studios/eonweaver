/**
 * Eon Weaver — Simulation View
 * Full simulation UI: configure months, rules, instructions, and run AI simulation.
 * Shows progress, preview of changes, and allows apply/reject.
 */
import { getState, setState } from '../stores/appState.js';
import { navigate } from '../router.js';
import { apiGetCharacters, normalizeCharacter } from '../api/characters.js';
import { apiGetTowns, apiGetTownMeta } from '../api/towns.js';
import {
  apiRunSimulation,
  apiApplySimulation,
  apiGetCampaignRules,
  apiDebugLlm,
} from '../api/simulation.js';
import { apiGetCalendar } from '../api/settings.js';

export default function SimulationView(container) {
  const state = getState();

  if (!state.currentTownId) {
    container.innerHTML = `
      <div class="view-simulation">
        <header class="view-header"><h1>⏩ AI Simulation</h1></header>
        <div class="dash-card" style="margin-top:1rem; text-align:center; padding:2rem;">
          <h2 style="color:var(--text-muted)">🏰 No Town Selected</h2>
          <p>Select a town from the <a href="/dev/dashboard">Dashboard</a> first.</p>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="view-simulation">
      <header class="view-header">
        <h1>⏩ AI Simulation</h1>
        <button class="btn-secondary btn-sm" id="sim-back-btn">← Back to Town</button>
      </header>

      <div class="sim-town-info" id="sim-town-info">
        <span class="sim-town-name">Loading...</span>
      </div>

      <!-- Config Panel -->
      <div class="sim-config" id="sim-config">
        <div class="sim-config-row">
          <div class="sim-field">
            <label>⏱️ Months to Simulate</label>
            <div class="sim-months-group" id="sim-months-group">
              <span style="color:var(--text-muted);font-size:0.8rem;">Loading...</span>
            </div>
          </div>
          <div class="sim-field">
            <label>👥 Intake (Force Arrivals)</label>
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <input type="number" id="sim-intake-count" class="form-input" min="0" max="50" value="0" style="width:70px;text-align:center;" title="Number of people to force move in (0 = natural only)">
              <span style="font-size:0.75rem;color:var(--text-muted)">0 = natural arrivals only</span>
            </div>
          </div>
        </div>



        <div class="sim-field">
          <label>📝 Additional Instructions</label>
          <textarea id="sim-instructions" class="form-input" rows="3"
            placeholder="Any specific instructions for this simulation...&#10;e.g., 'A traveling merchant caravan arrives' or 'Keep deaths low'"></textarea>
          <small class="settings-hint" style="margin-top:0.25rem;display:block;">📜 Campaign description & house rules are loaded automatically from <a href="/dev/settings" style="color:var(--accent)">⚙️ Settings</a>.</small>
        </div>

        <div class="sim-actions">
          <button class="btn-primary" id="sim-run-btn">🎲 Run Simulation</button>
          <button class="btn-secondary btn-sm" id="sim-debug-btn">🔧 Debug LLM</button>
          <span class="sim-status" id="sim-status"></span>
        </div>
      </div>

      <!-- Progress -->
      <div class="sim-progress" id="sim-progress" style="display:none;">
        <div class="sim-progress-bar">
          <div class="sim-progress-fill" id="sim-progress-fill"></div>
        </div>
        <p class="sim-progress-text" id="sim-progress-text">Generating simulation...</p>
      </div>

      <!-- Results -->
      <div class="sim-results" id="sim-results" style="display:none;"></div>

      <!-- Debug Log -->
      <div class="sim-debug-log" id="sim-debug-log">
        <h3>📋 Debug Log <button class="btn-sm btn-secondary" id="sim-clear-log" style="margin-left:0.5rem;">Clear</button></h3>
        <div class="sim-log-entries" id="sim-log-entries"></div>
      </div>
    </div>
  `;

  let selectedMonths = 1;
  let simResult = null;

  // Debug log helper
  function log(msg, type = 'info') {
    const logEl = container.querySelector('#sim-log-entries');
    if (!logEl) return;
    const time = new Date().toLocaleTimeString();
    const colors = { info: 'var(--text-secondary)', success: 'var(--success)', error: 'var(--error)', warn: 'var(--warning)' };
    logEl.innerHTML += `<div style="color:${colors[type] || colors.info};font-size:0.8rem;padding:0.15rem 0;border-bottom:1px solid var(--border);font-family:monospace;"><span style="color:var(--text-muted)">[${time}]</span> ${msg}</div>`;
    logEl.scrollTop = logEl.scrollHeight;
  }

  // Back button
  container.querySelector('#sim-back-btn').addEventListener('click', () => {
    navigate(`town/${state.currentTownId}`);
  });

  // Month buttons — one per month in the year
  let monthsPerYear = 12;

  function setupMonthButtons(mpy) {
    monthsPerYear = mpy;
    const group = container.querySelector('#sim-months-group');
    if (!group) return;

    group.innerHTML = Array.from({ length: mpy }, (_, i) => {
      const m = i + 1;
      return `<button class="sim-month-btn${m === 1 ? ' active' : ''}" data-months="${m}">${m}</button>`;
    }).join('');

    group.querySelectorAll('.sim-month-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.sim-month-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedMonths = parseInt(btn.dataset.months);
      });
    });

    selectedMonths = 1;
  }

  // Load calendar to get months_per_year
  (async () => {
    try {
      const calRes = await apiGetCalendar();
      const cal = calRes.calendar || {};
      setupMonthButtons(parseInt(cal.months_per_year) || 12);
    } catch (e) {
      setupMonthButtons(12);
    }
  })();

  // Clear log
  container.querySelector('#sim-clear-log').addEventListener('click', () => {
    container.querySelector('#sim-log-entries').innerHTML = '';
  });

  // Debug LLM button
  container.querySelector('#sim-debug-btn').addEventListener('click', async () => {
    log('Testing OpenRouter connectivity...');
    try {
      const res = await apiDebugLlm();
      log(`API Key Source: ${res.api_key_source || 'N/A'}`, 'info');
      log(`API Key Set: ${res.api_key_set ? 'YES' : 'NO'}`, res.api_key_set ? 'success' : 'error');
      log(`API Key Preview: ${res.api_key_preview || '(empty)'}`, 'info');
      log(`Model: ${res.model || 'N/A'}`, 'info');
      log(`PHP: ${res.php_version}`, 'info');
      if (res.openrouter_http_code !== undefined) {
        log(`OpenRouter HTTP: ${res.openrouter_http_code}`, res.openrouter_reachable ? 'success' : 'error');
        if (res.total_models) log(`OpenRouter Models Available: ${res.total_models}`, 'success');
        if (res.error_response) log(`Error Response: ${res.error_response}`, 'error');
      }
      if (res.curl_error) log(`cURL Error: ${res.curl_error}`, 'error');
      log('Debug complete.', 'success');
    } catch (err) {
      log(`Debug failed: ${err.message}`, 'error');
    }
  });

  // Load town info + campaign rules
  loadSimData(container);
  log('Simulation view loaded. Town ID: ' + state.currentTownId);

  // Run button
  container.querySelector('#sim-run-btn').addEventListener('click', () => {
    runSimulation(container);
  });

  async function loadSimData(cont) {
    try {
      // Load towns list
      const townsRes = await apiGetTowns();
      const towns = Array.isArray(townsRes) ? townsRes : (townsRes.towns || []);
      const town = towns.find(t => t.id === state.currentTownId);
      if (town) {
        cont.querySelector('#sim-town-info').innerHTML = `
                    <span class="sim-town-name">🏰 ${town.name}</span>
                    <span class="sim-town-pop">👥 ${town.character_count || '?'} residents</span>
                `;
      }

      // Load campaign rules (silently for use during sim)
      let campaignRules = '';
      try {
        const rulesRes = await apiGetCampaignRules();
        const parts = [];
        if (rulesRes.campaign_description) parts.push(rulesRes.campaign_description);
        if (rulesRes.rules_text) parts.push('House Rules: ' + rulesRes.rules_text);

        // Convert homebrew settings to structured rules text
        const hb = rulesRes.homebrew_settings || {};
        const hbParts = [];
        const HB_LABELS = {
          magic_level: { n: 'MAGIC LEVEL', none: 'None — mundane world, no magic.', low: 'Low — Magic is rare, feared, or revered.', standard: 'Standard — Per D&D rules.', high: 'High — Magic is common, used daily.', wild: 'Wild — Unpredictable surges, chaotic anomalies.' },
          tech_level: { n: 'TECHNOLOGY', primitive: 'Primitive — stone age, tribal.', ancient: 'Ancient — bronze/iron age.', medieval: 'Medieval — standard D&D.', renaissance: 'Renaissance — early firearms, printing.', magitech: 'Magitech — magic-driven technology.', steampunk: 'Steampunk — steam & clockwork machines.' },
          tone: { n: 'WORLD TONE', grimdark: 'Grimdark — bleak, hopeless, morally grey.', dark_fantasy: 'Dark Fantasy — dark but with hope.', standard: 'Standard Fantasy — heroic adventure.', lighthearted: 'Lighthearted — comedy, whimsy.', horror: 'Horror — dread, terror, madness lurks everywhere.', intrigue: 'Political Intrigue — schemes, betrayal, secrets.', mythic_saga: 'Mythic Saga — epic legends, fate-driven.' },
          divine: { n: 'DIVINE INVOLVEMENT', absent: 'Absent — gods are silent or nonexistent.', distant: 'Distant — gods exist but rarely intervene.', active: 'Active — gods grant power, send visions.', meddling: 'Meddling — gods walk the earth, interfere directly.' },
          planar: { n: 'PLANAR ACTIVITY', sealed: 'Sealed — no planar travel or influence.', rare: 'Rare — occasional anomalies.', active: 'Active — portals, extraplanar visitors.', chaotic: 'Chaotic — planes bleed into the material world.' },
          economy: { n: 'ECONOMY', barter: 'Barter — no currency, trade goods only.', poor: 'Impoverished — scarcity, poverty.', standard: 'Standard — coins, merchants, trade.', rich: 'Prosperous — wealthy, abundant trade.', guild: 'Guild-Controlled — guilds dominate trade.' },
          law: { n: 'LAW & ORDER', lawless: 'Lawless — no organized law, might = right.', frontier: 'Frontier Justice — informal, community-driven.', standard: 'Standard — guards, courts, laws.', authoritarian: 'Authoritarian — strict laws, harsh punishment.', theocracy: 'Theocratic — religious law dominates.' },
          monster_intelligence: { n: 'MONSTER INTELLIGENCE', bestial: 'Bestial — instinct-driven.', cunning: 'Cunning — use tactics, set traps.', sentient: 'Sentient — societies, politics, diplomacy.' },
          power_level: { n: 'POWER LEVEL', gritty: 'Gritty — mortals, 1st-level, survival focus.', heroic: 'Heroic — standard D&D adventurer scale.', mythic: 'Mythic — demigods, epic-level.' },
          ability_scores: { n: 'ABILITY SCORES', standard_array: 'Standard Array (15,14,13,12,10,8).', point_buy: 'Point Buy (27 pts).', roll_4d6: '4d6 drop lowest.', roll_3d6: '3d6 straight (old school).', heroic: 'Heroic Array (higher stats).' },
          leveling: { n: 'LEVELING', xp: 'XP-based.', milestone: 'Milestone — level at story beats.', session: 'Session-based.', slow: 'Slow progression.', fast: 'Fast progression.' },
          multiclass: { n: 'MULTICLASSING', forbidden: 'Forbidden — no multiclassing allowed.', restricted: 'Restricted — max 2 classes, prerequisites.', standard: 'Standard — per D&D rules.', free: 'Free — no prerequisites.' },
          alignment: { n: 'ALIGNMENT', strict: 'Strict — mechanical consequences for alignment.', guideline: 'Guideline — descriptive only.', dynamic: 'Dynamic — shifts based on actions.', none: 'No Alignment — removed entirely.' },
          racial: { n: 'RACIAL TRAITS', standard: 'Standard — fixed racial bonuses.', flexible: 'Flexible — choose where bonuses go.', custom_lineage: 'Custom Lineage — any race, any bonus.', no_bonuses: 'No Racial Bonuses.' },
          feats: { n: 'FEATS', none: 'No Feats.', standard: 'Standard — feats replace ASI.', bonus: 'Bonus — feats + ASI both.', frequent: 'Frequent — feat every odd level.', free_start: 'Free Starting Feat at L1.' },
          mortality: { n: 'NPC MORTALITY', lethal: 'Lethal — deaths are common.', impactful: 'Impactful — deaths are meaningful.', rare: 'Rare — plot armor protects most.' },
          death: { n: 'DEATH & RESURRECTION', permanent: 'Permanent — dead is dead.', costly: 'Costly — possible but rare/expensive.', available: 'Available — clerics can raise dead.', impactful: 'Deaths shape survivors\' personalities.' },
          healing: { n: 'HEALING', fast: 'Fast — recover quickly.', standard: 'Standard.', slow: 'Slow — no full recovery on long rest.', gritty: 'Gritty Realism — short rest 8hr, long rest 1wk.', medicine: 'Medicine Required — healer/supplies needed.' },
          resting: { n: 'RESTING', standard: 'Standard (1hr short, 8hr long).', gritty: 'Gritty (8hr short, 1wk long).', epic: 'Epic Heroism (5min short, 1hr long).', safe_haven: 'Safe Haven — long rest only in safe locations.' },
          encumbrance: { n: 'ENCUMBRANCE', none: 'None — carry anything.', simple: 'Simple (STR×15 lbs).', variant: 'Variant — speed penalties.', slot: 'Slot-Based (STR = slots).', strict: 'Strict — every pound tracked.' },
          disease: { n: 'DISEASE', none: 'None — disease doesn\'t exist.', rare: 'Rare — occasional illness.', realistic: 'Realistic — diseases spread, can kill.', rampant: 'Rampant — plagues are common.' },
          natural_hazards: { n: 'NATURAL HAZARDS', mild: 'Mild — good weather, safe terrain.', standard: 'Standard — seasonal, normal.', harsh: 'Harsh — extreme weather, dangerous.', catastrophic: 'Catastrophic — frequent disasters.' },
          npc_depth: { n: 'NPC DEPTH', simple: 'Simple — basic roles.', standard: 'Standard — distinct personalities.', deep: 'Deep — complex motivations, secrets.', literary: 'Literary — rich inner lives, character arcs.' },
          romance: { n: 'ROMANCE', none: 'None — no romantic content.', subtle: 'Subtle — implied, fade-to-black.', present: 'Present — acknowledged, part of life.', focus: 'Focus — relationships drive drama.' },
          factions: { n: 'FACTIONS', none: 'None — no organized factions.', simple: 'Simple — a few groups.', complex: 'Complex — rival factions, shifting alliances.', dominant: 'Dominant — factions control everything.' },
          crafting: { n: 'CRAFTING', none: 'None.', simple: 'Simple — basic item creation.', detailed: 'Detailed — materials, time, skill checks.', central: 'Central — crafting drives the economy.' },
          magic_items: { n: 'MAGIC ITEMS', nonexistent: 'Nonexistent — no magic items.', very_rare: 'Very Rare — legendary, world-shaking.', uncommon: 'Uncommon — exist but hard to find.', available: 'Available — can be bought.', abundant: 'Abundant — magic shops everywhere.' },
          undead: { n: 'UNDEAD', nonexistent: 'Nonexistent.', abomination: 'Abomination — universally feared.', standard: 'Standard — exists, dangerous.', commonplace: 'Commonplace — undead labor, accepted by some.', dominant: 'Dominant — undead rule or overrun areas.' },
        };
        for (const [key, val] of Object.entries(hb)) {
          if (val && HB_LABELS[key]?.[val]) hbParts.push(`${HB_LABELS[key].n}: ${HB_LABELS[key][val]}`);
        }
        if (hbParts.length) {
          parts.push('HOMEBREW WORLD RULES:\n' + hbParts.join('\n'));
        }

        campaignRules = parts.join('\n\n');
      } catch (e) {
        // No rules saved yet, that's fine
      }
      // Store for use by runSimulation
      cont._campaignRules = campaignRules;
    } catch (err) {
      console.error('Failed to load sim data:', err);
    }
  }

  async function runSimulation(cont) {
    const townId = state.currentTownId;
    const instructions = cont.querySelector('#sim-instructions').value.trim();
    const rules = cont._campaignRules || '';
    const runBtn = cont.querySelector('#sim-run-btn');
    const statusEl = cont.querySelector('#sim-status');
    const progressEl = cont.querySelector('#sim-progress');
    const resultsEl = cont.querySelector('#sim-results');
    const configEl = cont.querySelector('#sim-config');

    let fullInstructions = instructions;
    let intakeCount = Math.max(0, Math.min(50, parseInt(cont.querySelector('#sim-intake-count')?.value) || 0));

    log(`--- Starting simulation: ${selectedMonths} month(s), town ID ${townId} ---`);
    log(`Instructions: ${fullInstructions || '(none)'}`);
    log(`Rules length: ${rules.length} chars`);
    log(`Forced intake: ${intakeCount > 0 ? intakeCount + ' new arrivals' : 'none (natural only)'}`);

    runBtn.disabled = true;
    runBtn.textContent = '⏳ Running...';
    statusEl.textContent = '';
    resultsEl.style.display = 'none';
    progressEl.style.display = 'block';

    const progressFill = cont.querySelector('#sim-progress-fill');
    const progressText = cont.querySelector('#sim-progress-text');

    progressFill.style.width = '5%';

    try {
      // Intake mode (months=0) or single month — use one-shot call
      if (selectedMonths <= 1) {
        progressText.textContent = selectedMonths === 0
          ? 'AI is generating new characters (intake mode)...'
          : 'AI is simulating 1 month of town life...';

        let pct = 10;
        const progressInterval = setInterval(() => {
          if (pct < 85) { pct += Math.random() * 3; progressFill.style.width = `${pct}%`; }
        }, 1000);

        log('Calling apiRunSimulation (single)...', 'info');
        const result = await apiRunSimulation(townId, selectedMonths, rules, fullInstructions, intakeCount);
        clearInterval(progressInterval);
        progressFill.style.width = '100%';
        progressText.textContent = 'Simulation complete!';
        log('✅ Simulation completed successfully!', 'success');

        if (result.simulation) {
          const ch = result.simulation.changes || {};
          log(`New chars: ${(ch.new_characters || []).length}, Deaths: ${(ch.deaths || []).length}, XP: ${(ch.xp_gains || []).length}`, 'info');
        }

        setTimeout(() => { progressEl.style.display = 'none'; }, 1000);
        simResult = result;
        showResults(cont, result);

      } else {
        // Multi-month: iterate month by month for detailed simulation
        log(`Running ${selectedMonths} months month-by-month...`, 'info');

        // Accumulated result
        const merged = {
          summary: '',
          events: [],
          changes: {
            new_characters: [],
            deaths: [],
            new_relationships: [],
            xp_gains: [],
            stat_changes: [],
            role_changes: [],
            building_changes: [],
            levelup_details: [],
          },
          new_history_entry: { heading: '', content: '' },
        };
        const summaries = [];

        // Run month by month — more realistic, and with the trimmed prompt
        // the cost difference vs batching is negligible (<$0.01 for 24 months)
        const BATCH_SIZE = 1;
        const totalBatches = selectedMonths;

        for (let batch = 0; batch < totalBatches; batch++) {
          const batchStart = batch * BATCH_SIZE + 1;
          const batchEnd = Math.min((batch + 1) * BATCH_SIZE, selectedMonths);
          const batchMonths = batchEnd - batchStart + 1;

          const pct = Math.round(((batch + 1) / totalBatches) * 90) + 5;
          progressFill.style.width = `${pct}%`;
          progressText.textContent = `Simulating months ${batchStart}-${batchEnd} of ${selectedMonths}... (batch ${batch + 1}/${totalBatches})`;
          log(`Batch ${batch + 1}/${totalBatches}: months ${batchStart}-${batchEnd} (${batchMonths} months)...`, 'info');

          // Only pass intake count on the first batch
          const batchIntake = batch === 0 ? intakeCount : 0;
          // Only pass user instructions on the first batch
          const batchInstructions = batch === 0 ? fullInstructions : '';

          try {
            const batchResult = await apiRunSimulation(townId, batchMonths, rules, batchInstructions, batchIntake);
            const sim = batchResult.simulation || {};
            const ch = sim.changes || {};

            // Accumulate summary
            if (sim.summary) summaries.push(`**Months ${batchStart}-${batchEnd}:** ${sim.summary}`);

            // Accumulate events
            (sim.events || []).forEach(e => {
              if (typeof e === 'string') {
                merged.events.push({ month: batchStart, description: e });
              } else {
                // Offset the month number to be relative to the full simulation
                const relMonth = (e.month || 1) + batchStart - 1;
                merged.events.push({ ...e, month: relMonth });
              }
            });

            // Merge all change arrays
            ['new_characters', 'deaths', 'new_relationships', 'xp_gains', 'stat_changes', 'role_changes', 'building_changes'].forEach(key => {
              if (Array.isArray(ch[key])) {
                merged.changes[key].push(...ch[key]);
              }
            });

            // Merge history
            if (sim.new_history_entry) {
              if (sim.new_history_entry.content) {
                merged.new_history_entry.content += `\n\n**Months ${batchStart}-${batchEnd}:**\n${sim.new_history_entry.content}`;
              }
            }

            // Apply this batch's changes immediately so
            // the next batch sees updated building state, population, etc.
            try {
              const applyRes = await apiApplySimulation(townId, ch, sim.new_history_entry || null, batchMonths);
              log(`  Applied batch ${batch + 1} changes`, 'success');
              // Capture level-up details from apply response
              const ad = applyRes.applied || {};
              if (ad.levelup_details && ad.levelup_details.length) {
                merged.changes.levelup_details.push(...ad.levelup_details);
                log(`  ⬆️ ${ad.levelup_details.length} level-up(s) this batch`, 'info');
              }
            } catch (applyErr) {
              log(`  Warning: Could not apply batch ${batch + 1}: ${applyErr.message}`, 'warn');
            }

            log(`  Batch ${batch + 1}: ${(ch.new_characters || []).length} arrivals, ${(ch.deaths || []).length} deaths, ${(ch.building_changes || []).length} builds`, 'info');

          } catch (batchErr) {
            log(`  ❌ Batch ${batch + 1} (months ${batchStart}-${batchEnd}) failed: ${batchErr.message}`, 'error');
            // Continue with remaining batches
          }
        }

        // Build final merged result
        merged.summary = summaries.join('\n\n');
        merged.new_history_entry.heading = `Months 1-${selectedMonths}: Simulation`;
        if (!merged.new_history_entry.content) {
          merged.new_history_entry.content = merged.summary;
        }

        progressFill.style.width = '100%';
        progressText.textContent = `All ${selectedMonths} months complete!`;
        log(`✅ All ${selectedMonths} months completed! (${totalBatches} API calls)`, 'success');

        setTimeout(() => { progressEl.style.display = 'none'; }, 1000);

        // Show merged results (but DON'T apply again — already applied per-month)
        simResult = { ok: true, simulation: merged, town_id: townId, months: selectedMonths, already_applied: true };
        showResults(cont, simResult);
      }

    } catch (err) {
      progressEl.style.display = 'none';
      log(`❌ ERROR: ${err.message}`, 'error');
      statusEl.innerHTML = `<span style="color:var(--error);word-break:break-all;">❌ ${err.message}</span>`;
    } finally {
      runBtn.disabled = false;
      runBtn.textContent = '🎲 Run Simulation';
    }
  }

  function showResults(cont, result) {
    const sim = result.simulation || {};
    const changes = sim.changes || {};
    const resultsEl = cont.querySelector('#sim-results');

    // Filter out age-related stat changes (aging is a given)
    const isAgeRelated = (item) => {
      const txt = ((item.field || '') + (item.reason || '') + (item.description || '')).toLowerCase();
      return txt.includes('aged') || txt.includes('age ') || txt.includes('birthday')
        || (item.field && item.field.toLowerCase() === 'age');
    };

    const statChanges = (changes.stat_changes || []).filter(s => !isAgeRelated(s));
    const events = (sim.events || []).filter(e => {
      const txt = typeof e === 'string' ? e : (e.description || '');
      return !(/\baged\b|\bbirthday\b|\bturns?\s+\d+\b/i.test(txt));
    });
    const newChars = changes.new_characters || [];
    const deaths = changes.deaths || [];
    const relationships = changes.new_relationships || [];
    const xpGains = changes.xp_gains || [];
    const roleChanges = changes.role_changes || [];
    const buildingChanges = changes.building_changes || [];

    // Build tab definitions: [id, icon, label, count, contentHTML]
    const tabs = [];

    // 1. Summary & Events
    const summaryParts = [];
    if (sim.summary) summaryParts.push(`<p class="sim-summary-text">${sim.summary}</p>`);
    if (events.length) {
      summaryParts.push(`<div class="sim-events-list">
        ${events.map(e =>
        typeof e === 'string'
          ? `<div class="sim-event-card"><span class="sim-event-dot"></span>${e}</div>`
          : `<div class="sim-event-card"><span class="sim-event-month">Month ${e.month}</span>${e.description}</div>`
      ).join('')}
      </div>`);
    }
    if (summaryParts.length) {
      tabs.push(['summary', '📖', 'Summary', events.length, summaryParts.join('')]);
    }

    // 2. Arrivals
    if (newChars.length) {
      const births = newChars.filter(c => (c.reason || '').toLowerCase().includes('born') || (c.reason || '').toLowerCase().includes('birth'));
      const arrivals = newChars.filter(c => !births.includes(c));

      if (arrivals.length) {
        tabs.push(['arrivals', '👥', 'Arrivals', arrivals.length,
          `<div class="sim-change-list">${arrivals.map(c => `
            <div class="sim-change-item sim-change-add">
              <strong>${c.name}</strong> — ${c.race} ${c.class}
              ${c.reason ? `<span class="sim-reason">${c.reason}</span>` : ''}
            </div>`).join('')}</div>`
        ]);
      }

      if (births.length) {
        tabs.push(['births', '🍼', 'Births', births.length,
          `<div class="sim-change-list">${births.map(c => `
            <div class="sim-change-item sim-change-add">
              <strong>${c.name}</strong> — ${c.race} ${c.class}
              ${c.reason ? `<span class="sim-reason">${c.reason}</span>` : ''}
            </div>`).join('')}</div>`
        ]);
      }
    }

    // 3. Deaths
    if (deaths.length) {
      tabs.push(['deaths', '💀', 'Deaths', deaths.length,
        `<div class="sim-change-list">${deaths.map(d => `
          <div class="sim-change-item sim-change-death">
            <strong>${d.name}</strong>
            ${d.reason ? `<span class="sim-reason">${d.reason}</span>` : ''}
          </div>`).join('')}</div>`
      ]);
    }

    // 3. Relationships
    if (relationships.length) {
      tabs.push(['social', '💕', 'Social', relationships.length,
        `<div class="sim-change-list">${relationships.map(r => `
          <div class="sim-change-item sim-change-social">
            <strong>${r.char1}</strong> <span class="sim-rel-arrow">↔</span> <strong>${r.char2}</strong>
            <span class="sim-rel-type">${r.type}</span>
            ${r.reason ? `<span class="sim-reason">${r.reason}</span>` : ''}
          </div>`).join('')}</div>`
      ]);
    }

    // 4. Progression (XP + stat changes)
    const progParts = [];
    if (xpGains.length) {
      progParts.push(`<h4 class="sim-sub-heading">✨ XP Gains <span class="sim-badge">${xpGains.length}</span></h4>
        <div class="sim-change-list">${xpGains.map(x => `
          <div class="sim-change-item sim-change-xp">
            <strong>${x.name}</strong> <span class="sim-xp-val">+${x.xp_gained} XP</span>
            ${x.reason ? `<span class="sim-reason">${x.reason}</span>` : ''}
          </div>`).join('')}</div>`);
    }
    if (statChanges.length) {
      progParts.push(`<h4 class="sim-sub-heading">📊 Stat Changes <span class="sim-badge">${statChanges.length}</span></h4>
        <div class="sim-change-list">${statChanges.map(s => `
          <div class="sim-change-item">
            <strong>${s.name}</strong> <span class="sim-stat-field">${s.field}:</span>
            <span class="sim-stat-old">${s.old_value}</span> → <span class="sim-stat-new">${s.new_value}</span>
            ${s.reason ? `<span class="sim-reason">${s.reason}</span>` : ''}
          </div>`).join('')}</div>`);
    }
    if (progParts.length) {
      tabs.push(['progression', '📈', 'Progression', xpGains.length + statChanges.length, progParts.join('')]);
    }

    // 5. Role Changes
    if (roleChanges.length) {
      tabs.push(['roles', '🎭', 'Roles', roleChanges.length,
        `<div class="sim-change-list">${roleChanges.map(r => `
          <div class="sim-change-item sim-change-role">
            <strong>${r.name}</strong>
            <span class="sim-role-old">${r.old_role}</span> → <span class="sim-role-new">${r.new_role}</span>
            ${r.reason ? `<span class="sim-reason">${r.reason}</span>` : ''}
          </div>`).join('')}</div>`
      ]);
    }

    // 6. Building Changes
    if (buildingChanges.length) {
      const statusIcons = { start: '🔨', progress: '🏗️', complete: '✅', damage: '⚠️', destroy: '💥' };
      tabs.push(['buildings', '🏛️', 'Buildings', buildingChanges.length,
        `<div class="sim-change-list">${buildingChanges.map(b => {
          const icon = statusIcons[b.action] || '🏠';
          let detail = '';
          if (b.action === 'start') detail = `Construction begins (${b.build_time || '?'} months)`;
          else if (b.action === 'progress') detail = 'Work continues this month';
          else if (b.action === 'complete') detail = 'Construction complete!';
          else if (b.action === 'damage') detail = 'Building damaged';
          else if (b.action === 'destroy') detail = 'Building destroyed';
          return `
            <div class="sim-change-item sim-change-building">
              <span class="sim-building-icon">${icon}</span>
              <strong>${b.name}</strong>
              <span class="sim-building-action">${detail}</span>
              ${b.description ? `<span class="sim-reason">${b.description}</span>` : ''}
            </div>`;
        }).join('')}</div>`
      ]);
    }

    // 7. Level Ups
    const levelUps = changes.levelup_details || [];
    if (levelUps.length) {
      tabs.push(['levelups', '⬆️', 'Level Ups', levelUps.length,
        `<div class="sim-change-list">${levelUps.map(lu => `
          <div class="sim-change-item sim-change-xp">
            <strong>${lu.name}</strong>
            <span class="sim-stat-field">${lu.class || ''}:</span>
            <span class="sim-stat-old">Lv ${lu.old_level}</span> → <span class="sim-stat-new">Lv ${lu.new_level}</span>
            <span class="sim-reason">XP: ${lu.xp?.toLocaleString?.() || lu.xp || '?'}</span>
          </div>`).join('')}</div>`
      ]);
    }

    // Render tabbed panel
    const tabBarHTML = tabs.map((t, i) =>
      `<button class="sim-res-tab${i === 0 ? ' active' : ''}" data-sim-tab="${t[0]}">
        ${t[1]} ${t[2]} ${t[3] > 0 ? `<span class="sim-tab-badge">${t[3]}</span>` : ''}
      </button>`
    ).join('');

    const tabContentHTML = tabs.map((t, i) =>
      `<div class="sim-res-panel${i === 0 ? ' active' : ''}" data-sim-panel="${t[0]}">${t[4]}</div>`
    ).join('');

    const alreadyApplied = result.already_applied === true;
    resultsEl.innerHTML = `
      <h2 class="sim-results-title">🎲 Simulation Results${result.months > 1 ? ` (${result.months} months)` : ''}</h2>
      <div class="sim-res-tabs">${tabBarHTML}</div>
      <div class="sim-res-panels">${tabContentHTML}</div>
      <div class="sim-apply-actions">
        ${alreadyApplied
        ? `<button class="btn-primary" id="sim-apply-btn" disabled style="background:var(--success);cursor:default;">✅ All ${result.months} Months Applied</button>
             <button class="btn-secondary btn-sm" id="sim-goto-town-btn">🏰 Go to Town View</button>`
        : `<button class="btn-primary" id="sim-apply-btn">✅ Apply All Changes</button>
             <button class="btn-danger" id="sim-reject-btn">❌ Reject & Discard</button>`
      }
      </div>
    `;
    resultsEl.style.display = 'block';

    // Wire tab switching
    resultsEl.querySelectorAll('.sim-res-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        resultsEl.querySelectorAll('.sim-res-tab').forEach(b => b.classList.remove('active'));
        resultsEl.querySelectorAll('.sim-res-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        resultsEl.querySelector(`.sim-res-panel[data-sim-panel="${btn.dataset.simTab}"]`)?.classList.add('active');
      });
    });

    // Scroll results into view
    resultsEl.scrollIntoView({ behavior: 'smooth' });

    // Go to Town button (multi-month results)
    resultsEl.querySelector('#sim-goto-town-btn')?.addEventListener('click', () => {
      navigate('town/' + state.currentTownId);
    });

    // Apply button (single-month only)
    if (!alreadyApplied) {
      resultsEl.querySelector('#sim-apply-btn').addEventListener('click', async () => {
        const applyBtn = resultsEl.querySelector('#sim-apply-btn');
        applyBtn.disabled = true;
        applyBtn.textContent = '⏳ Applying...';
        log('Applying simulation changes...', 'info');
        try {
          const applyRes = await apiApplySimulation(
            state.currentTownId,
            changes,
            sim.new_history_entry || null,
            selectedMonths
          );

          // Show what was actually applied
          if (applyRes.debug_info) console.log('Apply debug_info:', applyRes.debug_info);
          const a = applyRes.applied || {};
          const applySummary = [];
          if (a.new_characters) applySummary.push(`${a.new_characters} characters added`);
          if (a.deaths) applySummary.push(`${a.deaths} deaths`);
          if (a.relationships) applySummary.push(`${a.relationships} relationships`);
          if (a.xp) applySummary.push(`${a.xp} XP updates`);
          if (a.stats) applySummary.push(`${a.stats} stat changes`);
          if (a.roles) applySummary.push(`${a.roles} role changes`);
          if (a.buildings) applySummary.push(`${a.buildings} building changes`);
          if (a.auto_levelups) applySummary.push(`${a.auto_levelups} auto level-ups`);
          if (a.history) applySummary.push('history updated');

          // Log level-up details and inject Level Ups tab
          const luDetails = a.levelup_details || [];
          if (luDetails.length) {
            luDetails.forEach(lu => log(`  ⬆️ ${lu.name} (${lu.class || '?'}): Lv ${lu.old_level} → ${lu.new_level}`, 'success'));
            // Inject a Level Ups tab into the results panel
            const tabBar = resultsEl.querySelector('.sim-res-tabs');
            const panelArea = resultsEl.querySelector('.sim-res-panels');
            if (tabBar && panelArea) {
              const tabBtn = document.createElement('button');
              tabBtn.className = 'sim-res-tab';
              tabBtn.dataset.simTab = 'levelups';
              tabBtn.innerHTML = `⬆️ Level Ups <span class="sim-tab-badge">${luDetails.length}</span>`;
              tabBar.appendChild(tabBtn);
              const panel = document.createElement('div');
              panel.className = 'sim-res-panel';
              panel.dataset.simPanel = 'levelups';
              panel.innerHTML = `<div class="sim-change-list">${luDetails.map(lu => `
                <div class="sim-change-item sim-change-xp">
                  <strong>${lu.name}</strong>
                  <span class="sim-stat-field">${lu.class || ''}:</span>
                  <span class="sim-stat-old">Lv ${lu.old_level}</span> → <span class="sim-stat-new">Lv ${lu.new_level}</span>
                  <span class="sim-reason">XP: ${lu.xp?.toLocaleString?.() || lu.xp || '?'}</span>
                </div>`).join('')}</div>`;
              panelArea.appendChild(panel);
              tabBtn.addEventListener('click', () => {
                resultsEl.querySelectorAll('.sim-res-tab').forEach(b => b.classList.remove('active'));
                resultsEl.querySelectorAll('.sim-res-panel').forEach(p => p.classList.remove('active'));
                tabBtn.classList.add('active');
                panel.classList.add('active');
              });
            }
          }

          const summaryText = applySummary.length ? applySummary.join(', ') : 'No changes applied';
          log(`✅ Applied: ${summaryText}`, 'success');

          applyBtn.textContent = '✅ Applied!';
          applyBtn.style.background = 'var(--success)';

          // Force refresh character data so town view is up to date
          try {
            const charRes = await apiGetCharacters(state.currentTownId);
            const chars = (charRes.characters || []).map(normalizeCharacter);
            if (state.currentTown) {
              state.currentTown.characters = chars;
            }
            setState({ selectedCharId: null });
            log(`Refreshed town data: ${chars.length} total characters now`, 'success');
          } catch (refreshErr) {
            log(`Warning: Could not refresh town data: ${refreshErr.message}`, 'warn');
          }

          // Update status with summary + navigation button
          const statusEl = cont.querySelector('#sim-status');
          statusEl.innerHTML = `<span style="color:var(--success)">✅ ${summaryText}</span><br>
            <button class="btn-secondary btn-sm" id="sim-goto-town" style="margin-top:0.5rem;">🏰 Go to Town View</button>`;
          cont.querySelector('#sim-goto-town')?.addEventListener('click', () => {
            navigate('town/' + state.currentTownId);
          });
        } catch (err) {
          log(`❌ Apply failed: ${err.message}`, 'error');
          applyBtn.disabled = false;
          applyBtn.textContent = '✅ Apply All Changes';
          cont.querySelector('#sim-status').textContent = `❌ ${err.message}`;
          cont.querySelector('#sim-status').style.color = 'var(--error)';
        }
      });

      // Reject button (only for single-month)
      resultsEl.querySelector('#sim-reject-btn')?.addEventListener('click', () => {
        resultsEl.style.display = 'none';
        simResult = null;
        cont.querySelector('#sim-status').textContent = '🗑️ Results discarded.';
        cont.querySelector('#sim-status').style.color = 'var(--text-muted)';
      });
    } else {
      // Multi-month: refresh character data since changes were already applied
      (async () => {
        try {
          const charRes = await apiGetCharacters(state.currentTownId);
          const chars = (charRes.characters || []).map(normalizeCharacter);
          if (state.currentTown) state.currentTown.characters = chars;
          setState({ selectedCharId: null });
        } catch (e) {/* ignore */ }
      })();
    }
  }
}
