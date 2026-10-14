import json
import numpy as np
from PIL import Image

def to_pma(img):
    arr = np.array(img, dtype=float)
    alpha = arr[:, :, 3:4] / 255.0
    arr[:, :, :3] *= alpha
    return Image.fromarray(np.round(arr).astype(np.uint8))

from test_hanging_ms import draw_hanging_morningstar

iron_ms = to_pma(draw_hanging_morningstar("32", color_band=(220, 38, 38, 255), bell_color=(45, 52, 62, 255)))
excal_ms = to_pma(draw_hanging_morningstar("48", color_band=(56, 182, 255, 255), bell_color=(235, 175, 25, 255), is_gold=True))
dragon_ms = to_pma(draw_hanging_morningstar("64", color_band=(245, 158, 11, 255), bell_color=(165, 28, 30, 255), is_fire=True))
void_ms = to_pma(draw_hanging_morningstar("100", color_band=(0, 245, 140, 255), bell_color=(85, 25, 135, 255), is_void=True))

hulk_img = Image.open('public/assets/spine/knight/HulkForm2.png')

# Clear old morningstar area (x=200..480, y=64..128)
clear_box = Image.new("RGBA", (280, 64), (0, 0, 0, 0))
hulk_img.paste(clear_box, (200, 64))

# Paste new 56x56 hanging morningstars
hulk_img.paste(iron_ms, (200, 64), iron_ms)
hulk_img.paste(excal_ms, (265, 64), excal_ms)
hulk_img.paste(dragon_ms, (330, 64), dragon_ms)
hulk_img.paste(void_ms, (395, 64), void_ms)

hulk_img.save('public/assets/spine/knight/HulkForm2.png')
print('HulkForm2.png updated with hanging morningstars!')

# Update atlas
with open('public/assets/spine/knight/HulkForm2.atlas', 'r') as f:
    text = f.read()

lines = text.splitlines()
out_lines = []
skip = False
for line in lines:
    if line.strip() in ('iron_morningstar', 'excalibur_morningstar', 'dragon_morningstar', 'void_morningstar'):
        skip = True
        continue
    if skip:
        if line.startswith('bounds:') or line.startswith('offsets:'):
            continue
        else:
            skip = False
    out_lines.append(line)

ms_items = [
    ('iron_morningstar', 200),
    ('excalibur_morningstar', 265),
    ('dragon_morningstar', 330),
    ('void_morningstar', 395),
]

for name, x in ms_items:
    out_lines.append(name)
    out_lines.append(f'bounds:{x},64,56,56')
    out_lines.append('offsets:0,0,56,56')

with open('public/assets/spine/knight/HulkForm2.atlas', 'w') as f:
    f.write('\n'.join(out_lines) + '\n')
print('HulkForm2.atlas updated with hanging morningstars!')

# Update JSON
with open('public/assets/spine/knight/HulkForm2.json', 'r') as f:
    skel = json.load(f)

sword_att = skel['skins'][0]['attachments']['sword']

# Grip is at x=14, y=13 in 56x56 sprite.
# Center is at x=28, y=28.
# dx = 14 / 0.15 = 93.33
# dy = (28 - 13) / 0.15 = 100.0 (in Spine, image bottom is negative Y, so center is at -100.0 relative to grip)
ms_spec = {'x': 93.33, 'y': -100.0, 'rotation': 0.58, 'width': 373.33, 'height': 373.33}

for name, _ in ms_items:
    sword_att[name] = dict(ms_spec)

with open('public/assets/spine/knight/HulkForm2.json', 'w') as f:
    json.dump(skel, f, separators=(',', ':'))
print('HulkForm2.json updated with hanging morningstars!')
