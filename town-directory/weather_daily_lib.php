<?php
/**
 * Hybrid weather: AI supplies monthly anchors (town_meta.weather_year); local code derives
 * correlated day-scale variation + occasional odd weather — no extra LLM tokens.
 */

/** Deterministic unit sample from [0, 1) for a stable string key. */
function ew_weather_hash_unit(string $key): float
{
    $bin = hash('sha256', $key, true);
    $n = unpack('N', substr($bin, 0, 4))[1];
    return ($n % 1000000) / 1000000;
}

function ew_weather_parse_temp_celsius(?string $avgTemp): ?float
{
    if (!$avgTemp || !is_string($avgTemp)) {
        return null;
    }
    if (preg_match('/(-?\d+(?:\.\d+)?)\s*°?\s*C/i', $avgTemp, $m)) {
        return (float) $m[1];
    }
    if (preg_match('/(-?\d+(?:\.\d+)?)\s*°?\s*F/i', $avgTemp, $m)) {
        return ((float) $m[1] - 32) * 5 / 9;
    }
    return null;
}

function ew_weather_format_temp_dual(float $celsius): string
{
    $f = $celsius * 9 / 5 + 32;
    return sprintf('%d°F / %d°C', (int) round($f), (int) round($celsius));
}

function ew_weather_from_integration_value($value): ?array
{
    if (!is_array($value)) {
        return null;
    }
    if (!empty($value['months']) && is_array($value['months'])) {
        return $value;
    }
    if (!empty($value['weather']) && is_array($value['weather']) && !empty($value['weather']['months'])) {
        return $value['weather'];
    }
    return null;
}

/**
 * Shift world month climate toward a town-specific local profile using map latitude (y_pct)
 * and biome hints, while keeping month-to-month consistency from the world dataset.
 */
function ew_weather_localize_month_for_town(array $monthWeather, ?float $yPct = null, ?string $biome = null): array
{
    $local = $monthWeather;
    $baseC = ew_weather_parse_temp_celsius((string) ($monthWeather['avg_temp'] ?? ''));
    if ($baseC === null) {
        $baseC = 10.0;
    }

    // y_pct: 0.0 top map, 1.0 bottom map. Middle is neutral.
    $latDelta = 0.0;
    if ($yPct !== null) {
        $norm = max(0.0, min(1.0, $yPct));
        $latDelta = (0.5 - $norm) * 12.0; // +/- 6C swing from equator-ish middle
    }

    $biomeDelta = 0.0;
    $biomeText = strtolower(trim((string) $biome));
    if ($biomeText !== '') {
        if (strpos($biomeText, 'desert') !== false || strpos($biomeText, 'volcan') !== false) {
            $biomeDelta += 3.0;
        }
        if (
            strpos($biomeText, 'tundra') !== false ||
            strpos($biomeText, 'arctic') !== false ||
            strpos($biomeText, 'glacier') !== false ||
            strpos($biomeText, 'taiga') !== false
        ) {
            $biomeDelta -= 4.0;
        }
        if (
            strpos($biomeText, 'swamp') !== false ||
            strpos($biomeText, 'marsh') !== false ||
            strpos($biomeText, 'rainforest') !== false
        ) {
            if (!empty($local['precipitation']) && is_string($local['precipitation'])) {
                if (stripos($local['precipitation'], 'heavy') === false) {
                    $local['precipitation'] = 'moderate to heavy';
                }
            }
        }
    }

    $localC = $baseC + $latDelta + $biomeDelta;
    $local['avg_temp'] = ew_weather_format_temp_dual($localC);

    return $local;
}

/**
 * Mean-reverting random walk through days 1..dayInMonth — smooth day-to-day change.
 */
function ew_weather_daily_temp_offset(int $townId, int $year, int $month, int $dayInMonth, float $amplitudeC): float
{
    $state = 0.0;
    $dayInMonth = max(1, $dayInMonth);
    for ($d = 1; $d <= $dayInMonth; $d++) {
        $u = ew_weather_hash_unit("wx|{$townId}|{$year}|{$month}|d{$d}");
        $noise = ($u - 0.5) * 2;
        $state = 0.74 * $state + 0.26 * $noise;
    }
    return $state * $amplitudeC;
}

