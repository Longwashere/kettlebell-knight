/**
 * Pixel-VFX drawing primitives for choreographed moves (knightMoves.ts).
 *
 * Every shape follows the battle look: a dark ink contour, a saturated body and a hot core. `Pal` is
 * that trio. Functions draw into a caller-owned Graphics (usually from `drawSpan`, cleared every frame)
 * and never allocate display objects, so they're cheap to redraw at 60 fps on the Fire TV.
 *
 * Once the painted sprite pages are up (fxAtlas.ts), the primitives stamp them — soft blooms, flares, beams,
 * shaded shards and rocks — over a slimmer vector skeleton; until then they draw the plain vector version.
 */
import type { Graphics } from 'pixi.js';
import { INK, BONE, lerp } from './choreo';
import { stamp, stampPal, fxReady } from './fxAtlas';
import { isPerformanceMode, isUltraMode } from '../graphicsMode';

/** Ink contour, saturated body, hot core. */
export interface Pal {
  ink: number;
  body: number;
  core: number;
}

export const pal = (body: number, core: number = BONE, ink: number = INK): Pal => ({ ink, body, core });

/** Blends colour a toward b by t (0-1). */
export function blend(a: number, b: number, t: number): number {
  const ch = (s: number) => Math.round((((a >> s) & 255) * (1 - t)) + (((b >> s) & 255) * t));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** A palette derived from one colour: deep hue-kept shadow, the colour, a pale hot core. */
export const palOf = (color: number): Pal => ({ ink: blend(color, 0x0A0612, 0.78), body: color, core: blend(color, 0xFFFFFF, 0.65) });

/** Deterministic 0-1 noise, so jagged shapes flicker per frame but stay stable within one. */
export function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Tapered crescent slash from angle a0 to a1 (radians, y-down so positive is clockwise) at radius r,
 * `thick` px at its widest. `alpha` fades the whole ribbon.
 */
export function crescent(g: Graphics, cx: number, cy: number, r: number, a0: number, a1: number, thick: number, p: Pal, alpha = 1): void {
  if (Math.abs(a1 - a0) < 0.02 || alpha <= 0) return;
  const layer = (rOut: number, th: number, color: number, a: number) => {
    const n = 14;
    const pts: number[] = [];
    for (let i = 0; i <= n; i++) {
      const ang = lerp(a0, a1, i / n);
      pts.push(cx + Math.cos(ang) * rOut, cy + Math.sin(ang) * rOut);
    }
    for (let i = n; i >= 0; i--) {
      const u = i / n;
      const ang = lerp(a0, a1, u);
      // Thickest just behind the leading edge, tapering to a point at both ends
      const w = th * Math.sin(Math.PI * Math.pow(u, 0.7));
      pts.push(cx + Math.cos(ang) * (rOut - w), cy + Math.sin(ang) * (rOut - w));
    }
    g.poly(pts).fill({ color, alpha: a });
  };
  if (!fxReady()) {
    layer(r + 2, thick + 4, p.ink, 0.85 * alpha);
    layer(r, thick, p.body, 0.95 * alpha);
    layer(r - 1, Math.max(1, thick * 0.35), p.core, alpha);
    return;
  }
  // Painted: a thin ink shadow, a translucent haze, the blade of colour, a hot core and a white leading rim,
  // with bloom beads riding the arc
  layer(r + 1.5, thick + 2.5, p.ink, 0.55 * alpha);
  layer(r + 1, thick * 1.25, p.body, 0.45 * alpha);
  layer(r, thick * 0.85, p.body, 0.95 * alpha);
  layer(r - 0.5, Math.max(1, thick * 0.45), p.core, alpha);
  layer(r + 0.5, Math.max(0.8, thick * 0.14), 0xFFFFFF, alpha);
  const beads = isPerformanceMode() ? 0 : Math.min(isUltraMode() ? 8 : 5, 2 + Math.round(Math.abs(a1 - a0) * (isUltraMode() ? 3 : 2)));
  for (let i = 1; i <= beads; i++) {
    const u = i / (beads + 1);
    const ang = lerp(a0, a1, Math.pow(u, 0.8));
    const w = thick * Math.sin(Math.PI * Math.pow(u, 0.7));
    stamp(g, 'bloom', cx + Math.cos(ang) * (r - w * 0.4), cy + Math.sin(ang) * (r - w * 0.4), w * 2.6 + 6, w * 2.6 + 6, { tint: p.body, alpha: 0.35 * alpha });
  }
  const lead = lerp(a0, a1, 0.92);
  stamp(g, 'flare', cx + Math.cos(lead) * r, cy + Math.sin(lead) * r, thick * 2.4 + 8, thick * 2.4 + 8, { tint: p.core, alpha: 0.8 * alpha, rot: lead });
}

/** Spiky impact star: `spikes` points, long/short alternating, with ink outline and hot centre. */
export function starburst(g: Graphics, x: number, y: number, r: number, spikes: number, rot: number, p: Pal, alpha = 1): void {
  if (r <= 0.5 || alpha <= 0) return;
  const star = (rr: number, color: number, a: number) => {
    const pts: number[] = [];
    for (let i = 0; i < spikes * 2; i++) {
      const ang = rot + (i / (spikes * 2)) * Math.PI * 2;
      const len = i % 2 === 0 ? rr * (0.75 + 0.25 * hash(i + spikes)) : rr * 0.32;
      pts.push(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    }
    g.poly(pts).fill({ color, alpha: a });
  };
  if (!fxReady()) {
    star(r + 3, p.ink, 0.8 * alpha);
    star(r, p.body, alpha);
    star(r * 0.55, p.core, alpha);
    return;
  }
  // Painted: a bloom, an eight-point lens flare turning with `rot`, a slim star and a white-hot centre
  stamp(g, 'bloom', x, y, r * 3.2, r * 3.2, { tint: p.body, alpha: 0.6 * alpha });
  star(r + 1.5, p.ink, 0.45 * alpha);
  star(r * 0.8, p.body, 0.9 * alpha);
  star(r * 0.45, p.core, alpha);
  stamp(g, 'flare8', x, y, r * 3.6, r * 3.6, { tint: p.core, alpha, rot });
  stamp(g, 'bloomHot', x, y, r * 1.5, r * 1.5, { tint: 0xFFFFFF, alpha });
}

/** Flattened ground ring (perspective ellipse), e.g. a shockwave front. */
export function groundRing(g: Graphics, x: number, y: number, r: number, width: number, color: number, alpha = 1): void {
  if (r <= 0.5 || alpha <= 0) return;
  const ry = Math.min(r * 0.28, 22); // stays a band on the floor even when it sweeps the whole arena
  if (fxReady()) {
    // A soft dust-and-light band (the ring sprite peaks at 0.7-0.78 of its radius) under a crisp hairline
    stamp(g, 'ringSoft', x, y, (r * 2) / 0.7, (ry * 2) / 0.7, { tint: color, alpha: 0.75 * alpha });
    g.ellipse(x, y, r, ry).stroke({ width: Math.max(1, width * 0.5), color: blend(color, 0xFFFFFF, 0.5), alpha });
    return;
  }
  g.ellipse(x, y, r, ry).stroke({ width: width + 2, color: INK, alpha: 0.6 * alpha });
  g.ellipse(x, y, r, ry).stroke({ width, color, alpha });
}

/** Jagged lightning from (x0,y0) to (x1,y1). `seed` changes the zig-zag (pass the frame to flicker). */
export function bolt(g: Graphics, x0: number, y0: number, x1: number, y1: number, segs: number, jag: number, p: Pal, width = 3, seed = 0, alpha = 1): void {
  const pts: number[] = [x0, y0];
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const off = (hash(seed * 13 + i) * 2 - 1) * jag;
    pts.push(x0 + dx * t + nx * off, y0 + dy * t + ny * off);
  }
  pts.push(x1, y1);
  const path = () => {
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  };
  if (!fxReady()) {
    path();
    g.stroke({ width: width + 3, color: p.ink, alpha: 0.7 * alpha });
    path();
    g.stroke({ width, color: p.body, alpha });
    path();
    g.stroke({ width: Math.max(1, width * 0.4), color: p.core, alpha });
    return;
  }
  // Painted: a wide haze, the channel, a white-hot thread; blooms on the kinks and a spark where it lands
  path();
  g.stroke({ width: width * 4, color: p.body, alpha: 0.16 * alpha });
  path();
  g.stroke({ width: width + 1.5, color: p.ink, alpha: 0.45 * alpha });
  path();
  g.stroke({ width, color: p.body, alpha });
  path();
  g.stroke({ width: Math.max(1, width * 0.35), color: 0xFFFFFF, alpha });
  if (!isPerformanceMode()) for (let i = 2; i < pts.length - 2; i += 4) stamp(g, 'bloom', pts[i], pts[i + 1], width * 5, width * 5, { tint: p.body, alpha: 0.4 * alpha });
  stamp(g, 'flare', x1, y1, width * 7, width * 7, { tint: p.core, alpha, rot: hash(seed) * Math.PI });
}

/** Rock / crystal spike rising from the ground, lit on its left face. */
export function spike(g: Graphics, x: number, groundY: number, h: number, w: number, fill: number, edge: number, tip = BONE): void {
  if (h <= 0.5) return;
  // Painted rock spike: lit ridge, strata seams, ink contour (sprite is drawn from its base)
  if (stampPal(g, 'rockSpike', x, groundY + 1, w * 2.2, h + 1, { ink: blend(fill, 0x0A0612, 0.7), body: fill, core: blend(edge, tip, 0.35) }, { ay: 1 })) return;
  g.poly([x - w, groundY, x - w * 0.3, groundY - h * 0.55, x, groundY - h, x + w * 0.35, groundY - h * 0.5, x + w, groundY])
    .fill({ color: fill }).stroke({ width: 2, color: INK });
  g.poly([x - w * 0.7, groundY, x - w * 0.25, groundY - h * 0.55, x, groundY - h, x - w * 0.05, groundY]).fill({ color: edge, alpha: 0.85 });
  g.moveTo(x - w * 0.3, groundY - h * 0.55).lineTo(x, groundY - h).stroke({ width: 1, color: tip, alpha: 0.7 });
}

/** Faceted crystal shard (sharper and glassier than `spike`). */
export function crystal(g: Graphics, x: number, groundY: number, h: number, w: number, p: Pal, lean = 0, alpha = 1): void {
  if (h <= 0.5) return;
  const tx = x + lean;
  if (fxReady()) {
    // Painted faceted shard (sprite drawn from its base, leaning toward the tip) with a glint on the point
    const rot = Math.atan2(lean, h);
    stampPal(g, 'crystal', x, groundY + 1, w * 2.2, h + 1, p, { ay: 1, rot, alpha });
    if (h > 10) stamp(g, 'twinkle', tx, groundY - h + 2, 7, 7, { tint: 0xFFFFFF, alpha: alpha * (0.5 + 0.5 * hash(x)) });
    return;
  }
  g.poly([x - w, groundY, tx - w * 0.2, groundY - h * 0.8, tx, groundY - h, tx + w * 0.25, groundY - h * 0.78, x + w, groundY])
    .fill({ color: p.body, alpha }).stroke({ width: 2, color: p.ink, alpha });
  g.poly([x - w * 0.6, groundY, tx - w * 0.15, groundY - h * 0.75, tx, groundY - h, x - w * 0.05, groundY]).fill({ color: p.core, alpha: 0.55 * alpha });
}

/** Vertical light column from `top` to `bottom`, `w` wide, with a hot core and ink edges. */
export function pillar(g: Graphics, x: number, top: number, bottom: number, w: number, p: Pal, alpha = 1): void {
  if (w <= 0.5 || alpha <= 0) return;
  if (fxReady()) {
    // Painted column of light: soft haze, body and white core as beam cross-sections, a pool at its foot
    const len = bottom - top;
    const my = (top + bottom) / 2;
    const up = Math.PI / 2;
    stamp(g, 'beam', x, my, len, w * 2.6, { rot: up, tint: p.body, alpha: 0.55 * alpha });
    stamp(g, 'beamCore', x, my, len, w * 1.8, { rot: up, tint: p.core, alpha: 0.9 * alpha });
    stamp(g, 'beamCore', x, my, len, w * 0.8, { rot: up, tint: 0xFFFFFF, alpha });
    stamp(g, 'bloom', x, bottom, w * 3.2, w * 1.1, { tint: p.core, alpha: 0.85 * alpha });
    stamp(g, 'ringSoft', x, bottom, w * 3, w * 0.9, { tint: p.body, alpha: 0.6 * alpha });
    return;
  }
  g.rect(x - w / 2 - 2, top, w + 4, bottom - top).fill({ color: p.ink, alpha: 0.4 * alpha });
  g.rect(x - w / 2, top, w, bottom - top).fill({ color: p.body, alpha: 0.7 * alpha });
  g.rect(x - w * 0.18, top, Math.max(1, w * 0.36), bottom - top).fill({ color: p.core, alpha: 0.9 * alpha });
  // Bright edges so the column reads as light, not a solid bar, and the foe shows through
  g.rect(x - w / 2, top, 1, bottom - top).fill({ color: p.core, alpha: 0.8 * alpha });
  g.rect(x + w / 2 - 1, top, 1, bottom - top).fill({ color: p.core, alpha: 0.8 * alpha });
  g.ellipse(x, bottom, w * 0.9, w * 0.25).fill({ color: p.core, alpha: 0.8 * alpha });
}

/** Rune circle on the ground: double ellipse, rotating tick marks and an inscribed star. */
export function runeCircle(g: Graphics, x: number, y: number, r: number, rot: number, p: Pal, alpha = 1): void {
  if (r <= 1 || alpha <= 0) return;
  const ry = r * 0.32;
  if (fxReady()) {
    // Painted glyph circle (pre-squashed sprite) with the rim ticks still turning over it
    stamp(g, 'bloom', x, y, r * 2.4, ry * 2.4, { tint: p.body, alpha: 0.25 * alpha });
    stamp(g, 'runeFloor', x, y, r * 2, ry * 2, { tint: p.body, alpha });
    stamp(g, 'runeFloor', x, y, r * 1.56, ry * 1.56, { tint: p.core, alpha: 0.55 * alpha });
    for (let i = 0; i < 12; i++) {
      const a = rot + (i / 12) * Math.PI * 2;
      g.rect(x + Math.cos(a) * r * 0.89 - 1, y + Math.sin(a) * ry * 0.89 - 1, 2, 2).fill({ color: p.core, alpha });
    }
    return;
  }
  g.ellipse(x, y, r, ry).stroke({ width: 3, color: p.ink, alpha: 0.6 * alpha });
  g.ellipse(x, y, r, ry).stroke({ width: 1.5, color: p.body, alpha });
  g.ellipse(x, y, r * 0.78, ry * 0.78).stroke({ width: 1, color: p.core, alpha: 0.8 * alpha });
  for (let i = 0; i < 12; i++) {
    const a = rot + (i / 12) * Math.PI * 2;
    g.rect(x + Math.cos(a) * r * 0.89 - 1, y + Math.sin(a) * ry * 0.89 - 1, 2, 2).fill({ color: p.core, alpha });
  }
  const pts: number[] = [];
  for (let i = 0; i < 5; i++) {
    const a = rot * 0.5 + (i * 2 * (Math.PI * 2)) / 5 - Math.PI / 2;
    pts.push(x + Math.cos(a) * r * 0.74, y + Math.sin(a) * ry * 0.74);
  }
  g.poly(pts).stroke({ width: 1, color: p.body, alpha: 0.85 * alpha });
}

/** Glowing orb with ink rim, body and a highlight. */
export function orb(g: Graphics, x: number, y: number, r: number, p: Pal, alpha = 1): void {
  if (r <= 0.5 || alpha <= 0) return;
  if (fxReady()) {
    // Painted energy orb: bloom, a dark-rimmed shell, a swirling body, hot core and a specular glint
    stamp(g, 'bloom', x, y, r * 4.4, r * 4.4, { tint: p.body, alpha: 0.55 * alpha });
    g.circle(x, y, r + 1).fill({ color: p.ink, alpha: 0.55 * alpha });
    g.circle(x, y, r).fill({ color: p.body, alpha });
    if (!isPerformanceMode()) stamp(g, 'ringSoft', x, y, r * 2.2, r * 2.2, { tint: p.core, alpha: 0.7 * alpha });
    stamp(g, 'bloomHot', x - r * 0.15, y - r * 0.15, r * 2.4, r * 2.4, { tint: p.core, alpha });
    g.circle(x - r * 0.4, y - r * 0.4, Math.max(0.8, r * 0.18)).fill({ color: 0xFFFFFF, alpha });
    return;
  }
  g.circle(x, y, r + 2).fill({ color: p.ink, alpha: 0.7 * alpha });
  g.circle(x, y, r).fill({ color: p.body, alpha });
  g.circle(x - r * 0.25, y - r * 0.25, r * 0.5).fill({ color: p.core, alpha });
}

/** A fan of feathered blades (wings) spreading from (x,y); `dir` 1 = toward +x. `open` 0-1. */
export function wing(g: Graphics, x: number, y: number, span: number, dir: 1 | -1, open: number, p: Pal, alpha = 1): void {
  if (open <= 0 || alpha <= 0) return;
  if (fxReady()) {
    // Painted pinions: three ranks of shaded feathers fanned from the shoulder, longest on the outside
    for (let rank = 0; rank < 3; rank++) {
      const count = 6 - rank;
      for (let i = 0; i < count; i++) {
        const a = -Math.PI / 2 + dir * (0.3 + i * (1.5 / count)) * open;
        const len = span * (1 - i * 0.08) * (1 - rank * 0.28);
        const fx = x + Math.cos(a) * len * 0.5;
        const fy = y + Math.sin(a) * len * 0.5;
        stampPal(g, 'feather', fx, fy, Math.max(3, len * 0.28), len, rank === 2 ? { ...p, body: p.core } : p, { rot: a + Math.PI / 2, alpha: alpha * (1 - rank * 0.1) });
      }
    }
    stamp(g, 'bloom', x, y - span * 0.4, span * 1.6, span * 1.6, { tint: p.body, alpha: 0.3 * alpha * open });
    return;
  }
  for (let i = 0; i < 5; i++) {
    // Feathers fan out from straight up toward the `dir` side
    const a = -Math.PI / 2 + dir * (0.35 + i * 0.3) * open;
    const len = span * (1 - i * 0.12);
    const tipX = x + Math.cos(a) * len;
    const tipY = y + Math.sin(a) * len;
    const side = a - dir * 0.22;
    g.poly([x, y, x + Math.cos(side) * len * 0.55, y + Math.sin(side) * len * 0.55, tipX, tipY, x + Math.cos(a + dir * 0.12) * len * 0.5, y + Math.sin(a + dir * 0.12) * len * 0.5])
      .fill({ color: i % 2 ? p.body : p.core, alpha: alpha * (0.9 - i * 0.1) })
      .stroke({ width: 1, color: p.ink, alpha: 0.7 * alpha });
  }
}

/** Kettlebell: iron ball and handle with a gold rim light. */
export function kettlebell(g: Graphics, x: number, y: number, r: number, rot: number, glow: number, alpha = 1): void {
  const hx = x + Math.cos(rot - Math.PI / 2) * r * 0.95;
  const hy = y + Math.sin(rot - Math.PI / 2) * r * 0.95;
  g.circle(hx, hy, r * 0.55).stroke({ width: 4, color: INK, alpha });
  g.circle(hx, hy, r * 0.55).stroke({ width: 2, color: 0x57534E, alpha });
  g.circle(x, y, r + 2).fill({ color: INK, alpha });
  g.circle(x, y, r).fill({ color: 0x3F3F46, alpha });
  g.circle(x - r * 0.3, y - r * 0.3, r * 0.45).fill({ color: 0x71717A, alpha });
  g.circle(x, y, r).stroke({ width: 1.5, color: glow, alpha });
  if (fxReady()) {
    // Cast-iron sheen and the element's light wrapping its rim
    g.circle(x - r * 0.4, y - r * 0.45, Math.max(0.8, r * 0.16)).fill({ color: 0xE4E4E7, alpha });
    stamp(g, 'ringSoft', x, y, r * 2.9, r * 2.9, { tint: glow, alpha: 0.75 * alpha });
  }
}

/** Closing jaws (two arcs of fangs) around (x,y); `t` 0 = wide open, 1 = shut. */
export function jaws(g: Graphics, x: number, y: number, t: number, size: number, p: Pal, alpha = 1): void {
  const gap = lerp(size * 1.1, 2, t);
  const r = size;
  for (const side of [-1, 1] as const) {
    const cy = y + side * gap;
    const acy = cy - side * size * 0.5;
    const a0 = side < 0 ? 0.15 * Math.PI : 1.15 * Math.PI;
    const a1 = side < 0 ? 0.85 * Math.PI : 1.85 * Math.PI;
    // arc() continues the current path, so start each stroke at the arc's first point
    for (const [w, color] of [[6, p.ink], [3, p.body]] as const) {
      g.moveTo(x + Math.cos(a0) * r, acy + Math.sin(a0) * r).arc(x, acy, r, a0, a1).stroke({ width: w, color, alpha: 0.95 * alpha });
    }
    for (let k = -2.5; k <= 2.5; k++) {
      const fx = x + k * size * 0.3;
      const len = size * 0.42 - Math.abs(k) * size * 0.05;
      // Shaded fangs (the shard sprite, tip toward the other jaw); flat triangles until the pages load
      if (!stampPal(g, 'iceShard', fx, cy, 7, len + 2, p, { ay: 1, rot: side < 0 ? Math.PI : 0, alpha })) {
        g.poly([fx - 3, cy, fx + 3, cy, fx, cy - side * len]).fill({ color: p.core, alpha }).stroke({ width: 1, color: p.ink, alpha });
      }
    }
  }
}

/** Straight energy lance from (x0,y0) to (x1,y1), `w` thick, tapering at the tip. */
export function lance(g: Graphics, x0: number, y0: number, x1: number, y1: number, w: number, p: Pal, alpha = 1): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const quad = (hw: number, color: number, a: number) => {
    g.poly([x0 + nx * hw, y0 + ny * hw, x1, y1, x0 - nx * hw, y0 - ny * hw, x0 - dx * 0.04, y0 - dy * 0.04]).fill({ color, alpha: a });
  };
  if (!fxReady()) {
    quad(w / 2 + 2, p.ink, 0.7 * alpha);
    quad(w / 2, p.body, alpha);
    quad(Math.max(0.6, w * 0.18), p.core, alpha);
    return;
  }
  // Painted: a beam of haze along the shaft, a slim ink edge, the tapered body, a white-hot spine, a flare at the point
  const rot = Math.atan2(dy, dx);
  stamp(g, 'beam', (x0 + x1) / 2, (y0 + y1) / 2, len, w * 2.8, { rot, tint: p.body, alpha: 0.45 * alpha });
  quad(w / 2 + 1, p.ink, 0.45 * alpha);
  quad(w / 2, p.body, alpha);
  quad(Math.max(0.6, w * 0.22), p.core, alpha);
  stamp(g, 'beamCore', (x0 + x1) / 2, (y0 + y1) / 2, len * 0.9, Math.max(2, w * 0.5), { rot, tint: 0xFFFFFF, alpha: 0.8 * alpha });
  stamp(g, 'flare', x1, y1, w * 3 + 6, w * 3 + 6, { tint: p.core, alpha, rot });
}

