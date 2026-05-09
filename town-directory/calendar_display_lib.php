<?php
/**
 * Calendar display helpers: absolute day index (campaign epoch), lunar phase, decoded calendar rows.
 */

/** Epoch: Year 1, Month 1, Day 1 = absolute day 1. */
function ew_calendar_absolute_day(int $year, int $month1, int $day, array $dpm, int $mpy): int
{
    $mpy = max(1, $mpy);
    $total = 0;
    for ($y = 1; $y < $year; $y++) {
        for ($m = 0; $m < $mpy; $m++) {
            $total += (int) ($dpm[$m] ?? 30);
        }
    }
    for ($m = 0; $m < $month1 - 1; $m++) {
        $total += (int) ($dpm[$m] ?? 30);
    }
    $total += $day;
    return $total;
}

/**
 * @return array{phase_index:int,label:string,symbol:string,day_in_cycle:int,cycle_days:int}
 */
function ew_moon_phase_for_absolute_day(int $absDay, int $cycleDays = 28): array
{
    $cycleDays = max(4, min(64, $cycleDays));
    $pos = (($absDay - 1) % $cycleDays + $cycleDays) % $cycleDays;
    $phaseIndex = (int) floor($pos * 8 / $cycleDays) % 8;
    $labels = ['New', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full', 'Waning gibbous', 'Third quarter', 'Waning crescent'];
    $symbols = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];
    return [
        'phase_index' => $phaseIndex,
        'label' => $labels[$phaseIndex],
        'symbol' => $symbols[$phaseIndex],
        'day_in_cycle' => $pos + 1,
        'cycle_days' => $cycleDays,
    ];
}

/** Decode raw calendar DB row like api get_calendar. */
function ew_calendar_decode_calendar_array(array $cal): array
{
    $cal['month_names'] = json_decode($cal['month_names'] ?? '[]', true) ?? [];
    $dpmRaw = $cal['days_per_month'] ?? '30';
    $dpmDecoded = json_decode($dpmRaw, true);
    if (is_array($dpmDecoded)) {
        $cal['days_per_month'] = $dpmDecoded;
    } else {
        $dpmVal = (int) ($dpmRaw ?: 30);
        $mpy = (int) ($cal['months_per_year'] ?? 12);
        $cal['days_per_month'] = array_fill(0, $mpy, $dpmVal);
    }
    $defaultWeekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    $defaultWeekAbbrev = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    $dow = (int) ($cal['days_per_week'] ?? 7);
    $dow = max(1, min(14, $dow));
    $cal['days_per_week'] = $dow;
    $wn = json_decode($cal['weekday_names'] ?? '', true);
    $wa = json_decode($cal['weekday_abbrev'] ?? '', true);
    if (!is_array($wn)) {
        $wn = [];
    }
    if (!is_array($wa)) {
        $wa = [];
    }
    if (count($wn) === 0 && count($wa) === 0) {
        $wn = array_slice($defaultWeekNames, 0, min(7, $dow));
        $wa = array_slice($defaultWeekAbbrev, 0, min(7, $dow));
    }
    while (count($wn) < $dow) {
        $wn[] = 'Day ' . (count($wn) + 1);
    }
    while (count($wa) < $dow) {
        $wa[] = 'D' . (count($wa) + 1);
    }
    $cal['weekday_names'] = array_slice(array_values($wn), 0, $dow);
    $cal['weekday_abbrev'] = array_slice(array_values($wa), 0, $dow);
    return $cal;
}

/** Load decoded calendar for active campaign — mirrors api.php get_calendar resolution. */
function ew_calendar_load_for_user(int $uid): array
{
    $activeCamp = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
    $campId = $activeCamp ? (int) $activeCamp[0]['id'] : null;
    $rows = [];
    if ($campId) {
        $rows = query('SELECT * FROM calendar WHERE user_id = ? AND campaign_id = ?', [$uid, $campId], 0);
        if (empty($rows)) {
            $legacy = query('SELECT * FROM calendar WHERE user_id = ? AND campaign_id IS NULL LIMIT 1', [$uid], 0);
            if (!empty($legacy)) {
                try {
                    execute('UPDATE calendar SET campaign_id = ? WHERE id = ?', [$campId, (int) $legacy[0]['id']], 0);
                } catch (Exception $e) {
                    /* ignore */
                }
                $rows = query('SELECT * FROM calendar WHERE user_id = ? AND campaign_id = ?', [$uid, $campId], 0);
            }
        }
        if (empty($rows)) {
            $allRows = query('SELECT * FROM calendar WHERE user_id = ? ORDER BY id ASC', [$uid], 0);
            if (count($allRows) === 1) {
                try {
                    execute('UPDATE calendar SET campaign_id = ? WHERE id = ?', [$campId, (int) $allRows[0]['id']], 0);
                } catch (Exception $e) {
                    /* ignore */
                }
                $rows = query('SELECT * FROM calendar WHERE user_id = ? AND campaign_id = ?', [$uid, $campId], 0);
            }
        }
    } else {
        $rows = query('SELECT * FROM calendar WHERE user_id = ? AND campaign_id IS NULL', [$uid], 0);
        if (empty($rows)) {
            $rows = query('SELECT * FROM calendar WHERE user_id = ? ORDER BY id ASC LIMIT 1', [$uid], 0);
        }
    }
    $cal = $rows[0] ?? [
        'current_year' => 1490,
        'current_month' => 1,
        'current_day' => 1,
        'era_name' => 'DR',
        'months_per_year' => 12,
        'days_per_month' => '[30,30,30,30,30,30,30,30,30,30,30,30]',
        'month_names' => '["Hammer","Alturiak","Ches","Tarsakh","Mirtul","Kythorn","Flamerule","Eleasis","Eleint","Marpenoth","Uktar","Nightal"]',
        'days_per_week' => 7,
        'weekday_names' => null,
        'weekday_abbrev' => null,
    ];
    return ew_calendar_decode_calendar_array($cal);
}
