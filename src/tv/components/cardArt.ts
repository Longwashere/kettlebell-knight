/**
 * Procedural pixel-art illustrations for combat cards.
 *
 * Each card template gets a 96x52 scene painted in a 16/32-bit console style: a dithered sky, a
 * silhouetted horizon (ruins, peaks, forest), a central motif with an automatic ink outline and
 * rim lighting, foreground sparks, and a vignette. Paintings are deterministic per templateId,
 * rendered once and cached as PNG data URLs, so the hand costs no network or texture memory.
 *
 * Display the result with `image-rendering: pixelated`.
 */

import { ALL_WEAPON_SPELLS } from '../../types/weaponSpells';

export const CARD_ART_W = 96;
export const CARD_ART_H = 52;
const W = CARD_ART_W;
const H = CARD_ART_H;

export const INK = 0x0F0E17;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)];

// ---------------------------------------------------------------------------------------------
// Pixel buffer

export class Layer {
  readonly px: Uint32Array; // 0 = transparent, else 0xFFrrggbb

  constructor(readonly w = W, readonly h = H) {
    this.px = new Uint32Array(w * h);
  }

  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.px[y * this.w + x];
  }

  set(x: number, y: number, c: number): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[y * this.w + x] = 0xFF000000 | c;
  }

  rect(x: number, y: number, w: number, h: number, c: number): void {
    for (let j = Math.round(y); j < Math.round(y + h); j++) for (let i = Math.round(x); i < Math.round(x + w); i++) this.set(i, j, c);
  }

  disc(cx: number, cy: number, r: number, c: number): void {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) this.set(x, y, c);
      }
    }
  }

  ring(cx: number, cy: number, r: number, c: number, thick = 1): void {
    for (let y = Math.floor(cy - r - thick); y <= Math.ceil(cy + r + thick); y++) {
      for (let x = Math.floor(cx - r - thick); x <= Math.ceil(cx + r + thick); x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d >= r - thick / 2 && d <= r + thick / 2) this.set(x, y, c);
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: number, thick = 1): void {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= steps; i++) {
      const x = x0 + ((x1 - x0) * i) / steps;
      const y = y0 + ((y1 - y0) * i) / steps;
      if (thick <= 1) this.set(x, y, c);
      else this.disc(x, y, thick / 2, c);
    }
  }

  /** Scanline polygon fill (no anti-aliasing). */
  poly(pts: number[], c: number): void {
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 1; i < pts.length; i += 2) {
      minY = Math.min(minY, pts[i]);
      maxY = Math.max(maxY, pts[i]);
    }
    const n = pts.length / 2;
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const sy = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < n; i++) {
        const ax = pts[i * 2];
        const ay = pts[i * 2 + 1];
        const bx = pts[((i + 1) % n) * 2];
        const by = pts[((i + 1) % n) * 2 + 1];
        if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) xs.push(ax + ((sy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, c);
      }
    }
  }

  /** Draws `src` over this layer (opaque pixels win). */
  over(src: Layer): void {
    for (let i = 0; i < this.px.length; i++) if (src.px[i]) this.px[i] = src.px[i];
  }
}

// ---------------------------------------------------------------------------------------------
// Colour helpers

const rgb = (c: number) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
export function mix(a: number, b: number, t: number): number {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

/** Picks a colour from a ramp with ordered dithering between steps. */
function ramp(colors: number[], t: number, x: number, y: number): number {
  const v = Math.max(0, Math.min(0.999, t)) * (colors.length - 1) + bayer(x, y) - 0.5;
  return colors[Math.max(0, Math.min(colors.length - 1, Math.round(v)))];
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// ---------------------------------------------------------------------------------------------
// Scene passes

type Rng = () => number;

/** Sky ramps, top → horizon. */
const SKY = {
  fire: [0x0B0303, 0x2A0707, 0x5C0E0E, 0x9A2A0C, 0xD9590F],
  storm: [0x03050C, 0x0B1222, 0x16253D, 0x27405E, 0x4A6584],
  holy: [0x0F0A03, 0x2B1D06, 0x5E3E0A, 0xA36A12, 0xF2B53A],
  earth: [0x070605, 0x1A1512, 0x33261C, 0x57381D, 0x8A5524],
  arcane: [0x05030B, 0x140A26, 0x2A1052, 0x4C1D95, 0x8B5CF6],
  nature: [0x020805, 0x07180C, 0x0F2E17, 0x1D4D24, 0x4D7C0F],
  water: [0x02040E, 0x061430, 0x0B2A5A, 0x0E5A86, 0x22A3C4],
  shadow: [0x030305, 0x0B0A10, 0x18151F, 0x2A1F2E, 0x4A2335],
  dawn: [0x08030A, 0x220A24, 0x4E1240, 0x9D1F5A, 0xE85A6A],
  steel: [0x050608, 0x10131A, 0x1E2430, 0x323B4C, 0x56637A],
} as const;
type Sky = keyof typeof SKY;

function paintSky(base: Layer, sky: Sky, horizon: number): void {
  const colors = SKY[sky] as unknown as number[];
  for (let y = 0; y < H; y++) {
    const t = Math.min(1, y / horizon);
    for (let x = 0; x < W; x++) base.set(x, y, ramp(colors, t, x, y));
  }
}

function paintStars(base: Layer, rng: Rng, count: number, colors = [0xFFFBEA, 0x9CA3AF, 0xFDE68A]): void {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rng() * W);
    const y = Math.floor(rng() * H * 0.55);
    const c = colors[Math.floor(rng() * colors.length)];
    base.set(x, y, c);
    if (rng() < 0.12) {
      base.set(x - 1, y, mix(c, INK, 0.5));
      base.set(x + 1, y, mix(c, INK, 0.5));
      base.set(x, y - 1, mix(c, INK, 0.5));
      base.set(x, y + 1, mix(c, INK, 0.5));
    }
  }
}

/** Dithered radial light, brightest at the centre. */
export function glow(layer: Layer, cx: number, cy: number, r: number, colors: number[], strength = 1): void {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const t = (1 - Math.hypot(x - cx, (y - cy) * 1.15) / r) * strength;
      if (t <= 0) continue;
      const idx = Math.floor(t * colors.length + bayer(x, y) - 0.5);
      if (idx >= 0) layer.set(x, y, colors[Math.min(colors.length - 1, idx)]);
    }
  }
}

type Horizon = 'peaks' | 'spires' | 'forest' | 'hills' | 'none';

/** Two silhouette ranges: far (tinted toward the sky) and near (near-black). */
function paintHorizon(base: Layer, kind: Horizon, horizon: number, sky: Sky, rng: Rng): void {
  if (kind === 'none') return;
  const skyColors = SKY[sky] as unknown as number[];
  const far = mix(skyColors[1], INK, 0.35);
  const near = mix(skyColors[0], 0x000000, 0.3);
  const ranges = [
    { color: far, base: horizon - 2, amp: kind === 'hills' ? 5 : 9 },
    { color: near, base: horizon + 3, amp: kind === 'hills' ? 3 : 6 },
  ];
  for (const [ri, range] of ranges.entries()) {
    const phase = rng() * 10;
    for (let x = 0; x < W; x++) {
      let top: number;
      if (kind === 'peaks') {
        const v = Math.abs(Math.sin(x * 0.09 + phase)) * 0.6 + Math.abs(Math.sin(x * 0.23 + phase * 2)) * 0.4;
        top = range.base - v * range.amp;
      } else if (kind === 'forest') {
        const tree = Math.abs(((x + Math.floor(phase * 3)) % 7) - 3); // triangular pines
        top = range.base - (6 - tree * 1.6) * (range.amp / 7) - Math.sin(x * 0.3 + phase) * 1.5;
      } else if (kind === 'hills') {
        top = range.base - (Math.sin(x * 0.06 + phase) * 0.5 + 0.5) * range.amp;
      } else {
        top = range.base - (Math.sin(x * 0.11 + phase) * 0.5 + 0.5) * range.amp * 0.4;
      }
      for (let y = Math.round(top); y < H; y++) base.set(x, y, range.color);
    }
    if (kind === 'spires' && ri === 0) {
      // Gothic ruin spires on the far range
      for (let k = 0; k < 4; k++) {
        const sx = Math.floor(rng() * W);
        const sh = 8 + rng() * 14;
        const sw = 2 + Math.floor(rng() * 3);
        base.rect(sx, range.base - sh, sw, sh + 4, range.color);
        base.poly([sx - 1, range.base - sh, sx + sw / 2, range.base - sh - 5, sx + sw + 1, range.base - sh], range.color);
        if (rng() < 0.6) base.set(sx + Math.floor(sw / 2), range.base - sh + 3, 0xF4B41A);
      }
    }
  }
}

/** Rim light (top-left) and core shadow (bottom-right), then a 1px ink outline. */
export function shadeAndOutline(m: Layer, light = 0xFFFBEA, rimAmount = 0.45, shadowAmount = 0.35): void {
  const src = m.px.slice();
  const { w, h } = m;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[y * w + x]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = at(x, y);
      if (c) {
        const col = c & 0xFFFFFF;
        if (!at(x, y - 1) || !at(x - 1, y)) m.set(x, y, mix(col, light, rimAmount));
        else if (!at(x, y + 1) || !at(x + 1, y)) m.set(x, y, mix(col, INK, shadowAmount));
      } else if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) {
        m.set(x, y, INK);
      }
    }
  }
}

