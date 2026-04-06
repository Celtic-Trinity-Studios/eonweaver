/**
 * Eon Weaver — Calendar View
 * Individual month name inputs that auto-update when months_per_year changes.
 */
import { apiGetCalendar, apiSaveCalendar, calendarToString } from '../api/settings.js';
import { setState } from '../stores/appState.js';
import { showToast } from '../components/Toast.js';

const DEFAULT_MONTH_NAMES = ['Hammer', 'Alturiak', 'Ches', 'Tarsakh', 'Mirtul', 'Kythorn', 'Flamerule', 'Eleasis', 'Eleint', 'Marpenoth', 'Uktar', 'Nightal'];

export default function CalendarView(container) {
  container.innerHTML = `
    <div class="view-calendar">
      <header class="view-header"><h1>📅 Calendar</h1></header>
      <div class="calendar-display" id="cal-display">Loading...</div>
      <div class="settings-grid">
        <section class="settings-section-card">
          <h3>Current Date</h3>
          <div class="form-row">
            <div class="form-group"><label>Day</label><input type="number" id="cal-day" min="1" max="100" class="form-input"></div>
            <div class="form-group"><label>Month</label><input type="number" id="cal-month" min="1" max="20" class="form-input"></div>
            <div class="form-group"><label>Year</label><input type="number" id="cal-year" class="form-input"></div>
          </div>
          <div class="form-group"><label>Era Name</label><input type="text" id="cal-era" placeholder="DR" class="form-input"></div>
        </section>
        <section class="settings-section-card">
          <h3>Configuration</h3>
          <div class="form-row">
            <div class="form-group"><label>Months/Year</label><input type="number" id="cal-mpy" min="1" max="20" class="form-input"></div>
            <div class="form-group"><label>Days/Month</label><input type="number" id="cal-dpm" min="1" max="100" class="form-input"></div>
          </div>
        </section>
      </div>

      <section class="settings-section-card" style="margin-top:1rem;">
        <h3>📝 Month Names</h3>
        <p class="settings-hint" style="margin-bottom:0.75rem;">Each month gets its own name. These names are used in simulation history entries and event descriptions.<br>Change "Months/Year" above to add or remove months.</p>
        <div class="cal-month-grid" id="cal-month-grid"></div>
      </section>

      <div class="settings-actions"><button class="btn-primary" id="cal-save">💾 Save Calendar</button></div>
    </div>`;

  let currentMonthNames = [];

  function renderMonthInputs(count, names) {
    const grid = container.querySelector('#cal-month-grid');
    if (!grid) return;

    // Ensure we have enough names
    while (names.length < count) names.push('Month ' + (names.length + 1));

    const html = [];
    for (let i = 0; i < count; i++) {
      html.push(`
              <div class="cal-month-input-row">
                <span class="cal-month-number">${i + 1}</span>
                <input type="text" class="form-input cal-month-name" data-month-idx="${i}" 
                       value="${(names[i] || '').replace(/"/g, '&quot;')}" 
                       placeholder="Month ${i + 1}">
              </div>`);
    }
    grid.innerHTML = html.join('');
    currentMonthNames = names.slice(0, count);
  }

  function collectMonthNames() {
    const inputs = container.querySelectorAll('.cal-month-name');
    return Array.from(inputs).map(inp => inp.value.trim() || `Month ${parseInt(inp.dataset.monthIdx) + 1}`);
  }

  // When months/year changes, re-render the grid
  container.querySelector('#cal-mpy').addEventListener('input', (e) => {
    const count = Math.max(1, Math.min(20, parseInt(e.target.value) || 12));
    // Collect current names before re-rendering
    const existing = collectMonthNames();
    renderMonthInputs(count, existing);

    // Also update month number max
    const monthInput = container.querySelector('#cal-month');
    if (monthInput) monthInput.max = count;
  });

  loadCal(container, renderMonthInputs);
  container.querySelector('#cal-save').addEventListener('click', () => saveCal(container, collectMonthNames));
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
    c.querySelector('#cal-mpy').value = mpy;
    c.querySelector('#cal-dpm').value = cal.days_per_month || 30;

    const names = Array.isArray(cal.month_names) ? cal.month_names : DEFAULT_MONTH_NAMES.slice();
    renderFn(mpy, names);

    setState({ calendar: cal });
  } catch (e) {
    console.error('Calendar load error:', e);
    renderFn(12, DEFAULT_MONTH_NAMES.slice());
  }
}

async function saveCal(c, collectFn) {
  try {
    const monthNames = collectFn();
    const cal = {
      current_day: parseInt(c.querySelector('#cal-day').value) || 1,
      current_month: parseInt(c.querySelector('#cal-month').value) || 1,
      current_year: parseInt(c.querySelector('#cal-year').value) || 1490,
      era_name: c.querySelector('#cal-era').value || 'DR',
      months_per_year: parseInt(c.querySelector('#cal-mpy').value) || 12,
      days_per_month: parseInt(c.querySelector('#cal-dpm').value) || 30,
      month_names: monthNames,
    };
    await apiSaveCalendar(cal);
    setState({ calendar: cal });
    c.querySelector('#cal-display').textContent = calendarToString(cal);
    showToast('Calendar saved!', 'success');
  } catch (err) { showToast('Save failed: ' + err.message, 'error'); }
}
