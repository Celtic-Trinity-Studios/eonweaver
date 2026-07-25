<?php
/**
 * Stripe webhook endpoint — subscription lifecycle → users.subscription_tier + EC grants.
 *
 * Stripe Dashboard → Developers → Webhooks → Add endpoint:
 *   https://YOUR_DOMAIN/stripe_webhook.php
 *
 * Events: checkout.session.completed, customer.subscription.updated,
 *         customer.subscription.deleted, invoice.paid
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/stripe_billing_lib.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$payload = file_get_contents('php://input');
$sig = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

if (!ew_stripe_verify_webhook((string) $payload, (string) $sig)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid signature']);
    exit;
}

$event = json_decode((string) $payload, true);
if (!is_array($event) || empty($event['type'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid payload']);
    exit;
}

$type = (string) $event['type'];
$object = $event['data']['object'] ?? null;

try {
    switch ($type) {
        case 'checkout.session.completed':
            if (is_array($object)) {
                ew_stripe_handle_checkout_session_completed($object);
            }
            break;
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
            if (is_array($object)) {
                ew_stripe_handle_subscription_object($object);
            }
            break;
        case 'invoice.paid':
            if (is_array($object)) {
                ew_stripe_handle_invoice_paid($object);
            }
            break;
        default:
            break;
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
    exit;
}

echo json_encode(['ok' => true, 'type' => $type]);
