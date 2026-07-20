#!/usr/bin/env node
/**
 * Remove stale hashed assets from production FTP (keeps only files referenced by live index.html).
 * Usage: node scripts/infra/cleanup_live_assets.mjs eonweaver
 */
import ftp from 'basic-ftp';
import fs from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');

function loadEnv(name) {
  const envPath = path.join(root, name === 'eonweaver' ? 'deploy.env.eonweaver' : 'deploy.env.worldscribe');
  if (!fs.existsSync(envPath)) throw new Error(`Missing ${envPath}`);
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[t.slice(0, i).trim()] = v;
  }
}

function keepFromIndexHtml(html) {
  const keep = new Set();
  for (const m of html.matchAll(/assets\/([A-Za-z0-9_.-]+)/g)) keep.add(m[1]);
  return keep;
}

const target = process.argv[2] || 'eonweaver';
loadEnv(target);

const localIndex = path.join(root, 'live', 'index.html');
if (!fs.existsSync(localIndex)) {
  console.error('Run npm run build first — missing live/index.html');
  process.exit(1);
}
const keep = keepFromIndexHtml(fs.readFileSync(localIndex, 'utf8'));
console.log('Keep assets:', [...keep].sort().join(', '));

const client = new ftp.Client();
client.ftp.verbose = true;
try {
  await client.access({
    host: process.env.EW_FTP_HOST,
    user: process.env.EW_FTP_USER,
    password: process.env.EW_FTP_PASS,
    secure: String(process.env.EW_FTP_SECURE || 'false').toLowerCase() === 'true',
  });
  await client.cd('assets');
  const remote = await client.list();
  for (const entry of remote) {
    if (entry.type !== 1) continue;
    if (keep.has(entry.name)) {
      console.log(`  keep ${entry.name}`);
      continue;
    }
    await client.remove(entry.name);
    console.log(`  deleted ${entry.name}`);
  }
  console.log('Asset cleanup done.');
} finally {
  client.close();
}
