/**
 * Eon Weaver — Town Setup Wizard
 * Modal wizard for town population, building generation, and spell assignment.
 * Yearly world climate is generated under Settings → World climate.
 */
import { showModal } from './Modal.js';
import { confirmAiCost } from './AiCostConfirm.js';
import { apiGetCharacters, normalizeCharacter } from '../api/characters.js';
import { apiGetTownMeta, apiSaveTownMeta } from '../api/towns.js';
import { apiApplySimulation, apiIntakeRoster, apiIntakeFlesh, apiIntakeCreature, apiGetCampaignRules, apiAutoAssignSpellsTown } from '../api/simulation.js';
import { apiGetCalendar } from '../api/settings.js';
import { apiGetBuildings, apiSaveBuilding } from '../api/buildings.js';
import {
  SHARED_SETTLEMENT_TYPE_OPTIONS,
  SHARED_BIOME_VALUES,
  SHARED_DIFFICULTY_OPTIONS,
  DEFAULT_DEMOGRAPHICS,
  parseDemographicsRows,
} from '../constants/sharedTownSettings.js';
import { MAX_INTAKE_ARRIVALS } from '../constants/intakeLimits.js';

/** Preserve explicit empty strings from town_meta (matches Town Settings modal selects). */
function pickTownMetaStr(meta, key, defaultVal) {
  if (!Object.prototype.hasOwnProperty.call(meta, key) || meta[key] == null) return defaultVal;
  return String(meta[key]);
}

function populateSharedTownSettingsForm(el, meta) {
  const settlementEl = el.querySelector('#sw-settlement-type');
  const biomeEl = el.querySelector('#sw-shared-biome');
  const difficultyEl = el.querySelector('#sw-shared-difficulty');
  if (!settlementEl || !biomeEl || !difficultyEl) return;

  settlementEl.value = pickTownMetaStr(meta, 'settlement_type', '');
  biomeEl.value = pickTownMetaStr(meta, 'biome', '');
  let dlv = Object.prototype.hasOwnProperty.call(meta, 'difficulty_level') ? meta.difficulty_level : null;
  if (dlv == null || dlv === '') dlv = 'struggling';
  difficultyEl.value = String(dlv);
}

function parseGenRules(meta) {
  try {
    return meta.gen_rules ? JSON.parse(meta.gen_rules) || {} : {};
  } catch {
    return {};
  }
}

function applyWizardGenRules(el, gen) {
  const g = gen || {};
  const setVal = (id, v) => {
    const n = el.querySelector(`#${id}`);
    if (n) n.value = v ?? '';
  };
  setVal('sw-ts-intake-level', g.intake_level ?? '');
  setVal('sw-ts-max-level', g.max_level ?? '');
  setVal('sw-ts-hp-rule', g.hp_rule ?? '');
  setVal('sw-ts-sources', g.sources ?? '');
  setVal('sw-ts-starting-equip', g.starting_equip ?? '');
  setVal('sw-ts-class-dist', g.class_dist ?? '');
  setVal('sw-ts-name-style', g.name_style ?? '');
  setVal('sw-ts-bg-complexity', g.bg_complexity ?? '');
  setVal('sw-ts-age-dist', g.age_dist ?? '');
}

function collectWizardGenRules(el) {
  const v = (id) => el.querySelector(`#${id}`)?.value ?? '';
  const m = {};
  if (v('sw-ts-intake-level') !== '') m.intake_level = v('sw-ts-intake-level');
  if (v('sw-ts-max-level')) m.max_level = v('sw-ts-max-level');
  if (v('sw-ts-hp-rule')) m.hp_rule = v('sw-ts-hp-rule');
  if (v('sw-ts-sources')) m.sources = v('sw-ts-sources');
  if (v('sw-ts-starting-equip')) m.starting_equip = v('sw-ts-starting-equip');
  if (v('sw-ts-class-dist')) m.class_dist = v('sw-ts-class-dist');
  if (v('sw-ts-name-style')) m.name_style = v('sw-ts-name-style');
  if (v('sw-ts-bg-complexity')) m.bg_complexity = v('sw-ts-bg-complexity');
  if (v('sw-ts-age-dist')) m.age_dist = v('sw-ts-age-dist');
  return m;
}

/** Wizard does not edit closed_borders — merge so Town Settings (simulation) value is preserved. */
function genRulesJsonForWizardSave(el, meta) {
  return JSON.stringify({ ...parseGenRules(meta), ...collectWizardGenRules(el) });
}

