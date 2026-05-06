const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");

function loadDeployEnv() {
    const envPath = path.join(__dirname, "deploy.env");
    if (!fs.existsSync(envPath)) {
        console.error(
            "Missing deploy.env — copy deploy.env.example to deploy.env and set EW_FTP_HOST, EW_FTP_USER, EW_FTP_PASS."
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
        if (!(key in process.env) || process.env[key] === "") {
            process.env[key] = val;
        }
    }
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

    const client = new ftp.Client();
    client.ftp.verbose = true;
    try {
        console.log("Connecting to FTP...");
        await client.access({ host, user, password, secure });
        console.log("Connected! Uploading PHP backend files...");
        const phpFiles = [
            "api.php", "db.php", "setup_mysql.php", "config.php", "simulate.php",
            "sim_apply.php", "sim_run.php", "sim_plan.php", "sim_single_town.php",
            "sim_world.php", "sim_level_up.php", "intake_actions.php", "auth.php",
            "upload_portrait.php", "helpers.php", "llm_local.php", "import_srd.php",
            "import_5e_srd.php", "setup_srd_dbs.php", "migrate_srd.php", "reset_app_data.php", "discord.php",
        ];

        for (const file of phpFiles) {
            try {
                await client.uploadFrom(file, file);
                console.log(`  OK: ${file}`);
            } catch (err) {
                console.log(`  Skip: ${file} (local missing)`);
            }
        }

        console.log("Uploading index.html and .htaccess...");
        await client.uploadFrom("live/index.html", "index.html");
        try {
            await client.uploadFrom("live/.htaccess", ".htaccess");
        } catch (e) {}

        console.log("Uploading assets folder...");
        await client.ensureDir("assets");
        await client.cd("/");
        await client.uploadFromDir("live/assets", "assets");

        console.log("Deployment complete!");
    } catch (err) {
        console.error("FTP Error: ", err);
    }
    client.close();
}

deploy();
