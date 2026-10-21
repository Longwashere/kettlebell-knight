/**
 * Choreography for the secret-trial weapons' spells (src/types/weaponSpells.ts, src/shared/secretTrials.ts), two
 * per weapon, in the same motion language as spellMoves.ts (maces crush, morning stars whirl and hurl, bells swing
 * and press, swords cut) and built on its helpers. Merged into KNIGHT_MOVES next to SPELL_MOVES. Review with
 *   npm run shot -- "encounter:wolf,boar,slime" idle kfilm:<templateId>:16:4:0,1,2
 */
import type { Graphics } from 'pixi.js';
import { Timeline, lerp, easeIn, easeOut, easeInOut, arc, rand, INK } from './choreo';
import { pal, crescent, scorch, runeCircle, orb, wing, lance, hash } from './fxKit';
import { tentacle } from './monsterKit';
import { stamp, stampPal, fxReady } from './fxAtlas';
import {
  type KnightMove, type KnightMoveHost, type P, each, once, strikeSpot, chest, land, travel, here, HOME, backstep,
  ghostTrail, swingSound, chargeSound, drawSpan, slashFx, hitFx, ringFx, debris, dust, shards,
} from './knightKit';
import { whirl, raiseAndHold, chain, eye, phantomBell, anchor } from './spellMoves';
import {
  lightSpan, glow, glint, godRay, focusLines, speedLines, impactFrame, shockSphere, skyBolt, groundCracks,
  weaponTrail, windUp, afterglow, mix,
  LOOK, themed, staged, chargeUp, motes, breath, dutch, signature,
} from './spellKit';

const P_FANG = pal(0xE7E5E4, 0xFFFFFF, 0x1C1917);
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

// Each spell's look for the director beats (spellKit chargeUp / signature): element, colour, motif, voice.
const L_STRONG = themed(LOOK.EARTH, 0xF2B636, 'bell', { core: 0xFFF7D6, deep: 0x0B0716, sound: 'impact_metal' });
const L_CIRCUS = themed(LOOK.EARTH, 0xF472B6, 'star', { core: 0xFFF1F7, deep: 0x0B0716, sound: 'explosion' });
const L_DEEP = themed(LOOK.FROST, 0x2DD4BF, 'wave', { core: 0xCCFBF1, deep: 0x02161D, sound: 'wave' });
const L_MAW = themed(LOOK.FROST, 0x22D3EE, 'wave', { core: 0xCCFBF1, deep: 0x02161D, sound: 'chomp' });
const L_CENSER = themed(LOOK.HOLY, 0x7DD3FC, 'cross', { core: 0xF0F9FF, deep: 0x06121C });
const L_CANDLE = themed(LOOK.HOLY, 0xFDE68A, 'flame', { core: 0xFFFBEB, deep: 0x0A0703, sound: 'fire_burst' });
const L_PEAL = themed(LOOK.STORM, 0x67E8F9, 'bolt', { deep: 0x050A18, sound: 'thunder' });
const L_STORMBELL = themed(LOOK.STORM, 0x93C5FD, 'bell', { deep: 0x050A18, sound: 'thunder' });
const L_GOLD = themed(LOOK.EARTH, 0xF2B636, 'coin', { core: 0xFFFBEA, deep: 0x0F0A02, sound: 'impact_metal' });
const L_QUENCH = themed(LOOK.FIRE, 0xFB923C, 'flame', { core: 0xFEF3C7, deep: 0x140602, sound: 'hiss' });
const L_ANVIL = themed(LOOK.FIRE, 0xEA580C, 'star', { core: 0xFEF3C7, deep: 0x140602, sound: 'impact_metal' });
const L_HOLLOW = themed(LOOK.VOID, 0xC084FC, 'eye', { core: 0xF3E8FF, deep: 0x07020F, sound: 'portal' });
const L_HYMN = themed(LOOK.VOID, 0x4ADE80, 'note', { core: 0xDCFCE7, deep: 0x07020F, sound: 'wail' });
const L_ECLIPSE = themed(LOOK.VOID, 0xA78BFA, 'moon', { deep: 0x050208 });
const L_SOVEREIGN = themed(LOOK.VOID, 0xFBBF24, 'cross', { core: 0xFFFBEA, deep: 0x07040F, sound: 'holy' });
/** In front of the knight's chest, where a thrust leaves from. */
const kFront = (h: KnightMoveHost) => ({ x: h.pos().x + 24, y: h.pos().y - 26 });

const LIGHTS = [0xF87171, 0xFBBF24, 0x34D399, 0x60A5FA, 0xF472B6];

// =============================================================================================
// The Bellringer's Mallet: carnival strongman

/**
 * Test Your Strength: a spectral High Striker springs up behind the foe, its marquee bulbs dark; the knight
 * brings the mallet down on its pad, the puck rockets up the pole lighting every bulb, rings the bell, and the
 * bell breaks loose and drops on the foe's head.
 */
function testYourStrength(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const pole = { x: t0.x + 24, top: t0.y - 100 };
  const PAD = 28; // the mallet hits the pad
  const DING = PAD + 10;
  const HIT = DING + 14;
  const DIM = 0x0B0716;
  const BULBS = 9;
  tl.at(0, () => h.anim('RUN', true));
  travel(h, tl, 0, 12, HOME, strikeSpot(h, t0, 54), easeInOut);
  ghostTrail(h, tl, 0, 12, 0xF2B636, 2, 0.35);
  tl.every(0, 12, 6, () => h.sound('step', { vol: 0.4 }));
  tl.during(0, 12, (t) => h.dim(0.55 * t, DIM));
  const puckY = (t: number) => lerp(t0.y - 4, pole.top + 6, easeOut(t));
  // The striker rises out of the ground
  drawSpan(h, tl, 6, HIT + 26, (g, t, f) => {
    const up = easeOut(Math.min(1, f / 10));
    const fade = t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1;
    const top = lerp(t0.y, pole.top, up);
    for (let y = t0.y; y > top; y -= 8) g.rect(pole.x - 3, y - 8, 6, 4).fill({ color: 0xDC2626, alpha: fade }).rect(pole.x - 3, y - 4, 6, 4).fill({ color: 0xFDF4E3, alpha: fade });
    g.rect(pole.x - 14, t0.y - 4, 28, 6).fill({ color: 0x5B2A12, alpha: fade }).stroke({ width: 1, color: INK, alpha: fade });
    for (let b = 0; b < BULBS; b++) g.circle(pole.x - 8, lerp(t0.y - 10, pole.top + 8, b / (BULBS - 1)), 1.5).fill({ color: 0x57534E, alpha: fade });
    if (f < DING - 6) orb(g, pole.x, top - 4, 7, P_BRASS, fade);
  }, 'back');
  // Marquee bulbs light one by one as the puck passes them
  lightSpan(h, tl, PAD, HIT + 26, (g, t, f) => {
    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
    const lit = f >= DING - PAD ? BULBS : Math.floor(((t0.y - puckY(f / (DING - PAD))) / (t0.y - pole.top)) * BULBS + 1);
    for (let b = 0; b < Math.min(BULBS, lit); b++) {
      const chase = f > DING - PAD ? (Math.floor(f / 3) + b) % 2 : 1;
      glow(g, pole.x - 8, lerp(t0.y - 10, pole.top + 8, b / (BULBS - 1)), 6, LIGHTS[b % LIGHTS.length], fade * (0.5 + 0.5 * chase));
    }
  }, 'back');
  tl.at(12, () => {
    h.anim('ATTACK4');
    h.animSpeed(0.5);
  });
  windUp(h, tl, 12, PAD - 3, 0xF2B636, { zoom: 1.2, reach: 34 });
  chargeUp(h, tl, 12, PAD - 3, L_STRONG, { motes: false, breath: 5, freeze: false, circle: 30 });
  dutch(h, tl, PAD, 0.07, DING - PAD);
  tl.during(14, PAD - 3, (t) => h.lift(easeOut(t) * 10));
  tl.at(PAD - 3, () => {
    h.animSpeed(1.8);
    swingSound(h, true);
  });
  tl.during(PAD - 3, PAD, (t) => h.lift(lerp(10, 0, easeIn(t))));
  tl.at(PAD, () => {
    h.animSpeed(1);
    h.shake(6);
    h.hitStop(4);
    h.sound('impact_heavy', { vol: 0.8 });
    h.emit(pole.x - 6, t0.y - 2, { count: 14, colors: [0xFDF4E3, 0xFBBF24], speed: [1, 3], angle: -Math.PI / 2, spread: 1, gravity: 0.2, size: 2, life: [10, 18] });
    h.camera(1.08, pole.x - 20, (t0.y + pole.top) / 2, HIT - PAD);
  });
  shockSphere(h, tl, PAD, { x: pole.x - 6, y: t0.y - 4 }, 30, 0xF2B636, 10);
  // The puck rockets up the pole
  drawSpan(h, tl, PAD, DING + 1, (g, t) => {
    const y = puckY(t);
    g.rect(pole.x - 6, y - 3, 12, 6).fill({ color: 0xE5E7EB }).stroke({ width: 1, color: INK });
  });
  weaponTrail(h, tl, PAD, DING + 1, P_BRASS, 10, 8, () => ({ x: pole.x, y: puckY((tl.frame - PAD) / (DING - PAD)) }));
  tl.at(DING, () => {
    h.sound('impact_metal', { rate: 1.9, vol: 0.9 });
    h.sound('ui_select', { vol: 0.6 });
    h.flash(0.2, 0xFFF7D6);
    h.emit(pole.x, pole.top - 4, { count: 30, colors: LIGHTS, speed: [1.5, 4.5], spread: Math.PI, gravity: 0.15, size: 2, life: [14, 28] });
  });
  lightSpan(h, tl, DING, DING + 16, (g, t) => {
    glow(g, pole.x, pole.top - 4, 40 * (1 - t) + 10, 0xFDE68A, 1 - t);
    glint(g, pole.x, pole.top - 4, 30 * (1 - t) + 4, t, 0xFFFFFF, 1 - t);
  });
  ringFx(h, tl, DING, { x: pole.x, y: pole.top }, 6, 60, 0xFBBF24, 14, 2);
  // The bell breaks loose and drops on the foe
  const bellAt = (t: number): P => ({ x: lerp(pole.x, c.x, t), y: lerp(pole.top - 4, c.y - 26, easeIn(t)) - arc(t) * 20 });
  drawSpan(h, tl, DING + 2, HIT + 1, (g, t) => {
    const p = bellAt(t);
    orb(g, p.x, p.y, 9, P_BRASS);
    g.rect(p.x - 2, p.y - 12, 4, 4).fill({ color: 0x78716C });
  });
  weaponTrail(h, tl, DING + 2, HIT + 1, P_BRASS, 12, 8, () => bellAt((tl.frame - DING - 2) / (HIT - DING - 2)));
  hitFx(h, tl, HIT, { x: c.x, y: c.y - 22 }, P_BRASS, 24);
  shockSphere(h, tl, HIT, { x: c.x, y: c.y - 20 }, 50, 0xF2B636, 14, 0xFFF7D6);
  tl.at(HIT, () => {
    land(h, 0, { scale: 1.35, tint: 0xFDE68A, burst: 'crater', burstSize: 1, sfx: 'impact_metal', glare: 0.2 });
    impactFrame(h, tl, { x: c.x, y: c.y - 20 }, { color: 0xF2B636, dim: [0.55, DIM] });
    h.roll(-0.1, 10, true);
    signature(h, tl, HIT, { x: c.x, y: c.y - 20 }, L_STRONG, 48);
    h.sound('impact_metal', { rate: 1.4, vol: 0.7, delay: 0.05 });
    h.camera(1.32, c.x, c.y - 10, 10, true);
    h.knock(0, 4, -8);
  });
  // Seeing stars
  lightSpan(h, tl, HIT + 4, HIT + 34, (g, t, f) => {
    for (let k = 0; k < 4; k++) {
      const a = f * 0.25 + (k / 4) * Math.PI * 2;
      glint(g, c.x + Math.cos(a) * 14, c.y - t0.height * 0.5 + Math.sin(a) * 4, 5, 0, 0xFDE68A, 1 - t);
    }
  });
  backstep(h, tl, HIT + 8, HIT + 24, 14);
  tl.during(HIT + 12, HIT + 28, (t) => h.dim(0.55 * (1 - t), DIM));
  tl.end(HIT + 30);
}

