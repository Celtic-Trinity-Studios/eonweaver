/**
 * Auth API module
 */
import { apiFetch } from './client.js';

export function apiLogin(login, password) {
    return apiFetch('login', { method: 'POST', body: { login, password } });
}

export function apiRegister(username, email, password) {
    return apiFetch('register', { method: 'POST', body: { username, email, password } });
}

export function apiLogout() {
    return apiFetch('logout', { method: 'POST' });
}

export function apiGetCurrentUser() {
    return apiFetch('me');
}

export function apiResendVerification(email) {
    return apiFetch('resend_verification', { method: 'POST', body: { email } });
}
