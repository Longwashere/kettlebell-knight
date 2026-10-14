from PIL import Image, ImageDraw, ImageFont

# Let's create a realistic 64x64 or 60x60 kettlebell sprite
W, H = 64, 64

def draw_real_kettlebell(weight_text="32", unit_text="KG", color_band=(220, 38, 38, 255), bell_color=(40, 45, 52, 255), is_gold=False, is_fire=False, is_void=False):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    OUTLINE = (15, 18, 24, 255)
    
    # Coordinates in a 64x64 canvas:
    # Handle: Top horizontal bar from y=6 to y=12, x=20 to x=44.
    # Horns: Curved down from (20, 10) to (16, 26) on left, (44, 10) to (48, 26) on right.
    # Window inside handle: hollow space from x=24..40, y=12..24.
    # Bell body: Center (32, 42), radius ~18 (x: 14..50, y: 24..60).
    # Flat base: at bottom y=58..60, width x=22..42.
    
    # 1. HANDLE & HORNS (Solid casting)
    # Outer handle arch
    d.rounded_rectangle([16, 6, 48, 28], radius=8, fill=bell_color, outline=OUTLINE, width=2)
    # Inner cutout (the hollow window you put your hand through!)
    d.rounded_rectangle([23, 13, 41, 28], radius=5, fill=(0, 0, 0, 0), outline=OUTLINE, width=1)
    
    # 2. COMPETITION / ROGUE COLOR BANDS ON HORNS
    # Left horn color band
    d.rectangle([17, 18, 22, 22], fill=color_band, outline=OUTLINE, width=1)
    # Right horn color band
    d.rectangle([42, 18, 47, 22], fill=color_band, outline=OUTLINE, width=1)
    
    # Handle top grip highlight
    d.line([(24, 8), (40, 8)], fill=(120, 135, 150, 255) if not is_gold else (255, 240, 180, 255))
    
    # 3. SPHERICAL BELL BODY (Classic flat-bottom kettlebell)
    # Main bell sphere
    d.ellipse([13, 22, 51, 60], fill=bell_color, outline=OUTLINE, width=2)
    # Flat bottom base
    d.polygon([(21, 57), (43, 57), (41, 61), (23, 61)], fill=bell_color, outline=OUTLINE)
    
    # 3D Shading on the sphere
    # Dark shadow crescent on bottom right
    d.arc([15, 24, 49, 58], 0, 120, fill=(20, 24, 30, 255) if not is_gold else (160, 100, 15, 255), width=3)
    # Soft highlight crescent on top left
    d.arc([16, 25, 48, 57], 150, 270, fill=(85, 98, 115, 255) if not is_gold else (255, 225, 100, 255), width=2)
    # Specular glint
    d.line([(20, 28), (24, 26)], fill=(200, 215, 230, 255) if not is_gold else (255, 255, 230, 255), width=1)
    d.point([(21, 29), (22, 29)], fill=(255, 255, 255, 255))
    
    # 4. LARGE EMBOSSED CIRCULAR WEIGHT BADGE (Just like Rogue / Nike kettlebells!)
    # Outer circle of the badge
    d.ellipse([21, 31, 43, 53], fill=(30, 35, 42, 255) if not is_gold else (200, 135, 20, 255), outline=OUTLINE, width=1)
    # Inner recessed ring
    d.ellipse([23, 33, 41, 51], fill=(22, 26, 32, 255) if not is_gold else (175, 110, 15, 255))
    
    # STAMPED WEIGHT TEXT: Large bold number + KG
    # Let's draw high-contrast pixel digits for weight
    num_color = (255, 255, 255, 255) if not is_gold else (255, 250, 200, 255)
    sub_color = color_band
    
    if weight_text == "32":
        # Draw "3"
        d.line([(26, 37), (30, 37)], fill=num_color)
        d.line([(30, 37), (30, 41)], fill=num_color)
        d.line([(27, 41), (30, 41)], fill=num_color)
        d.line([(30, 41), (30, 45)], fill=num_color)
        d.line([(26, 45), (30, 45)], fill=num_color)
        # Draw "2"
        d.line([(33, 37), (37, 37)], fill=num_color)
        d.line([(37, 37), (37, 41)], fill=num_color)
        d.line([(33, 41), (37, 41)], fill=num_color)
        d.line([(33, 41), (33, 45)], fill=num_color)
        d.line([(33, 45), (37, 45)], fill=num_color)
    elif weight_text == "48":
        # Draw "4"
        d.line([(26, 37), (26, 41)], fill=num_color)
        d.line([(26, 41), (30, 41)], fill=num_color)
        d.line([(30, 37), (30, 45)], fill=num_color)
        # Draw "8"
        d.rectangle([33, 37, 37, 45], outline=num_color)
        d.line([(33, 41), (37, 41)], fill=num_color)
    elif weight_text == "64":
        # Draw "6"
        d.line([(26, 37), (30, 37)], fill=num_color)
        d.line([(26, 37), (26, 45)], fill=num_color)
        d.line([(26, 45), (30, 45)], fill=num_color)
        d.line([(30, 41), (30, 45)], fill=num_color)
        d.line([(26, 41), (30, 41)], fill=num_color)
        # Draw "4"
        d.line([(33, 37), (33, 41)], fill=num_color)
        d.line([(33, 41), (37, 41)], fill=num_color)
        d.line([(37, 37), (37, 45)], fill=num_color)
    elif weight_text == "∞":
        # Draw infinity symbol
        d.ellipse([26, 39, 31, 43], outline=num_color)
        d.ellipse([32, 39, 37, 43], outline=num_color)
        
    # "KG" below the number
    d.point([(28, 47), (28, 48), (28, 49), (29, 48), (30, 47), (30, 49)], fill=sub_color) # K
    d.point([(32, 47), (33, 47), (32, 48), (32, 49), (34, 49), (34, 48), (33, 48)], fill=sub_color) # G
    
    # 5. WEAPON AUGMENTATIONS (Spikes / Flanges so it's a DEADLY battle kettlebell)
    if is_void:
        # Void crystal spikes radiating from bottom base
        d.polygon([(20, 58), (14, 63), (25, 60)], fill=(192, 132, 252, 255), outline=OUTLINE)
        d.polygon([(43, 58), (49, 63), (39, 60)], fill=(192, 132, 252, 255), outline=OUTLINE)
        d.polygon([(30, 60), (32, 64), (34, 60)], fill=(0, 245, 140, 255), outline=OUTLINE)
    elif is_fire:
        # Molten dragon horn spikes on base
        d.polygon([(18, 56), (12, 62), (24, 59)], fill=(245, 158, 11, 255), outline=OUTLINE)
        d.polygon([(45, 56), (51, 62), (40, 59)], fill=(245, 158, 11, 255), outline=OUTLINE)
        d.polygon([(29, 60), (32, 64), (35, 60)], fill=(255, 230, 50, 255), outline=OUTLINE)
    elif is_gold:
        # Holy sunburst finials
        d.polygon([(19, 57), (15, 63), (25, 59)], fill=(255, 240, 150, 255), outline=OUTLINE)
        d.polygon([(44, 57), (48, 63), (39, 59)], fill=(255, 240, 150, 255), outline=OUTLINE)
        d.polygon([(30, 60), (32, 64), (34, 60)], fill=(56, 182, 255, 255), outline=OUTLINE)
    else:
        # Iron skull-crusher impact studs on bottom base
        d.polygon([(20, 58), (16, 63), (24, 60)], fill=(160, 175, 190, 255), outline=OUTLINE)
        d.polygon([(43, 58), (47, 63), (39, 60)], fill=(160, 175, 190, 255), outline=OUTLINE)
        d.polygon([(30, 60), (32, 63), (34, 60)], fill=(220, 230, 240, 255), outline=OUTLINE)
        
    return img

i = draw_real_kettlebell("32", "KG", color_band=(220, 38, 38, 255), bell_color=(45, 52, 62, 255))
e = draw_real_kettlebell("48", "KG", color_band=(56, 182, 255, 255), bell_color=(235, 175, 25, 255), is_gold=True)
d = draw_real_kettlebell("64", "KG", color_band=(245, 158, 11, 255), bell_color=(160, 25, 28, 255), is_fire=True)
v = draw_real_kettlebell("∞", "KG", color_band=(0, 245, 140, 255), bell_color=(85, 25, 135, 255), is_void=True)

comp = Image.new("RGBA", (W * 4 + 40, H + 20), (20, 18, 25, 255))
comp.paste(i, (5, 10), i)
comp.paste(e, (W + 15, 10), e)
comp.paste(d, (W * 2 + 25, 10), d)
comp.paste(v, (W * 3 + 35, 10), v)
comp.save('work/real_kettlebells_preview.png')
print("Real kettlebells preview saved!")
