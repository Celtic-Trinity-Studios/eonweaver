/**
 * Eon Weaver — Admin Dashboard View (Full Database Management)
 * Hierarchical drill-down: Users → Campaigns → Towns → Characters
 * With inline editing, deletion, and full data inspection.
 */
import {
    apiAdminOverview, apiAdminMembers, apiAdminTokenUsage,
    apiAdminUpdateMember, apiAdminDeleteMember,
    apiAdminUserCampaigns, apiAdminUserTowns,
    apiAdminTownCharacters, apiAdminCharacterDetail,
    apiAdminUpdateCharacter, apiAdminDeleteCharacter,
    apiAdminUpdateTown, apiAdminDeleteTown,
    apiAdminUpdateCampaign,
    apiAdminTownMeta, apiAdminTownBuildings, apiAdminTownHistory, apiAdminTownFactions,
    apiAdminCampaignRules, apiAdminCalendar,
    apiAdminSiteSettings, apiAdminUpdateSiteSetting,
    apiAdminAllTowns, apiAdminAllCampaigns,
    apiAdminUpdateMeta, apiAdminDeleteMeta,
} from '../api/admin.js';

export default function AdminDashboardView(container) {
    let activeTab = 'overview';
    // Breadcrumb state for drill-down
    let breadcrumb = []; // [{type, label, id, data}]

    container.innerHTML = `
    <div class="admin-dashboard">
      <div class="admin-header">
        <h1 class="admin-title">🛡️ Admin Dashboard</h1>
        <p class="admin-subtitle">Eon Weaver — Full Database Management</p>
      </div>

      <div class="admin-tabs" id="admin-tabs">
        <button class="admin-tab active" data-tab="overview">📊 Overview</button>
        <button class="admin-tab" data-tab="members">👥 Accounts</button>
        <button class="admin-tab" data-tab="campaigns">📜 Campaigns</button>
        <button class="admin-tab" data-tab="towns">🏰 Towns</button>
        <button class="admin-tab" data-tab="usage">📈 Token Usage</button>
        <button class="admin-tab" data-tab="settings">⚙️ Site Settings</button>
      </div>

      <div class="admin-breadcrumb" id="admin-breadcrumb"></div>

      <div class="admin-content" id="admin-content">
        <div class="admin-loading">Loading...</div>
      </div>
    </div>
    `;

    const contentEl = container.querySelector('#admin-content');
    const breadcrumbEl = container.querySelector('#admin-breadcrumb');

    // Tab switching
    container.querySelectorAll('.admin-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTab = btn.dataset.tab;
            breadcrumb = [];
            loadTab(activeTab);
        });
    });

    async function loadTab(tab) {
        contentEl.innerHTML = '<div class="admin-loading"><div class="admin-spinner"></div>Loading...</div>';
        renderBreadcrumb();
        try {
            if (tab === 'overview') await renderOverview();
            else if (tab === 'members') await renderMembers();
            else if (tab === 'campaigns') await renderAllCampaigns();
            else if (tab === 'towns') await renderAllTowns();
            else if (tab === 'usage') await renderUsage();
            else if (tab === 'settings') await renderSettings();
        } catch (err) {
            contentEl.innerHTML = `<div class="admin-error">⚠️ ${err.message}</div>`;
        }
    }

    function renderBreadcrumb() {
        if (!breadcrumb.length) {
            breadcrumbEl.innerHTML = '';
            return;
        }
        breadcrumbEl.innerHTML = `
            <div class="breadcrumb-trail">
                <button class="breadcrumb-item breadcrumb-root" data-idx="-1">🏠 All Accounts</button>
                ${breadcrumb.map((b, i) => `
                    <span class="breadcrumb-sep">›</span>
                    <button class="breadcrumb-item ${i === breadcrumb.length - 1 ? 'breadcrumb-current' : ''}" data-idx="${i}">
                        ${b.icon || ''} ${b.label}
                    </button>
                `).join('')}
            </div>
        `;
        breadcrumbEl.querySelectorAll('.breadcrumb-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                if (idx < 0) {
                    breadcrumb = [];
                    loadTab('members');
                    return;
                }
                const target = breadcrumb[idx];
                breadcrumb = breadcrumb.slice(0, idx + 1);
                if (target.loader) target.loader();
            });
        });
    }

    // ═══════════════════════════════════════
    // OVERVIEW TAB
    // ═══════════════════════════════════════
    async function renderOverview() {
        const data = await apiAdminOverview();
        contentEl.innerHTML = `
        <div class="admin-stats-grid">
          ${statCard('👥', data.total_users, 'Registered Users')}
          ${statCard('📜', data.total_campaigns, 'Total Campaigns')}
          ${statCard('🏰', data.total_towns, 'Total Towns')}
          ${statCard('🧙', data.total_characters, 'Total Characters')}
          ${statCard('🧠', formatTokens(data.monthly_tokens), 'Tokens This Month')}
          ${statCard('📡', data.monthly_calls, 'AI Calls This Month')}
          ${statCard('🟢', data.active_users, `Active Users (${data.month})`)}
          ${statCard('💰', '$' + estimateCost(data.monthly_tokens), 'Est. Cost This Month')}
        </div>
        `;
    }

    function statCard(icon, value, label) {
        return `
        <div class="admin-stat-card">
          <div class="stat-icon">${icon}</div>
          <div class="stat-value">${value}</div>
          <div class="stat-label">${label}</div>
        </div>`;
    }

    // ═══════════════════════════════════════
    // MEMBERS TAB (with drill-down)
    // ═══════════════════════════════════════
    async function renderMembers() {
        const data = await apiAdminMembers();
        const members = data.members || [];
        if (!members.length) {
            contentEl.innerHTML = '<div class="admin-empty">No members yet.</div>';
            return;
        }
        contentEl.innerHTML = `
        <div class="admin-section-header">
            <h2>All Accounts (${members.length})</h2>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table" id="admin-members-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Tier</th>
                <th>Role</th>
                <th>Campaigns</th>
                <th>Towns</th>
                <th>Tokens (Month)</th>
                <th>Usage %</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${members.map(m => {
                const pct = m.usage_pct || 0;
                const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : pct >= 40 ? '#eab308' : '#22c55e';
                return `
              <tr data-user-id="${m.id}">
                <td class="cell-id">${m.id}</td>
                <td class="member-name clickable" data-action="drill" data-user-id="${m.id}" data-username="${esc(m.username)}">${esc(m.username)}</td>
                <td class="member-email">${esc(m.email)}</td>
                <td>
                    <select class="admin-inline-select tier-select" data-field="subscription_tier" data-user-id="${m.id}">
                        <option value="free" ${m.subscription_tier === 'free' ? 'selected' : ''}>Free</option>
                        <option value="adventurer" ${m.subscription_tier === 'adventurer' ? 'selected' : ''}>Adventurer</option>
                        <option value="guild_master" ${m.subscription_tier === 'guild_master' ? 'selected' : ''}>Guild Master</option>
                        <option value="world_builder" ${m.subscription_tier === 'world_builder' ? 'selected' : ''}>World Builder</option>
                    </select>
                </td>
                <td>
                    <select class="admin-inline-select role-select" data-field="role" data-user-id="${m.id}">
                        <option value="user" ${(m.role || 'user') === 'user' ? 'selected' : ''}>User</option>
                        <option value="admin" ${m.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
                <td class="clickable" data-action="drill" data-user-id="${m.id}" data-username="${esc(m.username)}">${m.campaign_count}</td>
                <td>${m.town_count ?? 0}</td>
                <td>${formatTokens(m.tokens_this_month)} / ${formatTokens(m.token_limit || 0)}</td>
                <td>
                    <div class="admin-usage-bar" title="${pct}% used">
                        <div class="admin-usage-fill" style="width:${Math.min(pct, 100)}%; background:${barColor}"></div>
                        <span class="admin-usage-label">${pct}%</span>
                    </div>
                </td>
                <td>${new Date(m.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="admin-btn admin-btn-danger admin-btn-small" data-action="delete-member" data-user-id="${m.id}" data-username="${esc(m.username)}" title="Delete Account">🗑️</button>
                </td>
              </tr>
              `}).join('')}
            </tbody>
          </table>
        </div>
        `;

        // Inline tier/role editing
        contentEl.querySelectorAll('.admin-inline-select').forEach(sel => {
            sel.addEventListener('change', async () => {
                const uid = parseInt(sel.dataset.userId);
                const field = sel.dataset.field;
                try {
                    await apiAdminUpdateMember(uid, { [field]: sel.value });
                    flashSuccess(sel);
                } catch (err) {
                    alert('Error: ' + err.message);
                    renderMembers(); // reload
                }
            });
        });

        // Drill-down into user
        contentEl.querySelectorAll('[data-action="drill"]').forEach(el => {
            el.addEventListener('click', () => {
                const uid = parseInt(el.dataset.userId);
                const username = el.dataset.username;
                breadcrumb = [{ type: 'user', label: username, icon: '👤', id: uid, loader: () => drillUser(uid, username) }];
                drillUser(uid, username);
            });
        });

        // Delete member
        contentEl.querySelectorAll('[data-action="delete-member"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const uid = parseInt(btn.dataset.userId);
                const name = btn.dataset.username;
                if (!confirm(`⚠️ DELETE user "${name}" and ALL their data? This cannot be undone.`)) return;
                try {
                    await apiAdminDeleteMember(uid);
                    renderMembers();
                } catch (err) {
                    alert('Error: ' + err.message);
                }
            });
        });
    }

    // ═══════════════════════════════════════
    // DRILL: User → Campaigns
    // ═══════════════════════════════════════
    async function drillUser(userId, username) {
        contentEl.innerHTML = '<div class="admin-loading"><div class="admin-spinner"></div>Loading campaigns...</div>';
        renderBreadcrumb();
        try {
            const data = await apiAdminUserCampaigns(userId);
            const camps = data.campaigns || [];
            // Also get all towns for this user
            const townsData = await apiAdminUserTowns(userId);
            const towns = townsData.towns || [];

            contentEl.innerHTML = `
            <div class="admin-drill-header">
                <h2>👤 ${esc(username)}</h2>
                <span class="admin-drill-count">${camps.length} campaign(s) · ${towns.length} town(s)</span>
            </div>

            <div class="admin-drill-section">
                <h3>📜 Campaigns</h3>
                ${camps.length ? `
                <div class="admin-card-grid">
                    ${camps.map(c => `
                    <div class="admin-data-card" data-campaign-id="${c.id}">
                        <div class="card-header">
                            <span class="card-title clickable" data-action="drill-campaign" data-campaign-id="${c.id}" data-user-id="${userId}" data-username="${esc(username)}" data-name="${esc(c.name)}">${esc(c.name)}</span>
                            <span class="card-badge ${c.is_active ? 'badge-active' : 'badge-inactive'}">${c.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                        <div class="card-meta">
                            <span class="meta-item">🎲 ${c.dnd_edition}</span>
                            <span class="meta-item">🏰 ${c.town_count} towns</span>
                        </div>
                        ${c.description ? `<div class="card-desc">${esc(c.description)}</div>` : ''}
                        <div class="card-actions">
                            <button class="admin-btn admin-btn-small" data-action="edit-campaign" data-campaign-id="${c.id}" data-name="${esc(c.name)}" data-edition="${c.dnd_edition}" data-desc="${esc(c.description || '')}">✏️ Edit</button>
                        </div>
                    </div>
                    `).join('')}
                </div>
                ` : '<div class="admin-empty-inline">No campaigns.</div>'}
            </div>

            <div class="admin-drill-section">
                <h3>🏰 All Towns</h3>
                ${towns.length ? `
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead>
                        <tr><th>ID</th><th>Town</th><th>Campaign ID</th><th>Characters</th><th>Party Base</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        ${towns.map(t => `
                        <tr>
                            <td class="cell-id">${t.id}</td>
                            <td class="clickable" data-action="drill-town" data-town-id="${t.id}" data-user-id="${userId}" data-username="${esc(username)}" data-town-name="${esc(t.name)}">${esc(t.name)}</td>
                            <td>${t.campaign_id || '—'}</td>
                            <td>${t.character_count}</td>
                            <td>${t.is_party_base ? '⛺ Yes' : '—'}</td>
                            <td>
                                <button class="admin-btn admin-btn-small" data-action="edit-town" data-town-id="${t.id}" data-name="${esc(t.name)}" data-subtitle="${esc(t.subtitle || '')}">✏️</button>
                                <button class="admin-btn admin-btn-danger admin-btn-small" data-action="delete-town" data-town-id="${t.id}" data-name="${esc(t.name)}">🗑️</button>
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                </div>
                ` : '<div class="admin-empty-inline">No towns.</div>'}
            </div>
            `;

            bindCampaignDrill(userId, username);
            bindTownDrill(userId, username);
            bindEditCampaign();
            bindEditTown(userId, username);
            bindDeleteTown(userId, username);
        } catch (err) {
            contentEl.innerHTML = `<div class="admin-error">⚠️ ${err.message}</div>`;
        }
    }

    function bindCampaignDrill(userId, username) {
        contentEl.querySelectorAll('[data-action="drill-campaign"]').forEach(el => {
            el.addEventListener('click', () => {
                const campId = parseInt(el.dataset.campaignId);
                const name = el.dataset.name;
                breadcrumb = [
                    { type: 'user', label: username, icon: '👤', id: userId, loader: () => drillUser(userId, username) },
                    { type: 'campaign', label: name, icon: '📜', id: campId, loader: () => drillCampaign(userId, username, campId, name) },
                ];
                drillCampaign(userId, username, campId, name);
            });
        });
    }

    function bindTownDrill(userId, username) {
        contentEl.querySelectorAll('[data-action="drill-town"]').forEach(el => {
            el.addEventListener('click', () => {
                const townId = parseInt(el.dataset.townId);
                const townName = el.dataset.townName;
                // Preserve existing breadcrumb and append town
                const newBc = breadcrumb.filter(b => b.type !== 'town' && b.type !== 'character');
                if (!newBc.find(b => b.type === 'user')) {
                    newBc.push({ type: 'user', label: username, icon: '👤', id: userId, loader: () => drillUser(userId, username) });
                }
                newBc.push({ type: 'town', label: townName, icon: '🏰', id: townId, loader: () => drillTown(userId, username, townId, townName) });
                breadcrumb = newBc;
                drillTown(userId, username, townId, townName);
            });
        });
    }

    function bindEditCampaign() {
        contentEl.querySelectorAll('[data-action="edit-campaign"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const cid = parseInt(btn.dataset.campaignId);
                const name = btn.dataset.name;
                const edition = btn.dataset.edition;
                const desc = btn.dataset.desc;
                showEditModal('Edit Campaign', [
                    { key: 'name', label: 'Name', value: name },
                    { key: 'dnd_edition', label: 'Edition', value: edition, type: 'select', options: ['3.5e', '5e', '5e2024'] },
                    { key: 'description', label: 'Description', value: desc, type: 'textarea' },
                ], async (data) => {
                    await apiAdminUpdateCampaign(cid, data);
                });
            });
        });
    }

    function bindEditTown(userId, username) {
        contentEl.querySelectorAll('[data-action="edit-town"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const tid = parseInt(btn.dataset.townId);
                showEditModal('Edit Town', [
                    { key: 'name', label: 'Name', value: btn.dataset.name },
                    { key: 'subtitle', label: 'Subtitle', value: btn.dataset.subtitle, type: 'textarea' },
                ], async (data) => {
                    await apiAdminUpdateTown(tid, data);
                    drillUser(userId, username);
                });
            });
        });
    }

    function bindDeleteTown(userId, username) {
        contentEl.querySelectorAll('[data-action="delete-town"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const tid = parseInt(btn.dataset.townId);
                if (!confirm(`⚠️ DELETE town "${btn.dataset.name}" and all characters? Cannot be undone.`)) return;
                try {
                    await apiAdminDeleteTown(tid);
                    drillUser(userId, username);
                } catch (err) { alert('Error: ' + err.message); }
            });
        });
    }

    // ═══════════════════════════════════════
    // DRILL: Campaign → Towns + Rules + Calendar
    // ═══════════════════════════════════════
    async function drillCampaign(userId, username, campId, campName) {
        contentEl.innerHTML = '<div class="admin-loading"><div class="admin-spinner"></div>Loading campaign data...</div>';
        renderBreadcrumb();
        try {
            const [townsRes, rulesRes, calRes] = await Promise.all([
                apiAdminUserTowns(userId, campId),
                apiAdminCampaignRules(campId).catch(() => ({ rules: null })),
                apiAdminCalendar(campId).catch(() => ({ calendar: null })),
            ]);
            const towns = townsRes.towns || [];
            const rules = rulesRes.rules;
            const cal = calRes.calendar;

            contentEl.innerHTML = `
            <div class="admin-drill-header">
                <h2>📜 ${esc(campName)}</h2>
                <span class="admin-drill-count">${towns.length} town(s)</span>
            </div>

            ${cal ? `
            <div class="admin-drill-section">
                <h3>📅 Calendar</h3>
                <div class="admin-kv-grid">
                    ${kvRow('Year', cal.current_year)}
                    ${kvRow('Month', cal.current_month)}
                    ${kvRow('Day', cal.current_day)}
                    ${kvRow('Era', cal.era_name)}
                    ${kvRow('Months/Year', cal.months_per_year)}
                </div>
            </div>
            ` : ''}

            ${rules ? `
            <div class="admin-drill-section">
                <h3>📋 Campaign Rules</h3>
                <div class="admin-kv-grid">
                    ${kvRow('Relationship Speed', rules.relationship_speed)}
                    ${kvRow('Birth Rate', rules.birth_rate)}
                    ${kvRow('Death Threshold', rules.death_threshold)}
                    ${kvRow('Child Growth', rules.child_growth)}
                    ${kvRow('Conflict Frequency', rules.conflict_frequency)}
                    ${kvRow('Sell Rate', rules.sell_rate)}
                </div>
                ${rules.rules_text ? `<div class="admin-text-block"><strong>House Rules:</strong><pre>${esc(rules.rules_text)}</pre></div>` : ''}
                ${rules.campaign_description ? `<div class="admin-text-block"><strong>World Lore:</strong><pre>${esc(rules.campaign_description)}</pre></div>` : ''}
            </div>
            ` : ''}

            <div class="admin-drill-section">
                <h3>🏰 Towns in Campaign</h3>
                ${towns.length ? `
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead><tr><th>ID</th><th>Town</th><th>Characters</th><th>Party Base</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${towns.map(t => `
                        <tr>
                            <td class="cell-id">${t.id}</td>
                            <td class="clickable" data-action="drill-town" data-town-id="${t.id}" data-user-id="${userId}" data-username="${esc(username)}" data-town-name="${esc(t.name)}">${esc(t.name)}</td>
                            <td>${t.character_count}</td>
                            <td>${t.is_party_base ? '⛺ Yes' : '—'}</td>
                            <td>
                                <button class="admin-btn admin-btn-danger admin-btn-small" data-action="delete-town" data-town-id="${t.id}" data-name="${esc(t.name)}">🗑️</button>
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                </div>
                ` : '<div class="admin-empty-inline">No towns in this campaign.</div>'}
            </div>
            `;

            bindTownDrill(userId, username);
            bindDeleteTown(userId, username);
        } catch (err) {
            contentEl.innerHTML = `<div class="admin-error">⚠️ ${err.message}</div>`;
        }
    }

    // ═══════════════════════════════════════
    // DRILL: Town → Characters + Meta + Buildings
    // ═══════════════════════════════════════
    async function drillTown(userId, username, townId, townName) {
        contentEl.innerHTML = '<div class="admin-loading"><div class="admin-spinner"></div>Loading town data...</div>';
        renderBreadcrumb();
        try {
            const [charsRes, metaRes, buildingsRes, histRes, factionsRes] = await Promise.all([
                apiAdminTownCharacters(townId),
                apiAdminTownMeta(townId).catch(() => ({ meta: [] })),
                apiAdminTownBuildings(townId).catch(() => ({ buildings: [] })),
                apiAdminTownHistory(townId).catch(() => ({ history: [] })),
                apiAdminTownFactions(townId).catch(() => ({ factions: [] })),
            ]);
            const chars = charsRes.characters || [];
            const meta = metaRes.meta || [];
            const buildings = buildingsRes.buildings || [];
            const history = histRes.history || [];
            const factions = factionsRes.factions || [];

            contentEl.innerHTML = `
            <div class="admin-drill-header">
                <h2>🏰 ${esc(townName)}</h2>
                <span class="admin-drill-count">${chars.length} characters · ${buildings.length} buildings</span>
            </div>

            <!-- Characters -->
            <div class="admin-drill-section">
                <h3>🧙 Characters (${chars.length})</h3>
                ${chars.length ? `
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead>
                        <tr><th>ID</th><th>Name</th><th>Race</th><th>Class</th><th>Lvl</th><th>HP</th><th>Status</th><th>Alignment</th><th>Role</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        ${chars.map(c => `
                        <tr data-char-id="${c.id}">
                            <td class="cell-id">${c.id}</td>
                            <td class="member-name clickable" data-action="drill-char" data-char-id="${c.id}" data-char-name="${esc(c.name)}">${esc(c.name)}</td>
                            <td>${esc(c.race || '—')}</td>
                            <td>${esc(c.class || '—')}</td>
                            <td>${c.level || '—'}</td>
                            <td>${c.hp || '—'}</td>
                            <td><span class="status-badge status-${(c.status || 'alive').toLowerCase()}">${c.status || 'Alive'}</span></td>
                            <td>${esc(c.alignment || '—')}</td>
                            <td class="cell-truncate">${esc(c.role || '—')}</td>
                            <td>
                                <button class="admin-btn admin-btn-small" data-action="edit-char-quick" data-char-id="${c.id}">✏️</button>
                                <button class="admin-btn admin-btn-danger admin-btn-small" data-action="delete-char" data-char-id="${c.id}" data-name="${esc(c.name)}">🗑️</button>
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                </div>
                ` : '<div class="admin-empty-inline">No characters.</div>'}
            </div>

            <!-- Town Meta -->
            ${meta.length ? `
            <div class="admin-drill-section">
                <h3>🔧 Town Metadata (${meta.length})</h3>
                <div class="admin-kv-grid">
                    ${meta.map(m => kvRow(m.key, m.value)).join('')}
                </div>
            </div>
            ` : ''}

            <!-- Buildings -->
            ${buildings.length ? `
            <div class="admin-drill-section">
                <h3>🏗️ Buildings (${buildings.length})</h3>
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Status</th><th>Owner ID</th><th>Description</th></tr></thead>
                    <tbody>
                        ${buildings.map(b => `
                        <tr>
                            <td class="cell-id">${b.id}</td>
                            <td>${esc(b.name)}</td>
                            <td>${esc(b.building_type || '—')}</td>
                            <td>${esc(b.status || '—')}</td>
                            <td>${b.owner_id || '—'}</td>
                            <td class="cell-truncate">${esc(b.description || '—')}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                </div>
            </div>
            ` : ''}

            <!-- Factions -->
            ${factions.length ? `
            <div class="admin-drill-section">
                <h3>⚔️ Factions (${factions.length})</h3>
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead><tr><th>ID</th><th>Name</th><th>Alignment</th><th>Type</th><th>Status</th><th>Influence</th></tr></thead>
                    <tbody>
                        ${factions.map(f => `
                        <tr>
                            <td class="cell-id">${f.id}</td>
                            <td>${esc(f.name)}</td>
                            <td>${esc(f.alignment || '—')}</td>
                            <td>${esc(f.faction_type || '—')}</td>
                            <td>${esc(f.status || '—')}</td>
                            <td>${f.influence || '—'}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                </div>
            </div>
            ` : ''}

            <!-- History -->
            ${history.length ? `
            <div class="admin-drill-section">
                <h3>📖 History (${history.length} entries)</h3>
                <div class="admin-history-list">
                    ${history.map(h => `
                    <div class="admin-history-entry">
                        <div class="history-heading">${esc(h.heading)}</div>
                        <div class="history-content">${esc((h.content || '').substring(0, 300))}${(h.content || '').length > 300 ? '...' : ''}</div>
                    </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            `;

            // Character drill-down
            contentEl.querySelectorAll('[data-action="drill-char"]').forEach(el => {
                el.addEventListener('click', () => {
                    const charId = parseInt(el.dataset.charId);
                    const charName = el.dataset.charName;
                    const newBc = breadcrumb.filter(b => b.type !== 'character');
                    newBc.push({ type: 'character', label: charName, icon: '🧙', id: charId, loader: () => drillCharacter(userId, username, townId, townName, charId, charName) });
                    breadcrumb = newBc;
                    drillCharacter(userId, username, townId, townName, charId, charName);
                });
            });

            // Quick edit character
            contentEl.querySelectorAll('[data-action="edit-char-quick"]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const charId = parseInt(btn.dataset.charId);
                    const char = chars.find(c => c.id == charId);
                    if (!char) return;
                    showEditModal('Edit Character', [
                        { key: 'name', label: 'Name', value: char.name },
                        { key: 'race', label: 'Race', value: char.race },
                        { key: 'class', label: 'Class', value: char.class },
                        { key: 'level', label: 'Level', value: char.level, type: 'number' },
                        { key: 'hp', label: 'HP', value: char.hp, type: 'number' },
                        { key: 'status', label: 'Status', value: char.status, type: 'select', options: ['Alive', 'Dead', 'Missing', 'Departed', 'Unconscious'] },
                        { key: 'alignment', label: 'Alignment', value: char.alignment },
                        { key: 'role', label: 'Role', value: char.role },
                        { key: 'age', label: 'Age', value: char.age, type: 'number' },
                        { key: 'gender', label: 'Gender', value: char.gender },
                    ], async (data) => {
                        await apiAdminUpdateCharacter(charId, data);
                        drillTown(userId, username, townId, townName);
                    });
                });
            });

            // Delete character
            contentEl.querySelectorAll('[data-action="delete-char"]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const charId = parseInt(btn.dataset.charId);
                    if (!confirm(`Delete character "${btn.dataset.name}"?`)) return;
                    try {
                        await apiAdminDeleteCharacter(charId);
                        drillTown(userId, username, townId, townName);
                    } catch (err) { alert('Error: ' + err.message); }
                });
            });
        } catch (err) {
            contentEl.innerHTML = `<div class="admin-error">⚠️ ${err.message}</div>`;
        }
    }

    // ═══════════════════════════════════════
    // DRILL: Character → Full Detail + Edit
    // ═══════════════════════════════════════
    async function drillCharacter(userId, username, townId, townName, charId, charName) {
        contentEl.innerHTML = '<div class="admin-loading"><div class="admin-spinner"></div>Loading character data...</div>';
        renderBreadcrumb();
        try {
            const data = await apiAdminCharacterDetail(charId);
            const c = data.character;
            const equipment = data.equipment || [];
            const xpLog = data.xp_log || [];
            const memories = data.memories || [];
            const relationships = data.relationships || [];
            const spells = data.spells_known || [];
            const effects = data.active_effects || [];
            const levelHistory = data.level_history || [];

            contentEl.innerHTML = `
            <div class="admin-drill-header">
                <h2>🧙 ${esc(c.name)}</h2>
                <span class="admin-drill-count">${esc(c.race)} ${esc(c.class)} Lv${c.level} · ${c.status}</span>
                <button class="admin-btn admin-btn-primary" id="edit-full-char">✏️ Edit All Fields</button>
            </div>

            <!-- Core Stats -->
            <div class="admin-drill-section">
                <h3>📊 Core Stats</h3>
                <div class="admin-kv-grid char-stats-grid">
                    ${kvRow('Name', c.name)}
                    ${kvRow('Race', c.race)}
                    ${kvRow('Class', c.class)}
                    ${kvRow('Level', c.level)}
                    ${kvRow('XP', c.xp)}
                    ${kvRow('HP', c.hp)}
                    ${kvRow('HD', c.hd)}
                    ${kvRow('AC', c.ac)}
                    ${kvRow('Init', c.init)}
                    ${kvRow('Speed', c.spd)}
                    ${kvRow('BAB/Grapple', c.grapple)}
                    ${kvRow('Attack', c.atk)}
                    ${kvRow('Status', c.status)}
                    ${kvRow('Alignment', c.alignment)}
                    ${kvRow('Gender', c.gender)}
                    ${kvRow('Age', c.age)}
                    ${kvRow('Title', c.title)}
                    ${kvRow('Role', c.role)}
                    ${kvRow('Spouse', c.spouse)}
                    ${kvRow('CR', c.cr)}
                    ${kvRow('ECL', c.ecl)}
                </div>
            </div>

            <!-- Ability Scores -->
            <div class="admin-drill-section">
                <h3>💪 Ability Scores</h3>
                <div class="admin-ability-grid">
                    ${['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map(a => {
                        const key = a === 'INT' ? 'int_' : a.toLowerCase();
                        const val = c[key] || '—';
                        const mod = val !== '—' ? Math.floor((parseInt(val) - 10) / 2) : '';
                        return `<div class="ability-card"><div class="ability-label">${a}</div><div class="ability-value">${val}</div>${mod !== '' ? `<div class="ability-mod">${mod >= 0 ? '+' : ''}${mod}</div>` : ''}</div>`;
                    }).join('')}
                </div>
            </div>

            <!-- Saves & Skills -->
            <div class="admin-drill-section">
                <h3>🛡️ Saves & Skills</h3>
                <div class="admin-kv-grid">
                    ${kvRow('Saves', c.saves)}
                    ${kvRow('Languages', c.languages)}
                    ${kvRow('Domains', c.domains)}
                </div>
                ${c.skills_feats ? `<div class="admin-text-block"><strong>Skills:</strong><pre>${esc(c.skills_feats)}</pre></div>` : ''}
                ${c.feats ? `<div class="admin-text-block"><strong>Feats:</strong><pre>${esc(c.feats)}</pre></div>` : ''}
            </div>

            <!-- Equipment -->
            ${equipment.length ? `
            <div class="admin-drill-section">
                <h3>⚔️ Equipment (${equipment.length})</h3>
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead><tr><th>Item</th><th>Type</th><th>Slot</th><th>Qty</th><th>Weight</th><th>Equipped</th></tr></thead>
                    <tbody>
                        ${equipment.map(e => `
                        <tr class="${e.equipped ? 'row-equipped' : ''}">
                            <td>${esc(e.item_name)}</td>
                            <td>${esc(e.item_type)}</td>
                            <td>${esc(e.slot || '—')}</td>
                            <td>${e.quantity}</td>
                            <td>${e.weight}</td>
                            <td>${e.equipped ? '✅' : '—'}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                </div>
            </div>
            ` : ''}

            <!-- Gear text -->
            ${c.gear ? `
            <div class="admin-drill-section">
                <h3>🎒 Gear Text</h3>
                <div class="admin-text-block"><pre>${esc(c.gear)}</pre></div>
            </div>
            ` : ''}

            <!-- History / Backstory -->
            ${c.history ? `
            <div class="admin-drill-section">
                <h3>📖 History</h3>
                <div class="admin-text-block"><pre>${esc(c.history)}</pre></div>
            </div>
            ` : ''}

            <!-- Portrait -->
            ${c.portrait_url ? `
            <div class="admin-drill-section">
                <h3>🖼️ Portrait</h3>
                <img src="${c.portrait_url}" class="admin-portrait" alt="Portrait">
                ${c.portrait_prompt ? `<div class="admin-text-block"><strong>Prompt:</strong> ${esc(c.portrait_prompt)}</div>` : ''}
            </div>
            ` : ''}

            <!-- Relationships -->
            ${relationships.length ? `
            <div class="admin-drill-section">
                <h3>💕 Relationships (${relationships.length})</h3>
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead><tr><th>Character 1</th><th>Character 2</th><th>Type</th><th>Disposition</th><th>Reason</th></tr></thead>
                    <tbody>
                        ${relationships.map(r => `
                        <tr>
                            <td>${esc(r.char1_name || r.char1_id)}</td>
                            <td>${esc(r.char2_name || r.char2_id)}</td>
                            <td>${esc(r.rel_type)}</td>
                            <td>${r.disposition}</td>
                            <td class="cell-truncate">${esc(r.reason || '')}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                </div>
            </div>
            ` : ''}

            <!-- Memories -->
            ${memories.length ? `
            <div class="admin-drill-section">
                <h3>🧠 Memories (${memories.length})</h3>
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead><tr><th>Type</th><th>Content</th><th>Sentiment</th><th>Importance</th></tr></thead>
                    <tbody>
                        ${memories.map(m => `
                        <tr>
                            <td>${esc(m.memory_type)}</td>
                            <td class="cell-truncate">${esc(m.content)}</td>
                            <td>${m.sentiment}</td>
                            <td>${m.importance}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                </div>
            </div>
            ` : ''}

            <!-- Spells Known -->
            ${spells.length ? `
            <div class="admin-drill-section">
                <h3>🔮 Spells Known (${spells.length})</h3>
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead><tr><th>Spell</th><th>Level</th><th>Class</th><th>Source</th></tr></thead>
                    <tbody>
                        ${spells.map(s => `
                        <tr><td>${esc(s.spell_name)}</td><td>${s.spell_level}</td><td>${esc(s.class_name)}</td><td>${esc(s.source)}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
                </div>
            </div>
            ` : ''}

            <!-- Active Effects -->
            ${effects.length ? `
            <div class="admin-drill-section">
                <h3>✨ Active Effects (${effects.length})</h3>
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead><tr><th>Effect</th><th>Category</th><th>Duration</th><th>Source</th></tr></thead>
                    <tbody>
                        ${effects.map(e => `
                        <tr><td>${esc(e.effect_name)}</td><td>${esc(e.category)}</td><td>${e.duration_type}${e.duration_remaining ? ' (' + e.duration_remaining + ' left)' : ''}</td><td>${esc(e.source)}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
                </div>
            </div>
            ` : ''}

            <!-- Level History -->
            ${levelHistory.length ? `
            <div class="admin-drill-section">
                <h3>📈 Level History</h3>
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead><tr><th>Lvl</th><th>Class</th><th>HP Gained</th><th>Skill Pts</th><th>Feat</th><th>Ability Increase</th></tr></thead>
                    <tbody>
                        ${levelHistory.map(l => `
                        <tr>
                            <td>${l.level_number}</td>
                            <td>${esc(l.class_name)}</td>
                            <td>${l.hp_gained}</td>
                            <td>${l.skill_points}</td>
                            <td>${esc(l.feat_chosen || '—')}</td>
                            <td>${esc(l.ability_increase || '—')}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                </div>
            </div>
            ` : ''}

            <!-- XP Log -->
            ${xpLog.length ? `
            <div class="admin-drill-section">
                <h3>⭐ XP Log (last ${xpLog.length})</h3>
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead><tr><th>XP</th><th>Reason</th><th>Source</th><th>Date</th></tr></thead>
                    <tbody>
                        ${xpLog.map(x => `
                        <tr>
                            <td class="xp-value">+${x.xp_gained}</td>
                            <td class="cell-truncate">${esc(x.reason)}</td>
                            <td>${esc(x.source)}</td>
                            <td>${x.created_at ? new Date(x.created_at).toLocaleDateString() : '—'}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                </div>
            </div>
            ` : ''}

            <!-- AI Data -->
            ${c.ai_data ? `
            <div class="admin-drill-section">
                <h3>🤖 AI Data (raw)</h3>
                <div class="admin-text-block"><pre>${esc(c.ai_data.substring(0, 2000))}${c.ai_data.length > 2000 ? '...' : ''}</pre></div>
            </div>
            ` : ''}
            `;

            // Full edit button
            contentEl.querySelector('#edit-full-char')?.addEventListener('click', () => {
                showEditModal(`Edit: ${c.name}`, [
                    { key: 'name', label: 'Name', value: c.name },
                    { key: 'race', label: 'Race', value: c.race },
                    { key: 'class', label: 'Class', value: c.class },
                    { key: 'level', label: 'Level', value: c.level, type: 'number' },
                    { key: 'hp', label: 'HP', value: c.hp, type: 'number' },
                    { key: 'xp', label: 'XP', value: c.xp, type: 'number' },
                    { key: 'age', label: 'Age', value: c.age, type: 'number' },
                    { key: 'status', label: 'Status', value: c.status, type: 'select', options: ['Alive', 'Dead', 'Missing', 'Departed', 'Unconscious'] },
                    { key: 'alignment', label: 'Alignment', value: c.alignment },
                    { key: 'gender', label: 'Gender', value: c.gender },
                    { key: 'title', label: 'Title', value: c.title },
                    { key: 'role', label: 'Role', value: c.role },
                    { key: 'str', label: 'STR', value: c.str, type: 'number' },
                    { key: 'dex', label: 'DEX', value: c.dex, type: 'number' },
                    { key: 'con', label: 'CON', value: c.con, type: 'number' },
                    { key: 'int_', label: 'INT', value: c.int_, type: 'number' },
                    { key: 'wis', label: 'WIS', value: c.wis, type: 'number' },
                    { key: 'cha', label: 'CHA', value: c.cha, type: 'number' },
                    { key: 'languages', label: 'Languages', value: c.languages },
                    { key: 'feats', label: 'Feats', value: c.feats, type: 'textarea' },
                    { key: 'skills_feats', label: 'Skills', value: c.skills_feats, type: 'textarea' },
                    { key: 'gear', label: 'Gear', value: c.gear, type: 'textarea' },
                    { key: 'history', label: 'History', value: c.history, type: 'textarea' },
                    { key: 'portrait_url', label: 'Portrait URL', value: c.portrait_url },
                ], async (updatedData) => {
                    await apiAdminUpdateCharacter(charId, updatedData);
                    drillCharacter(userId, username, townId, townName, charId, updatedData.name || charName);
                });
            });
        } catch (err) {
            contentEl.innerHTML = `<div class="admin-error">⚠️ ${err.message}</div>`;
        }
    }

    // ═══════════════════════════════════════
    // ALL CAMPAIGNS TAB (global)
    // ═══════════════════════════════════════
    async function renderAllCampaigns() {
        const data = await apiAdminAllCampaigns();
        const camps = data.campaigns || [];
        contentEl.innerHTML = `
        <div class="admin-section-header">
            <h2>📜 All Campaigns (${camps.length})</h2>
        </div>
        ${camps.length ? `
        <div class="admin-table-wrap">
          <table class="admin-table" id="admin-all-campaigns-table">
            <thead>
              <tr>
                <th>ID</th><th>Owner</th><th>Campaign Name</th><th>Edition</th>
                <th>Towns</th><th>Active</th><th>Created</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${camps.map(c => `
              <tr>
                <td class="cell-id">${c.id}</td>
                <td class="member-name">${esc(c.owner_name)}</td>
                <td>${esc(c.name)}</td>
                <td><span class="card-badge badge-active">${c.dnd_edition}</span></td>
                <td>${c.town_count}</td>
                <td>${c.is_active ? '✅ Yes' : '—'}</td>
                <td>${c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                <td>
                    <button class="admin-btn admin-btn-small" data-action="edit-campaign-global" data-cid="${c.id}" data-name="${esc(c.name)}" data-edition="${c.dnd_edition}" data-desc="${esc(c.description || '')}" data-active="${c.is_active}">✏️ Edit</button>
                </td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : '<div class="admin-empty">No campaigns yet.</div>'}
        `;

        contentEl.querySelectorAll('[data-action="edit-campaign-global"]').forEach(btn => {
            btn.addEventListener('click', () => {
                showEditModal('Edit Campaign', [
                    { key: 'name', label: 'Name', value: btn.dataset.name },
                    { key: 'dnd_edition', label: 'Edition', value: btn.dataset.edition, type: 'select', options: ['3.5e', '5e', '5e2024'] },
                    { key: 'description', label: 'Description', value: btn.dataset.desc, type: 'textarea' },
                    { key: 'is_active', label: 'Active', value: btn.dataset.active === '1' ? '1' : '0', type: 'select', options: ['1', '0'] },
                ], async (data) => {
                    await apiAdminUpdateCampaign(parseInt(btn.dataset.cid), data);
                    renderAllCampaigns();
                });
            });
        });
    }

    // ═══════════════════════════════════════
    // ALL TOWNS TAB (global, with full detail)
    // ═══════════════════════════════════════
    async function renderAllTowns() {
        const data = await apiAdminAllTowns();
        const towns = data.towns || [];
        contentEl.innerHTML = `
        <div class="admin-section-header">
            <h2>🏰 All Towns (${towns.length})</h2>
        </div>
        ${towns.length ? `
        <div class="admin-table-wrap">
          <table class="admin-table" id="admin-all-towns-table">
            <thead>
              <tr>
                <th>ID</th><th>Owner</th><th>Campaign</th><th>Town Name</th>
                <th>Characters</th><th>Party Base</th><th>Updated</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${towns.map(t => `
              <tr>
                <td class="cell-id">${t.id}</td>
                <td class="member-name">${esc(t.owner_name)}</td>
                <td>${esc(t.campaign_name || '—')}</td>
                <td class="clickable town-drill-link" data-town-id="${t.id}" data-town-name="${esc(t.name)}" data-user-id="${t.user_id}" data-username="${esc(t.owner_name)}">${esc(t.name)}</td>
                <td>${t.character_count}</td>
                <td>${t.is_party_base ? '⛺ Yes' : '—'}</td>
                <td>${t.updated_at ? new Date(t.updated_at).toLocaleDateString() : '—'}</td>
                <td>
                    <button class="admin-btn admin-btn-small" data-action="edit-town-global" data-tid="${t.id}" data-name="${esc(t.name)}" data-subtitle="${esc(t.subtitle || '')}" data-party="${t.is_party_base}">✏️</button>
                    <button class="admin-btn admin-btn-small" data-action="view-town-detail" data-tid="${t.id}" data-name="${esc(t.name)}" data-uid="${t.user_id}" data-uname="${esc(t.owner_name)}">🔍 Detail</button>
                    <button class="admin-btn admin-btn-danger admin-btn-small" data-action="delete-town-global" data-tid="${t.id}" data-name="${esc(t.name)}">🗑️</button>
                </td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : '<div class="admin-empty">No towns yet.</div>'}
        `;

        // Click town name to see detail
        contentEl.querySelectorAll('.town-drill-link').forEach(el => {
            el.addEventListener('click', () => {
                const townId = parseInt(el.dataset.townId);
                const townName = el.dataset.townName;
                const userId = parseInt(el.dataset.userId);
                const username = el.dataset.username;
                breadcrumb = [
                    { type: 'towns-list', label: 'All Towns', icon: '🏰', loader: () => { breadcrumb = []; renderAllTowns(); renderBreadcrumb(); } },
                    { type: 'town', label: townName, icon: '🏰', id: townId, loader: () => renderTownDetail(townId, townName, userId, username) },
                ];
                renderTownDetail(townId, townName, userId, username);
            });
        });

        // View detail button
        contentEl.querySelectorAll('[data-action="view-town-detail"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const townId = parseInt(btn.dataset.tid);
                const townName = btn.dataset.name;
                const userId = parseInt(btn.dataset.uid);
                const username = btn.dataset.uname;
                breadcrumb = [
                    { type: 'towns-list', label: 'All Towns', icon: '🏰', loader: () => { breadcrumb = []; renderAllTowns(); renderBreadcrumb(); } },
                    { type: 'town', label: townName, icon: '🏰', id: townId, loader: () => renderTownDetail(townId, townName, userId, username) },
                ];
                renderTownDetail(townId, townName, userId, username);
            });
        });

        // Edit town
        contentEl.querySelectorAll('[data-action="edit-town-global"]').forEach(btn => {
            btn.addEventListener('click', () => {
                showEditModal('Edit Town', [
                    { key: 'name', label: 'Name', value: btn.dataset.name },
                    { key: 'subtitle', label: 'Subtitle', value: btn.dataset.subtitle, type: 'textarea' },
                    { key: 'is_party_base', label: 'Party Base', value: btn.dataset.party === '1' ? '1' : '0', type: 'select', options: ['0', '1'] },
                ], async (data) => {
                    await apiAdminUpdateTown(parseInt(btn.dataset.tid), data);
                    renderAllTowns();
                });
            });
        });

        // Delete town
        contentEl.querySelectorAll('[data-action="delete-town-global"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm(`⚠️ DELETE town "${btn.dataset.name}" and ALL its characters? Cannot be undone.`)) return;
                try {
                    await apiAdminDeleteTown(parseInt(btn.dataset.tid));
                    renderAllTowns();
                } catch (err) { alert('Error: ' + err.message); }
            });
        });
    }

    // ═══════════════════════════════════════
    // TOWN DETAIL VIEW (from Towns tab)
    // ═══════════════════════════════════════
    async function renderTownDetail(townId, townName, userId, username) {
        contentEl.innerHTML = '<div class="admin-loading"><div class="admin-spinner"></div>Loading town detail...</div>';
        renderBreadcrumb();
        try {
            const [charsRes, metaRes, buildingsRes, histRes, factionsRes] = await Promise.all([
                apiAdminTownCharacters(townId),
                apiAdminTownMeta(townId).catch(() => ({ meta: [] })),
                apiAdminTownBuildings(townId).catch(() => ({ buildings: [] })),
                apiAdminTownHistory(townId).catch(() => ({ history: [] })),
                apiAdminTownFactions(townId).catch(() => ({ factions: [] })),
            ]);
            const chars = charsRes.characters || [];
            const meta = metaRes.meta || [];
            const buildings = buildingsRes.buildings || [];
            const history = histRes.history || [];
            const factions = factionsRes.factions || [];

            contentEl.innerHTML = `
            <div class="admin-drill-header">
                <h2>🏰 ${esc(townName)}</h2>
                <span class="admin-drill-count">Owner: ${esc(username)} · ${chars.length} characters · ${buildings.length} buildings</span>
                <button class="admin-btn admin-btn-small" id="edit-town-from-detail" data-tid="${townId}" data-name="${esc(townName)}">✏️ Edit Town</button>
            </div>

            <!-- Town Metadata -->
            <div class="admin-drill-section">
                <h3>🔧 Town Metadata (${meta.length})</h3>
                ${meta.length ? `
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead><tr><th>Key</th><th>Value</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${meta.map(m => `
                        <tr>
                            <td class="setting-key">${esc(m.key)}</td>
                            <td>
                                <input type="text" class="admin-inline-input meta-value-input" data-key="${esc(m.key)}" value="${esc(m.value || '')}" />
                            </td>
                            <td>
                                <button class="admin-btn admin-btn-small admin-btn-primary" data-action="save-meta" data-key="${esc(m.key)}">💾</button>
                                <button class="admin-btn admin-btn-small admin-btn-danger" data-action="del-meta" data-key="${esc(m.key)}">🗑️</button>
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                </div>
                ` : '<div class="admin-empty-inline">No metadata.</div>'}
                <button class="admin-btn admin-btn-small" id="add-meta-btn" style="margin-top:.5rem;">+ Add Metadata</button>
            </div>

            <!-- Characters -->
            <div class="admin-drill-section">
                <h3>🧙 Characters (${chars.length})</h3>
                ${chars.length ? `
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead>
                        <tr><th>ID</th><th>Name</th><th>Race</th><th>Class</th><th>Lvl</th><th>HP</th><th>Status</th><th>Alignment</th><th>Role</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        ${chars.map(c => `
                        <tr>
                            <td class="cell-id">${c.id}</td>
                            <td class="member-name clickable char-detail-link" data-char-id="${c.id}" data-char-name="${esc(c.name)}">${esc(c.name)}</td>
                            <td>${esc(c.race || '—')}</td>
                            <td>${esc(c.class || '—')}</td>
                            <td>${c.level || '—'}</td>
                            <td>${c.hp || '—'}</td>
                            <td><span class="status-badge status-${(c.status || 'alive').toLowerCase()}">${c.status || 'Alive'}</span></td>
                            <td>${esc(c.alignment || '—')}</td>
                            <td class="cell-truncate">${esc(c.role || '—')}</td>
                            <td>
                                <button class="admin-btn admin-btn-small" data-action="edit-char" data-char-id="${c.id}">✏️</button>
                                <button class="admin-btn admin-btn-danger admin-btn-small" data-action="del-char" data-char-id="${c.id}" data-name="${esc(c.name)}">🗑️</button>
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                </div>
                ` : '<div class="admin-empty-inline">No characters.</div>'}
            </div>

            <!-- Buildings -->
            ${buildings.length ? `
            <div class="admin-drill-section">
                <h3>🏗️ Buildings (${buildings.length})</h3>
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Status</th><th>Owner ID</th><th>Description</th></tr></thead>
                    <tbody>
                        ${buildings.map(b => `
                        <tr>
                            <td class="cell-id">${b.id}</td>
                            <td>${esc(b.name)}</td>
                            <td>${esc(b.building_type || '—')}</td>
                            <td>${esc(b.status || '—')}</td>
                            <td>${b.owner_id || '—'}</td>
                            <td class="cell-truncate">${esc(b.description || '—')}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                </div>
            </div>
            ` : ''}

            <!-- Factions -->
            ${factions.length ? `
            <div class="admin-drill-section">
                <h3>⚔️ Factions (${factions.length})</h3>
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead><tr><th>ID</th><th>Name</th><th>Alignment</th><th>Type</th><th>Status</th><th>Influence</th></tr></thead>
                    <tbody>
                        ${factions.map(f => `
                        <tr>
                            <td class="cell-id">${f.id}</td>
                            <td>${esc(f.name)}</td>
                            <td>${esc(f.alignment || '—')}</td>
                            <td>${esc(f.faction_type || '—')}</td>
                            <td>${esc(f.status || '—')}</td>
                            <td>${f.influence || '—'}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                </div>
            </div>
            ` : ''}

            <!-- History -->
            ${history.length ? `
            <div class="admin-drill-section">
                <h3>📖 History (${history.length} entries)</h3>
                <div class="admin-history-list">
                    ${history.slice(0, 20).map(h => `
                    <div class="admin-history-entry">
                        <div class="history-heading">${esc(h.heading)}</div>
                        <div class="history-content">${esc((h.content || '').substring(0, 300))}${(h.content || '').length > 300 ? '...' : ''}</div>
                    </div>
                    `).join('')}
                    ${history.length > 20 ? `<div class="admin-empty-inline">...and ${history.length - 20} more entries</div>` : ''}
                </div>
            </div>
            ` : ''}
            `;

            // Edit town from detail header
            contentEl.querySelector('#edit-town-from-detail')?.addEventListener('click', () => {
                showEditModal('Edit Town', [
                    { key: 'name', label: 'Name', value: townName },
                    { key: 'subtitle', label: 'Subtitle', value: '', type: 'textarea' },
                ], async (data) => {
                    await apiAdminUpdateTown(townId, data);
                    renderTownDetail(townId, data.name || townName, userId, username);
                });
            });

            // Save metadata value
            contentEl.querySelectorAll('[data-action="save-meta"]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const key = btn.dataset.key;
                    const input = contentEl.querySelector(`.meta-value-input[data-key="${key}"]`);
                    if (!input) return;
                    try {
                        await apiAdminUpdateMeta(townId, key, input.value);
                        flashSuccess(btn);
                    } catch (err) { alert('Error: ' + err.message); }
                });
            });

            // Delete metadata
            contentEl.querySelectorAll('[data-action="del-meta"]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (!confirm(`Delete metadata key "${btn.dataset.key}"?`)) return;
                    try {
                        await apiAdminDeleteMeta(townId, btn.dataset.key);
                        renderTownDetail(townId, townName, userId, username);
                    } catch (err) { alert('Error: ' + err.message); }
                });
            });

            // Add metadata
            contentEl.querySelector('#add-meta-btn')?.addEventListener('click', () => {
                showEditModal('Add Town Metadata', [
                    { key: 'key', label: 'Key', value: '' },
                    { key: 'value', label: 'Value', value: '', type: 'textarea' },
                ], async (data) => {
                    await apiAdminUpdateMeta(townId, data.key, data.value);
                    renderTownDetail(townId, townName, userId, username);
                });
            });

            // Character detail drill
            contentEl.querySelectorAll('.char-detail-link').forEach(el => {
                el.addEventListener('click', () => {
                    const charId = parseInt(el.dataset.charId);
                    const charName = el.dataset.charName;
                    breadcrumb.push({ type: 'character', label: charName, icon: '🧙', id: charId, loader: () => drillCharacter(userId, username, townId, townName, charId, charName) });
                    drillCharacter(userId, username, townId, townName, charId, charName);
                });
            });

            // Quick edit character
            contentEl.querySelectorAll('[data-action="edit-char"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const charId = parseInt(btn.dataset.charId);
                    const char = chars.find(c => c.id == charId);
                    if (!char) return;
                    showEditModal('Edit Character', [
                        { key: 'name', label: 'Name', value: char.name },
                        { key: 'race', label: 'Race', value: char.race },
                        { key: 'class', label: 'Class', value: char.class },
                        { key: 'level', label: 'Level', value: char.level, type: 'number' },
                        { key: 'hp', label: 'HP', value: char.hp, type: 'number' },
                        { key: 'status', label: 'Status', value: char.status, type: 'select', options: ['Alive', 'Dead', 'Missing', 'Departed', 'Unconscious'] },
                        { key: 'alignment', label: 'Alignment', value: char.alignment },
                        { key: 'role', label: 'Role', value: char.role },
                        { key: 'age', label: 'Age', value: char.age, type: 'number' },
                        { key: 'gender', label: 'Gender', value: char.gender },
                    ], async (data) => {
                        await apiAdminUpdateCharacter(charId, data);
                        renderTownDetail(townId, townName, userId, username);
                    });
                });
            });

            // Delete character
            contentEl.querySelectorAll('[data-action="del-char"]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (!confirm(`Delete character "${btn.dataset.name}"?`)) return;
                    try {
                        await apiAdminDeleteCharacter(parseInt(btn.dataset.charId));
                        renderTownDetail(townId, townName, userId, username);
                    } catch (err) { alert('Error: ' + err.message); }
                });
            });
        } catch (err) {
            contentEl.innerHTML = `<div class="admin-error">⚠️ ${err.message}</div>`;
        }
    }

    // ═══════════════════════════════════════
    // TOKEN USAGE TAB
    // ═══════════════════════════════════════
    async function renderUsage() {
        const data = await apiAdminTokenUsage();
        const usage = data.usage || [];
        if (!usage.length) {
            contentEl.innerHTML = '<div class="admin-empty">No token usage data yet.</div>';
            return;
        }

        const byMonth = {};
        usage.forEach(row => {
            if (!byMonth[row.year_month]) byMonth[row.year_month] = {};
            if (!byMonth[row.year_month][row.username]) byMonth[row.year_month][row.username] = [];
            byMonth[row.year_month][row.username].push(row);
        });

        let html = '<div class="admin-section-header"><h2>Token Usage by Month</h2></div>';
        for (const [month, users] of Object.entries(byMonth)) {
            let totalMonthTokens = 0;
            let totalMonthCalls = 0;
            let usersHtml = '';

            const FEATURE_MAP = {
                'SIM_STORY': 'Story Simulation',
                'SIM_STRUCTURED': 'Structured Data Extraction',
                'SIM_SINGLE': 'Basic Town Simulation',
                'SIM_WORLD': 'World Simulation',
                'SIM_PLAN': 'Simulation Planning',
                'SIM_RUN': 'Simulation Execution',
                'LEVEL_UP': 'Level Up Wizard',
                'INTAKE_ROSTER': 'Town Population Intake',
                'INTAKE_FLESH': 'NPC Background Generation',
                'INTAKE_CUSTOM': 'Custom NPC Intake',
                'PORTRAIT': 'Character Portrait Generator',
                'WEATHER': 'Weather Simulation',
                'global': 'Legacy / Global Usage'
            };

            for (const [username, featureRows] of Object.entries(users)) {
                const userTokens = featureRows.reduce((sum, r) => sum + parseInt(r.tokens_used || 0), 0);
                const userCalls = featureRows.reduce((sum, r) => sum + parseInt(r.call_count || 0), 0);
                totalMonthTokens += userTokens;
                totalMonthCalls += userCalls;

                const usageByKey = {};
                featureRows.forEach(r => {
                    const key = r.feature_key || 'global';
                    usageByKey[key] = {
                        tokens: parseInt(r.tokens_used || 0),
                        calls: parseInt(r.call_count || 0)
                    };
                });

                let expandedRowsHtml = '';
                for (const [fKey, label] of Object.entries(FEATURE_MAP)) {
                    const used = usageByKey[fKey] || { tokens: 0, calls: 0 };
                    // Optionally hide global if it's 0 to keep the list purely feature-focused for new data
                    if (fKey === 'global' && used.tokens === 0) continue;
                    
                    expandedRowsHtml += `
                        <tr>
                            <td><span class="card-badge" style="display:inline-block; min-width: 220px;">${esc(label)}</span></td>
                            <td style="${used.tokens === 0 ? 'opacity:0.3;' : ''}">${formatTokens(used.tokens)}</td>
                            <td style="${used.calls === 0 ? 'opacity:0.3;' : ''}">${used.calls}</td>
                            <td style="${used.tokens === 0 ? 'opacity:0.3;' : ''}">$${estimateCost(used.tokens)}</td>
                        </tr>
                    `;
                }

                // Add any unexpected/future keys that aren't in our master list yet
                Object.keys(usageByKey).forEach(k => {
                    if (!FEATURE_MAP[k]) {
                        const used = usageByKey[k];
                        expandedRowsHtml += `
                            <tr>
                                <td><span class="card-badge" style="display:inline-block; min-width: 220px;">Unknown: ${esc(k)}</span></td>
                                <td>${formatTokens(used.tokens)}</td>
                                <td>${used.calls}</td>
                                <td>$${estimateCost(used.tokens)}</td>
                            </tr>
                        `;
                    }
                });


                usersHtml += `
                  <tr class="usage-user-row clickable" style="cursor: pointer;" title="Click to expand breakdown">
                    <td><strong>${esc(username)}</strong> <span style="font-size: 0.8em; opacity: 0.7; margin-left: 8px;">(Click to expand)</span></td>
                    <td>${formatTokens(userTokens)}</td>
                    <td>${userCalls}</td>
                    <td>$${estimateCost(userTokens)}</td>
                  </tr>
                  <tr class="usage-features-row" style="display: none; background: rgba(0,0,0,0.2);">
                    <td colspan="4" style="padding: 10px 40px; border-left: 3px solid var(--accent);">
                        <table class="admin-table compact" style="margin: 0; background: transparent;">
                            <thead><tr><th style="min-width: 220px;">Feature</th><th>Tokens</th><th>Calls</th><th>Est. Cost</th></tr></thead>
                            <tbody>
                                ${expandedRowsHtml}
                            </tbody>
                        </table>
                    </td>
                  </tr>
                `;
            }

            html += `
            <div class="usage-month-block">
              <div class="usage-month-header">
                <h3>📅 ${month}</h3>
                <span class="usage-month-total">${formatTokens(totalMonthTokens)} tokens · ${totalMonthCalls} calls · ~$${estimateCost(totalMonthTokens)}</span>
              </div>
              <table class="admin-table compact">
                <thead>
                  <tr><th>User</th><th>Total Tokens</th><th>Total Calls</th><th>Est. Cost</th></tr>
                </thead>
                <tbody>
                  ${usersHtml}
                </tbody>
              </table>
            </div>
            `;
        }
        contentEl.innerHTML = html;

        // Add event listeners for toggling
        contentEl.querySelectorAll('.usage-user-row').forEach(row => {
            row.addEventListener('click', () => {
                const featuresRow = row.nextElementSibling;
                if (featuresRow && featuresRow.classList.contains('usage-features-row')) {
                    featuresRow.style.display = featuresRow.style.display === 'none' ? 'table-row' : 'none';
                }
            });
        });
    }

    // ═══════════════════════════════════════
    // SITE SETTINGS TAB
    // ═══════════════════════════════════════
    async function renderSettings() {
        const data = await apiAdminSiteSettings();
        const settings = data.settings || [];
        contentEl.innerHTML = `
        <div class="admin-section-header">
            <h2>⚙️ Site Settings</h2>
            <button class="admin-btn admin-btn-primary" id="add-setting-btn">+ Add Setting</button>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table" id="settings-table">
            <thead><tr><th>Key</th><th>Value</th><th>Updated</th><th>Actions</th></tr></thead>
            <tbody>
              ${settings.map(s => `
              <tr data-key="${esc(s.key)}">
                <td class="setting-key">${esc(s.key)}</td>
                <td>
                    <input type="text" class="admin-inline-input" data-key="${esc(s.key)}" value="${esc(s.value || '')}" />
                </td>
                <td>${s.updated_at ? new Date(s.updated_at).toLocaleString() : '—'}</td>
                <td>
                    <button class="admin-btn admin-btn-small admin-btn-primary" data-action="save-setting" data-key="${esc(s.key)}">💾 Save</button>
                </td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        `;

        // Save setting
        contentEl.querySelectorAll('[data-action="save-setting"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const key = btn.dataset.key;
                const input = contentEl.querySelector(`input[data-key="${key}"]`);
                if (!input) return;
                try {
                    await apiAdminUpdateSiteSetting(key, input.value);
                    flashSuccess(btn);
                } catch (err) { alert('Error: ' + err.message); }
            });
        });

        // Add new setting
        contentEl.querySelector('#add-setting-btn')?.addEventListener('click', () => {
            showEditModal('Add Site Setting', [
                { key: 'key', label: 'Key', value: '' },
                { key: 'value', label: 'Value', value: '' },
            ], async (data) => {
                await apiAdminUpdateSiteSetting(data.key, data.value);
                renderSettings();
            });
        });
    }

    // ═══════════════════════════════════════
    // EDIT MODAL
    // ═══════════════════════════════════════
    function showEditModal(title, fields, onSave) {
        const overlay = document.createElement('div');
        overlay.className = 'admin-modal-overlay';
        overlay.innerHTML = `
        <div class="admin-modal">
            <div class="admin-modal-header">
                <h3>${title}</h3>
                <button class="admin-modal-close">✕</button>
            </div>
            <div class="admin-modal-body">
                ${fields.map(f => `
                <div class="admin-form-group">
                    <label>${f.label}</label>
                    ${f.type === 'textarea'
                        ? `<textarea class="admin-form-input" data-key="${f.key}" rows="4">${esc(f.value || '')}</textarea>`
                        : f.type === 'select'
                            ? `<select class="admin-form-input" data-key="${f.key}">
                                ${f.options.map(o => `<option value="${o}" ${f.value === o ? 'selected' : ''}>${o}</option>`).join('')}
                               </select>`
                            : `<input type="${f.type || 'text'}" class="admin-form-input" data-key="${f.key}" value="${esc(String(f.value ?? ''))}" />`
                    }
                </div>
                `).join('')}
            </div>
            <div class="admin-modal-footer">
                <button class="admin-btn" id="modal-cancel">Cancel</button>
                <button class="admin-btn admin-btn-primary" id="modal-save">💾 Save Changes</button>
            </div>
        </div>
        `;
        document.body.appendChild(overlay);

        // Close
        const close = () => overlay.remove();
        overlay.querySelector('.admin-modal-close').addEventListener('click', close);
        overlay.querySelector('#modal-cancel').addEventListener('click', close);
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

        // Save
        overlay.querySelector('#modal-save').addEventListener('click', async () => {
            const data = {};
            overlay.querySelectorAll('.admin-form-input').forEach(input => {
                const key = input.dataset.key;
                data[key] = input.tagName === 'TEXTAREA' ? input.value : input.value;
            });
            const saveBtn = overlay.querySelector('#modal-save');
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            try {
                await onSave(data);
                close();
            } catch (err) {
                alert('Error: ' + err.message);
                saveBtn.disabled = false;
                saveBtn.textContent = '💾 Save Changes';
            }
        });
    }

    // ═══════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════
    function formatTokens(n) {
        n = parseInt(n) || 0;
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return n.toString();
    }

    function estimateCost(tokens) {
        const avgPerMillion = 0.80;
        return ((parseInt(tokens) || 0) / 1000000 * avgPerMillion).toFixed(4);
    }

    function esc(str) {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    function kvRow(label, value) {
        return `<div class="kv-row"><span class="kv-label">${esc(label)}</span><span class="kv-value">${esc(value ?? '—')}</span></div>`;
    }

    function flashSuccess(el) {
        el.classList.add('flash-success');
        setTimeout(() => el.classList.remove('flash-success'), 1200);
    }

    // Load initial tab
    loadTab('overview');
}
