"""
Live barn task list for the Tasks tab (the EquineM / Hippovibe replacement):
what each horse needs on each day, from three ClickUp lists in 🐴 Horses —

* 🐴 Horse Health Log — health care only:
  - a task with only a due date      -> one task that day
    ("Chiro: Herd", "Hugo: IV Legend loading dose 2 of 4")
  - a task with start AND due date   -> a daily course, one task on every day
    ("Qu: Banamine paste … daily", "Qu: Stall rest & wrapped")
  - a series parent (open dated subtasks, "Ulyssa: Adequan series" with
    "Dose 1…7") is hidden; each dose subtask is a task on its date
  - records, not jobs, are left out (observations, illness/injury notes,
    labs, vitals, weights, feed/hay) as are meds with 🪣 AM/PM set (the feed
    bucket handles those)
* 🧬 Experiments — the dated pole-work workout subtasks.
* 🏇 Training Log — rides, driving, lunging, groundwork… One task per session,
  `<Horse>: <Activity>`, due = that day. Planned ones (open) show up to be
  checked off; "Log a session" on the site creates a completed one.

Checking a box writes back to ClickUp without adding clutter to the Health Log:

* one-day task (Health Log, Experiments, Training) -> set to complete, plus a
  comment with who did it and their note. A pole-work workout also gets a
  "M/D: …" line on its experiment, which the Experiments tab shows as the
  session log.
* a day of a daily course -> a comment on the course ("✓ Oct 20, 2026 — done
  by Sydney"), not a new task. Doses Meghann logs by hand as completed
  subtasks still count.
Unchecking reopens the task / deletes the site's own comment. Staff never see
ClickUp.
"""
import logging
import os
import re
import threading
import time
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from clickup_live import BASE, HTTP_TIMEOUT, TOKEN, _dropdown_name, _field, _options, _session
from feed_live import F_AMPM, F_ANIMAL, F_NOTE_TYPE, HEALTH_LIST_ID
import experiments_live

log = logging.getLogger("tasks_live")

TRAINING_LIST_ID = os.environ.get("CLICKUP_TRAINING_LIST", "901717915141")
REFRESH_SECONDS = int(os.environ.get("CLICKUP_TASKS_REFRESH_SECONDS", "300"))
DAYS_BACK = 21
DAYS_AHEAD = 180
BARN_TZ = ZoneInfo("America/Chicago")
SITE_MARK = "Checked off on the Keystone Barn site"
LOGGED_MARK = "Logged on the Keystone Barn site"
DONE_STATUSES = ("complete", "completed", "closed", "done")
# "✓ Oct 20, 2026 — done by Sydney." on a course task = that day is done.
COURSE_TICK = re.compile(r"^✓ (\w{3} \d{1,2}, \d{4}) — done(?: by ([^.\n]+))?\.")

ACTIVITIES = ["Ride", "Trail ride", "Drive", "Lunge", "Groundwork", "Strength", "Hand walk", "Other"]

# Note types that are records, not jobs for the day.
SKIP_TYPES = {
    "👀Observation", "😎Behavior", "🤒Illness", "🤕Injury", "🌸In Heat",
    "🌾Feed", "🌾Hay", "🩸Labs", "❤️‍🩹Vitals", "🏠Environmental", "⚖️Weight",
}
KIND_OF_TYPE = {
    "💉Vaccination": "vaccination",
    "🧲Farrier": "farrier",
    "🪱Dewormer": "deworming",
    "💊Treatment": "treatment",
    "💉Injection": "treatment",
    "🥼Surgery": "treatment",
}


# ---------------------------------------------------------------- helpers
def _status(task):
    raw = task.get("status")
    return ((raw.get("status") if isinstance(raw, dict) else raw) or "").lower()


def _is_done(task):
    return _status(task) in DONE_STATUSES


def _day(ms):
    """ClickUp date (ms) -> the barn's calendar day. Due dates are stored as
    local midnight, so converting in UTC would land them a day early."""
    if not ms:
        return None
    return datetime.fromtimestamp(int(ms) / 1000, BARN_TZ).date()


