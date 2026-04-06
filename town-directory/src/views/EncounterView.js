/**
 * Eon Weaver — Encounter View
 * Manage combat encounters: list, create, setup (pull from towns), and run combat.
 */
import { getState } from '../stores/appState.js';
import { navigate } from '../router.js';
import {
    apiGetEncounters, apiCreateEncounter, apiDeleteEncounter, apiGetEncounter,
    apiUpdateEncounter, apiAddParticipant, apiRemoveParticipant, apiUpdateParticipant,
    apiCreateEncounterGroup, apiRenameEncounterGroup, apiDeleteEncounterGroup,
    apiGetParty
} from '../api/encounters.js';
import { apiFetch } from '../api/client.js';
import { roll, formatMod } from '../engine/dice.js';
import { abilityMod, parseGearWeapons } from '../engine/rulesAdapter.js';
import { CONDITIONS, getAllConditions } from '../engine/conditions.js';

export default function EncounterView(container, params) {
    const encounterId = params.id ? parseInt(params.id) : null;

    if (encounterId) {
        renderEncounterDetail(container, encounterId);
    } else {
        renderEncounterList(container);
    }
}

/* ═══════════════════════════════════════════════════════════
   ENCOUNTER LIST
   ═══════════════════════════════════════════════════════════ */
function renderEncounterList(container) {
    container.innerHTML = `
    <div class="encounter-view">
      <div class="view-header">
        <h1>⚔️ Encounters</h1>
        <div class="view-header-actions">
          <button class="btn-primary" id="enc-create-btn">+ New Encounter</button>
        </div>
      </div>
      <div id="enc-list" class="enc-list"><div class="loading-spinner">Loading encounters...</div></div>
    </div>
    `;

    loadEncounterList(container);
    bindListEvents(container);
}

