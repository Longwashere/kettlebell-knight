/**
 * Starter card choreography: the plain-steel moves a new knight begins with (CARD_CATALOG `starter_*`).
 *
 * No elements: iron sparks, dust, thrown rocks, and the rig's built-in fire trail switched off
 * (`h.slashTrail(false)`). What sells them instead is cinematography: the camera starts tight on the knight
 * for the wind-up, rides the travel, cuts in hard (`snap`) on contact and pulls wide for group hits, plus
 * squash-and-stretch anticipation and honest hit-stop.
 *
 * Review with `npm run shot -- "encounter:wolf,boar" idle kfilm:starter_swing` (see knightMoves.ts). Keep apex shots
 * near zoom 1: the camera can't pan above the sky, so a leap framed tight clips the knight's raised bell.
 */
import { Timeline, lerp, easeIn, easeOut, easeInOut, arc, rand, DIRT } from './choreo';
import { pal, crescent, kettlebell } from './fxKit';
import * as K from './knightKit';
import type { Graphics } from 'pixi.js';
import type { KnightMove, KnightMoveHost, KnightTarget } from './knightKit';

const {
  each, strikeSpot, chest, land, travel, here, HOME, backstep,
  swingSound, drawSpan, slashFx, hitFx, ringFx, crackFx, debris, dust, projectile, P_STEEL,
} = K;
type P = K.P;

/** Bright iron for slash arcs and impact stars. */
const P_IRON = pal(0xCBD5E1, 0xFFFFFF, 0x0F172A);
const SPARKS = [0xFFFBEA, 0xE2E8F0, 0x94A3B8, 0xFDE68A];
const STONE = [0x57534E, 0x78716C, 0xA8A29E, 0x44403C];
/** Dark, unlit floor cracks (no glowing core). */
const P_CRACK = pal(0x57534E, 0xA8A29E, 0x1C1917);

/** Head of a target (dizzy stars, glance sparks). */
export const crown = (t: KnightTarget): P => ({ x: t.x - 2, y: t.y - t.height * 0.9 });
/** Point between the knight's home and a target, at chest height: the two-shot framing. */
export const between = (h: KnightMoveHost, t: KnightTarget, bias = 0.5): P => ({ x: lerp(h.home.x, t.x, bias), y: chest(t).y });

/** Squash into a crouch over [from, to] (anticipation); released with `release`. */
export function crouch(h: KnightMoveHost, tl: Timeline, from: number, to: number, amount = 0.1) {
  tl.during(from, to, (t) => h.stretch(1 + amount * easeOut(t), 1 - amount * easeOut(t)));
}
/** Spring out of a crouch: stretch tall, then settle to 1 over a few frames. */
export function release(h: KnightMoveHost, tl: Timeline, at: number, frames = 6) {
  tl.at(at, () => h.stretch(0.92, 1.1));
  tl.during(at, at + frames, (t) => h.stretch(lerp(0.92, 1, t), lerp(1.1, 1, t)));
}

/** Little white stars circling a target's head while it's staggered. */
export function dizzy(h: KnightMoveHost, tl: Timeline, from: number, t: KnightTarget, frames: number) {
  drawSpan(h, tl, from, from + frames, (g, k, f) => {
    const c = crown(t);
    const fade = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
    for (let i = 0; i < 3; i++) {
      const a = f * 0.18 + (i * Math.PI * 2) / 3;
      const x = c.x + Math.cos(a) * 9;
      const y = c.y + Math.sin(a) * 3;
      g.rect(x - 1, y - 1, 3, 3).fill({ color: i === 0 ? 0xFDE68A : 0xFFFBEA, alpha: fade });
      g.rect(x - 2, y, 5, 1).fill({ color: 0xFFFBEA, alpha: 0.6 * fade });
    }
  });
}

/** Breath puffs from the knight's visor. */
const breath = (h: KnightMoveHost, n = 4) => {
  const p = h.pos();
  h.emit(p.x + 10, p.y - 44, { count: n, colors: [0xF8FAFC, 0xCBD5E1], speed: [0.4, 1], angle: -0.4, spread: 0.5, gravity: -0.02, size: 2, life: [14, 24] });
};

// =============================================================================================

