"""
Paints the spell-VFX texture atlases used by src/tv/engine/fxAtlas.ts (the fxKit / spellKit primitives and
battle particles stamp these instead of drawing flat polygons).

Two pages, both white/greyscale so the engine tints them per element:
  soft  linear-filtered: blooms, flares, rings, beams, streaks, smoke and mist, rune circles
  pix   nearest-filtered pixel art: embers, sparks, shards, rock spikes, flame tongues, fireballs, droplets...

Painted sprites that need the ink/body/core palette (Pal in fxKit.ts) come as three masks with the suffixes
`.ink` (contour + core shadow), `.body` (shaded mid-tones) and `.core` (hot highlights); the engine stacks the
three tinted by the palette, so one sprite renders in any element's colours with real shading.

    python3 scripts/build_spell_fx.py   -> public/assets/fx/spellfx-{soft,pix}.png + spellfx.json
                                           work/spellfx-preview.png (tinted contact sheet)
"""
import json
import math
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'fx')
RNG = np.random.default_rng(1337)


# ------------------------------------------------------------------------------------------------------------
# helpers

def grid(w, h):
    """Pixel-centre coordinates in [-1, 1] (x right, y down)."""
    x = (np.arange(w) + 0.5) / w * 2 - 1
    y = (np.arange(h) + 0.5) / h * 2 - 1
    return np.meshgrid(x, y)


def value_noise(w, h, cells, seed, octaves=3):
    rng = np.random.default_rng(seed)
    out = np.zeros((h, w))
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        c = cells * 2 ** o
        g = rng.uniform(0, 1, (c + 1, c + 1))
        xs = np.linspace(0, c, w, endpoint=False)
        ys = np.linspace(0, c, h, endpoint=False)
        x0 = xs.astype(int)
        y0 = ys.astype(int)
        fx = xs - x0
        fy = ys - y0
        fx = fx * fx * (3 - 2 * fx)
        fy = fy * fy * (3 - 2 * fy)
        a = g[np.ix_(y0, x0)]
        b = g[np.ix_(y0, x0 + 1)]
        cc = g[np.ix_(y0 + 1, x0)]
        d = g[np.ix_(y0 + 1, x0 + 1)]
        top = a + (b - a) * fx[None, :]
        bot = cc + (d - cc) * fx[None, :]
        out += amp * (top + (bot - top) * fy[:, None])
        tot += amp
        amp *= 0.5
    return out / tot


def rgba(alpha, value=None):
    """Greyscale sprite: value (brightness) and alpha in [0, 1]."""
    a = np.clip(alpha, 0, 1)
    v = np.ones_like(a) if value is None else np.clip(value, 0, 1)
    img = np.zeros(a.shape + (4,), np.uint8)
    img[..., 0] = img[..., 1] = img[..., 2] = np.round(v * 255)
    img[..., 3] = np.round(a * 255)
    return img


def quant(a, levels):
    """Posterise an alpha/value field into `levels` hard steps (pixel-art banding)."""
    return np.floor(np.clip(a, 0, 0.9999) * levels) / (levels - 1) if levels > 1 else (a > 0.5).astype(float)


def outline_of(mask):
    """1px ring of pixels just outside `mask` (4-neighbourhood)."""
    m = mask > 0
    o = np.zeros_like(m)
    o[1:, :] |= m[:-1, :]
    o[:-1, :] |= m[1:, :]
    o[:, 1:] |= m[:, :-1]
    o[:, :-1] |= m[:, 1:]
    return o & ~m


def poly_mask(w, h, pts, ss=4):
    """Antialias-free polygon fill (pixel centres, supersampled majority)."""
    X, Y = np.meshgrid((np.arange(w * ss) + 0.5) / ss, (np.arange(h * ss) + 0.5) / ss)
    m = np.zeros(X.shape, bool)
    n = len(pts)
    for i in range(n):
        x0, y0 = pts[i]
        x1, y1 = pts[(i + 1) % n]
        cond = (y0 > Y) != (y1 > Y)
        xint = (x1 - x0) * (Y - y0) / ((y1 - y0) + 1e-12) + x0
        m ^= cond & (X < xint)
    return m.reshape(h, ss, w, ss).mean(axis=(1, 3)) >= 0.5