/**
 * A shaded tube through `pts` (head first), `widths[i]` px wide at each point: ink contour, the body, a dark
 * belly on the side away from the upper-left light, a lit ridge and a glossy highlight on the near side.
 * Tentacles, serpents, roots, ropes of ooze.
 */
export function tube(g: Graphics, pts: readonly { x: number; y: number }[], widths: readonly number[], p: Pal, alpha = 1, gloss = true): void {
  const n = pts.length;
  if (n < 2 || alpha <= 0) return;
  const seg = (i: number, off: number, wScale: number, extra: number, color: number, a: number) => {
    const p0 = pts[i];
    const p1 = pts[i - 1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const l = Math.hypot(dx, dy) || 1;
    let nx = -dy / l;
    let ny = dx / l;
    if (nx * -0.6 + ny * -0.8 < 0) {
      nx = -nx;
      ny = -ny;
    }
    const w = (widths[i] + widths[i - 1]) / 2;
    const o = off * w;
    g.moveTo(p0.x + nx * o, p0.y + ny * o).lineTo(p1.x + nx * o, p1.y + ny * o).stroke({ width: Math.max(0.6, w * wScale + extra), color, alpha: a * alpha, cap: 'round' });
  };
  const belly = blend(p.body, p.ink, 0.55);
  for (let i = n - 1; i >= 1; i--) seg(i, 0, 1, 3, p.ink, 0.9);
  for (let i = n - 1; i >= 1; i--) seg(i, 0, 1, 0, p.body, 1);
  for (let i = n - 1; i >= 1; i--) seg(i, -0.24, 0.42, 0, belly, 0.9);
  for (let i = n - 1; i >= 1; i--) seg(i, 0.2, 0.32, 0, blend(p.body, p.core, 0.55), 0.95);
  if (gloss) for (let i = n - 1; i >= 1; i -= 2) seg(i, 0.28, 0.1, 0.4, 0xFFFFFF, 0.55);
}

/**
 * A licking flame rising `h` px from (x, groundY), `w` px wide at its base: an animated painted flame (frame
 * from `f`, offset by `seed` so neighbours flicker apart) in the palette's colours, or a stacked triangle while
 * the sprite pages load.
 */
export function flameTongue(g: Graphics, x: number, groundY: number, h: number, w: number, p: Pal, f: number, seed = 0, alpha = 1): void {
  if (h <= 0.5 || alpha <= 0) return;
  const frame = `${h > 28 ? 'blaze' : 'flame'}${((Math.floor(f / 3 + seed * 1.7) % 4) + 4) % 4}`; // tall fire gets the bigger sprite; seed may be negative
  if (fxReady()) {
    const fw = Math.max(w * 2.2, h * 0.42); // keep the sprite's proportions so it never stretches into bars
    stamp(g, `${frame}.ink`, x, groundY + 1, fw, h * 1.1, { ay: 1, tint: p.ink, alpha: alpha * 0.8 });
    stamp(g, `${frame}.body`, x, groundY + 1, fw, h * 1.1, { ay: 1, tint: p.body, alpha });
    stamp(g, `${frame}.core`, x, groundY + 1, fw, h * 1.1, { ay: 1, tint: p.core, alpha });
    stamp(g, `${frame}.hot`, x, groundY + 1, fw, h * 1.1, { ay: 1, tint: 0xFFFFFF, alpha });
    return;
  }
  g.poly([x - w, groundY, x, groundY - h, x + w, groundY]).fill({ color: p.body, alpha: 0.85 * alpha });
  g.poly([x - w * 0.6, groundY, x, groundY - h * 0.6, x + w * 0.6, groundY]).fill({ color: p.core, alpha });
}

/** Scorch / crater decal on the ground. */
export function scorch(g: Graphics, x: number, y: number, r: number, color: number, alpha = 1): void {
  if (fxReady()) {
    // Painted burn: a mottled soot decal and the last of the heat glowing in its middle
    stamp(g, 'scorch', x, y, r * 2.2, r * 0.75, { tint: INK, alpha: 0.85 * alpha });
    stamp(g, 'bloom', x, y, r * 1.2, r * 0.36, { tint: color, alpha: 0.55 * alpha });
    return;
  }
  g.ellipse(x, y, r, r * 0.3).fill({ color: INK, alpha: 0.55 * alpha });
  g.ellipse(x, y, r * 0.65, r * 0.18).fill({ color, alpha: 0.5 * alpha });
}
