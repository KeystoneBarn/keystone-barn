"""
Live feed-bucket line items for the Feed Buckets tab.

Why this exists
----------------
Feed Buckets showed AM/PM amounts baked into src/bucketData.js at commit
time — the same staleness problem clickup_live.py already solved for the
Product Cabinet. This module makes the ClickUp "🐴 Horse Health Log"
list (901715510360), filtered to 🌾Feed entries with status "in progress",
the live source for each horse's daily AM/PM bucket.

Oral meds are live too (added 2026-09-28): any "in progress" 💊Treatment
entry with the 🪣 AM/PM field set is a bucket med. That field is what already
separates the oral meds (Prascend, Thyro-L, Reserpine…) from injection and
shockwave series, which never carry AM/PM. A med whose task has a start or
due date is a finite course; its logged doses (subtasks, which keep the log
uncluttered) supply "doses given so far" and the most recent dose.

`active_task_ids` still carries every "in progress" task id across the whole
Health Log, for anything in the bundle keyed by task id.
"""
import json
import logging
import os
from datetime import datetime, timedelta, timezone
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
MED_NOTE_TYPE = "💊Treatment"
MED_NOTE_TYPE_ID = "ad3ed7d8-11d9-4290-8c03-1a440dd765de"
# ClickUp all-day dates arrive as 04:00 barn time (09:00 UTC) from the app, but
# as 04:00 UTC (midnight Eastern) from API-created records like the Dex doses.
# Shifting by -4h puts both on the intended day, and keeps a Central-time
# evening dose (01:00-03:00 UTC) on its own day too.
BARN_UTC_OFFSET = timedelta(hours=-4)
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


def _day(ms):
    """ClickUp epoch-ms (string) -> 'YYYY-MM-DD' in barn-local time, or None."""
    if not ms:
        return None
    try:
        dt = datetime.fromtimestamp(int(ms) / 1000, tz=timezone.utc) + BARN_UTC_OFFSET
    except (TypeError, ValueError):
        return None
    return dt.strftime("%Y-%m-%d")


def _qty(task):
    for f in task.get("custom_fields") or []:
        if f.get("id") == F_VALUE:
            try:
                v = f.get("value")
                return float(v) if v not in (None, "") else None
            except (TypeError, ValueError):
                return None
    return None


def _to_med(task, doses):
    """An in-progress 💊Treatment task with AM/PM set -> one oral-med line."""
    if _dropdown_name(task, F_NOTE_TYPE) != MED_NOTE_TYPE:
        return None
    horse = _horse_name(task)
    product = _dropdown_name(task, F_PRODUCT)
    ampm = _dropdown_name(task, F_AMPM)
    if not (horse and product and ampm):
        return None
    qty = _qty(task)
    unit = _dropdown_name(task, F_UNIT)
    start, end = _day(task.get("start_date")), _day(task.get("due_date"))
    med = {
        "horse": horse,
        "when": ampm.upper(),
        "product": product,
        "qty": qty,
        "unit": unit,
        "amount": _amount_label(qty, unit),
        "task_id": task.get("id"),
        "url": task.get("url"),
        "course": {"start": start, "end": end} if (start or end) else None,
        "doses_given": None,
        "last_dose": None,
    }
    given = doses.get(task.get("id")) or []
    if given:
        last = given[-1]
        med["doses_given"] = len(given)
        med["last_dose"] = {"date": last["date"], "amount": last["amount"]}
    return med


def _fetch_dose_subtasks(session):
    """parent id -> completed dose subtasks (oldest first), 💊Treatment only."""
    tasks, page = [], 0
    while True:
        resp = session.get(
            f"{BASE}/list/{HEALTH_LIST_ID}/task",
            params={
                "include_closed": "true",
                "subtasks": "true",
                "custom_fields": json.dumps([{"field_id": F_NOTE_TYPE, "operator": "=", "value": MED_NOTE_TYPE_ID}]),
                "page": page,
            },
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
    doses = {}
    for t in tasks:
        parent = t.get("parent")
        raw = t.get("status")
        status = (raw.get("status") if isinstance(raw, dict) else raw) or ""
        if not parent or status.lower() not in ("complete", "completed", "closed", "done"):
            continue
        qty = _qty(t)
        unit = _dropdown_name(t, F_UNIT)
        doses.setdefault(parent, []).append({
            "date": _day(t.get("due_date") or t.get("date_closed")),
            "amount": _amount_label(qty, unit) or None,
        })
    for v in doses.values():
        v.sort(key=lambda d: d["date"] or "")
    return doses


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
                "by_horse": {h: {"am": list(v["am"]), "pm": list(v["pm"]), "meds": list(v["meds"])} for h, v in self.by_horse.items()},
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
            try:
                doses = _fetch_dose_subtasks(session)
            except Exception as exc:
                # Dose history is a nice-to-have; the meds themselves still show.
                log.warning("dose subtask fetch failed: %s", exc)
                doses = {}
            by_horse = {}
            for t in tasks:
                med = _to_med(t, doses)
                if med:
                    bucket = by_horse.setdefault(med.pop("horse"), {"am": [], "pm": [], "meds": []})
                    bucket["meds"].append(med)
                    continue
                line = _to_line(t)
                if not line:
                    continue
                bucket = by_horse.setdefault(line["horse"], {"am": [], "pm": [], "meds": []})
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
                h["meds"].sort(key=lambda i: (i["course"] is not None, i["product"]))
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
