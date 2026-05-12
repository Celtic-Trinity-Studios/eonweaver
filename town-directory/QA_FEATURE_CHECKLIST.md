# Eon Weaver — Master QA / feature verification checklist

Use this document as a **working todo**: check boxes when verified, note failures and dates in the **Notes** column. Pair it with **`WANT_NEED_BACKLOG.md`** — when a test reveals a gap, log it there instead of bloating this file.

**Related:** `Features_List.md` (product inventory), `PROJECT_PHASES.md` (meaning of “phase” in code), `AGENTS.md` (local dev, builds, deploy).

---

## How to use this checklist

1. **Environment:** Record which build you tested (`npm run dev` + PHP, or staging `worldscribe.online`, or production `eonscribe.com`). AI-dependent tests need a **known-good API** (`config.php` / OpenRouter).
2. **Prerequisites:** Logged-in user, at least one **campaign** and one **town** with a few **characters** unless the row says otherwise.
3. **Per row:** Complete **every** numbered step under **Test procedure** before marking done. Use **Notes** for anomalies, browser, and ticket links.
4. **IDs:** Stable codes (e.g. `SIM-02`) so `WANT_NEED_BACKLOG.md` can reference them.

**What counts as done:** Mark **`[x]`** only after **you** (or QA) has **executed** the procedure in the stated surface/environment—browser clicks, API smoke, DB step, deploy smoke, etc. Source-code review, grep, or assistant walkthroughs **do not** satisfy the checklist; those belong in implementation notes or PRs. **`[ ]`** means “not yet run” or “needs retest after a relevant change.”

### Systematic pass: website first, then features

Use this order so you **finish the website** (hosting, auth, shell, staging smoke) before you invest in deep feature QA.

**How to move in chat:** Say which **phase** and **ID** you are on or finishing (e.g. “Phase A done through GLB-03” or “Starting AUTH-01”). When something fails, log it in **`WANT_NEED_BACKLOG.md`** with the same ID.

**Cursor todo list (session helper):** In the IDE Todo panel, add a *small* set of items for your *current phase only* (for example the next three IDs in Phase A). Those todos are for **steering the session**; the **`[ ]` / `[x]`** cells in the tables below remain the **sign-off record**.

### New chat: the user only says “next step”

Use **`QA_PROGRESS.md`** as the handoff cursor: it lists **`ORDERED_IDS`** (same order as the phases above) and **`Last completed ID`**. The agent finds the next ID after that marker whose row is still **`[ ]`** here, then pastes that row’s **Test procedure** into the reply. After a real pass, the human says **`done <ID>`** (or edits **`Last completed ID`** in `QA_PROGRESS.md`) and **`next step`** again. See also **`AGENTS.md`** (repo root) for one-line pointer.

#### Phase A — Website & platform (do this block before “features”)

Goal: staging (or prod) loads, auth works, build/deploy path is trusted, one happy-path smoke passes.

| Step | IDs (see tables below) | What you are proving |
|------|-------------------------|-------------------------|
| A1 | `GLB-*` | App shell, router, deep links, bug-report path |
| A2 | `AUTH-*` | Register, login/logout, session/`me`, resend verify, usage/tier awareness |
| A3 | `INF-*` | Dev stack, **correct** prod build, DB/setup on staging clone, **INF-04** post-deploy smoke |
| A4 | `DSH-01`, `HLP-01`, `SET-01`, `SET-02` | Dashboard empty state, help matches routes, settings save, subscription/catalog |
| A5 | `INTG-01` | Integrations page (if webhooks are part of launch) |

**Website-done gate:** complete **INF-04** on **worldscribe.online** (or your production URL) after a deploy — login → open town → one sim or scribe call — then treat Phase A as closed.

#### Phase B — Core campaign loop

| Step | IDs | What you are proving |
|------|-----|----------------------|
| B1 | `CMP-*`, `TWN-*` | Campaigns and towns CRUD + meta + moves |
| B2 | `ROST-*` | Roster UX, filters, graveyard, demographics targets |
| B3 | `CAL-*` | Calendar |
| B4 | `MAP-*`, `STATS-*` | World map + town stats (if in your first-ship bar) |

#### Phase C — Simulation & characters (AI-heavy)

`INT-*` → `SIM-*` → `WSIM-*` → `MACRO-*` → `CHS-*` → `EQ-*` / `SPL-*` / `EFX-*` / `LVL-*`

