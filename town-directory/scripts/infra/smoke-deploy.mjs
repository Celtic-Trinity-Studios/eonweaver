#!/usr/bin/env node
/**
 * INF-04 — Post-deploy smoke against staging/prod.
 *
 * Env (optional, gitignored .env.smoke):
 *   SMOKE_BASE_URL=https://worldscribe.online
 *   SMOKE_LOGIN=username_or_email
 *   SMOKE_PASSWORD=…
 *
 * Flags:
 *   --deep   After login, hit authenticated read APIs (subscription_catalog, get_campaigns).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  apiUrl,
  cookiesFromResponse,
  fetchJson,
  resolveBaseUrl,
  pass,
  fail,
  info,
  exitCode,
  ROOT,
} from './lib.mjs';
import { loadEnvFile } from './load-env-smoke.mjs';

loadEnvFile(path.join(ROOT, '.env.smoke'));

const deep = process.argv.includes('--deep');
const base = resolveBaseUrl();

console.log('INF-04 — Post-deploy smoke\n');
info(`Target: ${base}${deep ? ' (deep)' : ''}`);

let ok = true;

// 1) SPA shell
const indexRes = await fetch(`${base}/`);
if (indexRes.ok) {
  const html = await indexRes.text();
  if (html.includes('/dev/assets')) {
    fail('Homepage serves dev build paths (/dev/assets)');
    ok = false;
  } else if (/\/assets\/index-/.test(html)) {
    pass('Homepage loads with /assets/ bundles');
  } else {
    fail('Homepage missing Vite asset references');
    ok = false;
  }
} else {
  fail(`Homepage HTTP ${indexRes.status}`);
  ok = false;
}

// 2) API + DB
const health = await fetchJson(apiUrl(base, 'infra_health'));
if (health.data?.error && String(health.data.error).includes('Unknown action')) {
  info('infra_health not on server yet — deploy api.php, then re-run smoke');
} else if (health.res.ok && health.data.db_connected && health.data.schema_ok) {
  pass('API infra_health + schema OK');
} else if (health.res.ok && health.data.ok) {
  fail('infra_health reachable but schema incomplete');
  ok = false;
} else {
  fail('infra_health failed');
  ok = false;
}

// 3) Anonymous ping
const ping = await fetchJson(apiUrl(base, 'ping_visit'), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ route: 'smoke-deploy', referrer: 'infra-script' }),
});
if (ping.res.ok && ping.data.ok) pass('ping_visit OK');
else {
  fail('ping_visit failed');
  ok = false;
}

// 4) Optional authenticated path (login → read APIs)
const login = process.env.SMOKE_LOGIN || '';
const password = process.env.SMOKE_PASSWORD || '';

if (deep) {
  if (!login || !password) {
    fail('--deep requires SMOKE_LOGIN and SMOKE_PASSWORD in .env.smoke');
    ok = false;
  } else {
    const loginRes = await fetchJson(apiUrl(base, 'login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password }),
    });
    if (!loginRes.res.ok || !loginRes.data.ok) {
      fail(`login failed: ${loginRes.data.error || loginRes.text?.slice(0, 120)}`);
      ok = false;
    } else {
      pass('login OK');
      const cookie = cookiesFromResponse(loginRes.res);
      const headers = {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      };
      const me = await fetchJson(apiUrl(base, 'me'), { headers });
      if (me.data?.user) pass(`me OK (${me.data.user.username || 'user'})`);
      else {
        fail('me failed after login');
        ok = false;
      }
      const catalog = await fetchJson(apiUrl(base, 'subscription_catalog'), {
        method: 'POST',
        headers,
        body: '{}',
      });
      if (catalog.data?.tier_catalog?.length) pass('subscription_catalog OK');
      else {
        fail('subscription_catalog failed');
        ok = false;
      }
      const camps = await fetchJson(apiUrl(base, 'get_campaigns'), { headers });
      if (camps.data?.campaigns) pass('get_campaigns OK');
      else {
        fail('get_campaigns failed');
        ok = false;
      }
      info('Manual: open a town and run one Monthly Sim or Scribe call to finish full INF-04 QA.');
    }
  }
} else {
  info('Tip: copy .env.smoke.example → .env.smoke and run with --deep for login + API smoke.');
  info('Manual: login in browser → town → one sim or scribe (uses AI credits).');
}

exitCode(ok);
