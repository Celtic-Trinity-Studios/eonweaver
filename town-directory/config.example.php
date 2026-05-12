<?php
/**
 * Eon Weaver — Configuration
 * MySQL database backend
 *
 * ⚠️  Copy this file to config.php and fill in your credentials.
 *     Never commit config.php to git.
 */

// ── Sessions ─────────────────────────────────────────────
define('SESSION_NAME', 'eonweaver_session');
define('SESSION_LIFETIME', 86400 * 7);  // 7 days

// ── App Settings ─────────────────────────────────────────
define('APP_NAME', 'Eon Weaver');
// OpenRouter attribution (production site — keep accurate for their ToS)
define('APP_PUBLIC_URL', 'https://eonscribe.com');
define('APP_PUBLIC_TITLE', 'Eon Weaver');
define('ALLOW_REGISTRATION', true);     // Set false to lock signups

// ── SMTP (required for email verification on public signups) ──
// Leave SMTP_HOST empty on local dev to skip verification mail and auto-confirm new accounts.
define('SMTP_HOST', '');              // e.g. smtp.example.com
define('SMTP_PORT', 587);
define('SMTP_USER', '');
define('SMTP_PASS', '');
define('SMTP_FROM', '');             // Must be a permitted sender at your provider
define('SMTP_FROM_NAME', APP_NAME);
define('SMTP_USE_TLS', true);        // STARTTLS on port 587

// ── Signup abuse controls ──────────────────────────────────
define('SIGNUP_MAX_PER_IP_PER_DAY', 3);
define('SIGNUP_MAX_PER_IP_PER_WEEK', 10);
// Uses ip-api.com (free). Blocks VPN/hosting/datacenter IPs when true (may block legitimate CGNAT).
define('BLOCK_DATACENTER_SIGNUPS', false);

// Demo tier: raw token grant applied after email verification (≈300000 ≈ 1.5 EC at 200k raw/EC).
define('FREE_SIGNUP_CREDIT_GRANT_RAW', 300000);
// Optional: must match src/constants/credits.js — billing buckets in helpers.php use this.
// define('TOKENS_PER_CREDIT', 200000);
// Intake wallet debits use fixed raw amounts in pricing.php (keep in sync with src/constants/pricing.js).

// Optional: default monthly raw-token caps (when site_settings has no override) use list prices
// from tier_limits.php and your loaded LLM cost per displayed EC:
//   define('EW_EC_MAINTAINER_COST_USD', 0.15);        // ~your blended $/displayed EC (telemetry: ~$0.80/M raw @ 200k/EC ≈ 0.16)
//   define('EW_MONTHLY_CAP_ARPU_FRACTION', 0.45);     // full-cap imputed burn ≤ this × list USD/mo; 0.45 → ~55% ARPU for fees/hosting/margin
// Tighter margin: lower this (e.g. 0.40) or raise maintainer. More headroom for users: raise to 0.50–0.55 (watch margin).
// Subscription monthly raw-token ceilings — defaults from tier_economics.php; override per tier
// in MySQL site_settings as token_limit_{tier} (0 = no monthly cap, wallet-only). Free defaults to 0.
// Legacy retail anchor for top-ups: US$0.22 / 1.5 EC.
// Max NPCs/residents per town on Free tier (manual adds + imports enforce server-side).
define('FREE_TIER_MAX_RESIDENTS', 15);

// ── Free-tier ads (Google AdSense) ───────────────────────
// Get ca-pub-… from AdSense; create a display unit for the sidebar slot.
define('ADSENSE_FREE_TIER_CLIENT', '');       // e.g. ca-pub-xxxxxxxxxxxxxxxx
define('ADSENSE_FREE_TIER_SLOT_SIDEBAR', ''); // data-ad-slot numeric string

// ── MySQL Database ───────────────────────────────────────
define('DB_HOST', 'localhost');
define('DB_NAME', 'your_db_name');
define('DB_USER', 'your_db_user');
define('DB_PASS', 'your_db_password');
define('DB_CHARSET', 'utf8mb4');

// ── SRD Edition Databases (one per edition) ─────────────
define('SRD_DBS', [
    '3.5e'   => ['db' => 'your_srd_35e_db',   'user' => 'your_srd_35e_user',   'pass' => 'your_password'],
    '5e'     => ['db' => 'your_srd_5e_db',     'user' => 'your_srd_5e_user',     'pass' => 'your_password'],
    '5e2024' => ['db' => 'your_srd_5e2024_db', 'user' => 'your_srd_5e2024_user', 'pass' => 'your_password'],
]);

// ── AI Simulation (OpenRouter API) ───────────────────────
define('OPENROUTER_API_KEY', 'sk-or-v1-your-key-here');
// ── Per-Feature API Keys (OpenRouter) ─────────────────────
// Each can be a separate OpenRouter key with independent spend limits.
define('OPENROUTER_KEY_SIM_STORY',       'sk-or-v1-your-key-here');
define('OPENROUTER_KEY_SIM_STRUCTURED',  'sk-or-v1-your-key-here');
define('OPENROUTER_KEY_SIM_SINGLE',      'sk-or-v1-your-key-here');
define('OPENROUTER_KEY_SIM_WORLD',       'sk-or-v1-your-key-here');
define('OPENROUTER_KEY_SIM_PLAN',        'sk-or-v1-your-key-here');
define('OPENROUTER_KEY_SIM_RUN',         'sk-or-v1-your-key-here');
define('OPENROUTER_KEY_LEVEL_UP',        'sk-or-v1-your-key-here');
define('OPENROUTER_KEY_INTAKE_ROSTER',   'sk-or-v1-your-key-here');
define('OPENROUTER_KEY_INTAKE_FLESH',    'sk-or-v1-your-key-here');
define('OPENROUTER_KEY_INTAKE_CUSTOM',   'sk-or-v1-your-key-here');
define('OPENROUTER_KEY_PORTRAIT',        'sk-or-v1-your-key-here');
define('OPENROUTER_KEY_WEATHER',         'sk-or-v1-your-key-here');

