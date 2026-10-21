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
 *   chargeUp / castCircle / aura / motes / breath / dutch / signature   the director beats (bottom of file):
 *                 the element's look through the charge, the held breath, a camera roll, the element's burst
 *
 * Light layers thin out under the PERFORMANCE graphics setting (the stick is GPU-bound): glow draws fewer rings
 * and focus lines fewer spokes.
 *
 * With the painted sprite pages up (fxAtlas.ts) the light shapes, motifs, rune circles, aura flames and element
 * bursts stamp soft blooms, flares, beams and shaded sprites; the vector drawing stays as the loading fallback.
 */
import type { Graphics } from 'pixi.js';
import { isPerformanceMode } from '../graphicsMode';
import { Timeline, type SfxName, shifted, lerp, easeIn, easeOut, arc, rand, INK } from './choreo';
import { type Pal, pal, palOf, blend, hash, starburst } from './fxKit';
import { stamp, stampPal, fxReady, seq } from './fxAtlas';
import { type KnightMove, type KnightMoveHost, type P, drawSpan, once, chargeSound } from './knightKit';

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
  if (fxReady()) {
    stamp(g, 'bloom', x, y, r * 2.4, r * 2.4, { tint: color, alpha: 0.85 * alpha });
    if (!lite()) stamp(g, 'bloom', x, y, r * 1.1, r * 1.1, { tint: blend(color, core, 0.3), alpha: 0.55 * alpha });
    stamp(g, 'bloomHot', x, y, r * 0.95, r * 0.95, { tint: core, alpha: 0.9 * alpha });
    return;
  }
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
  if (fxReady()) {
    // A haze beam, the widening shaft, a white-hot core and a pool of light where it lands
    const len = bottom - top;
    const my = (top + bottom) / 2;
    stamp(g, 'beam', x, my, len, Math.max(wTop, wBot) * 2.4, { rot: Math.PI / 2, tint: color, alpha: 0.4 * alpha });
    g.poly([x - wTop / 2, top, x + wTop / 2, top, x + wBot / 2, bottom, x - wBot / 2, bottom]).fill({ color, alpha: 0.22 * alpha });
    stamp(g, 'beamCore', x, my, len, Math.max(2, Math.min(wTop, wBot) * 0.9 + 2), { rot: Math.PI / 2, tint: 0xFFFFFF, alpha: 0.85 * alpha });
    stamp(g, 'bloom', x, bottom, wBot * 2.6, Math.max(5, wBot * 0.75), { tint: color, alpha: 0.7 * alpha });
    return;
  }
  for (const [s, a, c] of [[2.2, 0.1, color], [1, 0.32, color], [0.3, 0.85, 0xFFFFFF]] as const) {
    g.poly([x - (wTop * s) / 2, top, x + (wTop * s) / 2, top, x + (wBot * s) / 2, bottom, x - (wBot * s) / 2, bottom]).fill({ color: c, alpha: a * alpha });
  }
  g.ellipse(x, bottom, wBot * 1.2, Math.max(2, wBot * 0.3)).fill({ color, alpha: 0.45 * alpha });
}

/** Four-point sparkle (long vertical spike): a glint of light. */
export function glint(g: Graphics, x: number, y: number, r: number, rot: number, color: number, alpha = 1) {
  if (r <= 0.5 || alpha <= 0) return;
  if (fxReady()) {
    stamp(g, 'flare', x, y, r * 2.6, r * 2.6, { tint: color, alpha: 0.9 * alpha, rot });
    stamp(g, 'flare', x, y, r * 1.5, r * 1.5, { tint: 0xFFFFFF, alpha, rot });
    stamp(g, 'bloomHot', x, y, r * 0.8, r * 0.8, { tint: 0xFFFFFF, alpha });
    return;
  }
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
    if (fxReady()) {
      // A bright soft shell and a crisp chromatic rim
      stamp(g, 'bloom', c.x, c.y, r * 2.2, r * 2.2, { tint: color, alpha: 0.3 * a });
      stamp(g, 'ringSoft', c.x, c.y, (r * 2) / 0.7, (r * 2) / 0.7, { tint: color, alpha: 0.75 * a });
      g.circle(c.x - 1, c.y, r).stroke({ width: 1.5 * a + 0.5, color, alpha: 0.7 * a });
      g.circle(c.x + 1, c.y, r * 0.98).stroke({ width: a + 0.5, color: rim, alpha: 0.9 * a });
      if (t < 0.35) glow(g, c.x, c.y, r1 * 0.5 * (1 - t / 0.35), color, 1 - t / 0.35);
      return;
    }
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
  if (fxReady()) {
    if (!lite()) for (let i = 2; i < pts.length - 2; i += 4) stamp(g, 'bloom', pts[i], pts[i + 1], width * 6, width * 6, { tint: p.body, alpha: 0.35 * alpha });
    stamp(g, 'flare', x1, y1, width * 8, width * 8, { tint: p.core, alpha, rot: hash(seed) * 3 });
    stamp(g, 'bloomHot', x0, y0, width * 4, width * 4, { tint: p.core, alpha: 0.8 * alpha });
  }
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
  if (fxReady()) stamp(g, 'bloom', x, y, r * 1.1 * grow, r * 0.32 * grow, { tint: p.body, alpha: 0.75 * alpha });
  else g.ellipse(x, y, r * 0.35 * grow, r * 0.1 * grow).fill({ color: p.body, alpha: 0.5 * alpha });
}

