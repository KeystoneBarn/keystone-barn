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
from urllib.parse import unquote as requests_unquote

from clickup_live import BASE, HTTP_TIMEOUT, IMAGE_CACHE_DIR, TOKEN, _dropdown_name, _raw_value, _session
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
# The weekly GPW emails, saved as PDFs: "Welcome to Week 2 of ...",
# "Hind End 4 Week Workout Plan Week 3.pdf", "... Welcome.pdf".
EMAIL_TITLE = re.compile(r"welcome|\bweek\s+\d+\b(?!\s*workout)", re.I)
FOCUS_HEADER = re.compile(r"^\s*GPW\s+(.+?)\s+Plan:\s*Weekly Focus Summaries", re.I | re.M)
FOCUS_WEEK = re.compile(r"^(?:-{3,})?\s*Week\s+(\d+):\s*(.+)$", re.I)
LOG_LINE = re.compile(r"^\s*\d{1,2}/\d{1,2}(?:/\d{2,4})?\s*:")
ATTACHMENT_LINE = re.compile(r"^[0-9a-f-]{36}\.\w+$", re.I)
LOG_LIMIT = 8

# attachment id -> parsed plan (or None). GPW PDFs never change in place;
# a revised plan is a new attachment with a new id.
_plan_cache = {}


def _task_detail(session, task_id):
    resp = session.get(
        f"{BASE}/task/{task_id}",
        params={"include_markdown_description": "true"},
        timeout=HTTP_TIMEOUT,
    )
    resp.raise_for_status()
    return resp.json()