/** Basic Swing: settle, dash in, one clean arc of iron, hop home. The bread-and-butter jab. */
function basicSwing(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const CONTACT = 14;
  tl.at(0, () => {
    h.slashTrail(false);
    h.camera(1.22, h.home.x + 34, h.home.y - 30, 12); // over-the-shoulder on the wind-up
    h.sound('equip', { vol: 0.35, rate: 1.2 });
  });
  crouch(h, tl, 0, 4, 0.08);
  tl.at(2, () => h.anim('ATTACK1'));
  release(h, tl, 4);
  tl.at(4, () => {
    h.sound('dash', { vol: 0.5 });
    swingSound(h, false, { delay: 0.12 });
    dust(h, h.pos(), 5, -1);
  });
  travel(h, tl, 4, CONTACT - 1, HOME, strikeSpot(h, t0, 52), easeIn);
  tl.at(9, () => h.camera(1.14, between(h, t0, 0.62).x, c.y, 10)); // ride the dash
  slashFx(h, tl, CONTACT - 1, { x: c.x - 6, y: c.y - 2, r: 26, a0: -2.2, a1: 0.7, thick: 6, p: P_IRON, dur: 8 });
  hitFx(h, tl, CONTACT, c, P_STEEL, 12, SPARKS);
  tl.at(CONTACT, () => {
    land(h, 0, { tint: 0xE2E8F0 });
    h.knock(0, 9);
    h.camera(1.38, c.x - 14, c.y, 10, true); // punch-in on contact
  });
  backstep(h, tl, CONTACT + 8, CONTACT + 24, 14);
  tl.end(CONTACT + 26);
}

/** Sweep: run in low, the camera pulls wide, and one long ground-hugging arc taps every foe in turn. */
function sweep(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const near = foes.reduce((a, b) => (b.x < a.x ? b : a));
  const far = Math.max(...foes.map((t) => t.x));
  const plant = strikeSpot(h, near, 60);
  const SWING = 16;
  const ARC = 12; // frames the arc takes to cross the formation
  const groundY = h.home.y - 10;
  tl.at(0, () => {
    h.slashTrail(false);
    h.anim('RUN', true);
    h.sound('dash', { vol: 0.5 });
    h.camera(1.3, h.home.x + 20, h.home.y - 26, 12); // tight on the knight as he sets off
  });
  travel(h, tl, 0, 12, HOME, plant, easeIn);
  tl.every(0, 12, 4, () => dust(h, h.pos(), 3, -1));
  tl.at(12, () => {
    h.anim('ATTACK2');
    h.stretch(1.12, 0.88); // drop low into the sweep
    swingSound(h, true);
    h.camera(1.02, (h.home.x + plant.x + far) / 2, h.home.y - 30, 34); // pull wide to show the whole line
  });
  tl.during(12, SWING, (t) => h.stretch(lerp(1.12, 1.06, t), lerp(0.88, 0.94, t)));
  // The arc: a flat crescent skimming the ground from the knight to past the last foe
  const x0 = () => h.home.x + plant.x + 20;
  const x1 = far + 26;
  drawSpan(h, tl, SWING, SWING + ARC + 8, (g, t, f) => {
    const lead = Math.min(1, f / ARC);
    const tail = f < 4 ? 0 : Math.min(1, (f - 4) / (ARC + 4));
    const a = lerp(x0(), x1, easeOut(lead));
    const b = lerp(x0(), x1, easeIn(tail));
    const fade = 1 - tail * 0.7;
    for (const [w, color, al] of [[7, P_IRON.ink, 0.7], [4, P_IRON.body, 0.9], [1.5, P_IRON.core, 1]] as const) {
      g.moveTo(b, groundY + 2);
      g.quadraticCurveTo((a + b) / 2, groundY - 10, a, groundY - 4);
      g.stroke({ width: w * fade, color, alpha: al * fade });
    }
  });
  tl.every(SWING, SWING + ARC, 2, (i) => {
    const x = lerp(x0(), x1, easeOut(Math.min(1, (i * 2) / ARC)));
    h.emit(x, groundY + 4, { count: 3, colors: [0x78716C, 0xA8A29E], speed: [0.5, 1.6], angle: -1.2, spread: 0.6, gravity: 0.05, size: 2, life: [10, 18] });
  });
  // Each foe is tapped as the leading edge reaches it
  foes.forEach((t, i) => {
    const k = Math.max(0, Math.min(1, (t.x - x0()) / (x1 - x0())));
    const at = SWING + Math.max(1, Math.round(ARC * (1 - Math.cbrt(1 - k)))); // invert easeOut
    tl.at(at, () => {
      land(h, i, { scale: 0.75, tint: 0xE2E8F0 });
      h.knock(i, 7, 4);
      h.sparks(t.x - 6, t.y - 12, 6, SPARKS);
      if (i === foes.length - 1) h.camera(1.12, (near.x + far) / 2, h.home.y - 30, 10, true);
    });
  });
  tl.at(SWING + 4, () => h.stretch(1, 1));
  // Turn and jog home
  const BACK = SWING + ARC + 10;
  tl.at(BACK, () => {
    h.face(true);
    h.anim('RUN', true);
  });
  travel(h, tl, BACK, BACK + 18, here(h), HOME, easeInOut);
  tl.at(BACK + 18, () => {
    h.face(false);
    h.idle();
  });
  tl.end(BACK + 20);
}

