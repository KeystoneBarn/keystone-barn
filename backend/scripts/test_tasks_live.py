"""Offline check of the Tasks tab reader (tasks_live.build).

Fixtures mirror Health Log tasks read on 2026-10-19.

    python3 backend/scripts/test_tasks_live.py
"""
import os
import sys
from datetime import date

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import tasks_live as tl  # noqa: E402
from feed_live import F_AMPM, F_ANIMAL, F_NOTE_TYPE  # noqa: E402

ANIMAL = [{"id": "a-" + n, "name": n + "🐴", "orderindex": i}
          for i, n in enumerate(["Hugo", "Qu", "Mickey", "Ulyssa", "Avelin", "DeNozzo", "Ratatouille"])]
ANIMAL.append({"id": "a-Soda", "name": "Soda🐶", "orderindex": 99})
NOTE = [{"id": "n-" + n, "name": n, "orderindex": i} for i, n in enumerate(
    ["💊Treatment", "👀Observation", "💉Vaccination", "🧲Farrier", "🌾Feed", "⚖️Weight", "💉Injection"])]
AMPM = [{"id": "am", "name": "AM", "orderindex": 0}]
D = lambda s: str(tl._day_ms(date.fromisoformat(s)))  # noqa: E731
TODAY = date(2026, 10, 19)


def task(tid, name, animal=None, note=None, start=None, due=None, status="to do", parent=None, ampm=None, desc=""):
    idx = lambda opts, n: next((o["orderindex"] for o in opts if o["name"].rstrip("🐴") == n), None)  # noqa: E731
    return {
        "id": tid, "name": name, "parent": parent, "status": {"status": status}, "description": desc,
        "start_date": D(start) if start else None, "due_date": D(due) if due else None,
        "custom_fields": [
            {"id": F_ANIMAL, "type": "drop_down", "type_config": {"options": ANIMAL}, "value": idx(ANIMAL, animal) if animal else None},
            {"id": F_NOTE_TYPE, "type": "drop_down", "type_config": {"options": NOTE}, "value": idx(NOTE, note) if note else None},
            {"id": F_AMPM, "type": "drop_down", "type_config": {"options": AMPM}, "value": 0 if ampm else None},
        ],
    }


TASKS = [
    task("banamine", "Qu: Banamine paste 1000 lb dose daily", "Qu", "💊Treatment", "2026-10-20", "2026-10-21", "in progress",
         desc="From  (Dr. Jon, 10/19/2026)\n1,000 lb dose of paste on Tue 10/20 and Wed 10/21, post-Renovo\nNo other NSAIDs in conjunction"),
    task("stallrest", "Qu: Stall rest & wrapped", "Qu", None, "2026-10-17", "2026-10-20", "in progress"),
    task("wrap1", "Qu: Change wrap", "Qu", None, None, "2026-10-19"),
    task("wrap0", "Qu: Change wrap", "Qu", None, None, "2026-10-16"),
    task("wound", "Mickey: Vetasan or Desitin on wound", "Mickey", "💊Treatment", "2026-10-18", "2026-10-20", "in progress"),
    task("wound-log", "Mickey: Vetasan – Oct 18", "Mickey", "💊Treatment", None, "2026-10-18", "complete", parent="wound"),
    task("stiff", "Hugo: Very stiff despite near-daily red light & Bemer", "Hugo", "👀Observation", "2026-10-08", "2026-10-19", "in progress"),
    task("ulcer", "DeNozzo: UlcerGuard ¼ tube daily", "DeNozzo", "💊Treatment", "2026-10-12", "2026-10-31", "in progress", ampm=True),
    task("uly-series", "Ulyssa: Adequan series", "Ulyssa", "💊Treatment", "2026-09-29", "2026-10-21", "in progress"),
    task("uly-6", "Ulyssa: Adequan Dose 6", "Ulyssa", "💊Treatment", None, "2026-10-17", "complete", parent="uly-series"),
    task("uly-7", "Ulyssa: Adequan Dose 7", "Ulyssa", "💊Treatment", None, "2026-10-21", parent="uly-series"),
    task("chiro", "Chiro: Herd", None, None, None, "2026-10-21"),
    task("farrier", "Farrier: Hugo, Qu & Ratatouille", None, "🧲Farrier", None, "2026-10-30"),
    task("vacc", "Avelin Vaccination: Flu/Rhino", "Avelin", "💉Vaccination", None, "2026-11-10"),
    task("weight", "Mickey: Weight 1100#", "Mickey", "⚖️Weight", None, "2026-10-01", "in progress"),
]
COMMENTS = {"banamine": [
    {"id": "c1", "comment_text": "✓ Oct 20, 2026 — done by Sydney.\nNote: ate it fine"},
    {"id": "c2", "comment_text": "Vet says keep going"},
]}
TRAINING = [
    task("ride", "Hugo: Ride", "Hugo", None, None, "2026-10-18", "complete", desc="**Minutes:** 40\n\nFelt even\n\n" + tl.LOGGED_MARK + " by Sydney."),
    task("walk", "Qu: Hand walk", "Qu", None, None, "2026-10-21"),
]
WORKOUTS = [{"id": "w1", "parent": "exp-hugo", "horse": "Hugo", "date": int(D("2026-10-19")), "title": "W1 Even Walk", "focus": "Even rhythm", "done": False}]


