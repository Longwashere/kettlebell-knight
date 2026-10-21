"""
Pastes work/remaster/<id>.png (work/craft_remastered_weapons.py) into the knight atlas page over each weapon's
existing region. Bounds, atlas and skeleton are unchanged: the art keeps each region's size and grip.

    python3 work/craft_remastered_weapons.py && python3 work/pack_remastered_weapons.py
"""
import os
import numpy as np
from PIL import Image

PNG_PATH = "public/assets/spine/knight/HulkForm2.png"
ATLAS_PATH = "public/assets/spine/knight/HulkForm2.atlas"
SRC = os.path.join(os.path.dirname(__file__), "remaster")


def bounds():
    regs, cur = {}, None
    for line in open(ATLAS_PATH).read().splitlines():
        if line.startswith("bounds:") and cur:
            regs[cur] = tuple(map(int, line[7:].split(",")))
        elif ":" not in line and line.strip() and not line.endswith(".png"):
            cur = line.strip()
    return regs


def to_pma(img):
    arr = np.array(img, dtype=float)
    arr[:, :, :3] *= arr[:, :, 3:4] / 255.0
    return Image.fromarray(np.round(arr).astype(np.uint8))


page = Image.open(PNG_PATH).convert("RGBA")
regs = bounds()
done = []
for f in sorted(os.listdir(SRC)):
    name = f[:-4]
    if not f.endswith(".png") or name not in regs:
        continue
    x, y, w, h = regs[name]
    art = Image.open(os.path.join(SRC, f)).convert("RGBA")
    assert art.size == (w, h), (name, art.size, (w, h))
    page.paste(Image.new("RGBA", (w, h), (0, 0, 0, 0)), (x, y))
    page.paste(to_pma(art), (x, y))
    done.append(name)
page.save(PNG_PATH)
print("packed", len(done), ", ".join(done))
