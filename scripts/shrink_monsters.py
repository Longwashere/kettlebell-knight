#!/usr/bin/env python3
"""
shrink_monsters — TV-sized atlases for the monster Spine rigs.

    npm run shot -- density                     # measure: work/rigs/density.json (texels per stage px, per region)
    python3 scripts/shrink_monsters.py          # public/assets/spine/monsters/<dir>/ → monsters-tv/<dir>/
    python3 scripts/shrink_monsters.py --target 1.5 boar wolf   (atlas dirs; default: every measured rig)

The source atlases are 2–17x denser than what reaches the 426x240 stage, so the GPU minified them through
mipmaps: box-filtered levels blended trilinearly, which reads as blur. This cuts every region out of the source
page, resamples it (premultiplied-alpha Lanczos) to `--target` texels per stage pixel, and repacks the regions
into a new page. Regions keep their names, rotation and trim offsets (scaled), and attachment sizes live in the
skeleton JSON, so the rig renders at the same size from a smaller, sharper texture. The engine loads the
skeleton from monsters/ and the atlas from monsters-tv/, sampled linear with no mipmaps (like the knight).

Regions not visible at idle take the rig's smallest measured factor. Regions already within ~15% of the target
keep their source pixels. Re-run after adding a monster rig or changing a rig's `scale` in MONSTER_RIGS.
"""
import argparse
import json
import math
import os
import re

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'public/assets/spine/monsters')
OUT = os.path.join(ROOT, 'public/assets/spine/monsters-tv')
DENSITY = os.path.join(ROOT, 'work/rigs/density.json')
PAD = 2


def parse_atlas(text):
    """Spine 4.x atlas → (page header lines, page name, [region dicts with ordered (key, value) fields])."""
    lines = [l.rstrip() for l in text.splitlines()]
    page, header, regions, cur = None, [], [], None
    for line in lines:
        if not line.strip():
            continue
        kv = re.match(r'^\s*(\w+)\s*:\s*(.+)$', line)
        if page is None:
            page = line.strip()
            continue
        if kv and cur is None:
            header.append((kv.group(1), kv.group(2).strip()))
        elif kv:
            cur['fields'].append((kv.group(1), kv.group(2).strip()))
        else:
            if re.search(r'\.(png|webp|jpg)$', line.strip(), re.I):
                raise SystemExit('multi-page atlases are not supported')
            cur = {'name': line.strip(), 'fields': []}
            regions.append(cur)
    return page, header, regions


def field(region, key):
    for k, v in region['fields']:
        if k == key:
            return [int(n) for n in v.split(',')]
    return None


def set_field(region, key, values):
    region['fields'] = [(k, ','.join(map(str, values)) if k == key else v) for k, v in region['fields']]


def is_sideways(region):
    """Packed at 90/270 degrees: the page rect is the region's height x width."""
    for k, v in region['fields']:
        if k == 'rotate':
            return v in ('true', '90', '270')
    return False


def pack(sizes, pad):
    """Shelf-pack (w, h) boxes, tallest first, into the narrowest power-of-two width that keeps the page squarish."""
    area = sum((w + pad) * (h + pad) for w, h in sizes)
    widest = max(w for w, _ in sizes) + pad
    width = max(widest, 2 ** math.ceil(math.log2(max(1, math.sqrt(area * 1.1)))))
    order = sorted(range(len(sizes)), key=lambda i: -sizes[i][1])
    pos, x, y, shelf = {}, pad, pad, 0
    for i in order:
        w, h = sizes[i]
        if x + w + pad > width:
            x, y, shelf = pad, y + shelf + pad, 0
        pos[i] = (x, y)
        x += w + pad
        shelf = max(shelf, h)
    return width, y + shelf + pad, pos


