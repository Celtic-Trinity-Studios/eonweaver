/**
 * Town Directory — Data Layer (API Client)
 * All data operations go through the PHP backend.
 */

const API = 'api.php';

/* ── API Helper ──────────────────────────────────────────── */
async function apiFetch(action, options = {}) {
    const method = options.method || 'GET';
    const params = options.params || {};
    const body = options.body || null;

    let url = `${API}?action=${action}`;
    for (const [k, v] of Object.entries(params)) {
        url += `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
    }

    const fetchOpts = { method, credentials: 'same-origin' };
    if (body) {
        fetchOpts.headers = { 'Content-Type': 'application/json' };
        fetchOpts.body = JSON.stringify(body);
    }

    const res = await fetch(url, fetchOpts);
    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        throw new Error(`Server error (${res.status}): ${text.substring(0, 200) || 'empty response'}`);
    }
    if (!res.ok || data.error) {
        throw new Error(data.error || `API error ${res.status}`);
    }
    return data;
}

/* ── Auth ─────────────────────────────────────────────────── */
async function apiLogin(login, password) {
    return apiFetch('login', { method: 'POST', body: { login, password } });
}

async function apiRegister(username, email, password) {
    return apiFetch('register', { method: 'POST', body: { username, email, password } });
}

async function apiLogout() {
    return apiFetch('logout', { method: 'POST' });
}

async function apiGetCurrentUser() {
    return apiFetch('me');
}

/* ── Towns ────────────────────────────────────────────────── */
async function apiGetTowns() {
    return apiFetch('towns');
}

async function apiCreateTown(name, subtitle) {
    return apiFetch('create_town', { method: 'POST', body: { name, subtitle } });
}

async function apiUpdateTown(townId, name, subtitle) {
    return apiFetch('update_town', { method: 'POST', body: { town_id: townId, name, subtitle } });
}

async function apiDeleteTown(townId) {
    return apiFetch('delete_town', { method: 'POST', body: { town_id: townId } });
}

/* ── Characters ───────────────────────────────────────────── */
async function apiGetCharacters(townId) {
    return apiFetch('characters', { params: { town_id: townId } });
}

async function apiSaveCharacter(townId, character) {
    return apiFetch('save_character', { method: 'POST', body: { town_id: townId, character } });
}

async function apiDeleteCharacter(townId, characterId) {
    return apiFetch('delete_character', { method: 'POST', body: { town_id: townId, character_id: characterId } });
}

/* ── History ──────────────────────────────────────────────── */
async function apiGetHistory(townId) {
    return apiFetch('history', { params: { town_id: townId } });
}

async function apiSaveHistory(townId, entries) {
    return apiFetch('save_history', { method: 'POST', body: { town_id: townId, entries } });
}

/* ── Town Metadata ────────────────────────────────────────── */
async function apiGetMeta(townId) {
    return apiFetch('town_meta', { params: { town_id: townId } });
}

async function apiSaveMeta(townId, key, value) {
    return apiFetch('save_meta', { method: 'POST', body: { town_id: townId, key, value } });
}

/* ── SRD Reference ────────────────────────────────────────── */
async function apiGetSrdRaces() { return apiFetch('srd_races'); }
async function apiGetSrdClasses() { return apiFetch('srd_classes'); }
async function apiGetSrdSkills() { return apiFetch('srd_skills'); }
async function apiGetSrdFeats(search = '') {
    return apiFetch('srd_feats', { params: search ? { search } : {} });
}
async function apiGetSrdEquipment(category = '') {
    return apiFetch('srd_equipment', { params: category ? { category } : {} });
}

/* ── Town Settings (Meta) ─────────────────────────────────── */
async function apiGetTownMeta(townId) {
    return apiFetch('town_meta', { params: { town_id: townId } });
}
async function apiSaveTownMeta(townId, key, value) {
    return apiFetch('save_meta', { method: 'POST', body: { town_id: townId, key, value } });
}

/* ── Character Data Normalization ─────────────────────────── */
function normalizeCharacter(r) {
    return {
        id: r.id,
        dbId: r.id,
        name: r.name || '',
        race: r.race || '',
        class: r.class || '',
        status: r.status || 'Alive',
        title: r.title || '',
        gender: r.gender || '',
        spouse: r.spouse || 'None',
        spouseLabel: r.spouse_label || '',
        age: r.age ? String(r.age) : '',
        xp: r.xp ? String(r.xp) : '',
        cr: r.cr || '',
        ecl: r.ecl || '',
        hp: r.hp ? String(r.hp) : '',
        hd: r.hd || '',
        ac: r.ac || '',
        init: r.init || '',
        spd: r.spd || '',
        grapple: r.grapple || '',
        atk: r.atk || '',
        alignment: r.alignment || '',
        saves: r.saves || '',
        str: r.str ? String(r.str) : '',
        dex: r.dex ? String(r.dex) : '',
        con: r.con ? String(r.con) : '',
        int_: r.int_ ? String(r.int_) : '',
        wis: r.wis ? String(r.wis) : '',
        cha: r.cha ? String(r.cha) : '',
        languages: r.languages || '',
        skills_feats: r.skills_feats || '',
        feats: r.feats || '',
        gear: r.gear || '',
        role: r.role || '',
        history: r.history || '',
        portrait_url: r.portrait_url || ''
    };
}

/* ── Campaign Rules ──────────────────────────────────────────── */
async function apiGetCampaignRules() {
    return apiFetch('get_campaign_rules');
}

async function apiSaveCampaignRules(rulesText) {
    return apiFetch('save_campaign_rules', { method: 'POST', body: { rules_text: rulesText } });
}

/* ── Site Settings ───────────────────────────────────────────── */
async function apiGetSettings() {
    return apiFetch('get_settings');
}

async function apiSaveSetting(key, value) {
    return apiFetch('save_settings', { method: 'POST', body: { key, value } });
}

/* ── Simulation ──────────────────────────────────────────────── */
const SIM_API = 'simulate.php';

async function apiRunSimulation(townId, months, rules, instructions) {
    const res = await fetch(`${SIM_API}?action=run_simulation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ town_id: townId, months, rules, instructions })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || `API error ${res.status}`);
    return data;
}

async function apiApplySimulation(townId, changes, historyEntry, monthsElapsed = 0) {
    const res = await fetch(`${SIM_API}?action=apply_simulation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ town_id: townId, changes, history_entry: historyEntry, months_elapsed: monthsElapsed })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || `API error ${res.status}`);
    return data;
}

async function apiRunWorldSimulation(months, rules, instructions) {
    const res = await fetch(`${SIM_API}?action=simulate_world`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ months, rules, instructions })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || `API error ${res.status}`);
    return data;
}

/* ── Calendar ─────────────────────────────────────────────── */
async function apiGetCalendar() {
    return apiFetch('get_calendar');
}

async function apiSaveCalendar(calendar) {
    return apiFetch('save_calendar', { method: 'POST', body: { calendar } });
}

/* ── Calendar Utilities ─────────────────────────────────── */
function calendarToString(cal) {
    if (!cal) return 'Unknown Date';
    const names = Array.isArray(cal.month_names) ? cal.month_names : [];
    const monthName = names[(cal.current_month - 1)] || `Month ${cal.current_month}`;
    const day = cal.current_day || 1;
    const era = cal.era_name || '';
    return `${day} ${monthName}, ${cal.current_year}${era ? ' ' + era : ''}`;
}
