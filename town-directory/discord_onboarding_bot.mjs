/**
 * Persistent bot: edition buttons on #onboarding toggle edition roles (multiple allowed).
 *
 *   node discord_onboarding_bot.mjs
 *
 * Only needed if you do NOT use discord_interactions.php on your public host.
 *
 * .env.discord: DISCORD_TOKEN, DISCORD_GUILD_ID (if multi-guild), edition role IDs from setup script.
 */
import { GatewayIntentBits, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { connectGuild } from './scripts/discord/guild.mjs';
import { loadEnvDiscord } from './scripts/discord/env.mjs';
import { EDITION_ROLES, editionRoleId } from './scripts/discord/onboarding_config.mjs';

loadEnvDiscord();

/** Bump when bot reply behavior changes — visible in the ephemeral footer. */
const HANDLER_VERSION = '2026-05-15-toggle-multi (node)';

const customIdToKey = Object.fromEntries(EDITION_ROLES.map((e) => [e.customId, e.key]));

function formatActiveEditions(member) {
    const active = EDITION_ROLES.filter((ed) => {
        const id = editionRoleId(ed.key);
        return id && member.roles.cache.has(id);
    });
    if (!active.length) return '_No edition roles selected._';
    return `**Your editions:** ${active.map((ed) => ed.name.replace(/^Edition · /, '')).join(', ')}`;
}

/** @returns {'added'|'removed'} */
async function toggleEditionRole(member, editionKey) {
    const targetId = editionRoleId(editionKey);
    if (!targetId) {
        throw new Error(`Role ID not set for ${editionKey} (run discord_setup_onboarding.mjs first).`);
    }
    if (member.roles.cache.has(targetId)) {
        await member.roles.remove(targetId, 'Edition toggled off via onboarding');
        return 'removed';
    }
    await member.roles.add(targetId, 'Edition toggled on via onboarding');
    return 'added';
}

async function main() {
    const { client, guild: guildPartial } = await connectGuild([
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
    ]);
    const guild = guildPartial.name ? guildPartial : await guildPartial.fetch();

    console.log(`Onboarding bot listening — ${guild.name} (${guild.id})`);
    console.log('Edition buttons (toggle, multiple OK):', EDITION_ROLES.map((e) => e.customId).join(', '));

    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;
        const editionKey = customIdToKey[interaction.customId];
        if (!editionKey) return;
        if (interaction.guildId !== guild.id) return;

        const ed = EDITION_ROLES.find((e) => e.key === editionKey);

        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const me = await guild.members.fetchMe();
            if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
                await interaction.editReply({ content: 'Bot is missing **Manage Roles** permission.' });
                return;
            }

            const member = await guild.members.fetch(interaction.user.id);
            const targetId = editionRoleId(editionKey);
            const targetRole = targetId ? await guild.roles.fetch(targetId).catch(() => null) : null;
            if (!targetRole) {
                await interaction.editReply({
                    content:
                        'Edition role is not configured yet. Add role IDs to `.env.discord` or `config.php`.',
                });
                return;
            }

            if (me.roles.highest.position <= targetRole.position) {
                await interaction.editReply({
                    content: 'Bot role must be **above** edition roles in Server Settings → Roles.',
                });
                return;
            }

            const action = await toggleEditionRole(member, editionKey);
            await member.fetch(true);
            const verb = action === 'removed' ? 'Removed' : 'Added';
            await interaction.editReply({
                content: [
                    `${ed.emoji} **${verb}** ${targetRole.name}.`,
                    formatActiveEditions(member),
                    '_Click the same button again to toggle off. You can enable more than one edition._',
                    '`handler ' + HANDLER_VERSION + '`',
                ].join('\n'),
            });
        } catch (err) {
            const msg = err?.message || String(err);
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: `Could not update roles: ${msg}` }).catch(() => {});
            } else {
                await interaction
                    .reply({ content: `Could not update roles: ${msg}`, flags: MessageFlags.Ephemeral })
                    .catch(() => {});
            }
            console.error('interaction error:', msg);
        }
    });

    client.on('error', (e) => console.error('client error:', e.message));
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
