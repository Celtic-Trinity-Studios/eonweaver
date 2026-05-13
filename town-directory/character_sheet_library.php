<?php
/**
 * Master NPC store: per-user merged sheets (no town_id), keyed by name + campaign + edition — table `character_sheet_library`.
 * Town population lives in `characters`; `characters.library_sheet_id` links a resident back to their master row.
 *
 * Intake flesh: borrow when stub name matches a master NPC, town has no living resident with that name, and
 * the stored snapshot has enough flavor text. After sim_apply inserts an NPC, upsert refreshes the library.
 */

/**
 * @return int 0 = no campaign / legacy towns
 */
function ew_sheet_lib_campaign_key(?int $campaignId): int
{
    return ($campaignId !== null && $campaignId > 0) ? $campaignId : 0;
}

function ew_sheet_lib_name_norm(string $name): string
{
    $n = strtolower(trim($name));

    return strlen($n) > 190 ? substr($n, 0, 190) : $n;
}

/**
 * Strip internal keys and build JSON-safe snapshot for library storage.
 *
 * @param array<string, mixed> $nc
 * @return array<string, mixed>
 */
function ew_sheet_library_snapshot_payload(array $nc): array
{
    $keys = [
        'name', 'race', 'class', 'gender', 'age', 'alignment', 'role', 'status',
        'history', 'reason', 'skills_feats', 'feats', 'str', 'dex', 'con', 'int_', 'int', 'wis', 'cha',
        'hp', 'ac', 'init', 'spd', 'grapple', 'atk', 'saves', 'languages', 'hd', 'cr', 'gear',
        'spouse', 'spouse_label', 'domains',
    ];
    $out = [];
    foreach ($keys as $k) {
        if (!array_key_exists($k, $nc)) {
            continue;
        }
        $v = $nc[$k];
        if ($v === null || $v === '') {
            continue;
        }
        $out[$k] = $v;
    }
    $hist = trim((string) ($out['history'] ?? $out['reason'] ?? ''));
    if ($hist !== '') {
        $out['history'] = $hist;
        $out['reason'] = $hist;
    }

    return $out;
}

/**
 * Try user's sheet library before cross-town / pool / LLM flesh.
 *
 * @param array<string, bool> $usedFlavorHashes
 * @param array<string, bool> $usedFullHashes
 * @return array<string, mixed>|null
 */
function ew_intake_sheet_library_try_borrow(
    int $userId,
    ?int $campaignId,
    int $townId,
    int $uid,
    string $dndEdition,
    array $stub,
    array &$usedFlavorHashes,
    array &$usedFullHashes
): ?array {
    if (!empty($stub['is_creature'])) {
        return null;
    }
    $nameNorm = ew_sheet_lib_name_norm((string) ($stub['name'] ?? ''));
    if ($nameNorm === '') {
        return null;
    }
    $ck = ew_sheet_lib_campaign_key($campaignId);
    $dnd = trim($dndEdition) !== '' ? trim($dndEdition) : '3.5e';

    try {
        $rows = query(
            'SELECT id, sheet_json FROM character_sheet_library
             WHERE user_id = ? AND campaign_key = ? AND dnd_edition = ? AND name_norm = ? LIMIT 1',
            [$userId, $ck, $dnd, $nameNorm],
            $uid
        );
    } catch (Throwable $e) {
        return null;
    }
    if (empty($rows)) {
        return null;
    }

    // Do not attach a second body to a name already occupied in this town (exact match handles same row).
    try {
        $inTown = query(
            'SELECT 1 FROM characters WHERE town_id = ? AND LOWER(TRIM(name)) = ? AND COALESCE(TRIM(status), \'\') <> ? LIMIT 1',
            [$townId, $nameNorm, 'Deceased'],
            $uid
        );
    } catch (Throwable $e) {
        return null;
    }
    if (!empty($inTown)) {
        return null;
    }

    $json = trim((string) ($rows[0]['sheet_json'] ?? ''));
    if ($json === '') {
        return null;
    }
    $sheet = json_decode($json, true);
    if (!is_array($sheet)) {
        return null;
    }
    $hist = trim((string) ($sheet['history'] ?? $sheet['reason'] ?? ''));
    if (strlen($hist) < 12) {
        return null;
    }
    $sk = trim((string) ($sheet['skills_feats'] ?? ''));
    $ft = trim((string) ($sheet['feats'] ?? ''));
    $fh = ew_npc_flavor_text_hash($hist, $sk, $ft);
    if (!empty($usedFlavorHashes[$fh])) {
        return null;
    }
    $fp = ew_npc_flavor_fp_full_sheet($sheet);
    if (!empty($usedFullHashes[$fp])) {
        return null;
    }
    $merged = ew_npc_flavor_merge_stub_with_sheet($stub, $sheet);
    $fp2 = ew_npc_flavor_fp_full_sheet($merged);
    if (!empty($usedFullHashes[$fp2])) {
        return null;
    }
    $usedFlavorHashes[$fh] = true;
    $usedFullHashes[$fp2] = true;
    $libId = (int) ($rows[0]['id'] ?? 0);

    return array_merge($merged, [
        '_from_sheet_library' => true,
        '_library_sheet_id' => $libId,
    ]);
}

