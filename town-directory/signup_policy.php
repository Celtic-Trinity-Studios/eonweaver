<?php
/**
 * Signup abuse controls: rate limits, disposable domains, datacenter/VPN hints.
 */
require_once __DIR__ . '/db.php';

/** Common throwaway domains — merged with data/disposable-email-domains.txt if present. */
function ew_disposable_domain_builtins(): array
{
    return [
        'mailinator.com',
        'guerrillamail.com',
        'guerrillamail.org',
        'tempmail.com',
        'temp-mail.org',
        'throwaway.email',
        '10minutemail.com',
        'yopmail.com',
        'trashmail.com',
        'maildrop.cc',
        'getnada.com',
        'fakeinbox.com',
        'sharklasers.com',
        'dispostable.com',
        'mailnesia.com',
        'mailcatch.com',
        'mintemail.com',
        'spamgourmet.com',
        'tempail.com',
        'emailondeck.com',
        'tmpmail.org',
        'moakt.com',
        'mail.tm',
        'inboxkitten.com',
    ];
}

function ew_disposable_domain_set(): array
{
    static $set = null;
    if ($set !== null) {
        return $set;
    }
    $set = array_flip(ew_disposable_domain_builtins());
    $path = __DIR__ . '/data/disposable-email-domains.txt';
    if (is_readable($path)) {
        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = strtolower(trim($line));
            if ($line !== '' && $line[0] !== '#') {
                $set[$line] = true;
            }
        }
    }
    return $set;
}

function ew_is_disposable_email(string $email): bool
{
    $at = strrpos($email, '@');
    if ($at === false) {
        return false;
    }
    $domain = strtolower(substr($email, $at + 1));
    return isset(ew_disposable_domain_set()[$domain]);
}

function ew_client_ip(): string
{
    if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
        return trim($_SERVER['HTTP_CF_CONNECTING_IP']);
    }
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        return trim($parts[0]);
    }
    return trim($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
}

function ew_signup_record_attempt(string $ip, string $emailDomain = ''): void
{
    try {
        execute(
            'INSERT INTO signup_attempts (ip, created_at, email_domain, outcome) VALUES (?, NOW(), ?, ?)',
            [$ip, substr($emailDomain, 0, 120), 'pending'],
            0
        );
    } catch (Throwable $e) {
        /* table missing until migration */
    }
}

/**
 * Admin-controlled allowlist for bypassing signup rate limits.
 * site_settings key: signup_rate_limit_ip_allowlist (comma/newline/space separated exact IPs).
 */
function ew_signup_rate_limit_ip_allowlisted(string $ip): bool
{
    if ($ip === '' || $ip === '127.0.0.1' || $ip === '::1') {
        return true;
    }
    try {
        $rows = query("SELECT value FROM site_settings WHERE `key` = 'signup_rate_limit_ip_allowlist' LIMIT 1", [], 0);
        $raw = trim((string) ($rows[0]['value'] ?? ''));
        if ($raw === '') {
            return false;
        }
        $parts = preg_split('/[\s,;]+/', strtolower($raw), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $allow = array_flip($parts);
        return isset($allow[strtolower(trim($ip))]);
    } catch (Throwable $e) {
        // site_settings may not exist on fresh installs before setup completes.
        return false;
    }
}

function ew_signup_rate_limit_throw_if_exceeded(string $ip): void
{
    if (ew_signup_rate_limit_ip_allowlisted($ip)) {
        return;
    }
    $day = (int) (defined('SIGNUP_MAX_PER_IP_PER_DAY') ? SIGNUP_MAX_PER_IP_PER_DAY : 3);
    $week = (int) (defined('SIGNUP_MAX_PER_IP_PER_WEEK') ? SIGNUP_MAX_PER_IP_PER_WEEK : 10);
    try {
        $d = query(
            'SELECT COUNT(*) AS c FROM signup_attempts WHERE ip = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)',
            [$ip],
            0
        );
        $nDay = (int) ($d[0]['c'] ?? 0);
        if ($nDay >= $day) {
            throw new Exception('Too many signups from this network today. Try again tomorrow or contact support.');
        }
        $w = query(
            'SELECT COUNT(*) AS c FROM signup_attempts WHERE ip = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
            [$ip],
            0
        );
        $nWeek = (int) ($w[0]['c'] ?? 0);
        if ($nWeek >= $week) {
            throw new Exception('Too many signups from this network this week. Try again later or contact support.');
        }
    } catch (Throwable $e) {
        if (strpos($e->getMessage(), 'Too many') !== false) {
            throw $e;
        }
        /* Missing signup_attempts table — skip rate limit until setup_mysql run */
    }
}

/**
 * Uses ip-api.com (free, ~45 req/min). Set BLOCK_DATACENTER_SIGNUPS false to disable.
 */
function ew_signup_throw_if_datacenter_ip(string $ip): void
{
    if (!defined('BLOCK_DATACENTER_SIGNUPS') || !BLOCK_DATACENTER_SIGNUPS) {
        return;
    }
    if ($ip === '127.0.0.1' || $ip === '::1') {
        return;
    }
    if (!filter_var($ip, FILTER_VALIDATE_IP)) {
        throw new Exception('Invalid network address.');
    }

    $cacheKey = 'ew_ip_' . md5($ip);
    if (function_exists('apcu_fetch')) {
        $cached = apcu_fetch($cacheKey);
        if (is_array($cached)) {
            if (!empty($cached['block'])) {
                throw new Exception(
                    'Signups from VPNs or hosting networks are blocked. Try from a home/residential connection, or contact support.'
                );
            }
            return;
        }
    }

    $url = 'http://ip-api.com/json/' . rawurlencode($ip) . '?fields=hosting,proxy,query';
    $ctx = stream_context_create(['http' => ['timeout' => 3]]);
    $json = @file_get_contents($url, false, $ctx);
    $block = false;
    if ($json) {
        $j = json_decode($json, true);
        if (!empty($j['hosting']) || !empty($j['proxy'])) {
            $block = true;
        }
    }

    if (function_exists('apcu_store')) {
        apcu_store($cacheKey, ['block' => $block], 3600);
    }

    if ($block) {
        throw new Exception(
            'Signups from VPNs or hosting networks are blocked. Try from a home/residential connection, or contact support.'
        );
    }
}
