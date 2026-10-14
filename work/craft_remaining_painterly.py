from PIL import Image, ImageDraw, ImageFilter
import numpy as np

W_LONG, H_LONG = 64, 34
W_BELL, H_BELL = 40, 40

# Load master sword to extract high-detail hilt and blade components
master_sword = Image.open('work/sword_crop.png').convert('RGBA')

# Helper to draw stamped pixel weight digits with chiaroscuro depth
def stamp_num_painterly(d, cx, cy, text, num_col, shadow_col=(15, 18, 24, 255)):
    # Draw drop shadow then highlight
    for ox, oy, col in [(0, 1, shadow_col), (0, 0, num_col)]:
        if text == "20":
            # 2
            d.line([(cx-4+ox, cy-3+oy), (cx-1+ox, cy-3+oy)], fill=col)
            d.line([(cx-1+ox, cy-3+oy), (cx-1+ox, cy+oy)], fill=col)
            d.line([(cx-4+ox, cy+oy), (cx-1+ox, cy+oy)], fill=col)
            d.line([(cx-4+ox, cy+oy), (cx-4+ox, cy+3+oy)], fill=col)
            d.line([(cx-4+ox, cy+3+oy), (cx-1+ox, cy+3+oy)], fill=col)
            # 0
            d.rectangle([cx+1+ox, cy-3+oy, cx+4+ox, cy+3+oy], outline=col)
        elif text == "24":
            # 2
            d.line([(cx-4+ox, cy-3+oy), (cx-1+ox, cy-3+oy)], fill=col)
            d.line([(cx-1+ox, cy-3+oy), (cx-1+ox, cy+oy)], fill=col)
            d.line([(cx-4+ox, cy+oy), (cx-1+ox, cy+oy)], fill=col)
            d.line([(cx-4+ox, cy+oy), (cx-4+ox, cy+3+oy)], fill=col)
            d.line([(cx-4+ox, cy+3+oy), (cx-1+ox, cy+3+oy)], fill=col)
            # 4
            d.line([(cx+1+ox, cy-3+oy), (cx+1+ox, cy+oy)], fill=col)
            d.line([(cx+1+ox, cy+oy), (cx+4+ox, cy+oy)], fill=col)
            d.line([(cx+4+ox, cy-3+oy), (cx+4+ox, cy+3+oy)], fill=col)
        elif text == "30":
            # 3
            d.line([(cx-4+ox, cy-3+oy), (cx-1+ox, cy-3+oy)], fill=col)
            d.line([(cx-1+ox, cy-3+oy), (cx-1+ox, cy+oy)], fill=col)
            d.line([(cx-3+ox, cy+oy), (cx-1+ox, cy+oy)], fill=col)
            d.line([(cx-1+ox, cy+oy), (cx-1+ox, cy+3+oy)], fill=col)
            d.line([(cx-4+ox, cy+3+oy), (cx-1+ox, cy+3+oy)], fill=col)
            # 0
            d.rectangle([cx+1+ox, cy-3+oy, cx+4+ox, cy+3+oy], outline=col)
        elif text == "32":
            # 3
            d.line([(cx-4+ox, cy-3+oy), (cx-1+ox, cy-3+oy)], fill=col)
            d.line([(cx-1+ox, cy-3+oy), (cx-1+ox, cy+oy)], fill=col)
            d.line([(cx-3+ox, cy+oy), (cx-1+ox, cy+oy)], fill=col)
            d.line([(cx-1+ox, cy+oy), (cx-1+ox, cy+3+oy)], fill=col)
            d.line([(cx-4+ox, cy+3+oy), (cx-1+ox, cy+3+oy)], fill=col)
            # 2
            d.line([(cx+1+ox, cy-3+oy), (cx+4+ox, cy-3+oy)], fill=col)
            d.line([(cx+4+ox, cy-3+oy), (cx+4+ox, cy+oy)], fill=col)
            d.line([(cx+1+ox, cy+oy), (cx+4+ox, cy+oy)], fill=col)
            d.line([(cx+1+ox, cy+oy), (cx+1+ox, cy+3+oy)], fill=col)
            d.line([(cx+1+ox, cy+3+oy), (cx+4+ox, cy+3+oy)], fill=col)
        elif text == "72":
            # 7
            d.line([(cx-4+ox, cy-3+oy), (cx-1+ox, cy-3+oy)], fill=col)
            d.line([(cx-1+ox, cy-3+oy), (cx-4+ox, cy+3+oy)], fill=col)
            # 2
            d.line([(cx+1+ox, cy-3+oy), (cx+4+ox, cy-3+oy)], fill=col)
            d.line([(cx+4+ox, cy-3+oy), (cx+4+ox, cy+oy)], fill=col)
            d.line([(cx+1+ox, cy+oy), (cx+4+ox, cy+oy)], fill=col)
            d.line([(cx+1+ox, cy+oy), (cx+1+ox, cy+3+oy)], fill=col)
            d.line([(cx+1+ox, cy+3+oy), (cx+4+ox, cy+3+oy)], fill=col)
        elif text == "80":
            # 8
            d.rectangle([cx-4+ox, cy-3+oy, cx-1+ox, cy+3+oy], outline=col)
            d.line([(cx-4+ox, cy+oy), (cx-1+ox, cy+oy)], fill=col)
            # 0
            d.rectangle([cx+1+ox, cy-3+oy, cx+4+ox, cy+3+oy], outline=col)
        elif text == "88":
            # 8
            d.rectangle([cx-4+ox, cy-3+oy, cx-1+ox, cy+3+oy], outline=col)
            d.line([(cx-4+ox, cy+oy), (cx-1+ox, cy+oy)], fill=col)
            # 8
            d.rectangle([cx+1+ox, cy-3+oy, cx+4+ox, cy+3+oy], outline=col)
            d.line([(cx+1+ox, cy+oy), (cx+4+ox, cy+oy)], fill=col)
        elif text == "108":
            # 1
            d.line([(cx-5+ox, cy-3+oy), (cx-5+ox, cy+3+oy)], fill=col)
            # 0
            d.rectangle([cx-2+ox, cy-3+oy, cx+1+ox, cy+3+oy], outline=col)
            # 8
            d.rectangle([cx+3+ox, cy-3+oy, cx+6+ox, cy+3+oy], outline=col)
            d.line([(cx+3+ox, cy+oy), (cx+6+ox, cy+oy)], fill=col)
        elif text == "120":
            # 1
            d.line([(cx-5+ox, cy-3+oy), (cx-5+ox, cy+3+oy)], fill=col)
            # 2
            d.line([(cx-2+ox, cy-3+oy), (cx+1+ox, cy-3+oy)], fill=col)
            d.line([(cx+1+ox, cy-3+oy), (cx+1+ox, cy+oy)], fill=col)
            d.line([(cx-2+ox, cy+oy), (cx+1+ox, cy+oy)], fill=col)
            d.line([(cx-2+ox, cy+oy), (cx-2+ox, cy+3+oy)], fill=col)
            d.line([(cx-2+ox, cy+3+oy), (cx+1+ox, cy+3+oy)], fill=col)
            # 0
            d.rectangle([cx+3+ox, cy-3+oy, cx+6+ox, cy+3+oy], outline=col)

