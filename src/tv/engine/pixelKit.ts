/**
 * Pixel-sprite kit for move choreography: paint 32-bit style frames procedurally (the card-art painter:
 * Layer + shadeAndOutline gives rim light, core shadow and a 1px ink outline), turn them into nearest-filtered
 * textures at 1 texel = 1 stage pixel, and use them as Sprites inside a move.
 *
 * `moveSprites()` builds a move's frames on first use and frees them when the move's layers are destroyed
 * (move end or interruption), so nothing outlives the cast (Fire TV VRAM is scarce). Used by phantomSteed.ts and artSprites.ts.
 */
import { Sprite, Texture, type Container } from 'pixi.js';
import { Layer, shadeAndOutline, mix } from '../components/cardArt';
import type { KnightMoveHost, Layer as FxLayer } from './knightKit';

export { Layer, shadeAndOutline, mix };

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function ellipse(m: Layer, cx: number, cy: number, rx: number, ry: number, c: number) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) m.set(x, y, c);
    }
  }
}

/** A tapered stroke from a to b, width w0 → w1. */
export function limb(m: Layer, ax: number, ay: number, bx: number, by: number, w0: number, w1: number, c: number) {
  const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay)));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    m.disc(ax + (bx - ax) * t, ay + (by - ay) * t, (w0 + (w1 - w0) * t) / 2, c);
  }
}

/** A tapered polyline through `pts`, width w0 → w1 along its length. */
export function strand(m: Layer, pts: { x: number; y: number }[], w0: number, w1: number, c: number) {
  for (let i = 1; i < pts.length; i++) {
    const t0 = (i - 1) / (pts.length - 1);
    const t1 = i / (pts.length - 1);
    limb(m, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, lerp(w0, w1, t0), lerp(w0, w1, t1), c);
  }
}

/** Rotates the flat [x, y, x, y…] point list about (cx, cy). */
export function rotPts(pts: number[], cx: number, cy: number, a: number): number[] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const out: number[] = [];
  for (let i = 0; i < pts.length; i += 2) {
    const dx = pts[i] - cx;
    const dy = pts[i + 1] - cy;
    out.push(cx + dx * c - dy * s, cy + dx * s + dy * c);
  }
  return out;
}

/** Points along a quadratic Bézier (inclusive of both ends). */
export function qbez(ax: number, ay: number, cx: number, cy: number, bx: number, by: number, n = 10): number[] {
  const out: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push(u * u * ax + 2 * u * t * cx + t * t * bx, u * u * ay + 2 * u * t * cy + t * t * by);
  }
  return out;
}

/** Flickering fire tongue from (x, y) along angle `a`; colours run outer → core. */
export function flame(fx: Layer, x: number, y: number, a: number, len: number, w: number, seed: number, colors: number[]) {
  const n = Math.ceil(len);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const wob = Math.sin(t * 7 + seed * 1.9) * t * 2.2;
    const px = x + Math.cos(a) * len * t - Math.sin(a) * wob;
    const py = y + Math.sin(a) * len * t + Math.cos(a) * wob;
    const r = w * (1 - t) * (0.85 + 0.25 * Math.sin(seed * 2.3 + i));
    fx.disc(px, py, r + 0.6, colors[0]);
    if (r > 1.1) fx.disc(px, py, r * 0.6, colors[1]);
    if (r > 2) fx.disc(px, py, r * 0.3, colors[2]);
  }
  fx.set(x, y, colors[colors.length - 1]);
}

/** Every opaque pixel nudged toward `tint`: reads spectral / unified. */
export function haunt(m: Layer, tint: number, amount: number) {
  for (let i = 0; i < m.px.length; i++) {
    const c = m.px[i];
    if (c) m.px[i] = 0xFF000000 | mix(c & 0xFFFFFF, tint, amount);
  }
}

/** Clears every row at or below `row` (a thing rising out of the floor is cut at the ground line). */
export function clipBelow(m: Layer, row: number) {
  for (let y = Math.max(0, row); y < m.h; y++) for (let x = 0; x < m.w; x++) m.px[y * m.w + x] = 0;
}

export function toTexture(m: Layer): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = m.w;
  canvas.height = m.h;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(m.w, m.h);
  for (let i = 0; i < m.px.length; i++) {
    const c = m.px[i];
    if (!c) continue;
    img.data[i * 4] = (c >> 16) & 255;
    img.data[i * 4 + 1] = (c >> 8) & 255;
    img.data[i * 4 + 2] = c & 255;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = Texture.from(canvas);
  tex.source.scaleMode = 'nearest';
  return tex;
}

export interface SpriteOpts {
  layer?: FxLayer;
  /** Anchor in frame pixels (default: centre). */
  ax?: number;
  ay?: number;
  add?: boolean; // additive blend (glows, afterimages)
  tint?: number;
  alpha?: number;
}

export interface MoveSprites {
  /** The frames of set `name` (built on first use). */
  tex(name: string): Texture[];
  /** A new sprite showing frame `frame` of set `name`. */
  sprite(name: string, frame?: number, o?: SpriteOpts): Sprite;
  /** Shows frame `frame` (wrapped) of set `name` on `s`. */
  show(s: Sprite, name: string, frame: number): void;
}

/**
 * Sprite frames owned by one move: `build()` runs on first use and returns named frame sets. The sprites live
 * in containers on the move's layers, which the engine destroys when the move ends or is interrupted; the
 * textures are freed right then (hooked to that destroy), so nothing outlives the cast either way.
 */
export function moveSprites(h: KnightMoveHost, build: () => Record<string, Texture[]>): MoveSprites {
  let sets: Record<string, Texture[]> | null = null;
  const layers: Partial<Record<FxLayer, Container>> = {};
  let live = 0;
  const free = () => {
    if (--live > 0 || !sets) return;
    for (const list of Object.values(sets)) for (const t of list) t.destroy(true);
    sets = null;
  };
  const layerFor = (layer: FxLayer) => {
    let c = layers[layer];
    if (!c) {
      c = layers[layer] = h.container(layer);
      live++;
      c.once('destroyed', free);
    }
    return c;
  };
  const get = () => {
    if (!sets) {
      layerFor('fx'); // owns the textures even before any fx sprite exists
      sets = build();
    }
    return sets;
  };
  return {
    tex: (name) => get()[name],
    sprite: (name, frame = 0, o = {}) => {
      const list = get()[name];
      const tex = list[((frame % list.length) + list.length) % list.length];
      const s = new Sprite(tex);
      s.anchor.set((o.ax ?? tex.width / 2) / tex.width, (o.ay ?? tex.height / 2) / tex.height);
      if (o.add) s.blendMode = 'add';
      if (o.tint !== undefined) s.tint = o.tint;
      if (o.alpha !== undefined) s.alpha = o.alpha;
      layerFor(o.layer ?? 'fx').addChild(s);
      return s;
    },
    show: (s, name, frame) => {
      if (s.destroyed || !sets) return;
      const list = sets[name];
      s.texture = list[((Math.floor(frame) % list.length) + list.length) % list.length];
    },
  };
}
