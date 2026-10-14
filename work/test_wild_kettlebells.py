from PIL import Image, ImageDraw
import numpy as np

# We can give each kettlebell a dedicated canvas, say 64x48 or 70x42
W, H = 70, 36

def draw_iron_kettlebell():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    OUTLINE = (18, 22, 28, 255)
    IRON_DARK = (45, 52, 62, 255)
    IRON_MID = (75, 86, 100, 255)
    IRON_LIGHT = (125, 138, 155, 255)
    STEEL_EDGE = (195, 208, 222, 255)
    RUST = (120, 65, 40, 255)
    BRIGHT = (240, 245, 255, 255)
    
    # Hand grip / Shaft extending to bell (x: 2..22, y: 15..21)
    # The knight holds the thick iron shaft leading into the kettlebell handle
    d.ellipse([1, 14, 7, 22], outline=OUTLINE, width=1)
    d.ellipse([2, 15, 6, 21], fill=IRON_MID, outline=IRON_DARK)
    d.line([(7, 16), (22, 16)], fill=OUTLINE)
    d.line([(7, 20), (22, 20)], fill=OUTLINE)
    for x in range(7, 22, 2):
        d.line([(x, 17), (x+1, 19)], fill=(60, 45, 35, 255))
        d.point([(x, 17)], fill=(120, 90, 70, 255))
        
    # KETTLEBELL HANDLE (Arching prominently: x: 20..38, y: 4..24)
    # The thick curved loop of the kettlebell!
    d.arc([19, 4, 38, 26], 180, 360, fill=OUTLINE, width=4)
    d.arc([21, 6, 36, 24], 180, 360, fill=IRON_MID, width=2)
    d.arc([22, 7, 35, 23], 210, 330, fill=IRON_LIGHT, width=1)
    d.point([(27, 6), (28, 6), (29, 6)], fill=STEEL_EDGE)
    
    # MASSIVE KETTLEBELL BODY (x: 32..66, y: 3..33)
    # Round sphere with flat bottom on the right/bottom
    d.ellipse([32, 3, 64, 33], fill=IRON_MID, outline=OUTLINE, width=1)
    # Flat base of the kettlebell
    d.polygon([(56, 4), (64, 11), (64, 25), (56, 32)], fill=IRON_DARK, outline=OUTLINE)
    
    # Spherical 3D shading
    d.ellipse([34, 5, 62, 31], fill=IRON_DARK)
    d.arc([35, 6, 59, 30], 110, 290, fill=IRON_MID, width=3)
    d.arc([36, 7, 57, 28], 140, 260, fill=IRON_LIGHT, width=2)
    
    # Specular curved highlight on top left curve
    d.arc([37, 8, 55, 26], 160, 240, fill=STEEL_EDGE, width=1)
    d.point([(40, 11), (41, 11), (42, 10), (43, 10)], fill=BRIGHT)
    
    # Cast iron weight marking "48" and "KG"
    # "48"
    d.line([(44, 15), (44, 19)], fill=RUST, width=1)
    d.line([(44, 19), (47, 19)], fill=RUST, width=1)
    d.line([(47, 15), (47, 23)], fill=RUST, width=1)
    
    d.rectangle([49, 15, 52, 23], outline=RUST)
    d.line([(49, 19), (52, 19)], fill=RUST)
    
    # "KG"
    d.point([(44, 25), (44, 26), (44, 27), (45, 26), (46, 25), (46, 27)], fill=IRON_LIGHT)
    d.point([(48, 25), (49, 25), (48, 26), (48, 27), (49, 27), (50, 26), (50, 27)], fill=IRON_LIGHT)
    
    # Brutal Spikes on the striking face of the bell (x=60..69)
    # Top spike
    d.polygon([(58, 7), (69, 5), (61, 12)], fill=IRON_LIGHT, outline=OUTLINE)
    d.line([(59, 8), (68, 6)], fill=STEEL_EDGE)
    # Middle mega impact spike
    d.polygon([(61, 14), (70, 18), (61, 22)], fill=IRON_LIGHT, outline=OUTLINE)
    d.line([(62, 16), (69, 18)], fill=BRIGHT)
    # Bottom spike
    d.polygon([(58, 29), (69, 31), (61, 24)], fill=IRON_LIGHT, outline=OUTLINE)
    d.line([(59, 28), (68, 30)], fill=STEEL_EDGE)
    
    return img