function vignette(base: Layer): void {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = Math.abs(x - W / 2) / (W / 2);
      const dy = Math.abs(y - H / 2) / (H / 2);
      const d = Math.max(dx * dx, dy * dy) * 0.9 + (dx * dx + dy * dy) * 0.15;
      if (d > 0.62 && bayer(x, y) < (d - 0.62) * 2.2) {
        const c = base.get(x, y);
        if (c) base.set(x, y, mix(c & 0xFFFFFF, INK, 0.6));
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Motif primitives (draw onto the motif layer; outline/shading happens afterwards)

const STEEL = [0x334155, 0x64748B, 0xA3B1C6, 0xE2E8F0];
const GOLD = [0x78350F, 0xB45309, 0xF59E0B, 0xFDE68A];
const FIRE = [0x7F1D1D, 0xDC2626, 0xF97316, 0xFDE047, 0xFFFBEA];
const BOLT = [0x1E3A8A, 0x38B6FF, 0xBAE6FD, 0xFFFFFF];
const ARC = [0x3B0764, 0x7C3AED, 0xC084FC, 0xF5D0FE];
const LEAF = [0x14532D, 0x3F6212, 0x65A30D, 0xBEF264];
const BARK = [0x2A1A0E, 0x5C2B14, 0x8B5A2B, 0xC08A4E];
const ROCK = [0x1C1917, 0x44403C, 0x78716C, 0xA8A29E];

function sword(m: Layer, x: number, y: number, angle: number, len: number, blade = STEEL, hilt = GOLD): void {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const tipX = x + dx * len;
  const tipY = y + dy * len;
  m.line(x, y, x + dx * (len - 4), y + dy * (len - 4), blade[1], 3);
  m.line(x + dx * (len - 5), y + dy * (len - 5), tipX, tipY, blade[1], 1.6);
  m.line(x + dx * 2, y + dy * 2, x + dx * (len - 4), y + dy * (len - 4), blade[3]); // fuller highlight
  const px = -dy;
  const py = dx;
  m.line(x - px * 6, y - py * 6, x + px * 6, y + py * 6, hilt[2], 2); // crossguard
  m.line(x, y, x - dx * 6, y - dy * 6, BARK[1], 2); // grip
  m.disc(x - dx * 7.5, y - dy * 7.5, 1.6, hilt[2]); // pommel
}

function axe(m: Layer, x: number, y: number, angle: number, len: number): void {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  m.line(x, y, x + dx * len, y + dy * len, BARK[2], 2);
  const hx = x + dx * (len - 5);
  const hy = y + dy * (len - 5);
  const px = -dy;
  const py = dx;
  m.poly([
    hx - dx * 6 + px * 2, hy - dy * 6 + py * 2,
    hx - dx * 9 + px * 13, hy - dy * 9 + py * 13,
    hx + dx * 4 + px * 15, hy + dy * 4 + py * 15,
    hx + dx * 5 + px * 2, hy + dy * 5 + py * 2,
  ], STEEL[1]);
  m.line(hx - dx * 8 + px * 13, hy - dy * 8 + py * 13, hx + dx * 3 + px * 14.5, hy + dy * 3 + py * 14.5, STEEL[3]);
}

function hammer(m: Layer, x: number, y: number, angle: number, len: number): void {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  m.line(x, y, x + dx * len, y + dy * len, BARK[2], 2);
  const hx = x + dx * len;
  const hy = y + dy * len;
  const px = -dy;
  const py = dx;
  m.poly([
    hx - px * 9 - dx * 5, hy - py * 9 - dy * 5, hx + px * 9 - dx * 5, hy + py * 9 - dy * 5,
    hx + px * 9 + dx * 5, hy + py * 9 + dy * 5, hx - px * 9 + dx * 5, hy - py * 9 + dy * 5,
  ], ROCK[2]);
  m.rect(hx - 1, hy - 1, 3, 3, GOLD[2]);
}

function kettlebell(m: Layer, cx: number, cy: number, r: number, body = ROCK[1], handle = ROCK[2]): void {
  m.ring(cx, cy - r * 1.05, r * 0.62, handle, Math.max(2, r * 0.32));
  m.disc(cx, cy, r, body);
  m.rect(cx - r * 0.55, cy + r * 0.75, r * 1.1, r * 0.35, body);
}

/** Heater shield with rim and inner field; returns field centre. */
function shield(m: Layer, cx: number, cy: number, w: number, h: number, rim: number, field: number): void {
  const shape = (s: number) => [
    cx - w * s, cy - h * s, cx + w * s, cy - h * s, cx + w * s, cy + h * 0.15 * s,
    cx + w * 0.55 * s, cy + h * 0.7 * s, cx, cy + h * s, cx - w * 0.55 * s, cy + h * 0.7 * s, cx - w * s, cy + h * 0.15 * s,
  ];
  m.poly(shape(1), rim);
  m.poly(shape(0.78), field);
}

/** Tapered slash crescent. */
function crescent(m: Layer, cx: number, cy: number, r: number, a0: number, a1: number, thick: number, colors: number[]): void {
  const steps = Math.ceil(Math.abs(a1 - a0) * r * 1.5);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = a0 + (a1 - a0) * t;
    const tk = Math.sin(t * Math.PI) * thick;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    m.disc(x, y, tk / 2 + 0.3, colors[1]);
    if (tk > 1.2) m.disc(x, y, tk / 4, colors[colors.length - 1]);
  }
}

function flame(m: Layer, x: number, y: number, h: number, w: number, rng: Rng, colors = FIRE): void {
  const lean = (rng() - 0.5) * w;
  const layers = [[1, colors[1]], [0.7, colors[2]], [0.42, colors[3]]] as const;
  for (const [s, c] of layers) {
    m.poly([
      x - w * s, y,
      x - w * 0.7 * s + lean * 0.3, y - h * 0.45 * s,
      x + lean, y - h * s,
      x + w * 0.6 * s + lean * 0.5, y - h * 0.5 * s,
      x + w * s, y,
      x, y + w * 0.4 * s,
    ], c);
  }
}

function bolt(fx: Layer, x0: number, y0: number, x1: number, y1: number, rng: Rng, colors = BOLT): void {
  const pts: [number, number][] = [[x0, y0]];
  const n = 6;
  for (let i = 1; i < n; i++) {
    pts.push([x0 + ((x1 - x0) * i) / n + (rng() - 0.5) * 9, y0 + ((y1 - y0) * i) / n]);
  }
  pts.push([x1, y1]);
  for (let i = 0; i + 1 < pts.length; i++) {
    fx.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], colors[1], 3);
  }
  for (let i = 0; i + 1 < pts.length; i++) {
    fx.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], colors[3], 1);
  }
}

function spiral(m: Layer, cx: number, cy: number, r: number, turns: number, colors: number[], thick = 3, squash = 1): void {
  const steps = Math.ceil(turns * 80);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * turns * Math.PI * 2;
    const rr = r * t;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr * squash;
    m.disc(x, y, (thick * (0.4 + t * 0.6)) / 2, colors[Math.min(colors.length - 1, Math.floor((1 - t) * colors.length))]);
  }
}

function sparkle(fx: Layer, x: number, y: number, r: number, c: number): void {
  fx.line(x - r, y, x + r, y, c);
  fx.line(x, y - r, x, y + r, c);
  fx.set(x, y, 0xFFFFFF);
}

function sparks(fx: Layer, rng: Rng, n: number, x0: number, y0: number, w: number, h: number, colors: number[]): void {
  for (let i = 0; i < n; i++) {
    const x = x0 + rng() * w;
    const y = y0 + rng() * h;
    const c = colors[Math.floor(rng() * colors.length)];
    fx.set(x, y, c);
    if (rng() < 0.25) fx.set(x + 1, y, c);
  }
}

