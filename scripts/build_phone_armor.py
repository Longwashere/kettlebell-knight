#!/usr/bin/env python3
"""Cut the TV knight's armour parts out of the HulkForm2 Spine atlas into an upright sprite strip for the
phone AR overlay (src/phone/utils/KnightArmorRenderer.ts).

  python3 scripts/build_phone_armor.py

Writes public/assets/phone/knight-armor.png and public/assets/phone/knight-armor.json
({ part: [x, y, w, h] }, all parts upright: top of the image = the end nearest the head / shoulder / hip).
Rerun after the knight atlas changes.
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ATLAS = os.path.join(ROOT, 'public/assets/spine/knight/HulkForm2.atlas')
PNG = os.path.join(ROOT, 'public/assets/spine/knight/HulkForm2.png')
OUT_DIR = os.path.join(ROOT, 'public/assets/phone')

# overlay part -> atlas region
PARTS = {
    'head': 'head2',
    'body': 'body',
    'arm': 'arm',
    'armB': 'armB',
    'forearm': 'forearm',
    'forearmB': 'forearmB',
    'thigh': 'thight',
    'calf': 'calf',
    'foot': 'foot',
    'neck': 'neck',
    'shield': 'shield',
}


def read_regions(path):
    regions, name = {}, None
    for raw in open(path):
        line = raw.rstrip('\n')
        if not line.strip():
            continue
        if not raw[0].isspace() and ':' not in line:
            name = line.strip()
            regions[name] = {}
        elif name and ':' in line:
            k, v = line.strip().split(':', 1)
            regions[name][k] = v
    return regions


def main():
    regions = read_regions(ATLAS)
    sheet = Image.open(PNG).convert('RGBA')
    cut = {}
    for part, region in PARTS.items():
        r = regions.get(region)
        if not r or 'bounds' not in r:
            sys.exit(f'atlas region {region!r} missing')
        x, y, w, h = (int(n) for n in r['bounds'].split(','))
        rotated = r.get('rotate', '').strip() in ('90', 'true')
        img = sheet.crop((x, y, x + (h if rotated else w), y + (w if rotated else h)))
        if rotated:
            # Spine packs rotated regions 90° clockwise
            img = img.transpose(Image.Transpose.ROTATE_90)
        # the atlas is premultiplied: un-premultiply so the browser composites it correctly
        px = img.load()
        for j in range(img.height):
            for i in range(img.width):
                rr, gg, bb, aa = px[i, j]
                if 0 < aa < 255:
                    px[i, j] = (min(255, rr * 255 // aa), min(255, gg * 255 // aa), min(255, bb * 255 // aa), aa)
        cut[part] = img

    pad = 2
    width = sum(im.width + pad for im in cut.values()) + pad
    height = max(im.height for im in cut.values()) + pad * 2
    strip = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    frames, cx = {}, pad
    for part, im in cut.items():
        strip.paste(im, (cx, pad), im)
        frames[part] = [cx, pad, im.width, im.height]
        cx += im.width + pad

    os.makedirs(OUT_DIR, exist_ok=True)
    strip.save(os.path.join(OUT_DIR, 'knight-armor.png'), optimize=True)
    with open(os.path.join(OUT_DIR, 'knight-armor.json'), 'w') as f:
        json.dump(frames, f, indent=1)
    print(f'{len(frames)} parts -> public/assets/phone/knight-armor.png ({width}x{height})')


if __name__ == '__main__':
    main()