def shrink_rig(rig_dir, atlas_name, densities, target):
    src_dir = os.path.join(SRC, rig_dir)
    page_name, header, regions = parse_atlas(open(os.path.join(src_dir, atlas_name)).read())
    page = Image.open(os.path.join(src_dir, page_name)).convert('RGBA')
    src_size = page.size

    # Source texels per stage pixel for each measured region (the measurement may have run on an already-shrunk atlas).
    factors = {}
    for r in regions:
        m = densities.get(r['name'])
        b = field(r, 'bounds')
        if not m or not b:
            continue
        density = m['density'] * math.sqrt((b[2] * b[3]) / max(1, m['w'] * m['h']))
        factors[r['name']] = min(1.0, target / density)
    if not factors:
        return None
    fallback = max(factors.values())
    out_dir = os.path.join(OUT, rig_dir)
    os.makedirs(out_dir, exist_ok=True)
    if min(factors.values()) > 0.85:  # already about at the target: ship the source atlas as is
        for name in (atlas_name, page_name):
            with open(os.path.join(src_dir, name), 'rb') as a, open(os.path.join(out_dir, name), 'wb') as b:
                b.write(a.read())
        return src_size, src_size, 1.0, 1.0

    cuts, sizes = [], []
    for r in regions:
        x, y, w, h = field(r, 'bounds')
        f = factors.get(r['name'], fallback)
        if f > 0.85:
            f = 1.0
        rot = is_sideways(r)
        pw, ph = (h, w) if rot else (w, h)  # rect on the page
        img = page.crop((x, y, x + pw, y + ph))
        nw, nh = max(1, round(w * f)), max(1, round(h * f))
        npw, nph = (nh, nw) if rot else (nw, nh)
        if (npw, nph) != (pw, ph):
            img = img.convert('RGBa').resize((npw, nph), Image.LANCZOS).convert('RGBA')
        cuts.append(img)
        sizes.append((npw, nph))
        r['_f'], r['_wh'] = f, (nw, nh)

    width, height, pos = pack(sizes, PAD)
    out = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    for i, (r, img) in enumerate(zip(regions, cuts)):
        out.paste(img, pos[i])
        nw, nh = r['_wh']
        set_field(r, 'bounds', [pos[i][0], pos[i][1], nw, nh])
        off = field(r, 'offsets')
        if off:
            f = r['_f']
            ow, oh = max(nw, round(off[2] * f)), max(nh, round(off[3] * f))
            set_field(r, 'offsets', [min(round(off[0] * f), ow - nw), min(round(off[1] * f), oh - nh), ow, oh])

    out.save(os.path.join(out_dir, page_name), optimize=True)
    lines = [page_name]
    for k, v in header:
        if k == 'size':
            v = f'{width},{height}'
        elif k == 'filter':
            v = 'Linear,Linear'
        lines.append(f'{k}:{v}')
    for r in regions:
        lines.append(r['name'])
        lines.extend(f'{k}:{v}' for k, v in r['fields'])
    open(os.path.join(out_dir, atlas_name), 'w').write('\n'.join(lines) + '\n')
    fs = [r['_f'] for r in regions]
    return src_size, (width, height), min(fs), max(fs)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--target', type=float, default=1.5, help='texels per stage pixel at idle (default 1.5)')
    ap.add_argument('dirs', nargs='*', help='rig dirs under public/assets/spine/monsters (default: all measured)')
    args = ap.parse_args()

    measured = json.load(open(DENSITY))
    # atlas dir → (atlas file, region → measurement); a rig shared by several monsters keeps the densest need.
    rigs = {}
    for entry in measured.values():
        m = re.search(r'/spine/monsters(?:-tv)?/([^/]+)/([^/]+\.atlas)$', entry['atlas'] or '')
        if not m:
            continue
        atlas_file, regions = rigs.setdefault(m.group(1), (m.group(2), {}))
        for name, r in entry['regions'].items():
            if name not in regions or r['density'] < regions[name]['density']:
                regions[name] = r

    for rig_dir in sorted(args.dirs or rigs):
        if rig_dir not in rigs:
            print(f'{rig_dir:20} not measured — run `npm run shot -- density` with a monster that uses it')
            continue
        atlas_file, regions = rigs[rig_dir]
        res = shrink_rig(rig_dir, atlas_file, regions, args.target)
        if not res:
            print(f'{rig_dir:20} no regions measured')
            continue
        (sw, sh), (w, h), fmin, fmax = res
        mb = lambda a, b: a * b * 4 / 1048576
        print(f'{rig_dir:20} {sw}x{sh} → {w}x{h}   x{fmin:.2f}–{fmax:.2f}   VRAM ~{mb(sw, sh) * 4 / 3:.1f} MB (mips) → ~{mb(w, h):.2f} MB')
    print(f'→ {os.path.relpath(OUT, ROOT)}/')


if __name__ == '__main__':
    main()
