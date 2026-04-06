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
              <p>Open your town, click <strong>⚙️ Settings</strong> to set the biome, demographics (race percentages), intake level, and generation rules <em>before</em> populating.</p>
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
        <p>The Dashboard is your home base. It shows all your towns at a glance with population counts and quick actions.</p>
        
        <div class="help-feature">
          <strong>🏰 Town Cards</strong>
          <p>Each town displays its name, subtitle, and living population count. Click the card to open the town roster.</p>
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
          <strong>⚙️ Town Settings</strong>
          <p>Configure biome, demographics, generation rules, and more. See the <strong>Town Settings</strong> topic for full details.</p>
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
      id: 'ai-intake',
      icon: '👥',
      title: 'AI Intake',
      content: `
        <p>The AI Intake bar at the bottom of the Town Roster generates new D&D-legal characters using AI. Characters arrive fully statted with abilities, HP, AC, feats, skills, spells, equipment, and backstory.</p>
        
        <div class="help-feature">
          <strong>🔢 Count</strong>
          <p>Set how many characters to generate (1-100). Large numbers are automatically batched into groups of 10.</p>
        </div>
        <div class="help-feature">
          <strong>📝 Instructions</strong>
          <p>Type custom instructions to guide generation. Examples:</p>
          <ul class="help-list">
            <li><code>all dwarves</code> — everyone will be a dwarf</li>
            <li><code>merchants and traders only</code> — specific professions</li>
            <li><code>a family of 4 with 2 parents and 2 children</code> — family groups</li>
            <li><code>all evil-aligned, rogues and assassins</code> — alignment + class</li>
            <li><code>noble elves with high CHA</code> — race + stat preferences</li>
            <li><code>a patrol of 5 guards, all fighters level 3</code> — specific class/level</li>
          </ul>
        </div>
        <div class="help-feature">
          <strong>🎲 Generate</strong>
          <p>Click Generate and the AI produces characters that respect your town's demographic targets, biome, and generation rules.</p>
        </div>
        <div class="help-tip">
          💡 <strong>Tip:</strong> Leave instructions blank for a natural, diverse population. The AI follows your town's demographics, biome, and name style automatically.
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
        <div class="help-tip">
          💡 <strong>Tip:</strong> Results are applied automatically after each month. The narrative and results are saved to the town's history for reference later.
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
          <p>Personal history, backstory, personality traits, and portrait. Upload custom portraits by clicking the portrait area.</p>
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
      id: 'calendar',
      icon: '📅',
      title: 'Calendar',
      content: `
        <p>Track in-game time with a fully customizable calendar system.</p>
        
        <div class="help-feature">
          <strong>📆 Custom Calendar</strong>
          <p>Configure the number of months per year, days per month, year number, era name, and set custom month names to match your campaign world (e.g. Forgotten Realms calendar).</p>
        </div>
        <div class="help-feature">
          <strong>⏩ Auto-Advance</strong>
          <p>The calendar automatically advances when you run simulations. The current date is always shown in the sidebar.</p>
        </div>
        <div class="help-feature">
          <strong>📊 History Integration</strong>
          <p>History entries use calendar month names in their headings, so you can see exactly when events happened in your world's timeline.</p>
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
            <li>Configure <strong>intake level</strong> (0 = AI decides, or set a specific level)</li>
            <li>Write <strong>Campaign Description & House Rules</strong> in Settings for lore-consistent generation</li>
            <li>Generate initial settlers, then <strong>simulate several months</strong> to build up the town organically</li>
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

  let activeTab = sections[0].id;

  container.innerHTML = `
    <div class="view-help">
      <div class="help-header">
        <h1 class="help-title">📚 Eon Weaver Guide</h1>
        <p class="help-subtitle">Select a topic to learn more</p>
      </div>
      
      <div class="help-tabbed-layout">
        <div class="help-tab-list" id="help-tab-list">
          ${sections.map(s => `
            <button class="help-tab-btn${s.id === activeTab ? ' active' : ''}" data-tab="${s.id}">
              <span class="help-tab-icon">${s.icon}</span>
              <span class="help-tab-label">${s.title}</span>
            </button>
          `).join('')}
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

  // Wire tab clicks
  container.querySelectorAll('.help-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      const section = sections.find(s => s.id === tabId);
      if (!section) return;

      // Update active tab
      container.querySelectorAll('.help-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update content
      const contentEl = container.querySelector('#help-tab-content');
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
    });
  });
}
