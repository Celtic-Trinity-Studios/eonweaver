/**
 * Eon Weaver — Calendar View
 * Full-width current date, month list with per-month days and +/- controls.
 */
import { apiGetCalendar, apiSaveCalendar, calendarToString } from '../api/settings.js';
import { setState } from '../stores/appState.js';
import { showToast } from '../components/Toast.js';

const DEFAULT_MONTH_NAMES = ['Hammer', 'Alturiak', 'Ches', 'Tarsakh', 'Mirtul', 'Kythorn', 'Flamerule', 'Eleasis', 'Eleint', 'Marpenoth', 'Uktar', 'Nightal'];
const DEFAULT_DAYS = 30;

export default function CalendarView(container) {
  container.innerHTML = `
    <div class="view-calendar">
      <header class="view-header"><h1>📅 Calendar</h1></header>
      <div class="calendar-display" id="cal-display">Loading...</div>

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

      <div class="settings-actions"><button class="btn-primary" id="cal-save">💾 Save Calendar</button></div>
    </div>`;

  let monthsPerYear = 12;

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
    return Array.from(inputs).map(inp => inp.value.trim() || `Month ${parseInt(inp.dataset.monthIdx) + 1}`);
  }

  function collectMonthDays() {
    const inputs = container.querySelectorAll('.cal-month-days');
    return Array.from(inputs).map(inp => Math.max(1, parseInt(inp.value) || DEFAULT_DAYS));
  }

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

  loadCal(container, renderMonthList);

  container.querySelector('#cal-save').addEventListener('click', () => {
    saveCal(container, collectMonthNames, collectMonthDays, monthsPerYear);
  });
}

async function loadCal(c, renderFn) {
  try {
    const res = await apiGetCalendar();
    const cal = res.calendar; if (!cal) return;
    c.querySelector('#cal-display').textContent = calendarToString(cal);
    c.querySelector('#cal-day').value = cal.current_day || 1;
    c.querySelector('#cal-month').value = cal.current_month || 1;
    c.querySelector('#cal-year').value = cal.current_year || 1490;
    c.querySelector('#cal-era').value = cal.era_name || 'DR';
    const mpy = cal.months_per_year || 12;

    const names = Array.isArray(cal.month_names) ? cal.month_names : DEFAULT_MONTH_NAMES.slice();

    // days_per_month can be an array (new) or a single number (legacy)
    let daysArr;
    if (Array.isArray(cal.days_per_month)) {
      daysArr = cal.days_per_month;
    } else {
      const d = parseInt(cal.days_per_month) || 30;
      daysArr = Array(mpy).fill(d);
    }

    renderFn(mpy, names, daysArr);
    setState({ calendar: cal });
  } catch (e) {
    console.error('Calendar load error:', e);
    renderFn(12, DEFAULT_MONTH_NAMES.slice(), Array(12).fill(30));
  }
}

async function saveCal(c, collectNamesFn, collectDaysFn, mpy) {
  try {
    const monthNames = collectNamesFn();
    const monthDays = collectDaysFn();
    const cal = {
      current_day: parseInt(c.querySelector('#cal-day').value) || 1,
      current_month: parseInt(c.querySelector('#cal-month').value) || 1,
      current_year: parseInt(c.querySelector('#cal-year').value) || 1490,
      era_name: c.querySelector('#cal-era').value || 'DR',
      months_per_year: mpy,
      days_per_month: monthDays,
      month_names: monthNames,
    };
    await apiSaveCalendar(cal);
    setState({ calendar: cal });
    c.querySelector('#cal-display').textContent = calendarToString(cal);
    showToast('Calendar saved!', 'success');
  } catch (err) { showToast('Save failed: ' + err.message, 'error'); }
}
