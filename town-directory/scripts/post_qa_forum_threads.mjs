/**
 * Create one Discord **forum post** per QA checklist section (same webhook as in-app bug reports).
 * Includes **parsed test procedures** from each section’s markdown table.
 *
 * From town-directory:
 *   node scripts/post_qa_forum_threads.mjs --dry-run
 *   node scripts/post_qa_forum_threads.mjs --purge-first   # bot deletes ALL threads in bug-reports forum, then seeds
 *   node scripts/post_qa_forum_threads.mjs
 *
 * --purge-first needs `town-directory/.env.discord` (DISCORD_TOKEN or DISCORD_BOT_TOKEN) and
 * DISCORD_GUILD_ID (or exactly one guild on the bot). Optional: DISCORD_BUG_FORUM_CHANNEL_ID (snowflake);
 * otherwise finds the forum channel named `bug-reports`.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');
const purgeFirst = process.argv.includes('--purge-first');

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

const MAX_FIELDS_PER_EMBED = 25;
const MAX_EMBEDS = 10;
const MAX_FIELD_VALUE = 1024;
const MAX_FIELD_NAME = 256;
const MAX_DESC = 4096;

function loadDiscordPhp() {
  const p = path.join(root, 'discord.php');
  if (!fs.existsSync(p)) return '';
  return fs.readFileSync(p, 'utf8');
}

function parseWebhookUrl(php) {
  const fromEnv = (process.env.DISCORD_WEBHOOK_BUGS || '').trim();
  if (fromEnv) return fromEnv;
  const m = php.match(
    /define\('DISCORD_WEBHOOK_BUGS',\s*'(https:\/\/discord\.com\/api\/webhooks\/\d+\/[^']+)'\)/
  );
  return m ? m[1] : '';
}

function parseAppliedTags(php) {
  const m = php.match(/define\('DISCORD_BUG_FORUM_APPLIED_TAGS',\s*'([\d,]*)'\)/);
  const tagStr = m ? m[1].trim() : '';
  if (!tagStr) return undefined;
  const ids = tagStr.split(',').map((s) => s.trim()).filter(Boolean);
  return ids.length ? ids : undefined;
}

function parseWebhookProfile(php) {
  const unMatch = php.match(/define\('DISCORD_BUG_WEBHOOK_USERNAME',\s*'([^']*)'\)/);
  const username = unMatch ? unMatch[1].trim() : 'Eon Weaver';
  const avMatch = php.match(/define\('DISCORD_BUG_WEBHOOK_AVATAR_URL',\s*'([^']*)'\)/);
  const explicit = avMatch ? avMatch[1].trim() : '';
  const publicBase = (process.env.APP_PUBLIC_URL || 'https://worldscribe.online').replace(/\/$/, '');
  const fallback = `${publicBase}/eon-weaver-spider.png`;
  const avatar_url =
    explicit && explicit.startsWith('https://') ? explicit.slice(0, 2048) : fallback;
  return { username: username.slice(0, 80), avatar_url };
}

function parseQaRows(md) {
  const marker = '**Section → forum post title (suggested) → ID prefixes**';
  const ix = md.indexOf(marker);
  if (ix < 0) throw new Error('Mapping table marker not found in QA_FEATURE_CHECKLIST.md');
  const after = md.slice(ix);
  const lines = after.split(/\r?\n/);
  const rows = [];
  let inTable = false;
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('| Suggested forum post title')) {
      inTable = true;
      continue;
    }
    if (!inTable) continue;
    if (!t.startsWith('|')) break;
    if (/^\|[\s-:|]+\|$/.test(t.replace(/\s/g, ''))) continue;
    const cells = t
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (cells.length < 3) continue;
    if (cells[0].toLowerCase().includes('suggested forum')) continue;
    const [postTitle, sectionInDoc, idPrefixes] = cells;
    rows.push({ postTitle, sectionInDoc, idPrefixes });
  }
  return rows;
}

/** Checklist ## sections in file order (skips How to use, Discord, Suggested run order). */
function extractChecklistSections(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let cur = null;
  const isSkipTitle = (t) =>
    /^How to use this checklist$/i.test(t) ||
    /^Discord:/i.test(t) ||
    /^Suggested run order/i.test(t);

  for (const line of lines) {
    const hm = line.match(/^## (.+)$/);
    if (hm) {
      const title = hm[1].trim();
      if (cur) out.push({ title: cur.title, body: cur.lines.join('\n') });
      if (isSkipTitle(title)) {
        cur = null;
        continue;
      }
      cur = { title, lines: [] };
      continue;
    }
    if (cur) cur.lines.push(line);
  }
  if (cur) out.push({ title: cur.title, body: cur.lines.join('\n') });
  return out;
}

function parseChecklistRows(sectionBody) {
  const rows = [];
  for (const line of sectionBody.split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith('|')) continue;
    if (/^\|\s*Done\s*\|/i.test(t)) continue;
    if (/^\|\s*\|\s*-+\s*\|/.test(t)) continue;
    if (/^\|[\s-|]+\|$/i.test(t)) continue;
    const cells = t.split('|').map((c) => c.trim()).filter((c) => c.length > 0);
    if (cells.length < 5) continue;
    const id = cells[1];
    if (id === 'ID' || /^-+$/.test(id)) continue;
    const feature = cells[2] ?? '';
    const surface = cells[3] ?? '';
    const procedure = cells[4] ?? '';
    const notes = cells[5] ?? '';
    rows.push({ id, feature, surface, procedure, notes });
  }
  return rows;
}

