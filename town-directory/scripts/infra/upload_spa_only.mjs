#!/usr/bin/env node
/**
 * Upload only built SPA files (live/) — avoids shipping local PHP WIP.
 * Usage: node scripts/infra/upload_spa_only.mjs eonweaver
 */
import ftp from 'basic-ftp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const townDir = path.resolve(__dirname, '../..');
const target = process.argv[2] || 'eonweaver';
const envFile = target === 'worldscribe' ? 'deploy.env.worldscribe' : 'deploy.env.eonweaver';

function loadDeployEnv(envName) {
  const envPath = path.join(townDir, envName);
  if (!fs.existsSync(envPath)) {
    console.error(`Missing ${envName}`);
    process.exit(1);
  }
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadDeployEnv(envFile);
if (envFile === 'deploy.env.eonweaver') {
  process.env.EW_ALLOW_EONWEAVER_DEPLOY = 'true';
}

const client = new ftp.Client();
try {
  await client.access({
    host: process.env.EW_FTP_HOST,
    user: process.env.EW_FTP_USER,
    password: process.env.EW_FTP_PASS,
    secure: String(process.env.EW_FTP_SECURE || 'false').toLowerCase() === 'true',
  });

  const isEonweaver = envFile === 'deploy.env.eonweaver';
  let remotePath = '';
  if (isEonweaver) {
    remotePath = (process.env.EW_FTP_EONWEAVER_REMOTE_PATH || '').trim().replace(/^\/+|\/+$/g, '');
    if (!remotePath && String(process.env.EW_USE_LEGACY_FTP_REMOTE_PATH || '').toLowerCase() === 'true') {
      remotePath = (process.env.EW_FTP_REMOTE_PATH || '').trim().replace(/^\/+|\/+$/g, '');
    }
  } else {
    remotePath = (process.env.EW_FTP_REMOTE_PATH || '').trim().replace(/^\/+|\/+$/g, '');
  }
  if (remotePath) {
    try {
      await client.cd(remotePath);
    } catch {
      await client.ensureDir(remotePath);
      await client.cd(remotePath);
    }
  }

  const siteRoot = await client.pwd();
  console.log(`SPA-only upload via ${envFile} → ${siteRoot}`);

  await client.ensureDir('assets');
  const assetsDir = path.join(townDir, 'live', 'assets');
  if (!fs.existsSync(assetsDir)) {
    console.error('Missing live/assets — run npm run build first.');
    process.exit(1);
  }
  const assetFiles = fs.readdirSync(assetsDir).filter((f) => fs.statSync(path.join(assetsDir, f)).isFile());
  for (const name of assetFiles) {
    await client.uploadFrom(path.join(assetsDir, name), name);
    console.log(`  OK: assets/${name}`);
  }

  await client.cd(siteRoot);
  await client.uploadFrom(path.join(townDir, 'live', 'index.html'), 'index.html');
  console.log('  OK: index.html');
  try {
    await client.uploadFrom(path.join(townDir, 'live', '.htaccess'), '.htaccess');
    console.log('  OK: .htaccess');
  } catch {
    /* optional */
  }
  console.log('SPA deploy complete');
} catch (err) {
  console.error(err);
  process.exit(1);
} finally {
  client.close();
}