/** Shoulder Check: shield up, a low-angle push-in, then a shoulder-first charge that rattles the foe. */
function shoulderCheck(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const BASH = 18;
  tl.at(0, () => {
    h.anim('DEFENSE');
    h.sound('equip', { rate: 0.8, vol: 0.5 });
    h.camera(1.34, h.home.x + 18, h.home.y - 18, 14); // low and close: brace
  });
  crouch(h, tl, 0, 9, 0.1);
  tl.during(3, 9, (_t, f) => h.offset(-2 * Math.min(1, f / 3), 0)); // rock back onto the heel
  tl.at(9, () => {
    h.stretch(0.9, 1.08);
    h.anim('DASH');
    h.sound('dash');
    h.sound('stomp', { vol: 0.4, rate: 1.3 });
    dust(h, h.pos(), 8, -1);
  });
  tl.during(9, 14, (t) => h.stretch(lerp(0.9, 1, t), lerp(1.08, 1, t)));
  travel(h, tl, 9, BASH, () => ({ x: -2, y: 0 }), strikeSpot(h, t0, 50), easeIn);
  tl.every(10, BASH, 3, () => dust(h, h.pos(), 2, -1));
  tl.at(12, () => h.camera(1.16, between(h, t0, 0.7).x, c.y + 4, 8));
  tl.at(BASH - 2, () => h.streaks(h.pos().x - 10, h.pos().y - 24, 26, [0xE2E8F0, 0x94A3B8]));
  hitFx(h, tl, BASH, { x: c.x - 10, y: c.y + 2 }, P_STEEL, 16, SPARKS);
  tl.at(BASH, () => {
    land(h, 0, { tint: 0xE2E8F0, flash: 0xF1F5F9, sfx: 'block' });
    h.knock(0, 24, 4);
    h.camera(1.45, c.x - 16, c.y + 2, 14, true);
    h.stretch(0.88, 1.08);
  });
  tl.during(BASH, BASH + 6, (t) => h.stretch(lerp(0.88, 1, t), lerp(1.08, 1, t)));
  dizzy(h, tl, BASH + 2, t0, Math.max(24, Math.round((h.ctx.stagger || 0.5) * 60)));
  tl.at(BASH + 12, () => h.anim('DASH_BACK'));
  travel(h, tl, BASH + 12, BASH + 28, here(h), HOME, easeInOut);
  tl.end(BASH + 32);
}

/** Brace: the camera closes in, he stamps into a deep squat behind the shield and holds it. */
function brace(h: KnightMoveHost, tl: Timeline) {
  const PLANT = 8;
  tl.at(0, () => {
    h.anim('SKILL1');
    h.camera(1.4, h.home.x + 6, h.home.y - 26, 36); // close-up, straight on
    swingSound(h, false, { vol: 0.6 });
  });
  crouch(h, tl, 0, PLANT, 0.06);
  tl.at(PLANT, () => {
    h.anim('DEFENSE');
    h.stretch(1.14, 0.86);
    h.shake(4);
    h.sound('stomp', { vol: 0.8 });
    h.sound('impact_metal', { vol: 0.3, rate: 0.7 });
    dust(h, h.pos(), 8, -1);
    dust(h, h.pos(), 8, 1);
  });
  ringFx(h, tl, PLANT, () => h.pos(), 6, 44, 0xA8A29E, 16, 3);
  // Sink and hold the squat, a breath, then the ward
  tl.during(PLANT, PLANT + 10, (t) => h.stretch(lerp(1.14, 1.06, easeOut(t)), lerp(0.86, 0.94, easeOut(t))));
  tl.at(PLANT + 16, () => breath(h, 5));
  tl.at(PLANT + 18, () => {
    h.guard(h.ctx.color);
    h.sound('block', { vol: 0.6, rate: 0.9 });
    h.camera(1.12, h.home.x + 30, h.home.y - 30, 14);
  });
  tl.during(PLANT + 26, PLANT + 34, (t) => h.stretch(lerp(1.06, 1, t), lerp(0.94, 1, t)));
  tl.end(PLANT + 36);
}

