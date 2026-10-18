import { Layer, mix, toTexture } from '../pixelKit';
import type { Texture } from 'pixi.js';

/**
 * Lit pixel art for the secret-trial set pieces: paint shapes into a small G-buffer (material + surface normal per
 * pixel), then `bake()` lights it the way a pixel artist would: a key light and coloured point lights quantized onto
 * hue-shifted ramps (shadows sink to violet, lights climb to cream), Bayer-dithered only where two tones meet,
 * specular glints on metal, rim light on the silhouette, contact shadow where one part sits on another, and a
 * selective dark outline. Bake once (or a couple of lighting variants to crossfade) when a scene opens; the result
 * is an ordinary nearest-filtered texture at 1 texel = 1 stage pixel.
 */

export type N3 = [number, number, number];

export interface Mat {
  /** Dark → light. Build one with `ramp()`. */
  ramp: number[];
  /** Specular glint strength (polished metal ~0.6–1, wet stone ~0.3). */
  shine?: number;
  /** Surface noise: luminance amount, and the noise cell size across (gx) and down (gy). Wood: small gx, big gy. */
  grain?: number;
  gx?: number;
  gy?: number;
  /** Self-lit: added to the light (enamel, glowing glass). */
  lum?: number;
}

export interface PointLight {
  x: number;
  y: number;
  /** Height off the picture plane (toward the viewer). */
  z?: number;
  color: number;
  power?: number;
  radius: number;
}

export interface Lighting {
  /** Toward the key light (screen x right, y down, z toward the viewer). */
  key?: N3;
  keyColor?: number;
  keyPower?: number;
  ambient?: number;
  lights?: PointLight[];
  /** Back light catching one side of the silhouette (dx, dy: where it comes from; 0, 0 = all round). */
  rim?: { dx: number; dy: number; color: number; power?: number };
  /** How strongly coloured light tints the ramp (default 0.7). */
  tint?: number;
  /** Ink outline round the silhouette (default true). */
  outline?: boolean;
  /** Darkening where a later part sits on an earlier one (default 0.24). */
  seams?: number;
  /** Chiaroscuro: light falls off from (x, y) to `min` of itself at radius `r` (ry: vertical radius). */
  focus?: { x: number; y: number; r: number; ry?: number; min?: number };
}

export const INK = 0x07060C;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)];

export const FRONT: N3 = [0, 0, 1];
export const UP: N3 = [0, -0.8, 0.6];
export const DOWN: N3 = [0, 0.8, 0.6];
export const LEFT: N3 = [-0.8, 0, 0.6];
export const RIGHT: N3 = [0.8, 0, 0.6];

function hash3(x: number, y: number, s: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Smooth value noise, 0–1, with cells `sx` × `sy` pixels. */
export function vnoise(x: number, y: number, sx: number, sy: number, seed = 0): number {
  const fx = x / sx;
  const fy = y / sy;
  const gx = Math.floor(fx);
  const gy = Math.floor(fy);
  const u = fx - gx;
  const v = fy - gy;
  const a = hash3(gx, gy, seed);
  const b = hash3(gx + 1, gy, seed);
  const c = hash3(gx, gy + 1, seed);
  const d = hash3(gx + 1, gy + 1, seed);
  const su = u * u * (3 - 2 * u);
  const sv = v * v * (3 - 2 * v);
  return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv;
}

/**
 * An `n`-step ramp around a mid colour, hue-shifted: the darks lean toward `shadow` (cold violet), the lights
 * toward `glint` (warm cream).
 */
export function ramp(mid: number, n = 6, shadow = 0x0E0820, glint = 0xFFF1D0, reach = 0.7): number[] {
  const m = 0.55;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    out.push(t <= m ? mix(shadow, mid, 0.2 + 0.8 * (t / m)) : mix(mid, glint, ((t - m) / (1 - m)) * reach));
  }
  return out;
}

type NormalFn = (x: number, y: number) => N3 | null;

export class LitCanvas {
  private readonly mat: Int16Array;
  private readonly nrm: Float32Array;
  private readonly part: Uint16Array;
  private readonly off: Float32Array;
  private readonly emit: Uint32Array;
  private readonly mats: Mat[] = [];
  private partId = 0;
  private grouped = false;

  constructor(readonly w: number, readonly h: number) {
    this.mat = new Int16Array(w * h).fill(-1);
    this.nrm = new Float32Array(w * h * 3);
    this.part = new Uint16Array(w * h);
    this.off = new Float32Array(w * h);
    this.emit = new Uint32Array(w * h);
  }

  /** Registers a material; returns its id for the shape calls. */
  material(m: Mat): number {
    this.mats.push(m);
    return this.mats.length - 1;
  }

