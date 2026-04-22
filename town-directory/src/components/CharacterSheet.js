/**
 * CharacterSheet.js — Tabbed D&D Character Sheet
 * 4 tabs matching the classic D&D 3.5e character sheet layout.
 * Tab 1: Core Stats  |  Tab 2: Inventory & Feats  |  Tab 3: Spells  |  Tab 4: Background
 */
import { getState, setState } from '../stores/appState.js';
import { apiSaveCharacter, apiDeleteCharacter, apiGetCharacters, apiLevelUpCharacter, normalizeCharacter } from '../api/characters.js';
import { parseClass, calcBAB, abilityMod, parseGearWeapons } from '../engine/rulesAdapter.js';
import { calcAttackBonuses } from '../engine/rules35e.js'; // 3.5e-specific iterative attacks

/* ── Helpers ────────────────────────────────────────────── */
const fmtMod = (m) => m >= 0 ? `+${m}` : `${m}`;

function parseSaves(s) {
  const r = { fort: '', ref: '', will: '' };
  if (!s) return r;
  const fm = s.match(/Fort\s*([+-]?\d+)/i); if (fm) r.fort = fmtMod(parseInt(fm[1]));
  const rm = s.match(/Ref\s*([+-]?\d+)/i); if (rm) r.ref = fmtMod(parseInt(rm[1]));
  const wm = s.match(/Will\s*([+-]?\d+)/i); if (wm) r.will = fmtMod(parseInt(wm[1]));
  return r;
}

function parseACValues(ac) {
  const r = { total: '', touch: '', flat: '', armor: '', shield: '', dex: '', natural: '', misc: '' };
  if (!ac) return r;
  const t = String(ac).match(/^(\d+)/); if (t) r.total = t[1];
  const tc = String(ac).match(/touch\s*:?\s*(\d+)/i); if (tc) r.touch = tc[1];
  const ff = String(ac).match(/flat[- ]?footed\s*:?\s*(\d+)/i); if (ff) r.flat = ff[1];
  // Try to extract breakdown components
  const arm = String(ac).match(/armor\s*[+:]?\s*(\d+)/i); if (arm) r.armor = arm[1];
  const sh = String(ac).match(/shield\s*[+:]?\s*(\d+)/i); if (sh) r.shield = sh[1];
  const dx = String(ac).match(/dex\s*[+:]?\s*([+-]?\d+)/i); if (dx) r.dex = dx[1];
  const nat = String(ac).match(/natural\s*[+:]?\s*(\d+)/i); if (nat) r.natural = nat[1];
  return r;
}

function parseAttacks(atkStr) {
  if (!atkStr || !atkStr.trim()) return [];
  const attacks = [];
  for (const part of atkStr.split(/[;]|\sor\s/i)) {
    const p = part.trim(); if (!p) continue;
    let type = 'Melee';
    if (/ranged|bow|crossbow|sling|thrown|javelin/i.test(p)) type = 'Ranged';
    if (/touch/i.test(p)) type = 'Touch';
    const bm = p.match(/([+-]\d+)/); const bonus = bm ? bm[1] : '+0';
    const dm = p.match(/(\d+d\d+(?:[+-]\d+)?)/i); const damage = dm ? dm[1] : '';
    const cm = p.match(/((?:\d+-\d+\/)?x\d+)/i); const crit = cm ? cm[1] : '20/x2';
    let name = p.replace(/^(melee|ranged):\s*/i, '').replace(/[+-]\d+/g, '').replace(/\(\s*\d+d\d+.*?\)/g, '').replace(/\d+d\d+[+-]?\d*/gi, '').replace(/(?:\d+-\d+\/)?x\d+/g, '').replace(/[()]/g, '').trim() || 'Attack';
    attacks.push({ name, bonus, damage, type, crit });
  }
  return attacks;
}

const DND35_SKILLS = [
  { name: 'Appraise', ability: 'INT' }, { name: 'Balance', ability: 'DEX' },
  { name: 'Bluff', ability: 'CHA' }, { name: 'Climb', ability: 'STR' },
  { name: 'Concentration', ability: 'CON' }, { name: 'Craft', ability: 'INT' },
  { name: 'Decipher Script', ability: 'INT' }, { name: 'Diplomacy', ability: 'CHA' },
  { name: 'Disable Device', ability: 'INT' }, { name: 'Disguise', ability: 'CHA' },
  { name: 'Escape Artist', ability: 'DEX' }, { name: 'Forgery', ability: 'INT' },
  { name: 'Gather Information', ability: 'CHA' }, { name: 'Handle Animal', ability: 'CHA' },
  { name: 'Heal', ability: 'WIS' }, { name: 'Hide', ability: 'DEX' },
  { name: 'Intimidate', ability: 'CHA' }, { name: 'Jump', ability: 'STR' },
  { name: 'Knowledge (Arcana)', ability: 'INT' }, { name: 'Knowledge (Architecture)', ability: 'INT' },
  { name: 'Knowledge (Dungeoneering)', ability: 'INT' }, { name: 'Knowledge (Geography)', ability: 'INT' },
  { name: 'Knowledge (History)', ability: 'INT' }, { name: 'Knowledge (Local)', ability: 'INT' },
  { name: 'Knowledge (Nature)', ability: 'INT' }, { name: 'Knowledge (Nobility)', ability: 'INT' },
  { name: 'Knowledge (Religion)', ability: 'INT' }, { name: 'Knowledge (The Planes)', ability: 'INT' },
  { name: 'Listen', ability: 'WIS' }, { name: 'Move Silently', ability: 'DEX' },
  { name: 'Open Lock', ability: 'DEX' }, { name: 'Perform', ability: 'CHA' },
  { name: 'Profession', ability: 'WIS' }, { name: 'Ride', ability: 'DEX' },
  { name: 'Search', ability: 'INT' }, { name: 'Sense Motive', ability: 'WIS' },
  { name: 'Sleight of Hand', ability: 'DEX' }, { name: 'Spellcraft', ability: 'INT' },
  { name: 'Spot', ability: 'WIS' }, { name: 'Survival', ability: 'WIS' },
  { name: 'Swim', ability: 'STR' }, { name: 'Tumble', ability: 'DEX' },
  { name: 'Use Magic Device', ability: 'CHA' }, { name: 'Use Rope', ability: 'DEX' },
];

function parseCharSkills(skillsStr, mods) {
  const parsed = {};
  if (skillsStr) {
    for (const e of skillsStr.split(/[,;]/)) {
      const m = e.trim().match(/^(.+?)\s+([+-]?\d+)$/);
      if (m) parsed[m[1].trim().toLowerCase()] = parseInt(m[2]);
    }
  }
  return DND35_SKILLS.map(skill => {
    const am = mods[skill.ability] || 0;
    const key = skill.name.toLowerCase();
    let total = parsed[key] !== undefined ? parsed[key] : am;
    const ranks = parsed[key] !== undefined ? Math.max(0, total - am) : 0;
    return { name: skill.name, ability: skill.ability, total, ranks, misc: total - am - ranks };
  });
}

const RACE_TRAITS = {
  'Dwarf': ['Darkvision 60ft', 'Stability', 'Stonecunning', '+2 vs Poison', '+2 vs Spells'],
  'Elf': ['Low-Light Vision', 'Weapon Proficiency (Bows/Swords)', 'Keen Senses', 'Immune to Sleep'],
  'Halfling': ['+1 Attack with Thrown', '+2 Climb/Jump/Listen/Move Silently', '+1 All Saves', '+2 vs Fear'],
  'Gnome': ['Low-Light Vision', '+2 vs Illusions', '+1 Attack vs Kobolds/Goblinoids', 'Speak with Animals'],
  'Half-Elf': ['Low-Light Vision', '+2 Diplomacy/Gather Info', '+1 Listen/Search/Spot', 'Immune to Sleep'],
  'Half-Orc': ['Darkvision 60ft', 'Orc Blood'],
  'Human': ['Bonus Feat', 'Extra Skill Points'],
};

const CLASS_ABILITIES = {
  'Fighter': (l) => { const a = ['Bonus Feats']; if (l >= 2) a.push('Bravery'); if (l >= 3) a.push('Armour Training'); return a; },
  'Rogue': (l) => { const a = ['Sneak Attack', 'Trapfinding']; if (l >= 2) a.push('Evasion'); return a; },
  'Wizard': () => ['Arcane Spellcasting', 'Scribe Scroll', 'Summon Familiar', 'Bonus Feats'],
  'Cleric': () => ['Divine Spellcasting', 'Turn Undead', 'Domain Powers'],
  'Ranger': (l) => { const a = ['Track', 'Wild Empathy', 'Favored Enemy']; if (l >= 2) a.push('Two-Weapon Style'); return a; },
  'Paladin': (l) => { const a = ['Aura of Good', 'Detect Evil', 'Smite Evil']; if (l >= 2) a.push('Divine Grace', 'Lay on Hands'); return a; },
  'Barbarian': (l) => { const a = ['Fast Movement', 'Rage']; if (l >= 2) a.push('Uncanny Dodge'); return a; },
  'Bard': () => ['Bardic Music', 'Bardic Knowledge', 'Countersong', 'Fascinate', 'Arcane Spellcasting'],
  'Druid': () => ['Animal Companion', 'Nature Sense', 'Wild Empathy', 'Wild Shape', 'Divine Spellcasting'],
  'Monk': (l) => { const a = ['Flurry of Blows', 'Unarmed Strike']; if (l >= 2) a.push('Evasion'); return a; },
  'Sorcerer': () => ['Arcane Spellcasting', 'Summon Familiar'],
};

/* ── SRD tooltip support ─────────────────────────────────── */
const srdCache = { skill: null, feat: null, equipment: null };

async function getSrdData(type) {
  if (srdCache[type]) return srdCache[type];
  try {
    const { apiGetSrdSkills, apiGetSrdFeats, apiGetSrdEquipment } = await import('../api/srd.js');
    if (type === 'skill') { const r = await apiGetSrdSkills(); srdCache.skill = r.data || []; }
    else if (type === 'feat') { const r = await apiGetSrdFeats(); srdCache.feat = r.data || []; }
    else if (type === 'equipment') { const r = await apiGetSrdEquipment(); srdCache.equipment = r.data || []; }
  } catch { srdCache[type] = []; }
  return srdCache[type] || [];
}

function findSrdMatch(data, name) {
  if (!name || !data.length) return null;
  const q = name.toLowerCase().trim();
  let m = data.find(d => d.name && d.name.toLowerCase() === q);
  if (m) return m;
  const words = q.split(/\s+/);
  if (words.length >= 2) {
    m = data.find(d => d.name && d.name.toLowerCase() === words[words.length - 1] + ', ' + words.slice(0, -1).join(' '));
    if (m) return m;
    m = data.find(d => d.name && d.name.toLowerCase() === words.slice(1).join(' ') + ', ' + words[0]);
    if (m) return m;
  }
  m = data.find(d => d.name && (d.name.toLowerCase().includes(q) || q.includes(d.name.toLowerCase())));
  return m || null;
}

function wireTooltips(el) {
  let tooltipEl = document.getElementById('sheet-tooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'sheet-tooltip';
    tooltipEl.className = 'sheet-tooltip';
    document.body.appendChild(tooltipEl);
  }
  el.querySelectorAll('[data-srd-type]').forEach(item => {
    item.addEventListener('mouseenter', async () => {
      tooltipEl.textContent = 'Loading...';
      tooltipEl.style.display = 'block';
      const rect = item.getBoundingClientRect();
      tooltipEl.style.left = rect.left + 'px';
      tooltipEl.style.top = (rect.bottom + 4) + 'px';
      const data = await getSrdData(item.dataset.srdType);
      const match = findSrdMatch(data, item.dataset.srdName);
      if (match) {
        const desc = match.full_text || match.description || match.benefit || match.effect || '';
        tooltipEl.innerHTML = `<strong>${match.name}</strong><br>${desc.length > 300 ? desc.substring(0, 300) + '...' : desc || 'No description.'}`;
      } else {
        tooltipEl.innerHTML = `<strong>${item.dataset.srdName}</strong><br><em>No SRD entry found</em>`;
      }
    });
    item.addEventListener('mouseleave', () => { tooltipEl.style.display = 'none'; });
  });
}