function wings(m: Layer, cx: number, cy: number, span: number, lift: number, colors: number[]): void {
  for (const side of [-1, 1]) {
    for (let f = 0; f < 5; f++) {
      const len = span * (1 - f * 0.14);
      const ang = -lift + f * 0.22;
      const x1 = cx + side * Math.cos(ang) * len;
      const y1 = cy - Math.sin(ang) * len * 0.8;
      m.poly([cx, cy - 2 + f, x1, y1, x1 - side * 4, y1 + 5, cx, cy + 3 + f], colors[Math.min(colors.length - 1, f % colors.length)]);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Card scenes

interface Scene {
  sky: Sky;
  horizon?: Horizon;
  horizonY?: number;
  stars?: number;
  glow?: { x: number; y: number; r: number; colors: number[]; strength?: number };
  /** Main subject: shaded and outlined. */
  motif?: (m: Layer, rng: Rng) => void;
  /** Unshaded light effects drawn over the motif (bolts, sparks, beams). */
  fx?: (fx: Layer, rng: Rng) => void;
  /** Painted straight onto the background before the horizon (beams behind ruins, etc.). */
  backdrop?: (b: Layer, rng: Rng) => void;
}

const SCENES: Record<string, Scene> = {
  // MONSTER ARTS: each card shows the creature's signature
  art_echo_shriek: {
    sky: 'arcane', horizon: 'spires', stars: 14,
    motif: (m) => kettlebell(m, 20, 30, 7),
    fx: (fx) => {
      for (let k = 0; k < 4; k++) for (let a = -0.6; a <= 0.6; a += 0.02) fx.set(20 + Math.cos(a) * (16 + k * 12), 28 + Math.sin(a) * (16 + k * 12), k % 2 ? 0xF5F3FF : 0xA78BFA);
      for (const [x, y] of [[54, 12], [66, 22], [78, 10], [70, 34], [86, 26]]) {
        fx.poly([x, y, x - 5, y - 3, x - 3, y + 1], 0x1E1B4B);
        fx.poly([x, y, x + 5, y - 3, x + 3, y + 1], 0x1E1B4B);
        fx.set(x, y, 0xF87171);
      }
    },
  },
  art_dirty_trick: {
    sky: 'earth', horizon: 'forest', stars: 4,
    motif: (m) => {
      m.poly([20, 46, 22, 30, 34, 30, 36, 40, 44, 42, 44, 46], 0x5C2B14); // boot
      m.rect(20, 44, 24, 3, 0x2A1A0E);
    },
    fx: (fx, rng) => {
      sparks(fx, rng, 40, 44, 14, 40, 24, [0x8B5A2B, 0xA16207, 0x5C2B14, 0xD6D3D1]);
      fx.disc(78, 14, 6, 0xFFFBEA);
      fx.rect(77, 9, 3, 6, INK);
      fx.set(78, 17, INK);
    },
  },
  art_rattle_back: {
    sky: 'steel', horizon: 'spires', stars: 10,
    motif: (m) => {
      m.disc(48, 16, 7, 0xD97706); // helm
      m.rect(43, 15, 10, 2, INK);
      shield(m, 30, 34, 8, 10, 0xB45309, 0x78350F);
      kettlebell(m, 66, 38, 6);
      for (const [x0, y0, x1, y1] of [[40, 44, 52, 40], [54, 46, 62, 48], [44, 30, 54, 32]]) m.line(x0, y0, x1, y1, 0xE2E8F0, 2);
    },
    fx: (fx, rng) => sparks(fx, rng, 14, 24, 8, 50, 40, [0xFFFFFF, 0xE2E8F0]),
  },
  art_wisp_lure: {
    sky: 'storm', horizon: 'forest', stars: 18,
    glow: { x: 62, y: 22, r: 18, colors: [0x0B2A3A, 0x0E5A6A, 0x22A3C4] },
    fx: (fx, rng) => {
      for (let i = 0; i < 18; i++) fx.set(16 + i * 2.5, 40 - Math.sin(i * 0.4) * 10 - i, 0xA5F3FC);
      fx.disc(62, 22, 6, 0x67E8F9);
      fx.disc(62, 22, 3, 0xFFFFFF);
      fx.rect(60, 20, 1, 3, INK);
      fx.rect(64, 20, 1, 3, INK);
      sparks(fx, rng, 8, 50, 10, 24, 20, [0xFFFFFF, 0xA5F3FC]);
    },
  },
  art_banshee_step: {
    sky: 'storm', horizon: 'spires', stars: 12,
    motif: (m) => {
      m.poly([40, 10, 52, 10, 58, 44, 50, 38, 46, 46, 42, 38, 34, 44], 0x7DD3FC);
      m.rect(42, 16, 2, 3, INK);
      m.rect(48, 16, 2, 3, INK);
      m.poly([44, 24, 48, 24, 46, 30], INK); // wailing mouth
    },
    fx: (fx) => {
      for (let k = 0; k < 3; k++) for (let y = 14; y < 44; y += 2) fx.set(24 - k * 6, y, k ? 0x38BDF8 : 0xBAE6FD);
    },
  },
  art_bone_volley: {
    sky: 'dawn', horizon: 'spires', stars: 8,
    fx: (fx) => {
      for (const [x, y] of [[30, 12], [48, 6], [66, 14]]) {
        fx.line(x - 8, y - 14, x, y + 14, 0xE2E8F0, 2);
        fx.poly([x - 2, y + 12, x + 3, y + 12, x + 2, y + 20], 0xFFFFFF);
        fx.line(x - 10, y - 18, x - 6, y - 12, 0x94A3B8);
      }
      for (const x of [30, 48, 66]) fx.line(x - 6, 50, x + 6, 50, 0xF87171);
    },
  },
  art_carapace_roll: {
    sky: 'nature', horizon: 'hills', stars: 4,
    motif: (m) => {
      m.disc(56, 32, 14, 0x1A2E05);
      m.ring(56, 32, 8, 0x4D7C0F, 2);
      for (let k = 0; k < 4; k++) m.line(56, 32, 56 + Math.cos(k * 1.57 + 0.4) * 14, 32 + Math.sin(k * 1.57 + 0.4) * 14, 0x4D7C0F, 2);
    },
    fx: (fx, rng) => {
      for (let i = 0; i < 4; i++) fx.line(8, 26 + i * 4, 36, 26 + i * 4, 0xD9F99D);
      sparks(fx, rng, 10, 36, 44, 30, 6, [0xA8A29E, 0x78716C]);
    },
  },
  art_undertow: {
    sky: 'water', horizon: 'none', stars: 10,
    motif: (m) => {
      m.poly([96, 52, 70, 30, 56, 8, 36, 4, 22, 14, 34, 18, 44, 20, 50, 52], 0x0F766E);
      m.poly([90, 52, 66, 32, 54, 14, 46, 22, 56, 52], 0x14B8A6);
    },
    fx: (fx, rng) => {
      for (let i = 0; i < 12; i++) fx.disc(24 + i * 3, 12 - Math.sin(i * 0.3) * 6, 1.5, 0xF0FDFA);
      sparks(fx, rng, 16, 10, 2, 50, 20, [0xF0FDFA, 0x5EEAD4]);
    },
  },
  art_tombstone_heave: {
    sky: 'shadow', horizon: 'spires', stars: 10,
    motif: (m) => {
      m.poly([40, 40, 40, 14, 46, 8, 58, 8, 64, 14, 64, 40], 0x57534E);
      m.rect(51, 14, 3, 18, 0x292524);
      m.rect(45, 19, 15, 3, 0x292524);
    },
    fx: (fx, rng) => {
      for (const side of [-1, 1]) fx.line(52 + side * 14, 44, 52 + side * 24, 34, 0xA8A29E);
      sparks(fx, rng, 16, 30, 40, 44, 10, [0x78716C, 0x5C2B14, 0x84A98C]);
    },
  },
  art_troll_blood: {
    sky: 'nature', horizon: 'forest', stars: 4,
    motif: (m) => {
      m.line(30, 48, 58, 14, BARK[1], 5); // knotted club
      m.disc(60, 12, 9, BARK[2]);
      m.disc(55, 9, 3, BARK[1]);
      m.disc(64, 16, 3, BARK[1]);
    },
    fx: (fx, rng) => {
      for (const [x, y] of [[24, 20], [76, 30], [70, 42]]) {
        fx.rect(x - 1, y - 4, 3, 9, 0x84CC16);
        fx.rect(x - 4, y - 1, 9, 3, 0x84CC16);
      }
      sparks(fx, rng, 14, 14, 10, 70, 36, [0xBEF264, 0xECFCCB]);
    },
  },
  art_needle_burst: {
    sky: 'nature', horizon: 'hills', stars: 6,
    motif: (m) => {
      for (const [x, h] of [[16, 24], [30, 36], [44, 28], [58, 40], [72, 30], [84, 22]]) m.poly([x - 5, 52, x, 52 - h, x + 5, 52], 0x166534);
    },
    fx: (fx) => {
      for (const [x, h] of [[16, 24], [30, 36], [44, 28], [58, 40], [72, 30], [84, 22]]) fx.set(x, 52 - h, 0xFEF3C7);
    },
  },
  art_pincer_crack: {
    sky: 'water', horizon: 'none', stars: 6,
    motif: (m) => {
      m.poly([80, 26, 60, 10, 26, 6, 18, 14, 44, 18, 62, 26], 0xEA580C);
      m.poly([80, 28, 60, 44, 26, 48, 18, 40, 44, 36, 62, 28], 0xC2410C);
      m.disc(80, 27, 7, 0x9A3412);
    },
    fx: (fx) => {
      fx.line(30, 22, 36, 28, 0xFFFFFF);
      fx.line(36, 28, 32, 34, 0xFFFFFF);
      fx.line(36, 28, 42, 30, 0xFFFFFF);
    },
  },
  art_tail_sweep: {
    sky: 'nature', horizon: 'hills', stars: 4,
    fx: (fx) => {
      for (let i = 0; i < 40; i++) {
        const t = i / 40;
        fx.disc(14 + t * 74, 40 - Math.sin(t * Math.PI) * 18, 6 * (1 - t) + 1, 0x059669);
        if (i % 4 === 0) fx.set(14 + t * 74, 38 - Math.sin(t * Math.PI) * 18, 0xD1FAE5);
      }
    },
  },
  art_berserker_rush: {
    sky: 'fire', horizon: 'peaks', stars: 4,
    motif: (m) => {
      axe(m, 24, 46, -1.1, 34);
      axe(m, 72, 46, -2.04, 34);
    },
    fx: (fx, rng) => {
      crescent(fx, 48, 26, 24, -2.8, -0.3, 4, [0, 0xDC2626, 0xFEE2E2]);
      sparks(fx, rng, 16, 30, 6, 40, 30, [0xFEE2E2, 0xDC2626]);
    },
  },
  art_moonlit_leap: {
    sky: 'storm', horizon: 'forest', stars: 24,
    glow: { x: 70, y: 14, r: 14, colors: [0x16253D, 0x4A6584, 0xC7D2FE] },
    motif: (m) => {
      m.disc(70, 14, 8, 0xE0E7FF);
      m.poly([20, 40, 26, 30, 42, 30, 46, 36, 42, 40], 0xC7D2FE); // stag body
      m.line(44, 32, 50, 22, 0xC7D2FE, 3);
      m.line(48, 20, 44, 10, 0xEEF2FF);
      m.line(50, 20, 56, 10, 0xEEF2FF);
      for (const x of [24, 28, 38, 42]) m.line(x, 40, x, 48, 0xC7D2FE);
    },
    fx: (fx) => {
      for (let i = 0; i < 10; i++) fx.set(50 + i * 3, 20 - Math.sin(i * 0.35) * 10, 0xFFFFFF);
    },
  },
  art_stone_skin: {
    sky: 'steel', horizon: 'spires', stars: 8,
    motif: (m) => {
      m.rect(32, 44, 32, 6, ROCK[1]); // pedestal
      m.poly([38, 44, 36, 22, 42, 12, 54, 12, 60, 22, 58, 44], ROCK[2]);
      m.disc(48, 10, 6, ROCK[2]);
      m.poly([36, 22, 22, 12, 30, 26], ROCK[1]); // stone wings
      m.poly([60, 22, 74, 12, 66, 26], ROCK[1]);
    },
    fx: (fx, rng) => {
      fx.line(44, 20, 50, 30, 0x1C1917);
      fx.line(50, 30, 46, 40, 0x1C1917);
      sparks(fx, rng, 10, 24, 10, 48, 30, [0xFDE68A, 0xFFFFFF]);
    },
  },
  art_black_riposte: {
    sky: 'shadow', horizon: 'spires', stars: 14,
    motif: (m) => sword(m, 30, 44, -0.5, 40, [0x1F1D2B, 0x3F3B52, 0x7C3AED, 0xEDE9FE], [0x2E1065, 0x4C1D95, 0x7C3AED, 0xC4B5FD]),
    fx: (fx) => {
      fx.line(70, 8, 90, 44, 0xEDE9FE, 2);
      fx.line(71, 8, 91, 44, 0x7C3AED);
      for (let i = 0; i < 6; i++) fx.disc(16 + i * 4, 30 + (i % 2) * 4, 2, 0x4C1D95);
    },
  },
  art_life_leech: {
    sky: 'dawn', horizon: 'none', stars: 8,
    fx: (fx) => {
      for (let i = 0; i <= 60; i++) {
        const x = 14 + i * 1.15;
        const y = 28 + Math.sin(i * 0.3) * 4;
        fx.set(x, y, 0xBE123C);
        fx.set(x, y + 1, 0x3F0412);
      }
      for (const x of [30, 52, 70]) {
        fx.disc(x, 28 + Math.sin((x - 14) / 1.15 * 0.3) * 4, 3, 0xBE123C);
        fx.set(x - 1, 27, 0xFFE4E6);
      }
      fx.ring(84, 28, 6, 0xFDA4AF, 1);
    },
  },
  art_grizzly_maul: {
    sky: 'earth', horizon: 'forest', stars: 6,
    motif: (m) => {
      m.disc(48, 22, 12, 0x92400E);
      m.disc(38, 12, 4, 0x92400E);
      m.disc(58, 12, 4, 0x92400E);
      m.disc(48, 27, 5, 0xB45309);
      m.rect(43, 19, 2, 2, INK);
      m.rect(51, 19, 2, 2, INK);
    },
    fx: (fx) => {
      for (let k = 0; k < 3; k++) fx.line(24 + k * 8, 30, 36 + k * 8, 50, 0xFDE68A, 2);
      for (let k = 0; k < 3; k++) fx.line(56 + k * 8, 30, 68 + k * 8, 50, 0xFDE68A, 2);
    },
  },
  art_phantom_cavalry: {
    sky: 'storm', horizon: 'spires', stars: 20,
    motif: (m) => {
      m.poly([20, 34, 28, 26, 56, 26, 64, 32, 58, 38, 26, 38], 0x1E3A8A); // horse
      m.poly([62, 28, 72, 18, 80, 20, 74, 26, 66, 32], 0x1E3A8A);
      for (const [x, dx] of [[28, -6], [34, 4], [52, -4], [58, 6]]) m.line(x, 38, x + dx, 48, 0xBFDBFE, 2);
      m.poly([38, 26, 46, 26, 44, 14, 40, 14], 0x1E3A8A); // rider
      m.disc(42, 11, 3, 0x1E3A8A);
    },
    fx: (fx, rng) => {
      fx.line(40, 18, 92, 16, 0xEFF6FF);
      for (let i = 0; i < 4; i++) fx.line(2, 26 + i * 4, 16, 26 + i * 4, 0x93C5FD);
      sparks(fx, rng, 10, 20, 44, 50, 6, [0x60A5FA, 0xBFDBFE]);
    },
  },

  // STARTER: plain iron and stone under grey skies, nothing magical
  starter_swing: {
    sky: 'steel', horizon: 'hills', stars: 6,
    motif: (m) => kettlebell(m, 56, 28, 9),
    fx: (fx, rng) => {
      crescent(fx, 44, 34, 20, 2.6, 4.9, 3, [0, 0xCBD5E1, 0xF8FAFC]);
      sparks(fx, rng, 6, 60, 18, 14, 18, [0xFFFBEA, 0xCBD5E1]);
    },
  },
  starter_sweep: {
    sky: 'steel', horizon: 'hills', stars: 4,
    motif: (m) => kettlebell(m, 20, 38, 7),
    fx: (fx, rng) => {
      for (let x = 26; x < 92; x++) fx.set(x, 42 - Math.sin(((x - 26) / 66) * Math.PI) * 6, x % 3 ? 0xCBD5E1 : 0xF8FAFC);
      for (let x = 30; x < 90; x += 2) fx.set(x, 44 - Math.sin(((x - 30) / 60) * Math.PI) * 5, 0x94A3B8);
      sparks(fx, rng, 12, 30, 40, 60, 10, [0xA8A29E, 0x78716C]);
    },
  },
  starter_check: {
    sky: 'earth', horizon: 'hills', stars: 4,
    motif: (m) => {
      shield(m, 40, 26, 14, 18, 0x94A3B8, 0x475569);
      m.rect(38, 14, 4, 22, 0xA3B1C6);
    },
    fx: (fx, rng) => {
      for (let i = 0; i < 4; i++) fx.line(4, 18 + i * 6, 20, 18 + i * 6, 0xCBD5E1);
      sparkle(fx, 60, 16, 3, 0xFFFBEA);
      sparkle(fx, 66, 24, 2, 0xFDE68A);
      sparkle(fx, 58, 30, 2, 0xFFFBEA);
      sparks(fx, rng, 8, 54, 10, 20, 26, [0xFFFBEA, 0xCBD5E1]);
    },
  },
  starter_brace: {
    sky: 'steel', horizon: 'spires', stars: 6,
    motif: (m) => {
      m.rect(10, 44, 76, 8, ROCK[1]); // the ground he plants into
      shield(m, 48, 26, 16, 20, 0x78716C, 0x44403C);
      m.rect(46, 12, 4, 26, 0xA8A29E);
      m.rect(38, 20, 20, 4, 0xA8A29E);
    },
    fx: (fx, rng) => sparks(fx, rng, 10, 16, 40, 64, 6, [0xA8A29E, 0x78716C, 0xD6D3D1]),
  },
  starter_chop: {
    // Head Crack: the bell plunging straight down onto the ground, speed lines above, dust bursting out
    sky: 'steel', horizon: 'peaks', stars: 8,
    motif: (m) => {
      m.rect(6, 46, 84, 6, ROCK[1]);
      kettlebell(m, 48, 32, 9);
    },
    fx: (fx, rng) => {
      for (const [x, top, len] of [[38, 2, 16], [44, 0, 12], [52, 1, 14], [58, 4, 12]]) {
        for (let y = top; y < top + len; y++) fx.set(x, y, y % 3 ? 0xCBD5E1 : 0xF8FAFC);
      }
      for (const side of [-1, 1]) {
        for (let i = 0; i < 4; i++) fx.line(48 + side * (14 + i * 5), 46 - i, 48 + side * (18 + i * 6), 40 - i * 2, i % 2 ? 0xA8A29E : 0xD6D3D1);
      }
      fx.line(28, 47, 68, 47, 0x1C1917);
      sparks(fx, rng, 14, 20, 34, 56, 12, [0xA8A29E, 0x78716C, 0xD6D3D1]);
    },
  },
  starter_lob: {
    sky: 'earth', horizon: 'hills', stars: 10,
    motif: (m) => m.poly([66, 10, 74, 8, 79, 14, 76, 21, 68, 22, 63, 16], ROCK[2]),
    fx: (fx) => {
      for (let i = 0; i < 14; i++) {
        const t = i / 14;
        fx.set(10 + 52 * t, 44 - Math.sin(t * Math.PI * 0.85) * 34, i % 2 ? 0xA8A29E : 0xD6D3D1);
      }
    },
  },
  starter_stance: {
    sky: 'earth', horizon: 'forest', stars: 4,
    motif: (m) => {
      m.rect(8, 46, 80, 6, ROCK[1]);
      kettlebell(m, 48, 38, 8);
      m.line(36, 18, 44, 30, BARK[1], 3); // two gripping arms
      m.line(60, 18, 52, 30, BARK[1], 3);
    },
    fx: (fx, rng) => {
      for (let i = 0; i < 5; i++) fx.set(46 + i * 2, 12 - (i % 2), 0xF8FAFC); // a breath
      sparks(fx, rng, 6, 24, 42, 48, 6, [0xA8A29E]);
    },
  },
  starter_haul: {
    sky: 'steel', horizon: 'hills', stars: 6,
    motif: (m) => {
      kettlebell(m, 30, 30, 7);
      kettlebell(m, 66, 30, 7);
    },
    fx: (fx, rng) => {
      crescent(fx, 30, 30, 15, -1.2, 1.2, 2.5, [0, 0xCBD5E1, 0xF8FAFC]);
      crescent(fx, 66, 30, 15, 1.9, 4.3, 2.5, [0, 0xCBD5E1, 0xF8FAFC]);
      sparks(fx, rng, 8, 40, 16, 16, 28, [0xFFFBEA, 0xCBD5E1]);
    },
  },
  starter_hippop: {
    sky: 'steel', horizon: 'spires', stars: 6,
    motif: (m) => kettlebell(m, 46, 20, 8),
    fx: (fx, rng) => {
      for (let i = 0; i < 4; i++) fx.line(40 + i * 4, 48, 42 + i * 4, 34, i % 2 ? 0x94A3B8 : 0xCBD5E1);
      sparkle(fx, 56, 10, 3, 0xFFFBEA);
      sparks(fx, rng, 8, 50, 4, 20, 16, [0xFFFBEA, 0xFDE68A]);
    },
  },
  starter_wind: {
    sky: 'steel', horizon: 'hills', stars: 12,
    motif: (m) => kettlebell(m, 66, 22, 6),
    fx: (fx, rng) => {
      for (let i = 0; i < 90; i++) {
        const a = (i / 90) * Math.PI * 1.7 + 0.4;
        fx.set(48 + Math.cos(a) * 22, 24 + Math.sin(a) * 8, i % 3 ? 0xCBD5E1 : 0xF8FAFC);
      }
      sparks(fx, rng, 10, 30, 30, 36, 16, [0xF8FAFC, 0xE5E7EB, 0xBBF7D0]);
    },
  },

  // SWING
  swing_cleave: {
    sky: 'steel', horizon: 'spires', stars: 10,
    glow: { x: 52, y: 26, r: 30, colors: [0x3A2A10, 0x6B4A12, 0xB4790F] },
    motif: (m) => sword(m, 30, 40, -0.62, 46),
    fx: (fx, rng) => {
      crescent(fx, 46, 30, 24, -2.6, 0.3, 4, [0, 0xF4B41A, 0xFDE68A, 0xFFFBEA]);
      sparks(fx, rng, 14, 56, 10, 30, 30, [0xFDE68A, 0xF4B41A, 0xFFFBEA]);
    },
  },
  swing_whirlwind: {
    sky: 'fire', horizon: 'peaks',
    glow: { x: 48, y: 30, r: 28, colors: [0x5C0E0E, 0x9A2A0C, 0xD9590F] },
    motif: (m) => {
      // Fire tornado: stacked elliptical bands widening toward the sky
      for (let y = 48; y >= 4; y -= 2) {
        const t = (48 - y) / 44;
        const cx = 48 + Math.sin(t * 5) * 5 * t;
        const rx = 3 + t * 20;
        const ry = 1.5 + t * 2.5;
        const c = [0xFDE047, 0xF97316, 0xDC2626, 0x7F1D1D][Math.floor(((48 - y) / 2) % 4)];
        for (let a = 0; a < Math.PI * 2; a += 0.08) m.set(cx + Math.cos(a) * rx, y + Math.sin(a) * ry, c);
        m.line(cx - rx, y, cx + rx, y, mix(c, 0x7F1D1D, 0.4));
      }
    },
    fx: (fx, rng) => {
      for (let i = 0; i < 4; i++) {
        const y = 10 + i * 9;
        const t = (48 - y) / 44;
        fx.line(48 - 20 * t, y + 1, 48 + 20 * t, y - 1, 0xFFFBEA);
      }
      sparks(fx, rng, 28, 14, 2, 68, 46, FIRE.slice(2));
    },
  },
  swing_flow: {
    sky: 'water', horizon: 'hills', stars: 14,
    glow: { x: 44, y: 22, r: 20, colors: [0x0B2A5A, 0x0E5A86] },
    motif: (m) => {
      crescent(m, 40, 34, 18, 3.4, 6.3, 7, [0, 0x0E7490, 0x38B6FF]);
      crescent(m, 58, 38, 12, 3.4, 6.0, 5, [0, 0x0E7490, 0x38B6FF]);
      kettlebell(m, 70, 22, 6, 0x1E3A8A, 0x38B6FF);
    },
    fx: (fx, rng) => sparks(fx, rng, 18, 22, 14, 52, 26, [0xBAE6FD, 0xFFFFFF, 0x38B6FF]),
  },

  // SQUAT
  squat_slam: {
    sky: 'earth', horizon: 'peaks',
    glow: { x: 48, y: 44, r: 26, colors: [0x57381D, 0x9A3412, 0xF97316] },
    motif: (m) => {
      hammer(m, 64, 6, 2.1, 30);
      for (const [x, y, r] of [[24, 30, 3], [70, 26, 4], [80, 36, 2.5], [18, 40, 2]]) m.disc(x, y, r, ROCK[2]);
    },
    fx: (fx, rng) => {
      for (let i = 0; i < 6; i++) {
        const a = Math.PI + (i / 5) * Math.PI;
        fx.line(48, 46, 48 + Math.cos(a) * 26, 46 + Math.sin(a) * 6, i % 2 ? 0xF97316 : 0xFDE047, 1);
      }
      sparks(fx, rng, 16, 30, 30, 36, 16, [0xFDE047, 0xF97316, 0xA8A29E]);
    },
  },
  squat_bastion: {
    sky: 'nature', horizon: 'spires',
    glow: { x: 48, y: 26, r: 30, colors: [0x0F2E17, 0x1D4D24, 0x3F7A2A, 0x86C440] },
    motif: (m) => {
      shield(m, 48, 26, 16, 20, 0x94A3B8, 0x14532D);
      m.rect(42, 18, 12, 14, 0xA8A29E); // tower emblem
      for (let i = 0; i < 3; i++) m.rect(42 + i * 5, 15, 2, 3, 0xA8A29E);
      m.rect(46, 26, 4, 6, 0x0F0E17);
    },
    fx: (fx, rng) => {
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + (i - 3.5) * 0.35;
        fx.line(48 + Math.cos(a) * 24, 26 + Math.sin(a) * 24, 48 + Math.cos(a) * 30, 26 + Math.sin(a) * 30, 0xBEF264);
      }
      sparks(fx, rng, 8, 20, 6, 56, 30, [0xBEF264, 0xFFFBEA]);
    },
  },
  squat_earthquake: {
    sky: 'arcane', horizon: 'peaks', stars: 8,
    backdrop: (b) => glow(b, 48, 50, 30, [0x4C1D95, 0x7C3AED, 0xC084FC]),
    motif: (m, rng) => {
      // Ground plates tilting apart on either side of the chasm
      m.poly([0, 52, 0, 40, 30, 36, 42, 40, 40, 52], ROCK[1]);
      m.poly([96, 52, 96, 38, 66, 34, 54, 39, 56, 52], ROCK[1]);
      for (let i = 0; i < 6; i++) {
        const x = 18 + i * 12 + rng() * 4;
        const y = 8 + rng() * 20;
        const r = 2 + rng() * 3;
        m.poly([x - r, y, x - r * 0.4, y - r, x + r, y - r * 0.6, x + r * 0.8, y + r * 0.8, x - r * 0.5, y + r], ROCK[1 + (i % 2)]);
      }
    },
    fx: (fx, rng) => {
      for (let y = 30; y < 52; y++) {
        const w = (y - 30) * 0.35 + 1;
        const x = 48 + Math.sin(y * 0.6) * 2;
        for (let i = -w; i <= w; i++) fx.set(x + i, y, Math.abs(i) < w * 0.4 ? 0xF5D0FE : 0xA855F7);
      }
      for (let i = 0; i < 10; i++) fx.line(48 + (rng() - 0.5) * 6, 44, 48 + (rng() - 0.5) * 40, 6 + rng() * 20, 0x7C3AED);
      sparks(fx, rng, 18, 24, 6, 48, 40, [0xF5D0FE, 0xC084FC]);
    },
  },

  // OVERHEAD PRESS
  press_smite: {
    sky: 'storm', horizon: 'spires',
    backdrop: (b, rng) => {
      for (let i = 0; i < 26; i++) b.disc(rng() * W, 4 + rng() * 8, 4 + rng() * 5, i % 3 ? 0x16253D : 0x27405E);
    },
    motif: (m) => sword(m, 52, 48, -1.57, 34),
    fx: (fx, rng) => {
      bolt(fx, 40, 0, 52, 14, rng);
      glow(fx, 52, 14, 7, [0x38B6FF, 0xBAE6FD, 0xFFFFFF]);
      sparks(fx, rng, 12, 40, 8, 26, 20, [0xBAE6FD, 0xFFFFFF]);
    },
  },
  press_judgement: {
    sky: 'holy', horizon: 'spires',
    backdrop: (b) => {
      for (let y = 0; y < H; y++) {
        for (let x = 36; x < 60; x++) {
          const t = 1 - Math.abs(x - 48) / 12;
          if (bayer(x, y) < t) b.set(x, y, t > 0.7 ? 0xFFFBEA : t > 0.4 ? 0xFDE68A : 0xF59E0B);
        }
      }
    },
    motif: (m) => {
      // Storm clouds parting around the beam
      for (const [x, y, w] of [[0, 7, 30], [14, 12, 20], [62, 6, 34], [70, 12, 26]]) {
        m.rect(x, y, w, 4, 0x3B2A10);
        m.rect(x + 3, y - 2, w - 9, 2, 0x3B2A10);
        m.rect(x + 7, y - 3, w - 18, 1, 0x3B2A10);
      }
      m.rect(44, 40, 8, 8, ROCK[2]); // altar
      m.rect(41, 46, 14, 4, ROCK[2]);
    },
    fx: (fx, rng) => sparks(fx, rng, 24, 34, 4, 28, 44, [0xFFFBEA, 0xFDE68A, 0xFFFFFF]),
  },
  press_sanctuary: {
    sky: 'water', horizon: 'none', stars: 26,
    glow: { x: 48, y: 16, r: 22, colors: [0x0B2A5A, 0x1E40AF, 0x60A5FA] },
    motif: (m) => {
      m.line(48, 50, 48, 20, GOLD[1], 3);
      m.ring(48, 15, 6, GOLD[2], 2);
      m.disc(48, 15, 4, 0x60A5FA);
      m.poly([44, 22, 48, 26, 52, 22], GOLD[2]);
    },
    fx: (fx, rng) => {
      fx.ring(48, 15, 14, 0x60A5FA, 1);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        fx.rect(48 + Math.cos(a) * 14 - 1, 15 + Math.sin(a) * 14 - 1, 2, 2, 0xBAE6FD);
      }
      sparkle(fx, 48, 15, 3, 0xFFFFFF);
      sparks(fx, rng, 10, 26, 4, 44, 30, [0xBAE6FD, 0x60A5FA]);
    },
  },

  // CLEAN & PRESS
  clean_breaker: {
    sky: 'fire', horizon: 'none',
    glow: { x: 48, y: 30, r: 30, colors: [0x2A0707, 0x5C0E0E, 0x9A2A0C] },
    motif: (m) => {
      m.poly([26, 34, 70, 34, 66, 40, 56, 40, 60, 50, 36, 50, 40, 40, 30, 40], ROCK[1]); // anvil
      m.rect(20, 32, 10, 3, ROCK[1]);
      kettlebell(m, 58, 16, 8, ROCK[1], ROCK[2]);
    },
    fx: (fx, rng) => {
      glow(fx, 52, 33, 8, [0xF97316, 0xFDE047, 0xFFFBEA]);
      for (let i = 0; i < 14; i++) {
        const a = -Math.PI + rng() * Math.PI;
        const r = 6 + rng() * 16;
        fx.line(52, 32, 52 + Math.cos(a) * r, 32 + Math.sin(a) * r * 0.7, i % 2 ? 0xFDE047 : 0xF97316);
      }
    },
  },
  clean_stormbreaker: {
    sky: 'storm', horizon: 'peaks',
    backdrop: (b, rng) => {
      for (let i = 0; i < 20; i++) b.disc(rng() * W, 2 + rng() * 10, 4 + rng() * 5, 0x16253D);
    },
    motif: (m) => axe(m, 26, 48, -0.95, 40),
    fx: (fx, rng) => {
      bolt(fx, 70, 0, 52, 18, rng);
      bolt(fx, 54, 16, 80, 40, rng);
      sparks(fx, rng, 16, 40, 6, 40, 30, [0xBAE6FD, 0xFFFFFF, 0xF97316]);
    },
  },

  // SNATCH
  snatch_phoenix: {
    sky: 'fire', horizon: 'peaks', stars: 6,
    glow: { x: 48, y: 26, r: 26, colors: [0x5C0E0E, 0x9A2A0C, 0xD9590F, 0xF97316] },
    motif: (m) => {
      wings(m, 48, 26, 34, 0.55, [0xDC2626, 0xF97316, 0xFBBF24, 0xF97316, 0xDC2626]);
      m.disc(48, 24, 4, 0xFBBF24);
      m.poly([46, 20, 48, 14, 51, 19], 0xF97316);
      m.poly([45, 28, 48, 46, 51, 28], 0xDC2626);
    },
    fx: (fx, rng) => {
      fx.set(49, 21, 0x0F0E17);
      sparks(fx, rng, 26, 14, 10, 68, 40, FIRE.slice(2));
    },
  },
  snatch_solar: {
    sky: 'dawn', horizon: 'peaks',
    backdrop: (b) => {
      glow(b, 48, 24, 24, [0x9D1F5A, 0xD9590F, 0xF59E0B]);
      b.disc(48, 24, 13, 0xFDE68A);
      b.disc(48, 24, 10, 0xFFFBEA);
    },
    motif: (m) => {
      const c = 0x1A0F14;
      m.poly([48, 22, 14, 12, 22, 20, 10, 22, 26, 26, 42, 28], c); // left wing
      m.poly([48, 22, 82, 12, 74, 20, 86, 22, 70, 26, 54, 28], c); // right wing
      m.poly([44, 22, 52, 22, 54, 34, 48, 40, 42, 34], c); // body
      m.poly([45, 20, 48, 15, 51, 20], c); // head
      m.poly([46, 40, 44, 46, 48, 42, 52, 46, 50, 40], c); // talons
    },
    fx: (fx) => fx.set(49, 18, 0xF59E0B),
  },

  // WINDMILL
  windmill_astral: {
    sky: 'arcane', horizon: 'hills', stars: 34,
    motif: (m) => {
      m.poly([48, 4, 56, 30, 52, 48, 44, 48, 40, 30], 0x0EA5E9);
      m.poly([48, 4, 52, 30, 48, 48], 0x67E8F9);
      m.poly([34, 26, 38, 40, 34, 48, 30, 40], 0x0E7490);
      m.poly([62, 22, 67, 38, 63, 48, 58, 38], 0x0E7490);
    },
    fx: (fx, rng) => {
      sparkle(fx, 48, 6, 4, 0xFFFFFF);
      sparkle(fx, 22, 14, 2, 0xA5F3FC);
      sparkle(fx, 76, 10, 2, 0xA5F3FC);
      sparks(fx, rng, 10, 30, 10, 36, 30, [0xA5F3FC, 0xFFFFFF]);
    },
  },
  windmill_cosmic: {
    sky: 'arcane', horizon: 'none', stars: 40,
    motif: (m) => shield(m, 48, 25, 17, 21, 0x10B981, 0x1E0B33),
    fx: (fx) => {
      spiral(fx, 48, 24, 11, 1.6, [0xFFFFFF, 0xF5D0FE, 0xC084FC, 0x7C3AED], 2.2, 0.8);
      sparkle(fx, 40, 16, 1, 0xFFFFFF);
      sparkle(fx, 57, 30, 1, 0xFFFFFF);
    },
  },

  // DEADLIFT
  deadlift_colossus: {
    sky: 'nature', horizon: 'forest', stars: 6,
    glow: { x: 48, y: 18, r: 24, colors: [0x0F2E17, 0x1D4D24, 0x3F6212] },
    motif: (m) => {
      // Gnarled ancient oak gripping a boulder
      m.poly([20, 52, 30, 42, 66, 42, 76, 52], ROCK[1]);
      m.poly([42, 44, 44, 28, 40, 20, 46, 22, 48, 14, 51, 22, 57, 18, 53, 28, 55, 44], BARK[1]);
      for (const [x1, y1] of [[22, 48], [30, 52], [64, 52], [74, 47]]) m.line(48, 40, x1, y1, BARK[1], 3);
      m.line(44, 24, 30, 16, BARK[1], 2);
      m.line(53, 22, 68, 14, BARK[1], 2);
      for (const [x, y, r] of [[30, 13, 7], [42, 8, 8], [56, 8, 8], [68, 12, 7], [48, 14, 6], [36, 18, 5], [62, 18, 5]]) m.disc(x, y, r, LEAF[0]);
      for (const [x, y, r] of [[40, 6, 4], [56, 6, 4], [30, 10, 3], [68, 10, 3]]) m.disc(x, y, r, LEAF[1]);
    },
    fx: (fx, rng) => {
      for (let i = 0; i < 6; i++) fx.set(30 + rng() * 40, 8 + rng() * 12, 0xBEF264);
      sparks(fx, rng, 8, 26, 22, 44, 20, [0xFDE68A]);
    },
  },
  deadlift_sunder: {
    sky: 'dawn', horizon: 'none',
    motif: (m) => {
      m.poly([4, 52, 30, 18, 40, 10, 46, 20, 46, 52], ROCK[1]);
      m.poly([50, 52, 50, 18, 56, 8, 68, 20, 92, 52], ROCK[1]);
      m.poly([30, 18, 40, 10, 36, 22], 0xE2E8F0); // snow caps
      m.poly([56, 8, 68, 20, 60, 18], 0xE2E8F0);
    },
    fx: (fx, rng) => {
      for (let y = 6; y < 52; y++) {
        const x = 48 + Math.sin(y * 0.5) * 1.5;
        fx.set(x - 1, y, 0xF97316);
        fx.set(x, y, 0xFDE047);
        fx.set(x + 1, y, 0xF97316);
      }
      glow(fx, 48, 48, 9, [0xF97316, 0xFDE047, 0xFFFBEA]);
      sparks(fx, rng, 14, 40, 20, 16, 30, [0xFDE047, 0xFFFBEA]);
    },
  },

  // THRUSTER
  thruster_eruption: {
    sky: 'dawn', horizon: 'peaks', stars: 20,
    motif: (m) => m.disc(62, 18, 6, ROCK[1]),
    fx: (fx, rng) => {
      for (let i = 0; i < 26; i++) {
        const t = i / 26;
        const x = 62 - 40 * t;
        const y = 18 + 22 * t;
        fx.disc(x, y, 6 * (1 - t) + 0.5, FIRE[Math.min(4, Math.floor((1 - t) * 4) + 1)]);
      }
      glow(fx, 62, 18, 9, [0xF97316, 0xFDE047, 0xFFFBEA]);
      sparks(fx, rng, 16, 14, 20, 50, 24, FIRE.slice(2));
    },
  },
  thruster_supernova: {
    sky: 'arcane', horizon: 'none', stars: 30,
    backdrop: (b) => glow(b, 48, 26, 30, [0x4C1D95, 0xD97706, 0xFBBF24, 0xFDE68A, 0xFFFFFF]),
    fx: (fx) => {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const r = i % 2 ? 30 : 20;
        fx.line(48 + Math.cos(a) * 8, 26 + Math.sin(a) * 8, 48 + Math.cos(a) * r, 26 + Math.sin(a) * r * 0.8, i % 2 ? 0xFDE68A : 0xFFFBEA);
      }
      fx.disc(48, 26, 5, 0xFFFFFF);
    },
  },

  // GORILLA ROW
  row_beast_maw: {
    sky: 'shadow', horizon: 'none',
    backdrop: (b) => glow(b, 48, 28, 26, [0x2A0A12, 0x5C0E1E, 0x9F1239]),
    motif: (m) => {
      // Open maw seen head-on: upper jaw dome, lower jaw, fangs
      m.poly([4, 0, 92, 0, 92, 14, 78, 20, 48, 24, 18, 20, 4, 14], 0x3F1D38);
      m.poly([8, 52, 88, 52, 88, 42, 74, 36, 48, 33, 22, 36, 8, 42], 0x3F1D38);
      const fang = (x: number, y: number, len: number, dir: 1 | -1) => m.poly([x - 3, y, x + 3, y, x, y + dir * len], 0xE7D8B0);
      [[16, 17, 6], [26, 20, 9], [38, 22, 7], [48, 23, 11], [58, 22, 7], [70, 20, 9], [80, 17, 6]].forEach(([x, y, l]) => fang(x, y, l, 1));
      [[20, 38, 6], [32, 35, 8], [44, 34, 6], [54, 34, 6], [64, 35, 8], [76, 38, 6]].forEach(([x, y, l]) => fang(x, y, l, -1));
    },
    fx: (fx) => {
      for (const x of [24, 66]) {
        fx.rect(x, 6, 6, 3, 0xDC2626);
        fx.rect(x + 2, 6, 2, 3, 0xFDE047);
      }
      fx.line(46, 30, 46, 40, 0x9F1239);
    },
  },
  row_shadow_ripper: {
    sky: 'shadow', horizon: 'spires', stars: 8,
    motif: (m) => {
      sword(m, 26, 46, -0.85, 30, [0x1F1D2B, 0x3F3B52, 0x7C7896, 0xC4C0D8], [0x450A0A, 0x7F1D1D, 0xDC2626, 0xFCA5A5]);
      sword(m, 70, 46, -2.29, 30, [0x1F1D2B, 0x3F3B52, 0x7C7896, 0xC4C0D8], [0x450A0A, 0x7F1D1D, 0xDC2626, 0xFCA5A5]);
    },
    fx: (fx) => {
      for (let k = 0; k < 3; k++) fx.line(30 + k * 6, 6, 50 + k * 6, 30, 0xDC2626, 2);
      for (let k = 0; k < 3; k++) fx.line(31 + k * 6, 7, 49 + k * 6, 29, 0xFCA5A5);
    },
  },

  // HALO
  halo_barrier: {
    sky: 'holy', horizon: 'hills', stars: 10,
    motif: (m) => {
      m.poly([20, 52, 24, 30, 36, 18, 48, 14, 60, 18, 72, 30, 76, 52], 0x312E81);
      m.poly([26, 52, 29, 32, 39, 22, 48, 19, 57, 22, 67, 32, 70, 52], 0x0F0E17);
    },
    fx: (fx, rng) => {
      fx.ring(48, 8, 9, 0xFDE68A, 2);
      fx.ring(48, 8, 9, 0xFFFBEA, 1);
      for (let y = 14; y < 52; y++) {
        for (const x of [24 + (52 - y) * 0.25, 72 - (52 - y) * 0.25]) if (bayer(Math.round(x), y) < 0.7) fx.set(x, y, 0x818CF8);
      }
      sparks(fx, rng, 18, 28, 20, 40, 30, [0x818CF8, 0xC7D2FE, 0xFFFFFF]);
    },
  },
  halo_vortex: {
    sky: 'arcane', horizon: 'none', stars: 24,
    motif: (m) => spiral(m, 48, 26, 26, 3, [0xF5D0FE, 0xC084FC, 0x7C3AED, 0x4C1D95], 4, 0.7),
    fx: (fx) => {
      fx.disc(48, 26, 3, 0xFFFFFF);
      sparkle(fx, 22, 10, 2, 0xF5D0FE);
      sparkle(fx, 76, 40, 2, 0xF5D0FE);
    },
  },

  // SINGLE-LEG RDL
  rdl_valkyrie: {
    sky: 'dawn', horizon: 'spires', stars: 12,
    glow: { x: 48, y: 26, r: 26, colors: [0x4E1240, 0x9D1F5A, 0xE85A6A] },
    motif: (m) => {
      wings(m, 48, 28, 32, 0.4, [0xFFFBEA, 0xE7D8B0, 0xFBCFE8, 0xE7D8B0, 0xFFFBEA]);
      m.disc(48, 26, 7, STEEL[2]); // helm
      m.rect(41, 26, 14, 6, STEEL[2]);
      m.rect(44, 25, 8, 2, 0x0F0E17);
      m.poly([45, 19, 48, 12, 51, 19], 0xEC4899);
    },
    fx: (fx, rng) => sparks(fx, rng, 14, 16, 8, 64, 30, [0xFBCFE8, 0xFFFBEA]),
  },
  rdl_crane: {
    sky: 'dawn', horizon: 'hills', stars: 16,
    backdrop: (b) => {
      b.disc(62, 18, 12, 0xFBCFE8);
      b.disc(66, 15, 10, mix(0x9D1F5A, 0xE85A6A, 0.4)); // crescent cut
    },
    motif: (m) => {
      const c = 0xFFFBEA;
      m.poly([40, 28, 12, 14, 22, 26], c); // wing up
      m.poly([40, 28, 64, 36, 48, 32], c); // wing down
      m.poly([36, 26, 46, 26, 48, 32, 38, 32], c); // body
      m.line(46, 27, 58, 22, c, 2); // neck
      m.poly([58, 21, 66, 22, 58, 24], 0xDB2777); // beak
      m.line(38, 31, 28, 44, 0x1C1917, 1); // legs
      m.line(40, 31, 32, 46, 0x1C1917, 1);
    },
    fx: (fx) => fx.rect(57, 20, 2, 2, 0xDC2626), // red crown
  },

  // CLEAN
  clean_uppercut: {
    sky: 'fire', horizon: 'spires', stars: 6,
    glow: { x: 52, y: 14, r: 22, colors: [0x5C0E0E, 0x9A2A0C, 0xD9590F] },
    motif: (m) => {
      // Armored forearm driving upward into a clenched gauntlet
      m.poly([42, 52, 54, 52, 56, 28, 44, 28], STEEL[1]);
      m.rect(43, 34, 12, 3, GOLD[1]); // vambrace band
      m.poly([40, 28, 58, 28, 60, 18, 56, 12, 42, 12, 38, 18], STEEL[2]);
      for (let k = 0; k < 4; k++) m.rect(41 + k * 4.5, 11, 3.5, 4, STEEL[3]); // knuckle plates
      m.poly([38, 18, 34, 22, 38, 26, 42, 24], STEEL[1]); // thumb
    },
    fx: (fx, rng) => {
      crescent(fx, 52, 30, 26, 3.6, 5.2, 4, [0, 0xF97316, 0xFDE047, 0xFFFBEA]);
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + (i - 3.5) * 0.3;
        fx.line(50 + Math.cos(a) * 9, 8 + Math.sin(a) * 6, 50 + Math.cos(a) * 16, 8 + Math.sin(a) * 10, i % 2 ? 0xFDE047 : 0xFFFBEA);
      }
      sparks(fx, rng, 16, 30, 0, 40, 20, FIRE.slice(2));
    },
  },
  clean_ricochet: {
    sky: 'storm', horizon: 'spires', stars: 12,
    motif: (m) => kettlebell(m, 74, 18, 7, ROCK[1], ROCK[2]),
    fx: (fx, rng) => {
      // Zigzag bounce trail through three impact points
      const pts: [number, number][] = [[8, 40], [28, 12], [48, 42], [66, 20]];
      for (let i = 0; i + 1 < pts.length; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[i + 1];
        for (let t = 0; t <= 1; t += 0.04) if (Math.floor(t * 25) % 2 === 0) fx.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 1, 0xFACC15);
      }
      for (const [x, y] of pts.slice(1, 3)) {
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          fx.line(x + Math.cos(a) * 3, y + Math.sin(a) * 3, x + Math.cos(a) * 7, y + Math.sin(a) * 7, k % 2 ? 0xFACC15 : 0xFFFBEA);
        }
        fx.disc(x, y, 1.5, 0xFFFFFF);
      }
      sparks(fx, rng, 12, 10, 6, 70, 36, [0xFACC15, 0xFFFBEA]);
    },
  },

  // LUNGE
  lunge_lancer: {
    sky: 'water', horizon: 'hills', stars: 16,
    motif: (m) => {
      m.line(4, 46, 76, 14, BARK[2], 2.5); // shaft
      m.poly([74, 10, 92, 6, 80, 20], STEEL[2]); // spearhead
      m.line(76, 12, 88, 8, STEEL[3]);
      m.poly([70, 14, 72, 22, 76, 16], 0xDC2626); // pennant
    },
    fx: (fx, rng) => {
      // The thrust punches through two foes in a line
      for (const [x, y, r] of [[36, 32, 6], [58, 22, 5]]) {
        fx.ring(x, y, r, 0x22D3EE, 1);
        fx.ring(x, y, r + 3, 0x0E7490, 1);
      }
      for (let i = 0; i < 6; i++) fx.line(4 + i * 4, 30 + i * 3, 20 + i * 4, 23 + i * 3, 0x67E8F9);
      sparks(fx, rng, 12, 30, 10, 50, 30, [0xA5F3FC, 0xFFFFFF]);
    },
  },
  lunge_vanguard: {
    sky: 'steel', horizon: 'spires', stars: 8,
    glow: { x: 48, y: 26, r: 26, colors: [0x1E2430, 0x323B4C, 0x56637A] },
    motif: (m) => {
      // War banner behind a tower shield
      m.line(66, 4, 66, 50, BARK[1], 2);
      m.poly([67, 5, 86, 8, 80, 13, 86, 18, 67, 20], 0x7F1D1D);
      m.poly([30, 8, 56, 8, 58, 40, 43, 50, 28, 40], 0x94A3B8);
      m.poly([33, 11, 53, 11, 54, 38, 43, 46, 32, 38], 0x334155);
      m.rect(41, 14, 4, 26, 0xF4B41A); // cross
      m.rect(35, 21, 16, 4, 0xF4B41A);
    },
    fx: (fx, rng) => {
      for (let i = 0; i < 3; i++) fx.line(10, 40 + i * 4, 24, 40 + i * 4, 0xCBD5E1); // forward step streaks
      sparks(fx, rng, 8, 26, 4, 40, 30, [0xFFFBEA, 0xF4B41A]);
    },
  },
};

