/**
 * Knight attack choreography: one move per battle card (keyed by CARD_CATALOG templateId).
 *
 * Same model as monsterMoves.ts: each move schedules work on a frame Timeline (60 fps frames, driven by
 * the engine ticker). It plays knight Spine animations, moves the knight, drives the camera and draws
 * Graphics VFX (fxKit.ts). `h.impact(i)` is the frame where hit `i` lands: the engine flinches that
 * monster and calls back into BattleScreen (damage numbers, deaths). Hits a move never lands are landed
 * when it ends, so a move can't swallow damage.
 *
 * Coordinates are battlefield (gameLayer) space: knight feet at home ≈ (130, 168), monsters to the
 * right at their formation slots (`h.targets`, in hit order). The knight is ~50px tall and faces right.
 *
 * Feel: anticipation → fast travel → contact → hold → recovery. Contact is always sold with `land()`
 * (hit-stop, shake, flash and hit-flash scaled by the card's rarity), plus a knockback/launch.
 *
 * Rig timing (from `npm run shot -- ksheet` / `kanims`):
 *   ATTACK1/2/4  overhead wind-up f4-8, blade sweep f12-16 (the rig draws its own fire trail)
 *   ATTACK3      thrust peak f14 · ATTACK5 pull back f3-6, thrust peak f11
 *   SKILL1       quick downward chop to the ground at f6
 *   SKILL2TULUC  sword raised skyward around f11 · SKILL3TULUC sword pointed forward from f22
 *   JUMP_FRONT_START/UP/DOWN, LANDING_END (crouch at f4), JUMP_BACK_START/END, DASH (shield-first),
 *   DEFENSE (guard), BUFF, RUN (40f cycle)
 *
 * Review with `npm run shot -- "encounter:wolf,boar,slime" idle kfilm:<templateId>:12:5:<slots>` (film strip).
 */
import type { ExerciseType } from '../../types/game';
import { CARD_CATALOG } from '../../types/battle';
import { ALL_WEAPON_SPELLS } from '../../types/weaponSpells';
import { SPELL_MOVES } from './spellMoves';
import {
  Timeline, lerp, easeIn, easeOut, easeInOut, arc, rand,
  INK, BONE, BLOOD, BLOOD_DARK, EMBER, GOLD, DIRT, SHADOW, FIRE,
} from './choreo';
import {
  pal, crescent, starburst, bolt, spike, crystal, pillar, runeCircle, orb, wing,
  kettlebell, jaws, lance, scorch, hash,
} from './fxKit';
import * as K from './knightKit';
import type { KnightMove, KnightMoveContext, KnightMoveHost, Layer } from './knightKit';

export type { KnightTarget, KnightMoveContext, KnightMoveHost, KnightMove, Layer } from './knightKit';
export { strikeSpot, chest, travel, ghostTrail, drawSpan } from './knightKit';

const {
  each, once, strikeSpot, chest, kChest, kBlade, kRaised, shoulders, land, travel, here, HOME, backstep, ghostTrail,
  swingSound, chargeSound, drawSpan, slashFx, hitFx, ringFx, crackFx, chargeFx, motesFx, debris, dust, smoke, shards, embers, projectile,
  P_GOLD, P_FIRE, P_EMBER, P_WATER, P_BOLT, P_HOLY, P_ARCANE, P_RAGE, P_VOID, P_JADE, P_EMERALD, P_LIME, P_AMBER,
  P_SUN, P_SHADOW, P_INDIGO, P_VIOLET, P_PINK, P_CRANE, P_COPPER, P_BELL, P_CYAN, P_STEEL, P_FORGE, P_STORM,
} = K;
type P = K.P;

// =============================================================================================
// SWING: fast and ballistic

let swingCombo = 0;

/** Iron Cleave: dash in behind afterimages, overhead cleave on contact, hop back. */
function ironCleave(h: KnightMoveHost, tl: Timeline) {
  const spot = strikeSpot(h);
  const c = chest(h.target);
  const CONTACT = 12;
  tl.at(0, () => {
    h.anim(['ATTACK1', 'ATTACK4'][swingCombo++ % 2]);
    h.sound('dash', { vol: 0.6 });
    swingSound(h, false, { delay: 0.1 });
  });
  travel(h, tl, 0, 10, HOME, spot, easeIn);
  ghostTrail(h, tl, 2, 10, 0xF4B41A);
  tl.at(8, () => h.camera(1.2, (h.home.x + h.target.x) / 2 + 20, c.y, 18));
  slashFx(h, tl, CONTACT - 1, { x: c.x - 6, y: c.y - 2, r: 28, a0: -2.3, a1: 0.7, thick: 8, p: P_GOLD });
  hitFx(h, tl, CONTACT, c, P_GOLD, 15);
  tl.at(CONTACT, () => {
    land(h, 0);
    h.knock(0, 10);
    h.streaks(c.x - 10, c.y, 40, [0xF4B41A, 0xFFFFFF]);
  });
  backstep(h, tl, CONTACT + 8, CONTACT + 24, 14);
  tl.end(CONTACT + 26);
}

/** Momentum Flow: a rising and a falling slash in one fluid motion, then flow back into a water ward. */
function momentumFlow(h: KnightMoveHost, tl: Timeline) {
  const spot = strikeSpot(h, h.target, 52);
  const c = chest(h.target);
  tl.at(0, () => {
    h.anim('ATTACK2');
    h.sound('dash', { vol: 0.6 });
  });
  travel(h, tl, 0, 9, HOME, spot, easeIn);
  ghostTrail(h, tl, 1, 9, 0x38B6FF, 2, 0.35);
  // Rising cut (no damage), straight into the falling one
  slashFx(h, tl, 10, { x: c.x - 8, y: c.y + 2, r: 24, a0: 1.3, a1: -1.6, thick: 6, p: P_WATER, dur: 8 });
  tl.at(11, () => h.sound('splash', { vol: 0.4, rate: 1.4 }));
  tl.at(11, () => h.emit(c.x, c.y, { count: 6, colors: [0x38B6FF, 0xE0F7FF], speed: [1, 2.5], angle: -1.2, spread: 0.6, gravity: 0.15, size: 2, life: [12, 20] }));
  tl.at(14, () => h.anim('ATTACK1'));
  slashFx(h, tl, 25, { x: c.x - 4, y: c.y - 2, r: 28, a0: -2.2, a1: 0.8, thick: 8, p: P_WATER });
  hitFx(h, tl, 26, c, P_WATER, 14, [0x38B6FF, 0xE0F7FF, 0xFFFFFF]);
  tl.at(26, () => {
    land(h, 0, { tint: 0x9BDCFF });
    h.sound('splash', { vol: 0.6 });
    h.knock(0, 9);
    h.emit(c.x, c.y, { count: 12, colors: [0x38B6FF, 0x7DD3FC, 0xE0F7FF], speed: [1.5, 3.5], angle: -0.6, spread: 1.2, gravity: 0.2, size: 2, life: [14, 24] });
  });
  // Glide back on a wave
  tl.at(32, () => {
    h.anim('DASH_BACK');
    h.sound('wave', { rate: 1.5, vol: 0.5 });
  });
  travel(h, tl, 32, 46, here(h), HOME, easeInOut);
  ghostTrail(h, tl, 32, 46, 0x38B6FF, 3, 0.3);
  tl.at(46, () => h.anim('DEFENSE'));
  ringFx(h, tl, 46, () => h.pos(), 8, 34, 0x38B6FF, 16);
  tl.at(48, () => h.guard(0x38B6FF));
  tl.end(56);
}

/** Dragon Whirlwind: a spinning crimson cyclone that tears through the whole formation and back. */
function dragonWhirlwind(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const far = Math.max(...foes.map((t) => t.x)) + 34;
  const SPIN_FROM = 12;
  const SPIN_TO = 44;
  tl.at(0, () => {
    h.anim('JUMP_FRONT_START');
    h.sound('jump', { vol: 0.6 });
    h.dim(0.25, 0x1A0505);
  });
  tl.during(0, 12, (t) => h.stretch(1 + 0.12 * t, 1 - 0.12 * t));
  chargeFx(h, tl, 0, 12, () => kChest(h), P_FIRE, 34);
  tl.at(12, () => {
    h.stretch(1, 1);
    h.camera(1.12, (h.home.x + far) / 2, h.home.y - 30, 40);
  });
  tl.every(SPIN_FROM, SPIN_TO, 10, (i) => {
    h.anim('ATTACK4');
    h.sound('spin', { rate: 0.9 + i * 0.08 });
  });
  tl.at(SPIN_FROM, () => h.sound('fire', { rate: 0.8, vol: 0.7 }));
  tl.every(SPIN_FROM, SPIN_TO, 3, (i) => h.face(i % 2 === 1));
  travel(h, tl, SPIN_FROM, SPIN_TO, HOME, { x: far - h.home.x, y: 0 }, easeInOut);
  ghostTrail(h, tl, SPIN_FROM, SPIN_TO, BLOOD, 2, 0.4);
  // The cyclone: three crimson ribbons orbiting the knight
  drawSpan(h, tl, SPIN_FROM, SPIN_TO + 6, (g, t, f) => {
    const c = kChest(h);
    const fade = t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1;
    for (let k = 0; k < 3; k++) {
      const a = f * 0.55 + (k * Math.PI * 2) / 3;
      crescent(g, c.x, c.y + 2, 24 + k * 4, a, a + 1.5, 6, k === 1 ? P_EMBER : P_FIRE, 0.9 * fade);
    }
  });
  tl.every(SPIN_FROM, SPIN_TO, 3, () => embers(h, kChest(h), 3));
  // Each foe is hit as the cyclone passes through it
  foes.forEach((t, i) => {
    const passAt = SPIN_FROM + Math.round((SPIN_TO - SPIN_FROM) * Math.min(1, Math.max(0, (t.x - 20 - h.home.x) / (far - h.home.x))));
    hitFx(h, tl, passAt, chest(t), P_FIRE, 14);
    tl.at(passAt, () => {
      land(h, i, { scale: 0.8, burst: 'slash', burstSize: 1.1 });
      h.knock(i, 12, 8);
    });
  });
  // Finishing flourish on the far side, then race home
  tl.at(SPIN_TO, () => {
    h.face(false);
    h.anim('ATTACK1');
  });
  slashFx(h, tl, SPIN_TO + 2, { x: far - 10, y: h.home.y - 26, r: 34, a0: -2.6, a1: 1.0, thick: 10, p: P_FIRE, dur: 10 });
  tl.at(SPIN_TO + 14, () => h.sound('dash', { vol: 0.5 }));
  tl.at(SPIN_TO + 14, () => {
    h.face(true);
    h.anim('RUN', true);
  });
  travel(h, tl, SPIN_TO + 14, SPIN_TO + 30, here(h), HOME, easeInOut);
  ghostTrail(h, tl, SPIN_TO + 14, SPIN_TO + 30, BLOOD, 3, 0.3);
  tl.at(SPIN_TO + 30, () => {
    h.face(false);
    h.idle();
  });
  tl.during(SPIN_TO + 14, SPIN_TO + 30, (t) => h.dim(0.25 * (1 - t), 0x1A0505));
  tl.end(SPIN_TO + 32);
}

// =============================================================================================
// SQUAT: ground shockwaves

