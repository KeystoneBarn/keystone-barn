"""
Per-horse stall-card data for the Horses tab, live from the ClickUp
"🐴 Horse Health Log" list (901715510360).

Three kinds of Health Log task feed it, each found by its 📋 Animal Note Type:

* Profile (📋Other, named "<Horse>: Profile") — the description is a bullet
  list of "**Label:** value" lines (DOB, Sex, Breed, Color, Eats At,
  Conditions, Hay, optional Registered Name / Height / Note). Meghann edits
  these in ClickUp; any new label she adds comes through as-is.
* Weight (⚖️Weight, e.g. "Avelin weight: 990 lb") — Value field, or the
  number in the name if Value is blank. Dated by due date.
* Labs (🩸Labs, one task per analyte, e.g. "Avelin: Insulin") — Value field
  plus a description carrying "**Result:** 68.78 µIU/mL", "**Reference
  range:** 10-40 µIU/mL" and a "⚠️ **HIGH**" / "**LOW**" flag. Only the
  endocrine panel is kept; the latest result per test per horse wins.

Buckets, turnout, watch-list items and upcoming dates are already served by
/api/feeding, /api/locations and /api/board — the frontend joins them.
"""
import json
import logging
import os
import re
import threading
import time

from clickup_live import BASE, HTTP_TIMEOUT, TOKEN, _dropdown_name, _raw_value, _session
from feed_live import F_ANIMAL, F_NOTE_TYPE, F_VALUE, HEALTH_LIST_ID

log = logging.getLogger("horses_live")

REFRESH_SECONDS = int(os.environ.get("CLICKUP_HORSES_REFRESH_SECONDS", "900"))

NOTE_OTHER = "919f7c5d-26f4-496d-a499-b36fcc85a2cb"    # 📋Other  (profiles)
NOTE_WEIGHT = "3754afef-9a1c-4b17-884f-78841d9b104b"   # ⚖️Weight
NOTE_LABS = "1fe47416-0e23-4651-bad7-0db3440cffb2"     # 🩸Labs

# Endocrine tests shown on the card, in display order. Keys are matched
# case-insensitively against the part of the task name after "Horse: ".
ENDOCRINE = [
    ("acth (post-trh)", "Post-TRH ACTH"),
    ("acth (pre-trh)", "ACTH"),
    ("insulin", "Insulin"),
    ("t4 (thyroxine)", "T4"),
    ("leptin", "Leptin"),
]
ENDO_LABEL = dict(ENDOCRINE)

PROFILE_NAME = re.compile(r"^\s*(\w+)\s*:\s*profile\s*$", re.I)
PROFILE_LINE = re.compile(r"^\s*[*\-]\s*\*\*(.+?):\*\*\s*(.+?)\s*$", re.M)
WEIGHT_IN_NAME = re.compile(r"(\d{3,4}(?:\.\d+)?)\s*lb", re.I)
RESULT_LINE = re.compile(r"\*\*Result:\*\*\s*([<>]?\s*[\d.,]+)\s*([^\n*]*)", re.I)
RANGE_LINE = re.compile(r"\*\*Reference range:\*\*\s*([^\n]+)", re.I)
FLAG_HIGH = re.compile(r"\*\*\s*HIGH\b|\bHIGH\*\*", re.I)
FLAG_LOW = re.compile(r"\*\*\s*LOW\b|\bLOW\*\*", re.I)


def _horse(task):
    raw = _dropdown_name(task, F_ANIMAL) or ""
    return raw.rstrip("🐴🐶🐱🐐🐓").strip() or None


def _name_horse(task):
    """'Avelin: Insulin' / 'Avelin weight: 990 lb' -> 'Avelin' when the dropdown is blank."""
    m = re.match(r"^\s*(\w+)", task.get("name") or "")
    return m.group(1) if m else None


def _number(value):
    try:
        return float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return None


def _date(task):
    for key in ("due_date", "start_date", "date_created"):
        if task.get(key):
            return int(task[key])
    return None