/**
 * Head Crack: a plunging down-strike. Deep crouch, leap to an apex above the foe, a beat of hang time
 * (the world dims, the bell glints, a ring tightens on the ground below), then he drops bell-first in a
 * handful of frames, crashes onto the foe, bounces off and lands.
 */
function headCrack(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const LAUNCH = 9;
  const APEX = 22;
  const DROP = 31;
  const IMPACT = 36; // 5-frame plunge
  const LANDED = IMPACT + 14;
  // The camera can't pan above the sky, so the apex is framed wide (zoom ~1): higher, or tighter, clips the raised bell
  const APEX_LIFT = 32;
  const HIT_LIFT = Math.max(10, Math.min(26, t0.height * 0.4)); // strikes the foe's upper body, not the floor
  const hitX = t0.x - 18 - h.home.x;
  const apexX = hitX - 12;
  const bounceX = hitX - 36;
  const floor = (): P => ({ x: h.home.x + hitX + 12, y: t0.y });

  // Wind-up: sink deep into the legs, camera tight on him
  tl.at(0, () => {
    h.anim('JUMP_FRONT_START');
    h.sound('equip', { vol: 0.4, rate: 0.7 });
    h.camera(1.34, h.home.x + 10, h.home.y - 24, LAUNCH);
  });
  tl.during(0, LAUNCH, (t) => h.stretch(1 + 0.16 * easeOut(t), 1 - 0.18 * easeOut(t)));
  tl.every(3, LAUNCH, 3, () => h.offset(rand(-0.6, 0.6), 0)); // straining

  // Launch: spring up and forward, the camera pulls back and up to keep the apex in frame
  tl.at(LAUNCH, () => {
    h.anim('JUMP_FRONT_UP');
    h.stretch(0.84, 1.2);
    h.sound('jump');
    h.sound('whoosh_heavy', { vol: 0.6, rate: 0.8 });
    dust(h, h.pos(), 10, -1);
    dust(h, h.pos(), 10, 1);
    h.camera(1, (h.home.x + t0.x) / 2, h.home.y - 60, APEX - LAUNCH + 4);
  });
  tl.during(LAUNCH, LAUNCH + 8, (t) => h.stretch(lerp(0.84, 1, t), lerp(1.2, 1, t)));
  travel(h, tl, LAUNCH, APEX, HOME, { x: apexX, y: 0 }, easeOut);
  tl.during(LAUNCH, APEX, (t) => h.lift(easeOut(t) * APEX_LIFT));
  tl.every(LAUNCH, APEX, 3, () => h.ghost(0xCBD5E1, 0.25, 8));

  // Hang time: float a hair higher, tuck, dim the world; the bell glints and a ring locks onto the foe
  tl.at(APEX, () => {
    h.anim('JUMP_FRONT_DOWN');
    h.sound('charge', { vol: 0.5, rate: 1.5 });
    h.camera(1.04, h.home.x + apexX + 20, h.home.y - 70, DROP - APEX); // a slow creep in, apex still in frame
  });
  travel(h, tl, APEX, DROP, () => ({ x: apexX, y: 0 }), { x: apexX + 4, y: 0 }, easeInOut);
  tl.during(APEX, DROP, (t) => {
    h.lift(APEX_LIFT + 3 * arc(t));
    h.stretch(1 + 0.06 * t, 1 - 0.06 * t); // tucking in
    h.dim(0.3 * easeOut(Math.min(1, t * 2)), 0x05060A);
  });
  drawSpan(h, tl, APEX + 2, DROP + 1, (g, t) => {
    const p = h.weaponTip();
    const r = 7 * arc(t);
    g.moveTo(p.x - r, p.y).lineTo(p.x + r, p.y).moveTo(p.x, p.y - r).lineTo(p.x, p.y + r).stroke({ width: 1.5, color: 0xFFFBEA, alpha: arc(t) });
    g.rect(p.x - 1, p.y - 1, 3, 3).fill({ color: 0xFFFFFF, alpha: arc(t) });
  });
  tl.at(APEX + 2, () => h.sound('equip', { vol: 0.35, rate: 1.6 })); // glint ting
  drawSpan(h, tl, LAUNCH + 4, IMPACT, (g, t) => {
    const f = floor();
    const r = lerp(30, 8, easeIn(t));
    g.ellipse(f.x, f.y, r, r * 0.3).stroke({ width: 1.5, color: 0xE2E8F0, alpha: 0.25 + 0.6 * t });
    g.ellipse(f.x, f.y, r * 0.5, r * 0.15).fill({ color: 0x0F0E17, alpha: 0.25 * t });
  }, 'ground');

  // The plunge: five frames straight down, stretched by speed, afterimages and speed lines above him
  tl.at(DROP, () => {
    h.anim('SKILL1'); // bell drives down at f6 of SKILL1, just as he connects
    h.stretch(0.8, 1.3);
    h.sound('whoosh_heavy', { vol: 0.9, rate: 1.35 });
    h.camera(1.16, t0.x - 14, c.y - 10, IMPACT - DROP); // dive with him; the real punch-in is on contact
  });
  travel(h, tl, DROP, IMPACT, () => ({ x: apexX + 4, y: 0 }), { x: hitX, y: 0 }, easeIn);
  tl.during(DROP, IMPACT, (t) => {
    h.lift(lerp(APEX_LIFT + 3, HIT_LIFT, easeIn(t)));
    h.dim(0.3 * (1 - t), 0x05060A);
  });
  tl.every(DROP, IMPACT, 1, () => h.ghost(0xE2E8F0, 0.5, 9));
  const lines = [-12, -6, 0, 5, 11].map((dx) => ({ dx, len: rand(18, 34) }));
  drawSpan(h, tl, DROP, IMPACT + 3, (g, t) => {
    const p = h.pos();
    const top = p.y - 64;
    for (const l of lines) {
      g.moveTo(p.x + l.dx, top - l.len * (1 + t)).lineTo(p.x + l.dx, top + 10).stroke({ width: 1, color: 0xF8FAFC, alpha: 0.7 * (1 - t) });
    }
  });

  // Impact: crash onto the foe — big hit-stop, squash, shock rings and dust both ways, cracks in the floor
  hitFx(h, tl, IMPACT, () => ({ x: c.x - 4, y: t0.y - t0.height * 0.75 }), P_STEEL, 20, SPARKS);
  tl.at(IMPACT, () => {
    h.lift(HIT_LIFT);
    h.dim(0);
    h.stretch(1.3, 0.74);
    land(h, 0, { scale: 1.35, tint: 0xE2E8F0, flash: 0xF8FAFC, sfx: 'stomp' });
    h.sound('crack', { vol: 0.6, rate: 0.8 });
    h.knock(0, 6);
    h.camera(1.55, t0.x - 12, t0.y - 22, 14, true);
    const f = floor();
    dust(h, f, 14, -1);
    dust(h, f, 14, 1);
    debris(h, f, 12, DIRT, 1.2);
  });
  ringFx(h, tl, IMPACT, floor, 6, 90, 0xA8A29E, 18, 4);
  ringFx(h, tl, IMPACT + 3, floor, 4, 56, 0xF8FAFC, 14, 2);
  crackFx(h, tl, IMPACT, { x: floor().x - 46, y: t0.y + 1 }, { x: floor().x + 40, y: t0.y - 1 }, P_CRACK, 6, 40);

  // Bounce off the foe (the down-air pop), land on the floor in front of it
  tl.during(IMPACT, IMPACT + 6, (t) => h.stretch(lerp(1.3, 0.94, t), lerp(0.74, 1.06, t)));
  tl.at(IMPACT + 4, () => {
    h.anim('JUMP_BACK_START');
    h.sound('jump', { vol: 0.5, rate: 1.2 });
  });
  travel(h, tl, IMPACT + 2, LANDED, { x: hitX, y: 0 }, { x: bounceX, y: 0 }, easeOut);
  tl.during(IMPACT + 2, LANDED, (t) => h.lift(lerp(HIT_LIFT, 0, easeIn(t)) + arc(t) * 18));
  tl.at(LANDED, () => {
    h.lift(0);
    h.anim('LANDING_END');
    h.stretch(1.12, 0.9);
    h.sound('thud', { vol: 0.6 });
    dust(h, h.pos(), 6, -1);
    h.camera(1.14, (h.home.x + t0.x) / 2 + 20, h.home.y - 30, 12);
  });
  tl.during(LANDED, LANDED + 6, (t) => h.stretch(lerp(1.12, 1, t), lerp(0.9, 1, t)));
  backstep(h, tl, LANDED + 10, LANDED + 26, 14);
  tl.end(LANDED + 28);
}

