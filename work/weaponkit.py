"""
A small procedural pixel-art renderer for the knight's weapons (work/craft_remastered_weapons.py).

Shapes are rasterised 4x4 supersampled with real 3D normals (spheres, tapered tubes, bevelled boxes, faceted
blades), then each pixel is lit (diffuse + Blinn specular + rim light) and quantised onto a hand-picked,
hue-shifted colour ramp. Finishing passes add contact shadows where one part overlaps another, a selective
outline (lighter on the lit side, darkest at the bottom-right), embossed/engraved detail and soft glow halos.
Everything stays in "tone space" (material + ramp index) until compose(), so detail passes can step tones.
"""
import math
import numpy as np
from PIL import Image

SS = 4
LIGHT = np.array([-0.55, -0.72, 0.62])
LIGHT = LIGHT / np.linalg.norm(LIGHT)
HALF = LIGHT + np.array([0, 0, 1.0])
HALF = HALF / np.linalg.norm(HALF)
RIM_DIR = np.array([0.75, 0.55, 0.0])
RIM_DIR = RIM_DIR / np.linalg.norm(RIM_DIR)
BAYER = np.array([[0.0, 0.5], [0.75, 0.25]]) - 0.375


def hexc(s):
    s = s.lstrip('#')
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def ramp(*anchors, n=8):
    """A colour ramp through hex anchors (dark → light), resampled to n tones."""
    cols = [np.array(hexc(a), float) for a in anchors]
    out = []
    for i in range(n):
        u = i / (n - 1) * (len(cols) - 1)
        k = min(int(u), len(cols) - 2)
        f = u - k
        out.append(tuple(int(round(v)) for v in cols[k] * (1 - f) + cols[k + 1] * f))
    return out


