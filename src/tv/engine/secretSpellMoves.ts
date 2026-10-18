/**
 * Choreography for the secret-trial weapons' spells (src/types/weaponSpells.ts, src/shared/secretTrials.ts), two
 * per weapon, in the same motion language as spellMoves.ts (maces crush, morning stars whirl and hurl, bells swing
 * and press, swords cut) and built on its helpers. Merged into KNIGHT_MOVES next to SPELL_MOVES. Review with
 *   npm run shot -- "encounter:wolf,boar,slime" idle kfilm:<templateId>:16:4:0,1,2
 */
import { Timeline, lerp, easeIn, easeOut, easeInOut, arc, rand, INK } from './choreo';
import { pal, bolt, pillar, runeCircle, orb, wing, lance } from './fxKit';
import { tentacle } from './monsterKit';
import {
  type KnightMove, type KnightMoveHost, each, once, strikeSpot, chest, land, travel, here, HOME, backstep,
  ghostTrail, swingSound, chargeSound, drawSpan, slashFx, hitFx, ringFx, chargeFx, debris, dust, shards, projectile,
} from './knightKit';
import { whirl, raiseAndHold, chain, eye, phantomBell, anchor, blackHole } from './spellMoves';

const P_BRASS = pal(0xF2B636, 0xFFF7D6, 0x3B2205);
const P_CIRCUS = pal(0xF472B6, 0xFFF1F7, 0x3B0A24);
const P_DEEP = pal(0x2DD4BF, 0xCCFBF1, 0x042F2E);
const P_ABYSS = pal(0x0E7490, 0xA5F3FC, 0x02161D);
const P_CENSER = pal(0x7DD3FC, 0xF0F9FF, 0x082F49);
const P_CANDLE = pal(0xFDE68A, 0xFFFBEB, 0x422006);
const P_STORM = pal(0x67E8F9, 0xFFFFFF, 0x083344);
const P_GILT = pal(0xF2B636, 0xFFFBEA, 0x3B2205);
const P_FORGE = pal(0xFB923C, 0xFEF3C7, 0x431407);
const P_HOLLOW = pal(0xC084FC, 0xF3E8FF, 0x12021F);
const P_SICK = pal(0x4ADE80, 0xDCFCE7, 0x052E16);
const P_BANE = pal(0xA78BFA, 0xEDE9FE, 0x0B0218);
/** In front of the knight's chest, where a thrust leaves from. */
const kFront = (h: KnightMoveHost) => ({ x: h.pos().x + 24, y: h.pos().y - 26 });

const LIGHTS = [0xF87171, 0xFBBF24, 0x34D399, 0x60A5FA, 0xF472B6];

// =============================================================================================
// The Bellringer's Mallet: carnival strongman

/**
 * Test Your Strength: a spectral High Striker springs up behind the foe; the knight brings the mallet down on its
 * pad, the puck rockets up the pole, rings the bell, and the bell drops on the foe's head.
 */
function testYourStrength(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const pole = { x: t0.x + 22, top: t0.y - 92 };
  const PAD = 26; // the mallet hits the pad
  const DING = PAD + 10;
  const HIT = DING + 14;
  tl.at(0, () => h.anim('RUN', true));
  travel(h, tl, 0, 12, HOME, strikeSpot(h, t0, 54), easeInOut);
  tl.every(0, 12, 6, () => h.sound('step', { vol: 0.4 }));
  // The striker rises out of the ground
  drawSpan(h, tl, 6, HIT + 24, (g, t, f) => {
    const up = easeOut(Math.min(1, f / 10));
    const fade = t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1;
    const top = lerp(t0.y, pole.top, up);
    for (let y = t0.y; y > top; y -= 8) g.rect(pole.x - 3, y - 8, 6, 4).fill({ color: 0xDC2626, alpha: fade }).rect(pole.x - 3, y - 4, 6, 4).fill({ color: 0xFDF4E3, alpha: fade });
    g.rect(pole.x - 14, t0.y - 4, 28, 6).fill({ color: 0x5B2A12, alpha: fade }).stroke({ width: 1, color: INK, alpha: fade });
    if (f < DING - 6) orb(g, pole.x, top - 4, 6, P_BRASS, fade);
  }, 'back');
  tl.at(12, () => {
    h.anim('ATTACK4');
    h.animSpeed(0.5);
    h.camera(1.12, (h.pos().x + pole.x) / 2, t0.y - 50, 40);
    chargeSound(h, PAD - 12);
  });
  tl.during(14, PAD - 3, (t) => h.lift(easeOut(t) * 10));
  tl.at(PAD - 3, () => {
    h.animSpeed(1.8);
    swingSound(h, true);
  });
  tl.during(PAD - 3, PAD, (t) => h.lift(lerp(10, 0, easeIn(t))));
  tl.at(PAD, () => {
    h.animSpeed(1);
    h.shake(4);
    h.sound('impact_heavy', { vol: 0.7 });
    h.emit(pole.x - 6, t0.y - 2, { count: 10, colors: [0xFDF4E3, 0xFBBF24], speed: [1, 3], angle: -Math.PI / 2, spread: 1, gravity: 0.2, size: 2, life: [10, 18] });
  });
  // The puck rockets up the pole
  drawSpan(h, tl, PAD, DING + 1, (g, t) => {
    const y = lerp(t0.y - 4, pole.top + 6, easeOut(t));
    g.rect(pole.x - 6, y - 3, 12, 6).fill({ color: 0xE5E7EB }).stroke({ width: 1, color: INK });
    g.rect(pole.x - 2, y + 3, 4, 20 * (1 - t)).fill({ color: 0xFFF7D6, alpha: 0.5 });
  });
  tl.at(DING, () => {
    h.sound('impact_metal', { rate: 1.9, vol: 0.9 });
    h.sound('ui_select', { vol: 0.6 });
    h.flash(0.2, 0xFFF7D6);
    h.emit(pole.x, pole.top - 4, { count: 24, colors: LIGHTS, speed: [1.5, 4], spread: Math.PI, gravity: 0.15, size: 2, life: [14, 28] });
  });
  ringFx(h, tl, DING, { x: pole.x, y: pole.top }, 6, 50, 0xFBBF24, 14, 2);
  // The bell breaks loose and drops on the foe
  drawSpan(h, tl, DING + 2, HIT + 1, (g, t) => {
    const x = lerp(pole.x, c.x, t);
    const y = lerp(pole.top - 4, c.y - 26, easeIn(t)) - arc(t) * 20;
    orb(g, x, y, 8, P_BRASS);
    g.rect(x - 2, y - 11, 4, 4).fill({ color: 0x78716C });
  });
  hitFx(h, tl, HIT, { x: c.x, y: c.y - 22 }, P_BRASS, 22);
  tl.at(HIT, () => {
    land(h, 0, { scale: 1.3, tint: 0xFDE68A, burst: 'crater', burstSize: 1, sfx: 'impact_metal' });
    h.sound('impact_metal', { rate: 1.4, vol: 0.7, delay: 0.05 });
    h.camera(1.3, c.x, c.y - 10, 10, true);
    h.knock(0, 4, -6);
  });
  backstep(h, tl, HIT + 8, HIT + 24, 14);
  tl.end(HIT + 26);
}

