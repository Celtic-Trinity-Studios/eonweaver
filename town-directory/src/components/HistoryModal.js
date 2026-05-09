/**
 * Eon Weaver — Town History Modal
 * Calendar-style month grid with per-month stat breakdowns (ready for per-day events)
 */
import { apiGetHistory } from '../api/towns.js';
import { apiGetCharacters } from '../api/characters.js';
import { apiGetCalendar } from '../api/settings.js';

const DEFAULT_MONTH_NAMES = ['Hammer', 'Alturiak', 'Ches', 'Tarsakh', 'Mirtul', 'Kythorn', 'Flamerule', 'Eleasis', 'Eleint', 'Marpenoth', 'Uktar', 'Nightal'];
const DEFAULT_WEEK_ABBREV = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function escAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function normalizeCalendar(cal) {
  let monthNames = [...DEFAULT_MONTH_NAMES];
  let daysPerMonth = Array(12).fill(30);
  let monthsPerYear = 12;
  let era = 'DR';
  let daysPerWeek = 7;
  let weekdayAbbrev = DEFAULT_WEEK_ABBREV.slice();
  if (cal) {
    monthsPerYear = Math.min(24, Math.max(1, parseInt(cal.months_per_year, 10) || 12));
    if (Array.isArray(cal.month_names) && cal.month_names.length) {
      monthNames = cal.month_names.slice();
    }
    while (monthNames.length < monthsPerYear) {
      monthNames.push('Month ' + (monthNames.length + 1));
    }
    monthNames = monthNames.slice(0, monthsPerYear);
    let dpm = cal.days_per_month;
    if (typeof dpm === 'string') {
      try {
        dpm = JSON.parse(dpm);
      } catch {
        dpm = null;
      }
    }
    if (Array.isArray(dpm)) {
      daysPerMonth = dpm.map(d => Math.min(100, Math.max(1, parseInt(d, 10) || 30)));
      while (daysPerMonth.length < monthsPerYear) daysPerMonth.push(30);
      daysPerMonth = daysPerMonth.slice(0, monthsPerYear);
    } else {
      daysPerMonth = Array(monthsPerYear).fill(30);
    }
    era = (cal.era_name || 'DR').trim() || 'DR';
    daysPerWeek = Math.min(14, Math.max(1, parseInt(cal.days_per_week, 10) || 7));
    if (Array.isArray(cal.weekday_abbrev) && cal.weekday_abbrev.length) {
      weekdayAbbrev = cal.weekday_abbrev.map(a => String(a || '').trim() || '?');
      while (weekdayAbbrev.length < daysPerWeek) {
        weekdayAbbrev.push('D' + (weekdayAbbrev.length + 1));
      }
      weekdayAbbrev = weekdayAbbrev.slice(0, daysPerWeek);
    } else {
      while (weekdayAbbrev.length < daysPerWeek) {
        weekdayAbbrev.push(DEFAULT_WEEK_ABBREV[weekdayAbbrev.length] || ('D' + (weekdayAbbrev.length + 1)));
      }
      weekdayAbbrev = weekdayAbbrev.slice(0, daysPerWeek);
    }
  }
  return { monthNames, daysPerMonth, monthsPerYear, era, daysPerWeek, weekdayAbbrev };
}

function matchMonthIndex(monthStr, monthNames) {
  if (!monthStr || !monthNames.length) return null;
  const low = monthStr.trim().toLowerCase();
  const idx = monthNames.findIndex(m => m && m.toLowerCase() === low);
  if (idx >= 0) return idx + 1;
  const idxStarts = monthNames.findIndex(m => m && m.toLowerCase().startsWith(low));
  if (idxStarts >= 0) return idxStarts + 1;
  const idxPref = monthNames.findIndex(m => {
    if (!m) return false;
    const ml = m.toLowerCase();
    const pref = ml.slice(0, Math.min(4, ml.length));
    return pref.length >= 2 && low.startsWith(pref);
  });
  if (idxPref >= 0) return idxPref + 1;
  return null;
}