#### Phase D — Settlement depth & table

`BLD-*` → `SOC-*` → `FAC-*` / `INC-*` / `REP-*` → `PRT-*` → `ENC-*`

#### Phase E — Content, SRD, library, portal, export

`SCR-*` → `SRD-*` → `HB-*` → `LIB-*` → `WIKI-*` → `PLR-*` → `VTT-*`

#### Phase F — Admin & LLM extras

`ADM-*` → `LLM-*`

---

## Discord: all QA in the `bug-reports` forum

### Why nothing appears (read this first)

Two different things get confused:

1. **This Markdown file does not post to Discord.** The QA tables are only in the repo. Anything in the **bug-reports** forum has to be created by you: **New Post** per section (or a bot you add later). There is nothing to “see” until those posts exist.

2. **In-app “Report Bug”** goes through the server (`submit_bug_report` → `discord.php`). If those messages never show in the forum, it is a **webhook** problem, not the checklist:
   - Create or move the **bugs webhook** onto the **bug-reports forum channel** (Integrations → Webhooks on that channel). A webhook created on an old text channel does not follow when you convert or replace the channel.
   - If Discord **requires a tag** on every forum post, the API must send tag IDs. In `config.php` add:  
     `define('DISCORD_BUG_FORUM_APPLIED_TAGS', 'YOUR_TAG_SNOWFLAKE');`  
     (comma-separated if multiple). See `config.example.php` comments. Get IDs from Server Settings → Forums → **bug-reports** → Tags (Developer Mode: copy ID).
   - Submit a report from the app: if it fails, the toast/API error often includes Discord’s HTTP body (e.g. invalid tag, wrong channel).

Your **Labs → bug-reports** channel is a **Forum** (speech-bubble icon), not a classic `#` text channel.

### Automated seed (one forum post per section)

From `town-directory/`:

```bash
node scripts/post_qa_forum_threads.mjs --dry-run              # list only, no Discord calls
node scripts/post_qa_forum_threads.mjs --purge-first          # bot deletes every thread in bug-reports forum, then seeds
node scripts/post_qa_forum_threads.mjs                        # seed only (leaves existing posts)
```

`--purge-first` uses **Discord bot** credentials from `town-directory/.env.discord` (`DISCORD_TOKEN` or `DISCORD_BOT_TOKEN`) plus `DISCORD_GUILD_ID` (or a single-guild bot). Optional: `DISCORD_BUG_FORUM_CHANNEL_ID` if the forum is not named `bug-reports`. **Purges all threads in that forum** (including normal 🐛 bug reports), then creates the 33 QA posts.

- Reads the **mapping table** below (same titles as manual posts). Thread titles are prefixed with **📋** so they are easy to tell from **🐛** in-app bug reports.
- Each post includes **Discord embed fields**: one field per checklist row (**ID** as the field name; **feature**, **surface**, **Steps**, **Notes** in the body, truncated to Discord limits). Sections with more than 25 rows use multiple embeds (max 10 embeds per message).
- Uses `discord.php` for webhook URL, forum tags, and webhook display name/avatar (or set `DISCORD_WEBHOOK_BUGS` in the environment if `discord.php` is not on disk).
- **Re-running creates duplicate threads.** Delete old **📋 QA —** forum posts in Discord first, then run the script again, or only use `--dry-run`.
- Optional: `APP_PUBLIC_URL` env (e.g. `https://worldscribe.online`) for the default spider avatar URL in the script.

**Verify in-app bug reports still work:** open the staging or production site → sidebar **Report Bug** → submit a short test; you should see a **🐛** forum post and a success toast.

### Manual QA posts (organization)

Each checklist **section** below = **one forum post** you create in **bug-reports**:

1. Open **bug-reports** under **Labs**.  
2. Click **New Post** (or equivalent).  
3. Set the **post title** to the name from the mapping table (e.g. `QA — Auth & account`).  
4. Paste the **first message template** into the post body; add forum **tags** if your channel requires them (e.g. `qa`, `testing`).  
5. Use **comments on that post** for every finding for that section (start with **SIM-03** — description, etc.).

Each successful in-app report creates a **new forum post** (thread) in **bug-reports**—look at the top of the post list, not inside an old empty post.

**First message template (post body for each new forum post)**

