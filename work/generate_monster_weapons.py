from PIL import Image, ImageDraw
import numpy as np

W_LONG, H_LONG = 64, 34
W_BELL, H_BELL = 40, 40

def to_pma(img):
    arr = np.array(img, dtype=float)
    alpha = arr[:, :, 3:4] / 255.0
    arr[:, :, :3] *= alpha
    return Image.fromarray(np.round(arr).astype(np.uint8))

OUTLINE = (14, 16, 20, 255)

# Helper to draw numbers on bells
def draw_num(d, cx, cy, text, color):
    if text == "16":
        # 1
        d.line([(cx - 4, cy - 3), (cx - 4, cy + 3)], fill=color)
        # 6
        d.line([(cx, cy - 3), (cx + 3, cy - 3)], fill=color)
        d.line([(cx, cy - 3), (cx, cy + 3)], fill=color)
        d.rectangle([cx, cy, cx + 3, cy + 3], outline=color)
    elif text == "20":
        # 2
        d.line([(cx - 4, cy - 3), (cx - 1, cy - 3)], fill=color)
        d.line([(cx - 1, cy - 3), (cx - 1, cy)], fill=color)
        d.line([(cx - 4, cy), (cx - 1, cy)], fill=color)
        d.line([(cx - 4, cy), (cx - 4, cy + 3)], fill=color)
        d.line([(cx - 4, cy + 3), (cx - 1, cy + 3)], fill=color)
        # 0
        d.rectangle([cx + 1, cy - 3, cx + 4, cy + 3], outline=color)
    elif text == "24":
        # 2
        d.line([(cx - 4, cy - 3), (cx - 1, cy - 3)], fill=color)
        d.line([(cx - 1, cy - 3), (cx - 1, cy)], fill=color)
        d.line([(cx - 4, cy), (cx - 1, cy)], fill=color)
        d.line([(cx - 4, cy), (cx - 4, cy + 3)], fill=color)
        d.line([(cx - 4, cy + 3), (cx - 1, cy + 3)], fill=color)
        # 4
        d.line([(cx + 1, cy - 3), (cx + 1, cy)], fill=color)
        d.line([(cx + 1, cy), (cx + 4, cy)], fill=color)
        d.line([(cx + 4, cy - 3), (cx + 4, cy + 3)], fill=color)
    elif text == "28":
        # 2
        d.line([(cx - 4, cy - 3), (cx - 1, cy - 3)], fill=color)
        d.line([(cx - 1, cy - 3), (cx - 1, cy)], fill=color)
        d.line([(cx - 4, cy), (cx - 1, cy)], fill=color)
        d.line([(cx - 4, cy), (cx - 4, cy + 3)], fill=color)
        d.line([(cx - 4, cy + 3), (cx - 1, cy + 3)], fill=color)
        # 8
        d.rectangle([cx + 1, cy - 3, cx + 4, cy + 3], outline=color)
        d.line([(cx + 1, cy), (cx + 4, cy)], fill=color)
    elif text == "30":
        # 3
        d.line([(cx - 4, cy - 3), (cx - 1, cy - 3)], fill=color)
        d.line([(cx - 1, cy - 3), (cx - 1, cy)], fill=color)
        d.line([(cx - 3, cy), (cx - 1, cy)], fill=color)
        d.line([(cx - 1, cy), (cx - 1, cy + 3)], fill=color)
        d.line([(cx - 4, cy + 3), (cx - 1, cy + 3)], fill=color)
        # 0
        d.rectangle([cx + 1, cy - 3, cx + 4, cy + 3], outline=color)
    elif text == "32":
        # 3
        d.line([(cx - 4, cy - 3), (cx - 1, cy - 3)], fill=color)
        d.line([(cx - 1, cy - 3), (cx - 1, cy)], fill=color)
        d.line([(cx - 3, cy), (cx - 1, cy)], fill=color)
        d.line([(cx - 1, cy), (cx - 1, cy + 3)], fill=color)
        d.line([(cx - 4, cy + 3), (cx - 1, cy + 3)], fill=color)
        # 2
        d.line([(cx + 1, cy - 3), (cx + 4, cy - 3)], fill=color)
        d.line([(cx + 4, cy - 3), (cx + 4, cy)], fill=color)
        d.line([(cx + 1, cy), (cx + 4, cy)], fill=color)
        d.line([(cx + 1, cy), (cx + 1, cy + 3)], fill=color)
        d.line([(cx + 1, cy + 3), (cx + 4, cy + 3)], fill=color)
    elif text == "36":
        # 3
        d.line([(cx - 4, cy - 3), (cx - 1, cy - 3)], fill=color)
        d.line([(cx - 1, cy - 3), (cx - 1, cy)], fill=color)
        d.line([(cx - 3, cy), (cx - 1, cy)], fill=color)
        d.line([(cx - 1, cy), (cx - 1, cy + 3)], fill=color)
        d.line([(cx - 4, cy + 3), (cx - 1, cy + 3)], fill=color)
        # 6
        d.line([(cx + 1, cy - 3), (cx + 4, cy - 3)], fill=color)
        d.line([(cx + 1, cy - 3), (cx + 1, cy + 3)], fill=color)
        d.rectangle([cx + 1, cy, cx + 4, cy + 3], outline=color)
    elif text == "40":
        # 4
        d.line([(cx - 4, cy - 3), (cx - 4, cy)], fill=color)
        d.line([(cx - 4, cy), (cx - 1, cy)], fill=color)
        d.line([(cx - 1, cy - 3), (cx - 1, cy + 3)], fill=color)
        # 0
        d.rectangle([cx + 1, cy - 3, cx + 4, cy + 3], outline=color)
    elif text == "44":
        # 4
        d.line([(cx - 4, cy - 3), (cx - 4, cy)], fill=color)
        d.line([(cx - 4, cy), (cx - 1, cy)], fill=color)
        d.line([(cx - 1, cy - 3), (cx - 1, cy + 3)], fill=color)
        # 4
        d.line([(cx + 1, cy - 3), (cx + 1, cy)], fill=color)
        d.line([(cx + 1, cy), (cx + 4, cy)], fill=color)
        d.line([(cx + 4, cy - 3), (cx + 4, cy + 3)], fill=color)
    elif text == "48":
        # 4
        d.line([(cx - 4, cy - 3), (cx - 4, cy)], fill=color)
        d.line([(cx - 4, cy), (cx - 1, cy)], fill=color)
        d.line([(cx - 1, cy - 3), (cx - 1, cy + 3)], fill=color)
        # 8
        d.rectangle([cx + 1, cy - 3, cx + 4, cy + 3], outline=color)
        d.line([(cx + 1, cy), (cx + 4, cy)], fill=color)
    elif text == "50":
        # 5
        d.line([(cx - 4, cy - 3), (cx - 1, cy - 3)], fill=color)
        d.line([(cx - 4, cy - 3), (cx - 4, cy)], fill=color)
        d.line([(cx - 4, cy), (cx - 1, cy)], fill=color)
        d.line([(cx - 1, cy), (cx - 1, cy + 3)], fill=color)
        d.line([(cx - 4, cy + 3), (cx - 1, cy + 3)], fill=color)
        # 0
        d.rectangle([cx + 1, cy - 3, cx + 4, cy + 3], outline=color)
    elif text == "54":
        # 5
        d.line([(cx - 4, cy - 3), (cx - 1, cy - 3)], fill=color)
        d.line([(cx - 4, cy - 3), (cx - 4, cy)], fill=color)
        d.line([(cx - 4, cy), (cx - 1, cy)], fill=color)
        d.line([(cx - 1, cy), (cx - 1, cy + 3)], fill=color)
        d.line([(cx - 4, cy + 3), (cx - 1, cy + 3)], fill=color)
        # 4
        d.line([(cx + 1, cy - 3), (cx + 1, cy)], fill=color)
        d.line([(cx + 1, cy), (cx + 4, cy)], fill=color)
        d.line([(cx + 4, cy - 3), (cx + 4, cy + 3)], fill=color)
    elif text == "60":
        # 6
        d.line([(cx - 4, cy - 3), (cx - 1, cy - 3)], fill=color)
        d.line([(cx - 4, cy - 3), (cx - 4, cy + 3)], fill=color)
        d.rectangle([cx - 4, cy, cx - 1, cy + 3], outline=color)
        # 0
        d.rectangle([cx + 1, cy - 3, cx + 4, cy + 3], outline=color)
    elif text == "64":
        # 6
        d.line([(cx - 4, cy - 3), (cx - 1, cy - 3)], fill=color)
        d.line([(cx - 4, cy - 3), (cx - 4, cy + 3)], fill=color)
        d.rectangle([cx - 4, cy, cx - 1, cy + 3], outline=color)
        # 4
        d.line([(cx + 1, cy - 3), (cx + 1, cy)], fill=color)
        d.line([(cx + 1, cy), (cx + 4, cy)], fill=color)
        d.line([(cx + 4, cy - 3), (cx + 4, cy + 3)], fill=color)
    elif text == "68":
        # 6
        d.line([(cx - 4, cy - 3), (cx - 1, cy - 3)], fill=color)
        d.line([(cx - 4, cy - 3), (cx - 4, cy + 3)], fill=color)
        d.rectangle([cx - 4, cy, cx - 1, cy + 3], outline=color)
        # 8
        d.rectangle([cx + 1, cy - 3, cx + 4, cy + 3], outline=color)
        d.line([(cx + 1, cy), (cx + 4, cy)], fill=color)
    elif text == "72":
        # 7
        d.line([(cx - 4, cy - 3), (cx - 1, cy - 3)], fill=color)
        d.line([(cx - 1, cy - 3), (cx - 3, cy + 3)], fill=color)
        # 2
        d.line([(cx + 1, cy - 3), (cx + 4, cy - 3)], fill=color)
        d.line([(cx + 4, cy - 3), (cx + 4, cy)], fill=color)
        d.line([(cx + 1, cy), (cx + 4, cy)], fill=color)
        d.line([(cx + 1, cy), (cx + 1, cy + 3)], fill=color)
        d.line([(cx + 1, cy + 3), (cx + 4, cy + 3)], fill=color)
    elif text == "80":
        # 8
        d.rectangle([cx - 4, cy - 3, cx - 1, cy + 3], outline=color)
        d.line([(cx - 4, cy), (cx - 1, cy)], fill=color)
        # 0
        d.rectangle([cx + 1, cy - 3, cx + 4, cy + 3], outline=color)
    elif text == "88":
        # 8
        d.rectangle([cx - 4, cy - 3, cx - 1, cy + 3], outline=color)
        d.line([(cx - 4, cy), (cx - 1, cy)], fill=color)
        # 8
        d.rectangle([cx + 1, cy - 3, cx + 4, cy + 3], outline=color)
        d.line([(cx + 1, cy), (cx + 4, cy)], fill=color)
    elif text == "90":
        # 9
        d.rectangle([cx - 4, cy - 3, cx - 1, cy], outline=color)
        d.line([(cx - 1, cy - 3), (cx - 1, cy + 3)], fill=color)
        d.line([(cx - 4, cy + 3), (cx - 1, cy + 3)], fill=color)
        # 0
        d.rectangle([cx + 1, cy - 3, cx + 4, cy + 3], outline=color)
    elif text == "108":
        # 1 0 8
        d.line([(cx - 6, cy - 3), (cx - 6, cy + 3)], fill=color)
        d.rectangle([cx - 4, cy - 3, cx - 1, cy + 3], outline=color)
        d.rectangle([cx + 1, cy - 3, cx + 4, cy + 3], outline=color)
        d.line([(cx + 1, cy), (cx + 4, cy)], fill=color)
    elif text == "120":
        # 1 2 0
        d.line([(cx - 6, cy - 3), (cx - 6, cy + 3)], fill=color)
        # 2
        d.line([(cx - 3, cy - 3), (cx - 1, cy - 3)], fill=color)
        d.line([(cx - 1, cy - 3), (cx - 1, cy)], fill=color)
        d.line([(cx - 3, cy), (cx - 1, cy)], fill=color)
        d.line([(cx - 3, cy), (cx - 3, cy + 3)], fill=color)
        d.line([(cx - 3, cy + 3), (cx - 1, cy + 3)], fill=color)
        # 0
        d.rectangle([cx + 1, cy - 3, cx + 4, cy + 3], outline=color)