def draw_excalibur_bell():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    OUTLINE = (35, 18, 5, 255)
    GOLD_DARK = (160, 95, 15, 255)
    GOLD_MID = (244, 180, 26, 255)
    GOLD_LIGHT = (255, 230, 115, 255)
    GOLD_WHITE = (255, 252, 220, 255)
    SAPPHIRE = (25, 110, 240, 255)
    CYAN_GLOW = (56, 182, 255, 255)
    WHITE_GLINT = (255, 255, 255, 255)
    
    # Holy hilt wrapped in white/gold silk
    d.ellipse([1, 14, 7, 22], outline=OUTLINE, width=1)
    d.ellipse([2, 15, 6, 21], fill=GOLD_MID, outline=GOLD_DARK)
    d.point([(4, 18)], fill=CYAN_GLOW)
    
    d.line([(7, 16), (22, 16)], fill=OUTLINE)
    d.line([(7, 20), (22, 20)], fill=OUTLINE)
    for x in range(7, 22, 2):
        d.line([(x, 17), (x+1, 19)], fill=(220, 230, 245, 255))
        d.point([(x, 17)], fill=WHITE_GLINT)
        
    # HOLY HALO KETTLEBELL HANDLE (Arching with golden wings/rays)
    d.arc([19, 3, 38, 26], 180, 360, fill=OUTLINE, width=4)
    d.arc([21, 5, 36, 24], 180, 360, fill=GOLD_MID, width=2)
    d.arc([22, 6, 35, 23], 210, 330, fill=GOLD_LIGHT, width=1)
    # Halo crown cross on handle
    d.polygon([(27, 2), (30, 2), (28, 5)], fill=GOLD_WHITE, outline=OUTLINE)
    d.point([(28, 3)], fill=CYAN_GLOW)
    
    # GOLDEN KETTLEBELL BODY
    d.ellipse([32, 3, 64, 33], fill=GOLD_MID, outline=OUTLINE, width=1)
    d.ellipse([34, 5, 62, 31], fill=GOLD_DARK)
    d.arc([35, 6, 59, 30], 110, 290, fill=GOLD_MID, width=3)
    d.arc([36, 7, 57, 28], 140, 260, fill=GOLD_LIGHT, width=2)
    d.point([(40, 10), (41, 10), (42, 9)], fill=WHITE_GLINT)
    
    # Giant Glowing Sacred Sapphire Core on the bell face!
    d.ellipse([42, 12, 54, 24], fill=SAPPHIRE, outline=OUTLINE)
    d.ellipse([44, 14, 52, 22], fill=CYAN_GLOW)
    d.point([(46, 16), (47, 16)], fill=WHITE_GLINT)
    # Holy rays radiating from sapphire
    d.line([(48, 8), (48, 11)], fill=GOLD_WHITE)
    d.line([(48, 25), (48, 28)], fill=GOLD_DARK)
    d.line([(38, 18), (41, 18)], fill=GOLD_WHITE)
    d.line([(55, 18), (58, 18)], fill=GOLD_WHITE)
    
    # Angelic Holy War Flanges / Sunblades on the front (x=60..70)
    d.polygon([(56, 5), (69, 2), (62, 13)], fill=GOLD_LIGHT, outline=OUTLINE)
    d.polygon([(60, 14), (70, 18), (60, 22)], fill=GOLD_WHITE, outline=OUTLINE)
    d.polygon([(56, 31), (69, 34), (62, 23)], fill=GOLD_MID, outline=OUTLINE)
    d.line([(58, 6), (68, 3)], fill=WHITE_GLINT)
    d.line([(61, 16), (69, 18)], fill=WHITE_GLINT)
    
    return img