/** Tapered ribbon through `pts` (head first): comet tails, wakes, sword trails. */
export function ribbon(g: Graphics, pts: readonly P[], w: number, p: Pal, alpha = 1) {
  const n = pts.length;
  if (n < 2 || alpha <= 0) return;
  if (fxReady()) stamp(g, 'bloom', pts[0].x, pts[0].y, w * 3.5, w * 3.5, { tint: p.body, alpha: 0.5 * alpha });
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

// =============================================================================================
// DIRECTOR: the element's signature and the sakuga beats around a spell (anime-spine-spell-director skill)
//
//   Look / LOOK     a spell's light, core and deep colours plus its motif (flame, snowflake, bolt, shard, leaf,
//                   cross, crescent, chevron), so every beat below reads as that element
//   castCircle      a rotating rune circle under the caster, ringed with the motif; it flares as the charge peaks
//   aura            a power-up aura: tongues of light licking up around the knight (behind the rig)
//   motes           motif glyphs spiralling into the weapon head during the charge
//   breath          the held breath before the snap: the rig freezes at the top, a glint flares on the weapon
//   dutch           a camera roll on the release (Dutch angle), springing level on its own
//   signature       the element's own burst on contact (flame crown, ice star, forked bolts, rock crown,
//                   petal storm, cross of light, implosion)
//
// All additive; the motif count thins under PERFORMANCE graphics.

export type Motif =
  | 'flame' | 'flake' | 'bolt' | 'shard' | 'leaf' | 'cross' | 'crescent' | 'chevron' // the elements
  | 'bubble' | 'coin' | 'note' | 'eye' | 'skull' | 'feather' | 'moon' | 'sun' | 'wave' | 'web' | 'bell' | 'star'; // spell themes

export interface Look {
  light: number; // the element's light
  core: number; // white-hot centre
  deep: number; // the shadow it casts / dim colour
  motif: Motif;
  sound: SfxName; // the element's voice (castCircle flare, signature)
}

export const LOOK = {
  FIRE: { light: 0xF97316, core: 0xFDE047, deep: 0x2A0A04, motif: 'flame', sound: 'fire_burst' },
  FROST: { light: 0x7DD3FC, core: 0xE0F2FE, deep: 0x06182A, motif: 'flake', sound: 'frost' },
  STORM: { light: 0x67E8F9, core: 0xFFFFFF, deep: 0x0A1230, motif: 'bolt', sound: 'zap' },
  EARTH: { light: 0xD97706, core: 0xFDE68A, deep: 0x1C1208, motif: 'shard', sound: 'rock' },
  NATURE: { light: 0x4ADE80, core: 0xD9F99D, deep: 0x06180C, motif: 'leaf', sound: 'magic' },
  HOLY: { light: 0xFBBF24, core: 0xFFFBEA, deep: 0x1F1404, motif: 'cross', sound: 'holy' },
  VOID: { light: 0xA855F7, core: 0xF5D0FE, deep: 0x0E0418, motif: 'crescent', sound: 'dark' },
  STEEL: { light: 0xCBD5E1, core: 0xFFFFFF, deep: 0x0A0D14, motif: 'chevron', sound: 'charge' },
} as const satisfies Record<string, Look>;

/** An element's look recoloured to the spell's own colour (keeps the motif, sound and white core). */
export function tinted(look: Look, light: number, deep = look.deep): Look {
  return { ...look, light, deep };
}

/** A spell's own look: its element's, with the spell's colour, motif and (optionally) voice. */
export function themed(look: Look, light: number, m: Motif, o: { core?: number; deep?: number; sound?: SfxName } = {}): Look {
  return { light, core: o.core ?? look.core, deep: o.deep ?? look.deep, motif: m, sound: o.sound ?? look.sound };
}

/** One motif glyph, `s` px tall, at (x, y). Additive-friendly (light shapes only). */
export function motif(g: Graphics, m: Motif, x: number, y: number, s: number, rot: number, color: number, alpha = 1) {
  if (alpha <= 0 || s <= 0.4) return;
  const c = Math.cos(rot);
  const sn = Math.sin(rot);
  // Local (u, v) → world, u right / v down in the glyph's frame
  const P = (u: number, v: number): [number, number] => [x + (u * c - v * sn) * s, y + (u * sn + v * c) * s];
  const poly = (pts: [number, number][], col = color, a = alpha) => g.poly(pts.flat()).fill({ color: col, alpha: a });
  const line = (a: [number, number], b: [number, number], w: number, col = color, al = alpha) => g.moveTo(a[0], a[1]).lineTo(b[0], b[1]).stroke({ width: w, color: col, alpha: al, cap: 'round' });
  if (fxReady()) {
    // Painted glyphs where a sprite fits; everything gets a bloom behind it so it reads as light
    if (!lite()) stamp(g, 'bloom', x, y, s * 1.9, s * 1.9, { tint: color, alpha: 0.4 * alpha });
    const pk = palOf(color);
    const frame = Math.floor(hash(Math.round(x * 3 + y * 7)) * 4);
    switch (m) {
      case 'flame':
        stamp(g, `flame${frame}.body`, x, y + s * 0.45, s * 0.75, s * 1.4, { ax: 0.5, ay: 1, rot, tint: color, alpha });
        stamp(g, `flame${frame}.core`, x, y + s * 0.45, s * 0.75, s * 1.4, { ax: 0.5, ay: 1, rot, tint: pk.core, alpha });
        stamp(g, `flame${frame}.hot`, x, y + s * 0.45, s * 0.75, s * 1.4, { ax: 0.5, ay: 1, rot, tint: 0xFFFFFF, alpha });
        return;
      case 'shard':
        stampPal(g, 'iceShard', x, y, s * 0.6, s * 1.3, pk, { rot, alpha });
        return;
      case 'leaf':
        stampPal(g, 'leaf', x, y, s * 1.15, s * 1.15, pk, { rot, alpha });
        return;
      case 'feather':
        stampPal(g, 'feather', x, y, s * 0.5, s * 1.6, pk, { rot, alpha });
        return;
      case 'coin':
        stampPal(g, `coin${Math.floor(Math.abs(rot * 2.5)) % 4}`, x, y, s * 0.95, s * 0.95, pk, { alpha });
        return;
      case 'bubble':
        stampPal(g, 'bubble', x, y, s, s, pk, { alpha });
        return;
      case 'flake':
        for (let k = 0; k < 3; k++) {
          const a = rot + (k * Math.PI) / 3;
          line(P(Math.cos(a - rot) * 0.6, Math.sin(a - rot) * 0.6), P(-Math.cos(a - rot) * 0.6, -Math.sin(a - rot) * 0.6), Math.max(0.6, s * 0.08), pk.core);
        }
        stamp(g, 'twinkleBig', x, y, s * 0.9, s * 0.9, { tint: 0xFFFFFF, alpha });
        return;
      case 'star':
        glint(g, x, y, s * 0.7, rot, color, alpha);
        return;
      default:
        break; // vector glyph below, over its bloom
    }
  }
  switch (m) {
    case 'flame':
      poly([P(0, -1), P(0.35, -0.2), P(0.4, 0.25), P(0, 0.55), P(-0.4, 0.25), P(-0.3, -0.25)]);
      poly([P(0, -0.35), P(0.18, 0.15), P(0, 0.4), P(-0.18, 0.15)], 0xFFFFFF, alpha * 0.8);
      break;
    case 'flake':
      for (let k = 0; k < 3; k++) {
        const a = (k * Math.PI) / 3;
        line(P(Math.cos(a) * 0.6, Math.sin(a) * 0.6), P(-Math.cos(a) * 0.6, -Math.sin(a) * 0.6), Math.max(0.8, s * 0.12));
      }
      g.circle(x, y, Math.max(0.6, s * 0.12)).fill({ color: 0xFFFFFF, alpha });
      break;
    case 'bolt':
      poly([P(0.15, -1), P(-0.35, 0.05), P(0, 0.05), P(-0.15, 1), P(0.35, -0.1), P(0, -0.1)]);
      break;
    case 'shard':
      poly([P(0, -0.8), P(0.35, 0), P(0, 0.6), P(-0.3, 0.05)]);
      poly([P(0, -0.8), P(0.35, 0), P(0, 0)], 0xFFFFFF, alpha * 0.5);
      break;
    case 'leaf':
      poly([P(0, -0.7), P(0.32, -0.25), P(0.3, 0.2), P(0, 0.6), P(-0.3, 0.2), P(-0.32, -0.25)]);
      line(P(0, -0.55), P(0, 0.55), Math.max(0.6, s * 0.06), 0xFFFFFF, alpha * 0.6);
      break;
    case 'cross':
      poly([P(0, -1), P(0.12, -0.12), P(1, 0), P(0.12, 0.12), P(0, 1), P(-0.12, 0.12), P(-1, 0), P(-0.12, -0.12)]);
      g.circle(x, y, Math.max(0.6, s * 0.15)).fill({ color: 0xFFFFFF, alpha });
      break;
    case 'crescent': {
      const pts: [number, number][] = [];
      for (let i = 0; i <= 8; i++) {
        const a = -Math.PI / 2 + (i / 8) * Math.PI;
        pts.push(P(Math.cos(a) * 0.6, Math.sin(a) * 0.6));
      }
      for (let i = 8; i >= 0; i--) {
        const a = -Math.PI / 2 + (i / 8) * Math.PI;
        pts.push(P(Math.cos(a) * 0.25, Math.sin(a) * 0.5));
      }
      poly(pts);
      break;
    }
    case 'chevron':
      poly([P(-0.5, -0.5), P(0.5, 0), P(-0.5, 0.5), P(-0.2, 0)]);
      break;
    case 'bubble':
      g.circle(x, y, s * 0.45).stroke({ width: Math.max(0.8, s * 0.1), color, alpha });
      g.circle(x - s * 0.15, y - s * 0.15, Math.max(0.5, s * 0.1)).fill({ color: 0xFFFFFF, alpha });
      break;
    case 'coin':
      g.ellipse(x, y, s * 0.45 * Math.max(0.15, Math.abs(Math.cos(rot * 2))), s * 0.45).fill({ color, alpha });
      g.ellipse(x, y, s * 0.2 * Math.max(0.15, Math.abs(Math.cos(rot * 2))), s * 0.2).fill({ color: 0xFFFFFF, alpha: alpha * 0.7 });
      break;
    case 'note':
      g.ellipse(x - s * 0.18, y + s * 0.35, s * 0.24, s * 0.17).fill({ color, alpha });
      line([x + s * 0.04, y + s * 0.35], [x + s * 0.04, y - s * 0.55], Math.max(0.8, s * 0.1));
      poly([[x + s * 0.04, y - s * 0.55], [x + s * 0.4, y - s * 0.3], [x + s * 0.04, y - s * 0.25]]);
      break;
    case 'eye':
      poly([[x - s * 0.6, y], [x - s * 0.2, y - s * 0.32], [x + s * 0.2, y - s * 0.32], [x + s * 0.6, y], [x + s * 0.2, y + s * 0.32], [x - s * 0.2, y + s * 0.32]]);
      g.circle(x, y, s * 0.18).fill({ color: 0xFFFFFF, alpha });
      break;
    case 'skull':
      g.circle(x, y - s * 0.12, s * 0.38).fill({ color, alpha });
      g.rect(x - s * 0.2, y + s * 0.15, s * 0.4, s * 0.25).fill({ color, alpha });
      g.circle(x - s * 0.14, y - s * 0.1, s * 0.1).fill({ color: 0xFFFFFF, alpha });
      g.circle(x + s * 0.14, y - s * 0.1, s * 0.1).fill({ color: 0xFFFFFF, alpha });
      break;
    case 'feather':
      poly([P(0, -0.8), P(0.22, -0.3), P(0.15, 0.4), P(0, 0.8), P(-0.15, 0.4), P(-0.22, -0.3)]);
      line(P(0, -0.7), P(0, 0.9), Math.max(0.6, s * 0.06), 0xFFFFFF, alpha * 0.7);
      break;
    case 'moon': {
      const pts: [number, number][] = [];
      for (let i = 0; i <= 10; i++) {
        const a = Math.PI * 0.3 + (i / 10) * Math.PI * 1.4;
        pts.push(P(Math.cos(a) * 0.55, Math.sin(a) * 0.55));
      }
      for (let i = 10; i >= 0; i--) {
        const a = Math.PI * 0.3 + (i / 10) * Math.PI * 1.4;
        pts.push(P(0.22 + Math.cos(a) * 0.42, Math.sin(a) * 0.42));
      }
      poly(pts);
      break;
    }
    case 'sun':
      for (let k = 0; k < 8; k++) {
        const a = rot + (k / 8) * Math.PI * 2;
        line([x + Math.cos(a) * s * 0.35, y + Math.sin(a) * s * 0.35], [x + Math.cos(a) * s * 0.65, y + Math.sin(a) * s * 0.65], Math.max(0.7, s * 0.08));
      }
      g.circle(x, y, s * 0.28).fill({ color, alpha });
      g.circle(x, y, s * 0.14).fill({ color: 0xFFFFFF, alpha });
      break;
    case 'wave':
      g.moveTo(x - s * 0.6, y + s * 0.15);
      for (let i = 1; i <= 8; i++) g.lineTo(x - s * 0.6 + (i / 8) * s * 1.2, y + s * 0.15 - Math.sin((i / 8) * Math.PI * 2) * s * 0.25);
      g.stroke({ width: Math.max(0.8, s * 0.12), color, alpha, cap: 'round' });
      g.circle(x + s * 0.3, y - s * 0.15, s * 0.1).fill({ color: 0xFFFFFF, alpha });
      break;
    case 'web':
      for (let k = 0; k < 4; k++) {
        const a = rot + (k / 4) * Math.PI;
        line([x + Math.cos(a) * s * 0.6, y + Math.sin(a) * s * 0.6], [x - Math.cos(a) * s * 0.6, y - Math.sin(a) * s * 0.6], Math.max(0.5, s * 0.05));
      }
      g.circle(x, y, s * 0.3).stroke({ width: Math.max(0.5, s * 0.05), color, alpha });
      break;
    case 'bell':
      poly([P(-0.15, -0.55), P(0.15, -0.55), P(0.3, -0.1), P(0.5, 0.35), P(-0.5, 0.35), P(-0.3, -0.1)]);
      g.circle(P(0, 0.5)[0], P(0, 0.5)[1], s * 0.12).fill({ color: 0xFFFFFF, alpha });
      break;
    case 'star':
      glint(g, x, y, s * 0.7, rot, color, alpha);
      break;
  }
}

/**
 * A rune circle on the floor under the caster over [from, to] (perspective ellipse, `r` px wide): two rings
 * turning against each other, the motif around the rim, spokes to the centre. It opens over the first quarter
 * and flares (bright fill, a ring thrown outward, the element's sound) over the last 15%. Follows `at`
 * (default: the knight's feet).
 */
export function castCircle(h: KnightMoveHost, tl: Timeline, from: number, to: number, look: Look, o: { r?: number; at?: () => P; flare?: boolean; sound?: boolean } = {}) {
  const r = o.r ?? 34;
  const at = o.at ?? (() => h.pos());
  const n = lite() ? 6 : 8;
  if (o.sound !== false) tl.at(from, () => h.sound('rune', { vol: 0.45 }));
  if (o.flare !== false && o.sound !== false) tl.at(Math.round(lerp(from, to, 0.85)), () => h.sound(look.sound, { vol: 0.5, rate: 1.2 }));
  lightSpan(h, tl, from, to, (g, t, f) => {
    const c = at();
    const open = easeOut(Math.min(1, t / 0.25));
    const flare = o.flare === false ? 0 : Math.max(0, (t - 0.85) / 0.15);
    const fade = t > 0.94 ? 1 - (t - 0.94) / 0.06 : 1;
    const rr = r * open * (1 + 0.25 * flare);
    const sq = 0.3; // floor perspective
    const a = (0.55 + 0.25 * Math.sin(f * 0.4)) * fade;
    if (fxReady() && rr > 2) {
      // Painted glyph rings under the turning spokes and motifs
      stamp(g, 'bloom', c.x, c.y, rr * 2.6, rr * 2.6 * sq, { tint: look.light, alpha: (0.25 + 0.5 * flare) * fade });
      stamp(g, 'runeFloor', c.x, c.y, rr * 2, rr * 2 * 0.325, { tint: look.light, alpha: a * 1.2 });
      if (!lite()) stamp(g, 'runeFloor', c.x, c.y, rr * 1.15, rr * 1.15 * 0.325, { tint: look.core, alpha: a * 0.7 });
    } else
    g.ellipse(c.x, c.y, rr, rr * sq).fill({ color: look.light, alpha: (0.1 + 0.35 * flare) * fade });
    g.ellipse(c.x, c.y, rr, rr * sq).stroke({ width: 2, color: look.light, alpha: a });
    g.ellipse(c.x, c.y, rr * 0.82, rr * 0.82 * sq).stroke({ width: 1, color: look.core, alpha: a * 0.8 });
    g.ellipse(c.x, c.y, rr * 0.45, rr * 0.45 * sq).stroke({ width: 1.5, color: look.light, alpha: a * 0.9 });
    // Spokes and rim glyphs, turning
    const spin = f * 0.05;
    for (let k = 0; k < n; k++) {
      const ang = spin + (k / n) * Math.PI * 2;
      const gx = c.x + Math.cos(ang) * rr * 0.91;
      const gy = c.y + Math.sin(ang) * rr * 0.91 * sq;
      motif(g, look.motif, gx, gy, 4 + 2 * open, 0, look.light, a);
      const ia = -spin * 1.6 + (k / n) * Math.PI * 2;
      g.moveTo(c.x + Math.cos(ia) * rr * 0.45, c.y + Math.sin(ia) * rr * 0.45 * sq).lineTo(c.x + Math.cos(ia) * rr * 0.8, c.y + Math.sin(ia) * rr * 0.8 * sq).stroke({ width: 1, color: look.core, alpha: a * 0.6 });
    }
    if (flare > 0) {
      const fr = r * (1 + 1.2 * easeOut(flare));
      g.ellipse(c.x, c.y, fr, fr * sq).stroke({ width: 3 * (1 - flare) + 0.5, color: look.core, alpha: 1 - flare });
      // A column of light rising off the circle
      godRay(g, c.x, c.y - 70 * flare - 20, c.y, rr * 0.5, rr * 1.1, look.light, 0.5 * (1 - flare * 0.5) * fade);
    }
  }, 'ground');
}

/**
 * The power-up aura over [from, to]: tongues of the element's light licking up around the knight's body,
 * behind the rig, with a soft halo; motif sparks peel off the top. `scale` grows it for bigger casters/poses.
 */
export function aura(h: KnightMoveHost, tl: Timeline, from: number, to: number, look: Look, o: { scale?: number; sparks?: boolean } = {}) {
  const s = o.scale ?? 1;
  const n = lite() ? 7 : 11;
  lightSpan(h, tl, from, to, (g, t, f) => {
    const p = h.pos();
    const grow = easeOut(Math.min(1, t / 0.2)) * (t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1);
    if (grow <= 0) return;
    const cx = p.x - 2;
    const cy = p.y - 24 * s;
    glow(g, cx, cy, 32 * s * grow, look.light, 0.6 * grow, look.core);
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n; // round the body from one side to the other
      const ang = Math.PI * (1 + u); // lower-left → top → lower-right
      const bx = cx + Math.cos(ang) * 15 * s;
      const by = cy + Math.sin(ang) * 26 * s * 0.75 + 12 * s;
      const flick = hash(k * 31 + Math.floor(f / 2));
      const len = (14 + 18 * flick) * s * grow * (0.6 + 0.4 * Math.sin(u * Math.PI));
      const lean = (u - 0.5) * 0.6 + (flick - 0.5) * 0.3;
      const w = 3.5 * s;
      if (fxReady()) {
        // Painted flame tongues, flickering through their frames
        const fr = seq('flame', 4, f + k * 3, 3);
        const rot = Math.atan2(lean * len, len);
        stamp(g, `${fr}.body`, bx, by + 2, w * 3.2, len * 1.15, { ax: 0.5, ay: 1, rot, tint: look.light, alpha: 0.75 * grow });
        stamp(g, `${fr}.core`, bx, by + 2, w * 3.2, len * 1.15, { ax: 0.5, ay: 1, rot, tint: look.core, alpha: 0.7 * grow });
        continue;
      }
      g.poly([bx - w, by, bx + w, by, bx + lean * len, by - len]).fill({ color: look.light, alpha: 0.7 * grow });
      g.poly([bx - w * 0.4, by, bx + w * 0.4, by, bx + lean * len * 0.6, by - len * 0.6]).fill({ color: look.core, alpha: 0.8 * grow });
    }
  }, 'back');
  if (o.sparks !== false) {
    lightSpan(h, tl, from, to, (g, t, f) => {
      const p = h.pos();
      const grow = Math.min(1, t / 0.2) * (t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1);
      for (let k = 0; k < (lite() ? 3 : 5); k++) {
        const ph = ((f + k * 11) % 30) / 30;
        const x = p.x - 14 * s + 28 * s * hash(k * 7 + Math.floor((f + k * 11) / 30));
        const y = p.y - 8 - ph * 52 * s;
        motif(g, look.motif, x, y, 3.5 * (1 - ph * 0.5), ph * 2, look.core, grow * (1 - ph));
      }
    });
  }
}

