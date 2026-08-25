"""
Horse Locations backend — no account needed for anyone, staff or family.
This exists specifically because Claude's artifact storage requires a signed-in
paid account to WRITE (though not to view), which barn staff won't have.
A tiny SQLite-backed API sidesteps that entirely: anyone with the link can
read and write, full stop.
"""
import sqlite3
import json
import os
import httpx
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

app = FastAPI(title="Horse Locations")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "zones.db")

DEFAULT_ZONES = [
    {"id": "pad-se", "cat": "Paddocks", "name": "SE (Tree) Paddock", "occ": ["Hugo", "Tammy", "Linka"], "x": 68, "y": 70},
    {"id": "pad-sw", "cat": "Paddocks", "name": "SW Paddock", "occ": ["Stendahl", "Ulyssa"], "x": 38, "y": 70},
    {"id": "pad-ne", "cat": "Paddocks", "name": "NE Paddock", "occ": ["Dahlia", "Mickey", "Avelin"], "x": 68, "y": 45},
    {"id": "pad-nw", "cat": "Paddocks", "name": "NW Paddock", "occ": ["Qu"], "x": 38, "y": 45},
    {"id": "trk-1", "cat": "Tracks", "name": "Track 1", "occ": [], "x": 53, "y": 58},
    {"id": "trk-2", "cat": "Tracks", "name": "Track 2", "occ": [], "x": 78, "y": 33},
    {"id": "trk-3", "cat": "Tracks", "name": "Track 3 (Pond Loop)", "occ": [], "x": 25, "y": 22},
    {"id": "pas-obstacle", "cat": "Outdoor Pastures", "name": "Obstacle Course Pasture", "occ": [], "x": 85, "y": 52},
    {"id": "pas-poop", "cat": "Outdoor Pastures", "name": "Poop Loop Pasture", "occ": [], "x": 60, "y": 30},
    {"id": "pas-pond", "cat": "Outdoor Pastures", "name": "Pond Pasture", "occ": [], "x": 15, "y": 12},
    {"id": "arena", "cat": "Arena & Round Pen", "name": "Outdoor Arena", "occ": [], "x": 53, "y": 82},
    {"id": "roundpen", "cat": "Arena & Round Pen", "name": "Round Pen", "occ": [], "x": 78, "y": 82},
    {"id": "stall-sw", "cat": "Stalls", "name": "SW Stall", "occ": [], "x": 30, "y": 92},
    {"id": "stall-se", "cat": "Stalls", "name": "SE Stall", "occ": [], "x": 45, "y": 92},
    {"id": "stall-ne", "cat": "Stalls", "name": "NE Stall", "occ": [], "x": 60, "y": 92},
    {"id": "stall-nw", "cat": "Stalls", "name": "NW Stall", "occ": [], "x": 75, "y": 92},
    {"id": "porch-1", "cat": "Porches", "name": "Porch 1", "occ": [], "x": 38, "y": 97},
    {"id": "porch-2", "cat": "Porches", "name": "Porch 2", "occ": [], "x": 68, "y": 97},
]

HORSES = ["Mickey", "Avelin", "Dahlia", "Qu", "Stendahl", "Ulyssa", "Linka", "Tammy", "Hugo"]

with open(os.path.join(os.path.dirname(__file__), "products_data.json")) as f:
    PRODUCTS = json.load(f)
with open(os.path.join(os.path.dirname(__file__), "symptoms_data.json")) as f:
    SYMPTOMS = json.load(f)


@app.get("/api/products")
def get_products():
    return PRODUCTS


IMAGE_CACHE_DIR = os.path.join(os.path.dirname(__file__), "data", "images")


@app.get("/api/product-image/{idx}")
def get_product_image(idx: int):
    if idx < 0 or idx >= len(PRODUCTS):
        raise HTTPException(404, "No such product")
    source_url = PRODUCTS[idx].get("image")
    if not source_url:
        raise HTTPException(404, "No image for this product")

    os.makedirs(IMAGE_CACHE_DIR, exist_ok=True)
    cache_path = os.path.join(IMAGE_CACHE_DIR, f"{idx}.jpg")

    if not os.path.exists(cache_path):
        try:
            with httpx.Client(follow_redirects=True, timeout=15) as client:
                resp = client.get(source_url)
                resp.raise_for_status()
            with open(cache_path, "wb") as f:
                f.write(resp.content)
        except Exception:
            raise HTTPException(502, "Could not fetch source image")

    with open(cache_path, "rb") as f:
        data = f.read()
    return Response(content=data, media_type="image/jpeg")