/**
 * Big Top Finale: the knight presses the mallet overhead and rings it like a ringmaster's bell; confetti cannons
 * fire from the floor under every foe and fireworks burst over them.
 */
function bigTopFinale(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const TOLL = 20;
  raiseAndHold(h, tl, 0, TOLL + 6);
  tl.at(0, () => {
    h.camera(1.04, (h.home.x + foes[foes.length - 1].x) / 2, h.home.y - 50, 60);
    h.sound('victory', { vol: 0.35, rate: 1.2 });
  });
  tl.during(0, 10, (t) => h.dim(0.4 * t, 0x0B0716));
  // Spotlights sweep the arena
  drawSpan(h, tl, 0, TOLL + 46, (g, t, f) => {
    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : Math.min(1, f / 8);
    for (let k = 0; k < 3; k++) {
      const x = 150 + k * 110 + Math.sin(f * 0.06 + k * 2) * 50;
      g.poly([x - 6, -4, x + 6, -4, x + 30, h.home.y + 4, x - 30, h.home.y + 4]).fill({ color: LIGHTS[k * 2], alpha: 0.1 * fade });
    }
  }, 'back');
  tl.at(TOLL, () => {
    h.sound('impact_metal', { rate: 1.6, vol: 0.9 });
    h.shake(5);
    const p = h.weaponTip();
    h.emit(p.x, p.y, { count: 20, colors: LIGHTS, speed: [1, 3.5], spread: Math.PI, gravity: 0.1, size: 2, life: [14, 26] });
  });
  ringFx(h, tl, TOLL, () => h.weaponTip(), 6, 70, 0xFBBF24, 14, 2);
  foes.forEach((t, i) => {
    const at = TOLL + 8 + i * 5;
    const c = chest(t);
    // Cannon from the floor, then a firework over the foe
    drawSpan(h, tl, at - 6, at + 2, (g, u) => {
      g.rect(t.x - 6, t.y - 6, 12, 8).fill({ color: 0x7F1D1D }).stroke({ width: 1, color: INK });
      g.rect(t.x - 2, t.y - 6 - 50 * u, 4, 50 * u).fill({ color: 0xFFF1F7, alpha: 0.6 });
    });
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: 0.9, tint: 0xFBCFE8, burst: 'explosion', burstSize: 0.7, sfx: 'explosion' });
      h.knock(i, 4, 10);
      h.emit(c.x, c.y - 20, { count: 30, colors: LIGHTS, speed: [1.5, 4.5], spread: Math.PI, gravity: 0.12, size: 2, life: [18, 34] });
      h.sound('fire_burst', { rate: 1.6, vol: 0.4 });
    });
    ringFx(h, tl, at, { x: c.x, y: c.y - 24 }, 4, 40, LIGHTS[i % LIGHTS.length], 16, 2);
  });
  const last = TOLL + 8 + (foes.length - 1) * 5;
  tl.during(last + 10, last + 24, (t) => h.dim(0.4 * (1 - t), 0x0B0716));
  tl.end(last + 26);
}

// =============================================================================================
// The Leviathan's Anchor: the deep

