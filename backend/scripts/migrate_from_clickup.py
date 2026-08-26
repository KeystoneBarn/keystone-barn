"""
One-time migration: rebuild products_data.json and symptoms_data.json
directly from ClickUp (list 901715740303, "Products"), replacing the
old Airtable-derived data entirely. Also downloads and saves product
photos as permanent local files (ClickUp attachment URLs are short-lived,
so nothing here depends on a live ClickUp URL after this script finishes).

Run from backend/: CLICKUP_TOKEN=pk_xxx python3 scripts/migrate_from_clickup.py
"""
import os
import json
import time
import requests

TOKEN = os.environ.get("CLICKUP_TOKEN")
if not TOKEN:
    raise SystemExit("Set CLICKUP_TOKEN env var first (your ClickUp API token, starts with pk_)")

HEADERS = {"Authorization": TOKEN}
LIST_ID = "901715740303"
BASE = "https://api.clickup.com/api/v2"

IMAGES_DIR = os.path.join(os.path.dirname(__file__), "..", "static", "images")
os.makedirs(IMAGES_DIR, exist_ok=True)

# --- verified field schema (from live inspection, not guessed) ---
FIELD_CATEGORY = "4b52b8be-c904-4f40-8fc3-27c79f4e9410"
FIELD_VERDICT = "5b3d3a99-562c-44f6-b0a8-9b9f209e189b"
FIELD_SYMPTOMS = "b7b328c8-f8e1-44eb-9199-c0173b3b9475"  # field is named "Indicated For"
FIELD_STORAGE = "e8401a3c-3dc5-4575-86c3-972ebd200b0e"
FIELD_DIRECTIONS = "6c004a67-7898-47eb-b3b8-65aa00ab29c0"

CATEGORY_OPTIONS = {0:"Fly / Pest Control",1:"Grooming",2:"Bathing",3:"Hoof Care",4:"Muscle & Joint",5:"Wound Care",6:"Skin / Coat",7:"Dewormer",8:"First Aid",9:"Medication",10:"Supplement",11:"Feed"}
VERDICT_OPTIONS = {0:"Barn Favorite",1:"Proven",2:"Does the Job",3:"Hit or Miss",4:"Underwhelming",5:"Testing"}
STORAGE_OPTIONS = {0:"Feed Room",1:"Supplement Shelf (Feed Room)",2:"Med Shelf (Feed Room)",3:"Overflow Shelf (Feed Room)",4:"Grooming Bay",5:"Wash Bay"}
SYMPTOM_ID_TO_NAME = {
    "8e5d9d92-bdd2-437c-a710-f62976468557":"Minor cut or scrape",
    "cc549a77-5b5e-4f86-a790-6ece1cef02d5":"Swelling From Kick",
    "e1e7d68a-b506-4336-92fe-c3be7df03171":"Swelling From Bug Bites",
    "816b8141-da28-4d45-9f41-b9c604598ccd":"Tiny Bumps From Bug Bites",
    "0e09b3ac-aeb6-4764-9f29-638fb3c9d4f4":"Joint Swelling",
    "53eaf042-d653-4837-8e0c-4f26f5b1e49d":"Heat Stress",
    "72459dc7-aae9-4b20-908e-c57e46a06b7c":"Colic",
    "51bec03c-087d-4be1-93b6-6d7780bca9dc":"Cushings",
    "a500c5a4-706b-4aaa-8b9e-0ffa12ab4a39":"Itchy",
    "e2ff7459-8911-4c0d-b406-a4d7d7c20e94":"Sore Muscles Joints",
    "54e169fa-dbc9-46ba-8c6c-7119a3f6df2e":"Sore Hooves",
    "c250c400-6ad9-4c66-bb6c-e24f109d8a76":"Insulin Resistance",
    "b251ef18-975f-4ad7-88b3-81f7912ff85d":"Chronic Diarrhea",
    "405fde71-f6e4-4d6e-a7b5-1b804e44b114":"EPM",
    "16175c57-8a37-4b71-a43b-41a271f35c35":"Thrush",
    "bce76e91-1cd1-41bb-a20c-7008a331f9da":"Rain Rot / Skin Infectin",
    "65924884-4575-41c8-b159-b83472be184b":"Hoof Abscess",
    "adc775f9-0b62-4d8e-a9fa-1623e4d43ae9":"Choke",
    "9a7b0939-9797-4b4b-a5e9-b148a405d920":"Eye Injury / Infection",
    "f056f1bd-3c0c-4784-9717-26f04ad78694":"Respiratory Allergies",
    "13a7d4e9-0ec6-4bca-b3bb-cf1b0764c1cf":"Bugs",
    "2db14e2c-e021-48a3-b064-a45aee6cc625":"Coat",
    "85f13055-bb8f-4240-914c-28cbb5778590":"Mane/Tail",
}

