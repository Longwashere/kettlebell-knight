/**
 * Monster Arts: knight techniques learned from the bestiary (CARD_CATALOG `art_*`), one choreography each.
 *
 * Every art borrows a monster's signature: the bat's shriek, the ghost's possession, the crab's claw, the
 * skeleton knight's phantom charge. They're staged like short films: a close-up on the wind-up, a
 * reframe that reveals what's coming (pull wide, or tilt up at the thing in the sky), a hard `snap` cut
 * on contact, and a held beat after the big hit. Summoned creatures (stag, bear, horse, wisp, wave) are
 * Graphics drawn per frame so they cost no textures; Spine VFX (vfx.ts) layer on top where they fit.
 *
 * Review with `npm run shot -- "encounter:wolf,boar" idle kfilm:<templateId>:24:3:<slots>`.
 * Keep high things framed near zoom 1: the camera can't pan above the sky.
 */
import { Sprite, type Container, type Graphics, type Texture } from 'pixi.js';
import { buildSteed, destroySteed, STEED_W, STEED_H, STEED_GROUND, STEED_CX, STEED_TIP } from './phantomSteed';
import { Timeline, lerp, easeIn, easeOut, easeInOut, arc, rand, INK, BONE, DIRT } from './choreo';
import { pal, crescent, starburst, spike, orb, pillar, kettlebell } from './fxKit';
import { dart, flier, clawRake } from './monsterKit';
import { tombstone } from './spellMoves';
import { crown, between, crouch, release, dizzy } from './starterMoves';
import * as K from './knightKit';
import type { KnightMove, KnightMoveHost } from './knightKit';

const {
  each, strikeSpot, chest, kChest, land, travel, here, HOME, backstep, ghostTrail,
  swingSound, drawSpan, slashFx, hitFx, ringFx, crackFx, chargeFx, motesFx, debris, dust, smoke, projectile,
} = K;
type P = K.P;

// ---------------------------------------------------------------------------------------------
// Palettes

const P_DIRT = pal(0xA16207, 0xFDE68A, 0x291A06);
const P_BONE = pal(0xE2E8F0, 0xFFFFFF, 0x1E293B);
const P_WISP = pal(0x67E8F9, 0xFFFFFF, 0x083344);
const P_BANSHEE = pal(0x7DD3FC, 0xF0F9FF, 0x0C1A2B);
const P_STONE = pal(0x78716C, 0xE7E5E4, 0x1C1917);
const P_TROLL = pal(0x65A30D, 0xECFCCB, 0x1A2E05);
const P_CRAB = pal(0xEA580C, 0xFFEDD5, 0x431407);
const P_RAGE = pal(0xDC2626, 0xFEE2E2, 0x450A0A);
const P_MOON = pal(0xC7D2FE, 0xFFFFFF, 0x1E1B4B);
const P_GRANITE = pal(0xA8A29E, 0xFAFAF9, 0x292524);
const P_SHADE = pal(0x7C3AED, 0xEDE9FE, 0x0B0218);
const P_BLOOD = pal(0xBE123C, 0xFFE4E6, 0x3F0412);
const P_BEAR = pal(0x92400E, 0xFDE68A, 0x1C0A02);
const P_PHANTOM = pal(0x93C5FD, 0xEFF6FF, 0x0B1E3F);

const STONE = [0x57534E, 0x78716C, 0xA8A29E, 0x44403C];

// ---------------------------------------------------------------------------------------------
// Shared beats

/** A point fixed the first time it's read. */
const fix = (fn: () => P) => K.once(fn);

/** Mixes two 0xRRGGBB colours. */
function mix(a: number, b: number, t: number): number {
  const ch = (s: number) => Math.round(lerp((a >> s) & 255, (b >> s) & 255, t));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** Fades the knight's alpha over [from, to]. */
const fade = (h: KnightMoveHost, tl: Timeline, from: number, to: number, a0: number, a1: number) =>
  tl.during(from, to, (t) => h.alpha(lerp(a0, a1, t)));

/** Ramps the knight's tint between two colours over [from, to]. */
const tintRamp = (h: KnightMoveHost, tl: Timeline, from: number, to: number, c0: number, c1: number) =>
  tl.during(from, to, (t) => h.tint(mix(c0, c1, t)));

/** Ramps the screen dim to `peak` over [from, from+ramp], holds, and lifts it over the last `ramp` frames to `to`. */
function dimSpan(h: KnightMoveHost, tl: Timeline, from: number, to: number, peak: number, color: number, ramp = 8) {
  tl.during(from, to, (t, f) => {
    const len = to - from;
    const k = f < ramp ? f / ramp : f > len - ramp ? Math.max(0, (len - f) / ramp) : 1;
    h.dim(peak * k, color);
  });
  tl.at(to, () => h.dim(0));
}

/** Re-aims the camera at a moving subject every `step` frames. */
function follow(h: KnightMoveHost, tl: Timeline, from: number, to: number, zoom: number, at: () => P, step = 4) {
  tl.every(from, to, step, () => {
    const p = at();
    h.camera(zoom, p.x, p.y, step + 6);
  });
}

/** Sound rings fanning out to the right from (x, y). */
function rightRings(g: Graphics, x: number, y: number, r: number, color: number, alpha: number) {
  arcAt(g, x, y, r, -0.55, 0.55).stroke({ width: 5, color: INK, alpha: 0.45 * alpha });
  arcAt(g, x, y, r, -0.55, 0.55).stroke({ width: 2.5, color, alpha });
  arcAt(g, x, y, r - 3, -0.4, 0.4).stroke({ width: 1, color: 0xFFFFFF, alpha: 0.7 * alpha });
}

/** An open arc that starts its own path (Graphics.arc otherwise joins it to the last pen position). */
function arcAt(g: Graphics, x: number, y: number, r: number, a0: number, a1: number): Graphics {
  return g.moveTo(x + Math.cos(a0) * r, y + Math.sin(a0) * r).arc(x, y, r, a0, a1);
}

/** Puff of smoke the knight vanishes into / steps out of. */
const poof = (h: KnightMoveHost, at: P, colors: number[], n = 14) => {
  h.emit(at.x, at.y - 22, { count: n, colors, speed: [0.6, 2], angle: -Math.PI / 2, spread: Math.PI, gravity: -0.03, size: 4, life: [14, 26] });
};

/** Rotates (px, py) about (cx, cy). */
const rot = (px: number, py: number, cx: number, cy: number, a: number): [number, number] => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [cx + (px - cx) * c - (py - cy) * s, cy + (px - cx) * s + (py - cy) * c];
};

// =============================================================================================
// COMMON

/** Echo Shriek: hinge low, crack the bell against the shield; a shriek of sound and bats tears across the field. */
function echoShriek(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const far = Math.max(...foes.map((t) => t.x)) + 40;
  const CLANG = 14;
  const SPEED = 9; // px / frame for the sound front
  const src = fix(() => ({ x: kChest(h).x + 8, y: kChest(h).y - 4 }));
  tl.at(0, () => {
    h.anim('SKILL1');
    h.camera(1.38, h.home.x + 12, h.home.y - 24, CLANG);
    h.sound('equip', { vol: 0.4, rate: 0.7 });
  });
  crouch(h, tl, 0, CLANG - 2, 0.14);
  tl.at(CLANG - 2, () => h.anim('DEFENSE'));
  release(h, tl, CLANG);
  tl.at(CLANG, () => {
    h.sound('impact_metal', { vol: 1, rate: 1.7 });
    h.sound('screech', { vol: 0.9 });
    h.sparks(src().x, src().y, 14, [0xFFFFFF, 0xF5F3FF, 0xA78BFA]);
    h.flash(0.25, 0xEDE9FE);
    h.shake(5);
    h.camera(1, (h.home.x + far) / 2, h.home.y - 40, 40, true); // smash cut wide: the shriek crosses everything
  });
  // The shriek: four wavefronts racing right, each a bit behind the last
  drawSpan(h, tl, CLANG, CLANG + 40, (g, _t, f) => {
    const s = src();
    for (let k = 0; k < 4; k++) {
      const r = (f - k * 4) * SPEED;
      if (r < 6 || s.x + r > far + 30) continue;
      rightRings(g, s.x, s.y, r, k % 2 ? 0xF5F3FF : 0xA78BFA, Math.max(0, 1 - r / (far - s.x + 60)));
    }
  });
  tl.every(CLANG, CLANG + 24, 2, () => h.shake(2));
  // A colony of bats bursts out of the sound
  const bats = Array.from({ length: 9 }, (_, i) => ({ dy: rand(-46, 18), speed: rand(5, 8), wob: rand(0, 6), delay: i * 2, s: rand(4, 6) }));
  drawSpan(h, tl, CLANG + 2, CLANG + 44, (g, _t, f) => {
    const s = src();
    for (const b of bats) {
      const k = f - b.delay;
      if (k < 0) continue;
      const x = s.x + k * b.speed;
      const y = s.y + b.dy * Math.min(1, k / 12) + Math.sin(k * 0.5 + b.wob) * 3;
      if (x < 440) flier(g, x, y, b.s, k * 0.9, 0x1E1B4B, 0xF87171, 1);
    }
  });
  tl.at(CLANG + 4, () => h.sound('flap', { vol: 0.7 }));
  tl.at(CLANG + 10, () => h.sound('swarm', { vol: 0.4, rate: 1.4 }));
  foes.forEach((t, i) => {
    const at = CLANG + Math.max(2, Math.round((t.x - src().x) / SPEED));
    tl.at(at, () => {
      land(h, i, { scale: 0.75, tint: 0xC4B5FD, flash: 0xEDE9FE });
      h.knock(i, 8, 2);
    });
    dizzy(h, tl, at + 2, t, 30);
  });
  tl.at(CLANG + 30, () => h.camera(1.1, h.home.x + 60, h.home.y - 30, 12));
  tl.end(CLANG + 46);
}

/** Dirty Trick: a feint skyward, the foe looks up, a boot-full of dirt in its eyes, then a bonk on the head. */
function dirtyTrick(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const top = crown(t0);
  const spot = strikeSpot(h, t0, 50);
  const FEINT = 10;
  const KICK = 30;
  const BONK = 46;
  tl.at(0, () => {
    h.anim('RUN', true);
    h.sound('step', { vol: 0.5, rate: 1.4 });
    h.camera(1.16, between(h, t0, 0.5).x, c.y, 10);
  });
  travel(h, tl, 0, FEINT, HOME, spot, easeInOut);
  tl.at(FEINT, () => {
    h.anim('SKILL2TULUC'); // bell raised to the sky
    h.sound('whistle', { vol: 0.6 });
    h.camera(1.22, between(h, t0, 0.7).x, top.y - 16, 16); // tilt up with the feint
  });
  tl.at(FEINT + 11, () => h.animSpeed(0));
  // The foe looks up: a "?" pops over its head
  drawSpan(h, tl, FEINT + 6, KICK, (g, t) => {
    const a = Math.min(1, t * 4);
    const x = top.x + 4;
    const y = top.y - 12 - 4 * easeOut(Math.min(1, t * 3));
    g.circle(x, y, 7).fill({ color: 0xFFFBEA, alpha: a }).stroke({ width: 1.5, color: INK, alpha: a });
    arcAt(g, x, y - 1, 2.5, Math.PI, Math.PI * 2.4).stroke({ width: 1.5, color: INK, alpha: a });
    g.rect(x - 0.5, y + 3, 1.5, 1.5).fill({ color: INK, alpha: a });
  });
  tl.at(FEINT + 8, () => h.sound('ui_move', { vol: 0.5, rate: 1.6 }));
  tl.at(KICK - 4, () => {
    h.animSpeed(1);
    h.anim('ATTACK5');
    h.camera(1.36, c.x - 20, c.y - 6, 12, true);
  });
  // The kick: a spray of dirt straight into its face
  tl.at(KICK, () => {
    const foot = { x: h.pos().x + 16, y: h.pos().y - 6 };
    h.emit(foot.x, foot.y, { count: 26, colors: [0x8B5A2B, 0xA16207, 0x5C2B14, 0xD6D3D1], speed: [3, 6], angle: -0.38, spread: 0.3, gravity: 0.08, size: 3, life: [12, 20] });
    h.sound('rock', { vol: 0.6, rate: 1.5 });
    h.sound('hurt', { vol: 0.3, rate: 1.6 });
    h.flashTarget(0, 0xFDE68A, 6);
    h.knock(0, 3);
  });
  // Scribbled "blinded" eyes
  drawSpan(h, tl, KICK + 4, BONK + 4, (g) => {
    const x = top.x + 6;
    const y = top.y + 6;
    for (const ox of [-4, 4]) {
      g.moveTo(x + ox - 2, y - 2).lineTo(x + ox + 2, y + 2).moveTo(x + ox + 2, y - 2).lineTo(x + ox - 2, y + 2).stroke({ width: 1.5, color: INK });
    }
  });
  tl.at(BONK - 6, () => {
    h.anim('SKILL1');
    swingSound(h, false);
  });
  hitFx(h, tl, BONK, top, P_DIRT, 14, [0xFFFBEA, 0xFDE68A, 0xA16207]);
  tl.at(BONK, () => {
    land(h, 0, { tint: 0xFDE68A, sfx: 'thud' });
    h.sound('ui_select', { vol: 0.6, rate: 0.7 }); // comic bonk
    h.knock(0, 4);
    h.camera(1.48, top.x - 8, top.y + 6, 14, true);
  });
  dizzy(h, tl, BONK + 2, t0, 60);
  // A cheeky backflip home
  tl.at(BONK + 10, () => {
    h.anim('JUMP_BACK_START');
    h.sound('jump', { vol: 0.6, rate: 1.2 });
  });
  travel(h, tl, BONK + 10, BONK + 28, here(h), HOME, easeInOut);
  tl.during(BONK + 10, BONK + 28, (t) => h.lift(arc(t) * 30));
  tl.at(BONK + 22, () => h.anim('JUMP_BACK_END'));
  tl.at(BONK + 28, () => {
    h.lift(0);
    h.sound('thud', { vol: 0.5 });
  });
  tl.end(BONK + 32);
}