/** Undertow: the anchor is hurled past the pack, bites the floor, and the knight rows it back in a wave that drags them all. */
function undertow(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const far = { x: Math.max(...foes.map((t) => t.x)) + 40, y: h.home.y };
  const OUT = 22; // the anchor bites behind them
  const HAUL = OUT + 16; // the wave hits
  const head = whirl(h, tl, 0, 14, P_DEEP, {
    reach: 22, link: 0x57534E, trail: [0xCCFBF1, 0x2DD4BF],
    head: (g, x, y, f) => anchor(g, x, y, 1, f * 0.3, P_DEEP),
  });
  tl.at(2, () => h.weaponShown(false));
  tl.at(14, () => {
    h.anim('ATTACK2');
    swingSound(h, true);
  });
  const from = once(() => head());
  drawSpan(h, tl, 14, OUT + 1, (g, t, f) => {
    const s = from();
    const x = lerp(s.x, far.x, easeOut(t));
    const y = lerp(s.y, far.y - 8, t) - arc(t) * 40;
    chain(g, h.pos().x + 12, h.pos().y - 30, x, y, 0x57534E, 10 * (1 - t));
    anchor(g, x, y, 1.2, f * 0.4, P_DEEP);
  });
  tl.at(OUT, () => {
    h.sound('rock', { vol: 0.6 });
    h.shake(3);
    dust(h, { x: far.x, y: far.y }, 8, -1);
  });
  // Hauled back: the chain drags a wall of water through the pack
  tl.at(OUT + 4, () => {
    h.anim('ATTACK1');
    h.sound('wave', { vol: 0.8 });
    h.sound('rattle', { rate: 0.6, vol: 0.6 });
  });
  drawSpan(h, tl, OUT + 4, HAUL + 10, (g, t, f) => {
    const x = lerp(far.x, h.pos().x + 30, easeIn(Math.min(1, t * 1.2)));
    const crest = 34 * Math.sin(Math.min(1, t * 1.3) * Math.PI * 0.9) + 8;
    g.poly([x - 70, far.y + 4, x - 40, far.y - crest * 0.6, x - 8, far.y - crest, x + 14, far.y - crest * 0.4, x + 30, far.y + 4]).fill({ color: 0x0E7490, alpha: 0.65 });
    g.poly([x - 40, far.y - crest * 0.6, x - 8, far.y - crest, x + 14, far.y - crest * 0.4]).stroke({ width: 2, color: 0xCCFBF1 });
    chain(g, h.pos().x + 12, h.pos().y - 30, x, far.y - 8, 0x57534E, 2);
    anchor(g, x, far.y - 8, 1.2, f * 0.4, P_DEEP);
  });
  tl.every(OUT + 6, HAUL + 10, 2, () => h.emit(rand(h.home.x + 60, far.x), h.home.y - rand(0, 20), { count: 1, colors: [0xCCFBF1, 0x67E8F9], speed: [0.5, 1.5], angle: -Math.PI / 2, spread: 1, gravity: 0.15, size: 2, life: [10, 18] }));
  foes.forEach((t, i) => {
    tl.at(HAUL - i * 3, () => {
      land(h, h.targets.length ? i : undefined, { scale: 0.85, tint: 0xA5F3FC, sfx: 'splash' });
      h.knock(i, -16, 4);
    });
  });
  tl.at(HAUL + 10, () => h.weaponShown(true));
  tl.end(HAUL + 22);
}

/** Leviathan's Maw: the anchor is flung skyward and comes down as a vast jaw bursts from the floor to swallow the foe. */
function leviathansMaw(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const HIT = 40;
  tl.at(0, () => {
    h.anim('ATTACK3');
    swingSound(h, true);
    h.weaponShown(false);
    h.camera(1.1, (h.home.x + t0.x) / 2, h.home.y - 50, HIT + 10);
  });
  tl.during(0, 12, (t) => h.dim(0.5 * t, 0x02161D));
  // Up and out of frame
  drawSpan(h, tl, 4, 18, (g, t, f) => anchor(g, lerp(h.pos().x + 10, c.x, t), lerp(h.pos().y - 50, -20, easeOut(t)), 1.3, f * 0.5, P_ABYSS));
  // A swirl of dark water opens under the foe
  drawSpan(h, tl, 12, HIT + 20, (g, t, f) => {
    const r = 30 * easeOut(Math.min(1, (f) / 12)) * (t > 0.8 ? (1 - t) / 0.2 : 1);
    g.ellipse(t0.x, t0.y + 2, r + 4, r * 0.3 + 1).fill({ color: 0x02161D });
    for (let k = 0; k < 3; k++) g.ellipse(t0.x, t0.y + 2, r - k * 8, (r - k * 8) * 0.3).stroke({ width: 1, color: 0x2DD4BF, alpha: 0.6 });
  }, 'ground');
  tl.at(12, () => h.sound('wave', { vol: 0.5, rate: 0.6 }));
  // The jaws rise around the foe as the anchor falls into the gullet
  drawSpan(h, tl, HIT - 10, HIT + 16, (g, t) => {
    const up = t < 0.4 ? easeOut(t / 0.4) : 1;
    const shut = t < 0.4 ? 0 : easeIn(Math.min(1, (t - 0.4) / 0.2));
    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
    for (const side of [-1, 1]) {
      const bx = t0.x + side * (26 - shut * 18);
      const top = t0.y - 70 * up;
      g.poly([bx, t0.y + 2, bx + side * 6, top + 10, bx - side * 4, top]).fill({ color: 0x164E63, alpha: fade }).stroke({ width: 2, color: 0x02161D, alpha: fade });
      for (let k = 0; k < 5; k++) {
        const y = t0.y - k * 12 * up;
        g.poly([bx, y, bx - side * 8, y - 4, bx, y - 7]).fill({ color: 0xF0FDFA, alpha: fade });
      }
    }
  });
  drawSpan(h, tl, HIT - 8, HIT + 1, (g, t, f) => anchor(g, c.x, lerp(-20, c.y, easeIn(t)), 1.4, f * 0.6, P_ABYSS));
  hitFx(h, tl, HIT, c, P_ABYSS, 26, [0xCCFBF1, 0x2DD4BF, 0xFFFFFF]);
  tl.at(HIT, () => {
    land(h, 0, { scale: 1.45, tint: 0xA5F3FC, flash: 0xCCFBF1, burst: 'ice', burstSize: 1.1, sfx: 'chomp' });
    h.sound('roar', { rate: 0.6, vol: 0.6 });
    h.sound('splash', { vol: 0.8 });
    h.camera(1.34, c.x, c.y, 12, true);
    h.knock(0, 4, -8);
    h.emit(c.x, t0.y, { count: 40, colors: [0xCCFBF1, 0x67E8F9, 0x0E7490], speed: [1, 4], angle: -Math.PI / 2, spread: 1.2, gravity: 0.2, size: 2, life: [16, 30] });
  });
  tl.at(HIT + 16, () => h.weaponShown(true));
  tl.during(HIT + 10, HIT + 24, (t) => h.dim(0.5 * (1 - t), 0x02161D));
  tl.end(HIT + 26);
}

