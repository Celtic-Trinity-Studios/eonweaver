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
define('ALLOW_REGISTRATION', true);     // Set false to lock signups
define('BETA_KEY', 'your-beta-key-here');

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
