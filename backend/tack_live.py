"""
Live Tack Board from the ClickUp "🧢 Tack Board" list (901717141323).

Why this exists
---------------
The Tack tab showed a copy of the tack setups baked into src/tackData.js at
commit time, so every fitting change in ClickUp needed a code edit and a
deploy before barn staff saw it. Same staleness class as Products and Feed
Buckets; this makes the list itself the source.

List shape (verified against the live list 2026-09-28):

* One top-level task per horse, named with the horse's barn name. It carries
  the horse-wide kit: `Bit`, `Breast Collar`, `Boots` dropdowns and a
  `Fit Notes` text field.
* One subtask per saddle option, named `<Horse>: <emoji> <saddle> (note)`.
  It carries `Saddle`, `Pad`, `Preference Rank` (1st/2nd/3rd/Alt) and its
  own `Fit Notes`.
* Status `active` = current. `retired` / `completed` drop it off the board,
  for horses and for individual saddles alike.

Dropdown names and colors are resolved from each field's own type_config
(clickup_live._dropdown_name), so a new saddle, pad or bit added in ClickUp
shows up without a code change.

Blankets come from the "🚜 Tack & Equipment" list (901716108644): any active
task whose Item Type is "Blanket", or whose name says blanket / sheet / rug /
turnout / cooler (the first ones, 2026-10-29, are Item Type "Other"). Each
carries `Size`, `Brand`, the `Horses` labels and a description with
"Fill: 200g" and the maker's band, "approximately 10°F to 46°F". The site
picks tonight's blanket per horse from those bands (src/blanketConfig.js).
"""
import logging
import os
import re
import threading
import time

from clickup_live import BASE, HTTP_TIMEOUT, TOKEN, _dropdown_name, _field, _options, _raw_value, _session

log = logging.getLogger("tack_live")

TACK_LIST_ID = os.environ.get("CLICKUP_TACK_LIST", "901717141323")
EQUIPMENT_LIST_ID = os.environ.get("CLICKUP_EQUIPMENT_LIST", "901716108644")
REFRESH_SECONDS = int(os.environ.get("CLICKUP_TACK_REFRESH_SECONDS", "300"))

# --- field ids on the Tack Board list (verified against the live schema) ---
F_BREAST_COLLAR = "7572bc22-4f95-42d3-a5a7-159ed88a3f33"
F_BIT = "30ff4186-c350-44a9-b52f-8cc65ac2e612"
F_PAD = "97e79722-8492-4ed4-9c50-140b274a8222"
F_BOOTS = "92d2b46b-5131-4617-969f-cbc0f1424b6d"
F_SADDLE = "051be524-7ab0-4a23-aa13-421aefbf4136"
F_FIT_NOTES = "00ca4a43-3bfc-4ee1-bbfb-44df3d732a41"
F_RANK = "982e1aff-d821-4cb1-ab04-91cdfc692541"
F_ANIMAL = "5d51bbad-2a7b-4179-94d8-b9440b8f4922"

# --- field ids on the Tack & Equipment list (blankets) ---
F_ITEM_TYPE = "a0b725a3-5e5b-4f94-9db3-cf8ad3ca6f64"
F_SIZE = "f6ec9ad0-f121-4642-8bed-60637cd4e72b"
F_BRAND = "3e9125e5-464c-4938-b769-1fc53b3bb057"
F_HORSES = "556dcded-9e5e-4856-b504-c9973222bc93"

TRAILING_NOTE = re.compile(r"^(.*?)\s*\(([^()]*)\)\s*$")
BLANKET_WORD = re.compile(r"\b(blanket|sheet|rug|turnout|cooler)s?\b", re.I)
FILL_LINE = re.compile(r"fill:\s*(\d+)\s*g", re.I)
GRAMS = re.compile(r"\b(\d{2,4})\s*g\b", re.I)
BAND = re.compile(r"(-?\d+)\s*°?\s*F\s*(?:to|–|—|-)\s*(-?\d+)\s*°?\s*F", re.I)
SIZE_LINE = re.compile(r"blanket size:\s*(\d+(?:\.\d+)?)", re.I)


def _status(task):
    raw = task.get("status")
    if isinstance(raw, dict):
        return (raw.get("status") or "").lower()
    return (raw or "").lower()


def _none_if_none(value):
    """The list uses a literal "None" option to mean 'not used'."""
    return None if (value or "").strip().lower() in ("", "none") else value


