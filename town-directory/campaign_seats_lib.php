<?php
/**
 * Campaign seats — other accounts at a table.
 *
 * The campaign row stays owned by the DM (campaigns.user_id). A seat lets
 * another signed-in user join as a player or co-DM and read the player-facing
 * snapshot. Co-DM can invite players. World edits stay on the owner's account.
 */

function ew_ensure_campaign_seats(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    execute(
        'CREATE TABLE IF NOT EXISTS campaign_seats (
            id INT AUTO_INCREMENT PRIMARY KEY,
            campaign_id INT NOT NULL,
            user_id INT NULL,
            role VARCHAR(20) NOT NULL DEFAULT \'player\',
            status VARCHAR(20) NOT NULL DEFAULT \'invited\',
            invite_email VARCHAR(255) NULL,
            invite_token_hash CHAR(64) NULL,
            invited_by INT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            accepted_at DATETIME NULL,
            revoked_at DATETIME NULL,
            expires_at DATETIME NULL,
            KEY idx_seat_campaign_status (campaign_id, status),
            KEY idx_seat_user_status (user_id, status),
            KEY idx_seat_token (invite_token_hash),
            KEY idx_seat_email (invite_email, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        [],
        0
    );
    $done = true;
}

function ew_seat_role_label(string $role): string
{
    if ($role === 'co_dm') {
        return 'Co-DM';
    }
    if ($role === 'dm') {
        return 'DM';
    }
    return 'Player';
}

function ew_mask_email(string $email): string
{
    $email = strtolower(trim($email));
    $at = strrpos($email, '@');
    if ($at === false || $at < 1) {
        return '';
    }
    return substr($email, 0, 1) . '***@' . substr($email, $at + 1);
}

function ew_campaign_row(int $campaignId): ?array
{
    $rows = query(
        'SELECT c.id, c.user_id, c.name, c.dnd_edition, c.description, u.username AS dm_username, u.email AS dm_email
         FROM campaigns c
         JOIN users u ON u.id = c.user_id
         WHERE c.id = ?
         LIMIT 1',
        [$campaignId],
        0
    );
    return $rows[0] ?? null;
}

/**
 * dm (owner), co_dm, player, or null.
 */
function ew_caller_seat_role(int $userId, int $campaignId): ?string
{
    $camp = ew_campaign_row($campaignId);
    if (!$camp) {
        return null;
    }
    if ((int) $camp['user_id'] === $userId) {
        return 'dm';
    }
    $seat = query(
        'SELECT role FROM campaign_seats WHERE campaign_id = ? AND user_id = ? AND status = \'active\' LIMIT 1',
        [$campaignId, $userId],
        0
    );
    $role = (string) ($seat[0]['role'] ?? '');
    return ($role === 'player' || $role === 'co_dm') ? $role : null;
}

function ew_require_campaign_manager(int $userId, int $campaignId): array
{
    $camp = ew_campaign_row($campaignId);
    if (!$camp) {
        throw new Exception('Campaign not found.');
    }
    $role = ew_caller_seat_role($userId, $campaignId);
    if ($role !== 'dm' && $role !== 'co_dm') {
        throw new Exception('Only the DM or a co-DM can manage seats.');
    }
    return ['campaign' => $camp, 'role' => $role];
}

function ew_resolve_managed_campaign_id(int $userId, int $requestedId): int
{
    if ($requestedId > 0) {
        return $requestedId;
    }
    $owned = query(
        'SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1',
        [$userId],
        0
    );
    if (!$owned) {
        throw new Exception('Choose a campaign first.');
    }
    return (int) $owned[0]['id'];
}

function ew_joined_tables_for_user(int $userId): array
{
    ew_ensure_campaign_seats();
    $rows = query(
        'SELECT s.id AS seat_id, s.campaign_id, s.role, c.name, c.dnd_edition, c.description, u.username AS dm_username
         FROM campaign_seats s
         JOIN campaigns c ON c.id = s.campaign_id
         JOIN users u ON u.id = c.user_id
         WHERE s.user_id = ? AND s.status = \'active\' AND c.user_id <> ?
         ORDER BY c.name',
        [$userId, $userId],
        0
    );
    $out = [];
    foreach ($rows as $row) {
        $out[] = [
            'seat_id' => (int) $row['seat_id'],
            'campaign_id' => (int) $row['campaign_id'],
            'role' => $row['role'],
            'name' => $row['name'],
            'dnd_edition' => $row['dnd_edition'],
            'description' => $row['description'],
            'dm_username' => $row['dm_username'],
        ];
    }
    return $out;
}

function ew_pending_invites_for_user(int $userId, string $email): array
{
    ew_ensure_campaign_seats();
    $email = strtolower(trim($email));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return [];
    }
    $rows = query(
        'SELECT s.id AS seat_id, s.campaign_id, s.role, s.expires_at, c.name, c.dnd_edition, u.username AS dm_username
         FROM campaign_seats s
         JOIN campaigns c ON c.id = s.campaign_id
         JOIN users u ON u.id = c.user_id
         WHERE s.status = \'invited\' AND s.invite_email = ? AND c.user_id <> ?
           AND (s.expires_at IS NULL OR s.expires_at > NOW())
         ORDER BY s.created_at DESC',
        [$email, $userId],
        0
    );
    $out = [];
    foreach ($rows as $row) {
        $out[] = [
            'seat_id' => (int) $row['seat_id'],
            'campaign_id' => (int) $row['campaign_id'],
            'role' => $row['role'],
            'name' => $row['name'],
            'dnd_edition' => $row['dnd_edition'],
            'dm_username' => $row['dm_username'],
            'expires_at' => $row['expires_at'],
        ];
    }
    return $out;
}