async function loadEncounterList(container) {
    try {
        const res = await apiGetEncounters();
        const list = container.querySelector('#enc-list');
        const encounters = res.encounters || [];

        if (!encounters.length) {
            list.innerHTML = '<div class="empty-state"><p>No encounters yet. Create one to get started!</p></div>';
            return;
        }

        list.innerHTML = encounters.map(e => `
            <div class="enc-card" data-id="${e.id}">
                <div class="enc-card-header">
                    <span class="enc-card-status enc-status-${e.status}">${statusIcon(e.status)}</span>
                    <span class="enc-card-name">${e.name}</span>
                    <span class="enc-card-count">${e.participant_count || 0} 👤</span>
                </div>
                ${e.description ? `<div class="enc-card-desc">${e.description}</div>` : ''}
                <div class="enc-card-footer">
                    <span class="text-muted">${formatDate(e.updated_at)}</span>
                    <div class="enc-card-actions">
                        <button class="btn-secondary btn-sm enc-open-btn" data-id="${e.id}">Open</button>
                        <button class="btn-danger btn-sm enc-delete-btn" data-id="${e.id}" title="Delete">🗑️</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        container.querySelector('#enc-list').innerHTML = `<div class="error-state">Error: ${err.message}</div>`;
    }
}

function bindListEvents(container) {
    container.querySelector('#enc-create-btn').addEventListener('click', async () => {
        const name = prompt('Encounter name:');
        if (!name) return;
        const desc = prompt('Description (optional):', '') || '';
        try {
            const res = await apiCreateEncounter(name, desc);
            navigate(`encounters/${res.id}`);
        } catch (err) {
            alert('Error: ' + err.message);
        }
    });

    container.querySelector('#enc-list').addEventListener('click', async (e) => {
        const openBtn = e.target.closest('.enc-open-btn');
        if (openBtn) { navigate(`encounters/${openBtn.dataset.id}`); return; }
        const delBtn = e.target.closest('.enc-delete-btn');
        if (delBtn) {
            if (!confirm('Delete this encounter?')) return;
            try {
                await apiDeleteEncounter(parseInt(delBtn.dataset.id));
                loadEncounterList(container);
            } catch (err) { alert('Error: ' + err.message); }
            return;
        }
        const card = e.target.closest('.enc-card');
        if (card && !e.target.closest('button')) { navigate(`encounters/${card.dataset.id}`); }
    });
}


/* ═══════════════════════════════════════════════════════════
   ENCOUNTER DETAIL (Setup + Combat)
   ═══════════════════════════════════════════════════════════ */
let currentEncounter = null;
let combatLog = [];

function renderEncounterDetail(container, encId) {
    container.innerHTML = `
    <div class="encounter-view encounter-detail">
      <div class="view-header">
        <button class="btn-secondary btn-sm" id="enc-back-btn">← Back</button>
        <h1 id="enc-detail-title">Loading...</h1>
        <div class="view-header-actions">
          <button class="btn-secondary btn-sm" id="enc-mode-setup" title="Setup Mode">⚙️ Setup</button>
          <button class="btn-primary btn-sm" id="enc-mode-combat" title="Start Combat">▶️ Combat</button>
        </div>
      </div>

      <!-- Setup Mode -->
      <div id="enc-setup" class="enc-setup-panel">
        <div class="enc-setup-grid">
          <!-- Left: Town Character Picker -->
          <div class="enc-picker">
            <h3>📦 Add from Town</h3>
            <div class="enc-picker-controls">
              <select id="enc-pick-town" class="form-input">
                <option value="">Select a town...</option>
              </select>
              <button class="btn-secondary btn-sm" id="enc-add-party-all" title="Quick-add all party members">🛡️ Add Party</button>
            </div>
            <input type="text" id="enc-pick-search" class="form-input" placeholder="Filter characters..." style="margin-bottom:0.5rem">
            <div class="enc-pick-side-default" style="margin-bottom:0.5rem;font-size:0.75rem">
              Default side:
              <select id="enc-default-side" class="form-input" style="width:auto;display:inline-block;font-size:0.75rem;padding:0.1rem 0.3rem">
                <option value="enemy">Enemy</option>
                <option value="party">Party</option>
                <option value="ally">Ally</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
            <div id="enc-pick-list" class="enc-pick-list"></div>
          </div>

          <!-- Right: Roster -->
          <div class="enc-roster">
            <div class="enc-roster-header">
              <h3>⚔️ Encounter Roster</h3>
              <button class="btn-secondary btn-sm" id="enc-add-group-btn">+ Group</button>
            </div>
            <div id="enc-roster-list" class="enc-roster-list"></div>
          </div>
        </div>
      </div>

      <!-- Combat Mode -->
      <div id="enc-combat" class="enc-combat-panel" style="display:none;">
        <div class="enc-combat-grid">
          <!-- Initiative column -->
          <div class="enc-initiative-col">
            <div class="enc-initiative-header">
              <h3>📋 Initiative</h3>
              <button class="btn-secondary btn-sm" id="enc-roll-init-btn">🎲 Roll All</button>
            </div>
            <div class="enc-round-info">
              <span>Round: <strong id="enc-round-num">0</strong></span>
              <button class="btn-primary btn-sm" id="enc-next-turn-btn">Next ▶</button>
            </div>
            <div id="enc-init-list" class="enc-init-list"></div>
          </div>

          <!-- Combat zone -->
          <div class="enc-combat-zone">
            <div class="enc-combat-zone-header">
              <h3>⚔️ Combat</h3>
              <button class="btn-secondary btn-sm" id="enc-end-combat-btn">⏹ End Combat</button>
            </div>
            <div id="enc-combat-area" class="enc-combat-area"></div>
          </div>
        </div>

        <!-- Combat Log -->
        <div class="enc-log-panel">
          <div class="enc-log-header">
            <h3>📜 Combat Log</h3>
            <button class="btn-secondary btn-xs" id="enc-clear-log-btn">Clear</button>
          </div>
          <div id="enc-combat-log" class="enc-combat-log"></div>
        </div>
      </div>
    </div>
    `;

    loadEncounterDetail(container, encId);
    bindDetailEvents(container, encId);
}

async function loadEncounterDetail(container, encId) {
    try {
        const res = await apiGetEncounter(encId);
        currentEncounter = res.encounter;
        container.querySelector('#enc-detail-title').textContent = `⚔️ ${currentEncounter.name}`;

        // Load towns for picker
        const townsRes = await apiFetch('towns');
        const towns = townsRes.towns || [];
        const townSelect = container.querySelector('#enc-pick-town');
        townSelect.innerHTML = '<option value="">Select a town...</option>' +
            towns.map(t => `<option value="${t.id}">🏰 ${t.name} (${t.character_count})</option>`).join('');

        // Show correct mode
        if (currentEncounter.status === 'active') {
            showCombatMode(container);
        } else {
            showSetupMode(container);
        }

        renderRoster(container);
    } catch (err) {
        container.querySelector('#enc-detail-title').textContent = `Error: ${err.message}`;
    }
}

async function loadPickerList(container) {
    const townId = parseInt(container.querySelector('#enc-pick-town').value) || 0;
    const search = (container.querySelector('#enc-pick-search')?.value || '').trim().toLowerCase();
    const listEl = container.querySelector('#enc-pick-list');

    if (!townId) {
        listEl.innerHTML = '<div class="srd-detail-empty" style="padding:0.75rem"><p style="font-size:0.8rem">Select a town to browse its characters</p></div>';
        return;
    }

    listEl.innerHTML = '<div class="srd-loading" style="padding:0.5rem"><div class="spinner"></div>Loading...</div>';

    try {
        const res = await apiFetch(`characters&town_id=${townId}`);
        let characters = (res.characters || []).filter(c => c.status === 'Alive');

        // Filter by search text
        if (search) {
            characters = characters.filter(c =>
                (c.name || '').toLowerCase().includes(search) ||
                (c.race || '').toLowerCase().includes(search) ||
                (c.class || '').toLowerCase().includes(search)
            );
        }

        // Mark already-added participants
        const existingIds = new Set((currentEncounter?.participants || []).map(p => parseInt(p.character_id)));
        const available = characters.filter(c => !existingIds.has(parseInt(c.id)));
        const alreadyAdded = characters.filter(c => existingIds.has(parseInt(c.id)));

        if (!characters.length) {
            listEl.innerHTML = '<div class="srd-detail-empty" style="padding:0.5rem"><p style="font-size:0.8rem">No characters match your search.</p></div>';
            return;
        }

        let html = '';

        // Available to add
        if (available.length) {
            html += available.map(c => `
                <div class="enc-pick-item" data-char-id="${c.id}">
                    <div class="enc-pick-info">
                        <span class="enc-pick-name">${c.name}</span>
                        <span class="enc-pick-detail">${c.race || ''} ${c.class || ''}</span>
                    </div>
                    <div class="enc-pick-stats">
                        <span>♥${c.hp || '?'}</span>
                        <span>🛡${c.ac || '?'}</span>
                    </div>
                    <button class="btn-primary btn-xs enc-add-char-btn" data-char-id="${c.id}">+</button>
                </div>
            `).join('');
        }

        // Already in encounter
        if (alreadyAdded.length) {
            html += `<div class="enc-pick-divider">Already in encounter</div>`;
            html += alreadyAdded.map(c => `
                <div class="enc-pick-item enc-pick-added">
                    <div class="enc-pick-info">
                        <span class="enc-pick-name">${c.name}</span>
                        <span class="enc-pick-detail">${c.race || ''} ${c.class || ''}</span>
                    </div>
                    <span class="party-in-badge">Added ✓</span>
                </div>
            `).join('');
        }

        listEl.innerHTML = html;

    } catch (err) {
        listEl.innerHTML = `<div class="error-state" style="font-size:0.8rem">Error: ${err.message}</div>`;
    }
}

function renderRoster(container) {
    const listEl = container.querySelector('#enc-roster-list');
    if (!currentEncounter) return;

    const groups = currentEncounter.groups || [];
    const participants = currentEncounter.participants || [];
    const ungrouped = participants.filter(p => !p.group_id);

    let html = '';

    // Render groups
    groups.forEach(g => {
        const members = participants.filter(p => parseInt(p.group_id) === parseInt(g.id));
        html += `
        <div class="enc-group" data-group-id="${g.id}">
            <div class="enc-group-header">
                <span class="enc-group-name" data-group-id="${g.id}" title="Click to rename">${g.name}</span>
                <span class="enc-group-count">${members.length}</span>
                <button class="btn-danger btn-xs enc-delete-group-btn" data-group-id="${g.id}" title="Delete group">✕</button>
            </div>
            <div class="enc-group-members">
                ${members.map(p => renderParticipantCard(p)).join('')}
                ${!members.length ? '<div class="empty-state" style="padding:0.3rem;font-size:0.75rem">Empty</div>' : ''}
            </div>
        </div>`;
    });

    // Ungrouped
    if (ungrouped.length || !groups.length) {
        html += `
        <div class="enc-group enc-group-ungrouped">
            <div class="enc-group-header">
                <span class="enc-group-name">Ungrouped</span>
                <span class="enc-group-count">${ungrouped.length}</span>
            </div>
            <div class="enc-group-members">
                ${ungrouped.map(p => renderParticipantCard(p)).join('')}
                ${!ungrouped.length ? '<div class="empty-state" style="padding:0.3rem;font-size:0.75rem">Select a town and add characters</div>' : ''}
            </div>
        </div>`;
    }

    listEl.innerHTML = html;

    // Bind remove, side toggle, group move, group rename/delete
    listEl.querySelectorAll('.enc-remove-part-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            await apiRemoveParticipant(parseInt(btn.dataset.partId));
            await refreshEncounter(container);
        });
    });
    listEl.querySelectorAll('.enc-part-side-select').forEach(sel => {
        sel.addEventListener('change', async () => {
            await apiUpdateParticipant(parseInt(sel.dataset.partId), { side: sel.value });
            await refreshEncounter(container);
        });
    });
    listEl.querySelectorAll('.enc-group-name[data-group-id]').forEach(el => {
        el.addEventListener('click', async () => {
            const newName = prompt('Rename group:', el.textContent);
            if (!newName) return;
            await apiRenameEncounterGroup(parseInt(el.dataset.groupId), newName);
            await refreshEncounter(container);
        });
    });
    listEl.querySelectorAll('.enc-delete-group-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('Delete this group? Participants will become ungrouped.')) return;
            await apiDeleteEncounterGroup(parseInt(btn.dataset.groupId));
            await refreshEncounter(container);
        });
    });
    listEl.querySelectorAll('.enc-part-group-select').forEach(sel => {
        sel.addEventListener('change', async () => {
            const groupId = sel.value ? parseInt(sel.value) : null;
            await apiUpdateParticipant(parseInt(sel.dataset.partId), { group_id: groupId });
            await refreshEncounter(container);
        });
    });
}

function renderParticipantCard(p) {
    const sideColors = { party: '#4a9eff', ally: '#50c878', enemy: '#ff5555', neutral: '#aaa' };
    const sideIcons = { party: '🛡️', ally: '🤝', enemy: '👹', neutral: '👤' };
    const groups = currentEncounter?.groups || [];
    const conditions = p.conditions ? (typeof p.conditions === 'string' ? JSON.parse(p.conditions) : p.conditions) : [];

    return `
    <div class="enc-participant" data-part-id="${p.id}" style="border-left: 3px solid ${sideColors[p.side] || '#aaa'}">
        <div class="enc-part-main">
            <span class="enc-part-icon">${sideIcons[p.side] || '👤'}</span>
            <div class="enc-part-info">
                <span class="enc-part-name">${p.name}</span>
                <span class="enc-part-detail">${p.race || ''} ${p.class || ''} · ${p.town_name || ''}</span>
            </div>
            <div class="enc-part-stats">
                <span class="enc-part-hp" title="HP">♥ ${p.current_hp}/${p.max_hp}</span>
                <span title="AC">🛡 ${p.base_ac || '?'}</span>
            </div>
            <button class="btn-danger btn-xs enc-remove-part-btn" data-part-id="${p.id}" title="Remove">✕</button>
        </div>
        <div class="enc-part-controls">
            <select class="form-input enc-part-side-select" data-part-id="${p.id}" style="width:auto;font-size:0.7rem;padding:0.1rem;">
                <option value="party" ${p.side === 'party' ? 'selected' : ''}>Party</option>
                <option value="ally" ${p.side === 'ally' ? 'selected' : ''}>Ally</option>
                <option value="enemy" ${p.side === 'enemy' ? 'selected' : ''}>Enemy</option>
                <option value="neutral" ${p.side === 'neutral' ? 'selected' : ''}>Neutral</option>
            </select>
            <select class="form-input enc-part-group-select" data-part-id="${p.id}" style="width:auto;font-size:0.7rem;padding:0.1rem;">
                <option value="">No Group</option>
                ${groups.map(g => `<option value="${g.id}" ${parseInt(p.group_id) === parseInt(g.id) ? 'selected' : ''}>${g.name}</option>`).join('')}
            </select>
            ${conditions.length ? `<span class="enc-part-conditions">${conditions.map(c => CONDITIONS[c]?.name || c).join(', ')}</span>` : ''}
        </div>
    </div>`;
}

async function refreshEncounter(container) {
    const encId = currentEncounter?.id;
    if (!encId) return;
    const res = await apiGetEncounter(encId);
    currentEncounter = res.encounter;
    renderRoster(container);
    loadPickerList(container);
    if (currentEncounter.status === 'active') {
        renderInitiativeList(container);
        renderCombatArea(container);
    }
}

function bindDetailEvents(container, encId) {
    container.querySelector('#enc-back-btn').addEventListener('click', () => navigate('encounters'));

    // Town picker + search
    container.querySelector('#enc-pick-town').addEventListener('change', () => loadPickerList(container));
    let searchTimer = null;
    container.querySelector('#enc-pick-search').addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => loadPickerList(container), 300);
    });

    // Add character from picker
    container.querySelector('#enc-pick-list').addEventListener('click', async (e) => {
        const btn = e.target.closest('.enc-add-char-btn');
        if (!btn) return;
        const charId = parseInt(btn.dataset.charId);
        const side = container.querySelector('#enc-default-side').value || 'enemy';
        try {
            await apiAddParticipant(encId, charId, side);
            await refreshEncounter(container);
        } catch (err) { alert('Error: ' + err.message); }
    });

    // Add all party members
    container.querySelector('#enc-add-party-all').addEventListener('click', async () => {
        try {
            const partyRes = await apiGetParty();
            const party = partyRes.party || [];
            if (!party.length) { alert('No party members. Add characters to your party first (🛡️ Party page).'); return; }
            const existingIds = new Set((currentEncounter?.participants || []).map(p => parseInt(p.character_id)));
            let added = 0;
            for (const m of party) {
                if (!existingIds.has(parseInt(m.character_id))) {
                    await apiAddParticipant(encId, parseInt(m.character_id), 'party');
                    added++;
                }
            }
            if (added === 0) { alert('All party members are already in this encounter.'); }
            await refreshEncounter(container);
        } catch (err) { alert('Error: ' + err.message); }
    });

    // Add group
    container.querySelector('#enc-add-group-btn').addEventListener('click', async () => {
        const name = prompt('Group/location name:', 'New Location');
        if (!name) return;
        try {
            await apiCreateEncounterGroup(encId, name);
            await refreshEncounter(container);
        } catch (err) { alert('Error: ' + err.message); }
    });

    // Setup / Combat mode
    container.querySelector('#enc-mode-setup').addEventListener('click', async () => {
        await apiUpdateEncounter(encId, { status: 'setup' });
        currentEncounter.status = 'setup';
        showSetupMode(container);
    });
    container.querySelector('#enc-mode-combat').addEventListener('click', async () => {
        const participants = currentEncounter?.participants || [];
        if (!participants.length) { alert('Add some participants first!'); return; }
        await apiUpdateEncounter(encId, { status: 'active', current_round: 1, current_turn: 0 });
        currentEncounter.status = 'active';
        currentEncounter.current_round = 1;
        currentEncounter.current_turn = 0;
        showCombatMode(container);
        renderInitiativeList(container);
        renderCombatArea(container);
    });

    // Roll Initiative
    container.querySelector('#enc-roll-init-btn').addEventListener('click', async () => {
        const participants = currentEncounter?.participants || [];
        for (const p of participants) {
            const initRoll = roll('1d20');
            const initMod = parseInt(p.initiative_mod) || 0;
            const total = initRoll.total + initMod;
            await apiUpdateParticipant(parseInt(p.id), { initiative: total });
            addCombatLog(container, `${p.name} rolls initiative: ${initRoll.total} + ${formatMod(initMod)} = ${total}`);
        }
        await refreshEncounter(container);
    });

    // Next Turn
    container.querySelector('#enc-next-turn-btn').addEventListener('click', async () => {
        if (!currentEncounter) return;
        const participants = (currentEncounter.participants || []).filter(p => parseInt(p.is_active) !== 0);
        if (!participants.length) return;
        let turn = (parseInt(currentEncounter.current_turn) || 0) + 1;
        let round = parseInt(currentEncounter.current_round) || 1;
        if (turn >= participants.length) { turn = 0; round++; }
        await apiUpdateEncounter(currentEncounter.id, { current_turn: turn, current_round: round });
        currentEncounter.current_turn = turn;
        currentEncounter.current_round = round;
        const activePart = participants[turn];
        if (activePart) addCombatLog(container, `--- ${activePart.name}'s turn (Round ${round}) ---`, 'turn');
        container.querySelector('#enc-round-num').textContent = round;
        renderInitiativeList(container);
        renderCombatArea(container);
    });

    // End Combat
    container.querySelector('#enc-end-combat-btn').addEventListener('click', async () => {
        if (!confirm('End combat and return to setup?')) return;
        await apiUpdateEncounter(encId, { status: 'completed' });
        currentEncounter.status = 'completed';
        addCombatLog(container, '=== COMBAT ENDED ===', 'system');
        showSetupMode(container);
    });

    container.querySelector('#enc-clear-log-btn').addEventListener('click', () => {
        combatLog = [];
        container.querySelector('#enc-combat-log').innerHTML = '';
    });
}

