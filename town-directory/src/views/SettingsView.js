/**
 * Eon Weaver — Settings View
 * Campaign management + simulation settings.
 * Edition is set per-campaign, not globally.
 */
import { apiGetSettings, apiSaveSetting } from '../api/settings.js';
import { apiGetCampaigns, apiCreateCampaign, apiUpdateCampaign, apiDeleteCampaign, apiSwitchCampaign } from '../api/campaigns.js';
import { showToast } from '../components/Toast.js';
import { getState, setState } from '../stores/appState.js';
import { setCurrentEdition, clearSrdCache } from '../api/srd.js';
import { renderSidebar } from '../components/Sidebar.js';
import { apiGetCampaignRules, apiSaveCampaignRules } from '../api/simulation.js';

export default function SettingsView(container) {
  container.innerHTML = `
    <div class="view-settings">
      <header class="view-header">
        <h1>⚙️ Settings</h1>
      </header>

      <div class="settings-grid">
        <section class="settings-section-card">
          <h3 class="settings-section">📜 Campaigns</h3>
          <div id="campaigns-panel">Loading campaigns...</div>
        </section>

        <section class="settings-section-card">
          <h3 class="settings-section">🎲 XP Growth System</h3>
          <small class="settings-hint" style="display:block;margin-bottom:0.75rem;">XP is now calculated automatically using the <strong>Growth Score</strong> model. The AI scores each character on 5 axes (activity, danger, role pressure, personal change, class relevance) and multiplies by your town's difficulty level.</small>

          <div style="background:var(--bg-tertiary,#1a1a2e);border:1px solid var(--border);border-radius:var(--radius-sm);padding:0.75rem 1rem;margin-bottom:0.75rem;">
            <div style="font-size:0.75rem;font-weight:700;color:var(--accent);margin-bottom:0.4rem;">📊 How It Works</div>
            <div style="font-size:0.7rem;color:var(--text-secondary);line-height:1.7;">
              <div>① AI assigns <strong>5 monthly tags</strong> per character (activity, danger, role pressure, personal change, class relevance)</div>
              <div>② Tag scores are summed → <strong>base XP</strong></div>
              <div>③ Base XP × <strong>town difficulty multiplier</strong> + event XP = <strong>monthly XP</strong></div>
              <div>④ Server applies <strong>level-based diminishing returns</strong> (L1-3: full, L4-6: 75%, L7-10: 50%, L11+: 25%)</div>
            </div>
          </div>

          <div style="background:var(--bg-tertiary,#1a1a2e);border:1px solid var(--border);border-radius:var(--radius-sm);padding:0.75rem 1rem;">
            <div style="font-size:0.75rem;font-weight:700;color:var(--accent);margin-bottom:0.4rem;">🏘️ Town Difficulty Levels</div>
            <div style="font-size:0.7rem;color:var(--text-secondary);line-height:1.7;">
              <div><strong>Peaceful</strong> (×1.0) — Safe, established settlement</div>
              <div><strong>Struggling</strong> (×1.5) — Occasional monsters/bandits</div>
              <div><strong>Frontier</strong> (×2.0) — Dangerous border, regular threats</div>
              <div><strong>Warzone</strong> (×3.0) — Active conflict, constant danger</div>
            </div>
            <div style="font-size:0.65rem;color:var(--text-muted);margin-top:0.5rem;">Set each town's difficulty in its <strong>Town Settings</strong> (⚙️ gear icon on the town page).</div>
          </div>
        </section>

        <section class="settings-section-card">
          <h3 class="settings-section">🌍 World Simulation</h3>

          <div class="form-group">
            <label for="s-rel-speed">Relationship Formation</label>
            <select id="s-rel-speed" class="form-select">
              <option value="very slow">Very Slow (rarely form)</option>
              <option value="slow">Slow</option>
              <option value="normal" selected>Normal</option>
              <option value="fast">Fast (quick bonds)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="s-birth-rate">Birth Rate</label>
            <select id="s-birth-rate" class="form-select">
              <option value="rare">Rare (almost never)</option>
              <option value="low">Low</option>
              <option value="normal" selected>Normal</option>
              <option value="high">High (baby boom)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="s-death-threshold">Population Death Threshold</label>
            <small class="settings-hint">Death rate increases once population exceeds this</small>
            <select id="s-death-threshold" class="form-select">
              <option value="25">25 residents</option>
              <option value="50" selected>50 residents</option>
              <option value="75">75 residents</option>
              <option value="100">100 residents</option>
              <option value="150">150 residents</option>
              <option value="unlimited">Unlimited (no cap)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="s-child-growth">Child Growth Speed</label>
            <small class="settings-hint">How fast children mature</small>
            <select id="s-child-growth" class="form-select">
              <option value="realistic" selected>Realistic (18 years)</option>
              <option value="accelerated">Accelerated (rapid magical growth)</option>
              <option value="instant">Instant (born as young adults)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="s-conflict">Conflict & Events</label>
            <select id="s-conflict" class="form-select">
              <option value="peaceful">Peaceful (very few threats)</option>
              <option value="occasional" selected>Occasional</option>
              <option value="frequent">Frequent (dangerous world)</option>
              <option value="brutal">Brutal (constant danger)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="s-sell-rate">💰 Item Sell Rate</label>
            <small class="settings-hint">Percentage of base cost when selling items. Will be modified by factions & world events in the future.</small>
            <select id="s-sell-rate" class="form-select">
              <option value="100">100% (Full price)</option>
              <option value="75">75% (Favorable market)</option>
              <option value="50" selected>50% (Standard — D&D default)</option>
              <option value="33">33% (Rough economy)</option>
              <option value="25">25% (Desperate times)</option>
              <option value="10">10% (Pawnshop prices)</option>
            </select>
          </div>
        </section>

        <section class="settings-section-card">
          <h3 class="settings-section">📜 Campaign Setting</h3>
          <small class="settings-hint" style="display:block;margin-bottom:0.75rem;">This information is used by AI during all simulations and character generation to create thematic, world-appropriate content.</small>

          <div class="form-group">
            <label for="s-campaign-desc">Campaign Description</label>
            <small class="settings-hint">Describe your world, its tone, geography, factions, and any important lore the AI should know.</small>
            <textarea id="s-campaign-desc" class="form-input" rows="4"
              placeholder="e.g., A low-magic dark fantasy world set in a frozen northern kingdom. The land is plagued by undead..."></textarea>
          </div>

          <div class="form-group">
            <label for="s-house-rules">House Rules</label>
            <small class="settings-hint">Any house rules or constraints the AI should follow during simulations.</small>
            <textarea id="s-house-rules" class="form-input" rows="3"
              placeholder="e.g., No evil-aligned PCs. Magic items are extremely rare. All characters must have a trade skill."></textarea>
          </div>
        </section>

        <section class="settings-section-card">
          <h3 class="settings-section">🧪 Homebrew & World Rules</h3>
          <small class="settings-hint" style="display:block;margin-bottom:0.75rem;">Structured rules that directly influence how the AI generates content. These are combined with your house rules text above. Leave as "— Default —" to use standard D&D rules.</small>

          <div class="hb-panel-grid">
            <div class="hb-panel">
              <div class="hb-panel-title">🌍 World Nature</div>
                <div class="homebrew-grid">
                  <div class="form-group">
                    <label for="hb-magic-level">✨ Magic Level</label>
                    <select id="hb-magic-level" class="form-select">
                      <option value="">— Default —</option>
                      <option value="none">No Magic (mundane world)</option>
                      <option value="low">Low Magic (rare, feared/revered)</option>
                      <option value="standard">Standard (per D&D rules)</option>
                      <option value="high">High Magic (common, everyday use)</option>
                      <option value="wild">Wild Magic (unpredictable, surges)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-tech-level">🔧 Technology Level</label>
                    <select id="hb-tech-level" class="form-select">
                      <option value="">— Default (Medieval) —</option>
                      <option value="primitive">Primitive (stone age, tribal)</option>
                      <option value="ancient">Ancient (bronze age, early iron)</option>
                      <option value="medieval">Medieval (standard D&D)</option>
                      <option value="renaissance">Renaissance (early firearms, printing)</option>
                      <option value="magitech">Magitech (magic-powered technology)</option>
                      <option value="steampunk">Steampunk (steam & clockwork)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-tone">🎭 World Tone</label>
                    <select id="hb-tone" class="form-select">
                      <option value="">— Default —</option>
                      <option value="grimdark">Grimdark (bleak, hopeless, morally grey)</option>
                      <option value="dark_fantasy">Dark Fantasy (dark but with hope)</option>
                      <option value="standard">Standard Fantasy (heroic adventure)</option>
                      <option value="lighthearted">Lighthearted (comedy, whimsy)</option>
                      <option value="horror">Horror (dread, terror, madness)</option>
                      <option value="intrigue">Political Intrigue (schemes, betrayal)</option>
                      <option value="mythic_saga">Mythic Saga (epic legends, fate)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-divine">🙏 Divine Involvement</label>
                    <select id="hb-divine" class="form-select">
                      <option value="">— Default —</option>
                      <option value="absent">Absent (gods are silent or don't exist)</option>
                      <option value="distant">Distant (gods exist but rarely intervene)</option>
                      <option value="active">Active (gods grant power, send signs)</option>
                      <option value="meddling">Meddling (gods walk the earth, directly interfere)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-planar">🌀 Planar Activity</label>
                    <select id="hb-planar" class="form-select">
                      <option value="">— Default —</option>
                      <option value="sealed">Sealed (no planar travel or influence)</option>
                      <option value="rare">Rare (occasional anomalies, thin veil)</option>
                      <option value="active">Active (portals, extraplanar visitors)</option>
                      <option value="chaotic">Chaotic (planes bleed into material world)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-economy">💰 Economy</label>
                    <select id="hb-economy" class="form-select">
                      <option value="">— Default —</option>
                      <option value="barter">Barter System (no currency, trade goods)</option>
                      <option value="poor">Impoverished (scarce resources, poverty)</option>
                      <option value="standard">Standard (coins, merchants, trade)</option>
                      <option value="rich">Prosperous (wealthy, abundant trade)</option>
                      <option value="guild">Guild-Controlled (guilds control trade)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-law">⚖️ Law & Order</label>
                    <select id="hb-law" class="form-select">
                      <option value="">— Default —</option>
                      <option value="lawless">Lawless (no organized law, might = right)</option>
                      <option value="frontier">Frontier Justice (informal, community-driven)</option>
                      <option value="standard">Standard (guards, courts, laws)</option>
                      <option value="authoritarian">Authoritarian (strict laws, harsh punishment)</option>
                      <option value="theocracy">Theocratic (religious law dominates)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-monster-int">🧠 Monster Intelligence</label>
                    <select id="hb-monster-int" class="form-select">
                      <option value="">— Default —</option>
                      <option value="bestial">Bestial (animals, instinct-driven)</option>
                      <option value="cunning">Cunning (use tactics, set traps)</option>
                      <option value="sentient">Sentient (societies, politics, diplomacy)</option>
                    </select>
                  </div>
                </div>
            </div>

            <div class="hb-panel">
              <div class="hb-panel-title">🎲 Character Rules</div>
                <div class="homebrew-grid">
                  <div class="form-group">
                    <label for="hb-power-level">⚡ Power Level</label>
                    <select id="hb-power-level" class="form-select">
                      <option value="">— Default —</option>
                      <option value="gritty">Gritty (mortals, low-level, survival)</option>
                      <option value="heroic">Heroic (standard D&D adventurer)</option>
                      <option value="mythic">Mythic (demigods, epic-level)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-ability-scores">🎯 Ability Scores</label>
                    <select id="hb-ability-scores" class="form-select">
                      <option value="">— Default (4d6 drop lowest) —</option>
                      <option value="standard_array">Standard Array (15,14,13,12,10,8)</option>
                      <option value="point_buy">Point Buy (27 points)</option>
                      <option value="roll_4d6">Roll 4d6 Drop Lowest</option>
                      <option value="roll_3d6">Roll 3d6 Straight (old school)</option>
                      <option value="heroic">Heroic Array (higher stats)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-leveling">📊 Leveling System</label>
                    <select id="hb-leveling" class="form-select">
                      <option value="">— Default (XP-based) —</option>
                      <option value="xp">XP-Based (track experience points)</option>
                      <option value="milestone">Milestone (level at story beats)</option>
                      <option value="session">Session-Based (level every N sessions)</option>
                      <option value="slow">Slow Progression (takes much longer)</option>
                      <option value="fast">Fast Progression (rapid leveling)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-multiclass">🔀 Multiclassing</label>
                    <select id="hb-multiclass" class="form-select">
                      <option value="">— Default —</option>
                      <option value="forbidden">Forbidden (no multiclassing)</option>
                      <option value="restricted">Restricted (max 2 classes, prerequisites)</option>
                      <option value="standard">Standard (per D&D rules)</option>
                      <option value="free">Free (no prerequisites needed)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-alignment">⚔️ Alignment</label>
                    <select id="hb-alignment" class="form-select">
                      <option value="">— Default —</option>
                      <option value="strict">Strict (alignment has mechanical consequences)</option>
                      <option value="guideline">Guideline (descriptive, not prescriptive)</option>
                      <option value="dynamic">Dynamic (alignment shifts based on actions)</option>
                      <option value="none">No Alignment (removed entirely)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-racial">🧬 Racial Traits</label>
                    <select id="hb-racial" class="form-select">
                      <option value="">— Default —</option>
                      <option value="standard">Standard (fixed racial bonuses per race)</option>
                      <option value="flexible">Flexible (choose where bonuses go)</option>
                      <option value="custom_lineage">Custom Lineage (any race, any bonus)</option>
                      <option value="no_bonuses">No Racial Bonuses (all races equal)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-feats">🏅 Feat Rules</label>
                    <select id="hb-feats" class="form-select">
                      <option value="">— Default —</option>
                      <option value="none">No Feats (feats are not used)</option>
                      <option value="standard">Standard (feats replace ASI)</option>
                      <option value="bonus">Bonus Feats (feats + ASI, don't replace)</option>
                      <option value="frequent">Frequent Feats (feat every odd level)</option>
                      <option value="free_start">Free Starting Feat (everyone gets 1 at L1)</option>
                    </select>
                  </div>
                </div>
            </div>

            <div class="hb-panel">
              <div class="hb-panel-title">⚔️ Survival & Danger</div>
                <div class="homebrew-grid">
                  <div class="form-group">
                    <label for="hb-mortality">☠️ NPC Mortality</label>
                    <select id="hb-mortality" class="form-select">
                      <option value="">— Default —</option>
                      <option value="lethal">Lethal (deaths common, life is cheap)</option>
                      <option value="impactful">Impactful (deaths are meaningful)</option>
                      <option value="rare">Rare (plot armor, few die)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-death">💀 Death & Resurrection</label>
                    <select id="hb-death" class="form-select">
                      <option value="">— Default —</option>
                      <option value="permanent">Permanent (dead is dead)</option>
                      <option value="costly">Costly Resurrection (rare/expensive)</option>
                      <option value="available">Readily Available (clerics raise dead)</option>
                      <option value="impactful">Deaths Shape Personality (trauma, grief)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-healing">❤️‍🩹 Healing & Recovery</label>
                    <select id="hb-healing" class="form-select">
                      <option value="">— Default —</option>
                      <option value="fast">Fast Healing (recover quickly)</option>
                      <option value="standard">Standard (per D&D rest rules)</option>
                      <option value="slow">Slow Healing (no full recovery on long rest)</option>
                      <option value="gritty">Gritty Realism (short rest = 8hr, long rest = week)</option>
                      <option value="medicine">Medicine Required (healer or supplies needed)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-resting">🛌 Resting Rules</label>
                    <select id="hb-resting" class="form-select">
                      <option value="">— Default —</option>
                      <option value="standard">Standard (short rest 1hr, long rest 8hr)</option>
                      <option value="gritty">Gritty (short rest 8hr, long rest = 1 week)</option>
                      <option value="epic">Epic Heroism (short rest 5min, long rest 1hr)</option>
                      <option value="safe_haven">Safe Haven (long rest only in safe locations)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-encumbrance">🎒 Encumbrance</label>
                    <select id="hb-encumbrance" class="form-select">
                      <option value="">— Default —</option>
                      <option value="none">None (carry whatever you want)</option>
                      <option value="simple">Simple (STR × 15 lbs)</option>
                      <option value="variant">Variant (speed penalties at thresholds)</option>
                      <option value="slot">Slot-Based (inventory slots = STR score)</option>
                      <option value="strict">Strict & Tracked (every pound counts)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-disease">🦠 Disease & Plague</label>
                    <select id="hb-disease" class="form-select">
                      <option value="">— Default —</option>
                      <option value="none">None (disease doesn't exist)</option>
                      <option value="rare">Rare (occasional illness)</option>
                      <option value="realistic">Realistic (diseases spread, can be deadly)</option>
                      <option value="rampant">Rampant (plagues, epidemics are common)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-natural-hazards">🌪️ Natural Hazards</label>
                    <select id="hb-natural-hazards" class="form-select">
                      <option value="">— Default —</option>
                      <option value="mild">Mild (good weather, safe terrain)</option>
                      <option value="standard">Standard (seasonal weather, normal hazards)</option>
                      <option value="harsh">Harsh (extreme weather, dangerous terrain)</option>
                      <option value="catastrophic">Catastrophic (frequent disasters, hostile land)</option>
                    </select>
                  </div>
                </div>
            </div>

            <div class="hb-panel">
              <div class="hb-panel-title">🏘️ Social & Narrative</div>
                <div class="homebrew-grid">
                  <div class="form-group">
                    <label for="hb-npc-depth">🗣️ NPC Personality Depth</label>
                    <select id="hb-npc-depth" class="form-select">
                      <option value="">— Default —</option>
                      <option value="simple">Simple (basic roles, minimal personality)</option>
                      <option value="standard">Standard (distinct personalities, some quirks)</option>
                      <option value="deep">Deep (complex motivations, secrets, flaws)</option>
                      <option value="literary">Literary (rich inner lives, character arcs)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-romance">💕 Romance & Relationships</label>
                    <select id="hb-romance" class="form-select">
                      <option value="">— Default —</option>
                      <option value="none">None (no romantic content)</option>
                      <option value="subtle">Subtle (implied, fade-to-black)</option>
                      <option value="present">Present (acknowledged, part of life)</option>
                      <option value="focus">Focus (relationships drive drama)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-factions">🏛️ Factions & Politics</label>
                    <select id="hb-factions" class="form-select">
                      <option value="">— Default —</option>
                      <option value="none">None (no organized factions)</option>
                      <option value="simple">Simple (a few groups with basic goals)</option>
                      <option value="complex">Complex (rival factions, shifting alliances)</option>
                      <option value="dominant">Dominant (factions control everything)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-crafting">🔨 Crafting & Profession</label>
                    <select id="hb-crafting" class="form-select">
                      <option value="">— Default —</option>
                      <option value="none">None (no crafting system)</option>
                      <option value="simple">Simple (basic item creation)</option>
                      <option value="detailed">Detailed (materials, time, skill checks)</option>
                      <option value="central">Central (crafting drives the economy)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-magic-items">🗡️ Magic Item Availability</label>
                    <select id="hb-magic-items" class="form-select">
                      <option value="">— Default —</option>
                      <option value="nonexistent">Nonexistent (no magic items)</option>
                      <option value="very_rare">Very Rare (legendary, world-shaking)</option>
                      <option value="uncommon">Uncommon (exist but hard to find)</option>
                      <option value="available">Available (can be bought/found)</option>
                      <option value="abundant">Abundant (magic shops, common enchantments)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-undead">🧟 Undead & Necromancy</label>
                    <select id="hb-undead" class="form-select">
                      <option value="">— Default —</option>
                      <option value="nonexistent">Nonexistent (undead don't exist)</option>
                      <option value="abomination">Abomination (universally feared & hated)</option>
                      <option value="standard">Standard (exists, dangerous)</option>
                      <option value="commonplace">Commonplace (undead labor, accepted by some)</option>
                      <option value="dominant">Dominant (undead rule or overrun areas)</option>
                    </select>
                  </div>
                </div>
            </div>
          </div>
        </section>
      </div>

      <div class="settings-actions">
        <button class="btn-primary" id="settings-save-btn">💾 Save Settings</button>
        <span id="settings-status" class="settings-status"></span>
      </div>
    </div>
  `;

  // Load current settings
  loadSettings(container);
  loadCampaigns(container);
  loadCampaignRules(container);

  // Save handler
  container.querySelector('#settings-save-btn').addEventListener('click', () => saveSettings(container));

}

