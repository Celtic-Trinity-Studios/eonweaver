/**
 * One-shot: edition roles, Suspicious (mod), #onboarding channel, welcome post with role buttons.
 *
 *   node discord_setup_onboarding.mjs
 *   node discord_setup_onboarding.mjs --dry-run
 *   node discord_setup_onboarding.mjs --refresh-message
 *
 * Requires town-directory/.env.discord (DISCORD_TOKEN, optional DISCORD_GUILD_ID).
 * After run, paste printed role/channel IDs into .env.discord for discord_onboarding_bot.mjs.
 */
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    EmbedBuilder,
    PermissionFlagsBits,
} from 'discord.js';
import { connectGuild, delay } from './scripts/discord/guild.mjs';
import {
    EDITION_ROLES,
    ONBOARDING_CHANNEL_ALIASES,
    ONBOARDING_CHANNEL_NAME,
    SUSPICIOUS_ROLE,
} from './scripts/discord/onboarding_config.mjs';

const dryRun = process.argv.includes('--dry-run');
const refreshMessage = process.argv.includes('--refresh-message');

function envCategoryId() {
    return (process.env.DISCORD_CATEGORY_START_HERE || '').trim();
}

async function findOrCreateRole(guild, { name, color, hoist = true, mentionable = false }) {
    const roles = await guild.roles.fetch();
    let role = [...roles.values()].find((r) => r.name === name);
    if (role) {
        console.log(`  role exists: ${name} (${role.id})`);
        const currentColor = role.colors?.primaryColor ?? role.color;
        if (!dryRun && (currentColor !== color || role.hoist !== hoist)) {
            await role.edit({
                colors: { primaryColor: color },
                hoist,
                mentionable,
                reason: 'Eon Weaver onboarding setup',
            });
            console.log(`  updated colors/hoist: ${name}`);
        }
        return role;
    }
    if (dryRun) {
        console.log(`  [dry-run] would create role: ${name}`);
        return { id: `dry-${name}`, name };
    }
    role = await guild.roles.create({
        name,
        colors: { primaryColor: color },
        hoist,
        mentionable,
        reason: 'Eon Weaver onboarding setup',
    });
    await delay(600);
    console.log(`  created role: ${name} (${role.id})`);
    return role;
}

async function resolveStartHereCategory(guild, channels) {
    const fromEnv = envCategoryId();
    if (fromEnv) {
        const c = channels.get(fromEnv);
        if (c?.type === ChannelType.GuildCategory) {
            return c;
        }
        console.warn(`DISCORD_CATEGORY_START_HERE=${fromEnv} not found; searching by name.`);
    }
    return [...channels.values()].find(
        (c) =>
            c.type === ChannelType.GuildCategory &&
            /start here|nexus|welcome/i.test(c.name)
    );
}

function normalizeChannelSlug(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/\s+/g, '-');
}

function isOnboardingAliasChannel(ch) {
    if (ch.type !== ChannelType.GuildText) return false;
    const slug = normalizeChannelSlug(ch.name);
    return ONBOARDING_CHANNEL_ALIASES.includes(slug);
}

async function findOrCreateOnboardingChannel(guild, channels, category) {
    const envId = (process.env.DISCORD_CHANNEL_ONBOARDING || '').trim();
    if (envId) {
        const byId = channels.get(envId);
        if (byId?.type === ChannelType.GuildText) {
            console.log(`  channel from env: #${byId.name} (${byId.id})`);
            if (!dryRun && normalizeChannelSlug(byId.name) !== ONBOARDING_CHANNEL_NAME) {
                await byId.setName(ONBOARDING_CHANNEL_NAME);
                console.log(`  renamed → #${ONBOARDING_CHANNEL_NAME}`);
            }
            return byId;
        }
        console.warn(`DISCORD_CHANNEL_ONBOARDING=${envId} not found; searching by name.`);
    }

    const matches = [...channels.values()].filter(isOnboardingAliasChannel);
    const rank = (ch) => {
        const slug = normalizeChannelSlug(ch.name);
        const i = ONBOARDING_CHANNEL_ALIASES.indexOf(slug);
        return i === -1 ? 99 : i;
    };
    matches.sort((a, b) => rank(a) - rank(b));

    let ch = matches[0] ?? null;
    const dupes = matches.slice(1);

    for (const d of dupes) {
        if (dryRun) {
            console.log(`  [dry-run] would delete duplicate #${d.name} (${d.id})`);
        } else {
            await d.delete('Merged duplicate onboarding channel into #start-here');
            console.log(`  deleted duplicate #${d.name} (${d.id})`);
            await delay(600);
        }
    }

    if (ch) {
        console.log(`  using channel: #${ch.name} (${ch.id})`);
        if (!dryRun) {
            if (normalizeChannelSlug(ch.name) !== ONBOARDING_CHANNEL_NAME) {
                await ch.setName(ONBOARDING_CHANNEL_NAME);
                console.log(`  renamed → #${ONBOARDING_CHANNEL_NAME}`);
            }
            if (category && ch.parentId !== category.id) {
                await ch.setParent(category.id, { lockPermissions: false });
                console.log(`  moved under ${category.name}`);
            }
        }
        return ch;
    }

    if (dryRun) {
        console.log(`  [dry-run] would create #${ONBOARDING_CHANNEL_NAME}`);
        return { id: 'dry-start-here', name: ONBOARDING_CHANNEL_NAME, isTextBased: () => true };
    }

    ch = await guild.channels.create({
        name: ONBOARDING_CHANNEL_NAME,
        type: ChannelType.GuildText,
        parent: category?.id ?? null,
        topic: 'Toggle the edition(s) you play and read how the server is organized.',
        reason: 'Eon Weaver onboarding',
    });
    await ch.permissionOverwrites.edit(guild.roles.everyone, {
        ViewChannel: true,
        SendMessages: false,
        AddReactions: false,
    });
    console.log(`  created #${ch.name} (${ch.id})`);
    return ch;
}

