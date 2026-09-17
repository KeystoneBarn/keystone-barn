"""Offline check of the ClickUp -> site transform.

Runs the real mapping code against fixtures captured from the live Products
list, so the field mapping, dropdown resolution, description splitting and
de-duplication can be verified without a token or a network call.

    python3 backend/scripts/test_clickup_live.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import clickup_live as cl  # noqa: E402

CATEGORY_OPTIONS = [
    {"id": "0379771a-3eb4-4d5b-885f-80780d25e0f8", "name": "Fly / Pest Control", "orderindex": 0},
    {"id": "1b1c8b76-0964-4420-804f-909530e08fb1", "name": "Wound Care", "orderindex": 5},
    {"id": "5c25d37e-f42f-4f82-9bbd-0a14a09d0969", "name": "Medication", "orderindex": 9},
]
VERDICT_OPTIONS = [
    {"id": "06742409-c22d-4316-95fe-705515394d65", "name": "Barn Favorite", "orderindex": 0},
    {"id": "557057d1-e65b-4102-9a5d-b297b115524d", "name": "Proven", "orderindex": 1},
]
STORAGE_OPTIONS = [
    {"id": "98bde479-19eb-41f5-8e80-7dcc5a818114", "name": "Grooming Bay", "orderindex": 4},
    {"id": "2306cb75-4d84-409b-b3dd-d0315d30a55d", "name": "Med Shelf (Feed Room)", "orderindex": 2},
    {"id": "91000639-b1b9-4a45-815c-1f6275311561", "name": "Out of Stock", "orderindex": 6},
]
SYMPTOM_OPTIONS = [
    {"id": "8e5d9d92-bdd2-437c-a710-f62976468557", "label": "Minor cut or scrape", "orderindex": 0},
    {"id": "b251ef18-975f-4ad7-88b3-81f7912ff85d", "label": "Chronic Diarrhea", "orderindex": 12},
]


def field(fid, value, options=None, ftype="drop_down"):
    f = {"id": fid, "type": ftype, "type_config": {}, "value": value}
    if options is not None:
        f["type_config"] = {"options": options}
    return f


# --- fixture 1: Wound Ender, exactly as the live API returns it -------------
WOUND_ENDER = {
    "id": "86e2knnw8",
    "name": "Wound Ender",
    "status": {"status": "active"},
    "date_updated": "1787712328403",
    "markdown_description": (
        "Treatment and care for skin rashes, cuts, and wounds. Colorless, odorless, "
        "non-toxic. Does not sting.\n\nApply directly to clean wound or affected skin. "
        "Wait 30 seconds before turning back out."
    ),
    "custom_fields": [
        field(cl.F_CATEGORY, 5, CATEGORY_OPTIONS),
        field(cl.F_VERDICT, 1, VERDICT_OPTIONS),
        field(cl.F_STORAGE, 4, STORAGE_OPTIONS),
        field(cl.F_SYMPTOMS, ["8e5d9d92-bdd2-437c-a710-f62976468557"], SYMPTOM_OPTIONS, "labels"),
        field(cl.F_DIRECTIONS, None),
        field(cl.F_URL, None),
        field(cl.F_EXPERIMENT, None, None, "checkbox"),
    ],
}

# --- fixture 2: Bio-Sponge, which carries a "## Notes" escalation block -----
BIO_SPONGE = {
    "id": "86e2zzhgu",
    "name": "Platinum Performance Bio-Sponge",
    "status": {"status": "active"},
    "date_updated": "1789604114217",
    "markdown_description": (
        "GI support product for diarrhea / loose stool cases.\n\nUse when diarrhea is "
        "the main issue.\n\n* * *\n\n## Notes\n\nIndicated for diarrhea.\n\n**Escalate:** "
        "If the horse is not still eating, drinking, and acting normally, escalate with "
        "a call to the vets."
    ),
    "custom_fields": [
        field(cl.F_CATEGORY, 9, CATEGORY_OPTIONS),
        field(cl.F_VERDICT, 1, VERDICT_OPTIONS),
        field(cl.F_STORAGE, 2, STORAGE_OPTIONS),
        field(cl.F_SYMPTOMS, ["b251ef18-975f-4ad7-88b3-81f7912ff85d"], SYMPTOM_OPTIONS, "labels"),
        field(cl.F_DIRECTIONS, None),
        field(cl.F_URL, "https://example.com/bio-sponge"),
        field(cl.F_EXPERIMENT, "true", None, "checkbox"),
    ],
}

# --- fixture 3: a UUID-valued dropdown, an Rx product, discontinued, no stock
RX_RETIRED = {
    "id": "86e2knnx7",
    "name": "Silver Sulfadiazine Cream 1% (Ascend)",
    "status": {"status": "discontinued"},
    "date_updated": "1787865163263",
    "markdown_description": "Prescription topical antibiotic cream. Rx only.",
    "custom_fields": [
        field(cl.F_CATEGORY, "1b1c8b76-0964-4420-804f-909530e08fb1", CATEGORY_OPTIONS),
        field(cl.F_VERDICT, None, VERDICT_OPTIONS),
        field(cl.F_STORAGE, 6, STORAGE_OPTIONS),
        field(cl.F_SYMPTOMS, [], SYMPTOM_OPTIONS, "labels"),
        field(cl.F_DIRECTIONS, "Apply topically per vet."),
    ],
}

# --- fixture 4: the empty duplicate that shadows a real product ------------
DUPE_EMPTY = {
    "id": "86e2zy0c9",
    "name": "wound ender ",           # sloppy case/whitespace, as duplicates are
    "status": {"status": "active"},
    "date_updated": "1789999999999",  # newer, but empty
    "markdown_description": "",
    "custom_fields": [field(cl.F_CATEGORY, 5, CATEGORY_OPTIONS)],
}


def main():
    failures = []

    def check(label, got, want):
        if got != want:
            failures.append(f"{label}: got {got!r}, wanted {want!r}")

    index = {}
    cl.BUNDLED_IMAGES_DIR = "/nonexistent"  # isolate from the repo's photos

    we = cl._to_product(WOUND_ENDER, index)
    check("wound ender category", we["c"], "Wound Care")
    check("wound ender verdict", we["v"], "Proven")
    check("wound ender shelf", we["loc"], "Grooming Bay")
    check("wound ender symptoms", we["sx"], ["Minor cut or scrape"])
    check("wound ender lead", we["d"],
          "Treatment and care for skin rashes, cuts, and wounds. Colorless, odorless, non-toxic. Does not sting.")
    check("wound ender directions", we["dose"],
          "Apply directly to clean wound or affected skin. Wait 30 seconds before turning back out.")
    check("wound ender note", we["note"], None)
    check("wound ender rx", we["rx"], False)
    check("wound ender retired", we["retired"], False)

    bs = cl._to_product(BIO_SPONGE, index)
    check("bio-sponge category", bs["c"], "Medication")
    check("bio-sponge lead", bs["d"], "GI support product for diarrhea / loose stool cases.")
    check("bio-sponge directions", bs["dose"], "Use when diarrhea is the main issue.")
    check("bio-sponge note starts", (bs["note"] or "").startswith("Indicated for diarrhea."), True)
    check("bio-sponge escalation flagged", bs["warn"], True)
    check("bio-sponge experiment flag", bs["exp"], True)
    check("bio-sponge url", bs["url"], "https://example.com/bio-sponge")
    check("bio-sponge symptoms", bs["sx"], ["Chronic Diarrhea"])

    rx = cl._to_product(RX_RETIRED, index)
    check("uuid-valued dropdown", rx["c"], "Wound Care")
    check("rx detected", rx["rx"], True)
    check("discontinued -> retired", rx["retired"], True)
    check("out of stock flag", rx["oos"], True)
    check("out of stock hides shelf", rx["loc"], None)
    check("directions field wins", rx["dose"], "Apply topically per vet.")

    deduped, dupe_names = cl._dedupe([we, bs, rx, cl._to_product(DUPE_EMPTY, index)])
    check("dedupe count", len(deduped), 3)
    kept = next(p for p in deduped if p["n"].strip().lower() == "wound ender")
    check("dedupe keeps the described copy", kept["d"][:20], "Treatment and care f")
    check("duplicate reported", dupe_names, ["Wound Ender"])

    # An unknown label id must not crash or invent a name.
    weird = dict(WOUND_ENDER)
    weird["custom_fields"] = [field(cl.F_SYMPTOMS, ["not-a-real-id"], SYMPTOM_OPTIONS, "labels")]
    check("unknown label ignored", cl._to_product(weird, index)["sx"], [])
    check("missing category falls back", cl._to_product(weird, index)["c"], "Other")

    if failures:
        print("FAILED")
        for f in failures:
            print("  -", f)
        return 1
    print(f"ok — {4} fixtures, all mappings correct")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