/**
 * Big Top Finale: spotlights sweep a darkened ring; the knight presses the mallet overhead and rings it like a
 * ringmaster's bell; mortars fire from the floor and fireworks burst over every foe, raining down on them.
 */
function bigTopFinale(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const TOLL = 22;
  const DIM = 0x0B0716;
  raiseAndHold(h, tl, 0, TOLL + 8);
  tl.at(0, () => {
    h.camera(1.18, h.home.x + 10, h.home.y - 44, TOLL);
    h.sound('victory', { vol: 0.35, rate: 1.2 });
  });
  tl.during(0, 12, (t) => h.dim(0.7 * t, DIM));
  chargeUp(h, tl, 2, TOLL, L_CIRCUS, { breath: 5, freeze: false, circle: 38 });
  dutch(h, tl, TOLL, -0.06, 20, false);
  // Spotlights sweep the arena, then all swing onto the knight for the toll
  lightSpan(h, tl, 0, TOLL + 60, (g, t, f) => {
    const fade = t > 0.85 ? 1 - (t - 0.85) / 0.15 : Math.min(1, f / 8);
    for (let k = 0; k < 3; k++) {
      const sweep = 150 + k * 110 + Math.sin(f * 0.07 + k * 2) * 60;
      const x = f < TOLL ? lerp(sweep, h.home.x, easeIn(Math.min(1, f / TOLL))) : sweep;
      const src = 60 + k * 150;
      g.poly([src - 4, -10, src + 4, -10, x + 26, h.home.y + 4, x - 26, h.home.y + 4]).fill({ color: LIGHTS[k * 2], alpha: 0.16 * fade });
      g.ellipse(x, h.home.y + 2, 28, 6).fill({ color: LIGHTS[k * 2], alpha: 0.25 * fade });
    }
  }, 'back');
  tl.at(TOLL, () => {
    h.sound('impact_metal', { rate: 1.6, vol: 0.9 });
    h.shake(6);
    h.hitStop(3);
    const p = h.weaponTip();
    h.emit(p.x, p.y, { count: 24, colors: LIGHTS, speed: [1, 3.5], spread: Math.PI, gravity: 0.1, size: 2, life: [14, 26] });
    h.camera(1.02, (h.home.x + foes[foes.length - 1].x) / 2 + 20, h.home.y - 64, 50);
  });
  lightSpan(h, tl, TOLL, TOLL + 14, (g, t) => glint(g, h.weaponTip().x, h.weaponTip().y, 30 * (1 - t) + 4, 0, 0xFFF1F7, 1 - t));
  ringFx(h, tl, TOLL, () => h.weaponTip(), 6, 80, 0xFBBF24, 14, 2);
  const last = foes.length - 1;
  foes.forEach((t, i) => {
    const fire = TOLL + 4 + i * 5;
    const pop = fire + 10;
    const at = pop + 6;
    const c = chest(t);
    const color = LIGHTS[(i * 2 + 1) % LIGHTS.length];
    const burstAt = { x: t.x, y: t.y - t.height - 34 };
    // Mortar shell rising from the floor beside the foe
    tl.at(fire, () => h.sound('shoot', { rate: 0.7, vol: 0.5 }));
    drawSpan(h, tl, fire - 4, fire + 2, (g) => g.rect(t.x + 12, t.y - 8, 10, 10).fill({ color: 0x7F1D1D }).stroke({ width: 1, color: INK }));
    weaponTrail(h, tl, fire, pop + 1, pal(color, 0xFFFFFF, INK), 5, 8, () => {
      const u = Math.min(1, (tl.frame - fire) / (pop - fire));
      return { x: lerp(t.x + 17, burstAt.x, u), y: lerp(t.y - 8, burstAt.y, easeOut(u)) };
    });
    // The firework: a sphere of light-streaks, then its sparks fall burning onto the foe
    lightSpan(h, tl, pop, pop + 22, (g, u) => {
      const r = 40 * easeOut(u);
      const a = 1 - u;
      for (let k = 0; k < 16; k++) {
        const ang = (k / 16) * Math.PI * 2;
        const x1 = burstAt.x + Math.cos(ang) * r;
        const y1 = burstAt.y + Math.sin(ang) * r + u * u * 18;
        g.moveTo(burstAt.x + Math.cos(ang) * r * 0.6, burstAt.y + Math.sin(ang) * r * 0.6 + u * u * 12).lineTo(x1, y1).stroke({ width: 2, color, alpha: a });
        g.circle(x1, y1, 1.5).fill({ color: 0xFFFFFF, alpha: a });
      }
      glow(g, burstAt.x, burstAt.y, 30 * (1 - u) + 6, color, a);
    });
    tl.at(pop, () => {
      h.sound('explosion', { rate: 1.5, vol: 0.5 });
      h.sound('fire_burst', { rate: 1.6, vol: 0.4 });
      h.emit(burstAt.x, burstAt.y, { count: 26, colors: [color, 0xFFFFFF, ...LIGHTS], speed: [1, 3.5], spread: Math.PI, gravity: 0.12, size: 2, life: [18, 34] });
    });
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: i === last ? 1 : 0.9, tint: 0xFBCFE8, burst: 'explosion', burstSize: 0.7, sfx: 'explosion', glare: i === last ? 0.2 : 0.5 });
      if (i === last) {
        impactFrame(h, tl, c, { color: 0xF472B6, dim: [0.7, DIM] });
        h.roll(0.1, 10, true);
        signature(h, tl, tl.frame, c, L_CIRCUS, 50);
      }
      h.knock(i, 4, 10);
      h.emit(c.x, c.y - 10, { count: 20, colors: LIGHTS, speed: [1.5, 4], spread: Math.PI, gravity: 0.15, size: 2, life: [16, 30] });
    });
  });
  // Confetti drifts over the ring
  tl.every(TOLL + 10, TOLL + 50, 2, () => h.emit(rand(160, 420), rand(20, 60), { count: 2, colors: LIGHTS, speed: [0.2, 0.8], angle: Math.PI / 2, spread: 0.8, gravity: 0.03, size: 2, life: [30, 50] }));
  const end = TOLL + 20 + last * 5;
  tl.during(end + 8, end + 24, (t) => h.dim(0.7 * (1 - t), DIM));
  tl.end(end + 26);
}

// =============================================================================================
// The Leviathan's Anchor: the deep

