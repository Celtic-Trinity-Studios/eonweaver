<?php
/**
 * Discord onboarding: edition role buttons (MESSAGE_COMPONENT interactions).
 *
 * Configure in config.php — see config.example.php.
 * Requires discord_member_sync_lib.php (DISCORD_GUILD_ID, DISCORD_BOT_TOKEN).
 */
if (!function_exists('ew_discord_api_json')) {
    require_once __DIR__ . '/discord_member_sync_lib.php';
}

/** Bump when onboarding interaction behavior changes (visible in bot replies after deploy). */
const EW_DISCORD_ONBOARDING_HANDLER_VERSION = '2026-05-15-toggle-multi';

/** @return array<string,string> edition key → role snowflake */
function ew_discord_edition_role_ids_map(): array
{
    static $defaults = [
        '35e' => '',
        '5e' => '',
        '5e2024' => '',
    ];
    if (!defined('DISCORD_EDITION_ROLE_IDS_JSON') || trim((string) DISCORD_EDITION_ROLE_IDS_JSON) === '') {
        return $defaults;
    }
    $decoded = json_decode((string) DISCORD_EDITION_ROLE_IDS_JSON, true);
    if (!is_array($decoded)) {
        return $defaults;
    }
    return array_merge($defaults, array_intersect_key($decoded, $defaults));
}

function ew_discord_onboarding_interactions_configured(): bool
{
    return ew_discord_sync_configured()
        && defined('DISCORD_PUBLIC_KEY')
        && trim((string) DISCORD_PUBLIC_KEY) !== ''
        && defined('DISCORD_APPLICATION_ID')
        && trim((string) DISCORD_APPLICATION_ID) !== ''
        && array_filter(ew_discord_edition_role_ids_map()) !== [];
}

/** @return array<string,array{emoji:string,label:string}> */
function ew_discord_edition_button_meta(): array
{
    return [
        '35e' => ['emoji' => '📖', 'label' => 'Edition · 3.5e'],
        '5e' => ['emoji' => '📜', 'label' => 'Edition · 5e (2014)'],
        '5e2024' => ['emoji' => '✨', 'label' => 'Edition · 5e (2024)'],
    ];
}

function ew_discord_edition_key_from_custom_id(string $customId): ?string
{
    $map = [
        'ew_role_edition_35e' => '35e',
        'ew_role_edition_5e' => '5e',
        'ew_role_edition_5e2024' => '5e2024',
    ];
    return $map[$customId] ?? null;
}

function ew_discord_verify_interaction_request(string $rawBody): bool
{
    $publicKey = defined('DISCORD_PUBLIC_KEY') ? trim((string) DISCORD_PUBLIC_KEY) : '';
    if ($publicKey === '' || !function_exists('sodium_crypto_sign_verify_detached')) {
        return false;
    }

    $sigHex = (string) ($_SERVER['HTTP_X_SIGNATURE_ED25519'] ?? '');
    $timestamp = (string) ($_SERVER['HTTP_X_SIGNATURE_TIMESTAMP'] ?? '');
    if ($sigHex === '' || $timestamp === '' || !ctype_xdigit($sigHex)) {
        return false;
    }

    if (abs(time() - (int) $timestamp) > 300) {
        return false;
    }

    $sig = sodium_hex2bin($sigHex);
    $key = sodium_hex2bin($publicKey);
    if ($sig === false || $key === false) {
        return false;
    }

    return sodium_crypto_sign_verify_detached($sig, $timestamp . $rawBody, $key);
}

/** @param list<string> $memberRoleIds */
function ew_discord_format_active_edition_roles(array $memberRoleIds): string
{
    $roleMap = ew_discord_edition_role_ids_map();
    $meta = ew_discord_edition_button_meta();
    $idToKey = [];
    foreach ($roleMap as $key => $rid) {
        $rid = trim((string) $rid);
        if ($rid !== '') {
            $idToKey[$rid] = $key;
        }
    }

    $labels = [];
    foreach ($memberRoleIds as $rid) {
        $key = $idToKey[$rid] ?? null;
        if ($key !== null) {
            $labels[] = $meta[$key]['label'] ?? $key;
        }
    }

    if ($labels === []) {
        return '_No edition roles selected._';
    }

    return '**Your editions:** ' . implode(', ', $labels);
}

/**
 * Toggle one edition role (members may hold multiple editions).
 *
 * @param list<string>|null $currentRoles
 * @return array{ok:bool,error?:string,http?:int,roles_after?:list<string>,edition?:string,action?:'added'|'removed'}
 */
