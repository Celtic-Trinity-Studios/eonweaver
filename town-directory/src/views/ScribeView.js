import { apiScribeGenerate } from '../api/scribe.js';
import { getState } from '../stores/appState.js';
import { showToast } from '../components/Toast.js';
import { confirmAiCost } from '../components/AiCostConfirm.js';

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
    `;

    const state = getState();
    let currentTab = 'lore';

    const tabs = container.querySelectorAll('.scribe-tab');
    const formContainer = container.querySelector('#scribe-form-container');
    const outputContent = container.querySelector('#scribe-output-content');
    const loadingEl = container.querySelector('#scribe-loading');
    const generateBtn = container.querySelector('#scribe-generate-btn');

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
            renderForm();
        });
    });

    generateBtn.addEventListener('click', async () => {
        // Collect params based on inputs present
        const params = {};
        ['topic', 'type', 'custom', 'level', 'theme', 'size', 'power', 'cr', 'location'].forEach(key => {
            const el = formContainer.querySelector('#scribe-param-' + key);
            if (el) params[key] = el.value.trim();
        });
        
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
            outputContent.innerHTML = formatOutput(res.content);
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
}
