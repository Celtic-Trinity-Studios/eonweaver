/**
 * Eon Weaver — Admin Dashboard View
 * System overview, member management, and token usage for admin users.
 */
import { apiAdminOverview, apiAdminMembers, apiAdminTokenUsage } from '../api/admin.js';

export default function AdminDashboardView(container) {
    container.innerHTML = `
    <div class="admin-dashboard">
      <div class="admin-header">
        <h1 class="admin-title">🛡️ Admin Dashboard</h1>
        <p class="admin-subtitle">Eon Weaver — System Management</p>
      </div>

      <div class="admin-tabs">
        <button class="admin-tab active" data-tab="overview">📊 Overview</button>
        <button class="admin-tab" data-tab="members">👥 Members</button>
        <button class="admin-tab" data-tab="usage">📈 Token Usage</button>
      </div>

      <div class="admin-content" id="admin-content">
        <div class="admin-loading">Loading...</div>
      </div>
    </div>
    `;

    // Tab switching
    let activeTab = 'overview';
    container.querySelectorAll('.admin-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTab = btn.dataset.tab;
            loadTab(activeTab);
        });
    });

    const contentEl = container.querySelector('#admin-content');

    async function loadTab(tab) {
        contentEl.innerHTML = '<div class="admin-loading">Loading...</div>';
        try {
            if (tab === 'overview') await renderOverview();
            else if (tab === 'members') await renderMembers();
            else if (tab === 'usage') await renderUsage();
        } catch (err) {
            contentEl.innerHTML = `<div class="admin-error">Error: ${err.message}</div>`;
        }
    }

    async function renderOverview() {
        const data = await apiAdminOverview();
        contentEl.innerHTML = `
        <div class="admin-stats-grid">
          <div class="admin-stat-card">
            <div class="stat-icon">👥</div>
            <div class="stat-value">${data.total_users}</div>
            <div class="stat-label">Registered Users</div>
          </div>
          <div class="admin-stat-card">
            <div class="stat-icon">🏰</div>
            <div class="stat-value">${data.total_towns}</div>
            <div class="stat-label">Total Towns</div>
          </div>
          <div class="admin-stat-card">
            <div class="stat-icon">🧠</div>
            <div class="stat-value">${formatTokens(data.monthly_tokens)}</div>
            <div class="stat-label">Tokens This Month</div>
          </div>
          <div class="admin-stat-card">
            <div class="stat-icon">📡</div>
            <div class="stat-value">${data.monthly_calls}</div>
            <div class="stat-label">AI Calls This Month</div>
          </div>
          <div class="admin-stat-card">
            <div class="stat-icon">🟢</div>
            <div class="stat-value">${data.active_users}</div>
            <div class="stat-label">Active Users (${data.month})</div>
          </div>
          <div class="admin-stat-card">
            <div class="stat-icon">💰</div>
            <div class="stat-value">$${estimateCost(data.monthly_tokens)}</div>
            <div class="stat-label">Est. Cost This Month</div>
          </div>
        </div>
        `;
    }

    async function renderMembers() {
        const data = await apiAdminMembers();
        const members = data.members || [];
        if (!members.length) {
            contentEl.innerHTML = '<div class="admin-empty">No members yet.</div>';
            return;
        }
        contentEl.innerHTML = `
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Tier</th>
                <th>Campaigns</th>
                <th>Tokens (Month)</th>
                <th>AI Calls</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              ${members.map(m => `
              <tr>
                <td class="member-name">${m.username}</td>
                <td class="member-email">${m.email}</td>
                <td><span class="tier-badge tier-${m.subscription_tier}">${m.subscription_tier}</span></td>
                <td>${m.campaign_count}</td>
                <td>${formatTokens(m.tokens_this_month)}</td>
                <td>${m.calls_this_month}</td>
                <td>${new Date(m.created_at).toLocaleDateString()}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        `;
    }

    async function renderUsage() {
        const data = await apiAdminTokenUsage();
        const usage = data.usage || [];
        if (!usage.length) {
            contentEl.innerHTML = '<div class="admin-empty">No token usage data yet.</div>';
            return;
        }

        // Group by month
        const byMonth = {};
        usage.forEach(row => {
            if (!byMonth[row.year_month]) byMonth[row.year_month] = [];
            byMonth[row.year_month].push(row);
        });

        let html = '';
        for (const [month, rows] of Object.entries(byMonth)) {
            const totalTokens = rows.reduce((s, r) => s + parseInt(r.tokens_used || 0), 0);
            const totalCalls = rows.reduce((s, r) => s + parseInt(r.call_count || 0), 0);
            html += `
            <div class="usage-month-block">
              <div class="usage-month-header">
                <h3>📅 ${month}</h3>
                <span class="usage-month-total">${formatTokens(totalTokens)} tokens · ${totalCalls} calls · ~$${estimateCost(totalTokens)}</span>
              </div>
              <table class="admin-table compact">
                <thead>
                  <tr><th>User</th><th>Tokens</th><th>Calls</th><th>Est. Cost</th></tr>
                </thead>
                <tbody>
                  ${rows.map(r => `
                  <tr>
                    <td>${r.username}</td>
                    <td>${formatTokens(r.tokens_used)}</td>
                    <td>${r.call_count}</td>
                    <td>$${estimateCost(r.tokens_used)}</td>
                  </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            `;
        }
        contentEl.innerHTML = html;
    }

    function formatTokens(n) {
        n = parseInt(n) || 0;
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return n.toString();
    }

    function estimateCost(tokens) {
        // Rough estimate: blend of Flash ($0.30/M input, $2.50/M output) + Lite ($0.10/M, $0.40/M)
        // Assume ~70% input, 30% output, ~60% cheap/40% smart
        const avgPerMillion = 0.80; // blended est
        return ((parseInt(tokens) || 0) / 1000000 * avgPerMillion).toFixed(4);
    }

    // Load initial tab
    loadTab('overview');
}