function showSetupMode(container) {
    container.querySelector('#enc-setup').style.display = '';
    container.querySelector('#enc-combat').style.display = 'none';
    container.querySelector('#enc-mode-setup').classList.add('active');
    container.querySelector('#enc-mode-combat').classList.remove('active');
}

function showCombatMode(container) {
    container.querySelector('#enc-setup').style.display = 'none';
    container.querySelector('#enc-combat').style.display = '';
    container.querySelector('#enc-mode-setup').classList.remove('active');
    container.querySelector('#enc-mode-combat').classList.add('active');
    if (currentEncounter) container.querySelector('#enc-round-num').textContent = currentEncounter.current_round || 0;
}


/* ═══════════════════════════════════════════════════════════
   COMBAT UI
   ═══════════════════════════════════════════════════════════ */
function renderInitiativeList(container) {
    const listEl = container.querySelector('#enc-init-list');
    if (!currentEncounter) return;
    const participants = (currentEncounter.participants || [])
        .sort((a, b) => (parseInt(b.initiative) || 0) - (parseInt(a.initiative) || 0));
    const currentTurn = parseInt(currentEncounter.current_turn) || 0;
    const activeParticipants = participants.filter(p => parseInt(p.is_active) !== 0);
    const sideColors = { party: '#4a9eff', ally: '#50c878', enemy: '#ff5555', neutral: '#aaa' };

    listEl.innerHTML = participants.map(p => {
        const isCurrentTurn = activeParticipants[currentTurn]?.id === p.id;
        const isDead = parseInt(p.current_hp) <= 0;
        const isInactive = parseInt(p.is_active) === 0;
        return `
        <div class="enc-init-item ${isCurrentTurn ? 'enc-init-active' : ''} ${isDead ? 'enc-init-dead' : ''} ${isInactive ? 'enc-init-inactive' : ''}"
             data-part-id="${p.id}" style="border-left: 3px solid ${sideColors[p.side] || '#aaa'}">
            <span class="enc-init-turn">${isCurrentTurn ? '▶' : ''}</span>
            <span class="enc-init-roll">${p.initiative || '—'}</span>
            <div class="enc-init-info">
                <span class="enc-init-name">${p.name}</span>
                <span class="enc-init-hp ${isDead ? 'hp-dead' : (parseInt(p.current_hp) < parseInt(p.max_hp) / 2 ? 'hp-low' : '')}"
                >♥ ${p.current_hp}/${p.max_hp}</span>
            </div>
        </div>`;
    }).join('');
}