function ew_weather_vocab_near(string $label, array $vocab, float $u): string
{
    $label = strtolower(trim($label));
    $idx = (int) floor(count($vocab) / 2);
    foreach ($vocab as $i => $word) {
        if ($label !== '' && strpos($label, strtolower(substr($word, 0, 4))) !== false) {
            $idx = $i;
            break;
        }
    }
    $delta = (int) round(($u - 0.5) * 2);
    $idx = max(0, min(count($vocab) - 1, $idx + $delta));
    return $vocab[$idx];
}

/** Rare narrative flourish (~8% chance). */
function ew_weather_odd_event_maybe(float $u): ?string
{
    if ($u < 0.92) {
        return null;
    }
    $opts = [
        'Brief hail rattles the roofs',
        'Ground fog banks roll in by dusk',
        'Unseasonable warmth for a few hours midday',
        'Sharp cold after sunset — pipes risk freezing',
        'Isolated thunder — passes quickly',
        'Dust / grit on the wind from the wilds',
        'Sudden clear sky opens after murky dawn',
    ];
    $ix = (int) floor(ew_weather_hash_unit('odd|' . (string) $u) * count($opts)) % count($opts);
    return $opts[$ix];
}

/**
 * @param array $monthWeather one element from weather_year.months
 * @return array{text_block: string, focal_day: int, detail: array<string,mixed>}
 */
function ew_weather_build_daily_context(
    array $monthWeather,
    int $townId,
    int $calendarYear,
    int $month1Based,
    int $focalDayInMonth,
    int $daysInMonth,
    int $simDaysPartial = 0
): array {
    $daysInMonth = max(1, $daysInMonth);
    $focalDayInMonth = max(1, min($daysInMonth, $focalDayInMonth));

    $avg = $monthWeather['avg_temp'] ?? '';
    $centerC = ew_weather_parse_temp_celsius($avg);
    if ($centerC === null) {
        $centerC = 10.0;
    }

    $amp = 4.5;
    $pattern = strtolower((string) ($monthWeather['weather_pattern'] ?? ''));
    if (strpos($pattern, 'storm') !== false || strpos($pattern, 'blizzard') !== false || strpos($pattern, 'hurricane') !== false) {
        $amp = 6.5;
    }
    if (strpos($pattern, 'mild') !== false || strpos($pattern, 'calm') !== false || strpos($pattern, 'clear') !== false) {
        $amp = 3.2;
    }

    $off = ew_weather_daily_temp_offset($townId, $calendarYear, $month1Based, $focalDayInMonth, $amp);
    $dailyC = $centerC + $off;
    $tempStr = ew_weather_format_temp_dual($dailyC);

    $u1 = ew_weather_hash_unit("wxp|{$townId}|{$calendarYear}|{$month1Based}|{$focalDayInMonth}");
    $u2 = ew_weather_hash_unit("wxw|{$townId}|{$calendarYear}|{$month1Based}|{$focalDayInMonth}");
    $u3 = ew_weather_hash_unit("wxo|{$townId}|{$calendarYear}|{$month1Based}|{$focalDayInMonth}");

    $precipDay = ew_weather_vocab_near((string) ($monthWeather['precipitation'] ?? 'moderate'), ['trace', 'light', 'moderate', 'heavy'], $u1);
    $windDay = ew_weather_vocab_near((string) ($monthWeather['wind'] ?? 'breezy'), ['calm', 'breezy', 'gusty', 'strong'], $u2);

    $odd = ew_weather_odd_event_maybe($u3);

    $lines = [];
    $lines[] = 'Hybrid: monthly climate from AI year plan; today’s numbers from local simulation (deterministic for same date/town).';
    $lines[] = "Focal day: {$focalDayInMonth} / {$daysInMonth}" . ($simDaysPartial > 0 ? " (partial-month sim uses mid-window day {$focalDayInMonth})" : '');
    $lines[] = "Temperature (today): {$tempStr} — drifts around the month average with correlated day-to-day noise.";
    $lines[] = "Precipitation: {$precipDay}; winds: {$windDay} (near monthly pattern: " . ($monthWeather['weather_pattern'] ?? 'n/a') . ')';
    if ($odd) {
        $lines[] = "Extra twist today: {$odd}";
    }

    $block = "\n## TODAY’S WEATHER (local hybrid — no extra API cost):\n" . implode("\n", $lines) . "\n";

    return [
        'text_block' => $block,
        'focal_day' => $focalDayInMonth,
        'detail' => [
            'temp_c' => round($dailyC, 2),
            'temp_display' => $tempStr,
            'precipitation' => $precipDay,
            'wind' => $windDay,
            'odd_event' => $odd,
        ],
    ];
}
