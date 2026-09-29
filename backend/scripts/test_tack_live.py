"""Offline check of the ClickUp Tack Board -> site transform.

Fixtures mirror tasks read from the live 🧢 Tack Board list on 2026-09-28
(horse parents + saddle subtasks, including retired/completed ones).

    python3 backend/scripts/test_tack_live.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import tack_live as tl  # noqa: E402

COLLAR = [
    {"id": "a8233f38", "name": "Breast Collar (larger)", "orderindex": 0},
    {"id": "69a55175", "name": "Breast Collar (smaller)", "orderindex": 1},
    {"id": "69223ba7", "name": "None", "orderindex": 2},
]
BIT = [
    {"id": "f35da79b", "name": "Myler SS L2 Dee Low Port 4.75\"", "orderindex": 1},
    {"id": "67ea5e23", "name": "Myler L2 Med Baucher Low Port Comfort Snaffle 4.75\"", "orderindex": 2},
]
PAD = [
    {"id": "1746c220", "name": "None", "orderindex": 0},
    {"id": "5be81d83", "name": "Black Fuzzy Half Pad", "orderindex": 1},
    {"id": "b417bcfc", "name": "Blue Wool", "orderindex": 6},
]
BOOTS = [
    {"id": "be81ab71", "name": "Scoot Boots (fitted set)", "orderindex": 0},
    {"id": "9db1f36b", "name": "None", "orderindex": 1},
]
SADDLE = [
    {"id": "a321b791", "name": "🟠 Orange Saddle", "color": "#FFA500", "orderindex": 1},
    {"id": "cf0f2106", "name": "🔴 Red Saddle", "color": "#FF0000", "orderindex": 3},
    {"id": "21826620", "name": "🟣 Pink Saddle", "color": "#C154C1", "orderindex": 4},
    {"id": "bdab6967", "name": "👵🏼 Old Saddle", "color": "#A9A9A9", "orderindex": 6},
    {"id": "058d2479", "name": "🤠 Blue Western", "color": "#cecece", "orderindex": 8},
]
RANK = [
    {"id": "e24ec43b", "name": "1st", "orderindex": 0},
    {"id": "98a61c09", "name": "2nd", "orderindex": 1},
    {"id": "5dc0c0aa", "name": "3rd", "orderindex": 2},
    {"id": "5be3c698", "name": "Alt", "orderindex": 3},
]
ANIMAL = [
    {"id": "a8dda4d5", "name": "Hugo🐴", "orderindex": 0},
    {"id": "e8515060", "name": "Dahlia🐴", "orderindex": 2},
    {"id": "76d86ad2", "name": "Linka🐴", "orderindex": 7},
]


def f(fid, options, value=None, ftype="drop_down"):
    field = {"id": fid, "type": ftype, "type_config": {"options": options} if options else {}}
    if value is not None:
        field["value"] = value
    return field


def task(tid, name, status="active", parent=None, **vals):
    return {
        "id": tid,
        "name": name,
        "status": {"status": status},
        "parent": parent,
        "url": f"https://app.clickup.com/t/{tid}",
        "custom_fields": [
            f(tl.F_BREAST_COLLAR, COLLAR, vals.get("collar")),
            f(tl.F_BIT, BIT, vals.get("bit")),
            f(tl.F_PAD, PAD, vals.get("pad")),
            f(tl.F_BOOTS, BOOTS, vals.get("boots")),
            f(tl.F_SADDLE, SADDLE, vals.get("saddle")),
            f(tl.F_FIT_NOTES, None, vals.get("notes"), "text"),
            f(tl.F_RANK, RANK, vals.get("rank")),
            f(tl.F_ANIMAL, ANIMAL, vals.get("animal")),
        ],
    }


TASKS = [
    task("hugo", "Hugo", collar=2, bit=1, boots=0, animal=0,
         notes="Red saddle for smaller rider (Clara)."),
    task("h-old", "Hugo: 👵🏼 Old Saddle", status="completed", parent="hugo", saddle=6),
    task("h-red", "Hugo: 🔴 Red Saddle (smaller rider)", parent="hugo", saddle=3, rank=1),
    task("h-west", "Hugo: 🤠 Blue Western Saddle", parent="hugo", saddle=8, pad=6, rank=2),
    task("h-new", "Hugo: 🟠 Orange Saddle", parent="hugo", saddle=1),       # unranked
    task("h-top", "Hugo: 🟣 Pink Saddle", parent="hugo", saddle="21826620", rank="e24ec43b"),
    task("dahlia", "Dahlia", collar=2, bit=2, boots=1, animal=2),
    task("linka", "Linka", status="retired", animal=7),
    task("l-pink", "Linka: 🩷 Pink Saddle (use 2 back billets)", parent="linka", saddle=4, rank=2),
]


def main():
    horses = tl.build(TASKS)
    names = [h["horse"] for h in horses]
    assert names == ["Dahlia", "Hugo"], names          # retired Linka dropped, sorted

    hugo = horses[1]
    assert hugo["bit"] == 'Myler SS L2 Dee Low Port 4.75"', hugo["bit"]
    assert hugo["breast_collar"] is None                 # "None" option -> null
    assert hugo["boots"] == "Scoot Boots (fitted set)"
    assert hugo["notes"].startswith("Red saddle")

    labels = [s["label"] for s in hugo["saddles"]]
    # completed Old Saddle gone; UUID-valued rank works; unranked sorts last
    assert labels == ["🟣 Pink Saddle", "🔴 Red Saddle", "🤠 Blue Western Saddle", "🟠 Orange Saddle"], labels
    red = hugo["saddles"][1]
    assert red["note"] == "smaller rider" and red["rank"] == "2nd" and red["color"] == "#FF0000", red
    west = hugo["saddles"][2]
    assert west["pad"] == "Blue Wool" and west["saddle"] == "🤠 Blue Western", west

    dahlia = horses[0]
    assert dahlia["boots"] is None and dahlia["saddles"] == []

    assert tl._split_saddle_name("Linka: 🩷 Pink Saddle (use 2 back billets)", "Linka") == (
        "🩷 Pink Saddle", "use 2 back billets")
    print("tack_live ok:", ", ".join(f"{h['horse']}={len(h['saddles'])}" for h in horses))


if __name__ == "__main__":
    main()
