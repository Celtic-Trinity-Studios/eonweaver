/**
 * Upload discord_interactions.php + discord_onboarding_lib.php only.
 *   node scripts/discord/upload_interactions_php.mjs worldscribe
 *   node scripts/discord/upload_interactions_php.mjs eonweaver
 */
import ftp from 'basic-ftp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');

const target = process.argv[2] || 'eonweaver';
const envFile =
    target === 'eonweaver'
        ? path.join(root, 'deploy.env.eonweaver')
        : path.join(root, 'deploy.env.worldscribe');

if (!fs.existsSync(envFile)) {
    console.error(`Missing ${envFile}`);
    process.exit(1);
}

for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
}

const files = ['discord_interactions.php', 'discord_onboarding_lib.php', 'discord_member_sync_lib.php'];

const client = new ftp.Client();
client.ftp.verbose = true;
try {
    await client.access({
        host: process.env.EW_FTP_HOST,
        user: process.env.EW_FTP_USER,
        password: process.env.EW_FTP_PASS,
        secure: String(process.env.EW_FTP_SECURE || 'false').toLowerCase() === 'true',
    });
    const isEon = target === 'eonweaver';
    let remotePath = '';
    if (isEon) {
        remotePath = (process.env.EW_FTP_EONWEAVER_REMOTE_PATH || '').trim().replace(/^\/+|\/+$/g, '');
        if (!remotePath && String(process.env.EW_FTP_REMOTE_PATH || '').toLowerCase() === 'public_html') {
            remotePath = '';
        } else if (!remotePath) {
            remotePath = (process.env.EW_FTP_REMOTE_PATH || '').trim().replace(/^\/+|\/+$/g, '');
        }
    } else {
        remotePath = (process.env.EW_FTP_REMOTE_PATH || '').trim().replace(/^\/+|\/+$/g, '');
    }
    if (remotePath) {
        try {
            await client.cd(remotePath);
        } catch {
            await client.ensureDir(remotePath);
            await client.cd(remotePath);
        }
    }
    console.log(`Uploading to ${target} (${await client.pwd()})…`);
    for (const file of files) {
        await client.uploadFrom(path.join(root, file), file);
        console.log(`  OK ${file}`);
    }
    console.log('Done.');
} catch (e) {
    console.error(e);
    process.exit(1);
} finally {
    client.close();
}
