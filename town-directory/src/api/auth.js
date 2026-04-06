/**
 * Auth API module
 */
import { apiFetch } from './client.js';

export function apiLogin(login, password) {
    return apiFetch('login', { method: 'POST', body: { login, password } });
}

export function apiRegister(username, email, password, beta_key) {
    return apiFetch('register', { method: 'POST', body: { username, email, password, beta_key } });
}

export function apiLogout() {
    return apiFetch('logout', { method: 'POST' });
}

export function apiGetCurrentUser() {
    return apiFetch('me');
}
