#!/usr/bin/env python3
"""Cut the Amazon Appstore listing art and the Fire TV app's launcher icons out of the cover painting.

  python3 scripts/build_store_art.py

Source: store/cover.png (1920x1080). Writes
  store/amazon/  icon-512.png, icon-114.png (store icons), firetv-icon-1280x720.png (Fire TV app icon, titled),
                 background-1920x1080.png (Fire TV background, no text)
  android/app/src/main/res/  drawable-xhdpi/tv_banner.png (320x180 Fire TV launcher banner),
                 mipmap-*/ic_launcher{,_round,_foreground}.png
Rerun after changing the cover.
"""
import os
import urllib.request

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COVER = os.path.join(ROOT, 'store/cover.png')
STORE = os.path.join(ROOT, 'store/amazon')
RES = os.path.join(ROOT, 'android/app/src/main/res')
FONT = os.path.join(ROOT, 'work/fonts/PressStart2P.ttf')
FONT_URL = 'https://github.com/google/fonts/raw/main/ofl/pressstart2p/PressStart2P-Regular.ttf'

TITLE = 'KETTLEBELL KNIGHT'
GOLD = (255, 196, 64)
INK = (16, 10, 20)

# Square on the knight and his kettlebell, in cover pixels (left, top, size).
ICON_CROP = (585, 190, 800)
# Adaptive-icon foreground: launchers mask it to its middle 72 of 108dp, so crop wider (the full cover height).
FG_CROP = (445, 0, 1080)
# Launcher icons: legacy px size, adaptive foreground px size (108dp).
DENSITIES = {'mdpi': (48, 108), 'hdpi': (72, 162), 'xhdpi': (96, 216), 'xxhdpi': (144, 324), 'xxxhdpi': (192, 432)}


def font(size):
    if not os.path.exists(FONT):
        os.makedirs(os.path.dirname(FONT), exist_ok=True)
        urllib.request.urlretrieve(FONT_URL, FONT)
    return ImageFont.truetype(FONT, size)


def square(img, size, crop=ICON_CROP):
    x, y, s = crop
    return img.crop((x, y, x + s, y + s)).resize((size, size), Image.LANCZOS)


def titled(img, w, h, size, top):
    """Cover scaled to w x h with the title centred near the top, gold with a dark pixel outline."""
    out = img.resize((w, h), Image.LANCZOS)
    d = ImageDraw.Draw(out)
    f = font(size)
    tw = d.textlength(TITLE, font=f)
    stroke = max(2, size // 8)
    d.text(((w - tw) / 2, top + stroke), TITLE, font=f, fill=INK, stroke_width=stroke, stroke_fill=INK)
    d.text(((w - tw) / 2, top), TITLE, font=f, fill=GOLD, stroke_width=stroke, stroke_fill=INK)
    return out


def circle(img):
    mask = Image.new('L', (img.width * 4, img.height * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, mask.width - 1, mask.height - 1), fill=255)
    out = img.convert('RGBA')
    out.putalpha(mask.resize(img.size, Image.LANCZOS))
    return out


def save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, optimize=True)
    print(os.path.relpath(path, ROOT), f'{img.width}x{img.height}')


def main():
    cover = Image.open(COVER).convert('RGB')
    assert cover.size == (1920, 1080), cover.size

    save(square(cover, 512), os.path.join(STORE, 'icon-512.png'))
    save(square(cover, 114), os.path.join(STORE, 'icon-114.png'))
    save(titled(cover, 1280, 720, 48, 40), os.path.join(STORE, 'firetv-icon-1280x720.png'))
    save(cover, os.path.join(STORE, 'background-1920x1080.png'))

    save(titled(cover, 320, 180, 16, 10), os.path.join(RES, 'drawable-xhdpi/tv_banner.png'))
    for density, (px, fg) in DENSITIES.items():
        icon = square(cover, px)
        save(icon, os.path.join(RES, f'mipmap-{density}/ic_launcher.png'))
        save(circle(icon), os.path.join(RES, f'mipmap-{density}/ic_launcher_round.png'))
        save(square(cover, fg, FG_CROP), os.path.join(RES, f'mipmap-{density}/ic_launcher_foreground.png'))


if __name__ == '__main__':
    main()
