/**
 * Shared toolkit for monster move choreography (monsterMoves.ts and engine/moves/*): the MoveHost the
 * engine hands each move, plus timing, travel, projectile and VFX helpers. Everything draws into
 * move-owned Graphics that the engine destroys when the move ends.
 */
import type { Container, Graphics } from 'pixi.js';
import type { Spine } from '@esotericsoftware/spine-pixi-v8';
import { sparkAnim, themeColor, type VfxName, type VfxOpts } from './vfx';
import {
  Timeline, type EmitOptions, type SfxName,
  lerp, easeIn, easeOut, easeInOut, arc, rand,
  INK, BONE, BLOOD,
} from './choreo';

/** What the battle logic reports back on the impact frame. */
export interface ImpactResult {
  label?: string; // floating text, e.g. "-24" or "BLOCKED"
  color?: number;
  at?: 'knight' | 'monster';
  hit?: boolean; // knight takes a hit reaction (false when fully blocked)
}

/** Engine services available to a move. Implemented in GameEngine.playMonsterMove. */
export interface MoveHost {
  readonly home: { x: number; y: number };
  readonly knight: { x: number; y: number };
  /** Approximate sprite height in px, for aiming at heads/mouths. */
  readonly height: number;
  /** Current feet position (home + offset). */
  pos(): { x: number; y: number };
  gfx(layer?: 'fx' | 'ground'): Graphics;
  /** Plays a Spine VFX rig (vfx.ts) at (x, y); null while the rigs load, so keep a Graphics fallback nearby. */
  vfx(name: VfxName, x: number, y: number, opts?: VfxOpts & { layer?: 'fx' | 'ground' }): Spine | null;
  container(layer?: 'fx' | 'ground'): Container;

  anim(name: string, loop?: boolean): void;
  idle(): void;
  offset(x: number, y?: number): void;
  lift(height: number): void;
  stretch(sx: number, sy: number): void;
  /** Rotates the rig about its feet (radians, positive = clockwise). Reset when the move ends. */
  tilt(radians: number): void;
  alpha(a: number): void;
  tint(color: number): void;
  /** A second instance of this monster's rig (shares textures), added to the fx layer. */
  clone(): Spine | null;

  camera(zoom: number, x: number, y: number, holdFrames: number): void;
  shake(intensity: number): void;
  flash(alpha: number, color?: number): void;
  hitStop(frames: number): void;
  dim(alpha: number, color?: number): void;

  knightHit(knockback?: number): void;
  impact(knockback?: number): void;

  sparks(x: number, y: number, count: number, colors?: number[]): void;
  shockwave(x: number, y: number, color: number): void;
  streaks(x: number, y: number, length: number, colors?: number[]): void;
  emit(x: number, y: number, opts: EmitOptions): void;
  slashArc(g: Graphics, cx: number, cy: number, r: number, a0: number, a1: number, shadow: number, body: number, core: number): void;
  text(content: string, x: number, y: number, color: number, size: number): void;
  sound(name: SfxName): void;
}

// ---------------------------------------------------------------------------------------------
// Shared choreography helpers

/** Offset that puts the monster's feet `gap` px in front of the knight, in the knight's lane. */
export function contact(h: MoveHost, gap = 40) {
  return { x: h.knight.x + gap - h.home.x, y: h.knight.y - h.home.y };
}

/** Knight chest / head points. */
export const chest = (h: MoveHost) => ({ x: h.knight.x + 6, y: h.knight.y - 28 });
export const head = (h: MoveHost) => ({ x: h.knight.x + 4, y: h.knight.y - 44 });

/** Moves the monster between two offsets over [from, to], optionally hopping. */
export function travel(
  h: MoveHost, tl: Timeline, from: number, to: number,
  a: { x: number; y: number }, b: { x: number; y: number },
  ease: (t: number) => number = easeInOut, hop = 0,
) {
  tl.during(from, to, (t) => {
    const e = ease(t);
    h.offset(lerp(a.x, b.x, e), lerp(a.y, b.y, e));
    if (hop) h.lift(arc(t) * hop);
  });
  if (hop) tl.at(to, () => h.lift(0));
}

