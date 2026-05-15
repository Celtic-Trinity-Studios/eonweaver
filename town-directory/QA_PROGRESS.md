# Feature progress — handoff for new chats

When you open a **new agent** and only say **“next step”**, the agent uses this file plus `QA_FEATURE_CHECKLIST.md` to continue **feature work in order** (website shell → core loop → simulation → …). See *Systematic pass* in the checklist for phase order.

**Browser QA is separate:** you run the checklist yourself when ready. Agents do **not** paste test procedures on “next step” unless you ask for QA mode.

---

## For the human

- Say **`done DSH-01`** (replace with the real ID) when feature work for that row is finished (or you want to advance the cursor), then **`next step`**.
- Or edit **`Last completed ID`** below yourself.
- Mark **`[x]`** in `QA_FEATURE_CHECKLIST.md` only after **your** end-to-end test pass—not when the agent finishes implementation.

---

## For the agent (protocol)

1. Read **`Last completed ID`** below (may be empty).
2. Load **`ORDERED_IDS`** (same order as *Phase A → F* in `QA_FEATURE_CHECKLIST.md` → **Systematic pass**).
3. **Next step** = the first ID in `ORDERED_IDS` that comes **after** `Last completed ID` (if set). If empty, start at **GLB-01**.
   - **Skip `INF-*`** by default (build/DB/deploy infra—not product features). Human can say **`include INF`** to work that block.
   - Optionally skip IDs already marked **`[x]`** in the checklist if the human is only doing unfinished rows; default is strict order by cursor regardless of `[x]`.
4. Reply with:
   - **Next ID**, **phase name**, **feature title**, **primary surface** (from checklist)
   - **What to do:** implement, fix, or review the feature in code—key files, APIs, gaps vs `Features_List.md` / `WANT_NEED_BACKLOG.md`
   - **Do not** paste the checklist *Test procedure* unless the human asks for **QA mode** or **test DSH-01**.
5. If the user said **`done <ID>`**, set **`Last completed ID`** to that `<ID>` in this file.

**Optional:** **`skip INTG-01`** (example)—treat as done for progression only; note under **Notes**.

**QA mode (explicit only):** If the human says **“QA next step”** or **“test next”**, use the old behavior: paste the numbered *Test procedure* from the checklist for the next ID.

---

## State (edit here)

| Field | Value |
|-------|-------|
| **Last completed ID** | `INF-04` |
| **Notes** | **Phase A complete** (incl. optional INF). Infra scripts: `npm run infra:phase-a` (see `.env.smoke.example` for `--deep` login smoke). Next feature cursor: **CMP-01**. Human checklist `[x]` when browser QA done. |

---

## `ORDERED_IDS` (must match checklist “website first” phases)

If you add/remove rows in `QA_FEATURE_CHECKLIST.md`, update this list to match the **Systematic pass** section.

```
GLB-01, GLB-02, GLB-03, GLB-04,
AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05,
INF-01, INF-02, INF-03, INF-04,
DSH-01, HLP-01, SET-01, SET-02, INTG-01,
CMP-01, TWN-01, TWN-02, TWN-03, TWN-04,
ROST-01, ROST-02, ROST-03, ROST-04, ROST-05,
CAL-01, CAL-02, CAL-03,
MAP-01, STATS-01,
INT-01, INT-02, INT-03, INT-04, INT-05, INT-06,
SIM-01, SIM-02, SIM-03, SIM-04, SIM-05, SIM-06, SIM-07, SIM-08,
WSIM-01, WSIM-02, WSIM-03,
MACRO-01, MACRO-02, MACRO-03, MACRO-04,
CHS-01, CHS-02, CHS-03, CHS-04, CHS-05, CHS-06, CHS-07, CHS-08, CHS-09, CHS-10, CHS-11, CHS-12,
EQ-01, EQ-02, EQ-03,
SPL-01, SPL-02, SPL-03, SPL-04, SPL-05,
EFX-01, LVL-01,
BLD-01, BLD-02, BLD-03,
SOC-01, SOC-02, SOC-03, SOC-04,
FAC-01, INC-01, REP-01,
PRT-01, PRT-02,
ENC-01, ENC-02, ENC-03, ENC-04,
SCR-01, SCR-02, SCR-03,
SRD-01, SRD-02,
HB-01,
LIB-01, LIB-02,
WIKI-01,
PLR-01,
VTT-01,
ADM-01, ADM-02, ADM-03,
LLM-01, LLM-02
```