def _day_ms(d):
    return int(datetime(d.year, d.month, d.day, tzinfo=BARN_TZ).timestamp() * 1000)


def _long(d):
    return f"{d.strftime('%b')} {d.day}, {d.year}"


def horse_names(tasks):
    """Barn names of the horses, from the 🐾 Animal dropdown's own options."""
    return list(animal_options(tasks))


def animal_options(tasks):
    """Horse barn name -> 🐾 Animal dropdown option id."""
    for t in tasks:
        f = _field(t, F_ANIMAL)
        if f and _options(f):
            return {o["name"].rstrip("🐴").strip(): o.get("id") for o in _options(f)
                    if (o.get("name") or "").endswith("🐴")}
    return {}


def _horses_for(task, horses):
    raw = _dropdown_name(task, F_ANIMAL) or ""
    if raw:
        return [raw.rstrip("🐴🐶🐱🐐🐓").strip()]
    name = task.get("name") or ""
    return [h for h in horses if re.search(r"\b" + re.escape(h) + r"\b", name, re.I)]


def _title(task, horses):
    """'Qu: Change wrap' -> 'Change wrap'; 'Avelin Vaccination: Flu/Rhino' -> 'Vaccination: Flu/Rhino'."""
    name = (task.get("name") or "").strip()
    if len(horses) == 1:
        name = re.sub(r"^" + re.escape(horses[0]) + r"\b\s*:?\s*", "", name, flags=re.I) or name
    return name


def _kind(task, note_type):
    if note_type in KIND_OF_TYPE:
        return KIND_OF_TYPE[note_type]
    name = task.get("name") or ""
    if re.search(r"\bfarrier\b", name, re.I):
        return "farrier"
    if re.search(r"\bvaccin", name, re.I):
        return "vaccination"
    if re.search(r"\bdeworm", name, re.I):
        return "deworming"
    return "other"


def _note(task):
    """The instructions from the description as short lines, links dropped."""
    text = task.get("text_content") or task.get("description") or ""
    lines = []
    for ln in text.splitlines():
        ln = re.sub(r"https?://\S+", "", ln).replace("**", "").strip(" *-\t")
        if not ln or ln.lower().startswith("from ") or SITE_MARK in ln or LOGGED_MARK in ln:
            continue
        lines.append(ln[:200])
        if len(lines) == 6:
            break
    return lines


def _done_by(task):
    text = task.get("text_content") or task.get("description") or ""
    m = re.search(r"(?:" + SITE_MARK + "|" + LOGGED_MARK + r") by ([^.\n]+)", text)
    return m.group(1).strip() if m else None


def course_ticks(comments):
    """Course comments -> {day: {"by", "comment_id", "site"}} for days ticked on the site."""
    out = {}
    for c in comments or []:
        m = COURSE_TICK.match((c.get("comment_text") or "").strip())
        if not m:
            continue
        try:
            d = datetime.strptime(m.group(1), "%b %d, %Y").date()
        except ValueError:
            continue
        out[d] = {"by": (m.group(2) or "").strip() or None, "comment_id": c.get("id")}
    return out