def three_masks(shape, light):
    """Split a painted sprite into palette masks from a lighting field (0 dark … 1 lit):
    ink = outline + deepest shade, body = mid tones banded into 4 values (tint × grey), core = highlights,
    hot = the few specular pixels (drawn white)."""
    m = shape > 0
    ol = outline_of(m)
    ink = (ol | (m & (light < 0.24))).astype(float)
    band = np.clip(np.floor((light - 0.24) / 0.54 * 4), 0, 3)
    body_v = np.where(m, 0.42 + band * 0.19, 0)
    body = (m & (light >= 0.24)).astype(float)
    core = (m & (light > 0.78)).astype(float)
    hot = (m & (light > 0.95)).astype(float)
    return {'ink': rgba(ink), 'body': rgba(body, body_v), 'core': rgba(core), 'hot': rgba(hot)}


# ------------------------------------------------------------------------------------------------------------
# soft page (linear filtering)

def soft_sprites():
    S = {}
    X, Y = grid(64, 64)
    d = np.hypot(X, Y)
    S['bloom'] = rgba(np.clip(1 - d, 0, 1) ** 2.4)
    X2, Y2 = grid(32, 32)
    d2 = np.hypot(X2, Y2)
    S['bloomHot'] = rgba(np.clip(1 - d2, 0, 1) ** 4.5 * 1.4)
    S['ring'] = rgba(np.exp(-((d - 0.78) / 0.09) ** 2) * (d < 1))
    S['ringSoft'] = rgba(np.exp(-((d - 0.7) / 0.22) ** 2) * (d < 1) * 0.9)
    # four- and eight-point lens flares
    arm = lambda u, v: np.exp(-np.abs(v) / 0.035) * np.clip(1 - np.abs(u), 0, 1) ** 1.6
    f4 = np.maximum(arm(X, Y), arm(Y, X) * 0.75) + np.clip(1 - d, 0, 1) ** 6
    S['flare'] = rgba(np.clip(f4, 0, 1))
    R = (X + Y) / math.sqrt(2)
    Q = (X - Y) / math.sqrt(2)
    f8 = np.maximum(f4, np.maximum(arm(R, Q), arm(Q, R)) * 0.5)
    S['flare8'] = rgba(np.clip(f8, 0, 1))
    # beam cross-sections: soft haze and hot core (stretched along their length by the engine)
    _, V = grid(8, 32)
    S['beam'] = rgba(np.exp(-(V / 0.55) ** 2) * np.ones((32, 8)))
    S['beamCore'] = rgba(np.exp(-(V / 0.2) ** 2) * np.ones((32, 8)))
    # streak (a stretched spark / speed line) and a teardrop comet tail
    Xs, Ys = grid(32, 8)
    S['streak'] = rgba(np.exp(-(Ys / 0.45) ** 2) * np.clip(1 - np.abs(Xs), 0, 1) ** 0.8)
    Xt, Yt = grid(64, 16)
    u = (Xt + 1) / 2  # 0 tail … 1 head
    S['tail'] = rgba(np.exp(-(Yt / (0.15 + 0.75 * u)) ** 2) * u ** 1.6 * (u < 0.97) + np.exp(-((Xt - 0.9) ** 2 + Yt ** 2) / 0.02))
    # smoke puffs: lumpy noise balls lit from the upper left
    for i in range(3):
        n = value_noise(32, 32, 3, 10 + i, 3)
        Xp, Yp = grid(32, 32)
        dp = np.hypot(Xp, Yp) + (n - 0.5) * 0.7
        a = np.clip((0.95 - dp) / 0.35, 0, 1) ** 1.3
        light = np.clip(0.55 - 0.35 * (Xp + Yp) + (n - 0.5) * 0.8, 0, 1)
        S[f'smoke{i}'] = rgba(a * 0.95, 0.45 + 0.55 * light)
    # mist / poison / void clouds: wispy noise bloom
    for i in range(2):
        n = value_noise(64, 64, 4, 40 + i, 4)
        a = np.clip(1 - d, 0, 1) ** 1.2 * np.clip((n - 0.32) * 2.2, 0, 1)
        S[f'mist{i}'] = rgba(a)
    # floor rune circle (pre-squashed: drawn as an ellipse of ry = 0.32 r) and an upright sigil
    S['runeFloor'] = rune_circle(160, 52)
    S['sigil'] = rune_circle(96, 96)
    # scorch decal
    n = value_noise(64, 24, 5, 77, 3)
    Xs, Ys = grid(64, 24)
    ds = np.hypot(Xs, Ys) + (n - 0.5) * 0.5
    S['scorch'] = rgba(np.clip((1 - ds) / 0.5, 0, 1) ** 1.5, 0.15 + 0.2 * n)
    return S


