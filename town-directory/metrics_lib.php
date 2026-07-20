<?php
/**
 * Eon Weaver — Server-side metrics.
 * - Anonymous pageview ping (rotating-salt visitor hash; no PII).
 * - Daily AI-call rollup (so admin can chart per-day vs the existing per-month aggregate).
 * - Signup-attempt outcomes for the abuse log.
 */
require_once __DIR__ . '/db.php';

if (!function_exists('ew_metrics_visitor_hash')) {
    /**
     * Hash visitor by daily salt + IP + UA prefix.
     * Salt rotates each calendar day, so the same visitor on different days hashes differently
     * (gives us "unique visitors per day" without retaining anything reversible).
     */
    function ew_metrics_visitor_hash(string $ip, string $ua, ?string $day = null): string
    {
        $day = $day ?: date('Y-m-d');
        $secret = defined('METRICS_SALT') ? METRICS_SALT : 'ew-metrics';
        return hash('sha256', $day . '|' . $secret . '|' . $ip . '|' . substr($ua, 0, 96));
    }
}

if (!function_exists('ew_metrics_referrer_host')) {
    function ew_metrics_referrer_host(string $referrer): string
    {
        if ($referrer === '') {
            return '(direct)';
        }
        $host = parse_url($referrer, PHP_URL_HOST) ?: '';
        $host = strtolower($host);
        if ($host === '' || str_ends_with($host, 'worldscribe.online') || str_ends_with($host, 'eonweaver.com')
            || str_ends_with($host, 'eonweaver.com')) {
            return '(internal)';
        }
        if (strlen($host) > 120) {
            $host = substr($host, 0, 120);
        }
        return $host;
    }
}

if (!function_exists('ew_record_pageview')) {
    /**
     * Record a single pageview. Caller must enforce per-session dedup (we just count what arrives).
     * @param int|null $userId Logged-in user id (or null for anonymous).
     */
    function ew_record_pageview(string $route, string $referrer, int $userId = null): void
    {
        $route = strtolower(preg_replace('/[^a-z0-9_\-]/i', '', substr($route, 0, 64)));
        if ($route === '') {
            $route = 'unknown';
        }

        $ip = $_SERVER['HTTP_CF_CONNECTING_IP']
            ?? (explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '')[0])
            ?? ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
        $ip = trim((string) $ip) ?: '0.0.0.0';

        $ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
        $hash = ew_metrics_visitor_hash($ip, $ua);
        $refHost = ew_metrics_referrer_host($referrer);

        try {
            execute(
                'INSERT INTO metrics_pageviews (day, route, visitor_hash, user_id, referrer_host)
                 VALUES (CURDATE(), ?, ?, ?, ?)',
                [$route, $hash, $userId ?: null, $refHost],
                0
            );
        } catch (Throwable $e) {
            /* metrics table may not exist yet on first deploy; never fail the request */
        }
    }
}

if (!function_exists('ew_record_ai_usage_daily')) {
    /**
     * Daily aggregate alongside the existing month rollup so admin can chart spend over time.
     *
     * @param float $costUsd OpenRouter-reported USD for this call (from usage.cost), if any.
     */
    function ew_record_ai_usage_daily(int $userId, string $featureKey, int $tokens, float $costUsd = 0.0): void
    {
        if ($userId <= 0 || $tokens <= 0) {
            return;
        }
        $costUsd = $costUsd > 0 ? $costUsd : 0.0;
        try {
            execute(
                "INSERT INTO metrics_ai_calls (day, user_id, feature_key, tokens, cost_usd, calls)
                 VALUES (CURDATE(), ?, ?, ?, ?, 1)
                 ON DUPLICATE KEY UPDATE tokens = tokens + VALUES(tokens),
                   cost_usd = cost_usd + VALUES(cost_usd),
                   calls = calls + 1",
                [$userId, $featureKey ?: 'global', $tokens, $costUsd],
                0
            );
        } catch (Throwable $e) { /* skip if table missing */ }
    }
}

if (!function_exists('ew_record_signup_outcome')) {
    /**
     * Annotate the most-recent signup_attempts row for this IP with outcome + email_domain.
     * Called from auth.php after register() resolves (success or thrown exception).
     */
    function ew_record_signup_outcome(string $ip, string $emailDomain, string $outcome): void
    {
        try {
            $rows = query(
                'SELECT id FROM signup_attempts WHERE ip = ? ORDER BY id DESC LIMIT 1',
                [$ip],
                0
            );
            if ($rows) {
                execute(
                    'UPDATE signup_attempts SET outcome = ?, email_domain = ? WHERE id = ?',
                    [substr($outcome, 0, 32), substr($emailDomain, 0, 120), (int) $rows[0]['id']],
                    0
                );
            } else {
                execute(
                    'INSERT INTO signup_attempts (ip, created_at, outcome, email_domain) VALUES (?, NOW(), ?, ?)',
                    [$ip, substr($outcome, 0, 32), substr($emailDomain, 0, 120)],
                    0
                );
            }
        } catch (Throwable $e) { /* skip */ }
    }
}
