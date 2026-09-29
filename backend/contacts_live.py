"""
Live "Who to Call" contacts from the ClickUp doc page "Animal Service Providers"
(doc 274d8-24577, page 274d8-20897).

Why this exists
---------------
The Board's Who to Call card and the Horses tab footer read a CONTACTS list
typed into src/data.js, so a new farrier or phone number meant a code edit.
The barn already keeps this directory as a shareable ClickUp doc for house
sitters and barn help; this makes that doc the source.

Doc shape (verified 2026-09-28), parsed from its markdown:

    ## Equine Vet                        <- role
    **Stillwater Equine Vet Clinic**     <- one contact; text after the bold
    *   Dr. Jon Engstrom                    (e.g. "(June 2026+)") is a detail
    *   651-775-7623                     <- first phone-looking bullet
    *   9550 60th St N, Stillwater, …    <- address (kept, not shown on cards)
    *   [stillwaterequine.com](https://…) <- link

A section can hold several bold names (Emergency has BluePearl and Poison
Control); each becomes its own contact under that role. Any other bullet
("Dr. Oscarson", "Hours: Tue-Sat 9am-5pm", "Venmo: …") goes into `detail`.
"""
import logging
import os
import re
import threading
import time

from clickup_live import HTTP_TIMEOUT, TOKEN, _session

log = logging.getLogger("contacts_live")

WORKSPACE_ID = os.environ.get("CLICKUP_WORKSPACE_ID", "2331048")
DOC_ID = os.environ.get("CLICKUP_CONTACTS_DOC", "274d8-24577")
PAGE_ID = os.environ.get("CLICKUP_CONTACTS_PAGE", "274d8-20897")
REFRESH_SECONDS = int(os.environ.get("CLICKUP_CONTACTS_REFRESH_SECONDS", "900"))
BASE_V3 = "https://api.clickup.com/api/v3"

HEADING = re.compile(r"^\s{0,3}#{2,6}\s+(.+?)\s*$")
BOLD_LINE = re.compile(r"^\s*\*\*(.+?)\*\*\s*(.*)$")
BULLET = re.compile(r"^\s*[*\-]\s+(.*)$")
PHONE = re.compile(r"(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}")
LINK = re.compile(r"\[([^\]]*)\]\(([^)]+)\)")
ADDRESS = re.compile(r"^\d+\s+\S.*\b[A-Z]{2}\s+\d{5}\b")
PAREN = re.compile(r"^\((.*)\)$")


def _plain(text):
    """Strip markdown emphasis/links down to readable text."""
    text = LINK.sub(lambda m: m.group(1), text)
    text = re.sub(r"[*_`]+", "", text)
    return text.strip()


def parse(markdown):
    """Doc markdown -> [{role, name, person, phone, detail, address, url}]."""
    contacts, role, current = [], None, None

    def flush():
        if current:
            current["detail"] = " · ".join(current.pop("_details")) or None
            contacts.append(current)

    for line in (markdown or "").splitlines():
        h = HEADING.match(line)
        if h:
            flush()
            current = None
            role = _plain(h.group(1))
            continue
        if role is None:
            continue
        b = BOLD_LINE.match(line)
        if b:
            flush()
            extra = _plain(b.group(2))
            paren = PAREN.match(extra)
            current = {
                "role": role,
                "name": _plain(b.group(1)),
                "person": None,
                "phone": None,
                "address": None,
                "url": None,
                "_details": [paren.group(1) if paren else extra] if extra else [],
            }
            continue
        m = BULLET.match(line)
        if not (m and current):
            continue
        raw = m.group(1).strip()
        link = LINK.search(raw)
        text = _plain(raw)
        phone = PHONE.search(text)
        if phone and not current["phone"] and len(text) <= len(phone.group(0)) + 4:
            current["phone"] = phone.group(0).strip()
        elif link and not current["url"] and text == _plain(link.group(0)):
            current["url"] = link.group(2)
        elif ADDRESS.match(text) and not current["address"]:
            current["address"] = text
        elif text.startswith("Dr.") and not current["person"]:
            current["person"] = text
        elif text:
            current["_details"].append(text)
    flush()
    return contacts


class _ContactsCache:
    def __init__(self):
        self.lock = threading.Lock()
        self.contacts = []
        self.fetched_at = 0.0
        self.error = None
        self.refreshing = False

    def enabled(self):
        return bool(TOKEN)

    def snapshot(self):
        with self.lock:
            return {
                "live": bool(self.contacts),
                "fetched_at": self.fetched_at,
                "age_seconds": round(time.time() - self.fetched_at, 1) if self.fetched_at else None,
                "error": self.error,
                "contacts": [dict(c) for c in self.contacts],
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
            resp = _session().get(
                f"{BASE_V3}/workspaces/{WORKSPACE_ID}/docs/{DOC_ID}/pages/{PAGE_ID}",
                params={"content_format": "text/md"},
                timeout=HTTP_TIMEOUT,
            )
            resp.raise_for_status()
            contacts = parse(resp.json().get("content") or "")
            if not contacts:
                raise ValueError("no contacts parsed from the doc page")
            with self.lock:
                self.contacts = contacts
                self.fetched_at = time.time()
                self.error = None
            log.info("contacts refresh ok: %d contacts", len(contacts))
        except Exception as exc:
            log.warning("contacts refresh failed: %s", exc)
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


CACHE = _ContactsCache()


def start():
    """Kick off background refreshing. Safe to call when there's no token."""
    if not CACHE.enabled():
        log.warning("CLICKUP_TOKEN unset — contacts serving bundled data only")
        return
    t = threading.Thread(target=CACHE.loop, name="contacts-live-refresh", daemon=True)
    t.start()


def contacts_payload():
    snap = CACHE.snapshot()
    return {
        "live": snap["live"],
        "fetched_at": snap["fetched_at"],
        "age_seconds": snap["age_seconds"],
        "contacts": snap["contacts"],
    }
