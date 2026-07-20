<?php
/**
 * Campaign lore codex helpers — wiki pages, [[wikilinks]], auto-links, AI ingest.
 * Used by api.php (wiki_*) and scribe_actions.php.
 */

function loreEnsureSchema(): void
{
    ensureMacroFrameworkTables();

    $alters = [
        'ALTER TABLE wiki_articles ADD COLUMN category VARCHAR(32) NOT NULL DEFAULT \'other\'',
        'ALTER TABLE wiki_articles ADD COLUMN player_visible TINYINT(1) NOT NULL DEFAULT 0',
        'ALTER TABLE wiki_articles ADD COLUMN is_locked TINYINT(1) NOT NULL DEFAULT 0',
        'ALTER TABLE wiki_articles ADD COLUMN aliases_json TEXT DEFAULT NULL',
        'ALTER TABLE wiki_articles ADD COLUMN entity_type VARCHAR(32) DEFAULT NULL',
        'ALTER TABLE wiki_articles ADD COLUMN entity_id INT DEFAULT NULL',
        'ALTER TABLE wiki_articles ADD COLUMN dm_notes MEDIUMTEXT DEFAULT NULL',
        'ALTER TABLE wiki_articles ADD COLUMN source_generator VARCHAR(32) DEFAULT NULL',
        'ALTER TABLE wiki_articles ADD COLUMN source_ref VARCHAR(64) DEFAULT NULL',
    ];
    foreach ($alters as $sql) {
        try {
            execute($sql, [], 0);
        } catch (Exception $e) {
            // column may already exist
        }
    }

    try {
        execute(
            'CREATE TABLE IF NOT EXISTS wiki_pending_ingest (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                campaign_id INT NOT NULL,
                article_id INT DEFAULT NULL,
                proposed_title VARCHAR(180) NOT NULL,
                proposed_slug VARCHAR(180) NOT NULL,
                proposed_body MEDIUMTEXT NOT NULL,
                proposed_category VARCHAR(32) NOT NULL DEFAULT \'other\',
                source_generator VARCHAR(32) DEFAULT NULL,
                source_ref VARCHAR(64) DEFAULT NULL,
                status VARCHAR(20) NOT NULL DEFAULT \'pending\',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP NULL DEFAULT NULL,
                KEY idx_wiki_pending_user_camp (user_id, campaign_id, status)
            )',
            [],
            0
        );
    } catch (Exception $e) {
        // noop
    }
}

function loreSlugify(string $title): string
{
    $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $title) ?? '');
    $slug = trim($slug, '-');
    if ($slug === '') {
        $slug = 'lore-' . substr(md5($title . microtime(true)), 0, 8);
    }
    return mb_substr($slug, 0, 180);
}

function loreNormalizeCategory(?string $cat): string
{
    $allowed = ['place', 'npc', 'faction', 'item', 'plot', 'deity', 'other'];
    $c = strtolower(trim((string) $cat));
    return in_array($c, $allowed, true) ? $c : 'other';
}

