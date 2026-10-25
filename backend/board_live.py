"""
Live "Coming Up" and "Watch List" for the Barn Board landing tab.

Both come from the ClickUp "🐴 Horse Health Log" list (901715510360), the
same list feed_live.py reads for Feed Buckets:

* Coming Up — open tasks with a due date from a few days ago through the
  next few weeks, limited to the Note Types in COMING_UP_TYPES
  (appointments, treatments, injections, vaccines, dewormers, labs, farrier,
  dental, imaging, surgery, shows). Per-horse records an automation copies
  off an appointment (🙌🏼BodyWork for the chiro visit) stay off. The same
  task on the same day for several horses ("Fecal egg count" × 11) becomes
  one line with every horse on it. Drops off when closed; overdue items stay
  on (flagged) for a few days so a missed dose is visible rather than
  silently gone. Experiment start and end dates (from experiments_live) are
  added as their own lines.
* Watch List — every open task with the "Alert" dropdown set
  (Mild / Moderate / Severe). Clearing Alert or closing the task takes it off.

Team notes are not here: they're written from the board itself and live in
the backend's SQLite database (see main.py), so staff can post without a
ClickUp account.
"""
import json
import logging
import os
import threading
import time
from datetime import datetime
from zoneinfo import ZoneInfo

import experiments_live
from clickup_live import BASE, HTTP_TIMEOUT, TOKEN, _dropdown_name, _session
from feed_live import F_ANIMAL, F_NOTE_TYPE, HEALTH_LIST_ID

log = logging.getLogger("board_live")

REFRESH_SECONDS = int(os.environ.get("CLICKUP_BOARD_REFRESH_SECONDS", "300"))
DAYS_BACK = 3      # keep overdue items on the board this long
DAYS_AHEAD = 28    # how far "Coming Up" looks ahead

F_ALERT = "bd1153d1-7eb5-4142-a173-9c6a52829992"
ALERT_RANK = {"Severe": 0, "Moderate": 1, "Mild": 2}
DAY_MS = 86_400_000
BARN_TZ = ZoneInfo("America/Chicago")

# 📋 Animal Note Type values that belong on Coming Up. Anything else in the
# log (BodyWork records, observations, weights, feed…) stays off the board.
COMING_UP_TYPES = {
    "🏥Appointment", "💊Treatment", "💉Injection", "💉Vaccination", "🪱Dewormer",
    "🩸Labs", "🧲Farrier", "🦷Dental", "🩻Imaging", "🥼Surgery", "💃 Show",
}


def _horse(task):
    raw = _dropdown_name(task, F_ANIMAL) or ""
    return raw.rstrip("🐴🐶🐱🐐🐓").strip() or None


def _title(task, horse):
    """Log tasks are named 'Horse: what' or 'Horse What: …' — drop the horse, the board shows it as a chip."""
    name = (task.get("name") or "").strip()
    if horse and name.lower().startswith(horse.lower()):
        rest = name[len(horse):]
        if rest[:1] in (":", " "):
            name = rest.lstrip(": ").strip() or name
    return name


def _get_all(session, params):
    tasks, page = [], 0
    while True:
        resp = session.get(
            f"{BASE}/list/{HEALTH_LIST_ID}/task",
            params={**params, "subtasks": "true", "page": page},
            timeout=HTTP_TIMEOUT,
        )
        resp.raise_for_status()
        payload = resp.json()
        batch = payload.get("tasks") or []
        tasks.extend(batch)
        if payload.get("last_page", True) or not batch:
            break
        page += 1
        if page > 10:
            break
    return tasks


def _item(task):
    horse = _horse(task)
    return {
        "id": task["id"],
        "horse": horse,
        "title": _title(task, horse),
        "type": _dropdown_name(task, F_NOTE_TYPE),
        "status": (task.get("status") or {}).get("status"),
    }


def _day(ms):
    return datetime.fromtimestamp(int(ms) / 1000, BARN_TZ).date()


