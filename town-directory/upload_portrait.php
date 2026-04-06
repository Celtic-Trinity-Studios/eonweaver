<?php
/**
 * Town Directory — Portrait Upload Handler
 * Now saves portraits to users/{userId}/portraits/ for per-user isolation.
 * POST with multipart/form-data: file, char_id, town_id
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/auth.php';

function respond(array $data): void
{
    echo json_encode($data);
    exit;
}

try {
    $user = requireAuth();
    $uid = (int) $user['id'];
    $charId = (int) ($_POST['char_id'] ?? 0);
    $townId = (int) ($_POST['town_id'] ?? 0);

    if (!$charId || !$townId)
        respond(['ok' => false, 'error' => 'Missing char_id or town_id']);

    // Verify ownership
    $town = query('SELECT id FROM towns WHERE id = ? AND user_id = ?', [$townId, $uid], $uid);
    if (empty($town))
        respond(['ok' => false, 'error' => 'Unauthorized']);

    // Validate upload
    if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK)
        respond(['ok' => false, 'error' => 'No file uploaded or upload error: ' . ($_FILES['file']['error'] ?? 'none')]);

    $file = $_FILES['file'];
    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!isset($allowed[$mime]))
        respond(['ok' => false, 'error' => 'Invalid file type. Use JPG, PNG, WEBP, or GIF']);
    if ($file['size'] > 5 * 1024 * 1024)
        respond(['ok' => false, 'error' => 'File too large (max 5MB)']);

    // Per-user portraits directory
    $dir = portraitsDir($uid);   // from config.php: users/{uid}/portraits/
    $ext = $allowed[$mime];
    $filename = "char_{$charId}.{$ext}";
    $filepath = $dir . '/' . $filename;

    // Remove old portraits for this character (any extension)
    foreach (glob($dir . "/char_{$charId}.*") as $old) {
        if ($old !== $filepath)
            @unlink($old);
    }

    if (!move_uploaded_file($file['tmp_name'], $filepath))
        respond(['ok' => false, 'error' => 'Failed to save file. Directory: ' . $dir]);

    // Relative URL — users/{uid}/portraits/char_N.ext
    $url = "users/{$uid}/portraits/{$filename}?v=" . time();

    // Update DB
    execute(
        'UPDATE characters SET portrait_url = ? WHERE id = ? AND town_id = ?',
        [$url, $charId, $townId],
        $uid
    );

    respond(['ok' => true, 'url' => $url]);

} catch (Exception $e) {
    respond(['ok' => false, 'error' => $e->getMessage()]);
}