def draw_dragon_kettlebell():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    OUTLINE = (25, 5, 5, 255)
    OBSIDIAN = (45, 12, 18, 255)
    CRIMSON = (175, 22, 25, 255)
    MOLTEN_RED = (220, 38, 38, 255)
    LAVA_ORANGE = (245, 158, 11, 255)
    FIRE_YELLOW = (251, 191, 36, 255)
    WHITE_HEAT = (255, 250, 210, 255)
    
    # Dragon bone hilt
    d.ellipse([1, 14, 7, 22], outline=OUTLINE, width=1)
    d.ellipse([2, 15, 6, 21], fill=OBSIDIAN, outline=OUTLINE)
    d.point([(4, 18)], fill=LAVA_ORANGE)
    
    d.line([(7, 16), (22, 16)], fill=OUTLINE)
    d.line([(7, 20), (22, 20)], fill=OUTLINE)
    for x in range(7, 22, 2):
        d.line([(x, 17), (x+1, 19)], fill=OBSIDIAN)
        d.point([(x, 17)], fill=LAVA_ORANGE)
        
    # DRAGON HORN KETTLEBELL HANDLE (Twisted interlocking demonic horns!)
    d.arc([19, 2, 38, 26], 180, 360, fill=OUTLINE, width=4)
    d.arc([21, 4, 36, 24], 180, 360, fill=LAVA_ORANGE, width=2)
    d.arc([22, 5, 35, 23], 210, 330, fill=FIRE_YELLOW, width=1)
    # Horn ridges/spikes
    d.polygon([(20, 5), (17, 1), (23, 3)], fill=LAVA_ORANGE, outline=OUTLINE)
    d.polygon([(34, 5), (37, 1), (32, 3)], fill=LAVA_ORANGE, outline=OUTLINE)
    
    # LIVING DRAGON MAW KETTLEBELL BODY
    d.ellipse([32, 3, 64, 33], fill=CRIMSON, outline=OUTLINE, width=1)
    d.ellipse([34, 5, 62, 31], fill=OBSIDIAN)
    
    # Molten Magma Dragon Eye on top of bell
    d.polygon([(39, 9), (44, 7), (47, 11), (42, 13)], fill=FIRE_YELLOW, outline=OUTLINE)
    d.line([(43, 8), (43, 12)], fill=OUTLINE) # slit pupil
    d.point([(42, 9)], fill=WHITE_HEAT)
    
    # Roaring Open Dragon Mouth inside bell face!
    d.polygon([(46, 12), (64, 9), (58, 18), (64, 27), (46, 24)], fill=(20, 5, 5, 255), outline=OUTLINE)
    # Roaring Fire Core inside mouth
    d.ellipse([48, 14, 56, 22], fill=MOLTEN_RED)
    d.ellipse([50, 16, 54, 20], fill=FIRE_YELLOW)
    d.point([(52, 18)], fill=WHITE_HEAT)
    
    # Dragon Teeth / Fangs
    d.polygon([(48, 12), (51, 15), (54, 12)], fill=WHITE_HEAT, outline=OUTLINE) # top fang
    d.polygon([(56, 11), (59, 14), (62, 10)], fill=WHITE_HEAT, outline=OUTLINE)
    d.polygon([(48, 24), (51, 21), (54, 24)], fill=WHITE_HEAT, outline=OUTLINE) # bottom fang
    d.polygon([(56, 25), (59, 22), (62, 26)], fill=WHITE_HEAT, outline=OUTLINE)
    
    # Molten fire breath burst coming out of the mouth (striking face)
    d.polygon([(60, 14), (70, 18), (60, 22)], fill=FIRE_YELLOW, outline=LAVA_ORANGE)
    d.line([(62, 17), (69, 18)], fill=WHITE_HEAT)
    
    # Magma veins on bell shell
    d.line([(36, 18), (44, 22)], fill=LAVA_ORANGE)
    d.line([(38, 25), (44, 27)], fill=MOLTEN_RED)
    
    return img

