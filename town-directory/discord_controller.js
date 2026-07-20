import { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.discord') });

const TOKEN = process.env.DISCORD_TOKEN;
/** Optional — required when the bot is in more than one server */
const GUILD_ID = process.env.DISCORD_GUILD_ID?.trim();

if (!TOKEN) {
    console.error('❌ Error: DISCORD_TOKEN not found in .env.discord');
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

async function run() {
    const args = process.argv.slice(2);
    const command = args[0];

    try {
        await client.login(TOKEN);
        let guild;
        if (GUILD_ID) {
            guild = await client.guilds.fetch(GUILD_ID);
        } else {
            const guildBase = (await client.guilds.fetch()).first();
            if (!guildBase) {
                console.error('❌ Bot is not in any servers!');
                process.exit(1);
            }
            guild = await guildBase.fetch();
        }
        console.log(`📡 Connected to server: ${guild.name} (${guild.id})`);

        switch (command) {
            case 'list-channels':
                const channels = await guild.channels.fetch();
                channels.forEach(c => {
                    const type = Object.keys(ChannelType).find(key => ChannelType[key] === c.type);
                    console.log(`[${c.id}] ${c.name} (${type})`);
                });
                break;

            case 'list-tree': {
                const all = await guild.channels.fetch();
                const sorted = [...all.values()].sort(
                    (a, b) => a.rawPosition - b.rawPosition || a.name.localeCompare(b.name)
                );
                for (const c of sorted) {
                    if (c.type === ChannelType.GuildCategory) {
                        console.log(`\nCAT ${c.name} | ${c.id}`);
                    } else {
                        console.log(`  ch ${c.name} | ${c.id} | parent=${c.parentId ?? '(none)'}`);
                    }
                }
                break;
            }

            case 'create-category':
                const catName = args[1];
                const cat = await guild.channels.create({
                    name: catName,
                    type: ChannelType.GuildCategory
                });
                console.log(`✅ Created Category: ${cat.name} (${cat.id})`);
                break;

            case 'create-channel':
                const chanName = args[1];
                const parentId = args[2];
                const chanType = args[3] === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
                
                const chan = await guild.channels.create({
                    name: chanName,
                    type: chanType,
                    parent: parentId
                });
                console.log(`✅ Created Channel: ${chan.name} (${chan.id})`);
                break;

            case 'delete-channel':
                const targetId = args[1];
                const target = await guild.channels.fetch(targetId);
                await target.delete();
                console.log(`🗑️ Deleted Channel: ${target.name}`);
                break;

            case 'rename-channel':
                const renId = args[1];
                const newName = args[2];
                const renTarget = await guild.channels.fetch(renId);
                const oldName = renTarget.name;
                await renTarget.setName(newName);
                console.log(`✏️ Renamed: ${oldName} -> ${newName}`);
                break;

            case 'move-channel':
                const moveId = args[1];
                const newParentId = args[2];
                const moveTarget = await guild.channels.fetch(moveId);
                await moveTarget.setParent(newParentId);
                console.log(`📦 Moved: ${moveTarget.name} to category ${newParentId}`);
                break;

            case 'list-roles': {
                const roles = await guild.roles.fetch();
                const sorted = [...roles.values()].sort((a, b) => b.position - a.position);
                console.log('Roles (highest first). Bot cannot edit roles above its own.\n');
                for (const r of sorted) {
                    const flags = r.permissions.has(PermissionFlagsBits.Administrator) ? ' [ADMINISTRATOR]' : '';
                    console.log(`[${r.id}] ${r.name} | pos=${r.position}${r.managed ? ' | managed' : ''}${flags}`);
                }
                break;
            }

            /**
             * Grant Discord’s Administrator permission so holders can do everything on the server
             * (manage channels, roles, bans, etc.). Bot role must be dragged above this role in
             * Server Settings → Roles.
             *
             * Usage: grant-admin-full           → picks role named exactly "Admin" (case-insensitive)
             *        grant-admin-full <id>      → role snowflake
             *        grant-admin-full "<name>" → exact role name (quotes if spaces)
             */
            case 'grant-admin-full': {
                const roles = await guild.roles.fetch();
                const rawArg = args.slice(1).join(' ').trim();
                let target = null;

                if (/^\d{5,30}$/.test(rawArg)) {
                    target = roles.get(rawArg);
                    if (!target) console.error(`No role with id ${rawArg}`);
                } else if (rawArg.length > 0) {
                    const want = rawArg.toLowerCase();
                    target =
                        [...roles.values()].find((r) => r.name.toLowerCase() === want) ||
                        [...roles.values()].find((r) => r.name.toLowerCase().includes(want));
                    if (!target) console.error(`No role matching "${rawArg}"`);
                } else {
                    target = [...roles.values()].find((r) => r.name.toLowerCase() === 'admin');
                    if (!target) {
                        console.error('No role named exactly "Admin". Run list-roles and use: grant-admin-full <role-id>');
                    }
                }

                if (!target || target.managed) {
                    console.error(target?.managed ? 'That role is integration-managed; pick a normal role.' : 'Aborted.');
                    break;
                }

                const me = await guild.members.fetchMe();
                const botTop = me.roles.highest;
                if (botTop.position <= target.position) {
                    console.error(
                        `❌ The bot’s highest role (${botTop.name}) must be **above** "${target.name}" in Server Settings → Roles. Drag the bot role higher, then rerun.`
                    );
                    break;
                }

                await target.edit({
                    permissions: PermissionFlagsBits.Administrator,
                    reason: 'Grant Admin role full server access (owner request)',
                });
                console.log(`✅ Role "${target.name}" (${target.id}) now has Administrator (full server).`);
                break;
            }

            /**
             * Delete a guild role. Bot’s highest role must be above the target role.
             * Usage: delete-role <role-id> | delete-role <exact-name>
             */
            case 'set-bot-nickname': {
                const name = args.slice(1).join(' ').trim();
                const me = await guild.members.fetchMe();
                if (!name) {
                    await me.setNickname(null);
                    console.log('✅ Cleared bot server nickname (falls back to application name).');
                } else {
                    await me.setNickname(name.slice(0, 32));
                    console.log(`✅ Bot nickname in this server: ${name.slice(0, 32)}`);
                }
                console.log('Tip: rename the application in the Discord Developer Portal to match for invites/DMs.');
                break;
            }

            /**
             * “Show everyone’s categories” — turn on Display role members separately (hoist) for
             * every role the bot is allowed to edit. Drag the bot’s role near the top of the
             * role list so it can edit more roles.
             */
            case 'hoist-member-roles': {
                const me = await guild.members.fetchMe();
                const botTop = me.roles.highest;
                const roles = await guild.roles.fetch();
                const sorted = [...roles.values()].sort((a, b) => a.position - b.position);
                let ok = 0;
                let skip = 0;
                for (const r of sorted) {
                    if (r.id === guild.id) continue;
                    if (botTop.position <= r.position) {
                        console.log(`⏭️  Skip (move bot role above): ${r.name}`);
                        skip++;
                        continue;
                    }
                    if (r.hoist) {
                        continue;
                    }
                    try {
                        await r.setHoist(true, 'Group members by role in sidebar');
                        console.log(`✅ Hoist on: ${r.name}`);
                        ok++;
                    } catch (e) {
                        console.log(`⏭️  ${r.name}: ${e.message}`);
                        skip++;
                    }
                }
                console.log(`\nDone. Enabled hoist on ${ok} role(s); skipped ${skip}.`);
                break;
            }

            case 'delete-role': {
                const roles = await guild.roles.fetch();
                const rawArg = args.slice(1).join(' ').trim();
                if (!rawArg) {
                    console.error('Usage: delete-role <role-id or role-name>');
                    break;
                }
                let target = null;
                if (/^\d{5,30}$/.test(rawArg)) {
                    target = roles.get(rawArg);
                    if (!target) console.error(`No role with id ${rawArg}`);
                } else {
                    const want = rawArg.toLowerCase();
                    target =
                        [...roles.values()].find((r) => r.name.toLowerCase() === want) ||
                        [...roles.values()].find((r) => r.name.toLowerCase().includes(want));
                    if (!target) console.error(`No role matching "${rawArg}"`);
                }
                if (!target) {
                    console.error('Aborted.');
                    break;
                }
                if (target.id === guild.id) {
                    console.error('Cannot delete @everyone.');
                    break;
                }
                if (target.managed) {
                    console.error('That role is integration-managed; remove it from the integration/bot instead.');
                    break;
                }
                const me = await guild.members.fetchMe();
                const botTop = me.roles.highest;
                if (botTop.position <= target.position) {
                    console.error(
                        `❌ Move "${botTop.name}" above "${target.name}" in Server Settings → Roles, then rerun.`
                    );
                    break;
                }
                const tag = target.name;
                const tid = target.id;
                await guild.roles.delete(target, 'Owner request: delete role');
                console.log(`🗑️ Deleted role "${tag}" (${tid}).`);
                break;
            }

            case 'setup-onboarding':
                console.log(
                    'Edition roles + #onboarding are managed by discord_setup_onboarding.mjs (not this CLI).\n' +
                        'From town-directory/ run:\n' +
                        '  npm run discord:setup-onboarding\n' +
                        '  npm run discord:onboarding-bot\n' +
                        'See .env.discord.example for DISCORD_ROLE_EDITION_* and related IDs.'
                );
                break;

            case 'setup-standard':
                console.log('🏗️ Starting Standard Server Setup...');
                const infoCat = await guild.channels.create({ name: '📢 INFORMATION', type: ChannelType.GuildCategory });
                await guild.channels.create({ name: 'announcements', type: ChannelType.GuildText, parent: infoCat.id });
                await guild.channels.create({ name: 'welcome', type: ChannelType.GuildText, parent: infoCat.id });

                const communityCat = await guild.channels.create({ name: '💬 COMMUNITY', type: ChannelType.GuildCategory });
                await guild.channels.create({ name: 'general', type: ChannelType.GuildText, parent: communityCat.id });
                await guild.channels.create({ name: 'campaign-ideas', type: ChannelType.GuildText, parent: communityCat.id });

                const devCat = await guild.channels.create({ name: '🛠️ DEVELOPMENT', type: ChannelType.GuildCategory });
                await guild.channels.create({ name: 'bug-reports', type: ChannelType.GuildText, parent: devCat.id });
                await guild.channels.create({ name: 'deploy-logs', type: ChannelType.GuildText, parent: devCat.id });

                console.log('✅ Standard Setup Complete!');
                break;

            default:
                console.log(
                    'Commands: list-channels | list-tree | list-roles | set-bot-nickname <name|empty> | hoist-member-roles | grant-admin-full [role-id|role-name] | delete-role <id|name> | create-category <name> | create-channel <name> <parentId> [voice] | delete-channel <id> | rename-channel <id> <new-name> | move-channel <id> <parentCategoryId> | setup-onboarding | setup-standard'
                );
                console.log('Set DISCORD_GUILD_ID in .env.discord when the bot is in multiple servers.');
        }

    } catch (err) {
        console.error('❌ Discord Error:', err.message);
    } finally {
        client.destroy();
    }
}

run();
