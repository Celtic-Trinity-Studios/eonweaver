/**
 * Eon Weaver — Calendar View
 * Current date, weekdays (names + abbreviations), months with per-month days.
 */
import { apiGetCalendar, apiGetCalendarWeatherMoon, apiSaveCalendar, calendarToString } from '../api/settings.js';
import { apiAdvanceCalendar } from '../api/simulation.js';
import { getState, setState, userCanDebug } from '../stores/appState.js';
import { apiGetTowns } from '../api/towns.js';
import { showToast } from '../components/Toast.js';

const DEFAULT_MONTH_NAMES = ['Hammer', 'Alturiak', 'Ches', 'Tarsakh', 'Mirtul', 'Kythorn', 'Flamerule', 'Eleasis', 'Eleint', 'Marpenoth', 'Uktar', 'Nightal'];
const DEFAULT_DAYS = 30;
const DEFAULT_WEEK_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DEFAULT_WEEK_ABBREV = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
/** Campaign epoch / empty-calendar default: 1st day of 1st month of year 0. */
const DEFAULT_CAL_YEAR = 0;

function parseCalInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export default function CalendarView(container) {
  container.innerHTML = `
    <div class="view-calendar">
      <header class="view-header"><h1>📅 Calendar</h1></header>
      <div class="calendar-display" id="cal-display">Loading...</div>

      <section class="settings-section-card" style="margin-bottom:1rem;">
        <h3>Weather &amp; moon</h3>
        <p class="settings-hint" style="margin-bottom:0.75rem;">Month grid: world-level yearly climate + local daily drift (derived from town map position/biome), plus lunar phase. Moon cycle starts from campaign epoch (year 0, month 1, day 1).</p>
        <div class="form-row" style="flex-wrap:wrap;gap:0.75rem;align-items:flex-end;margin-bottom:0.75rem;">
          <div class="form-group" style="min-width:200px;">
            <label>Town</label>
            <select id="cal-wx-town" class="form-input"></select>
          </div>
          <div class="form-group" style="max-width:110px;">
            <label>Year</label>
            <input type="number" id="cal-wx-year" class="form-input" min="0" value="0">
          </div>
          <div class="form-group" style="max-width:100px;">
            <label>Month</label>
            <input type="number" id="cal-wx-month" class="form-input" min="1" max="24" value="1">
          </div>
          <div class="form-group" style="max-width:100px;">
            <label>Lunar days</label>
            <input type="number" id="cal-wx-lunar" class="form-input" min="4" max="64" value="28" title="Days per full lunar cycle">
          </div>
          <button type="button" class="btn-secondary btn-sm" id="cal-wx-prev" title="Previous month">◀</button>
          <button type="button" class="btn-secondary btn-sm" id="cal-wx-next" title="Next month">▶</button>
          <button type="button" class="btn-primary btn-sm" id="cal-wx-refresh">Refresh</button>
        </div>
        <div id="cal-wx-grid-host" class="cal-wx-grid-host"></div>
      </section>

      <!-- Full-width Current Date panel -->
      <section class="settings-section-card" style="margin-bottom:1rem;">
        <h3>Current Date</h3>
        <div class="form-row" style="flex-wrap:wrap;gap:1rem;">
          <div class="form-group" style="flex:1;min-width:80px;"><label>Day</label><input type="number" id="cal-day" min="1" max="100" class="form-input"></div>
          <div class="form-group" style="flex:1;min-width:80px;"><label>Month</label><input type="number" id="cal-month" min="1" max="20" class="form-input"></div>
          <div class="form-group" style="flex:2;min-width:120px;"><label>Year</label><input type="number" id="cal-year" class="form-input"></div>
          <div class="form-group" style="flex:1;min-width:100px;"><label>Era Name</label><input type="text" id="cal-era" placeholder="DR" class="form-input"></div>
        </div>
      </section>

      <!-- Week: day count + names / abbreviations -->
      <section class="settings-section-card" style="margin-bottom:1rem;">
        <h3>Week</h3>
        <p class="settings-hint" style="margin-bottom:0.75rem;">Used for Town History and other calendar grids. Abbreviations show in column headers.</p>
        <div class="form-row" style="flex-wrap:wrap;gap:1rem;align-items:flex-end;">
          <div class="form-group" style="flex:0;min-width:120px;">
            <label>Days per week</label>
            <input type="number" id="cal-dpw" class="form-input" min="1" max="14" value="7" title="How many days before the week repeats">
          </div>
        </div>
        <div class="cal-week-header" style="display:flex;gap:0.5rem;margin:0.75rem 0 0.35rem;font-size:0.75rem;color:var(--text-muted);font-weight:600;">
          <span style="width:28px;"></span>
          <span style="flex:1;">Day name</span>
          <span style="width:90px;">Abbrev.</span>
        </div>
        <div class="cal-week-list" id="cal-week-list"></div>
      </section>

      <!-- Month Names + Days list with +/- controls -->
      <section class="settings-section-card">
        <div class="cal-months-header">
          <h3>📝 Months <span class="cal-month-count" id="cal-month-count">(12)</span></h3>
          <div class="cal-months-controls">
            <button class="btn-secondary btn-sm" id="cal-remove-month" title="Remove last month">−</button>
            <button class="btn-secondary btn-sm" id="cal-add-month" title="Add a month">+</button>
          </div>
        </div>
        <div class="cal-month-list" id="cal-month-list"></div>
      </section>

      <div class="settings-actions" style="display:flex;gap:0.5rem;flex-wrap:wrap;">
        <button class="btn-primary" id="cal-save">💾 Save Calendar</button>
        ${userCanDebug() ? '<button class="btn-secondary" id="cal-test-advance" type="button" title="Calls advance_calendar with +1 day. If this works but simulation does not, the bug is in the simulation pipeline.">🛠 Test: advance 1 day</button>' : ''}
      </div>
      ${userCanDebug() ? '<pre id="cal-debug" style="margin-top:1rem;padding:0.75rem;background:rgba(0,0,0,0.25);border:1px solid var(--border-color);border-radius:8px;font-size:0.78rem;color:var(--text-muted);white-space:pre-wrap;display:none;"></pre>' : ''}
    </div>`;

  let monthsPerYear = 12;
  let calendarMpyCache = 12;

  function escCal(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function syncWxControlsFromCalendar(cal) {
    const wy = container.querySelector('#cal-wx-year');
    const wm = container.querySelector('#cal-wx-month');
    if (!cal || !wy || !wm) return;
    const mpy = cal.months_per_year || 12;
    calendarMpyCache = mpy;
    wm.max = String(mpy);
    wm.min = '1';
    wy.value = String(cal.current_year ?? DEFAULT_CAL_YEAR);
    wm.value = String(cal.current_month ?? 1);
  }

  function renderWxMoonGrid(host, payload) {
    const dpw = payload.days_per_week || 7;
    const blanks = payload.grid_leading_blanks || 0;
    const abbrev = payload.weekday_abbrev || [];
    const days = payload.days || [];
    const sourceLabel = payload.weather_source === 'campaign_world'
      ? 'World climate'
      : (payload.weather_source === 'town_legacy' ? 'Town legacy climate' : 'No climate source');
    const hint = payload.has_weather_year
      ? `${sourceLabel} · hybrid local daily detail`
      : 'Moon only — generate yearly climate in Settings → World climate';
    const title = `${escCal(payload.month_name)} ${payload.year} · ${hint}`;
    let html = `<div class="cal-wx-grid-title">${title}</div>`;
    html += `<div class="cal-wx-grid" style="grid-template-columns:repeat(${dpw},minmax(0,1fr));">`;
    for (let i = 0; i < dpw; i++) {
      html += `<div class="cal-wx-head">${escCal(abbrev[i] || '')}</div>`;
    }
    for (let i = 0; i < blanks; i++) {
      html += '<div class="cal-wx-cell cal-wx-blank"></div>';
    }
    for (const cell of days) {
      const w = cell.weather;
      const m = cell.moon;
      const today = cell.is_today ? ' cal-wx-is-today' : '';
      const wxBlock = w
        ? `<div class="cal-wx-temp">${escCal(w.temp_display)}</div><div class="cal-wx-sub">${escCal(w.precipitation)} · ${escCal(w.wind)}</div>${w.odd_event ? `<div class="cal-wx-odd" title="${escCal(w.odd_event)}">⚡ ${escCal(w.odd_event)}</div>` : ''}`
        : '<div class="cal-wx-no-wx muted">No yearly weather</div>';
      html += `<div class="cal-wx-cell${today}"><div class="cal-wx-daynum">${cell.day}</div><div class="cal-wx-moon-inline" title="${escCal(m.label)}">${m.symbol}</div>${wxBlock}<div class="cal-wx-moon" title="${escCal(m.label)}"><span class="cal-wx-moon-label">${escCal(m.label)}</span></div></div>`;
    }
    html += '</div>';
    host.innerHTML = html;
  }

  async function refreshWxMoonGrid() {
    const host = container.querySelector('#cal-wx-grid-host');
    const sel = container.querySelector('#cal-wx-town');
    if (!host) return;
    const townId = parseInt(sel?.value || '0', 10);
    const year = parseCalInt(container.querySelector('#cal-wx-year')?.value, DEFAULT_CAL_YEAR);
    const month = parseCalInt(container.querySelector('#cal-wx-month')?.value, 1);
    const lunar = Math.max(4, Math.min(64, parseInt(container.querySelector('#cal-wx-lunar')?.value || '28', 10)));
    if (!townId) {
      host.innerHTML = '<p class="muted">Choose a town to load the grid.</p>';
      return;
    }
    host.innerHTML = '<p class="muted">Loading…</p>';
    try {
      const res = await apiGetCalendarWeatherMoon(townId, year, month, lunar);
      renderWxMoonGrid(host, res);
    } catch (e) {
      host.innerHTML = `<p class="muted" style="color:var(--error);">${escCal(e.message)}</p>`;
    }
  }

  function populateTownSelect(towns) {
    const sel = container.querySelector('#cal-wx-town');
    if (!sel) return;
    sel.innerHTML = (towns || []).map((t) => `<option value="${t.id}">${escCal(t.name)}</option>`).join('');
  }

  function padWeekArrays(dpw, names, abbrevs) {
    const n = [];
    const a = [];
    for (let i = 0; i < dpw; i++) {
      n.push((names[i] != null && String(names[i]).trim()) ? String(names[i]).trim() : (DEFAULT_WEEK_NAMES[i] || ('Day ' + (i + 1))));
      a.push((abbrevs[i] != null && String(abbrevs[i]).trim()) ? String(abbrevs[i]).trim() : (DEFAULT_WEEK_ABBREV[i] || ('D' + (i + 1))));
    }
    return { names: n, abbrevs: a };
  }

  function renderWeekList(dpw, namesIn, abbrevsIn) {
    const list = container.querySelector('#cal-week-list');
    const dpwEl = container.querySelector('#cal-dpw');
    if (dpwEl) dpwEl.value = String(dpw);
    if (!list) return;

    const { names, abbrevs } = padWeekArrays(dpw, namesIn || [], abbrevsIn || []);
    const html = [];
    for (let i = 0; i < dpw; i++) {
      html.push(`
        <div class="cal-week-row" style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.4rem;">
          <span class="cal-week-number" style="width:28px;text-align:right;font-size:0.8rem;color:var(--text-muted);">${i + 1}</span>
          <input type="text" class="form-input cal-week-name" data-week-idx="${i}" style="flex:1;"
                 value="${(names[i] || '').replace(/"/g, '&quot;')}" placeholder="Day name">
          <input type="text" class="form-input cal-week-abbrev" data-week-idx="${i}" maxlength="8" style="width:90px;text-align:center;"
                 value="${(abbrevs[i] || '').replace(/"/g, '&quot;')}" placeholder="Abbr">
        </div>`);
    }
    list.innerHTML = html.join('');
  }

  function collectWeekData() {
    const dpw = Math.max(1, Math.min(14, parseInt(container.querySelector('#cal-dpw')?.value, 10) || 7));
    const nameInputs = container.querySelectorAll('.cal-week-name');
    const abbrevInputs = container.querySelectorAll('.cal-week-abbrev');
    const names = [];
    const abbrevs = [];
    for (let i = 0; i < dpw; i++) {
      const ni = container.querySelector(`.cal-week-name[data-week-idx="${i}"]`);
      const ai = container.querySelector(`.cal-week-abbrev[data-week-idx="${i}"]`);
      names.push((ni && ni.value.trim()) ? ni.value.trim() : (DEFAULT_WEEK_NAMES[i] || ('Day ' + (i + 1))));
      abbrevs.push((ai && ai.value.trim()) ? ai.value.trim() : (DEFAULT_WEEK_ABBREV[i] || ('D' + (i + 1))));
    }
    return { daysPerWeek: dpw, weekday_names: names, weekday_abbrev: abbrevs };
  }

  function renderMonthList(count, names, daysArr) {
    const list = container.querySelector('#cal-month-list');
    if (!list) return;

    while (names.length < count) names.push('Month ' + (names.length + 1));
    while (daysArr.length < count) daysArr.push(DEFAULT_DAYS);

    const html = [];
    for (let i = 0; i < count; i++) {
      html.push(`
        <div class="cal-month-row">
          <span class="cal-month-number">${i + 1}</span>
          <input type="text" class="form-input cal-month-name" data-month-idx="${i}"
                 value="${(names[i] || '').replace(/"/g, '&quot;')}"
                 placeholder="Month ${i + 1}">
          <input type="number" class="form-input cal-month-days" data-month-idx="${i}"
                 value="${daysArr[i] || DEFAULT_DAYS}" min="1" max="100"
                 title="Days in this month" style="width:65px;text-align:center;">
          <span class="cal-days-label">days</span>
        </div>`);
    }
    list.innerHTML = html.join('');
    monthsPerYear = count;

    const countEl = container.querySelector('#cal-month-count');
    if (countEl) countEl.textContent = `(${count})`;

    const monthInput = container.querySelector('#cal-month');
    if (monthInput) monthInput.max = count;
  }

  function collectMonthNames() {
    const inputs = container.querySelectorAll('.cal-month-name');
    return Array.from(inputs).map(inp => inp.value.trim() || `Month ${parseInt(inp.dataset.monthIdx, 10) + 1}`);
  }

  function collectMonthDays() {
    const inputs = container.querySelectorAll('.cal-month-days');
    return Array.from(inputs).map(inp => Math.max(1, parseInt(inp.value, 10) || DEFAULT_DAYS));
  }

  let weekNamesCache = DEFAULT_WEEK_NAMES.slice();
  let weekAbbrevCache = DEFAULT_WEEK_ABBREV.slice();

  container.querySelector('#cal-dpw').addEventListener('change', () => {
    const dpw = Math.max(1, Math.min(14, parseInt(container.querySelector('#cal-dpw').value, 10) || 7));
    const cur = collectWeekData();
    renderWeekList(dpw, cur.weekday_names, cur.weekday_abbrev);
  });

  // + button
  container.querySelector('#cal-add-month').addEventListener('click', () => {
    if (monthsPerYear >= 20) return;
    const names = collectMonthNames();
    const days = collectMonthDays();
    renderMonthList(monthsPerYear + 1, names, days);
  });

  // − button
  container.querySelector('#cal-remove-month').addEventListener('click', () => {
    if (monthsPerYear <= 1) return;
    const names = collectMonthNames();
    const days = collectMonthDays();
    names.pop();
    days.pop();
    renderMonthList(monthsPerYear - 1, names, days);
  });

  loadCal(container, renderMonthList, renderWeekList, (cal) => {
    syncWxControlsFromCalendar(cal);
    refreshWxMoonGrid().catch(() => {});
  });

  apiGetTowns()
    .then((r) => {
      populateTownSelect(r.towns || []);
      const tid = getState().currentTownId;
      const sel = container.querySelector('#cal-wx-town');
      if (tid && sel) sel.value = String(tid);
      return refreshWxMoonGrid();
    })
    .catch(() => {});

  container.querySelector('#cal-wx-town')?.addEventListener('change', () => refreshWxMoonGrid());
  container.querySelector('#cal-wx-year')?.addEventListener('change', () => refreshWxMoonGrid());
  container.querySelector('#cal-wx-month')?.addEventListener('change', () => refreshWxMoonGrid());
  container.querySelector('#cal-wx-lunar')?.addEventListener('change', () => refreshWxMoonGrid());
  container.querySelector('#cal-wx-refresh')?.addEventListener('click', () => refreshWxMoonGrid());

  container.querySelector('#cal-wx-prev')?.addEventListener('click', () => {
    let m = parseCalInt(container.querySelector('#cal-wx-month')?.value, 1);
    let y = parseCalInt(container.querySelector('#cal-wx-year')?.value, DEFAULT_CAL_YEAR);
    const mpy = calendarMpyCache || 12;
    m -= 1;
    if (m < 1) {
      m = mpy;
      y -= 1;
    }
    const wm = container.querySelector('#cal-wx-month');
    const wy = container.querySelector('#cal-wx-year');
    if (wm) wm.value = String(m);
    if (wy) wy.value = String(y);
    refreshWxMoonGrid();
  });

  container.querySelector('#cal-wx-next')?.addEventListener('click', () => {
    let m = parseCalInt(container.querySelector('#cal-wx-month')?.value, 1);
    let y = parseCalInt(container.querySelector('#cal-wx-year')?.value, DEFAULT_CAL_YEAR);
    const mpy = calendarMpyCache || 12;
    m += 1;
    if (m > mpy) {
      m = 1;
      y += 1;
    }
    const wm = container.querySelector('#cal-wx-month');
    const wy = container.querySelector('#cal-wx-year');
    if (wm) wm.value = String(m);
    if (wy) wy.value = String(y);
    refreshWxMoonGrid();
  });

  container.querySelector('#cal-save').addEventListener('click', () => {
    saveCal(container, collectMonthNames, collectMonthDays, collectWeekData, monthsPerYear, (cal) => {
      syncWxControlsFromCalendar(cal);
      refreshWxMoonGrid().catch(() => {});
    });
  });

  container.querySelector('#cal-test-advance')?.addEventListener('click', async () => {
    const btn = container.querySelector('#cal-test-advance');
    const debugEl = container.querySelector('#cal-debug');
    if (!btn || !debugEl) return;
    btn.disabled = true;
    const before = (container.querySelector('#cal-display')?.textContent || '').trim();
    try {
      const res = await apiAdvanceCalendar(0, 1);
      const reload = await apiGetCalendar();
      const cal = reload?.calendar;
      if (cal) {
        setState({ calendar: cal });
        container.querySelector('#cal-display').textContent = calendarToString(cal);
        container.querySelector('#cal-day').value = cal.current_day ?? 1;
        container.querySelector('#cal-month').value = cal.current_month ?? 1;
        container.querySelector('#cal-year').value = cal.current_year ?? DEFAULT_CAL_YEAR;
      }
      const after = container.querySelector('#cal-display')?.textContent.trim();
      const dbg = {
        before,
        after,
        applied: res?.applied || null,
        debug_info: res?.debug_info || null,
        rows_updated: res?.debug_info?.calendar_rows_updated ?? null,
      };
      debugEl.textContent = JSON.stringify(dbg, null, 2);
      debugEl.style.display = '';
      if (before === after) {
        showToast('Backend returned ok but the date did not change. See debug panel.', 'error');
      } else {
        showToast('Calendar advanced by 1 day.', 'success');
      }
    } catch (err) {
      debugEl.textContent = 'Error: ' + (err?.message || err);
      debugEl.style.display = '';
      showToast('Advance failed: ' + (err.message || err), 'error');
    } finally {
      btn.disabled = false;
    }
  });
}

async function loadCal(c, renderMonthFn, renderWeekFn, onLoaded) {
  try {
    const res = await apiGetCalendar();
    const cal = res.calendar;
    if (!cal) return;
    c.querySelector('#cal-display').textContent = calendarToString(cal);
    c.querySelector('#cal-day').value = cal.current_day ?? 1;
    c.querySelector('#cal-month').value = cal.current_month ?? 1;
    c.querySelector('#cal-year').value = cal.current_year ?? DEFAULT_CAL_YEAR;
    c.querySelector('#cal-era').value = cal.era_name || 'DR';
    const mpy = cal.months_per_year || 12;

    const names = Array.isArray(cal.month_names) ? cal.month_names : DEFAULT_MONTH_NAMES.slice();

    let daysArr;
    if (Array.isArray(cal.days_per_month)) {
      daysArr = cal.days_per_month;
    } else {
      const d = parseInt(cal.days_per_month, 10) || 30;
      daysArr = Array(mpy).fill(d);
    }

    renderMonthFn(mpy, names, daysArr);

    const dpw = cal.days_per_week || 7;
    const wnames = Array.isArray(cal.weekday_names) ? cal.weekday_names : [];
    const wabbrev = Array.isArray(cal.weekday_abbrev) ? cal.weekday_abbrev : [];
    renderWeekFn(dpw, wnames, wabbrev);

    if (typeof onLoaded === 'function') onLoaded(cal);

    setState({ calendar: cal });
  } catch (e) {
    console.error('Calendar load error:', e);
    renderMonthFn(12, DEFAULT_MONTH_NAMES.slice(), Array(12).fill(30));
    renderWeekFn(7, DEFAULT_WEEK_NAMES.slice(), DEFAULT_WEEK_ABBREV.slice());
  }
}

async function saveCal(c, collectNamesFn, collectDaysFn, collectWeekFn, mpy, onSaved) {
  try {
    const monthNames = collectNamesFn();
    const monthDays = collectDaysFn();
    const w = collectWeekFn();
    const cal = {
      current_day: parseCalInt(c.querySelector('#cal-day').value, 1) || 1,
      current_month: parseCalInt(c.querySelector('#cal-month').value, 1) || 1,
      current_year: parseCalInt(c.querySelector('#cal-year').value, DEFAULT_CAL_YEAR),
      era_name: c.querySelector('#cal-era').value || 'DR',
      months_per_year: mpy,
      days_per_month: monthDays,
      month_names: monthNames,
      days_per_week: w.daysPerWeek,
      weekday_names: w.weekday_names,
      weekday_abbrev: w.weekday_abbrev,
    };
    await apiSaveCalendar(cal);
    setState({ calendar: cal });
    c.querySelector('#cal-display').textContent = calendarToString(cal);
    if (typeof onSaved === 'function') onSaved(cal);
    showToast('Calendar saved!', 'success');
  } catch (err) {
    showToast('Save failed: ' + err.message, 'error');
  }
}
