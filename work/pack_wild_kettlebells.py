import json
import numpy as np
from PIL import Image

def to_pma(img):
    arr = np.array(img, dtype=float)
    alpha = arr[:, :, 3:4] / 255.0
    arr[:, :, :3] *= alpha
    return Image.fromarray(np.round(arr).astype(np.uint8))

orig_img = Image.open('public/assets/spine/knight/HulkForm2.png')

# Create 512x128 canvas
new_img = Image.new('RGBA', (512, 128), (0, 0, 0, 0))
# Keep original top half (rows 0..63)
new_img.paste(orig_img.crop((0, 0, 512, 64)), (0, 0))

iron = to_pma(Image.open('work/wild_iron.png'))
excal = to_pma(Image.open('work/wild_excalibur.png'))
dragon = to_pma(Image.open('work/wild_dragon.png'))
void_b = to_pma(Image.open('work/wild_void.png'))

# Paste all 4 wild kettlebells in row y=66 (height 36, ends at 102)
new_img.paste(iron, (2, 66), iron)
new_img.paste(excal, (76, 66), excal)
new_img.paste(dragon, (150, 66), dragon)
new_img.paste(void_b, (224, 66), void_b)

new_img.save('public/assets/spine/knight/HulkForm2.png')
print('HulkForm2.png updated with wild kettlebells!')

# Update atlas
with open('public/assets/spine/knight/HulkForm2.atlas', 'r') as f:
    text = f.read()

# Filter out old kettlebell and sword entries
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

# Add sword and the 4 kettlebells pointing to the new bounds
out_lines.append('sword')
out_lines.append('bounds:2,66,70,36')
out_lines.append('offsets:0,0,70,36')

out_lines.append('iron_kettlebell')
out_lines.append('bounds:2,66,70,36')
out_lines.append('offsets:0,0,70,36')

out_lines.append('excalibur_bell')
out_lines.append('bounds:76,66,70,36')
out_lines.append('offsets:0,0,70,36')

out_lines.append('dragon_kettlebell')
out_lines.append('bounds:150,66,70,36')
out_lines.append('offsets:0,0,70,36')

out_lines.append('void_bell')
out_lines.append('bounds:224,66,70,36')
out_lines.append('offsets:0,0,70,36')

with open('public/assets/spine/knight/HulkForm2.atlas', 'w') as f:
    f.write('\n'.join(out_lines) + '\n')
print('HulkForm2.atlas updated!')

# Update JSON
with open('public/assets/spine/knight/HulkForm2.json', 'r') as f:
    skel = json.load(f)

sword_att = skel['skins'][0]['attachments']['sword']
# 70 / 0.15 = 466.67, 36 / 0.15 = 240
wild_spec = {'x': 93.09, 'y': 1.81, 'rotation': 0.58, 'width': 466.67, 'height': 240}

sword_att['sword'] = dict(wild_spec)
sword_att['iron_kettlebell'] = dict(wild_spec)
sword_att['excalibur_bell'] = dict(wild_spec)
sword_att['dragon_kettlebell'] = dict(wild_spec)
sword_att['void_bell'] = dict(wild_spec)

with open('public/assets/spine/knight/HulkForm2.json', 'w') as f:
    json.dump(skel, f, separators=(',', ':'))
print('HulkForm2.json updated!')