```text
QA checklist section: <SECTION TITLE>
ID prefix(es): <e.g. AUTH-*>
Markdown: town-directory/QA_FEATURE_CHECKLIST.md (same heading)

How to post here
- One comment per issue, start with the checklist ID: **AUTH-02** — short description
- Add: environment (local / worldscribe / eonscribe), browser, screenshots if UI
- When fixed: reply with **done** + PR or commit hash if you want traceability
```

**When verifying a row:** add a **comment** on the forum post for that section only. Include the checklist ID so search works.

**Section → forum post title (suggested) → ID prefixes**

| Suggested forum post title | Checklist section in this file | ID prefixes |
|------------------------|--------------------------------|-------------|
| QA — Global | Global / cross-cutting | `GLB-*` |
| QA — Auth & account | Authentication and account | `AUTH-*` |
| QA — Campaigns & towns | Campaigns and towns | `CMP-*`, `TWN-*` |
| QA — Roster & demographics | Town roster and demographics | `ROST-*` |
| QA — Intake & roster AI | Two-phase intake and roster AI | `INT-*` (intake; not Integrations) |
| QA — Monthly simulation | Monthly / single-town simulation | `SIM-*` |
| QA — World simulation | World simulation | `WSIM-*` |
| QA — Macro simulation | Macro simulation | `MACRO-*` |
| QA — Calendar | Calendar | `CAL-*` |
| QA — Character sheet | Character sheet (core) | `CHS-*` |
| QA — Equipment | Equipment and inventory | `EQ-*` |
| QA — Spells | Spells (DB Phase 1 + UI) | `SPL-*` |
| QA — Effects & level history | Active effects, level history | `EFX-*`, `LVL-*` |
| QA — Buildings | Buildings and housing | `BLD-*` |
| QA — Social | Social: relationships, family, memories | `SOC-*` |
| QA — Factions & incidents | Factions, incidents, PC reputation | `FAC-*`, `INC-*`, `REP-*` |
| QA — Party | Party | `PRT-*` |
| QA — Encounters | Encounters | `ENC-*` |
| QA — AI Scribe | AI Scribe | `SCR-*` |
| QA — SRD browser | SRD browser | `SRD-*` |
| QA — Homebrew | Homebrew | `HB-*` |
| QA — Content library | Content library | `LIB-*` |
| QA — Wiki | Wiki | `WIKI-*` |
| QA — Player portal | Player portal | `PLR-*` |
| QA — VTT export | VTT export | `VTT-*` |
| QA — Integrations | Integrations | `INTG-*` |
| QA — Map & town stats | World map, town stats | `MAP-*`, `STATS-*` |
| QA — Dashboard | Dashboard | `DSH-*` |
| QA — Settings & subscription | Settings | `SET-*` |
| QA — Help | Help | `HLP-*` |
| QA — Admin | Admin | `ADM-*` |
| QA — LLM utilities | LLM utilities | `LLM-*` |
| QA — Infrastructure | Infrastructure | `INF-*` |

The headings **How to use this checklist** and **Suggested run order** are meta — no separate bug-reports forum post required unless you want one for process discussion.

---

## Global / cross-cutting

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | GLB-01 | App loads and router works | Any route | 1) Open base URL (respect `BASE_URL`: `/` vs `/dev/`). 2) Confirm shell renders (nav, content area). 3) Open `dashboard`, `settings`, `help` from nav. 4) Hard refresh on a deep link (e.g. `/dev/town/123`); confirm no blank page and auth gate behaves. | |
| [ ] | GLB-02 | Clean URL campaign/town slugs | `router.js` / town | 1) Navigate to `/dev/{campaignSlug}/{townSlug}` (slugified names). 2) Confirm resolve to `town/{id}` without duplicate history entries. 3) Invalid slug: confirm graceful empty or error state. | |
| [ ] | GLB-03 | Visit metrics ping | Network tab | 1) Open DevTools Network. 2) Change routes. 3) Confirm anonymous `ping_visit` (or equivalent) does not break navigation on failure. | |
| [ ] | GLB-04 | Bug report submission | Settings or Help (wherever wired) | 1) Open bug report UI. 2) Submit with title only / full form. 3) Confirm success message or clear validation errors. 4) If Discord webhook configured, confirm receipt (optional). | API: `submit_bug_report` |

---