/** Rattle Back: he falls apart into a heap of armour like a struck skeleton, then clatters back together, tougher. */
function rattleBack(h: KnightMoveHost, tl: Timeline) {
  const FALL = 6;
  const REFORM = 34;
  const WHOLE = 52;
  const base = fix(() => ({ ...h.pos() }));
  // Armour pieces: rest offset on the body, scatter spot on the floor, spin
  const pieces = [
    { kind: 'helm', bx: 2, by: -54, fx: -22, spin: 4 },
    { kind: 'shield', bx: 14, by: -30, fx: 26, spin: -3 },
    { kind: 'bell', bx: -10, by: -24, fx: 38, spin: 6 },
    { kind: 'plate', bx: 0, by: -36, fx: -8, spin: 5 },
    { kind: 'plate', bx: -4, by: -14, fx: 12, spin: -6 },
    { kind: 'bone', bx: -8, by: -6, fx: -34, spin: 7 },
    { kind: 'bone', bx: 8, by: -6, fx: 2, spin: -7 },
  ];
  const piece = (g: Graphics, kind: string, x: number, y: number, r: number) => {
    if (kind === 'helm') {
      g.circle(x, y, 7).fill({ color: 0xD97706 }).stroke({ width: 1.5, color: INK });
      g.rect(x - 5, y - 1, 10, 2).fill({ color: INK });
      g.poly([x - 4, y - 6, x + 6, y - 12, x + 2, y - 4]).fill({ color: 0xDC2626 }).stroke({ width: 1, color: INK });
    } else if (kind === 'shield') {
      const pts: number[] = [];
      for (const [dx, dy] of [[-8, -9], [8, -9], [8, 2], [0, 10], [-8, 2]]) pts.push(...rot(x + dx, y + dy, x, y, r));
      g.poly(pts).fill({ color: 0xB45309 }).stroke({ width: 1.5, color: INK });
    } else if (kind === 'bell') {
      kettlebell(g, x, y, 5, r, 0xFBBF24);
    } else if (kind === 'plate') {
      const pts: number[] = [];
      for (const [dx, dy] of [[-7, -3], [7, -3], [6, 3], [-6, 3]]) pts.push(...rot(x + dx, y + dy, x, y, r));
      g.poly(pts).fill({ color: 0xD97706 }).stroke({ width: 1, color: INK });
    } else {
      const [x0, y0] = rot(x - 6, y, x, y, r);
      const [x1, y1] = rot(x + 6, y, x, y, r);
      g.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: 4, color: INK }).moveTo(x0, y0).lineTo(x1, y1).stroke({ width: 2, color: BONE });
    }
  };
  tl.at(0, () => {
    h.anim('DEFENSE');
    h.camera(1.42, h.home.x + 8, h.home.y - 26, FALL + 6);
    h.sound('rattle', { vol: 0.6 });
  });
  tl.every(0, FALL, 2, (i) => h.offset((i % 2 ? 1 : -1) * 1.5, 0)); // shivers
  tl.at(FALL, () => {
    h.alpha(0);
    h.offset(0, 0);
    h.sound('impact_metal', { vol: 0.7, rate: 0.9 });
    h.sound('rattle', { vol: 0.9, rate: 0.8 });
    dust(h, base(), 10, -1);
    dust(h, base(), 10, 1);
  });
  [10, 13, 15, 18].forEach((f, k) => tl.at(f, () => h.sound('impact_metal', { vol: 0.35, rate: 1.2 + k * 0.15 })));
  // Collapse: pieces tumble to the floor, bounce once, lie still, twitch… then fly back
  drawSpan(h, tl, FALL, WHOLE, (g, _t, f) => {
    const b = base();
    pieces.forEach((pc, k) => {
      const rest = { x: b.x + pc.bx, y: b.y + pc.by };
      const floor = { x: b.x + pc.fx, y: b.y - 3 };
      let x: number;
      let y: number;
      let r: number;
      if (f < REFORM - FALL) {
        const t = Math.min(1, f / 14);
        const bounce = t >= 1 ? Math.max(0, Math.sin(Math.min(1, (f - 14) / 6) * Math.PI)) * 4 : 0;
        x = lerp(rest.x, floor.x, easeOut(t));
        y = lerp(rest.y, floor.y, easeIn(t)) - arc(t) * 10 - bounce;
        r = pc.spin * easeOut(t);
        if (f > 20 && f < 28 && (f + k) % 3 === 0) y -= 1; // twitching
      } else {
        const t = Math.min(1, (f - (REFORM - FALL)) / 14);
        const e = easeInOut(t);
        x = lerp(floor.x, rest.x, e);
        y = lerp(floor.y, rest.y, e) - arc(t) * 18;
        r = pc.spin * (1 - e) + t * Math.PI * 2;
      }
      piece(g, pc.kind, x, y, r);
    });
  });
  tl.at(REFORM - 4, () => {
    h.sound('rattle', { vol: 0.9, rate: 1.3 });
    h.camera(1.3, h.home.x + 6, h.home.y - 30, 18);
  });
  motesFx(h, tl, REFORM, WHOLE, () => ({ x: h.pos().x, y: h.pos().y - 20 }), [0xFFFFFF, 0xE2E8F0], 2, 16);
  tl.at(WHOLE, () => {
    h.alpha(1);
    h.anim('DEFENSE');
    h.stretch(0.86, 1.18);
    h.flash(0.3, 0xFFFFFF);
    h.sound('block', { vol: 0.9 });
    h.sound('ward', { vol: 0.6 });
    h.guard(h.ctx.color);
    h.camera(1.5, h.home.x + 6, h.home.y - 30, 12, true);
  });
  ringFx(h, tl, WHOLE, () => h.pos(), 6, 50, 0xE2E8F0, 16, 3);
  tl.during(WHOLE, WHOLE + 8, (t) => h.stretch(lerp(0.86, 1, t), lerp(1.18, 1, t)));
  tl.end(WHOLE + 16);
}

/** A little lantern spirit: glow, flickering flame crown, two curious eyes. */
function wisp(g: Graphics, x: number, y: number, r: number, f: number, look = 1, blink = false, alpha = 1) {
  g.circle(x, y, r * 2.2).fill({ color: 0x67E8F9, alpha: 0.12 * alpha });
  g.circle(x, y, r * 1.5).fill({ color: 0x67E8F9, alpha: 0.25 * alpha });
  for (let k = 0; k < 3; k++) {
    const sway = Math.sin(f * 0.4 + k) * r * 0.4;
    g.poly([x - r * 0.7 + k * r * 0.5, y - r * 0.3, x + sway + (k - 1) * r * 0.4, y - r * (1.8 + 0.4 * Math.sin(f * 0.6 + k * 2)), x - r * 0.1 + k * r * 0.5, y - r * 0.3])
      .fill({ color: k === 1 ? 0xFFFFFF : 0xA5F3FC, alpha: 0.9 * alpha });
  }
  orb(g, x, y, r, P_WISP, alpha);
  if (blink) g.rect(x - r * 0.5 + look, y - 0.5, r, 1).fill({ color: INK, alpha });
  else for (const ox of [-r * 0.35, r * 0.35]) g.rect(x + ox + look - 1, y - 1.5, 2, 3).fill({ color: INK, alpha });
}

/** Will-o'-Lure: a wisp peels off the halo, drifts curiously over the front line and pops in the back foe's face. */
function wispLure(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const HALO = 26;
  const ARRIVE = HALO + 44;
  const POP = ARRIVE + 14;
  const head = (): P => ({ x: h.pos().x + 2, y: h.pos().y - 52 });
  let wx = 0;
  let wy = 0;
  tl.at(0, () => {
    h.anim('BUFF');
    h.weaponShown(false);
    h.camera(1.45, h.home.x + 4, h.home.y - 40, HALO);
    h.sound('magic', { vol: 0.4, rate: 1.4 });
  });
  // The halo leaves a ring of light; a wisp gathers in its wake
  drawSpan(h, tl, 0, HALO, (g, t, f) => {
    const p = head();
    const a = f * 0.34;
    g.ellipse(p.x, p.y, 15, 5).stroke({ width: 1.5, color: 0x67E8F9, alpha: 0.5 * t });
    crescent(g, p.x, p.y, 15, a - 1.6, a, 2.5, P_WISP, 0.7);
    kettlebell(g, p.x + Math.cos(a) * 15, p.y + Math.sin(a) * 5, 4, a, 0x67E8F9);
    if (t > 0.5) wisp(g, p.x, p.y - 14, 3 + 3 * (t - 0.5) * 2, f, 1, false, (t - 0.5) * 2);
  });
  tl.every(0, HALO, 9, (i) => h.sound('whoosh', { vol: 0.35, rate: 1.1 + i * 0.12 }));
  tl.at(HALO, () => {
    h.weaponShown(true);
    h.anim('DEFENSE');
    h.sound('heal', { vol: 0.4, rate: 1.8 });
  });
  // Its flight: a lazy, bobbing, curious drift; it peeks back at the knight once
  drawSpan(h, tl, HALO, POP, (g, _t, f) => {
    const k = Math.min(1, f / (ARRIVE - HALO));
    const s0 = { x: h.home.x + 2, y: h.home.y - 66 };
    const e0 = { x: c.x - 18, y: c.y - 4 };
    wx = lerp(s0.x, e0.x, easeInOut(k)) + Math.sin(f * 0.2) * 6 * (1 - k);
    wy = lerp(s0.y, e0.y, easeInOut(k)) - arc(k) * 26 + Math.sin(f * 0.35) * 3;
    const look = f > 14 && f < 22 ? -1 : 1;
    const blink = f > POP - HALO - 10 && f < POP - HALO - 6;
    const swell = f > ARRIVE - HALO ? 1 + 0.5 * ((f - (ARRIVE - HALO)) / (POP - ARRIVE)) : 1;
    wisp(g, wx, wy, 6 * swell, f, look, blink);
  });
  tl.every(HALO, POP, 3, () => h.emit(wx, wy + 4, { count: 1, colors: [0xA5F3FC, 0xFFFFFF], speed: [0.1, 0.4], angle: Math.PI / 2, spread: 1, gravity: 0.01, size: 2, life: [14, 22] }));
  tl.at(HALO + 6, () => h.sound('whistle', { vol: 0.3, rate: 1.8 }));
  follow(h, tl, HALO + 4, ARRIVE, 1.2, () => ({ x: wx, y: wy + 10 }), 6);
  tl.at(ARRIVE, () => {
    h.camera(1.48, c.x - 14, c.y - 4, POP - ARRIVE + 4);
    h.sound('ui_move', { vol: 0.4, rate: 2 }); // a curious chirp
  });
  tl.at(POP, () => {
    land(h, 0, { tint: 0xA5F3FC, flash: 0xCFFAFE, sfx: 'zap' });
    h.knock(0, 10, 4);
    h.camera(1.56, c.x - 8, c.y - 2, 12, true);
    h.emit(wx, wy, { count: 24, colors: [0xFFFFFF, 0x67E8F9, 0xA5F3FC], speed: [1.5, 4], angle: 0, spread: Math.PI, gravity: 0.02, size: 2, life: [14, 26] });
  });
  hitFx(h, tl, POP, () => ({ x: wx, y: wy }), P_WISP, 18, [0xFFFFFF, 0x67E8F9]);
  ringFx(h, tl, POP, () => ({ x: wx, y: t0.y }), 4, 46, 0x67E8F9, 14, 2);
  tl.end(POP + 18);
}

// =============================================================================================
// RARE

/** Banshee Step: he fades to a wailing ghost, glides straight through the front foe and strikes the back one from behind. */
function bansheeStep(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target; // BACK
  const c = chest(t0);
  const FADE = 14;
  const ARRIVE = 34;
  const STAB = ARRIVE + 10;
  const behind = { x: t0.x + 34 - h.home.x, y: t0.y - h.home.y };
  tl.at(0, () => {
    h.anim('BUFF');
    h.sound('wail', { vol: 0.8 });
    h.camera(1.4, h.home.x + 6, h.home.y - 30, FADE + 4);
  });
  tintRamp(h, tl, 0, FADE, 0xFFFFFF, 0x9BD8FF);
  fade(h, tl, 0, FADE, 1, 0.45);
  tl.every(0, FADE, 3, () => h.emit(h.pos().x + rand(-10, 10), h.pos().y - rand(0, 40), { count: 2, colors: [0xBAE6FD, 0xE0F2FE], speed: [0.2, 0.7], angle: -Math.PI / 2, spread: 0.5, gravity: -0.02, size: 3, life: [16, 26] }));
  dimSpan(h, tl, 0, STAB + 6, 0.32, 0x041020, 10);
  // The glide: low, fast, through everything, wisps of ectoplasm behind
  tl.at(FADE, () => {
    h.anim('DASH');
    h.sound('whoosh_heavy', { vol: 0.7, rate: 0.7 });
    h.camera(1.04, (h.home.x + t0.x) / 2 + 20, h.home.y - 36, ARRIVE - FADE + 6);
  });
  travel(h, tl, FADE, ARRIVE, HOME, behind, easeInOut);
  tl.during(FADE, ARRIVE, (t) => h.lift(arc(t) * 6));
  ghostTrail(h, tl, FADE, ARRIVE, 0x7DD3FC, 1, 0.35);
  tl.at(FADE + 8, () => h.sound('frost', { vol: 0.4, rate: 1.5 })); // the chill as he passes through the front line
  // Reappear behind, solid, facing back
  tl.at(ARRIVE, () => {
    h.face(true);
    h.alpha(1);
    h.tint(0xE0F2FE);
    h.anim('ATTACK5');
    poof(h, h.pos(), [0xBAE6FD, 0xFFFFFF, 0x7DD3FC], 12);
    h.sound('wail', { vol: 0.5, rate: 1.5 });
    h.camera(1.42, t0.x + 10, c.y - 4, 12, true); // reverse angle
  });
  slashFx(h, tl, STAB - 1, { x: c.x + 10, y: c.y, r: 24, a0: -0.9, a1: -3.6, thick: 7, p: P_BANSHEE });
  hitFx(h, tl, STAB, c, P_BANSHEE, 16, [0xFFFFFF, 0xBAE6FD, 0x7DD3FC]);
  tl.at(STAB, () => {
    land(h, 0, { tint: 0xBAE6FD, flash: 0xE0F2FE, sfx: 'stab' });
    h.knock(0, -14, 4);
    h.vfx('ice', c.x, c.y, { size: 0.6, start: 66, tint: 0xBAE6FD, life: 18 });
    h.camera(1.55, c.x + 4, c.y, 12, true);
  });
  // Fade back out and drift home through the line
  tl.at(STAB + 10, () => {
    h.anim('DASH');
    h.sound('wail', { vol: 0.35, rate: 1.2 });
  });
  fade(h, tl, STAB + 10, STAB + 14, 1, 0.45);
  travel(h, tl, STAB + 10, STAB + 32, here(h), HOME, easeInOut);
  ghostTrail(h, tl, STAB + 10, STAB + 32, 0x7DD3FC, 2, 0.3);
  tl.at(STAB + 32, () => {
    h.face(false);
    h.alpha(1);
    h.tint(0xFFFFFF);
    h.idle();
  });
  tl.end(STAB + 34);
}

