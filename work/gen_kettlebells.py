from PIL import Image, ImageDraw
import numpy as np

W, H = 70, 21

def create_iron_kettlebell():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    # Palette - rugged cast iron & tempered steel
    OUTLINE = (20, 24, 30, 255)
    IRON_DARK = (45, 52, 62, 255)
    IRON_MID = (75, 85, 99, 255)
    IRON_LIGHT = (120, 133, 150, 255)
    STEEL_EDGE = (190, 202, 215, 255)
    RUST_BRONZE = (130, 75, 45, 255)
    GRIP_BROWN = (80, 50, 35, 255)
    GRIP_HIGHLIGHT = (140, 90, 60, 255)
    
    # 1. Grip / Hilt (x: 2..16, y: 8..12)
    # Pommel ring (looks like a mini kettlebell handle)
    d.ellipse([1, 7, 7, 13], outline=OUTLINE, width=1)
    d.ellipse([2, 8, 6, 12], fill=IRON_MID, outline=IRON_DARK)
    d.point([(3, 9), (4, 9)], fill=IRON_LIGHT)
    
    # Handle wrap
    for x in range(7, 18, 2):
        d.line([(x, 8), (x+1, 12)], fill=GRIP_BROWN)
        d.point([(x, 8)], fill=GRIP_HIGHLIGHT)
    d.line([(7, 7), (18, 7)], fill=OUTLINE)
    d.line([(7, 13), (18, 13)], fill=OUTLINE)
    
    # 2. Kettlebell Handle (arching over the bell from x: 17 to x: 33)
    # Top arch
    d.arc([16, 1, 34, 13], 180, 360, fill=OUTLINE, width=2)
    d.arc([18, 3, 32, 11], 180, 360, fill=IRON_MID, width=2)
    d.arc([19, 4, 31, 10], 210, 330, fill=IRON_LIGHT, width=1)
    
    # 3. Main Kettlebell Body (Bell sphere at x: 18..36, y: 5..18)
    d.ellipse([18, 4, 36, 18], fill=IRON_MID, outline=OUTLINE, width=1)
    # Shading on bell
    d.ellipse([20, 6, 34, 16], fill=IRON_DARK)
    d.arc([20, 6, 34, 16], 120, 300, fill=IRON_MID, width=2)
    # Specular curved highlight on top-left of bell
    d.line([(22, 7), (26, 6)], fill=STEEL_EDGE)
    d.line([(21, 8), (24, 7)], fill=IRON_LIGHT)
    # Cast iron weight marking "32" or skull rivet
    d.point([(26, 10), (27, 10), (29, 10), (30, 10), (27, 11), (29, 12), (26, 13), (27, 13), (29, 13), (30, 13)], fill=RUST_BRONZE)
    
    # 4. Heavy Reinforced Cleaver Blade / Impact Flanges (x: 34..66, y: 4..16)
    # Blade spine
    d.polygon([(34, 7), (60, 6), (66, 10), (60, 14), (34, 14)], fill=IRON_MID, outline=OUTLINE)
    # Chiseled bevels
    d.polygon([(35, 8), (59, 7), (64, 10), (35, 10)], fill=IRON_LIGHT)
    d.polygon([(35, 10), (64, 10), (59, 13), (35, 13)], fill=IRON_DARK)
    # Gleaming sharp cutting edge
    d.line([(35, 8), (59, 7)], fill=STEEL_EDGE)
    d.line([(59, 7), (65, 10)], fill=(240, 245, 255, 255))
    d.line([(65, 10), (59, 13)], fill=STEEL_EDGE)
    d.line([(35, 13), (59, 13)], fill=OUTLINE)
    
    # Reinforcement studs / rivets
    for rx in (38, 46, 54):
        d.point([(rx, 10)], fill=STEEL_EDGE)
        d.point([(rx+1, 10)], fill=OUTLINE)
        
    return img

