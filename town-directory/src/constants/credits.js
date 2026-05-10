/**
 * Eon Credits (TC) scale — must match AiCostConfirm / backend wallet storage.
 * Wallet `credit_balance` is stored as RAW LLM tokens; divide by this for TC display.
 * Wallet debits use fixed raw amounts from pricing.php (see helpers.php ew_track_ai_fixed_billing).
 */
export const TOKENS_PER_CREDIT = 200_000;

export function rawTokensToTc(raw) {
  return (Number(raw) || 0) / TOKENS_PER_CREDIT;
}

/** Main wallet number next to 🪙 — TC, not raw tokens. */
export function formatWalletTc(tc) {
  const n = Number(tc) || 0;
  if (n <= 0) return '0.000';
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (n >= 100) return n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (n >= 1) return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  return n.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 4 });
}

/** Subline “used this month” — same TC units as wallet. */
export function formatMonthlyTcUsed(tc) {
  const n = Number(tc) || 0;
  if (n <= 0) return '0';
  if (n >= 10000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (n >= 100) return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (n >= 10) return n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  return n.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 4 });
}
