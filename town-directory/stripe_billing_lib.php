<?php
/**
 * Stripe subscription billing — checkout, portal, tier sync.
 *
 * Configure in config.php (see config.example.php):
 *   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_IDS_JSON
 *
 * Tier ids must match ew_subscription_tier_ids() in tier_limits.php.
 */
if (!function_exists('query')) {
    require_once __DIR__ . '/db.php';
}
if (!function_exists('ew_app_public_base_url')) {
    require_once __DIR__ . '/app_public_lib.php';
}
if (!defined('STRIPE_SECRET_KEY') && is_file(__DIR__ . '/config.stripe.php')) {
    require_once __DIR__ . '/config.stripe.php';
}

function ew_stripe_configured(): bool
{
    return defined('STRIPE_SECRET_KEY')
        && trim((string) STRIPE_SECRET_KEY) !== ''
        && defined('STRIPE_PRICE_IDS_JSON')
        && trim((string) STRIPE_PRICE_IDS_JSON) !== '';
}

/** @return array<string, string> tier id => Stripe price id */
function ew_stripe_price_ids_map(): array
{
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }
    require_once __DIR__ . '/tier_limits.php';
    $defaults = [];
    foreach (ew_subscription_tier_ids() as $id) {
        if ($id === 'free') {
            continue;
        }
        $defaults[$id] = '';
    }
    if (!defined('STRIPE_PRICE_IDS_JSON') || trim((string) STRIPE_PRICE_IDS_JSON) === '') {
        $cache = $defaults;
        return $cache;
    }
    $decoded = json_decode((string) STRIPE_PRICE_IDS_JSON, true);
    if (!is_array($decoded)) {
        $cache = $defaults;
        return $cache;
    }
    $cache = array_merge($defaults, array_intersect_key($decoded, $defaults));
    return $cache;
}

function ew_stripe_price_id_for_tier(string $tierId): ?string
{
    $tierId = ew_normalize_subscription_tier($tierId);
    if ($tierId === 'free') {
        return null;
    }
    $map = ew_stripe_price_ids_map();
    $priceId = trim((string) ($map[$tierId] ?? ''));
    return $priceId !== '' ? $priceId : null;
}

function ew_stripe_tier_for_price_id(string $priceId): ?string
{
    $priceId = trim($priceId);
    if ($priceId === '') {
        return null;
    }
    foreach (ew_stripe_price_ids_map() as $tier => $pid) {
        if ($pid === $priceId) {
            return $tier;
        }
    }
    return null;
}

function ew_stripe_app_base_url(): string
{
    return ew_app_public_base_url();
}

/**
 * @return array{ok:bool,http?:int,data?:array,error?:string,raw?:string}
 */
function ew_stripe_api(string $method, string $path, array $params = []): array
{
    if (!ew_stripe_configured()) {
        return ['ok' => false, 'error' => 'Stripe is not configured'];
    }
    $url = 'https://api.stripe.com/v1' . $path;
    $ch = curl_init($url);
    $headers = [
        'Authorization: Bearer ' . STRIPE_SECRET_KEY,
        'Stripe-Version: 2024-11-20.acacia',
    ];
    $opts = [
        CURLOPT_CUSTOMREQUEST => strtoupper($method),
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 45,
    ];
    if (!empty($params)) {
        $opts[CURLOPT_POSTFIELDS] = http_build_query($params);
    }
    curl_setopt_array($ch, $opts);
    $raw = curl_exec($ch);
    $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);
    if ($raw === false) {
        return ['ok' => false, 'http' => $http, 'error' => $curlErr ?: 'Stripe request failed'];
    }
    $data = json_decode($raw, true);
    if ($http >= 400) {
        $msg = is_array($data) ? ($data['error']['message'] ?? $raw) : $raw;
        return ['ok' => false, 'http' => $http, 'error' => (string) $msg, 'raw' => $raw];
    }
    return ['ok' => true, 'http' => $http, 'data' => is_array($data) ? $data : []];
}