/** Titan Ground Slam: leap, slam the earth, and a shockwave rolls through every foe. */
function titanGroundSlam(h: KnightMoveHost, tl: Timeline) {
  const landAt = { x: 46, y: 0 };
  const LAND = 24;
  tl.at(0, () => {
    h.anim('JUMP_FRONT_START');
    chargeSound(h, 30, 0.4);
  });
  tl.during(0, 6, (t) => h.stretch(1 + 0.1 * t, 1 - 0.12 * t));
  tl.at(6, () => {
    h.stretch(0.92, 1.1);
    h.anim('JUMP_FRONT_UP');
    h.sound('jump');
    dust(h, h.pos(), 6, 1);
  });
  travel(h, tl, 6, 18, HOME, landAt, easeOut);
  tl.during(6, 18, (t) => h.lift(easeOut(t) * 36));
  tl.at(18, () => {
    h.stretch(1, 1);
    h.anim('JUMP_FRONT_DOWN');
  });
  tl.during(18, LAND, (t) => h.lift(lerp(36, 0, easeIn(t))));
  tl.at(LAND, () => {
    h.anim('LANDING_END');
    h.stretch(1.18, 0.84);
    h.camera(1.15, h.pos().x + 60, h.home.y - 20, 16);
    h.shake(9);
    h.flash(0.18, 0xFF3366);
    h.sound('stomp');
    h.sound('impact_metal', { vol: 0.4, rate: 0.8 });
    dust(h, h.pos(), 10, -1);
    dust(h, h.pos(), 10, 1);
  });
  tl.during(LAND, LAND + 8, (t) => h.stretch(lerp(1.18, 1, t), lerp(0.84, 1, t)));
  const origin = () => ({ x: h.home.x + landAt.x + 10, y: h.home.y });
  ringFx(h, tl, LAND, origin, 6, 260, 0xFF3366, 26, 4);
  ringFx(h, tl, LAND + 3, origin, 4, 160, 0xFFE4EC, 20, 2);
  crackFx(h, tl, LAND, { x: h.home.x + landAt.x, y: h.home.y }, { x: Math.max(...each(h).map((t) => t.x)) + 10, y: h.home.y }, P_RAGE, 16, 50);
  // The wave front travels ~10 px/frame; each foe is struck as it arrives
  each(h).forEach((t, i) => {
    const at = LAND + Math.max(1, Math.round((t.x - (h.home.x + landAt.x)) / 10));
    tl.at(at, () => {
      land(h, i, { scale: 0.85, tint: 0xFF8FA8, burst: 'crater' });
      h.knock(i, 4, 16);
      debris(h, { x: t.x, y: t.y }, 8);
    });
  });
  backstep(h, tl, LAND + 22, LAND + 40, 16);
  tl.end(LAND + 42);
}

/** Aegis Fortress: drive the shield into the earth; rune circle, stone ramparts and a jade dome rise. */
function aegisFortress(h: KnightMoveHost, tl: Timeline) {
  tl.at(0, () => {
    h.anim('SKILL1');
    swingSound(h);
  });
  tl.at(6, () => {
    h.shake(6);
    h.stretch(1.1, 0.9);
    dust(h, h.pos(), 8, 1);
    h.sound('stomp', { vol: 0.8 });
    h.sound('rune', { vol: 0.6 });
  });
  tl.during(6, 12, (t) => h.stretch(lerp(1.1, 1, t), lerp(0.9, 1, t)));
  ringFx(h, tl, 6, () => h.pos(), 6, 70, 0x00EB88, 18);
  drawSpan(h, tl, 6, 64, (g, t, f) => {
    const p = h.pos();
    const grow = easeOut(Math.min(1, f / 10));
    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
    runeCircle(g, p.x, p.y, 40 * grow, f * 0.05, P_JADE, fade);
  }, 'ground');
  // Stone ramparts burst up in front of the knight
  drawSpan(h, tl, 10, 64, (g, t, f) => {
    const p = h.pos();
    const up = f < 6 ? easeOut(f / 6) : t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
    spike(g, p.x + 30, p.y + 4, 26 * up, 8, 0x44403C, 0x78716C, 0x00EB88);
    spike(g, p.x + 42, p.y + 2, 36 * up, 9, 0x57534E, 0xA8A29E, 0x00EB88);
    spike(g, p.x + 24, p.y + 8, 18 * up, 7, 0x44403C, 0x78716C, 0x00EB88);
  });
  tl.at(10, () => h.sound('rock'));
  tl.at(10, () => debris(h, { x: h.pos().x + 36, y: h.pos().y }, 10, [0x57534E, 0x78716C, 0x00EB88]));
  // Jade dome
  drawSpan(h, tl, 14, 64, (g, t, f) => {
    const c = kChest(h);
    const grow = easeOut(Math.min(1, f / 8));
    const fade = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
    const r = 34 * grow;
    g.ellipse(c.x + 4, c.y + 8, r, r * 1.05).fill({ color: 0x00EB88, alpha: 0.12 * fade });
    g.ellipse(c.x + 4, c.y + 8, r, r * 1.05).stroke({ width: 3, color: 0x053B26, alpha: 0.5 * fade });
    g.ellipse(c.x + 4, c.y + 8, r, r * 1.05).stroke({ width: 1.5, color: 0x00EB88, alpha: 0.9 * fade });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI + f * 0.03;
      g.moveTo(c.x + 4 + Math.cos(a + Math.PI) * r, c.y + 8 + Math.sin(a + Math.PI) * r * 1.05)
        .lineTo(c.x + 4, c.y + 8 - r * 1.05).stroke({ width: 1, color: 0xE8FFF5, alpha: 0.35 * fade });
    }
  });
  tl.at(14, () => h.anim('DEFENSE'));
  tl.at(18, () => h.guard(0x00EB88));
  motesFx(h, tl, 14, 50, () => h.pos(), [0x00EB88, 0xE8FFF5], 4, 26);
  tl.at(30, () => h.impact()); // pure Block: lands any hits it has
  tl.end(66);
}

/** Colossus Quake: vault off-screen, meteor down into the field; the earth erupts under every foe. */
function colossusQuake(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const midX = Math.min(h.home.x + 60, Math.min(...foes.map((t) => t.x)) - 70);
  const LAND = 42;
  tl.at(0, () => {
    h.anim('JUMP_FRONT_START');
    h.camera(1.15, h.home.x + 20, h.home.y - 30, 16);
  });
  tl.during(0, 14, (t) => {
    h.stretch(1 + 0.16 * t, 1 - 0.16 * t);
    h.dim(0.45 * t, 0x1E0B33);
  });
  chargeFx(h, tl, 0, 14, () => ({ x: h.pos().x, y: h.pos().y - 4 }), P_VOID, 46, 14);
  tl.every(0, 14, 3, () => h.shake(2));
  tl.at(14, () => {
    h.stretch(0.85, 1.2);
    h.anim('JUMP_FRONT_UP');
    h.sound('jump');
    h.sound('whoosh_heavy', { rate: 0.8 });
    dust(h, h.pos(), 12, -1);
    dust(h, h.pos(), 12, 1);
  });
  ringFx(h, tl, 14, () => h.pos(), 4, 40, 0xA855F7, 12);
  tl.during(14, 26, (t) => h.lift(easeOut(t) * 170));
  ghostTrail(h, tl, 14, 24, 0xA855F7, 2, 0.5);
  tl.at(22, () => h.offset(midX - h.home.x, 0)); // off-screen: reposition over the landing point
  // Targeting sigil on the ground while he's airborne
  drawSpan(h, tl, 24, LAND + 4, (g, _t, f) => runeCircle(g, midX, h.home.y, 46 * easeOut(Math.min(1, f / 8)), f * 0.09, P_VOID, 0.9), 'ground');
  tl.at(30, () => h.sound('whistle', { rate: 0.7 }));
  tl.at(34, () => {
    h.stretch(0.9, 1.15);
    h.anim('JUMP_FRONT_DOWN');
  });
  tl.during(34, LAND, (t) => h.lift(lerp(170, 0, easeIn(t))));
  drawSpan(h, tl, 34, LAND + 2, (g, t) => {
    const p = h.pos();
    lance(g, p.x, p.y - 50, p.x, p.y - 150, 14 * (1 - t * 0.3), P_VOID, 0.7);
  });
  tl.at(LAND, () => {
    h.anim('LANDING_END');
    h.stretch(1.25, 0.78);
    h.camera(1.3, midX + 30, h.home.y - 26, 10, true);
    h.hitStop(8);
    h.shake(16);
    h.flash(0.45);
    h.sound('stomp');
    h.sound('impact_crit', { vol: 0.8 });
    h.sound('quake', { delay: 0.1 });
    debris(h, h.pos(), 20, [...DIRT, 0xA855F7], 1.3);
    dust(h, h.pos(), 14, -1);
    dust(h, h.pos(), 14, 1);
  });
  tl.during(LAND, LAND + 10, (t) => h.stretch(lerp(1.25, 1, t), lerp(0.78, 1, t)));
  hitFx(h, tl, LAND, { x: midX, y: h.home.y - 4 }, P_VOID, 26);
  ringFx(h, tl, LAND, { x: midX, y: h.home.y }, 8, 220, 0xA855F7, 30, 5);
  ringFx(h, tl, LAND + 4, { x: midX, y: h.home.y }, 6, 120, 0xF3E8FF, 22, 2);
  tl.at(LAND + 10, () => h.camera(1.08, (midX + Math.max(...foes.map((t) => t.x))) / 2, h.home.y - 30, 40));
  // The ground splits toward each foe, then rock spires erupt under them one after another
  foes.forEach((t, i) => {
    crackFx(h, tl, LAND + 1, { x: midX, y: h.home.y }, { x: t.x, y: t.y }, P_VOID, 10, 54);
    const at = LAND + 10 + i * 5;
    drawSpan(h, tl, at, at + 40, (g, tt, f) => {
      const up = f < 4 ? easeOut(f / 4) : tt > 0.65 ? 1 - (tt - 0.65) / 0.35 : 1;
      spike(g, t.x - 14, t.y + 4, 30 * up, 8, 0x241433, 0x4C1D95, 0xD8B4FE);
      spike(g, t.x + 13, t.y + 3, 36 * up, 8, 0x241433, 0x4C1D95, 0xD8B4FE);
      spike(g, t.x, t.y + 6, 58 * up, 11, 0x2E1A40, 0x6D28D9, 0xF3E8FF);
    });
    tl.at(at, () => {
      land(h, i, { scale: 0.75, tint: 0xD8B4FE, burst: 'quake', burstSize: 1.2, sfx: 'rock' });
      h.knock(i, 6, 30);
      debris(h, { x: t.x, y: t.y }, 14, [...DIRT, 0xA855F7]);
    });
  });
  tl.during(LAND + 30, LAND + 60, (t) => h.dim(0.45 * (1 - t), 0x1E0B33));
  backstep(h, tl, LAND + 36, LAND + 56, 26);
  tl.end(LAND + 62);
}

// =============================================================================================
// OVERHEAD PRESS: strikes from above

/** Thunder Smite: raise the blade to the storm; a lightning bolt answers on the back row. */
function thunderSmite(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const STRIKE = 22;
  tl.at(0, () => {
    h.anim('SKILL2TULUC');
    h.camera(1.1, (h.home.x + t0.x) / 2, h.home.y - 40, 40);
    chargeSound(h, 22, 0.5);
  });
  tl.during(0, 14, (t) => h.dim(0.35 * t, 0x07111F));
  // Static gathering on the raised blade
  tl.every(6, STRIKE, 5, () => h.sound('zap', { vol: 0.3, rate: rand(1, 1.4) }));
  drawSpan(h, tl, 6, STRIKE, (g, _t, f) => {
    const tip = kRaised(h);
    for (let k = 0; k < 3; k++) {
      const a = hash(Math.floor(f) * 3 + k) * Math.PI * 2;
      bolt(g, tip.x, tip.y, tip.x + Math.cos(a) * 12, tip.y + Math.sin(a) * 12, 3, 3, P_BOLT, 1.5, Math.floor(f) * 7 + k);
    }
    orb(g, tip.x, tip.y, 2 + Math.sin(f), P_BOLT);
  });
  // Blade answers the sky
  drawSpan(h, tl, STRIKE - 3, STRIKE + 2, (g, _t, f) => {
    const tip = kRaised(h);
    bolt(g, tip.x, tip.y, tip.x + 8, 40, 6, 6, P_BOLT, 2, Math.floor(f) * 5);
  });
  // The strike: a forked bolt from the clouds onto the target, flickering for a few frames
  drawSpan(h, tl, STRIKE, STRIKE + 10, (g, t, f) => {
    const flick = Math.floor(f) % 3 === 2 ? 0.4 : 1;
    const top = { x: c.x + 12, y: 40 };
    g.ellipse(top.x, top.y, 46, 10).fill({ color: 0x0B1E3F, alpha: 0.6 * (1 - t) });
    bolt(g, top.x, top.y, c.x, t0.y, 9, 10, P_BOLT, 5 * (1 - t * 0.6), Math.floor(f / 2), flick);
    bolt(g, lerp(top.x, c.x, 0.4), lerp(top.y, t0.y, 0.4), c.x + 26, t0.y - 6, 4, 6, P_BOLT, 2, Math.floor(f / 2) + 9, flick * 0.8);
  });
  hitFx(h, tl, STRIKE, c, P_BOLT, 16, [0x7DD3FC, 0xFFFFFF, 0x38B6FF]);
  ringFx(h, tl, STRIKE, { x: c.x, y: t0.y }, 4, 50, 0x7DD3FC, 14);
  drawSpan(h, tl, STRIKE, STRIKE + 40, (g, t) => scorch(g, c.x, t0.y, 14, 0x38B6FF, 1 - t), 'ground');
  tl.at(STRIKE, () => {
    land(h, 0, { tint: 0xBFE8FF, flash: 0xBFE8FF, sfx: 'thunder' });
    h.knock(0, 5, 4);
    h.emit(c.x, t0.y - 4, { count: 10, colors: [0x7DD3FC, 0xFFFFFF], speed: [1.5, 3.5], angle: -Math.PI / 2, spread: 1.2, gravity: 0.2, size: 2, life: [10, 20] });
  });
  tl.during(STRIKE + 10, STRIKE + 26, (t) => h.dim(0.35 * (1 - t), 0x07111F));
  tl.end(STRIKE + 28);
}

