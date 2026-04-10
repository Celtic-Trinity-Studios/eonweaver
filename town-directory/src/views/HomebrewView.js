/**
 * Eon Weaver — Homebrew Content View
 * Create and manage custom races, classes, feats, spells, and equipment.
 */
import { showToast } from '../components/Toast.js';
import {
    apiGetCustomContent,
    apiSaveCustomRace, apiSaveCustomClass, apiSaveCustomFeat,
    apiSaveCustomSpell, apiSaveCustomEquipment,
    apiDeleteCustomContent
} from '../api/content.js';
import { clearCustomContentCache } from '../api/srd.js';

const CONTENT_TYPES = [
    { key: 'custom_races', label: 'Races', icon: '👤', singular: 'Race' },
    { key: 'custom_classes', label: 'Classes', icon: '🎭', singular: 'Class' },
    { key: 'custom_feats', label: 'Feats', icon: '⚔️', singular: 'Feat' },
    { key: 'custom_spells', label: 'Spells', icon: '✨', singular: 'Spell' },
    { key: 'custom_equipment', label: 'Equipment', icon: '🛡️', singular: 'Item' },
];

let currentTab = 'custom_races';
let contentCache = {};

export default function HomebrewView(container) {
    container.innerHTML = `
    <div class="view-homebrew">
      <header class="view-header">
        <h1>🧪 Homebrew Content</h1>
        <p class="view-subtitle">Create custom races, classes, feats, spells, and equipment for your campaign.</p>
      </header>

      <div class="homebrew-tabs" id="homebrew-tabs">
        ${CONTENT_TYPES.map(t => `
          <button class="hb-tab${t.key === currentTab ? ' active' : ''}" data-tab="${t.key}">
            <span class="hb-tab-icon">${t.icon}</span>
            <span class="hb-tab-label">${t.label}</span>
            <span class="hb-tab-count" id="count-${t.key}">0</span>
          </button>
        `).join('')}
      </div>

      <div class="homebrew-content" id="homebrew-content">
        <div class="view-empty">Loading homebrew content...</div>
      </div>
    </div>
    `;

    // Tab switching
    container.querySelectorAll('.hb-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            currentTab = btn.dataset.tab;
            container.querySelectorAll('.hb-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === currentTab));
            renderTab(container);
        });
    });

    // Load content
    loadContent(container);
}

async function loadContent(container) {
    try {
        const res = await apiGetCustomContent();
        contentCache = res.content || {};
        // Update counts
        CONTENT_TYPES.forEach(t => {
            const countEl = container.querySelector(`#count-${t.key}`);
            if (countEl) countEl.textContent = (contentCache[t.key] || []).length;
        });
        renderTab(container);
    } catch (e) {
        container.querySelector('#homebrew-content').innerHTML =
            `<div class="view-empty"><h3>Error loading content</h3><p>${e.message}</p></div>`;
    }
}

function renderTab(container) {
    const panel = container.querySelector('#homebrew-content');
    if (!panel) return;

    const type = CONTENT_TYPES.find(t => t.key === currentTab);
    const items = contentCache[currentTab] || [];

    panel.innerHTML = `
    <div class="hb-list-header">
      <h3>${type.icon} ${type.label} <span class="hb-count">(${items.length})</span></h3>
      <button class="btn-primary btn-sm" id="hb-add-btn">+ New ${type.singular}</button>
    </div>
    <div id="hb-form-area"></div>
    <div class="hb-list" id="hb-list">
      ${items.length === 0
        ? `<div class="hb-empty">
            <span class="hb-empty-icon">${type.icon}</span>
            <p>No custom ${type.label.toLowerCase()} yet.</p>
            <p class="muted">Click "New ${type.singular}" to create your first!</p>
          </div>`
        : items.map(item => renderItemCard(item, type)).join('')
      }
    </div>
    `;

    // Add button
    panel.querySelector('#hb-add-btn')?.addEventListener('click', () => {
        showForm(container, type, null);
    });

    // Edit/Delete buttons
    panel.querySelectorAll('.hb-item-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            const item = items.find(i => i.id == id);
            if (item) showForm(container, type, item);
        });
    });
    panel.querySelectorAll('.hb-item-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = parseInt(btn.dataset.id);
            const item = items.find(i => i.id == id);
            if (!item || !confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
            try {
                await apiDeleteCustomContent(currentTab, id);
                clearCustomContentCache(); // Invalidate merged cache
                showToast(`"${item.name}" deleted.`, 'success');
                loadContent(container);
            } catch (e) {
                showToast('Delete failed: ' + e.message, 'error');
            }
        });
    });
}