/** Bone Volley: the bell is thrust skyward and bursts into bone arrows that rain down on random foes. */
function boneVolley(h: KnightMoveHost, tl: Timeline) {
  const hits = h.targets.length ? [...h.targets] : [h.target, h.target, h.target];
  const RAISE = 16;
  const FIRST = RAISE + 18;
  const STEP = 7;
  const tip = () => h.weaponTip();
  tl.at(0, () => {
    h.anim('SKILL2TULUC');
    h.camera(1.32, h.home.x + 10, h.home.y - 30, RAISE);
    h.sound('rattle', { vol: 0.5, rate: 1.2 });
  });
  tl.at(11, () => h.animSpeed(0));
  chargeFx(h, tl, 0, RAISE, tip, P_BONE, 30, 10);
  tl.at(RAISE, () => {
    h.weaponShown(false);
    h.flash(0.2, 0xFFFFFF);
    h.sound('arrow', { vol: 0.8 });
    h.sound('impact_metal', { vol: 0.4, rate: 1.6 });
    h.sparks(tip().x, tip().y, 12, [0xFFFFFF, 0xE2E8F0]);
    h.camera(1.02, 280, h.home.y - 50, 40); // pull wide to show the line before they land
  });
  // Three shards shoot off the top of the frame
  const up = fix(() => ({ ...tip() }));
  drawSpan(h, tl, RAISE, RAISE + 10, (g, t) => {
    const p = up();
    for (let k = 0; k < 3; k++) dart(g, p.x + (k - 1) * 8 * t, p.y - t * 120, -Math.PI / 2 + (k - 1) * 0.12, 22, 0xE2E8F0, BONE, 3);
  });
  hits.slice(0, 3).forEach((t, k) => {
    const at = FIRST + k * STEP;
    const gx = t.x - 6 + (k - 1) * 4;
    const tgt = { x: gx, y: t.y - t.height * 0.6 };
    // Ground mark, then the arrow drops out of the sky
    drawSpan(h, tl, at - 12, at, (g, f) => {
      g.ellipse(gx, t.y, 10 * (1 - f) + 4, 3 * (1 - f) + 1).stroke({ width: 1.5, color: 0xF87171, alpha: 0.4 + 0.6 * f });
    }, 'ground');
    drawSpan(h, tl, at - 6, at, (g, f) => {
      const x = tgt.x - 30 * (1 - f);
      const y = tgt.y - 120 * (1 - easeIn(f));
      g.moveTo(x - 9, y - 40).lineTo(x, y).stroke({ width: 3, color: 0xFFFFFF, alpha: 0.35 }); // speed streak
      dart(g, x, y, 1.32, 26, 0xE2E8F0, BONE, 3.5);
    });
    tl.at(at - 4, () => h.sound('arrow', { vol: 0.6, rate: 1 + k * 0.1 }));
    tl.at(at, () => {
      if (k < h.targets.length) land(h, k, { scale: k === 2 ? 1.1 : 0.85, tint: 0xF1F5F9, sfx: 'stab' });
      h.knock(k, 6, 0);
      h.emit(tgt.x, tgt.y, { count: 10, colors: [0xFFFFFF, 0xE2E8F0, 0x94A3B8], speed: [1.5, 3.5], angle: -Math.PI / 2, spread: 1.2, gravity: 0.2, size: 2, life: [12, 22] });
      h.camera(1.32 + k * 0.06, tgt.x + (k % 2 ? 12 : -12), tgt.y, 6, true);
    });
    // The arrow stays stuck in the floor, quivering, then crumbles
    drawSpan(h, tl, at, at + 30, (g, f, fr) => {
      const q = Math.sin(fr * 1.4) * 0.12 * (1 - f);
      dart(g, gx - 3, t.y - 10, 1.32 + q, 26, 0xE2E8F0, BONE, 3.5);
      if (f > 0.7) g.rect(gx - 4, t.y - 2, 4, 2).fill({ color: 0xE2E8F0, alpha: 1 - f });
    }, 'ground');
  });
  const END = FIRST + 2 * STEP;
  tl.at(END + 6, () => {
    h.animSpeed(1);
    h.weaponShown(true);
    h.sparks(tip().x, tip().y, 8, [0xFFFFFF, 0xE2E8F0]);
    h.sound('equip', { vol: 0.5, rate: 1.2 });
    h.idle();
    h.camera(1.08, h.home.x + 80, h.home.y - 30, 12);
  });
  tl.end(END + 20);
}

/** Armoured beetle shell (the knight curled inside), its plates turning as it rolls. */
function beetleShell(g: Graphics, x: number, y: number, r: number, spin: number, alpha = 1) {
  g.ellipse(x, y + r * 0.85, r * 1.05, r * 0.25).fill({ color: 0x000000, alpha: 0.3 * alpha });
  g.circle(x, y, r).fill({ color: 0x1A2E05, alpha }).stroke({ width: 2, color: INK, alpha });
  for (let k = 0; k < 4; k++) {
    const a = spin + (k * Math.PI) / 2;
    g.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2).lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r).stroke({ width: 1.5, color: 0x4D7C0F, alpha });
  }
  g.circle(x, y, r * 0.55).stroke({ width: 1.5, color: 0x4D7C0F, alpha });
  arcAt(g, x, y, r * 0.8, -2.6, -1.4).stroke({ width: 2, color: 0xD9F99D, alpha: 0.8 * alpha }); // sheen
  const hx = x + Math.cos(spin) * r;
  const hy = y + Math.sin(spin) * r;
  g.poly([hx, hy, x + Math.cos(spin + 0.35) * r * 1.35, y + Math.sin(spin + 0.35) * r * 1.35, x + Math.cos(spin + 0.2) * r, y + Math.sin(spin + 0.2) * r]).fill({ color: 0xD9F99D, alpha }).stroke({ width: 1, color: INK, alpha });
}

/** Carapace Roll: he curls into a beetle shell, revs in place and bowls through the line, then hops home and unfurls. */
function carapaceRoll(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const far = Math.max(...foes.map((t) => t.x)) + 26;
  const CURL = 10;
  const ROLL = 22;
  const END = 40;
  const R = 13;
  let sx = 0;
  let spin = 0;
  let lift = 0;
  const trail: { x: number; y: number }[] = [];
  tl.at(0, () => {
    h.anim('DEFENSE');
    h.camera(1.4, h.home.x + 8, h.home.y - 22, ROLL);
    h.sound('chitter', { vol: 0.6 });
  });
  crouch(h, tl, 0, CURL, 0.2);
  tl.at(CURL, () => {
    h.alpha(0);
    h.sound('equip', { vol: 0.6, rate: 0.6 });
    h.sound('spin', { vol: 0.8, rate: 0.8 });
  });
  // Shell closes, revs in place (dust spitting out behind), then launches
  drawSpan(h, tl, CURL - 4, END + 22, (g, _t, f) => {
    const fr = f + CURL - 4;
    const close = Math.min(1, f / 4);
    if (fr < ROLL) {
      sx = h.home.x;
      spin += 0.2 + (fr - CURL) * 0.06;
      lift = 0;
    } else if (fr < END) {
      const k = (fr - ROLL) / (END - ROLL);
      sx = lerp(h.home.x, far, easeIn(Math.min(1, k * 1.15)));
      spin += 0.9;
      lift = Math.abs(Math.sin(k * Math.PI * 5)) * 3;
    } else {
      const k = Math.min(1, (fr - END) / 20);
      sx = lerp(far, h.home.x, easeInOut(k));
      spin -= 0.5;
      lift = arc(k) * 40;
    }
    const y = h.home.y - R - lift;
    trail.unshift({ x: sx, y });
    trail.length = Math.min(trail.length, 6);
    if (fr >= ROLL && fr < END) trail.forEach((p, i) => i && beetleShell(g, p.x, p.y, R, spin - i * 0.9, 0.35 - i * 0.05));
    if (fr < END + 18) beetleShell(g, sx, y, R * close, spin);
  });
  tl.every(CURL, ROLL, 2, () => h.emit(h.home.x - 10, h.home.y - 2, { count: 3, colors: [0x78716C, 0xA8A29E, 0x5C2B14], speed: [1.5, 3], angle: Math.PI + 0.3, spread: 0.3, gravity: 0.1, size: 2, life: [10, 18] }));
  tl.at(ROLL, () => {
    h.sound('dash');
    h.sound('rock', { vol: 0.5, rate: 0.7 });
    h.camera(1.12, (h.home.x + far) / 2, h.home.y - 26, END - ROLL);
  });
  tl.every(ROLL, END, 2, () => {
    h.emit(sx - 10, h.home.y - 2, { count: 2, colors: [0x78716C, 0xA8A29E], speed: [0.8, 2], angle: Math.PI + 0.4, spread: 0.4, gravity: 0.05, size: 3, life: [12, 20] });
    h.streaks(sx - 18, h.home.y - R, 20, [0xD9F99D, 0x4D7C0F]);
  });
  foes.forEach((t, i) => {
    const k = Math.max(0, Math.min(1, (t.x - 10 - h.home.x) / (far - h.home.x)));
    const at = ROLL + Math.max(2, Math.round(((END - ROLL) * Math.cbrt(k)) / 1.15)); // invert easeIn(1.15·t)
    tl.at(at, () => {
      land(h, i, { scale: i ? 0.9 : 1.05, tint: 0xD9F99D, sfx: 'chitter' });
      h.knock(i, 16, 14);
      debris(h, { x: t.x, y: t.y }, 8, STONE);
      if (i === 0) h.camera(1.36, t.x - 6, t.y - 20, 8, true);
    });
  });
  tl.at(END, () => {
    h.sound('jump', { vol: 0.6 });
    h.camera(1.04, (h.home.x + far) / 2, h.home.y - 50, 20);
  });
  tl.at(END + 20, () => {
    h.alpha(1);
    h.anim('DEFENSE');
    h.stretch(1.15, 0.85);
    h.sound('thud', { vol: 0.6 });
    h.sound('ward', { vol: 0.5 });
    h.guard(h.ctx.color);
    dust(h, h.pos(), 8, -1);
    dust(h, h.pos(), 8, 1);
    h.camera(1.22, h.home.x + 10, h.home.y - 26, 10, true);
  });
  tl.during(END + 20, END + 28, (t) => h.stretch(lerp(1.15, 1, t), lerp(0.85, 1, t)));
  tl.end(END + 32);
}

/** Curling breaker standing `hgt` tall, its lip at x curling toward -x, the back slope `w` long. */
function waveCrest(g: Graphics, x: number, gy: number, hgt: number, w: number, f: number, alpha = 1) {
  if (hgt < 2) return;
  const H = hgt;
  const shape = (k: number) =>
    g.moveTo(x + w * k, gy)
      .quadraticCurveTo(x + w * 0.35 * k, gy - H * 0.25, x + 4, gy - H) // back face up to the crest
      .quadraticCurveTo(x - H * 0.55, gy - H * 1.15, x - H * 0.75, gy - H * 0.6) // the lip pitching far forward
      .quadraticCurveTo(x - H * 0.45, gy - H * 0.82, x - H * 0.15, gy - H * 0.55) // curling back under
      .quadraticCurveTo(x - H * 0.05, gy - H * 0.2, x - H * 0.35, gy) // the face down to the floor
      .closePath();
  shape(1).fill({ color: 0x0F766E, alpha: 0.9 * alpha }).stroke({ width: 2, color: 0x042F2E, alpha });
  // Lighter water in the face and a dark barrel under the lip
  g.moveTo(x + w * 0.5, gy).quadraticCurveTo(x + w * 0.15, gy - H * 0.35, x, gy - H * 0.85).quadraticCurveTo(x - H * 0.05, gy - H * 0.4, x - H * 0.25, gy).closePath()
    .fill({ color: 0x14B8A6, alpha: 0.65 * alpha });
  g.ellipse(x - H * 0.35, gy - H * 0.6, H * 0.16, H * 0.1).fill({ color: 0x042F2E, alpha: 0.75 * alpha }); // the barrel
  // Foam along the lip and spray off the crest
  for (let k = 0; k < 9; k++) {
    const t = k / 8;
    const fx = lerp(x + 6, x - H * 0.75, t);
    const fy = lerp(gy - H * 1.02, gy - H * 0.6, t * t) - Math.sin(t * Math.PI) * H * 0.06 + Math.sin(f * 0.5 + k) * 1.2;
    g.circle(fx, fy, 2.5 - t).fill({ color: 0xF0FDFA, alpha });
  }
  for (let k = 0; k < 5; k++) g.rect(x - 4 + k * 5 + Math.sin(f * 0.7 + k) * 2, gy - H - 4 - ((f * 1.5 + k * 7) % 10), 2, 2).fill({ color: 0xF0FDFA, alpha: 0.8 * alpha });
}