def rune_circle(w, h):
    """Two concentric rings, a band of glyph ticks, an inscribed star and hairline spokes (1-2px lines)."""
    ss = 4
    W, H = w * ss, h * ss
    X, Y = np.meshgrid((np.arange(W) + 0.5) / W * 2 - 1, (np.arange(H) + 0.5) / H * 2 - 1)
    r = np.hypot(X, Y)
    th = np.arctan2(Y, X)
    px = 2.0 / w  # one texel in normalised units
    line = lambda dist, wid: (np.abs(dist) < wid * px).astype(float)
    a = line(r - 0.97, 1.0) + line(r - 0.9, 0.6) + line(r - 0.62, 0.7) * 0.9 + line(r - 0.56, 0.5) * 0.7
    # glyph band between 0.66 and 0.86: short ticks and little boxes at 24 stations
    band = (r > 0.68) & (r < 0.86)
    st = (th / (2 * math.pi) * 24) % 1
    k = np.floor(th / (2 * math.pi) * 24 + 24).astype(int) % 24
    glyph = np.zeros_like(r)
    for g in range(24):
        sel = band & (k == g)
        kind = g % 4
        if kind == 0:
            glyph[sel & (np.abs(st - 0.5) < 0.08)] = 1
        elif kind == 1:
            glyph[sel & ((np.abs(st - 0.3) < 0.07) | (np.abs(st - 0.7) < 0.07)) & (r > 0.72)] = 1
            glyph[sel & (np.abs(r - 0.77) < 0.6 * px * 1.5)] = 1
        elif kind == 2:
            glyph[sel & (np.abs((st - 0.5) * 0.35 - (r - 0.77)) < 0.012)] = 1
            glyph[sel & (np.abs((st - 0.5) * -0.35 - (r - 0.77)) < 0.012)] = 1
        else:
            glyph[sel & (np.abs(r - 0.72) < 0.012) & (np.abs(st - 0.5) < 0.3)] = 1
            glyph[sel & (np.abs(r - 0.82) < 0.012) & (np.abs(st - 0.5) < 0.3)] = 1
    a += glyph
    # inscribed pentagram
    pts = [(math.cos(-math.pi / 2 + i * 4 * math.pi / 5) * 0.6, math.sin(-math.pi / 2 + i * 4 * math.pi / 5) * 0.6) for i in range(5)]
    for i in range(5):
        (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % 5]
        vx, vy = x1 - x0, y1 - y0
        L = math.hypot(vx, vy)
        t = np.clip(((X - x0) * vx + (Y - y0) * vy) / (L * L), 0, 1)
        dd = np.hypot(X - (x0 + t * vx), Y - (y0 + t * vy))
        a += (dd < 0.6 * px).astype(float) * 0.85
    a = np.clip(a, 0, 1) * (r < 1)
    a = a.reshape(h, ss, w, ss).mean(axis=(1, 3))
    return rgba(np.clip(a * 1.6, 0, 1))


# ------------------------------------------------------------------------------------------------------------
# pixel page (nearest filtering)

