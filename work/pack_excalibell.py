import json
import numpy as np
from PIL import Image

PNG_PATH = "public/assets/spine/knight/HulkForm2.png"
ATLAS_PATH = "public/assets/spine/knight/HulkForm2.atlas"
JSON_PATH = "public/assets/spine/knight/HulkForm2.json"

def to_pma(img):
    arr = np.array(img, dtype=float)
    alpha = arr[:, :, 3:4] / 255.0
    arr[:, :, :3] *= alpha
    return Image.fromarray(np.round(arr).astype(np.uint8))

# Save official sprite as art_excalibell.png
img_tipped = Image.open("work/art_excalibell_tipped.png").convert("RGBA")
img_tipped.save("work/art_excalibell.png")
print("Saved work/art_excalibell.png")

# Load base atlas texture (from backup to ensure clean state)
base_img = Image.open("public/assets/spine/knight/HulkForm2.backup.png").convert("RGBA")

# Paste PMA excalibell at (392, 200)
pma_tipped = to_pma(img_tipped)
base_img.paste(pma_tipped, (392, 200), pma_tipped)
base_img.save(PNG_PATH)
print(f"Updated {PNG_PATH} with official Excalibell (tipped)")

# Update atlas definition
with open("public/assets/spine/knight/HulkForm2.backup.atlas", "r") as f:
    atlas_text = f.read()

lines = atlas_text.splitlines()
cleaned_lines = []
skip = False
for line in lines:
    if line.strip() in ("excalibell", "excalibell_guard"):
        skip = True
        continue
    if skip and (line.startswith("bounds:") or line.startswith("offsets:")):
        continue
    skip = False
    cleaned_lines.append(line)

cleaned_lines.append("excalibell")
cleaned_lines.append("bounds:392,200,64,34")
cleaned_lines.append("offsets:0,0,64,34")

with open(ATLAS_PATH, "w") as f:
    f.write("\n".join(cleaned_lines) + "\n")
print(f"Updated {ATLAS_PATH}")

# Update JSON skeleton attachments
with open("public/assets/spine/knight/HulkForm2.backup.json", "r") as f:
    skel = json.load(f)

sword_slot_attachments = skel["skins"][0]["attachments"]["sword"]

LONG_SPEC = {"x": 140.0, "y": 0.0, "rotation": 0.58, "width": 426.67, "height": 226.67}

# Remove any old excalibell_guard if present
sword_slot_attachments.pop("excalibell_guard", None)
sword_slot_attachments["excalibell"] = dict(LONG_SPEC)

with open(JSON_PATH, "w") as f:
    json.dump(skel, f, separators=(',', ':'))
print(f"Updated {JSON_PATH} with excalibell attachment")
