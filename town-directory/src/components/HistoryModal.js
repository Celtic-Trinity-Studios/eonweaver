/**
 * Eon Weaver — Town History Modal
 * Timeline view with per-month stat breakdowns
 */
import { apiGetHistory } from '../api/towns.js';
import { apiGetCharacters } from '../api/characters.js';

export async function openHistoryModal(townId) {
  const { showModal } = await import('./Modal.js');

  const { el, close } = showModal({
    title: '📜 Town History',
    width: 'wide',
    content: '<p class="muted">Loading history...</p>'
  });

  try {
    const [histRes, charRes] = await Promise.all([
      apiGetHistory(townId),
      apiGetCharacters(townId)
    ]);
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

    const parseHeading = (heading) => {
      if (!heading) return { month: '', year: '' };
      const m1 = heading.match(/^([A-Za-z]+),?\s+(\d+)\s*\w*/);
      if (m1) return { month: m1[1], year: m1[2] };
      const m2 = heading.match(/(\d{3,})/);
      if (m2) return { month: '', year: m2[1] };
      return { month: '', year: '' };
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

    // Build entries
    const entries = history.map((h, i) => {
      const parsed = parseHeading(h.heading);
      const content = cleanContent(h.content);
      const stats = parseNarrativeStats(content);
      return { heading: h.heading || 'Untitled', content, month: parsed.month, year: parsed.year, idx: i, stats };
    }).filter(e => e.content || e.heading);

    const years = [...new Set(entries.map(e => e.year).filter(Boolean))].sort((a, b) => parseInt(b) - parseInt(a));

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
        + '<button class="ws-tab active" data-htab="timeline">📜 Timeline (' + entries.length + ')</button>'
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
        + '</select></div></div>'
        + '<div id="history-timeline-list" style="max-height:55vh;overflow-y:auto;"></div>'
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

      const listEl = el.querySelector('#history-timeline-list');
      const yearFilter = el.querySelector('#history-year-filter');

      function renderCards() {
        const selYear = yearFilter.value;
        const filtered = entries.filter(e => !selYear || e.year === selYear);
        if (!filtered.length) {
          listEl.innerHTML = '<p class="muted" style="text-align:center;padding:1rem;">No entries for that year.</p>';
          return;
        }
        listEl.innerHTML = filtered.map(entry => {
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

        listEl.querySelectorAll('.history-month-card').forEach(card => {
          card.addEventListener('mouseenter', () => { card.style.borderColor = 'var(--accent)'; card.style.background = 'var(--bg-hover)'; });
          card.addEventListener('mouseleave', () => { card.style.borderColor = 'var(--border)'; card.style.background = 'var(--bg-secondary)'; });
          card.addEventListener('click', () => {
            const idx = parseInt(card.dataset.eidx);
            const entry = entries.find(e => e.idx === idx);
            if (entry) renderMonthDetail(entry);
          });
        });
      }

      renderCards();
      yearFilter.addEventListener('change', renderCards);
    }

    // ── Month Detail View ──
    function renderMonthDetail(entry) {
      const s = entry.stats;
      el.innerHTML = '';

      let html = '<div style="margin-bottom:0.75rem;">'
        + '<button class="btn-ghost" id="history-back-btn" style="font-size:0.8rem;padding:0.3rem 0.6rem;">\u2190 Back to Timeline</button>'
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
