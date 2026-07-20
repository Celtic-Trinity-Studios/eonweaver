#!/usr/bin/env node
/**
 * Upload Stripe billing files only (no SPA rebuild).
 * Usage: node scripts/stripe/deploy_stripe.mjs eonweaver
 */
import ftp from "basic-ftp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "..");

function resolveDeployEnvPath() {
  const target = process.argv[2] || "eonweaver";
  if (target === "worldscribe") return path.join(root, "deploy.env.worldscribe");
  if (target === "eonweaver") return path.join(root, "deploy.env.eonweaver");
  return path.join(root, "deploy.env");
}

function loadDeployEnv(envPath) {
  if (!fs.existsSync(envPath)) {
    console.error(`Missing ${path.basename(envPath)} — copy deploy.env.example and set EW_FTP_*`);
    process.exit(1);
  }
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
  if (path.basename(envPath) === "deploy.env.eonweaver") {
    process.env.EW_ALLOW_EONWEAVER_DEPLOY = "true";
  }
  console.log(`Using ${path.basename(envPath)}`);
}

const STRIPE_FILES = ["stripe_billing_lib.php", "stripe_webhook.php", "config.stripe.php", "api.php", "tier_economics.php", "helpers.php", "tier_limits.php"];

async function main() {
  const envPath = resolveDeployEnvPath();
  loadDeployEnv(envPath);
  const host = process.env.EW_FTP_HOST;
  const user = process.env.EW_FTP_USER;
  const password = process.env.EW_FTP_PASS;
  if (!host || !user || !password) {
    console.error("EW_FTP_HOST, EW_FTP_USER, EW_FTP_PASS required");
    process.exit(1);
  }

  for (const file of STRIPE_FILES) {
    if (!fs.existsSync(path.join(root, file))) {
      console.error(`Missing local file: ${file}`);
      process.exit(1);
    }
  }

  const client = new ftp.Client();
  client.ftp.verbose = true;
  try {
    await client.access({
      host,
      user,
      password,
      secure: String(process.env.EW_FTP_SECURE || "false").toLowerCase() === "true",
    });

    const isEonweaver = path.basename(envPath) === "deploy.env.eonweaver";
    let remotePath = "";
    if (isEonweaver) {
      remotePath = (process.env.EW_FTP_EONWEAVER_REMOTE_PATH || "").trim().replace(/^\/+|\/+$/g, "");
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

    console.log("Uploading Stripe billing files…");
    for (const file of STRIPE_FILES) {
      await client.uploadFrom(path.join(root, file), file);
      console.log(`  OK: ${file}`);
    }
    console.log("Stripe deploy complete.");
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    client.close();
  }
}

main();