def main():
    items, horses = tl.build(TASKS, WORKOUTS, today=TODAY, course_comments=COMMENTS, training=TRAINING)
    assert horses == ["Hugo", "Qu", "Mickey", "Ulyssa", "Avelin", "DeNozzo", "Ratatouille"], horses
    by = {}
    for i in items:
        by.setdefault(i["key"].split(":")[0], []).append(i)

    # Daily course: one item per day, start through due
    assert [i["date"] for i in by["banamine"]] == ["2026-10-20", "2026-10-21"]
    b = by["banamine"][0]
    assert b["title"] == "Banamine paste 1000 lb dose daily" and b["kind"] == "treatment" and b["mode"] == "course"
    # A day ticked on the site is a comment on the course, not a subtask
    assert b["done"] and b["done_by"] == "Sydney" and b["comment_ids"] == ["c1"], b
    assert not by["banamine"][1]["done"]
    assert b["note"][0].startswith("1,000 lb dose"), b["note"]
    assert len(by["stallrest"]) == 4 and by["stallrest"][0]["kind"] == "other"

    # A dose Meghann logged by hand as a subtask still ticks its day (and can't be unticked on the site)
    wound = {i["date"]: i for i in by["wound"]}
    assert wound["2026-10-18"]["done"] and wound["2026-10-18"]["comment_ids"] == [] and not wound["2026-10-19"]["done"]
    assert "wound-log" not in by

    # Series: the parent hides, each dose is its own task
    assert "uly-series" not in by and by["uly-7"][0]["date"] == "2026-10-21" and by["uly-6"][0]["done"]

    # Records and bucket meds stay off
    for k in ("stiff", "ulcer", "weight"):
        assert k not in by, k

    # Horses from the name when the dropdown is blank; herd tasks have none
    assert by["farrier"][0]["horses"] == ["Hugo", "Qu", "Ratatouille"] and by["farrier"][0]["kind"] == "farrier"
    assert by["chiro"][0]["horses"] == []
    assert by["vacc"][0]["title"] == "Vaccination: Flu/Rhino" and by["vacc"][0]["kind"] == "vaccination"

    # Pole work from Experiments
    assert by["w1"][0]["kind"] == "exercise" and by["w1"][0]["horses"] == ["Hugo"]
    assert by["w1"][0]["experiment_id"] == "exp-hugo"

    # Training Log: logged sessions done, planned ones open
    r = by["ride"][0]
    assert r["kind"] == "training" and r["title"] == "Ride" and r["done"] and r["done_by"] == "Sydney"
    assert r["note"] == ["Minutes: 40", "Felt even"], r["note"]
    assert by["walk"][0]["title"] == "Hand walk" and not by["walk"][0]["done"]
    assert tl.course_ticks(COMMENTS["banamine"])[date(2026, 10, 20)]["by"] == "Sydney"

    # Public payload carries no ClickUp ids
    pub = tl._public(b)
    assert "task_id" not in pub and "list_id" not in pub

    print("ok —", len(items), "items")
    for i in items:
        if i["date"] <= "2026-10-21":
            print(" ", i["date"], ",".join(i["horses"]) or "Barn", "|", i["title"], "|", i["kind"], "| done" if i["done"] else "")


if __name__ == "__main__":
    main()
