/**
 * Eon Weaver — Level-Up Wizard
 * Multi-step modal wizard for leveling up a character following D&D 3.5e rules.
 * Steps: 1) Choose Class → 2) Roll HP → 3) Skill Points → 4) Feats → 5) Spells → 6) Summary
 */
import { showModal } from './Modal.js';
import {
  getClassData, calcClassBAB, calcClassSaves, isFeatLevel, isBonusFeatLevel,
  getSpellsPerDay, getSpellsKnown, getClassFeatures, getSkillPoints, isClassSkill,
  bonusSpells
} from '../engine/classData35e.js';
import { PRESTIGE_CLASSES, checkPrestigePrereqs, getAllPrestigeClasses } from '../engine/prestigeData35e.js';
import { FEATS, checkFeatPrereqs, getEligibleFeats } from '../engine/featData35e.js';
import { roll } from '../engine/dice.js';
import { apiApplyLevelUp } from '../api/spellsEffects.js';
import { parseClass, checkMulticlassXPPenalty } from '../engine/rules35e.js';

/**
 * Open the Level-Up Wizard for a character.
 * @param {Object} character - Full character data from DB
 * @param {Function} onComplete - Called after successful level up with updated character data
 */
export async function openLevelUpWizard(character, onComplete) {
  // Parse current class info
  const classStr = character.class || '';
  const charLevel = parseInt(character.level) || 0;
  const parsed = parseMulticlass(classStr, charLevel);
  const totalLevel = parsed.reduce((s, c) => s + c.level, 0) || charLevel;
  const newTotalLevel = totalLevel + 1;

  // Determine if they get a feat, ability increase, etc.
  const getsFeat = isFeatLevel(newTotalLevel);
  const getsAbility = newTotalLevel % 4 === 0; // Every 4th character level

  // State for the wizard
  const state = {
    character,
    parsed,
    totalLevel,
    newTotalLevel,
    selectedClass: parsed.length === 1 ? parsed[0].name : '',
    newClassLevel: 0, // will be calculated
    hpRoll: 0,
    hpGained: 0,
    getsFeat,
    getsAbility,
    selectedFeat: '',
    selectedBonusFeat: '',
    abilityIncrease: '',
    skillAllocations: {},
    spellsChosen: [],
    currentStep: 1,
    totalSteps: 6,
  };

  const { el: container, close } = showModal({
    title: '🎯 Level Up — Level ' + newTotalLevel,
    width: 'wide',
    content: '<div id="levelup-wizard" class="levelup-wizard"></div>',
  });

  const wizardEl = container.querySelector('#levelup-wizard');
  renderStep(wizardEl, state, close, onComplete);
}

/* ── Step Rendering ────────────────────────────────────── */

function renderStep(container, state, close, onComplete) {
  switch (state.currentStep) {
    case 1: renderClassStep(container, state, close, onComplete); break;
    case 2: renderHPStep(container, state); break;
    case 3: renderSkillStep(container, state, close, onComplete); break;
    case 4: renderFeatStep(container, state, close, onComplete); break;
    case 5: renderSpellStep(container, state); break;
    case 6: renderSummaryStep(container, state, close, onComplete); break;
  }

  // Navigation
  const nav = document.createElement('div');
  nav.className = 'levelup-nav';
  nav.innerHTML = `
    <div class="levelup-progress">
      ${[1, 2, 3, 4, 5, 6].map(s => `<div class="levelup-step-dot${s === state.currentStep ? ' active' : ''}${s < state.currentStep ? ' done' : ''}">${s}</div>`).join('')}
    </div>
    <div class="levelup-nav-buttons">
      ${state.currentStep > 1 ? '<button class="btn-secondary btn-sm" id="luw-prev">← Back</button>' : ''}
      ${state.currentStep < state.totalSteps ? '<button class="btn-primary btn-sm" id="luw-next">Next →</button>' : ''}
      ${state.currentStep === state.totalSteps ? '<button class="btn-primary btn-sm" id="luw-apply" style="background:linear-gradient(135deg,#f5c518,#ff6b35);">⚡ Apply Level Up</button>' : ''}
    </div>
  `;
  container.appendChild(nav);

  nav.querySelector('#luw-prev')?.addEventListener('click', () => {
    state.currentStep--;
    container.innerHTML = '';
    renderStep(container, state, close, onComplete);
  });

  nav.querySelector('#luw-next')?.addEventListener('click', () => {
    if (validateStep(state)) {
      state.currentStep++;
      container.innerHTML = '';
      renderStep(container, state, close, onComplete);
    }
  });

  nav.querySelector('#luw-apply')?.addEventListener('click', async () => {
    const btn = nav.querySelector('#luw-apply');
    btn.disabled = true; btn.textContent = 'Applying...';
    try {
      await applyLevelUp(state);
      close();
      if (onComplete) onComplete(state);
    } catch (e) {
      alert('Level up failed: ' + e.message);
      btn.disabled = false; btn.textContent = '⚡ Apply Level Up';
    }
  });
}