// ---------------------------------------------------------------------------------------------
// Weapon spell cards (src/types/weaponSpells.ts): the granting weapon's silhouette, tinted in the
// spell's colours, over a sky and effect that match its element.

type Family = 'flail' | 'bell' | 'mace' | 'sword';
type SpellFx = 'flames' | 'bolts' | 'sparks' | 'spiral' | 'shards' | 'drips' | 'beam' | 'rings' | 'wings' | 'eye' | 'rocks' | 'tentacles' | 'skulls' | 'roots';

/** Four-step ramp (shadow → highlight) from a card colour. */
const tone = (c: number) => [mix(c, INK, 0.65), mix(c, INK, 0.3), c, mix(c, 0xFFFFFF, 0.55)];

function flailMotif(m: Layer, c: number[], swing: number): void {
  // Handle low-left, chain arcing up, spiked head top-right
  m.line(18, 46, 26, 34, BARK[2], 3);
  m.rect(16, 45, 5, 3, GOLD[2]);
  const hx = 54 + Math.cos(swing) * 6;
  const hy = 18 + Math.sin(swing) * 4;
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const x = 26 + (hx - 26) * t;
    const y = 34 + (hy - 34) * t - Math.sin(t * Math.PI) * 8;
    m.disc(x, y, 1.2, i % 2 ? STEEL[2] : STEEL[1]);
  }
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    m.line(hx + Math.cos(a) * 6, hy + Math.sin(a) * 6, hx + Math.cos(a) * 11, hy + Math.sin(a) * 11, c[3], 2);
  }
  m.disc(hx, hy, 8, c[1]);
  m.disc(hx - 2, hy - 2, 4, c[2]);
}

