import os
import glob
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import numpy as np

SHOTS_DIR = 'work/shots/20261018-052202'
BASE_BG_DIR = 'public/assets/backgrounds'
OUT_BASE = 'public/assets/cinematics'
KNIGHT_SACRAMENT = 'public/assets/cinematics/town_square/chapter4_sacrament.jpg'

STAGES = [
    {
        'id': 'sunken_cistern',
        'key': 'SUNKEN_CISTERN',
        'bg': f'{BASE_BG_DIR}/sunken_cistern.webp',
        'apex_shot': f'{SHOTS_DIR}/cistern_apex.png',
        'glory_tint': (180, 240, 255),  # Crystal pristine subterranean waters
        'glory_bright': 1.15,
        'glory_sat': 1.25,
        'ruin_tint': (30, 80, 70),       # Toxic murky sludge & dark deep
        'ruin_bright': 0.65,
        'ruin_sat': 0.7,
        'sacrament_tint': (60, 200, 255), # Glacial frost & rushing torrent
    },
    {
        'id': 'cathedral_crypt',
        'key': 'CATHEDRAL_CRYPT',
        'bg': f'{BASE_BG_DIR}/cathedral_crypt.webp',
        'apex_shot': f'{SHOTS_DIR}/crypt_apex.png',
        'glory_tint': (255, 235, 180),  # Golden candlelit sacred sepulcher
        'glory_bright': 1.2,
        'glory_sat': 1.3,
        'ruin_tint': (60, 50, 75),       # Desecrated bone dust & shadow
        'ruin_bright': 0.6,
        'ruin_sat': 0.5,
        'sacrament_tint': (255, 220, 100), # Radiant holy bell
    },
    {
        'id': 'blood_cemetery',
        'key': 'BLOOD_CEMETERY',
        'bg': f'{BASE_BG_DIR}/blood_cemetery.webp',
        'apex_shot': f'{SHOTS_DIR}/cemetery_apex.png',
        'glory_tint': (240, 240, 255),  # Hallowed peaceful silver dusk
        'glory_bright': 1.1,
        'glory_sat': 1.15,
        'ruin_tint': (120, 20, 30),      # Sanguine mist & blood mud
        'ruin_bright': 0.65,
        'ruin_sat': 0.9,
        'sacrament_tint': (220, 40, 60),  # Burning blood-steel vow
    },
    {
        'id': 'belfry_ramparts',
        'key': 'BELFRY_RAMPARTS',
        'bg': f'{BASE_BG_DIR}/belfry_ramparts.webp',
        'apex_shot': f'{SHOTS_DIR}/belfry_apex.png',
        'glory_tint': (255, 245, 210),  # High sunlit windward citadel
        'glory_bright': 1.2,
        'glory_sat': 1.25,
        'ruin_tint': (40, 60, 95),       # Tempest squall & lightning gloom
        'ruin_bright': 0.65,
        'ruin_sat': 0.75,
        'sacrament_tint': (100, 210, 255), # Crackling storm lightning
    },
    {
        'id': 'cathedral_vault',
        'key': 'CATHEDRAL_VAULT',
        'bg': f'{BASE_BG_DIR}/cathedral_vault.webp',
        'apex_shot': f'{SHOTS_DIR}/vault_apex.png',
        'glory_tint': (255, 230, 150),  # Gleaming royal reliquary of gold
        'glory_bright': 1.25,
        'glory_sat': 1.35,
        'ruin_tint': (70, 65, 80),       # Ransacked vaults & cold iron
        'ruin_bright': 0.6,
        'ruin_sat': 0.6,
        'sacrament_tint': (255, 215, 0),   # Unconquered divine gold
    },
    {
        'id': 'volcanic_forge',
        'key': 'VOLCANIC_FORGE',
        'bg': f'{BASE_BG_DIR}/volcanic_forge.webp',
        'apex_shot': f'{SHOTS_DIR}/forge_apex.png',
        'glory_tint': (255, 200, 130),  # Grand dwarven bell foundry hearth
        'glory_bright': 1.15,
        'glory_sat': 1.3,
        'ruin_tint': (180, 50, 10),      # Erupted brimstone caldera & magma
        'ruin_bright': 0.7,
        'ruin_sat': 1.1,
        'sacrament_tint': (255, 120, 20),  # Blazing forge fire
    },
    {
        'id': 'eldritch_altar',
        'key': 'ELDRITCH_ALTAR',
        'bg': f'{BASE_BG_DIR}/eldritch_altar.webp',
        'apex_shot': f'{SHOTS_DIR}/altar_apex.png',
        'glory_tint': (220, 230, 255),  # Pristine astral star observatory
        'glory_bright': 1.15,
        'glory_sat': 1.2,
        'ruin_tint': (100, 30, 140),     # Bleeding void rift & cosmic madness
        'ruin_bright': 0.6,
        'ruin_sat': 0.9,
        'sacrament_tint': (180, 80, 255),  # Void-cleaving violet fire
    },
    {
        'id': 'obsidian_throne',
        'key': 'OBSIDIAN_THRONE',
        'bg': f'{BASE_BG_DIR}/obsidian_throne.webp',
        'apex_shot': f'{SHOTS_DIR}/throne_apex.png',
        'glory_tint': (255, 235, 190),  # Imperial majesty of the High Kings
        'glory_bright': 1.2,
        'glory_sat': 1.25,
        'ruin_tint': (35, 30, 45),       # Ash desolation of the fallen empire
        'ruin_bright': 0.55,
        'ruin_sat': 0.5,
        'sacrament_tint': (255, 240, 180), # Dawn of the Final Sacrament
    },
]

