/**
 * Cinematic kit for weapon spells (spellMoves.ts, secretSpellMoves.ts): the beats that sell a spell as a set
 * piece rather than a swing with sparks.
 *
 *   impactFrame   the anime contact frame: the field inverts (black silhouettes on white), holds through the
 *                 hit-stop, then flips to white figures on black with focus lines, and the scene comes back
 *   lightSpan     drawSpan on an additive Graphics, so light brightens what's under it instead of painting it
 *   glow / godRay / glint / skyBolt / shockSphere / groundCracks / ribbon / focusLines   light and force shapes
 *   speedLines    focus lines streaming in on a point (dashes, wind-ups, dives)
 *   windUp        the anticipation beat: camera pushes in, the weapon swells with light, motes converge
 *
 * Light layers thin out under the PERFORMANCE graphics setting (the stick is GPU-bound): glow draws fewer rings
 * and focus lines fewer spokes.
 */
import type { Graphics } from 'pixi.js';
import { isPerformanceMode } from '../graphicsMode';
import { Timeline, lerp, easeIn, easeOut, rand, INK } from './choreo';
import { type Pal, hash } from './fxKit';
import { type KnightMoveHost, type P, drawSpan, once, chargeSound } from './knightKit';

/** PERFORMANCE graphics: fewer light layers. */
export const lite = () => isPerformanceMode();

/** drawSpan on an additive Graphics: light that brightens what's under it. */
export function lightSpan(h: KnightMoveHost, tl: Timeline, from: number, to: number, draw: (g: Graphics, t: number, f: number) => void, layer: 'fx' | 'back' | 'ground' = 'fx') {
  let g: Graphics | null = null;
  tl.during(from, to, (t, f) => {
    if (!g) {
      g = h.gfx(layer);
      g.blendMode = 'add';
    }
    g.clear();
    if (t < 1) draw(g, t, f);
  });
}

/** Soft bloom: concentric discs fading out from a hot core. Best on an additive Graphics (lightSpan). */
export function glow(g: Graphics, x: number, y: number, r: number, color: number, alpha = 1, core = 0xFFFFFF) {
  if (r <= 0.5 || alpha <= 0) return;
  const rings = lite() ? 2 : 4;
  for (let k = 0; k < rings; k++) {
    const u = k / rings;
    g.circle(x, y, r * (1 - u * 0.7)).fill({ color, alpha: (0.1 + 0.08 * k) * alpha });
  }
  g.circle(x, y, r * 0.22).fill({ color: core, alpha: 0.75 * alpha });
}

/** Soft shaft of light from `top` to `bottom`, `wTop`/`wBot` wide: a wide haze, a body and a white core. */
export function godRay(g: Graphics, x: number, top: number, bottom: number, wTop: number, wBot: number, color: number, alpha = 1) {
  if (alpha <= 0 || wBot <= 0.3) return;
  for (const [s, a, c] of [[2.2, 0.1, color], [1, 0.32, color], [0.3, 0.85, 0xFFFFFF]] as const) {
    g.poly([x - (wTop * s) / 2, top, x + (wTop * s) / 2, top, x + (wBot * s) / 2, bottom, x - (wBot * s) / 2, bottom]).fill({ color: c, alpha: a * alpha });
  }
  g.ellipse(x, bottom, wBot * 1.2, Math.max(2, wBot * 0.3)).fill({ color, alpha: 0.45 * alpha });
}