def create_excalibur_bell():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    # Palette - Radiant holy gold, sapphire glow, polished steel
    OUTLINE = (35, 20, 5, 255)
    GOLD_DARK = (160, 100, 15, 255)
    GOLD_MID = (244, 180, 26, 255)
    GOLD_LIGHT = (255, 235, 130, 255)
    GOLD_WHITE = (255, 252, 230, 255)
    SAPPHIRE = (25, 120, 245, 255)
    CYAN_GLOW = (56, 182, 255, 255)
    WHITE_GLINT = (255, 255, 255, 255)
    
    # 1. Grip / Hilt
    d.ellipse([1, 7, 7, 13], outline=OUTLINE, width=1)
    d.ellipse([2, 8, 6, 12], fill=GOLD_MID, outline=GOLD_DARK)
    d.point([(4, 10)], fill=CYAN_GLOW)
    
    # Handle wrap in white/gold
    for x in range(7, 18, 2):
        d.line([(x, 8), (x+1, 12)], fill=GOLD_DARK)
        d.point([(x, 8)], fill=GOLD_LIGHT)
    d.line([(7, 7), (18, 7)], fill=OUTLINE)
    d.line([(7, 13), (18, 13)], fill=OUTLINE)
    
    # 2. Golden Kettlebell Handle (holy filigree arch)
    d.arc([16, 0, 34, 13], 180, 360, fill=OUTLINE, width=2)
    d.arc([18, 2, 32, 11], 180, 360, fill=GOLD_MID, width=2)
    d.arc([19, 3, 31, 10], 210, 330, fill=GOLD_LIGHT, width=1)
    d.point([(25, 2)], fill=WHITE_GLINT)
    
    # 3. Holy Kettlebell Body
    d.ellipse([18, 3, 36, 17], fill=GOLD_MID, outline=OUTLINE, width=1)
    d.ellipse([20, 5, 34, 15], fill=GOLD_DARK)
    # Luminous Sapphire Orb in center
    d.ellipse([24, 7, 30, 13], fill=SAPPHIRE, outline=OUTLINE)
    d.ellipse([25, 8, 29, 12], fill=CYAN_GLOW)
    d.point([(26, 8)], fill=WHITE_GLINT)
    # Holy radiance wings/flanges
    d.polygon([(24, 3), (27, 0), (30, 3)], fill=GOLD_LIGHT, outline=OUTLINE)
    d.polygon([(24, 17), (27, 20), (30, 17)], fill=GOLD_DARK, outline=OUTLINE)
    
    # 4. Sunburst Holy Greatblade
    d.polygon([(34, 6), (62, 5), (68, 10), (62, 15), (34, 14)], fill=GOLD_MID, outline=OUTLINE)
    d.polygon([(35, 7), (61, 6), (66, 10), (35, 10)], fill=GOLD_WHITE)
    d.polygon([(35, 10), (66, 10), (61, 14), (35, 13)], fill=GOLD_DARK)
    
    # Holy runic fuller glowing cyan
    d.line([(38, 10), (58, 10)], fill=CYAN_GLOW, width=1)
    d.point([(42, 9), (48, 9), (54, 9)], fill=WHITE_GLINT)
    d.line([(35, 7), (61, 6)], fill=WHITE_GLINT)
    d.line([(61, 6), (67, 10)], fill=WHITE_GLINT)
    
    return img

def create_dragon_kettlebell():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    # Palette - Magma obsidian, molten core, flame amber
    OUTLINE = (25, 5, 5, 255)
    OBSIDIAN = (45, 15, 20, 255)
    CRIMSON = (180, 25, 25, 255)
    MOLTEN_RED = (220, 38, 38, 255)
    LAVA_ORANGE = (245, 158, 11, 255)
    FIRE_YELLOW = (251, 191, 36, 255)
    WHITE_HEAT = (255, 250, 220, 255)
    
    # 1. Dragon Bone / Obsidian Hilt
    d.ellipse([1, 7, 7, 13], outline=OUTLINE, width=1)
    d.ellipse([2, 8, 6, 12], fill=OBSIDIAN, outline=OUTLINE)
    d.point([(4, 10)], fill=LAVA_ORANGE)
    
    for x in range(7, 18, 2):
        d.line([(x, 8), (x+1, 12)], fill=OBSIDIAN)
        d.point([(x, 8)], fill=LAVA_ORANGE)
    d.line([(7, 7), (18, 7)], fill=OUTLINE)
    d.line([(7, 13), (18, 13)], fill=OUTLINE)
    
    # 2. Curved Dragon Horn Handle
    d.arc([16, 0, 34, 13], 180, 360, fill=OUTLINE, width=2)
    d.arc([18, 2, 32, 11], 180, 360, fill=LAVA_ORANGE, width=2)
    d.arc([19, 3, 31, 10], 210, 330, fill=FIRE_YELLOW, width=1)
    # Horn spikes
    d.polygon([(19, 3), (17, 0), (22, 2)], fill=LAVA_ORANGE, outline=OUTLINE)
    d.polygon([(31, 3), (33, 0), (28, 2)], fill=LAVA_ORANGE, outline=OUTLINE)
    
    # 3. Molten Dragon Heart Bell
    d.ellipse([18, 3, 36, 17], fill=CRIMSON, outline=OUTLINE, width=1)
    d.ellipse([20, 5, 34, 15], fill=OBSIDIAN)
    # Pulsing Lava core
    d.ellipse([23, 7, 31, 13], fill=MOLTEN_RED, outline=OUTLINE)
    d.ellipse([25, 8, 29, 12], fill=LAVA_ORANGE)
    d.point([(27, 9), (27, 10)], fill=WHITE_HEAT)
    # Magma crack lines
    d.line([(22, 7), (25, 8)], fill=FIRE_YELLOW)
    d.line([(32, 7), (29, 8)], fill=FIRE_YELLOW)
    d.line([(26, 13), (28, 15)], fill=LAVA_ORANGE)
    
    # 4. Volcanic Searing Flame Edge / Dragon Fang Blade
    d.polygon([(34, 5), (63, 6), (67, 10), (63, 14), (34, 15)], fill=CRIMSON, outline=OUTLINE)
    d.polygon([(35, 6), (62, 7), (65, 10), (35, 10)], fill=LAVA_ORANGE)
    d.polygon([(35, 10), (65, 10), (62, 13), (35, 14)], fill=OBSIDIAN)
    
    # Fiery cutting edge with white-hot teeth
    d.line([(35, 6), (62, 7)], fill=FIRE_YELLOW)
    d.line([(62, 7), (66, 10)], fill=WHITE_HEAT)
    d.line([(66, 10), (62, 13)], fill=MOLTEN_RED)
    # Flame jagged spikes along top
    d.polygon([(42, 6), (45, 3), (48, 6)], fill=FIRE_YELLOW, outline=OUTLINE)
    d.polygon([(52, 6), (55, 3), (58, 7)], fill=LAVA_ORANGE, outline=OUTLINE)
    
    return img

