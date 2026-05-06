/**
 * Eon Weaver — Character Import Modal
 * Supports multiple import methods via dropdown:
 *   - statblock: Paste a D&D statblock text
 *   - ai_prompt: Describe a character and let AI generate it
 *   (extensible for future formats)
 */
import { showModal } from './Modal.js';
import { showToast } from './Toast.js';
import { apiGetCharacters, apiSaveCharacter, normalizeCharacter } from '../api/characters.js';
import { apiIntakeCustom } from '../api/simulation.js';
import { getState, setState } from '../stores/appState.js';
import { renderCharacterSheet } from './CharacterSheet.js';
import { confirmAiCost } from './AiCostConfirm.js';

/* ═══════════════════════════════════════════════════════════
   IMPORT METHODS — each entry defines UI + behaviour
   ═══════════════════════════════════════════════════════════ */
const IMPORT_METHODS = [
    {
        id: 'statblock',
        label: '📋 Paste Statblock',
        desc: 'Paste a D&D statblock in text format — parsed locally, no AI credits used.',
    },
    {
        id: 'ai_prompt',
        label: '🤖 AI Character Prompt',
        desc: 'Describe a character in plain language and let the AI generate full stats.',
    },
];

/* ═══════════════════════════════════════════════════════════
   MAIN EXPORT — open the import modal
   ═══════════════════════════════════════════════════════════ */
export async function openCharacterImportModal(containerEl, townId, charactersArray) {
    let parsedChar = null;
    let currentMethod = IMPORT_METHODS[0].id;

    const { el, close } = showModal({
        title: '📥 Import Character',
        width: 'wide',
        content: buildModalHtml(currentMethod),
    });

    // ── Wire dropdown change ─────────────────────────────
    el.querySelector('#import-method-select')?.addEventListener('change', (e) => {
        currentMethod = e.target.value;
        parsedChar = null;
        const body = el.querySelector('#import-method-body');
        if (body) body.innerHTML = buildMethodBody(currentMethod);
        wireMethodEvents(el, currentMethod, townId, charactersArray, containerEl, close, () => parsedChar, (v) => { parsedChar = v; });
    });

    // ── Wire initial method events ───────────────────────
    wireMethodEvents(el, currentMethod, townId, charactersArray, containerEl, close, () => parsedChar, (v) => { parsedChar = v; });
}

/* ═══════════════════════════════════════════════════════════
   HTML BUILDERS
   ═══════════════════════════════════════════════════════════ */
function buildModalHtml(activeMethod) {
    return `
    <div class="import-modal-body">
        <div class="import-method-row">
            <label class="import-method-label">Import Method:</label>
            <select id="import-method-select" class="form-select import-method-select">
                ${IMPORT_METHODS.map(m => `<option value="${m.id}" ${m.id === activeMethod ? 'selected' : ''}>${m.label}</option>`).join('')}
            </select>
        </div>
        <div id="import-method-body">
            ${buildMethodBody(activeMethod)}
        </div>
    </div>`;
}

function buildMethodBody(method) {
    if (method === 'statblock') return buildStatblockBody();
    if (method === 'ai_prompt') return buildAiPromptBody();
    return '<p class="muted">Unknown import method.</p>';
}

function buildStatblockBody() {
    return `
        <p class="import-instructions">Paste a D&D statblock below. The parser handles formats like:<br>
            <code>Name: Race Class; CR X; HP XX; AC XX; Init +X; ...</code></p>
        <textarea id="import-textarea" class="modal-textarea" rows="8"
            placeholder="Paste statblock here...&#10;&#10;Example:&#10;Grimnar Stonefist: Dwarf Fighter 3; CR 3; hp 28; Init +1; Spd 20; AC 18; Atk +6 melee (1d8+3/x3); AL LG; SV Fort +5, Ref +2, Will +1; Str 16, Dex 12, Con 14, Int 10, Wis 12, Cha 8. Languages: Common, Dwarven. Skills/Feats: Climb +5, Intimidate +3; Power Attack, Cleave, Weapon Focus (warhammer). Gear: masterwork warhammer, breastplate, heavy steel shield."></textarea>
        <div id="import-error" class="modal-error" style="display:none;"></div>
        <div id="import-preview" class="import-preview" style="display:none;"></div>
        <div class="modal-actions">
            <button id="import-parse-btn" class="btn-secondary">👁 Preview</button>
            <button id="import-confirm-btn" class="btn-primary" disabled>📥 Import Character</button>
        </div>`;
}