def pix_sprites():
    S = {}
    # embers: 3 sizes, bright core with a stepped halo
    for i, n in enumerate((5, 7, 9)):
        X, Y = grid(n, n)
        d = np.hypot(X, Y)
        a = np.where(d < 0.35, 1.0, np.where(d < 0.7, 0.55, np.where(d < 1.0, 0.2, 0)))
        v = np.where(d < 0.35, 1.0, 0.85)
        S[f'ember{i}'] = rgba(a, v)
    # pixel sparkle cross (core + arms)
    sp = np.zeros((7, 7))
    sp[3, :] = [0.25, 0.55, 1, 1, 1, 0.55, 0.25]
    sp[:, 3] = [0.25, 0.55, 1, 1, 1, 0.55, 0.25]
    S['twinkle'] = rgba(sp)
    big = np.zeros((11, 11))
    big[5, :] = [0.15, 0.3, 0.5, 0.8, 1, 1, 1, 0.8, 0.5, 0.3, 0.15]
    big[:, 5] = big[5, :]
    big[4:7, 4:7] = np.maximum(big[4:7, 4:7], 0.8)
    S['twinkleBig'] = rgba(big)

    # crystal shard (tall, faceted), ice shard (thin), rock spike (jagged), all lit from the upper left
    S.update(shard_sprite('crystal', 18, 44, [(9, 0.5), (16.5, 13), (14, 43.5), (4, 43.5), (1.5, 15)], ridge=9))
    S.update(shard_sprite('iceShard', 9, 18, [(4.5, 0.5), (8.5, 6), (6.5, 17.5), (2.5, 17.5), (0.5, 7)], ridge=4.5))
    S.update(rock_spike('rockSpike', 22, 46, seed=5))
    for i in range(3):
        S.update(rock_chunk(f'rock{i}', 10, 9, seed=20 + i))
    # flame tongues (4 frames) and a fireball head with a short flame trail pointing left (4 frames)
    for f in range(4):
        S.update(flame_tongue(f'flame{f}', 16, 28, seed=60 + f, phase=f))
        S.update(fireball(f'fireball{f}', 32, 20, seed=80 + f, phase=f))
        S.update(flame_tongue(f'blaze{f}', 24, 56, seed=120 + f, phase=f))
    S.update(droplet('drop', 7, 10))
    S.update(bubble('bubble', 9, 9))
    S.update(feather('feather', 7, 15))
    S.update(leaf('leaf', 8, 8))
    S.update(bone_shard('bone', 11, 5))
    for f in range(4):
        S.update(coin(f'coin{f}', 7, 7, f))
    return S


def shard_sprite(name, w, h, pts, ridge):
    m = poly_mask(w, h, pts)
    X, Y = np.meshgrid(np.arange(w) + 0.5, np.arange(h) + 0.5)
    left = X < ridge + (Y / h) * 0.6  # left facet faces the light
    light = np.where(left, 0.82, 0.42) - 0.25 * (Y / h) + 0.12 * (np.abs(X - ridge) < 1.0)
    light = np.where(left & (X < ridge - 2.2) & (Y > h * 0.25), light - 0.12, light)
    return {f'{name}.{k}': v for k, v in three_masks(m.astype(float), light).items()}


def rock_spike(name, w, h, seed):
    rng = np.random.default_rng(seed)
    pts = [(w / 2 + rng.uniform(-1, 1), 0.5)]
    for i in range(1, 6):
        y = h * i / 6
        pts.append((w / 2 + (w / 2 - 1) * (i / 6) ** 0.8 + rng.uniform(-1.2, 1.2), y))
    pts.append((w - 0.5, h - 0.5))
    pts.append((0.5, h - 0.5))
    for i in range(5, 0, -1):
        y = h * i / 6
        pts.append((w / 2 - (w / 2 - 1) * (i / 6) ** 0.8 + rng.uniform(-1.2, 1.2), y))
    m = poly_mask(w, h, pts)
    X, Y = np.meshgrid(np.arange(w) + 0.5, np.arange(h) + 0.5)
    n = value_noise(w, h, 4, seed, 2)
    ridge = w / 2 + (Y / h - 0.5) * 1.5
    light = np.where(X < ridge, 0.72, 0.36) - 0.25 * (Y / h) + (n - 0.5) * 0.35
    light = np.where(np.abs(X - ridge) < 0.9, light + 0.22, light)  # lit ridge line
    # strata cracks: a dark seam with a lit lip under it
    seam = np.abs(((Y + X * 0.35) % 8) - 4) < 0.5
    light = np.where(seam & (n > 0.4), light - 0.4, light)
    light = np.where(np.roll(seam, 1, axis=0) & (n > 0.4), light + 0.15, light)
    return {f'{name}.{k}': v for k, v in three_masks(m.astype(float), light).items()}


