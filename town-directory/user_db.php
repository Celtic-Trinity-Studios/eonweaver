<?php
/**
 * Eon Weaver — Per-User SQLite Database
 * Each user gets their own content.db file at: users/{userId}/content.db
 * Stores homebrew content (races, classes, feats, spells, equipment) and file metadata.
 * Completely isolated from other users — no shared tables.
 */

/**
 * Get (or create) a SQLite PDO connection for a specific user.
 * Auto-creates the database file and tables on first access.
 */
function getUserDB(int $userId): PDO
{
    static $conns = [];
    if (isset($conns[$userId])) {
        return $conns[$userId];
    }

    $dir = __DIR__ . '/users/' . $userId;
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }

    $dbPath = $dir . '/content.db';
    $isNew = !file_exists($dbPath);

    $pdo = new PDO("sqlite:$dbPath", null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    // Enable WAL mode for better concurrent read performance
    $pdo->exec('PRAGMA journal_mode=WAL');
    $pdo->exec('PRAGMA foreign_keys=ON');

    // Always run init — uses CREATE TABLE IF NOT EXISTS, so safe for existing DBs.
    // This ensures tables added after initial DB creation get created (schema migration).
    initUserContentDB($pdo);

    $conns[$userId] = $pdo;
    return $pdo;
}

/**
 * Initialize all tables in a fresh user content database.
 */
function initUserContentDB(PDO $pdo): void
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS custom_races (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id     INTEGER NULL,
        name            TEXT NOT NULL,
        size            TEXT DEFAULT 'Medium',
        speed           INTEGER DEFAULT 30,
        ability_mods    TEXT DEFAULT '',
        traits          TEXT DEFAULT '',
        languages       TEXT DEFAULT '',
        created_at      TEXT DEFAULT (datetime('now'))
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS custom_classes (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id     INTEGER NULL,
        name            TEXT NOT NULL,
        hit_die         TEXT DEFAULT 'd8',
        bab_type        TEXT DEFAULT '3/4',
        good_saves      TEXT DEFAULT '',
        skills_per_level INTEGER DEFAULT 2,
        class_skills    TEXT DEFAULT '',
        class_features  TEXT DEFAULT '',
        created_at      TEXT DEFAULT (datetime('now'))
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS custom_feats (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id     INTEGER NULL,
        name            TEXT NOT NULL,
        type            TEXT DEFAULT 'General',
        prerequisites   TEXT DEFAULT '',
        benefit         TEXT DEFAULT '',
        description     TEXT DEFAULT '',
        modifiers       TEXT DEFAULT '[]',
        created_at      TEXT DEFAULT (datetime('now'))
    )");

    // Migration: add modifiers column to existing custom_feats tables
    try {
        $pdo->exec("ALTER TABLE custom_feats ADD COLUMN modifiers TEXT DEFAULT '[]'");
    } catch (Exception $e) {
        // Column already exists — expected on subsequent runs
    }

    $pdo->exec("CREATE TABLE IF NOT EXISTS custom_spells (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id     INTEGER NULL,
        name            TEXT NOT NULL,
        level           INTEGER DEFAULT 0,
        school          TEXT DEFAULT '',
        casting_time    TEXT DEFAULT '1 standard action',
        range           TEXT DEFAULT '',
        duration        TEXT DEFAULT '',
        components      TEXT DEFAULT '',
        description     TEXT DEFAULT '',
        classes         TEXT DEFAULT '',
        created_at      TEXT DEFAULT (datetime('now'))
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS custom_equipment (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id     INTEGER NULL,
        name            TEXT NOT NULL,
        category        TEXT DEFAULT '',
        cost            TEXT DEFAULT '',
        weight          TEXT DEFAULT '',
        damage          TEXT DEFAULT '',
        critical        TEXT DEFAULT '',
        properties      TEXT DEFAULT '',
        created_at      TEXT DEFAULT (datetime('now'))
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS user_files (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id     INTEGER NULL,
        filename        TEXT NOT NULL,
        original_name   TEXT NOT NULL,
        file_type       TEXT DEFAULT 'document',
        mime_type       TEXT DEFAULT '',
        file_size       INTEGER DEFAULT 0,
        description     TEXT DEFAULT '',
        folder          TEXT DEFAULT 'content',
        uploaded_at     TEXT DEFAULT (datetime('now'))
    )");
}

/**
 * Query the user's SQLite content database.
 */
function userQuery(int $userId, string $sql, array $params = []): array
{
    $stmt = getUserDB($userId)->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

/**
 * Execute a write statement on the user's SQLite content database.
 */
function userExecute(int $userId, string $sql, array $params = []): int
{
    $stmt = getUserDB($userId)->prepare($sql);
    $stmt->execute($params);
    return $stmt->rowCount();
}

/**
 * Insert and return the last insert ID from the user's SQLite content database.
 */
function userInsert(int $userId, string $sql, array $params = []): int
{
    $stmt = getUserDB($userId)->prepare($sql);
    $stmt->execute($params);
    return (int) getUserDB($userId)->lastInsertId();
}
