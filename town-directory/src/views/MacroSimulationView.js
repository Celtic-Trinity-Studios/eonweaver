import {
  apiMacroDemographics,
  apiMacroFrameworkOverview,
  apiMacroSimulateMonth,
  apiMacroTradeRoutes,
  apiMacroWeatherLog,
} from '../api/macro.js';
import { showToast } from '../components/Toast.js';

function esc(v) {
  return String(v || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function metricRow(m) {
  return `
    <tr>
      <td>${m.town_name}</td>
      <td>${Number(m.supply_index).toFixed(3)}</td>
      <td>${Number(m.demand_index).toFixed(3)}</td>
      <td>${Number(m.food_stores).toFixed(1)}</td>
      <td>${Number(m.stability_index).toFixed(3)}</td>
      <td>${Number(m.trade_score).toFixed(3)}</td>
      <td>${Number(m.weather_impact).toFixed(3)}</td>
    </tr>
  `;
}

export default function MacroSimulationView(container) {
  container.innerHTML = `
    <div class="view-simulation">
      <header class="view-header">
        <h1>🟣 Macro Simulation & World Dynamics</h1>
        <p class="view-subtitle">Framework shell for economy, weather/seasonality, and medieval demographic pressure.</p>
      </header>

      <div class="dash-card" style="padding:1rem;margin-bottom:1rem;">
        <div style="display:flex;gap:0.6rem;flex-wrap:wrap;align-items:flex-end;">
          <div class="sim-field" style="max-width:140px;">
            <label>Advance months</label>
            <input id="macro-months" class="form-input" type="number" min="1" max="12" value="1">
          </div>
          <div class="sim-field" style="min-width:260px;flex:1;">
            <label>Operator note (optional)</label>
            <input id="macro-note" class="form-input" type="text" placeholder="e.g. famine stress test">
          </div>
          <button class="btn-primary" id="macro-run">Run macro tick</button>
          <button class="btn-secondary" id="macro-refresh">Refresh</button>
        </div>
      </div>

      <div class="dash-card" style="padding:1rem;margin-bottom:1rem;">
        <h3 style="margin:0 0 0.5rem;">Phase roadmap (framework)</h3>
        <div id="macro-roadmap" class="muted" style="font-size:0.9rem;">Loading…</div>
      </div>

      <div class="dash-card" style="padding:1rem;margin-bottom:1rem;">
        <h3 style="margin:0 0 0.5rem;">Campaign Macro State</h3>
        <div id="macro-state" class="muted">Loading…</div>
      </div>

      <div class="dash-card" style="padding:1rem;">
        <h3 style="margin:0 0 0.5rem;">Town Metrics (Framework)</h3>
        <div style="overflow:auto;">
          <table class="srd-table srd-table-sm">
            <thead>
              <tr>
                <th>Town</th><th>Supply</th><th>Demand</th><th>Food</th><th>Stability</th><th>Trade</th><th>Weather Impact</th>
              </tr>
            </thead>
            <tbody id="macro-metrics-body"><tr><td colspan="7" class="muted">Loading…</td></tr></tbody>
          </table>
        </div>
      </div>

      <div class="dash-card" style="padding:1rem;margin-top:1rem;">
        <h3 style="margin:0 0 0.5rem;">Trade Routes (Framework)</h3>
        <div id="macro-routes" class="muted">Loading…</div>
      </div>

      <div class="dash-card" style="padding:1rem;margin-top:1rem;">
        <h3 style="margin:0 0 0.5rem;">Weather & Seasonal Log (Framework)</h3>
        <div id="macro-weather" class="muted">Loading…</div>
      </div>

      <div class="dash-card" style="padding:1rem;margin-top:1rem;">
        <h3 style="margin:0 0 0.5rem;">Medieval Demographics Snapshots (Framework)</h3>
        <div id="macro-demo" class="muted">Loading…</div>
      </div>
    </div>
  `;

  const roadmapEl = container.querySelector('#macro-roadmap');
  const stateEl = container.querySelector('#macro-state');
  const tbody = container.querySelector('#macro-metrics-body');
  const routesEl = container.querySelector('#macro-routes');
  const weatherEl = container.querySelector('#macro-weather');
  const demoEl = container.querySelector('#macro-demo');
  const runBtn = container.querySelector('#macro-run');
  const refreshBtn = container.querySelector('#macro-refresh');

  async function refresh() {
    const res = await apiMacroFrameworkOverview();
    const roadmap = res.phase_roadmap || [];
    const flags = res.framework_flags || {};
    const flagLines = Object.entries(flags)
      .filter(([, v]) => v)
      .map(([k]) => k.replace(/_/g, ' '))
      .join(', ');
    roadmapEl.innerHTML = roadmap.length
      ? `<ul style="margin:0;padding-left:1.2rem;">
          ${roadmap.map((p) => `<li><strong>Phase ${p.phase}</strong> — ${p.title} · target ${p.target} · unlock $${Number(p.unlock || 0).toLocaleString()}</li>`).join('')}
        </ul>
        <div style="margin-top:0.5rem;"><span class="muted">Framework surfaces enabled:</span> ${flagLines || '—'}</div>`
      : '<div class="muted">No roadmap payload.</div>';

    const s = res.macro_state || {};
    stateEl.innerHTML = `
      <div><strong>Month Index:</strong> ${s.current_month_index ?? 0}</div>
      <div><strong>Season:</strong> ${s.season || 'spring'}</div>
      <div><strong>Weather Pattern:</strong> ${s.weather_pattern || 'temperate'}</div>
      <div><strong>Climate Stress:</strong> ${Number(s.climate_stress || 0).toFixed(3)}</div>
    `;
    const metrics = res.town_metrics || [];
    tbody.innerHTML = metrics.length ? metrics.map(metricRow).join('') : '<tr><td colspan="7" class="muted">No towns yet.</td></tr>';

    const [routesRes, weatherRes, demoRes] = await Promise.all([
      apiMacroTradeRoutes(),
      apiMacroWeatherLog(24),
      apiMacroDemographics({ limit: 30 }),
    ]);

    const routes = routesRes.routes || [];
    routesEl.innerHTML = routes.length
      ? `<div style="max-height:12rem;overflow:auto;">${routes.map((r) =>
          `<div style="padding:0.25rem 0;border-bottom:1px solid var(--border);">
            <strong>${r.from_town_name}</strong> → <strong>${r.to_town_name}</strong>
            <span class="muted"> strength ${Number(r.route_strength).toFixed(3)}, risk ${Number(r.risk_index).toFixed(3)}</span>
          </div>`
        ).join('')}</div>`
      : '<div class="muted">No routes yet (need at least two towns).</div>';

    const weather = weatherRes.events || [];
    weatherEl.innerHTML = weather.length
      ? `<div style="max-height:12rem;overflow:auto;">${weather.map((w) =>
          `<div style="padding:0.25rem 0;border-bottom:1px solid var(--border);">
            Month ${w.month_index}: <strong>${w.season}</strong> / ${w.weather_pattern}
            <span class="muted">(severity ${Number(w.severity).toFixed(3)})</span>
            ${w.narrative ? `<div class="muted" style="font-size:0.8rem;margin-top:0.15rem;">${esc(w.narrative)}</div>` : ''}
          </div>`
        ).join('')}</div>`
      : '<div class="muted">No weather events yet.</div>';

    const demos = demoRes.snapshots || [];
    demoEl.innerHTML = demos.length
      ? `<div style="max-height:14rem;overflow:auto;">${demos.map((d) =>
          `<div style="padding:0.25rem 0;border-bottom:1px solid var(--border);">
            M${d.month_index} · <strong>${d.town_name}</strong> — pop ${d.living_population}, workforce ${d.workforce_population},
            children ${d.child_population}, elders ${d.elder_population}, growth ${Number(d.growth_rate).toFixed(4)}
          </div>`
        ).join('')}</div>`
      : '<div class="muted">No demographic snapshots yet.</div>';
  }

  runBtn.addEventListener('click', async () => {
    try {
      runBtn.disabled = true;
      runBtn.textContent = '⏳ Running…';
      const months = parseInt(container.querySelector('#macro-months').value || '1', 10);
      const note = container.querySelector('#macro-note').value.trim();
      await apiMacroSimulateMonth(months, note);
      showToast(`Macro framework ticked ${months} month(s).`, 'success');
      await refresh();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      runBtn.disabled = false;
      runBtn.textContent = 'Run macro tick';
    }
  });

  refreshBtn.addEventListener('click', async () => {
    try {
      await refresh();
      showToast('Macro state refreshed.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  refresh().catch((err) => {
    stateEl.textContent = err.message;
  });
}

