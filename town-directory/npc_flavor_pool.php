<?php
/**
 * NPC reuse — stored only in MySQL (this file + tables npc_flavor_pool, npc_reuse_generated).
 * NOT written to llm_training.jsonl (that file is for optional OpenRouter training export only).
 *
 * - npc_flavor_pool: deduped borrow pool (profile + flavor hash + full_sheet_json).
 * - npc_reuse_generated: append-only row per qualifying applied NPC (full_sheet_json + town/character ids).
 * - characters table: first-choice donors for intake flesh when (town_id, stub name) does not already
 *   identify an existing resident (see ew_npc_flavor_character_db_try_borrow).
 */

/**
 * @return array{r: string, c: string, g: string, rl: string, al: string, cr: int}
 */
function ew_npc_flavor_stub_profile(array $stub): array
{
    $r = strtolower(trim($stub['race'] ?? 'Human'));
    $c = trim($stub['class'] ?? 'Commoner 1');
    $g = strtoupper(substr(trim($stub['gender'] ?? 'M'), 0, 1)) === 'F' ? 'F' : 'M';
    $rl = strtolower(trim($stub['role'] ?? ''));
    $al = strtoupper(trim($stub['alignment'] ?? 'TN'));
    $cr = !empty($stub['is_creature']) ? 1 : 0;

    return ['r' => $r, 'c' => $c, 'g' => $g, 'rl' => $rl, 'al' => $al, 'cr' => $cr];
}

function ew_npc_flavor_profile_hash(string $dndEdition, array $profile): string
{
    $key = strtolower(trim($dndEdition)) . '|' . $profile['r'] . '|' . $profile['c'] . '|' . $profile['g'] . '|' . $profile['rl'] . '|' . $profile['al'] . '|' . $profile['cr'];

    return md5($key);
}

function ew_npc_flavor_text_hash(string $reason, string $skills, string $feats): string
{
    $blob = trim($reason) . "\n" . trim($skills) . "\n" . trim($feats);

    return md5($blob);
}

/** Fingerprint mechanical + flavor identity (excludes name — stub name differs on reuse). */
function ew_npc_flavor_fp_full_sheet(array $row): string
{
    $hist = trim((string) ($row['history'] ?? $row['reason'] ?? ''));
    $parts = [
        (string) ($row['str'] ?? ''),
        (string) ($row['dex'] ?? ''),
        (string) ($row['con'] ?? ''),
        (string) ($row['int_'] ?? $row['int'] ?? ''),
        (string) ($row['wis'] ?? ''),
        (string) ($row['cha'] ?? ''),
        (string) ($row['hp'] ?? ''),
        trim((string) ($row['skills_feats'] ?? '')),
        trim((string) ($row['feats'] ?? '')),
        $hist,
    ];

    return md5(implode("\x1e", $parts));
}

function ew_npc_flavor_dnd_edition_for_town(int $townId, int $uid): string
{
    try {
        $t = query('SELECT campaign_id FROM towns WHERE id = ?', [$townId], $uid);
        $cid = (int) ($t[0]['campaign_id'] ?? 0);
        if ($cid > 0) {
            $c = query('SELECT dnd_edition FROM campaigns WHERE id = ?', [$cid], 0);
            if ($c && !empty($c[0]['dnd_edition'])) {
                return (string) $c[0]['dnd_edition'];
            }
        }
    } catch (Throwable $e) {
    }

    return '3.5e';
}

/**
 * @return array{text_hashes: array<string, true>, full_hashes: array<string, true>}
 */
