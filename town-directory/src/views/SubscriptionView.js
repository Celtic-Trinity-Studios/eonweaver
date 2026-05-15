/**
 * Eon Weaver — Subscription & plans (visual tier matrix + includes).
 */
import { navigate } from '../router.js';
import { getState } from '../stores/appState.js';
import { apiGetSubscriptionCatalog } from '../api/subscription.js';
import { apiGetUsage } from '../api/settings.js';
import { TOKENS_PER_CREDIT, formatWalletTc, rawTokensToTc } from '../constants/credits.js';

const TIER_ORDER = ['free', 'apprentice', 'adventurer', 'guild_master', 'world_builder'];
const BILLING_CONTACT = 'support@eonscribe.com';

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function tierRank(id) {
  const i = TIER_ORDER.indexOf(id);
  return i >= 0 ? i : -1;
}

function fmtStorage(bytes) {
  const n = Number(bytes) || 0;
  if (n >= 1024 * 1024 * 1024) {
    const gb = n / (1024 * 1024 * 1024);
    return `${gb % 1 < 0.05 ? Math.round(gb) : gb.toFixed(1)} GB`;
  }
  return `${Math.round(n / (1024 * 1024))} MB`;
}

function qty(n) {
  return (Number(n) || 0) >= 999 ? 'Unlimited' : String(n);
}

function priceLabel(usd) {
  const p = Number(usd) || 0;
  if (p <= 0) return 'Free';
  return Number.isInteger(p) ? `$${p} / mo` : `$${p.toFixed(2)} / mo`;
}

function formatTokens(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(v);
}

/** Free tier: no monthly raw cap — wallet-only (starter ~1.5 EC). */
function monthlyAiCapDisplay(t) {
  const cap = Number(t.monthly_raw_token_cap) || 0;
  if (t.id === 'free' && cap <= 0) return 'Wallet only (no monthly cap)';
  return `~${formatWalletTc(rawTokensToTc(cap))} EC`;
}

function upgradeMailto(tierRow, username) {
  const plan = tierRow.label || tierRow.id;
  const subject = encodeURIComponent(`Eon Weaver upgrade — ${plan}`);
  const body = encodeURIComponent(
    `Hi,\n\nI'd like to upgrade to the ${plan} plan.\n\nAccount: ${username || '(your login)'}\n\nThanks!`
  );
  return `mailto:${BILLING_CONTACT}?subject=${subject}&body=${body}`;
}

function billingMailto(subjectText, username) {
  const subject = encodeURIComponent(subjectText);
  const body = encodeURIComponent(`Account: ${username || '(your login)'}\n\n`);
  return `mailto:${BILLING_CONTACT}?subject=${subject}&body=${body}`;
}

function renderTierCta(t, currentTierId, username) {
  if (t.id === currentTierId) {
    return '<button type="button" class="btn-secondary subscription-cta" disabled>Current plan</button>';
  }
  const cur = tierRank(currentTierId);
  const target = tierRank(t.id);
  if (target > cur) {
    return `<a class="btn-primary subscription-cta" href="${upgradeMailto(t, username)}">Request upgrade</a>`;
  }
  return `<a class="btn-secondary subscription-cta" href="${billingMailto(`Eon Weaver plan change — ${t.label || t.id}`, username)}" title="Checkout is not self-serve yet">Contact support</a>`;
}

function renderTierCards(catalog, currentTierId, username) {
  return catalog
    .map((t) => {
      const capDd = monthlyAiCapDisplay(t);
      const isCurrent = t.id === currentTierId;
      const lines = Array.isArray(t.includes) ? t.includes : [];
      const lis = lines.map((line) => `<li>${escHtml(line)}</li>`).join('');
      return `
      <article class="subscription-card${isCurrent ? ' subscription-card-current' : ''}" data-tier="${escHtml(t.id)}">
        <div class="subscription-card-head">
          <span class="tier-badge tier-${escHtml(t.id)}">${escHtml(t.label || t.id)}</span>
          ${isCurrent ? '<span class="subscription-current-pill">Your plan</span>' : ''}
        </div>
        <div class="subscription-card-price">${priceLabel(t.price_usd_month)}</div>
        <dl class="subscription-card-specs">
          <div><dt>Campaigns</dt><dd>${qty(t.max_campaigns)}</dd></div>
          <div><dt>Towns / campaign</dt><dd>${qty(t.max_towns_per_campaign)}</dd></div>
          <div><dt>Content files</dt><dd>${Number(t.content_max_files) || 0}</dd></div>
          <div><dt>Library storage</dt><dd>${fmtStorage(t.content_max_storage_bytes)}</dd></div>
          <div><dt>Max upload</dt><dd>${Math.round((Number(t.content_max_file_bytes) || 0) / (1024 * 1024))} MB</dd></div>
          <div><dt>Platform AI / mo (cap)</dt><dd title="Free: starter EC wallet only, no monthly ceiling. Paid: calendar-month raw-token ceiling on platform wallet; BYOK excluded.">${capDd}</dd></div>
        </dl>
        <h4 class="subscription-includes-title">Includes</h4>
        <ul class="subscription-includes-list">${lis}</ul>
        <div class="subscription-card-actions">
          ${renderTierCta(t, currentTierId, username)}
        </div>
      </article>`;
    })
    .join('');
}