## Authentication and account

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | AUTH-01 | Register | Auth UI | 1) Register new account with valid email/password. 2) Confirm validation on weak/duplicate email. 3) Confirm post-register state (verify email message if enabled). | `register` |
| [ ] | AUTH-02 | Login / logout | Auth UI | 1) Login with good credentials. 2) Wrong password: clear error, no session. 3) Logout: session cleared; protected routes redirect. | `login`, `logout` |
| [ ] | AUTH-03 | Session / `me` | App bootstrap | 1) Reload while logged in. 2) Confirm user context and campaign load. 3) Expired/invalid cookie: graceful re-login. | `me` |
| [ ] | AUTH-04 | Resend verification | Auth UI | If email verification enabled: trigger resend; confirm rate limiting or success messaging. | `resend_verification` |
| [ ] | AUTH-05 | Usage / subscription awareness | Settings, Subscription | 1) Call or view usage where exposed. 2) Confirm limits match tier (tokens, storage if shown). | `get_usage`, `subscription_catalog` |

---

## Campaigns and towns

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | CMP-01 | Campaign CRUD | Settings / campaign picker | 1) Create campaign. 2) Rename/update. 3) Switch active campaign. 4) Delete (confirm data scope / warnings). | `campaigns`, `create_campaign`, `update_campaign`, `delete_campaign`, `switch_campaign` |
| [ ] | TWN-01 | Town CRUD | Dashboard, Town | 1) Create town. 2) Update name/settings. 3) Delete town (confirm characters handled per product rules). | `towns`, `create_town`, `update_town`, `delete_town` |
| [ ] | TWN-02 | Purge population | Town / admin flow | 1) Purge population on a test town. 2) Confirm roster empty; no orphaned UI state. | `purge_population` |
| [ ] | TWN-03 | Town meta | Town settings / meta UI | 1) Read meta. 2) Save key/value. 3) Reload; persist. | `town_meta`, `save_meta` |
| [ ] | TWN-04 | Move character between towns | Town / roster (if exposed) | 1) Move living character between two owned towns. 2) Confirm source/target rosters. 3) Reject invalid (same town, not owner, dead character). | `move_character` |

---

## Town roster and demographics

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | ROST-01 | Roster list and filters | `TownView` | 1) Open town roster. 2) Race filter: list subset and counts consistent. 3) Class filter same. 4) Clear filters. | |
| [ ] | ROST-02 | Living / Graveyard tabs | `TownView` | 1) Living tab: no deceased. 2) Graveyard: deceased only. 3) After sim death (or manual status): character appears in correct tab. | |
| [ ] | ROST-03 | Target demographics grid | Town settings | 1) Set non-default race percentages (sum guidance per UI). 2) Run intake or simulation that adds population. 3) Observe distribution drift toward targets (may take multiple runs). | |
| [ ] | ROST-04 | Level constraint for new gens | Town settings + intake | 1) Ensure default L1 clamp on. 2) Generate new character; verify level/XP. 3) Override path (if any): verify honored. | |
| [ ] | ROST-05 | Max creature CR | Town settings + creature intake | 1) Set CR ceiling. 2) Attempt creature above ceiling: blocked or filtered. 3) At or below: succeeds. | |

---

## Two-phase intake and roster AI

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | INT-01 | Intake Phase 1 roster stub | `simulate.php` intake | 1) Run `intake_roster` (or UI equivalent). 2) Confirm lightweight roster returned quickly. 3) Names unique vs existing roster. | `intake_roster` |
| [ ] | INT-02 | Intake Phase 2 flesh | Intake UI | 1) Flesh stubs. 2) Full stats/backstory on characters. 3) Partial failure: error handling and retry. | `intake_flesh` |
| [ ] | INT-03 | Intake custom | Intake UI | 1) Custom intake path per UI. 2) Validate required fields. 3) Result appears in roster. | `intake_custom` |
| [ ] | INT-04 | SRD creature intake | Intake / creature UI | 1) Import SRD creature. 2) Stats and HP variance plausible. 3) Unique name variant. | `intake_creature` |
| [ ] | INT-05 | Server-side stat generation | Character sheet / API | 1) New character from intake. 2) Spot-check AC, saves, HP vs 3.5 rules. 3) Compare to expanded “AI Character Data” on Background tab. | |
| [ ] | INT-06 | Dual-tier AI routing | Logs / network | 1) Trigger “simple” vs “narrative” actions. 2) Confirm appropriate models (if visible in logs/config). 3) Failure fallback message. | |

---

