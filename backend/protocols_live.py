"""
Live symptom protocols for the Products page, from the ClickUp
"🚨 Protocols" list (901717326306) in the 🐴 Horses folder.

One open task per symptom group, keyed by its `Symptom Group` dropdown (the
same 14 groups as the Products page's "Indicated For" buttons). The site
shows a group's protocol above its products when that button is tapped.

Fields:
  Symptom Group  dropdown  which button it belongs to (falls back to the task name)
  Severity       dropdown  Emergency / Urgent / Progressive -> badge colour
  Vet Threshold  text      "when to call the vet" -> the red box

Description: markdown split on `## ` headings. Any heading is shown in order;
three are also read as the escalation ladder, each bullet starting with a
product name as it's spelled in 🧴 Products ("Cetirizine Hydrochloride 10mg:
10 tablets twice daily…") so the site can link it:
  ## Try First / ## Step 2 / ## Last Resort
`## Summary` is shown as the lead line.

Returned as structured blocks rather than HTML so the frontend renders it
with React's escaping; only **bold** and _italic_ are interpreted.

Infographic: the first image attached to the task, downloaded server-side
into the same disk cache as product photos (never hotlinked) and served from
/api/protocol-image/<task id>, re-checked on every refresh (see _image_url).
Tasks without one fall back to the graphics bundled with the site.
"""
import json
import logging
import os
import re
import threading
import time

from clickup_live import (
    BASE, DATA_DIR, HTTP_TIMEOUT, IMAGE_CACHE_DIR, TOKEN,
    _dropdown_name, _raw_value, _session,
)

log = logging.getLogger("protocols_live")

PROTOCOLS_LIST_ID = os.environ.get("CLICKUP_PROTOCOLS_LIST", "901717326306")
REFRESH_SECONDS = int(os.environ.get("CLICKUP_PROTOCOLS_REFRESH_SECONDS", "600"))

F_GROUP = "f2e176d3-8697-4031-8a07-2d247667e844"
F_SEVERITY = "0637ebeb-1653-46f4-953b-b768de2fe22d"
F_VET = "3460afe9-642e-4ac6-a581-3cd99566140e"

LADDER = {"try first": 1, "step 2": 2, "last resort": 3}
IMAGE_INDEX_PATH = os.path.join(DATA_DIR, "protocol-image-index.json")


def _load_index():
    try:
        with open(IMAGE_INDEX_PATH) as f:
            return json.load(f)
    except Exception:
        return {}


def _save_index(index):
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        tmp = IMAGE_INDEX_PATH + ".tmp"
        with open(tmp, "w") as f:
            json.dump(index, f)
        os.replace(tmp, IMAGE_INDEX_PATH)
    except Exception as exc:
        log.warning("could not write protocol image index: %s", exc)


def image_path(task_id):
    entry = _load_index().get(task_id) or {}
    if not entry.get("file"):
        return None
    path = os.path.join(IMAGE_CACHE_DIR, entry["file"])
    return path if os.path.exists(path) else None


def _image_url(session, task, index):
    """Cached infographic URL for a task.

    Attaching or swapping an image does NOT bump a ClickUp task's
    date_updated, so every refresh looks at the task's attachments (one small
    GET per protocol) and only downloads when the first image attachment's id
    changes. Replacing the image in ClickUp therefore shows up on the next
    refresh with no other edit needed.
    """
    tid = task.get("id")
    entry = index.get(tid) or {}
    try:
        detail = session.get(f"{BASE}/task/{tid}", params={"include_subtasks": "false"}, timeout=HTTP_TIMEOUT)
        detail.raise_for_status()
        atts = detail.json().get("attachments") or []
    except Exception as exc:
        log.warning("protocol attachment lookup failed for %s: %s", tid, exc)
        atts = None                                  # keep whatever we had
    if atts is not None:
        first = next((a for a in atts
                      if (a.get("mimetype") or "").lower().startswith("image/")
                      or (a.get("extension") or "").lower() in {"jpg", "jpeg", "png", "webp"}), None)
        if not first:
            entry = {}
        elif first.get("id") != entry.get("att") or not entry.get("file") \
                or not os.path.exists(os.path.join(IMAGE_CACHE_DIR, entry["file"])):
            try:
                img = session.get(first.get("url") or first.get("url_w_query"), timeout=HTTP_TIMEOUT)
                img.raise_for_status()
                ext = (first.get("extension") or "png").lower()
                fname = f"protocol-{tid}.{ext}"
                os.makedirs(IMAGE_CACHE_DIR, exist_ok=True)
                with open(os.path.join(IMAGE_CACHE_DIR, fname), "wb") as f:
                    f.write(img.content)
                entry = {"att": first.get("id"), "file": fname, "v": int(time.time())}
            except Exception as exc:
                log.warning("protocol image download failed for %s: %s", tid, exc)
        index[tid] = entry
    if entry.get("file") and os.path.exists(os.path.join(IMAGE_CACHE_DIR, entry["file"])):
        return f"/api/protocol-image/{tid}?v={entry.get('v', 0)}"
    return None


