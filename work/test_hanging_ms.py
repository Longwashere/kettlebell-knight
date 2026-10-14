from PIL import Image, ImageDraw

W, H = 56, 56

def draw_hanging_morningstar(weight_text="32", color_band=(220, 38, 38, 255), bell_color=(45, 52, 62, 255), is_gold=False, is_fire=False, is_void=False):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    OUTLINE = (14, 16, 20, 255)
    
    # 1. HAFT / HANDLE (Held in hand horizontally/slight angle, x: 2..24, y: 10..16)
    # Pommel cap
    d.ellipse([1, 9, 6, 17], fill=(70, 80, 95, 255) if not is_gold else (244, 180, 26, 255), outline=OUTLINE)
    if is_gold:
        d.point([(3, 13)], fill=(56, 182, 255, 255))
    elif is_fire:
        d.point([(3, 13)], fill=(245, 158, 11, 255))
    elif is_void:
        d.point([(3, 13)], fill=(0, 245, 140, 255))
        
    # Haft grip
    d.line([(6, 11), (22, 11)], fill=OUTLINE)
    d.line([(6, 15), (22, 15)], fill=OUTLINE)
    haft_color = (60, 42, 30, 255) if not is_gold else (220, 210, 190, 255)
    wrap_color = (120, 85, 60, 255) if not is_gold else (244, 180, 26, 255)
    for x in range(6, 22, 2):
        d.line([(x, 12), (x+1, 14)], fill=haft_color)
        d.point([(x, 12)], fill=wrap_color)
        
    # Steel ferrule & swivel eyelet (x: 21..26, y: 10..16)
    ferrule_color = (130, 145, 160, 255) if not is_gold else (244, 180, 26, 255)
    d.rectangle([21, 10, 24, 16], fill=ferrule_color, outline=OUTLINE)
    # Swivel ring pointing downwards/forward
    d.ellipse([23, 12, 27, 18], outline=OUTLINE, width=1)
    
    # 2. HANGING CHAIN LINKS (Dangling down with gravity from tip of haft)
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
        
    # Link 1: arcing down from ring (x: 25..29, y: 16..22)
    d.ellipse([25, 16, 29, 22], fill=chain_color, outline=OUTLINE)
    d.point([(27, 19)], fill=(0, 0, 0, 0))
    
    # Link 2: vertical oval falling straight down (x: 27..31, y: 21..28)
    d.ellipse([27, 21, 31, 28], fill=chain_color, outline=OUTLINE)
    d.point([(29, 24)], fill=(0, 0, 0, 0))
    
    # Link 3: interlocking into kettlebell handle (x: 29..33, y: 26..33)
    d.ellipse([29, 26, 33, 33], fill=chain_color, outline=OUTLINE)
    d.point([(31, 29)], fill=(0, 0, 0, 0))
    
    if chain_glow:
        d.point([(27, 18), (29, 23), (31, 28)], fill=chain_glow)
        
    # 3. KETTLEBELL HEAD HANGING DOWN (Centered at x: 33, y: 41)
    # Handle on top of bell (x: 26..40, y: 30..39)
    d.rounded_rectangle([27, 29, 39, 39], radius=3, fill=bell_color, outline=OUTLINE, width=2)
    d.rounded_rectangle([30, 32, 36, 38], radius=2, fill=(0, 0, 0, 0), outline=OUTLINE, width=1)
    # Competition color horn bands
    d.rectangle([27, 33, 29, 36], fill=color_band, outline=OUTLINE)
    d.rectangle([37, 33, 39, 36], fill=color_band, outline=OUTLINE)
    
    # Round bell sphere (radius 10 -> [23, 33, 43, 53])
    bx, by = 33, 43
    r = 10
    d.ellipse([bx - r, by - r, bx + r, by + r], fill=bell_color, outline=OUTLINE, width=2)
    # Flat base at the bottom
    d.polygon([(bx - 5, by + r - 1), (bx + 5, by + r - 1), (bx + 4, by + r + 1), (bx - 4, by + r + 1)], fill=bell_color, outline=OUTLINE)
    
    # 3D spherical shading
    d.arc([bx - r + 1, by - r + 1, bx + r - 1, by + r - 1], 45, 160, fill=(20, 24, 28, 255) if not is_gold else (160, 100, 15, 255), width=2)
    d.arc([bx - r + 1, by - r + 1, bx + r - 1, by + r - 1], 190, 310, fill=(85, 98, 115, 255) if not is_gold else (255, 225, 100, 255), width=2)
    d.point([(bx - 4, by - 5), (bx - 3, by - 6)], fill=(200, 215, 230, 255) if not is_gold else (255, 255, 230, 255))
    
    # Recessed circular weight badge
    d.ellipse([bx - 6, by - 6, bx + 6, by + 6], fill=(28, 33, 40, 255) if not is_gold else (200, 135, 20, 255), outline=OUTLINE, width=1)
    
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
        # 4
        d.line([(bx - 4, by - 3), (bx - 4, by - 1)], fill=num_color)
        d.line([(bx - 4, by - 1), (bx - 1, by - 1)], fill=num_color)
        d.line([(bx - 1, by - 3), (bx - 1, by + 1)], fill=num_color)
        # 8
        d.rectangle([bx + 1, by - 3, bx + 4, by + 1], outline=num_color)
        d.line([(bx + 1, by - 1), (bx + 4, by - 1)], fill=num_color)
    elif weight_text == "64":
        # 6
        d.line([(bx - 4, by - 3), (bx - 1, by - 3)], fill=num_color)
        d.line([(bx - 4, by - 3), (bx - 4, by + 1)], fill=num_color)
        d.rectangle([bx - 4, by - 1, bx - 1, by + 1], outline=num_color)
        # 4
        d.line([(bx + 1, by - 3), (bx + 1, by - 1)], fill=num_color)
        d.line([(bx + 1, by - 1), (bx + 4, by - 1)], fill=num_color)
        d.line([(bx + 4, by - 3), (bx + 4, by + 1)], fill=num_color)
    elif weight_text == "100":
        # 1 0 0
        d.line([(bx - 5, by - 3), (bx - 5, by + 1)], fill=num_color)
        d.rectangle([bx - 3, by - 3, bx - 1, by + 1], outline=num_color)
        d.rectangle([bx + 1, by - 3, bx + 3, by + 1], outline=num_color)

    # 4. BRUTAL MORNINGSTAR SPIKES (radiating outward from the heavy ball)
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

    # Spikes at 6 points: Right, Down-Right, Down, Down-Left, Left, Up-Right
    # Right spike
    d.polygon([(bx + r, by - 2), (bx + r + 4, by), (bx + r, by + 2)], fill=spike_color, outline=OUTLINE)
    d.point([(bx + r + 3, by)], fill=spike_tip)
    # Down-Right spike
    d.polygon([(bx + 6, by + 8), (bx + 10, by + 12), (bx + 8, by + 6)], fill=spike_color, outline=OUTLINE)
    d.point([(bx + 9, by + 11)], fill=spike_tip)
    # Down spike
    d.polygon([(bx - 2, by + r + 1), (bx, by + r + 5), (bx + 2, by + r + 1)], fill=spike_color, outline=OUTLINE)
    d.point([(bx, by + r + 4)], fill=spike_tip)
    # Down-Left spike
    d.polygon([(bx - 8, by + 6), (bx - 11, by + 11), (bx - 6, by + 8)], fill=spike_color, outline=OUTLINE)
    d.point([(bx - 10, by + 10)], fill=spike_tip)
    # Left spike
    d.polygon([(bx - r, by - 2), (bx - r - 4, by), (bx - r, by + 2)], fill=spike_color, outline=OUTLINE)
    d.point([(bx - r - 3, by)], fill=spike_tip)
    # Up-Right spike
    d.polygon([(bx + 6, by - 7), (bx + 11, by - 10), (bx + 8, by - 5)], fill=spike_color, outline=OUTLINE)
    d.point([(bx + 10, by - 9)], fill=spike_tip)

    return img

preview = Image.new("RGBA", (W * 4 + 20, H + 10), (15, 14, 23, 255))
ms1 = draw_hanging_morningstar("32", color_band=(220, 38, 38, 255), bell_color=(45, 52, 62, 255))
ms2 = draw_hanging_morningstar("48", color_band=(56, 182, 255, 255), bell_color=(235, 175, 25, 255), is_gold=True)
ms3 = draw_hanging_morningstar("64", color_band=(245, 158, 11, 255), bell_color=(165, 28, 30, 255), is_fire=True)
ms4 = draw_hanging_morningstar("100", color_band=(0, 245, 140, 255), bell_color=(85, 25, 135, 255), is_void=True)

preview.paste(ms1, (5, 5), ms1)
preview.paste(ms2, (W + 10, 5), ms2)
preview.paste(ms3, (W * 2 + 15, 5), ms3)
preview.paste(ms4, (W * 3 + 20, 5), ms4)

preview.save("work/hanging_ms_preview.png")
print("Saved work/hanging_ms_preview.png")