/* ── Campaign Management ────────────────────────────── */
async function loadCampaigns(container) {
  const panel = container.querySelector('#campaigns-panel');
  if (!panel) return;
  try {
    const res = await apiGetCampaigns();
    const campaigns = res.campaigns || [];
    const tier = res.tier || 'free';
    const maxCamps = res.max_campaigns || 1;
    const state = getState();
    const activeCampaignId = state.currentCampaign?.id;

    const tierLabels = { free: 'Free', subscriber: 'Subscriber' };

    panel.innerHTML = `
      <div class="campaign-tier-info">
        <span class="tier-badge tier-${tier}">${tierLabels[tier] || tier}</span>
        <span class="tier-limit">${campaigns.length} / ${maxCamps >= 999 ? '∞' : maxCamps} campaigns</span>
      </div>
      <div class="campaign-list" id="campaign-list">
        ${campaigns.map(c => `
          <div class="campaign-card${c.id == activeCampaignId ? ' campaign-active' : ''}" data-campaign-id="${c.id}">
            <div class="campaign-card-header">
              <div class="campaign-card-title">
                <span class="campaign-card-name">${c.name}</span>
                ${c.id == activeCampaignId ? '<span class="campaign-active-badge">Active</span>' : ''}
              </div>
              <div class="campaign-card-actions">
                ${c.id != activeCampaignId ? `<button class="btn-sm btn-secondary campaign-switch-btn" data-id="${c.id}" title="Switch to this campaign">▶ Switch</button>` : ''}
                <button class="btn-sm btn-secondary campaign-edit-btn" data-id="${c.id}" title="Edit campaign">✏️</button>
                <button class="btn-sm btn-danger campaign-delete-btn" data-id="${c.id}" title="Delete campaign">🗑️</button>
              </div>
            </div>
            <div class="campaign-card-meta">
              <span class="campaign-edition-badge">${getEditionLabel(c.dnd_edition)}</span>
              <span class="campaign-town-count">${c.town_count || 0} towns</span>
            </div>
            ${c.description ? `<div class="campaign-card-desc">${c.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
      ${campaigns.length < maxCamps || maxCamps >= 999 ? `
        <button class="btn-primary btn-sm" id="campaign-create-btn" style="margin-top:0.75rem;">+ New Campaign</button>
      ` : `
        <div class="muted" style="margin-top:0.5rem;">Subscribe to create unlimited campaigns and towns.</div>
      `}
    `;

    // Bind events
    panel.querySelectorAll('.campaign-switch-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cid = parseInt(btn.dataset.id);
        try {
          const res = await apiSwitchCampaign(cid);
          if (res.campaign) {
            setState({ currentCampaign: res.campaign });
            setCurrentEdition(res.campaign.dnd_edition);
            clearSrdCache();
            const sidebarEl = document.getElementById('sidebar-container');
            if (sidebarEl) renderSidebar(sidebarEl);
            showToast(`Switched to "${res.campaign.name}"`, 'success');
            loadCampaigns(container);
          }
        } catch (err) { showToast(err.message, 'error'); }
      });
    });

    panel.querySelectorAll('.campaign-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => showEditDialog(container, campaigns.find(c => c.id == btn.dataset.id)));
    });

    panel.querySelectorAll('.campaign-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const camp = campaigns.find(c => c.id == btn.dataset.id);
        if (!camp) return;
        if (!confirm(`Delete campaign "${camp.name}"? This will delete all its towns and characters permanently.`)) return;
        try {
          await apiDeleteCampaign(camp.id);
          showToast(`Campaign "${camp.name}" deleted.`, 'success');
          // Reload
          const meRes = await (await import('../api/auth.js')).apiGetCurrentUser();
          setState({ currentCampaign: meRes.user?.active_campaign || null });
          if (meRes.user?.active_campaign) {
            setCurrentEdition(meRes.user.active_campaign.dnd_edition);
          } else {
            setCurrentEdition(null);
          }
          const sidebarEl = document.getElementById('sidebar-container');
          if (sidebarEl) renderSidebar(sidebarEl);
          loadCampaigns(container);
          
          if (!meRes.user?.active_campaign) {
            // No campaigns left, reload page to trigger onboarding
            window.location.reload();
          }
        } catch (err) { showToast(err.message, 'error'); }
      });
    });

    panel.querySelector('#campaign-create-btn')?.addEventListener('click', () => showCreateDialog(container));
  } catch (err) {
    panel.innerHTML = `<div class="muted">Error loading campaigns: ${err.message}</div>`;
  }
}