function ew_campaign_seat_list(int $userId, int $campaignId): array
{
    ew_ensure_campaign_seats();
    $access = ew_require_campaign_manager($userId, $campaignId);
    $rows = query(
        'SELECT s.id, s.user_id, s.role, s.status, s.invite_email, s.created_at, s.accepted_at, s.expires_at,
                u.username AS member_username
         FROM campaign_seats s
         LEFT JOIN users u ON u.id = s.user_id
         WHERE s.campaign_id = ? AND s.status <> \'revoked\'
         ORDER BY s.created_at DESC',
        [$campaignId],
        0
    );
    $seats = [];
    foreach ($rows as $row) {
        $seats[] = [
            'id' => (int) $row['id'],
            'user_id' => $row['user_id'] !== null ? (int) $row['user_id'] : null,
            'role' => $row['role'],
            'status' => $row['status'],
            'invite_email' => $row['invite_email'],
            'username' => $row['member_username'],
            'created_at' => $row['created_at'],
            'accepted_at' => $row['accepted_at'],
            'expires_at' => $row['expires_at'],
        ];
    }
    return [
        'campaign_id' => $campaignId,
        'campaign_name' => $access['campaign']['name'],
        'caller_role' => $access['role'],
        'seats' => $seats,
    ];
}

function ew_campaign_seat_invite(int $userId, int $campaignId, string $role, string $email): array
{
    ew_ensure_campaign_seats();
    $access = ew_require_campaign_manager($userId, $campaignId);
    if ($role !== 'player' && $role !== 'co_dm') {
        throw new Exception('Role must be player or co-DM.');
    }
    if ($role === 'co_dm' && $access['role'] !== 'dm') {
        throw new Exception('Only the campaign owner can invite a co-DM.');
    }
    $email = strtolower(trim($email));
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('That email address is not valid.');
    }
    if ($email !== '' && strtolower((string) $access['campaign']['dm_email']) === $email) {
        throw new Exception('That email belongs to the campaign owner.');
    }

    $open = query(
        'SELECT COUNT(*) AS c FROM campaign_seats WHERE campaign_id = ? AND status <> \'revoked\'',
        [$campaignId],
        0
    );
    if ((int) ($open[0]['c'] ?? 0) >= 40) {
        throw new Exception('This campaign already has 40 open seats. Revoke one before inviting again.');
    }

    if ($email !== '') {
        $existing = query(
            'SELECT id, status FROM campaign_seats
             WHERE campaign_id = ? AND invite_email = ? AND status IN (\'invited\', \'active\')
             LIMIT 1',
            [$campaignId, $email],
            0
        );
        if ($existing && ($existing[0]['status'] ?? '') === 'active') {
            throw new Exception('That person already has a seat at this table.');
        }
        if ($existing && ($existing[0]['status'] ?? '') === 'invited') {
            execute(
                'UPDATE campaign_seats SET status = \'revoked\', invite_token_hash = NULL, revoked_at = NOW() WHERE id = ?',
                [(int) $existing[0]['id']],
                0
            );
        }
    }

    $rawToken = bin2hex(random_bytes(24));
    $hash = hash('sha256', $rawToken);
    $seatId = insertAndGetId(
        'INSERT INTO campaign_seats (campaign_id, user_id, role, status, invite_email, invite_token_hash, invited_by, expires_at)
         VALUES (?, NULL, ?, \'invited\', ?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))',
        [$campaignId, $role, $email !== '' ? $email : null, $hash, $userId],
        0
    );

    $mailSent = false;
    $mailNote = '';
    if ($email !== '') {
        $sent = ew_send_seat_invite_mail($email, $access['campaign'], $role, $rawToken);
        $mailSent = $sent['sent'];
        $mailNote = $sent['note'];
    }

    return [
        'seat_id' => $seatId,
        'token' => $rawToken,
        'join_path' => 'join/' . $rawToken,
        'role' => $role,
        'email' => $email,
        'mail_sent' => $mailSent,
        'mail_note' => $mailNote,
        'expires_in_days' => 30,
    ];
}

function ew_send_seat_invite_mail(string $email, array $campaign, string $role, string $rawToken): array
{
    require_once __DIR__ . '/smtp_mail.php';
    require_once __DIR__ . '/app_public_lib.php';
    if (!ew_mail_configured()) {
        return ['sent' => false, 'note' => 'Email is not configured on this server. Copy the link instead.'];
    }
    $base = ew_app_public_base_url();
    $link = $base . '/join/' . $rawToken;
    $site = defined('APP_PUBLIC_TITLE') ? APP_PUBLIC_TITLE : (defined('APP_NAME') ? APP_NAME : 'Eon Weaver');
    $name = htmlspecialchars((string) ($campaign['name'] ?? 'a campaign'), ENT_QUOTES, 'UTF-8');
    $dm = htmlspecialchars((string) ($campaign['dm_username'] ?? 'The DM'), ENT_QUOTES, 'UTF-8');
    $roleLabel = htmlspecialchars(ew_seat_role_label($role), ENT_QUOTES, 'UTF-8');
    $safeLink = htmlspecialchars($link, ENT_QUOTES, 'UTF-8');
    $html = '<p>' . $dm . ' invited you to <strong>' . $name . '</strong> on ' . htmlspecialchars($site, ENT_QUOTES, 'UTF-8') . ' as <strong>' . $roleLabel . '</strong>.</p>'
        . '<p><a href="' . $safeLink . '">Open your seat</a></p>'
        . '<p>Sign in with your own account, or create one, then accept the invite. This link expires in 30 days.</p>';
    $text = $campaign['dm_username'] . ' invited you to ' . ($campaign['name'] ?? 'a campaign') . " as " . ew_seat_role_label($role) . ".\n{$link}\n";
    $ok = ew_send_html_mail($email, $site . ' — table invite', $html, $text);
    if (!$ok) {
        return ['sent' => false, 'note' => 'The invite email could not be sent. Copy the link instead.'];
    }
    return ['sent' => true, 'note' => 'Invite email sent.'];
}

function ew_campaign_seat_revoke(int $userId, int $campaignId, int $seatId): void
{
    ew_ensure_campaign_seats();
    $access = ew_require_campaign_manager($userId, $campaignId);
    $rows = query(
        'SELECT id, user_id, role, status FROM campaign_seats WHERE id = ? AND campaign_id = ? LIMIT 1',
        [$seatId, $campaignId],
        0
    );
    if (!$rows || ($rows[0]['status'] ?? '') === 'revoked') {
        throw new Exception('Seat not found.');
    }
    $seat = $rows[0];
    $isSelf = (int) ($seat['user_id'] ?? 0) === $userId && $userId > 0;
    if (!$isSelf && $access['role'] !== 'dm' && ($seat['role'] ?? '') === 'co_dm') {
        throw new Exception('Only the campaign owner can remove a co-DM.');
    }
    execute(
        'UPDATE campaign_seats
         SET status = \'revoked\', invite_token_hash = NULL, revoked_at = NOW()
         WHERE id = ? AND campaign_id = ?',
        [$seatId, $campaignId],
        0
    );
}

function ew_campaign_seat_set_role(int $userId, int $campaignId, int $seatId, string $role): void
{
    ew_ensure_campaign_seats();
    $access = ew_require_campaign_manager($userId, $campaignId);
    if ($access['role'] !== 'dm') {
        throw new Exception('Only the campaign owner can change roles.');
    }
    if ($role !== 'player' && $role !== 'co_dm') {
        throw new Exception('Role must be player or co-DM.');
    }
    $rows = query(
        'SELECT id FROM campaign_seats WHERE id = ? AND campaign_id = ? AND status <> \'revoked\' LIMIT 1',
        [$seatId, $campaignId],
        0
    );
    if (!$rows) {
        throw new Exception('Seat not found.');
    }
    execute(
        'UPDATE campaign_seats SET role = ? WHERE id = ? AND campaign_id = ?',
        [$role, $seatId, $campaignId],
        0
    );
}

function ew_invite_preview(string $token, ?array $user): array
{
    ew_ensure_campaign_seats();
    $seat = ew_invite_seat_by_token($token);
    $camp = ew_campaign_row((int) $seat['campaign_id']);
    if (!$camp) {
        throw new Exception('This invite no longer points at a campaign.');
    }
    $emailRequired = trim((string) ($seat['invite_email'] ?? '')) !== '';
    $already = false;
    $isOwner = false;
    $canAccept = false;
    $block = null;
    if (!$user) {
        $block = 'Sign in to take this seat.';
    } else {
        $uid = (int) $user['id'];
        $isOwner = $uid === (int) $camp['user_id'];
        $existing = query(
            'SELECT id FROM campaign_seats WHERE campaign_id = ? AND user_id = ? AND status = \'active\' LIMIT 1',
            [(int) $seat['campaign_id'], $uid],
            0
        );
        $already = (bool) $existing;
        if ($isOwner) {
            $block = 'You already run this campaign.';
        } elseif ($already) {
            $block = 'You already have a seat at this table.';
        } elseif ($emailRequired && strtolower((string) $user['email']) !== strtolower((string) $seat['invite_email'])) {
            $block = 'This invite was sent to ' . ew_mask_email((string) $seat['invite_email']) . '. Sign in with that account.';
        } else {
            $canAccept = true;
        }
    }
    return [
        'campaign_id' => (int) $camp['id'],
        'campaign_name' => $camp['name'],
        'dnd_edition' => $camp['dnd_edition'],
        'description' => $camp['description'],
        'dm_username' => $camp['dm_username'],
        'role' => $seat['role'],
        'expires_at' => $seat['expires_at'],
        'email_required' => $emailRequired,
        'email_hint' => $emailRequired ? ew_mask_email((string) $seat['invite_email']) : '',
        'already_member' => $already,
        'is_owner' => $isOwner,
        'can_accept' => $canAccept,
        'block_reason' => $block,
    ];
}

function ew_invite_seat_by_token(string $token): array
{
    $token = strtolower(trim($token));
    if (!preg_match('/^[a-f0-9]{32,128}$/', $token)) {
        throw new Exception('That invite link is not valid.');
    }
    $rows = query(
        'SELECT * FROM campaign_seats WHERE invite_token_hash = ? LIMIT 1',
        [hash('sha256', $token)],
        0
    );
    if (!$rows) {
        throw new Exception('That invite link is not valid.');
    }
    $seat = $rows[0];
    if (($seat['status'] ?? '') !== 'invited') {
        throw new Exception('That invite is no longer open.');
    }
    if (!empty($seat['expires_at']) && strtotime((string) $seat['expires_at']) < time()) {
        throw new Exception('That invite has expired. Ask the DM for a new link.');
    }
    return $seat;
}

function ew_accept_campaign_invite(int $userId, string $email, string $token = '', int $seatId = 0): array
{
    ew_ensure_campaign_seats();
    $email = strtolower(trim($email));
    if ($token !== '') {
        $seat = ew_invite_seat_by_token($token);
    } elseif ($seatId > 0) {
        $rows = query(
            'SELECT * FROM campaign_seats WHERE id = ? AND status = \'invited\' LIMIT 1',
            [$seatId],
            0
        );
        if (!$rows) {
            throw new Exception('That invite is no longer open.');
        }
        $seat = $rows[0];
        if (strtolower((string) ($seat['invite_email'] ?? '')) === '' || strtolower((string) $seat['invite_email']) !== $email) {
            throw new Exception('That invite belongs to a different account.');
        }
        if (!empty($seat['expires_at']) && strtotime((string) $seat['expires_at']) < time()) {
            throw new Exception('That invite has expired. Ask the DM for a new link.');
        }
    } else {
        throw new Exception('Missing invite.');
    }

    $camp = ew_campaign_row((int) $seat['campaign_id']);
    if (!$camp) {
        throw new Exception('This invite no longer points at a campaign.');
    }
    if ((int) $camp['user_id'] === $userId) {
        throw new Exception('You already run this campaign.');
    }
    $locked = strtolower(trim((string) ($seat['invite_email'] ?? '')));
    if ($locked !== '' && $locked !== $email) {
        throw new Exception('This invite was sent to a different email address.');
    }

    $already = query(
        'SELECT id, role FROM campaign_seats WHERE campaign_id = ? AND user_id = ? AND status = \'active\' LIMIT 1',
        [(int) $seat['campaign_id'], $userId],
        0
    );
    if ($already) {
        execute(
            'UPDATE campaign_seats SET status = \'revoked\', invite_token_hash = NULL, revoked_at = NOW()
             WHERE id = ? AND status = \'invited\'',
            [(int) $seat['id']],
            0
        );
        return [
            'already_member' => true,
            'campaign_id' => (int) $camp['id'],
            'campaign_name' => $camp['name'],
            'role' => $already[0]['role'],
        ];
    }

    $n = execute(
        'UPDATE campaign_seats
         SET user_id = ?, status = \'active\', accepted_at = NOW(), invite_token_hash = NULL
         WHERE id = ? AND status = \'invited\'',
        [$userId, (int) $seat['id']],
        0
    );
    if ($n < 1) {
        throw new Exception('That invite is no longer open.');
    }
    return [
        'already_member' => false,
        'campaign_id' => (int) $camp['id'],
        'campaign_name' => $camp['name'],
        'role' => $seat['role'],
    ];
}

function ew_leave_campaign_seat(int $userId, int $campaignId): void
{
    ew_ensure_campaign_seats();
    $n = execute(
        'UPDATE campaign_seats
         SET status = \'revoked\', invite_token_hash = NULL, revoked_at = NOW()
         WHERE campaign_id = ? AND user_id = ? AND status = \'active\'',
        [$campaignId, $userId],
        0
    );
    if ($n < 1) {
        throw new Exception('You do not have a seat at that table.');
    }
}

function ew_campaign_read_snapshot(int $ownerId, int $campaignId): array
{
    $towns = query(
        'SELECT id, name, subtitle FROM towns WHERE user_id = ? AND campaign_id = ? ORDER BY name',
        [$ownerId, $campaignId],
        0
    );
    $townIds = array_map(fn($t) => (int) $t['id'], $towns);
    $characters = [];
    $history = [];
    if (!empty($townIds)) {
        $in = implode(',', array_fill(0, count($townIds), '?'));
        $characters = query(
            "SELECT id, town_id, name, race, class, level, status, title
             FROM characters
             WHERE town_id IN ($in) AND (status IS NULL OR status <> 'deceased')
             ORDER BY town_id, name",
            $townIds,
            0
        );
        $history = query(
            "SELECT id, town_id, heading, content, sort_order
             FROM history
             WHERE town_id IN ($in)
             ORDER BY sort_order DESC
             LIMIT 40",
            $townIds,
            0
        );
    }
    $lore = [];
    try {
        require_once __DIR__ . '/lore_lib.php';
        $lore = lorePlayerVisibleArticles($ownerId, $campaignId);
    } catch (Exception $e) {
        $lore = [];
    }
    return [
        'towns' => $towns,
        'characters' => $characters,
        'history' => $history,
        'lore' => $lore,
    ];
}

function ew_table_roster(int $campaignId, array $campaign): array
{
    $roster = [[
        'username' => $campaign['dm_username'],
        'role' => 'dm',
    ]];
    $rows = query(
        'SELECT s.role, u.username
         FROM campaign_seats s
         JOIN users u ON u.id = s.user_id
         WHERE s.campaign_id = ? AND s.status = \'active\'
         ORDER BY u.username',
        [$campaignId],
        0
    );
    foreach ($rows as $row) {
        $roster[] = [
            'username' => $row['username'],
            'role' => $row['role'],
        ];
    }
    return $roster;
}

function ew_player_seat_snapshot(int $userId, int $campaignId): array
{
    ew_ensure_campaign_seats();
    $camp = ew_campaign_row($campaignId);
    if (!$camp) {
        throw new Exception('Campaign not found.');
    }
    $role = ew_caller_seat_role($userId, $campaignId);
    if ($role !== 'player' && $role !== 'co_dm') {
        throw new Exception('You do not have a seat at that table.');
    }
    $snap = ew_campaign_read_snapshot((int) $camp['user_id'], $campaignId);
    return [
        'campaign_id' => $campaignId,
        'campaign_name' => $camp['name'],
        'dnd_edition' => $camp['dnd_edition'],
        'description' => $camp['description'],
        'dm_username' => $camp['dm_username'],
        'role' => $role,
        'read_only' => true,
        'roster' => ew_table_roster($campaignId, $camp),
        'towns' => $snap['towns'],
        'characters' => $snap['characters'],
        'history' => $snap['history'],
        'lore' => $snap['lore'],
    ];
}
