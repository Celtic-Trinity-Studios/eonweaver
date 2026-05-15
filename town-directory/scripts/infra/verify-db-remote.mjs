#!/usr/bin/env node
/**
 * INF-03 — Remote DB/schema check via api.php?action=infra_health (staging or prod).
 */
import {
  apiUrl,
  fetchJson,
  resolveBaseUrl,
  pass,
  fail,
  info,
  exitCode,
} from './lib.mjs';

console.log('INF-03 — DB / schema (remote)\n');

const base = resolveBaseUrl();
info(`Target: ${base}`);

let ok = true;

const { res, data } = await fetchJson(apiUrl(base, 'infra_health'));

if (data.error && String(data.error).includes('Unknown action')) {
  fail('infra_health not deployed yet — FTP api.php from latest main, then re-run');
  info('Fallback: checking ping_visit only (no schema probe until api is updated)');
  const ping = await fetchJson(apiUrl(base, 'ping_visit'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ route: 'infra-fallback' }),
  });
  if (ping.res.ok && ping.data.ok) pass('ping_visit OK (API up, schema not verified)');
  else {
    fail('ping_visit failed');
    ok = false;
  }
  info('Run setup_mysql.php on host if this is a fresh database.');
  exitCode(ok);
}

if (!res.ok) {
  fail(`infra_health HTTP ${res.status}`);
  exitCode(false);
}

if (!data.ok) {
  fail('infra_health returned ok:false');
  ok = false;
} else {
  pass('infra_health reachable');
}

if (data.db_connected) pass('MySQL connected');
else {
  fail('MySQL not connected (check config.php on server)');
  ok = false;
}

if (data.schema_ok) pass('Required tables present');
else {
  fail('Schema incomplete — run setup_mysql.php on the host');
  if (data.tables) {
    for (const [t, present] of Object.entries(data.tables)) {
      if (!present) fail(`  missing table: ${t}`);
    }
  }
  ok = false;
}

info('One-time host setup: setup_mysql.php?key=… (see AGENTS.md)');
exitCode(ok);