## Monthly / single-town simulation (`SimulationView`, `simulate.php`)

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | SIM-01 | Plan simulation | Simulation UI | 1) Request plan for month. 2) Structured output renders. 3) Errors surfaced if LLM fails. | `plan_simulation` |
| [ ] | SIM-02 | Run simulation (propose changes) | Simulation UI | 1) Run simulation for 1 month. 2) Review JSON/summary. 3) No DB apply until confirmed. | `run_simulation` |
| [ ] | SIM-03 | Apply simulation | Simulation UI | 1) Apply approved diff. 2) DB updates: characters, history, calendar as designed. 3) Idempotence or duplicate warning if user double-applies. | `apply_simulation` |
| [ ] | SIM-04 | 0-month / time freeze | Simulation / town | 1) Run scenario that adds arrivals without advancing calendar (per product behavior). 2) Calendar unchanged. | |
| [ ] | SIM-05 | Advance calendar | Simulation / API | 1) Advance calendar standalone if exposed. 2) Month/year/era fields consistent. | `advance_calendar` |
| [ ] | SIM-06 | Simulate chunk / multi-month | Simulation UI | 1) Multi-month batch with conservative token settings. 2) Progress UI. 3) Cancel or error mid-run: state recoverable. | `simulate_chunk` |
| [ ] | SIM-07 | Tabbed results | Results panel | 1) After sim: open Summary, Arrivals, Births, Deaths, Social, Progression, Roles, Buildings. 2) Data matches applied run. | |
| [ ] | SIM-08 | Campaign rules injection | Settings + sim | 1) Set XP scaling, death thresholds, relationship speeds, conflict frequency. 2) Run sim; prompts or outcomes reflect settings (spot-check logs or behavior). | `get_campaign_rules`, `save_campaign_rules` |

---

## World simulation (`WorldSimulateView`)

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | WSIM-01 | Multi-town world pipeline | World sim UI | 1) Select multiple towns. 2) Run pipeline stages (intake/planning/monthly/movement/completion per UI). 3) Final state consistent across towns. | |
| [ ] | WSIM-02 | World plan / roadmap | World sim | 1) Generate plan for multi-town month. 2) Inspect per-town roadmap. 3) Failures isolated. | |
| [ ] | WSIM-03 | Single-town / world simulate endpoints | Backend | If UI exposes: `simulate_single_town` / `simulate_world` smoke test via UI or controlled API. | |

---

## Macro simulation (`MacroSimulationView`, `api.php`)

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | MACRO-01 | Framework overview | Macro UI | 1) Load overview. 2) `macro_state`, `town_metrics`, `phase_roadmap` render without error. | `macro_framework_overview` |
| [ ] | MACRO-02 | Macro month tick | Macro UI | 1) Run `macro_simulate_month` for 1+ months. 2) State updates; note persists. 3) Metrics change plausibly. | |
| [ ] | MACRO-03 | Town metrics API | Macro / dashboard | 1) `macro_town_metrics` after tick. 2) Compare to UI cards. | |
| [ ] | MACRO-04 | Trade routes / enrichment | If UI exposes | 1) Ensure trade routes created when needed. 2) No SQL errors on fresh campaign. | `ensureMacroTradeRoutes` path |

---

## Calendar (`CalendarView`)

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | CAL-01 | Get / save calendar | Calendar UI | 1) Load calendar. 2) Edit month names, month lengths, era. 3) Save and reload. | `get_calendar`, `save_calendar` |
| [ ] | CAL-02 | Weather / moon | Calendar UI | 1) Request `calendar_weather_moon`. 2) Display matches API. 3) Regenerate idempotence. | |
| [ ] | CAL-03 | Campaign description / lore | Settings | 1) Save long campaign description. 2) New character backstory references tone/setting (manual spot-check after intake). | |

---

