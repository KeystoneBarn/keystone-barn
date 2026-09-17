"""
Live ClickUp feed for the Product Cabinet and Symptom Lookup.

Why this exists
---------------
Every product edit used to mean a code change, a commit, and a Render deploy.
This module makes the ClickUp "Products" list (901715740303) the live source:
edit a task in ClickUp, the barn site shows it within REFRESH_SECONDS. No
deploy, no developer.

Design notes (deliberate, not incidental):

* Dropdown and label names are resolved from each field's own `type_config`
  in the API response, never from a hardcoded map. New categories, verdicts,
  storage locations and symptom labels added in ClickUp appear on the site
  automatically.
* Product photos are NOT hotlinked. ClickUp attachment URLs are short-lived
  and can be put behind workspace auth at any time, so images are fetched
  server-side with the token and cached on the persistent disk. The 90 photos
  the old migration already downloaded into static/images/<task_id>.<ext> are
  used as-is, so most products have a picture from the first boot.
* Attachment metadata only comes back on the per-task endpoint, so image
  discovery is lazy and rate-limited (IMAGE_FETCH_BUDGET per refresh) instead
  of 130+ calls every cycle. ClickUp allows 100 requests/minute per token.
* If CLICKUP_TOKEN is unset, or ClickUp is down, or the shape changes, this
  returns live=False and the frontend falls back to the data compiled into
  the bundle — i.e. the site behaves exactly as it did before this existed.
  Failure mode is "yesterday's site", never a blank page.
"""
import json
import logging
import os
import re
import threading
import time

import requests

log = logging.getLogger("clickup_live")

TOKEN = os.environ.get("CLICKUP_TOKEN", "").strip()
LIST_ID = os.environ.get("CLICKUP_PRODUCTS_LIST", "901715740303")
BASE = "https://api.clickup.com/api/v2"
REFRESH_SECONDS = int(os.environ.get("CLICKUP_REFRESH_SECONDS", "300"))
IMAGE_FETCH_BUDGET = int(os.environ.get("CLICKUP_IMAGE_BUDGET", "12"))
HTTP_TIMEOUT = 25

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "data")
IMAGE_CACHE_DIR = os.path.join(DATA_DIR, "clickup-images")
IMAGE_INDEX_PATH = os.path.join(DATA_DIR, "clickup-image-index.json")
BUNDLED_IMAGES_DIR = os.path.join(HERE, "static", "images")

# --- field ids on the Products list (verified against the live schema) ---
F_CATEGORY = "4b52b8be-c904-4f40-8fc3-27c79f4e9410"
F_VERDICT = "5b3d3a99-562c-44f6-b0a8-9b9f209e189b"
F_SYMPTOMS = "b7b328c8-f8e1-44eb-9199-c0173b3b9475"   # "Indicated For" (labels)
F_STORAGE = "e8401a3c-3dc5-4575-86c3-972ebd200b0e"
F_DIRECTIONS = "6c004a67-7898-47eb-b3b8-65aa00ab29c0"
F_URL = "b242ac0a-6ed3-4482-8753-28957cbc45f1"
F_EXPERIMENT = "b6d39411-0310-43b1-942c-7ed2035d6938"

RX_PATTERN = re.compile(
    r"prescription required|prescription only|\brx only\b|vet-administered only|vet administered only",
    re.I,
)
WARN_PATTERN = re.compile(r"escalate|call the vet|do not |never |⚠", re.I)
NOTES_HEADING = re.compile(r"^\s{0,3}#{1,6}\s*notes?\s*$", re.I | re.M)
HRULE = re.compile(r"^\s*(\*\s*){3,}\s*$|^\s*(-\s*){3,}\s*$", re.M)


# ---------------------------------------------------------------- field help
def _field(task, field_id):
    for f in task.get("custom_fields") or []:
        if f.get("id") == field_id:
            return f
    return None


def _raw_value(task, field_id):
    f = _field(task, field_id)
    return f.get("value") if f else None


def _options(field):
    return ((field or {}).get("type_config") or {}).get("options") or []


def _option_label(opt):
    # dropdowns call it "name", label fields call it "label"
    return opt.get("name") or opt.get("label")


def _dropdown_name(task, field_id):
    """Resolve a dropdown value to its display name.

    ClickUp returns either the option's orderindex (legacy dropdowns) or its
    UUID, depending on how the field was created. Handle both.
    """
    f = _field(task, field_id)
    if not f:
        return None
    value = f.get("value")
    if value is None or value == "":
        return None
    for opt in _options(f):
        if isinstance(value, bool):
            return None
        if isinstance(value, int) and opt.get("orderindex") == value:
            return _option_label(opt)
        if isinstance(value, str):
            if opt.get("id") == value:
                return _option_label(opt)
            if str(opt.get("orderindex")) == value:
                return _option_label(opt)
    return None


def _label_names(task, field_id):
    f = _field(task, field_id)
    if not f:
        return []
    value = f.get("value") or []
    if not isinstance(value, list):
        return []
    by_id = {o.get("id"): _option_label(o) for o in _options(f)}
    out = []
    for item in value:
        # labels normally come back as ids, occasionally as full objects
        if isinstance(item, dict):
            name = _option_label(item) or by_id.get(item.get("id"))
        else:
            name = by_id.get(item)
        if name:
            out.append(name)
    return out