/** Undertow: a heaving row; a wave rears up behind the line and slams the back foe into the front one. */
function undertow(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const back = foes[foes.length - 1];
  const front = foes[0];
  const RISE = 14;
  const CRASH = 32;
  const gy = back.y + 2;
  let wx = back.x + 30;
  tl.at(0, () => {
    h.anim('ATTACK5');
    h.camera(1.28, h.home.x + 16, h.home.y - 26, RISE);
    h.sound('gurgle', { vol: 0.5 });
  });
  motesFx(h, tl, 0, RISE, () => ({ x: h.pos().x + 20, y: h.pos().y - 24 }), [0x14B8A6, 0xF0FDFA], 2, 8);
  drawSpan(h, tl, 0, CRASH, (g, t) => g.ellipse(back.x, gy, 14 + 10 * t, 4 + 2 * t).stroke({ width: 1.5, color: 0x14B8A6, alpha: 0.5 + 0.5 * t }), 'ground');
  // The row: he hauls back and the sea answers
  tl.at(RISE, () => {
    h.anim('ATTACK5');
    h.offset(-8, 0);
    h.stretch(1.08, 0.94);
    h.sound('wave', { vol: 0.9, rate: 0.8 });
    h.camera(1.02, (h.home.x + back.x) / 2 + 30, h.home.y - 44, CRASH - RISE + 10); // wide: the wave rears into frame
  });
  tl.during(RISE, RISE + 8, (t) => h.stretch(lerp(1.08, 1, t), lerp(0.94, 1, t)));
  drawSpan(h, tl, RISE, CRASH + 14, (g, _t, f) => {
    const fr = f + RISE;
    if (fr < CRASH - 6) {
      const k = (fr - RISE) / (CRASH - 6 - RISE);
      wx = back.x + 30 + 4 * Math.sin(fr * 0.3);
      waveCrest(g, wx, gy, 70 * easeOut(k), 50, fr);
    } else {
      const k = Math.min(1, (fr - (CRASH - 6)) / 16);
      wx = lerp(back.x + 30, front.x - 20, easeIn(k));
      waveCrest(g, wx, gy, 70 * (1 - k * 0.8), 50, fr, 1 - k * 0.6);
    }
  });
  tl.every(RISE, CRASH + 10, 2, () => h.emit(wx, gy - 30, { count: 2, colors: [0xF0FDFA, 0x5EEAD4], speed: [0.5, 2], angle: -Math.PI / 2 - 0.4, spread: 0.8, gravity: 0.12, size: 2, life: [12, 20] }));
  // The crash: back foe first, slammed into the front one
  const order = foes.map((t, i) => ({ t, i })).sort((a, b) => b.t.x - a.t.x);
  order.forEach(({ t, i }, n) => {
    const at = CRASH + n * 4;
    tl.at(at, () => {
      land(h, i, { scale: n ? 1.1 : 0.9, tint: 0x99F6E4, flash: 0xCCFBF1, sfx: 'splash' });
      h.knock(i, -14, 4);
      h.emit(t.x, t.y - t.height * 0.5, { count: 16, colors: [0xF0FDFA, 0x5EEAD4, 0x14B8A6], speed: [1.5, 4], angle: -Math.PI / 2, spread: 1.4, gravity: 0.18, size: 2, life: [14, 24] });
      h.camera(1.3 + n * 0.12, t.x - 6, t.y - t.height * 0.5, 8, true);
    });
  });
  tl.at(CRASH, () => h.sound('splash', { vol: 1 }));
  travel(h, tl, RISE + 8, RISE + 16, () => ({ x: -8, y: 0 }), HOME, easeOut);
  tl.at(CRASH + 14, () => {
    h.anim('DEFENSE');
    h.guard(h.ctx.color);
    h.sound('splash', { vol: 0.4, rate: 1.5 });
    h.camera(1.12, h.home.x + 40, h.home.y - 30, 12);
  });
  ringFx(h, tl, CRASH + 14, () => h.pos(), 8, 40, 0x14B8A6, 16, 3);
  tl.end(CRASH + 26);
}

/** A grave slab (rounded top, carved cross) centred on (x, y), rotated `r`. */
function slab(g: Graphics, x: number, y: number, s: number, r: number) {
  const P0 = [[-6, 10], [-6, -6], [-3, -10], [3, -10], [6, -6], [6, 10]];
  const pts: number[] = [];
  for (const [dx, dy] of P0) pts.push(...rot(x + dx * s, y + dy * s, x, y, r));
  g.poly(pts).fill({ color: 0x57534E }).stroke({ width: 2, color: INK });
  const [a0, a1] = rot(x, y - 6 * s, x, y, r);
  const [b0, b1] = rot(x, y + 3 * s, x, y, r);
  const [c0, c1] = rot(x - 3 * s, y - 3 * s, x, y, r);
  const [d0, d1] = rot(x + 3 * s, y - 3 * s, x, y, r);
  g.moveTo(a0, a1).lineTo(b0, b1).moveTo(c0, c1).lineTo(d0, d1).stroke({ width: 1.5, color: 0x292524 });
}

/** Tombstone Heave: he deadlifts a gravestone out of the earth and hurls it end over end at the back row. */
function tombstoneHeave(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target; // BACK
  const c = chest(t0);
  const RISE = 6;
  const LOCK = 26;
  const THROW = 38;
  const FLIGHT = 26;
  const HIT = THROW + FLIGHT;
  const graveX = () => h.home.x + 24;
  let spinR = 0;
  tl.at(0, () => {
    h.anim('SKILL1');
    h.camera(1.4, h.home.x + 18, h.home.y - 22, LOCK);
    h.sound('quake', { vol: 0.5, rate: 1.4 });
  });
  crackFx(h, tl, 2, { x: graveX() - 20, y: h.home.y + 1 }, { x: graveX() + 20, y: h.home.y - 1 }, P_STONE, 6, 40);
  // The stone grinds up out of the ground while he strains
  drawSpan(h, tl, RISE, LOCK, (g, t) => tombstone(g, graveX(), h.home.y, easeOut(t), 1.1, 0), 'fx');
  tl.every(RISE, LOCK, 3, (i) => {
    h.shake(2);
    h.offset(i % 2 ? -0.8 : 0.8, 0);
    debris(h, { x: graveX(), y: h.home.y }, 2, DIRT, 0.6);
  });
  tl.every(RISE, LOCK, 6, () => smoke(h, { x: graveX(), y: h.home.y - 4 }, 2, [0x84A98C, 0x52796F, 0x94A3B8]));
  tl.at(RISE, () => h.sound('rock', { vol: 0.8, rate: 0.6 }));
  crouch(h, tl, RISE, LOCK, 0.12);
  // Lockout: stone hoisted overhead
  tl.at(LOCK, () => {
    h.anim('SKILL2TULUC');
    h.offset(0, 0);
    h.stretch(0.88, 1.14);
    h.sound('stomp', { vol: 0.6 });
    h.sound('growl', { vol: 0.4, rate: 1.2 });
    h.camera(1.06, (h.home.x + t0.x) / 2, h.home.y - 50, THROW - LOCK + 6);
  });
  tl.during(LOCK, LOCK + 8, (t) => h.stretch(lerp(0.88, 1, t), lerp(1.14, 1, t)));
  drawSpan(h, tl, LOCK, THROW, (g, t) => slab(g, lerp(graveX(), h.pos().x + 4, easeOut(Math.min(1, t * 2))), lerp(h.home.y - 12, h.pos().y - 70, easeOut(Math.min(1, t * 2))), 1.6, -0.2 * t));
  tl.at(THROW - 6, () => h.anim('ATTACK3'));
  tl.at(THROW, () => {
    h.sound('whoosh_heavy', { vol: 0.9, rate: 0.7 });
    h.camera(1.0, (h.home.x + c.x) / 2 + 20, h.home.y - 70, FLIGHT);
  });
  projectile(h, tl, THROW, FLIGHT, () => ({ x: h.pos().x + 4, y: h.pos().y - 70 }), () => ({ x: c.x - 4, y: c.y }), 46, (g, x, y) => {
    spinR -= 0.42;
    slab(g, x, y, 1.6, spinR);
  }, () => {}, (x, y) => {
    if (Math.random() < 0.5) h.emit(x, y, { count: 1, colors: [0x84A98C, 0x94A3B8], speed: [0.1, 0.3], angle: Math.PI, spread: 0.6, gravity: -0.01, size: 3, life: [12, 20] });
  });
  tl.at(HIT - 8, () => h.camera(1.25, c.x - 10, c.y - 6, 10));
  hitFx(h, tl, HIT, c, P_STONE, 20, [0xFFFFFF, 0xD6D3D1, 0x78716C]);
  tl.at(HIT, () => {
    land(h, 0, { scale: 1.2, tint: 0xD6D3D1, sfx: 'rock' });
    h.sound('crack', { vol: 0.7, rate: 0.8 });
    h.knock(0, 14, 8);
    dust(h, { x: t0.x, y: t0.y }, 12, -1);
    dust(h, { x: t0.x, y: t0.y }, 12, 1);
    h.camera(1.5, c.x - 6, c.y + 4, 14, true);
    h.emit(c.x, c.y, { count: 22, colors: STONE, speed: [2, 5], angle: -Math.PI / 2, spread: 1.5, gravity: 0.25, size: 3, life: [16, 28] });
  });
  // The slab lands upright beside the foe like a fresh grave, then sinks
  drawSpan(h, tl, HIT, HIT + 34, (g, t) => tombstone(g, t0.x + 18, t0.y, 1 - easeIn(Math.max(0, (t - 0.6) / 0.4)), 1.1, -0.15), 'fx');
  tl.end(HIT + 36);
}

/** Troll Blood: a roar, three brute squat-stomps while his wounds knit, then a charging club smash. */
function trollBlood(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const POUNDS = [12, 22, 32];
  const DASH = 40;
  const SMASH = DASH + 12;
  tl.at(0, () => {
    h.anim('BUFF');
    h.sound('roar', { vol: 0.8, rate: 1.15 });
    h.camera(1.46, h.home.x + 8, h.home.y - 34, 10, true);
  });
  tintRamp(h, tl, 0, 10, 0xFFFFFF, 0xC5F08A);
  drawSpan(h, tl, 0, 12, (g, t) => {
    const p = kChest(h);
    for (let k = 0; k < 3; k++) rightRings(g, p.x + 6, p.y - 16, 10 + (t * 60 + k * 14) % 50, 0xBEF264, 1 - t);
  });
  // Pounds: squash, stomp, a wound mark fades as green regen motes rise
  POUNDS.forEach((at, k) => {
    tl.at(at - 4, () => h.anim('SKILL1'));
    crouch(h, tl, at - 4, at, 0.16);
    tl.at(at, () => {
      h.stretch(0.9, 1.12);
      h.shake(6);
      h.sound('stomp', { vol: 0.9, rate: 0.9 + k * 0.1 });
      dust(h, h.pos(), 8, -1);
      dust(h, h.pos(), 8, 1);
      h.emit(h.pos().x, h.pos().y - 26, { count: 8, colors: [0xBEF264, 0x65A30D, 0xECFCCB], speed: [0.4, 1.2], angle: -Math.PI / 2, spread: 0.8, gravity: -0.03, size: 2, life: [18, 28] });
      h.sound('heal', { vol: 0.3, rate: 1.4 + k * 0.15 });
      h.camera(1.36 + k * 0.05, h.home.x + 8, h.home.y - 30, 6, true);
    });
    tl.during(at, at + 4, (t) => h.stretch(lerp(0.9, 1, t), lerp(1.12, 1, t)));
    drawSpan(h, tl, at - 6, at + 8, (g, t) => {
      const p = h.pos();
      const x = p.x - 4 + k * 5;
      const y = p.y - 34 + k * 7;
      g.moveTo(x - 3, y - 3).lineTo(x + 3, y + 3).stroke({ width: 2, color: mix(0xDC2626, 0x84CC16, t), alpha: 1 - t * 0.7 });
    });
  });
  tl.at(DASH, () => {
    h.anim('DASH');
    h.sound('dash');
    h.sound('growl', { vol: 0.6 });
    h.camera(1.14, between(h, t0, 0.6).x, c.y, 12);
  });
  travel(h, tl, DASH, SMASH - 2, HOME, strikeSpot(h, t0, 50), easeIn);
  ghostTrail(h, tl, DASH, SMASH - 2, 0x84CC16, 2, 0.3);
  tl.at(SMASH - 6, () => h.anim('SKILL1'));
  hitFx(h, tl, SMASH, c, P_TROLL, 18, [0xFFFFFF, 0xECFCCB, 0x65A30D]);
  tl.at(SMASH, () => {
    land(h, 0, { scale: 1.15, tint: 0xD9F99D, sfx: 'wood' });
    h.knock(0, 18, 6);
    h.camera(1.48, c.x - 12, c.y, 12, true);
    debris(h, { x: t0.x - 8, y: t0.y }, 8);
  });
  backstep(h, tl, SMASH + 10, SMASH + 26, 14);
  tl.at(SMASH + 26, () => {
    h.tint(0xFFFFFF);
    h.guard(h.ctx.color); // the heal glow
  });
  tl.end(SMASH + 34);
}