/** Heavenly Pillar: a sigil brands the foe, then a column of judgement crashes down and shatters its guard. */
function heavenlyPillar(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const SLAM = 34;
  tl.at(0, () => {
    h.anim('SKILL2TULUC');
    h.camera(1.16, (h.home.x + t0.x * 2) / 3, h.home.y - 44, 46);
    h.sound('holy', { rate: 0.8 });
  });
  tl.during(0, 14, (t) => h.dim(0.55 * t, 0x0F0E17));
  motesFx(h, tl, 4, SLAM, () => kRaised(h), [0xFBBF24, 0xFFFBEB], 3, 6);
  drawSpan(h, tl, 6, SLAM + 26, (g, t, f) => {
    const grow = easeOut(Math.min(1, f / 14));
    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
    runeCircle(g, t0.x, t0.y, 36 * grow, f * 0.06, P_HOLY, fade);
  }, 'ground');
  // Thin searching ray, then the column itself
  tl.at(16, () => h.sound('beam', { rate: 1.8, vol: 0.4 }));
  drawSpan(h, tl, 16, SLAM, (g, _t, f) => pillar(g, t0.x, 30, t0.y, 2 + (f % 4 < 2 ? 1 : 0), P_HOLY, 0.7));
  drawSpan(h, tl, SLAM, SLAM + 26, (g, t, f) => {
    const w = f < 4 ? lerp(6, 40, easeOut(f / 4)) : lerp(40, 0, easeIn(Math.max(0, (t - 0.45) / 0.55)));
    pillar(g, t0.x, 20, t0.y, w, P_HOLY, 1);
  });
  tl.at(SLAM, () => {
    land(h, 0, { scale: 1.1, tint: 0xFFF1B8, flash: 0xFFF7D6, burst: 'crater', burstSize: 1.2 });
    h.sound('holy');
    h.sound('ice', { vol: 0.5, rate: 1.2 }); // its guard shatters
    h.camera(1.28, t0.x, c.y, 12, true);
    h.knock(0, 0, -6);
    shards(h, c, 20);
    h.emit(t0.x, t0.y, { count: 16, colors: [0xFBBF24, 0xFFFBEB, 0xFDE68A], speed: [1.5, 4], angle: -Math.PI / 2, spread: 1.4, gravity: 0.1, size: 3, life: [16, 28] });
  });
  ringFx(h, tl, SLAM, { x: t0.x, y: t0.y }, 10, 110, 0xFBBF24, 20, 4);
  tl.every(SLAM + 2, SLAM + 30, 3, () => embers(h, { x: t0.x + rand(-14, 14), y: t0.y }, 2, [0xFBBF24, 0xFFFBEB]));
  tl.during(SLAM + 18, SLAM + 34, (t) => h.dim(0.55 * (1 - t), 0x0F0E17));
  tl.end(SLAM + 36);
}

/** Arcane Scepter: three arcane orbs spiral out of a rune and seek the foe; the rune becomes a ward. */
function arcaneScepter(h: KnightMoveHost, tl: Timeline) {
  const c = chest(h.target);
  tl.at(0, () => {
    h.anim('SKILL3TULUC');
    h.sound('rune');
    h.sound('magic', { delay: 0.1 });
  });
  drawSpan(h, tl, 0, 60, (g, t, f) => {
    const p = h.pos();
    runeCircle(g, p.x, p.y, 30 * easeOut(Math.min(1, f / 10)), -f * 0.07, P_ARCANE, t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1);
  }, 'ground');
  // Three orbs orbit the knight, then fire in sequence from the blade
  const fires = [22, 28, 34];
  drawSpan(h, tl, 4, 34, (g, _t, f) => {
    const k = kChest(h);
    fires.forEach((at, i) => {
      if (f + 4 >= at) return;
      const a = f * 0.18 + (i * Math.PI * 2) / 3;
      orb(g, k.x + Math.cos(a) * 18, k.y - 6 + Math.sin(a) * 8, 3, P_ARCANE);
    });
  });
  fires.forEach((at, i) => {
    const last = i === fires.length - 1;
    projectile(h, tl, at, 12, () => kBlade(h), () => ({ x: c.x + rand(-4, 4), y: c.y + rand(-8, 6) }), 10 + i * 6,
      (g, x, y, _t, f) => {
        orb(g, x, y, last ? 5 : 4, P_ARCANE);
        g.circle(x, y, (last ? 8 : 6) + Math.sin(f)).stroke({ width: 1, color: 0xEFF6FF, alpha: 0.6 });
      },
      () => {
        if (last) {
          land(h, 0, { tint: 0xBFDBFE, flash: 0xBFDBFE, burst: 'portal', burstSize: 0.9 });
          h.knock(0, 8, 2);
        } else {
          h.flashTarget(0, 0xBFDBFE, 4);
          h.sound('zap', { vol: 0.5, rate: 1.4 });
          h.shake(3);
        }
        h.sparks(c.x, c.y, last ? 14 : 6, [0x60A5FA, 0xEFF6FF, 0xFFFFFF]);
      },
      (x, y) => h.emit(x, y, { count: 1, colors: [0x60A5FA, 0xEFF6FF], speed: [0.1, 0.4], spread: Math.PI, gravity: 0, size: 2, life: [8, 14] }));
    tl.at(at, () => h.sound('shoot', { rate: 1 + i * 0.12 }));
  });
  hitFx(h, tl, 46, c, P_ARCANE, 14);
  tl.at(48, () => {
    h.anim('DEFENSE');
    h.guard(0x60A5FA);
  });
  tl.end(62);
}

// =============================================================================================
// CLEAN & PRESS: heavy, slow, brutal

/** Anvil Breaker: march in, haul the blade overhead, and a spectral anvil crashes down with it. */
function anvilBreaker(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const spot = strikeSpot(h, t0, 62);
  const HIT = 40;
  tl.at(0, () => h.anim('RUN', true));
  tl.every(0, 14, 7, () => h.sound('step', { vol: 0.4, rate: 1.2 }));
  travel(h, tl, 0, 14, HOME, spot, easeInOut);
  tl.every(2, 14, 5, () => dust(h, h.pos(), 3, -1));
  // Slow, heavy wind-up: ATTACK1 at under half speed, snapped to full power for the blow
  tl.at(14, () => {
    h.anim('ATTACK1');
    h.animSpeed(0.4);
    h.camera(1.2, t0.x - 30, c.y - 10, 34);
  });
  chargeFx(h, tl, 16, HIT - 2, () => kRaised(h), P_FORGE, 26, 10);
  tl.during(18, HIT - 4, (t) => h.lift(easeOut(t) * 14));
  tl.at(HIT - 8, () => h.sound('whistle', { rate: 1.4, vol: 0.5 }));
  tl.at(HIT - 4, () => {
    h.animSpeed(1.8);
    swingSound(h, true);
  });
  tl.during(HIT - 4, HIT, (t) => h.lift(lerp(14, 0, easeIn(t))));
  // The anvil drops out of the dark onto the foe
  drawSpan(h, tl, HIT - 8, HIT + 16, (g, _t, f) => {
    const drop = f < 8 ? easeIn(f / 8) : 1;
    const y = lerp(58, c.y - 22, drop);
    const fade = f < 8 ? 0.85 : 1 - (f - 8) / 16;
    const x = t0.x;
    // Iron anvil, 44px across: horn, face, waist, foot; forge-lit rim
    g.poly([x - 30, y - 10, x + 22, y - 10, x + 22, y - 2, x + 12, y + 2, x + 9, y + 10, x + 18, y + 18, x - 18, y + 18, x - 9, y + 10, x - 12, y + 2, x - 16, y - 2, x - 30, y - 6])
      .fill({ color: 0x27272A, alpha: fade }).stroke({ width: 2, color: 0x0F0E17, alpha: fade });
    g.rect(x - 28, y - 10, 50, 3).fill({ color: 0xF97316, alpha: 0.9 * fade });
    g.rect(x - 24, y - 10, 30, 1).fill({ color: 0xFFEDD5, alpha: fade });
    g.rect(x - 16, y + 16, 32, 2).fill({ color: 0xF97316, alpha: 0.6 * fade });
  });
  slashFx(h, tl, HIT - 1, { x: c.x - 8, y: c.y - 8, r: 30, a0: -1.9, a1: 1.3, thick: 10, p: P_FORGE, dur: 10 });
  hitFx(h, tl, HIT, c, P_FORGE, 20, [0xF97316, 0xFFEDD5, 0xFBBF24, 0xFFFFFF]);
  ringFx(h, tl, HIT, { x: t0.x, y: t0.y }, 6, 90, 0xF97316, 18, 4);
  crackFx(h, tl, HIT, { x: t0.x - 30, y: t0.y + 2 }, { x: t0.x + 30, y: t0.y - 2 }, P_FORGE, 6, 40);
  tl.at(HIT, () => {
    land(h, 0, { scale: 1.2, tint: 0xFFB37A, flash: 0xFFD7B0, burst: 'crater', burstSize: 1.2 });
    h.sound('block', { rate: 0.55 }); // anvil ring
    h.camera(1.28, t0.x - 10, c.y, 10, true);
    h.knock(0, 6, -8);
    h.stretch(1.1, 0.92);
    shards(h, c, 16);
    h.sparks(c.x, c.y, 20, [0xF97316, 0xFBBF24, 0xFFFFFF]);
    debris(h, { x: t0.x, y: t0.y }, 10, [0x3F3F46, 0x71717A, 0xF97316]);
  });
  tl.during(HIT, HIT + 6, (t) => h.stretch(lerp(1.1, 1, t), lerp(0.92, 1, t)));
  tl.at(HIT + 8, () => h.animSpeed(1));
  backstep(h, tl, HIT + 14, HIT + 32, 18);
  tl.at(HIT + 32, () => h.guard(0xF97316));
  tl.end(HIT + 36);
}

/** Stormbreaker Cleaver: charge lightning, blitz straight through the line, and the cut detonates after. */
function stormbreakerCleaver(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const far = Math.min(396, Math.max(...foes.map((t) => t.x)) + 30);
  const y = h.home.y - 24;
  const DASH = 24;
  const BURST = 40;
  tl.at(0, () => {
    h.anim('DASH', true);
    h.camera(1.22, h.home.x + 10, h.home.y - 28, 24);
    chargeSound(h, 24);
  });
  tl.during(0, DASH, (t) => h.dim(0.5 * t, 0x0A0502));
  drawSpan(h, tl, 0, DASH, (g, t, f) => {
    const k = kChest(h);
    for (let i = 0; i < 2 + Math.floor(t * 3); i++) {
      const a = hash(Math.floor(f) * 5 + i) * Math.PI * 2;
      bolt(g, k.x, k.y, k.x + Math.cos(a) * (14 + 10 * t), k.y + Math.sin(a) * (14 + 10 * t), 4, 4, P_STORM, 1.5, Math.floor(f) * 3 + i);
    }
  });
  tl.every(0, DASH, 4, () => {
    h.shake(2);
    h.sound('zap', { vol: 0.3, rate: rand(0.9, 1.4) });
  });
  // Blitz: crosses the field in 6 frames
  tl.at(DASH, () => {
    h.anim('ATTACK4');
    h.animSpeed(1.6);
    h.sound('dash');
    swingSound(h, true);
    h.camera(1.06, (h.home.x + far) / 2, y, 40);
  });
  travel(h, tl, DASH, DASH + 6, HOME, { x: far - h.home.x, y: 0 }, easeIn);
  ghostTrail(h, tl, DASH, DASH + 6, 0xEA580C, 1, 0.55);
  // The cut hangs in the air as a hairline, then detonates along its length
  drawSpan(h, tl, DASH + 2, BURST, (g, t) => {
    g.rect(h.home.x + 20, y - 1, far - h.home.x - 30, 2).fill({ color: 0xFDE68A, alpha: 0.6 + 0.4 * t });
    g.rect(h.home.x + 20, y - 0.5, far - h.home.x - 30, 1).fill({ color: 0xFFFFFF });
  });
  tl.at(BURST, () => h.sound('thunder', { vol: 0.8 }));
  drawSpan(h, tl, BURST, BURST + 12, (g, t, f) => {
    const w = lerp(16, 0, easeIn(t));
    lance(g, h.home.x + 10, y, far, y, w, P_STORM, 1 - t * 0.3);
    bolt(g, h.home.x + 20, y, far, y, 12, 10, P_STORM, 2, Math.floor(f / 2), 1 - t);
  });
  foes.forEach((t, i) => {
    const at = BURST + i * 3;
    hitFx(h, tl, at, chest(t), P_STORM, 18);
    tl.at(at, () => {
      land(h, i, { scale: 1.1, tint: 0xFFD08A, flash: 0xFFE7C2, burst: 'slash', burstSize: 1.3 });
      h.knock(i, 14, 8);
    });
  });
  tl.at(BURST, () => h.camera(1.2, (foes[0].x + far) / 2, y, 10, true));
  tl.during(BURST + 6, BURST + 22, (t) => h.dim(0.5 * (1 - t), 0x0A0502));
  tl.at(BURST + 12, () => {
    h.animSpeed(1);
    h.face(true);
    h.anim('RUN', true);
  });
  travel(h, tl, BURST + 12, BURST + 28, here(h), HOME, easeInOut, 10);
  tl.at(BURST + 28, () => {
    h.face(false);
    h.idle();
  });
  tl.end(BURST + 30);
}

