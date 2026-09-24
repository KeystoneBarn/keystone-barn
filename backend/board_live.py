"""
Live "Coming Up" and "Watch List" for the Barn Board landing tab.

Both come from the ClickUp "🐴 Horse Health Log" list (901715510360), the
same list feed_live.py reads for Feed Buckets:

* Coming Up — every open task with a due date from a few days ago through
  the next few weeks. Vet and farrier visits, IM Prascend doses, the last
  Adequan shot, a hand-walk phase change: anything Meghann puts in the log
  with a due date shows up on the board, and drops off when it's closed.
  Overdue items stay on (flagged) for a few days so a missed dose is
  visible rather than silently gone.
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

from clickup_live import BASE, HTTP_TIMEOUT, TOKEN, _dropdown_name, _session
from feed_live import F_ANIMAL, F_NOTE_TYPE, HEALTH_LIST_ID

log = logging.getLogger("board_live")

REFRESH_SECONDS = int(os.environ.get("CLICKUP_BOARD_REFRESH_SECONDS", "300"))
DAYS_BACK = 3      # keep overdue items on the board this long
DAYS_AHEAD = 28    # how far "Coming Up" looks ahead

F_ALERT = "bd1153d1-7eb5-4142-a173-9c6a52829992"
ALERT_RANK = {"Severe": 0, "Moderate": 1, "Mild": 2}
DAY_MS = 86_400_000


def _horse(task):
    raw = _dropdown_name(task, F_ANIMAL) or ""
    return raw.rstrip("🐴🐶🐱🐐🐓").strip() or None


def _title(task, horse):
    """Log tasks are named 'Horse: what' — drop the prefix, the board shows the horse as a chip."""
    name = (task.get("name") or "").strip()
    if horse and name.lower().startswith(horse.lower() + ":"):
        name = name[len(horse) + 1:].strip()
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
        "url": task.get("url"),
    }


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
            upcoming = []
            for t in due:
                if not t.get("due_date"):
                    continue
                it = _item(t)
                it["due"] = int(t["due_date"])
                upcoming.append(it)
            upcoming.sort(key=lambda i: i["due"])

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
    return BOARD.snapshot()