function fieldValue(r) {
  let val = `**${r.feature}**\n📍 ${r.surface}\n\n**Steps:** ${r.procedure}`;
  if (r.notes) val += `\n\n_Notes:_ ${r.notes}`;
  if (val.length > MAX_FIELD_VALUE) val = val.slice(0, MAX_FIELD_VALUE - 1) + '…';
  return val;
}

function buildEmbeds(postTitle, sectionInDoc, idPrefixes, checklistRows) {
  const intro = [
    `**Checklist area:** ${sectionInDoc}`,
    `**ID prefixes:** ${idPrefixes}`,
    '',
    '**How to comment:** Reply on this post; start with the checklist **ID** — short summary (e.g. **SIM-03** — …).',
    'Add environment (local / worldscribe.online / eonscribe.com), browser, screenshots when useful.',
    '',
    '---',
    '',
    '### Checklist & test procedures',
  ].join('\n');

  const fields = checklistRows.map((r) => ({
    name: r.id.slice(0, MAX_FIELD_NAME),
    value: fieldValue(r),
    inline: false,
  }));

  const embeds = [];
  if (fields.length === 0) {
    embeds.push({
      title: postTitle,
      description: (
        intro +
        '\n\n_(No checklist table rows were parsed — open `town-directory/QA_FEATURE_CHECKLIST.md` for this section.)'
      ).slice(0, MAX_DESC),
      color: 0xe67e22,
      footer: { text: 'Eon Weaver QA' },
      timestamp: new Date().toISOString(),
    });
    return embeds;
  }

  for (let i = 0; i < fields.length; i += MAX_FIELDS_PER_EMBED) {
    const chunk = fields.slice(i, i + MAX_FIELDS_PER_EMBED);
    const part = Math.floor(i / MAX_FIELDS_PER_EMBED) + 1;
    const totalParts = Math.ceil(fields.length / MAX_FIELDS_PER_EMBED);
    const isFirst = part === 1;
    let description = '';
    if (isFirst) {
      description = intro.slice(0, MAX_DESC);
    } else {
      description = `*Continued (${part}/${totalParts}) · ${postTitle}*`.slice(0, MAX_DESC);
    }
    embeds.push({
      title: isFirst ? postTitle : `${postTitle} · part ${part}`,
      description,
      color: 0x8e44ad,
      fields: chunk,
      footer: { text: `Eon Weaver QA · rows ${i + 1}–${i + chunk.length} of ${fields.length}` },
      timestamp: new Date().toISOString(),
    });
    if (embeds.length >= MAX_EMBEDS) break;
  }

  return embeds;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const API = 'https://discord.com/api/v10';

async function discordRest(method, path, token, body) {
  const headers = { Authorization: `Bot ${token}`, 'User-Agent': 'EonWeaverQAForum (Node)' };
  const opts = { method, headers };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(API + path, opts);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }
  return { ok: res.ok, status: res.status, data, text, retryAfter: res.headers.get('retry-after') };
}