## Character sheet (core)

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | CHS-01 | Character CRUD | Town / sheet | 1) Open character. 2) Edit fields; save. 3) Reload persistence. 4) Delete test character (if allowed). | `characters`, `save_character`, `delete_character` |
| [ ] | CHS-02 | Tab navigation | Character sheet | 1) Core Stats, Inventory & Feats, Spells, Social, Background. 2) State preserved when switching tabs. | |
| [ ] | CHS-03 | HP tracker | Core stats | 1) Click HP; damage and heal. 2) Full heal. 3) Current HP never exceeds max incorrectly. | |
| [ ] | CHS-04 | Roll log / weapon rolls | Inventory / combat UI | 1) Roll from weapon entry. 2) Attack and damage appear in log. 3) Edge case: no weapon. | |
| [ ] | CHS-05 | PDF export | Character sheet | 1) Export PDF. 2) Open file; layout and text complete. | |
| [ ] | CHS-06 | Portrait upload | Character sheet | 1) Upload image within size limits. 2) Preview. 3) Replace portrait. | |
| [ ] | CHS-07 | AI Character Data (debug JSON) | Background tab | 1) Expand AI data. 2) JSON readable. 3) Matches visible stats after intake. | |
| [ ] | CHS-08 | AI level up | Character sheet | 1) Trigger AI level up. 2) Modal summary. 3) Level, HP, saves, feats, skills updated per 3.5. | `simulate.php` `level_up` / UI |
| [ ] | CHS-09 | Quick level up | If exposed | 1) Quick path vs full AI path differences documented by behavior. | `quick_level_up` |
| [ ] | CHS-10 | Structured apply level up | Sheet / API | 1) Apply level via structured path if UI uses `apply_level_up`. 2) XP floor for new level. 3) Level history row. | `apply_level_up` |
| [ ] | CHS-11 | XP log | Character sheet | 1) Run monthly sim with XP. 2) Open XP history. 3) Reasons and dates present. | `get_xp_log` |
| [ ] | CHS-12 | Add combat XP | Sheet / API | 1) Add manual combat XP. 2) Totals update. | `add_combat_xp` |

---

## Equipment and inventory

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | EQ-01 | Equipment load/save | Inventory tab | 1) `get_equipment`. 2) Add item; save. 3) Equip/unequip. 4) Delete item. | `get_equipment`, `save_equipment`, `delete_equipment`, `equip_item`, `unequip_item` |
| [ ] | EQ-02 | Starting gold / auto gear | New character flow | 1) New L1 character with class gold. 2) Auto-purchase populates inventory. | |
| [ ] | EQ-03 | Character history | Sheet | 1) `history` / `save_history` if used in UI. 2) Narrative entries persist. | `history`, `save_history` |

---

## Spells (DB Phase 1 + UI)

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | SPL-01 | Spells known | Spells tab | 1) Add known spell. 2) Delete. 3) SRD link or tooltip if present. | `get_spells_known`, `save_spell_known`, `delete_spell_known` |
| [ ] | SPL-02 | Prepared spells | Spells tab | 1) Prepare spell; slot level. 2) Mark used / rest all. 3) Clear prepared. | `get_spells_prepared`, `save_spell_prepared`, `mark_spell_used`, `rest_all_spells`, `clear_spells_prepared` |
| [ ] | SPL-03 | Spellbook | Spells tab | 1) Add spellbook entry. 2) Pages/source. 3) Delete entry. | `get_spellbook`, `save_spellbook_entry`, `delete_spellbook_entry` |
| [ ] | SPL-04 | Spell search / filters | Spells tab | 1) Filter by level, class, school. 2) Tooltips on hover (school, CT, range, duration, description). | |
| [ ] | SPL-05 | Auto-assign spells | Sheet or bulk | 1) `auto_assign_spells` on one character. 2) `auto_assign_spells_town` on town. 3) Verify class-appropriate picks. | |

---

## Active effects, level history

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | EFX-01 | Active effects CRUD | Character sheet (if surfaced) | 1) Add effect with JSON modifiers. 2) List. 3) Delete; clear all. | `get_active_effects`, `save_active_effect`, `delete_active_effect`, `clear_active_effects` |
| [ ] | LVL-01 | Level history | Sheet | 1) After level-up, `get_level_history` shows row per level. 2) Multiclass notes. | `get_level_history`, `save_level_history` |

---

## Buildings and housing

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | BLD-01 | Buildings CRUD | Town / building UI | 1) List buildings. 2) Create/edit/delete. | `get_buildings`, `save_building`, `delete_building` |
| [ ] | BLD-02 | Rooms | Building UI | 1) Rooms under building. 2) Save/delete room. | `get_rooms`, `save_room`, `delete_room` |
| [ ] | BLD-03 | Assign character to building | UI | 1) Assign resident. 2) Character shows link to housing. | `assign_character_building` |

---

