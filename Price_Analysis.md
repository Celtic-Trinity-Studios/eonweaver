# Eon Weaver — Price & economics analysis

> AI cost assumptions, competitor context, subscription tiers, **Eon Credits (EC)** / raw-token wallet behavior, and sustainability notes.  
> **Source of truth for live numbers:** `town-directory/tier_limits.php`, `town-directory/tier_economics.php`, `town-directory/tier_policy.php`, `town-directory/helpers.php` (`trackTokenUsage`), and `town-directory/src/constants/credits.js`.

---

## 1. AI stack and models

All OpenRouter chat traffic uses models chosen in **`config.php`** (see **`town-directory/config.example.php`**). Defaults in the example config:

| Role | Constant | Example model id |
|------|----------|-------------------|
| Default / fallback | `OPENROUTER_MODEL` | `google/gemini-2.5-flash` |
| “Smart” (story, single-town sim, world sim, etc.) | `OPENROUTER_MODEL_SMART` | `google/gemini-2.5-flash` |
| Cheaper structured calls | `OPENROUTER_MODEL_CHEAP` | `google/gemini-2.5-flash-lite` |

Chunked town simulation (`simulate.php`): **story** uses the smart model; **population**, **character_build**, **social**, and **stats** use the cheap model, each with **`max_tokens` 2048** (plus other code paths with different ceilings for planner, intake, legacy branches—see repo for exact call sites).

**BYOK:** If the user sets their own OpenRouter key in Settings, the platform does **not** deduct from `credit_balance` and monthly EC caps do not apply to that usage.

