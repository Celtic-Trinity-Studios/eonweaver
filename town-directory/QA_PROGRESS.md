# QA progress — handoff for new chats

When you open a **new agent** and only say **“next step”**, the agent should use this file plus `QA_FEATURE_CHECKLIST.md` so work continues in order (**website first**, then features — see *Systematic pass* in the checklist).

---

## For the human

- After you **actually run** a checklist row in the browser (or staging), either:
  - say **`done GLB-01`** (replace with the real ID), then **`next step`**, or  
  - edit **`Last completed ID`** below yourself.
- The checklist **`[x]`** in `QA_FEATURE_CHECKLIST.md` remains the official sign-off; keep it in sync when you can.

---

## For the agent (protocol)

1. Read **`Last completed ID`** below (may be empty).
2. Load **`ORDERED_IDS`** (same order as *Phase A → F* in `QA_FEATURE_CHECKLIST.md` → **Systematic pass**).
3. **Next step** = the first ID in `ORDERED_IDS` that:
   - comes **after** `Last completed ID` (if set), and  
   - still has **`[ ]`** in `QA_FEATURE_CHECKLIST.md` for that row.  
   If `Last completed ID` is empty, start at the first ID in the list (normally **GLB-01**).
   - **Browser / feature QA (Notes):** If **Notes** says to prioritize in-browser feature testing on the deployed site, **skip `INF-*`** when choosing the next ID (those rows are local build, DB setup, and post-deploy smoke — not product click-through). Resume strict order for all other IDs. The human can say **“include INF”** to cover that block.
4. Reply with: **next ID**, **phase name**, **feature title**, and the **numbered test procedure** (copy from the checklist table for that ID).
5. If the user said **`done <ID>`**, set **`Last completed ID`** to that `<ID>` in this file (and remind them to mark `[x]` in the checklist when they have).

**Optional:** If the user says **“skip INTG-01”** (example), treat that ID as done for progression only and record a short note under **Notes**.

---

## State (edit here)

| Field | Value |
|-------|-------|
| **Last completed ID** | `AUTH-05` |
| **Notes** | **Browser feature QA on staging/prod** — ordered “next step” should skip **`INF-*`** unless the human asks for infra/build/DB checks. Goal: click through the website and record what works vs broken. |

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
