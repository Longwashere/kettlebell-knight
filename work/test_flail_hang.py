import math
from PIL import Image, ImageDraw

W, H = 58, 58

def draw_flail_morningstar(weight_text="32", color_band=(220, 38, 38, 255), bell_color=(45, 52, 62, 255), is_gold=False, is_fire=False, is_void=False):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    OUTLINE = (14, 16, 20, 255)
    
    # 1. HAFT / HANDLE (Held firmly in fist, pointing along +X at y=12)
    # Pommel cap
    d.ellipse([1, 9, 6, 16], fill=(70, 80, 95, 255) if not is_gold else (244, 180, 26, 255), outline=OUTLINE)
    if is_gold:
        d.point([(3, 12)], fill=(56, 182, 255, 255))
    elif is_fire:
        d.point([(3, 12)], fill=(245, 158, 11, 255))
    elif is_void:
        d.point([(3, 12)], fill=(0, 245, 140, 255))
        
    # Grip (x: 6..20, y: 10..14)
    d.line([(6, 10), (20, 10)], fill=OUTLINE)
    d.line([(6, 14), (20, 14)], fill=OUTLINE)
    haft_color = (60, 42, 30, 255) if not is_gold else (220, 210, 190, 255)
    wrap_color = (120, 85, 60, 255) if not is_gold else (244, 180, 26, 255)
    for x in range(6, 20, 2):
        d.line([(x, 11), (x+1, 13)], fill=haft_color)
        d.point([(x, 11)], fill=wrap_color)
        
    # Steel collar ferrule & heavy anchor ring (x: 19..24, y: 9..15)
    ferrule_color = (130, 145, 160, 255) if not is_gold else (244, 180, 26, 255)
    d.rectangle([19, 9, 22, 15], fill=ferrule_color, outline=OUTLINE)
    # Eyelet ring swiveling down
    d.ellipse([21, 10, 25, 16], outline=OUTLINE, width=1)
    
    # 2. HEAVY IRON CHAIN (Drooping downwards with gravity!)
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
        
    # Link 1: (23, 14) -> (27, 19)
    d.ellipse([23, 14, 27, 20], fill=chain_color, outline=OUTLINE)
    d.point([(25, 17)], fill=(0, 0, 0, 0))
    
    # Link 2: dropping down (25, 19) -> (29, 26)
    d.ellipse([25, 19, 29, 26], fill=chain_color, outline=OUTLINE)
    d.point([(27, 22)], fill=(0, 0, 0, 0))
    
    # Link 3: swinging down (27, 25) -> (31, 32)
    d.ellipse([27, 25, 31, 32], fill=chain_color, outline=OUTLINE)
    d.point([(29, 28)], fill=(0, 0, 0, 0))
    
    # Link 4: connecting into the kettlebell handle (28, 30) -> (32, 37)
    d.ellipse([28, 30, 32, 37], fill=chain_color, outline=OUTLINE)
    d.point([(30, 33)], fill=(0, 0, 0, 0))
    
    if chain_glow:
        d.point([(25, 16), (27, 21), (29, 27), (30, 32)], fill=chain_glow)
        
    # 3. KETTLEBELL HEAD HANGING FROM CHAIN
    # Handle on top of the hanging bell (x: 23..37, y: 33..41)
    d.rounded_rectangle([24, 33, 36, 41], radius=3, fill=bell_color, outline=OUTLINE, width=2)
    d.rounded_rectangle([27, 36, 33, 40], radius=2, fill=(0, 0, 0, 0), outline=OUTLINE, width=1)
    # Competition horn bands
    d.rectangle([24, 36, 26, 39], fill=color_band, outline=OUTLINE)
    d.rectangle([34, 36, 36, 39], fill=color_band, outline=OUTLINE)
    
    # Round bell sphere (centered at x=30, y=45, radius=9)
    bx, by, r = 30, 45, 9
    d.ellipse([bx - r, by - r, bx + r, by + r], fill=bell_color, outline=OUTLINE, width=2)
    # Flat base facing the floor
    d.polygon([(bx - 4, by + r - 1), (bx + 4, by + r - 1), (bx + 3, by + r + 1), (bx - 3, by + r + 1)], fill=bell_color, outline=OUTLINE)
    
    # 3D spherical shading
    d.arc([bx - r + 1, by - r + 1, bx + r - 1, by + r - 1], 45, 160, fill=(20, 24, 28, 255) if not is_gold else (160, 100, 15, 255), width=2)
    d.arc([bx - r + 1, by - r + 1, bx + r - 1, by + r - 1], 190, 310, fill=(85, 98, 115, 255) if not is_gold else (255, 225, 100, 255), width=2)
    d.point([(bx - 3, by - 4), (bx - 2, by - 5)], fill=(200, 215, 230, 255) if not is_gold else (255, 255, 230, 255))
    
    # Recessed circular weight badge
    d.ellipse([bx - 5, by - 5, bx + 5, by + 5], fill=(28, 33, 40, 255) if not is_gold else (200, 135, 20, 255), outline=OUTLINE, width=1)
    
    # Stamped weight text
    num_color = (255, 255, 255, 255) if not is_gold else (255, 250, 200, 255)
    if weight_text == "32":
        # 3
        d.line([(bx - 4, by - 3), (bx - 1, by - 3)], fill=num_color)
        d.line([(bx - 1, by - 3), (bx - 1, by - 1)], fill=num_color)
        d.line([(bx - 3, by - 1), (bx - 1, by - 1)], fill=num_color)
        d.line([(bx - 1, by - 1), (bx - 1, by + 1)], fill=num_color)
        d.line([(bx - 4, by + 1), (bx - 1, by + 1)], fill=num_color)
        # 2
        d.line([(bx + 1, by - 3), (bx + 4, by - 3)], fill=num_color)
        d.line([(bx + 4, by - 3), (bx + 4, by - 1)], fill=num_color)
        d.line([(bx + 1, by - 1), (bx + 4, by - 1)], fill=num_color)
        d.line([(bx + 1, by - 1), (bx + 1, by + 1)], fill=num_color)
        d.line([(bx + 1, by + 1), (bx + 4, by + 1)], fill=num_color)
    elif weight_text == "48":
        d.line([(bx - 4, by - 3), (bx - 4, by - 1)], fill=num_color)
        d.line([(bx - 4, by - 1), (bx - 1, by - 1)], fill=num_color)
        d.line([(bx - 1, by - 3), (bx - 1, by + 1)], fill=num_color)
        d.rectangle([bx + 1, by - 3, bx + 4, by + 1], outline=num_color)
        d.line([(bx + 1, by - 1), (bx + 4, by - 1)], fill=num_color)
    elif weight_text == "64":
        d.line([(bx - 4, by - 3), (bx - 1, by - 3)], fill=num_color)
        d.line([(bx - 4, by - 3), (bx - 4, by + 1)], fill=num_color)
        d.rectangle([bx - 4, by - 1, bx - 1, by + 1], outline=num_color)
        d.line([(bx + 1, by - 3), (bx + 1, by - 1)], fill=num_color)
        d.line([(bx + 1, by - 1), (bx + 4, by - 1)], fill=num_color)
        d.line([(bx + 4, by - 3), (bx + 4, by + 1)], fill=num_color)
    elif weight_text == "100":
        d.line([(bx - 5, by - 3), (bx - 5, by + 1)], fill=num_color)
        d.rectangle([bx - 3, by - 3, bx - 1, by + 1], outline=num_color)
        d.rectangle([bx + 1, by - 3, bx + 3, by + 1], outline=num_color)

    # 4. SPIKES
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

    # Right
    d.polygon([(bx + r, by - 2), (bx + r + 4, by), (bx + r, by + 2)], fill=spike_color, outline=OUTLINE)
    d.point([(bx + r + 3, by)], fill=spike_tip)
    # Down-Right
    d.polygon([(bx + 6, by + 6), (bx + 10, by + 10), (bx + 7, by + 5)], fill=spike_color, outline=OUTLINE)
    d.point([(bx + 9, by + 9)], fill=spike_tip)
    # Down (floor impact spike)
    d.polygon([(bx - 2, by + r + 1), (bx, by + r + 5), (bx + 2, by + r + 1)], fill=spike_color, outline=OUTLINE)
    d.point([(bx, by + r + 4)], fill=spike_tip)
    # Down-Left
    d.polygon([(bx - 7, by + 5), (bx - 10, by + 10), (bx - 6, by + 6)], fill=spike_color, outline=OUTLINE)
    d.point([(bx - 9, by + 9)], fill=spike_tip)
    # Left
    d.polygon([(bx - r, by - 2), (bx - r - 4, by), (bx - r, by + 2)], fill=spike_color, outline=OUTLINE)
    d.point([(bx - r - 3, by)], fill=spike_tip)
    # Up-Right
    d.polygon([(bx + 5, by - 6), (bx + 9, by - 9), (bx + 7, by - 4)], fill=spike_color, outline=OUTLINE)
    d.point([(bx + 8, by - 8)], fill=spike_tip)

    return img

preview = Image.new("RGBA", (W * 4 + 20, H + 10), (15, 14, 23, 255))
ms1 = draw_flail_morningstar("32", color_band=(220, 38, 38, 255), bell_color=(45, 52, 62, 255))
ms2 = draw_flail_morningstar("48", color_band=(56, 182, 255, 255), bell_color=(235, 175, 25, 255), is_gold=True)
ms3 = draw_flail_morningstar("64", color_band=(245, 158, 11, 255), bell_color=(165, 28, 30, 255), is_fire=True)
ms4 = draw_flail_morningstar("100", color_band=(0, 245, 140, 255), bell_color=(85, 25, 135, 255), is_void=True)

preview.paste(ms1, (5, 5), ms1)
preview.paste(ms2, (W + 10, 5), ms2)
preview.paste(ms3, (W * 2 + 15, 5), ms3)
preview.paste(ms4, (W * 3 + 20, 5), ms4)

preview.save("work/flail_ms_preview.png")
print("Saved work/flail_ms_preview.png")