// =============================================================================================
// SNATCH: explosive

/** Phoenix Ascension: burst skyward on wings of flame and dive onto the back row. */
function phoenixAscension(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const apex = { x: (h.home.x + t0.x) / 2 - h.home.x - 20, y: 0 };
  const DIVE = 24;
  const HIT = 32;
  tl.at(0, () => h.anim('JUMP_FRONT_START'));
  tl.during(0, 6, (t) => h.stretch(1 + 0.1 * t, 1 - 0.12 * t));
  tl.at(6, () => {
    h.stretch(0.9, 1.12);
    h.anim('JUMP_FRONT_UP');
    h.sound('jump');
    h.sound('fire');
    h.sound('screech', { rate: 1.4, vol: 0.35 }); // phoenix cry
    embers(h, h.pos(), 10);
  });
  travel(h, tl, 6, DIVE, HOME, apex, easeOut);
  tl.during(6, DIVE, (t) => h.lift(easeOut(t) * 42));
  ghostTrail(h, tl, 6, HIT, 0xEF4444, 2, 0.45);
  drawSpan(h, tl, 8, HIT + 2, (g, _t, f) => {
    const s = shoulders(h);
    const open = Math.min(1, (f + 1) / 6) * (1 - 0.2 * Math.sin(f * 0.6));
    wing(g, s.x, s.y, 36, -1, open, P_FIRE, 0.9);
    wing(g, s.x + 4, s.y - 2, 30, 1, open * 0.8, P_EMBER, 0.75);
  }, 'back');
  tl.every(8, HIT, 2, () => embers(h, kChest(h), 2));
  tl.at(14, () => h.sound('flap', { vol: 0.6 }));
  tl.at(HIT - 12, () => h.anim('ATTACK1'));
  tl.at(DIVE, () => h.sound('whistle', { rate: 1.6, vol: 0.5 }));
  tl.at(DIVE, () => h.camera(1.2, c.x, c.y, 24));
  travel(h, tl, DIVE, HIT, here(h), strikeSpot(h, t0, 34), easeIn);
  tl.during(DIVE, HIT, (t) => h.lift(lerp(42, 0, easeIn(t))));
  slashFx(h, tl, HIT - 1, { x: c.x - 4, y: c.y, r: 30, a0: -2.4, a1: 0.9, thick: 9, p: P_FIRE });
  hitFx(h, tl, HIT, c, P_FIRE, 20, FIRE);
  drawSpan(h, tl, HIT, HIT + 16, (g, t) => {
    wing(g, c.x, c.y, 46 * easeOut(t), -1, 1, P_FIRE, 1 - t);
    wing(g, c.x, c.y, 46 * easeOut(t), 1, 1, P_FIRE, 1 - t);
  });
  tl.at(HIT, () => {
    land(h, 0, { tint: 0xFF9C7A, flash: 0xFFD0B0, burst: 'fire', burstSize: 1.2 });
    h.knock(0, 12, 14);
    embers(h, c, 18);
  });
  ringFx(h, tl, HIT, { x: t0.x, y: t0.y }, 6, 70, 0xEF4444, 16);
  backstep(h, tl, HIT + 10, HIT + 30, 36);
  tl.end(HIT + 32);
}

/** Solar Talon: call down a sun, rise into it, and fall as a burning talon. The biggest single hit. */
function solarTalon(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const sunAt = { x: h.home.x + 10, y: h.home.y - 86 };
  const RISE = 30;
  const DIVE = 52;
  const HIT = 58;
  tl.at(0, () => {
    h.anim('SKILL2TULUC');
    h.camera(1.22, h.home.x + 16, h.home.y - 52, 50);
    h.sound('holy', { rate: 0.7 });
  });
  tl.during(0, 18, (t) => h.dim(0.65 * t, 0x1A0303));
  // The sun gathers above him
  drawSpan(h, tl, 4, HIT + 2, (g, _t, f) => {
    const sunR = f < 30 ? lerp(2, 18, easeOut(f / 30)) : f > HIT - 14 ? Math.max(0, lerp(18, 0, (f - (HIT - 14)) / 12)) : 18;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + f * 0.04;
      const len = sunR * (1.6 + 0.4 * Math.sin(f * 0.5 + k));
      g.moveTo(sunAt.x + Math.cos(a) * sunR, sunAt.y + Math.sin(a) * sunR)
        .lineTo(sunAt.x + Math.cos(a) * len, sunAt.y + Math.sin(a) * len)
        .stroke({ width: 2, color: k % 2 ? GOLD : EMBER, alpha: 0.85 });
    }
    orb(g, sunAt.x, sunAt.y, sunR, pal(0xF59E0B, 0xFFFBEB, BLOOD_DARK));
    g.circle(sunAt.x, sunAt.y, sunR + 4 + Math.sin(f * 0.7) * 2).stroke({ width: 1, color: GOLD, alpha: 0.5 });
  });
  chargeFx(h, tl, 4, RISE, () => sunAt, P_SUN, 70, 16);
  tl.every(4, RISE, 4, (i) => h.shake(1 + i * 0.3));
  // Rise into the sun
  tl.at(RISE, () => {
    h.anim('JUMP_FRONT_START');
    h.stretch(1.12, 0.88);
  });
  tl.at(RISE + 4, () => {
    h.stretch(0.88, 1.14);
    h.anim('JUMP_FRONT_UP');
    h.sound('jump');
    h.sound('fire', { rate: 0.8 });
    debris(h, h.pos(), 10, FIRE);
  });
  tl.at(RISE + 10, () => h.stretch(1, 1));
  tl.during(RISE + 4, RISE + 14, (t) => h.lift(easeOut(t) * 44));
  ghostTrail(h, tl, RISE + 4, RISE + 14, 0xF59E0B, 1, 0.5);
  tl.at(RISE + 10, () => h.tint(0xFFD9A0));
  // Overhead wind-up at the apex (ATTACK4 sweeps at f12, on the hit frame)
  tl.at(HIT - 12, () => {
    h.anim('ATTACK4');
    h.sound('whistle', { rate: 1.2 });
    swingSound(h, true, { delay: 0.12 });
    h.camera(1.06, (h.home.x + t0.x) / 2, h.home.y - 50, 20);
  });
  travel(h, tl, DIVE, HIT, here(h), strikeSpot(h, t0, 34), easeIn);
  tl.during(DIVE, HIT, (t) => h.lift(lerp(44, 0, easeIn(t))));
  drawSpan(h, tl, DIVE, HIT + 3, (g, t) => {
    const p = kChest(h);
    lance(g, p.x, p.y, sunAt.x, sunAt.y, 12 * (1 - t * 0.5), P_SUN, 0.85);
  });
  // Contact: three burning talon rakes
  drawSpan(h, tl, HIT, HIT + 14, (g, t, f) => {
    const reach = Math.min(1, f / 3);
    const fade = 1 - Math.max(0, (t - 0.3) / 0.7);
    for (let k = -1; k <= 1; k++) {
      const x0 = c.x - 26 + k * 10;
      const y0 = c.y - 30;
      lance(g, x0, y0, lerp(x0, x0 + 40, reach), lerp(y0, y0 + 56, reach), 9, P_FIRE, fade);
    }
  });
  hitFx(h, tl, HIT, c, P_SUN, 32, [GOLD, EMBER, BLOOD, 0xFFFFFF]);
  ringFx(h, tl, HIT, { x: t0.x, y: t0.y }, 10, 150, 0xF59E0B, 26, 5);
  ringFx(h, tl, HIT + 3, { x: t0.x, y: t0.y }, 6, 90, 0xFFFBEB, 20, 2);
  drawSpan(h, tl, HIT, HIT + 60, (g, t) => scorch(g, t0.x, t0.y, 26, BLOOD, 1 - t), 'ground');
  tl.at(HIT, () => {
    h.tint(0xFFFFFF);
    h.anim('LANDING_END');
    land(h, 0, { scale: 1.2, tint: 0xFFE0A0, flash: 0xFFF3D6, burst: 'fire', burstSize: 1.3, sfx: 'claw' });
    h.sound('explosion', { vol: 0.7 });
    h.camera(1.36, c.x, c.y, 14, true);
    h.knock(0, 22, 14);
    embers(h, c, 26);
    debris(h, { x: t0.x, y: t0.y }, 16, [...DIRT, EMBER]);
  });
  tl.every(HIT + 4, HIT + 34, 3, () => embers(h, { x: t0.x + rand(-40, 40), y: 60 + rand(0, 30) }, 2));
  tl.during(HIT + 16, HIT + 40, (t) => h.dim(0.65 * (1 - t), 0x1A0303));
  backstep(h, tl, HIT + 20, HIT + 40, 24);
  tl.end(HIT + 44);
}

// =============================================================================================
// WINDMILL: slow, controlled, defensive

/** Astral Spire: drive the blade down; a jade seam races to the foe and a crystal spire impales it. */
function astralSpire(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const ERUPT = 20;
  tl.at(0, () => {
    h.anim('SKILL1');
    swingSound(h);
  });
  tl.at(6, () => {
    h.sound('stomp', { vol: 0.6, rate: 1.2 });
    h.shake(4);
    dust(h, { x: kBlade(h).x, y: h.home.y }, 4, 1);
  });
  ringFx(h, tl, 6, () => ({ x: h.pos().x + 20, y: h.pos().y }), 4, 30, 0x00EB88, 12);
  crackFx(h, tl, 6, { x: h.home.x + 22, y: h.home.y }, { x: t0.x, y: t0.y }, P_JADE, ERUPT - 6, 40);
  drawSpan(h, tl, ERUPT, ERUPT + 30, (g, t, f) => {
    const up = f < 4 ? easeOut(f / 4) : t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
    crystal(g, t0.x - 12, t0.y + 3, 24 * up, 6, P_JADE, -6);
    crystal(g, t0.x + 12, t0.y + 2, 30 * up, 6, P_JADE, 6);
    crystal(g, t0.x, t0.y + 4, 62 * up, 10, P_JADE, 2);
  });
  tl.at(ERUPT, () => {
    land(h, 0, { tint: 0xA7F3D0, flash: 0xC6FFE6, sfx: 'stab' });
    h.sound('ice', { rate: 0.9, vol: 0.7 }); // crystal spire
    h.knock(0, 2, 22);
    h.camera(1.18, t0.x, t0.y - 30, 16);
    shards(h, { x: t0.x, y: t0.y - 20 }, 10);
  });
  hitFx(h, tl, ERUPT, () => chest(t0), P_JADE, 14);
  tl.at(ERUPT + 22, () => h.emit(t0.x, t0.y - 24, { count: 14, colors: [0x00EB88, 0xE8FFF5, 0x6EE7B7], speed: [1, 3], spread: Math.PI, gravity: 0.15, size: 3, life: [14, 24] }));
  // A ring of small crystals rises around the knight as his ward
  tl.at(ERUPT + 4, () => h.anim('DEFENSE'));
  tl.at(ERUPT + 6, () => h.sound('frost', { rate: 1.3, vol: 0.5 }));
  drawSpan(h, tl, ERUPT + 6, ERUPT + 36, (g, t, f) => {
    const p = h.pos();
    const up = f < 5 ? easeOut(f / 5) : t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
    crystal(g, p.x - 18, p.y + 2, 14 * up, 4, P_JADE, -3, 0.9);
    crystal(g, p.x + 20, p.y + 2, 16 * up, 4, P_JADE, 3, 0.9);
    crystal(g, p.x + 2, p.y + 6, 10 * up, 4, P_JADE, 0, 0.9);
  });
  tl.at(ERUPT + 8, () => h.guard(0x00EB88));
  tl.end(ERUPT + 38);
}

