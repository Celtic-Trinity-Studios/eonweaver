<?php
/**
 * One-time password reset utility. DELETE after use.
 */
require_once __DIR__ . '/db.php';

$SETUP_PASSWORD = 'setup2024';
if (($_GET['key'] ?? '') !== $SETUP_PASSWORD)
    die('Access denied.');

$action = $_GET['do'] ?? 'list';

header('Content-Type: text/html; charset=utf-8');
echo '<!DOCTYPE html><html><head><title>User Admin</title>';
echo '<style>body{font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:20px;line-height:1.8}h1{color:#f5c518}table{border-collapse:collapse}td,th{padding:4px 12px;border:1px solid #333}</style>';
echo '</head><body>';

if ($action === 'list') {
    echo '<h1>All Users</h1>';
    $users = query('SELECT id, username, email, created_at FROM users ORDER BY id');
    echo '<table><tr><th>ID</th><th>Username</th><th>Email</th><th>Created</th><th>Towns</th></tr>';
    foreach ($users as $u) {
        $towns = query('SELECT COUNT(*) as c FROM towns WHERE user_id = ?', [$u['id']]);
        $tc = $towns[0]['c'] ?? 0;
        echo "<tr><td>{$u['id']}</td><td>{$u['username']}</td><td>{$u['email']}</td><td>{$u['created_at']}</td><td>$tc towns</td></tr>";
    }
    echo '</table>';
    echo '<h2>Reset Password</h2>';
    echo '<p>Use: ?key=setup2024&do=reset&user_id=ID&pw=NEWPASSWORD</p>';
} elseif ($action === 'reset') {
    $uid = (int) ($_GET['user_id'] ?? 0);
    $pw = $_GET['pw'] ?? '';
    if (!$uid || !$pw)
        die('Missing user_id or pw');
    $hash = password_hash($pw, PASSWORD_BCRYPT);
    execute('UPDATE users SET password_hash = ? WHERE id = ?', [$hash, $uid]);
    echo "<h1>✅ Password reset for user ID $uid</h1>";
} elseif ($action === 'delete') {
    $uid = (int) ($_GET['user_id'] ?? 0);
    if (!$uid)
        die('Missing user_id');
    execute('DELETE FROM town_meta WHERE town_id IN (SELECT id FROM towns WHERE user_id = ?)', [$uid]);
    execute('DELETE FROM history WHERE town_id IN (SELECT id FROM towns WHERE user_id = ?)', [$uid]);
    execute('DELETE FROM characters WHERE town_id IN (SELECT id FROM towns WHERE user_id = ?)', [$uid]);
    execute('DELETE FROM towns WHERE user_id = ?', [$uid]);
    execute('DELETE FROM users WHERE id = ?', [$uid]);
    echo "<h1>✅ Deleted user ID $uid and all their data</h1>";
}

echo '</body></html>';