/** Motif glyphs spiralling into `at` (default the weapon head) over [from, to], faster as the charge peaks. */
export function motes(h: KnightMoveHost, tl: Timeline, from: number, to: number, look: Look, o: { at?: () => P; reach?: number; n?: number } = {}) {
  const at = o.at ?? (() => h.weaponTip());
  const reach = o.reach ?? 60;
  const n = Math.round((o.n ?? 9) * (lite() ? 0.6 : 1));
  lightSpan(h, tl, from, to, (g, t, f) => {
    const c = at();
    const speed = 1 + 2 * t;
    for (let k = 0; k < n; k++) {
      const ph = ((f * speed) / 40 + k / n) % 1;
      const r = reach * (1 - easeIn(ph));
      const a = k * 2.39 + ph * 2.2; // golden-angle spread, swirling as it falls in
      const x = c.x + Math.cos(a) * r;
      const y = c.y + Math.sin(a) * r * 0.75;
      const tx = c.x + Math.cos(a - 0.35) * (r + 10);
      const ty = c.y + Math.sin(a - 0.35) * (r + 10) * 0.75;
      g.moveTo(tx, ty).lineTo(x, y).stroke({ width: 1, color: look.light, alpha: 0.5 * ph });
      motif(g, look.motif, x, y, 3 + 2 * (1 - ph), a, ph > 0.8 ? look.core : look.light, Math.min(1, ph * 2));
    }
  });
}

