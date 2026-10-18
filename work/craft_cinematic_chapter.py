import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

def create_town_square_apex():
    os.makedirs('public/assets/cinematics/town_square', exist_ok=True)
    
    # Base background (426x240) scaled up with crisp pixel art scaling (nearest neighbor)
    bg = Image.open('public/assets/backgrounds/town_square.webp').convert('RGBA')
    W, H = 1920, 1080
    bg = bg.resize((W, H), Image.Resampling.NEAREST)
    
    # Darken and add dramatic nocturnal/stormy moody tint
    enhancer = ImageEnhance.Brightness(bg)
    bg = enhancer.enhance(0.55)
    color_enhancer = ImageEnhance.Color(bg)
    bg = color_enhancer.enhance(0.8)
    
    # Create dark vignette / stage spotlight overlay
    vignette = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d_vig = ImageDraw.Draw(vignette)
    
    # Darken edges heavily
    for i in range(25):
        alpha = int((i / 25.0) ** 1.8 * 200)
        margin_x = int(W * 0.45 * (1.0 - i / 25.0))
        margin_y = int(H * 0.45 * (1.0 - i / 25.0))
        d_vig.rectangle([margin_x, margin_y, W - margin_x, H - margin_y], outline=(10, 5, 20, 15), width=18)
    
    # Blood / fire ambient wash at bottom
    fire_glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d_fire = ImageDraw.Draw(fire_glow)
    for y in range(H - 350, H):
        prog = (y - (H - 350)) / 350.0
        d_fire.line([(0, y), (W, y)], fill=(180, 40, 10, int(prog * 110)))
        
    bg = Image.alpha_composite(bg, fire_glow)
    bg = Image.alpha_composite(bg, vignette)
    
    # Load Bear and Bard transparent rigs
    bear = Image.open('work/rigs/forest_bear.png').convert('RGBA')
    bard = Image.open('work/rigs/bard.png').convert('RGBA')
    
    # Scale bear up dramatically (Apex boss sizing)
    bear_h = 560
    bear_w = int(bear_h * (bear.width / bear.height))
    bear_scaled = bear.resize((bear_w, bear_h), Image.Resampling.NEAREST)
    
    # Scale bard
    bard_h = 420
    bard_w = int(bard_h * (bard.width / bard.height))
    bard_scaled = bard.resize((bard_w, bard_h), Image.Resampling.NEAREST)
    
    # Bear drop shadow
    shadow_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d_sh = ImageDraw.Draw(shadow_layer)
    
    bear_x = int(W * 0.40 - bear_w * 0.5)
    bear_y = H - bear_h - 140
    
    bard_x = int(W * 0.65)
    bard_y = H - bard_h - 150
    
    # Elliptical floor shadows
    d_sh.ellipse([bear_x + 60, bear_y + bear_h - 40, bear_x + bear_w - 60, bear_y + bear_h + 30], fill=(5, 5, 12, 200))
    d_sh.ellipse([bard_x + 40, bard_y + bard_h - 30, bard_x + bard_w - 40, bard_y + bard_h + 20], fill=(5, 5, 12, 200))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(15))
    bg = Image.alpha_composite(bg, shadow_layer)
    
    # Paste Bear & Bard
    bg.paste(bear_scaled, (bear_x, bear_y), bear_scaled)
    bg.paste(bard_scaled, (bard_x, bard_y), bard_scaled)
    
    # Add glowing eyes to bear and glowing strings to bard lute
    effects = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d_fx = ImageDraw.Draw(effects)
    
    # Bear red eye flares
    d_fx.ellipse([bear_x + int(bear_w * 0.52), bear_y + int(bear_h * 0.28), bear_x + int(bear_w * 0.52) + 12, bear_y + int(bear_h * 0.28) + 12], fill=(255, 30, 20, 240))
    
    # Floating embers/sparks
    np.random.seed(42)
    for _ in range(100):
        ex = np.random.randint(0, W)
        ey = np.random.randint(int(H * 0.3), H)
        sz = np.random.randint(2, 6)
        alpha = np.random.randint(120, 250)
        d_fx.rectangle([ex, ey, ex + sz, ey + sz], fill=(255, np.random.randint(100, 200), 40, alpha))
        
    bg = Image.alpha_composite(bg, effects)
    
    out_path = 'public/assets/cinematics/town_square/chapter3_apex.jpg'
    bg.convert('RGB').save(out_path, quality=92)
    print("Saved:", out_path)

if __name__ == '__main__':
    create_town_square_apex()