def _upcoming(tasks):
    """Coming Up rows: allowed types only, one row per (day, type, task) with every horse on it."""
    rows = {}
    for t in tasks:
        if not t.get("due_date"):
            continue
        it = _item(t)
        if it["type"] not in COMING_UP_TYPES:
            continue
        due = int(t["due_date"])
        key = (_day(due), it["type"], it["title"].lower())
        row = rows.get(key)
        if row is None:
            row = rows[key] = dict(it, due=due, horses=[])
        row["due"] = min(row["due"], due)
        if it["horse"] and it["horse"] not in row["horses"]:
            row["horses"].append(it["horse"])
    out = []
    for row in rows.values():
        row["horses"].sort()
        row["horse"] = row["horses"][0] if len(row["horses"]) == 1 else None
        out.append(row)
    out.sort(key=lambda i: (i["due"], i["title"]))
    return out


def _experiment_dates(programs, now_ms):
    """'Experiment starts / ends' rows for experiments with a date from today through DAYS_AHEAD."""
    today = _day(now_ms)
    last = _day(now_ms + DAYS_AHEAD * DAY_MS)
    out = []
    for p in programs:
        for field, label in (("start_date", "starts"), ("due_date", "ends")):
            ms = p.get(field)
            if not ms or not (today <= _day(ms) <= last):
                continue
            horses = sorted(p.get("horses") or [])
            out.append({
                "id": f"exp-{field}-{p['target_symptom']}",
                "horse": horses[0] if len(horses) == 1 else None,
                "horses": horses,
                "title": f"Experiment {label}: {p['target_symptom']}",
                "type": "👩🏼‍🔬Experiment",
                "status": None,
                "due": int(ms),
            })
    return out


class _BoardCache:
    def __init__(self):
        self.lock = threading.Lock()
        self.upcoming = []
        self.watch = []
        self.fetched_at = 0.0
        self.error = None

    def snapshot(self):
        with self.lock:
            return {
                "live": bool(self.fetched_at),
                "fetched_at": self.fetched_at,
                "error": self.error,
                "upcoming": list(self.upcoming),
                "watch": list(self.watch),
            }

    def refresh(self):
        if not TOKEN:
            with self.lock:
                self.error = "CLICKUP_TOKEN is not set"
            return
        try:
            session = _session()
            now = int(time.time() * 1000)
            due = _get_all(session, {
                "due_date_gt": now - DAYS_BACK * DAY_MS,
                "due_date_lt": now + DAYS_AHEAD * DAY_MS,
                "order_by": "due_date",
                "reverse": "true",
            })
            upcoming = _upcoming(due)

            alerted = _get_all(session, {
                "custom_fields": json.dumps([{"field_id": F_ALERT, "operator": "IS NOT NULL"}]),
            })
            watch = []
            for t in alerted:
                level = _dropdown_name(t, F_ALERT)
                if not level:
                    continue
                it = _item(t)
                it["alert"] = level
                watch.append(it)
            watch.sort(key=lambda i: (ALERT_RANK.get(i["alert"], 9), i["horse"] or "", i["title"]))

            with self.lock:
                self.upcoming = upcoming
                self.watch = watch
                self.fetched_at = time.time()
                self.error = None
            log.info("board refresh ok: %d upcoming, %d watch", len(upcoming), len(watch))
        except Exception as exc:
            log.warning("board refresh failed: %s", exc)
            with self.lock:
                self.error = str(exc)

    def loop(self):
        while True:
            self.refresh()
            time.sleep(max(60, REFRESH_SECONDS))


BOARD = _BoardCache()


def start():
    if not TOKEN:
        log.warning("CLICKUP_TOKEN unset — barn board has no Coming Up / Watch List")
        return
    threading.Thread(target=BOARD.loop, name="board-live-refresh", daemon=True).start()


def board_payload():
    snap = BOARD.snapshot()
    # Experiments refresh on their own loop, so their dates are merged in per request.
    exp = _experiment_dates(experiments_live.CACHE.snapshot().get("programs") or [], int(time.time() * 1000))
    snap["upcoming"] = sorted(snap["upcoming"] + exp, key=lambda i: (i["due"], i["title"]))
    return snap
