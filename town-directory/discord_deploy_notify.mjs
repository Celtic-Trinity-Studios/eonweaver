/**
 * Post deploy announcements to Discord from your **local** machine (runs after FTP).
 * Uses `town-directory/.env.discord` — same bot token as other tooling. Does **not** call PHP on any host.
 *
 * Usage:
 *   node discord_deploy_notify.mjs path/to/payload.json
 *
 * Payload JSON (same fields the old API expected):
 *   deploy_notify: "live" | "dev"
 *   deploy_edition: "both" | "3.5e" | "5e" | … (dev only)
 *   environment, description, deploy_target, app_editions, dev_site_hint?, changes?: string[]
 *
 * .env.discord:
 *   DISCORD_TOKEN=…
 *   DISCORD_DEPLOY_CHANNEL_LIVE=…
 *   DISCORD_DEPLOY_CHANNEL_DEV_35E=…
 *   DISCORD_DEPLOY_CHANNEL_DEV_5E=…
 *   DISCORD_DEPLOY_CHANNEL_DEV=… (optional fallback)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** UTF-8 text files from Windows PowerShell `Set-Content -Encoding UTF8` start with EF BB BF — strip so JSON.parse / dotenv work. */
function readUtf8FileStripBom(filePath) {
    const buf = fs.readFileSync(filePath);
    let i = 0;
    if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
        i = 3;
    }
    let s = buf.subarray(i).toString('utf8');
    if (s.charCodeAt(0) === 0xfeff) {
        s = s.slice(1);
    }
    return s;
}

(function loadEnvDiscord() {
    const envPath = path.join(__dirname, '.env.discord');
    if (!fs.existsSync(envPath)) {
        return;
    }
    const raw = readUtf8FileStripBom(envPath);
    const parsed = dotenv.parse(raw);
    for (const [key, val] of Object.entries(parsed)) {
        if (process.env[key] === undefined) {
            process.env[key] = val;
        }
    }
})();

const TOKEN = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN || '';
const C35 = (process.env.DISCORD_DEPLOY_CHANNEL_DEV_35E || '').trim();
const C5 = (process.env.DISCORD_DEPLOY_CHANNEL_DEV_5E || '').trim();
const CDEV = (process.env.DISCORD_DEPLOY_CHANNEL_DEV || '').trim();
const CLIVE = (process.env.DISCORD_DEPLOY_CHANNEL_LIVE || '').trim();

function onlyDigits(s) {
    return String(s || '').replace(/\D/g, '');
}

/** When deploy scripts omit `-Changes`, use recent commits from this repo. */
function changesFromGit(cwd, maxCommits = 12) {
    try {
        const out = execSync(`git log -n ${maxCommits} --pretty=format:%h %s`, {
            cwd,
            encoding: 'utf8',
            maxBuffer: 256 * 1024,
            stdio: ['ignore', 'pipe', 'ignore'],
        });
        return out
            .trim()
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);
    } catch {
        return [];
    }
}

function resolveChangeLines(payload) {
    const raw = Array.isArray(payload.changes) ? payload.changes : [];
    const fromPayload = raw
        .map((c) => String(typeof c === 'object' ? JSON.stringify(c) : c).trim())
        .filter(Boolean);
    if (fromPayload.length) {
        return fromPayload;
    }
    return changesFromGit(__dirname);
}

function devChannelIds(edition) {
    const e = String(edition || 'both').toLowerCase().trim();
    const ids = [];
    if (e === '3.5e' || e === '3.5' || e === '35' || e === 'dnd35') {
        ids.push(onlyDigits(C35 || CDEV));
    } else if (e === '5e' || e === '5e2014' || e === '5e2024' || e === '5') {
        ids.push(onlyDigits(C5 || CDEV));
    } else {
        if (C35) ids.push(onlyDigits(C35));
        if (C5) ids.push(onlyDigits(C5));
        if (!ids.length && CDEV) ids.push(onlyDigits(CDEV));
    }
    return [...new Set(ids.filter(Boolean))];
}