BULLET = re.compile(r"^\s*[*\-+]\s+(.*)$")
NUMBER = re.compile(r"^\s*\d+[.)]\s+(.*)$")


def parse_sections(markdown):
    """-> [{title, blocks: [{type: 'ul'|'ol'|'p', items: [str]}]}]"""
    sections, cur = [], None
    for raw in (markdown or "").splitlines():
        line = raw.rstrip()
        if line.startswith("## "):
            cur = {"title": line[3:].strip(), "blocks": []}
            sections.append(cur)
            continue
        if cur is None:
            cur = {"title": "", "blocks": []}
            sections.append(cur)
        if not line.strip() or re.match(r"^\s*(\d+[.)]|[*\-+])\s*$", line):
            continue                          # blank, or a bare "1." / "*" placeholder
        m, kind = BULLET.match(line), "ul"
        if not m:
            m, kind = NUMBER.match(line), "ol"
        text = (m.group(1) if m else line).strip()
        if not m:
            kind = "p"
        if text.strip("*-_ .…") == "":        # placeholder bullet, e.g. a bare "*"
            continue
        blocks = cur["blocks"]
        if blocks and blocks[-1]["type"] == kind and kind != "p":
            blocks[-1]["items"].append(text)
        else:
            blocks.append({"type": kind, "items": [text]})
    return [s for s in sections if s["title"] or s["blocks"]]


def is_draft(p):
    """A protocol with no real content yet — skipped so the site keeps showing
    its older built-in notes for that symptom instead of an empty card.
    Brain's placeholders say "(Draft: ...)" in the Summary."""
    if re.match(r"^\(?\s*draft\b", p["summary"] or "", re.I):
        return True
    items = sum(len(b["items"]) for s in p["sections"] for b in s["blocks"])
    items += sum(len(r["items"]) for r in p["ladder"])
    return items == 0 and not p["vet"]


def _to_protocol(task):
    sections = parse_sections(task.get("markdown_description") or task.get("text_content"))
    summary = ""
    ladder, body = [], []
    for s in sections:
        key = s["title"].strip().lower()
        if key == "summary":
            summary = " ".join(i for b in s["blocks"] for i in b["items"])
        elif key in LADDER:
            items = [i for b in s["blocks"] for i in b["items"]]
            ladder.append({"tier": LADDER[key], "label": s["title"], "items": items})
        else:
            body.append(s)
    ladder = sorted((r for r in ladder if r["items"]), key=lambda r: r["tier"])
    body = [s for s in body if s["blocks"]]
    return {
        "id": task.get("id"),
        "name": (task.get("name") or "").strip(),
        "group": _dropdown_name(task, F_GROUP) or (task.get("name") or "").strip(),
        "severity": _dropdown_name(task, F_SEVERITY),
        "vet": (_raw_value(task, F_VET) or "").strip() or None,
        "summary": summary,
        "ladder": ladder,
        "sections": body,
        "updated": task.get("date_updated"),
    }


class _ProtocolsCache:
    def __init__(self):
        self.lock = threading.Lock()
        self.by_group = {}
        self.fetched_at = 0.0
        self.error = None

    def snapshot(self):
        with self.lock:
            return {
                "live": bool(self.fetched_at),
                "fetched_at": self.fetched_at,
                "error": self.error,
                "protocols": dict(self.by_group),
            }

    def refresh(self):
        if not TOKEN:
            with self.lock:
                self.error = "CLICKUP_TOKEN is not set"
            return
        try:
            session = _session()
            tasks, page = [], 0
            while True:
                resp = session.get(
                    f"{BASE}/list/{PROTOCOLS_LIST_ID}/task",
                    params={"subtasks": "false", "include_markdown_description": "true", "page": page},
                    timeout=HTTP_TIMEOUT,
                )
                resp.raise_for_status()
                payload = resp.json()
                batch = payload.get("tasks") or []
                tasks.extend(batch)
                if payload.get("last_page", True) or not batch or page > 5:
                    break
                page += 1
            index = _load_index()
            by_group = {}
            for t in tasks:
                p = _to_protocol(t)
                if is_draft(p):
                    continue
                if p["group"]:
                    p["img"] = _image_url(session, t, index)
                    by_group[p["group"]] = p
            _save_index(index)
            with self.lock:
                self.by_group = by_group
                self.fetched_at = time.time()
                self.error = None
            log.info("protocols refresh ok: %s", ", ".join(sorted(by_group)))
        except Exception as exc:
            log.warning("protocols refresh failed: %s", exc)
            with self.lock:
                self.error = str(exc)

    def loop(self):
        while True:
            self.refresh()
            time.sleep(max(60, REFRESH_SECONDS))


PROTOCOLS = _ProtocolsCache()


def start():
    if not TOKEN:
        log.warning("CLICKUP_TOKEN unset — symptom protocols serve the bundled copy only")
        return
    threading.Thread(target=PROTOCOLS.loop, name="protocols-live-refresh", daemon=True).start()


def protocols_payload():
    return PROTOCOLS.snapshot()