/* ── Step 1: Choose Class ──────────────────────────────── */

function renderClassStep(container, state, close, onComplete) {
  const { parsed, character, newTotalLevel } = state;
  const currentClasses = parsed.map(c => c.name);

  // Build class options: existing classes + all PC classes + eligible prestige
  const allClasses = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Wizard'];
  const prestigeClasses = getAllPrestigeClasses();

  let html = `
    <div class="levelup-step">
      <h3>Step 1: Choose Class <span class="levelup-sublabel">(Character Level ${newTotalLevel})</span></h3>
      <div class="levelup-current-classes">
        <strong>Current:</strong> ${parsed.map(c => `${c.name} ${c.level}`).join(' / ') || 'None'}
      </div>

      <div class="levelup-class-section">
        <div class="levelup-section-title">Continue Existing Class</div>
        <div class="levelup-class-grid">
  `;

  for (const c of parsed) {
    const cls = getClassData(c.name);
    const selected = state.selectedClass === c.name;
    html += `
      <div class="levelup-class-card${selected ? ' selected' : ''}" data-class="${c.name}">
        <div class="class-card-name">${c.name} ${c.level} → ${c.level + 1}</div>
        <div class="class-card-info">HD: d${cls?.hitDie || '?'} | BAB: ${cls?.babType || '?'}</div>
      </div>
    `;
  }

  html += `</div></div>`;

  // Multiclass into new class
  const newClasses = allClasses.filter(c => !currentClasses.some(cc => cc.toLowerCase() === c.toLowerCase()));
  if (newClasses.length) {
    html += `
      <div class="levelup-class-section">
        <div class="levelup-section-title">Multiclass Into New Class</div>
        <div class="levelup-class-grid">
    `;
    for (const c of newClasses) {
      const cls = getClassData(c);
      const selected = state.selectedClass === c;
      html += `
        <div class="levelup-class-card new${selected ? ' selected' : ''}" data-class="${c}">
          <div class="class-card-name">${c} 1</div>
          <div class="class-card-info">HD: d${cls?.hitDie || '?'} | ${cls?.babType || '?'} BAB | ${cls?.skillsPerLevel || '?'} skill pts</div>
        </div>
      `;
    }
    html += `</div></div>`;
  }

  // Prestige classes
  html += `
    <div class="levelup-class-section">
      <div class="levelup-section-title">Prestige Classes</div>
      <div class="levelup-class-grid">
  `;
  for (const pName of prestigeClasses) {
    const prc = PRESTIGE_CLASSES[pName];
    const { eligible, missing } = checkPrestigePrereqs(pName, buildCharForPrereqs(state));
    const selected = state.selectedClass === pName;
    html += `
      <div class="levelup-class-card prestige${selected ? ' selected' : ''}${!eligible ? ' ineligible' : ''}" data-class="${pName}" ${!eligible ? 'title="Missing: ' + missing.join(', ') + '"' : ''}>
        <div class="class-card-name">${pName}${!eligible ? ' 🔒' : ''}</div>
        <div class="class-card-info">HD: d${prc.hitDie} | ${prc.babType} BAB</div>
        ${!eligible ? `<div class="class-card-missing">${missing.slice(0, 2).join(', ')}</div>` : ''}
      </div>
    `;
  }
  html += `</div></div></div>`;

  // XP penalty warning container
  html += `<div id="luw-xp-penalty" class="levelup-xp-penalty" style="display:none;"></div>`;

  container.innerHTML = html;

  // Helper to update XP penalty warning
  function updateXPPenalty() {
    const penaltyEl = container.querySelector('#luw-xp-penalty');
    if (!penaltyEl) return;
    // Build proposed class list after selecting this class
    const proposed = [...state.parsed.map(c => ({ name: c.name, level: c.level }))];
    const ex = proposed.find(c => c.name.toLowerCase() === state.selectedClass.toLowerCase());
    if (ex) ex.level++;
    else proposed.push({ name: state.selectedClass, level: 1 });

    if (proposed.length >= 2) {
      const penalty = checkMulticlassXPPenalty(proposed, state.character.race || '');
      if (penalty.hasPenalty) {
        penaltyEl.style.display = '';
        penaltyEl.innerHTML = `⚠️ <strong>-${penalty.penaltyPercent}% XP Penalty:</strong> ${penalty.details}`;
      } else {
        penaltyEl.style.display = 'none';
      }
    } else {
      penaltyEl.style.display = 'none';
    }
  }

  // Wire click handlers
  container.querySelectorAll('.levelup-class-card:not(.ineligible)').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.levelup-class-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.selectedClass = card.dataset.class;

      // Calculate new class level
      const existing = state.parsed.find(c => c.name.toLowerCase() === state.selectedClass.toLowerCase());
      state.newClassLevel = existing ? existing.level + 1 : 1;

      // Update XP penalty warning
      updateXPPenalty();
    });
  });

  // Set initial class level & penalty
  if (state.selectedClass) {
    const existing = state.parsed.find(c => c.name.toLowerCase() === state.selectedClass.toLowerCase());
    state.newClassLevel = existing ? existing.level + 1 : 1;
    updateXPPenalty();
  }
}

