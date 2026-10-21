/**
 * Shared toolkit for knight choreography: the move host API (implemented by GameEngine.playKnightMove),
 * timing helpers (travel, backstep, drawSpan, projectile), the contact beat `land()`, VFX beats (slashFx,
 * hitFx, ringFx, crackFx, chargeFx, motesFx, particle bursts) and the card palettes.
 *
 * Used by knightMoves.ts (battle cards) and spellMoves.ts (weapon spells).
 */
import type { Container, Graphics } from 'pixi.js';
import type { Spine } from '@esotericsoftware/spine-pixi-v8';
import { sparkAnim, type VfxName, type VfxOpts } from './vfx';
import type { ExerciseType } from '../../types/game';
import { CARD_CATALOG, type CardRarity, type CardTarget } from '../../types/battle';
import {
  Timeline, type EmitOptions, type SfxName, type SoundOpts,
  lerp, easeIn, easeOut, easeInOut, arc, rand,
  INK, BONE, BLOOD, BLOOD_DARK, EMBER, GOLD, DIRT, SHADOW, FIRE, SMOKE,
} from './choreo';
import {
  pal, type Pal, crescent, starburst, groundRing, bolt, spike, crystal, pillar, runeCircle, orb, wing,
  kettlebell, jaws, lance, scorch, hash,
} from './fxKit';

export interface KnightTarget {
  slot: number; // monster formation slot
  x: number; // feet
  y: number;
  height: number; // approximate sprite height in px
}

/** The card/rep that triggered the move. */
export interface KnightMoveContext {
  power: number; // 0-100
  form: number; // 0-1
  crit: boolean;
  damage: number; // real damage of the primary hit (battle) or a showcase number
  skillName?: string;
  rarity: CardRarity;
  target: CardTarget;
  shatter: boolean;
  stagger: number; // seconds
  color: number; // the card's colour (hit sparks match it)
  block: number; // Block this cast grants (show it with h.guard)
  heal: number;
}

/** Engine services available to a knight move. Implemented in GameEngine.playKnightMove. */
export interface KnightMoveHost {
  /** Knight feet at rest. */
  readonly home: { x: number; y: number };
  /** Monsters this move hits, in hit order. Empty outside battle with no monsters, or for pure-Block cards. */
  readonly targets: readonly KnightTarget[];
  /** targets[0], or a stand-in point where the solo monster would be. */
  readonly target: KnightTarget;
  readonly ctx: KnightMoveContext;
  /** Current feet position, including offset and lift (where the body is drawn). */
  pos(): { x: number; y: number };
  /** 'fx' draws over everything, 'back' behind the knight (wings, auras), 'ground' as floor decals. */
  gfx(layer?: Layer): Graphics;
  container(layer?: Layer): Container;
  /** Plays a Spine VFX rig (vfx.ts) at (x, y) on `opts.layer` (default fx); null while the rigs load. */
  vfx(name: VfxName, x: number, y: number, opts?: Omit<VfxOpts, 'layer'> & { layer?: Layer }): Spine | null;

  /** Plays a knight Spine animation (returns to IDLE after a one-shot). Returns its length in frames. */
  anim(name: string, loop?: boolean): number;
  /** Spine playback speed (1 = normal). Reset when the move ends. */
  animSpeed(scale: number): void;
  idle(): void;
  /** Displaces the knight from home (battlefield px). */
  offset(x: number, y?: number): void;
  /** Raises the rig off the ground (shadow shrinks). */
  lift(height: number): void;
  stretch(sx: number, sy: number): void;
  /** true = face left (e.g. while dashing back home). */
  face(left: boolean): void;
  alpha(a: number): void;
  tint(color: number): void;
  /** Afterimage of the knight's current pose, additive-tinted, fading over `life` frames. */
  ghost(color: number, alpha?: number, life?: number): void;
  /** The equipped weapon (SHOP_ITEMS id). */
  readonly weaponId: string;
  /** Where the weapon's head (bell, flail ball, blade tip) is on this frame, following the rig. */
  weaponTip(): { x: number; y: number };
  /** Hides the weapon in his hand (e.g. while the flail head is thrown). Restored when the move ends. */
  weaponShown(shown: boolean): void;
  /** Hides the rig's own fire trail on ATTACK1/2/4 (plain-steel moves). Restored when the move ends. */
  slashTrail(shown: boolean): void;
  /**
   * Recolours one of the rig's built-in effect slots (KNIGHT_FX_SLOTS: 'Normal_Slash' trail, 'Light' burst,
   * 'PunchFx_Skill3' flurry, 'Dash_Mash' smear); alpha 0 hides it. Restored when the move ends.
   */
  fxSlot(name: string, color: number, alpha?: number): void;
  /** Shoves target `i` by `dx` px and/or launches it `lift` px up; it springs back on its own. */
  knock(i: number, dx: number, lift?: number): void;
  /** Tints target `i`'s rig for a few frames (hit flash). `exact` skips the soft blend toward white (silhouettes). */
  flashTarget(i: number, color?: number, frames?: number, exact?: boolean): void;
  /** Shows this card's Block as a ward in `color` (replaces the generic Block pulse after the move). */
  guard(color: number): void;

