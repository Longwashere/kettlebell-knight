"""
Pixel art for the secret-trial weapons (src/shared/secretTrials.ts), in the knight atlas's weapon formats:
  maces / swords   64x34, haft on the left (grip rows 16-18), head on the right
  morning stars    64x34, a handle slanting down the left edge, the head hanging from a chain on the right
  bells            40x40, an upright kettlebell (handle on top)

    python work/craft_secret_weapons.py   -> work/art_<id>.png (+ work/art_secret_weapons_8x.png contact sheet)
"""
import math
from PIL import Image

OUT = (16, 10, 16, 255)
CLEAR = (0, 0, 0, 0)


def canvas(w, h):
    img = Image.new("RGBA", (w, h), CLEAR)
    return img, img.load()


def put(px, w, h, x, y, c):
    if 0 <= x < w and 0 <= y < h:
        px[x, y] = c


def outline(img):
    """A 1px dark outline around everything opaque."""
    w, h = img.size
    px = img.load()
    src = img.copy().load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3]:
                continue
            if any(0 <= x + dx < w and 0 <= y + dy < h and src[x + dx, y + dy][3] and src[x + dx, y + dy] != OUT
                   for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                px[x, y] = OUT


def sphere(px, w, h, cx, cy, r, pal, light=(-0.6, -0.7), squash=1.0):
    """A lit ball in banded tones (pal dark → light), like the painted bells."""
    for y in range(int(cy - r - 1), int(cy + r + 2)):
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            dx = (x - cx) / r
            dy = (y - cy) / (r * squash)
            d = dx * dx + dy * dy
            if d > 1:
                continue
            nz = math.sqrt(1 - d)
            lum = max(0, -dx * light[0] - dy * light[1] + nz * 0.6) / 1.6
            k = min(len(pal) - 1, int(lum * len(pal)))
            put(px, w, h, x, y, pal[k])


def ring(px, w, h, cx, cy, rx, ry, thick, pal):
    """An elliptical loop (a kettlebell handle), lit on its upper-left."""
    for y in range(int(cy - ry - thick - 1), int(cy + ry + thick + 2)):
        for x in range(int(cx - rx - thick - 1), int(cx + rx + thick + 2)):
            d = math.hypot((x - cx) / rx, (y - cy) / ry)
            if abs(d - 1) * min(rx, ry) <= thick / 2:
                a = math.atan2(y - cy, x - cx)
                k = 2 if -2.4 < a < -0.8 else 1 if a < 0 else 0
                put(px, w, h, x, y, pal[k])


def ms_handle(px, w, h, wood, wrap):
    """The morning-star handle: slanting down the left edge (the fist sits on its upper half)."""
    for y in range(1, 33):
        x0 = 9 - int(y * 8 / 32)
        for x in range(x0, x0 + 4):
            c = wood[1] if x == x0 else wood[2] if x == x0 + 1 else wood[0]
            if 8 <= y <= 20 and (y + x) % 3 == 0:
                c = wrap
            put(px, w, h, x, y, c)
    for x in range(8, 14):
        put(px, w, h, x, 1, wood[2])


def chain(px, w, h, x0, y0, x1, y1, sag, pal):
    n = max(2, int(math.hypot(x1 - x0, y1 - y0) / 2))
    for i in range(n + 1):
        u = i / n
        x = round(x0 + (x1 - x0) * u)
        y = round(y0 + (y1 - y0) * u + math.sin(u * math.pi) * sag)
        put(px, w, h, x, y, pal[1] if i % 2 else pal[2])
        if i % 2 == 0:
            put(px, w, h, x + 1, y, pal[0])


def bell_body(px, w, h, pal, handle_pal, cx=20, cy=25, r=13):
    """An upright kettlebell: handle loop, round body, flat base."""
    ring(px, w, h, cx, cy - r - 2, 8, 7, 3, handle_pal)
    sphere(px, w, h, cx, cy, r, pal)
    for x in range(cx - 8, cx + 9):
        put(px, w, h, x, cy + r - 1, pal[0])
        put(px, w, h, x, cy + r, pal[0])


def haft(px, w, h, x0, x1, pal, grip=None):
    """A horizontal haft on rows 15-19 (grip rows 16-18)."""
    for x in range(x0, x1):
        put(px, w, h, x, 16, pal[2])
        put(px, w, h, x, 17, pal[1])
        put(px, w, h, x, 18, pal[0])
    if grip:
        for x in range(6, 19):
            for y in (16, 17, 18):
                put(px, w, h, x, y, grip[(x + y) % len(grip)])


# --------------------------------------------------------------------------------------------------------------

def bellringer_mallet():
    img, px = canvas(64, 34)
    w, h = img.size
    # Striped carnival haft
    for x in range(1, 44):
        for y in (16, 17, 18):
            red = (x // 4) % 2 == 0
            c = [(150, 22, 22, 255), (220, 38, 38, 255), (248, 113, 113, 255)] if red else [(205, 190, 160, 255), (240, 228, 205, 255), (255, 250, 240, 255)]
            put(px, w, h, x, y, c[2 if y == 16 else 1 if y == 17 else 0])
    for x in range(6, 18):
        for y in (16, 17, 18):
            put(px, w, h, x, y, [(70, 30, 12, 255), (110, 52, 22, 255)][(x + y) % 2])
    # The head: a wooden barrel standing across the haft, brass bands, a brass bell bolted on its face
    wood = [(74, 36, 14, 255), (110, 58, 24, 255), (150, 86, 40, 255), (186, 120, 62, 255)]
    brass = [(120, 70, 10, 255), (183, 121, 31, 255), (242, 182, 54, 255), (253, 230, 138, 255)]
    for y in range(3, 32):
        for x in range(40, 58):
            u = (x - 40) / 17
            k = 3 if u < 0.2 else 2 if u < 0.5 else 1 if u < 0.85 else 0
            c = wood[k]
            if y in (4, 5, 30, 31) or y in (12, 22):
                c = brass[min(3, k + 1)] if y not in (5, 31) else brass[0]
            put(px, w, h, x, y, c)
    sphere(px, w, h, 52, 17, 6, brass)
    put(px, w, h, 50, 15, (255, 255, 240, 255))
    for x in range(51, 54):
        put(px, w, h, x, 23, brass[0])
    outline(img)
    return img


def leviathan_anchor():
    img, px = canvas(64, 34)
    w, h = img.size
    ms_handle(px, w, h, [(40, 34, 30, 255), (70, 62, 56, 255), (110, 100, 90, 255)], (20, 120, 130, 255))
    iron = [(30, 34, 36, 255), (60, 70, 72, 255), (100, 112, 112, 255), (150, 160, 158, 255)]
    chain(px, w, h, 12, 2, 40, 6, 8, [(40, 44, 46, 255), (90, 100, 100, 255), (150, 160, 158, 255)])
    # Ring, stock, shank, and flukes curving up to points
    ring(px, w, h, 41, 6, 3, 3, 2, iron[1:])
    for x in range(35, 48):
        put(px, w, h, x, 10, iron[2])
        put(px, w, h, x, 11, iron[1])
    for y in range(9, 30):
        put(px, w, h, 40, y, iron[3])
        put(px, w, h, 41, y, iron[2])
        put(px, w, h, 42, y, iron[1])
    for i in range(14):
        a = math.pi * (0.05 + 0.9 * i / 13)
        for t in range(3):
            x = round(41 + math.cos(a) * (12 - t * 0.6))
            y = round(24 + math.sin(a) * (7 - t * 0.4))
            put(px, w, h, x, y, iron[3 - t])
    for side in (-1, 1):
        tip = 41 + side * 12
        for k in range(4):
            put(px, w, h, tip + side * (k // 2), 23 - k, iron[3])
            put(px, w, h, tip - side * 1, 22 - k, iron[2])
    # Barnacles and weed
    for (x, y) in [(39, 15), (42, 19), (35, 27), (47, 28), (38, 12)]:
        put(px, w, h, x, y, (230, 225, 210, 255))
    for (x, y) in [(43, 14), (44, 15), (43, 16), (36, 26), (36, 27), (46, 27)]:
        put(px, w, h, x, y, (45, 160, 140, 255))
    outline(img)
    return img


def everburning_censer():
    img, px = canvas(64, 34)
    w, h = img.size
    ms_handle(px, w, h, [(70, 76, 90, 255), (130, 138, 155, 255), (200, 206, 220, 255)], (56, 120, 190, 255))
    silver = [(70, 78, 92, 255), (120, 130, 148, 255), (175, 184, 200, 255), (225, 232, 240, 255)]
    chain(px, w, h, 12, 2, 42, 8, 6, silver)
    # Domed cage on a footed cup, soul-light through its slots
    sphere(px, w, h, 42, 21, 9, silver, squash=1.05)
    for y in range(29, 32):
        for x in range(37, 48):
            put(px, w, h, x, y, silver[1 if y < 31 else 0])
    for x in range(40, 45):
        put(px, w, h, x, 11, silver[2])
        put(px, w, h, x, 12, silver[3])
    for k in range(-2, 3):
        for y in range(16, 26):
            if (y + k) % 4:
                put(px, w, h, 42 + k * 3, y, (125, 211, 252, 255) if k else (224, 242, 254, 255))
    for y in range(13, 30):
        put(px, w, h, 42 + (1 if y % 3 else 0), y, silver[3]) if y in (13, 14) else None
    outline(img)
    # Smoke curling up
    for (x, y) in [(46, 9), (47, 7), (46, 5), (48, 3)]:
        put(px, w, h, x, y, (186, 230, 253, 180))
    return img


def tolling_thunder():
    img, px = canvas(40, 40)
    w, h = img.size
    bronze = [(58, 36, 16, 255), (107, 69, 24, 255), (154, 106, 36, 255), (201, 154, 62, 255), (242, 210, 122, 255)]
    bell_body(px, w, h, bronze, bronze[1:])
    # The crack the storm split it with, glowing cyan
    pts = [(14, 16), (17, 21), (15, 25), (19, 29), (17, 34)]
    for (a, b) in zip(pts, pts[1:]):
        n = max(abs(b[0] - a[0]), abs(b[1] - a[1]))
        for i in range(n + 1):
            x = round(a[0] + (b[0] - a[0]) * i / n)
            y = round(a[1] + (b[1] - a[1]) * i / n)
            put(px, w, h, x, y, (165, 243, 252, 255))
            put(px, w, h, x + 1, y, (34, 211, 238, 255))
    # Rim runes
    for x in range(10, 31, 4):
        put(px, w, h, x, 31, (103, 232, 249, 255))
    outline(img)
    for (x, y) in [(31, 12), (33, 10), (34, 13), (7, 30), (5, 28)]:
        put(px, w, h, x, y, (165, 243, 252, 255))
    return img


def midas_bell():
    img, px = canvas(40, 40)
    w, h = img.size
    gold = [(124, 74, 3, 255), (183, 121, 31, 255), (217, 154, 31, 255), (242, 182, 54, 255), (253, 230, 138, 255)]
    bell_body(px, w, h, gold, gold[1:])
    # A coin stamped on its face
    sphere(px, w, h, 20, 26, 5, [gold[1], gold[2], gold[3], gold[4]])
    for y in range(23, 30):
        put(px, w, h, 20, y, gold[0])
    for x in range(18, 23):
        put(px, w, h, x, 24, gold[0])
        put(px, w, h, x, 28, gold[0])
    outline(img)
    for (x, y) in [(12, 17), (11, 18), (13, 18), (12, 19), (30, 30), (6, 9), (33, 7)]:
        put(px, w, h, x, y, (255, 251, 234, 255))
    return img


def hollow_bell():
    img, px = canvas(40, 40)
    w, h = img.size
    void = [(10, 3, 20, 255), (30, 12, 50, 255), (59, 7, 100, 255), (107, 33, 168, 255), (168, 85, 247, 255)]
    bell_body(px, w, h, void, void[1:])
    # Hollow inside: a dark mouth and one great eye
    for y in range(19, 33):
        for x in range(12, 29):
            if ((x - 20) / 8) ** 2 + ((y - 26) / 7) ** 2 <= 1:
                put(px, w, h, x, y, (5, 2, 12, 255))
    for y in range(22, 31):
        for x in range(14, 27):
            d = ((x - 20) / 6) ** 2 + ((y - 26) / 4) ** 2
            if d <= 1:
                put(px, w, h, x, y, (220, 252, 231, 255) if d > 0.35 else (74, 222, 128, 255))
    for y in range(24, 29):
        put(px, w, h, 20, y, (5, 2, 12, 255))
        put(px, w, h, 21, y, (5, 2, 12, 255))
    put(px, w, h, 18, 24, (255, 255, 255, 255))
    outline(img)
    return img


def heartforge():
    img, px = canvas(64, 34)
    w, h = img.size
    haft(px, w, h, 1, 22, [(30, 26, 24, 255), (60, 54, 50, 255), (95, 88, 82, 255)], grip=[(80, 20, 10, 255), (130, 40, 16, 255)])
    for y in range(13, 22):
        put(px, w, h, 1, y, (68, 64, 60, 255))
        put(px, w, h, 2, y, (95, 88, 82, 255))
    # Crossguard and the glowing heart-core
    for y in range(9, 26):
        for x in range(20, 24):
            put(px, w, h, x, y, [(50, 44, 40, 255), (85, 78, 72, 255), (120, 112, 104, 255), (60, 54, 50, 255)][x - 20])
    sphere(px, w, h, 26, 17, 5, [(124, 45, 18, 255), (234, 88, 12, 255), (251, 146, 60, 255), (253, 230, 138, 255)])
    # The blade: dark steel with a molten channel, widening then tapering to a point
    for x in range(31, 63):
        half = 4 if x < 52 else max(0, 4 - (x - 52) // 3)
        for y in range(17 - half, 18 + half):
            k = 3 if y <= 17 - half + 1 else 1 if y >= 17 + half - 1 else 2
            put(px, w, h, x, y, [(30, 30, 34, 255), (70, 70, 78, 255), (120, 120, 130, 255), (180, 180, 190, 255)][k])
        if half >= 1:
            put(px, w, h, x, 17, (253, 186, 116, 255) if x % 5 else (254, 240, 138, 255))
    outline(img)
    return img


def excalibane():
    """Excalibell, palette-swapped into its shadow twin: gold → obsidian and violet, white blade → dusk."""
    src = Image.open("work/art_excalibell.png").convert("RGBA")
    out = Image.new("RGBA", src.size, CLEAR)
    sp, op = src.load(), out.load()
    for y in range(src.height):
        for x in range(src.width):
            r, g, b, a = sp[x, y]
            if not a:
                continue
            lum = (r * 0.3 + g * 0.59 + b * 0.11) / 255
            if r > 150 and g > 100 and b < 120:  # gold
                c = (int(40 + lum * 120), int(30 + lum * 80), int(70 + lum * 170))
            elif r > 200 and g > 200 and b > 150:  # the blade's white core
                c = (int(28 + lum * 40), int(18 + lum * 22), int(50 + lum * 70))
            elif b > r and b > g:  # the blue grip
                c = (int(90 + lum * 120), int(20 + lum * 30), int(30 + lum * 40))
            else:
                c = (int(r * 0.5), int(g * 0.4), int(b * 0.7))
            op[x, y] = (min(255, c[0]), min(255, c[1]), min(255, c[2]), a)
    return out


WEAPONS = {
    "bellringer_mallet": bellringer_mallet,
    "leviathan_anchor": leviathan_anchor,
    "everburning_censer": everburning_censer,
    "tolling_thunder": tolling_thunder,
    "midas_bell": midas_bell,
    "heartforge": heartforge,
    "hollow_bell": hollow_bell,
    "excalibane": excalibane,
}

if __name__ == "__main__":
    sheet = Image.new("RGBA", (64 * len(WEAPONS) + 4 * len(WEAPONS), 40), (40, 40, 60, 255))
    x = 0
    for name, fn in WEAPONS.items():
        img = fn()
        img.save(f"work/art_{name}.png")
        sheet.alpha_composite(img, (x, 0))
        x += img.width + 4
        print("saved", name, img.size)
    sheet.resize((sheet.width * 6, sheet.height * 6), Image.NEAREST).save("work/art_secret_weapons_8x.png")