function ew_stripe_user_billing_row(int $userId): ?array
{
    $rows = query(
        'SELECT id, email, username, subscription_tier, stripe_customer_id, stripe_subscription_id, stripe_subscription_status,
                subscription_started_at, subscription_renews_at
         FROM users WHERE id = ?',
        [$userId],
        0
    );
    return $rows[0] ?? null;
}

/** @return array{started_at:?string,renews_at:?string} MySQL DATETIME (UTC) or null */
function ew_stripe_extract_subscription_dates(array $subscription): array
{
    $startTs = (int) ($subscription['start_date'] ?? 0);
    if ($startTs <= 0) {
        $startTs = (int) ($subscription['created'] ?? 0);
    }
    $endTs = (int) ($subscription['current_period_end'] ?? 0);
    return [
        'started_at' => $startTs > 0 ? gmdate('Y-m-d H:i:s', $startTs) : null,
        'renews_at' => $endTs > 0 ? gmdate('Y-m-d H:i:s', $endTs) : null,
    ];
}

function ew_stripe_mysql_dt_to_iso(?string $mysqlDt): ?string
{
    $mysqlDt = trim((string) $mysqlDt);
    if ($mysqlDt === '') {
        return null;
    }
    $ts = strtotime($mysqlDt . ' UTC');
    if ($ts === false) {
        return null;
    }
    return gmdate('c', $ts);
}

function ew_stripe_persist_subscription_dates(int $userId, ?string $startedAt, ?string $renewsAt, bool $clearRenewalOnly = false): void
{
    if ($clearRenewalOnly) {
        execute('UPDATE users SET subscription_renews_at = NULL WHERE id = ?', [$userId], 0);
        return;
    }
    execute(
        'UPDATE users SET subscription_started_at = ?, subscription_renews_at = ? WHERE id = ?',
        [$startedAt, $renewsAt, $userId],
        0
    );
}

function ew_stripe_get_or_create_customer(int $userId): string
{
    $row = ew_stripe_user_billing_row($userId);
    if (!$row) {
        throw new Exception('User not found');
    }
    $existing = trim((string) ($row['stripe_customer_id'] ?? ''));
    if ($existing !== '') {
        return $existing;
    }
    $email = trim((string) ($row['email'] ?? ''));
    if ($email === '') {
        throw new Exception('Account email is required for billing');
    }
    $res = ew_stripe_api('POST', '/customers', [
        'email' => $email,
        'name' => trim((string) ($row['username'] ?? '')) ?: $email,
        'metadata[user_id]' => (string) $userId,
    ]);
    if (!$res['ok']) {
        throw new Exception('Could not create Stripe customer: ' . ($res['error'] ?? 'unknown'));
    }
    $customerId = trim((string) ($res['data']['id'] ?? ''));
    if ($customerId === '') {
        throw new Exception('Stripe customer id missing from response');
    }
    execute('UPDATE users SET stripe_customer_id = ? WHERE id = ?', [$customerId, $userId], 0);
    return $customerId;
}

function ew_stripe_tier_rank(string $tierId): int
{
    require_once __DIR__ . '/tier_limits.php';
    $ids = ew_subscription_tier_ids();
    $i = array_search(ew_normalize_subscription_tier($tierId), $ids, true);
    return $i === false ? -1 : (int) $i;
}

/**
 * Credit the platform wallet when a paid subscription tier increases (idempotent via subscription_ec_seed_tier).
 * First month of a paid plan is covered here; renewals use invoice.paid → ew_stripe_handle_invoice_paid.
 */