function buildAiPromptBody() {
    return `
        <p class="import-instructions">Describe the character you want the AI to create. Be as detailed as you like — include race, class, level, personality, backstory, or any special traits.<br>
            <span class="import-hint">⚡ Uses AI credits · one character per prompt</span></p>
        <textarea id="ai-prompt-textarea" class="modal-textarea" rows="8"
            placeholder="Example:&#10;A grizzled half-orc barbarian named Krag Bloodtusk, level 5. He's a former gladiator who earned his freedom and now works as a bounty hunter. He wields a massive greataxe and has a scar across his left eye. Chaotic neutral alignment. He's intimidating but secretly has a soft spot for stray animals."></textarea>
        <div class="ai-prompt-options">
            <div class="ai-opt-row">
                <label>Level Range:</label>
                <select id="ai-level-range" class="form-select form-select-sm">
                    <option value="">Auto (AI decides)</option>
                    <option value="1-3">Low (1–3)</option>
                    <option value="3-6" selected>Mid-Low (3–6)</option>
                    <option value="5-10">Mid (5–10)</option>
                    <option value="8-14">Mid-High (8–14)</option>
                    <option value="12-20">High (12–20)</option>
                </select>
            </div>
        </div>
        <div id="import-error" class="modal-error" style="display:none;"></div>
        <div id="import-preview" class="import-preview" style="display:none;"></div>
        <div class="modal-actions">
            <button id="ai-generate-btn" class="btn-primary">🤖 Generate Character</button>
            <button id="import-confirm-btn" class="btn-primary" disabled style="display:none;">📥 Import Character</button>
        </div>`;
}

/* ═══════════════════════════════════════════════════════════
   EVENT WIRING
   ═══════════════════════════════════════════════════════════ */
function wireMethodEvents(el, method, townId, charsArray, containerEl, closeFn, getParsed, setParsed) {
    if (method === 'statblock') wireStatblock(el, townId, charsArray, containerEl, closeFn, getParsed, setParsed);
    if (method === 'ai_prompt') wireAiPrompt(el, townId, charsArray, containerEl, closeFn, setParsed);
}

function wireStatblock(el, townId, charsArray, containerEl, closeFn, getParsed, setParsed) {
    el.querySelector('#import-parse-btn')?.addEventListener('click', () => {
        const text = el.querySelector('#import-textarea')?.value.trim();
        if (!text) return;
        const errEl = el.querySelector('#import-error');
        errEl.style.display = 'none';
        try {
            const parsed = parseStatblock(text);
            setParsed(parsed);
            renderPreview(el, parsed);
        } catch (err) {
            errEl.textContent = 'Parse error: ' + err.message;
            errEl.style.display = 'block';
        }
    });

    el.querySelector('#import-confirm-btn')?.addEventListener('click', async () => {
        const parsed = getParsed();
        if (!parsed || !townId) return;
        const btn = el.querySelector('#import-confirm-btn');
        btn.disabled = true;
        btn.textContent = '⏳ Importing...';
        try {
            await apiSaveCharacter(townId, parsed);
            await refreshAndShow(containerEl, townId, charsArray, parsed.name, closeFn);
        } catch (err) {
            btn.disabled = false;
            btn.textContent = '📥 Import Character';
            const errEl = el.querySelector('#import-error');
            errEl.textContent = 'Import failed: ' + err.message;
            errEl.style.display = 'block';
        }
    });
}

function wireAiPrompt(el, townId, charsArray, containerEl, closeFn, setParsed) {
    el.querySelector('#ai-generate-btn')?.addEventListener('click', async () => {
        const prompt = el.querySelector('#ai-prompt-textarea')?.value.trim();
        if (!prompt) {
            showToast('Please describe the character you want to create.', 'warning');
            return;
        }

        const btn = el.querySelector('#ai-generate-btn');
        const errEl = el.querySelector('#import-error');
        errEl.style.display = 'none';

        // Show AI cost confirmation
        const proceed = await confirmAiCost('customPrompt');
        if (!proceed) return;

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-inline"></span> Generating...';

        try {
            const levelRange = el.querySelector('#ai-level-range')?.value || '';

            // Single AI call via dedicated endpoint
            const res = await apiIntakeCustom(townId, prompt, levelRange);
            if (!res?.ok || !res?.character) {
                throw new Error(res?.error || 'AI failed to generate a character. Please try a different description.');
            }

            const charData = res.character;
            setParsed(charData);
            renderPreview(el, charData);

            // Save the generated character to DB
            btn.innerHTML = '<span class="spinner-inline"></span> Saving...';
            await apiSaveCharacter(townId, charData);

            // Refresh character list
            const charResult = await apiGetCharacters(townId);
            const allChars = (charResult.characters || []).map(normalizeCharacter);
            charsArray.length = 0;
            charsArray.push(...allChars);

            const state = getState();
            if (state.currentTown) state.currentTown.characters = allChars;

            // Find and show the new character
            const newChar = allChars.find(c =>
                c.name?.toLowerCase() === charData.name?.toLowerCase()
            ) || allChars[allChars.length - 1];

            if (newChar) {
                showToast(`${newChar.name} created!`, 'success');
                setState({ selectedCharId: newChar.id });
                const detailArea = containerEl.querySelector('#detail-area');
                if (detailArea) {
                    renderCharacterSheet(detailArea, newChar, {
                        onListRefresh: () => {},
                        onDelete: () => {},
                        containerRef: containerEl,
                    });
                }
            } else {
                showToast(`${charData.name} created!`, 'success');
            }
            closeFn();
        } catch (err) {
            errEl.textContent = err.message;
            errEl.style.display = 'block';
            btn.disabled = false;
            btn.innerHTML = '🤖 Generate Character';
        }
    });
}

