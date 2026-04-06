/**
 * Town Directory — Split-Panel App (Multi-User)
 */
(function () {
    'use strict';

    let currentUser = null;
    let currentTown = null;
    let currentTownId = null;
    let activeRaceFilter = null;
    let activeStatusFilter = null;
    let searchQuery = '';
    const appState = { calendar: null };

    // Expand D&D class abbreviations and strip CR info
    const CLASS_NAMES = {
        'ftr': 'Fighter', 'rog': 'Rogue', 'clr': 'Cleric', 'wiz': 'Wizard',
        'sor': 'Sorcerer', 'bar': 'Barbarian', 'brd': 'Bard', 'drd': 'Druid',
        'mnk': 'Monk', 'pal': 'Paladin', 'rgr': 'Ranger', 'exp': 'Expert',
        'com': 'Commoner', 'war': 'Warrior', 'ari': 'Aristocrat', 'adp': 'Adept',
        'nec': 'Necromancer', 'enc': 'Enchanter', 'ill': 'Illusionist',
        'con': 'Conjurer', 'div': 'Diviner', 'evo': 'Evoker', 'abj': 'Abjurer',
        'tra': 'Transmuter', 'art': 'Artificer', 'hex': 'Hexblade',
        'duskblade': 'Duskblade', 'swashbuckler': 'Swashbuckler'
    };

    function parseClass(cls) {
        if (!cls) return { name: '', level: '1' };
        // Strip CR info: e.g. "Ftr: CR 1" → just take part before ':'
        const noCR = cls.split(':')[0].trim();
        // Extract trailing number as level
        const lvlMatch = noCR.match(/\d+/);
        const level = lvlMatch ? lvlMatch[0] : '1';
        // Strip digits for class name
        const raw = noCR.replace(/\d+/g, '').trim();
        // Expand abbreviation (case-insensitive)
        const expanded = CLASS_NAMES[raw.toLowerCase()] || raw;
        return { name: expanded, level };
    }

    let selectedCharId = null;
    let activeTab = 'combat';
    let sortCol = 'name', sortDir = 'asc';
    let pendingImport = null;
    let selectedAttackIdx = 0;

    // ── D&D 3.5 Weapon Database ───────────────────────────────
    const WEAPON_DB = {
        'dagger': { dmg: '1d4', crit: '19-20/\u00d72', type: 'P', cat: 'Light', size: 'T', ranged: false },
        'handaxe': { dmg: '1d6', crit: '20/\u00d73', type: 'S', cat: 'Light', size: 'S', ranged: false },
        'shortsword': { dmg: '1d6', crit: '19-20/\u00d72', type: 'P', cat: 'Light', size: 'S', ranged: false },
        'sickle': { dmg: '1d6', crit: '20/\u00d72', type: 'S', cat: 'Light', size: 'S', ranged: false },
        'light mace': { dmg: '1d6', crit: '20/\u00d72', type: 'B', cat: 'Light', size: 'S', ranged: false },
        'light hammer': { dmg: '1d4', crit: '20/\u00d72', type: 'B', cat: 'Light', size: 'S', ranged: false },
        'kukri': { dmg: '1d4', crit: '18-20/\u00d72', type: 'S', cat: 'Light', size: 'S', ranged: false },
        'longsword': { dmg: '1d8', crit: '19-20/\u00d72', type: 'S', cat: '1-Handed', size: 'M', ranged: false },
        'rapier': { dmg: '1d6', crit: '18-20/\u00d72', type: 'P', cat: '1-Handed', size: 'M', ranged: false },
        'scimitar': { dmg: '1d6', crit: '18-20/\u00d72', type: 'S', cat: '1-Handed', size: 'M', ranged: false },
        'battleaxe': { dmg: '1d8', crit: '20/\u00d73', type: 'S', cat: '1-Handed', size: 'M', ranged: false },
        'mace': { dmg: '1d8', crit: '20/\u00d72', type: 'B', cat: '1-Handed', size: 'M', ranged: false },
        'heavy mace': { dmg: '1d8', crit: '20/\u00d72', type: 'B', cat: '1-Handed', size: 'M', ranged: false },
        'morningstar': { dmg: '1d8', crit: '20/\u00d72', type: 'B&P', cat: '1-Handed', size: 'M', ranged: false },
        'shortspear': { dmg: '1d6', crit: '20/\u00d72', type: 'P', cat: '1-Handed', size: 'M', ranged: false },
        'warhammer': { dmg: '1d8', crit: '20/\u00d73', type: 'B', cat: '1-Handed', size: 'M', ranged: false },
        'flail': { dmg: '1d8', crit: '20/\u00d72', type: 'B', cat: '1-Handed', size: 'M', ranged: false },
        'bastard sword': { dmg: '1d10', crit: '19-20/\u00d72', type: 'S', cat: '1-Handed', size: 'M', ranged: false },
        'trident': { dmg: '1d8', crit: '20/\u00d72', type: 'P', cat: '1-Handed', size: 'M', ranged: false },
        'club': { dmg: '1d6', crit: '20/\u00d72', type: 'B', cat: '1-Handed', size: 'M', ranged: false },
        'greatsword': { dmg: '2d6', crit: '19-20/\u00d72', type: 'S', cat: '2-Handed', size: 'M', ranged: false },
        'greataxe': { dmg: '1d12', crit: '20/\u00d73', type: 'S', cat: '2-Handed', size: 'M', ranged: false },
        'falchion': { dmg: '2d4', crit: '18-20/\u00d72', type: 'S', cat: '2-Handed', size: 'M', ranged: false },
        'spear': { dmg: '1d8', crit: '20/\u00d73', type: 'P', cat: '2-Handed', size: 'M', ranged: false },
        'quarterstaff': { dmg: '1d6', crit: '20/\u00d72', type: 'B', cat: '2-Handed', size: 'M', ranged: false },
        'glaive': { dmg: '1d10', crit: '20/\u00d73', type: 'S', cat: '2-Handed', size: 'M', ranged: false },
        'halberd': { dmg: '1d10', crit: '20/\u00d73', type: 'P&S', cat: '2-Handed', size: 'M', ranged: false },
        'heavy flail': { dmg: '1d10', crit: '19-20/\u00d72', type: 'B', cat: '2-Handed', size: 'M', ranged: false },
        'greatclub': { dmg: '1d10', crit: '20/\u00d72', type: 'B', cat: '2-Handed', size: 'M', ranged: false },
        'scythe': { dmg: '2d4', crit: '20/\u00d74', type: 'P&S', cat: '2-Handed', size: 'M', ranged: false },
        'longbow': { dmg: '1d8', crit: '20/\u00d73', type: 'P', cat: '2-Handed', size: 'M', ranged: true },
        'shortbow': { dmg: '1d6', crit: '20/\u00d73', type: 'P', cat: '2-Handed', size: 'S', ranged: true },
        'composite longbow': { dmg: '1d8', crit: '20/\u00d73', type: 'P', cat: '2-Handed', size: 'M', ranged: true },
        'composite shortbow': { dmg: '1d6', crit: '20/\u00d73', type: 'P', cat: '2-Handed', size: 'S', ranged: true },
        'light crossbow': { dmg: '1d8', crit: '19-20/\u00d72', type: 'P', cat: '2-Handed', size: 'S', ranged: true },
        'heavy crossbow': { dmg: '1d10', crit: '19-20/\u00d72', type: 'P', cat: '2-Handed', size: 'M', ranged: true },
        'crossbow': { dmg: '1d8', crit: '19-20/\u00d72', type: 'P', cat: '2-Handed', size: 'M', ranged: true },
        'hand crossbow': { dmg: '1d4', crit: '19-20/\u00d72', type: 'P', cat: 'Light', size: 'T', ranged: true },
        'javelin': { dmg: '1d6', crit: '20/\u00d72', type: 'P', cat: '1-Handed', size: 'M', ranged: true },
        'sling': { dmg: '1d4', crit: '20/\u00d72', type: 'B', cat: '2-Handed', size: 'S', ranged: true },
        'throwing axe': { dmg: '1d6', crit: '20/\u00d72', type: 'S', cat: 'Light', size: 'S', ranged: true },
        'pitchfork': { dmg: '1d6', crit: '20/\u00d72', type: 'P', cat: '2-Handed', size: 'M', ranged: false },
        'shovel': { dmg: '1d6', crit: '20/\u00d72', type: 'B', cat: '2-Handed', size: 'M', ranged: false },
    };

    function calcBAB(clsName, lvl) {
        const n = String(clsName).toLowerCase();
        if (/fighter|warrior|paladin|ranger|barbarian/.test(n)) return lvl;
        if (/cleric|druid|rogue|expert|aristocrat|bard|monk/.test(n)) return Math.floor(lvl * 3 / 4);
        return Math.floor(lvl / 2);
    }

    function calcAttackBonuses(bab, atkMod) {
        const t = bab + atkMod;
        const r = [t];
        if (bab >= 6) r.push(t - 5);
        if (bab >= 11) r.push(t - 10);
        if (bab >= 16) r.push(t - 15);
        return r;
    }

    function parseGearWeapons(gear, c) {
        if (!gear) return [];
        const { name: clsName, level: lvlStr } = parseClass(c.class);
        const lvl = parseInt(lvlStr) || 1;
        const bab = calcBAB(clsName, lvl);
        const strMod = Math.floor(((parseInt(c.str) || 10) - 10) / 2);
        const dexMod = Math.floor(((parseInt(c.dex) || 10) - 10) / 2);
        const attacks = [];
        const seen = new Set();
        const gearLow = (gear || '').toLowerCase();
        // Sort longest first to match "heavy flail" before "flail"
        const wNames = Object.keys(WEAPON_DB).sort((a, b) => b.length - a.length);
        for (const wn of wNames) {
            if (gearLow.includes(wn) && !seen.has(wn)) {
                seen.add(wn);
                const w = WEAPON_DB[wn];
                const atkMod = w.ranged ? dexMod : strMod;
                const dmgMod = w.ranged ? 0 : (w.cat === '2-Handed' ? Math.floor(strMod * 1.5) : (w.cat === 'Light' ? Math.floor(strMod * 0.5) : strMod));
                const bonuses = calcAttackBonuses(bab, atkMod);
                const dm = dmgMod > 0 ? `${w.dmg}+${dmgMod}` : dmgMod < 0 ? `${w.dmg}${dmgMod}` : w.dmg;
                const label = wn.split(' ').map(x => x[0].toUpperCase() + x.slice(1)).join(' ');
                attacks.push({ name: label, bonuses, damage: dm, damageType: w.type, type: w.ranged ? 'Ranged' : 'Melee', crit: w.crit, size: w.size, cat: w.cat });
            }
        }
        return attacks;
    }


    const RACE_COLORS = {
        'Human': 'var(--race-human)', 'Dwarf': 'var(--race-dwarf)', 'Elf': 'var(--race-elf)',
        'Halfling': 'var(--race-halfling)', 'Gnome': 'var(--race-gnome)',
        'Half-Orc': 'var(--race-half-orc)', 'Half-Elf': 'var(--race-half-elf)'
    };

    /* ══════════════════════════════════════════════════════════
       INIT
       ══════════════════════════════════════════════════════════ */
    document.addEventListener('DOMContentLoaded', async () => {
        bindAuthEvents();
        try {
            const res = await apiGetCurrentUser();
            if (res.ok && res.user) {
                currentUser = res.user;
                showApp();
            }
            // Auth screen is visible by default, so no else needed
        } catch (err) {
            console.warn('Auth check failed, showing login:', err);
            // Auth screen is already visible by default
        }
    });

    function showAuth() {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    }

    async function showApp() {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('main-app').style.display = '';
        document.getElementById('user-info').textContent = currentUser.username;
        await loadTowns();
        bindEvents();
        // Load calendar
        try {
            const calRes = await apiGetCalendar();
            if (calRes.calendar) { appState.calendar = calRes.calendar; updateCalendarDisplay(); }
        } catch (e) { /* ignore */ }
    }

    function updateCalendarDisplay() {
        const el = document.getElementById('calendar-display');
        if (el && appState.calendar) el.textContent = calendarToString(appState.calendar);
    }

    async function loadTowns() {
        try {
            const res = await apiGetTowns();
            const towns = res.towns || [];
            buildTownSelector(towns);
            if (towns.length > 0) {
                await selectTown(towns[0].id);
            } else {
                renderEmptyDetail();
            }
        } catch (err) {
            console.error('Failed to load towns:', err);
        }
    }

    /* ══════════════════════════════════════════════════════════
       AUTH EVENTS
       ══════════════════════════════════════════════════════════ */
    function bindAuthEvents() {
        document.getElementById('show-register').addEventListener('click', e => {
            e.preventDefault();
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('register-form').style.display = '';
            document.getElementById('auth-error').style.display = 'none';
        });
        document.getElementById('show-login').addEventListener('click', e => {
            e.preventDefault();
            document.getElementById('register-form').style.display = 'none';
            document.getElementById('login-form').style.display = '';
            document.getElementById('auth-error').style.display = 'none';
        });

        document.getElementById('login-form').addEventListener('submit', async e => {
            e.preventDefault();
            const login = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;
            try {
                const res = await apiLogin(login, password);
                currentUser = res.user;
                showApp();
            } catch (err) {
                showAuthError(err.message);
            }
        });

        document.getElementById('register-form').addEventListener('submit', async e => {
            e.preventDefault();
            const username = document.getElementById('reg-username').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;
            try {
                const res = await apiRegister(username, email, password);
                currentUser = res.user;
                showApp();
            } catch (err) {
                showAuthError(err.message);
            }
        });

        document.getElementById('logout-btn').addEventListener('click', async () => {
            await apiLogout();
            currentUser = null;
            currentTown = null;
            currentTownId = null;
            showAuth();
        });
    }

    function showAuthError(msg) {
        const el = document.getElementById('auth-error');
        el.textContent = msg;
        el.style.display = 'block';
    }

    /* ══════════════════════════════════════════════════════════
       TOWN MANAGEMENT
       ══════════════════════════════════════════════════════════ */
    function buildTownSelector(towns) {
        const sel = document.getElementById('town-select');
        sel.innerHTML = '';
        if (towns.length === 0) {
            const o = document.createElement('option');
            o.value = ''; o.textContent = 'No towns yet';
            sel.appendChild(o);
            return;
        }
        for (const t of towns) {
            const o = document.createElement('option');
            o.value = t.id; o.textContent = t.name;
            sel.appendChild(o);
        }
    }

    async function selectTown(id) {
        currentTownId = id;
        try {
            const [charRes, histRes, metaRes] = await Promise.all([
                apiGetCharacters(id),
                apiGetHistory(id),
                apiGetMeta(id)
            ]);
            const characters = (charRes.characters || []).map(normalizeCharacter);
            const history = histRes.history || [];
            const meta = metaRes.meta || {};

            // Get town name from selector
            const sel = document.getElementById('town-select');
            const opt = sel.querySelector(`option[value="${id}"]`);
            const townName = opt ? opt.textContent : 'Town';

            currentTown = { id, name: townName, subtitle: meta.subtitle || '', characters, history };
            document.title = `Town Directory — ${currentTown.name}`;
            activeRaceFilter = null; activeStatusFilter = null;
            searchQuery = ''; selectedCharId = null;
            sortCol = 'name'; sortDir = 'asc';
            document.getElementById('search-input').value = '';
            renderFilters();
            renderListHeader();
            renderList();
            renderStatsBar();
            renderTownHistory();
            renderEmptyDetail();
        } catch (err) {
            console.error('Failed to load town:', err);
        }
    }

    /* ══════════════════════════════════════════════════════════
       FILTERS
       ══════════════════════════════════════════════════════════ */
    function renderFilters() {
        const chars = currentTown ? currentTown.characters : [];
        const races = [...new Set(chars.map(c => c.race).filter(Boolean))].sort();
        const raceBox = document.getElementById('race-filters');
        raceBox.innerHTML = races.map(r => {
            const active = activeRaceFilter === r ? 'active' : '';
            return `<button class="filter-chip ${active}" data-race="${r}">${r}</button>`;
        }).join('');

        const statusBox = document.getElementById('status-filters');
        const statuses = [...new Set(chars.map(c => c.status).filter(Boolean))].sort();
        statusBox.innerHTML = statuses.map(s => {
            const active = activeStatusFilter === s ? 'active' : '';
            return `<button class="filter-chip ${active}" data-status="${s}">${s}</button>`;
        }).join('');

        const titles = [...new Set(chars.map(c => c.title).filter(Boolean))].sort();
        if (titles.length) {
            titles.forEach(t => {
                statusBox.innerHTML += `<button class="filter-chip" data-status="${t}">${t}</button>`;
            });
        }
    }

    /* ══════════════════════════════════════════════════════════
       LIST RENDERING
       ══════════════════════════════════════════════════════════ */
    function renderListHeader() {
        const cols = [
            { key: 'name', label: 'Name', cls: 'col-name' },
            { key: 'level', label: 'Lvl', cls: 'col-lvl' },
            { key: 'age', label: 'Age', cls: 'col-age' },
            { key: 'hp', label: 'HP', cls: 'col-hp' },
            { key: 'ac', label: 'AC', cls: 'col-ac' },
            { key: 'alignment', label: 'AL', cls: 'col-al' }
        ];
        const hdr = document.getElementById('list-header');
        hdr.innerHTML = cols.map(c => {
            const active = sortCol === c.key ? 'sort-active' : '';
            let arrow = '';
            if (sortCol === c.key) arrow = sortDir === 'asc' ? ' ▲' : ' ▼';
            return `<span class="sort-col ${c.cls} ${active}" data-sort="${c.key}">${c.label}${arrow}</span>`;
        }).join('');
    }

    function filteredChars() {
        if (!currentTown) return [];
        let list = currentTown.characters;
        if (activeRaceFilter) list = list.filter(c => c.race === activeRaceFilter);
        if (activeStatusFilter) {
            list = list.filter(c => c.status === activeStatusFilter || c.title === activeStatusFilter);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.race.toLowerCase().includes(q) ||
                c.class.toLowerCase().includes(q) ||
                (c.role || '').toLowerCase().includes(q)
            );
        }
        // Sort
        list = [...list].sort((a, b) => {
            let va, vb;
            if (sortCol === 'level') {
                va = parseInt((a.class || '').match(/\d+/)?.[0]) || 1;
                vb = parseInt((b.class || '').match(/\d+/)?.[0]) || 1;
            } else {
                va = a[sortCol] ?? ''; vb = b[sortCol] ?? '';
            }
            if (sortCol === 'age' || sortCol === 'hp' || sortCol === 'level') {
                va = parseInt(va) || 0; vb = parseInt(vb) || 0;
            } else if (sortCol === 'ac') {
                va = parseInt(String(va).split(',')[0]) || 0;
                vb = parseInt(String(vb).split(',')[0]) || 0;
            } else {
                va = String(va).toLowerCase(); vb = String(vb).toLowerCase();
            }
            if (va < vb) return sortDir === 'asc' ? -1 : 1;
            if (va > vb) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        return list;
    }

    function renderList() {
        const body = document.getElementById('list-body');
        const list = filteredChars();
        body.innerHTML = list.map(c => {
            const active = c.id == selectedCharId ? 'active' : '';
            const deceased = c.status === 'Deceased' ? 'deceased' : '';
            const badgeCls = c.title === 'Mayor' ? 'mayor' : (c.status === 'Deceased' ? 'deceased' : 'alive');
            const acNum = String(c.ac || '').split(',')[0] || '—';
            const lvl = parseClass(c.class).level;
            const clsName = parseClass(c.class).name;
            return `<div class="char-row ${active} ${deceased}" data-id="${c.id}">
                <span class="row-badge ${badgeCls}"></span>
                <span class="row-name">${c.name}</span>
                <span class="row-lvl" title="${clsName}">${lvl}</span>
                <span class="row-age">${c.age || '—'}</span>
                <span class="row-hp">${c.hp || '—'}</span>
                <span class="row-ac">${acNum}</span>
                <span class="row-al">${c.alignment || '—'}</span>
            </div>`;
        }).join('');
    }

    function renderStatsBar() {
        const bar = document.getElementById('stats-bar');
        if (!currentTown) { bar.innerHTML = ''; return; }
        const chars = currentTown.characters;
        const total = chars.length;
        const alive = chars.filter(c => c.status === 'Alive').length;
        const dead = total - alive;
        const races = new Set(chars.map(c => c.race).filter(Boolean)).size;
        bar.innerHTML = `
            <span class="stat-pill">Total <span class="stat-value">${total}</span></span>
            <span class="stat-pill">${alive} <span class="stat-value">Alive</span></span>
            <span class="stat-pill">${dead} <span class="stat-value">Fallen</span></span>
            <span class="stat-pill">${races} <span class="stat-value">Races</span></span>`;
    }

    // ── Attack parser ─────────────────────────────────────────
    function parseAttacks(atkStr) {
        if (!atkStr) return [];
        // Split on commas that are NOT inside parentheses
        const parts = atkStr.split(/,(?![^(]*\))/);
        return parts.map(p => {
            p = p.trim();
            const atk = { name: 'Attack', bonuses: [], damage: '', type: 'Melee' };
            const dmgM = p.match(/\(([^)]+)\)/);
            if (dmgM) atk.damage = dmgM[1].split('/')[0].trim();
            const noP = p.replace(/\([^)]*\)/g, '').replace(/melee|ranged|thrown|touch/gi, '').trim();
            if (/ranged|thrown|missile/i.test(p)) atk.type = 'Ranged';
            const bonM = noP.match(/([+-]?\d+(?:\/[+-]?\d+)*)/);
            if (bonM) {
                atk.bonuses = bonM[1].split('/').map(b => parseInt(b));
                const ni = noP.lastIndexOf(bonM[1]);
                const nm = noP.substring(0, ni).replace(/[+-]$/, '').trim();
                if (nm) atk.name = nm;
            } else if (atk.damage) {
                atk.name = noP.trim() || 'Attack';
                atk.bonuses = [0];
            }
            return atk;
        }).filter(a => a.bonuses.length > 0 || a.damage);
    }

    function rollDice(formula) {
        const m = String(formula).match(/(\d+)d(\d+)\s*([+-]\s*\d+)?/i);
        if (!m) { const f = parseInt(formula); return { total: isNaN(f) ? 0 : f, breakdown: String(formula) }; }
        const cnt = parseInt(m[1]), sides = parseInt(m[2]);
        const mod = m[3] ? parseInt(m[3].replace(/\s/g, '')) : 0;
        const rolls = Array.from({ length: cnt }, () => Math.floor(Math.random() * sides) + 1);
        const total = rolls.reduce((a, b) => a + b, 0) + mod;
        const bd = `[${rolls.join('+')}]${mod > 0 ? '+' + mod : mod < 0 ? mod : ''} = ${total}`;
        return { total, breakdown: bd };
    }

    function renderAttackPanelContent(panel, c, attacks, idx) {
        const atk = attacks[idx];
        const isMelee = atk.type !== 'Ranged';

        // Weapon list
        const weaponList = attacks.map((a, i) =>
            `<div class="atk-list-item ${i === idx ? 'active' : ''}" data-idx="${i}">${a.name}</div>`
        ).join('');

        // 5 attack slot buttons (exact DM Genie style)
        const MAX_ATKS = 5;
        const atkBtns = Array.from({ length: MAX_ATKS }, (_, i) => {
            if (i < atk.bonuses.length) {
                const b = atk.bonuses[i];
                const bs = b >= 0 ? '+' + b : '' + b;
                return `<button class="atk-roll-btn" data-bonus="${b}">${i + 1}: ${bs}</button>`;
            }
            return `<button class="atk-roll-btn atk-btn-noatk" disabled>No #${i + 1}</button>`;
        }).join('');

        const { name: clsName, level: lvl } = parseClass(c.class);
        const acVal = String(c.ac || '?').split(',')[0];

        const R = (name, val, checked) =>
            `<label class="atk-radio-item"><input type="radio" name="${name}${idx}" value="${val}" ${checked ? 'checked' : ''}> ${val}</label>`;

        panel.innerHTML = `
        <div class="atk-header">
            <span class="atk-char-name">${c.name}</span>
            <span class="atk-char-sub">${clsName} ${lvl} &middot; HP <strong>${c.hp || '?'}</strong> &middot; AC <strong>${acVal}</strong></span>
        </div>
        <div class="atk-dg-body">
            <div class="atk-dg-left">
                <div class="atk-dg-list">${weaponList}</div>
                <div class="atk-dg-list-btns">
                    <button class="atk-sm-btn">Remove</button>
                    <button class="atk-sm-btn">Add New</button>
                </div>
            </div>
            <div class="atk-dg-center">
                <div class="atk-dg-row">
                    <span class="atk-dg-lbl">Name of Attack</span>
                    <input class="atk-dg-input atk-dg-input-wide" value="${atk.name}" readonly>
                </div>
                <div class="atk-dg-dmg-row">
                    <span class="atk-dg-lbl">Main Dmg</span>
                    <input class="atk-dg-input" style="width:52px" value="${atk.damage || '\u2014'}" readonly>
                    <span class="atk-dg-lbl" style="margin-left:4px">Type</span>
                    <input class="atk-dg-input" style="width:30px" value="${atk.damageType || ''}" readonly>
                </div>
                <div class="atk-dg-dmg-row">
                    <input type="checkbox" style="margin-right:3px" disabled> <span class="atk-dg-lbl">Secondary</span>
                    <input class="atk-dg-input" style="width:28px" value="0" readonly>
                </div>
                <div class="atk-dg-dmg-row">
                    <span class="atk-dg-lbl">Extra Atk Bonus</span>
                    <input class="atk-dg-input" style="width:24px;text-align:center" value="0" readonly>
                    <span class="atk-dg-lbl" style="margin-left:4px">Dmg Bonus</span>
                    <input class="atk-dg-input" style="width:24px;text-align:center" value="0" readonly>
                </div>
                <div class="atk-dg-dmg-row">
                    <span class="atk-dg-lbl">Critical</span>
                    <input class="atk-dg-input" style="width:62px" value="${atk.crit || '20/×2'}" readonly>
                    <span class="atk-dg-lbl" style="margin-left:4px">Size</span>
                    <input class="atk-dg-input" style="width:22px;text-align:center" value="${atk.size || 'M'}" readonly>
                    <span class="atk-dg-lbl" style="margin-left:4px">Cat.</span>
                    <select class="atk-dg-select">
                        <option ${!atk.cat || atk.cat === 'N/A' ? 'selected' : ''}>N/A</option>
                        <option ${atk.cat === 'Light' ? 'selected' : ''}>Light</option>
                        <option ${atk.cat === '1-Handed' ? 'selected' : ''}>1-Handed</option>
                        <option ${atk.cat === '2-Handed' ? 'selected' : ''}>2-Handed</option>
                        <option ${atk.cat === 'Unarmed' ? 'selected' : ''}>Unarmed</option>
                    </select>
                </div>
            </div>
            <div class="atk-dg-right">
                <div class="atk-dg-radio-col">
                    ${R('atkMode', 'Melee', isMelee)}
                    ${R('atkMode', 'Ranged', !isMelee)}
                    ${R('atkMode', 'Thrown', false)}
                    ${R('atkMode', 'Touch', false)}
                    ${R('atkMode', 'Nonlethal', false)}
                    <label class="atk-radio-item"><input type="radio" name="atkMode${idx}" value="NonlethalInstead"> Nonlethal Instead</label>
                </div>
                <div class="atk-dg-radio-col" style="margin-left:10px">
                    <span class="atk-dg-col-hdr">Hand Used</span>
                    ${R('handUsed', 'Primary', true)}
                    ${R('handUsed', 'Off-Hand', false)}
                    <label class="atk-radio-item"><input type="radio" name="handUsed${idx}" value="PH2"> Pri. Hand w/ 2 weapons</label>
                    ${R('handUsed', 'Two Hands', false)}
                    ${R('handUsed', 'O-H Alone', false)}
                    ${R('handUsed', '2nd Natural', false)}
                </div>
            </div>
        </div>
        <div class="atk-dg-make-row">
            <span class="atk-dg-make-lbl">Make Attacks:</span>
            ${atkBtns}
        </div>
        <div class="atk-dg-bottom">
            <div class="atk-dg-bottom-left">
                <button class="atk-charge-btn">Charge</button>
                <label class="atk-check-item"><input type="checkbox"> Is Natural Attack. # of attacks:</label>
                <input class="atk-dg-input" style="width:24px;text-align:center" value="1" readonly>
            </div>
            <div class="atk-dg-bottom-right">
                <span class="atk-dg-lbl">Att. of Opport.</span>
                <label class="atk-check-item"><input type="checkbox"></label>
            </div>
        </div>
        <div class="atk-dg-bottom2">
            <label class="atk-check-item"><input type="checkbox"> Auto-Attack</label>
            <span class="atk-dg-lbl" style="margin-left:10px">Dec.</span>
            <input class="atk-dg-input" style="width:24px;text-align:center" value="1" readonly>
            <span class="atk-dg-lbl" style="margin-left:4px">Max</span>
            <input class="atk-dg-input" style="width:24px;text-align:center" value="1" readonly>
            <label class="atk-check-item" style="margin-left:10px"><input type="checkbox"> Not Proficient</label>
            <button class="atk-dmg-btn" id="atk-dmg-btn" style="margin-left:auto">\uD83C\uDFB2 Roll Dmg</button>
        </div>
        <div class="atk-result" id="atk-result-display">Click an attack button to roll...</div>`;
    }

    function renderAttackPanel(c) {
        const panel = document.getElementById('char-mini-panel');
        if (!panel) return;
        if (!c) {
            panel.innerHTML = '<div class="mini-empty">Select a character</div>';
            panel.onclick = null;
            return;
        }
        // Use atk field first, then gear, then show empty panel
        const attacks = parseAttacks(c.atk).length > 0
            ? parseAttacks(c.atk)
            : parseGearWeapons(c.gear, c);
        if (attacks.length === 0) {
            const { name: clsName, level: lvl } = parseClass(c.class);
            const acVal = String(c.ac || '?').split(',')[0];
            panel.innerHTML = `
                <div class="atk-header">
                    <span class="atk-char-name">${c.name}</span>
                    <span class="atk-char-sub">${clsName} ${lvl} &nbsp;·&nbsp; HP <strong>${c.hp || '?'}</strong> &nbsp;·&nbsp; AC <strong>${acVal}</strong></span>
                </div>
                <div class="mini-empty">No attack data — edit character to add attacks.</div>`;
            panel.onclick = null;
            return;
        }
        if (selectedAttackIdx >= attacks.length) selectedAttackIdx = 0;
        renderAttackPanelContent(panel, c, attacks, selectedAttackIdx);

        panel.onclick = (e) => {
            const item = e.target.closest('.atk-list-item');
            if (item) {
                selectedAttackIdx = parseInt(item.dataset.idx);
                renderAttackPanelContent(panel, c, attacks, selectedAttackIdx);
                panel.onclick = (e2) => {
                    const it = e2.target.closest('.atk-list-item');
                    if (it) { selectedAttackIdx = parseInt(it.dataset.idx); renderAttackPanelContent(panel, c, attacks, selectedAttackIdx); return; }
                    handleAtkClick(e2, c, attacks);
                };
                return;
            }
            handleAtkClick(e, c, attacks);
        };
    }

    function handleAtkClick(e, c, attacks) {
        const atkBtn = e.target.closest('.atk-roll-btn');
        if (atkBtn) {
            const bonus = parseInt(atkBtn.dataset.bonus);
            const roll = Math.floor(Math.random() * 20) + 1;
            const total = roll + bonus;
            const bs = bonus >= 0 ? '+' + bonus : '' + bonus;
            const isCrit = roll === 20, isFumble = roll === 1;
            const cls = isCrit ? 'atk-crit' : isFumble ? 'atk-fumble' : total >= 10 ? 'atk-hit' : 'atk-miss';
            const txt = isCrit ? 'CRITICAL!' : isFumble ? 'FUMBLE' : total >= 10 ? 'HIT' : 'MISS';
            const res = document.getElementById('atk-result-display');
            if (res) res.innerHTML = `<span class="${cls}">d20(${roll})${bs} = <strong>${total}</strong> — ${txt}</span>`;
            return;
        }
        const dmgBtn = e.target.closest('#atk-dmg-btn');
        if (dmgBtn) {
            const atk = attacks[selectedAttackIdx];
            if (atk && atk.damage) {
                const r = rollDice(atk.damage);
                const res = document.getElementById('atk-result-display');
                if (res) res.innerHTML = `<span class="atk-dmg-result">&#127922; ${atk.damage} &rarr; ${r.breakdown}</span>`;
            }
        }
    }

    /* ══════════════════════════════════════════════════════════
       DETAIL PANEL
       ══════════════════════════════════════════════════════════ */
    function renderEmptyDetail() {
        document.getElementById('detail-area').innerHTML =
            '<div class="detail-empty"><div class="empty-icon">⚔</div><p>Select a resident to view their details</p></div>';
    }

    function renderDetail(c) {
        selectedCharId = c.id;
        renderList(); // re-render for highlight

        const mod = v => { const m = Math.floor((parseInt(v) - 10) / 2); return m >= 0 ? `+${m}` : `${m}`; };
        const abilityBox = (label, val) =>
            `<div class="ability-box"><div class="ability-label">${label}</div><div class="ability-value">${val || '—'}</div><div class="ability-mod">${val ? mod(val) : ''}</div></div>`;

        const statusBadge = c.status === 'Alive'
            ? '<span class="card-badge badge-alive">Alive</span>'
            : '<span class="card-badge badge-deceased">Deceased</span>';
        const titleBadge = c.title ? `<span class="card-badge badge-mayor">${c.title}</span>` : '';

        const subtitle = `${c.race || ''} ${c.class || ''}`.trim();

        const area = document.getElementById('detail-area');
        const portraitThumb = c.portrait_url
            ? `<img class="detail-portrait" src="${c.portrait_url}" alt="portrait" onerror="this.style.display='none'">`
            : '';
        area.innerHTML = `
            <div class="detail-header">
                <div class="detail-name-row">
                    ${portraitThumb}
                    <span class="detail-name">${c.name}</span>
                    ${statusBadge} ${titleBadge}
                    <button id="edit-char-btn" class="edit-btn" title="Edit">✏️ Edit</button>
                    <button id="delete-char-btn" class="delete-btn" title="Delete Character">🗑️</button>
                </div>
                <p class="detail-subtitle">${subtitle}</p>
            </div>
            <div class="ability-strip">
                ${abilityBox('STR', c.str)}${abilityBox('DEX', c.dex)}${abilityBox('CON', c.con)}
                ${abilityBox('INT', c.int_)}${abilityBox('WIS', c.wis)}${abilityBox('CHA', c.cha)}
            </div>
            <div class="detail-tabs">
                <button class="tab-btn ${activeTab === 'combat' ? 'active' : ''}" data-tab="combat">Combat</button>
                <button class="tab-btn ${activeTab === 'profile' ? 'active' : ''}" data-tab="profile">Profile</button>
                <button class="tab-btn ${activeTab === 'skills' ? 'active' : ''}" data-tab="skills">Skills</button>
                <button class="tab-btn ${activeTab === 'feats' ? 'active' : ''}" data-tab="feats">Feats</button>
                <button class="tab-btn ${activeTab === 'gear' ? 'active' : ''}" data-tab="gear">Gear</button>
                <button class="tab-btn ${activeTab === 'family' ? 'active' : ''}" data-tab="family">Family</button>
                <button class="tab-btn ${activeTab === 'history' ? 'active' : ''}" data-tab="history">Personal History</button>
                <button class="tab-btn ${activeTab === 'portrait' ? 'active' : ''}" data-tab="portrait">Portrait</button>
            </div>
            <div class="tab-content" id="tab-content"></div>`;

        renderTab(c);
    }

    function renderTab(c) {
        const tc = document.getElementById('tab-content');
        if (!tc) return;

        const row = (label, val) => val ? `<div class="detail-row"><span class="detail-label">${label}</span><span class="detail-value">${val}</span></div>` : '';

        switch (activeTab) {
            case 'combat':
                tc.innerHTML = `
                    <h3 class="section-heading">Vitals</h3>
                    ${row('Hit Points', c.hp)}${row('Hit Dice', c.hd)}
                    ${row('Armor Class', c.ac)}${row('Initiative', c.init)}
                    ${row('Speed', c.spd)}${row('Grapple', c.grapple)}
                    <h3 class="section-heading">Offense</h3>
                    ${row('Attack', c.atk)}
                    <h3 class="section-heading">Defense</h3>
                    ${row('Saves', c.saves)}`;
                break;
            case 'profile': {
                const { name: pCls, level: pLvl } = parseClass(c.class);
                tc.innerHTML = `
                    ${row('Full Name', c.name)}${row('Race', c.race)}
                    ${row('Class', pCls)}${row('Level', pLvl)}
                    ${row('Gender', c.gender === 'M' ? 'Male' : c.gender === 'F' ? 'Female' : c.gender)}
                    ${row('Age', c.age)}${row('Alignment', c.alignment)}${row('Status', c.status)}
                    ${c.spouse && c.spouse !== 'None' ? row(c.spouseLabel || 'Spouse', c.spouse) : ''}
                    ${row('ECL', c.ecl)}${row('XP', c.xp)}
                    ${row('Role', c.role)}${row('Languages', c.languages)}`;
                break;
            }
            case 'skills': {
                const skillList = (c.skills_feats || '').split(',').map(s => s.trim()).filter(Boolean);
                tc.innerHTML = `<h3 class="section-heading">Skills</h3>` +
                    (skillList.length ? skillList.map(s => `<div class="detail-row"><span class="detail-value">${s}</span></div>`).join('') : '<p class="empty-msg">No skills listed</p>');
                break;
            }
            case 'feats': {
                const featList = (c.feats || '').split(',').map(f => f.trim()).filter(Boolean);
                tc.innerHTML = `<h3 class="section-heading">Feats</h3>` +
                    (featList.length ? featList.map(f => `<div class="detail-row"><span class="detail-value">${f}</span></div>`).join('') : '<p class="empty-msg">No feats listed</p>');
                break;
            }
            case 'gear':
                tc.innerHTML = `<h3 class="section-heading">Equipment</h3>` +
                    (c.gear ? c.gear.split(',').map(g => g.trim()).filter(Boolean).map(g => `<div class="detail-row"><span class="detail-value">${g}</span></div>`).join('') : '<p class="empty-msg">No gear listed</p>');
                break;
            case 'family':
                tc.innerHTML = renderFamilyTab(c);
                break;
            case 'history': {
                const bio = c.history || '';
                tc.innerHTML = `
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                        <h3 class="section-heading" style="margin:0">Personal History</h3>
                        <button class="edit-btn" id="bio-edit-btn">✏️ Edit Bio</button>
                    </div>
                    <div id="bio-display">${bio ? `<p class="bio-text">${bio.replace(/\n/g, '<br>')}</p>` : '<p class="empty-msg">No personal history recorded yet. Click \'Edit Bio\' to add one.</p>'}</div>
                    <div id="bio-edit-area" style="display:none">
                        <textarea id="bio-textarea" class="bio-textarea" rows="8" placeholder="Write this character\'s personal history, backstory, notable events...">${bio}</textarea>
                        <div style="display:flex;gap:8px;margin-top:6px">
                            <button class="edit-btn" id="bio-save-btn">💾 Save</button>
                            <button class="delete-btn" id="bio-cancel-btn" style="padding:4px 10px">Cancel</button>
                        </div>
                    </div>`;
                // Wire bio edit events
                document.getElementById('bio-edit-btn').onclick = () => {
                    document.getElementById('bio-display').style.display = 'none';
                    document.getElementById('bio-edit-area').style.display = 'block';
                    document.getElementById('bio-edit-btn').style.display = 'none';
                };
                document.getElementById('bio-cancel-btn').onclick = () => {
                    document.getElementById('bio-display').style.display = '';
                    document.getElementById('bio-edit-area').style.display = 'none';
                    document.getElementById('bio-edit-btn').style.display = '';
                };
                document.getElementById('bio-save-btn').onclick = async () => {
                    const newBio = document.getElementById('bio-textarea').value;
                    c.history = newBio;
                    // Patch in currentTown
                    const ch = currentTown.characters.find(x => x.id === c.id);
                    if (ch) ch.history = newBio;
                    await apiSaveCharacter(currentTownId, c);
                    activeTab = 'history';
                    renderTab(c);
                };
                break;
            }
            case 'portrait': {
                const { name: pCls, level: pLvl } = parseClass(c.class);
                const genderWord = c.gender === 'M' ? 'male' : c.gender === 'F' ? 'female' : (c.gender || 'unknown gender');
                const strMod = Math.floor(((parseInt(c.str) || 10) - 10) / 2);
                const dexMod = Math.floor(((parseInt(c.dex) || 10) - 10) / 2);
                const build = strMod >= 2 ? 'muscular build' : strMod <= -1 ? 'slight build' : 'average build';
                const agility = dexMod >= 2 ? 'agile, athletic posture' : 'composed posture';
                const aiPrompt = `Fantasy portrait of ${c.name}, a ${c.age || 'adult'}-year-old ${genderWord} ${c.race || 'human'} ${pCls} (level ${pLvl}). Alignment: ${c.alignment || 'Neutral'}. ${build}, ${agility}. ${c.gear ? 'Equipped with: ' + c.gear.split(',').slice(0, 3).join(', ') + '.' : ''} Digital painting, D&D 3.5e style, fantasy portrait, dramatic lighting, detailed face, high quality.`;
                tc.innerHTML = `
                    <h3 class="section-heading">Character Portrait</h3>
                    <div class="portrait-tab-body">
                        <div class="portrait-display-col">
                            ${c.portrait_url
                        ? `<img class="portrait-preview-img" src="${c.portrait_url}" alt="${c.name}" onerror="this.style.display='none'">`
                        : `<div class="portrait-placeholder"><div class="portrait-placeholder-icon">🧙</div><p>No portrait yet</p><p style="font-size:0.58rem;margin-top:4px;color:var(--text-muted)">Upload via ✏️ Edit</p></div>`}
                        </div>
                        <div class="portrait-prompt-col">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                                <span style="font-size:0.65rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">AI Image Prompt</span>
                                <button class="edit-btn" id="copy-prompt-btn" style="padding:2px 8px;font-size:0.6rem">📋 Copy</button>
                            </div>
                            <textarea class="bio-textarea" id="ai-prompt-text" rows="8" style="font-size:0.65rem">${aiPrompt}</textarea>
                            <p style="font-size:0.6rem;color:var(--text-muted);margin-top:4px">Paste into Midjourney, DALL·E, or Stable Diffusion. Upload result via ✏️ Edit.</p>
                        </div>
                    </div>`;
                document.getElementById('copy-prompt-btn').onclick = () => {
                    navigator.clipboard.writeText(document.getElementById('ai-prompt-text').value)
                        .then(() => { const b = document.getElementById('copy-prompt-btn'); b.textContent = '✅ Copied!'; setTimeout(() => b.textContent = '📋 Copy', 1500); })
                        .catch(() => { });
                };
                break;
            }
        }
    }

    function renderFamilyTab(c) {
        let html = '<h3 class="section-heading">Relationships</h3>';
        // Spouse / Partner
        if (c.spouse && c.spouse !== 'None' && c.spouse.trim()) {
            const label = c.spouseLabel || 'Spouse';
            // Try to find the spouse in the current town's character list
            const spouseChar = currentTown.characters.find(ch =>
                ch.name.toLowerCase() === c.spouse.toLowerCase() && ch.id !== c.id
            );
            if (spouseChar) {
                html += `<div class="detail-row"><span class="detail-label">${label}</span><span class="detail-value"><a href="#" class="family-link" data-char-id="${spouseChar.id}">${c.spouse}</a></span></div>`;
            } else {
                html += `<div class="detail-row"><span class="detail-label">${label}</span><span class="detail-value">${c.spouse}</span></div>`;
            }
        } else {
            html += '<p class="empty-msg">No spouse or partner recorded.</p>';
        }

        // Children — scan other characters who list this character as spouse
        const children = [];
        const possibleParents = currentTown.characters.filter(ch =>
            ch.spouse && ch.spouse.toLowerCase() === c.name.toLowerCase() && ch.id !== c.id
        );

        // Also look for characters with matching last name who are younger
        const lastName = c.name.split(' ').pop();
        if (lastName && lastName.length > 2) {
            currentTown.characters.forEach(ch => {
                if (ch.id === c.id) return;
                if (ch.name.endsWith(lastName) && ch.name !== c.name) {
                    const chAge = parseInt(ch.age) || 0;
                    const cAge = parseInt(c.age) || 0;
                    if (chAge > 0 && cAge > 0 && chAge < cAge - 14) {
                        if (!children.find(kid => kid.id === ch.id)) {
                            children.push(ch);
                        }
                    }
                }
            });
        }

        if (children.length > 0) {
            html += '<h3 class="section-heading">Possible Children</h3>';
            children.forEach(kid => {
                html += `<div class="detail-row"><span class="detail-label">Child</span><span class="detail-value"><a href="#" class="family-link" data-char-id="${kid.id}">${kid.name}</a> <small>(Age ${kid.age || '?'})</small></span></div>`;
            });
        }

        // Reverse: if this character lists a spouse, show who that spouse is married to
        if (possibleParents.length > 0 && !(c.spouse && c.spouse !== 'None')) {
            html += '<h3 class="section-heading">Family Connections</h3>';
            possibleParents.forEach(p => {
                html += `<div class="detail-row"><span class="detail-label">Listed by</span><span class="detail-value"><a href="#" class="family-link" data-char-id="${p.id}">${p.name}</a> as ${p.spouseLabel || 'Spouse'}</span></div>`;
            });
        }

        return html;
    }

    /* ══════════════════════════════════════════════════════════
       TOWN HISTORY (renders into detail panel)
       ══════════════════════════════════════════════════════════ */
    function renderTownHistory() {
        if (!currentTown) return;
        const area = document.getElementById('detail-area');
        const hist = currentTown.history;

        let html = `<div class="town-history-view">
            <h2 class="detail-name" style="margin-bottom:4px;">${currentTown.name} — History</h2>
            <p class="detail-subtitle" style="margin-bottom:16px;">Click any character to return to character view</p>`;

        if (!hist || hist.length === 0) {
            html += '<p class="empty-msg">No town history recorded.</p>';
        } else {
            html += hist.map(h =>
                `<div class="history-entry"><h3 class="section-heading">${h.heading}</h3><div class="history-body">${h.content.replace(/\n/g, '<br>')}</div></div>`
            ).join('<hr class="history-divider">');
        }

        html += '</div>';
        area.innerHTML = html;
        selectedCharId = null;
        renderList(); // clear highlight
    }

    /* ══════════════════════════════════════════════════════════
       STATBLOCK PARSER (same as before)
       ══════════════════════════════════════════════════════════ */
    function parseStatblock(text) {
        const d = {
            name: '', race: '', class: '', status: 'Alive', cr: '', hp: '', ac: '', init: '', spd: '',
            grapple: '', atk: '', alignment: '', saves: '', str: '', dex: '', con: '', int_: '', wis: '', cha: '',
            hd: '', ecl: '', age: '', xp: '', gender: '', languages: '', skills_feats: '', gear: '', role: '',
            title: '', spouse: 'None', spouse_label: ''
        };

        const lines = text.split('\n').map(l => l.replace(/^##\s*/, '').trim()).filter(Boolean);
        const full = lines.join(' ');

        // Split into stat portion and tail sections
        let statPart = full;
        const tailKeys = ['Languages?(?:\\s*spoken)?', 'Skills?\\/Feats?', 'Skills?\\s+and\\s+Feats?', 'Possessions?', 'Gear', 'Special'];
        const tailRegex = new RegExp(`\\.?\\s*(${tailKeys.join('|')})\\s*:\\s*`, 'i');
        const tailStart = statPart.search(tailRegex);
        let tailPart = '';
        if (tailStart > -1) {
            tailPart = statPart.substring(tailStart).replace(/^\.\s*/, '');
            statPart = statPart.substring(0, tailStart).trim();
        }

        // Extract tail sections
        const sectionRegex = /(?:^|\.\s*)(Languages?\s*(?:spoken)?|Skills?\/Feats?|Skills?\s+and\s+Feats?|Possessions?|Gear|Special)\s*:\s*/gi;
        const sections = {};
        let match, lastKey = null, lastIdx = 0;
        const tailCopy = tailPart;
        while ((match = sectionRegex.exec(tailCopy)) !== null) {
            if (lastKey !== null) sections[lastKey] = tailCopy.substring(lastIdx, match.index).replace(/\.\s*$/, '').trim();
            lastKey = match[1].toLowerCase();
            lastIdx = match.index + match[0].length;
        }
        if (lastKey !== null) sections[lastKey] = tailCopy.substring(lastIdx).replace(/\.\s*$/, '').trim();

        for (const [key, val] of Object.entries(sections)) {
            if (/language/i.test(key)) d.languages = val;
            else if (/skill/i.test(key)) d.skills_feats = val;
            else if (/possession|gear/i.test(key)) d.gear = val;
        }

        // Parse main stat portion
        const parts = statPart.split(';').map(s => s.trim()).filter(Boolean);
        if (parts.length < 2) { d.name = statPart; return d; }

        // Determine format
        const colonIdx = parts[0].indexOf(':');
        if (colonIdx > -1 && !/\b(?:CR|hp|Init|Spd|AC|BAB|Atk|AL|SV|Str|Dex|Con|Int|Wis|Cha|HD|Fort|Ref|Will|Grapple)\b/i.test(parts[0].substring(0, colonIdx))) {
            d.name = parts[0].substring(0, colonIdx).trim();
            const afterColon = parts[0].substring(colonIdx + 1).trim();
            const rcMatch = afterColon.match(/^(\S+)\s+(.+)$/);
            if (rcMatch) { d.race = rcMatch[1]; d.class = rcMatch[2]; }
            else d.race = afterColon;
        } else {
            d.name = parts[0];
            if (parts.length > 1) {
                const second = parts[1];
                if (!/\b(?:CR|hp|Init|Spd|AC|BAB)\b/i.test(second)) {
                    const rcMatch = second.match(/^(\S+)\s+(.+)$/);
                    if (rcMatch) { d.race = rcMatch[1]; d.class = rcMatch[2]; }
                    else d.race = second;
                }
            }
        }

        // Parse keyword fields from remaining parts
        for (const part of parts) {
            const p = part.trim();
            const kv = p.match(/^\s*(\w[\w\s/]*?)\s*[:]\s*(.+)$/);
            if (!kv) {
                const crM = p.match(/^CR\s+(.+)/i);
                if (crM) { d.cr = crM[1]; continue; }
                const hpM = p.match(/^hp\s+(\d+)/i);
                if (hpM) { d.hp = hpM[1]; continue; }
                continue;
            }
            const key = kv[1].trim().toLowerCase(), val = kv[2].trim();
            if (key === 'cr') d.cr = val;
            else if (key === 'ecl') d.ecl = val;
            else if (key === 'age') d.age = val;
            else if (key === 'xp') d.xp = val;
            else if (key === 'hp') d.hp = val;
            else if (key === 'hd') d.hd = val;
            else if (key === 'init') d.init = val;
            else if (key === 'spd') d.spd = val;
            else if (key === 'ac') d.ac = val;
            else if (key === 'bab') { } // skip
            else if (key === 'atk') d.atk = val;
            else if (key === 'grapple') d.grapple = val;
            else if (key === 'al') d.alignment = val;
            else if (key === 'sv') d.saves = val;
            else if (key === 'size') { } // skip
            else if (key === 'gender') d.gender = val;
            else if (/wife|husband/i.test(key)) {
                d.spouse = val; d.spouse_label = key.charAt(0).toUpperCase() + key.slice(1);
            }
        }

        // Parse abilities from the stat part
        const abilMatch = statPart.match(/Str\s+(\d+).*?Dex\s+(\d+).*?Con\s+(\d+).*?Int\s+(\d+).*?Wis\s+(\d+).*?Cha\s+(\d+)/i);
        if (abilMatch) {
            d.str = abilMatch[1]; d.dex = abilMatch[2]; d.con = abilMatch[3];
            d.int_ = abilMatch[4]; d.wis = abilMatch[5]; d.cha = abilMatch[6];
        }

        // Deceased check
        if (/\(DECEASED\)/i.test(full) || /deceased/i.test(d.status)) d.status = 'Deceased';

        return d;
    }

    function showImportPreview(d) {
        pendingImport = d;
        const preview = document.getElementById('import-preview');
        const rows = [
            ['Name', d.name], ['Race', d.race], ['Class', d.class],
            ['CR', d.cr], ['HP', d.hp], ['AC', d.ac], ['Init', d.init],
            ['Speed', d.spd], ['Attack', d.atk], ['Alignment', d.alignment],
            ['Saves', d.saves],
            ['Str/Dex/Con', `${d.str || '—'} / ${d.dex || '—'} / ${d.con || '—'}`],
            ['Int/Wis/Cha', `${d.int_ || '—'} / ${d.wis || '—'} / ${d.cha || '—'}`],
            ['Languages', d.languages], ['Skills', d.skills_feats], ['Feats', d.feats], ['Gear', d.gear]
        ];
        preview.innerHTML = `<h3 class="preview-name">${d.name || 'Unknown'}</h3>` +
            rows.filter(([, v]) => v).map(([k, v]) => `<div class="preview-row"><span class="preview-label">${k}:</span> <strong>${v}</strong></div>`).join('');
        preview.style.display = 'block';
        document.getElementById('import-confirm-btn').disabled = false;
    }

    /* ══════════════════════════════════════════════════════════
       EDIT MODAL
       ══════════════════════════════════════════════════════════ */
    function openEditModal(c) {
        const fields = [
            {
                section: 'Identity', items: [
                    { key: 'name', label: 'Name' }, { key: 'race', label: 'Race' }, { key: 'class', label: 'Class' },
                    { key: 'status', label: 'Status', type: 'select', options: ['Alive', 'Deceased'] },
                    { key: 'title', label: 'Title' }, { key: 'gender', label: 'Gender' },
                    { key: 'spouse', label: 'Spouse' }, { key: 'spouseLabel', label: 'Spouse Label', dbKey: 'spouse_label' },
                    { key: 'role', label: 'Role' }
                ]
            },
            {
                section: 'Combat', items: [
                    { key: 'hp', label: 'HP' }, { key: 'hd', label: 'Hit Dice' },
                    { key: 'ac', label: 'AC' }, { key: 'init', label: 'Initiative' },
                    { key: 'spd', label: 'Speed' }, { key: 'grapple', label: 'Grapple' },
                    { key: 'atk', label: 'Attack' }, { key: 'alignment', label: 'Alignment' },
                    { key: 'saves', label: 'Saves' }, { key: 'cr', label: 'CR' },
                    { key: 'ecl', label: 'ECL' }, { key: 'age', label: 'Age' }, { key: 'xp', label: 'XP' }
                ]
            },
            {
                section: 'Ability Scores', items: [
                    { key: 'str', label: 'STR' }, { key: 'dex', label: 'DEX' }, { key: 'con', label: 'CON' },
                    { key: 'int_', label: 'INT' }, { key: 'wis', label: 'WIS' }, { key: 'cha', label: 'CHA' }
                ]
            },
            {
                section: 'Other', items: [
                    { key: 'languages', label: 'Languages' },
                    { key: 'skills_feats', label: 'Skills' },
                    { key: 'feats', label: 'Feats' },
                    { key: 'gear', label: 'Gear' }
                ]
            }
        ];

        const body = document.getElementById('edit-form-body');
        body.innerHTML = fields.map(s => {
            const rows = s.items.map(f => {
                const val = c[f.key] || '';
                if (f.type === 'select') {
                    return `<div class="edit-row"><label>${f.label}</label><select id="edit-${f.key}">${f.options.map(o => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`;
                }
                return `<div class="edit-row"><label>${f.label}</label><input id="edit-${f.key}" value="${String(val).replace(/"/g, '&quot;')}"></div>`;
            }).join('');
            return `<h3 class="edit-section-title">${s.section}</h3><div class="edit-grid">${rows}</div>`;
        }).join('');

        // Append portrait section at the bottom
        const portraitHtml = `
            <h3 class="edit-section-title">Portrait</h3>
            <div class="edit-portrait-section">
                <div class="edit-portrait-preview-wrap">
                    ${c.portrait_url
                ? `<img id="edit-portrait-preview" class="edit-portrait-preview" src="${c.portrait_url}" alt="portrait" onerror="this.style.display='none'">`
                : `<div class="edit-portrait-empty" id="edit-portrait-preview">🧙 No portrait</div>`}
                </div>
                <div class="edit-portrait-controls">
                    <label class="portrait-upload-btn" style="display:inline-block;width:auto;padding:4px 14px">
                        📁 ${c.portrait_url ? 'Replace' : 'Upload'} Portrait
                        <input type="file" id="edit-portrait-file" accept="image/*" style="display:none">
                    </label>
                    <div id="edit-portrait-status" style="font-size:0.65rem;color:var(--text-muted);margin-top:4px"></div>
                    <input type="hidden" id="edit-portrait_url" value="${c.portrait_url || ''}">
                </div>
            </div>`;
        body.innerHTML += portraitHtml;

        // Wire up portrait upload — client-side canvas resize + base64, saved via apiSaveCharacter
        document.getElementById('edit-portrait-file').onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const status = document.getElementById('edit-portrait-status');
            status.textContent = 'Processing...';
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    const MAX_W = 200, MAX_H = 270;
                    let w = img.width, h = img.height;
                    if (w > MAX_W || h > MAX_H) {
                        const scale = Math.min(MAX_W / w, MAX_H / h);
                        w = Math.round(w * scale); h = Math.round(h * scale);
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
                    document.getElementById('edit-portrait_url').value = dataUrl;
                    const prev = document.getElementById('edit-portrait-preview');
                    if (prev) prev.outerHTML = `<img id="edit-portrait-preview" class="edit-portrait-preview" src="${dataUrl}" alt="portrait">`;
                    status.textContent = '\u2705 Ready \u2014 click Save Changes';
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        };

        body.dataset.origName = c.name;
        body.dataset.charDbId = String(c.dbId || c.id || '');  // use DB primary key
        document.getElementById('edit-modal').style.display = 'flex';
    }

    async function saveEdit() {
        const body = document.getElementById('edit-form-body');
        const dbId = body.dataset.charDbId;
        const d = {};
        const keys = ['name', 'race', 'class', 'status', 'title', 'gender', 'spouse', 'role',
            'hp', 'hd', 'ac', 'init', 'spd', 'grapple', 'atk', 'alignment', 'saves', 'cr', 'ecl', 'age', 'xp',
            'str', 'dex', 'con', 'int_', 'wis', 'cha', 'languages', 'skills_feats', 'feats', 'gear',
            'history', 'portrait_url'];
        for (const k of keys) {
            const el = document.getElementById('edit-' + k);
            if (el) d[k] = el.value;
        }
        const spouseLabelEl = document.getElementById('edit-spouseLabel');
        d.spouse_label = spouseLabelEl ? spouseLabelEl.value : '';
        if (dbId) d.id = parseInt(dbId);

        try {
            await apiSaveCharacter(currentTownId, d);
            // Reload characters
            const res = await apiGetCharacters(currentTownId);
            currentTown.characters = (res.characters || []).map(normalizeCharacter);
            renderFilters();
            renderList();
            renderStatsBar();
            const updated = currentTown.characters.find(c => c.name === d.name);
            if (updated) renderDetail(updated);
            document.getElementById('edit-modal').style.display = 'none';
        } catch (err) {
            alert('Save failed: ' + err.message);
        }
    }

    /* ══════════════════════════════════════════════════════════
       DELETE ACTIONS
       ══════════════════════════════════════════════════════════ */
    async function deleteCharacter(c) {
        if (!confirm(`Delete "${c.name}" from ${currentTown.name}?\n\nThis cannot be undone.`)) return;
        try {
            await apiDeleteCharacter(currentTownId, c.id);
            // Re-fetch characters
            const res = await apiGetCharacters(currentTownId);
            currentTown.characters = (res.characters || []).map(normalizeCharacter);
            selectedCharId = null;
            renderFilters();
            renderList();
            renderStatsBar();
            renderEmptyDetail();
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    }

    async function deleteTown() {
        if (!currentTownId || !currentTown) return;
        const charCount = currentTown.characters.length;
        const msg = charCount > 0
            ? `Delete "${currentTown.name}" and ALL ${charCount} characters?\n\nType the town name to confirm:`
            : `Delete "${currentTown.name}"?\n\nType the town name to confirm:`;
        const typed = prompt(msg);
        if (!typed || typed.trim().toLowerCase() !== currentTown.name.trim().toLowerCase()) {
            if (typed !== null) alert('Town name did not match. Deletion cancelled.');
            return;
        }
        try {
            await apiDeleteTown(currentTownId);
            currentTownId = null;
            currentTown = null;
            selectedCharId = null;
            await loadTowns();
            renderEmptyDetail();
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    }

    /* ══════════════════════════════════════════════════════════
       EVENT BINDINGS
       ══════════════════════════════════════════════════════════ */
    function bindEvents() {
        // Town selector
        document.getElementById('town-select').addEventListener('change', e => {
            if (e.target.value) selectTown(parseInt(e.target.value));
        });

        // Search
        document.getElementById('search-input').addEventListener('input', e => {
            searchQuery = e.target.value.trim();
            renderList();
        });

        // Race filter chips
        document.getElementById('race-filters').addEventListener('click', e => {
            const chip = e.target.closest('.filter-chip');
            if (!chip) return;
            const race = chip.dataset.race;
            activeRaceFilter = activeRaceFilter === race ? null : race;
            renderFilters(); renderList();
        });

        // Status filter chips
        document.getElementById('status-filters').addEventListener('click', e => {
            const chip = e.target.closest('.filter-chip');
            if (!chip) return;
            const status = chip.dataset.status;
            activeStatusFilter = activeStatusFilter === status ? null : status;
            renderFilters(); renderList();
        });

        // Character list click
        document.getElementById('list-body').addEventListener('click', e => {
            const row = e.target.closest('.char-row');
            if (!row) return;
            const id = parseInt(row.dataset.id);
            const c = currentTown.characters.find(ch => ch.id === id || ch.dbId === id);
            if (c) { renderDetail(c); renderAttackPanel(c); }
        });

        // Sort headers
        document.getElementById('list-header').addEventListener('click', e => {
            const col = e.target.closest('.sort-col');
            if (!col || !col.dataset.sort) return;
            if (sortCol === col.dataset.sort) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
            else { sortCol = col.dataset.sort; sortDir = 'asc'; }
            renderListHeader(); renderList();
        });

        // Tab clicks
        document.getElementById('detail-area').addEventListener('click', e => {
            const tabBtn = e.target.closest('.tab-btn');
            if (tabBtn) {
                activeTab = tabBtn.dataset.tab;
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === activeTab));
                const c = currentTown.characters.find(ch => ch.id == selectedCharId || ch.dbId == selectedCharId);
                if (c) renderTab(c);
                return;
            }
            // Edit button
            if (e.target.id === 'edit-char-btn' || e.target.closest('#edit-char-btn')) {
                const c = currentTown.characters.find(ch => ch.id == selectedCharId || ch.dbId == selectedCharId);
                if (c) openEditModal(c);
                return;
            }
            // Delete character button
            if (e.target.id === 'delete-char-btn' || e.target.closest('#delete-char-btn')) {
                const c = currentTown.characters.find(ch => ch.id == selectedCharId || ch.dbId == selectedCharId);
                if (c) deleteCharacter(c);
                return;
            }
            // Family link click
            const famLink = e.target.closest('.family-link');
            if (famLink) {
                e.preventDefault();
                const charId = parseInt(famLink.dataset.charId);
                const linked = currentTown.characters.find(ch => ch.id === charId);
                if (linked) {
                    activeTab = 'family';
                    renderDetail(linked);
                }
            }
        });

        // Town history button — render into detail panel
        document.getElementById('town-history-btn').addEventListener('click', () => {
            renderTownHistory();
        });

        // Town Settings modal
        document.getElementById('town-settings-btn').addEventListener('click', async () => {
            if (!currentTownId) { alert('Select a town first.'); return; }
            document.querySelectorAll('#demographics-grid input').forEach(el => el.value = '');
            try {
                const res = await apiGetTownMeta(currentTownId);
                if (res.meta && res.meta.demographics) {
                    try {
                        const parsed = JSON.parse(res.meta.demographics);
                        for (const [r, v] of Object.entries(parsed)) {
                            const input = document.querySelector(`#demographics-grid input[data-race="${r}"]`);
                            if (input) input.value = v;
                        }
                    } catch (e) {
                        console.warn('Ignoring old demographics format string');
                    }
                }
            } catch (e) { console.error('Failed to load town meta', e); }
            document.getElementById('town-settings-modal').style.display = 'flex';
        });

        document.getElementById('town-settings-save-btn').addEventListener('click', async () => {
            if (!currentTownId) return;
            const btn = document.getElementById('town-settings-save-btn');
            btn.textContent = 'Saving...';
            btn.disabled = true;
            try {
                const map = {};
                document.querySelectorAll('#demographics-grid input').forEach(el => {
                    const parsed = parseInt(el.value, 10);
                    if (!isNaN(parsed)) {
                        map[el.dataset.race] = parsed;
                    }
                });
                const val = JSON.stringify(map);
                await apiSaveTownMeta(currentTownId, 'demographics', val);
                document.getElementById('town-settings-modal').style.display = 'none';
            } catch (err) {
                alert('Failed to save town settings: ' + err.message);
            }
            btn.textContent = 'Save Settings';
            btn.disabled = false;
        });

        // App Settings modal
        document.getElementById('settings-btn').addEventListener('click', async () => {
            document.getElementById('settings-status').textContent = '';
            document.getElementById('settings-gemini-key').value = '';
            document.getElementById('settings-gemini-key').placeholder = 'AIza...';
            try {
                const res = await apiGetSettings();
                if (res.settings) {
                    const s = res.settings;
                    // Show masked key as placeholder, NOT as the input value
                    if (s.gemini_api_key) {
                        document.getElementById('settings-gemini-key').placeholder = s.gemini_api_key + ' (saved)';
                        document.getElementById('settings-gemini-key').value = '';
                    }
                    if (s.dnd_edition) document.getElementById('settings-dnd-edition').value = s.dnd_edition;
                    if (s.xp_speed) document.getElementById('settings-xp-speed').value = s.xp_speed;
                    if (s.relationship_speed) document.getElementById('settings-relationship-speed').value = s.relationship_speed;
                    if (s.birth_rate) document.getElementById('settings-birth-rate').value = s.birth_rate;
                    if (s.death_threshold) document.getElementById('settings-death-threshold').value = s.death_threshold;
                    if (s.child_growth) document.getElementById('settings-child-growth').value = s.child_growth;
                    if (s.conflict_frequency) document.getElementById('settings-conflict-frequency').value = s.conflict_frequency;
                }
            } catch (e) { /* ignore */ }
            document.getElementById('settings-modal').style.display = 'flex';
        });

        document.getElementById('settings-save-btn').addEventListener('click', async () => {
            const status = document.getElementById('settings-status');
            try {
                const key = document.getElementById('settings-gemini-key').value.trim();
                // Only save API key if user typed a new one (not empty, not masked)
                if (key && !key.includes('•')) {
                    await apiSaveSetting('gemini_api_key', key);
                }
                await apiSaveSetting('dnd_edition', document.getElementById('settings-dnd-edition').value);
                await apiSaveSetting('xp_speed', document.getElementById('settings-xp-speed').value);
                await apiSaveSetting('relationship_speed', document.getElementById('settings-relationship-speed').value);
                await apiSaveSetting('birth_rate', document.getElementById('settings-birth-rate').value);
                await apiSaveSetting('death_threshold', document.getElementById('settings-death-threshold').value);
                await apiSaveSetting('child_growth', document.getElementById('settings-child-growth').value);
                await apiSaveSetting('conflict_frequency', document.getElementById('settings-conflict-frequency').value);
                status.textContent = '✅ Settings saved!';
                status.style.color = '#2ecc71';
            } catch (err) {
                status.textContent = '❌ ' + err.message;
                status.style.color = '#e74c3c';
            }
        });

        // Keyboard nav
        document.addEventListener('keydown', e => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
            const list = filteredChars();
            if (!list.length) return;
            const idx = list.findIndex(c => c.id == selectedCharId || c.dbId == selectedCharId);
            if (e.key === 'ArrowDown' && idx < list.length - 1) {
                renderDetail(list[idx + 1]);
                const row = document.querySelector(`.char-row[data-id="${list[idx + 1].id}"]`);
                if (row) row.scrollIntoView({ block: 'nearest' });
            }
            if (e.key === 'ArrowUp' && idx > 0) {
                renderDetail(list[idx - 1]);
                const row = document.querySelector(`.char-row[data-id="${list[idx - 1].id}"]`);
                if (row) row.scrollIntoView({ block: 'nearest' });
            }
        });

        // --- Import Modal ---
        document.getElementById('import-btn').addEventListener('click', () => {
            document.getElementById('import-textarea').value = '';
            document.getElementById('import-preview').style.display = 'none';
            document.getElementById('import-error').style.display = 'none';
            document.getElementById('import-confirm-btn').disabled = true;
            pendingImport = null;
            document.getElementById('import-modal').style.display = 'flex';
        });

        document.getElementById('import-parse-btn').addEventListener('click', () => {
            const text = document.getElementById('import-textarea').value.trim();
            if (!text) return;
            const parsed = parseStatblock(text);
            showImportPreview(parsed);
        });

        document.getElementById('import-confirm-btn').addEventListener('click', async () => {
            if (!pendingImport || !currentTownId) return;
            try {
                await apiSaveCharacter(currentTownId, pendingImport);
                const res = await apiGetCharacters(currentTownId);
                currentTown.characters = (res.characters || []).map(normalizeCharacter);
                renderFilters();
                renderList();
                renderStatsBar();
                const imported = currentTown.characters.find(c => c.name === pendingImport.name);
                if (imported) renderDetail(imported);
                document.getElementById('import-modal').style.display = 'none';
                pendingImport = null;
            } catch (err) {
                alert('Import failed: ' + err.message);
            }
        });

        // --- Edit Save ---
        document.getElementById('edit-save-btn').addEventListener('click', () => saveEdit());

        // --- Delete Town ---
        document.getElementById('delete-town-btn').addEventListener('click', () => deleteTown());

        // --- New Town ---
        document.getElementById('new-town-btn').addEventListener('click', () => {
            document.getElementById('new-town-name').value = '';
            document.getElementById('new-town-subtitle').value = '';
            document.getElementById('new-town-modal').style.display = 'flex';
        });

        document.getElementById('create-town-btn').addEventListener('click', async () => {
            const name = document.getElementById('new-town-name').value.trim();
            const subtitle = document.getElementById('new-town-subtitle').value.trim();
            if (!name) return;
            try {
                const res = await apiCreateTown(name, subtitle);
                document.getElementById('new-town-modal').style.display = 'none';
                await loadTowns();
                if (res.town) await selectTown(res.town.id);
            } catch (err) {
                alert('Failed to create town: ' + err.message);
            }
        });

        // ═══════════════════════════════════════════════════════
        // AI SIMULATION
        // ═══════════════════════════════════════════════════════
        let simResult = null;

        // Months slider — town sim
        document.getElementById('sim-months').addEventListener('input', e => {
            const v = parseInt(e.target.value);
            document.getElementById('sim-months-val').textContent = v === 0 ? '0 — Add Characters (No Time Passes)' : v;
            // Show arrivals count picker only in 0-month mode
            const picker = document.getElementById('sim-arrivals-row');
            if (picker) picker.style.display = v === 0 ? '' : 'none';
        });

        // Months slider — world sim
        document.getElementById('sim-world-months').addEventListener('input', e => {
            const v = parseInt(e.target.value);
            document.getElementById('sim-world-months-val').textContent = v;
        });

        // Open simulation modal
        document.getElementById('simulate-btn').addEventListener('click', async () => {
            if (!currentTownId) { alert('Select a town first.'); return; }
            // Reset modal state
            document.getElementById('sim-config').style.display = '';
            document.getElementById('sim-loading').style.display = 'none';
            document.getElementById('sim-preview').style.display = 'none';
            document.getElementById('sim-instructions').value = '';
            simResult = null;
            // Load saved campaign rules
            try {
                const res = await apiGetCampaignRules();
                document.getElementById('sim-rules').value = res.rules_text || '';
            } catch (e) { /* ignore */ }
            document.getElementById('sim-modal').style.display = 'flex';
        });

        // ── Simulate World (all towns) ─────────────────────────────

        // Test LLM Connection button
        document.getElementById('sim-world-test-btn').addEventListener('click', async () => {
            const btn = document.getElementById('sim-world-test-btn');
            btn.disabled = true; btn.textContent = '🔄 Testing...';
            try {
                const res = await fetch('simulate.php?action=debug_llm', { method: 'POST' });
                const d = await res.json();
                const available = d.is_available ? '✅ REACHABLE' : '❌ NOT REACHABLE';
                alert(
                    `LLM Connection Test\n` +
                    `URL: ${d.url_tested}\n` +
                    `HTTP: ${d.http_code}\n` +
                    `Error: ${d.curl_error || 'none'}\n` +
                    `Models: ${(d.models_found || []).join(', ') || 'none'}\n` +
                    `Status: ${available}\n` +
                    `PHP: ${d.php_version}`
                );
            } catch (e) {
                alert('Test failed: ' + e.message);
            }
            btn.disabled = false; btn.textContent = '🔌 Test LLM Connection';
        });

        document.getElementById('simulate-world-btn').addEventListener('click', async () => {
            // Reset world modal state
            document.getElementById('sim-world-config').style.display = '';
            document.getElementById('sim-world-loading').style.display = 'none';
            document.getElementById('sim-world-log').value = '';
            document.getElementById('sim-world-instructions').value = '';
            document.getElementById('sim-world-months').value = '3';
            document.getElementById('sim-world-months-val').textContent = '3';
            // Load saved campaign rules
            try {
                const res = await apiGetCampaignRules();
                document.getElementById('sim-world-rules').value = res.rules_text || '';
            } catch (e) { /* ignore */ }
            document.getElementById('sim-world-modal').style.display = 'flex';
        });

        // ── Single-town sim: Run (chunked) ────────────────────────
        document.getElementById('sim-run-btn').addEventListener('click', async () => {
            if (!currentTownId) { alert('Select a town first.'); return; }
            const months = parseInt(document.getElementById('sim-months').value) || 0;
            const rules = document.getElementById('sim-rules').value.trim();
            const instructions = document.getElementById('sim-instructions').value.trim();

            if (rules) { try { await apiSaveCampaignRules(rules); } catch (e) { } }

            document.getElementById('sim-config').style.display = 'none';
            document.getElementById('sim-loading').style.display = '';
            document.getElementById('sim-preview').style.display = 'none';
            document.getElementById('sim-log').value = '';

            try {
                const town = { id: currentTownId, name: currentTown?.name || 'Town' };
                const catCount = months === 0 ? 1 : SIM_CATEGORIES.length;
                const numArrivals = months === 0 ? (parseInt(document.getElementById('sim-arrivals-count')?.value) || 3) : 0;
                simLog(`Simulating "${town.name}" — ${months === 0 ? 'add characters only' : months + ' month(s)'} | ${catCount} categories${numArrivals ? ' | ' + numArrivals + ' arrivals' : ''}`, 'sim-log');
                await runChunkedSim([town], months, rules, instructions, 'sim-log', numArrivals);
                simLog('✅ All done — changes saved directly to database!', 'sim-log');

                // Reload town roster to reflect changes
                const res = await apiGetCharacters(currentTownId);
                currentTown.characters = (res.characters || []).map(normalizeCharacter);
                renderFilters(); renderList(); renderStatsBar();
                try {
                    const calRes = await apiGetCalendar();
                    if (calRes.calendar) { appState.calendar = calRes.calendar; updateCalendarDisplay(); }
                } catch (e) { }

                document.getElementById('sim-loading').style.display = 'none';
                document.getElementById('sim-modal').style.display = 'none';
            } catch (err) {
                document.getElementById('sim-loading').style.display = 'none';
                document.getElementById('sim-config').style.display = '';
                alert('Simulation failed: ' + err.message);
            }
        });

        document.getElementById('sim-back-btn').addEventListener('click', () => {
            document.getElementById('sim-preview').style.display = 'none';
            document.getElementById('sim-config').style.display = '';
        });

        document.getElementById('sim-apply-btn').addEventListener('click', () => {
            // Data already written to DB — just close the modal
            document.getElementById('sim-modal').style.display = 'none';
        });

        /* ── Shared chunked simulation engine ─────────────────────
           Runs: town → month → category, each as a separate LLM call.
           Log target: element ID of a <textarea> to show progress in.
        ─────────────────────────────────────────────────────────── */
        const SIM_CATEGORIES = ['story', 'population', 'social', 'stats'];

        function simLog(msg, logId = 'sim-world-log') {
            const el = document.getElementById(logId);
            if (!el) return;
            const ts = new Date().toLocaleTimeString();
            el.value += `[${ts}] ${msg}\n`;
            el.scrollTop = el.scrollHeight;
        }

        async function simChunk(townId, monthNum, totalMonths, category, rules, instructions, priorContext, extraParams = {}) {
            const res = await fetch('simulate.php?action=simulate_chunk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ town_id: townId, month_num: monthNum, total_months: totalMonths, category, rules, instructions, prior_context: priorContext, ...extraParams })
            });
            const text = await res.text();
            try { return JSON.parse(text); }
            catch (e) { return { category, error: 'parse error: ' + text.slice(0, 80) }; }
        }

        function mergeChunks(monthChunks) {
            const merged = { summary: '', events: [], new_characters: [], deaths: [], new_relationships: [], xp_gains: [], stat_changes: [], role_changes: [], history_entries: [] };
            for (const monthData of monthChunks) {
                for (const [cat, res] of Object.entries(monthData)) {
                    if (!res?.data) continue;
                    const d = res.data;
                    if (d.summary) merged.summary += (merged.summary ? ' ' : '') + d.summary;
                    if (d.events) merged.events.push(...d.events);
                    // population chunk now returns arrivals (minimal) + built characters
                    if (d.built_characters) merged.new_characters.push(...d.built_characters);
                    if (d.new_characters) merged.new_characters.push(...d.new_characters); // fallback
                    if (d.deaths) merged.deaths.push(...d.deaths);
                    if (d.new_relationships) merged.new_relationships.push(...d.new_relationships);
                    if (d.xp_gains) merged.xp_gains.push(...d.xp_gains);
                    if (d.stat_changes) merged.stat_changes.push(...d.stat_changes);
                    if (d.role_changes) merged.role_changes.push(...d.role_changes);
                    if (d.history_entry) merged.history_entries.push(d.history_entry);
                }
            }
            return merged;
        }

        async function runChunkedSim(towns, months, rules, instructions, logId, numArrivals = 0) {
            const EMPTY = { new_characters: [], deaths: [], new_relationships: [], xp_gains: [], stat_changes: [], role_changes: [] };
            // 0-month mode: only add people, no time passes
            const categoriesToRun = months === 0 ? ['population'] : SIM_CATEGORIES;

            for (let ti = 0; ti < towns.length; ti++) {
                const town = towns[ti];
                simLog(`── Town [${ti + 1}/${towns.length}]: "${town.name}" ──`, logId);
                let priorContext = '';

                for (let m = 1; m <= Math.max(months, 1); m++) {
                    const isLastMonth = (m === Math.max(months, 1));
                    if (months > 0) simLog(`  Month ${m}/${months}:`, logId);

                    for (const cat of categoriesToRun) {
                        simLog(`    → ${cat}...`, logId);
                        const extraForCat = (cat === 'population' && numArrivals > 0) ? { num_arrivals: numArrivals } : {};
                        const currentInstructions = (m === 1) ? instructions : '';
                        const res = await simChunk(town.id, m, Math.max(months, 1), cat, rules, currentInstructions, priorContext, extraForCat);
                        const d = res?.data || {};
                        if (d.summary) priorContext += `Month ${m} ${cat}: ${d.summary}\n`;

                        if (cat === 'population') {
                            // Deaths applied immediately
                            if ((d.deaths || []).length) {
                                simLog(`      → applying ${d.deaths.length} death(s)...`, logId);
                                await apiApplySimulation(town.id, { ...EMPTY, deaths: d.deaths }, null, 0);
                            }
                            // Each arrival built + applied one at a time
                            if ((d.arrivals || []).length) {
                                simLog(`      → building ${d.arrivals.length} arrival(s)...`, logId);
                                for (let ai = 0; ai < d.arrivals.length; ai++) {
                                    const a = d.arrivals[ai];
                                    simLog(`        → [${ai + 1}/${d.arrivals.length}] ${a.name} (${a.race} ${a.class})...`, logId);
                                    const charRes = await simChunk(
                                        town.id, m, Math.max(months, 1),
                                        'character_build', rules, currentInstructions, priorContext,
                                        { char_name: a.name, char_race: a.race, char_class: a.class, char_age: a.age, char_gender: a.gender, char_context: a.reason_for_arrival || '' }
                                    );
                                    const charData = charRes?.data && !charRes.data.error ? charRes.data
                                        : { name: a.name, race: a.race, class: a.class, age: a.age, gender: a.gender, status: 'Alive', hp: 8, ac: 10, xp: 0 };
                                    await apiApplySimulation(town.id, { ...EMPTY, new_characters: [charData] }, null, 0);
                                    simLog(`        ✓ ${a.name} saved`, logId);
                                }
                            }

                        } else if (cat === 'story') {
                            if (d.history_entry) {
                                simLog(`      → saving history...`, logId);
                                await apiApplySimulation(town.id, EMPTY, d.history_entry, 0);
                            }

                        } else if (cat === 'social') {
                            const changes = { ...EMPTY, new_relationships: d.new_relationships || [], role_changes: d.role_changes || [] };
                            if (changes.new_relationships.length || changes.role_changes.length) {
                                simLog(`      → saving social changes...`, logId);
                                await apiApplySimulation(town.id, changes, null, 0);
                            }

                        } else if (cat === 'stats') {
                            const changes = { ...EMPTY, xp_gains: d.xp_gains || [], stat_changes: d.stat_changes || [] };
                            const advance = isLastMonth ? months : 0;
                            if (changes.xp_gains.length || changes.stat_changes.length || advance) {
                                simLog(`      → saving stats${advance ? ' + calendar' : ''}...`, logId);
                                await apiApplySimulation(town.id, changes, null, advance);
                            }
                        }

                        simLog(`    ✓ ${cat} done`, logId);
                    }
                }
                simLog(`  ✓ "${town.name}" complete`, logId);
            }
        }

        function buildWorldReport(simulations, months) {
            let report = `<h3 style="margin:0 0 12px">\ud83c\udf0d World Simulation \u2014 ${months} Month(s)</h3>`;
            simulations.forEach(t => {
                const sim = t.simulation || {};
                const err = t.error;
                report += `<details style="margin-bottom:10px"><summary style="cursor:pointer;font-weight:600;color:var(--accent)">${t.town_name}</summary>`;
                if (err) {
                    report += `<p style="color:#e74c3c">${err}</p>`;
                } else {
                    report += `<p style="margin:8px 0;font-style:italic">${sim.summary || ''}</p>`;
                    report += `<ul style="margin:4px 0;font-size:0.85em">
                        <li>\ud83d\udc64 ${(sim.new_characters || []).length} new characters</li>
                        <li>\ud83d\udc80 ${(sim.deaths || []).length} deaths</li>
                        <li>\ud83d\udc8d ${(sim.new_relationships || []).length} new relationships</li>
                        <li>\u2728 ${(sim.xp_gains || []).length} XP updates</li>
                        <li>\ud83d\udcdc ${(sim.history_entries || []).length} history entries</li>
                    </ul>`;
                }
                report += `</details>`;
            });
            report += `<p style="font-size:0.8em;color:var(--muted);margin-top:12px">Open each town's Simulate panel to review and apply individual changes.</p>`;
            return report;
        }

        document.getElementById('sim-world-run-btn').addEventListener('click', async () => {
            const months = parseInt(document.getElementById('sim-world-months').value) || 1;
            const rules = document.getElementById('sim-world-rules').value.trim();
            const instructions = document.getElementById('sim-world-instructions').value.trim();

            if (rules) { try { await apiSaveCampaignRules(rules); } catch (e) { /* ignore */ } }

            document.getElementById('sim-world-config').style.display = 'none';
            document.getElementById('sim-world-loading').style.display = '';
            document.getElementById('sim-world-log').value = '';

            const btn = document.getElementById('simulate-world-btn');
            btn.disabled = true;
            simLog(`World sim: ${months} month(s), ${SIM_CATEGORIES.length} categories/month`, 'sim-world-log');

            try {
                const townsData = await apiGetTowns();
                const allTowns = Array.isArray(townsData) ? townsData : (townsData.towns || []);
                if (!allTowns.length) throw new Error('No towns found.');
                simLog(`Found ${allTowns.length} town(s).`, 'sim-world-log');

                const simulations = await runChunkedSim(allTowns, months, rules, instructions, 'sim-world-log');

                simLog('✅ All done — all towns updated!', 'sim-world-log');
                document.getElementById('sim-world-modal').style.display = 'none';
                document.getElementById('sim-world-loading').style.display = 'none';
                btn.textContent = '🌍 World'; btn.disabled = false;

                document.getElementById('detail-area').innerHTML = `<div class="detail-section" style="padding:20px"><h3>🌍 World Simulation Complete</h3><p>Simulated ${allTowns.length} town(s) over ${months} month(s). All changes have been saved directly to the database.</p><p style="font-size:0.85em;color:var(--muted)">Select a town to review the updated roster and history.</p></div>`;
                try { const calRes = await apiGetCalendar(); if (calRes.calendar) { appState.calendar = calRes.calendar; updateCalendarDisplay(); } } catch (ce) { }

            } catch (err) {
                document.getElementById('sim-world-modal').style.display = 'none';
                document.getElementById('sim-world-loading').style.display = 'none';
                btn.textContent = '\ud83c\udf0d World'; btn.disabled = false;
                alert('World simulation failed: ' + err.message);
            }
        });

        // ── Calendar button ────────────────────────────────────────
        document.getElementById('calendar-btn').addEventListener('click', async () => {
            try {
                const res = await apiGetCalendar();
                appState.calendar = res.calendar;
                const cal = appState.calendar;
                const names = (cal.month_names || []).join(', ');
                const newYear = prompt(`Current year (${cal.era_name}):`, cal.current_year);
                if (newYear === null) return;
                const newMonth = prompt(`Current month (1-${cal.months_per_year}):`, cal.current_month);
                if (newMonth === null) return;
                const newDay = prompt('Current day:', cal.current_day);
                if (newDay === null) return;
                const newEra = prompt('Era suffix (e.g. DR, AE):', cal.era_name);
                if (newEra === null) return;

                await apiSaveCalendar({
                    ...cal,
                    current_year: parseInt(newYear) || cal.current_year,
                    current_month: parseInt(newMonth) || cal.current_month,
                    current_day: parseInt(newDay) || cal.current_day,
                    era_name: newEra.trim()
                });
                // Refresh
                const refreshed = await apiGetCalendar();
                appState.calendar = refreshed.calendar;
                updateCalendarDisplay();
            } catch (err) {
                alert('Calendar error: ' + err.message);
            }
        });


        // ── Bug Report ──────────────────────────────────────────
        let bugSeverity = 'medium';

        document.getElementById('bug-report-btn')?.addEventListener('click', () => {
            document.getElementById('bug-title').value = '';
            document.getElementById('bug-description').value = '';
            document.getElementById('bug-steps').value = '';
            document.getElementById('bug-page').value = '';
            bugSeverity = 'medium';
            // Reset severity picker visual state
            document.querySelectorAll('.bug-sev-btn').forEach(b => {
                b.style.border = '1px solid var(--border)';
                b.style.background = 'var(--card-bg,#1a1a2e)';
                b.style.fontWeight = 'normal';
            });
            const medBtn = document.querySelector('.bug-sev-btn[data-severity="medium"]');
            if (medBtn) {
                medBtn.style.border = '1px solid #c8a415';
                medBtn.style.background = 'rgba(234,179,8,0.12)';
                medBtn.style.fontWeight = '600';
            }
            document.getElementById('bug-report-modal').style.display = 'flex';
        });

        document.getElementById('bug-severity-picker')?.addEventListener('click', e => {
            const btn = e.target.closest('.bug-sev-btn');
            if (!btn) return;
            bugSeverity = btn.dataset.severity;
            document.querySelectorAll('.bug-sev-btn').forEach(b => {
                b.style.border = '1px solid var(--border)';
                b.style.background = 'var(--card-bg,#1a1a2e)';
                b.style.fontWeight = 'normal';
            });
            btn.style.border = '1px solid #c8a415';
            btn.style.background = 'rgba(234,179,8,0.12)';
            btn.style.fontWeight = '600';
        });

        document.getElementById('bug-submit-btn')?.addEventListener('click', async () => {
            const title = document.getElementById('bug-title').value.trim();
            if (!title) { alert('Please enter a title.'); return; }

            const btn = document.getElementById('bug-submit-btn');
            btn.disabled = true;
            btn.textContent = '⏳ Sending...';

            try {
                const res = await fetch('api.php?action=submit_bug_report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        title,
                        description: document.getElementById('bug-description').value.trim(),
                        steps: document.getElementById('bug-steps').value.trim(),
                        severity: bugSeverity,
                        page: document.getElementById('bug-page').value.trim(),
                        browser: navigator.userAgent.slice(0, 200),
                    })
                });
                const data = await res.json();
                if (data.ok) {
                    alert('Bug report sent to Discord! Thank you. 🎉');
                    document.getElementById('bug-report-modal').style.display = 'none';
                } else {
                    throw new Error(data.error || 'Unknown error');
                }
            } catch (err) {
                alert('Failed to send: ' + err.message);
            }
            btn.disabled = false;
            btn.textContent = '📨 Send Report';
        });

        // --- Modal dismiss ---
        document.querySelectorAll('.modal-close, [data-dismiss]').forEach(btn => {
            btn.addEventListener('click', () => {
                const dismiss = btn.dataset.dismiss;
                if (dismiss === 'import') document.getElementById('import-modal').style.display = 'none';
                else if (dismiss === 'edit') document.getElementById('edit-modal').style.display = 'none';
                else if (dismiss === 'sim') document.getElementById('sim-modal').style.display = 'none';
                else if (dismiss === 'sim-world') document.getElementById('sim-world-modal').style.display = 'none';
                else if (dismiss === 'new-town') document.getElementById('new-town-modal').style.display = 'none';
                else if (dismiss === 'town-settings') document.getElementById('town-settings-modal').style.display = 'none';
                else if (dismiss === 'bug-report') document.getElementById('bug-report-modal').style.display = 'none';
                else btn.closest('.modal')?.style.setProperty('display', 'none');
            });
        });
    }

    /* ══════════════════════════════════════════════════════════
       SIMULATION PREVIEW RENDERER
       ══════════════════════════════════════════════════════════ */
    function renderSimPreview(sim) {
        // Summary
        document.getElementById('sim-summary').innerHTML = sim.summary || 'No summary provided.';

        const changes = sim.changes || {};
        let html = '';

        // Helper to render a category
        const renderCategory = (title, emoji, badgeClass, items, cat, renderItem) => {
            if (!items || items.length === 0) return '';
            let h = `<div class="sim-category">
                <div class="sim-category-title">${emoji} ${title} <span class="sim-badge ${badgeClass}">${items.length}</span></div>`;
            items.forEach((item, i) => {
                h += `<div class="sim-item">
                    <input type="checkbox" checked data-cat="${cat}" data-idx="${i}">
                    <div class="sim-item-text">${renderItem(item)}</div>
                </div>`;
            });
            h += '</div>';
            return h;
        };

        // New Characters
        html += renderCategory('New Characters', '🆕', 'sim-badge-new', changes.new_characters, 'new_characters', c =>
            `<span class="sim-item-name">${c.name}</span> — ${c.race} ${c.class}, Age ${c.age}<br><span class="sim-item-reason">${c.reason || ''}</span>`
        );

        // Deaths
        html += renderCategory('Deaths', '⚰️', 'sim-badge-death', changes.deaths, 'deaths', d =>
            `<span class="sim-item-name">${d.name}</span><br><span class="sim-item-reason">${d.reason || ''}</span>`
        );

        // New Relationships
        html += renderCategory('New Relationships', '💑', 'sim-badge-love', changes.new_relationships, 'new_relationships', r =>
            `<span class="sim-item-name">${r.char1}</span> & <span class="sim-item-name">${r.char2}</span> — ${r.type}<br><span class="sim-item-reason">${r.reason || ''}</span>`
        );

        // XP Gains
        html += renderCategory('XP Gains', '📈', 'sim-badge-xp', changes.xp_gains, 'xp_gains', x =>
            `<span class="sim-item-name">${x.name}</span> +${x.xp_gained} XP<br><span class="sim-item-reason">${x.reason || ''}</span>`
        );

        // Stat Changes
        html += renderCategory('Stat Changes', '📊', 'sim-badge-stat', changes.stat_changes, 'stat_changes', s =>
            `<span class="sim-item-name">${s.name}</span> — ${s.field}: ${s.old_value} → ${s.new_value}<br><span class="sim-item-reason">${s.reason || ''}</span>`
        );

        // Role Changes
        html += renderCategory('Role Changes', '👔', 'sim-badge-role', changes.role_changes, 'role_changes', rc =>
            `<span class="sim-item-name">${rc.name}</span> — ${rc.old_role} → ${rc.new_role}<br><span class="sim-item-reason">${rc.reason || ''}</span>`
        );

        if (!html) html = '<p class="empty-msg">No changes proposed.</p>';

        document.getElementById('sim-changes').innerHTML = html;
    }

})();
