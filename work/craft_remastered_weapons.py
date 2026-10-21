"""
Remastered weapon art for the knight atlas (src/tv: HulkForm2), built with work/weaponkit.py.
Each weapon keeps its atlas format and grip so the knight still holds it the same way:
  bells          40x40, upright kettlebell, handle on top
  morning stars  64x34, handle on the left (rows ~11-16), chain to a spiked bell hanging on the right
  slung stars    64x34, a handle slanting down the left edge, the head on a chain (leviathan, censer)
  hafted         64x34, haft on the left (grip rows 16-18), head/blade to the right

    python3 work/craft_remastered_weapons.py        -> work/remaster/<id>.png + work/remaster/sheet.png
    python3 work/pack_remastered_weapons.py          -> pastes them into public/assets/spine/knight/HulkForm2.png
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from weaponkit import Canvas, Mat, ramp, noise2, digit_pts, upscale_sheet, hexc  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(__file__), 'remaster')
NZ = noise2(7)
NZ2 = noise2(31)

# --- materials -----------------------------------------------------------------------------------------------
IRON = Mat(ramp('#07060b', '#16161e', '#272a34', '#3d424e', '#5b6270', '#838c9b', '#b4bdca', '#e6ecf3', n=9),
           ks=0.5, shin=20, kd=0.78, amb=0.05, dither=0.3, rim='#5a6d94', rim_k=0.25)
STEEL = Mat(ramp('#0d0e14', '#232733', '#3b4352', '#5d6879', '#8996a8', '#bcc7d5', '#f2f6fb', n=8),
            ks=0.8, shin=26, kd=0.75, amb=0.08, rim='#9fb4d6', rim_k=0.4)
LEATHER = Mat(ramp('#120806', '#2a140c', '#472516', '#6b3a20', '#8f5530', '#b47443', n=6), kd=0.9, amb=0.1)
CRIMSON = Mat(ramp('#1e0308', '#4a0812', '#7d0f1c', '#b31b28', '#e0413f', '#ff8a6b', n=6), ks=0.3, kd=0.85, amb=0.15)
RUST = Mat(ramp('#1c0b06', '#3d1a0c', '#64301a', '#8e4a24', '#b26a34', n=5), kd=0.9, amb=0.1)

GOLD = Mat(ramp('#1d0e05', '#4a2a0b', '#7a4c12', '#a8741c', '#d29f2e', '#efc659', '#fde89c', '#fffbe6', n=9),
           ks=0.85, shin=24, kd=0.75, amb=0.08, rim='#9fd8ff', rim_k=0.35)
WHITEGOLD = Mat(ramp('#2a1a0c', '#5c3f18', '#946c2a', '#c49a45', '#e6c56d', '#f8e3a1', '#fff8df', '#ffffff', n=8),
                ks=0.9, shin=28, kd=0.75, amb=0.1, rim='#8fd0ff', rim_k=0.4)
SAPPHIRE = Mat(ramp('#020617', '#0b2253', '#123f8f', '#1f6fd1', '#4ea6f5', '#a6dcff', '#ffffff', n=7),
               ks=1.2, shin=30, kd=0.7, amb=0.15)
SILK = Mat(ramp('#060a1f', '#0f1d4d', '#1c3685', '#2f56b9', '#5b86e0', n=5), kd=0.9, amb=0.12)
HOLYGLOW = Mat(ramp('#f5c84a', '#ffe59a', '#fff7d6', '#ffffff', n=4), emissive=True)

SCALE = Mat(ramp('#0b0204', '#24060a', '#430b10', '#6c1414', '#962318', '#bf3f1c', '#e2702b', n=7),
            ks=0.45, shin=16, kd=0.8, amb=0.06, rim='#ff7a2a', rim_k=0.45)
OBSIDIAN = Mat(ramp('#050307', '#120c14', '#21161f', '#342230', '#4d3546', '#735266', n=6),
               ks=0.7, shin=24, kd=0.7, amb=0.05, rim='#ff5a1f', rim_k=0.5)
BONE = Mat(ramp('#1c140c', '#3d2f20', '#66533b', '#8f7b5d', '#b9a684', '#ded1b1', '#f6efdc', n=7), ks=0.25, kd=0.85, amb=0.1)
EMBER = Mat(ramp('#7a1004', '#c22a06', '#f2580c', '#ff9a1f', '#ffd25a', '#fff4c2', n=6), emissive=True)

VOIDM = Mat(ramp('#040208', '#0e0718', '#1c0f2e', '#2e1847', '#472466', '#673591', '#9156c7', '#c99cf2', n=8),
            ks=0.7, shin=22, kd=0.72, amb=0.05, dither=0.2, rim='#3dffa8', rim_k=0.35)
CRYSTAL = Mat(ramp('#12052a', '#2b0c5c', '#4b1a93', '#7a35d1', '#a96cf5', '#d8b6ff', '#ffffff', n=7),
              ks=1.1, shin=18, kd=0.8, amb=0.12)
VOIDGLOW = Mat(ramp('#03482a', '#05a35a', '#2df08c', '#a6ffd2', '#ffffff', n=5), emissive=True)
NIGHT = Mat(ramp('#000000', '#05020b', '#0c0619', '#150b29', n=4), emissive=True)

BRONZE = Mat(ramp('#160904', '#341a0a', '#5a3112', '#83501f', '#ab7432', '#cf9a4c', '#ecc47a', '#fff0c4', n=8),
             ks=0.6, shin=18, kd=0.78, amb=0.07, dither=0.2, rim='#67e8f9', rim_k=0.45)
VERDIGRIS = Mat(ramp('#0c2a26', '#14473f', '#1f6b5c', '#3a9480', '#6cc0a6', n=5), kd=0.85, amb=0.1)
STORMGLOW = Mat(ramp('#0e5d7a', '#22b8e0', '#7ff0ff', '#e8ffff', '#ffffff', n=5), emissive=True)

SILVER = Mat(ramp('#0f1119', '#262b3a', '#434b60', '#677189', '#919bb1', '#bfc8d8', '#e8eef6', '#ffffff', n=8),
             ks=0.85, shin=26, kd=0.75, amb=0.08, rim='#7dd3fc', rim_k=0.45)
SOULGLOW = Mat(ramp('#1b5c86', '#3aa0d8', '#8fdcff', '#e3f7ff', '#ffffff', n=5), emissive=True)

WOOD = Mat(ramp('#1a0c05', '#33190a', '#542c12', '#7a441d', '#a0602b', '#c4853f', n=6), kd=0.88, amb=0.08, dither=0.15)
CREAM = Mat(ramp('#3b2f22', '#7a6a52', '#b8a684', '#e2d4b2', '#fbf3df', n=5), kd=0.85, amb=0.12, ks=0.2)
CARNIVAL = Mat(ramp('#2a0306', '#5e0a10', '#9c1419', '#d12a24', '#f2614a', n=5), kd=0.85, amb=0.12, ks=0.25)
BRASS = Mat(ramp('#1f1003', '#4d2c08', '#7f5011', '#b27d1f', '#dcab3a', '#f6d878', '#fff6cf', n=7),
            ks=0.85, shin=22, kd=0.75, amb=0.08)

SEAIRON = Mat(ramp('#05090b', '#101b20', '#1c2e35', '#2c4650', '#42636c', '#628990', '#8fb5b8', '#cde6e4', n=8),
              ks=0.45, shin=16, kd=0.78, amb=0.06, dither=0.25, rim='#7ff0ff', rim_k=0.45)
BARNACLE = Mat(ramp('#3a352c', '#6f6656', '#a59a83', '#d6ccb4', '#f4eedf', n=5), kd=0.85, amb=0.15)
WEED = Mat(ramp('#06201a', '#0d3a2c', '#14594a', '#1f8068', '#33a888', n=5), kd=0.9, amb=0.1)
RIME = Mat(ramp('#7fd6ff', '#c7f1ff', '#ffffff', n=3), emissive=True)

FORGESTEEL = Mat(ramp('#08070a', '#17151b', '#29252d', '#3e3942', '#595159', '#7d7277', '#a99b9b', '#d8cfcc', n=8),
                 ks=0.7, shin=22, kd=0.75, amb=0.06, rim='#ff7a2a', rim_k=0.55)
GRAVEIRON = Mat(ramp('#060509', '#131119', '#221e2a', '#35303f', '#4c4658', '#686277', '#8f88a0', n=7),
                ks=0.4, shin=14, kd=0.78, amb=0.05, dither=0.3, rim='#ff2d55', rim_k=0.4)
BLOODGLOW = Mat(ramp('#4a0010', '#9c0a26', '#e8173f', '#ff6b7f', '#ffd0d6', n=5), emissive=True)
BLACKSTEEL = Mat(ramp('#040306', '#0d0a12', '#19131f', '#271e30', '#3a2d47', '#54426a', '#7b67a0', '#b9a8e0', n=8),
                 ks=0.85, shin=26, kd=0.72, amb=0.05, rim='#a78bfa', rim_k=0.5)
AMETHYST = Mat(ramp('#14062b', '#2e0f5e', '#4f1f9a', '#7a3fd6', '#a777f5', '#dbc5ff', n=6), ks=1.0, shin=24, kd=0.75, amb=0.15)
VIOLETGLOW = Mat(ramp('#4c1d95', '#7c3aed', '#a78bfa', '#ddd0ff', '#ffffff', n=5), emissive=True)


# --- shared parts --------------------------------------------------------------------------------------------

def hammered(amp=0.07, s=1.4):
    return lambda x, y: amp * NZ(x, y, s)


def wrap_tex(amp=0.22, period=2.2, slant=0.6):
    return lambda x, y: -amp if ((x + y * slant) % period) < 0.75 else 0.04


def bell(c, body, handle, foot=None, body_tex=None, handle_tex=None, cy=26.5, rx=12.3, ry=11.2):
    """An upright kettlebell in the 40x40 format: horns, handle arc, round body, flat foot."""
    for x in (13.4, 26.6):
        c.tube([(x, 19.5), (x, 10.5)], 2.5, handle, tex=handle_tex)
    c.arc(20, 10.5, 6.6, 6.6, 180, 360, 2.5, handle, tex=handle_tex)
    c.ellipsoid(20, cy, rx, ry, body, tex=body_tex, clip=lambda X, Y: Y < 36.2)
    c.box(20, 36.4, 7.6, 1.5, 1.1, foot or body)


def emboss_weight(P, text, top, paint_mat=None, cx=20, tone=None, up=2):
    pts = digit_pts(text, cx, top)
    if paint_mat is None:
        P.emboss(pts, up=up)
    else:
        P.emboss(pts, up=0, down=2)
        for x, y in pts:
            P.paint(x, y, paint_mat, tone if tone is not None else -2)
    return pts


def chain(c, p0, p1, sag, mat, step=2.6, glow_mat=None):
    """Forged links from p0 to p1, alternating face-on rings and edge-on links."""
    (x0, y0), (x1, y1) = p0, p1
    L = math.hypot(x1 - x0, y1 - y0)
    n = max(2, int(L / step))
    pos = []
    for i in range(n + 1):
        u = i / n
        pos.append((x0 + (x1 - x0) * u, y0 + (y1 - y0) * u + math.sin(u * math.pi) * sag))
    for i, (x, y) in enumerate(pos[:-1]):
        nx, ny = pos[i + 1]
        mx, my = (x + nx) / 2, (y + ny) / 2
        a = math.atan2(ny - y, nx - x)
        m = glow_mat if (glow_mat is not None and i % 3 == 1) else mat
        if i % 2 == 0:
            pts = []
            for k in range(17):
                t = k / 16 * 2 * math.pi
                ex, ey = 1.75 * math.cos(t), 1.1 * math.sin(t)
                pts.append((mx + ex * math.cos(a) - ey * math.sin(a), my + ex * math.sin(a) + ey * math.cos(a)))
            c.tube(pts, 0.55, m)
        else:
            dx, dy = math.cos(a) * 0.9, math.sin(a) * 0.9
            c.tube([(mx - dx, my - dy), (mx + dx, my + dy)], 0.75, m)


def spikes(c, cx, cy, specs, base_r, mat, width=1.55, curve=0.0):
    for ang, length in specs:
        a = math.radians(ang)
        b = a + curve
        p0 = (cx + math.cos(a) * base_r, cy + math.sin(a) * base_r)
        pm = (cx + math.cos((a + b) / 2) * (base_r + length * 0.55), cy + math.sin((a + b) / 2) * (base_r + length * 0.55))
        p1 = (cx + math.cos(b) * (base_r + length), cy + math.sin(b) * (base_r + length))
        c.tube([p0, pm, p1], [width, width * 0.6, 0.12], mat)


def ms_handle(c, metal, grip, pommel_mat=None):
    """Morning-star handle: pommel, wrapped grip, ferrule, eye ring (rows ~11-16)."""
    c.tube([(4, 13.5), (17.5, 13.5)], 1.9, grip, tex=wrap_tex())
    c.ellipsoid(2.9, 13.5, 2.3, 2.8, pommel_mat or metal)
    c.box(18.8, 13.5, 1.6, 2.9, 1.1, metal)
    c.tube([(20, 13.5), (22.4, 13.5)], 1.4, metal)
    c.arc(23.6, 13.5, 1.5, 1.5, 0, 360, 0.65, metal, steps=12)


def ms_head(c, body, handle, cx=45, cy=24.2, body_tex=None):
    c.arc(cx, cy - 4.8, 3.5, 3.4, 180, 360, 1.15, handle)
    for x in (cx - 3.5, cx + 3.5):
        c.tube([(x, cy - 4.8), (x, cy - 2.5)], 1.15, handle)
    c.ellipsoid(cx, cy, 7.3, 6.5, body, tex=body_tex)


def slung_handle(c, wood, metal, wrap):
    """The slanting handle of the slung weapons (leviathan, censer)."""
    c.tube([(10.4, 3.0), (3.6, 30.0)], 1.9, wood, tex=wrap_tex(0.12, 3.0, -0.25))
    c.tube([(9.0, 8.5), (5.8, 21.0)], 2.05, wrap, tex=wrap_tex(0.24, 2.0, -0.3))
    c.box(10.8, 2.4, 2.6, 1.4, 1.0, metal)
    c.ellipsoid(3.4, 30.6, 2.3, 2.0, metal)


def haft_grip(c, mat, wrap, x0=4.5, x1=17.5, r=1.85):
    c.tube([(x0, 17), (x1, 17)], r, wrap, tex=wrap_tex())


def sparkle(P, x, y, core=(255, 255, 255), arm=(255, 236, 170, 200)):
    P.set(x, y, (*core, 255))
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        if not P.ok(x + dx, y + dy):
            P.set(x + dx, y + dy, arm)


def glow_pts(c, pts, color, r=1.4, a=90):
    for x, y in pts:
        c.glow(x + 0.5, y + 0.5, color, r, a)


# =============================================================================================================
# BELLS (40x40)
# =============================================================================================================

def iron_kettlebell():
    c = Canvas(40, 40)
    handle = Mat(IRON.ramp, ks=0.9, shin=30, kd=0.75, amb=0.07, rim=IRON.rim, rim_k=0.4)
    bell(c, IRON, handle, body_tex=hammered(0.08), handle_tex=hammered(0.03, 0.8))
    c.box(20, 27.2, 5.8, 4.3, 1.3, IRON, concave=True, tex=hammered(0.04))  # recessed weight plate
    P = c.render()
    # rust bloom low on the body, crimson competition enamel
    for y in range(29, 37):
        for x in range(8, 33):
            if P.ok(x, y) and P.mat[y, x] == P.mats.index(IRON) and NZ2(x, y, 1.8) > 0.32 and P.tone[y, x] < 5:
                P.paint(x, y, RUST, min(4, P.tone[y, x]))
    emboss_weight(P, '32', 25, CRIMSON, tone=4)
    for x in range(14, 27):
        P.paint(x, 36, CRIMSON, 2 if x > 20 else 3)
    # casting seam and grip polish
    P.engrave([(20, y) for y in (16, 17, 18, 34, 35)], down=1, up=0)
    return P.compose()


def excalibur_bell():
    c = Canvas(40, 40)
    bell(c, WHITEGOLD, SILK, foot=GOLD, handle_tex=wrap_tex(0.2, 2.0, 0.8))
    for x in (13.4, 26.6):
        c.box(x, 18.4, 3.0, 1.3, 0.9, GOLD)  # gold collars where the silk ends
    c.arc(20, 10.5, 6.6, 6.6, 255, 285, 2.7, GOLD, steps=6)  # crown clasp on the handle
    c.ellipsoid(20, 24.6, 3.0, 3.0, SAPPHIRE)
    P = c.render()
    rays = []
    for k in range(12):
        a = k / 12 * 2 * math.pi
        for rr in (4.6, 5.6, 6.6) if k % 2 == 0 else (4.6, 5.6):
            rays.append((int(round(20 + math.cos(a) * rr)), int(round(24.6 + math.sin(a) * rr * 0.92))))
    P.engrave(rays, down=2, up=1)
    ring_pts = [(int(round(20 + math.cos(t / 28 * 2 * math.pi) * 9.4)), int(round(26.5 + math.sin(t / 28 * 2 * math.pi) * 8.4)))
                for t in range(28)]
    P.engrave([p for p in ring_pts if p[1] > 30], down=1, up=1)
    emboss_weight(P, '48', 30, SAPPHIRE, tone=4)
    for x, y in ((19, 23), (20, 23)):
        P.set(x, y, (255, 255, 255, 255))
    sparkle(P, 13, 19)
    sparkle(P, 23, 2)
    return P.compose()


def dragon_kettlebell():
    c = Canvas(40, 40)

    def scales(x, y):
        row = int(y / 2.2)
        xx = x + (1.1 if row % 2 else 0)
        fx = (xx % 2.6) / 2.6
        fy = (y % 2.2) / 2.2
        return 0.1 - 0.22 * ((fx - 0.5) ** 2 * 2 + fy ** 2 > 0.62)

    # horns curling out of the shoulders
    for s in (-1, 1):
        c.tube([(20 + s * 9.5, 19), (20 + s * 14.5, 14.5), (20 + s * 15.5, 9.5), (20 + s * 14, 6.5)],
               [2.0, 1.5, 0.9, 0.2], BONE, tex=lambda x, y: -0.12 if int(y) % 2 else 0.03)
    bell(c, SCALE, OBSIDIAN, foot=OBSIDIAN, body_tex=scales, handle_tex=lambda x, y: -0.1 if int(x + y) % 3 == 0 else 0)
    c.box(20, 30.6, 5.4, 3.3, 1.2, OBSIDIAN, concave=True)
    P = c.render()
    crack = [(12, 20), (13, 21), (13, 22), (14, 23), (15, 23), (16, 24), (16, 25), (17, 26), (26, 19), (26, 20), (25, 21),
             (25, 22), (24, 23), (23, 24), (23, 25), (29, 25), (28, 26), (28, 27), (27, 28), (10, 27), (11, 28), (11, 29)]
    for x, y in crack:
        P.paint(x, y, EMBER, 3 if (x + y) % 3 else 4)
    glow_pts(c, crack, '#ff7a1a', 1.3, 60)
    P.glows = c.glows
    emboss_weight(P, '64', 28, EMBER, tone=4)
    for x, y in ((15, 3), (25, 3), (18, 1)):
        P.set(x, y, (255, 154, 31, 150))
    return P.compose()


def void_bell():
    c = Canvas(40, 40)
    for s in (-1, 1):  # thorns on the handle
        c.tube([(20 + s * 7.6, 7.0), (20 + s * 10.4, 4.2)], [1.0, 0.1], CRYSTAL)
        c.tube([(20 + s * 9.0, 13.0), (20 + s * 11.8, 12.0)], [0.9, 0.1], CRYSTAL)
    bell(c, VOIDM, VOIDM, body_tex=hammered(0.05, 1.0))
    c.ellipsoid(20, 26.5, 12.3, 3.1, VOIDM, shadow=False, depth=0.4)  # belt
    P = c.render()
    rng = random.Random(4)
    vi = P.mats.index(VOIDM)
    for _ in range(26):
        x, y = rng.randint(9, 31), rng.randint(16, 35)
        if P.ok(x, y) and P.mat[y, x] == vi and P.tone[y, x] < 4:
            P.set(x, y, (210, 190, 255, 255) if rng.random() < 0.3 else (120, 90, 190, 255))
    runes = []
    for i, x in enumerate(range(10, 31)):
        if i % 4 == 3:
            continue
        y = 26 + (0 if i % 2 else (-1 if i % 4 == 0 else 1))
        runes.append((x, y))
    for x, y in runes:
        P.paint(x, y, VOIDGLOW, 2 if x % 3 else 3)
    glow_pts(c, runes, '#2df08c', 1.2, 45)
    P.glows = c.glows
    emboss_weight(P, '100', 30, VOIDGLOW, tone=2)
    sparkle(P, 14, 19, (255, 255, 255), (201, 156, 242, 200))
    return P.compose()


def tolling_thunder():
    c = Canvas(40, 40)

    def patina(x, y):
        return 0.08 * NZ(x, y, 1.6)

    bell(c, BRONZE, BRONZE, body_tex=patina, handle_tex=hammered(0.04))
    c.ellipsoid(20, 33.0, 10.2, 2.4, BRONZE, depth=0.5)  # flared lip, like the great bell's
    P = c.render()
    bi = P.mats.index(BRONZE)
    for y in range(40):
        for x in range(40):
            if P.ok(x, y) and P.mat[y, x] == bi and P.tone[y, x] <= 3 and NZ2(x, y, 3.2) > 0.05:
                P.paint(x, y, VERDIGRIS, min(4, P.tone[y, x] + 1))
    P.engrave([(x, 30) for x in range(10, 31)], down=1, up=1)
    P.engrave([(x, 21) for x in range(12, 29) if x % 2 == 0], down=1, up=1)
    bolt = [(21, 16), (21, 17), (20, 18), (20, 19), (19, 20), (20, 21), (21, 22), (22, 23), (22, 24), (21, 25), (20, 26),
            (19, 27), (19, 28), (20, 29), (21, 30), (21, 31), (22, 32), (22, 33), (23, 22), (24, 22), (25, 21), (18, 27), (17, 28)]
    for x, y in bolt:
        P.paint(x, y, STORMGLOW, 4 if (x + y) % 2 else 3)
    glow_pts(c, bolt, '#67e8f9', 1.8, 95)
    P.glows = c.glows
    for x, y in ((6, 22), (7, 23), (33, 15), (34, 14), (31, 8), (8, 11)):
        P.set(x, y, (180, 245, 255, 230))
    return P.compose()


def midas_bell():
    c = Canvas(40, 40)
    bell(c, GOLD, GOLD, body_tex=lambda x, y: 0.04 * NZ(x, y, 2.5))
    c.ellipsoid(20, 33.2, 10.4, 2.2, GOLD, depth=0.5)  # gilded lip band
    P = c.render()
    crown = [(16, 24), (16, 23), (16, 22), (17, 23), (18, 22), (19, 23), (20, 21), (21, 23), (22, 22), (23, 23), (24, 22),
             (24, 23), (24, 24), (17, 24), (18, 24), (19, 24), (20, 24), (21, 24), (22, 24), (23, 24)]
    P.emboss(crown, up=3, down=2)
    P.engrave([(x, 27) for x in range(15, 26)], down=1, up=1)
    P.engrave([(17 + i * 2, 29) for i in range(4)], down=2, up=1)
    sparkle(P, 13, 20)
    sparkle(P, 15, 6)
    return P.compose()


def hollow_bell():
    c = Canvas(40, 40)
    for s in (-1, 1):
        c.tube([(20 + s * 6.0, 4.2), (20 + s * 8.5, 0.9)], [0.9, 0.1], VOIDM)
        c.tube([(20 + s * 9.2, 8.5), (20 + s * 12.0, 6.6)], [0.9, 0.1], VOIDM)
    bell(c, VOIDM, VOIDM, foot=OBSIDIAN, body_tex=hammered(0.06, 1.2))
    c.ellipsoid(20, 26.6, 9.4, 8.2, NIGHT)  # the hollow
    c.ellipsoid(20, 26.6, 7.4, 5.0, BONE, depth=0.7)  # the eye
    c.ellipsoid(20, 26.6, 3.9, 4.2, VOIDGLOW)
    P = c.render()
    # rim of the hollow: lit on its lower-right inner lip
    for y in range(18, 35):
        for x in range(11, 30):
            d = math.hypot((x + 0.5 - 20) / 9.4, (y + 0.5 - 26.6) / 8.2)
            if 0.88 < d < 1.08 and (x + 0.5 - 20) + (y + 0.5 - 26.6) > 2:
                P.step(x, y, 2)
    rng = random.Random(9)
    ni = P.mats.index(NIGHT)
    for _ in range(14):
        x, y = rng.randint(12, 28), rng.randint(19, 34)
        if P.ok(x, y) and P.mat[y, x] == ni:
            P.set(x, y, (150, 110, 230, 255) if rng.random() < 0.6 else (230, 220, 255, 255))
    for y in range(23, 31):  # slit pupil
        P.set(20, y, (2, 8, 4, 255))
        if 24 <= y <= 29:
            P.set(19, y, (2, 8, 4, 255))
    P.set(18, 24, (255, 255, 255, 255))
    P.set(17, 25, (200, 255, 225, 255))
    for x, y in ((13, 26), (14, 25), (14, 27), (26, 26), (27, 27), (25, 28), (14, 29)):  # veins
        P.set(x, y, (150, 24, 52, 255))
    for x in range(14, 27):  # upper lid shadow
        P.step(x, 22, -2)
    glow_pts(c, [(20, 22), (20, 31), (13, 26), (27, 26)], '#2df08c', 2.2, 55)
    P.glows = c.glows
    return P.compose()


# =============================================================================================================
# MORNING STARS (64x34)
# =============================================================================================================

STAR_SPIKES = [(-48, 10.0), (-8, 11.0), (32, 10.2), (88, 8.2), (140, 9.6), (196, 9.8)]


def iron_morningstar():
    c = Canvas(64, 34)
    ms_handle(c, STEEL, LEATHER)
    chain(c, (24.6, 13.8), (42.5, 18.6), 2.2, STEEL)
    spikes(c, 45, 24.2, STAR_SPIKES, 6.2, STEEL)
    ms_head(c, IRON, STEEL, body_tex=hammered(0.07))
    c.box(45, 25.4, 4.6, 3.6, 1.1, IRON, concave=True)
    P = c.render()
    emboss_weight(P, '32', 23, CRIMSON, cx=45, tone=4)
    for y in range(26, 32):
        for x in range(38, 53):
            if P.ok(x, y) and P.mat[y, x] == P.mats.index(IRON) and NZ2(x, y, 1.4) > 0.35:
                P.paint(x, y, RUST, min(4, P.tone[y, x]))
    return P.compose()


def excalibur_morningstar():
    c = Canvas(64, 34)
    ms_handle(c, WHITEGOLD, SILK, pommel_mat=SAPPHIRE)
    chain(c, (24.6, 13.8), (42.5, 18.6), 2.2, GOLD)
    spikes(c, 45, 24.2, STAR_SPIKES, 6.0, WHITEGOLD, width=1.7, curve=0.18)
    ms_head(c, GOLD, WHITEGOLD)
    c.ellipsoid(45, 22.4, 2.2, 2.2, SAPPHIRE)
    P = c.render()
    rays = []
    for k in range(10):
        a = k / 10 * 2 * math.pi
        rays.append((int(round(45 + math.cos(a) * 4.0)), int(round(22.4 + math.sin(a) * 3.6))))
    P.engrave(rays, down=2, up=1)
    emboss_weight(P, '48', 26, SAPPHIRE, cx=45, tone=4)
    P.set(44, 21, (255, 255, 255, 255))
    sparkle(P, 41, 19)
    return P.compose()


def dragon_morningstar():
    c = Canvas(64, 34)

    def scales(x, y):
        row = int(y / 2.0)
        xx = x + (1.0 if row % 2 else 0)
        fx = (xx % 2.4) / 2.4
        fy = (y % 2.0) / 2.0
        return 0.1 - 0.22 * ((fx - 0.5) ** 2 * 2 + fy ** 2 > 0.62)

    ms_handle(c, OBSIDIAN, SCALE, pommel_mat=BONE)
    chain(c, (24.6, 13.8), (42.5, 18.6), 2.2, OBSIDIAN, glow_mat=EMBER)
    spikes(c, 45, 24.2, STAR_SPIKES, 6.0, BONE, width=1.7, curve=-0.35)
    ms_head(c, SCALE, OBSIDIAN, body_tex=scales)
    c.box(45, 26.2, 4.4, 3.3, 1.1, OBSIDIAN, concave=True)
    P = c.render()
    crack = [(39, 21), (40, 22), (40, 23), (41, 24), (50, 20), (49, 21), (49, 22), (48, 23), (51, 27), (50, 28), (39, 28), (40, 29)]
    for x, y in crack:
        P.paint(x, y, EMBER, 3)
    glow_pts(c, crack, '#ff7a1a', 1.2, 55)
    P.glows = c.glows
    emboss_weight(P, '64', 24, EMBER, cx=45, tone=4)
    return P.compose()


def void_morningstar():
    c = Canvas(64, 34)
    ms_handle(c, VOIDM, NIGHT_GRIP, pommel_mat=CRYSTAL)
    chain(c, (24.6, 13.8), (42.5, 18.6), 2.2, VOIDM, glow_mat=VOIDGLOW)
    # crystal shards instead of spikes: two-facet polygons, lit face and shadow face
    for ang, length in STAR_SPIKES:
        a = math.radians(ang)
        bx, by = 45 + math.cos(a) * 5.4, 24.2 + math.sin(a) * 5.0
        tx, ty = 45 + math.cos(a) * (5.4 + length), 24.2 + math.sin(a) * (5.0 + length)
        px, py = -math.sin(a) * 1.9, math.cos(a) * 1.9
        c.poly([(bx + px, by + py), (tx, ty), (bx, by)], CRYSTAL, normal=(math.cos(a) * 0.2 + px * 0.3, math.sin(a) * 0.2 + py * 0.3, 1))
        c.poly([(bx - px, by - py), (tx, ty), (bx, by)], CRYSTAL, normal=(-px * 0.4 - 0.3, -py * 0.4 - 0.4, 1))
    ms_head(c, VOIDM, VOIDM, body_tex=hammered(0.05, 1.0))
    P = c.render()
    runes = [(40, 23), (41, 24), (43, 25), (44, 24), (46, 24), (47, 25), (49, 24), (50, 23)]
    for x, y in runes:
        P.paint(x, y, VOIDGLOW, 2)
    glow_pts(c, runes, '#2df08c', 1.1, 45)
    P.glows = c.glows
    emboss_weight(P, '100', 26, VOIDGLOW, cx=45, tone=2)
    rng = random.Random(2)
    for _ in range(8):
        x, y = rng.randint(39, 51), rng.randint(19, 30)
        if P.ok(x, y) and P.mat[y, x] == P.mats.index(VOIDM) and P.tone[y, x] < 4:
            P.set(x, y, (200, 170, 255, 255))
    return P.compose()


NIGHT_GRIP = Mat(ramp('#07040d', '#150c24', '#26163d', '#3b2259', '#55317a', n=5), kd=0.9, amb=0.1)


# =============================================================================================================
# SLUNG STARS (slanting handle)
# =============================================================================================================

def leviathan_anchor():
    c = Canvas(64, 34)
    slung_handle(c, WOOD, SEAIRON, Mat(ramp('#04201f', '#0a3a38', '#115a56', '#1d7f78', n=4), kd=0.9, amb=0.1))
    chain(c, (12.8, 2.6), (39.4, 4.2), 7.5, SEAIRON)
    tex = hammered(0.09, 1.3)
    # flukes: an arc of iron from the crown up to two barbed points
    c.arc(41, 21.5, 11.0, 7.4, 8, 172, 1.45, SEAIRON, tex=tex)
    for s in (-1, 1):
        tx = 41 + s * 12.4
        c.poly([(tx - s * 2.6, 22.5), (tx + s * 1.2, 15.6), (tx + s * 1.4, 23.6)], SEAIRON,
               normal=(-0.3 * s, -0.5, 1), tex=tex)
    c.tube([(41, 7.8), (41, 27.6)], [1.75, 1.75], SEAIRON, tex=tex)  # shank
    c.tube([(33.4, 10.6), (48.6, 10.6)], 1.15, WOOD)  # stock
    for x in (33.2, 48.8):
        c.ellipsoid(x, 10.6, 1.6, 1.6, SEAIRON)
    c.ellipsoid(41, 27.4, 4.0, 3.3, SEAIRON, tex=tex)  # bell-shaped crown
    c.arc(41, 4.7, 3.0, 2.8, 0, 360, 1.05, SEAIRON)  # kettlebell-handle ring
    for bx, by in ((39.3, 15.2), (42.6, 19.4), (36.0, 27.0), (46.4, 27.3), (41.9, 24.0), (30.6, 20.6)):
        c.ellipsoid(bx, by, 1.25, 1.15, BARNACLE)
    for pts in ([(43.2, 13.0), (44.4, 15.4), (43.6, 18.0), (44.8, 20.6)], [(35.5, 26.5), (34.6, 29.0), (35.4, 31.4)],
                [(47.0, 26.8), (48.0, 29.2), (47.2, 31.4)]):
        c.tube(pts, [0.75, 0.6, 0.45, 0.3][:len(pts)], WEED)
    P = c.render()
    bi = P.mats.index(BARNACLE)
    for y in range(34):
        for x in range(64):
            if P.ok(x, y) and P.mat[y, x] == bi and P.tone[y, x] >= 3:
                if P.ok(x + 1, y + 1) and P.mat[y + 1, x + 1] == bi:
                    P.step(x + 1, y + 1, -3)  # barnacle mouths
    si = P.mats.index(SEAIRON)
    rime = []
    for y in range(34):
        for x in range(26, 60):
            if P.ok(x, y) and P.mat[y, x] == si and P.tone[y, x] >= 6 and NZ2(x, y, 1.1) > 0.45:
                rime.append((x, y))
    for x, y in rime:
        P.paint(x, y, RIME, 1)
    for x, y in ((29, 12), (52, 13), (40, 33)):
        P.set(x, y, (199, 241, 255, 200))
    return P.compose()


def everburning_censer():
    c = Canvas(64, 34)
    slung_handle(c, SILVER, SILVER, Mat(ramp('#0a1530', '#16295a', '#24418a', '#3a61bd', n=4), kd=0.9, amb=0.1))
    chain(c, (12.8, 2.6), (42.0, 7.6), 5.5, SILVER)
    c.arc(42, 10.2, 2.6, 2.3, 180, 360, 0.9, SILVER)  # kettlebell handle the chain hangs from
    for x in (39.4, 44.6):
        c.tube([(x, 10.2), (x, 12.2)], 0.9, SILVER)
    c.ellipsoid(42, 21.4, 8.6, 8.2, SILVER, tex=hammered(0.03))  # bowl
    c.ellipsoid(42, 19.6, 8.0, 6.4, SILVER, clip=lambda X, Y: Y < 19.8)  # domed lid
    c.ellipsoid(42, 19.8, 8.7, 1.3, SILVER, depth=0.4)  # lid rim
    c.box(42, 30.8, 4.6, 1.3, 1.0, SILVER)  # foot
    c.tube([(42, 29.0), (42, 30.0)], 2.2, SILVER)
    c.ellipsoid(42, 12.4, 1.7, 1.4, SOULGLOW)  # finial gem
    P = c.render()
    slots = []
    for k in (-2, -1, 0, 1, 2):
        x = 42 + k * 3
        for y in range(14, 19) if abs(k) < 2 else range(16, 19):
            slots.append((x, y))
        for y in range(22, 27) if abs(k) < 2 else range(22, 25):
            slots.append((x, y))
    for x, y in slots:
        P.paint(x, y, SOULGLOW, 3 if 40 <= x <= 44 else 2)
    glow_pts(c, slots, '#7dd3fc', 1.2, 40)
    P.engrave([(x, 28) for x in range(36, 49)], down=1, up=1)
    # soul incense curling up and away
    for x, y, a in ((51, 11, 200), (53, 7, 160), (49, 6, 120), (55, 3, 110), (52, 2, 80)):  # rising soul motes
        P.set(x, y, (200, 240, 255, a))
        c.glow(x + 0.5, y + 0.5, '#7dd3fc', 1.6, 60)
    P.glows = c.glows
    return P.compose()


# =============================================================================================================
# HAFTED (64x34; grip rows 16-18)
# =============================================================================================================

def winged_guard(c, metal, gem, cx=18.5, wings_mat=None, broken=False):
    wm = wings_mat or metal
    for s in (-1, 1):
        if broken and s == 1:
            c.tube([(cx, 17 + s * 1.5), (cx + 0.6, 17 + s * 4.5), (cx + 2.0, 17 + s * 6.0)], [1.6, 1.2, 0.5], wm)
            continue
        c.tube([(cx, 17 + s * 1.5), (cx + 0.6, 17 + s * 5.0), (cx + 2.6, 17 + s * 8.0), (cx + 5.0, 17 + s * 9.6)],
               [1.7, 1.4, 1.0, 0.25], wm)
        c.tube([(cx + 0.8, 17 + s * 4.0), (cx + 3.0, 17 + s * 5.2), (cx + 5.2, 17 + s * 5.4)], [1.0, 0.7, 0.2], wm)
    c.box(cx, 17, 1.9, 2.7, 1.1, metal)
    c.ellipsoid(cx, 17, 1.4, 1.5, gem)


def excalibell():
    c = Canvas(64, 34)
    c.ellipsoid(2.6, 17, 2.2, 2.4, WHITEGOLD)  # pommel
    haft_grip(c, WHITEGOLD, SILK, 4.4, 16.6)
    for x in (6.5, 11.0, 15.5):
        c.box(x, 17, 0.7, 2.1, 0.6, GOLD)
    # blade: steel with a gilded fuller
    c.blade([(20, 14.3), (40, 14.8), (46, 15.4)], [(20, 19.7), (40, 19.2), (46, 18.6)], STEEL)
    c.box(31, 17, 10.5, 0.75, 0.7, HOLYGLOW, shadow=False)
    winged_guard(c, WHITEGOLD, SAPPHIRE)
    # the kettlebell tip: handle loop toward the blade, gilded bell on the end
    c.arc(49.2, 17, 3.0, 3.6, 90, 270, 1.2, WHITEGOLD)
    c.ellipsoid(55.2, 17, 7.0, 7.6, GOLD)
    P = c.render()
    cross = [(55, y) for y in range(13, 22)] + [(x, 16) for x in range(52, 59)]
    for x, y in cross:
        P.paint(x, y, HOLYGLOW, 2 if (x, y) != (55, 16) else 3)
    P.engrave([(int(round(55.2 + math.cos(t / 20 * 6.283) * 5.6)), int(round(17 + math.sin(t / 20 * 6.283) * 6.1)))
               for t in range(20)], down=1, up=1)
    glow_pts(c, cross, '#ffe59a', 1.4, 60)
    P.glows = c.glows
    for x, y in ((44, 15), (45, 15), (21, 15)):
        P.set(x, y, (255, 255, 255, 255))
    sparkle(P, 51, 11)
    return P.compose()


def excalibane():
    c = Canvas(64, 34)
    c.ellipsoid(2.6, 17, 2.2, 2.4, BLACKSTEEL)
    haft_grip(c, BLACKSTEEL, CRIMSON_GRIP, 4.4, 16.6)
    for x in (6.5, 11.0, 15.5):
        c.box(x, 17, 0.7, 2.1, 0.6, GOLD)
    c.blade([(20, 14.0), (34, 14.4), (37, 13.4), (39, 14.6), (46, 15.4)],
            [(20, 20.0), (30, 19.6), (32, 20.6), (35, 19.4), (46, 18.6)], BLACKSTEEL)
    winged_guard(c, BLACKSTEEL, AMETHYST, wings_mat=BLACKSTEEL, broken=True)
    c.arc(49.2, 17, 3.0, 3.6, 90, 270, 1.2, BLACKSTEEL)
    c.ellipsoid(55.2, 17, 7.0, 7.6, BANE_BELL)
    P = c.render()
    veins = [(22, 17), (23, 17), (24, 16), (25, 16), (26, 17), (27, 17), (28, 18), (29, 17), (30, 17), (31, 16), (32, 16),
             (33, 17), (34, 17), (35, 17), (36, 16), (37, 16), (38, 17), (39, 17), (40, 17), (41, 16), (42, 17)]
    for x, y in veins:
        P.paint(x, y, VIOLETGLOW, 2 if x % 3 else 3)
    cross = [(55, y) for y in range(13, 22)] + [(x, 16) for x in range(52, 59)]
    for x, y in cross:
        P.paint(x, y, VIOLETGLOW, 2 if (x, y) != (55, 16) else 4)
    P.engrave([(int(round(55.2 + math.cos(t / 20 * 6.283) * 5.6)), int(round(17 + math.sin(t / 20 * 6.283) * 6.1)))
               for t in range(20)], down=1, up=1)
    glow_pts(c, cross + veins[::3], '#a78bfa', 1.4, 60)
    P.glows = c.glows
    for x, y in ((44, 13), (50, 9), (60, 25), (27, 22)):
        P.set(x, y, (167, 139, 250, 160))
    return P.compose()


BANE_BELL = Mat(ramp('#040306', '#100b16', '#1e1528', '#30223f', '#47335c', '#6a5088', '#a58ad0', n=7),
                ks=0.9, shin=26, kd=0.72, amb=0.05, rim='#a78bfa', rim_k=0.45)
CRIMSON_GRIP = Mat(ramp('#14020a', '#320613', '#560c1e', '#7d1428', '#a3243a', n=5), kd=0.9, amb=0.1)


def heartforge():
    c = Canvas(64, 34)
    c.ellipsoid(2.4, 17, 2.1, 3.0, FORGESTEEL)
    haft_grip(c, FORGESTEEL, LEATHER, 4.0, 18.0, 1.9)
    # blade: heavy forged steel to a point, damascus ripple, a molten core down its fuller
    dam = lambda x, y: 0.07 * math.sin(x * 1.3 + 2.2 * NZ(x, y, 2.0))
    c.blade([(26, 12.2), (54, 13.0), (63.4, 17.0)], [(26, 21.8), (54, 21.0), (63.4, 17.0)], FORGESTEEL, tex=dam)
    c.blade([(27, 15.8), (52, 16.2), (58, 17.0)], [(27, 18.2), (52, 17.8), (58, 17.0)], EMBER, shadow=False)
    # guard: a small kettlebell-shaped furnace with the heart in its grate
    c.arc(22.5, 11.2, 2.8, 2.4, 180, 360, 1.15, FORGESTEEL)
    for x in (19.7, 25.3):
        c.tube([(x, 11.2), (x, 13.5)], 1.15, FORGESTEEL)
    c.ellipsoid(22.5, 18.6, 5.6, 6.6, FORGESTEEL, tex=hammered(0.05))
    c.box(22.5, 25.2, 3.6, 1.0, 0.8, FORGESTEEL)
    P = c.render()
    heart = [(21, 16), (23, 16), (20, 17), (21, 17), (22, 17), (23, 17), (24, 17), (20, 18), (21, 18), (22, 18), (23, 18),
             (24, 18), (21, 19), (22, 19), (23, 19), (22, 20)]
    for x, y in heart:
        P.paint(x, y, EMBER, 4 if (x, y) in ((21, 17), (22, 18)) else 2)
    for x in range(20, 25):  # grate bars across the heart
        if x % 2 == 0:
            for y in range(16, 21):
                if (x, y) in heart:
                    P.step(x, y, -1)
    glow_pts(c, heart, '#ff8a1f', 1.6, 70)
    P.glows = c.glows
    P.set(62, 16, (255, 220, 160, 255))
    for x, y in ((28, 9), (35, 24), (44, 10), (51, 25)):
        P.set(x, y, (255, 170, 60, 170))
    return P.compose()


def dead_weight():
    c = Canvas(64, 34)
    # femur haft: knuckled ends
    c.tube([(3, 17), (38, 17)], [1.9, 1.9], BONE, tex=lambda x, y: 0.05 * NZ(x, y, 1.2))
    for y in (14.6, 19.4):
        c.ellipsoid(2.0, y, 1.9, 1.9, BONE)
    c.tube([(4.5, 17), (16.5, 17)], 2.0, CRIMSON_GRIP, tex=wrap_tex())
    # a grave chain hanging off the haft
    chain(c, (27.5, 18.5), (27.8, 30.5), 0.6, GRAVEIRON, step=2.2)
    # coffin-iron kettlebell: handle loop, six-sided body, bands of grave chain
    c.arc(51.5, 6.8, 5.6, 4.6, 180, 360, 1.6, GRAVEIRON)
    for x in (45.9, 57.1):
        c.tube([(x, 6.8), (x, 10.0)], 1.6, GRAVEIRON)
    coffin = [(46, 9.5), (57, 9.5), (61.5, 15), (59, 32.5), (44, 32.5), (41.5, 15)]
    c.poly(coffin[:3] + [(51.5, 21)], GRAVEIRON, normal=(0.05, -0.55, 1), tex=hammered(0.06))
    c.poly([(61.5, 15), (59, 32.5), (51.5, 21)], GRAVEIRON, normal=(0.6, 0.15, 1), tex=hammered(0.06))
    c.poly([(59, 32.5), (44, 32.5), (51.5, 21)], GRAVEIRON, normal=(0, 0.35, 1), tex=hammered(0.06))
    c.poly([(44, 32.5), (41.5, 15), (51.5, 21)], GRAVEIRON, normal=(-0.6, 0.0, 1), tex=hammered(0.06))
    c.poly([(41.5, 15), (46, 9.5), (51.5, 21)], GRAVEIRON, normal=(-0.45, -0.45, 1), tex=hammered(0.06))
    c.box(51.5, 21.5, 5.0, 7.2, 1.2, GRAVEIRON, concave=True)
    chain(c, (42.0, 13.5), (61.0, 27.0), 0.0, STEEL, step=2.3)
    c.box(39.6, 17, 1.6, 2.8, 1.0, GRAVEIRON)  # socket
    P = c.render()
    sigil = [(51, y) for y in range(16, 27)] + [(x, 19) for x in range(48, 55)]
    for x, y in sigil:
        P.paint(x, y, BLOODGLOW, 2 if (x, y) != (51, 19) else 3)
    glow_pts(c, sigil, '#e8173f', 1.4, 60)
    for x, y in ((44, 11), (59, 11), (43, 31), (60, 31)):  # coffin nails
        P.set(x, y, (210, 205, 220, 255))
        P.step(x + 1, y + 1, -2)
    drips = [(49, 33, 220), (49, 34, 0), (54, 33, 200)]
    for x, y, a in drips:
        if a and not P.ok(x, y):
            P.set(x, y, (180, 12, 40, a))
    for x, y in ((50, 27), (50, 28), (52, 27)):
        P.paint(x, y, BLOODGLOW, 1)
    P.glows = c.glows
    return P.compose()


def bellringer_mallet():
    c = Canvas(64, 34)

    stripes = lambda x, y: 0.0
    c.tube([(2, 17), (41, 17)], 1.85, CREAM, tex=stripes)
    P_red = []  # stripes are painted after render
    c.ellipsoid(2.0, 17, 1.9, 2.4, BRASS)
    haft_grip(c, CREAM, LEATHER, 4.5, 16.5)
    # barrel head standing across the haft
    c.box(49.5, 17.5, 9.0, 14.2, 1.0, WOOD, tex=lambda x, y: 0.09 * NZ(x * 4, y * 0.4, 1.0))
    c.tube([(40.6, 3.6), (58.4, 3.6)], 1.25, WOOD)
    for y in (4.8, 11.2, 23.8, 30.2):
        c.box(49.5, y, 9.3, 1.05, 0.9, BRASS)
    # the brass bell bolted to the striking face, a kettlebell handle on top of the head
    c.arc(49.5, 3.5, 3.4, 2.4, 180, 360, 1.05, BRASS)
    c.ellipsoid(49.5, 17.5, 5.4, 5.6, BRASS)
    c.ellipsoid(49.5, 17.5, 2.0, 2.1, BRASS, shadow=False)
    P = c.render()
    ci = P.mats.index(CREAM)
    for y in range(13, 22):
        for x in range(17, 42):
            if P.ok(x, y) and P.mat[y, x] == ci and ((x + (y - 17) * 0.7) // 3) % 2 == 0:
                P.paint(x, y, CARNIVAL, min(4, P.tone[y, x]))
    star = [(49, 15), (49, 16), (48, 17), (49, 17), (50, 17), (49, 18), (49, 19), (47, 17), (51, 17)]
    P.emboss(star, up=2, down=1)
    for y in range(4, 31, 3):
        P.engrave([(41, y), (58, y + 1)], down=1, up=0)
    sparkle(P, 46, 14)
    return P.compose()


WEAPONS = {
    'iron_kettlebell': iron_kettlebell, 'excalibur_bell': excalibur_bell, 'dragon_kettlebell': dragon_kettlebell,
    'void_bell': void_bell, 'tolling_thunder': tolling_thunder, 'midas_bell': midas_bell, 'hollow_bell': hollow_bell,
    'iron_morningstar': iron_morningstar, 'excalibur_morningstar': excalibur_morningstar,
    'dragon_morningstar': dragon_morningstar, 'void_morningstar': void_morningstar,
    'leviathan_anchor': leviathan_anchor, 'everburning_censer': everburning_censer,
    'excalibell': excalibell, 'excalibane': excalibane, 'heartforge': heartforge, 'dead_weight': dead_weight,
    'bellringer_mallet': bellringer_mallet,
}

if __name__ == '__main__':
    os.makedirs(OUT_DIR, exist_ok=True)
    only = sys.argv[1:] or list(WEAPONS)
    items = []
    for name in only:
        img = WEAPONS[name]()
        img.save(os.path.join(OUT_DIR, f'{name}.png'))
        items.append((name, img))
    upscale_sheet(items, scale=6, cols=4).save(os.path.join(OUT_DIR, 'sheet.png'))
    print('crafted', len(items))
