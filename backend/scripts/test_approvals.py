"""Offline check of the Tasks approval queue (approvals.py): staff actions wait
for Meghann, and only approval writes to ClickUp.

    python3 backend/scripts/test_approvals.py
"""
import os
import sys
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import approvals  # noqa: E402
import tasks_live as tl  # noqa: E402
import test_tasks_live as fx  # noqa: E402

writes = []
tl.check = lambda key, done, by=None, note=None: writes.append(("check", key, done, by, note))
tl.log_session = lambda *a: writes.append(("session",) + a)


def main():
    approvals.DB_PATH = os.path.join(tempfile.mkdtemp(), "t.db")
    approvals.PIN = "4321"
    items, horses = tl.build(fx.TASKS, fx.WORKOUTS, today=fx.TODAY, course_comments=fx.COMMENTS, training=fx.TRAINING)
    tl.CACHE.items, tl.CACHE.horses, tl.CACHE.animals = items, horses, {h: "opt-" + h for h in horses}
    payload = lambda: approvals.overlay(tl.CACHE.snapshot())  # noqa: E731
    find = lambda key: next(i for i in payload()["items"] if i["key"] == key)  # noqa: E731

    # A tick shows at once, marked pending — and nothing is written to ClickUp
    approvals.submit_check("wrap1:2026-10-19", True, "Sydney", "Leg looked dry")
    w = find("wrap1:2026-10-19")
    assert w["done"] and w["pending"] and w["done_by"] == "Sydney"
    assert writes == [] and payload()["pending_count"] == 1

    # Unticking a pending tick cancels it
    approvals.submit_check("wrap1:2026-10-19", False, "Sydney")
    assert not find("wrap1:2026-10-19")["done"] and payload()["pending_count"] == 0

    # Logged session appears as a pending training item; unticking it cancels it
    s = approvals.submit_session("Hugo", "Ride", "2026-10-19", 45, "Forward and happy", "Ava")
    assert s["pending"] and s["kind"] == "training" and find(s["key"])["note"] == ["Minutes: 45", "Forward and happy"]
    approvals.submit_check(s["key"], False)
    assert payload()["pending_count"] == 0

    # Approve writes exactly what was queued; reject writes nothing
    approvals.submit_check("wrap1:2026-10-19", True, "Sydney", "Leg looked dry")
    approvals.submit_session("Qu", "Hand walk", "2026-10-19", None, None, "Ava")
    pend = approvals.list_pending()
    assert [p["kind"] for p in pend] == ["check", "session"] and pend[0]["title"] == "Change wrap"
    approvals.approve(pend[0]["id"])
    approvals.reject(pend[1]["id"])
    assert writes == [("check", "wrap1:2026-10-19", True, "Sydney", "Leg looked dry")], writes
    assert approvals.list_pending() == []

    # PIN
    assert approvals.pin_ok("4321") and not approvals.pin_ok("1234") and not approvals.pin_ok(None)
    approvals.PIN = ""
    assert not approvals.pin_ok("")
    print("ok")


if __name__ == "__main__":
    main()