/** Dust kicked up at the monster's feet, blowing away from the direction of travel. */
export function dustAtFeet(h: MoveHost, count = 4, dir = 1) {
  const p = h.pos();
  h.emit(p.x + dir * 8, p.y - 2, {
    count, colors: [0x78716C, 0xA8A29E, 0x57534E], speed: [0.6, 1.8], angle: dir > 0 ? -0.4 : Math.PI + 0.4,
    spread: 0.6, gravity: -0.03, size: 3, life: [14, 24],
  });
}

/** A Graphics that draws itself every frame over [from, to] and is cleared afterwards. */
export function drawSpan(h: MoveHost, tl: Timeline, from: number, to: number, draw: (g: Graphics, t: number, f: number) => void, layer: 'fx' | 'ground' = 'fx') {
  let g: Graphics | null = null;
  tl.during(from, to, (t, f) => {
    g ??= h.gfx(layer);
    g.clear();
    if (t < 1) draw(g, t, f);
  });
}

/** Projectile along an arc; `draw` renders the body at its current position. */
export function projectile(
  h: MoveHost, tl: Timeline, from: number, dur: number,
  start: () => { x: number; y: number }, end: () => { x: number; y: number }, height: number,
  draw: (g: Graphics, x: number, y: number, t: number) => void, onHit: () => void,
  trail?: (x: number, y: number) => void,
) {
  let s = { x: 0, y: 0 };
  let e = { x: 0, y: 0 };
  tl.at(from, () => {
    s = start();
    e = end();
  });
  drawSpan(h, tl, from, from + dur, (g, t) => {
    const x = lerp(s.x, e.x, t);
    const y = lerp(s.y, e.y, t) - arc(t) * height;
    draw(g, x, y, t);
    trail?.(x, y);
  });
  tl.at(from + dur, onHit);
}

/** Three parallel claw rakes with ink contour, crimson body and bone core. */
export function clawRake(g: Graphics, x: number, y: number, dir: 1 | -1, size = 22, body = BLOOD) {
  for (let i = -1; i <= 1; i++) {
    const ox = i * 6;
    const x0 = x + ox - (size / 2) * dir;
    const y0 = y - size / 2 + i * 2;
    const x1 = x + ox + (size / 2) * dir;
    const y1 = y + size / 2 + i * 2;
    g.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: 5, color: INK, alpha: 0.85 });
    g.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: 3, color: body, alpha: 0.95 });
    g.moveTo(lerp(x0, x1, 0.2), lerp(y0, y1, 0.2)).lineTo(lerp(x0, x1, 0.8), lerp(y0, y1, 0.8)).stroke({ width: 1, color: BONE });
  }
}

/** Fangs closing on a point: upper and lower rows converge as t → 1. */
export function jaws(g: Graphics, x: number, y: number, t: number, body = BONE, rim = BLOOD) {
  const gap = lerp(26, 2, easeIn(t));
  const r = 22;
  for (const side of [-1, 1] as const) {
    const cy = y + side * gap;
    const acy = cy - side * 12;
    const a0 = side < 0 ? 0.15 * Math.PI : 1.15 * Math.PI;
    const a1 = side < 0 ? 0.85 * Math.PI : 1.85 * Math.PI;
    // arc() continues the current path, so start each stroke at the arc's first point
    for (const [w, color] of [[6, INK], [3, rim]] as const) {
      g.moveTo(x + Math.cos(a0) * r, acy + Math.sin(a0) * r).arc(x, acy, r, a0, a1).stroke({ width: w, color, alpha: 0.95 });
    }
    for (let k = -2.5; k <= 2.5; k++) {
      const fx = x + k * 6.5;
      const len = 9 - Math.abs(k) * 1.2;
      g.poly([fx - 3, cy, fx + 3, cy, fx, cy - side * len]).fill({ color: body }).stroke({ width: 1, color: INK });
    }
  }
}

