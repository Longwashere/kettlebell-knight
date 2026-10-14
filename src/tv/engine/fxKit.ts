/**
 * Pixel-VFX drawing primitives for choreographed moves (knightMoves.ts).
 *
 * Every shape follows the battle look: a dark ink contour, a saturated body and a hot core. `Pal` is
 * that trio. Functions draw into a caller-owned Graphics (usually from `drawSpan`, cleared every frame)
 * and never allocate display objects, so they're cheap to redraw at 60 fps on the Fire TV.
 */
import type { Graphics } from 'pixi.js';
import { INK, BONE, lerp } from './choreo';

/** Ink contour, saturated body, hot core. */
export interface Pal {
  ink: number;
  body: number;
  core: number;
}

export const pal = (body: number, core: number = BONE, ink: number = INK): Pal => ({ ink, body, core });

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
  layer(r + 2, thick + 4, p.ink, 0.85 * alpha);
  layer(r, thick, p.body, 0.95 * alpha);
  layer(r - 1, Math.max(1, thick * 0.35), p.core, alpha);
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
  star(r + 3, p.ink, 0.8 * alpha);
  star(r, p.body, alpha);
  star(r * 0.55, p.core, alpha);
}

/** Flattened ground ring (perspective ellipse), e.g. a shockwave front. */
export function groundRing(g: Graphics, x: number, y: number, r: number, width: number, color: number, alpha = 1): void {
  if (r <= 0.5 || alpha <= 0) return;
  const ry = Math.min(r * 0.28, 22); // stays a band on the floor even when it sweeps the whole arena
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
  path();
  g.stroke({ width: width + 3, color: p.ink, alpha: 0.7 * alpha });
  path();
  g.stroke({ width, color: p.body, alpha });
  path();
  g.stroke({ width: Math.max(1, width * 0.4), color: p.core, alpha });
}

/** Rock / crystal spike rising from the ground, lit on its left face. */
export function spike(g: Graphics, x: number, groundY: number, h: number, w: number, fill: number, edge: number, tip = BONE): void {
  if (h <= 0.5) return;
  g.poly([x - w, groundY, x - w * 0.3, groundY - h * 0.55, x, groundY - h, x + w * 0.35, groundY - h * 0.5, x + w, groundY])
    .fill({ color: fill }).stroke({ width: 2, color: INK });
  g.poly([x - w * 0.7, groundY, x - w * 0.25, groundY - h * 0.55, x, groundY - h, x - w * 0.05, groundY]).fill({ color: edge, alpha: 0.85 });
  g.moveTo(x - w * 0.3, groundY - h * 0.55).lineTo(x, groundY - h).stroke({ width: 1, color: tip, alpha: 0.7 });
}

/** Faceted crystal shard (sharper and glassier than `spike`). */
export function crystal(g: Graphics, x: number, groundY: number, h: number, w: number, p: Pal, lean = 0, alpha = 1): void {
  if (h <= 0.5) return;
  const tx = x + lean;
  g.poly([x - w, groundY, tx - w * 0.2, groundY - h * 0.8, tx, groundY - h, tx + w * 0.25, groundY - h * 0.78, x + w, groundY])
    .fill({ color: p.body, alpha }).stroke({ width: 2, color: p.ink, alpha });
  g.poly([x - w * 0.6, groundY, tx - w * 0.15, groundY - h * 0.75, tx, groundY - h, x - w * 0.05, groundY]).fill({ color: p.core, alpha: 0.55 * alpha });
}

/** Vertical light column from `top` to `bottom`, `w` wide, with a hot core and ink edges. */
export function pillar(g: Graphics, x: number, top: number, bottom: number, w: number, p: Pal, alpha = 1): void {
  if (w <= 0.5 || alpha <= 0) return;
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
  g.circle(x, y, r + 2).fill({ color: p.ink, alpha: 0.7 * alpha });
  g.circle(x, y, r).fill({ color: p.body, alpha });
  g.circle(x - r * 0.25, y - r * 0.25, r * 0.5).fill({ color: p.core, alpha });
}

/** A fan of feathered blades (wings) spreading from (x,y); `dir` 1 = toward +x. `open` 0-1. */
export function wing(g: Graphics, x: number, y: number, span: number, dir: 1 | -1, open: number, p: Pal, alpha = 1): void {
  if (open <= 0 || alpha <= 0) return;
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
      g.poly([fx - 3, cy, fx + 3, cy, fx, cy - side * len]).fill({ color: p.core, alpha }).stroke({ width: 1, color: p.ink, alpha });
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
  quad(w / 2 + 2, p.ink, 0.7 * alpha);
  quad(w / 2, p.body, alpha);
  quad(Math.max(0.6, w * 0.18), p.core, alpha);
}

/** Scorch / crater decal on the ground. */
export function scorch(g: Graphics, x: number, y: number, r: number, color: number, alpha = 1): void {
  g.ellipse(x, y, r, r * 0.3).fill({ color: INK, alpha: 0.55 * alpha });
  g.ellipse(x, y, r * 0.65, r * 0.18).fill({ color, alpha: 0.5 * alpha });
}
