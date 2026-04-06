/**
 * Eon Weaver - Town Statistics View
 * Shows demographics, buildings (from DB), role distribution, and other town data.
 */
import { getState, setState } from '../stores/appState.js';
import { navigate } from '../router.js';
import { apiGetCharacters, normalizeCharacter } from '../api/characters.js';
import { apiGetTowns, apiGetHistory } from '../api/towns.js';


const BASE = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '') + '/api.php';

/* Building status → display info */
const STATUS_INFO = {
    completed: { icon: '✅', label: 'Completed', color: 'var(--success)' },
    under_construction: { icon: '🏗️', label: 'Building...', color: 'var(--warning)' },
    planned: { icon: '📋', label: 'Planned', color: 'var(--text-muted)' },
    damaged: { icon: '⚠️', label: 'Damaged', color: '#e05555' },
    destroyed: { icon: '💥', label: 'Destroyed', color: '#888' },
};

async function fetchBuildings(townId) {
    const token = localStorage.getItem('ws_token') || '';
    const res = await fetch(`${BASE}?action=get_buildings&town_id=${townId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    return data.buildings || [];
}

export default function TownStatsView(container, params) {
    const state = getState();
    const townId = params.id ? parseInt(params.id) : state.currentTownId;

    if (!townId) {
        container.innerHTML = '<div class="view-empty"><h2>No Town Selected</h2><p>Select a town from the <a href="/dev/dashboard">Dashboard</a> first.</p></div>';
        return;
    }

    container.innerHTML = `
    <div class="view-town-stats">
      <header class="view-header">
        <h1>Town Statistics</h1>
        <div class="view-header-right">
          <button class="btn-secondary btn-sm" id="stats-back-btn">Back to Town</button>
        </div>
      </header>
      <div class="stats-loading">Loading town data...</div>
    </div>`;

    container.querySelector('#stats-back-btn').addEventListener('click', () => {
        navigate('town/' + townId);
    });

    loadStats(container, townId);
}

async function loadStats(container, townId) {
    try {
        const [townsRes, charRes, historyRes, buildings] = await Promise.all([
            apiGetTowns(),
            apiGetCharacters(townId),
            apiGetHistory(townId).catch(() => ({ entries: [] })),
            fetchBuildings(townId),
        ]);
        const towns = Array.isArray(townsRes) ? townsRes : (townsRes.towns || []);
        const town = towns.find(t => t.id === townId) || { name: 'Unknown' };
        const characters = (charRes.characters || []).map(normalizeCharacter);
        renderStats(container, town, characters, buildings);
    } catch (err) {
        const el = container.querySelector('.stats-loading');
        if (el) el.innerHTML = '<span style="color:var(--error)">Failed to load: ' + err.message + '</span>';
    }
}

function renderStats(container, town, characters, buildings) {
    const alive = characters.filter(c => c.status === 'Alive');
    const deceased = characters.filter(c => c.status !== 'Alive');
    const males = alive.filter(c => c.gender === 'M');
    const females = alive.filter(c => c.gender === 'F');

    // Race distribution
    const raceCounts = {};
    alive.forEach(c => { raceCounts[c.race || 'Unknown'] = (raceCounts[c.race || 'Unknown'] || 0) + 1; });
    const raceEntries = Object.entries(raceCounts).sort((a, b) => b[1] - a[1]);

    // Class distribution
    const classCounts = {};
    alive.forEach(c => {
        classCounts[c.class || 'Unknown'] = (classCounts[c.class || 'Unknown'] || 0) + 1;
    });
    const classEntries = Object.entries(classCounts).sort((a, b) => b[1] - a[1]);

    // Age distribution
    const ageBrackets = { 'Children (0-15)': 0, 'Young (16-25)': 0, 'Adult (26-45)': 0, 'Middle-Aged (46-65)': 0, 'Elder (66+)': 0 };
    alive.forEach(c => {
        const age = c.age || 0;
        if (age <= 15) ageBrackets['Children (0-15)']++;
        else if (age <= 25) ageBrackets['Young (16-25)']++;
        else if (age <= 45) ageBrackets['Adult (26-45)']++;
        else if (age <= 65) ageBrackets['Middle-Aged (46-65)']++;
        else ageBrackets['Elder (66+)']++;
    });

    // Role distribution
    const roleCounts = {};
    alive.forEach(c => { roleCounts[c.role || 'Unassigned'] = (roleCounts[c.role || 'Unassigned'] || 0) + 1; });
    const roleEntries = Object.entries(roleCounts).sort((a, b) => b[1] - a[1]);

    // Average level
    let totalLevel = 0;
    alive.forEach(c => { totalLevel += parseInt(c.level) || 0; });
    const avgLevel = alive.length ? (totalLevel / alive.length).toFixed(1) : '0';

    // Marriages
    const married = alive.filter(c => c.spouse && c.spouse !== 'None');

    // Group buildings by status
    const completedBuildings = buildings.filter(b => b.status === 'completed');
    const constructionBuildings = buildings.filter(b => b.status === 'under_construction');
    const otherBuildings = buildings.filter(b => !['completed', 'under_construction'].includes(b.status));

    function barRow(label, count, total, cssClass) {
        const pct = total ? ((count / total) * 100).toFixed(1) : 0;
        return '<div class="stats-bar-row">' +
            '<span class="stats-bar-label">' + label + '</span>' +
            '<div class="stats-bar-track"><div class="stats-bar-fill ' + (cssClass || '') + '" style="width:' + pct + '%"></div></div>' +
            '<span class="stats-bar-value">' + count + ' (' + pct + '%)</span>' +
            '</div>';
    }

    function buildingCard(b) {
        const info = STATUS_INFO[b.status] || STATUS_INFO.planned;
        let progressBar = '';
        if (b.status === 'under_construction') {
            const pct = b.build_time > 0 ? Math.round((b.build_progress / b.build_time) * 100) : 0;
            progressBar = `<div class="building-progress-wrap">
                <div class="building-progress-bar"><div class="building-progress-fill" style="width:${pct}%"></div></div>
                <span class="building-progress-text">${b.build_progress}/${b.build_time} months (${pct}%)</span>
            </div>`;
        }
        return `<div class="stats-building-card building-status-${b.status}">
            <div class="stats-building-header">
                <span class="stats-building-name">${info.icon} ${b.name}</span>
                <span class="stats-building-status" style="color:${info.color}">${info.label}</span>
            </div>
            ${b.description ? `<div class="building-desc">${b.description}</div>` : ''}
            ${progressBar}
        </div>`;
    }

    const statsEl = container.querySelector('.view-town-stats');
    const loadEl = statsEl.querySelector('.stats-loading');
    if (loadEl) loadEl.remove();

    const el = document.createElement('div');
    el.className = 'stats-content';

    // --- Summary cards ---
    el.innerHTML = '<div class="stats-banner"><h2>' + town.name + '</h2></div>' +
        '<div class="stats-cards">' +
        '<div class="stat-card"><div class="stat-card-value">' + alive.length + '</div><div class="stat-card-label">Living Residents</div></div>' +
        '<div class="stat-card stat-card-muted"><div class="stat-card-value">' + deceased.length + '</div><div class="stat-card-label">Deceased</div></div>' +
        '<div class="stat-card"><div class="stat-card-value">' + males.length + ' / ' + females.length + '</div><div class="stat-card-label">Male / Female</div></div>' +
        '<div class="stat-card"><div class="stat-card-value">' + avgLevel + '</div><div class="stat-card-label">Avg Level</div></div>' +
        '<div class="stat-card"><div class="stat-card-value">' + married.length + '</div><div class="stat-card-label">Married</div></div>' +
        '<div class="stat-card"><div class="stat-card-value">' + completedBuildings.length + '</div><div class="stat-card-label">Buildings</div></div>' +
        (constructionBuildings.length ? '<div class="stat-card stat-card-warn"><div class="stat-card-value">' + constructionBuildings.length + '</div><div class="stat-card-label">Under Construction</div></div>' : '') +
        '</div>' +

        // --- Distribution grid ---
        '<div class="stats-grid">' +
        '<div class="stats-panel"><h3>Race Distribution</h3><div class="stats-bar-list">' +
        raceEntries.map(([r, c]) => barRow(r, c, alive.length, '')).join('') +
        '</div></div>' +

        '<div class="stats-panel"><h3>Class Distribution</h3><div class="stats-bar-list">' +
        classEntries.map(([c, n]) => barRow(c, n, alive.length, 'stats-bar-fill-class')).join('') +
        '</div></div>' +

        '<div class="stats-panel"><h3>Age Demographics</h3><div class="stats-bar-list">' +
        Object.entries(ageBrackets).map(([b, c]) => barRow(b, c, alive.length, 'stats-bar-fill-age')).join('') +
        '</div></div>' +

        '<div class="stats-panel"><h3>Roles</h3><div class="stats-bar-list stats-bar-scrollable">' +
        roleEntries.map(([r, c]) => barRow(r, c, alive.length, 'stats-bar-fill-role')).join('') +
        '</div></div>' +
        '</div>' +

        // --- Buildings ---
        '<div class="stats-buildings-section"><h3>🏛️ Buildings & Infrastructure (' + buildings.length + ')</h3>' +
        (buildings.length ?
            // Construction in progress first
            (constructionBuildings.length ?
                '<h4 class="building-group-title">🏗️ Under Construction</h4>' +
                '<div class="stats-buildings-grid">' + constructionBuildings.map(buildingCard).join('') + '</div>'
                : '') +
            // Completed buildings
            (completedBuildings.length ?
                '<h4 class="building-group-title">✅ Completed</h4>' +
                '<div class="stats-buildings-grid">' + completedBuildings.map(buildingCard).join('') + '</div>'
                : '') +
            // Damaged / destroyed / other
            (otherBuildings.length ?
                '<h4 class="building-group-title">⚠️ Other</h4>' +
                '<div class="stats-buildings-grid">' + otherBuildings.map(buildingCard).join('') + '</div>'
                : '')
            : '<div class="stats-empty">No buildings yet. Run simulations to develop the town\'s infrastructure over time.</div>') +
        '</div>';

    statsEl.appendChild(el);
}