/** Lob: scoop up a rock, heave it in a high arc; the camera follows it over the front line to the back row. */
function lob(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target; // BACK: the rearmost foe
  const c = chest(t0);
  const GRAB = 6;
  const THROW = 22;
  const FLIGHT = 22;
  const HIT = THROW + FLIGHT;
  const hand = (): P => ({ x: h.pos().x + 18, y: h.pos().y - 30 });
  let rot = 0;
  tl.at(0, () => {
    h.anim('SKILL1'); // stoop to the ground
    h.camera(1.36, h.home.x + 14, h.home.y - 22, 20);
  });
  tl.at(GRAB, () => {
    h.sound('thud', { vol: 0.4, rate: 1.4 });
    debris(h, { x: h.pos().x + 16, y: h.pos().y }, 4, STONE, 0.5);
  });
  // The rock in hand while he winds up
  drawSpan(h, tl, GRAB, THROW, (g, t) => {
    const p = { x: h.pos().x + 18 - 10 * t, y: lerp(h.pos().y - 4, h.pos().y - 34, easeOut(t)) };
    rock(g, p.x, p.y, 0);
  });
  tl.at(GRAB + 2, () => h.anim('ATTACK3'));
  crouch(h, tl, GRAB, GRAB + 10, 0.07);
  release(h, tl, THROW - 2);
  tl.at(THROW, () => {
    h.sound('whoosh_heavy', { vol: 0.7 });
    h.camera(1.06, (h.home.x + c.x) / 2 + 10, h.home.y - 64, FLIGHT); // wide and high to track the arc
  });
  projectile(h, tl, THROW, FLIGHT, hand, () => c, 70, (g, x, y) => {
    rot += 0.35;
    rock(g, x, y, rot);
  }, () => {}, (x, y) => {
    if (Math.random() < 0.4) h.emit(x, y, { count: 1, colors: STONE, speed: [0.1, 0.4], angle: Math.PI, spread: 0.6, gravity: 0.05, size: 2, life: [8, 14] });
  });
  tl.at(HIT - 6, () => h.camera(1.2, c.x - 10, c.y - 6, 8)); // swing onto the target as it drops
  hitFx(h, tl, HIT, c, P_STEEL, 14, SPARKS);
  tl.at(HIT, () => {
    land(h, 0, { tint: 0xE2E8F0, sfx: 'thud' });
    h.sound('crack', { vol: 0.5, rate: 1.3 });
    h.knock(0, 10, 6);
    h.camera(1.4, c.x - 4, c.y, 12, true);
    h.emit(c.x, c.y, { count: 12, colors: STONE, speed: [1.5, 3.5], angle: -Math.PI / 2, spread: 1.4, gravity: 0.22, size: 3, life: [14, 26] });
  });
  tl.end(HIT + 16);
}

