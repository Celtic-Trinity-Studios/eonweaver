/**
 * Set the Discord **server icon** via API (PATCH /guilds/:id).
 *
 * Requires `town-directory/.env.discord` with DISCORD_TOKEN or DISCORD_BOT_TOKEN.
 * Bot must have **Manage Server** (MANAGE_GUILD) on the target guild.
 *
 * Default image: `public/eon-weaver-discord-server-icon.jpg` (or `.png` if present; resized to 1024×1024).
 *
 *   node scripts/set_discord_guild_icon.mjs --dry-run
 *   node scripts/set_discord_guild_icon.mjs
 *   node scripts/set_discord_guild_icon.mjs path/to/other.png
 *   node scripts/set_discord_guild_icon.mjs --write-asset   # overwrite default JPEG with 1024² cover crop
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function readUtf8FileStripBom(filePath) {
  const buf = fs.readFileSync(filePath);
  let i = 0;
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) i = 3;
  let s = buf.subarray(i).toString('utf8');
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  return s;
}

function loadDiscordEnv() {
  const envPath = path.join(root, '.env.discord');
  if (!fs.existsSync(envPath)) return;
  const parsed = dotenv.parse(readUtf8FileStripBom(envPath));
  for (const [k, v] of Object.entries(parsed)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

function loadConfigPhp() {
  const p = path.join(root, 'config.php');
  if (!fs.existsSync(p)) return '';
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

function parseConfigDefine(php, name) {
  const m = php.match(new RegExp(`define\\('${name}',\\s*'([^']*)'\\)`));
  return m ? m[1].trim() : '';
}

loadDiscordEnv();

const API = 'https://discord.com/api/v10';
const dryRun = process.argv.includes('--dry-run');
const writeAsset = process.argv.includes('--write-asset');
const argPath = process.argv.find((a) => a.endsWith('.png') || a.endsWith('.jpg') || a.endsWith('.jpeg'));
const defaultJpg = path.join(root, 'public', 'eon-weaver-discord-server-icon.jpg');
const defaultPng = path.join(root, 'public', 'eon-weaver-discord-server-icon.png');
const defaultAsset = fs.existsSync(defaultJpg) ? defaultJpg : defaultPng;
const imagePath = path.resolve(root, argPath || defaultAsset);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function discordRest(method, pathUrl, token, body) {
  const headers = { Authorization: `Bot ${token}`, 'User-Agent': 'EonWeaverGuildIcon (Node)' };
  const opts = { method, headers };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(API + pathUrl, opts);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }
  return { ok: res.ok, status: res.status, data, text, retryAfter: res.headers.get('retry-after') };
}

async function discordRestWithRetry(method, pathUrl, token, body) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const out = await discordRest(method, pathUrl, token, body);
    if (out.ok || out.status !== 429) return out;
    const wait = Math.max(1, parseFloat(out.retryAfter || '2', 10)) * 1000;
    console.warn(`  Rate limited; waiting ${wait}ms`);
    await sleep(wait);
  }
  return discordRest(method, pathUrl, token, body);
}

async function resolveGuildId(token) {
  let gid = (process.env.DISCORD_GUILD_ID || '').replace(/\D/g, '');
  if (gid) return gid;
  gid = parseConfigDefine(loadConfigPhp(), 'DISCORD_GUILD_ID').replace(/\D/g, '');
  if (gid) return gid;
  const out = await discordRestWithRetry('GET', '/users/@me/guilds', token);
  if (!out.ok || !Array.isArray(out.data)) return '';
  const guilds = out.data;
  if (guilds.length === 1) return String(guilds[0].id);
  console.error(
    `Bot is in ${guilds.length} guilds. Set DISCORD_GUILD_ID in .env.discord or config.php.`
  );
  return '';
}

async function main() {
  if (!fs.existsSync(imagePath)) {
    console.error(`Missing image: ${imagePath}`);
    process.exit(1);
  }

  const buf1024 = await sharp(imagePath)
    .resize(1024, 1024, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  const mime = 'image/jpeg';
  if (writeAsset && !dryRun && !argPath) {
    fs.writeFileSync(defaultJpg, buf1024);
    console.log(`Wrote normalized 1024×1024 JPEG → ${defaultJpg}`);
  } else if (writeAsset && dryRun) {
    console.log('(--write-asset skipped with --dry-run)');
  } else if (writeAsset && argPath) {
    console.error('--write-asset only applies when using the default icon path (omit custom path).');
    process.exit(1);
  }

  const icon = `data:${mime};base64,${buf1024.toString('base64')}`;
  const token = (process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN || '').trim();
  if (!token) {
    console.error('Set DISCORD_BOT_TOKEN or DISCORD_TOKEN in town-directory/.env.discord');
    process.exit(1);
  }

  const guildId = await resolveGuildId(token);
  if (!guildId) process.exit(1);

  console.log(`Guild ${guildId} · source ${path.relative(root, imagePath)} · payload ~${Math.round(icon.length / 1024)} KiB`);

  if (dryRun) {
    console.log('--dry-run: skipping PATCH');
    return;
  }

  const out = await discordRestWithRetry('PATCH', `/guilds/${guildId}`, token, { icon });
  if (!out.ok) {
    console.error(`Discord API ${out.status}:`, out.data || out.text);
    if (out.status === 403) {
      console.error('Grant this bot **Manage Server** (MANAGE_GUILD) in Server Settings → Integrations → your bot → Permissions.');
    }
    process.exit(1);
  }

  console.log('Server icon updated.', out.data?.icon ? `icon hash: ${out.data.icon}` : '');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