/** Jagged thorn/rock spike rising from the ground. */
export function spike(g: Graphics, x: number, groundY: number, h: number, w: number, fill: number, edge: number, tip = BONE) {
  if (h <= 0.5) return;
  g.poly([x - w, groundY, x - w * 0.3, groundY - h * 0.55, x, groundY - h, x + w * 0.35, groundY - h * 0.5, x + w, groundY])
    .fill({ color: fill }).stroke({ width: 2, color: INK });
  // lit left face
  g.poly([x - w * 0.7, groundY, x - w * 0.25, groundY - h * 0.55, x, groundY - h, x - w * 0.05, groundY]).fill({ color: edge, alpha: 0.85 });
  g.moveTo(x - w * 0.3, groundY - h * 0.55).lineTo(x, groundY - h).stroke({ width: 1, color: tip, alpha: 0.7 });
  g.rect(x - 0.5, groundY - h, 1, 2).fill({ color: tip });
}

/** Layered glowing orb (outer haze, body, core, white-hot centre). */
export function orb(g: Graphics, x: number, y: number, r: number, colors: number[]) {
  g.circle(x, y, r * 1.6).fill({ color: colors[2] ?? colors[0], alpha: 0.25 });
  g.circle(x, y, r).fill({ color: colors[1] ?? colors[0] }).stroke({ width: 1.5, color: INK, alpha: 0.6 });
  g.circle(x - r * 0.15, y - r * 0.15, r * 0.6).fill({ color: colors[0] });
  g.circle(x - r * 0.25, y - r * 0.25, Math.max(1, r * 0.25)).fill({ color: 0xFFFFFF });
}

/** Expanding ritual circle: ring, inner star, and tick glyphs, drawn in perspective on the ground. */
export function sigil(g: Graphics, x: number, y: number, r: number, progress: number, spin: number, color: number, core: number) {
  const ry = 0.35;
  const sweep = Math.PI * 2 * Math.min(1, progress);
  g.ellipse(x, y, r + 3, (r + 3) * ry).stroke({ width: 4, color: INK, alpha: 0.6 * progress });
  // Ring traced as a polyline so it can be partially drawn on the squashed ground ellipse
  const steps = Math.max(2, Math.floor(48 * Math.min(1, progress)));
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI / 2 + (sweep * i) / steps;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r * ry;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.stroke({ width: 2, color, alpha: 0.95 });
  if (progress > 0.5) {
    const a2 = Math.min(1, (progress - 0.5) * 2);
    for (let tri = 0; tri < 2; tri++) {
      const pts: number[] = [];
      for (let k = 0; k < 3; k++) {
        const a = spin + tri * Math.PI / 3 + (k * Math.PI * 2) / 3;
        pts.push(x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82 * ry);
      }
      g.poly(pts).stroke({ width: 1.5, color: core, alpha: a2 });
    }
    for (let k = 0; k < 8; k++) {
      const a = -spin + (k * Math.PI) / 4;
      const px = x + Math.cos(a) * r * 1.12;
      const py = y + Math.sin(a) * r * 1.12 * ry;
      g.rect(px - 1, py - 1, 2, 2).fill({ color: core, alpha: a2 });
    }
  }
}

/** Return-home leg shared by most melee moves. */
export function retreat(h: MoveHost, tl: Timeline, from: number, to: number, fromOffset: { x: number; y: number }, hop = 0) {
  travel(h, tl, from, to, fromOffset, { x: 0, y: 0 }, easeInOut, hop);
}


export type MoveFn = (h: MoveHost, tl: Timeline) => void;

// ---------------------------------------------------------------------------------------------
// Beats: the recurring pieces of fight timing

/** A point on the monster at `up` × its height (1 = top of the head), nudged `dx` toward the knight. */
export const crown = (h: MoveHost, up = 1, dx = -6) => ({ x: h.pos().x + dx, y: h.pos().y - h.height * up });