function loreDecodeTags($raw): array
{
    if (is_array($raw)) {
        return array_values(array_filter(array_map('strval', $raw)));
    }
    if (!is_string($raw) || $raw === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? array_values(array_filter(array_map('strval', $decoded))) : [];
}

function loreDecodeAliases($raw): array
{
    return loreDecodeTags($raw);
}

function loreFormatArticleRow(?array $row): ?array
{
    if (!$row) {
        return null;
    }
    $row['tags'] = loreDecodeTags($row['tags_json'] ?? '[]');
    $row['aliases'] = loreDecodeAliases($row['aliases_json'] ?? '[]');
    $row['is_auto_generated'] = (int) ($row['is_auto_generated'] ?? 0);
    $row['player_visible'] = (int) ($row['player_visible'] ?? 0);
    $row['is_locked'] = (int) ($row['is_locked'] ?? 0);
    $row['category'] = loreNormalizeCategory($row['category'] ?? 'other');
    unset($row['tags_json'], $row['aliases_json']);
    return $row;
}

/**
 * Parse [[Title]] and [[Title|label]] from markdown body.
 * @return list<array{title:string,label:string}>
 */
function loreParseWikilinks(string $body): array
{
    $out = [];
    if (!preg_match_all('/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/u', $body, $m, PREG_SET_ORDER)) {
        return $out;
    }
    foreach ($m as $match) {
        $title = trim($match[1]);
        if ($title === '') {
            continue;
        }
        $out[] = [
            'title' => $title,
            'label' => trim($match[2] ?? $title),
        ];
    }
    return $out;
}

/**
 * Extract a primary title from markdown (# Header) or first line.
 */
function loreExtractTitleFromBody(string $body, string $fallback = 'Untitled lore'): string
{
    if (preg_match('/^#\s+(.+)$/m', $body, $m)) {
        $t = trim(preg_replace('/\*\*(.+?)\*\*/', '$1', $m[1]) ?? $m[1]);
        return mb_substr($t, 0, 180);
    }
    $line = trim((string) strtok(str_replace("\r\n", "\n", $body), "\n"));
    if ($line !== '') {
        return mb_substr(preg_replace('/^#+\s*/', '', $line) ?? $line, 0, 180);
    }
    return $fallback;
}

/**
 * Guess category from scribe generator type / content hints.
 */
function loreCategoryFromGenerator(string $generatorType, string $title = ''): string
{
    $map = [
        'lore' => 'other',
        'quest' => 'plot',
        'dungeon' => 'place',
        'item' => 'item',
        'trap' => 'item',
    ];
    $g = strtolower($generatorType);
    if (isset($map[$g])) {
        return $map[$g];
    }
    $t = strtolower($title);
    if (preg_match('/\b(temple|church|god|goddess|deity|pantheon)\b/', $t)) {
        return 'deity';
    }
    if (preg_match('/\b(guild|order|cult|faction|clan|house)\b/', $t)) {
        return 'faction';
    }
    return 'other';
}

function loreFindArticleByTitleOrSlug(int $userId, int $campaignId, string $titleOrSlug): ?array
{
    $needle = trim($titleOrSlug);
    if ($needle === '') {
        return null;
    }
    $slug = loreSlugify($needle);
    $rows = query(
        'SELECT * FROM wiki_articles WHERE user_id = ? AND campaign_id = ? AND (slug = ? OR title = ?) LIMIT 1',
        [$userId, $campaignId, $slug, $needle],
        0
    );
    if ($rows) {
        return $rows[0];
    }
    // Alias match (JSON_SEARCH not portable on all MySQL — scan lightly)
    $all = query(
        'SELECT * FROM wiki_articles WHERE user_id = ? AND campaign_id = ? AND aliases_json IS NOT NULL AND aliases_json <> \'\' AND aliases_json <> \'[]\'',
        [$userId, $campaignId],
        0
    ) ?: [];
    $lower = mb_strtolower($needle);
    foreach ($all as $row) {
        foreach (loreDecodeAliases($row['aliases_json'] ?? '') as $alias) {
            if (mb_strtolower(trim($alias)) === $lower) {
                return $row;
            }
        }
    }
    return null;
}

function loreFindArticleByEntity(int $userId, int $campaignId, string $entityType, int $entityId): ?array
{
    if ($entityId <= 0 || $entityType === '') {
        return null;
    }
    $rows = query(
        'SELECT * FROM wiki_articles WHERE user_id = ? AND campaign_id = ? AND entity_type = ? AND entity_id = ? LIMIT 1',
        [$userId, $campaignId, $entityType, $entityId],
        0
    );
    return $rows[0] ?? null;
}

/**
 * Upsert article. Returns formatted row.
 *
 * @param array $fields title, body, slug?, tags?, aliases?, category?, player_visible?, is_locked?,
 *                      is_auto_generated?, dm_notes?, entity_type?, entity_id?, source_generator?, source_ref?, id?
 */
function loreSaveArticle(int $userId, int $campaignId, array $fields): array
{
    loreEnsureSchema();
    $title = trim((string) ($fields['title'] ?? ''));
    $body = (string) ($fields['body'] ?? '');
    if ($title === '') {
        throw new Exception('Article title is required.');
    }
    $slug = trim((string) ($fields['slug'] ?? ''));
    if ($slug === '') {
        $slug = loreSlugify($title);
    } else {
        $slug = loreSlugify($slug);
    }
    $category = loreNormalizeCategory($fields['category'] ?? 'other');
    $tagsJson = json_encode(loreDecodeTags($fields['tags'] ?? []), JSON_UNESCAPED_UNICODE);
    $aliasesJson = json_encode(loreDecodeAliases($fields['aliases'] ?? []), JSON_UNESCAPED_UNICODE);
    $playerVisible = !empty($fields['player_visible']) ? 1 : 0;
    $isLocked = !empty($fields['is_locked']) ? 1 : 0;
    $isAuto = !empty($fields['is_auto_generated']) ? 1 : 0;
    $dmNotes = $fields['dm_notes'] ?? null;
    if ($dmNotes !== null) {
        $dmNotes = (string) $dmNotes;
    }
    $entityType = isset($fields['entity_type']) ? trim((string) $fields['entity_type']) : null;
    if ($entityType === '') {
        $entityType = null;
    }
    $entityId = isset($fields['entity_id']) ? (int) $fields['entity_id'] : null;
    if ($entityId !== null && $entityId <= 0) {
        $entityId = null;
    }
    $sourceGen = isset($fields['source_generator']) ? mb_substr(trim((string) $fields['source_generator']), 0, 32) : null;
    if ($sourceGen === '') {
        $sourceGen = null;
    }
    $sourceRef = isset($fields['source_ref']) ? mb_substr(trim((string) $fields['source_ref']), 0, 64) : null;
    if ($sourceRef === '') {
        $sourceRef = null;
    }

    $articleId = (int) ($fields['id'] ?? 0);
    $oldSlug = null;

    if ($articleId > 0) {
        $existing = query(
            'SELECT * FROM wiki_articles WHERE id = ? AND user_id = ? AND campaign_id = ? LIMIT 1',
            [$articleId, $userId, $campaignId],
            0
        );
        if (!$existing) {
            throw new Exception('Article not found.');
        }
        $oldSlug = (string) $existing[0]['slug'];
        // Manual edit clears auto flag unless caller forces auto
        if (!array_key_exists('is_auto_generated', $fields)) {
            $isAuto = 0;
        }
        execute(
            'UPDATE wiki_articles SET slug = ?, title = ?, body = ?, tags_json = ?, aliases_json = ?,
                category = ?, player_visible = ?, is_locked = ?, is_auto_generated = ?,
                dm_notes = ?, entity_type = ?, entity_id = ?, source_generator = COALESCE(?, source_generator),
                source_ref = COALESCE(?, source_ref)
             WHERE id = ? AND user_id = ? AND campaign_id = ?',
            [
                $slug, $title, $body, $tagsJson, $aliasesJson,
                $category, $playerVisible, $isLocked, $isAuto,
                $dmNotes, $entityType, $entityId, $sourceGen, $sourceRef,
                $articleId, $userId, $campaignId,
            ],
            0
        );
        if ($oldSlug !== $slug) {
            execute(
                'UPDATE wiki_links SET from_slug = ? WHERE user_id = ? AND campaign_id = ? AND from_slug = ?',
                [$slug, $userId, $campaignId, $oldSlug],
                0
            );
            execute(
                'UPDATE wiki_links SET to_slug = ? WHERE user_id = ? AND campaign_id = ? AND to_slug = ?',
                [$slug, $userId, $campaignId, $oldSlug],
                0
            );
        }
    } else {
        $articleId = insertAndGetId(
            'INSERT INTO wiki_articles (
                user_id, campaign_id, slug, title, body, tags_json, aliases_json, category,
                player_visible, is_locked, is_auto_generated, dm_notes, entity_type, entity_id,
                source_generator, source_ref
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $userId, $campaignId, $slug, $title, $body, $tagsJson, $aliasesJson, $category,
                $playerVisible, $isLocked, $isAuto, $dmNotes, $entityType, $entityId,
                $sourceGen, $sourceRef,
            ],
            0
        );
    }

    loreRefreshLinksForArticle($userId, $campaignId, $articleId, true);
    $saved = query('SELECT * FROM wiki_articles WHERE id = ? LIMIT 1', [$articleId], 0);
    return loreFormatArticleRow($saved[0] ?? null) ?? ['id' => $articleId];
}

