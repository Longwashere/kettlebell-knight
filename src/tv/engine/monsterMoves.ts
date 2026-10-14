/**
 * Monster move choreography.
 *
 * Each move is a function that schedules work on a frame Timeline (60 fps frames, driven by the
 * engine ticker): Spine animations, monster displacement (dashes, leaps, burrows), camera, and
 * Graphics-based VFX. `h.impact()` is the frame where damage/block lands; the engine calls back
 * into BattleScreen there. If the monster dies mid-move, the move is cancelled and never lands.
 *
 * Coordinates are battlefield (gameLayer) space: knight feet ≈ (130, 168), monsters to the right,
 * facing left. Everything here draws with Graphics into move-owned containers that the engine
 * destroys when the move ends, so moves can't leak display objects.
 *
 * Palette follows the game's dark retro look: an ink contour under every stroke, a saturated body,
 * and a hot core highlight (see GameEngine.drawPainterlySlashArc).
 */
import { Container, Graphics } from 'pixi.js';
import type { Spine } from '@esotericsoftware/spine-pixi-v8';
import type { MonsterMoveId } from '../../types/battle';
import {
  Timeline, type EmitOptions, type SfxName,
  lerp, easeIn, easeOut, easeInOut, arc, rand,
  INK, BONE, BLOOD, BLOOD_DARK, EMBER, GOLD, GOO, DIRT, SHADOW, FIRE, SPORE, SMOKE,
} from './choreo';

export { Timeline, type EmitOptions, type SfxName };

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
  container(layer?: 'fx' | 'ground'): Container;

  anim(name: string, loop?: boolean): void;
  idle(): void;
  offset(x: number, y?: number): void;
  lift(height: number): void;
  stretch(sx: number, sy: number): void;
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
function contact(h: MoveHost, gap = 40) {
  return { x: h.knight.x + gap - h.home.x, y: h.knight.y - h.home.y };
}

/** Knight chest / head points. */
const chest = (h: MoveHost) => ({ x: h.knight.x + 6, y: h.knight.y - 28 });
const head = (h: MoveHost) => ({ x: h.knight.x + 4, y: h.knight.y - 44 });