/* ═══════════════════════════════════════════════════════════
   PREVIEW RENDERER
   ═══════════════════════════════════════════════════════════ */
function renderPreview(el, char) {
    const previewEl = el.querySelector('#import-preview');
    const fields = [
        ['Name', char.name], ['Race', char.race], ['Class', char.class],
        ['CR', char.cr], ['HP', char.hp], ['AC', char.ac],
        ['Init', char.init], ['Speed', char.spd],
        ['Attack', char.atk], ['Alignment', char.alignment],
        ['Saves', char.saves],
        ['Str/Dex/Con', `${char.str || ''} / ${char.dex || ''} / ${char.con || ''}`],
        ['Int/Wis/Cha', `${char.int_ || ''} / ${char.wis || ''} / ${char.cha || ''}`],
        ['Languages', char.languages],
        ['Skills', char.skills_feats], ['Feats', char.feats],
        ['Gear', char.gear],
    ];
    previewEl.innerHTML =
        `<h3 class="preview-name">${char.name || 'Unknown'}</h3>` +
        fields.filter(([, v]) => v).map(([k, v]) =>
            `<div class="preview-row"><span class="preview-label">${k}:</span> <strong>${v}</strong></div>`
        ).join('');
    previewEl.style.display = 'block';
    const confirmBtn = el.querySelector('#import-confirm-btn');
    if (confirmBtn) confirmBtn.disabled = false;
}

/* ═══════════════════════════════════════════════════════════
   REFRESH & NAVIGATE
   ═══════════════════════════════════════════════════════════ */
async function refreshAndShow(containerEl, townId, charsArray, charName, closeFn) {
    const result = await apiGetCharacters(townId);
    const allChars = (result.characters || []).map(normalizeCharacter);
    const state = getState();
    if (state.currentTown) state.currentTown.characters = allChars;
    charsArray.length = 0;
    charsArray.push(...allChars);

    const newChar = allChars.find(c => c.name === charName);
    if (newChar) {
        setState({ selectedCharId: newChar.id });
        const detailArea = containerEl.querySelector('#detail-area');
        if (detailArea) {
            renderCharacterSheet(detailArea, newChar, {
                onListRefresh: () => {},
                onDelete: () => {},
                containerRef: containerEl,
            });
        }
    }
    closeFn();
}

/* ═══════════════════════════════════════════════════════════
   STATBLOCK PARSER (extracted from TownView.js)
   ═══════════════════════════════════════════════════════════ */
