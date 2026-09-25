# Keystone Barn site — brief for ClickUp Brain

Updated 2026-09-24. Give this to Brain whenever it (a) edits the ClickUp lists
below, or (b) produces a new version of the Keystone Barn Resources app.

**The short version:** keystone-barn.onrender.com reads most of its content
**live from ClickUp through the ClickUp API**, every 5–15 minutes. Editing a
task in ClickUp *is* how the site gets updated — no code, no deploy. That only
works while the lists keep the shapes described in Part 1. Rename a field,
change a naming pattern, or move data into a different field, and that part
of the site quietly goes blank or stale.

---

## Part 1 — ClickUp conventions the site depends on

The backend finds fields by their **field ID**, not their name, so renaming a
field's label is safe. Deleting and re-creating a field (new ID) is not. Adding
new dropdown options or labels is always safe — the site picks them up.

### 🧴 Products (list 901715740303) → Products tab

| Site shows | Comes from |
|---|---|
| Product name | Task name |
| Category chip / filter | `Category` dropdown |
| Verdict badge (Barn Favorite, Proven…) | `Verdict` dropdown |
| "Where it lives" | `Storage` dropdown (`Out of Stock` = hidden shelf) |
| "Indicated For" filter + "Reach for it when" | `Indicated For` labels (see mapping below) |
| "What it's for" | **First paragraph** of the description |
| Directions | `Directions` field, else the rest of the description |
| Barn notes / red warning box | Everything under a `## Notes` heading in the description. Words like "call the vet", "do not", "never", "escalate" turn it into the red box |
| Rx pill | Description contains "prescription required" / "Rx only" / "vet-administered only" |
| Trial pill | `Experiment` checkbox |
| Retired (hidden by default) | Any status other than `active` |
| Photo | First image attachment |

Indicated For labels are grouped into 14 site buttons (`SX_GROUP_OF` in
`src/data.js`): e.g. Thrush / Hoof Abscess / Sore Hooves → **Hoof Issues**;
Itchy / Allergies → **Itching / Allergies**. A brand-new label is saved on
the product, but it gets no Products button until
Claude Code adds it to that map (ask when you create one).
Cushings, Insulin Resistance, EPM, Coat, Mane/Tail and Worms intentionally
have no button.

### 🐴 Horse Health Log (list 901715510360) → Board, Horses, Feed Buckets

Set the **`🐾 Animal dropdown`** on every task — it's how the site knows
which horse a task belongs to (weights and labs also fall back to a name
starting `Horse:` / `Horse weight:`). What each part of the site reads:

| Site feature | Which tasks | What must be true |
|---|---|---|
| **Board → Coming Up** | Any open task with a **due date** in the next 4 weeks | Due date = the day it happens. One task per dose/visit (e.g. one "Tammy: IM Prascend" per date). Closing it removes it. Name as `Horse: what` |
| **Board → Watch List** | Any open task with the **`Alert`** dropdown set (Mild/Moderate/Severe) | Clear Alert or close the task to drop it |
| **Feed Buckets** AM/PM | Note Type `🌾Feed`, status **`in progress`** | `Product` dropdown + `Value` + `Unit` + `🪣 AM/PM` all set |
| Med courses end on the site | Any `in progress` task whose ID is referenced in `src/bucketData.js` | Marking the task complete removes the course |
| **Horses → profile** | One task per horse named exactly **`<Horse>: Profile`**, Note Type `📋Other` (status can be complete) | Description is a bullet list of `**Label:** value` lines — see below |
| **Horses → weight chart** | Note Type `⚖️Weight` | `Value` = lb (or the number in the name, e.g. `Avelin weight: 990 lb`). **Due date = weigh-in date** |
| **Horses → endocrine labs** | Note Type `🩸Labs`, one task per test, named `<Horse>: Insulin`, `<Horse>: ACTH (post-TRH)`, `<Horse>: ACTH (pre-TRH)`, `<Horse>: T4 (Thyroxine)`, `<Horse>: Leptin` | `Value` = the result; due date = draw date; description has `**Result:** 68.78 µIU/mL`, `**Reference range:** 10-40 µIU/mL`, and `⚠️ **HIGH**` / `**LOW**` when out of range (that flag turns the number red) |

**Profile task format** (labels are read literally; add new ones freely, they
come through as-is):

```
## Horse Profile
*   **Barn Name:** Qu
*   **Registered Name:** Qumano Van De Breemeersen
*   **DOB:** 2016-05-13            ← YYYY-MM-DD; the site computes age from it
*   **Sex:** Gelding
*   **Breed:** Belgian Warmblood (BWP)
*   **Color:** Dark Bay
*   **Height:** 17.2h
*   **Lives In:** Paddock 1        ← drives "Everyone home" on the Paddocks tab
*   **Eats At:** Paddock           ← drives the Eats At map (Stall 1–4, N Porch, S Porch, or Paddock/Outside)
*   **Conditions:** Low T4, DSLD   ← comma-separated tags on the card ("None" = no tags)
*   **Hay:** Free choice, 2% BW
*   **Note:** Lesson horse
```

