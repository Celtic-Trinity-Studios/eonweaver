/**
 * One-shot: reorganize WorldScribe Discord after template copy.
 * Run: node discord_reorganize_worldscribe.js
 *
 * .env.discord: DISCORD_TOKEN (required), DISCORD_GUILD_ID (optional if bot is only in one guild)
 */
import { Client, GatewayIntentBits, ChannelType } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.discord') });

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID?.trim();

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function op(fn, label) {
    await delay(1100);
    try {
        await fn();
        console.log('✓', label);
    } catch (e) {
        console.error('✗', label, e.message);
    }
}

async function main() {
    if (!TOKEN) {
        console.error('Missing DISCORD_TOKEN in .env.discord');
        process.exit(1);
    }

    const client = new Client({
        intents: [GatewayIntentBits.Guilds],
    });

    await client.login(TOKEN);

    let guild;
    if (GUILD_ID) {
        guild = await client.guilds.fetch(GUILD_ID);
    } else {
        const first = (await client.guilds.fetch()).first();
        if (!first) {
            console.error('Bot is not in any server.');
            process.exit(1);
        }
        guild = await first.fetch();
    }

    console.log('Guild:', guild.name, guild.id, '\n');

    const channels = await guild.channels.fetch();
    const get = (id) => channels.get(id);

    const CAT = {
        nexus: '1502615531809935471',
        commonRoom: '1502615537849471056',
        labs: '1502615553389498418',
        arcane: '1480714569143029778',
        modern: '1480715149873778789',
        forge: '1480714569281310756',
        moderation: '1480714569541353556',
        staffPrivate: '1480714569541353558',
        voice: '1480714568807350399',
        rotoHub: '1480714568807350401',
        playtests: '1480714569541353555',
    };

    await op(async () => {
        const pt = get(CAT.playtests);
        if (pt?.type === ChannelType.GuildCategory) {
            await pt.delete('Reorganize: empty Playtests stub');
        }
    }, 'Remove empty Playtests category');

    await op(async () => get(CAT.staffPrivate)?.setName('staff-private'), 'Rename hideen → staff-private');
    await op(async () => get(CAT.moderation)?.setName('moderation'), 'Rename timeout category → moderation');
    await op(async () => get(CAT.voice)?.setName('voice'), 'Rename Voice Channels → voice');
    await op(async () => get(CAT.forge)?.setName('staff-forge'), 'Rename THE FORGE → staff-forge');

    await op(async () => get('1480714568807350395')?.setParent(CAT.staffPrivate), 'moderator-only → staff-private');
    await op(async () => get('1480714568807350396')?.setParent(CAT.nexus), 'rules → under Start here');
    await op(async () => get('1480714568807350397')?.setParent(CAT.nexus), 'achievements → Start here');
    await op(async () => get('1480714568807350398')?.setParent(CAT.nexus), 'server-info forum → Start here');

    const rotoMoves = [
        ['1480714568807350402', CAT.nexus],
        ['1480714568807350403', CAT.commonRoom],
        ['1480714568807350404', CAT.commonRoom],
        ['1480714569143029770', CAT.commonRoom],
        ['1480714569143029772', CAT.nexus],
        ['1480714569143029773', CAT.commonRoom],
        ['1480714569143029774', CAT.commonRoom],
        ['1480714569143029775', CAT.labs],
        ['1480714569143029776', CAT.commonRoom],
        ['1481291207798816820', CAT.labs],
    ];
    for (const [id, parent] of rotoMoves) {
        await op(async () => get(id)?.setParent(parent), `Move channel ${id}`);
    }

    await op(async () => {
        const roto = get(CAT.rotoHub);
        if (roto?.type === ChannelType.GuildCategory) {
            await roto.delete('Reorganize: remove ROTO-HUB template category');
        }
    }, 'Delete empty ROTO-HUB category');

    const renames = [
        ['1480714568807350396', 'rules'],
        ['1480714568807350397', 'achievements'],
        ['1480714568807350398', 'server-info'],
        ['1480714568807350402', 'read-first'],
        ['1480714568807350403', 'lounge'],
        ['1480714568807350404', 'off-topic'],
        ['1480714569143029770', 'memes-and-pets'],
        ['1480714569143029772', 'supporters'],
        ['1480714569143029773', 'screenshots'],
        ['1480714569143029774', 'self-promo'],
        ['1480714569143029775', 'suggestions'],
        ['1480714569143029776', 'table-help'],
        ['1480714569143029777', 'bug-reports'],
        ['1480714569143029779', 'lore-35e-news'],
        ['1480714569281310752', 'lore-35e-requests'],
        ['1480715196673560596', 'lore-5e-news'],
        ['1480715287769645252', 'lore-5e-requests'],
        ['1480714569281310751', 'ttrpg-general'],
        ['1480715247617576960', '5e-discussion'],
        ['1481291207798816820', 'beta-feedback'],
        ['1480714569541353557', 'sus-catcher'],
    ];

    for (const [id, name] of renames) {
        await op(async () => get(id)?.setName(name), `Rename → #${name}`);
    }

    await op(async () => get(CAT.arcane)?.setName('📖 Lore · 3.5e'), 'Category Arcane lore');
    await op(async () => get(CAT.modern)?.setName('📜 Lore · 5e+'), 'Category Modern lore');

    await op(async () => get(CAT.nexus)?.setName('📌 Start here'), 'Category Nexus');
    await op(async () => get(CAT.commonRoom)?.setName('💬 Community'), 'Category Community');
    await op(async () => get(CAT.labs)?.setName('🧪 Labs'), 'Category Labs');

    console.log('\nDone. Reorder channels in Discord if you want a different visual order.');
    client.destroy();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