// ═══════════════════════════════════════════════════════════
// D&D BUILDING TEMPLATES — randomized per town setup
// ═══════════════════════════════════════════════════════════
const BUILDING_TEMPLATES = {
  // Core buildings — always present in any settlement
  core: [
    { name: 'Town Hall', type: 'civic', desc: 'The central administrative building where the town council meets and records are kept' },
    { name: 'Tavern', type: 'commercial', desc: 'A lively establishment serving food, drink, and local gossip', variants: ['The Rusty Flagon', 'The Sleeping Dragon', 'The Golden Goblet', 'The Wanderer\'s Rest', 'The Barrel & Blade', 'The Stag & Hound', 'The Copper Kettle', 'The Dancing Bear', 'The Crooked Crow', 'The Red Lantern', 'The Broken Anvil', 'The Merry Minstrel'] },
    { name: 'Well', type: 'infrastructure', desc: 'The town\'s primary water source' },
  ],

  // Common buildings — high chance (pick 60-80%)
  common: [
    { name: 'General Store', type: 'commercial', desc: 'Sells everyday goods, tools, rope, rations, and basic supplies' },
    { name: 'Blacksmith', type: 'commercial', desc: 'Forges weapons, horseshoes, nails, and metal goods', variants: ['Ironworks', 'The Forge', 'Hammer & Tongs'] },
    { name: 'Temple', type: 'religious', desc: 'A modest temple dedicated to the local deity, offering healing and blessings', variants: ['Shrine', 'Chapel', 'Sanctuary'] },
    { name: 'Stables', type: 'commercial', desc: 'Houses horses, mules, and pack animals for travelers and residents' },
    { name: 'Mill', type: 'infrastructure', desc: 'Grinds grain into flour for the settlement', variants: ['Windmill', 'Water Mill', 'Grain Mill'] },
    { name: 'Graveyard', type: 'civic', desc: 'Consecrated burial grounds tended by the local clergy' },
    { name: 'Marketplace', type: 'commercial', desc: 'An open-air trading area where merchants sell wares on market days' },
    { name: 'Palisade Wall', type: 'fortification', desc: 'A wooden defensive wall surrounding the settlement core' },
  ],

  // Uncommon buildings — medium chance (pick 30-50%)
  uncommon: [
    { name: 'Inn', type: 'commercial', desc: 'Provides lodging for travelers and adventurers', variants: ['The Wayfarer\'s Lodge', 'The Hearthstone Inn', 'The Pilgrim\'s Rest'] },
    { name: 'Bakery', type: 'commercial', desc: 'Bakes bread, pastries, and other goods for the town' },
    { name: 'Tannery', type: 'commercial', desc: 'Processes animal hides into leather, located downwind due to the smell' },
    { name: 'Guard Post', type: 'military', desc: 'A small fortified post where the town watch keeps vigil' },
    { name: 'Herbalist', type: 'commercial', desc: 'Sells poultices, remedies, dried herbs, and minor alchemical goods' },
    { name: 'Carpenter\'s Workshop', type: 'commercial', desc: 'Builds furniture, repairs structures, and shapes wood' },
    { name: 'Barracks', type: 'military', desc: 'Housing and training grounds for the town guard or militia' },
    { name: 'Warehouse', type: 'commercial', desc: 'Stores trade goods, grain reserves, and imported supplies' },
    { name: 'Cemetery', type: 'civic', desc: 'A formal burial ground with stone markers and mausoleums' },
    { name: 'Bathhouse', type: 'civic', desc: 'Public bathing facilities for hygiene and socializing' },
    { name: 'Potter\'s Workshop', type: 'commercial', desc: 'Creates clay vessels, bowls, tiles, and decorative ceramics' },
    { name: 'Weaver\'s Shop', type: 'commercial', desc: 'Produces cloth, tapestries, and garments from local wool and flax' },
  ],

  // Rare buildings — low chance (pick 10-25%)
  rare: [
    { name: 'Wizard\'s Tower', type: 'arcane', desc: 'Home to the local arcanist, filled with books and magical curiosities' },
    { name: 'Library', type: 'civic', desc: 'A repository of knowledge, scrolls, and historical records' },
    { name: 'Alchemist\'s Lab', type: 'arcane', desc: 'Produces potions, acids, and experimental concoctions' },
    { name: 'Arena', type: 'entertainment', desc: 'A fighting pit or amphitheater for combat exhibitions and town events' },
    { name: 'Brewery', type: 'commercial', desc: 'Produces ales, meads, and local spirits' },
    { name: 'Clocktower', type: 'civic', desc: 'A tall tower with a mechanical clock, visible across the settlement' },
    { name: 'Jail', type: 'civic', desc: 'Holds criminals and troublemakers awaiting judgment' },
    { name: 'Apothecary', type: 'commercial', desc: 'Sells medicines, poisons (discreetly), and rare reagents' },
    { name: 'Guild Hall', type: 'commercial', desc: 'Meeting and working headquarters for the local trade guild' },
    { name: 'Stone Wall', type: 'fortification', desc: 'Sturdy stone fortifications replacing the earlier wooden palisade' },
    { name: 'Watchtower', type: 'military', desc: 'A tall stone tower providing lookout over the surrounding terrain' },
    { name: 'Butcher\'s Shop', type: 'commercial', desc: 'Processes and sells meat from local livestock and game' },
  ],

  // Biome-specific additions
  biome: {
    'Coastal / Seaside': [
      { name: 'Docks', type: 'infrastructure', desc: 'Wooden piers for fishing boats and trade vessels' },
      { name: 'Lighthouse', type: 'infrastructure', desc: 'Guides ships safely into harbor at night' },
      { name: 'Fish Market', type: 'commercial', desc: 'Where the daily catch is sold fresh each morning' },
      { name: 'Shipwright', type: 'commercial', desc: 'Builds and repairs boats and small ships' },
    ],
    'Mountain / Highland': [
      { name: 'Mine Entrance', type: 'infrastructure', desc: 'Shaft leading into the mountain for ore extraction' },
      { name: 'Smelter', type: 'commercial', desc: 'Processes raw ore into usable metal ingots' },
      { name: 'Rope Bridge', type: 'infrastructure', desc: 'Spans a deep gorge connecting two parts of the settlement' },
    ],
    'Temperate Forest': [
      { name: 'Lumber Mill', type: 'infrastructure', desc: 'Processes felled timber into building materials' },
      { name: 'Hunting Lodge', type: 'commercial', desc: 'Base for hunters and trappers working the forest' },
      { name: 'Druid\'s Grove', type: 'religious', desc: 'A sacred clearing among ancient trees where druids gather' },
    ],
    'Desert (Sandy)': [
      { name: 'Oasis Well', type: 'infrastructure', desc: 'Deep well drawing precious water from underground aquifers' },
      { name: 'Caravanserai', type: 'commercial', desc: 'Walled rest stop for trading caravans crossing the desert' },
    ],
    'Desert (Rocky)': [
      { name: 'Cistern', type: 'infrastructure', desc: 'Underground water storage carved from living rock' },
      { name: 'Stone Quarry', type: 'infrastructure', desc: 'Where building stone is cut from the rocky landscape' },
    ],
    'Arctic Tundra': [
      { name: 'Longhouse', type: 'civic', desc: 'Large communal hall for gathering, feasting, and shelter from the cold' },
      { name: 'Smokehouse', type: 'commercial', desc: 'Preserves fish and meat for the long winters' },
      { name: 'Fur Trading Post', type: 'commercial', desc: 'Trades in pelts, furs, and cold-weather supplies' },
    ],
    'Swamp / Marsh': [
      { name: 'Stilted Walkway', type: 'infrastructure', desc: 'Raised wooden pathways connecting buildings above the waterline' },
      { name: 'Herbalist\'s Hut', type: 'commercial', desc: 'Specialized in rare swamp herbs and medicinal plants' },
    ],
    'Underground / Underdark': [
      { name: 'Mushroom Farm', type: 'infrastructure', desc: 'Cultivates edible fungi in dark, damp caverns' },
      { name: 'Phosphorescent Lamps', type: 'infrastructure', desc: 'Natural or magical lighting systems for the cavern settlement' },
    ],
    'Tropical Jungle': [
      { name: 'Canopy Platform', type: 'infrastructure', desc: 'Elevated platforms built among the giant tree canopy' },
      { name: 'Medicine Hut', type: 'commercial', desc: 'Processes jungle plants into medicines and antidotes' },
    ],
    'Grassland / Plains': [
      { name: 'Granary', type: 'infrastructure', desc: 'Stores harvested grain and seed for planting season' },
      { name: 'Cattle Pen', type: 'infrastructure', desc: 'Fenced area for livestock management and breeding' },
    ],
  },
};

// Shuffle array in place (Fisher-Yates)
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Pick random item from array
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generate a randomized building name using variants
function resolveBuildingName(template) {
  if (template.variants && Math.random() > 0.4) {
    return pickRandom(template.variants);
  }
  return template.name;
}

/**
 * Generate a building list based on town age, population, and biome.
 * @param {'new'|'young'|'established'|'ancient'} age
 * @param {number} population
 * @param {string} biome
 * @param {Array} existingBuildings
 * @returns {Array} buildings to create
 */