@app.get("/api/symptoms")
def get_symptoms():
    return SYMPTOMS


def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS zones (
            id TEXT PRIMARY KEY,
            cat TEXT NOT NULL,
            name TEXT NOT NULL,
            occ TEXT NOT NULL,
            x REAL NOT NULL,
            y REAL NOT NULL
        )
    """)
    conn.execute("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)")
    count = conn.execute("SELECT COUNT(*) c FROM zones").fetchone()["c"]
    if count == 0:
        for z in DEFAULT_ZONES:
            conn.execute(
                "INSERT INTO zones (id, cat, name, occ, x, y) VALUES (?, ?, ?, ?, ?, ?)",
                (z["id"], z["cat"], z["name"], json.dumps(z["occ"]), z["x"], z["y"]),
            )
        conn.commit()
    conn.close()


init_db()


def zone_row_to_dict(row):
    return {"id": row["id"], "cat": row["cat"], "name": row["name"], "occ": json.loads(row["occ"]), "x": row["x"], "y": row["y"]}


def touch_updated():
    conn = get_db()
    conn.execute(
        "INSERT INTO meta (key, value) VALUES ('last_updated', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (datetime.now(timezone.utc).isoformat(),),
    )
    conn.commit()
    conn.close()


@app.get("/api/zones")
def get_zones():
    conn = get_db()
    rows = conn.execute("SELECT * FROM zones").fetchall()
    updated = conn.execute("SELECT value FROM meta WHERE key='last_updated'").fetchone()
    conn.close()
    return {
        "zones": [zone_row_to_dict(r) for r in rows],
        "horses": HORSES,
        "last_updated": updated["value"] if updated else None,
    }


class MoveBody(BaseModel):
    horse: str
    to_zone: str


@app.post("/api/zones/move")
def move_horse(body: MoveBody):
    if body.horse not in HORSES:
        raise HTTPException(400, "Unknown horse")
    conn = get_db()
    rows = conn.execute("SELECT * FROM zones").fetchall()
    target_exists = any(r["id"] == body.to_zone for r in rows)
    if not target_exists:
        conn.close()
        raise HTTPException(404, "Unknown zone")
    for r in rows:
        occ = json.loads(r["occ"])
        if body.horse in occ:
            occ.remove(body.horse)
            conn.execute("UPDATE zones SET occ=? WHERE id=?", (json.dumps(occ), r["id"]))
    # re-fetch target fresh and add (fresh read avoids acting on stale occ if it was also the source)
    target = conn.execute("SELECT * FROM zones WHERE id=?", (body.to_zone,)).fetchone()
    t_occ = json.loads(target["occ"])
    if body.horse not in t_occ:
        t_occ.append(body.horse)
    conn.execute("UPDATE zones SET occ=? WHERE id=?", (json.dumps(t_occ), body.to_zone))
    conn.commit()
    conn.close()
    touch_updated()
    return {"ok": True}


class RemoveBody(BaseModel):
    horse: str
    zone_id: str


@app.post("/api/zones/remove")
def remove_horse(body: RemoveBody):
    conn = get_db()
    row = conn.execute("SELECT * FROM zones WHERE id=?", (body.zone_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Unknown zone")
    occ = json.loads(row["occ"])
    if body.horse in occ:
        occ.remove(body.horse)
    conn.execute("UPDATE zones SET occ=? WHERE id=?", (json.dumps(occ), body.zone_id))
    conn.commit()
    conn.close()
    touch_updated()
    return {"ok": True}


class RenameBody(BaseModel):
    name: str


@app.patch("/api/zones/{zone_id}/rename")
def rename_zone(zone_id: str, body: RenameBody):
    conn = get_db()
    row = conn.execute("SELECT * FROM zones WHERE id=?", (zone_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Unknown zone")
    conn.execute("UPDATE zones SET name=? WHERE id=?", (body.name.strip() or row["name"], zone_id))
    conn.commit()
    conn.close()
    touch_updated()
    return {"ok": True}


class PositionBody(BaseModel):
    x: float
    y: float


@app.patch("/api/zones/{zone_id}/position")
def reposition_zone(zone_id: str, body: PositionBody):
    conn = get_db()
    row = conn.execute("SELECT * FROM zones WHERE id=?", (zone_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Unknown zone")
    x = max(2, min(98, body.x))
    y = max(2, min(98, body.y))
    conn.execute("UPDATE zones SET x=?, y=? WHERE id=?", (x, y, zone_id))
    conn.commit()
    conn.close()
    touch_updated()
    return {"ok": True}


FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="static")
