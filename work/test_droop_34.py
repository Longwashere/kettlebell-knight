from PIL import Image, ImageDraw

W, H = 64, 34

def draw_droop_34_morningstar(weight_text="32", color_band=(220, 38, 38, 255), bell_color=(45, 52, 62, 255), is_gold=False, is_fire=False, is_void=False):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    OUTLINE = (14, 16, 20, 255)
    
    # 1. HAFT / HANDLE (Held in hand, EXACT SAME grip position: x: 2..20, centered at y: 12..14)
    # Pommel cap at x: 1..6, y: 9..17
    d.ellipse([1, 9, 6, 17], fill=(70, 80, 95, 255) if not is_gold else (244, 180, 26, 255), outline=OUTLINE)
    if is_gold:
        d.point([(3, 13)], fill=(56, 182, 255, 255))
    elif is_fire:
        d.point([(3, 13)], fill=(245, 158, 11, 255))
    elif is_void:
        d.point([(3, 13)], fill=(0, 245, 140, 255))
        
    # Haft grip (x: 6..20, y: 11..15)
    d.line([(6, 11), (20, 11)], fill=OUTLINE)
    d.line([(6, 15), (20, 15)], fill=OUTLINE)
    haft_color = (60, 42, 30, 255) if not is_gold else (220, 210, 190, 255)
    wrap_color = (120, 85, 60, 255) if not is_gold else (244, 180, 26, 255)
    for x in range(6, 21, 2):
        d.line([(x, 12), (x+1, 14)], fill=haft_color)
        d.point([(x, 12)], fill=wrap_color)
        
    # Steel ferrule collar & anchor ring at the tip of the haft (x: 19..23, y: 10..16)
    ferrule_color = (130, 145, 160, 255) if not is_gold else (244, 180, 26, 255)
    d.rectangle([19, 10, 22, 16], fill=ferrule_color, outline=OUTLINE)
    # Eyelet ring swiveling down
    d.ellipse([21, 11, 25, 17], outline=OUTLINE, width=1)
    
    # 2. DROOPING CHAIN LINKS (Drooping downwards with gravity from (23, 13) to (31, 23))
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
        
    # Link 1: curving down from eyelet (23, 13) -> (27, 17)
    d.ellipse([23, 13, 27, 18], fill=chain_color, outline=OUTLINE)
    d.point([(25, 15)], fill=(0, 0, 0, 0))
    
    # Link 2: dropping down (26, 16) -> (30, 22)
    d.ellipse([26, 16, 30, 22], fill=chain_color, outline=OUTLINE)
    d.point([(28, 19)], fill=(0, 0, 0, 0))
    
    # Link 3: connecting into the kettlebell handle (29, 20) -> (33, 25)
    d.ellipse([29, 20, 33, 25], fill=chain_color, outline=OUTLINE)
    d.point([(31, 22)], fill=(0, 0, 0, 0))
    
    if chain_glow:
        d.point([(25, 14), (28, 18), (31, 22)], fill=chain_glow)
        
    # 3. KETTLEBELL HEAD HANGING DOWNWARD
    # Arched handle (x: 29..39, y: 19..26)
    d.rounded_rectangle([30, 19, 38, 26], radius=2, fill=bell_color, outline=OUTLINE, width=1)
    d.rounded_rectangle([32, 21, 36, 25], radius=1, fill=(0, 0, 0, 0), outline=OUTLINE, width=1)
    # Competition horn bands
    d.rectangle([30, 21, 31, 24], fill=color_band)
    d.rectangle([37, 21, 38, 24], fill=color_band)
    
    # Bell sphere (centered at x=44, y=23, radius=8 -> [36, 15, 52, 31])
    bx, by, r = 44, 23, 8
    d.ellipse([bx - r, by - r, bx + r, by + r], fill=bell_color, outline=OUTLINE, width=2)
    # Flat base on the bottom-right
    d.polygon([(bx + r - 2, by + 4), (bx + r, by + 2), (bx + r - 1, by + 6), (bx + r - 3, by + 6)], fill=bell_color, outline=OUTLINE)
    
    # 3D spherical shading
    d.arc([bx - r + 1, by - r + 1, bx + r - 1, by + r - 1], 45, 160, fill=(20, 24, 28, 255) if not is_gold else (160, 100, 15, 255), width=2)
    d.arc([bx - r + 1, by - r + 1, bx + r - 1, by + r - 1], 190, 310, fill=(85, 98, 115, 255) if not is_gold else (255, 225, 100, 255), width=2)
    d.point([(bx - 3, by - 3), (bx - 2, by - 4)], fill=(200, 215, 230, 255) if not is_gold else (255, 255, 230, 255))
    
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

    # Spikes around the bell
    d.polygon([(bx + r, by - 2), (bx + r + 3, by), (bx + r, by + 2)], fill=spike_color, outline=OUTLINE)
    d.polygon([(bx + 5, by + 5), (bx + 8, by + 8), (bx + 6, by + 4)], fill=spike_color, outline=OUTLINE)
    d.polygon([(bx - 2, by + r), (bx, by + r + 3), (bx + 2, by + r)], fill=spike_color, outline=OUTLINE)
    d.polygon([(bx - 5, by + 5), (bx - 8, by + 8), (bx - 6, by + 4)], fill=spike_color, outline=OUTLINE)
    d.polygon([(bx - r, by - 2), (bx - r - 3, by), (bx - r, by + 2)], fill=spike_color, outline=OUTLINE)
    d.polygon([(bx + 4, by - 6), (bx + 7, by - 8), (bx + 6, by - 4)], fill=spike_color, outline=OUTLINE)

    return img

preview = Image.new("RGBA", (W * 4 + 20, H + 10), (15, 14, 23, 255))
ms1 = draw_droop_34_morningstar("32", color_band=(220, 38, 38, 255), bell_color=(45, 52, 62, 255))
ms2 = draw_droop_34_morningstar("48", color_band=(56, 182, 255, 255), bell_color=(235, 175, 25, 255), is_gold=True)
ms3 = draw_droop_34_morningstar("64", color_band=(245, 158, 11, 255), bell_color=(165, 28, 30, 255), is_fire=True)
ms4 = draw_droop_34_morningstar("100", color_band=(0, 245, 140, 255), bell_color=(85, 25, 135, 255), is_void=True)

preview.paste(ms1, (5, 5), ms1)
preview.paste(ms2, (W + 10, 5), ms2)
preview.paste(ms3, (W * 2 + 15, 5), ms3)
preview.paste(ms4, (W * 3 + 20, 5), ms4)

preview.save("work/droop_34_preview.png")
print("Saved work/droop_34_preview.png")
