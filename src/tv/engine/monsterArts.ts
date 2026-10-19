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
import { moveSprites } from './pixelKit';
import * as AS from './artSprites';
import { Timeline, lerp, easeIn, easeOut, easeInOut, arc, rand, INK, DIRT } from './choreo';
import { pal, crescent, starburst, orb, pillar, kettlebell } from './fxKit';
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
const P_SPIRIT = pal(0xF59E0B, 0xFFF7D6, 0x2E1203);
const P_PHANTOM = pal(0x93C5FD, 0xEFF6FF, 0x0B1E3F);

const STONE = [0x57534E, 0x78716C, 0xA8A29E, 0x44403C];

// ---------------------------------------------------------------------------------------------
// Shared beats

/** Index of the value in `list` nearest to `v`. */
const nearest = (list: readonly number[], v: number) => list.reduce((best, x, i) => (Math.abs(x - v) < Math.abs(list[best] - v) ? i : best), 0);
/** 8-step rotation frame for angle `a`. */
const rot8 = (a: number) => ((Math.round((a / (Math.PI * 2)) * 8) % 8) + 8) % 8;

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
  const px = moveSprites(h, () => ({ bat: AS.bats() }));
  const colony = Array.from({ length: 9 }, (_, i) => ({ dy: rand(-46, 18), speed: rand(5, 8), wob: rand(0, 4), delay: i * 2, sprite: null as Sprite | null }));
  tl.during(CLANG + 2, CLANG + 44, (_t, f) => {
    const s = src();
    for (const b of colony) {
      const k = f - b.delay;
      if (k < 0) continue;
      b.sprite ??= px.sprite('bat', 0);
      const x = s.x + k * b.speed;
      const y = s.y + b.dy * Math.min(1, k / 12) + Math.sin(k * 0.5 + b.wob) * 3;
      b.sprite.position.set(Math.round(x), Math.round(y));
      b.sprite.visible = x < 440;
      px.show(b.sprite, 'bat', k / 2 + b.wob);
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

/** Dirty Trick: a shadowy feint and teleport ambush using SKILL2RADON, striking from the dark with after-images. */
function dirtyTrick(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const top = crown(t0);
  const spot = strikeSpot(h, t0, 48);
  const TELE = 16;
  const STRIKE1 = 24;
  const STRIKE2 = 50;

  // 1. Shadow vanish at home: leaves dark after-image and smoke
  tl.at(0, () => {
    h.anim('SKILL2RADON');
    h.sound('dark', { vol: 0.6, rate: 1.4 });
    h.sound('dash', { vol: 0.4 });
    smoke(h, kChest(h), 10, [0x1C1917, 0x3F3F46, 0x000000]);
    h.camera(1.18, between(h, t0, 0.6).x, c.y, TELE + 8);
  });
  // Dark after-images flicking from home toward target
  ghostTrail(h, tl, 0, TELE, 0x18181B, 2, 0.55);

  // Foe is bewildered: a "?" appears as the knight disappears
  drawSpan(h, tl, 4, TELE + 6, (g, t) => {
    const a = Math.min(1, t * 4);
    const x = top.x + 4;
    const y = top.y - 12 - 4 * easeOut(Math.min(1, t * 3));
    g.circle(x, y, 7).fill({ color: 0xFFFBEA, alpha: a }).stroke({ width: 1.5, color: INK, alpha: a });
    arcAt(g, x, y - 1, 2.5, Math.PI, Math.PI * 2.4).stroke({ width: 1.5, color: INK, alpha: a });
    g.rect(x - 0.5, y + 3, 1.5, 1.5).fill({ color: INK, alpha: a });
  });

  // Knight shifts to target during the tele phase
  tl.at(TELE - 2, () => {
    h.offset(spot.x, spot.y);
  });

  // Re-materialize at StopTele (f16): shadowy burst
  tl.at(TELE, () => {
    smoke(h, kChest(h), 8, [0x1C1917, 0x71717A, 0x000000]);
    h.sound('portal', { rate: 1.8, vol: 0.5 });
  });

  // First dirty hit at f24 (DamToTarget #1 in rig):
  tl.at(STRIKE1 - 2, () => {
    h.sound('slash', { rate: 1.4, vol: 0.7 });
  });
  slashFx(h, tl, STRIKE1 - 2, { x: c.x - 4, y: c.y + 4, r: 24, a0: -2.0, a1: 0.4, thick: 6, p: P_DIRT, dur: 8 });
  tl.at(STRIKE1, () => {
    h.flashTarget(0, 0xFDE68A, 6);
    h.shake(4);
    h.knock(0, 4);
    h.emit(c.x, c.y, { count: 18, colors: [0x1C1917, 0x8B5A2B, 0xA16207, 0xFDE68A], speed: [2, 5], angle: -0.2, spread: 0.5, gravity: 0.08, size: 2.5, life: [12, 22] });
    h.sound('hurt', { vol: 0.4, rate: 1.5 });
  });

  // Shadow after-images holding during the combo
  ghostTrail(h, tl, STRIKE1 + 4, STRIKE2, 0x27272A, 3, 0.4);

  // Blinded stars on the target
  drawSpan(h, tl, STRIKE1 + 2, STRIKE2, (g) => {
    const x = top.x + 6;
    const y = top.y + 6;
    for (const ox of [-4, 4]) {
      g.moveTo(x + ox - 2, y - 2).lineTo(x + ox + 2, y + 2).moveTo(x + ox + 2, y - 2).lineTo(x + ox - 2, y + 2).stroke({ width: 1.5, color: INK });
    }
  });

  // Second finishing strike at f50 (DamToTarget #2 in rig):
  tl.at(STRIKE2 - 2, () => {
    swingSound(h, true);
  });
  hitFx(h, tl, STRIKE2, c, P_DIRT, 16, [0xFFFBEA, 0xFDE68A, 0xA16207]);
  tl.at(STRIKE2, () => {
    land(h, 0, { scale: 1.25, tint: 0xFDE68A, flash: 0xFFFBEA, burst: 'slash', burstSize: 1.2 });
    h.camera(1.38, c.x - 14, c.y, 10, true);
    h.knock(0, 16, 4);
  });
  dizzy(h, tl, STRIKE2 + 2, t0, 50);

  // Backflip / shadowy retreat to HOME
  tl.at(56, () => {
    h.anim('JUMP_BACK_START');
    h.sound('jump', { vol: 0.6, rate: 1.2 });
  });
  travel(h, tl, 56, 72, here(h), HOME, easeInOut);
  ghostTrail(h, tl, 56, 72, 0x18181B, 2, 0.35);
  tl.during(56, 72, (t) => h.lift(arc(t) * 24));
  tl.at(66, () => h.anim('JUMP_BACK_END'));
  tl.at(72, () => {
    h.lift(0);
    h.sound('thud', { vol: 0.4 });
    dust(h, h.pos(), 6, 1);
  });
  tl.end(76);
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
  const px = moveSprites(h, () => ({ piece: AS.rattlePieces() }));
  const kinds: readonly string[] = AS.RATTLE_PIECES;
  const shown: Sprite[] = [];
  tl.during(FALL, WHOLE, (t, f) => {
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
      const frame = kinds.indexOf(pc.kind) * 8 + rot8(r);
      shown[k] ??= px.sprite('piece', frame);
      shown[k].position.set(Math.round(x), Math.round(y));
      shown[k].visible = t < 1;
      px.show(shown[k], 'piece', frame);
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


/** Will-o'-Lure: a wisp peels off the halo, drifts curiously over the front line and pops in the back foe's face. */
function wispLure(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const PASS = 26;
  const ARRIVE = PASS + 44;
  const POP = ARRIVE + 14;
  const waist = (): P => ({ x: h.pos().x + 2, y: h.pos().y - 24 });
  const px = moveSprites(h, () => ({ wisp: AS.wisps() }));
  let spirit: Sprite | null = null;
  let wx = 0;
  let wy = 0;
  tl.at(0, () => {
    h.anim('BUFF');
    h.weaponShown(false);
    h.camera(1.45, h.home.x + 4, h.home.y - 30, PASS);
    h.sound('magic', { vol: 0.4, rate: 1.4 });
  });
  // The pass leaves a ring of light; a wisp gathers in its wake
  drawSpan(h, tl, 0, PASS, (g, t, f) => {
    const p = waist();
    const a = f * 0.34;
    g.ellipse(p.x, p.y, 18, 6).stroke({ width: 1.5, color: 0x67E8F9, alpha: 0.5 * t });
    crescent(g, p.x, p.y, 18, a - 1.6, a, 2.5, P_WISP, 0.7);
    kettlebell(g, p.x + Math.cos(a) * 18, p.y + Math.sin(a) * 6, 4, a, 0x67E8F9);
    if (t > 0.5) {
      g.circle(p.x, p.y - 14, 10).fill({ color: 0x67E8F9, alpha: 0.2 * (t - 0.5) * 2 });
      spirit ??= px.sprite('wisp', 0, { ax: 12, ay: 17 });
      spirit.position.set(Math.round(p.x), Math.round(p.y - 14));
      spirit.alpha = (t - 0.5) * 2;
      px.show(spirit, 'wisp', f / 4);
    }
  });
  tl.every(0, PASS, 9, (i) => h.sound('whoosh', { vol: 0.35, rate: 1.1 + i * 0.12 }));
  tl.at(PASS, () => {
    h.weaponShown(true);
    h.anim('DEFENSE');
    h.sound('heal', { vol: 0.4, rate: 1.8 });
  });
  // Its flight: a lazy, bobbing, curious drift; it peeks back at the knight once
  drawSpan(h, tl, PASS, POP, (g, _t, f) => {
    const k = Math.min(1, f / (ARRIVE - PASS));
    const s0 = { x: h.home.x + 2, y: h.home.y - 38 };
    const e0 = { x: c.x - 18, y: c.y - 4 };
    wx = lerp(s0.x, e0.x, easeInOut(k)) + Math.sin(f * 0.2) * 6 * (1 - k);
    wy = lerp(s0.y, e0.y, easeInOut(k)) - arc(k) * 26 + Math.sin(f * 0.35) * 3;
    const look = f > 14 && f < 22 ? -1 : 1;
    const blink = f > POP - PASS - 10 && f < POP - PASS - 6;
    const swell = f > ARRIVE - PASS ? (f - (ARRIVE - PASS)) / (POP - ARRIVE) : 0;
    g.circle(wx, wy, 14 + 10 * swell).fill({ color: 0x67E8F9, alpha: 0.12 + 0.12 * swell });
    g.circle(wx, wy, 9 + 5 * swell).fill({ color: 0x67E8F9, alpha: 0.2 });
    if (spirit) {
      spirit.position.set(Math.round(wx), Math.round(wy));
      spirit.alpha = 1;
      spirit.scale.set(look, 1); // peeks back by turning round
      px.show(spirit, 'wisp', (blink ? 4 : 0) + (Math.floor(f / 4) % 4));
    }
  });
  tl.at(POP, () => spirit && (spirit.visible = false));
  tl.every(PASS, POP, 3, () => h.emit(wx, wy + 4, { count: 1, colors: [0xA5F3FC, 0xFFFFFF], speed: [0.1, 0.4], angle: Math.PI / 2, spread: 1, gravity: 0.01, size: 2, life: [14, 22] }));
  tl.at(PASS + 6, () => h.sound('whistle', { vol: 0.3, rate: 1.8 }));
  follow(h, tl, PASS + 4, ARRIVE, 1.2, () => ({ x: wx, y: wy + 10 }), 6);
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
  const px = moveSprites(h, () => ({ arrow: AS.boneArrows() }));
  const launched: Sprite[] = [];
  tl.during(RAISE, RAISE + 10, (t) => {
    const p = up();
    for (let k = 0; k < 3; k++) {
      launched[k] ??= px.sprite('arrow', 1);
      launched[k].position.set(Math.round(p.x + (k - 1) * 8 * t), Math.round(p.y - t * 120));
      launched[k].visible = t < 1;
    }
  });
  hits.slice(0, 3).forEach((t, k) => {
    const at = FIRST + k * STEP;
    const gx = t.x - 6 + (k - 1) * 4;
    const tgt = { x: gx, y: t.y - t.height * 0.6 };
    // Ground mark, then the arrow drops out of the sky
    drawSpan(h, tl, at - 12, at, (g, f) => {
      g.ellipse(gx, t.y, 10 * (1 - f) + 4, 3 * (1 - f) + 1).stroke({ width: 1.5, color: 0xF87171, alpha: 0.4 + 0.6 * f });
    }, 'ground');
    let arrow: Sprite | null = null;
    drawSpan(h, tl, at - 6, at, (g, f) => {
      const x = tgt.x - 30 * (1 - f);
      const y = tgt.y - 120 * (1 - easeIn(f));
      g.moveTo(x - 9, y - 40).lineTo(x, y).stroke({ width: 3, color: 0xFFFFFF, alpha: 0.35 }); // speed streak
      arrow ??= px.sprite('arrow', 0);
      arrow.position.set(Math.round(x), Math.round(y));
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
      if (arrow) {
        arrow.position.set(Math.round(gx - 3 + (fr < 12 && fr % 2 ? 1 : 0)), Math.round(t.y - 12)); // quivers
        arrow.alpha = f > 0.7 ? 1 - (f - 0.7) / 0.3 : 1;
      }
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


/** Carapace Roll: he curls into a beetle shell, revs in place and bowls through the line, then hops home and unfurls. */
function carapaceRoll(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const far = Math.max(...foes.map((t) => t.x)) + 26;
  const CURL = 10;
  const ROLL = 22;
  const END = 40;
  const R = 12;
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
  const px = moveSprites(h, () => ({ shell: AS.beetleShells() }));
  let shell: Sprite | null = null;
  const echoes: Sprite[] = [];
  tl.during(CURL - 4, END + 22, (_t, f) => {
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
    for (let i = 1; i < 6; i++) {
      echoes[i] ??= px.sprite('shell', 0, { add: true, tint: 0x84CC16 });
      const p = trail[i];
      echoes[i].visible = !!p && fr >= ROLL && fr < END;
      if (p) {
        echoes[i].position.set(Math.round(p.x), Math.round(p.y));
        echoes[i].alpha = 0.4 - i * 0.06;
        px.show(echoes[i], 'shell', rot8(spin - i * 0.9));
      }
    }
    shell ??= px.sprite('shell', 0);
    shell.position.set(Math.round(sx), Math.round(y));
    shell.scale.set(close < 1 ? 0.5 + close * 0.5 : 1);
    shell.visible = fr < END + 18;
    px.show(shell, 'shell', rot8(spin));
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
  const px = moveSprites(h, () => ({ wave: AS.waves() }));
  let wave: Sprite | null = null;
  tl.during(RISE, CRASH + 14, (t, f) => {
    const fr = f + RISE;
    wave ??= px.sprite('wave', 0, { ax: AS.WAVE_LIP.x, ay: AS.WAVE_LIP.y });
    let H: number;
    if (fr < CRASH - 6) {
      const k = (fr - RISE) / (CRASH - 6 - RISE);
      wx = back.x + 18 + 4 * Math.sin(fr * 0.3);
      H = 72 * easeOut(k);
      wave.alpha = 1;
    } else {
      const k = Math.min(1, (fr - (CRASH - 6)) / 16);
      wx = lerp(back.x + 18, front.x - 20, easeIn(k));
      H = 72 * (1 - k * 0.8);
      wave.alpha = 1 - k * 0.6;
    }
    wave.position.set(Math.round(wx), gy);
    wave.visible = H > 8 && t < 1;
    px.show(wave, 'wave', nearest(AS.WAVE_HEIGHTS, H));
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
  const px = moveSprites(h, () => ({ stone: AS.tombstones() }));
  let stone: Sprite | null = null;
  const RISE_FRAMES = AS.STONE_RISE;
  tl.during(RISE, LOCK, (t) => {
    stone ??= px.sprite('stone', 0, { ax: 20, ay: 43 });
    stone.position.set(Math.round(graveX()), h.home.y + 1);
    px.show(stone, 'stone', Math.min(RISE_FRAMES - 1, Math.floor(easeOut(t) * RISE_FRAMES)));
  });
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
  // Hoisted overhead (the spinning set's frames start after the rising ones)
  tl.during(LOCK, THROW, (t) => {
    if (!stone) return;
    stone.anchor.set(0.5, 23 / 46);
    stone.position.set(Math.round(lerp(graveX(), h.pos().x + 4, easeOut(Math.min(1, t * 2)))), Math.round(lerp(h.home.y - 16, h.pos().y - 70, easeOut(Math.min(1, t * 2)))));
    px.show(stone, 'stone', RISE_FRAMES + (t > 0.6 ? 7 : 0));
  });
  tl.at(THROW - 6, () => h.anim('ATTACK3'));
  tl.at(THROW, () => {
    h.sound('whoosh_heavy', { vol: 0.9, rate: 0.7 });
    h.camera(1.0, (h.home.x + c.x) / 2 + 20, h.home.y - 70, FLIGHT);
  });
  projectile(h, tl, THROW, FLIGHT, () => ({ x: h.pos().x + 4, y: h.pos().y - 70 }), () => ({ x: c.x - 4, y: c.y }), 46, (_g, x, y) => {
    spinR += 0.42;
    if (!stone) return;
    stone.position.set(Math.round(x), Math.round(y));
    px.show(stone, 'stone', RISE_FRAMES + rot8(spinR));
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
  // It lands upright beside the foe like a fresh grave, then sinks back into the earth
  tl.during(HIT, HIT + 34, (t) => {
    if (!stone) return;
    stone.anchor.set(0.5, 43 / 46);
    stone.position.set(Math.round(t0.x + 18), t0.y + 1);
    const up = 1 - easeIn(Math.max(0, (t - 0.6) / 0.4));
    px.show(stone, 'stone', Math.max(0, Math.ceil(up * RISE_FRAMES) - 1));
    stone.visible = up > 0.05;
  });
  tl.end(HIT + 36);
}

/** Troll Blood: boiling regenerative troll ichor triggers a berserk multi-strike frenzy with SKILL3RADON. */
function trollBlood(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const spot = strikeSpot(h, t0, 48);

  // 1. Troll Ichor surges: roar, boiling green motes, camera zoom
  tl.at(0, () => {
    h.anim('SKILL3RADON');
    h.sound('roar', { vol: 0.9, rate: 1.1 });
    h.sound('heal', { vol: 0.5, rate: 1.2 });
    h.camera(1.42, h.home.x + 12, h.home.y - 32, 16, true);
    h.tint(0xC5F08A);
  });
  // Green regenerative ichor pulse rings around chest
  drawSpan(h, tl, 0, 16, (g, t) => {
    const p = kChest(h);
    g.circle(p.x, p.y, 10 + 28 * easeOut(t)).stroke({ width: 2.5 * (1 - t) + 1, color: 0x84CC16, alpha: 1 - t });
    g.circle(p.x, p.y, 6 + 18 * easeOut(t)).fill({ color: 0xBEF264, alpha: 0.25 * (1 - t) });
  });
  tl.during(0, 16, () => {
    if (rand(0, 1) < 0.6) {
      h.emit(h.home.x + rand(-10, 10), h.home.y - 20 + rand(-15, 15), {
        count: 2, colors: [0xBEF264, 0x65A30D, 0xECFCCB], speed: [0.5, 1.5], angle: -Math.PI / 2, spread: 0.6, gravity: -0.04, size: 2, life: [14, 24],
      });
    }
  });

  // At f16: StopTele fires in the rig, knight has surged right into the target
  tl.at(14, () => {
    h.offset(spot.x, spot.y);
    h.sound('stomp', { vol: 0.8, rate: 0.95 });
    dust(h, h.pos(), 8, 1);
    h.camera(1.28, c.x - 16, c.y, 20);
  });
  ghostTrail(h, tl, 14, 28, 0x65A30D, 2, 0.4);

  // Rig hits in SKILL3RADON:
  // f28: Hit 1 (DamToTarget)
  tl.at(26, () => swingSound(h, true));
  slashFx(h, tl, 26, { x: c.x - 4, y: c.y - 6, r: 28, a0: -2.0, a1: 1.0, thick: 8, p: P_TROLL, dur: 9 });
  tl.at(28, () => {
    h.flashTarget(0, 0xECFCCB, 4);
    h.shake(5);
    h.sound('slash_heavy', { rate: 0.85 });
    h.sound('heal', { vol: 0.25, rate: 1.3 });
    h.knock(0, 4);
    h.emit(c.x, c.y, { count: 8, colors: [0x84CC16, 0xECFCCB, 0xBEF264], speed: [1, 3], angle: -Math.PI / 2, spread: 1, gravity: -0.02, size: 2, life: [14, 22] });
  });

  // f48: Hit 2 (DamToTarget) - reverse cleave
  tl.at(46, () => swingSound(h, false));
  slashFx(h, tl, 46, { x: c.x - 6, y: c.y + 6, r: 26, a0: 1.2, a1: -1.6, thick: 7, p: P_TROLL, dur: 8 });
  tl.at(48, () => {
    h.flashTarget(0, 0xBEF264, 4);
    h.shake(6);
    h.sound('impact_heavy', { rate: 0.9 });
    h.sound('heal', { vol: 0.25, rate: 1.4 });
    h.knock(0, 6);
  });

  // f86, f98, f112, f124: The Rapid Berserk Flurry (built-in PunchFx_Skill3 in Spine rig)
  const FLURRY = [86, 98, 112, 124];
  FLURRY.forEach((at, idx) => {
    tl.at(at, () => {
      h.flashTarget(0, idx % 2 === 0 ? 0xBEF264 : 0xECFCCB, 3);
      h.shake(3 + idx);
      h.sound('hit', { rate: 1.1 + idx * 0.1, vol: 0.7 });
      h.sound('heal', { vol: 0.2, rate: 1.5 + idx * 0.1 });
      h.knock(0, 2);
      h.emit(c.x + rand(-6, 6), c.y + rand(-6, 6), { count: 5, colors: [0xBEF264, 0x65A30D, 0xFFFFFF], speed: [1.5, 3.5], angle: -Math.PI / 2, spread: 0.8, gravity: 0.05, size: 2, life: [10, 18] });
    });
  });

  // f148: Final Earth-Shattering Finisher Slam (DamToTarget)
  tl.at(146, () => {
    swingSound(h, true);
    chargeFx(h, tl, 140, 148, () => h.weaponTip(), P_TROLL, 24, 8);
  });
  tl.at(148, () => {
    land(h, 0, { scale: 1.35, tint: 0xD9F99D, flash: 0xECFCCB, burst: 'quake', burstSize: 1.4, sfx: 'impact_crit' });
    h.camera(1.48, c.x - 12, c.y, 14, true);
    h.sound('thunder', { vol: 0.7, rate: 0.9 });
    h.knock(0, 22, 8);
    debris(h, { x: t0.x - 6, y: t0.y }, 12);
  });

  // Recovery & Troll regeneration guard aura
  tl.at(154, () => {
    h.guard(h.ctx.color); // Green healing shield
    h.sound('heal', { vol: 0.6, rate: 1.0 });
  });
  backstep(h, tl, 156, 172, 16);
  tl.at(172, () => {
    h.tint(0xFFFFFF);
  });
  tl.end(176);
}

/** Needle Burst: he drives into a deep squat; bramble races along the ground and erupts in spikes under four foes. */
function needleBurst(h: KnightMoveHost, tl: Timeline) {
  const hits = h.targets.length ? [...h.targets] : [h.target, h.target, h.target, h.target];
  const PLANT = 10;
  const FIRST = PLANT + 14;
  const STEP = 6;
  const px = moveSprites(h, () => ({ bramble: AS.brambles() }));
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
    let bush: Sprite | null = null;
    tl.during(at - 2, at + 22, (f) => {
      const up = f < 0.15 ? easeOut(f / 0.15) : f > 0.7 ? 1 - (f - 0.7) / 0.3 : 1;
      bush ??= px.sprite('bramble', 0, { ax: 24, ay: 54 });
      bush.position.set(Math.round(gx), t.y + 2);
      bush.visible = up > 0.05;
      px.show(bush, 'bramble', Math.min(5, Math.floor(up * 6)));
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
  const px = moveSprites(h, () => ({ claw: AS.crabClaws() }));
  let pinch: Sprite | null = null;
  tl.during(SNAP, CRACK + 6, (t, f) => {
    const fr = f + SNAP;
    // Swings in wide open, snaps shut on the clamp, grinds while squeezing, springs open as the shell cracks
    const open = fr < CLAMP - 2 ? 1 : fr < CLAMP ? 0.7 : fr < CRACK ? (fr % 4 < 2 ? 0.42 : 0.18) : 1;
    const p = claw();
    pinch ??= px.sprite('claw', 0, { ax: 66, ay: 32 });
    pinch.position.set(Math.round(p.x + (fr >= CRACK ? 8 : 0) + (fr < SNAP + 6 ? (SNAP + 6 - fr) * 4 : 0)), Math.round(p.y));
    pinch.alpha = fr >= CRACK ? Math.max(0, 1 - (fr - CRACK) / 6) : Math.min(1, f / 4);
    pinch.visible = t < 1;
    px.show(pinch, 'claw', nearest(AS.CLAW_OPEN, open));
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
  const px = moveSprites(h, () => ({ tail: AS.lizardTails(Math.max(80, reach - (h.home.x + strikeSpot(h, t0, 62).x) + 4)) }));
  let tail: Sprite | null = null;
  tl.during(SPIN + 2, SWEEP + 12, (t, f) => {
    const p = h.pos();
    const k = Math.min(1, f / (SWEEP - SPIN - 2));
    tail ??= px.sprite('tail', 0, { ax: AS.TAIL_ROOT.x, ay: AS.TAIL_ROOT.y });
    tail.position.set(Math.round(p.x - 2), Math.round(p.y - 14));
    tail.alpha = f > SWEEP - SPIN + 2 ? Math.max(0, 1 - (f - (SWEEP - SPIN + 2)) / 8) : 1;
    tail.visible = t < 1;
    px.show(tail, 'tail', nearest(AS.TAIL_STEPS, easeOut(k)));
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
  const px = moveSprites(h, () => ({ stag: AS.stags() }));
  let deer: Sprite | null = null;
  let glow: Sprite | null = null;
  tl.during(4, VAULT + 14, (t, f) => {
    const fr = f + 4;
    const appear = Math.min(1, f / 10);
    const rear = fr < VAULT - 6 ? 0 : fr < VAULT + 2 ? easeOut((fr - (VAULT - 6)) / 8) : 1;
    const out = fr > VAULT + 4 ? Math.max(0, 1 - (fr - VAULT - 4) / 10) : 1;
    const frame = rear > 0 ? 2 + Math.min(2, Math.floor(rear * 3)) : Math.floor(fr / 10) % 2;
    glow ??= px.sprite('stag', 0, { layer: 'back', ax: 30, ay: 90, add: true, tint: 0x818CF8 });
    deer ??= px.sprite('stag', 0, { layer: 'back', ax: 30, ay: 90 });
    for (const sp of [glow, deer]) {
      sp.position.set(Math.round(stagX() - 18), h.home.y);
      sp.visible = t < 1;
      px.show(sp, 'stag', frame);
    }
    deer.alpha = 0.88 * appear * out;
    glow.alpha = (0.35 + 0.15 * Math.sin(fr * 0.4)) * appear * out;
    glow.scale.set(1.04);
  });
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

/**
 * Stone Skin: granite crust climbs up him (pixel statue, artSprites.stoneShells) until he's a horned gargoyle
 * on a pedestal; blows glance off it in sparks while cracks spread and light leaks through, then he bursts out
 * in a spray of tumbling rubble and drives shoulder-first into the foe.
 */
function stoneSkin(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const SET = 18;
  const BURST = 50;
  const BASH = BURST + 10;
  const px = moveSprites(h, () => ({ shell: AS.stoneShells(), rock: AS.rubble() }));
  let statue: Sprite | null = null;
  let stage = 0; // 0 sealed, 1-3 cracking
  tl.at(0, () => {
    h.anim('DEFENSE');
    h.camera(1.44, h.home.x + 8, h.home.y - 30, SET + 6);
    h.sound('rock', { vol: 0.6, rate: 0.6 });
  });
  tintRamp(h, tl, 0, SET, 0xFFFFFF, 0x8F8A85);
  // The crust climbs from the pedestal to the horns
  tl.during(0, BURST, (t, f) => {
    const p = h.pos();
    statue ??= px.sprite('shell', 0, { ax: AS.SHELL_FEET.x, ay: AS.SHELL_FEET.y });
    const shake = stage === 3 && f % 2 ? 1 : 0;
    statue.position.set(Math.round(p.x) + shake, Math.round(p.y) + 1);
    statue.visible = t < 1;
    px.show(statue, 'shell', f < SET ? Math.min(AS.SHELL_GROW - 1, Math.floor((f / SET) * AS.SHELL_GROW)) : stage ? AS.SHELL_GROW - 1 + stage : AS.SHELL_GROW - 1);
  });
  tl.every(2, SET, 3, (i) => {
    h.sound('crack', { vol: 0.3, rate: 0.7 + i * 0.08 });
    debris(h, { x: h.pos().x + rand(-14, 16), y: h.pos().y - 2 }, 2, STONE, 0.4);
  });
  tl.at(SET, () => {
    h.alpha(0); // fully encased: only the statue shows
    h.animSpeed(0);
    h.sound('stomp', { vol: 0.7, rate: 0.7 });
    h.shake(4);
    dust(h, h.pos(), 8, -1);
    dust(h, h.pos(), 8, 1);
  });
  // Statue beat: blows glance off in sparks, the camera creeps in, and each one opens the cracks wider
  tl.every(SET + 4, BURST - 4, 5, (i) => {
    const p = h.pos();
    h.sparks(p.x + rand(-6, 20), p.y - rand(14, 56), 6, [0xFFFFFF, 0xFDE68A, 0xA8A29E]);
    h.sound('block', { vol: 0.35, rate: 1.4 + (i % 3) * 0.15 });
  });
  tl.at(SET + 10, () => h.camera(1.6, h.home.x + 6, h.home.y - 34, BURST - SET));
  [BURST - 20, BURST - 12, BURST - 5].forEach((at, k) => tl.at(at, () => {
    stage = k + 1;
    h.sound('crack', { vol: 0.6 + k * 0.15, rate: 1 - k * 0.1 });
    h.shake(2 + k * 2);
    debris(h, { x: h.pos().x + rand(-8, 12), y: h.pos().y - rand(20, 50) }, 3 + k * 2, STONE, 0.5);
    if (k === 2) h.flash(0.15, 0xFDE68A);
  }));
  tl.every(BURST - 5, BURST, 1, () => h.emit(h.pos().x + rand(-10, 14), h.pos().y - rand(10, 56), { count: 1, colors: [0xFFFBEA, 0xFDE68A], speed: [0.5, 1.5], angle: rand(0, Math.PI * 2), spread: 0.3, gravity: 0, size: 2, life: [8, 14] }));
  // Burst: the shell explodes into tumbling rubble
  tl.at(BURST, () => {
    h.alpha(1);
    h.animSpeed(1);
    h.tint(0xFFFFFF);
    h.anim('DASH');
    h.flash(0.45, 0xFFFFFF);
    h.shake(10);
    h.hitStop(4);
    h.sound('explosion', { vol: 0.4, rate: 1.4 });
    h.sound('rock', { vol: 1 });
    const p = h.pos();
    h.emit(p.x, p.y - 30, { count: 24, colors: STONE, speed: [2, 5], angle: -Math.PI / 2, spread: Math.PI, gravity: 0.25, size: 2, life: [16, 28] });
    h.camera(1.18, between(h, t0, 0.6).x, c.y, 10, true);
  });
  const chunks = Array.from({ length: 12 }, (_, i) => {
    const a = -Math.PI / 2 + (i / 11 - 0.5) * 2.6;
    const v = rand(2.2, 4.2);
    return { set: i % 3, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, spin: rand(-0.5, 0.5), sprite: null as Sprite | null, x: 0, y: 0, r: rand(0, 6), oy: rand(16, 58) };
  });
  const groundY = h.home.y;
  tl.during(BURST, BURST + 38, (t, f) => {
    for (const ch of chunks) {
      if (!ch.sprite) {
        ch.sprite = px.sprite('rock', ch.set * 8);
        ch.x = h.home.x + rand(-10, 14);
        ch.y = groundY - ch.oy;
      }
      ch.vy += 0.28;
      ch.x += ch.vx;
      ch.y += ch.vy;
      ch.r += ch.spin;
      if (ch.y > groundY - 3) {
        ch.y = groundY - 3;
        ch.vy *= -0.35;
        ch.vx *= 0.6;
        ch.spin *= 0.5;
      }
      ch.sprite.position.set(Math.round(ch.x), Math.round(ch.y));
      ch.sprite.alpha = f > 24 ? Math.max(0, 1 - (f - 24) / 14) : 1;
      ch.sprite.visible = t < 1;
      px.show(ch.sprite, 'rock', ch.set * 8 + rot8(ch.r));
    }
  });
  tl.at(BURST + 6, () => h.sound('rock', { vol: 0.4, rate: 1.4 })); // rubble clatter
  tl.at(BURST + 12, () => h.sound('rock', { vol: 0.3, rate: 1.7 }));
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


/**
 * Grizzly Maul: a bear-spirit-infused strike. A golden spirit bear (pixel sprite + pulsing additive halo,
 * artSprites.spiritBear) flares up around the knight as he crouches; they charge across the field as one, the
 * bear sliding along on all fours around him in a streak of afterimages; they leap together, the bear rearing
 * and roaring, and slam down as one: his chop and its maul land on the same frame in a golden crater.
 */
function grizzlyMaul(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const DASH = 10;
  const LEAP = 24;
  const IMPACT = 38;
  const GONE = IMPACT + 26;
  const LIFT = 30;
  const spot = strikeSpot(h, t0, 58);
  const P = AS.BEAR_POSES;
  const GOLD = [0xFDE68A, 0xFBBF24, 0xFFFFFF, 0xF59E0B];
  const px = moveSprites(h, () => {
    const sb = AS.spiritBear();
    return { bear: sb.bear, halo: sb.halo, rake: AS.clawRakes() };
  });
  let bear: Sprite | null = null;
  let halo: Sprite | null = null;
  const echoes: Sprite[] = [];
  const trail: { x: number; y: number; pose: number }[] = [];
  let pose: number = P.walk1;
  let reach = 0; // extra forward lunge of the bear on the maul
  let lift = 0;
  // The bear wraps the knight: on all fours it leads with its head out ahead of him; reared up it towers behind
  let lead = -28;
  const bearAt = (): P => ({ x: Math.round(h.pos().x + lead + reach), y: Math.round(h.home.y - lift * 0.8) });

  // Anticipation: he drops into a crouch and the spirit flares up around him
  tl.at(0, () => {
    h.anim('JUMP_FRONT_START');
    h.sound('growl', { vol: 1, rate: 0.6 });
    h.sound('charge', { vol: 0.6, rate: 1.3 });
    h.camera(1.32, h.home.x + 20, h.home.y - 30, DASH + 2);
  });
  crouch(h, tl, 0, DASH, 0.16);
  tintRamp(h, tl, 0, DASH, 0xFFFFFF, 0xFFE7A0);
  dimSpan(h, tl, 0, GONE, 0.45, 0x07040F, 8);
  tl.every(0, DASH, 1, () => {
    const p = h.pos();
    const a = rand(0, Math.PI * 2);
    h.emit(p.x + Math.cos(a) * 40, p.y - 24 + Math.sin(a) * 26, { count: 1, colors: GOLD, speed: [1.8, 2.8], angle: a + Math.PI, spread: 0.2, gravity: 0, size: 2, life: [12, 16] });
  });

  // The charge: one fast slide across the field, the bear bounding along around him
  tl.at(DASH, () => {
    h.stretch(1, 1);
    h.anim('DASH');
    h.sound('dash', { vol: 1 });
    h.sound('roar', { vol: 0.5, rate: 1.1 });
    h.flash(0.2, 0xFFF7D6);
  });
  travel(h, tl, DASH, LEAP, HOME, spot, easeIn);
  ghostTrail(h, tl, DASH, LEAP, 0xF59E0B, 1, 0.45);
  tl.every(DASH, LEAP, 3, (i) => {
    pose = i % 2 ? P.walk2 : P.walk1;
    h.sound('thud', { vol: 0.5, rate: 0.8 + i * 0.05 });
    const b = bearAt();
    dust(h, { x: b.x + 10, y: b.y }, 4, -1);
    dust(h, { x: b.x + 70, y: b.y }, 3, -1);
  });
  tl.every(DASH, LEAP, 2, () => {
    const p = h.pos();
    h.streaks(p.x - 30, p.y - 26, 46, [0xFDE68A, 0xFFF7D6]);
  });
  follow(h, tl, DASH, LEAP, 1.14, () => ({ x: h.pos().x + 34, y: h.home.y - 40 }), 3);

  // The leap: both spring up, the bear rearing and roaring, paws thrown back
  tl.at(LEAP, () => {
    h.anim('JUMP_FRONT_UP');
    h.sound('jump', { vol: 0.9 });
    h.sound('roar', { vol: 1.1, rate: 0.6 });
    pose = P.rise;
    dust(h, h.pos(), 10, -1);
    dust(h, h.pos(), 10, 1);
    h.camera(1, h.pos().x + 20, h.home.y - 64, IMPACT - LEAP); // wide: the bear fills the sky
  });
  tl.during(LEAP, LEAP + 6, (t) => (lead = lerp(-28, -48, easeOut(t))));
  tl.at(LEAP + 3, () => (pose = P.roar));
  tl.at(LEAP + 7, () => (pose = P.wind));
  travel(h, tl, LEAP, IMPACT, () => spot, { x: spot.x + 10, y: spot.y }, easeOut);
  tl.during(LEAP, IMPACT - 5, (t) => h.lift((lift = easeOut(t) * LIFT)));
  drawSpan(h, tl, LEAP + 2, LEAP + 12, (g, t) => {
    const b = bearAt();
    for (let k = 0; k < 3; k++) rightRings(g, b.x + 34, b.y - 94, 8 + ((t * 90 + k * 18) % 50), 0xFDE68A, 1 - t);
  });

  // The slam: he chops down as the bear mauls, both crashing to earth on the same frame
  tl.at(IMPACT - 7, () => {
    h.anim('SKILL1'); // chop lands at f6
    swingSound(h, true);
    h.sound('whoosh_heavy', { vol: 1, rate: 0.6 });
  });
  tl.at(IMPACT - 4, () => (pose = P.swipe));
  tl.during(IMPACT - 5, IMPACT, (t) => h.lift((lift = LIFT * (1 - easeIn(t)))));
  tl.during(IMPACT - 4, IMPACT, (t) => (reach = 16 * easeOut(t)));
  tl.every(IMPACT - 5, IMPACT, 1, () => h.ghost(0xFBBF24, 0.5, 8));

  const rakes: Sprite[] = [];
  tl.during(IMPACT, IMPACT + 12, (t, f) => {
    for (const [k, flip, dx] of [[0, 1, -4], [1, -1, 8]] as const) {
      const start = k * 2;
      if (f < start) continue;
      rakes[k] ??= px.sprite('rake', 0);
      rakes[k].position.set(Math.round(c.x + dx), Math.round(c.y - 2));
      rakes[k].scale.set(flip, 1);
      rakes[k].visible = t < 1;
      px.show(rakes[k], 'rake', Math.min(4, Math.floor((f - start) / 2)));
    }
  });
  hitFx(h, tl, IMPACT, c, P_SPIRIT, 28, [0xFFFFFF, 0xFFF7D6, 0xF59E0B]);
  tl.at(IMPACT, () => {
    pose = P.maul;
    lift = 0;
    h.lift(0);
    h.tint(0xFFFFFF);
    h.stretch(1.25, 0.8);
    land(h, 0, { scale: 1.7, tint: 0xFDE68A, flash: 0xFFF7D6, sfx: 'claw', spark: 0xF59E0B, burst: 'crater', burstSize: 1.3 });
    h.hitStop(12);
    h.shake(16);
    h.sound('quake', { vol: 1, rate: 0.8 });
    h.sound('roar', { vol: 0.7, rate: 0.75 });
    h.knock(0, 24, 10);
    h.camera(1.6, c.x - 14, c.y + 6, 16, true);
    for (const dir of [-1, 1]) dust(h, { x: t0.x - 10, y: t0.y }, 16, dir);
    debris(h, { x: t0.x - 10, y: t0.y }, 16, DIRT, 1.4);
    h.emit(c.x, c.y, { count: 24, colors: GOLD, speed: [1.5, 4], angle: 0, spread: Math.PI, gravity: 0.05, size: 2, life: [14, 26] });
  });
  tl.during(IMPACT, IMPACT + 8, (t) => h.stretch(lerp(1.25, 1, t), lerp(0.8, 1, t)));
  ringFx(h, tl, IMPACT, () => ({ x: t0.x - 8, y: t0.y }), 8, 120, 0xFBBF24, 22, 4);
  ringFx(h, tl, IMPACT + 3, () => ({ x: t0.x - 8, y: t0.y }), 6, 70, 0xFFF7D6, 16, 2);
  crackFx(h, tl, IMPACT, { x: t0.x - 60, y: t0.y + 1 }, { x: t0.x + 40, y: t0.y }, P_SPIRIT, 6, 44);
  tl.at(IMPACT + 3, () => h.sound('claw', { vol: 0.7, rate: 0.85 }));
  dizzy(h, tl, IMPACT + 4, t0, 90);

  // Bear and knight, rendered as one: the bear follows his position every frame
  tl.during(0, GONE, (t, f) => {
    const feet = { ax: AS.BEAR_FEET.x, ay: AS.BEAR_FEET.y, layer: 'back' as const };
    halo ??= px.sprite('halo', P.walk1, { ...feet, add: true, tint: 0xB45309 });
    for (let k = 0; k < 5; k++) echoes[k] ??= px.sprite('bear', P.walk1, { ...feet, add: true, tint: 0xF59E0B });
    bear ??= px.sprite('bear', P.walk1, feet);
    const form = easeOut(Math.min(1, f / 8));
    const fadeOut = f > IMPACT + 8 ? Math.max(0, 1 - (f - IMPACT - 8) / 16) : 1;
    const life = form * fadeOut;
    const { x, y } = bearAt();
    bear.position.set(x, y);
    bear.alpha = 0.97 * life;
    bear.visible = t < 1;
    px.show(bear, 'bear', pose);
    const flare = f < DASH + 4 ? 0.3 : f >= IMPACT && f < IMPACT + 10 ? 0.45 : 0;
    halo.position.set(x, y);
    halo.alpha = (0.3 + 0.1 * Math.sin(f * 0.3) + flare) * life;
    halo.visible = t < 1;
    px.show(halo, 'halo', pose);
    trail.unshift({ x, y, pose });
    trail.length = Math.min(trail.length, 11);
    echoes.forEach((e, k) => {
      const past = trail[(k + 1) * 2];
      const moved = past && (past.pose !== pose || Math.abs(past.x - x) > 2 || Math.abs(past.y - y) > 2);
      e.visible = !!moved && t < 1;
      if (!past) return;
      e.position.set(past.x, past.y);
      e.alpha = (0.45 - k * 0.08) * life;
      px.show(e, 'bear', past.pose);
    });
  });
  tl.every(4, IMPACT, 2, () => {
    const b = bearAt();
    h.emit(b.x + rand(10, 80), b.y - rand(10, 50), { count: 1, colors: GOLD, speed: [0.3, 0.9], angle: Math.PI + 0.3, spread: 0.5, gravity: -0.02, size: 2, life: [12, 22] });
  });
  // The spirit bursts into light past the foe
  tl.every(IMPACT + 8, GONE, 2, () => {
    const b = bearAt();
    h.emit(b.x + rand(0, 70), b.y - rand(10, 90), { count: 3, colors: GOLD, speed: [0.6, 1.8], angle: -0.4, spread: 0.6, gravity: -0.03, size: 2, life: [16, 26] });
  });
  tl.during(IMPACT + 8, IMPACT + 16, (t) => (reach = 16 * (1 - t)));
  backstep(h, tl, IMPACT + 16, IMPACT + 32, 14);
  tl.end(GONE + 6);
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
    textures = buildSteed();
    const owned = textures;
    rig.once('destroyed', () => destroySteed(owned)); // move end or interruption
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
    if (!steed || steed.destroyed) return;
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
    if (!steed || steed.destroyed) return;
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
