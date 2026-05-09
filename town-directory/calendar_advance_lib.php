<?php
/**
 * Shared campaign calendar advancement (used by apply_simulation and advance_calendar).
 *
 * @return array{applied: array, debug_info: array}
 */
function ew_advance_campaign_calendar(int $uid, int $monthsElapsed, int $daysElapsed): array
{
    $applied = [];
    $debugInfo = [];

    if ($monthsElapsed <= 0 && $daysElapsed <= 0) {
        $debugInfo['calendar_skipped'] = 'months_elapsed=0 and days_elapsed=0';
        return ['applied' => $applied, 'debug_info' => $debugInfo];
    }

    $debugInfo['calendar_input'] = ['months_elapsed' => $monthsElapsed, 'days_elapsed' => $daysElapsed, 'uid' => $uid];

    $activeCampApply = query('SELECT id FROM campaigns WHERE user_id = ? AND is_active = 1 LIMIT 1', [$uid], 0);
    $campIdApply = $activeCampApply ? (int) $activeCampApply[0]['id'] : null;
    $debugInfo['calendar_campaign'] = $campIdApply;

    if ($campIdApply) {
        $cal = query('SELECT * FROM calendar WHERE user_id = ? AND campaign_id = ?', [$uid, $campIdApply]);
        if (!$cal) {
            $cal = query('SELECT * FROM calendar WHERE user_id = ? AND campaign_id IS NULL', [$uid]);
            if ($cal) {
                try {
                    execute('UPDATE calendar SET campaign_id = ? WHERE id = ?', [$campIdApply, $cal[0]['id']]);
                    $cal[0]['campaign_id'] = $campIdApply;
                    $debugInfo['calendar_migrated'] = true;
                } catch (Exception $e) {
                    $debugInfo['calendar_migrate_err'] = $e->getMessage();
                }
            }
        }
        // Legacy single-row rescue: when the legacy schema had PRIMARY KEY on user_id, there can
        // only be ONE calendar row per user. If that row's campaign_id is stale (different
        // campaign than active), reattach it to the active campaign so future lookups match.
        if (!$cal) {
            $allRows = query('SELECT * FROM calendar WHERE user_id = ? ORDER BY id ASC', [$uid]);
            if (count($allRows) === 1) {
                try {
                    execute('UPDATE calendar SET campaign_id = ? WHERE id = ?', [$campIdApply, $allRows[0]['id']]);
                    $allRows[0]['campaign_id'] = $campIdApply;
                    $cal = $allRows;
                    $debugInfo['calendar_orphan_migrated'] = true;
                } catch (Exception $e) {
                    $debugInfo['calendar_orphan_err'] = $e->getMessage();
                }
            }
        }
    } else {
        $cal = query('SELECT * FROM calendar WHERE user_id = ? AND campaign_id IS NULL', [$uid]);
        if (!$cal) {
            $cal = query('SELECT * FROM calendar WHERE user_id = ? ORDER BY id ASC LIMIT 1', [$uid]);
            if ($cal) {
                $debugInfo['calendar_no_active_campaign_using_existing'] = true;
            }
        }
    }
    $debugInfo['calendar_found'] = !empty($cal);
    $debugInfo['calendar_row_count'] = count($cal ?: []);

    if (!$cal) {
        try {
            execute(
                'INSERT IGNORE INTO calendar (user_id, campaign_id, current_year, current_month, current_day, era_name, months_per_year, month_names, days_per_month) VALUES (?, ?, 1490, 1, 1, ?, 12, ?, ?)',
                [$uid, $campIdApply, 'DR', '["Hammer","Alturiak","Ches","Tarsakh","Mirtul","Kythorn","Flamerule","Eleasis","Eleint","Marpenoth","Uktar","Nightal"]', '[30,30,30,30,30,30,30,30,30,30,30,30]']
            );
            $debugInfo['calendar_inserted'] = true;
        } catch (Exception $e) {
            $debugInfo['calendar_insert_err'] = $e->getMessage();
        }
        if ($campIdApply) {
            $cal = query('SELECT * FROM calendar WHERE user_id = ? AND campaign_id = ?', [$uid, $campIdApply]);
        } else {
            $cal = query('SELECT * FROM calendar WHERE user_id = ? AND campaign_id IS NULL', [$uid]);
        }
        $debugInfo['calendar_found_after_insert'] = !empty($cal);
    }

    if (!$cal) {
        $debugInfo['calendar_error'] = 'no_calendar_row';
        return ['applied' => $applied, 'debug_info' => $debugInfo];
    }

    $mpy = (int) ($cal[0]['months_per_year'] ?? 12);
    $year = (int) ($cal[0]['current_year'] ?? 1490);
    $month = (int) ($cal[0]['current_month'] ?? 1);
    $day = (int) ($cal[0]['current_day'] ?? 1);
    $debugInfo['calendar_before'] = ['year' => $year, 'month' => $month, 'day' => $day, 'mpy' => $mpy];

    $dpmRaw = $cal[0]['days_per_month'] ?? '30';
    $dpmDecoded = json_decode($dpmRaw, true);
    $daysPerMonthArr = is_array($dpmDecoded) ? $dpmDecoded : array_fill(0, $mpy, (int)($dpmRaw ?: 30));

    $month += $monthsElapsed;
    while ($month > $mpy) {
        $month -= $mpy;
        $year++;
    }

    if ($daysElapsed > 0) {
        $day += $daysElapsed;
        $maxDay = $daysPerMonthArr[$month - 1] ?? 30;
        while ($day > $maxDay) {
            $day -= $maxDay;
            $month++;
            if ($month > $mpy) {
                $month = 1;
                $year++;
            }
            $maxDay = $daysPerMonthArr[$month - 1] ?? 30;
        }
    }

    $maxDay = $daysPerMonthArr[$month - 1] ?? 30;
    if ($day > $maxDay) {
        $day = $maxDay;
    }
    if ($day < 1) {
        $day = 1;
    }

    $debugInfo['calendar_after'] = ['year' => $year, 'month' => $month, 'day' => $day];

    // Update by primary key so we never miss a row due to campaign_id / NULL mismatches.
    $calId = (int) ($cal[0]['id'] ?? 0);
    $debugInfo['calendar_row_id'] = $calId;
    if ($calId <= 0) {
        $debugInfo['calendar_error'] = 'invalid_calendar_id';
        return ['applied' => $applied, 'debug_info' => $debugInfo];
    }

    $rowsUpdated = execute(
        'UPDATE calendar SET current_year=?, current_month=?, current_day=? WHERE id=? AND user_id=?',
        [$year, $month, $day, $calId, $uid]
    );
    $debugInfo['calendar_rows_updated'] = $rowsUpdated;

    $mNames = json_decode($cal[0]['month_names'] ?? '[]', true) ?: [];
    $monthName = $mNames[$month - 1] ?? "Month $month";
    $applied['calendar'] = "Advanced to day $day of $monthName, year $year";
    $applied['calendar_date'] = [
        'month' => $month,
        'year' => $year,
        'day' => $day,
        'era' => trim($cal[0]['era_name'] ?? 'DR'),
        'month_name' => $monthName,
    ];

    if ($monthsElapsed > 0 && $campIdApply) {
        try {
            require_once __DIR__ . '/macro_framework_lib.php';
            ensureMacroFrameworkTables();
            $macroState = runMacroTicksForSimulatedMonths(
                $campIdApply,
                $monthsElapsed,
                'Campaign calendar advance'
            );
            $debugInfo['macro_tick_months'] = $monthsElapsed;
            $debugInfo['macro_state_after'] = $macroState;
        } catch (Exception $e) {
            $debugInfo['macro_tick_error'] = $e->getMessage();
        }
    }

    return ['applied' => $applied, 'debug_info' => $debugInfo];
}