/* ── Step 2: Roll HP ───────────────────────────────────── */

function renderHPStep(container, state) {
  const cls = getClassData(state.selectedClass);
  const hitDie = cls?.hitDie || 8;
  const conMod = Math.floor(((parseInt(state.character.con) || 10) - 10) / 2);
  const isFirstLevel = state.newTotalLevel === 1;

  if (!state.hpRoll) {
    state.hpRoll = isFirstLevel ? hitDie : roll(`1d${hitDie}`).total;
    state.hpGained = Math.max(1, state.hpRoll + conMod);
  }

  container.innerHTML = `
    <div class="levelup-step">
      <h3>Step 2: Hit Points</h3>
      <div class="levelup-hp-display">
        <div class="hp-roll-result">
          <div class="hp-label">Hit Die</div>
          <div class="hp-die">d${hitDie}</div>
        </div>
        <div class="hp-roll-result">
          <div class="hp-label">Roll</div>
          <div class="hp-die" id="hp-roll-value">${state.hpRoll}</div>
        </div>
        <div class="hp-roll-result">
          <div class="hp-label">CON Mod</div>
          <div class="hp-die">${conMod >= 0 ? '+' : ''}${conMod}</div>
        </div>
        <div class="hp-roll-result total">
          <div class="hp-label">Total</div>
          <div class="hp-die" id="hp-total">${state.hpGained}</div>
        </div>
      </div>
      <div class="levelup-hp-actions">
        ${isFirstLevel ? '<div style="color:var(--accent);font-size:0.8rem;">🎯 First level: Maximum hit points!</div>' : `
          <button class="btn-secondary btn-sm" id="hp-reroll">🎲 Re-Roll</button>
          <span style="font-size:0.75rem;color:var(--text-secondary)">Current HP: ${state.character.hp}</span>
        `}
      </div>
      <div class="levelup-hp-result">
        <span>New Total HP:</span>
        <strong>${(parseInt(state.character.hp) || 0) + state.hpGained}</strong>
      </div>
    </div>
  `;

  container.querySelector('#hp-reroll')?.addEventListener('click', () => {
    state.hpRoll = Math.max(1, roll(`1d${hitDie}`).total);
    state.hpGained = Math.max(1, state.hpRoll + conMod);
    container.querySelector('#hp-roll-value').textContent = state.hpRoll;
    container.querySelector('#hp-total').textContent = state.hpGained;
    container.querySelector('.levelup-hp-result strong').textContent = (parseInt(state.character.hp) || 0) + state.hpGained;
  });
}

/* ── Step 3: Skill Points ──────────────────────────────── */

