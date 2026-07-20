# Campaign manager roadmap — gaps vs WorldSmith-style tools

Eon Weaver’s strength today is **living towns** (intake, monthly/world sim, roster, social, calendar) plus **DM prep** (Scribe, encounters, homebrew, wiki, exports). This sheet tracks features common to full campaign managers — especially surfaces advertised on [WorldSmith](https://www.worldsmith.io/) — that we either lack, only partially cover, or want to deepen so the product can run prep → share → play in one hub.

**Status legend**

| Status | Meaning |
|--------|---------|
| **Have** | Shipped in a usable form (may differ in UX from competitors) |
| **Partial** | Exists in a narrower form; expand toward campaign-manager parity |
| **Gap** | Not productized yet — candidate for future work |
| **Skip / later** | Nice-to-have or out of current positioning; keep listed so we don’t forget |

Update this file when a row ships or scope changes. Implementation work still follows `QA_FEATURE_CHECKLIST.md` / `QA_PROGRESS.md` once something moves from Gap → build.

---

## 1. Already strong (keep; don’t re-build from scratch)

| Area | Eon Weaver today | WorldSmith analogue |
|------|------------------|---------------------|
| Living settlements | Town intake, monthly sim, world/macro sim, demographics, buildings | Campaign “world” flavor, not living towns |
| Roster & sheets | Full NPC/PC sheets, spells, XP, relationships, factions, incidents | NPC / player generators + sheets |
| World context AI | Scribe (lore, quest, dungeon, item, trap) + sim prompts | Homebrew generators with campaign context |
| Encounters & loot | Encounter groups/CRUD, random encounter / loot / magic shop AI | Encounter, treasure, shop generators |
| Calendar & history | Custom calendar, town history timeline | Calendar generator + campaign timelines |
| Rules & homebrew | SRD browser + custom races/classes/feats/spells/equipment/monsters | Homebrew library + generators |
| Sharing / files | Content library, player portal tokens, VTT + town docket export | Content sharing, player visibility (their CS) |
| Maps (strategic) | World map + trade routes between towns | Map library / battlemaps (different problem) |
| Lore wiki (scaffold) | Campaign wiki articles + auto-link refresh + graph preview (`WikiView`, `wiki_*` APIs) | Setting / lore codex |

---

## 2. Lore codex — editable pages, cross-links, AI ingest

Goal: a **campaign lore book** where every important place, person, faction, item, and plot thread is an editable page, pages **cross-reference each other**, and **AI output lands in the codex automatically** (DM can still edit/merge).

**Already in code (Partial):** `wiki_articles` / `wiki_links`, CRUD, `wiki_autolink_refresh` (title mention → edges), graph preview, `is_auto_generated` flag. Scribe library and town history are **separate** stores today — they do not reliably create or update wiki pages.

| ID | Feature | Status | Notes / intended shape |
|----|---------|--------|-------------------------|
| LORE-01 | **Lore page editor** | Have | Dedicated editing UX: title, slug, tags/categories, markdown body with live preview, backlinks panel (`WikiView` / Lore Codex). |
| LORE-02 | **Manual cross-references** | Have | `[[Page Title]]` / insert-link picker; click-through in preview; inbound/outbound link chips. |
| LORE-03 | **Automatic cross-references** | Have | On save + campaign refresh: title/alias mentions + explicit wikilinks; stubs for new `[[targets]]`; manual links preserved. |
| LORE-04 | **Relationship graph** | Have | Clickable lore graph with category filter (plus character relationship list). |
| LORE-05 | **AI → lore auto-ingest** | Have | Scribe generate/save → `loreIngestFromAi` (create/update). |
| LORE-06 | **Ingest merge & canon** | Have | Pending queue with Accept / Append / Skip; **Lock** flag blocks overwrite. |
| LORE-07 | **Bidirectional AI context** | Have | Scribe `buildWorldContext` includes lore codex digest; prompts ask for `[[wikilinks]]`. |
| LORE-08 | **Entity deep-links** | Have | Character sheet → Lore page (`wiki_entity_page`); open via `wiki?article=`. |
| LORE-09 | **Player-visible lore** | Have | Per-page flag; included in player portal snapshots. |

**Ingest flow (target)**

```text
AI feature (Scribe / intake / sim / recap)
        │
        ▼
  Extract subjects + body snippets
        │
        ▼
  Match existing lore pages by slug / title / entity id
        │
   ┌────┴────┐
   │ new     │ existing (DM-edited)
   ▼         ▼
 Create     Pending merge (LORE-06)
 page       Accept | Append | Skip
        │
        ▼
  Refresh auto cross-links (LORE-03)
```

---

## 3. Campaign hub — plan, track, run sessions

WorldSmith’s “Build Campaigns” pitch: encounters, timelines, maps, stories, NPCs, loot in one place. We cover several pieces; the **session-centric hub** is the main gap.

| ID | Feature | Status | Notes / intended shape |
|----|---------|--------|-------------------------|
| CM-01 | **Session planner** | Gap | Per-campaign sessions: date (real + in-game), goals, linked towns/encounters/Scribe pieces, prep checklist, status (planned / ran / archived). |
| CM-02 | **Session recap** | Gap | Post-session notes (manual + optional AI summarize from DM notes / history). Attach XP awards, loot, NPC outcomes. Recap should **feed the lore codex** (LORE-05). WorldSmith lists this as Coming Soon. |
| CM-03 | **Campaign timeline (prep)** | Partial | Town history + calendar exist; need a **DM prep timeline** (arcs, deadlines, foreshadowing) distinct from simulated history. |
| CM-04 | **Campaign generators** | Partial | Scribe + intake cover pieces; missing a **one-shot / campaign outline** generator (arcs, act structure, villain ladder) that seeds sessions + quests. |
| CM-05 | **Unified campaign dashboard** | Partial | Dashboard exists; evolve into “tonight’s game” view: next session, open threads, party location, unread portal activity. |

---

## 4. Multiplayer / player tools

WorldSmith: invite players, player visibility, PC creation, player dashboard, character art (many Coming Soon). We have a **tokenized player portal** — expand toward real table seats.

| ID | Feature | Status | Notes / intended shape |
|----|---------|--------|-------------------------|
| PL-01 | **Invite players (accounts)** | Gap | Campaign membership: invite by email/link, roles (DM / co-DM / player), revoke. Beyond share tokens. |
| PL-02 | **Player visibility scopes** | Partial | Portal tokens + town scopes; add per-entity visibility (which lore pages, homebrew, maps, NPCs the party has met). See **LORE-09**. |
| PL-03 | **Player dashboard** | Gap | Player-facing home: my characters, next session, handouts, unlocked lore. |
| PL-04 | **Guided PC creation** | Partial | Strong sheets + intake for NPCs; add **player-facing** guided create/level (SRD + campaign homebrew options only). |
| PL-05 | **Player character art** | Partial | Portrait upload on sheets; allow players to upload/replace their own art under portal auth. |
| PL-06 | **Campaign-level homebrew for players** | Partial | Homebrew is campaign-scoped for the DM; expose approved classes/races/feats/spells to players in PL-04. |
| PL-07 | **Homebrew pets / familiars / mounts (player)** | Gap | Generators + sheet hooks for companions (see GEN-* below). |

---

## 5. Generators — WorldSmith catalog vs Scribe / AI helpers

WorldSmith advertises many discrete generators. Map to Eon Weaver; **Gap** rows are candidates for new Scribe tabs or Encounter/simulate helpers.

| ID | Generator | Status | Where today / plan |
|----|-----------|--------|--------------------|
| GEN-01 | Maps (asset library) | Gap | Stock / licensed map library (not procedural). Distinct from world-map towns. |
| GEN-02 | Maps (procedural / battlemap) | Gap | Room/battlemap generation + optional grid export. |
| GEN-03 | Map editing | Gap | Annotate maps (markers, fog, links to encounters/wiki). |
| GEN-04 | Monster | Partial | SRD + creature intake + homebrew monsters; optional **dedicated monster forge** (statblock from prompt). |
| GEN-05 | NPC | Have | Intake / roster AI. |
| GEN-06 | Spell | Gap | AI + structured save into homebrew spells. |
| GEN-07 | Magic item | Have | Scribe Item Enchanter. |
| GEN-08 | Shop | Partial | `generate_magic_shop`; generalize to mundane / specialty shops tied to towns. |
| GEN-09 | Puzzle | Gap | Scribe-style puzzle (setup, clues, solutions, skill DCs). |
| GEN-10 | Encounter | Have | Encounter UI + `generate_random_encounter`. |
| GEN-11 | Feat | Gap | AI feat → homebrew feats. |
| GEN-12 | World / setting bible | Partial | Campaign description + lore Scribe; optional “setting packet” generator. Prefer landing output in the lore codex (LORE-05). |
| GEN-13 | Treasure / loot | Have | `generate_loot`. |
| GEN-14 | Story / lore | Have | Lore Scribe. Auto-ingest into lore pages = LORE-05 (not done yet). |
| GEN-15 | Quest | Have | Quest Forge. |
| GEN-16 | Trap | Have | Trap Designer. |
| GEN-17 | Deity / pantheon | Gap | Deity + portfolio + church structure; wiki-linkable. |
| GEN-18 | Familiar | Gap | Statblock + bond rules; optional companion on sheet. |
| GEN-19 | Mount | Gap | Same pattern as familiar. |
| GEN-20 | Group / organization | Partial | Factions exist; add **party / guild / cult** generator that seeds faction + NPCs. |
| GEN-21 | Calendar | Have | Custom calendar UI (not AI-first). Optional AI holiday/festival pack. |
| GEN-22 | Roll table | Gap | Weighted tables (encounters, rumors, loot); store + roll in UI. |
| GEN-23 | Player (PC concept) | Partial | See PL-04. |
| GEN-24 | Species / race | Partial | Homebrew races; optional AI race forge. |
| GEN-25 | Class | Partial | Homebrew classes; optional AI class forge. |
| GEN-26 | Dungeon | Have | Dungeon Architect (+ roster import). |

---

## 6. Creation editor & library UX

WorldSmith emphasizes sourcebook-style editing, partial regenerate, drag-and-drop sections, folders, public library.

| ID | Feature | Status | Notes / intended shape |
|----|---------|--------|-------------------------|
| ED-01 | **Sourcebook / block editor** | Gap | Structured sections (statblock, lore, table, image) with reorder; export to PDF/markdown. Beyond markdown textarea. |
| ED-02 | **Partial regenerate** | Gap | Regenerate one paragraph/section without rewriting the whole piece (Scribe + wiki). |
| ED-03 | **Advanced box types** | Gap | Callout, DC box, treasure block, map embed — reusable in sessions & wiki. |
| ED-04 | **Custom generators** | Gap | User-defined prompts + output schema saved per campaign/account. |
| ED-05 | **Folder organization** | Partial | Content library / Scribe library lists; add folders/tags across creations. |
| ED-06 | **Public homebrew library** | Skip / later | Community publish/browse. Needs moderation + ToS; Discord can bridge short-term. |
| ED-07 | **Content sharing links** | Partial | Portal + exports; add read-only share links for a single Scribe piece or wiki article. |

---

## 7. Maps & VTT-adjacent

| ID | Feature | Status | Notes / intended shape |
|----|---------|--------|-------------------------|
| MAP-CM-01 | Battlemaps | Gap | Upload or generate; scale/grid; link to encounters. |
| MAP-CM-02 | Procedural map generators | Gap | Dungeon/wilderness layouts; optional handoff to GEN-02. |
| MAP-CM-03 | Map editing / fog | Gap | DM annotations; optional player-visible layers (ties to PL-02). |
| MAP-CM-04 | Large stock map library | Skip / later | WorldSmith’s ~200k library is a licensing/content play; prefer uploads + curated packs unless we partner. |

World map (`MAP-01` in QA) stays the **strategic** layer; this section is **tactical / handout** maps.

---

## 8. Community & growth (optional)

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| COM-01 | Discord | Have / Partial | Deploy notify + onboarding bots; keep as community hub. |
| COM-02 | GM training grounds | Skip / later | Tutorials / sandboxes — Help + Discord may suffice early. |
| COM-03 | Referral program | Skip / later | After Stripe checkout is stable. |
| COM-04 | Early feature access | Skip / later | Tier flag or beta cohort once CM-* ships behind flags. |

---

## 9. Suggested build order (campaign manager track)

Ordered for “full campaign manager” without abandoning living-town differentiation:

1. **LORE-*** — lore page editor, cross-links, AI ingest (**shipped** — see Lore Codex).  
2. **CM-01 Session planner** + **CM-05 tonight’s dashboard** — hub for everything else.  
3. **PL-01 invites** + deepen **PL-02** visibility — real multiplayer.  
4. **CM-02 session recap** → also writes lore (LORE-05 path).  
5. **GEN gaps that feed sessions** — puzzle, roll table, deity, shop generalization; then companions.  
6. **ED-02 partial regenerate** + **ED-05 folders** — QoL; align with lore editor.  
7. **PL-03 / PL-04** player dashboard + guided PC creation.  
8. **MAP-CM-*** battlemap upload/annotate (library scale later).  
9. **ED-01 / ED-03 / ED-04** advanced editor & custom generators when markdown hits a ceiling.  
10. **ED-06 / COM-*** community surfaces when moderation capacity exists.

---

## 10. Related docs

- [`Features_List.md`](Features_List.md) — what is already built (Ashenholm / Eon Weaver inventory).  
- [`PROJECT_PHASES.md`](PROJECT_PHASES.md) — meanings of “Phase” in code + link here.  
- [`QA_FEATURE_CHECKLIST.md`](QA_FEATURE_CHECKLIST.md) — ship/test IDs once a roadmap row is implemented (`WIKI-*` today; add `LORE-*` when building).  
- [`Price_Analysis.md`](../Price_Analysis.md) — competitor pricing (WorldSmith ~$5 / $15 + credits).  
- Competitor marketing snapshot: [worldsmith.io](https://www.worldsmith.io/).

---

*(Updated: 2026-07-20 — added lore codex / cross-links / AI ingest; WorldSmith gap analysis.)*
