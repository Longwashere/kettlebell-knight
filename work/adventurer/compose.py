import sys; sys.path.insert(0, 'work/adventurer')
from PIL import Image, ImageDraw
from layout import W, H, PLACE, ORDER, SCALE
canvas = Image.new('RGBA', (W, H), (60, 60, 72, 255))
for name in ORDER:
    p = Image.open(f'work/adventurer/parts/{name}.png')
    s = SCALE.get(name, 1)
    if s != 1: p = p.resize((round(p.width*s), round(p.height*s)), Image.LANCZOS)
    canvas.alpha_composite(p, PLACE[name])
canvas.save('work/adventurer/compose.png')
