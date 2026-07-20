import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'basic-ftp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2] || 'worldscribe';
const envName = target === 'eonweaver' ? 'deploy.env.eonweaver' : 'deploy.env.worldscribe';
const vars = {};
for (const line of fs.readFileSync(path.join(root, envName), 'utf8').split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i < 1) continue;
  vars[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}

const client = new Client();
await client.access({
  host: vars.EW_FTP_HOST,
  user: vars.EW_FTP_USER,
  password: vars.EW_FTP_PASS,
  secure: false,
});
await client.uploadFrom(path.join(root, '.htaccess'), '.htaccess');
console.log(`Uploaded .htaccess to ${target}`);
client.close();