/** Knight's feet, where floor effects centre. */
export const feet = (h: MoveHost) => ({ x: h.knight.x + 6, y: h.knight.y });

export interface LandOpts {
  kb?: number; // knockback
  shake?: number;
  stop?: number; // hit-stop frames
  flash?: number;
  color?: number; // flash colour
  zoom?: number; // camera punch-in on the knight
  sparks?: number;
  colors?: number[];
  ring?: number; // floor shockwave colour
  sound?: SfxName;
  at?: { x: number; y: number };
  spark?: number | false; // hitSpark colour (default: the flash colour, else the palette's theme colour); false = none
}

/** The final, damage-dealing contact: hit-stop, shake, flash, camera punch, sparks and impact. */
export function land(h: MoveHost, o: LandOpts = {}) {
  const p = o.at ?? chest(h);
  if (o.stop) h.hitStop(o.stop);
  h.shake(o.shake ?? 10);
  if (o.flash) h.flash(o.flash, o.color);
  if (o.zoom) h.camera(o.zoom, h.knight.x + 12, h.knight.y - 28, 14);
  h.sparks(p.x, p.y, o.sparks ?? 14, o.colors ?? [BONE, BLOOD]);
  if (o.ring !== undefined) h.shockwave(h.knight.x + 6, h.knight.y, o.ring);
  if (o.spark !== false) {
    const heavy = (o.stop ?? 0) >= 7;
    h.vfx('hitSpark', p.x, p.y, { anim: sparkAnim(o.spark ?? o.color ?? themeColor(o.colors, BLOOD), heavy), size: heavy ? 1 : 0.8 });
  }
  h.sound(o.sound ?? 'crit');
  h.impact(o.kb ?? 10);
}

/** A lesser hit ahead of the final one: reaction, sparks and a small shake. */
export function chip(h: MoveHost, colors: number[], kb = 3, shake = 5) {
  const p = chest(h);
  const x = p.x + rand(-4, 4);
  const y = p.y + rand(-10, 8);
  h.sparks(x, y, 7, colors);
  h.vfx('hitSpark', x, y, { anim: sparkAnim(themeColor(colors, BLOOD)), size: 0.5 });
  h.knightHit(kb);
  h.shake(shake);
  h.sound('hit');
}

/** Dims the arena over [from, to], easing in and out over `ramp` frames. */
export function dimSpan(h: MoveHost, tl: Timeline, from: number, to: number, peak: number, color?: number, ramp = 16) {
  const len = to - from;
  tl.during(from, to, (t, f) => {
    const a = t >= 1 ? 0 : Math.min(1, f / ramp, Math.max(0, (len - f) / ramp));
    h.dim(peak * a, color);
  });
}

/** Pulsing charge tint over [from, to]; cleared at `to`. */
export function chargeTint(h: MoveHost, tl: Timeline, from: number, to: number, color: number, rate = 0.5) {
  tl.during(from, to, (t, f) => h.tint(t >= 1 ? 0xFFFFFF : Math.sin(f * rate) > 0 ? color : 0xFFFFFF));
}

/** Shivers the rig in place (a wind-up tremble or a latched shake). */
export function tremble(h: MoveHost, tl: Timeline, from: number, to: number, at: { x: number; y: number }, amp = 2, rate = 2.2) {
  tl.during(from, to, (t, f) => h.offset(at.x + (t >= 1 ? 0 : Math.sin(f * rate) * amp), at.y));
}

/** Rising puff of smoke or motes at a point. */
export function puff(h: MoveHost, x: number, y: number, colors: number[], count = 18) {
  h.emit(x, y - 6, { count, colors, speed: [0.5, 1.6], angle: -Math.PI / 2, spread: 1.2, gravity: -0.04, size: 4, life: [18, 30] });
}

