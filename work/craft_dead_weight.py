"""
The Dead Weight: secret-trial legendary mace (Blood Cemetery). 64x34 pixel art in the knight atlas's weapon format:
haft on the left (grip rows 16-18, where the knight's fist sits), head on the right.

A femur haft with a knuckled pommel and a crimson-leather grip, wound with a grave chain; an iron collar; and a
coffin-shaped kettlebell head of tarnished coffin iron: handle loop toward the haft, a cross on its face, two bands
of chain around it, crimson light leaking from its seams and a few drops of blood falling from its foot.

    python work/craft_dead_weight.py   -> work/art_dead_weight.png (+ an 8x preview)
"""
from PIL import Image

W, H = 64, 34
img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
px = img.load()

OUT = (18, 9, 14, 255)
BONE = [(120, 108, 92, 255), (170, 160, 140, 255), (214, 206, 188, 255), (240, 234, 220, 255)]
LEATHER = [(52, 10, 18, 255), (92, 18, 32, 255), (130, 30, 48, 255)]
IRON = [(30, 27, 36, 255), (48, 43, 56, 255), (70, 63, 82, 255), (96, 88, 110, 255), (132, 124, 146, 255), (170, 164, 184, 255)]
CHAIN = [(60, 62, 70, 255), (110, 114, 124, 255), (170, 174, 182, 255)]
CRIMSON = [(76, 5, 25, 255), (159, 18, 57, 255), (225, 29, 72, 255), (251, 113, 133, 255), (255, 228, 230, 255)]


def put(x, y, c):
    if 0 <= x < W and 0 <= y < H:
        px[x, y] = c


def hline(x0, x1, y, c):
    for x in range(x0, x1 + 1):
        put(x, y, c)


def vline(x, y0, y1, c):
    for y in range(y0, y1 + 1):
        put(x, y, c)


# --- Haft: a femur, grip rows 16-18 -----------------------------------------------------------------------
# Pommel: the femur's knuckled head (x=0..4)
for y in range(13, 22):
    for x in range(0, 5):
        d = ((x - 2) / 2.6) ** 2 + ((y - 17) / 4.4) ** 2
        if d <= 1:
            put(x, y, BONE[2] if y < 17 else BONE[1])
put(1, 14, BONE[3]); put(2, 14, BONE[3]); put(1, 15, BONE[3])
put(2, 17, BONE[0])  # the notch between the condyles
# Shaft of bone (x=5..33), 3 px thick with a lit top edge
for x in range(5, 34):
    put(x, 16, BONE[3] if x % 7 else BONE[2])
    put(x, 17, BONE[2])
    put(x, 18, BONE[1])
    put(x, 15, OUT)
    put(x, 19, OUT)
# Crimson leather grip, wound diagonally (x=6..18)
for x in range(6, 19):
    for y in (16, 17, 18):
        band = (x + y) % 3
        put(x, y, LEATHER[2] if band == 0 else LEATHER[1] if band == 1 else LEATHER[0])
# Grip ends: bone rings
for x in (5, 19):
    vline(x, 15, 19, BONE[1]); put(x, 15, OUT); put(x, 19, OUT)
# Grave chain wound around the haft (x=21..29), and its loose end hanging below
for i, x in enumerate(range(21, 30, 2)):
    put(x, 15, CHAIN[2]); put(x, 16, CHAIN[1]); put(x + 1, 18, CHAIN[1]); put(x + 1, 19, CHAIN[0])
    put(x, 14, OUT)
for i, (x, y) in enumerate([(27, 20), (27, 21), (26, 22), (26, 23), (27, 24), (27, 25), (26, 26)]):
    put(x, y, CHAIN[2] if i % 2 == 0 else CHAIN[1])
    put(x + 1, y, OUT if i % 2 == 0 else (0, 0, 0, 0))
put(26, 27, CRIMSON[2])  # a drop on the chain's end

# --- Iron collar (x=31..33) -----------------------------------------------------------------------------
for x in range(31, 34):
    for y in range(13, 22):
        put(x, y, IRON[4] if y < 15 else IRON[3] if y < 18 else IRON[1])
    put(x, 12, OUT); put(x, 22, OUT)
