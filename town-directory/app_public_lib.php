<?php
/**
 * Public site URL helpers.
 *
 * APP_PUBLIC_URL — brand / OpenRouter attribution (keep https://eonweaver.com everywhere).
 * APP_SITE_URL   — optional override for user-facing links (email verify, Stripe return).
 *                  When unset, derived from the current HTTP host for known hosts
 *                  (worldscribe.online / eonweaver.com) so staging stays on staging.
 */

function ew_app_attribution_base_url(): string
{
    if (defined('APP_PUBLIC_URL') && trim((string) APP_PUBLIC_URL) !== '') {
        return rtrim((string) APP_PUBLIC_URL, '/');
    }
    return 'https://eonweaver.com';
}

/**
 * Canonical public site URL for links in email, Stripe redirects, etc.
 */
function ew_app_public_base_url(): string
{
    if (defined('APP_SITE_URL') && trim((string) APP_SITE_URL) !== '') {
        return rtrim((string) APP_SITE_URL, '/');
    }

    $host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
    $host = preg_replace('/:\d+$/', '', $host) ?: '';
    if ($host === 'www.eonweaver.com') {
        $host = 'eonweaver.com';
    } elseif ($host === 'www.worldscribe.online') {
        $host = 'worldscribe.online';
    }

    $known = $host !== '' && (
        $host === 'eonweaver.com'
        || $host === 'worldscribe.online'
        || str_ends_with($host, '.eonweaver.com')
        || str_ends_with($host, '.worldscribe.online')
    );

    if ($known) {
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || ((string) ($_SERVER['SERVER_PORT'] ?? '') === '443')
            || (strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https');
        return ($https ? 'https' : 'http') . '://' . $host;
    }

    return ew_app_attribution_base_url();
}
