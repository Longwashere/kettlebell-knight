from PIL import Image, ImageDraw

W, H = 64, 30

def draw_kettle_mace(weight_text="32"):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    OUTLINE = (18, 22, 28, 255)
    IRON_DARK = (45, 52, 62, 255)
    IRON_MID = (75, 86, 100, 255)
    IRON_LIGHT = (125, 138, 155, 255)
    STEEL_EDGE = (195, 208, 222, 255)
    
    # 1. HAFT / SHAFT (x: 2..26, y: 12..18)
    # Pommel
    d.ellipse([1, 11, 6, 19], fill=IRON_MID, outline=OUTLINE)
    # Shaft
    d.line([(6, 13), (25, 13)], fill=OUTLINE)
    d.line([(6, 17), (25, 17)], fill=OUTLINE)
    for x in range(6, 25, 2):
        d.line([(x, 14), (x+1, 16)], fill=(65, 45, 30, 255))
        d.point([(x, 14)], fill=(120, 85, 60, 255))
        
    # Steel collar & reinforcing langets (x: 24..30)
    d.rectangle([24, 11, 29, 19], fill=IRON_MID, outline=OUTLINE)
    d.line([(27, 12), (27, 18)], fill=STEEL_EDGE)
    
    # 2. RIGID WELDED KETTLEBELL HEAD (x: 29..61, y: 2..28)
    # Handle / Horns arching from shaft to bell
    d.rounded_rectangle([28, 8, 42, 22], radius=4, fill=IRON_DARK, outline=OUTLINE, width=2)
    d.rounded_rectangle([32, 11, 38, 19], radius=2, fill=(0, 0, 0, 0), outline=OUTLINE, width=1)
    # Red competition horn bands
    d.rectangle([29, 11, 31, 15], fill=(220, 38, 38, 255), outline=OUTLINE)
    d.rectangle([39, 11, 41, 15], fill=(220, 38, 38, 255), outline=OUTLINE)
    
    # Bell sphere
    d.ellipse([34, 4, 56, 26], fill=IRON_MID, outline=OUTLINE, width=1)
    d.polygon([(52, 6), (58, 10), (58, 20), (52, 24)], fill=IRON_DARK, outline=OUTLINE)
    
    # Shading
    d.ellipse([36, 6, 54, 24], fill=IRON_DARK)
    d.arc([37, 7, 52, 23], 120, 280, fill=IRON_LIGHT, width=2)
    d.point([(39, 8), (40, 8)], fill=STEEL_EDGE)
    
    # Recessed weight badge
    d.ellipse([41, 9, 51, 21], fill=(24, 28, 35, 255), outline=OUTLINE)
    # Stamped 32
    d.line([(43, 12), (45, 12)], fill=(255, 255, 255, 255))
    d.line([(45, 12), (45, 14)], fill=(255, 255, 255, 255))
    d.line([(44, 14), (45, 14)], fill=(255, 255, 255, 255))
    d.line([(45, 14), (45, 16)], fill=(255, 255, 255, 255))
    d.line([(43, 16), (45, 16)], fill=(255, 255, 255, 255))
    
    d.line([(47, 12), (49, 12)], fill=(255, 255, 255, 255))
    d.line([(49, 12), (49, 14)], fill=(255, 255, 255, 255))
    d.line([(47, 14), (49, 14)], fill=(255, 255, 255, 255))
    d.line([(47, 14), (47, 16)], fill=(255, 255, 255, 255))
    d.line([(47, 16), (49, 16)], fill=(255, 255, 255, 255))
    
    # Heavy blunt striking flanges on the front of the bell
    d.polygon([(54, 7), (62, 5), (56, 12)], fill=IRON_LIGHT, outline=OUTLINE)
    d.polygon([(56, 13), (63, 15), (56, 17)], fill=STEEL_EDGE, outline=OUTLINE)
    d.polygon([(54, 23), (62, 25), (56, 18)], fill=IRON_LIGHT, outline=OUTLINE)
    
    return img

mace_img = draw_kettle_mace()
mace_img.save("work/mace_preview.png")
print("Saved work/mace_preview.png")
