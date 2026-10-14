from PIL import Image, ImageDraw

W, H = 64, 52

def draw_grip_hanging_morningstar(weight_text="32", color_band=(220, 38, 38, 255), bell_color=(45, 52, 62, 255), is_gold=False, is_fire=False, is_void=False):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    OUTLINE = (14, 16, 20, 255)
    
    # 1. HAFT / HANDLE (Held in hand, x: 2..22, centered at y=12)
    # Pommel cap
    d.ellipse([1, 9, 6, 16], fill=(70, 80, 95, 255) if not is_gold else (244, 180, 26, 255), outline=OUTLINE)
    if is_gold:
        d.point([(3, 12)], fill=(56, 182, 255, 255))
    elif is_fire:
        d.point([(3, 12)], fill=(245, 158, 11, 255))
    elif is_void:
        d.point([(3, 12)], fill=(0, 245, 140, 255))
        
    # Grip (x: 6..21, y: 10..14)
    d.line([(6, 10), (21, 10)], fill=OUTLINE)
    d.line([(6, 14), (21, 14)], fill=OUTLINE)
    haft_color = (60, 42, 30, 255) if not is_gold else (220, 210, 190, 255)
    wrap_color = (120, 85, 60, 255) if not is_gold else (244, 180, 26, 255)
    for x in range(6, 21, 2):
        d.line([(x, 11), (x+1, 13)], fill=haft_color)
        d.point([(x, 11)], fill=wrap_color)
        
    # Steel ferrule collar at the tip of the haft (x: 20..23, y: 9..15)
    ferrule_color = (130, 145, 160, 255) if not is_gold else (244, 180, 26, 255)
    d.rectangle([20, 9, 23, 15], fill=ferrule_color, outline=OUTLINE)
    # Eyelet anchor ring swiveling downwards
    d.ellipse([22, 10, 26, 16], outline=OUTLINE, width=1)
    
    # 2. HANGING CHAIN LINKS (Draping down from ferrule at (24, 13))
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
        
    # Link 1: (24, 13) -> (27, 18)
    d.ellipse([24, 12, 28, 18], fill=chain_color, outline=OUTLINE)
    d.point([(26, 15)], fill=(0, 0, 0, 0))
    
    # Link 2: curving down (27, 17) -> (31, 24)
    d.ellipse([27, 17, 32, 24], fill=chain_color, outline=OUTLINE)
    d.point([(29, 20)], fill=(0, 0, 0, 0))
    
    # Link 3: dropping down (30, 23) -> (34, 30)
    d.ellipse([30, 23, 34, 30], fill=chain_color, outline=OUTLINE)
    d.point([(32, 26)], fill=(0, 0, 0, 0))
    
    # Link 4: connecting into the kettlebell handle (32, 28) -> (36, 34)
    d.ellipse([32, 28, 36, 34], fill=chain_color, outline=OUTLINE)
    d.point([(34, 31)], fill=(0, 0, 0, 0))
    
    if chain_glow:
        d.point([(26, 14), (29, 19), (32, 25), (34, 30)], fill=chain_glow)
        
    # 3. KETTLEBELL HEAD HANGING DOWN
    # The chain connects to the kettlebell's arched handle at (34, 32)!
    # Handle arch (x: 27..41, y: 30..38)
    d.rounded_rectangle([28, 30, 40, 38], radius=3, fill=bell_color, outline=OUTLINE, width=2)
    d.rounded_rectangle([31, 33, 37, 37], radius=2, fill=(0, 0, 0, 0), outline=OUTLINE, width=1)
    # Competition horn bands
    d.rectangle([28, 33, 30, 36], fill=color_band, outline=OUTLINE)
    d.rectangle([38, 33, 40, 36], fill=color_band, outline=OUTLINE)
    
    # Round bell sphere (centered at x=34, y=41, radius=9)
    bx, by, r = 34, 41, 9
    d.ellipse([bx - r, by - r, bx + r, by + r], fill=bell_color, outline=OUTLINE, width=2)
    # Flat base at the bottom
    d.polygon([(bx - 4, by + r - 1), (bx + 4, by + r - 1), (bx + 3, by + r + 1), (bx - 3, by + r + 1)], fill=bell_color, outline=OUTLINE)
    
    # Spherical 3D shading
    d.arc([bx - r + 1, by - r + 1, bx + r - 1, by + r - 1], 45, 160, fill=(20, 24, 28, 255) if not is_gold else (160, 100, 15, 255), width=2)
    d.arc([bx - r + 1, by - r + 1, bx + r - 1, by + r - 1], 190, 310, fill=(85, 98, 115, 255) if not is_gold else (255, 225, 100, 255), width=2)
    d.point([(bx - 3, by - 4), (bx - 2, by - 5)], fill=(200, 215, 230, 255) if not is_gold else (255, 255, 230, 255))
    
    # Weight badge
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

    d.polygon([(bx + r, by - 2), (bx + r + 4, by), (bx + r, by + 2)], fill=spike_color, outline=OUTLINE)
    d.point([(bx + r + 3, by)], fill=spike_tip)
    d.polygon([(bx + 6, by + 6), (bx + 10, by + 10), (bx + 7, by + 5)], fill=spike_color, outline=OUTLINE)
    d.point([(bx + 9, by + 9)], fill=spike_tip)
    d.polygon([(bx - 2, by + r + 1), (bx, by + r + 5), (bx + 2, by + r + 1)], fill=spike_color, outline=OUTLINE)
    d.point([(bx, by + r + 4)], fill=spike_tip)
    d.polygon([(bx - 7, by + 5), (bx - 10, by + 10), (bx - 6, by + 6)], fill=spike_color, outline=OUTLINE)
    d.point([(bx - 9, by + 9)], fill=spike_tip)
    d.polygon([(bx - r, by - 2), (bx - r - 4, by), (bx - r, by + 2)], fill=spike_color, outline=OUTLINE)
    d.point([(bx - r - 3, by)], fill=spike_tip)
    d.polygon([(bx + 5, by - 6), (bx + 9, by - 9), (bx + 7, by - 4)], fill=spike_color, outline=OUTLINE)
    d.point([(bx + 8, by - 8)], fill=spike_tip)

    return img

preview = Image.new("RGBA", (W * 4 + 20, H + 10), (15, 14, 23, 255))
ms1 = draw_grip_hanging_morningstar("32", color_band=(220, 38, 38, 255), bell_color=(45, 52, 62, 255))
ms2 = draw_grip_hanging_morningstar("48", color_band=(56, 182, 255, 255), bell_color=(235, 175, 25, 255), is_gold=True)
ms3 = draw_grip_hanging_morningstar("64", color_band=(245, 158, 11, 255), bell_color=(165, 28, 30, 255), is_fire=True)
ms4 = draw_grip_hanging_morningstar("100", color_band=(0, 245, 140, 255), bell_color=(85, 25, 135, 255), is_void=True)

preview.paste(ms1, (5, 5), ms1)
preview.paste(ms2, (W + 10, 5), ms2)
preview.paste(ms3, (W * 2 + 15, 5), ms3)
preview.paste(ms4, (W * 3 + 20, 5), ms4)

preview.save("work/grip_hang_preview.png")
print("Saved work/grip_hang_preview.png")
