<?php
/**
 * Sync Discord guild roles when a user's subscription_tier changes on the website.
 *
 * Configure in config.php (see config.example.php):
 *   DISCORD_GUILD_ID, DISCORD_BOT_TOKEN (same bot application as your Node tooling),
 *   DISCORD_TIER_ROLE_IDS_JSON — JSON map of tier key → Discord role snowflake.
 *
 * Requires users.discord_user_id (Discord snowflake). Bot must have Manage Roles and
 * sit above managed roles in the server's role list.
 */
if (!function_exists('query')) {
    require_once __DIR__ . '/db.php';
}

function ew_discord_sync_configured(): bool
{
    return defined('DISCORD_GUILD_ID')
        && (string) DISCORD_GUILD_ID !== ''
        && defined('DISCORD_BOT_TOKEN')
        && (string) DISCORD_BOT_TOKEN !== '';
}

function ew_discord_tier_role_ids_map(): array
{
    static $defaults = [
        'free' => '',
        'apprentice' => '',
        'adventurer' => '',
        'guild_master' => '',
        'world_builder' => '',
    ];
    if (!defined('DISCORD_TIER_ROLE_IDS_JSON') || (string) DISCORD_TIER_ROLE_IDS_JSON === '') {
        return $defaults;
    }
    $decoded = json_decode((string) DISCORD_TIER_ROLE_IDS_JSON, true);
    if (!is_array($decoded)) {
        return $defaults;
    }
    return array_merge($defaults, array_intersect_key($decoded, $defaults));
}

/** Non-empty role IDs listed in the tier map (roles we add/remove when syncing). */
function ew_discord_managed_role_id_set(): array
{
    $set = [];
    foreach (ew_discord_tier_role_ids_map() as $rid) {
        $rid = trim((string) $rid);
        if ($rid !== '') {
            $set[$rid] = true;
        }
    }
    return $set;
}

/**
 * @return array{ok:bool,skipped?:bool,reason?:string,error?:string,http?:int,member_roles?:string[]}
 */
function ew_discord_api_json(string $method, string $path, ?array $body = null): array
{
    $url = 'https://discord.com/api/v10' . $path;
    $ch = curl_init($url);
    $headers = [
        'Authorization: Bot ' . DISCORD_BOT_TOKEN,
        'User-Agent: EonWeaverDiscordSync (PHP cURL)',
    ];
    $opts = [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
    ];
    if ($body !== null) {
        $headers[] = 'Content-Type: application/json';
        $opts[CURLOPT_HTTPHEADER] = $headers;
        $opts[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_UNICODE);
    }
    curl_setopt_array($ch, $opts);
    $response = curl_exec($ch);
    $curlErr = curl_error($ch);
    $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($curlErr) {
        return ['ok' => false, 'error' => 'curl: ' . $curlErr, 'http' => $http];
    }

    if ($http === 204) {
        return ['ok' => true, 'http' => $http];
    }

    $data = json_decode((string) $response, true);
    if ($http >= 200 && $http < 300) {
        return ['ok' => true, 'http' => $http, 'data' => is_array($data) ? $data : []];
    }

    $msg = is_array($data) ? ($data['message'] ?? json_encode($data)) : substr((string) $response, 0, 300);
    return ['ok' => false, 'error' => $msg ?: ('HTTP ' . $http), 'http' => $http];
}

/**
 * Apply subscription tier to Discord roles for one website user.
 *
 * @return array{ok:bool,skipped?:bool,reason?:string,error?:string,http?:int,tier?:string,discord_user_id?:string,roles_after?:string[]}
 */
function ew_discord_member_tier_sync(int $userId): array
{
    if (!ew_discord_sync_configured()) {
        return ['ok' => true, 'skipped' => true, 'reason' => 'discord_sync_not_configured'];
    }

    $managed = ew_discord_managed_role_id_set();
    if (!$managed) {
        return ['ok' => true, 'skipped' => true, 'reason' => 'no_tier_roles_mapped'];
    }

    $rows = query('SELECT discord_user_id, subscription_tier FROM users WHERE id = ?', [$userId], 0);
    if (!$rows) {
        return ['ok' => false, 'error' => 'user_not_found'];
    }

    $discordUserId = trim((string) ($rows[0]['discord_user_id'] ?? ''));
    if ($discordUserId === '') {
        return ['ok' => true, 'skipped' => true, 'reason' => 'discord_user_id_not_set'];
    }

    $tier = strtolower(trim((string) ($rows[0]['subscription_tier'] ?? 'free')));
    if ($tier === '') {
        $tier = 'free';
    }

    $roleMap = ew_discord_tier_role_ids_map();
    $targetTierRole = trim((string) ($roleMap[$tier] ?? ''));

    $guildId = (string) DISCORD_GUILD_ID;
    $get = ew_discord_api_json('GET', '/guilds/' . rawurlencode($guildId) . '/members/' . rawurlencode($discordUserId));
    if (!$get['ok']) {
        return [
            'ok' => false,
            'error' => $get['error'] ?? 'get_member_failed',
            'http' => $get['http'] ?? 0,
            'tier' => $tier,
            'discord_user_id' => $discordUserId,
        ];
    }

    $member = $get['data'] ?? [];
    $currentRoles = [];
    if (!empty($member['roles']) && is_array($member['roles'])) {
        $currentRoles = array_values(array_map('strval', $member['roles']));
    }

    $keep = [];
    foreach ($currentRoles as $rid) {
        if (!isset($managed[$rid])) {
            $keep[$rid] = true;
        }
    }

    if ($targetTierRole !== '') {
        $keep[$targetTierRole] = true;
    }

    $merged = array_keys($keep);

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
            'tier' => $tier,
            'discord_user_id' => $discordUserId,
            'member_roles' => $currentRoles,
        ];
    }

    return [
        'ok' => true,
        'tier' => $tier,
        'discord_user_id' => $discordUserId,
        'roles_after' => $merged,
    ];
}