def rock_chunk(name, w, h, seed):
    rng = np.random.default_rng(seed)
    pts = []
    for i in range(7):
        a = i / 7 * 2 * math.pi + rng.uniform(-0.2, 0.2)
        r = rng.uniform(0.7, 1.0)
        pts.append((w / 2 + math.cos(a) * r * (w / 2 - 1), h / 2 + math.sin(a) * r * (h / 2 - 1)))
    m = poly_mask(w, h, pts)
    X, Y = np.meshgrid(np.arange(w) + 0.5, np.arange(h) + 0.5)
    light = 0.6 - 0.5 * ((X - w / 2) / w + (Y - h / 2) / h) + rng.uniform(-0.05, 0.05)
    return {f'{name}.{k}': v for k, v in three_masks(m.astype(float), light).items()}


def flame_tongue(name, w, h, seed, phase):
    """A licking flame: several tongues rising from a hot base, broken up by scrolling noise.
    body = the flame (darker toward its edges), core = inner fire, hot = white heart at the base."""
    X, Y = grid(w, h)
    n = value_noise(w, h * 3, 4, seed, 3)[phase * 5: phase * 5 + h]
    u = (Y + 1) / 2  # 0 tip … 1 base
    width = 0.12 + 0.88 * np.sin(np.clip(u, 0, 1) * math.pi * 0.6) ** 1.1
    sway = 0.22 * np.sin(u * 6 + phase * 1.6) * (1 - u) ** 1.5
    d = np.abs(X - sway) / np.maximum(width, 1e-3) + (n - 0.5) * 1.3 * (1 - u * 0.6)
    outer = (d < 0.95) & (u > 0.02)
    inner = (d < 0.55) & (u > 0.3)
    heart = (d < 0.3) & (u > 0.62)
    ink = outline_of(outer) & (Y > 0.1)
    body_v = np.where(outer, 0.5 + 0.5 * np.clip(1 - d, 0, 1) + 0.15 * u, 0)
    return {f'{name}.ink': rgba(ink.astype(float) * 0.6), f'{name}.body': rgba(outer.astype(float), np.clip(body_v, 0, 1)),
            f'{name}.core': rgba(inner.astype(float), 0.8 + 0.2 * u), f'{name}.hot': rgba(heart.astype(float))}


def fireball(name, w, h, seed, phase):
    """Head on the right, licking tongues trailing left."""
    X, Y = grid(w, h)
    n = value_noise(w * 2, h, 4, seed, 3)[:, phase * 4: phase * 4 + w]
    hx = 0.55
    dx = (X - hx) / 0.45
    dy = Y / 0.75
    head = np.hypot(dx, dy)
    trail_w = np.clip((X + 1) / (hx + 1), 0, 1) ** 1.3 * 0.75
    trail = np.abs(Y + 0.12 * np.sin(X * 6 + phase * 1.7)) / np.maximum(trail_w, 1e-3)
    field = np.minimum(head, np.where(X < hx, trail, 9)) + (n - 0.5) * 0.7
    outer = field < 1.0
    inner = (np.hypot((X - hx - 0.05) / 0.32, Y / 0.5) + (n - 0.5) * 0.5) < 0.85
    hot = (np.hypot((X - hx - 0.12) / 0.17, (Y + 0.1) / 0.3)) < 0.8
    ink = outline_of(outer) & (Y > -0.1)
    body_v = np.where(outer, 0.65 + 0.35 * np.clip((X + 1) / 2, 0, 1), 0)
    body_v = np.where(outer, np.clip(0.45 + 0.55 * np.clip(1 - field, 0, 1) + 0.25 * np.clip((X + 1) / 2, 0, 1), 0, 1), 0)
    return {f'{name}.ink': rgba(ink.astype(float) * 0.6), f'{name}.body': rgba(outer.astype(float), body_v),
            f'{name}.core': rgba((inner & outer).astype(float)), f'{name}.hot': rgba((hot & outer).astype(float))}


