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
    if (options.cache) {
        fetchOpts.cache = options.cache;
    }
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
 * Anonymous server-side metrics ping. Best-effort, never throws.
 * Deduped per (route, session) by metrics.js to avoid double-counting SPA reroutes.
 */
export function apiPingVisit(route, referrer) {
    try {
        const url = `${API_BASE}?action=ping_visit`;
        const body = JSON.stringify({ route, referrer: referrer || document.referrer || '' });
        if (navigator.sendBeacon) {
            navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
        } else {
            fetch(url, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body,
                keepalive: true,
            }).catch(() => { /* swallow */ });
        }
    } catch (e) { /* swallow */ }
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
    const ct = res.headers.get('content-type') || '';
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        const status = res.status;
        const looksHtml = /<html[\s>]/i.test(text) || text.trimStart().startsWith('<!DOCTYPE');
        // 502/504/524: proxy/CDN gave up before PHP returned JSON (common with long LLM calls).
        if (looksHtml || !ct.includes('json')) {
            if (status === 504 || status === 502 || status === 524) {
                throw new Error(
                    `Gateway timeout (${status}): The host or CDN stopped waiting before simulate.php finished, so the browser got an HTML error page instead of JSON. Raise nginx/Apache proxy or FastCGI timeouts above your longest OpenRouter call (often 120–180s+), or relax CDN limits for POSTs to simulate.php.`
                );
            }
        }
        const preview = text.slice(0, 300) || '(empty response)';
        throw new Error(`Sim parse error (HTTP ${status}, ${ct || 'no content-type'}): ${preview}`);
    }
    if (!res.ok || data.error) {
        throw new Error(data.error || `Sim error ${res.status}: ${text.slice(0, 200)}`);
    }
    return data;
}
