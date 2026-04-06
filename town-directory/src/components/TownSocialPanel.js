/**
 * Eon Weaver — Town Social Panel
 * Displays factions, incidents, and reputation for the entire town.
 * Rendered as a modal or sidebar panel accessible from TownView.
 */
import {
  apiGetSocialData, apiGetFactions, apiSaveFaction, apiDeleteFaction,
  apiSaveFactionMember, apiDeleteFactionMember,
  apiSaveFactionRelation, apiDeleteFactionRelation,
  apiGetIncidents, apiSaveIncident, apiDeleteIncident,
  apiSaveClue, apiDeleteClue,
  apiSaveReputation, apiDeleteReputation
} from '../api/social.js';
import { apiGetCharacters } from '../api/characters.js';
import { showModal } from './Modal.js';

const FACTION_ICONS = {
  guild: '⚒️', religious: '⛪', military: '⚔️', criminal: '🗡️',
  political: '🏛️', social: '🤝', merchant: '💰', academic: '📚',
  arcane: '🔮', other: '📌'
};

const INCIDENT_TYPE_ICONS = {
  theft: '💰', murder: '💀', sabotage: '🔥', mystery: '🔍',
  conspiracy: '🕸️', assault: '👊', fraud: '📝', general: '⚡'
};

const RELATION_ICONS = {
  alliance: '🤝', rivalry: '⚡', war: '⚔️', trade: '💰',
  vassal: '👑', neutral: '➖', hostile: '💢'
};

/**
 * Opens the town social panel as a wide modal
 */
export async function openTownSocialPanel(townId) {
  let data = null;
  let characters = [];

  // showModal returns { el: <the .modal-body element>, close }
  const { el: modalBody, close } = showModal({
    title: '🏘️ Town Social Overview',
    width: 'wide',
    content: '<div class="cs-loading" style="padding:2rem;text-align:center;">Loading social data...</div>'
  });

  // Timeout helper — prevents hanging forever if the server is slow/unresponsive
  const withTimeout = (promise, ms, label) =>
    Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms))
    ]);

  try {
    const [socialRes, charRes] = await Promise.all([
      withTimeout(apiGetSocialData(townId), 15000, 'Social data fetch'),
      withTimeout(apiGetCharacters(townId), 15000, 'Character list fetch')
    ]);
    data = socialRes;
    characters = charRes.characters || [];
  } catch (e) {
    console.error('[TownSocialPanel] Load failed:', e);
    if (modalBody) {
      modalBody.innerHTML = `<div class="social-empty">❌ Failed to load: ${e.message}</div>`;
    }
    return;
  }

  // Guard against the modal being closed while we were loading
  if (!modalBody || !modalBody.parentNode) return;

  renderSocialPanel(modalBody, data, townId, characters);
}


