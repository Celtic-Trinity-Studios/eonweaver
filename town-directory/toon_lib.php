<?php
/**
 * TOON (Token-Oriented Object Notation) encoding for LLM prompts.
 * @see https://toonformat.dev/guide/llm-prompts
 */

if (!function_exists('ew_toon_string_must_quote')) {
    function ew_toon_string_must_quote(string $s, string $delim): bool
    {
        if ($s === '') {
            return true;
        }
        if (preg_match('/^\s/', $s) || preg_match('/\s$/', $s)) {
            return true;
        }
        if ($s === 'true' || $s === 'false' || $s === 'null') {
            return true;
        }
        if ($s === '-' || preg_match('/^-.+/s', $s)) {
            return true;
        }
        if (preg_match('/^-?(?:\d+)(?:\.\d+)?(?:[eE][+-]?\d+)?$/', $s)) {
            return true;
        }
        if (preg_match('/^0\d/', $s)) {
            return true;
        }
        if (strpos($s, ':') !== false || strpos($s, '"') !== false || strpos($s, '\\') !== false) {
            return true;
        }
        if (preg_match('/[\[\]{}]/', $s)) {
            return true;
        }
        if (preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', $s)) {
            return true;
        }
        if (strpos($s, "\n") !== false || strpos($s, "\r") !== false || strpos($s, "\t") !== false) {
            return true;
        }
        if ($delim !== '' && strpos($s, $delim) !== false) {
            return true;
        }
        return false;
    }
}

if (!function_exists('ew_toon_escape_string')) {
    function ew_toon_escape_string(string $s): string
    {
        return str_replace(
            ["\\", "\"", "\n", "\r", "\t"],
            ["\\\\", "\\\"", "\\n", "\\r", "\\t"],
            $s
        );
    }
}

if (!function_exists('ew_toon_cell')) {
    /**
     * Encode a scalar for a TOON tabular row or primitive-array element.
     *
     * @param mixed $v
     */
    function ew_toon_cell($v, string $delim): string
    {
        if ($v === null) {
            return 'null';
        }
        if (is_bool($v)) {
            return $v ? 'true' : 'false';
        }
        if (is_int($v)) {
            return (string) $v;
        }
        if (is_float($v)) {
            if (!is_finite($v)) {
                return 'null';
            }
            $x = $v;
            if ($x == floor($x)) {
                return (string) (int) $x;
            }
            $t = rtrim(rtrim(sprintf('%.12F', $x), '0'), '.');

            return $t === '' ? '0' : $t;
        }
        $s = (string) $v;
        if (ew_toon_string_must_quote($s, $delim)) {
            return '"' . ew_toon_escape_string($s) . '"';
        }

        return $s;
    }
}

if (!function_exists('ew_toon_tabular_inner')) {
    /**
     * @param list<string> $fields
     * @param list<array<string,mixed>> $rows
     */
    function ew_toon_tabular_inner(string $name, array $fields, array $rows, string $delim = "\t"): string
    {
        $n = count($rows);
        if ($delim === "\t") {
            $header = $name . '[' . $n . "\t]{" . implode("\t", $fields) . "}:\n";
        } elseif ($delim === '|') {
            $header = $name . '[' . $n . '|]{' . implode('|', $fields) . "}:\n";
        } else {
            $header = $name . '[' . $n . ']{' . implode(',', $fields) . "}:\n";
        }
        if ($n === 0) {
            return $header;
        }
        $out = $header;
        foreach ($rows as $row) {
            $cells = [];
            foreach ($fields as $f) {
                $cells[] = ew_toon_cell($row[$f] ?? null, $delim);
            }
            $out .= '  ' . implode($delim, $cells) . "\n";
        }

        return $out;
    }
}

if (!function_exists('ew_toon_fenced')) {
    function ew_toon_fenced(string $inner): string
    {
        $inner = rtrim($inner, "\n");

        return "```toon\n" . $inner . "\n```\n";
    }
}

if (!function_exists('ew_toon_primitive_array_line')) {
    /**
     * Single-line primitive array: key[N]: v1 delim v2 ...
     *
     * @param list<mixed> $values
     */
    function ew_toon_primitive_array_line(string $key, array $values, string $delim = "\t"): string
    {
        $n = count($values);
        $cells = [];
        foreach ($values as $v) {
            $cells[] = ew_toon_cell($v, $delim);
        }
        $body = implode($delim, $cells);
        if ($delim === "\t") {
            return $key . '[' . $n . "\t]: " . $body . "\n";
        }
        if ($delim === '|') {
            return $key . '[' . $n . '|]: ' . $body . "\n";
        }

        return $key . '[' . $n . ']: ' . $body . "\n";
    }
}