function loreUpsertLink(int $userId, int $campaignId, string $fromSlug, string $toSlug, float $weight, int $autoGenerated): void
{
    if ($fromSlug === '' || $toSlug === '' || $fromSlug === $toSlug) {
        return;
    }
    execute(
        'INSERT INTO wiki_links (user_id, campaign_id, from_slug, to_slug, weight, auto_generated)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE weight = GREATEST(wiki_links.weight, VALUES(weight)),
           auto_generated = IF(wiki_links.auto_generated = 0, 0, VALUES(auto_generated))',
        [$userId, $campaignId, $fromSlug, $toSlug, $weight, $autoGenerated],
        0
    );
}

/**
 * Build title/alias lookup map for mention detection (longest titles first).
 * @return list<array{slug:string,needle:string}>
 */
function loreBuildMentionNeedles(array $articles, string $excludeSlug = ''): array
{
    $needles = [];
    foreach ($articles as $a) {
        $slug = (string) ($a['slug'] ?? '');
        if ($slug === '' || $slug === $excludeSlug) {
            continue;
        }
        $titles = [(string) ($a['title'] ?? '')];
        foreach (loreDecodeAliases($a['aliases_json'] ?? ($a['aliases'] ?? [])) as $al) {
            $titles[] = $al;
        }
        foreach ($titles as $t) {
            $t = trim($t);
            if (mb_strlen($t) < 3) {
                continue;
            }
            $needles[] = ['slug' => $slug, 'needle' => mb_strtolower($t)];
        }
    }
    usort($needles, fn($a, $b) => mb_strlen($b['needle']) <=> mb_strlen($a['needle']));
    return $needles;
}

