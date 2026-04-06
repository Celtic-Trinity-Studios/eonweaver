/**
 * Eon Weaver — SRD Browser View (Full)
 * Comprehensive D&D 3.5e reference browser with all SRD data.
 * 
 * Tabs: Spells, Monsters, Feats, Equipment, Skills, Classes, Races, Powers, Domains, Magic Items
 * Features:
 *   - Feats: split-panel list + detail
 *   - Equipment: hover tooltips
 *   - Spells/Monsters/Powers/Items: clickable list → detail panel
 */
import {
    apiGetSrdRaces, apiGetSrdClasses, apiGetSrdSkills,
    apiGetSrdFeats, apiGetSrdEquipment,
    apiGetSrdSpells, apiGetSrdSpellDetail,
    apiGetSrdMonsters, apiGetSrdMonsterDetail,
    apiGetSrdPowers, apiGetSrdPowerDetail,
    apiGetSrdDomains,
    apiGetSrdItems, apiGetSrdItemDetail,
    apiGetSrdClassProgression
} from '../api/srd.js';

const TABS = [
    { key: 'spells', icon: '✨', label: 'Spells', count: 699 },
    { key: 'monsters', icon: '🐉', label: 'Monsters', count: 681 },
    { key: 'feats', icon: '⚔️', label: 'Feats', count: 387 },
    { key: 'powers', icon: '🔮', label: 'Powers', count: 286 },
    { key: 'equipment', icon: '🛡️', label: 'Equipment', count: 282 },
    { key: 'items', icon: '💎', label: 'Magic Items', count: 1680 },
    { key: 'classes', icon: '🎭', label: 'Classes', count: 16 },
    { key: 'races', icon: '👤', label: 'Races', count: 7 },
    { key: 'skills', icon: '📋', label: 'Skills', count: 40 },
    { key: 'domains', icon: '⛪', label: 'Domains', count: 36 },
];

let searchDebounceTimer = null;

export default function SrdBrowserView(container) {
    container.innerHTML = `
    <div class="view-srd">
      <header class="view-header">
        <h1>📖 SRD Reference Browser</h1>
      </header>

      <div class="srd-tabs" id="srd-tabs">
        ${TABS.map(t => `<button class="srd-tab${t.key === 'spells' ? ' active' : ''}" data-tab="${t.key}">
          <span class="srd-tab-icon">${t.icon}</span>
          <span class="srd-tab-label">${t.label}</span>
        </button>`).join('')}
        <div class="srd-search-inline">
          <input type="text" id="srd-search" placeholder="Search..." class="form-input">
        </div>
      </div>

      <div class="srd-content" id="srd-content">
        <p class="muted">Loading...</p>
      </div>
    </div>
  `;

    let currentTab = 'spells';

    container.querySelectorAll('.srd-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            currentTab = btn.dataset.tab;
            container.querySelectorAll('.srd-tab').forEach(b => b.classList.toggle('active', b === btn));
            container.querySelector('#srd-search').value = '';
            loadTab(container, currentTab, '');
        });
    });

    const searchInput = container.querySelector('#srd-search');
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            loadTab(container, currentTab, e.target.value.trim());
        }, 300);
    });

    loadTab(container, 'spells', '');
}

// ═══════════════════════════════════════════════════════════
// Tab Router
// ═══════════════════════════════════════════════════════════

async function loadTab(container, tab, search) {
    const content = container.querySelector('#srd-content');
    if (!content) return;
    content.innerHTML = '<div class="srd-loading"><div class="spinner"></div>Loading...</div>';

    try {
        switch (tab) {
            case 'spells': await renderSpells(content, search); break;
            case 'monsters': await renderMonsters(content, search); break;
            case 'feats': await renderFeats(content, search); break;
            case 'powers': await renderPowers(content, search); break;
            case 'equipment': await renderEquipment(content, search); break;
            case 'items': await renderItems(content, search); break;
            case 'classes': await renderClasses(content, search); break;
            case 'races': await renderRaces(content, search); break;
            case 'skills': await renderSkills(content, search); break;
            case 'domains': await renderDomains(content, search); break;
        }
    } catch (err) {
        content.innerHTML = `<p class="error">Failed to load: ${err.message}</p>`;
    }
}

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

function esc(str) {
    if (!str || str === 'None' || str === 'null') return '';
    return str;
}

