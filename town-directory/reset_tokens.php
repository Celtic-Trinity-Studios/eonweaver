<?php
// Quick one-off: reset all token usage
header('Content-Type: text/plain');
if (($_GET['key'] ?? '') !== 'setup2024') die('Access denied');
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
$pdo = getDB();
$before = $pdo->query("SELECT COUNT(*) FROM user_token_usage")->fetchColumn();
$pdo->exec("TRUNCATE TABLE user_token_usage");
echo "Done. Cleared {$before} token usage rows.";