function generateBuildingList(age, population, biome, existingBuildings = []) {
  const existingNames = new Set(existingBuildings.map(b => b.name.toLowerCase()));
  const result = [];

  function addBuilding(template) {
    const name = resolveBuildingName(template);
    if (existingNames.has(name.toLowerCase())) return;
    existingNames.add(name.toLowerCase());
    result.push({ name, type: template.type || 'other', description: template.desc || '' });
  }

  // Core buildings always
  BUILDING_TEMPLATES.core.forEach(addBuilding);

  // Common buildings based on age
  const commonPool = shuffle([...BUILDING_TEMPLATES.common]);
  const commonPct = age === 'new' ? 0.3 : age === 'young' ? 0.5 : age === 'established' ? 0.75 : 0.9;
  const commonCount = Math.ceil(commonPool.length * commonPct);
  commonPool.slice(0, commonCount).forEach(addBuilding);

  // Uncommon based on age
  if (age !== 'new') {
    const uncommonPool = shuffle([...BUILDING_TEMPLATES.uncommon]);
    const uncommonPct = age === 'young' ? 0.2 : age === 'established' ? 0.4 : 0.6;
    const uncommonCount = Math.ceil(uncommonPool.length * uncommonPct);
    uncommonPool.slice(0, uncommonCount).forEach(addBuilding);
  }

  // Rare only for established/ancient
  if (age === 'established' || age === 'ancient') {
    const rarePool = shuffle([...BUILDING_TEMPLATES.rare]);
    const rarePct = age === 'established' ? 0.15 : 0.35;
    const rareCount = Math.max(1, Math.ceil(rarePool.length * rarePct));
    rarePool.slice(0, rareCount).forEach(addBuilding);
  }

  // Biome-specific
  const biomeBuildings = BUILDING_TEMPLATES.biome[biome];
  if (biomeBuildings) {
    const biomePool = shuffle([...biomeBuildings]);
    const biomePct = age === 'new' ? 0.3 : age === 'young' ? 0.5 : 0.8;
    const biomeCount = Math.max(1, Math.ceil(biomePool.length * biomePct));
    biomePool.slice(0, biomeCount).forEach(addBuilding);
  }

  // Add residential housing based on population
  const houseCount = Math.max(1, Math.floor(population / 4));
  const houseCap = age === 'new' ? 3 : age === 'young' ? 6 : age === 'established' ? 12 : 20;
  for (let i = 0; i < Math.min(houseCount, houseCap); i++) {
    const houseNum = i + 1;
    const houseName = `Residence #${houseNum}`;
    if (!existingNames.has(houseName.toLowerCase())) {
      existingNames.add(houseName.toLowerCase());
      result.push({ name: houseName, type: 'residential', description: 'A modest dwelling for town residents' });
    }
  }

  return result;
}




// ═══════════════════════════════════════════════════════════
// MAIN WIZARD EXPORT
// ═══════════════════════════════════════════════════════════

