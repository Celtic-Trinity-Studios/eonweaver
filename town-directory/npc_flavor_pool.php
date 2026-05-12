<?php
/**
 * Per-user reusable NPC flavor rows (skills_feats, feats, reason) keyed by stub profile.
 * Seeded from town setup intake; reused on standard intake_flesh to reduce LLM calls.
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

/**
 * @return array<string, bool>
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
        // table missing / connection
    }

    return $out;
}

/**
 * Try to borrow flavor text for one stub. Returns merged character keys or null.
 *
 * @param array<string, bool> $usedFlavorHashes
 * @param array<int, bool> $usedPoolIds
 * @return array<string, mixed>|null
 */
function ew_npc_flavor_pool_try_borrow(
    int $userId,
    int $townId,
    int $uid,
    string $dndEdition,
    array $stub,
    array &$usedFlavorHashes,
    array &$usedPoolIds
): ?array {
    if (!empty($stub['is_creature'])) {
        return null;
    }
    $profile = ew_npc_flavor_stub_profile($stub);
    $ph = ew_npc_flavor_profile_hash($dndEdition, $profile);

    try {
        $candidates = query(
            'SELECT id, skills_feats, feats, reason FROM npc_flavor_pool
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
        if (!empty($row['_from_flavor_pool'])) {
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
                'INSERT IGNORE INTO npc_flavor_pool (user_id, dnd_edition, profile_hash, flavor_hash, is_creature, skills_feats, feats, reason)
                 VALUES (?,?,?,?,0,?,?,?)',
                [$userId, $dndEdition, $ph, $fh, $sk, $ft, $reason],
                0
            );
        } catch (Throwable $e) {
            // missing table or duplicate
        }
    }
}