# ---------------------------------------------------------------- build
def build(tasks, workouts=(), horses=None, today=None, course_comments=None, training=()):
    """Health Log tasks (+ workouts, training sessions) -> list of day items."""
    today = today or datetime.now(BARN_TZ).date()
    lo, hi = today - timedelta(days=DAYS_BACK), today + timedelta(days=DAYS_AHEAD)
    horses = horses if horses is not None else horse_names(tasks)
    course_comments = course_comments or {}
    by_id = {t["id"]: t for t in tasks}
    children = {}
    for t in tasks:
        if t.get("parent") in by_id:
            children.setdefault(t["parent"], []).append(t)

    items = []

    def add(t, d, **extra):
        if d is None or not (lo <= d <= hi):
            return
        note_type = _dropdown_name(t, F_NOTE_TYPE)
        hs = _horses_for(t, horses)
        items.append({
            "key": f"{t['id']}:{d.isoformat()}",
            "date": d.isoformat(),
            "horses": hs,
            "title": _title(t, hs),
            "kind": _kind(t, note_type),
            "type": note_type,
            "note": _note(t),
            "comment_ids": [],
            **extra,
        })

    for t in tasks:
        note_type = _dropdown_name(t, F_NOTE_TYPE)
        if note_type in SKIP_TYPES or _dropdown_name(t, F_AMPM):
            continue
        parent = by_id.get(t.get("parent"))
        if parent is not None and is_course(parent, children):
            continue  # a dose Meghann logged by hand, folded into its course below
        if not t.get("due_date") or (not parent and children.get(t["id"]) and not is_course(t, children)):
            continue  # undated, or a series parent
        if is_course(t, children):
            logged = {}
            for c in children.get(t["id"], []):
                if _is_done(c):
                    logged.setdefault(_day(c.get("due_date") or c.get("date_closed")), True)
            ticks = course_ticks(course_comments.get(t["id"]))
            d, end = _day(t["start_date"]), _day(t["due_date"])
            while d <= end:
                tick = ticks.get(d)
                done = bool(tick) or d in logged
                if done or not _is_done(t):
                    add(t, d, mode="course", task_id=t["id"], list_id=HEALTH_LIST_ID, done=done,
                        done_by=tick["by"] if tick else None, course=True)
                    if tick:
                        items[-1]["comment_ids"] = [tick["comment_id"]]
                d += timedelta(days=1)
        else:
            add(t, _day(t["due_date"]), mode="close", task_id=t["id"], list_id=HEALTH_LIST_ID,
                done=_is_done(t), done_by=_done_by(t), status=_status(t))

    for w in workouts:
        if not w.get("id") or not w.get("date"):
            continue
        d = _day(w["date"])
        if not (lo <= d <= hi):
            continue
        items.append({
            "key": f"{w['id']}:{d.isoformat()}",
            "date": d.isoformat(),
            "horses": [w["horse"]] if w.get("horse") else [],
            "title": "Pole work: " + (w.get("title") or "workout"),
            "kind": "exercise",
            "type": "👩🏼‍🔬Experiment",
            "note": [x for x in (w.get("focus"), w.get("how")) if x][:1],
            "mode": "close",
            "task_id": w["id"],
            "experiment_id": w.get("parent"),
            "list_id": experiments_live.EXPERIMENTS_LIST_ID,
            "done": bool(w.get("done")),
            "done_by": None,
            "status": "complete" if w.get("done") else "",
            "comment_ids": [],
        })

    for t in training:
        d = _day(t.get("due_date"))
        if d is None or not (lo <= d <= hi):
            continue
        hs = _horses_for(t, horses)
        items.append(training_item(t, d, hs))

    items.sort(key=lambda i: (i["date"], i["kind"] != "treatment", i["title"]))
    return items, horses


def is_course(t, children):
    if t.get("parent") or not t.get("start_date") or not t.get("due_date"):
        return False
    if _day(t["start_date"]) >= _day(t["due_date"]):
        return False
    # Pre-scheduled open subtasks make it a series (each dose is its own task).
    return not any(not _is_done(c) for c in children.get(t["id"], []))


def training_item(t, d, hs):
    return {
        "key": f"{t['id']}:{d.isoformat()}",
        "date": d.isoformat(),
        "horses": hs,
        "title": _title(t, hs),
        "kind": "training",
        "type": None,
        "note": _note(t),
        "mode": "close",
        "task_id": t["id"],
        "list_id": TRAINING_LIST_ID,
        "done": _is_done(t),
        "done_by": _done_by(t),
        "status": _status(t),
        "comment_ids": [],
    }


# ---------------------------------------------------------------- fetch
def _window_params():
    now = datetime.now(BARN_TZ).date()
    return {
        "include_closed": "true",
        "subtasks": "true",
        "due_date_gt": _day_ms(now - timedelta(days=DAYS_BACK + 1)),
        "due_date_lt": _day_ms(now + timedelta(days=DAYS_AHEAD + 1)),
    }