function buildEmbed(payload, tier) {
    const isLive = tier === 'live';
    const color = isLive ? 0x2ecc71 : 0xe67e22;
    const title = isLive ? '🚀 Live — eonweaver.com' : '🧪 Dev server — QA';
    let banner;
    if (isLive) {
        banner = '**Channel:** Live / production\n**Site:** `eonweaver.com` — player-facing.';
    } else if (payload.dev_site_hint) {
        banner =
            '**Channel:** Dev / QA (not live)\n**Deploy surface:** ' +
            String(payload.dev_site_hint).slice(0, 900);
    } else {
        banner = '**Channel:** Dev / QA\n**Site:** `worldscribe.online` — **not** live production.';
    }

    const fields = [
        {
            name: isLive ? '🟢 Live vs dev' : '🟠 Dev vs live',
            value: banner.slice(0, 1024),
            inline: false,
        },
    ];

    if (payload.deploy_target) {
        fields.push({
            name: '🎯 Deploy target',
            value: String(payload.deploy_target).slice(0, 1024),
            inline: false,
        });
    }
    if (payload.app_editions) {
        fields.push({
            name: '📚 Rules editions in this build',
            value: String(payload.app_editions).slice(0, 1024),
            inline: false,
        });
    }

    const env = (payload.environment || '').trim();
    const desc = (payload.description || '').trim();
    const summary = env ? `**Deploy run:** ${env}\n\n${desc}` : desc;
    if (summary) {
        fields.push({
            name: '📋 Summary',
            value: summary.slice(0, 1024),
            inline: false,
        });
    }

    const changeStrings = resolveChangeLines(payload);
    const lines = changeStrings.map((c) => `• ${c}`).slice(0, 25);
    const changeBlock = lines.length
        ? lines.join('\n')
        : '_No commit history found (run deploy from the git repo, or pass `-Changes` on the deploy script)._';
    fields.push({
        name: '🔧 Changes',
        value: changeBlock.slice(0, 1024),
        inline: false,
    });

    const now = new Date();
    return {
        title: title.slice(0, 256),
        color,
        fields,
        footer: { text: `Eon Weaver • ${now.toISOString().slice(0, 16).replace('T', ' ')} UTC` },
        timestamp: now.toISOString(),
    };
}

async function postEmbed(channelId, embed) {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
            Authorization: `Bot ${TOKEN}`,
            'Content-Type': 'application/json',
            'User-Agent': 'EonWeaverDeployNotify (node)',
        },
        body: JSON.stringify({ embeds: [embed] }),
    });
    if (!res.ok) {
        const t = await res.text();
        throw new Error(`Discord channel ${channelId}: HTTP ${res.status} ${t.slice(0, 500)}`);
    }
}

async function main() {
    const jsonPath = process.argv[2];
    if (!jsonPath || !fs.existsSync(jsonPath)) {
        console.error('Usage: node discord_deploy_notify.mjs <path-to-payload.json>');
        process.exit(1);
    }
    if (!TOKEN) {
        console.error('Missing DISCORD_TOKEN (or DISCORD_BOT_TOKEN) in town-directory/.env.discord');
        process.exit(1);
    }

    const payload = JSON.parse(readUtf8FileStripBom(jsonPath));
    const tier = String(payload.deploy_notify || 'dev').toLowerCase() === 'live' ? 'live' : 'dev';
    const edition = payload.deploy_edition || 'both';

    const channelIds =
        tier === 'live' ? [onlyDigits(CLIVE)].filter(Boolean) : devChannelIds(edition);

    if (!channelIds.length) {
        console.error(
            'No deploy channel IDs in .env.discord. Set DISCORD_DEPLOY_CHANNEL_LIVE (live) and/or DISCORD_DEPLOY_CHANNEL_DEV_35E + DISCORD_DEPLOY_CHANNEL_DEV_5E (dev). See .env.discord.example.'
        );
        process.exit(1);
    }

    const embed = buildEmbed(payload, tier);
    for (const cid of channelIds) {
        await postEmbed(cid, embed);
        console.log(`Discord OK: posted to channel ${cid}`);
    }
}

main().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
});
