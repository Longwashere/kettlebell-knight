from PIL import Image, ImageDraw

W, H = 48, 48

def draw_proportional_kettlebell(weight_text="32", color_band=(220, 38, 38, 255), bell_color=(42, 48, 56, 255), is_gold=False, is_fire=False, is_void=False):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    OUTLINE = (14, 16, 20, 255)
    
    # 1. TOP HANDLE & HORNS
    # Outer handle arch (top bar at y=3..7, horns curve down to y=18)
    d.rounded_rectangle([13, 2, 35, 20], radius=6, fill=bell_color, outline=OUTLINE, width=2)
    # Inner cutout window
    d.rounded_rectangle([18, 7, 30, 20], radius=4, fill=(0, 0, 0, 0), outline=OUTLINE, width=1)
    
    # Color horn bands (Rogue / competition style)
    d.rectangle([13, 11, 17, 15], fill=color_band, outline=OUTLINE)
    d.rectangle([31, 11, 35, 15], fill=color_band, outline=OUTLINE)
    
    # Grip highlight on top bar
    d.line([(19, 4), (29, 4)], fill=(130, 145, 160, 255) if not is_gold else (255, 245, 190, 255))
    
    # 2. SPHERICAL BELL BODY
    # Main sphere (center at x=24, y=30, radius=14 -> box: [10, 16, 38, 44])
    d.ellipse([10, 16, 38, 44], fill=bell_color, outline=OUTLINE, width=2)
    # Flat resting base
    d.polygon([(16, 42), (32, 42), (30, 45), (18, 45)], fill=bell_color, outline=OUTLINE)
    
    # 3D Shading on sphere
    d.arc([11, 17, 37, 43], 0, 120, fill=(20, 24, 28, 255) if not is_gold else (160, 100, 15, 255), width=2)
    d.arc([12, 18, 36, 42], 140, 270, fill=(85, 98, 115, 255) if not is_gold else (255, 225, 100, 255), width=2)
    # Specular glint
    d.line([(15, 21), (18, 19)], fill=(200, 215, 230, 255) if not is_gold else (255, 255, 230, 255))
    d.point([(16, 22)], fill=(255, 255, 255, 255))
    
    # 3. RECESSED CIRCULAR BADGE
    d.ellipse([16, 23, 32, 39], fill=(28, 33, 40, 255) if not is_gold else (200, 135, 20, 255), outline=OUTLINE, width=1)
    d.ellipse([18, 25, 30, 37], fill=(20, 24, 30, 255) if not is_gold else (175, 110, 15, 255))
    
    # STAMPED WEIGHT TEXT
    num_color = (255, 255, 255, 255) if not is_gold else (255, 250, 200, 255)
    sub_color = color_band
    
    if weight_text == "32":
        # 3
        d.line([(20, 27), (23, 27)], fill=num_color)
        d.line([(23, 27), (23, 30)], fill=num_color)
        d.line([(21, 30), (23, 30)], fill=num_color)
        d.line([(23, 30), (23, 33)], fill=num_color)
        d.line([(20, 33), (23, 33)], fill=num_color)
        # 2
        d.line([(25, 27), (28, 27)], fill=num_color)
        d.line([(28, 27), (28, 30)], fill=num_color)
        d.line([(25, 30), (28, 30)], fill=num_color)
        d.line([(25, 30), (25, 33)], fill=num_color)
        d.line([(25, 33), (28, 33)], fill=num_color)
    elif weight_text == "48":
        # 4
        d.line([(20, 27), (20, 30)], fill=num_color)
        d.line([(20, 30), (23, 30)], fill=num_color)
        d.line([(23, 27), (23, 33)], fill=num_color)
        # 8
        d.rectangle([25, 27, 28, 33], outline=num_color)
        d.line([(25, 30), (28, 30)], fill=num_color)
    elif weight_text == "64":
        # 6
        d.line([(20, 27), (23, 27)], fill=num_color)
        d.line([(20, 27), (20, 33)], fill=num_color)
        d.line([(20, 33), (23, 33)], fill=num_color)
        d.line([(23, 30), (23, 33)], fill=num_color)
        d.line([(20, 30), (23, 30)], fill=num_color)
        # 4
        d.line([(25, 27), (25, 30)], fill=num_color)
        d.line([(25, 30), (28, 30)], fill=num_color)
        d.line([(28, 27), (28, 33)], fill=num_color)
    elif weight_text == "100":
        # 1
        d.line([(19, 27), (19, 33)], fill=num_color)
        # 0
        d.rectangle([22, 27, 24, 33], outline=num_color)
        # 0
        d.rectangle([26, 27, 28, 33], outline=num_color)
        
    # "KG" text
    d.point([(21, 35), (21, 36), (22, 35), (23, 36)], fill=sub_color)
    d.point([(25, 35), (26, 35), (25, 36), (27, 36), (27, 35)], fill=sub_color)
    
    # 4. BOTTOM WEAPON STUDS
    if is_void:
        d.polygon([(15, 43), (11, 47), (19, 44)], fill=(192, 132, 252, 255), outline=OUTLINE)
        d.polygon([(33, 43), (37, 47), (29, 44)], fill=(192, 132, 252, 255), outline=OUTLINE)
        d.polygon([(23, 44), (24, 47), (25, 44)], fill=(0, 245, 140, 255), outline=OUTLINE)
    elif is_fire:
        d.polygon([(14, 42), (9, 46), (18, 44)], fill=(245, 158, 11, 255), outline=OUTLINE)
        d.polygon([(34, 42), (39, 46), (30, 44)], fill=(245, 158, 11, 255), outline=OUTLINE)
        d.polygon([(23, 44), (24, 47), (25, 44)], fill=(255, 230, 50, 255), outline=OUTLINE)
    elif is_gold:
        d.polygon([(15, 42), (11, 46), (19, 44)], fill=(255, 240, 150, 255), outline=OUTLINE)
        d.polygon([(33, 42), (37, 46), (29, 44)], fill=(255, 240, 150, 255), outline=OUTLINE)
        d.polygon([(23, 44), (24, 47), (25, 44)], fill=(56, 182, 255, 255), outline=OUTLINE)
    else:
        d.polygon([(15, 43), (12, 47), (18, 44)], fill=(160, 175, 190, 255), outline=OUTLINE)
        d.polygon([(33, 43), (36, 47), (30, 44)], fill=(160, 175, 190, 255), outline=OUTLINE)
        d.polygon([(23, 44), (24, 46), (25, 44)], fill=(220, 230, 240, 255), outline=OUTLINE)
        
    return img

i = draw_proportional_kettlebell("32", color_band=(220, 38, 38, 255), bell_color=(45, 52, 62, 255))
e = draw_proportional_kettlebell("48", color_band=(56, 182, 255, 255), bell_color=(235, 175, 25, 255), is_gold=True)
d = draw_proportional_kettlebell("64", color_band=(245, 158, 11, 255), bell_color=(165, 28, 30, 255), is_fire=True)
v = draw_proportional_kettlebell("100", color_band=(0, 245, 140, 255), bell_color=(85, 25, 135, 255), is_void=True)

comp = Image.new("RGBA", (W * 4 + 30, H + 10), (20, 18, 25, 255))
comp.paste(i, (5, 5), i)
comp.paste(e, (W + 10, 5), e)
comp.paste(d, (W * 2 + 15, 5), d)
comp.paste(v, (W * 3 + 20, 5), v)
comp.save('work/proportional_kbs.png')
print("Proportional kettlebells generated!")
