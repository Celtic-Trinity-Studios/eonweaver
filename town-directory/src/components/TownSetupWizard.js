/**
 * Eon Weaver — Town Setup Wizard
 * Modal wizard for town population, building generation, weather, and spell assignment.
 * Replaces the old inline intake bar.
 */
import { getState, setState } from '../stores/appState.js';
import { showModal } from './Modal.js';
import { apiGetCharacters, normalizeCharacter } from '../api/characters.js';
import { apiGetTownMeta, apiSaveTownMeta } from '../api/towns.js';
import { apiApplySimulation, apiIntakeRoster, apiIntakeFlesh, apiIntakeCreature, apiGetCampaignRules, apiAutoAssignSpellsTown, apiSaveCampaignRules } from '../api/simulation.js';
import { apiGenerateWeather } from '../api/simulation.js';
import { apiGetCalendar } from '../api/settings.js';
import { apiGetBuildings, apiSaveBuilding } from '../api/buildings.js';

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
  const state = getState();

  const { el, close } = showModal({
    title: '🏗️ Town Setup Wizard',
    width: 'wide',
    content: `
      <div class="setup-wizard">
        <div class="setup-tabs" id="setup-tabs">
          <button class="setup-tab active" data-tab="populate">👥 Populate</button>
          <button class="setup-tab" data-tab="buildings">🏛️ Buildings</button>
          <button class="setup-tab" data-tab="weather">🌦️ Weather</button>

          <button class="setup-tab" data-tab="settings">⚙️ Settings</button>
        </div>

        <!-- POPULATE TAB -->
        <div class="setup-panel active" data-panel="populate">
          <h3 style="margin-bottom:0.5rem;">👥 Add Population</h3>
          <p class="setup-desc">Generate new residents for this town using AI. No simulation is run — characters are created and added directly.</p>

          <div class="setup-row">
            <div class="form-group" style="flex:0 0 100px;">
              <label>Count</label>
              <input type="number" id="sw-pop-count" class="form-input" min="1" max="50" value="5" style="text-align:center;">
            </div>
            <div class="form-group" style="flex:1;">
              <label>Instructions <span style="color:var(--text-muted);font-weight:400;">(optional)</span></label>
              <input type="text" id="sw-pop-instructions" class="form-input"
                placeholder="e.g. 'all dwarves', 'merchants only', 'a family of 4', 'goblin 5'...">
            </div>
          </div>

          <div class="setup-actions">
            <button class="btn-primary" id="sw-pop-generate">🎲 Generate Characters</button>
          </div>
          <div class="setup-status" id="sw-pop-status"></div>
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

        <!-- WEATHER TAB -->
        <div class="setup-panel" data-panel="weather">
          <h3 style="margin-bottom:0.5rem;">🌦️ Generate Weather</h3>
          <p class="setup-desc">AI generates a full year of weather patterns based on this town's biome and climate. The result is saved and used during simulations for immersive, thematic events.</p>

          <div class="setup-row">
            <div class="form-group">
              <label>Biome</label>
              <span id="sw-wx-biome" class="setup-info-value">Loading...</span>
            </div>
            <div class="form-group">
              <label>Calendar</label>
              <span id="sw-wx-calendar" class="setup-info-value">Loading...</span>
            </div>
            <div class="form-group">
              <label>Status</label>
              <span id="sw-wx-existing" class="setup-info-value">Checking...</span>
            </div>
          </div>

          <div class="setup-actions">
            <button class="btn-primary" id="sw-wx-generate">🌤️ Generate Full Year Weather</button>
          </div>
          <div id="sw-wx-preview" class="setup-weather-preview"></div>
          <div class="setup-status" id="sw-wx-status"></div>
        </div>



        <!-- SETTINGS TAB -->
        <div class="setup-panel" data-panel="settings">
          <h3 style="margin-bottom:0.5rem;">⚙️ Campaign Rules</h3>
          <p class="setup-desc">These settings control how the AI simulation generates content. Changes are saved to your active campaign and affect all towns.</p>

          <div id="sw-settings-loading" style="color:var(--text-muted);padding:1rem;">Loading settings...</div>
          <div id="sw-settings-content" style="display:none;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div>
                <h4 style="color:var(--accent);margin-bottom:0.5rem;font-size:0.85rem;">🌍 World Simulation</h4>
                <div class="form-group"><label>Relationship Formation</label>
                  <select id="sw-rel-speed" class="form-select">
                    <option value="very slow">Very Slow</option><option value="slow">Slow</option>
                    <option value="normal" selected>Normal</option><option value="fast">Fast</option>
                  </select></div>
                <div class="form-group"><label>Birth Rate</label>
                  <select id="sw-birth-rate" class="form-select">
                    <option value="rare">Rare</option><option value="low">Low</option>
                    <option value="normal" selected>Normal</option><option value="high">High</option>
                  </select></div>
                <div class="form-group"><label>Death Threshold</label>
                  <select id="sw-death-threshold" class="form-select">
                    <option value="25">25</option><option value="50" selected>50</option>
                    <option value="75">75</option><option value="100">100</option>
                    <option value="150">150</option><option value="unlimited">Unlimited</option>
                  </select></div>
                <div class="form-group"><label>Child Growth</label>
                  <select id="sw-child-growth" class="form-select">
                    <option value="realistic" selected>Realistic (18 yr)</option>
                    <option value="accelerated">Accelerated</option><option value="instant">Instant</option>
                  </select></div>
                <div class="form-group"><label>Conflict & Events</label>
                  <select id="sw-conflict" class="form-select">
                    <option value="peaceful">Peaceful</option><option value="occasional" selected>Occasional</option>
                    <option value="frequent">Frequent</option><option value="brutal">Brutal</option>
                  </select></div>
              </div>
              <div>
                <h4 style="color:var(--accent);margin-bottom:0.5rem;font-size:0.85rem;">🧪 Homebrew & World</h4>
                <div class="form-group"><label>✨ Magic Level</label>
                  <select id="sw-hb-magic-level" class="form-select">
                    <option value="">— Default —</option><option value="none">No Magic</option>
                    <option value="low">Low Magic</option><option value="standard">Standard</option>
                    <option value="high">High Magic</option><option value="wild">Wild Magic</option>
                  </select></div>
                <div class="form-group"><label>🎭 World Tone</label>
                  <select id="sw-hb-tone" class="form-select">
                    <option value="">— Default —</option><option value="grimdark">Grimdark</option>
                    <option value="dark_fantasy">Dark Fantasy</option><option value="standard">Standard</option>
                    <option value="lighthearted">Lighthearted</option><option value="horror">Horror</option>
                    <option value="intrigue">Political Intrigue</option>
                  </select></div>
                <div class="form-group"><label>🗣️ NPC Depth</label>
                  <select id="sw-hb-npc-depth" class="form-select">
                    <option value="">— Default —</option><option value="simple">Simple</option>
                    <option value="standard">Standard</option><option value="deep">Deep</option>
                    <option value="literary">Literary</option>
                  </select></div>
                <div class="form-group"><label>💕 Romance</label>
                  <select id="sw-hb-romance" class="form-select">
                    <option value="">— Default —</option><option value="none">None</option>
                    <option value="subtle">Subtle</option><option value="present">Present</option>
                    <option value="focus">Focus</option>
                  </select></div>
                <div class="form-group"><label>☠️ NPC Mortality</label>
                  <select id="sw-hb-mortality" class="form-select">
                    <option value="">— Default —</option><option value="lethal">Lethal</option>
                    <option value="impactful">Impactful</option><option value="rare">Rare</option>
                  </select></div>
              </div>
            </div>

            <div class="form-group" style="margin-top:0.75rem;">
              <label>📜 Campaign Description</label>
              <textarea id="sw-campaign-desc" class="form-input" rows="2" placeholder="Describe your world..."></textarea>
            </div>
            <div class="form-group">
              <label>📋 House Rules</label>
              <textarea id="sw-house-rules" class="form-input" rows="2" placeholder="House rules for simulations..."></textarea>
            </div>

            <div class="form-group" style="margin-top:0.5rem;">
              <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                <input type="checkbox" id="sw-auto-spells" checked style="width:18px;height:18px;accent-color:var(--accent);cursor:pointer;">
                ✨ Auto-Assign Spells After Populate
              </label>
              <p class="setup-desc" style="margin:0.25rem 0 0 1.75rem;font-size:0.75rem;">When enabled, SRD-optimal spells are automatically assigned to all casters after populating the town.</p>
            </div>

            <div class="setup-actions">
              <button class="btn-primary" id="sw-settings-save">💾 Save Settings</button>
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

  // ── Load context data ──
  let townMeta = {};
  let biome = '';
  let calendarData = null;
  let existingBuildings = [];

  (async () => {
    try {
      const [metaRes, calRes, bldRes] = await Promise.all([
        apiGetTownMeta(townId),
        apiGetCalendar().catch(() => null),
        apiGetBuildings(townId).catch(() => ({ buildings: [] })),
      ]);
      townMeta = metaRes.meta || {};
      biome = townMeta.biome || 'Grassland / Plains';
      calendarData = calRes?.calendar || null;
      existingBuildings = bldRes.buildings || [];

      // Populate biome displays
      el.querySelector('#sw-bld-biome').textContent = biome || '(not set)';
      el.querySelector('#sw-bld-existing').textContent = `${existingBuildings.length} buildings`;
      el.querySelector('#sw-wx-biome').textContent = biome || '(not set)';

      // Calendar info
      if (calendarData) {
        const monthNames = calendarData.month_names || calendarData.months || [];
        el.querySelector('#sw-wx-calendar').textContent =
          `${monthNames.length || calendarData.months_per_year || 12} months, ${calendarData.days_per_month || 30} days/month`;
      }

      // Check existing weather
      if (townMeta.weather_year) {
        try {
          const wx = JSON.parse(townMeta.weather_year);
          el.querySelector('#sw-wx-existing').innerHTML =
            `<span style="color:var(--success);">✅ Weather generated (${wx.months?.length || 0} months)</span>`;
          renderWeatherPreview(el, wx);
        } catch {
          el.querySelector('#sw-wx-existing').textContent = '❌ Invalid weather data';
        }
      } else {
        el.querySelector('#sw-wx-existing').textContent = 'No weather generated yet';
      }
    } catch (err) {
      console.warn('[SetupWizard] Failed to load context:', err);
    }
  })();


  // ═══════════════════════════════════════════════════════
  // POPULATE TAB
  // ═══════════════════════════════════════════════════════

  // Standard humanoid races that go through AI generation, not SRD creature lookup
  const STANDARD_HUMANOID_REGEX = /^(human|elf|dwarf|halfling|gnome|half-elf|half-orc|tiefling|dragonborn|aasimar)$/i;
  // Creature/monster keyword regex for instruction-based detection
  const CREATURE_KEYWORD_REGEX = /\b(stirge|goblin|kobold|orc|skeleton|zombie|rat|wolf|spider|bat|snake|bear|ogre|troll|undead|beast|creature|monster|animal|vermin|aberration|ooze|elemental|fiend|fey|dragon|worg|hyena|dire|ghoul|wight|wraith|gnoll|lizardfolk|bugbear|hobgoblin|minotaur|harpy|imp|demon|devil|slime|ant|scorpion|centipede|crocodile|shark|owl|hawk|eagle|boar|lion|tiger|ape|horse|mule|donkey|cat|dog|badger|wolverine|weasel|raven|toad|lizard|squid|octopus|crab|wasp|beetle|moth|gryphon|griffon|basilisk|cockatrice|chimera|manticore|hydra|gargoyle|golem|treant|dryad|nymph|satyr|pegasus|unicorn|wyvern|drake|giant)\b/i;

  el.querySelector('#sw-pop-generate').addEventListener('click', async () => {
    const count = Math.max(1, Math.min(50, parseInt(el.querySelector('#sw-pop-count').value) || 5));
    const instructions = el.querySelector('#sw-pop-instructions').value.trim();
    const btn = el.querySelector('#sw-pop-generate');
    const statusEl = el.querySelector('#sw-pop-status');

    btn.disabled = true;
    btn.textContent = '⏳ Generating...';

    try {
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
            statusEl.innerHTML = `<span style="color:var(--text-secondary)">📋 Generating ${humanoidCount} humanoid NPCs via AI...</span>`;
            const rosterRes = await apiIntakeRoster(townId, humanoidCount, rules, instructions);
            const roster = rosterRes.roster || [];
            if (roster.length > 0) {
              await new Promise(r => setTimeout(r, 500));
              const BATCH = 10;
              for (let i = 0; i < roster.length; i += BATCH) {
                const batch = roster.slice(i, i + BATCH);
                statusEl.innerHTML = `<span style="color:var(--text-secondary)">🔧 Fleshing out humanoids... (${totalAdded - (totalAdded - humanoidCount >= 0 ? totalAdded - humanoidCount : 0)}/${roster.length})</span>`;
                try {
                  const fleshRes = await apiIntakeFlesh(townId, batch, rules);
                  const chars = fleshRes.characters || [];
                  if (chars.length) {
                    await apiApplySimulation(townId, { new_characters: chars }, null, 0);
                    totalAdded += chars.length;
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
  // WEATHER TAB
  // ═══════════════════════════════════════════════════════
  el.querySelector('#sw-wx-generate').addEventListener('click', async () => {
    const btn = el.querySelector('#sw-wx-generate');
    const statusEl = el.querySelector('#sw-wx-status');
    btn.disabled = true;
    btn.textContent = '⏳ Generating weather...';
    statusEl.innerHTML = '<span style="color:var(--text-secondary)">🌤️ AI is generating a full year of weather patterns...</span>';

    try {
      const result = await apiGenerateWeather(townId);
      if (result.ok && result.weather) {
        statusEl.innerHTML = `<span style="color:var(--success)">✅ Weather generated! ${result.weather.months?.length || 0} months of weather data saved.</span>`;
        el.querySelector('#sw-wx-existing').innerHTML =
          `<span style="color:var(--success);">✅ Weather generated (${result.weather.months?.length || 0} months)</span>`;
        renderWeatherPreview(el, result.weather);
      } else {
        statusEl.innerHTML = `<span style="color:var(--error)">❌ ${result.error || 'Weather generation failed'}</span>`;
      }
    } catch (err) {
      statusEl.innerHTML = `<span style="color:var(--error)">❌ ${err.message}</span>`;
    } finally {
      btn.disabled = false;
      btn.textContent = '🌤️ Generate Full Year Weather';
    }
  });




  // ═══════════════════════════════════════════════════════
  // SETTINGS TAB — load & save campaign rules inline
  // ═══════════════════════════════════════════════════════
  (async () => {
    try {
      const rules = await apiGetCampaignRules();
      const content = el.querySelector('#sw-settings-content');
      const loading = el.querySelector('#sw-settings-loading');
      if (!content) return;

      // World sim
      if (rules.relationship_speed) el.querySelector('#sw-rel-speed').value = rules.relationship_speed;
      if (rules.birth_rate) el.querySelector('#sw-birth-rate').value = rules.birth_rate;
      if (rules.death_threshold) el.querySelector('#sw-death-threshold').value = rules.death_threshold;
      if (rules.child_growth) el.querySelector('#sw-child-growth').value = rules.child_growth;
      if (rules.conflict_frequency) el.querySelector('#sw-conflict').value = rules.conflict_frequency;

      // Homebrew
      const hb = rules.homebrew_settings || {};
      if (hb.magic_level) el.querySelector('#sw-hb-magic-level').value = hb.magic_level;
      if (hb.tone) el.querySelector('#sw-hb-tone').value = hb.tone;
      if (hb.npc_depth) el.querySelector('#sw-hb-npc-depth').value = hb.npc_depth;
      if (hb.romance) el.querySelector('#sw-hb-romance').value = hb.romance;
      if (hb.mortality) el.querySelector('#sw-hb-mortality').value = hb.mortality;

      // Lore
      if (rules.campaign_description) el.querySelector('#sw-campaign-desc').value = rules.campaign_description;
      if (rules.rules_text) el.querySelector('#sw-house-rules').value = rules.rules_text;

      loading.style.display = 'none';
      content.style.display = '';
    } catch (e) {
      const loading = el.querySelector('#sw-settings-loading');
      if (loading) loading.textContent = '❌ Failed to load settings';
    }
  })();

  el.querySelector('#sw-settings-save')?.addEventListener('click', async () => {
    const btn = el.querySelector('#sw-settings-save');
    const statusEl = el.querySelector('#sw-settings-status');
    btn.disabled = true;
    btn.textContent = '⏳ Saving...';

    try {
      const houseRules = el.querySelector('#sw-house-rules').value.trim();
      const campDesc = el.querySelector('#sw-campaign-desc').value.trim();

      const homebrewSettings = {};
      const hbMap = {
        'sw-hb-magic-level': 'magic_level',
        'sw-hb-tone': 'tone',
        'sw-hb-npc-depth': 'npc_depth',
        'sw-hb-romance': 'romance',
        'sw-hb-mortality': 'mortality',
      };
      for (const [elId, key] of Object.entries(hbMap)) {
        const val = el.querySelector(`#${elId}`)?.value || '';
        if (val) homebrewSettings[key] = val;
      }

      const worldSimSettings = {
        relationship_speed: el.querySelector('#sw-rel-speed').value,
        birth_rate: el.querySelector('#sw-birth-rate').value,
        death_threshold: el.querySelector('#sw-death-threshold').value,
        child_growth: el.querySelector('#sw-child-growth').value,
        conflict_frequency: el.querySelector('#sw-conflict').value,
      };

      await apiSaveCampaignRules(houseRules, campDesc, homebrewSettings, worldSimSettings);
      statusEl.innerHTML = '<span style="color:var(--success)">✅ Settings saved!</span>';
    } catch (err) {
      statusEl.innerHTML = `<span style="color:var(--error)">❌ ${err.message}</span>`;
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 Save Settings';
    }
  });
}

