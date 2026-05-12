/**
 * Eon Weaver — Help & Guide View
 * Tabbed help page — select a topic on the left, view content on the right.
 */

export default function HelpView(container) {
  const sections = [
    {
      id: 'getting-started',
      icon: '🚀',
      title: 'Getting Started',
      content: `
        <h4>Welcome to Eon Weaver!</h4>
        <p>Eon Weaver is an AI-powered living world simulator for D&D. Create towns, populate them with fully-statted NPCs, simulate months of events, and watch your world come alive between sessions.</p>
        
        <div class="help-steps">
          <div class="help-step">
            <span class="help-step-num">1</span>
            <div>
              <strong>Create a Campaign</strong>
              <p>On first login you'll create a campaign — give it a name and pick your D&D edition (3.5e, 5e 2014, or 5e 2024). You can switch between campaigns later from the sidebar.</p>
            </div>
          </div>
          <div class="help-step">
            <span class="help-step-num">2</span>
            <div>
              <strong>Create a Town</strong>
              <p>Go to the <strong>Dashboard</strong> and click <strong>"+ New Town"</strong>. Give it a name and optional subtitle.</p>
            </div>
          </div>
          <div class="help-step">
            <span class="help-step-num">3</span>
            <div>
              <strong>Configure Town Settings</strong>
              <p>Open your town, click <strong>⚙️ Settings</strong> to set the biome, demographics (race percentages), <strong>local food supply</strong> for macro dynamics, intake level, and generation rules <em>before</em> populating.</p>
            </div>
          </div>
          <div class="help-step">
            <span class="help-step-num">4</span>
            <div>
              <strong>Populate It</strong>
              <p>Use the <strong>AI Intake</strong> bar at the bottom of the roster. Enter a count (e.g. 20) and click Generate. Characters arrive fully statted with abilities, gear, feats, and backstories.</p>
            </div>
          </div>
          <div class="help-step">
            <span class="help-step-num">5</span>
            <div>
              <strong>Simulate Time</strong>
              <p>Go to <strong>🌍 World Simulate</strong>, select towns and months, then watch the AI generate events, relationships, births, deaths, construction, and drama. A live log modal shows progress as it runs.</p>
            </div>
          </div>
          <div class="help-step">
            <span class="help-step-num">6</span>
            <div>
              <strong>Optional: World Map & Travel</strong>
              <p>Open <strong>🗺️ World Map</strong> to upload a campaign map, pin towns, calibrate scale, and estimate travel. Inter-town moves during simulation can use those distances when towns are pinned.</p>
            </div>
          </div>
        </div>

        <div class="help-tip">
          💡 <strong>Tip:</strong> Set up your Campaign Description & House Rules in <strong>⚙️ Settings</strong> first — the AI uses these for every generation and simulation.
        </div>
      `
    },
    {
      id: 'dashboard',
      icon: '🏠',
      title: 'Dashboard',
      content: `
        <p>The Dashboard is your home base. It shows all your towns at a glance with population counts and quick actions. Open it from the <strong>top of the sidebar</strong> (always visible, above the grouped categories).</p>
        
        <div class="help-feature">
          <strong>🏰 Town Cards</strong>
          <p>Each town displays its name, subtitle, and living population count. When macro metrics exist for the campaign, a compact <strong>🌾 granary index</strong> appears beside the population — a campaign-scale snapshot of how full the abstract “larder” is (see <strong>Macro Dynamics & Food</strong>). Click the card to open the town roster.</p>
        </div>
        <div class="help-feature">
          <strong>➕ New Town</strong>
          <p>Click "New Town" to create a new settlement. You can have as many towns as you want in a campaign.</p>
        </div>
        <div class="help-feature">
          <strong>⏩ Quick Simulate</strong>
          <p>Run a 1-month simulation directly from a town card without navigating away. Great for quick time advances.</p>
        </div>
        <div class="help-feature">
          <strong>📊 Stats</strong>
          <p>Jump directly to the Town Statistics page for any town to see race/class breakdowns, building status, and more.</p>
        </div>
      `
    },
    {
      id: 'town-roster',
      icon: '🏰',
      title: 'Town Roster',
      content: `
        <p>The Town Roster is where you manage all characters in a town. Split-panel layout: character list on the left, character sheet on the right.</p>
        
        <div class="help-feature">
          <strong>📋 Character List</strong>
          <p>Click column headers (NAME, RACE, CLASS, LVL, HP, AC, ALIGN) to sort. Use the search box and filter chips to find characters by race, class, or status.</p>
        </div>
        <div class="help-feature">
          <strong>🔍 Filters</strong>
          <p>Filter chips appear below the search bar showing race and class breakdowns. Click a chip to filter, click again to clear. Combine search text with chip filters.</p>
        </div>
        <div class="help-feature">
          <strong>👤 Character Detail</strong>
          <p>Click any character to open their full sheet on the right — stats, combat, feats, equipment, spells, social connections, XP log, and background.</p>
        </div>
        <div class="help-feature">
          <strong>⚰️ Living / Graveyard Tabs</strong>
          <p>Toggle between living characters and deceased. Dead characters are preserved in the graveyard with their cause of death for historical reference.</p>
        </div>
        <div class="help-feature">
          <strong>📖 History</strong>
          <p>Click "History" to open the Town History modal — a timeline of everything that has happened. Click any month to see its detail view with stat breakdowns (arrivals, births, deaths, events) and tabbed content.</p>
        </div>
        <div class="help-feature">
          <strong>🌾 Macro granary badge</strong>
          <p>In the roster header you may see <strong>🌾</strong> with a number — the same macro granary index as on the Dashboard. Hover for a short reminder; full meaning is under <strong>Macro Dynamics & Food</strong>.</p>
        </div>
        <div class="help-feature">
          <strong>⚙️ Town Settings</strong>
          <p>Configure biome, demographics, <strong>local food supply</strong>, generation rules, and more. See the <strong>Town Settings</strong> topic for full details.</p>
        </div>
        <div class="help-feature">
          <strong>📊 Town Statistics</strong>
          <p>Click "Stats" to see detailed breakdowns — race distribution pie chart, class breakdown, age distribution, role assignments, and all buildings with construction status.</p>
        </div>
      `
    },
    {
      id: 'town-settings',
      icon: '⚙️',
      title: 'Town Settings',
      content: `
        <p>Each town has its own settings that influence AI character generation and simulation behavior. Access via the <strong>⚙️</strong> button in the town roster header.</p>
        
        <h4>Environment</h4>
        <div class="help-feature">
          <strong>🌍 Biome / Terrain</strong>
          <p>Select the environment type (forest, desert, arctic, coastal, mountain cave, urban, etc.). The AI only generates buildings and resources appropriate for this terrain. A desert town won't get fishing docks.</p>
        </div>
        <div class="help-feature">
          <strong>🌾 Local Food Supply (Macro)</strong>
          <p>This is your settlement’s <strong>agrarian capacity</strong> in the abstract macro model — not a literal inventory count in the app, but how efficiently the town turns seasonal surplus into <strong>granary stores</strong> when the campaign macro layer ticks.</p>
          <ul class="help-list">
            <li><strong>Typical</strong> — baseline. Good default for most towns.</li>
            <li><strong>Meager</strong> — harsh land, poor logistics, or chronic strain. Granaries gain stores more slowly when the macro month leaves you with net surplus.</li>
            <li><strong>Bountiful</strong> — rich farms, fisheries, climate, or storage. Granaries rebound faster when times are good.</li>
          </ul>
          <p>Whatever you pick here, <strong>monthly simulation and planning prompts</strong> also receive macro food context (granary index, supply/demand, stability). When pressure is high, the AI is steered to show the town <em>acting</em>: hunts, foraging, rationing drama, and food-related construction. See <strong>Macro Dynamics & Food</strong> for the full picture.</p>
        </div>

        <h4>Demographics</h4>
        <div class="help-feature">
          <strong>📊 Race Distribution</strong>
          <p>Set target percentages for each race (e.g., Goblinoid 75%, Human 15%, Halfling 10%). The AI is <strong>strictly required</strong> to follow these ratios when generating new characters. Percentages should total 100%.</p>
        </div>

        <h4>Generation Rules</h4>
        <div class="help-feature">
          <strong>🎚️ Default Intake Level</strong>
          <p>Set the starting level for new characters:</p>
          <ul class="help-list">
            <li><strong>0</strong> — AI picks an appropriate level (random 1-4 for humanoids, creature-appropriate for monsters)</li>
            <li><strong>1-20</strong> — All new characters arrive at exactly this level</li>
          </ul>
        </div>
        <div class="help-feature">
          <strong>🏔️ Max NPC Level</strong>
          <p>Cap the maximum level any NPC can reach (1-20). Prevents overpowered NPCs in low-level campaigns.</p>
        </div>
        <div class="help-feature">
          <strong>❤️ HP at Level Up</strong>
          <p>Choose how HP is calculated when NPCs level up: <strong>Roll</strong> (random), <strong>Average</strong> (standard), or <strong>Max</strong> (maximum hit die).</p>
        </div>
        <div class="help-feature">
          <strong>📚 Allowed Sources</strong>
          <p>Restrict character options to SRD-only or allow expanded content.</p>
        </div>
        <div class="help-feature">
          <strong>🎒 Starting Equipment</strong>
          <p>Set how much gear new characters arrive with: None, Basic, Standard, or Wealthy.</p>
        </div>
        <div class="help-feature">
          <strong>⚔️ Class Distribution</strong>
          <p>Control the mix of classes: Mostly Commoners, Balanced, or Adventurer-Heavy.</p>
        </div>
        <div class="help-feature">
          <strong>📝 Name Style</strong>
          <p>Influence naming conventions: High Fantasy, Cultural, Real-World, or Whimsical.</p>
        </div>
        <div class="help-feature">
          <strong>📜 Background Complexity</strong>
          <p>How detailed backstories should be: Simple, Standard, Detailed, or Epic.</p>
        </div>
        <div class="help-feature">
          <strong>👤 Age Distribution</strong>
          <p>Population age mix: Young, Prime, Full Range, or Elder-Heavy.</p>
        </div>
      `
    },
    {
      id: 'macro-dynamics',
      icon: '🟣',
      title: 'Macro Dynamics & Food',
      content: `
        <p>Open <strong>🟣 Macro Dynamics</strong> in the sidebar for the campaign-scale layer that sits <em>behind</em> your narratives: seasons, trade routes, abstract supply and demand, granary stores, and stability. It is meant to give the world <strong>coherent economic weather</strong> so simulations do not treat every town as equally fed.</p>

        <h4>What the numbers mean (tone, not census)</h4>
        <p>Macro indices are <strong>normalized campaign signals</strong>. They are not headcounts of sacks of grain in the database; they are inputs the AI interprets as pressure, mood, and opportunity. The <strong>Food</strong> column (and the 🌾 badge on the Dashboard and town roster) is the <strong>granary index</strong>: how full the abstract “larder” feels before the next story month.</p>

        <div class="help-feature">
          <strong>📊 Town metrics table</strong>
          <p><strong>Supply</strong> — seasonal and structural ability to produce or procure essentials.<br>
          <strong>Demand</strong> — consumption pressure (population and activity implied by the model).<br>
          <strong>Food</strong> — granary stores after the last macro steps.<br>
          <strong>Stability</strong> — civic calm vs unrest; very low stability can mean hoarding or riots even when food is middling.<br>
          <strong>Trade</strong> — trade posture for the tick.<br>
          <strong>Hub</strong> — how strongly the town is tied to trade routes on average (better links modestly help supply).<br>
          <strong>Weather Δ</strong> — seasonal bump from the macro weather pass.</p>
        </div>

        <h4>Routes, caravans, and redistribution</h4>
        <p>When you define <strong>trade routes</strong> between towns, macro ticks move food along those roads in abstract “caravan” passes: surplus settlements bleed a little toward hungry neighbors. <strong>Stronger, safer routes</strong> move more than weak or risky ones. Well-connected hubs therefore soften famine-like dips for the whole region — or deepen surplus pockets — depending on how you draw the network.</p>

        <h4>Local Food Supply (Town Settings)</h4>
        <p>Each town’s <strong>Meager / Typical / Bountiful</strong> setting scales how aggressively that settlement converts <strong>net surplus</strong> into granary gains during macro math. Think of it as soil quality, traditions, and storage culture rolled into one dial:</p>
        <ul class="help-list">
          <li><strong>Typical</strong> — standard response (internal multiplier 1.0).</li>
          <li><strong>Meager</strong> — slower store recovery (about 0.78×).</li>
          <li><strong>Bountiful</strong> — faster store recovery when surplus exists (about 1.22×).</li>
        </ul>
        <p>This does not replace storytelling; it biases whether the macro month leaves the granary index <em>closer to feast or famine</em> before the AI reads it.</p>

        <h4>How the AI “knows” the larder</h4>
        <p>Whenever a compatible simulation or planner runs (world sim, single-town sim, chunked narrative, planning passes), the backend attaches:</p>
        <ul class="help-list">
          <li>A one-line <strong>MACRO FOOD / ECONOMY</strong> hint with granary index, supply, demand, stability, and a plain-language band such as stress vs surplus.</li>
          <li>A <strong>TOWN FOOD AUTONOMY</strong> block that picks a <strong>pressure tier</strong> from those numbers (critical, stressed, moderate, comfortable, surplus) and tells the model how insistently citizens should act.</li>
        </ul>

        <div class="help-feature">
          <strong>⚠️ Critical & stressed tiers (what you should see in fiction)</strong>
          <p><strong>Critical</strong> — Survival organizing is mandatory flavor unless you explicitly forbid it in instructions. Named roster NPCs should lead or join hunting, trapping, fishing, or foraging runs (success, failure, or danger). Building proposals should lean into food security: farmsteads, smokehouses, fisheries, granaries, root cellars, mills, orchards, hunter’s lodges — whatever fits the biome. Expect rationing arguments, temple or faction friction, and sharp social memories.</p>
          <p><strong>Stressed</strong> — Tighter stores: smaller bands, seasonal foraging, fence and tool repair, planting prep, hiring specialists. Often one modest food-related build when it fits.</p>
          <p><strong>Comfortable / surplus</strong> — Light agricultural color, markets, modest feasts, trade of extras; the model is told not to invent famine.</p>
          <p><strong>Moderate / mixed</strong> — Hunt-and-field work appears when events support it; very low stability can still trigger hoarding or riots.</p>
        </div>

        <h4>Running macro without advancing the whole story</h4>
        <p>Use <strong>Run macro tick</strong> on this page to advance the macro framework by N months (with an optional operator note) without going through a full world simulation. Calendar-linked play still advances macro when time moves in the normal pipelines — both paths feed the same stored metrics the AI reads next.</p>

        <div class="help-tip">
          💡 <strong>Tip:</strong> Set a border fort to <strong>Meager</strong> and a river valley trading hub to <strong>Bountiful</strong>, then draw a trade route — watch caravan redistribution and autonomy text pull your frontier toward believable scarcity while the heartland stays resilient.
        </div>
      `
    },
    {
      id: 'ai-intake',
      icon: '👥',
      title: 'AI Intake',
      content: `
        <p>The AI Intake bar at the bottom of the Town Roster generates new D&D-legal characters. Standard NPC populations are generated <strong>procedurally</strong> (instantly, no AI credits), while creature/monster intake uses AI.</p>
        
        <div class="help-feature">
          <strong>🔢 Count</strong>
          <p>Set how many characters to generate (1-100). Large numbers are automatically batched into groups of 10.</p>
        </div>
        <div class="help-feature">
          <strong>⚡ Procedural Generation (NPCs)</strong>
          <p>Standard NPC intake uses <strong>no AI credits</strong>. Names, races, classes, roles, and levels are generated procedurally using your town's demographic targets and biome settings. Characters are then optionally fleshed out with backstories via AI.</p>
        </div>
        <div class="help-feature">
          <strong>📝 Instructions</strong>
          <p>Type custom instructions to guide generation. Examples:</p>
          <ul class="help-list">
            <li><code>all dwarves</code> — everyone will be a dwarf</li>
            <li><code>merchants and traders only</code> — specific professions</li>
            <li><code>a family of 4 with 2 parents and 2 children</code> — family groups</li>
            <li><code>all evil-aligned, rogues and assassins</code> — alignment + class</li>
            <li><code>a patrol of 5 guards, all fighters level 3</code> — specific class/level</li>
          </ul>
        </div>
        <div class="help-feature">
          <strong>🎲 Generate</strong>
          <p>Click Generate and characters are produced that respect your town's demographic targets, biome, and generation rules.</p>
        </div>
        <div class="help-tip">
          💡 <strong>Tip:</strong> Leave instructions blank for a natural, diverse population. The system follows your town's demographics, biome, and name style automatically.
        </div>
      `
    },
    {
      id: 'character-import',
      icon: '📥',
      title: 'Character Import',
      content: `
        <p>The <strong>Import</strong> button (📥) in the town roster header opens a flexible import modal. A dropdown lets you choose your import method, with more formats planned for the future.</p>
        
        <h4>Import Methods</h4>
        <div class="help-feature">
          <strong>📋 Paste Statblock</strong>
          <p>Paste a D&D statblock in text format. The parser handles semicolon-separated formats like:</p>
          <p><code>Name: Race Class; CR X; hp XX; AC XX; Init +X; Atk +X melee; AL NG; SV Fort +3, Ref +1, Will +2; Str 14, Dex 12, Con 13, Int 10, Wis 11, Cha 10. Languages: Common. Skills/Feats: Climb +5; Power Attack. Gear: longsword, chain shirt.</code></p>
          <p>Click <strong>Preview</strong> to parse and review, then <strong>Import</strong> to add to the roster. <em>No AI credits used.</em></p>
        </div>
        <div class="help-feature">
          <strong>🤖 AI Character Prompt</strong>
          <p>Describe any character in plain language and the AI generates a complete D&D stat block — ability scores, HP, AC, feats, skills, gear, and backstory — in one click.</p>
          <p>Examples:</p>
          <ul class="help-list">
            <li><em>"A grizzled half-orc barbarian named Krag, level 5, former gladiator turned bounty hunter"</em></li>
            <li><em>"An elderly elven wizard who runs the town's library, specializing in divination magic"</em></li>
            <li><em>"A charismatic halfling bard who secretly works as a spy for the thieves' guild"</em></li>
          </ul>
          <p>Select a <strong>Level Range</strong> (Auto, Low 1-3, Mid-Low 3-6, Mid 5-10, Mid-High 8-14, High 12-20) to control power level. <em>Uses AI credits (one call per character).</em></p>
        </div>
        <div class="help-tip">
          💡 <strong>Tip:</strong> The AI prompt mode is best for creating important, detailed NPCs — quest givers, villains, recurring characters. For filling out general population, use the faster AI Intake bar instead.
        </div>
      `
    },
    {
      id: 'world-simulate',
      icon: '🌍',
      title: 'World Simulate',
      content: `
        <p>The World Simulate page lets you advance time across <strong>all towns simultaneously</strong>. This is the primary way to move your world forward between sessions.</p>
        
        <div class="help-feature">
          <strong>🏰 Town Selection</strong>
          <p>All your towns appear as cards with checkboxes. Select which towns to include in the simulation. Each card shows the town name, population, and has a text area for town-specific instructions.</p>
        </div>
        <div class="help-feature">
          <strong>📝 Per-Town Instructions</strong>
          <p>Each town card has an instruction textarea. Use it for town-specific events: <code>"A mysterious plague spreads"</code> or <code>"A caravan of merchants arrives from the north"</code>.</p>
        </div>
        <div class="help-feature">
          <strong>⏱️ Duration</strong>
          <p>Choose 1-12 months to simulate. Multi-month simulations use AI planning to create story arcs that unfold over time.</p>
        </div>
        <div class="help-feature">
          <strong>👥 Forced Intake</strong>
          <p>Optionally add new residents at the start of the simulation before events begin.</p>
        </div>
        <div class="help-feature">
          <strong>📊 Live Simulation Log</strong>
          <p>When you click "Run World Simulation", a floating modal appears showing real-time progress with icons for each phase: intake, planning, monthly simulation, character movement, and completion. A progress bar tracks overall completion.</p>
        </div>
        <div class="help-feature">
          <strong>🚶 Inter-Town Movement</strong>
          <p>Characters can move between towns during simulation. About 20% of eligible residents (who've lived in town long enough) may relocate, with up to 2 moves per town per month. Town leaders (Mayors, Chieftains, etc.) never move.</p>
        </div>
        <div class="help-feature">
          <strong>🗺️ Map-Aware Travel (optional)</strong>
          <p>If both towns are <strong>pinned</strong> on the <strong>World Map</strong> (and not hidden from the map), the sim estimates distance and travel days from your calibration. Longer routes reduce the chance that a character chooses that destination; the live log and Movement tab can show miles and days.</p>
        </div>
        <div class="help-feature">
          <strong>📋 Tabbed Results</strong>
          <p>After simulation, results are organized in tabs:</p>
          <ul class="help-list">
            <li><strong>Narratives</strong> — Story prose for each town/month</li>
            <li><strong>Arrivals</strong> — New characters generated</li>
            <li><strong>Births</strong> — Children born during simulation</li>
            <li><strong>Deaths</strong> — Characters who died (with cause)</li>
            <li><strong>Events</strong> — Notable happenings</li>
            <li><strong>Movement</strong> — Characters who moved between towns</li>
          </ul>
        </div>
        <div class="help-feature">
          <strong>🌾 Macro food & subsistence (automatic)</strong>
          <p>Each town’s simulation sees a short <strong>macro food / economy</strong> readout (granary index, supply, demand, stability) plus <strong>town food autonomy</strong> instructions. The model is nudged to treat citizens as proactive: organized hunts, foraging, fisheries, rationing tension, and food-related building work when pressure is high — and lighter market or harvest color when times are easy. Multi-month runs also get planning guidance to weave subsistence beats across the arc.</p>
        </div>
        <div class="help-tip">
          💡 <strong>Tip:</strong> Results are applied automatically after each month. The narrative and results are saved to the town's history for reference later.
        </div>
      `
    },
    {
      id: 'world-map',
      icon: '🗺️',
      title: 'World Map & Travel',
      content: `
        <p>Attach a visual map to your campaign, place towns on it, and feed travel distance into the <strong>travel estimator</strong> and (when pins exist) <strong>World Simulate</strong> inter-town movement.</p>

        <div class="help-feature">
          <strong>📤 Upload & settings</strong>
          <p>Upload a PNG, JPEG, WebP, or GIF. Set <strong>Scale (mi / unit)</strong> — miles per pixel (or per map coordinate unit — it matches how you calibrate). Set <strong>Travel hours / day</strong> for how many hours of marching count per day toward travel time. Click <strong>Save Settings</strong>.</p>
        </div>
        <div class="help-feature">
          <strong>📏 Calibrate scale on map</strong>
          <p>Click <strong>Calibrate scale on map</strong>, then click-drag on the image to draw a reference line across a known distance (e.g. a scale bar or road segment). Enter <strong>This line's distance (miles)</strong> and click <strong>Apply calibration</strong>. Press <kbd>Esc</kbd> or use <strong>Clear line</strong> to cancel. The scale field updates automatically; you can still edit it by hand.</p>
        </div>
        <div class="help-feature">
          <strong>📍 Pins & roster</strong>
          <p>Choose a town from <strong>Place / move pin</strong>, then click empty map to drop or move its marker. <strong>Click a pin</strong> to open that town's roster. The <strong>Pinned locations</strong> list includes a quick <strong>Roster</strong> action.</p>
        </div>
        <div class="help-feature">
          <strong>👁️ Hide from map</strong>
          <p>Use the per-town checkbox so a settlement stays in the campaign but has <strong>no pin</strong> — nothing roster-linked to click on the map. Hidden towns are excluded from the travel estimator and from map-based movement math.</p>
        </div>
        <div class="help-feature">
          <strong>🧭 Travel estimator</strong>
          <p>Pick <strong>From</strong> and <strong>To</strong> among pinned towns (not hidden) and click <strong>Estimate</strong> for approximate distance and duration using your scale and hours/day.</p>
        </div>
      `
    },
    {
      id: 'town-history',
      icon: '📜',
      title: 'Town History',
      content: `
        <p>The Town History modal (📖 button in the roster) shows a complete record of everything that has happened in your town. It works like a mini simulation summary for each month.</p>
        
        <div class="help-feature">
          <strong>📊 Overall Stats</strong>
          <p>At the top, stat boxes show total entries, living population, deceased count, and total characters ever created.</p>
        </div>
        <div class="help-feature">
          <strong>📜 Timeline Tab</strong>
          <p>A scrollable list of all months as clickable cards. Each card shows the month name, title, and mini-badges for arrivals, births, deaths, and events detected in that month's narrative.</p>
        </div>
        <div class="help-feature">
          <strong>🔎 Month Detail View</strong>
          <p>Click any month card to drill into its detail view with:</p>
          <ul class="help-list">
            <li>Per-month stat boxes (arrivals, births, deaths, events)</li>
            <li>Tabbed content: Narrative text, Arrivals table, Births table, Deaths table</li>
            <li>Character details matched against the actual character database</li>
            <li>"← Back to Timeline" button to return</li>
          </ul>
        </div>
        <div class="help-feature">
          <strong>🧑 Living / 💀 Deceased Tabs</strong>
          <p>Quick-access tables showing all currently alive characters and all deceased characters with their cause of death.</p>
        </div>
        <div class="help-feature">
          <strong>📅 Year Filter</strong>
          <p>Filter the timeline by year to quickly navigate to a specific period.</p>
        </div>
      `
    },
    {
      id: 'character-sheet',
      icon: '📄',
      title: 'Character Sheets',
      content: `
        <p>Click any character in the roster to see their detailed character sheet. The sheet is divided into tabs covering all aspects of the character.</p>
        
        <div class="help-feature">
          <strong>🎯 Core Stats</strong>
          <p>Ability scores (STR, DEX, CON, INT, WIS, CHA) with modifiers, HP with adjustable current HP, AC, saves, BAB, initiative, and speed. Click saves or skills to roll dice.</p>
        </div>
        <div class="help-feature">
          <strong>⚔️ Inventory & Feats</strong>
          <p>Equipment paperdoll with equip/unequip slots (Head, Body, Hands, Ring, Feet, Shield), backpack, coin purse (PP/GP/EP/SP/CP), and complete feats list. Equipping armor automatically updates AC.</p>
        </div>
        <div class="help-feature">
          <strong>✨ Spells</strong>
          <p>For spellcasting classes — spell slots per level, known/prepared spells list with descriptions. Shows spell save DC and caster level.</p>
        </div>
        <div class="help-feature">
          <strong>💕 Social</strong>
          <p>Relationships (friends, rivals, enemies, romantic partners, family, mentors, allies) with disposition scores. Memories of significant events. Add relationships and memories manually.</p>
        </div>
        <div class="help-feature">
          <strong>📈 XP Log</strong>
          <p>Monthly log of XP gains with reasons and game dates. Shows how a character has progressed over time through simulation.</p>
        </div>
        <div class="help-feature">
          <strong>📝 Background</strong>
          <p>Personal history, backstory, personality traits, and portrait.</p>
        </div>
        <div class="help-feature">
          <strong>📷 Portrait Upload</strong>
          <p>Click the character's portrait in the sheet header to upload a custom image. A camera icon overlay appears on hover. Images are automatically resized and optimized. You can also upload portraits from the Background tab.</p>
        </div>
        <div class="help-feature">
          <strong>Action Buttons</strong>
          <ul class="help-list">
            <li><strong>✏️ Edit</strong> — Modify any field (stats, name, race, class, etc.)</li>
            <li><strong>⬆️ Level Up</strong> — AI-assisted leveling wizard (see Level Up topic)</li>
            <li><strong>📄 PDF Export</strong> — Download a formatted character sheet PDF</li>
            <li><strong>🗑️ Delete</strong> — Permanently remove the character</li>
          </ul>
        </div>
      `
    },
    {
      id: 'level-up',
      icon: '⬆️',
      title: 'Level Up',
      content: `
        <p>The Level Up wizard handles all the complex calculations of D&D leveling. Access it from the ⬆️ button on any character sheet.</p>
        
        <div class="help-feature">
          <strong>🤖 AI-Assisted Leveling</strong>
          <p>The AI analyzes the character's class, race, existing feats, and backstory to make appropriate leveling choices including:</p>
          <ul class="help-list">
            <li>HP roll (based on your town's HP rule: Roll, Average, or Max)</li>
            <li>Skill point allocation</li>
            <li>Feat selection (at appropriate levels)</li>
            <li>New class features</li>
            <li>Spell selection for casters</li>
            <li>Ability score increases (at 4th, 8th, 12th, 16th, 20th level)</li>
          </ul>
        </div>
        <div class="help-feature">
          <strong>🏔️ Max Level Cap</strong>
          <p>Characters cannot level beyond the Max NPC Level set in Town Settings (default: 20).</p>
        </div>
        <div class="help-feature">
          <strong>📊 Auto Level-Up in Simulation</strong>
          <p>During simulation, characters who earn enough XP are automatically leveled up by the AI. The XP Log tracks all gains and reasons.</p>
        </div>
      `
    },
    {
      id: 'social-system',
      icon: '💕',
      title: 'Social System',
      content: `
        <p>Eon Weaver tracks a web of NPC-NPC relationships that evolve organically through simulation.</p>
        
        <div class="help-feature">
          <strong>Relationship Types</strong>
          <ul class="help-list">
            <li><strong>Romantic</strong> — Couples, lovers, betrothed</li>
            <li><strong>Parent</strong> — Parent-child family bonds</li>
            <li><strong>Friend</strong> — Close friends, drinking buddies</li>
            <li><strong>Rival</strong> — Professional competitors, jealous neighbours</li>
            <li><strong>Enemy</strong> — Hatred, blood feuds, bitter grudges</li>
            <li><strong>Mentor</strong> — Master/apprentice, teacher/student</li>
            <li><strong>Ally</strong> — Political or professional allies</li>
          </ul>
        </div>
        <div class="help-feature">
          <strong>📊 Disposition</strong>
          <p>Each relationship has a score (-10 to +10) indicating intensity. Positive = warm, negative = hostile. The AI evolves these over time.</p>
        </div>
        <div class="help-feature">
          <strong>🧠 Memories</strong>
          <p>Characters accumulate memories of events — both positive and negative. The AI references these in future simulations to create continuity and callbacks.</p>
        </div>
        <div class="help-feature">
          <strong>🏛️ Factions</strong>
          <p>NPCs can form factions based on shared interests, professions, or grievances. Factions have leaders, goals, and inter-faction diplomacy.</p>
        </div>
        <div class="help-tip">
          💡 <strong>Tip:</strong> Manually add a key relationship before simulating (e.g. making two characters enemies), and the AI will build on that tension in future simulations!
        </div>
      `
    },
    {
      id: 'buildings',
      icon: '🏗️',
      title: 'Buildings',
      content: `
        <p>Towns start as <strong>empty land with no structures</strong>. Buildings are constructed organically over time through simulation.</p>
        
        <div class="help-feature">
          <strong>🔨 Construction System</strong>
          <p>During simulations, the AI proposes building construction based on the town's needs, population, and resources. Each building has a realistic timeline:</p>
          <ul class="help-list">
            <li><strong>Small</strong> (shed, well, fence) — 1 month</li>
            <li><strong>Medium</strong> (house, shop, smithy) — 2-3 months</li>
            <li><strong>Large</strong> (temple, barracks, mill) — 4-6 months</li>
          </ul>
        </div>
        <div class="help-feature">
          <strong>📊 Progress Tracking</strong>
          <p>Buildings in progress show progress bars (e.g. "2/4 months — 50%"). They carry over between simulations and complete in future months.</p>
        </div>
        <div class="help-feature">
          <strong>🌍 Biome Awareness</strong>
          <p>The AI only proposes buildings appropriate for the town's biome. A desert town won't get fishing docks, and a coastal settlement won't get a mine.</p>
        </div>
        <div class="help-feature">
          <strong>🌾 Food pressure & construction</strong>
          <p>When macro granaries are tight, simulation prompts explicitly steer the model toward <strong>food-security building work</strong> (farms, smokehouses, fisheries, granaries, and similar) and away from ignoring hunger. That complements ordinary needs-based construction — see <strong>Macro Dynamics & Food</strong>.</p>
        </div>
        <div class="help-feature">
          <strong>⚠️ Damage & Destruction</strong>
          <p>Conflicts, raids, or natural disasters during simulation can damage or destroy existing buildings. Damaged buildings may need repair.</p>
        </div>
        <div class="help-tip">
          💡 <strong>Tip:</strong> Run multiple months of simulation to watch your settlement grow from empty ground into a thriving town with smithies, taverns, temples, and more!
        </div>
      `
    },
    {
      id: 'encounters',
      icon: '⚔️',
      title: 'Encounters',
      content: `
        <p>Plan and run combat encounters for your party. The encounter system helps you balance fights and track initiative.</p>
        
        <div class="help-feature">
          <strong>📋 Encounter List</strong>
          <p>Create encounters by name. Encounters save with their monster groups so you can prep ahead of time.</p>
        </div>
        <div class="help-feature">
          <strong>🐉 Add Monsters</strong>
          <p>Add SRD monsters to encounters. Search by name or CR. Adjust quantities and customize stats as needed.</p>
        </div>
        <div class="help-feature">
          <strong>⚖️ CR Calculator</strong>
          <p>See the total CR and difficulty rating for your party's average level.</p>
        </div>
        <div class="help-feature">
          <strong>🎯 Initiative Tracker</strong>
          <p>Roll initiative, track turn order, manage HP/damage, and apply conditions during combat. Click the ▶️ button to start the encounter.</p>
        </div>
      `
    },
    {
      id: 'ai-scribe',
      icon: '✍️',
      title: 'AI Scribe',
      content: `
        <p><strong>AI Scribe</strong> (Arcane Workshop) generates campaign-aware markdown: lore, quests, dungeons, magic items, and traps. Output uses your towns, NPCs, and campaign rules as context.</p>

        <div class="help-feature">
          <strong>🛠️ Tools (tabs)</strong>
          <p><strong>Lore Scribe</strong> — places, factions, histories. <strong>Quest Forge</strong> — adventure hooks and quest outlines. <strong>Dungeon Architect</strong> — keyed locations and encounters. <strong>Item Enchanter</strong> and <strong>Trap Designer</strong> — gear and hazards. Each tab has its own parameters; click <strong>Generate Content</strong> when ready.</p>
        </div>
        <div class="help-feature">
          <strong>📚 Your library</strong>
          <p>Save the current output with <strong>Save current output</strong>. Open any saved piece to read, <strong>Edit as markdown</strong>, save edits, or delete. Library entries are per campaign.</p>
        </div>
        <div class="help-feature">
          <strong>🏘️ Add to town roster</strong>
          <p>For some generators (e.g. dungeons, or lore when scoped as a location), you may see <strong>Add to town roster</strong>. This path creates a <strong>new town</strong> for the import and attaches generated buildings or creatures — it does not merge into a town you have open elsewhere. Confirm dialogs may apply when AI credits are used for creature intake.</p>
        </div>
        <div class="help-tip">
          💡 <strong>Tip:</strong> Large generations cost AI credits (see <strong>Campaign Settings</strong> in this guide). The sidebar shows your 🪙 balance and monthly usage.
        </div>
        <div class="help-incomplete">
          <span class="help-incomplete-label">Expanding</span>
          <p>Import rules for dungeons vs. lore vary by tab and content shape. If roster actions do not appear, try another generator or a clearer location-themed output.</p>
        </div>
      `
    },
    {
      id: 'party',
      icon: '🛡️',
      title: 'Party',
      content: `
        <p>The Party page lets you designate NPCs as player characters and track party composition across your campaign.</p>
        
        <div class="help-feature">
          <strong>➕ Add to Party</strong>
          <p>Select characters from any town to add to the active adventuring party. Characters can be in the party and still live in their town.</p>
        </div>
        <div class="help-feature">
          <strong>📊 Party Overview</strong>
          <p>See party stats, average level, and class composition at a glance. Click any party member to open their full character sheet.</p>
        </div>
        <div class="help-feature">
          <strong>🏠 Cross-Town</strong>
          <p>Party members can come from different towns. They'll still participate in their home town's simulations.</p>
        </div>
      `
    },
    {
      id: 'srd-browser',
      icon: '📖',
      title: 'SRD Browser',
      content: `
        <p>Browse the complete D&D System Reference Document. The SRD browser tabs adapt based on your campaign's selected edition.</p>
        
        <div class="help-feature">
          <strong>📊 Classes</strong>
          <p>Browse all base classes with full progression tables, class features, hit dice, skills, and descriptions.</p>
        </div>
        <div class="help-feature">
          <strong>🏅 Feats</strong>
          <p>Search and filter the feat list. See prerequisites, types (General, Fighter, Metamagic, etc.), and full descriptions.</p>
        </div>
        <div class="help-feature">
          <strong>✨ Spells</strong>
          <p>Complete spell database filterable by class, level, and school. Click any spell for its full stat block.</p>
        </div>
        <div class="help-feature">
          <strong>🎒 Equipment</strong>
          <p>Weapons, armor, adventuring gear — with stats, costs, weights, and properties.</p>
        </div>
        <div class="help-feature">
          <strong>🧠 Skills</strong>
          <p>Split-panel view with skill list and detailed descriptions including check DCs and special uses.</p>
        </div>
      `
    },
    {
      id: 'homebrew',
      icon: '🧪',
      title: 'Homebrew',
      content: `
        <p>Create <strong>campaign-specific</strong> content that supplements the SRD: custom races, classes, feats, spells, equipment, and monsters.</p>

        <div class="help-feature">
          <strong>📑 Tabs & CRUD</strong>
          <p>Switch tabs for each content type. Use <strong>+ New …</strong> to add an entry, open a card to edit, and save or delete. Homebrew is stored on your account and used where the app allows custom options (e.g. future character options hooks).</p>
        </div>
        <div class="help-incomplete">
          <span class="help-incomplete-label">Integration depth varies</span>
          <p>Not every intake or simulation path references every homebrew type yet. Prefer SRD options when you need guaranteed simulation coverage; homebrew is ideal for table-facing reference and planned hooks.</p>
        </div>
      `
    },
    {
      id: 'content-library',
      icon: '📁',
      title: 'Content Library',
      content: `
        <p>Personal file storage for maps, handouts, and assets — drag-and-drop or browse uploads with optional descriptions.</p>

        <div class="help-feature">
          <strong>📤 Uploads</strong>
          <p>Supports JPG, PNG, WEBP, GIF, PDF, TXT, MD, and JSON. Choose a file type (map, handout, asset, document), optionally describe it, then upload. Files are scoped to your account with usage feedback on the page.</p>
        </div>
        <div class="help-feature">
          <strong>🗺️ vs World Map</strong>
          <p>The Content Library is general-purpose storage. The <strong>World Map</strong> page is for the interactive campaign map that pins towns and drives travel math.</p>
        </div>
      `
    },
    {
      id: 'calendar',
      icon: '📅',
      title: 'Calendar',
      content: `
        <p>Track in-game time with a fully customizable calendar system. Open <strong>📅 Calendar</strong> in the sidebar to edit structure and the current date.</p>
        
        <div class="help-feature">
          <strong>📆 Current date & structure</strong>
          <p>Edit <strong>day</strong>, <strong>month index</strong>, <strong>year</strong>, and <strong>era</strong> name. Configure how many <strong>months</strong> exist and how many <strong>days</strong> each month has. Add or remove months with the +/− controls.</p>
        </div>
        <div class="help-feature">
          <strong>📆 Week layout</strong>
          <p>Set <strong>days per week</strong> and name each weekday plus abbreviations (used in Town History and other calendar grids).</p>
        </div>
        <div class="help-feature">
          <strong>⏩ Auto-Advance</strong>
          <p>The calendar advances when you run <strong>World Simulate</strong> (and related pipelines). The formatted date stays visible in the sidebar.</p>
        </div>
        <div class="help-feature">
          <strong>📊 History Integration</strong>
          <p>History entries use calendar month names in their headings, so you can see when events happened in your world's timeline.</p>
        </div>
        <div class="help-incomplete">
          <span class="help-incomplete-label">Diagnostics</span>
          <p>The <strong>Test: advance 1 day</strong> button on the Calendar page is for troubleshooting (it calls the advance API once). It is not the normal way to progress your campaign — use simulation for story time.</p>
        </div>
      `
    },
    {
      id: 'campaigns',
      icon: '📜',
      title: 'Campaigns',
      content: `
        <p>Campaigns are top-level containers for your entire world. Each campaign has its own set of towns, characters, calendar, and rules.</p>
        
        <div class="help-feature">
          <strong>🔄 Switching Campaigns</strong>
          <p>Click the campaign name in the sidebar to open the campaign switcher dropdown. Click any campaign to instantly switch to it — all views update to show that campaign's data.</p>
        </div>
        <div class="help-feature">
          <strong>➕ Creating Campaigns</strong>
          <p>Create new campaigns from <strong>⚙️ Settings</strong>. Each campaign gets its own D&D edition, calendar, house rules, and simulation settings.</p>
        </div>
        <div class="help-feature">
          <strong>🎲 Edition Support</strong>
          <p>Eon Weaver supports multiple D&D editions:</p>
          <ul class="help-list">
            <li><strong>D&D 3.5e</strong> — Full SRD with classes, feats, spells, skills, equipment</li>
            <li><strong>D&D 5e 2014</strong> — 5th Edition SRD content</li>
            <li><strong>D&D 5e 2024</strong> — Revised 5th Edition SRD</li>
          </ul>
        </div>
      `
    },
    {
      id: 'settings',
      icon: '⚙️',
      title: 'Campaign Settings',
      content: `
        <p>Configure campaign-wide settings that apply to all towns and simulations.</p>
        
        <div class="help-feature">
          <strong>🌍 Campaign Description & House Rules</strong>
          <p>Describe your world setting and define house rules. These are automatically fed to the AI during <em>all</em> simulations and character generation. Great for setting tone, lore, and special world rules.</p>
        </div>
        <div class="help-feature">
          <strong>⚡ Simulation Settings</strong>
          <p>Fine-tune simulation behavior:</p>
          <ul class="help-list">
            <li><strong>XP Speed</strong> — How fast characters gain experience</li>
            <li><strong>Relationship Speed</strong> — How quickly NPCs form bonds</li>
            <li><strong>Birth Rate</strong> — How often children are born</li>
            <li><strong>Death Threshold</strong> — Population cap before death rate increases</li>
            <li><strong>Child Growth</strong> — How fast children mature</li>
            <li><strong>Conflict Frequency</strong> — How much drama, violence, and strife occurs</li>
          </ul>
        </div>
        <div class="help-feature">
          <strong>📜 Campaign Management</strong>
          <p>Create, rename, and delete campaigns. Switch between campaigns from the sidebar dropdown.</p>
        </div>
        <div class="help-feature">
          <strong>🪙 AI credits (TC)</strong>
          <p>The sidebar shows your credit balance (🪙) and usage this month. AI-powered actions (scribe, simulation, imports that call the model, etc.) consume credits; procedural intake does not. Confirm dialogs appear when a step has a meaningful cost.</p>
        </div>
        <div class="help-tip">
          💡 <strong>Tip:</strong> Set Conflict Frequency to "Frequent" for a grittier, more dangerous world. Set it to "Rare" for a peaceful farming village vibe.
        </div>
      `
    },
    {
      id: 'pdf-export',
      icon: '📄',
      title: 'PDF Export',
      content: `
        <p>Export any character as a formatted PDF character sheet, ready for printing or sharing with your players.</p>
        
        <div class="help-feature">
          <strong>📄 How to Export</strong>
          <p>Open a character sheet, then click the <strong>📄 PDF</strong> button in the action bar. The PDF is generated client-side and downloaded immediately.</p>
        </div>
        <div class="help-feature">
          <strong>📊 What's Included</strong>
          <p>The PDF contains all character data: ability scores, combat stats, feats, skills, spells, equipment, backstory, and portrait (if uploaded).</p>
        </div>
      `
    },
    {
      id: 'monthly-simulation',
      icon: '⏩',
      title: 'Monthly Simulation (one town)',
      content: `
        <p>Open <strong>⏩ Monthly Simulation</strong> in the sidebar (Settlement) or jump from the Dashboard quick actions. This is the <strong>single-town</strong> pipeline: plan → run → preview JSON → apply changes. It uses the <strong>town you last opened</strong> (<code>current town</code>).</p>
        <div class="help-feature">
          <strong>vs World Simulate</strong>
          <p><strong>World Simulate</strong> advances <em>every selected town</em> together with travel between settlements. <strong>Monthly Simulation</strong> focuses on <em>one</em> town’s month(s), with partial-day options and apply/reject before writing to the DB.</p>
        </div>
        <div class="help-feature">
          <strong>Prerequisites</strong>
          <p>Select a town from the <strong>Dashboard</strong> or <strong>Town Roster</strong> first. Without a current town, the page prompts you to pick one.</p>
        </div>
      `
    },
    {
      id: 'town-stats',
      icon: '📈',
      title: 'Town Stats',
      content: `
        <p><strong>Town Stats</strong> summarizes population, demographics, roles, buildings, and recent history for the active town. Use it between simulations to spot drift in level mix, housing, or graveyard counts.</p>
        <div class="help-feature">
          <strong>Which town?</strong>
          <p>The page uses the town in the URL (<code>/townstats/&lt;id&gt;</code>) if present; otherwise the <strong>last town you had open</strong>. Open a town from the Dashboard first if you see “No Town Selected.”</p>
        </div>
      `
    },
    {
      id: 'wiki-lore',
      icon: '🔵',
      title: 'Wiki & Lore',
      content: `
        <p>Campaign wiki pages for places, factions, and lore — <strong>markdown</strong> articles scoped to your campaign. Use it as a player-facing or DM prep reference alongside <strong>AI Scribe</strong> output.</p>
        <div class="help-feature">
          <strong>Editing</strong>
          <p>Create and edit articles from the Wiki view; search helps find pages as the library grows.</p>
        </div>
      `
    },
    {
      id: 'player-portal',
      icon: '🔶',
      title: 'Player Portal',
      content: `
        <p>A <strong>player-facing</strong> surface for shared campaign content (read-focused views). DM-only actions stay in the main sidebar; use this when you want players to follow hooks without opening the full DM shell.</p>
      `
    },
    {
      id: 'vtt-export',
      icon: '📦',
      title: 'VTT Export',
      content: `
        <p>Export party or encounter data to structured formats for virtual tabletop tools. Pick targets from your campaign, download JSON or bundled exports, and import into your VTT workflow.</p>
      `
    },
    {
      id: 'integrations',
      icon: '🤖',
      title: 'Integrations',
      content: `
        <p>Connect external services — e.g. <strong>Discord webhooks</strong> for notifications. Save URLs and toggles here; secrets are not echoed back in the browser console in production builds.</p>
      `
    },
    {
      id: 'subscription-plans',
      icon: '💎',
      title: 'Plans & credits',
      content: `
        <p>Open <strong>💎 Plans</strong> for tier catalog, monthly <strong>Eon Credits</strong> allowances, and subscription context. Checkout may be manual today — tiers can still be adjusted by admins.</p>
        <div class="help-feature">
          <strong>Credits</strong>
          <p>The sidebar shows balance (🪙) and usage. AI-heavy flows (scribe, simulation, some imports) consume credits; procedural roster intake does not.</p>
        </div>
      `
    },
    {
      id: 'tips',
      icon: '⌨️',
      title: 'Tips & Tricks',
      content: `
        <div class="help-feature">
          <strong>🔄 Hard Refresh</strong>
          <p>If the site isn't showing recent updates, press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd> to force-refresh cached assets.</p>
        </div>
        <div class="help-feature">
          <strong>🏗️ Fresh Towns Start Empty</strong>
          <p>New towns have no buildings — settlers arrive first, then construction begins through simulation. This creates a natural town development arc.</p>
        </div>
        <div class="help-feature">
          <strong>⚔️ Equip Gear = Roster Update</strong>
          <p>Equipping or unequipping items on a character's sheet instantly updates their AC in the town roster.</p>
        </div>
        <div class="help-feature">
          <strong>🎲 Click to Roll</strong>
          <p>In character sheets, click saves, skills, or attack entries to roll dice. Results appear in the Roll Log at the bottom of the sheet.</p>
        </div>
        <div class="help-feature">
          <strong>💾 Auto-Save</strong>
          <p>Character edits save when you click "Save" in the edit modal. Simulation changes are applied automatically per-month during World Simulate.</p>
        </div>
        <div class="help-feature">
          <strong>🌍 Town Setup Checklist</strong>
          <p>For the best experience with a new town:</p>
          <ul class="help-list">
            <li>Set the <strong>biome/terrain</strong> in Town Settings before generating characters</li>
            <li>Set <strong>demographic targets</strong> for the race mix you want</li>
            <li>Set <strong>local food supply</strong> (Meager / Typical / Bountiful) if you care how hard macro seasons hit this settlement</li>
            <li>Configure <strong>intake level</strong> (0 = AI decides, or set a specific level)</li>
            <li>Write <strong>Campaign Description & House Rules</strong> in Settings for lore-consistent generation</li>
            <li>Generate initial settlers, then <strong>simulate several months</strong> to build up the town organically</li>
            <li>Optional: use <strong>🗺️ World Map</strong> for pins and travel, and <strong>✍️ AI Scribe</strong> / <strong>📁 Content Library</strong> for prep materials</li>
          </ul>
        </div>
        <div class="help-feature">
          <strong>🐛 Bug Reports</strong>
          <p>Found a bug? Click the <strong>🐛 Report Bug</strong> button in the sidebar footer. Reports are sent directly to the development team via Discord.</p>
        </div>
        <div class="help-feature">
          <strong>📱 Mobile</strong>
          <p>Eon Weaver works on mobile devices, but the full experience (split-panel roster, character sheets) is designed for desktop browsers.</p>
        </div>
      `
    }
  ];

  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  /** Collapsible groups — each section id appears exactly once. */
  const HELP_GROUPS = [
    { id: 'g-start', label: 'Getting started', sectionIds: ['getting-started', 'dashboard', 'tips'] },
    { id: 'g-towns', label: 'Towns & characters', sectionIds: ['town-roster', 'town-settings', 'town-stats', 'ai-intake', 'character-import', 'character-sheet', 'level-up', 'social-system', 'buildings', 'pdf-export'] },
    { id: 'g-world', label: 'World & simulation', sectionIds: ['macro-dynamics', 'monthly-simulation', 'world-simulate', 'world-map', 'town-history', 'calendar'] },
    { id: 'g-table', label: 'Table & sessions', sectionIds: ['party', 'player-portal', 'encounters', 'ai-scribe', 'vtt-export'] },
    { id: 'g-library', label: 'Library & rules', sectionIds: ['content-library', 'wiki-lore', 'srd-browser', 'homebrew'] },
    { id: 'g-connect', label: 'Integrations', sectionIds: ['integrations'] },
    { id: 'g-account', label: 'Campaign & settings', sectionIds: ['campaigns', 'settings', 'subscription-plans'] },
  ];

  /** Short native tooltips on key topics (hover the row). */
  const SECTION_HINTS = {
    'getting-started': 'Step-by-step: campaign, town, intake, simulate.',
    'dashboard': 'Town cards, quick simulate, and stats entry points.',
    'world-simulate': 'Pick towns and months; AI applies events and roster changes.',
    'monthly-simulation': 'Single-town month(s): plan, run, apply — one settlement.',
    'macro-dynamics': 'Campaign food, seasons, granary index — context for narration.',
    'town-roster': 'Sort/filter NPCs, open sheets, graveyard, town history.',
    'town-stats': 'Demographics, buildings, roster aggregates for one town.',
    'town-settings': 'Biome, demographics, food supply, intake rules, generation knobs.',
    'ai-intake': 'Generate new fully statted settlers (procedural; not LLM-heavy).',
    'settings': 'House rules, campaign blurb, simulation speeds, credits.',
    'calendar': 'Custom months and weekdays; advances with world simulation.',
    'ai-scribe': 'Lore, quests, dungeons — uses campaign context; may use EC.',
    'wiki-lore': 'Campaign markdown wiki — places, factions, lore.',
    'player-portal': 'Player-facing read views for your table.',
    'vtt-export': 'Export structures for virtual tabletop tools.',
    'integrations': 'Discord webhooks and external hooks.',
    'subscription-plans': 'Tiers, monthly AI credit allowances.',
    'tips': 'Shortcuts, refresh, checklist, bug reports.',
  };

  const sectionById = Object.fromEntries(sections.map((s) => [s.id, s]));

  let activeTab = sections[0].id;

  function helpNavGroupsHtml(currentId) {
    return HELP_GROUPS.map((group) => {
      const hasActive = group.sectionIds.includes(currentId);
      const collapsedClass = hasActive ? '' : ' is-collapsed';
      const expanded = hasActive ? 'true' : 'false';
      const items = group.sectionIds
        .map((sid) => {
          const s = sectionById[sid];
          if (!s) return '';
          const hint = SECTION_HINTS[sid];
          const tipAttr = hint ? ` data-tip="${escapeAttr(hint)}"` : '';
          return `
            <button type="button" class="help-tab-btn${s.id === currentId ? ' active' : ''}" data-tab="${escapeAttr(s.id)}"${tipAttr}>
              <span class="help-tab-icon">${s.icon}</span>
              <span class="help-tab-label">${escapeAttr(s.title)}</span>
            </button>
          `;
        })
        .join('');
      return `
        <div class="help-nav-group${collapsedClass}" data-help-group="${escapeAttr(group.id)}">
          <button type="button" class="help-group-toggle" aria-expanded="${expanded}" aria-controls="help-topics-${group.id}" data-tip="Show or hide topics in this section">
            <span class="help-group-chevron" aria-hidden="true">▾</span>
            <span class="help-group-label">${escapeAttr(group.label)}</span>
          </button>
          <div class="help-group-topics" id="help-topics-${group.id}" role="group">
            ${items}
          </div>
        </div>
      `;
    }).join('');
  }

  function showHelpSection(section) {
    const contentEl = container.querySelector('#help-tab-content');
    if (!contentEl || !section) return;
    contentEl.innerHTML = `
        <div class="help-content-header">
          <span class="help-content-icon">${section.icon}</span>
          <h2 class="help-content-title">${section.title}</h2>
        </div>
        <div class="help-content-body">
          ${section.content}
        </div>
      `;
    contentEl.scrollTop = 0;
  }

  container.innerHTML = `
    <div class="view-help">
      <div class="help-header">
        <h1 class="help-title">📚 Eon Weaver Guide</h1>
        <p class="help-subtitle">Open a section below, then pick a topic. Hover some rows for a quick summary.</p>
      </div>
      
      <div class="help-tabbed-layout">
        <div class="help-tab-list" id="help-tab-list" role="navigation" aria-label="Help topics">
          ${helpNavGroupsHtml(activeTab)}
        </div>
        <div class="help-tab-content" id="help-tab-content">
          <div class="help-content-header">
            <span class="help-content-icon">${sections[0].icon}</span>
            <h2 class="help-content-title">${sections[0].title}</h2>
          </div>
          <div class="help-content-body">
            ${sections[0].content}
          </div>
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll('.help-group-toggle').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const group = btn.closest('.help-nav-group');
      if (!group) return;
      group.classList.toggle('is-collapsed');
      const collapsed = group.classList.contains('is-collapsed');
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    });
  });

  // Wire tab clicks
  container.querySelectorAll('.help-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      const section = sectionById[tabId];
      if (!section) return;

      const parent = btn.closest('.help-nav-group');
      if (parent) {
        parent.classList.remove('is-collapsed');
        parent.querySelector('.help-group-toggle')?.setAttribute('aria-expanded', 'true');
      }

      container.querySelectorAll('.help-tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = tabId;
      showHelpSection(section);
    });
  });
}