def droplet(name, w, h):
    X, Y = np.meshgrid(np.arange(w) + 0.5, np.arange(h) + 0.5)
    cx, cy, r = w / 2, h - w / 2, w / 2 - 0.5
    ball = np.hypot(X - cx, Y - cy) < r
    tip = (Y < cy) & (np.abs(X - cx) < (Y / cy) * r)
    m = ball | tip
    light = 0.55 - 0.5 * ((X - cx) / w + (Y - cy) / h) + 0.35 * (np.hypot(X - cx + 1.2, Y - cy + 1.0) < 1.2)
    return {f'{name}.{k}': v for k, v in three_masks(m.astype(float), light).items()}


def bubble(name, w, h):
    X, Y = np.meshgrid(np.arange(w) + 0.5, np.arange(h) + 0.5)
    d = np.hypot(X - w / 2, Y - h / 2)
    ring = (d < w / 2 - 0.3) & (d > w / 2 - 1.6)
    hi = np.hypot(X - w / 2 + 1.6, Y - h / 2 + 1.6) < 1.1
    return {f'{name}.ink': rgba(np.zeros((h, w))), f'{name}.body': rgba(ring.astype(float), np.full((h, w), 0.8)),
            f'{name}.core': rgba(hi.astype(float)), f'{name}.hot': rgba(np.zeros((h, w)))}


def feather(name, w, h):
    X, Y = np.meshgrid(np.arange(w) + 0.5, np.arange(h) + 0.5)
    u = Y / h
    half = (w / 2 - 0.5) * np.sin(np.clip(u * 1.05, 0, 1) * math.pi) ** 0.8
    m = (np.abs(X - w / 2) < half) & (u > 0.03)
    light = np.where(X < w / 2, 0.75, 0.45) - 0.15 * ((Y.astype(int) % 3) == 0)
    S = three_masks(m.astype(float), light)
    S['core'] = rgba(((np.abs(X - w / 2) < 0.6) & (u > 0.05) & (u < 0.95)).astype(float))  # shaft
    return {f'{name}.{k}': v for k, v in S.items()}


def leaf(name, w, h):
    """A diagonal leaf: two arcs meeting at the tips, a lit upper half and a central vein."""
    X, Y = np.meshgrid(np.arange(w) + 0.5, np.arange(h) + 0.5)
    u = (X + (h - Y)) / (w + h)  # along the diagonal
    v = (X - (h - Y)) / (w + h)  # across
    m = (np.abs(v) < 0.26 * np.sin(np.clip(u, 0, 1) * math.pi)) & (u > 0.06) & (u < 0.96)
    light = np.where(v < 0, 0.8, 0.45)
    light = np.where(np.abs(v) < 0.03, 0.2, light)
    return {f'{name}.{k}': v2 for k, v2 in three_masks(m.astype(float), light).items()}


def bone_shard(name, w, h):
    X, Y = np.meshgrid(np.arange(w) + 0.5, np.arange(h) + 0.5)
    shaft = (np.abs(Y - h / 2) < 1.1) & (X > 1.5) & (X < w - 1.5)
    knobs = (np.hypot(X - 1.6, Y - 1.4) < 1.4) | (np.hypot(X - 1.6, Y - h + 1.4) < 1.4) | \
            (np.hypot(X - w + 1.6, Y - 1.4) < 1.4) | (np.hypot(X - w + 1.6, Y - h + 1.4) < 1.4)
    m = shaft | knobs
    light = 0.75 - 0.5 * (Y / h)
    return {f'{name}.{k}': v for k, v in three_masks(m.astype(float), light).items()}


def coin(name, w, h, f):
    X, Y = np.meshgrid(np.arange(w) + 0.5, np.arange(h) + 0.5)
    sx = [1.0, 0.7, 0.25, 0.7][f]
    d = np.hypot((X - w / 2) / (sx * (w / 2 - 0.5) + 1e-3), (Y - h / 2) / (h / 2 - 0.5))
    m = d < 1
    light = 0.62 - 0.45 * ((X - w / 2) / w + (Y - h / 2) / h) - 0.25 * ((d > 0.55) & (d < 0.75))
    return {f'{name}.{k}': v for k, v in three_masks(m.astype(float), light).items()}


# ------------------------------------------------------------------------------------------------------------
# packing