/** Moves the monster between two offsets over [from, to], optionally hopping. */
function travel(
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
function dustAtFeet(h: MoveHost, count = 4, dir = 1) {
  const p = h.pos();
  h.emit(p.x + dir * 8, p.y - 2, {
    count, colors: [0x78716C, 0xA8A29E, 0x57534E], speed: [0.6, 1.8], angle: dir > 0 ? -0.4 : Math.PI + 0.4,
    spread: 0.6, gravity: -0.03, size: 3, life: [14, 24],
  });
}

/** A Graphics that draws itself every frame over [from, to] and is cleared afterwards. */
function drawSpan(h: MoveHost, tl: Timeline, from: number, to: number, draw: (g: Graphics, t: number, f: number) => void, layer: 'fx' | 'ground' = 'fx') {
  let g: Graphics | null = null;
  tl.during(from, to, (t, f) => {
    g ??= h.gfx(layer);
    g.clear();
    if (t < 1) draw(g, t, f);
  });
}

/** Projectile along an arc; `draw` renders the body at its current position. */
function projectile(
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
function clawRake(g: Graphics, x: number, y: number, dir: 1 | -1, size = 22, body = BLOOD) {
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
function jaws(g: Graphics, x: number, y: number, t: number, body = BONE, rim = BLOOD) {
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
function spike(g: Graphics, x: number, groundY: number, h: number, w: number, fill: number, edge: number, tip = BONE) {
  if (h <= 0.5) return;
  g.poly([x - w, groundY, x - w * 0.3, groundY - h * 0.55, x, groundY - h, x + w * 0.35, groundY - h * 0.5, x + w, groundY])
    .fill({ color: fill }).stroke({ width: 2, color: INK });
  // lit left face
  g.poly([x - w * 0.7, groundY, x - w * 0.25, groundY - h * 0.55, x, groundY - h, x - w * 0.05, groundY]).fill({ color: edge, alpha: 0.85 });
  g.moveTo(x - w * 0.3, groundY - h * 0.55).lineTo(x, groundY - h).stroke({ width: 1, color: tip, alpha: 0.7 });
  g.rect(x - 0.5, groundY - h, 1, 2).fill({ color: tip });
}

/** Layered glowing orb (outer haze, body, core, white-hot centre). */
function orb(g: Graphics, x: number, y: number, r: number, colors: number[]) {
  g.circle(x, y, r * 1.6).fill({ color: colors[2] ?? colors[0], alpha: 0.25 });
  g.circle(x, y, r).fill({ color: colors[1] ?? colors[0] }).stroke({ width: 1.5, color: INK, alpha: 0.6 });
  g.circle(x - r * 0.15, y - r * 0.15, r * 0.6).fill({ color: colors[0] });
  g.circle(x - r * 0.25, y - r * 0.25, Math.max(1, r * 0.25)).fill({ color: 0xFFFFFF });
}

/** Expanding ritual circle: ring, inner star, and tick glyphs, drawn in perspective on the ground. */
function sigil(g: Graphics, x: number, y: number, r: number, progress: number, spin: number, color: number, core: number) {
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
function retreat(h: MoveHost, tl: Timeline, from: number, to: number, fromOffset: { x: number; y: number }, hop = 0) {
  travel(h, tl, from, to, fromOffset, { x: 0, y: 0 }, easeInOut, hop);
}

// ---------------------------------------------------------------------------------------------
// GREEN SLIME — acid ooze. Squash & stretch carries everything.

function slimeSlap(h: MoveHost, tl: Timeline) {
  const c = contact(h, 34);
  tl.at(0, () => h.anim('Atk1'));
  tl.during(0, 8, (t) => h.stretch(lerp(1, 1.2, t), lerp(1, 0.75, t)));
  travel(h, tl, 8, 20, { x: 0, y: 0 }, c, easeOut, 30);
  tl.during(8, 20, (t) => h.stretch(lerp(0.85, 1, t), lerp(1.25, 1, t)));
  tl.at(20, () => {
    h.stretch(1.35, 0.65);
    const p = chest(h);
    h.emit(p.x + 4, p.y + 6, { count: 18, colors: GOO, speed: [1.5, 4], angle: -Math.PI * 0.6, spread: 0.9, gravity: 0.18, size: 3, life: [16, 28] });
    h.shockwave(h.knight.x + 10, h.knight.y, 0x84CC16);
    h.shake(6);
    h.camera(1.15, h.knight.x + 20, h.knight.y - 20, 10);
    h.sound('hit');
    h.impact(6);
  });
  drawSpan(h, tl, 20, 70, (g, t) => {
    g.ellipse(h.knight.x + 16, h.knight.y + 1, 18 * (0.6 + t * 0.4), 4).fill({ color: 0x365314, alpha: 0.7 * (1 - t) });
    g.ellipse(h.knight.x + 14, h.knight.y, 12 * (0.6 + t * 0.4), 2.5).fill({ color: 0x84CC16, alpha: 0.6 * (1 - t) });
  }, 'ground');
  tl.during(20, 30, (t) => h.stretch(lerp(1.35, 1, easeOut(t)), lerp(0.65, 1, easeOut(t))));
  retreat(h, tl, 32, 50, c, 18);
  tl.end(52);
}

function slimeAcidSpit(h: MoveHost, tl: Timeline) {
  tl.at(0, () => h.anim('Skl1'));
  tl.during(0, 18, (t) => h.stretch(1 + 0.15 * easeOut(t), 1 + 0.15 * easeOut(t) + Math.sin(t * 20) * 0.03));
  const mouth = () => ({ x: h.pos().x - 10, y: h.pos().y - h.height * 0.55 });
  [20, 28, 36].forEach((f, i) => {
    tl.at(f, () => {
      h.stretch(0.9, 1.15);
      h.sound('swing');
    });
    tl.at(f + 3, () => h.stretch(1.12, 1.12));
    const target = () => {
      const p = chest(h);
      return { x: p.x + rand(-6, 6), y: p.y + rand(-8, 8) };
    };
    projectile(h, tl, f, 20, mouth, target, 36 - i * 6,
      (g, x, y) => {
        g.circle(x, y, 7).fill({ color: 0x84CC16, alpha: 0.3 });
        g.circle(x, y, 5).fill({ color: 0x84CC16 }).stroke({ width: 1.5, color: INK });
        g.rect(x - 2.5, y - 2.5, 2, 2).fill({ color: 0xD9F99D });
      },
      () => {
        const p = chest(h);
        h.emit(p.x, p.y, { count: 8, colors: GOO, speed: [1, 2.5], spread: Math.PI, gravity: 0.15, size: 2, life: [12, 20] });
        h.emit(p.x, p.y - 4, { count: 5, colors: [0x65A30D, 0x4D7C0F, 0xA8A29E], speed: [0.2, 0.6], angle: -Math.PI / 2, spread: 0.5, gravity: -0.04, size: 4, life: [24, 36] });
        if (i < 2) h.knightHit(2);
        else {
          h.impact(4);
          h.shake(5);
          h.flash(0.25, 0x84CC16);
        }
      },
      (x, y) => {
        if (Math.random() < 0.4) h.emit(x, y, { count: 1, colors: GOO, speed: [0, 0.3], spread: Math.PI, gravity: 0.1, size: 2, life: [8, 12] });
      });
  });
  tl.during(44, 56, (t) => h.stretch(lerp(1.12, 1, t), lerp(1.12, 1, t)));
  tl.at(60, () => h.idle());
  tl.end(66);
}

function slimeOozeSlam(h: MoveHost, tl: Timeline) {
  const over = { x: h.knight.x + 8 - h.home.x, y: h.knight.y - h.home.y + 1 };
  tl.at(0, () => {
    h.anim('Skl1');
    h.camera(1.15, h.home.x, h.home.y - 20, 22);
    h.sound('swing');
  });
  tl.during(0, 24, (t) => {
    h.stretch(1 + 0.3 * easeOut(t) + Math.sin(t * 30) * 0.04, 1 + 0.3 * easeOut(t));
    h.dim(0.35 * t);
  });
  // Launch straight up out of frame
  tl.during(24, 36, (t) => {
    h.lift(easeIn(t) * 220);
    h.stretch(lerp(1.3, 0.7, t), lerp(1.3, 1.5, t));
  });
  tl.at(24, () => {
    h.emit(h.home.x, h.home.y - 4, { count: 14, colors: GOO, speed: [1, 3], angle: -Math.PI / 2, spread: 1.2, gravity: 0.2, size: 3, life: [14, 22] });
    h.shake(4);
  });
  // Shadow slides over the knight while the slime hangs off-screen
  travel(h, tl, 36, 56, { x: 0, y: 0 }, over, easeInOut);
  tl.at(40, () => h.camera(1.25, h.knight.x + 10, h.knight.y - 25, 34));
  drawSpan(h, tl, 40, 64, (g, t, f) => {
    const pulse = 0.5 + 0.5 * Math.sin(f * 0.6);
    g.ellipse(h.knight.x + 8, h.knight.y, 16 + 10 * t, 4 + 2.5 * t).stroke({ width: 2, color: BLOOD, alpha: 0.5 + 0.5 * pulse });
  }, 'ground');
  tl.during(56, 64, (t) => {
    h.lift(lerp(220, 0, easeIn(t)));
    h.stretch(0.75, 1.4);
  });
  tl.at(64, () => {
    h.stretch(1.55, 0.55);
    h.hitStop(5);
    h.shake(14);
    h.flash(0.5, 0xD9F99D);
    h.shockwave(h.knight.x + 8, h.knight.y, 0x84CC16);
    h.shockwave(h.knight.x + 8, h.knight.y, 0x365314);
    h.emit(h.knight.x + 8, h.knight.y - 10, { count: 32, colors: GOO, speed: [2, 5], angle: -Math.PI / 2, spread: 1.4, gravity: 0.22, size: 3, life: [18, 32] });
    h.sound('crit');
    h.impact(14);
  });
  drawSpan(h, tl, 64, 130, (g, t) => {
    g.ellipse(h.knight.x + 8, h.knight.y + 1, 34, 6).fill({ color: 0x365314, alpha: 0.75 * (1 - t) });
    g.ellipse(h.knight.x + 6, h.knight.y, 22, 3.5).fill({ color: 0x84CC16, alpha: 0.6 * (1 - t) });
  }, 'ground');
  tl.during(64, 80, (t) => {
    const w = Math.sin(t * Math.PI * 3) * (1 - t) * 0.25;
    h.stretch(lerp(1.55, 1, easeOut(t)) + w, lerp(0.55, 1, easeOut(t)) - w);
  });
  tl.during(80, 100, (t) => h.dim(0.35 * (1 - t)));
  retreat(h, tl, 86, 110, over, 40);
  tl.end(112);
}

function slimeEngulf(h: MoveHost, tl: Timeline) {
  const c = contact(h, 26);
  tl.at(0, () => h.anim('Move', true));
  travel(h, tl, 0, 30, { x: 0, y: 0 }, c, easeInOut);
  tl.during(0, 30, (t, f) => h.stretch(1 + Math.sin(f * 0.5) * 0.15, 1 - Math.sin(f * 0.5) * 0.12));
  // Slime trail left on the floor
  drawSpan(h, tl, 0, 110, (g, t, f) => {
    const travelled = Math.min(1, f / 30);
    const x0 = h.home.x;
    const x1 = lerp(h.home.x, h.home.x + c.x, travelled);
    const fade = f > 70 ? 1 - (f - 70) / 40 : 1;
    g.moveTo(x0, h.home.y).lineTo(x1, lerp(h.home.y, h.knight.y, travelled)).stroke({ width: 5, color: 0x365314, alpha: 0.6 * fade });
    g.moveTo(x0, h.home.y - 0.5).lineTo(x1, lerp(h.home.y, h.knight.y, travelled) - 0.5).stroke({ width: 2, color: 0x84CC16, alpha: 0.5 * fade });
  }, 'ground');
  tl.at(30, () => {
    h.anim('Atk1');
    h.sound('swing');
  });
  tl.during(30, 38, (t) => h.stretch(lerp(1, 1.6, t), lerp(1, 1.35, t)));
  // Translucent acid dome over the knight with bubbles
  drawSpan(h, tl, 34, 82, (g, t, f) => {
    const p = chest(h);
    const grow = easeOut(Math.min(1, f / 8));
    const wob = Math.sin(f * 0.4) * 2;
    g.ellipse(p.x, p.y + 4, (26 + wob) * grow, (34 - wob) * grow).fill({ color: 0x65A30D, alpha: 0.45 }).stroke({ width: 2, color: 0x365314, alpha: 0.9 });
    g.ellipse(p.x - 8, p.y - 14, 5 * grow, 8 * grow).fill({ color: 0xD9F99D, alpha: 0.5 });
  });
  tl.every(36, 80, 3, () => {
    const p = chest(h);
    h.emit(p.x + rand(-14, 14), p.y + 20, { count: 1, colors: [0xD9F99D, 0xA3E635], speed: [0.4, 0.9], angle: -Math.PI / 2, spread: 0.2, gravity: -0.02, size: 2, life: [14, 22] });
  });
  [44, 58].forEach((f) => tl.at(f, () => {
    h.knightHit(2);
    h.sparks(chest(h).x, chest(h).y, 6, GOO);
  }));
  tl.at(72, () => {
    h.impact(4);
    h.shake(7);
    h.sound('hit');
  });
  tl.at(82, () => {
    const p = chest(h);
    h.emit(p.x, p.y, { count: 26, colors: GOO, speed: [2, 4.5], spread: Math.PI, gravity: 0.2, size: 3, life: [14, 26] });
    h.shockwave(h.knight.x + 6, h.knight.y, 0x84CC16);
    h.stretch(1, 1);
    h.anim('Move', true);
  });
  travel(h, tl, 86, 110, c, { x: 0, y: 0 }, easeInOut);
  tl.at(110, () => h.idle());
  tl.end(112);
}

// ---------------------------------------------------------------------------------------------
// RAZORBACK BOAR — weight and momentum: long anticipation, violent release.

function boarTuskSlash(h: MoveHost, tl: Timeline) {
  const c = contact(h, 38);
  tl.at(0, () => h.anim('skill'));
  travel(h, tl, 0, 10, { x: 0, y: 0 }, { x: 8, y: 0 }, easeOut);
  travel(h, tl, 10, 26, { x: 8, y: 0 }, c, easeIn);
  tl.every(12, 26, 2, () => {
    const p = h.pos();
    h.streaks(p.x + 14, p.y - 18, 26, [0xA8A29E, BONE]);
    dustAtFeet(h, 2, 1);
  });
  drawSpan(h, tl, 30, 40, (g, t) => {
    const p = chest(h);
    h.slashArc(g, p.x + 12, p.y + 4, 28, Math.PI * (0.75 - 0.9 * easeOut(t)), Math.PI * 0.75, BLOOD_DARK, 0xE7D8B0, BONE);
  });
  tl.at(32, () => {
    const p = chest(h);
    h.sparks(p.x, p.y, 14, [BONE, BLOOD, 0xE7D8B0]);
    h.hitStop(3);
    h.shake(8);
    h.camera(1.18, h.knight.x + 20, h.knight.y - 22, 12);
    h.sound('hit');
    h.impact(8);
  });
  retreat(h, tl, 38, 58, c);
  tl.end(60);
}

function boarGoreCharge(h: MoveHost, tl: Timeline) {
  const ram = { x: h.knight.x + 18 - h.home.x, y: h.knight.y - h.home.y };
  tl.at(0, () => {
    h.anim('bak', true);
    h.camera(1.22, h.home.x, h.home.y - 18, 40);
  });
  // Paw-scrape: dust kicked backwards, rage tint, snort steam
  tl.every(0, 44, 5, () => dustAtFeet(h, 3, 1));
  tl.during(18, 44, (t, f) => h.tint(Math.sin(f * 0.5) > 0 ? 0xFF9A9A : 0xFFFFFF));
  tl.every(10, 44, 9, () => {
    const p = h.pos();
    h.emit(p.x - 18, p.y - 14, { count: 3, colors: [0xE7E5E4, 0xA8A29E], speed: [0.4, 0.9], angle: Math.PI + 0.3, spread: 0.3, gravity: -0.03, size: 3, life: [12, 18] });
  });
  tl.at(44, () => {
    h.tint(0xFFFFFF);
    h.anim('move', true);
    h.sound('swing');
  });
  travel(h, tl, 44, 58, { x: 0, y: 0 }, ram, easeIn);
  tl.every(44, 58, 2, () => {
    const p = h.pos();
    h.streaks(p.x + 18, p.y - 16, 40, [0xA8A29E, BONE, BLOOD]);
    dustAtFeet(h, 3, 1);
  });
  tl.at(58, () => {
    const p = chest(h);
    h.hitStop(6);
    h.flash(0.6);
    h.shake(15);
    h.sparks(p.x, p.y, 24, [BONE, BLOOD, 0xE7D8B0, 0xFFFFFF]);
    h.shockwave(h.knight.x, h.knight.y, 0xE7D8B0);
    h.camera(1.3, h.knight.x + 10, h.knight.y - 22, 14);
    h.sound('crit');
    h.impact(18);
    h.anim('skill');
  });
  // Recoil skid, then trot home
  travel(h, tl, 60, 70, ram, { x: ram.x + 26, y: ram.y }, easeOut);
  tl.at(74, () => h.anim('move', true));
  travel(h, tl, 74, 100, { x: ram.x + 26, y: ram.y }, { x: 0, y: 0 }, easeInOut);
  tl.at(100, () => h.idle());
  tl.end(102);
}

function boarEarthsplitter(h: MoveHost, tl: Timeline) {
  tl.at(0, () => h.anim('bak'));
  tl.during(0, 14, (t) => {
    h.lift(easeOut(t) * 30);
    h.stretch(0.9, 1.12);
  });
  tl.during(14, 20, (t) => h.lift(lerp(30, 0, easeIn(t))));
  tl.at(20, () => {
    h.stretch(1.2, 0.85);
    h.shake(9);
    h.shockwave(h.home.x, h.home.y, 0x8B5A2B);
    dustAtFeet(h, 10, -1);
    dustAtFeet(h, 10, 1);
    h.sound('hit');
  });
  tl.during(20, 28, (t) => h.stretch(lerp(1.2, 1, t), lerp(0.85, 1, t)));
  // Crack racing along the floor with an ember-lit seam
  const pts: number[] = [];
  tl.at(20, () => {
    const x0 = h.home.x - 16;
    const x1 = h.knight.x + 6;
    const n = 10;
    for (let i = 0; i <= n; i++) pts.push(lerp(x0, x1, i / n), lerp(h.home.y, h.knight.y, i / n) + (i % 2 ? -2 : 2) * rand(0.5, 1.5));
  });
  drawSpan(h, tl, 20, 72, (g, t, f) => {
    const grow = Math.min(1, f / 20);
    const fade = f > 34 ? 1 - (f - 34) / 18 : 1;
    const n = Math.floor((pts.length / 2 - 1) * grow);
    for (const [w, color, a] of [[4, INK, 0.9], [2, EMBER, 0.95], [1, GOLD, 1]] as const) {
      g.moveTo(pts[0], pts[1]);
      for (let i = 1; i <= n; i++) g.lineTo(pts[i * 2], pts[i * 2 + 1]);
      g.stroke({ width: w, color, alpha: a * fade });
    }
  }, 'ground');
  tl.every(22, 40, 3, () => {
    const i = Math.floor(rand(1, pts.length / 2 - 1));
    h.emit(pts[i * 2], pts[i * 2 + 1], { count: 2, colors: DIRT, speed: [0.8, 2], angle: -Math.PI / 2, spread: 0.6, gravity: 0.15, size: 2, life: [10, 16] });
  });
  // Rock spikes erupt under the knight
  drawSpan(h, tl, 40, 72, (g, t, f) => {
    const up = f < 6 ? easeOut(f / 6) : f > 20 ? 1 - (f - 20) / 12 : 1;
    const x = h.knight.x + 4;
    spike(g, x - 16, h.knight.y + 2, 34 * up, 8, DIRT[0], DIRT[3]);
    spike(g, x + 15, h.knight.y + 2, 40 * up, 9, DIRT[0], DIRT[3]);
    spike(g, x, h.knight.y + 3, 56 * up, 11, DIRT[1], 0xD6A15A);
  }, 'fx');
  tl.at(40, () => {
    h.emit(h.knight.x, h.knight.y - 4, { count: 18, colors: DIRT, speed: [1.5, 4], angle: -Math.PI / 2, spread: 0.9, gravity: 0.2, size: 3, life: [16, 28] });
    h.shake(10);
    h.hitStop(4);
    h.camera(1.2, h.knight.x + 10, h.knight.y - 24, 14);
    h.sound('crit');
    h.impact(6);
  });
  tl.end(74);
}

function boarQuillVolley(h: MoveHost, tl: Timeline) {
  tl.at(0, () => {
    h.anim('skill2', true);
    h.camera(1.12, h.home.x - 20, h.home.y - 20, 20);
  });
  tl.during(0, 18, (t, f) => h.stretch(1 + Math.sin(f * 1.2) * 0.05, 1 + 0.08 * t));
  tl.at(14, () => h.sparks(h.home.x + 6, h.home.y - h.height * 0.8, 8, [BONE, 0xE7D8B0]));
  const back = () => ({ x: h.pos().x + 4, y: h.pos().y - h.height * 0.75 });
  [18, 22, 26, 30, 34].forEach((f, i) => {
    let prev = { x: 0, y: 0 };
    projectile(h, tl, f, 13, back, () => {
      const p = chest(h);
      return { x: p.x + rand(-4, 8), y: p.y + rand(-14, 12) };
    }, 14,
    (g, x, y, t) => {
      if (t === 0) prev = { x, y };
      const ang = Math.atan2(y - prev.y, x - prev.x);
      prev = { x, y };
      const dx = Math.cos(ang) * 9;
      const dy = Math.sin(ang) * 9;
      g.moveTo(x - dx, y - dy).lineTo(x + dx, y + dy).stroke({ width: 4, color: INK });
      g.moveTo(x - dx, y - dy).lineTo(x + dx, y + dy).stroke({ width: 2, color: 0xE7D8B0 });
      g.moveTo(x, y).lineTo(x + dx, y + dy).stroke({ width: 1, color: 0xFFFFFF });
      g.rect(x + dx - 1.5, y + dy - 1.5, 3, 3).fill({ color: BLOOD });
    },
    () => {
      const p = chest(h);
      h.sparks(p.x, p.y, 4, [BONE, BLOOD]);
      if (i < 4) h.knightHit(2);
      else {
        h.impact(5);
        h.shake(6);
        h.sound('hit');
      }
    });
    tl.at(f, () => h.sound('swing'));
  });
  tl.at(52, () => h.idle());
  tl.end(56);
}

function boarIronBristles(h: MoveHost, tl: Timeline) {
  tl.at(0, () => h.anim('bak'));
  tl.during(0, 36, (t, f) => h.tint(Math.sin(f * 0.4) > 0 ? 0xB8C4D6 : 0xFFFFFF));
  drawSpan(h, tl, 6, 34, (g, t) => {
    const p = h.pos();
    g.circle(p.x, p.y - h.height * 0.45, 14 + 24 * easeOut(t)).stroke({ width: 3, color: 0x64748B, alpha: 1 - t });
    g.circle(p.x, p.y - h.height * 0.45, 13 + 24 * easeOut(t)).stroke({ width: 1, color: 0xFFFFFF, alpha: 1 - t });
  });
  tl.at(16, () => {
    h.sparks(h.pos().x, h.pos().y - h.height * 0.6, 12, [0xFFFFFF, 0x94A3B8, 0xCBD5E1]);
    h.sound('equip');
    h.impact();
  });
  tl.at(36, () => h.tint(0xFFFFFF));
  tl.end(40);
}

// ---------------------------------------------------------------------------------------------
// SHADOW WOLF — speed, afterimages, and the hunter's eye-glint before the kill.

function wolfPredatorRake(h: MoveHost, tl: Timeline) {
  const c = contact(h, 34);
  tl.at(0, () => h.anim('run', true));
  travel(h, tl, 0, 14, { x: 0, y: 0 }, c, easeIn);
  tl.every(0, 14, 2, () => {
    const p = h.pos();
    h.streaks(p.x + 10, p.y - 18, 34, [SHADOW[1], SHADOW[2]]);
  });
  tl.at(14, () => h.anim('attack'));
  [32, 37, 42].forEach((f, i) => {
    drawSpan(h, tl, f, f + 9, (g, t) => {
      const p = chest(h);
      const dir = i % 2 === 0 ? 1 : -1;
      g.alpha = 1 - t;
      clawRake(g, p.x + 2 + i * 3, p.y - 4 + i * 4, dir as 1 | -1, 20 + 8 * easeOut(Math.min(1, t * 3)));
    });
    tl.at(f, () => {
      const p = chest(h);
      h.sparks(p.x, p.y, 8, [BLOOD, BONE, SHADOW[2]]);
      h.sound('hit');
      if (i < 2) h.knightHit(3);
      else {
        h.hitStop(4);
        h.shake(10);
        h.camera(1.2, h.knight.x + 14, h.knight.y - 24, 12);
        h.impact(8);
      }
    });
  });
  // Backflip home
  tl.at(52, () => h.sound('swing'));
  retreat(h, tl, 52, 72, c, 34);
  tl.at(72, () => h.idle());
  tl.end(74);
}

function wolfShadowPounce(h: MoveHost, tl: Timeline) {
  const land = { x: h.knight.x + 22 - h.home.x, y: h.knight.y - h.home.y };
  tl.at(0, () => h.anim('posture'));
  tl.during(0, 16, (t) => {
    h.stretch(1 + 0.1 * t, 1 - 0.12 * t);
    h.dim(0.3 * t, 0x1E0B33);
  });
  tl.every(0, 16, 3, () => {
    const p = h.pos();
    h.emit(p.x + rand(-12, 12), p.y - 4, { count: 2, colors: SHADOW, speed: [0.4, 1], angle: -Math.PI / 2, spread: 0.3, gravity: -0.04, size: 3, life: [16, 26] });
  });
  tl.at(16, () => {
    h.stretch(1, 1);
    h.anim('skill1');
    h.sound('swing');
    h.camera(1.15, (h.home.x + h.knight.x) / 2, h.knight.y - 40, 30);
  });
  travel(h, tl, 18, 46, { x: 0, y: 0 }, land, easeInOut, 72);
  tl.every(18, 46, 2, () => {
    const p = h.pos();
    h.emit(p.x + 6, p.y - 20 - h.height * 0.2, { count: 3, colors: SHADOW, speed: [0.1, 0.4], spread: Math.PI, gravity: 0, size: 4, life: [10, 16] });
  });
  tl.at(46, () => {
    const p = chest(h);
    h.hitStop(4);
    h.shake(11);
    h.flash(0.35, 0xA855F7);
    h.shockwave(h.knight.x + 10, h.knight.y, 0x7C3AED);
    h.sparks(p.x, p.y, 16, [...SHADOW, BLOOD]);
    h.camera(1.28, h.knight.x + 14, h.knight.y - 24, 12);
    h.sound('crit');
    h.impact(10);
  });
  tl.during(46, 64, (t) => h.dim(0.3 * (1 - t), 0x1E0B33));
  retreat(h, tl, 52, 74, land, 40);
  tl.at(74, () => h.idle());
  tl.end(76);
}

function wolfThroatBite(h: MoveHost, tl: Timeline) {
  const c = contact(h, 30);
  tl.at(0, () => {
    h.anim('posture');
    h.camera(1.25, h.home.x - 10, h.home.y - 28, 18);
  });
  tl.during(0, 20, (t) => h.dim(0.5 * t));
  // Eye glint
  drawSpan(h, tl, 6, 18, (g, t) => {
    const p = h.pos();
    const ex = p.x - 16;
    const ey = p.y - h.height * 0.78;
    const a = arc(t);
    g.rect(ex - 1, ey - 1, 3, 2).fill({ color: BLOOD, alpha: a });
    g.moveTo(ex - 10 * a, ey).lineTo(ex + 10 * a, ey).stroke({ width: 1, color: 0xFF3366, alpha: a });
    g.moveTo(ex, ey - 6 * a).lineTo(ex, ey + 6 * a).stroke({ width: 1, color: 0xFF3366, alpha: a * 0.7 });
  });
  tl.at(8, () => h.sound('swing'));
  tl.at(20, () => h.anim('run', true));
  travel(h, tl, 20, 30, { x: 0, y: 0 }, c, easeIn);
  tl.every(20, 30, 2, () => {
    const p = h.pos();
    h.streaks(p.x + 10, p.y - 18, 40, [BLOOD, SHADOW[1]]);
  });
  tl.at(30, () => h.anim('attack'));
  drawSpan(h, tl, 30, 46, (g, t, f) => {
    const p = head(h);
    if (f <= 6) jaws(g, p.x, p.y + 6, f / 6);
    else {
      g.alpha = 1 - (f - 6) / 10;
      jaws(g, p.x, p.y + 6, 1);
    }
  });
  tl.at(36, () => {
    const p = head(h);
    h.hitStop(7);
    h.flash(0.5, BLOOD);
    h.shake(14);
    h.emit(p.x, p.y + 6, { count: 26, colors: [BLOOD, 0x7F1D1D, 0xFF3366], speed: [1.5, 4], angle: -Math.PI * 0.75, spread: 0.8, gravity: 0.22, size: 3, life: [16, 30] });
    h.camera(1.35, h.knight.x + 10, h.knight.y - 30, 16);
    h.sound('crit');
    h.impact(10);
  });
  // Savage head-shake while latched
  tl.during(40, 50, (t, f) => h.offset(c.x + Math.sin(f * 2.2) * 3, c.y));
  tl.during(46, 66, (t) => h.dim(0.5 * (1 - t)));
  retreat(h, tl, 50, 70, c, 20);
  tl.at(70, () => h.idle());
  tl.end(72);
}

function wolfPhantomPack(h: MoveHost, tl: Timeline) {
  tl.at(0, () => {
    h.anim('posture');
    h.camera(1.1, 240, 140, 70);
    h.sound('level_up');
  });
  tl.during(0, 24, (t) => h.dim(0.6 * easeOut(t), 0x1E0B33));
  // Blood moon rising behind the pack
  drawSpan(h, tl, 0, 96, (g, t, f) => {
    const a = f < 20 ? f / 20 : f > 76 ? 1 - (f - 76) / 20 : 1;
    const mx = 330;
    const my = 62;
    g.circle(mx, my, 24).fill({ color: BLOOD, alpha: 0.18 * a });
    g.circle(mx, my, 16).fill({ color: 0x7F1D1D, alpha: 0.9 * a }).stroke({ width: 2, color: INK, alpha: a });
    g.circle(mx - 3, my - 3, 11).fill({ color: BLOOD, alpha: 0.9 * a });
    g.circle(mx + 5, my + 4, 3).fill({ color: 0x7F1D1D, alpha: a });
  }, 'ground');
  // Howl rings
  drawSpan(h, tl, 4, 34, (g, t) => {
    const p = h.pos();
    for (let k = 0; k < 3; k++) {
      const r = 8 + (t * 60 + k * 14) % 54;
      g.arc(p.x - 14, p.y - h.height * 0.8, r, Math.PI * 0.9, Math.PI * 1.5).stroke({ width: 2, color: SHADOW[2], alpha: 1 - r / 62 });
    }
  });
  // Three spectral wolves tear through the knight
  [24, 36, 48].forEach((f, i) => {
    let ghost: Spine | null = null;
    const lane = h.knight.y + [-4, 4, 0][i];
    tl.at(f, () => {
      ghost = h.clone();
      if (!ghost) return;
      ghost.tint = 0x9F7AEA;
      ghost.alpha = 0.7;
      ghost.state.setAnimation(0, 'run', true);
      ghost.y = lane;
      ghost.x = 450;
      h.sound('swing');
    });
    tl.during(f, f + 20, (t) => {
      if (!ghost) return;
      ghost.x = lerp(450, -40, t);
      if (Math.random() < 0.3) h.streaks(ghost.x + 16, lane - 18, 30, [SHADOW[1], SHADOW[2]]);
    });
    drawSpan(h, tl, f + 11, f + 19, (g, t) => {
      const p = chest(h);
      g.alpha = 1 - t;
      clawRake(g, p.x, p.y + (i - 1) * 6, i % 2 ? -1 : 1, 26, SHADOW[2]);
    });
    tl.at(f + 11, () => {
      const p = chest(h);
      h.sparks(p.x, p.y, 10, [...SHADOW, BONE]);
      if (i < 2) h.knightHit(4);
      else {
        h.hitStop(5);
        h.shake(12);
        h.flash(0.35, 0xA855F7);
        h.sound('crit');
        h.impact(10);
      }
    });
  });
  tl.during(74, 96, (t) => h.dim(0.6 * (1 - t), 0x1E0B33));
  tl.end(98);
}

// ---------------------------------------------------------------------------------------------
// TREEMON — slow, heavy, and the forest itself attacks: roots, spores, burrowing.

function treeBranchWhip(h: MoveHost, tl: Timeline) {
  const near = { x: h.knight.x + 78 - h.home.x, y: h.knight.y - h.home.y };
  tl.at(0, () => h.anim('Move', true));
  travel(h, tl, 0, 24, { x: 0, y: 0 }, near, easeInOut);
  tl.every(4, 24, 8, () => {
    dustAtFeet(h, 3, 1);
    h.shake(2);
  });
  tl.at(24, () => h.anim('Atk1'));
  // Whip lashes out along a curve, cracks on the knight, then recoils
  drawSpan(h, tl, 38, 60, (g, t, f) => {
    const p = h.pos();
    const sx = p.x - 10;
    const sy = p.y - h.height * 0.7;
    const e = chest(h);
    const reach = f < 8 ? easeOut(f / 8) : 1 - easeIn((f - 8) / 14);
    const ex = lerp(sx, e.x, reach);
    const ey = lerp(sy, e.y, reach);
    const cx = (sx + ex) / 2;
    const cy = Math.min(sy, ey) - 26 * reach;
    for (const [w, color] of [[8, INK], [5, DIRT[0]], [2, 0xD6A15A]] as const) {
      g.moveTo(sx, sy).quadraticCurveTo(cx, cy, ex, ey).stroke({ width: w, color });
    }
    for (let k = 1; k < 6; k++) {
      const u = k / 6;
      const px = (1 - u) * (1 - u) * sx + 2 * (1 - u) * u * cx + u * u * ex;
      const py = (1 - u) * (1 - u) * sy + 2 * (1 - u) * u * cy + u * u * ey;
      g.poly([px - 2, py, px + 2, py, px, py - 5]).fill({ color: 0x4D7C0F }).stroke({ width: 1, color: INK });
    }
    g.circle(ex, ey, 3).fill({ color: 0x84CC16 }).stroke({ width: 1, color: INK });
  });
  tl.at(46, () => {
    const p = chest(h);
    h.emit(p.x, p.y, { count: 14, colors: [0x4D7C0F, 0x84CC16, DIRT[1]], speed: [1, 3], spread: Math.PI, gravity: 0.06, size: 3, life: [20, 34] });
    h.sparks(p.x, p.y, 8, [BONE, 0x84CC16]);
    h.hitStop(3);
    h.shake(8);
    h.camera(1.18, h.knight.x + 16, h.knight.y - 24, 12);
    h.sound('hit');
    h.impact(8);
  });
  drawSpan(h, tl, 46, 56, (g, t) => {
    const p = chest(h);
    h.slashArc(g, p.x + 6, p.y, 22, Math.PI * 0.85, Math.PI * (0.85 + 0.9 * easeOut(t)), 0x1A2E05, 0x4D7C0F, 0xD9F99D);
    g.alpha = 1 - t;
  });
  tl.at(60, () => h.anim('Move', true));
  travel(h, tl, 60, 86, near, { x: 0, y: 0 }, easeInOut);
  tl.at(86, () => h.idle());
  tl.end(88);
}

function treeRootStomp(h: MoveHost, tl: Timeline) {
  tl.at(0, () => {
    h.anim('Atk1');
    h.camera(1.12, h.home.x - 20, h.home.y - 30, 22);
  });
  tl.during(0, 22, (t) => h.stretch(1 + 0.06 * t, 1 + 0.1 * t));
  tl.at(24, () => {
    h.stretch(1.15, 0.9);
    h.shake(9);
    h.shockwave(h.home.x, h.home.y, 0x4D7C0F);
    dustAtFeet(h, 8, -1);
    h.sound('hit');
  });
  tl.during(24, 32, (t) => h.stretch(lerp(1.15, 1, t), lerp(0.9, 1, t)));
  // Root wave: thorny spikes erupting in sequence toward the knight
  const n = 7;
  for (let i = 0; i < n; i++) {
    const start = 26 + i * 4;
    drawSpan(h, tl, start, start + 18, (g, t) => {
      const x = lerp(h.home.x - 22, h.knight.x + 34, i / (n - 1));
      const y = lerp(h.home.y, h.knight.y, i / (n - 1)) + 2;
      const up = t < 0.3 ? easeOut(t / 0.3) : 1 - easeIn((t - 0.3) / 0.7);
      spike(g, x, y, (20 + i * 3) * up, 6, DIRT[2], 0x4D7C0F, 0x84CC16);
    });
    tl.at(start, () => {
      const x = lerp(h.home.x - 22, h.knight.x + 34, i / (n - 1));
      h.emit(x, h.knight.y - 2, { count: 3, colors: DIRT, speed: [0.8, 2], angle: -Math.PI / 2, spread: 0.7, gravity: 0.15, size: 2, life: [10, 18] });
      h.shake(2);
    });
  }
  // Great thorn impales from beneath the knight
  drawSpan(h, tl, 54, 88, (g, t, f) => {
    const up = f < 5 ? easeOut(f / 5) : f > 22 ? 1 - (f - 22) / 12 : 1;
    const x = h.knight.x + 6;
    spike(g, x - 12, h.knight.y + 3, 34 * up, 6, DIRT[2], 0x4D7C0F, 0x84CC16);
    spike(g, x + 10, h.knight.y + 3, 40 * up, 7, DIRT[2], 0x4D7C0F, 0x84CC16);
    spike(g, x, h.knight.y + 4, 62 * up, 9, DIRT[0], DIRT[1], BONE);
  });
  tl.at(54, () => {
    h.hitStop(6);
    h.flash(0.4);
    h.shake(15);
    h.camera(1.3, h.knight.x + 8, h.knight.y - 30, 18);
    h.emit(h.knight.x + 6, h.knight.y - 10, { count: 22, colors: [...DIRT, 0x4D7C0F], speed: [1.5, 4.5], angle: -Math.PI / 2, spread: 1, gravity: 0.2, size: 3, life: [18, 30] });
    h.sound('crit');
    h.impact(12);
  });
  tl.end(90);
}

function treeBurrowAmbush(h: MoveHost, tl: Timeline) {
  const under = { x: h.knight.x + 16 - h.home.x, y: h.knight.y - h.home.y + 1 };
  tl.at(0, () => h.anim('Controlled', true));
  tl.during(0, 24, (t) => {
    h.stretch(1 + 0.25 * t, 1 - easeIn(t));
    if (t >= 1) h.alpha(0);
  });
  tl.every(0, 24, 3, () => h.emit(h.home.x + rand(-12, 12), h.home.y - 2, { count: 3, colors: DIRT, speed: [0.8, 2], angle: -Math.PI / 2, spread: 0.9, gravity: 0.15, size: 3, life: [12, 20] }));
  tl.at(10, () => h.sound('swing'));
  // Burrowing mound travels under the floor
  drawSpan(h, tl, 24, 52, (g, t) => {
    const x = lerp(h.home.x, h.knight.x + 16, easeInOut(t));
    const y = lerp(h.home.y, h.knight.y, easeInOut(t));
    g.ellipse(x, y - 2, 20, 8).fill({ color: DIRT[0] }).stroke({ width: 2, color: INK });
    g.ellipse(x - 3, y - 5, 12, 3.5).fill({ color: DIRT[1] });
    g.rect(x - 8, y - 9, 3, 2).fill({ color: DIRT[3] });
    g.rect(x + 5, y - 7, 2, 2).fill({ color: 0x4D7C0F });
  }, 'ground');
  tl.every(24, 52, 3, () => {
    const t = (tl.frame - 24) / 28;
    const x = lerp(h.home.x, h.knight.x + 16, easeInOut(Math.min(1, t)));
    h.emit(x, h.knight.y - 2, { count: 2, colors: DIRT, speed: [0.6, 1.6], angle: -Math.PI / 2, spread: 0.8, gravity: 0.15, size: 2, life: [10, 16] });
    h.shake(2);
  });
  tl.at(40, () => h.camera(1.2, h.knight.x + 12, h.knight.y - 28, 30));
  // Erupt beneath the knight
  tl.at(52, () => {
    h.offset(under.x, under.y);
    h.stretch(1, 1);
    h.alpha(1);
    h.anim('Appear');
    h.emit(h.knight.x + 16, h.knight.y - 6, { count: 26, colors: [...DIRT, 0x4D7C0F], speed: [1.5, 4.5], angle: -Math.PI / 2, spread: 1.1, gravity: 0.2, size: 3, life: [18, 30] });
    h.shockwave(h.knight.x + 16, h.knight.y, 0x8B5A2B);
  });
  tl.at(58, () => {
    h.sparks(chest(h).x, chest(h).y, 14, [BONE, ...DIRT]);
    h.hitStop(5);
    h.flash(0.35);
    h.shake(13);
    h.sound('crit');
    h.impact(14);
  });
  // Sink again and re-emerge at home
  tl.at(84, () => h.anim('Controlled', true));
  tl.during(84, 100, (t) => h.stretch(1 + 0.25 * t, 1 - easeIn(t)));
  tl.every(84, 100, 4, () => h.emit(h.knight.x + 16, h.knight.y - 2, { count: 2, colors: DIRT, speed: [0.6, 1.6], angle: -Math.PI / 2, spread: 0.8, gravity: 0.15, size: 2, life: [10, 16] }));
  tl.at(100, () => {
    h.alpha(0);
    h.offset(0, 0);
    h.stretch(1, 1);
  });
  tl.at(106, () => {
    h.alpha(1);
    h.anim('Appear');
    dustAtFeet(h, 8, -1);
  });
  tl.end(128);
}

function treeSporeBurst(h: MoveHost, tl: Timeline) {
  tl.at(0, () => h.anim('Stun', true));
  tl.during(0, 30, (t, f) => h.tint(Math.sin(f * 0.35) > 0 ? 0xB8FFF0 : 0xFFFFFF));
  tl.every(10, 34, 2, () => {
    const p = h.pos();
    h.emit(p.x + rand(-14, 10), p.y - h.height * rand(0.6, 0.95), { count: 2, colors: SPORE, speed: [0.3, 0.9], angle: Math.PI + rand(-0.6, 0.2), spread: 0.4, gravity: -0.01, size: 2, life: [30, 50] });
  });
  tl.at(18, () => h.sound('swing'));
  // Homing spore motes drift on a sine path into the knight
  const motes = 8;
  for (let i = 0; i < motes; i++) {
    const start = 18 + i * 3;
    let s = { x: 0, y: 0 };
    let phase = 0;
    tl.at(start, () => {
      const p = h.pos();
      s = { x: p.x + rand(-14, 10), y: p.y - h.height * rand(0.6, 0.95) };
      phase = rand(0, Math.PI * 2);
    });
    drawSpan(h, tl, start, start + 44, (g, t, f) => {
      const e = chest(h);
      const x = lerp(s.x, e.x, easeInOut(t));
      const y = lerp(s.y, e.y, easeInOut(t)) + Math.sin(phase + f * 0.25) * 8 * (1 - t);
      g.circle(x, y, 3.5).fill({ color: SPORE[0], alpha: 0.35 });
      g.circle(x, y, 1.8).fill({ color: SPORE[1] });
      g.rect(x - 0.5, y - 0.5, 1, 1).fill({ color: 0xFFFFFF });
    });
  }
  tl.at(66, () => h.idle());
  tl.at(68, () => {
    const p = chest(h);
    h.shockwave(h.knight.x + 6, h.knight.y - 20, 0x2DD4BF);
    h.emit(p.x, p.y, { count: 22, colors: SPORE, speed: [1, 3], spread: Math.PI, gravity: -0.02, size: 2, life: [20, 36] });
    h.emit(p.x, p.y, { count: 8, colors: [0x0F766E, 0x134E4A], speed: [0.2, 0.6], angle: -Math.PI / 2, spread: 0.6, gravity: -0.03, size: 5, life: [30, 45] });
    h.flash(0.3, 0x2DD4BF);
    h.shake(6);
    h.sound('hit');
    h.impact(5);
  });
  tl.at(30, () => h.tint(0xFFFFFF));
  tl.end(90);
}

function treeBarkSkin(h: MoveHost, tl: Timeline) {
  tl.at(0, () => h.anim('Stun'));
  const shards = 8;
  for (let i = 0; i < shards; i++) {
    const a = (i / shards) * Math.PI * 2;
    drawSpan(h, tl, 4 + i, 28 + i, (g, t) => {
      const p = h.pos();
      const cx = p.x;
      const cy = p.y - h.height * 0.5;
      const r = lerp(46, 14, easeOut(t));
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * 0.8;
      g.poly([x - 3, y - 4, x + 3, y - 3, x + 2, y + 4, x - 3, y + 3]).fill({ color: DIRT[1] }).stroke({ width: 1, color: INK });
    });
  }
  tl.at(30, () => {
    h.tint(0xD6B98C);
    h.sparks(h.pos().x, h.pos().y - h.height * 0.5, 10, [...DIRT, 0x84CC16]);
    h.sound('equip');
    h.impact();
  });
  tl.at(44, () => h.tint(0xFFFFFF));
  tl.end(46);
}

// ---------------------------------------------------------------------------------------------
// DEMON MONK — sorcery: teleports, hellfire, abyssal ritual circles.

function monkTeleportSmoke(h: MoveHost, x: number, y: number) {
  h.emit(x, y - 6, { count: 18, colors: [...SHADOW, INK], speed: [0.5, 1.6], angle: -Math.PI / 2, spread: 1.2, gravity: -0.04, size: 4, life: [18, 30] });
}

function monkCursedPalm(h: MoveHost, tl: Timeline) {
  const c = contact(h, 36);
  tl.at(0, () => {
    monkTeleportSmoke(h, h.home.x, h.home.y);
    h.sound('swing');
  });
  tl.during(0, 12, (t) => {
    h.alpha(1 - t);
    h.stretch(1 - 0.4 * t, 1 + 0.4 * t);
  });
  tl.at(14, () => {
    h.offset(c.x, c.y);
    monkTeleportSmoke(h, h.knight.x + 36, h.knight.y);
    h.anim('attack');
  });
  tl.during(14, 22, (t) => {
    h.alpha(t);
    h.stretch(lerp(0.6, 1, t), lerp(1.4, 1, t));
  });
  // Palm sigil detonates on the knight (attack rig's fx event ≈ 0.467s)
  drawSpan(h, tl, 40, 58, (g, t) => {
    const p = chest(h);
    const r = 6 + 18 * easeOut(t);
    g.alpha = 1 - t;
    g.circle(p.x, p.y, r).stroke({ width: 4, color: INK });
    g.circle(p.x, p.y, r).stroke({ width: 2, color: SHADOW[2] });
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k * Math.PI * 2 * 2) / 5;
      const b = -Math.PI / 2 + ((k + 1) * Math.PI * 2 * 2) / 5;
      g.moveTo(p.x + Math.cos(a) * r * 0.8, p.y + Math.sin(a) * r * 0.8).lineTo(p.x + Math.cos(b) * r * 0.8, p.y + Math.sin(b) * r * 0.8).stroke({ width: 1.5, color: 0xFF3366 });
    }
  });
  tl.at(42, () => {
    const p = chest(h);
    h.shockwave(h.knight.x + 4, h.knight.y - 20, 0x7C3AED);
    h.sparks(p.x, p.y, 14, [...SHADOW, 0xFF3366]);
    h.hitStop(4);
    h.shake(10);
    h.flash(0.35, 0x7C3AED);
    h.camera(1.25, h.knight.x + 16, h.knight.y - 28, 14);
    h.sound('crit');
    h.impact(10);
  });
  tl.at(58, () => monkTeleportSmoke(h, h.pos().x, h.pos().y));
  tl.during(58, 68, (t) => h.alpha(1 - t));
  tl.at(70, () => {
    h.offset(0, 0);
    monkTeleportSmoke(h, h.home.x, h.home.y);
  });
  tl.during(70, 80, (t) => h.alpha(t));
  tl.end(82);
}

function monkHellfireOrb(h: MoveHost, tl: Timeline) {
  const hand = () => ({ x: h.pos().x - 12, y: h.pos().y - h.height - 6 });
  tl.at(0, () => {
    h.anim('cast');
    h.sound('swing');
  });
  drawSpan(h, tl, 0, 26, (g, t, f) => {
    const p = hand();
    orb(g, p.x, p.y, 2 + 8 * easeOut(t) + Math.sin(f * 0.8) * 0.8, FIRE);
  });
  tl.every(0, 26, 2, () => {
    const p = hand();
    const a = rand(0, Math.PI * 2);
    h.emit(p.x + Math.cos(a) * 14, p.y + Math.sin(a) * 14, { count: 1, colors: FIRE, speed: [0.6, 1], angle: a + Math.PI, spread: 0.1, gravity: -0.02, size: 2, life: [12, 16] });
  });
  projectile(h, tl, 26, 20, hand, () => chest(h), 18,
    (g, x, y) => orb(g, x, y, 10, FIRE),
    () => {
      const p = chest(h);
      h.emit(p.x, p.y, { count: 30, colors: FIRE, speed: [1.5, 4.5], spread: Math.PI, gravity: -0.03, size: 4, life: [14, 26] });
      h.shockwave(h.knight.x + 6, h.knight.y - 24, EMBER);
      h.shockwave(h.knight.x + 6, h.knight.y, BLOOD);
      h.flash(0.4, EMBER);
      h.shake(11);
      h.hitStop(4);
      h.camera(1.22, h.knight.x + 12, h.knight.y - 26, 12);
      h.sound('crit');
      h.impact(10);
    },
    (x, y) => h.emit(x + 6, y, { count: 2, colors: FIRE, speed: [0.3, 1], angle: 0, spread: 0.6, gravity: -0.04, size: 3, life: [10, 18] }));
  tl.every(48, 76, 4, () => {
    const p = chest(h);
    h.emit(p.x + rand(-8, 8), p.y - 6, { count: 2, colors: SMOKE, speed: [0.3, 0.7], angle: -Math.PI / 2, spread: 0.4, gravity: -0.03, size: 5, life: [26, 40] });
  });
  tl.end(80);
}

function monkAbyssalEdict(h: MoveHost, tl: Timeline) {
  const kx = () => h.knight.x + 6;
  tl.at(0, () => {
    h.anim('bothcast');
    h.camera(1.2, h.home.x, h.home.y - 34, 24);
    h.sound('level_up');
  });
  tl.during(0, 22, (t) => h.dim(0.7 * easeOut(t), 0x1E0B33));
  tl.at(28, () => h.camera(1.28, h.knight.x + 10, h.knight.y - 40, 52));
  // Ritual circle draws itself under the knight
  drawSpan(h, tl, 10, 96, (g, t, f) => {
    const prog = Math.min(1, f / 30);
    const fade = f > 70 ? 1 - (f - 70) / 16 : 1;
    const charge = f > 30 && f < 40 ? 0.5 + 0.5 * Math.sin(f * 1.5) : 1;
    g.alpha = fade;
    sigil(g, kx(), h.knight.y + 1, 34, prog, f * 0.04, 0xFF3366, charge > 0.7 ? GOLD : EMBER);
  }, 'ground');
  tl.every(30, 50, 2, () => h.emit(kx() + rand(-26, 26), h.knight.y, { count: 1, colors: FIRE, speed: [0.5, 1.2], angle: -Math.PI / 2, spread: 0.2, gravity: -0.02, size: 2, life: [16, 26] }));
  // Pillar of hellfire
  drawSpan(h, tl, 50, 86, (g, t, f) => {
    const x = kx();
    const grow = easeOut(Math.min(1, f / 4));
    const shrink = f > 26 ? 1 - (f - 26) / 10 : 1;
    const w = (18 + Math.sin(f * 1.3) * 2) * shrink;
    const top = h.knight.y - 220 * grow;
    g.rect(x - w - 4, top, (w + 4) * 2, h.knight.y - top).fill({ color: BLOOD, alpha: 0.35 });
    g.rect(x - w, top, w * 2, h.knight.y - top).fill({ color: EMBER, alpha: 0.85 });
    g.rect(x - w * 0.55, top, w * 1.1, h.knight.y - top).fill({ color: GOLD, alpha: 0.95 });
    g.rect(x - w * 0.2, top, w * 0.4, h.knight.y - top).fill({ color: 0xFFFFFF });
    g.ellipse(x, h.knight.y, w + 10, 6).fill({ color: GOLD, alpha: 0.8 });
  });
  tl.every(50, 80, 1, () => h.emit(kx() + rand(-14, 14), h.knight.y - rand(0, 80), { count: 2, colors: FIRE, speed: [1, 3], angle: -Math.PI / 2, spread: 0.5, gravity: -0.05, size: 3, life: [12, 22] }));
  tl.at(52, () => {
    h.hitStop(6);
    h.flash(0.7, 0xFF3366);
    h.shake(16);
    h.sound('crit');
    h.impact(10);
  });
  tl.during(80, 102, (t) => h.dim(0.7 * (1 - t), 0x1E0B33));
  tl.end(104);
}

function monkChainsOfPenance(h: MoveHost, tl: Timeline) {
  tl.at(0, () => h.anim('cast'));
  const anchors = [
    { dx: -32, dy: 2 }, { dx: 36, dy: 3 }, { dx: -22, dy: -6 }, { dx: 28, dy: -7 },
    { dx: -26, dy: -96 }, { dx: 30, dy: -100 },
  ];
  tl.at(20, () => {
    for (const a of anchors) h.emit(h.knight.x + a.dx, h.knight.y + a.dy, { count: 4, colors: [...SHADOW], speed: [0.5, 1.4], angle: -Math.PI / 2, spread: 0.6, gravity: -0.03, size: 3, life: [14, 22] });
    h.sound('swing');
  });
  drawSpan(h, tl, 20, 62, (g, t, f) => {
    const reach = easeOut(Math.min(1, f / 14));
    const tight = f >= 14;
    const glow = tight ? (Math.sin(f * 0.8) > 0 ? 0xFF3366 : SHADOW[2]) : SHADOW[2];
    const target = chest(h);
    for (const a of anchors) {
      const sx = h.knight.x + a.dx;
      const sy = h.knight.y + a.dy;
      const ex = lerp(sx, target.x, reach);
      const ey = lerp(sy, target.y, reach);
      const len = Math.hypot(ex - sx, ey - sy);
      const links = Math.max(1, Math.floor(len / 6));
      for (let i = 0; i < links; i++) {
        const x = lerp(sx, ex, i / links);
        const y = lerp(sy, ey, i / links) + (tight ? 0 : Math.sin(i + f * 0.5) * 1.5);
        g.ellipse(x, y, 3.5, 2.2).stroke({ width: 3.5, color: INK });
        g.ellipse(x, y, 3.5, 2.2).stroke({ width: 1.5, color: i % 2 ? 0x9CA3AF : glow });
      }
    }
  });
  tl.at(34, () => {
    h.knightHit(2);
    h.shake(4);
  });
  tl.at(56, () => {
    h.hitStop(3);
    h.shake(9);
    h.flash(0.3, 0xFF3366);
    h.sound('hit');
    h.impact(4);
  });
  tl.at(62, () => {
    const p = chest(h);
    h.sparks(p.x, p.y, 20, [0x6B7280, 0x9CA3AF, SHADOW[2], 0xFF3366]);
    h.sound('crit');
  });
  tl.end(70);
}

function monkForbiddenWard(h: MoveHost, tl: Timeline) {
  tl.at(0, () => h.anim('selfcast'));
  drawSpan(h, tl, 10, 60, (g, t, f) => {
    const p = h.pos();
    const cx = p.x;
    const cy = p.y - h.height * 0.5;
    const grow = easeOut(Math.min(1, f / 14));
    const fade = f > 34 ? 1 - (f - 34) / 16 : 1;
    const r = 34 * grow;
    const pts: number[] = [];
    for (let k = 0; k < 6; k++) {
      const a = Math.PI / 6 + (k * Math.PI) / 3 + f * 0.01;
      pts.push(cx + Math.cos(a) * r * 0.75, cy + Math.sin(a) * r);
    }
    g.alpha = fade;
    g.poly(pts).fill({ color: SHADOW[1], alpha: 0.18 }).stroke({ width: 4, color: INK, alpha: 0.6 });
    g.poly(pts).stroke({ width: 2, color: SHADOW[2] });
    for (let k = 0; k < 6; k++) g.rect(pts[k * 2] - 1, pts[k * 2 + 1] - 1, 2, 2).fill({ color: 0xFF3366 });
  });
  tl.at(20, () => {
    h.sparks(h.pos().x, h.pos().y - h.height * 0.5, 10, [...SHADOW, 0xFF3366]);
    h.sound('equip');
    h.impact();
  });
  tl.end(62);
}

// ---------------------------------------------------------------------------------------------
// HELLHOUND — the boss: twin heads, fire breath, magma, brimstone from the sky.

function houndFootprints(h: MoveHost, tl: Timeline, from: number, to: number) {
  const prints: { x: number; y: number; born: number }[] = [];
  tl.every(from, to, 3, () => {
    const p = h.pos();
    prints.push({ x: p.x + rand(-6, 10), y: p.y + rand(-1, 2), born: tl.frame });
  });
  drawSpan(h, tl, from, to + 50, (g) => {
    for (const fp of prints) {
      const age = (tl.frame - fp.born) / 50;
      if (age >= 1) continue;
      g.ellipse(fp.x, fp.y, 4, 1.5).fill({ color: EMBER, alpha: 0.9 * (1 - age) });
      g.ellipse(fp.x, fp.y, 2, 0.8).fill({ color: GOLD, alpha: 1 - age });
    }
  }, 'ground');
}

function houndTwinMaul(h: MoveHost, tl: Timeline) {
  const c = contact(h, 44);
  tl.at(0, () => h.anim('Run', true));
  travel(h, tl, 0, 16, { x: 0, y: 0 }, c, easeIn);
  houndFootprints(h, tl, 0, 16);
  tl.every(0, 16, 2, () => h.streaks(h.pos().x + 20, h.pos().y - 18, 40, [EMBER, GOLD]));
  tl.at(16, () => h.anim('Attack'));
  [[40, -10], [52, 4]].forEach(([f, dy], i) => {
    drawSpan(h, tl, f - 6, f + 10, (g, t, ff) => {
      const p = head(h);
      if (ff <= 6) jaws(g, p.x, p.y + 6 + dy, ff / 6, BONE, EMBER);
      else {
        g.alpha = 1 - (ff - 6) / 10;
        jaws(g, p.x, p.y + 6 + dy, 1, BONE, EMBER);
      }
    });
    tl.at(f, () => {
      const p = head(h);
      h.emit(p.x, p.y + 6 + dy, { count: 14, colors: FIRE, speed: [1, 3], spread: Math.PI, gravity: -0.03, size: 3, life: [12, 22] });
      if (i === 0) {
        h.hitStop(4);
        h.shake(8);
        h.knightHit(4);
        h.sound('hit');
      } else {
        h.hitStop(6);
        h.shake(14);
        h.flash(0.5, EMBER);
        h.camera(1.3, h.knight.x + 12, h.knight.y - 30, 14);
        h.sound('crit');
        h.impact(12);
      }
    });
  });
  tl.at(64, () => h.anim('Run', true));
  retreat(h, tl, 64, 90, c);
  tl.at(90, () => h.idle());
  tl.end(92);
}

function houndSavageFrenzy(h: MoveHost, tl: Timeline) {
  const c = contact(h, 42);
  tl.at(0, () => h.anim('Run', true));
  travel(h, tl, 0, 14, { x: 0, y: 0 }, c, easeIn);
  houndFootprints(h, tl, 0, 14);
  [14, 24, 34, 44].forEach((f, i) => {
    tl.at(f, () => h.anim('Raft_Attack'));
    tl.during(f, f + 10, (t) => h.offset(c.x - arc(t) * 8, c.y));
    tl.at(f + 8, () => {
      const p = chest(h);
      const x = p.x + rand(-6, 6);
      const y = p.y + rand(-14, 10);
      h.sparks(x, y, 8, [...FIRE, BONE]);
      if (i < 3) {
        h.knightHit(3);
        h.shake(5);
        h.sound('hit');
      } else {
        h.hitStop(4);
        h.shake(10);
        h.camera(1.22, h.knight.x + 14, h.knight.y - 26, 12);
        h.sound('crit');
        h.impact(8);
      }
    });
    drawSpan(h, tl, f + 4, f + 14, (g, t) => {
      const p = chest(h);
      g.alpha = 1 - easeIn(t);
      jaws(g, p.x + (i % 2 ? 4 : -4), p.y + (i - 1.5) * 6, Math.min(1, t * 3), BONE, EMBER);
    });
  });
  tl.at(58, () => h.anim('Run', true));
  retreat(h, tl, 58, 82, c);
  tl.at(82, () => h.idle());
  tl.end(84);
}

function houndHellfireBreath(h: MoveHost, tl: Timeline) {
  const mouth = () => ({ x: h.pos().x - 34, y: h.pos().y - h.height * 0.5 });
  tl.at(0, () => {
    h.anim('Skill');
    h.camera(1.18, h.home.x - 30, h.home.y - 26, 26);
  });
  // Inhale: embers drawn into the jaws
  tl.every(0, 30, 2, () => {
    const m = mouth();
    const a = rand(-Math.PI, Math.PI);
    h.emit(m.x + Math.cos(a) * 30, m.y + Math.sin(a) * 20, { count: 1, colors: FIRE, speed: [1.4, 1.8], angle: a + Math.PI, spread: 0.05, gravity: 0, size: 2, life: [14, 18] });
  });
  tl.during(0, 30, (t, f) => h.tint(Math.sin(f * 0.6) > 0 ? 0xFFC48A : 0xFFFFFF));
  tl.at(30, () => {
    h.tint(0xFFFFFF);
    h.sound('crit');
    h.camera(1.15, (h.home.x + h.knight.x) / 2, h.knight.y - 30, 36);
  });
  tl.during(30, 44, (t) => h.dim(0.35 * t, 0x2A0A0A));
  // Breath cone
  drawSpan(h, tl, 34, 70, (g, t, f) => {
    const m = mouth();
    const e = chest(h);
    const reach = easeOut(Math.min(1, f / 6));
    const ex = lerp(m.x, e.x - 6, reach);
    const spread = 6 + 16 * reach + Math.sin(f * 1.7) * 2;
    g.poly([m.x, m.y - 3, ex, e.y - spread, ex - 6, e.y + spread * 0.9, m.x, m.y + 3]).fill({ color: BLOOD, alpha: 0.45 });
    g.poly([m.x, m.y - 2, ex, e.y - spread * 0.6, ex - 4, e.y + spread * 0.5, m.x, m.y + 2]).fill({ color: EMBER, alpha: 0.75 });
    g.poly([m.x, m.y - 1, ex, e.y - spread * 0.25, ex - 2, e.y + spread * 0.2, m.x, m.y + 1]).fill({ color: GOLD, alpha: 0.9 });
  });
  tl.every(34, 70, 1, () => {
    const m = mouth();
    const e = chest(h);
    const ang = Math.atan2(e.y - m.y, e.x - m.x);
    h.emit(m.x, m.y, { count: 3, colors: FIRE, speed: [5, 7], angle: ang, spread: 0.18, gravity: -0.06, size: 4, life: [14, 20] });
    h.shake(3);
  });
  [46, 58].forEach((f) => tl.at(f, () => h.knightHit(2)));
  tl.at(66, () => {
    h.flash(0.4, EMBER);
    h.hitStop(3);
    h.shake(9);
    h.impact(6);
  });
  tl.every(68, 100, 3, () => {
    const p = chest(h);
    h.emit(p.x + rand(-10, 10), p.y, { count: 2, colors: SMOKE, speed: [0.3, 0.7], angle: -Math.PI / 2, spread: 0.4, gravity: -0.03, size: 5, life: [26, 40] });
  });
  tl.during(70, 96, (t) => h.dim(0.35 * (1 - t), 0x2A0A0A));
  tl.at(96, () => h.idle());
  tl.end(100);
}

function houndMagmaRampage(h: MoveHost, tl: Timeline) {
  const past = { x: h.knight.x - 70 - h.home.x, y: h.knight.y - h.home.y };
  tl.at(0, () => {
    h.anim('Appear_03');
    h.camera(1.22, h.home.x, h.home.y - 24, 26);
    h.shake(4);
    h.sound('level_up');
  });
  tl.every(0, 28, 3, () => {
    const p = h.pos();
    h.emit(p.x + rand(-20, 20), p.y - rand(0, h.height), { count: 2, colors: FIRE, speed: [0.5, 1.4], angle: -Math.PI / 2, spread: 0.6, gravity: -0.04, size: 2, life: [14, 24] });
  });
  tl.at(30, () => {
    h.anim('Run', true);
    h.sound('swing');
  });
  travel(h, tl, 30, 50, { x: 0, y: 0 }, past, easeIn);
  tl.every(30, 50, 2, () => h.streaks(h.pos().x + 22, h.pos().y - 18, 44, [EMBER, GOLD, BLOOD]));
  // Magma seam left behind the charge
  const seam = [0.15, 0.4, 0.62, 0.85];
  drawSpan(h, tl, 30, 92, (g, t, f) => {
    const drawn = Math.min(1, f / 20);
    const x0 = h.home.x - 10;
    const x1 = lerp(x0, h.home.x + past.x, drawn);
    const fade = f > 48 ? 1 - (f - 48) / 14 : 1;
    for (const [w, color, a] of [[6, INK, 0.7], [3, BLOOD, 0.9], [1.5, GOLD, 1]] as const) {
      g.moveTo(x0, h.home.y).lineTo(x1, lerp(h.home.y, h.knight.y, drawn)).stroke({ width: w, color, alpha: a * fade });
    }
  }, 'ground');
  tl.at(42, () => {
    h.hitStop(4);
    h.knightHit(12);
    h.sparks(chest(h).x, chest(h).y, 12, FIRE);
    h.shake(8);
  });
  // Geysers erupt along the seam
  drawSpan(h, tl, 54, 80, (g, t, f) => {
    for (const [k, s] of seam.entries()) {
      const local = f - k * 2;
      if (local < 0) continue;
      const x = lerp(h.home.x - 10, h.home.x + past.x, s);
      const y = lerp(h.home.y, h.knight.y, s);
      const hgt = (local < 5 ? easeOut(local / 5) : Math.max(0, 1 - (local - 5) / 16)) * (k === 2 || k === 3 ? 70 : 45);
      if (hgt <= 0) continue;
      g.poly([x - 13, y, x - 7, y - hgt, x + 7, y - hgt, x + 13, y]).fill({ color: BLOOD, alpha: 0.6 });
      g.poly([x - 9, y, x - 4, y - hgt * 0.95, x + 4, y - hgt * 0.95, x + 9, y]).fill({ color: EMBER });
      g.rect(x - 2, y - hgt * 0.9, 4, hgt * 0.9).fill({ color: GOLD });
      g.circle(x, y - hgt, 7).fill({ color: EMBER, alpha: 0.8 });
      g.circle(x, y - hgt, 4).fill({ color: GOLD });
    }
  });
  tl.at(54, () => {
    h.anim('Idle', true);
    h.camera(1.2, h.knight.x, h.knight.y - 34, 22);
    for (const s of seam) {
      const x = lerp(h.home.x - 10, h.home.x + past.x, s);
      h.emit(x, h.knight.y - 6, { count: 8, colors: FIRE, speed: [1.5, 4], angle: -Math.PI / 2, spread: 0.4, gravity: 0.12, size: 3, life: [18, 28] });
    }
  });
  tl.at(60, () => {
    h.hitStop(5);
    h.flash(0.6, EMBER);
    h.shake(15);
    h.sound('crit');
    h.impact(10);
  });
  // Wheel around and run home
  tl.at(72, () => {
    h.stretch(-1, 1);
    h.anim('Run', true);
  });
  travel(h, tl, 72, 98, past, { x: 0, y: 0 }, easeInOut);
  tl.at(98, () => {
    h.stretch(1, 1);
    h.idle();
  });
  tl.end(100);
}

function houndBrimstoneRain(h: MoveHost, tl: Timeline) {
  tl.at(0, () => {
    h.anim('Skill');
    h.camera(1.08, 230, 140, 80);
  });
  tl.during(0, 20, (t) => h.dim(0.45 * t, 0x2A0A0A));
  // Fireball launched skyward
  projectile(h, tl, 18, 14, () => ({ x: h.pos().x - 30, y: h.pos().y - h.height * 0.6 }), () => ({ x: h.pos().x - 60, y: -60 }), 0,
    (g, x, y) => orb(g, x, y, 6, FIRE), () => h.sound('swing'),
    (x, y) => h.emit(x, y, { count: 2, colors: FIRE, speed: [0.2, 0.6], angle: Math.PI / 2, spread: 0.5, gravity: 0, size: 3, life: [8, 14] }));
  const falls = [36, 44, 52, 62];
  falls.forEach((f, i) => {
    const last = i === falls.length - 1;
    let tx = 0;
    tl.at(f - 1, () => {
      tx = last ? h.knight.x + 6 : h.knight.x + rand(-40, 46);
    });
    // Warning scorch ring before each strike
    drawSpan(h, tl, f - 8, f + 12, (g, t) => {
      g.ellipse(tx || h.knight.x, h.knight.y + 1, 10 + 6 * t, 3 + 1.5 * t).stroke({ width: 1.5, color: EMBER, alpha: 0.8 * (1 - t) });
    }, 'ground');
    projectile(h, tl, f, 12, () => ({ x: tx + 60, y: -50 }), () => ({ x: tx, y: h.knight.y - 6 }), 0,
      (g, x, y) => {
        g.moveTo(x, y).lineTo(x + 40, y - 60).stroke({ width: 12, color: BLOOD, alpha: 0.45 });
        g.moveTo(x, y).lineTo(x + 30, y - 45).stroke({ width: 6, color: EMBER, alpha: 0.85 });
        g.moveTo(x, y).lineTo(x + 18, y - 27).stroke({ width: 2, color: GOLD });
        g.circle(x, y, 9).fill({ color: EMBER, alpha: 0.4 });
        g.circle(x, y, 7).fill({ color: 0x1C1917 }).stroke({ width: 2.5, color: EMBER });
        g.rect(x - 3, y - 3, 3, 2).fill({ color: GOLD });
      },
      () => {
        h.emit(tx, h.knight.y - 6, { count: 24, colors: [...FIRE, 0x1C1917], speed: [1.5, 4], angle: -Math.PI / 2, spread: 1.2, gravity: 0.18, size: 3, life: [14, 26] });
        h.shockwave(tx, h.knight.y, EMBER);
        if (!last) {
          h.shake(7);
          if (Math.abs(tx - h.knight.x) < 26) h.knightHit(4);
          h.sound('hit');
        } else {
          h.hitStop(5);
          h.shake(13);
          h.flash(0.5, EMBER);
          h.camera(1.25, h.knight.x + 10, h.knight.y - 28, 16);
          h.sound('crit');
          h.impact(10);
        }
      });
    // Scorch crater decal
    drawSpan(h, tl, f + 12, f + 60, (g, t) => {
      g.ellipse(tx, h.knight.y + 1, 14, 4).fill({ color: 0x1C1917, alpha: 0.8 * (1 - t) });
      g.ellipse(tx, h.knight.y + 1, 8, 2).fill({ color: EMBER, alpha: 0.6 * (1 - t) });
    }, 'ground');
  });
  tl.during(80, 104, (t) => h.dim(0.45 * (1 - t), 0x2A0A0A));
  tl.at(100, () => h.idle());
  tl.end(124);
}

// ---------------------------------------------------------------------------------------------

export const MONSTER_MOVES: Record<MonsterMoveId, (h: MoveHost, tl: Timeline) => void> = {
  slime_slap: slimeSlap,
  slime_acid_spit: slimeAcidSpit,
  slime_ooze_slam: slimeOozeSlam,
  slime_engulf: slimeEngulf,

  boar_tusk_slash: boarTuskSlash,
  boar_gore_charge: boarGoreCharge,
  boar_earthsplitter: boarEarthsplitter,
  boar_quill_volley: boarQuillVolley,
  boar_iron_bristles: boarIronBristles,

  wolf_predator_rake: wolfPredatorRake,
  wolf_shadow_pounce: wolfShadowPounce,
  wolf_throat_bite: wolfThroatBite,
  wolf_phantom_pack: wolfPhantomPack,

  tree_branch_whip: treeBranchWhip,
  tree_root_stomp: treeRootStomp,
  tree_burrow_ambush: treeBurrowAmbush,
  tree_spore_burst: treeSporeBurst,
  tree_bark_skin: treeBarkSkin,

  monk_cursed_palm: monkCursedPalm,
  monk_hellfire_orb: monkHellfireOrb,
  monk_abyssal_edict: monkAbyssalEdict,
  monk_chains_of_penance: monkChainsOfPenance,
  monk_forbidden_ward: monkForbiddenWard,

  hound_twin_maul: houndTwinMaul,
  hound_savage_frenzy: houndSavageFrenzy,
  hound_hellfire_breath: houndHellfireBreath,
  hound_magma_rampage: houndMagmaRampage,
  hound_brimstone_rain: houndBrimstoneRain,
};
