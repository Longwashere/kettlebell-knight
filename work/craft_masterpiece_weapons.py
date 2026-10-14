import os
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import numpy as np

W_LONG, H_LONG = 64, 34
W_BELL, H_BELL = 40, 40

def create_transparent(w, h):
    return Image.new('RGBA', (w, h), (0, 0, 0, 0))

def parse_atlas_bounds(atlas_path):
    with open(atlas_path) as f:
        text = f.read()
    regions = {}
    current = None
    for line in text.splitlines():
        line = line.strip()
        if not line or ':' in line or line.endswith('.png'):
            if line.startswith('bounds:'):
                vals = [int(v.strip()) for v in line.split(':')[1].split(',')]
                regions[current] = vals
            elif line.startswith('xy:'):
                parts = [int(v.strip()) for v in line.split(':')[1].split(',')]
                regions[current] = [parts[0], parts[1], 0, 0]
            elif line.startswith('size:') and current in regions and regions[current][2] == 0:
                parts = [int(v.strip()) for v in line.split(':')[1].split(',')]
                regions[current][2] = parts[0]
                regions[current][3] = parts[1]
            continue
        current = line
    return regions

def get_crop(atlas_path, png_path, region_name):
    bounds = parse_atlas_bounds(atlas_path)
    if region_name not in bounds:
        raise ValueError(f"Region {region_name} not found in {atlas_path}")
    b = bounds[region_name]
    img = Image.open(png_path).convert('RGBA')
    return img.crop((b[0], b[1], b[0] + b[2], b[1] + b[3]))

# Stamp stamped numbers with authentic painterly bevel and shadow
def stamp_chiseled_number(img, cx, cy, text, col_highlight, col_shadow):
    d = ImageDraw.Draw(img)
    digits = {
        '0': [(0,0),(1,0),(2,0),(0,1),(2,1),(0,2),(2,2),(0,3),(2,3),(0,4),(1,4),(2,4)],
        '1': [(1,0),(1,1),(1,2),(1,3),(1,4)],
        '2': [(0,0),(1,0),(2,0),(2,1),(0,2),(1,2),(2,2),(0,3),(0,4),(1,4),(2,4)],
        '3': [(0,0),(1,0),(2,0),(2,1),(1,2),(2,2),(2,3),(0,4),(1,4),(2,4)],
        '4': [(0,0),(2,0),(0,1),(2,1),(0,2),(1,2),(2,2),(2,3),(2,4)],
        '7': [(0,0),(1,0),(2,0),(2,1),(1,2),(1,3),(1,4)],
        '8': [(0,0),(1,0),(2,0),(0,1),(2,1),(0,2),(1,2),(2,2),(0,3),(2,3),(0,4),(1,4),(2,4)],
    }
    
    spacing = 1
    char_w = 3
    total_w = len(text) * char_w + (len(text) - 1) * spacing
    start_x = cx - total_w // 2
    start_y = cy - 2
    
    for ox, oy, col in [(0, 1, col_shadow), (0, 0, col_highlight)]:
        curr_x = start_x + ox
        for char in text:
            if char in digits:
                for px, py in digits[char]:
                    d.point((curr_x + px, start_y + py + oy), fill=col)
            curr_x += char_w + spacing

# Load Master Reference Art
ref_minotaur = Image.open('work/art_minotaur_sword.png').convert('RGBA')
ref_troll = Image.open('work/art_troll_morningstar.png').convert('RGBA')
ref_treemon = Image.open('work/art_treemon_bell.png').convert('RGBA')
ref_inferno = Image.open('work/art_inferno_mace.png').convert('RGBA')
ref_crypt = Image.open('work/art_crypt_morningstar.png').convert('RGBA')
ref_spider = Image.open('work/art_spider_morningstar.png').convert('RGBA')