/**
 * Refresh links involving one article: explicit [[wikilinks]] + title mentions.
 * Creates stub pages for unresolved [[Title]] targets when $createStubs is true.
 */
function loreRefreshLinksForArticle(int $userId, int $campaignId, int $articleId, bool $createStubs = true): array
{
    loreEnsureSchema();
    $rows = query(
        'SELECT * FROM wiki_articles WHERE id = ? AND user_id = ? AND campaign_id = ? LIMIT 1',
        [$articleId, $userId, $campaignId],
        0
    );
    if (!$rows) {
        return ['links_added' => 0, 'stubs' => 0];
    }
    $from = $rows[0];
    $fromSlug = (string) $from['slug'];
    $body = (string) ($from['body'] ?? '');

    // Drop auto links from this article; keep manual
    execute(
        'DELETE FROM wiki_links WHERE user_id = ? AND campaign_id = ? AND from_slug = ? AND auto_generated = 1',
        [$userId, $campaignId, $fromSlug],
        0
    );

    $all = query(
        'SELECT id, slug, title, aliases_json FROM wiki_articles WHERE user_id = ? AND campaign_id = ?',
        [$userId, $campaignId],
        0
    ) ?: [];

    $linksAdded = 0;
    $stubs = 0;

    // Explicit [[wikilinks]] → manual links; stub missing pages
    foreach (loreParseWikilinks($body) as $wl) {
        $target = loreFindArticleByTitleOrSlug($userId, $campaignId, $wl['title']);
        if (!$target && $createStubs) {
            $stubTitle = $wl['title'];
            $stubSlug = loreSlugify($stubTitle);
            // Avoid collision
            $exists = query(
                'SELECT id FROM wiki_articles WHERE user_id = ? AND campaign_id = ? AND slug = ? LIMIT 1',
                [$userId, $campaignId, $stubSlug],
                0
            );
            if (!$exists) {
                $stubId = insertAndGetId(
                    'INSERT INTO wiki_articles (user_id, campaign_id, slug, title, body, tags_json, aliases_json, category, is_auto_generated)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
                    [
                        $userId, $campaignId, $stubSlug, $stubTitle,
                        "_Stub page created from a [[wikilink]]. Expand this entry._\n",
                        '[]', '[]', 'other',
                    ],
                    0
                );
                $stubs++;
                $target = ['id' => $stubId, 'slug' => $stubSlug, 'title' => $stubTitle];
                $all[] = $target;
            } else {
                $target = loreFindArticleByTitleOrSlug($userId, $campaignId, $stubTitle);
            }
        }
        if ($target) {
            loreUpsertLink($userId, $campaignId, $fromSlug, (string) $target['slug'], 1.5, 0);
            $linksAdded++;
        }
    }

    // Title/alias mentions → auto links
    $bodyLower = mb_strtolower($body);
    $linked = [];
    foreach (loreBuildMentionNeedles($all, $fromSlug) as $n) {
        if (isset($linked[$n['slug']])) {
            continue;
        }
        if (mb_strpos($bodyLower, $n['needle']) !== false) {
            loreUpsertLink($userId, $campaignId, $fromSlug, $n['slug'], 1.0, 1);
            $linked[$n['slug']] = true;
            $linksAdded++;
        }
    }

    return ['links_added' => $linksAdded, 'stubs' => $stubs];
}

