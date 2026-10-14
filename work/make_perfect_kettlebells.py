import json
import numpy as np
from PIL import Image, ImageDraw

W, H = 64, 64

def draw_real_kettlebell(weight_text="32", unit_text="KG", color_band=(220, 38, 38, 255), bell_color=(40, 45, 52, 255), is_gold=False, is_fire=False, is_void=False):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    OUTLINE = (15, 18, 24, 255)
    
    # 1. HANDLE & HORNS (Classic cast iron loop)
    d.rounded_rectangle([16, 6, 48, 28], radius=8, fill=bell_color, outline=OUTLINE, width=2)
    # Inner cutout window
    d.rounded_rectangle([23, 13, 41, 28], radius=5, fill=(0, 0, 0, 0), outline=OUTLINE, width=1)
    
    # 2. COMPETITION / ROGUE COLOR BANDS ON HORNS
    d.rectangle([17, 18, 22, 22], fill=color_band, outline=OUTLINE, width=1)
    d.rectangle([42, 18, 47, 22], fill=color_band, outline=OUTLINE, width=1)
    
    # Grip highlight
    d.line([(24, 8), (40, 8)], fill=(130, 145, 160, 255) if not is_gold else (255, 245, 190, 255))
    
    # 3. SPHERICAL BELL BODY
    d.ellipse([13, 22, 51, 60], fill=bell_color, outline=OUTLINE, width=2)
    # Flat resting base
    d.polygon([(21, 57), (43, 57), (41, 61), (23, 61)], fill=bell_color, outline=OUTLINE)
    
    # 3D Shading on the sphere
    d.arc([15, 24, 49, 58], 0, 120, fill=(20, 24, 30, 255) if not is_gold else (160, 100, 15, 255), width=3)
    d.arc([16, 25, 48, 57], 150, 270, fill=(85, 98, 115, 255) if not is_gold else (255, 225, 100, 255), width=2)
    # Specular glint
    d.line([(20, 28), (24, 26)], fill=(200, 215, 230, 255) if not is_gold else (255, 255, 230, 255), width=1)
    d.point([(21, 29), (22, 29)], fill=(255, 255, 255, 255))
    
    # 4. RECESSED CIRCULAR WEIGHT BADGE
    d.ellipse([21, 31, 43, 53], fill=(30, 35, 42, 255) if not is_gold else (200, 135, 20, 255), outline=OUTLINE, width=1)
    d.ellipse([23, 33, 41, 51], fill=(22, 26, 32, 255) if not is_gold else (175, 110, 15, 255))
    
    # STAMPED WEIGHT TEXT
    num_color = (255, 255, 255, 255) if not is_gold else (255, 250, 200, 255)
    sub_color = color_band
    
    if weight_text == "32":
        # 3
        d.line([(26, 37), (30, 37)], fill=num_color)
        d.line([(30, 37), (30, 41)], fill=num_color)
        d.line([(27, 41), (30, 41)], fill=num_color)
        d.line([(30, 41), (30, 45)], fill=num_color)
        d.line([(26, 45), (30, 45)], fill=num_color)
        # 2
        d.line([(33, 37), (37, 37)], fill=num_color)
        d.line([(37, 37), (37, 41)], fill=num_color)
        d.line([(33, 41), (37, 41)], fill=num_color)
        d.line([(33, 41), (33, 45)], fill=num_color)
        d.line([(33, 45), (37, 45)], fill=num_color)
    elif weight_text == "48":
        # 4
        d.line([(26, 37), (26, 41)], fill=num_color)
        d.line([(26, 41), (30, 41)], fill=num_color)
        d.line([(30, 37), (30, 45)], fill=num_color)
        # 8
        d.rectangle([33, 37, 37, 45], outline=num_color)
        d.line([(33, 41), (37, 41)], fill=num_color)
    elif weight_text == "64":
        # 6
        d.line([(26, 37), (30, 37)], fill=num_color)
        d.line([(26, 37), (26, 45)], fill=num_color)
        d.line([(26, 45), (30, 45)], fill=num_color)
        d.line([(30, 41), (30, 45)], fill=num_color)
        d.line([(26, 41), (30, 41)], fill=num_color)
        # 4
        d.line([(33, 37), (33, 41)], fill=num_color)
        d.line([(33, 41), (37, 41)], fill=num_color)
        d.line([(37, 37), (37, 45)], fill=num_color)
    elif weight_text == "100":
        # 1
        d.line([(25, 38), (26, 37)], fill=num_color)
        d.line([(26, 37), (26, 45)], fill=num_color)
        # 0
        d.rectangle([29, 37, 33, 45], outline=num_color)
        # 0
        d.rectangle([35, 37, 39, 45], outline=num_color)
        
    # "KG" below the number
    d.point([(28, 47), (28, 48), (28, 49), (29, 48), (30, 47), (30, 49)], fill=sub_color) # K
    d.point([(32, 47), (33, 47), (32, 48), (32, 49), (34, 49), (34, 48), (33, 48)], fill=sub_color) # G
    
    # 5. WEAPON IMPACT AUGMENTATIONS
    if is_void:
        d.polygon([(20, 58), (14, 63), (25, 60)], fill=(192, 132, 252, 255), outline=OUTLINE)
        d.polygon([(43, 58), (49, 63), (39, 60)], fill=(192, 132, 252, 255), outline=OUTLINE)
        d.polygon([(30, 60), (32, 64), (34, 60)], fill=(0, 245, 140, 255), outline=OUTLINE)
    elif is_fire:
        d.polygon([(18, 56), (12, 62), (24, 59)], fill=(245, 158, 11, 255), outline=OUTLINE)
        d.polygon([(45, 56), (51, 62), (40, 59)], fill=(245, 158, 11, 255), outline=OUTLINE)
        d.polygon([(29, 60), (32, 64), (35, 60)], fill=(255, 230, 50, 255), outline=OUTLINE)
    elif is_gold:
        d.polygon([(19, 57), (15, 63), (25, 59)], fill=(255, 240, 150, 255), outline=OUTLINE)
        d.polygon([(44, 57), (48, 63), (39, 59)], fill=(255, 240, 150, 255), outline=OUTLINE)
        d.polygon([(30, 60), (32, 64), (34, 60)], fill=(56, 182, 255, 255), outline=OUTLINE)
    else:
        d.polygon([(20, 58), (16, 63), (24, 60)], fill=(160, 175, 190, 255), outline=OUTLINE)
        d.polygon([(43, 58), (47, 63), (39, 60)], fill=(160, 175, 190, 255), outline=OUTLINE)
        d.polygon([(30, 60), (32, 63), (34, 60)], fill=(220, 230, 240, 255), outline=OUTLINE)
        
    return img

