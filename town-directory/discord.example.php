<?php
/**
 * Eon Weaver — Discord Integration
 * Sends bug reports via webhooks. **Deploy announcements** are posted by the local
 * `discord_deploy_notify.mjs` script (see `.env.discord.example`), not this file.
 *
 * ⚠️  Copy this file to discord.php and fill in your webhook URLs.
 *     Never commit discord.php to git.
 *
 * Usage:
 *   require_once __DIR__ . '/discord.php';
 *   sendDiscordBugReport($title, $description, $stepsToReproduce, $severity, $username);
 */

// ── Discord Webhook URLs ─────────────────────────────────────
// Create the **bugs** webhook on your bug-reports **forum** channel (channel gear → Integrations → Webhooks).
// If the forum requires tags on new posts, set tag snowflake IDs (comma-separated) below.
define('DISCORD_WEBHOOK_BUGS', 'https://discord.com/api/webhooks/YOUR_BUGS_WEBHOOK_ID/YOUR_BUGS_WEBHOOK_TOKEN');
define('DISCORD_WEBHOOK_UPDATES', 'https://discord.com/api/webhooks/YOUR_UPDATES_WEBHOOK_ID/YOUR_UPDATES_WEBHOOK_TOKEN');
define('DISCORD_BUG_FORUM_APPLIED_TAGS', ''); // e.g. '1234567890123456789' or 'id1,id2'
define('DISCORD_BUG_WEBHOOK_USERNAME', 'Eon Weaver'); // visible name (overrides “Spidy Bot” style webhook default)
define('DISCORD_BUG_WEBHOOK_AVATAR_URL', ''); // optional https URL to PNG/JPG; empty = APP_PUBLIC_URL + /eon-weaver-spider.png

function ew_discord_bug_default_avatar_url(): string
{
    $base = defined('APP_PUBLIC_URL') ? rtrim((string) APP_PUBLIC_URL, '/') : 'https://eonscribe.com';
    return $base . '/eon-weaver-spider.png';
}

function ew_discord_apply_branded_webhook_profile(array &$payload): void
{
    $showName = trim((string) DISCORD_BUG_WEBHOOK_USERNAME);
    if ($showName !== '') {
        $payload['username'] = mb_substr($showName, 0, 80);
    }
    $avatarUrl = trim((string) DISCORD_BUG_WEBHOOK_AVATAR_URL);
    if ($avatarUrl === '') {
        $avatarUrl = ew_discord_bug_default_avatar_url();
    }
    if (filter_var($avatarUrl, FILTER_VALIDATE_URL)) {
        $payload['avatar_url'] = mb_substr($avatarUrl, 0, 2048);
    }
}

/**
 * Send a raw embed to a Discord webhook.
 */
function sendDiscordWebhook(string $webhookUrl, array $payload): array
{
    if (!$webhookUrl) {
        return ['ok' => false, 'error' => 'Webhook URL not configured'];
    }

    $ch = curl_init($webhookUrl);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        return ['ok' => false, 'error' => "cURL error: $curlError"];
    }

    // Discord returns 204 No Content on success
    if ($httpCode >= 200 && $httpCode < 300) {
        return ['ok' => true];
    }

    return ['ok' => false, 'error' => "Discord returned HTTP $httpCode: $response"];
}

/**
 * Send a bug report to the #bug-reports Discord channel.
 */
