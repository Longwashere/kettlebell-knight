import os
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W_LONG, H_LONG = 64, 34

def to_pma(img):
    arr = np.array(img, dtype=float)
    alpha = arr[:, :, 3:4] / 255.0
    arr[:, :, :3] *= alpha
    return Image.fromarray(np.round(arr).astype(np.uint8))

def create_transparent(w=W_LONG, h=H_LONG):
    return Image.new('RGBA', (w, h), (0, 0, 0, 0))

# -----------------------------------------------------------------
# Palette extracted directly from media_1792203486837.png
# -----------------------------------------------------------------
OUTLINE = (20, 18, 28, 255)
GOLD_SHADOW = (115, 78, 24, 255)
GOLD_DARK = (168, 118, 38, 255)
GOLD_MID = (218, 168, 58, 255)
GOLD_LIGHT = (248, 212, 110, 255)
GOLD_BRIGHT = (255, 244, 185, 255)
GOLD_SPECULAR = (255, 255, 240, 255)

BLADE_CORE = (255, 255, 250, 255)
BLADE_GLOW = (255, 248, 175, 240)
BLADE_EDGE = (242, 198, 75, 255)
BLADE_AURA = (255, 235, 120, 120)

BLUE_DARK = (18, 26, 68, 255)
BLUE_MID = (28, 48, 138, 255)
BLUE_LIGHT = (52, 98, 215, 255)
BLUE_ACCENT = (76, 155, 255, 255)

RUBY_DARK = (92, 12, 22, 255)
RUBY_MID = (182, 24, 42, 255)
RUBY_LIGHT = (245, 54, 78, 255)
RUBY_SPEC = (255, 200, 210, 255)

