import json
import numpy as np
from PIL import Image

def to_pma(img):
    arr = np.array(img, dtype=float)
    alpha = arr[:, :, 3:4] / 255.0
    arr[:, :, :3] *= alpha
    return Image.fromarray(np.round(arr).astype(np.uint8))

orig_img = Image.open('public/assets/spine/knight/HulkForm2.png')

new_img = Image.new('RGBA', (512, 128), (0, 0, 0, 0))
new_img.paste(orig_img.crop((0, 0, 512, 64)), (0, 0))

# Import draw function from test_real_kb
from test_real_kb import draw_real_kettlebell

iron = to_pma(draw_real_kettlebell("32", "KG", color_band=(220, 38, 38, 255), bell_color=(45, 52, 62, 255)))
excal = to_pma(draw_real_kettlebell("48", "KG", color_band=(56, 182, 255, 255), bell_color=(235, 175, 25, 255), is_gold=True))
dragon = to_pma(draw_real_kettlebell("64", "KG", color_band=(245, 158, 11, 255), bell_color=(160, 25, 28, 255), is_fire=True))
void_b = to_pma(draw_real_kettlebell("∞", "KG", color_band=(0, 245, 140, 255), bell_color=(85, 25, 135, 255), is_void=True))

# 64x64 sprites in row y=64..128
# x=0..64, x=64..128, x=128..192, x=192..256
new_img.paste(iron, (0, 64), iron)
new_img.paste(excal, (64, 64), excal)
new_img.paste(dragon, (128, 64), dragon)
new_img.paste(void_b, (192, 64), void_b)

new_img.save('public/assets/spine/knight/HulkForm2.png')
print('HulkForm2.png updated with 64x64 real kettlebells!')

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

for name, x in [('sword', 0), ('iron_kettlebell', 0), ('excalibur_bell', 64), ('dragon_kettlebell', 128), ('void_bell', 192)]:
    out_lines.append(name)
    out_lines.append(f'bounds:{x},64,64,64')
    out_lines.append('offsets:0,0,64,64')

with open('public/assets/spine/knight/HulkForm2.atlas', 'w') as f:
    f.write('\n'.join(out_lines) + '\n')
print('HulkForm2.atlas updated!')

# Update JSON
with open('public/assets/spine/knight/HulkForm2.json', 'r') as f:
    skel = json.load(f)

sword_att = skel['skins'][0]['attachments']['sword']

# Size: 64 / 0.15 = 426.67
# Handle grip is at y=10, center is y=32. dy = 22 px -> 22 / 0.15 = 146.67
# In bone space, let's start with x = 146.67 along bone, y = 0, rotation = -90 (so handle is at bone base, bell points along bone)
# Let's test rotation = -90
kb_spec = {'x': 146.67, 'y': 0.0, 'rotation': -90.0, 'width': 426.67, 'height': 426.67}

for k in ['sword', 'iron_kettlebell', 'excalibur_bell', 'dragon_kettlebell', 'void_bell']:
    sword_att[k] = dict(kb_spec)

with open('public/assets/spine/knight/HulkForm2.json', 'w') as f:
    json.dump(skel, f, separators=(',', ':'))
print('HulkForm2.json updated!')