def create_void_bell():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    # Palette - Cosmic void purple, emerald star eye, neon lilac
    OUTLINE = (15, 5, 25, 255)
    VOID_DEEP = (35, 10, 55, 255)
    PURPLE_MID = (107, 33, 168, 255)
    LILAC_LIGHT = (192, 132, 252, 255)
    VOID_WHITE = (245, 230, 255, 255)
    EMERALD = (0, 180, 100, 255)
    EMERALD_NEON = (0, 235, 136, 255)
    WHITE_GLINT = (255, 255, 255, 255)
    
    # 1. Cosmic Void Grip
    d.ellipse([1, 7, 7, 13], outline=OUTLINE, width=1)
    d.ellipse([2, 8, 6, 12], fill=PURPLE_MID, outline=OUTLINE)
    d.point([(4, 10)], fill=EMERALD_NEON)
    
    for x in range(7, 18, 2):
        d.line([(x, 8), (x+1, 12)], fill=VOID_DEEP)
        d.point([(x, 8)], fill=LILAC_LIGHT)
    d.line([(7, 7), (18, 7)], fill=OUTLINE)
    d.line([(7, 13), (18, 13)], fill=OUTLINE)
    
    # 2. Twisting Dark Matter Handle
    d.arc([16, 0, 34, 13], 180, 360, fill=OUTLINE, width=2)
    d.arc([18, 2, 32, 11], 180, 360, fill=PURPLE_MID, width=2)
    d.arc([19, 3, 31, 10], 210, 330, fill=LILAC_LIGHT, width=1)
    
    # 3. Singularity Gravity Bell
    d.ellipse([18, 3, 36, 17], fill=PURPLE_MID, outline=OUTLINE, width=1)
    d.ellipse([20, 5, 34, 15], fill=VOID_DEEP)
    # Eldritch Star Eye
    d.ellipse([24, 7, 30, 13], fill=EMERALD, outline=OUTLINE)
    d.ellipse([25, 8, 29, 12], fill=EMERALD_NEON)
    # Slit pupil
    d.line([(27, 8), (27, 12)], fill=VOID_DEEP)
    d.point([(26, 9)], fill=WHITE_GLINT)
    # Dark matter crystals
    d.polygon([(26, 3), (27, 0), (29, 3)], fill=LILAC_LIGHT, outline=OUTLINE)
    d.polygon([(26, 17), (27, 20), (29, 17)], fill=LILAC_LIGHT, outline=OUTLINE)
    
    # 4. Void Warp Curved Scythe-Blade
    d.polygon([(34, 6), (62, 4), (68, 10), (60, 16), (34, 14)], fill=PURPLE_MID, outline=OUTLINE)
    d.polygon([(35, 7), (61, 5), (66, 10), (35, 10)], fill=LILAC_LIGHT)
    d.polygon([(35, 10), (66, 10), (59, 15), (35, 13)], fill=VOID_DEEP)
    
    # Cosmic stardust rune line
    d.line([(38, 10), (58, 10)], fill=EMERALD_NEON)
    d.line([(35, 7), (61, 5)], fill=VOID_WHITE)
    d.line([(61, 5), (67, 10)], fill=VOID_WHITE)
    d.point([(44, 9), (52, 11), (58, 9)], fill=EMERALD_NEON)
    
    return img

iron = create_iron_kettlebell()
iron.save('work/kettlebell_iron.png')

excal = create_excalibur_bell()
excal.save('work/kettlebell_excalibur.png')

dragon = create_dragon_kettlebell()
dragon.save('work/kettlebell_dragon.png')

void = create_void_bell()
void.save('work/kettlebell_void.png')

# Composite preview
preview = Image.new("RGBA", (W * 4 + 30, H + 20), (25, 20, 35, 255))
preview.paste(iron, (5, 10), iron)
preview.paste(excal, (W + 10, 10), excal)
preview.paste(dragon, (W * 2 + 15, 10), dragon)
preview.paste(void, (W * 3 + 20, 10), void)
preview.save('work/kettlebells_preview.png')
print("Successfully generated all 4 kettlebells!")
