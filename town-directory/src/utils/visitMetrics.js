/**
 * Lightweight pageview ping wrapper.
 * Dedupes per route per browser session so SPA reroutes don't inflate counts.
 */
import { apiPingVisit } from '../api/client.js';

const SESSION_KEY = 'ew_pinged_routes_v1';

function pinged() {
    try {
        return new Set(JSON.parse(sessionStorage.getItem(SESSION_KEY) || '[]'));
    } catch {
        return new Set();
    }
}

function remember(set) {
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify([...set]));
    } catch { /* private mode etc. */ }
}

export function pingVisit(route) {
    const r = (route || 'unknown').toString().toLowerCase().slice(0, 64);
    const seen = pinged();
    if (seen.has(r)) return;
    seen.add(r);
    remember(seen);
    apiPingVisit(r);
}
