import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '..', '..', '.env.discord');

/** UTF-8 BOM strip (Windows editors). */
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

export function loadEnvDiscord() {
    if (!fs.existsSync(ENV_PATH)) {
        return false;
    }
    const raw = readUtf8FileStripBom(ENV_PATH);
    const parsed = dotenv.parse(raw);
    for (const [key, val] of Object.entries(parsed)) {
        if (process.env[key] === undefined) {
            process.env[key] = val;
        }
    }
    return true;
}

export function discordToken() {
    return (process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN || '').trim();
}