/** Undertow: the anchor is hurled past the pack and bites the floor; the knight rows it back in a wave that drags them all. */
function undertow(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const far = { x: Math.min(424, Math.max(...foes.map((t) => t.x)) + 40), y: h.home.y };
  const OUT = 22; // the anchor bites behind them
  const HAUL = OUT + 26; // the wave reaches the knight's side
  const DIM = 0x02161D;
  const head = whirl(h, tl, 0, 14, P_DEEP, {
    reach: 22, link: 0x57534E, trail: [0xCCFBF1, 0x2DD4BF],
    head: (g, x, y, f) => anchor(g, x, y, 1, f * 0.3, P_DEEP),
  });
  tl.at(0, () => h.camera(1.2, h.home.x + 10, h.home.y - 40, 14));
  chargeUp(h, tl, 0, 14, L_DEEP, { breath: 4, freeze: false, circle: 34 });
  dutch(h, tl, OUT, 0.06, HAUL - OUT, false);
  tl.during(0, 12, (t) => h.dim(0.6 * t, DIM));
  tl.at(2, () => h.weaponShown(false));
  tl.at(14, () => {
    h.anim('ATTACK2');
    swingSound(h, true);
    h.camera(1.02, (h.home.x + far.x) / 2, h.home.y - 44, HAUL - 14 + 20);
  });
  const from = once(() => head());
  const flyAt = (t: number): P => ({ x: lerp(from().x, far.x, easeOut(t)), y: lerp(from().y, far.y - 8, t) - arc(t) * 44 });
  drawSpan(h, tl, 14, OUT + 1, (g, t, f) => {
    const p = flyAt(t);
    chain(g, h.pos().x + 12, h.pos().y - 30, p.x, p.y, 0x57534E, 10 * (1 - t));
    anchor(g, p.x, p.y, 1.2, f * 0.4, P_DEEP);
  });
  weaponTrail(h, tl, 14, OUT + 1, P_DEEP, 8, 8, () => flyAt(Math.min(1, (tl.frame - 14) / (OUT - 14))));
  tl.at(OUT, () => {
    h.sound('rock', { vol: 0.6 });
    h.shake(4);
    h.hitStop(2);
    dust(h, { x: far.x, y: far.y }, 10, -1);
  });
  shockSphere(h, tl, OUT, { x: far.x, y: far.y - 6 }, 26, 0x2DD4BF, 10);
  // Hauled back: the chain drags a wall of water through the pack
  tl.at(OUT + 4, () => {
    h.anim('ATTACK1');
    h.sound('wave', { vol: 0.8 });
    h.sound('rattle', { rate: 0.6, vol: 0.6 });
  });
  const waveX = (t: number) => lerp(far.x, h.home.x + 50, easeInOut(Math.min(1, t * 1.15)));
  const crest = (t: number) => 54 * Math.sin(Math.min(1, t * 1.8) * Math.PI * 0.5) * (t > 0.8 ? 1 - (t - 0.8) / 0.2 * 0.7 : 1) + 12;
  drawSpan(h, tl, OUT + 4, HAUL + 12, (g, t, f) => {
    const x = waveX(t);
    const cr = crest(t);
    // Body of the wave curling toward the knight, a foam lip on its crest
    g.poly([x + 70, far.y + 4, x + 40, far.y - cr * 0.6, x + 8, far.y - cr, x - 12, far.y - cr * 0.8, x - 20, far.y - cr * 0.4, x - 30, far.y + 4]).fill({ color: 0x0E7490, alpha: 0.7 });
    g.poly([x + 40, far.y - cr * 0.6, x + 8, far.y - cr, x - 12, far.y - cr * 0.8, x - 20, far.y - cr * 0.4]).stroke({ width: 3, color: 0xCCFBF1 });
    chain(g, h.pos().x + 12, h.pos().y - 30, x - 16, far.y - 8, 0x57534E, 2);
    anchor(g, x - 16, far.y - 8, 1.2, f * 0.4, P_DEEP);
  });
  lightSpan(h, tl, OUT + 4, HAUL + 12, (g, t, f) => {
    const x = waveX(t);
    const cr = crest(t);
    glow(g, x, far.y - cr * 0.6, cr, 0x2DD4BF, 0.5);
    for (let k = 0; k < 6; k++) g.circle(x - 16 + k * 8 + Math.sin(f * 0.5 + k) * 2, far.y - cr * (0.7 + 0.1 * Math.sin(k)), 2).fill({ color: 0xFFFFFF, alpha: 0.7 });
  });
  tl.every(OUT + 6, HAUL + 12, 2, () => h.emit(waveX((tl.frame - OUT - 4) / (HAUL + 8 - OUT)), h.home.y - rand(10, 40), { count: 2, colors: [0xCCFBF1, 0x67E8F9, 0xFFFFFF], speed: [0.5, 2], angle: -Math.PI / 2, spread: 1, gravity: 0.15, size: 2, life: [10, 18] }));
  // Each foe is hit as the wave's face reaches it (back row first); the first contact gets the impact frame
  const reach = (x: number) => {
    for (let f = 0; f <= HAUL + 8 - OUT; f++) if (waveX(f / (HAUL + 8 - OUT)) - 20 <= x) return OUT + 4 + f;
    return HAUL;
  };
  const order = foes.map((t, i) => ({ i, at: reach(t.x) })).sort((a, b) => a.at - b.at);
  order.forEach(({ i, at }, n) => {
    const t = foes[i];
    shockSphere(h, tl, at, chest(t), 30, 0x2DD4BF, 10);
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: 0.95, tint: 0xA5F3FC, sfx: 'splash', glare: n === 0 ? 0.2 : 0.5 });
      if (n === 0) {
        impactFrame(h, tl, chest(t), { color: 0x2DD4BF, dim: [0.6, DIM] });
        h.roll(-0.09, 10, true);
        signature(h, tl, tl.frame, chest(t), L_DEEP, 44);
      }
      h.knock(i, -18, 6);
    });
  });
  tl.at(HAUL + 12, () => h.weaponShown(true));
  tl.during(HAUL + 10, HAUL + 24, (t) => h.dim(0.6 * (1 - t), DIM));
  tl.end(HAUL + 26);
}

/** Leviathan's Maw: the anchor is flung skyward; an eye opens in a black whirlpool under the foe and vast jaws burst up to swallow it. */
function leviathansMaw(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const HIT = 44;
  const DIM = 0x02161D;
  tl.at(0, () => {
    h.anim('ATTACK3');
    swingSound(h, true);
    h.weaponShown(false);
    h.camera(1.1, (h.home.x + t0.x) / 2, h.home.y - 50, 24);
  });
  tl.during(0, 12, (t) => h.dim(0.7 * t, DIM));
  dutch(h, tl, HIT - 6, 0.08, 6);
  // Up and out of frame
  drawSpan(h, tl, 4, 18, (g, t, f) => anchor(g, lerp(h.pos().x + 10, c.x, t), lerp(h.pos().y - 50, -30, easeOut(t)), 1.3, f * 0.5, P_ABYSS));
  // A swirl of black water opens under the foe, and something looks up out of it
  const swirlR = (t: number, f: number) => 34 * easeOut(Math.min(1, f / 12)) * (t > 0.8 ? (1 - t) / 0.2 : 1);
  drawSpan(h, tl, 12, HIT + 22, (g, t, f) => {
    const r = swirlR(t, f);
    g.ellipse(t0.x, t0.y + 2, r + 4, r * 0.3 + 1).fill({ color: 0x02161D });
    if (f > 6 && f < HIT - 12) eye(g, t0.x, t0.y + 2, 8, Math.min(1, (f - 6) / 6), 0, P_ABYSS);
  }, 'ground');
  lightSpan(h, tl, 12, HIT + 22, (g, t, f) => {
    const r = swirlR(t, f);
    for (let arm = 0; arm < 3; arm++) {
      const pts: number[] = [];
      for (let k = 0; k <= 10; k++) {
        const u = k / 10;
        const a = f * 0.2 + arm * 2.1 + u * 4;
        pts.push(t0.x + Math.cos(a) * r * u, t0.y + 2 + Math.sin(a) * r * u * 0.3);
      }
      g.poly(pts, false).stroke({ width: 1.5, color: 0x2DD4BF, alpha: 0.8 });
    }
    glow(g, t0.x, t0.y, r, 0x0E7490, 0.5);
  }, 'ground');
  tl.at(12, () => h.sound('wave', { vol: 0.5, rate: 0.6 }));
  tl.at(18, () => {
    h.sound('growl', { rate: 0.5, vol: 0.6 });
    h.camera(1.18, t0.x, t0.y - 30, HIT - 18);
  });
  tl.every(18, HIT - 10, 4, () => h.shake(1.5));
  // The jaws rise around the foe as the anchor falls into the gullet
  drawSpan(h, tl, HIT - 12, HIT + 18, (g, t) => {
    const up = t < 0.4 ? easeOut(t / 0.4) : 1;
    const shut = t < 0.4 ? 0 : easeIn(Math.min(1, (t - 0.4) / 0.15));
    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
    for (const side of [-1, 1]) {
      const bx = t0.x + side * (30 - shut * 20);
      const top = t0.y - 80 * up;
      // A jaw of the deep: dark wet hide with a lit ridge along its inner edge, gums, and a rank of curved fangs
      g.poly([bx, t0.y + 2, bx + side * 8, top + 10, bx - side * 5, top]).fill({ color: 0x0E3A4A, alpha: fade }).stroke({ width: 2, color: 0x02161D, alpha: fade });
      g.poly([bx, t0.y + 2, bx - side * 5, top, bx - side * 1, top + 6, bx + side * 2, t0.y]).fill({ color: 0x2C7A85, alpha: fade });
      g.moveTo(bx - side * 4.5, top + 2).lineTo(bx + side * 0.5, t0.y).stroke({ width: 1, color: 0x99F6E4, alpha: 0.8 * fade });
      g.poly([bx, t0.y + 2, bx - side * 2.5, t0.y - 76 * up, bx - side * 0.5, t0.y - 76 * up, bx + side * 1, t0.y + 2]).fill({ color: 0x7F1D1D, alpha: 0.85 * fade });
      for (let k = 0; k < 6; k++) {
        const y = t0.y - k * 12 * up;
        if (!stampPal(g, 'iceShard', bx - side * 1, y - 3, 6, 12, P_FANG, { ax: 0.5, ay: 1, rot: -side * (Math.PI / 2 + 0.25), alpha: fade })) {
          g.poly([bx, y, bx - side * 9, y - 4, bx, y - 7]).fill({ color: 0xF0FDFA, alpha: fade });
        }
      }
      if (fxReady()) stamp(g, 'bloom', bx, t0.y - 40 * up, 30, 90 * up, { tint: 0x2DD4BF, alpha: 0.25 * fade });
    }
  });
  lightSpan(h, tl, HIT - 12, HIT, (g, t) => godRay(g, t0.x, t0.y - 90 * t, t0.y + 2, 20, 40, 0x2DD4BF, 0.5 * t));
  drawSpan(h, tl, HIT - 8, HIT + 1, (g, t, f) => anchor(g, c.x, lerp(-30, c.y, easeIn(t)), 1.5, f * 0.6, P_ABYSS));
  speedLines(h, tl, HIT - 6, HIT, () => c, 0xCCFBF1, { alpha: 0.4 });
  hitFx(h, tl, HIT, c, P_ABYSS, 28, [0xCCFBF1, 0x2DD4BF, 0xFFFFFF]);
  shockSphere(h, tl, HIT, c, 66, 0x2DD4BF, 18, 0xCCFBF1);
  tl.at(HIT, () => {
    land(h, 0, { scale: 1.45, tint: 0xA5F3FC, flash: 0xCCFBF1, burst: 'ice', burstSize: 1.2, sfx: 'chomp', glare: 0.2 });
    impactFrame(h, tl, c, { color: 0x22D3EE, dim: [0.7, DIM], hold: 4 });
    h.roll(-0.12, 12, true);
    signature(h, tl, HIT, c, L_MAW, 56, 24);
    h.sound('roar', { rate: 0.6, vol: 0.6 });
    h.sound('splash', { vol: 0.8 });
    h.camera(1.36, c.x, c.y, 12, true);
    h.knock(0, 4, -10);
    shards(h, c, 20);
    h.emit(c.x, t0.y, { count: 44, colors: [0xCCFBF1, 0x67E8F9, 0x0E7490], speed: [1, 4.5], angle: -Math.PI / 2, spread: 1.1, gravity: 0.2, size: 2, life: [16, 30] });
  });
  tl.at(HIT + 16, () => h.weaponShown(true));
  tl.during(HIT + 12, HIT + 26, (t) => h.dim(0.7 * (1 - t), DIM));
  tl.end(HIT + 28);
}

