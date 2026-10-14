# Cut each labelled component out of the white sheet into a transparent PNG.
# Pixels within 2px of the border get alpha from their distance to white and are un-mixed from it;
# white gaps (e.g. between hair spikes) stay transparent.
import cv2, numpy as np, json, os
im = cv2.imread('work/adventurer/sheet.png').astype(np.float32)
d = (255 - im).sum(2)
m = (d > 45).astype(np.uint8) * 255
m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((3,3),np.uint8))
n, lab, st, _ = cv2.connectedComponentsWithStats(m, connectivity=8)
NAMES = {1:"head", 5:"torso",
         7:"r_upper_arm", 11:"r_forearm",      # character's right arm (viewer left)
         6:"l_upper_arm", 10:"l_forearm",      # character's left arm (viewer right)
         2:"r_thigh", 9:"r_shin", 13:"r_boot",
         3:"l_thigh", 8:"l_shin", 14:"l_boot",
         4:"alt_upper_arm", 12:"alt_forearm"}  # diagonal pose, not rigged
os.makedirs('work/adventurer/parts', exist_ok=True)
os.makedirs('work/adventurer/parts_extra', exist_ok=True)
info = {}
for i, name in NAMES.items():
    comp = (lab == i).astype(np.uint8)
    region = cv2.dilate(comp, np.ones((3,3), np.uint8)) > 0
    a = np.clip(d / 700.0, 0, 1) * region      # edge pixels: coverage over the dark outline
    a[cv2.erode(comp, np.ones((5,5), np.uint8)) > 0] = 1.0
    rgb = (im - (1 - a[..., None]) * 255) / np.maximum(a[..., None], 1e-3)
    rgba = np.dstack([np.clip(rgb, 0, 255), a * 255]).astype(np.uint8)
    ys, xs = np.where(a > 0.02)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    out = 'parts_extra' if name.startswith('alt_') else 'parts'
    cv2.imwrite(f'work/adventurer/{out}/{name}.png', rgba[y0:y1, x0:x1])
    info[name] = {"x": int(x0), "y": int(y0), "w": int(x1 - x0), "h": int(y1 - y0)}
json.dump(info, open('work/adventurer/parts.json', 'w'), indent=1)
for k, v in info.items(): print(k, v)
