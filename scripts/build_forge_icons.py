#!/usr/bin/env python3
"""Blacksmith shop icons: cut every weapon attachment out of the knight's Spine atlas.

The forge shows each weapon with the same pixels the knight holds (the remastered atlas art), so the shop
can't drift from the rig. Writes public/assets/forge/<attachmentId>.png (trimmed, straight alpha).
Rerun after repainting a weapon in HulkForm2.png.

    python3 scripts/build_forge_icons.py
"""
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ATLAS = ROOT / 'public/assets/spine/knight/HulkForm2.atlas'
SHOP = ROOT / 'src/shared/shopItems.ts'
OUT = ROOT / 'public/assets/forge'


def regions(atlas: Path) -> tuple[dict[str, dict], bool]:
    """name → {bounds, rotate} from a Spine 4 atlas (single page)."""
    out: dict[str, dict] = {}
    pma = False
    name = None
    for raw in atlas.read_text().splitlines()[1:]:
        line = raw.strip()
        if not line:
            continue
        if ':' not in line:
            name = line
            out[name] = {'rotate': 0}
            continue
        key, val = (s.strip() for s in line.split(':', 1))
        if name is None:
            pma = pma or (key == 'pma' and val == 'true')
        elif key == 'bounds':
            out[name]['bounds'] = [int(v) for v in val.split(',')]
        elif key == 'rotate':
            out[name]['rotate'] = 90 if val == 'true' else int(val)
    return out, pma


def unpremultiply(img: Image.Image) -> Image.Image:
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if 0 < a < 255:
                px[x, y] = (min(255, r * 255 // a), min(255, g * 255 // a), min(255, b * 255 // a), a)
    return img


def main() -> None:
    ids = re.findall(r"attachmentId:\s*'([^']+)'", SHOP.read_text())
    regs, pma = regions(ATLAS)
    page = Image.open(ATLAS.with_name('HulkForm2.png')).convert('RGBA')
    OUT.mkdir(parents=True, exist_ok=True)
    written, missing = 0, []
    for aid in dict.fromkeys(ids):
        reg = regs.get(aid)
        if not reg or 'bounds' not in reg:
            missing.append(aid)
            continue
        x, y, w, h = reg['bounds']
        if reg['rotate'] in (90, 270):
            w, h = h, w
        icon = page.crop((x, y, x + w, y + h))
        if reg['rotate'] == 90:
            icon = icon.transpose(Image.ROTATE_270)
        elif reg['rotate'] == 270:
            icon = icon.transpose(Image.ROTATE_90)
        if pma:
            icon = unpremultiply(icon)
        bbox = icon.getbbox()
        if bbox:
            icon = icon.crop(bbox)
        icon.save(OUT / f'{aid}.png', optimize=True)
        written += 1
    print(f'{written} icons → {OUT.relative_to(ROOT)}' + (f'; not in atlas (glyph fallback): {", ".join(missing)}' if missing else ''))


if __name__ == '__main__':
    main()
