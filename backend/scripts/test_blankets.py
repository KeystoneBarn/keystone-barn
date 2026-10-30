"""Offline check of the blanket + weather readers.

Fixtures mirror Qu's Bucas task in 🚜 Tack & Equipment and the 10/28–10/29
🌤️ Daily Wx Log entries as read live on 2026-10-29.

    python3 backend/scripts/test_blankets.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import tack_live as tl  # noqa: E402
import weather_live as wl  # noqa: E402

HORSES_FIELD = {
    "id": tl.F_HORSES, "type": "labels",
    "type_config": {"options": [
        {"id": "26af95d7", "label": "Qu"}, {"id": "be143bb6", "label": "Hugo"},
    ]},
}

QU = {
    "id": "86e3x93q4",
    "name": 'Bucas Atlantic Turnout Medium 200g with neck piece (84", Qu)',
    "status": {"status": "active"},
    "markdown_description": (
        "## Blanket details\n*   Blanket size: 84 inches\n"
        "*   Fill: 200g (blanket); neck-piece fill and neck size unconfirmed\n"
        "*   Waterproof turnout blanket\n"
        "*   Manufacturer central recommended temperature band: approximately "
        "10°F to 46°F (-12°C to 8°C). This is guidance."
    ),
    "custom_fields": [
        {"id": tl.F_BRAND, "value": "Bucas"},
        {"id": tl.F_SIZE, "value": '84"'},
        {**HORSES_FIELD, "value": ["26af95d7"]},
        {"id": tl.F_FIT_NOTES, "value": "Qu wears 84 inches."},
    ],
}
SADDLE = {"id": "s1", "name": "🟢 Green Saddle", "status": {"status": "active"}, "custom_fields": []}
RETIRED = {**QU, "id": "old", "status": {"status": "retired"}}
SHEET = {
    "id": "sh", "name": "Rain sheet (78\", Hugo)", "status": {"status": "active"},
    "markdown_description": "", "custom_fields": [{**HORSES_FIELD, "value": ["be143bb6"]}],
}

out = tl.build_blankets([QU, SADDLE, RETIRED, SHEET])
assert [b["id"] for b in out] == ["sh", "86e3x93q4"], out
hugo, qu = out
assert qu["name"] == "Bucas Atlantic Turnout Medium 200g with neck piece", qu["name"]
assert qu["horses"] == ["Qu"] and qu["size"] == '84"' and qu["brand"] == "Bucas"
assert qu["fill_g"] == 200 and qu["neck"] and qu["waterproof"]
assert (qu["low_f"], qu["high_f"]) == (10, 46), qu
assert hugo["name"] == "Rain sheet" and hugo["fill_g"] == 0 and hugo["low_f"] is None

def wx(day_ms, kind, value, name):
    return {"name": name, "due_date": str(day_ms), "custom_fields": [
        {"id": wl.F_VALUE, "value": str(value)},
        {"id": wl.F_MEASURE, "value": kind, "type_config": {"options": [{"id": kind, "name": kind}]}},
    ]}

D29, D28 = 1793246400000, 1793160000000   # 10/29 and 10/28, 00:00 barn time
tasks = [
    wx(D29, "Low Temp", 38, "10/29 Low Temp: 38°F"),
    wx(D29, "High Temp", 51, "10/29 High Temp: 51°F"),
    wx(D29, "Precipitation", 0, "10/29 Precipitation: 0 in / 6%"),
    wx(D29, "AQI", 25.7, "10/29 AQI: 25.7 (PM2.5)"),
    wx(D28, "Low Temp", 44, "10/28 Low Temp: 44°F"),
    wx(D28, "Precipitation", 0.35, "10/28 Precipitation: 0.35 in / up to 100%"),
]
w = wl.build(tasks, "2026-10-29")
assert w == {"date": "2026-10-29", "low": 38, "high": 51, "precip_in": 0, "precip_pct": 6, "is_today": True}, w
w = wl.build(tasks, "2026-10-30")   # before Wren posts: yesterday's numbers, flagged
assert w["date"] == "2026-10-29" and w["is_today"] is False, w
w = wl.build(tasks[4:], "2026-10-28")
assert w["precip_pct"] == 100 and w["precip_in"] == 0.35, w
w = wl.build([
    wx(D29, "Low Temp", 20, "10/29 Low Temp: 20°F"),
    wx(D29, "Wind", 15, "10/29 Wind: 15 mph, gusts 25"),
    wx(D29, "Wind Chill", 6, "10/29 Wind Chill: 6°F"),
], "2026-10-29")
assert (w["wind_mph"], w["wind_chill"]) == (15, 6), w
print("ok")
