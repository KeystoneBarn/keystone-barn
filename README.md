# Keystone Barn Resources — one destination, everything real

One backend, one URL, no Claude account needed for anyone — Products,
Symptoms, and Horse Locations all live here now.

## What's inside
- **89 products** with photos, purpose, dosing, storage, status
- **20 symptom protocols** linking to the products that address them
- **Horse Locations** — live board, drag-to-position pins on your real
  property photo, move/rename/remove, all persisted to real SQLite

## Verified tonight
Booted the server and hit every endpoint directly: products list,
symptoms list, zones list, and a horse move that actually persisted —
all from the same running process, zero authentication anywhere.

## Running locally
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Open `http://localhost:8000`.

## Deploying
Same as discussed — Render, Railway, or Fly.io, built from the
Dockerfile here. Once deployed you get one plain URL: send that to
family and staff alike, no sign-in screen for anyone.

## Honest gaps, still true from before
- ~36 of the 89 products have no photo yet (never had one uploaded to
  Airtable) — plain icon shows instead, nothing broken
- Pin positions on the map are still rough starting guesses — someone
  needs to drag each one to its real spot once after this goes live
