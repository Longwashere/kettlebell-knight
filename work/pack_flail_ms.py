import json
import numpy as np
from PIL import Image

def to_pma(img):
    arr = np.array(img, dtype=float)
    alpha = arr[:, :, 3:4] / 255.0
    arr[:, :, :3] *= alpha
    return Image.fromarray(np.round(arr).astype(np.uint8))

from test_flail_hang import draw_flail_morningstar

iron_ms = to_pma(draw_flail_morningstar("32", color_band=(220, 38, 38, 255), bell_color=(45, 52, 62, 255)))
excal_ms = to_pma(draw_flail_morningstar("48", color_band=(56, 182, 255, 255), bell_color=(235, 175, 25, 255), is_gold=True))
dragon_ms = to_pma(draw_flail_morningstar("64", color_band=(245, 158, 11, 255), bell_color=(165, 28, 30, 255), is_fire=True))
void_ms = to_pma(draw_flail_morningstar("100", color_band=(0, 245, 140, 255), bell_color=(85, 25, 135, 255), is_void=True))

hulk_img = Image.open('public/assets/spine/knight/HulkForm2.png')

# Clear old morningstar area
clear_box = Image.new("RGBA", (280, 64), (0, 0, 0, 0))
hulk_img.paste(clear_box, (200, 64))

# Paste new 58x58 flail morningstars at x=200, 265, 330, 395, y=64
hulk_img.paste(iron_ms, (200, 64), iron_ms)
hulk_img.paste(excal_ms, (265, 64), excal_ms)
hulk_img.paste(dragon_ms, (330, 64), dragon_ms)
hulk_img.paste(void_ms, (395, 64), void_ms)

hulk_img.save('public/assets/spine/knight/HulkForm2.png')
print('HulkForm2.png updated!')

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
    out_lines.append(f'bounds:{x},64,58,58')
    out_lines.append('offsets:0,0,58,58')

with open('public/assets/spine/knight/HulkForm2.atlas', 'w') as f:
    f.write('\n'.join(out_lines) + '\n')
print('HulkForm2.atlas updated!')

# Update JSON
with open('public/assets/spine/knight/HulkForm2.json', 'r') as f:
    skel = json.load(f)

sword_att = skel['skins'][0]['attachments']['sword']

# Test rotation 20.0, x=110.0, y=-20.0
ms_spec = {'x': 110.0, 'y': -20.0, 'rotation': 20.0, 'width': 386.67, 'height': 386.67}

for name, _ in ms_items:
    sword_att[name] = dict(ms_spec)

with open('public/assets/spine/knight/HulkForm2.json', 'w') as f:
    json.dump(skel, f, separators=(',', ':'))
print('HulkForm2.json updated!')