async function discordRestWithRetry(method, path, token, body) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const out = await discordRest(method, path, token, body);
    if (out.ok || out.status !== 429) return out;
    const wait = Math.max(1, parseFloat(out.retryAfter || '2', 10)) * 1000;
    console.warn(`  Rate limited; waiting ${wait}ms`);
    await sleep(wait);
  }
  return discordRest(method, path, token, body);
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
    `Bot is in ${guilds.length} guilds. Set DISCORD_GUILD_ID in .env.discord or town-directory/config.php.`
  );
  return '';
}

const GUILD_FORUM_TYPE = 15;

async function resolveForumChannelId(token, guildId) {
  let cid = (process.env.DISCORD_BUG_FORUM_CHANNEL_ID || '').replace(/\D/g, '');
  if (cid) return cid;
  const out = await discordRestWithRetry('GET', `/guilds/${guildId}/channels`, token);
  if (!out.ok || !Array.isArray(out.data)) return '';
  const channels = out.data;
  const forum =
    channels.find((c) => c.type === GUILD_FORUM_TYPE && c.name === 'bug-reports') ||
    channels.find((c) => c.type === GUILD_FORUM_TYPE && /bug[-_]?reports?/i.test(c.name || ''));
  return forum ? String(forum.id) : '';
}

async function collectArchivedIntoSet(token, forumChannelId, kind, toDelete) {
  let before = '';
  for (let page = 0; page < 80; page++) {
    const path =
      kind === 'public'
        ? `/channels/${forumChannelId}/threads/archived/public?limit=100${before ? `&before=${before}` : ''}`
        : `/channels/${forumChannelId}/threads/archived/private?limit=100${before ? `&before=${before}` : ''}`;
    const out = await discordRestWithRetry('GET', path, token);
    if (!out.ok) {
      if (out.status === 403 || out.status === 404) return;
      break;
    }
    const threads = out.data?.threads || [];
    for (const t of threads) toDelete.add(t.id);
    if (!out.data?.has_more || threads.length === 0) break;
    before = String(threads[threads.length - 1].id);
  }
}

async function purgeBugForumThreads(token, guildId, forumChannelId, dry) {
  const toDelete = new Set();
  const active = await discordRestWithRetry('GET', `/guilds/${guildId}/threads/active`, token);
  if (active.ok && Array.isArray(active.data?.threads)) {
    for (const t of active.data.threads) {
      if (String(t.parent_id) === String(forumChannelId)) toDelete.add(t.id);
    }
  } else if (!active.ok) {
    console.warn(`Active threads list HTTP ${active.status} ${active.text?.slice(0, 200)}`);
  }

  await collectArchivedIntoSet(token, forumChannelId, 'public', toDelete);
  await collectArchivedIntoSet(token, forumChannelId, 'private', toDelete);

  console.log(`Purge: ${toDelete.size} thread(s) in forum channel ${forumChannelId}`);

  if (dry) {
    for (const id of toDelete) console.log(`  [dry-run] would DELETE /channels/${id}`);
    return 0;
  }

  let delFail = 0;
  for (const id of toDelete) {
    const d = await discordRestWithRetry('DELETE', `/channels/${id}`, token);
    if (!d.ok) {
      delFail++;
      console.error(`  DELETE ${id} HTTP ${d.status} ${d.text?.slice(0, 200)}`);
    }
    await sleep(450);
  }
  console.log(`Purge finished (${toDelete.size} attempted, ${delFail} failed).`);
  return delFail;
}

