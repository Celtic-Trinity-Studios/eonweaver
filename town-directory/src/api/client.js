/**
 * Eon Weaver — Base API Client
 * Centralized fetch wrapper for all backend calls.
 */

/** Resolve API base to an absolute path so clean URLs like /dev/sunday/yart
 *  don't break relative fetch calls (they'd resolve to /dev/sunday/api.php). */
const _base = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
const API_BASE = `${_base}/api.php`;

export async function apiFetch(action, options = {}) {
    const method = options.method || 'GET';
    const params = options.params || {};
    const body = options.body || null;

    let url = `${API_BASE}?action=${action}`;
    for (const [k, v] of Object.entries(params)) {
        url += `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
    }

    const fetchOpts = { method, credentials: 'same-origin' };
    if (body) {
        fetchOpts.headers = { 'Content-Type': 'application/json' };
        fetchOpts.body = JSON.stringify(body);
    }

    const res = await fetch(url, fetchOpts);
    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        throw new Error(`Server error (${res.status}): ${text.substring(0, 200) || 'empty response'}`);
    }
    if (!res.ok || data.error) {
        throw new Error(data.error || `API error ${res.status}`);
    }
    return data;
}

/**
 * Simulation API helper — talks to simulate.php directly.
 */
const SIM_BASE = `${_base}/simulate.php`;

export async function simFetch(action, body = {}) {
    const url = `${SIM_BASE}?action=${action}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
    });
    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        const preview = text.slice(0, 300) || '(empty response)';
        throw new Error(`Sim parse error (HTTP ${res.status}, ${res.headers.get('content-type') || 'no content-type'}): ${preview}`);
    }
    if (!res.ok || data.error) {
        throw new Error(data.error || `Sim error ${res.status}: ${text.slice(0, 200)}`);
    }
    return data;
}