function ew_stripe_maybe_grant_subscription_wallet_seed(int $userId, string $newTierId, ?string $subscriptionStatus = null): int
{
    require_once __DIR__ . '/tier_economics.php';
    $newTierId = ew_normalize_subscription_tier($newTierId);
    if ($newTierId === 'free') {
        return 0;
    }
    $status = strtolower(trim((string) ($subscriptionStatus ?? '')));
    $activeStatuses = ['active', 'trialing', 'past_due'];
    if ($status !== '' && !in_array($status, $activeStatuses, true)) {
        return 0;
    }
    $rows = query(
        'SELECT subscription_ec_seed_tier FROM users WHERE id = ?',
        [$userId],
        0
    );
    if (!$rows) {
        return 0;
    }
    $seededTier = ew_normalize_subscription_tier((string) ($rows[0]['subscription_ec_seed_tier'] ?? 'free'));
    if (ew_stripe_tier_rank($newTierId) <= ew_stripe_tier_rank($seededTier)) {
        return 0;
    }
    $grantRaw = ew_tier_subscription_wallet_seed_delta_raw($seededTier, $newTierId);
    if ($grantRaw <= 0) {
        execute('UPDATE users SET subscription_ec_seed_tier = ? WHERE id = ?', [$newTierId, $userId], 0);
        return 0;
    }
    execute(
        'UPDATE users SET credit_balance = credit_balance + ?, subscription_ec_seed_tier = ? WHERE id = ?',
        [$grantRaw, $newTierId, $userId],
        0
    );
    return $grantRaw;
}

/**
 * Ensure the invoice-idempotency ledger exists (also migrated from api.php bootstrap).
 */