# -------------------------------------------------------------
# 1. KRAKEN MORNINGSTAR (80kg)
# -------------------------------------------------------------
def craft_kraken_morningstar():
    img = create_transparent(W_LONG, H_LONG)
    
    # Wooden flail handle on the left (matches knight grip)
    handle_crop = ref_troll.crop((0, 0, 16, 34))
    img.paste(handle_crop, (0, 0), handle_crop)
    
    # Chain drooping downward from tip (x:13, y:11) to bell (x:37, y:13)
    d = ImageDraw.Draw(img)
    chain_pts = [(13, 11), (16, 5), (22, 4), (28, 7), (32, 12), (36, 11)]
    for i in range(len(chain_pts)-1):
        x1, y1 = chain_pts[i]
        x2, y2 = chain_pts[i+1]
        d.line([(x1, y1), (x2, y2)], fill=(32, 45, 52, 255), width=2)
        d.point((x1, y1), fill=(75, 115, 130, 255))
    
    # Deep sea iron anchor kettlebell
    bell_base = ref_troll.crop((18, 5, 46, 33)).resize((26, 25), Image.Resampling.LANCZOS)
    arr = np.array(bell_base, dtype=float)
    arr[:, :, 0] = arr[:, :, 0] * 0.40 + 10 # R
    arr[:, :, 1] = arr[:, :, 1] * 0.80 + 30 # G
    arr[:, :, 2] = arr[:, :, 2] * 0.95 + 45 # B
    bell_sea = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    img.paste(bell_sea, (31, 8), bell_sea)
    
    # Tentacle with suckers from Octopus_Anim_01
    tent_crop = get_crop('public/assets/spine/monsters/abyssal-kraken/Octopus_Anim_01.atlas',
                         'public/assets/spine/monsters/abyssal-kraken/Octopus_Anim_01.png', 'leg 1')
    tent_small = tent_crop.resize((24, 16), Image.Resampling.LANCZOS).rotate(25, expand=True)
    img.paste(tent_small, (28, 14), tent_small)
    
    # Barnacles and cyan bioluminescent glow studs
    d = ImageDraw.Draw(img)
    for bx, by in [(39, 21), (46, 17), (49, 25), (37, 27)]:
        d.point((bx, by), fill=(40, 250, 220, 255))
        d.point((bx+1, by), fill=(20, 180, 160, 255))
        d.point((bx, by+1), fill=(15, 70, 80, 255))
        
    stamp_chiseled_number(img, 44, 23, "80", (90, 240, 220, 255), (10, 45, 55, 255))
    return img

# -------------------------------------------------------------
# 2. BOAR SWORD (32kg)
# -------------------------------------------------------------
def craft_boar_sword():
    img = create_transparent(W_LONG, H_LONG)
    
    # Hilt from minotaur_sword (x: 0..18, y: 0..34)
    hilt_crop = ref_minotaur.crop((0, 0, 18, 34))
    img.paste(hilt_crop, (0, 0), hilt_crop)
    
    # Heavy notched Damascus hunting blade from minotaur_sword (x: 26..64)
    blade_crop = ref_minotaur.crop((26, 0, 64, 34))
    img.paste(blade_crop, (26, 0), blade_crop)
    
    # Boar Kettlebell Core in center (x: 15..32)
    core_crop = ref_minotaur.crop((15, 6, 32, 28))
    arr_c = np.array(core_crop, dtype=float)
    arr_c[:, :, 0] *= 0.70 # weathered dark cast iron
    arr_c[:, :, 1] *= 0.65
    arr_c[:, :, 2] *= 0.60
    core_boar = Image.fromarray(np.clip(arr_c, 0, 255).astype(np.uint8))
    img.paste(core_boar, (15, 6), core_boar)
    
    # Curving Ivory Boar Tusks derived from minotaur horn geometry, colored in weathered ivory
    horn_top = ref_minotaur.crop((18, 0, 39, 14))
    arr_ht = np.array(horn_top, dtype=float)
    # Ivory tint: warm bone/ivory (high R, high G, mid B)
    mask_t = arr_ht[:, :, 3] > 20
    arr_ht[mask_t, 0] = arr_ht[mask_t, 0] * 0.8 + 140
    arr_ht[mask_t, 1] = arr_ht[mask_t, 1] * 0.8 + 130
    arr_ht[mask_t, 2] = arr_ht[mask_t, 2] * 0.5 + 85
    tusk_top = Image.fromarray(np.clip(arr_ht, 0, 255).astype(np.uint8))
    img.paste(tusk_top, (18, 0), tusk_top)
    
    horn_bot = ref_minotaur.crop((18, 20, 39, 34))
    arr_hb = np.array(horn_bot, dtype=float)
    mask_b = arr_hb[:, :, 3] > 20
    arr_hb[mask_b, 0] = arr_hb[mask_b, 0] * 0.8 + 130
    arr_hb[mask_b, 1] = arr_hb[mask_b, 1] * 0.8 + 120
    arr_hb[mask_b, 2] = arr_hb[mask_b, 2] * 0.5 + 75
    tusk_bot = Image.fromarray(np.clip(arr_hb, 0, 255).astype(np.uint8))
    img.paste(tusk_bot, (18, 20), tusk_bot)
    
    stamp_chiseled_number(img, 24, 16, "32", (245, 230, 200, 255), (45, 30, 20, 255))
    return img

