const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");

/**
 * Which credential file to load (never guess production vs staging):
 *   node deploy.cjs worldscribe   -> deploy.env.worldscribe
 *   node deploy.cjs eonweaver     -> deploy.env.eonweaver
 *   node deploy.cjs               -> deploy.env (legacy default)
 *   node deploy.cjs --env-file=my.env
 */
function resolveDeployEnvPath() {
    const argv = process.argv.slice(2);
    for (const a of argv) {
        if (a.startsWith("--env-file=")) {
            const p = a.slice("--env-file=".length).trim().replace(/^["']|["']$/g, "");
            return path.isAbsolute(p) ? p : path.join(__dirname, p);
        }
    }
    const positional = argv.filter((a) => !a.startsWith("-"));
    const first = positional[0];
    if (first === "worldscribe") {
        return path.join(__dirname, "deploy.env.worldscribe");
    }
    if (first === "eonweaver") {
        return path.join(__dirname, "deploy.env.eonweaver");
    }
    return path.join(__dirname, "deploy.env");
}

function loadDeployEnv() {
    const envPath = resolveDeployEnvPath();
    if (!fs.existsSync(envPath)) {
        console.error(
            `Missing ${path.basename(envPath)} — copy deploy.env.example, save as that filename, and set EW_FTP_*.\n` +
                "Tip: use `node deploy.cjs worldscribe` or `node deploy.cjs eonweaver` to pick the right file."
        );
        process.exit(1);
    }
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
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
        // Always apply values from the chosen deploy file so a stray EW_FTP_REMOTE_PATH
        // from the parent shell cannot point staging FTP at the wrong subtree.
        process.env[key] = val;
    }
    // Choosing deploy.env.eonweaver explicitly means production deploy intent.
    if (path.basename(envPath) === "deploy.env.eonweaver") {
        process.env.EW_ALLOW_EONWEAVER_DEPLOY = "true";
    }
    console.log(`Using deploy env file: ${path.relative(process.cwd(), envPath) || envPath}`);
}

async function deploy() {
    loadDeployEnv();
    const host = process.env.EW_FTP_HOST;
    const user = process.env.EW_FTP_USER;
    const password = process.env.EW_FTP_PASS;
    const secure = String(process.env.EW_FTP_SECURE || "false").toLowerCase() === "true";
    if (!host || !user || !password) {
        console.error("deploy.env must define EW_FTP_HOST, EW_FTP_USER, and EW_FTP_PASS.");
        process.exit(1);
    }

    const prodMarker = /eonweaver\.com/i;
    if (prodMarker.test(user)) {
        const allowed = String(process.env.EW_ALLOW_EONWEAVER_DEPLOY || "").toLowerCase() === "true";
        if (!allowed) {
            console.error(
                "\nRefusing FTP deploy: EW_FTP_USER looks like eonweaver.com PRODUCTION.\n" +
                    "Default deploy target is WorldScribe only. To deploy production, add this line to deploy.env:\n" +
                    "  EW_ALLOW_EONWEAVER_DEPLOY=true\n"
            );
            process.exit(1);
        }
        console.warn("\n>>> Deploying to EONWEAVER.COM (production) — EW_ALLOW_EONWEAVER_DEPLOY=true <<<\n");
    }

    const client = new ftp.Client();
    client.ftp.verbose = true;
    try {
        console.log("Connecting to FTP...");
        await client.access({ host, user, password, secure });

        const envPathUsed = resolveDeployEnvPath();
        const isEonweaverEnv = path.basename(envPathUsed) === "deploy.env.eonweaver";
        let remotePath = "";
        if (isEonweaverEnv) {
            remotePath = (process.env.EW_FTP_EONWEAVER_REMOTE_PATH || "").trim().replace(/^\/+|\/+$/g, "");
            if (!remotePath && String(process.env.EW_USE_LEGACY_FTP_REMOTE_PATH || "").toLowerCase() === "true") {
                remotePath = (process.env.EW_FTP_REMOTE_PATH || "").trim().replace(/^\/+|\/+$/g, "");
            }
        } else {
            remotePath = (process.env.EW_FTP_REMOTE_PATH || "").trim().replace(/^\/+|\/+$/g, "");
        }
        if (remotePath) {
            const pwd = await client.pwd();
            const norm = pwd.replace(/\\/g, "/").replace(/\/+$/, "");
            const lastSeg = norm.split("/").filter(Boolean).pop() || "";
            const alreadyAtRemote = lastSeg === remotePath;
            if (alreadyAtRemote) {
                console.log(`FTP login directory is already ${remotePath} (${pwd}).`);
            } else {
                try {
                    await client.cd(remotePath);
                    console.log(`Remote directory: ${remotePath}`);
                } catch {
                    await client.ensureDir(remotePath);
                    await client.cd(remotePath);
                    console.log(`Remote directory: ${remotePath} (created)`);
                }
            }
        }

        const siteRoot = await client.pwd();
        const L = (...parts) => path.join(__dirname, ...parts);

        console.log("Connected! Uploading PHP backend files...");
        const phpFiles = [
            "api.php", "db.php", "setup_mysql.php", "config.php", "simulate.php",
            "calendar_advance_lib.php", "calendar_display_lib.php",
            "sim_apply.php", "sim_run.php", "sim_plan.php", "sim_prompt_lib.php", "toon_lib.php", "weather_daily_lib.php", "sim_single_town.php",
            "sim_world.php", "sim_level_up.php", "intake_actions.php", "scribe_actions.php", "auth.php",
            "upload_portrait.php", "upload_world_map.php", "helpers.php", "pricing.php", "llm_local.php", "import_srd.php",
            "import_5e_srd.php", "setup_srd_dbs.php", "migrate_srd.php", "reset_app_data.php", "discord.php", "discord_member_sync_lib.php",
            "macro_framework_lib.php", "tier_policy.php", "tier_limits.php", "tier_economics.php", "signup_policy.php", "smtp_mail.php",
            "verify_email.php", "metrics_lib.php", "sitemap.php",
            "user_db.php",
        ];

        for (const file of phpFiles) {
            try {
                await client.uploadFrom(L(file), file);
                console.log(`  OK: ${file}`);
            } catch (err) {
                console.log(`  Skip: ${file} (local missing)`);
            }
        }

        console.log("Uploading assets folder (per file — failures are visible)...");
        // ensureDir() cds into each segment; ends with cwd inside assets/. Upload filenames only.
        await client.ensureDir("assets");
        const assetsDir = L("live", "assets");
        if (!fs.existsSync(assetsDir)) {
            console.error("Missing live/assets — run npm run build first.");
            process.exit(1);
        }
        const assetFiles = fs.readdirSync(assetsDir).filter((f) => fs.statSync(path.join(assetsDir, f)).isFile());
        assetFiles.sort((a, b) => fs.statSync(path.join(assetsDir, b)).size - fs.statSync(path.join(assetsDir, a)).size);
        for (const name of assetFiles) {
            const localPath = path.join(assetsDir, name);
            await client.uploadFrom(localPath, name);
            console.log(`  OK: assets/${name}`);
        }

        // CWD is inside assets/; SPA entry must land in site root (not cwd-relative live/).
        await client.cd(siteRoot);
        console.log("Uploading SPA root (index.html, 404.html, .htaccess, static)…");
        await client.uploadFrom(L("live", "index.html"), "index.html");
        if (fs.existsSync(L("404.html"))) {
            await client.uploadFrom(L("404.html"), "404.html");
        }
        try {
            await client.uploadFrom(L("live", ".htaccess"), ".htaccess");
        } catch (e) {}
        for (const rootFile of ["robots.txt", "sitemap.xml", "favicon.svg"]) {
            if (fs.existsSync(L(rootFile))) {
                await client.uploadFrom(L(rootFile), rootFile);
                console.log(`  OK: ${rootFile}`);
            }
        }

        console.log("Deployment complete!");
    } catch (err) {
        console.error("FTP Error: ", err);
    }
    client.close();
}

deploy();
