"""Offline check of live oral meds in feed_live (💊Treatment + 🪣 AM/PM).

Fixtures mirror Health Log tasks read on 2026-09-28.

    python3 backend/scripts/test_feed_meds.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import feed_live as fl  # noqa: E402

NOTE = [{"id": "ad3ed7d8", "name": "💊Treatment", "orderindex": 5}, {"id": "33128385", "name": "🌾Feed", "orderindex": 11}]
PRODUCT = [{"id": "7311941c", "name": "Prascend (oral)", "orderindex": 10},
           {"id": "1818cb9c", "name": "Adequan", "orderindex": 20},
           {"id": "e0438379", "name": "Reserpine", "orderindex": 55}]
UNIT = [{"id": "47cb31db", "name": "tablets", "orderindex": 2}, {"id": "eeabe0b1", "name": "mL", "orderindex": 3}]
AMPM = [{"id": "ba8087ce", "name": "AM", "orderindex": 0}, {"id": "84343b51", "name": "PM", "orderindex": 1}]
ANIMAL = [{"id": "5f6de970", "name": "Qu🐴", "orderindex": 1}, {"id": "35c12c6e", "name": "Mickey🐴", "orderindex": 3}]


def task(tid, note, product, qty=None, unit=None, ampm=None, animal=None, start=None, due=None):
    def f(fid, opts, v, t="drop_down"):
        return {"id": fid, "type": t, "type_config": {"options": opts} if opts else {}, "value": v}
    return {
        "id": tid, "name": tid, "url": "u/" + tid, "start_date": start, "due_date": due,
        "custom_fields": [
            f(fl.F_NOTE_TYPE, NOTE, note), f(fl.F_PRODUCT, PRODUCT, product),
            f(fl.F_VALUE, None, qty, "number"), f(fl.F_UNIT, UNIT, unit),
            f(fl.F_AMPM, AMPM, ampm), f(fl.F_ANIMAL, ANIMAL, animal),
        ],
    }


def main():
    daily = fl._to_med(task("mickey-prascend", 5, 10, "2", 2, 0, 3), {})
    assert daily["horse"] == "Mickey" and daily["amount"] == "2 tablets" and daily["course"] is None, daily

    doses = {"reserpine": [{"date": "2026-09-01", "amount": None}, {"date": "2026-09-02", "amount": None}]}
    course = fl._to_med(task("reserpine", 5, 55, None, None, 0, 1, "1788253200000", "1790845200000"), doses)
    assert course["course"] == {"start": "2026-09-01", "end": "2026-10-01"}, course
    assert course["doses_given"] == 2 and course["last_dose"]["date"] == "2026-09-02"

    # Injection series: 💊Treatment but no AM/PM -> not a bucket med
    assert fl._to_med(task("adequan", 5, 20, "5", 3, None, 1), {}) is None
    # Feed entries are left to _to_line
    assert fl._to_med(task("feed", 11, 10, "1", 2, 0, 3), {}) is None
    assert fl._day("1788580800000") == "2026-09-05"   # API-created (midnight Eastern) all-day date
    print("feed meds ok")


if __name__ == "__main__":
    main()