export function parseStatblock(text) {
    const char = {
        name: '', race: '', class: '', status: 'Alive', cr: '', hp: '', ac: '',
        init: '', spd: '', grapple: '', atk: '', alignment: '', saves: '',
        str: '', dex: '', con: '', int_: '', wis: '', cha: '',
        hd: '', ecl: '', age: '', xp: '', gender: '',
        languages: '', skills_feats: '', feats: '', gear: '',
        role: '', title: '', spouse: 'None', spouse_label: '',
    };

    // Normalize multi-line to single line
    const normalized = text.split('\n').map(l => l.replace(/^##\s*/, '').trim()).filter(Boolean).join(' ');
    let mainPart = normalized;

    // Separate trailing sections (Languages, Skills, Feats, Gear)
    const sectionNames = [
        'Languages?(?:\\s*spoken)?', 'Skills?\\/Feats?', 'Skills?\\s+and\\s+Feats?',
        'Possessions?', 'Gear', 'Feats?', 'Special'
    ];
    const sectionRe = new RegExp(`\\.?\\s*(${sectionNames.join('|')})\\s*:\\s*`, 'i');
    const sectionStart = mainPart.search(sectionRe);
    let tailPart = '';
    if (sectionStart > -1) {
        tailPart = mainPart.substring(sectionStart).replace(/^\.\s*/, '');
        mainPart = mainPart.substring(0, sectionStart).trim();
    }

    // Parse named sections from tail
    const sectionExtract = /(?:^|\.\s*)(Languages?\s*(?:spoken)?|Skills?\/Feats?|Skills?\s+and\s+Feats?|Possessions?|Gear|Feats?|Special)\s*:\s*/gi;
    const sections = {};
    let match, lastKey = null, lastIdx = 0;
    const fullTail = tailPart;
    while ((match = sectionExtract.exec(fullTail)) !== null) {
        if (lastKey !== null) {
            sections[lastKey] = fullTail.substring(lastIdx, match.index).replace(/\.\s*$/, '').trim();
        }
        lastKey = match[1].toLowerCase();
        lastIdx = match.index + match[0].length;
    }
    if (lastKey !== null) sections[lastKey] = fullTail.substring(lastIdx).replace(/\.\s*$/, '').trim();

    for (const [key, val] of Object.entries(sections)) {
        if (/language/i.test(key)) char.languages = val;
        else if (/skill/i.test(key)) char.skills_feats = val;
        else if (/^feats?$/i.test(key)) char.feats = val;
        else if (/possession|gear/i.test(key)) char.gear = val;
    }

    // Parse semicolon-separated fields
    const parts = mainPart.split(';').map(s => s.trim()).filter(Boolean);
    if (parts.length < 2) { char.name = mainPart; return char; }

    // First part: "Name: Race Class"
    const colonIdx = parts[0].indexOf(':');
    if (colonIdx > -1 && !/\b(?:CR|hp|Init|Spd|AC|BAB|Atk|AL|SV|Str|Dex|Con|Int|Wis|Cha|HD|Fort|Ref|Will|Grapple)\b/i.test(parts[0].substring(0, colonIdx))) {
        char.name = parts[0].substring(0, colonIdx).trim();
        const rest = parts[0].substring(colonIdx + 1).trim();
        const raceClass = rest.match(/^(\S+)\s+(.+)$/);
        if (raceClass) { char.race = raceClass[1]; char.class = raceClass[2]; }
        else char.race = rest;
    } else {
        char.name = parts[0];
        if (parts.length > 1) {
            const p1 = parts[1];
            if (!/\b(?:CR|hp|Init|Spd|AC|BAB)\b/i.test(p1)) {
                const rc = p1.match(/^(\S+)\s+(.+)$/);
                if (rc) { char.race = rc[1]; char.class = rc[2]; }
                else char.race = p1;
            }
        }
    }

    // Parse key: value fields
    for (const part of parts) {
        const trimmed = part.trim();
        const kvMatch = trimmed.match(/^\s*(\w[\w\s/]*?)\s*[:]\s*(.+)$/);
        if (!kvMatch) {
            const crMatch = trimmed.match(/^CR\s+(.+)/i);
            if (crMatch) { char.cr = crMatch[1]; continue; }
            const hpMatch = trimmed.match(/^hp\s+(\d+)/i);
            if (hpMatch) { char.hp = hpMatch[1]; continue; }
            continue;
        }
        const key = kvMatch[1].trim().toLowerCase();
        const val = kvMatch[2].trim();
        if (key === 'cr') char.cr = val;
        else if (key === 'ecl') char.ecl = val;
        else if (key === 'age') char.age = val;
        else if (key === 'xp') char.xp = val;
        else if (key === 'hp') char.hp = val;
        else if (key === 'hd') char.hd = val;
        else if (key === 'init') char.init = val;
        else if (key === 'spd') char.spd = val;
        else if (key === 'ac') char.ac = val;
        else if (key === 'bab') { /* skip */ }
        else if (key === 'atk') char.atk = val;
        else if (key === 'grapple') char.grapple = val;
        else if (key === 'al') char.alignment = val;
        else if (key === 'sv') char.saves = val;
        else if (key === 'size') { /* skip */ }
        else if (key === 'gender') char.gender = val;
        else if (/wife|husband/i.test(key)) {
            char.spouse = val;
            char.spouse_label = key.charAt(0).toUpperCase() + key.slice(1);
        }
    }

    // Ability scores
    const abMatch = normalized.match(/Str\s+(\d+).*?Dex\s+(\d+).*?Con\s+(\d+).*?Int\s+(\d+).*?Wis\s+(\d+).*?Cha\s+(\d+)/i);
    if (abMatch) {
        char.str = abMatch[1]; char.dex = abMatch[2]; char.con = abMatch[3];
        char.int_ = abMatch[4]; char.wis = abMatch[5]; char.cha = abMatch[6];
    }

    // Deceased check
    if (/\(DECEASED\)/i.test(normalized) || /deceased/i.test(char.status)) {
        char.status = 'Deceased';
    }

    return char;
}