function sendDiscordBugReport(
    string $title,
    string $description,
    string $stepsToReproduce,
    string $severity,
    string $username,
    string $page = '',
    string $browser = ''
): array {
    $severityColors = [
        'low' => 0x3498db,
        'medium' => 0xf39c12,
        'high' => 0xe67e22,
        'critical' => 0xe74c3c,
    ];

    $severityEmojis = [
        'low' => '🔵',
        'medium' => '🟡',
        'high' => '🟠',
        'critical' => '🔴',
    ];

    $color = $severityColors[$severity] ?? 0x95a5a6;
    $emoji = $severityEmojis[$severity] ?? '⚪';

    $fields = [
        [
            'name' => '📝 Description',
            'value' => mb_substr($description, 0, 1024) ?: '_No description provided_',
            'inline' => false,
        ],
    ];

    if ($stepsToReproduce) {
        $fields[] = [
            'name' => '🔄 Steps to Reproduce',
            'value' => mb_substr($stepsToReproduce, 0, 1024),
            'inline' => false,
        ];
    }

    $fields[] = [
        'name' => '⚠️ Severity',
        'value' => "$emoji " . ucfirst($severity),
        'inline' => true,
    ];

    $fields[] = [
        'name' => '👤 Reporter',
        'value' => $username ?: 'Anonymous',
        'inline' => true,
    ];

    if ($page) {
        $fields[] = [
            'name' => '📍 Page/Feature',
            'value' => $page,
            'inline' => true,
        ];
    }

    if ($browser) {
        $fields[] = [
            'name' => '🌐 Browser',
            'value' => mb_substr($browser, 0, 256),
            'inline' => true,
        ];
    }

    $payload = [
        'thread_name' => mb_substr("🐛 $title", 0, 100),
        'embeds' => [
            [
                'title' => "🐛 $title",
                'color' => $color,
                'fields' => $fields,
                'footer' => [
                    'text' => 'Eon Weaver Bug Report • ' . date('Y-m-d H:i T'),
                ],
                'timestamp' => gmdate('c'),
            ]
        ],
    ];

    ew_discord_apply_branded_webhook_profile($payload);

    $tagRaw = trim((string) DISCORD_BUG_FORUM_APPLIED_TAGS);
    if ($tagRaw !== '') {
        $tagIds = array_values(array_filter(array_map('trim', explode(',', $tagRaw))));
        if ($tagIds !== []) {
            $payload['applied_tags'] = $tagIds;
        }
    }

    $url = DISCORD_WEBHOOK_BUGS . (strpos(DISCORD_WEBHOOK_BUGS, '?') !== false ? '&' : '?') . 'wait=true';
    return sendDiscordWebhook($url, $payload);
}

/**
 * Send an update/announcement to the #updates Discord channel.
 *
 * @param array<int, array{name:string,value:string,inline?:bool}> $extraFields
 *        Shown first (e.g. deploy target + rules editions from CI scripts).
 */
function sendDiscordUpdate(string $title, string $description, array $changes = [], array $extraFields = []): array
{
    $fields = [];

    foreach ($extraFields as $ex) {
        $nm = trim((string) ($ex['name'] ?? ''));
        $val = trim((string) ($ex['value'] ?? ''));
        if ($nm === '' || $val === '') {
            continue;
        }
        $fields[] = [
            'name' => mb_substr($nm, 0, 256),
            'value' => mb_substr($val, 0, 1024),
            'inline' => !empty($ex['inline']),
        ];
    }

    if ($description) {
        $fields[] = [
            'name' => '📋 Details',
            'value' => mb_substr($description, 0, 1024),
            'inline' => false,
        ];
    }

    if ($changes) {
        $changeList = implode("\n", array_map(fn($c) => "• $c", array_slice($changes, 0, 20)));
        $fields[] = [
            'name' => '🔧 Changes',
            'value' => mb_substr($changeList, 0, 1024),
            'inline' => false,
        ];
    }

    $payload = [
        'embeds' => [
            [
                'title' => "🚀 $title",
                'color' => 0x2ecc71,
                'fields' => $fields,
                'footer' => [
                    'text' => 'Eon Weaver Updates • ' . date('Y-m-d H:i T'),
                ],
                'timestamp' => gmdate('c'),
            ]
        ],
    ];

    ew_discord_apply_branded_webhook_profile($payload);

    return sendDiscordWebhook(DISCORD_WEBHOOK_UPDATES, $payload);
}
