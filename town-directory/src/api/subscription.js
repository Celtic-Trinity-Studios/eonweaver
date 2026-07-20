/**
 * Subscription tiers — catalog, Stripe checkout, billing portal.
 */
import { apiFetch } from './client.js';

export function apiGetSubscriptionCatalog() {
  return apiFetch('subscription_catalog', { method: 'POST', body: {} });
}

export function apiBillingCheckout(tierId) {
  return apiFetch('billing_checkout', { method: 'POST', body: { tier: tierId } });
}

export function apiBillingPortal() {
  return apiFetch('billing_portal', { method: 'POST', body: {} });
}
