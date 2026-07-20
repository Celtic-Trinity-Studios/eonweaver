/**
 * One-off: POST a minimal bug-style payload to DISCORD_WEBHOOK_BUGS from discord.php.
 * Run from town-directory: node scripts/post_discord_bug_test.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const discordPhp = fs.readFileSync(path.join(__dirname, '..', 'discord.php'), 'utf8');
const m = discordPhp.match(
  /define\('DISCORD_WEBHOOK_BUGS',\s*'(https:\/\/discord\.com\/api\/webhooks\/\d+\/[^']+)'\)/
);
if (!m) {
  console.error('Could not find a real DISCORD_WEBHOOK_BUGS URL (numeric webhook id) in discord.php');
  process.exit(1);
}
const base = m[1];
const url = base + (base.includes('?') ? '&' : '?') + 'wait=true';

const tagMatch = discordPhp.match(
  /define\('DISCORD_BUG_FORUM_APPLIED_TAGS',\s*'([\d,]*)'\)/
);
const tagStr = tagMatch ? tagMatch[1].trim() : '';
const applied_tags =
  tagStr.length > 0
    ? tagStr.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;

const unMatch = discordPhp.match(/define\('DISCORD_BUG_WEBHOOK_USERNAME',\s*'([^']*)'\)/);
const webhookUsername = unMatch ? unMatch[1].trim() : 'Eon Weaver';
const avMatch = discordPhp.match(/define\('DISCORD_BUG_WEBHOOK_AVATAR_URL',\s*'([^']*)'\)/);
const webhookAvatarExplicit = avMatch ? avMatch[1].trim() : '';
const publicBase = (process.env.APP_PUBLIC_URL || 'https://eonweaver.com').replace(/\/$/, '');
const defaultSpiderPng = `${publicBase}/eon-weaver-spider.png`;
const webhookAvatar =
  webhookAvatarExplicit && webhookAvatarExplicit.startsWith('https://')
    ? webhookAvatarExplicit
    : defaultSpiderPng;

const title = 'Eon Weaver pipeline test (Cursor)';
const payload = {
  thread_name: `🐛 ${title}`.slice(0, 100),
  embeds: [
    {
      title: `🐛 ${title}`,
      color: 0x3498db,
      fields: [
        { name: '📝 Description', value: 'Single test post from `node scripts/post_discord_bug_test.mjs` to verify webhook + forum.', inline: false },
        { name: '⚠️ Severity', value: '🔵 Low', inline: true },
        { name: '👤 Reporter', value: 'cursor-test', inline: true },
        { name: '📍 Page/Feature', value: 'CLI', inline: true },
        { name: '🌐 Browser', value: 'node', inline: true },
      ],
      footer: { text: `Eon Weaver Bug Report • ${new Date().toISOString()}` },
      timestamp: new Date().toISOString(),
    },
  ],
};
if (webhookUsername) payload.username = webhookUsername.slice(0, 80);
payload.avatar_url = webhookAvatar.slice(0, 2048);
if (applied_tags?.length) payload.applied_tags = applied_tags;

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
const text = await res.text();
console.log('HTTP', res.status, text.slice(0, 500));
process.exit(res.ok ? 0 : 1);
