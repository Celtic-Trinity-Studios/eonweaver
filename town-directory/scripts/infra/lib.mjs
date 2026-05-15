/**
 * Shared helpers for Phase A infra scripts (INF-01 … INF-04).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '../..');

export function pass(msg) {
  console.log(`  ✓ ${msg}`);
}

export function fail(msg) {
  console.error(`  ✗ ${msg}`);
}

export function info(msg) {
  console.log(`  · ${msg}`);
}

export function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

export function fileExists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

export function resolveBaseUrl() {
  const fromEnv =
    process.env.SMOKE_BASE_URL ||
    process.env.APP_PUBLIC_URL ||
    'https://worldscribe.online';
  return String(fromEnv).replace(/\/$/, '');
}

export function apiUrl(base, action, query = {}) {
  const u = new URL(`${base.replace(/\/$/, '')}/api.php`);
  u.searchParams.set('action', action);
  for (const [k, v] of Object.entries(query)) {
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

export async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { ok: false, error: `Non-JSON (${res.status}): ${text.slice(0, 200)}` };
  }
  return { res, data, text };
}

/** Merge Set-Cookie headers for follow-up API calls (Node 18+). */
export function cookiesFromResponse(res) {
  if (typeof res.headers.getSetCookie === 'function') {
    return res.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ');
  }
  const single = res.headers.get('set-cookie');
  if (!single) return '';
  return single.split(',').map((c) => c.split(';')[0].trim()).join('; ');
}

export function exitCode(ok) {
  process.exit(ok ? 0 : 1);
}
