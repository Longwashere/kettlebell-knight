"""Legend chapter art for the stage cinematics: each map's secret-trial set, empty, with the relic waiting.

Source frames come from the live trial scenes with the knight hidden (426x240 engine canvas):
  npm run shot -- --out work/legend_shots eval:__kk.call('trial','<id>') wait:3500 \
      "eval:__kk.call('trialActor',false)" canvas:<id>   (one triple per trial)
Each frame is scaled up (nearest) to fill the 1376x768 cinematic width, shifted so the relic sits above the
narration (which covers the lower half), the space below fades into black, then a cold spectral grade and motes.
"""
import random

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

SRC = 'work/legend_shots'
OUT = 'public/assets/cinematics'
W, H = 1376, 768
RELIC_SCREEN_Y = 300  # where the relic's centre lands on screen
FRAME_W = 820  # the frame's width on screen; the sides are filled with a blurred, darkened copy
FEATHER = 130

# out dir, trial id, relic centre y in the 426x240 frame (and how to extend its sides: 'reflect', or 'fade' into darkness)
LEGENDS = [
    ('verdant_forest', 'excalibell', 125),
    ('dark_forest', 'excalibell', 125),
    ('town_square', 'bellringer_mallet', 105, 'fade'),  # a mirrored tent would show at the edge
    ('sunken_cistern', 'leviathan_anchor', 180),
    ('cathedral_crypt', 'everburning_censer', 115),
    ('blood_cemetery', 'dead_weight', 100),
    ('belfry_ramparts', 'tolling_thunder', 95),
    ('cathedral_vault', 'midas_bell', 125),
    ('volcanic_forge', 'heartforge', 165),
    ('eldritch_altar', 'hollow_bell', 120),
    ('obsidian_throne', 'excalibane', 150),
]


def legend(out_dir: str, trial: str, relic_y: int, sides: str, seed: int) -> None:
    frame = Image.open(f'{SRC}/{trial}.png').convert('RGB')
    s = FRAME_W / frame.width
    big = frame.resize((FRAME_W, round(frame.height * s)), Image.Resampling.NEAREST)
    top = RELIC_SCREEN_Y - round(relic_y * s)

    # Backdrop: the frame itself, its edges carried outward (mirrored or faded sideways, stretched up and down), at the
    # same scale and blurred, so the scene continues past the sharp frame without ghost copies
    px, py = 200, 120
    arr = np.asarray(frame)
    if sides == 'fade':
        arr = np.pad(arr, ((0, 0), (px, px), (0, 0)), mode='constant', constant_values=6)
    else:
        arr = np.pad(arr, ((0, 0), (px, px), (0, 0)), mode='reflect')
    arr = np.pad(arr, ((py, py), (0, 0), (0, 0)), mode='edge')
    ext = Image.fromarray(arr)
    ext = ext.resize((round(ext.width * s), round(ext.height * s)), Image.Resampling.BILINEAR)
    ext = ImageEnhance.Brightness(ext.filter(ImageFilter.GaussianBlur(10))).enhance(0.8)
    canvas = Image.new('RGB', (W, H), (4, 5, 8))
    x0 = (W - FRAME_W) // 2
    canvas.paste(ext, (x0 - round(px * s), top - round(py * s)))
    # Feather the sharp frame into the backdrop at its sides
    mask = Image.new('L', big.size, 255)
    md = ImageDraw.Draw(mask)
    for i in range(FEATHER):
        a = round(255 * i / FEATHER)
        md.line([(i, 0), (i, big.height)], fill=a)
        md.line([(FRAME_W - 1 - i, 0), (FRAME_W - 1 - i, big.height)], fill=a)
    canvas.paste(big, (x0, top), mask)

    # Fade the frame's bottom edge (and any gap under it) into black
    fade = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(fade)
    bottom = top + big.height
    start = bottom - 220
    for y in range(H):
        a = 0 if y < start else min(255, round(255 * (y - start) / 220))
        d.line([(0, y), (W, y)], fill=a)
    canvas = Image.composite(Image.new('RGB', (W, H), (4, 5, 8)), canvas, fade)

    # Cold, faded grade: a remembered place, not the present one
    canvas = ImageEnhance.Color(canvas).enhance(0.8)
    tint = Image.new('RGB', (W, H), (70, 140, 150))
    canvas = Image.blend(canvas, tint, 0.08)

    # Spectral motes drifting around the relic
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    rnd = random.Random(seed)
    for _ in range(22):
        x = rnd.gauss(W / 2, W / 4)
        y = rnd.gauss(RELIC_SCREEN_Y, 150)
        r = rnd.choice([2, 3, 3, 4])
        g.ellipse([x - r, y - r, x + r, y + r], fill=(170, 240, 230, rnd.randint(70, 170)))
    halo = glow.filter(ImageFilter.GaussianBlur(7))
    canvas = Image.alpha_composite(Image.alpha_composite(canvas.convert('RGBA'), halo), glow).convert('RGB')

    path = f'{OUT}/{out_dir}/chapter5_legend.jpg'
    canvas.save(path, quality=88)
    print(path)


if __name__ == '__main__':
    import os
    for i, (out_dir, trial, relic_y, *x) in enumerate(LEGENDS):
        os.makedirs(f'{OUT}/{out_dir}', exist_ok=True)
        legend(out_dir, trial, relic_y, x[0] if x else 'reflect', i)