def to_pma(img):
    arr = np.array(img, dtype=float)
    alpha = arr[:, :, 3:4] / 255.0
    arr[:, :, :3] *= alpha
    return Image.fromarray(np.round(arr).astype(np.uint8))

iron = to_pma(draw_real_kettlebell("32", "KG", color_band=(220, 38, 38, 255), bell_color=(45, 52, 62, 255)))
excal = to_pma(draw_real_kettlebell("48", "KG", color_band=(56, 182, 255, 255), bell_color=(235, 175, 25, 255), is_gold=True))
dragon = to_pma(draw_real_kettlebell("64", "KG", color_band=(245, 158, 11, 255), bell_color=(165, 28, 30, 255), is_fire=True))
void_b = to_pma(draw_real_kettlebell("100", "KG", color_band=(0, 245, 140, 255), bell_color=(85, 25, 135, 255), is_void=True))

orig_img = Image.open('public/assets/spine/knight/HulkForm2.png')
new_img = Image.new('RGBA', (512, 128), (0, 0, 0, 0))
new_img.paste(orig_img.crop((0, 0, 512, 64)), (0, 0))

new_img.paste(iron, (0, 64), iron)
new_img.paste(excal, (64, 64), excal)
new_img.paste(dragon, (128, 64), dragon)
new_img.paste(void_b, (192, 64), void_b)

new_img.save('public/assets/spine/knight/HulkForm2.png')
print('Atlas image saved!')

with open('public/assets/spine/knight/HulkForm2.json', 'r') as f:
    skel = json.load(f)

sword_att = skel['skins'][0]['attachments']['sword']
kb_spec = {'x': 130.0, 'y': -10.0, 'rotation': 45.0, 'width': 426.67, 'height': 426.67}

for k in ['sword', 'iron_kettlebell', 'excalibur_bell', 'dragon_kettlebell', 'void_bell']:
    sword_att[k] = dict(kb_spec)

with open('public/assets/spine/knight/HulkForm2.json', 'w') as f:
    json.dump(skel, f, separators=(',', ':'))
print('Skeleton JSON saved!')