/**
 * The held breath before the snap, over [at, at + frames]: the rig freezes in its pose, the scene leans in,
 * and a glint swells and pops on the weapon head. Restores `resume` (rig speed) at the end.
 */
export function breath(h: KnightMoveHost, tl: Timeline, at: number, frames: number, look: Look, o: { where?: () => P; resume?: number; freeze?: boolean } = {}) {
  const where = o.where ?? (() => h.weaponTip());
  if (o.freeze !== false) {
    tl.at(at, () => h.animSpeed(0));
    tl.at(at + frames, () => h.animSpeed(o.resume ?? 1));
  }
  tl.at(at, () => h.sound('charge', { rate: 1.8, vol: 0.35 }));
  lightSpan(h, tl, at, at + frames + 3, (g, t, f) => {
    const c = where();
    const u = easeIn(Math.min(1, t * 1.15));
    glow(g, c.x, c.y, 6 + 14 * u, look.light, 0.6 + 0.4 * u, look.core);
    glint(g, c.x, c.y, 6 + 22 * u, f * 0.04 + 0.4, look.core, t > 0.9 ? (1 - t) * 10 : 0.5 + 0.5 * u);
  });
}

/** Camera roll (Dutch angle) at frame `at`: snaps to `radians` and holds `hold` frames before easing level. */
export function dutch(h: KnightMoveHost, tl: Timeline, at: number, radians: number, hold = 10, snap = true) {
  tl.at(at, () => h.roll(radians, hold, snap));
}