/** Teleport: fade out in a puff at `at`, reappear at offset `to` after `dur * 2 + 2` frames. */
export function blink(h: MoveHost, tl: Timeline, at: number, to: { x: number; y: number }, colors: number[], dur = 10) {
  tl.at(at, () => {
    puff(h, h.pos().x, h.pos().y, colors);
    portal(h, h.pos().x, h.pos().y - h.height * 0.5, 0.7);
    h.sound('swing');
  });
  tl.during(at, at + dur, (t) => {
    h.alpha(1 - t);
    h.stretch(1 - 0.4 * t, 1 + 0.4 * t);
  });
  tl.at(at + dur + 2, () => {
    h.offset(to.x, to.y);
    puff(h, h.home.x + to.x, h.home.y + to.y, colors);
    portal(h, h.home.x + to.x, h.home.y + to.y - h.height * 0.5, 0.7);
  });
  tl.during(at + dur + 2, at + dur * 2 + 2, (t) => {
    h.alpha(t);
    h.stretch(lerp(0.6, 1, t), lerp(1.4, 1, t));
  });
}

/** Pulsing danger ring on the floor under the knight, shrinking onto the strike point. */
export function warnRing(h: MoveHost, tl: Timeline, from: number, to: number, color: number, r = 22) {
  drawSpan(h, tl, from, to, (g, t, f) => {
    const p = feet(h);
    const pulse = 0.5 + 0.5 * Math.sin(f * 0.7);
    const rr = r * (1.4 - 0.4 * t);
    g.ellipse(p.x, p.y + 1, rr + 2, (rr + 2) * 0.28).stroke({ width: 4, color: INK, alpha: 0.5 });
    g.ellipse(p.x, p.y + 1, rr, rr * 0.28).stroke({ width: 2, color, alpha: 0.45 + 0.55 * pulse });
    g.ellipse(p.x, p.y + 1, rr * 0.35, rr * 0.1).fill({ color, alpha: 0.3 * pulse });
  }, 'ground');
}

/** Fading floor decal (puddle, scorch, frost) at the knight's feet. */
export function puddle(h: MoveHost, tl: Timeline, from: number, to: number, rx: number, body: number, core: number) {
  drawSpan(h, tl, from, to, (g, t) => {
    const p = feet(h);
    const grow = easeOut(Math.min(1, t * 6));
    g.ellipse(p.x, p.y + 1, rx * grow, rx * 0.22 * grow).fill({ color: body, alpha: 0.75 * (1 - t) });
    g.ellipse(p.x - 2, p.y, rx * 0.6 * grow, rx * 0.12 * grow).fill({ color: core, alpha: 0.6 * (1 - t) });
  }, 'ground');
}

/** Sonic / shout rings radiating from (x,y) toward the knight (leftward arcs). */
export function shoutRings(g: Graphics, x: number, y: number, t: number, color: number, n = 3, reach = 70) {
  for (let k = 0; k < n; k++) {
    const r = 6 + ((t * reach * 1.6 + (k * reach) / n) % reach);
    const a = 1 - r / (reach + 6);
    g.arc(x, y, r, Math.PI * 0.72, Math.PI * 1.28).stroke({ width: 4, color: INK, alpha: 0.4 * a });
    g.arc(x, y, r, Math.PI * 0.72, Math.PI * 1.28).stroke({ width: 2, color, alpha: a });
  }
}

/** Constant-width energy beam with ink edge, body and hot core, capped with a bloom at both ends. */
export function beam(g: Graphics, x0: number, y0: number, x1: number, y1: number, w: number, colors: [number, number, number], alpha = 1) {
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const nx = -(y1 - y0) / len;
  const ny = (x1 - x0) / len;
  const band = (hw: number, color: number, a: number) => {
    g.poly([x0 + nx * hw, y0 + ny * hw, x1 + nx * hw, y1 + ny * hw, x1 - nx * hw, y1 - ny * hw, x0 - nx * hw, y0 - ny * hw]).fill({ color, alpha: a });
    g.circle(x1, y1, hw * 1.3).fill({ color, alpha: a });
  };
  band(w / 2 + 2, INK, 0.5 * alpha);
  band(w / 2, colors[0], 0.8 * alpha);
  band(w * 0.3, colors[1], 0.95 * alpha);
  band(Math.max(0.8, w * 0.1), colors[2], alpha);
  g.circle(x0, y0, w * 0.8).fill({ color: colors[1], alpha: 0.8 * alpha });
}