function ew_npc_flavor_town_borrow_blocklists(int $townId, int $uid): array
{
    $textHashes = [];
    $fullHashes = [];
    try {
        $rows = query(
            'SELECT history, skills_feats, feats, str, dex, con, int_, wis, cha, hp FROM characters
             WHERE town_id = ? AND COALESCE(TRIM(status), "") <> ?',
            [$townId, 'Deceased'],
            $uid
        );
        foreach ($rows ?: [] as $row) {
            $hist = trim((string) ($row['history'] ?? ''));
            if (strlen($hist) >= 12) {
                $textHashes[md5($hist)] = true;
            }
            $sk = trim((string) ($row['skills_feats'] ?? ''));
            $ft = trim((string) ($row['feats'] ?? ''));
            $textHashes[ew_npc_flavor_text_hash($hist, $sk, $ft)] = true;
            $fullHashes[ew_npc_flavor_fp_full_sheet([
                'history' => $hist,
                'reason' => $hist,
                'str' => $row['str'] ?? '',
                'dex' => $row['dex'] ?? '',
                'con' => $row['con'] ?? '',
                'int_' => $row['int_'] ?? '',
                'wis' => $row['wis'] ?? '',
                'cha' => $row['cha'] ?? '',
                'hp' => $row['hp'] ?? '',
                'skills_feats' => $sk,
                'feats' => $ft,
            ])] = true;
        }
    } catch (Throwable $e) {
    }

    return ['text_hashes' => $textHashes, 'full_hashes' => $fullHashes];
}

/**
 * @return array<string, bool>
 * @deprecated Prefer ew_npc_flavor_town_borrow_blocklists(); kept for callers that only need history md5.
 */
function ew_npc_flavor_town_history_hashes(int $townId, int $uid): array
{
    $out = [];
    try {
        $rows = query('SELECT history FROM characters WHERE town_id = ? AND COALESCE(TRIM(status), "") <> ?', [$townId, 'Deceased'], $uid);
        foreach ($rows as $row) {
            $h = trim((string) ($row['history'] ?? ''));
            if (strlen($h) < 12) {
                continue;
            }
            $out[md5($h)] = true;
        }
    } catch (Throwable $e) {
    }

    return $out;
}

/**
 * Map a `characters` row to a sheet-shaped array for ew_npc_flavor_merge_stub_with_sheet().
 *
 * @param array<string, mixed> $row
 * @return array<string, mixed>
 */
function ew_npc_flavor_character_row_to_sheet(array $row): array
{
    $hist = trim((string) ($row['history'] ?? ''));
    $cls = trim((string) ($row['class'] ?? 'Commoner'));
    $lv = (int) ($row['level'] ?? 1);
    if ($lv > 0 && $cls !== '' && !preg_match('/\d+\s*$/', $cls)) {
        $cls = trim($cls . ' ' . $lv);
    }
    if ($cls === '') {
        $cls = 'Commoner 1';
    }

    return [
        'name' => trim((string) ($row['name'] ?? '')),
        'race' => trim((string) ($row['race'] ?? '')),
        'class' => $cls,
        'level' => (int) ($row['level'] ?? 1),
        'gender' => $row['gender'] ?? 'M',
        'age' => (int) ($row['age'] ?? 0),
        'status' => (string) ($row['status'] ?? 'Alive'),
        'alignment' => trim((string) ($row['alignment'] ?? '')),
        'role' => trim((string) ($row['role'] ?? '')),
        'str' => $row['str'] ?? '',
        'dex' => $row['dex'] ?? '',
        'con' => $row['con'] ?? '',
        'int_' => $row['int_'] ?? '',
        'int' => $row['int_'] ?? '',
        'wis' => $row['wis'] ?? '',
        'cha' => $row['cha'] ?? '',
        'hp' => (string) ($row['hp'] ?? ''),
        'ac' => (string) ($row['ac'] ?? ''),
        'init' => (string) ($row['init'] ?? ''),
        'spd' => (string) ($row['spd'] ?? ''),
        'grapple' => (string) ($row['grapple'] ?? ''),
        'atk' => (string) ($row['atk'] ?? ''),
        'saves' => (string) ($row['saves'] ?? ''),
        'hd' => (string) ($row['hd'] ?? ''),
        'cr' => (string) ($row['cr'] ?? ''),
        'languages' => (string) ($row['languages'] ?? ''),
        'skills_feats' => trim((string) ($row['skills_feats'] ?? '')),
        'feats' => trim((string) ($row['feats'] ?? '')),
        'gear' => trim((string) ($row['gear'] ?? '')),
        'spouse' => (string) ($row['spouse'] ?? 'None'),
        'spouse_label' => (string) ($row['spouse_label'] ?? ''),
        'history' => $hist,
        'reason' => $hist,
    ];
}

