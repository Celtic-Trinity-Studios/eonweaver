#!/usr/bin/env node
/**
 * Create Stripe Products + monthly Prices for Eon Weaver subscription tiers.
 *
 * Requires STRIPE_SECRET_KEY in the environment (or town-directory/.env.stripe).
 * Prints STRIPE_PRICE_IDS_JSON for config.php — does not write secrets to disk.
 *
 * Usage (from town-directory/):
 *   STRIPE_SECRET_KEY=sk_test_… npm run stripe:setup-products
 *   npm run stripe:setup-products -- --dry-run
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');

const TIERS = [
  { id: 'apprentice', label: 'Apprentice', usd: 5 },
  { id: 'adventurer', label: 'Adventurer', usd: 10 },
  { id: 'guild_master', label: 'Guild Master', usd: 20 },
  { id: 'world_builder', label: 'World Builder', usd: 40 },
];

function loadStripeKey() {
  if (process.env.STRIPE_SECRET_KEY?.trim()) {
    return process.env.STRIPE_SECRET_KEY.trim();
  }
  const envPath = path.join(root, '.env.stripe');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*STRIPE_SECRET_KEY\s*=\s*(.+)\s*$/);
      if (m) return m[1].trim().replace(/^['"]|['"]$/g, '');
    }
  }
  return '';
}

async function stripePost(secret, params) {
  const res = await fetch('https://api.stripe.com/v1' + params.path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2024-11-20.acacia',
    },
    body: new URLSearchParams(params.body).toString(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || res.statusText);
  }
  return data;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const secret = loadStripeKey();
  if (!secret && !dryRun) {
    console.error('Set STRIPE_SECRET_KEY or create town-directory/.env.stripe');
    process.exit(1);
  }

  const priceMap = {};
  for (const tier of TIERS) {
    const productName = `Eon Weaver — ${tier.label}`;
    if (dryRun) {
      console.log(`[dry-run] Would create product "${productName}" @ $${tier.usd}/mo`);
      priceMap[tier.id] = `price_DRY_RUN_${tier.id}`;
      continue;
    }
    const product = await stripePost(secret, {
      path: '/products',
      body: {
        name: productName,
        'metadata[tier_id]': tier.id,
        'metadata[app]': 'eon_weaver',
      },
    });
    const price = await stripePost(secret, {
      path: '/prices',
      body: {
        product: product.id,
        currency: 'usd',
        'recurring[interval]': 'month',
        unit_amount: String(tier.usd * 100),
        'metadata[tier_id]': tier.id,
      },
    });
    priceMap[tier.id] = price.id;
    console.log(`✓ ${tier.label}: ${price.id} ($${tier.usd}/mo)`);
  }

  const json = JSON.stringify(priceMap, null, 0);
  const keyHint = secret.startsWith('sk_')
    ? secret.slice(0, 7) + '…' + secret.slice(-4)
    : 'sk_…';
  console.log('\nPaste into config.php:\n');
  console.log(`define('STRIPE_SECRET_KEY', '${keyHint}'); // same key as in .env.stripe`);
  console.log("define('STRIPE_WEBHOOK_SECRET', 'whsec_…'); // from Stripe webhook endpoint");
  console.log(`define('STRIPE_PRICE_IDS_JSON', '${json}');`);
  console.log('\nWebhook URL: https://eonweaver.com/stripe_webhook.php');
  console.log('Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
