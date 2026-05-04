/**
 * Eon Weaver - Character Creator (DM Genie Style)
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

/* -
   CONSTANTS
   - */
const ALIGNMENTS = ['Lawful Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'True Neutral', 'Chaotic Neutral', 'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'];
const ABILITIES = ['str', 'dex', 'con', 'int_', 'wis', 'cha'];
const AB_LABELS = { str: 'STR', dex: 'DEX', con: 'CON', int_: 'INT', wis: 'WIS', cha: 'CHA' };
const POINT_BUY_COST = { 7: -4, 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 6, 15: 8, 16: 10, 17: 13, 18: 16 };
const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const NPC_CLASSES = ['Adept', 'Aristocrat', 'Commoner', 'Expert', 'Warrior'];

/* -
   STATE
   - */
let srdRaces = [], srdClasses = [], srdFeats = [], srdEquipment = [], srdSkills = [];
let state = null;

function defaultState() {
    return {
        tab: 'gender', name: '', gender: '', race: '', class_: '', level: 1,
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

/* -
   MAIN RENDER
   - */
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
    state.tab = 'gender';  // Start on gender tab in edit mode
}

export function resetCreatorState() {
    state = defaultState();
    state.race = srdRaces[0]?.name || 'Human';
    state.class_ = srdClasses.find(c => !isNpcClass(c.name))?.name || srdClasses[0]?.name || 'Fighter';
}

/* -
   3-COLUMN LAYOUT CONSTANTS
   - */
const ALIGNMENT_DESC = {
    'Lawful Good':'Combines commitment to oppose evil with discipline. Crusaders and holy knights embody this alignment.',
    'Neutral Good':'Devoted to helping others without bias for or against order.',
    'Chaotic Good':'Acts as conscience directs with little regard for rules. Kind and benevolent individualist.',
    'Lawful Neutral':'Acts as law, tradition, or personal code directs. Order is paramount.',
    'True Neutral':'Does what seems like a good idea. No strong leanings toward good, evil, law, or chaos.',
    'Chaotic Neutral':'Follows whims. An individualist first and last.',
    'Lawful Evil':'Methodically takes what is wanted within a code of conduct.',
    'Neutral Evil':'Does whatever can be gotten away with. Out for self.',
    'Chaotic Evil':'Does whatever greed, hatred, and lust for destruction drive.'
};
const CASTER_CLASSES = ['Wizard','Sorcerer','Cleric','Druid','Bard','Ranger','Paladin','Adept'];
const SECTIONS = ['gender','race','class','alignment','abilities','skills','feats','spells'];
const SEC_LABELS = {gender:'Gender',race:'Race',class:'Class',alignment:'Alignment',abilities:'Abilities',skills:'Skills',feats:'Feats',spells:'Spells'};

export function renderCreator(panel) {
    if (!state) { state = defaultState(); state.race = srdRaces[0]?.name || 'Human'; state.class_ = srdClasses[0]?.name || 'Fighter'; }
    const s = state, cls = getClass(s.class_), race = getRace(s.race), isEdit = s._editMode;
    const totalSP = totalSkillPoints(), usedSP = usedSkillPoints();
    const isHuman = race.name === 'Human', isFighter = s.class_ === 'Fighter';
    const numFeats = 1 + Math.floor(s.level / 3) + (isHuman ? 1 : 0) + (isFighter ? 1 + Math.floor(s.level / 2) : 0);
    const isCaster = CASTER_CLASSES.includes(s.class_);

    panel.innerHTML = `
    <div class="cc-root">
        <div class="cc-title-bar">${isEdit ? 'Character Editor' : 'Character Generation'}</div>
        <div class="cc-summary-bar">
            <div class="cc-sum-item"><span class="cc-sum-lbl">Name</span><span class="cc-sum-val">${s.name||'-'}</span></div>
            <div class="cc-sum-item"><span class="cc-sum-lbl">Gender</span><span class="cc-sum-val">${s.gender||'-'}</span></div>
            <div class="cc-sum-item"><span class="cc-sum-lbl">Race</span><span class="cc-sum-val">${s.race}</span></div>
            <div class="cc-sum-item"><span class="cc-sum-lbl">Class</span><span class="cc-sum-val">${s.class_||'-'}</span></div>
            <div class="cc-sum-item"><span class="cc-sum-lbl">Align</span><span class="cc-sum-val">${s.alignment}</span></div>
            <div class="cc-sum-item"><span class="cc-sum-lbl">Abilities</span><span class="cc-sum-val">${s.abilityMethod==='pointbuy'?'Point Buy':s.abilityMethod==='standard'?'Array':'Manual'}</span></div>
            <div class="cc-sum-item"><span class="cc-sum-lbl">Skills</span><span class="cc-sum-val">${usedSP}/${totalSP}</span></div>
            <div class="cc-sum-item ${s.selectedFeats.length<numFeats?'':'cc-sum-done'}"><span class="cc-sum-lbl">Feats</span><span class="cc-sum-val">${s.selectedFeats.length}/${numFeats}</span></div>
            <div class="cc-sum-item"><span class="cc-sum-lbl">Spells</span><span class="cc-sum-val">${isCaster?'Yes':'-'}</span></div>
        </div>
        <div class="cc-three-col">
            <div class="cc-nav-col">
                ${SECTIONS.map(sec=>`<button class="cc-nav-btn ${s.tab===sec?'active':''}" data-section="${sec}">${SEC_LABELS[sec]}</button>`).join('')}
                <div class="cc-nav-spacer"></div>
                <button class="cc-nav-btn cc-nav-cancel" id="cc-cancel-btn">Cancel</button>
                <button class="cc-nav-btn cc-nav-play" id="cc-create-btn" ${!s.name?'disabled':''}>${isEdit?'Save':'Play'}</button>
            </div>
            <div class="cc-select-col" id="cc-select-col"></div>
            <div class="cc-detail-col" id="cc-detail-col"></div>
        </div>
    </div>`;
    renderSection(panel);
    panel.querySelectorAll('.cc-nav-btn[data-section]').forEach(btn=>
        btn.addEventListener('click',()=>{state.tab=btn.dataset.section;rerender(panel);})
    );
    panel.querySelector('#cc-cancel-btn')?.addEventListener('click',()=>{
        if(s._editMode&&s._onEditCancel) s._onEditCancel();
    });
    // cc-create-btn handler is in parent (TownView/PartyView) via event delegation
    if(s._editMode){
        panel.querySelector('#cc-create-btn')?.addEventListener('click',async()=>{
            const btn=panel.querySelector('#cc-create-btn');
            if(btn){btn.disabled=true;btn.textContent='-';}
            try{
                const data=getCharacterData();
                data.id=s._editId; data.status=s._editStatus; data.role=s._editRole;
                data.portrait_url=s._editPortraitUrl; data.xp=s._editXp;
                if(s._editAge!=null) data.age=s._editAge;
                await apiSaveCharacter(s._editTownId,data);
                if(s._onEditComplete) s._onEditComplete();
            }catch(err){
                alert('Save failed: '+err.message);
                if(btn){btn.disabled=false;btn.textContent='Save';}
            }
        });
    }
}

function rerender(panel) { renderCreator(panel); }

function renderSection(panel) {
    const sel=panel.querySelector('#cc-select-col'), det=panel.querySelector('#cc-detail-col');
    if(!sel||!det) return;
    switch(state.tab){
        case 'gender': renderGenderSec(sel,det,panel); break;
        case 'race': renderRaceSec(sel,det,panel); break;
        case 'class': renderClassSec(sel,det,panel); break;
        case 'alignment': renderAlignSec(sel,det,panel); break;
        case 'abilities': renderAbilitiesSec(sel,det,panel); break;
        case 'skills': renderSkillsSec(sel,det,panel); break;
        case 'feats': renderFeatsSec(sel,det,panel); break;
        case 'spells': renderSpellsSec(sel,det,panel); break;
    }
}

/* -
   SECTION: GENDER
   - */
function renderGenderSec(sel,det,panel){
    const s=state;
    sel.innerHTML=`<h3 class="cc-sec-title">Select the Gender of your Character</h3>
        <div class="cc-sel-list">
            <button class="cc-sel-item ${s.gender==='Male'?'selected':''}" data-val="Male">Male</button>
            <button class="cc-sel-item ${s.gender==='Female'?'selected':''}" data-val="Female">Female</button>
        </div>`;
    det.innerHTML=`<h3 class="cc-det-title">${s.gender||'-'} Gender Selection</h3>
        <div class="cc-det-body">
            <p>Gender is primarily aesthetic in D&D 3.5 and does not change class abilities or mechanical options.</p>
            <div class="cc-det-field"><label>Character Name</label><input type="text" id="cc-name" class="cc-det-input" value="${s.name}" placeholder="Enter name..."></div>
        </div>`;
    sel.querySelectorAll('.cc-sel-item').forEach(b=>b.addEventListener('click',()=>{s.gender=b.dataset.val;rerender(panel);}));
    det.querySelector('#cc-name')?.addEventListener('input',e=>{s.name=e.target.value.trim();
        panel.querySelector('.cc-sum-val').textContent=s.name||'-';
        const pb=panel.querySelector('#cc-create-btn');if(pb)pb.disabled=!s.name;
    });
}

/* -
   SECTION: RACE
   - */
function renderRaceSec(sel,det,panel){
    const s=state, race=getRace(s.race), mods=raceMods(race);
    sel.innerHTML=`<h3 class="cc-sec-title">Select Race</h3>
        <div class="cc-sel-list">${srdRaces.map(r=>`<button class="cc-sel-item ${s.race===r.name?'selected':''}" data-val="${r.name}">${r.name}${r._isHomebrew?' &#10024;':''}</button>`).join('')}</div>`;
    det.innerHTML=`<h3 class="cc-det-title">${race.name} Racial Traits</h3>
        <div class="cc-det-body">
            <div class="cc-det-row"><span>Size:</span><strong>${race.size||'Medium'}</strong></div>
            <div class="cc-det-row"><span>Speed:</span><strong>${parseInt(race.speed)||30} ft</strong></div>
            <div class="cc-det-row"><span>Ability Mods:</span><strong>${Object.entries(mods).length?Object.entries(mods).map(([k,v])=>`${formatMod(v)} ${AB_LABELS[k]}`).join(', '):'None'}</strong></div>
            <div class="cc-det-row"><span>Languages:</span><strong>${(race.languages||'Common').split(',').map(l=>l.trim()).join(', ')}</strong></div>
            ${race.traits?`<div class="cc-det-desc"><h4>Special Traits</h4><p>${race.traits}</p></div>`:''}
            <div class="cc-det-field"><label>Languages</label><input type="text" id="cc-languages" class="cc-det-input" value="${s.languages||(race.languages||'Common').split(',').map(l=>l.trim()).join(', ')}"></div>
        </div>`;
    sel.querySelectorAll('.cc-sel-item').forEach(b=>b.addEventListener('click',()=>{s.race=b.dataset.val;rerender(panel);}));
    det.querySelector('#cc-languages')?.addEventListener('input',e=>{s.languages=e.target.value.trim();});
}

/* -
   SECTION: CLASS
   - */
function renderClassSec(sel,det,panel){
    const s=state, cls=getClass(s.class_);
    let filtered=srdClasses.filter(c=>{
        if(isNpcClass(c.name)&&!s.showNpcClasses) return false;
        if(!isNpcClass(c.name)&&!s.showPcClasses) return false;
        return true;
    });
    sel.innerHTML=`<h3 class="cc-sec-title">Select Class</h3>
        <div class="cc-filter-row">
            <label class="cc-checkbox"><input type="checkbox" id="cc-filter-pc" ${s.showPcClasses?'checked':''}> PC</label>
            <label class="cc-checkbox"><input type="checkbox" id="cc-filter-npc" ${s.showNpcClasses?'checked':''}> NPC</label>
        </div>
        <div class="cc-sel-list">${filtered.map(c=>`<button class="cc-sel-item ${s.class_===c.name?'selected':''}" data-val="${c.name}"><span>${c.name}${c._isHomebrew?' &#10024;':''}</span><span class="cc-sel-sub">${c.hit_die}</span></button>`).join('')}</div>`;
    det.innerHTML=`<h3 class="cc-det-title">${cls.name}</h3>
        <div class="cc-det-body">
            <div class="cc-det-row"><span>Hit Die:</span><strong>${cls.hit_die}</strong></div>
            <div class="cc-det-row"><span>BAB Type:</span><strong>${cls.bab_type||'-'}</strong></div>
            <div class="cc-det-row"><span>Good Saves:</span><strong>${cls.good_saves||'None'}</strong></div>
            <div class="cc-det-row"><span>Skills/Level:</span><strong>${cls.skills_per_level||2} + INT mod</strong></div>
            <div class="cc-det-field"><label>Level</label><input type="number" id="cc-level" class="cc-det-input" value="${s.level}" min="1" max="20" style="width:80px"></div>
            <div class="cc-det-field"><label>Gender</label>
                <select id="cc-gender" class="cc-det-input"><option value="" ${!s.gender?'selected':''}>Any</option><option value="Male" ${s.gender==='Male'?'selected':''}>Male</option><option value="Female" ${s.gender==='Female'?'selected':''}>Female</option></select>
            </div>
            ${cls.class_features?`<div class="cc-det-desc"><h4>Class Features</h4><p>${cls.class_features}</p></div>`:''}
        </div>`;
    sel.querySelectorAll('.cc-sel-item').forEach(b=>b.addEventListener('click',()=>{s.class_=b.dataset.val;rerender(panel);}));
    sel.querySelector('#cc-filter-pc')?.addEventListener('change',e=>{s.showPcClasses=e.target.checked;renderClassSec(sel,det,panel);});
    sel.querySelector('#cc-filter-npc')?.addEventListener('change',e=>{s.showNpcClasses=e.target.checked;renderClassSec(sel,det,panel);});
    det.querySelector('#cc-level')?.addEventListener('input',e=>{s.level=Math.max(1,Math.min(20,parseInt(e.target.value)||1));});
    det.querySelector('#cc-gender')?.addEventListener('change',e=>{s.gender=e.target.value;});
}

/* -
   SECTION: ALIGNMENT
   - */
function renderAlignSec(sel,det,panel){
    const s=state;
    sel.innerHTML=`<h3 class="cc-sec-title">Select Alignment</h3>
        <div class="cc-sel-list">${ALIGNMENTS.map(a=>`<button class="cc-sel-item ${s.alignment===a?'selected':''}" data-val="${a}">${a}</button>`).join('')}</div>`;
    det.innerHTML=`<h3 class="cc-det-title">${s.alignment}</h3>
        <div class="cc-det-body"><p>${ALIGNMENT_DESC[s.alignment]||''}</p></div>`;
    sel.querySelectorAll('.cc-sel-item').forEach(b=>b.addEventListener('click',()=>{s.alignment=b.dataset.val;rerender(panel);}));
}

/* -
   SECTION: ABILITIES
   - */
function renderAbilitiesSec(sel,det,panel){
    const s=state, race=getRace(s.race), cls=getClass(s.class_);
    const mods=raceMods(race), hd=classHd(cls), gs=classGoodSaves(cls), lvl=s.level;
    const totalPts=25; let spent=0;
    ABILITIES.forEach(a=>{spent+=(POINT_BUY_COST[s.abilities[a]]||0);});
    const remaining=totalPts-spent;

    sel.innerHTML=`<h3 class="cc-sec-title">Ability Scores</h3>
        <div class="cc-method-toggle">
            <button class="cc-method-btn ${s.abilityMethod==='pointbuy'?'active':''}" data-method="pointbuy">Point Buy (25)</button>
            <button class="cc-method-btn ${s.abilityMethod==='standard'?'active':''}" data-method="standard">Standard Array</button>
            <button class="cc-method-btn ${s.abilityMethod==='manual'?'active':''}" data-method="manual">Manual</button>
        </div>
        ${s.abilityMethod==='pointbuy'?`<div class="cc-points-bar">Points: <strong class="${remaining<0?'text-danger':remaining===0?'text-success':''}">${remaining}</strong> / ${totalPts}</div>`:''}
        <div class="cc-ability-grid">
            ${ABILITIES.map(a=>{
                const base=s.abilities[a],rm=mods[a]||0;
                const modKey=a==='int_'?'int':a;
                const fb=featBonus('ability',modKey);
                const fin=base+rm+fb,mod=abilityMod(fin),cost=POINT_BUY_COST[base]||0;
                return`<div class="cc-ability-card">
                    <div class="cc-ab-label">${AB_LABELS[a]}</div>
                    <div class="cc-ab-controls">
                        ${s.abilityMethod!=='manual'?`<button class="cc-ab-btn cc-ab-minus" data-ab="${a}" ${base<=7?'disabled':''}>-</button>`:''}
                        <input type="number" class="cc-ab-input" data-ab="${a}" value="${base}" min="3" max="18" ${s.abilityMethod==='pointbuy'?'readonly':''}>
                        ${s.abilityMethod!=='manual'?`<button class="cc-ab-btn cc-ab-plus" data-ab="${a}" ${base>=18?'disabled':''}>+</button>`:''}
                    </div>
                    ${rm||fb?`<div class="cc-ab-race">${rm?formatMod(rm)+' racial':''}${rm&&fb?', ':''}${fb?formatMod(fb)+' feat':''}</div>`:'<div class="cc-ab-race">&nbsp;</div>'}
                    <div class="cc-ab-final"><span class="cc-ab-total">${fin}</span><span class="cc-ab-mod">${formatMod(mod)}</span></div>
                    ${s.abilityMethod==='pointbuy'?`<div class="cc-ab-cost">Cost: ${cost}</div>`:''}
                </div>`;
            }).join('')}
        </div>`;

    // Right panel: computed stats
    const conF=finalAbility('con'),dexF=finalAbility('dex');
    const conMod=abilityMod(conF),dexMod=abilityMod(dexF);
    const hpL1=hd+conMod;
    const hpT=Math.max(1,hpL1+(lvl-1)*Math.max(1,Math.floor(hd/2+1)+conMod))+featBonus('hp');
    const bab=calcBAB(s.class_,lvl)+featBonus('attack');
    const ac=10+dexMod+((race.size||'Medium')==='Small'?1:0)+featBonus('ac');
    const fort=calcBaseSave(lvl,gs.includes('fort'))+abilityMod(finalAbility('con'))+featBonus('save','fort');
    const ref=calcBaseSave(lvl,gs.includes('ref'))+abilityMod(finalAbility('dex'))+featBonus('save','ref');
    const will=calcBaseSave(lvl,gs.includes('will'))+abilityMod(finalAbility('wis'))+featBonus('save','will');
    const initB=dexMod+featBonus('initiative');

    det.innerHTML=`<h3 class="cc-det-title">Computed Statistics</h3>
        <div class="cc-det-body">
            <div class="cc-stats-row">
                <div class="cc-stat-box cc-stat-hp"><div class="cc-stat-label">HP</div><div class="cc-stat-val">${hpT}</div><div class="cc-stat-detail">${cls.hit_die}+${formatMod(conMod)}/lvl</div></div>
                <div class="cc-stat-box"><div class="cc-stat-label">AC</div><div class="cc-stat-val">${ac}</div></div>
                <div class="cc-stat-box"><div class="cc-stat-label">BAB</div><div class="cc-stat-val">+${bab}</div></div>
                <div class="cc-stat-box"><div class="cc-stat-label">Fort</div><div class="cc-stat-val">${formatMod(fort)}</div></div>
                <div class="cc-stat-box"><div class="cc-stat-label">Ref</div><div class="cc-stat-val">${formatMod(ref)}</div></div>
                <div class="cc-stat-box"><div class="cc-stat-label">Will</div><div class="cc-stat-val">${formatMod(will)}</div></div>
                <div class="cc-stat-box"><div class="cc-stat-label">Init</div><div class="cc-stat-val">${formatMod(initB)}</div></div>
            </div>
        </div>`;

    // Events
    sel.querySelectorAll('.cc-method-btn').forEach(btn=>btn.addEventListener('click',()=>{
        s.abilityMethod=btn.dataset.method;
        if(btn.dataset.method==='standard') ABILITIES.forEach((a,i)=>{s.abilities[a]=STANDARD_ARRAY[i];});
        renderAbilitiesSec(sel,det,panel);
    }));
    sel.querySelectorAll('.cc-ab-minus').forEach(b=>b.addEventListener('click',()=>{const a=b.dataset.ab;if(s.abilities[a]>7){s.abilities[a]--;renderAbilitiesSec(sel,det,panel);}}));
    sel.querySelectorAll('.cc-ab-plus').forEach(b=>b.addEventListener('click',()=>{const a=b.dataset.ab;if(s.abilities[a]<18){s.abilities[a]++;renderAbilitiesSec(sel,det,panel);}}));
    if(s.abilityMethod==='manual') sel.querySelectorAll('.cc-ab-input').forEach(inp=>inp.addEventListener('change',()=>{s.abilities[inp.dataset.ab]=Math.max(3,Math.min(18,parseInt(inp.value)||10));renderAbilitiesSec(sel,det,panel);}));
}

/* -
   SECTION: SKILLS
   - */
function renderSkillsSec(sel,det,panel){
    const s=state, cls=getClass(s.class_), clsSkills=classSkillList(cls);
    const total=totalSkillPoints(),used=usedSkillPoints(),rem=total-used;
    const maxC=maxSkillRanks(s.level,true),maxX=maxSkillRanks(s.level,false);
    let skills=[...srdSkills];
    if(!s.showAllSkills) skills=skills.filter(sk=>clsSkills.includes(sk.name));

    sel.innerHTML=`<h3 class="cc-sec-title">Allocate Skills</h3>
        <div class="cc-skills-header">
            <div class="cc-skills-points">Points: <strong class="${rem<0?'text-danger':rem===0?'text-success':''}">${rem}</strong> / ${total}
                <span class="cc-skills-hint">(Max: ${maxC} class, ${maxX} cross)</span></div>
            <label class="cc-checkbox"><input type="checkbox" id="cc-skills-filter" ${s.showAllSkills?'checked':''}> All Skills</label>
        </div>
        <div class="cc-skills-table">
            <div class="cc-skill-header-row"><span class="cc-skill-h-name">Skill</span><span class="cc-skill-h-ab">Abl</span><span class="cc-skill-h-class">Cls</span><span class="cc-skill-h-ranks">Ranks</span><span class="cc-skill-h-mod">Tot</span></div>
            ${skills.map(sk=>{
                const isC=clsSkills.includes(sk.name),ranks=s.skillRanks[sk.name]||0,maxR=isC?maxC:maxX;
                const abKey=sk.ability.toLowerCase()==='int'?'int_':sk.ability.toLowerCase();
                const abMod=abilityMod(finalAbility(abKey)),sfb=featBonus('skill',sk.name),tot=ranks+abMod+sfb;
                return`<div class="cc-skill-row ${isC?'cc-skill-class':'cc-skill-cross'} ${ranks>0?'cc-skill-active':''}">
                    <span class="cc-skill-name">${sk.name}${sk.trained_only?' *':''}</span>
                    <span class="cc-skill-ab">${sk.ability}</span>
                    <span class="cc-skill-isclass">${isC?'&#10003;':''}</span>
                    <span class="cc-skill-ranks"><button class="cc-sk-btn cc-sk-minus" data-skill="${sk.name}" ${ranks<=0?'disabled':''}>-</button><span class="cc-sk-val">${ranks}</span><button class="cc-sk-btn cc-sk-plus" data-skill="${sk.name}" ${ranks>=maxR||rem<=0?'disabled':''}>+</button></span>
                    <span class="cc-skill-total">${formatMod(tot)}</span>
                </div>`;
            }).join('')}
        </div>`;

    det.innerHTML=`<h3 class="cc-det-title">Skill Information</h3>
        <div class="cc-det-body">
            <p>Class skills cost 1 point per rank (max ${maxC}). Cross-class skills cost 2 points per rank (max ${maxX}).</p>
            <p>* = Trained only skill (requires at least 1 rank to use)</p>
            <div class="cc-det-row"><span>Class:</span><strong>${s.class_}</strong></div>
            <div class="cc-det-row"><span>INT modifier:</span><strong>${formatMod(abilityMod(finalAbility('int_')))}</strong></div>
            <div class="cc-det-row"><span>Points per level:</span><strong>${(parseInt(cls.skills_per_level)||2)} + INT</strong></div>
        </div>`;

    sel.querySelector('#cc-skills-filter')?.addEventListener('change',e=>{s.showAllSkills=e.target.checked;renderSkillsSec(sel,det,panel);});
    sel.querySelectorAll('.cc-sk-minus').forEach(b=>b.addEventListener('click',()=>{
        const n=b.dataset.skill;if((s.skillRanks[n]||0)>0){s.skillRanks[n]=(s.skillRanks[n]||0)-1;renderSkillsSec(sel,det,panel);}
    }));
    sel.querySelectorAll('.cc-sk-plus').forEach(b=>b.addEventListener('click',()=>{
        const n=b.dataset.skill,isC=classSkillList(getClass(s.class_)).includes(n);
        const maxR=isC?maxSkillRanks(s.level,true):maxSkillRanks(s.level,false),cur=s.skillRanks[n]||0;
        if(cur<maxR&&usedSkillPoints()<totalSkillPoints()){s.skillRanks[n]=cur+1;renderSkillsSec(sel,det,panel);}
    }));
}

/* -
   FEAT PREREQUISITES CHECK
   - */
function meetsPrereqs(feat) {
    const pre = (feat.prerequisites || '').trim();
    if (!pre || pre === 'None') return true;
    const abMatch = pre.match(/(Str|Dex|Con|Int|Wis|Cha)\s+(\d+)/gi);
    if (abMatch) {
        for (const m of abMatch) {
            const [_, ab, val] = m.match(/(Str|Dex|Con|Int|Wis|Cha)\s+(\d+)/i);
            const key = ab.toLowerCase() === 'int' ? 'int_' : ab.toLowerCase();
            if (finalAbility(key) < parseInt(val)) return false;
        }
    }
    const babMatch = pre.match(/BAB\s*\+?(\d+)/i);
    if (babMatch && calcBAB(state.class_, state.level) < parseInt(babMatch[1])) return false;
    const featPrereqs = pre.split(',').map(s => s.trim()).filter(s => !s.match(/^(Str|Dex|Con|Int|Wis|Cha|BAB|None)/i) && s.length > 2);
    for (const fp of featPrereqs) {
        const cleanName = fp.replace(/\s*\d+.*$/, '').trim();
        if (cleanName && !state.selectedFeats.includes(cleanName) && !state.selectedFeats.some(f => f.toLowerCase() === cleanName.toLowerCase())) {
            if (!cleanName.match(/^(Fighter|Ranger|Rogue|Cleric|Wizard|Sorcerer|Bard|Druid|Monk|Paladin|Barbarian|Turn|Rebuke)/i)) return false;
        }
    }
    return true;
}

/* - 
   SECTION: FEATS
   -  */
function renderFeatsSec(sel,det,panel){
    const s=state, race=getRace(s.race);
    const isFighter=s.class_==='Fighter',isHuman=race.name==='Human';
    const numFeats=1+Math.floor(s.level/3)+(isHuman?1:0)+(isFighter?1+Math.floor(s.level/2):0);
    const rem=numFeats-s.selectedFeats.length;
    let feats=[...srdFeats];
    if(!s.showAllFeats) feats=feats.filter(f=>meetsPrereqs(f));

    sel.innerHTML=`<h3 class="cc-sec-title">Select Feats</h3>
        <div class="cc-feats-header">
            <div class="cc-feats-slots">Slots: <strong class="${rem<0?'text-danger':rem===0?'text-success':''}">${rem}</strong> / ${numFeats}</div>
            <label class="cc-checkbox"><input type="checkbox" id="cc-feats-filter" ${s.showAllFeats?'checked':''}> Show All</label>
        </div>
        ${s.selectedFeats.length?`<div class="cc-feat-tags">${s.selectedFeats.map(f=>`<span class="cc-feat-tag">${f} <button class="cc-feat-remove" data-feat="${f}">x</button></span>`).join('')}</div>`:''}
        <div class="cc-feats-table">
            <div class="cc-feat-header-row"><span class="cc-feat-h-name">Feat</span><span class="cc-feat-h-type">Type</span><span class="cc-feat-h-add"></span></div>
            ${feats.map(f=>{
                const q=meetsPrereqs(f),sel2=s.selectedFeats.includes(f.name);
                return`<div class="cc-feat-row ${q?'':'cc-feat-unqualified'} ${sel2?'cc-feat-selected':''}" data-feat="${f.name}">
                    <span class="cc-feat-name">${f.name}${f._isHomebrew?' &#10024;':''}</span>
                    <span class="cc-feat-type">${f.type||'General'}</span>
                    <span class="cc-feat-action">${sel2?'<span class="cc-feat-check">&#10003;</span>':`<button class="cc-feat-add-btn" data-feat="${f.name}" ${!q||rem<=0?'disabled':''}>+</button>`}</span>
                </div>`;
            }).join('')}
        </div>`;

    // Right panel: show details of highlighted feat
    const highlighted=s._highlightedFeat?srdFeats.find(f=>f.name===s._highlightedFeat):null;
    det.innerHTML=`<h3 class="cc-det-title">${highlighted?highlighted.name:'Feat Details'}</h3>
        <div class="cc-det-body">
            ${highlighted?`
                <div class="cc-det-row"><span>Type:</span><strong>${highlighted.type||'General'}</strong></div>
                <div class="cc-det-row"><span>Prerequisites:</span><strong>${highlighted.prerequisites||'None'}</strong></div>
                ${highlighted.benefit?`<div class="cc-det-desc"><h4>Benefit</h4><p>${highlighted.benefit}</p></div>`:''}
                ${highlighted.description?`<div class="cc-det-desc"><h4>Description</h4><p>${highlighted.description}</p></div>`:''}
            `:'<p>Click a feat in the list to see its details.</p>'}
        </div>`;

    sel.querySelector('#cc-feats-filter')?.addEventListener('change',e=>{s.showAllFeats=e.target.checked;renderFeatsSec(sel,det,panel);});
    sel.querySelectorAll('.cc-feat-add-btn').forEach(b=>b.addEventListener('click',e=>{
        e.stopPropagation();
        if(!s.selectedFeats.includes(b.dataset.feat)){s.selectedFeats.push(b.dataset.feat);renderFeatsSec(sel,det,panel);}
    }));
    sel.querySelectorAll('.cc-feat-remove').forEach(b=>b.addEventListener('click',()=>{
        s.selectedFeats=s.selectedFeats.filter(f=>f!==b.dataset.feat);renderFeatsSec(sel,det,panel);
    }));
    sel.querySelectorAll('.cc-feat-row').forEach(row=>row.addEventListener('click',()=>{
        s._highlightedFeat=row.dataset.feat;
        const hl=srdFeats.find(f=>f.name===row.dataset.feat);
        if(hl){
            det.innerHTML=`<h3 class="cc-det-title">${hl.name}</h3><div class="cc-det-body">
                <div class="cc-det-row"><span>Type:</span><strong>${hl.type||'General'}</strong></div>
                <div class="cc-det-row"><span>Prerequisites:</span><strong>${hl.prerequisites||'None'}</strong></div>
                ${hl.benefit?`<div class="cc-det-desc"><h4>Benefit</h4><p>${hl.benefit}</p></div>`:''}
                ${hl.description?`<div class="cc-det-desc"><h4>Description</h4><p>${hl.description}</p></div>`:''}
            </div>`;
        }
    }));
}

/* -
   SECTION: SPELLS
   - */
function renderSpellsSec(sel,det,panel){
    const s=state, cls=getClass(s.class_), isCaster=CASTER_CLASSES.includes(s.class_);
    if(!isCaster){
        sel.innerHTML=`<h3 class="cc-sec-title">Spells</h3>
            <div class="cc-sel-empty"><p>${s.class_} does not cast spells.</p></div>`;
        det.innerHTML=`<h3 class="cc-det-title">No Spellcasting</h3>
            <div class="cc-det-body">
                <p>The ${s.class_} class does not have spellcasting abilities. You can skip this section.</p>
                <div class="cc-det-field"><label>Equipment & Gear</label><textarea id="cc-gear" class="cc-det-input" rows="3" placeholder="List gear...">${s.gear}</textarea></div>
                <div class="cc-det-field"><label>Background / History</label><textarea id="cc-history" class="cc-det-input" rows="3" placeholder="Brief background...">${s.history}</textarea></div>
            </div>`;
    } else {
        const casterInfo = {Wizard:'prepares arcane spells from a spellbook',Sorcerer:'casts arcane spells spontaneously',Cleric:'prepares divine spells through prayer',Druid:'prepares divine nature spells',Bard:'casts arcane spells spontaneously',Ranger:'prepares divine spells at level 4+',Paladin:'prepares divine spells at level 4+',Adept:'prepares divine spells'};
        sel.innerHTML=`<h3 class="cc-sec-title">${s.class_} Spells</h3>
            <div class="cc-sel-list">
                <div class="cc-sel-info"><p>A ${s.class_} ${casterInfo[s.class_]||'casts spells'}.</p>
                <p>Spell selection and preparation can be fully managed on the character sheet after creation.</p></div>
            </div>`;
        det.innerHTML=`<h3 class="cc-det-title">Spellcasting Details</h3>
            <div class="cc-det-body">
                <div class="cc-det-row"><span>Caster Type:</span><strong>${['Wizard','Sorcerer','Bard'].includes(s.class_)?'Arcane':'Divine'}</strong></div>
                <div class="cc-det-row"><span>Preparation:</span><strong>${['Sorcerer','Bard'].includes(s.class_)?'Spontaneous':'Prepared'}</strong></div>
                <div class="cc-det-field"><label>Equipment & Gear</label><textarea id="cc-gear" class="cc-det-input" rows="3" placeholder="List gear...">${s.gear}</textarea></div>
                <div class="cc-det-field"><label>Background / History</label><textarea id="cc-history" class="cc-det-input" rows="3" placeholder="Brief background...">${s.history}</textarea></div>
            </div>`;
    }
    det.querySelector('#cc-gear')?.addEventListener('input',e=>{s.gear=e.target.value.trim();});
    det.querySelector('#cc-history')?.addEventListener('input',e=>{s.history=e.target.value.trim();});
}


/* -
   GET CHARACTER DATA (for saving)
   - */
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