/**
 * Upsert library row from a `characters` table row (after insert).
 *
 * @param array<string, mixed> $charRow
 */
function ew_sheet_library_upsert_from_character_row(
    int $userId,
    ?int $campaignId,
    string $dndEdition,
    array $charRow,
    int $uid
): bool {
    if (!empty($charRow['is_creature'])) {
        return false;
    }
    $name = trim((string) ($charRow['name'] ?? ''));
    if ($name === '') {
        return false;
    }
    $nameNorm = ew_sheet_lib_name_norm($name);
    $ck = ew_sheet_lib_campaign_key($campaignId);
    $dnd = trim($dndEdition) !== '' ? trim($dndEdition) : '3.5e';

    $sheet = ew_npc_flavor_character_row_to_sheet($charRow);
    if (!empty($charRow['domains'])) {
        $sheet['domains'] = $charRow['domains'];
    }
    $payload = ew_sheet_library_snapshot_payload($sheet);
    $hist = trim((string) ($payload['history'] ?? $payload['reason'] ?? ''));
    if (strlen($hist) < 12) {
        return false;
    }
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        return false;
    }

    try {
        execute(
            'INSERT INTO character_sheet_library (user_id, campaign_key, dnd_edition, name, name_norm, sheet_json, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE name = VALUES(name), sheet_json = VALUES(sheet_json), updated_at = NOW()',
            [$userId, $ck, $dnd, $name, $nameNorm, $json],
            $uid
        );

        return true;
    } catch (Throwable $e) {
        return false;
    }
}

/**
 * True if class line looks like a creature HD type (excludes Humanoid — e.g. goblins stay eligible).
 */
function ew_sheet_library_row_looks_like_creature(array $row): bool
{
    $cls = trim((string) ($row['class'] ?? ''));
    if ($cls === '') {
        return false;
    }
    $clsLower = strtolower($cls);

    return (bool) preg_match(
        '/^\s*(magical beast|vermin|animal|dragon|undead|construct|ooze|elemental|outsider|aberration|fiend|celestial|giant|monstrous humanoid|shapechanger|fey|plant|swarm)\s+\d+/i',
        $clsLower
    );
}

/**
 * Upsert library rows from all existing town characters (copy; does not remove characters from towns).
 * Skips deceased, short history, and obvious creature stat lines.
 *
 * @return array{scanned:int, upserted:int, skipped:int, errors:int}
 */
function ew_sheet_library_backfill_from_all_characters(int $uid = 0): array
{
    require_once __DIR__ . '/npc_flavor_pool.php';

    $stats = ['scanned' => 0, 'upserted' => 0, 'skipped' => 0, 'errors' => 0];
    $sql = 'SELECT c.*, t.user_id AS _lib_owner, t.campaign_id AS _town_camp,
            COALESCE(camp.dnd_edition, \'3.5e\') AS _lib_dnd
            FROM characters c
            INNER JOIN towns t ON t.id = c.town_id
            LEFT JOIN campaigns camp ON camp.id = t.campaign_id
            WHERE CHAR_LENGTH(TRIM(COALESCE(c.history, \'\'))) >= 12
              AND COALESCE(TRIM(c.status), \'\') <> ?
              AND TRIM(COALESCE(c.name, \'\')) <> \'\'';

    try {
        $rows = query($sql, ['Deceased'], $uid);
    } catch (Throwable $e) {
        $stats['errors']++;

        return $stats;
    }
    if (empty($rows)) {
        return $stats;
    }

    foreach ($rows as $row) {
        $stats['scanned']++;
        if (ew_sheet_library_row_looks_like_creature($row)) {
            $stats['skipped']++;
            continue;
        }
        $owner = (int) ($row['_lib_owner'] ?? 0);
        if ($owner <= 0) {
            $stats['skipped']++;
            continue;
        }
        $campRaw = $row['_town_camp'] ?? null;
        $campaignId = ($campRaw !== null && (int) $campRaw > 0) ? (int) $campRaw : null;
        $dnd = trim((string) ($row['_lib_dnd'] ?? '3.5e')) ?: '3.5e';

        unset($row['_lib_owner'], $row['_town_camp'], $row['_lib_dnd']);

        if (ew_sheet_library_upsert_from_character_row($owner, $campaignId, $dnd, $row, $uid)) {
            $stats['upserted']++;
        } else {
            $stats['skipped']++;
        }
    }

    return $stats;
}