/**
 * The element's own burst at `where` on frame `at`, `size` px across: flame crown, ice star, forked bolts, rock
 * crown, petal storm, cross of light or a void implosion. Plays the element's sound. Use with land()'s spark.
 */
export function signature(h: KnightMoveHost, tl: Timeline, at: number, where: P | (() => P), look: Look, size = 40, dur = 20) {
  const pt = once(where);
  const m = look.motif;
  tl.at(at, () => h.sound(look.sound, { vol: 0.55 }));
  const n = lite() ? 6 : 9;
  lightSpan(h, tl, at, at + dur, (g, t, f) => {
    const c = pt();
    const fade = 1 - t;
    const grow = easeOut(Math.min(1, t * 2.2));
    if (m === 'flame') {
      // A crown of flame tongues bursting up and out
      for (let k = 0; k < n; k++) {
        const a = -Math.PI / 2 + ((k / (n - 1)) - 0.5) * 2.4;
        const len = size * (0.6 + 0.5 * hash(k * 13)) * grow;
        const x1 = c.x + Math.cos(a) * len;
        const y1 = c.y + Math.sin(a) * len;
        const w = 5 * fade + 1;
        if (fxReady()) {
          const fr = seq('flame', 4, f + k, 3);
          stamp(g, `${fr}.body`, c.x, c.y, w * 3, len * 1.2, { ax: 0.5, ay: 1, rot: a + Math.PI / 2, tint: look.light, alpha: 0.85 * fade });
          stamp(g, `${fr}.core`, c.x, c.y, w * 3, len * 1.2, { ax: 0.5, ay: 1, rot: a + Math.PI / 2, tint: look.core, alpha: fade });
          stamp(g, `${fr}.hot`, c.x, c.y, w * 3, len * 1.2, { ax: 0.5, ay: 1, rot: a + Math.PI / 2, tint: 0xFFFFFF, alpha: fade });
          continue;
        }
        const nx = -Math.sin(a) * w;
        const ny = Math.cos(a) * w;
        g.poly([c.x + nx, c.y + ny, c.x - nx, c.y - ny, x1, y1]).fill({ color: look.light, alpha: 0.75 * fade });
        g.poly([c.x + nx * 0.4, c.y + ny * 0.4, c.x - nx * 0.4, c.y - ny * 0.4, lerp(c.x, x1, 0.6), lerp(c.y, y1, 0.6)]).fill({ color: look.core, alpha: fade });
      }
    } else if (m === 'flake') {
      // A six-pointed ice star of long shards, each with a frost sparkle at its tip
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + 0.26;
        const len = size * 0.75 * grow;
        const w = 4;
        const nx = -Math.sin(a) * w;
        const ny = Math.cos(a) * w;
        const x1 = c.x + Math.cos(a) * len;
        const y1 = c.y + Math.sin(a) * len;
        if (fxReady()) {
          stampPal(g, 'crystal', c.x, c.y, Math.max(4, len * 0.32), len, palOf(look.light), { ax: 0.5, ay: 1, rot: a + Math.PI / 2, alpha: fade });
          glint(g, x1, y1, 6 * fade + 2, f * 0.1, look.core, fade);
          continue;
        }
        g.poly([c.x + nx, c.y + ny, x1, y1, c.x - nx, c.y - ny]).fill({ color: look.light, alpha: 0.7 * fade });
        g.moveTo(c.x, c.y).lineTo(x1, y1).stroke({ width: 1, color: 0xFFFFFF, alpha: fade });
        glint(g, x1, y1, 6 * fade + 2, f * 0.1, look.core, fade);
      }
    } else if (m === 'bolt') {
      // Forked bolts thrown out radially, re-rolled every other frame so they crackle
      for (let k = 0; k < (lite() ? 4 : 6); k++) {
        const a = (k / 6) * Math.PI * 2 + hash(k) * 0.5;
        const len = size * (0.7 + 0.4 * hash(k * 5 + Math.floor(f / 2))) * grow;
        skyBolt(g, c.x, c.y, c.x + Math.cos(a) * len, c.y + Math.sin(a) * len, k * 17 + Math.floor(f / 2), pal(look.light, look.core), 2, fade);
      }
    } else if (m === 'shard') {
      // A crown of rock shards and a ring of dust light
      for (let k = 0; k < n; k++) {
        const a = -Math.PI / 2 + ((k / (n - 1)) - 0.5) * 2.6;
        const len = size * (0.45 + 0.35 * hash(k * 3)) * grow;
        if (fxReady()) stampPal(g, `rock${k % 3}`, c.x + Math.cos(a) * len, c.y + Math.sin(a) * len, 9 * (1 - t * 0.3), 8 * (1 - t * 0.3), palOf(look.light), { rot: a + t * 4, alpha: fade });
        else motif(g, 'shard', c.x + Math.cos(a) * len, c.y + Math.sin(a) * len, 8 * (1 - t * 0.4), a + Math.PI / 2, look.light, fade);
      }
      g.ellipse(c.x, c.y + size * 0.2, size * grow, size * 0.25 * grow).stroke({ width: 3 * fade + 0.5, color: look.core, alpha: 0.7 * fade });
    } else if (m === 'leaf') {
      // A spiral of leaves/petals blown outward
      for (let k = 0; k < n + 3; k++) {
        const a = (k / (n + 3)) * Math.PI * 2 + t * 2.4;
        const r = size * (0.3 + 0.7 * grow) * (0.7 + 0.3 * hash(k * 7));
        motif(g, 'leaf', c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.8, 5 + 2 * hash(k), a + t * 6, k % 3 ? look.light : look.core, fade);
      }
      g.circle(c.x, c.y, size * 0.6 * grow).stroke({ width: 2 * fade + 0.5, color: look.light, alpha: 0.6 * fade });
    } else if (m === 'cross') {
      // A cross of light: long vertical shaft, shorter arms, and a halo ellipse
      const v = size * 1.4 * grow;
      const hz = size * 0.9 * grow;
      godRay(g, c.x, c.y - v, c.y + v * 0.4, 3, 8 * fade + 2, look.light, fade);
      g.poly([c.x - hz, c.y, c.x, c.y - 3, c.x + hz, c.y, c.x, c.y + 3]).fill({ color: look.core, alpha: fade });
      g.ellipse(c.x, c.y - size * 0.55, size * 0.5 * grow, size * 0.14 * grow).stroke({ width: 2, color: look.core, alpha: fade });
      glow(g, c.x, c.y, size * 0.5, look.light, fade);
    } else if (m === 'crescent') {
      // Implosion: a ring collapsing onto the point, then a void star tearing outward
      if (t < 0.35) {
        const u = t / 0.35;
        const r = size * (1 - easeIn(u));
        g.circle(c.x, c.y, r).stroke({ width: 2 + 3 * u, color: look.light, alpha: 0.9 });
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + u * 2;
          g.moveTo(c.x + Math.cos(a) * (r + 12), c.y + Math.sin(a) * (r + 12)).lineTo(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r).stroke({ width: 1, color: look.core, alpha: 0.7 });
        }
      } else {
        const u = (t - 0.35) / 0.65;
        glint(g, c.x, c.y, size * 0.9 * easeOut(u) + 4, 0.3, look.light, 1 - u);
        glint(g, c.x, c.y, size * 0.6 * easeOut(u) + 3, 1.1, look.core, 1 - u);
        g.circle(c.x, c.y, size * 0.8 * easeOut(u)).stroke({ width: 2 * (1 - u) + 0.5, color: look.light, alpha: 1 - u });
      }
    } else if (m === 'chevron') {
      starburst(g, c.x, c.y, size * 0.6 * grow, 8, f * 0.05, pal(look.light, look.core), fade);
    } else {
      // The spell's own glyphs flung out of the contact on a ring of light
      for (let k = 0; k < n + 2; k++) {
        const a = (k / (n + 2)) * Math.PI * 2 + hash(k * 3) * 0.5;
        const r = size * (0.25 + 0.75 * grow) * (0.75 + 0.25 * hash(k * 7));
        motif(g, m, c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.85, 5 + 3 * hash(k) * (1 - t * 0.4), a + t * 3, k % 3 ? look.light : look.core, fade);
      }
      g.circle(c.x, c.y, size * 0.7 * grow).stroke({ width: 2.5 * fade + 0.5, color: look.light, alpha: 0.8 * fade });
      glow(g, c.x, c.y, size * 0.45 * (1 - t), look.light, fade);
    }
  });
  if (m === 'crescent') {
    // A hole in the world at the centre while it collapses (normal blend, so it really darkens)
    drawSpan(h, tl, at, at + Math.round(dur * 0.5), (g, t) => {
      const c = pt();
      g.circle(c.x, c.y, size * 0.22 * arc(t)).fill({ color: look.deep, alpha: 0.95 });
    });
  }
}