  /** `snap` cuts straight to the framing (impact punch-in) instead of easing. */
  camera(zoom: number, x: number, y: number, holdFrames: number, snap?: boolean): void;
  /** Dutch angle: rolls the camera (radians, ±0.12 max, positive = clockwise) for `holdFrames`, then eases it level. */
  roll(radians: number, holdFrames: number, snap?: boolean): void;
  shake(intensity: number): void;
  flash(alpha: number, color?: number): void;
  hitStop(frames: number): void;
  dim(alpha: number, color?: number): void;

  /** Lands hit `i` (flinch + damage label + death), or every remaining hit (staggered a few frames) when omitted. */
  impact(i?: number): void;

  sparks(x: number, y: number, count: number, colors?: number[]): void;
  shockwave(x: number, y: number, color: number): void;
  streaks(x: number, y: number, length: number, colors?: number[]): void;
  emit(x: number, y: number, opts: EmitOptions): void;
  slashArc(g: Graphics, cx: number, cy: number, r: number, a0: number, a1: number, shadow: number, body: number, core: number): void;
  text(content: string, x: number, y: number, color: number, size: number): void;
  /** Plays a bank sound; `o.delay` (s) offsets it, `o.rate` pitches it, `o.vol` scales it. */
  sound(name: SfxName, o?: SoundOpts): void;
}

export type KnightMove = (h: KnightMoveHost, tl: Timeline) => void;
export type Layer = 'fx' | 'ground' | 'back';

// ---------------------------------------------------------------------------------------------
// Shared choreography helpers

export type P = { x: number; y: number };

/** Hit weight by card rarity: hit-stop frames, shake, screen flash. */
export const WEIGHT: Record<CardRarity, { stop: number; shake: number; flash: number }> = {
  common: { stop: 3, shake: 8, flash: 0.22 },
  rare: { stop: 4, shake: 10, flash: 0.3 },
  epic: { stop: 6, shake: 12, flash: 0.38 },
  legendary: { stop: 9, shake: 15, flash: 0.45 },
};

/** Every target the move should play against (falls back to the stand-in target). */
export const each = (h: KnightMoveHost): KnightTarget[] => (h.targets.length ? [...h.targets] : [h.target]);

/** Offset that puts the knight's feet `gap` px in front of a target (on its lane). */
export function strikeSpot(h: KnightMoveHost, t: KnightTarget = h.target, gap = 58): P {
  return { x: t.x - gap - h.home.x, y: t.y - h.home.y };
}

/** Target chest point (where blades and sparks connect). */
export const chest = (t: KnightTarget): P => ({ x: t.x - 4, y: t.y - t.height * 0.55 });
/** Knight body points (follow offset and lift). */
export const kChest = (h: KnightMoveHost): P => ({ x: h.pos().x + 4, y: h.pos().y - 24 });
export const kBlade = (h: KnightMoveHost): P => ({ x: h.pos().x + 26, y: h.pos().y - 22 });
export const kRaised = (h: KnightMoveHost): P => ({ x: h.pos().x + 2, y: h.pos().y - 60 });
export const shoulders = (h: KnightMoveHost): P => ({ x: h.pos().x - 4, y: h.pos().y - 36 });

/**
 * The contact beat: lands hit `i` (or all) and sells it with rarity-scaled hit-stop, shake, flash and a
 * hit-flash on the target. `scale` boosts or softens it (finishers > jabs).
 */
export type Burst = 'explosion' | 'crater' | 'quake' | 'fire' | 'ice' | 'poison' | 'portal' | 'slash';

