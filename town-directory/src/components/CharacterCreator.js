/**
 * Eon Weaver — Character Creator (DM Genie Style)
 * Tabbed interface: Class | Abilities & Stats | Skills | Feats | Features | Review
 * All data loaded from SRD database tables.
 */
import { apiFetch } from '../api/client.js';
import { apiSaveCharacter } from '../api/characters.js';
import {
    loadSrdSkills,
    loadMergedRaces, loadMergedClasses, loadMergedFeats, loadMergedEquipment,
    clearCustomContentCache,
    parseAbilityMods, parseHitDie, parseGoodSaves
} from '../api/srd.js';
import { abilityMod, calcBAB, calcBaseSave, maxSkillRanks } from '../engine/rules35e.js';
import { formatMod } from '../engine/dice.js';

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */
const ALIGNMENTS = ['Lawful Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'True Neutral', 'Chaotic Neutral', 'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'];
const ABILITIES = ['str', 'dex', 'con', 'int_', 'wis', 'cha'];
const AB_LABELS = { str: 'STR', dex: 'DEX', con: 'CON', int_: 'INT', wis: 'WIS', cha: 'CHA' };
const POINT_BUY_COST = { 7: -4, 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 6, 15: 8, 16: 10, 17: 13, 18: 16 };
const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const NPC_CLASSES = ['Adept', 'Aristocrat', 'Commoner', 'Expert', 'Warrior'];

/* ═══════════════════════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════════════════════ */
let srdRaces = [], srdClasses = [], srdFeats = [], srdEquipment = [], srdSkills = [];
let state = null;

function defaultState() {
    return {
        tab: 'class', name: '', gender: '', race: '', class_: '', level: 1,
        alignment: 'True Neutral', abilityMethod: 'pointbuy',
        abilities: { str: 10, dex: 10, con: 10, int_: 10, wis: 10, cha: 10 },
        skillRanks: {}, selectedFeats: [], gear: '', languages: '', history: '',
        // Filters
        showPcClasses: true, showNpcClasses: true, showPrestigeClasses: true,
        showAllSkills: true, showAllFeats: true,
        // Edit mode fields
        _editMode: false, _editId: null, _editTownId: null,
        _editStatus: 'Alive', _editRole: '', _editAge: null,
        _editPortraitUrl: '', _editXp: 0, _editCr: '',
        _onEditComplete: null, _onEditCancel: null,
    };
}

function getRace(n) { return srdRaces.find(r => r.name === n) || srdRaces[0] || {}; }
function getClass(n) { return srdClasses.find(c => c.name === n) || srdClasses[0] || {}; }
function raceMods(r) { return parseAbilityMods(r?.ability_mods); }
function classHd(c) { return parseHitDie(c?.hit_die); }
function classGoodSaves(c) { return parseGoodSaves(c?.good_saves); }
function classSkillList(c) { return (c?.class_skills || '').split(',').map(s => s.trim()).filter(Boolean); }
function isNpcClass(name) { return NPC_CLASSES.includes(name); }

/**
 * Built-in mechanical modifiers for SRD feats with quantifiable effects.
 * These apply automatically without needing homebrew modifier definitions.
 */
const SRD_FEAT_MODIFIERS = {
    'Improved Initiative':  [{ type: 'initiative', value: 4 }],
    'Toughness':            [{ type: 'hp', value: 3 }],
    'Iron Will':            [{ type: 'save', target: 'will', value: 2 }],
    'Great Fortitude':      [{ type: 'save', target: 'fort', value: 2 }],
    'Lightning Reflexes':   [{ type: 'save', target: 'ref', value: 2 }],
    'Alertness':            [{ type: 'skill', target: 'Listen', value: 2 }, { type: 'skill', target: 'Spot', value: 2 }],
    'Dodge':                [{ type: 'ac', value: 1 }],
    'Point Blank Shot':     [{ type: 'attack', value: 1 }, { type: 'damage', value: 1 }],  // within 30ft
    'Weapon Focus':         [{ type: 'attack', value: 1 }],
    'Weapon Specialization':[{ type: 'damage', value: 2 }],
};

/**
 * Gather all structured modifiers from selected feats.
 * Falls back to SRD_FEAT_MODIFIERS for known SRD feats.
 * Returns an array of { type, target?, value } objects.
 */
function getSelectedFeatModifiers() {
    if (!state) return [];
    const mods = [];
    for (const featName of state.selectedFeats) {
        const feat = srdFeats.find(f => f.name === featName);
        // 1) Try structured modifiers from homebrew feats
        let parsed = [];
        if (feat) {
            if (typeof feat.modifiers === 'string') {
                try { parsed = JSON.parse(feat.modifiers) || []; } catch { parsed = []; }
            } else if (Array.isArray(feat.modifiers)) {
                parsed = feat.modifiers;
            }
        }
        // 2) Fall back to built-in SRD feat modifiers
        if (!parsed.length && SRD_FEAT_MODIFIERS[featName]) {
            parsed = SRD_FEAT_MODIFIERS[featName];
        }
        for (const m of parsed) {
            if (m && m.type && typeof m.value === 'number') mods.push(m);
        }
    }
    return mods;
}

/** Sum all feat modifiers of a given type (optionally filtered by target). */
function featBonus(type, target = null) {
    return getSelectedFeatModifiers()
        .filter(m => m.type === type && (target === null || m.target === target || m.target === 'all_saves'))
        .reduce((sum, m) => sum + (m.value || 0), 0);
}

function finalAbility(ab) {
    const r = getRace(state.race); const mods = raceMods(r);
    // ab uses 'int_' internally but feat modifiers use 'int'
    const modKey = ab === 'int_' ? 'int' : ab;
    return state.abilities[ab] + (mods[ab] || 0) + featBonus('ability', modKey);
}
function totalSkillPoints() {
    const cls = getClass(state.class_); const intMod = abilityMod(finalAbility('int_'));
    const base = (parseInt(cls?.skills_per_level) || 2) + intMod;
    const perLvl = Math.max(1, base);
    const race = getRace(state.race);
    const humanBonus = (race?.name === 'Human') ? 4 : 0;
    return perLvl * state.level + humanBonus;
}
function usedSkillPoints() { return Object.values(state.skillRanks).reduce((a, b) => a + b, 0); }

/** Parse modifiers from a feat object (handles JSON string or array). */
function parseFeatModifiers(feat) {
    if (!feat?.modifiers) return [];
    let mods = feat.modifiers;
    if (typeof mods === 'string') { try { mods = JSON.parse(mods); } catch { return []; } }
    return Array.isArray(mods) ? mods.filter(m => m && m.type && typeof m.value === 'number') : [];
}

/** Format a single modifier as a compact badge string. */
function formatModBadge(m) {
    const TL = { str:'STR', dex:'DEX', con:'CON', int:'INT', wis:'WIS', cha:'CHA',
                 fort:'Fort', ref:'Ref', will:'Will', all_saves:'All Saves' };
    const v = `${m.value >= 0 ? '+' : ''}${m.value}`;
    switch (m.type) {
        case 'ability': return `<span class="cc-mod-badge cc-mod-ability">${v} ${TL[m.target] || m.target}</span>`;
        case 'save':    return `<span class="cc-mod-badge cc-mod-save">${v} ${TL[m.target] || m.target}</span>`;
        case 'skill':   return `<span class="cc-mod-badge cc-mod-skill">${v} ${m.target || 'Skill'}</span>`;
        case 'ac':      return `<span class="cc-mod-badge cc-mod-ac">${v} AC</span>`;
        case 'hp':      return `<span class="cc-mod-badge cc-mod-hp">${v} HP</span>`;
        case 'initiative': return `<span class="cc-mod-badge cc-mod-init">${v} Init</span>`;
        case 'attack':  return `<span class="cc-mod-badge cc-mod-atk">${v} Atk</span>`;
        case 'damage':  return `<span class="cc-mod-badge cc-mod-dmg">${v} Dmg</span>`;
        case 'speed':   return `<span class="cc-mod-badge cc-mod-spd">${v} ft</span>`;
        default:        return `<span class="cc-mod-badge">${v} ${m.type}</span>`;
    }
}

/* ═══════════════════════════════════════════════════════════
   MAIN RENDER
   ═══════════════════════════════════════════════════════════ */
export async function initCreator() {
    // Clear homebrew cache so we always pick up newly-created custom content
    clearCustomContentCache();
    [srdRaces, srdClasses, srdFeats, srdEquipment, srdSkills] = await Promise.all([
        loadMergedRaces(), loadMergedClasses(), loadMergedFeats(), loadMergedEquipment(), loadSrdSkills()
    ]);
    state = defaultState();
    state.race = srdRaces[0]?.name || 'Human';
    state.class_ = srdClasses.find(c => !isNpcClass(c.name))?.name || srdClasses[0]?.name || 'Fighter';
}

/**
 * Initialize the Creator in EDIT mode from an existing character.
 * Hydrates the wizard state from stored character data.
 */
export async function initCreatorFromCharacter(character, { townId, onComplete, onCancel } = {}) {
    clearCustomContentCache();
    [srdRaces, srdClasses, srdFeats, srdEquipment, srdSkills] = await Promise.all([
        loadMergedRaces(), loadMergedClasses(), loadMergedFeats(), loadMergedEquipment(), loadSrdSkills()
    ]);
    state = defaultState();

    // Parse class + level from "Fighter 3" format
    const classStr = character.class || '';
    const classMatch = classStr.match(/^(.+?)\s+(\d+)$/);
    const className = classMatch ? classMatch[1].trim() : classStr.trim();
    const level = classMatch ? parseInt(classMatch[2]) : (parseInt(character.level) || 1);

    // Set basic fields
    state.name = character.name || '';
    state.gender = character.gender || '';
    state.race = character.race || srdRaces[0]?.name || 'Human';
    state.class_ = className || srdClasses[0]?.name || 'Fighter';
    state.level = level;
    state.alignment = character.alignment || 'True Neutral';
    state.abilityMethod = 'manual';  // Editing = manual scores

    // Reverse-compute base abilities (subtract racial mods)
    const race = getRace(state.race);
    const rMods = raceMods(race);
    ABILITIES.forEach(ab => {
        const rawKey = ab === 'int_' ? 'int_' : ab;
        const charVal = parseInt(character[rawKey]) || 10;
        const racialMod = rMods[ab] || 0;
        state.abilities[ab] = charVal - racialMod;
    });

    // Parse feats
    state.selectedFeats = (character.feats || '').split(/[,;]/).map(f => f.trim()).filter(Boolean);

    // Parse skill ranks from skills_feats string (e.g. "Climb +5, Hide +3")
    state.skillRanks = {};
    const skillsStr = character.skills_feats || '';
    if (skillsStr) {
        const parts = skillsStr.split(/,\s*/);
        for (const part of parts) {
            const m = part.match(/^(.+?)\s+[+-]?(\d+)$/);
            if (m) {
                const skillName = m[1].trim();
                const total = parseInt(m[2]) || 0;
                // Estimate ranks = total - ability mod (best guess)
                const sk = srdSkills.find(s => s.name === skillName);
                if (sk) {
                    const abKey = sk.ability.toLowerCase() === 'int' ? 'int_' : sk.ability.toLowerCase();
                    const abMod = abilityMod(finalAbility(abKey));
                    state.skillRanks[skillName] = Math.max(0, total - abMod);
                } else {
                    state.skillRanks[skillName] = total;  // can't determine, use raw
                }
            }
        }
    }

    // Other fields
    state.gear = character.gear || '';
    state.languages = character.languages || '';
    state.history = character.history || '';

    // Edit mode metadata
    state._editMode = true;
    state._editId = character.id || character.dbId;
    state._editTownId = townId;
    state._editStatus = character.status || 'Alive';
    state._editRole = character.role || '';
    state._editAge = character.age ? parseInt(character.age) : null;
    state._editPortraitUrl = character.portrait_url || '';
    state._editXp = parseInt(character.xp) || 0;
    state._editCr = character.cr || '';
    state._onEditComplete = onComplete || null;
    state._onEditCancel = onCancel || null;
    state.tab = 'review';  // Start on review tab in edit mode
}

export function resetCreatorState() {
    state = defaultState();
    state.race = srdRaces[0]?.name || 'Human';
    state.class_ = srdClasses.find(c => !isNpcClass(c.name))?.name || srdClasses[0]?.name || 'Fighter';
}

export function renderCreator(panel) {
    if (!state) { state = defaultState(); state.race = srdRaces[0]?.name || 'Human'; state.class_ = srdClasses[0]?.name || 'Fighter'; }
    const s = state;
    const cls = getClass(s.class_); const race = getRace(s.race);
    const isEdit = s._editMode;

    panel.innerHTML = `
    <div class="cc-root">
        <div class="cc-header">
            <div class="cc-header-info">
                ${isEdit ? '<button class="btn-secondary btn-sm" id="cc-cancel-edit" style="margin-right:0.5rem;font-size:0.7rem;">← Back to Sheet</button>' : ''}
                <input type="text" id="cc-name" class="cc-name-input" value="${s.name}" placeholder="Character Name...">
                <span class="cc-header-detail">${isEdit ? '✏️ Editing · ' : ''}${s.race} ${s.class_} ${s.level}</span>
            </div>
            <div class="cc-header-right">
                <select id="cc-race" class="cc-header-select">${srdRaces.map(r => `<option value="${r.name}" ${s.race === r.name ? 'selected' : ''}>${r.name}${r._isHomebrew ? ' ✨' : ''}</option>`).join('')}</select>
                <select id="cc-alignment" class="cc-header-select">${ALIGNMENTS.map(a => `<option value="${a}" ${s.alignment === a ? 'selected' : ''}>${a}</option>`).join('')}</select>
            </div>
        </div>
        <div class="cc-tabs" id="cc-tabs">
            ${['class', 'abilities', 'skills', 'feats', 'features', 'review'].map(t =>
        `<button class="cc-tab ${s.tab === t ? 'active' : ''}" data-tab="${t}">${{ class: '⚔️ Class', abilities: '📊 Abilities', skills: '📜 Skills', feats: '🏅 Feats', features: '✨ Features', review: '✅ Review' }[t]
        }</button>`
    ).join('')}
        </div>
        <div class="cc-body" id="cc-body"></div>
    </div>`;

    renderTab(panel);
    bindHeaderEvents(panel);

    // Wire cancel button in edit mode
    if (isEdit) {
        panel.querySelector('#cc-cancel-edit')?.addEventListener('click', () => {
            if (s._onEditCancel) s._onEditCancel();
        });
    }
}

function bindHeaderEvents(panel) {
    panel.querySelector('#cc-name')?.addEventListener('input', e => { state.name = e.target.value.trim(); updateHeaderInfo(panel); });
    panel.querySelector('#cc-race')?.addEventListener('change', e => { state.race = e.target.value; rerender(panel); });
    panel.querySelector('#cc-alignment')?.addEventListener('change', e => { state.alignment = e.target.value; });
    panel.querySelector('#cc-tabs')?.addEventListener('click', e => {
        const btn = e.target.closest('.cc-tab'); if (!btn) return;
        state.tab = btn.dataset.tab; rerender(panel);
    });
}

function rerender(panel) { renderCreator(panel); }
function updateHeaderInfo(panel) {
    const el = panel.querySelector('.cc-header-detail');
    if (el) el.textContent = `${state.race} ${state.class_} ${state.level}`;
}

/* ═══════════════════════════════════════════════════════════
   TAB ROUTER
   ═══════════════════════════════════════════════════════════ */
function renderTab(panel) {
    const body = panel.querySelector('#cc-body');
    if (!body) return;
    switch (state.tab) {
        case 'class': renderClassTab(body, panel); break;
        case 'abilities': renderAbilitiesTab(body, panel); break;
        case 'skills': renderSkillsTab(body, panel); break;
        case 'feats': renderFeatsTab(body, panel); break;
        case 'features': renderFeaturesTab(body, panel); break;
        case 'review': renderReviewTab(body, panel); break;
    }
}

/* ═══════════════════════════════════════════════════════════
   TAB 1: CLASS
   ═══════════════════════════════════════════════════════════ */
function renderClassTab(body, panel) {
    const s = state, cls = getClass(s.class_), race = getRace(s.race);
    const mods = raceMods(race);

    // Filter classes
    let filtered = srdClasses.filter(c => {
        if (isNpcClass(c.name) && !s.showNpcClasses) return false;
        if (!isNpcClass(c.name) && !s.showPcClasses) return false;
        return true;
    });

    body.innerHTML = `
    <div class="cc-class-layout">
        <div class="cc-class-left">
            <div class="cc-filter-row">
                <label class="cc-checkbox"><input type="checkbox" id="cc-filter-pc" ${s.showPcClasses ? 'checked' : ''}> PC Classes</label>
                <label class="cc-checkbox"><input type="checkbox" id="cc-filter-npc" ${s.showNpcClasses ? 'checked' : ''}> NPC Classes</label>
            </div>
            <div class="cc-class-list" id="cc-class-list">
                ${filtered.map(c => `
                    <div class="cc-class-item ${s.class_ === c.name ? 'selected' : ''}" data-class="${c.name}">
                        <span class="cc-class-item-name">${c.name}${c._isHomebrew ? ' <span class="cc-homebrew-badge">✨ Homebrew</span>' : ''}</span>
                        <span class="cc-class-item-hd">${c.hit_die}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="cc-class-right">
            <div class="cc-class-info">
                <div class="cc-info-row">
                    <span class="cc-info-label">Class Selected:</span>
                    <span class="cc-info-value">${cls.name} (${cls.hit_die})</span>
                </div>
                <div class="cc-info-row">
                    <span class="cc-info-label">Level:</span>
                    <input type="number" id="cc-level" class="cc-level-input" value="${s.level}" min="1" max="20">
                </div>
                <div class="cc-info-row">
                    <span class="cc-info-label">Gender:</span>
                    <select id="cc-gender" class="cc-info-select">
                        <option value="" ${!s.gender ? 'selected' : ''}>Any</option>
                        <option value="Male" ${s.gender === 'Male' ? 'selected' : ''}>Male</option>
                        <option value="Female" ${s.gender === 'Female' ? 'selected' : ''}>Female</option>
                    </select>
                </div>
                <div class="cc-info-row">
                    <span class="cc-info-label">BAB Type:</span>
                    <span class="cc-info-value">${cls.bab_type || '—'}</span>
                </div>
                <div class="cc-info-row">
                    <span class="cc-info-label">Good Saves:</span>
                    <span class="cc-info-value">${cls.good_saves || 'None'}</span>
                </div>
                <div class="cc-info-row">
                    <span class="cc-info-label">Skills/Level:</span>
                    <span class="cc-info-value">${cls.skills_per_level || 2} + INT mod</span>
                </div>
            </div>
            <div class="cc-race-traits">
                <h4>📋 ${race.name} Traits</h4>
                <div class="cc-traits-grid">
                    <span>Size: <strong>${race.size || 'Medium'}</strong></span>
                    <span>Speed: <strong>${parseInt(race.speed) || 30} ft</strong></span>
                    ${Object.entries(mods).length ? `<span>Ability Mods: <strong>${Object.entries(mods).map(([k, v]) => `${formatMod(v)} ${AB_LABELS[k]}`).join(', ')}</strong></span>` : '<span>No ability adjustments</span>'}
                    <span>Languages: <strong>${(race.languages || 'Common').split(',').map(s => s.trim()).join(', ')}</strong></span>
                </div>
            </div>
            <div class="cc-class-desc">
                <h4>📖 ${cls.name}</h4>
                <p>${cls.class_features || 'No description available.'}</p>
            </div>
        </div>
    </div>`;

    // Events
    body.querySelector('#cc-class-list').addEventListener('click', e => {
        const item = e.target.closest('.cc-class-item'); if (!item) return;
        s.class_ = item.dataset.class; rerender(panel);
    });
    body.querySelector('#cc-level')?.addEventListener('input', e => {
        s.level = Math.max(1, Math.min(20, parseInt(e.target.value) || 1));
        updateHeaderInfo(panel);
    });
    body.querySelector('#cc-gender')?.addEventListener('change', e => { s.gender = e.target.value; });
    body.querySelector('#cc-filter-pc')?.addEventListener('change', e => { s.showPcClasses = e.target.checked; renderClassTab(body, panel); });
    body.querySelector('#cc-filter-npc')?.addEventListener('change', e => { s.showNpcClasses = e.target.checked; renderClassTab(body, panel); });
}

/* ═══════════════════════════════════════════════════════════
   TAB 2: ABILITIES & STATS
   ═══════════════════════════════════════════════════════════ */
function renderAbilitiesTab(body, panel) {
    const s = state, race = getRace(s.race), cls = getClass(s.class_);
    const mods = raceMods(race), hd = classHd(cls), gs = classGoodSaves(cls);
    const lvl = s.level;
    const totalPts = 25;
    let spent = 0; ABILITIES.forEach(a => { spent += POINT_BUY_COST[s.abilities[a]] || 0; });
    const remaining = totalPts - spent;

    // Calculated stats — include feat modifier bonuses
    const conFinal = finalAbility('con'), dexFinal = finalAbility('dex');
    const conMod = abilityMod(conFinal), dexMod = abilityMod(dexFinal);
    const hpLvl1 = hd + conMod;
    const hpTotal = Math.max(1, hpLvl1 + (lvl - 1) * Math.max(1, Math.floor(hd / 2 + 1) + conMod)) + featBonus('hp');
    const bab = calcBAB(s.class_, lvl) + featBonus('attack');
    const ac = 10 + dexMod + ((race.size || 'Medium') === 'Small' ? 1 : 0) + featBonus('ac');
    const fort = calcBaseSave(lvl, gs.includes('fort')) + abilityMod(finalAbility('con')) + featBonus('save', 'fort');
    const ref = calcBaseSave(lvl, gs.includes('ref')) + abilityMod(finalAbility('dex')) + featBonus('save', 'ref');
    const will = calcBaseSave(lvl, gs.includes('will')) + abilityMod(finalAbility('wis')) + featBonus('save', 'will');
    const initBonus = dexMod + featBonus('initiative');

    body.innerHTML = `
    <div class="cc-abilities-layout">
        <div class="cc-method-toggle">
            <button class="cc-method-btn ${s.abilityMethod === 'pointbuy' ? 'active' : ''}" data-method="pointbuy">Point Buy (25)</button>
            <button class="cc-method-btn ${s.abilityMethod === 'standard' ? 'active' : ''}" data-method="standard">Standard Array</button>
            <button class="cc-method-btn ${s.abilityMethod === 'manual' ? 'active' : ''}" data-method="manual">Manual Entry</button>
        </div>
        ${s.abilityMethod === 'pointbuy' ? `<div class="cc-points-bar">Points: <strong class="${remaining < 0 ? 'text-danger' : remaining === 0 ? 'text-success' : ''}">${remaining}</strong> / ${totalPts}</div>` : ''}

        <div class="cc-ability-grid">
            ${ABILITIES.map(a => {
        const base = s.abilities[a], rm = mods[a] || 0;
        const modKey = a === 'int_' ? 'int' : a;
        const fb = featBonus('ability', modKey);
        const fin = base + rm + fb, mod = abilityMod(fin), cost = POINT_BUY_COST[base] || 0;
        return `<div class="cc-ability-card">
                    <div class="cc-ab-label">${AB_LABELS[a]}</div>
                    <div class="cc-ab-controls">
                        ${s.abilityMethod !== 'manual' ? `<button class="cc-ab-btn cc-ab-minus" data-ab="${a}" ${base <= 7 ? 'disabled' : ''}>−</button>` : ''}
                        <input type="number" class="cc-ab-input" data-ab="${a}" value="${base}" min="3" max="18" ${s.abilityMethod === 'pointbuy' ? 'readonly' : ''}>
                        ${s.abilityMethod !== 'manual' ? `<button class="cc-ab-btn cc-ab-plus" data-ab="${a}" ${base >= 18 ? 'disabled' : ''}>+</button>` : ''}
                    </div>
                    ${rm || fb ? `<div class="cc-ab-race">${rm ? formatMod(rm) + ' racial' : ''}${rm && fb ? ', ' : ''}${fb ? formatMod(fb) + ' feat' : ''}</div>` : '<div class="cc-ab-race">&nbsp;</div>'}
                    <div class="cc-ab-final"><span class="cc-ab-total">${fin}</span><span class="cc-ab-mod">${formatMod(mod)}</span></div>
                    ${s.abilityMethod === 'pointbuy' ? `<div class="cc-ab-cost">Cost: ${cost}</div>` : ''}
                </div>`;
    }).join('')}
        </div>

        <div class="cc-stats-row">
            <div class="cc-stat-box cc-stat-hp"><div class="cc-stat-label">HP</div><div class="cc-stat-val">${hpTotal}</div><div class="cc-stat-detail">${cls.hit_die}+${formatMod(conMod)}/lvl</div></div>
            <div class="cc-stat-box"><div class="cc-stat-label">AC</div><div class="cc-stat-val">${ac}</div></div>
            <div class="cc-stat-box"><div class="cc-stat-label">BAB</div><div class="cc-stat-val">+${bab}</div></div>
            <div class="cc-stat-box"><div class="cc-stat-label">Fort</div><div class="cc-stat-val">${formatMod(fort)}</div></div>
            <div class="cc-stat-box"><div class="cc-stat-label">Ref</div><div class="cc-stat-val">${formatMod(ref)}</div></div>
            <div class="cc-stat-box"><div class="cc-stat-label">Will</div><div class="cc-stat-val">${formatMod(will)}</div></div>
            <div class="cc-stat-box"><div class="cc-stat-label">Init</div><div class="cc-stat-val">${formatMod(initBonus)}</div></div>
        </div>
    </div>`;

    // Events
    body.querySelectorAll('.cc-method-btn').forEach(btn => btn.addEventListener('click', () => {
        s.abilityMethod = btn.dataset.method;
        if (btn.dataset.method === 'standard') ABILITIES.forEach((a, i) => { s.abilities[a] = STANDARD_ARRAY[i]; });
        renderAbilitiesTab(body, panel);
    }));
    body.querySelectorAll('.cc-ab-minus').forEach(b => b.addEventListener('click', () => { const a = b.dataset.ab; if (s.abilities[a] > 7) { s.abilities[a]--; renderAbilitiesTab(body, panel); } }));
    body.querySelectorAll('.cc-ab-plus').forEach(b => b.addEventListener('click', () => { const a = b.dataset.ab; if (s.abilities[a] < 18) { s.abilities[a]++; renderAbilitiesTab(body, panel); } }));
    if (s.abilityMethod === 'manual') body.querySelectorAll('.cc-ab-input').forEach(inp => inp.addEventListener('change', () => { s.abilities[inp.dataset.ab] = Math.max(3, Math.min(18, parseInt(inp.value) || 10)); renderAbilitiesTab(body, panel); }));
}

/* ═══════════════════════════════════════════════════════════
   TAB 3: SKILLS
   ═══════════════════════════════════════════════════════════ */
function renderSkillsTab(body, panel) {
    const s = state, cls = getClass(s.class_);
    const clsSkills = classSkillList(cls);
    const total = totalSkillPoints(), used = usedSkillPoints(), remaining = total - used;
    const maxClass = maxSkillRanks(s.level, true);
    const maxCross = maxSkillRanks(s.level, false);

    let skills = [...srdSkills];
    if (!s.showAllSkills) skills = skills.filter(sk => clsSkills.includes(sk.name));

    body.innerHTML = `
    <div class="cc-skills-layout">
        <div class="cc-skills-header">
            <div class="cc-skills-points">
                Skill Points: <strong class="${remaining < 0 ? 'text-danger' : remaining === 0 ? 'text-success' : ''}">${remaining}</strong> / ${total}
                <span class="cc-skills-hint">(Class max: ${maxClass}, Cross-class max: ${maxCross})</span>
            </div>
            <div class="cc-filter-row">
                <label class="cc-checkbox">
                    <input type="checkbox" id="cc-skills-filter" ${s.showAllSkills ? 'checked' : ''}>
                    Show All Skills
                </label>
                <span class="cc-filter-hint">${s.showAllSkills ? '' : 'Showing class skills only'}</span>
            </div>
        </div>
        <div class="cc-skills-table">
            <div class="cc-skill-header-row">
                <span class="cc-skill-h-name">Skill</span>
                <span class="cc-skill-h-ab">Ability</span>
                <span class="cc-skill-h-class">Class?</span>
                <span class="cc-skill-h-ranks">Ranks</span>
                <span class="cc-skill-h-mod">Total</span>
            </div>
            ${skills.map(sk => {
        const isClass = clsSkills.includes(sk.name);
        const ranks = s.skillRanks[sk.name] || 0;
        const maxR = isClass ? maxClass : maxCross;
        const abKey = sk.ability.toLowerCase() === 'int' ? 'int_' : sk.ability.toLowerCase();
        const abMod = abilityMod(finalAbility(abKey));
        const skillFeatBonus = featBonus('skill', sk.name);
        const totalMod = ranks + abMod + skillFeatBonus;
        return `<div class="cc-skill-row ${isClass ? 'cc-skill-class' : 'cc-skill-cross'} ${ranks > 0 ? 'cc-skill-active' : ''}">
                    <span class="cc-skill-name" title="${sk.trained_only ? 'Trained only' : ''}">
                        ${sk.name}${sk.trained_only ? ' *' : ''}
                    </span>
                    <span class="cc-skill-ab">${sk.ability}</span>
                    <span class="cc-skill-isclass">${isClass ? '✓' : ''}</span>
                    <span class="cc-skill-ranks">
                        <button class="cc-sk-btn cc-sk-minus" data-skill="${sk.name}" ${ranks <= 0 ? 'disabled' : ''}>−</button>
                        <span class="cc-sk-val">${ranks}</span>
                        <button class="cc-sk-btn cc-sk-plus" data-skill="${sk.name}" ${ranks >= maxR || remaining <= 0 ? 'disabled' : ''}>+</button>
                    </span>
                    <span class="cc-skill-total ${totalMod >= 0 ? '' : 'text-danger'}">${formatMod(totalMod)}${skillFeatBonus ? ` <span class="cc-mod-badge cc-mod-skill" style="font-size:.55rem">${formatMod(skillFeatBonus)} feat</span>` : ''}</span>
                </div>`;
    }).join('')}
        </div>
        <div class="cc-skills-footer">* = Trained only skill</div>
    </div>`;

    body.querySelector('#cc-skills-filter')?.addEventListener('change', e => { s.showAllSkills = e.target.checked; renderSkillsTab(body, panel); });
    body.querySelectorAll('.cc-sk-minus').forEach(b => b.addEventListener('click', () => {
        const name = b.dataset.skill; if ((s.skillRanks[name] || 0) > 0) { s.skillRanks[name] = (s.skillRanks[name] || 0) - 1; renderSkillsTab(body, panel); }
    }));
    body.querySelectorAll('.cc-sk-plus').forEach(b => b.addEventListener('click', () => {
        const name = b.dataset.skill, cls2 = getClass(s.class_), isClass = classSkillList(cls2).includes(name);
        const maxR = isClass ? maxSkillRanks(s.level, true) : maxSkillRanks(s.level, false);
        const cur = s.skillRanks[name] || 0;
        if (cur < maxR && usedSkillPoints() < totalSkillPoints()) { s.skillRanks[name] = cur + 1; renderSkillsTab(body, panel); }
    }));
}

/* ═══════════════════════════════════════════════════════════
   TAB 4: FEATS
   ═══════════════════════════════════════════════════════════ */
function meetsPrereqs(feat) {
    const pre = (feat.prerequisites || '').trim();
    if (!pre || pre === 'None') return true;
    // Check ability prereqs
    const abMatch = pre.match(/(Str|Dex|Con|Int|Wis|Cha)\s+(\d+)/gi);
    if (abMatch) {
        for (const m of abMatch) {
            const [_, ab, val] = m.match(/(Str|Dex|Con|Int|Wis|Cha)\s+(\d+)/i);
            const key = ab.toLowerCase() === 'int' ? 'int_' : ab.toLowerCase();
            if (finalAbility(key) < parseInt(val)) return false;
        }
    }
    // Check BAB prereqs
    const babMatch = pre.match(/BAB\s*\+?(\d+)/i);
    if (babMatch && calcBAB(state.class_, state.level) < parseInt(babMatch[1])) return false;
    // Check feat prereqs (simplified — check if they've selected the required feat)
    const featPrereqs = pre.split(',').map(s => s.trim()).filter(s => !s.match(/^(Str|Dex|Con|Int|Wis|Cha|BAB|None)/i) && s.length > 2);
    for (const fp of featPrereqs) {
        const cleanName = fp.replace(/\s*\d+.*$/, '').trim();
        if (cleanName && !state.selectedFeats.includes(cleanName) && !state.selectedFeats.some(f => f.toLowerCase() === cleanName.toLowerCase())) {
            // Could be a class requirement like "Fighter 4" — skip those for now
            if (!cleanName.match(/^(Fighter|Ranger|Rogue|Cleric|Wizard|Sorcerer|Bard|Druid|Monk|Paladin|Barbarian|Turn|Rebuke)/i)) return false;
        }
    }
    return true;
}

function renderFeatsTab(body, panel) {
    const s = state, race = getRace(s.race), cls = getClass(s.class_);
    const isFighter = s.class_ === 'Fighter';
    const isHuman = race.name === 'Human';
    const numFeats = 1 + Math.floor(s.level / 3) + (isHuman ? 1 : 0) + (isFighter ? 1 + Math.floor(s.level / 2) : 0);
    const remaining = numFeats - s.selectedFeats.length;

    let feats = [...srdFeats];
    if (!s.showAllFeats) feats = feats.filter(f => meetsPrereqs(f));

    body.innerHTML = `
    <div class="cc-feats-layout">
        <div class="cc-feats-header">
            <div class="cc-feats-slots">
                Feat Slots: <strong class="${remaining < 0 ? 'text-danger' : remaining === 0 ? 'text-success' : ''}">${remaining}</strong> / ${numFeats}
                ${isFighter ? '<span class="cc-feats-hint">(Includes Fighter bonus feats)</span>' : ''}
            </div>
            <div class="cc-filter-row">
                <label class="cc-checkbox">
                    <input type="checkbox" id="cc-feats-filter" ${s.showAllFeats ? 'checked' : ''}>
                    Show All Feats
                </label>
                <span class="cc-filter-hint">${s.showAllFeats ? '' : 'Showing qualified feats only'}</span>
            </div>
        </div>
        <div class="cc-feats-selected">
            <h4>Selected Feats (${s.selectedFeats.length})</h4>
            ${s.selectedFeats.length ? `<div class="cc-feat-tags">${s.selectedFeats.map(f => `<span class="cc-feat-tag">${f} <button class="cc-feat-remove" data-feat="${f}">✕</button></span>`).join('')}</div>`
            : '<p class="text-muted" style="font-size:0.8rem">No feats selected yet.</p>'}
        </div>
        <div class="cc-feats-table">
            <div class="cc-feat-header-row">
                <span class="cc-feat-h-name">Feat</span>
                <span class="cc-feat-h-type">Type</span>
                <span class="cc-feat-h-prereq">Prerequisites</span>
                <span class="cc-feat-h-add"></span>
            </div>
            ${feats.map(f => {
                const qualified = meetsPrereqs(f);
                const selected = s.selectedFeats.includes(f.name);
                const fmods = parseFeatModifiers(f);
                const modSummary = fmods.length ? fmods.map(m => formatModBadge(m)).join(' ') : '';
                return `<div class="cc-feat-row ${qualified ? '' : 'cc-feat-unqualified'} ${selected ? 'cc-feat-selected' : ''}">
                    <span class="cc-feat-name">${f.name}${f._isHomebrew ? ' <span class="cc-homebrew-badge">✨</span>' : ''}${modSummary ? `<span class="cc-feat-mods">${modSummary}</span>` : ''}</span>
                    <span class="cc-feat-type">${f.type || 'General'}</span>
                    <span class="cc-feat-prereq">${f.prerequisites || 'None'}</span>
                    <span class="cc-feat-action">
                        ${selected ? '<span class="cc-feat-check">✓</span>'
                        : `<button class="cc-feat-add-btn" data-feat="${f.name}" ${!qualified || remaining <= 0 ? 'disabled' : ''}>+</button>`}
                    </span>
                </div>`;
            }).join('')}
        </div>
    </div>`;

    body.querySelector('#cc-feats-filter')?.addEventListener('change', e => { s.showAllFeats = e.target.checked; renderFeatsTab(body, panel); });
    body.querySelectorAll('.cc-feat-add-btn').forEach(b => b.addEventListener('click', () => {
        if (!s.selectedFeats.includes(b.dataset.feat)) { s.selectedFeats.push(b.dataset.feat); renderFeatsTab(body, panel); }
    }));
    body.querySelectorAll('.cc-feat-remove').forEach(b => b.addEventListener('click', () => {
        s.selectedFeats = s.selectedFeats.filter(f => f !== b.dataset.feat); renderFeatsTab(body, panel);
    }));
}

/* ═══════════════════════════════════════════════════════════
   TAB 5: FEATURES
   ═══════════════════════════════════════════════════════════ */
function renderFeaturesTab(body) {
    const cls = getClass(state.class_), race = getRace(state.race);
    body.innerHTML = `
    <div class="cc-features-layout">
        <div class="cc-features-section">
            <h3>⚔️ ${cls.name} Class Features</h3>
            <p>${cls.class_features || 'No class features described.'}</p>
            <div class="cc-features-info">
                <div class="cc-fi-row"><span>Hit Die:</span> <strong>${cls.hit_die}</strong></div>
                <div class="cc-fi-row"><span>BAB:</span> <strong>${cls.bab_type}</strong></div>
                <div class="cc-fi-row"><span>Good Saves:</span> <strong>${cls.good_saves || 'None'}</strong></div>
                <div class="cc-fi-row"><span>Skill Points:</span> <strong>${cls.skills_per_level} + INT per level</strong></div>
                <div class="cc-fi-row"><span>Class Skills:</span> <strong>${cls.class_skills || '—'}</strong></div>
            </div>
        </div>
        <div class="cc-features-section">
            <h3>🧬 ${race.name} Racial Features</h3>
            <p>${race.traits || 'No racial traits described.'}</p>
            <div class="cc-features-info">
                <div class="cc-fi-row"><span>Size:</span> <strong>${race.size || 'Medium'}</strong></div>
                <div class="cc-fi-row"><span>Speed:</span> <strong>${parseInt(race.speed) || 30} ft</strong></div>
                <div class="cc-fi-row"><span>Ability Mods:</span> <strong>${race.ability_mods || 'None'}</strong></div>
                <div class="cc-fi-row"><span>Languages:</span> <strong>${race.languages || 'Common'}</strong></div>
            </div>
        </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════
   TAB 6: REVIEW
   ═══════════════════════════════════════════════════════════ */
function renderReviewTab(body, panel) {
    const s = state, race = getRace(s.race), cls = getClass(s.class_);
    const mds = raceMods(race), hd = classHd(cls), gs = classGoodSaves(cls);
    const lvl = s.level;
    const finalAb = {}; ABILITIES.forEach(a => { finalAb[a] = finalAbility(a); });
    const conMod = abilityMod(finalAb.con), dexMod = abilityMod(finalAb.dex);
    const hpLvl1 = hd + conMod;
    const hpTotal = Math.max(1, hpLvl1 + (lvl - 1) * Math.max(1, Math.floor(hd / 2 + 1) + conMod)) + featBonus('hp');
    const bab = calcBAB(s.class_, lvl) + featBonus('attack'), ac = 10 + dexMod + ((race.size || 'Medium') === 'Small' ? 1 : 0) + featBonus('ac');
    const fort = calcBaseSave(lvl, gs.includes('fort')) + abilityMod(finalAb.con) + featBonus('save', 'fort');
    const ref = calcBaseSave(lvl, gs.includes('ref')) + abilityMod(finalAb.dex) + featBonus('save', 'ref');
    const will = calcBaseSave(lvl, gs.includes('will')) + abilityMod(finalAb.wis) + featBonus('save', 'will');

    const skillSummary = Object.entries(s.skillRanks).filter(([, v]) => v > 0).map(([name, ranks]) => {
        const sk = srdSkills.find(s => s.name === name);
        const abKey = sk ? (sk.ability.toLowerCase() === 'int' ? 'int_' : sk.ability.toLowerCase()) : 'str';
        const skFeatBonus = featBonus('skill', name);
        return `${name} +${ranks + abilityMod(finalAbility(abKey)) + skFeatBonus}`;
    }).join(', ') || 'None';

    body.innerHTML = `
    <div class="cc-review-layout">
        <div class="cc-review-card">
            <div class="cc-review-header">
                <h2>${s.name || 'Unnamed Character'}</h2>
                <div class="cc-review-subtitle">${s.gender ? s.gender + ' ' : ''}${s.race} ${s.class_} ${lvl} · ${s.alignment}</div>
            </div>
            <div class="cc-stats-row" style="margin:1rem 0">
                <div class="cc-stat-box cc-stat-hp"><div class="cc-stat-label">HP</div><div class="cc-stat-val">${hpTotal}</div></div>
                <div class="cc-stat-box"><div class="cc-stat-label">AC</div><div class="cc-stat-val">${ac}</div></div>
                ${ABILITIES.map(a => `<div class="cc-stat-box"><div class="cc-stat-label">${AB_LABELS[a]}</div><div class="cc-stat-val">${finalAb[a]}</div><div class="cc-stat-detail">${formatMod(abilityMod(finalAb[a]))}</div></div>`).join('')}
            </div>
            <div class="cc-review-stats">
                <span>BAB: <strong>+${bab}</strong></span>
                <span>Init: <strong>${formatMod(dexMod + featBonus('initiative'))}</strong></span>
                <span>Speed: <strong>${(parseInt(race.speed) || 30) + featBonus('speed')} ft</strong></span>
                <span>Fort: <strong>${formatMod(fort)}</strong></span>
                <span>Ref: <strong>${formatMod(ref)}</strong></span>
                <span>Will: <strong>${formatMod(will)}</strong></span>
            </div>
            ${s.selectedFeats.length ? `<div class="cc-review-section"><strong>Feats:</strong> ${s.selectedFeats.join(', ')}</div>` : ''}
            ${skillSummary !== 'None' ? `<div class="cc-review-section"><strong>Skills:</strong> ${skillSummary}</div>` : ''}
            <div class="cc-review-section">
                <label><strong>Equipment & Gear:</strong></label>
                <textarea id="cc-gear" class="form-input" rows="2" placeholder="List gear...">${s.gear}</textarea>
            </div>
            <div class="cc-review-section">
                <label><strong>Languages:</strong></label>
                <input type="text" id="cc-languages" class="form-input" value="${s.languages || (race.languages || 'Common').split(',').map(s => s.trim()).join(', ')}">
            </div>
            <div class="cc-review-section">
                <label><strong>Background / History:</strong></label>
                <textarea id="cc-history" class="form-input" rows="3" placeholder="Brief background...">${s.history}</textarea>
            </div>
            ${!s._editMode ? '<div class="cc-review-town">🏕️ Saving to: <strong>Party Camp</strong></div>' : `
                <div class="cc-review-section">
                    <label><strong>Status:</strong></label>
                    <select id="cc-edit-status" class="form-select" style="max-width:200px">
                        ${['Alive', 'Deceased', 'Missing', 'Imprisoned'].map(o => `<option ${s._editStatus === o ? 'selected' : ''}>${o}</option>`).join('')}
                    </select>
                </div>
                <div class="cc-review-section">
                    <label><strong>Town Role:</strong></label>
                    <input type="text" id="cc-edit-role" class="form-input" value="${s._editRole}" placeholder="e.g. Blacksmith, Guard...">
                </div>
                ${s._editPortraitUrl ? `<div class="cc-review-section"><strong>Portrait:</strong> <img src="${s._editPortraitUrl}" style="width:48px;height:auto;border-radius:4px;vertical-align:middle;margin-left:6px" alt="portrait"></div>` : ''}
            `}
        </div>
        <div class="cc-review-actions">
            ${s._editMode
                ? `<button class="btn-secondary btn-lg" id="cc-cancel-edit-btn">Cancel</button>
                   <button class="btn-primary btn-lg" id="cc-save-edit-btn" ${!s.name ? 'disabled' : ''}>💾 Save Changes</button>`
                : `<button class="btn-primary btn-lg" id="cc-create-btn" ${!s.name ? 'disabled' : ''}>🎲 Create & Add to Party</button>`
            }
        </div>
    </div>`;

    // Save text fields on change
    body.querySelector('#cc-gear')?.addEventListener('input', e => { s.gear = e.target.value.trim(); });
    body.querySelector('#cc-languages')?.addEventListener('input', e => { s.languages = e.target.value.trim(); });
    body.querySelector('#cc-history')?.addEventListener('input', e => { s.history = e.target.value.trim(); });

    // Edit mode: wire save & cancel buttons
    if (s._editMode) {
        body.querySelector('#cc-edit-status')?.addEventListener('change', e => { s._editStatus = e.target.value; });
        body.querySelector('#cc-edit-role')?.addEventListener('input', e => { s._editRole = e.target.value.trim(); });
        body.querySelector('#cc-cancel-edit-btn')?.addEventListener('click', () => {
            if (s._onEditCancel) s._onEditCancel();
        });
        body.querySelector('#cc-save-edit-btn')?.addEventListener('click', async () => {
            const btn = body.querySelector('#cc-save-edit-btn');
            if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving...'; }
            try {
                const data = getCharacterData();
                // Overlay edit-mode fields
                data.id = s._editId;
                data.status = s._editStatus;
                data.role = s._editRole;
                data.portrait_url = s._editPortraitUrl;
                data.xp = s._editXp;
                if (s._editAge != null) data.age = s._editAge;
                await apiSaveCharacter(s._editTownId, data);
                if (s._onEditComplete) s._onEditComplete();
            } catch (err) {
                alert('Save failed: ' + err.message);
                if (btn) { btn.disabled = false; btn.textContent = '💾 Save Changes'; }
            }
        });
    }
}

/* ═══════════════════════════════════════════════════════════
   GET CHARACTER DATA (for saving)
   ═══════════════════════════════════════════════════════════ */
export function getCharacterData() {
    const s = state, race = getRace(s.race), cls = getClass(s.class_);
    const mds = raceMods(race), hd = classHd(cls), gs = classGoodSaves(cls);
    const lvl = s.level;
    const finalAb = {}; ABILITIES.forEach(a => { finalAb[a] = finalAbility(a); });
    const strMod = abilityMod(finalAb.str);
    const conMod = abilityMod(finalAb.con), dexMod = abilityMod(finalAb.dex);
    const hpLvl1 = hd + conMod;
    const hpTotal = Math.max(1, hpLvl1 + (lvl - 1) * Math.max(1, Math.floor(hd / 2 + 1) + conMod)) + featBonus('hp');
    const bab = calcBAB(s.class_, lvl) + featBonus('attack');
    const isSmall = (race.size || 'Medium') === 'Small';
    const sizeMod = isSmall ? 1 : 0;
    const acBase = 10 + dexMod + sizeMod + featBonus('ac');
    const fort = calcBaseSave(lvl, gs.includes('fort')) + abilityMod(finalAb.con) + featBonus('save', 'fort');
    const ref = calcBaseSave(lvl, gs.includes('ref')) + abilityMod(finalAb.dex) + featBonus('save', 'ref');
    const will = calcBaseSave(lvl, gs.includes('will')) + abilityMod(finalAb.wis) + featBonus('save', 'will');

    // Format skills_feats from selected skill ranks
    const skillEntries = Object.entries(s.skillRanks).filter(([, v]) => v > 0).map(([name, ranks]) => {
        const sk = srdSkills.find(x => x.name === name);
        const abKey = sk ? (sk.ability.toLowerCase() === 'int' ? 'int_' : sk.ability.toLowerCase()) : 'str';
        const skFeatBonus = featBonus('skill', name);
        const total = ranks + abilityMod(finalAb[abKey] || 10) + skFeatBonus;
        return `${name} ${formatMod(total)}`;
    });
    const skillsFeatsStr = skillEntries.join(', ') || '';

    // Grapple: BAB + STR mod + size special modifier (Small = -4)
    const grappleMod = bab + strMod + (isSmall ? -4 : 0);

    // Random age based on race
    const raceAges = { Human: [15, 35], Elf: [110, 200], Dwarf: [40, 100], Gnome: [40, 100], Halfling: [20, 50], 'Half-Elf': [20, 60], 'Half-Orc': [14, 30] };
    const [minAge, maxAge] = raceAges[s.race] || [18, 40];
    const age = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;

    // CR
    const npcClasses = ['Commoner', 'Expert', 'Warrior', 'Adept', 'Aristocrat'];
    const cr = npcClasses.includes(s.class_) ? (lvl <= 1 ? '1/2' : String(lvl - 1)) : String(lvl);

    return {
        name: s.name, race: s.race, class: `${s.class_} ${lvl}`, status: 'Alive', gender: s.gender,
        alignment: s.alignment, age: age,
        hp: hpTotal, hd: `${lvl}${cls.hit_die}`,
        ac: `${acBase}, touch ${10 + dexMod + sizeMod}, flat-footed ${acBase - dexMod}`,
        init: `${formatMod(dexMod + featBonus('initiative'))}`, spd: `${(parseInt(race.speed) || 30) + featBonus('speed')} ft`,
        grapple: `${formatMod(grappleMod)}`,
        atk: `Melee: ${formatMod(bab + strMod)} (weapon)`,
        saves: `Fort ${formatMod(fort)}, Ref ${formatMod(ref)}, Will ${formatMod(will)}`,
        str: finalAb.str, dex: finalAb.dex, con: finalAb.con, int_: finalAb.int_, wis: finalAb.wis, cha: finalAb.cha,
        languages: s.languages || (race.languages || 'Common').split(',').map(s => s.trim()).join(', '),
        skills_feats: skillsFeatsStr,
        feats: s.selectedFeats.join(', '), gear: s.gear, history: s.history,
        role: 'Player Character', xp: 0, cr: cr,
    };
}

export function getCreatorState() { return state; }