// =============================================================================================
// The Everburning Censer: holy smoke and candlelight

/** Sanctified Smoke: the censer whirls a ring of holy smoke round the knight (a ward), then hurls a smoke-wreathed coal at the foe. */
function sanctifiedSmoke(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const THROW = 34;
  const HIT = THROW + 10;
  const head = whirl(h, tl, 0, THROW, P_CENSER, {
    reach: 24, link: 0xCBD5E1, trail: [0xE0F2FE, 0x7DD3FC],
    head: (g, x, y, f) => {
      g.ellipse(x, y, 6, 7).fill({ color: 0xCBD5E1 }).stroke({ width: 2, color: INK });
      for (let k = -1; k <= 1; k++) g.rect(x + k * 3 - 0.5, y - 4, 1.5, 7).fill({ color: 0xFDE68A, alpha: 0.7 + 0.3 * Math.sin(f + k) });
    },
  });
  tl.at(2, () => {
    h.weaponShown(false);
    h.sound('holy', { vol: 0.5 });
  });
  // The ward: a ring of smoke closing round the knight
  drawSpan(h, tl, 6, THROW + 24, (g, t, f) => {
    const p = h.pos();
    const grow = easeOut(Math.min(1, f / 16));
    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
    for (let k = 0; k < 10; k++) {
      const a = f * 0.08 + (k / 10) * Math.PI * 2;
      g.circle(p.x + Math.cos(a) * 30 * grow, p.y - 26 + Math.sin(a) * 30 * grow * 0.45, 7 + Math.sin(f * 0.2 + k) * 2).fill({ color: 0xE0F2FE, alpha: 0.18 * fade });
    }
  });
  tl.at(18, () => h.guard(0x7DD3FC));
  projectile(h, tl, THROW, HIT - THROW, () => head(), () => c, 24,
    (g, x, y, _t, f) => {
      g.circle(x, y, 7).fill({ color: 0x7DD3FC, alpha: 0.25 });
      orb(g, x, y, 3.5, P_CANDLE);
      if (f % 2 === 0) g.circle(x - 6, y + 2, 4).fill({ color: 0xE0F2FE, alpha: 0.3 });
    },
    () => {},
    (x, y) => h.emit(x, y, { count: 1, colors: [0xE0F2FE, 0xBAE6FD], speed: [0.1, 0.4], spread: Math.PI, gravity: -0.02, size: 3, life: [12, 20] }),
  );
  tl.at(THROW, () => swingSound(h));
  hitFx(h, tl, HIT, c, P_CENSER, 18);
  tl.at(HIT, () => {
    land(h, 0, { scale: 1.1, tint: 0xE0F2FE, burst: 'portal', burstSize: 0.8, sfx: 'holy' });
    h.knock(0, 8, 2);
    h.emit(c.x, c.y, { count: 20, colors: [0xE0F2FE, 0xFDE68A], speed: [0.5, 2], spread: Math.PI, gravity: -0.03, size: 3, life: [16, 28] });
  });
  tl.at(HIT + 6, () => h.weaponShown(true));
  tl.end(HIT + 20);
}

/** Candlemass: the censer is swung low across the floor; a candle sprouts under every foe and flares into a pillar of holy fire. */
function candlemass(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const SWEEP = 14;
  tl.at(0, () => {
    h.anim('ATTACK2');
    swingSound(h, true);
    h.camera(1.04, (h.home.x + foes[foes.length - 1].x) / 2, h.home.y - 46, 60);
  });
  tl.during(0, 10, (t) => h.dim(0.5 * t, 0x0A0703));
  tl.at(SWEEP, () => h.sound('holy', { vol: 0.7 }));
  foes.forEach((t, i) => {
    const sprout = SWEEP + 2 + i * 4;
    const flare = sprout + 16;
    drawSpan(h, tl, sprout, flare + 26, (g, u, f) => {
      const grow = Math.min(1, f / 8);
      const fade = u > 0.8 ? 1 - (u - 0.8) / 0.2 : 1;
      g.rect(t.x - 3, t.y - 14 * grow, 6, 14 * grow).fill({ color: 0xE7E0CF, alpha: fade }).stroke({ width: 1, color: INK, alpha: fade });
      const tall = f < 16 ? 5 : 5 + 90 * easeOut(Math.min(1, (f - 16) / 6));
      g.poly([t.x - 4, t.y - 14 * grow, t.x + Math.sin(f) * 2, t.y - 14 * grow - tall, t.x + 4, t.y - 14 * grow]).fill({ color: 0xFDE68A, alpha: fade });
      if (f >= 16) pillar(g, t.x, t.y - 120, t.y - 14, 18 * (1 - u * 0.6), P_CANDLE, 0.6 * fade);
    });
    tl.at(flare, () => {
      land(h, h.targets.length ? i : undefined, { scale: 0.9, tint: 0xFEF3C7, burst: 'fire', burstSize: 0.6, sfx: 'fire_burst' });
      h.knock(i, 2, 8);
    });
  });
  const last = SWEEP + 18 + (foes.length - 1) * 4;
  tl.during(last + 14, last + 28, (t) => h.dim(0.5 * (1 - t), 0x0A0703));
  tl.end(last + 30);
}

// =============================================================================================
// Tolling Thunder: the storm bell