/**
 * Merge a stored sheet snapshot with the current intake stub (name/race/class from roster).
 *
 * @param array<string, mixed> $stub
 * @param array<string, mixed> $sheet
 * @return array<string, mixed>
 */
function ew_npc_flavor_merge_stub_with_sheet(array $stub, array $sheet): array
{
    $hist = trim((string) ($sheet['history'] ?? $sheet['reason'] ?? ''));
    $out = array_merge($sheet, [
        'name' => trim($stub['name'] ?? $sheet['name'] ?? 'Unknown'),
        'race' => trim($stub['race'] ?? $sheet['race'] ?? 'Human'),
        'class' => trim($stub['class'] ?? $sheet['class'] ?? 'Commoner 1'),
        'gender' => $stub['gender'] ?? $sheet['gender'] ?? 'M',
        'age' => (int) ($stub['age'] ?? $sheet['age'] ?? 25),
        'alignment' => trim($stub['alignment'] ?? $sheet['alignment'] ?? 'TN'),
        'role' => trim($stub['role'] ?? $sheet['role'] ?? ''),
        'status' => $sheet['status'] ?? 'Alive',
        'history' => $hist,
        'reason' => $hist,
        'skills_feats' => $sheet['skills_feats'] ?? '',
        'feats' => $sheet['feats'] ?? '',
    ]);
    foreach (['str', 'dex', 'con', 'int_', 'int', 'wis', 'cha', 'hp', 'ac', 'init', 'spd', 'saves', 'atk', 'grapple', 'gear', 'languages', 'hd', 'cr', 'spouse', 'spouse_label'] as $k) {
        if (array_key_exists($k, $sheet) && $sheet[$k] !== null && $sheet[$k] !== '') {
            $out[$k] = $sheet[$k];
        }
    }
    if (!empty($sheet['int_']) && empty($out['int_'])) {
        $out['int_'] = $sheet['int_'];
    }

    return $out;
}

/**
 * Same-town + same-name living character: reuse DB sheet for flesh (no AI).
 * Does not reject when the resident's flavor hash is already in the town blocklist
 * (that list includes this row); still dedupes merged full-fingerprint for the batch.
 *
 * @param array<string, bool> $usedFlavorHashes updated after success
 * @param array<string, bool> $usedFullHashes
 * @return array<string, mixed>|null
 */
function ew_intake_exact_town_character_to_flesh(
    int $townId,
    int $uid,
    array $stub,
    array &$usedFlavorHashes,
    array &$usedFullHashes
): ?array {
    if (!empty($stub['is_creature'])) {
        return null;
    }
    $name = trim((string) ($stub['name'] ?? ''));
    if ($name === '') {
        return null;
    }
    try {
        $rows = query(
            'SELECT * FROM characters WHERE town_id = ? AND LOWER(TRIM(name)) = LOWER(TRIM(?)) AND COALESCE(TRIM(status), \'\') <> ? LIMIT 1',
            [$townId, $name, 'Deceased'],
            $uid
        );
    } catch (Throwable $e) {
        return null;
    }
    if (empty($rows)) {
        return null;
    }
    $row = $rows[0];
    $sheet = ew_npc_flavor_character_row_to_sheet($row);
    $hist = trim((string) ($sheet['history'] ?? ''));
    $sk = trim((string) ($sheet['skills_feats'] ?? ''));
    $ft = trim((string) ($sheet['feats'] ?? ''));
    if ($hist === '') {
        return null;
    }
    $merged = ew_npc_flavor_merge_stub_with_sheet($stub, $sheet);
    $fp2 = ew_npc_flavor_fp_full_sheet($merged);
    if (!empty($usedFullHashes[$fp2])) {
        return null;
    }
    $fh = ew_npc_flavor_text_hash($hist, $sk, $ft);
    $usedFlavorHashes[$fh] = true;
    $usedFullHashes[$fp2] = true;

    return array_merge($merged, [
        '_from_town_exact_match' => true,
    ]);
}