function renderSkillStep(container, state, close, onComplete) {
  const cls = getClassData(state.selectedClass);
  const intMod = Math.floor(((parseInt(state.character.int_) || 10) - 10) / 2);
  const isHuman = (state.character.race || '').toLowerCase() === 'human';
  const totalPoints = getSkillPoints(state.selectedClass, intMod, state.newClassLevel, isHuman);
  const maxRanks = state.newTotalLevel + 3;
  const maxCrossRanks = Math.floor(maxRanks / 2);

  // Get all skills from existing character data
  const existingSkills = parseSkillRanks(state.character.skills_feats || '');
  const classSkills = cls?.classSkills || [];

  // Initialize allocations
  if (!Object.keys(state.skillAllocations).length) {
    state.skillAllocations = {};
  }

  const spent = Object.values(state.skillAllocations).reduce((s, v) => s + v, 0);
  const remaining = totalPoints - spent;

  // Build skill list — combine existing + common skills
  const allSkills = new Set([
    ...Object.keys(existingSkills),
    'appraise', 'balance', 'bluff', 'climb', 'concentration', 'craft', 'decipher script',
    'diplomacy', 'disable device', 'disguise', 'escape artist', 'forgery',
    'gather information', 'handle animal', 'heal', 'hide', 'intimidate',
    'jump', 'knowledge (arcana)', 'knowledge (dungeoneering)', 'knowledge (geography)',
    'knowledge (history)', 'knowledge (local)', 'knowledge (nature)', 'knowledge (nobility)',
    'knowledge (religion)', 'knowledge (the planes)', 'listen', 'move silently',
    'open lock', 'perform', 'profession', 'ride', 'search', 'sense motive',
    'sleight of hand', 'speak language', 'spellcraft', 'spot', 'survival',
    'swim', 'tumble', 'use magic device', 'use rope'
  ]);

  let html = `
    <div class="levelup-step">
      <h3>Step 3: Skill Points</h3>
      <div class="levelup-skill-header">
        <span class="skill-points-remaining${remaining === 0 ? ' done' : ''}" id="skill-remaining">
          ${remaining} / ${totalPoints} points remaining
        </span>
        <span style="font-size:0.7rem;color:var(--text-secondary)">Max class rank: ${maxRanks} | Cross-class: ${maxCrossRanks}</span>
      </div>
      <div class="levelup-skill-list" id="skill-list">
  `;

  const sortedSkills = [...allSkills].sort();
  for (const skill of sortedSkills) {
    const isClass = isClassSkill(state.selectedClass, skill);
    const currentRanks = existingSkills[skill] || 0;
    const allocated = state.skillAllocations[skill] || 0;
    const maxForSkill = isClass ? maxRanks : maxCrossRanks;
    const cost = isClass ? 1 : 2;
    const canAdd = remaining >= cost && (currentRanks + allocated) < maxForSkill;

    html += `
      <div class="levelup-skill-row${isClass ? ' class-skill' : ''}">
        <span class="skill-name">${isClass ? '✦ ' : ''}${skill}</span>
        <span class="skill-ranks">${currentRanks}${allocated ? ` + ${allocated}` : ''}</span>
        <div class="skill-buttons">
          <button class="skill-btn minus" data-skill="${skill}" ${allocated <= 0 ? 'disabled' : ''}>−</button>
          <button class="skill-btn plus" data-skill="${skill}" data-cost="${cost}" ${!canAdd ? 'disabled' : ''}>+</button>
        </div>
      </div>
    `;
  }

  html += `</div></div>`;
  container.innerHTML = html;

  // Wire skill buttons
  container.querySelectorAll('.skill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const skill = btn.dataset.skill;
      const cost = parseInt(btn.dataset.cost) || 1;
      if (btn.classList.contains('plus')) {
        state.skillAllocations[skill] = (state.skillAllocations[skill] || 0) + 1;
      } else {
        state.skillAllocations[skill] = Math.max(0, (state.skillAllocations[skill] || 0) - 1);
        if (state.skillAllocations[skill] === 0) delete state.skillAllocations[skill];
      }
      // Re-render the full step (with nav)
      container.innerHTML = '';
      renderStep(container, state, close, onComplete);
    });
  });
}

/* ── Step 4: Feats ─────────────────────────────────────── */

