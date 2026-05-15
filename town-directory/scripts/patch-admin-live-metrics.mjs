import fs from 'fs';

const path = new URL('../src/views/AdminDashboardView.js', import.meta.url);
let s = fs.readFileSync(path, 'utf8');

if (s.includes('stopMetricsLiveRefresh')) {
    console.log('Already patched');
    process.exit(0);
}

if (!s.includes('const METRICS_REFRESH_MS = 20000;')) {
    console.error('Expected METRICS_REFRESH_MS constant');
    process.exit(1);
}

s = s.replace(
    "const METRICS_REFRESH_MS = 20000;",
    "import { createAdminSparkline, ADMIN_METRICS_REFRESH_MS } from '../utils/adminMetricsSparkline.js';"
);

s = s.replace(
    'let metricsLivePeriod = 30;',
    'let metricsLivePeriod = 30;\n    const sparkline = createAdminSparkline();'
);

const marker = '    async function loadTab(tab) {';
const helpers = fs.readFileSync(new URL('./patch-admin-live-metrics-insert.js', import.meta.url), 'utf8');

s = s.replace(marker, helpers + marker);
s = s.replace(
    '    async function loadTab(tab) {',
    '    async function loadTab(tab) {\n        stopMetricsLiveRefresh();'
);

// renderOverview
s = s.replace(
    `    async function renderOverview() {
        const data = await apiAdminOverview();
        contentEl.innerHTML = \`
        <div class="admin-stats-grid">
          \${statCard('👥', data.total_users, 'Registered Users')}
          \${statCard('📜', data.total_campaigns, 'Total Campaigns')}
          \${statCard('🏰', data.total_towns, 'Total Towns')}
          \${statCard('🧙', data.total_characters, 'Total Characters')}
          \${statCard('🧠', formatTokens(data.monthly_tokens), 'Tokens This Month')}
          \${statCard('📡', data.monthly_calls, 'AI Calls This Month')}
          \${statCard('🟢', data.active_users, \`Active Users (\${data.month})\`)}
          \${statCard('💰', formatMonthlyCostCard(data.monthly_cost_usd, data.monthly_tokens), monthlyCostLabel(data.monthly_cost_usd, data.monthly_tokens))}
        </div>
        \`;
    }`,
    `    async function renderOverview(period = 30) {
        const [data, metrics] = await Promise.all([
            apiAdminOverview(),
            apiAdminMetrics(period),
        ]);
        contentEl.innerHTML = \`
        <motion.div class="admin-stats-grid">
          \${statCard('👥', data.total_users, 'Registered Users', 'total_users')}
          \${statCard('📜', data.total_campaigns, 'Total Campaigns', 'total_campaigns')}
          \${statCard('🏰', data.total_towns, 'Total Towns', 'total_towns')}
          \${statCard('🧙', data.total_characters, 'Total Characters', 'total_characters')}
          \${statCard('🧠', formatTokens(data.monthly_tokens), 'Tokens This Month', 'monthly_tokens')}
          \${statCard('📡', data.monthly_calls, 'AI Calls This Month', 'monthly_calls')}
          \${statCard('🟢', data.active_users, \`Active Users (\${data.month})\`, 'active_users')}
          \${statCard('💰', formatMonthlyCostCard(data.monthly_cost_usd, data.monthly_tokens), monthlyCostLabel(data.monthly_cost_usd, data.monthly_tokens), 'monthly_cost')}
        </div>
        \${metricsLiveToolbarHtml(period, { compact: true })}
        <div class="metrics-grid metrics-grid-overview">
          \${primaryChartsHtml(metrics)}
        </div>
        \`;
        wireMetricsWindowButtons();
        setMetricsLiveBadge();
        startMetricsLiveRefresh(period, 'overview');
    }`
);

console.log('Patched overview - manual follow-up may be needed for statCard and metrics tab');
fs.writeFileSync(path, s);