# -------------------------------------------------------------
# 3. WOLF SWORD (24kg)
# -------------------------------------------------------------
def craft_wolf_sword():
    img = create_transparent(W_LONG, H_LONG)
    
    # Hilt wrapped in blue steel wire with silver pommel
    hilt_crop = ref_minotaur.crop((0, 0, 18, 34))
    arr = np.array(hilt_crop, dtype=float)
    arr[:, :, 0] = arr[:, :, 0] * 0.45 + 15
    arr[:, :, 1] = arr[:, :, 1] * 0.65 + 30
    arr[:, :, 2] = arr[:, :, 2] * 0.95 + 60
    hilt_blue = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    img.paste(hilt_blue, (0, 0), hilt_blue)
    
    # Full Damascus Greatsword blade tinted to silver/midnight blue with razor curved tip
    blade_crop = ref_minotaur.crop((26, 0, 64, 34))
    arr_b = np.array(blade_crop, dtype=float)
    arr_b[:, :, 0] = arr_b[:, :, 0] * 0.65 + 20
    arr_b[:, :, 1] = arr_b[:, :, 1] * 0.80 + 35
    arr_b[:, :, 2] = arr_b[:, :, 2] * 1.05 + 65
    blade_wolf = Image.fromarray(np.clip(arr_b, 0, 255).astype(np.uint8))
    img.paste(blade_wolf, (26, 0), blade_wolf)
    
    # Midnight blue kettlebell core
    core_crop = ref_minotaur.crop((15, 6, 32, 28))
    arr_c = np.array(core_crop, dtype=float)
    arr_c[:, :, 0] = arr_c[:, :, 0] * 0.40 + 15
    arr_c[:, :, 1] = arr_c[:, :, 1] * 0.60 + 30
    arr_c[:, :, 2] = arr_c[:, :, 2] * 1.00 + 70
    core_wolf = Image.fromarray(np.clip(arr_c, 0, 255).astype(np.uint8))
    img.paste(core_wolf, (15, 6), core_wolf)
    
    # Swept steel wolf-fang quillons
    horn_top = ref_minotaur.crop((18, 0, 39, 14))
    arr_ht = np.array(horn_top, dtype=float)
    mask_t = arr_ht[:, :, 3] > 20
    arr_ht[mask_t, 0] = arr_ht[mask_t, 0] * 0.7 + 50
    arr_ht[mask_t, 1] = arr_ht[mask_t, 1] * 0.8 + 80
    arr_ht[mask_t, 2] = arr_ht[mask_t, 2] * 1.1 + 130
    fang_top = Image.fromarray(np.clip(arr_ht, 0, 255).astype(np.uint8))
    img.paste(fang_top, (18, 0), fang_top)
    
    horn_bot = ref_minotaur.crop((18, 20, 39, 34))
    arr_hb = np.array(horn_bot, dtype=float)
    mask_b = arr_hb[:, :, 3] > 20
    arr_hb[mask_b, 0] = arr_hb[mask_b, 0] * 0.7 + 40
    arr_hb[mask_b, 1] = arr_hb[mask_b, 1] * 0.8 + 70
    arr_hb[mask_b, 2] = arr_hb[mask_b, 2] * 1.1 + 120
    fang_bot = Image.fromarray(np.clip(arr_hb, 0, 255).astype(np.uint8))
    img.paste(fang_bot, (18, 20), fang_bot)
    

        
    stamp_chiseled_number(img, 24, 16, "24", (220, 240, 255, 255), (20, 35, 65, 255))
    return img