/* ── Main Export ─────────────────────────────────────────── */
export function renderCharacterSheet(el, c, { onListRefresh, onDelete, containerRef }) {
  if (!el || !c) return;

  const className = c.class || '';
  const level = parseInt(c.level) || parseClass(c.class).level || 0;
  const abilities = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map(name => {
    const raw = name === 'INT' ? c.int_ : c[name.toLowerCase()];
    const score = parseInt(raw) || 10;
    const mod = abilityMod(score);
    return { name, score, mod, modStr: fmtMod(mod), val: raw };
  });
  const mods = {}; abilities.forEach(a => mods[a.name] = a.mod);
  const bab = calcBAB(className, level);
  const babStr = calcAttackBonuses(bab, 0).map(b => (b >= 0 ? '+' : '') + b).join('/');
  const saves = parseSaves(c.saves);
  const acVals = parseACValues(c.ac);
  const allSkills = parseCharSkills(c.skills_feats || '', mods);
  const trainedSkills = allSkills.filter(s => s.ranks > 0 || s.total > 0);
  const featsList = (c.feats || '').split(/[,;]/).map(f => f.trim()).filter(Boolean);
  const gearList = (c.gear || '').split(/[,;]/).map(g => g.trim()).filter(Boolean);
  const langList = (c.languages || '').split(/[,;]/).map(l => l.trim()).filter(Boolean);
  let attacks = parseAttacks(c.atk || '');
  if (!attacks.length && c.gear) {
    const gw = parseGearWeapons(c.gear, c);
    const sm = abilities.find(a => a.name === 'STR')?.mod || 0;
    const dm = abilities.find(a => a.name === 'DEX')?.mod || 0;
    attacks = gw.map(w => {
      const am = w.ranged ? dm : sm;
      const ta = bab + am + (w.enhancement || 0);
      const dmgMod = (w.ranged ? 0 : sm) + (w.enhancement || 0);
      return { name: w.name.charAt(0).toUpperCase() + w.name.slice(1), bonus: (ta >= 0 ? '+' : '') + ta, damage: w.dmg + (dmgMod ? ((dmgMod >= 0 ? '+' : '') + dmgMod) : ''), type: w.ranged ? 'Ranged' : 'Melee', crit: w.crit, weaponData: w };
    });
  }
  const race = c.race || '';
  const raceTraits = RACE_TRAITS[race] || [];
  const classAbilFn = CLASS_ABILITIES[className];
  const classAbils = classAbilFn ? (typeof classAbilFn === 'function' ? classAbilFn(level) : classAbilFn) : [];
  const allTraits = [...raceTraits, ...classAbils];

  // Strip any trailing level number from class name (e.g. "Warrior 2" -> "Warrior")
  const classDisplay = (className || '').replace(/\s+\d+$/, '').toUpperCase();
  const subtitle = `${(c.race || '').toUpperCase()} ${classDisplay} ${level}${c.title ? ' / ' + c.title.toUpperCase() : ''}`;
  const portraitHtml = c.portrait_url
    ? `<img class="cs-portrait-img" src="${c.portrait_url}" alt="${c.name}" onerror="this.parentElement.innerHTML='<div class=\\'cs-portrait-placeholder\\'><span>📜</span></div>'">`
    : `<div class="cs-portrait-placeholder"><span>📜</span></div>`;

  // Parse money from gear
  const moneyRx = /^\s*(\d+(?:,\d+)?)\s*(pp|gp|sp|cp|ep)\s*$/i;
  const purse = { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };
  const filteredGear = [];
  for (const g of gearList) {
    const m = g.match(moneyRx);
    if (m) purse[m[2].toLowerCase()] += parseInt(m[1].replace(',', '')); else filteredGear.push(g);
  }

  // ── Build Sheet HTML ─────────────────────────────────
  el.innerHTML = `
  <div class="cs-sheet">
    <!-- Header -->
    <div class="cs-header">
      <div class="cs-header-left">
        <div class="cs-portrait-wrap" id="cs-portrait-click" title="Click to upload portrait" style="cursor:pointer;position:relative;">
          ${portraitHtml}
          <div class="cs-portrait-overlay"><span>📷</span></div>
          <input type="file" id="cs-portrait-header-file" accept="image/*" style="display:none">
        </div>
        <div class="cs-header-info">
          <h1 class="cs-name">${c.name}</h1>
          <p class="cs-subtitle">${subtitle}</p>
          ${c.status === 'Deceased' ? '<span class="cs-deceased">☠ DECEASED</span>' : ''}
        </div>
      </div>
      <div class="cs-header-right">
        <button class="cs-action-btn" id="cs-edit-btn" title="Edit">✎</button>
        <button class="cs-action-btn" id="cs-pdf-btn" title="Export PDF">📄</button>
        <button class="cs-action-btn" id="cs-levelup-btn" title="Manual Level Up">⬆</button>
        <button class="cs-action-btn" id="cs-ai-levelup-btn" title="AI Level Up" style="color:#b39ddb;">🤖</button>
        <button class="cs-action-btn cs-action-del" id="cs-delete-btn" title="Delete">✕</button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="cs-tabs">
      <button class="cs-tab active" data-tab="page1">📋 Page 1</button>
      <button class="cs-tab" data-tab="page2">🎒 Page 2</button>
      <button class="cs-tab" data-tab="social">🤝 Social</button>
      <button class="cs-tab" data-tab="family">🌳 Family</button>
      <button class="cs-tab" data-tab="background">📖 Background</button>
    </div>

    <!-- Tab Content -->
    <div class="cs-tab-content" id="cs-tab-page1">
      ${buildPage1(c, abilities, saves, acVals, bab, babStr, attacks, trainedSkills, allSkills)}
    </div>
    <div class="cs-tab-content" id="cs-tab-page2" style="display:none;">
      ${buildPage2(c, filteredGear, purse, featsList, allTraits, langList, className, level, abilities)}
    </div>
    <div class="cs-tab-content" id="cs-tab-social" style="display:none;">
      <div class="cs-social-grid">
        <div class="cs-block">
          <div class="cs-block-title">🤝 Relationships <span class="cs-block-count" id="cs-rel-count"></span></div>
          <div id="cs-rel-list" class="social-rel-list"><div class="cs-loading">Loading...</div></div>
          <div class="social-add-bar"><button class="social-add-btn" id="cs-add-rel-btn">+ Add Relationship</button></div>
        </div>
        <div class="cs-block">
          <div class="cs-block-title">🧠 Memories <span class="cs-block-count" id="cs-mem-count"></span></div>
          <div id="cs-mem-list" class="social-mem-list"><div class="cs-loading">Loading...</div></div>
          <div class="social-add-bar"><button class="social-add-btn" id="cs-add-mem-btn">+ Add Memory</button></div>
        </div>
      </div>
    </div>
    <div class="cs-tab-content" id="cs-tab-family" style="display:none;">
      <div id="cs-family-tree-root"><div class="cs-loading">Loading family tree...</div></div>
    </div>
    <div class="cs-tab-content" id="cs-tab-background" style="display:none;">
      ${buildBackgroundTab(c)}
    </div>

    <!-- Roll Log (persistent across tabs) -->
    <div class="cs-roll-log-bar">
      <div class="cs-roll-log-header">🎲 Roll Log <span id="cs-roll-log-clear">Clear</span></div>
      <div class="cs-roll-log" id="cs-roll-log"></div>
    </div>
  </div>`;

  // ── Wire tab switching ─────────────────────────────
  let equipLoaded = false;
  let socialLoaded = false;
  let spellsLoaded = false;
  let familyLoaded = false;
  el.querySelectorAll('.cs-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      el.querySelectorAll('.cs-tab').forEach(t => t.classList.remove('active'));
      el.querySelectorAll('.cs-tab-content').forEach(t => t.style.display = 'none');
      tab.classList.add('active');
      el.querySelector(`#cs-tab-${tab.dataset.tab}`).style.display = '';
      // Load equipment when page2 tab is first opened
      if (tab.dataset.tab === 'page2' && !equipLoaded && c.id) {
        equipLoaded = true;
        loadAndRenderEquipment(el, c.id, c, { onListRefresh, onDelete, containerRef });
      }
      // Load social data when social tab is first opened
      if (tab.dataset.tab === 'social' && !socialLoaded && c.id) {
        socialLoaded = true;
        loadAndRenderSocial(el, c.id, c, { onListRefresh, containerRef });
      }
      // Load spells when page2 tab is first opened
      if (tab.dataset.tab === 'page2' && !spellsLoaded && c.id) {
        spellsLoaded = true;
        loadAndRenderSpells(el, c.id, c);
      }
      // Load family tree when family tab is first opened
      if (tab.dataset.tab === 'family' && !familyLoaded && c.id) {
        familyLoaded = true;
        loadAndRenderFamilyTree(el, c.id, c, { onListRefresh, containerRef });
      }
    });
  });
  // Eagerly load equipment for page2
  if (c.id) {
    loadAndRenderEquipment(el, c.id, c, { onListRefresh, onDelete, containerRef });
    equipLoaded = true;
  }

  // Wire XP Log toggle
  wireXpLogToggle(el, c);

  // ── Wire SRD tooltips ──────────────────────────────
  wireTooltips(el);

  // ── Wire AI Debug toggle ──────────────────────────
  el.querySelector('.cs-debug-toggle')?.addEventListener('click', () => {
    const content = el.querySelector('.cs-debug-content');
    const indicator = el.querySelector('.cs-debug-toggle .cs-block-count');
    if (content) {
      const visible = content.style.display !== 'none';
      content.style.display = visible ? 'none' : 'block';
      if (indicator) indicator.textContent = visible ? '▶ click to expand' : '▼ click to collapse';
    }
  });

  // ── Wire Roll Log ──────────────────────────────────
  const rollLog = el.querySelector('#cs-roll-log');
  function addToLog(type, label, html) {
    if (!rollLog) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const entry = document.createElement('div');
    entry.className = 'roll-log-entry roll-log-' + type;
    entry.innerHTML = `<span class="roll-log-time">${time}</span><span class="roll-log-label">${label}</span>${html}`;
    rollLog.prepend(entry);
  }
  el.querySelector('#cs-roll-log-clear')?.addEventListener('click', () => { if (rollLog) rollLog.innerHTML = ''; });

  // ── Wire Skill Rolls ───────────────────────────────
  el.querySelectorAll('.cs-skill-row[data-skill]').forEach(row => {
    row.style.cursor = 'pointer';
    row.addEventListener('click', async () => {
      const skill = trainedSkills.find(s => s.name === row.dataset.skill) || allSkills.find(s => s.name === row.dataset.skill);
      if (!skill) return;
      const { showModal } = await import('../components/Modal.js');
      const { el: m, close } = showModal({
        title: 'Skill Check: ' + skill.name, width: 'narrow',
        content: `<div class="skill-check-body"><div class="skill-check-info"><span class="skill-check-label">Modifier:</span><span class="skill-check-mod">${fmtMod(skill.total)}</span></div><div class="skill-check-extra"><label>Extra:</label><input type="number" id="sk-extra" value="0" class="skill-check-input"/></div><button id="sk-roll" class="btn-primary skill-roll-btn">Roll d20</button></div>`
      });
      m.querySelector('#sk-roll').addEventListener('click', () => {
        const d20 = Math.floor(Math.random() * 20) + 1;
        const extra = parseInt(m.querySelector('#sk-extra').value) || 0;
        const tot = d20 + skill.total + extra;
        addToLog('skill', skill.name, `<span class="roll-log-dice">[${d20}]</span> + ${skill.total + extra} = <strong>${tot}</strong>${d20 === 20 ? ' <span class="roll-crit">NAT 20!</span>' : ''}${d20 === 1 ? ' <span class="roll-fumble">NAT 1!</span>' : ''}`);
        row.classList.add('roll-flash'); setTimeout(() => row.classList.remove('roll-flash'), 400);
        close();
      });
      m.querySelector('#sk-roll').focus();
    });
  });

  // ── Wire Attack Rolls ──────────────────────────────
  el.querySelectorAll('.cs-attack-block[data-atk-idx]').forEach(row => {
    row.addEventListener('click', async () => {
      const atk = attacks[parseInt(row.dataset.atkIdx)]; if (!atk) return;
      const atkBonus = parseInt(atk.bonus) || 0;
      const { showModal } = await import('../components/Modal.js');
      const { el: m, close } = showModal({
        title: 'Attack: ' + atk.name, width: 'narrow',
        content: `<div class="skill-check-body"><div class="wsim-result-stats" style="margin-bottom:0.5rem"><span>Type: ${atk.type}</span><span>Dmg: ${atk.damage}</span><span>Crit: ${atk.crit}</span></div><div class="skill-check-info"><span class="skill-check-label">Bonus:</span><span class="skill-check-mod">${atk.bonus}</span></div><div class="skill-check-extra"><label>Extra:</label><input type="number" id="atk-extra" value="0" class="skill-check-input"/></div><button id="atk-roll" class="btn-primary skill-roll-btn">Roll Attack + Damage</button><button id="dmg-only" class="btn-secondary skill-roll-btn" style="margin-left:0.5rem">Damage Only</button></div>`
      });
      function rollDmg() {
        const dm = (atk.damage || '1d4').match(/(\d+)d(\d+)([+-]\d+)?/);
        if (!dm) return { rolls: [], total: 0, bonus: 0 };
        const rolls = []; let t = 0; const b = parseInt(dm[3]) || 0;
        for (let i = 0; i < parseInt(dm[1]); i++) { const r = Math.floor(Math.random() * parseInt(dm[2])) + 1; rolls.push(r); t += r; }
        return { rolls, total: Math.max(1, t + b), bonus: b };
      }
      m.querySelector('#atk-roll').addEventListener('click', () => {
        const d20 = Math.floor(Math.random() * 20) + 1; const extra = parseInt(m.querySelector('#atk-extra').value) || 0;
        const tot = d20 + atkBonus + extra; const dmg = rollDmg();
        let html = `<span class="roll-log-dice">[${d20}]</span> + ${atkBonus + extra} = <strong>${tot}</strong>`;
        if (d20 === 20) html += ' <span class="roll-crit">CRIT!</span>'; else if (d20 === 1) html += ' <span class="roll-fumble">MISS!</span>';
        html += ` &mdash; <span class="roll-log-dmg">${dmg.rolls.join('+')}${dmg.bonus ? (dmg.bonus >= 0 ? '+' : '') + dmg.bonus : ''} = ${dmg.total} dmg</span>`;
        addToLog('attack', atk.name, html);
        row.classList.add('roll-flash'); setTimeout(() => row.classList.remove('roll-flash'), 400);
        close();
      });
      m.querySelector('#dmg-only').addEventListener('click', () => {
        const dmg = rollDmg();
        addToLog('attack', atk.name + ' (dmg)', `<span class="roll-log-dmg">${dmg.rolls.join('+')}${dmg.bonus ? (dmg.bonus >= 0 ? '+' : '') + dmg.bonus : ''} = ${dmg.total} dmg</span>`);
        close();
      });
      m.querySelector('#atk-roll').focus();
    });
  });

  // ── Wire HP adjuster ───────────────────────────────
  el.querySelector('#cs-hp-display')?.addEventListener('click', async () => {
    const maxHp = parseInt(c.hp) || 1;
    let currentHp = parseInt(el.querySelector('#cs-hp-display')?.textContent) || maxHp;
    const { showModal } = await import('../components/Modal.js');
    const { el: m, close } = showModal({
      title: 'Hit Points - ' + c.name, width: 'narrow',
      content: `<div class="hp-adjuster"><div class="hp-adjuster-display"><span class="hp-current" id="hp-cur">${currentHp}</span><span class="hp-separator">/</span><span class="hp-max">${maxHp}</span></div><div class="hp-adjuster-bar"><div class="hp-bar-fill" id="hp-bar" style="width:${Math.max(0, Math.min(100, (currentHp / maxHp) * 100))}%"></div></div><div class="hp-adjuster-buttons"><button class="hp-btn hp-btn-dmg" data-d="-10">-10</button><button class="hp-btn hp-btn-dmg" data-d="-5">-5</button><button class="hp-btn hp-btn-dmg" data-d="-1">-1</button><button class="hp-btn hp-btn-heal" data-d="1">+1</button><button class="hp-btn hp-btn-heal" data-d="5">+5</button><button class="hp-btn hp-btn-heal" data-d="10">+10</button></div><div class="hp-adjuster-custom"><input type="number" id="hp-amt" class="form-input" value="1" min="1" style="width:80px"><button class="btn-secondary hp-btn-apply" id="hp-dmg-btn">Damage</button><button class="btn-secondary hp-btn-apply" id="hp-heal-btn">Heal</button><button class="btn-primary hp-btn-apply" id="hp-full-btn">Full Heal</button></div></div>`
    });
    const curEl = m.querySelector('#hp-cur'), barEl = m.querySelector('#hp-bar');
    function upd(hp) {
      currentHp = Math.max(-10, Math.min(maxHp, hp)); curEl.textContent = currentHp;
      barEl.style.width = Math.max(0, (currentHp / maxHp) * 100) + '%';
      barEl.style.background = currentHp <= 0 ? '#8b0000' : currentHp <= maxHp * 0.25 ? '#cc3333' : currentHp <= maxHp * 0.5 ? '#cc8833' : 'var(--accent)';
      const sheetHp = el.querySelector('#cs-hp-display'); if (sheetHp) sheetHp.textContent = currentHp;
      apiSaveCharacter(getState().currentTownId || c.town_id, { id: c.id, hp: String(currentHp) }).catch(() => { });
    }
    m.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => { upd(currentHp + parseInt(b.dataset.d)); close(); }));
    m.querySelector('#hp-dmg-btn')?.addEventListener('click', () => { const a = parseInt(m.querySelector('#hp-amt').value) || 0; if (a > 0) { upd(currentHp - a); close(); } });
    m.querySelector('#hp-heal-btn')?.addEventListener('click', () => { const a = parseInt(m.querySelector('#hp-amt').value) || 0; if (a > 0) { upd(currentHp + a); close(); } });
    m.querySelector('#hp-full-btn')?.addEventListener('click', () => { upd(maxHp); close(); });
  });

  // ── Wire Coin Purse ────────────────────────────────
  el.querySelectorAll('.purse-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const coin = btn.dataset.coin, dir = parseInt(btn.dataset.dir);
      const valEl = el.querySelector(`.purse-val[data-coin="${coin}"]`); if (!valEl) return;
      let val = Math.max(0, (parseInt(valEl.textContent) || 0) + dir); valEl.textContent = val;
      const coins = {}; el.querySelectorAll('.purse-val').forEach(v => coins[v.dataset.coin] = parseInt(v.textContent) || 0);
      const gearItems = []; el.querySelectorAll('.cs-gear-item span:last-child').forEach(s => { const t = s.textContent.trim(); if (t && !t.endsWith('XP')) gearItems.push(t); });
      const mp = []; if (coins.pp > 0) mp.push(coins.pp + ' pp'); if (coins.gp > 0) mp.push(coins.gp + ' gp'); if (coins.ep > 0) mp.push(coins.ep + ' ep'); if (coins.sp > 0) mp.push(coins.sp + ' sp'); if (coins.cp > 0) mp.push(coins.cp + ' cp');
      await apiSaveCharacter(getState().currentTownId || c.town_id, { id: c.id, gear: [...gearItems, ...mp].join(', ') }).catch(() => { });
    });
  });

  // ── Wire Portrait Upload ───────────────────────────
  el.querySelector('#cs-portrait-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = async () => {
        let w = img.width, h = img.height; const s = Math.min(200 / w, 270 / h);
        if (s < 1) { w = Math.round(w * s); h = Math.round(h * s); }
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        const url = cv.toDataURL('image/jpeg', 0.72);
        c.portrait_url = url;
        await apiSaveCharacter(getState().currentTownId || c.town_id, { id: c.id, portrait_url: url }).catch(() => { });
        const ch = getState().currentTown?.characters?.find(x => x.id === c.id); if (ch) ch.portrait_url = url;
        renderCharacterSheet(el, c, { onListRefresh, onDelete, containerRef });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  // ── Wire header portrait click-to-upload ────────────
  const headerPortrait = el.querySelector('#cs-portrait-click');
  const headerFileInput = el.querySelector('#cs-portrait-header-file');
  if (headerPortrait && headerFileInput) {
    headerPortrait.addEventListener('click', (e) => {
      if (e.target.closest('input')) return; // don't double-trigger
      headerFileInput.click();
    });
    headerFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = async () => {
          let w = img.width, h = img.height; const s = Math.min(200 / w, 270 / h);
          if (s < 1) { w = Math.round(w * s); h = Math.round(h * s); }
          const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(img, 0, 0, w, h);
          const url = cv.toDataURL('image/jpeg', 0.72);
          c.portrait_url = url;
          await apiSaveCharacter(getState().currentTownId || c.town_id, { id: c.id, portrait_url: url }).catch(() => { });
          const ch = getState().currentTown?.characters?.find(x => x.id === c.id); if (ch) ch.portrait_url = url;
          renderCharacterSheet(el, c, { onListRefresh, onDelete, containerRef });
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ── Wire Edit/Delete/LevelUp ───────────────────────
  el.querySelector('#cs-edit-btn')?.addEventListener('click', async () => {
    try {
      const { initCreatorFromCharacter, renderCreator } = await import('../components/CharacterCreator.js');
      const townId = getState().currentTownId || c.town_id;

      // Callback: restore sheet after save or cancel
      const restoreSheet = async () => {
        try {
          const result = await apiGetCharacters(townId);
          const updated = (result.characters || []).find(ch => ch.id == c.id);
          if (updated) {
            const norm = normalizeCharacter(updated);
            // Update state
            const stateChars = getState().currentTown?.characters || [];
            const idx = stateChars.findIndex(ch => ch.id == c.id);
            if (idx >= 0) stateChars[idx] = norm;
            if (onListRefresh) onListRefresh();
            renderCharacterSheet(el, norm, { onListRefresh, onDelete, containerRef });
          } else {
            renderCharacterSheet(el, c, { onListRefresh, onDelete, containerRef });
          }
        } catch { renderCharacterSheet(el, c, { onListRefresh, onDelete, containerRef }); }
      };

      await initCreatorFromCharacter(c, {
        townId,
        onComplete: restoreSheet,
        onCancel: () => renderCharacterSheet(el, c, { onListRefresh, onDelete, containerRef }),
      });
      renderCreator(el);
    } catch (err) {
      console.error('Failed to open editor:', err);
      alert('Edit failed: ' + err.message);
    }
  });

  el.querySelector('#cs-pdf-btn')?.addEventListener('click', async () => {
    const btn = el.querySelector('#cs-pdf-btn');
    btn.textContent = '⏳'; btn.disabled = true;
    try {
      const { exportCharacterPDF } = await import('../engine/pdfExport.js');
      await exportCharacterPDF(c);
    } catch (err) {
      alert('PDF export failed: ' + err.message);
    } finally { btn.textContent = '📄'; btn.disabled = false; }
  });

  el.querySelector('#cs-delete-btn')?.addEventListener('click', async () => {
    if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    try {
      await apiDeleteCharacter(getState().currentTownId || c.town_id, c.id);
      if (onDelete) onDelete();
    } catch (err) { alert('Delete failed: ' + err.message); }
  });

  el.querySelector('#cs-levelup-btn')?.addEventListener('click', async () => {
    try {
      const { openLevelUpWizard } = await import('../components/LevelUpWizard.js');
      openLevelUpWizard(c, async (state) => {
        // Refresh character data after level up
        try {
          const { apiGetCharacters, normalizeCharacter: normChar } = await import('../api/characters.js');
          const result = await apiGetCharacters(getState().currentTownId || c.town_id);
          const chars = result.characters || [];
          const updated = chars.find(ch => ch.id == c.id);
          if (updated) {
            const norm = normChar(updated);
            const stateChars = getState().currentTown?.characters || [];
            const idx = stateChars.findIndex(ch => ch.id == c.id);
            if (idx >= 0) stateChars[idx] = norm;
            if (onListRefresh) onListRefresh();
            renderCharacterSheet(el, norm, { onListRefresh, onDelete, containerRef });
            addToLog('hp', 'LEVEL UP', `<strong>Leveled up to ${state.selectedClass} (Level ${state.newTotalLevel})</strong>`);
          }
        } catch (e) { console.error('Failed to refresh after level up:', e); }
      });
    } catch (err) {
      const { showToast } = await import('../components/Toast.js');
      showToast('Failed to open level up wizard: ' + err.message, 'error');
    }
  });


  // ── AI Level Up (Narrative, LLM-powered) ───────
  el.querySelector('#cs-ai-levelup-btn')?.addEventListener('click', async () => {
    const townId = getState().currentTownId || c.town_id;
    if (!townId || !c.id) return;

    const { showModal } = await import('../components/Modal.js');
    const { el: modal, close } = showModal({
      title: '🤖 AI Level Up',
      width: 'wide',
      content: `<div class="ai-levelup-loading"><div class="ai-levelup-spinner"></div><div class="ai-levelup-text">AI is leveling up ${c.name}...<br><small>Using AI for narrative level-up decisions (5-15 sec)</small></div></div>`,
    });

    try {
      const { apiLevelUpCharacter } = await import('../api/characters.js');
      const result = await apiLevelUpCharacter(townId, c.id);

      if (!result.ok) throw new Error(result.error || 'AI level up failed');

      const newC = result.character || {};
      const diffFields = [
        { label: 'Class', old: c.class, new: newC.class },
        { label: 'Level', old: result.old_level, new: result.new_level },
        { label: 'HP', old: c.hp, new: newC.hp },
        { label: 'Saves', old: c.saves, new: newC.saves },
        { label: 'STR', old: c.str, new: newC.str },
        { label: 'DEX', old: c.dex, new: newC.dex },
        { label: 'CON', old: c.con, new: newC.con },
        { label: 'INT', old: c.int_, new: newC.int_ },
        { label: 'WIS', old: c.wis, new: newC.wis },
        { label: 'CHA', old: c.cha, new: newC.cha },
        { label: 'Feats', old: c.feats, new: newC.feats },
        { label: 'Skills', old: c.skills_feats, new: newC.skills_feats },
        { label: 'CR', old: c.cr, new: newC.cr },
      ].filter(d => String(d.old || '') !== String(d.new || ''));

      modal.innerHTML = `
        <div>
          <h4 style="color:#b39ddb;margin:0 0 0.75rem;">🤖 AI Level Up: ${c.name} → Level ${result.new_level}</h4>
          <div class="ai-levelup-diff">
            ${diffFields.map(d => `
              <div class="ai-diff-row changed">
                <span class="ai-diff-label">${d.label}</span>
                <span class="ai-diff-old">${String(d.old || '—').substring(0, 80)}</span>
                <span class="ai-diff-arrow">→</span>
                <span class="ai-diff-new">${String(d.new || '—').substring(0, 80)}</span>
              </div>
            `).join('')}
          </div>
          ${result.summary ? `<div class="ai-levelup-summary"><strong>AI Summary:</strong>\n${result.summary}</div>` : ''}
          <div class="ai-levelup-actions">
            <button class="btn-primary btn-sm" id="ai-lu-ok">Accept</button>
          </div>
        </div>
      `;

      modal.querySelector('#ai-lu-ok')?.addEventListener('click', async () => {
        close();
        try {
          const { apiGetCharacters, normalizeCharacter: normChar } = await import('../api/characters.js');
          const res = await apiGetCharacters(townId);
          const updated = (res.characters || []).find(ch => ch.id == c.id);
          if (updated) {
            const norm = normChar(updated);
            const stateChars = getState().currentTown?.characters || [];
            const idx = stateChars.findIndex(ch => ch.id == c.id);
            if (idx >= 0) stateChars[idx] = norm;
            if (onListRefresh) onListRefresh();
            renderCharacterSheet(el, norm, { onListRefresh, onDelete, containerRef });
          }
        } catch (e) { console.error('Refresh failed:', e); }
      });
    } catch (err) {
      modal.innerHTML = `
        <div style="text-align:center;padding:2rem;">
          <div style="font-size:1.5rem;margin-bottom:0.5rem;">❌</div>
          <div style="color:#ff5252;">${err.message}</div>
          <button class="btn-secondary btn-sm" style="margin-top:1rem;" onclick="this.closest('.modal')?.remove()">Close</button>
        </div>
      `;
    }
  });

  // ── Editable sections (click header to edit) ───────
  wireEditableSections(el, c, addToLog, { onListRefresh, containerRef });
}

/* ── Tab Builder: Page 1 — Stats, Combat, Skills ─────────── */
function buildPage1(c, abilities, saves, acVals, bab, babStr, attacks, trainedSkills, allSkills) {
  const grappleMod = c.grapple || '—';
  const maxRanks = ((parseInt(c.level) || 1) + 3);

  return `
  <!-- Character Info Bar -->
  <div class="cs-info-bar">
    <div class="cs-info-field"><span class="cs-info-val">${c.name || ''}</span><span class="cs-info-label">Character Name</span></div>
    <div class="cs-info-field"><span class="cs-info-val">${c.race || ''}</span><span class="cs-info-label">Race</span></div>
    <div class="cs-info-field"><span class="cs-info-val">${c.alignment || ''}</span><span class="cs-info-label">Alignment</span></div>
  </div>
  <div class="cs-phys-bar">
    <div class="cs-phys-field"><span class="cs-info-val">${c.class || ''}</span><span class="cs-info-label">Class & Level</span></div>
    <div class="cs-phys-field"><span class="cs-info-val">${c.gender || ''}</span><span class="cs-info-label">Gender</span></div>
    <div class="cs-phys-field"><span class="cs-info-val">${c.age || ''}</span><span class="cs-info-label">Age</span></div>
    <div class="cs-phys-field"><span class="cs-info-val">${c.role || ''}</span><span class="cs-info-label">Role</span></div>
  </div>

  <!-- 3-Column: Abilities | Combat | Skills -->
  <div class="cs-page1-grid">
    <!-- Left: Abilities -->
    <div class="cs-abilities-col">
      <div class="dnd-section-head">Ability Scores</div>
      <div class="cs-ability-header">
        <span></span>
        <span>Score</span>
        <span>Mod</span>
        <span>Temp</span>
        <span>T.Mod</span>
      </div>
      ${abilities.map(a => `
        <div class="cs-ability-row">
          <div class="cs-ability-name">${a.name}<small>${{ STR: 'Strength', DEX: 'Dexterity', CON: 'Constitution', INT: 'Intelligence', WIS: 'Wisdom', CHA: 'Charisma' }[a.name] || ''}</small></div>
          <div class="dnd-field">${a.val || '—'}</div>
          <div class="dnd-field">${a.val ? a.modStr : ''}</div>
          <div class="dnd-field dnd-field-sm"></div>
          <div class="dnd-field dnd-field-sm"></div>
        </div>`).join('')}
    </div>

    <!-- Center: Combat -->
    <div class="cs-combat-col">
      <!-- HP -->
      <div>
        <div class="dnd-section-head">Hit Points</div>
        <div class="cs-hp-section">
          <div class="cs-hp-total">
            <div class="dnd-field dnd-field-lg" id="cs-hp-display" title="Click to adjust HP" style="cursor:pointer">${c.hp || '0'}</div>
            <div class="dnd-field-label">Total</div>
          </div>
          <div class="cs-hp-boxes">
            <div class="cs-hp-box"><div class="dnd-field" style="flex:1;width:100%;min-height:28px">${c.hd || ''}</div><div class="dnd-field-label">Hit Dice</div></div>
            <div class="cs-hp-box"><div class="dnd-field" style="flex:1;width:100%;min-height:28px;color:#ff6b6b"></div><div class="dnd-field-label">Wounds</div></div>
          </div>
        </div>
      </div>

      <!-- Speed -->
      <div>
        <div class="dnd-section-head">Speed</div>
        <div style="display:flex;gap:0.3rem">
          <div style="display:flex;flex-direction:column;align-items:center"><div class="dnd-field">${c.spd || '30 ft'}</div><div class="dnd-field-label">Speed</div></div>
        </div>
      </div>

      <!-- AC -->
      <div>
        <div class="dnd-section-head">Armor Class</div>
        <div class="cs-ac-section">
          <div class="cs-ac-main-row">
            <div style="display:flex;flex-direction:column;align-items:center"><div class="dnd-field dnd-field-lg">${acVals.total || '10'}</div><div class="dnd-field-label">Total</div></div>
            <span class="cs-ac-equals">=</span>
            <div class="cs-ac-breakdown">
              <div style="display:flex;flex-direction:column;align-items:center"><div class="dnd-field dnd-field-sm">10</div><div class="dnd-field-label">Base</div></div>
              <span class="cs-ac-plus">+</span>
              <div style="display:flex;flex-direction:column;align-items:center"><div class="dnd-field dnd-field-sm">${acVals.armor || ''}</div><div class="dnd-field-label">Armor</div></div>
              <span class="cs-ac-plus">+</span>
              <div style="display:flex;flex-direction:column;align-items:center"><div class="dnd-field dnd-field-sm">${acVals.shield || ''}</div><div class="dnd-field-label">Shield</div></div>
              <span class="cs-ac-plus">+</span>
              <div style="display:flex;flex-direction:column;align-items:center"><div class="dnd-field dnd-field-sm">${acVals.dex || ''}</div><div class="dnd-field-label">Dex</div></div>
              <span class="cs-ac-plus">+</span>
              <div style="display:flex;flex-direction:column;align-items:center"><div class="dnd-field dnd-field-sm">${acVals.natural || ''}</div><div class="dnd-field-label">Natural</div></div>
              <span class="cs-ac-plus">+</span>
              <div style="display:flex;flex-direction:column;align-items:center"><div class="dnd-field dnd-field-sm">${acVals.misc || ''}</div><div class="dnd-field-label">Misc</div></div>
            </div>
          </div>
          <div class="cs-ac-sub-row">
            <div class="cs-ac-sub-item"><span class="cs-ac-sub-label">Touch</span><div class="dnd-field dnd-field-sm">${acVals.touch || '—'}</div></div>
            <div class="cs-ac-sub-item"><span class="cs-ac-sub-label">Flat-Footed</span><div class="dnd-field dnd-field-sm">${acVals.flat || '—'}</div></div>
          </div>
        </div>
      </div>

      <!-- Initiative -->
      <div>
        <div class="dnd-section-head">Initiative</div>
        <div class="cs-init-row">
          <div style="display:flex;flex-direction:column;align-items:center"><div class="dnd-field">${c.init || '+0'}</div><div class="dnd-field-label">Total</div></div>
          <span class="cs-ac-equals">=</span>
          <div style="display:flex;flex-direction:column;align-items:center"><div class="dnd-field dnd-field-sm">${abilities.find(a => a.name === 'DEX')?.modStr || '+0'}</div><div class="dnd-field-label">Dex Mod</div></div>
          <span class="cs-ac-plus">+</span>
          <div style="display:flex;flex-direction:column;align-items:center"><div class="dnd-field dnd-field-sm"></div><div class="dnd-field-label">Misc</div></div>
        </div>
      </div>

      <!-- Saving Throws -->
      <div>
        <div class="dnd-section-head">Saving Throws</div>
        <div class="cs-saves-section">
          <div class="cs-save-header">
            <span></span><span>Total</span><span>Base</span><span>Ability</span><span>Magic</span><span>Misc</span><span>Temp</span>
          </div>
          ${[
      { name: 'Fortitude', sub: 'CON', val: saves.fort },
      { name: 'Reflex', sub: 'DEX', val: saves.ref },
      { name: 'Will', sub: 'WIS', val: saves.will }
    ].map(sv => `
            <div class="cs-save-row">
              <div class="cs-save-name">${sv.name}<small>(${sv.sub})</small></div>
              <div class="dnd-field">${sv.val || '+0'}</div>
              <div class="dnd-field dnd-field-sm"></div>
              <div class="dnd-field dnd-field-sm">${abilities.find(a => a.name === sv.sub)?.modStr || ''}</div>
              <div class="dnd-field dnd-field-sm"></div>
              <div class="dnd-field dnd-field-sm"></div>
              <div class="dnd-field dnd-field-sm"></div>
            </div>`).join('')}
        </div>
      </div>

      <!-- BAB & Grapple -->
      <div>
        <div class="dnd-section-head">Base Attack / Grapple</div>
        <div class="cs-bab-section">
          <div class="cs-bab-item"><span class="cs-bab-label">BAB</span><div class="dnd-field">${babStr}</div></div>
          <div class="cs-bab-item"><span class="cs-bab-label">Grapple</span><div class="dnd-field">${grappleMod}</div></div>
          <div class="cs-bab-item"><span class="cs-bab-label">Spell Res.</span><div class="dnd-field">${c.sr || ''}</div></div>
        </div>
      </div>

      <!-- Attacks -->
      <div>
        <div class="dnd-section-head">Attacks</div>
        ${attacks.length ? attacks.map((a, i) => `
          <div class="cs-attack-block" data-atk-idx="${i}" title="Click to roll">
            <div class="cs-atk-top">
              <div><span class="cs-atk-val-text">${a.name}</span><span class="cs-atk-label-text">Attack</span></div>
              <div><span class="cs-atk-val-text">${a.bonus}</span><span class="cs-atk-label-text">Attack Bonus</span></div>
              <div><span class="cs-atk-val-text">${a.damage}</span><span class="cs-atk-label-text">Damage</span></div>
              <div><span class="cs-atk-val-text">${a.crit}</span><span class="cs-atk-label-text">Critical</span></div>
            </div>
            <div class="cs-atk-bot">
              <div><span class="cs-atk-val-text">${a.weaponData?.range || ''}</span><span class="cs-atk-label-text">Range</span></div>
              <div><span class="cs-atk-val-text">${a.type || ''}</span><span class="cs-atk-label-text">Type</span></div>
              <div><span class="cs-atk-val-text"></span><span class="cs-atk-label-text">Notes</span></div>
            </div>
          </div>`).join('') : '<div class="cs-empty">No attacks</div>'}
      </div>
    </div>

    <!-- Right: Skills -->
    <div class="cs-skills-col">
      <div class="dnd-section-head">Skills <span class="head-count">${trainedSkills.length} trained · Max Ranks ${maxRanks}</span></div>
      <div class="cs-skills-list">
        <div class="cs-skill-header">
          <span>✓</span><span>Skill Name</span><span>Key</span><span>Mod</span><span>Ab</span><span>Rnk</span><span>Misc</span>
        </div>
        ${allSkills.map(s => {
      const isTrained = s.ranks > 0;
      const tc = s.total > 0 ? 'cs-val-pos' : s.total < 0 ? 'cs-val-neg' : '';
      const abData = abilities.find(a => a.name === s.ability);
      const abMod = abData ? abData.mod : 0;
      const abTc = abMod > 0 ? 'cs-val-pos' : abMod < 0 ? 'cs-val-neg' : '';
      return `<div class="cs-skill-row" data-skill="${s.name}" data-srd-type="skill" data-srd-name="${s.name}">
            <div class="cs-skill-check">${isTrained ? '✓' : ''}</div>
            <span class="cs-skill-name">${s.name}</span>
            <span class="cs-skill-ab">${s.ability}</span>
            <span class="cs-skill-val ${tc}">${fmtMod(s.total)}</span>
            <span class="cs-skill-val ${abTc}">${fmtMod(abMod)}</span>
            <span class="cs-skill-val">${s.ranks || ''}</span>
            <span class="cs-skill-val">${s.misc || ''}</span>
          </div>`;
    }).join('')}
      </div>
    </div>
  </div>`;
}

/* ── Tab Builder: Page 2 — Equipment, Feats, Spells ─────── */
function buildPage2(c, filteredGear, purse, featsList, allTraits, langList, className, level, abilities) {
  const purseHtml = `<div class="cs-purse">
    <span class="cs-purse-title">Coin Purse</span>
    <div class="cs-purse-coins">
      ${['pp', 'gp', 'ep', 'sp', 'cp'].map(coin => `
        <div class="purse-spinner purse-${coin}">
          <button class="purse-btn purse-minus" data-coin="${coin}" data-dir="-1">−</button>
          <span class="purse-val" data-coin="${coin}">${purse[coin]}</span>
          <label class="purse-label">${coin}</label>
          <button class="purse-btn purse-plus" data-coin="${coin}" data-dir="1">+</button>
        </div>`).join('')}
    </div>
  </div>`;

  return `
  <div class="cs-page2-grid">
    <!-- Left: Equipment + Money -->
    <div class="cs-page2-left">
      <!-- Paperdoll -->
      <div class="cs-block cs-paperdoll-block">
        <div class="cs-block-title">Equipment <span class="cs-block-count" id="cs-equip-count"></span></div>
        <div class="cs-paperdoll" id="cs-paperdoll">
          <div class="pd-row pd-row-top">
            <div class="pd-slot pd-empty" data-slot="head"><span class="pd-label">Head</span><span class="pd-item" id="pd-head"></span></div>
          </div>
          <div class="pd-row pd-row-shoulders">
            <div class="pd-slot pd-empty" data-slot="back"><span class="pd-label">Back</span><span class="pd-item" id="pd-back"></span></div>
            <div class="pd-slot pd-empty" data-slot="neck"><span class="pd-label">Neck</span><span class="pd-item" id="pd-neck"></span></div>
          </div>
          <div class="pd-row pd-row-torso">
            <div class="pd-slot pd-empty" data-slot="main_hand"><span class="pd-label">Main Hand</span><span class="pd-item" id="pd-main_hand"></span></div>
            <div class="pd-body-center">
              <svg viewBox="0 0 80 140" class="pd-svg">
                <ellipse cx="40" cy="16" rx="11" ry="13" fill="none" stroke="rgba(255,215,0,0.18)" stroke-width="1.2"/>
                <line x1="40" y1="29" x2="40" y2="82" stroke="rgba(255,215,0,0.14)" stroke-width="1.5"/>
                <line x1="40" y1="42" x2="14" y2="68" stroke="rgba(255,215,0,0.14)" stroke-width="1.2"/>
                <line x1="40" y1="42" x2="66" y2="68" stroke="rgba(255,215,0,0.14)" stroke-width="1.2"/>
                <line x1="40" y1="82" x2="24" y2="130" stroke="rgba(255,215,0,0.14)" stroke-width="1.2"/>
                <line x1="40" y1="82" x2="56" y2="130" stroke="rgba(255,215,0,0.14)" stroke-width="1.2"/>
              </svg>
            </div>
            <div class="pd-slot pd-empty" data-slot="off_hand"><span class="pd-label">Off Hand</span><span class="pd-item" id="pd-off_hand"></span></div>
          </div>
          <div class="pd-row pd-row-chest">
            <div class="pd-slot pd-empty pd-wide" data-slot="armor"><span class="pd-label">Armor</span><span class="pd-item" id="pd-armor"></span></div>
          </div>
          <div class="pd-row pd-row-mid">
            <div class="pd-slot pd-empty pd-small" data-slot="hands"><span class="pd-label">Hands</span><span class="pd-item" id="pd-hands"></span></div>
            <div class="pd-slot pd-empty" data-slot="waist"><span class="pd-label">Belt</span><span class="pd-item" id="pd-waist"></span></div>
            <div class="pd-slot pd-empty pd-small" data-slot="ring1"><span class="pd-label">Ring</span><span class="pd-item" id="pd-ring1"></span></div>
          </div>
          <div class="pd-row pd-row-bottom">
            <div class="pd-slot pd-empty pd-small" data-slot="ring2"><span class="pd-label">Ring</span><span class="pd-item" id="pd-ring2"></span></div>
            <div class="pd-slot pd-empty" data-slot="feet"><span class="pd-label">Feet</span><span class="pd-item" id="pd-feet"></span></div>
          </div>
        </div>
      </div>

      <!-- Backpack -->
      <div class="cs-block">
        <div class="cs-block-title">Backpack <span class="cs-block-count" id="cs-backpack-count"></span></div>
        <div class="cs-backpack-list" id="cs-backpack-list">
          <div class="cs-loading">Loading...</div>
        </div>
      </div>

      <!-- Add from SRD -->
      <div class="cs-add-srd-bar">
        <button class="btn-primary btn-sm cs-add-srd-btn" id="cs-add-srd-btn">📦 Add from SRD</button>
      </div>

      ${purseHtml}
      ${buildXpSection(c)}
    </div>

    <!-- Center: Feats + Traits + Languages -->
    <div class="cs-page2-center">
      <div>
        <div class="dnd-section-head">Feats</div>
        <div class="cs-feats-list">
          ${featsList.length ? featsList.map(f => `<div class="cs-feat-item" data-srd-type="feat" data-srd-name="${f}">${f}</div>`).join('') : '<div class="cs-empty">No feats</div>'}
        </div>
      </div>

      <div>
        <div class="dnd-section-head">Special Abilities</div>
        <div class="cs-traits-list">
          ${allTraits.length ? allTraits.map(t => `<div class="cs-trait-item">${t}</div>`).join('') : '<div class="cs-empty">No special abilities</div>'}
        </div>
      </div>

      <div>
        <div class="dnd-section-head">Languages</div>
        <div class="cs-languages">${langList.length ? langList.join(', ') : 'Common'}</div>
      </div>

      <div class="cs-block cs-ai-debug">
        <div class="cs-block-title cs-debug-toggle" style="cursor:pointer;user-select:none;">🤖 AI Character Data <span class="cs-block-count" style="font-size:0.65rem;">▶ click to expand</span></div>
        <div class="cs-debug-content" style="display:none;">
          <pre class="cs-debug-json" style="font-size:0.65rem;line-height:1.3;background:rgba(0,0,0,0.3);padding:0.5rem;border-radius:4px;overflow-x:auto;max-height:400px;overflow-y:auto;color:var(--text-secondary);white-space:pre-wrap;word-break:break-word;">${JSON.stringify({
    name: c.name, race: c.race, class: c.class, gender: c.gender, age: c.age,
    status: c.status, alignment: c.alignment,
    hp: c.hp, ac: c.ac, init: c.init, spd: c.spd, hd: c.hd,
    str: c.str, dex: c.dex, con: c.con, int_: c.int_, wis: c.wis, cha: c.cha,
    saves: c.saves, grapple: c.grapple, atk: c.atk,
    skills_feats: c.skills_feats, feats: c.feats, spells: c.spells || '',
    gear: c.gear, languages: c.languages,
    role: c.role, spouse: c.spouse, cr: c.cr, xp: c.xp
  }, null, 2).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        </div>
      </div>
    </div>

    <!-- Right: Spells -->
    <div class="cs-page2-right">
      ${buildSpellsTab(c, className, level, abilities)}
    </div>
  </div>`;
}

/* ── Equipment Rendering — Paperdoll ─────────────────────── */
const TYPE_TO_SLOT = { armor: 'armor', shield: 'off_hand', weapon: 'main_hand', ring: 'ring1' };
const ALL_SLOTS = ['head', 'neck', 'back', 'main_hand', 'armor', 'off_hand', 'hands', 'ring1', 'ring2', 'waist', 'feet'];
const SLOT_NICE = { head: 'Head', neck: 'Neck', back: 'Back', main_hand: 'Main Hand', armor: 'Armor', off_hand: 'Off Hand', hands: 'Hands', ring1: 'Ring 1', ring2: 'Ring 2', waist: 'Belt', feet: 'Feet' };

function renderBackpackItems(equipment) {
  const backpack = equipment.filter(e => !e.equipped);
  if (!backpack.length) return '<div class="cs-empty">Backpack is empty</div>';
  return backpack.map(item => {
    const typeIcon = { weapon: '⚔️', armor: '🛡️', shield: '🛡️', potion: '🧪', scroll: '📜', wand: '🪄', ring: '💍', wondrous: '✨' }[item.item_type] || '📦';
    // Determine suggested slot from type OR item name keywords
    let suggestedSlot = TYPE_TO_SLOT[item.item_type] || '';
    if (!suggestedSlot) {
      const n = (item.item_name || '').toLowerCase();
      const weaponWords = ['sword', 'dagger', 'axe', 'bow', 'crossbow', 'mace', 'hammer', 'spear', 'staff', 'quarterstaff', 'sickle', 'club', 'flail', 'morningstar', 'scimitar', 'rapier', 'trident', 'javelin', 'sling', 'lance', 'halberd', 'glaive', 'scythe', 'falchion', 'warhammer', 'battleaxe', 'greataxe', 'greatsword'];
      const armorWords = ['armor', 'mail', 'plate', 'breastplate', 'chain shirt', 'hide'];
      const shieldWords = ['shield', 'buckler'];
      if (weaponWords.some(w => n.includes(w))) suggestedSlot = 'main_hand';
      else if (shieldWords.some(w => n.includes(w))) suggestedSlot = 'off_hand';
      else if (armorWords.some(w => n.includes(w))) suggestedSlot = 'armor';
    }
    // Strip enhancement bonuses and prefixes for SRD lookup
    const srdName = (item.item_name || '').replace(/\s*\(.*\)/, '').replace(/\+\d+/, '').replace(/masterwork\s*/i, '').trim();
    // Parse cost from properties to determine if item is sellable
    let sellable = false;
    let sellLabel = '';
    try {
      const p = typeof item.properties === 'string' ? JSON.parse(item.properties || '{}') : (item.properties || {});
      if (p.cost) {
        const parsed = parseSrdCostToCopper(p.cost);
        if (parsed && parsed.cp > 0) {
          sellable = true;
          sellLabel = p.cost;
        }
      }
    } catch (_) {}
    return `<div class="cs-backpack-item" data-item-id="${item.id}" data-srd-type="equipment" data-srd-name="${srdName}">
      <span class="cs-bp-icon">${typeIcon}</span>
      <span class="cs-bp-name">${item.item_name}${item.quantity > 1 ? ` ×${item.quantity}` : ''}</span>
      <span class="cs-bp-actions">
        ${suggestedSlot ? `<button class="cs-bp-equip-btn" data-item-id="${item.id}" data-slot="${suggestedSlot}" title="Equip to ${SLOT_NICE[suggestedSlot] || suggestedSlot}">⬆ Equip</button>` : ''}
        ${sellable ? `<button class="cs-bp-sell-btn" data-item-id="${item.id}" data-cost="${sellLabel}" title="Sell for ${sellLabel}">💰 Sell</button>` : ''}
        <button class="cs-bp-del-btn" data-item-id="${item.id}" title="Delete">🗑️</button>
      </span>
    </div>`;
  }).join('');
}

/** Update AC display on Core tab from the server-returned AC string */
function updateACDisplay(el, acStr, character) {
  if (!acStr) return;
  character.ac = acStr;
  // The new layout uses the first .dnd-field-lg inside the AC section for the total
  // and .cs-ac-sub-item for touch/flat-footed
  const acVals = parseACValues(acStr);
  // Update total AC - find the dnd-field-lg closest to the AC section
  const acSection = el.querySelector('.cs-ac-section');
  if (acSection) {
    const acBig = acSection.querySelector('.dnd-field-lg');
    if (acBig) acBig.textContent = acVals.total || '10';
    const subItems = acSection.querySelectorAll('.cs-ac-sub-item .dnd-field-sm');
    if (subItems.length >= 2) {
      subItems[0].textContent = acVals.touch || '—';
      subItems[1].textContent = acVals.flat || '—';
    }
  }
}

/** Load and render social data (relationships + memories) for a character */
async function loadAndRenderSocial(el, charId, character, options) {
  const { apiGetSocialData, apiSaveRelationship, apiDeleteRelationship, apiGetMemories, apiSaveMemory, apiDeleteMemory } = await import('../api/social.js');
  const { getState } = await import('../stores/appState.js');

  const REL_ICONS = { friend: '🤝', rival: '⚡', enemy: '⚔️', romantic: '❤️', mentor: '📚', student: '📖', ally: '🤜', acquaintance: '👋', family: '👨‍👩‍👧' };

  async function renderRelationships() {
    const listEl = el.querySelector('#cs-rel-list');
    const countEl = el.querySelector('#cs-rel-count');
    if (!listEl) return;

    try {
      const townId = getState().currentTownId;
      if (!townId) { listEl.innerHTML = '<div class="social-empty"><div class="social-empty-icon">🤝</div>No town selected</div>'; return; }
      const data = await apiGetSocialData(townId);
      const rels = (data.relationships || []).filter(r => r.char1_id == charId || r.char2_id == charId);
      if (countEl) countEl.textContent = rels.length;

      if (!rels.length) {
        listEl.innerHTML = '<div class="social-empty"><div class="social-empty-icon">🤝</div>No relationships yet</div>';
        return;
      }
      listEl.innerHTML = rels.map(r => {
        const otherName = r.char1_id == charId ? r.char2_name : r.char1_name;
        const icon = REL_ICONS[r.rel_type] || '👋';
        const dVal = parseInt(r.disposition) || 0;
        let dClass = 'neutral';
        if (dVal >= 7) dClass = 'close';
        else if (dVal >= 3) dClass = 'friendly';
        else if (dVal <= -7) dClass = 'hostile';
        else if (dVal <= -3) dClass = 'unfriendly';
        return `<div class="social-rel-card" data-type="${r.rel_type}" data-rel-id="${r.id}">
          <div class="rel-icon">${icon}</div>
          <div class="rel-info">
            <div class="rel-names">${character.name} ↔ ${otherName}</div>
            <div class="rel-type">${r.rel_type}${r.reason ? ' — ' + r.reason : ''}</div>
          </div>
          <div class="rel-disposition ${dClass}" title="Disposition: ${dVal}/10">${dVal > 0 ? '+' : ''}${dVal}</div>
        </div>`;
      }).join('');
    } catch (e) {
      listEl.innerHTML = '<div class="social-empty">Failed to load relationships</div>';
      console.error('Social relationships error:', e);
    }
  }

  async function renderMemories() {
    const listEl = el.querySelector('#cs-mem-list');
    const countEl = el.querySelector('#cs-mem-count');
    if (!listEl) return;

    try {
      const memories = await apiGetMemories(charId);
      if (countEl) countEl.textContent = memories.length;
      if (!memories.length) {
        listEl.innerHTML = '<div class="social-empty"><div class="social-empty-icon">🧠</div>No memories yet</div>';
        return;
      }
      listEl.innerHTML = memories.map(m => {
        const sentVal = parseInt(m.sentiment) || 0;
        let sentClass = 'mem-sentiment-neutral';
        if (sentVal > 0) sentClass = 'mem-sentiment-pos';
        else if (sentVal < 0) sentClass = 'mem-sentiment-neg';
        const impClass = (parseInt(m.importance) || 5) >= 7 ? ' mem-importance-high' : '';
        return `<div class="social-mem-card ${sentClass}${impClass}" data-mem-id="${m.id}">
          <div class="mem-content">${m.content}</div>
          <div class="mem-meta">
            <span>${m.memory_type || 'event'}</span>
            ${m.related_char_name ? `<span>↔ ${m.related_char_name}</span>` : ''}
            <span>⭐ ${m.importance || 5}</span>
            ${m.game_date ? `<span>📅 ${m.game_date}</span>` : ''}
          </div>
        </div>`;
      }).join('');
    } catch (e) {
      listEl.innerHTML = '<div class="social-empty">Failed to load memories</div>';
      console.error('Social memories error:', e);
    }
  }

  // Wire Add Relationship button
  el.querySelector('#cs-add-rel-btn')?.addEventListener('click', async () => {
    const { showModal } = await import('../components/Modal.js');
    const { apiGetCharacters } = await import('../api/characters.js');
    const townId = getState().currentTownId;
    if (!townId) return;
    const res = await apiGetCharacters(townId);
    const others = (res.characters || []).filter(ch => ch.id != charId);

    const { el: m, close } = showModal({
      title: '🤝 Add Relationship', width: 'narrow',
      content: `<div class="modal-form">
        <label>Other Character</label>
        <select id="rel-other-char" class="form-select">
          ${others.map(ch => `<option value="${ch.id}">${ch.name}</option>`).join('')}
        </select>
        <label>Type</label>
        <select id="rel-type" class="form-select">
          <option value="acquaintance">Acquaintance</option>
          <option value="friend">Friend</option>
          <option value="ally">Ally</option>
          <option value="rival">Rival</option>
          <option value="enemy">Enemy</option>
          <option value="romantic">Romantic</option>
          <option value="mentor">Mentor</option>
          <option value="student">Student</option>
          <option value="family">Family</option>
        </select>
        <label>Disposition (-10 to 10)</label>
        <input type="number" id="rel-disp" class="form-input" value="0" min="-10" max="10">
        <label>Reason</label>
        <input type="text" id="rel-reason" class="form-input" placeholder="How they know each other...">
        <button class="btn-primary" id="rel-save-btn" style="margin-top:0.75rem;width:100%">Save Relationship</button>
      </div>`
    });
    m.querySelector('#rel-save-btn')?.addEventListener('click', async () => {
      await apiSaveRelationship({
        char1_id: charId,
        char2_id: parseInt(m.querySelector('#rel-other-char').value),
        rel_type: m.querySelector('#rel-type').value,
        disposition: parseInt(m.querySelector('#rel-disp').value) || 0,
        reason: m.querySelector('#rel-reason').value
      });
      close();
      await renderRelationships();
    });
  });

  // Wire Add Memory button
  el.querySelector('#cs-add-mem-btn')?.addEventListener('click', async () => {
    const { showModal } = await import('../components/Modal.js');
    const { el: m, close } = showModal({
      title: '🧠 Add Memory', width: 'narrow',
      content: `<div class="modal-form">
        <label>Memory Content</label>
        <textarea id="mem-content" class="form-input" rows="3" placeholder="What does this character remember?"></textarea>
        <label>Type</label>
        <select id="mem-type" class="form-select">
          <option value="event">Event</option>
          <option value="interaction">Interaction</option>
          <option value="impression">Impression</option>
          <option value="rumor">Rumor</option>
          <option value="secret">Secret</option>
        </select>
        <label>Sentiment (-5 to 5)</label>
        <input type="number" id="mem-sentiment" class="form-input" value="0" min="-5" max="5">
        <label>Importance (1-10)</label>
        <input type="number" id="mem-importance" class="form-input" value="5" min="1" max="10">
        <button class="btn-primary" id="mem-save-btn" style="margin-top:0.75rem;width:100%">Save Memory</button>
      </div>`
    });
    m.querySelector('#mem-save-btn')?.addEventListener('click', async () => {
      await apiSaveMemory({
        character_id: charId,
        content: m.querySelector('#mem-content').value,
        memory_type: m.querySelector('#mem-type').value,
        sentiment: parseInt(m.querySelector('#mem-sentiment').value) || 0,
        importance: parseInt(m.querySelector('#mem-importance').value) || 5
      });
      close();
      await renderMemories();
    });
  });

  // Initial render
  await Promise.all([renderRelationships(), renderMemories()]);
}

/**
 * Parse SRD cost string (e.g. "250 gp", "1,500 gp", "5 sp", "+50 gp") into copper pieces.
 * Returns { cp: number, display: string } or null if unparseable.
 */
function parseSrdCostToCopper(costStr) {
  if (!costStr || costStr === '—' || costStr === '-') return null;
  const clean = costStr.replace(/[+,]/g, '').trim();
  const m = clean.match(/^(\d+(?:\.\d+)?)\s*(pp|gp|ep|sp|cp)$/i);
  if (!m) return null;
  const amount = parseFloat(m[1]);
  const denom = m[2].toLowerCase();
  const rates = { pp: 1000, gp: 100, ep: 50, sp: 10, cp: 1 };
  return { cp: Math.round(amount * (rates[denom] || 0)), display: costStr.replace(/[+]/g, '').trim() };
}

/**
 * Convert a total copper amount into a coin breakdown,
 * returning largest denominations first.
 */
function copperToCoins(totalCp) {
  const pp = Math.floor(totalCp / 1000); totalCp -= pp * 1000;
  const gp = Math.floor(totalCp / 100); totalCp -= gp * 100;
  const ep = Math.floor(totalCp / 50); totalCp -= ep * 50;
  const sp = Math.floor(totalCp / 10); totalCp -= sp * 10;
  return { pp, gp, ep, sp, cp: totalCp };
}

/**
 * Read the current purse values from the DOM spinners.
 */
function readPurseFromDom(sheetEl) {
  const purse = { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };
  sheetEl.querySelectorAll('.purse-val').forEach(v => {
    purse[v.dataset.coin] = parseInt(v.textContent) || 0;
  });
  return purse;
}

/**
 * Convert a purse object to total copper pieces.
 */
function purseToCp(purse) {
  return (purse.pp || 0) * 1000 + (purse.gp || 0) * 100 + (purse.ep || 0) * 50 + (purse.sp || 0) * 10 + (purse.cp || 0);
}

/**
 * Write updated purse values back to the DOM and save to the character's gear string.
 */
async function writePurseToDom(sheetEl, newPurse, character) {
  // Update DOM spinners
  for (const [coin, val] of Object.entries(newPurse)) {
    const valEl = sheetEl.querySelector(`.purse-val[data-coin="${coin}"]`);
    if (valEl) valEl.textContent = val;
  }
  // Rebuild gear string (non-money items + money)
  const gearItems = [];
  sheetEl.querySelectorAll('.cs-gear-item span:last-child').forEach(s => {
    const t = s.textContent.trim();
    if (t && !t.endsWith('XP')) gearItems.push(t);
  });
  const mp = [];
  if (newPurse.pp > 0) mp.push(newPurse.pp + ' pp');
  if (newPurse.gp > 0) mp.push(newPurse.gp + ' gp');
  if (newPurse.ep > 0) mp.push(newPurse.ep + ' ep');
  if (newPurse.sp > 0) mp.push(newPurse.sp + ' sp');
  if (newPurse.cp > 0) mp.push(newPurse.cp + ' cp');
  await apiSaveCharacter(getState().currentTownId || character.town_id, {
    id: character.id, gear: [...gearItems, ...mp].join(', ')
  }).catch(() => {});
}

async function loadAndRenderEquipment(el, charId, character, options) {
  const { apiGetEquipment, apiEquipItem, apiUnequipItem, apiDeleteEquipment, apiSaveEquipment } = await import('../api/equipment.js');
  let equipment = [];
  try { equipment = await apiGetEquipment(charId); } catch { /* empty */ }

  const bpEl = el.querySelector('#cs-backpack-list');
  const eqCountEl = el.querySelector('#cs-equip-count');
  const bpCountEl = el.querySelector('#cs-backpack-count');

  async function refresh() {
    // Update paperdoll slots
    const equippedBySlot = {};
    for (const item of equipment) {
      if (item.equipped && item.slot) equippedBySlot[item.slot] = item;
    }
    for (const slot of ALL_SLOTS) {
      const slotEl = el.querySelector(`.pd-slot[data-slot="${slot}"]`);
      const itemEl = el.querySelector(`#pd-${slot}`);
      if (!slotEl || !itemEl) continue;
      const item = equippedBySlot[slot];
      if (item) {
        itemEl.textContent = item.item_name;
        slotEl.classList.add('pd-filled');
        slotEl.classList.remove('pd-empty');
        slotEl.dataset.itemId = item.id;
        // SRD tooltip for equipped items
        const srdName = (item.item_name || '').replace(/\s*\(.*\)/, '').replace(/\+\d+/, '').replace(/masterwork\s*/i, '').trim();
        slotEl.dataset.srdType = 'equipment';
        slotEl.dataset.srdName = srdName;
      } else {
        itemEl.textContent = '';
        slotEl.classList.remove('pd-filled');
        slotEl.classList.add('pd-empty');
        delete slotEl.dataset.itemId;
        delete slotEl.dataset.srdType;
        delete slotEl.dataset.srdName;
      }
    }
    if (bpEl) bpEl.innerHTML = renderBackpackItems(equipment);
    if (eqCountEl) eqCountEl.textContent = equipment.filter(e => e.equipped).length + ' equipped';
    if (bpCountEl) bpCountEl.textContent = equipment.filter(e => !e.equipped).length + ' items';
    wireEquipEvents();
    // Re-wire SRD tooltips for newly rendered equipment
    wireTooltips(el);
  }

  function wireEquipEvents() {
    // Paperdoll slots — click filled to unequip, click empty to pick from backpack
    el.querySelectorAll('.pd-slot').forEach(slotEl => {
      slotEl.onclick = async () => {
        const slot = slotEl.dataset.slot;
        if (slotEl.classList.contains('pd-filled') && slotEl.dataset.itemId) {
          const itemId = parseInt(slotEl.dataset.itemId);
          const res = await apiUnequipItem(charId, itemId);
          const item = equipment.find(e => e.id == itemId);
          if (item) { item.equipped = false; item.slot = null; }
          if (res.ac) { updateACDisplay(el, res.ac, character); if (options.onListRefresh) options.onListRefresh(); }
          await refresh();
        } else {
          const backpack = equipment.filter(e => !e.equipped);
          if (!backpack.length) return;
          const { showModal } = await import('../components/Modal.js');
          const { el: m, close } = showModal({
            title: 'Equip to ' + (SLOT_NICE[slot] || slot), width: 'narrow',
            content: '<div class="equip-pick-list">' + backpack.map(item => {
              const icon = { weapon: '⚔️', armor: '🛡️', shield: '🛡️', potion: '🧪', scroll: '📜', ring: '💍', wondrous: '✨' }[item.item_type] || '📦';
              return '<div class="equip-pick-item" data-id="' + item.id + '"><span>' + icon + '</span><span>' + item.item_name + '</span></div>';
            }).join('') + '</div>'
          });
          m.querySelectorAll('.equip-pick-item').forEach(row => {
            row.addEventListener('click', async () => {
              const itemId = parseInt(row.dataset.id);
              const res = await apiEquipItem(charId, itemId, slot);
              const prev = equipment.find(e => e.equipped && e.slot === slot);
              if (prev) { prev.equipped = false; prev.slot = null; }
              const item = equipment.find(e => e.id == itemId);
              if (item) { item.equipped = true; item.slot = slot; }
              if (res.ac) { updateACDisplay(el, res.ac, character); if (options.onListRefresh) options.onListRefresh(); }
              close(); await refresh();
            });
          });
        }
      };
    });
    // Backpack equip/delete buttons
    el.querySelectorAll('.cs-bp-equip-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const itemId = parseInt(btn.dataset.itemId);
        const slot = btn.dataset.slot;
        const res = await apiEquipItem(charId, itemId, slot);
        const prev = equipment.find(e => e.equipped && e.slot === slot);
        if (prev) { prev.equipped = false; prev.slot = null; }
        const item = equipment.find(e => e.id == itemId);
        if (item) { item.equipped = true; item.slot = slot; }
        if (res.ac) { updateACDisplay(el, res.ac, character); if (options.onListRefresh) options.onListRefresh(); }
        await refresh();
      });
    });
    el.querySelectorAll('.cs-bp-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const itemId = parseInt(btn.dataset.itemId);
        if (!confirm('Delete this item?')) return;
        await apiDeleteEquipment(charId, itemId);
        equipment = equipment.filter(e => e.id != itemId);
        await refresh();
      });
    });
    // Sell button handler
    el.querySelectorAll('.cs-bp-sell-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const itemId = parseInt(btn.dataset.itemId);
        const costStr = btn.dataset.cost;
        const item = equipment.find(e => e.id == itemId);
        if (!item) return;

        const parsed = parseSrdCostToCopper(costStr);
        if (!parsed || parsed.cp <= 0) {
          const { showToast } = await import('../components/Toast.js');
          showToast(`Cannot determine sell value for "${item.item_name}"`, 'warning');
          return;
        }

        // Get sell rate from settings (default 50%)
        let sellRate = 50;
        try {
          const { apiGetSettings } = await import('../api/settings.js');
          const settingsRes = await apiGetSettings();
          if (settingsRes.settings?.sell_rate) sellRate = parseInt(settingsRes.settings.sell_rate) || 50;
        } catch (_) {}

        const sellCp = Math.max(1, Math.floor(parsed.cp * sellRate / 100));
        const sellCoins = copperToCoins(sellCp);
        const sellStr = [sellCoins.pp && `${sellCoins.pp} pp`, sellCoins.gp && `${sellCoins.gp} gp`, sellCoins.sp && `${sellCoins.sp} sp`, sellCoins.cp && `${sellCoins.cp} cp`].filter(Boolean).join(', ');

        if (!confirm(`Sell ${item.item_name} for ${sellStr} (${sellRate}% of ${costStr})?`)) return;

        // Add coins to purse
        const purse = readPurseFromDom(el);
        const currentTotal = purseToCp(purse);
        const newTotal = currentTotal + sellCp;
        const newPurse = copperToCoins(newTotal);
        await writePurseToDom(el, newPurse, character);

        // Remove item
        await apiDeleteEquipment(charId, itemId);
        equipment = equipment.filter(e => e.id != itemId);

        const { showToast } = await import('../components/Toast.js');
        showToast(`Sold ${item.item_name} for ${sellStr}`, 'success');
        await refresh();
      });
    });
  }

  refresh();

  // SRD Equipment Browser button
  el.querySelector('#cs-add-srd-btn')?.addEventListener('click', async () => {
    const { apiGetSrdEquipment } = await import('../api/srd.js');
    const { showModal } = await import('../components/Modal.js');

    let allItems = [];
    let activeCategory = '';
    let searchQuery = '';

    const { el: m, close } = showModal({
      title: '📦 Add Equipment from SRD', width: 'wide',
      content: `<div class="srd-equip-browser">
        <div class="srd-equip-search">
          <input type="text" id="srd-eq-search" class="form-input" placeholder="Search equipment..." autofocus>
        </div>
        <div class="srd-equip-cats" id="srd-eq-cats"></div>
        <div class="srd-equip-results" id="srd-eq-results">
          <div class="cs-loading">Loading SRD equipment...</div>
        </div>
      </div>`
    });

    // Load data
    try {
      const res = await apiGetSrdEquipment();
      allItems = res.data || res || [];
    } catch { allItems = []; }

    // Extract categories
    const categories = [...new Set(allItems.map(i => i.category).filter(Boolean))].sort();
    const catsEl = m.querySelector('#srd-eq-cats');
    catsEl.innerHTML = `<button class="srd-cat-btn active" data-cat="">All (${allItems.length})</button>` +
      categories.map(c => {
        const count = allItems.filter(i => i.category === c).length;
        return `<button class="srd-cat-btn" data-cat="${c}">${c} (${count})</button>`;
      }).join('');

    function renderResults() {
      let filtered = allItems;
      if (activeCategory) filtered = filtered.filter(i => i.category === activeCategory);
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(i => (i.name || '').toLowerCase().includes(q));
      }
      const resultsEl = m.querySelector('#srd-eq-results');
      if (!filtered.length) {
        resultsEl.innerHTML = '<div class="cs-empty">No items found</div>';
        return;
      }
      // Pre-compute affordability
      const currentPurse = readPurseFromDom(el);
      const totalCp = purseToCp(currentPurse);

      resultsEl.innerHTML = `<div class="srd-eq-header"><span>Name</span><span>Category</span><span>Cost</span><span>Wt</span><span>Damage</span><span></span></div>` +
        filtered.slice(0, 100).map(item => {
          const parsed = parseSrdCostToCopper(item.cost);
          const canAfford = parsed ? totalCp >= parsed.cp : false;
          const hasCost = item.cost && item.cost !== '—';
          let buyBtn = '';
          if (hasCost) {
            if (canAfford) {
              buyBtn = `<button class="btn-sm srd-eq-buy" data-id="${item.id}" title="Buy — subtract ${item.cost} from coin purse">🪙 Buy</button>`;
            } else {
              const shortfall = parsed ? parsed.cp - totalCp : 0;
              const shortCoins = copperToCoins(shortfall);
              const shortStr = [shortCoins.gp && `${shortCoins.gp} gp`, shortCoins.sp && `${shortCoins.sp} sp`, shortCoins.cp && `${shortCoins.cp} cp`].filter(Boolean).join(', ') || '—';
              buyBtn = `<button class="btn-sm srd-eq-buy srd-eq-cant-afford" data-id="${item.id}" disabled title="Can't afford — need ${shortStr} more">🪙 Buy</button>`;
            }
          }
          return `<div class="srd-eq-row" data-id="${item.id}">
          <span class="srd-eq-name">${item.name}</span>
          <span class="srd-eq-cat">${item.category || '—'}</span>
          <span class="srd-eq-cost">${item.cost || '—'}</span>
          <span class="srd-eq-wt">${item.weight || '—'}</span>
          <span class="srd-eq-dmg">${item.damage || '—'}</span>
          <span class="srd-eq-actions"><button class="btn-primary btn-sm srd-eq-add" data-id="${item.id}">+ Add</button>${buyBtn}</span>
        </div>`;
        }).join('') + (filtered.length > 100 ? '<div class="cs-muted" style="text-align:center;padding:0.5rem">Showing first 100 results...</div>' : '');
      wireAddButtons();
      wireBuyButtons();
    }

    function wireAddButtons() {
      m.querySelectorAll('.srd-eq-add').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = parseInt(btn.dataset.id);
          const srdItem = allItems.find(i => i.id === id);
          if (!srdItem) return;
          // Determine item_type from category + name
          const cat = (srdItem.category || '').toLowerCase();
          const itemName = (srdItem.name || '').toLowerCase();
          let itemType = 'gear';
          if (cat.includes('weapon')) itemType = 'weapon';
          else if (cat.includes('armor') || cat.includes('shield')) {
            // "Armor and Shields" category — check NAME to distinguish
            const isShield = itemName.startsWith('shield') || itemName.includes('buckler');
            itemType = isShield ? 'shield' : 'armor';
          }
          else if (cat.includes('potion')) itemType = 'potion';
          else if (cat.includes('ring')) itemType = 'ring';
          else if (cat.includes('wand') || cat.includes('rod') || cat.includes('staff')) itemType = 'wand';
          else if (cat.includes('scroll')) itemType = 'scroll';
          // Build properties JSON from SRD data
          const props = {};
          if (srdItem.damage) props.damage = srdItem.damage;
          if (srdItem.critical) props.critical = srdItem.critical;
          if (srdItem.cost) props.cost = srdItem.cost;
          if (srdItem.properties) props.srd_properties = srdItem.properties;
          const wt = parseFloat((srdItem.weight || '0').replace(/[^\d.]/g, '')) || 0;

          const res = await apiSaveEquipment(charId, {
            item_name: srdItem.name,
            item_type: itemType,
            quantity: 1,
            weight: wt,
            properties: JSON.stringify(props),
            srd_ref: 'srd_equipment:' + srdItem.id
          });
          if (res.ok) {
            equipment.push({ id: res.id, character_id: charId, item_name: srdItem.name, item_type: itemType, quantity: 1, weight: wt, properties: JSON.stringify(props), srd_ref: 'srd_equipment:' + srdItem.id, equipped: false, slot: null });
            btn.textContent = '✓ Added';
            btn.disabled = true;
            btn.classList.remove('btn-primary');
            refresh();
          }
        });
      });
    }

    function wireBuyButtons() {
      m.querySelectorAll('.srd-eq-buy').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = parseInt(btn.dataset.id);
          const srdItem = allItems.find(i => i.id === id);
          if (!srdItem) return;

          // Parse cost
          const parsed = parseSrdCostToCopper(srdItem.cost);
          if (!parsed || parsed.cp <= 0) {
            const { showToast } = await import('../components/Toast.js');
            showToast(`Cannot parse cost: "${srdItem.cost}"`, 'warning');
            return;
          }

          // Read current purse from the sheet behind the modal
          const purse = readPurseFromDom(el);
          const totalCp = purseToCp(purse);

          if (totalCp < parsed.cp) {
            const { showToast } = await import('../components/Toast.js');
            const have = copperToCoins(totalCp);
            const haveStr = [have.pp && `${have.pp} pp`, have.gp && `${have.gp} gp`, have.sp && `${have.sp} sp`, have.cp && `${have.cp} cp`].filter(Boolean).join(', ') || '0 cp';
            showToast(`Can't afford ${srdItem.name} (${parsed.display}) — you have ${haveStr}`, 'error');
            return;
          }

          // Subtract cost and update purse
          const remainingCp = totalCp - parsed.cp;
          const newPurse = copperToCoins(remainingCp);
          await writePurseToDom(el, newPurse, character);

          // Determine item_type (same logic as +Add)
          const cat = (srdItem.category || '').toLowerCase();
          const itemName = (srdItem.name || '').toLowerCase();
          let itemType = 'gear';
          if (cat.includes('weapon')) itemType = 'weapon';
          else if (cat.includes('armor') || cat.includes('shield')) {
            const isShield = itemName.startsWith('shield') || itemName.includes('buckler');
            itemType = isShield ? 'shield' : 'armor';
          }
          else if (cat.includes('potion')) itemType = 'potion';
          else if (cat.includes('ring')) itemType = 'ring';
          else if (cat.includes('wand') || cat.includes('rod') || cat.includes('staff')) itemType = 'wand';
          else if (cat.includes('scroll')) itemType = 'scroll';

          const props = {};
          if (srdItem.damage) props.damage = srdItem.damage;
          if (srdItem.critical) props.critical = srdItem.critical;
          if (srdItem.cost) props.cost = srdItem.cost;
          if (srdItem.properties) props.srd_properties = srdItem.properties;
          const wt = parseFloat((srdItem.weight || '0').replace(/[^\d.]/g, '')) || 0;

          const res = await apiSaveEquipment(charId, {
            item_name: srdItem.name,
            item_type: itemType,
            quantity: 1,
            weight: wt,
            properties: JSON.stringify(props),
            srd_ref: 'srd_equipment:' + srdItem.id
          });
          if (res.ok) {
            equipment.push({ id: res.id, character_id: charId, item_name: srdItem.name, item_type: itemType, quantity: 1, weight: wt, properties: JSON.stringify(props), srd_ref: 'srd_equipment:' + srdItem.id, equipped: false, slot: null });
            const { showToast } = await import('../components/Toast.js');
            showToast(`Bought ${srdItem.name} for ${parsed.display}`, 'success');
            refresh();
            // Re-render results so affordability updates for all items
            renderResults();
          }
        });
      });
    }

    // Category filter
    catsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.srd-cat-btn');
      if (!btn) return;
      activeCategory = btn.dataset.cat;
      catsEl.querySelectorAll('.srd-cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderResults();
    });

    // Search
    let searchTimer;
    m.querySelector('#srd-eq-search')?.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        searchQuery = e.target.value.trim();
        renderResults();
      }, 200);
    });

    renderResults();
  });
}

