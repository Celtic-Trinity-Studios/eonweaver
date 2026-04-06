/**
 * Eon Weaver — Party View
 * Dedicated party management page (SRD-browser style).
 * Uses new CharacterCreator component for character creation.
 */
import { getState } from '../stores/appState.js';
import { apiFetch } from '../api/client.js';
import { apiGetParty, apiAddPartyMember, apiRemovePartyMember } from '../api/encounters.js';
import { loadSrdRaces, loadSrdClasses, loadSrdFeats, loadSrdEquipment } from '../api/srd.js';
import { abilityMod } from '../engine/rulesAdapter.js';
import { formatMod } from '../engine/dice.js';
import { renderCharacterSheet } from '../components/CharacterSheet.js';
import { initCreator, renderCreator, resetCreatorState, getCharacterData, getCreatorState } from '../components/CharacterCreator.js';

let partyMembers = [];
let allTowns = [];
let selectedMember = null;
let partyBaseId = 0;
let partyBaseName = 'Party Camp';

/* DB-driven SRD data (loaded for recruit display) */
const ABILITIES = ['str', 'dex', 'con', 'int_', 'wis', 'cha'];
const AB_LABELS = { str: 'STR', dex: 'DEX', con: 'CON', int_: 'INT', wis: 'WIS', cha: 'CHA' };

export default function PartyView(container) {
    container.innerHTML = `
    <div class="view-party">
      <header class="view-header"><h1>🛡️ Adventuring Party</h1></header>
      <div class="party-tabs" id="party-tabs">
        <button class="party-tab active" data-tab="roster">🛡️ Party Roster</button>
        <button class="party-tab" data-tab="recruit">🏰 Recruit from Town</button>
        <button class="party-tab" data-tab="create">✨ Create Character</button>
      </div>
      <div class="party-content">
        <div class="party-list-panel" id="party-list-panel">
          <div id="party-tab-roster">
            <div class="party-list-header"><span id="party-count">0 members</span></div>
            <div class="party-member-list" id="party-member-list">
              <div class="srd-loading"><div class="spinner"></div>Loading party...</div>
            </div>
          </div>
          <div id="party-tab-recruit" style="display:none">
            <div class="party-recruit-controls">
              <select id="recruit-town-select" class="form-input"><option value="">Select a town...</option></select>
              <input type="text" id="recruit-search" class="form-input" placeholder="Filter characters..." style="margin-top:0.4rem">
            </div>
            <div class="party-recruit-list" id="recruit-char-list">
              <div class="srd-detail-empty"><p>Select a town to browse characters</p></div>
            </div>
          </div>
        </div>
        <div class="party-detail-panel" id="party-detail-panel">
          <div class="srd-detail-empty"><div class="srd-empty-icon">🛡️</div><p>Select a party member to view their character sheet</p></div>
        </div>
      </div>
    </div>`;
    initView(container);
}

async function initView(container) {
    // Init Creator (loads SRD data)
    await initCreator();

    // Fetch party base separately (don't block if it fails)
    try {
        const baseRes = await apiFetch('get_party_base');
        if (baseRes.party_base) { partyBaseId = baseRes.party_base.id; partyBaseName = baseRes.party_base.name; }
    } catch (err) { console.warn('Could not load party base:', err.message); }

    loadPartyData(container);
    loadTowns(container);
    bindPartyEvents(container);
}

/* ═══════════════════════════════════════════════════════════
   DATA LOADING
   ═══════════════════════════════════════════════════════════ */
async function loadPartyData(container) {
    try {
        const res = await apiGetParty();
        partyMembers = res.party || [];
        renderPartyList(container);
    } catch (err) {
        container.querySelector('#party-member-list').innerHTML = `<p class="error">Error: ${err.message}</p>`;
    }
}

async function loadTowns(container) {
    try {
        const res = await apiFetch('towns');
        allTowns = res.towns || [];
        const sel = container.querySelector('#recruit-town-select');
        sel.innerHTML = '<option value="">Select a town...</option>' +
            allTowns.map(t => `<option value="${t.id}">🏰 ${t.name}</option>`).join('');
    } catch (err) { console.error('Failed to load towns:', err); }
}