def _checkbox(task, field_id):
    v = _raw_value(task, field_id)
    return v is True or v == "true"


# ---------------------------------------------------------------- text split
def _clean(text):
    if not text:
        return ""
    text = HRULE.sub("", text)
    return text.strip()


def split_description(markdown):
    """-> (what_it's_for, directions_from_body, barn_note)

    Her tasks follow a consistent shape: a lead paragraph on what the product
    is for, sometimes a usage paragraph, and sometimes a "## Notes" section
    with barn context or an escalation rule.
    """
    text = _clean(markdown)
    if not text:
        return "", "", ""

    note = ""
    m = NOTES_HEADING.search(text)
    if m:
        note = _clean(text[m.end():])
        text = _clean(text[: m.start()])

    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    lead = paras[0] if paras else ""
    body = "\n\n".join(paras[1:]) if len(paras) > 1 else ""
    return lead, body, note


# ---------------------------------------------------------------- image cache
def _load_image_index():
    try:
        with open(IMAGE_INDEX_PATH) as f:
            return json.load(f)
    except Exception:
        return {}


def _save_image_index(index):
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        tmp = IMAGE_INDEX_PATH + ".tmp"
        with open(tmp, "w") as f:
            json.dump(index, f)
        os.replace(tmp, IMAGE_INDEX_PATH)
    except Exception as exc:
        log.warning("could not write image index: %s", exc)


def _bundled_image(task_id):
    """A photo the original migration already baked into the image."""
    try:
        for name in os.listdir(BUNDLED_IMAGES_DIR):
            if name.rsplit(".", 1)[0] == task_id:
                return "/images/" + name
    except FileNotFoundError:
        pass
    return None


def _cached_image(task_id, index):
    entry = index.get(task_id)
    if not entry or not entry.get("file"):
        return None
    if os.path.exists(os.path.join(IMAGE_CACHE_DIR, entry["file"])):
        return "/api/product-image/" + task_id
    return None


def cached_image_path(task_id):
    """Absolute path of a cached image, for the serving endpoint."""
    entry = _load_image_index().get(task_id)
    if not entry or not entry.get("file"):
        return None
    path = os.path.join(IMAGE_CACHE_DIR, entry["file"])
    return path if os.path.exists(path) else None


def _fetch_image(session, task_id, index):
    """Pull the first image attachment for one task into the disk cache."""
    try:
        detail = session.get(
            f"{BASE}/task/{task_id}",
            params={"include_subtasks": "false"},
            timeout=HTTP_TIMEOUT,
        )
        detail.raise_for_status()
        attachments = detail.json().get("attachments") or []
    except Exception as exc:
        log.warning("attachment lookup failed for %s: %s", task_id, exc)
        index[task_id] = {"file": None, "checked": time.time()}
        return None

    for att in attachments:
        mimetype = (att.get("mimetype") or "").lower()
        ext = (att.get("extension") or "").lower()
        if not (mimetype.startswith("image/") or ext in {"jpg", "jpeg", "png", "webp", "heic"}):
            continue
        url = att.get("url") or att.get("url_w_query")
        if not url:
            continue
        try:
            img = session.get(url, timeout=HTTP_TIMEOUT)
            if not img.ok or not img.content:
                continue
            os.makedirs(IMAGE_CACHE_DIR, exist_ok=True)
            fname = f"{task_id}.{ext or 'jpg'}"
            with open(os.path.join(IMAGE_CACHE_DIR, fname), "wb") as f:
                f.write(img.content)
            index[task_id] = {"file": fname, "checked": time.time()}
            return "/api/product-image/" + task_id
        except Exception as exc:
            log.warning("image download failed for %s: %s", task_id, exc)
            continue

    index[task_id] = {"file": None, "checked": time.time()}
    return None


# ---------------------------------------------------------------- fetch/build
def _session():
    s = requests.Session()
    s.headers.update({"Authorization": TOKEN})
    return s