/** Four-point sparkle (long vertical spike): a glint of light. */
export function glint(g: Graphics, x: number, y: number, r: number, rot: number, color: number, alpha = 1) {
  if (r <= 0.5 || alpha <= 0) return;
  const star = (rr: number, w: number, c: number, a: number) => {
    const pts: number[] = [];
    for (let i = 0; i < 8; i++) {
      const ang = rot + (i * Math.PI) / 4;
      const len = i % 2 ? w : i % 4 === 2 ? rr : rr * 0.65;
      pts.push(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    }
    g.poly(pts).fill({ color: c, alpha: a });
  };
  star(r, Math.max(1, r * 0.14), color, 0.7 * alpha);
  star(r * 0.6, Math.max(0.6, r * 0.07), 0xFFFFFF, alpha);
  g.circle(x, y, Math.max(1, r * 0.16)).fill({ color: 0xFFFFFF, alpha });
}

/**
 * Radial focus lines around (x, y): thin wedges pointing at it from `inner` out past the screen edge. `seed`
 * reshuffles them (pass the frame so they flicker like hand-drawn lines).
 */
export function focusLines(g: Graphics, x: number, y: number, seed: number, color: number, alpha = 1, o: { inner?: number; n?: number; width?: number; outer?: number } = {}) {
  if (alpha <= 0) return;
  const n = Math.round((o.n ?? 26) * (lite() ? 0.6 : 1));
  const inner = o.inner ?? 34;
  const outer = o.outer ?? 320;
  const w = o.width ?? 3;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + (hash(seed * 7 + k) - 0.5) * 0.35;
    const r0 = inner * (0.8 + 0.6 * hash(seed * 3 + k * 11));
    // Angular half-width so a spoke is ~`w` px wide where it leaves the screen, a needle at its inner end
    const half = (w * (0.5 + hash(k * 5 + seed))) / outer;
    g.poly([
      x + Math.cos(a) * r0, y + Math.sin(a) * r0,
      x + Math.cos(a - half) * outer, y + Math.sin(a - half) * outer,
      x + Math.cos(a + half) * outer, y + Math.sin(a + half) * outer,
    ]).fill({ color, alpha: alpha * (0.45 + 0.55 * hash(k + seed * 13)) });
  }
}

/** Focus lines streaming in on a point over [from, to], fading in and out. */
export function speedLines(h: KnightMoveHost, tl: Timeline, from: number, to: number, at: () => P, color = 0xFFFFFF, o: { alpha?: number; inner?: number; n?: number } = {}) {
  drawSpan(h, tl, from, to, (g, t, f) => {
    const c = at();
    const a = (o.alpha ?? 0.5) * Math.min(1, t * 5) * (t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1);
    focusLines(g, c.x, c.y, Math.floor(f / 2), color, a, { inner: o.inner ?? 60, n: o.n ?? 22, width: 3 });
  });
}

/**
 * The impact frame. Call it inside the contact event (after land(), which sets the hit-stop): the field turns
 * `color` behind the fighters and every figure goes black, a silhouette frozen for the whole hit-stop; when time
 * resumes it flips to white figures on black with a burst of focus lines, then the scene returns at `dim`
 * (the move's ambient dim, [alpha, color]). `hold` is how many frames the negative flip lasts.
 */
export function impactFrame(h: KnightMoveHost, tl: Timeline, where: P, o: { color?: number; dim?: [number, number]; hold?: number; lines?: number; targets?: number[]; knight?: boolean } = {}) {
  const color = o.color ?? 0xFFFFFF;
  const hold = o.hold ?? 3;
  const idx = o.targets ?? h.targets.map((_, i) => i);
  const now = tl.frame;
  // Phase 1 (frozen with the hit-stop): bright field, black silhouettes
  h.dim(0.92, mix(color, 0xFFFFFF, 0.55));
  for (const i of idx) h.flashTarget(i, 0x000000, 1, true);
  if (o.knight !== false) h.tint(0x000000);
  // Phase 2: black field, the struck burning white, focus lines
  tl.at(now + 1, () => {
    h.dim(0.94, 0x000000);
    for (const i of idx) h.flashTarget(i, 0xFFFFFF, hold + 1);
    if (o.knight !== false) {
      h.tint(0xFFFFFF);
      h.ghost(color, 0.7, hold + 4);
    }
  });
  lightSpan(h, tl, now + 1, now + 2 + hold, (g, t) => {
    for (const i of idx) {
      const tg = h.targets[i];
      if (tg) glow(g, tg.x - 4, tg.y - tg.height * 0.5, tg.height * 0.8, color, 1 - t * 0.6);
    }
  });
  drawSpan(h, tl, now + 1, now + 1 + hold + 6, (g, t, f) => {
    focusLines(g, where.x, where.y, f, f < hold ? 0xFFFFFF : color, (1 - t) * (o.lines ?? 0.85), { inner: 26 + 50 * t, n: 34, width: 5 });
  });
  tl.at(now + 1 + hold, () => h.dim(o.dim?.[0] ?? 0, o.dim?.[1] ?? 0x000000));
}