def _dropdown_option(task, field_id):
    """-> (name, color, orderindex) of the chosen option, or (None, None, None)."""
    name = _dropdown_name(task, field_id)
    if not name:
        return None, None, None
    for opt in _options(_field(task, field_id)):
        if (opt.get("name") or opt.get("label")) == name:
            return name, opt.get("color"), opt.get("orderindex")
    return name, None, None


def _text(task, field_id):
    return (_raw_value(task, field_id) or "").strip() or None


def _horse_name(task):
    raw = _dropdown_name(task, F_ANIMAL) or ""
    name = raw.rstrip("🐴🐶🐱🐐🐓").strip()
    if name:
        return name
    return (task.get("name") or "").split(":", 1)[0].strip() or None


def _split_saddle_name(task_name, horse):
    """"Linka: 🩷 Pink Saddle (use 2 back billets)" -> ("🩷 Pink Saddle", "use 2 back billets")."""
    label = task_name.strip()
    if ":" in label:
        head, rest = label.split(":", 1)
        if not horse or head.strip().lower() == horse.lower():
            label = rest.strip()
    m = TRAILING_NOTE.match(label)
    if m and m.group(1):
        return m.group(1).strip(), m.group(2).strip() or None
    return label, None


def _fetch_tasks(session):
    tasks, page = [], 0
    while True:
        resp = session.get(
            f"{BASE}/list/{TACK_LIST_ID}/task",
            params={"include_closed": "true", "subtasks": "true", "page": page},
            timeout=HTTP_TIMEOUT,
        )
        resp.raise_for_status()
        payload = resp.json()
        batch = payload.get("tasks") or []
        tasks.extend(batch)
        if payload.get("last_page", True) or not batch:
            break
        page += 1
        if page > 20:
            break
    return tasks


def _to_saddle(task, horse):
    label, name_note = _split_saddle_name(task.get("name") or "", horse)
    saddle, color, _ = _dropdown_option(task, F_SADDLE)
    rank, _, rank_order = _dropdown_option(task, F_RANK)
    notes = [n for n in (name_note, _text(task, F_FIT_NOTES)) if n]
    return {
        "id": task.get("id"),
        "label": label,
        "saddle": saddle,
        "color": color,
        "pad": _none_if_none(_dropdown_name(task, F_PAD)),
        "rank": rank,
        "rank_order": rank_order,
        "note": " · ".join(notes) or None,
        "url": task.get("url"),
    }


def _to_horse(task):
    collar = _none_if_none(_dropdown_name(task, F_BREAST_COLLAR))
    return {
        "id": task.get("id"),
        "horse": _horse_name(task),
        "bit": _dropdown_name(task, F_BIT),
        "breast_collar": collar,
        "boots": _none_if_none(_dropdown_name(task, F_BOOTS)),
        "pad": _none_if_none(_dropdown_name(task, F_PAD)),
        "notes": _text(task, F_FIT_NOTES),
        "url": task.get("url"),
        "saddles": [],
    }


def build(tasks):
    """Raw list tasks -> [horse, ...] with active saddles ranked 1st → Alt."""
    parents = {t["id"]: t for t in tasks if not t.get("parent")}
    horses = {}
    for pid, t in parents.items():
        if _status(t) != "active":
            continue
        h = _to_horse(t)
        if h["horse"]:
            horses[pid] = h

    for t in tasks:
        pid = t.get("parent")
        if not pid or pid not in horses or _status(t) != "active":
            continue
        horses[pid]["saddles"].append(_to_saddle(t, horses[pid]["horse"]))

    out = []
    for h in horses.values():
        # Unranked saddles sort after Alt, keeping ClickUp's own order among ties.
        h["saddles"].sort(key=lambda s: 99 if s["rank_order"] is None else s["rank_order"])
        out.append(h)
    out.sort(key=lambda h: h["horse"].lower())
    return out


def _labels(task, field_id):
    """Label field -> option names (the value is a list of option ids)."""
    f = _field(task, field_id)
    ids = (f or {}).get("value") or []
    names = {o.get("id"): (o.get("label") or o.get("name")) for o in _options(f)}
    out = []
    for v in ids:
        if isinstance(v, dict):
            out.append(v.get("label") or v.get("name"))
        else:
            out.append(names.get(v))
    return [n for n in out if n]


def is_blanket(task):
    if (_dropdown_name(task, F_ITEM_TYPE) or "").lower() == "blanket":
        return True
    return bool(BLANKET_WORD.search(task.get("name") or ""))


def _clean_blanket_name(name, horses):
    """'Bucas … 200g with neck piece (84", Qu)' -> 'Bucas … 200g with neck piece'."""
    m = TRAILING_NOTE.match(name or "")
    if m and m.group(1):
        inside = m.group(2)
        if '"' in inside or any(h.lower() in inside.lower() for h in horses):
            return m.group(1).strip()
    return (name or "").strip()