function renderCompareTable(catalog) {
  const rows = catalog
    .map((t) => {
      const capDd = monthlyAiCapDisplay(t);
      return `<tr>
        <td><span class="tier-badge tier-${escHtml(t.id)}">${escHtml(t.label || t.id)}</span></td>
        <td>${priceLabel(t.price_usd_month)}</td>
        <td>${qty(t.max_campaigns)}</td>
        <td>${qty(t.max_towns_per_campaign)}</td>
        <td>${Number(t.content_max_files) || 0}</td>
        <td>${fmtStorage(t.content_max_storage_bytes)}</td>
        <td>${Math.round((Number(t.content_max_file_bytes) || 0) / (1024 * 1024))} MB</td>
        <td>${capDd}</td>
      </tr>`;
    })
    .join('');
  return `
    <table class="subscription-compare-table">
      <thead>
        <tr>
          <th>Tier</th>
          <th>Price</th>
          <th>Campaigns</th>
          <th>Towns / campaign</th>
          <th>Files</th>
          <th>Storage</th>
          <th>Max file</th>
          <th>Monthly AI cap</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderUsagePanel(usage) {
  if (!usage?.ok) {
    return '<p class="muted">Usage data unavailable.</p>';
  }

  const {
    tier,
    tier_label,
    tokens_used,
    token_limit,
    percentage,
    call_count,
    year_month,
    credit_balance,
    has_byok_key,
  } = usage;

  const walletLine = `<p class="subscription-usage-wallet">🪙 Wallet: <strong>${formatWalletTc(rawTokensToTc(credit_balance || 0))} EC</strong></p>`;

  if (has_byok_key) {
    return `
      <div class="usage-meter-card subscription-usage-card">
        <div class="usage-meter-header">
          <span class="usage-meter-title">Your usage (${escHtml(year_month || '')})</span>
          <span class="tier-badge tier-${escHtml(tier)}">${escHtml(tier_label || tier)}</span>
        </div>
        ${walletLine}
        <p class="muted" style="margin:0.5rem 0 0;font-size:0.85rem;line-height:1.45">
          BYOK active — platform monthly caps do not apply. ${formatTokens(tokens_used || 0)} tokens tracked this month (${(call_count || 0).toLocaleString()} calls).
        </p>
      </div>`;
  }

  if (!token_limit || token_limit <= 0) {
    return `
      <div class="usage-meter-card subscription-usage-card">
        <div class="usage-meter-header">
          <span class="usage-meter-title">Your usage (${escHtml(year_month || '')})</span>
          <span class="tier-badge tier-${escHtml(tier)}">${escHtml(tier_label || tier)}</span>
        </div>
        ${walletLine}
        <p class="muted" style="margin:0.5rem 0 0;font-size:0.85rem;line-height:1.45">
          ${tier === 'free'
            ? 'Free tier: no monthly platform cap — AI draws from your EC wallet until empty.'
            : 'No monthly raw-token ceiling on this plan — wallet limits apply.'}
          ${formatTokens(tokens_used || 0)} tokens used (${(call_count || 0).toLocaleString()} calls).
        </p>
      </div>`;
  }

  const pct = Math.min(100, Number(percentage) || 0);
  const barColor = pct >= 90 ? 'var(--danger)' : pct >= 70 ? 'var(--warning)' : 'var(--accent)';

  return `
    <div class="usage-meter-card subscription-usage-card">
      <div class="usage-meter-header">
        <span class="usage-meter-title">Your usage (${escHtml(year_month || '')})</span>
        <span class="tier-badge tier-${escHtml(tier)}">${escHtml(tier_label || tier)}</span>
      </div>
      ${walletLine}
      <div class="usage-bar-container" style="margin-top:0.75rem">
        <div class="usage-bar-track">
          <div class="usage-bar-fill" style="width:${pct}%;background:${barColor}"></div>
        </div>
        <div class="usage-bar-labels">
          <span>${formatTokens(tokens_used)} used</span>
          <span style="color:${barColor}">${pct}%</span>
          <span>${formatTokens(token_limit)} cap</span>
        </div>
      </div>
      <p class="muted" style="margin:0.5rem 0 0;font-size:0.8rem">${(call_count || 0).toLocaleString()} AI calls this month</p>
    </div>`;
}

function renderPlansBody({ catalog, tier, username, usage }) {
  if (!catalog.length) {
    return '<p class="muted">No tier data returned.</p>';
  }
  const tierLabel =
    (catalog.find((x) => x.id === tier) || {}).label || tier.replace(/_/g, ' ');
  const manageHref = billingMailto('Eon Weaver billing — cancel or change plan', username);

  return `
    <section class="subscription-section">
      <h2 class="subscription-section-title">Your account</h2>
      <p class="subscription-you">Signed in as <strong>${escHtml(username)}</strong> — active tier: <span class="tier-badge tier-${escHtml(tier)}">${escHtml(tierLabel)}</span></p>
      ${renderUsagePanel(usage)}
      <p class="subscription-billing-note">
        Self-serve checkout and billing portal are <strong>not wired yet</strong>.
        Use <strong>Request upgrade</strong> on a plan card, or
        <a href="${manageHref}">email ${escHtml(BILLING_CONTACT)}</a> to change or cancel.
        Add your OpenRouter key under <button type="button" class="btn-link subscription-inline-link" data-go="settings">Settings</button> for BYOK.
      </p>
    </section>
    <section class="subscription-section">
      <h2 class="subscription-section-title">Plans</h2>
      <div class="subscription-cards">
        ${renderTierCards(catalog, tier, username)}
      </div>
    </section>
    <section class="subscription-section">
      <h2 class="subscription-section-title">Comparison table</h2>
      <div class="subscription-table-wrap">
        ${renderCompareTable(catalog)}
      </div>
    </section>
    <section class="subscription-foot muted">
      <p><strong>BYOK:</strong> Add your own OpenRouter API key under Settings to skip the platform wallet and monthly EC ceiling on that usage.</p>
      <p><strong>Free tier:</strong> Simulation uses the same EC wallet rules as other AI (no separate paywall); paid tiers add a monthly token ceiling on top of EC.</p>
      <p>EC display uses ${TOKENS_PER_CREDIT.toLocaleString()} raw tokens = 1.00 EC (wallet stores raw tokens).</p>
    </section>`;
}

export default function SubscriptionView(container) {
  const state = getState();
  const username = state.user?.username || '';

  container.innerHTML = `
    <div class="view-subscription">
      <header class="view-header subscription-header">
        <div>
          <h1>Plans & subscription</h1>
          <p class="subscription-lead">Compare tiers, see your usage, and request upgrades. Checkout is assigned manually until billing is integrated.</p>
        </div>
        <div class="subscription-header-actions">
          <button type="button" class="btn-secondary" id="sub-settings-btn">Settings &amp; API usage</button>
          <button type="button" class="btn-secondary" id="sub-back-btn">Back to dashboard</button>
        </div>
      </header>

      <div id="subscription-body" class="subscription-body">
        <p class="muted">Loading plans…</p>
      </div>
    </div>`;

  container.querySelector('#sub-back-btn')?.addEventListener('click', () => navigate('dashboard'));
  container.querySelector('#sub-settings-btn')?.addEventListener('click', () => navigate('settings'));

  const body = container.querySelector('#subscription-body');

  async function loadPlans() {
    body.innerHTML = '<p class="muted">Loading plans…</p>';
    try {
      const [catalogRes, usageRes] = await Promise.all([
        apiGetSubscriptionCatalog(),
        apiGetUsage().catch(() => null),
      ]);
      const catalog = catalogRes.tier_catalog || [];
      const tier = catalogRes.tier || 'free';
      body.innerHTML = renderPlansBody({
        catalog,
        tier,
        username,
        usage: usageRes,
      });
      body.querySelector('[data-go="settings"]')?.addEventListener('click', () => navigate('settings'));
    } catch (err) {
      body.innerHTML = `
        <p class="subscription-error">Could not load plans: ${escHtml(err.message)}</p>
        <button type="button" class="btn-secondary" id="sub-retry-btn">Retry</button>`;
      body.querySelector('#sub-retry-btn')?.addEventListener('click', () => loadPlans());
    }
  }

  loadPlans();

  return () => {};
}
