"""
Live experiment "shell" data for the Experiments tab.

Why this exists
----------------
The Experiments tab showed the pole-work program baked into
src/experimentsData.js at commit time — the 12-week program it described
closed 2026-09-13, and nothing on the site knew that until it was pointed
out and manually fixed. Same staleness class as Products and Feed Buckets.

This module makes the ClickUp "🧬 Experiments" list (901715740404), filtered
to status "active", the live source for which programs are running, which
horses are in each, and their hypothesis/dates.

Scoped deliberately to the experiment "shell" — Hypothesis, Target Symptom,
Animal and the task's start/due dates all map cleanly onto structured
fields. The day-by-day exercise grid itself (which poles, which days,
which gait) is NOT live: it lives in a GPW-generated PDF attached to each
task, not in any structured field ClickUp exposes, so there is nothing to
parse it from. The frontend keeps a hand-transcribed grid per program type
and matches it by Target Symptom; a program whose Target Symptom doesn't
match a known grid still shows live (hypothesis, horses, dates) with no
day-by-day detail, rather than being hidden.

Horses running the identical protocol (e.g. Linka/Mickey/Tammy all on the
Topline plan) are separate ClickUp tasks, one per horse, that happen to
share the same Target Symptom text — that shared text is exactly how this
module groups them into one program card.
"""
import logging
import os
import threading
import time

from clickup_live import BASE, HTTP_TIMEOUT, TOKEN, _dropdown_name, _raw_value, _session

log = logging.getLogger("experiments_live")

EXPERIMENTS_LIST_ID = os.environ.get("CLICKUP_EXPERIMENTS_LIST", "901715740404")
REFRESH_SECONDS = int(os.environ.get("CLICKUP_EXPERIMENTS_REFRESH_SECONDS", "300"))

# --- field ids on the Experiments list (verified against the live schema) ---
F_HYPOTHESIS = "4868f580-fd7c-493e-96aa-5df05a9ea0ba"
F_TARGET_SYMPTOM = "64255ace-7add-48aa-bad4-a13b73516d02"
F_ANIMAL = "5d51bbad-2a7b-4179-94d8-b9440b8f4922"


def _horse_name(task):
    raw = _dropdown_name(task, F_ANIMAL) or ""
    return raw.rstrip("🐴🐶🐱🐐").strip() or None


def _status(task):
    raw = task.get("status")
    if isinstance(raw, dict):
        return (raw.get("status") or "").lower()
    return (raw or "").lower()


def _fetch_active_tasks(session):
    tasks, page = [], 0
    while True:
        resp = session.get(
            f"{BASE}/list/{EXPERIMENTS_LIST_ID}/task",
            params={"statuses[]": ["active"], "subtasks": "false", "page": page},
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


def _to_entry(task):
    horse = _horse_name(task)
    target_symptom = (_raw_value(task, F_TARGET_SYMPTOM) or "").strip()
    if not (horse and target_symptom):
        return None
    return {
        "horse": horse,
        "target_symptom": target_symptom,
        "hypothesis": (_raw_value(task, F_HYPOTHESIS) or "").strip(),
        "start_date": task.get("start_date"),
        "due_date": task.get("due_date"),
        "url": task.get("url"),
        "updated": task.get("date_updated"),
    }


class _ExperimentsCache:
    def __init__(self):
        self.lock = threading.Lock()
        self.programs = []
        self.fetched_at = 0.0
        self.error = None
        self.refreshing = False

    def enabled(self):
        return bool(TOKEN)

    def snapshot(self):
        with self.lock:
            return {
                "live": bool(self.programs),
                "fetched_at": self.fetched_at,
                "age_seconds": round(time.time() - self.fetched_at, 1) if self.fetched_at else None,
                "error": self.error,
                "programs": [dict(p, horses=list(p["horses"])) for p in self.programs],
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
            tasks = _fetch_active_tasks(session)
            entries = [e for e in (_to_entry(t) for t in tasks) if e]

            # Group tasks that share a Target Symptom into one program — that
            # shared text is what ties Linka/Mickey/Tammy's separate Topline
            # tasks together into a single card.
            grouped = {}
            for e in entries:
                key = e["target_symptom"].strip().lower()
                g = grouped.setdefault(key, {
                    "target_symptom": e["target_symptom"],
                    "horses": [],
                    "hypothesis": e["hypothesis"],
                    "start_date": e["start_date"],
                    "due_date": e["due_date"],
                    "url": e["url"],
                })
                g["horses"].append(e["horse"])
                # Prefer the most recently updated task's hypothesis/dates/url —
                # they're near-identical per horse, but this keeps one
                # consistent choice instead of "whichever came back first".
                if (e["updated"] or "0") > (g.get("_updated") or "0"):
                    g["hypothesis"] = e["hypothesis"]
                    g["start_date"] = e["start_date"]
                    g["due_date"] = e["due_date"]
                    g["url"] = e["url"]
                    g["_updated"] = e["updated"]

            programs = []
            for g in grouped.values():
                g.pop("_updated", None)
                g["horses"] = sorted(g["horses"])
                programs.append(g)
            programs.sort(key=lambda p: p["target_symptom"])

            with self.lock:
                self.programs = programs
                self.fetched_at = time.time()
                self.error = None
            log.info("experiments refresh ok: %d programs", len(programs))
        except Exception as exc:
            log.warning("experiments refresh failed: %s", exc)
            with self.lock:
                self.error = str(exc)
        finally:
            with self.lock:
                self.refreshing = False

    def loop(self):
        while True:
            self.refresh()
            time.sleep(max(60, REFRESH_SECONDS))


CACHE = _ExperimentsCache()


def start():
    """Kick off background refreshing. Safe to call when there's no token."""
    if not CACHE.enabled():
        log.warning("CLICKUP_TOKEN unset — experiments serving bundled data only")
        return
    t = threading.Thread(target=CACHE.loop, name="experiments-live-refresh", daemon=True)
    t.start()


def experiments_payload():
    snap = CACHE.snapshot()
    return {
        "live": snap["live"],
        "fetched_at": snap["fetched_at"],
        "age_seconds": snap["age_seconds"],
        "programs": snap["programs"],
    }