function buildWelcomePayload(guild) {
    const site = (process.env.DISCORD_ONBOARDING_SITE_URL || 'https://eonweaver.com').replace(/\/$/, '');
    const embed = new EmbedBuilder()
        .setColor(0x2c1810)
        .setTitle('Welcome to the Eon Weaver community')
        .setDescription(
            [
                'This server is for **Eon Weaver** — AI-assisted town simulation, Scribe, and campaign tools.',
                '',
                '**Before you chat**',
                '1. Read **#rules** (same category).',
                '2. Use the buttons below to **toggle** the edition(s) you play — pick **all that apply** (click again to remove).',
                '3. Jump into the lore channels that match your edition(s), or **#ttrpg-general** for everything else.',
                '',
                `**Play / beta:** [${site}](${site})`,
            ].join('\n')
        )
        .setFooter({ text: 'Edition roles are optional tags for the community — not app login.' });

    const row = new ActionRowBuilder().addComponents(
        ...EDITION_ROLES.map((ed) =>
            new ButtonBuilder()
                .setCustomId(ed.customId)
                .setLabel(ed.buttonLabel)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(ed.emoji)
        )
    );

    return { embeds: [embed], components: [row] };
}

function printEnvBlock({ guild, roles, suspicious, channel, messageId }) {
    const lines = [
        '',
        '# ── Onboarding (paste into town-directory/.env.discord) ──',
        `DISCORD_GUILD_ID=${guild.id}`,
    ];
    if (envCategoryId()) {
        lines.push(`DISCORD_CATEGORY_START_HERE=${envCategoryId()}`);
    }
    for (const ed of EDITION_ROLES) {
        const r = roles[ed.key];
        if (r?.id) lines.push(`${ed.env}=${r.id}`);
    }
    if (suspicious?.id) lines.push(`${SUSPICIOUS_ROLE.env}=${suspicious.id}`);
    if (channel?.id) lines.push(`DISCORD_CHANNEL_ONBOARDING=${channel.id}`);
    if (messageId) lines.push(`DISCORD_ONBOARDING_MESSAGE_ID=${messageId}`);
    lines.push(
        '',
        '# Run locally so edition buttons assign roles:',
        '#   node discord_onboarding_bot.mjs',
        ''
    );
    console.log(lines.join('\n'));
}

async function upsertWelcomeMessage(channel, guild) {
    const payload = buildWelcomePayload(guild);
    const messageId = (process.env.DISCORD_ONBOARDING_MESSAGE_ID || '').trim();

    if (dryRun) {
        console.log('  [dry-run] would post or edit onboarding welcome embed + buttons');
        return messageId || 'dry-message-id';
    }

    if (messageId && refreshMessage) {
        try {
            const msg = await channel.messages.fetch(messageId);
            await msg.edit(payload);
            console.log(`  updated onboarding message ${messageId}`);
            return msg.id;
        } catch {
            console.warn(`  could not edit ${messageId}; posting a new message.`);
        }
    }

    if (messageId && !refreshMessage) {
        try {
            await channel.messages.fetch(messageId);
            console.log(`  onboarding message already set (${messageId}); use --refresh-message to edit.`);
            return messageId;
        } catch {
            console.warn(`  DISCORD_ONBOARDING_MESSAGE_ID missing on channel; posting new.`);
        }
    }

    const msg = await channel.send(payload);
    try {
        await msg.pin();
    } catch {
        console.warn('  could not pin message (missing Manage Messages?)');
    }
    console.log(`  posted onboarding message ${msg.id}`);
    return msg.id;
}

async function main() {
    const { client, guild } = await connectGuild();
    console.log(`Guild: ${guild.name} (${guild.id})${dryRun ? ' [dry-run]' : ''}\n`);

    const me = await guild.members.fetchMe();
    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
        console.error('Bot needs **Manage Roles**. Enable it in Server Settings → Integrations → Bot.');
        client.destroy();
        process.exit(1);
    }

    const roles = {};
    console.log('Roles:');
    for (const ed of EDITION_ROLES) {
        roles[ed.key] = await findOrCreateRole(guild, {
            name: ed.name,
            color: ed.color,
            hoist: true,
            mentionable: false,
        });
    }
    const suspicious = await findOrCreateRole(guild, {
        name: SUSPICIOUS_ROLE.name,
        color: SUSPICIOUS_ROLE.color,
        hoist: true,
        mentionable: false,
    });
    console.log('  (Suspicious is for moderators — assign manually; not on public buttons.)');

    const channels = await guild.channels.fetch();
    const category = await resolveStartHereCategory(guild, channels);
    if (category) {
        console.log(`\nCategory: ${category.name} (${category.id})`);
    } else {
        console.log('\nNo “Start here” category found; #start-here will be created at the top level.');
    }

    console.log('\nChannel:');
    const channel = await findOrCreateOnboardingChannel(guild, channels, category);

    console.log('\nWelcome post:');
    const messageId = await upsertWelcomeMessage(channel, guild);

    printEnvBlock({ guild, roles, suspicious, channel, messageId });

    console.log('Done. Drag edition roles **below** the bot role in Server Settings → Roles.');
    console.log(
        '\nFor buttons to work without a local Node process:\n' +
            '  1. Copy edition role IDs + bot token settings into config.php (see config.example.php)\n' +
            '  2. Set Interactions Endpoint URL to https://YOUR_HOST/discord_interactions.php\n' +
            '  Or run: npm run discord:onboarding-bot (keep it running while testing)'
    );
    client.destroy();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