/* ── XP Section with expandable log ────────────────────── */
function buildXpSection(c) {
  const xp = parseInt(c.xp) || 0;
  const level = parseInt(c.level) || 1;
  // D&D 3.5e: next level N requires N*(N-1)*500 XP
  const nextLevel = level + 1;
  const xpNeeded = nextLevel * (nextLevel - 1) * 500;
  const prevXp = level * (level - 1) * 500;
  const progress = xpNeeded > prevXp ? Math.min(100, Math.round(((xp - prevXp) / (xpNeeded - prevXp)) * 100)) : 100;

  return `
    <div class="cs-xp-section">
      <div class="cs-xp-header" id="cs-xp-header" title="Click to view XP log" style="cursor:pointer;">
        <div class="cs-xp-info">
          <span class="cs-xp-label">✨ Experience</span>
          <span class="cs-xp-total">${xp.toLocaleString()} XP</span>
        </div>
        <div class="cs-xp-next">
          <span class="cs-xp-next-label">Next Level (${nextLevel}): ${xpNeeded.toLocaleString()} XP</span>
        </div>
      </div>
      <div class="cs-xp-progress-bar">
        <div class="cs-xp-progress-fill" style="width:${progress}%"></div>
        <span class="cs-xp-progress-text">${progress}%</span>
      </div>
      <div class="cs-xp-log-panel" id="cs-xp-log-panel" style="display:none;">
        <div class="cs-xp-log-header">
          <span>📋 XP History</span>
          <span class="cs-xp-log-indicator" id="cs-xp-log-indicator">Loading...</span>
        </div>
        <div class="cs-xp-log-list" id="cs-xp-log-list"></div>
      </div>
    </div>`;
}

