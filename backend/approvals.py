"""
Approval queue for the Tasks tab: nothing staff (or kids) do on the site
changes ClickUp until Meghann approves it.

Ticking a box or logging a session is saved here, in the site's own SQLite
database, as a pending action. The site shows it straight away (marked
"awaiting approval"), so the person at the barn sees their tick stick. On the
Approve screen Meghann reviews each one — who, what, which day, their note —
and approves (the server then writes it to ClickUp via tasks_live) or rejects
(it disappears and the task goes back to how ClickUp has it).

The Approve screen is protected by APPROVER_PIN (a Render environment
variable). With no PIN set, nothing can be approved — safe by default.
"""
import hmac
import json
import os
import sqlite3
from datetime import datetime, timezone

import tasks_live

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "zones.db")
PIN = os.environ.get("APPROVER_PIN", "").strip()


def _db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS pending_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kind TEXT NOT NULL,            -- 'check' or 'session'
            key TEXT,                      -- task item key for 'check'
            payload TEXT NOT NULL,         -- JSON: what to write on approval + what to show
            by TEXT,
            note TEXT,
            created TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',   -- pending / approved / rejected
            decided TEXT,
            error TEXT
        )
    """)
    return conn


def _now():
    return datetime.now(timezone.utc).isoformat()


def pin_ok(pin):
    return bool(PIN) and hmac.compare_digest(str(pin or ""), PIN)


def _row(r):
    p = json.loads(r["payload"])
    return {"id": r["id"], "kind": r["kind"], "key": r["key"], "by": r["by"], "note": r["note"],
            "created": r["created"], "status": r["status"], "error": r["error"], **p}


def _pending(conn):
    return [_row(r) for r in conn.execute(
        "SELECT * FROM pending_actions WHERE status='pending' ORDER BY id").fetchall()]


# ---------------------------------------------------------------- staff side
def submit_check(key, done, by=None, note=None):
    """Queue a tick/untick. Unticking something still pending just cancels it."""
    conn = _db()
    try:
        if key.startswith("pending-"):          # a logged session not approved yet
            pid = int(key.split(":")[0].split("-")[1])
            conn.execute("DELETE FROM pending_actions WHERE id=? AND status='pending'", (pid,))
            conn.commit()
            return {"key": key, "cancelled": True}
        item = tasks_live.CACHE.find(key)
        if not item:
            raise LookupError("unknown task")
        existing = conn.execute(
            "SELECT * FROM pending_actions WHERE kind='check' AND key=? AND status='pending'", (key,)).fetchone()
        if existing:
            conn.execute("DELETE FROM pending_actions WHERE id=?", (existing["id"],))
        if bool(item["done"]) != bool(done):
            payload = {"done": bool(done), "date": item["date"], "horses": item["horses"],
                       "title": item["title"], "item_kind": item["kind"]}
            conn.execute(
                "INSERT INTO pending_actions (kind, key, payload, by, note, created) VALUES ('check', ?, ?, ?, ?, ?)",
                (key, json.dumps(payload), (by or "").strip()[:40] or None, (note or "").strip()[:1000] or None, _now()))
        conn.commit()
        return {"key": key, "done": bool(done), "pending": bool(item["done"]) != bool(done)}
    finally:
        conn.close()


def submit_session(horse, activity, day, minutes=None, note=None, by=None):
    with tasks_live.CACHE.lock:
        known = horse in tasks_live.CACHE.animals or horse in tasks_live.CACHE.horses
    if not known:
        raise LookupError("unknown horse")
    activity = (activity or "").strip()[:60]
    if not activity:
        raise ValueError("activity is required")
    day = day or datetime.now(tasks_live.BARN_TZ).date().isoformat()
    payload = {"horse": horse, "activity": activity, "date": day,
               "minutes": int(minutes) if minutes else None, "horses": [horse], "title": activity,
               "item_kind": "training", "done": True}
    conn = _db()
    try:
        cur = conn.execute(
            "INSERT INTO pending_actions (kind, key, payload, by, note, created) VALUES ('session', NULL, ?, ?, ?, ?)",
            (json.dumps(payload), (by or "").strip()[:40] or None, (note or "").strip()[:1000] or None, _now()))
        conn.commit()
        return _session_item(_row(conn.execute("SELECT * FROM pending_actions WHERE id=?", (cur.lastrowid,)).fetchone()))
    finally:
        conn.close()


def _session_item(p):
    return {
        "key": f"pending-{p['id']}:{p['date']}", "date": p["date"], "horses": p["horses"],
        "title": p["activity"], "kind": "training", "type": None,
        "note": [x for x in (f"Minutes: {p['minutes']}" if p.get("minutes") else None, p.get("note")) if x],
        "done": True, "done_by": p.get("by"), "mode": "pending", "pending": True,
    }


def overlay(payload):
    """The live task payload with pending actions shown on top."""
    conn = _db()
    try:
        pending = _pending(conn)
    finally:
        conn.close()
    checks = {p["key"]: p for p in pending if p["kind"] == "check"}
    items = []
    for i in payload.get("items") or []:
        p = checks.get(i["key"])
        if p:
            i = {**i, "done": p["done"], "done_by": p["by"] if p["done"] else None, "pending": True}
        items.append(i)
    items.extend(_session_item(p) for p in pending if p["kind"] == "session")
    return {**payload, "items": items, "pending_count": len(pending), "approvals_enabled": bool(PIN)}


# ---------------------------------------------------------------- Meghann's side
def list_pending():
    conn = _db()
    try:
        return _pending(conn)
    finally:
        conn.close()


def _decide(pid, status, error=None):
    conn = _db()
    try:
        conn.execute("UPDATE pending_actions SET status=?, decided=?, error=? WHERE id=?",
                     (status, _now(), error, pid))
        conn.commit()
    finally:
        conn.close()


def approve(pid):
    """Write one pending action to ClickUp. Raises if ClickUp refuses (it stays pending)."""
    conn = _db()
    try:
        r = conn.execute("SELECT * FROM pending_actions WHERE id=? AND status='pending'", (pid,)).fetchone()
    finally:
        conn.close()
    if not r:
        raise LookupError("not pending")
    p = _row(r)
    try:
        if p["kind"] == "check":
            tasks_live.check(p["key"], p["done"], p["by"], p["note"])
        else:
            tasks_live.log_session(p["horse"], p["activity"], p["date"], p.get("minutes"), p["note"], p["by"])
    except Exception as exc:
        conn = _db()
        conn.execute("UPDATE pending_actions SET error=? WHERE id=?", (str(exc)[:300], pid))
        conn.commit()
        conn.close()
        raise
    _decide(pid, "approved")


def reject(pid):
    _decide(pid, "rejected")