## Social: relationships, family, memories

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | SOC-01 | Social aggregate | Social tab / API | 1) `get_social_data` loads. 2) UI renders relationships + memories summary. | `get_social_data` |
| [ ] | SOC-02 | Relationships | Social UI | 1) Create relationship between two NPCs. 2) Edit type/disposition. 3) Delete. | `save_relationship`, `delete_relationship` |
| [ ] | SOC-03 | Family tree | Social UI | 1) Load tree. 2) Add link. 3) Remove link; graph consistent. | `get_family_tree`, `save_family_link`, `delete_family_link` |
| [ ] | SOC-04 | Memories | Social UI | 1) Add memory with sentiment/importance. 2) Edit. 3) Delete. | `get_memories`, `save_memory`, `delete_memory` |

---

## Factions, incidents, PC reputation

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | FAC-01 | Factions CRUD | Factions UI | 1) Create faction with leader. 2) Members add/remove. 3) Inter-faction relations. 4) Delete faction cleans members/relations. | `get_factions`, `save_faction`, `delete_faction`, `save_faction_member`, `delete_faction_member`, `save_faction_relation`, `delete_faction_relation` |
| [ ] | INC-01 | Incidents | Incidents UI | 1) Create incident. 2) Participants and clues. 3) Delete incident cascades. | `get_incidents`, `save_incident`, `delete_incident`, participants/clues cases |
| [ ] | REP-01 | PC reputation | UI | 1) Add reputation row (PC name, disposition). 2) Edit. 3) Delete. | `get_reputation`, `save_reputation`, `delete_reputation` |

---

## Party

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | PRT-01 | Party roster | `PartyView` | 1) `get_party`. 2) Add/remove member. 3) Reflects character list. | `get_party`, `add_party_member`, `remove_party_member` |
| [ ] | PRT-02 | Party base / portal linkage | API | If used: `get_party_base` returns expected structure for player portal. | `get_party_base` |

---

## Encounters

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | ENC-01 | Encounter groups | `EncounterView` | 1) Create/rename/delete group. | `create_encounter_group`, `rename_encounter_group`, `delete_encounter_group` |
| [ ] | ENC-02 | Encounters CRUD | Encounter UI | 1) Create encounter. 2) Open detail. 3) Update participants. 4) Delete. | `get_encounters`, `create_encounter`, `get_encounter`, `update_encounter`, `delete_encounter`, participants |
| [ ] | ENC-03 | Ensure encounter town | Flow | 1) First encounter on fresh campaign creates backing town if applicable. | `ensure_encounter_town` |
| [ ] | ENC-04 | LLM helpers | Simulate | Smoke: `generate_random_encounter`, `generate_loot`, `generate_magic_shop` from UI if present. | |

---

## AI Scribe (`ScribeView`, `scribe_actions.php`)

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | SCR-01 | Scribe generate | Scribe UI | 1) Pick generator type (lore/quest/etc.). 2) Generate with world context. 3) Validate empty input handling. | `scribe_generate` |
| [ ] | SCR-02 | Scribe save / history | Scribe UI | 1) Save output. 2) History lists prior items. 3) Delete entry. | `scribe_save`, `scribe_get_history`, `scribe_delete` |
| [ ] | SCR-03 | Scribe library | Scribe UI | 1) `scribe_library_get` populates library. 2) Reuse snippet if supported. | |

---

## SRD browser (`SrdBrowserView`)

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | SRD-01 | Each SRD table loads | SRD UI | For races, classes, skills, feats, equipment, spells, monsters, powers, domains, items: 1) List loads. 2) Search/filter. 3) Detail view opens (`*_detail` / progression). | `srd_*` cases in `api.php` |
| [ ] | SRD-02 | Monster detail | SRD | 1) Open monster. 2) Stat block readable. | `srd_monster_detail` |

---

## Homebrew (`HomebrewView`)

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | HB-01 | Custom races/classes/feats/spells/equipment/monsters | Homebrew UI | 1) Create each type. 2) Edit. 3) Delete via `delete_custom_content`. 4) Verify campaign scoping. | `list_custom_*`, `save_custom_*`, `delete_custom_content` |

---

## Content library (`ContentLibraryView`)

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | LIB-01 | User files list / limits | Content library | 1) `get_user_files`: list, storage used vs tier limit. 2) Upload within limit. 3) Over limit: clear error. | |
| [ ] | LIB-02 | Delete file | Content library | 1) Delete file. 2) Disk row removed; URL 404s. | `delete_user_file` |