/* ═══════════════════════════════════════════════════════════
   RENDERING
   ═══════════════════════════════════════════════════════════ */
function renderPartyList(container) {
    const listEl = container.querySelector('#party-member-list');
    container.querySelector('#party-count').textContent = `${partyMembers.length} members`;
    if (!partyMembers.length) {
        listEl.innerHTML = `<div class="srd-detail-empty" style="padding:1.5rem"><div class="srd-empty-icon">🛡️</div><p>No party members yet.</p><p style="font-size:0.75rem;color:var(--text-muted)">Use "Recruit from Town" or "Create Character" to add members.</p></div>`;
        return;
    }
    listEl.innerHTML = partyMembers.map(m => {
        const sel = selectedMember && parseInt(selectedMember.character_id) === parseInt(m.character_id);
        return `<div class="party-list-item ${sel ? 'selected' : ''}" data-char-id="${m.character_id}">
            <div class="party-item-main"><div class="party-item-info"><span class="party-item-name">${m.name}</span><span class="party-item-meta">${m.race || ''} ${m.class || ''}</span></div>
            <div class="party-item-badges"><span class="party-badge party-badge-hp">♥ ${m.hp || '?'}</span><span class="party-badge party-badge-ac">🛡 ${m.ac || '?'}</span></div></div>
            <div class="party-item-from">📍 ${m.town_name}</div></div>`;
    }).join('');
}

function renderMemberDetail(container, member) {
    const panel = container.querySelector('#party-detail-panel');
    if (!member) { panel.innerHTML = `<div class="srd-detail-empty"><div class="srd-empty-icon">🛡️</div><p>Select a party member to view their character sheet</p></div>`; return; }

    // Normalize party member data to character format for CharacterSheet
    const charData = { ...member, id: member.character_id || member.id };

    // Build the panel: remove button bar + character sheet
    panel.innerHTML = `
      <div class="party-remove-bar">
        <span class="party-from-town">📍 From ${member.town_name || 'Party Camp'}</span>
        <button class="btn-danger btn-xs party-remove-btn" data-char-id="${member.character_id}">Remove from Party</button>
      </div>
      <div id="party-charsheet-area" style="flex:1;min-height:0;overflow:hidden;"></div>`;

    // Render the full tabbed character sheet into the area
    const sheetArea = panel.querySelector('#party-charsheet-area');
    renderCharacterSheet(sheetArea, charData, {
        onListRefresh: () => loadPartyData(container),
        onDelete: async () => { selectedMember = null; await loadPartyData(container); renderMemberDetail(container, null); },
        containerRef: container
    });

    // Wire remove button
    panel.querySelector('.party-remove-btn')?.addEventListener('click', async () => {
        if (!confirm(`Remove ${member.name} from the party?`)) return;
        try { await apiRemovePartyMember(parseInt(member.character_id)); selectedMember = null; await loadPartyData(container); renderMemberDetail(container, null); } catch (err) { alert('Error: ' + err.message); }
    });
}

async function loadRecruitList(container, townId, search = '') {
    const listEl = container.querySelector('#recruit-char-list');
    if (!townId) { listEl.innerHTML = '<div class="srd-detail-empty"><p>Select a town to browse characters</p></div>'; return; }
    listEl.innerHTML = '<div class="srd-loading"><div class="spinner"></div>Loading...</div>';
    try {
        const res = await apiFetch(`characters&town_id=${townId}`);
        let chars = res.characters || [];
        if (search) chars = chars.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
        if (!chars.length) { listEl.innerHTML = '<div class="srd-detail-empty"><p>No characters found.</p></div>'; return; }
        listEl.innerHTML = chars.map(c => {
            const ip = partyMembers.some(m => parseInt(m.character_id) === parseInt(c.id));
            return `<div class="party-recruit-item ${ip ? 'already-in-party' : ''}" data-char-id="${c.id}">
                <div class="party-recruit-info"><span class="party-recruit-name">${c.name}</span><span class="party-recruit-meta">${c.race || ''} ${c.class || ''} · ♥${c.hp || '?'} 🛡${c.ac || '?'}</span></div>
                ${ip ? '<span class="party-in-badge">In Party ✓</span>' : `<button class="btn-primary btn-xs party-recruit-btn" data-char-id="${c.id}">+ Add</button>`}</div>`;
        }).join('');
    } catch (err) { listEl.innerHTML = `<p class="error">Error: ${err.message}</p>`; }
}