class Mat:
    def __init__(self, ramp, kd=0.85, amb=0.12, ks=0.0, shin=18, dither=0.0, rim=None, rim_k=0.5,
                 emissive=False, outline=None, gamma=1.3):
        self.ramp = ramp
        self.kd, self.amb, self.ks, self.shin = kd, amb, ks, shin
        self.dither = dither
        self.rim = hexc(rim) if isinstance(rim, str) else rim
        self.rim_k = rim_k
        self.emissive = emissive
        self.outline = outline
        self.gamma = gamma


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        W, H = w * SS, h * SS
        self.X, self.Y = np.meshgrid((np.arange(W) + 0.5) / SS, (np.arange(H) + 0.5) / SS)
        self.mid = np.full((H, W), -1, int)
        self.pid = np.full((H, W), -1, int)
        self.nrm = np.zeros((H, W, 3))
        self.mats = []
        self.prims = []  # per primitive: (tex fn or None, casts shadow)
        self.glows = []

    # --- primitive plumbing --------------------------------------------------------------------------------
    def _mat(self, m):
        for i, mm in enumerate(self.mats):
            if mm is m:
                return i
        self.mats.append(m)
        return len(self.mats) - 1

    def _put(self, mask, n, mat, tex=None, shadow=True, clip=None):
        if clip is not None:
            mask = mask & clip(self.X, self.Y)
        if not mask.any():
            return
        self.prims.append((tex, shadow))
        self.mid[mask] = self._mat(mat)
        self.pid[mask] = len(self.prims) - 1
        self.nrm[mask] = n[mask]

    # --- primitives ----------------------------------------------------------------------------------------
    def ellipsoid(self, cx, cy, rx, ry, mat, tex=None, shadow=True, clip=None, depth=1.0):
        dx = (self.X - cx) / rx
        dy = (self.Y - cy) / ry
        d = dx * dx + dy * dy
        m = d < 1
        nz = np.sqrt(np.clip(1 - d, 0, 1)) * depth
        n = np.dstack([dx, dy, nz])
        n /= np.linalg.norm(n, axis=2, keepdims=True) + 1e-9
        self._put(m, n, mat, tex, shadow, clip)

    def tube(self, pts, radii, mat, tex=None, shadow=True, clip=None, flat=0.0):
        """A tube along a polyline; radii is one value or one per point (tapers, spikes, horns)."""
        if not isinstance(radii, (list, tuple)):
            radii = [radii] * len(pts)
        best = np.full(self.X.shape, np.inf)
        off = np.zeros(self.X.shape + (2,))
        rad = np.ones(self.X.shape)
        for (x0, y0), (x1, y1), r0, r1 in zip(pts, pts[1:], radii, radii[1:]):
            vx, vy = x1 - x0, y1 - y0
            L2 = vx * vx + vy * vy + 1e-9
            u = np.clip(((self.X - x0) * vx + (self.Y - y0) * vy) / L2, 0, 1)
            px, py = x0 + u * vx, y0 + u * vy
            ox, oy = self.X - px, self.Y - py
            r = r0 + (r1 - r0) * u
            d = np.hypot(ox, oy) / np.maximum(r, 1e-6)
            sel = d < best
            best = np.where(sel, d, best)
            off[..., 0] = np.where(sel, ox, off[..., 0])
            off[..., 1] = np.where(sel, oy, off[..., 1])
            rad = np.where(sel, r, rad)
        m = best < 1
        t = np.clip(best, 0, 1)
        nx, ny = off[..., 0] / rad, off[..., 1] / rad
        nz = np.sqrt(np.clip(1 - t * t, 0, 1)) + flat
        n = np.dstack([nx, ny, nz])
        n /= np.linalg.norm(n, axis=2, keepdims=True) + 1e-9
        self._put(m, n, mat, tex, shadow, clip)

    def arc(self, cx, cy, rx, ry, a0, a1, r, mat, steps=24, **kw):
        """A tube along an elliptical arc (angles in degrees, 0 = right, 90 = down)."""
        pts = [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / steps)),
                cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / steps))) for i in range(steps + 1)]
        self.tube(pts, r, mat, **kw)

    def box(self, cx, cy, hw, hh, bevel, mat, tex=None, shadow=True, clip=None, concave=False):
        """A bevelled slab: flat face, rounded edges."""
        ix = np.clip(self.X, cx - hw + bevel, cx + hw - bevel)
        iy = np.clip(self.Y, cy - hh + bevel, cy + hh - bevel)
        ox, oy = self.X - ix, self.Y - iy
        d = np.hypot(ox, oy) / bevel
        m = (np.abs(self.X - cx) < hw) & (np.abs(self.Y - cy) < hh) & (d < 1)
        s = -1 if concave else 1
        n = np.dstack([s * ox / bevel, s * oy / bevel, np.sqrt(np.clip(1 - d * d, 0, 1)) + 0.15])
        n /= np.linalg.norm(n, axis=2, keepdims=True) + 1e-9
        self._put(m, n, mat, tex, shadow, clip)

    def poly(self, pts, mat, normal=(0, 0, 1), tex=None, shadow=True, clip=None):
        m = inside(self.X, self.Y, pts)
        n = np.zeros(self.X.shape + (3,))
        nv = np.array(normal, float)
        n[:] = nv / np.linalg.norm(nv)
        self._put(m, n, mat, tex, shadow, clip)

    def blade(self, pts_top, pts_bot, mat, ridge=0.55, tex=None, shadow=True, clip=None):
        """A two-facet blade between a top and bottom edge (both listed left→right): the upper facet faces
        up into the light, the lower one away, split along the mid line."""
        poly = list(pts_top) + list(reversed(pts_bot))
        m = inside(self.X, self.Y, poly)
        xs_t, ys_t = zip(*pts_top)
        xs_b, ys_b = zip(*pts_bot)
        yt = np.interp(self.X, xs_t, ys_t)
        yb = np.interp(self.X, xs_b, ys_b)
        mid = (yt + yb) / 2
        up = self.Y < mid
        n = np.zeros(self.X.shape + (3,))
        n[..., 1] = np.where(up, -ridge, ridge)
        n[..., 2] = 1
        n /= np.linalg.norm(n, axis=2, keepdims=True)
        self._put(m, n, mat, tex, shadow, clip)

    def glow(self, x, y, color, r=1.6, a=120):
        self.glows.append((x, y, hexc(color) if isinstance(color, str) else color, r, a))

    # --- resolve to pixels ---------------------------------------------------------------------------------
    def render(self):
        w, h = self.w, self.h
        mid = self.mid.reshape(h, SS, w, SS).transpose(0, 2, 1, 3).reshape(h, w, SS * SS)
        pid = self.pid.reshape(h, SS, w, SS).transpose(0, 2, 1, 3).reshape(h, w, SS * SS)
        nrm = self.nrm.reshape(h, SS, w, SS, 3).transpose(0, 2, 1, 3, 4).reshape(h, w, SS * SS, 3)
        P = Pixels(w, h, self.mats)
        for y in range(h):
            for x in range(w):
                ms = mid[y, x]
                cov = (ms >= 0).sum()
                if cov < SS * SS * 0.45:
                    continue
                # the topmost primitive that covers most of the pixel
                ps = pid[y, x][ms >= 0]
                vals, counts = np.unique(ps, return_counts=True)
                p = vals[np.argmax(counts)] if counts.max() * 2 >= len(ps) else ps.max()
                sel = pid[y, x] == p
                m = ms[sel][0]
                n = nrm[y, x][sel].mean(axis=0)
                n /= np.linalg.norm(n) + 1e-9
                P.mat[y, x] = m
                P.pid[y, x] = p
                mat = self.mats[m]
                tex, _ = self.prims[p]
                tv = tex(x + 0.5, y + 0.5) if tex else 0.0
                if mat.emissive:
                    lum = 0.75 + tv
                else:
                    diff = max(0.0, float(n @ LIGHT))
                    spec = max(0.0, float(n @ HALF)) ** mat.shin if mat.ks else 0.0
                    lum = max(0.0, (mat.amb + mat.kd * diff) * 0.9 + tv) ** mat.gamma + mat.ks * spec
                    if mat.rim is not None and n[2] < 0.38 and float(n[:2] @ RIM_DIR[:2]) > 0.55:
                        P.rim[y, x] = mat.rim_k
                N = len(mat.ramp)
                t = lum * (N - 1) + mat.dither * BAYER[y % 2, x % 2] + 0.5
                P.tone[y, x] = int(np.clip(math.floor(t), 0, N - 1))
        # contact shadows: a part drawn on top darkens what is just below/right of its edge
        for y in range(h):
            for x in range(w):
                p = P.pid[y, x]
                if p < 0:
                    continue
                for dx, dy, k in ((-1, 0, 1), (0, -1, 1), (-1, -1, 1)):
                    q = P.pid[y + dy, x + dx] if 0 <= y + dy and 0 <= x + dx else -1
                    if q > p and self.prims[q][1] and not self.mats[P.mat[y, x]].emissive:
                        P.tone[y, x] = max(0, P.tone[y, x] - 2)
                        P.rim[y, x] = 0
                        break
        P.glows = self.glows
        return P