/** A tapering tentacle from (x0,y0) curling toward (x1,y1). `curl` bends it sideways; suckers optional. */
export function tentacle(g: Graphics, x0: number, y0: number, x1: number, y1: number, w: number, curl: number, body: number, under: number, suckers = true) {
  const mx = (x0 + x1) / 2 + curl;
  const my = (y0 + y1) / 2 - Math.abs(curl) * 0.6;
  const n = 12;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    pts.push({ x: (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * mx + u * u * x1, y: (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * my + u * u * y1 });
  }
  for (const [extra, color] of [[3, INK], [0, body]] as const) {
    for (let i = 0; i < n; i++) {
      const ww = (w * (1 - i / n) + 1.5) + extra;
      g.moveTo(pts[i].x, pts[i].y).lineTo(pts[i + 1].x, pts[i + 1].y).stroke({ width: ww, color, cap: 'round' });
    }
  }
  if (suckers) {
    for (let i = 2; i < n - 1; i += 2) g.circle(pts[i].x, pts[i].y + w * 0.2 * (1 - i / n), Math.max(1, w * 0.18 * (1 - i / n))).fill({ color: under });
  }
}

/** Oriented dart / arrow / shard centred on (x,y) pointing along `ang`. */
export function dart(g: Graphics, x: number, y: number, ang: number, len: number, body: number, tip: number = BONE, w = 2) {
  const dx = Math.cos(ang) * len / 2;
  const dy = Math.sin(ang) * len / 2;
  g.moveTo(x - dx, y - dy).lineTo(x + dx, y + dy).stroke({ width: w + 2, color: INK });
  g.moveTo(x - dx, y - dy).lineTo(x + dx, y + dy).stroke({ width: w, color: body });
  const px = -Math.sin(ang);
  const py = Math.cos(ang);
  g.poly([x + dx * 1.5, y + dy * 1.5, x + dx + px * 2.5, y + dy + py * 2.5, x + dx - px * 2.5, y + dy - py * 2.5]).fill({ color: tip }).stroke({ width: 1, color: INK });
}

/** Little winged silhouette (bat / raven / spirit) flapping at phase `f`. `dir` 1 faces +x. */
export function flier(g: Graphics, x: number, y: number, s: number, f: number, body: number, eye: number, dir: 1 | -1 = -1) {
  const flap = Math.sin(f) * s * 0.7;
  for (const side of [-1, 1]) {
    g.poly([x, y, x + side * s * 1.4, y - flap, x + side * s * 0.9, y + s * 0.2, x + side * s * 0.4, y + s * 0.4]).fill({ color: body }).stroke({ width: 1, color: INK });
  }
  g.circle(x, y, s * 0.45).fill({ color: body }).stroke({ width: 1, color: INK });
  g.rect(x + dir * s * 0.2 - 0.5, y - 1, 1.5, 1.5).fill({ color: eye });
}

/** Skittering eight-legged silhouette (spiderling, scarab). */
export function crawler(g: Graphics, x: number, y: number, s: number, f: number, body: number, eye: number) {
  for (let k = 0; k < 4; k++) {
    const kick = Math.sin(f + k * 1.3) * s * 0.3;
    for (const side of [-1, 1]) {
      const lx = x + (k - 1.5) * s * 0.5;
      g.moveTo(lx, y).lineTo(lx + side * 0.2 * s + kick * side, y - s * 0.6).lineTo(lx + side * 0.3 * s + kick, y + s * 0.5).stroke({ width: 1, color: INK });
    }
  }
  g.ellipse(x, y, s * 0.8, s * 0.55).fill({ color: body }).stroke({ width: 1, color: INK });
  g.rect(x - s * 0.7, y - 1, 1, 1).fill({ color: eye });
  g.rect(x - s * 0.45, y - 1, 1, 1).fill({ color: eye });
}

/** Skeletal hand/claw reaching up from the floor; `up` 0-1, `grip` 0 open → 1 clenched. */
export function graspingHand(g: Graphics, x: number, groundY: number, up: number, grip: number, bone: number, shade: number, scale = 1) {
  if (up <= 0.02) return;
  const hgt = 26 * up * scale;
  const wx = x;
  const wy = groundY - hgt;
  g.moveTo(x, groundY).lineTo(wx, wy).stroke({ width: 5 * scale, color: INK });
  g.moveTo(x, groundY).lineTo(wx, wy).stroke({ width: 3 * scale, color: shade });
  for (let k = 0; k < 4; k++) {
    const a = -Math.PI / 2 + (k - 1.5) * lerp(0.45, 0.15, grip);
    const len = (9 - Math.abs(k - 1.5) * 1.5) * scale;
    const kx = wx + Math.cos(a) * len * 0.6;
    const ky = wy + Math.sin(a) * len * 0.6;
    const tx = kx + Math.cos(a + grip * 1.4 * (k < 2 ? 1 : -1)) * len * 0.6;
    const ty = ky + Math.sin(a + grip * 1.4 * (k < 2 ? 1 : -1)) * len * 0.6;
    g.moveTo(wx, wy).lineTo(kx, ky).lineTo(tx, ty).stroke({ width: 3 * scale, color: INK });
    g.moveTo(wx, wy).lineTo(kx, ky).lineTo(tx, ty).stroke({ width: 1.5 * scale, color: bone });
  }
  g.ellipse(x, groundY, 8 * scale, 2.5 * scale).fill({ color: INK, alpha: 0.6 });
}

/** Spinning ring of `n` orbiting motes/shards around (x,y): a guard / ward motif. */
export function orbitRing(g: Graphics, x: number, y: number, r: number, n: number, spin: number, size: number, body: number, core: number, alpha = 1) {
  for (let i = 0; i < n; i++) {
    const a = spin + (i / n) * Math.PI * 2;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r * 0.45;
    const front = Math.sin(a) > 0 ? 1 : 0.55; // back half dims for depth
    g.rect(px - size / 2 - 1, py - size / 2 - 1, size + 2, size + 2).fill({ color: INK, alpha: 0.7 * alpha * front });
    g.rect(px - size / 2, py - size / 2, size, size).fill({ color: body, alpha: alpha * front });
    g.rect(px - size / 2, py - size / 2, Math.max(1, size / 2), Math.max(1, size / 2)).fill({ color: core, alpha: alpha * front });
  }
}

/** Hexagonal ward / shield centred on (x,y), `r` tall. */
export function hexWard(g: Graphics, x: number, y: number, r: number, spin: number, body: number, core: number, alpha = 1) {
  if (r <= 1 || alpha <= 0) return;
  const pts: number[] = [];
  for (let k = 0; k < 6; k++) {
    const a = Math.PI / 6 + (k * Math.PI) / 3 + spin;
    pts.push(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r);
  }
  g.poly(pts).fill({ color: body, alpha: 0.16 * alpha }).stroke({ width: 4, color: INK, alpha: 0.6 * alpha });
  g.poly(pts).stroke({ width: 2, color: body, alpha });
  for (let k = 0; k < 6; k++) g.rect(pts[k * 2] - 1, pts[k * 2 + 1] - 1, 2, 2).fill({ color: core, alpha });
}

/**
 * Standard DEFEND beat: the guard draws itself around the monster over [from, from + 50] and the block
 * lands at `from + 16`. `draw` gets the centre of the body, a 0-1 grow and a 0-1 fade.
 */
export function guard(
  h: MoveHost, tl: Timeline, from: number, colors: number[],
  draw: (g: Graphics, cx: number, cy: number, grow: number, fade: number, f: number) => void,
) {
  drawSpan(h, tl, from, from + 50, (g, t, f) => {
    const p = h.pos();
    draw(g, p.x, p.y - h.height * 0.5, easeOut(Math.min(1, f / 14)), f > 30 ? 1 - (f - 30) / 20 : 1, f);
  });
  tl.at(from + 16, () => {
    h.sparks(h.pos().x, h.pos().y - h.height * 0.5, 12, colors);
    h.camera(1.15, h.pos().x, h.pos().y - h.height * 0.5, 16);
    h.sound('equip');
    h.impact();
  });
}

/** Lean into a motion: tilts toward the knight (negative) over [from, to] and back over the next `back` frames. */
export function lean(h: MoveHost, tl: Timeline, from: number, to: number, radians: number, back = 10) {
  tl.during(from, to, (t) => h.tilt(radians * easeOut(t)));
  tl.during(to, to + back, (t) => h.tilt(radians * (1 - easeInOut(t))));
}


// ---------------------------------------------------------------------------------------------
// Spine VFX beats (vfx.ts). Each pairs with the move's Graphics VFX, which still draw while rigs load.

/** Fireball blast at (x, y). */
export const boom = (h: MoveHost, x: number, y: number, size = 1) => h.vfx('explosion', x, y - 6 * size, { size });

/** Fiery crater and dust burst on the floor at (x, groundY): slams, stomps, landings. */
export const crater = (h: MoveHost, x: number, groundY: number, size = 1, anim = 'ShockWave_1') =>
  h.vfx('shockwave', x, groundY - 10 * size, { size, anim });

/** Toxic cloud burst at (x, y). */
export const toxic = (h: MoveHost, x: number, y: number, size = 1) => h.vfx('poison', x, y, { size });

/** Ice shatter at (x, y) (skips the rig's wind-up so it bursts immediately). */
export const shatter = (h: MoveHost, x: number, y: number, size = 1) => h.vfx('ice', x, y, { size, start: 66 });

/** Arcane circle laid flat on the floor for `life` frames: rituals, curses, summonings. */
export const circle = (h: MoveHost, x: number, groundY: number, size: number, life: number, tint?: number) =>
  h.vfx('summon', x, groundY, { size, life, squash: 0.35, layer: 'ground', tint });

/** Arcane ring burst at (x, y): portals opening, teleports, glyphs popping. */
export const portal = (h: MoveHost, x: number, y: number, size = 1, tint?: number) => h.vfx('summon', x, y, { anim: 'animation2', size, tint });

/** Rising green restorative glow on the monster. */
export const regen = (h: MoveHost, size = 1) => h.vfx('heal', h.pos().x, h.pos().y - h.height * 0.45, { size });

/** Burning flame ball; follows `at()` until `life` frames (projectiles, fire on a target). */
export function flame(h: MoveHost, tl: Timeline, from: number, life: number, at: () => { x: number; y: number }, size = 1) {
  let f: Spine | null = null;
  tl.at(from, () => {
    const p = at();
    f = h.vfx('fire', p.x, p.y, { size, life, loop: true });
  });
  tl.during(from, from + life, () => {
    if (f && !f.destroyed) f.position.set(at().x, at().y);
  });
}

/** Flaming crescent held for `life` frames at (x, y): fire- and gold-edged blade strikes. */
export const blaze = (h: MoveHost, x: number, y: number, size = 1, flipX = false, life = 14) =>
  h.vfx('slash', x, y, { size, flipX, life });

/** Spine hit spark in the attack's colour, for moves that call h.impact() directly instead of land(). */
export const spark = (h: MoveHost, color: number, heavy = false, at: { x: number; y: number } = chest(h)) =>
  h.vfx('hitSpark', at.x, at.y, { anim: sparkAnim(color, heavy), size: heavy ? 1 : 0.8 });