// =============================================================================================
// The Everburning Censer: holy smoke and candlelight

/** Sanctified Smoke: the censer whirls a ring of holy smoke round the knight (a ward), then hurls a blazing coal at the foe. */
function sanctifiedSmoke(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const THROW = 34;
  const HIT = THROW + 10;
  const DIM = 0x06121C;
  tl.at(0, () => h.camera(1.2, h.home.x + 8, h.home.y - 38, THROW));
  tl.during(0, 12, (t) => h.dim(0.55 * t, DIM));
  chargeUp(h, tl, 0, THROW, L_CENSER, { breath: 6, freeze: false, circle: 36 });
  dutch(h, tl, THROW, 0.06, 10);
  const head = whirl(h, tl, 0, THROW, P_CENSER, {
    reach: 24, link: 0xCBD5E1, trail: [0xE0F2FE, 0x7DD3FC],
    head: (g, x, y, f) => {
      g.ellipse(x, y, 6, 7).fill({ color: 0xCBD5E1 }).stroke({ width: 2, color: INK });
      for (let k = -1; k <= 1; k++) g.rect(x + k * 3 - 0.5, y - 4, 1.5, 7).fill({ color: 0xFDE68A, alpha: 0.7 + 0.3 * Math.sin(f + k) });
    },
  });
  lightSpan(h, tl, 2, THROW, (g, t) => glow(g, head().x, head().y, 12 + 8 * t, 0xFDE68A, 0.7));
  tl.at(2, () => {
    h.weaponShown(false);
    h.sound('holy', { vol: 0.5 });
  });
  // The ward: a ring of smoke closing round the knight, lit from within
  drawSpan(h, tl, 6, THROW + 26, (g, t, f) => {
    const p = h.pos();
    const grow = easeOut(Math.min(1, f / 16));
    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
    for (let k = 0; k < 12; k++) {
      const a = f * 0.08 + (k / 12) * Math.PI * 2;
      g.circle(p.x + Math.cos(a) * 32 * grow, p.y - 26 + Math.sin(a) * 32 * grow * 0.45, 7 + Math.sin(f * 0.2 + k) * 2).fill({ color: 0xE0F2FE, alpha: 0.2 * fade });
    }
  });
  lightSpan(h, tl, 6, THROW + 26, (g, t, f) => {
    const p = h.pos();
    const grow = easeOut(Math.min(1, f / 16));
    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
    g.ellipse(p.x, p.y - 26, 32 * grow, 14 * grow).stroke({ width: 2, color: 0x7DD3FC, alpha: 0.6 * fade });
    godRay(g, p.x, 0, p.y, 10, 30, 0x7DD3FC, 0.25 * fade * grow);
  }, 'back');
  tl.at(18, () => h.guard(0x7DD3FC));
  const from = once(() => head());
  const coal = (t: number): P => ({ x: lerp(from().x, c.x, t), y: lerp(from().y, c.y, t) - arc(t) * 24 });
  drawSpan(h, tl, THROW, HIT + 1, (g, t) => orb(g, coal(t).x, coal(t).y, 4, P_CANDLE));
  lightSpan(h, tl, THROW, HIT + 1, (g, t) => glow(g, coal(t).x, coal(t).y, 16, 0xFDE68A, 1));
  weaponTrail(h, tl, THROW, HIT + 1, P_CENSER, 10, 8, () => coal(Math.min(1, (tl.frame - THROW) / (HIT - THROW))));
  tl.at(THROW, () => {
    swingSound(h);
    h.camera(1.14, (h.home.x + c.x) / 2, c.y - 10, HIT - THROW + 4);
  });
  hitFx(h, tl, HIT, c, P_CENSER, 20);
  shockSphere(h, tl, HIT, c, 50, 0x7DD3FC, 14, 0xFDE68A);
  lightSpan(h, tl, HIT, HIT + 18, (g, u) => godRay(g, t0.x, 0, t0.y, 24 * (1 - u), 40 * (1 - u) + 2, 0xFDE68A, 1 - u));
  tl.at(HIT, () => {
    land(h, 0, { scale: 1.15, tint: 0xE0F2FE, burst: 'portal', burstSize: 0.9, sfx: 'holy', glare: 0.2 });
    impactFrame(h, tl, c, { color: 0x7DD3FC, dim: [0.55, DIM] });
    h.roll(-0.08, 10, true);
    signature(h, tl, HIT, c, L_CENSER, 44);
    h.camera(1.28, c.x, c.y, 10, true);
    h.knock(0, 10, 2);
    h.emit(c.x, c.y, { count: 24, colors: [0xE0F2FE, 0xFDE68A], speed: [0.5, 2.2], spread: Math.PI, gravity: -0.03, size: 3, life: [16, 28] });
  });
  tl.at(HIT + 6, () => h.weaponShown(true));
  tl.during(HIT + 8, HIT + 22, (t) => h.dim(0.55 * (1 - t), DIM));
  tl.end(HIT + 22);
}

/** Candlemass: the censer is swung low across the floor; a candle sprouts under every foe and flares into a pillar of holy fire. */
function candlemass(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const SWEEP = 14;
  const DIM = 0x0A0703;
  tl.at(0, () => {
    h.anim('ATTACK2');
    swingSound(h, true);
    h.camera(1.04, (h.home.x + foes[foes.length - 1].x) / 2, h.home.y - 50, 70);
  });
  tl.during(0, 10, (t) => h.dim(0.7 * t, DIM));
  dutch(h, tl, SWEEP, 0.06, 20, false);
  tl.at(SWEEP, () => h.sound('holy', { vol: 0.7 }));
  // The censer's sweep leaves a line of embers along the floor that the candles grow from
  lightSpan(h, tl, SWEEP - 4, SWEEP + 30, (g, t, f) => {
    const reach = Math.min(1, f / 12);
    const fade = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
    const x0 = h.home.x + 30;
    const x1 = lerp(x0, foes[foes.length - 1].x + 20, reach);
    g.rect(x0, h.home.y - 1, x1 - x0, 2).fill({ color: 0xFDE68A, alpha: 0.6 * fade });
    glow(g, x1, h.home.y, 12, 0xFDE68A, fade);
  }, 'ground');
  const last = foes.length - 1;
  foes.forEach((t, i) => {
    const sprout = SWEEP + 2 + i * 4;
    const flare = sprout + 18;
    const c = chest(t);
    drawSpan(h, tl, sprout, flare + 28, (g, u, f) => {
      const grow = Math.min(1, f / 8);
      const fade = u > 0.8 ? 1 - (u - 0.8) / 0.2 : 1;
      g.rect(t.x - 3, t.y - 16 * grow, 6, 16 * grow).fill({ color: 0xE7E0CF, alpha: fade }).stroke({ width: 1, color: INK, alpha: fade });
      for (let k = 0; k < 3; k++) g.rect(t.x - 3 + k * 2, t.y - 16 * grow + 2, 1, 3 + k).fill({ color: 0xF5F5F4, alpha: fade });
      const tall = f < 18 ? 5 + Math.sin(f) : 5 + 100 * easeOut(Math.min(1, (f - 18) / 6));
      g.poly([t.x - 4, t.y - 16 * grow, t.x + Math.sin(f) * 2, t.y - 16 * grow - tall, t.x + 4, t.y - 16 * grow]).fill({ color: 0xFDE68A, alpha: fade });
    });
    lightSpan(h, tl, sprout, flare + 28, (g, u, f) => {
      const fade = u > 0.8 ? 1 - (u - 0.8) / 0.2 : 1;
      const top = t.y - 16 * Math.min(1, f / 8);
      if (f < 18) glow(g, t.x, top - 4, 10 + Math.sin(f * 0.8) * 2, 0xFDE68A, fade);
      else {
        const b = 1 - Math.min(1, (f - 18) / 30);
        godRay(g, t.x, top - 130, top, 18 * b + 4, 30 * b + 6, 0xFDE68A, fade);
        glow(g, t.x, c.y, 40 * b + 10, 0xF59E0B, fade * b);
      }
    });
    tl.at(flare, () => {
      land(h, h.targets.length ? i : undefined, { scale: i === last ? 1.05 : 0.9, tint: 0xFEF3C7, burst: 'fire', burstSize: 0.7, sfx: 'fire_burst', glare: i === last ? 0.2 : 0.5 });
      if (i === last) {
        impactFrame(h, tl, c, { color: 0xFBBF24, dim: [0.7, DIM] });
        h.roll(-0.1, 10, true);
        signature(h, tl, tl.frame, c, L_CANDLE, 48);
      }
      h.knock(i, 2, 10);
      h.emit(t.x, t.y - 20, { count: 16, colors: [0xFDE68A, 0xFFFBEB, 0xF59E0B], speed: [0.6, 2.4], angle: -Math.PI / 2, spread: 0.6, gravity: -0.03, size: 2, life: [18, 30] });
    });
  });
  const end = SWEEP + 20 + last * 4;
  tl.during(end + 16, end + 30, (t) => h.dim(0.7 * (1 - t), DIM));
  tl.end(end + 32);
}

// =============================================================================================
// Tolling Thunder: the storm bell