# -------------------------------------------------------------
# 4. DRAGON SWORD (88kg)
# -------------------------------------------------------------
def craft_dragon_sword():
    img = create_transparent(W_LONG, H_LONG)
    
    # Gold and dragon-bone hilt
    hilt_crop = ref_minotaur.crop((0, 0, 18, 34))
    arr = np.array(hilt_crop, dtype=float)
    arr[:, :, 0] = arr[:, :, 0] * 1.2 + 35
    arr[:, :, 1] = arr[:, :, 1] * 0.8 + 15
    arr[:, :, 2] = arr[:, :, 2] * 0.3
    hilt_drag = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    img.paste(hilt_drag, (0, 0), hilt_drag)
    
    # Scorched Damascus Greatsword blade with glowing molten heat
    blade_crop = ref_minotaur.crop((26, 0, 64, 34))
    arr_b = np.array(blade_crop, dtype=float)
    arr_b[:, :, 0] = arr_b[:, :, 0] * 1.25 + 50
    arr_b[:, :, 1] = arr_b[:, :, 1] * 0.65 + 20
    arr_b[:, :, 2] = arr_b[:, :, 2] * 0.25
    blade_drag = Image.fromarray(np.clip(arr_b, 0, 255).astype(np.uint8))
    img.paste(blade_drag, (26, 0), blade_drag)
    
    # Molten basalt dragon-heart kettlebell core from ref_inferno
    core_crop = ref_inferno.crop((16, 7, 34, 27))
    img.paste(core_crop, (15, 6), core_crop)
    
    # Fiery Draconic Horn crossguards
    horn_top = ref_minotaur.crop((18, 0, 39, 14))
    arr_ht = np.array(horn_top, dtype=float)
    mask_t = arr_ht[:, :, 3] > 20
    arr_ht[mask_t, 0] = arr_ht[mask_t, 0] * 1.1 + 80
    arr_ht[mask_t, 1] = arr_ht[mask_t, 1] * 0.5 + 20
    arr_ht[mask_t, 2] = arr_ht[mask_t, 2] * 0.2
    horn_drag_t = Image.fromarray(np.clip(arr_ht, 0, 255).astype(np.uint8))
    img.paste(horn_drag_t, (18, 0), horn_drag_t)
    
    horn_bot = ref_minotaur.crop((18, 20, 39, 34))
    arr_hb = np.array(horn_bot, dtype=float)
    mask_b = arr_hb[:, :, 3] > 20
    arr_hb[mask_b, 0] = arr_hb[mask_b, 0] * 1.1 + 70
    arr_hb[mask_b, 1] = arr_hb[mask_b, 1] * 0.5 + 15
    arr_hb[mask_b, 2] = arr_hb[mask_b, 2] * 0.2
    horn_drag_b = Image.fromarray(np.clip(arr_hb, 0, 255).astype(np.uint8))
    img.paste(horn_drag_b, (18, 20), horn_drag_b)
    
    # Glowing molten fuller along blade center
    d = ImageDraw.Draw(img)
    for fx in range(30, 56):
        d.point((fx, 16), fill=(255, 230, 90, 255))
        d.point((fx, 17), fill=(255, 110, 25, 220))
        
    stamp_chiseled_number(img, 24, 16, "88", (255, 240, 150, 255), (70, 15, 5, 255))
    return img