def _get_all(session, note_type_id):
    tasks, page = [], 0
    while True:
        resp = session.get(
            f"{BASE}/list/{HEALTH_LIST_ID}/task",
            params={
                "include_closed": "true",
                "subtasks": "true",
                "include_markdown_description": "true",
                "custom_fields": json.dumps([{"field_id": F_NOTE_TYPE, "operator": "=", "value": note_type_id}]),
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
        if page > 40:
            break
    return tasks


def parse_profile(markdown):
    fields = {}
    for label, value in PROFILE_LINE.findall(markdown or ""):
        fields[label.strip()] = value.strip()
    return fields


def parse_lab(task):
    desc = task.get("markdown_description") or task.get("text_content") or ""
    value = _number(_raw_value(task, F_VALUE))
    unit = ""
    m = RESULT_LINE.search(desc)
    if m:
        if value is None:
            value = _number(m.group(1).replace("<", "").replace(">", ""))
        unit = m.group(2).strip()
    ref = None
    m = RANGE_LINE.search(desc)
    if m:
        ref = m.group(1).strip()
    flag = "high" if FLAG_HIGH.search(desc) else "low" if FLAG_LOW.search(desc) else None
    return {"value": value, "unit": unit, "ref": ref, "flag": flag}


class _HorsesCache:
    def __init__(self):
        self.lock = threading.Lock()
        self.horses = {}
        self.fetched_at = 0.0
        self.error = None

    def snapshot(self):
        with self.lock:
            return {
                "live": bool(self.fetched_at),
                "fetched_at": self.fetched_at,
                "error": self.error,
                "horses": self.horses,
            }

    def refresh(self):
        if not TOKEN:
            with self.lock:
                self.error = "CLICKUP_TOKEN is not set"
            return
        try:
            session = _session()
            horses = {}

            def rec(name):
                return horses.setdefault(name, {"profile": None, "weights": [], "labs": {}})

            for t in _get_all(session, NOTE_OTHER):
                m = PROFILE_NAME.match(t.get("name") or "")
                if not m:
                    continue
                rec(m.group(1).capitalize())["profile"] = parse_profile(t.get("markdown_description"))

            for t in _get_all(session, NOTE_WEIGHT):
                horse = _horse(t) or _name_horse(t)
                lb = _number(_raw_value(t, F_VALUE))
                if lb is None:
                    m = WEIGHT_IN_NAME.search(t.get("name") or "")
                    lb = _number(m.group(1)) if m else None
                when = _date(t)
                if horse and lb and when:
                    rec(horse)["weights"].append({"date": when, "lb": lb})

            for t in _get_all(session, NOTE_LABS):
                horse = _horse(t) or _name_horse(t)
                test = (t.get("name") or "").split(":", 1)[-1].strip().lower()
                if not horse or test not in ENDO_LABEL:
                    continue
                when = _date(t)
                lab = parse_lab(t)
                if lab["value"] is None or not when:
                    continue
                labs = rec(horse)["labs"]
                prev = labs.get(test)
                if prev is None or when > prev["date"]:
                    labs[test] = {"test": ENDO_LABEL[test], "date": when, **lab}

            for h in horses.values():
                h["weights"].sort(key=lambda w: w["date"])
                h["labs"] = [h["labs"][k] for k, _ in ENDOCRINE if k in h["labs"]]

            with self.lock:
                self.horses = horses
                self.fetched_at = time.time()
                self.error = None
            log.info("horses refresh ok: %d horses", len(horses))
        except Exception as exc:
            log.warning("horses refresh failed: %s", exc)
            with self.lock:
                self.error = str(exc)

    def loop(self):
        while True:
            self.refresh()
            time.sleep(max(120, REFRESH_SECONDS))


HORSES = _HorsesCache()


def start():
    if not TOKEN:
        log.warning("CLICKUP_TOKEN unset — Horses tab has no live profiles, weights or labs")
        return
    threading.Thread(target=HORSES.loop, name="horses-live-refresh", daemon=True).start()


def horses_payload():
    return HORSES.snapshot()