function wireXpLogToggle(el, c) {
  const header = el.querySelector('#cs-xp-header');
  const panel = el.querySelector('#cs-xp-log-panel');
  if (!header || !panel) return;

  let loaded = false;
  header.addEventListener('click', async () => {
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : '';
    if (!isOpen && !loaded && c.id) {
      loaded = true;
      const listEl = el.querySelector('#cs-xp-log-list');
      const indicator = el.querySelector('#cs-xp-log-indicator');
      try {
        const { apiGetXpLog } = await import('../api/characters.js');
        const res = await apiGetXpLog(c.id);
        const logs = res.xp_log || [];
        if (indicator) indicator.textContent = `${logs.length} entries`;
        if (!logs.length) {
          listEl.innerHTML = '<div class="cs-xp-log-empty">No XP history yet. Run a simulation to start tracking.</div>';
          return;
        }
        listEl.innerHTML = `
          <table class="cs-xp-log-table">
            <thead><tr><th>Date</th><th>XP</th><th>Source</th><th>Reason</th></tr></thead>
            <tbody>
              ${logs.map(l => {
                const sourceIcon = l.source === 'ai' ? '🤖' : '⚙️';
                const sourceLabel = l.source === 'ai' ? 'AI' : 'System';
                return `<tr>
                  <td class="xplog-date">${l.game_date || '—'}</td>
                  <td class="xplog-xp">+${parseInt(l.xp_gained).toLocaleString()}</td>
                  <td class="xplog-source">${sourceIcon} ${sourceLabel}</td>
                  <td class="xplog-reason">${l.reason || '—'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>`;
      } catch (err) {
        listEl.innerHTML = `<div class="cs-xp-log-empty">Failed to load XP log: ${err.message}</div>`;
        if (indicator) indicator.textContent = 'Error';
      }
    }
  });
}

/* ── Tab Builder: Spells ─────────────────────────────────── */
function buildSpellsTab(c, className, level, abilities) {
  const casterClasses = ['Wizard', 'Sorcerer', 'Cleric', 'Druid', 'Bard', 'Paladin', 'Ranger', 'Adept'];
  const isCaster = casterClasses.some(cc => className.toLowerCase().includes(cc.toLowerCase()));

  if (!isCaster) {
    return `<div class="cs-spell-empty"><div class="cs-spell-empty-icon">✨</div><p>This character does not have spellcasting abilities.</p><p class="cs-muted">Only spellcasting classes (Wizard, Sorcerer, Cleric, Druid, Bard, Paladin, Ranger) have access to spells.</p></div>`;
  }

  const isCleric = className.toLowerCase().includes('cleric');

  return `
  <div class="cs-spell-grid">
    <div class="cs-block">
      <div class="cs-block-title">📊 Spells Per Day <span class="cs-block-count" id="cs-spell-ability-label"></span></div>
      <div id="cs-spell-slots-table"><div class="cs-loading">Loading spell data...</div></div>
      <div class="cs-spell-actions" style="margin-top:0.5rem;display:flex;gap:0.5rem;">
        <button class="btn-secondary btn-sm" id="cs-spell-rest-btn" title="Reset all used spell slots">🛏️ Rest</button>
        <button class="btn-secondary btn-sm" id="cs-spell-clear-btn" title="Clear all prepared spells" style="color:#ff5252;border-color:rgba(255,82,82,0.3);">🗑️ Clear All</button>
      </div>
      <div id="cs-metamagic-known"></div>
      ${isCleric ? `
      <div id="cs-domain-section" class="domain-section">
        <div class="domain-section-title">⛪ Cleric Domains <span class="cs-block-count" id="cs-domain-names"></span></div>
        <div id="cs-domain-content"><div class="cs-loading">Loading domains...</div></div>
        <div id="cs-domain-spells-list" class="domain-spells-list"></div>
      </div>
      <div id="cs-spontaneous-section" class="spontaneous-section">
        <div class="spontaneous-title" id="cs-spontaneous-title">🔄 Spontaneous Casting</div>
        <div id="cs-spontaneous-content"></div>
      </div>` : ''}
    </div>
    <div class="cs-block" style="flex:2;">
      <div class="cs-block-title" id="cs-spell-list-title">📜 Spell List</div>
      <div id="cs-spell-list"><div class="cs-loading">Loading...</div></div>
      <div class="cs-spell-add-bar" id="cs-spell-add-bar" style="margin-top:0.5rem;">
        <div style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;">
          <input type="text" id="cs-spell-search" class="form-input" placeholder="Search spells..." style="flex:1;min-width:100px;font-size:0.8rem;padding:0.3rem 0.5rem;">
          <select id="cs-spell-class-filter" class="form-input" style="width:auto;font-size:0.75rem;padding:0.25rem;">
            <option value="${className}">${className}</option>
          </select>
          <select id="cs-spell-level-filter" class="form-input" style="width:auto;font-size:0.75rem;padding:0.25rem;">
            <option value="">All Lvls</option>
            <option value="0">0</option><option value="1">1</option><option value="2">2</option>
            <option value="3">3</option><option value="4">4</option><option value="5">5</option>
            <option value="6">6</option><option value="7">7</option><option value="8">8</option>
            <option value="9">9</option>
          </select>
          <select id="cs-spell-school-filter" class="form-input" style="width:auto;font-size:0.75rem;padding:0.25rem;">
            <option value="">All Schools</option>
            <option value="Abjuration">Abjuration</option>
            <option value="Conjuration">Conjuration</option>
            <option value="Divination">Divination</option>
            <option value="Enchantment">Enchantment</option>
            <option value="Evocation">Evocation</option>
            <option value="Illusion">Illusion</option>
            <option value="Necromancy">Necromancy</option>
            <option value="Transmutation">Transmutation</option>
            <option value="Universal">Universal</option>
          </select>
          <button class="btn-primary btn-sm" id="cs-spell-search-btn">🔍</button>
        </div>
        <div id="cs-spell-search-results" style="margin-top:0.4rem;max-height:250px;overflow-y:auto;"></div>
      </div>
    </div>
  </div>`;
}

/* ── Spell Tab: Load + Render (async, called on tab open) ── */
import {
  getCasterInfo, calculateSpellSlots, getSpellsKnownLimits,
  parseSpellLevels, spellLevelForClass
} from '../engine/spellcasting35e.js';
import {
  apiGetSpellsKnown, apiSaveSpellKnown, apiDeleteSpellKnown,
  apiGetSpellsPrepared, apiSaveSpellPrepared, apiDeleteSpellPrepared,
  apiMarkSpellUsed, apiRestAllSpells, apiClearSpellsPrepared,
  apiGetSpellbook, apiSaveSpellbookEntry, apiDeleteSpellbookEntry,
} from '../api/spellsEffects.js';
import { apiGetSrdClassProgression, apiGetSrdSpells, apiGetSrdSpellDetail } from '../api/srd.js';

/* ── Hardcoded spell progressions for classes that may be missing from SRD DB ── */
const FALLBACK_PROGRESSIONS = {
  // Adept (NPC class) - DMG p.107
  Adept: {
    1: [3, 1],
    2: [3, 1],
    3: [3, 2],
    4: [3, 2, 0],
    5: [3, 2, 1],
    6: [3, 2, 1],
    7: [3, 3, 2],
    8: [3, 3, 2, 0],
    9: [3, 3, 2, 1],
    10: [3, 3, 2, 1],
    11: [3, 3, 3, 2],
    12: [3, 3, 3, 2, 0],
    13: [3, 3, 3, 2, 1],
    14: [3, 3, 3, 2, 1],
    15: [3, 3, 3, 3, 2],
    16: [3, 3, 3, 3, 2, 0],
    17: [3, 3, 3, 3, 2, 1],
    18: [3, 3, 3, 3, 2, 1],
    19: [3, 3, 3, 3, 3, 2],
    20: [3, 3, 3, 3, 3, 2],
  },
  // Wizard - PHB Table 3-18
  Wizard: {
    1: [3, 1],
    2: [4, 2],
    3: [4, 2, 1],
    4: [4, 3, 2],
    5: [4, 3, 2, 1],
    6: [4, 3, 3, 2],
    7: [4, 4, 3, 2, 1],
    8: [4, 4, 3, 3, 2],
    9: [4, 4, 4, 3, 2, 1],
    10: [4, 4, 4, 3, 3, 2],
    11: [4, 4, 4, 4, 3, 2, 1],
    12: [4, 4, 4, 4, 3, 3, 2],
    13: [4, 4, 4, 4, 4, 3, 2, 1],
    14: [4, 4, 4, 4, 4, 3, 3, 2],
    15: [4, 4, 4, 4, 4, 4, 3, 2, 1],
    16: [4, 4, 4, 4, 4, 4, 3, 3, 2],
    17: [4, 4, 4, 4, 4, 4, 4, 3, 2, 1],
    18: [4, 4, 4, 4, 4, 4, 4, 3, 3, 2],
    19: [4, 4, 4, 4, 4, 4, 4, 4, 3, 3],
    20: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  },
  // Sorcerer - PHB Table 3-17
  Sorcerer: {
    1: [5, 3],
    2: [6, 4],
    3: [6, 5],
    4: [6, 6, 3],
    5: [6, 6, 4],
    6: [6, 6, 5, 3],
    7: [6, 6, 6, 4],
    8: [6, 6, 6, 5, 3],
    9: [6, 6, 6, 6, 4],
    10: [6, 6, 6, 6, 5, 3],
    11: [6, 6, 6, 6, 6, 4],
    12: [6, 6, 6, 6, 6, 5, 3],
    13: [6, 6, 6, 6, 6, 6, 4],
    14: [6, 6, 6, 6, 6, 6, 5, 3],
    15: [6, 6, 6, 6, 6, 6, 6, 4],
    16: [6, 6, 6, 6, 6, 6, 6, 5, 3],
    17: [6, 6, 6, 6, 6, 6, 6, 6, 4],
    18: [6, 6, 6, 6, 6, 6, 6, 6, 5, 3],
    19: [6, 6, 6, 6, 6, 6, 6, 6, 6, 4],
    20: [6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  },
  // Cleric - PHB Table 3-6
  Cleric: {
    1: [3, 1],
    2: [4, 2],
    3: [4, 2, 1],
    4: [5, 3, 2],
    5: [5, 3, 2, 1],
    6: [5, 3, 3, 2],
    7: [6, 4, 3, 2, 1],
    8: [6, 4, 3, 3, 2],
    9: [6, 4, 4, 3, 2, 1],
    10: [6, 4, 4, 3, 3, 2],
    11: [6, 5, 4, 4, 3, 2, 1],
    12: [6, 5, 4, 4, 3, 3, 2],
    13: [6, 5, 5, 4, 4, 3, 2, 1],
    14: [6, 5, 5, 4, 4, 3, 3, 2],
    15: [6, 5, 5, 5, 4, 4, 3, 2, 1],
    16: [6, 5, 5, 5, 4, 4, 3, 3, 2],
    17: [6, 5, 5, 5, 5, 4, 4, 3, 2, 1],
    18: [6, 5, 5, 5, 5, 4, 4, 3, 3, 2],
    19: [6, 5, 5, 5, 5, 5, 4, 4, 3, 3],
    20: [6, 5, 5, 5, 5, 5, 4, 4, 4, 4],
  },
  // Druid - PHB Table 3-8
  Druid: {
    1: [3, 1],
    2: [4, 2],
    3: [4, 2, 1],
    4: [5, 3, 2],
    5: [5, 3, 2, 1],
    6: [5, 3, 3, 2],
    7: [6, 4, 3, 2, 1],
    8: [6, 4, 3, 3, 2],
    9: [6, 4, 4, 3, 2, 1],
    10: [6, 4, 4, 3, 3, 2],
    11: [6, 5, 4, 4, 3, 2, 1],
    12: [6, 5, 4, 4, 3, 3, 2],
    13: [6, 5, 5, 4, 4, 3, 2, 1],
    14: [6, 5, 5, 4, 4, 3, 3, 2],
    15: [6, 5, 5, 5, 4, 4, 3, 2, 1],
    16: [6, 5, 5, 5, 4, 4, 3, 3, 2],
    17: [6, 5, 5, 5, 5, 4, 4, 3, 2, 1],
    18: [6, 5, 5, 5, 5, 4, 4, 3, 3, 2],
    19: [6, 5, 5, 5, 5, 5, 4, 4, 3, 3],
    20: [6, 5, 5, 5, 5, 5, 4, 4, 4, 4],
  },
  // Bard - PHB Table 3-4
  Bard: {
    1: [2],
    2: [3, 0],
    3: [3, 1],
    4: [3, 2, 0],
    5: [3, 3, 1],
    6: [3, 3, 2],
    7: [3, 3, 2, 0],
    8: [3, 3, 3, 1],
    9: [3, 3, 3, 2],
    10: [3, 3, 3, 2, 0],
    11: [3, 3, 3, 3, 1],
    12: [3, 3, 3, 3, 2],
    13: [3, 3, 3, 3, 2, 0],
    14: [4, 3, 3, 3, 3, 1],
    15: [4, 4, 3, 3, 3, 2],
    16: [4, 4, 4, 3, 3, 2, 0],
    17: [4, 4, 4, 4, 3, 3, 1],
    18: [4, 4, 4, 4, 4, 3, 2],
    19: [4, 4, 4, 4, 4, 4, 3],
    20: [4, 4, 4, 4, 4, 4, 4],
  },
  // Paladin - PHB Table 3-12 (starts casting at 4)
  Paladin: {
    1: [], 2: [], 3: [],
    4: [0],
    5: [0],
    6: [1],
    7: [1],
    8: [1, 0],
    9: [1, 0],
    10: [1, 1],
    11: [1, 1, 0],
    12: [1, 1, 1],
    13: [1, 1, 1],
    14: [2, 1, 1, 0],
    15: [2, 1, 1, 1],
    16: [2, 2, 1, 1],
    17: [2, 2, 2, 1],
    18: [3, 2, 2, 1],
    19: [3, 3, 3, 2],
    20: [3, 3, 3, 3],
  },
  // Ranger - PHB Table 3-13 (starts casting at 4)
  Ranger: {
    1: [], 2: [], 3: [],
    4: [0],
    5: [0],
    6: [1],
    7: [1],
    8: [1, 0],
    9: [1, 0],
    10: [1, 1],
    11: [1, 1, 0],
    12: [1, 1, 1],
    13: [1, 1, 1],
    14: [2, 1, 1, 0],
    15: [2, 1, 1, 1],
    16: [2, 2, 1, 1],
    17: [2, 2, 2, 1],
    18: [3, 2, 2, 1],
    19: [3, 3, 3, 2],
    20: [3, 3, 3, 3],
  },
};

/**
 * Build a fallback progression row from hardcoded data when SRD DB doesn't have it.
 */
function getFallbackProgression(className, level) {
  const table = FALLBACK_PROGRESSIONS[className];
  if (!table) return null;
  const clampedLevel = Math.min(20, Math.max(1, level));
  const row = table[clampedLevel];
  if (!row) return null;
  const result = { level: clampedLevel, name: className };
  for (let i = 0; i <= 9; i++) {
    result[`slots_${i}`] = i < row.length ? row[i] : null;
  }
  return result;
}

async function loadAndRenderSpells(el, charId, character) {
  const className = character.class || '';
  const level = parseInt(character.level) || parseClass(character.class).level || 0;
  const caster = getCasterInfo(className);
  if (!caster) return;

  // Ability score & mod
  const abilScore = parseInt(
    caster.abilKey === 'int_' ? character.int_ : character[caster.abilKey]
  ) || 10;
  const abilMod2 = Math.floor((abilScore - 10) / 2);

  // Label
  const abilLabel = el.querySelector('#cs-spell-ability-label');
  if (abilLabel) abilLabel.textContent = `${caster.ability} ${abilScore} (${abilMod2 >= 0 ? '+' : ''}${abilMod2})`;

  // Load class progression for slots
  let progRow = null;
  try {
    const progRes = await apiGetSrdClassProgression(caster.className);
    const rows = progRes.data || [];
    progRow = rows.find(r => parseInt(r.level) === level);
  } catch (e) { console.warn('Could not load class progression:', e); }

  // Fallback: hardcoded spell progressions for NPC/classes missing from SRD DB
  if (!progRow) {
    progRow = getFallbackProgression(caster.className, level);
  }

  // Calculate spell slots
  const slots = calculateSpellSlots(progRow, abilScore, caster);

  // Load character's spell data
  let knownSpells = [], preparedSpells = [], spellbook = [];
  try {
    if (caster.type === 'spontaneous') {
      knownSpells = await apiGetSpellsKnown(charId);
    } else {
      preparedSpells = await apiGetSpellsPrepared(charId);
      if (caster.useSpellbook) {
        spellbook = await apiGetSpellbook(charId);
      }
    }
  } catch (e) { console.warn('Could not load spells:', e); }

  // Render spell slots table
  renderSpellSlotsTable(el, slots, caster, preparedSpells, knownSpells);

  // Render spell list
  renderSpellList(el, caster, className, level, knownSpells, preparedSpells, spellbook, slots, charId, character);

  // Wire rest button
  const restBtn = el.querySelector('#cs-spell-rest-btn');
  if (restBtn) {
    restBtn.onclick = async () => {
      try {
        restBtn.textContent = '⏳ Resting...';
        restBtn.disabled = true;
        // Bulk reset all used flags
        await apiRestAllSpells(charId);
        // Reload
        await loadAndRenderSpells(el, charId, character);
        // Brief success flash
        restBtn.textContent = '✅ Rested!';
        setTimeout(() => {
          restBtn.textContent = '🛏️ Rest';
          restBtn.disabled = false;
        }, 1200);
      } catch (e) {
        console.error('Rest failed:', e);
        restBtn.textContent = '🛏️ Rest';
        restBtn.disabled = false;
      }
    };
  }
  // Wire clear all button (for prepared casters)
  const clearBtn = el.querySelector('#cs-spell-clear-btn');
  if (clearBtn) {
    if (caster.type !== 'prepared') {
      clearBtn.style.display = 'none'; // Only show for prepared casters
    }
    clearBtn.onclick = async () => {
      if (!confirm('Clear all prepared spells? You will need to re-prepare your spells.')) return;
      try {
        await apiClearSpellsPrepared(charId);
        await loadAndRenderSpells(el, charId, character);
      } catch (e) { console.error('Clear failed:', e); }
    };
  }

  // Wire search
  wireSpellSearch(el, caster, className, charId, character);

  // ── Metamagic Integration ──────────────────────────────
  try {
    const { getKnownMetamagicFeats, getValidMetamagicCombinations, applyMetamagicEffects } = await import('../engine/metamagic35e.js');
    const knownMeta = getKnownMetamagicFeats(character.feats || '');
    const metamagicContainer = el.querySelector('#cs-metamagic-known');

    if (knownMeta.length && metamagicContainer) {
      // Render known metamagic feats section
      metamagicContainer.innerHTML = `
        <div class="metamagic-known-section">
          <div class="metamagic-known-title">⚗️ Metamagic Feats</div>
          <div>${knownMeta.map(m =>
        `<span class="metamagic-feat-badge">${m.name}<span class="meta-slot">+${m.slotIncrease}</span></span>`
      ).join('')}</div>
        </div>
      `;

      // Show metamagic prepare buttons for prepared casters
      if (caster.type === 'prepared') {
        el.querySelectorAll('.metamagic-prepare-btn').forEach(btn => {
          btn.style.display = '';
        });

        // Wire all metamagic prepare buttons (spellbook and injected)
        el.querySelectorAll('.metamagic-prepare-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            openMetamagicModal(btn.dataset.spellName, parseInt(btn.dataset.spellLevel) || 0, slots, knownMeta, charId, className, el, character);
          });
        });
      }
    }
    // Store metamagic state on the element for search integration
    el._metamagicState = knownMeta.length ? { knownMeta, slots } : null;
  } catch (e) { console.warn('Metamagic integration skipped:', e); }

  // ── Domain Integration (Clerics) ──────────────────────────
  const isCleric = className.toLowerCase().includes('cleric');
  if (isCleric) {
    try {
      const { getAllDomainNames, parseCharacterDomains, getDomainSpells, getSpontaneousType, getSpontaneousSpell } = await import('../engine/domains35e.js');

      const charDomains = character.domains || '';
      const parsedDomains = parseCharacterDomains(charDomains);
      const domainNamesEl = el.querySelector('#cs-domain-names');
      const domainContentEl = el.querySelector('#cs-domain-content');
      const domainSpellsEl = el.querySelector('#cs-domain-spells-list');

      if (domainNamesEl) {
        domainNamesEl.textContent = parsedDomains.length ? parsedDomains.map(d => d.name).join(', ') : 'None selected';
      }

      if (domainContentEl) {
        if (parsedDomains.length) {
          // Show domain powers
          domainContentEl.innerHTML = parsedDomains.map(d => `
            <div class="domain-power-card">
              <div class="domain-power-name">${d.name}</div>
              <div class="domain-power-desc">${d.grantedPower}</div>
            </div>
          `).join('');
        } else {
          // Show domain picker
          const allDomains = getAllDomainNames();
          domainContentEl.innerHTML = `
            <div class="domain-picker">
              <div class="domain-picker-help">Select 2 domains for this Cleric:</div>
              <div class="domain-picker-grid">
                ${allDomains.map(name => `<label class="domain-pick-option"><input type="checkbox" value="${name}" class="domain-checkbox"> ${name}</label>`).join('')}
              </div>
              <button class="btn-primary btn-sm" id="cs-domain-save-btn" disabled>Save Domains</button>
            </div>
          `;
          // Wire checkboxes — max 2
          const checkboxes = domainContentEl.querySelectorAll('.domain-checkbox');
          const saveBtn = domainContentEl.querySelector('#cs-domain-save-btn');
          checkboxes.forEach(cb => {
            cb.addEventListener('change', () => {
              const checked = domainContentEl.querySelectorAll('.domain-checkbox:checked');
              if (checked.length > 2) { cb.checked = false; return; }
              saveBtn.disabled = checked.length !== 2;
            });
          });
          saveBtn?.addEventListener('click', async () => {
            const checked = [...domainContentEl.querySelectorAll('.domain-checkbox:checked')].map(cb => cb.value);
            if (checked.length !== 2) return;
            try {
              character.domains = checked.join(', ');
              await apiSaveCharacter(getState().currentTownId || character.town_id, { id: character.id, domains: character.domains });
              await loadAndRenderSpells(el, charId, character);
            } catch (e) { console.error('Failed to save domains:', e); }
          });
        }
      }

      // Domain spell list
      if (domainSpellsEl && parsedDomains.length) {
        const domainSpells = getDomainSpells(charDomains);
        let dsHtml = '';
        for (let lvl = 1; lvl <= 9; lvl++) {
          const spells = domainSpells[lvl];
          if (!spells) continue;
          const slotInfo = slots.find(s => s.level === lvl);
          if (!slotInfo || !slotInfo.available) continue;
          dsHtml += `<div class="domain-spell-level"><span class="domain-spell-lvl">${lvl}</span>`;
          for (const { spell, domain } of spells) {
            const alreadyPrepared = preparedSpells.some(p => p.spell_name === spell && p.is_domain == 1 && parseInt(p.spell_level) === lvl);
            dsHtml += `<span class="domain-spell-entry${alreadyPrepared ? ' prepared' : ''}">
              <span class="domain-spell-name">${spell}</span>
              <span class="domain-spell-src">${domain}</span>
              ${!alreadyPrepared ? `<button class="domain-prepare-btn btn-sm" data-spell="${spell}" data-level="${lvl}" data-domain="${domain}" title="Prepare as domain spell">📌</button>` : '<span class="cs-spell-badge">✓</span>'}
            </span>`;
          }
          dsHtml += '</div>';
        }
        domainSpellsEl.innerHTML = dsHtml || '<div class="cs-muted" style="font-size:0.75rem;padding:0.3rem;">Domain spells shown at available spell levels.</div>';

        // Wire domain prepare buttons
        domainSpellsEl.querySelectorAll('.domain-prepare-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            try {
              await apiSaveSpellPrepared({
                character_id: charId,
                spell_name: btn.dataset.spell,
                spell_level: parseInt(btn.dataset.level),
                slot_level: parseInt(btn.dataset.level),
                class_name: className,
                is_domain: 1,
              });
              await loadAndRenderSpells(el, charId, character);
            } catch (e) { console.error('Domain prepare failed:', e); }
          });
        });
      }

      // Spontaneous casting section (Cure/Inflict)
      const spontEl = el.querySelector('#cs-spontaneous-content');
      const spontTitleEl = el.querySelector('#cs-spontaneous-title');
      if (spontEl) {
        const spontType = getSpontaneousType(character.alignment || '');
        const typeLabel = spontType === 'inflict' ? 'Inflict' : 'Cure';
        if (spontTitleEl) spontTitleEl.textContent = `🔄 Spontaneous ${typeLabel} Casting`;

        let spontHtml = `<div class="spontaneous-help">Sacrifice any prepared spell to cast a ${typeLabel} spell of the same level.</div>`;
        spontHtml += '<div class="spontaneous-list">';
        for (let lvl = 0; lvl <= 9; lvl++) {
          const slotInfo = slots.find(s => s.level === lvl);
          if (!slotInfo || !slotInfo.available) continue;
          const spellName = getSpontaneousSpell(lvl, spontType);
          if (!spellName) continue;
          spontHtml += `<div class="spontaneous-spell"><span class="spontaneous-lvl">${lvl}</span><span class="spontaneous-name">${spellName}</span></div>`;
        }
        spontHtml += '</div>';
        spontEl.innerHTML = spontHtml;
      }
    } catch (e) { console.warn('Domain integration skipped:', e); }
  }

  // ── Metamagic for non-spellbook prepared casters (Cleric, Druid, etc.) ──
  // Inject ⚗️ buttons next to prepare buttons in the prepared spells list
  if (caster.type === 'prepared' && !caster.useSpellbook && el._metamagicState) {
    const { knownMeta: knownMeta2, slots: metaSlots } = el._metamagicState;
    const spellList = el.querySelector('#cs-spell-list');
    if (spellList) {
      spellList.querySelectorAll('.cs-spell-prepare-btn').forEach(btn => {
        // Don't duplicate if already has one
        if (btn.parentElement?.querySelector('.metamagic-prepare-btn')) return;
        const metaBtn = document.createElement('button');
        metaBtn.className = 'metamagic-prepare-btn metamagic-btn';
        metaBtn.dataset.spellName = btn.dataset.spellName;
        metaBtn.dataset.spellLevel = btn.dataset.spellLevel;
        metaBtn.title = 'Prepare with Metamagic';
        metaBtn.textContent = '⚗️';
        metaBtn.addEventListener('click', () => {
          openMetamagicModal(btn.dataset.spellName, parseInt(btn.dataset.spellLevel) || 0, metaSlots, knownMeta2, charId, className, el, character);
        });
        btn.parentElement?.appendChild(metaBtn);
      });
    }
  }

  // Load SRD data for spell tooltips on the spell list
  try {
    const allCharSpells = [...knownSpells, ...preparedSpells, ...spellbook];
    const uniqueNames = [...new Set(allCharSpells.map(s => s.spell_name))];
    if (uniqueNames.length) {
      // Fetch SRD data for each spell name (batch via search)
      const srdCache = {};
      for (const name of uniqueNames) {
        if (srdCache[name]) continue;
        try {
          const res = await apiGetSrdSpells(name);
          const match = (res.data || []).find(s => s.name === name);
          if (match) srdCache[name] = match;
        } catch (_) { }
      }
      // Apply tooltip data to spell name elements
      const spellContainer = el.querySelector('#cs-spell-list');
      if (spellContainer) {
        spellContainer.querySelectorAll('.cs-spell-name').forEach(nameEl => {
          const spName = nameEl.dataset.spellName;
          const srd = srdCache[spName];
          if (srd) {
            nameEl.dataset.spellSchool = srd.school || '';
            nameEl.dataset.spellCast = srd.casting_time || '';
            nameEl.dataset.spellRange = srd.spell_range || '';
            nameEl.dataset.spellDuration = srd.duration || '';
            nameEl.dataset.spellDesc = (srd.short_description || '').replace(/"/g, '&quot;');
          }
        });
        wireSpellTooltips(spellContainer);
      }
    }
  } catch (e) { console.warn('Could not load spell tooltips:', e); }
}

/* ═══════════════════════════════════════════════════════════
   METAMAGIC MODAL — Shared helper for all metamagic prepare flows
   ═══════════════════════════════════════════════════════════ */
async function openMetamagicModal(spellName, baseLevel, slots, knownMeta, charId, className, el, character) {
  const { getValidMetamagicCombinations, applyMetamagicEffects } = await import('../engine/metamagic35e.js');
  const maxSlot = slots.reduce((max, s) => (s.available && s.level > max) ? s.level : max, 0);
  const combos = getValidMetamagicCombinations(baseLevel, maxSlot, knownMeta);

  if (!combos.length) {
    const { showToast } = await import('../components/Toast.js');
    showToast('No valid metamagic combinations — spell level too high for available slots', 'warning');
    return;
  }

  const { showModal } = await import('../components/Modal.js');
  const { el: modal, close: closeModal } = showModal({
    title: `⚗️ Metamagic: ${spellName}`,
    width: 'narrow',
    content: `
      <div class="metamagic-modal-content">
        <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.75rem;">
          Base spell level: <strong>${baseLevel}</strong> — Choose a metamagic combination:
        </div>
        <div id="meta-combos">
          ${combos.map((c, i) => `
            <div class="metamagic-combo-card" data-idx="${i}">
              <div>
                <div class="metamagic-combo-feats">${c.feats.join(' + ')}</div>
                <div class="metamagic-combo-detail">${c.breakdown.join('; ')}</div>
              </div>
              <div class="metamagic-combo-slot">Slot ${c.effectiveLevel}</div>
            </div>
          `).join('')}
        </div>
        <div id="meta-effects-preview" class="metamagic-effects-preview" style="display:none;"></div>
        <div style="margin-top:0.75rem;display:flex;justify-content:flex-end;gap:0.4rem;">
          <button class="btn-secondary btn-sm" id="meta-cancel">Cancel</button>
          <button class="btn-primary btn-sm" id="meta-apply" disabled>Prepare with Metamagic</button>
        </div>
      </div>
    `,
  });

  let selectedCombo = null;
  modal.querySelectorAll('.metamagic-combo-card').forEach(card => {
    card.addEventListener('click', () => {
      modal.querySelectorAll('.metamagic-combo-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedCombo = combos[parseInt(card.dataset.idx)];
      modal.querySelector('#meta-apply').disabled = false;

      // Show effects preview
      const preview = modal.querySelector('#meta-effects-preview');
      const effects = applyMetamagicEffects('1d6', selectedCombo.feats);
      if (effects.notes.length) {
        preview.style.display = '';
        preview.innerHTML = `<strong>Effects:</strong> ${effects.notes.join(' | ')}`;
      } else {
        preview.style.display = 'none';
      }
    });
  });

  modal.querySelector('#meta-cancel')?.addEventListener('click', closeModal);
  modal.querySelector('#meta-apply')?.addEventListener('click', async () => {
    if (!selectedCombo) return;
    try {
      const btn = modal.querySelector('#meta-apply');
      if (btn) { btn.disabled = true; btn.textContent = '⏳ Preparing...'; }
      await apiSaveSpellPrepared({
        character_id: charId,
        spell_name: spellName,
        spell_level: baseLevel,
        slot_level: selectedCombo.effectiveLevel,
        class_name: className,
        metamagic: selectedCombo.feats.join(' + '),
      });
      closeModal();
      await loadAndRenderSpells(el, charId, character);
    } catch (e) {
      console.error('Metamagic prepare failed:', e);
      const btn = modal.querySelector('#meta-apply');
      if (btn) { btn.disabled = false; btn.textContent = 'Prepare with Metamagic'; }
    }
  });
}

function renderSpellSlotsTable(el, slots, caster, prepared, known) {
  const container = el.querySelector('#cs-spell-slots-table');
  if (!container) return;

  // Count used per level (separate domain vs regular)
  const usedPerLevel = {};
  const domainUsedPerLevel = {};
  const spellsToCount = caster.type === 'prepared' ? prepared : known;
  for (const sp of spellsToCount) {
    const lvl = parseInt(sp.slot_level ?? sp.spell_level) || 0;
    if (sp.used == 1) {
      if (sp.is_domain == 1) {
        domainUsedPerLevel[lvl] = (domainUsedPerLevel[lvl] || 0) + 1;
      } else {
        usedPerLevel[lvl] = (usedPerLevel[lvl] || 0) + 1;
      }
    }
  }

  const hasDomains = slots.some(s => s.domainSlot);
  let html = `<div class="cs-spell-header"><span>Lvl</span><span>Slots${hasDomains ? ' + <span class="domain-slot-label">D</span>' : ''}</span><span>DC</span></div>`;
  for (const s of slots) {
    if (!s.available && s.base === null) continue;
    const used = usedPerLevel[s.level] || 0;
    const remaining = Math.max(0, s.total - used);
    const rowClass = s.available ? (remaining === 0 && s.total > 0 ? 'cs-spell-depleted' : '') : 'cs-spell-unavail';
    // Build visual pips
    let pipsHtml = '';
    if (s.available && s.total > 0) {
      const pips = [];
      for (let i = 0; i < s.total; i++) {
        if (i < used) {
          pips.push('<span class="spell-pip spell-pip-used" title="Used"></span>');
        } else {
          pips.push('<span class="spell-pip spell-pip-filled" title="Available"></span>');
        }
      }
      // Domain slot pip (gold-colored)
      if (s.domainSlot) {
        const domainUsed = domainUsedPerLevel[s.level] || 0;
        if (domainUsed > 0) {
          pips.push('<span class="spell-pip spell-pip-domain-used" title="Domain (Used)">D</span>');
        } else {
          pips.push('<span class="spell-pip spell-pip-domain" title="Domain Slot">D</span>');
        }
      }
      const totalWithDomain = s.total + (s.domainSlot ? 1 : 0);
      const totalUsed = used + (domainUsedPerLevel[s.level] || 0);
      const totalRemaining = Math.max(0, totalWithDomain - totalUsed);
      pipsHtml = `<span class="spell-pip-row">${pips.join('')}</span><span class="spell-pip-count">${totalRemaining}/${totalWithDomain}</span>`;
    } else {
      pipsHtml = '<span class="spell-pip-none">—</span>';
    }
    html += `<div class="cs-spell-level-row ${rowClass}">
      <span class="cs-spell-lvl">${s.level}</span>
      <span class="cs-spell-pips">${pipsHtml}</span>
      <span class="cs-spell-dc">${s.available ? s.dc : '—'}</span>
    </div>`;
  }
  container.innerHTML = html;
}

function renderSpellList(el, caster, className, level, known, prepared, spellbook, slots, charId, character) {
  const container = el.querySelector('#cs-spell-list');
  const titleEl = el.querySelector('#cs-spell-list-title');
  if (!container) return;

  if (caster.type === 'spontaneous') {
    // Show spells known with limits
    if (titleEl) titleEl.textContent = '📜 Spells Known';
    const limits = getSpellsKnownLimits(caster.className, level);
    if (!known.length) {
      container.innerHTML = `<div class="cs-empty" style="padding:1rem;text-align:center;">No spells known yet. Use the search below to add spells.</div>`;
      return;
    }
    // Group by level
    const byLevel = {};
    for (const sp of known) {
      const lvl = parseInt(sp.spell_level) || 0;
      if (!byLevel[lvl]) byLevel[lvl] = [];
      byLevel[lvl].push(sp);
    }
    let html = '';
    for (let lvl = 0; lvl <= (caster.maxSpellLevel || 9); lvl++) {
      const spells = byLevel[lvl];
      if (!spells) continue;
      const limit = limits ? limits[lvl] : null;
      html += `<div class="cs-spell-group-header">Level ${lvl}${limit !== null ? ` (${spells.length}/${limit})` : ''}</div>`;
      for (const sp of spells) {
        html += `<div class="cs-spell-item">
          <span class="cs-spell-name" data-spell-name="${sp.spell_name}" title="Click for details">${sp.spell_name}</span>
          <button class="cs-spell-remove" data-spell-id="${sp.id}" data-spell-type="known" title="Remove">✕</button>
        </div>`;
      }
    }
    container.innerHTML = html;
  } else {
    // Prepared caster
    const isWiz = caster.useSpellbook;
    if (titleEl) titleEl.textContent = isWiz ? '📜 Spellbook → Prepared' : '📜 Prepared Spells';

    let html = '';

    // Show spellbook for wizard
    if (isWiz && spellbook.length) {
      html += `<div class="cs-spell-section-label">📖 Spellbook (${spellbook.length} spells)</div>`;
      const byLvl = {};
      for (const sp of spellbook) {
        const l = parseInt(sp.spell_level) || 0;
        if (!byLvl[l]) byLvl[l] = [];
        byLvl[l].push(sp);
      }
      for (const [lvl, spells] of Object.entries(byLvl).sort((a, b) => a[0] - b[0])) {
        html += `<div class="cs-spell-group-header">Level ${lvl}</div>`;
        for (const sp of spells) {
          const isPrepared = prepared.some(p => p.spell_name === sp.spell_name && parseInt(p.spell_level) === parseInt(sp.spell_level));
          html += `<div class="cs-spell-item ${isPrepared ? 'cs-spell-prepared' : ''}">
            <span class="cs-spell-name" data-spell-name="${sp.spell_name}">${sp.spell_name}</span>
            <div style="display:flex;gap:0.3rem;">
              ${!isPrepared ? `<button class="cs-spell-prepare-btn btn-sm" data-spell-name="${sp.spell_name}" data-spell-level="${sp.spell_level}" title="Prepare">📌</button><button class="metamagic-prepare-btn metamagic-btn" data-spell-name="${sp.spell_name}" data-spell-level="${sp.spell_level}" title="Prepare with Metamagic" style="display:none;">⚗️</button>` : '<span class="cs-spell-badge">Prepared</span>'}
              <button class="cs-spell-remove" data-spell-id="${sp.id}" data-spell-type="spellbook" title="Remove from spellbook">✕</button>
            </div>
          </div>`;
        }
      }
    }

    // Show prepared spells
    if (prepared.length) {
      html += `<div class="cs-spell-section-label" style="margin-top:0.75rem;">📌 Prepared Today (${prepared.length})</div>`;
      const byLvl = {};
      for (const sp of prepared) {
        const l = parseInt(sp.slot_level ?? sp.spell_level) || 0;
        if (!byLvl[l]) byLvl[l] = [];
        byLvl[l].push(sp);
      }
      for (const [lvl, spells] of Object.entries(byLvl).sort((a, b) => a[0] - b[0])) {
        html += `<div class="cs-spell-group-header">Level ${lvl}</div>`;
        for (const sp of spells) {
          const isUsed = sp.used == 1;
          const metaTag = sp.metamagic ? `<span class="metamagic-tag">${sp.metamagic}</span>` : '';
          html += `<div class="cs-spell-item cs-spell-castable ${isUsed ? 'cs-spell-used' : ''}${sp.metamagic ? ' cs-spell-metamagic' : ''}" data-cast-id="${sp.id}" data-used="${isUsed ? '1' : '0'}" title="Double-click to ${isUsed ? 'recover' : 'cast'}">
            <button class="cs-spell-cast-btn ${isUsed ? 'used' : ''}" data-spell-id="${sp.id}" data-used="${isUsed ? '1' : '0'}" title="${isUsed ? 'Mark unused' : 'Cast (mark used)'}">${isUsed ? '⬜' : '🔮'}</button>
            <span class="cs-spell-name" data-spell-name="${sp.spell_name}">${sp.spell_name}${sp.is_domain == 1 ? ' <em>(D)</em>' : ''}${metaTag}</span>
            <button class="cs-spell-remove" data-spell-id="${sp.id}" data-spell-type="prepared" title="Unprepare">✕</button>
          </div>`;
        }
      }
    } else if (!isWiz || !spellbook.length) {
      html += `<div class="cs-empty" style="padding:1rem;text-align:center;">No spells prepared. Use the search below to add spells.</div>`;
    }

    container.innerHTML = html;

    // Wire prepare buttons (wizard spellbook → prepared)
    container.querySelectorAll('.cs-spell-prepare-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await apiSaveSpellPrepared({
            character_id: charId,
            spell_name: btn.dataset.spellName,
            spell_level: parseInt(btn.dataset.spellLevel) || 0,
            slot_level: parseInt(btn.dataset.spellLevel) || 0,
            class_name: className,
          });
          await loadAndRenderSpells(el, charId, character);
        } catch (e) { console.error('Prepare failed:', e); }
      });
    });

    // Wire cast buttons
    container.querySelectorAll('.cs-spell-cast-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          const isUsed = btn.dataset.used === '1';
          await apiMarkSpellUsed(parseInt(btn.dataset.spellId), !isUsed);
          await loadAndRenderSpells(el, charId, character);
        } catch (e) { console.error('Cast toggle failed:', e); }
      });
    });

    // Wire double-click to cast/uncast on spell items
    container.querySelectorAll('.cs-spell-castable').forEach(item => {
      item.addEventListener('dblclick', async (e) => {
        // Don't fire if they double-clicked a button
        if (e.target.closest('button')) return;
        const spellId = parseInt(item.dataset.castId);
        const isUsed = item.dataset.used === '1';
        try {
          await apiMarkSpellUsed(spellId, !isUsed);
          await loadAndRenderSpells(el, charId, character);
        } catch (e) { console.error('Cast toggle failed:', e); }
      });
    });
  }

  // Wire remove buttons (common to all types)
  container.querySelectorAll('.cs-spell-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      const type = btn.dataset.spellType;
      const id = parseInt(btn.dataset.spellId);
      try {
        if (type === 'known') await apiDeleteSpellKnown(id);
        else if (type === 'prepared') await apiDeleteSpellPrepared(id);
        else if (type === 'spellbook') await apiDeleteSpellbookEntry(id);
        await loadAndRenderSpells(el, charId, character);
      } catch (e) { console.error('Delete failed:', e); }
    });
  });
}

/* ── Spell Tooltip ──────────────────────────────────────── */
let _spellTooltipEl = null;
function getSpellTooltip() {
  if (!_spellTooltipEl) {
    _spellTooltipEl = document.createElement('div');
    _spellTooltipEl.className = 'cs-spell-tooltip';
    document.body.appendChild(_spellTooltipEl);
  }
  return _spellTooltipEl;
}

function wireSpellTooltips(container) {
  container.querySelectorAll('.cs-spell-name, .cs-spell-search-name').forEach(el => {
    el.addEventListener('mouseenter', (e) => {
      const tip = getSpellTooltip();
      const desc = el.dataset.spellDesc || '';
      const school = el.dataset.spellSchool || '';
      const castTime = el.dataset.spellCast || '';
      const range = el.dataset.spellRange || '';
      const duration = el.dataset.spellDuration || '';
      const name = el.dataset.spellName || el.textContent;
      let html = `<strong>${name}</strong>`;
      if (school) html += `<br><em>${school}</em>`;
      const details = [castTime && `⏱ ${castTime}`, range && `📏 ${range}`, duration && `⏳ ${duration}`].filter(Boolean);
      if (details.length) html += `<br><span class="cs-spell-tip-details">${details.join(' · ')}</span>`;
      if (desc) html += `<br><span class="cs-spell-tip-desc">${desc.length > 250 ? desc.substring(0, 250) + '…' : desc}</span>`;
      else html += `<br><span class="cs-spell-tip-desc"><em>No description available</em></span>`;
      tip.innerHTML = html;
      tip.style.display = 'block';
      const rect = el.getBoundingClientRect();
      tip.style.left = Math.min(rect.left, window.innerWidth - 320) + 'px';
      tip.style.top = (rect.bottom + 4) + 'px';
    });
    el.addEventListener('mouseleave', () => {
      getSpellTooltip().style.display = 'none';
    });
  });
}

function wireSpellSearch(el, caster, className, charId, character) {
  const searchInput = el.querySelector('#cs-spell-search');
  const searchBtn = el.querySelector('#cs-spell-search-btn');
  const levelFilter = el.querySelector('#cs-spell-level-filter');
  const classFilter = el.querySelector('#cs-spell-class-filter');
  const schoolFilter = el.querySelector('#cs-spell-school-filter');
  const resultsDiv = el.querySelector('#cs-spell-search-results');
  if (!searchBtn || !resultsDiv) return;

  // Pre-select the character's class in the dropdown
  if (classFilter) {
    const opts = classFilter.querySelectorAll('option');
    for (const opt of opts) {
      if (opt.value && caster.className.toLowerCase().includes(opt.value.toLowerCase())) {
        opt.selected = true;
        break;
      }
    }
  }

  const doSearch = async () => {
    const q = searchInput?.value?.trim() || '';
    const filterLvl = levelFilter?.value;
    const filterClass = classFilter?.value || caster.className;
    const filterSchool = schoolFilter?.value || '';

    // Need at least a search term OR a filter selected
    if (!q && !filterLvl && !filterSchool) {
      resultsDiv.innerHTML = '<div class="cs-muted" style="padding:0.5rem;font-size:0.8rem;">Enter a search term or select a filter to browse spells.</div>';
      return;
    }

    resultsDiv.innerHTML = '<div class="cs-loading" style="padding:0.5rem;">Searching...</div>';
    try {
      const res = await apiGetSrdSpells(q || '');
      const allSpells = res.data || [];

      // Filter to spells available for the selected class + school
      const matching = allSpells.filter(sp => {
        const lvl = spellLevelForClass(sp.level, filterClass);
        if (lvl === null) return false;
        if (filterLvl !== '' && filterLvl !== undefined && parseInt(filterLvl) !== lvl) return false;
        if (filterSchool && sp.school !== filterSchool) return false;
        return true;
      }).slice(0, 30);

      if (!matching.length) {
        resultsDiv.innerHTML = `<div class="cs-muted" style="padding:0.5rem;font-size:0.8rem;">No ${filterClass} spells found${q ? ` for "${q}"` : ''}${filterSchool ? ` (${filterSchool})` : ''}</div>`;
        return;
      }

      resultsDiv.innerHTML = matching.map(sp => {
        const lvl = spellLevelForClass(sp.level, filterClass);
        const desc = (sp.short_description || '').replace(/"/g, '&quot;');
        return `<div class="cs-spell-search-item">
          <div class="cs-spell-search-name" data-spell-name="${sp.name}" data-spell-school="${sp.school || ''}" data-spell-cast="${sp.casting_time || ''}" data-spell-range="${sp.spell_range || ''}" data-spell-duration="${sp.duration || ''}" data-spell-desc="${desc}">
            <strong>${sp.name}</strong>
            <span class="cs-spell-meta">${sp.school || ''} [${filterClass} ${lvl}]</span>
          </div>
          <button class="btn-sm btn-primary cs-spell-add-btn" data-spell-name="${sp.name}" data-spell-level="${lvl}" data-spell-id="${sp.id}">+ Add</button>
          ${(caster.type === 'prepared' && el._metamagicState) ? `<button class="btn-sm metamagic-btn cs-spell-meta-add-btn" data-spell-name="${sp.name}" data-spell-level="${lvl}" title="Add with Metamagic">⚗️</button>` : ''}
        </div>`;
      }).join('');

      // Wire tooltips on search results
      wireSpellTooltips(resultsDiv);

      // Wire add buttons
      resultsDiv.querySelectorAll('.cs-spell-add-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          btn.textContent = '...';
          try {
            const spellName = btn.dataset.spellName;
            const spellLevel = parseInt(btn.dataset.spellLevel) || 0;

            if (caster.type === 'spontaneous') {
              await apiSaveSpellKnown({
                character_id: charId,
                spell_name: spellName,
                spell_level: spellLevel,
                class_name: caster.className,
              });
            } else if (caster.useSpellbook) {
              await apiSaveSpellbookEntry({
                character_id: charId,
                spell_name: spellName,
                spell_level: spellLevel,
              });
            } else {
              await apiSaveSpellPrepared({
                character_id: charId,
                spell_name: spellName,
                spell_level: spellLevel,
                slot_level: spellLevel,
                class_name: caster.className,
              });
            }
            btn.textContent = '✓';
            await loadAndRenderSpells(el, charId, character);
          } catch (e) {
            btn.textContent = '✕';
            console.error('Add spell failed:', e);
          }
        });
      });

      // Wire metamagic add buttons in search results
      if (el._metamagicState) {
        const { knownMeta: searchMeta, slots: searchSlots } = el._metamagicState;
        resultsDiv.querySelectorAll('.cs-spell-meta-add-btn').forEach(metaBtn => {
          metaBtn.addEventListener('click', () => {
            openMetamagicModal(
              metaBtn.dataset.spellName,
              parseInt(metaBtn.dataset.spellLevel) || 0,
              searchSlots,
              searchMeta,
              charId,
              className,
              el,
              character
            );
          });
        });
      }
    } catch (e) {
      resultsDiv.innerHTML = `<div class="cs-muted" style="padding:0.5rem;color:var(--error);">Search failed: ${e.message}</div>`;
    }
  };

  searchBtn.addEventListener('click', doSearch);
  searchInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
  // Also trigger search when dropdowns change
  [levelFilter, classFilter, schoolFilter].forEach(sel => {
    if (sel) sel.addEventListener('change', doSearch);
  });
}

/* ── Family Tree ──────────────────────────────────────────── */
async function loadAndRenderFamilyTree(el, charId, character, options) {
  const { apiGetFamilyTree, apiSaveFamilyLink, apiDeleteFamilyLink } = await import('../api/social.js');
  const { getState } = await import('../stores/appState.js');

  const root = el.querySelector('#cs-family-tree-root');
  if (!root) return;

  async function renderTree() {
    root.innerHTML = '<div class="cs-loading">Loading family tree...</div>';

    try {
      const data = await apiGetFamilyTree(charId);
      const links = data.links || [];
      const members = {};
      (data.members || []).forEach(m => { members[m.id] = m; });

      // Ensure root character is in members
      if (!members[charId]) {
        members[charId] = { id: charId, name: character.name, race: character.race, class: character.class, level: character.level, gender: character.gender, age: character.age, status: character.status, portrait_url: character.portrait_url, alignment: character.alignment, role: character.role, title: character.title };
      }

      // Build adjacency from links
      // parent links: char1 is PARENT of char2
      const parentOf = []; // { parentId, childId, linkId }
      const spouseOf = []; // { id1, id2, linkId }
      const siblingOf = []; // { id1, id2, linkId }

      for (const link of links) {
        const role = link.family_role;
        if (role === 'parent') {
          parentOf.push({ parentId: link.char1_id, childId: link.char2_id, linkId: link.id });
        } else if (role === 'spouse') {
          spouseOf.push({ id1: link.char1_id, id2: link.char2_id, linkId: link.id });
        } else if (role === 'sibling') {
          siblingOf.push({ id1: link.char1_id, id2: link.char2_id, linkId: link.id });
        }
      }

      // Find parents of root
      const rootParents = parentOf.filter(p => p.childId == charId).map(p => ({ ...members[p.parentId], linkId: p.linkId })).filter(p => p.id);
      // Find grandparents (parents of each parent)
      const grandparentsMap = {};
      for (const parent of rootParents) {
        const gps = parentOf.filter(p => p.childId == parent.id).map(p => ({ ...members[p.parentId], linkId: p.linkId })).filter(gp => gp.id);
        grandparentsMap[parent.id] = gps;
      }

      // Find spouse of root
      const rootSpouse = spouseOf.filter(s => s.id1 == charId || s.id2 == charId).map(s => {
        const otherId = s.id1 == charId ? s.id2 : s.id1;
        return { ...members[otherId], linkId: s.linkId };
      }).filter(s => s.id)[0] || null;

      // Find siblings of root
      const rootSiblings = siblingOf.filter(s => s.id1 == charId || s.id2 == charId).map(s => {
        const otherId = s.id1 == charId ? s.id2 : s.id1;
        return { ...members[otherId], linkId: s.linkId };
      }).filter(s => s.id);

      // Find children of root
      const rootChildren = parentOf.filter(p => p.parentId == charId).map(p => ({ ...members[p.childId], linkId: p.linkId })).filter(ch => ch.id);

      // Find grandchildren (children of each child)
      const grandchildrenMap = {};
      for (const child of rootChildren) {
        const gcs = parentOf.filter(p => p.parentId == child.id).map(p => ({ ...members[p.childId], linkId: p.linkId })).filter(gc => gc.id);
        grandchildrenMap[child.id] = gcs;
      }

      const isEmpty = !rootParents.length && !rootSpouse && !rootSiblings.length && !rootChildren.length;

      // Person card builder
      function personCard(m, isRoot = false, linkId = null) {
        if (!m || !m.id) return '';
        const portrait = m.portrait_url
          ? `<img class="ft-portrait" src="${m.portrait_url}" alt="${m.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          : '';
        const fallbackIcon = m.gender === 'F' ? '👩' : m.gender === 'M' ? '👨' : '🧑';
        const classLvl = m.class ? (m.class.match(/\d/) ? m.class : `${m.class} ${m.level || ''}`.trim()) : '';
        const deceased = m.status === 'Deceased' ? ' ft-deceased' : '';
        const rootClass = isRoot ? ' ft-root' : '';
        const navigate = !isRoot ? `data-ft-nav="${m.id}"` : '';
        const deleteBtn = linkId && !isRoot ? `<button class="ft-delete-btn" data-ft-del="${linkId}" title="Remove link">✕</button>` : '';
        return `<div class="ft-person${rootClass}${deceased}" ${navigate}>
          ${deleteBtn}
          <div class="ft-portrait-wrap">
            ${portrait}
            <div class="ft-portrait-fallback" ${portrait ? 'style="display:none"' : ''}>${fallbackIcon}</div>
          </div>
          <div class="ft-name">${m.name}</div>
          <div class="ft-meta">${m.race || ''} ${classLvl}</div>
          ${m.age ? `<div class="ft-age">Age ${m.age}</div>` : ''}
          ${m.status === 'Deceased' ? '<div class="ft-status">☠ Deceased</div>' : ''}
        </div>`;
      }

      // Build HTML — Horizontal Ancestry layout (left → right)
      let html = '<div class="ft-container">';

      // ── Grandparents (leftmost) ──
      const hasGrandparents = Object.values(grandparentsMap).some(gps => gps.length > 0);
      if (hasGrandparents) {
        html += '<div class="ft-generation ft-gen-grandparents">';
        html += '<div class="ft-gen-label">Grandparents</div>';
        html += '<div class="ft-gen-row">';
        for (const parent of rootParents) {
          const gps = grandparentsMap[parent.id] || [];
          if (gps.length) {
            html += '<div class="ft-couple-group">';
            for (const gp of gps) {
              html += personCard(gp, false, gp.linkId);
            }
            html += '</div>';
          }
        }
        html += '</div></div>';
        html += '<div class="ft-connector ft-connector-horizontal"></div>';
      }

      // ── Parents ──
      if (rootParents.length) {
        html += '<div class="ft-generation ft-gen-parents">';
        html += '<div class="ft-gen-label">Parents</div>';
        html += '<div class="ft-gen-row">';
        for (const parent of rootParents) {
          html += personCard(parent, false, parent.linkId);
        }
        html += '</div></div>';
        html += '<div class="ft-connector ft-connector-horizontal"></div>';
      }

      // ── Siblings (stacked before root) ──
      if (rootSiblings.length) {
        html += '<div class="ft-generation">';
        html += '<div class="ft-gen-label ft-gen-label-sm">Siblings</div>';
        html += '<div class="ft-gen-row">';
        for (const sib of rootSiblings) {
          html += personCard(sib, false, sib.linkId);
        }
        html += '</div></div>';
        html += '<div class="ft-connector ft-connector-horizontal"></div>';
      }

      // ── Root + Spouse (center column) ──
      html += '<div class="ft-generation ft-gen-root">';
      html += '<div class="ft-gen-row ft-root-row">';
      html += personCard(members[charId], true);
      if (rootSpouse) {
        html += '<div class="ft-connector ft-connector-vertical ft-connector-heart">❤️</div>';
        html += personCard(rootSpouse, false, rootSpouse.linkId);
      }
      html += '</div></div>';

      // ── Children ──
      if (rootChildren.length) {
        html += '<div class="ft-connector ft-connector-horizontal"></div>';
        html += '<div class="ft-generation ft-gen-children">';
        html += '<div class="ft-gen-label">Children</div>';
        html += '<div class="ft-gen-row">';
        for (const child of rootChildren) {
          html += personCard(child, false, child.linkId);
        }
        html += '</div></div>';

        // ── Grandchildren ──
        const hasGrandchildren = Object.values(grandchildrenMap).some(gcs => gcs.length > 0);
        if (hasGrandchildren) {
          html += '<div class="ft-connector ft-connector-horizontal"></div>';
          html += '<div class="ft-generation ft-gen-grandchildren">';
          html += '<div class="ft-gen-label">Grandchildren</div>';
          html += '<div class="ft-gen-row">';
          for (const child of rootChildren) {
            const gcs = grandchildrenMap[child.id] || [];
            if (gcs.length) {
              html += '<div class="ft-couple-group">';
              for (const gc of gcs) {
                html += personCard(gc, false, gc.linkId);
              }
              html += '</div>';
            }
          }
          html += '</div></div>';
        }
      }

      html += '</div>';

      // ── Empty state ──
      if (isEmpty) {
        html = `<div class="ft-container">
          <div class="ft-empty">
            <div class="ft-empty-icon">🌳</div>
            <div class="ft-empty-title">No Family Connections Yet</div>
            <div class="ft-empty-text">Add parents, children, siblings, or a spouse to build ${character.name}'s family tree.</div>
          </div>
          <div class="ft-generation ft-gen-root">
            <div class="ft-gen-row ft-root-row">
              ${personCard(members[charId], true)}
            </div>
          </div>
        </div>`;
      }

      // ── Add Family Link button ──
      html += `<div class="ft-actions">
        <button class="btn-primary ft-add-btn" id="ft-add-link-btn">🌳 Add Family Member</button>
      </div>`;

      root.innerHTML = html;

      // ── Wire navigation (click person card → open their sheet) ──
      root.querySelectorAll('[data-ft-nav]').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
          if (e.target.closest('.ft-delete-btn')) return; // Don't navigate when deleting
          const navId = parseInt(card.dataset.ftNav);
          const navChar = members[navId];
          if (navChar) {
            // Navigate to that character's sheet (re-render the sheet with the target character)
            import('../api/characters.js').then(({ apiGetCharacters, normalizeCharacter }) => {
              apiGetCharacters(navChar.town_id).then(res => {
                const found = (res.characters || []).find(ch => ch.id == navId);
                if (found) {
                  const norm = normalizeCharacter(found);
                  // If different town, update state
                  const state = getState();
                  if (navChar.town_id != state.currentTownId) {
                    import('../stores/appState.js').then(({ setState }) => {
                      setState({ currentTownId: navChar.town_id });
                    });
                  }
                  if (options.onListRefresh) options.onListRefresh();
                  // Find the outer el (the sheet container) - reuse same container
                  const sheetEl = el.closest('.cs-sheet')?.parentElement || el;
                  renderCharacterSheet(sheetEl, norm, options);
                }
              });
            });
          }
        });
      });

      // ── Wire delete buttons ──
      root.querySelectorAll('[data-ft-del]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const linkId = parseInt(btn.dataset.ftDel);
          if (!confirm('Remove this family connection?')) return;
          try {
            await apiDeleteFamilyLink(linkId);
            await renderTree();
          } catch (err) { console.error('Delete family link failed:', err); }
        });
      });

      // ── Wire Add Family Link button ──
      root.querySelector('#ft-add-link-btn')?.addEventListener('click', async () => {
        const { showModal } = await import('../components/Modal.js');
        const { apiGetCharacters } = await import('../api/characters.js');

        // Get characters from ALL towns for this user
        const townId = getState().currentTownId;
        if (!townId) return;
        const res = await apiGetCharacters(townId);
        const others = (res.characters || []).filter(ch => ch.id != charId);

        const { el: m, close } = showModal({
          title: '🌳 Add Family Member', width: 'narrow',
          content: `<div class="modal-form">
            <label>Family Member</label>
            <select id="ft-target-char" class="form-select">
              ${others.map(ch => `<option value="${ch.id}">${ch.name} (${ch.race || ''} ${ch.class || ''})</option>`).join('')}
            </select>
            <label>Relationship</label>
            <select id="ft-link-type" class="form-select">
              <option value="parent-of">This person is ${character.name}'s Parent</option>
              <option value="child-of">This person is ${character.name}'s Child</option>
              <option value="sibling">This person is ${character.name}'s Sibling</option>
              <option value="spouse">This person is ${character.name}'s Spouse</option>
            </select>
            <button class="btn-primary" id="ft-save-btn" style="margin-top:0.75rem;width:100%">Add to Family Tree</button>
          </div>`
        });

        m.querySelector('#ft-save-btn')?.addEventListener('click', async () => {
          const targetId = parseInt(m.querySelector('#ft-target-char').value);
          const linkType = m.querySelector('#ft-link-type').value;

          let saveData = {};
          if (linkType === 'parent-of') {
            // target is parent of root: char1=target(parent), char2=root(child)
            saveData = { char1_id: targetId, char2_id: charId, family_role: 'parent' };
          } else if (linkType === 'child-of') {
            // target is child of root: char1=root(parent), char2=target(child)
            saveData = { char1_id: charId, char2_id: targetId, family_role: 'parent' };
          } else if (linkType === 'sibling') {
            saveData = { char1_id: charId, char2_id: targetId, family_role: 'sibling' };
          } else if (linkType === 'spouse') {
            saveData = { char1_id: charId, char2_id: targetId, family_role: 'spouse' };
          }

          try {
            await apiSaveFamilyLink(saveData);
            close();
            await renderTree();
          } catch (err) {
            console.error('Save family link failed:', err);
            alert('Failed to save: ' + err.message);
          }
        });
      });

    } catch (err) {
      root.innerHTML = `<div class="ft-container"><div class="ft-empty"><div class="ft-empty-icon">❌</div><div class="ft-empty-text">Failed to load family tree: ${err.message}</div></div></div>`;
      console.error('Family tree error:', err);
    }
  }

  await renderTree();
}