/** Needle Burst: he drives into a deep squat; bramble races along the ground and erupts in spikes under four foes. */
function needleBurst(h: KnightMoveHost, tl: Timeline) {
  const hits = h.targets.length ? [...h.targets] : [h.target, h.target, h.target, h.target];
  const PLANT = 10;
  const FIRST = PLANT + 14;
  const STEP = 6;
  tl.at(0, () => {
    h.anim('SKILL1');
    h.camera(1.36, h.home.x + 10, h.home.y - 22, PLANT);
    h.sound('hiss', { vol: 0.5 });
  });
  crouch(h, tl, 0, PLANT, 0.18);
  tl.at(PLANT, () => {
    h.anim('DEFENSE');
    h.shake(5);
    h.sound('stomp', { vol: 0.8 });
    h.sound('wood', { vol: 0.6, rate: 0.8 });
    dust(h, h.pos(), 10, 1);
    h.camera(1.04, 270, h.home.y - 30, 40);
  });
  // Bramble runner snaking across the floor
  const end = Math.max(...hits.map((t) => t.x)) + 10;
  drawSpan(h, tl, PLANT, FIRST + STEP * 4 + 10, (g, t, f) => {
    const x0 = h.home.x + 14;
    const reach = Math.min(1, f / 12);
    const fadeA = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
    const n = 30;
    for (let i = 0; i < n * reach; i++) {
      const x = lerp(x0, end, i / n);
      const y = h.home.y + Math.sin(i * 0.9) * 2;
      g.circle(x, y, 2).fill({ color: 0x14532D, alpha: fadeA });
      if (i % 3 === 0) g.poly([x, y - 1, x + 2, y - 6, x + 3, y - 1]).fill({ color: 0xFEF3C7, alpha: fadeA });
    }
  }, 'ground');
  hits.slice(0, 4).forEach((t, k) => {
    const at = FIRST + k * STEP;
    const gx = t.x + (k % 2 ? 8 : -10);
    drawSpan(h, tl, at - 2, at + 22, (g, f) => {
      const up = f < 0.15 ? easeOut(f / 0.15) : f > 0.7 ? 1 - (f - 0.7) / 0.3 : 1;
      for (let s = -2; s <= 2; s++) {
        spike(g, gx + s * 7, t.y + 2, (48 - Math.abs(s) * 10) * up, 7, 0x166534, 0x052E16, 0xFEF3C7);
      }
    });
    tl.at(at, () => {
      if (k < h.targets.length) land(h, k, { scale: 0.8, tint: 0xBBF7D0, sfx: 'stab' });
      h.knock(k, 4, 16);
      h.emit(gx, t.y - 8, { count: 10, colors: [0x16A34A, 0xFEF3C7, 0x5C2B14], speed: [1.5, 3.5], angle: -Math.PI / 2, spread: 0.7, gravity: 0.2, size: 2, life: [12, 20] });
      debris(h, { x: gx, y: t.y }, 5);
      if (k === 3 || k === hits.length - 1) h.camera(1.3, gx, t.y - 24, 10, true);
    });
  });
  const END = FIRST + STEP * 4;
  tl.at(END + 10, () => {
    h.idle();
    h.camera(1.1, h.home.x + 60, h.home.y - 30, 12);
  });
  tl.end(END + 24);
}

/** A giant crab claw hinged at (x, y), jaws reaching `len` to the left; `open` 0 shut → 1 wide. */
function pincer(g: Graphics, x: number, y: number, len: number, open: number, alpha = 1) {
  const jaw = (side: 1 | -1, color: number) => {
    const outer: number[] = [];
    const inner: number[] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const bow = Math.sin(t * Math.PI * 0.85) * len * (0.18 + 0.4 * open);
      const hook = t > 0.8 ? (t - 0.8) * len * 0.9 : 0; // the tip hooks inward
      const cx = x - len * t;
      const cy = y + side * (bow - hook);
      const w = len * 0.2 * (1 - t * 0.85);
      outer.push(cx, cy + side * w);
      const tooth = i % 2 && t > 0.15 && t < 0.85 ? len * 0.06 : 0;
      inner.unshift(cx, cy - side * (w * 0.2 + tooth));
    }
    g.poly([...outer, ...inner]).fill({ color, alpha }).stroke({ width: 2, color: INK, alpha });
    g.moveTo(x - len * 0.15, y + side * len * 0.2).lineTo(x - len * 0.55, y + side * len * 0.32 * (0.5 + open)).stroke({ width: 1.5, color: 0xFFEDD5, alpha: 0.6 * alpha });
  };
  jaw(-1, 0xEA580C);
  jaw(1, 0xC2410C);
  g.circle(x, y, len * 0.22).fill({ color: 0x9A3412, alpha }).stroke({ width: 2, color: INK, alpha });
  g.rect(x - 1, y - len * 0.1, 3, 3).fill({ color: 0xFFEDD5, alpha });
}

/** Pincer Crack: a snapping clean conjures a giant crab claw that clamps the foe, squeezes, and cracks its armour. */
function pincerCrack(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const SNAP = 18;
  const CLAMP = 26;
  const CRACK = 44;
  const claw = (): P => ({ x: c.x + 30, y: c.y });
  tl.at(0, () => {
    h.slashTrail(false);
    h.anim('DASH');
    h.sound('dash', { vol: 0.6 });
    h.camera(1.18, between(h, t0, 0.6).x, c.y, 10);
  });
  travel(h, tl, 0, 10, HOME, strikeSpot(h, t0, 56), easeIn);
  tl.at(8, () => h.anim('ATTACK2'));
  tl.at(SNAP - 2, () => swingSound(h, true));
  slashFx(h, tl, SNAP - 1, { x: c.x - 4, y: c.y + 2, r: 24, a0: 1.6, a1: -1.6, thick: 6, p: P_CRAB, dur: 8 });
  // The claw: swings open around the foe, then clamps shut
  drawSpan(h, tl, SNAP, CRACK + 6, (g, _t, f) => {
    const fr = f + SNAP;
    const grow = easeOut(Math.min(1, f / 6));
    const open = fr < CLAMP ? lerp(0.2, 1, easeOut((fr - SNAP) / (CLAMP - SNAP - 2))) : fr < CRACK ? 0.12 + Math.abs(Math.sin(fr * 1.3)) * 0.06 : 0.6;
    const p = claw();
    pincer(g, p.x + (fr >= CRACK ? 8 : 0), p.y, 58 * grow, Math.min(1, open), fr >= CRACK ? 1 - (fr - CRACK) / 6 : 1);
  });
  tl.at(SNAP + 2, () => h.sound('chitter', { vol: 0.7, rate: 0.8 }));
  tl.at(CLAMP, () => {
    h.sound('claw', { vol: 0.9 });
    h.sound('impact_metal', { vol: 0.5, rate: 0.7 });
    h.flashTarget(0, 0xFDBA74, 8);
    h.shake(6);
    h.hitStop(3);
    h.camera(1.48, c.x + 6, c.y, 18, true);
  });
  // Squeeze: the foe trembles and white cracks spread over its armour
  tl.every(CLAMP + 2, CRACK, 2, (i) => h.knock(0, i % 2 ? 2 : -2));
  drawSpan(h, tl, CLAMP + 4, CRACK + 10, (g, t, f) => {
    const k = Math.min(1, f / (CRACK - CLAMP - 4));
    const a = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
    const segs = [[0, 0, -8, -6, -12, -2], [0, 0, 6, -9, 10, -12], [0, 0, 7, 6, 3, 12], [0, 0, -6, 8, -11, 7]];
    segs.forEach((sg, i) => {
      if (i / segs.length > k) return;
      g.moveTo(c.x + sg[0], c.y + sg[1]).lineTo(c.x + sg[2], c.y + sg[3]).lineTo(c.x + sg[4], c.y + sg[5]).stroke({ width: 1.5, color: 0xFFFFFF, alpha: a });
    });
  });
  tl.every(CLAMP + 4, CRACK, 6, () => h.sound('crack', { vol: 0.35, rate: 1.6 }));
  tl.at(CRACK - 8, () => h.camera(1.62, c.x, c.y, 14));
  tl.at(CRACK, () => {
    land(h, 0, { scale: 1.3, tint: 0xFFEDD5, flash: 0xFFFFFF, sfx: 'crack' });
    h.knock(0, 18, 4);
    h.emit(c.x, c.y, { count: 22, colors: [0xEA580C, 0xFDBA74, 0xFFEDD5, 0x7C2D12], speed: [2, 5], angle: 0, spread: Math.PI, gravity: 0.2, size: 3, life: [14, 26] });
    h.camera(1.36, c.x - 10, c.y, 10, true);
  });
  hitFx(h, tl, CRACK, c, P_CRAB, 22, [0xFFFFFF, 0xFFEDD5, 0xEA580C]);
  backstep(h, tl, CRACK + 10, CRACK + 26, 14);
  tl.end(CRACK + 28);
}

/** A tapered scaled tail from (x0, y0) sweeping through angle `a` with length `len`. */
function lizardTail(g: Graphics, x0: number, y0: number, a: number, len: number, curl: number, alpha = 1) {
  const pts: P[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const ang = a + curl * t * t;
    const prev = pts[i - 1] ?? { x: x0, y: y0 };
    pts.push(i === 0 ? { x: x0, y: y0 } : { x: prev.x + Math.cos(ang) * len / 10, y: prev.y + Math.sin(ang) * len / 10 });
  }
  for (const [extra, color] of [[3, INK], [0, 0x059669]] as const) {
    for (let i = 1; i <= 10; i++) {
      g.moveTo(pts[i - 1].x, pts[i - 1].y).lineTo(pts[i].x, pts[i].y).stroke({ width: (15 * (1 - i / 11) + 2) + extra, color, alpha, cap: 'round' });
    }
  }
  for (let i = 1; i < 9; i += 2) g.circle(pts[i].x, pts[i].y - 1, 1.5).fill({ color: 0xD1FAE5, alpha });
}

/** Tail Sweep: balanced on one leg he spins, a lizard's tail lashing out low through the front foe into the one behind. */
function tailSweep(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const t0 = foes[0];
  const SPIN = 12;
  const SWEEP = 20;
  tl.at(0, () => {
    h.anim('RUN', true);
    h.sound('hiss', { vol: 0.5 });
    h.camera(1.16, between(h, t0, 0.55).x, h.home.y - 30, 10);
  });
  travel(h, tl, 0, SPIN, HOME, strikeSpot(h, t0, 62), easeInOut);
  tl.at(SPIN, () => {
    h.slashTrail(false);
    h.anim('ATTACK4');
    h.stretch(0.9, 1.1); // up on one leg
    h.sound('spin', { vol: 0.8 });
    h.camera(1.4, h.pos().x + 10, h.pos().y - 18, 6, true);
  });
  tl.every(SPIN, SWEEP + 8, 3, (i) => h.face(i % 2 === 1));
  tl.at(SWEEP + 8, () => {
    h.face(false);
    h.stretch(1, 1);
  });
  // The tail sweeps from behind him round and across the line, low to the ground
  const reach = Math.max(...foes.map((t) => t.x)) + 20;
  drawSpan(h, tl, SPIN + 2, SWEEP + 12, (g, _t, f) => {
    const p = h.pos();
    const k = Math.min(1, f / (SWEEP - SPIN));
    const fadeA = f > SWEEP - SPIN + 2 ? 1 - (f - (SWEEP - SPIN + 2)) / 8 : 1;
    const len = lerp(20, reach - p.x, easeOut(k));
    lizardTail(g, p.x - 2, p.y - 14, lerp(Math.PI * 1.05, 0.08, easeOut(k)), len, 0.3 * (1 - k), fadeA);
  });
  tl.at(SWEEP - 3, () => {
    h.sound('lash', { vol: 1 });
    h.camera(1.06, (t0.x + reach) / 2 - 20, h.home.y - 26, 12);
  });
  foes.forEach((t, i) => {
    const at = SWEEP + i * 2;
    tl.at(at, () => {
      land(h, i, { scale: i ? 0.9 : 1.1, tint: 0xA7F3D0, sfx: 'lash' });
      h.knock(i, 20, 8);
      dust(h, { x: t.x, y: t.y }, 6, 1);
      if (i === foes.length - 1) h.camera(1.32, t.x - 8, t.y - t.height * 0.5, 10, true);
    });
  });
  backstep(h, tl, SWEEP + 14, SWEEP + 30, 14);
  tl.end(SWEEP + 32);
}


// =============================================================================================
// EPIC

/** Berserker Rush: a war cry in close-up, then three wild chops on random foes, each faster and heavier than the last. */
function berserkerRush(h: KnightMoveHost, tl: Timeline) {
  const hits = h.targets.length ? [...h.targets] : [h.target, h.target, h.target];
  const CRY = 24;
  const GAPS = [16, 13, 10]; // accelerating
  tl.at(0, () => {
    h.anim('BUFF');
    h.sound('roar', { vol: 1, rate: 0.95 });
    h.camera(1.56, h.home.x + 6, h.home.y - 38, CRY, true);
  });
  dimSpan(h, tl, 0, CRY + 54, 0.34, 0x1A0000, 10);
  tintRamp(h, tl, 0, CRY, 0xFFFFFF, 0xFF8A8A);
  tl.every(0, CRY, 2, () => h.offset(rand(-1.2, 1.2), 0));
  drawSpan(h, tl, 2, CRY, (g, t) => {
    const p = kChest(h);
    for (let k = 0; k < 3; k++) rightRings(g, p.x + 4, p.y - 18, 8 + ((t * 90 + k * 18) % 60), 0xF87171, 1 - t * 0.5);
  });
  tl.every(0, CRY, 3, () => smoke(h, { x: h.pos().x + rand(-8, 8), y: h.pos().y - 40 }, 2, [0x7F1D1D, 0xDC2626, 0x450A0A]));
  tl.at(6, () => h.shake(6));
  let at = CRY;
  hits.slice(0, 3).forEach((t, k) => {
    const c = chest(t);
    const start = at;
    const chop = start + GAPS[k] - 2;
    at += GAPS[k];
    tl.at(start, () => {
      h.anim('DASH');
      h.sound('dash', { vol: 0.6, rate: 1 + k * 0.15 });
    });
    travel(h, tl, start, chop - 4, k === 0 ? HOME : here(h), strikeSpot(h, t, 52), easeIn);
    ghostTrail(h, tl, start, chop - 4, 0xDC2626, 1, 0.4);
    tl.at(chop - 6, () => {
      h.anim('SKILL1');
      swingSound(h, true);
    });
    slashFx(h, tl, chop - 1, { x: c.x - 6, y: c.y - 6, r: 30 + k * 4, a0: -2.6, a1: 0.9, thick: 9 + k * 2, p: P_RAGE });
    hitFx(h, tl, chop, c, P_RAGE, 16 + k * 4, [0xFFFFFF, 0xFEE2E2, 0xDC2626]);
    tl.at(chop, () => {
      if (k < h.targets.length) land(h, k, { scale: 0.9 + k * 0.22, tint: 0xFCA5A5, flash: 0xFEE2E2, burst: k === 2 ? 'slash' : undefined, burstSize: 1.1 });
      h.knock(k, 10 + k * 6, k === 2 ? 10 : 2);
      h.camera(1.3 + k * 0.12, c.x - 12, c.y, 8, true);
      h.sound('growl', { vol: 0.5, rate: 1.2 + k * 0.1 });
      if (k === 2) {
        h.hitStop(10);
        h.flash(0.5, 0xFFFFFF);
      }
    });
  });
  tl.at(at + 4, () => {
    h.anim('JUMP_BACK_START');
    h.sound('jump', { vol: 0.6 });
  });
  travel(h, tl, at + 4, at + 24, here(h), HOME, easeInOut);
  tl.during(at + 4, at + 24, (t) => h.lift(arc(t) * 28));
  ghostTrail(h, tl, at + 4, at + 24, 0xDC2626, 2, 0.3);
  tl.at(at + 18, () => h.anim('JUMP_BACK_END'));
  tl.at(at + 24, () => {
    h.lift(0);
    h.tint(0xFFFFFF);
    h.sound('thud', { vol: 0.5 });
  });
  tl.end(at + 28);
}

