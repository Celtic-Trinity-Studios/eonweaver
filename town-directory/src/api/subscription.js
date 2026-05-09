/**
 * Subscription tiers — catalog for Plans page (auth required).
 */
import { apiFetch } from './client.js';

export function apiGetSubscriptionCatalog() {
  return apiFetch('subscription_catalog', { method: 'POST', body: {} });
}
