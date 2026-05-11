/**
 * Set the **bot application avatar** (same image as the server icon by default).
 *
 * PATCH https://discord.com/api/v10/users/@me — requires `DISCORD_TOKEN` or `DISCORD_BOT_TOKEN`
 * (the bot token from the Developer Portal).
 *
 * Default image: `public/eon-weaver-discord-server-icon.jpg` (1024×1024 JPEG via sharp).
 *
 *   node scripts/set_discord_bot_avatar.mjs --dry-run
 *   node scripts/set_discord_bot_avatar.mjs
 *   node scripts/set_discord_bot_avatar.mjs path/to/other.jpg
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

loadDiscordEnv();

const API = 'https://discord.com/api/v10';
const dryRun = process.argv.includes('--dry-run');
const argPath = process.argv.find((a) => a.endsWith('.png') || a.endsWith('.jpg') || a.endsWith('.jpeg'));
const defaultJpg = path.join(root, 'public', 'eon-weaver-discord-server-icon.jpg');
const defaultPng = path.join(root, 'public', 'eon-weaver-discord-server-icon.png');
const defaultAsset = fs.existsSync(defaultJpg) ? defaultJpg : defaultPng;
const imagePath = path.resolve(root, argPath || defaultAsset);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function discordRest(method, pathUrl, token, body) {
  const headers = { Authorization: `Bot ${token}`, 'User-Agent': 'EonWeaverBotAvatar (Node)' };
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
  const avatar = `data:${mime};base64,${buf1024.toString('base64')}`;
  const token = (process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN || '').trim();
  if (!token) {
    console.error('Set DISCORD_BOT_TOKEN or DISCORD_TOKEN in town-directory/.env.discord');
    process.exit(1);
  }

  console.log(`Bot @me avatar · source ${path.relative(root, imagePath)} · payload ~${Math.round(avatar.length / 1024)} KiB`);

  if (dryRun) {
    console.log('--dry-run: skipping PATCH /users/@me');
    return;
  }

  const out = await discordRestWithRetry('PATCH', '/users/@me', token, { avatar });
  if (!out.ok) {
    console.error(`Discord API ${out.status}:`, out.data || out.text);
    process.exit(1);
  }

  console.log('Bot avatar updated.', out.data?.avatar ? `avatar hash: ${out.data.avatar}` : '');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
