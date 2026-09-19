"""
Live feed-bucket line items for the Feed Buckets tab.

Why this exists
----------------
Feed Buckets showed AM/PM amounts baked into src/bucketData.js at commit
time — the same staleness problem clickup_live.py already solved for the
Product Cabinet. This module makes the ClickUp "🐴 Horse Health Log"
list (901715510360), filtered to 🌾Feed entries with status "in progress",
the live source for each horse's daily AM/PM bucket.

Scoped deliberately to feed/supplement line items only — a horse's Value +
Unit + Product + AM/PM fields map cleanly onto a bucket line. Medication
courses and tapers (💊Treatment entries — Hugo's Dex taper, Qu's
Bute-to-Equioxx handoff, Avelin's post-choke course, etc.) have no
equivalent structure in ClickUp: no start/end dates or taper schedule on
the task, just a flat Value/Unit. Those stay hand-maintained in
bucketData.js's `oralMeds`, exactly as before — this module only ever
supplies `am`/`pm`.

One thing IS live for courses, though: whether they're still running.
`active_task_ids` carries every task id that matched the "in progress"
filter this cycle, across the whole Health Log, not just 🌾Feed entries —
so a course tagged with its ClickUp task id in bucketData.js can be
dropped by the frontend the moment that task is marked complete, with no
code change needed.
"""
import logging
import os
import threading
import time

from clickup_live import BASE, HTTP_TIMEOUT, TOKEN, _dropdown_name, _session

log = logging.getLogger("feed_live")

HEALTH_LIST_ID = os.environ.get("CLICKUP_HEALTH_LIST", "901715510360")
REFRESH_SECONDS = int(os.environ.get("CLICKUP_FEED_REFRESH_SECONDS", "300"))

# --- field ids on the Horse Health Log list (verified against the live schema) ---
F_ANIMAL = "5d51bbad-2a7b-4179-94d8-b9440b8f4922"
F_PRODUCT = "8159f668-fe00-4dca-8ed5-f7e7cc626587"
F_VALUE = "1e6e4e2e-863c-4060-addc-921524211049"
F_UNIT = "df597e49-564e-4d50-b196-e990c728b27d"
F_AMPM = "a6574975-8c56-4316-aba0-908b78f959b9"
F_NOTE_TYPE = "c59fdd97-1dab-4492-a0b3-257d62442b36"

FEED_NOTE_TYPE = "🌾Feed"
SINGULAR = {"lbs": "lb", "scoops": "scoop", "tablets": "tablet", "grams": "gram"}


def _horse_name(task):
    """Animal dropdown values carry a trailing species emoji, e.g. 'Mickey🐴'."""
    raw = _dropdown_name(task, F_ANIMAL) or ""
    return raw.rstrip("🐴🐶🐱🐐").strip() or None


def _amount_label(qty, unit):
    if qty is None or not unit:
        return ""
    label = SINGULAR.get(unit, unit) if qty == 1 else unit
    qty_str = f"{qty:g}"
    return f"{qty_str} {label}"


def _fetch_feed_tasks(session):
    tasks, page = [], 0
    while True:
        resp = session.get(
            f"{BASE}/list/{HEALTH_LIST_ID}/task",
            params={"statuses[]": ["in progress"], "subtasks": "false", "page": page},
            timeout=HTTP_TIMEOUT,
        )
        resp.raise_for_status()
        payload = resp.json()
        batch = payload.get("tasks") or []
        tasks.extend(batch)
        if payload.get("last_page", True) or not batch:
            break
        page += 1
        if page > 20:  # hard stop; "in progress" narrows this to a small set
            break
    return tasks


def _to_line(task):
    if _dropdown_name(task, F_NOTE_TYPE) != FEED_NOTE_TYPE:
        return None
    horse = _horse_name(task)
    product = _dropdown_name(task, F_PRODUCT)
    ampm = _dropdown_name(task, F_AMPM)
    unit = _dropdown_name(task, F_UNIT)
    if not (horse and product and ampm):
        return None

    raw_value = None
    for f in task.get("custom_fields") or []:
        if f.get("id") == F_VALUE:
            raw_value = f.get("value")
            break
    try:
        qty = float(raw_value) if raw_value not in (None, "") else None
    except (TypeError, ValueError):
        qty = None

    return {
        "horse": horse,
        "when": ampm.upper(),
        "product": product,
        "qty": qty,
        "unit": unit,
        "amount": _amount_label(qty, unit),
    }


class _FeedCache:
    def __init__(self):
        self.lock = threading.Lock()
        self.by_horse = {}
        self.active_task_ids = set()
        self.fetched_at = 0.0
        self.error = None
        self.refreshing = False

    def enabled(self):
        return bool(TOKEN)

    def snapshot(self):
        with self.lock:
            return {
                "live": bool(self.by_horse),
                "fetched_at": self.fetched_at,
                "age_seconds": round(time.time() - self.fetched_at, 1) if self.fetched_at else None,
                "error": self.error,
                "by_horse": {h: {"am": list(v["am"]), "pm": list(v["pm"])} for h, v in self.by_horse.items()},
                "active_task_ids": sorted(self.active_task_ids),
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
            tasks = _fetch_feed_tasks(session)
            by_horse = {}
            for t in tasks:
                line = _to_line(t)
                if not line:
                    continue
                bucket = by_horse.setdefault(line["horse"], {"am": [], "pm": []})
                key = "am" if line["when"] == "AM" else "pm"
                bucket[key].append({
                    "product": line["product"],
                    "amount": line["amount"],
                    "qty": line["qty"],
                    "unit": line["unit"],
                })
            for h in by_horse.values():
                h["am"].sort(key=lambda i: i["product"])
                h["pm"].sort(key=lambda i: i["product"])
            # Every task here already matched the "in progress" filter server-side,
            # regardless of note type — this is how a finite med course (Bute,
            # Reserpine, a taper) gets to auto-disappear the moment its ClickUp
            # task is marked complete, without a corresponding code change.
            active_task_ids = {t["id"] for t in tasks}
            with self.lock:
                self.by_horse = by_horse
                self.active_task_ids = active_task_ids
                self.fetched_at = time.time()
                self.error = None
            log.info("feed refresh ok: %d horses, %d active tasks", len(by_horse), len(active_task_ids))
        except Exception as exc:
            log.warning("feed refresh failed: %s", exc)
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


FEED = _FeedCache()


def start():
    """Kick off background refreshing. Safe to call when there's no token."""
    if not FEED.enabled():
        log.warning("CLICKUP_TOKEN unset — feed buckets serving bundled data only")
        return
    t = threading.Thread(target=FEED.loop, name="feed-live-refresh", daemon=True)
    t.start()


def feed_payload():
    snap = FEED.snapshot()
    return {
        "live": snap["live"],
        "fetched_at": snap["fetched_at"],
        "age_seconds": snap["age_seconds"],
        "by_horse": snap["by_horse"],
        "active_task_ids": snap["active_task_ids"],
    }
