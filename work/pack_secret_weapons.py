"""
Packs the secret-trial weapons (work/craft_secret_weapons.py) into the knight atlas. The page grows from 512x256
to 512x512 (existing regions keep their pixel bounds) and the weapons fill a new row at y=256. Bells get the
kettlebell attachment, everything else the mace/sword/morning-star one. Idempotent: rerun after re-crafting.

    python work/craft_secret_weapons.py && python work/pack_secret_weapons.py
"""
import json
import numpy as np
from PIL import Image

PNG_PATH = "public/assets/spine/knight/HulkForm2.png"
ATLAS_PATH = "public/assets/spine/knight/HulkForm2.atlas"
JSON_PATH = "public/assets/spine/knight/HulkForm2.json"
HAFTED = {"x": 140.0, "y": 0.0, "rotation": 0.58, "width": 426.67, "height": 226.67}
BELL = {"x": 72.0, "y": -14.0, "rotation": 45.0, "width": 266.67, "height": 266.67}
SLOTS = {
    "bellringer_mallet": (0, 256, 64, 34, HAFTED),
    "leviathan_anchor": (64, 256, 64, 34, HAFTED),
    "everburning_censer": (128, 256, 64, 34, HAFTED),
    "heartforge": (192, 256, 64, 34, HAFTED),
    "excalibane": (256, 256, 64, 34, HAFTED),
    "tolling_thunder": (320, 256, 40, 40, BELL),
    "midas_bell": (360, 256, 40, 40, BELL),
    "hollow_bell": (400, 256, 40, 40, BELL),
}


def to_pma(img):
    arr = np.array(img, dtype=float)
    arr[:, :, :3] *= arr[:, :, 3:4] / 255.0
    return Image.fromarray(np.round(arr).astype(np.uint8))


page = Image.open(PNG_PATH).convert("RGBA")
if page.size != (512, 512):
    grown = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    grown.paste(page, (0, 0))
    page = grown
for name, (x, y, w, h, _) in SLOTS.items():
    art = Image.open(f"work/art_{name}.png").convert("RGBA")
    assert art.size == (w, h), (name, art.size)
    page.paste(Image.new("RGBA", (w, h), (0, 0, 0, 0)), (x, y))
    page.paste(to_pma(art), (x, y))
page.save(PNG_PATH)

lines = open(ATLAS_PATH).read().splitlines()
out, skip = [], False
for line in lines:
    if line.startswith("size:"):
        line = "size:512,512"
    if line.strip() in SLOTS:
        skip = True
        continue
    if skip and (line.startswith("bounds:") or line.startswith("offsets:")):
        continue
    skip = False
    out.append(line)
for name, (x, y, w, h, _) in SLOTS.items():
    out += [name, f"bounds:{x},{y},{w},{h}", f"offsets:0,0,{w},{h}"]
open(ATLAS_PATH, "w").write("\n".join(out) + "\n")

skel = json.load(open(JSON_PATH))
for name, (*_, spec) in SLOTS.items():
    skel["skins"][0]["attachments"]["sword"][name] = dict(spec)
json.dump(skel, open(JSON_PATH, "w"), separators=(",", ":"))
print("packed", ", ".join(SLOTS))