/** Cosmic Ward: draw a constellation around the knight, heal in its light, and loose a comet from it. */
function cosmicWard(h: KnightMoveHost, tl: Timeline) {
  const c = chest(h.target);
  const stars = [[-30, -50], [-12, -70], [14, -64], [32, -44], [24, -16], [-26, -14]] as const;
  const FIRE_AT = 34;
  tl.at(0, () => {
    h.anim('SKILL2TULUC');
    h.camera(1.14, h.home.x + 30, h.home.y - 40, 44);
    h.sound('magic', { rate: 0.8 });
  });
  tl.during(0, 14, (t) => h.dim(0.5 * t, 0x02130C));
  tl.every(4, 28, 4, (i) => h.sound('ui_move', { rate: 1 + i * 0.12, vol: 0.8 })); // stars wink on
  drawSpan(h, tl, 4, FIRE_AT + 26, (g, t, f) => {
    const p = h.pos();
    const fade = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
    const shown = Math.min(stars.length, Math.floor(f / 4) + 1);
    for (let i = 0; i < shown; i++) {
      const [sx, sy] = stars[i];
      if (i > 0) {
        const [px, py] = stars[i - 1];
        g.moveTo(p.x + px, p.y + py).lineTo(p.x + sx, p.y + sy).stroke({ width: 1, color: 0xD1FAE5, alpha: 0.7 * fade });
      }
      starburst(g, p.x + sx, p.y + sy, 3 + Math.sin(f * 0.4 + i), 4, f * 0.05, P_EMERALD, fade);
    }
    // Orbit ring with three motes
    const r = 34;
    g.ellipse(p.x + 2, p.y - 28, r, r * 0.35).stroke({ width: 1, color: 0x10B981, alpha: 0.6 * fade });
    for (let k = 0; k < 3; k++) {
      const a = f * 0.12 + (k * Math.PI * 2) / 3;
      orb(g, p.x + 2 + Math.cos(a) * r, p.y - 28 + Math.sin(a) * r * 0.35, 2, P_EMERALD, fade);
    }
  });
  motesFx(h, tl, 10, FIRE_AT + 20, () => h.pos(), [0x10B981, 0xD1FAE5, 0xFFFFFF], 3, 20);
  // Comet from the top star
  projectile(h, tl, FIRE_AT, 14, () => ({ x: h.pos().x - 12, y: h.pos().y - 70 }), () => c, 18,
    (g, x, y, _t, f) => {
      orb(g, x, y, 6, P_EMERALD);
      starburst(g, x, y, 9, 4, f * 0.3, P_EMERALD, 0.6);
    },
    () => {
      land(h, 0, { tint: 0xA7F3D0, flash: 0xD1FAE5, sfx: 'explosion' });
      h.knock(0, 10, 4);
    },
    (x, y) => h.emit(x, y, { count: 2, colors: [0x10B981, 0xD1FAE5, 0xFFFFFF], speed: [0.2, 0.6], spread: Math.PI, gravity: 0, size: 2, life: [10, 18] }));
  tl.at(FIRE_AT, () => {
    h.sound('shoot', { rate: 0.7 });
    h.sound('fire', { rate: 1.5, vol: 0.5 });
  });
  tl.at(14, () => h.sound('heal', { vol: 0.7 }));
  hitFx(h, tl, FIRE_AT + 14, c, P_EMERALD, 18);
  tl.at(FIRE_AT + 16, () => {
    h.anim('DEFENSE');
    h.guard(0x10B981);
  });
  tl.during(FIRE_AT + 16, FIRE_AT + 30, (t) => h.dim(0.5 * (1 - t), 0x02130C));
  tl.end(FIRE_AT + 32);
}

// =============================================================================================
// DEADLIFT: rooted strength

/** Root of Titans: the blade sinks into the soil; roots tear along the ground and burst up under the foe. */
function rootOfTitans(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const ERUPT = 22;
  tl.at(0, () => {
    h.anim('SKILL1');
    swingSound(h);
  });
  tl.at(6, () => {
    h.sound('stomp', { vol: 0.6 });
    h.sound('crack', { delay: 0.05, vol: 0.7 });
    h.shake(5);
    dust(h, { x: kBlade(h).x, y: h.home.y }, 6, 1);
  });
  // Roots snake along the ground toward the foe
  drawSpan(h, tl, 6, ERUPT + 26, (g, t, f) => {
    const x0 = h.home.x + 24;
    const reach = Math.min(1, f / (ERUPT - 6));
    const fade = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
    const n = 10;
    for (let k = 0; k < 2; k++) {
      const path = () => {
        g.moveTo(x0, h.home.y + k * 3);
        for (let i = 1; i <= n * reach; i++) {
          g.lineTo(lerp(x0, t0.x, i / n), lerp(h.home.y, t0.y, i / n) + Math.sin(i * 1.7 + k * 2) * 3 + k * 3);
        }
      };
      path();
      g.stroke({ width: 5 - k, color: INK, alpha: fade });
      path();
      g.stroke({ width: 3 - k, color: k ? 0x84CC16 : 0x5C2B14, alpha: fade });
    }
  }, 'ground');
  // Root spike and a whipping vine under the foe
  drawSpan(h, tl, ERUPT, ERUPT + 30, (g, t, f) => {
    const up = f < 4 ? easeOut(f / 4) : t > 0.65 ? 1 - (t - 0.65) / 0.35 : 1;
    spike(g, t0.x - 16, t0.y + 4, 40 * up, 9, 0x3F2A14, 0x5C2B14, 0x84CC16);
    spike(g, t0.x + 14, t0.y + 4, 46 * up, 9, 0x3F2A14, 0x5C2B14, 0x84CC16);
    spike(g, t0.x, t0.y + 6, 70 * up, 13, 0x5C2B14, 0x8B5A2B, 0xBEF264);
    if (f < 12) {
      crescent(g, t0.x - 6, t0.y - 34, 28, -2.8 + f * 0.25, -0.6 + f * 0.25, 6, P_LIME, 1 - f / 12);
      crescent(g, t0.x + 4, t0.y - 24, 22, 0.4 - f * 0.25, 2.4 - f * 0.25, 5, P_LIME, 1 - f / 12);
    }
  });
  tl.at(ERUPT, () => {
    land(h, 0, { tint: 0xD9F99D, flash: 0xECFCCB, sfx: 'wood' });
    h.sound('lash', { vol: 0.7 });
    h.knock(0, 6, 18);
    h.emit(t0.x, t0.y - 20, { count: 12, colors: [0x84CC16, 0x4D7C0F, 0xBEF264], speed: [1, 3], spread: Math.PI, gravity: 0.08, size: 2, life: [18, 30] });
    debris(h, { x: t0.x, y: t0.y }, 8);
  });
  hitFx(h, tl, ERUPT, () => chest(t0), P_LIME, 13);
  // Bark ward and sap healing around the knight
  tl.at(ERUPT + 6, () => {
    h.anim('DEFENSE');
    h.sound('wood', { rate: 0.7, vol: 0.6 });
  });
  tl.at(ERUPT + 8, () => h.sound('heal', { vol: 0.6 }));
  drawSpan(h, tl, ERUPT + 6, ERUPT + 34, (g, t, f) => {
    const p = h.pos();
    const up = f < 6 ? easeOut(f / 6) : t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
    for (let k = 0; k < 4; k++) spike(g, p.x - 22 + k * 15, p.y + 4, (12 + (k % 2) * 6) * up, 4, 0x5C2B14, 0x8B5A2B, 0x84CC16);
  });
  motesFx(h, tl, ERUPT + 6, ERUPT + 30, () => h.pos(), [0x84CC16, 0xD9F99D, 0xFFFFFF], 3, 16);
  tl.at(ERUPT + 10, () => h.guard(0x84CC16));
  tl.end(ERUPT + 36);
}

/** Mountain Sunder: drag the blade through the earth, then heave, and a ridge of mountains splits the line. */
function mountainSunder(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const DRAG = 16;
  const HEAVE = 34;
  const RIDGE = HEAVE + 12; // ATTACK2 sweep
  const x0 = h.home.x + 76;
  const x1 = Math.max(...foes.map((t) => t.x)) + 26;
  tl.at(0, () => {
    h.anim('SKILL1');
    h.camera(1.2, h.home.x + 20, h.home.y - 26, DRAG + 10);
    swingSound(h);
  });
  tl.during(0, DRAG, (t) => h.dim(0.5 * t, 0x140A02));
  tl.at(6, () => {
    h.sound('stomp', { vol: 0.7 });
    h.shake(6);
    debris(h, { x: kBlade(h).x, y: h.home.y }, 8);
  });
  tl.every(6, HEAVE, 2, () => h.shake(2));
  tl.every(6, DRAG, 2, () => h.emit(h.pos().x + rand(-30, 60), h.home.y, { count: 1, colors: DIRT, speed: [0.5, 1.4], angle: -Math.PI / 2, spread: 0.3, gravity: 0.2, size: 2, life: [8, 14] }));
  // Drag forward: sparks pour off the blade, a molten furrow opens behind it
  tl.at(DRAG, () => {
    h.sound('quake', { rate: 1.2, vol: 0.6 });
    h.sound('crack', { rate: 0.9, vol: 0.6 });
    h.anim('RUN', true);
    h.animSpeed(0.7);
  });
  travel(h, tl, DRAG, HEAVE, HOME, { x: 50, y: 0 }, easeInOut);
  tl.every(DRAG, HEAVE, 1, () => h.emit(h.pos().x + 22, h.home.y - 2, { count: 2, colors: [0xF97316, 0xFBBF24, 0xFFFFFF], speed: [1, 3], angle: Math.PI + 0.5, spread: 0.5, gravity: 0.15, size: 2, life: [8, 16] }));
  drawSpan(h, tl, DRAG, RIDGE + 50, (g, t) => {
    const end = Math.min(h.pos().x + 22, h.home.x + 72);
    const fade = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
    if (end <= h.home.x + 22) return;
    g.rect(h.home.x + 22, h.home.y - 1, end - h.home.x - 22, 3).fill({ color: INK, alpha: 0.9 * fade });
    g.rect(h.home.x + 22, h.home.y, end - h.home.x - 22, 1).fill({ color: 0xF97316, alpha: fade });
  }, 'ground');
  // Heave: ATTACK2 sweeps upward on RIDGE
  tl.at(HEAVE, () => {
    h.animSpeed(1);
    h.anim('ATTACK2');
    h.stretch(1.08, 0.94);
    swingSound(h, true);
  });
  tl.at(RIDGE, () => {
    h.stretch(0.92, 1.1);
    h.camera(1.06, (x0 + x1) / 2, h.home.y - 40, 50);
  });
  tl.during(RIDGE, RIDGE + 8, (t) => h.stretch(lerp(0.92, 1, t), lerp(1.1, 1, t)));
  // The ridge: spires erupt in sequence along the line, tallest at the foes
  const n = 7;
  for (let k = 0; k < n; k++) {
    const x = lerp(x0, x1, k / (n - 1));
    const near = Math.min(...foes.map((t) => Math.abs(t.x - x)));
    const hgt = 30 + Math.max(0, 50 - near);
    const at = RIDGE + k * 2;
    drawSpan(h, tl, at, RIDGE + 40, (g, t, f) => {
      const up = f < 4 ? easeOut(f / 4) : t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
      spike(g, x + 8, h.home.y + 6, hgt * 0.55 * up, 9, 0x2A1C0E, 0x5C3D1E, 0xFBBF24);
      spike(g, x, h.home.y + 8, hgt * up, 12, 0x3F2A14, 0x7A5230, 0xFBBF24);
      // Molten seam up the spire's face
      g.moveTo(x - 2, h.home.y + 6).lineTo(x - 1, h.home.y + 8 - hgt * up * 0.8).stroke({ width: 1.5, color: 0xF97316, alpha: 0.9 * up });
    });
    tl.at(at, () => {
      debris(h, { x, y: h.home.y }, 5, [...DIRT, 0xD97706]);
      h.sound('rock', { vol: 0.5, rate: 1.2 - k * 0.05 });
      h.shake(6);
    });
  }
  foes.forEach((t, i) => {
    const k = Math.round(((t.x - x0) / (x1 - x0)) * (n - 1));
    const at = RIDGE + Math.max(0, k) * 2;
    hitFx(h, tl, at, chest(t), P_AMBER, 22, [0xD97706, 0xFEF3C7, 0xFFFFFF]);
    tl.at(at, () => {
      land(h, i, { scale: i === 0 ? 1.15 : 0.9, tint: 0xFDE68A, flash: 0xFFF1D0, burst: 'quake', burstSize: i === 0 ? 1.3 : 1 });
      if (i === 0) h.camera(1.3, t.x, t.y - 30, 10, true);
      h.knock(i, 10, 32);
      shards(h, chest(t), 14);
      debris(h, { x: t.x, y: t.y }, 14, [...DIRT, 0xD97706], 1.3);
    });
  });
  tl.during(RIDGE + 24, RIDGE + 42, (t) => h.dim(0.5 * (1 - t), 0x140A02));
  backstep(h, tl, RIDGE + 24, RIDGE + 42, 20);
  tl.end(RIDGE + 44);
}