/** Spectral stag (faces right), `rear` 0 standing → 1 rearing up on its hind legs. */
function stag(g: Graphics, x: number, gy: number, s: number, rear: number, f: number, alpha = 1) {
  const hip = { x: x - 10 * s, y: gy - 18 * s };
  const R = (px: number, py: number) => rot(px, py, hip.x, hip.y, -rear * 0.7);
  const body = [[-14, -18], [-4, -24], [12, -24], [18, -18], [14, -12], [-12, -12]].map(([dx, dy]) => R(x + dx * s, gy + dy * s));
  const fill = { color: 0xC7D2FE, alpha: 0.35 * alpha };
  const edge = { width: 1.5, color: 0xEEF2FF, alpha: 0.9 * alpha };
  // Legs: hind legs planted, forelegs lift as it rears
  for (const [lx, phase] of [[-11, 0], [-7, 1]] as const) {
    const [ax, ay] = R(x + lx * s, gy - 14 * s);
    g.moveTo(ax, ay).lineTo(x + (lx - 1) * s, gy - 6 * s).lineTo(x + lx * s + phase, gy).stroke(edge);
  }
  for (const [lx, phase] of [[10, 0], [14, 1]] as const) {
    const [ax, ay] = R(x + lx * s, gy - 14 * s);
    const kick = rear * (6 + phase * 3) * s;
    g.moveTo(ax, ay).lineTo(ax + 2 * s, ay + 7 * s - kick * 0.4).lineTo(ax + (1 + rear * 4) * s, ay + 13 * s - kick).stroke(edge);
  }
  g.poly(body.flat()).fill(fill).stroke(edge);
  // Neck, head, antlers
  const [nx, ny] = R(x + 14 * s, gy - 22 * s);
  const [hx, hy] = R(x + 20 * s, gy - 34 * s);
  g.moveTo(nx, ny).lineTo(hx, hy).stroke({ width: 5 * s, color: 0xC7D2FE, alpha: 0.4 * alpha });
  g.ellipse(hx + 3 * s, hy, 5 * s, 3 * s).fill(fill).stroke(edge);
  g.rect(hx + 3 * s, hy - 1, 2, 2).fill({ color: 0xFFFFFF, alpha });
  for (const side of [-1, 1]) {
    const bx = hx - 1 * s;
    const by = hy - 3 * s;
    const tx = bx + side * 4 * s - 4 * s;
    const ty = by - 14 * s;
    g.moveTo(bx, by).lineTo(tx, ty).stroke(edge);
    for (let k = 1; k <= 3; k++) {
      const t = k / 4;
      const px = lerp(bx, tx, t);
      const py = lerp(by, ty, t);
      g.moveTo(px, py).lineTo(px + (side * 3 + 3) * s * (1 - t * 0.4), py - 4 * s).stroke(edge);
    }
  }
  // Glimmering motes clinging to it
  for (let k = 0; k < 6; k++) {
    const a = f * 0.1 + k;
    g.rect(x + Math.cos(a) * 16 * s - 1, gy - 20 * s + Math.sin(a * 1.3) * 10 * s - 1, 2, 2).fill({ color: 0xFFFFFF, alpha: 0.6 * alpha });
  }
}

/** Moonlit Leap: night falls, a ghostly stag rears behind him; he springs off its antlers over the line onto the back foe. */
function moonlitLeap(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target; // BACK
  const c = chest(t0);
  const STEP = 8;
  const VAULT = 26;
  const LAND = VAULT + 20;
  const stagX = () => h.home.x + 6;
  const launch = { x: 26, y: 0 };
  const landAt = { x: t0.x - 14 - h.home.x, y: 0 };
  tl.at(0, () => {
    h.anim('DEFENSE');
    h.camera(1.3, h.home.x + 10, h.home.y - 34, STEP + 6);
    h.sound('magic', { vol: 0.5, rate: 0.7 });
  });
  dimSpan(h, tl, 0, LAND + 14, 0.42, 0x070B24, 12);
  // A shaft of moonlight on the stag's spot
  drawSpan(h, tl, 2, VAULT + 8, (g, t) => {
    const a = arc(Math.min(1, t * 1.2)) * 0.5;
    g.poly([stagX() - 10, 0, stagX() + 16, 0, stagX() + 30, h.home.y, stagX() - 22, h.home.y]).fill({ color: 0xC7D2FE, alpha: 0.18 * a });
  }, 'back');
  // The stag rises behind him, rears, flings him
  drawSpan(h, tl, 4, VAULT + 14, (g, _t, f) => {
    const fr = f + 4;
    const appear = Math.min(1, f / 10);
    const rear = fr < VAULT - 6 ? 0 : fr < VAULT + 2 ? easeOut((fr - (VAULT - 6)) / 8) : 1;
    const out = fr > VAULT + 4 ? 1 - (fr - VAULT - 4) / 10 : 1;
    stag(g, stagX(), h.home.y, 1.5, rear, fr, appear * out);
  }, 'back');
  tl.at(6, () => h.sound('roar', { vol: 0.5, rate: 1.6 })); // a bellow
  tl.at(STEP, () => {
    h.anim('DASH');
    h.sound('step', { vol: 0.6 });
  });
  travel(h, tl, STEP, STEP + 8, HOME, launch, easeOut);
  tl.at(VAULT - 6, () => {
    h.anim('JUMP_FRONT_START');
    h.camera(1.02, (h.home.x + t0.x) / 2, h.home.y - 60, 30);
  });
  crouch(h, tl, VAULT - 6, VAULT, 0.12);
  tl.at(VAULT, () => {
    h.anim('JUMP_FRONT_UP');
    h.stretch(0.86, 1.18);
    h.sound('jump');
    h.sound('whoosh_heavy', { vol: 0.8, rate: 0.9 });
  });
  tl.during(VAULT, VAULT + 8, (t) => h.stretch(lerp(0.86, 1, t), lerp(1.18, 1, t)));
  travel(h, tl, VAULT, LAND, launch, landAt, easeInOut);
  tl.during(VAULT, LAND, (t) => h.lift(arc(t) * 38));
  ghostTrail(h, tl, VAULT, LAND, 0xC7D2FE, 2, 0.4);
  tl.every(VAULT, LAND, 2, () => h.emit(h.pos().x, h.pos().y - 20, { count: 1, colors: [0xFFFFFF, 0xC7D2FE], speed: [0.1, 0.4], angle: Math.PI / 2, spread: 1, gravity: 0.02, size: 2, life: [16, 24] }));
  tl.at(LAND - 8, () => h.anim('JUMP_FRONT_DOWN'));
  tl.at(LAND - 4, () => h.anim('SKILL1'));
  // Moon-pillar crash
  drawSpan(h, tl, LAND, LAND + 14, (g, t) => pillar(g, t0.x - 6, 0, t0.y, 26 * (1 - t) + 4, P_MOON, 1 - t));
  hitFx(h, tl, LAND, c, P_MOON, 22, [0xFFFFFF, 0xC7D2FE, 0x818CF8]);
  tl.at(LAND, () => {
    h.lift(0);
    h.stretch(1.2, 0.84);
    land(h, 0, { scale: 1.3, tint: 0xE0E7FF, flash: 0xEEF2FF, sfx: 'stomp' });
    h.knock(0, 8, 0);
    h.vfx('summon', t0.x, t0.y, { anim: 'animation2', size: 0.9, squash: 0.4, layer: 'ground', tint: 0xC7D2FE });
    h.camera(1.55, t0.x - 10, c.y, 14, true);
    dust(h, { x: t0.x, y: t0.y }, 10, -1);
    dust(h, { x: t0.x, y: t0.y }, 10, 1);
  });
  ringFx(h, tl, LAND, () => ({ x: t0.x, y: t0.y }), 6, 70, 0xC7D2FE, 18, 3);
  tl.during(LAND, LAND + 8, (t) => h.stretch(lerp(1.2, 1, t), lerp(0.84, 1, t)));
  dizzy(h, tl, LAND + 4, t0, 60);
  // A long bounding hop home over the line
  tl.at(LAND + 14, () => {
    h.anim('JUMP_BACK_START');
    h.sound('jump', { vol: 0.6 });
    h.camera(1.04, (h.home.x + t0.x) / 2, h.home.y - 44, 22);
  });
  travel(h, tl, LAND + 14, LAND + 36, here(h), HOME, easeInOut);
  tl.during(LAND + 14, LAND + 36, (t) => h.lift(arc(t) * 34));
  tl.at(LAND + 30, () => h.anim('JUMP_BACK_END'));
  tl.at(LAND + 36, () => {
    h.lift(0);
    h.sound('thud', { vol: 0.5 });
  });
  tl.end(LAND + 40);
}

/** Stone Skin: he turns to a gargoyle statue (sparks ping off it), then bursts out of the stone shoulder-first. */
function stoneSkin(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const SET = 16;
  const BURST = 44;
  const BASH = BURST + 10;
  tl.at(0, () => {
    h.anim('DEFENSE');
    h.camera(1.44, h.home.x + 8, h.home.y - 30, BURST);
    h.sound('rock', { vol: 0.6, rate: 0.6 });
  });
  tintRamp(h, tl, 0, SET, 0xFFFFFF, 0x8F8A85);
  // Stone creeps up from his feet: a blotchy granite shell over his silhouette, cracks running through it
  const blotches = Array.from({ length: 22 }, () => ({ dx: rand(-13, 15), dy: rand(2, 58), r: rand(4, 8), c: STONE[Math.floor(rand(0, 3.99))] }));
  drawSpan(h, tl, 0, BURST, (g, _t, f) => {
    const p = h.pos();
    const up = Math.min(1, f / SET);
    const top = 60 * up;
    g.ellipse(p.x, p.y, 18, 5).fill({ color: 0x44403C, alpha: 0.7 * up }); // pedestal
    for (const b of blotches) {
      if (b.dy > top) continue;
      g.circle(p.x + b.dx, p.y - b.dy, b.r).fill({ color: b.c, alpha: 0.85 });
    }
    for (const [x0, y0, x1, y1] of [[-6, 10, 4, 24], [4, 24, -2, 36], [8, 30, 12, 44], [-8, 40, 2, 52]]) {
      if (y1 > top) continue;
      g.moveTo(p.x + x0, p.y - y0).lineTo(p.x + x1, p.y - y1).stroke({ width: 1, color: 0x1C1917, alpha: 0.9 });
    }
    if (up < 1) g.moveTo(p.x - 14, p.y - top).lineTo(p.x + 16, p.y - top).stroke({ width: 2, color: 0xE7E5E4, alpha: 0.8 }); // the creeping edge
  });
  tl.every(2, SET, 4, (i) => h.sound('crack', { vol: 0.3, rate: 0.7 + i * 0.1 }));
  tl.at(SET, () => {
    h.animSpeed(0); // frozen statue
    h.sound('stomp', { vol: 0.6, rate: 0.7 });
    h.shake(3);
  });
  // Statue beat: things glance off the stone with sparks and clinks; the camera creeps in
  tl.every(SET + 4, BURST - 4, 5, (i) => {
    const p = h.pos();
    h.sparks(p.x + rand(-10, 14), p.y - rand(10, 50), 5, [0xFFFFFF, 0xFDE68A, 0xA8A29E]);
    h.sound('block', { vol: 0.35, rate: 1.4 + (i % 3) * 0.15 });
  });
  tl.at(SET + 10, () => h.camera(1.56, h.home.x + 6, h.home.y - 30, BURST - SET));
  // Burst: the crust explodes off him
  tl.at(BURST, () => {
    h.animSpeed(1);
    h.tint(0xFFFFFF);
    h.anim('DASH');
    h.flash(0.4, 0xFFFFFF);
    h.shake(9);
    h.sound('explosion', { vol: 0.4, rate: 1.4 });
    h.sound('rock', { vol: 0.9 });
    const p = h.pos();
    h.emit(p.x, p.y - 26, { count: 30, colors: STONE, speed: [2, 5.5], angle: -Math.PI / 2, spread: Math.PI, gravity: 0.25, size: 3, life: [16, 30] });
    h.camera(1.18, between(h, t0, 0.6).x, c.y, 10, true);
  });
  travel(h, tl, BURST, BASH, HOME, strikeSpot(h, t0, 48), easeIn);
  ghostTrail(h, tl, BURST, BASH, 0xA8A29E, 1, 0.4);
  hitFx(h, tl, BASH, { x: c.x - 10, y: c.y }, P_GRANITE, 20, [0xFFFFFF, 0xE7E5E4, 0xA8A29E]);
  tl.at(BASH, () => {
    land(h, 0, { scale: 1.2, tint: 0xE7E5E4, sfx: 'rock' });
    h.knock(0, 24, 6);
    h.camera(1.5, c.x - 14, c.y, 12, true);
    debris(h, { x: c.x, y: c.y }, 12, STONE);
  });
  tl.at(BASH + 10, () => h.anim('DASH_BACK'));
  travel(h, tl, BASH + 10, BASH + 26, here(h), HOME, easeInOut);
  tl.at(BASH + 26, () => {
    h.anim('DEFENSE');
    h.guard(h.ctx.color);
    h.sound('ward', { vol: 0.6, rate: 0.8 });
  });
  tl.end(BASH + 32);
}

