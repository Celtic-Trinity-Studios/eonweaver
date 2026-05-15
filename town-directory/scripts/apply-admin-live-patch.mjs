import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const viewPath = path.join(__dirname, '../src/views/AdminDashboardView.js');
const helpersPath = path.join(__dirname, 'admin-live-metrics-helpers.js');

let s = fs.readFileSync(viewPath, 'utf8');
if (s.includes('stopMetricsLiveRefresh')) {
    console.log('Already patched');
    process.exit(0);
}

const helpers = fs.readFileSync(helpersPath, 'utf8');

s = s.replace(
    'const METRICS_REFRESH_MS = 20000;',
    "import { createAdminSparkline, ADMIN_METRICS_REFRESH_MS } from '../utils/adminMetricsSparkline.js';"
);

s = s.replace(
    'let metricsLivePeriod = 30;',
    'let metricsLivePeriod = 30;\n    const sparkline = createAdminSparkline();'
);

const marker = '    async function loadTab(tab) {';
s = s.replace(marker, helpers + '\n' + marker);
s = s.replace(marker, '    async function loadTab(tab) {\n        stopMetricsLiveRefresh();');

fs.writeFileSync(viewPath, s);
console.log('Inserted helpers and loadTab guard');