# -----------------------------------------------------------------
# STYLE A: Faithful Tipped Excalibell (Kettlebell at tip)
# Grip: x=2..16, Winged Guard: x=16..24, Blade: x=24..42, Kettlebell: x=42..62
# -----------------------------------------------------------------
def craft_excalibell_tipped():
    img = create_transparent(W_LONG, H_LONG)
    d = ImageDraw.Draw(img)
    
    # 1. CHAIN & MINI CROWN CHARM (dangles from pommel base at x=3..7, y=19..28)
    # Chain links
    chain_pts = [(4, 18), (5, 20), (4, 22), (5, 24)]
    for pt in chain_pts:
        d.point(pt, fill=GOLD_MID)
    d.point((4, 19), fill=GOLD_LIGHT)
    d.point((5, 21), fill=GOLD_SHADOW)
    d.point((4, 23), fill=GOLD_LIGHT)
    
    # Mini Crown Charm (x=3..7, y=24..27)
    d.polygon([(3, 27), (7, 27), (7, 25), (6, 26), (5, 24), (4, 26), (3, 25)], fill=GOLD_LIGHT, outline=OUTLINE)
    d.point((5, 25), fill=GOLD_SPECULAR)
    d.point((4, 27), fill=GOLD_DARK)
    d.point((6, 27), fill=GOLD_DARK)
    
    # 2. POMMEL (Crown-shaped royal pommel at x=1..5, y=14..20)
    # Crown base ring
    d.rectangle([4, 15, 5, 19], fill=GOLD_MID, outline=OUTLINE)
    # Crown peaks
    d.polygon([(1, 14), (4, 14), (4, 20), (1, 20), (2, 17)], fill=GOLD_MID, outline=OUTLINE)
    d.point((1, 14), fill=GOLD_SPECULAR) # top peak
    d.point((1, 20), fill=GOLD_LIGHT)    # bottom peak
    d.point((3, 17), fill=GOLD_BRIGHT)   # center peak
    d.point((2, 17), fill=BLUE_MID)      # gem inset in crown
    d.point((4, 17), fill=GOLD_DARK)
    
    # 3. BLUE SPIRAL-WRAPPED GRIP (x=5..16, y=15..19) - exactly where knight's hand rests
    d.rectangle([5, 15, 16, 19], fill=BLUE_MID, outline=OUTLINE)
    d.line([(5, 15), (16, 15)], fill=BLUE_DARK)
    d.line([(5, 19), (16, 19)], fill=BLUE_DARK)
    # Royal blue texture with diagonal golden wire spirals
    for x in range(6, 16, 3):
        d.line([(x, 18), (x+1, 16)], fill=GOLD_MID)
        d.point((x+1, 16), fill=GOLD_LIGHT)
        d.point((x, 17), fill=BLUE_LIGHT)
        d.point((x+1, 18), fill=BLUE_DARK)
        
    # Collar ring between grip and guard
    d.line([(16, 14), (16, 20)], fill=GOLD_MID)
    d.point((16, 17), fill=GOLD_LIGHT)

    # 4. WINGED GOLDEN CROSSGUARD (x=16..24, y=4..30)
    # Upper Angel Wing (sweeps backward and upward: x=17..23, y=4..15)
    upper_wing = [(17, 15), (20, 13), (23, 7), (21, 5), (19, 8), (17, 10), (16, 14)]
    d.polygon(upper_wing, fill=GOLD_MID, outline=OUTLINE)
    d.polygon([(19, 8), (22, 6), (20, 11)], fill=GOLD_LIGHT)
    d.point((21, 5), fill=GOLD_SPECULAR) # Wing tip feather
    d.point((20, 7), fill=BLUE_LIGHT)    # Sapphire accent inset on wing
    
    # Lower Angel Wing (sweeps backward and downward: x=17..23, y=19..30)
    lower_wing = [(17, 19), (20, 21), (23, 27), (21, 29), (19, 26), (17, 24), (16, 20)]
    d.polygon(lower_wing, fill=GOLD_MID, outline=OUTLINE)
    d.polygon([(19, 26), (22, 28), (20, 23)], fill=GOLD_DARK)
    d.point((21, 29), fill=GOLD_LIGHT)   # Lower wing tip
    d.point((20, 27), fill=BLUE_LIGHT)   # Sapphire accent inset
    
    # Guard Center Hub (x=17..22, y=13..21)
    d.polygon([(17, 14), (22, 14), (24, 17), (22, 20), (17, 20)], fill=GOLD_MID, outline=OUTLINE)
    d.point((18, 15), fill=GOLD_LIGHT)
    d.point((18, 19), fill=GOLD_DARK)
    
    # Central Ruby Gem (x=19..22, y=16..18)
    d.polygon([(19, 17), (21, 15), (22, 17), (21, 19)], fill=RUBY_MID, outline=OUTLINE)
    d.point((21, 16), fill=RUBY_LIGHT)
    d.point((21, 17), fill=RUBY_SPEC)
    d.point((21, 18), fill=RUBY_DARK)

    # 5. LUMINOUS HOLY SWORD BLADE (x=24..43, y=12..22)
    # Blade gold base
    d.polygon([(24, 14), (42, 14), (43, 17), (42, 20), (24, 20)], fill=BLADE_EDGE, outline=OUTLINE)
    # Radiant fuller with intense white-gold core
    d.rectangle([24, 15, 42, 19], fill=GOLD_LIGHT)
    d.rectangle([25, 16, 42, 18], fill=BLADE_GLOW)
    d.line([(25, 17), (42, 17)], fill=BLADE_CORE)
    # Blade shading & beveled edge
    d.line([(24, 15), (42, 15)], fill=GOLD_BRIGHT)
    d.line([(24, 19), (42, 19)], fill=GOLD_DARK)
    
    # Magical divine swirl / aura particles around blade
    d.point((28, 12), fill=BLADE_AURA)
    d.point((34, 22), fill=BLADE_AURA)
    d.point((38, 11), fill=GOLD_BRIGHT)
    d.point((30, 21), fill=GOLD_BRIGHT)

    # 6. KETTLEBELL HEAD AT TIP (x=41..62, y=5..29)
    # Connecting bracket / ferrule (x=41..44)
    d.polygon([(41, 14), (44, 12), (44, 22), (41, 20)], fill=GOLD_MID, outline=OUTLINE)
    d.point((43, 13), fill=GOLD_LIGHT)
    d.point((43, 21), fill=GOLD_DARK)
    
    # Arched Kettlebell Handle (x=44..57, y=6..14)
    # Outer arch
    d.arc([44, 6, 56, 18], 180, 0, fill=OUTLINE, width=4)
    d.arc([45, 7, 55, 17], 180, 0, fill=GOLD_MID, width=2)
    d.arc([46, 8, 54, 16], 190, 270, fill=GOLD_BRIGHT, width=1) # top-left highlight on handle
    # Hollow inside the handle
    d.ellipse([47, 10, 53, 15], fill=(0, 0, 0, 0))

    # Golden Kettlebell Spherical Body (x=44..62, y=11..29)
    d.ellipse([44, 11, 62, 29], fill=GOLD_MID, outline=OUTLINE, width=1)
    # Chiaroscuro sphere shading
    d.ellipse([46, 13, 60, 27], fill=GOLD_DARK)
    d.arc([45, 12, 61, 28], 130, 280, fill=GOLD_LIGHT, width=2)
    d.arc([46, 13, 59, 26], 140, 240, fill=GOLD_BRIGHT, width=2)
    
    # Four-Point Holy Star Sparkle on Bell Face (x=49..57, y=16..24)
    cx, cy = 53, 20
    # Central brilliance
    d.point((cx, cy), fill=BLADE_CORE)
    # Horizontal ray
    d.line([(cx-4, cy), (cx+4, cy)], fill=GOLD_BRIGHT)
    d.line([(cx-2, cy), (cx+2, cy)], fill=BLADE_CORE)
    # Vertical ray
    d.line([(cx, cy-4), (cx, cy+4)], fill=GOLD_BRIGHT)
    d.line([(cx, cy-2), (cx, cy+2)], fill=BLADE_CORE)
    # Diagonal glints
    d.point((cx-1, cy-1), fill=GOLD_LIGHT)
    d.point((cx+1, cy-1), fill=GOLD_LIGHT)
    d.point((cx-1, cy+1), fill=GOLD_LIGHT)
    d.point((cx+1, cy+1), fill=GOLD_LIGHT)
    
    # Glimmer dots on bell sphere rim
    d.point((47, 15), fill=GOLD_SPECULAR)
    d.point((58, 25), fill=GOLD_SHADOW)
    d.point((48, 26), fill=GOLD_SHADOW)

    return img

