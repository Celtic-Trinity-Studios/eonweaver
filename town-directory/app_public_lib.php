<?php
/**
 * Canonical public site URL for links in email, Stripe redirects, etc.
 * Override APP_PUBLIC_URL in config.php; production default is eonweaver.com.
 */
function ew_app_public_base_url(): string
{
    if (defined('APP_PUBLIC_URL') && trim((string) APP_PUBLIC_URL) !== '') {
        return rtrim((string) APP_PUBLIC_URL, '/');
    }
    return 'https://eonweaver.com';
}
