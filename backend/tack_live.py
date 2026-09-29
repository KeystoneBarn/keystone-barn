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
"""
import logging
import os
import re
import threading
import time

from clickup_live import BASE, HTTP_TIMEOUT, TOKEN, _dropdown_name, _field, _options, _raw_value, _session

log = logging.getLogger("tack_live")

TACK_LIST_ID = os.environ.get("CLICKUP_TACK_LIST", "901717141323")
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

TRAILING_NOTE = re.compile(r"^(.*?)\s*\(([^()]*)\)\s*$")


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


class _TackCache:
    def __init__(self):
        self.lock = threading.Lock()
        self.horses = []
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
            horses = build(_fetch_tasks(_session()))
            with self.lock:
                self.horses = horses
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
    }