def _plan_for(session, task):
    candidates = [
        a for a in task.get("attachments") or []
        if (a.get("extension") or "").lower() == "pdf"
        and PLAN_TITLE.search(a.get("title") or "")
        and not EMAIL_TITLE.search(a.get("title") or "")
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
                log.warning("plan pdf %s on %s failed: %s", att.get("title"), task.get("id"), exc)
                continue
        if _plan_cache[att["id"]]:
            return _plan_cache[att["id"]]
    return None


# --- the written protocol, for programs without a GPW grid ---------------
# Staff read the site, not ClickUp, so the task's own description is shown
# (minus the Hypothesis, which the card already has) with every link reduced
# to its text: nothing on the site points back into ClickUp.
MD_LINK = re.compile(r"\[([^\]]*)\]\((?:[^()]|\([^)]*\))*\)")
BARE_URL = re.compile(r"https?://[^\s)]+")
# Hypothesis is already on the card; Sources only names PDFs that live in
# ClickUp (the EBO link stands in for them).
SKIP_SECTIONS = {"hypothesis", "sources", "source"}
EBO = re.compile(r"\bEBO\b|equine\s*bodywork\s*online", re.I)
# "This is adapted enrichment, not the EBO … program" isn't an EBO program.
NOT_EBO = re.compile(r"\bnot\s+(?:an?\s+|the\s+)?(?:EBO|equine\s*bodywork\s*online)\b", re.I)


def _is_ebo(md):
    return bool(EBO.search(NOT_EBO.sub("", md or "")))


def _clean_md(text):
    # [label](url) -> label; a link whose label is itself a URL goes entirely
    text = MD_LINK.sub(lambda m: "" if BARE_URL.match(m.group(1)) else m.group(1), text or "")
    text = BARE_URL.sub("", text)
    text = re.sub(r"\(\s*\)", "", text)            # "( )" left where a link was
    text = re.sub(r"[ \t]{2,}", " ", text)
    return re.sub(r"[ \t]+([.,;:])", r"\1", text)


def _details(markdown):
    """'## Heading' sections -> [{title, lines}], links stripped."""
    sections, cur = [], None
    for raw in _clean_md(markdown).splitlines():
        line = raw.rstrip()
        m = re.match(r"^\s*#{1,4}\s+(.+)$", line)
        if m:
            cur = {"title": m.group(1).strip(), "lines": []}
            sections.append(cur)
            continue
        if not line.strip():
            continue
        if cur is None:
            cur = {"title": "", "lines": []}
            sections.append(cur)
        cur["lines"].append(line.strip())
    return [x for x in sections if x["lines"] and x["title"].lower() not in SKIP_SECTIONS]


# Exercise diagrams (PNG/JPG attachments), cached locally and served from
# /api/experiment-image/<file> — never hotlinked to ClickUp. Attachments are
# immutable (a new image is a new id), so each downloads once.
IMG_EXT = {"png", "jpg", "jpeg", "gif", "webp"}


def image_path(fname):
    if not re.fullmatch(r"exp-[0-9a-f-]{36}\.(png|jpe?g|gif|webp)", fname or ""):
        return None
    path = os.path.join(IMAGE_CACHE_DIR, fname)
    return path if os.path.exists(path) else None


# --- dated workout subtasks ("Hugo: W1 Even Walk", due = the day) ----------
# Each carries the day's Focus, what to log, and component images embedded in
# its description. One list call per experiment; images cache by file id and
# are shared across horses, so they download once.
MD_IMAGE = re.compile(r"!\[[^\]]*\]\((https?://[^)\s]+)\)")
WORKOUT_NAME = re.compile(r"^\s*\w+\s*:\s*W(\d+)\s+(.+?)\s*$", re.I)
SENTENCE = re.compile(r"(?<=[.!?])\s+")
_img_index = {}   # remote url -> local src


def _download(session, url, path):
    img = session.get(url, timeout=HTTP_TIMEOUT)
    img.raise_for_status()
    if not (img.headers.get("content-type") or "").startswith("image/"):
        raise ValueError(f"not an image ({img.headers.get('content-type')})")
    os.makedirs(IMAGE_CACHE_DIR, exist_ok=True)
    with open(path, "wb") as f:
        f.write(img.content)


def _cache_remote_image(session, url, task_id=None):
    """An image embedded in a workout description. On a private-attachments
    workspace the embedded link isn't fetchable, so fall back to the task's
    own attachment of the same file name (whose url is)."""
    if url in _img_index:
        return _img_index[url]
    m = re.search(r"/([0-9a-f-]{36})/([^/?#]+)$", url)
    ext = (m.group(2).rsplit(".", 1)[-1] if m else "").lower()
    if not m or ext not in IMG_EXT:
        return None
    fname = f"exp-{m.group(1)}.{ext}"
    path = os.path.join(IMAGE_CACHE_DIR, fname)
    if not os.path.exists(path):
        try:
            _download(session, url, path)
        except Exception as exc:
            ok = False
            if task_id:
                try:
                    want = requests_unquote(m.group(2)).lower()
                    for a in _task_detail(session, task_id).get("attachments") or []:
                        if (a.get("title") or "").lower() == want:
                            _download(session, a.get("url") or a.get("url_w_query"), path)
                            ok = True
                            break
                except Exception as exc2:
                    exc = exc2
            if not ok:
                log.warning("workout image %s failed: %s", url, exc)
                return None
    title = re.sub(r"\.\w+$", "", m.group(2))
    _img_index[url] = {"src": f"/api/experiment-image/{fname}", "title": re.sub(r"[-_]+", " ", title).strip()}
    return _img_index[url]


def _workout_text(md):
    """-> (how, focus, record). Two ways workouts are written in ClickUp:
    '## Workout / ## Focus / ## Record' sections, or one paragraph with a
    'Focus: …' sentence and a 'Log …' sentence (the rest is how-to)."""
    secs = {x["title"].lower(): " ".join(x["lines"]) for x in _details(md) if x["title"]}
    if secs:
        pick = lambda *keys: next((secs[k] for k in keys if k in secs), None)
        return pick("workout", "setup"), pick("focus"), pick("record", "log")
    text = " ".join(_clean_md(md).split())
    sentences = [x.strip() for x in SENTENCE.split(text) if x.strip()]
    focus = next((x for x in sentences if x.lower().startswith("focus:")), None)
    log_line = next((x for x in sentences if x.lower().startswith("log ")), None)
    how = " ".join(x for x in sentences if x not in (focus, log_line)) or None
    if log_line:   # "Log setup, passes…" under a Record heading -> "Setup, passes…"
        log_line = re.sub(r"^log\s+", "", log_line, flags=re.I)
        log_line = log_line[:1].upper() + log_line[1:]
    return how, (focus.split(":", 1)[1].strip() if focus else None), log_line


def _workouts(session, task_id, horse):
    resp = session.get(
        f"{BASE}/list/{EXPERIMENTS_LIST_ID}/task",
        params={"parent": task_id, "subtasks": "true", "include_closed": "true",
                "include_markdown_description": "true"},
        timeout=HTTP_TIMEOUT,
    )
    resp.raise_for_status()
    out = []
    for t in resp.json().get("tasks") or []:
        if t.get("parent") != task_id or not t.get("due_date"):
            continue
        m = WORKOUT_NAME.match(t.get("name") or "")
        md = t.get("markdown_description") or t.get("description") or ""
        images = [i for i in (_cache_remote_image(session, u, t.get("id")) for u in MD_IMAGE.findall(md)) if i]
        how, focus, log_line = _workout_text(MD_IMAGE.sub("", md))
        out.append({
            "horse": horse,
            "date": int(t["due_date"]),
            "start": int(t["start_date"]) if t.get("start_date") else None,
            "week": int(m.group(1)) if m else None,
            "title": m.group(2) if m else re.sub(r"^\s*\w+\s*:\s*", "", t.get("name") or ""),
            "how": how,
            "focus": focus,
            "log": log_line,
            "images": images,
            "done": _status(t) in ("complete", "completed", "done", "closed"),
        })
    return out


def _diagrams(session, task):
    out = []
    atts = [a for a in task.get("attachments") or [] if (a.get("extension") or "").lower() in IMG_EXT]
    atts.sort(key=lambda a: a.get("title") or "")
    for a in atts:
        ext = a["extension"].lower()
        fname = f"exp-{a['id'].split('.')[0]}.{ext}"
        path = os.path.join(IMAGE_CACHE_DIR, fname)
        if not os.path.exists(path):
            try:
                img = session.get(a.get("url") or a.get("url_w_query"), timeout=HTTP_TIMEOUT)
                img.raise_for_status()
                os.makedirs(IMAGE_CACHE_DIR, exist_ok=True)
                with open(path, "wb") as f:
                    f.write(img.content)
            except Exception as exc:
                log.warning("experiment image %s failed: %s", a.get("title"), exc)
                continue
        title = re.sub(r"\.\w+$", "", a.get("title") or "")
        out.append({"title": re.sub(r"[-_]+", " ", title).strip(), "src": f"/api/experiment-image/{fname}"})
    return out


def _parse_focus(text):
    weeks, cur = [], None
    # Anything before the header line (e.g. a correction note) is skipped.
    text = text[FOCUS_HEADER.search(text).start():]
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
        header = FOCUS_HEADER.search(text)
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
                    task = _task_detail(session, e["id"])
                    md = task.get("markdown_description") or task.get("description") or ""
                    e["details"] = _details(md)
                    e["workouts"] = _workouts(session, e["id"], e["horse"])
                    e["diagrams"] = _diagrams(session, task)
                    e["ebo"] = _is_ebo(md)
                    e["plan"] = _plan_for(session, task)
                    e["focus"], e["log"] = _focus_and_log(
                        _comments_for(session, e["id"]),
                        (e["plan"] or {}).get("title"), e["horse"], e["start_date"],
                    )
                except Exception as exc:
                    log.warning("experiment detail for %s failed: %s", e["id"], exc)
                    e.setdefault("plan", None)
                    e.setdefault("details", [])
                    e.setdefault("workouts", [])
                    e.setdefault("diagrams", [])
                    e.setdefault("ebo", False)
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
                    "details": [],
                    "horse_details": [],
                    "workouts": [],
                    "diagrams": [],
                    "ebo": False,
                    "plan": None,
                    "focus": None,
                    "log": [],
                })
                g["horses"].append(e["horse"])
                g["plan"] = g["plan"] or e["plan"]
                g["diagrams"] = g["diagrams"] or e["diagrams"]
                g["workouts"].extend(e.get("workouts") or [])
                if e.get("details"):
                    g["horse_details"].append({"horse": e["horse"], "sections": e["details"]})
                g["ebo"] = g["ebo"] or e["ebo"]
                g["focus"] = g["focus"] or e["focus"]
                g["log"].extend(e["log"])
                # Prefer the most recently updated task's hypothesis/dates/protocol —
                # they're near-identical per horse, but this keeps one
                # consistent choice instead of "whichever came back first".
                if (e["updated"] or "0") > (g.get("_updated") or "0"):
                    g["hypothesis"] = e["hypothesis"]
                    g["start_date"] = e["start_date"]
                    g["due_date"] = e["due_date"]
                    if e["details"]:
                        g["details"] = e["details"]
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