/** A sphere of force swelling from (x, y): a bright shell, a two-tone chromatic rim and a hot core. Additive. */
export function shockSphere(h: KnightMoveHost, tl: Timeline, at: number, where: P | (() => P), r1: number, color: number, dur = 16, rim = 0xFFFFFF) {
  const pt = once(where);
  lightSpan(h, tl, at, at + dur, (g, t) => {
    const c = pt();
    const r = r1 * easeOut(t);
    const a = 1 - t;
    g.circle(c.x, c.y, r).fill({ color, alpha: 0.16 * a });
    g.circle(c.x - 1.5, c.y, r).stroke({ width: 3 * a + 1, color, alpha: 0.8 * a });
    g.circle(c.x + 1.5, c.y, r * 0.97).stroke({ width: 1.5 * a + 0.5, color: rim, alpha: 0.9 * a });
    if (t < 0.35) glow(g, c.x, c.y, r1 * 0.5 * (1 - t / 0.35), color, 1 - t / 0.35);
  });
}

/**
 * Branching lightning from (x0,y0) to (x1,y1) with a glow halo; `seed` re-rolls the jags (pass the frame to
 * crackle). Draw it on an additive Graphics for the halo to bloom.
 */
export function skyBolt(g: Graphics, x0: number, y0: number, x1: number, y1: number, seed: number, p: Pal, width = 3, alpha = 1) {
  if (alpha <= 0) return;
  const segs = Math.max(6, Math.round(Math.hypot(x1 - x0, y1 - y0) / 12));
  const jag = Math.min(18, Math.hypot(x1 - x0, y1 - y0) * 0.08 + 4);
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
  const path = (from = 0, to = pts.length / 2 - 1) => {
    g.moveTo(pts[from * 2], pts[from * 2 + 1]);
    for (let i = from + 1; i <= to; i++) g.lineTo(pts[i * 2], pts[i * 2 + 1]);
  };
  // Halo, body, white-hot core
  path();
  g.stroke({ width: width * 5, color: p.body, alpha: 0.18 * alpha });
  path();
  g.stroke({ width: width + 2, color: p.body, alpha: 0.85 * alpha });
  path();
  g.stroke({ width: Math.max(1, width * 0.5), color: 0xFFFFFF, alpha });
  // Forks off the main channel
  for (let b = 0; b < 3; b++) {
    const i = 1 + Math.floor(hash(seed * 5 + b) * (segs - 2));
    const bx = pts[i * 2];
    const by = pts[i * 2 + 1];
    const ang = Math.atan2(dy, dx) + (hash(seed + b * 3) > 0.5 ? 1 : -1) * (0.5 + hash(seed * 2 + b) * 0.6);
    const bl = len * (0.12 + hash(seed * 9 + b) * 0.14);
    let px = bx;
    let py = by;
    g.moveTo(px, py);
    for (let k = 1; k <= 3; k++) {
      px = bx + Math.cos(ang) * bl * (k / 3) + (hash(seed * 17 + b * 7 + k) - 0.5) * 8;
      py = by + Math.sin(ang) * bl * (k / 3) + (hash(seed * 19 + b * 7 + k) - 0.5) * 8;
      g.lineTo(px, py);
    }
    g.stroke({ width: Math.max(1, width * 0.5), color: p.core, alpha: 0.8 * alpha });
  }
}