Place names the maps understand: `Paddock 1`–`Paddock 4`, `Stall 1`–`Stall 4`,
`N Porch`, `S Porch`, `Track 1`–`Track 3`, `Obstacle Pasture`, `Hill Pasture`,
`Pond Pasture`, `Outdoor Arena`, `Round Pen`.

### 🚨 Protocols (list 901717326306) → Products page, when a symptom button is tapped

One task per symptom group, shown above that group's products (this replaced
the old Symptoms tab). Checked every ~10 minutes.

| Site shows | Comes from |
|---|---|
| Which button it belongs to | `Symptom Group` dropdown (same 14 groups as the Indicated For buttons) |
| Red/amber/green badge | `Severity` dropdown: Emergency / Urgent / Progressive |
| "When to call the vet" red box | `Vet Threshold` text field |
| Infographic | The task's **first image attachment** (replace the image to change it; the old bundled graphic is used if there's none) |
| Italic lead line | `## Summary` section |
| Try first → Step 2 → Last resort ladder | `## Try First`, `## Step 2`, `## Last Resort` sections. Each bullet starts with the product name **exactly as spelled in 🧴 Products**, then a colon, e.g. `Cetirizine Hydrochloride 10mg: 10 tablets twice daily…` — that makes it a tappable product. Bullets that don't start with a product name (e.g. `Environmental management: …`) show as plain text |
| Everything else | Any other `## Heading` section, in order: bullets, numbered steps or paragraphs. A heading starting `Do NOT` is drawn as a red box; one containing `History` is collapsed |

Only `**bold**` and `_italic_` formatting is kept. Groups with no task yet
show the site's older built-in notes for those symptoms.

### 🧬 Experiments (list 901715740404) → Experiments tab

Status **`active`** = running. `Hypothesis`, `Target Symptom` and `🐾 Animal`
fields plus the task's start/due dates are shown. Horses on the same protocol
are separate tasks with **identical Target Symptom text** — that shared text
is what groups them into one program card.

### Not live (still edited in code)

The older built-in symptom notes (`SYMPTOMS` in `src/data.js`), used only
for symptom groups that don't have a 🚨 Protocols task yet; the bundled copy
of the "🚨 Barn Protocols" doc (`src/protocols/`), used only if the Protocols
list can't be reached; Who to Call contacts; map layouts; Feed Buckets oral-med course
detail (`src/bucketData.js`).

### Written by the site itself (not ClickUp)

The shared Paddocks board (who's where) and the Board's team sticky notes are
saved by the site's own backend so staff can use them without a ClickUp
account. Don't try to mirror them into ClickUp.

---

## Part 2 — if Brain produces app code

The app is **Vite + React**, served with its API from one Render service at
`https://keystone-barn.onrender.com`. Claude Code maintains it in the
`KeystoneBarn/keystone-barn` repo; pushes to `main` deploy automatically.

**Do not:**

1. **Bake live data back into the bundle.** Products, feed buckets, protocols,
   experiments, the Board, horse profiles/weights/labs all come from the API
   below. `src/data.js` / `bucketData.js` keep an *offline fallback* copy only.
2. **Call anything external.** The only allowed `fetch` is same-origin
   `/api/*` (relative URLs). No third-party APIs, CDNs, analytics, or
   ClickUp calls from the browser — the ClickUp token lives on the server.
3. **Use `localStorage` as the source of truth** for the Paddocks board or
   notes — they're shared between staff phones via the API.
4. Touch `Dockerfile`, `backend/`, or `render.yaml`.

**Endpoints the app uses** (all JSON, same origin):

| Endpoint | What |
|---|---|
| `GET /api/products` | `{ live, products: [{ id, n, c, v, loc, d, dose, note, warn, rx, exp, url, sx[], retired, img }] }` |
| `GET /api/feeding` | `{ live, by_horse: { Horse: { am: [...], pm: [...] } }, active_task_ids[] }` |
| `GET /api/experiments` | live experiment programs |
| `GET /api/protocols` | `{ live, protocols: { "Colic": { severity, vet, summary, img, ladder: [{tier, label, items[]}], sections: [{title, blocks}] } } }` |
| `GET /api/board` | `{ upcoming: [{ horse, title, due }], watch: [{ horse, title, alert }] }` |
| `GET /api/horses` | `{ horses: { Horse: { profile: {Label: value}, weights: [{date, lb}], labs: [{test, value, unit, ref, flag, date}] } } }` |
| `GET/PUT /api/locations` | shared Paddocks board: `{ assignments: { Horse: "pad-2" \| "zone-Stall 1" \| … } }` |
| `GET/POST/DELETE /api/board/notes` | Board sticky notes |

Every live endpoint returns `live: false` (or empty) if ClickUp is
unreachable; the app then shows its bundled fallback rather than a blank page.

**Deliverable** if you do produce code: a zip of the changed `src/` files and
a one-paragraph changelog. Claude Code merges it by hand, so describe intent
("add a Hay column to the stall card") as much as code.
