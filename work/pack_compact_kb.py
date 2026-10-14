import json
import numpy as np
from PIL import Image

def to_pma(img):
    arr = np.array(img, dtype=float)
    alpha = arr[:, :, 3:4] / 255.0
    arr[:, :, :3] *= alpha
    return Image.fromarray(np.round(arr).astype(np.uint8))

from test_smaller_kb import draw_compact_kettlebell

iron = to_pma(draw_compact_kettlebell("32", color_band=(220, 38, 38, 255), bell_color=(45, 52, 62, 255)))
excal = to_pma(draw_compact_kettlebell("48", color_band=(56, 182, 255, 255), bell_color=(235, 175, 25, 255), is_gold=True))
dragon = to_pma(draw_compact_kettlebell("64", color_band=(245, 158, 11, 255), bell_color=(165, 28, 30, 255), is_fire=True))
void_b = to_pma(draw_compact_kettlebell("100", color_band=(0, 245, 140, 255), bell_color=(85, 25, 135, 255), is_void=True))

orig_img = Image.open('public/assets/spine/knight/HulkForm2.png')
new_img = Image.new('RGBA', (512, 128), (0, 0, 0, 0))
new_img.paste(orig_img.crop((0, 0, 512, 64)), (0, 0))

# 40x40 sprites in row y=64..104
# Spaced at 0, 48, 96, 144
new_img.paste(iron, (0, 64), iron)
new_img.paste(excal, (48, 64), excal)
new_img.paste(dragon, (96, 64), dragon)
new_img.paste(void_b, (144, 64), void_b)

new_img.save('public/assets/spine/knight/HulkForm2.png')
print('HulkForm2.png updated with 40x40 kettlebells!')

# Update atlas
with open('public/assets/spine/knight/HulkForm2.atlas', 'r') as f:
    text = f.read()

lines = text.splitlines()
out_lines = []
skip = False
for line in lines:
    if line.strip() in ('iron_kettlebell', 'excalibur_bell', 'dragon_kettlebell', 'void_bell', 'sword'):
        skip = True
        continue
    if skip:
        if line.startswith('bounds:') or line.startswith('offsets:'):
            continue
        else:
            skip = False
    if line.startswith('size:'):
        out_lines.append('size:512,128')
    else:
        out_lines.append(line)

for name, x in [('sword', 0), ('iron_kettlebell', 0), ('excalibur_bell', 48), ('dragon_kettlebell', 96), ('void_bell', 144)]:
    out_lines.append(name)
    out_lines.append(f'bounds:{x},64,40,40')
    out_lines.append('offsets:0,0,40,40')

with open('public/assets/spine/knight/HulkForm2.atlas', 'w') as f:
    f.write('\n'.join(out_lines) + '\n')
print('HulkForm2.atlas updated!')

# Update JSON
with open('public/assets/spine/knight/HulkForm2.json', 'r') as f:
    skel = json.load(f)

sword_att = skel['skins'][0]['attachments']['sword']

# Size: 40 / 0.15 = 266.67
# Handle grip at y=4, center is y=20.
kb_spec = {'x': 72.0, 'y': -14.0, 'rotation': 45.0, 'width': 266.67, 'height': 266.67}

for k in ['sword', 'iron_kettlebell', 'excalibur_bell', 'dragon_kettlebell', 'void_bell']:
    sword_att[k] = dict(kb_spec)

with open('public/assets/spine/knight/HulkForm2.json', 'w') as f:
    json.dump(skel, f, separators=(',', ':'))
print('HulkForm2.json updated with 40x40 specs!')