function renderCombatArea(container) {
    const areaEl = container.querySelector('#enc-combat-area');
    if (!currentEncounter) return;
    const participants = currentEncounter.participants || [];
    const sides = { party: [], ally: [], enemy: [], neutral: [] };
    participants.forEach(p => { (sides[p.side] || sides.neutral).push(p); });
    const sideLabels = { party: '🛡️ Party', ally: '🤝 Allies', enemy: '👹 Enemies', neutral: '👤 Neutral' };
    const sideColors = { party: '#4a9eff', ally: '#50c878', enemy: '#ff5555', neutral: '#888' };

    areaEl.innerHTML = Object.entries(sides)
        .filter(([, members]) => members.length > 0)
        .map(([side, members]) => `
            <div class="enc-combat-side">
                <h4 style="color:${sideColors[side]}">${sideLabels[side]}</h4>
                <div class="enc-combat-members">
                    ${members.map(p => renderCombatCard(p)).join('')}
                </div>
            </div>
        `).join('');

    bindCombatCardEvents(container);
}

function renderCombatCard(p) {
    const isDead = parseInt(p.current_hp) <= 0;
    const hpPct = Math.max(0, Math.min(100, (parseInt(p.current_hp) / Math.max(1, parseInt(p.max_hp))) * 100));
    const hpColor = hpPct > 50 ? '#50c878' : (hpPct > 25 ? '#f0ad4e' : '#ff5555');
    const conditions = p.conditions ? (typeof p.conditions === 'string' ? JSON.parse(p.conditions) : p.conditions) : [];
    const weapons = parseGearWeapons(p.gear || '', p);

    return `
    <div class="enc-combat-card ${isDead ? 'enc-combat-dead' : ''}" data-part-id="${p.id}">
        <div class="enc-ccard-header">
            <strong>${p.name}</strong>
            <span class="enc-ccard-class">${p.race || ''} ${p.class || ''}</span>
        </div>
        <div class="enc-ccard-hp">
            <div class="enc-hp-bar">
                <div class="enc-hp-fill" style="width:${hpPct}%;background:${hpColor}"></div>
            </div>
            <span class="enc-hp-text">♥ ${p.current_hp}/${p.max_hp}${parseInt(p.temp_hp) > 0 ? ` (+${p.temp_hp})` : ''}</span>
            <div class="enc-hp-buttons">
                <button class="btn-danger btn-xs enc-dmg-btn" data-part-id="${p.id}">-HP</button>
                <button class="btn-success btn-xs enc-heal-btn" data-part-id="${p.id}">+HP</button>
            </div>
        </div>
        <div class="enc-ccard-stats">
            <span>🛡 ${p.base_ac || '?'}</span>
            <span>${formatMod(abilityMod(parseInt(p.str) || 10))} STR</span>
            <span>${formatMod(abilityMod(parseInt(p.dex) || 10))} DEX</span>
        </div>
        ${weapons.length ? `
        <div class="enc-ccard-weapons">
            ${weapons.slice(0, 3).map(w => `
                <button class="btn-secondary btn-xs enc-attack-btn" data-part-id="${p.id}" data-weapon="${w.name}"
                    title="${w.dmg} ${w.crit}">⚔ ${w.name}</button>
            `).join('')}
        </div>` : ''}
        ${conditions.length ? `<div class="enc-ccard-conditions">${conditions.map(c => `<span class="enc-condition-tag">${CONDITIONS[c]?.name || c}</span>`).join('')}</div>` : ''}
        <div class="enc-ccard-actions">
            <button class="btn-secondary btn-xs enc-condition-btn" data-part-id="${p.id}">🏷️</button>
            <button class="btn-secondary btn-xs enc-note-btn" data-part-id="${p.id}">📝</button>
        </div>
    </div>`;
}