def _fetch_tasks(session):
    tasks, page = [], 0
    while True:
        resp = session.get(
            f"{BASE}/list/{LIST_ID}/task",
            params={
                "include_closed": "true",
                "subtasks": "false",
                "include_markdown_description": "true",
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
        if page > 20:  # hard stop; the list is ~140 products
            break
    return tasks


def _to_product(task, index):
    task_id = task.get("id")
    name = (task.get("name") or "").strip()
    # The task endpoints return status as an object; some responses flatten it
    # to a bare string. Accept either rather than trusting one shape.
    raw_status = task.get("status")
    if isinstance(raw_status, dict):
        status = (raw_status.get("status") or "").lower()
    else:
        status = (raw_status or "").lower()

    markdown = task.get("markdown_description") or task.get("description") or task.get("text_content") or ""
    lead, body, note = split_description(markdown)

    directions = (_raw_value(task, F_DIRECTIONS) or "").strip() or body
    storage = _dropdown_name(task, F_STORAGE)
    url = (_raw_value(task, F_URL) or "").strip() or None

    product = {
        "id": task_id,
        "n": name,
        "c": _dropdown_name(task, F_CATEGORY) or "Other",
        "v": _dropdown_name(task, F_VERDICT),
        "loc": None if storage in (None, "Out of Stock") else storage,
        "d": lead,
        "dose": directions or None,
        "note": note or None,
        "warn": bool(note and WARN_PATTERN.search(note)),
        "rx": bool(RX_PATTERN.search(markdown)),
        "exp": _checkbox(task, F_EXPERIMENT),
        "url": url,
        "sx": _label_names(task, F_SYMPTOMS),
        "retired": status not in ("active", ""),
        "oos": storage == "Out of Stock",
        "updated": task.get("date_updated"),
        "img": _bundled_image(task_id) or _cached_image(task_id, index),
    }
    return product


def _dedupe(products):
    """ClickUp holds a few duplicate product tasks. Keep the richest one.

    Ranked by: most recently updated wins, but a record with a description
    beats an empty one regardless of date — an empty duplicate is almost
    always the accidental second copy.
    """
    best = {}
    dupes = {}
    for p in products:
        key = re.sub(r"\s+", " ", p["n"].strip().lower())
        if not key:
            continue
        dupes.setdefault(key, []).append(p["n"])
        current = best.get(key)
        if current is None:
            best[key] = p
            continue
        richer = (bool(p["d"]), int(p.get("updated") or 0))
        incumbent = (bool(current["d"]), int(current.get("updated") or 0))
        if richer > incumbent:
            best[key] = p
    duplicate_names = sorted({v[0] for k, v in dupes.items() if len(v) > 1})
    return list(best.values()), duplicate_names


class _Feed:
    def __init__(self):
        self.lock = threading.Lock()
        self.products = []
        self.duplicates = []
        self.fetched_at = 0.0
        self.error = None
        self.refreshing = False

    def enabled(self):
        return bool(TOKEN)

    def snapshot(self):
        with self.lock:
            return {
                "live": bool(self.products),
                "fetched_at": self.fetched_at,
                "age_seconds": round(time.time() - self.fetched_at, 1) if self.fetched_at else None,
                "count": len(self.products),
                "error": self.error,
                "products": list(self.products),
                "duplicates": list(self.duplicates),
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
            tasks = _fetch_tasks(session)
            index = _load_image_index()
            products = [_to_product(t, index) for t in tasks]

            # Lazily fill in photos for products we've never looked at, within
            # a per-cycle budget so we stay far under ClickUp's rate limit.
            budget = IMAGE_FETCH_BUDGET
            touched = False
            for p in products:
                if budget <= 0:
                    break
                if p["img"] or p["id"] in index:
                    continue
                p["img"] = _fetch_image(session, p["id"], index)
                touched = True
                budget -= 1
            if touched:
                _save_image_index(index)

            products, duplicates = _dedupe(products)
            products.sort(key=lambda p: p["n"].lower())
            with self.lock:
                self.products = products
                self.duplicates = duplicates
                self.fetched_at = time.time()
                self.error = None
            log.info("clickup refresh ok: %d products", len(products))
        except Exception as exc:
            log.warning("clickup refresh failed: %s", exc)
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


FEED = _Feed()


def start():
    """Kick off background refreshing. Safe to call when there's no token."""
    if not FEED.enabled():
        log.warning("CLICKUP_TOKEN unset — serving bundled data only")
        return
    t = threading.Thread(target=FEED.loop, name="clickup-refresh", daemon=True)
    t.start()


def products_payload():
    snap = FEED.snapshot()
    return {
        "live": snap["live"],
        "count": snap["count"],
        "fetched_at": snap["fetched_at"],
        "age_seconds": snap["age_seconds"],
        "products": snap["products"],
    }


def symptom_index():
    """symptom label -> product names, built from the live Indicated For labels."""
    snap = FEED.snapshot()
    out = {}
    for p in snap["products"]:
        if p["retired"]:
            continue
        for s in p["sx"]:
            out.setdefault(s, []).append(p["n"])
    return {
        "live": snap["live"],
        "fetched_at": snap["fetched_at"],
        "symptoms": [{"name": k, "products": sorted(v)} for k, v in sorted(out.items())],
    }


def report(ladder_names=None):
    """Data-quality view: duplicates, blanks, and curated names that drifted."""
    snap = FEED.snapshot()
    products = snap["products"]
    names = {p["n"] for p in products}
    return {
        "live": snap["live"],
        "error": snap["error"],
        "fetched_at": snap["fetched_at"],
        "count": len(products),
        "duplicate_names": snap["duplicates"],
        "missing_description": sorted(p["n"] for p in products if not p["d"]),
        "missing_category": sorted(p["n"] for p in products if p["c"] == "Other"),
        "no_photo": sorted(p["n"] for p in products if not p["img"]),
        "out_of_stock": sorted(p["n"] for p in products if p["oos"]),
        "retired": sorted(p["n"] for p in products if p["retired"]),
        "ladder_names_not_in_clickup": sorted(n for n in (ladder_names or []) if n not in names),
    }