/** Themed Spine burst on a target as a hit lands: at its feet (crater/quake) or body (the rest). */
export function burst(h: KnightMoveHost, t: KnightTarget, kind: Burst, size: number) {
  const body = { x: t.x - 4, y: t.y - t.height * 0.5 };
  if (kind === 'crater' || kind === 'quake') h.vfx('shockwave', t.x, t.y - 10 * size, { size, anim: kind === 'quake' ? 'ShockWave_2' : 'ShockWave_1' });
  else if (kind === 'explosion') h.vfx('explosion', body.x, body.y, { size });
  else if (kind === 'fire') h.vfx('fire', body.x, body.y, { size, life: 30, loop: true });
  else if (kind === 'ice') h.vfx('ice', body.x, body.y, { size, start: 66 });
  else if (kind === 'poison') h.vfx('poison', body.x, body.y, { size });
  else if (kind === 'portal') h.vfx('summon', body.x, body.y, { anim: 'animation2', size });
  else h.vfx('slash', body.x, body.y, { size, life: 14 });
}

/** `glare` scales the screen flash alone (dark, light-driven scenes keep the hit weight without washing out). */
export function land(h: KnightMoveHost, i: number | undefined, o: { scale?: number; tint?: number; flash?: number; glare?: number; sfx?: SfxName; spark?: number | false; burst?: Burst; burstSize?: number } = {}) {
  const w = WEIGHT[h.ctx.rarity];
  const s = o.scale ?? 1;
  h.impact(i);
  if (o.spark !== false) {
    // Spine hit spark on each target body, in the card's colour; epic+ and crits get the big variant
    const heavy = h.ctx.crit || h.ctx.rarity === 'epic' || h.ctx.rarity === 'legendary';
    for (const k of i === undefined ? h.targets.map((_, n) => n) : [i]) {
      const t = h.targets[k];
      if (t) h.vfx('hitSpark', t.x - 4, t.y - t.height * 0.5, { anim: sparkAnim(o.spark ?? h.ctx.color, heavy), size: (heavy ? 1 : 0.8) * Math.min(1.3, s) });
    }
  }
  if (o.burst) {
    for (const k of i === undefined ? h.targets.map((_, n) => n) : [i]) {
      const t = h.targets[k];
      if (t) burst(h, t, o.burst, o.burstSize ?? 1);
    }
  }
  h.hitStop(Math.round(w.stop * s) + (h.ctx.crit ? 2 : 0));
  h.shake(w.shake * s);
  h.flash(w.flash * s * (o.glare ?? 1), o.flash);
  const idx = i === undefined ? h.targets.map((_, k) => k) : [i];
  for (const k of idx) h.flashTarget(k, o.tint ?? 0xFF6A6A, 7);
  impactSound(h, s, o.sfx);
}

/** Impact weight by rarity: a punch for commons, a heavy crunch for rare/epic, the ringing finisher for legendaries and crits. */
export function impactSound(h: KnightMoveHost, scale = 1, sfx?: SfxName) {
  const { rarity, crit } = h.ctx;
  const base: SfxName = crit || rarity === 'legendary' || scale >= 1.4 ? 'impact_crit'
    : rarity === 'common' && scale < 1.15 ? 'impact' : 'impact_heavy';
  const vol = Math.min(1.15, 0.75 + 0.25 * scale);
  if (sfx && !/^(impact|crit|hit)/.test(sfx)) {
    // A themed contact sound (chomp, zap…) rides on top of a softer body thump
    h.sound(sfx);
    h.sound(base === 'impact_crit' ? 'impact_heavy' : base, { vol: vol * 0.6 });
  } else h.sound(sfx ?? base, { vol });
  // Weapon material: iron heads clang as they connect
  if (!/sword/.test(h.weaponId) && scale >= 0.8) h.sound('impact_metal', { vol: 0.35 + 0.15 * scale });
}

/** The weapon's swing: blades hiss, heavy iron heads (bells, maces, flails) push air. `big` for wind-ups and finishers. */
export function swingSound(h: KnightMoveHost, big = false, o: SoundOpts = {}) {
  const sword = /sword/.test(h.weaponId);
  h.sound(sword ? (big ? 'whoosh_heavy' : 'whoosh_fast') : big ? 'whoosh_heavy' : 'whoosh', o);
}

