/**
 * Eon Weaver — Discord API (bug reports, etc.)
 */
import { apiFetch } from './client.js';

export function apiSubmitBugReport(title, description, steps, severity, page, browser) {
    return apiFetch('submit_bug_report', {
        method: 'POST',
        body: { title, description, steps, severity, page, browser },
    });
}