/** Peal of Thunder: storm clouds roil overhead; the bell is snatched to lockout and tolls, and lightning leaps from it through the foes in turn. */
function pealOfThunder(h: KnightMoveHost, tl: Timeline) {
  const hits = h.targets.length ? [...h.targets] : [h.target, h.target, h.target];
  const TOLL = 20;
  const DIM = 0x050A18;
  raiseAndHold(h, tl, 0, TOLL + 26);
  tl.at(0, () => {
    h.sound('charge', { vol: 0.6 });
    h.sound('thunder', { vol: 0.3, rate: 0.6, delay: 0.2 });
  });
  tl.during(0, 14, (t) => h.dim(0.7 * t, DIM));
  stormClouds(h, tl, 0, TOLL + 40 + hits.length * 5);
  windUp(h, tl, 2, TOLL, 0x67E8F9, { zoom: 1.22, sound: false });
  chargeUp(h, tl, 2, TOLL, L_PEAL, { motes: false, breath: 5, freeze: false, circle: 38 });
  dutch(h, tl, TOLL, -0.07, 14);
  // A bolt from the clouds strikes the raised bell and charges it
  lightSpan(h, tl, TOLL - 4, TOLL + 4, (g, _t, f) => {
    const p = h.weaponTip();
    skyBolt(g, p.x + 10, -10, p.x, p.y, f, P_STORM, 3, 1);
  });
  tl.at(TOLL, () => {
    h.sound('block', { rate: 0.45, vol: 0.9 });
    h.sound('thunder', { vol: 0.7 });
    h.flash(0.25, 0xE0F7FF);
    h.shake(6);
    h.hitStop(3);
    h.camera(1.04, (h.home.x + hits[hits.length - 1].x) / 2, h.home.y - 44, 40);
  });
  shockSphere(h, tl, TOLL, () => h.weaponTip(), 40, 0x67E8F9, 12);
  hits.forEach((t, k) => {
    const at = TOLL + 3 + k * 5;
    const c = chest(t);
    const last = k === hits.length - 1;
    const from = k === 0 ? () => h.weaponTip() : () => chest(hits[k - 1]);
    lightSpan(h, tl, at, at + 10, (g, u, f) => {
      const s = from();
      skyBolt(g, s.x, s.y, c.x, c.y, f + k * 7, P_STORM, 3.5, 1 - u);
      glow(g, c.x, c.y, 22 * (1 - u) + 6, 0x67E8F9, 1 - u);
    });
    tl.at(at, () => {
      land(h, h.targets.length ? k : undefined, { scale: last ? 1.05 : 0.85, tint: 0xA5F3FC, sfx: 'zap', glare: last ? 0.2 : 0.6 });
      if (last) {
        impactFrame(h, tl, c, { color: 0x67E8F9, dim: [0.7, DIM] });
        h.roll(0.1, 10, true);
        signature(h, tl, tl.frame, c, L_PEAL, 48);
      }
      h.knock(k, 8, 2);
      h.sparks(c.x, c.y, 10, [0xA5F3FC, 0xFFFFFF]);
    });
  });
  const last = TOLL + 3 + (hits.length - 1) * 5;
  tl.during(last + 12, last + 26, (t) => h.dim(0.7 * (1 - t), DIM));
  tl.end(last + 28);
}

/** Storm clouds rolling in across the top of the frame, lit from within by flickers. */
function stormClouds(h: KnightMoveHost, tl: Timeline, from: number, to: number) {
  drawSpan(h, tl, from, to, (g, t, f) => {
    const a = Math.min(1, f / 10) * (t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1);
    for (let k = 0; k < 9; k++) {
      const x = ((k * 53 + f * 0.4) % 480) - 30;
      g.ellipse(x, 12 + (k % 3) * 8, 36, 14).fill({ color: 0x1E293B, alpha: 0.85 * a });
    }
  }, 'back');
  lightSpan(h, tl, from, to, (g, t, f) => {
    const a = Math.min(1, f / 10) * (t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1);
    if (hash(Math.floor(f / 4)) > 0.7) glow(g, 60 + hash(Math.floor(f / 4) + 3) * 320, 20, 40, 0x67E8F9, 0.5 * a);
  }, 'back');
}

/** Storm Toll: a phantom belfry bell drops over the pack and the knight's press rings it; the sky answers with a bolt on every foe. */
function stormToll(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const cx = foes.reduce((s, t) => s + t.x, 0) / foes.length;
  const STRIKE = 28;
  const DIM = 0x050A18;
  raiseAndHold(h, tl, 0, STRIKE + 6);
  tl.at(0, () => {
    h.camera(1.02, (h.home.x + cx) / 2 + 20, h.home.y - 60, STRIKE + 10);
    h.sound('thunder', { vol: 0.5, rate: 0.8 });
  });
  tl.during(0, 12, (t) => h.dim(0.75 * t, DIM));
  chargeUp(h, tl, 2, STRIKE, L_STORMBELL, { breath: 6, freeze: false, circle: 38 });
  dutch(h, tl, STRIKE, 0.08, 14);
  stormClouds(h, tl, 0, STRIKE + 44);
  const bellY = (f: number) => lerp(-60, h.home.y - 96, easeOut(Math.min(1, f / 18)));
  const ring = (f: number) => (f > STRIKE - 4 ? Math.sin((f - STRIKE + 4) * 1.2) * 4 * Math.max(0, 1 - (f - STRIKE) / 20) : 0);
  lightSpan(h, tl, 4, STRIKE + 32, (g, t, f) => {
    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
    const blaze = f > STRIKE - 4 ? Math.max(0, 1 - (f - STRIKE + 4) / 16) : 0;
    glow(g, cx + ring(f), bellY(f) + 10, 50 + 30 * blaze, 0x67E8F9, (0.4 + 0.6 * blaze) * fade);
  }, 'back');
  drawSpan(h, tl, 4, STRIKE + 32, (g, t, f) => {
    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
    phantomBell(g, cx + ring(f), bellY(f), 74, P_STORM, fade);
  });
  // Lightning crawls over the bell as it charges
  lightSpan(h, tl, 12, STRIKE, (g, _t, f) => {
    if (f % 3) return;
    const y = bellY(f + 12);
    skyBolt(g, cx - 30, y + 30, cx + 30, y - 10, f, P_STORM, 1.5, 0.7);
  });
  tl.at(STRIKE, () => {
    h.sound('block', { rate: 0.38, vol: 1 });
    h.shake(9);
    h.hitStop(3);
  });
  shockSphere(h, tl, STRIKE, () => ({ x: cx, y: bellY(STRIKE) + 20 }), 90, 0x67E8F9, 16, 0xFFFFFF);
  ringFx(h, tl, STRIKE, { x: cx, y: h.home.y }, 10, 220, 0x67E8F9, 20, 3);
  foes.forEach((t, i) => {
    const at = STRIKE + 4 + i * 4;
    lightSpan(h, tl, at, at + 12, (g, u, f) => {
      skyBolt(g, t.x + rand(-8, 8), -20, t.x, t.y - 6, f + i * 5, P_STORM, 5, 1 - u);
      glow(g, t.x, t.y - 10, 34 * (1 - u) + 8, 0x67E8F9, 1 - u);
    });
    drawSpan(h, tl, at, at + 50, (g, u) => {
      scorch(g, t.x, t.y, 20, 0x67E8F9, 1 - u);
      groundCracks(g, t.x, t.y + 2, 36, 6, 79 + i, P_STORM, Math.min(1, u * 8), 1 - u);
    }, 'ground');
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: 1, tint: 0xA5F3FC, burst: 'crater', burstSize: 0.8, sfx: 'thunder', glare: i === 0 ? 0.2 : 0.6 });
      if (i === 0) {
        impactFrame(h, tl, chest(t), { color: 0x67E8F9, dim: [0.75, DIM] });
        h.roll(-0.1, 10, true);
        signature(h, tl, tl.frame, chest(t), L_STORMBELL, 48);
      }
      h.knock(i, 4, 8);
      h.sparks(t.x, t.y - 10, 12, [0xA5F3FC, 0xFFFFFF]);
    });
  });
  const last = STRIKE + 4 + (foes.length - 1) * 4;
  tl.during(last + 14, last + 28, (t) => h.dim(0.75 * (1 - t), DIM));
  tl.end(last + 30);
}

// =============================================================================================
// The Midas Bell: gold

/** Golden Touch: the knight thrusts the bell into the foe; gold spreads over it until it is a statue, then the statue shatters. */
function goldenTouch(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const TOUCH = 18;
  const SHATTER = TOUCH + 26;
  const DIM = 0x0F0A02;
  tl.at(0, () => h.anim('RUN', true));
  travel(h, tl, 0, 12, HOME, strikeSpot(h, t0, 48), easeInOut);
  ghostTrail(h, tl, 0, 12, 0xF2B636, 2, 0.35);
  dutch(h, tl, TOUCH, 0.06, SHATTER - TOUCH, false);
  motes(h, tl, TOUCH, SHATTER - 6, L_GOLD, { at: () => c, reach: 50 });
  breath(h, tl, SHATTER - 6, 6, L_GOLD, { where: () => c, freeze: false });
  tl.during(0, 12, (t) => h.dim(0.55 * t, DIM));
  tl.at(12, () => {
    h.anim('SKILL1');
    swingSound(h);
  });
  tl.at(TOUCH, () => {
    h.sound('holy', { rate: 1.4, vol: 0.6 });
    h.sound('impact_metal', { rate: 1.6, vol: 0.5 });
    h.hitStop(3);
    h.camera(1.3, c.x - 10, c.y, SHATTER - TOUCH + 10);
  });
  // Gold creeping over the foe from the point of contact: a molten front, glints, the foe turning to metal
  tl.every(TOUCH, SHATTER, 2, () => h.flashTarget(0, 0xF2B636, 3));
  lightSpan(h, tl, TOUCH, SHATTER, (g, t, f) => {
    const r = 6 + 30 * easeOut(t);
    glow(g, c.x, c.y, r * 1.3, 0xF2B636, 0.5 + 0.4 * t);
    g.circle(c.x, c.y, r).stroke({ width: 2, color: 0xFDE68A, alpha: 0.9 });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + f * 0.08;
      glint(g, c.x + Math.cos(a) * r, c.y + Math.sin(a) * r, 5, 0, 0xFFFBEA, 0.8);
    }
  });
  tl.every(TOUCH + 4, SHATTER, 5, (n) => h.sound('impact_metal', { rate: 1.8 + n * 0.1, vol: 0.25 }));
  backstep(h, tl, SHATTER - 6, SHATTER + 8, 12);
  // The statue cracks before it goes
  drawSpan(h, tl, SHATTER - 6, SHATTER, (g, t) => {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + 0.4;
      g.moveTo(c.x, c.y).lineTo(c.x + Math.cos(a) * 24 * t, c.y + Math.sin(a) * 24 * t).stroke({ width: 1.5, color: 0xFFFBEA });
    }
  });
  hitFx(h, tl, SHATTER, c, P_GILT, 30, [0xFFFBEA, 0xF2B636, 0xB7791F]);
  shockSphere(h, tl, SHATTER, c, 60, 0xF2B636, 16, 0xFFFBEA);
  tl.at(SHATTER, () => {
    land(h, 0, { scale: 1.45, tint: 0xFDE68A, flash: 0xFFFBEA, glare: 0.2, sfx: 'crack' });
    impactFrame(h, tl, c, { color: 0xF2B636, dim: [0.55, DIM] });
    h.roll(-0.12, 12, true);
    signature(h, tl, SHATTER, c, L_GOLD, 54, 24);
    h.camera(1.38, c.x, c.y, 10, true);
    shards(h, c, 22);
    h.emit(c.x, c.y, { count: 36, colors: [0xF2B636, 0xFDE68A, 0xB7791F], speed: [1.5, 5], spread: Math.PI, gravity: 0.25, size: 3, life: [16, 30] });
    h.knock(0, 10, 4);
  });
  afterglow(h, tl, SHATTER + 2, SHATTER + 24, c.x, t0.y - 6, [0xFDE68A, 0xFFFBEA], 22);
  tl.during(SHATTER + 8, SHATTER + 22, (t) => h.dim(0.55 * (1 - t), DIM));
  tl.end(SHATTER + 24);
}