function renderItemCard(item, type) {
    const details = getItemDetails(item, type.key);
    return `
    <div class="hb-item-card" data-id="${item.id}">
      <div class="hb-item-header">
        <span class="hb-item-name">${type.icon} ${item.name}</span>
        <span class="hb-badge">Homebrew</span>
      </div>
      <div class="hb-item-details">${details}</div>
      <div class="hb-item-actions">
        <button class="btn-sm btn-secondary hb-item-edit" data-id="${item.id}">✏️ Edit</button>
        <button class="btn-sm btn-danger hb-item-delete" data-id="${item.id}">🗑️</button>
      </div>
    </div>`;
}

function getItemDetails(item, typeKey) {
    switch (typeKey) {
        case 'custom_races':
            return `<span>Size: ${item.size || 'Medium'}</span> · <span>Speed: ${item.speed || 30}ft</span>${item.ability_mods ? ` · <span>${item.ability_mods}</span>` : ''}`;
        case 'custom_classes':
            return `<span>HD: ${item.hit_die || 'd8'}</span> · <span>BAB: ${item.bab_type || '3/4'}</span> · <span>Saves: ${item.good_saves || '—'}</span>`;
        case 'custom_feats':
            return `<span>Type: ${item.type || 'General'}</span>${item.prerequisites ? ` · <span>Prereq: ${item.prerequisites}</span>` : ''}${item.benefit ? `<br><em>${item.benefit}</em>` : ''}`;
        case 'custom_spells':
            return `<span>Level ${item.level}</span> · <span>${item.school || 'Universal'}</span>${item.classes ? ` · <span>${item.classes}</span>` : ''}`;
        case 'custom_equipment':
            return `<span>${item.category || 'Gear'}</span>${item.cost ? ` · <span>${item.cost}</span>` : ''}${item.damage ? ` · <span>${item.damage}</span>` : ''}`;
        default:
            return '';
    }
}

function showForm(container, type, existing) {
    const formArea = container.querySelector('#hb-form-area');
    if (!formArea) return;

    const isEdit = !!existing;
    const fields = getFormFields(type.key, existing);

    formArea.innerHTML = `
    <div class="hb-form-card">
      <h4>${isEdit ? `Edit ${type.singular}` : `New ${type.singular}`}</h4>
      <div class="hb-form-fields">
        ${fields}
      </div>
      <div class="hb-form-actions">
        <button class="btn-primary btn-sm" id="hb-form-save">${isEdit ? '💾 Save Changes' : '✅ Create'}</button>
        <button class="btn-secondary btn-sm" id="hb-form-cancel">Cancel</button>
      </div>
    </div>`;

    formArea.querySelector('#hb-form-cancel')?.addEventListener('click', () => {
        formArea.innerHTML = '';
    });

    formArea.querySelector('#hb-form-save')?.addEventListener('click', async () => {
        const data = collectFormData(type.key, formArea, existing);
        try {
            const saveMap = {
                custom_races: apiSaveCustomRace,
                custom_classes: apiSaveCustomClass,
                custom_feats: apiSaveCustomFeat,
                custom_spells: apiSaveCustomSpell,
                custom_equipment: apiSaveCustomEquipment,
            };
            await saveMap[type.key](data);
            clearCustomContentCache(); // Invalidate merged cache so Creator picks up new content
            showToast(`${type.singular} "${data.name}" ${isEdit ? 'updated' : 'created'}!`, 'success');
            formArea.innerHTML = '';
            loadContent(container);
        } catch (e) {
            showToast('Save failed: ' + e.message, 'error');
        }
    });

    // Scroll form into view
    formArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Wire modifier builder events (for feats)
    if (type.key === 'custom_feats') {
        bindModifierEvents(formArea);
    }
}

