/**
 * Post deploy announcements to Discord from your **local** machine (runs after FTP).
 * Uses `town-directory/.env.discord` — same bot token as other tooling. Does **not** call PHP on any host.
 *
 * Usage:
 *   node discord_deploy_notify.mjs path/to/payload.json
 *
 * Payload JSON:
 *   deploy_notify: "live" | "dev"
 *   deploy_edition: "both" | "3.5e" | "5e" | … (dev only — which channel(s) to ping)
 *   site_url, site_name — optional; used in title/link (defaults by tier)
 *   description — optional one-line blurb (kept short)
 *   changes?: string[] — optional; if omitted, recent git log is used (noise commits filtered)
 *   (legacy keys deploy_target, app_editions, environment are ignored for the embed body)
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
import { execFileSync } from 'child_process';
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

/** Resolve repo root (town-directory may not be the git top-level). */
function gitTopLevel(startDir) {
    try {
        const out = execFileSync('git', ['-C', startDir, 'rev-parse', '--show-toplevel'], {
            encoding: 'utf8',
            maxBuffer: 64 * 1024,
            stdio: ['ignore', 'pipe', 'ignore'],
        });
        return out.trim();
    } catch {
        return '';
    }
}

/** Automated deploy snapshot commits — hide from "Updates" so real work shows through. */
function isNoiseCommitLine(line) {
    const s = String(line).trim();
    if (!s) return true;
    const subject = s.replace(/^[a-f0-9]{4,40}\s+/, '').trim();
    if (/^chore\(deploy\)/i.test(subject)) return true;
    if (/^merge branch\b/i.test(subject)) return true;
    if (/^merge pull request\b/i.test(subject)) return true;
    return false;
}

/** When deploy scripts omit `-Changes`, scan recent git history and drop noise. */
function changesFromGit(scriptDir, maxFetch = 50) {
    const root = gitTopLevel(scriptDir);
    if (!root) {
        return [];
    }
    try {
        const out = execFileSync(
            'git',
            ['-C', root, 'log', `-${maxFetch}`, '--pretty=format:%h %s'],
            {
                encoding: 'utf8',
                maxBuffer: 256 * 1024,
                stdio: ['ignore', 'pipe', 'ignore'],
            }
        );
        return out
            .trim()
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)
            .filter((l) => !isNoiseCommitLine(l));
    } catch {
        return [];
    }
}

function resolveChangeLines(payload) {
    const raw = Array.isArray(payload.changes) ? payload.changes : [];
    const fromPayload = raw
        .map((c) => String(typeof c === 'object' ? JSON.stringify(c) : c).trim())
        .filter(Boolean)
        .filter((c) => !isNoiseCommitLine(c));
    if (fromPayload.length) {
        return fromPayload;
    }
    return changesFromGit(__dirname);
}

function truncateField(s, max = 1024) {
    if (s.length <= max) return s;
    return `${s.slice(0, max - 24)}\n_…truncated_`;
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
    const siteUrl = String(
        payload.site_url || (isLive ? 'https://eonweaver.com/' : 'https://worldscribe.online/')
    ).trim();
    const siteName = String(payload.site_name || (isLive ? 'eonweaver.com' : 'worldscribe.online')).trim();
    const title = isLive ? `🚀 Deployed — ${siteName}` : `🧪 Deployed — ${siteName}`;

    const defaultBlurb = isLive
        ? 'Production build is live (player-facing).'
        : 'Staging build is live (not production).';
    const extra = String(payload.description || '').trim();
    const description = truncateField(
        [defaultBlurb, extra, siteUrl].filter(Boolean).join('\n'),
        500
    );

    const changeStrings = resolveChangeLines(payload);
    const lines = changeStrings.map((c) => `• ${c}`).slice(0, 18);
    const changeBlock = lines.length
        ? lines.join('\n')
        : '_No recent feature/fix commits in git log (or not in a git repo). Deploy still completed._';

    const now = new Date();
    return {
        title: title.slice(0, 256),
        description,
        color,
        fields: [
            {
                name: '📝 Updates',
                value: truncateField(changeBlock, 1024),
                inline: false,
            },
        ],
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
