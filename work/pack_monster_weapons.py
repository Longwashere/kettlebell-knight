import json
from PIL import Image
import numpy as np
import sys
sys.path.insert(0, "work")
from generate_monster_weapons import weapons, to_pma

PNG_PATH = "public/assets/spine/knight/HulkForm2.png"
ATLAS_PATH = "public/assets/spine/knight/HulkForm2.atlas"
JSON_PATH = "public/assets/spine/knight/HulkForm2.json"

# Load existing base image (512x128)
base_img = Image.open(PNG_PATH).convert("RGBA")
print(f"Loaded base image: {base_img.size}")

# Create new 512x256 canvas
NEW_W, NEW_H = 512, 256
new_canvas = Image.new("RGBA", (NEW_W, NEW_H), (0, 0, 0, 0))
new_canvas.paste(base_img, (0, 0))

# Pack weapons
packed_regions = {} # name -> (x, y, w, h)

# Group into long (64x34) and bell (40x40)
long_weapons = [w for w in weapons if w[1].size == (64, 34)]
bell_weapons = [w for w in weapons if w[1].size == (40, 40)]

print(f"Packing {len(long_weapons)} long weapons and {len(bell_weapons)} bell weapons")

# Row 1: y = 128 (7 long weapons)
cur_x = 0
cur_y = 128
for name, img, cat, weight in long_weapons[:7]:
    pma_img = to_pma(img)
    new_canvas.paste(pma_img, (cur_x, cur_y), pma_img)
    packed_regions[name] = (cur_x, cur_y, img.width, img.height, cat)
    cur_x += img.width

# Row 2: y = 164 (7 long weapons)
cur_x = 0
cur_y = 164
for name, img, cat, weight in long_weapons[7:14]:
    pma_img = to_pma(img)
    new_canvas.paste(pma_img, (cur_x, cur_y), pma_img)
    packed_regions[name] = (cur_x, cur_y, img.width, img.height, cat)
    cur_x += img.width

# Row 3: y = 200 (remaining 3 long weapons + 5 bells)
cur_x = 0
cur_y = 200
for name, img, cat, weight in long_weapons[14:]:
    pma_img = to_pma(img)
    new_canvas.paste(pma_img, (cur_x, cur_y), pma_img)
    packed_regions[name] = (cur_x, cur_y, img.width, img.height, cat)
    cur_x += img.width

for name, img, cat, weight in bell_weapons:
    pma_img = to_pma(img)
    new_canvas.paste(pma_img, (cur_x, cur_y), pma_img)
    packed_regions[name] = (cur_x, cur_y, img.width, img.height, cat)
    cur_x += img.width

print(f"Total packed: {len(packed_regions)} regions. Max y was {cur_y + 40}")

# Save updated PNG
new_canvas.save(PNG_PATH)
print(f"Saved updated atlas texture to {PNG_PATH} ({new_canvas.size})")

# Update ATLAS
with open(ATLAS_PATH, "r") as f:
    atlas_text = f.read()

# Update size:512,128 to size:512,256
lines = atlas_text.splitlines()
if lines[1].startswith("size:"):
    lines[1] = f"size:{NEW_W},{NEW_H}"

# Strip existing monster weapon entries if present to allow re-runs
cleaned_lines = []
skip = False
for line in lines:
    if any(line.strip() == name for name in packed_regions):
        skip = True
        continue
    if skip and (line.startswith("bounds:") or line.startswith("offsets:")):
        continue
    skip = False
    cleaned_lines.append(line)

# Append new weapon entries
for name, (x, y, w, h, cat) in packed_regions.items():
    cleaned_lines.append(name)
    cleaned_lines.append(f"bounds:{x},{y},{w},{h}")
    cleaned_lines.append(f"offsets:0,0,{w},{h}")

with open(ATLAS_PATH, "w") as f:
    f.write("\n".join(cleaned_lines) + "\n")
print(f"Updated {ATLAS_PATH}")

# Update JSON skeleton
with open(JSON_PATH, "r") as f:
    data = json.load(f)

sword_slot_attachments = data["skins"][0]["attachments"]["sword"]

# Long spec & Bell spec
LONG_SPEC = {"x": 140.0, "y": 0.0, "rotation": 0.58, "width": 426.67, "height": 226.67}
BELL_SPEC = {"x": 72.0, "y": -14.0, "rotation": 45.0, "width": 266.67, "height": 266.67}

for name, (x, y, w, h, cat) in packed_regions.items():
    if cat == "Bell":
        sword_slot_attachments[name] = dict(BELL_SPEC)
    else:
        sword_slot_attachments[name] = dict(LONG_SPEC)

with open(JSON_PATH, "w") as f:
    json.dump(data, f, separators=(',', ':'))
print(f"Updated {JSON_PATH} with {len(packed_regions)} new weapon attachments")