function stripHtml(html) {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

function renderHtml(html) {
    if (!html || html === 'None') return '';
    // Clean up the SRD HTML — it uses <div topic=...> wrappers
    return html
        .replace(/<div topic=['"][^'"]*['"][^>]*>/gi, '')
        .replace(/<\/div>/gi, '')
        .replace(/<p>/gi, '<p>')
        .replace(/<h[2-8]>/gi, (m) => m)
        .trim();
}

function noResults(label) {
    return `<div class="srd-empty">
        <div class="srd-empty-icon">📭</div>
        <p>No ${label} found matching your search.</p>
    </div>`;
}

// ═══════════════════════════════════════════════════════════
// SPELLS — split list + detail
// ═══════════════════════════════════════════════════════════

async function renderSpells(content, search) {
    const data = (await apiGetSrdSpells(search)).data || [];
    if (!data.length) { content.innerHTML = noResults('spells'); return; }

    // Group spells by school, then by level
    const grouped = {};
    data.forEach(s => {
        const school = s.school || 'Unknown';
        if (!grouped[school]) grouped[school] = {};
        const lvlMatch = (s.level || '').match(/(\d+)/);
        const lvlNum = lvlMatch ? parseInt(lvlMatch[1]) : 0;
        const lvlKey = `Level ${lvlNum}`;
        if (!grouped[school][lvlKey]) grouped[school][lvlKey] = [];
        grouped[school][lvlKey].push(s);
    });
    const schools = Object.keys(grouped).sort();

    const listHtml = schools.map(school => {
        const levels = Object.keys(grouped[school]).sort((a, b) =>
            parseInt(a.replace('Level ', '')) - parseInt(b.replace('Level ', ''))
        );
        const total = levels.reduce((s, l) => s + grouped[school][l].length, 0);
        return `<div class="srd-group">
      <div class="srd-group-header"><span class="srd-group-arrow">▶</span>
        <span class="srd-group-name">${esc(school)}</span>
        <span class="srd-group-count">${total}</span></div>
      <div class="srd-group-body" style="display:none;">
        ${levels.map(lvl => `<div class="srd-subgroup">
          <div class="srd-subgroup-header"><span class="srd-subgroup-arrow">▶</span>
            <span class="srd-subgroup-name">${esc(lvl)}</span>
            <span class="srd-group-count">${grouped[school][lvl].length}</span></div>
          <div class="srd-subgroup-body" style="display:none;">
            ${grouped[school][lvl].map(s => `<div class="srd-list-item" data-id="${s.id}">
              <span class="srd-list-name">${s.name}</span>
              <span class="srd-list-meta">${esc(s.level || '')}</span>
            </div>`).join('')}
          </div>
        </div>`).join('')}
      </div>
    </div>`;
    }).join('');

    content.innerHTML = `<div class="srd-split">
    <div class="srd-list" id="srd-list">
      <div class="srd-list-header">
        <span class="srd-list-count">${data.length} spells</span>
        <button class="btn-sm btn-secondary" id="srd-expand-all">Expand All</button>
      </div>${listHtml}
    </div>
    <div class="srd-detail-panel" id="srd-detail">
      <div class="srd-detail-empty"><div class="srd-empty-icon">✨</div><p>Select a spell to view details</p></div>
    </div></div>`;

    // Toggle school groups
    content.querySelectorAll('.srd-group-header').forEach(h => {
        h.addEventListener('click', () => {
            const body = h.nextElementSibling;
            const arrow = h.querySelector('.srd-group-arrow');
            const open = body.style.display !== 'none';
            body.style.display = open ? 'none' : 'block';
            arrow.textContent = open ? '▶' : '▼';
        });
    });
    // Toggle level subgroups
    content.querySelectorAll('.srd-subgroup-header').forEach(h => {
        h.addEventListener('click', (e) => {
            e.stopPropagation();
            const body = h.nextElementSibling;
            const arrow = h.querySelector('.srd-subgroup-arrow');
            const open = body.style.display !== 'none';
            body.style.display = open ? 'none' : 'block';
            arrow.textContent = open ? '▶' : '▼';
        });
    });
    // Expand/Collapse All button
    content.querySelector('#srd-expand-all')?.addEventListener('click', () => {
        const allBodies = content.querySelectorAll('.srd-group-body, .srd-subgroup-body');
        const anyHidden = [...allBodies].some(b => b.style.display === 'none');
        allBodies.forEach(b => b.style.display = anyHidden ? 'block' : 'none');
        content.querySelectorAll('.srd-group-arrow, .srd-subgroup-arrow').forEach(a => a.textContent = anyHidden ? '▼' : '▶');
        content.querySelector('#srd-expand-all').textContent = anyHidden ? 'Collapse All' : 'Expand All';
    });

    // Detail panel click
    content.querySelector('#srd-list').addEventListener('click', async (e) => {
        const item = e.target.closest('.srd-list-item');
        if (!item) return;
        content.querySelectorAll('.srd-list-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        const detail = content.querySelector('#srd-detail');
        detail.innerHTML = '<div class="srd-loading"><div class="spinner"></div></div>';
        const d = (await apiGetSrdSpellDetail(item.dataset.id)).data;
        if (!d) { detail.innerHTML = '<p class="error">Not found</p>'; return; }
        detail.innerHTML = `<div class="srd-detail-content">
      <h2>${d.name}</h2>
      <div class="srd-detail-tags">
        <span class="srd-badge">${esc(d.school)}</span>
        ${d.subschool ? `<span class="srd-badge srd-badge-sub">${d.subschool}</span>` : ''}
        ${d.descriptor_text ? `<span class="srd-badge srd-badge-desc">[${d.descriptor_text}]</span>` : ''}
      </div>
      <div class="srd-stat-grid">
        <div class="srd-stat"><label>Level</label><span>${esc(d.level)}</span></div>
        <div class="srd-stat"><label>Components</label><span>${esc(d.components)}</span></div>
        <div class="srd-stat"><label>Casting Time</label><span>${esc(d.casting_time)}</span></div>
        <div class="srd-stat"><label>Range</label><span>${esc(d.spell_range)}</span></div>
        ${d.target ? `<div class="srd-stat"><label>Target</label><span>${esc(d.target)}</span></div>` : ''}
        ${d.area ? `<div class="srd-stat"><label>Area</label><span>${esc(d.area)}</span></div>` : ''}
        ${d.effect ? `<div class="srd-stat"><label>Effect</label><span>${esc(d.effect)}</span></div>` : ''}
        <div class="srd-stat"><label>Duration</label><span>${esc(d.duration)}</span></div>
        <div class="srd-stat"><label>Saving Throw</label><span>${esc(d.saving_throw)}</span></div>
        <div class="srd-stat"><label>Spell Resistance</label><span>${esc(d.spell_resistance)}</span></div>
      </div>
      ${d.description ? `<div class="srd-description">${renderHtml(d.description)}</div>` : ''}
      ${d.material_components ? `<div class="srd-extra"><strong>Material Components:</strong> ${esc(d.material_components)}</div>` : ''}
      ${d.focus ? `<div class="srd-extra"><strong>Focus:</strong> ${esc(d.focus)}</div>` : ''}
      ${d.xp_cost ? `<div class="srd-extra"><strong>XP Cost:</strong> ${esc(d.xp_cost)}</div>` : ''}
    </div>`;
    });
}

// ═══════════════════════════════════════════════════════════
// MONSTERS — split list + detail 
// ═══════════════════════════════════════════════════════════

async function renderMonsters(content, search) {
    const data = (await apiGetSrdMonsters(search)).data || [];
    if (!data.length) { content.innerHTML = noResults('monsters'); return; }

    content.innerHTML = `
        <div class="srd-split">
            <div class="srd-list" id="srd-list">
                <div class="srd-list-header">
                    <span class="srd-list-count">${data.length} monsters</span>
                </div>
                ${data.map(m => `
                    <div class="srd-list-item" data-id="${m.id}">
                        <span class="srd-list-name">${m.name}</span>
                        <span class="srd-list-meta">${esc(m.type)} · CR ${esc(m.challenge_rating)}</span>
                    </div>
                `).join('')}
            </div>
            <div class="srd-detail-panel" id="srd-detail">
                <div class="srd-detail-empty">
                    <div class="srd-empty-icon">🐉</div>
                    <p>Select a monster to view its stat block</p>
                </div>
            </div>
        </div>
    `;

    content.querySelector('#srd-list').addEventListener('click', async (e) => {
        const item = e.target.closest('.srd-list-item');
        if (!item) return;
        content.querySelectorAll('.srd-list-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        const detail = content.querySelector('#srd-detail');
        detail.innerHTML = '<div class="srd-loading"><div class="spinner"></div></div>';
        const d = (await apiGetSrdMonsterDetail(item.dataset.id)).data;
        if (!d) { detail.innerHTML = '<p class="error">Not found</p>'; return; }
        detail.innerHTML = `
            <div class="srd-detail-content srd-statblock">
                <h2>${d.name}</h2>
                <div class="srd-detail-tags">
                    <span class="srd-badge">${esc(d.size)} ${esc(d.type)}</span>
                    ${d.descriptor_text ? `<span class="srd-badge srd-badge-desc">${d.descriptor_text}</span>` : ''}
                    <span class="srd-badge srd-badge-cr">CR ${esc(d.challenge_rating)}</span>
                </div>
                <div class="srd-stat-grid">
                    <div class="srd-stat"><label>Hit Dice</label><span>${esc(d.hit_dice)}</span></div>
                    <div class="srd-stat"><label>Initiative</label><span>${esc(d.initiative)}</span></div>
                    <div class="srd-stat"><label>Speed</label><span>${esc(d.speed)}</span></div>
                    <div class="srd-stat srd-stat-wide"><label>Armor Class</label><span>${esc(d.armor_class)}</span></div>
                    <div class="srd-stat"><label>Base Attack</label><span>${esc(d.base_attack)}</span></div>
                    <div class="srd-stat"><label>Grapple</label><span>${esc(d.grapple)}</span></div>
                    <div class="srd-stat srd-stat-wide"><label>Attack</label><span>${esc(d.attack)}</span></div>
                    <div class="srd-stat srd-stat-wide"><label>Full Attack</label><span>${esc(d.full_attack)}</span></div>
                    <div class="srd-stat"><label>Space/Reach</label><span>${esc(d.space)} / ${esc(d.reach)}</span></div>
                    <div class="srd-stat srd-stat-wide"><label>Abilities</label><span>${esc(d.abilities)}</span></div>
                    <div class="srd-stat srd-stat-wide"><label>Saves</label><span>${esc(d.saves)}</span></div>
                </div>
                ${d.special_attacks ? `<div class="srd-extra"><strong>Special Attacks:</strong> ${esc(d.special_attacks)}</div>` : ''}
                ${d.special_qualities ? `<div class="srd-extra"><strong>Special Qualities:</strong> ${esc(d.special_qualities)}</div>` : ''}
                ${d.skills ? `<div class="srd-extra"><strong>Skills:</strong> ${esc(d.skills)}</div>` : ''}
                ${d.feats ? `<div class="srd-extra"><strong>Feats:</strong> ${esc(d.feats)}</div>` : ''}
                <div class="srd-stat-grid">
                    <div class="srd-stat"><label>Environment</label><span>${esc(d.environment)}</span></div>
                    <div class="srd-stat"><label>Organization</label><span>${esc(d.organization)}</span></div>
                    <div class="srd-stat"><label>Treasure</label><span>${esc(d.treasure)}</span></div>
                    <div class="srd-stat"><label>Alignment</label><span>${esc(d.alignment)}</span></div>
                    <div class="srd-stat"><label>Advancement</label><span>${esc(d.advancement)}</span></div>
                    ${d.level_adjustment ? `<div class="srd-stat"><label>Level Adj.</label><span>${esc(d.level_adjustment)}</span></div>` : ''}
                </div>
                ${d.special_abilities ? `<div class="srd-description"><strong>Special Abilities:</strong><br>${renderHtml(d.special_abilities)}</div>` : ''}
            </div>
        `;
    });
}

// ═══════════════════════════════════════════════════════════
// FEATS — split list + detail panel
// ═══════════════════════════════════════════════════════════

async function renderFeats(content, search) {
    const data = (await apiGetSrdFeats(search)).data || [];
    if (!data.length) { content.innerHTML = noResults('feats'); return; }

    // Group by type
    const groups = {};
    data.forEach(f => {
        const type = f.type || 'General';
        if (!groups[type]) groups[type] = [];
        groups[type].push(f);
    });

    const sortedTypes = Object.keys(groups).sort();

    content.innerHTML = `
        <div class="srd-split">
            <div class="srd-list" id="srd-list">
                <div class="srd-list-header">
                    <span class="srd-list-count">${data.length} feats</span>
                </div>
                ${sortedTypes.map(type => `
                    <div class="srd-list-group">${type} (${groups[type].length})</div>
                    ${groups[type].map(f => `
                        <div class="srd-list-item" data-id="${f.id}">
                            <span class="srd-list-name">${f.name}</span>
                            <span class="srd-list-meta">${f.prerequisites && f.prerequisites !== 'None' ? '📌' : ''}</span>
                        </div>
                    `).join('')}
                `).join('')}
            </div>
            <div class="srd-detail-panel" id="srd-detail">
                <div class="srd-detail-empty">
                    <div class="srd-empty-icon">⚔️</div>
                    <p>Select a feat to view details</p>
                </div>
            </div>
        </div>
    `;

    // Store data for quick lookup instead of API call
    const featMap = {};
    data.forEach(f => featMap[f.id] = f);

    content.querySelector('#srd-list').addEventListener('click', (e) => {
        const item = e.target.closest('.srd-list-item');
        if (!item) return;
        content.querySelectorAll('.srd-list-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        const detail = content.querySelector('#srd-detail');
        const f = featMap[item.dataset.id];
        if (!f) return;

        const prereq = esc(f.prerequisites) || 'None';
        const benefit = esc(f.benefit) || '';
        const special = esc(f.special) || '';
        const normal = esc(f.normal_text) || '';

        detail.innerHTML = `
            <div class="srd-detail-content">
                <h2>${f.name}</h2>
                <div class="srd-detail-tags">
                    <span class="srd-badge">${f.type}</span>
                    ${f.multiple === 'Yes' ? '<span class="srd-badge srd-badge-sub">Multiple</span>' : ''}
                    ${f.stack === 'Yes' ? '<span class="srd-badge srd-badge-desc">Stacks</span>' : ''}
                </div>
                <div class="srd-feat-section">
                    <h4>Prerequisites</h4>
                    <p>${prereq}</p>
                </div>
                <div class="srd-feat-section">
                    <h4>Benefit</h4>
                    <div>${renderHtml(benefit)}</div>
                </div>
                ${normal && normal !== 'None' ? `<div class="srd-feat-section"><h4>Normal</h4><div>${renderHtml(normal)}</div></div>` : ''}
                ${special && special !== 'None' ? `<div class="srd-feat-section"><h4>Special</h4><div>${renderHtml(special)}</div></div>` : ''}
            </div>
        `;
    });
}

// ═══════════════════════════════════════════════════════════
// POWERS — split list + detail
// ═══════════════════════════════════════════════════════════

async function renderPowers(content, search) {
    const data = (await apiGetSrdPowers(search)).data || [];
    if (!data.length) { content.innerHTML = noResults('psionic powers'); return; }

    // Group by discipline, then by level
    const grouped = {};
    data.forEach(p => {
        const disc = p.discipline || 'Unknown';
        if (!grouped[disc]) grouped[disc] = {};
        const lvlMatch = (p.level || '').match(/(\d+)/);
        const lvlNum = lvlMatch ? parseInt(lvlMatch[1]) : 0;
        const lvlKey = `Level ${lvlNum}`;
        if (!grouped[disc][lvlKey]) grouped[disc][lvlKey] = [];
        grouped[disc][lvlKey].push(p);
    });
    const disciplines = Object.keys(grouped).sort();

    const listHtml = disciplines.map(disc => {
        const levels = Object.keys(grouped[disc]).sort((a, b) =>
            parseInt(a.replace('Level ', '')) - parseInt(b.replace('Level ', ''))
        );
        const total = levels.reduce((s, l) => s + grouped[disc][l].length, 0);
        return `<div class="srd-group">
            <div class="srd-group-header"><span class="srd-group-arrow">▶</span>
                <span class="srd-group-name">${esc(disc)}</span>
                <span class="srd-group-count">${total}</span></div>
            <div class="srd-group-body" style="display:none;">
                ${levels.map(lvl => `<div class="srd-subgroup">
                    <div class="srd-subgroup-header"><span class="srd-subgroup-arrow">▶</span>
                        <span class="srd-subgroup-name">${esc(lvl)}</span>
                        <span class="srd-group-count">${grouped[disc][lvl].length}</span></div>
                    <div class="srd-subgroup-body" style="display:none;">
                        ${grouped[disc][lvl].map(p => `<div class="srd-list-item" data-id="${p.id}">
                            <span class="srd-list-name">${p.name}</span>
                            <span class="srd-list-meta">${esc(p.power_points || '')} PP</span>
                        </div>`).join('')}
                    </div>
                </div>`).join('')}
            </div>
        </div>`;
    }).join('');

    content.innerHTML = `<div class="srd-split">
        <div class="srd-list" id="srd-list">
            <div class="srd-list-header">
                <span class="srd-list-count">${data.length} powers</span>
                <button class="btn-sm btn-secondary" id="srd-expand-all">Expand All</button>
            </div>${listHtml}
        </div>
        <div class="srd-detail-panel" id="srd-detail">
            <div class="srd-detail-empty"><div class="srd-empty-icon">🔮</div><p>Select a power to view details</p></div>
        </div></div>`;

    // Toggle groups
    content.querySelectorAll('.srd-group-header').forEach(h => {
        h.addEventListener('click', () => {
            const body = h.nextElementSibling;
            const arrow = h.querySelector('.srd-group-arrow');
            const open = body.style.display !== 'none';
            body.style.display = open ? 'none' : 'block';
            arrow.textContent = open ? '▶' : '▼';
        });
    });
    content.querySelectorAll('.srd-subgroup-header').forEach(h => {
        h.addEventListener('click', (e) => {
            e.stopPropagation();
            const body = h.nextElementSibling;
            const arrow = h.querySelector('.srd-subgroup-arrow');
            const open = body.style.display !== 'none';
            body.style.display = open ? 'none' : 'block';
            arrow.textContent = open ? '▶' : '▼';
        });
    });
    content.querySelector('#srd-expand-all')?.addEventListener('click', () => {
        const allBodies = content.querySelectorAll('.srd-group-body, .srd-subgroup-body');
        const anyHidden = [...allBodies].some(b => b.style.display === 'none');
        allBodies.forEach(b => b.style.display = anyHidden ? 'block' : 'none');
        content.querySelectorAll('.srd-group-arrow, .srd-subgroup-arrow').forEach(a => a.textContent = anyHidden ? '▼' : '▶');
        content.querySelector('#srd-expand-all').textContent = anyHidden ? 'Collapse All' : 'Expand All';
    });

    // Detail click
    content.querySelector('#srd-list').addEventListener('click', async (e) => {
        const item = e.target.closest('.srd-list-item');
        if (!item) return;
        content.querySelectorAll('.srd-list-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        const detail = content.querySelector('#srd-detail');
        detail.innerHTML = '<div class="srd-loading"><div class="spinner"></div></div>';
        const d = (await apiGetSrdPowerDetail(item.dataset.id)).data;
        if (!d) { detail.innerHTML = '<p class="error">Not found</p>'; return; }
        detail.innerHTML = `<div class="srd-detail-content">
            <h2>${d.name}</h2>
            <div class="srd-detail-tags">
                <span class="srd-badge">${esc(d.discipline)}</span>
                ${d.subdiscipline ? `<span class="srd-badge srd-badge-sub">${d.subdiscipline}</span>` : ''}
                ${d.descriptor_text ? `<span class="srd-badge srd-badge-desc">[${d.descriptor_text}]</span>` : ''}
            </div>
            <div class="srd-stat-grid">
                <div class="srd-stat"><label>Level</label><span>${esc(d.level)}</span></div>
                <div class="srd-stat"><label>Display</label><span>${esc(d.display)}</span></div>
                <div class="srd-stat"><label>Manifesting Time</label><span>${esc(d.manifesting_time)}</span></div>
                <div class="srd-stat"><label>Range</label><span>${esc(d.power_range)}</span></div>
                ${d.target ? `<div class="srd-stat"><label>Target</label><span>${esc(d.target)}</span></div>` : ''}
                <div class="srd-stat"><label>Duration</label><span>${esc(d.duration)}</span></div>
                <div class="srd-stat"><label>Saving Throw</label><span>${esc(d.saving_throw)}</span></div>
                <div class="srd-stat"><label>Power Points</label><span>${esc(d.power_points)}</span></div>
                <div class="srd-stat"><label>Power Resistance</label><span>${esc(d.power_resistance)}</span></div>
            </div>
            ${d.description ? `<div class="srd-description">${renderHtml(d.description)}</div>` : ''}
            ${d.augment ? `<div class="srd-extra"><strong>Augment:</strong> ${renderHtml(d.augment)}</div>` : ''}
        </div>`;
    });
}

// ═══════════════════════════════════════════════════════════
// EQUIPMENT — table with hover tooltips
// ═══════════════════════════════════════════════════════════

async function renderEquipment(content, search) {
    const data = (await apiGetSrdEquipment(search)).data || [];
    if (!data.length) { content.innerHTML = noResults('equipment'); return; }

    // Group by category
    const groups = {};
    data.forEach(e => {
        const cat = e.category || 'Other';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(e);
    });

    const cats = Object.keys(groups).sort();

    content.innerHTML = `
        <div class="srd-equip-layout">
            <div class="srd-equip-cats">
                <button class="srd-cat-btn active" data-cat="all">All (${data.length})</button>
                ${cats.map(c => `<button class="srd-cat-btn" data-cat="${c}">${c} (${groups[c].length})</button>`).join('')}
            </div>
            <div class="srd-equip-table" id="srd-equip-table">
                ${renderEquipTable(data)}
            </div>
        </div>
    `;

    // Category filter
    content.querySelectorAll('.srd-cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            content.querySelectorAll('.srd-cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const cat = btn.dataset.cat;
            const filtered = cat === 'all' ? data : groups[cat] || [];
            content.querySelector('#srd-equip-table').innerHTML = renderEquipTable(filtered);
        });
    });
}

function renderEquipTable(items) {
    return `<table class="srd-table srd-table-hover">
        <thead><tr>
            <th>Name</th><th>Category</th><th>Cost</th><th>Weight</th><th>Damage (M)</th><th>Critical</th><th>Type</th>
        </tr></thead>
        <tbody>${items.map(e => {
        const tooltipParts = [];
        if (e.armor_bonus) tooltipParts.push(`AC Bonus: +${e.armor_bonus}`);
        if (e.max_dex) tooltipParts.push(`Max Dex: +${e.max_dex}`);
        if (e.acp) tooltipParts.push(`ACP: ${e.acp}`);
        if (e.spell_failure) tooltipParts.push(`Spell Failure: ${e.spell_failure}%`);
        if (e.range_increment) tooltipParts.push(`Range: ${e.range_increment}`);
        if (e.dmg_s) tooltipParts.push(`Dmg (S): ${e.dmg_s}`);
        if (e.properties) tooltipParts.push(e.properties);

        const tooltip = tooltipParts.length ? tooltipParts.join(' | ') : '';

        return `<tr class="srd-equip-row" ${tooltip ? `data-tooltip="${tooltip.replace(/"/g, '&quot;')}"` : ''}>
                <td class="srd-equip-name">${e.name}${tooltip ? '<span class="srd-tooltip-icon">ℹ️</span>' : ''}</td>
                <td>${esc(e.category)}</td>
                <td>${esc(e.cost)}</td>
                <td>${esc(e.weight)}</td>
                <td>${esc(e.dmg_m) || esc(e.damage) || '—'}</td>
                <td>${esc(e.critical) || '—'}</td>
                <td>${esc(e.type_text) || '—'}</td>
            </tr>`;
    }).join('')}</tbody>
    </table>`;
}

// ═══════════════════════════════════════════════════════════
// MAGIC ITEMS — split list + detail
// ═══════════════════════════════════════════════════════════

async function renderItems(content, search) {
    const data = (await apiGetSrdItems(search)).data || [];
    if (!data.length) { content.innerHTML = noResults('magic items'); return; }

    content.innerHTML = `
        <div class="srd-split">
            <div class="srd-list" id="srd-list">
                <div class="srd-list-header">
                    <span class="srd-list-count">${data.length} items</span>
                </div>
                ${data.map(m => `
                    <div class="srd-list-item" data-id="${m.id}">
                        <span class="srd-list-name">${m.name}</span>
                        <span class="srd-list-meta">${esc(m.category)} · ${esc(m.price)}</span>
                    </div>
                `).join('')}
            </div>
            <div class="srd-detail-panel" id="srd-detail">
                <div class="srd-detail-empty">
                    <div class="srd-empty-icon">💎</div>
                    <p>Select an item to view details</p>
                </div>
            </div>
        </div>
    `;

    content.querySelector('#srd-list').addEventListener('click', async (e) => {
        const item = e.target.closest('.srd-list-item');
        if (!item) return;
        content.querySelectorAll('.srd-list-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        const detail = content.querySelector('#srd-detail');
        detail.innerHTML = '<div class="srd-loading"><div class="spinner"></div></div>';
        const d = (await apiGetSrdItemDetail(item.dataset.id)).data;
        if (!d) { detail.innerHTML = '<p class="error">Not found</p>'; return; }
        detail.innerHTML = `
            <div class="srd-detail-content">
                <h2>${d.name}</h2>
                <div class="srd-detail-tags">
                    <span class="srd-badge">${esc(d.category)}</span>
                    ${d.subcategory ? `<span class="srd-badge srd-badge-sub">${d.subcategory}</span>` : ''}
                </div>
                <div class="srd-stat-grid">
                    ${d.aura ? `<div class="srd-stat"><label>Aura</label><span>${esc(d.aura)}</span></div>` : ''}
                    ${d.caster_level ? `<div class="srd-stat"><label>Caster Level</label><span>${esc(d.caster_level)}</span></div>` : ''}
                    <div class="srd-stat"><label>Price</label><span>${esc(d.price)}</span></div>
                    ${d.cost ? `<div class="srd-stat"><label>Cost</label><span>${esc(d.cost)}</span></div>` : ''}
                    ${d.weight ? `<div class="srd-stat"><label>Weight</label><span>${esc(d.weight)}</span></div>` : ''}
                </div>
                ${d.prereq ? `<div class="srd-extra"><strong>Prerequisites:</strong> ${esc(d.prereq)}</div>` : ''}
                ${d.full_text ? `<div class="srd-description">${renderHtml(d.full_text)}</div>` : ''}
            </div>
        `;
    });
}

// ═══════════════════════════════════════════════════════════
// CLASSES — split list + detail with progression table
// ═══════════════════════════════════════════════════════════

async function renderClasses(content, search) {
    const data = (await apiGetSrdClasses()).data || [];
    const q = (search || '').toLowerCase();
    const items = q ? data.filter(c => (c.name || '').toLowerCase().includes(q) || (c.class_features || '').toLowerCase().includes(q)) : data;
    if (!items.length) { content.innerHTML = noResults('classes'); return; }

    content.innerHTML = `
      <div class="srd-split">
          <div class="srd-list" id="srd-list">
              <div class="srd-list-header">
                  <span class="srd-list-count">${items.length} classes</span>
              </div>
              ${items.map(c => `
                  <div class="srd-list-item" data-name="${c.name}">
                      <span class="srd-list-name">${c.name}</span>
                      <span class="srd-list-meta">HD ${c.hit_die || '?'}</span>
                  </div>
              `).join('')}
          </div>
          <div class="srd-detail-panel" id="srd-detail">
              <div class="srd-detail-empty">
                  <div class="srd-empty-icon">🎭</div>
                  <p>Select a class to view details</p>
              </div>
          </div>
      </div>
  `;

    // Store for quick lookup
    const classMap = {};
    items.forEach(c => classMap[c.name] = c);

    content.querySelector('#srd-list').addEventListener('click', async (e) => {
        const item = e.target.closest('.srd-list-item');
        if (!item) return;
        content.querySelectorAll('.srd-list-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        const detail = content.querySelector('#srd-detail');
        const c = classMap[item.dataset.name];
        if (!c) return;

        // Load progression
        detail.innerHTML = '<div class="srd-loading"><div class="spinner"></div>Loading progression...</div>';
        const prog = (await apiGetSrdClassProgression(c.name)).data || [];

        detail.innerHTML = `
        <div class="srd-detail-content">
            <h2>${c.name}</h2>
            <div class="srd-stat-grid">
                <div class="srd-stat"><label>Hit Die</label><span>${c.hit_die}</span></div>
                <div class="srd-stat"><label>BAB Type</label><span>${c.bab_type}</span></div>
                <div class="srd-stat"><label>Skills/Level</label><span>${c.skills_per_level}</span></div>
                <div class="srd-stat"><label>Good Saves</label><span>${c.good_saves || 'None'}</span></div>
            </div>
            <div class="srd-extra"><strong>Class Features:</strong> ${c.class_features || '—'}</div>
            ${prog.length ? `
                <h3 class="srd-section-title">📊 Level Progression</h3>
                <div class="srd-progression-wrap">
                    <table class="srd-table srd-table-sm">
                        <thead><tr><th>Lvl</th><th>BAB</th><th>Fort</th><th>Ref</th><th>Will</th><th>Special</th></tr></thead>
                        <tbody>${prog.map(r => `<tr>
                            <td>${r.level}</td><td>${esc(r.base_attack_bonus)}</td><td>${esc(r.fort_save)}</td><td>${esc(r.ref_save)}</td><td>${esc(r.will_save)}</td><td>${esc(r.special) || '—'}</td>
                        </tr>`).join('')}</tbody>
                    </table>
                </div>
            ` : '<p class="muted">No progression data available.</p>'}
        </div>
    `;
    });
}

// ═══════════════════════════════════════════════════════════
// RACES — cards
// ═══════════════════════════════════════════════════════════

async function renderRaces(content, search) {
    const data = (await apiGetSrdRaces()).data || [];
    const q = (search || '').toLowerCase();
    const items = q ? data.filter(r => (r.name || '').toLowerCase().includes(q)) : data;
    if (!items.length) { content.innerHTML = noResults('races'); return; }

    content.innerHTML = `<div class="srd-grid">${items.map(r => `
        <div class="srd-card">
            <h3>${r.name}</h3>
            <div class="srd-detail"><strong>Size:</strong> ${r.size} | <strong>Speed:</strong> ${r.speed}ft</div>
            <div class="srd-detail"><strong>Ability Mods:</strong> ${r.ability_mods || 'None'}</div>
            <div class="srd-detail"><strong>Traits:</strong> ${r.traits || '—'}</div>
            <div class="srd-detail"><strong>Languages:</strong> ${r.languages || '—'}</div>
        </div>
    `).join('')}</div>`;
}

// ═══════════════════════════════════════════════════════════
// SKILLS — table
// ═══════════════════════════════════════════════════════════

async function renderSkills(content, search) {
    const data = (await apiGetSrdSkills()).data || [];
    const q = (search || '').toLowerCase();
    const items = q ? data.filter(s => (s.name || '').toLowerCase().includes(q)) : data;
    if (!items.length) { content.innerHTML = noResults('skills'); return; }

    content.innerHTML = `<div class="srd-split">
        <div class="srd-list" id="srd-list">
            <div class="srd-list-header">
                <span class="srd-list-count">${items.length} skills</span>
            </div>
            <div class="skills-table-wrap" style="max-height:none;border:none;">
                <table class="skills-table" id="srd-skills-table">
                    <thead><tr><th>Skill</th><th>Ab.</th><th>Trn</th><th>ACP</th></tr></thead>
                    <tbody>${items.map(s => `<tr data-id="${s.id}" class="srd-skill-row">
                        <td class="skill-name">${s.name}${s.subtype ? ` (${s.subtype})` : ''}</td>
                        <td class="skill-val">${s.ability || ''}</td>
                        <td class="skill-val">${s.trained_only === 'Yes' || s.trained_only == 1 ? '✓' : ''}</td>
                        <td class="skill-val">${s.armor_check_penalty === 'Yes' || s.armor_check_penalty == 1 ? '✓' : ''}</td>
                    </tr>`).join('')}</tbody>
                </table>
            </div>
        </div>
        <div class="srd-detail-panel" id="srd-detail">
            <div class="srd-detail-empty"><div class="srd-empty-icon">📋</div><p>Select a skill to view details</p></div>
        </div>
    </div>`;

    // Click to show detail
    content.querySelector('#srd-skills-table').addEventListener('click', (e) => {
        const row = e.target.closest('tr[data-id]');
        if (!row) return;
        content.querySelectorAll('.srd-skill-row').forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');
        const id = parseInt(row.dataset.id);
        const skill = items.find(s => s.id === id || s.id === String(id));
        const detail = content.querySelector('#srd-detail');
        if (!skill) { detail.innerHTML = '<p class="error">Not found</p>'; return; }
        detail.innerHTML = `<div class="srd-detail-content">
            <h2>${skill.name}${skill.subtype ? ` (${skill.subtype})` : ''}</h2>
            <div class="srd-detail-tags">
                <span class="srd-badge">${skill.ability || 'N/A'}</span>
                ${skill.trained_only == 1 || skill.trained_only === 'Yes' ? '<span class="srd-badge srd-badge-sub">Trained Only</span>' : ''}
                ${skill.armor_check_penalty == 1 || skill.armor_check_penalty === 'Yes' ? '<span class="srd-badge srd-badge-desc">Armor Check Penalty</span>' : ''}
                ${skill.psionic === 'Yes' ? '<span class="srd-badge srd-badge-sub">Psionic</span>' : ''}
            </div>
            ${skill.full_text ? `<div class="srd-description" style="margin-top:0.75rem;">${renderHtml(skill.full_text)}</div>`
                : skill.description ? `<div class="srd-description" style="margin-top:0.75rem;">${renderHtml(skill.description)}</div>` : ''}
            ${skill.synergy ? `<div class="srd-extra"><strong>Synergy:</strong> ${renderHtml(skill.synergy)}</div>` : ''}
        </div>`;
    });
}

// ═══════════════════════════════════════════════════════════
// DOMAINS — split list + detail with spell lists
// ═══════════════════════════════════════════════════════════

async function renderDomains(content, search) {
    const data = (await apiGetSrdDomains()).data || [];
    const q = (search || '').toLowerCase();
    const items = q ? data.filter(d => (d.name || '').toLowerCase().includes(q)) : data;
    if (!items.length) { content.innerHTML = noResults('domains'); return; }

    content.innerHTML = `
      <div class="srd-split">
          <div class="srd-list" id="srd-list">
              <div class="srd-list-header">
                  <span class="srd-list-count">${items.length} domains</span>
              </div>
              ${items.map(d => `
                  <div class="srd-list-item" data-name="${d.name}">
                      <span class="srd-list-name">⛪ ${d.name}</span>
                  </div>
              `).join('')}
          </div>
          <div class="srd-detail-panel" id="srd-detail">
              <div class="srd-detail-empty">
                  <div class="srd-empty-icon">⛪</div>
                  <p>Select a domain to view details</p>
              </div>
          </div>
      </div>
  `;

    // Store for quick lookup
    const domainMap = {};
    items.forEach(d => domainMap[d.name] = d);

    content.querySelector('#srd-list').addEventListener('click', (e) => {
        const item = e.target.closest('.srd-list-item');
        if (!item) return;
        content.querySelectorAll('.srd-list-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        const detail = content.querySelector('#srd-detail');
        const d = domainMap[item.dataset.name];
        if (!d) return;

        const spells = [];
        for (let i = 1; i <= 9; i++) {
            const spell = d[`spell_${i}`];
            if (spell) spells.push({ level: i, name: spell });
        }

        detail.innerHTML = `
        <div class="srd-detail-content">
            <h2>⛪ ${d.name} Domain</h2>
            <div class="srd-feat-section">
                <h4>Granted Powers</h4>
                <div>${renderHtml(d.granted_powers) || '—'}</div>
            </div>
            <div class="srd-feat-section">
                <h4>Domain Spells</h4>
                <table class="srd-table srd-table-sm">
                    <thead><tr><th>Level</th><th>Spell</th></tr></thead>
                    <tbody>${spells.map(s => `<tr>
                        <td><strong>${s.level}</strong></td>
                        <td>${s.name}</td>
                    </tr>`).join('')}</tbody>
                </table>
            </div>
            ${d.full_text ? `<div class="srd-description">${renderHtml(d.full_text)}</div>` : ''}
        </div>
    `;
    });
}
