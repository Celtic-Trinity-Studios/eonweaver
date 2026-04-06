<?php
/**
 * Eon Weaver - Database Connection (MySQL, shared)
 * Includes reconnect support for long-running AI calls.
 */
require_once __DIR__ . '/config.php';

/**
 * Get (or create) the shared PDO connection.
 * Pass $forceNew = true to force a fresh connection (use after long AI calls).
 */
function getDB(int $userId = 0, bool $forceNew = false): PDO
{
    static $pdo = null;
    if ($forceNew) {
        $pdo = null;
    }
    if ($pdo !== null) {
        return $pdo;
    }

    $dsn = 'mysql:host=' . DB_HOST
        . ';dbname=' . DB_NAME
        . ';charset=' . DB_CHARSET;

    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET SESSION wait_timeout=600, interactive_timeout=600",
    ]);

    return $pdo;
}

/**
 * Force a fresh MySQL reconnection.
 * Call this AFTER any long-running external API call (Gemini, etc.)
 * to avoid SQLSTATE HY000: 2006 "MySQL server has gone away".
 */
function resetDB(): PDO
{
    return getDB(0, true);
}

// Convenience helpers

function query(string $sql, array $params = [], int $userId = 0): array
{
    $stmt = getDB()->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

function execute(string $sql, array $params = [], int $userId = 0): int
{
    $stmt = getDB()->prepare($sql);
    $stmt->execute($params);
    return $stmt->rowCount();
}

function insertAndGetId(string $sql, array $params = [], int $userId = 0): int
{
    $stmt = getDB()->prepare($sql);
    $stmt->execute($params);
    return (int) getDB()->lastInsertId();
}

// -----------------------------------------------------------
//  SRD Edition Database Helpers
//  Each D&D edition has its own isolated database.
// -----------------------------------------------------------

/**
 * Get a PDO connection to the SRD database for a specific edition.
 * Caches connections per database name for reuse within a request.
 */
function getSrdDB(string $edition = '3.5e'): PDO
{
    static $srdConns = [];

    $cfg = SRD_DBS[$edition] ?? SRD_DBS['3.5e'];

    // Support both formats: string (db name only) or array (db + user + pass)
    if (is_array($cfg)) {
        $dbName = $cfg['db'];
        $dbUser = $cfg['user'] ?? DB_USER;
        $dbPass = $cfg['pass'] ?? DB_PASS;
    } else {
        $dbName = $cfg;
        $dbUser = DB_USER;
        $dbPass = DB_PASS;
    }

    if (isset($srdConns[$dbName])) {
        return $srdConns[$dbName];
    }

    $dsn = 'mysql:host=' . DB_HOST
        . ';dbname=' . $dbName
        . ';charset=' . DB_CHARSET;

    $srdConns[$dbName] = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $srdConns[$dbName];
}

/**
 * Query the SRD database for a specific edition.
 */
function srdQuery(string $edition, string $sql, array $params = []): array
{
    $stmt = getSrdDB($edition)->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

/**
 * Execute a write statement on the SRD database for a specific edition.
 */
function srdExecute(string $edition, string $sql, array $params = []): int
{
    $stmt = getSrdDB($edition)->prepare($sql);
    $stmt->execute($params);
    return $stmt->rowCount();
}