**Pricing $/M:** OpenRouter’s per-model input/output rates change; use [OpenRouter model pages](https://openrouter.ai/models) for current $/M before updating internal cost spreadsheets. The sections below use **order-of-magnitude** examples, not a guaranteed quote.

---

## 2. Eon Credits (EC) and raw tokens (what actually runs today)

### Display vs storage

- **`users.credit_balance`** is stored as **raw LLM tokens** (integer).
- **Displayed EC** = `credit_balance ÷ TOKENS_PER_CREDIT` with **`TOKENS_PER_CREDIT = 200_000`** (`town-directory/src/constants/credits.js`, optional PHP `TOKENS_PER_CREDIT` in `config.php`).
- **Wallet deductions** round usage **up** to **0.01 EC** buckets (2000 raw tokens per bucket at default TC) so the balance stays aligned with fine-grained UI (`helpers.php` → `trackTokenUsage()`).

### Monthly platform ceiling (per tier)

Usage is summed in **`user_token_usage`** by calendar month (`year_month`). On the **platform wallet**, **`ew_monthly_raw_cap_for_tier()`** is the monthly raw-token ceiling when that value is **greater than zero**; **zero** means no monthly ceiling (wallet-only—**Free** defaults to **0**). Override in MySQL **`site_settings`** as **`token_limit_{tier}`** (non-negative integer).

**Default caps (no DB override)** come from **`tier_economics.php`**: **Apprentice** uses list price × **`EW_MONTHLY_CAP_ARPU_FRACTION`** (default **0.45**) ÷ **`EW_EC_MAINTAINER_COST_USD`** (default **0.15**) × **`TOKENS_PER_CREDIT`** (default **200_000**). **Adventurer / Guild Master / World Builder** use fixed monthly EC allowances (**40 / 85 / 150** EC) × TC. **Free** has **no** monthly raw cap (**0**); platform AI uses the **starter ~1.5 EC** wallet only until empty or BYOK.

| Tier id | Default monthly raw-token cap | ≈ EC/mo (÷ 200,000) | Implied max variable @ $0.15/EC |
|---------|-------------------------------|---------------------|----------------------------------|
| `free` | 0 (no monthly cap) | — | wallet-only @ ~1.5 EC starter |
| `apprentice` | 3,000,000 | 15.0 | ~$2.25 (= 45% of $5 list) |
| `adventurer` | 8,000,000 | 40 | ~$6.00 (fixed cap) |
| `guild_master` | 17,000,000 | 85 | ~$12.75 (fixed cap) |
| `world_builder` | 30,000,000 | 150 | ~$22.50 (fixed cap) |

Retail top-up anchors (e.g. **US$0.22 per 1.5 EC**) are a separate consumer story—**maintainer** economics for caps should follow **your** measured $/EC and desired ARPU fraction, then re-run or adjust **`site_settings`** on existing hosts if you already seeded old limits.

### Gating rules

- **Empty wallet** (`credit_balance <= 0`) → platform-wallet AI blocked (unless BYOK).
- **Over monthly cap** → blocked until next calendar month, upgrade, top-up (if you allow), or BYOK.
- **Free tier:** large **town / world AI simulation** is not included (`tier_policy.php` → `ew_require_non_free_for_major_ai_simulation`). Free demo towns are capped at **`FREE_TIER_MAX_RESIDENTS`** (default **15** in `tier_policy.php`).

---

## 3. Subscription tiers (campaigns, towns, content) — current defaults

Non-AI limits come from **`ew_tier_default_limits_by_id()`** in `tier_limits.php`. Monthly AI caps are in §2.

| Tier | Price (USD/mo) | Max campaigns | Max towns / campaign | Content library caps (files / storage) |
|------|----------------|---------------|------------------------|------------------------------------------|
| Free | $0 | 1 | 3 | 10 files, 20 MB total (per row defaults) |
| Apprentice | $5 | 2 | 4 | 25 files, 50 MB |
| Adventurer | $10 | 3 | 5 | 50 files, 100 MB |
| Guild Master | $20 | 10 | 10 | 200 files, 500 MB |
| World Builder | $40 | 999 | 999 | 9999 files, 2 GB |

The Settings UI and the **Plans** app route (`/subscription` when logged in with a campaign) load the same catalog from the API (`subscription_catalog` or `campaigns` → `ew_tier_public_catalog()` plus monthly raw cap → ≈ EC) and list **per-tier includes** from `ew_tier_included_feature_bullets()` as `tier_catalog[].includes`. **Billing integration** for Stripe (or similar) is not assumed wired; tiers are still set manually / by admin in production unless you add checkout.

### 3.1 What each subscription includes (product)

**Every tier**

- Campaign / town / content **limits** from the table above (enforced in `tier_limits.php` + upload paths).
- **SRD** rules reference (edition follows the active campaign).
- **Towns:** roster, relationships, buildings, town history, **in-game calendar**, campaign rules & lore.
- **Wiki, Scribe, homebrew**, world map, trade routes, calendar tooling, and **exports** where enabled in the deployed build.
- **Platform AI:** draws **Eon Credits** from `credit_balance` (stored as raw tokens) and counts toward a **calendar-month raw-token ceiling** per tier (§2), unless the account uses **BYOK** (own OpenRouter key in Settings), which skips the platform wallet and that ceiling.

**Free ($0)**

- Same core app surfaces as above within the **smallest** quotas.
- **No** AI **town** or **multi-town world simulation** on the free demo tier (`tier_policy.php`); users may still use other AI features that respect the **EC wallet** (no monthly cap on Free) or attach **BYOK**.
- **Resident cap** per town: `FREE_TIER_MAX_RESIDENTS` (default **15**).

**Apprentice ($5), Adventurer ($10), Guild Master ($20), World Builder ($40)**

- Everything in **Every tier**, with **higher** campaign, town, library, and monthly AI ceilings per row.
- **AI town and multi-town world simulation** on the platform wallet (still subject to **EC balance + monthly cap**, or unconstrained on your side with **BYOK**).

---

## 4. Illustrative API cost (order of magnitude)

Each run sends roster + rules + SRD context; cost scales with **input size** and **output length**. Older tables in this file assumed a single Flash price for everything; today **Flash + Flash-Lite** mix and different **`max_tokens`** per endpoint change the curve.

Use this only for **rough** margin math; reconcile against **OpenRouter usage logs** and **`user_token_usage`** for real averages.

- **Chunked month per town:** on the order of a few **tenths of a cent to a few cents** USD per simulated month for typical rosters, before retail markup.
- **Intake / Scribe / weather / level-up:** smaller calls; total depends on batch sizes and retries.

---

## 5. Competitor pricing (unchanged gist)

| Product | Free tier | Entry | Mid | Top | AI? |
|---------|-----------|-------|-----|-----|-----|
| WorldAnvil | ✅ limited | ~$5/mo | ~$12/mo | ~$25/mo | ❌ |
| Worldsmith | trial | ~$5/mo | ~$15/mo | — | ✅ credits |
| LitRPG Adventures | ❌ | low $/mo packs | — | lifetime options | ✅ |
| AI Game Master | ✅ throttled | ~$15/mo | — | higher tiers | ✅ |
| Foundry VTT | purchase | — | — | — | ❌ core |

**Positioning:** $5–12/mo is the hobbyist band; continuous **living town** simulation plus roster tooling is still relatively rare—price against value and your **EC + cap** safety rail, not only raw API fractions.

---

## 6. Margin analysis (high level)

Platform margin for paid tiers depends on:

1. **Actual raw tokens** per active user (sim frequency, roster size, world sim).
2. **Retail price** vs **your effective $/M** after OpenRouter + any provider discounts.
3. **EC top-up** and **monthly caps** preventing a single account from burning unlimited platform keys.

Older “worst-case per tier” dollar tables assumed **unlimited sims** and old tier names; those are retired here until you refresh them from production aggregates. **Default caps** tie full-burn variable cost to **EW_MONTHLY_CAP_ARPU_FRACTION × list ARPU** at **EW_EC_MAINTAINER_COST_USD** per displayed EC (see §2)—tighten the fraction (e.g. 0.30) or raise list price if you need more headroom for Stripe, hosting, and support.

---

## 7. Sustainability — AI endowment (optional narrative)

If you still like the **“interest pays free-tier AI”** story for Kickstarter or patrons, the structure in the previous version of this doc still applies: park a principal in low-risk yield, use **only yield** toward a **fixed monthly** free-user AI budget. Size the principal from **measured** `user_token_usage` on free accounts, not from the retired static tables.

---

## 8. Kickstarter-style rewards (product-agnostic)

Backer tiers (names, pledge levels, “X months of Guild Master”) can still follow §3 price points: **$5 / $10 / $20 / $40** monthly anchors plus optional lifetime SKUs with **strict quantity caps** and a clear ToS cap on abuse.

---

## 9. Summary (current model)

```
┌─────────────────────────────────────────────────────────────────┐
│  Product: Eon Weaver                                            │
│  Wallet: raw tokens in DB; UI EC = raw ÷ 200,000                │
│  Deductions: rounded up to 0.01 EC buckets                      │
│  Monthly limit: per-tier raw cap (+ site_settings overrides)   │
│  BYOK: user key → no platform wallet charge or monthly cap      │
│  Free: demo population cap; major AI sim not on free tier       │
│  Tiers: free, apprentice, adventurer, guild_master, world_builder│
│  Code refs: tier_limits.php, tier_economics.php, helpers.php    │
└─────────────────────────────────────────────────────────────────┘
```

### Action items (refresh vs legacy list)

1. ~~Per-user usage tracking~~ — **`user_token_usage`** + wallet in **`helpers.php`**.
2. ~~Tier defaults in code~~ — **`tier_limits.php`** / **`tier_economics.php`**; keep **`Price_Analysis.md`** in sync when you change them.
3. **OpenRouter billing alerts** — still recommended in ops.
4. **Recompute §4–§6** with 30/90-day production token averages when you have data.
5. **Checkout** — wire Stripe (or similar) to tier ids above; keep **`token_limit_{tier}`** admin overrides documented for support.