/** Peal of Thunder: the bell is snatched to lockout and tolls; lightning leaps from it to the foes in turn. */
function pealOfThunder(h: KnightMoveHost, tl: Timeline) {
  const hits = h.targets.length ? [...h.targets] : [h.target, h.target, h.target];
  const TOLL = 18;
  raiseAndHold(h, tl, 0, TOLL + 20);
  tl.at(0, () => h.sound('charge', { vol: 0.6 }));
  tl.during(0, 12, (t) => h.dim(0.55 * t, 0x050A18));
  chargeFx(h, tl, 2, TOLL, () => h.weaponTip(), P_STORM, 30, 10);
  tl.at(TOLL, () => {
    h.sound('block', { rate: 0.45, vol: 0.9 });
    h.sound('thunder', { vol: 0.6 });
    h.flash(0.25, 0xE0F7FF);
    h.shake(4);
  });
  ringFx(h, tl, TOLL, () => h.weaponTip(), 8, 60, 0x67E8F9, 12, 2);
  hits.forEach((t, k) => {
    const at = TOLL + 3 + k * 5;
    const c = chest(t);
    const from = k === 0 ? () => h.weaponTip() : () => chest(hits[k - 1]);
    drawSpan(h, tl, at, at + 8, (g, u) => {
      const s = from();
      bolt(g, s.x, s.y, c.x, c.y, 7, 10, P_STORM, 3, k * 7 + 1, 1 - u);
    });
    tl.at(at, () => {
      land(h, h.targets.length ? k : undefined, { scale: 0.85, tint: 0xA5F3FC, sfx: 'zap' });
      h.knock(k, 6, 2);
      h.sparks(c.x, c.y, 8, [0xA5F3FC, 0xFFFFFF]);
    });
  });
  const last = TOLL + 3 + (hits.length - 1) * 5;
  tl.during(last + 8, last + 20, (t) => h.dim(0.55 * (1 - t), 0x050A18));
  tl.end(last + 22);
}

/** Storm Toll: a phantom belfry bell drops over the pack and the knight's press rings it; the storm answers on every foe. */
function stormToll(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const cx = foes.reduce((s, t) => s + t.x, 0) / foes.length;
  const STRIKE = 26;
  raiseAndHold(h, tl, 0, STRIKE + 6);
  tl.at(0, () => {
    h.camera(1.04, (h.home.x + cx) / 2, h.home.y - 56, 60);
    h.sound('thunder', { vol: 0.5, rate: 0.8 });
  });
  tl.during(0, 12, (t) => h.dim(0.55 * t, 0x050A18));
  drawSpan(h, tl, 4, STRIKE + 30, (g, t, f) => {
    const y = lerp(-60, h.home.y - 90, easeOut(Math.min(1, f / 18)));
    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
    const ring = f > STRIKE - 4 ? Math.sin((f - STRIKE + 4) * 1.2) * 4 : 0;
    phantomBell(g, cx + ring, y, 70, P_STORM, fade);
  });
  tl.at(STRIKE, () => {
    h.sound('block', { rate: 0.38, vol: 1 });
    h.shake(7);
    h.flash(0.3, 0xE0F7FF);
  });
  ringFx(h, tl, STRIKE, { x: cx, y: h.home.y }, 10, 200, 0x67E8F9, 20, 3);
  foes.forEach((t, i) => {
    const at = STRIKE + 4 + i * 4;
    drawSpan(h, tl, at, at + 10, (g, u) => bolt(g, t.x + rand(-6, 6), -10, t.x, t.y - 10, 8, 14, P_STORM, 4, i * 5 + 3, 1 - u));
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: 0.95, tint: 0xA5F3FC, burst: 'crater', burstSize: 0.7, sfx: 'thunder' });
      h.knock(i, 4, 6);
    });
  });
  const last = STRIKE + 4 + (foes.length - 1) * 4;
  tl.during(last + 12, last + 26, (t) => h.dim(0.55 * (1 - t), 0x050A18));
  tl.end(last + 28);
}

// =============================================================================================
// The Midas Bell: gold

/** Golden Touch: the knight thrusts the bell into the foe; gold spreads over it until it is a statue, then the statue shatters. */
function goldenTouch(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const TOUCH = 18;
  const SHATTER = TOUCH + 22;
  tl.at(0, () => h.anim('RUN', true));
  travel(h, tl, 0, 12, HOME, strikeSpot(h, t0, 48), easeInOut);
  tl.at(12, () => {
    h.anim('SKILL1');
    swingSound(h);
  });
  tl.at(TOUCH, () => {
    h.sound('holy', { rate: 1.4, vol: 0.6 });
    h.sound('impact_metal', { rate: 1.6, vol: 0.5 });
    h.camera(1.25, c.x - 10, c.y, SHATTER - TOUCH + 10);
  });
  // Gold creeping over the foe from the point of contact
  tl.every(TOUCH, SHATTER, 2, () => h.flashTarget(0, 0xF2B636, 3));
  drawSpan(h, tl, TOUCH, SHATTER, (g, t, f) => {
    const r = 6 + 26 * easeOut(t);
    g.circle(c.x, c.y, r).fill({ color: 0xF2B636, alpha: 0.12 + 0.18 * t });
    g.circle(c.x, c.y, r).stroke({ width: 2, color: 0xFDE68A, alpha: 0.9 });
    g.circle(c.x, c.y, r * 0.6).stroke({ width: 1, color: 0xFFFBEA, alpha: 0.5 });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + f * 0.08;
      const gx = c.x + Math.cos(a) * r;
      const gy = c.y + Math.sin(a) * r;
      g.rect(gx - 2, gy - 0.5, 5, 1).fill({ color: 0xFFFBEA }).rect(gx - 0.5, gy - 2, 1, 5).fill({ color: 0xFFFBEA });
    }
  });
  backstep(h, tl, SHATTER - 4, SHATTER + 10, 12);
  hitFx(h, tl, SHATTER, c, P_GILT, 28, [0xFFFBEA, 0xF2B636, 0xB7791F]);
  tl.at(SHATTER, () => {
    land(h, 0, { scale: 1.4, tint: 0xFDE68A, flash: 0xFFFBEA, glare: 0.8, sfx: 'crack' });
    h.camera(1.36, c.x, c.y, 10, true);
    shards(h, c, 22);
    h.emit(c.x, c.y, { count: 30, colors: [0xF2B636, 0xFDE68A, 0xB7791F], speed: [1.5, 4.5], spread: Math.PI, gravity: 0.25, size: 3, life: [16, 30] });
    h.knock(0, 10, 4);
  });
  tl.end(SHATTER + 22);
}