// ═══════════════════════════════════════════════════════
// WEATHER PREVIEW RENDERER
// ═══════════════════════════════════════════════════════
function renderWeatherPreview(el, weather) {
  const previewEl = el.querySelector('#sw-wx-preview');
  if (!previewEl || !weather?.months) return;

  const weatherIcons = {
    clear: '☀️', sunny: '☀️', fair: '🌤️', cloudy: '☁️', overcast: '☁️',
    rain: '🌧️', heavy_rain: '🌧️', light_rain: '🌦️', drizzle: '🌦️',
    storm: '⛈️', thunderstorm: '⛈️', snow: '❄️', heavy_snow: '🌨️',
    blizzard: '🌨️', fog: '🌫️', mist: '🌫️', wind: '💨', hot: '🔥',
    cold: '🥶', mild: '🌤️', warm: '🌞', freezing: '🥶',
  };

  function getWeatherIcon(pattern) {
    if (!pattern) return '🌤️';
    const lower = pattern.toLowerCase();
    for (const [key, icon] of Object.entries(weatherIcons)) {
      if (lower.includes(key)) return icon;
    }
    return '🌤️';
  }

  previewEl.innerHTML = `
    <h4 style="margin:0.75rem 0 0.5rem;color:var(--text-secondary);">📅 Year ${weather.year || '—'} Weather</h4>
    <div class="setup-weather-grid">
      ${weather.months.map(m => `
        <div class="setup-weather-card">
          <div class="setup-weather-month">${getWeatherIcon(m.weather_pattern)} ${m.name || 'Month ' + m.month}</div>
          <div class="setup-weather-temp">${m.avg_temp || '—'}</div>
          <div class="setup-weather-pattern">${m.weather_pattern || '—'}</div>
          ${m.notable_events?.length ? `<div class="setup-weather-events">${m.notable_events.map(e => `<span class="setup-weather-event">• ${e}</span>`).join('')}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}
