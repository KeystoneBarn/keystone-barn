"""
Care tracker records ("when was this last done?") for the Horses tab's Care
section and the Care tab, live from the ClickUp "🐴 Horse Health Log" list.

Spec: Part 3 of the ClickUp doc "🔌 Keystone Barn site: how ClickUp feeds it"
(added 2026-10-10). Read-only: nothing here writes to ClickUp.

Every Health Log task whose 📋 Animal Note Type is one of the care types
below comes through as a dated record, grouped by horse (🐾 Animal dropdown,
falling back to the name before the colon) and category. Vaccinations carry
the vaccine (Product dropdown, else read from the task name; see
VACCINE_NAMES) so the site can show one row per vaccine.

The site decides last done / next scheduled / green-amber-red itself from
the dates (src/careConfig.js holds the intervals), so this module never
filters by status: weights stay "in progress" until the next weigh-in and
visits are "complete", and both count. `open` is passed along only so
"next scheduled" can skip a future-dated record that's already closed.
"""
import logging
import os
import re
import threading
import time
from datetime import datetime, timezone

from clickup_live import TOKEN, _dropdown_name, _session
from feed_live import BARN_UTC_OFFSET, F_ANIMAL, F_PRODUCT
from horses_live import _get_all, _horse, _name_horse

log = logging.getLogger("care_live")

REFRESH_SECONDS = int(os.environ.get("CLICKUP_CARE_REFRESH_SECONDS", "600"))

# Note Type option id -> care category key (keys match src/careConfig.js)
CARE_TYPES = {
    "5b83959f-49be-4ba0-b643-e903de5a4e1f": "farrier",      # 🧲Farrier
    "97e726a0-7878-4ac0-a575-df8538557a2f": "bodywork",     # 🙌🏼BodyWork
    "3754afef-9a1c-4b17-884f-78841d9b104b": "weight",       # ⚖️Weight
    "87dcba39-6858-4655-ab2c-23dc66c1c5ca": "dental",       # 🦷Dental
    "6a8706ea-f5ed-45df-ac1c-8cc8c600753f": "vaccination",  # 💉Vaccination
    "3927ff54-aa58-4791-a99f-893e061927d1": "dewormer",     # 🪱Dewormer
    "1fe47416-0e23-4651-bad7-0db3440cffb2": "labs",         # 🩸Labs
}


# Vaccination tasks rarely have the Product dropdown set, so the vaccine is
# read from the name ("Qu Vaccination: Flu/Rhino"). A 6-/7-way combo covers
# both EWT/WNV and Flu/Rhino. Generic "Spring Vaccinations" visits don't say
# which shots, so they don't count toward any vaccine.
VACCINE_NAMES = [
    (re.compile(r"\b[67]\s*-?\s*way\b", re.I), ["EWT/WNV", "Flu/Rhino"]),
    (re.compile(r"flu|rhino|calvenza", re.I), ["Flu/Rhino"]),
    (re.compile(r"ewt|wnv|west nile|eee|wee|tetanus", re.I), ["EWT/WNV"]),
    (re.compile(r"rabies", re.I), ["Rabies"]),
    (re.compile(r"strangles", re.I), ["Strangles"]),
    (re.compile(r"potomac|patomic", re.I), ["Potomac"]),
]


def _vaccines(task):
    product = _dropdown_name(task, F_PRODUCT)
    if product:
        return [product]
    name = (task.get("name") or "").split(":", 1)[-1]
    for pattern, vaccines in VACCINE_NAMES:
        if pattern.search(name):
            return vaccines
    return []


def _day(ms):
    """ClickUp due date (ms) -> 'YYYY-MM-DD' on the barn's calendar."""
    dt = datetime.fromtimestamp(int(ms) / 1000, tz=timezone.utc) + BARN_UTC_OFFSET
    return dt.strftime("%Y-%m-%d")


def _is_open(task):
    status = task.get("status") or {}
    return (status.get("type") or "").lower() not in ("closed", "done")


class _CareCache:
    def __init__(self):
        self.lock = threading.Lock()
        self.records = {}
        self.fetched_at = 0.0
        self.error = None

    def snapshot(self):
        with self.lock:
            return {
                "live": bool(self.fetched_at),
                "fetched_at": self.fetched_at,
                "error": self.error,
                "records": self.records,
            }

    def refresh(self):
        if not TOKEN:
            with self.lock:
                self.error = "CLICKUP_TOKEN is not set"
            return
        try:
            session = _session()
            records = {}
            for type_id, cat in CARE_TYPES.items():
                for t in _get_all(session, type_id):
                    if not t.get("due_date"):
                        continue
                    raw = _dropdown_name(t, F_ANIMAL) or ""
                    if raw and "🐴" not in raw:
                        continue  # goats, dogs, cats, chickens
                    horse = _horse(t) or _name_horse(t)
                    if not horse:
                        continue
                    base = {
                        "id": t.get("id"),
                        "name": t.get("name"),
                        "url": t.get("url") or f"https://app.clickup.com/t/{t.get('id')}",
                        "date": _day(t["due_date"]),
                        "open": _is_open(t),
                    }
                    if cat == "vaccination":
                        # one record per vaccine the shot covers
                        recs = [{**base, "product": v} for v in _vaccines(t)]
                    else:
                        recs = [{**base, "product": _dropdown_name(t, F_PRODUCT)}]
                    records.setdefault(horse, {}).setdefault(cat, []).extend(recs)
            for cats in records.values():
                for recs in cats.values():
                    recs.sort(key=lambda r: r["date"])
            with self.lock:
                self.records = records
                self.fetched_at = time.time()
                self.error = None
            log.info("care refresh ok: %d horses", len(records))
        except Exception as exc:
            log.warning("care refresh failed: %s", exc)
            with self.lock:
                self.error = str(exc)

    def loop(self):
        while True:
            self.refresh()
            time.sleep(max(120, REFRESH_SECONDS))


CARE = _CareCache()


def start():
    if not TOKEN:
        log.warning("CLICKUP_TOKEN unset — Care tracker has no live records")
        return
    threading.Thread(target=CARE.loop, name="care-live-refresh", daemon=True).start()


def care_payload():
    return CARE.snapshot()
