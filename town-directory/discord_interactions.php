<?php
/**
 * Discord Interactions endpoint — edition buttons on #onboarding (no Node process required).
 *
 * Developer Portal → your app → General → Interactions Endpoint URL:
 *   https://YOUR_PUBLIC_HOST/discord_interactions.php
 *
 * Requires config.php: DISCORD_PUBLIC_KEY, DISCORD_APPLICATION_ID, DISCORD_GUILD_ID,
 * DISCORD_BOT_TOKEN, DISCORD_EDITION_ROLE_IDS_JSON (see config.example.php).
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$configPath = __DIR__ . '/config.php';
if (is_readable($configPath)) {
    require_once $configPath;
}

require_once __DIR__ . '/discord_onboarding_lib.php';

$raw = file_get_contents('php://input') ?: '';

if (!ew_discord_verify_interaction_request($raw)) {
    http_response_code(401);
    echo json_encode(['error' => 'invalid_request_signature']);
    exit;
}

$interaction = json_decode($raw, true);
if (!is_array($interaction)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_json']);
    exit;
}

$handled = ew_discord_handle_onboarding_interaction($interaction);

if (($handled['type'] ?? 0) === 1) {
    echo json_encode(['type' => 1]);
    exit;
}

if (!isset($handled['_defer'])) {
    echo json_encode($handled);
    exit;
}

$defer = $handled['_defer'];
echo json_encode($defer);

if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request();
} else {
    if (ob_get_level() > 0) {
        ob_end_flush();
    }
    flush();
}

ew_discord_finish_onboarding_interaction(
    (string) $handled['_edition_key'],
    (string) $handled['_user_id'],
    (string) $handled['_token'],
    $handled['_current_roles'] ?? null
);