/** Radial cracks splitting the floor out from (x, y), lit from inside; `grow` 0-1 runs them out. Ground layer. */
export function groundCracks(g: Graphics, x: number, y: number, r: number, n: number, seed: number, p: Pal, grow = 1, alpha = 1) {
  if (alpha <= 0 || grow <= 0) return;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + hash(seed + k) * 0.6;
    const len = r * (0.55 + 0.45 * hash(seed * 3 + k)) * grow;
    const pts: number[] = [x, y];
    for (let s = 1; s <= 4; s++) {
      const u = s / 4;
      const j = (hash(seed * 7 + k * 5 + s) - 0.5) * 6;
      pts.push(x + Math.cos(a) * len * u + j, y + Math.sin(a) * len * u * 0.3 + j * 0.3);
    }
    const path = () => {
      g.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    };
    path();
    g.stroke({ width: 3.5, color: p.ink, alpha: 0.9 * alpha });
    path();
    g.stroke({ width: 1.8, color: p.body, alpha });
    path();
    g.stroke({ width: 0.8, color: p.core, alpha });
  }
  g.ellipse(x, y, r * 0.35 * grow, r * 0.1 * grow).fill({ color: p.body, alpha: 0.5 * alpha });
}

/** Tapered ribbon through `pts` (head first): comet tails, wakes, sword trails. */
export function ribbon(g: Graphics, pts: readonly P[], w: number, p: Pal, alpha = 1) {
  const n = pts.length;
  if (n < 2 || alpha <= 0) return;
  for (const [scale, color, a] of [[1.6, p.ink, 0.5], [1, p.body, 0.85], [0.35, p.core, 1]] as const) {
    for (let i = n - 1; i >= 1; i--) {
      const u = 1 - i / n;
      g.moveTo(pts[i].x, pts[i].y).lineTo(pts[i - 1].x, pts[i - 1].y).stroke({ width: Math.max(0.5, w * u * scale), color, alpha: a * alpha * (0.3 + 0.7 * u), cap: 'round' });
    }
  }
}

/** Keeps the last `n` positions of something moving (head first), for ribbon(). */
export function history(n = 12) {
  const pts: P[] = [];
  return {
    pts,
    push(p: P) {
      pts.unshift({ x: p.x, y: p.y });
      if (pts.length > n) pts.length = n;
    },
  };
}

/**
 * The anticipation beat over [from, to]: the camera pushes in on the knight, light swells on the weapon head
 * and motes stream into it. `slow` slows the rig (restored at `to`).
 */
export function windUp(h: KnightMoveHost, tl: Timeline, from: number, to: number, color: number, o: { zoom?: number; slow?: number; at?: () => P; sound?: boolean; reach?: number } = {}) {
  const at = o.at ?? (() => h.weaponTip());
  tl.at(from, () => {
    const p = h.pos();
    h.camera(o.zoom ?? 1.22, p.x + 16, p.y - 34, to - from + 4);
    if (o.slow) h.animSpeed(o.slow);
    if (o.sound !== false && to - from >= 12) chargeSound(h, to - from, 0.6);
  });
  if (o.slow) tl.at(to, () => h.animSpeed(1));
  const reach = o.reach ?? 46;
  lightSpan(h, tl, from, to, (g, t, f) => {
    const c = at();
    glow(g, c.x, c.y, 8 + 22 * easeIn(t) + Math.sin(f * 0.9) * 2, color, 0.5 + 0.5 * t);
    for (let k = 0; k < (lite() ? 6 : 10); k++) {
      const ph = (f / 16 + k / 10) % 1;
      const a = k * 2.4 + f * 0.05;
      const r = reach * (1 - easeIn(ph));
      const x = c.x + Math.cos(a) * r;
      const y = c.y + Math.sin(a) * r * 0.8;
      const x2 = c.x + Math.cos(a) * (r + 6 + 6 * t);
      const y2 = c.y + Math.sin(a) * (r + 6 + 6 * t) * 0.8;
      g.moveTo(x, y).lineTo(x2, y2).stroke({ width: 1.5, color, alpha: ph });
    }
    if (t > 0.75) glint(g, c.x, c.y, 18 * (t - 0.75) / 0.25 + 4, f * 0.1, color, (t - 0.75) / 0.25);
  });
}

