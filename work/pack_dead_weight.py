"""
Packs work/art_dead_weight.png into the knight atlas (free 64x34 slot at 448,128) and adds the `dead_weight`
attachment to the weapon (`sword`) slot, sized like the other maces. Idempotent: works on the live atlas files and
replaces any earlier dead_weight entry.

    python work/craft_dead_weight.py && python work/pack_dead_weight.py
"""
import json
import numpy as np
from PIL import Image

PNG_PATH = "public/assets/spine/knight/HulkForm2.png"
ATLAS_PATH = "public/assets/spine/knight/HulkForm2.atlas"
JSON_PATH = "public/assets/spine/knight/HulkForm2.json"
NAME = "dead_weight"
SLOT = (448, 128, 64, 34)
SPEC = {"x": 140.0, "y": 0.0, "rotation": 0.58, "width": 426.67, "height": 226.67}  # as cemetery_mace


def to_pma(img):
    arr = np.array(img, dtype=float)
    alpha = arr[:, :, 3:4] / 255.0
    arr[:, :, :3] *= alpha
    return Image.fromarray(np.round(arr).astype(np.uint8))


art = Image.open("work/art_dead_weight.png").convert("RGBA")
assert art.size == SLOT[2:], art.size
page = Image.open(PNG_PATH).convert("RGBA")
x, y, w, h = SLOT
page.paste(Image.new("RGBA", (w, h), (0, 0, 0, 0)), (x, y))  # clear the slot (rerun-safe)
page.paste(to_pma(art), (x, y))
page.save(PNG_PATH)
print(f"Updated {PNG_PATH}")

lines = open(ATLAS_PATH).read().splitlines()
out, skip = [], False
for line in lines:
    if line.strip() == NAME:
        skip = True
        continue
    if skip and (line.startswith("bounds:") or line.startswith("offsets:")):
        continue
    skip = False
    out.append(line)
out += [NAME, f"bounds:{x},{y},{w},{h}", f"offsets:0,0,{w},{h}"]
open(ATLAS_PATH, "w").write("\n".join(out) + "\n")
print(f"Updated {ATLAS_PATH}")

skel = json.load(open(JSON_PATH))
skel["skins"][0]["attachments"]["sword"][NAME] = dict(SPEC)
json.dump(skel, open(JSON_PATH, "w"), separators=(",", ":"))
print(f"Updated {JSON_PATH}")