export function openTownSetupWizard(townId, onRefresh) {
  const settlementOptsHtml = SHARED_SETTLEMENT_TYPE_OPTIONS.map(
    o => `<option value="${o.value.replace(/"/g, '&quot;')}">${o.label}</option>`
  ).join('');
  const biomeOptsHtml = SHARED_BIOME_VALUES.map(
    b => `<option value="${String(b).replace(/"/g, '&quot;')}">${b || '— Not Set —'}</option>`
  ).join('');
  const diffOptsHtml = SHARED_DIFFICULTY_OPTIONS.map(
    d => `<option value="${d.value}">${d.label} — ${d.desc}</option>`
  ).join('');

  const { el, close } = showModal({
    title: '🏗️ Town Setup Wizard',
    width: 'wide',
    content: `
      <div class="setup-wizard">
        <div class="setup-tabs" id="setup-tabs">
          <button class="setup-tab active" data-tab="populate">👥 Populate</button>
          <button class="setup-tab" data-tab="demographics">📊 Demographics</button>
          <button class="setup-tab" data-tab="buildings">🏛️ Buildings</button>
          <button class="setup-tab" data-tab="settings">⚙️ Settings</button>
        </div>

        <!-- POPULATE TAB -->
        <div class="setup-panel active" data-panel="populate">
          <h3 style="margin-bottom:0.5rem;">👥 Add Population</h3>
          <p class="setup-desc">Configure who gets generated and how, then run AI intake. No simulation step — characters are created and added directly. These fields match <strong>Town Settings</strong> (⚙️) and stay saved for later edits.</p>

          <div id="sw-populate-loading" style="color:var(--text-muted);padding:0.75rem 0;">Loading population settings…</div>
          <div id="sw-populate-body" style="display:none;">

            <h3 class="settings-section-title" style="margin-top:0;">🎲 Generation Rules</h3>
            <p class="settings-desc">Per-town rules for new NPCs in this location (saved with demographics).</p>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem .75rem;margin-bottom:1rem;">
              <div class="form-group">
                <label for="sw-ts-intake-level">🎚️ Default Intake Level</label>
                <input type="number" id="sw-ts-intake-level" class="form-input" min="0" max="20" placeholder="— Default (0) —" style="width:100%">
                <small class="settings-hint">0 = AI picks appropriate level</small>
              </div>
              <div class="form-group">
                <label for="sw-ts-max-level">🏔️ Max NPC Level</label>
                <input type="number" id="sw-ts-max-level" class="form-input" min="1" max="20" placeholder="— Default (20) —" style="width:100%">
              </div>
              <div class="form-group">
                <label for="sw-ts-hp-rule">❤️ HP at Level Up</label>
                <select id="sw-ts-hp-rule" class="form-select">
                  <option value="">— Default —</option>
                  <option value="max">Max HP every level</option>
                  <option value="average">Average (rounded up)</option>
                  <option value="rolled">Rolled (random)</option>
                  <option value="max_first">Max at L1, roll after</option>
                </select>
              </div>
              <div class="form-group">
                <label for="sw-ts-sources">📚 Allowed Sources</label>
                <select id="sw-ts-sources" class="form-select">
                  <option value="">— Default —</option>
                  <option value="phb_only">PHB Only</option>
                  <option value="phb_xge">PHB + Xanathar's</option>
                  <option value="phb_xge_tce">PHB + XGE + Tasha's</option>
                  <option value="all_official">All Official Books</option>
                  <option value="homebrew">All + Homebrew Allowed</option>
                </select>
              </div>
              <div class="form-group">
                <label for="sw-ts-starting-equip">🪙 Starting Equipment</label>
                <select id="sw-ts-starting-equip" class="form-select">
                  <option value="">— Default —</option>
                  <option value="class_default">Class Default</option>
                  <option value="rolled_gold">Rolled Gold</option>
                  <option value="minimal">Minimal</option>
                  <option value="wealthy">Wealthy</option>
                </select>
              </div>
              <div class="form-group">
                <label for="sw-ts-class-dist">🧑‍🤝‍🧑 Class Distribution</label>
                <select id="sw-ts-class-dist" class="form-select">
                  <option value="">— Default —</option>
                  <option value="commoner">Mostly Commoners</option>
                  <option value="balanced">Balanced Mix</option>
                  <option value="adventurer">Adventurer-Heavy</option>
                  <option value="elite">Elite</option>
                </select>
              </div>
              <div class="form-group">
                <label for="sw-ts-name-style">🎭 NPC Name Style</label>
                <select id="sw-ts-name-style" class="form-select">
                  <option value="">— Default —</option>
                  <option value="high_fantasy">High Fantasy</option>
                  <option value="cultural">Cultural / Ethnic</option>
                  <option value="real_world">Real-World Inspired</option>
                  <option value="whimsical">Whimsical</option>
                </select>
              </div>
              <div class="form-group">
                <label for="sw-ts-bg-complexity">👤 Background Complexity</label>
                <select id="sw-ts-bg-complexity" class="form-select">
                  <option value="">— Default —</option>
                  <option value="simple">Simple</option>
                  <option value="standard">Standard</option>
                  <option value="detailed">Detailed</option>
                  <option value="epic">Epic Origins</option>
                </select>
              </div>
              <div class="form-group">
                <label for="sw-ts-age-dist">📅 Age Distribution</label>
                <select id="sw-ts-age-dist" class="form-select">
                  <option value="">— Default —</option>
                  <option value="young">Young Adults Only</option>
                  <option value="prime">Prime Age</option>
                  <option value="full_range">Full Range</option>
                  <option value="elder">Elder-Heavy</option>
                </select>
              </div>
            </div>

            <h3 style="margin:1.25rem 0 0.5rem;font-size:1rem;">Roll intake</h3>
            <div class="setup-row">
              <div class="form-group" style="flex:0 0 100px;">
                <label>Count</label>
                <input type="number" id="sw-pop-count" class="form-input" min="1" max="${MAX_INTAKE_ARRIVALS}" value="5" style="text-align:center;">
              </div>
              <div class="form-group" style="flex:1;">
                <label>Instructions <span style="color:var(--text-muted);font-weight:400;">(optional)</span></label>
                <input type="text" id="sw-pop-instructions" class="form-input"
                  placeholder="e.g. 'all dwarves', 'merchants only', 'a family of 4', 'goblin 5'...">
              </div>
            </div>

            <div class="setup-actions">
              <button type="button" class="btn-secondary" id="sw-pop-save-rules">💾 Save generation rules</button>
              <button class="btn-primary" id="sw-pop-generate">🎲 Generate Characters</button>
            </div>
            <div class="setup-status" id="sw-pop-status"></div>
          </div>
        </div>

        <!-- DEMOGRAPHICS TAB -->
        <div class="setup-panel" data-panel="demographics">
          <h3 style="margin-bottom:0.5rem;">📊 Population Demographics</h3>
          <p class="setup-desc">Target race percentages for new NPCs and simulations. Matches <strong>Town Settings</strong> (⚙️ → demographics). Totals should reach <strong>100%</strong> for predictable mixes.</p>

          <div id="sw-demographics-loading" style="color:var(--text-muted);padding:0.75rem 0;">Loading demographics…</div>
          <div id="sw-demographics-body" style="display:none;">
            <div class="demographics-grid" id="sw-demo-grid"></div>
            <div class="demo-footer" style="margin-top:0.5rem;">
              <button type="button" class="btn-secondary btn-sm" id="sw-demo-add-btn">+ Add Race</button>
              <button type="button" class="btn-secondary btn-sm" id="sw-demo-reset-btn">Reset to Default</button>
              <span class="demo-total" id="sw-demo-total">Total: <strong>0%</strong></span>
            </div>
            <div class="setup-actions" style="margin-top:1rem;">
              <button type="button" class="btn-primary" id="sw-demo-save-btn">💾 Save demographics</button>
            </div>
            <div class="setup-status" id="sw-demo-status"></div>
          </div>
        </div>

        <!-- BUILDINGS TAB -->
        <div class="setup-panel" data-panel="buildings">
          <h3 style="margin-bottom:0.5rem;">🏛️ Generate Buildings</h3>
          <p class="setup-desc">Auto-generate D&D-appropriate buildings based on the town's age and biome. Buildings are randomized so no two towns are identical.</p>

          <div class="setup-row">
            <div class="form-group">
              <label>Town Age</label>
              <select id="sw-bld-age" class="form-select" style="min-width:200px;">
                <option value="new">🌱 New Settlement (just founded)</option>
                <option value="young">🏘️ Young (5-20 years old)</option>
                <option value="established" selected>🏰 Established (20-100 years)</option>
                <option value="ancient">🗿 Ancient (100+ years)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Biome</label>
              <span id="sw-bld-biome" class="setup-info-value">Loading...</span>
            </div>
            <div class="form-group">
              <label>Existing Buildings</label>
              <span id="sw-bld-existing" class="setup-info-value">Loading...</span>
            </div>
          </div>

          <div class="setup-actions">
            <button class="btn-secondary" id="sw-bld-preview">👁️ Preview Buildings</button>
            <button class="btn-primary" id="sw-bld-create" disabled>🏗️ Create All Buildings</button>
          </div>
          <div id="sw-bld-preview-list" class="setup-preview-list"></div>
          <div class="setup-status" id="sw-bld-status"></div>
        </div>

        <!-- SETTINGS TAB -->
        <div class="setup-panel" data-panel="settings">
          <h3 style="margin-bottom:0.5rem;">⚙️ Town Environment</h3>
          <p class="setup-desc">Settlement type, biome, and XP difficulty — shared with <strong>Town Settings</strong> (⚙️). Generation rules are on <strong>Populate</strong>; race mix is on <strong>Demographics</strong>.</p>

          <div id="sw-settings-loading" style="color:var(--text-muted);padding:1rem;">Loading settings...</div>
          <div id="sw-settings-content" style="display:none;" class="town-settings-body">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div class="form-group">
                <label>🏗️ Settlement Type</label>
                <select id="sw-settlement-type" class="form-select">${settlementOptsHtml}</select>
              </div>
              <div class="form-group">
                <label>🌍 Town Biome / Terrain</label>
                <select id="sw-shared-biome" class="form-select">${biomeOptsHtml}</select>
              </div>
              <div class="form-group" style="grid-column:1 / -1;max-width:420px;">
                <label>⚔️ Town Difficulty Level</label>
                <select id="sw-shared-difficulty" class="form-select">${diffOptsHtml}</select>
              </div>
            </div>

            <div class="form-group" style="margin-top:1rem;">
              <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                <input type="checkbox" id="sw-auto-spells" checked style="width:18px;height:18px;accent-color:var(--accent);cursor:pointer;">
                ✨ Auto-Assign Spells After Populate
              </label>
              <p class="setup-desc" style="margin:0.25rem 0 0 1.75rem;font-size:0.75rem;">When enabled, SRD-optimal spells are automatically assigned to all casters after populating the town.</p>
            </div>

            <div class="setup-actions" style="margin-top:1rem;">
              <button type="button" class="btn-primary" id="sw-settings-save">💾 Save Settings</button>
            </div>
            <div class="setup-status" id="sw-settings-status"></div>
          </div>
        </div>
      </div>
    `,
  });

  // ── Tab switching ──
  el.querySelectorAll('.setup-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      el.querySelectorAll('.setup-tab').forEach(t => t.classList.remove('active'));
      el.querySelectorAll('.setup-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      el.querySelector(`.setup-panel[data-panel="${tab.dataset.tab}"]`)?.classList.add('active');
    });
  });

  /** Race row targets — kept in sync with `town_meta.demographics`. */
  let demoRows = [];

  function escDemoRace(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function renderWizardDemoGrid() {
    const grid = el.querySelector('#sw-demo-grid');
    const totalEl = el.querySelector('#sw-demo-total');
    if (!grid) return;

    const totalPct = () => demoRows.reduce((sum, r) => sum + (parseInt(r.pct, 10) || 0), 0);

    grid.innerHTML = demoRows.map((m, b) => `
      <div class="demo-row" data-index="${b}">
        <input type="text" class="form-input demo-race" value="${escDemoRace(m.race)}" placeholder="Race name">
        <div class="demo-pct-wrap">
          <input type="range" class="demo-slider" min="0" max="100" value="${m.pct}" data-index="${b}">
          <input type="number" class="form-input demo-pct" value="${m.pct}" min="0" max="100" data-index="${b}">
          <span class="demo-pct-sign">%</span>
        </div>
        <button type="button" class="btn-danger btn-sm demo-remove" data-index="${b}" title="Remove">&#10006;</button>
      </div>
    `).join('');

    const paintTotal = () => {
      const t = totalPct();
      if (totalEl) {
        totalEl.innerHTML = `Total: <strong style="color:${t === 100 ? 'var(--success)' : t > 100 ? 'var(--error)' : 'var(--warning)'}">${t}%</strong>`;
      }
    };
    paintTotal();

    grid.querySelectorAll('.demo-slider').forEach((slider) => {
      slider.addEventListener('input', (ev) => {
        const y = parseInt(ev.target.dataset.index, 10);
        demoRows[y].pct = parseInt(ev.target.value, 10);
        const pc = grid.querySelector(`.demo-pct[data-index="${y}"]`);
        if (pc) pc.value = ev.target.value;
        paintTotal();
      });
    });
    grid.querySelectorAll('.demo-pct').forEach((inp) => {
      inp.addEventListener('input', (ev) => {
        const y = parseInt(ev.target.dataset.index, 10);
        const f = Math.max(0, Math.min(100, parseInt(ev.target.value, 10) || 0));
        demoRows[y].pct = f;
        const sl = grid.querySelector(`.demo-slider[data-index="${y}"]`);
        if (sl) sl.value = f;
        paintTotal();
      });
    });
    grid.querySelectorAll('.demo-race').forEach((inp, idx) => {
      inp.addEventListener('input', (ev) => {
        demoRows[idx].race = ev.target.value;
      });
    });
    grid.querySelectorAll('.demo-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        const y = parseInt(btn.dataset.index, 10);
        demoRows.splice(y, 1);
        renderWizardDemoGrid();
      });
    });
  }

  el.querySelector('#sw-demo-add-btn')?.addEventListener('click', () => {
    demoRows.push({ race: '', pct: 0 });
    renderWizardDemoGrid();
  });
  el.querySelector('#sw-demo-reset-btn')?.addEventListener('click', () => {
    demoRows = JSON.parse(JSON.stringify(DEFAULT_DEMOGRAPHICS));
    renderWizardDemoGrid();
  });

  // ── Load context data ──
  let townMeta = {};
  let biome = '';
  let calendarData = null;
  let existingBuildings = [];

  function buildWizardDemoStr() {
    return demoRows
      .filter((w) => w.race && w.pct > 0)
      .map((w) => `${w.race.trim()} ${w.pct}%`)
      .join(', ');
  }

  async function persistPopulationRulesToServer() {
    const demoStr = buildWizardDemoStr();
    const genRulesJson = genRulesJsonForWizardSave(el, townMeta);
    await Promise.all([
      apiSaveTownMeta(townId, 'demographics', demoStr),
      apiSaveTownMeta(townId, 'gen_rules', genRulesJson),
    ]);
    townMeta = { ...townMeta, demographics: demoStr, gen_rules: genRulesJson };
  }

  (async () => {
    try {
      const [metaRes, calRes, bldRes] = await Promise.all([
        apiGetTownMeta(townId),
        apiGetCalendar().catch(() => null),
        apiGetBuildings(townId).catch(() => ({ buildings: [] })),
      ]);
      townMeta = metaRes.meta || {};
      biome = pickTownMetaStr(townMeta, 'biome', '');
      calendarData = calRes?.calendar || null;
      existingBuildings = bldRes.buildings || [];

      populateSharedTownSettingsForm(el, townMeta);
      applyWizardGenRules(el, parseGenRules(townMeta));
      demoRows = parseDemographicsRows(townMeta);
      renderWizardDemoGrid();

      const loadingEl = el.querySelector('#sw-settings-loading');
      const contentEl = el.querySelector('#sw-settings-content');
      const popLoad = el.querySelector('#sw-populate-loading');
      const popBody = el.querySelector('#sw-populate-body');
      const demoLoad = el.querySelector('#sw-demographics-loading');
      const demoBody = el.querySelector('#sw-demographics-body');
      if (loadingEl) loadingEl.style.display = 'none';
      if (contentEl) contentEl.style.display = '';
      if (popLoad) popLoad.style.display = 'none';
      if (popBody) popBody.style.display = '';
      if (demoLoad) demoLoad.style.display = 'none';
      if (demoBody) demoBody.style.display = '';

      const biomeLabel = biome === '' ? '(not set)' : biome;
      el.querySelector('#sw-bld-biome').textContent = biomeLabel;
      el.querySelector('#sw-bld-existing').textContent = `${existingBuildings.length} buildings`;
    } catch (err) {
      console.warn('[SetupWizard] Failed to load context:', err);
      const loadingEl = el.querySelector('#sw-settings-loading');
      if (loadingEl) {
        loadingEl.textContent = '❌ Failed to load town settings';
        loadingEl.style.display = '';
      }
      const contentEl = el.querySelector('#sw-settings-content');
      if (contentEl) contentEl.style.display = 'none';
      const popLoad = el.querySelector('#sw-populate-loading');
      const popBody = el.querySelector('#sw-populate-body');
      const demoLoad = el.querySelector('#sw-demographics-loading');
      const demoBody = el.querySelector('#sw-demographics-body');
      if (popLoad) {
        popLoad.textContent = '❌ Failed to load population settings';
        popLoad.style.display = '';
      }
      if (popBody) popBody.style.display = 'none';
      if (demoLoad) {
        demoLoad.textContent = '❌ Failed to load demographics';
        demoLoad.style.display = '';
      }
      if (demoBody) demoBody.style.display = 'none';
    }
  })();


  // ═══════════════════════════════════════════════════════
  // POPULATE TAB
  // ═══════════════════════════════════════════════════════

  // Standard humanoid races that go through AI generation, not SRD creature lookup
  const STANDARD_HUMANOID_REGEX = /^(human|elf|dwarf|halfling|gnome|half-elf|half-orc|tiefling|dragonborn|aasimar)$/i;
  // Creature/monster keyword regex for instruction-based detection
  const CREATURE_KEYWORD_REGEX = /\b(stirge|goblin|kobold|orc|skeleton|zombie|rat|wolf|spider|bat|snake|bear|ogre|troll|undead|beast|creature|monster|animal|vermin|aberration|ooze|elemental|fiend|fey|dragon|worg|hyena|dire|ghoul|wight|wraith|gnoll|lizardfolk|bugbear|hobgoblin|minotaur|harpy|imp|demon|devil|slime|ant|scorpion|centipede|crocodile|shark|owl|hawk|eagle|boar|lion|tiger|ape|horse|mule|donkey|cat|dog|badger|wolverine|weasel|raven|toad|lizard|squid|octopus|crab|wasp|beetle|moth|gryphon|griffon|basilisk|cockatrice|chimera|manticore|hydra|gargoyle|golem|treant|dryad|nymph|satyr|pegasus|unicorn|wyvern|drake|giant)\b/i;

  el.querySelector('#sw-pop-save-rules')?.addEventListener('click', async () => {
    const btn = el.querySelector('#sw-pop-save-rules');
    const statusEl = el.querySelector('#sw-pop-status');
    if (!btn || !statusEl) return;
    btn.disabled = true;
    try {
      await persistPopulationRulesToServer();
      statusEl.innerHTML = '<span style="color:var(--success)">✅ Generation rules saved (Town Settings ⚙️).</span>';
    } catch (err) {
      statusEl.innerHTML = `<span style="color:var(--error)">❌ ${err.message}</span>`;
    } finally {
      btn.disabled = false;
    }
  });

  el.querySelector('#sw-demo-save-btn')?.addEventListener('click', async () => {
    const btn = el.querySelector('#sw-demo-save-btn');
    const statusEl = el.querySelector('#sw-demo-status');
    if (!btn || !statusEl) return;
    btn.disabled = true;
    try {
      await persistPopulationRulesToServer();
      statusEl.innerHTML = '<span style="color:var(--success)">✅ Demographics saved (Town Settings ⚙️).</span>';
    } catch (err) {
      statusEl.innerHTML = `<span style="color:var(--error)">❌ ${err.message}</span>`;
    } finally {
      btn.disabled = false;
    }
  });

  el.querySelector('#sw-pop-generate').addEventListener('click', async () => {
    const count = Math.max(1, Math.min(MAX_INTAKE_ARRIVALS, parseInt(el.querySelector('#sw-pop-count').value) || 5));
    const instructions = el.querySelector('#sw-pop-instructions').value.trim();
    const btn = el.querySelector('#sw-pop-generate');
    const statusEl = el.querySelector('#sw-pop-status');

    btn.disabled = true;
    btn.textContent = '⏳ Generating...';

    try {
      await persistPopulationRulesToServer();

      // Get campaign rules for context
      let rules = '';
      try {
        const rulesRes = await apiGetCampaignRules();
        const parts = [];
        if (rulesRes.campaign_description) parts.push(rulesRes.campaign_description);
        if (rulesRes.rules_text) parts.push('House Rules: ' + rulesRes.rules_text);
        rules = parts.join('\n\n');
      } catch { /* no rules */ }

      // ── Check DEMOGRAPHICS for creature races ────────────────────
      // This mirrors the logic in TownView.js inline intake that detects
      // non-standard races in town demographics and routes them to SRD lookup
      const creatureMatch = instructions.match(CREATURE_KEYWORD_REGEX);
      let creatureDemos = [];   // Non-humanoid races from demographics
      let humanoidPct = 0;      // Total percentage of standard humanoid races

      try {
        const demoStr = townMeta.demographics || '';
        if (demoStr) {
          // Demographics can be JSON array or comma-separated string
          let demoEntries = [];
          try {
            const parsed = JSON.parse(demoStr);
            if (Array.isArray(parsed)) {
              demoEntries = parsed.map(d => `${d.race} ${d.pct}%`);
            } else {
              demoEntries = demoStr.split(',').map(s => s.trim());
            }
          } catch {
            demoEntries = demoStr.split(',').map(s => s.trim());
          }

          for (const entry of demoEntries) {
            const m = entry.match(/^(.+?)\s+(\d+)%?$/);
            if (m) {
              const raceName = m[1].trim();
              const pct = parseInt(m[2]);
              if (STANDARD_HUMANOID_REGEX.test(raceName)) {
                humanoidPct += pct;
              } else {
                // Anything not a standard humanoid gets treated as a creature
                creatureDemos.push({ name: raceName, pct });
              }
            }
          }
        }
      } catch (e) {
        console.warn('[SetupWizard] Demographics parse error:', e);
      }

      // ── Route 1: Demographics contain ONLY creatures (no humanoids) ──
      if (creatureDemos.length > 0 && humanoidPct === 0 && !creatureMatch) {
        statusEl.innerHTML = '<span style="color:var(--text-secondary)">🐉 Creature demographics detected — pulling from SRD...</span>';
        try {
          let totalAdded = 0;

          // Calculate exact creature counts from percentages
          let allocations = creatureDemos.map(d => ({
            ...d,
            exact: count * d.pct / 100,
            count: Math.max(1, Math.floor(count * d.pct / 100))
          }));
          let allocated = allocations.reduce((sum, a) => sum + a.count, 0);
          let remainder = count - allocated;

          // Distribute remainder to entries with highest fractional parts
          if (remainder > 0) {
            allocations.sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)));
            for (let ri = 0; ri < remainder && ri < allocations.length; ri++) {
              allocations[ri].count++;
            }
          } else if (allocated > count) {
            // Over-allocated: trim smallest entries
            allocations.sort((a, b) => a.pct - b.pct);
            while (allocated > count && allocations.length > 0) {
              const smallest = allocations.find(a => a.count > 1);
              if (smallest) { smallest.count--; allocated--; }
              else break;
            }
          }

          for (const alloc of allocations) {
            statusEl.innerHTML = `<span style="color:var(--text-secondary)">🔍 Looking up "${alloc.name}" in SRD... (${alloc.count} creatures)</span>`;
            try {
              const result = (await apiIntakeCreature(townId, alloc.name, alloc.count, instructions)).characters || [];
              if (result.length > 0) {
                await apiApplySimulation(townId, { new_characters: result }, null, 0);
                totalAdded += result.length;
              }
            } catch (err) {
              console.warn(`SRD lookup failed for "${alloc.name}":`, err.message);
            }
          }

          if (totalAdded > 0) {
            statusEl.innerHTML = `<span style="color:var(--success)">✅ ${totalAdded} creatures added from SRD! No AI credits used.</span>`;
            // Auto-assign spells if enabled
            if (el.querySelector('#sw-auto-spells')?.checked) {
              statusEl.innerHTML += '<br><span style="color:var(--text-secondary)">✨ Auto-assigning spells to casters...</span>';
              try {
                const spellResult = await apiAutoAssignSpellsTown(townId, true);
                if (spellResult.ok && spellResult.assigned > 0) {
                  statusEl.innerHTML += `<br><span style="color:var(--success)">✅ Spells assigned to ${spellResult.assigned} caster${spellResult.assigned !== 1 ? 's' : ''}</span>`;
                }
              } catch (e) { console.warn('Auto-spell failed:', e); }
            }
          } else {
            statusEl.innerHTML = '<span style="color:var(--error)">❌ No matching creatures found in SRD. Check demographic race names match SRD monster names.</span>';
          }

          return;
        } catch (err) {
          statusEl.innerHTML = `<span style="color:var(--error)">❌ SRD creature error: ${err.message}</span>`;
          return;
        }
      }

      // ── Route 2: Demographics contain a MIX of humanoids + creatures ──
      if (creatureDemos.length > 0 && humanoidPct > 0 && !creatureMatch) {
        statusEl.innerHTML = '<span style="color:var(--text-secondary)">🐉 Mixed demographics detected — generating humanoids via AI + creatures from SRD...</span>';
        try {
          let totalAdded = 0;

          // Calculate creature count from their percentage share
          const creatureTotalPct = creatureDemos.reduce((s, d) => s + d.pct, 0);
          const creatureCount = Math.max(1, Math.round(count * creatureTotalPct / 100));
          const humanoidCount = Math.max(0, count - creatureCount);

          // Generate creatures from SRD
          if (creatureCount > 0) {
            let creatureAllocations = creatureDemos.map(d => ({
              ...d,
              exact: creatureCount * d.pct / creatureTotalPct,
              count: Math.max(1, Math.floor(creatureCount * d.pct / creatureTotalPct))
            }));
            let cAllocated = creatureAllocations.reduce((s, a) => s + a.count, 0);
            let cRemainder = creatureCount - cAllocated;
            if (cRemainder > 0) {
              creatureAllocations.sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)));
              for (let ri = 0; ri < cRemainder && ri < creatureAllocations.length; ri++) {
                creatureAllocations[ri].count++;
              }
            }

            for (const alloc of creatureAllocations) {
              statusEl.innerHTML = `<span style="color:var(--text-secondary)">🔍 Looking up "${alloc.name}" in SRD... (${alloc.count} creatures)</span>`;
              try {
                const result = (await apiIntakeCreature(townId, alloc.name, alloc.count, instructions)).characters || [];
                if (result.length > 0) {
                  await apiApplySimulation(townId, { new_characters: result }, null, 0);
                  totalAdded += result.length;
                }
              } catch (err) {
                console.warn(`SRD lookup failed for "${alloc.name}":`, err.message);
              }
            }
          }

          // Generate humanoid portion via AI (two-phase intake)
          if (humanoidCount > 0) {
            // Show AI cost confirmation for the humanoid portion
            const proceed = await confirmAiCost('intake', { count: humanoidCount });
            if (!proceed) {
              statusEl.innerHTML = '<span style="color:var(--text-muted)">Cancelled by user.</span>';
              return;
            }
            statusEl.innerHTML = `<span style="color:var(--text-secondary)">📋 Generating ${humanoidCount} humanoid NPCs via AI...</span>`;
            const rosterRes = await apiIntakeRoster(townId, humanoidCount, rules, instructions);
            const roster = rosterRes.roster || [];
            if (roster.length > 0) {
              await new Promise(r => setTimeout(r, 500));
              const BATCH = 10;
              let humanoidFleshed = 0;
              for (let i = 0; i < roster.length; i += BATCH) {
                const batch = roster.slice(i, i + BATCH);
                statusEl.innerHTML = `<span style="color:var(--text-secondary)">🔧 Fleshing out humanoids... (${humanoidFleshed}/${roster.length})</span>`;
                try {
                  const fleshRes = await apiIntakeFlesh(townId, batch, rules);
                  const chars = fleshRes.characters || [];
                  if (chars.length) {
                    await apiApplySimulation(townId, { new_characters: chars }, null, 0);
                    totalAdded += chars.length;
                    humanoidFleshed += chars.length;
                  }
                } catch (err) {
                  console.warn('Flesh batch failed:', err.message);
                }
              }
            }
          }

          if (totalAdded > 0) {
            statusEl.innerHTML = `<span style="color:var(--success)">✅ ${totalAdded} characters/creatures added!</span>`;
            // Auto-assign spells if enabled
            if (el.querySelector('#sw-auto-spells')?.checked) {
              statusEl.innerHTML += '<br><span style="color:var(--text-secondary)">✨ Auto-assigning spells to casters...</span>';
              try {
                const spellResult = await apiAutoAssignSpellsTown(townId, true);
                if (spellResult.ok && spellResult.assigned > 0) {
                  statusEl.innerHTML += `<br><span style="color:var(--success)">✅ Spells assigned to ${spellResult.assigned} caster${spellResult.assigned !== 1 ? 's' : ''}</span>`;
                }
              } catch (e) { console.warn('Auto-spell failed:', e); }
            }
          } else {
            statusEl.innerHTML = '<span style="color:var(--error)">❌ Failed to generate population</span>';
          }

          return;
        } catch (err) {
          statusEl.innerHTML = `<span style="color:var(--error)">❌ Mixed population error: ${err.message}</span>`;
          return;
        }
      }

      // ── Route 3: Creature keyword in instructions text ──
      if (creatureMatch) {
        const creatureName = creatureMatch[1];
        statusEl.innerHTML = `<span style="color:var(--text-secondary)">🔍 Looking up "${creatureName}" in SRD...</span>`;
        const result = await apiIntakeCreature(townId, creatureName, count, instructions);
        const chars = result.characters || [];
        if (chars.length > 0) {
          await apiApplySimulation(townId, { new_characters: chars }, null, 0);
          statusEl.innerHTML = `<span style="color:var(--success)">✅ ${chars.length}x ${creatureName} added from SRD! No AI credits used.</span>`;
          // Auto-assign spells if enabled
          if (el.querySelector('#sw-auto-spells')?.checked) {
            statusEl.innerHTML += '<br><span style="color:var(--text-secondary)">✨ Auto-assigning spells to casters...</span>';
            try {
              const spellResult = await apiAutoAssignSpellsTown(townId, true);
              if (spellResult.ok && spellResult.assigned > 0) {
                statusEl.innerHTML += `<br><span style="color:var(--success)">✅ Spells assigned to ${spellResult.assigned} caster${spellResult.assigned !== 1 ? 's' : ''}</span>`;
              }
            } catch (e) { console.warn('Auto-spell failed:', e); }
          }
        } else {
          statusEl.innerHTML = `<span style="color:var(--error)">❌ "${creatureName}" not found in SRD.</span>`;
        }
      } else {
        // ── Route 4: Standard AI generation (two-phase intake) ──
        // Show AI cost confirmation
        const proceed = await confirmAiCost('intake', { count });
        if (!proceed) {
          statusEl.innerHTML = '<span style="color:var(--text-muted)">Cancelled by user.</span>';
          btn.disabled = false;
          btn.textContent = '🎲 Generate Characters';
          return;
        }
        statusEl.innerHTML = `<span style="color:var(--text-secondary)">📋 Step 1/2: Creating roster (${count} characters)...</span>`;
        const rosterRes = await apiIntakeRoster(townId, count, rules, instructions);
        const roster = rosterRes.roster || [];

        if (roster.length === 0) {
          statusEl.innerHTML = '<span style="color:var(--error)">❌ AI returned empty roster</span>';
          return;
        }

        statusEl.innerHTML = `<span style="color:var(--success)">✅ Step 1: ${roster.length} planned</span>`;
        await new Promise(r => setTimeout(r, 500));

        let created = 0;
        const BATCH = 10;
        for (let i = 0; i < roster.length; i += BATCH) {
          const batch = roster.slice(i, i + BATCH);
          statusEl.innerHTML = `<span style="color:var(--text-secondary)">🔧 Step 2/2: Fleshing out... (${created}/${roster.length})</span>`;
          try {
            const fleshRes = await apiIntakeFlesh(townId, batch, rules);
            const chars = fleshRes.characters || [];
            if (chars.length) {
              await apiApplySimulation(townId, { new_characters: chars }, null, 0);
              created += chars.length;
            }
          } catch (err) {
            console.warn('Flesh batch failed:', err.message);
          }
        }

        if (created > 0) {
          statusEl.innerHTML = `<span style="color:var(--success)">✅ ${created} character${created !== 1 ? 's' : ''} added!</span>`;
          // Auto-assign spells if enabled
          if (el.querySelector('#sw-auto-spells')?.checked) {
            statusEl.innerHTML += '<br><span style="color:var(--text-secondary)">✨ Auto-assigning spells to casters...</span>';
            try {
              const spellResult = await apiAutoAssignSpellsTown(townId, true);
              if (spellResult.ok && spellResult.assigned > 0) {
                statusEl.innerHTML += `<br><span style="color:var(--success)">✅ Spells assigned to ${spellResult.assigned} caster${spellResult.assigned !== 1 ? 's' : ''}</span>`;
              }
            } catch (e) { console.warn('Auto-spell failed:', e); }
          }
        } else {
          statusEl.innerHTML = '<span style="color:var(--error)">❌ Failed to generate characters</span>';
        }
      }

      // Refresh parent
      if (onRefresh) onRefresh();
    } catch (err) {
      statusEl.innerHTML = `<span style="color:var(--error)">❌ ${err.message}</span>`;
    } finally {
      btn.disabled = false;
      btn.textContent = '🎲 Generate Characters';
    }
  });


  // ═══════════════════════════════════════════════════════
  // BUILDINGS TAB
  // ═══════════════════════════════════════════════════════
  let pendingBuildings = [];

  el.querySelector('#sw-bld-preview').addEventListener('click', () => {
    const age = el.querySelector('#sw-bld-age').value;
    const pop = state.currentTown?.characters?.filter(c => c.status !== 'Deceased')?.length || 10;
    pendingBuildings = generateBuildingList(age, pop, biome, existingBuildings);

    const listEl = el.querySelector('#sw-bld-preview-list');
    if (pendingBuildings.length === 0) {
      listEl.innerHTML = '<p style="color:var(--text-muted);padding:0.5rem;">No new buildings to add — town already has everything!</p>';
      el.querySelector('#sw-bld-create').disabled = true;
      return;
    }

    const typeIcons = {
      civic: '🏛️', commercial: '🏪', infrastructure: '⚙️', military: '⚔️',
      religious: '⛪', arcane: '🔮', fortification: '🏰', entertainment: '🎭',
      residential: '🏠', other: '🏘️',
    };

    listEl.innerHTML = `
      <h4 style="margin:0.75rem 0 0.5rem;color:var(--text-secondary);">📋 ${pendingBuildings.length} Buildings to Create</h4>
      <div class="setup-building-grid">
        ${pendingBuildings.map(b => `
          <div class="setup-building-card">
            <div class="setup-building-header">
              <span>${typeIcons[b.type] || '🏘️'} <strong>${b.name}</strong></span>
              <span class="setup-building-type">${b.type}</span>
            </div>
            <div class="setup-building-desc">${b.description}</div>
          </div>
        `).join('')}
      </div>
    `;

    el.querySelector('#sw-bld-create').disabled = false;
  });

  el.querySelector('#sw-bld-create').addEventListener('click', async () => {
    if (pendingBuildings.length === 0) return;
    const btn = el.querySelector('#sw-bld-create');
    const statusEl = el.querySelector('#sw-bld-status');
    btn.disabled = true;
    btn.textContent = '⏳ Creating...';

    let created = 0;
    for (const b of pendingBuildings) {
      try {
        await apiSaveBuilding(townId, {
          name: b.name,
          status: 'completed',
          build_progress: 1,
          build_time: 1,
          description: b.description,
          building_type: b.type,
        });
        created++;
      } catch (err) {
        console.warn('Failed to create building:', b.name, err);
      }
    }

    statusEl.innerHTML = `<span style="color:var(--success)">✅ ${created} buildings created!</span>`;
    btn.textContent = '✅ Done!';
    existingBuildings = [...existingBuildings, ...pendingBuildings.map(b => ({ ...b, status: 'completed' }))];
    el.querySelector('#sw-bld-existing').textContent = `${existingBuildings.length} buildings`;
    pendingBuildings = [];

    if (onRefresh) onRefresh();
    setTimeout(() => { btn.disabled = false; btn.textContent = '🏗️ Create All Buildings'; }, 3000);
  });


  // ═══════════════════════════════════════════════════════
  // SETTINGS TAB — shared town settings (also used by Town Settings modal)
  // (Form values are applied in the async load block after apiGetTownMeta finishes.)
  // ═══════════════════════════════════════════════════════

  el.querySelector('#sw-settings-save')?.addEventListener('click', async () => {
    const btn = el.querySelector('#sw-settings-save');
    const statusEl = el.querySelector('#sw-settings-status');
    btn.disabled = true;
    btn.textContent = '⏳ Saving...';

    try {
      const rawSet = el.querySelector('#sw-settlement-type').value;
      const settlement = rawSet === '' ? '' : rawSet;
      const rawBio = el.querySelector('#sw-shared-biome').value;
      const nextBiome = rawBio === '' ? '' : rawBio;
      const difficulty = el.querySelector('#sw-shared-difficulty').value || 'struggling';
      const demoStr = buildWizardDemoStr();
      const genRulesJson = genRulesJsonForWizardSave(el, townMeta);

      await Promise.all([
        apiSaveTownMeta(townId, 'demographics', demoStr),
        apiSaveTownMeta(townId, 'settlement_type', settlement),
        apiSaveTownMeta(townId, 'biome', nextBiome),
        apiSaveTownMeta(townId, 'difficulty_level', difficulty),
        apiSaveTownMeta(townId, 'gen_rules', genRulesJson),
      ]);

      biome = nextBiome;
      townMeta = {
        ...townMeta,
        demographics: demoStr,
        settlement_type: settlement,
        biome: nextBiome,
        difficulty_level: difficulty,
        gen_rules: genRulesJson,
      };
      const biomeLabel = biome === '' ? '(not set)' : biome;
      el.querySelector('#sw-bld-biome').textContent = biomeLabel;

      statusEl.innerHTML = '<span style="color:var(--success)">✅ Settings saved — same data as Town Settings (⚙️).</span>';
    } catch (err) {
      statusEl.innerHTML = `<span style="color:var(--error)">❌ ${err.message}</span>`;
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 Save Settings';
    }
  });
}