def get_all_tasks():
    tasks, page = [], 0
    while True:
        resp = requests.get(
            f"{BASE}/list/{LIST_ID}/task",
            headers=HEADERS,
            params={"include_closed": "true", "page": page},
        )
        resp.raise_for_status()
        data = resp.json()
        tasks.extend(data["tasks"])
        if data.get("last_page", True) or not data["tasks"]:
            break
        page += 1
        time.sleep(0.3)
    return tasks

def get_field_value(custom_fields, field_id):
    for f in custom_fields:
        if f["id"] == field_id:
            return f.get("value")
    return None

def main():
    print("Fetching all products from ClickUp...")
    tasks = get_all_tasks()
    print(f"Found {len(tasks)} products")

    products = []
    symptom_map = {}  # symptom name -> [product names]

    for i, t in enumerate(tasks):
        task_id = t["id"]
        name = t["name"]
        status = t.get("status", {}).get("status", "active")

        detail = requests.get(
            f"{BASE}/task/{task_id}",
            headers=HEADERS,
            params={"include_subtasks": "false"},
        ).json()
        custom_fields = detail.get("custom_fields", [])

        cat_idx = get_field_value(custom_fields, FIELD_CATEGORY)
        category = CATEGORY_OPTIONS.get(cat_idx, "Other")
        verdict_idx = get_field_value(custom_fields, FIELD_VERDICT)
        verdict = VERDICT_OPTIONS.get(verdict_idx) if verdict_idx is not None else None
        storage_idx = get_field_value(custom_fields, FIELD_STORAGE)
        storage = STORAGE_OPTIONS.get(storage_idx, "")
        directions = get_field_value(custom_fields, FIELD_DIRECTIONS) or ""
        symptom_ids = get_field_value(custom_fields, FIELD_SYMPTOMS) or []
        symptoms = [SYMPTOM_ID_TO_NAME.get(sid, sid) for sid in symptom_ids]

        description = detail.get("text_content", "") or ""
        rx = bool(__import__("re").search(
            r"prescription required|rx only|vet-administered only", description, __import__("re").I
        ))

        image_path = None
        attachments = detail.get("attachments", [])
        if attachments:
            att = attachments[0]
            att_url = att.get("url")
            ext = att.get("extension", "jpg")
            if att_url:
                fname = f"{task_id}.{ext}"
                try:
                    img_resp = requests.get(att_url, headers=HEADERS, timeout=20)
                    if img_resp.ok and img_resp.content:
                        with open(os.path.join(IMAGES_DIR, fname), "wb") as f:
                            f.write(img_resp.content)
                        image_path = f"/images/{fname}"
                    else:
                        print(f"  [image failed: {name} — HTTP {img_resp.status_code}]")
                except Exception as e:
                    print(f"  [image failed: {name} — {e}]")

        product = {
            "name": name,
            "category": category,
            "purpose": description[:400],
            "howto": directions,
            "animals": ["Horse"],
            "storage": storage,
            "rating": None,
            "notes": description[:400],
            "status": verdict,
            "rx": rx,
            "image": image_path,
        }
        products.append(product)

        for s in symptoms:
            symptom_map.setdefault(s, []).append(name)

        if (i + 1) % 10 == 0:
            print(f"  ...{i+1}/{len(tasks)}")
        time.sleep(0.2)

    symptoms_out = [{"name": s, "products": p} for s, p in symptom_map.items()]

    out_dir = os.path.join(os.path.dirname(__file__), "..")
    with open(os.path.join(out_dir, "products_data.json"), "w") as f:
        json.dump(products, f, indent=2)
    with open(os.path.join(out_dir, "symptoms_data.json"), "w") as f:
        json.dump(symptoms_out, f, indent=2)

    with_images = sum(1 for p in products if p["image"])
    print(f"\nDone. {len(products)} products written, {with_images} with images, {len(symptoms_out)} symptoms.")

if __name__ == "__main__":
    main()
