import json
import numpy as np
from PIL import Image

def to_pma(img):
    arr = np.array(img, dtype=float)
    alpha = arr[:, :, 3:4] / 255.0
    arr[:, :, :3] *= alpha
    return Image.fromarray(np.round(arr).astype(np.uint8))

from test_mace import draw_kettle_mace

mace_pma = to_pma(draw_kettle_mace("32"))

hulk_img = Image.open('public/assets/spine/knight/HulkForm2.png')
# Paste iron_mace at x=200, y=0 (w=64, h=30)
hulk_img.paste(mace_pma, (200, 0), mace_pma)
hulk_img.save('public/assets/spine/knight/HulkForm2.png')
print('HulkForm2.png updated with iron_mace!')

# Update atlas
with open('public/assets/spine/knight/HulkForm2.atlas', 'r') as f:
    text = f.read()

lines = text.splitlines()
out_lines = []
skip = False
for line in lines:
    if line.strip() == 'iron_mace':
        skip = True
        continue
    if skip:
        if line.startswith('bounds:') or line.startswith('offsets:'):
            continue
        else:
            skip = False
    out_lines.append(line)

out_lines.append('iron_mace')
out_lines.append('bounds:200,0,64,30')
out_lines.append('offsets:0,0,64,30')

with open('public/assets/spine/knight/HulkForm2.atlas', 'w') as f:
    f.write('\n'.join(out_lines) + '\n')
print('HulkForm2.atlas updated with iron_mace!')

# Update JSON
with open('public/assets/spine/knight/HulkForm2.json', 'r') as f:
    skel = json.load(f)

sword_att = skel['skins'][0]['attachments']['sword']
# dx = 21 / 0.15 = 140.0, dy = 0, width = 64/0.15 = 426.67, height = 30/0.15 = 200.0
mace_spec = {'x': 140.0, 'y': 0.0, 'rotation': 0.58, 'width': 426.67, 'height': 200.0}
sword_att['iron_mace'] = mace_spec

with open('public/assets/spine/knight/HulkForm2.json', 'w') as f:
    json.dump(skel, f, separators=(',', ':'))
print('HulkForm2.json updated with iron_mace!')