/** Black Riposte: guard up, he dissolves into shadow, steps out behind the foe and sheathes; a beat later the cut lands. */
function blackRiposte(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const STEP = 14;
  const OUT = STEP + 4;
  const CUT = OUT + 4;
  const POP = CUT + 16; // the delayed hit
  const behind = { x: t0.x + 30 - h.home.x, y: t0.y - h.home.y };
  const SHADOW = [0x1E1B4B, 0x4C1D95, 0x0B0218, 0x7C3AED];
  tl.at(0, () => {
    h.anim('DEFENSE');
    h.camera(1.46, h.home.x + 8, h.home.y - 30, STEP);
    h.sound('dark', { vol: 0.6 });
  });
  dimSpan(h, tl, 0, POP + 10, 0.4, 0x0B0218, 8);
  // A glint along the shield edge
  drawSpan(h, tl, 4, STEP, (g, t) => {
    const p = { x: h.pos().x + 14, y: h.pos().y - 46 + t * 30 };
    starburst(g, p.x, p.y, 4 + 3 * arc(t), 4, t, P_SHADE, arc(t));
  });
  tl.at(6, () => h.sound('equip', { vol: 0.4, rate: 1.8 }));
  // Shadow step: dissolve, a black streak, reappear behind
  tl.at(STEP, () => {
    poof(h, h.pos(), SHADOW, 18);
    h.alpha(0);
    h.sound('whoosh_fast', { vol: 0.9 });
  });
  drawSpan(h, tl, STEP, OUT + 6, (g, t) => {
    const x0 = h.home.x + 4;
    const x1 = t0.x + 30;
    const y = h.home.y - 24;
    const head = lerp(x0, x1, easeOut(Math.min(1, t * 2)));
    const tail = lerp(x0, x1, easeIn(t));
    g.moveTo(tail, y).lineTo(head, y).stroke({ width: 5, color: 0x0B0218, alpha: 0.9 }).moveTo(tail, y).lineTo(head, y).stroke({ width: 1.5, color: 0xC4B5FD });
  });
  tl.at(OUT, () => {
    h.offset(behind.x, behind.y);
    h.face(true);
    h.alpha(1);
    poof(h, h.pos(), SHADOW, 12);
    h.slashTrail(false);
    h.anim('ATTACK1');
    h.camera(1.5, t0.x + 14, c.y - 4, 14, true); // reverse angle, behind the foe
  });
  tl.at(CUT - 2, () => h.sound('slash_heavy', { vol: 0.8 }));
  // The cut: a razor line across its back... then he turns away and sheathes
  drawSpan(h, tl, CUT, POP + 8, (g, _t, f) => {
    const k = Math.min(1, f / 3);
    const a = f > POP - CUT ? 1 - (f - (POP - CUT)) / 8 : 1;
    const x0 = c.x + 18;
    const y0 = c.y - 16;
    const x1 = lerp(x0, c.x - 18, k);
    const y1 = lerp(y0, c.y + 14, k);
    const w = f > POP - CUT ? 6 : 2;
    g.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: w + 3, color: 0x0B0218, alpha: 0.8 * a }).moveTo(x0, y0).lineTo(x1, y1).stroke({ width: w, color: 0xEDE9FE, alpha: a });
      });
  tl.at(CUT + 6, () => {
    h.anim('DEFENSE'); // already done
    h.sound('equip', { vol: 0.6, rate: 0.9 }); // sheathe click
    h.camera(1.62, t0.x + 6, c.y - 6, POP - CUT);
  });
  tl.at(POP, () => {
    land(h, 0, { scale: 1.35, tint: 0xC4B5FD, flash: 0xEDE9FE, sfx: 'slash_heavy', spark: 0x7C3AED });
    h.vfx('slash', c.x, c.y, { size: 1.1, tint: 0xC4B5FD, flipX: true, life: 16 });
    h.knock(0, -12, 4);
    h.camera(1.4, c.x, c.y, 12, true);
    h.emit(c.x, c.y, { count: 18, colors: SHADOW, speed: [1.5, 4], angle: Math.PI, spread: 1.2, gravity: 0.05, size: 3, life: [14, 26] });
  });
  hitFx(h, tl, POP, c, P_SHADE, 20, [0xFFFFFF, 0xEDE9FE, 0x7C3AED]);
  dizzy(h, tl, POP + 2, t0, 60);
  // Step back through the shadows to his post
  tl.at(POP + 10, () => {
    poof(h, h.pos(), SHADOW, 14);
    h.alpha(0);
    h.sound('whoosh_fast', { vol: 0.6, rate: 0.8 });
  });
  tl.at(POP + 16, () => {
    h.offset(0, 0);
    h.face(false);
    h.alpha(1);
    poof(h, h.pos(), SHADOW, 12);
    h.anim('DEFENSE');
    h.guard(h.ctx.color);
    h.camera(1.14, h.home.x + 40, h.home.y - 30, 12);
  });
  tl.end(POP + 22);
}

/** Life Leech: a blood tether hooks the foe; each row hauls a pulse of its life down the line into him. */
function lifeLeech(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const HOOK = 12;
  const ROWS = [18, 28, 38];
  const YANK = 50;
  const from = () => h.weaponTip();
  const curve = (t: number, f: number): P => {
    const a = from();
    return { x: lerp(a.x, c.x, t), y: lerp(a.y, c.y, t) - arc(t) * 10 + Math.sin(t * 12 - f * 0.4) * 3 * arc(t) };
  };
  tl.at(0, () => {
    h.anim('ATTACK5');
    h.sound('dark', { vol: 0.5, rate: 1.3 });
    h.camera(1.22, between(h, t0, 0.5).x, c.y - 4, HOOK + 10);
  });
  dimSpan(h, tl, 0, YANK + 10, 0.36, 0x1A0005, 8);
  // The tether shoots out and hooks in
  drawSpan(h, tl, 4, YANK + 2, (g, _t, f) => {
    const reach = Math.min(1, f / (HOOK - 4));
    const n = 16;
    for (const [w, color, al] of [[4, 0x3F0412, 0.9], [2, 0xBE123C, 1], [0.8, 0xFFE4E6, 0.8]] as const) {
      let p = curve(0, f);
      g.moveTo(p.x, p.y);
      for (let i = 1; i <= n * reach; i++) {
        p = curve(i / n, f);
        g.lineTo(p.x, p.y);
      }
      g.stroke({ width: w, color, alpha: al });
    }
  });
  tl.at(4, () => h.sound('whoosh_fast', { vol: 0.6 }));
  tl.at(HOOK, () => {
    h.sound('stab', { vol: 0.6 });
    h.flashTarget(0, 0xFDA4AF, 6);
    h.sparks(c.x, c.y, 8, [0xFFE4E6, 0xBE123C]);
  });
  // Rows: pull back, a pulse of life slides down the tether into the knight
  const pulses: number[] = [];
  ROWS.forEach((at, k) => {
    tl.at(at, () => {
      h.anim('ATTACK5');
      h.offset(-6, 0);
      h.sound('squelch', { vol: 0.5, rate: 1 + k * 0.15 });
      h.flashTarget(0, 0xFDA4AF, 6);
      h.knock(0, -4);
      h.camera(1.3 + k * 0.06, between(h, t0, 0.5).x, c.y, 8);
      pulses.push(tl.frame);
    });
    tl.during(at, at + 8, (t) => h.offset(lerp(-6, 0, t), 0));
  });
  drawSpan(h, tl, ROWS[0], YANK + 14, (g, _t, f) => {
    for (const start of pulses) {
      const k = (tl.frame - start) / 14;
      if (k < 0 || k > 1) continue;
      const p = curve(1 - easeIn(k), f);
      orb(g, p.x, p.y, 3.5, P_BLOOD, 1);
    }
  });
  tl.every(ROWS[0], YANK, 4, () => h.emit(c.x, c.y, { count: 2, colors: [0xBE123C, 0xFDA4AF], speed: [0.3, 1], angle: Math.PI, spread: 0.6, gravity: 0, size: 2, life: [10, 16] }));
  // The yank: the tether snaps taut, damage lands, the stolen life floods into him
  tl.at(YANK - 4, () => {
    h.anim('ATTACK5');
    h.sound('whoosh_heavy', { vol: 0.8 });
  });
  hitFx(h, tl, YANK, c, P_BLOOD, 18, [0xFFFFFF, 0xFFE4E6, 0xBE123C]);
  tl.at(YANK, () => {
    land(h, 0, { scale: 1.2, tint: 0xFDA4AF, flash: 0xFFE4E6, sfx: 'chomp' });
    h.knock(0, -14, 4);
    h.emit(c.x, c.y, { count: 20, colors: [0xBE123C, 0xFDA4AF, 0x3F0412], speed: [1.5, 3.5], angle: Math.PI, spread: 1, gravity: 0.1, size: 2, life: [14, 22] });
    h.camera(1.48, c.x - 10, c.y, 8, true);
  });
  tl.at(YANK + 10, () => {
    h.tint(0xFFB4C0);
    h.anim('BUFF');
    h.guard(h.ctx.color);
    h.sound('heal', { vol: 0.6 });
    h.camera(1.5, h.home.x + 6, h.home.y - 30, 14, true); // reverse to him drinking it in
    h.emit(h.pos().x, h.pos().y - 24, { count: 16, colors: [0xBE123C, 0xFDA4AF, 0xFFFFFF], speed: [0.4, 1.4], angle: -Math.PI / 2, spread: 1, gravity: -0.03, size: 2, life: [18, 30] });
  });
  tl.at(YANK + 24, () => h.tint(0xFFFFFF));
  tl.end(YANK + 28);
}

/** Spectral bear standing up behind the knight: `rise` 0-1 grows it from the ground, `swipe` 0-1 brings the arms down. */
function spectralBear(g: Graphics, x: number, gy: number, s: number, rise: number, swipe: number, alpha = 1) {
  if (rise <= 0.02) return;
  const hgt = 80 * s * rise;
  const top = gy - hgt;
  const fill = { color: 0x92400E, alpha: 0.35 * alpha };
  const edge = { width: 2, color: 0xFDE68A, alpha: 0.85 * alpha };
  g.ellipse(x, gy - hgt * 0.42, 22 * s, hgt * 0.42).fill(fill).stroke(edge);
  g.circle(x + 4 * s, top + 12 * s, 13 * s).fill(fill).stroke(edge);
  for (const ex of [-7, 13]) g.circle(x + ex * s, top + 1 * s, 4.5 * s).fill(fill).stroke(edge);
  g.ellipse(x + 13 * s, top + 16 * s, 6 * s, 4 * s).fill(fill).stroke(edge);
  for (const ex of [0, 8]) g.rect(x + ex * s, top + 8 * s, 2, 2).fill({ color: 0xFDE68A, alpha });
  // Arms: raised high, then raking down and forward
  for (const side of [-1, 1]) {
    const sx = x + side * 14 * s;
    const sy = gy - hgt * 0.68;
    const a = lerp(-Math.PI / 2 - side * 0.5, 0.35, easeIn(swipe));
    const ex = sx + Math.cos(a) * 30 * s;
    const ey = sy + Math.sin(a) * 30 * s;
    g.moveTo(sx, sy).lineTo(ex, ey).stroke({ width: 9 * s, color: 0x92400E, alpha: 0.4 * alpha });
    g.moveTo(sx, sy).lineTo(ex, ey).stroke(edge);
    for (let k = -1; k <= 1; k++) {
      const ca = a + k * 0.3;
      g.moveTo(ex, ey).lineTo(ex + Math.cos(ca + 0.6) * 8 * s, ey + Math.sin(ca + 0.6) * 8 * s).stroke({ width: 1.5, color: 0xFFFBEA, alpha });
    }
  }
}

/** Grizzly Maul: he rears up as a great spirit bear rises behind him, both crash down, claws raking the foe. */
function grizzlyMaul(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const REAR = 12;
  const MAUL = 36;
  const spot = strikeSpot(h, t0, 54);
  const bearX = () => h.pos().x - 18;
  tl.at(0, () => {
    h.anim('RUN', true);
    h.sound('growl', { vol: 0.7 });
    h.camera(1.16, between(h, t0, 0.55).x, c.y, 12);
  });
  travel(h, tl, 0, REAR, HOME, spot, easeIn);
  tl.every(0, REAR, 4, () => dust(h, h.pos(), 3, -1));
  tl.at(REAR, () => {
    h.anim('SKILL2TULUC');
    h.stretch(0.86, 1.2);
    h.sound('roar', { vol: 1, rate: 0.8 });
    h.camera(1.02, (h.home.x + t0.x) / 2 + 20, h.home.y - 56, MAUL - REAR); // wide and up: the bear towers over the foe
  });
  tl.during(REAR, REAR + 10, (t) => h.stretch(lerp(0.86, 1, t), lerp(1.2, 1, t)));
  dimSpan(h, tl, REAR, MAUL + 16, 0.3, 0x1C0A02, 8);
  drawSpan(h, tl, REAR, MAUL + 18, (g, _t, f) => {
    const fr = f + REAR;
    const rise = easeOut(Math.min(1, f / 12));
    const swipe = fr < MAUL - 6 ? 0 : Math.min(1, (fr - (MAUL - 6)) / 6);
    const out = fr > MAUL + 6 ? 1 - (fr - MAUL - 6) / 12 : 1;
    spectralBear(g, bearX(), h.home.y, 1.15, rise, swipe, out);
  }, 'back');
  drawSpan(h, tl, REAR + 2, REAR + 18, (g, t) => {
    const p = { x: bearX() + 10, y: h.home.y - 82 };
    for (let k = 0; k < 3; k++) rightRings(g, p.x, p.y, 10 + ((t * 80 + k * 20) % 60), 0xFDE68A, 1 - t);
  });
  tl.at(REAR + 4, () => h.shake(5));
  tl.at(MAUL - 6, () => {
    h.anim('SKILL1');
    swingSound(h, true);
  });
  drawSpan(h, tl, MAUL, MAUL + 10, (g, t) => {
    const a = 1 - t;
    clawRake(g, c.x - 6, c.y - 2, 1, 30, 0xFDE68A);
    clawRake(g, c.x + 2, c.y + 2, -1, 26, 0xF59E0B);
    g.circle(c.x, c.y, 2).fill({ color: 0xFFFFFF, alpha: a });
  });
  hitFx(h, tl, MAUL, c, P_BEAR, 24, [0xFFFFFF, 0xFDE68A, 0x92400E]);
  tl.at(MAUL, () => {
    land(h, 0, { scale: 1.4, tint: 0xFDE68A, sfx: 'claw' });
    h.knock(0, 14, 0);
    h.camera(1.58, c.x - 10, c.y + 4, 14, true);
    dust(h, { x: t0.x, y: t0.y }, 12, -1);
    dust(h, { x: t0.x, y: t0.y }, 12, 1);
    debris(h, { x: t0.x - 6, y: t0.y }, 10);
  });
  crackFx(h, tl, MAUL, { x: t0.x - 40, y: t0.y + 1 }, { x: t0.x + 30, y: t0.y }, pal(0x57534E, 0xA8A29E, 0x1C1917), 6, 40);
  dizzy(h, tl, MAUL + 4, t0, 90);
  backstep(h, tl, MAUL + 14, MAUL + 30, 14);
  tl.end(MAUL + 32);
}