vline(30, 13, 21, OUT); vline(34, 13, 21, OUT)
put(32, 14, IRON[5])

# --- Head: a kettlebell cast as an upright coffin (handle loop on top, body x=37..61, y=8..32) ---------------
CX = 49  # the bell's centre line


def half_width(y):
    """Coffin outline, standing: narrow head, wide shoulders at y=14, tapering to a narrow foot."""
    if y < 9 or y > 32:
        return None
    if y <= 14:
        return 6 + (y - 9) * 6 / 5
    return 12 - (y - 14) * 5.5 / 18


# Handle: a thick iron loop on top, its feet on the coffin's head
for y in range(0, 11):
    for x in range(CX - 9, CX + 10):
        d = ((x - CX) / 7.5) ** 2 + ((y - 9) / 8.6) ** 2
        if 0.5 <= d <= 1.0:
            put(x, y, IRON[4] if y < 3 else IRON[3] if x < CX else IRON[2])
for y in range(0, 11):
    for x in range(CX - 10, CX + 11):
        d = ((x - CX) / 7.5) ** 2 + ((y - 9) / 8.6) ** 2
        if (1.0 < d <= 1.32 or 0.34 <= d < 0.5) and px[x, y][3] == 0:
            put(x, y, OUT)

# Body: dark coffin iron, lit from the upper left, a ridge down the lid's centre
for y in range(9, 33):
    hw = half_width(y)
    l, r = round(CX - hw), round(CX + hw)
    for x in range(l, r + 1):
        u = (x - l) / max(1, r - l)
        v = (y - 9) / 23
        tone = 4 if u < 0.15 else 3 if u < 0.45 else 2 if u < 0.75 else 1 if u < 0.92 else 0
        if v > 0.8:
            tone = max(0, tone - 1)
        if y == 14 and 0.1 < u < 0.9:
            tone = 5  # the shoulder crease catches the light
        put(x, y, IRON[tone])
    put(l - 1, y, OUT)
    put(r + 1, y, OUT)
hline(round(CX - half_width(9)), round(CX + half_width(9)), 8, OUT)
hline(round(CX - half_width(32)), round(CX + half_width(32)), 33, OUT)

# The haft runs into the bell's flank through the collar
for x in range(35, 38):
    for y in (16, 17, 18):
        if px[x, y][3] == 0 or px[x, y] == OUT:
            put(x, y, IRON[2] if y == 17 else IRON[1])

# Two bands of grave chain wrapping the body
for by in (12, 26):
    hw = half_width(by)
    l, r = round(CX - hw) - 1, round(CX + hw) + 1
    for x in range(l, r + 1):
        put(x, by, CHAIN[2] if (x - l) % 2 == 0 else CHAIN[0])
        put(x, by + 1, CHAIN[1] if (x - l) % 2 == 1 else OUT)

# A cross on the lid, carved and glowing crimson
cx, cy = CX, 19
vline(cx, cy - 4, cy + 5, OUT)
hline(cx - 4, cx + 4, cy - 1, OUT)
vline(cx, cy - 3, cy + 4, CRIMSON[2])
hline(cx - 3, cx + 3, cy - 1, CRIMSON[2])
put(cx, cy - 1, CRIMSON[4])
put(cx, cy - 2, CRIMSON[3]); put(cx, cy + 1, CRIMSON[3])

# Seams leaking crimson light
for (x, y) in [(41, 15), (42, 16), (57, 17), (58, 18), (45, 23), (44, 24), (54, 22), (55, 29), (43, 29), (52, 10)]:
    if px[x, y][3] and px[x, y] != OUT:
        put(x, y, CRIMSON[2] if (x + y) % 2 else CRIMSON[3])

# Iron studs at the shoulders and foot
for (x, y) in [(39, 15), (59, 15), (45, 31), (53, 31)]:
    if px[x, y][3] and px[x, y] != OUT:
        put(x, y, IRON[5])

# Blood dripping from the foot
for (x, y) in [(47, 34), (52, 34)]:
    put(x, y, CRIMSON[2])

img.save("work/art_dead_weight.png")
img.resize((W * 8, H * 8), Image.NEAREST).save("work/art_dead_weight_8x.png")
print("saved work/art_dead_weight.png")