function maceMotif(m: Layer, c: number[]): void {
  m.line(22, 48, 46, 22, BARK[2], 3);
  m.rect(20, 46, 4, 4, GOLD[2]);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    m.poly([50 + Math.cos(a - 0.25) * 6, 18 + Math.sin(a - 0.25) * 6, 50 + Math.cos(a) * 14, 18 + Math.sin(a) * 14, 50 + Math.cos(a + 0.25) * 6, 18 + Math.sin(a + 0.25) * 6], c[2]);
  }
  m.disc(50, 18, 9, c[1]);
  m.disc(48, 16, 4, c[3]);
}

function spellMotif(family: Family, m: Layer, c: number[], rng: Rng): void {
  if (family === 'flail') flailMotif(m, c, rng() * 0.6);
  else if (family === 'mace') maceMotif(m, c);
  else if (family === 'sword') sword(m, 26, 44, -0.75, 46, [c[0], c[1], c[2], c[3]], GOLD);
  else kettlebell(m, 48, 30, 12, c[1], c[2]);
}

function spellFx(kind: SpellFx, fx: Layer, rng: Rng, c: number[]): void {
  const hot = [c[2], c[3], 0xFFFFFF];
  switch (kind) {
    case 'flames':
      for (let i = 0; i < 5; i++) flame(fx, 14 + i * 17, 52, 14 + rng() * 12, 5 + rng() * 3, rng, [INK, c[1], c[2], c[3], 0xFFFBEA]);
      sparks(fx, rng, 20, 8, 2, 80, 30, hot);
      break;
    case 'bolts':
      bolt(fx, 70, 0, 60, 46, rng, [INK, c[2], c[3], 0xFFFFFF]);
      bolt(fx, 20, 0, 30, 30, rng, [INK, c[2], c[3], 0xFFFFFF]);
      sparks(fx, rng, 12, 50, 30, 30, 20, hot);
      break;
    case 'spiral':
      spiral(fx, 66, 26, 22, 2.2, [c[3], c[2], c[1], c[0]], 3, 0.6);
      sparks(fx, rng, 16, 40, 4, 50, 40, hot);
      break;
    case 'shards':
      for (let i = 0; i < 9; i++) {
        const x = 8 + rng() * 80;
        const h = 6 + rng() * 14;
        fx.poly([x - 3, 52, x, 52 - h, x + 3, 52], c[2]);
        fx.line(x, 52 - h, x - 1, 50, c[3]);
      }
      sparks(fx, rng, 16, 10, 4, 76, 36, hot);
      break;
    case 'drips':
      for (let i = 0; i < 10; i++) {
        const x = 10 + rng() * 76;
        const y = 4 + rng() * 40;
        fx.disc(x, y, 1.5 + rng() * 1.5, c[2]);
        fx.set(x - 1, y - 1, c[3]);
      }
      fx.rect(0, 48, 96, 4, c[1]);
      break;
    case 'beam':
      for (let y = 0; y < 52; y++) {
        const w = 3 + y * 0.12;
        fx.line(68 - w, y, 68 + w, y, c[2]);
        fx.line(68 - w * 0.45, y, 68 + w * 0.45, y, c[3]);
      }
      fx.line(68, 0, 68, 52, 0xFFFFFF);
      sparks(fx, rng, 14, 52, 20, 32, 30, hot);
      break;
    case 'rings':
      for (let r = 6; r < 40; r += 8) fx.ring(66, 26, r, r % 16 ? c[2] : c[3], 1);
      sparks(fx, rng, 10, 40, 4, 50, 44, hot);
      break;
    case 'wings':
      wings(fx, 66, 26, 22, 0.5, [c[3], c[2], c[1]]);
      sparks(fx, rng, 14, 40, 4, 50, 40, hot);
      break;
    case 'eye':
      fx.poly([50, 20, 66, 10, 82, 20, 66, 30], 0xF5E6D3);
      fx.disc(66, 20, 6, c[2]);
      fx.rect(65, 15, 2, 10, INK);
      for (let k = 0; k < 6; k++) fx.line(66 + Math.cos(k) * 18, 20 + Math.sin(k) * 12, 66 + Math.cos(k) * 28, 20 + Math.sin(k) * 20, c[1], 2);
      break;
    case 'rocks':
      for (let i = 0; i < 4; i++) {
        const x = 52 + i * 11;
        const h = 14 + rng() * 18;
        fx.poly([x - 6, 52, x - 2, 52 - h, x + 4, 52 - h * 0.8, x + 6, 52], ROCK[1 + (i % 2)]);
        fx.line(x - 1, 52, x, 52 - h * 0.8, c[2]);
      }
      sparks(fx, rng, 12, 48, 10, 40, 30, hot);
      break;
    case 'tentacles':
      for (let k = 0; k < 4; k++) {
        const x0 = 50 + k * 12;
        for (let i = 0; i < 20; i++) {
          const t = i / 20;
          fx.disc(x0 + Math.sin(t * 5 + k) * 5, 52 - t * 36, 3 * (1 - t) + 0.8, i % 4 ? c[1] : c[2]);
        }
      }
      break;
    case 'skulls':
      for (let i = 0; i < 4; i++) {
        const x = 52 + i * 10;
        const y = 12 + (i % 2) * 14;
        fx.disc(x, y, 3.5, 0xE2E8F0);
        fx.set(x - 1, y, INK);
        fx.set(x + 1, y, INK);
        fx.line(x - 8, y + 1, x - 4, y + 1, c[2]);
      }
      break;
    case 'roots':
      for (let k = 0; k < 4; k++) {
        let x = 40 + k * 12;
        for (let y = 52; y > 20; y -= 2) {
          x += (rng() - 0.5) * 3;
          fx.disc(x, y, 1.6, k % 2 ? BARK[2] : c[1]);
        }
      }
      sparks(fx, rng, 10, 40, 10, 50, 30, hot);
      break;
    default:
      sparks(fx, rng, 26, 30, 4, 60, 40, hot);
  }
}

