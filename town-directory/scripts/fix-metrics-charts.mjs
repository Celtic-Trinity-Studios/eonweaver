import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/views/AdminDashboardView.js');
let s = fs.readFileSync(file, 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';
const t = 'div';

const charts = [
    ['visitors', 'Daily unique visitors', "m.daily_visitors, '#60a5fa'"],
    ['signups', 'Daily signups', "m.daily_signups, '#34d399'"],
    ['tokens', 'Daily AI tokens burned', "m.daily_tokens, '#f59e0b', 'tokens'"],
    ['cost_usd', 'Daily OpenRouter cost (USD)', "m.daily_cost_usd || [], '#22c55e', 'usd'"],
];

let chartPatches = 0;
for (const [key, title, sparkRest] of charts) {
    const oldCard = [
        `            <${t} class="metric-card metric-card-wide">`,
        `              <${t} class="metric-title">${title}</${t}>`,
        `              \${sparkline(${sparkRest})}`,
        `            </${t}>`,
    ].join(nl);
    if (!s.includes(oldCard)) continue;
    const newCard = [
        `            <${t} class="metric-card metric-card-wide" data-metric-chart="${key}">`,
        `              <${t} class="metric-title">${title}</${t}>`,
        `              <${t} class="metric-chart-body">\${sparkline(${sparkRest})}</${t}>`,
        `            </${t}>`,
    ].join(nl);
    s = s.replace(oldCard, newCard);
    chartPatches++;
}

const footerOld = [
    '        contentEl.querySelectorAll(\'.metrics-window-btn\').forEach(btn => {',
    '            btn.addEventListener(\'click\', () => renderMetrics(parseInt(btn.dataset.period, 10) || 30));',
    '        });',
    '    }',
    '',
    '    function statCard(icon, value, label) {',
    '        return `',
    '        <div class="admin-stat-card">',
    '          <div class="stat-icon">${icon}</motion.div>',
    '          <div class="stat-value">${value}</div>',
    '          <div class="stat-label">${label}</div>',
    '        </div>`;',
    '    }',
].join(nl).replace(/motion\.div/g, 'div');

const footerNew = [
    '        wireMetricsWindowButtons();',
    '        setMetricsLiveBadge();',
    "        startMetricsLiveRefresh(period, 'metrics');",
    '    }',
    '',
    "    function statCard(icon, value, label, dataKey = '') {",
    "        const attr = dataKey ? ` data-stat=\"${dataKey}\"` : '';",
    '        return `',
    '        <motion.div class="admin-stat-card"${attr}>',
    '          <div class="stat-icon">${icon}</div>',
    '          <div class="stat-value">${value}</div>',
    '          <div class="stat-label">${label}</motion.div>',
    '        </div>`;',
    '    }',
].join(nl).replace(/motion\.div/g, 'div');

let footerPatched = false;
if (s.includes("startMetricsLiveRefresh(period, 'metrics')")) {
    footerPatched = true;
} else if (s.includes(footerOld)) {
    s = s.replace(footerOld, footerNew);
    footerPatched = true;
}

const cleanupOld = `    loadTab('overview');${nl}}`;
const cleanupNew = `    loadTab('overview');${nl}${nl}    return () => {${nl}        stopMetricsLiveRefresh();${nl}    };${nl}}`;
let cleanupPatched = false;
if (s.includes('return () => {') && s.includes('stopMetricsLiveRefresh();')) {
    cleanupPatched = true;
} else if (s.includes(cleanupOld)) {
    s = s.replace(cleanupOld, cleanupNew);
    cleanupPatched = true;
}

fs.writeFileSync(file, s);
console.log({ chartPatches, footerPatched, cleanupPatched });