function ew_discord_toggle_edition_role_for_member(string $discordUserId, string $editionKey, ?array $currentRoles = null): array
{
    if (!ew_discord_sync_configured()) {
        return ['ok' => false, 'error' => 'discord_sync_not_configured'];
    }

    $roleMap = ew_discord_edition_role_ids_map();
    $targetId = trim((string) ($roleMap[$editionKey] ?? ''));
    if ($targetId === '') {
        return ['ok' => false, 'error' => 'edition_role_not_mapped', 'edition' => $editionKey];
    }

    if ($currentRoles === null) {
        $guildId = (string) DISCORD_GUILD_ID;
        $get = ew_discord_api_json(
            'GET',
            '/guilds/' . rawurlencode($guildId) . '/members/' . rawurlencode($discordUserId)
        );
        if (!$get['ok']) {
            return ['ok' => false, 'error' => $get['error'] ?? 'get_member_failed', 'http' => $get['http'] ?? 0];
        }
        $currentRoles = [];
        if (!empty($get['data']['roles']) && is_array($get['data']['roles'])) {
            $currentRoles = array_values(array_map('strval', $get['data']['roles']));
        }
    }

    $hasTarget = in_array($targetId, $currentRoles, true);
    if ($hasTarget) {
        $merged = array_values(array_filter($currentRoles, static fn($rid) => $rid !== $targetId));
        $action = 'removed';
    } else {
        $merged = $currentRoles;
        $merged[] = $targetId;
        $action = 'added';
    }

    $guildId = (string) DISCORD_GUILD_ID;
    $patch = ew_discord_api_json(
        'PATCH',
        '/guilds/' . rawurlencode($guildId) . '/members/' . rawurlencode($discordUserId),
        ['roles' => $merged]
    );

    if (!$patch['ok']) {
        return [
            'ok' => false,
            'error' => $patch['error'] ?? 'patch_member_failed',
            'http' => $patch['http'] ?? 0,
            'edition' => $editionKey,
        ];
    }

    return ['ok' => true, 'roles_after' => $merged, 'edition' => $editionKey, 'action' => $action];
}

/**
 * @return array{ok:bool,response?:array,error?:string}
 */
function ew_discord_edit_interaction_followup(string $interactionToken, string $content): array
{
    $appId = trim((string) DISCORD_APPLICATION_ID);
    if ($appId === '') {
        return ['ok' => false, 'error' => 'application_id_not_set'];
    }

    $url = 'https://discord.com/api/v10/webhooks/' . rawurlencode($appId) . '/' . rawurlencode($interactionToken)
        . '/messages/@original';

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => 'PATCH',
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode(['content' => mb_substr($content, 0, 2000)], JSON_UNESCAPED_UNICODE),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
    ]);
    $response = curl_exec($ch);
    $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($curlErr) {
        return ['ok' => false, 'error' => 'curl: ' . $curlErr, 'http' => $http];
    }
    if ($http >= 200 && $http < 300) {
        return ['ok' => true];
    }

    return ['ok' => false, 'error' => substr((string) $response, 0, 300), 'http' => $http];
}

/**
 * Handle one interaction payload from Discord (HTTP interactions endpoint).
 *
 * @return array Discord interaction response body
 */
function ew_discord_handle_onboarding_interaction(array $interaction): array
{
    $type = (int) ($interaction['type'] ?? 0);
    if ($type === 1) {
        return ['type' => 1];
    }

    if ($type !== 3) {
        return [
            'type' => 4,
            'data' => [
                'content' => 'Unsupported interaction.',
                'flags' => 64,
            ],
        ];
    }

    $customId = (string) ($interaction['data']['custom_id'] ?? '');
    $editionKey = ew_discord_edition_key_from_custom_id($customId);
    if ($editionKey === null) {
        return [
            'type' => 4,
            'data' => [
                'content' => 'Unknown button.',
                'flags' => 64,
            ],
        ];
    }

    if (!ew_discord_onboarding_interactions_configured()) {
        return [
            'type' => 4,
            'data' => [
                'content' => 'Onboarding is not configured on the server yet (edition roles / public key).',
                'flags' => 64,
            ],
        ];
    }

    $userId = (string) ($interaction['member']['user']['id'] ?? $interaction['user']['id'] ?? '');
    if ($userId === '') {
        return [
            'type' => 4,
            'data' => [
                'content' => 'Could not resolve your Discord user.',
                'flags' => 64,
            ],
        ];
    }

    $currentRoles = [];
    if (!empty($interaction['member']['roles']) && is_array($interaction['member']['roles'])) {
        $currentRoles = array_values(array_map('strval', $interaction['member']['roles']));
    }

    $token = (string) ($interaction['token'] ?? '');
    $defer = ['type' => 5, 'data' => ['flags' => 64]];

    // Caller should echo $defer, finish request, then call apply + followup when using fastcgi_finish_request.
    return [
        '_defer' => $defer,
        '_edition_key' => $editionKey,
        '_user_id' => $userId,
        '_current_roles' => $currentRoles,
        '_token' => $token,
    ];
}

/**
 * After defer response was sent to Discord, assign role and patch the ephemeral message.
 */
function ew_discord_finish_onboarding_interaction(
    string $editionKey,
    string $userId,
    string $interactionToken,
    ?array $currentRoles = null
): void {
    $meta = ew_discord_edition_button_meta();
    // Always fetch live roles from the API — interaction payloads are stale (breaks multi-edition toggles).
    $result = ew_discord_toggle_edition_role_for_member($userId, $editionKey, null);

    if ($result['ok']) {
        $m = $meta[$editionKey] ?? ['emoji' => '✅', 'label' => $editionKey];
        $verb = ($result['action'] ?? 'added') === 'removed' ? 'Removed' : 'Added';
        $summary = ew_discord_format_active_edition_roles($result['roles_after'] ?? []);
        $content = $m['emoji'] . ' **' . $verb . '** ' . $m['label'] . ".\n" . $summary
            . "\n_Click the same button again to toggle off. Multiple editions are OK._"
            . "\n`handler " . EW_DISCORD_ONBOARDING_HANDLER_VERSION . '`';
    } else {
        $err = $result['error'] ?? 'unknown';
        $content = 'Could not update roles: ' . $err
            . ' (check bot **Manage Roles** and role order above edition roles).';
    }

    ew_discord_edit_interaction_followup($interactionToken, $content);
}