async function runPurgeIfRequested() {
  if (!purgeFirst) return 0;
  const token =
    (process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN || '').trim() ||
    parseConfigDefine(loadConfigPhp(), 'DISCORD_BOT_TOKEN');
  if (!token) {
    console.error(
      'Missing bot token for --purge-first. Set DISCORD_BOT_TOKEN or DISCORD_TOKEN in .env.discord (or config.php).'
    );
    process.exit(1);
  }
  const guildId = await resolveGuildId(token);
  if (!guildId) process.exit(1);
  const forumId = await resolveForumChannelId(token, guildId);
  if (!forumId) {
    console.error(
      'Could not resolve bug forum channel. Set DISCORD_BUG_FORUM_CHANNEL_ID in .env.discord or name the channel bug-reports.'
    );
    process.exit(1);
  }
  console.log(`Guild ${guildId} · Forum ${forumId}`);
  const purgeDry = dryRun;
  if (purgeDry) {
    console.log('[dry-run] Listing threads to purge (no deletes). Run without --dry-run to delete.');
  }
  return purgeBugForumThreads(token, guildId, forumId, purgeDry);
}

async function main() {
  if (purgeFirst) {
    await runPurgeIfRequested();
    if (!dryRun) await sleep(2000);
  }

  const php = loadDiscordPhp();
  const webhookBase = parseWebhookUrl(php);
  if (!webhookBase) {
    console.error('Set DISCORD_WEBHOOK_BUGS or ensure town-directory/discord.php defines DISCORD_WEBHOOK_BUGS.');
    process.exit(1);
  }
  const url = webhookBase + (webhookBase.includes('?') ? '&' : '?') + 'wait=true';
  const applied_tags = parseAppliedTags(php);
  const { username, avatar_url } = parseWebhookProfile(php);

  const qaPath = path.join(root, 'QA_FEATURE_CHECKLIST.md');
  const md = fs.readFileSync(qaPath, 'utf8');
  const rows = parseQaRows(md);
  const sections = extractChecklistSections(md);

  if (sections.length !== rows.length) {
    console.warn(
      `Warning: mapping has ${rows.length} rows but parsed ${sections.length} checklist sections (order must match). Zipping to min length.`
    );
  }
  const n = Math.min(rows.length, sections.length);

  for (let j = 0; j < sections.length; j++) {
    const chk = parseChecklistRows(sections[j].body);
    if (chk.length === 0 && j < n) {
      console.warn(`Warning: no table rows for section ${j + 1}: ${sections[j].title}`);
    }
  }

  console.log(`Mapping: ${rows.length} rows · Parsed sections: ${sections.length} · Posting: ${n} · dryRun=${dryRun}`);

  let ok = 0;
  let fail = 0;
  for (let i = 0; i < n; i++) {
    const { postTitle, sectionInDoc, idPrefixes } = rows[i];
    const checklistRows = parseChecklistRows(sections[i].body);
    const thread_name = `📋 ${postTitle}`.replace(/\s+/g, ' ').trim().slice(0, 100);
    const embeds = buildEmbeds(postTitle, sectionInDoc, idPrefixes, checklistRows);

    const payload = {
      thread_name,
      username,
      avatar_url,
      embeds,
    };
    if (applied_tags?.length) payload.applied_tags = applied_tags;

    if (dryRun) {
      console.log(
        `[dry-run] ${i + 1}/${n}: ${thread_name} · ${checklistRows.length} checklist row(s) · ${embeds.length} embed(s)`
      );
      ok++;
      continue;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (res.ok) {
      ok++;
      console.log(`OK ${i + 1}/${n}: ${thread_name} (${checklistRows.length} rows)`);
    } else {
      fail++;
      console.error(`FAIL ${i + 1}/${n}: ${thread_name} HTTP ${res.status} ${text.slice(0, 500)}`);
    }
    if (i < n - 1) await sleep(1600);
  }

  console.log(`Done. ok=${ok} fail=${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

await main().catch((e) => {
  console.error(e);
  process.exit(1);
});