/**
 * Resolves a point once, on first use. Timeline runs `during` spans before `at` events on the same
 * frame, so anything a span needs on its first frame must be resolved inside the span.
 */
export function once(where: P | (() => P)): () => P {
  let v: P | null = null;
  return () => (v ??= typeof where === 'function' ? where() : where);
}

/** Moves the knight between two offsets over [from, to], optionally hopping. */
export function travel(
  h: KnightMoveHost, tl: Timeline, from: number, to: number,
  a: P | (() => P), b: P | (() => P),
  ease: (t: number) => number = easeInOut, hop = 0,
) {
  const start = once(a);
  const end = once(b);
  tl.during(from, to, (t) => {
    const pa = start();
    const pb = end();
    const e = ease(t);
    h.offset(lerp(pa.x, pb.x, e), lerp(pa.y, pb.y, e));
    if (hop) h.lift(arc(t) * hop);
  });
  if (hop) tl.at(to, () => h.lift(0));
}

/** Current offset from home (read when a travel starts). */
export const here = (h: KnightMoveHost) => (): P => ({ x: h.pos().x - h.home.x, y: 0 });
export const HOME: P = { x: 0, y: 0 };

/** Hops back home over [from, to] facing the enemy (a backstep). */
export function backstep(h: KnightMoveHost, tl: Timeline, from: number, to: number, hop = 18) {
  tl.at(from, () => {
    h.anim('JUMP_BACK_START');
    h.sound('jump', { vol: 0.6 });
  });
  tl.at(to, () => h.sound('thud', { vol: 0.45 }));
  tl.at(Math.max(from + 1, to - 6), () => h.anim('JUMP_BACK_END'));
  travel(h, tl, from, to, here(h), HOME, easeInOut, hop);
}

/** Afterimages every `step` frames over [from, to). */
export function ghostTrail(h: KnightMoveHost, tl: Timeline, from: number, to: number, color: number, step = 2, alpha = 0.45) {
  tl.every(from, to, step, () => h.ghost(color, alpha));
}

/** A Graphics that redraws every frame over [from, to] and is cleared afterwards. */
export function drawSpan(h: KnightMoveHost, tl: Timeline, from: number, to: number, draw: (g: Graphics, t: number, f: number) => void, layer: Layer = 'fx') {
  let g: Graphics | null = null;
  tl.during(from, to, (t, f) => {
    g ??= h.gfx(layer);
    g.clear();
    if (t < 1) draw(g, t, f);
  });
}

/** Animated slash: the leading edge sweeps a0→a1 in 3 frames, then the tail chases it and it thins out. */
export function slashFx(h: KnightMoveHost, tl: Timeline, at: number, o: { x: number; y: number; r: number; a0: number; a1: number; thick: number; p: Pal; dur?: number; sound?: boolean }) {
  const dur = o.dur ?? 9;
  if (o.sound !== false) tl.at(at, () => h.sound(o.thick >= 10 || o.r >= 40 ? 'slash_heavy' : 'slash', { vol: 0.8 }));
  drawSpan(h, tl, at, at + dur, (g, _t, f) => {
    const sweep = Math.min(1, f / 3);
    const tail = f < 3 ? 0 : Math.min(1, (f - 3) / (dur - 3));
    const lead = lerp(o.a0, o.a1, easeOut(sweep));
    const back = lerp(o.a0, o.a1, easeIn(tail) * 0.92);
    crescent(g, o.x, o.y, o.r, back, lead, o.thick * (1 - tail * 0.6), o.p, 1 - tail * 0.4);
  });
}

/** Impact star: pops big, spins and collapses over 9 frames, with a shock circle and sparks. */
export function hitFx(h: KnightMoveHost, tl: Timeline, at: number, where: P | (() => P), p: Pal, size = 16, colors?: number[]) {
  const rot = rand(0, Math.PI);
  const pt = once(where);
  tl.at(at, () => h.sparks(pt().x, pt().y, Math.round(size * 0.8), colors ?? [p.body, p.core, 0xFFFFFF]));
  drawSpan(h, tl, at, at + 9, (g, t) => {
    const c = pt();
    const r = size * (t < 0.2 ? lerp(0.7, 1.25, t / 0.2) : lerp(1.25, 0.15, (t - 0.2) / 0.8));
    starburst(g, c.x, c.y, r, 8, rot + t * 0.5, p, 1 - t * 0.5);
    g.circle(c.x, c.y, size * (0.5 + t * 1.8)).stroke({ width: 2.5 * (1 - t) + 0.5, color: p.core, alpha: 1 - t });
  });
}