/** Treasury Rain: the bell is swung skyward and the vault opens overhead; a cascade of gold coins hammers the pack. */
function treasuryRain(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const SWING = 12;
  const DIM = 0x0F0A02;
  const cx = foes.reduce((s, t) => s + t.x, 0) / foes.length;
  tl.at(0, () => {
    h.anim('ATTACK3');
    swingSound(h, true);
    h.camera(1.02, (h.home.x + foes[foes.length - 1].x) / 2 + 20, h.home.y - 64, 70);
  });
  tl.during(0, 10, (t) => h.dim(0.65 * t, DIM));
  dutch(h, tl, SWING, -0.06, 30, false);
  tl.at(SWING, () => {
    h.sound('gears', { vol: 0.6 });
    h.sound('holy', { rate: 1.3, vol: 0.4 });
  });
  // A golden rift opens above the pack, a vault door of light
  const vaultW = (t: number, f: number) => 90 * easeOut(Math.min(1, f / 10)) * (t > 0.8 ? (1 - t) / 0.2 : 1);
  lightSpan(h, tl, SWING, SWING + 60, (g, t, f) => {
    const w = vaultW(t, f);
    glow(g, cx, 26, w * 0.8, 0xF2B636, 0.7);
    g.ellipse(cx, 26, w, 11).fill({ color: 0xF2B636, alpha: 0.5 });
    g.ellipse(cx, 26, w * 0.7, 6).fill({ color: 0xFFFBEA, alpha: 0.6 });
    runeCircle(g, cx, 26, w * 0.9, f * 0.05, P_GILT, 0.8);
  });
  const coinAt = (k: number, f: number) => {
    const start = (k * 7) % 32;
    const u = (f - start) / 16;
    return { u, x: cx - 84 + ((k * 37) % 168), y: lerp(28, h.home.y - 4, u * u) };
  };
  drawSpan(h, tl, SWING + 6, SWING + 48, (g, _t, f) => {
    for (let k = 0; k < 44; k++) {
      const p = coinAt(k, f);
      if (p.u < 0 || p.u > 1) continue;
      const spin = Math.abs(Math.cos(f * 0.5 + k));
      g.ellipse(p.x, p.y, 1 + 3 * spin, 4).fill({ color: k % 3 ? 0xF2B636 : 0xFDE68A }).stroke({ width: 1, color: 0x7C4A03 });
    }
  });
  lightSpan(h, tl, SWING + 6, SWING + 48, (g, _t, f) => {
    for (let k = 0; k < 44; k += 4) {
      const p = coinAt(k, f);
      if (p.u < 0 || p.u > 1) continue;
      if (Math.sin(f * 0.6 + k) > 0.5) glint(g, p.x, p.y, 5, 0, 0xFFFBEA, 0.9);
    }
  });
  tl.every(SWING + 8, SWING + 44, 3, (i) => h.sound('impact_metal', { rate: 1.8 + (i % 3) * 0.2, vol: 0.25 }));
  // Drifts of gold pile up under the foes
  lightSpan(h, tl, SWING + 16, SWING + 64, (g, t) => {
    const fade = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
    for (const ft of foes) {
      g.ellipse(ft.x, ft.y + 2, 18 * Math.min(1, t * 3), 4).fill({ color: 0xF2B636, alpha: 0.5 * fade });
    }
  }, 'ground');
  foes.forEach((t, i) => {
    const at = SWING + 22 + i * 4;
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: 0.95, tint: 0xFDE68A, sfx: 'impact_metal', glare: i === 0 ? 0.2 : 0.6 });
      if (i === 0) {
        impactFrame(h, tl, chest(t), { color: 0xF2B636, dim: [0.65, DIM] });
        h.roll(0.09, 10, true);
        signature(h, tl, tl.frame, chest(t), L_GOLD, 46);
      }
      h.knock(i, 2, -6);
      debris(h, { x: t.x, y: t.y }, 10, [0xF2B636, 0xFDE68A, 0xB7791F]);
    });
    shockSphere(h, tl, at, chest(t), 30, 0xF2B636, 10);
  });
  tl.during(SWING + 50, SWING + 64, (t) => h.dim(0.65 * (1 - t), DIM));
  tl.end(SWING + 66);
}

// =============================================================================================
// The Heartforge: the titan's fire

/** Quench: the blade drinks the forge's heat and the knight lunges, driving a lance of white-hot steam through the line. */
function quench(h: KnightMoveHost, tl: Timeline) {
  const hits = h.targets.length ? [...h.targets] : [h.target];
  const far = hits[hits.length - 1];
  const THRUST = 26;
  const DIM = 0x140602;
  tl.at(0, () => {
    h.anim('DEFENSE');
    chargeSound(h, THRUST);
  });
  windUp(h, tl, 0, THRUST - 2, 0xFB923C, { zoom: 1.24, sound: false, reach: 40 });
  chargeUp(h, tl, 0, THRUST - 2, L_QUENCH, { motes: false, breath: 6, circle: 34, aura: 1.1 });
  dutch(h, tl, THRUST, 0.09, 10);
  tl.during(0, 14, (t) => h.dim(0.6 * t, DIM));
  // The steel heats: dull red to white, the knight lit by it
  tl.during(0, THRUST, (t) => h.tint(mix(0xFFFFFF, 0xFFC08A, t)));
  lightSpan(h, tl, 0, THRUST, (g, t) => glow(g, h.weaponTip().x, h.weaponTip().y, 10 + 18 * t, mix(0xB91C1C, 0xFFF7ED, t), 0.6 + 0.4 * t));
  tl.at(THRUST, () => {
    h.anim('ATTACK1');
    swingSound(h, true);
    h.tint(0xFFFFFF);
    h.camera(1.14, (h.pos().x + far.x) / 2, far.y - 30, 20, true);
  });
  travel(h, tl, THRUST, THRUST + 6, here(h), strikeSpot(h, hits[0], 70), easeOut);
  ghostTrail(h, tl, THRUST, THRUST + 6, 0xFB923C, 1, 0.55);
  // The lance: a white-hot core in an orange sheath, steam boiling off it
  lightSpan(h, tl, THRUST + 2, THRUST + 24, (g, t) => {
    const k = kFront(h);
    lance(g, k.x, k.y, far.x + 50, chest(far).y, 22 * (1 - t) + 4, P_FORGE, 0.5 * (1 - t));
    glow(g, k.x, k.y, 20 * (1 - t), 0xFFF7ED, 1 - t);
  });
  drawSpan(h, tl, THRUST + 2, THRUST + 22, (g, t) => {
    const k = kFront(h);
    lance(g, k.x, k.y, far.x + 40, chest(far).y, 10 * (1 - t) + 2, P_FORGE, 1 - t);
  });
  tl.every(THRUST + 2, THRUST + 26, 2, () => {
    const k = kFront(h);
    h.emit(lerp(k.x, far.x, Math.random()), chest(far).y + rand(-6, 6), { count: 2, colors: [0xF5F5F4, 0xFDE68A, 0xE7E5E4], speed: [0.3, 1], angle: -Math.PI / 2, spread: 1, gravity: -0.03, size: 4, life: [18, 30] });
  });
  hits.forEach((t, k) => {
    const at = THRUST + 4 + k * 3;
    shockSphere(h, tl, at, chest(t), 36, 0xFB923C, 12, 0xFFF7ED);
    tl.at(at, () => {
      land(h, h.targets.length ? k : undefined, { scale: 1.05, tint: 0xFED7AA, burst: 'fire', burstSize: 0.7, sfx: 'fire_burst', glare: k === 0 ? 0.2 : 0.6 });
      if (k === 0) {
        impactFrame(h, tl, chest(t), { color: 0xFB923C, dim: [0.6, DIM] });
        h.roll(-0.1, 10, true);
        signature(h, tl, tl.frame, chest(t), L_QUENCH, 46);
      }
      h.sound('frost', { rate: 0.6, vol: 0.4 }); // the hiss of the quench
      h.knock(k, 14, 2);
    });
  });
  backstep(h, tl, THRUST + 16, THRUST + 32, 14);
  tl.during(THRUST + 18, THRUST + 34, (t) => h.dim(0.6 * (1 - t), DIM));
  tl.end(THRUST + 34);
}