// =============================================================================================
// THRUSTER: full-body, exhausting

/** Solar Eruption: squat, drive up, and hurl a meteor over the front line onto the back row. */
function solarEruption(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const LAUNCH = 20;
  const FLIGHT = 22;
  const HIT = LAUNCH + FLIGHT;
  tl.at(0, () => {
    h.anim('JUMP_FRONT_START');
    chargeSound(h, 20, 0.6);
  });
  tl.during(0, 8, (t) => h.stretch(1 + 0.12 * t, 1 - 0.14 * t));
  tl.at(8, () => {
    h.stretch(0.9, 1.12);
    h.anim('SKILL2TULUC');
  });
  tl.during(8, 20, (t) => h.lift(arc(t) * 14));
  tl.during(8, 14, (t) => h.stretch(lerp(0.9, 1, t), lerp(1.12, 1, t)));
  drawSpan(h, tl, 8, LAUNCH, (g, t, f) => {
    const tip = kRaised(h);
    orb(g, tip.x, tip.y, 2 + 8 * t, pal(0xF59E0B, 0xFFFBEB, BLOOD_DARK));
    starburst(g, tip.x, tip.y, 6 + 8 * t, 6, f * 0.3, P_SUN, 0.6);
  });
  tl.at(LAUNCH, () => {
    h.sound('fire');
    swingSound(h, true);
    h.shake(4);
    h.camera(1.1, (h.home.x + t0.x) / 2, h.home.y - 60, FLIGHT + 6);
  });
  projectile(h, tl, LAUNCH, FLIGHT, () => kRaised(h), () => c, 80,
    (g, x, y, _t, f) => {
      orb(g, x, y, 9, pal(0xF59E0B, 0xFFFBEB, BLOOD_DARK));
      starburst(g, x, y, 13, 7, f * 0.4, P_FIRE, 0.75);
    },
    () => undefined,
    (x, y) => h.emit(x, y, { count: 3, colors: FIRE, speed: [0.3, 1.2], spread: Math.PI, gravity: -0.02, size: 3, life: [10, 20] }));
  tl.at(LAUNCH + 8, () => h.sound('whistle', { rate: 0.9, vol: 0.6 }));
  hitFx(h, tl, HIT, c, P_FIRE, 26, FIRE);
  ringFx(h, tl, HIT, { x: t0.x, y: t0.y }, 8, 110, 0xF59E0B, 20, 4);
  drawSpan(h, tl, HIT, HIT + 50, (g, t) => scorch(g, t0.x, t0.y, 20, EMBER, 1 - t), 'ground');
  tl.at(HIT, () => {
    land(h, 0, { tint: 0xFFC48A, flash: 0xFFE2B8, burst: 'explosion', burstSize: 1.4 });
    h.camera(1.22, t0.x, c.y, 10, true);
    h.knock(0, 10, 12);
    embers(h, c, 20);
    smoke(h, { x: t0.x, y: t0.y - 10 }, 8);
  });
  tl.at(HIT + 8, () => h.guard(0xF59E0B));
  tl.end(HIT + 20);
}

/** Supernova Surge: levitate, gather a star on the blade, collapse it, and the nova sweeps every foe. */
function supernovaSurge(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const NOVA = 38;
  const nova = once(() => kRaised(h));
  tl.at(0, () => {
    h.anim('SKILL2TULUC');
    h.camera(1.18, h.home.x + 20, h.home.y - 50, NOVA);
    h.sound('holy', { rate: 0.6 });
  });
  tl.during(0, 30, (t) => {
    h.lift(easeOut(t) * 22);
    h.dim(0.7 * t, 0x120800);
  });
  chargeFx(h, tl, 4, 30, () => kRaised(h), P_SUN, 80, 18);
  tl.every(4, NOVA, 3, (i) => h.shake(1 + i * 0.25));
  drawSpan(h, tl, 8, NOVA, (g, _t, f) => {
    const tip = kRaised(h);
    const r = f < 22 ? lerp(2, 14, easeOut(f / 22)) : lerp(14, 4, easeIn(Math.min(1, (f - 22) / (NOVA - 30))));
    orb(g, tip.x, tip.y, r, pal(0xFDE68A, 0xFFFFFF, 0x7C2D12));
    starburst(g, tip.x, tip.y, r * 1.6, 8, f * 0.2, P_SUN, 0.7);
  });
  tl.at(NOVA, () => {
    h.flash(0.45);
    h.hitStop(4);
    h.shake(12);
    h.sound('explosion', { rate: 0.8 });
    h.sound('thunder', { vol: 0.6 });
    h.camera(1, 213, 150, 30);
  });
  // Nova shell expands across the battlefield; each foe is hit as it passes
  drawSpan(h, tl, NOVA, NOVA + 26, (g, t, f) => {
    const center = nova();
    const r = lerp(6, 320, easeOut(t));
    g.circle(center.x, center.y, r).stroke({ width: 10 * (1 - t) + 2, color: 0xF59E0B, alpha: 0.85 * (1 - t) });
    g.circle(center.x, center.y, r).stroke({ width: 3, color: 0xFFFBEB, alpha: 1 - t });
    g.circle(center.x, center.y, r * 0.9).fill({ color: 0xFDE68A, alpha: 0.12 * (1 - t) });
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2 + f * 0.01;
      g.moveTo(center.x + Math.cos(a) * r * 0.3, center.y + Math.sin(a) * r * 0.3)
        .lineTo(center.x + Math.cos(a) * r, center.y + Math.sin(a) * r)
        .stroke({ width: 1, color: 0xFFFBEB, alpha: 0.5 * (1 - t) });
    }
  });
  ringFx(h, tl, NOVA, () => ({ x: nova().x, y: h.home.y }), 10, 260, 0xF59E0B, 26, 4);
  foes.forEach((t, i) => {
    const at = NOVA + 3 + i * 2;
    hitFx(h, tl, at, chest(t), P_SUN, 18, [GOLD, 0xFFFBEB, 0xFFFFFF]);
    tl.at(at, () => {
      land(h, i, { scale: 0.85, tint: 0xFFE6A0, flash: 0xFFF7D6, burst: 'explosion', burstSize: 1.2 });
      h.knock(i, 18, 10);
      embers(h, chest(t), 8);
    });
  });
  tl.during(NOVA + 10, NOVA + 30, (t) => {
    h.lift(lerp(22, 0, easeInOut(t)));
    h.dim(0.7 * (1 - t), 0x120800);
  });
  tl.end(NOVA + 32);
}

// =============================================================================================
// GORILLA ROW: savage, tearing pulls

/** Beast Maw: lunge with a savage hook while a spectral beast's jaws slam shut on the foe. */
function beastMaw(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const BITE = 14;
  tl.at(0, () => {
    h.anim('ATTACK2');
    h.sound('dash', { vol: 0.6 });
    h.sound('growl', { rate: 0.9, vol: 0.7 }); // the spectral beast
  });
  travel(h, tl, 0, 10, HOME, strikeSpot(h, t0, 54), easeIn);
  ghostTrail(h, tl, 2, 10, 0x84CC16, 2, 0.35);
  drawSpan(h, tl, 4, BITE + 10, (g, _t, f) => {
    const close = f < BITE - 8 ? 0 : Math.min(1, (f - (BITE - 8)) / 3);
    const fade = f > BITE - 4 ? 1 - (f - (BITE - 4)) / 14 : Math.min(1, f / 4);
    jaws(g, c.x, c.y, easeIn(close), 20, pal(0x4D7C0F, BONE, INK), fade);
  });
  hitFx(h, tl, BITE, c, P_LIME, 14);
  tl.at(BITE, () => {
    land(h, 0, { tint: 0xD9F99D, sfx: 'chomp' });
    h.knock(0, 10, 2);
    h.camera(1.22, c.x - 20, c.y, 12, true);
    h.emit(c.x, c.y, { count: 10, colors: [0x84CC16, 0xBEF264, BLOOD], speed: [1, 3], spread: Math.PI, gravity: 0.2, size: 2, life: [12, 20] });
  });
  // Second, tearing hook
  tl.at(BITE + 2, () => h.anim('ATTACK1'));
  slashFx(h, tl, BITE + 13, { x: c.x - 4, y: c.y, r: 24, a0: -2.2, a1: 0.6, thick: 6, p: P_LIME, dur: 8 });
  tl.at(BITE + 14, () => {
    h.flashTarget(0, 0xD9F99D, 4);
    h.knock(0, 6);
    h.shake(4);
    h.sparks(c.x, c.y, 8, [0x84CC16, 0xF7FEE7]);
    h.sound('claw', { vol: 0.7 });
  });
  backstep(h, tl, BITE + 20, BITE + 36, 14);
  tl.at(BITE + 36, () => h.guard(0x84CC16));
  tl.end(BITE + 40);
}

/** Shadow Ripper: melt into shadow and blink from foe to foe, tearing with X-cuts, then re-form at home. */
function shadowRipper(h: KnightMoveHost, tl: Timeline) {
  const hits = h.targets.length ? [...h.targets] : [h.target, h.target, h.target, h.target];
  const STEP = 12;
  const START = 10;
  tl.at(0, () => {
    h.anim('DASH');
    h.camera(1.1, 260, h.home.y - 30, START + hits.length * STEP + 10);
  });
  tl.during(0, START, (t) => {
    h.alpha(1 - t);
    h.dim(0.4 * t, 0x0B0712);
  });
  tl.at(2, () => h.sound('dark', { rate: 1.4, vol: 0.6 }));
  tl.at(2, () => smoke(h, kChest(h), 12, [...SHADOW, 0x1A2E05]));
  hits.forEach((t, k) => {
    const at = START + k * STEP;
    const c = chest(t);
    tl.at(at, () => {
      const side = k % 2 ? -34 : 34;
      h.offset(t.x - side - h.home.x, t.y - h.home.y);
      h.face(k % 2 === 1);
      h.alpha(1);
      h.anim('SKILL1');
      smoke(h, kChest(h), 6, [...SHADOW, 0x1A2E05]);
      h.sound('portal', { rate: 1.6, vol: 0.5 });
      swingSound(h, false, { rate: 1.1 });
    });
    // X-cut on SKILL1's chop
    slashFx(h, tl, at + 5, { x: c.x, y: c.y, r: 20, a0: -2.4, a1: 0.4, thick: 5, p: P_SHADOW, dur: 7 });
    slashFx(h, tl, at + 6, { x: c.x, y: c.y, r: 20, a0: -0.7, a1: 2.3, thick: 5, p: P_SHADOW, dur: 7 });
    tl.at(at + 6, () => {
      if (h.targets.length) land(h, k, { scale: 0.7, tint: 0xB5E06A });
      else {
        h.shake(5);
        h.sound('slash');
      }
      h.knock(k, k % 2 ? -6 : 6, 3);
      h.emit(c.x, c.y, { count: 6, colors: [...SHADOW, 0x65A30D], speed: [1, 2.5], spread: Math.PI, gravity: 0.05, size: 2, life: [12, 20] });
    });
    tl.at(at + 10, () => {
      smoke(h, kChest(h), 6, [...SHADOW, 0x1A2E05]);
      h.alpha(0);
    });
  });
  const END = START + hits.length * STEP;
  tl.at(END, () => h.sound('portal', { rate: 1.3, vol: 0.5 }));
  tl.at(END, () => {
    h.offset(0, 0);
    h.face(false);
    h.idle();
    smoke(h, kChest(h), 10, [...SHADOW, 0x1A2E05]);
  });
  tl.during(END, END + 8, (t) => {
    h.alpha(t);
    h.dim(0.4 * (1 - t), 0x0B0712);
  });
  tl.end(END + 10);
}

