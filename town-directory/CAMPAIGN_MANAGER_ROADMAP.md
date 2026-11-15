# Campaign manager roadmap — gaps vs WorldSmith-style tools

Eon Weaver’s strength today is **living towns** (intake, monthly/world sim, roster, social, calendar) plus **DM prep** (Scribe, encounters, homebrew, wiki, exports). This sheet tracks features common to full campaign managers — especially surfaces advertised on [WorldSmith](https://www.worldsmith.io/) and [Alkemion Studio](https://alkemion.com/) — that we either lack, only partially cover, or want to deepen so the product can run prep → share → play in one hub.

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
| CM-01 | **Session planner** | Partial | Campaign Hub (`sessions`): title, dates, goals, checklist, status, and town/encounter checkboxes. Recap and outline jobs store a prompt and do not call the model. |
| CM-02 | **Session recap** | Partial | Recap, XP, loot, NPC outcomes. Player-visible flag shares title, goals, and recap on My tables and logs an unread portal row. **File recap** writes a history lore page. |
| CM-03 | **Campaign timeline (prep)** | Partial | Hub tab for arcs, deadlines, and foreshadowing, separate from simulated town history. |
| CM-04 | **Campaign generators** | Partial | Workshop drafts save by hand. **Create sessions from headings** splits an outline. **Queue generation** stores the prompt. Content blocks can be attached to a draft. |
| CM-05 | **Unified campaign dashboard** | Partial | Next planned session, open prep beats, town cards, one-month simulate, party-base town, and unread portal activity (Mark read). |

---

## 4. Multiplayer / player tools

WorldSmith: invite players, player visibility, PC creation, player dashboard, character art (many Coming Soon). We have a **tokenized player portal** — expand toward real table seats.

| ID | Feature | Status | Notes / intended shape |
|----|---------|--------|-------------------------|
| PL-01 | **Invite players (accounts)** | Partial | Seats: invite by link and optional email, roles player / co-DM, revoke, 30-day expiry. Joined players sign in and open a read-only table (My tables). Co-DM can invite players. World editing stays with the campaign owner. Share tokens remain for account-free links. |
| PL-02 | **Player visibility scopes** | Partial | Portal tokens + town scopes; add per-entity visibility (which lore pages, homebrew, maps, NPCs the party has met). See **LORE-09**. |
| PL-03 | **Player dashboard** | Partial | My tables already lists towns, characters, and player-visible lore. It now also shows the next shared session and the latest shared recap. Handouts are still open. |
| PL-04 | **Guided PC creation** | Partial | **New character** (`create-character`) stores a PC on the party town with ancestry/class datalists. 5e level-up records level, HP, and a note; the sheet is still the 3.5e layout. |
| PL-05 | **Player character art** | Partial | Portrait URL on create and on the player’s own characters. Sheet upload remains the DM path. |
| PL-06 | **Campaign-level homebrew for players** | Partial | DM flags which homebrew rows players may use. Approved names are appended to class intake context. |
| PL-07 | **Homebrew pets / familiars / mounts (player)** | Partial | `character_companions` plus a Familiars tab on the sheet (familiar, mount, pet, notes, statblock text). |

---

## 5. Generators — WorldSmith catalog vs Scribe / AI helpers

WorldSmith advertises many discrete generators. Map to Eon Weaver; **Gap** rows are candidates for new Scribe tabs or Encounter/simulate helpers.

| ID | Generator | Status | Where today / plan |
|----|-----------|--------|--------------------|
| GEN-01 | Maps (asset library) | Gap | Stock / licensed map library (not procedural). Distinct from world-map towns. |
| GEN-02 | Maps (procedural / battlemap) | Partial | **Battlemaps** can generate a simple room list (no image). Grid export is still open. |
| GEN-03 | Map editing | Partial | Battlemap marks: note, marker, fog, with player-visible flag. Handout maps remain **MAP-CM-05**. |
| GEN-04 | Monster | Partial | SRD + creature intake + homebrew monsters; optional **dedicated monster forge** (statblock from prompt). |
| GEN-05 | NPC | Have | Intake / roster AI. |
| GEN-06 | Spell | Partial | Workshop draft in Campaign Hub. AI and homebrew save are not connected. |
| GEN-07 | Magic item | Have | Scribe Item Enchanter. |
| GEN-08 | Shop | Partial | `generate_magic_shop`; generalize to mundane / specialty shops tied to towns. |
| GEN-09 | Puzzle | Partial | Workshop draft in Campaign Hub. Generator is not connected. |
| GEN-10 | Encounter | Have | Encounter UI + `generate_random_encounter`. |
| GEN-11 | Feat | Partial | Workshop draft in Campaign Hub. AI and homebrew save are not connected. |
| GEN-12 | World / setting bible | Partial | Campaign description + lore Scribe; optional “setting packet” generator. Prefer landing output in the lore codex (LORE-05). |
| GEN-13 | Treasure / loot | Have | `generate_loot`. |
| GEN-14 | Story / lore | Have | Lore Scribe. Auto-ingest into lore pages = LORE-05 (not done yet). |
| GEN-15 | Quest | Have | Quest Forge. |
| GEN-16 | Trap | Have | Trap Designer. |
| GEN-17 | Deity / pantheon | Partial | Workshop draft in Campaign Hub. Wiki link and generator are not connected. |
| GEN-18 | Familiar | Partial | Workshop draft plus the sheet Familiars tab. Generator is not connected. |
| GEN-19 | Mount | Partial | Workshop draft plus the sheet Familiars tab. Generator is not connected. |
| GEN-20 | Group / organization | Partial | Factions exist; add **party / guild / cult** generator that seeds faction + NPCs. |
| GEN-21 | Calendar | Have | Custom calendar UI (not AI-first). Optional AI holiday/festival pack. |
| GEN-22 | Roll table | Partial | Campaign Hub stores weighted rows and rolls them. Not yet attached to entities. |
| GEN-23 | Player (PC concept) | Partial | See PL-04. |
| GEN-24 | Species / race | Partial | Homebrew races; optional AI race forge. |
| GEN-25 | Class | Partial | Homebrew classes; optional AI class forge. |
| GEN-26 | Dungeon | Have | Dungeon Architect (+ roster import). |

---

## 6. Creation editor & library UX

WorldSmith emphasizes sourcebook-style editing, partial regenerate, drag-and-drop sections, folders, public library.

| ID | Feature | Status | Notes / intended shape |
|----|---------|--------|-------------------------|
| ED-01 | **Sourcebook / block editor** | Gap | Structured sections with reorder and export. `content_blocks` can be saved on a workshop draft; there is no reorder UI. |
| ED-02 | **Partial regenerate** | Partial | A draft block can queue a regenerate job. The job stores the prompt and does not call the model or rewrite the block. |
| ED-03 | **Advanced box types** | Partial | Block types prose, callout, DC, treasure, and map are stored. The hub button adds a callout. |
| ED-04 | **Custom generators** | Gap | User-defined prompts + output schema saved per campaign/account. |
| ED-05 | **Folder organization** | Partial | Content library uploads accept a folder. Existing files can be moved with `gw_file_folder`. Scribe library folders are still open. |
| ED-06 | **Public homebrew library** | Skip / later | Community publish/browse. Needs moderation + ToS; Discord can bridge short-term. |
| ED-07 | **Content sharing links** | Partial | Lore pages can copy a read-only `share/{token}` link. Signed-out visitors see the page on the landing screen. Scribe pieces are accepted by the API and have no button yet. |

---

## 7. Maps & VTT-adjacent

| ID | Feature | Status | Notes / intended shape |
|----|---------|--------|-------------------------|
| MAP-CM-01 | Battlemaps | Partial | **Battlemaps** route: title, image URL, grid size, notes. Encounter linking is still open. |
| MAP-CM-02 | Procedural map generators | Partial | Generate rooms stores a simple layout (name, size, door). No drawn map. |
| MAP-CM-03 | Map editing / fog | Partial | Marks with kind note, marker, or fog, and a player-visible flag. |
| MAP-CM-04 | Large stock map library | Skip / later | WorldSmith’s ~200k library is a licensing/content play; prefer uploads + curated packs unless we partner. |
| MAP-CM-05 | **Clickable map + sidebar inspector** | Have | **Handout Maps** (`campaign-maps`): upload any image, pan/zoom, place markers. Click a marker → sidebar with name, notes, and a link to a lore page, town, NPC, or encounter. Distinct from the strategic world map (`MAP-01`). |

World map (`MAP-01` in QA) stays the **strategic** layer; this section is **tactical / handout** maps. **MAP-CM-05** is the preferred first map UX (handout + inspector), not a node-board clone.

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
2. **CM-01 Session planner** + **CM-05 tonight’s dashboard** — hub, town/encounter pickers, recap→lore, party location, and unread portal are in. Still open: calling the model for queued jobs.  
3. **PL-01 invites** — account seats are in (link/email, player and co-DM, revoke, read-only table). Still open: co-DM editing the owner's world, and deeper **PL-02** visibility.  
4. **CM-02 session recap** → also writes lore (LORE-05 path).  
5. **GEN gaps that feed sessions** — puzzle, roll table, deity, shop generalization; then companions.  
6. **ED-02 partial regenerate** + **ED-05 folders** — QoL; align with lore editor.  
7. **PL-03 / PL-04** player dashboard + guided PC creation.  
8. **MAP-CM-*** battlemap upload/annotate (library scale later). **MAP-CM-05** clickable handout map + sidebar is shipped.  
9. **ED-01 / ED-03 / ED-04** advanced editor & custom generators when markdown hits a ceiling.  
10. **ED-06 / COM-*** community surfaces when moderation capacity exists.

---

## 10. Related docs

- [`Features_List.md`](Features_List.md) — what is already built (Ashenholm / Eon Weaver inventory).  
- [`PROJECT_PHASES.md`](PROJECT_PHASES.md) — meanings of “Phase” in code + link here.  
- [`QA_FEATURE_CHECKLIST.md`](QA_FEATURE_CHECKLIST.md) — ship/test IDs once a roadmap row is implemented (`WIKI-*` today; add `LORE-*` when building).  
- [`Price_Analysis.md`](../Price_Analysis.md) — competitor pricing (WorldSmith ~$5 / $15 + credits).  
- Competitor marketing snapshots: [worldsmith.io](https://www.worldsmith.io/), [alkemion.com](https://alkemion.com/).

---

## 11. Inspiration — Alkemion Studio (2026-09-02)

[Alkemion Studio](https://alkemion.com/) is a **visual, node-based GM designer** (locations, NPCs, clues, events on a board). Desktop / offline is on [Kickstarter](https://www.kickstarter.com/projects/alkemion/alkemion-studio). Worth mining for UX ideas; **do not clone the node board** — living towns + lore remain our core.

**Steal this first:** interactive maps. Upload any image, drop points of interest, **click a POI and a sidebar (or inspector) shows the linked content**. Alkemion also links POIs to “nodes”; we should link to **lore pages, towns, NPCs, encounters**. Tracked as **MAP-CM-05**.

**Other bits to revisit later (not committed):**

- Named board “views” (saved pan/zoom shortcuts) — only if a large map canvas needs them.
- Timeline as a second view of existing entities (calendar / town history already cover some of this).
- Embed the same map construct inside a wiki/lore page (ties to **ED-03** map embed).
- Random tables attached to entities (**GEN-22**).

---

*(Updated: 2026-11-15 — groundwork tables and hooks for jobs, recap lore, session seeding, companions, 5e level note, battlemaps, blocks, folders, and share links. Model calls stay off. 2026-11-12 — MAP-CM-05 handout maps with marker sidebar shipped. 2026-09-02 — Alkemion Studio inspiration.)*