/**
 * Full-campaign auto-link refresh (mention-based). Preserves manual links.
 */
function loreAutolinkRefreshCampaign(int $userId, int $campaignId): array
{
    loreEnsureSchema();
    $articles = query(
        'SELECT id, slug, title, body, aliases_json FROM wiki_articles WHERE user_id = ? AND campaign_id = ?',
        [$userId, $campaignId],
        0
    ) ?: [];

    execute(
        'DELETE FROM wiki_links WHERE user_id = ? AND campaign_id = ? AND auto_generated = 1',
        [$userId, $campaignId],
        0
    );

    $count = 0;
    foreach ($articles as $from) {
        $bodyLower = mb_strtolower((string) ($from['body'] ?? ''));
        $fromSlug = (string) $from['slug'];
        $linked = [];
        foreach (loreBuildMentionNeedles($articles, $fromSlug) as $n) {
            if (isset($linked[$n['slug']])) {
                continue;
            }
            if (mb_strpos($bodyLower, $n['needle']) !== false) {
                loreUpsertLink($userId, $campaignId, $fromSlug, $n['slug'], 1.0, 1);
                $linked[$n['slug']] = true;
                $count++;
            }
        }
        // Re-apply explicit wikilinks as manual (without recreating stubs in batch mode)
        foreach (loreParseWikilinks((string) ($from['body'] ?? '')) as $wl) {
            $target = loreFindArticleByTitleOrSlug($userId, $campaignId, $wl['title']);
            if ($target) {
                loreUpsertLink($userId, $campaignId, $fromSlug, (string) $target['slug'], 1.5, 0);
            }
        }
    }

    $links = query(
        'SELECT from_slug, to_slug, weight, auto_generated FROM wiki_links WHERE user_id = ? AND campaign_id = ? ORDER BY from_slug, to_slug',
        [$userId, $campaignId],
        0
    ) ?: [];

    return ['ok' => true, 'auto_links' => $count, 'links' => $links];
}

function loreGetBacklinks(int $userId, int $campaignId, string $slug): array
{
    return query(
        'SELECT l.from_slug, l.weight, l.auto_generated, a.title AS from_title, a.id AS from_id
         FROM wiki_links l
         LEFT JOIN wiki_articles a ON a.user_id = l.user_id AND a.campaign_id = l.campaign_id AND a.slug = l.from_slug
         WHERE l.user_id = ? AND l.campaign_id = ? AND l.to_slug = ?
         ORDER BY l.auto_generated ASC, a.title ASC',
        [$userId, $campaignId, $slug],
        0
    ) ?: [];
}

