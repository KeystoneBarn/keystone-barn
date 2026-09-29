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

Hypothesis, Target Symptom, Animal and the task's start/due dates come
from structured fields. Everything else comes from how the experiments are
already kept in ClickUp, so nothing needs re-entering:

* Day-by-day grid: parsed from the GPW "4-Week Workout Plan" PDF attached
  to the task (see gpw_plan.py). Swap the PDF, the site follows. Parsed
  once per attachment id, not every refresh.
* Weekly focus: the "GPW <Plan> Plan: Weekly Focus Summaries" comment,
  split into "Week N: Title" sections. Only used when <Plan> matches the
  plan PDF's title, so a summary posted on the wrong task doesn't show up
  on the wrong program.
* Session log: comments that start with a date ("9/13: ..."), newest
  first, tagged with the horse.

A program with no parseable plan PDF still shows live (hypothesis, horses,
dates, log); the frontend then falls back to its bundled grid if it has one.

Horses running the identical protocol (e.g. Linka/Mickey/Tammy all on the
Topline plan) are separate ClickUp tasks, one per horse, that happen to
share the same Target Symptom text — that shared text is exactly how this
module groups them into one program card.
"""
import logging
import os
import re
import threading
import time

from clickup_live import BASE, HTTP_TIMEOUT, TOKEN, _dropdown_name, _raw_value, _session
from gpw_plan import parse_plan

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


PLAN_TITLE = re.compile(r"workout plan", re.I)
FOCUS_HEADER = re.compile(r"^\s*GPW\s+(.+?)\s+Plan:\s*Weekly Focus Summaries", re.I)
FOCUS_WEEK = re.compile(r"^(?:-{3,})?\s*Week\s+(\d+):\s*(.+)$", re.I)
LOG_LINE = re.compile(r"^\s*\d{1,2}/\d{1,2}(?:/\d{2,4})?\s*:")
ATTACHMENT_LINE = re.compile(r"^[0-9a-f-]{36}\.\w+$", re.I)
LOG_LIMIT = 8

# attachment id -> parsed plan (or None). GPW PDFs never change in place;
# a revised plan is a new attachment with a new id.
_plan_cache = {}


def _plan_for(session, task_id):
    resp = session.get(f"{BASE}/task/{task_id}", timeout=HTTP_TIMEOUT)
    resp.raise_for_status()
    # "Welcome to ..." PDFs are the weekly GPW emails, not the plan grid.
    candidates = [
        a for a in resp.json().get("attachments") or []
        if (a.get("extension") or "").lower() == "pdf"
        and PLAN_TITLE.search(a.get("title") or "")
        and not (a.get("title") or "").lower().startswith("welcome")
    ]
    candidates.sort(key=lambda a: a.get("date") or "0", reverse=True)
    for att in candidates:
        if att["id"] not in _plan_cache:
            url = att.get("url") or att.get("url_w_query")
            try:
                pdf = session.get(url, timeout=HTTP_TIMEOUT)
                pdf.raise_for_status()
                _plan_cache[att["id"]] = parse_plan(pdf.content)
            except Exception as exc:
                log.warning("plan pdf %s on %s failed: %s", att.get("title"), task_id, exc)
                continue
        if _plan_cache[att["id"]]:
            return _plan_cache[att["id"]]
    return None


def _parse_focus(text):
    weeks, cur = [], None
    for line in text.splitlines()[1:]:
        # Strip markup/JSON leftovers ("</invoke>", a trailing '"}') that
        # AI-written comments sometimes carry.
        line = re.sub(r'["}\]]+$', "", line.strip()).strip()
        if line.startswith("<"):
            continue
        m = FOCUS_WEEK.match(line)
        if m:
            cur = {"num": int(m.group(1)), "title": m.group(2).strip(), "summary": "", "points": [], "exercises": ""}
            weeks.append(cur)
        elif cur and line:
            if line.lower().startswith("exercises:"):
                cur["exercises"] = line.split(":", 1)[1].strip()
            elif not cur["summary"]:
                cur["summary"] = line
            else:
                cur["points"].append(line)
    return weeks


def _comments_for(session, task_id):
    resp = session.get(f"{BASE}/task/{task_id}/comment", timeout=HTTP_TIMEOUT)
    resp.raise_for_status()
    return resp.json().get("comments") or []


def _focus_and_log(comments, plan_title, horse, start_ms):
    focus, logs = None, []
    for c in comments:
        text = (c.get("comment_text") or "").strip()
        header = FOCUS_HEADER.match(text)
        if header:
            if focus is None and plan_title and header.group(1).strip().lower() == plan_title.lower():
                focus = _parse_focus(text)
            continue
        if not LOG_LINE.match(text) or int(c.get("date") or 0) < int(start_ms or 0):
            continue
        body = "\n".join(l for l in text.splitlines() if not ATTACHMENT_LINE.match(l.strip())).strip()
        logs.append({"horse": horse, "date": c.get("date"), "text": body})
    return focus, logs


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
        "id": task.get("id"),
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
            for e in entries:
                try:
                    e["plan"] = _plan_for(session, e["id"])
                    e["focus"], e["log"] = _focus_and_log(
                        _comments_for(session, e["id"]),
                        (e["plan"] or {}).get("title"), e["horse"], e["start_date"],
                    )
                except Exception as exc:
                    log.warning("experiment detail for %s failed: %s", e["id"], exc)
                    e.setdefault("plan", None)
                    e["focus"], e["log"] = None, []

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
                    "plan": None,
                    "focus": None,
                    "log": [],
                })
                g["horses"].append(e["horse"])
                g["plan"] = g["plan"] or e["plan"]
                g["focus"] = g["focus"] or e["focus"]
                g["log"].extend(e["log"])
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
                # One note posted on each horse's task shows once, with all of them.
                merged = {}
                for l in g["log"]:
                    m = merged.setdefault(l["text"], {"horses": [], "date": l["date"], "text": l["text"]})
                    m["horses"] = sorted(set(m["horses"]) | {l["horse"]})
                    m["date"] = min(m["date"], l["date"], key=lambda d: int(d or 0))
                g["log"] = sorted(merged.values(), key=lambda l: int(l["date"] or 0), reverse=True)[:LOG_LIMIT]
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