/** Titan's Anvil: a spectral anvil slams down behind the foe and the knight hammers it against the anvil twice, sparks fountaining. */
function titansAnvil(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const HITS = [30, 40];
  const DIM = 0x140602;
  tl.at(0, () => h.anim('RUN', true));
  travel(h, tl, 0, 12, HOME, strikeSpot(h, t0, 56), easeInOut);
  ghostTrail(h, tl, 0, 12, 0xEA580C, 2, 0.35);
  chargeUp(h, tl, 12, HITS[0] - 2, L_ANVIL, { breath: 5, freeze: false, circle: 32, aura: 1.1 });
  dutch(h, tl, HITS[0], 0.06, 8);
  tl.during(0, 12, (t) => h.dim(0.6 * t, DIM));
  tl.at(0, () => h.camera(1.14, (h.home.x + t0.x) / 2 + 20, t0.y - 40, HITS[1]));
  const anvilY = (f: number) => lerp(-40, t0.y, easeIn(Math.min(1, f / 8)));
  const anvil = (g: Graphics, y: number, fade: number, fill: number, edge: number) =>
    g.poly([t0.x - 30, y - 18, t0.x + 26, y - 18, t0.x + 38, y - 24, t0.x + 26, y - 12, t0.x + 12, y - 10, t0.x + 16, y, t0.x - 20, y, t0.x - 16, y - 10]).fill({ color: fill, alpha: 0.55 * fade }).stroke({ width: 2, color: edge, alpha: fade });
  drawSpan(h, tl, 6, HITS[1] + 22, (g, t, f) => anvil(g, anvilY(f), t > 0.8 ? 1 - (t - 0.8) / 0.2 : 0.9, 0xEA580C, 0xFDE68A), 'back');
  lightSpan(h, tl, 6, HITS[1] + 22, (g, t, f) => glow(g, t0.x, anvilY(f) - 12, 40, 0xEA580C, 0.5 * (t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1)), 'back');
  tl.at(14, () => {
    h.sound('impact_metal', { rate: 0.5, vol: 0.8 });
    h.shake(6);
    h.hitStop(2);
    dust(h, { x: t0.x, y: t0.y }, 10, 0);
  });
  shockSphere(h, tl, 14, { x: t0.x, y: t0.y - 6 }, 30, 0xEA580C, 10);
  HITS.forEach((at, k) => {
    const big = k === HITS.length - 1;
    tl.at(at - 8, () => {
      h.anim(big ? 'SKILL1' : 'ATTACK4');
      swingSound(h, big);
    });
    weaponTrail(h, tl, at - 6, at, P_FORGE, big ? 14 : 9, 5);
    hitFx(h, tl, at, c, P_FORGE, big ? 28 : 16, [0xFDE68A, 0xFB923C, 0xFFFFFF]);
    if (big) shockSphere(h, tl, at, c, 60, 0xFB923C, 16, 0xFDE68A);
    // A fountain of sparks off the anvil
    lightSpan(h, tl, at, at + 16, (g, u) => {
      for (let s = 0; s < (big ? 14 : 8); s++) {
        const a = -Math.PI / 2 + (hash(s + k * 9) - 0.5) * 2;
        const r = (20 + 40 * hash(s * 3 + k)) * easeOut(u);
        g.moveTo(c.x + Math.cos(a) * r * 0.6, c.y + Math.sin(a) * r * 0.6 + u * u * 10).lineTo(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r + u * u * 16).stroke({ width: 1.5, color: s % 2 ? 0xFDE68A : 0xFB923C, alpha: 1 - u });
      }
    });
    tl.at(at, () => {
      if (big) {
        land(h, 0, { scale: 1.4, tint: 0xFED7AA, burst: 'explosion', burstSize: 1, sfx: 'impact_metal', glare: 0.2 });
        impactFrame(h, tl, c, { color: 0xFB923C, dim: [0.6, DIM] });
        h.roll(-0.11, 10, true);
        signature(h, tl, tl.frame, c, L_ANVIL, 52);
        h.camera(1.34, c.x, c.y, 10, true);
        h.knock(0, 8, -4);
      } else {
        h.flashTarget(0, 0xFB923C, 4);
        h.sound('impact_metal', { rate: 1.2, vol: 0.7 });
        h.shake(4);
        h.hitStop(3);
      }
      h.emit(c.x, c.y, { count: big ? 40 : 18, colors: [0xFDE68A, 0xFB923C, 0xFFFFFF], speed: [1.5, 5], angle: -Math.PI / 2, spread: 1.4, gravity: 0.25, size: 2, life: [12, 26] });
    });
  });
  backstep(h, tl, HITS[1] + 6, HITS[1] + 22, 14);
  tl.during(HITS[1] + 10, HITS[1] + 24, (t) => h.dim(0.6 * (1 - t), DIM));
  tl.end(HITS[1] + 24);
}

// =============================================================================================
// The Hollow Bell: the rift

/** Stare Back: the knight holds the bell out and its eye opens wide over the foe; a beam of the void strips its armour away. */
function stareBack(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const OPEN = 18;
  const HIT = OPEN + 16;
  const DIM = 0x07020F;
  tl.at(0, () => {
    h.anim('DEFENSE');
    h.camera(1.16, (h.home.x + t0.x) / 2, h.home.y - 56, OPEN);
    h.sound('portal', { vol: 0.6, rate: 0.7 });
  });
  tl.during(0, 12, (t) => h.dim(0.8 * t, DIM));
  chargeUp(h, tl, 0, OPEN, L_HOLLOW, { breath: 5, circle: 36 });
  dutch(h, tl, OPEN, -0.06, HIT - OPEN, false);
  const at = { x: (h.home.x + t0.x) / 2, y: h.home.y - 90 };
  const openAt = (f: number, t: number) => (f < OPEN ? 0 : Math.min(1, (f - OPEN + 2) / 6)) * (t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1);
  lightSpan(h, tl, 4, HIT + 24, (g, t, f) => {
    const o = openAt(f, t);
    glow(g, at.x, at.y, 30 + 20 * o, 0xC084FC, 0.4 + 0.5 * o);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + f * 0.02;
      g.moveTo(at.x + Math.cos(a) * 26, at.y + Math.sin(a) * 16).lineTo(at.x + Math.cos(a) * (40 + 10 * o), at.y + Math.sin(a) * (26 + 6 * o)).stroke({ width: 1, color: 0x4ADE80, alpha: 0.4 * o });
    }
  }, 'back');
  drawSpan(h, tl, 4, HIT + 24, (g, t, f) => eye(g, at.x, at.y, 24, openAt(f, t), (c.x - at.x) / 60, P_SICK, t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1));
  tl.at(OPEN, () => {
    h.sound('wail', { rate: 1.6, vol: 0.5 });
    h.shake(4);
    h.hitStop(3);
    h.camera(1.06, (at.x + c.x) / 2, (at.y + c.y) / 2 + 10, HIT - OPEN);
  });
  drawSpan(h, tl, OPEN + 2, HIT, (g, _t, f) => focusLines(g, c.x, c.y, Math.floor(f / 2), 0xC084FC, 0.3, { inner: 40, n: 18, width: 2 }));
  lightSpan(h, tl, OPEN + 6, HIT + 12, (g, t) => {
    const w = t < 0.4 ? 4 + 12 * (t / 0.4) : 16 * (1 - t);
    lance(g, at.x, at.y, c.x, c.y, w * 2, P_HOLLOW, 0.4);
    glow(g, c.x, c.y, 20 + w, 0xC084FC, 0.8);
  });
  drawSpan(h, tl, OPEN + 6, HIT + 12, (g, t) => {
    const w = t < 0.4 ? 4 + 10 * (t / 0.4) : 14 * (1 - t);
    lance(g, at.x, at.y, c.x, c.y, w, P_HOLLOW, 1);
  });
  hitFx(h, tl, HIT, c, P_HOLLOW, 26);
  shockSphere(h, tl, HIT, c, 56, 0xC084FC, 16, 0x4ADE80);
  tl.at(HIT, () => {
    land(h, 0, { scale: 1.4, tint: 0xE9D5FF, flash: 0xF3E8FF, glare: 0.2, burst: 'portal', burstSize: 1, sfx: 'portal' });
    impactFrame(h, tl, c, { color: 0xC084FC, dim: [0.8, DIM] });
    h.roll(0.11, 10, true);
    signature(h, tl, HIT, c, L_HOLLOW, 52);
    h.camera(1.32, c.x, c.y, 10, true);
    shards(h, c, 18);
    h.knock(0, 10, 2);
  });
  tl.during(HIT + 14, HIT + 28, (t) => h.dim(0.8 * (1 - t), DIM));
  tl.end(HIT + 30);
}

/** Rift Hymn: the bell is circled round the head and sings; rifts tear open under every foe and tentacles seize them. */
function riftHymn(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const SING = 18;
  const DIM = 0x07020F;
  tl.at(0, () => {
    h.anim('SKILL2TULUC');
    h.camera(1.2, h.home.x + 10, h.home.y - 40, SING);
  });
  tl.during(0, 12, (t) => h.dim(0.75 * t, DIM));
  chargeUp(h, tl, 0, SING, L_HYMN, { breath: 4, freeze: false, circle: 38 });
  dutch(h, tl, SING - 2, 0.06, 30, false);
  lightSpan(h, tl, 2, SING + 44, (g, t, f) => {
    const p = h.pos();
    const a = t > 0.8 ? 1 - (t - 0.8) / 0.2 : Math.min(1, f / 8);
    runeCircle(g, p.x, p.y, 36, f * 0.06, P_HOLLOW, a);
    godRay(g, p.x, p.y - 90, p.y, 10, 30, 0xC084FC, 0.35 * a);
  }, 'ground');
  // The hymn: rings of song rolling off the bell
  lightSpan(h, tl, 4, SING + 30, (g, _t, f) => {
    const p = h.weaponTip();
    for (let k = 0; k < 3; k++) {
      const u = ((f * 0.04 + k / 3) % 1);
      g.circle(p.x, p.y, 8 + 50 * u).stroke({ width: 2 * (1 - u) + 0.5, color: k % 2 ? 0xC084FC : 0xF3E8FF, alpha: 1 - u });
    }
  });
  tl.at(SING - 2, () => h.camera(1.04, (h.home.x + foes[foes.length - 1].x) / 2 + 20, h.home.y - 46, 60));
  tl.every(SING - 10, SING + 30, 5, (i) => h.sound('wail', { rate: 1.2 + (i % 4) * 0.15, vol: 0.25 }));
  const last = foes.length - 1;
  foes.forEach((t, i) => {
    const open = SING + i * 5;
    const grab = open + 12;
    const riftW = (u: number, f: number) => 22 * easeOut(Math.min(1, f / 6)) * (u > 0.8 ? (1 - u) / 0.2 : 1);
    drawSpan(h, tl, open, grab + 22, (g, u, f) => {
      const w = riftW(u, f);
      g.ellipse(t.x, t.y + 2, w + 2, w * 0.3 + 1).fill({ color: 0x07020F }).stroke({ width: 1.5, color: 0xA855F7 });
      if (f > 6) {
        const reach = Math.min(1, (f - 6) / 6);
        for (const side of [-1, 0, 1]) tentacle(g, t.x + side * w * 0.5, t.y, t.x + side * 4, t.y - (side ? 32 : 40) * reach, side ? 4 : 5, side * 8 + 3, 0x3B0764, 0x7E22CE, false);
      }
    });
    lightSpan(h, tl, open, grab + 22, (g, u, f) => {
      const w = riftW(u, f);
      godRay(g, t.x, t.y - 60, t.y + 2, w * 0.6, w * 1.4, 0xA855F7, 0.5);
    }, 'ground');
    tl.at(grab, () => {
      land(h, h.targets.length ? i : undefined, { scale: i === last ? 1 : 0.9, tint: 0xE9D5FF, sfx: 'squelch', glare: i === last ? 0.2 : 0.5 });
      if (i === last) {
        impactFrame(h, tl, chest(t), { color: 0xA855F7, dim: [0.75, DIM] });
        h.roll(-0.1, 10, true);
        signature(h, tl, tl.frame, chest(t), L_HYMN, 46);
      }
      h.knock(i, 0, -8);
    });
    shockSphere(h, tl, grab, chest(t), 30, 0xA855F7, 12);
  });
  const end = SING + last * 5 + 12;
  tl.during(end + 14, end + 28, (t) => h.dim(0.75 * (1 - t), DIM));
  tl.end(end + 30);
}

