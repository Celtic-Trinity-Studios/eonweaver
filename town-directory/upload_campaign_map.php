<?php
/**
 * Campaign handout map image upload.
 * Expects multipart/form-data with `file` and `map_id`.
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
require_once __DIR__ . '/campaign_map_lib.php';

function respondCampaignMapUpload(array $data): void
{
    echo json_encode($data);
    exit;
}

try {
    $user = requireAuth();
    $uid = (int) $user['id'];
    campaignMapEnsureSchema();
    $campId = campaignMapActiveCampaignId($uid);
    $mapId = (int) ($_POST['map_id'] ?? 0);
    if ($mapId <= 0) {
        throw new Exception('Choose a map before uploading an image.');
    }
    campaignMapRequireOwned($uid, $campId, $mapId);

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

    $dir = __DIR__ . '/uploads/campaign_maps/' . $uid;
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
        throw new Exception('Could not create campaign map upload directory.');
    }

    $ext = $allowed[$mime];
    $filename = 'map_' . $mapId . '.' . $ext;
    $filepath = $dir . '/' . $filename;
    campaignMapUnlinkFiles($uid, $mapId);

    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        throw new Exception('Failed to save uploaded map image.');
    }

    $url = 'uploads/campaign_maps/' . $uid . '/' . $filename . '?v=' . time();
    respondCampaignMapUpload(['ok' => true, 'url' => $url, 'map_id' => $mapId]);
} catch (Exception $e) {
    respondCampaignMapUpload(['ok' => false, 'error' => $e->getMessage()]);
}