/**
 * Phantom Cavalry: the bell snatched high as a signal; a ghost-fire portal tears open at the edge of the field
 * and a spectral lancer on a skull-faced warhorse (pixel sprite, phantomSteed.ts) bursts out rearing, then
 * thunders through the whole line, the camera riding alongside.
 */
function phantomCavalry(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const gy = h.home.y;
  const SIGNAL = 16;
  const EMERGE = SIGNAL + 10;
  const SLAM = EMERGE + 16;
  const RIDE = SLAM + 4;
  const RIDE_END = RIDE + 32;
  const END = RIDE_END + 18;
  const portalX = 28;
  const x0 = portalX + 4; // hind hooves at the portal
  const x1 = 520;
  const tipDX = STEED_TIP.x + STEED_CX - 20; // lance tip ahead of the hind-hoof anchor
  // Accelerating charge: a strong start that keeps building speed
  const horseX = (fr: number) => {
    const k = Math.min(1, Math.max(0, (fr - RIDE) / (RIDE_END - RIDE)));
    return lerp(x0, x1, 0.65 * k + 0.35 * k * k);
  };
  let textures: Texture[] = [];
  let rig: Container | null = null;
  let steed: Sprite | null = null;
  const ghosts: Sprite[] = [];
  const hoofprints: { x: number; at: number }[] = [];
  const anchor = { x: 20 / STEED_W, y: STEED_GROUND / STEED_H };

  // The signal
  tl.at(0, () => {
    h.anim('SKILL2TULUC');
    h.camera(1.36, h.home.x + 8, h.home.y - 30, SIGNAL);
    h.sound('charge', { vol: 0.6 });
    textures = buildSteed();
  });
  tl.at(11, () => h.animSpeed(0));
  chargeFx(h, tl, 0, SIGNAL, () => h.weaponTip(), P_PHANTOM, 34, 12);
  tl.at(SIGNAL, () => {
    const p = h.weaponTip();
    h.flash(0.35, 0xDBEAFE);
    h.sound('wail', { vol: 0.7, rate: 0.6 });
    h.sound('portal', { vol: 0.6, rate: 0.8 });
    h.emit(p.x, p.y, { count: 20, colors: [0xFFFFFF, 0x93C5FD, 0xDBEAFE], speed: [1, 3], angle: -Math.PI / 2, spread: 0.6, gravity: -0.02, size: 2, life: [18, 30] });
    h.camera(1.22, portalX + 50, gy - 34, EMERGE - SIGNAL + 14); // cut to the portal
  });
  dimSpan(h, tl, SIGNAL, END - 4, 0.45, 0x020617, 8);

  // The portal: a ring of ghost fire tears open, swirling, and collapses once the rider is through
  drawSpan(h, tl, SIGNAL, RIDE + 14, (g, _t, f) => {
    const fr = f + SIGNAL;
    const open = fr < RIDE ? easeOut(Math.min(1, f / 8)) : 1 - easeIn(Math.min(1, (fr - RIDE) / 14));
    if (open <= 0.02) return;
    const cx = portalX;
    const cy = gy - 28;
    const ry = 30 * open;
    const rx = 11 * open;
    g.ellipse(cx, cy, rx * 1.6, ry * 1.15).fill({ color: 0x1D4ED8, alpha: 0.12 * open });
    g.ellipse(cx, cy, rx, ry).fill({ color: 0x020617, alpha: 0.85 * open });
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * Math.PI * 2 + fr * 0.18;
      const r = 1 + 0.12 * Math.sin(fr * 0.5 + k * 1.7);
      const x = cx + Math.cos(a) * rx * r;
      const y = cy + Math.sin(a) * ry * r;
      g.rect(x - 1.5, y - 1.5, 3, 3).fill({ color: k % 3 ? 0x60A5FA : 0xE0F2FE, alpha: open });
      g.rect(x + Math.cos(a) * 3 - 1, y + Math.sin(a) * 3 - 1, 2, 2).fill({ color: 0x93C5FD, alpha: 0.6 * open });
    }
    g.ellipse(cx, cy, rx, ry).stroke({ width: 2, color: 0xBFDBFE, alpha: open });
  }, 'back');
  tl.every(SIGNAL, RIDE, 3, () => h.emit(portalX + rand(-6, 6), gy - rand(6, 50), { count: 2, colors: [0x93C5FD, 0xE0F2FE, 0x1D4ED8], speed: [0.4, 1.4], angle: rand(0, Math.PI * 2), spread: 0.4, gravity: -0.02, size: 2, life: [14, 24] }));

  // The steed: one sprite for the rider, three additive afterimages trailing it
  tl.at(EMERGE, () => {
    rig = h.container('fx');
    for (let k = 0; k < 3; k++) {
      const gs = new Sprite(textures[0]);
      gs.anchor.set(anchor.x, anchor.y);
      gs.blendMode = 'add';
      gs.tint = 0x3B82F6;
      gs.alpha = 0;
      rig.addChild(gs);
      ghosts.push(gs);
    }
    steed = new Sprite(textures[2]);
    steed.anchor.set(anchor.x, anchor.y);
    steed.position.set(x0, gy);
    rig.addChild(steed);
    h.sound('roar', { vol: 0.8, rate: 1.7 }); // the neigh
    h.sound('screech', { vol: 0.35, rate: 0.7 });
    h.flash(0.25, 0xBFDBFE);
  });
  // Rearing out of the portal: fades in, rotated back on its hind legs, front hooves pawing
  tl.during(EMERGE, SLAM, (t, f) => {
    if (!steed) return;
    const rear = t < 0.7 ? easeOut(t / 0.7) : 1 - easeIn((t - 0.7) / 0.3);
    steed.alpha = Math.min(1, t * 3);
    steed.rotation = -0.55 * rear;
    steed.texture = textures[f % 6 < 3 ? 1 : 2];
    steed.position.set(x0 + 6 * easeOut(t), gy);
  });
  tl.at(EMERGE + 6, () => h.camera(1.32, portalX + 46, gy - 44, 10));
  // Hooves crash down
  tl.at(SLAM, () => {
    if (steed) steed.rotation = 0;
    h.shake(9);
    h.sound('stomp', { vol: 1, rate: 0.8 });
    h.sound('impact_heavy', { vol: 0.6, rate: 0.7 });
    h.camera(1.1, portalX + 120, gy - 34, 10, true);
    for (const dir of [-1, 1]) h.emit(x0 + 30, gy - 2, { count: 10, colors: [0x93C5FD, 0x1E3A8A, 0x78716C], speed: [1, 3], angle: dir > 0 ? -0.3 : Math.PI + 0.3, spread: 0.5, gravity: 0.02, size: 3, life: [14, 24] });
  });
  ringFx(h, tl, SLAM, () => ({ x: x0 + 34, y: gy }), 6, 70, 0x93C5FD, 18, 3);

  // The charge
  tl.during(RIDE, END, (_t, f) => {
    if (!steed) return;
    const fr = f + RIDE;
    const x = horseX(fr);
    steed.position.set(x, gy);
    steed.texture = textures[Math.floor(f / 3) % 6];
    steed.alpha = fr > RIDE_END ? Math.max(0, 1 - (fr - RIDE_END) / 8) : 1;
    ghosts.forEach((gs, k) => {
      gs.texture = textures[(Math.floor(f / 3) + 5 - k) % 6];
      gs.position.set(horseX(fr - (k + 1) * 2), gy);
      gs.alpha = steed!.alpha * (0.45 - k * 0.12);
    });
  });
  // Spectral glow under the hooves
  drawSpan(h, tl, RIDE, RIDE_END + 6, (g, _t, f) => {
    const x = horseX(f + RIDE) + 18;
    g.ellipse(x, gy, 34, 5).fill({ color: 0x3B82F6, alpha: 0.25 });
    g.ellipse(x, gy, 20, 3).fill({ color: 0xBFDBFE, alpha: 0.25 });
  }, 'ground');
  // Camera rides alongside, then snaps onto the last foe struck
  tl.every(RIDE, RIDE_END - 6, 3, (i) => {
    const x = horseX(RIDE + i * 3) + 50;
    h.camera(1.18, x, gy - 34, 8);
  });
  tl.every(RIDE, RIDE_END, 3, (i) => {
    const fr = RIDE + i * 3;
    const x = horseX(fr) + 26;
    hoofprints.push({ x, at: fr });
    h.emit(x - 20, gy - 2, { count: 3, colors: [0x93C5FD, 0x1E3A8A, 0x78716C], speed: [0.6, 1.8], angle: Math.PI + 0.4, spread: 0.5, gravity: -0.01, size: 3, life: [12, 22] });
    h.sound('stomp', { vol: 0.45, rate: 1.1 + (i % 2) * 0.2 });
    h.shake(2);
  });
  tl.every(RIDE, RIDE_END, 2, () => {
    const x = horseX(tl.frame);
    h.emit(x + 2, gy - 26, { count: 2, colors: [0x60A5FA, 0x93C5FD, 0xE0F2FE], speed: [0.3, 1], angle: Math.PI, spread: 0.6, gravity: -0.03, size: 2, life: [10, 18] });
  });
  // Ghost-fire hoofprints left burning behind it
  drawSpan(h, tl, RIDE, END, (g) => {
    for (const hp of hoofprints) {
      const age = (tl.frame - hp.at) / 28;
      if (age < 0 || age > 1) continue;
      g.ellipse(hp.x, gy + 1, 4, 1.5).fill({ color: 0x60A5FA, alpha: 0.7 * (1 - age) });
      g.poly([hp.x - 2, gy, hp.x, gy - 6 * (1 - age), hp.x + 2, gy]).fill({ color: 0xBFDBFE, alpha: 0.7 * (1 - age) });
    }
  }, 'ground');
  tl.at(RIDE, () => {
    h.sound('roar', { vol: 0.5, rate: 0.6 });
    h.sound('whoosh_heavy', { vol: 0.7, rate: 0.7 });
  });
  // Each foe is run through as the lance tip reaches it
  const hitFrame = (tx: number) => {
    for (let fr = RIDE; fr <= RIDE_END; fr++) if (horseX(fr) + tipDX >= tx - 6) return fr;
    return RIDE_END;
  };
  foes.forEach((t, i) => {
    const at = hitFrame(t.x);
    hitFx(h, tl, at, chest(t), P_PHANTOM, 20, [0xFFFFFF, 0xDBEAFE, 0x60A5FA]);
    tl.at(at, () => {
      land(h, i, { scale: 1.1, tint: 0xBFDBFE, flash: 0xDBEAFE, sfx: 'stab' });
      h.knock(i, 22, 16);
      h.streaks(t.x, t.y - t.height * 0.5, 44, [0xBFDBFE, 0xFFFFFF]);
      h.vfx('hitSpark', t.x - 4, t.y - t.height * 0.5, { anim: '5_baoji', size: 1 });
      if (i === foes.length - 1) h.camera(1.34, t.x, t.y - t.height * 0.5, 14, true);
    });
    dizzy(h, tl, at + 4, t, 60);
  });
  tl.at(RIDE_END + 8, () => {
    h.animSpeed(1);
    h.idle();
    h.camera(1.06, h.home.x + 80, gy - 30, 14);
  });
  tl.at(END - 1, () => {
    rig?.destroy({ children: true });
    rig = null;
    steed = null;
    destroySteed(textures);
    textures = [];
  });
  tl.end(END);
}

// ---------------------------------------------------------------------------------------------

export const MONSTER_ART_MOVES: Record<string, KnightMove> = {
  art_echo_shriek: echoShriek,
  art_dirty_trick: dirtyTrick,
  art_rattle_back: rattleBack,
  art_wisp_lure: wispLure,
  art_banshee_step: bansheeStep,
  art_bone_volley: boneVolley,
  art_carapace_roll: carapaceRoll,
  art_undertow: undertow,
  art_tombstone_heave: tombstoneHeave,
  art_troll_blood: trollBlood,
  art_needle_burst: needleBurst,
  art_pincer_crack: pincerCrack,
  art_tail_sweep: tailSweep,
  art_berserker_rush: berserkerRush,
  art_moonlit_leap: moonlitLeap,
  art_stone_skin: stoneSkin,
  art_black_riposte: blackRiposte,
  art_life_leech: lifeLeech,
  art_grizzly_maul: grizzlyMaul,
  art_phantom_cavalry: phantomCavalry,
};