def _fetch_list(session, list_id):
    tasks, page = [], 0
    while page <= 20:
        resp = session.get(f"{BASE}/list/{list_id}/task", params={**_window_params(), "page": page},
                           timeout=HTTP_TIMEOUT)
        resp.raise_for_status()
        payload = resp.json()
        batch = payload.get("tasks") or []
        tasks.extend(batch)
        if payload.get("last_page", True) or not batch:
            break
        page += 1
    return tasks


def _fetch_course_comments(session, tasks):
    children = {}
    for t in tasks:
        if t.get("parent"):
            children.setdefault(t["parent"], []).append(t)
    out = {}
    for t in tasks:
        if is_course(t, children) and not _is_done(t):
            resp = session.get(f"{BASE}/task/{t['id']}/comment", timeout=HTTP_TIMEOUT)
            resp.raise_for_status()
            out[t["id"]] = resp.json().get("comments") or []
    return out


def _workouts():
    out = []
    for p in experiments_live.experiments_payload().get("programs") or []:
        out.extend(p.get("workouts") or [])
    return out


class _TasksCache:
    def __init__(self):
        self.lock = threading.Lock()
        self.items = []
        self.horses = []
        self.animals = {}
        self.fetched_at = 0.0
        self.error = None
        self.statuses = {}

    def snapshot(self):
        with self.lock:
            return {
                "live": bool(self.fetched_at),
                "fetched_at": self.fetched_at,
                "error": self.error,
                "today": datetime.now(BARN_TZ).date().isoformat(),
                "horses": list(self.horses),
                "activities": ACTIVITIES,
                "items": [_public(i) for i in self.items],
            }

    def refresh(self):
        if not TOKEN:
            with self.lock:
                self.error = "CLICKUP_TOKEN is not set"
            return
        try:
            session = _session()
            tasks = _fetch_list(session, HEALTH_LIST_ID)
            training = _fetch_list(session, TRAINING_LIST_ID)
            comments = _fetch_course_comments(session, tasks)
            items, horses = build(tasks, _workouts(), course_comments=comments, training=training)
            with self.lock:
                self.items, self.horses = items, horses
                self.animals = animal_options(tasks) or self.animals
                self.fetched_at = time.time()
                self.error = None
            log.info("tasks refresh ok: %d items", len(items))
        except Exception as exc:
            log.warning("tasks refresh failed: %s", exc)
            with self.lock:
                self.error = str(exc)

    def loop(self):
        while True:
            self.refresh()
            time.sleep(max(60, REFRESH_SECONDS))

    def find(self, key):
        with self.lock:
            return next((i for i in self.items if i["key"] == key), None)


def _public(item):
    """What the browser gets: no ClickUp ids or list ids, just the key."""
    return {k: item.get(k) for k in ("key", "date", "horses", "title", "kind", "type", "note", "done", "done_by", "mode")}


CACHE = _TasksCache()


# ---------------------------------------------------------------- write-back
def _statuses(session, list_id):
    """-> (first open status, closed status) of a list; lists differ."""
    if list_id not in CACHE.statuses:
        resp = session.get(f"{BASE}/list/{list_id}", timeout=HTTP_TIMEOUT)
        resp.raise_for_status()
        statuses = resp.json().get("statuses") or []
        opened = next((s["status"] for s in statuses if s.get("type") == "open"), "to do")
        closed = next((s["status"] for s in statuses if s.get("type") == "closed"), "complete")
        CACHE.statuses[list_id] = (opened, closed)
    return CACHE.statuses[list_id]


def _comment(session, task_id, text):
    resp = session.post(f"{BASE}/task/{task_id}/comment",
                        json={"comment_text": text, "notify_all": False}, timeout=HTTP_TIMEOUT)
    resp.raise_for_status()
    return str(resp.json().get("id") or "")


def _clean(text, limit):
    return re.sub(r"\s+", " ", (text or "").strip())[:limit] or None