def pack(sprites, page_w, pad=1):
    """Shelf packer, tallest first. Returns the page image and {name: [x, y, w, h]}."""
    items = sorted(sprites.items(), key=lambda kv: (-kv[1].shape[0], -kv[1].shape[1], kv[0]))
    x = y = shelf = 0
    rects = {}
    for name, img in items:
        h, w = img.shape[:2]
        if x + w + pad > page_w:
            x, y = 0, y + shelf + pad
            shelf = 0
        rects[name] = [x + pad, y + pad, w, h]
        x += w + pad
        shelf = max(shelf, h)
    page_h = 1
    while page_h < y + shelf + pad * 2:
        page_h *= 2
    page = np.zeros((page_h, page_w, 4), np.uint8)
    for name, (px, py, w, h) in rects.items():
        page[py:py + h, px:px + w] = sprites[name]
    return page, rects


def preview(pages, rects):
    """Tinted contact sheet: palette sprites stacked ink/body/core in a fire palette, the rest in white on black."""
    from PIL import ImageDraw
    INK, BODY, CORE = (60, 8, 4), (232, 72, 24), (255, 226, 140)
    names = sorted({n.split('.')[0] for n in rects})
    cell, S = 70, 2
    cols = 12
    rows = (len(names) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * cell * S, rows * (cell + 8) * S), (20, 16, 26, 255))
    d = ImageDraw.Draw(sheet)
    for i, n in enumerate(names):
        layers = [k for k in (n + '.ink', n + '.body', n + '.core', n + '.hot', n) if k in rects]
        canvas = None
        for k in layers:
            page, (x, y, w, h) = pages[rects[k][4]], rects[k][:4]
            spr = page[y:y + h, x:x + w].astype(float) / 255
            tint = INK if k.endswith('.ink') else BODY if k.endswith('.body') else CORE if k.endswith('.core') else (255, 255, 255)
            col = spr[..., :3] * np.array(tint) / 255
            if canvas is None:
                canvas = np.zeros((h, w, 4))
            a = spr[..., 3:4]
            canvas[..., :3] = canvas[..., :3] * (1 - a) + col * a
            canvas[..., 3:4] = np.maximum(canvas[..., 3:4], a)
        img = Image.fromarray(np.round(canvas * 255).astype(np.uint8), 'RGBA')
        k = max(1, min(cell // max(img.size), 4))
        img = img.resize((img.width * k * S, img.height * k * S), Image.NEAREST)
        cx, cy = (i % cols) * cell * S, (i // cols) * (cell + 8) * S
        sheet.alpha_composite(img, (cx + 4, cy + 18))
        d.text((cx + 4, cy + 2), n, fill=(220, 220, 230, 255))
    return sheet


def main():
    os.makedirs(OUT, exist_ok=True)
    soft, soft_rects = pack(soft_sprites(), 256)
    pix, pix_rects = pack(pix_sprites(), 256)
    Image.fromarray(soft, 'RGBA').save(os.path.join(OUT, 'spellfx-soft.png'), optimize=True)
    Image.fromarray(pix, 'RGBA').save(os.path.join(OUT, 'spellfx-pix.png'), optimize=True)
    frames = {n: r + ['soft'] for n, r in soft_rects.items()}
    frames.update({n: r + ['pix'] for n, r in pix_rects.items()})
    meta = {'pages': {'soft': {'file': 'spellfx-soft.png', 'size': [soft.shape[1], soft.shape[0]], 'scaleMode': 'linear'},
                      'pix': {'file': 'spellfx-pix.png', 'size': [pix.shape[1], pix.shape[0]], 'scaleMode': 'nearest'}},
            'sprites': {k: frames[k] for k in sorted(frames)}}
    with open(os.path.join(OUT, 'spellfx.json'), 'w') as f:
        json.dump(meta, f, separators=(',', ':'))
    os.makedirs(os.path.join(ROOT, 'work'), exist_ok=True)
    preview({'soft': soft, 'pix': pix}, frames).save(os.path.join(ROOT, 'work', 'spellfx-preview.png'))
    print(f'soft {soft.shape[1]}x{soft.shape[0]} ({len(soft_rects)} sprites), pix {pix.shape[1]}x{pix.shape[0]} ({len(pix_rects)} sprites)')


if __name__ == '__main__':
    main()
