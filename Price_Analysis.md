# Eon Weaver — Price & economics analysis

> AI cost assumptions, competitor context, subscription tiers, **Eon Credits (EC)** / raw-token wallet behavior, and sustainability notes.  
> **Source of truth for live numbers:** `town-directory/tier_limits.php`, `town-directory/tier_economics.php`, `town-directory/tier_policy.php`, `town-directory/helpers.php` (`ew_track_ai_fixed_billing` / intake wallet helpers), `town-directory/pricing.php`, and `town-directory/src/constants/credits.js` / `pricing.js`.

---

## 1. AI stack and models

All OpenRouter chat traffic uses models chosen in **`config.php`** (see **`town-directory/config.example.php`**). Defaults in the example config:

| Role | Constant | Example model id |
|------|----------|-------------------|
| Default / fallback | `OPENROUTER_MODEL` | `google/gemini-2.5-flash` |
| “Smart” (story, single-town sim, world sim, etc.) | `OPENROUTER_MODEL_SMART` | `google/gemini-2.5-flash` |
| Cheaper structured calls | `OPENROUTER_MODEL_CHEAP` | `google/gemini-2.5-flash-lite` |

Chunked town simulation (`simulate.php`): **story** uses the smart model; **population**, **character_build**, **social**, and **stats** use the cheap model, each with **`max_tokens` 2048** (plus other code paths with different ceilings for planner, intake, legacy branches—see repo for exact call sites).

All player-facing AI uses the **platform OpenRouter key** in `config.php` and debits the user's **EC wallet**.

**Pricing $/M:** OpenRouter’s per-model input/output rates change; use [OpenRouter model pages](https://openrouter.ai/models) for current $/M before updating internal cost spreadsheets. The sections below use **order-of-magnitude** examples, not a guaranteed quote.

---

## 2. Eon Credits (EC) and raw tokens (what actually runs today)

### Display vs storage

- **`users.credit_balance`** is stored as **raw LLM tokens** (integer).
- **Displayed EC** = `credit_balance ÷ TOKENS_PER_CREDIT` with **`TOKENS_PER_CREDIT = 200_000`** (`town-directory/src/constants/credits.js`, optional PHP `TOKENS_PER_CREDIT` in `config.php`).
- **Wallet deductions** for AI features use **fixed raw-token prices** from `pricing.php` (exact debit per action); OpenRouter `usage` is still logged for analytics. Display uses `formatWalletTc` / `TOKENS_PER_CREDIT` without per-call bucket rounding.

### Monthly credit grant (per tier)

Usage is still summed in **`user_token_usage`** by calendar month (`year_month`) for the usage bar. **`ew_monthly_raw_cap_for_tier()`** is the monthly raw-token **grant** seeded into `credit_balance` on subscribe, upgrade, and renewal. It does **not** stop AI calls. Calls run while `credit_balance` is above zero, including a balance saved on a higher plan after a drop to Free. **Zero** means no monthly grant (wallet-only—**Free** defaults to **0**). Override the grant size in MySQL **`site_settings`** as **`token_limit_{tier}`** (non-negative integer).

**Default grants (no DB override)** come from **`tier_economics.php`**: **Apprentice** uses list price × **`EW_MONTHLY_CAP_ARPU_FRACTION`** (default **0.45**) ÷ **`EW_EC_MAINTAINER_COST_USD`** (default **0.15**) × **`TOKENS_PER_CREDIT`** (default **200_000**). **Adventurer / Guild Master / World Builder** use fixed monthly EC grants (**40 / 85 / 150** EC) × TC. **Free** has **no** monthly grant (**0**); platform AI uses whatever is already in the wallet, including the **starter ~1.5 EC**.

| Tier id | Default monthly raw-token grant | ≈ EC/mo (÷ 200,000) | Implied max variable @ $0.15/EC |
|---------|----------------------------------|---------------------|----------------------------------|
| `free` | 0 (no monthly grant) | — | wallet-only @ ~1.5 EC starter |
| `apprentice` | 3,000,000 | 15.0 | ~$2.25 (= 45% of $5 list) |
| `adventurer` | 8,000,000 | 40 | ~$6.00 (fixed grant) |
| `guild_master` | 17,000,000 | 85 | ~$12.75 (fixed grant) |
| `world_builder` | 30,000,000 | 150 | ~$22.50 (fixed grant) |

Retail top-up anchors (e.g. **US$0.22 per 1.5 EC**) are a separate consumer story—**maintainer** economics for caps should follow **your** measured $/EC and desired ARPU fraction, then re-run or adjust **`site_settings`** on existing hosts if you already seeded old limits.

### Gating rules

- **Empty wallet** (`credit_balance <= 0`) → platform AI blocked. Manual towns, campaigns, rosters, and edits stay available.
- **Monthly grant** does not block. A balance saved on a higher plan still spends after a move to Free.
- **Towns, campaigns, and roster size** are not capped by tier.

---

## 3. Subscription tiers (campaigns, towns, content) — current defaults

Non-AI limits come from **`ew_tier_default_limits_by_id()`** in `tier_limits.php`. Monthly AI caps are in §2.

| Tier | Price (USD/mo) | Campaigns, towns, roster, file count | Library storage |
|------|----------------|------------------------------------------|-----------------|
| Free | $0 | Not capped | 20 MB |
| Apprentice | $5 | Not capped | 50 MB |
| Adventurer | $10 | Not capped | 100 MB |
| Guild Master | $20 | Not capped | 500 MB |
| World Builder | $40 | Not capped | 2 GB |

The Settings UI and the **Plans** app route (`/subscription` when logged in with a campaign) load the same catalog from the API (`subscription_catalog` or `campaigns` → `ew_tier_public_catalog()` plus monthly raw cap → ≈ EC) and list **per-tier includes** from `ew_tier_included_feature_bullets()` as `tier_catalog[].includes`. **Billing integration** for Stripe (or similar) is not assumed wired; tiers are still set manually / by admin in production unless you add checkout.

### 3.1 What each subscription includes (product)

**Every tier**

- Campaigns, towns, roster size, and content-library **file count** are not capped. Library **storage** from the table above is enforced on upload. A single file can use whatever storage is left.
- **SRD** rules reference (edition follows the active campaign).
- **Towns:** roster, relationships, buildings, town history, **in-game calendar**, campaign rules & lore.
- **Wiki, Scribe, homebrew**, world map, trade routes, calendar tooling, and **exports** where enabled in the deployed build.
- **Platform AI:** draws **Eon Credits** from `credit_balance` (stored as raw tokens) and stops when that balance is empty. The monthly figure in §2 is a **grant**, not a ceiling.

**Free ($0)**

- Same manual play as paid plans (towns, campaigns, rosters, and AI features that the wallet can pay for).
- Starter **~1.5 EC** after email verification. No monthly grant. A balance saved on a paid plan still spends.

**Apprentice ($5), Adventurer ($10), Guild Master ($20), World Builder ($40)**

- Everything in **Every tier**, plus a larger content library and a monthly credit grant (§2).
- **AI town and multi-town world simulation** spend the same wallet as other AI calls.

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

**Positioning:** $5–12/mo is the hobbyist band; continuous **living town** simulation plus roster tooling is still relatively rare—price against value and your **EC + cap** safety rail, not only raw API fractions. Feature-surface gaps vs WorldSmith-style campaign managers (sessions, invites, battlemaps, etc.) are listed in `town-directory/CAMPAIGN_MANAGER_ROADMAP.md`, not priced here.

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