/** Treasury Rain: the bell is swung skyward and the vault opens overhead; a cascade of gold coins hammers the pack. */
function treasuryRain(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const SWING = 12;
  tl.at(0, () => {
    h.anim('ATTACK3');
    swingSound(h, true);
    h.camera(1.04, (h.home.x + foes[foes.length - 1].x) / 2, h.home.y - 56, 70);
  });
  tl.at(SWING, () => h.sound('gears', { vol: 0.6 }));
  // A golden rift opens above the pack
  const cx = foes.reduce((s, t) => s + t.x, 0) / foes.length;
  drawSpan(h, tl, SWING, SWING + 56, (g, t, f) => {
    const w = 80 * easeOut(Math.min(1, f / 10)) * (t > 0.8 ? (1 - t) / 0.2 : 1);
    g.ellipse(cx, 30, w, 10).fill({ color: 0xF2B636, alpha: 0.6 }).stroke({ width: 2, color: 0xFFFBEA });
  });
  drawSpan(h, tl, SWING + 6, SWING + 44, (g, _t, f) => {
    for (let k = 0; k < 36; k++) {
      const start = (k * 7) % 30;
      const u = (f - start) / 16;
      if (u < 0 || u > 1) continue;
      const x = cx - 80 + ((k * 37) % 160);
      const y = lerp(30, h.home.y - 4, u * u);
      const spin = Math.abs(Math.cos(f * 0.5 + k));
      g.ellipse(x, y, 1 + 3 * spin, 4).fill({ color: k % 3 ? 0xF2B636 : 0xFDE68A }).stroke({ width: 1, color: 0x7C4A03 });
    }
  });
  tl.every(SWING + 8, SWING + 40, 4, (i) => h.sound('impact_metal', { rate: 1.8 + (i % 3) * 0.2, vol: 0.25 }));
  foes.forEach((t, i) => {
    const at = SWING + 20 + i * 4;
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: 0.9, tint: 0xFDE68A, sfx: 'impact_metal' });
      h.knock(i, 2, -4);
      debris(h, { x: t.x, y: t.y }, 8, [0xF2B636, 0xFDE68A, 0xB7791F]);
    });
  });
  tl.end(SWING + 60);
}

// =============================================================================================
// The Heartforge: the titan's fire

/** Quench: the blade drinks the forge's heat and the knight lunges, driving a lance of white-hot steam through the line. */
function quench(h: KnightMoveHost, tl: Timeline) {
  const hits = h.targets.length ? [...h.targets] : [h.target];
  const far = hits[hits.length - 1];
  const THRUST = 24;
  tl.at(0, () => {
    h.anim('DEFENSE');
    chargeSound(h, THRUST);
    h.camera(1.1, h.home.x + 40, h.home.y - 30, THRUST);
  });
  chargeFx(h, tl, 0, THRUST - 2, () => h.weaponTip(), P_FORGE, 34, 12);
  tl.during(0, THRUST, (t) => h.tint(t > 0.5 ? 0xFFD9B0 : 0xFFFFFF));
  tl.at(THRUST, () => {
    h.anim('ATTACK1');
    swingSound(h, true);
    h.tint(0xFFFFFF);
    h.camera(1.2, (h.pos().x + far.x) / 2, far.y - 30, 20, true);
  });
  travel(h, tl, THRUST, THRUST + 6, here(h), strikeSpot(h, hits[0], 70), easeOut);
  ghostTrail(h, tl, THRUST, THRUST + 6, 0xFB923C, 1, 0.5);
  drawSpan(h, tl, THRUST + 2, THRUST + 22, (g, t) => {
    const k = kFront(h);
    lance(g, k.x, k.y, far.x + 40, chest(far).y, 10 * (1 - t) + 2, P_FORGE, 1 - t);
  });
  tl.every(THRUST + 2, THRUST + 20, 2, () => {
    const k = kFront(h);
    h.emit(lerp(k.x, far.x, Math.random()), chest(far).y + rand(-6, 6), { count: 1, colors: [0xF5F5F4, 0xFDE68A], speed: [0.3, 1], angle: -Math.PI / 2, spread: 1, gravity: -0.02, size: 3, life: [16, 28] });
  });
  hits.forEach((t, k) => {
    tl.at(THRUST + 4 + k * 3, () => {
      land(h, h.targets.length ? k : undefined, { scale: 1, tint: 0xFED7AA, burst: 'fire', burstSize: 0.6, sfx: 'fire_burst' });
      h.sound('frost', { rate: 0.6, vol: 0.4 }); // the hiss of the quench
      h.knock(k, 12, 2);
    });
  });
  backstep(h, tl, THRUST + 16, THRUST + 32, 14);
  tl.end(THRUST + 34);
}

