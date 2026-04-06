<?php
/**
 * Eon Weaver — Authentication
 * Users table lives in the shared MySQL database.
 */
require_once __DIR__ . '/db.php';

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

function register(string $username, string $email, string $password, string $betaKey = ''): array
{
    if (!ALLOW_REGISTRATION)
        throw new \Exception('Registration is currently disabled.');

    // Beta key validation
    if (defined('BETA_KEY') && BETA_KEY) {
        if (trim($betaKey) !== BETA_KEY) {
            throw new \Exception('Invalid beta key. Contact the developer for access.');
        }
    }

    $username = trim($username);
    $email = trim(strtolower($email));

    if (strlen($username) < 3 || strlen($username) > 50)
        throw new \Exception('Username must be 3–50 characters.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL))
        throw new \Exception('Invalid email address.');
    if (strlen($password) < 6)
        throw new \Exception('Password must be at least 6 characters.');

    // Uniqueness check — shared DB
    $existing = query('SELECT id FROM users WHERE username = ? OR email = ?', [$username, $email], 0);
    if ($existing)
        throw new \Exception('Username or email already taken.');

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $id = insertAndGetId(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        [$username, $email, $hash],
        0
    );

    startSession();
    $_SESSION['user_id'] = $id;

    return ['id' => $id, 'username' => $username, 'email' => $email];
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
    startSession();
    $_SESSION['user_id'] = $user['id'];

    return ['id' => $user['id'], 'username' => $user['username'], 'email' => $user['email'], 'role' => $user['role'] ?? 'user'];
}

function logout(): void
{
    startSession();
    $_SESSION = [];
    session_destroy();
}
