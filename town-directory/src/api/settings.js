/**
 * Settings & Calendar API module
 */
import { apiFetch } from './client.js';

/* ── User Settings ─────────────────────────────────────── */
export function apiGetSettings() {
    return apiFetch('get_settings');
}

export function apiSaveSetting(key, value) {
    return apiFetch('save_settings', { method: 'POST', body: { key, value } });
}

/* ── Calendar ──────────────────────────────────────────── */
export function apiGetCalendar() {
    return apiFetch('get_calendar');
}

export function apiSaveCalendar(calendar) {
    return apiFetch('save_calendar', { method: 'POST', body: { calendar } });
}

/**
 * Format a calendar object to a readable string.
 */
export function calendarToString(cal) {
    if (!cal) return 'Unknown Date';
    const names = Array.isArray(cal.month_names) ? cal.month_names : [];
    const monthName = names[(cal.current_month - 1)] || `Month ${cal.current_month}`;
    const day = cal.current_day || 1;
    const era = cal.era_name || '';
    return `${day} ${monthName}, ${cal.current_year}${era ? ' ' + era : ''}`;
}