function parseHeading(heading, monthNames) {
  if (!heading) return { month: '', year: '', monthIndex: null };
  for (let i = 0; i < monthNames.length; i++) {
    const name = monthNames[i];
    if (!name) continue;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('\\b' + escaped + '\\b\\D*(\\d{3,})', 'i');
    const m = heading.match(re);
    if (m) return { month: name, year: m[1], monthIndex: i + 1 };
  }
  const m1 = heading.match(/^([A-Za-z]+),?\s+(\d+)\s*\w*/);
  if (m1) {
    const mi = matchMonthIndex(m1[1], monthNames);
    return { month: m1[1], year: m1[2], monthIndex: mi };
  }
  const m2 = heading.match(/(\d{3,})/);
  if (m2) return { month: '', year: m2[1], monthIndex: null };
  return { month: '', year: '', monthIndex: null };
}

/** Map day number -> list of { title } from narrative (future: AI / structured lines). */
function parseDayEventsFromContent(content) {
  const map = new Map();
  if (!content) return map;
  const dayHeader = /^(?:#{1,3}\s*)?(?:\*\*)?\s*Day\s+(\d{1,3})\b(?:\*\*)?\s*[—:–-]?\s*(.*)$/i;
  for (const line of content.split('\n')) {
    const m = line.trim().match(dayHeader);
    if (!m) continue;
    const d = parseInt(m[1], 10);
    const title = (m[2] || '').replace(/\*\*/g, '').trim() || 'Event';
    if (d < 1 || d > 100) continue;
    if (!map.has(d)) map.set(d, []);
    map.get(d).push({ title });
  }
  return map;
}

export async function openHistoryModal(townId) {
  const { showModal } = await import('./Modal.js');

  const { el, close } = showModal({
    title: '📜 Town History',
    width: 'wide',
    content: '<p class="muted">Loading history...</p>'
  });

  try {
    const [histRes, charRes, calRes] = await Promise.all([
      apiGetHistory(townId),
      apiGetCharacters(townId),
      apiGetCalendar().catch(() => ({}))
    ]);
    const calConfig = normalizeCalendar(calRes.calendar);
    const history = histRes.history || [];
    const characters = charRes.characters || [];

    if (!history.length) {
      el.innerHTML = '<p class="muted" style="text-align:center;padding:2rem;">No history entries yet. Run a simulation to create history!</p>';
      return;
    }

    const alive = characters.filter(c => (c.status || 'Alive') !== 'Deceased');
    const deceased = characters.filter(c => (c.status || 'Alive') === 'Deceased');

    const cleanContent = (text) => {
      if (!text) return '';
      return text.split('\n')
        .filter(line => !/\b(aged|turns?\s+\d+|birthday|grew older)\b/i.test(line))
        .join('\n').replace(/\n{3,}/g, '\n\n').trim();
    };

    // Parse narrative text for arrivals, births, deaths, events
    function parseNarrativeStats(text) {
      const t = text || '';
      const arrivals = [];
      const births = [];
      const deaths = [];
      const events = [];

      const arrPat = [
        /(?:arrival|arrived|arriving|newcomer|new resident|wandered in|came to|joined)[^.]*?(?:of\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)[^.]*?(?:arrived|showed up|appeared|came to town|joined the)/gi
      ];
      for (const pat of arrPat) {
        let m; while ((m = pat.exec(t)) !== null) {
          const n = m[1]?.trim();
          if (n && n.length > 2 && !arrivals.includes(n)) arrivals.push(n);
        }
      }

      const birthPat = [
        /(?:birth of|born|newborn|gave birth)[^.]*?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)[^.]*?(?:was born|birth|newborn child)/gi
      ];
      for (const pat of birthPat) {
        let m; while ((m = pat.exec(t)) !== null) {
          const n = m[1]?.trim();
          if (n && n.length > 2 && !births.includes(n)) births.push(n);
        }
      }

      const deathPat = [
        /(?:death of|passing of|died|perished|killed|succumbed|fell in battle|lost their life|was slain)[^.]*?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)[^.]*?(?:died|passed away|was killed|perished|succumbed|fell in battle|departed this world)/gi
      ];
      for (const pat of deathPat) {
        let m; while ((m = pat.exec(t)) !== null) {
          const n = m[1]?.trim();
          if (n && n.length > 2 && !deaths.includes(n)) deaths.push(n);
        }
      }

      const evPat = /(?:construction|built|completed|discovered|conflict|fight|battle|trade|alliance|festival|ceremony|appointed|elected|established)/gi;
      let em; while ((em = evPat.exec(t)) !== null) events.push(em[0]);

      return { arrivals, births, deaths, events };
    }

    // Build entries (month/year aligned to campaign calendar when possible)
    const entries = history.map((h, i) => {
      const parsed = parseHeading(h.heading, calConfig.monthNames);
      let monthIndex = parsed.monthIndex;
      if (!monthIndex && parsed.month) {
        monthIndex = matchMonthIndex(parsed.month, calConfig.monthNames);
      }
      const content = cleanContent(h.content);
      const stats = parseNarrativeStats(content);
      return {
        heading: h.heading || 'Untitled',
        content,
        month: parsed.month,
        year: parsed.year,
        monthIndex,
        idx: i,
        stats
      };
    }).filter(e => e.content || e.heading);

    const years = [...new Set(entries.map(e => e.year).filter(Boolean))].sort((a, b) => parseInt(b, 10) - parseInt(a, 10));

    const byYearMonth = new Map();
    for (const e of entries) {
      if (!e.year || !e.monthIndex) continue;
      byYearMonth.set(String(e.year) + '-' + e.monthIndex, e);
    }

    function firstMonthWithEntry(yearStr) {
      const y = String(yearStr);
      for (let m = 1; m <= calConfig.monthsPerYear; m++) {
        if (byYearMonth.has(y + '-' + m)) return m;
      }
      return 1;
    }

    // Helper
    function statBox(num, label, color) {
      return '<div class="ws-stat-box"><div class="ws-stat-num" style="color:' + color + ';">' + num + '</div><div class="ws-stat-label">' + label + '</div></div>';
    }

    // ── Timeline View ──
    function renderTimeline() {
      el.innerHTML = '';

      const html = '<div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap;margin-bottom:1rem;">'
        + statBox(entries.length, 'ENTRIES', 'var(--accent)')
        + statBox(alive.length, 'ALIVE', '#5cb85c')
        + statBox(deceased.length, 'DECEASED', '#e05555')
        + statBox(characters.length, 'TOTAL', 'var(--text-primary)')
        + '</div>'
        + '<div class="ws-tabs" style="display:flex;gap:0;border-bottom:1px solid var(--border);margin-bottom:0.75rem;">'
        + '<button class="ws-tab active" data-htab="timeline">📅 Calendar (' + entries.length + ')</button>'
        + '<button class="ws-tab" data-htab="roster">🧑 Living (' + alive.length + ')</button>'
        + '<button class="ws-tab" data-htab="graveyard">💀 Deceased (' + deceased.length + ')</button>'
        + '</div>'
        + '<div id="htab-timeline" class="htab-pane">'
        + '<div style="display:flex;gap:0.75rem;align-items:center;margin-bottom:0.75rem;flex-wrap:wrap;">'
        + '<div style="display:flex;align-items:center;gap:0.4rem;">'
        + '<label style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">YEAR</label>'
        + '<select class="form-input" id="history-year-filter" style="width:auto;min-width:100px;">'
        + '<option value="">All Years</option>'
        + years.map(y => '<option value="' + y + '">' + y + '</option>').join('')
        + '</select></div>'
        + '<div id="history-month-wrap" style="display:flex;align-items:center;gap:0.4rem;">'
        + '<label style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">MONTH</label>'
        + '<select class="form-input" id="history-month-select" style="width:auto;min-width:160px;"></select>'
        + '</div></div>'
        + '<div id="history-calendar-host" style="max-height:55vh;overflow-y:auto;padding-right:2px;"></div>'
        + '<div id="history-all-years-list" style="display:none;max-height:55vh;overflow-y:auto;"></div>'
        + '</div>'
        + '<div id="htab-roster" class="htab-pane" style="display:none;"><div style="max-height:55vh;overflow-y:auto;">'
        + '<table class="ws-res-table" style="width:100%;"><thead><tr><th>Name</th><th>Race</th><th>Class</th><th>Lvl</th><th>Role</th></tr></thead><tbody>'
        + alive.map(c => '<tr><td style="color:var(--accent);font-weight:600;">' + (c.name||'') + '</td><td>' + (c.race||'\u2014') + '</td><td>' + (c.class||'\u2014') + '</td><td>' + (c.level||1) + '</td><td style="color:var(--text-muted);">' + (c.role||'\u2014') + '</td></tr>').join('')
        + '</tbody></table></div></div>'
        + '<div id="htab-graveyard" class="htab-pane" style="display:none;"><div style="max-height:55vh;overflow-y:auto;">'
        + (deceased.length === 0 ? '<p class="muted" style="text-align:center;padding:1rem;">No deaths recorded.</p>' :
          '<table class="ws-res-table" style="width:100%;"><thead><tr><th>Name</th><th>Race</th><th>Class</th><th>Lvl</th><th>Cause</th></tr></thead><tbody>'
          + deceased.map(c => '<tr><td style="color:var(--text-muted);font-weight:600;">' + (c.name||'') + '</td><td>' + (c.race||'\u2014') + '</td><td>' + (c.class||'\u2014') + '</td><td>' + (c.level||1) + '</td><td style="color:var(--error);font-size:0.75rem;">' + (c.death_cause||'\u2014') + '</td></tr>').join('')
          + '</tbody></table>')
        + '</div></div>';

      el.innerHTML = html;

      // Tab switching
      el.querySelectorAll('.ws-tab[data-htab]').forEach(tab => {
        tab.addEventListener('click', () => {
          el.querySelectorAll('.ws-tab[data-htab]').forEach(t => t.classList.remove('active'));
          el.querySelectorAll('.htab-pane').forEach(p => p.style.display = 'none');
          tab.classList.add('active');
          el.querySelector('#htab-' + tab.dataset.htab).style.display = '';
        });
      });

      const yearFilter = el.querySelector('#history-year-filter');
      const monthWrap = el.querySelector('#history-month-wrap');
      const monthSelect = el.querySelector('#history-month-select');
      const calHost = el.querySelector('#history-calendar-host');
      const allYearsList = el.querySelector('#history-all-years-list');

      function fillMonthSelect() {
        monthSelect.innerHTML = '';
        for (let m = 1; m <= calConfig.monthsPerYear; m++) {
          const label = calConfig.monthNames[m - 1] || ('Month ' + m);
          monthSelect.innerHTML += '<option value="' + m + '">' + escAttr(label) + '</option>';
        }
      }

      function renderCalendarGrid(yearStr, monthIdx) {
        if (!calHost) return;
        const y = String(yearStr);
        const entry = byYearMonth.get(y + '-' + monthIdx);
        const daysInMonth = calConfig.daysPerMonth[monthIdx - 1] || 30;
        const dow = calConfig.daysPerWeek || 7;
        const pad = (parseInt(y, 10) * 12 + monthIdx) % dow;
        const parsedDays = entry ? parseDayEventsFromContent(entry.content) : new Map();
        const monthName = calConfig.monthNames[monthIdx - 1] || ('Month ' + monthIdx);

        const cells = [];
        for (let i = 0; i < pad; i++) {
          cells.push('<div class="history-cal-cell history-cal-cell--pad" style="min-height:88px;border-radius:var(--radius-sm);background:transparent;border:1px dashed var(--border);opacity:0.35;"></div>');
        }
        for (let d = 1; d <= daysInMonth; d++) {
          const events = [];
          const parsedLines = parsedDays.get(d);
          if (parsedLines && parsedLines.length) {
            for (const p of parsedLines) {
              events.push({ kind: 'line', title: p.title, entry });
            }
          }
          if (d === 1 && entry) {
            const hasParsed = parsedDays.size > 0;
            const day1Parsed = parsedDays.has(1);
            if (!hasParsed || !day1Parsed) {
              const title = entry.heading.split(':')[0].trim();
              events.unshift({ kind: 'chronicle', title, entry });
            }
          }

          let statsHtml = '';
          if (events.some(ev => ev.kind === 'chronicle') && entry) {
            const s = entry.stats;
            statsHtml = '<div style="display:flex;gap:0.35rem;flex-wrap:wrap;justify-content:flex-end;margin-top:auto;font-size:0.62rem;color:var(--text-muted);">'
              + (s.arrivals.length ? '<span title="Arrivals">\uD83E\uDDCD ' + s.arrivals.length + '</span>' : '')
              + (s.births.length ? '<span title="Births">\uD83D\uDC76 ' + s.births.length + '</span>' : '')
              + (s.deaths.length ? '<span title="Deaths">\uD83D\uDC80 ' + s.deaths.length + '</span>' : '')
              + (s.events.length ? '<span title="Events">\uD83D\uDCCC ' + s.events.length + '</span>' : '')
              + '</div>';
          }

          const eventHtml = events.map(ev => {
            const t = escAttr(ev.title);
            const eidx = ev.entry ? ev.entry.idx : '';
            return '<button type="button" class="history-cal-event" data-eidx="' + eidx + '" style="display:block;width:100%;text-align:left;border:none;background:transparent;padding:0;cursor:pointer;color:var(--accent);font-weight:600;font-size:0.68rem;line-height:1.25;font-family:inherit;">' + t + '</button>';
          }).join('');

          cells.push(
            '<div class="history-cal-cell" style="min-height:88px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-secondary);padding:4px 5px;display:flex;flex-direction:column;gap:2px;">'
            + '<div style="font-size:0.62rem;color:var(--text-muted);font-weight:700;">' + d + '</div>'
            + '<div style="flex:1;display:flex;flex-direction:column;gap:3px;overflow:hidden;">' + eventHtml + '</div>'
            + statsHtml
            + '</div>'
          );
        }

        const labels = calConfig.weekdayAbbrev || DEFAULT_WEEK_ABBREV;
        const weekdayRow = labels.map(w =>
          '<div style="text-align:center;font-size:0.65rem;color:var(--text-muted);font-weight:600;padding:4px 0;">' + escAttr(w) + '</div>'
        ).join('');

        calHost.innerHTML =
          '<div style="margin-bottom:0.5rem;text-align:center;font-family:\'Cinzel\',serif;color:var(--accent);font-size:0.95rem;">'
          + escAttr(monthName) + ', ' + escAttr(y) + ' ' + escAttr(calConfig.era) + '</div>'
          + '<div style="display:grid;grid-template-columns:repeat(' + dow + ',1fr);gap:5px;">'
          + weekdayRow
          + cells.join('')
          + '</div>';

        calHost.querySelectorAll('.history-cal-event[data-eidx]').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.eidx, 10);
            const ent = entries.find(e => e.idx === idx);
            if (ent) renderMonthDetail(ent);
          });
        });
      }

      function renderAllYearsCards() {
        if (!allYearsList) return;
        allYearsList.innerHTML = entries.map(entry => {
          const s = entry.stats;
          const title = entry.heading.split(':')[0];
          const subtitle = entry.heading.includes(':') ? entry.heading.split(':').slice(1).join(':').trim() : '';
          return '<div class="history-month-card" data-eidx="' + entry.idx + '" style="margin-bottom:0.5rem;padding:0.65rem 0.85rem;background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;transition:border-color .15s,background .15s;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;">'
            + '<span style="color:var(--accent);font-weight:700;font-size:0.9rem;font-family:\'Cinzel\',serif;">' + title + '</span>'
            + '<div style="display:flex;gap:0.6rem;font-size:0.72rem;color:var(--text-muted);">'
            + (s.arrivals.length ? '<span title="Arrivals">\uD83E\uDDCD ' + s.arrivals.length + '</span>' : '')
            + (s.births.length ? '<span title="Births">\uD83D\uDC76 ' + s.births.length + '</span>' : '')
            + (s.deaths.length ? '<span title="Deaths">\uD83D\uDC80 ' + s.deaths.length + '</span>' : '')
            + (s.events.length ? '<span title="Events">\uD83D\uDCCC ' + s.events.length + '</span>' : '')
            + '</div></div>'
            + (subtitle ? '<div style="font-size:0.75rem;color:var(--text-secondary);margin-top:0.25rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + subtitle + '</div>' : '')
            + '</div>';
        }).join('');

        allYearsList.querySelectorAll('.history-month-card').forEach(card => {
          card.addEventListener('mouseenter', () => { card.style.borderColor = 'var(--accent)'; card.style.background = 'var(--bg-hover)'; });
          card.addEventListener('mouseleave', () => { card.style.borderColor = 'var(--border)'; card.style.background = 'var(--bg-secondary)'; });
          card.addEventListener('click', () => {
            const idx = parseInt(card.dataset.eidx, 10);
            const entry = entries.find(e => e.idx === idx);
            if (entry) renderMonthDetail(entry);
          });
        });
      }

      function setTimelineMode(yearSelected) {
        if (yearSelected) {
          monthWrap.style.display = '';
          calHost.style.display = '';
          allYearsList.style.display = 'none';
        } else {
          monthWrap.style.display = 'none';
          calHost.style.display = 'none';
          allYearsList.style.display = '';
        }
      }

      function renderCards() {
        const selYear = yearFilter.value;
        if (!selYear) {
          setTimelineMode(false);
          renderAllYearsCards();
          return;
        }
        setTimelineMode(true);
        let mi = parseInt(monthSelect.value, 10);
        if (!mi || mi < 1 || mi > calConfig.monthsPerYear || isNaN(mi)) {
          mi = firstMonthWithEntry(selYear);
          monthSelect.value = String(mi);
        }
        renderCalendarGrid(selYear, mi);
      }

      fillMonthSelect();
      // Default to "All Years" so the first view is the entry list; choosing a year shows the calendar grid.
      yearFilter.value = '';
      renderCards();

      yearFilter.addEventListener('change', () => {
        const y = yearFilter.value;
        if (!y) {
          renderCards();
          return;
        }
        monthSelect.value = String(firstMonthWithEntry(y));
        renderCards();
      });
      monthSelect.addEventListener('change', renderCards);
    }

    // ── Month Detail View ──
    function renderMonthDetail(entry) {
      const s = entry.stats;
      el.innerHTML = '';

      let html = '<div style="margin-bottom:0.75rem;">'
        + '<button class="btn-ghost" id="history-back-btn" style="font-size:0.8rem;padding:0.3rem 0.6rem;">\u2190 Back to Calendar</button>'
        + '</div>'
        + '<h3 style="color:var(--accent);font-family:\'Cinzel\',serif;font-size:1.1rem;margin-bottom:0.75rem;">' + entry.heading + '</h3>'
        + '<div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap;margin-bottom:0.75rem;">'
        + statBox(s.arrivals.length, 'ARRIVALS', '#5cb85c')
        + statBox(s.births.length, 'BIRTHS', '#47a3ff')
        + statBox(s.deaths.length, 'DEATHS', '#e05555')
        + statBox(s.events.length, 'EVENTS', 'var(--accent)')
        + '</div>'
        + '<div class="ws-tabs" style="display:flex;gap:0;border-bottom:1px solid var(--border);margin-bottom:0.75rem;">'
        + '<button class="ws-tab active" data-mtab="narrative">\uD83D\uDCDC Narrative</button>'
        + (s.arrivals.length ? '<button class="ws-tab" data-mtab="arrivals">\uD83E\uDDCD Arrivals (' + s.arrivals.length + ')</button>' : '')
        + (s.births.length ? '<button class="ws-tab" data-mtab="births">\uD83D\uDC76 Births (' + s.births.length + ')</button>' : '')
        + (s.deaths.length ? '<button class="ws-tab" data-mtab="deaths">\uD83D\uDC80 Deaths (' + s.deaths.length + ')</button>' : '')
        + '</div>';

      // Narrative
      const lines = entry.content.split('\n').filter(l => l.trim());
      html += '<div id="mtab-narrative" class="mtab-pane" style="max-height:50vh;overflow-y:auto;">'
        + lines.map(line => '<p style="font-size:0.82rem;color:var(--text-secondary);line-height:1.65;margin-bottom:0.4rem;">' + line.trim() + '</p>').join('')
        + '</div>';

      // Arrivals
      html += '<div id="mtab-arrivals" class="mtab-pane" style="display:none;max-height:50vh;overflow-y:auto;">';
      if (s.arrivals.length) {
        const rows = s.arrivals.map(name => {
          const ch = characters.find(c => c.name && c.name.toLowerCase().startsWith(name.toLowerCase()));
          return ch || { name };
        });
        html += '<table class="ws-res-table" style="width:100%;"><thead><tr><th>Name</th><th>Race</th><th>Class</th><th>Lvl</th></tr></thead><tbody>'
          + rows.map(c => '<tr><td style="color:var(--accent);font-weight:600;">' + (c.name||'') + '</td><td>' + (c.race||'?') + '</td><td>' + (c.class||'?') + '</td><td>' + (c.level||'?') + '</td></tr>').join('')
          + '</tbody></table>';
      }
      html += '</div>';

      // Births
      html += '<div id="mtab-births" class="mtab-pane" style="display:none;max-height:50vh;overflow-y:auto;">';
      if (s.births.length) {
        const rows = s.births.map(name => {
          const ch = characters.find(c => c.name && c.name.toLowerCase().startsWith(name.toLowerCase()));
          return ch || { name };
        });
        html += '<table class="ws-res-table" style="width:100%;"><thead><tr><th>Name</th><th>Race</th><th>Parents</th></tr></thead><tbody>'
          + rows.map(c => '<tr><td style="color:#47a3ff;font-weight:600;">' + (c.name||'') + '</td><td>' + (c.race||'?') + '</td><td>' + (c.class||'?') + '</td></tr>').join('')
          + '</tbody></table>';
      }
      html += '</div>';

      // Deaths
      html += '<div id="mtab-deaths" class="mtab-pane" style="display:none;max-height:50vh;overflow-y:auto;">';
      if (s.deaths.length) {
        const rows = s.deaths.map(name => {
          const ch = characters.find(c => c.name && c.name.toLowerCase().startsWith(name.toLowerCase()));
          return ch || { name };
        });
        html += '<table class="ws-res-table" style="width:100%;"><thead><tr><th>Name</th><th>Race</th><th>Class</th><th>Cause</th></tr></thead><tbody>'
          + rows.map(c => '<tr><td style="color:var(--text-muted);font-weight:600;">' + (c.name||'') + '</td><td>' + (c.race||'?') + '</td><td>' + (c.class||'?') + '</td><td style="color:var(--error);font-size:0.75rem;">' + (c.death_cause||'\u2014') + '</td></tr>').join('')
          + '</tbody></table>';
      }
      html += '</div>';

      el.innerHTML = html;

      // Tab switching
      el.querySelectorAll('.ws-tab[data-mtab]').forEach(tab => {
        tab.addEventListener('click', () => {
          el.querySelectorAll('.ws-tab[data-mtab]').forEach(t => t.classList.remove('active'));
          el.querySelectorAll('.mtab-pane').forEach(p => p.style.display = 'none');
          tab.classList.add('active');
          el.querySelector('#mtab-' + tab.dataset.mtab).style.display = '';
        });
      });

      // Back
      el.querySelector('#history-back-btn').addEventListener('click', renderTimeline);
    }

    renderTimeline();

  } catch (err) {
    el.innerHTML = '<p class="modal-error" style="display:block;">Failed to load history: ' + err.message + '</p>';
  }
}