function getFormFields(typeKey, item) {
    const v = item || {};
    switch (typeKey) {
        case 'custom_races':
            return `
            <div class="form-group"><label>Name *</label><input class="form-input" id="hf-name" value="${v.name || ''}" required></div>
            <div class="hb-form-row">
              <div class="form-group"><label>Size</label>
                <select class="form-select" id="hf-size">
                  ${['Fine','Diminutive','Tiny','Small','Medium','Large','Huge','Gargantuan','Colossal'].map(s =>
                    `<option value="${s}"${(v.size || 'Medium') === s ? ' selected' : ''}>${s}</option>`).join('')}
                </select>
              </div>
              <div class="form-group"><label>Speed (ft)</label><input class="form-input" id="hf-speed" type="number" value="${v.speed || 30}"></div>
            </div>
            <div class="form-group"><label>Ability Modifiers</label><input class="form-input" id="hf-ability_mods" value="${v.ability_mods || ''}" placeholder="e.g., Str +2, Dex -2"></div>
            <div class="form-group"><label>Racial Traits</label><textarea class="form-input" id="hf-traits" rows="3" placeholder="Special abilities, resistances, etc.">${v.traits || ''}</textarea></div>
            <div class="form-group"><label>Languages</label><input class="form-input" id="hf-languages" value="${v.languages || ''}" placeholder="e.g., Common, Elvish"></div>`;

        case 'custom_classes':
            return `
            <div class="form-group"><label>Name *</label><input class="form-input" id="hf-name" value="${v.name || ''}" required></div>
            <div class="hb-form-row">
              <div class="form-group"><label>Hit Die</label>
                <select class="form-select" id="hf-hit_die">
                  ${['d4','d6','d8','d10','d12'].map(d =>
                    `<option value="${d}"${(v.hit_die || 'd8') === d ? ' selected' : ''}>${d}</option>`).join('')}
                </select>
              </div>
              <div class="form-group"><label>BAB Progression</label>
                <select class="form-select" id="hf-bab_type">
                  ${[['Full','Full'],['3/4','3/4'],['1/2','1/2']].map(([l,val]) =>
                    `<option value="${val}"${(v.bab_type || '3/4') === val ? ' selected' : ''}>${l}</option>`).join('')}
                </select>
              </div>
              <div class="form-group"><label>Skills/Level</label><input class="form-input" id="hf-skills_per_level" type="number" value="${v.skills_per_level || 2}" min="0" max="10"></div>
            </div>
            <div class="form-group"><label>Good Saves</label><input class="form-input" id="hf-good_saves" value="${v.good_saves || ''}" placeholder="e.g., Fort, Ref"></div>
            <div class="form-group"><label>Class Skills</label><input class="form-input" id="hf-class_skills" value="${v.class_skills || ''}" placeholder="Comma-separated list"></div>
            <div class="form-group"><label>Class Features</label><textarea class="form-input" id="hf-class_features" rows="3" placeholder="Special abilities, features per level, etc.">${v.class_features || ''}</textarea></div>`;

        case 'custom_feats': {
            const mods = parseModifiers(v.modifiers);
            return `
            <div class="form-group"><label>Name *</label><input class="form-input" id="hf-name" value="${v.name || ''}" required></div>
            <div class="form-group"><label>Type</label>
              <select class="form-select" id="hf-type">
                ${['General','Fighter','Metamagic','Item Creation','Divine','Epic','Racial','Regional','Tactical'].map(t =>
                  `<option value="${t}"${(v.type || 'General') === t ? ' selected' : ''}>${t}</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label>Prerequisites</label><input class="form-input" id="hf-prerequisites" value="${v.prerequisites || ''}" placeholder="e.g., BAB +6, Power Attack"></div>

            <div class="form-group hb-modifiers-section">
              <label>⚙️ Mechanical Modifiers</label>
              <p class="hb-mod-hint">Add stat changes this feat grants when taken. These are applied automatically in the Character Creator.</p>
              <div class="hb-mod-list" id="hb-mod-list">
                ${mods.map((m, i) => renderModRow(m, i)).join('')}
              </div>
              <button class="btn-sm btn-secondary" id="hb-mod-add" type="button">+ Add Modifier</button>
            </div>

            <div class="form-group"><label>Benefit <span class="hb-auto-label">(auto-generated from modifiers if empty)</span></label><textarea class="form-input" id="hf-benefit" rows="2" placeholder="What does this feat do?">${v.benefit || ''}</textarea></div>
            <div class="form-group"><label>Description</label><textarea class="form-input" id="hf-description" rows="3" placeholder="Extended description, flavor text...">${v.description || ''}</textarea></div>`;
        }

        case 'custom_spells':
            return `
            <div class="form-group"><label>Name *</label><input class="form-input" id="hf-name" value="${v.name || ''}" required></div>
            <div class="hb-form-row">
              <div class="form-group"><label>Level</label><input class="form-input" id="hf-level" type="number" value="${v.level || 0}" min="0" max="9"></div>
              <div class="form-group"><label>School</label>
                <select class="form-select" id="hf-school">
                  ${['','Abjuration','Conjuration','Divination','Enchantment','Evocation','Illusion','Necromancy','Transmutation','Universal'].map(s =>
                    `<option value="${s}"${(v.school || '') === s ? ' selected' : ''}>${s || '— Any —'}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="hb-form-row">
              <div class="form-group"><label>Casting Time</label><input class="form-input" id="hf-casting_time" value="${v.casting_time || '1 standard action'}"></div>
              <div class="form-group"><label>Range</label><input class="form-input" id="hf-range" value="${v.range || ''}" placeholder="e.g., Close (25 ft)"></div>
            </div>
            <div class="hb-form-row">
              <div class="form-group"><label>Duration</label><input class="form-input" id="hf-duration" value="${v.duration || ''}" placeholder="e.g., 1 min/level"></div>
              <div class="form-group"><label>Components</label><input class="form-input" id="hf-components" value="${v.components || ''}" placeholder="e.g., V, S, M"></div>
            </div>
            <div class="form-group"><label>Classes</label><input class="form-input" id="hf-classes" value="${v.classes || ''}" placeholder="e.g., Wizard 3, Cleric 4"></div>
            <div class="form-group"><label>Description</label><textarea class="form-input" id="hf-description" rows="4" placeholder="What does this spell do?">${v.description || ''}</textarea></div>`;

        case 'custom_equipment':
            return `
            <div class="form-group"><label>Name *</label><input class="form-input" id="hf-name" value="${v.name || ''}" required></div>
            <div class="hb-form-row">
              <div class="form-group"><label>Category</label>
                <select class="form-select" id="hf-category">
                  ${['','Simple Melee','Simple Ranged','Martial Melee','Martial Ranged','Exotic Melee','Exotic Ranged','Light Armor','Medium Armor','Heavy Armor','Shield','Adventuring Gear','Alchemical','Trade Goods','Special'].map(c =>
                    `<option value="${c}"${(v.category || '') === c ? ' selected' : ''}>${c || '— Select —'}</option>`).join('')}
                </select>
              </div>
              <div class="form-group"><label>Cost</label><input class="form-input" id="hf-cost" value="${v.cost || ''}" placeholder="e.g., 50 gp"></div>
            </div>
            <div class="hb-form-row">
              <div class="form-group"><label>Weight</label><input class="form-input" id="hf-weight" value="${v.weight || ''}" placeholder="e.g., 5 lb"></div>
              <div class="form-group"><label>Damage</label><input class="form-input" id="hf-damage" value="${v.damage || ''}" placeholder="e.g., 1d8"></div>
              <div class="form-group"><label>Critical</label><input class="form-input" id="hf-critical" value="${v.critical || ''}" placeholder="e.g., 19-20/x2"></div>
            </div>
            <div class="form-group"><label>Properties</label><textarea class="form-input" id="hf-properties" rows="2" placeholder="Special properties, notes...">${v.properties || ''}</textarea></div>`;

        default:
            return '<p>Unknown content type</p>';
    }
}

function collectFormData(typeKey, formArea, existing) {
    const get = (id) => formArea.querySelector(`#hf-${id}`)?.value?.trim() || '';
    const base = existing ? { id: existing.id } : {};

    switch (typeKey) {
        case 'custom_races':
            return { ...base, name: get('name'), size: get('size'), speed: parseInt(get('speed')) || 30, ability_mods: get('ability_mods'), traits: get('traits'), languages: get('languages') };
        case 'custom_classes':
            return { ...base, name: get('name'), hit_die: get('hit_die'), bab_type: get('bab_type'), good_saves: get('good_saves'), skills_per_level: parseInt(get('skills_per_level')) || 2, class_skills: get('class_skills'), class_features: get('class_features') };
        case 'custom_feats': {
            const modifiers = collectModifiers(formArea);
            let benefit = get('benefit');
            if (!benefit && modifiers.length) benefit = autoGenerateBenefit(modifiers);
            return { ...base, name: get('name'), type: get('type'), prerequisites: get('prerequisites'), benefit, description: get('description'), modifiers };
        }
        case 'custom_spells':
            return { ...base, name: get('name'), level: parseInt(get('level')) || 0, school: get('school'), casting_time: get('casting_time'), range: get('range'), duration: get('duration'), components: get('components'), description: get('description'), classes: get('classes') };
        case 'custom_equipment':
            return { ...base, name: get('name'), category: get('category'), cost: get('cost'), weight: get('weight'), damage: get('damage'), critical: get('critical'), properties: get('properties') };
        default:
            return base;
    }
}

// ═══════════════════════════════════════════════════════════
// FEAT MODIFIER BUILDER
// ═══════════════════════════════════════════════════════════

const MOD_TYPES = [
    { value: 'ability',     label: 'Ability Score',  hasTarget: true,  targets: ['str','dex','con','int','wis','cha'] },
    { value: 'save',        label: 'Saving Throw',   hasTarget: true,  targets: ['fort','ref','will','all_saves'] },
    { value: 'skill',       label: 'Skill Bonus',    hasTarget: true,  targets: [] }, // filled dynamically
    { value: 'ac',          label: 'Armor Class',    hasTarget: false },
    { value: 'hp',          label: 'Hit Points',     hasTarget: false },
    { value: 'initiative',  label: 'Initiative',     hasTarget: false },
    { value: 'attack',      label: 'Attack Bonus',   hasTarget: false },
    { value: 'damage',      label: 'Damage Bonus',   hasTarget: false },
    { value: 'speed',       label: 'Speed (ft)',      hasTarget: false },
    { value: 'spell_dc',    label: 'Spell Save DC',  hasTarget: false },
];

const TARGET_LABELS = {
    str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA',
    fort: 'Fortitude', ref: 'Reflex', will: 'Will', all_saves: 'All Saves',
};

function parseModifiers(raw) {
    if (!raw) return [];
    if (typeof raw === 'string') {
        try { return JSON.parse(raw) || []; } catch { return []; }
    }
    return Array.isArray(raw) ? raw : [];
}

function renderModRow(mod, index) {
    const typeInfo = MOD_TYPES.find(t => t.value === mod.type) || MOD_TYPES[0];
    return `
    <div class="hb-mod-row" data-index="${index}">
        <select class="form-select hb-mod-type" data-index="${index}">
            ${MOD_TYPES.map(t => `<option value="${t.value}"${mod.type === t.value ? ' selected' : ''}>${t.label}</option>`).join('')}
        </select>
        ${typeInfo.hasTarget ? `
            <select class="form-select hb-mod-target" data-index="${index}">
                ${typeInfo.targets.map(t => `<option value="${t}"${mod.target === t ? ' selected' : ''}>${TARGET_LABELS[t] || t}</option>`).join('')}
                ${mod.type === 'skill' ? `<option value="${mod.target || ''}" selected>${mod.target || 'Select skill...'}</option>` : ''}
            </select>
        ` : '<span class="hb-mod-no-target"></span>'}
        <div class="hb-mod-value-wrap">
            <select class="form-select hb-mod-sign" data-index="${index}">
                <option value="+"${(mod.value || 0) >= 0 ? ' selected' : ''}>+</option>
                <option value="-"${(mod.value || 0) < 0 ? ' selected' : ''}>−</option>
            </select>
            <input type="number" class="form-input hb-mod-val" data-index="${index}" value="${Math.abs(mod.value || 0)}" min="1" max="99">
        </div>
        <button class="btn-sm btn-danger hb-mod-remove" data-index="${index}" type="button">✕</button>
    </div>`;
}

function buildTargetOptions(modType, currentTarget) {
    const typeInfo = MOD_TYPES.find(t => t.value === modType);
    if (!typeInfo || !typeInfo.hasTarget) return '';

    if (modType === 'skill') {
        // Common 3.5e skills
        const skills = ['Appraise','Balance','Bluff','Climb','Concentration','Craft','Decipher Script',
            'Diplomacy','Disable Device','Disguise','Escape Artist','Forgery','Gather Information',
            'Handle Animal','Heal','Hide','Intimidate','Jump','Knowledge','Listen','Move Silently',
            'Open Lock','Perform','Profession','Ride','Search','Sense Motive','Sleight of Hand',
            'Speak Language','Spellcraft','Spot','Survival','Swim','Tumble','Use Magic Device','Use Rope'];
        return skills.map(s => `<option value="${s}"${currentTarget === s ? ' selected' : ''}>${s}</option>`).join('');
    }

    return typeInfo.targets.map(t => `<option value="${t}"${currentTarget === t ? ' selected' : ''}>${TARGET_LABELS[t] || t}</option>`).join('');
}

function bindModifierEvents(formArea) {
    const list = formArea.querySelector('#hb-mod-list');
    const addBtn = formArea.querySelector('#hb-mod-add');
    if (!list || !addBtn) return;

    // Add modifier row
    addBtn.addEventListener('click', () => {
        const index = list.querySelectorAll('.hb-mod-row').length;
        const newMod = { type: 'ability', target: 'str', value: 2 };
        const div = document.createElement('div');
        div.innerHTML = renderModRow(newMod, index);
        list.appendChild(div.firstElementChild);
        bindModRowEvents(list);
    });

    bindModRowEvents(list);
}

function bindModRowEvents(list) {
    // Remove buttons
    list.querySelectorAll('.hb-mod-remove').forEach(btn => {
        btn.onclick = () => {
            btn.closest('.hb-mod-row')?.remove();
            // Re-index remaining rows
            list.querySelectorAll('.hb-mod-row').forEach((row, i) => {
                row.dataset.index = i;
                row.querySelectorAll('[data-index]').forEach(el => el.dataset.index = i);
            });
        };
    });

    // Type change → rebuild target dropdown
    list.querySelectorAll('.hb-mod-type').forEach(sel => {
        sel.onchange = () => {
            const row = sel.closest('.hb-mod-row');
            const typeInfo = MOD_TYPES.find(t => t.value === sel.value);
            const targetEl = row.querySelector('.hb-mod-target');
            const noTargetEl = row.querySelector('.hb-mod-no-target');

            if (typeInfo?.hasTarget) {
                if (targetEl) {
                    targetEl.innerHTML = buildTargetOptions(sel.value, '');
                    targetEl.style.display = '';
                    if (noTargetEl) noTargetEl.style.display = 'none';
                } else {
                    // Need to insert a target select
                    const newSel = document.createElement('select');
                    newSel.className = 'form-select hb-mod-target';
                    newSel.dataset.index = row.dataset.index;
                    newSel.innerHTML = buildTargetOptions(sel.value, '');
                    sel.after(newSel);
                    if (noTargetEl) noTargetEl.remove();
                }
            } else {
                if (targetEl) {
                    targetEl.style.display = 'none';
                }
                if (!noTargetEl) {
                    const span = document.createElement('span');
                    span.className = 'hb-mod-no-target';
                    sel.after(span);
                }
            }
        };
    });
}

function collectModifiers(formArea) {
    const rows = formArea.querySelectorAll('.hb-mod-row');
    const mods = [];
    rows.forEach(row => {
        const type = row.querySelector('.hb-mod-type')?.value || 'ability';
        const target = row.querySelector('.hb-mod-target')?.value || '';
        const sign = row.querySelector('.hb-mod-sign')?.value || '+';
        const val = parseInt(row.querySelector('.hb-mod-val')?.value) || 0;
        const value = sign === '-' ? -val : val;
        const typeInfo = MOD_TYPES.find(t => t.value === type);
        const mod = { type, value };
        if (typeInfo?.hasTarget && target) mod.target = target;
        mods.push(mod);
    });
    return mods;
}

function autoGenerateBenefit(modifiers) {
    const labels = {
        ability: (m) => `${m.value >= 0 ? '+' : ''}${m.value} ${(TARGET_LABELS[m.target] || m.target || '').toUpperCase()}`,
        save: (m) => `${m.value >= 0 ? '+' : ''}${m.value} ${TARGET_LABELS[m.target] || m.target || ''} save`,
        skill: (m) => `${m.value >= 0 ? '+' : ''}${m.value} ${m.target || 'skill'}`,
        ac: (m) => `${m.value >= 0 ? '+' : ''}${m.value} AC`,
        hp: (m) => `${m.value >= 0 ? '+' : ''}${m.value} HP`,
        initiative: (m) => `${m.value >= 0 ? '+' : ''}${m.value} Initiative`,
        attack: (m) => `${m.value >= 0 ? '+' : ''}${m.value} Attack`,
        damage: (m) => `${m.value >= 0 ? '+' : ''}${m.value} Damage`,
        speed: (m) => `${m.value >= 0 ? '+' : ''}${m.value} ft. Speed`,
        spell_dc: (m) => `${m.value >= 0 ? '+' : ''}${m.value} Spell DC`,
    };
    return modifiers.map(m => (labels[m.type] || (() => ''))(m)).filter(Boolean).join(', ');
}
