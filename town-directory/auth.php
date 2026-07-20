<?php
/**
 * Eon Weaver — Authentication
 * Users table lives in the shared MySQL database.
 */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/app_public_lib.php';

function startSession(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        session_name(SESSION_NAME);
        session_set_cookie_params([
            'lifetime' => SESSION_LIFETIME,
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }
}

function currentUser(): ?array
{
    startSession();
    if (empty($_SESSION['user_id']))
        return null;
    // users table is in the shared DB (userId = 0)
    $rows = query('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [$_SESSION['user_id']], 0);
    return $rows[0] ?? null;
}

function requireAuth(): array
{
    $user = currentUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Not authenticated']);
        exit;
    }
    return $user;
}

function requireAdmin(): array
{
    $user = requireAuth();
    $role = query('SELECT role FROM users WHERE id = ?', [(int) $user['id']], 0);
    if (($role[0]['role'] ?? 'user') !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Admin access required.']);
        exit;
    }
    return $user;
}

function ew_signup_credit_grant_raw(): int
{
    return defined('FREE_SIGNUP_CREDIT_GRANT_RAW') ? max(0, (int) FREE_SIGNUP_CREDIT_GRANT_RAW) : 300000;
}

/**
 * True when SMTP is configured — then new accounts must verify email before login / credits.
 */
function ew_registration_requires_email_confirmation(): bool
{
    require_once __DIR__ . '/smtp_mail.php';
    return ew_mail_configured();
}

function register(string $username, string $email, string $password): array
{
    require_once __DIR__ . '/signup_policy.php';
    require_once __DIR__ . '/smtp_mail.php';
    if (file_exists(__DIR__ . '/metrics_lib.php')) {
        require_once __DIR__ . '/metrics_lib.php';
    }

    $ip = ew_client_ip();
    $emailDomain = '';
    $atIdx = strrpos($email, '@');
    if ($atIdx !== false) {
        $emailDomain = strtolower(substr($email, $atIdx + 1));
    }

    $recordOutcome = function (string $outcome) use ($ip, $emailDomain) {
        if (function_exists('ew_record_signup_outcome')) {
            ew_record_signup_outcome($ip, $emailDomain, $outcome);
        }
    };

    try {
        if (!ALLOW_REGISTRATION) {
            throw new \Exception('Registration is currently disabled.');
        }

        $username = trim($username);
        $email = trim(strtolower($email));

        if (strlen($username) < 3 || strlen($username) > 50) {
            $recordOutcome('bad_username');
            throw new \Exception('Username must be 3–50 characters.');
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $recordOutcome('invalid_email');
            throw new \Exception('Invalid email address.');
        }
        if (strlen($password) < 6) {
            $recordOutcome('password_short');
            throw new \Exception('Password must be at least 6 characters.');
        }

        if (ew_is_disposable_email($email)) {
            $recordOutcome('disposable_email');
            throw new \Exception('Please use a permanent email address (temporary/disposable domains are blocked).');
        }

        try {
            ew_signup_rate_limit_throw_if_exceeded($ip);
        } catch (\Exception $rl) {
            $recordOutcome('rate_limit');
            throw $rl;
        }
        try {
            ew_signup_throw_if_datacenter_ip($ip);
        } catch (\Exception $vp) {
            $recordOutcome('vpn_block');
            throw $vp;
        }

        $existing = query('SELECT id FROM users WHERE username = ? OR email = ?', [$username, $email], 0);
        if ($existing) {
            $recordOutcome('dup_user');
            throw new \Exception('Username or email already taken.');
        }

        ew_signup_record_attempt($ip, $emailDomain);
    } catch (\Throwable $t) {
        throw $t;
    }

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $grant = ew_signup_credit_grant_raw();
    $needVerify = ew_registration_requires_email_confirmation();

    $verifyTok = null;
    $verifyExp = null;
    $verifiedFlag = 1;
    $initialCredits = $grant;

    if ($needVerify) {
        $verifiedFlag = 0;
        $initialCredits = 0;
        $verifyTok = bin2hex(random_bytes(32));
        $verifyExp = date('Y-m-d H:i:s', time() + 86400 * 2);
    }

    $id = insertAndGetId(
        'INSERT INTO users (username, email, password_hash, credit_balance, subscription_tier, email_verified, email_verify_token, email_verify_expires, signup_ip)
         VALUES (?, ?, ?, ?, \'free\', ?, ?, ?, ?)',
        [$username, $email, $hash, $initialCredits, $verifiedFlag, $verifyTok, $verifyExp, $ip],
        0
    );

    if ($needVerify && $verifyTok) {
        $base = ew_app_public_base_url();
        $link = $base . '/verify_email.php?token=' . rawurlencode($verifyTok);
        $site = defined('APP_PUBLIC_TITLE') ? APP_PUBLIC_TITLE : (defined('APP_NAME') ? APP_NAME : 'Eon Weaver');
        $html = '<p>Confirm your email for <strong>' . htmlspecialchars($site) . '</strong>:</p>'
            . '<p><a href="' . htmlspecialchars($link) . '">Verify my email</a></p>'
            . '<p style="color:#666;font-size:12px">If you did not sign up, ignore this message.</p>';
        $sent = ew_send_html_mail($email, $site . ' — confirm your email', $html, "Confirm your account:\n{$link}");
        if (!$sent) {
            execute('DELETE FROM users WHERE id = ?', [$id], 0);
            $recordOutcome('mail_failed');
            throw new \Exception('Could not send verification email. Check SMTP settings or try again later.');
        }

        $recordOutcome('pending_verify');

        return [
            'id' => $id,
            'username' => $username,
            'email' => $email,
            'needs_verification' => true,
        ];
    }

    $recordOutcome('success');

    startSession();
    $_SESSION['user_id'] = $id;

    return ['id' => $id, 'username' => $username, 'email' => $email, 'needs_verification' => false];
}

function login(string $usernameOrEmail, string $password): array
{
    $usernameOrEmail = trim($usernameOrEmail);
    $rows = query(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [$usernameOrEmail, strtolower($usernameOrEmail)],
        0
    );

    if (!$rows || !password_verify($password, $rows[0]['password_hash']))
        throw new \Exception('Invalid username/email or password.');

    $user = $rows[0];
    if (isset($user['email_verified']) && (int) $user['email_verified'] === 0) {
        throw new \Exception('Please verify your email before signing in. Check your inbox or request a new confirmation link from the registration screen.');
    }

    startSession();
    $_SESSION['user_id'] = $user['id'];

    return [
        'id' => $user['id'],
        'username' => $user['username'],
        'email' => $user['email'],
        'role' => $user['role'] ?? 'user',
        'is_debug' => (int) ($user['is_debug'] ?? 0) === 1,
    ];
}

/**
 * Resend verification email (public — uses email only).
 */
function resendVerificationEmail(string $email): bool
{
    require_once __DIR__ . '/smtp_mail.php';
    if (!ew_mail_configured()) {
        return false;
    }

    $email = trim(strtolower($email));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return true;
    }

    $rows = query(
        'SELECT id, username, email_verify_token, email_verify_expires FROM users WHERE email = ? AND email_verified = 0',
        [$email],
        0
    );
    if (!$rows) {
        return true;
    }

    $verifyTok = $rows[0]['email_verify_token'] ?? null;
    if (!$verifyTok || strlen((string) $verifyTok) < 20) {
        $verifyTok = bin2hex(random_bytes(32));
        $verifyExp = date('Y-m-d H:i:s', time() + 86400 * 2);
        execute(
            'UPDATE users SET email_verify_token = ?, email_verify_expires = ? WHERE id = ?',
            [$verifyTok, $verifyExp, (int) $rows[0]['id']],
            0
        );
    }

    $base = ew_app_public_base_url();
    $link = $base . '/verify_email.php?token=' . rawurlencode($verifyTok);
    $site = defined('APP_PUBLIC_TITLE') ? APP_PUBLIC_TITLE : (defined('APP_NAME') ? APP_NAME : 'Eon Weaver');
    $html = '<p>Confirm your email for <strong>' . htmlspecialchars($site) . '</strong>:</p>'
        . '<p><a href="' . htmlspecialchars($link) . '">Verify my email</a></p>';

    ew_send_html_mail($email, $site . ' — confirm your email', $html, "Confirm your account:\n{$link}");
    return true;
}

function logout(): void
{
    startSession();
    $_SESSION = [];
    session_destroy();
}