---

## Wiki (`WikiView`)

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | WIKI-01 | Wiki CRUD / links | Wiki UI | 1) Create article. 2) Edit markdown/text. 3) Search. 4) Delete if supported. | (Wiki API cases in `api.php` / wiki module) |

---

## Player portal (`PlayerPortalView`)

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | PLR-01 | Player-facing views | Player portal | 1) Access as player role (if distinct). 2) Confirm DM-only actions hidden. 3) Read-only data correct. | |

---

## VTT export (`VttExportView`)

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | VTT-01 | Export formats | VTT export | 1) Export party or encounter. 2) Import into target VTT (if applicable) or validate JSON structure. | |

---

## Integrations (`IntegrationsView`)

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | INTG-01 | Integration settings | Integrations | 1) Save keys/toggles (no secrets in console). 2) Test connection buttons if any. | |

---

## World map (`WorldMapView`), town stats (`TownStatsView`)

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | MAP-01 | World map render | World map | 1) Multiple towns: markers or list. 2) Navigation to town. | |
| [ ] | STATS-01 | Town stats aggregates | Town stats | 1) Population breakdowns. 2) Refresh after sim. | |

---

## Dashboard (`DashboardView`)

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | DSH-01 | Dashboard cards / shortcuts | Dashboard | 1) Campaign summary. 2) Links to town/sim/settings work. 3) Empty state for new user. | |

---

## Settings (`SettingsView`)

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | SET-01 | App settings persistence | Settings | 1) `get_settings` / `save_settings` round-trip. 2) Theme or toggles if present. | |
| [ ] | SET-02 | Subscription / billing | `SubscriptionView` | 1) Catalog loads. 2) Upgrade path (test mode). 3) Cancel/portal links if integrated. | |

---

## Help (`HelpView`)

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | HLP-01 | Help content accuracy | Help | 1) Sections match current routes (see `main.js` `registerRoute` list). 2) Links work. | |

---

## Admin (`AdminDashboardView`)

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | ADM-01 | Admin gate | Admin route | 1) Non-admin user: access denied. 2) Admin: dashboard loads. | |
| [ ] | ADM-02 | Metrics / overview / members | Admin | 1) `admin_metrics` charts/tables. 2) `admin_overview` counts. 3) `admin_members` list. 4) `admin_update_member` smoke (test account only). | |
| [ ] | ADM-03 | Meta / abuse tools | Admin | Any `admin_*` meta keys: verify audit trail and confirmation modals. | |

---

## LLM utilities (simulate.php extras)

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | LLM-01 | Portrait prompt | UI if exposed | `generate_portrait_prompt` returns usable prompt. | |
| [ ] | LLM-02 | Weather generation | Calendar / sim | `generate_weather` plausible output. | |

---

## Infrastructure (deploy / DB)

| Done | ID | Feature | Primary surface | Test procedure | Notes |
|------|-----|---------|-----------------|----------------|-------|
| [ ] | INF-01 | Local dev stack | Dev machine | 1) `npm run dev` + `php -S localhost:8080`. 2) API proxy works. | `AGENTS.md` |
| [ ] | INF-02 | Production build | CI / local | 1) `npm run build` produces `live/` with correct `BASE_URL`. 2) Wrong build not used for prod FTP. | `vite.config.live.js` |
| [ ] | INF-03 | DB migrations | Staging | 1) Run `setup_mysql.php` on copy of prod schema. 2) No destructive surprises; Phase 1 tables created. | `setup_mysql.php` |
| [ ] | INF-04 | Post-deploy smoke | Staging/prod | 1) Login. 2) Open town. 3) One sim or scribe call. | **FTP 2026-05-11:** worldscribe.online (live + PHP). Run smoke when convenient. |

---

## Suggested run order (first pass)

Use **Systematic pass: website first, then features** (under *How to use this checklist*) as the master sequence. Short mnemonic:

1. **Phase A** — `GLB-*` → `AUTH-*` → `INF-*` → thin shell (`DSH`, `HLP`, `SET`, optional `INTG`) until **INF-04** passes on staging.  
2. **Phase B** — `CMP`/`TWN`/`ROST` → `CAL` → `MAP`/`STATS`.  
3. **Phases C–F** — simulation, sheets, world depth, content, admin — in the order listed there.

---

*Document version: 2026-05-11 (systematic phases added). Update rows when routes or API names change.*
