from PIL import Image, ImageDraw

W, H = 64, 34

def draw_morningstar(weight_text="32", color_band=(220, 38, 38, 255), bell_color=(45, 52, 62, 255), is_gold=False, is_fire=False, is_void=False):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    OUTLINE = (14, 16, 20, 255)
    
    # 1. HAFT / HANDLE (Held in hand, x: 2..20, y: 14..18)
    # Pommel cap
    d.ellipse([1, 13, 6, 19], fill=(70, 80, 95, 255) if not is_gold else (244, 180, 26, 255), outline=OUTLINE)
    if is_gold:
        d.point([(3, 16)], fill=(56, 182, 255, 255))
    elif is_fire:
        d.point([(3, 16)], fill=(245, 158, 11, 255))
    elif is_void:
        d.point([(3, 16)], fill=(0, 245, 140, 255))
        
    # Haft grip
    d.line([(6, 14), (20, 14)], fill=OUTLINE)
    d.line([(6, 18), (20, 18)], fill=OUTLINE)
    haft_color = (60, 42, 30, 255) if not is_gold else (220, 210, 190, 255)
    wrap_color = (120, 85, 60, 255) if not is_gold else (244, 180, 26, 255)
    for x in range(6, 21, 2):
        d.line([(x, 15), (x+1, 17)], fill=haft_color)
        d.point([(x, 15)], fill=wrap_color)
        
    # Steel ferrule & chain anchor ring (x: 20..24)
    ferrule_color = (130, 145, 160, 255) if not is_gold else (244, 180, 26, 255)
    d.rectangle([19, 13, 22, 19], fill=ferrule_color, outline=OUTLINE)
    d.ellipse([21, 14, 25, 18], outline=OUTLINE, width=1) # anchor eyelet ring
    
    # 2. HEAVY IRON CHAIN LINKS (Drooping / connecting from x: 24 to x: 37, y: 15..22)
    chain_color = (150, 165, 180, 255)
    chain_glow = None
    if is_gold:
        chain_color = (255, 230, 110, 255)
        chain_glow = (255, 252, 220, 255)
    elif is_fire:
        chain_color = (245, 158, 11, 255)
        chain_glow = (255, 240, 100, 255)
    elif is_void:
        chain_color = (192, 132, 252, 255)
        chain_glow = (0, 245, 140, 255)
        
    # Link 1 (horizontal oval)
    d.ellipse([24, 14, 28, 18], fill=chain_color, outline=OUTLINE)
    d.point([(26, 16)], fill=(0, 0, 0, 0)) # hollow link center
    # Link 2 (interlocking vertical oval)
    d.ellipse([27, 16, 31, 22], fill=chain_color, outline=OUTLINE)
    d.point([(29, 19)], fill=(0, 0, 0, 0))
    # Link 3 (horizontal oval connecting to kettlebell handle)
    d.ellipse([30, 18, 35, 23], fill=chain_color, outline=OUTLINE)
    d.point([(32, 20)], fill=(0, 0, 0, 0))
    
    if chain_glow:
        d.point([(26, 15), (29, 17), (33, 19)], fill=chain_glow)
        
    # 3. KETTLEBELL MORNINGSTAR HEAD (x: 34..62, y: 4..32)
    # The chain connects to the kettlebell's top handle at (35, 18)!
    
    # Handle & horns (tilted slightly towards chain)
    d.rounded_rectangle([34, 11, 46, 25], radius=4, fill=bell_color, outline=OUTLINE, width=2)
    d.rounded_rectangle([37, 14, 43, 22], radius=2, fill=(0, 0, 0, 0), outline=OUTLINE, width=1)
    
    # Competition horn bands
    d.rectangle([34, 14, 36, 18], fill=color_band, outline=OUTLINE)
    d.rectangle([44, 14, 46, 18], fill=color_band, outline=OUTLINE)
    
    # Bell sphere (centered at x=48, y=18, radius 12 -> [36, 6, 60, 30])
    d.ellipse([36, 6, 60, 30], fill=bell_color, outline=OUTLINE, width=2)
    # Flat base (on the right side)
    d.polygon([(58, 12), (61, 14), (61, 22), (58, 24)], fill=bell_color, outline=OUTLINE)
    
    # 3D Shading on sphere
    d.arc([37, 7, 59, 29], 0, 120, fill=(20, 24, 28, 255) if not is_gold else (160, 100, 15, 255), width=2)
    d.arc([38, 8, 58, 28], 140, 270, fill=(85, 98, 115, 255) if not is_gold else (255, 225, 100, 255), width=2)
    d.point([(41, 10), (42, 9)], fill=(200, 215, 230, 255) if not is_gold else (255, 255, 230, 255))
    
    # Center recessed circular weight badge
    d.ellipse([41, 11, 55, 25], fill=(28, 33, 40, 255) if not is_gold else (200, 135, 20, 255), outline=OUTLINE, width=1)
    d.ellipse([42, 12, 54, 24], fill=(20, 24, 30, 255) if not is_gold else (175, 110, 15, 255))
    
    # Stamped weight text
    num_color = (255, 255, 255, 255) if not is_gold else (255, 250, 200, 255)
    sub_color = color_band
    
    if weight_text == "32":
        # 3
        d.line([(44, 15), (47, 15)], fill=num_color)
        d.line([(47, 15), (47, 17)], fill=num_color)
        d.line([(45, 17), (47, 17)], fill=num_color)
        d.line([(47, 17), (47, 19)], fill=num_color)
        d.line([(44, 19), (47, 19)], fill=num_color)
        # 2
        d.line([(49, 15), (52, 15)], fill=num_color)
        d.line([(52, 15), (52, 17)], fill=num_color)
        d.line([(49, 17), (52, 17)], fill=num_color)
        d.line([(49, 17), (49, 19)], fill=num_color)
        d.line([(49, 19), (52, 19)], fill=num_color)
    elif weight_text == "48":
        # 4
        d.line([(44, 15), (44, 17)], fill=num_color)
        d.line([(44, 17), (47, 17)], fill=num_color)
        d.line([(47, 15), (47, 19)], fill=num_color)
        # 8
        d.rectangle([49, 15, 52, 19], outline=num_color)
        d.line([(49, 17), (52, 17)], fill=num_color)
    elif weight_text == "64":
        # 6
        d.line([(44, 15), (47, 15)], fill=num_color)
        d.line([(44, 15), (44, 19)], fill=num_color)
        d.line([(44, 19), (47, 19)], fill=num_color)
        d.line([(47, 17), (47, 19)], fill=num_color)
        d.line([(44, 17), (47, 17)], fill=num_color)
        # 4
        d.line([(49, 15), (49, 17)], fill=num_color)
        d.line([(49, 17), (52, 17)], fill=num_color)
        d.line([(52, 15), (52, 19)], fill=num_color)
    elif weight_text == "100":
        # 1
        d.line([(44, 15), (44, 19)], fill=num_color)
        # 0
        d.rectangle([46, 15, 48, 19], outline=num_color)
        # 0
        d.rectangle([50, 15, 52, 19], outline=num_color)
        
    # "KG"
    d.point([(46, 21), (46, 22), (47, 21), (48, 22)], fill=sub_color)
    d.point([(49, 21), (50, 21), (49, 22), (51, 22)], fill=sub_color)
    
    # 4. MORNINGSTAR CRUSHING SPIKES
    spike_color = (170, 185, 200, 255)
    if is_gold:
        spike_color = (255, 240, 150, 255)
    elif is_fire:
        spike_color = (245, 158, 11, 255)
    elif is_void:
        spike_color = (192, 132, 252, 255)
        
    # Top spike
    d.polygon([(46, 6), (48, 2), (50, 6)], fill=spike_color, outline=OUTLINE)
    # Right mega strike spike (out from flat base)
    d.polygon([(59, 15), (64, 18), (59, 21)], fill=spike_color, outline=OUTLINE)
    # Bottom spike
    d.polygon([(46, 30), (48, 34), (50, 30)], fill=spike_color, outline=OUTLINE)
    # Top-right 45-deg spike
    d.polygon([(54, 8), (58, 5), (57, 11)], fill=spike_color, outline=OUTLINE)
    # Bottom-right 45-deg spike
    d.polygon([(54, 28), (58, 31), (57, 25)], fill=spike_color, outline=OUTLINE)
    
    return img

i = draw_morningstar("32", color_band=(220, 38, 38, 255), bell_color=(45, 52, 62, 255))
e = draw_morningstar("48", color_band=(56, 182, 255, 255), bell_color=(235, 175, 25, 255), is_gold=True)
d = draw_morningstar("64", color_band=(245, 158, 11, 255), bell_color=(165, 28, 30, 255), is_fire=True)
v = draw_morningstar("100", color_band=(0, 245, 140, 255), bell_color=(85, 25, 135, 255), is_void=True)

comp = Image.new("RGBA", (W * 4 + 30, H + 10), (20, 18, 25, 255))
comp.paste(i, (5, 5), i)
comp.paste(e, (W + 10, 5), e)
comp.paste(d, (W * 2 + 15, 5), d)
comp.paste(v, (W * 3 + 20, 5), v)
comp.save('work/morningstars_preview.png')
print("Morningstar kettlebells preview generated!")