# Standard Haft (x: 2..21, y: 11..15)
def draw_standard_haft(d, haft_col=(60, 42, 30, 255), wrap_col=(120, 85, 60, 255), pommel_col=(70, 80, 95, 255), ferrule_col=(130, 145, 160, 255)):
    # Pommel
    d.ellipse([1, 9, 6, 17], fill=pommel_col, outline=OUTLINE)
    # Shaft
    d.line([(6, 11), (20, 11)], fill=OUTLINE)
    d.line([(6, 15), (20, 15)], fill=OUTLINE)
    for x in range(6, 21, 2):
        d.line([(x, 12), (x+1, 14)], fill=haft_col)
        d.point([(x, 12)], fill=wrap_col)
    # Ferrule
    d.rectangle([19, 10, 22, 16], fill=ferrule_col, outline=OUTLINE)

print("Helper definitions loaded!")

# ==================== MACES (64x34) ====================

def draw_goblin_mace():
    img = Image.new("RGBA", (W_LONG, H_LONG), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Crude branch haft (x: 2..23, y: 11..16)
    d.line([(3, 13), (22, 13)], fill=(75, 52, 32, 255), width=4)
    d.line([(3, 11), (22, 11)], fill=OUTLINE)
    d.line([(3, 15), (22, 15)], fill=OUTLINE)
    # Dirty rope wraps
    for x in range(6, 21, 3):
        d.line([(x, 11), (x+1, 15)], fill=(130, 110, 70, 255))
    # Crude iron collar & bent nails
    d.rectangle([21, 10, 25, 16], fill=(90, 95, 100, 255), outline=OUTLINE)
    d.line([(23, 8), (23, 10)], fill=(180, 190, 200, 255)) # bent nail
    # Crude rusty 16KG kettlebell head (x: 25..55, y: 5..27)
    # Horns
    d.rounded_rectangle([25, 8, 38, 24], radius=3, fill=(90, 55, 35, 255), outline=OUTLINE, width=2)
    d.rounded_rectangle([29, 11, 34, 21], radius=2, fill=(0, 0, 0, 0), outline=OUTLINE, width=1)
    # Bell sphere
    bx, by, r = 42, 16, 9
    d.ellipse([bx-r, by-r, bx+r, by+r], fill=(110, 70, 45, 255), outline=OUTLINE, width=2)
    # Rust patches
    d.point([(bx-3, by-2), (bx+2, by+3)], fill=(160, 85, 45, 255))
    # Weight 16
    draw_num(d, bx, by, "16", (240, 230, 200, 255))
    # Jagged goblin spikes / rusted scrap nails
    d.polygon([(bx+r, by-2), (bx+r+5, by), (bx+r, by+2)], fill=(160, 170, 180, 255), outline=OUTLINE)
    d.polygon([(bx+5, by-7), (bx+9, by-10), (bx+7, by-5)], fill=(160, 170, 180, 255), outline=OUTLINE)
    d.polygon([(bx+5, by+7), (bx+9, by+10), (bx+7, by+5)], fill=(160, 170, 180, 255), outline=OUTLINE)
    return img

def draw_skeleton_mace():
    img = Image.new("RGBA", (W_LONG, H_LONG), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Femur bone haft (x: 2..23, y: 11..15)
    BONE_LIGHT = (235, 230, 215, 255)
    BONE_DARK = (165, 155, 135, 255)
    # Bone joint pommel
    d.ellipse([1, 10, 5, 16], fill=BONE_LIGHT, outline=OUTLINE)
    d.line([(5, 11), (22, 11)], fill=OUTLINE)
    d.line([(5, 15), (22, 15)], fill=OUTLINE)
    d.rectangle([5, 12, 22, 14], fill=BONE_LIGHT)
    # Bloodied wrap
    for x in range(8, 20, 3):
        d.line([(x, 12), (x+1, 14)], fill=(140, 40, 40, 255))
    # Fossilized skull-etched kettlebell head (x: 24..56, y: 5..27)
    d.rounded_rectangle([24, 8, 38, 24], radius=3, fill=BONE_DARK, outline=OUTLINE, width=2)
    d.rounded_rectangle([28, 11, 34, 21], radius=2, fill=(0, 0, 0, 0), outline=OUTLINE, width=1)
    bx, by, r = 43, 16, 9
    d.ellipse([bx-r, by-r, bx+r, by+r], fill=BONE_LIGHT, outline=OUTLINE, width=2)
    # Hollow skull eyes
    d.ellipse([bx-5, by-4, bx-2, by-1], fill=OUTLINE)
    d.ellipse([bx+1, by-4, bx+4, by-1], fill=OUTLINE)
    draw_num(d, bx, by+3, "32", OUTLINE)
    # Bone spikes
    d.polygon([(bx+r, by-2), (bx+r+5, by), (bx+r, by+2)], fill=BONE_LIGHT, outline=OUTLINE)
    d.polygon([(bx+5, by-7), (bx+9, by-11), (bx+7, by-5)], fill=BONE_LIGHT, outline=OUTLINE)
    d.polygon([(bx+5, by+7), (bx+9, by+11), (bx+7, by+5)], fill=BONE_LIGHT, outline=OUTLINE)
    return img

def draw_inferno_mace():
    img = Image.new("RGBA", (W_LONG, H_LONG), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    BASALT = (35, 30, 35, 255)
    LAVA = (245, 158, 11, 255)
    WHITE_HEAT = (255, 250, 200, 255)
    draw_standard_haft(d, haft_col=BASALT, wrap_col=LAVA, pommel_col=BASALT, ferrule_col=(180, 50, 20, 255))
    # 90KG lava-cracked anvil kettlebell head
    d.rounded_rectangle([23, 7, 37, 25], radius=3, fill=BASALT, outline=OUTLINE, width=2)
    d.rounded_rectangle([27, 10, 33, 22], radius=2, fill=(0, 0, 0, 0), outline=OUTLINE, width=1)
    # Molten lava fissures along handle
    d.line([(26, 9), (30, 8)], fill=LAVA)
    bx, by, r = 43, 16, 10
    d.ellipse([bx-r, by-r, bx+r, by+r], fill=BASALT, outline=OUTLINE, width=2)
    # Glowing magma cracks
    d.line([(bx-6, by-3), (bx-2, by)], fill=LAVA)
    d.line([(bx+2, by), (bx+6, by+4)], fill=LAVA)
    draw_num(d, bx, by, "90", WHITE_HEAT)
    # Searing heat flanges
    d.polygon([(bx+r, by-3), (bx+r+6, by), (bx+r, by+3)], fill=LAVA, outline=OUTLINE)
    d.polygon([(bx+6, by-7), (bx+11, by-11), (bx+8, by-5)], fill=LAVA, outline=OUTLINE)
    d.polygon([(bx+6, by+7), (bx+11, by+11), (bx+8, by+5)], fill=LAVA, outline=OUTLINE)
    return img

def draw_cemetery_mace():
    img = Image.new("RGBA", (W_LONG, H_LONG), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    WROUGHT = (40, 42, 48, 255)
    STONE = (100, 105, 115, 255)
    BLOOD = (160, 25, 30, 255)
    draw_standard_haft(d, haft_col=WROUGHT, wrap_col=(70, 75, 85, 255), pommel_col=WROUGHT, ferrule_col=(60, 65, 75, 255))
    # 54KG gothic tombstone kettlebell head
    d.rounded_rectangle([23, 7, 37, 25], radius=3, fill=WROUGHT, outline=OUTLINE, width=2)
    d.rounded_rectangle([27, 10, 33, 22], radius=2, fill=(0, 0, 0, 0), outline=OUTLINE, width=1)
    bx, by, r = 43, 16, 10
    d.rectangle([bx-r, by-r, bx+r, by+r], fill=STONE, outline=OUTLINE, width=2) # Rectangular tombstone bell
    # Gothic cross engraving
    d.line([(bx, by-6), (bx, by+6)], fill=OUTLINE)
    d.line([(bx-4, by-2), (bx+4, by-2)], fill=OUTLINE)
    # Blood stain dripping down
    d.line([(bx+3, by+1), (bx+3, by+r+2)], fill=BLOOD)
    draw_num(d, bx, by+2, "54", (220, 225, 230, 255))
    # Iron cemetery gate spikes
    d.polygon([(bx+r, by-2), (bx+r+5, by), (bx+r, by+2)], fill=WROUGHT, outline=OUTLINE)
    d.polygon([(bx+r-2, by-r-3), (bx+r, by-r-1), (bx+r, by-r+2)], fill=WROUGHT, outline=OUTLINE)
    return img

def draw_belfry_mace():
    img = Image.new("RGBA", (W_LONG, H_LONG), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    OAK = (65, 45, 30, 255)
    BRONZE = (185, 125, 45, 255)
    PATINA = (56, 160, 130, 255)
    GOLD = (245, 195, 35, 255)
    draw_standard_haft(d, haft_col=OAK, wrap_col=GOLD, pommel_col=BRONZE, ferrule_col=GOLD)
    # 60KG reshaped church bell kettlebell
    d.rounded_rectangle([23, 7, 37, 25], radius=3, fill=BRONZE, outline=OUTLINE, width=2)
    d.rounded_rectangle([27, 10, 33, 22], radius=2, fill=(0, 0, 0, 0), outline=OUTLINE, width=1)
    bx, by, r = 44, 16, 10
    # Flared church bell silhouette
    d.polygon([(bx-r, by-r+2), (bx+r-3, by-r+2), (bx+r+2, by+r), (bx-r+2, by+r)], fill=BRONZE, outline=OUTLINE)
    d.ellipse([bx-4, by-4, bx+4, by+4], fill=PATINA, outline=OUTLINE)
    draw_num(d, bx, by, "60", GOLD)
    # Church bell clapper flange
    d.polygon([(bx+r+2, by-2), (bx+r+6, by), (bx+r+2, by+2)], fill=GOLD, outline=OUTLINE)
    return img

# ==================== MORNINGSTARS (64x34) ====================

def draw_spider_morningstar():
    img = Image.new("RGBA", (W_LONG, H_LONG), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    CHITIN = (30, 25, 35, 255)
    SILK = (220, 230, 240, 255)
    VENOM = (168, 85, 247, 255)
    draw_standard_haft(d, haft_col=CHITIN, wrap_col=SILK, pommel_col=VENOM, ferrule_col=CHITIN)
    # Braided spider-silk drooping cord
    d.line([(22, 13), (26, 17)], fill=SILK, width=2)
    d.line([(26, 17), (29, 23)], fill=SILK, width=2)
    d.line([(29, 23), (32, 26)], fill=SILK, width=2)
    # 28KG spider egg-sac kettlebell head
    d.rounded_rectangle([30, 20, 38, 27], radius=2, fill=CHITIN, outline=OUTLINE)
    bx, by, r = 44, 23, 8
    d.ellipse([bx-r, by-r, bx+r, by+r], fill=CHITIN, outline=OUTLINE, width=2)
    # Spider eyes
    d.point([(bx-3, by-3), (bx-1, by-3), (bx+1, by-3), (bx+3, by-3)], fill=(239, 68, 68, 255))
    draw_num(d, bx, by+2, "28", VENOM)
    # Arachnid fangs / spikes
    d.polygon([(bx+r, by-2), (bx+r+4, by), (bx+r, by+2)], fill=VENOM, outline=OUTLINE)
    d.polygon([(bx+5, by+5), (bx+8, by+8), (bx+6, by+4)], fill=VENOM, outline=OUTLINE)
    d.polygon([(bx-5, by+5), (bx-8, by+8), (bx-6, by+4)], fill=VENOM, outline=OUTLINE)
    return img

def draw_slime_morningstar():
    img = Image.new("RGBA", (W_LONG, H_LONG), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    SLIME_DARK = (22, 101, 52, 255)
    SLIME_MID = (34, 197, 94, 255)
    SLIME_GLOW = (134, 239, 172, 255)
    draw_standard_haft(d, haft_col=(40, 50, 45, 255), wrap_col=SLIME_MID, pommel_col=SLIME_GLOW, ferrule_col=SLIME_DARK)
    # Dripping ooze tendril chain
    d.ellipse([23, 13, 27, 18], fill=SLIME_MID, outline=OUTLINE)
    d.ellipse([26, 17, 30, 22], fill=SLIME_MID, outline=OUTLINE)
    d.ellipse([29, 21, 33, 26], fill=SLIME_MID, outline=OUTLINE)
    d.point([(27, 19), (30, 23)], fill=SLIME_GLOW)
    # 24KG bubbling acid slime kettlebell
    d.rounded_rectangle([30, 20, 38, 27], radius=2, fill=SLIME_DARK, outline=OUTLINE)
    bx, by, r = 44, 23, 8
    d.ellipse([bx-r, by-r, bx+r, by+r], fill=SLIME_MID, outline=OUTLINE, width=2)
    # Bubbles
    d.ellipse([bx-4, by-5, bx-1, by-2], fill=SLIME_GLOW)
    draw_num(d, bx, by+1, "24", (240, 255, 240, 255))
    # Acid drop spikes
    d.polygon([(bx+r, by-2), (bx+r+3, by), (bx+r, by+2)], fill=SLIME_GLOW, outline=OUTLINE)
    d.polygon([(bx-2, by+r), (bx, by+r+4), (bx+2, by+r)], fill=SLIME_MID, outline=OUTLINE)
    return img

def draw_kraken_morningstar():
    img = Image.new("RGBA", (W_LONG, H_LONG), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    BRASS = (140, 110, 50, 255)
    VERDIGRIS = (45, 160, 140, 255)
    TENTACLE = (147, 51, 234, 255)
    draw_standard_haft(d, haft_col=BRASS, wrap_col=VERDIGRIS, pommel_col=BRASS, ferrule_col=VERDIGRIS)
    # Sea-chain and kraken tentacle droop
    d.ellipse([23, 13, 27, 18], fill=VERDIGRIS, outline=OUTLINE)
    d.ellipse([26, 17, 30, 22], fill=TENTACLE, outline=OUTLINE)
    d.ellipse([29, 21, 33, 26], fill=VERDIGRIS, outline=OUTLINE)
    d.point([(28, 20)], fill=(255, 255, 255, 255)) # suction cup
    # 80KG barnacle kettlebell anchor
    d.rounded_rectangle([30, 20, 38, 27], radius=2, fill=BRASS, outline=OUTLINE)
    bx, by, r = 44, 23, 9
    d.ellipse([bx-r, by-r, bx+r, by+r], fill=BRASS, outline=OUTLINE, width=2)
    # Barnacles
    d.point([(bx-4, by-3), (bx+3, by-4)], fill=(220, 230, 240, 255))
    draw_num(d, bx, by+1, "80", VERDIGRIS)
    # Anchor flukes
    d.polygon([(bx+r, by), (bx+r+4, by-3), (bx+r+1, by+3)], fill=VERDIGRIS, outline=OUTLINE)
    d.polygon([(bx-r, by), (bx-r-4, by-3), (bx-r-1, by+3)], fill=VERDIGRIS, outline=OUTLINE)
    return img

def draw_hellhound_morningstar():
    img = Image.new("RGBA", (W_LONG, H_LONG), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    IRON = (40, 35, 40, 255)
    EMBER = (249, 115, 22, 255)
    FIRE = (239, 68, 68, 255)
    draw_standard_haft(d, haft_col=IRON, wrap_col=EMBER, pommel_col=FIRE, ferrule_col=IRON)
    # Glowing ember chain
    d.ellipse([23, 13, 27, 18], fill=EMBER, outline=OUTLINE)
    d.ellipse([26, 17, 30, 22], fill=IRON, outline=OUTLINE)
    d.ellipse([29, 21, 33, 26], fill=EMBER, outline=OUTLINE)
    d.point([(25, 15), (31, 23)], fill=(255, 240, 150, 255))
    # 44KG brimstone kettlebell
    d.rounded_rectangle([30, 20, 38, 27], radius=2, fill=IRON, outline=OUTLINE)
    bx, by, r = 44, 23, 8
    d.ellipse([bx-r, by-r, bx+r, by+r], fill=(60, 40, 45, 255), outline=OUTLINE, width=2)
    draw_num(d, bx, by+1, "44", EMBER)
    # Hellhound horn spikes
    d.polygon([(bx+r, by-2), (bx+r+4, by), (bx+r, by+2)], fill=FIRE, outline=OUTLINE)
    d.polygon([(bx+5, by-6), (bx+9, by-9), (bx+7, by-4)], fill=EMBER, outline=OUTLINE)
    d.polygon([(bx-2, by+r), (bx, by+r+4), (bx+2, by+r)], fill=FIRE, outline=OUTLINE)
    return img

def draw_crypt_morningstar():
    img = Image.new("RGBA", (W_LONG, H_LONG), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    SILVER = (190, 200, 215, 255)
    CYAN_SMOKE = (103, 232, 249, 255)
    DARK_SILVER = (100, 110, 125, 255)
    draw_standard_haft(d, haft_col=DARK_SILVER, wrap_col=SILVER, pommel_col=CYAN_SMOKE, ferrule_col=SILVER)
    # Silver censer chain
    d.ellipse([23, 13, 27, 18], fill=SILVER, outline=OUTLINE)
    d.ellipse([26, 17, 30, 22], fill=SILVER, outline=OUTLINE)
    d.ellipse([29, 21, 33, 26], fill=SILVER, outline=OUTLINE)
    # 40KG ceremonial cathedral censer
    d.rounded_rectangle([30, 20, 38, 27], radius=2, fill=DARK_SILVER, outline=OUTLINE)
    bx, by, r = 44, 23, 8
    d.polygon([(bx-r, by-r+2), (bx+r, by-r+2), (bx+r-2, by+r), (bx-r+2, by+r)], fill=SILVER, outline=OUTLINE)
    # Censer vents / soul smoke
    d.point([(bx-3, by-2), (bx+3, by-2)], fill=CYAN_SMOKE)
    d.point([(bx-2, by+3), (bx+2, by+3)], fill=CYAN_SMOKE)
    draw_num(d, bx, by+1, "40", (25, 30, 40, 255))
    # Holy spikes
    d.polygon([(bx+r, by), (bx+r+4, by), (bx+r, by+2)], fill=SILVER, outline=OUTLINE)
    return img

def draw_frost_morningstar():
    img = Image.new("RGBA", (W_LONG, H_LONG), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    ICE = (147, 197, 253, 255)
    WHITE_FROST = (240, 249, 255, 255)
    DARK_ICE = (30, 64, 175, 255)
    draw_standard_haft(d, haft_col=(60, 70, 85, 255), wrap_col=ICE, pommel_col=WHITE_FROST, ferrule_col=DARK_ICE)
    # Frost crystal chain
    d.ellipse([23, 13, 27, 18], fill=ICE, outline=OUTLINE)
    d.ellipse([26, 17, 30, 22], fill=WHITE_FROST, outline=OUTLINE)
    d.ellipse([29, 21, 33, 26], fill=ICE, outline=OUTLINE)
    # 48KG permafrost glacial kettlebell
    d.rounded_rectangle([30, 20, 38, 27], radius=2, fill=DARK_ICE, outline=OUTLINE)
    bx, by, r = 44, 23, 8
    d.ellipse([bx-r, by-r, bx+r, by+r], fill=ICE, outline=OUTLINE, width=2)
    d.point([(bx-3, by-3), (bx-2, by-4)], fill=WHITE_FROST)
    draw_num(d, bx, by+1, "48", DARK_ICE)
    # Icicle spikes
    d.polygon([(bx+r, by-2), (bx+r+5, by), (bx+r, by+2)], fill=WHITE_FROST, outline=OUTLINE)
    d.polygon([(bx+5, by+5), (bx+9, by+9), (bx+6, by+4)], fill=ICE, outline=OUTLINE)
    d.polygon([(bx-2, by+r), (bx, by+r+4), (bx+2, by+r)], fill=WHITE_FROST, outline=OUTLINE)
    return img

def draw_troll_morningstar():
    img = Image.new("RGBA", (W_LONG, H_LONG), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    BARK = (70, 45, 25, 255)
    RIVER_STONE = (110, 115, 125, 255)
    CHAIN_IRON = (75, 80, 90, 255)
    WARPAINT = (220, 38, 38, 255)
    draw_standard_haft(d, haft_col=BARK, wrap_col=(120, 80, 50, 255), pommel_col=BARK, ferrule_col=CHAIN_IRON)
    # Heavy logging iron chain
    d.ellipse([23, 13, 27, 18], fill=CHAIN_IRON, outline=OUTLINE)
    d.ellipse([26, 17, 30, 22], fill=CHAIN_IRON, outline=OUTLINE)
    d.ellipse([29, 21, 33, 26], fill=CHAIN_IRON, outline=OUTLINE)
    # 68KG crude river-boulder bell
    d.rounded_rectangle([30, 20, 38, 27], radius=2, fill=BARK, outline=OUTLINE)
    bx, by, r = 44, 23, 9
    d.ellipse([bx-r, by-r, bx+r, by+r], fill=RIVER_STONE, outline=OUTLINE, width=2)
    # Warpaint stripes
    d.line([(bx-5, by-2), (bx+5, by-2)], fill=WARPAINT)
    draw_num(d, bx, by+2, "68", (255, 255, 255, 255))
    # Rough stone spikes
    d.polygon([(bx+r, by-2), (bx+r+4, by), (bx+r, by+2)], fill=RIVER_STONE, outline=OUTLINE)
    d.polygon([(bx-2, by+r), (bx, by+r+4), (bx+2, by+r)], fill=RIVER_STONE, outline=OUTLINE)
    return img

# ==================== SWORDS (64x34) ====================

# ==================== SWORDS (64x34) - KETTLEBELL BLADES ====================

def draw_boar_sword():
    img = Image.new("RGBA", (W_LONG, H_LONG), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    STEEL = (180, 190, 205, 255)
    STEEL_LIGHT = (225, 235, 245, 255)
    IVORY = (245, 240, 220, 255)
    IRON_DARK = (45, 50, 60, 255)
    IRON_MID = (70, 78, 90, 255)
    
    # 1. Grip (x: 8..18, y: 14..18) & Pommel
    d.rectangle([8, 14, 18, 18], fill=(120, 45, 35, 255), outline=OUTLINE)
    for x in range(9, 18, 3):
        d.line([(x, 14), (x+1, 18)], fill=(160, 70, 50, 255))
    d.ellipse([4, 13, 8, 19], fill=IRON_MID, outline=OUTLINE)
    
    # 2. Prominent 32KG Kettlebell Guard (x: 18..36, y: 6..26)
    # Kettlebell Handle / Guard loop
    d.rounded_rectangle([18, 8, 30, 24], radius=4, fill=IRON_DARK, outline=OUTLINE, width=2)
    d.rounded_rectangle([21, 11, 26, 21], radius=2, fill=(0, 0, 0, 0), outline=OUTLINE, width=1)
    
    # Boar tusk quillons sweeping from the kettlebell
    d.polygon([(18, 5), (25, 3), (22, 10)], fill=IVORY, outline=OUTLINE)
    d.polygon([(18, 27), (25, 29), (22, 22)], fill=IVORY, outline=OUTLINE)
    
    # Spherical Bell Body at x: 24..38, y: 7..25
    d.ellipse([24, 7, 38, 25], fill=IRON_MID, outline=OUTLINE, width=2)
    d.arc([25, 8, 37, 24], 140, 260, fill=STEEL_LIGHT, width=1)
    # Stamped 32
    d.ellipse([27, 11, 35, 21], fill=IRON_DARK, outline=OUTLINE)
    draw_num(d, 31, 16, "32", (255, 255, 255, 255))
    
    # 3. Serrated Hunting Blade projecting from the bell (x: 36..62, y: 11..21)
    d.polygon([(36, 12), (58, 11), (63, 16), (58, 21), (36, 20)], fill=STEEL, outline=OUTLINE)
    d.line([(37, 16), (58, 16)], fill=STEEL_LIGHT)
    # Serrations on lower edge
    for sx in range(40, 54, 5):
        d.polygon([(sx, 20), (sx+2, 23), (sx+4, 20)], fill=STEEL, outline=OUTLINE)
    return img

def draw_wolf_sword():
    img = Image.new("RGBA", (W_LONG, H_LONG), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    STEEL = (195, 210, 230, 255)
    STEEL_LIGHT = (240, 248, 255, 255)
    FUR = (45, 50, 65, 255)
    BLUE_IRON = (50, 65, 85, 255)
    BLUE_MID = (75, 95, 120, 255)
    AMBER = (245, 158, 11, 255)
    
    # 1. Grip (x: 8..18, y: 14..18) & Fur Pommel
    d.rectangle([8, 14, 18, 18], fill=FUR, outline=OUTLINE)
    d.ellipse([4, 13, 8, 19], fill=(70, 75, 90, 255), outline=OUTLINE)
    
    # 2. Prominent 24KG Wolf Kettlebell Guard (x: 18..36, y: 7..25)
    d.rounded_rectangle([18, 8, 30, 24], radius=4, fill=BLUE_IRON, outline=OUTLINE, width=2)
    d.rounded_rectangle([21, 11, 26, 21], radius=2, fill=(0, 0, 0, 0), outline=OUTLINE, width=1)
    
    # Wolf ear crossguard spikes
    d.polygon([(20, 6), (23, 2), (24, 9)], fill=BLUE_MID, outline=OUTLINE)
    d.polygon([(20, 26), (23, 30), (24, 23)], fill=BLUE_MID, outline=OUTLINE)
    
    # Spherical Bell Body at x: 24..38, y: 7..25
    d.ellipse([24, 7, 38, 25], fill=BLUE_MID, outline=OUTLINE, width=2)
    d.point([(27, 10)], fill=AMBER) # amber eye glint
    # Stamped 24
    d.ellipse([27, 11, 35, 21], fill=BLUE_IRON, outline=OUTLINE)
    draw_num(d, 31, 16, "24", (220, 235, 255, 255))
    
    # 3. Curved Predator Saber Blade projecting from the bell (x: 36..62)
    d.polygon([(36, 13), (56, 10), (63, 15), (56, 19), (36, 18)], fill=STEEL, outline=OUTLINE)
    d.line([(37, 15), (57, 12)], fill=STEEL_LIGHT)
    return img

def draw_minotaur_sword():
    img = Image.new("RGBA", (W_LONG, H_LONG), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    BRONZE_DARK = (130, 75, 30, 255)
    BRONZE_MID = (185, 120, 50, 255)
    BRONZE_LIGHT = (235, 175, 95, 255)
    STEEL = (175, 180, 190, 255)
    STEEL_LIGHT = (235, 240, 250, 255)
    HORN = (65, 40, 25, 255)
    
    # 1. Grip (x: 8..18, y: 14..18) & Heavy Bronze Pommel
    d.rectangle([8, 14, 18, 18], fill=(110, 45, 25, 255), outline=OUTLINE)
    d.rectangle([4, 13, 8, 19], fill=BRONZE_MID, outline=OUTLINE)
    
    # 2. Prominent 50KG Bronze Kettlebell Guard (x: 18..36, y: 6..26)
    d.rounded_rectangle([18, 8, 30, 24], radius=4, fill=BRONZE_DARK, outline=OUTLINE, width=2)
    d.rounded_rectangle([21, 11, 26, 21], radius=2, fill=(0, 0, 0, 0), outline=OUTLINE, width=1)
    
    # Sweeping Minotaur Bull Horns as Crossguards
    d.polygon([(18, 6), (25, 2), (23, 10)], fill=HORN, outline=OUTLINE)
    d.polygon([(18, 26), (25, 30), (23, 22)], fill=HORN, outline=OUTLINE)
    
    # Spherical Bell Body at x: 24..38, y: 7..25
    d.ellipse([24, 7, 38, 25], fill=BRONZE_MID, outline=OUTLINE, width=2)
    d.arc([25, 8, 37, 24], 140, 260, fill=BRONZE_LIGHT, width=1)
    # Stamped 50
    d.ellipse([27, 11, 35, 21], fill=BRONZE_DARK, outline=OUTLINE)
    draw_num(d, 31, 16, "50", (255, 245, 200, 255))
    
    # 3. Massive Executioner Cleaver Blade projecting from the bell (x: 36..62, y: 9..23)
    d.polygon([(36, 11), (58, 9), (62, 16), (58, 23), (36, 21)], fill=STEEL, outline=OUTLINE)
    # Bronze core inlay on blade
    d.rectangle([39, 14, 48, 18], fill=BRONZE_MID, outline=OUTLINE)
    d.line([(37, 16), (58, 16)], fill=STEEL_LIGHT)
    return img

def draw_dragon_sword():
    img = Image.new("RGBA", (W_LONG, H_LONG), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    SCARLET_DARK = (130, 20, 20, 255)
    SCARLET = (195, 30, 30, 255)
    GOLD = (245, 158, 11, 255)
    LAVA = (252, 211, 77, 255)
    BONE = (45, 30, 30, 255)
    
    # 1. Grip (x: 8..18, y: 14..18) & Dragon Horn Pommel
    d.rectangle([8, 14, 18, 18], fill=BONE, outline=OUTLINE)
    d.polygon([(3, 16), (7, 12), (8, 16), (7, 20)], fill=SCARLET_DARK, outline=OUTLINE)
    
    # 2. Prominent 88KG Dragon Heart Kettlebell Guard (x: 18..36, y: 6..26)
    d.rounded_rectangle([18, 8, 30, 24], radius=4, fill=SCARLET_DARK, outline=OUTLINE, width=2)
    d.rounded_rectangle([21, 11, 26, 21], radius=2, fill=(0, 0, 0, 0), outline=OUTLINE, width=1)
    
    # Dragon wing quillons flaring out
    d.polygon([(18, 6), (25, 2), (23, 10)], fill=SCARLET, outline=OUTLINE)
    d.polygon([(18, 26), (25, 30), (23, 22)], fill=SCARLET, outline=OUTLINE)
    
    # Spherical Bell Body at x: 24..38, y: 7..25
    d.ellipse([24, 7, 38, 25], fill=SCARLET, outline=OUTLINE, width=2)
    d.line([(26, 12), (29, 14)], fill=LAVA) # Magma crack
    # Stamped 88
    d.ellipse([27, 11, 35, 21], fill=SCARLET_DARK, outline=OUTLINE)
    draw_num(d, 31, 16, "88", GOLD)
    
    # 3. Scorched Jagged Greatsword Blade projecting from bell (x: 36..62, y: 10..22)
    d.polygon([(36, 12), (58, 10), (63, 16), (58, 22), (36, 20)], fill=SCARLET, outline=OUTLINE)
    d.line([(37, 16), (58, 16)], fill=GOLD, width=2)
    d.point([(61, 15), (62, 16), (61, 17)], fill=LAVA) # Molten flame tip
    return img

def draw_void_sword():
    img = Image.new("RGBA", (W_LONG, H_LONG), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    VOID_DARK = (25, 10, 40, 255)
    PURPLE = (168, 85, 247, 255)
    PURPLE_LIGHT = (216, 180, 254, 255)
    CYAN = (0, 245, 140, 255)
    
    # 1. Grip (x: 8..18, y: 14..18) & Singularity Pommel
    d.rectangle([8, 14, 18, 18], fill=VOID_DARK, outline=OUTLINE)
    d.ellipse([4, 13, 8, 19], fill=PURPLE, outline=OUTLINE)
    
    # 2. Prominent 108KG Void Singularity Kettlebell Guard (x: 18..36, y: 6..26)
    d.rounded_rectangle([18, 8, 30, 24], radius=4, fill=VOID_DARK, outline=OUTLINE, width=2)
    d.rounded_rectangle([21, 11, 26, 21], radius=2, fill=(0, 0, 0, 0), outline=OUTLINE, width=1)
    
    # Astral void energy quillons
    d.line([(20, 4), (20, 28)], fill=CYAN, width=2)
    d.point([(19, 3), (21, 3), (19, 29), (21, 29)], fill=PURPLE_LIGHT)
    
    # Spherical Bell Body at x: 24..38, y: 7..25
    d.ellipse([24, 7, 38, 25], fill=PURPLE, outline=OUTLINE, width=2)
    # Stamped 108
    d.ellipse([27, 11, 35, 21], fill=VOID_DARK, outline=OUTLINE)
    draw_num(d, 31, 16, "108", CYAN)
    
    # 3. Obsidian Void Blade projecting from bell (x: 36..62, y: 11..21)
    d.polygon([(36, 12), (58, 11), (63, 16), (58, 21), (36, 20)], fill=VOID_DARK, outline=OUTLINE)
    d.line([(37, 16), (58, 16)], fill=PURPLE, width=2)
    d.line([(38, 16), (56, 16)], fill=CYAN)
    return img


# ==================== BELLS (40x40) ====================

def draw_treemon_bell():
    img = Image.new("RGBA", (W_BELL, H_BELL), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    BARK = (80, 50, 30, 255)
    LEAF = (34, 197, 94, 255)
    RUNIC = (134, 239, 172, 255)
    # Living ironwood handle (x: 10..30, y: 4..16)
    d.rounded_rectangle([10, 4, 30, 16], radius=4, fill=BARK, outline=OUTLINE, width=2)
    d.rounded_rectangle([14, 7, 26, 15], radius=2, fill=(0, 0, 0, 0), outline=OUTLINE, width=1)
    # Sprouting leaves on horns
    d.point([(10, 4), (11, 3), (30, 4), (29, 3)], fill=LEAF)
    # 36KG ironwood bell body (cx=20, cy=24, r=12)
    bx, by, r = 20, 24, 12
    d.ellipse([bx-r, by-r, bx+r, by+r], fill=BARK, outline=OUTLINE, width=2)
    d.polygon([(bx-5, by+r-1), (bx+5, by+r-1), (bx+4, by+r+1), (bx-4, by+r+1)], fill=BARK, outline=OUTLINE)
    # Wood grain shading
    d.arc([bx-r+2, by-r+2, bx+r-2, by+r-2], 45, 160, fill=(50, 30, 15, 255), width=2)
    d.arc([bx-r+2, by-r+2, bx+r-2, by+r-2], 190, 310, fill=(110, 75, 45, 255), width=2)
    # Glowing sylvan runes & weight 36
    draw_num(d, bx, by, "36", RUNIC)
    return img

def draw_golem_bell():
    img = Image.new("RGBA", (W_BELL, H_BELL), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    STONE = (120, 125, 135, 255)
    IRON = (50, 55, 65, 255)
    CYAN = (56, 182, 255, 255)
    # Rebar-reinforced handle
    d.rounded_rectangle([10, 4, 30, 16], radius=4, fill=IRON, outline=OUTLINE, width=2)
    d.rounded_rectangle([14, 7, 26, 15], radius=2, fill=(0, 0, 0, 0), outline=OUTLINE, width=1)
    # 72KG granite boulder bell body
    bx, by, r = 20, 24, 12
    d.ellipse([bx-r, by-r, bx+r, by+r], fill=STONE, outline=OUTLINE, width=2)
    d.polygon([(bx-6, by+r-1), (bx+6, by+r-1), (bx+5, by+r+1), (bx-5, by+r+1)], fill=STONE, outline=OUTLINE)
    # Stone chisel cracks
    d.line([(bx-8, by-2), (bx-4, by)], fill=CYAN)
    d.line([(bx+4, by), (bx+8, by+4)], fill=CYAN)
    # Iron reinforcement band
    d.line([(bx-r+1, by+4), (bx+r-1, by+4)], fill=IRON)
    draw_num(d, bx, by-2, "72", (245, 250, 255, 255))
    return img

def draw_mushroom_bell():
    img = Image.new("RGBA", (W_BELL, H_BELL), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    FUNGUS = (107, 33, 168, 255)
    SPORE_TEAL = (20, 184, 166, 255)
    WARTS = (236, 72, 153, 255)
    # Spore handle with cap horns
    d.rounded_rectangle([10, 4, 30, 16], radius=4, fill=FUNGUS, outline=OUTLINE, width=2)
    d.rounded_rectangle([14, 7, 26, 15], radius=2, fill=(0, 0, 0, 0), outline=OUTLINE, width=1)
    d.ellipse([8, 3, 12, 7], fill=WARTS)
    d.ellipse([28, 3, 32, 7], fill=WARTS)
    # 20KG mushroom cap bell
    bx, by, r = 20, 24, 12
    d.ellipse([bx-r, by-r, bx+r, by+r], fill=FUNGUS, outline=OUTLINE, width=2)
    d.polygon([(bx-5, by+r-1), (bx+5, by+r-1), (bx+4, by+r+1), (bx-4, by+r+1)], fill=SPORE_TEAL, outline=OUTLINE)
    # Glowing spore dots
    d.point([(bx-5, by-4), (bx+5, by-3), (bx-4, by+4), (bx+4, by+5)], fill=SPORE_TEAL)
    draw_num(d, bx, by, "20", (255, 255, 255, 255))
    return img

def draw_harpy_bell():
    img = Image.new("RGBA", (W_BELL, H_BELL), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    SKY_BRONZE = (195, 145, 65, 255)
    FEATHER = (220, 235, 250, 255)
    TALON = (55, 45, 35, 255)
    # Eagle talon handle
    d.rounded_rectangle([10, 4, 30, 16], radius=4, fill=TALON, outline=OUTLINE, width=2)
    d.rounded_rectangle([14, 7, 26, 15], radius=2, fill=(0, 0, 0, 0), outline=OUTLINE, width=1)
    # Feathers on handle
    d.polygon([(11, 2), (14, 5), (10, 5)], fill=FEATHER)
    d.polygon([(29, 2), (26, 5), (30, 5)], fill=FEATHER)
    # 30KG polished bronze bell
    bx, by, r = 20, 24, 12
    d.ellipse([bx-r, by-r, bx+r, by+r], fill=SKY_BRONZE, outline=OUTLINE, width=2)
    d.polygon([(bx-5, by+r-1), (bx+5, by+r-1), (bx+4, by+r+1), (bx-4, by+r+1)], fill=SKY_BRONZE, outline=OUTLINE)
    # Talons gripping the sphere
    d.line([(bx-r, by-3), (bx-r+3, by+1)], fill=TALON, width=2)
    d.line([(bx+r, by-3), (bx+r-3, by+1)], fill=TALON, width=2)
    draw_num(d, bx, by, "30", (255, 255, 255, 255))
    return img

def draw_eldritch_bell():
    img = Image.new("RGBA", (W_BELL, H_BELL), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    FLESH = (55, 20, 75, 255)
    TENTACLE = (147, 51, 234, 255)
    GOLD_EYE = (245, 158, 11, 255)
    SLIT = (20, 10, 30, 255)
    # Writhing tentacle handle
    d.rounded_rectangle([10, 4, 30, 16], radius=4, fill=TENTACLE, outline=OUTLINE, width=2)
    d.rounded_rectangle([14, 7, 26, 15], radius=2, fill=(0, 0, 0, 0), outline=OUTLINE, width=1)
    # 120KG cosmic flesh bell
    bx, by, r = 20, 24, 12
    d.ellipse([bx-r, by-r, bx+r, by+r], fill=FLESH, outline=OUTLINE, width=2)
    d.polygon([(bx-5, by+r-1), (bx+5, by+r-1), (bx+4, by+r+1), (bx-4, by+r+1)], fill=FLESH, outline=OUTLINE)
    # GIANT CENTRAL EYE!
    d.ellipse([bx-7, by-5, bx+7, by+5], fill=GOLD_EYE, outline=OUTLINE)
    d.polygon([(bx, by-4), (bx+1, by), (bx, by+4), (bx-1, by)], fill=SLIT)
    draw_num(d, bx, by+7, "120", (200, 160, 255, 255))
    return img

# ==================== RENDER ALL 22 TO PREVIEW SHEET ====================

weapons = [
    # Maces
    ("goblin_mace", draw_goblin_mace(), "Mace", "16kg"),
    ("skeleton_mace", draw_skeleton_mace(), "Mace", "32kg"),
    ("inferno_mace", draw_inferno_mace(), "Mace", "90kg"),
    ("cemetery_mace", draw_cemetery_mace(), "Mace", "54kg"),
    ("belfry_mace", draw_belfry_mace(), "Mace", "60kg"),
    # Morningstars
    ("spider_morningstar", draw_spider_morningstar(), "Morningstar", "28kg"),
    ("slime_morningstar", draw_slime_morningstar(), "Morningstar", "24kg"),
    ("kraken_morningstar", draw_kraken_morningstar(), "Morningstar", "80kg"),
    ("hellhound_morningstar", draw_hellhound_morningstar(), "Morningstar", "44kg"),
    ("crypt_morningstar", draw_crypt_morningstar(), "Morningstar", "40kg"),
    ("frost_morningstar", draw_frost_morningstar(), "Morningstar", "48kg"),
    ("troll_morningstar", draw_troll_morningstar(), "Morningstar", "68kg"),
    # Swords
    ("boar_sword", draw_boar_sword(), "Sword", "32kg"),
    ("wolf_sword", draw_wolf_sword(), "Sword", "24kg"),
    ("minotaur_sword", draw_minotaur_sword(), "Sword", "50kg"),
    ("dragon_sword", draw_dragon_sword(), "Sword", "88kg"),
    ("void_sword", draw_void_sword(), "Sword", "108kg"),
    # Bells
    ("treemon_bell", draw_treemon_bell(), "Bell", "36kg"),
    ("golem_bell", draw_golem_bell(), "Bell", "72kg"),
    ("mushroom_bell", draw_mushroom_bell(), "Bell", "20kg"),
    ("harpy_bell", draw_harpy_bell(), "Bell", "30kg"),
    ("eldritch_bell", draw_eldritch_bell(), "Bell", "120kg"),
]

print(f"Generated {len(weapons)} weapons successfully!")

# Make preview sheet
cols = 4
rows = (len(weapons) + cols - 1) // cols
cell_w, cell_h = 74, 46
sheet = Image.new("RGBA", (cols * cell_w + 10, rows * cell_h + 10), (15, 14, 23, 255))

for i, (name, img, cat, weight) in enumerate(weapons):
    r = i // cols
    c = i % cols
    x = 10 + c * cell_w
    y = 10 + r * cell_h
    # Center image in cell
    ox = (cell_w - img.width) // 2
    oy = (cell_h - img.height) // 2
    sheet.paste(img, (x + ox, y + oy), img)

sheet.save("work/monster_weapons_preview.png")
print("Saved work/monster_weapons_preview.png")