function showCreateDialog(container) {
  const panel = container.querySelector('#campaigns-panel');
  // Insert form at top
  const existingForm = panel.querySelector('.campaign-form');
  if (existingForm) { existingForm.remove(); return; }

  const form = document.createElement('div');
  form.className = 'campaign-form';
  form.innerHTML = `
    <h4>Create New Campaign</h4>
    <div class="form-group">
      <label>Campaign Name</label>
      <input type="text" id="new-camp-name" class="form-input" placeholder="My New Campaign" autofocus>
    </div>
    <div class="form-group">
      <label>D&D Edition</label>
      <select id="new-camp-edition" class="form-select">
        <option value="3.5e">D&D 3.5 Edition (SRD)</option>
        <option value="5e">D&D 5th Edition — 2014 (SRD)</option>
        <option value="5e2024">D&D 5th Edition — 2024 Revised (SRD)</option>
      </select>
    </div>
    <div class="form-group">
      <label>Description (optional)</label>
      <input type="text" id="new-camp-desc" class="form-input" placeholder="A brief description...">
    </div>
    <div style="margin-top:0.75rem;">
      <button class="btn-primary btn-sm" id="new-camp-submit">Create</button>
      <button class="btn-secondary btn-sm" id="new-camp-cancel" style="margin-left:0.5rem;">Cancel</button>
    </div>
  `;
  panel.insertBefore(form, panel.firstChild);

  form.querySelector('#new-camp-cancel').addEventListener('click', () => form.remove());
  form.querySelector('#new-camp-submit').addEventListener('click', async () => {
    const name = form.querySelector('#new-camp-name').value.trim();
    const edition = form.querySelector('#new-camp-edition').value;
    const desc = form.querySelector('#new-camp-desc').value.trim();
    if (!name) { showToast('Name is required.', 'error'); return; }
    try {
      const res = await apiCreateCampaign(name, edition, desc);
      showToast(`Campaign "${name}" created & activated!`, 'success');
      setState({ currentCampaign: res.campaign });
      setCurrentEdition(edition);
      clearSrdCache();
      const sidebarEl = document.getElementById('sidebar-container');
      if (sidebarEl) renderSidebar(sidebarEl);
      form.remove();
      loadCampaigns(container);
    } catch (err) { showToast(err.message, 'error'); }
  });
}