# -----------------------------------------------------------------
# STYLE B: Classic Kettlebell-Guard Excalibell (Kettlebell at guard)
# Grip: x=2..16, Winged KB Guard: x=16..34, Long Excalibur Blade: x=34..63
# -----------------------------------------------------------------
def craft_excalibell_guard():
    img = create_transparent(W_LONG, H_LONG)
    d = ImageDraw.Draw(img)
    
    # 1. CHAIN & MINI CROWN CHARM (x=3..7, y=19..28)
    chain_pts = [(4, 18), (5, 20), (4, 22), (5, 24)]
    for pt in chain_pts:
        d.point(pt, fill=GOLD_MID)
    d.polygon([(3, 27), (7, 27), (7, 25), (6, 26), (5, 24), (4, 26), (3, 25)], fill=GOLD_LIGHT, outline=OUTLINE)
    d.point((5, 25), fill=GOLD_SPECULAR)
    
    # 2. POMMEL (x=1..5, y=14..20)
    d.rectangle([4, 15, 5, 19], fill=GOLD_MID, outline=OUTLINE)
    d.polygon([(1, 14), (4, 14), (4, 20), (1, 20), (2, 17)], fill=GOLD_MID, outline=OUTLINE)
    d.point((1, 14), fill=GOLD_SPECULAR)
    d.point((1, 20), fill=GOLD_LIGHT)
    d.point((2, 17), fill=BLUE_MID)
    
    # 3. BLUE WRAPPED GRIP (x=5..16, y=15..19)
    d.rectangle([5, 15, 16, 19], fill=BLUE_MID, outline=OUTLINE)
    for x in range(6, 16, 3):
        d.line([(x, 18), (x+1, 16)], fill=GOLD_MID)
        d.point((x+1, 16), fill=GOLD_LIGHT)
        d.point((x, 17), fill=BLUE_LIGHT)
        
    # Collar
    d.line([(16, 14), (16, 20)], fill=GOLD_MID)

    # 4. SWEEPING ANGEL WINGS FLANKING GUARD (x=16..26, y=3..31)
    upper_wing = [(17, 14), (21, 11), (25, 5), (23, 3), (20, 6), (17, 10)]
    d.polygon(upper_wing, fill=GOLD_MID, outline=OUTLINE)
    d.point((23, 3), fill=GOLD_SPECULAR)
    d.point((21, 5), fill=BLUE_LIGHT)
    
    lower_wing = [(17, 20), (21, 23), (25, 29), (23, 31), (20, 28), (17, 24)]
    d.polygon(lower_wing, fill=GOLD_MID, outline=OUTLINE)
    d.point((23, 31), fill=GOLD_LIGHT)
    d.point((21, 29), fill=BLUE_LIGHT)

    # 5. KETTLEBELL BASKET-GUARD BODY (x=18..34, y=7..27)
    # Handle arching around the knight's hand
    d.rounded_rectangle([17, 9, 27, 25], radius=4, fill=GOLD_MID, outline=OUTLINE, width=2)
    d.rounded_rectangle([20, 12, 24, 22], radius=2, fill=(0, 0, 0, 0), outline=OUTLINE, width=1)
    
    # Spherical bell guard
    d.ellipse([21, 8, 35, 26], fill=GOLD_MID, outline=OUTLINE, width=1)
    d.ellipse([23, 10, 33, 24], fill=GOLD_DARK)
    d.arc([22, 9, 34, 25], 130, 270, fill=GOLD_LIGHT, width=2)
    d.point((24, 11), fill=GOLD_SPECULAR)
    
    # Central Ruby Gem & Holy Star Sparkle at guard center (x=26..30, y=15..19)
    d.polygon([(26, 17), (28, 15), (30, 17), (28, 19)], fill=RUBY_MID, outline=OUTLINE)
    d.point((28, 16), fill=RUBY_SPEC)
    d.point((28, 17), fill=RUBY_LIGHT)
    # Sparkle rays extending across guard
    d.line([(24, 17), (32, 17)], fill=GOLD_BRIGHT)
    d.line([(28, 13), (28, 21)], fill=GOLD_BRIGHT)

    # 6. FULL LENGTH RADIANT EXCALIBUR BLADE (x=34..63, y=11..23)
    # Double-edged blade tapering to acute holy point at x=63, y=17
    d.polygon([(34, 13), (56, 12), (63, 17), (56, 22), (34, 21)], fill=BLADE_EDGE, outline=OUTLINE)
    d.polygon([(35, 14), (55, 13), (61, 17), (55, 21), (35, 20)], fill=GOLD_LIGHT)
    d.polygon([(36, 15), (54, 14), (59, 17), (54, 20), (36, 19)], fill=BLADE_GLOW)
    # Central intense holy core line
    d.line([(35, 17), (60, 17)], fill=BLADE_CORE)
    # Beveled edge highlights
    d.line([(35, 14), (55, 13)], fill=GOLD_BRIGHT)
    d.line([(35, 20), (55, 21)], fill=GOLD_DARK)
    
    # Floating divine light aura sparkles
    d.point((42, 10), fill=BLADE_AURA)
    d.point((48, 24), fill=BLADE_AURA)
    d.point((54, 11), fill=GOLD_BRIGHT)

    return img

def main():
    tipped = craft_excalibell_tipped()
    guard = craft_excalibell_guard()
    
    tipped.save('work/art_excalibell_tipped.png')
    guard.save('work/art_excalibell_guard.png')
    
    print('Generated work/art_excalibell_tipped.png (64x34)')
    print('Generated work/art_excalibell_guard.png (64x34)')
    
    # Create high-res comparison preview
    scale = 8
    preview_w = (W_LONG * scale * 2) + 60
    preview_h = (H_LONG * scale) + 80
    sheet = Image.new('RGBA', (preview_w, preview_h), (24, 24, 34, 255))
    
    # Paste scaled versions
    t_scaled = tipped.resize((W_LONG * scale, H_LONG * scale), Image.Resampling.NEAREST)
    g_scaled = guard.resize((W_LONG * scale, H_LONG * scale), Image.Resampling.NEAREST)
    
    sheet.paste(t_scaled, (20, 50), t_scaled)
    sheet.paste(g_scaled, (W_LONG * scale + 40, 50), g_scaled)
    
    sheet.save('work/excalibell_comparison_8x.png')
    print('Generated work/excalibell_comparison_8x.png')

if __name__ == '__main__':
    main()