/**
 * The full cinematic charge over [from, to] in one call: rune circle underfoot, aura, motes into the weapon, and
 * (unless `breath` is 0) the held breath over the last `breath` frames. `release` rolls the camera on the snap.
 */
export function chargeUp(h: KnightMoveHost, tl: Timeline, from: number, to: number, look: Look, o: { breath?: number; freeze?: boolean; resume?: number; circle?: number | false; aura?: number | false; motes?: boolean; at?: () => P; roll?: number; rollHold?: number } = {}) {
  const b = o.breath ?? 0;
  if (o.circle !== false) castCircle(h, tl, from, to + 4, look, { r: o.circle ?? 34 });
  if (o.aura !== false) aura(h, tl, from, to + 2, look, { scale: o.aura ?? 1 });
  if (o.motes !== false) motes(h, tl, from, to - b, look, { at: o.at });
  if (b > 0) breath(h, tl, to - b, b, look, { where: o.at, freeze: o.freeze, resume: o.resume });
  if (o.roll) dutch(h, tl, to, o.roll, o.rollHold ?? 10);
}

export interface PreludeOpts {
  /** Knight pose held through the charge: 'BUFF' (crouched, gathering), 'DEFENSE' (braced) or 'SKILL2TULUC' (arm raised). */
  pose?: string;
  /** Frame of `pose` to freeze on. */
  hold?: number;
  /** Where the power gathers (default the weapon head). */
  at?: () => P;
  circle?: number | false;
  aura?: number | false;
  /** Camera roll held through the charge (eases in), radians. */
  lean?: number;
  zoom?: number;
}

