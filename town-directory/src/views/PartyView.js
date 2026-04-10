/**
 * Eon Weaver — Party View
 * Dedicated party management page (SRD-browser style).
 * "Create Character" uses quick-name popup → blank char → edit wizard.
 */
import { getState } from '../stores/appState.js';
import { apiFetch } from '../api/client.js';
import { apiGetParty, apiAddPartyMember, apiRemovePartyMember } from '../api/encounters.js';
import { apiGetCharacters, normalizeCharacter } from '../api/characters.js';
import { renderCharacterSheet } from '../components/CharacterSheet.js';

let partyMembers = [];
let allTowns = [];
let selectedMember = null;
let partyBaseId = 0;
let partyBaseName = 'Party Camp';

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
    // Fetch party base
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
   QUICK CREATE — Name PopUp → Create → Add to Party → Edit
   ═══════════════════════════════════════════════════════════ */
async function quickCreateCharacter(container) {
    const { showModal } = await import('../components/Modal.js');
    const { el: modal, close } = showModal({
        title: '✨ Create New Character',
        width: 'narrow',
        content: `
            <div style="padding: 0.5rem 0;">
                <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.4rem;">Character Name</label>
                <input type="text" id="qc-name" class="form-input" placeholder="Enter character name..." autofocus style="font-size:1rem;padding:0.6rem;">
                <div style="margin-top:1rem;display:flex;gap:0.5rem;justify-content:flex-end;">
                    <button class="btn-secondary btn-sm" id="qc-cancel">Cancel</button>
                    <button class="btn-primary btn-sm" id="qc-create" disabled>Create & Edit →</button>
                </div>
            </div>`
    });

    const nameInput = modal.querySelector('#qc-name');
    const createBtn = modal.querySelector('#qc-create');

    nameInput?.addEventListener('input', () => {
        createBtn.disabled = !nameInput.value.trim();
    });
    nameInput?.focus();

    // Enter key submits
    nameInput?.addEventListener('keydown', e => {
        if (e.key === 'Enter' && nameInput.value.trim()) createBtn.click();
    });

    modal.querySelector('#qc-cancel')?.addEventListener('click', close);

    createBtn?.addEventListener('click', async () => {
        const name = nameInput.value.trim();
        if (!name) return;
        createBtn.disabled = true;
        createBtn.textContent = '⏳ Creating...';

        try {
            // 1. Create blank character in party camp
            const blankChar = {
                name,
                race: 'Human',
                class: 'Fighter 1',
                status: 'Alive',
                gender: '',
                alignment: 'True Neutral',
                hp: 10, hd: '1d10',
                ac: '10, touch 10, flat-footed 10',
                init: '+0', spd: '30 ft',
                str: 10, dex: 10, con: 10, int_: 10, wis: 10, cha: 10,
                saves: 'Fort +2, Ref +0, Will +0',
                atk: '', feats: '', skills_feats: '',
                gear: '', languages: 'Common', history: '',
                role: 'Player Character', xp: 0, cr: '1',
            };

            const saveRes = await apiFetch('save_character', {
                method: 'POST',
                body: { town_id: partyBaseId, character: blankChar }
            });
            if (!saveRes.ok) throw new Error(saveRes.error || 'Failed to create character');

            const charId = saveRes.id;

            // 2. Add to party
            await apiAddPartyMember(charId);

            // 3. Reload party data
            await loadPartyData(container);

            // 4. Close popup
            close();

            // 5. Switch to roster tab
            switchToTab(container, 'roster');

            // 6. Fetch the full character and open in edit mode
            const charResult = await apiGetCharacters(partyBaseId);
            const fullChar = (charResult.characters || []).find(c => c.id == charId);
            if (fullChar) {
                const norm = normalizeCharacter(fullChar);
                selectedMember = partyMembers.find(m => parseInt(m.character_id) === charId) || null;
                renderPartyList(container);

                // Render sheet area then immediately trigger edit
                renderMemberDetail(container, selectedMember || { ...norm, character_id: charId, town_name: partyBaseName });

                // Open Creator in edit mode on the sheet area
                const sheetArea = container.querySelector('#party-charsheet-area');
                if (sheetArea) {
                    const { initCreatorFromCharacter, renderCreator } = await import('../components/CharacterCreator.js');
                    const townId = partyBaseId;

                    const restoreSheet = async () => {
                        try {
                            const result = await apiGetCharacters(townId);
                            const updated = (result.characters || []).find(ch => ch.id == charId);
                            if (updated) {
                                const updNorm = normalizeCharacter(updated);
                                await loadPartyData(container);
                                selectedMember = partyMembers.find(m => parseInt(m.character_id) === charId) || null;
                                renderPartyList(container);
                                renderMemberDetail(container, selectedMember);
                            }
                        } catch { renderMemberDetail(container, selectedMember); }
                    };

                    await initCreatorFromCharacter(norm, {
                        townId,
                        onComplete: restoreSheet,
                        onCancel: () => renderMemberDetail(container, selectedMember),
                    });
                    renderCreator(sheetArea);
                }
            }
        } catch (err) {
            alert('Error creating character: ' + err.message);
            createBtn.disabled = false;
            createBtn.textContent = 'Create & Edit →';
        }
    });
}

function switchToTab(container, tab) {
    container.querySelectorAll('.party-tab').forEach(b => b.classList.remove('active'));
    container.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
    container.querySelector('#party-tab-roster').style.display = tab === 'roster' ? '' : 'none';
    container.querySelector('#party-tab-recruit').style.display = tab === 'recruit' ? '' : 'none';
    const listPanel = container.querySelector('#party-list-panel');
    const detailPanel = container.querySelector('#party-detail-panel');
    listPanel.style.display = '';
    detailPanel.style.flex = '';
}

/* ═══════════════════════════════════════════════════════════
   EVENT BINDING
   ═══════════════════════════════════════════════════════════ */
function bindPartyEvents(container) {
    container.querySelectorAll('.party-tab').forEach(btn => btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        if (tab === 'create') { quickCreateCharacter(container); return; }
        switchToTab(container, tab);
        if (tab === 'roster') renderMemberDetail(container, selectedMember);
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