function renderFeatStep(container, state, close, onComplete) {
  const { getsFeat, getsAbility, newTotalLevel, selectedClass, newClassLevel } = state;
  const getBonusFeat = isBonusFeatLevel(selectedClass, newClassLevel);
  const charForPrereqs = buildCharForPrereqs(state);

  let html = `<div class="levelup-step"><h3>Step 4: Feats & Abilities</h3>`;

  // Ability increase at 4, 8, 12, 16, 20
  if (getsAbility) {
    html += `
      <div class="levelup-feat-section">
        <div class="levelup-section-title">⬆️ Ability Score Increase (Level ${newTotalLevel})</div>
        <div class="levelup-ability-grid">
          ${['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map(ab => {
      const key = ab === 'INT' ? 'int_' : ab.toLowerCase();
      const val = parseInt(state.character[key]) || 10;
      const selected = state.abilityIncrease === ab;
      return `<div class="levelup-ability-card${selected ? ' selected' : ''}" data-ability="${ab}">
              <div class="ability-name">${ab}</div>
              <div class="ability-val">${val}${selected ? ' → ' + (val + 1) : ''}</div>
            </div>`;
    }).join('')}
        </div>
      </div>
    `;
  }

  // General feat
  if (getsFeat) {
    const eligible = getEligibleFeats(charForPrereqs);
    html += `
      <div class="levelup-feat-section">
        <div class="levelup-section-title">🎖️ General Feat (Level ${newTotalLevel})</div>
        <select class="form-select" id="luw-feat-select" style="max-width:400px">
          <option value="">— Choose a feat —</option>
          ${eligible.filter(f => f.eligible).map(f => `<option value="${f.name}"${state.selectedFeat === f.name ? ' selected' : ''}>${f.name}</option>`).join('')}
          <optgroup label="Not Yet Eligible">
            ${eligible.filter(f => !f.eligible).slice(0, 15).map(f => `<option value="" disabled>${f.name} (need: ${f.missing.join(', ')})</option>`).join('')}
          </optgroup>
        </select>
        ${state.selectedFeat ? `<div class="feat-benefit">${FEATS[state.selectedFeat]?.benefit || ''}</div>` : ''}
      </div>
    `;
  }

  // Bonus feat (Fighter, Monk, Wizard)
  if (getBonusFeat) {
    let bonusCategory = 'general';
    if (['Fighter'].includes(selectedClass)) bonusCategory = 'fighter';
    else if (['Wizard'].includes(selectedClass)) bonusCategory = 'wizard_bonus';
    else if (['Monk'].includes(selectedClass)) bonusCategory = 'fighter';

    const bonusEligible = getEligibleFeats(charForPrereqs, { category: bonusCategory });
    html += `
      <div class="levelup-feat-section">
        <div class="levelup-section-title">⚔️ ${selectedClass} Bonus Feat</div>
        <select class="form-select" id="luw-bonus-feat-select" style="max-width:400px">
          <option value="">— Choose a bonus feat —</option>
          ${bonusEligible.filter(f => f.eligible).map(f => `<option value="${f.name}"${state.selectedBonusFeat === f.name ? ' selected' : ''}>${f.name}</option>`).join('')}
        </select>
        ${state.selectedBonusFeat ? `<div class="feat-benefit">${FEATS[state.selectedBonusFeat]?.benefit || ''}</div>` : ''}
      </div>
    `;
  }

  // Class features gained at this level
  const features = getClassFeatures(selectedClass, newClassLevel);
  if (features.length) {
    html += `
      <div class="levelup-feat-section">
        <div class="levelup-section-title">🔓 Class Features Unlocked</div>
        <div class="levelup-features-list">
          ${features.map(f => `<div class="feature-item">✦ ${f}</div>`).join('')}
        </div>
      </div>
    `;
  }

  if (!getsFeat && !getsAbility && !getBonusFeat && !features.length) {
    html += '<div class="social-empty" style="margin:1rem 0"><div class="social-empty-icon">📋</div>No feats or abilities to select at this level</div>';
  }

  html += '</div>';
  container.innerHTML = html;

  // Wire ability selection
  container.querySelectorAll('.levelup-ability-card').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.levelup-ability-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.abilityIncrease = card.dataset.ability;
      const key = state.abilityIncrease === 'INT' ? 'int_' : state.abilityIncrease.toLowerCase();
      const val = parseInt(state.character[key]) || 10;
      card.querySelector('.ability-val').textContent = `${val} → ${val + 1}`;
    });
  });

  // Wire feat selects
  container.querySelector('#luw-feat-select')?.addEventListener('change', (e) => {
    state.selectedFeat = e.target.value;
    container.innerHTML = '';
    renderStep(container, state, close, onComplete);
  });
  container.querySelector('#luw-bonus-feat-select')?.addEventListener('change', (e) => {
    state.selectedBonusFeat = e.target.value;
    container.innerHTML = '';
    renderStep(container, state, close, onComplete);
  });
}

