/**
 * Role-gated lore categories per edition (news / discussion / requests).
 *
 *   node discord_setup_edition_lore.mjs
 *   node discord_setup_edition_lore.mjs --dry-run
 *
 * Requires .env.discord with DISCORD_ROLE_EDITION_* (from discord_setup_onboarding.mjs).
 * Optional: DISCORD_CATEGORY_LORE_35E, _5E, _5E2024 — existing category snowflakes.
 * Optional: DISCORD_LORE_STAFF_ROLE_IDS — comma-separated role IDs that can see all lore channels.
 */
import {
    ChannelType,
    PermissionFlagsBits,
} from 'discord.js';
import { connectGuild, delay } from './scripts/discord/guild.mjs';
import { editionRoleId } from './scripts/discord/onboarding_config.mjs';
import { EDITION_LORE_EDITIONS } from './scripts/discord/edition_lore_config.mjs';

const dryRun = process.argv.includes('--dry-run');

const VIEW_SEND = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.AddReactions,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.EmbedLinks,
];

function staffRoleIds() {
    const raw = (process.env.DISCORD_LORE_STAFF_ROLE_IDS || '').trim();
    if (!raw) return [];
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function loreOverwrites(guild, editionRoleId, staffIds) {
    const rows = [
        {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
        },
    ];
    if (editionRoleId) {
        rows.push({
            id: editionRoleId,
            allow: VIEW_SEND,
        });
    }
    for (const sid of staffIds) {
        rows.push({
            id: sid,
            allow: VIEW_SEND,
        });
    }
    return rows;
}

async function findCategoryByEnvOrName(guild, channels, edition) {
    const envId = (process.env[edition.categoryEnv] || '').trim();
    if (envId) {
        const c = channels.get(envId);
        if (c?.type === ChannelType.GuildCategory) {
            return c;
        }
        console.warn(`  ${edition.categoryEnv} not found`);
    }
    const want = edition.categoryName.toLowerCase();
    return [...channels.values()].find((c) => {
        if (c.type !== ChannelType.GuildCategory) return false;
        const n = c.name.toLowerCase();
        if (n === want) return true;
        // Avoid matching "3.5e" when looking for "5e" (substring trap).
        if (edition.key === '35e') return /3\.5|3\.5e|35e/.test(n);
        if (edition.key === '5e') return (/5e.*2014|5e\+/.test(n) || /\b5e\b/.test(n)) && !/2024|3\.5/.test(n);
        if (edition.key === '5e2024') return /2024/.test(n);
        return false;
    });
}

async function ensureCategory(guild, channels, edition) {
    let cat = await findCategoryByEnvOrName(guild, channels, edition);
    if (cat) {
        console.log(`  category exists: ${cat.name} (${cat.id})`);
        if (!dryRun && cat.name !== edition.categoryName) {
            await cat.setName(edition.categoryName);
            console.log(`  renamed → ${edition.categoryName}`);
        }
        return cat;
    }
    if (dryRun) {
        console.log(`  [dry-run] would create category ${edition.categoryName}`);
        return { id: `dry-cat-${edition.key}`, name: edition.categoryName };
    }
    cat = await guild.channels.create({
        name: edition.categoryName,
        type: ChannelType.GuildCategory,
        reason: 'Eon Weaver edition lore setup',
    });
    await delay(600);
    console.log(`  created category ${cat.name} (${cat.id})`);
    return cat;
}

async function ensureTextChannel(guild, channels, parentId, spec, overwrites) {
    let ch = [...channels.values()].find(
        (c) => c.type === ChannelType.GuildText && c.name === spec.name
    );
    if (ch) {
        console.log(`    #${ch.name} exists (${ch.id})`);
        if (!dryRun) {
            if (ch.parentId !== parentId) {
                await ch.setParent(parentId, { lockPermissions: false });
            }
            await ch.permissionOverwrites.set(overwrites, 'Edition lore: role-gated channel');
            if (spec.topic && ch.topic !== spec.topic) {
                await ch.setTopic(spec.topic);
            }
        }
        return ch;
    }
    if (dryRun) {
        console.log(`    [dry-run] would create #${spec.name}`);
        return { id: `dry-${spec.name}`, name: spec.name };
    }
    ch = await guild.channels.create({
        name: spec.name,
        type: ChannelType.GuildText,
        parent: parentId,
        topic: spec.topic,
        permissionOverwrites: overwrites,
        reason: 'Eon Weaver edition lore setup',
    });
    await delay(600);
    console.log(`    created #${ch.name} (${ch.id})`);
    return ch;
}

async function applyCategoryPermissions(category, overwrites) {
    if (dryRun) {
        console.log('  [dry-run] would set category permission overwrites');
        return;
    }
    await category.permissionOverwrites.set(overwrites, 'Edition lore: hide from @everyone, show for edition role');
}

function printEnvBlock(results) {
    const lines = ['', '# ── Edition lore categories (discord_setup_edition_lore.mjs) ──'];
    for (const r of results) {
        lines.push(`${r.categoryEnv}=${r.categoryId}`);
        for (const ch of r.channels) {
            lines.push(`#   #${ch.name} = ${ch.id}`);
        }
    }
    lines.push('');
    console.log(lines.join('\n'));
}

async function main() {
    const { client, guild } = await connectGuild();
    const guildFull = guild.name ? guild : await guild.fetch();
    console.log(`Guild: ${guildFull.name} (${guildFull.id})${dryRun ? ' [dry-run]' : ''}\n`);

    const staffIds = staffRoleIds();
    if (staffIds.length) {
        console.log('Staff roles (see all lore):', staffIds.join(', '));
    } else {
        console.log('Tip: set DISCORD_LORE_STAFF_ROLE_IDS in .env.discord for Admin/Mod access to all lore.\n');
    }

    let channels = await guild.channels.fetch();
    const results = [];

    for (const edition of EDITION_LORE_EDITIONS) {
        const roleId = editionRoleId(edition.key);
        if (!roleId) {
            console.warn(`\n⚠️  Skip ${edition.key}: ${edition.roleEnv} not set in .env.discord`);
            continue;
        }

        console.log(`\n${edition.categoryName} (role ${roleId})`);
        const overwrites = loreOverwrites(guild, roleId, staffIds);

        const category = await ensureCategory(guild, channels, edition);
        await applyCategoryPermissions(category, overwrites);

        const channelRows = [];
        for (const spec of edition.channels) {
            const ch = await ensureTextChannel(guild, channels, category.id, spec, overwrites);
            channelRows.push({ name: spec.name, id: ch.id });
        }

        results.push({
            categoryEnv: edition.categoryEnv,
            categoryId: category.id,
            channels: channelRows,
        });

        channels = await guild.channels.fetch();
    }

  // Move misplaced 5e2024-named channels out of old "5e+" category if present
    const modernCat = [...channels.values()].find(
        (c) =>
            c.type === ChannelType.GuildCategory &&
            /5e\+|5e \(2014\)/i.test(c.name) &&
            !c.name.includes('2024')
    );
    const cat2024 = results.find((r) => r.categoryEnv === 'DISCORD_CATEGORY_LORE_5E2024');
    if (modernCat && cat2024 && !dryRun) {
        for (const ch of channels.values()) {
            if (ch.parentId === modernCat.id && /5e2024|2024/.test(ch.name)) {
                await ch.setParent(cat2024.categoryId, { lockPermissions: false });
                console.log(`  moved #${ch.name} → 5e (2024) category`);
            }
        }
    }

    printEnvBlock(results);
    console.log(
        'Done. Members only see lore categories for edition roles they have toggled in #start-here.'
    );
    client.destroy();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
