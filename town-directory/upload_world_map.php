<?php
/**
 * World map image upload endpoint (per-user, per-campaign).
 * Expects multipart/form-data with `file`.
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

function respondUpload(array $data): void
{
    echo json_encode($data);
    exit;
}

try {
    $user = requireAuth();
    $uid = (int) $user['id'];
    $campRows = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
    $campId = $campRows ? (int) $campRows[0]['id'] : 0;
    if (!$campId) {
        throw new Exception('No active campaign selected.');
    }

    if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('No file uploaded or upload failed.');
    }

    $file = $_FILES['file'];
    $allowed = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    if (!isset($allowed[$mime])) {
        throw new Exception('Invalid file type. Use JPG, PNG, WEBP, or GIF.');
    }
    if ($file['size'] > 10 * 1024 * 1024) {
        throw new Exception('File too large (max 10MB).');
    }

    $dir = __DIR__ . '/uploads/world_maps/' . $uid;
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
        throw new Exception('Could not create world map upload directory.');
    }

    $ext = $allowed[$mime];
    $filename = 'campaign_' . $campId . '.' . $ext;
    $filepath = $dir . '/' . $filename;

    foreach (glob($dir . '/campaign_' . $campId . '.*') as $old) {
        if ($old !== $filepath) {
            @unlink($old);
        }
    }

    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        throw new Exception('Failed to save uploaded map image.');
    }

    $url = 'uploads/world_maps/' . $uid . '/' . $filename . '?v=' . time();
    respondUpload(['ok' => true, 'url' => $url]);
} catch (Exception $e) {
    respondUpload(['ok' => false, 'error' => $e->getMessage()]);
}
