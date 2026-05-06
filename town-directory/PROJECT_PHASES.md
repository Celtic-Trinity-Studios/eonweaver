# Eon Weaver / Ashenholm — phased features (repo reference)

The codebase uses **“Phase”** in several **different meanings**. This sheet lines them up so planning and deploys stay consistent.

## 1. Town intake — two-phase AI character generation

| Phase | API action(s) | Where | Purpose |
|-------|----------------|-------|---------|
| **Phase 1** | `intake_roster`, `intake_creature`, `intake_custom` (partial paths) | `intake_actions.php` (via `simulate.php`) | One (or scoped) AI call builds a lightweight roster (“stubs”). |
| **Phase 2** | `intake_flesh` | Same | Each stub gets full D&D stats, equipment narrative, etc. |

User-facing flow often shows steps like “Step 1: Creating roster…” then fleshing out.

## 2. AI Scribe — “Phase 3”

| Label in code | API action(s) | Where |
|----------------|---------------|-------|
| **Phase 3** (comments) | `scribe_generate`, `scribe_save`, `scribe_get_history` | `simulate.php` → `scribe_actions.php` |

Frontend: `src/api/scribe.js`, `ScribeView.js`. Lore/quests/items/traps-style generators with world context.

## 3. Character sheet / DB — “Phase 1” (spellcasting & progression)

comments in **`setup_mysql.php`** and **`api.php`** refer to **Phase 1** as a **database + API tranche**:

- Spellcasting tables and behavior  
- Active effects / conditions  
- Multiclass / level history  
- Structured level-up paths  

This is **not** the same numbering as intake Phase 1–2 or Scribe Phase 3.

## 4. World simulation — progress “phases” (UI)

`WorldSimulateView.js` (and Help copy) describe **pipeline stages** such as intake, planning, monthly simulation, movement, completion. These are **UX/progress labels**, not the same as intake or Scribe phases above.

## 5. Infra: dev vs live on WorldScribe (from `Features_List.md`)

| Deployment | Typical URL segment | Frontend `base` | Build |
|------------|---------------------|-------------------|--------|
| **Live / root** (current default for FTP test deploy) | `https://worldscribe.online/` | `/` | `npm run build` → `live/` |
| **Dev subpath** (if you still maintain it on host) | `https://worldscribe.online/dev/` | `/dev/` | `npm run build:dev` → `dev/` |

Day-to-day **testing / planning** uses **worldscribe.online** (root + `deploy_worldscribe.ps1`). **Production** for players is **eonscribe.com**; OpenRouter headers use `APP_PUBLIC_URL` in `config.php` so they stay on the production domain regardless of which server you hit.

## Related docs

- **`Features_List.md`** — product feature inventory (Ashenholm), includes dev/live note.  
- **`AGENTS.md`** (repo root) — local dev, builds, FTP env, deploy commands.