def to_blanket(task):
    desc = task.get("markdown_description") or task.get("text_content") or task.get("description") or ""
    name = task.get("name") or ""
    horses = _labels(task, F_HORSES)
    if not horses:
        h = _horse_name(task) if _dropdown_name(task, F_ANIMAL) else None
        horses = [h] if h else []
    fill = FILL_LINE.search(desc) or GRAMS.search(name)
    fill_g = int(fill.group(1)) if fill else (0 if re.search(r"\bsheet\b", name, re.I) else None)
    band = BAND.search(desc) or BAND.search(name)
    size = _text(task, F_SIZE)
    if not size:
        m = SIZE_LINE.search(desc)
        size = f'{m.group(1)}"' if m else None
    low, high = (sorted([int(band.group(1)), int(band.group(2))]) if band else (None, None))
    return {
        "id": task.get("id"),
        "name": _clean_blanket_name(name, horses),
        "brand": _text(task, F_BRAND),
        "size": size,
        "horses": horses,
        "fill_g": fill_g,
        "neck": bool(re.search(r"\bneck\b|\bhood\b", name, re.I)),
        "waterproof": bool(re.search(r"waterproof|turnout", name + " " + desc, re.I)),
        "low_f": low,
        "high_f": high,
        "notes": _text(task, F_FIT_NOTES),
    }


def build_blankets(tasks):
    out = [to_blanket(t) for t in tasks if _status(t) == "active" and is_blanket(t)]
    out.sort(key=lambda b: (b["horses"][0].lower() if b["horses"] else "~", b["fill_g"] or 0))
    return out


def _fetch_blankets(session):
    tasks, page = [], 0
    while True:
        resp = session.get(
            f"{BASE}/list/{EQUIPMENT_LIST_ID}/task",
            params={"include_markdown_description": "true", "page": page},
            timeout=HTTP_TIMEOUT,
        )
        resp.raise_for_status()
        payload = resp.json()
        batch = payload.get("tasks") or []
        tasks.extend(batch)
        if payload.get("last_page", True) or not batch:
            break
        page += 1
        if page > 20:
            break
    return build_blankets(tasks)


class _TackCache:
    def __init__(self):
        self.lock = threading.Lock()
        self.horses = []
        self.blankets = []
        self.fetched_at = 0.0
        self.error = None
        self.refreshing = False

    def enabled(self):
        return bool(TOKEN)

    def snapshot(self):
        with self.lock:
            return {
                "live": bool(self.horses),
                "fetched_at": self.fetched_at,
                "age_seconds": round(time.time() - self.fetched_at, 1) if self.fetched_at else None,
                "error": self.error,
                "horses": [dict(h, saddles=[dict(s) for s in h["saddles"]]) for h in self.horses],
                "blankets": [dict(b) for b in self.blankets],
            }

    def refresh(self):
        if not self.enabled():
            with self.lock:
                self.error = "CLICKUP_TOKEN is not set"
            return
        with self.lock:
            if self.refreshing:
                return
            self.refreshing = True
        try:
            session = _session()
            horses = build(_fetch_tasks(session))
            try:
                blankets = _fetch_blankets(session)
            except Exception as exc:  # a blanket hiccup shouldn't blank the saddles
                log.warning("blanket refresh failed: %s", exc)
                with self.lock:
                    blankets = self.blankets
            with self.lock:
                self.horses = horses
                self.blankets = blankets
                self.fetched_at = time.time()
                self.error = None
            log.info("tack refresh ok: %d horses", len(horses))
        except Exception as exc:
            log.warning("tack refresh failed: %s", exc)
            with self.lock:
                # Keep serving the previous snapshot; only record the error.
                self.error = str(exc)
        finally:
            with self.lock:
                self.refreshing = False

    def loop(self):
        while True:
            self.refresh()
            time.sleep(max(60, REFRESH_SECONDS))


CACHE = _TackCache()


def start():
    """Kick off background refreshing. Safe to call when there's no token."""
    if not CACHE.enabled():
        log.warning("CLICKUP_TOKEN unset — tack board serving bundled data only")
        return
    t = threading.Thread(target=CACHE.loop, name="tack-live-refresh", daemon=True)
    t.start()


def tack_payload():
    snap = CACHE.snapshot()
    return {
        "live": snap["live"],
        "fetched_at": snap["fetched_at"],
        "age_seconds": snap["age_seconds"],
        "horses": snap["horses"],
        "blankets": snap["blankets"],
    }