/* ── Tab Builder: Background ─────────────────────────────── */
function buildBackgroundTab(c) {
  const genderWord = c.gender === 'M' ? 'Male' : c.gender === 'F' ? 'Female' : (c.gender || '—');
  return `
  <div class="cs-bg-grid">
    <div class="cs-bg-left">
      <div class="cs-block">
        <div class="cs-block-title">Description</div>
        <div class="cs-desc-grid">
          <div class="cs-desc-item"><span class="cs-desc-label">Age</span><span>${c.age || '—'}</span></div>
          <div class="cs-desc-item"><span class="cs-desc-label">Gender</span><span>${genderWord}</span></div>
          <div class="cs-desc-item"><span class="cs-desc-label">Alignment</span><span>${c.alignment || '—'}</span></div>
          <div class="cs-desc-item"><span class="cs-desc-label">Role</span><span>${c.role || '—'}</span></div>
          <div class="cs-desc-item"><span class="cs-desc-label">Title</span><span>${c.title || '—'}</span></div>
          <div class="cs-desc-item"><span class="cs-desc-label">CR</span><span>${c.cr || '—'}</span></div>
        </div>
      </div>

      ${c.spouse && c.spouse !== 'None' ? `
      <div class="cs-block">
        <div class="cs-block-title">${c.spouseLabel || 'Spouse'}</div>
        <div class="cs-bg-text">${c.spouse}</div>
      </div>` : ''}

      <div class="cs-block">
        <div class="cs-block-title">Portrait</div>
        <div class="cs-portrait-section">
          ${c.portrait_url ? `<img class="cs-bg-portrait" src="${c.portrait_url}" alt="${c.name}">` : '<div class="cs-empty">No portrait</div>'}
          <div class="cs-portrait-actions">
            <label class="btn-secondary btn-sm"><span>📷 Upload</span><input type="file" id="cs-portrait-file" accept="image/*" style="display:none"></label>
          </div>
        </div>
      </div>
    </div>
    <div class="cs-bg-right">
      <div class="cs-block">
        <div class="cs-block-title">History & Backstory</div>
        <div class="cs-bg-text cs-history-text">${c.history ? c.history.replace(/\n/g, '<br>') : '<span class="cs-muted">No history recorded.</span>'}</div>
      </div>
      ${c.ai_data ? `
      <div class="cs-block">
        <div class="cs-block-title" style="cursor:pointer;" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">🤖 AI Character Data <span style="font-size:0.65rem;color:var(--text-muted);">(click to expand)</span></div>
        <pre class="cs-ai-data" style="display:none;font-size:0.65rem;background:rgba(0,0,0,0.3);padding:0.5rem;border-radius:4px;overflow-x:auto;white-space:pre-wrap;word-break:break-word;color:var(--text-muted);max-height:300px;overflow-y:auto;">${typeof c.ai_data === 'string' ? c.ai_data.replace(/</g, '&lt;') : JSON.stringify(c.ai_data, null, 2)}</pre>
      </div>` : ''}
    </div>
  </div>`;
}

/* ── Editable Sections ───────────────────────────────────── */
function wireEditableSections(el, c) {
  // Click on block titles to toggle edit mode — placeholder for now
  // Full inline editing will be added in a follow-up
}