/** Chunky rubble thrown up from (x, y): big rocks that fall hard, plus grit. */
export function rubble(h: KnightMoveHost, c: P, n: number, colors: number[], power = 1) {
  h.emit(c.x, c.y, { count: Math.ceil(n / 2), colors, speed: [2 * power, 4.5 * power], angle: -Math.PI / 2, spread: 0.8, gravity: 0.28, size: 5, life: [18, 32] });
  h.emit(c.x, c.y, { count: n, colors: [...colors, INK], speed: [1 * power, 3.5 * power], angle: -Math.PI / 2, spread: 1.2, gravity: 0.2, size: 2, life: [14, 26] });
}

/** Lingering embers/motes drifting up over an area after a hit. */
export function afterglow(h: KnightMoveHost, tl: Timeline, from: number, to: number, x: number, y: number, colors: number[], spread = 18) {
  tl.every(from, to, 3, () => h.emit(x + rand(-spread, spread), y + rand(-6, 4), { count: 1, colors, speed: [0.2, 0.7], angle: -Math.PI / 2, spread: 0.5, gravity: -0.02, size: 2, life: [18, 30] }));
}

/** Darkening ramp helper: dims to `alpha` over [from, from+ramp], back to 0 over [to-ramp, to]. */
export function dimScene(h: KnightMoveHost, tl: Timeline, from: number, to: number, alpha: number, color: number, ramp = 14) {
  tl.during(from, from + ramp, (t) => h.dim(alpha * t, color));
  tl.during(to - ramp, to, (t) => h.dim(alpha * (1 - t), color));
}

/** Colour ramp from `a` to `b` (0xRRGGBB), for heating metal or cooling fire. */
export function mix(a: number, b: number, t: number): number {
  const u = Math.max(0, Math.min(1, t));
  const r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, u));
  const g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, u));
  const bl = Math.round(lerp(a & 255, b & 255, u));
  return (r << 16) | (g << 8) | bl;
}

/** An additive light ribbon chasing a moving point (default: the weapon head) over [from, to]. */
export function weaponTrail(h: KnightMoveHost, tl: Timeline, from: number, to: number, p: Pal, w = 8, n = 6, at: () => P = () => h.weaponTip()) {
  const tr = history(n);
  lightSpan(h, tl, from, to, (g, t) => {
    tr.push(at());
    ribbon(g, tr.pts, w, p, 0.9 * (t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1));
  });
}

/** Pulsing warning ring on the floor under a point (incoming strike). Ground layer. */
export function targetRing(h: KnightMoveHost, tl: Timeline, from: number, to: number, x: number, y: number, r: number, color: number) {
  lightSpan(h, tl, from, to, (g, t, f) => {
    const pulse = 0.6 + 0.4 * Math.sin(f * 0.6);
    const rr = lerp(r * 1.6, r, easeIn(t));
    g.ellipse(x, y, rr, rr * 0.28).stroke({ width: 2, color, alpha: pulse });
    g.ellipse(x, y, rr * 0.6, rr * 0.17).stroke({ width: 1, color: 0xFFFFFF, alpha: pulse * 0.8 });
    g.ellipse(x, y, rr * 0.9, rr * 0.25).fill({ color, alpha: 0.12 * t });
  }, 'ground');
}