/** Titan's Anvil: a spectral anvil slams down behind the foe and the knight hammers it onto the anvil, sparks raining. */
function titansAnvil(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const HITS = [30, 38];
  tl.at(0, () => h.anim('RUN', true));
  travel(h, tl, 0, 12, HOME, strikeSpot(h, t0, 56), easeInOut);
  drawSpan(h, tl, 6, HITS[1] + 20, (g, t, f) => {
    const y = lerp(-40, t0.y, easeIn(Math.min(1, f / 8)));
    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 0.85;
    g.poly([t0.x - 30, y - 18, t0.x + 26, y - 18, t0.x + 36, y - 24, t0.x + 26, y - 12, t0.x + 12, y - 10, t0.x + 16, y, t0.x - 20, y, t0.x - 16, y - 10]).fill({ color: 0xEA580C, alpha: 0.55 * fade }).stroke({ width: 2, color: 0xFDE68A, alpha: fade });
  });
  tl.at(14, () => {
    h.sound('impact_metal', { rate: 0.5, vol: 0.7 });
    h.shake(4);
    dust(h, { x: t0.x, y: t0.y }, 8, 0);
  });
  HITS.forEach((at, k) => {
    tl.at(at - 8, () => {
      h.anim(k === 0 ? 'ATTACK4' : 'SKILL1');
      swingSound(h, k === 1);
    });
    hitFx(h, tl, at, c, P_FORGE, k === 1 ? 26 : 16, [0xFDE68A, 0xFB923C, 0xFFFFFF]);
    tl.at(at, () => {
      if (k === HITS.length - 1) {
        land(h, 0, { scale: 1.35, tint: 0xFED7AA, burst: 'explosion', burstSize: 1, sfx: 'impact_metal' });
        h.camera(1.3, c.x, c.y, 10, true);
        h.knock(0, 8, -4);
      } else {
        h.flashTarget(0, 0xFB923C, 4);
        h.sound('impact_metal', { rate: 1.2, vol: 0.7 });
        h.shake(3);
      }
      h.emit(c.x, c.y, { count: k === 1 ? 36 : 16, colors: [0xFDE68A, 0xFB923C, 0xFFFFFF], speed: [1.5, 4.5], angle: -Math.PI / 2, spread: 1.4, gravity: 0.25, size: 2, life: [12, 26] });
    });
  });
  backstep(h, tl, HITS[1] + 6, HITS[1] + 22, 14);
  tl.end(HITS[1] + 24);
}

// =============================================================================================
// The Hollow Bell: the rift

/** Stare Back: the knight holds the bell out and its eye opens wide over the foe; a beam of the void strips its armour away. */
function stareBack(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const OPEN = 16;
  const HIT = OPEN + 16;
  tl.at(0, () => {
    h.anim('DEFENSE');
    h.camera(1.14, (h.home.x + t0.x) / 2, h.home.y - 46, HIT + 10);
    h.sound('portal', { vol: 0.6, rate: 0.7 });
  });
  tl.during(0, 12, (t) => h.dim(0.65 * t, 0x07020F));
  const at = { x: (h.home.x + t0.x) / 2, y: h.home.y - 86 };
  drawSpan(h, tl, 4, HIT + 22, (g, t, f) => {
    const open = f < OPEN ? 0 : Math.min(1, (f - OPEN + 2) / 6);
    const fade = t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1;
    eye(g, at.x, at.y, 22, open * fade, (c.x - at.x) / 60, P_SICK, fade);
  });
  tl.at(OPEN, () => {
    h.sound('wail', { rate: 1.6, vol: 0.5 });
    h.shake(2);
  });
  drawSpan(h, tl, OPEN + 6, HIT + 10, (g, t) => {
    const w = t < 0.4 ? 4 + 10 * (t / 0.4) : 14 * (1 - t);
    lance(g, at.x, at.y, c.x, c.y, w, P_HOLLOW, 1);
  });
  hitFx(h, tl, HIT, c, P_HOLLOW, 24);
  tl.at(HIT, () => {
    land(h, 0, { scale: 1.35, tint: 0xE9D5FF, flash: 0xF3E8FF, glare: 0.7, burst: 'portal', burstSize: 1, sfx: 'portal' });
    h.camera(1.3, c.x, c.y, 10, true);
    shards(h, c, 16);
    h.knock(0, 8, 2);
  });
  tl.during(HIT + 12, HIT + 26, (t) => h.dim(0.65 * (1 - t), 0x07020F));
  tl.end(HIT + 28);
}

/** Rift Hymn: the bell is circled round the head and sings; rifts tear open under every foe and tentacles seize them. */
function riftHymn(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const SING = 16;
  tl.at(0, () => {
    h.anim('SKILL2TULUC');
    h.camera(1.04, (h.home.x + foes[foes.length - 1].x) / 2, h.home.y - 46, 70);
  });
  tl.during(0, 12, (t) => h.dim(0.6 * t, 0x07020F));
  drawSpan(h, tl, 2, SING + 40, (g, t, f) => {
    const p = h.pos();
    runeCircle(g, p.x, p.y, 34, f * 0.06, P_HOLLOW, t > 0.8 ? 1 - (t - 0.8) / 0.2 : 0.8);
  }, 'ground');
  tl.every(SING - 10, SING + 30, 5, (i) => h.sound('wail', { rate: 1.2 + (i % 4) * 0.15, vol: 0.25 }));
  foes.forEach((t, i) => {
    const open = SING + i * 5;
    const grab = open + 12;
    drawSpan(h, tl, open, grab + 20, (g, u, f) => {
      const w = 18 * easeOut(Math.min(1, f / 6)) * (u > 0.8 ? (1 - u) / 0.2 : 1);
      g.ellipse(t.x, t.y + 2, w + 2, w * 0.3 + 1).fill({ color: 0x07020F }).stroke({ width: 1.5, color: 0xA855F7 });
      if (f > 6) {
        const reach = Math.min(1, (f - 6) / 6);
        for (const side of [-1, 1]) tentacle(g, t.x + side * w * 0.5, t.y, t.x + side * 4, t.y - 30 * reach, 4, side * 8, 0x3B0764, 0x7E22CE, false);
      }
    }, 'fx');
    tl.at(grab, () => {
      land(h, h.targets.length ? i : undefined, { scale: 0.9, tint: 0xE9D5FF, sfx: 'squelch' });
      h.knock(i, 0, -6);
    });
  });
  const last = SING + (foes.length - 1) * 5 + 12;
  tl.during(last + 14, last + 28, (t) => h.dim(0.6 * (1 - t), 0x07020F));
  tl.end(last + 30);
}