# -------------------------------------------------------------
# 5. VOID SWORD (108kg)
# -------------------------------------------------------------
def craft_void_sword():
    img = create_transparent(W_LONG, H_LONG)
    
    # Obsidian and silver hilt
    hilt_crop = ref_minotaur.crop((0, 0, 18, 34))
    arr = np.array(hilt_crop, dtype=float)
    arr[:, :, 0] = arr[:, :, 0] * 0.65 + 30
    arr[:, :, 1] = arr[:, :, 1] * 0.45 + 15
    arr[:, :, 2] = arr[:, :, 2] * 1.10 + 55
    hilt_void = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    img.paste(hilt_void, (0, 0), hilt_void)
    
    # Crystalline Void Glass blade
    blade_crop = ref_minotaur.crop((26, 0, 64, 34))
    arr_b = np.array(blade_crop, dtype=float)
    arr_b[:, :, 0] = arr_b[:, :, 0] * 0.70 + 45
    arr_b[:, :, 1] = arr_b[:, :, 1] * 0.45 + 20
    arr_b[:, :, 2] = arr_b[:, :, 2] * 1.15 + 75
    blade_void = Image.fromarray(np.clip(arr_b, 0, 255).astype(np.uint8))
    img.paste(blade_void, (26, 0), blade_void)
    
    # Singularity Kettlebell core
    core_crop = ref_minotaur.crop((15, 6, 32, 28))
    arr_c = np.array(core_crop, dtype=float)
    arr_c[:, :, 0] = arr_c[:, :, 0] * 0.40 + 35
    arr_c[:, :, 1] = arr_c[:, :, 1] * 0.20 + 15
    arr_c[:, :, 2] = arr_c[:, :, 2] * 0.90 + 75
    core_void = Image.fromarray(np.clip(arr_c, 0, 255).astype(np.uint8))
    img.paste(core_void, (15, 6), core_void)
    
    # Event-horizon sweeping quillons
    horn_top = ref_minotaur.crop((18, 0, 39, 14))
    arr_ht = np.array(horn_top, dtype=float)
    mask_t = arr_ht[:, :, 3] > 20
    arr_ht[mask_t, 0] = arr_ht[mask_t, 0] * 0.7 + 60
    arr_ht[mask_t, 1] = arr_ht[mask_t, 1] * 0.4 + 20
    arr_ht[mask_t, 2] = arr_ht[mask_t, 2] * 1.2 + 100
    horn_void_t = Image.fromarray(np.clip(arr_ht, 0, 255).astype(np.uint8))
    img.paste(horn_void_t, (18, 0), horn_void_t)
    
    horn_bot = ref_minotaur.crop((18, 20, 39, 34))
    arr_hb = np.array(horn_bot, dtype=float)
    mask_b = arr_hb[:, :, 3] > 20
    arr_hb[mask_b, 0] = arr_hb[mask_b, 0] * 0.7 + 50
    arr_hb[mask_b, 1] = arr_hb[mask_b, 1] * 0.4 + 15
    arr_hb[mask_b, 2] = arr_hb[mask_b, 2] * 1.2 + 90
    horn_void_b = Image.fromarray(np.clip(arr_hb, 0, 255).astype(np.uint8))
    img.paste(horn_void_b, (18, 20), horn_void_b)
    
    # Electric cyan / violet glowing fuller
    d = ImageDraw.Draw(img)
    for fx in range(30, 56):
        d.point((fx, 16), fill=(0, 245, 235, 255))
        d.point((fx, 17), fill=(180, 50, 255, 210))
        
    stamp_chiseled_number(img, 24, 16, "108", (190, 250, 255, 255), (40, 10, 70, 255))
    return img

# -------------------------------------------------------------
# 6. MUSHROOM BELL (20kg) - 40x40
# -------------------------------------------------------------
def craft_mushroom_bell():
    img = create_transparent(W_BELL, H_BELL)
    
    # Master kettlebell structure from ref_treemon
    bell_base = ref_treemon.copy()
    arr = np.array(bell_base, dtype=float)
    arr[:, :, 0] = arr[:, :, 0] * 0.60 + 25
    arr[:, :, 1] = arr[:, :, 1] * 0.75 + 20
    arr[:, :, 2] = arr[:, :, 2] * 1.10 + 40
    wood_tint = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    img.paste(wood_tint, (0, 0), wood_tint)
    
    # Fungal Cap from M_Mushroom.png Hat
    hat_crop = get_crop('public/assets/spine/monsters/mushroom-creature/M_Mushroom.atlas',
                        'public/assets/spine/monsters/mushroom-creature/M_Mushroom.png', 'Hat')
    hat_small = hat_crop.resize((32, 17), Image.Resampling.LANCZOS)
    img.paste(hat_small, (4, 13), hat_small)
    
    # Spore gills and weeping luminescent droplets
    d = ImageDraw.Draw(img)
    for gx, gy in [(9, 31), (15, 33), (20, 34), (25, 33), (31, 31)]:
        d.point((gx, gy), fill=(0, 245, 210, 255))
        d.point((gx, gy+1), fill=(0, 170, 150, 180))
        
    stamp_chiseled_number(img, 20, 24, "20", (245, 230, 255, 255), (45, 15, 65, 255))
    return img