def check(key, done, by=None, note=None):
    """Tick or untick one item. Returns the updated public item."""
    item = CACHE.find(key)
    if not item:
        raise LookupError("unknown task")
    by, note = _clean(by, 40), _clean(note, 1000)
    d = date.fromisoformat(item["date"])
    session = _session()
    new_comments = []
    if item["mode"] == "course":
        if done:
            text = f"✓ {_long(d)} — done{' by ' + by if by else ''}." + (f"\nNote: {note}" if note else "")
            new_comments.append(_comment(session, item["task_id"], text))
        else:
            if not item.get("comment_ids"):
                raise PermissionError("This day was logged in ClickUp, not on the site. Ask Meghann to change it.")
            for cid in item["comment_ids"]:
                session.delete(f"{BASE}/comment/{cid}", timeout=HTTP_TIMEOUT).raise_for_status()
            item["comment_ids"] = []
    else:
        opened, closed = _statuses(session, item["list_id"])
        prev = item.get("status") or ""
        status = closed if done else (prev if prev and prev not in DONE_STATUSES else opened)
        session.put(f"{BASE}/task/{item['task_id']}", json={"status": status},
                    timeout=HTTP_TIMEOUT).raise_for_status()
        if done:
            text = f"{SITE_MARK}{' by ' + by if by else ''}." + (f"\nNote: {note}" if note else "")
            new_comments.append(_comment(session, item["task_id"], text))
            if item.get("experiment_id"):
                # The Experiments tab reads "M/D: …" comments on the experiment as its session log.
                horse = (item["horses"] or [""])[0]
                line = f"{d.month}/{d.day}: {horse} {item['title'].replace('Pole work: ', '')} done" \
                       f"{' (' + by + ')' if by else ''}." + (f" {note}" if note else "")
                new_comments.append(_comment(session, item["experiment_id"], line))
        else:
            for cid in item.get("comment_ids") or []:
                session.delete(f"{BASE}/comment/{cid}", timeout=HTTP_TIMEOUT)
            item["comment_ids"] = []
    with CACHE.lock:
        item["comment_ids"] = (item.get("comment_ids") or []) + [c for c in new_comments if c]
        item["done"] = bool(done)
        item["done_by"] = by if done else None
        if item["mode"] == "close" and not done and (item.get("status") or "") in DONE_STATUSES:
            item["status"] = ""
    return _public(item)


def log_session(horse, activity, day=None, minutes=None, note=None, by=None):
    """Create a completed session in the 🏇 Training Log. Returns the new public item."""
    with CACHE.lock:
        option = CACHE.animals.get(horse)
    if not option:
        raise LookupError("unknown horse")
    activity = _clean(activity, 60)
    if not activity:
        raise ValueError("activity is required")
    d = date.fromisoformat(day) if day else datetime.now(BARN_TZ).date()
    by, note = _clean(by, 40), _clean(note, 1000)
    lines = []
    if minutes:
        lines.append(f"**Minutes:** {int(minutes)}")
    if note:
        lines.append(note)
    lines.append(f"{LOGGED_MARK}{' by ' + by if by else ''}.")
    session = _session()
    body = {
        "name": f"{horse}: {activity}",
        "status": _statuses(session, TRAINING_LIST_ID)[1],
        "due_date": _day_ms(d),
        "due_date_time": False,
        "markdown_content": "\n\n".join(lines),
        "custom_fields": [{"id": F_ANIMAL, "value": option}],
    }
    resp = session.post(f"{BASE}/list/{TRAINING_LIST_ID}/task", json=body, timeout=HTTP_TIMEOUT)
    resp.raise_for_status()
    t = resp.json()
    t.setdefault("text_content", "\n".join(lines))
    item = training_item(t, d, [horse])
    item["done"], item["done_by"] = True, by
    with CACHE.lock:
        CACHE.items.append(item)
        CACHE.items.sort(key=lambda i: (i["date"], i["kind"] != "treatment", i["title"]))
    return _public(item)


def start():
    if not TOKEN:
        log.warning("CLICKUP_TOKEN unset — Tasks tab has no live data")
        return
    threading.Thread(target=CACHE.loop, name="tasks-live-refresh", daemon=True).start()


def tasks_payload():
    return CACHE.snapshot()