def draw_kettle_sphere(d, cx, cy, r, base_col, highlight_col, shadow_col, outline_col):
    # Spherical painterly shading with multiple soft rings and highlight
    d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=base_col, outline=outline_col, width=1)
    # Ambient shadow on bottom right
    d.arc([cx-r+1, cy-r+1, cx+r-1, cy+r-1], 0, 135, fill=shadow_col, width=2)
    # Soft chiaroscuro inner core
    d.ellipse([cx-r+2, cy-r+2, cx+r-2, cy+r-2], fill=shadow_col)
    d.ellipse([cx-r+3, cy-r+3, cx+r-3, cy+r-3], fill=base_col)
    # Specular curved highlight on top-left
    d.arc([cx-r+2, cy-r+2, cx+r-2, cy+r-2], 140, 270, fill=highlight_col, width=2)
    d.point([(cx-r//2, cy-r//2), (cx-r//2+1, cy-r//2)], fill=(255, 255, 255, 255))
    # Recessed stamped weight badge
    d.ellipse([cx-r//2-1, cy-r//2-1, cx+r//2+1, cy+r//2+1], fill=shadow_col, outline=outline_col)

# 1. BOAR SWORD (32kg)
def make_boar_sword():
    img = Image.new('RGBA', (W_LONG, H_LONG), (0, 0, 0, 0))
    # Paste master sword blade & hilt as base
    img.paste(master_sword, (0, (H_LONG - master_sword.height) // 2), master_sword)
    d = ImageDraw.Draw(img)
    # 32kg Cast Iron Kettlebell Core at x: 20..36, y: 8..26
    cx, cy, r = 28, 17, 8
    draw_kettle_sphere(d, cx, cy, r, (70, 75, 85, 255), (180, 195, 215, 255), (35, 40, 48, 255), (15, 18, 22, 255))
    # Kettlebell Handle arch looping above
    d.arc([cx-7, cy-12, cx+7, cy], 180, 360, fill=(15, 18, 22, 255), width=3)
    d.arc([cx-6, cy-11, cx+6, cy-1], 180, 360, fill=(110, 120, 135, 255), width=2)
    # Boar tusks flanking as quillons
    IVORY = (245, 240, 220, 255)
    d.polygon([(24, 7), (29, 3), (27, 10)], fill=IVORY, outline=(15, 18, 22, 255))
    d.polygon([(24, 27), (29, 31), (27, 24)], fill=IVORY, outline=(15, 18, 22, 255))
    # Serrated lower edge on blade
    for sx in range(38, 56, 5):
        d.polygon([(sx, 22), (sx+2, 25), (sx+4, 22)], fill=(180, 190, 205, 255), outline=(15, 18, 22, 255))
    stamp_num_painterly(d, cx, cy, "32", (245, 245, 245, 255))
    return img

# 2. WOLF SWORD (24kg)
def make_wolf_sword():
    img = Image.new('RGBA', (W_LONG, H_LONG), (0, 0, 0, 0))
    img.paste(master_sword, (0, (H_LONG - master_sword.height) // 2), master_sword)
    d = ImageDraw.Draw(img)
    cx, cy, r = 28, 17, 8
    draw_kettle_sphere(d, cx, cy, r, (55, 75, 105, 255), (145, 185, 235, 255), (25, 38, 58, 255), (12, 18, 28, 255))
    # Kettlebell handle arch
    d.arc([cx-7, cy-12, cx+7, cy], 180, 360, fill=(12, 18, 28, 255), width=3)
    d.arc([cx-6, cy-11, cx+6, cy-1], 180, 360, fill=(85, 120, 170, 255), width=2)
    # Wolf ears / predator fangs
    d.polygon([(23, 6), (28, 2), (28, 9)], fill=(85, 120, 170, 255), outline=(12, 18, 28, 255))
    d.polygon([(23, 28), (28, 32), (28, 25)], fill=(85, 120, 170, 255), outline=(12, 18, 28, 255))
    # Predator amber eye glint
    d.point([(26, 12)], fill=(245, 158, 11, 255))
    stamp_num_painterly(d, cx, cy, "24", (220, 235, 255, 255))
    return img

# 3. DRAGON SWORD (88kg)
def make_dragon_sword():
    img = Image.new('RGBA', (W_LONG, H_LONG), (0, 0, 0, 0))
    img.paste(master_sword, (0, (H_LONG - master_sword.height) // 2), master_sword)
    d = ImageDraw.Draw(img)
    # Tint blade scorch scarlet
    cx, cy, r = 28, 17, 8
    draw_kettle_sphere(d, cx, cy, r, (185, 28, 28, 255), (252, 211, 77, 255), (85, 12, 12, 255), (25, 5, 5, 255))
    # Scorched handle arch
    d.arc([cx-7, cy-12, cx+7, cy], 180, 360, fill=(25, 5, 5, 255), width=3)
    d.arc([cx-6, cy-11, cx+6, cy-1], 180, 360, fill=(245, 158, 11, 255), width=2)
    # Dragon wing quillons
    d.polygon([(23, 5), (30, 1), (28, 10)], fill=(185, 28, 28, 255), outline=(25, 5, 5, 255))
    d.polygon([(23, 29), (30, 33), (28, 24)], fill=(185, 28, 28, 255), outline=(25, 5, 5, 255))
    # Magma veins along blade
    d.line([(36, 17), (58, 17)], fill=(245, 158, 11, 255), width=2)
    d.line([(38, 17), (56, 17)], fill=(255, 250, 200, 255), width=1)
    stamp_num_painterly(d, cx, cy, "88", (252, 211, 77, 255))
    return img

# 4. VOID SWORD (108kg)
def make_void_sword():
    img = Image.new('RGBA', (W_LONG, H_LONG), (0, 0, 0, 0))
    img.paste(master_sword, (0, (H_LONG - master_sword.height) // 2), master_sword)
    d = ImageDraw.Draw(img)
    cx, cy, r = 28, 17, 8
    draw_kettle_sphere(d, cx, cy, r, (35, 15, 60, 255), (192, 132, 252, 255), (15, 5, 30, 255), (8, 2, 18, 255))
    d.arc([cx-7, cy-12, cx+7, cy], 180, 360, fill=(8, 2, 18, 255), width=3)
    d.arc([cx-6, cy-11, cx+6, cy-1], 180, 360, fill=(168, 85, 247, 255), width=2)
    # Astral cyan quillons
    d.line([(24, 3), (24, 31)], fill=(0, 245, 140, 255), width=2)
    d.point([(23, 2), (25, 2), (23, 32), (25, 32)], fill=(255, 255, 255, 255))
    # Void beam blade
    d.line([(36, 17), (58, 17)], fill=(168, 85, 247, 255), width=2)
    d.line([(38, 17), (56, 17)], fill=(0, 245, 140, 255), width=1)
    stamp_num_painterly(d, cx, cy, "108", (0, 245, 140, 255))
    return img

# 5. KRAKEN MORNINGSTAR (80kg)
def make_kraken_morningstar():
    img = Image.new('RGBA', (W_LONG, H_LONG), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Bone harpoon shaft
    d.polygon([(4, 15), (22, 14), (22, 18), (4, 19)], fill=(220, 215, 195, 255), outline=(20, 24, 30, 255))
    d.polygon([(2, 17), (6, 13), (6, 21)], fill=(180, 175, 155, 255), outline=(20, 24, 30, 255))
    # Muscular kraken tentacle chain drooping down
    PURPLE_TENT = (126, 34, 206, 255)
    TEAL_SUCKER = (20, 184, 166, 255)
    for tx, ty in [(23, 16), (26, 18), (29, 21), (32, 24), (35, 25), (38, 22), (40, 19)]:
        d.ellipse([tx-2, ty-2, tx+2, ty+2], fill=PURPLE_TENT, outline=(20, 24, 30, 255))
        d.point([(tx, ty)], fill=TEAL_SUCKER)
    # 80kg Barnacled Deep-Sea Anchor Kettlebell (cx=48, cy=20, r=9)
    cx, cy, r = 48, 20, 9
    draw_kettle_sphere(d, cx, cy, r, (45, 60, 75, 255), (120, 165, 195, 255), (20, 30, 42, 255), (10, 16, 24, 255))
    # Anchor flukes
    d.polygon([(cx-r-2, cy+4), (cx-r+2, cy+8), (cx-r+1, cy+2)], fill=(45, 60, 75, 255), outline=(10, 16, 24, 255))
    d.polygon([(cx+r+2, cy+4), (cx+r-2, cy+8), (cx+r-1, cy+2)], fill=(45, 60, 75, 255), outline=(10, 16, 24, 255))
    # Kettlebell handle hooked to tentacle
    d.arc([cx-6, cy-13, cx+6, cy-1], 180, 360, fill=(10, 16, 24, 255), width=3)
    d.arc([cx-5, cy-12, cx+5, cy-2], 180, 360, fill=(80, 110, 135, 255), width=2)
    stamp_num_painterly(d, cx, cy+1, "80", (20, 184, 166, 255))
    return img

# 6. MUSHROOM BELL (20kg)
def make_mushroom_bell():
    img = Image.new('RGBA', (W_BELL, H_BELL), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Spore horn arch (x: 10..30, y: 4..16)
    d.rounded_rectangle([10, 4, 30, 16], radius=5, fill=(88, 28, 135, 255), outline=(18, 8, 30, 255), width=2)
    d.rounded_rectangle([14, 7, 26, 15], radius=3, fill=(0, 0, 0, 0), outline=(18, 8, 30, 255), width=1)
    # Bioluminescent warts on arch
    d.ellipse([9, 4, 13, 8], fill=(236, 72, 153, 255))
    d.ellipse([27, 4, 31, 8], fill=(236, 72, 153, 255))
    # 20kg Fungal cap bell body (cx=20, cy=24, r=12)
    cx, cy, r = 20, 24, 12
    draw_kettle_sphere(d, cx, cy, r, (107, 33, 168, 255), (216, 180, 254, 255), (59, 7, 100, 255), (18, 8, 30, 255))
    # Glowing teal spore gills at bottom
    d.polygon([(cx-6, cy+r-2), (cx+6, cy+r-2), (cx+5, cy+r+1), (cx-5, cy+r+1)], fill=(20, 184, 166, 255), outline=(18, 8, 30, 255))
    d.point([(cx-4, cy-4), (cx+4, cy-3), (cx-3, cy+4), (cx+3, cy+5)], fill=(20, 184, 166, 255))
    stamp_num_painterly(d, cx, cy, "20", (255, 255, 255, 255))
    return img

# 7. HARPY BELL (30kg)
def make_harpy_bell():
    img = Image.new('RGBA', (W_BELL, H_BELL), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Mountain-bronze handle arch
    d.rounded_rectangle([10, 4, 30, 16], radius=5, fill=(180, 115, 45, 255), outline=(28, 16, 6, 255), width=2)
    d.rounded_rectangle([14, 7, 26, 15], radius=3, fill=(0, 0, 0, 0), outline=(28, 16, 6, 255), width=1)
    # Feather quills on arch
    d.polygon([(9, 4), (13, 1), (12, 6)], fill=(245, 240, 220, 255), outline=(28, 16, 6, 255))
    d.polygon([(31, 4), (27, 1), (28, 6)], fill=(245, 240, 220, 255), outline=(28, 16, 6, 255))
    # 30kg Bronze bell body
    cx, cy, r = 20, 24, 12
    draw_kettle_sphere(d, cx, cy, r, (195, 130, 50, 255), (255, 235, 160, 255), (110, 65, 20, 255), (28, 16, 6, 255))
    # Raptor eagle talons clutching the bell
    TALON = (45, 25, 15, 255)
    d.line([(cx-r, cy-3), (cx-r+4, cy+1)], fill=TALON, width=2)
    d.line([(cx+r, cy-3), (cx+r-4, cy+1)], fill=TALON, width=2)
    stamp_num_painterly(d, cx, cy, "30", (255, 250, 210, 255))
    return img

# 8. GOLEM BELL (72kg)
def make_golem_bell():
    img = Image.new('RGBA', (W_BELL, H_BELL), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Rebar-reinforced iron handle arch
    d.rounded_rectangle([10, 4, 30, 16], radius=5, fill=(65, 75, 85, 255), outline=(18, 22, 28, 255), width=2)
    d.rounded_rectangle([14, 7, 26, 15], radius=3, fill=(0, 0, 0, 0), outline=(18, 22, 28, 255), width=1)
    # 72kg Granite boulder bell body
    cx, cy, r = 20, 24, 12
    draw_kettle_sphere(d, cx, cy, r, (120, 125, 135, 255), (210, 218, 230, 255), (65, 70, 80, 255), (18, 22, 28, 255))
    # Runic cyan ley-cracks
    CYAN = (56, 182, 255, 255)
    d.line([(cx-7, cy-3), (cx-3, cy-1)], fill=CYAN)
    d.line([(cx+3, cy-1), (cx+7, cy+3)], fill=CYAN)
    stamp_num_painterly(d, cx, cy-1, "72", (245, 250, 255, 255))
    return img

# 9. ELDRITCH BELL (120kg)
def make_eldritch_bell():
    img = Image.new('RGBA', (W_BELL, H_BELL), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Writhing cosmic tentacle handle arch
    d.rounded_rectangle([10, 4, 30, 16], radius=5, fill=(126, 34, 206, 255), outline=(20, 8, 35, 255), width=2)
    d.rounded_rectangle([14, 7, 26, 15], radius=3, fill=(0, 0, 0, 0), outline=(20, 8, 35, 255), width=1)
    # 120kg Cosmic flesh bell body
    cx, cy, r = 20, 24, 12
    draw_kettle_sphere(d, cx, cy, r, (65, 20, 85, 255), (192, 132, 252, 255), (35, 10, 50, 255), (20, 8, 35, 255))
    # Giant unblinking golden eye in center!
    d.ellipse([cx-7, cy-5, cx+7, cy+5], fill=(245, 158, 11, 255), outline=(20, 8, 35, 255))
    d.polygon([(cx, cy-4), (cx+1, cy), (cx, cy+4), (cx-1, cy)], fill=(20, 8, 35, 255)) # Slit pupil
    stamp_num_painterly(d, cx, cy+7, "120", (220, 180, 255, 255))
    return img

# Generate all 9 remaining weapons and save
rem = [
    ('boar_sword', make_boar_sword()),
    ('wolf_sword', make_wolf_sword()),
    ('dragon_sword', make_dragon_sword()),
    ('void_sword', make_void_sword()),
    ('kraken_morningstar', make_kraken_morningstar()),
    ('mushroom_bell', make_mushroom_bell()),
    ('harpy_bell', make_harpy_bell()),
    ('golem_bell', make_golem_bell()),
    ('eldritch_bell', make_eldritch_bell()),
]

for name, im in rem:
    im.save(f'work/art_{name}.png')
    print(f'Crafted work/art_{name}.png ({im.size})')