function ew_stripe_ensure_ec_grant_table(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    try {
        execute(
            'CREATE TABLE IF NOT EXISTS stripe_ec_invoice_grants (
                invoice_id VARCHAR(255) NOT NULL PRIMARY KEY,
                user_id INT NOT NULL,
                amount_raw BIGINT NOT NULL,
                tier_id VARCHAR(20) NOT NULL,
                billing_reason VARCHAR(64) DEFAULT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                KEY idx_stripe_ec_grants_user (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
            [],
            0
        );
    } catch (Throwable $e) {
        /* non-fatal */
    }
}

/**
 * Grant one paid billing period's monthly EC allotment (idempotent by Stripe invoice id).
 * Renewals: billing_reason=subscription_cycle → add monthly tier allotment.
 * First month: billing_reason=subscription_create → record only (tier seed covers month 1).
 *
 * @return int raw tokens granted (0 if skipped / already granted)
 */
function ew_stripe_grant_ec_for_paid_invoice(int $userId, string $invoiceId, string $tierId, string $billingReason = ''): int
{
    require_once __DIR__ . '/tier_economics.php';
    require_once __DIR__ . '/tier_limits.php';
    ew_stripe_ensure_ec_grant_table();

    $invoiceId = trim($invoiceId);
    $userId = (int) $userId;
    if ($invoiceId === '' || $userId <= 0) {
        return 0;
    }

    $tierId = ew_normalize_subscription_tier($tierId);
    $billingReason = strtolower(trim($billingReason));

    $existing = query('SELECT invoice_id, amount_raw FROM stripe_ec_invoice_grants WHERE invoice_id = ? LIMIT 1', [$invoiceId], 0);
    if ($existing) {
        return 0;
    }

    // First invoice of a new subscription: wallet seed on checkout/upgrade already covers month 1.
    if ($billingReason === 'subscription_create') {
        try {
            execute(
                'INSERT INTO stripe_ec_invoice_grants (invoice_id, user_id, amount_raw, tier_id, billing_reason)
                 VALUES (?, ?, 0, ?, ?)',
                [$invoiceId, $userId, $tierId, 'subscription_create'],
                0
            );
        } catch (Throwable $e) {
            /* duplicate / race */
        }
        return 0;
    }

    // Only automatic renewals top up the wallet.
    if ($billingReason !== 'subscription_cycle') {
        return 0;
    }

    if ($tierId === 'free') {
        return 0;
    }

    $grantRaw = (int) ew_monthly_raw_cap_for_tier($tierId);
    try {
        execute(
            'INSERT INTO stripe_ec_invoice_grants (invoice_id, user_id, amount_raw, tier_id, billing_reason)
             VALUES (?, ?, ?, ?, ?)',
            [$invoiceId, $userId, $grantRaw, $tierId, $billingReason],
            0
        );
    } catch (Throwable $e) {
        return 0;
    }

    if ($grantRaw > 0) {
        execute(
            'UPDATE users SET credit_balance = credit_balance + ? WHERE id = ?',
            [$grantRaw, $userId],
            0
        );
    }
    return $grantRaw;
}

/**
 * Handle Stripe invoice.paid — grant monthly EC on subscription renewals.
 */
function ew_stripe_handle_invoice_paid(array $invoice): int
{
    $invoiceId = trim((string) ($invoice['id'] ?? ''));
    if ($invoiceId === '') {
        return 0;
    }
    $billingReason = strtolower(trim((string) ($invoice['billing_reason'] ?? '')));
    // Only automatic subscription renewals.
    if ($billingReason !== 'subscription_cycle') {
        if ($billingReason === 'subscription_create') {
            // Record so reconcile doesn't try to treat create as a missed renewal.
            $userId = ew_stripe_resolve_user_id_from_invoice($invoice);
            $tier = ew_stripe_tier_from_invoice($invoice);
            if ($userId) {
                return ew_stripe_grant_ec_for_paid_invoice($userId, $invoiceId, $tier, 'subscription_create');
            }
        }
        return 0;
    }

    $paid = ($invoice['paid'] ?? true);
    if ($paid === false || $paid === 'false' || $paid === 0 || $paid === '0') {
        return 0;
    }

    $userId = ew_stripe_resolve_user_id_from_invoice($invoice);
    if (!$userId) {
        return 0;
    }
    $tier = ew_stripe_tier_from_invoice($invoice);
    return ew_stripe_grant_ec_for_paid_invoice($userId, $invoiceId, $tier, 'subscription_cycle');
}

function ew_stripe_resolve_user_id_from_invoice(array $invoice): ?int
{
    $meta = $invoice['metadata'] ?? [];
    if (!empty($meta['user_id'])) {
        $uid = (int) $meta['user_id'];
        if ($uid > 0) {
            return $uid;
        }
    }
    $subId = $invoice['subscription'] ?? null;
    if (is_array($subId)) {
        $subId = $subId['id'] ?? '';
    }
    $subId = trim((string) $subId);
    if ($subId !== '') {
        $rows = query('SELECT id FROM users WHERE stripe_subscription_id = ? LIMIT 1', [$subId], 0);
        if ($rows) {
            return (int) $rows[0]['id'];
        }
        // Expand subscription object for metadata when only an id was present
        if (ew_stripe_configured()) {
            $subRes = ew_stripe_api('GET', '/subscriptions/' . rawurlencode($subId));
            if ($subRes['ok'] && !empty($subRes['data'])) {
                $uid = ew_stripe_resolve_user_id_from_subscription($subRes['data']);
                if ($uid) {
                    return $uid;
                }
            }
        }
    }
    $customerId = trim((string) ($invoice['customer'] ?? ''));
    if ($customerId !== '') {
        $rows = query('SELECT id FROM users WHERE stripe_customer_id = ? LIMIT 1', [$customerId], 0);
        if ($rows) {
            return (int) $rows[0]['id'];
        }
    }
    return null;
}

function ew_stripe_tier_from_invoice(array $invoice): string
{
    require_once __DIR__ . '/tier_limits.php';
    $metaTier = trim((string) (($invoice['metadata']['tier_id'] ?? '') ?: ''));
    if ($metaTier !== '') {
        return ew_normalize_subscription_tier($metaTier);
    }
    $lines = $invoice['lines']['data'] ?? [];
    if (is_array($lines)) {
        foreach ($lines as $line) {
            $priceId = '';
            if (!empty($line['price']['id'])) {
                $priceId = (string) $line['price']['id'];
            } elseif (!empty($line['pricing']['price_details']['price'])) {
                $priceId = (string) $line['pricing']['price_details']['price'];
            }
            $tier = $priceId !== '' ? ew_stripe_tier_for_price_id($priceId) : null;
            if ($tier) {
                return $tier;
            }
        }
    }
    $subId = $invoice['subscription'] ?? null;
    if (is_array($subId)) {
        return ew_stripe_tier_from_subscription($subId);
    }
    $subId = trim((string) $subId);
    if ($subId !== '' && ew_stripe_configured()) {
        $subRes = ew_stripe_api('GET', '/subscriptions/' . rawurlencode($subId));
        if ($subRes['ok'] && !empty($subRes['data'])) {
            return ew_stripe_tier_from_subscription($subRes['data']);
        }
    }
    $userId = ew_stripe_resolve_user_id_from_invoice($invoice);
    if ($userId) {
        $row = ew_stripe_user_billing_row($userId);
        if ($row) {
            return ew_normalize_subscription_tier((string) ($row['subscription_tier'] ?? 'free'));
        }
    }
    return 'free';
}

/**
 * Pull recent paid subscription invoices from Stripe and grant any missed renewal EC.
 * Safe to call on Plans / usage loads (idempotent via stripe_ec_invoice_grants).
 *
 * @return int total raw tokens granted this call
 */
function ew_stripe_reconcile_subscription_ec_grants(int $userId): int
{
    if (!ew_stripe_configured()) {
        return 0;
    }
    ew_stripe_ensure_ec_grant_table();
    $row = ew_stripe_user_billing_row($userId);
    if (!$row) {
        return 0;
    }
    $customerId = trim((string) ($row['stripe_customer_id'] ?? ''));
    $subId = trim((string) ($row['stripe_subscription_id'] ?? ''));
    $status = strtolower(trim((string) ($row['stripe_subscription_status'] ?? '')));
    if ($customerId === '' || !in_array($status, ['active', 'trialing', 'past_due'], true)) {
        return 0;
    }

    $params = [
        'customer' => $customerId,
        'limit' => 12,
        'status' => 'paid',
    ];
    if ($subId !== '') {
        $params['subscription'] = $subId;
    }
    $res = ew_stripe_api('GET', '/invoices?' . http_build_query($params));
    if (!$res['ok'] || empty($res['data']['data']) || !is_array($res['data']['data'])) {
        return 0;
    }

    $total = 0;
    foreach ($res['data']['data'] as $invoice) {
        if (!is_array($invoice)) {
            continue;
        }
        $reason = strtolower(trim((string) ($invoice['billing_reason'] ?? '')));
        if ($reason !== 'subscription_cycle' && $reason !== 'subscription_create') {
            continue;
        }
        $invoice['metadata'] = $invoice['metadata'] ?? [];
        if (empty($invoice['metadata']['user_id'])) {
            $invoice['metadata']['user_id'] = (string) $userId;
        }
        $total += ew_stripe_handle_invoice_paid($invoice);
    }
    return $total;
}

/**
 * Apply tier to user row and sync Discord roles when configured.
 */
function ew_stripe_apply_subscription_tier(int $userId, string $tierId, ?string $subscriptionId = null, ?string $status = null): void
{
    require_once __DIR__ . '/tier_limits.php';
    $tierId = ew_normalize_subscription_tier($tierId);
    if ($tierId !== 'free') {
        ew_stripe_maybe_grant_subscription_wallet_seed($userId, $tierId, $status);
    }
    $sets = ['subscription_tier = ?'];
    $params = [$tierId];
    if ($subscriptionId !== null) {
        $sets[] = 'stripe_subscription_id = ?';
        $params[] = $subscriptionId === '' ? null : $subscriptionId;
    }
    if ($status !== null) {
        $sets[] = 'stripe_subscription_status = ?';
        $params[] = $status === '' ? null : $status;
    }
    if ($tierId === 'free') {
        $sets[] = "subscription_ec_seed_tier = 'free'";
    }
    $params[] = $userId;
    execute('UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = ?', $params, 0);
    if (is_file(__DIR__ . '/discord_member_sync_lib.php')) {
        require_once __DIR__ . '/discord_member_sync_lib.php';
        if (function_exists('ew_discord_member_tier_sync')) {
            ew_discord_member_tier_sync($userId);
        }
    }
}

/**
 * @return array{url:string,mode:string}
 */
function ew_stripe_begin_checkout(int $userId, string $targetTierId): array
{
    if (!ew_stripe_configured()) {
        throw new Exception('Self-serve billing is not configured on this server');
    }
    require_once __DIR__ . '/tier_limits.php';
    $targetTierId = ew_normalize_subscription_tier($targetTierId);
    if ($targetTierId === 'free') {
        throw new Exception('Free tier does not require checkout');
    }
    $priceId = ew_stripe_price_id_for_tier($targetTierId);
    if ($priceId === null) {
        throw new Exception('That plan is not available for checkout yet');
    }
    $row = ew_stripe_user_billing_row($userId);
    if (!$row) {
        throw new Exception('User not found');
    }
    $currentTier = ew_normalize_subscription_tier((string) ($row['subscription_tier'] ?? 'free'));
    if (ew_stripe_tier_rank($targetTierId) <= ew_stripe_tier_rank($currentTier)) {
        throw new Exception('Use Manage billing to change or downgrade your plan');
    }

    $customerId = ew_stripe_get_or_create_customer($userId);
    $base = ew_stripe_app_base_url();
    $successUrl = $base . '/subscription?checkout=success';
    $cancelUrl = $base . '/subscription?checkout=cancel';

    $activeSubId = trim((string) ($row['stripe_subscription_id'] ?? ''));
    $activeStatus = strtolower(trim((string) ($row['stripe_subscription_status'] ?? '')));
    $hasActiveSub = $activeSubId !== ''
        && in_array($activeStatus, ['active', 'trialing', 'past_due'], true);

    if ($hasActiveSub) {
        $subRes = ew_stripe_api('GET', '/subscriptions/' . rawurlencode($activeSubId));
        if (!$subRes['ok']) {
            throw new Exception('Could not load current subscription: ' . ($subRes['error'] ?? 'unknown'));
        }
        $itemId = trim((string) ($subRes['data']['items']['data'][0]['id'] ?? ''));
        if ($itemId === '') {
            throw new Exception('Current subscription has no billable item to update');
        }
        $update = ew_stripe_api('POST', '/subscriptions/' . rawurlencode($activeSubId), [
            'items[0][id]' => $itemId,
            'items[0][price]' => $priceId,
            'proration_behavior' => 'create_prorations',
            'metadata[tier_id]' => $targetTierId,
            'metadata[user_id]' => (string) $userId,
        ]);
        if (!$update['ok']) {
            throw new Exception('Could not upgrade subscription: ' . ($update['error'] ?? 'unknown'));
        }
        ew_stripe_apply_subscription_tier(
            $userId,
            $targetTierId,
            $activeSubId,
            (string) ($update['data']['status'] ?? 'active')
        );
        $dates = ew_stripe_extract_subscription_dates($update['data'] ?? []);
        ew_stripe_persist_subscription_dates($userId, $dates['started_at'], $dates['renews_at']);
        return ['url' => $successUrl, 'mode' => 'upgrade'];
    }

    $session = ew_stripe_api('POST', '/checkout/sessions', [
        'mode' => 'subscription',
        'customer' => $customerId,
        'client_reference_id' => (string) $userId,
        'line_items[0][price]' => $priceId,
        'line_items[0][quantity]' => 1,
        'success_url' => $successUrl,
        'cancel_url' => $cancelUrl,
        'subscription_data[metadata][tier_id]' => $targetTierId,
        'subscription_data[metadata][user_id]' => (string) $userId,
        'metadata[tier_id]' => $targetTierId,
        'metadata[user_id]' => (string) $userId,
        'allow_promotion_codes' => 'true',
    ]);
    if (!$session['ok']) {
        throw new Exception('Could not start checkout: ' . ($session['error'] ?? 'unknown'));
    }
    $url = trim((string) ($session['data']['url'] ?? ''));
    if ($url === '') {
        throw new Exception('Checkout URL missing from Stripe response');
    }
    return ['url' => $url, 'mode' => 'checkout'];
}

/**
 * @return array{url:string}
 */
function ew_stripe_billing_portal_url(int $userId): array
{
    if (!ew_stripe_configured()) {
        throw new Exception('Self-serve billing is not configured on this server');
    }
    $customerId = ew_stripe_get_or_create_customer($userId);
    $base = ew_stripe_app_base_url();
    $session = ew_stripe_api('POST', '/billing_portal/sessions', [
        'customer' => $customerId,
        'return_url' => $base . '/subscription',
    ]);
    if (!$session['ok']) {
        throw new Exception('Could not open billing portal: ' . ($session['error'] ?? 'unknown'));
    }
    $url = trim((string) ($session['data']['url'] ?? ''));
    if ($url === '') {
        throw new Exception('Billing portal URL missing from Stripe response');
    }
    return ['url' => $url];
}

function ew_stripe_resolve_user_id_from_subscription(array $subscription): ?int
{
    $meta = $subscription['metadata'] ?? [];
    if (!empty($meta['user_id'])) {
        return (int) $meta['user_id'];
    }
    $customerId = trim((string) ($subscription['customer'] ?? ''));
    if ($customerId !== '') {
        $rows = query('SELECT id FROM users WHERE stripe_customer_id = ? LIMIT 1', [$customerId], 0);
        if ($rows) {
            return (int) $rows[0]['id'];
        }
    }
    return null;
}

function ew_stripe_tier_from_subscription(array $subscription): string
{
    require_once __DIR__ . '/tier_limits.php';
    $metaTier = trim((string) (($subscription['metadata']['tier_id'] ?? '') ?: ''));
    if ($metaTier !== '') {
        return ew_normalize_subscription_tier($metaTier);
    }
    $items = $subscription['items']['data'] ?? [];
    foreach ($items as $item) {
        $priceId = trim((string) ($item['price']['id'] ?? ''));
        $tier = ew_stripe_tier_for_price_id($priceId);
        if ($tier !== null) {
            return $tier;
        }
    }
    return 'free';
}

function ew_stripe_handle_subscription_object(array $subscription): void
{
    require_once __DIR__ . '/tier_limits.php';
    $userId = ew_stripe_resolve_user_id_from_subscription($subscription);
    if (!$userId) {
        return;
    }
    $subId = trim((string) ($subscription['id'] ?? ''));
    $status = strtolower(trim((string) ($subscription['status'] ?? '')));
    $dates = ew_stripe_extract_subscription_dates($subscription);
    $activeStatuses = ['active', 'trialing', 'past_due'];
    if (!in_array($status, $activeStatuses, true)) {
        ew_stripe_apply_subscription_tier($userId, 'free', $subId === '' ? null : $subId, $status);
        // Keep original subscribed date for history; clear next renewal.
        if ($dates['started_at'] !== null) {
            execute(
                'UPDATE users SET subscription_started_at = COALESCE(subscription_started_at, ?), subscription_renews_at = NULL WHERE id = ?',
                [$dates['started_at'], $userId],
                0
            );
        } else {
            ew_stripe_persist_subscription_dates($userId, null, null, true);
        }
        return;
    }
    $tier = ew_stripe_tier_from_subscription($subscription);
    ew_stripe_apply_subscription_tier($userId, $tier, $subId, $status);
    ew_stripe_persist_subscription_dates($userId, $dates['started_at'], $dates['renews_at']);
}

function ew_stripe_handle_checkout_session_completed(array $session): void
{
    $userId = (int) ($session['client_reference_id'] ?? 0);
    if ($userId <= 0 && !empty($session['metadata']['user_id'])) {
        $userId = (int) $session['metadata']['user_id'];
    }
    $subId = trim((string) ($session['subscription'] ?? ''));
    if ($userId <= 0 || $subId === '') {
        return;
    }
    $subRes = ew_stripe_api('GET', '/subscriptions/' . rawurlencode($subId));
    if (!$subRes['ok']) {
        return;
    }
    $subscription = $subRes['data'];
    if (empty($subscription['metadata']['user_id'])) {
        $subscription['metadata']['user_id'] = (string) $userId;
    }
    $customerId = trim((string) ($session['customer'] ?? ''));
    if ($customerId !== '') {
        execute('UPDATE users SET stripe_customer_id = ? WHERE id = ?', [$customerId, $userId], 0);
    }
    execute('UPDATE users SET stripe_subscription_id = ? WHERE id = ?', [$subId, $userId], 0);
    ew_stripe_handle_subscription_object($subscription);
}

function ew_stripe_verify_webhook(string $payload, string $sigHeader): bool
{
    if (!defined('STRIPE_WEBHOOK_SECRET') || trim((string) STRIPE_WEBHOOK_SECRET) === '') {
        return false;
    }
    $parts = [];
    foreach (explode(',', $sigHeader) as $piece) {
        $kv = explode('=', trim($piece), 2);
        if (count($kv) === 2) {
            $parts[$kv[0]] = $kv[1];
        }
    }
    $timestamp = $parts['t'] ?? '';
    $signature = $parts['v1'] ?? '';
    if ($timestamp === '' || $signature === '') {
        return false;
    }
    if (abs(time() - (int) $timestamp) > 300) {
        return false;
    }
    $signed = $timestamp . '.' . $payload;
    $expected = hash_hmac('sha256', $signed, (string) STRIPE_WEBHOOK_SECRET);
    return hash_equals($expected, $signature);
}

/**
 * Fill missing dates from Stripe for an active subscription (one-time backfill).
 */
function ew_stripe_maybe_backfill_subscription_dates(int $userId, array $row): array
{
    $started = trim((string) ($row['subscription_started_at'] ?? ''));
    $renews = trim((string) ($row['subscription_renews_at'] ?? ''));
    if ($started !== '' && $renews !== '') {
        return $row;
    }
    $subId = trim((string) ($row['stripe_subscription_id'] ?? ''));
    $status = strtolower(trim((string) ($row['stripe_subscription_status'] ?? '')));
    if ($subId === '' || !in_array($status, ['active', 'trialing', 'past_due'], true)) {
        return $row;
    }
    if (!ew_stripe_configured()) {
        return $row;
    }
    $subRes = ew_stripe_api('GET', '/subscriptions/' . rawurlencode($subId));
    if (!$subRes['ok'] || empty($subRes['data'])) {
        return $row;
    }
    $dates = ew_stripe_extract_subscription_dates($subRes['data']);
    ew_stripe_persist_subscription_dates($userId, $dates['started_at'], $dates['renews_at']);
    $row['subscription_started_at'] = $dates['started_at'];
    $row['subscription_renews_at'] = $dates['renews_at'];
    return $row;
}

function ew_stripe_billing_public_status(int $userId): array
{
    $row = ew_stripe_user_billing_row($userId);
    $enabled = ew_stripe_configured();
    if ($row) {
        $row = ew_stripe_maybe_backfill_subscription_dates($userId, $row);
    }
    // Catch missed renewal EC if invoice.paid webhook was not configured yet.
    try {
        ew_stripe_reconcile_subscription_ec_grants($userId);
    } catch (Throwable $e) {
        /* non-fatal */
    }
    $status = strtolower(trim((string) ($row['stripe_subscription_status'] ?? '')));
    $hasSubscription = $enabled
        && trim((string) ($row['stripe_subscription_id'] ?? '')) !== ''
        && in_array($status, ['active', 'trialing', 'past_due'], true);
    return [
        'billing_enabled' => $enabled,
        'stripe_subscription_status' => $status !== '' ? $status : null,
        'has_active_subscription' => $hasSubscription,
        'subscription_started_at' => ew_stripe_mysql_dt_to_iso($row['subscription_started_at'] ?? null),
        'subscription_renews_at' => ew_stripe_mysql_dt_to_iso($row['subscription_renews_at'] ?? null),
    ];
}