/** Per spell: sky, horizon and the element effect drawn over the weapon. */
const SPELL_ART: Record<string, { sky: Sky; horizon: Horizon; fx: SpellFx; stars?: number }> = {
  spell_iron_pendulum: { sky: 'steel', horizon: 'spires', fx: 'rings', stars: 10 },
  spell_caustic_deluge: { sky: 'nature', horizon: 'forest', fx: 'drips' },
  spell_brood_sac: { sky: 'shadow', horizon: 'forest', fx: 'sparks' },
  spell_requiem_censer: { sky: 'storm', horizon: 'spires', fx: 'skulls', stars: 16 },
  spell_brimstone_comet: { sky: 'fire', horizon: 'peaks', fx: 'flames' },
  spell_permafrost: { sky: 'storm', horizon: 'peaks', fx: 'shards', stars: 12 },
  spell_boulder_bowl: { sky: 'earth', horizon: 'hills', fx: 'rocks' },
  spell_abyssal_anchor: { sky: 'water', horizon: 'none', fx: 'beam' },
  spell_maelstrom: { sky: 'water', horizon: 'none', fx: 'tentacles' },
  spell_sunflare: { sky: 'holy', horizon: 'hills', fx: 'beam' },
  spell_wyrmchain: { sky: 'fire', horizon: 'peaks', fx: 'flames' },
  spell_molten_meteor: { sky: 'fire', horizon: 'peaks', fx: 'rocks' },
  spell_event_horizon: { sky: 'arcane', horizon: 'none', fx: 'spiral', stars: 24 },
  spell_gravity_well: { sky: 'arcane', horizon: 'peaks', fx: 'rings', stars: 20 },
  spell_iron_toll: { sky: 'steel', horizon: 'spires', fx: 'rings', stars: 8 },
  spell_spore_bloom: { sky: 'nature', horizon: 'forest', fx: 'sparks' },
  spell_talon_gale: { sky: 'dawn', horizon: 'peaks', fx: 'wings' },
  spell_ironwood_grasp: { sky: 'nature', horizon: 'forest', fx: 'roots' },
  spell_ley_fault: { sky: 'storm', horizon: 'hills', fx: 'rocks' },
  spell_all_seeing_gaze: { sky: 'arcane', horizon: 'none', fx: 'eye', stars: 16 },
  spell_writhing_dark: { sky: 'shadow', horizon: 'none', fx: 'tentacles', stars: 8 },
  spell_excalibur_decree: { sky: 'holy', horizon: 'spires', fx: 'beam' },
  spell_dragon_breath: { sky: 'fire', horizon: 'peaks', fx: 'flames' },
  spell_wyrmheart_drive: { sky: 'fire', horizon: 'hills', fx: 'spiral' },
  spell_fallen_star: { sky: 'arcane', horizon: 'peaks', fx: 'beam', stars: 30 },
  spell_gravity_snap: { sky: 'arcane', horizon: 'hills', fx: 'rings', stars: 20 },
  spell_scrap_shrapnel: { sky: 'earth', horizon: 'forest', fx: 'sparks' },
  spell_flanged_crush: { sky: 'steel', horizon: 'spires', fx: 'shards', stars: 8 },
  spell_ossuary_rattle: { sky: 'shadow', horizon: 'spires', fx: 'skulls', stars: 10 },
  spell_gravestone_toll: { sky: 'shadow', horizon: 'spires', fx: 'rocks', stars: 12 },
  spell_cathedral_toll: { sky: 'holy', horizon: 'spires', fx: 'rings' },
  spell_basalt_fissure: { sky: 'fire', horizon: 'peaks', fx: 'beam' },
  spell_core_breach: { sky: 'fire', horizon: 'hills', fx: 'flames' },
  spell_kettleburne_oath: { sky: 'steel', horizon: 'spires', fx: 'sparks', stars: 10 },
  spell_lunar_hunt: { sky: 'storm', horizon: 'forest', fx: 'sparks', stars: 20 },
  spell_tusk_gore: { sky: 'dawn', horizon: 'forest', fx: 'shards' },
  spell_labyrinth_execution: { sky: 'earth', horizon: 'spires', fx: 'beam' },
  spell_dragonheart_rend: { sky: 'fire', horizon: 'peaks', fx: 'flames' },
  spell_scorched_earth: { sky: 'fire', horizon: 'hills', fx: 'flames' },
  spell_severed_moment: { sky: 'arcane', horizon: 'none', fx: 'rings', stars: 24 },
  spell_singularity_edge: { sky: 'arcane', horizon: 'none', fx: 'spiral', stars: 24 },
  spell_heavens_smite: { sky: 'holy', horizon: 'spires', fx: 'beam', stars: 16 },
  spell_righteous_onslaught: { sky: 'holy', horizon: 'peaks', fx: 'wings' },
  spell_dawns_aegis: { sky: 'holy', horizon: 'spires', fx: 'rings', stars: 20 },
};