/* ═══════════════════════════════════════════════════════════
   CHARACTER CREATOR — INTEGRATION
   Uses new CharacterCreator component
   ═══════════════════════════════════════════════════════════ */
function showCharacterCreator(container) {
    const panel = container.querySelector('#party-detail-panel');
    // Hide list panel when creating — creator takes full width
    container.querySelector('#party-list-panel').style.display = 'none';
    panel.style.flex = '1';
    renderCreator(panel);

    // Bind create button (delegated, since review tab re-renders)
    panel.addEventListener('click', async (e) => {
        if (e.target.id !== 'cc-create-btn') return;
        const character = getCharacterData();
        if (!character.name) { alert('Please enter a character name.'); return; }
        try {
            const saveRes = await apiFetch('save_character', { method: 'POST', body: { town_id: partyBaseId, character } });
            if (!saveRes.ok) throw new Error(saveRes.error || 'Failed to save');
            await apiAddPartyMember(saveRes.id);
            resetCreatorState();
            await loadPartyData(container);
            // Switch back to roster
            switchToTab(container, 'roster');
            selectedMember = partyMembers.find(m => parseInt(m.character_id) === saveRes.id) || null;
            renderPartyList(container); renderMemberDetail(container, selectedMember);
            if (!selectedMember) panel.innerHTML = `<div class="srd-detail-empty"><div class="srd-empty-icon">🎉</div><p><strong>${character.name}</strong> created and added to your party!</p></div>`;
        } catch (err) { alert('Error creating character: ' + err.message); }
    });
}

function switchToTab(container, tab) {
    container.querySelectorAll('.party-tab').forEach(b => b.classList.remove('active'));
    container.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
    container.querySelector('#party-tab-roster').style.display = tab === 'roster' ? '' : 'none';
    container.querySelector('#party-tab-recruit').style.display = tab === 'recruit' ? '' : 'none';
    const listPanel = container.querySelector('#party-list-panel');
    const detailPanel = container.querySelector('#party-detail-panel');
    if (tab === 'create') {
        listPanel.style.display = 'none';
        detailPanel.style.flex = '1';
    } else {
        listPanel.style.display = '';
        detailPanel.style.flex = '';
    }
}

/* ═══════════════════════════════════════════════════════════
   EVENT BINDING
   ═══════════════════════════════════════════════════════════ */
function bindPartyEvents(container) {
    container.querySelectorAll('.party-tab').forEach(btn => btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        switchToTab(container, tab);
        if (tab === 'create') { resetCreatorState(); showCharacterCreator(container); }
        else if (tab === 'roster') renderMemberDetail(container, selectedMember);
        else container.querySelector('#party-detail-panel').innerHTML = `<div class="srd-detail-empty"><div class="srd-empty-icon">🏰</div><p>Select a town and add characters to your party</p></div>`;
    }));
    container.querySelector('#party-member-list').addEventListener('click', e => {
        const item = e.target.closest('.party-list-item'); if (!item) return;
        selectedMember = partyMembers.find(m => parseInt(m.character_id) === parseInt(item.dataset.charId)) || null;
        renderPartyList(container); renderMemberDetail(container, selectedMember);
    });
    container.querySelector('#recruit-town-select').addEventListener('change', e => loadRecruitList(container, parseInt(e.target.value) || 0));
    let st = null; container.querySelector('#recruit-search').addEventListener('input', e => { clearTimeout(st); st = setTimeout(() => loadRecruitList(container, parseInt(container.querySelector('#recruit-town-select').value) || 0, e.target.value.trim()), 300); });
    container.querySelector('#recruit-char-list').addEventListener('click', async e => {
        const btn = e.target.closest('.party-recruit-btn'); if (!btn) return;
        try { await apiAddPartyMember(parseInt(btn.dataset.charId)); await loadPartyData(container); const tid = parseInt(container.querySelector('#recruit-town-select').value) || 0; loadRecruitList(container, tid, container.querySelector('#recruit-search').value.trim()); } catch (err) { alert('Error: ' + err.message); }
    });
}