# -------------------------------------------------------------
# 7. HARPY BELL (30kg) - 40x40
# -------------------------------------------------------------
def craft_harpy_bell():
    img = create_transparent(W_BELL, H_BELL)
    
    # Mountain Bronze Kettlebell base
    core_crop = ref_treemon.copy()
    arr = np.array(core_crop, dtype=float)
    arr[:, :, 0] = arr[:, :, 0] * 1.20 + 45
    arr[:, :, 1] = arr[:, :, 1] * 0.95 + 25
    arr[:, :, 2] = arr[:, :, 2] * 0.45
    bronze_bell = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    img.paste(bronze_bell, (0, 0), bronze_bell)
    
    # Golden raptor claws clutching the bell sphere
    claw_crop = get_crop('public/assets/spine/monsters/harpy/Harpy.atlas',
                         'public/assets/spine/monsters/harpy/Harpy.png', 'L_Leg_01')
    claw_left = claw_crop.resize((9, 15), Image.Resampling.LANCZOS).rotate(-20, expand=True)
    claw_right = claw_crop.resize((9, 15), Image.Resampling.LANCZOS).transpose(Image.Transpose.FLIP_LEFT_RIGHT).rotate(20, expand=True)
    
    img.paste(claw_left, (3, 16), claw_left)
    img.paste(claw_right, (27, 16), claw_right)
    
    stamp_chiseled_number(img, 20, 24, "30", (255, 245, 190, 255), (75, 45, 15, 255))
    return img

# -------------------------------------------------------------
# 8. GOLEM BELL (72kg) - 40x40
# -------------------------------------------------------------
def craft_golem_bell():
    img = create_transparent(W_BELL, H_BELL)
    
    # Master kettlebell base tinted to weathered tectonic granite
    core_crop = ref_treemon.copy()
    arr = np.array(core_crop, dtype=float)
    # Granite tint: cool slate-gray with chiaroscuro depth
    gray = (arr[:, :, 0] * 0.3 + arr[:, :, 1] * 0.59 + arr[:, :, 2] * 0.11)
    arr[:, :, 0] = gray * 0.85 + 25
    arr[:, :, 1] = gray * 0.90 + 30
    arr[:, :, 2] = gray * 1.05 + 45
    stone_bell = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    img.paste(stone_bell, (0, 0), stone_bell)
    
    d = ImageDraw.Draw(img)
    # Glowing cyan runic fissures carved across granite face
    fissures = [
        [(13, 17), (16, 21), (15, 26)],
        [(26, 16), (24, 21), (27, 27)],
        [(17, 30), (23, 30)],
    ]
    for fissure in fissures:
        for i in range(len(fissure)-1):
            d.line([fissure[i], fissure[i+1]], fill=(0, 240, 255, 255), width=1)
            
    stamp_chiseled_number(img, 20, 23, "72", (210, 250, 255, 255), (30, 50, 70, 255))
    return img

# -------------------------------------------------------------
# 9. ELDRITCH BELL (120kg) - 40x40
# -------------------------------------------------------------
def craft_eldritch_bell():
    img = create_transparent(W_BELL, H_BELL)
    
    # Master kettlebell base tinted to alien void violet/flesh
    core_crop = ref_treemon.copy()
    arr = np.array(core_crop, dtype=float)
    arr[:, :, 0] = arr[:, :, 0] * 0.65 + 35
    arr[:, :, 1] = arr[:, :, 1] * 0.30 + 10
    arr[:, :, 2] = arr[:, :, 2] * 0.95 + 65
    eld_bell = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    img.paste(eld_bell, (0, 0), eld_bell)
    
    d = ImageDraw.Draw(img)
    # Large glowing unblinking reptilian slit eye in center
    d.ellipse([14, 16, 26, 26], fill=(255, 205, 25, 255), outline=(50, 10, 70, 255))
    d.polygon([(19, 17), (21, 17), (21, 25), (19, 25)], fill=(10, 5, 20, 255))
    d.point((19, 19), fill=(255, 255, 230, 255))
    
    # Dark dripping cosmic slime
    d.line([(16, 33), (16, 37)], fill=(130, 35, 190, 230))
    d.line([(24, 33), (24, 38)], fill=(130, 35, 190, 230))
    
    stamp_chiseled_number(img, 20, 30, "120", (230, 180, 255, 255), (45, 10, 65, 255))
    return img

def main():
    generators = {
        'kraken_morningstar': craft_kraken_morningstar,
        'boar_sword': craft_boar_sword,
        'wolf_sword': craft_wolf_sword,
        'dragon_sword': craft_dragon_sword,
        'void_sword': craft_void_sword,
        'mushroom_bell': craft_mushroom_bell,
        'harpy_bell': craft_harpy_bell,
        'golem_bell': craft_golem_bell,
        'eldritch_bell': craft_eldritch_bell,
    }
    
    for name, gen in generators.items():
        img = gen()
        out_path = f'work/art_{name}.png'
        img.save(out_path)
        print(f'Crafted {name} -> {out_path} ({img.size})')

if __name__ == '__main__':
    main()