for (const spell of ALL_WEAPON_SPELLS) {
  const art = SPELL_ART[spell.templateId];
  if (!art) continue;
  const w = spell.weaponId ?? '';
  const family: Family = w.includes('morningstar') ? 'flail' : w.includes('mace') ? 'mace' : (w.includes('sword') || w.includes('excalibell')) ? 'sword' : 'bell';
  const c = tone(parseInt(spell.colorHex.slice(1), 16));
  SCENES[spell.templateId] = {
    sky: art.sky,
    horizon: art.horizon,
    stars: art.stars,
    glow: { x: 52, y: 24, r: 30, colors: [c[0], c[1], c[2]], strength: 0.8 },
    motif: (m, rng) => spellMotif(family, m, c, rng),
    fx: (fx, rng) => spellFx(art.fx, fx, rng, c),
  };
}

const FALLBACK: Scene = {
  sky: 'steel', horizon: 'spires', stars: 12,
  motif: (m) => kettlebell(m, 48, 28, 10),
};

const cache = new Map<string, string>();

/** PNG data URL for a card's illustration (96x52), painted once per templateId. */
export function getCardArt(templateId: string): string {
  const hit = cache.get(templateId);
  if (hit) return hit;

  const scene = SCENES[templateId] ?? FALLBACK;
  const rng = mulberry32(hash(templateId));
  const horizonY = scene.horizonY ?? 44;

  const base = new Layer();
  paintSky(base, scene.sky, horizonY);
  if (scene.stars) paintStars(base, rng, scene.stars);
  if (scene.glow) glow(base, scene.glow.x, scene.glow.y, scene.glow.r, scene.glow.colors, scene.glow.strength);
  scene.backdrop?.(base, rng);
  paintHorizon(base, scene.horizon ?? 'none', horizonY, scene.sky, rng);

  if (scene.motif) {
    const m = new Layer();
    scene.motif(m, rng);
    shadeAndOutline(m);
    base.over(m);
  }
  if (scene.fx) {
    const fx = new Layer();
    scene.fx(fx, rng);
    base.over(fx);
  }
  vignette(base);

  const url = toDataUrl(base);
  cache.set(templateId, url);
  return url;
}

/** Encodes a layer as a PNG data URL. */
export function toDataUrl(layer: Layer): string {
  const canvas = document.createElement('canvas');
  canvas.width = layer.w;
  canvas.height = layer.h;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(layer.w, layer.h);
  for (let i = 0; i < layer.px.length; i++) {
    const c = layer.px[i];
    img.data[i * 4] = (c >> 16) & 255;
    img.data[i * 4 + 1] = (c >> 8) & 255;
    img.data[i * 4 + 2] = c & 255;
    img.data[i * 4 + 3] = c ? 255 : 0;
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}
