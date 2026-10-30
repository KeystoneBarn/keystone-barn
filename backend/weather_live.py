"""
Today's barn weather from the ClickUp "🌤️ Daily Wx Log" list (901715511281),
for the blanket alert on the Board and the Blankets tab.

Weather Wren posts one task per measurement each morning, e.g.
"10/29 Low Temp: 38°F" / "10/29 Precipitation: 0.35 in / up to 100%", with
the number in the Value field and the kind in the Measurement Type dropdown. Not every kind is posted every day (Dew Point and
AQI come and go), so each one is optional.

The site treats today's Low Temp as tonight's low. Before Wren posts (early
morning) the latest day's numbers are served with `is_today: false`.
Read-only.
"""
import logging
import os
import re
import threading
import time
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from clickup_live import BASE, HTTP_TIMEOUT, TOKEN, _dropdown_name, _raw_value, _session
from feed_live import BARN_UTC_OFFSET

log = logging.getLogger("weather_live")

WX_LIST_ID = os.environ.get("CLICKUP_WX_LIST", "901715511281")
REFRESH_SECONDS = int(os.environ.get("CLICKUP_WX_REFRESH_SECONDS", "900"))
BARN_TZ = ZoneInfo("America/Chicago")

F_VALUE = "6511e003-7efe-4fac-8804-4fa68c1c6da6"
F_MEASURE = "0f4191a9-3ff6-411e-b710-5010097edc33"

# Measurement Type -> payload key
KINDS = {
    "low temp": "low",
    "high temp": "high",
    "precipitation": "precip_in",
    "humidity": "humidity",
}

NAME = re.compile(r"^\s*(\d{1,2})/(\d{1,2})\s+(.+?):\s*(.+?)\s*$")
NUMBER = re.compile(r"-?\d+(?:\.\d+)?")
PERCENT = re.compile(r"(\d+(?:\.\d+)?)\s*%")


def _number(value):
    try:
        return float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return None


def parse_task(task, year):
    """-> (iso_day, key, value, extra) or None. extra carries the precip chance."""
    m = NAME.match(task.get("name") or "")
    kind = (_dropdown_name(task, F_MEASURE) or (m.group(3) if m else "")).strip().lower()
    key = KINDS.get(kind)
    if not key:
        return None
    # The "10/29" in the name is the day; the due date is stored as Eastern
    # midnight, which reads as the day before in barn time.
    if m:
        day = f"{year}-{int(m.group(1)):02d}-{int(m.group(2)):02d}"
    elif task.get("due_date"):
        day = (datetime.fromtimestamp(int(task["due_date"]) / 1000, timezone.utc) + BARN_UTC_OFFSET).date().isoformat()
    else:
        return None
    value = _number(_raw_value(task, F_VALUE))
    text = m.group(4) if m else ""
    if value is None:
        n = NUMBER.search(text)
        value = float(n.group()) if n else None
    if value is None:
        return None
    extra = {}
    if key == "precip_in":
        pct = PERCENT.search(text)
        if pct:
            extra["precip_pct"] = float(pct.group(1))
    return day, key, value, extra


def build(tasks, today):
    """Group parsed tasks by day; return today's (or the latest day's) numbers."""
    days = {}
    for t in tasks:
        got = parse_task(t, today[:4])
        if got and got[0] > today and got[0][5:7] == "12" and today[5:7] == "01":
            got = (f"{int(today[:4]) - 1}{got[0][4:]}",) + got[1:]  # 12/31 read on 1/1
        if not got:
            continue
        day, key, value, extra = got
        rec = days.setdefault(day, {"date": day})
        rec.setdefault(key, value)  # newest task first wins
        for k, v in extra.items():
            rec.setdefault(k, v)
    if not days:
        return None
    past = [d for d in days if d <= today]
    day = max(past) if past else max(days)
    return {**days[day], "is_today": day == today}


class _WxCache:
    def __init__(self):
        self.lock = threading.Lock()
        self.weather = None
        self.fetched_at = 0.0
        self.error = None

    def snapshot(self):
        with self.lock:
            return self.weather

    def refresh(self):
        if not TOKEN:
            return
        try:
            resp = _session().get(
                f"{BASE}/list/{WX_LIST_ID}/task",
                params={"order_by": "created", "include_closed": "true", "page": 0},
                timeout=HTTP_TIMEOUT,
            )
            resp.raise_for_status()
            tasks = resp.json().get("tasks") or []
            today = datetime.now(BARN_TZ).date().isoformat()
            weather = build(tasks, today)
            with self.lock:
                self.weather = weather
                self.fetched_at = time.time()
                self.error = None
            log.info("weather refresh ok: %s", weather)
        except Exception as exc:
            log.warning("weather refresh failed: %s", exc)
            with self.lock:
                self.error = str(exc)

    def loop(self):
        while True:
            self.refresh()
            time.sleep(max(300, REFRESH_SECONDS))


WX = _WxCache()


def start():
    if not TOKEN:
        return
    threading.Thread(target=WX.loop, name="weather-live-refresh", daemon=True).start()