/** A tumbling chunk of rock. */
function rock(g: Graphics, x: number, y: number, rot: number) {
  const pts: number[] = [];
  for (let k = 0; k < 6; k++) {
    const a = rot + (k / 6) * Math.PI * 2;
    const r = k % 2 ? 5.5 : 7;
    pts.push(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  g.poly(pts).fill({ color: 0x78716C }).stroke({ width: 1.5, color: 0x1C1917 });
  g.rect(x - 3, y - 4, 3, 2).fill({ color: 0xA8A29E });
}

/** Steady Stance: plant, a slow breath as the camera creeps in, then a short hip-drive bump and back to guard. */
function steadyStance(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const DRIVE = 34;
  const BUMP = DRIVE + 10;
  tl.at(0, () => {
    h.anim('SKILL1'); // hinge down and grip
    h.sound('equip', { vol: 0.4, rate: 0.8 });
    h.camera(1.18, h.home.x + 16, h.home.y - 28, 10);
  });
  tl.at(6, () => {
    h.anim('BUFF');
    dust(h, h.pos(), 4, -1);
    dust(h, h.pos(), 4, 1);
  });
  // The breath: chest swells while the camera creeps closer
  tl.during(8, 28, (t) => h.stretch(1 + 0.05 * arc(t * 0.5), 1 + 0.06 * Math.sin(t * Math.PI * 0.5)));
  tl.at(10, () => h.camera(1.4, h.home.x + 10, h.home.y - 34, 22));
  tl.at(28, () => {
    breath(h, 6);
    h.sound('whoosh', { vol: 0.35, rate: 0.6 });
  });
  tl.at(DRIVE, () => {
    h.stretch(1, 1);
    h.anim('ATTACK3');
    h.sound('dash', { vol: 0.5 });
    h.camera(1.14, between(h, t0, 0.65).x, c.y, 12);
  });
  travel(h, tl, DRIVE, BUMP, HOME, strikeSpot(h, t0, 44), easeIn);
  hitFx(h, tl, BUMP, c, P_STEEL, 12, SPARKS);
  tl.at(BUMP, () => {
    land(h, 0, { tint: 0xE2E8F0 });
    h.knock(0, 12);
    h.camera(1.34, c.x - 12, c.y, 8, true);
  });
  tl.at(BUMP + 8, () => h.anim('DASH_BACK'));
  travel(h, tl, BUMP + 8, BUMP + 22, here(h), HOME, easeInOut);
  tl.at(BUMP + 22, () => {
    h.anim('DEFENSE');
    h.guard(h.ctx.color);
  });
  tl.end(BUMP + 28);
}

/** Haul: two rowing strikes on (up to) two foes, the camera cutting to alternate sides of each hit. */
function haul(h: KnightMoveHost, tl: Timeline) {
  const hits = h.targets.length ? [...h.targets] : [h.target, h.target];
  const STEP = 20;
  tl.at(0, () => h.camera(1.22, h.home.x + 30, h.home.y - 28, 10));
  hits.slice(0, 2).forEach((t, k) => {
    const start = k * STEP;
    const contact = start + 11; // ATTACK5 thrust peak
    const c = chest(t);
    tl.at(start, () => {
      h.anim('ATTACK5'); // pull back, then drive
      h.sound('dash', { vol: 0.45, rate: 1 + k * 0.1 });
    });
    travel(h, tl, start, contact - 1, k === 0 ? HOME : here(h), strikeSpot(h, t, 54), k === 0 ? easeIn : easeInOut);
    tl.at(start + 4, () => swingSound(h, false));
    slashFx(h, tl, contact - 1, { x: c.x - 8, y: c.y + 2, r: 20, a0: k ? -1.9 : 1.9, a1: k ? 0.5 : -0.5, thick: 5, p: P_IRON, dur: 7 });
    hitFx(h, tl, contact, c, P_STEEL, 11, SPARKS);
    tl.at(contact, () => {
      if (k < h.targets.length) land(h, k, { scale: k ? 1 : 0.85, tint: 0xE2E8F0 });
      h.knock(k, k ? 12 : 7);
      // Alternate framing: first hit from the knight's side, second from over the foe's
      h.camera(1.36, c.x + (k ? 10 : -22), c.y + (k ? -4 : 2), 8, true);
    });
  });
  const END = STEP + 11;
  backstep(h, tl, END + 8, END + 24, 14);
  tl.end(END + 26);
}

/** Hip Pop: a quick dash and a snapping upward clean into the foe's chin, hop out and settle on guard. */
function hipPop(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const POP = 16;
  tl.at(0, () => {
    h.slashTrail(false);
    h.anim('DASH');
    h.sound('dash', { vol: 0.5 });
    h.camera(1.2, between(h, t0, 0.55).x, c.y + 6, 12);
  });
  travel(h, tl, 0, 10, HOME, strikeSpot(h, t0, 42), easeIn);
  tl.at(4, () => h.anim('ATTACK2')); // low-to-high sweep peaks at f12 → POP
  crouch(h, tl, 8, 12, 0.1);
  release(h, tl, 12);
  tl.at(12, () => swingSound(h, false));
  slashFx(h, tl, POP - 1, { x: c.x - 6, y: c.y + 4, r: 22, a0: 1.6, a1: -1.5, thick: 5, p: P_IRON, dur: 7 });
  hitFx(h, tl, POP, { x: c.x - 4, y: c.y - 6 }, P_STEEL, 12, SPARKS);
  tl.at(POP, () => {
    land(h, 0, { tint: 0xE2E8F0 });
    h.knock(0, 6, 10);
    h.camera(1.4, c.x - 10, c.y + 8, 10, true); // from below: the foe pops up out of frame
  });
  backstep(h, tl, POP + 6, POP + 20, 16);
  tl.at(POP + 20, () => {
    h.anim('DEFENSE');
    h.guard(h.ctx.color);
    h.camera(1.12, h.home.x + 30, h.home.y - 28, 10);
  });
  tl.end(POP + 26);
}

/** Second Wind: close on the knight passing the bell round his waist, a deep breath, then a light jab. */
function secondWind(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const PASS = 30;
  const JAB = PASS + 14; // ATTACK3 thrust peak
  tl.at(0, () => {
    h.anim('BUFF');
    h.weaponShown(false); // the bell orbits on its own
    h.camera(1.45, h.home.x + 4, h.home.y - 30, PASS);
  });
  // The pass: a kettlebell orbiting the waist with a faint motion ring
  drawSpan(h, tl, 0, PASS, (g, t, f) => {
    const p = h.pos();
    const cx = p.x + 2;
    const cy = p.y - 24;
    const a = f * 0.32;
    g.ellipse(cx, cy, 18, 6).stroke({ width: 1, color: 0xE2E8F0, alpha: 0.35 * arc(t) });
    crescent(g, cx, cy, 18, a - 1.4, a, 2, P_IRON, 0.5 * arc(t));
    kettlebell(g, cx + Math.cos(a) * 18, cy + Math.sin(a) * 6, 4, a, 0xE2E8F0);
  });
  tl.every(0, PASS, 10, (i) => h.sound('whoosh', { vol: 0.35, rate: 1 + i * 0.12 }));
  tl.at(PASS - 6, () => {
    breath(h, 6);
    h.emit(h.pos().x, h.pos().y - 20, { count: 8, colors: [0xF8FAFC, 0xE5E7EB, 0xBBF7D0], speed: [0.3, 0.8], angle: -Math.PI / 2, spread: 0.6, gravity: -0.02, size: 2, life: [18, 28] });
  });
  tl.at(PASS, () => {
    h.weaponShown(true);
    h.anim('ATTACK3');
    h.sound('dash', { vol: 0.45 });
    h.camera(1.14, between(h, t0, 0.6).x, c.y, 12);
  });
  travel(h, tl, PASS + 2, JAB, HOME, strikeSpot(h, t0, 46), easeIn);
  hitFx(h, tl, JAB, c, P_STEEL, 10, SPARKS);
  tl.at(JAB, () => {
    land(h, 0, { scale: 0.8, tint: 0xE2E8F0 });
    h.knock(0, 8);
    h.camera(1.3, c.x - 12, c.y, 8, true);
  });
  tl.at(JAB + 8, () => h.anim('DASH_BACK'));
  travel(h, tl, JAB + 8, JAB + 22, here(h), HOME, easeInOut);
  tl.at(JAB + 22, () => {
    h.anim('DEFENSE');
    h.guard(h.ctx.color); // the restored wind: Block + heal glow once he's home
  });
  tl.end(JAB + 30);
}

// ---------------------------------------------------------------------------------------------

export const STARTER_MOVES: Record<string, KnightMove> = {
  starter_swing: basicSwing,
  starter_sweep: sweep,
  starter_check: shoulderCheck,
  starter_brace: brace,
  starter_chop: headCrack,
  starter_lob: lob,
  starter_stance: steadyStance,
  starter_haul: haul,
  starter_hippop: hipPop,
  starter_wind: secondWind,
};
