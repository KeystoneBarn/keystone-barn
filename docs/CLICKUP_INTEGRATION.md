# Keystone Barn — brief for the ClickUp Brain² frontend

Give this to the Brain² agent whenever it produces a new version of the
Keystone Barn Resources app.

## How it's deployed

The React app you generate (`src/`, Vite build) is **not hosted by ClickUp**.
It runs on one Render service where a small **FastAPI backend serves the
built app and a JSON API from the same origin**:

```
https://keystone-barn.onrender.com
  /                -> your built React app (dist/)
  /assets/*        -> your bundled JS/CSS/images
  /images/*        -> product photos (legacy, still served)
  /api/*           -> backend JSON API (see below)
```

Because it's the same origin, the app can call the API with **plain
relative URLs** (`fetch("/api/locations")`) — no base URL, no CORS, no
API keys, no auth.

## What must NOT change (integration will break otherwise)

1. **Stay a Vite + React app** with the current structure:
   `index.html` → `src/main.jsx` → `src/App.jsx`; images imported from
   `src/img/` as ES modules; everything client-side.
2. **No external network calls.** The only allowed `fetch` is same-origin
   `/api/*`. No third-party APIs, analytics, fonts-from-JS, CDNs.
3. **The Horse Locations / Paddocks tab must persist to the backend, not
   `localStorage`.** See the contract below. This is the one hard rule —
   the board is shared between staff phones, so browser storage is not
   acceptable as the source of truth.

## What CAN stay as-is

- **Products, Symptoms, Feed Buckets, Tack Board, Experiments** data can
  stay **baked into `src/data.js`** exactly as you do now. The backend has
  equivalent endpoints (below) but the app is not required to use them.
- Keep the `src/data.js` schema stable (see "Data schema" at the end) so
  diffs stay readable.

---

## API reference

### Horse Locations — the board the app MUST use

**`GET /api/locations`**
```json
{ "assignments": { "Mickey": "pad-2", "Qu": "pad-1", ... } , "updated": "2026-08-27T23:56:45.158431+00:00" }
```
`assignments` is a flat map of **horse name → location id**. It is `null`
(and `updated` is `null`) until the first write.

**`PUT /api/locations`**  body:
```json
{ "assignments": { "Mickey": "zone-Round Pen", "Qu": "pad-1", ... } }
```
response: `{ "ok": true, "updated": "2026-08-27T23:56:45..." }`

Rules for the component:
- Location ids are defined by the app (currently `pad-1..pad-4` from
  `PADDOCKS` and `zone-<Name>` from `ZONES`). The backend just stores the
  blob, so any stable id scheme is fine — keep it consistent between
  versions.
- **On mount:** `GET /api/locations`. If `assignments` is non-null, use it
  as the source of truth (overrides any built-in defaults). Then poll
  every ~15s so one person's move shows up for everyone else.
- **On every change (move / reset):** `PUT` the full new map.
- Pause the poll while a move is mid-gesture and for ~8s after a local
  save, so a poll never clobbers an in-progress edit.
- `localStorage` may be kept as an offline cache, but the server is
  authoritative.

Reference implementation (this is what's in `src/Paddocks.jsx` today —
regenerate around it, don't drop it):

```jsx
import { useState, useEffect, useRef } from "react";

const API = import.meta.env.DEV ? "http://localhost:8000" : "";
const LS_KEY = "kb-horse-locations";

// inside the component:
const selectedRef = useRef(null); selectedRef.current = selected;
const lastSavedAt = useRef(0);

useEffect(() => {
  let alive = true;
  const pull = async () => {
    if (selectedRef.current) return;
    if (Date.now() - lastSavedAt.current < 8000) return;
    try {
      const r = await fetch(API + "/api/locations");
      if (!r.ok) return;
      const data = await r.json();
      if (alive && data && data.assignments) {
        setAssignments(data.assignments);
        try { localStorage.setItem(LS_KEY, JSON.stringify(data.assignments)); } catch (e) {}
      }
    } catch (e) {}
  };
  pull();
  const t = setInterval(pull, 15000);
  return () => { alive = false; clearInterval(t); };
}, []);

const save = (next) => {
  setAssignments(next);
  lastSavedAt.current = Date.now();
  try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch (e) {}
  fetch(API + "/api/locations", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assignments: next }),
  }).catch((e) => {});
};
```

### Optional read-only endpoints (app may ignore these)

| Endpoint | Returns |
|---|---|
| `GET /api/products` | `[{ name, category, purpose, howto, animals[], storage, rating, notes, status, rx, image }]` |
| `GET /api/symptoms` | `[{ name, products: [productName, ...] }]` |
| `GET /api/feeding`  | `[{ horse, breed, height, paddock, station, age, weight, bucket_color_name, bucket_color, health_notes[], am[], pm[] }]` where `am`/`pm` items are `{ item, canonical, amount, unit }` |

Note: this backend JSON uses a **different, verbose schema** than
`src/data.js`. They are not kept in sync. Don't wire the app to these
unless asked.

### Legacy — do not use

`GET /api/zones`, `POST /api/zones/move`, `POST /api/zones/remove`,
`PATCH /api/zones/{id}/rename`, `PATCH /api/zones/{id}/position` — an older
map-pin model for horse locations. Superseded by `/api/locations`. Still
mounted but the app should not call them.

---

## Data schema in `src/data.js` (keep stable)

```js
export const PRODUCTS = [
  { n: "Name", c: "Category", v: "Verdict"?, loc: "Shelf"?, img: img(NNN)?,
    d: "description", dose: "dosing"?, note: "note"?, rx: true?,
    sx: ["Symptom name", ...]? },
  ...
];

export const SYMPTOMS = [
  // simple:
  { n: "Name", blurb: "what it looks like", vet: "when to call the vet"? },
  // laddered:
  { n: "Name", blurb: "...", rule: "guidance",
    ladder: [ { tier: 1, items: ["Product name", ...] }, ... ] },
  ...
];

export const PADDOCKS = [ { id: 1, name: "Paddock 1", corner: "NW", horses: ["Qu"], note: ""? }, ... ];
export const ZONES    = [ { name: "Track 1", type: "track" }, ... ];  // types: track|pasture|arena|stall|porch
export const HORSE_COLOR = { Mickey: "#2E6E8E", ... };  // the 9 horse names live here
```

Also exported and used by the UI: `CATEGORIES`, `CAT_COLOR`, `CAT_EMOJI`,
`VERDICT`, `LOCATIONS`, `TIERS`, `SX_EMOJI`, `PADDOCK_META`, `CONTACTS`,
`sxLabel()`.

## Deliverable

- The actual **`src/` folder as a zip** (all `.jsx`, `data.js`,
  `theme.css`, and any new files in `src/img/`) — not a preview link.
- A **one-paragraph changelog**: what changed, and explicitly whether the
  **Paddocks / Horse Locations tab** was touched.
- For data-only updates, **`src/data.js` alone** (or the raw product /
  symptom data as JSON) is enough.