def draw_void_bell():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    OUTLINE = (12, 5, 22, 255)
    VOID_DEEP = (30, 8, 48, 255)
    PURPLE_MID = (107, 33, 168, 255)
    LILAC_LIGHT = (192, 132, 252, 255)
    VOID_WHITE = (245, 225, 255, 255)
    EMERALD = (0, 160, 90, 255)
    EMERALD_NEON = (0, 245, 140, 255)
    WHITE_GLINT = (255, 255, 255, 255)
    
    # Cosmic void hilt
    d.ellipse([1, 14, 7, 22], outline=OUTLINE, width=1)
    d.ellipse([2, 15, 6, 21], fill=PURPLE_MID, outline=OUTLINE)
    d.point([(4, 18)], fill=EMERALD_NEON)
    
    d.line([(7, 16), (22, 16)], fill=OUTLINE)
    d.line([(7, 20), (22, 20)], fill=OUTLINE)
    for x in range(7, 22, 2):
        d.line([(x, 17), (x+1, 19)], fill=VOID_DEEP)
        d.point([(x, 17)], fill=LILAC_LIGHT)
        
    # DARK MATTER TENTACLE / GRAVITY ARC KETTLEBELL HANDLE
    d.arc([19, 3, 38, 26], 180, 360, fill=OUTLINE, width=4)
    d.arc([21, 5, 36, 24], 180, 360, fill=PURPLE_MID, width=2)
    d.arc([22, 6, 35, 23], 210, 330, fill=LILAC_LIGHT, width=1)
    # Singularity horn crystals
    d.polygon([(21, 4), (18, 0), (24, 2)], fill=LILAC_LIGHT, outline=OUTLINE)
    d.polygon([(34, 4), (37, 0), (32, 2)], fill=LILAC_LIGHT, outline=OUTLINE)
    
    # COSMIC BLACK HOLE KETTLEBELL BODY
    d.ellipse([32, 3, 64, 33], fill=PURPLE_MID, outline=OUTLINE, width=1)
    d.ellipse([34, 5, 62, 31], fill=VOID_DEEP)
    d.arc([35, 6, 59, 30], 110, 290, fill=PURPLE_MID, width=3)
    d.arc([36, 7, 57, 28], 140, 260, fill=LILAC_LIGHT, width=2)
    
    # Accretion ring around the black hole
    d.ellipse([38, 10, 58, 26], outline=LILAC_LIGHT)
    
    # THE VOID EYE (Unblinking emerald singularity gazing from the bell center)
    d.ellipse([42, 12, 54, 24], fill=EMERALD, outline=OUTLINE)
    d.ellipse([44, 14, 52, 22], fill=EMERALD_NEON)
    d.line([(48, 13), (48, 23)], fill=VOID_DEEP, width=2) # Cosmic pupil
    d.point([(46, 16)], fill=WHITE_GLINT)
    
    # Floating Eldritch Gravity Blades / Obsidian Shards projecting forward
    d.polygon([(56, 4), (69, 1), (61, 12)], fill=PURPLE_MID, outline=OUTLINE)
    d.polygon([(60, 13), (70, 18), (60, 23)], fill=LILAC_LIGHT, outline=OUTLINE)
    d.polygon([(56, 32), (69, 35), (61, 24)], fill=PURPLE_MID, outline=OUTLINE)
    d.line([(58, 5), (68, 2)], fill=VOID_WHITE)
    d.line([(61, 16), (69, 18)], fill=EMERALD_NEON)
    
    # Infinity weight marking "∞ KG"
    d.ellipse([36, 15, 39, 19], outline=LILAC_LIGHT)
    d.ellipse([38, 15, 41, 19], outline=LILAC_LIGHT)
    
    return img

i = draw_iron_kettlebell()
i.save('work/wild_iron.png')

e = draw_excalibur_bell()
e.save('work/wild_excalibur.png')

d = draw_dragon_kettlebell()
d.save('work/wild_dragon.png')

v = draw_void_bell()
v.save('work/wild_void.png')

comp = Image.new("RGBA", (W * 4 + 40, H + 20), (25, 20, 35, 255))
comp.paste(i, (5, 10), i)
comp.paste(e, (W + 15, 10), e)
comp.paste(d, (W * 2 + 25, 10), d)
comp.paste(v, (W * 3 + 35, 10), v)
comp.save('work/wild_kettlebells_preview.png')
print("Wild kettlebells preview generated!")
