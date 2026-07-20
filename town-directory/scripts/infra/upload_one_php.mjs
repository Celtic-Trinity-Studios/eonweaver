#!/usr/bin/env node
/**
 * Upload a single PHP file to FTP (worldscribe or eonweaver).
 * Usage: node scripts/infra/upload_one_php.mjs eonweaver roster_generator.php
 */
import ftp from "basic-ftp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const townDir = path.resolve(__dirname, "../..");

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

const target = process.argv[2] || "eonweaver";
const file = process.argv[3] || "roster_generator.php";
const envFile = target === "worldscribe" ? "deploy.env.worldscribe" : "deploy.env.eonweaver";

loadDeployEnv(envFile);

const localPath = path.join(townDir, file);
if (!fs.existsSync(localPath)) {
    console.error(`Local file missing: ${localPath}`);
    process.exit(1);
}

const client = new ftp.Client();
try {
    await client.access({
        host: process.env.EW_FTP_HOST,
        user: process.env.EW_FTP_USER,
        password: process.env.EW_FTP_PASS,
        secure: String(process.env.EW_FTP_SECURE || "false").toLowerCase() === "true",
    });

    const isEonweaver = envFile === "deploy.env.eonweaver";
    let remotePath = "";
    if (isEonweaver) {
        remotePath = (process.env.EW_FTP_EONWEAVER_REMOTE_PATH || "").trim().replace(/^\/+|\/+$/g, "");
        if (!remotePath && String(process.env.EW_USE_LEGACY_FTP_REMOTE_PATH || "").toLowerCase() === "true") {
            remotePath = (process.env.EW_FTP_REMOTE_PATH || "").trim().replace(/^\/+|\/+$/g, "");
        }
    } else {
        remotePath = (process.env.EW_FTP_REMOTE_PATH || "").trim().replace(/^\/+|\/+$/g, "");
    }
    if (remotePath) {
        try {
            await client.cd(remotePath);
        } catch {
            await client.ensureDir(remotePath);
            await client.cd(remotePath);
        }
    }

    await client.uploadFrom(localPath, path.basename(file));
    console.log(`Uploaded ${file} via ${envFile}`);
} catch (err) {
    console.error(err);
    process.exit(1);
} finally {
    client.close();
}
