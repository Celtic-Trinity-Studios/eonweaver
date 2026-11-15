<?php
/**
 * Encounter table background image.
 * Expects multipart/form-data with `file` and `encounter_id`.
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
require_once __DIR__ . '/encounter_table_lib.php';

function respondEncounterTableUpload(array $data): void
{
    echo json_encode($data);
    exit;
}

try {
    $user = requireAuth();
    $uid = (int) $user['id'];
    encounterTableEnsureSchema();
    $encounterId = (int) ($_POST['encounter_id'] ?? 0);
    if ($encounterId <= 0) {
        throw new Exception('Open an encounter before uploading a map.');
    }
    encounterTableRequireEncounter($uid, $encounterId);
    encounterTableEnsureRow($uid, $encounterId);

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

    $dir = __DIR__ . '/uploads/encounter_tables/' . $uid;
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
        throw new Exception('Could not create the encounter table upload directory.');
    }

    $ext = $allowed[$mime];
    $filename = 'enc_' . $encounterId . '.' . $ext;
    $filepath = $dir . '/' . $filename;
    encounterTableUnlinkImages($uid, $encounterId);

    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        throw new Exception('Failed to save the uploaded image.');
    }

    $url = 'uploads/encounter_tables/' . $uid . '/' . $filename . '?v=' . time();
    if (!encounterTableImageUrlOk($uid, $encounterId, $url)) {
        @unlink($filepath);
        throw new Exception('Saved image path was rejected.');
    }
    encounterTableSetImageUrl($uid, $encounterId, $url);
    respondEncounterTableUpload(['ok' => true, 'url' => $url, 'encounter_id' => $encounterId]);
} catch (Exception $e) {
    respondEncounterTableUpload(['ok' => false, 'error' => $e->getMessage()]);
}