/**
 * A spell's opening charge over [0, n]: the knight sinks into a gathering pose and freezes, the camera pushes
 * in (leaning into a slight roll), the element's circle opens underfoot, the aura climbs and motes pour into
 * the weapon; the breath is held over the last frames and pops as the move proper starts.
 */
export function prelude(h: KnightMoveHost, tl: Timeline, n: number, look: Look, o: PreludeOpts = {}) {
  const pose = o.pose ?? 'BUFF';
  const hold = o.hold ?? 9;
  tl.at(0, () => {
    h.anim(pose);
    const p = h.pos();
    h.camera(o.zoom ?? 1.24, p.x + 18, p.y - 30, n + 2);
    if (o.lean !== 0) h.roll(o.lean ?? -0.035, n, false);
    chargeSound(h, n, 0.5);
  });
  tl.at(Math.min(hold, n - 2), () => h.animSpeed(0));
  tl.during(0, n, (t) => h.dim(0.3 * easeOut(Math.min(1, t * 2)) * (t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1), look.deep));
  chargeUp(h, tl, 0, n, look, { at: o.at, breath: Math.min(8, Math.round(n / 3)), freeze: false, circle: o.circle, aura: o.aura });
  tl.at(n, () => {
    h.animSpeed(1);
    h.roll(0, 1, false);
  });
}

/** Wraps a spell with a `n`-frame prelude (the spell plays after it, unchanged). */
export function staged(n: number, look: Look, move: KnightMove, o: PreludeOpts = {}): KnightMove {
  return (h, tl) => {
    prelude(h, tl, n, look, o);
    move(h, shifted(tl, n));
  };
}