function showEditDialog(container, campaign) {
  if (!campaign) return;
  const panel = container.querySelector('#campaigns-panel');
  const existingForm = panel.querySelector('.campaign-form');
  if (existingForm) existingForm.remove();

  const form = document.createElement('div');
  form.className = 'campaign-form';
  form.innerHTML = `
    <h4>Edit Campaign: ${campaign.name}</h4>
    <div class="form-group">
      <label>Campaign Name</label>
      <input type="text" id="edit-camp-name" class="form-input" value="${campaign.name}">
    </div>
    <div class="form-group">
      <label>D&D Edition</label>
      <select id="edit-camp-edition" class="form-select">
        <option value="3.5e"${campaign.dnd_edition === '3.5e' ? ' selected' : ''}>D&D 3.5 Edition (SRD)</option>
        <option value="5e"${campaign.dnd_edition === '5e' ? ' selected' : ''}>D&D 5th Edition — 2014 (SRD)</option>
        <option value="5e2024"${campaign.dnd_edition === '5e2024' ? ' selected' : ''}>D&D 5th Edition — 2024 Revised (SRD)</option>
      </select>
    </div>
    <div class="form-group">
      <label>Description</label>
      <input type="text" id="edit-camp-desc" class="form-input" value="${campaign.description || ''}">
    </div>
    <div style="margin-top:0.75rem;">
      <button class="btn-primary btn-sm" id="edit-camp-submit">Save Changes</button>
      <button class="btn-secondary btn-sm" id="edit-camp-cancel" style="margin-left:0.5rem;">Cancel</button>
    </div>
  `;
  panel.insertBefore(form, panel.firstChild);

  form.querySelector('#edit-camp-cancel').addEventListener('click', () => form.remove());
  form.querySelector('#edit-camp-submit').addEventListener('click', async () => {
    const name = form.querySelector('#edit-camp-name').value.trim();
    const edition = form.querySelector('#edit-camp-edition').value;
    const desc = form.querySelector('#edit-camp-desc').value.trim();
    if (!name) { showToast('Name is required.', 'error'); return; }
    try {
      await apiUpdateCampaign(campaign.id, { name, dnd_edition: edition, description: desc });
      showToast('Campaign updated!', 'success');
      // If editing active campaign, update state
      const state = getState();
      if (state.currentCampaign?.id === campaign.id) {
        setState({ currentCampaign: { ...state.currentCampaign, name, dnd_edition: edition, description: desc } });
        setCurrentEdition(edition);
        clearSrdCache();
      }
      const sidebarEl = document.getElementById('sidebar-container');
      if (sidebarEl) renderSidebar(sidebarEl);
      form.remove();
      loadCampaigns(container);
    } catch (err) { showToast(err.message, 'error'); }
  });
}