// =============================================================================================
// Excalibane: the shadow twin

/** Eclipse Edge: a black sun rises behind the knight, its corona blazing, and the blade cuts a crescent of night through the line. */
function eclipseEdge(h: KnightMoveHost, tl: Timeline) {
  const hits = h.targets.length ? [...h.targets] : [h.target];
  const CUT = 26;
  const DIM = 0x050208;
  tl.at(0, () => {
    h.anim('DEFENSE');
    h.camera(1.14, h.home.x + 10, h.home.y - 56, CUT - 6);
    h.sound('dark', { vol: 0.7 });
  });
  tl.during(0, 14, (t) => h.dim(0.85 * t, DIM));
  const sunAt = once(() => ({ x: h.pos().x - 10, y: h.pos().y - 92 }));
  lightSpan(h, tl, 0, CUT + 32, (g, t, f) => {
    const s = sunAt();
    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : Math.min(1, f / 10);
    glow(g, s.x, s.y, 50, 0xA78BFA, 0.6 * fade);
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2 + f * 0.02;
      const len = 30 + 14 * Math.sin(f * 0.3 + k * 1.7);
      g.poly([s.x + Math.cos(a - 0.08) * 22, s.y + Math.sin(a - 0.08) * 22, s.x + Math.cos(a) * len, s.y + Math.sin(a) * len, s.x + Math.cos(a + 0.08) * 22, s.y + Math.sin(a + 0.08) * 22]).fill({ color: 0xEDE9FE, alpha: 0.5 * fade });
    }
  }, 'back');
  drawSpan(h, tl, 0, CUT + 32, (g, t, f) => {
    const s = sunAt();
    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : Math.min(1, f / 10);
    g.circle(s.x, s.y, 22).fill({ color: 0x000000, alpha: fade }).stroke({ width: 1.5, color: 0xEDE9FE, alpha: fade });
  }, 'back');
  windUp(h, tl, 4, CUT - 6, 0xA78BFA, { zoom: 1.22, sound: true, reach: 40 });
  chargeUp(h, tl, 4, CUT - 6, L_ECLIPSE, { motes: false, breath: 5, freeze: false, circle: 36, aura: 1.1 });
  dutch(h, tl, CUT - 6, 0.08, 10);
  tl.at(CUT - 6, () => {
    h.anim('ATTACK2');
    swingSound(h, true);
  });
  travel(h, tl, CUT - 6, CUT, HOME, strikeSpot(h, hits[0], 60), easeOut);
  ghostTrail(h, tl, CUT - 6, CUT + 2, 0xA78BFA, 1, 0.5);
  const p0 = once(() => h.pos());
  slashFx(h, tl, CUT, { x: p0().x + 50, y: p0().y - 30, r: 84, a0: -1.6, a1: 1.2, thick: 16, p: P_BANE, dur: 14 });
  lightSpan(h, tl, CUT, CUT + 14, (g, u) => crescent(g, p0().x + 50, p0().y - 30, 92, -1.6, 1.2, 26 * (1 - u), P_BANE, 0.5 * (1 - u)));
  hits.forEach((t, k) => {
    shockSphere(h, tl, CUT + 1 + k * 3, chest(t), 40, 0xA78BFA, 12);
    tl.at(CUT + 1 + k * 3, () => {
      land(h, h.targets.length ? k : undefined, { scale: 1.1, tint: 0xDDD6FE, burst: 'slash', burstSize: 1, sfx: 'slash_heavy', glare: k === 0 ? 0.2 : 0.6 });
      if (k === 0) {
        impactFrame(h, tl, chest(t), { color: 0xA78BFA, dim: [0.85, DIM], hold: 4 });
        h.roll(-0.11, 12, true);
        signature(h, tl, tl.frame, chest(t), L_ECLIPSE, 52);
      }
      h.knock(k, 12, 2);
    });
  });
  tl.at(CUT, () => h.camera(1.24, hits[0].x, hits[0].y - 30, 10, true));
  backstep(h, tl, CUT + 12, CUT + 28, 14);
  tl.during(CUT + 20, CUT + 34, (t) => h.dim(0.85 * (1 - t), DIM));
  tl.end(CUT + 36);
}

/** Twin Sovereigns: Excalibell's golden ghost rises beside the knight; light and shadow greatswords fall crossed on every foe. */
function twinSovereigns(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const DROP = 28;
  const DIM = 0x07040F;
  const GOLDP = pal(0xFBBF24, 0xFFFBEA, 0x3B2205);
  raiseAndHold(h, tl, 0, DROP + 8);
  tl.at(0, () => {
    h.camera(1.2, h.home.x + 8, h.home.y - 44, DROP - 6);
    h.sound('holy', { vol: 0.6 });
    h.sound('dark', { vol: 0.6, delay: 0.15 });
  });
  tl.during(0, 14, (t) => h.dim(0.75 * t, DIM));
  chargeUp(h, tl, 2, DROP - 6, L_SOVEREIGN, { breath: 5, freeze: false, circle: 40, aura: 1.15 });
  dutch(h, tl, DROP, 0.08, 14);
  // Wings of light and shadow behind the knight
  const openAt = (f: number, t: number) => easeOut(Math.min(1, f / 12)) * (t > 0.8 ? (1 - t) / 0.2 : 1);
  drawSpan(h, tl, 4, DROP + 32, (g, t, f) => {
    const p = h.pos();
    const open = openAt(f, t);
    wing(g, p.x - 6, p.y - 40, 50, -1, open, GOLDP, 0.85);
    wing(g, p.x + 6, p.y - 40, 50, 1, open, P_BANE, 0.85);
  }, 'back');
  lightSpan(h, tl, 4, DROP + 32, (g, t, f) => {
    const p = h.pos();
    const open = openAt(f, t);
    glow(g, p.x - 24, p.y - 56, 34 * open, 0xFBBF24, 0.5);
    glow(g, p.x + 24, p.y - 56, 34 * open, 0xA78BFA, 0.5);
  }, 'back');
  tl.at(DROP - 6, () => h.camera(1.02, (h.home.x + foes[foes.length - 1].x) / 2 + 20, h.home.y - 56, 40));
  const last = foes.length - 1;
  foes.forEach((t, i) => {
    const at = DROP + i * 5;
    const c = chest(t);
    for (const [k, color] of [[0, 0xFBBF24], [1, 0xA78BFA]] as const) {
      const side = k ? 1 : -1;
      const bladeAt = (u: number) => ({ x: t.x + side * 22 * (1 - u), y: lerp(-40, t.y - 16, easeIn(u)) });
      lightSpan(h, tl, at - 10, at + 1, (g, u) => {
        const b = bladeAt(u);
        godRay(g, b.x, -20, b.y - 40, 4, 10, color, 0.7);
      });
      drawSpan(h, tl, at - 10, at + 20, (g, _u, f) => {
        const uu = Math.min(1, f / 10);
        const b = bladeAt(uu);
        const fade = f <= 12 ? 1 : 1 - (f - 12) / 8;
        const tipX = b.x - side * 7 * (1 - uu);
        g.poly([b.x - 4, b.y - 50, b.x + 4, b.y - 50, tipX + 1.5, b.y, tipX - 1.5, b.y]).fill({ color, alpha: fade }).stroke({ width: 1, color: INK, alpha: fade });
        g.moveTo(b.x, b.y - 48).lineTo(tipX, b.y - 3).stroke({ width: 1, color: 0xFFFFFF, alpha: fade });
        g.rect(b.x - 9, b.y - 53, 18, 4).fill({ color, alpha: fade }).stroke({ width: 1, color: INK, alpha: fade });
        g.rect(b.x - 1.5, b.y - 65, 3, 12).fill({ color: 0x3F3F46, alpha: fade });
      });
    }
    lightSpan(h, tl, at, at + 18, (g, u) => {
      glint(g, c.x, c.y - 4, 34 * (1 - u) + 6, Math.PI / 4, 0xFFFBEA, 1 - u);
      glow(g, c.x, c.y, 30 * (1 - u) + 8, 0xFBBF24, 0.6 * (1 - u));
      glow(g, c.x, c.y, 24 * (1 - u) + 6, 0xA78BFA, 0.6 * (1 - u));
    });
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: i === last ? 1.1 : 1, tint: 0xFEF3C7, burst: 'slash', burstSize: 0.9, sfx: 'slash_heavy', glare: i === last ? 0.2 : 0.6 });
      if (i === last) {
        impactFrame(h, tl, c, { color: 0xFBBF24, dim: [0.75, DIM] });
        h.roll(-0.1, 10, true);
        signature(h, tl, tl.frame, c, L_SOVEREIGN, 52);
      }
      h.knock(i, 4, -4);
      h.sparks(t.x, t.y - 20, 12, [0xFBBF24, 0xA78BFA, 0xFFFFFF]);
    });
  });
  const end = DROP + last * 5;
  tl.at(DROP, () => h.flash(0.2, 0xFFFBEA));
  tl.during(end + 12, end + 26, (t) => h.dim(0.75 * (1 - t), DIM));
  tl.end(end + 28);
}

/** One move per secret-weapon spell templateId. */
export const SECRET_SPELL_MOVES: Record<string, KnightMove> = {
  spell_test_your_strength: testYourStrength,
  spell_big_top_finale: bigTopFinale,
  spell_undertow: undertow,
  spell_leviathans_maw: staged(14, L_MAW, leviathansMaw, { circle: 36 }),
  spell_sanctified_smoke: sanctifiedSmoke,
  spell_candlemass: staged(14, L_CANDLE, candlemass, { circle: 38 }),
  spell_peal: pealOfThunder,
  spell_storm_toll: stormToll,
  spell_golden_touch: staged(14, L_GOLD, goldenTouch, { circle: 32 }),
  spell_treasury_rain: staged(16, L_GOLD, treasuryRain, { circle: 38 }),
  spell_quench: quench,
  spell_titans_anvil: titansAnvil,
  spell_stare_back: stareBack,
  spell_rift_hymn: riftHymn,
  spell_eclipse_edge: eclipseEdge,
  spell_twin_sovereigns: twinSovereigns,
};