function loreGetOutlinks(int $userId, int $campaignId, string $slug): array
{
    return query(
        'SELECT l.to_slug, l.weight, l.auto_generated, a.title AS to_title, a.id AS to_id
         FROM wiki_links l
         LEFT JOIN wiki_articles a ON a.user_id = l.user_id AND a.campaign_id = l.campaign_id AND a.slug = l.to_slug
         WHERE l.user_id = ? AND l.campaign_id = ? AND l.from_slug = ?
         ORDER BY l.auto_generated ASC, a.title ASC',
        [$userId, $campaignId, $slug],
        0
    ) ?: [];
}

/**
 * Codex digest for AI prompts (LORE-07).
 */
function loreBuildContextForAi(int $userId, int $campaignId, int $maxArticles = 40, int $excerptChars = 400): string
{
    if ($campaignId <= 0) {
        return '';
    }
    loreEnsureSchema();
    $rows = query(
        'SELECT title, slug, category, body FROM wiki_articles
         WHERE user_id = ? AND campaign_id = ?
         ORDER BY is_locked DESC, updated_at DESC
         LIMIT ' . (int) $maxArticles,
        [$userId, $campaignId],
        0
    ) ?: [];
    if (!$rows) {
        return '';
    }
    $out = "LORE CODEX (campaign wiki — prefer these facts; use [[Page Title]] when referencing):\n";
    foreach ($rows as $r) {
        $excerpt = trim(preg_replace('/\s+/', ' ', strip_tags((string) ($r['body'] ?? ''))) ?? '');
        if (mb_strlen($excerpt) > $excerptChars) {
            $excerpt = mb_substr($excerpt, 0, $excerptChars) . '…';
        }
        $cat = loreNormalizeCategory($r['category'] ?? 'other');
        $out .= "- [[{$r['title']}]] ({$cat} / {$r['slug']}): {$excerpt}\n";
    }
    $out .= "\n";
    return $out;
}

/**
 * AI ingest: create page, update if still auto-only, or queue pending merge.
 *
 * @return array{status:string,article?:array,pending_id?:int,message?:string}
 */