function getEditionLabel(edition) {
  const labels = { '3.5e': 'D&D 3.5e', '5e': 'D&D 5e (2014)', '5e2024': 'D&D 5e (2024)' };
  return labels[edition] || edition || '';
}

/* ── User Settings ────────────────────────────── */
async function loadSettings(container) {
  try {
    const res = await apiGetSettings();
    if (!res.settings) return;
    const s = res.settings;

    if (s.relationship_speed) container.querySelector('#s-rel-speed').value = s.relationship_speed;
    if (s.birth_rate) container.querySelector('#s-birth-rate').value = s.birth_rate;
    if (s.death_threshold) container.querySelector('#s-death-threshold').value = s.death_threshold;
    if (s.child_growth) container.querySelector('#s-child-growth').value = s.child_growth;
    if (s.conflict_frequency) container.querySelector('#s-conflict').value = s.conflict_frequency;
    if (s.sell_rate) container.querySelector('#s-sell-rate').value = s.sell_rate;
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

async function loadCampaignRules(container) {
  try {
    const res = await apiGetCampaignRules();
    if (res.campaign_description) container.querySelector('#s-campaign-desc').value = res.campaign_description;
    if (res.rules_text) container.querySelector('#s-house-rules').value = res.rules_text;

    // Load homebrew dropdowns
    const hb = res.homebrew_settings || {};
    const hbFields = [
      'magic-level','tech-level','tone','divine','planar','economy','law','monster-int',
      'power-level','ability-scores','leveling','multiclass','alignment','racial','feats',
      'mortality','death','healing','resting','encumbrance','disease','natural-hazards',
      'npc-depth','romance','factions','crafting','magic-items','undead'
    ];
    const hbKeys = [
      'magic_level','tech_level','tone','divine','planar','economy','law','monster_intelligence',
      'power_level','ability_scores','leveling','multiclass','alignment','racial','feats',
      'mortality','death','healing','resting','encumbrance','disease','natural_hazards',
      'npc_depth','romance','factions','crafting','magic_items','undead'
    ];
    hbFields.forEach((field, i) => {
      const sel = container.querySelector(`#hb-${field}`);
      if (sel && hb[hbKeys[i]]) sel.value = hb[hbKeys[i]];
    });
  } catch (e) {
    console.error('Failed to load campaign rules:', e);
  }
}

async function saveSettings(container) {
  try {
    await apiSaveSetting('relationship_speed', container.querySelector('#s-rel-speed').value);
    await apiSaveSetting('birth_rate', container.querySelector('#s-birth-rate').value);
    await apiSaveSetting('death_threshold', container.querySelector('#s-death-threshold').value);
    await apiSaveSetting('child_growth', container.querySelector('#s-child-growth').value);
    await apiSaveSetting('conflict_frequency', container.querySelector('#s-conflict').value);
    await apiSaveSetting('sell_rate', container.querySelector('#s-sell-rate').value);

    // Save campaign rules & description
    const campDesc = container.querySelector('#s-campaign-desc').value.trim();
    const houseRules = container.querySelector('#s-house-rules').value.trim();

    // Gather homebrew settings
    const homebrewSettings = {};
    const hbFieldsSave = [
      'magic-level','tech-level','tone','divine','planar','economy','law','monster-int',
      'power-level','ability-scores','leveling','multiclass','alignment','racial','feats',
      'mortality','death','healing','resting','encumbrance','disease','natural-hazards',
      'npc-depth','romance','factions','crafting','magic-items','undead'
    ];
    const hbKeysSave = [
      'magic_level','tech_level','tone','divine','planar','economy','law','monster_intelligence',
      'power_level','ability_scores','leveling','multiclass','alignment','racial','feats',
      'mortality','death','healing','resting','encumbrance','disease','natural_hazards',
      'npc_depth','romance','factions','crafting','magic_items','undead'
    ];
    hbFieldsSave.forEach((field, i) => {
      const val = container.querySelector(`#hb-${field}`)?.value || '';
      if (val) homebrewSettings[hbKeysSave[i]] = val;
    });

    await apiSaveCampaignRules(houseRules, campDesc, homebrewSettings);

    showToast('Settings saved!', 'success');
  } catch (err) {
    showToast('Save failed: ' + err.message, 'error');
  }
}