/** Ground shockwave ring expanding from (x,y). */
export function ringFx(h: KnightMoveHost, tl: Timeline, at: number, where: P | (() => P), r0: number, r1: number, color: number, dur = 14, width = 3) {
  const pt = once(where);
  drawSpan(h, tl, at, at + dur, (g, t) => groundRing(g, pt().x, pt().y, lerp(r0, r1, easeOut(t)), width * (1 - t) + 1, color, 1 - t), 'ground');
}

/** Glowing crack racing along the floor from a to b, then cooling. */
export function crackFx(h: KnightMoveHost, tl: Timeline, at: number, a: P, b: P, p: Pal, grow = 10, dur = 46) {
  tl.at(at, () => h.sound('crack', { vol: 0.8 }));
  const pts: number[] = [];
  const n = Math.max(4, Math.round(Math.abs(b.x - a.x) / 12));
  for (let i = 0; i <= n; i++) pts.push(lerp(a.x, b.x, i / n), lerp(a.y, b.y, i / n) + (i % 2 ? -2 : 2) * rand(0.4, 1.6));
  drawSpan(h, tl, at, at + dur, (g, _t, f) => {
    const k = Math.floor(n * Math.min(1, f / grow));
    const fade = f > dur * 0.55 ? 1 - (f - dur * 0.55) / (dur * 0.45) : 1;
    for (const [w, color, al] of [[4, p.ink, 0.9], [2, p.body, 0.95], [1, p.core, 1]] as const) {
      g.moveTo(pts[0], pts[1]);
      for (let i = 1; i <= k; i++) g.lineTo(pts[i * 2], pts[i * 2 + 1]);
      g.stroke({ width: w, color, alpha: al * fade });
    }
  }, 'ground');
}

/** Motes spiralling inward to a point (charge-up). */
export function chargeFx(h: KnightMoveHost, tl: Timeline, from: number, to: number, at: () => P, p: Pal, radius = 40, n = 12) {
  if (to - from >= 16) tl.at(from, () => chargeSound(h, to - from));
  drawSpan(h, tl, from, to, (g, t, f) => {
    const c = at();
    for (let k = 0; k < n; k++) {
      const phase = (f / 18 + k / n) % 1;
      const r = radius * (1 - phase);
      const a = (k / n) * Math.PI * 2 + f * 0.12;
      const s = phase > 0.8 ? 3 : 2;
      g.rect(c.x + Math.cos(a) * r - s / 2, c.y + Math.sin(a) * r * 0.8 - s / 2, s, s).fill({ color: k % 3 ? p.body : p.core, alpha: 0.4 + 0.6 * phase });
    }
    orb(g, c.x, c.y, 2 + 3 * t + Math.sin(f * 0.8), p, 0.8);
  });
}

/** Charge-up riser sized to a wind-up of `frames` (60 fps). */
export const chargeSound = (h: KnightMoveHost, frames: number, vol = 0.85) =>
  h.sound(frames > 70 ? 'charge_long' : 'charge', { vol, rate: Math.min(1.6, Math.max(0.85, (frames > 70 ? 102 : 54) / frames)) });

/** Rising healing / magic motes around a point. */
export function motesFx(h: KnightMoveHost, tl: Timeline, from: number, to: number, at: () => P, colors: number[], step = 3, spread = 18) {
  tl.every(from, to, step, () => {
    const c = at();
    h.emit(c.x + rand(-spread, spread), c.y + rand(-4, 8), { count: 2, colors, speed: [0.3, 0.9], angle: -Math.PI / 2, spread: 0.35, gravity: -0.015, size: 2, life: [20, 32] });
  });
}

export const debris = (h: KnightMoveHost, c: P, n: number, colors: number[] = DIRT, power = 1) =>
  h.emit(c.x, c.y, { count: n, colors, speed: [1.5 * power, 4 * power], angle: -Math.PI / 2, spread: 0.9, gravity: 0.2, size: 3, life: [16, 30] });
export const dust = (h: KnightMoveHost, c: P, n = 6, dir = -1) =>
  h.emit(c.x, c.y - 2, { count: n, colors: [0x78716C, 0xA8A29E, 0x57534E], speed: [0.6, 1.8], angle: dir > 0 ? -0.3 : Math.PI + 0.3, spread: 0.6, gravity: -0.03, size: 3, life: [14, 24] });