function renderSocialPanel(container, data, townId, characters) {
  const factions = data.factions || [];
  const incidents = data.incidents || [];
  const reputation = data.reputation || [];
  const relationships = data.relationships || [];

  container.innerHTML = `
    <div class="town-social-panel">
      <!-- Factions -->
      <div class="town-social-section" id="tsp-factions">
        <div class="town-social-section-title">
          <span class="section-icon">⚒️</span> Factions
          <span class="section-count">${factions.length}</span>
        </div>
        <div id="tsp-faction-list" class="social-faction-list">
          ${factions.length ? factions.map(f => renderFactionCard(f, factions)).join('') : '<div class="social-empty"><div class="social-empty-icon">⚒️</div>No factions yet</div>'}
        </div>
        <div class="social-add-bar">
          <button class="social-add-btn" id="tsp-add-faction-btn">+ Create Faction</button>
        </div>
      </div>

      <!-- Incidents -->
      <div class="town-social-section" id="tsp-incidents">
        <div class="town-social-section-title">
          <span class="section-icon">🔍</span> Incidents & Mysteries
          <span class="section-count">${incidents.length}</span>
        </div>
        <div id="tsp-incident-list" class="social-incident-list">
          ${incidents.length ? incidents.map(renderIncidentCard).join('') :
      '<div class="social-empty"><div class="social-empty-icon">🔍</div>No incidents yet</div>'}
        </div>
        <div class="social-add-bar">
          <button class="social-add-btn" id="tsp-add-incident-btn">+ Report Incident</button>
        </div>
      </div>

      <!-- Reputation -->
      <div class="town-social-section" id="tsp-reputation">
        <div class="town-social-section-title">
          <span class="section-icon">⭐</span> PC Reputation
          <span class="section-count">${reputation.length}</span>
        </div>
        <div id="tsp-rep-list" class="social-rep-list">
          ${reputation.length ? reputation.map(renderRepRow).join('') :
      '<div class="social-empty"><div class="social-empty-icon">⭐</div>No reputation tracked yet</div>'}
        </div>
        <div class="social-add-bar">
          <button class="social-add-btn" id="tsp-add-rep-btn">+ Track PC Reputation</button>
        </div>
      </div>

      <!-- Relationship Network Summary -->
      <div class="town-social-section" id="tsp-relationships">
        <div class="town-social-section-title">
          <span class="section-icon">🤝</span> Relationship Network
          <span class="section-count">${relationships.length}</span>
        </div>
        <div id="tsp-rel-summary" class="social-rel-list">
          ${renderRelSummary(relationships)}
        </div>
      </div>
    </div>
  `;

  // Wire Create Faction
  container.querySelector('#tsp-add-faction-btn')?.addEventListener('click', () => {
    openCreateFactionModal(townId, characters, () => refreshPanel(container, townId, characters));
  });

  // Wire Report Incident
  container.querySelector('#tsp-add-incident-btn')?.addEventListener('click', () => {
    openCreateIncidentModal(townId, characters, () => refreshPanel(container, townId, characters));
  });

  // Wire Track Reputation
  container.querySelector('#tsp-add-rep-btn')?.addEventListener('click', () => {
    openAddReputationModal(townId, characters, () => refreshPanel(container, townId, characters));
  });

  // Wire faction relation buttons
  container.querySelectorAll('.faction-add-rel-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const fid = parseInt(e.target.dataset.factionId);
      openAddFactionRelationModal(fid, factions, townId, () => refreshPanel(container, townId, characters));
    });
  });

  // Wire faction member add buttons
  container.querySelectorAll('.faction-add-member-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const fid = parseInt(e.target.dataset.factionId);
      openAddFactionMemberModal(fid, characters, () => refreshPanel(container, townId, characters));
    });
  });
}

async function refreshPanel(container, townId, characters) {
  try {
    const data = await apiGetSocialData(townId);
    renderSocialPanel(container, data, townId, characters);
  } catch (e) { console.error('Failed to refresh:', e); }
}

/* ── Render Helpers ──────────────────────────────────────── */

function renderFactionCard(f, allFactions) {
  const icon = FACTION_ICONS[f.faction_type] || '📌';
  const members = f.members || [];
  const relations = f.relations || [];
  const leader = members.find(m => m.role === 'leader');

  return `
    <div class="social-faction-card" data-faction-id="${f.id}">
      <div class="faction-header">
        <span class="faction-icon">${icon}</span>
        <span class="faction-name">${f.name}</span>
        <span class="faction-influence">⚡ ${f.influence}/10</span>
      </div>
      <div class="faction-desc">${f.description || 'No description'}${f.public_goal ? ' — Goal: ' + f.public_goal : ''}</div>
      ${leader ? `<div class="faction-desc" style="color:var(--accent)">👑 Leader: ${leader.character_name}</div>` : ''}
      <div class="faction-members-row">
        ${members.map(m => `<span class="faction-member-badge${m.role === 'leader' ? ' leader' : ''}" title="${m.role}">${m.character_name}</span>`).join('')}
        <button class="social-add-btn faction-add-member-btn" data-faction-id="${f.id}" style="font-size:0.62rem;padding:1px 6px;">+ Member</button>
      </div>
      ${relations.length ? `
        <div style="margin-top:0.5rem;border-top:1px solid rgba(255,255,255,0.06);padding-top:0.4rem;">
          <div style="font-size:0.7rem;color:var(--text-secondary);margin-bottom:0.25rem;">Diplomatic Relations:</div>
          ${relations.map(r => {
    const rIcon = RELATION_ICONS[r.relation_type] || '➖';
    const dVal = parseInt(r.disposition) || 0;
    return `<div style="font-size:0.7rem;display:flex;gap:0.4rem;align-items:center;">
              <span>${rIcon}</span>
              <span style="color:var(--text-primary)">${r.target_name}</span>
              <span style="color:var(--text-secondary)">${r.relation_type} (${dVal > 0 ? '+' : ''}${dVal})</span>
            </div>`;
  }).join('')}
        </div>
      ` : ''}
      <div class="social-add-bar" style="margin-top:0.4rem;">
        <button class="social-add-btn faction-add-rel-btn" data-faction-id="${f.id}" style="font-size:0.62rem;padding:1px 6px;">+ Diplomacy</button>
      </div>
    </div>
  `;
}