function bindCombatCardEvents(container) {
    // Damage
    container.querySelectorAll('.enc-dmg-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const partId = parseInt(btn.dataset.partId);
            const p = currentEncounter.participants.find(x => parseInt(x.id) === partId);
            if (!p) return;
            const amt = prompt(`Damage to ${p.name}:`, '');
            if (!amt) return;
            const dmg = parseInt(amt) || 0;
            const newHp = Math.max(-10, parseInt(p.current_hp) - dmg);
            await apiUpdateParticipant(partId, { current_hp: newHp, is_active: newHp > -10 ? 1 : 0 });
            addCombatLog(container, `${p.name} takes ${dmg} damage (${p.current_hp} → ${newHp} HP)${newHp <= 0 ? ' 💀 DOWN!' : ''}`, newHp <= 0 ? 'danger' : 'info');
            await refreshEncounter(container);
        });
    });

    // Heal
    container.querySelectorAll('.enc-heal-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const partId = parseInt(btn.dataset.partId);
            const p = currentEncounter.participants.find(x => parseInt(x.id) === partId);
            if (!p) return;
            const amt = prompt(`Heal ${p.name}:`, '');
            if (!amt) return;
            const heal = parseInt(amt) || 0;
            const newHp = Math.min(parseInt(p.max_hp), parseInt(p.current_hp) + heal);
            await apiUpdateParticipant(partId, { current_hp: newHp, is_active: 1 });
            addCombatLog(container, `${p.name} heals ${heal} HP (${p.current_hp} → ${newHp} HP)`, 'success');
            await refreshEncounter(container);
        });
    });

    // Attack
    container.querySelectorAll('.enc-attack-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const partId = parseInt(btn.dataset.partId);
            const weaponName = btn.dataset.weapon;
            const p = currentEncounter.participants.find(x => parseInt(x.id) === partId);
            if (!p) return;
            const weapons = parseGearWeapons(p.gear || '', p);
            const weapon = weapons.find(w => w.name === weaponName);
            if (!weapon) return;

            const bab = parseInt(p.atk) || 0;
            const atkRoll = roll('1d20');
            const totalAtk = atkRoll.total + bab + weapon.atkMod + weapon.enhancement;
            const dmgRoll = roll(weapon.dmg);
            const strMod = weapon.ranged ? 0 : weapon.strMod;
            const totalDmg = Math.max(1, dmgRoll.total + strMod + weapon.enhancement);

            const critRange = weapon.crit.split('/')[0].split('-');
            const critMin = critRange.length > 1 ? parseInt(critRange[0]) : 20;
            const isCritThreat = atkRoll.total >= critMin;

            let logMsg = `${p.name} attacks with ${weapon.name}: 🎲${atkRoll.total} + ${bab + weapon.atkMod + weapon.enhancement} = ${totalAtk}`;
            if (atkRoll.total === 20) logMsg += ' (NAT 20!)';
            else if (isCritThreat) logMsg += ' (CRIT THREAT!)';
            else if (atkRoll.total === 1) logMsg += ' (FUMBLE!)';
            logMsg += ` | Damage: ${totalDmg} (${weapon.dmg}: ${dmgRoll.rolls.join('+')}${strMod ? ` +${strMod}str` : ''})`;

            addCombatLog(container, logMsg, isCritThreat ? 'crit' : 'attack');
        });
    });

    // Conditions
    container.querySelectorAll('.enc-condition-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const partId = parseInt(btn.dataset.partId);
            const p = currentEncounter.participants.find(x => parseInt(x.id) === partId);
            if (!p) return;
            const current = p.conditions ? (typeof p.conditions === 'string' ? JSON.parse(p.conditions) : [...p.conditions]) : [];
            const all = getAllConditions();
            const choice = prompt(
                `Conditions for ${p.name}:\nCurrent: ${current.join(', ') || 'none'}\n\nAvailable: ${all.join(', ')}\n\nEnter condition to toggle:`, ''
            );
            if (!choice) return;
            const key = choice.toLowerCase().replace(/[- ]/g, '');
            const idx = current.indexOf(key);
            if (idx >= 0) { current.splice(idx, 1); addCombatLog(container, `${p.name}: removed ${CONDITIONS[key]?.name || key}`, 'info'); }
            else { current.push(key); addCombatLog(container, `${p.name}: applied ${CONDITIONS[key]?.name || key}`, 'warn'); }
            await apiUpdateParticipant(partId, { conditions: current });
            await refreshEncounter(container);
        });
    });
}


/* ═══════════════════════════════════════════════════════════
   COMBAT LOG
   ═══════════════════════════════════════════════════════════ */
function addCombatLog(container, message, type = 'info') {
    const logEl = container.querySelector('#enc-combat-log');
    if (!logEl) return;
    const time = new Date().toLocaleTimeString();
    const colors = {
        info: 'var(--text-secondary)', success: '#50c878', danger: '#ff5555',
        warn: '#f0ad4e', attack: '#4a9eff', crit: '#ff44ff', turn: '#f5c518', system: '#aaa'
    };
    combatLog.push({ time, message, type });
    logEl.innerHTML += `<div class="enc-log-entry" style="color:${colors[type] || colors.info}">
        <span class="enc-log-time">[${time}]</span> ${message}
    </div>`;
    logEl.scrollTop = logEl.scrollHeight;
}


/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
function statusIcon(status) {
    return { setup: '⚙️', active: '⚔️', completed: '✅' }[status] || '❓';
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    try { return new Date(dateStr).toLocaleDateString(); } catch { return dateStr; }
}