// =============================================================================================
// Excalibane: the shadow twin

/** Eclipse Edge: a black sun rises behind the knight, and the blade cuts a crescent of night through the line. */
function eclipseEdge(h: KnightMoveHost, tl: Timeline) {
  const hits = h.targets.length ? [...h.targets] : [h.target];
  const CUT = 22;
  tl.at(0, () => {
    h.anim('DEFENSE');
    h.camera(1.08, h.home.x + 60, h.home.y - 44, CUT + 20);
    h.sound('dark', { vol: 0.7 });
  });
  tl.during(0, 14, (t) => h.dim(0.7 * t, 0x050208));
  drawSpan(h, tl, 0, CUT + 30, (g, t, f) => {
    const p = h.pos();
    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : Math.min(1, f / 10);
    blackHole(g, p.x - 10, p.y - 90, 22, f, P_BANE, fade);
  }, 'back');
  tl.at(CUT - 6, () => {
    h.anim('ATTACK2');
    swingSound(h, true);
  });
  travel(h, tl, CUT - 6, CUT, HOME, strikeSpot(h, hits[0], 60), easeOut);
  ghostTrail(h, tl, CUT - 6, CUT + 2, 0xA78BFA, 1, 0.45);
  const p0 = once(() => h.pos());
  slashFx(h, tl, CUT, { x: p0().x + 50, y: p0().y - 30, r: 80, a0: -1.6, a1: 1.2, thick: 14, p: P_BANE, dur: 12 });
  hits.forEach((t, k) => {
    tl.at(CUT + 1 + k * 3, () => {
      land(h, h.targets.length ? k : undefined, { scale: 1.05, tint: 0xDDD6FE, burst: 'slash', burstSize: 1, sfx: 'slash_heavy' });
      h.knock(k, 10, 2);
    });
  });
  tl.at(CUT, () => h.camera(1.22, hits[0].x, hits[0].y - 30, 10, true));
  backstep(h, tl, CUT + 12, CUT + 28, 14);
  tl.during(CUT + 20, CUT + 34, (t) => h.dim(0.7 * (1 - t), 0x050208));
  tl.end(CUT + 36);
}

/** Twin Sovereigns: Excalibell's golden ghost rises beside the knight; light and shadow blades fall crossed on every foe. */
function twinSovereigns(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const DROP = 26;
  raiseAndHold(h, tl, 0, DROP + 8);
  tl.at(0, () => {
    h.camera(1.04, (h.home.x + foes[foes.length - 1].x) / 2, h.home.y - 56, 70);
    h.sound('holy', { vol: 0.6 });
    h.sound('dark', { vol: 0.6, delay: 0.15 });
  });
  tl.during(0, 14, (t) => h.dim(0.6 * t, 0x07040F));
  // Wings of light and shadow behind the knight
  drawSpan(h, tl, 4, DROP + 30, (g, t, f) => {
    const p = h.pos();
    const open = easeOut(Math.min(1, f / 12)) * (t > 0.8 ? (1 - t) / 0.2 : 1);
    wing(g, p.x - 6, p.y - 40, 40, -1, open, pal(0xFBBF24, 0xFFFBEA, 0x3B2205), 0.8);
    wing(g, p.x + 6, p.y - 40, 40, 1, open, P_BANE, 0.8);
  }, 'back');
  foes.forEach((t, i) => {
    const at = DROP + i * 4;
    for (const [k, color] of [[0, 0xFBBF24], [1, 0xA78BFA]] as const) {
      drawSpan(h, tl, at - 10, at + 1, (g, u) => {
        const side = k ? 1 : -1;
        const x = t.x + side * 20 * (1 - u);
        const y = lerp(-30, t.y - 20, easeIn(u));
        const tipX = x - side * 6 * (1 - u);
        g.moveTo(x, y - 44).lineTo(tipX, y).stroke({ width: 8, color, alpha: 0.35 });
        g.poly([x - 3, y - 40, x + 3, y - 40, tipX + 1, y, tipX - 1, y]).fill({ color }).stroke({ width: 1, color: INK });
        g.moveTo(x, y - 40).lineTo(tipX, y - 2).stroke({ width: 1, color: 0xFFFFFF });
        g.rect(x - 7, y - 42, 14, 3).fill({ color }).stroke({ width: 1, color: INK });
        g.rect(x - 1.5, y - 52, 3, 10).fill({ color: 0x3F3F46 });
      });
    }
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: 1, tint: 0xFEF3C7, burst: 'slash', burstSize: 0.9, sfx: 'slash_heavy' });
      h.knock(i, 4, -4);
      h.sparks(t.x, t.y - 20, 10, [0xFBBF24, 0xA78BFA, 0xFFFFFF]);
    });
  });
  const last = DROP + (foes.length - 1) * 4;
  tl.at(DROP, () => h.flash(0.25, 0xFFFBEA));
  tl.during(last + 12, last + 26, (t) => h.dim(0.6 * (1 - t), 0x07040F));
  tl.end(last + 28);
}

/** One move per secret-weapon spell templateId. */
export const SECRET_SPELL_MOVES: Record<string, KnightMove> = {
  spell_test_your_strength: testYourStrength,
  spell_big_top_finale: bigTopFinale,
  spell_undertow: undertow,
  spell_leviathans_maw: leviathansMaw,
  spell_sanctified_smoke: sanctifiedSmoke,
  spell_candlemass: candlemass,
  spell_peal: pealOfThunder,
  spell_storm_toll: stormToll,
  spell_golden_touch: goldenTouch,
  spell_treasury_rain: treasuryRain,
  spell_quench: quench,
  spell_titans_anvil: titansAnvil,
  spell_stare_back: stareBack,
  spell_rift_hymn: riftHymn,
  spell_eclipse_edge: eclipseEdge,
  spell_twin_sovereigns: twinSovereigns,
};

