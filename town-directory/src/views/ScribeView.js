import { apiScribeGenerate } from '../api/scribe.js';
import { apiSaveBuilding } from '../api/buildings.js';
import { apiCreateTown, apiGetTowns } from '../api/towns.js';
import { getState, setState, subscribe } from '../stores/appState.js';
import { showToast } from '../components/Toast.js';
import { confirmAiCost } from '../components/AiCostConfirm.js';

/** Pull a display name from AI markdown-ish output for town_buildings.name */
function extractLocationTitle(raw) {
    const text = (raw || '').trim();
    if (!text) return 'Generated location';
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (const line of lines.slice(0, 12)) {
        const h1 = line.match(/^#\s+(.+)/);
        if (h1) return h1[1].trim().slice(0, 150);
        const h2 = line.match(/^##\s+(.+)/);
        if (h2) return h2[1].trim().slice(0, 150);
    }
    for (const line of lines.slice(0, 10)) {
        if (line.length >= 4 && line.length <= 140 && line === line.toUpperCase() && /^[A-Z0-9][A-Z0-9\s'\-:,&]+$/.test(line)) {
            return line.slice(0, 150);
        }
    }
    const first = lines[0] || 'Generated location';
    return first.replace(/\*\*/g, '').slice(0, 150);
}

function shouldOfferRosterAdd(tab, loreType) {
    if (tab === 'dungeon') return true;
    if (tab === 'lore' && loreType === 'location') return true;
    return false;
}

/** Try to find a settlement / place name in prose (e.g. "settlement of GodsFall"). */
function extractSettlementNameFromContent(raw) {
    const text = (raw || '').replace(/\*\*/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text) return '';

    const patterns = [
        /\b(?:settlement|town|village|city|hamlet|outpost|borough)\s+of\s+([^,.;\n]{2,80}?)(?=[,.;\n]|$)/i,
        /\bnear\s+the\s+(?:burgeoning\s+)?(?:settlement|town|village|city)\s+of\s+([^,.;\n]{2,80}?)(?=[,.;\n]|$)/i,
        /\b(?:the\s+)?(?:hold|keep|fort|fasthold)\s+of\s+([^,.;\n]{2,80}?)(?=[,.;\n]|$)/i,
    ];

    for (const re of patterns) {
        const m = text.match(re);
        if (m && m[1]) {
            let name = m[1].trim().replace(/[,;.]+$/g, '').trim();
            const words = name.split(/\s+/).filter(Boolean);
            if (words.length > 5) name = words.slice(0, 4).join(' ');
            if (name.length >= 2 && name.length <= 100) return name;
        }
    }
    return '';
}

/** Name for a new town when none is selected: prose → form fields → dungeon title. */
function resolveNewTownName(raw, formContainer) {
    const fromText = extractSettlementNameFromContent(raw);
    if (fromText) return fromText;
    const topic = formContainer.querySelector('#scribe-param-topic')?.value?.trim();
    if (topic) return topic.slice(0, 100);
    const theme = formContainer.querySelector('#scribe-param-theme')?.value?.trim();
    if (theme) return theme.slice(0, 100);
    const title = extractLocationTitle(raw);
    return title !== 'Generated location' ? title : 'New locale';
}

export default function ScribeView(container) {
    container.innerHTML = `
        <div class="view-scribe">
            <header class="scribe-header">
                <h1>✍️ AI Scribe <span class="muted">(Arcane Workshop)</span></h1>
                <p class="view-subtitle">Generate lore, quests, dungeons, and items deeply integrated with your campaign world.</p>
            </header>
            
            <div class="scribe-tabs" id="scribe-tabs">
                <button class="scribe-tab active" data-gen="lore">📜 Lore Scribe</button>
                <button class="scribe-tab" data-gen="quest">⚔️ Quest Forge</button>
                <button class="scribe-tab" data-gen="dungeon">🏰 Dungeon Architect</button>
                <button class="scribe-tab" data-gen="item">💎 Item Enchanter</button>
                <button class="scribe-tab" data-gen="trap">🪤 Trap Designer</button>
            </div>
            
            <div class="scribe-workspace">
                <div class="scribe-controls">
                    <div id="scribe-form-container" style="flex: 1;"></div>
                    <button class="btn-primary w-full mt-4" id="scribe-generate-btn">✨ Generate Content</button>
                </div>
                <div class="scribe-output">
                    <div id="scribe-roster-actions" class="scribe-roster-actions" hidden>
                        <button type="button" class="btn-secondary" id="scribe-add-roster-btn">🏘️ Add to town roster</button>
                        <span class="muted" id="scribe-roster-hint" style="font-size:0.85rem;"></span>
                    </div>
                    <div class="scribe-output-scroll">
                        <div id="scribe-loading" class="scribe-loading" style="display:none;">
                            <div class="scribe-loading-icon">✍️</div>
                            <p>The Scribe is writing...</p>
                            <p class="muted" style="font-size: 0.9rem; margin-top: 0.5rem; font-family: sans-serif;">Synthesizing world context and generating lore.</p>
                        </div>
                        <div id="scribe-output-content" class="scribe-output-content">
                            <div class="muted" style="text-align:center; margin-top:4rem; font-family: sans-serif;">
                                <span style="font-size: 3rem; display: block; margin-bottom: 1rem; opacity: 0.5;">📖</span>
                                Select a tool and click generate to awaken the Scribe.<br>
                                Content will be aware of your towns, NPCs, and campaign rules.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const state = getState();
    let currentTab = 'lore';

    const tabs = container.querySelectorAll('.scribe-tab');
    const formContainer = container.querySelector('#scribe-form-container');
    const outputContent = container.querySelector('#scribe-output-content');
    const loadingEl = container.querySelector('#scribe-loading');
    const generateBtn = container.querySelector('#scribe-generate-btn');
    const rosterBar = container.querySelector('#scribe-roster-actions');
    const rosterBtn = container.querySelector('#scribe-add-roster-btn');
    const rosterHint = container.querySelector('#scribe-roster-hint');

    let lastRawContent = '';
    let lastRosterMeta = { tab: '', loreType: '' };

    function hideRosterActions() {
        rosterBar.hidden = true;
        lastRawContent = '';
        lastRosterMeta = { tab: '', loreType: '' };
    }

    function updateRosterBarVisibility() {
        const show = Boolean(lastRawContent && shouldOfferRosterAdd(lastRosterMeta.tab, lastRosterMeta.loreType));
        rosterBar.hidden = !show;
        if (!show) return;
        const town = state.currentTown;
        rosterHint.textContent = town
            ? `Saves as a building in ${town.name} (Town Buildings).`
            : 'Creates a town from the text (e.g. “settlement of …”) or your theme, then adds this site.';
    }

    function renderForm() {
        let html = '';
        if (currentTab === 'lore') {
            html = `
                <div class="form-group">
                    <label>Topic / Entity Name</label>
                    <input type="text" id="scribe-param-topic" class="form-input" placeholder="e.g. The Ruined Tower of Zalthar">
                </div>
                <div class="form-group">
                    <label>Lore Type</label>
                    <select id="scribe-param-type" class="form-select">
                        <option value="legend">Myth / Legend</option>
                        <option value="prophecy">Prophecy</option>
                        <option value="location">Location History</option>
                        <option value="faction">Faction Origins</option>
                        <option value="deity">Deity / Pantheon Lore</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Custom Instructions <span class="muted">(Optional)</span></label>
                    <textarea id="scribe-param-custom" class="form-input" rows="4" placeholder="Include mentions of a specific NPC, or tie this to a recent event..."></textarea>
                </div>
            `;
        } else if (currentTab === 'quest') {
            html = `
                <div class="form-group">
                    <label>Quest Type</label>
                    <select id="scribe-param-type" class="form-select">
                        <option value="fetch">Fetch / Retrieval</option>
                        <option value="bounty">Bounty / Hunt</option>
                        <option value="escort">Escort / Protection</option>
                        <option value="investigation">Mystery / Investigation</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Difficulty / Level Range</label>
                    <input type="text" id="scribe-param-level" class="form-input" placeholder="e.g. Level 3-5">
                </div>
                <div class="form-group">
                    <label>Core Hook</label>
                    <textarea id="scribe-param-custom" class="form-input" rows="3" placeholder="e.g. The local blacksmith's daughter went missing near the old caves."></textarea>
                </div>
                <div class="form-group">
                    <label class="muted" style="display:flex;align-items:flex-start;gap:.5rem;cursor:pointer;font-weight:400;">
                        <input type="checkbox" id="scribe-param-invent_locations" style="margin-top:.2rem;">
                        <span>Invent new realms/places/NPC factions outside saved campaign lore (default: stay in canon from Settings + towns below)</span>
                    </label>
                </div>
            `;
        } else if (currentTab === 'dungeon') {
            html = `
                <div class="form-group">
                    <label>Dungeon Theme</label>
                    <input type="text" id="scribe-param-theme" class="form-input" placeholder="e.g. Flooded Cultist Temple">
                </div>
                <div class="form-group">
                    <label>Size / Rooms</label>
                    <select id="scribe-param-size" class="form-select">
                        <option value="small">Small (3-5 rooms)</option>
                        <option value="medium">Medium (6-10 rooms)</option>
                        <option value="large">Large (11+ rooms)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Level Range</label>
                    <input type="text" id="scribe-param-level" class="form-input" placeholder="e.g. Level 4">
                </div>
            `;
        } else if (currentTab === 'item') {
            html = `
                <div class="form-group">
                    <label>Item Type</label>
                    <select id="scribe-param-type" class="form-select">
                        <option value="weapon">Weapon</option>
                        <option value="armor">Armor / Shield</option>
                        <option value="wondrous">Wondrous Item</option>
                        <option value="ring">Ring / Amulet</option>
                        <option value="staff">Staff / Wand</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Power Level</label>
                    <select id="scribe-param-power" class="form-select">
                        <option value="minor">Minor (Low level)</option>
                        <option value="medium">Medium (Mid level)</option>
                        <option value="major">Major (High level)</option>
                        <option value="artifact">Artifact (Legendary)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Theme / Effect Concept</label>
                    <input type="text" id="scribe-param-theme" class="form-input" placeholder="e.g. Forged in shadowflame">
                </div>
            `;
        } else if (currentTab === 'trap') {
            html = `
                <div class="form-group">
                    <label>Trap Type</label>
                    <select id="scribe-param-type" class="form-select">
                        <option value="mechanical">Mechanical</option>
                        <option value="magical">Magical</option>
                        <option value="environmental">Environmental Hazard</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Challenge Rating (CR)</label>
                    <input type="text" id="scribe-param-cr" class="form-input" placeholder="e.g. 5">
                </div>
                <div class="form-group">
                    <label>Location Context</label>
                    <input type="text" id="scribe-param-location" class="form-input" placeholder="e.g. Hidden in a library bookshelf">
                </div>
            `;
        }
        formContainer.innerHTML = html;
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.dataset.gen;
            hideRosterActions();
            renderForm();
        });
    });

    rosterBtn.addEventListener('click', async () => {
        if (!lastRawContent) return;

        const buildingName = extractLocationTitle(lastRawContent);
        const buildingType = lastRosterMeta.tab === 'dungeon' ? 'dungeon' : 'landmark';
        let townId = state.currentTown?.id;
        let townLabel = state.currentTown?.name;

        rosterBtn.disabled = true;
        try {
            let createdNewTown = false;
            if (!townId) {
                const newTownName = resolveNewTownName(lastRawContent, formContainer);
                const subtitle = `Created from AI Scribe — ${buildingName}`.slice(0, 200);
                const created = await apiCreateTown(newTownName, subtitle);
                townId = created.town?.id;
                if (!townId) throw new Error('Town was not created.');

                const townsRes = await apiGetTowns();
                const towns = townsRes.towns || [];
                const row = towns.find(t => t.id === townId);
                setState({
                    towns,
                    currentTownId: townId,
                    currentTown: {
                        ...(row || { id: townId, name: newTownName, subtitle }),
                        characters: [],
                        buildings: []
                    }
                });
                townLabel = row?.name || newTownName;
                createdNewTown = true;
            }

            await apiSaveBuilding(townId, {
                id: 0,
                name: buildingName,
                building_type: buildingType,
                status: 'completed',
                description: lastRawContent.trim(),
                owner_id: null,
                sort_order: 0,
                build_progress: 0,
                build_time: 1
            });
            if (createdNewTown) {
                showToast(`Created town “${townLabel}” and added “${buildingName}” to Town Buildings.`, 'success');
            } else {
                showToast(`Added “${buildingName}” to ${townLabel} buildings.`, 'success');
            }
        } catch (e) {
            showToast(e.message || 'Could not save building.', 'error');
        } finally {
            rosterBtn.disabled = false;
        }
    });

    generateBtn.addEventListener('click', async () => {
        // Collect params based on inputs present
        const params = {};
        ['topic', 'type', 'custom', 'level', 'theme', 'size', 'power', 'cr', 'location'].forEach(key => {
            const el = formContainer.querySelector('#scribe-param-' + key);
            if (el) params[key] = el.value.trim();
        });
        const inventLoc = formContainer.querySelector('#scribe-param-invent_locations');
        if (inventLoc?.checked) params.invent_locations = true;
        
        hideRosterActions();
        loadingEl.style.display = 'flex';
        outputContent.style.display = 'none';
        generateBtn.disabled = true;

        // Show AI cost confirmation
        const proceed = await confirmAiCost('scribe', { generatorType: currentTab });
        if (!proceed) {
            loadingEl.style.display = 'none';
            outputContent.style.display = 'block';
            generateBtn.disabled = false;
            return;
        }
        
        try {
            // We use active townId for context mapping
            const townId = state.currentTown?.id || 0; // Use 0 if no town selected, backend will fallback to campaign
            const res = await apiScribeGenerate(townId, currentTab, params);
            lastRawContent = typeof res.content === 'string' ? res.content : '';
            const loreTypeEl = formContainer.querySelector('#scribe-param-type');
            lastRosterMeta = {
                tab: currentTab,
                loreType: currentTab === 'lore' && loreTypeEl ? loreTypeEl.value : ''
            };
            outputContent.innerHTML = formatOutput(res.content);
            updateRosterBarVisibility();
        } catch (err) {
            showToast(err.message, 'error');
            outputContent.innerHTML = `<div class="error-msg" style="color:var(--danger); font-family:sans-serif; text-align:center; margin-top:2rem;">Error: ${err.message}</div>`;
        } finally {
            loadingEl.style.display = 'none';
            outputContent.style.display = 'block';
            generateBtn.disabled = false;
        }
    });

    function formatOutput(text) {
        // Advanced markdown-like parser for the AI response
        let html = text
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^\> (.*$)/gim, '<blockquote style="border-left: 4px solid var(--primary-color); padding-left: 1rem; margin-left: 0; color: var(--muted); font-style: italic;">$1</blockquote>')
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, '<br>');
        
        // Wrap bullet points
        html = html.replace(/(<br>|^)- (.*)/gm, '$1• $2');
        
        return html;
    }

    renderForm();

    const unsub = subscribe(() => {
        if (lastRawContent) updateRosterBarVisibility();
    });
    return unsub;
}
