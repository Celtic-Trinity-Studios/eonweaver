/**
 * Eon Weaver — Subscription & plans (visual tier matrix + includes).
 */
import { navigate } from '../router.js';
import { getState } from '../stores/appState.js';
import { apiGetSubscriptionCatalog } from '../api/subscription.js';
import { TOKENS_PER_CREDIT, formatWalletTc, rawTokensToTc } from '../constants/credits.js';

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

/** Free tier: no monthly raw cap — wallet-only (starter ~1.5 EC). */
function monthlyAiCapDisplay(t) {
  const cap = Number(t.monthly_raw_token_cap) || 0;
  if (t.id === 'free' && cap <= 0) return 'Wallet only (no monthly cap)';
  return `~${formatWalletTc(rawTokensToTc(cap))} EC`;
}

function renderTierCards(catalog, currentTierId) {
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

export default function SubscriptionView(container) {
  const state = getState();
  const username = state.user?.username || '';

  container.innerHTML = `
    <div class="view-subscription">
      <header class="view-header subscription-header">
        <div>
          <h1>Plans & subscription</h1>
          <p class="subscription-lead">Plans, quotas, what’s included, and monthly platform AI allowances load from the server. Checkout is not wired yet—tiers are assigned manually or by admin.</p>
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

  apiGetSubscriptionCatalog()
    .then((res) => {
      const catalog = res.tier_catalog || [];
      const tier = res.tier || 'free';
      if (!catalog.length) {
        body.innerHTML = '<p class="muted">No tier data returned.</p>';
        return;
      }
      const tierLabel =
        (catalog.find((x) => x.id === tier) || {}).label ||
        tier.replace(/_/g, ' ');
      body.innerHTML = `
        <section class="subscription-section">
          <p class="subscription-you">Signed in as <strong>${escHtml(username)}</strong> — active tier: <span class="tier-badge tier-${escHtml(tier)}">${escHtml(tierLabel)}</span></p>
          <div class="subscription-cards">
            ${renderTierCards(catalog, tier)}
          </div>
        </section>
        <section class="subscription-section">
          <h2>Comparison table</h2>
          <div class="subscription-table-wrap">
            ${renderCompareTable(catalog)}
          </div>
        </section>
        <section class="subscription-foot muted">
          <p><strong>BYOK:</strong> Add your own OpenRouter API key under Settings to skip the platform wallet and monthly EC ceiling on that usage.</p>
          <p><strong>Free tier:</strong> Simulation uses the same EC wallet rules as other AI (no separate paywall); paid tiers add a monthly token ceiling on top of EC.</p>
          <p>EC display uses ${TOKENS_PER_CREDIT.toLocaleString()} raw tokens = 1.00 EC (wallet stores raw tokens).</p>
        </section>`;
    })
    .catch((err) => {
      body.innerHTML = `<p class="subscription-error">Could not load plans: ${escHtml(err.message)}</p>`;
    });

  return () => {};
}
