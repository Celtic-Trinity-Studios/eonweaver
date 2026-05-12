# Want / need backlog (working list)

Use this file **while** you work through `QA_FEATURE_CHECKLIST.md`. When a test fails, a procedure is unclear, or you think of an improvement, **append a row** here so the checklist stays procedural and this file stays the product/design backlog.

**Systematic order:** In the checklist, use **Phase A (website first)** until hosting + **INF-04** smoke pass on staging; only then treat backlog items as “feature” work unless they block Phase A (log those as **Need** with checklist ID).

**Convention**

- **Want** = nice-to-have, polish, depth, or future idea.  
- **Need** = blocks release, breaks data integrity, security, legal/compliance, or makes a checklist item untestable.

**Linking:** In **Checklist ID**, reference the stable ID from the checklist (e.g. `SIM-03`, `CHS-08`). If the gap is global, use `GLB-*` or `N/A`.

**Discord:** Post only in the **bug-reports** forum (Labs): open the **forum post** for that checklist section and add a **comment** there (see `QA_FEATURE_CHECKLIST.md`, **Discord: all QA in the `bug-reports` forum**). Start with the checklist ID in bold, e.g. **SIM-03** — short description. Optionally paste the post URL in the backlog **Notes** column.

---

## Instructions

1. Add new entries **at the bottom** of the table (preserve chronological order of discovery).  
2. When implemented, move the row to **Resolved** (second table) or strike through and add **Done date** and PR/commit reference.  
3. Do **not** delete resolved rows for a while — they act as a cheap changelog. Archive older resolved blocks to a dated section if the file grows past ~200 lines.

---

## Open items

| # | Date (YYYY-MM-DD) | Checklist ID | Want / Need | Summary | Notes / links |
|---|-------------------|--------------|-------------|---------|---------------|
| *(add rows below this line)* | | | | | |

---

## Resolved

| # | Resolved date | Checklist ID | Was Want/Need | Summary | How it was closed |
|---|---------------|--------------|-----------------|---------|-------------------|
| 1 | 2026-05-11 | N/A | — | Staging deploy **worldscribe.online** (live SPA + PHP) | `npm run build` then `.\deploy_worldscribe.ps1 -SkipGitCommit` (Discord deploy ping succeeded). URL: https://worldscribe.online/ . Source: same-session `git push` on branch `cursor/worldscribe-staging-openrouter-intake-scribe` (includes Help/sidebar/appHref bundle). |
| *(move rows here when done)* | | | | | |

---

## Quick capture (optional scratch)

Use bullets here during a test session; promote them to the **Open items** table when you triage:

- 

---

*Created: 2026-05-11. Keep in sync with `QA_FEATURE_CHECKLIST.md` IDs.*