/**
 * Try to reuse an existing character row from this user's towns as a sheet donor.
 * Skips rows where (town_id, name) matches the intake target town + stub name so we never
 * treat the same resident row as a template for "themselves".
 *
 * @param array<string, bool> $usedFlavorHashes
 * @param array<int, bool>     $usedCharacterDonorIds donor character ids already used this batch
 * @param array<string, bool>  $usedFullHashes
 * @return array<string, mixed>|null
 */
function ew_npc_flavor_character_db_try_borrow(
    int $userId,
    int $townId,
    int $uid,
    string $dndEdition,
    array $stub,
    array &$usedFlavorHashes,
    array &$usedCharacterDonorIds,
    array &$usedFullHashes
): ?array {
    if (!empty($stub['is_creature'])) {
        return null;
    }
    $stubNameNorm = strtolower(trim((string) ($stub['name'] ?? '')));
    if ($stubNameNorm === '') {
        return null;
    }
    $profile = ew_npc_flavor_stub_profile($stub);
    $ph = ew_npc_flavor_profile_hash($dndEdition, $profile);
    $dndNorm = strtolower(trim($dndEdition));

    try {
        $candidates = query(
            'SELECT c.*, COALESCE(camp.dnd_edition, \'3.5e\') AS _campaign_dnd_edition
             FROM characters c
             INNER JOIN towns t ON t.id = c.town_id
             LEFT JOIN campaigns camp ON camp.id = t.campaign_id
             WHERE t.user_id = ?
               AND COALESCE(TRIM(c.status), \'\') <> ?
               AND NOT (c.town_id = ? AND LOWER(TRIM(c.name)) = ?)
               AND CHAR_LENGTH(TRIM(COALESCE(c.history, \'\'))) >= 12
             ORDER BY RAND() LIMIT 48',
            [$userId, 'Deceased', $townId, $stubNameNorm],
            $uid
        );
    } catch (Throwable $e) {
        return null;
    }
    if (empty($candidates)) {
        return null;
    }

    foreach ($candidates as $row) {
        $cid = (int) ($row['id'] ?? 0);
        if ($cid <= 0 || !empty($usedCharacterDonorIds[$cid])) {
            continue;
        }
        $rowEdition = strtolower(trim((string) ($row['_campaign_dnd_edition'] ?? '3.5e')));
        if ($rowEdition !== $dndNorm) {
            continue;
        }
        $cls = trim((string) ($row['class'] ?? 'Commoner'));
        $lv = (int) ($row['level'] ?? 1);
        if ($lv > 0 && $cls !== '' && !preg_match('/\d+\s*$/', $cls)) {
            $cls = trim($cls . ' ' . $lv);
        }
        if ($cls === '') {
            $cls = 'Commoner 1';
        }
        $donorStubLike = [
            'race' => $row['race'] ?? 'Human',
            'class' => $cls,
            'gender' => $row['gender'] ?? 'M',
            'role' => $row['role'] ?? '',
            'alignment' => $row['alignment'] ?? 'TN',
            'is_creature' => false,
        ];
        if (ew_npc_flavor_profile_hash($dndEdition, ew_npc_flavor_stub_profile($donorStubLike)) !== $ph) {
            continue;
        }

        $sheet = ew_npc_flavor_character_row_to_sheet($row);
        $hist = trim((string) ($sheet['history'] ?? ''));
        $sk = trim((string) ($sheet['skills_feats'] ?? ''));
        $ft = trim((string) ($sheet['feats'] ?? ''));
        if ($hist === '') {
            continue;
        }
        $fh = ew_npc_flavor_text_hash($hist, $sk, $ft);
        if (!empty($usedFlavorHashes[$fh])) {
            continue;
        }
        $fp = ew_npc_flavor_fp_full_sheet($sheet);
        if (!empty($usedFullHashes[$fp])) {
            continue;
        }
        $merged = ew_npc_flavor_merge_stub_with_sheet($stub, $sheet);
        $fp2 = ew_npc_flavor_fp_full_sheet($merged);
        if (!empty($usedFullHashes[$fp2])) {
            continue;
        }
        $usedCharacterDonorIds[$cid] = true;
        $usedFlavorHashes[$fh] = true;
        $usedFullHashes[$fp2] = true;

        return array_merge($merged, [
            '_from_town_character_db' => true,
            '_source_character_id' => $cid,
        ]);
    }

    return null;
}

/**
 * Same as ew_npc_flavor_character_db_try_borrow but donors are other accounts who opted in
 * (`users.npc_sheet_pool_opt_in`). Still matches edition + profile hash; stub keeps roster name/role.
 *
 * @param array<string, bool> $usedFlavorHashes
 * @param array<int, bool>     $usedCharacterDonorIds
 * @param array<string, bool>  $usedFullHashes
 * @return array<string, mixed>|null
 */
function ew_npc_flavor_community_character_try_borrow(
    int $consumerUserId,
    int $townId,
    int $uid,
    string $dndEdition,
    array $stub,
    array &$usedFlavorHashes,
    array &$usedCharacterDonorIds,
    array &$usedFullHashes
): ?array {
    if (!empty($stub['is_creature'])) {
        return null;
    }
    $stubNameNorm = strtolower(trim((string) ($stub['name'] ?? '')));
    if ($stubNameNorm === '') {
        return null;
    }
    $profile = ew_npc_flavor_stub_profile($stub);
    $ph = ew_npc_flavor_profile_hash($dndEdition, $profile);
    $dndNorm = strtolower(trim($dndEdition));

    try {
        $candidates = query(
            'SELECT c.*, COALESCE(camp.dnd_edition, \'3.5e\') AS _campaign_dnd_edition
             FROM characters c
             INNER JOIN towns t ON t.id = c.town_id
             INNER JOIN users u ON u.id = t.user_id
             LEFT JOIN campaigns camp ON camp.id = t.campaign_id
             WHERE u.npc_sheet_pool_opt_in = 1
               AND t.user_id <> ?
               AND COALESCE(TRIM(c.status), \'\') <> ?
               AND NOT (c.town_id = ? AND LOWER(TRIM(c.name)) = ?)
               AND CHAR_LENGTH(TRIM(COALESCE(c.history, \'\'))) >= 12
             ORDER BY RAND() LIMIT 48',
            [$consumerUserId, 'Deceased', $townId, $stubNameNorm],
            $uid
        );
    } catch (Throwable $e) {
        return null;
    }
    if (empty($candidates)) {
        return null;
    }

    foreach ($candidates as $row) {
        $cid = (int) ($row['id'] ?? 0);
        if ($cid <= 0 || !empty($usedCharacterDonorIds[$cid])) {
            continue;
        }
        $rowEdition = strtolower(trim((string) ($row['_campaign_dnd_edition'] ?? '3.5e')));
        if ($rowEdition !== $dndNorm) {
            continue;
        }
        $cls = trim((string) ($row['class'] ?? 'Commoner'));
        $lv = (int) ($row['level'] ?? 1);
        if ($lv > 0 && $cls !== '' && !preg_match('/\d+\s*$/', $cls)) {
            $cls = trim($cls . ' ' . $lv);
        }
        if ($cls === '') {
            $cls = 'Commoner 1';
        }
        $donorStubLike = [
            'race' => $row['race'] ?? 'Human',
            'class' => $cls,
            'gender' => $row['gender'] ?? 'M',
            'role' => $row['role'] ?? '',
            'alignment' => $row['alignment'] ?? 'TN',
            'is_creature' => false,
        ];
        if (ew_npc_flavor_profile_hash($dndEdition, ew_npc_flavor_stub_profile($donorStubLike)) !== $ph) {
            continue;
        }

        $sheet = ew_npc_flavor_character_row_to_sheet($row);
        $hist = trim((string) ($sheet['history'] ?? ''));
        $sk = trim((string) ($sheet['skills_feats'] ?? ''));
        $ft = trim((string) ($sheet['feats'] ?? ''));
        if ($hist === '') {
            continue;
        }
        $fh = ew_npc_flavor_text_hash($hist, $sk, $ft);
        if (!empty($usedFlavorHashes[$fh])) {
            continue;
        }
        $fp = ew_npc_flavor_fp_full_sheet($sheet);
        if (!empty($usedFullHashes[$fp])) {
            continue;
        }
        $merged = ew_npc_flavor_merge_stub_with_sheet($stub, $sheet);
        $fp2 = ew_npc_flavor_fp_full_sheet($merged);
        if (!empty($usedFullHashes[$fp2])) {
            continue;
        }
        $usedCharacterDonorIds[$cid] = true;
        $usedFlavorHashes[$fh] = true;
        $usedFullHashes[$fp2] = true;

        return array_merge($merged, [
            '_from_community_character_db' => true,
            '_source_character_id' => $cid,
        ]);
    }

    return null;
}

/**
 * Try to borrow a full or partial NPC row for one stub.
 *
 * @param array<string, bool> $usedFlavorHashes  flavor text hashes (town + in-batch)
 * @param array<int, bool> $usedPoolIds
 * @param array<string, bool> $usedFullHashes    full-sheet fingerprints (town + in-batch)
 * @return array<string, mixed>|null
 */
function ew_npc_flavor_pool_try_borrow(
    int $userId,
    int $townId,
    int $uid,
    string $dndEdition,
    array $stub,
    array &$usedFlavorHashes,
    array &$usedPoolIds,
    array &$usedFullHashes
): ?array {
    if (!empty($stub['is_creature'])) {
        return null;
    }
    $profile = ew_npc_flavor_stub_profile($stub);
    $ph = ew_npc_flavor_profile_hash($dndEdition, $profile);

    try {
        $candidates = query(
            'SELECT id, skills_feats, feats, reason, full_sheet_json FROM npc_flavor_pool
             WHERE user_id = ? AND dnd_edition = ? AND profile_hash = ? AND is_creature = 0
             ORDER BY RAND() LIMIT 24',
            [$userId, $dndEdition, $ph],
            $uid
        );
    } catch (Throwable $e) {
        return null;
    }
    if (empty($candidates)) {
        return null;
    }

    foreach ($candidates as $row) {
        $pid = (int) ($row['id'] ?? 0);
        if ($pid <= 0 || !empty($usedPoolIds[$pid])) {
            continue;
        }
        $reason = trim((string) ($row['reason'] ?? ''));
        $sk = trim((string) ($row['skills_feats'] ?? ''));
        $ft = trim((string) ($row['feats'] ?? ''));
        if ($reason === '') {
            continue;
        }
        $fh = ew_npc_flavor_text_hash($reason, $sk, $ft);
        if (!empty($usedFlavorHashes[$fh])) {
            continue;
        }

        $json = trim((string) ($row['full_sheet_json'] ?? ''));
        $sheet = null;
        if ($json !== '') {
            $dec = json_decode($json, true);
            if (is_array($dec) && !empty($dec)) {
                $sheet = $dec;
            }
        }

        if ($sheet !== null) {
            $fp = ew_npc_flavor_fp_full_sheet($sheet);
            if (!empty($usedFullHashes[$fp])) {
                continue;
            }
            $merged = ew_npc_flavor_merge_stub_with_sheet($stub, $sheet);
            $fp2 = ew_npc_flavor_fp_full_sheet($merged);
            if (!empty($usedFullHashes[$fp2])) {
                continue;
            }
            $usedPoolIds[$pid] = true;
            $usedFlavorHashes[$fh] = true;
            $usedFullHashes[$fp2] = true;

            return array_merge($merged, [
                '_from_flavor_pool' => true,
                '_flavor_pool_id' => $pid,
            ]);
        }

        // Legacy row: flavor text only (stats rolled on apply)
        if (!empty($usedFullHashes[ew_npc_flavor_fp_full_sheet([
            'history' => $reason,
            'reason' => $reason,
            'str' => '', 'dex' => '', 'con' => '', 'int_' => '', 'wis' => '', 'cha' => '', 'hp' => '',
            'skills_feats' => $sk,
            'feats' => $ft,
        ])])) {
            continue;
        }

        $usedPoolIds[$pid] = true;
        $usedFlavorHashes[$fh] = true;

        return [
            'name' => trim($stub['name'] ?? 'Unknown'),
            'race' => trim($stub['race'] ?? 'Human'),
            'class' => trim($stub['class'] ?? 'Commoner 1'),
            'gender' => $stub['gender'] ?? 'M',
            'age' => (int) ($stub['age'] ?? 25),
            'status' => 'Alive',
            'alignment' => trim($stub['alignment'] ?? 'TN'),
            'role' => trim($stub['role'] ?? ''),
            'skills_feats' => $sk,
            'feats' => $ft,
            'reason' => $reason,
            '_from_flavor_pool' => true,
            '_flavor_pool_id' => $pid,
        ];
    }

    return null;
}

/**
 * @param array<int, array<string, mixed>> $fleshedRows
 */
function ew_npc_flavor_pool_seed_from_flesh(int $userId, string $dndEdition, array $fleshedRows): void
{
    foreach ($fleshedRows as $row) {
        if (empty($row) || !is_array($row)) {
            continue;
        }
        if (!empty($row['is_creature'])) {
            continue;
        }
        if (!empty($row['_from_flavor_pool']) || !empty($row['_from_town_character_db']) || !empty($row['_from_town_exact_match']) || !empty($row['_from_community_character_db'])) {
            continue;
        }
        $stubLike = [
            'race' => $row['race'] ?? 'Human',
            'class' => $row['class'] ?? 'Commoner 1',
            'gender' => $row['gender'] ?? 'M',
            'role' => $row['role'] ?? '',
            'alignment' => $row['alignment'] ?? 'TN',
            'is_creature' => false,
        ];
        $profile = ew_npc_flavor_stub_profile($stubLike);
        $ph = ew_npc_flavor_profile_hash($dndEdition, $profile);
        $reason = trim((string) ($row['reason'] ?? ''));
        $sk = trim((string) ($row['skills_feats'] ?? ''));
        $ft = trim((string) ($row['feats'] ?? ''));
        if ($reason === '') {
            continue;
        }
        $fh = ew_npc_flavor_text_hash($reason, $sk, $ft);
        try {
            execute(
                'INSERT IGNORE INTO npc_flavor_pool (user_id, dnd_edition, profile_hash, flavor_hash, is_creature, skills_feats, feats, reason, full_sheet_json)
                 VALUES (?,?,?,?,0,?,?,?,NULL)',
                [$userId, $dndEdition, $ph, $fh, $sk, $ft, $reason],
                0
            );
        } catch (Throwable $e) {
        }
    }
}

/**
 * After sim_apply inserts an NPC, upsert flavor pool + append npc_reuse_generated (MySQL archive).
 */
function ew_npc_flavor_pool_absorb_after_sim_apply(
    int $ownerUserId,
    int $townId,
    int $uid,
    string $dndEdition,
    array $nc,
    string $charName,
    string $race,
    string $className,
    int $level,
    int $str,
    int $dex,
    int $con,
    int $int_,
    int $wis,
    int $cha,
    int $hp,
    string $hd,
    string $ac,
    string $init,
    string $spd,
    string $grappleStr,
    string $atk,
    string $saves,
    string $languages,
    string $cr,
    string $historyText
): void {
    if ($className === '') {
        return;
    }
    $reason = trim((string) ($nc['reason'] ?? ''));
    $sk = trim((string) ($nc['skills_feats'] ?? ''));
    $ft = trim((string) ($nc['feats'] ?? ''));
    if ($reason === '' && $historyText === '') {
        return;
    }
    if ($reason === '') {
        $reason = $historyText;
    }
    // Skip bare simulation snippets (intake-flesh style rows have real skills/feats or long backstory)
    if (strlen($reason) < 25 && strlen($sk) < 4 && strlen($ft) < 2) {
        return;
    }
    $fh = ew_npc_flavor_text_hash($reason, $sk, $ft);

    $gearRaw = $nc['gear'] ?? '';
    $gear = is_array($gearRaw) ? implode(', ', $gearRaw) : (string) $gearRaw;

    $snap = [
        'name' => $charName,
        'race' => $race,
        'class' => $className . ' ' . $level,
        'level' => $level,
        'gender' => (string) ($nc['gender'] ?? ''),
        'age' => (int) ($nc['age'] ?? 0),
        'status' => (string) ($nc['status'] ?? 'Alive'),
        'alignment' => (string) ($nc['alignment'] ?? ''),
        'role' => is_array($nc['role'] ?? null) ? implode(', ', $nc['role']) : (string) ($nc['role'] ?? ''),
        'str' => $str,
        'dex' => $dex,
        'con' => $con,
        'int_' => $int_,
        'wis' => $wis,
        'cha' => $cha,
        'hp' => (string) $hp,
        'hd' => $hd,
        'ac' => $ac,
        'init' => $init,
        'spd' => $spd,
        'grapple' => $grappleStr,
        'atk' => $atk,
        'saves' => $saves,
        'languages' => $languages,
        'cr' => $cr,
        'skills_feats' => $sk,
        'feats' => $ft,
        'gear' => $gear,
        'history' => $historyText,
        'reason' => $reason,
    ];

    $json = json_encode($snap, JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        return;
    }

    $stubLike = [
        'race' => $race,
        'class' => trim((string) ($nc['class'] ?? ($className . ' ' . $level))),
        'gender' => $nc['gender'] ?? 'M',
        'role' => is_array($nc['role'] ?? null) ? implode(', ', $nc['role']) : trim((string) ($nc['role'] ?? '')),
        'alignment' => trim((string) ($nc['alignment'] ?? 'TN')),
        'is_creature' => false,
    ];
    $ph = ew_npc_flavor_profile_hash($dndEdition, ew_npc_flavor_stub_profile($stubLike));

    try {
        execute(
            'INSERT INTO npc_flavor_pool (user_id, dnd_edition, profile_hash, flavor_hash, is_creature, skills_feats, feats, reason, full_sheet_json)
             VALUES (?,?,?,?,0,?,?,?,?)
             ON DUPLICATE KEY UPDATE profile_hash = VALUES(profile_hash), full_sheet_json = VALUES(full_sheet_json), skills_feats = VALUES(skills_feats), feats = VALUES(feats), reason = VALUES(reason)',
            [$ownerUserId, $dndEdition, $ph, $fh, $sk, $ft, $reason, $json],
            0
        );
    } catch (Throwable $e) {
    }

    try {
        $idRows = query(
            'SELECT id FROM characters WHERE town_id = ? AND name = ? ORDER BY id DESC LIMIT 1',
            [$townId, $charName],
            $uid
        );
        $cid = !empty($idRows) ? (int) ($idRows[0]['id'] ?? 0) : 0;
        if ($cid > 0) {
            execute(
                'INSERT INTO npc_reuse_generated (user_id, town_id, character_id, dnd_edition, profile_hash, flavor_hash, full_sheet_json)
                 VALUES (?,?,?,?,?,?,?)',
                [$ownerUserId, $townId, $cid, $dndEdition, $ph, $fh, $json],
                0
            );
        }
    } catch (Throwable $e) {
        // Table may not exist until setup_mysql is run once.
    }
}