function renderIncidentCard(inc) {
  const icon = INCIDENT_TYPE_ICONS[inc.incident_type] || '⚡';
  const statusClass = (inc.status || 'active').toLowerCase();
  const participants = inc.participants || [];
  const clues = inc.clues || [];
  const perp = participants.find(p => p.role === 'perpetrator');
  const victim = participants.find(p => p.role === 'victim');
  const witnesses = participants.filter(p => p.role === 'witness');

  return `
    <div class="social-incident-card" data-status="${statusClass}" data-incident-id="${inc.id}">
      <div class="incident-header">
        <span class="incident-type-badge ${inc.incident_type}">${icon} ${inc.incident_type}</span>
        <span class="incident-summary">${inc.summary}</span>
        <span class="incident-status-badge ${statusClass}">${inc.status}</span>
      </div>
      <div class="incident-severity">Severity: ${'⬤'.repeat(Math.min(inc.severity, 5))}${'○'.repeat(5 - Math.min(inc.severity, 5))}</div>
      ${perp ? `<div style="font-size:0.72rem;color:var(--text-secondary);">🗡️ Perpetrator: <span style="color:#ff5252">${perp.character_name}</span></div>` : ''}
      ${victim ? `<div style="font-size:0.72rem;color:var(--text-secondary);">🎯 Victim: <span style="color:#ffab40">${victim.character_name}</span></div>` : ''}
      ${witnesses.length ? `<div style="font-size:0.72rem;color:var(--text-secondary);">👁️ Witnesses: ${witnesses.map(w => w.character_name).join(', ')}</div>` : ''}
      ${clues.length ? `
        <div class="incident-clues">
          ${clues.map(cl => `
            <div class="clue-item${cl.found_by_pc ? ' found' : ''}${cl.is_red_herring ? ' red-herring' : ''}">
              <span class="clue-icon">🔎</span>
              <span>${cl.clue_text}${cl.is_red_herring ? ' (red herring)' : ''}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function renderRepRow(rep) {
  const score = parseInt(rep.score) || 0;
  const pct = Math.abs(score) * 10; // -10 to 10 → 0-100%
  const color = score >= 5 ? '#66bb6a' : score >= 0 ? '#f5c518' : score >= -5 ? '#ff9800' : '#ff5252';

  return `
    <div class="social-rep-row">
      <span class="rep-pc-name">${rep.pc_name}</span>
      <div class="rep-bar">
        <div class="rep-bar-fill" style="width:${pct}%;background:${color}"></div>
      </div>
      <span class="rep-reason">${rep.source ? rep.source + ': ' : ''}${score > 0 ? '+' : ''}${score} — ${rep.reason || 'No reason'}</span>
    </div>
  `;
}

function renderRelSummary(relationships) {
  if (!relationships.length) {
    return '<div class="social-empty"><div class="social-empty-icon">🤝</div>No NPC relationships tracked</div>';
  }

  // Group by type
  const counts = {};
  relationships.forEach(r => {
    const t = r.rel_type || 'acquaintance';
    counts[t] = (counts[t] || 0) + 1;
  });

  const REL_ICONS = { friend: '🤝', rival: '⚡', enemy: '⚔️', romantic: '❤️', mentor: '📚', student: '📖', ally: '🤜', acquaintance: '👋', family: '👨‍👩‍👧' };

  let html = '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;">';
  for (const [type, count] of Object.entries(counts)) {
    html += `<span class="faction-member-badge" style="font-size:0.72rem;">${REL_ICONS[type] || '👋'} ${type}: ${count}</span>`;
  }
  html += '</div>';

  // Show top 10 relationships
  const sorted = [...relationships].sort((a, b) => Math.abs(b.disposition || 0) - Math.abs(a.disposition || 0));
  html += sorted.slice(0, 10).map(r => {
    const icon = REL_ICONS[r.rel_type] || '👋';
    const dVal = parseInt(r.disposition) || 0;
    let dClass = 'neutral';
    if (dVal >= 7) dClass = 'close';
    else if (dVal >= 3) dClass = 'friendly';
    else if (dVal <= -7) dClass = 'hostile';
    else if (dVal <= -3) dClass = 'unfriendly';
    return `<div class="social-rel-card" data-type="${r.rel_type}" style="animation-delay:0ms">
      <div class="rel-icon">${icon}</div>
      <div class="rel-info">
        <div class="rel-names">${r.char1_name} ↔ ${r.char2_name}</div>
        <div class="rel-type">${r.rel_type}${r.reason ? ' — ' + r.reason : ''}</div>
      </div>
      <div class="rel-disposition ${dClass}" title="Disposition: ${dVal}/10">${dVal > 0 ? '+' : ''}${dVal}</div>
    </div>`;
  }).join('');

  if (relationships.length > 10) {
    html += `<div style="text-align:center;font-size:0.72rem;color:var(--text-secondary);padding:0.5rem;">...and ${relationships.length - 10} more</div>`;
  }

  return html;
}

/* ── Modal Forms ─────────────────────────────────────────── */

function openCreateFactionModal(townId, characters, onDone) {
  const { el: m, close } = showModal({
    title: '⚒️ Create Faction', width: 'narrow',
    content: `<div class="modal-form">
      <label>Faction Name</label>
      <input type="text" id="fac-name" class="form-input" placeholder="e.g. The Iron Fellowship">
      <label>Type</label>
      <select id="fac-type" class="form-select">
        ${Object.keys(FACTION_ICONS).map(t => `<option value="${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('')}
      </select>
      <label>Description</label>
      <textarea id="fac-desc" class="form-input" rows="2" placeholder="What is this faction about?"></textarea>
      <label>Public Goal</label>
      <input type="text" id="fac-goal" class="form-input" placeholder="What does the public think they want?">
      <label>Influence (1-10)</label>
      <input type="number" id="fac-inf" class="form-input" value="3" min="1" max="10">
      <label>Leader (optional)</label>
      <select id="fac-leader" class="form-select">
        <option value="">— None —</option>
        ${characters.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
      </select>
      <button class="btn-primary" id="fac-save-btn" style="margin-top:0.75rem;width:100%">Create Faction</button>
    </div>`
  });

  m.querySelector('#fac-save-btn')?.addEventListener('click', async () => {
    const name = m.querySelector('#fac-name').value.trim();
    if (!name) return alert('Name required');
    const btn = m.querySelector('#fac-save-btn');
    btn.disabled = true; btn.textContent = 'Creating...';
    try {
      await apiSaveFaction({
        town_id: townId,
        name,
        faction_type: m.querySelector('#fac-type').value,
        description: m.querySelector('#fac-desc').value,
        public_goal: m.querySelector('#fac-goal').value,
        influence: parseInt(m.querySelector('#fac-inf').value) || 3,
        leader_id: m.querySelector('#fac-leader').value || null
      });
      close();
      onDone();
    } catch (e) { alert(e.message); btn.disabled = false; btn.textContent = 'Create Faction'; }
  });
}

function openCreateIncidentModal(townId, characters, onDone) {
  const { el: m, close } = showModal({
    title: '🔍 Report Incident', width: 'narrow',
    content: `<div class="modal-form">
      <label>Type</label>
      <select id="inc-type" class="form-select">
        ${Object.entries(INCIDENT_TYPE_ICONS).map(([k, v]) => `<option value="${k}">${v} ${k.charAt(0).toUpperCase() + k.slice(1)}</option>`).join('')}
      </select>
      <label>Summary</label>
      <textarea id="inc-summary" class="form-input" rows="2" placeholder="What happened?"></textarea>
      <label>Severity (1-10)</label>
      <input type="number" id="inc-severity" class="form-input" value="3" min="1" max="10">
      <label>Motive (optional)</label>
      <input type="text" id="inc-motive" class="form-input" placeholder="Why did it happen?">
      <label>Perpetrator (optional)</label>
      <select id="inc-perp" class="form-select">
        <option value="">— Unknown —</option>
        ${characters.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
      </select>
      <label>Victim (optional)</label>
      <select id="inc-victim" class="form-select">
        <option value="">— None —</option>
        ${characters.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
      </select>
      <button class="btn-primary" id="inc-save-btn" style="margin-top:0.75rem;width:100%">Report Incident</button>
    </div>`
  });

  m.querySelector('#inc-save-btn')?.addEventListener('click', async () => {
    const summary = m.querySelector('#inc-summary').value.trim();
    if (!summary) return alert('Summary required');
    const btn = m.querySelector('#inc-save-btn');
    btn.disabled = true; btn.textContent = 'Saving...';
    try {
      await apiSaveIncident({
        town_id: townId,
        incident_type: m.querySelector('#inc-type').value,
        summary,
        severity: parseInt(m.querySelector('#inc-severity').value) || 3,
        motive: m.querySelector('#inc-motive').value,
        status: 'active'
      });
      close();
      onDone();
    } catch (e) { alert(e.message); btn.disabled = false; btn.textContent = 'Report Incident'; }
  });
}

function openAddReputationModal(townId, characters, onDone) {
  const { el: m, close } = showModal({
    title: '⭐ Track PC Reputation', width: 'narrow',
    content: `<div class="modal-form">
      <label>PC Name</label>
      <input type="text" id="rep-pc" class="form-input" placeholder="Player character name">
      <label>Source (who/what judges them)</label>
      <select id="rep-source-type" class="form-select">
        <option value="npc">NPC</option>
        <option value="faction">Faction</option>
        <option value="town">Town</option>
      </select>
      <label>Score (-10 to 10)</label>
      <input type="number" id="rep-score" class="form-input" value="0" min="-10" max="10">
      <label>Reason</label>
      <input type="text" id="rep-reason" class="form-input" placeholder="Why do they feel this way?">
      <button class="btn-primary" id="rep-save-btn" style="margin-top:0.75rem;width:100%">Save Reputation</button>
    </div>`
  });

  m.querySelector('#rep-save-btn')?.addEventListener('click', async () => {
    const pcName = m.querySelector('#rep-pc').value.trim();
    if (!pcName) return alert('PC name required');
    const btn = m.querySelector('#rep-save-btn');
    btn.disabled = true; btn.textContent = 'Saving...';
    try {
      await apiSaveReputation({
        town_id: townId,
        pc_name: pcName,
        source_type: m.querySelector('#rep-source-type').value,
        score: parseInt(m.querySelector('#rep-score').value) || 0,
        reason: m.querySelector('#rep-reason').value
      });
      close();
      onDone();
    } catch (e) { alert(e.message); btn.disabled = false; btn.textContent = 'Save Reputation'; }
  });
}

function openAddFactionRelationModal(factionId, allFactions, townId, onDone) {
  const others = allFactions.filter(f => f.id !== factionId);
  if (!others.length) return alert('No other factions exist to create a relation with.');

  const { el: m, close } = showModal({
    title: '🏛️ Add Diplomatic Relation', width: 'narrow',
    content: `<div class="modal-form">
      <label>Target Faction</label>
      <select id="frel-target" class="form-select">
        ${others.map(f => `<option value="${f.id}">${f.name}</option>`).join('')}
      </select>
      <label>Relation Type</label>
      <select id="frel-type" class="form-select">
        ${Object.entries(RELATION_ICONS).map(([k, v]) => `<option value="${k}">${v} ${k.charAt(0).toUpperCase() + k.slice(1)}</option>`).join('')}
      </select>
      <label>Disposition (-10 to 10)</label>
      <input type="number" id="frel-disp" class="form-input" value="0" min="-10" max="10">
      <button class="btn-primary" id="frel-save-btn" style="margin-top:0.75rem;width:100%">Save Relation</button>
    </div>`
  });

  m.querySelector('#frel-save-btn')?.addEventListener('click', async () => {
    const btn = m.querySelector('#frel-save-btn');
    btn.disabled = true; btn.textContent = 'Saving...';
    try {
      await apiSaveFactionRelation({
        faction_id: factionId,
        target_faction_id: parseInt(m.querySelector('#frel-target').value),
        relation_type: m.querySelector('#frel-type').value,
        disposition: parseInt(m.querySelector('#frel-disp').value) || 0
      });
      close();
      onDone();
    } catch (e) { alert(e.message); btn.disabled = false; btn.textContent = 'Save Relation'; }
  });
}

function openAddFactionMemberModal(factionId, characters, onDone) {
  const { el: m, close } = showModal({
    title: '👤 Add Faction Member', width: 'narrow',
    content: `<div class="modal-form">
      <label>Character</label>
      <select id="fmem-char" class="form-select">
        ${characters.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
      </select>
      <label>Role</label>
      <select id="fmem-role" class="form-select">
        <option value="member">Member</option>
        <option value="leader">Leader</option>
        <option value="officer">Officer</option>
        <option value="recruit">Recruit</option>
        <option value="spy">Spy</option>
        <option value="informant">Informant</option>
      </select>
      <label>Loyalty (1-10)</label>
      <input type="number" id="fmem-loyalty" class="form-input" value="5" min="1" max="10">
      <button class="btn-primary" id="fmem-save-btn" style="margin-top:0.75rem;width:100%">Add Member</button>
    </div>`
  });

  m.querySelector('#fmem-save-btn')?.addEventListener('click', async () => {
    const btn = m.querySelector('#fmem-save-btn');
    btn.disabled = true; btn.textContent = 'Adding...';
    try {
      await apiSaveFactionMember({
        faction_id: factionId,
        character_id: parseInt(m.querySelector('#fmem-char').value),
        role: m.querySelector('#fmem-role').value,
        loyalty: parseInt(m.querySelector('#fmem-loyalty').value) || 5
      });
      close();
      onDone();
    } catch (e) { alert(e.message); btn.disabled = false; btn.textContent = 'Add Member'; }
  });
}
