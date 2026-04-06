<?php
// Stub: redirect to parent db.php
// This just overrides the local db.php to be a redirect stub like auth.php
$content = '<?php require_once __DIR__ . \'/../db.php\';' . "\r\n";
file_put_contents(__DIR__ . '/db.php', $content);
echo "db.php replaced with stub. Size: " . filesize(__DIR__ . '/db.php') . " bytes\n";
echo "Contents: " . file_get_contents(__DIR__ . '/db.php') . "\n";

// Also test if simulate.php now loads
echo "\nTesting simulate.php load...\n";
$_SERVER['REQUEST_METHOD'] = 'GET';
ob_start();
try {
    include __DIR__ . '/simulate.php';
    $output = ob_get_clean();
    echo "simulate.php loaded OK. Output: " . substr($output, 0, 200) . "\n";
} catch (Throwable $e) {
    $output = ob_get_clean();
    echo "Error: " . $e->getMessage() . "\n";
}
