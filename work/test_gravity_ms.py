import math
from PIL import Image, ImageDraw

W, H = 56, 56

def draw_gravity_morningstar(weight_text="32", color_band=(220, 38, 38, 255), bell_color=(45, 52, 62, 255), is_gold=False, is_fire=False, is_void=False):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    OUTLINE = (14, 16, 20, 255)
    
    # 1. HAFT / HANDLE (Held in hand, x: 2..24, y: 10..16)
    d.ellipse([1, 9, 6, 17], fill=(70, 80, 95, 255) if not is_gold else (244, 180, 26, 255), outline=OUTLINE)
    if is_gold:
        d.point([(3, 13)], fill=(56, 182, 255, 255))
    elif is_fire:
        d.point([(3, 13)], fill=(245, 158, 11, 255))
    elif is_void:
        d.point([(3, 13)], fill=(0, 245, 140, 255))
        
    d.line([(6, 11), (22, 11)], fill=OUTLINE)
    d.line([(6, 15), (22, 15)], fill=OUTLINE)
    haft_color = (60, 42, 30, 255) if not is_gold else (220, 210, 190, 255)
    wrap_color = (120, 85, 60, 255) if not is_gold else (244, 180, 26, 255)
    for x in range(6, 22, 2):
        d.line([(x, 12), (x+1, 14)], fill=haft_color)
        d.point([(x, 12)], fill=wrap_color)
        
    ferrule_color = (130, 145, 160, 255) if not is_gold else (244, 180, 26, 255)
    d.rectangle([21, 10, 24, 16], fill=ferrule_color, outline=OUTLINE)
    d.ellipse([23, 12, 27, 18], outline=OUTLINE, width=1)
    
    # 2. HANGING CHAIN LINKS (Dangling down with gravity)
    chain_color = (150, 165, 180, 255)
    chain_glow = None
    if is_gold:
        chain_color = (255, 230, 110, 255)
        chain_glow = (255, 252, 220, 255)
    elif is_fire:
        chain_color = (245, 158, 11, 255)
        chain_glow = (255, 240, 100, 255)
    elif is_void:
        chain_color = (192, 132, 252, 255)
        chain_glow = (0, 245, 140, 255)
        
    # Link 1: curving down from eyelet (25, 15) -> (27, 21)
    d.ellipse([24, 15, 28, 21], fill=chain_color, outline=OUTLINE)
    d.point([(26, 18)], fill=(0, 0, 0, 0))
    # Link 2: vertical link (26, 20) -> (30, 27)
    d.ellipse([26, 20, 30, 27], fill=chain_color, outline=OUTLINE)
    d.point([(28, 23)], fill=(0, 0, 0, 0))
    # Link 3: link into bell handle (28, 25) -> (32, 32)
    d.ellipse([28, 25, 32, 32], fill=chain_color, outline=OUTLINE)
    d.point([(30, 28)], fill=(0, 0, 0, 0))
    
    if chain_glow:
        d.point([(26, 17), (28, 22), (30, 27)], fill=chain_glow)
        
    # 3. KETTLEBELL HEAD (Tilted ~35 deg so when knight holds haft at 45 deg, bell is level!)
    # Let's draw the bell on a separate layer, rotate it by +35 degrees, and paste it!
    bell_img = Image.new("RGBA", (40, 40), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bell_img)
    
    # In bell_img: center is (20, 20).
    # Handle is at top (x: 13..27, y: 3..13)
    bd.rounded_rectangle([14, 4, 26, 14], radius=3, fill=bell_color, outline=OUTLINE, width=2)
    bd.rounded_rectangle([17, 7, 23, 13], radius=2, fill=(0, 0, 0, 0), outline=OUTLINE, width=1)
    bd.rectangle([14, 8, 16, 11], fill=color_band, outline=OUTLINE)
    bd.rectangle([24, 8, 26, 11], fill=color_band, outline=OUTLINE)
    
    # Sphere (cx=20, cy=23, r=10)
    bcx, bcy, br = 20, 23, 10
    bd.ellipse([bcx - br, bcy - br, bcx + br, bcy + br], fill=bell_color, outline=OUTLINE, width=2)
    # Flat base
    bd.polygon([(bcx - 5, bcy + br - 1), (bcx + 5, bcy + br - 1), (bcx + 4, bcy + br + 1), (bcx - 4, bcy + br + 1)], fill=bell_color, outline=OUTLINE)
    
    # 3D shading
    bd.arc([bcx - br + 1, bcy - br + 1, bcx + br - 1, bcy + br - 1], 45, 160, fill=(20, 24, 28, 255) if not is_gold else (160, 100, 15, 255), width=2)
    bd.arc([bcx - br + 1, bcy - br + 1, bcx + br - 1, bcy + br - 1], 190, 310, fill=(85, 98, 115, 255) if not is_gold else (255, 225, 100, 255), width=2)
    bd.point([(bcx - 4, bcy - 5), (bcx - 3, bcy - 6)], fill=(200, 215, 230, 255) if not is_gold else (255, 255, 230, 255))
    
    # Weight badge
    bd.ellipse([bcx - 6, bcy - 6, bcx + 6, bcy + 6], fill=(28, 33, 40, 255) if not is_gold else (200, 135, 20, 255), outline=OUTLINE, width=1)
    
    num_color = (255, 255, 255, 255) if not is_gold else (255, 250, 200, 255)
    if weight_text == "32":
        bd.line([(bcx - 4, bcy - 3), (bcx - 1, bcy - 3)], fill=num_color)
        bd.line([(bcx - 1, bcy - 3), (bcx - 1, bcy - 1)], fill=num_color)
        bd.line([(bcx - 3, bcy - 1), (bcx - 1, bcy - 1)], fill=num_color)
        bd.line([(bcx - 1, bcy - 1), (bcx - 1, bcy + 1)], fill=num_color)
        bd.line([(bcx - 4, bcy + 1), (bcx - 1, bcy + 1)], fill=num_color)
        
        bd.line([(bcx + 1, bcy - 3), (bcx + 4, bcy - 3)], fill=num_color)
        bd.line([(bcx + 4, bcy - 3), (bcx + 4, bcy - 1)], fill=num_color)
        bd.line([(bcx + 1, bcy - 1), (bcx + 4, bcy - 1)], fill=num_color)
        bd.line([(bcx + 1, bcy - 1), (bcx + 1, bcy + 1)], fill=num_color)
        bd.line([(bcx + 1, bcy + 1), (bcx + 4, bcy + 1)], fill=num_color)
    elif weight_text == "48":
        bd.line([(bcx - 4, bcy - 3), (bcx - 4, bcy - 1)], fill=num_color)
        bd.line([(bcx - 4, bcy - 1), (bcx - 1, bcy - 1)], fill=num_color)
        bd.line([(bcx - 1, bcy - 3), (bcx - 1, bcy + 1)], fill=num_color)
        bd.rectangle([bcx + 1, bcy - 3, bcx + 4, bcy + 1], outline=num_color)
        bd.line([(bcx + 1, bcy - 1), (bcx + 4, bcy - 1)], fill=num_color)
    elif weight_text == "64":
        bd.line([(bcx - 4, bcy - 3), (bcx - 1, bcy - 3)], fill=num_color)
        bd.line([(bcx - 4, bcy - 3), (bcx - 4, bcy + 1)], fill=num_color)
        bd.rectangle([bcx - 4, bcy - 1, bx - 1 if False else bcx - 1, bcy + 1], outline=num_color)
        bd.line([(bcx + 1, bcy - 3), (bcx + 1, bcy - 1)], fill=num_color)
        bd.line([(bcx + 1, bcy - 1), (bcx + 4, bcy - 1)], fill=num_color)
        bd.line([(bcx + 4, bcy - 3), (bcx + 4, bcy + 1)], fill=num_color)
    elif weight_text == "100":
        bd.line([(bcx - 5, bcy - 3), (bcx - 5, bcy + 1)], fill=num_color)
        bd.rectangle([bcx - 3, bcy - 3, bcx - 1, bcy + 1], outline=num_color)
        bd.rectangle([bcx + 1, bcy - 3, bcx + 3, bcy + 1], outline=num_color)

    # Spikes
    spike_color = (130, 145, 160, 255)
    spike_tip = (200, 215, 230, 255)
    if is_gold:
        spike_color = (255, 220, 90, 255)
        spike_tip = (255, 255, 220, 255)
    elif is_fire:
        spike_color = (245, 158, 11, 255)
        spike_tip = (255, 240, 100, 255)
    elif is_void:
        spike_color = (192, 132, 252, 255)
        spike_tip = (0, 245, 140, 255)

    bd.polygon([(bcx + br, bcy - 2), (bcx + br + 4, bcy), (bcx + br, bcy + 2)], fill=spike_color, outline=OUTLINE)
    bd.polygon([(bcx + 6, bcy + 8), (bcx + 10, bcy + 12), (bcx + 8, bcy + 6)], fill=spike_color, outline=OUTLINE)
    bd.polygon([(bcx - 2, bcy + br + 1), (bcx, bcy + br + 5), (bcx + 2, bcy + br + 1)], fill=spike_color, outline=OUTLINE)
    bd.polygon([(bcx - 8, bcy + 6), (bcx - 11, bcy + 11), (bcx - 6, bcy + 8)], fill=spike_color, outline=OUTLINE)
    bd.polygon([(bcx - br, bcy - 2), (bcx - br - 4, bcy), (bcx - br, bcy + 2)], fill=spike_color, outline=OUTLINE)
    bd.polygon([(bcx + 6, bcy - 7), (bcx + 11, bcy - 10), (bcx + 8, bcy - 5)], fill=spike_color, outline=OUTLINE)
    
    # Rotate bell by 35 degrees clockwise (resample=NEAREST for crisp pixels)
    rot_bell = bell_img.rotate(-35, resample=Image.Resampling.NEAREST, expand=True)
    
    # Paste rotated bell onto img
    # Anchor top of rotated bell to link 3 at (30, 28)
    bx_pos = 14
    by_pos = 16
    img.paste(rot_bell, (bx_pos, by_pos), rot_bell)
    
    return img

ms = draw_gravity_morningstar("32")
ms.save("work/gravity_test.png")
print("Saved work/gravity_test.png")
