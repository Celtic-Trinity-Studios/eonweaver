/**
 * One-shot repair: split merged 3.5e + 5e category after bad name matching.
 *   node discord_repair_edition_lore.mjs
 */
import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { connectGuild, delay } from './scripts/discord/guild.mjs';
import { editionRoleId } from './scripts/discord/onboarding_config.mjs';

const CAT_35E = '1480715149873778789'; // was empty "5e+"
const CAT_5E = '1480714569143029778'; // wrongly holds both edition channel sets

const CH_35E = ['1480714569143029779', '1502631905227440248', '1480714569281310752'];
const CH_5E = ['1480715196673560596', '1480715247617576960', '1480715287769645252'];

const VIEW_SEND = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.AddReactions,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.EmbedLinks,
];

function overwrites(guild, roleId) {
    return [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: roleId, allow: VIEW_SEND },
    ];
}

async function main() {
    const { client, guild } = await connectGuild();
    const channels = await guild.channels.fetch();

    const cat35 = channels.get(CAT_35E);
    const cat5 = channels.get(CAT_5E);
    if (!cat35 || !cat5) {
        console.error('Expected categories missing — abort.');
        process.exit(1);
    }

    await cat35.setName('📖 Lore · 3.5e');
    await cat5.setName('📜 Lore · 5e (2014)');
    console.log('Renamed categories');

    for (const id of CH_35E) {
        const ch = channels.get(id);
        if (ch) {
            await ch.setParent(CAT_35E, { lockPermissions: false });
            console.log('Moved to 3.5e:', ch.name);
            await delay(500);
        }
    }
    for (const id of CH_5E) {
        const ch = channels.get(id);
        if (ch) {
            await ch.setParent(CAT_5E, { lockPermissions: false });
            console.log('Moved to 5e:', ch.name);
            await delay(500);
        }
    }

    const r35 = editionRoleId('35e');
    const r5 = editionRoleId('5e');
    const r24 = editionRoleId('5e2024');
    if (r35) await cat35.permissionOverwrites.set(overwrites(guild, r35));
    if (r5) await cat5.permissionOverwrites.set(overwrites(guild, r5));

    const cat24 = [...channels.values()].find(
        (c) => c.type === ChannelType.GuildCategory && c.name.includes('2024')
    );
    if (cat24 && r24) {
        await cat24.permissionOverwrites.set(overwrites(guild, r24));
        for (const ch of channels.values()) {
            if (ch.parentId === cat24.id) {
                await ch.permissionOverwrites.set(overwrites(guild, r24));
            }
        }
    }

    for (const id of CH_35E) {
        const ch = channels.get(id);
        if (ch && r35) await ch.permissionOverwrites.set(overwrites(guild, r35));
    }
    for (const id of CH_5E) {
        const ch = channels.get(id);
        if (ch && r5) await ch.permissionOverwrites.set(overwrites(guild, r5));
    }

    console.log('\nRepaired. Env hints:');
    console.log('DISCORD_CATEGORY_LORE_35E=' + CAT_35E);
    console.log('DISCORD_CATEGORY_LORE_5E=' + CAT_5E);
    if (cat24) console.log('DISCORD_CATEGORY_LORE_5E2024=' + cat24.id);
    client.destroy();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
