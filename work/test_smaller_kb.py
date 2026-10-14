from PIL import Image, ImageDraw

W, H = 40, 40

def draw_compact_kettlebell(weight_text="32", color_band=(220, 38, 38, 255), bell_color=(42, 48, 56, 255), is_gold=False, is_fire=False, is_void=False):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    OUTLINE = (14, 16, 20, 255)
    
    # 1. TOP HANDLE & HORNS (x=11..29, y=2..17)
    # Outer handle arch
    d.rounded_rectangle([11, 2, 29, 17], radius=5, fill=bell_color, outline=OUTLINE, width=2)
    # Inner cutout window
    d.rounded_rectangle([15, 6, 25, 17], radius=3, fill=(0, 0, 0, 0), outline=OUTLINE, width=1)
    
    # Color-coded horn bands
    d.rectangle([11, 9, 14, 13], fill=color_band, outline=OUTLINE)
    d.rectangle([26, 9, 29, 13], fill=color_band, outline=OUTLINE)
    
    # Top grip highlight
    d.line([(16, 3), (24, 3)], fill=(130, 145, 160, 255) if not is_gold else (255, 245, 190, 255))
    
    # 2. SPHERICAL BELL BODY (Center at x=20, y=25, radius=12 -> [8, 13, 32, 37])
    d.ellipse([8, 13, 32, 37], fill=bell_color, outline=OUTLINE, width=2)
    # Flat resting base
    d.polygon([(14, 35), (26, 35), (25, 37), (15, 37)], fill=bell_color, outline=OUTLINE)
    
    # 3D Shading
    d.arc([9, 14, 31, 36], 0, 120, fill=(20, 24, 28, 255) if not is_gold else (160, 100, 15, 255), width=2)
    d.arc([10, 15, 30, 35], 140, 270, fill=(85, 98, 115, 255) if not is_gold else (255, 225, 100, 255), width=2)
    d.point([(13, 17), (14, 16)], fill=(200, 215, 230, 255) if not is_gold else (255, 255, 230, 255))
    
    # 3. RECESSED CIRCULAR BADGE
    d.ellipse([13, 18, 27, 32], fill=(28, 33, 40, 255) if not is_gold else (200, 135, 20, 255), outline=OUTLINE, width=1)
    d.ellipse([14, 19, 26, 31], fill=(20, 24, 30, 255) if not is_gold else (175, 110, 15, 255))
    
    # STAMPED WEIGHT TEXT (Clear 5px digits)
    num_color = (255, 255, 255, 255) if not is_gold else (255, 250, 200, 255)
    sub_color = color_band
    
    if weight_text == "32":
        # 3
        d.line([(16, 22), (19, 22)], fill=num_color)
        d.line([(19, 22), (19, 24)], fill=num_color)
        d.line([(17, 24), (19, 24)], fill=num_color)
        d.line([(19, 24), (19, 26)], fill=num_color)
        d.line([(16, 26), (19, 26)], fill=num_color)
        # 2
        d.line([(21, 22), (24, 22)], fill=num_color)
        d.line([(24, 22), (24, 24)], fill=num_color)
        d.line([(21, 24), (24, 24)], fill=num_color)
        d.line([(21, 24), (21, 26)], fill=num_color)
        d.line([(21, 26), (24, 26)], fill=num_color)
    elif weight_text == "48":
        # 4
        d.line([(16, 22), (16, 24)], fill=num_color)
        d.line([(16, 24), (19, 24)], fill=num_color)
        d.line([(19, 22), (19, 26)], fill=num_color)
        # 8
        d.rectangle([21, 22, 24, 26], outline=num_color)
        d.line([(21, 24), (24, 24)], fill=num_color)
    elif weight_text == "64":
        # 6
        d.line([(16, 22), (19, 22)], fill=num_color)
        d.line([(16, 22), (16, 26)], fill=num_color)
        d.line([(16, 26), (19, 26)], fill=num_color)
        d.line([(19, 24), (19, 26)], fill=num_color)
        d.line([(16, 24), (19, 24)], fill=num_color)
        # 4
        d.line([(21, 22), (21, 24)], fill=num_color)
        d.line([(21, 24), (24, 24)], fill=num_color)
        d.line([(24, 22), (24, 26)], fill=num_color)
    elif weight_text == "100":
        # 1
        d.line([(16, 22), (16, 26)], fill=num_color)
        # 0
        d.rectangle([18, 22, 20, 26], outline=num_color)
        # 0
        d.rectangle([22, 22, 24, 26], outline=num_color)
        
    # "KG" text
    d.point([(18, 28), (18, 29), (19, 28), (20, 29)], fill=sub_color)
    d.point([(21, 28), (22, 28), (21, 29), (23, 29)], fill=sub_color)
    
    # 4. BOTTOM WEAPON STUDS
    if is_void:
        d.polygon([(13, 36), (10, 39), (16, 37)], fill=(192, 132, 252, 255), outline=OUTLINE)
        d.polygon([(27, 36), (30, 39), (24, 37)], fill=(192, 132, 252, 255), outline=OUTLINE)
        d.polygon([(19, 36), (20, 39), (21, 36)], fill=(0, 245, 140, 255), outline=OUTLINE)
    elif is_fire:
        d.polygon([(12, 35), (8, 38), (15, 36)], fill=(245, 158, 11, 255), outline=OUTLINE)
        d.polygon([(28, 35), (32, 38), (25, 36)], fill=(245, 158, 11, 255), outline=OUTLINE)
        d.polygon([(19, 36), (20, 39), (21, 36)], fill=(255, 230, 50, 255), outline=OUTLINE)
    elif is_gold:
        d.polygon([(13, 35), (10, 38), (16, 36)], fill=(255, 240, 150, 255), outline=OUTLINE)
        d.polygon([(27, 35), (30, 38), (24, 36)], fill=(255, 240, 150, 255), outline=OUTLINE)
        d.polygon([(19, 36), (20, 39), (21, 36)], fill=(56, 182, 255, 255), outline=OUTLINE)
    else:
        d.polygon([(13, 35), (10, 38), (15, 36)], fill=(160, 175, 190, 255), outline=OUTLINE)
        d.polygon([(27, 35), (30, 38), (25, 36)], fill=(160, 175, 190, 255), outline=OUTLINE)
        d.polygon([(19, 36), (20, 38), (21, 36)], fill=(220, 230, 240, 255), outline=OUTLINE)
        
    return img

i = draw_compact_kettlebell("32", color_band=(220, 38, 38, 255), bell_color=(45, 52, 62, 255))
e = draw_compact_kettlebell("48", color_band=(56, 182, 255, 255), bell_color=(235, 175, 25, 255), is_gold=True)
d = draw_compact_kettlebell("64", color_band=(245, 158, 11, 255), bell_color=(165, 28, 30, 255), is_fire=True)
v = draw_compact_kettlebell("100", color_band=(0, 245, 140, 255), bell_color=(85, 25, 135, 255), is_void=True)

comp = Image.new("RGBA", (W * 4 + 30, H + 10), (20, 18, 25, 255))
comp.paste(i, (5, 5), i)
comp.paste(e, (W + 10, 5), e)
comp.paste(d, (W * 2 + 15, 5), d)
comp.paste(v, (W * 3 + 20, 5), v)
comp.save('work/compact_kbs.png')
print("Compact 40x40 kettlebells generated!")