def inside(X, Y, pts):
    m = np.zeros(X.shape, bool)
    n = len(pts)
    for i in range(n):
        x0, y0 = pts[i]
        x1, y1 = pts[(i + 1) % n]
        cond = (y0 > Y) != (y1 > Y)
        xint = (x1 - x0) * (Y - y0) / ((y1 - y0) + 1e-12) + x0
        m ^= cond & (X < xint)
    return m


class Pixels:
    """Tone-space pixels: material id + ramp index per pixel, with detail helpers and a final compose()."""

    def __init__(self, w, h, mats):
        self.w, self.h = w, h
        self.mats = mats
        self.mat = np.full((h, w), -1, int)
        self.pid = np.full((h, w), -1, int)
        self.tone = np.zeros((h, w), int)
        self.rim = np.zeros((h, w))
        self.over = {}  # (x, y) -> rgba, painted after outlines
        self.glows = []

    def ok(self, x, y):
        return 0 <= x < self.w and 0 <= y < self.h and self.mat[y, x] >= 0

    def step(self, x, y, d):
        if self.ok(x, y):
            N = len(self.mats[self.mat[y, x]].ramp)
            self.tone[y, x] = int(np.clip(self.tone[y, x] + d, 0, N - 1))

    def paint(self, x, y, mat, tone=None, mats_list=None):
        if not (0 <= x < self.w and 0 <= y < self.h):
            return
        if mat not in self.mats:
            self.mats.append(mat)
        self.mat[y, x] = self.mats.index(mat)
        self.pid[y, x] = 10_000
        N = len(mat.ramp)
        self.tone[y, x] = N - 1 if tone is None else (tone if tone >= 0 else N + tone)
        self.rim[y, x] = 0

    def emboss(self, pts, up=2, down=2):
        """Raised detail: the point lights up and casts a dark pixel to its lower-right."""
        s = set(pts)
        for x, y in pts:
            if (x + 1, y + 1) not in s:
                self.step(x + 1, y + 1, -down)
        for x, y in pts:
            self.step(x, y, up)

    def engrave(self, pts, down=2, up=1):
        """Cut detail: the groove darkens, its lower-right lip catches light."""
        s = set(pts)
        for x, y in pts:
            if (x + 1, y + 1) not in s:
                self.step(x + 1, y + 1, up)
        for x, y in pts:
            self.step(x, y, -down)

    def set(self, x, y, rgba):
        self.over[(x, y)] = rgba if len(rgba) == 4 else (*rgba, 255)

    def compose(self):
        w, h = self.w, self.h
        out = np.zeros((h, w, 4), np.uint8)
        for y in range(h):
            for x in range(w):
                m = self.mat[y, x]
                if m < 0:
                    continue
                mat = self.mats[m]
                c = np.array(mat.ramp[self.tone[y, x]], float)
                if self.rim[y, x] and mat.rim is not None:
                    c = c * (1 - self.rim[y, x]) + np.array(mat.rim) * self.rim[y, x]
                out[y, x] = (*np.round(c).astype(int), 255)
        # selective outline around the silhouette
        base = out.copy()
        for y in range(h):
            for x in range(w):
                if base[y, x, 3]:
                    continue
                nb = []
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < w and 0 <= yy < h and base[yy, xx, 3]:
                        nb.append((dx, dy, self.mats[self.mat[yy, xx]]))
                if not nb:
                    continue
                lit = all(dx > 0 or dy > 0 for dx, dy, _ in nb)  # this pixel sits on the shape's upper-left
                mat = nb[0][2]
                if mat.outline is not None:
                    c = np.array(hexc(mat.outline), float)
                elif mat.emissive:
                    c = np.array(mat.ramp[0], float) * 0.7
                else:
                    c = np.array(mat.ramp[0], float) * (0.85 if lit else 0.5)
                    c = c * 0.8 + np.array([18, 10, 26]) * 0.2  # cool the outline toward ink
                out[y, x] = (*np.round(c).astype(int), 255)
        # soft glow halos on empty pixels
        acc = np.zeros((h, w, 4))
        for gx, gy, col, r, a in self.glows:
            for y in range(max(0, int(gy - r - 1)), min(h, int(gy + r + 2))):
                for x in range(max(0, int(gx - r - 1)), min(w, int(gx + r + 2))):
                    d = math.hypot(x + 0.5 - gx, y + 0.5 - gy)
                    if d <= r and not out[y, x, 3]:
                        k = a * (1 - d / (r + 0.5))
                        if k > acc[y, x, 3]:
                            acc[y, x] = (*col, k)
        for y in range(h):
            for x in range(w):
                if acc[y, x, 3] >= 24 and not out[y, x, 3]:
                    out[y, x] = (*acc[y, x, :3].astype(int), int(acc[y, x, 3]))
        for (x, y), c in self.over.items():
            if 0 <= x < w and 0 <= y < h:
                out[y, x] = c
        return Image.fromarray(out, 'RGBA')


