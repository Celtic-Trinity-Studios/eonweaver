/**
 * Upload only homepage + 404 (AdSense head snippet).
 * Usage: node scripts/infra/upload_index.mjs eonweaver
 */
import ftp from "basic-ftp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const townDir = path.resolve(__dirname, "../..");
const target = process.argv[2] || "eonweaver";
const envFile =
  target === "worldscribe" ? "deploy.env.worldscribe" : "deploy.env.eonweaver";

function loadDeployEnv(envName) {
  const envPath = path.join(townDir, envName);
  if (!fs.existsSync(envPath)) {
    console.error(`Missing ${envName}`);
    process.exit(1);
  }
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadDeployEnv(envFile);
if (envFile === "deploy.env.eonweaver") {
  process.env.EW_ALLOW_EONWEAVER_DEPLOY = "true";
}

const client = new ftp.Client();
try {
  await client.access({
    host: process.env.EW_FTP_HOST,
    user: process.env.EW_FTP_USER,
    password: process.env.EW_FTP_PASS,
    secure: String(process.env.EW_FTP_SECURE || "false").toLowerCase() === "true",
  });

  let remotePath = "";
  if (envFile === "deploy.env.eonweaver") {
    remotePath = (process.env.EW_FTP_EONWEAVER_REMOTE_PATH || "")
      .trim()
      .replace(/^\/+|\/+$/g, "");
  } else {
    remotePath = (process.env.EW_FTP_REMOTE_PATH || "")
      .trim()
      .replace(/^\/+|\/+$/g, "");
  }
  if (remotePath) {
    try {
      await client.cd(remotePath);
    } catch {
      await client.ensureDir(remotePath);
      await client.cd(remotePath);
    }
  }

  console.log(`Uploading index.html + 404.html via ${envFile} → ${await client.pwd()}`);
  await client.uploadFrom(path.join(townDir, "live", "index.html"), "index.html");
  console.log("  OK: index.html");
  await client.uploadFrom(path.join(townDir, "404.html"), "404.html");
  console.log("  OK: 404.html");
} catch (err) {
  console.error(err);
  process.exit(1);
} finally {
  client.close();
}