  /** Shapes drawn inside `fn` count as one part (no seam shading between them). */
  group(fn: () => void): void {
    this.partId++;
    this.grouped = true;
    try {
      fn();
    } finally {
      this.grouped = false;
    }
  }

  filled(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.mat[y * this.w + x] >= 0;
  }

  set(x: number, y: number, m: number, n: N3, off = 0): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    const len = Math.hypot(n[0], n[1], n[2]) || 1;
    this.mat[i] = m;
    this.nrm[i * 3] = n[0] / len;
    this.nrm[i * 3 + 1] = n[1] / len;
    this.nrm[i * 3 + 2] = n[2] / len;
    this.part[i] = this.partId;
    this.off[i] = off;
    this.emit[i] = 0;
  }

  /** Every pixel in the box whose centre `f` gives a normal for. */
  shape(x0: number, y0: number, x1: number, y1: number, m: number, f: NormalFn, off = 0): void {
    if (!this.grouped) this.partId++;
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(this.h, Math.ceil(y1)); y++) {
      for (let x = Math.max(0, Math.floor(x0)); x < Math.min(this.w, Math.ceil(x1)); x++) {
        const n = f(x + 0.5, y + 0.5);
        if (n) this.set(x, y, m, n, off);
      }
    }
  }

  /** A block with bevelled edges `bevel` px wide. */
  box(x: number, y: number, w: number, h: number, m: number, bevel = 1, off = 0): void {
    this.shape(x, y, x + w, y + h, m, (px, py) => {
      const l = px - x;
      const r = x + w - px;
      const t = py - y;
      const b = y + h - py;
      const e = Math.min(l, r, t, b);
      if (e > bevel) return FRONT;
      if (e === t) return UP;
      if (e === b) return DOWN;
      return e === l ? LEFT : RIGHT;
    }, off);
  }

  /** An upright cylinder (pillar, candle, pipe). */
  cylV(x: number, y: number, w: number, h: number, m: number, off = 0): void {
    this.shape(x, y, x + w, y + h, m, (px) => {
      const u = ((px - x) / w) * 2 - 1;
      return [u * 0.95, 0, Math.sqrt(Math.max(0.05, 1 - u * u))];
    }, off);
  }

  /** A lying cylinder (beam, pipe). */
  cylH(x: number, y: number, w: number, h: number, m: number, off = 0): void {
    this.shape(x, y, x + w, y + h, m, (_px, py) => {
      const v = ((py - y) / h) * 2 - 1;
      return [0, v * 0.95, Math.sqrt(Math.max(0.05, 1 - v * v))];
    }, off);
  }

  /** An ellipse domed by `dome` (1 = a sphere's face, 0 = flat, < 0 = dished). */
  ellipse(cx: number, cy: number, rx: number, ry: number, m: number, dome = 1, off = 0): void {
    this.shape(cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1, m, (px, py) => {
      const dx = (px - cx) / rx;
      const dy = (py - cy) / ry;
      const d2 = dx * dx + dy * dy;
      if (d2 > 1) return null;
      return [dx * dome, dy * dome, Math.sqrt(Math.max(0.05, 1 - d2 * dome * dome))];
    }, off);
  }

  sphere(cx: number, cy: number, r: number, m: number, off = 0): void {
    this.ellipse(cx, cy, r, r, m, 1, off);
  }

  /** A rounded ring (torus seen face-on) between radii r0 and r1; `groove` makes it a cut channel instead. */
  ring(cx: number, cy: number, r0: number, r1: number, m: number, groove = false, squash = 1, off = 0): void {
    this.shape(cx - r1 - 1, cy - r1 * squash - 1, cx + r1 + 1, cy + r1 * squash + 1, m, (px, py) => {
      const dx = px - cx;
      const dy = (py - cy) / squash;
      const d = Math.hypot(dx, dy);
      if (d < r0 || d > r1) return null;
      const s = (((d - r0) / (r1 - r0)) * 2 - 1) * (groove ? -1 : 1);
      const k = Math.sqrt(Math.max(0.05, 1 - s * s));
      return [(dx / (d || 1)) * s, (dy / (d || 1)) * s, k];
    }, off);
  }

  /** A round tube from a to b, `thick` px across (haft, spoke, rope, chain bar). */
  tube(ax: number, ay: number, bx: number, by: number, thick: number, m: number, off = 0): void {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    const len = Math.sqrt(len2);
    const r = thick / 2;
    const px = -dy / len; // across the tube
    const py = dx / len;
    this.shape(Math.min(ax, bx) - r - 1, Math.min(ay, by) - r - 1, Math.max(ax, bx) + r + 1, Math.max(ay, by) + r + 1, m, (x, y) => {
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
      const ox = x - (ax + dx * t);
      const oy = y - (ay + dy * t);
      if (Math.hypot(ox, oy) > r) return null;
      const s = Math.max(-1, Math.min(1, (ox * px + oy * py) / r));
      return [px * s * 0.95, py * s * 0.95, Math.sqrt(Math.max(0.05, 1 - s * s))];
    }, off);
  }

  /** A body of revolution standing on its axis at `cx`: `half(y)` is its half-width on row y (bells, urns, hoods). */
  lathe(cx: number, y0: number, y1: number, half: (y: number) => number, m: number, off = 0): void {
    let maxW = 0;
    for (let y = y0; y <= y1; y++) maxW = Math.max(maxW, half(y));
    this.shape(cx - maxW - 1, y0, cx + maxW + 1, y1, m, (px, py) => {
      const hw = half(py);
      if (hw <= 0) return null;
      const u = (px - cx) / hw;
      if (Math.abs(u) > 1) return null;
      const slope = half(py + 0.5) - half(py - 0.5);
      const phi = Math.atan(slope);
      const c = Math.cos(phi);
      return [u * c, -Math.sin(phi) * 0.9, Math.sqrt(Math.max(0.05, 1 - u * u)) * c];
    }, off);
  }

  /** A flat facet (even-odd fill) facing `n`. */
  poly(pts: number[], m: number, n: N3 = FRONT, off = 0): void {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let i = 0; i < pts.length; i += 2) {
      x0 = Math.min(x0, pts[i]);
      x1 = Math.max(x1, pts[i]);
      y0 = Math.min(y0, pts[i + 1]);
      y1 = Math.max(y1, pts[i + 1]);
    }
    const cnt = pts.length / 2;
    this.shape(x0, y0, x1 + 1, y1 + 1, m, (x, y) => {
      let inside = false;
      for (let i = 0, j = cnt - 1; i < cnt; j = i++) {
        const xi = pts[i * 2];
        const yi = pts[i * 2 + 1];
        const xj = pts[j * 2];
        const yj = pts[j * 2 + 1];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside ? n : null;
    }, off);
  }

  /** Light-emitting pixels: drawn as-is over the lighting. */
  glow(x: number, y: number, color: number): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    if (this.mat[i] < 0) {
      this.partId++;
      this.set(x, y, 0, FRONT);
    }
    this.emit[i] = 0xFF000000 | color;
  }

  glowRect(x: number, y: number, w: number, h: number, color: number): void {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.glow(i, j, color);
  }

  /** Nudges the light on existing pixels (carvings, scuffs, painted detail). */
  shade(x: number, y: number, d: number): void {
    x = Math.round(x);
    y = Math.round(y);
    if (!this.filled(x, y)) return;
    this.off[y * this.w + x] += d;
  }

  /** A carved line: a dark cut with its lower lip catching the light. */
  carve(ax: number, ay: number, bx: number, by: number, depth = 0.35): void {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay))));
    const done = new Set<number>();
    for (let i = 0; i <= n; i++) {
      const x = Math.round(ax + ((bx - ax) * i) / n);
      const y = Math.round(ay + ((by - ay) * i) / n);
      if (done.has(y * this.w + x)) continue;
      done.add(y * this.w + x);
      this.shade(x, y, -depth);
    }
    for (const k of done) {
      const x = k % this.w;
      const y = Math.floor(k / this.w);
      if (!done.has((y + 1) * this.w + x)) this.shade(x, y + 1, depth * 0.45);
    }
  }

  /** Lights the canvas into finished pixels. */
  bake(L: Lighting): Layer {
    const { w, h } = this;
    const out = new Layer(w, h);
    const key = L.key ? norm(L.key) : null;
    const keyPower = L.keyPower ?? 0.85;
    const ambient = L.ambient ?? 0.16;
    const tintK = L.tint ?? 0.7;
    const seams = L.seams ?? 0.24;
    const half = key ? norm([key[0], key[1], key[2] + 1]) : null;
    const lights = L.lights ?? [];
    const rim = L.rim;
    const rx = rim ? Math.sign(rim.dx) : 0;
    const ry = rim ? Math.sign(rim.dy) : 0;
    const idxOf = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : y * w + x);
    const empty = (x: number, y: number) => {
      const i = idxOf(x, y);
      return i < 0 || this.mat[i] < 0;
    };
    const later = (x: number, y: number, p: number) => {
      const i = idxOf(x, y);
      return i >= 0 && this.mat[i] >= 0 && this.part[i] > p;
    };

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const mi = this.mat[i];
        if (mi < 0) continue;
        if (this.emit[i]) {
          out.px[i] = this.emit[i];
          continue;
        }
        const M = this.mats[mi];
        const nx = this.nrm[i * 3];
        const ny = this.nrm[i * 3 + 1];
        const nz = this.nrm[i * 3 + 2];
        let lum = ambient + (M.lum ?? 0) + this.off[i];
        let tr = 0;
        let tg = 0;
        let tb = 0;
        let tw = 0;
        const tint = (c: number, k: number) => {
          tr += ((c >> 16) & 255) * k;
          tg += ((c >> 8) & 255) * k;
          tb += (c & 255) * k;
          tw += k;
        };
        if (key) {
          const d = Math.max(0, nx * key[0] + ny * key[1] + nz * key[2]) * keyPower;
          lum += d;
          if (L.keyColor !== undefined) tint(L.keyColor, d * 0.35);
          if (M.shine && half) {
            const s = Math.max(0, nx * half[0] + ny * half[1] + nz * half[2]);
            lum += Math.pow(s, 48) * M.shine * 1.3;
          }
        }
        for (const p of lights) {
          const vx = p.x - x;
          const vy = p.y - y;
          const vz = p.z ?? 12;
          const d = Math.hypot(vx, vy, vz);
          const att = Math.max(0, 1 - d / p.radius);
          if (att <= 0) continue;
          const lam = Math.max(0, (nx * vx + ny * vy + nz * vz) / d);
          const k = lam * att * att * (p.power ?? 1);
          lum += k;
          tint(p.color, k);
          if (M.shine) {
            const hx = vx / d;
            const hy = vy / d;
            const hz = vz / d + 1;
            const hl = Math.hypot(hx, hy, hz);
            const s = Math.max(0, (nx * hx + ny * hy + nz * hz) / hl);
            const g = Math.pow(s, 18) * M.shine * att * (p.power ?? 1);
            lum += g;
            tint(p.color, g);
          }
        }
        if (L.focus) {
          const f = L.focus;
          const d = Math.min(1, Math.hypot((x - f.x) / f.r, (y - f.y) / (f.ry ?? f.r)));
          lum *= 1 - (1 - (f.min ?? 0.25)) * d * d;
        }
        // Contact shadow: something drawn later touches this pixel, or overhangs it from above
        const p = this.part[i];
        if (later(x - 1, y, p) || later(x + 1, y, p) || later(x, y + 1, p)) lum -= seams;
        else if (later(x, y - 1, p) || later(x - 1, y - 1, p) || later(x, y - 2, p)) lum -= seams * 0.8;
        // Rim light on the silhouette
        if (rim) {
          const edge = rx === 0 && ry === 0
            ? empty(x - 1, y) || empty(x + 1, y) || empty(x, y - 1) || empty(x, y + 1)
            : (rx !== 0 && empty(x + rx, y)) || (ry !== 0 && empty(x, y + ry));
          if (edge) {
            lum += 0.32 * (rim.power ?? 1);
            tint(rim.color, 0.9 * (rim.power ?? 1));
          }
        }
        const R = M.ramp;
        const t = Math.max(0, Math.min(1, lum)) * (R.length - 1);
        const base = Math.floor(t);
        const frac = t - base;
        const thr = Math.abs(frac - 0.5) < 0.08 ? bayer(x, y) : 0.5;
        let ri = Math.min(R.length - 1, base + (frac > thr ? 1 : 0));
        // Grain as solid blotches a tone up or down (not more dither)
        if (M.grain) {
          const g = (vnoise(x, y, M.gx ?? 3, M.gy ?? 3, mi * 31) - 0.5) * 2;
          if (Math.abs(g) > 1 - M.grain * 4) ri = Math.max(0, Math.min(R.length - 1, ri + Math.sign(g)));
        }
        let c = R[ri];
        if (tw > 0.02) {
          const tc = (Math.round(tr / tw) << 16) | (Math.round(tg / tw) << 8) | Math.round(tb / tw);
          let k = Math.min(0.75, tw * tintK) * (0.3 + 0.7 * (ri / (R.length - 1)));
          k = Math.round(k * 4) / 4; // quantized tint: a few clean steps
          if (k > 0) c = mix(c, tc, Math.min(0.75, k));
        }
        out.px[i] = 0xFF000000 | c;
      }
    }

    if (L.outline !== false) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          if (this.mat[i] >= 0) continue;
          let nb = -1;
          for (const [ox, oy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            const j = idxOf(x + ox, y + oy);
            if (j >= 0 && this.mat[j] >= 0) {
              nb = j;
              break;
            }
          }
          if (nb >= 0) out.px[i] = 0xFF000000 | mix(this.mats[this.mat[nb]].ramp[0], INK, 0.6);
        }
      }
    }
    return out;
  }

  texture(L: Lighting): Texture {
    return toTexture(this.bake(L));
  }
}

function norm(v: N3): N3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