# --- shared bits ---------------------------------------------------------------------------------------------

def noise2(seed=0):
    """Smooth value noise in [-1, 1] (for hammered metal, grain, verdigris)."""
    rng = np.random.default_rng(seed)
    g = rng.uniform(-1, 1, (96, 96))

    def f(x, y, s=1.0):
        x, y = x / s, y / s
        x0, y0 = int(math.floor(x)) % 95, int(math.floor(y)) % 95
        fx, fy = x - math.floor(x), y - math.floor(y)
        fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
        a = g[y0, x0] * (1 - fx) + g[y0, x0 + 1] * fx
        b = g[y0 + 1, x0] * (1 - fx) + g[y0 + 1, x0 + 1] * fx
        return a * (1 - fy) + b * fy
    return f


DIGITS = {
    '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'],
    '2': ['111', '001', '111', '100', '111'], '3': ['111', '001', '011', '001', '111'],
    '4': ['101', '101', '111', '001', '001'], '5': ['111', '100', '111', '001', '111'],
    '6': ['111', '100', '111', '101', '111'], '7': ['111', '001', '010', '010', '010'],
    '8': ['111', '101', '111', '101', '111'], '9': ['111', '101', '111', '001', '111'],
}


def digit_pts(text, cx, top):
    """Pixels of a 3x5 number centred on cx."""
    glyphs = [['1'] * 5 if ch == '1' else DIGITS[ch] for ch in text]
    wdt = sum(len(g[0]) + 1 for g in glyphs) - 1
    x = int(round(cx - wdt / 2))
    pts = []
    for g in glyphs:
        for r, row in enumerate(g):
            for c, bit in enumerate(row):
                if bit == '1':
                    pts.append((x + c, top + r))
        x += len(g[0]) + 1
    return pts


def upscale_sheet(items, scale=6, cols=6, bg=(34, 30, 42)):
    from PIL import ImageDraw
    cw = 64 * scale + 16
    ch = 40 * scale + 26
    rows = (len(items) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * cw, rows * ch), (*bg, 255))
    d = ImageDraw.Draw(sheet)
    for i, (name, img) in enumerate(items):
        x = (i % cols) * cw + 8
        y = (i // cols) * ch + 20
        sheet.alpha_composite(img.resize((img.width * scale, img.height * scale), Image.NEAREST), (x, y))
        d.text((x, y - 16), name, fill=(230, 230, 240, 255))
    return sheet