W, H = 1920, 1080

def add_vignette(img, intensity=0.6, color=(10, 5, 15)):
    vig = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(vig)
    steps = 22
    for i in range(steps):
        prog = (i / float(steps))
        alpha = int((prog ** 1.8) * 220 * intensity)
        mx = int(W * 0.45 * (1.0 - prog))
        my = int(H * 0.45 * (1.0 - prog))
        d.rectangle([mx, my, W - mx, H - my], outline=(*color, alpha), width=18)
    return Image.alpha_composite(img, vig)

def add_particles(img, color=(255, 220, 100), count=70, seed=42):
    np.random.seed(seed)
    fx = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(fx)
    for _ in range(count):
        x = np.random.randint(0, W)
        y = np.random.randint(int(H * 0.15), H)
        sz = np.random.randint(2, 6)
        alpha = np.random.randint(100, 240)
        d.rectangle([x, y, x + sz, y + sz], fill=(*color, alpha))
    return Image.alpha_composite(img, fx)

def process_stage(cfg):
    out_dir = f"{OUT_BASE}/{cfg['id']}"
    os.makedirs(out_dir, exist_ok=True)
    print(f"== Processing {cfg['key']} into {out_dir} ==")
    
    # 1. Base Background
    raw_bg = Image.open(cfg['bg']).convert('RGBA')
    # Crop the bottom dark boundary if needed (426x200 content upscaled to 1920x1080)
    bg_cropped = raw_bg.crop((0, 0, 426, 204)).resize((W, H), Image.Resampling.NEAREST)
    
    # --- CHAPTER 1: FORMER GLORY ---
    glory = bg_cropped.copy()
    enh = ImageEnhance.Brightness(glory)
    glory = enh.enhance(cfg['glory_bright'])
    col_enh = ImageEnhance.Color(glory)
    glory = col_enh.enhance(cfg['glory_sat'])
    # Warm golden/starlight wash
    wash = Image.new('RGBA', (W, H), (*cfg['glory_tint'], 35))
    glory = Image.alpha_composite(glory, wash)
    # Sunbeams from top
    beam_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d_beam = ImageDraw.Draw(beam_layer)
    for bx in range(0, W, 120):
        d_beam.polygon([(bx, 0), (bx + 80, 0), (bx + 350, H), (bx + 200, H)], fill=(*cfg['glory_tint'], 25))
    glory = Image.alpha_composite(glory, beam_layer)
    glory = add_vignette(glory, intensity=0.35, color=(20, 15, 30))
    glory = add_particles(glory, color=cfg['glory_tint'], count=60, seed=11)
    ch1_path = f"{out_dir}/chapter1_glory.jpg"
    glory.convert('RGB').save(ch1_path, quality=93)
    print("  -> Saved Chapter 1 (Glory)")
    
    # --- CHAPTER 2: THE RUIN ---
    ruin = bg_cropped.copy()
    enh = ImageEnhance.Brightness(ruin)
    ruin = enh.enhance(cfg['ruin_bright'])
    col_enh = ImageEnhance.Color(ruin)
    ruin = col_enh.enhance(cfg['ruin_sat'])
    # Necrotic/blight wash
    wash_ruin = Image.new('RGBA', (W, H), (*cfg['ruin_tint'], 55))
    ruin = Image.alpha_composite(ruin, wash_ruin)
    # Bottom mist/fog layer
    fog = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d_fog = ImageDraw.Draw(fog)
    for y in range(H - 400, H):
        prog = (y - (H - 400)) / 400.0
        d_fog.line([(0, y), (W, y)], fill=(*cfg['ruin_tint'], int(prog * 130)))
    ruin = Image.alpha_composite(ruin, fog)
    ruin = add_vignette(ruin, intensity=0.75, color=(5, 5, 12))
    ruin = add_particles(ruin, color=cfg['ruin_tint'], count=90, seed=22)
    ch2_path = f"{out_dir}/chapter2_ruin.jpg"
    ruin.convert('RGB').save(ch2_path, quality=93)
    print("  -> Saved Chapter 2 (Ruin)")
    
    # --- CHAPTER 3: THE APEX TERROR ---
    apex_raw = Image.open(cfg['apex_shot']).convert('RGBA')
    # Erase the yellow target indicator at (279, 35) in 426x240 coordinates
    d_clean = ImageDraw.Draw(apex_raw)
    # Target indicator is at x: 270-290, y: 30-46. Fill with surrounding sky/pillar
    sky_sample = apex_raw.getpixel((265, 38))
    d_clean.rectangle([270, 30, 290, 46], fill=sky_sample)
    
    # Crop content area (0, 0, 426, 204) to eliminate bottom blank strip
    apex_cropped = apex_raw.crop((0, 0, 426, 204)).resize((W, H), Image.Resampling.NEAREST)
    apex = add_vignette(apex_cropped, intensity=0.6, color=(10, 5, 20))
    apex = add_particles(apex, color=cfg['sacrament_tint'], count=75, seed=33)
    ch3_path = f"{out_dir}/chapter3_apex.jpg"
    apex.convert('RGB').save(ch3_path, quality=93)
    print("  -> Saved Chapter 3 (Apex Terror)")
    
    # --- CHAPTER 4: THE SACRAMENT OF IRON ---
    # Load the master clean knight sacrament
    sacrament = Image.open(KNIGHT_SACRAMENT).convert('RGBA')
    sacrament = sacrament.resize((W, H), Image.Resampling.LANCZOS)
    
    # Elemental glow grading to match this stage's holy sacrament
    glow_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d_glow = ImageDraw.Draw(glow_layer)
    # Bell center is approximately at (W*0.5, H*0.72)
    cx, cy = int(W * 0.5), int(H * 0.72)
    for r in range(350, 0, -10):
        prog = (350 - r) / 350.0
        alpha = int(prog ** 1.5 * 110)
        d_glow.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*cfg['sacrament_tint'], alpha))
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(25))
    sacrament = Image.alpha_composite(sacrament, glow_layer)
    sacrament = add_particles(sacrament, color=cfg['sacrament_tint'], count=80, seed=44)
    ch4_path = f"{out_dir}/chapter4_sacrament.jpg"
    sacrament.convert('RGB').save(ch4_path, quality=93)
    print("  -> Saved Chapter 4 (Sacrament of Iron)")

def main():
    for stage in STAGES:
        process_stage(stage)
    print("\nAll campaign stage cinematics generated successfully!")

if __name__ == '__main__':
    main()
