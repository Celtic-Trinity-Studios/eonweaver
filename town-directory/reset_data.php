<?php
/**
 * Eon Weaver — Reset user data (keeps SRD tables intact).
 * Access: ?key=setup2024
 * DELETE after use.
 */
require_once __DIR__ . '/db.php';

if (($_GET['key'] ?? '') !== 'setup2024')
    die('Access denied.');

$pdo = getDB();

// Tables to wipe — order matters (foreign keys)
$tables = [
    'encounter_participants',
    'encounter_groups',
    'encounters',
    'party_members',
    'timeline_log',
    'rumors',
    'events',
    'factions',
    'user_credits',
    'site_settings',
    'calendar',
    'campaign_rules',
    'town_meta',
    'history',
    'characters',
    'towns',
    'campaigns',
    'users',
];

$pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
$results = [];
foreach ($tables as $t) {
    try {
        $pdo->exec("TRUNCATE TABLE `$t`");
        $results[] = "✅ Cleared $t";
    } catch (Exception $e) {
        try {
            $pdo->exec("DELETE FROM `$t`");
            $results[] = "✅ Cleared $t (DELETE)";
        } catch (Exception $e2) {
            $results[] = "⚠️ Skipped $t: " . $e2->getMessage();
        }
    }
}
$pdo->exec('SET FOREIGN_KEY_CHECKS = 1');

echo "<pre>" . implode("\n", $results) . "\n\n🎉 All user data cleared. SRD data preserved.\nRun setup_mysql.php to re-initialize tables.</pre>";
