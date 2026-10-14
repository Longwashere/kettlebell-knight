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

iron = to_pma(Image.open('work/test_real_kb.py')) # wait, let's load from image