/* ── Step 5: Spells ────────────────────────────────────── */

function renderSpellStep(container, state) {
  const cls = getClassData(state.selectedClass);
  if (!cls?.castingType) {
    container.innerHTML = `
      <div class="levelup-step">
        <h3>Step 5: Spells</h3>
        <div class="social-empty"><div class="social-empty-icon">🔮</div>${state.selectedClass} is not a spellcasting class</div>
      </div>
    `;
    return;
  }

  const slotsAtLevel = getSpellsPerDay(state.selectedClass, state.newClassLevel);
  const knownAtLevel = getSpellsKnown(state.selectedClass, state.newClassLevel);
  const prevKnown = state.newClassLevel > 1 ? getSpellsKnown(state.selectedClass, state.newClassLevel - 1) : null;

  let html = `
    <div class="levelup-step">
      <h3>Step 5: Spells</h3>
      <div class="levelup-spell-info">
        <div class="spell-info-label">Casting Type</div>
        <div class="spell-info-value">${cls.castingType === 'spontaneous' ? '✨ Spontaneous' : '📖 Prepared'}</div>
        <div class="spell-info-label">Key Ability</div>
        <div class="spell-info-value">${(cls.castingAbility || '??').toUpperCase()}</div>
      </div>
  `;

  // Show spells per day for this level
  if (slotsAtLevel) {
    html += `
      <div class="levelup-section-title" style="margin-top:1rem;">📊 Spells Per Day at ${state.selectedClass} ${state.newClassLevel}</div>
      <div class="levelup-spell-slots">
        ${slotsAtLevel.map((count, lvl) => `
          <div class="spell-slot-box">
            <div class="slot-level">${lvl === 0 ? '0th' : lvl + ordinal(lvl)}</div>
            <div class="slot-count">${count}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // If spontaneous caster, show new spells to learn
  if (cls.castingType === 'spontaneous' && knownAtLevel && prevKnown) {
    const newSpellSlots = [];
    for (let i = 0; i < knownAtLevel.length; i++) {
      const prev = prevKnown?.[i] || 0;
      const curr = knownAtLevel[i];
      if (curr > prev) {
        for (let j = 0; j < (curr - prev); j++) {
          newSpellSlots.push(i);
        }
      }
    }

    if (newSpellSlots.length) {
      html += `
        <div class="levelup-section-title" style="margin-top:1rem;">✨ New Spells to Learn</div>
        <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.5rem;">
          You gain ${newSpellSlots.length} new spell(s). Choose from the SRD spell list on the character sheet after leveling up.
        </div>
        <div class="levelup-spell-slots">
          ${newSpellSlots.map(lvl => `
            <div class="spell-slot-box new">
              <div class="slot-level">${lvl === 0 ? '0th' : lvl + ordinal(lvl)}</div>
              <div class="slot-count">NEW</div>
            </div>
          `).join('')}
        </div>
      `;
    }
  }

  // If wizard, note free spells in spellbook
  if (cls.hasSpellbook) {
    html += `
      <div class="levelup-section-title" style="margin-top:1rem;">📖 Spellbook</div>
      <div style="font-size:0.75rem;color:var(--text-secondary);">
        As a Wizard, you automatically add <strong>2 free spells</strong> to your spellbook at each level.
        You may add more by copying from scrolls or other spellbooks (Spellcraft check, 100gp/spell level in materials).
        Choose your spells from the Spells tab on the character sheet after leveling up.
      </div>
    `;
  }

  html += '</div>';
  container.innerHTML = html;
}

/* ── Step 6: Summary ───────────────────────────────────── */

function renderSummaryStep(container, state, close, onComplete) {
  const cls = getClassData(state.selectedClass);
  const existing = state.parsed.find(c => c.name.toLowerCase() === state.selectedClass.toLowerCase());
  const newClassLevel = existing ? existing.level + 1 : 1;
  const newBab = calcTotalBAB(state);
  const newSaves = calcTotalSaves(state);
  const features = getClassFeatures(state.selectedClass, newClassLevel);
  const skillsAdded = Object.entries(state.skillAllocations).filter(([, v]) => v > 0);

  container.innerHTML = `
    <div class="levelup-step">
      <h3>Step 6: Summary</h3>
      <div class="levelup-summary">
        <div class="summary-section">
          <div class="summary-title">📋 Class</div>
          <div class="summary-value">${buildNewClassString(state)}</div>
        </div>
        <div class="summary-section">
          <div class="summary-title">❤️ Hit Points</div>
          <div class="summary-value">${state.character.hp} → ${(parseInt(state.character.hp) || 0) + state.hpGained} (+${state.hpGained})</div>
        </div>
        <div class="summary-section">
          <div class="summary-title">⚔️ BAB</div>
          <div class="summary-value">+${newBab}</div>
        </div>
        <div class="summary-section">
          <div class="summary-title">🛡️ Saves</div>
          <div class="summary-value">Fort +${newSaves.fort} / Ref +${newSaves.ref} / Will +${newSaves.will}</div>
        </div>
        ${state.abilityIncrease ? `
          <div class="summary-section">
            <div class="summary-title">⬆️ Ability</div>
            <div class="summary-value">${state.abilityIncrease} +1</div>
          </div>
        ` : ''}
        ${state.selectedFeat ? `
          <div class="summary-section">
            <div class="summary-title">🎖️ Feat</div>
            <div class="summary-value">${state.selectedFeat}</div>
          </div>
        ` : ''}
        ${state.selectedBonusFeat ? `
          <div class="summary-section">
            <div class="summary-title">⚔️ Bonus Feat</div>
            <div class="summary-value">${state.selectedBonusFeat}</div>
          </div>
        ` : ''}
        ${skillsAdded.length ? `
          <div class="summary-section">
            <div class="summary-title">📚 Skills</div>
            <div class="summary-value">${skillsAdded.map(([s, v]) => `${s} +${v}`).join(', ')}</div>
          </div>
        ` : ''}
        ${features.length ? `
          <div class="summary-section">
            <div class="summary-title">🔓 Features</div>
            <div class="summary-value">${features.join(', ')}</div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/* ── Apply Level Up ────────────────────────────────────── */

async function applyLevelUp(state) {
  const { character, selectedClass, hpGained, newTotalLevel, newClassLevel,
    selectedFeat, selectedBonusFeat, abilityIncrease, skillAllocations, spellsChosen } = state;

  const newClassStr = buildNewClassString(state);
  const newHp = (parseInt(character.hp) || 0) + hpGained;
  const newBab = calcTotalBAB(state);
  const newSaves = calcTotalSaves(state);

  // Build feats string
  let featsStr = character.feats || '';
  if (selectedFeat) featsStr += (featsStr ? ', ' : '') + selectedFeat;
  if (selectedBonusFeat) featsStr += (featsStr ? ', ' : '') + selectedBonusFeat;

  // Build skills string (update existing)
  const existingSkills = parseSkillRanks(character.skills_feats || '');
  for (const [skill, added] of Object.entries(skillAllocations)) {
    existingSkills[skill] = (existingSkills[skill] || 0) + added;
  }
  const skillsStr = Object.entries(existingSkills).filter(([, v]) => v > 0)
    .map(([s, v]) => `${s} +${v}`).join(', ');

  await apiApplyLevelUp({
    character_id: character.id,
    class_name: selectedClass,
    new_level: newTotalLevel,
    new_class_string: newClassStr,
    hp_gained: hpGained,
    new_hp: newHp,
    new_saves: `Fort +${newSaves.fort}, Ref +${newSaves.ref}, Will +${newSaves.will}`,
    new_bab: `+${newBab}`,
    feat_chosen: selectedFeat,
    bonus_feat: selectedBonusFeat,
    ability_increase: abilityIncrease,
    new_feats_string: featsStr,
    new_skills_string: skillsStr,
    skill_points_spent: Object.values(skillAllocations).reduce((s, v) => s + v, 0),
    new_spells_known: spellsChosen,
  });
}

/* ── Validation ────────────────────────────────────────── */

function validateStep(state) {
  switch (state.currentStep) {
    case 1:
      if (!state.selectedClass) { alert('Please select a class.'); return false; }
      return true;
    case 2: return true;
    case 3: return true; // Skills are optional
    case 4:
      if (state.getsAbility && !state.abilityIncrease) { alert('Please select an ability score to increase.'); return false; }
      return true;
    case 5: return true;
    default: return true;
  }
}

/* ── Helpers ───────────────────────────────────────────── */

function parseMulticlass(classStr, characterLevel = 0) {
  if (!classStr) return [];
  // Parse "Fighter 5 / Rogue 3" or "Fighter / Rogue" or just "Fighter"
  const parts = classStr.split('/').map(part => {
    const p = parseClass(part.trim());
    return { name: p.name, level: p.level };
  }).filter(c => c.name);

  // If no levels were parsed from the class string (new format), use character level
  const totalParsedLevel = parts.reduce((s, c) => s + c.level, 0);
  if (totalParsedLevel === 0 && characterLevel > 0) {
    if (parts.length === 1) {
      parts[0].level = characterLevel;
    } else {
      // Multiclass without embedded levels — distribute evenly as fallback
      parts[0].level = characterLevel;
    }
  }

  return parts;
}

function buildNewClassString(state) {
  const parsed = [...state.parsed];
  const existing = parsed.find(c => c.name.toLowerCase() === state.selectedClass.toLowerCase());
  if (existing) {
    existing.level++;
  } else {
    parsed.push({ name: state.selectedClass, level: 1 });
  }
  // Store as names only for the class column, total level goes in level column
  return parsed.map(c => c.name).join(' / ');
}

function calcTotalBAB(state) {
  const parsed = [...state.parsed];
  const existing = parsed.find(c => c.name.toLowerCase() === state.selectedClass.toLowerCase());
  if (existing) {
    existing.level++;
  } else {
    parsed.push({ name: state.selectedClass, level: 1 });
  }
  return parsed.reduce((total, c) => total + calcClassBAB(c.name, c.level), 0);
}

function calcTotalSaves(state) {
  const parsed = [...state.parsed];
  const existing = parsed.find(c => c.name.toLowerCase() === state.selectedClass.toLowerCase());
  if (existing) {
    existing.level++;
  } else {
    parsed.push({ name: state.selectedClass, level: 1 });
  }
  const result = { fort: 0, ref: 0, will: 0 };
  for (const c of parsed) {
    const saves = calcClassSaves(c.name, c.level);
    result.fort += saves.fort;
    result.ref += saves.ref;
    result.will += saves.will;
  }
  return result;
}

function buildCharForPrereqs(state) {
  const c = state.character;
  const feats = (c.feats || '').split(',').map(f => f.trim()).filter(Boolean);
  if (state.selectedFeat) feats.push(state.selectedFeat);
  const features = getClassFeatures(state.selectedClass, state.newClassLevel || 1);

  return {
    str: parseInt(c.str) || 10,
    dex: parseInt(c.dex) || 10,
    con: parseInt(c.con) || 10,
    int_: parseInt(c.int_) || 10,
    wis: parseInt(c.wis) || 10,
    cha: parseInt(c.cha) || 10,
    level: state.newTotalLevel,
    bab: calcTotalBAB(state),
    feats,
    classFeatures: features,
    className: state.selectedClass,
    classLevel: state.newClassLevel || 1,
    casterLevel: state.newClassLevel || 0, // simplified
    race: c.race || '',
    alignment: c.alignment || '',
    skillRanks: parseSkillRanks(c.skills_feats || ''),
  };
}

function parseSkillRanks(str) {
  const ranks = {};
  if (!str) return ranks;
  // Parse "Climb +5, Swim +3" format
  for (const entry of str.split(',')) {
    const m = entry.trim().match(/^(.+?)\s*\+(\d+)$/);
    if (m) ranks[m[1].trim().toLowerCase()] = parseInt(m[2]);
  }
  return ranks;
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export { parseMulticlass };
