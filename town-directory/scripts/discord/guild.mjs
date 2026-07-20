import { Client, GatewayIntentBits } from 'discord.js';
import { discordToken, loadEnvDiscord } from './env.mjs';

export async function connectGuild(intents = [GatewayIntentBits.Guilds]) {
    loadEnvDiscord();
    const token = discordToken();
    if (!token) {
        throw new Error('Missing DISCORD_TOKEN in town-directory/.env.discord');
    }

    const client = new Client({ intents });
    await client.login(token);

    const guildId = (process.env.DISCORD_GUILD_ID || '').trim();
    let guild;
    if (guildId) {
        guild = await client.guilds.fetch(guildId);
    } else {
        const first = (await client.guilds.fetch()).first();
        if (!first) {
            client.destroy();
            throw new Error('Bot is not in any server. Invite the bot first.');
        }
        guild = await first.fetch();
    }

    return { client, guild };
}

export const delay = (ms) => new Promise((r) => setTimeout(r, ms));