// =============================================================================================
// HALO: mobility, protection

/** Celestial Barrier: a halo kindles over the knight, drops into a dome, and fires a light lance. */
function celestialBarrier(h: KnightMoveHost, tl: Timeline) {
  const c = chest(h.target);
  const DROP = 22;
  const LANCE = 30;
  tl.at(0, () => {
    h.anim('BUFF');
    h.sound('holy');
  });
  drawSpan(h, tl, 0, DROP + 8, (g, _t, f) => {
    const p = h.pos();
    const y = f < DROP ? p.y - 56 : lerp(p.y - 56, p.y - 24, easeIn((f - DROP) / 8));
    const r = f < DROP ? 10 + 2 * Math.sin(f * 0.4) : lerp(12, 34, easeOut((f - DROP) / 8));
    g.ellipse(p.x + 2, y, r, r * 0.3).stroke({ width: 4, color: INK, alpha: 0.5 });
    g.ellipse(p.x + 2, y, r, r * 0.3).stroke({ width: 2, color: 0x818CF8 });
    g.ellipse(p.x + 2, y, r, r * 0.3).stroke({ width: 1, color: 0xEEF2FF });
    for (let k = 0; k < 4; k++) {
      const a = f * 0.2 + (k * Math.PI) / 2;
      g.rect(p.x + 2 + Math.cos(a) * r - 1, y + Math.sin(a) * r * 0.3 - 1, 2, 2).fill({ color: 0xFFFFFF });
    }
  });
  motesFx(h, tl, 4, DROP, () => ({ x: h.pos().x, y: h.pos().y - 50 }), [0x818CF8, 0xEEF2FF], 3, 8);
  tl.at(DROP + 8, () => {
    h.anim('DEFENSE');
    h.guard(0x818CF8);
  });
  // Lance of light from the dome to the foe
  tl.at(LANCE, () => h.sound('beam', { rate: 1.6, vol: 0.6 }));
  drawSpan(h, tl, LANCE, LANCE + 10, (g, t) => {
    const s = kChest(h);
    const reach = Math.min(1, t * 3);
    lance(g, s.x + 10, s.y - 4, lerp(s.x + 10, c.x + 10, reach), lerp(s.y - 4, c.y, reach), 12 * (1 - t * 0.5), P_INDIGO, 1 - t * 0.4);
    starburst(g, s.x + 10, s.y - 4, 8 * (1 - t), 6, t * 2, P_INDIGO, 1 - t);
  });
  hitFx(h, tl, LANCE + 3, c, P_INDIGO, 13);
  tl.at(LANCE + 3, () => {
    land(h, 0, { tint: 0xC7D2FE, flash: 0xE0E7FF, sfx: 'stab' });
    h.knock(0, 8);
  });
  motesFx(h, tl, DROP + 8, LANCE + 24, () => h.pos(), [0x818CF8, 0xEEF2FF, 0xFFFFFF], 3, 18);
  tl.end(LANCE + 26);
}

/** Astral Vortex: a spinning sweep hurls a star-vortex into the pack that drags them in, then bursts. */
function astralVortex(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const cx = foes.reduce((s, t) => s + t.x, 0) / foes.length;
  const cy = foes.reduce((s, t) => s + chest(t).y, 0) / foes.length;
  const ARRIVE = 24;
  const BURST = 60;
  tl.at(0, () => {
    h.anim('ATTACK4');
    swingSound(h);
    h.sound('shoot', { rate: 0.6, delay: 0.2 });
  });
  slashFx(h, tl, 11, { x: h.home.x + 10, y: h.home.y - 24, r: 26, a0: -2.8, a1: 2.0, thick: 7, p: P_VIOLET, dur: 10 });
  projectile(h, tl, 12, ARRIVE - 12, () => kBlade(h), () => ({ x: cx, y: cy }), 16,
    (g, x, y, _t, f) => {
      orb(g, x, y, 6, P_VIOLET);
      crescent(g, x, y, 10, f * 0.5, f * 0.5 + 2, 3, P_VIOLET, 0.8);
    }, () => h.shake(5));
  tl.at(ARRIVE, () => {
    h.sound('spin', { rate: 0.55 });
    h.sound('dark', { rate: 1.2, vol: 0.5 });
    h.camera(1.12, cx, cy, BURST - ARRIVE + 10);
    h.dim(0.4, 0x150726);
  });
  // The vortex: spiralling arms, stars sucked inward
  drawSpan(h, tl, ARRIVE, BURST, (g, t, f) => {
    const grow = easeOut(Math.min(1, f / 8));
    // Spiral arms: each is a run of short crescents winding inward
    for (let k = 0; k < 3; k++) {
      const a0 = -f * 0.28 + (k * Math.PI * 2) / 3;
      for (let s = 0; s < 4; s++) {
        const r = (38 - s * 8) * grow;
        const a = a0 + s * 0.9;
        crescent(g, cx, cy, r, a, a + 1.1, 6 - s, k % 2 ? P_INDIGO : P_VIOLET, 0.9 - s * 0.12);
      }
    }
    orb(g, cx, cy, 5 + Math.sin(f * 0.6) * 1.5 + 4 * t, pal(0x2E1065, 0xFAF5FF, INK));
  });
  chargeFx(h, tl, ARRIVE, BURST, () => ({ x: cx, y: cy }), P_VIOLET, 70, 16);
  // Foes are dragged toward the eye and raked as they spin past
  tl.at(ARRIVE + 18, () => h.sound('spin', { rate: 0.65 }));
  tl.every(ARRIVE + 4, BURST - 4, 4, () => foes.forEach((t, i) => h.knock(i, Math.sign(cx - t.x) * 2.5, 1)));
  foes.forEach((t, i) => {
    const at = ARRIVE + 10 + i * 6;
    hitFx(h, tl, at, chest(t), P_VIOLET, 11);
    tl.at(at, () => land(h, i, { scale: 0.6, tint: 0xE9D5FF, burst: 'portal', burstSize: 0.8 }));
  });
  // Collapse and burst
  hitFx(h, tl, BURST, { x: cx, y: cy }, P_VIOLET, 30);
  ringFx(h, tl, BURST, { x: cx, y: h.home.y }, 8, 140, 0xC084FC, 20, 4);
  tl.at(BURST, () => {
    h.hitStop(5);
    h.shake(11);
    h.flash(0.35, 0xE9D5FF);
    h.sound('explosion', { rate: 0.9 });
    h.sound('portal', { rate: 0.6 });
    foes.forEach((t, i) => {
      h.knock(i, Math.sign(t.x - cx || 1) * 14, 10);
      h.flashTarget(i, 0xE9D5FF, 6);
    });
    h.emit(cx, cy, { count: 20, colors: [0xC084FC, 0xFAF5FF, 0x818CF8], speed: [2, 4.5], spread: Math.PI, gravity: 0.05, size: 2, life: [14, 26] });
  });
  tl.during(BURST, BURST + 14, (t) => h.dim(0.4 * (1 - t), 0x150726));
  tl.end(BURST + 16);
}

// =============================================================================================
// SINGLE-LEG RDL: balance and precision

/** Valkyrie Balance: spectral wings lift the knight into a gliding, needle-precise thrust. */
function valkyrieBalance(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const THRUST = 24; // ATTACK3 peaks at f14
  drawSpan(h, tl, 0, THRUST + 26, (g, t, f) => {
    const s = shoulders(h);
    const open = f < 8 ? easeOut(f / 8) : t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
    wing(g, s.x, s.y, 36, -1, open, pal(0xFFF1F7, 0xFFFFFF, 0x500724), 0.9);
    wing(g, s.x + 4, s.y - 2, 28, 1, open * 0.75, P_PINK, 0.7);
  }, 'back');
  tl.during(0, 10, (t) => h.lift(easeOut(t) * 10));
  tl.at(0, () => {
    h.sound('flap', { rate: 1.2 });
    h.sound('holy', { rate: 1.3, vol: 0.4 });
  });
  tl.every(0, THRUST + 20, 4, () => h.emit(kChest(h).x - 10, kChest(h).y, { count: 1, colors: [0xFFF1F7, 0xF9A8D4], speed: [0.2, 0.6], angle: Math.PI * 0.7, spread: 0.6, gravity: 0.02, size: 2, life: [20, 30] }));
  tl.at(10, () => {
    h.anim('ATTACK3');
    h.sound('dash', { vol: 0.6 });
    swingSound(h, false, { delay: 0.15 });
  });
  travel(h, tl, 10, THRUST - 2, HOME, strikeSpot(h, t0, 52), easeInOut);
  ghostTrail(h, tl, 10, THRUST, 0xEC4899, 3, 0.3);
  drawSpan(h, tl, THRUST, THRUST + 8, (g, t) => {
    const b = kBlade(h);
    const reach = Math.min(1, t * 3);
    lance(g, b.x - 4, b.y, lerp(b.x, c.x + 22, reach), c.y, 4, P_PINK, 1 - t * 0.5);
  });
  hitFx(h, tl, THRUST + 1, c, P_PINK, 12);
  tl.at(THRUST + 1, () => {
    land(h, 0, { tint: 0xFBCFE8, flash: 0xFFE4F1, sfx: 'stab' });
    h.knock(0, 12);
    h.emit(c.x, c.y, { count: 8, colors: [0xFFF1F7, 0xF9A8D4], speed: [1, 2.5], spread: Math.PI, gravity: 0.02, size: 2, life: [18, 28] });
  });
  travel(h, tl, THRUST + 10, THRUST + 26, here(h), HOME, easeInOut);
  tl.during(THRUST + 14, THRUST + 26, (t) => h.lift(lerp(10, 0, t)));
  tl.at(THRUST + 24, () => {
    h.anim('DEFENSE');
    h.guard(0xEC4899);
  });
  tl.end(THRUST + 30);
}

/** Crane Strike: a one-legged leap high over the line, a held breath at the apex, then a pinpoint dive. */
function craneStrike(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const APEX = 24;
  const DIVE = 34;
  const HIT = 41; // ATTACK5 from DIVE - 4 thrusts at f11
  const apex = { x: t0.x - 64 - h.home.x, y: 0 };
  tl.at(0, () => {
    h.anim('JUMP_FRONT_START');
    h.dim(0.35, 0x1A0610);
    chargeSound(h, 30, 0.4);
  });
  tl.during(0, 8, (t) => h.stretch(1 - 0.08 * t, 1 + 0.1 * t));
  tl.at(8, () => {
    h.stretch(1, 1);
    h.anim('JUMP_FRONT_UP');
    h.sound('jump');
    h.sound('flap', { rate: 1.1 });
  });
  travel(h, tl, 8, APEX, HOME, apex, easeOut);
  tl.during(8, APEX, (t) => h.lift(easeOut(t) * 44));
  drawSpan(h, tl, 8, DIVE, (g, _t, f) => {
    const s = shoulders(h);
    const open = Math.min(1, f / 6);
    wing(g, s.x, s.y, 38, -1, open, pal(0xFFFFFF, 0xFFF1F7, 0x3F0A23), 0.9);
    wing(g, s.x + 4, s.y - 2, 32, 1, open * 0.8, pal(0xFFFFFF, 0xFFF1F7, 0x3F0A23), 0.75);
  }, 'back');
  // The held breath: frame the knight hanging over the line, a glint on the blade
  tl.at(APEX + 2, () => h.sound('equip', { rate: 1.4, vol: 0.6 })); // blade glint
  tl.at(DIVE - 4, () => h.sound('whistle', { rate: 2 }));
  tl.at(APEX + 2, () => h.camera(1.22, kChest(h).x + 30, kChest(h).y + 10, 12, true));
  drawSpan(h, tl, APEX + 2, DIVE, (g, t) => starburst(g, kBlade(h).x, kBlade(h).y, 6 * arc(t), 4, 0, P_CRANE, 1));
  tl.at(DIVE - 4, () => h.anim('ATTACK5'));
  travel(h, tl, DIVE, HIT, here(h), strikeSpot(h, t0, 30), easeIn);
  tl.during(DIVE, HIT, (t) => h.lift(lerp(44, 0, easeIn(t))));
  drawSpan(h, tl, DIVE, HIT + 2, (g) => {
    const k = kBlade(h);
    lance(g, k.x - 50, k.y - 80, k.x, k.y, 3, P_CRANE, 0.8);
  });
  // Pinpoint: a needle-thin line punches through the foe
  drawSpan(h, tl, HIT, HIT + 12, (g, t) => lance(g, c.x - 40, c.y - 6, c.x + 46, c.y + 4, 4 * (1 - t) + 1, P_CRANE, 1 - t * 0.5));
  hitFx(h, tl, HIT, c, P_CRANE, 18, [0xDB2777, 0xFFFFFF, 0xF9A8D4]);
  tl.at(HIT, () => {
    h.anim('LANDING_END');
    land(h, 0, { scale: 1.1, tint: 0xFBCFE8, flash: 0xFFF1F7, sfx: 'stab' });
    h.camera(1.3, c.x, c.y, 10, true);
    h.knock(0, 16, 4);
    shards(h, c, 16);
    h.emit(c.x, c.y, { count: 10, colors: [0xFFFFFF, 0xF9A8D4], speed: [1, 3], spread: Math.PI, gravity: 0.02, size: 2, life: [20, 30] });
  });
  tl.during(HIT + 8, HIT + 24, (t) => h.dim(0.35 * (1 - t), 0x1A0610));
  backstep(h, tl, HIT + 12, HIT + 32, 40);
  tl.end(HIT + 34);
}

