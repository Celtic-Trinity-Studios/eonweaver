/**
 * Admin API module — admin-only endpoints
 */
import { apiFetch } from './client.js';

export function apiAdminOverview() {
    return apiFetch('admin_overview');
}

export function apiAdminMembers() {
    return apiFetch('admin_members');
}

export function apiAdminTokenUsage() {
    return apiFetch('admin_token_usage');
}