define('OPENROUTER_MODEL', 'google/gemini-2.5-flash');
define('OPENROUTER_MODEL_SMART', 'google/gemini-2.5-flash');
define('OPENROUTER_MODEL_CHEAP', 'google/gemini-2.5-flash-lite');

// Optional: set false in config.php to disable append-only JSONL at private_data/llm_training.jsonl (site-specific training export from intake).
// define('EW_LLM_TRAINING_LOG', false);

// ── AI prompt budgets (optional — trim context = fewer tokens per call) ──
// Roster: how many NPCs get full-detail rows in tiered tables (clamped 4–24 server-side).
// define('EW_SIM_ROSTER_DETAIL_CAP', 10);           // run_simulation / world / single-town
// define('EW_SIM_CHUNK_ROSTER_DETAIL_CAP', 10);     // simulate_chunk multi-phase months
// History block in sim prompts (when no rolling summary, uses digest + recent entries).
// define('EW_SIM_HISTORY_RECENT_KEEP', 2);
// define('EW_SIM_HISTORY_RECENT_BODY_MAX', 1200);
// define('EW_SIM_HISTORY_OLDER_DIGEST_MAX', 120);
// define('EW_SIM_HISTORY_MAX_OLDER_LINES', 20);
// Rolling summary excerpt sent to the model (characters).
// define('EW_SIM_ROLLING_SUMMARY_PROMPT_MAX', 2400);
// When rolling summary exists, how many newest DB history rows to append (1–3).
// define('EW_SIM_HISTORY_RECENT_WHEN_ROLLING', 1);

// run_simulation OpenRouter completion budget (multi-month-in-one-call needs more headroom).
// define('EW_SIM_RUN_MAX_OUTPUT_TOKENS', 65536);              // optional: fixed cap for ALL runs (single + multi)
// If unset: single-month stays 65536; 2+ months uses base + per-extra-month (see sim_run.php).
// define('EW_SIM_RUN_MAX_OUTPUT_MULTIMONTH_BASE', 22000);
// define('EW_SIM_RUN_MAX_OUTPUT_TOKENS_PER_EXTRA_MONTH', 18000);

// ── Local LLM (Ollama) ──────────────────────────────────
define('LLAMA_HOST', 'http://localhost:11434');
define('LLAMA_PORT', 11434);
define('LLAMA_MAX_TOKENS', 1024);
define('LLAMA_TEMPERATURE', 0.8);
define('LLAMA_TIMEOUT', 180);

// ── Portraits upload folder ──────────────────────────────
if (!function_exists('portraitsDir')) {
    function portraitsDir(int $userId): string
    {
        $dir = __DIR__ . '/portraits/' . $userId;
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        return $dir;
    }
}

if (!function_exists('portraitsUrl')) {
    function portraitsUrl(int $userId): string
    {
        return '/portraits/' . $userId . '/';
    }
}

// ── Discord membership ↔ roles (optional) ─────────────────
// Same bot token as local `.env.discord` / Discord Developer Portal application.
// Guild ID: Server Settings → Widget → Server ID (or enable Developer Mode → right‑click server → Copy ID).
// Role IDs: Developer Mode → Server Settings → Roles → right‑click role → Copy Role ID.
// Map each subscription tier to one role; leave empty string to only strip other tier roles for that tier.
// After changing tier or discord_user_id in Admin, the API updates Discord via REST (no long‑running bot required).
define('DISCORD_GUILD_ID', '');
define('DISCORD_BOT_TOKEN', '');
define(
    'DISCORD_TIER_ROLE_IDS_JSON',
    '{"free":"","apprentice":"","adventurer":"","guild_master":"","world_builder":""}'
);

// In-app “Report Bug” → Discord webhook (defaults are in discord.php; override here if needed).
// If bug-reports is a **forum** and posts must have a tag: Server Settings → Forums → bug-reports → Tags,
// right‑click tag → Copy ID, then:
// define('DISCORD_BUG_FORUM_APPLIED_TAGS', 'PASTE_TAG_SNOWFLAKE_HERE');
// New webhook URL after you move integrations to the forum channel:
// define('DISCORD_WEBHOOK_BUGS', 'https://discord.com/api/webhooks/…');
// Optional: override webhook display (defaults in discord.php: “Eon Weaver”):
// define('DISCORD_BUG_WEBHOOK_USERNAME', 'Eon Scribe');
// define('DISCORD_BUG_WEBHOOK_AVATAR_URL', 'https://…/custom.png'); // https only; omit to use APP_PUBLIC_URL + /eon-weaver-spider.png

// Deploy Discord pings: use **local** `node discord_deploy_notify.mjs` after FTP (see `.env.discord.example`).
// Server `config.php` does not need deploy channel IDs for that flow.
