import os
import json
import subprocess

# === CONFIG ===
AFTERFX = r"C:\Program Files\Adobe\Adobe After Effects 2023\Support Files\AfterFX.com"
JSX = r"C:\Users\joani\PycharmProjects\ae_video_bot\replace_and_render_batch.jsx"

BASE = r"C:\Users\joani\PycharmProjects\ae_video_bot"
INPUT_DIR = os.path.join(BASE, "input")
BATCH_JSON = os.path.join(BASE, "ae_batch.json")

# === 1. Scan input folder ===
faces = {}
names = {}

for fname in os.listdir(INPUT_DIR):
    fpath = os.path.join(INPUT_DIR, fname)
    base, ext = os.path.splitext(fname)
    ext = ext.lower()

    if ext == ".png":   # face images
        faces[base] = fpath
    elif ext == ".jpg" or ext == ".jpeg":  # allow jpgs too
        faces[base] = fpath
    elif ext == ".txt":  # name text files
        names[base] = fpath

# === 2. Build job list ===
jobs = []
all_keys = sorted(set(faces.keys()) | set(names.keys()))

for key in all_keys:
    job = {}
    if key in faces:
        job["face"] = faces[key]
    else:
        print(f"⚠️ Warning: missing image for '{key}'")

    if key in names:
        job["name"] = names[key]
    else:
        print(f"⚠️ Warning: missing text file for '{key}'")

    jobs.append(job)

if not jobs:
    raise RuntimeError("❌ No jobs found in input folder. Add NAME.png and NAME.txt files.")

# === 3. Write JSON file ===
with open(BATCH_JSON, "w") as f:
    json.dump({"jobs": jobs}, f, indent=2)

print(f"✅ Wrote {len(jobs)} jobs to {BATCH_JSON}")

# === 4. Launch After Effects once ===
subprocess.run([AFTERFX, "-r", JSX])