function loreIngestFromAi(
    int $userId,
    int $campaignId,
    string $title,
    string $body,
    string $generatorType = 'lore',
    ?string $sourceRef = null,
    ?string $category = null
): array {
    loreEnsureSchema();
    $title = trim($title) !== '' ? mb_substr(trim($title), 0, 180) : loreExtractTitleFromBody($body);
    $body = trim($body);
    if ($body === '') {
        return ['status' => 'skipped', 'message' => 'Empty body'];
    }
    // Encourage wikilinks in stored body if AI omitted them — leave as-is
    $cat = loreNormalizeCategory($category ?: loreCategoryFromGenerator($generatorType, $title));
    $existing = loreFindArticleByTitleOrSlug($userId, $campaignId, $title);

    if (!$existing) {
        $article = loreSaveArticle($userId, $campaignId, [
            'title' => $title,
            'body' => $body,
            'category' => $cat,
            'is_auto_generated' => 1,
            'source_generator' => $generatorType,
            'source_ref' => $sourceRef,
        ]);
        return ['status' => 'created', 'article' => $article];
    }

    $articleId = (int) $existing['id'];
    $locked = !empty($existing['is_locked']);
    $wasAuto = !empty($existing['is_auto_generated']);
    $oldBody = trim((string) ($existing['body'] ?? ''));

    if ($locked || (!$wasAuto && $oldBody !== '' && $oldBody !== $body)) {
        $pendingId = insertAndGetId(
            'INSERT INTO wiki_pending_ingest
                (user_id, campaign_id, article_id, proposed_title, proposed_slug, proposed_body,
                 proposed_category, source_generator, source_ref, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, \'pending\')',
            [
                $userId, $campaignId, $articleId, $title, (string) $existing['slug'], $body,
                $cat, $generatorType, $sourceRef,
            ],
            0
        );
        return [
            'status' => 'pending',
            'pending_id' => $pendingId,
            'article' => loreFormatArticleRow($existing),
            'message' => 'Queued for merge — existing page is locked or DM-edited.',
        ];
    }

    $article = loreSaveArticle($userId, $campaignId, [
        'id' => $articleId,
        'title' => $title,
        'slug' => (string) $existing['slug'],
        'body' => $body,
        'category' => $cat,
        'tags' => loreDecodeTags($existing['tags_json'] ?? []),
        'aliases' => loreDecodeAliases($existing['aliases_json'] ?? []),
        'player_visible' => (int) ($existing['player_visible'] ?? 0),
        'is_locked' => 0,
        'is_auto_generated' => 1,
        'dm_notes' => $existing['dm_notes'] ?? null,
        'entity_type' => $existing['entity_type'] ?? null,
        'entity_id' => isset($existing['entity_id']) ? (int) $existing['entity_id'] : null,
        'source_generator' => $generatorType,
        'source_ref' => $sourceRef,
    ]);
    return ['status' => 'updated', 'article' => $article];
}

function loreListPending(int $userId, int $campaignId): array
{
    loreEnsureSchema();
    return query(
        'SELECT * FROM wiki_pending_ingest
         WHERE user_id = ? AND campaign_id = ? AND status = \'pending\'
         ORDER BY created_at DESC
         LIMIT 100',
        [$userId, $campaignId],
        0
    ) ?: [];
}

/**
 * Resolve pending: accept (replace), append, or skip.
 */
function loreResolvePending(int $userId, int $campaignId, int $pendingId, string $resolution): array
{
    loreEnsureSchema();
    $rows = query(
        'SELECT * FROM wiki_pending_ingest WHERE id = ? AND user_id = ? AND campaign_id = ? AND status = \'pending\' LIMIT 1',
        [$pendingId, $userId, $campaignId],
        0
    );
    if (!$rows) {
        throw new Exception('Pending ingest not found.');
    }
    $p = $rows[0];
    $resolution = strtolower(trim($resolution));
    if (!in_array($resolution, ['accept', 'append', 'skip'], true)) {
        throw new Exception('resolution must be accept, append, or skip.');
    }

    $article = null;
    if ($resolution === 'skip') {
        execute(
            'UPDATE wiki_pending_ingest SET status = \'skipped\', resolved_at = NOW() WHERE id = ?',
            [$pendingId],
            0
        );
        return ['ok' => true, 'status' => 'skipped'];
    }

    $articleId = (int) ($p['article_id'] ?? 0);
    $proposedBody = (string) $p['proposed_body'];
    $title = (string) $p['proposed_title'];
    $cat = loreNormalizeCategory($p['proposed_category'] ?? 'other');

    if ($resolution === 'append' && $articleId > 0) {
        $ex = query(
            'SELECT * FROM wiki_articles WHERE id = ? AND user_id = ? AND campaign_id = ? LIMIT 1',
            [$articleId, $userId, $campaignId],
            0
        );
        if (!$ex) {
            throw new Exception('Target article missing.');
        }
        $stamp = gmdate('Y-m-d');
        $newBody = rtrim((string) $ex[0]['body']) . "\n\n## AI update ({$stamp})\n\n" . $proposedBody . "\n";
        $article = loreSaveArticle($userId, $campaignId, [
            'id' => $articleId,
            'title' => (string) $ex[0]['title'],
            'slug' => (string) $ex[0]['slug'],
            'body' => $newBody,
            'category' => loreNormalizeCategory($ex[0]['category'] ?? $cat),
            'tags' => loreDecodeTags($ex[0]['tags_json'] ?? []),
            'aliases' => loreDecodeAliases($ex[0]['aliases_json'] ?? []),
            'player_visible' => (int) ($ex[0]['player_visible'] ?? 0),
            'is_locked' => (int) ($ex[0]['is_locked'] ?? 0),
            'is_auto_generated' => 0,
            'dm_notes' => $ex[0]['dm_notes'] ?? null,
            'entity_type' => $ex[0]['entity_type'] ?? null,
            'entity_id' => isset($ex[0]['entity_id']) ? (int) $ex[0]['entity_id'] : null,
            'source_generator' => $p['source_generator'] ?? null,
            'source_ref' => $p['source_ref'] ?? null,
        ]);
    } else {
        // accept = replace body (or create if no article_id)
        if ($articleId > 0) {
            $ex = query(
                'SELECT * FROM wiki_articles WHERE id = ? AND user_id = ? AND campaign_id = ? LIMIT 1',
                [$articleId, $userId, $campaignId],
                0
            );
            if (!$ex) {
                throw new Exception('Target article missing.');
            }
            $article = loreSaveArticle($userId, $campaignId, [
                'id' => $articleId,
                'title' => $title !== '' ? $title : (string) $ex[0]['title'],
                'slug' => (string) $ex[0]['slug'],
                'body' => $proposedBody,
                'category' => $cat,
                'tags' => loreDecodeTags($ex[0]['tags_json'] ?? []),
                'aliases' => loreDecodeAliases($ex[0]['aliases_json'] ?? []),
                'player_visible' => (int) ($ex[0]['player_visible'] ?? 0),
                'is_locked' => (int) ($ex[0]['is_locked'] ?? 0),
                'is_auto_generated' => 0,
                'dm_notes' => $ex[0]['dm_notes'] ?? null,
                'entity_type' => $ex[0]['entity_type'] ?? null,
                'entity_id' => isset($ex[0]['entity_id']) ? (int) $ex[0]['entity_id'] : null,
                'source_generator' => $p['source_generator'] ?? null,
                'source_ref' => $p['source_ref'] ?? null,
            ]);
        } else {
            $article = loreSaveArticle($userId, $campaignId, [
                'title' => $title,
                'body' => $proposedBody,
                'category' => $cat,
                'is_auto_generated' => 0,
                'source_generator' => $p['source_generator'] ?? null,
                'source_ref' => $p['source_ref'] ?? null,
            ]);
        }
    }

    execute(
        'UPDATE wiki_pending_ingest SET status = ?, resolved_at = NOW() WHERE id = ?',
        [$resolution === 'append' ? 'appended' : 'accepted', $pendingId],
        0
    );

    return ['ok' => true, 'status' => $resolution, 'article' => $article];
}

/**
 * Get or create lore page for a game entity (character, faction, building, town).
 */
function loreGetOrCreateForEntity(
    int $userId,
    int $campaignId,
    string $entityType,
    int $entityId,
    string $title,
    string $seedBody = ''
): array {
    loreEnsureSchema();
    $entityType = preg_replace('/[^a-z0-9_]/i', '', $entityType) ?: 'entity';
    $existing = loreFindArticleByEntity($userId, $campaignId, $entityType, $entityId);
    if ($existing) {
        return loreFormatArticleRow($existing);
    }
    $catMap = [
        'character' => 'npc',
        'faction' => 'faction',
        'building' => 'place',
        'town' => 'place',
        'deity' => 'deity',
    ];
    $body = $seedBody !== '' ? $seedBody : "_Lore page for {$title}. Add details and [[cross-links]] here._\n";
    return loreSaveArticle($userId, $campaignId, [
        'title' => $title,
        'body' => $body,
        'category' => $catMap[$entityType] ?? 'other',
        'entity_type' => $entityType,
        'entity_id' => $entityId,
        'is_auto_generated' => 0,
    ]);
}

function lorePlayerVisibleArticles(int $userId, int $campaignId): array
{
    loreEnsureSchema();
    $rows = query(
        'SELECT id, slug, title, body, category, tags_json, updated_at
         FROM wiki_articles
         WHERE user_id = ? AND campaign_id = ? AND player_visible = 1
         ORDER BY title ASC',
        [$userId, $campaignId],
        0
    ) ?: [];
    foreach ($rows as &$r) {
        $r['tags'] = loreDecodeTags($r['tags_json'] ?? []);
        unset($r['tags_json']);
        // Never expose dm_notes in player payloads (column not selected)
    }
    unset($r);
    return $rows;
}