export const smoke = (h: KnightMoveHost, c: P, n: number, colors: number[] = SMOKE) =>
  h.emit(c.x, c.y, { count: n, colors, speed: [0.3, 1.4], angle: -Math.PI / 2, spread: Math.PI, gravity: -0.03, size: 4, life: [18, 30] });
export const shards = (h: KnightMoveHost, c: P, n = 14) =>
  h.emit(c.x, c.y, { count: n, colors: [0xE0F2FE, 0xFFFFFF, 0x93C5FD, 0x60A5FA], speed: [2, 4.5], angle: -Math.PI / 2, spread: Math.PI, gravity: 0.18, size: 3, life: [14, 26] });
export const embers = (h: KnightMoveHost, c: P, n: number, colors: number[] = FIRE) =>
  h.emit(c.x, c.y, { count: n, colors, speed: [0.6, 2.4], angle: -Math.PI / 2, spread: 1.2, gravity: -0.04, size: 2, life: [18, 34] });

/** Projectile along an arc; `draw` renders the body at its current position. */
export function projectile(
  h: KnightMoveHost, tl: Timeline, from: number, dur: number,
  start: () => P, end: () => P, height: number,
  draw: (g: Graphics, x: number, y: number, t: number, f: number) => void, onHit: () => void,
  trail?: (x: number, y: number) => void,
) {
  const s0 = once(start);
  const e0 = once(end);
  drawSpan(h, tl, from, from + dur, (g, t, f) => {
    const s = s0();
    const e = e0();
    const x = lerp(s.x, e.x, t);
    const y = lerp(s.y, e.y, t) - arc(t) * height;
    draw(g, x, y, t, f);
    trail?.(x, y);
  });
  tl.at(from + dur, onHit);
}

/** Card palettes (ink / saturated body / hot core), matched to each card's colour. */
export const P_GOLD = pal(0xF59E0B, BONE, 0x3B1D06);
export const P_FIRE = pal(BLOOD, GOLD, BLOOD_DARK);
export const P_EMBER = pal(EMBER, 0xFEF3C7, 0x431407);
export const P_WATER = pal(0x38B6FF, 0xE0F7FF, 0x0C2A4A);
export const P_BOLT = pal(0x7DD3FC, 0xFFFFFF, 0x0B1E3F);
export const P_HOLY = pal(0xFBBF24, 0xFFFBEB, 0x422006);
export const P_ARCANE = pal(0x60A5FA, 0xEFF6FF, 0x172554);
export const P_RAGE = pal(0xFF3366, 0xFFE4EC, 0x4A0418);
export const P_VOID = pal(0xA855F7, 0xF3E8FF, 0x1E0B33);
export const P_JADE = pal(0x00EB88, 0xE8FFF5, 0x053B26);
export const P_EMERALD = pal(0x10B981, 0xD1FAE5, 0x022C22);
export const P_LIME = pal(0x84CC16, 0xF7FEE7, 0x1A2E05);
export const P_AMBER = pal(0xD97706, 0xFEF3C7, 0x2A1503);
export const P_SUN = pal(0xF59E0B, 0xFFFBEB, 0x451A03);
export const P_SHADOW = pal(0x65A30D, 0xD9F99D, 0x0B0712);
export const P_INDIGO = pal(0x818CF8, 0xEEF2FF, 0x1E1B4B);
export const P_VIOLET = pal(0xC084FC, 0xFAF5FF, 0x2E1065);
export const P_PINK = pal(0xEC4899, 0xFFF1F7, 0x500724);
export const P_CRANE = pal(0xDB2777, 0xFFFFFF, 0x3F0A23);
export const P_COPPER = pal(0xFB923C, 0xFFF7ED, 0x431407);
export const P_BELL = pal(0xFACC15, 0xFFFBEB, 0x422006);
export const P_CYAN = pal(0x22D3EE, 0xECFEFF, 0x083344);
export const P_STEEL = pal(0x94A3B8, 0xF8FAFC, 0x0F172A);
export const P_FORGE = pal(0xF97316, 0xFFEDD5, 0x2A0E02);
export const P_STORM = pal(0xEA580C, 0xFDE68A, 0x1C0A02);
