"""
Parse a GroundPoleWorkouts "4-Week Workout Plan" PDF into a week grid.

The GPW plan is a one-page Monday–Sunday table. Its text layer comes out in
reading order, and font size is what separates the parts of each cell:
14pt runs are the exercise name + "(Gait)" or "Rest Day", 10–11pt runs are
the coaching note, and a bold "WEEK" starts each row. That is enough to
rebuild the grid without any coordinates.

Returns None (never raises) if the PDF doesn't look like a GPW plan, so a
future layout change degrades to "no day-by-day detail" rather than a
wrong schedule.
"""
import io
import logging
import re

from pypdf import PdfReader

log = logging.getLogger("gpw_plan")

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
LIGATURES = {"ﬁ": "fi", "ﬂ": "fl", "ﬀ": "ff", "ﬃ": "ffi", "ﬄ": "ffl"}
NAME_MIN_PT = 12.5
FOOTER = re.compile(r"copyright|©|groundpoleworkouts\.com|^v\.\d+$", re.I)
GAIT = re.compile(r"^(.*?)\s*\(([^)]*)\)\s*$")


def _join(a, b):
    return f"{a} {b}" if a else b


def _runs(data):
    page = PdfReader(io.BytesIO(data)).pages[0]
    runs = []
    glue = False
    spaced = True

    def visit(text, cm, tm, font, size):
        nonlocal glue, spaced
        t = " ".join(text.split())
        # Ligature glyphs ("fi" in "first") arrive as their own runs; glue
        # them onto the run before and the run after.
        lig = t in LIGATURES
        for k, v in LIGATURES.items():
            t = t.replace(k, v)
        if not t:
            spaced = spaced or text.isspace()
            return
        if ((lig and not spaced) or glue) and runs:
            size0, bold0, prev = runs[-1]
            runs[-1] = (size0, bold0, prev + t)
        elif lig and runs:
            size0, bold0, prev = runs[-1]
            runs[-1] = (size0, bold0, prev + " " + t)
        else:
            bold = "bold" in str((font or {}).get("/BaseFont", "")).lower()
            runs.append((size * (tm[0] or 1), bold, t))
        glue = lig
        spaced = text[-1:].isspace()

    page.extract_text(visitor_text=visit)
    return runs


def _title(runs):
    parts = [t for size, bold, t in runs if bold and size > 20 and t not in ("|", "by GPW")]
    words = " ".join(parts).replace("4-Week Workout Plan", "").replace("|", " ")
    return " ".join(words.split()) or None


def parse_plan(data):
    try:
        runs = _runs(data)
    except Exception as exc:
        log.warning("plan pdf unreadable: %s", exc)
        return None

    weeks, cells, cur = [], None, None

    def close():
        nonlocal cur
        if cur is not None:
            cells.append(cur)
            cur = None

    for size, bold, text in runs:
        if bold and text == "WEEK":
            close()
            cells = []
            weeks.append(cells)
            continue
        if cells is None or bold or FOOTER.search(text):
            continue
        if size >= NAME_MIN_PT:
            if text.lower().startswith("rest day"):
                close()
                cells.append({"rest": True})
            elif cur is None or cur["detail"] or GAIT.match(cur["name"]):
                close()
                cur = {"name": text, "detail": ""}
            else:
                cur["name"] = _join(cur["name"], text)
        elif cur is not None:
            cur["detail"] = _join(cur["detail"], text)
    close()

    out = []
    for num, row in enumerate(weeks, 1):
        if len(row) < 7:
            log.warning("plan week %d has %d cells, expected 7", num, len(row))
            return None
        days = []
        for weekday, c in zip(WEEKDAYS, row):
            if c.get("rest"):
                days.append({"weekday": weekday, "rest": True})
                continue
            m = GAIT.match(c["name"])
            name, mode = (m.group(1), m.group(2)) if m else (c["name"], None)
            detail = c["detail"].replace("’", "'").rstrip(" .")
            days.append({"weekday": weekday, "name": name, "mode": mode, "detail": detail + "." if detail else ""})
        out.append({"num": num, "days": days})

    if not out:
        return None
    return {"title": _title(runs), "weeks": out}