// =============================================================================================
// CLEAN: snapping hip drive

/** Iron Uppercut: a low dash, then a rising cut that launches the foe off its feet. */
function ironUppercut(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const HIT = 20; // ATTACK2 from f8 sweeps at f12
  tl.at(0, () => {
    h.anim('DASH');
    h.sound('dash');
  });
  tl.during(0, 8, (t) => h.stretch(1 + 0.1 * t, 1 - 0.1 * t));
  travel(h, tl, 0, 8, HOME, strikeSpot(h, t0, 56), easeIn);
  ghostTrail(h, tl, 0, 8, 0xFB923C, 2, 0.4);
  tl.every(0, 8, 3, () => dust(h, h.pos(), 2, -1));
  tl.at(8, () => {
    h.stretch(1, 1);
    h.anim('ATTACK2');
    swingSound(h);
  });
  slashFx(h, tl, HIT - 1, { x: c.x - 10, y: c.y + 4, r: 30, a0: 1.4, a1: -1.5, thick: 9, p: P_COPPER, dur: 10 });
  hitFx(h, tl, HIT, c, P_COPPER, 17);
  tl.at(HIT, () => {
    land(h, 0, { tint: 0xFFC9A0, flash: 0xFFE4CC });
    h.knock(0, 8, 40);
    h.camera(1.22, c.x - 10, c.y - 16, 14, true);
    h.streaks(c.x, c.y - 10, 30, [0xFB923C, 0xFFFFFF]);
  });
  tl.during(HIT, HIT + 10, (t) => h.lift(arc(t) * 18));
  backstep(h, tl, HIT + 12, HIT + 28, 14);
  tl.end(HIT + 30);
}

/** Ricochet Bell: hurl a glowing kettlebell that caroms from foe to foe, then swings back into his hand. */
function ricochetBell(h: KnightMoveHost, tl: Timeline) {
  const hits = h.targets.length ? [...h.targets] : [h.target, h.target, h.target];
  const THROW = 12; // ATTACK4 sweep
  const LEG = 10;
  tl.at(0, () => h.anim('ATTACK4'));
  chargeFx(h, tl, 2, THROW, () => kBlade(h), P_BELL, 22, 8);
  tl.at(THROW, () => {
    swingSound(h, true);
    h.sound('toss', { rate: 0.7 });
  });
  let from: () => P = () => kBlade(h);
  hits.forEach((t, k) => {
    const start = THROW + k * LEG;
    const prev = from;
    const c = chest(t);
    projectile(h, tl, start, LEG, prev, () => c, k === 0 ? 14 : 26,
      (g, x, y, _t, f) => kettlebell(g, x, y, 6, f * 0.6, 0xFACC15),
      () => {
        if (h.targets.length) land(h, k, { scale: 0.75, tint: 0xFEF08A, flash: 0xFFF7C2 });
        else h.shake(5);
        h.knock(k, 8, 6);
        h.sparks(c.x, c.y, 10, [0xFACC15, 0xFFFBEB, 0xFFFFFF]);
        h.sound('impact_metal', { rate: 0.9 + k * 0.12 }); // the bell tolls a little higher each bounce
      },
      (x, y) => h.emit(x, y, { count: 1, colors: [0xFACC15, 0xFFFBEB], speed: [0.1, 0.3], spread: Math.PI, gravity: 0, size: 2, life: [8, 12] }));
    // The bell tolls: concentric rings on each hit
    drawSpan(h, tl, start + LEG, start + LEG + 14, (g, tt) => {
      for (let r = 0; r < 2; r++) {
        g.circle(c.x, c.y, 8 + tt * 30 + r * 10).stroke({ width: 2 * (1 - tt) + 0.5, color: r ? 0xFFFBEB : 0xFACC15, alpha: 1 - tt });
      }
    });
    from = () => c;
  });
  const back = THROW + hits.length * LEG;
  projectile(h, tl, back, 14, from, () => kBlade(h), 40,
    (g, x, y, _t, f) => kettlebell(g, x, y, 6, -f * 0.5, 0xFACC15),
    () => {
      h.anim('DEFENSE');
      h.shake(3);
      h.sound('equip', { rate: 0.8 }); // caught
      h.sparks(kBlade(h).x, kBlade(h).y, 6, [0xFACC15, 0xFFFBEB]);
    });
  tl.at(THROW, () => h.camera(1.06, 250, h.home.y - 34, hits.length * LEG + 20));
  tl.end(back + 18);
}

// =============================================================================================
// LUNGE: stepping strikes

/** Lancer's Lunge: one long step and a thrust whose light-lance spears through the line. */
function lancersLunge(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const THRUST = 14; // ATTACK3 peak
  const end = Math.max(...foes.map((t) => t.x)) + 40;
  const y = h.home.y - 22;
  tl.at(0, () => {
    h.anim('ATTACK3');
    h.sound('dash');
  });
  travel(h, tl, 4, THRUST, HOME, { x: 64, y: 0 }, easeOut);
  ghostTrail(h, tl, 4, THRUST, 0x22D3EE, 2, 0.35);
  tl.at(THRUST - 2, () => {
    dust(h, h.pos(), 6, -1);
    h.sound('thud', { vol: 0.5 });
  });
  tl.at(THRUST, () => h.sound('beam', { rate: 2, vol: 0.5 }));
  drawSpan(h, tl, THRUST, THRUST + 14, (g, t) => {
    const b = kBlade(h);
    const reach = Math.min(1, t * 4);
    const fade = t > 0.5 ? 1 - (t - 0.5) / 0.5 : 1;
    lance(g, b.x - 6, y, lerp(b.x, end, reach), y, 8 * fade + 2, P_CYAN, fade);
  });
  foes.forEach((t, i) => {
    const at = THRUST + 1 + i * 2;
    hitFx(h, tl, at, { x: t.x - 4, y }, P_CYAN, 13);
    tl.at(at, () => {
      land(h, i, { scale: i ? 0.8 : 1, tint: 0xA5F3FC, flash: 0xCFFAFE, sfx: 'stab' });
      h.knock(i, 12);
      h.streaks(t.x, y, 30, [0x22D3EE, 0xFFFFFF]);
    });
  });
  tl.at(THRUST, () => h.camera(1.15, (h.home.x + end) / 2 + 20, y, 14, true));
  travel(h, tl, THRUST + 14, THRUST + 30, here(h), HOME, easeInOut);
  tl.end(THRUST + 32);
}

/** Vanguard Step: shield up, charge shoulder-first and bash the foe off its feet, then reset the guard. */
function vanguardStep(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const BASH = 16;
  tl.at(0, () => {
    h.anim('DEFENSE');
    h.sound('equip', { rate: 0.8, vol: 0.6 }); // shield up
  });
  tl.during(0, 6, (t) => h.stretch(1 + 0.08 * t, 1 - 0.08 * t));
  tl.at(6, () => {
    h.stretch(1, 1);
    h.anim('DASH');
    h.sound('dash');
  });
  travel(h, tl, 6, BASH, HOME, strikeSpot(h, t0, 30), easeIn);
  ghostTrail(h, tl, 6, BASH, 0x94A3B8, 2, 0.4);
  tl.every(6, BASH, 3, () => dust(h, h.pos(), 3, -1));
  hitFx(h, tl, BASH, { x: c.x - 10, y: c.y }, P_STEEL, 18, [0xF8FAFC, 0x94A3B8, 0xFBBF24]);
  tl.at(BASH, () => {
    land(h, 0, { tint: 0xE2E8F0, flash: 0xF1F5F9 });
    h.sound('block', { rate: 0.8 }); // shield bash
    h.knock(0, 26, 8);
    h.camera(1.2, c.x - 20, c.y, 12, true);
    h.stretch(0.9, 1.08);
    h.streaks(c.x - 10, c.y, 36, [0xF8FAFC, 0x94A3B8]);
  });
  tl.during(BASH, BASH + 6, (t) => h.stretch(lerp(0.9, 1, t), lerp(1.08, 1, t)));
  tl.at(BASH + 10, () => h.anim('DASH_BACK'));
  travel(h, tl, BASH + 10, BASH + 26, here(h), HOME, easeInOut);
  tl.at(BASH + 26, () => {
    h.anim('DEFENSE');
    h.guard(0x94A3B8);
  });
  tl.end(BASH + 30);
}

// ---------------------------------------------------------------------------------------------

/** One move per CARD_CATALOG templateId, plus the weapon spells (spellMoves.ts). */
export const KNIGHT_MOVES: Record<string, KnightMove> = {
  ...SPELL_MOVES,
  swing_cleave: ironCleave,
  swing_whirlwind: dragonWhirlwind,
  swing_flow: momentumFlow,
  squat_slam: titanGroundSlam,
  squat_bastion: aegisFortress,
  squat_earthquake: colossusQuake,
  press_smite: thunderSmite,
  press_judgement: heavenlyPillar,
  press_sanctuary: arcaneScepter,
  clean_breaker: anvilBreaker,
  clean_stormbreaker: stormbreakerCleaver,
  snatch_phoenix: phoenixAscension,
  snatch_solar: solarTalon,
  windmill_astral: astralSpire,
  windmill_cosmic: cosmicWard,
  deadlift_colossus: rootOfTitans,
  deadlift_sunder: mountainSunder,
  thruster_eruption: solarEruption,
  thruster_supernova: supernovaSurge,
  row_beast_maw: beastMaw,
  row_shadow_ripper: shadowRipper,
  halo_barrier: celestialBarrier,
  halo_vortex: astralVortex,
  rdl_valkyrie: valkyrieBalance,
  rdl_crane: craneStrike,
  clean_uppercut: ironUppercut,
  clean_ricochet: ricochetBell,
  lunge_lancer: lancersLunge,
  lunge_vanguard: vanguardStep,
};

export const KNIGHT_MOVE_IDS = Object.keys(KNIGHT_MOVES);
export type KnightMoveId = string;

/**
 * Picks the move for a rep: the card's own move, else the card whose name matches the skill name, else
 * the exercise's first card.
 */
export function knightMoveFor(exercise: ExerciseType, skillName = '', templateId?: string): KnightMoveId {
  if (templateId && KNIGHT_MOVES[templateId]) return templateId;
  const name = skillName.toLowerCase();
  const byName = CARD_CATALOG.find((c) => c.name.toLowerCase() === name && KNIGHT_MOVES[c.templateId]);
  if (byName) return byName.templateId;
  return CARD_CATALOG.find((c) => c.exercise === exercise && KNIGHT_MOVES[c.templateId])?.templateId ?? 'swing_cleave';
}

/** Card facts for a move's context (rarity, targeting, Block...), from CARD_CATALOG. */
export function knightMoveCard(id: KnightMoveId): Omit<KnightMoveContext, 'power' | 'form' | 'crit' | 'damage' | 'skillName'> {
  const c = CARD_CATALOG.find((card) => card.templateId === id) ?? ALL_WEAPON_SPELLS.find((card) => card.templateId === id);
  return {
    rarity: c?.rarity ?? 'common',
    target: c?.target ?? 'SINGLE',
    shatter: !!c?.shatter,
    stagger: c?.stagger ?? 0,
    color: c ? parseInt(c.colorHex.slice(1), 16) : 0xF4B41A,
    block: c?.block ?? 0,
    heal: c?.heal ?? 0,
  };
}
