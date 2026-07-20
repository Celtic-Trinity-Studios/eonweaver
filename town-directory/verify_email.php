<?php
/**
 * Email verification landing (GET ?token=).
 * Completes signup credit grant on first verify.
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/app_public_lib.php';

$token = isset($_GET['token']) ? trim((string) $_GET['token']) : '';
$base = ew_app_public_base_url();

function ew_redirect(string $path): void
{
    header('Location: ' . $path);
    exit;
}

if (strlen($token) < 32) {
    ew_redirect($base . '/?verify_error=invalid');
}

$rows = query(
    'SELECT id, email_verified, credit_balance FROM users WHERE email_verify_token = ? AND (email_verify_expires IS NULL OR email_verify_expires > NOW())',
    [$token],
    0
);

if (!$rows) {
    ew_redirect($base . '/?verify_error=expired');
}

$userId = (int) $rows[0]['id'];
$already = (int) ($rows[0]['email_verified'] ?? 0) === 1;

if (!$already) {
    $grant = defined('FREE_SIGNUP_CREDIT_GRANT_RAW') ? (int) FREE_SIGNUP_CREDIT_GRANT_RAW : 300000;
    execute(
        'UPDATE users SET email_verified = 1, email_verify_token = NULL, email_verify_expires = NULL,
         credit_balance = credit_balance + ? WHERE id = ?',
        [$grant, $userId],
        0
    );
}

ew_redirect($base . '/?verified=1');
