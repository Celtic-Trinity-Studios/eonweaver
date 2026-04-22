<?php
/**
 * Eon Weaver — Content Upload Handler
 * Handles file uploads for the per-account content library.
 * POST with multipart/form-data: file, file_type, description, campaign_scoped
 * 
 * Supports: images (JPG, PNG, WEBP, GIF), PDFs, text files
 * Per-user storage: /users/{userId}/content/
 * File metadata stored in per-user SQLite DB: /users/{userId}/content.db
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
require_once __DIR__ . '/user_db.php';

function respond(array $data): void
{
    echo json_encode($data);
    exit;
}

try {
    $user = requireAuth();
    $uid = (int) $user['id'];
    $fileType = trim($_POST['file_type'] ?? 'document'); // map, handout, asset, document
    $description = trim($_POST['description'] ?? '');
    $campaignScoped = ($_POST['campaign_scoped'] ?? '1') === '1';

    // Validate upload
    if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK)
        respond(['ok' => false, 'error' => 'No file uploaded or upload error: ' . ($_FILES['file']['error'] ?? 'none')]);

    $file = $_FILES['file'];

    // Allowed MIME types
    $allowed = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
        'application/pdf' => 'pdf',
        'text/plain' => 'txt',
        'text/markdown' => 'md',
        'application/json' => 'json',
    ];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!isset($allowed[$mime]))
        respond(['ok' => false, 'error' => 'Invalid file type. Allowed: images (JPG, PNG, WEBP, GIF), PDF, TXT, MD, JSON']);

    // Check tier-based limits (tier from shared MySQL)
    $udata = query('SELECT subscription_tier FROM users WHERE id = ?', [$uid], 0);
    $tier = $udata[0]['subscription_tier'] ?? 'free';
    $maxFileSizes = ['free' => 2 * 1024 * 1024, 'adventurer' => 5 * 1024 * 1024, 'guild_master' => 10 * 1024 * 1024, 'world_builder' => 20 * 1024 * 1024];
    $maxFilesCounts = ['free' => 10, 'adventurer' => 50, 'guild_master' => 200, 'world_builder' => 9999];
    $maxStorages = ['free' => 20 * 1024 * 1024, 'adventurer' => 100 * 1024 * 1024, 'guild_master' => 500 * 1024 * 1024, 'world_builder' => 2048 * 1024 * 1024];
    $maxFileSize = $maxFileSizes[$tier] ?? $maxFileSizes['free'];
    $maxFiles = $maxFilesCounts[$tier] ?? $maxFilesCounts['free'];
    $maxStorage = $maxStorages[$tier] ?? $maxStorages['free'];

    if ($file['size'] > $maxFileSize) {
        $limitMB = $maxFileSize / (1024 * 1024);
        respond(['ok' => false, 'error' => "File too large (max {$limitMB}MB for {$tier} tier)"]);
    }

    // Count existing files (from user's SQLite DB)
    try {
        $fileCount = userQuery($uid, 'SELECT COUNT(*) as c FROM user_files');
        $currentCount = (int) ($fileCount[0]['c'] ?? 0);
        if ($currentCount >= $maxFiles) {
            respond(['ok' => false, 'error' => "File limit reached ({$maxFiles} files for {$tier} tier). Delete some files first."]);
        }

        // Check total storage
        $storageUsed = userQuery($uid, 'SELECT SUM(file_size) as total FROM user_files');
        $currentStorage = (int) ($storageUsed[0]['total'] ?? 0);
        if ($currentStorage + $file['size'] > $maxStorage) {
            $limitMB = $maxStorage / (1024 * 1024);
            respond(['ok' => false, 'error' => "Storage limit reached ({$limitMB}MB for {$tier} tier). Delete some files first."]);
        }
    } catch (Exception $e) {
        // DB might not exist yet — skip limit checks, getUserDB will auto-create
    }

    // Per-user content directory
    $dir = __DIR__ . '/users/' . $uid . '/content';
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }

    $ext = $allowed[$mime];
    $originalName = $file['name'];
    // Generate unique filename: type_timestamp_hash.ext
    $hash = substr(md5($originalName . microtime(true)), 0, 8);
    $filename = "{$fileType}_{$hash}.{$ext}";
    $filepath = $dir . '/' . $filename;

    if (!move_uploaded_file($file['tmp_name'], $filepath))
        respond(['ok' => false, 'error' => 'Failed to save file.']);

    // Get active campaign if scoped (from shared MySQL)
    $campId = null;
    if ($campaignScoped) {
        $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
        $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;
    }

    // Save to user's SQLite DB
    $newId = userInsert($uid,
        'INSERT INTO user_files (campaign_id, filename, original_name, file_type, mime_type, file_size, description) VALUES (?,?,?,?,?,?,?)',
        [$campId, $filename, $originalName, $fileType, $mime, $file['size'], $description]
    );

    $url = "users/{$uid}/content/{$filename}";

    respond([
        'ok' => true,
        'file' => [
            'id' => $newId,
            'filename' => $filename,
            'original_name' => $originalName,
            'file_type' => $fileType,
            'mime_type' => $mime,
            'file_size' => $file['size'],
            'url' => $url,
            'description' => $description,
        ],
    ]);

} catch (Exception $e) {
    respond(['ok' => false, 'error' => $e->getMessage()]);
}
