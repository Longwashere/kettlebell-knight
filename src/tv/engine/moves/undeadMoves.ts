/**
 * The restless dead: Restless Ghost, Dungeon Wraith, Skeleton Archer / Warrior / Knight, Grave Colossus,
 * Bone Golem, Crypt Lord. Cold palettes (ectoplasm, grave-fire, frost, bone) and a lot of things rising
 * from the floor.
 */
import type { Graphics } from 'pixi.js';
import type { MonsterMoveId } from '../../../types/battle';
import type { MoveHost } from '../monsterKit';
import { type Timeline, lerp, easeIn, easeOut, easeInOut, arc, rand, INK, BONE, BLOOD, SHADOW, FIRE, SMOKE, GOO } from '../choreo';
import * as fx from '../fxKit';
import {
  type MoveFn, contact, chest, head, travel, dustAtFeet, drawSpan, projectile, jaws, spike, orb, sigil, retreat,
  crown, feet, land, chip, crater, boom, toxic, shatter, circle, portal, regen, flame, blaze, spark, dimSpan, chargeTint, tremble, puff, blink, warnRing, puddle, shoutRings, beam, dart,
  graspingHand, orbitRing, hexWard, guard, lean, flier,
} from '../monsterKit';

const ECTO = [0x67E8F9, 0xA5F3FC, 0x0E7490, 0xECFEFF];
const GRAVEFIRE = [0x4ADE80, 0x86EFAC, 0x166534, 0xDCFCE7];
const FROST = [0xBAE6FD, 0x7DD3FC, 0xE0F2FE, 0xFFFFFF];
const NECRO = [0x22C55E, 0x14532D, 0xA3E635, 0x052E16];
const BONES = [0xE7E5E4, 0xD6D3D1, 0xA8A29E, 0xFFFBEA];
const SOUL = [0xEF4444, 0xFCA5A5, 0x7F1D1D, 0xFFFFFF];

// ---------------------------------------------------------------------------------------------
// RESTLESS GHOST: a floating mask of shadow. It phases, wails, and slips inside you.

const ghostChillingGrasp: MoveFn = (h, tl) => {
  const c = contact(h, 40);
  tl.at(0, () => {
    h.anim('attack_start');
    h.sound('wail', { vol: 0.6, rate: 1.1 });
  });
  // Drift forward, half-phased
  tl.during(0, 26, (t, f) => {
    const e = easeInOut(t);
    h.offset(lerp(0, c.x, e), lerp(0, c.y, e));
    h.lift(Math.sin(f * 0.2) * 4 * (1 - t));
    h.alpha(lerp(1, 0.55, t));
  });
  tl.every(0, 26, 3, () => h.emit(h.pos().x + rand(-10, 10), h.pos().y - h.height * rand(0.2, 0.8), { count: 1, colors: ECTO, speed: [0.2, 0.5], angle: 0, spread: 0.6, gravity: -0.02, size: 3, life: [16, 26] }));
  tl.at(26, () => {
    h.anim('attack_middle', true);
    h.camera(1.24, h.knight.x + 16, h.knight.y - 30, 40);
    h.sound('frost');
    h.sound('whoosh_heavy', { rate: 0.8, vol: 0.6 });
  });
  // Two spectral hands close around the knight
  drawSpan(h, tl, 26, 62, (g, t, f) => {
    const p = chest(h);
    const close = easeOut(Math.min(1, f / 14));
    const fade = f > 26 ? 1 - (f - 26) / 10 : 1;
    for (const side of [-1, 1]) {
      const x = p.x + side * lerp(36, 12, close);
      const y = p.y - 4;
      g.ellipse(x, y, 7, 10).fill({ color: ECTO[0], alpha: 0.45 * fade }).stroke({ width: 1.5, color: ECTO[3], alpha: 0.8 * fade });
      for (let k = 0; k < 4; k++) {
        const fy = y - 8 + k * 5;
        g.moveTo(x, fy).lineTo(x - side * (10 + close * 4), fy - 2 + k).stroke({ width: 2, color: ECTO[1], alpha: 0.85 * fade });
      }
    }
  });
  tl.every(32, 60, 2, () => {
    const p = chest(h);
    h.emit(p.x + rand(-14, 14), p.y + rand(-16, 16), { count: 1, colors: FROST, speed: [0.1, 0.4], spread: Math.PI, gravity: 0.01, size: 2, life: [16, 26] });
  });
  tl.at(40, () => chip(h, FROST, 2, 4, 'ice'));
  tl.at(52, () => {
    shatter(h, chest(h).x, chest(h).y, 0.9);
    h.anim('attack_end');
    land(h, { kb: 8, shake: 9, stop: 5, flash: 0.35, color: 0xA5F3FC, colors: [...FROST, ...ECTO], sound: 'ice' });
  });
  tl.during(56, 80, (t) => {
    const e = easeInOut(t);
    h.offset(lerp(c.x, 0, e), lerp(c.y, 0, e));
    h.alpha(lerp(0.55, 1, t));
  });
  tl.at(80, () => h.idle());
  tl.end(82);
};

const ghostBansheeWail: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('attack_start');
    h.camera(1.32, h.pos().x - 6, h.pos().y - h.height * 0.6, 34);
  });
  dimSpan(h, tl, 0, 100, 0.6, 0x0B1120);
  tremble(h, tl, 8, 34, { x: 0, y: 0 }, 1.5, 3);
  chargeTint(h, tl, 10, 34, 0xA5F3FC, 0.8);
  // Mouth glows white-hot before the scream
  drawSpan(h, tl, 10, 34, (g, t) => {
    const p = crown(h, 0.45, -4);
    g.ellipse(p.x, p.y, 4 + t * 4, 3 + t * 6).fill({ color: 0xECFEFF, alpha: t });
  });
  tl.at(34, () => {
    h.anim('attack_middle', true);
    h.sound('wail', { vol: 1.2 });
    h.sound('screech', { rate: 0.7, vol: 0.6 });
    h.sound('wail', { delay: 0.5, rate: 1.15, vol: 0.8 });
    h.camera(1.1, (h.home.x + h.knight.x) / 2, h.knight.y - 40, 60);
  });
  // The wail: thick rings that warp the air and pound the knight
  drawSpan(h, tl, 34, 84, (g, t) => {
    const p = crown(h, 0.45, -4);
    shoutRings(g, p.x, p.y, t * 2, 0xA5F3FC, 4, p.x - h.knight.x + 10);
    shoutRings(g, p.x, p.y, t * 2 + 0.12, 0xFFFFFF, 2, p.x - h.knight.x + 10);
  });
  tl.every(34, 80, 2, () => h.shake(4));
  [44, 54, 64].forEach((f) => tl.at(f, () => chip(h, [...ECTO, 0xFFFFFF], 4, 7, 'whoosh_heavy')));
  tl.at(76, () => land(h, { kb: 14, shake: 15, stop: 7, flash: 0.55, color: 0xECFEFF, zoom: 1.24, colors: [...ECTO, 0xFFFFFF], ring: 0x67E8F9, sound: 'screech' }));
  tl.at(84, () => h.anim('attack_end'));
  tl.end(102);
};

const ghostPhantasmalBolt: MoveFn = (h, tl) => {
  const mouth = () => crown(h, 0.45, -8);
  tl.at(0, () => {
    h.anim('attack_start');
    h.sound('charge', { rate: 1.3, vol: 0.6 });
    h.sound('wail', { vol: 0.4, rate: 1.4 });
  });
  // Ectoplasm gathers in a spiral
  drawSpan(h, tl, 0, 40, (g, t, f) => {
    const p = mouth();
    for (let k = 0; k < 6; k++) {
      const a = f * 0.25 + (k * Math.PI) / 3;
      const r = 26 * (1 - t);
      g.circle(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.6, 2).fill({ color: ECTO[k % 2] });
    }
    orb(g, p.x, p.y, 2 + 6 * easeOut(t), [ECTO[3], ECTO[0], ECTO[2]]);
  });
  tl.at(40, () => {
    h.anim('attack_end');
    h.sound('shoot', { rate: 0.7 });
    h.sound('wail', { vol: 0.5, rate: 1.6 });
  });
  // Bolt weaves on a sine path
  let s = { x: 0, y: 0 };
  tl.at(40, () => (s = mouth()));
  drawSpan(h, tl, 40, 62, (g, t, f) => {
    const e = chest(h);
    const x = lerp(s.x, e.x, easeIn(t));
    const y = lerp(s.y, e.y, t) + Math.sin(t * 12) * 10 * (1 - t);
    orb(g, x, y, 7, [ECTO[3], ECTO[0], ECTO[2]]);
    for (let k = 1; k < 5; k++) g.circle(x + k * 6, y - Math.sin((t - k * 0.04) * 12) * 6, 5 - k).fill({ color: ECTO[0], alpha: 0.6 - k * 0.12 });
  });
  tl.at(62, () => {
    const p = chest(h);
    h.emit(p.x, p.y, { count: 26, colors: ECTO, speed: [1.5, 4], spread: Math.PI, gravity: -0.02, size: 3, life: [14, 26] });
    h.shockwave(p.x, p.y, 0x67E8F9);
    portal(h, p.x, p.y, 0.7, 0xA5F3FC);
    land(h, { kb: 10, shake: 10, stop: 5, flash: 0.35, color: 0x67E8F9, zoom: 1.22, colors: ECTO, sound: 'frost' });
  });
  tl.end(80);
};

const ghostPossession: MoveFn = (h, tl) => {
  const into = { x: contact(h, 0).x, y: contact(h, 0).y };
  tl.at(0, () => {
    h.anim('attack_start');
    h.camera(1.2, (h.home.x + h.knight.x) / 2, h.knight.y - 40, 40);
    h.sound('wail', { rate: 0.8 });
  });
  dimSpan(h, tl, 0, 110, 0.55, 0x0B1120);
  // Rushes into the knight, shrinking to a wisp
  tl.at(18, () => {
    h.anim('attack_middle', true);
    h.sound('whoosh_heavy');
    h.sound('dark', { rate: 1.4, vol: 0.5 });
  });
  tl.during(18, 34, (t) => {
    const e = easeIn(t);
    h.offset(lerp(0, into.x, e), lerp(0, into.y, e));
    h.stretch(lerp(1, 0.2, e), lerp(1, 0.2, e));
    h.alpha(1 - e);
  });
  tl.every(18, 34, 1, () => h.streaks(h.pos().x + 10, h.pos().y - 30, 30, ECTO));
  tl.at(34, () => {
    h.alpha(0);
    h.camera(1.38, h.knight.x + 6, h.knight.y - 34, 50);
    h.flash(0.3, 0x67E8F9);
    h.sound('dark', { rate: 0.8 });
    h.sound('hurt');
  });
  // The knight convulses with a ghostly aura
  drawSpan(h, tl, 34, 74, (g, t, f) => {
    const p = chest(h);
    const r = 24 + Math.sin(f * 0.9) * 4;
    g.ellipse(p.x, p.y, r * 0.8, r * 1.3).fill({ color: 0x0E7490, alpha: 0.25 }).stroke({ width: 2, color: ECTO[0], alpha: 0.7 });
    // The mask's eyes flicker over the knight's face
    if (f % 6 < 4) {
      const hd = head(h);
      g.poly([hd.x - 7, hd.y, hd.x - 2, hd.y - 2, hd.x - 2, hd.y + 1]).fill({ color: 0xFFFFFF });
      g.poly([hd.x + 7, hd.y, hd.x + 2, hd.y - 2, hd.x + 2, hd.y + 1]).fill({ color: 0xFFFFFF });
    }
  });
  [42, 52, 62].forEach((f, i) => tl.at(f, () => chip(h, ECTO, 5, 6, 'impact')));
  tl.at(42, () => h.sound('wail', { rate: 1.3, vol: 0.6 }));
  // Tears free in a burst
  tl.at(74, () => {
    const p = chest(h);
    h.offset(into.x + 30, into.y);
    h.alpha(1);
    h.stretch(1.3, 1.3);
    h.emit(p.x, p.y, { count: 40, colors: [...ECTO, 0xFFFFFF], speed: [2, 5], spread: Math.PI, gravity: 0, size: 3, life: [16, 30] });
    portal(h, p.x, p.y, 1.1, 0xA5F3FC);
    land(h, { kb: 16, shake: 16, stop: 8, flash: 0.6, color: 0xECFEFF, colors: [...ECTO, 0xFFFFFF], ring: 0x67E8F9, sound: 'screech' });
  });
  drawSpan(h, tl, 74, 88, (g, t) => fx.starburst(g, chest(h).x, chest(h).y, 36 * easeOut(t), 12, t, fx.pal(0x67E8F9, 0xFFFFFF), 1 - t));
  tl.during(76, 86, (t) => h.stretch(lerp(1.3, 1, t), lerp(1.3, 1, t)));
  tl.at(84, () => h.anim('attack_end'));
  travel(h, tl, 86, 108, { x: into.x + 30, y: into.y }, { x: 0, y: 0 }, easeInOut);
  tl.at(108, () => h.idle());
  tl.end(112);
};

// ---------------------------------------------------------------------------------------------
// DUNGEON WRAITH: a hooded shade with a burning red soul-orb. Siphons, rifts, frost and the scythe.

const wraithOrb = (h: MoveHost) => crown(h, 0.42, -6);

const wraithSoulSiphon: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('attack');
    h.camera(1.14, (h.home.x + h.knight.x) / 2, h.knight.y - 34, 80);
    h.sound('dark');
  });
  dimSpan(h, tl, 0, 96, 0.45, 0x1A0505);
  // Spectral tethers from orb to knight
  drawSpan(h, tl, 8, 76, (g, t, f) => {
    const o = wraithOrb(h);
    const p = chest(h);
    const reach = easeOut(Math.min(1, f / 10));
    for (let k = 0; k < 3; k++) {
      const ex = lerp(o.x, p.x, reach);
      const ey = lerp(o.y, p.y + (k - 1) * 10, reach);
      const sag = Math.sin(f * 0.25 + k) * 10;
      g.moveTo(o.x, o.y).quadraticCurveTo((o.x + ex) / 2, (o.y + ey) / 2 + sag, ex, ey).stroke({ width: 3, color: INK, alpha: 0.4 });
      g.moveTo(o.x, o.y).quadraticCurveTo((o.x + ex) / 2, (o.y + ey) / 2 + sag, ex, ey).stroke({ width: 1.5, color: SOUL[k % 2], alpha: 0.85 });
    }
    // Orb swells as it feeds
    orb(g, o.x, o.y, 5 + 5 * t, [0xFFFFFF, SOUL[0], SOUL[2]]);
  });
  // Soul motes travel back along the tether
  tl.every(16, 72, 2, () => {
    const o = wraithOrb(h);
    const p = chest(h);
    h.emit(p.x + rand(-6, 6), p.y + rand(-10, 10), { count: 1, colors: SOUL, speed: [2.2, 3], angle: Math.atan2(o.y - p.y, o.x - p.x), spread: 0.15, gravity: 0, size: 2, life: [18, 26] });
  });
  tl.at(10, () => h.sound('beam', { rate: 0.6, vol: 0.6 }));
  tl.at(40, () => h.sound('beam', { rate: 0.65, vol: 0.6 }));
  [30, 46, 60].forEach((f) => tl.at(f, () => chip(h, SOUL, 2, 3, 'wail')));
  tl.at(72, () => land(h, { kb: 8, shake: 9, stop: 4, flash: 0.35, color: BLOOD, colors: SOUL, sound: 'dark' }));
  tl.at(74, () => h.vfx('heal', h.pos().x, h.pos().y - h.height * 0.4, { size: 0.8, tint: 0xFF8080 }));
  tl.end(98);
};

const wraithShadowVortex: MoveFn = (h, tl) => {
  const vx = () => chest(h).x;
  const vy = () => chest(h).y;
  tl.at(0, () => {
    h.anim('attack');
    h.sound('dark');
    h.sound('wail', { rate: 0.7, vol: 0.6 });
    h.camera(1.25, h.knight.x + 6, h.knight.y - 32, 100);
  });
  dimSpan(h, tl, 0, 110, 0.65, 0x0B0414);
  // A rift spirals open around the knight and drags everything in
  drawSpan(h, tl, 10, 96, (g, t, f) => {
    const open = easeOut(Math.min(1, f / 24));
    const fade = f > 72 ? 1 - (f - 72) / 14 : 1;
    for (let arm = 0; arm < 4; arm++) {
      g.moveTo(vx(), vy());
      for (let i = 1; i <= 16; i++) {
        const u = i / 16;
        const a = arm * (Math.PI / 2) + u * 4 - f * 0.12;
        const r = u * 46 * open;
        g.lineTo(vx() + Math.cos(a) * r, vy() + Math.sin(a) * r * 0.75);
      }
      g.stroke({ width: 3, color: arm % 2 ? SHADOW[1] : SHADOW[2], alpha: 0.85 * fade });
    }
    g.circle(vx(), vy(), 8 * open).fill({ color: 0x000000, alpha: 0.9 * fade }).stroke({ width: 2, color: SOUL[0], alpha: fade });
  });
  tl.every(14, 86, 1, () => {
    const a = rand(0, Math.PI * 2);
    h.emit(vx() + Math.cos(a) * 56, vy() + Math.sin(a) * 40, { count: 1, colors: SHADOW, speed: [2, 2.6], angle: a + Math.PI + 0.5, spread: 0.1, gravity: 0, size: 2, life: [16, 22] });
  });
  tl.every(20, 80, 3, () => h.shake(2));
  tl.at(14, () => h.sound('spin', { rate: 0.5 }));
  tl.at(44, () => h.sound('spin', { rate: 0.55 }));
  [36, 50, 64].forEach((f) => tl.at(f, () => chip(h, [...SHADOW, SOUL[0]], 2, 5, 'dark')));
  tl.at(84, () => {
    h.emit(vx(), vy(), { count: 40, colors: [...SHADOW, SOUL[0]], speed: [2, 5], spread: Math.PI, gravity: 0, size: 3, life: [16, 28] });
    portal(h, vx(), vy(), 1.2);
    land(h, { kb: 14, shake: 15, stop: 7, flash: 0.55, color: 0x7C3AED, zoom: 1.32, colors: [...SHADOW, SOUL[0]], ring: 0xA855F7, sound: 'explosion' });
  });
  drawSpan(h, tl, 84, 98, (g, t) => fx.starburst(g, vx(), vy(), 34 * easeOut(t), 10, t, fx.pal(0x7C3AED, 0xF0ABFC), 1 - t));
  tl.end(112);
};

const wraithDeathChill: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('attack');
    h.sound('frost');
  });
  // Frost aura gathers on the wraith
  drawSpan(h, tl, 0, 30, (g, t, f) => {
    const p = h.pos();
    orbitRing(g, p.x, p.y - h.height * 0.5, 26 * (1 - t * 0.4), 8, f * 0.15, 3, FROST[1], 0xFFFFFF, t);
  });
  chargeTint(h, tl, 4, 30, 0xBAE6FD, 0.6);
  tl.at(0, () => h.vfx('ice', h.pos().x, h.pos().y - h.height * 0.5, { anim: 'IceNova_2', size: 1.3, start: 20, life: 36 }));
  // A freezing breath rolls across the floor
  tl.at(30, () => {
    h.sound('frost', { rate: 0.7 });
    h.sound('hiss', { rate: 0.6, vol: 0.6 });
    h.camera(1.15, (h.home.x + h.knight.x) / 2, h.knight.y - 30, 40);
  });
  drawSpan(h, tl, 30, 70, (g, t, f) => {
    const s = wraithOrb(h);
    const reach = easeOut(Math.min(1, f / 14));
    const ex = lerp(s.x, h.knight.x - 6, reach);
    for (let k = 0; k < 8; k++) {
      const u = k / 7;
      const x = lerp(s.x, ex, u);
      const y = lerp(s.y, h.knight.y - 24, u) + Math.sin(f * 0.3 + k) * 3;
      g.circle(x, y, 4 + u * 10).fill({ color: k % 2 ? 0xE0F2FE : 0x7DD3FC, alpha: 0.3 * (1 - t * 0.6) });
    }
  });
  // Ice crystals grow over the knight, then shatter
  drawSpan(h, tl, 44, 76, (g, t, f) => {
    const p = feet(h);
    const grow = easeOut(Math.min(1, f / 14));
    const pal = fx.pal(0x7DD3FC, 0xF0F9FF, 0x0C4A6E);
    fx.crystal(g, p.x - 14, p.y + 2, 30 * grow, 6, pal, -6);
    fx.crystal(g, p.x + 14, p.y + 2, 34 * grow, 6, pal, 6);
    fx.crystal(g, p.x, p.y + 3, 46 * grow, 8, pal, 0);
  });
  tl.at(44, () => h.sound('crack', { rate: 1.6, vol: 0.6 }));
  tl.at(50, () => chip(h, FROST, 1, 3, 'ice'));
  tl.at(76, () => {
    const p = chest(h);
    h.emit(p.x, p.y + 10, { count: 34, colors: FROST, speed: [1.5, 4.5], spread: Math.PI, gravity: 0.15, size: 3, life: [16, 28] });
    shatter(h, p.x, p.y + 6, 1.3);
    land(h, { kb: 10, shake: 12, stop: 6, flash: 0.5, color: 0xE0F2FE, zoom: 1.24, colors: FROST, ring: 0x7DD3FC, sound: 'ice' });
  });
  puddle(h, tl, 76, 120, 28, 0x0C4A6E, 0xBAE6FD);
  tl.end(120);
};

const wraithReaperScythe: MoveFn = (h, tl) => {
  const behind = { x: contact(h, 34).x, y: contact(h, 34).y };
  tl.at(0, () => {
    h.camera(1.18, h.home.x, h.home.y - 30, 20);
    h.sound('dark', { rate: 0.9 });
  });
  dimSpan(h, tl, 0, 100, 0.7, 0x050208);
  blink(h, tl, 6, behind, [...SHADOW, INK], 8);
  // A huge spectral scythe forms over its head
  drawSpan(h, tl, 24, 56, (g, t, f) => {
    const p = crown(h, 1.1, 0);
    const a = lerp(-0.3, -1.2, easeOut(t));
    const len = 44;
    const tx = p.x + Math.cos(a) * len;
    const ty = p.y + Math.sin(a) * len;
    g.moveTo(p.x + 10, p.y + 30).lineTo(tx, ty).stroke({ width: 3, color: INK }).moveTo(p.x + 10, p.y + 30).lineTo(tx, ty).stroke({ width: 1.5, color: 0x57534E });
    fx.crescent(g, tx - 4, ty + 18, 20, -Math.PI * 0.6, Math.PI * 0.05, 6, fx.pal(SOUL[0], 0xFFFFFF), t);
  });
  tl.at(24, () => {
    h.anim('attack');
    h.camera(1.34, h.knight.x + 12, h.knight.y - 40, 40);
    h.sound('wail', { rate: 0.7 });
    h.sound('slash', { rate: 0.6, vol: 0.6 }); // the blade forming
  });
  tl.at(54, () => h.sound('whoosh_heavy'));
  // The reap: a giant downward crescent through the knight
  drawSpan(h, tl, 56, 70, (g, t) => {
    const p = chest(h);
    fx.crescent(g, p.x + 6, p.y - 6, 40, -Math.PI * 0.4, -Math.PI * 0.4 + Math.PI * 1.15 * easeOut(Math.min(1, t * 2)), 10, fx.pal(SOUL[0], 0xFFFFFF), 1 - t * 0.7);
  });
  tl.at(60, () => {
    h.emit(chest(h).x, chest(h).y, { count: 30, colors: [...SOUL, ...SHADOW], speed: [1.5, 4.5], angle: Math.PI * 0.75, spread: 0.9, gravity: 0.1, size: 3, life: [16, 28] });
    land(h, { kb: 16, shake: 16, stop: 8, flash: 0.6, color: BLOOD, colors: [...SOUL, ...SHADOW], sound: 'slash_heavy' });
  });
  blink(h, tl, 78, { x: 0, y: 0 }, [...SHADOW, INK], 8);
  tl.end(102);
};

// ---------------------------------------------------------------------------------------------
// SKELETON ARCHER: precise marksman. Every shot is drawn, held, and released.

const bow = (h: MoveHost) => crown(h, 0.62, -10);

/** Draw-and-hold: a glint on the arrowhead while the camera leans in. */
function archerDraw(h: MoveHost, tl: Timeline, from: number, to: number, color: number) {
  tl.at(from, () => {
    h.anim('Attack1');
    h.sound('wood', { rate: 0.6, vol: 0.4 }); // bow creaks as it's drawn
    h.sound('rattle', { vol: 0.35, rate: 1.3 });
  });
  drawSpan(h, tl, from, to, (g, t, f) => {
    const p = bow(h);
    const a = 0.5 + 0.5 * Math.sin(f * 0.8);
    g.moveTo(p.x - 6 * a, p.y).lineTo(p.x + 6 * a, p.y).stroke({ width: 1, color, alpha: a });
    g.moveTo(p.x, p.y - 6 * a).lineTo(p.x, p.y + 6 * a).stroke({ width: 1, color, alpha: a });
  });
}

const archerBoneArrow: MoveFn = (h, tl) => {
  tl.at(0, () => h.camera(1.15, h.home.x - 20, h.home.y - 30, 24));
  archerDraw(h, tl, 0, 24, 0xFFFFFF);
  tl.at(24, () => {
    h.sound('arrow');
    h.camera(1.12, (h.home.x + h.knight.x) / 2, h.knight.y - 30, 20);
  });
  projectile(h, tl, 24, 9, () => bow(h), () => chest(h), 4,
    (g, x, y) => {
      dart(g, x, y, Math.PI, 14, 0xE7E5E4, 0xFFFFFF, 2);
      g.moveTo(x + 7, y).lineTo(x + 30, y).stroke({ width: 1, color: 0xFFFFFF, alpha: 0.4 });
    },
    () => land(h, { kb: 8, shake: 8, stop: 4, zoom: 1.2, colors: [...BONES, BLOOD], sound: 'stab' }));
  // Arrow stuck and quivering
  drawSpan(h, tl, 33, 70, (g, t, f) => {
    const p = chest(h);
    const q = Math.sin(f * 1.5) * (1 - t) * 0.2;
    dart(g, p.x + 8, p.y, Math.PI + q, 12, 0xE7E5E4, 0xFFFFFF, 2);
    g.alpha = 1 - t;
  });
  tl.end(72);
};

const archerPiercingVolley: MoveFn = (h, tl) => {
  tl.at(0, () => h.camera(1.1, 220, 120, 90));
  archerDraw(h, tl, 0, 18, 0xFFFFFF);
  // Fires a fan skyward
  [18, 22, 26, 30, 34].forEach((f) => {
    tl.at(f, () => {
      h.anim('Attack1');
      h.sound('arrow', { rate: 1.1, vol: 0.7 });
    });
    projectile(h, tl, f, 10, () => bow(h), () => ({ x: bow(h).x - 30, y: 0 }), 0, (g, x, y) => dart(g, x, y, -Math.PI * 0.6, 10, 0xE7E5E4, 0xFFFFFF, 1.5), () => {});
  });
  warnRing(h, tl, 34, 66, BLOOD, 28);
  // Barbed rain on the knight
  const n = 8;
  for (let i = 0; i < n; i++) {
    const f = 46 + i * 3;
    const last = i === n - 1;
    const dx = last ? 6 : rand(-30, 36);
    if (i % 2 === 0) tl.at(f - 2, () => h.sound('whistle', { rate: 2.2, vol: 0.4 }));
    projectile(h, tl, f, 9, () => ({ x: h.knight.x + dx + 20, y: 20 }), () => ({ x: h.knight.x + dx, y: h.knight.y - (Math.abs(dx - 6) < 18 ? 24 : 0) }), 0,
      (g, x, y) => dart(g, x, y, Math.atan2(1, -0.14), 12, 0xE7E5E4, BLOOD, 2),
      () => {
        if (last) land(h, { kb: 12, shake: 13, stop: 6, flash: 0.35, zoom: 1.26, colors: [...BONES, BLOOD], ring: 0xA8A29E, sound: 'stab' });
        else if (Math.abs(dx - 6) < 18) chip(h, [...BONES, BLOOD], 3, 5, 'stab');
        else {
          h.emit(h.knight.x + dx, h.knight.y - 2, { count: 4, colors: [0x78716C, 0xA8A29E], speed: [0.6, 1.6], angle: -Math.PI / 2, spread: 0.6, gravity: 0.15, size: 2, life: [10, 16] });
          h.sound('wood', { rate: 1.6, vol: 0.4 }); // thunks into the floor
        }
      });
  }
  // Arrows left standing in the floor
  drawSpan(h, tl, 58, 110, (g, t) => {
    for (const dx of [-26, -10, 22, 34]) {
      const x = h.knight.x + dx;
      g.moveTo(x, h.knight.y).lineTo(x + 3, h.knight.y - 10).stroke({ width: 2, color: INK, alpha: 1 - t }).moveTo(x, h.knight.y).lineTo(x + 3, h.knight.y - 10).stroke({ width: 1, color: 0xE7E5E4, alpha: 1 - t });
    }
  }, 'ground');
  tl.end(112);
};

const archerPoisonShaft: MoveFn = (h, tl) => {
  tl.at(0, () => h.camera(1.18, h.home.x - 20, h.home.y - 30, 30));
  archerDraw(h, tl, 0, 30, 0xA3E635);
  // Dips the arrowhead: venom drips off it
  tl.every(4, 30, 3, () => h.emit(bow(h).x, bow(h).y + 2, { count: 1, colors: GOO, speed: [0.1, 0.3], angle: Math.PI / 2, spread: 0.3, gravity: 0.1, size: 2, life: [10, 16] }));
  tl.at(8, () => h.sound('gurgle', { vol: 0.4, rate: 1.4 }));
  tl.at(30, () => h.sound('arrow'));
  projectile(h, tl, 30, 10, () => bow(h), () => chest(h), 6,
    (g, x, y) => dart(g, x, y, Math.PI, 14, 0x65A30D, 0xD9F99D, 2),
    () => {
      const p = chest(h);
      h.emit(p.x, p.y, { count: 20, colors: GOO, speed: [1, 3], spread: Math.PI, gravity: 0.08, size: 3, life: [14, 26] });
      toxic(h, p.x, p.y, 0.9);
      land(h, { kb: 8, shake: 9, stop: 4, flash: 0.3, color: 0x84CC16, zoom: 1.2, colors: [...GOO, BONE], sound: 'stab' });
    },
    (x, y) => h.emit(x, y, { count: 1, colors: GOO, speed: [0, 0.3], spread: Math.PI, gravity: 0.05, size: 2, life: [8, 12] }));
  // Lingering poison cloud with a pulsing tick
  drawSpan(h, tl, 40, 100, (g, t, f) => {
    const p = chest(h);
    for (let k = 0; k < 5; k++) g.circle(p.x + Math.cos(k * 1.3 + f * 0.05) * 12, p.y + Math.sin(k * 1.7) * 14, 8 + k).fill({ color: 0x4D7C0F, alpha: 0.18 * (1 - t) });
  });
  // Poison ticks are cosmetic: the damage already landed with the arrow
  [64, 84].forEach((f) => tl.at(f, () => {
    h.sparks(chest(h).x, chest(h).y, 5, GOO);
    h.shake(2);
    h.sound('hiss', { vol: 0.4, rate: 1.3 });
  }));
  tl.end(100);
};

const archerSoulArrow: MoveFn = (h, tl) => {
  tl.at(0, () => h.camera(1.3, bow(h).x, bow(h).y, 46));
  dimSpan(h, tl, 0, 90, 0.55, 0x052E16);
  archerDraw(h, tl, 0, 46, 0x86EFAC);
  // Grave-fire wreathes the drawn arrow
  drawSpan(h, tl, 4, 46, (g, t, f) => {
    const p = bow(h);
    fx.lance(g, p.x + 8, p.y, p.x - 14, p.y, 3 + 3 * t, fx.pal(0x22C55E, 0xDCFCE7), 1);
    orb(g, p.x - 14, p.y, 2 + 4 * t + Math.sin(f) * 0.6, [0xDCFCE7, 0x4ADE80, 0x166534]);
  });
  tl.every(4, 46, 2, () => {
    const p = bow(h);
    const a = rand(0, Math.PI * 2);
    h.emit(p.x + Math.cos(a) * 18, p.y + Math.sin(a) * 12, { count: 1, colors: GRAVEFIRE, speed: [0.8, 1.2], angle: a + Math.PI, spread: 0.1, gravity: 0, size: 2, life: [12, 16] });
  });
  tl.at(4, () => h.sound('charge_long', { rate: 1.3, vol: 0.6 }));
  tl.at(30, () => h.sound('wail', { rate: 1.2, vol: 0.5 }));
  tl.at(46, () => {
    h.anim('Attack1');
    h.sound('arrow', { rate: 0.8 });
    h.sound('beam', { rate: 1.3 });
    h.camera(1.14, (h.home.x + h.knight.x) / 2, h.knight.y - 30, 30);
  });
  // A lance of green fire tears across the arena
  drawSpan(h, tl, 46, 66, (g, t, f) => {
    const s = bow(h);
    const e = chest(h);
    const reach = easeOut(Math.min(1, f / 4));
    const fade = f > 12 ? 1 - (f - 12) / 8 : 1;
    beam(g, s.x, s.y, lerp(s.x, e.x - 30, reach), lerp(s.y, e.y, reach), 8 + Math.sin(f * 1.5) * 2, [0x166534, 0x4ADE80, 0xDCFCE7], fade);
  });
  tl.every(46, 60, 1, () => h.streaks(chest(h).x + 30, chest(h).y, 40, GRAVEFIRE));
  tl.at(50, () => {
    h.emit(chest(h).x, chest(h).y, { count: 34, colors: GRAVEFIRE, speed: [2, 5], angle: Math.PI, spread: 0.8, gravity: -0.02, size: 3, life: [14, 26] });
    portal(h, chest(h).x, chest(h).y, 1, 0x86EFAC);
    land(h, { kb: 16, shake: 14, stop: 7, flash: 0.55, color: 0x4ADE80, colors: GRAVEFIRE, ring: 0x22C55E, sound: 'impact_crit' });
  });
  tl.end(92);
};

// ---------------------------------------------------------------------------------------------
// SKELETON WARRIOR: a rattling footman. Rusted scimitar, bone shield, and it won't stay dead.

const skwarScimitarSlash: MoveFn = (h, tl) => {
  const c = contact(h, 34);
  tl.at(0, () => {
    h.anim('Run', true);
    h.sound('rattle');
  });
  travel(h, tl, 0, 16, { x: 0, y: 0 }, c, easeIn);
  tl.every(0, 16, 2, () => dustAtFeet(h, 2, 1));
  tl.at(16, () => {
    h.anim('Attack');
    h.sound('rattle', { vol: 0.6 });
  });
  tl.at(26, () => h.sound('whoosh'));
  drawSpan(h, tl, 26, 38, (g, t) => {
    const p = chest(h);
    fx.crescent(g, p.x + 10, p.y - 2, 28, -Math.PI * 0.75, -Math.PI * 0.75 + Math.PI * 1.2 * easeOut(Math.min(1, t * 2)), 7, fx.pal(0xA8A29E, 0xFFFFFF), 1 - t * 0.6);
  });
  tl.at(30, () => land(h, { kb: 9, shake: 9, stop: 4, zoom: 1.2, colors: [...BONES, BLOOD], sound: 'slash' }));
  tl.at(44, () => h.anim('Run', true));
  retreat(h, tl, 44, 62, c);
  tl.at(62, () => h.idle());
  tl.end(64);
};

const skwarShieldBash: MoveFn = (h, tl) => {
  const c = contact(h, 26);
  tl.at(0, () => {
    h.anim('Hit');
    h.camera(1.16, h.home.x, h.home.y - 26, 26);
    h.sound('rattle');
    h.sound('rattle', { delay: 0.2, rate: 1.1 });
  });
  // Plants its feet, shield forward, bones rattling
  tremble(h, tl, 0, 22, { x: 0, y: 0 }, 1.5, 3);
  lean(h, tl, 4, 22, -0.18, 2);
  tl.every(0, 22, 4, () => h.emit(h.pos().x + rand(-10, 10), h.pos().y - rand(10, 40), { count: 1, colors: BONES, speed: [0.3, 0.8], angle: -Math.PI / 2, spread: 1, gravity: 0.1, size: 2, life: [10, 16] }));
  tl.at(22, () => {
    h.anim('Run', true);
    h.sound('dash');
  });
  tl.during(22, 32, (t) => h.tilt(lerp(-0.18, 0.2, t)));
  travel(h, tl, 22, 34, { x: 0, y: 0 }, c, easeIn);
  tl.every(22, 34, 1, () => h.streaks(h.pos().x + 14, h.pos().y - 24, 40, [0xA8A29E, ...BONES]));
  tl.at(34, () => {
    h.anim('Attack');
    h.tilt(0);
    h.shockwave(chest(h).x + 6, chest(h).y, 0xE7E5E4);
    land(h, { kb: 18, shake: 15, stop: 7, flash: 0.45, zoom: 1.3, colors: [...BONES, 0xFFFFFF], sound: 'wood' });
    h.sound('impact_metal', { vol: 0.5 });
  });
  drawSpan(h, tl, 34, 46, (g, t) => fx.starburst(g, chest(h).x + 8, chest(h).y, 26 * easeOut(t), 8, 0.4, fx.pal(0xA8A29E, 0xFFFFFF), 1 - t));
  travel(h, tl, 36, 44, c, { x: c.x + 14, y: c.y }, easeOut);
  tl.at(52, () => h.anim('Run', true));
  retreat(h, tl, 52, 72, { x: c.x + 14, y: c.y });
  tl.at(72, () => h.idle());
  tl.end(74);
};

const skwarBonePhalanx: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('Hit');
    h.sound('rattle');
    h.sound('rattle', { delay: 0.18, rate: 1.15 });
  });
  // Bones fly in from the floor and lock into a wall
  const n = 10;
  for (let i = 0; i < n; i++) {
    const sx = rand(-60, 60);
    drawSpan(h, tl, i * 2, 24 + i * 2, (g, t) => {
      const p = h.pos();
      const tx = p.x - 22;
      const ty = p.y - 8 - i * 5;
      const x = lerp(p.x + sx, tx, easeOut(t));
      const y = lerp(p.y, ty, easeOut(t)) - arc(t) * 20;
      g.moveTo(x - 6, y).lineTo(x + 6, y).stroke({ width: 4, color: INK }).moveTo(x - 6, y).lineTo(x + 6, y).stroke({ width: 2, color: BONES[0] });
    });
  }
  guard(h, tl, 20, BONES, (g, cx, cy, grow, fade) => {
    const x = cx - 22;
    for (let i = 0; i < 10; i++) {
      const y = cy + 22 - i * 5 * grow;
      g.moveTo(x - 6, y).lineTo(x + 6, y).stroke({ width: 4, color: INK, alpha: fade }).moveTo(x - 6, y).lineTo(x + 6, y).stroke({ width: 2, color: BONES[i % 3], alpha: fade });
      g.circle(x - 6, y, 2).fill({ color: BONES[0], alpha: fade });
      g.circle(x + 6, y, 2).fill({ color: BONES[0], alpha: fade });
    }
  });
  tl.end(72);
};

const skwarBoneAmbush: MoveFn = (h, tl) => {
  const under = { x: contact(h, 26).x, y: contact(h, 26).y };
  // Collapses into a heap of bones
  tl.at(0, () => {
    h.anim('Dead');
    h.sound('rattle', { rate: 0.8 });
    h.sound('thud');
  });
  tl.at(30, () => {
    h.sound('rattle', { rate: 0.7 });
    puff(h, h.home.x, h.home.y, [0x57534E, 0xA8A29E], 12);
    h.emit(h.home.x, h.home.y - 6, { count: 16, colors: BONES, speed: [0.8, 2], angle: -Math.PI / 2, spread: 1, gravity: 0.2, size: 2, life: [12, 20] });
  });
  tl.during(30, 38, (t) => h.alpha(1 - t));
  // The bone pile scuttles along the floor to the knight
  drawSpan(h, tl, 38, 64, (g, t, f) => {
    const x = lerp(h.home.x, h.knight.x + 20, easeInOut(t));
    const y = lerp(h.home.y, h.knight.y, easeInOut(t));
    for (let k = 0; k < 9; k++) {
      const bx = x + Math.cos(k * 2.1 + f * 0.6) * 13;
      const by = y - 3 - Math.abs(Math.sin(k + f * 0.6)) * 7;
      g.moveTo(bx - 7, by).lineTo(bx + 7, by - 2).stroke({ width: 5, color: INK }).moveTo(bx - 7, by).lineTo(bx + 7, by - 2).stroke({ width: 2.5, color: BONES[k % 3] });
      g.circle(bx - 7, by, 2).fill({ color: BONES[0] });
      g.circle(bx + 7, by - 2, 2).fill({ color: BONES[0] });
    }
    // The skull leads the scuttling heap, eyes lit
    const sx = x - 12;
    const sy = y - 10 - Math.abs(Math.sin(f * 0.6)) * 4;
    g.circle(sx, sy, 6).fill({ color: BONES[0] }).stroke({ width: 1.5, color: INK });
    g.rect(sx - 4, sy - 2, 3, 3).fill({ color: BLOOD });
    g.rect(sx + 1, sy - 2, 3, 3).fill({ color: BLOOD });
  }, 'ground');
  tl.every(38, 64, 7, () => h.sound('rattle', { vol: 0.6, rate: rand(1, 1.3) }));
  tl.at(50, () => h.camera(1.26, h.knight.x + 12, h.knight.y - 30, 44));
  // Reassembles mid-swing
  tl.at(64, () => {
    h.offset(under.x, under.y);
    h.alpha(1);
    h.anim('Attack');
    h.emit(h.knight.x + 20, h.knight.y - 10, { count: 20, colors: BONES, speed: [1, 3], angle: -Math.PI / 2, spread: 1.2, gravity: 0.2, size: 2, life: [12, 22] });
    crater(h, h.knight.x + 22, h.knight.y, 0.9, 'ShockWave_3');
    h.sound('rattle', { rate: 0.85 });
    h.sound('whoosh');
  });
  tl.during(64, 72, (t) => h.stretch(lerp(1.3, 1, t), lerp(0.3, 1, easeOut(t))));
  drawSpan(h, tl, 70, 82, (g, t) => {
    const p = chest(h);
    fx.crescent(g, p.x + 10, p.y + 6, 28, Math.PI * 0.7, Math.PI * 0.7 - Math.PI * 1.1 * easeOut(Math.min(1, t * 2)), 7, fx.pal(0xA8A29E, 0xFFFFFF), 1 - t * 0.6);
  });
  tl.at(72, () => land(h, { kb: 12, shake: 12, stop: 6, flash: 0.3, zoom: 1.3, colors: [...BONES, BLOOD], ring: 0xA8A29E, sound: 'slash' }));
  tl.at(84, () => h.anim('Run', true));
  retreat(h, tl, 84, 104, under);
  tl.at(104, () => h.idle());
  tl.end(106);
};

// ---------------------------------------------------------------------------------------------
// SKELETON KNIGHT: a dread cavalier whose rig only idles. Its weight comes from lean, slide and lance.

const lanceTip = (h: MoveHost) => crown(h, 0.5, -24);

const skknightDreadLance: MoveFn = (h, tl) => {
  const c = contact(h, 40);
  tl.at(0, () => {
    h.camera(1.15, h.home.x, h.home.y - 30, 24);
    h.sound('rattle', { rate: 0.7 });
  });
  lean(h, tl, 0, 18, 0.15, 4); // rears back
  tremble(h, tl, 4, 18, { x: 0, y: 0 }, 1, 2.5);
  tl.at(18, () => {
    h.sound('dash');
    h.sound('step', { rate: 1.3 });
    h.sound('step', { rate: 1.3, delay: 0.1 });
  });
  tl.during(18, 30, (t) => h.tilt(lerp(0.15, -0.22, easeIn(t))));
  travel(h, tl, 18, 30, { x: 0, y: 0 }, c, easeIn);
  tl.every(18, 30, 1, () => {
    h.streaks(h.pos().x + 16, h.pos().y - 30, 50, [0x7F1D1D, BLOOD, BONES[0]]);
    dustAtFeet(h, 2, 1);
  });
  drawSpan(h, tl, 18, 42, (g, t) => {
    const p = lanceTip(h);
    fx.lance(g, p.x + 30, p.y + 4, p.x - 18, p.y, 5, fx.pal(0x57534E, BONES[0]), 1);
  });
  tl.at(30, () => {
    h.tilt(0);
    land(h, { kb: 14, shake: 12, stop: 6, flash: 0.35, color: BLOOD, zoom: 1.24, colors: [...BONES, BLOOD], sound: 'stab' });
    h.sound('impact_metal', { vol: 0.5 });
  });
  drawSpan(h, tl, 30, 42, (g, t) => fx.starburst(g, chest(h).x, chest(h).y, 22 * easeOut(t), 6, 0, fx.pal(BLOOD, 0xFFFFFF), 1 - t));
  retreat(h, tl, 44, 66, c);
  tl.end(68);
};

const skknightPhantomTrample: MoveFn = (h, tl) => {
  const past = { x: h.knight.x - 80 - h.home.x, y: h.knight.y - h.home.y };
  tl.at(0, () => {
    h.camera(1.12, (h.home.x + h.knight.x) / 2, h.knight.y - 40, 110);
    h.sound('wail', { rate: 0.6 });
    h.sound('dark', { vol: 0.6 });
  });
  dimSpan(h, tl, 0, 116, 0.55, 0x0B0414);
  // Spectral steed: hoof-fire flares under it while it paws the ground
  drawSpan(h, tl, 0, 40, (g, t, f) => {
    const p = h.pos();
    for (let k = 0; k < 4; k++) {
      const x = p.x - 14 + k * 9;
      const hgt = 6 + Math.abs(Math.sin(f * 0.4 + k)) * 10;
      g.ellipse(x, p.y - hgt / 2, 3, hgt / 2).fill({ color: GRAVEFIRE[k % 2], alpha: 0.7 });
    }
  }, 'ground');
  tl.every(0, 40, 8, () => {
    h.shake(3);
    dustAtFeet(h, 3, 1);
    h.sound('step', { rate: 0.9 });
  });
  // Charge straight through the knight, wreathed in grave-fire
  travel(h, tl, 40, 58, { x: 0, y: 0 }, past, easeIn);
  tl.at(40, () => h.sound('fire', { rate: 0.6 }));
  tl.every(40, 58, 4, () => h.sound('step', { vol: 0.7, rate: 1.2 }));
  tl.during(40, 58, (t, f) => h.lift(Math.abs(Math.sin(f * 0.6)) * 6));
  tl.every(40, 58, 1, () => {
    h.streaks(h.pos().x + 20, h.pos().y - 30, 50, GRAVEFIRE);
    h.emit(h.pos().x + 10, h.pos().y - 4, { count: 2, colors: GRAVEFIRE, speed: [0.5, 1.5], angle: -Math.PI / 2, spread: 0.6, gravity: -0.05, size: 3, life: [16, 24] });
  });
  // Burning hoofprints left behind
  const prints: { x: number; y: number }[] = [];
  tl.every(40, 58, 2, () => prints.push({ x: h.pos().x + rand(-4, 8), y: h.pos().y + rand(-1, 2) }));
  drawSpan(h, tl, 40, 112, (g, t) => {
    for (const p of prints) {
      g.ellipse(p.x, p.y, 4, 1.5).fill({ color: 0x22C55E, alpha: 0.9 * (1 - t) });
      g.ellipse(p.x, p.y, 2, 0.8).fill({ color: 0xDCFCE7, alpha: 1 - t });
    }
  }, 'ground');
  tl.at(55, () => {
    land(h, { kb: 18, shake: 16, stop: 7, flash: 0.55, color: 0x4ADE80, colors: [...GRAVEFIRE, BONE], ring: 0x22C55E, sound: 'impact_crit' });
    h.camera(1.28, h.knight.x, h.knight.y - 30, 20);
  });
  // Rears around and gallops home
  tl.at(70, () => h.stretch(-1, 1));
  travel(h, tl, 70, 98, past, { x: 0, y: 0 }, easeInOut);
  tl.every(70, 98, 6, () => h.sound('step', { vol: 0.4, rate: 1.2 }));
  tl.during(70, 98, (t, f) => h.lift(Math.abs(Math.sin(f * 0.5)) * 4 * (1 - t)));
  tl.at(98, () => h.stretch(1, 1));
  tl.end(118);
};

const skknightDeathCrest: MoveFn = (h, tl) => {
  lean(h, tl, 0, 14, 0.12, 20);
  tl.at(0, () => h.sound('dark', { vol: 0.5, rate: 1.2 }));
  tl.at(20, () => h.sound('block', { vol: 0.6, rate: 0.8 }));
  chargeTint(h, tl, 0, 40, 0xC4B5FD, 0.5);
  guard(h, tl, 4, [...SHADOW, ...GRAVEFIRE], (g, cx, cy, grow, fade, f) => {
    fx.runeCircle(g, cx, cy + h.height * 0.5, 34 * grow, f * 0.05, fx.pal(0x22C55E, 0xDCFCE7), fade);
    // Skull crest on a heater shield
    const x = cx - 20;
    const y = cy - 2;
    const s = 16 * grow;
    g.poly([x - s * 0.7, y - s, x + s * 0.7, y - s, x + s * 0.7, y, x, y + s, x - s * 0.7, y]).fill({ color: 0x1C1917, alpha: 0.7 * fade }).stroke({ width: 2, color: 0x4ADE80, alpha: fade });
    g.circle(x, y - s * 0.3, s * 0.32).fill({ color: BONES[0], alpha: fade });
    g.rect(x - s * 0.18, y - s * 0.38, s * 0.12, s * 0.12).fill({ color: INK, alpha: fade });
    g.rect(x + s * 0.06, y - s * 0.38, s * 0.12, s * 0.12).fill({ color: INK, alpha: fade });
  });
  tl.end(62);
};

const skknightGraveHands: MoveFn = (h, tl) => {
  tl.at(0, () => h.camera(1.15, h.home.x, h.home.y - 26, 22));
  // Rears up and drives the lance into the ground
  tl.during(0, 18, (t) => {
    h.lift(easeOut(t) * 20);
    h.tilt(0.15 * t);
  });
  tl.during(18, 24, (t) => {
    h.lift(lerp(20, 0, easeIn(t)));
    h.tilt(lerp(0.15, -0.2, t));
  });
  tl.at(24, () => {
    h.shockwave(h.pos().x - 20, h.pos().y, 0x22C55E);
    crater(h, h.pos().x - 20, h.pos().y, 0.9, 'ShockWave_3');
    h.shake(9);
    h.sound('stab');
  });
  tl.during(24, 34, (t) => h.tilt(lerp(-0.2, 0, t)));
  // A green crack races to the knight
  drawSpan(h, tl, 24, 80, (g, t, f) => {
    const grow = Math.min(1, f / 14);
    const fade = f > 40 ? 1 - (f - 40) / 16 : 1;
    const x0 = h.home.x - 24;
    const x1 = lerp(x0, h.knight.x + 6, grow);
    for (const [w, color] of [[4, INK], [2, 0x22C55E], [1, 0xDCFCE7]] as const) {
      g.moveTo(x0, h.home.y);
      for (let i = 1; i <= 8; i++) g.lineTo(lerp(x0, x1, i / 8), lerp(h.home.y, h.knight.y, i / 8 * grow) + (i % 2 ? 1.5 : -1.5));
      g.stroke({ width: w, color, alpha: fade });
    }
  }, 'ground');
  tl.at(24, () => h.sound('crack'));
  tl.at(36, () => h.camera(1.26, h.knight.x + 6, h.knight.y - 24, 50));
  tl.at(34, () => circle(h, h.knight.x + 6, h.knight.y + 1, 1.1, 56, 0x86EFAC));
  // The dead claw up and grab
  const hands = [-18, -6, 8, 20];
  hands.forEach((dx, i) => {
    drawSpan(h, tl, 38 + i * 3, 86, (g, t, f) => {
      const up = easeOut(Math.min(1, f / 8));
      const grip = f > 16 ? 1 : f / 16;
      const sink = f > 34 ? (f - 34) / 12 : 0;
      graspingHand(g, h.knight.x + 6 + dx, h.knight.y + (i % 2 ? 2 : -1), up * (1 - sink), grip, BONES[0], 0x57534E, 1);
    });
    tl.at(38 + i * 3, () => h.sound('rock', { vol: 0.4, rate: 1.4 }));
    tl.at(38 + i * 3, () => h.emit(h.knight.x + 6 + dx, h.knight.y - 2, { count: 5, colors: [...GRAVEFIRE, 0x57534E], speed: [0.6, 1.8], angle: -Math.PI / 2, spread: 0.6, gravity: 0.12, size: 2, life: [12, 20] }));
  });
  tl.at(40, () => h.sound('rattle', { rate: 0.8 }));
  tl.at(48, () => chip(h, [...BONES, ...GRAVEFIRE], 1, 4, 'rattle'));
  tl.at(50, () => h.sound('wail', { rate: 0.9, vol: 0.5 }));
  tl.at(60, () => land(h, { kb: 6, shake: 12, stop: 5, flash: 0.35, color: 0x4ADE80, colors: [...BONES, ...GRAVEFIRE], sound: 'crack' }));
  tl.end(90);
};

// ---------------------------------------------------------------------------------------------
// GRAVE COLOSSUS: a lumbering corpse tank. Everything it does is slow, heavy and disgusting.

const colossusCorpseSlam: MoveFn = (h, tl) => {
  const near = contact(h, 46);
  tl.at(0, () => {
    h.anim('move', true);
    h.sound('growl', { rate: 0.6 });
  });
  travel(h, tl, 0, 30, { x: 0, y: 0 }, near, easeInOut);
  tl.every(4, 30, 10, () => {
    h.shake(3);
    h.sound('step', { rate: 0.7 });
    dustAtFeet(h, 4, 1);
  });
  tl.at(30, () => {
    h.anim('atk');
    h.camera(1.2, h.knight.x + 20, h.knight.y - 30, 30);
  });
  tl.at(50, () => h.sound('whoosh_heavy', { rate: 0.7 }));
  tl.at(58, () => {
    h.emit(feet(h).x + 6, feet(h).y - 6, { count: 20, colors: [...SMOKE, 0x57534E, 0x7F1D1D], speed: [1, 3], angle: -Math.PI / 2, spread: 1.2, gravity: 0.15, size: 3, life: [16, 26] });
    crater(h, feet(h).x + 8, feet(h).y, 1.1, 'ShockWave_3');
    land(h, { kb: 14, shake: 15, stop: 7, flash: 0.35, colors: [BLOOD, 0x7F1D1D, BONE], ring: 0x78716C, sound: 'splat' });
  });
  drawSpan(h, tl, 58, 72, (g, t) => fx.starburst(g, chest(h).x + 4, chest(h).y - 6, 30 * easeOut(t), 7, 0.6, fx.pal(0x7F1D1D, 0xFCA5A5), 1 - t));
  tl.at(80, () => h.anim('move', true));
  tl.every(84, 110, 10, () => h.sound('step', { rate: 0.7, vol: 0.6 }));
  travel(h, tl, 80, 110, near, { x: 0, y: 0 }, easeInOut);
  tl.at(110, () => h.idle());
  tl.end(112);
};

const colossusTombCollapse: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('atk');
    h.camera(1.1, 230, 120, 110);
    h.sound('roar', { rate: 0.6 });
  });
  // Pounds the earth: the crypt ceiling gives way
  tl.at(28, () => {
    h.shockwave(h.home.x - 10, h.home.y, 0x78716C);
    h.shake(12);
    h.sound('stomp');
    h.sound('quake');
  });
  dimSpan(h, tl, 20, 120, 0.4);
  tl.every(30, 80, 3, () => h.emit(h.knight.x + rand(-60, 60), 50, { count: 1, colors: [0x78716C, 0xA8A29E], speed: [1, 2], angle: Math.PI / 2, spread: 0.2, gravity: 0.15, size: 2, life: [30, 40] }));
  warnRing(h, tl, 34, 74, BLOOD, 30);
  // Slabs crash down one after another
  const slabs = [{ dx: -26, f: 48 }, { dx: 30, f: 56 }, { dx: 4, f: 66 }];
  slabs.forEach(({ dx, f }, i) => {
    const last = i === slabs.length - 1;
    drawSpan(h, tl, f - 12, f + 36, (g, t, ff) => {
      const fall = Math.min(1, ff / 12);
      const x = h.knight.x + 6 + dx;
      const y = lerp(30, h.knight.y - (last ? 26 : 16), easeIn(fall));
      const w = last ? 22 : 14;
      const ht = last ? 34 : 24;
      const fade = ff > 28 ? 1 - (ff - 28) / 8 : 1;
      g.rect(x - w / 2 - 1, y - ht / 2 - 1, w + 2, ht + 2).fill({ color: INK, alpha: fade });
      g.rect(x - w / 2, y - ht / 2, w, ht).fill({ color: 0x57534E, alpha: fade });
      g.rect(x - w / 2, y - ht / 2, w, 3).fill({ color: 0xA8A29E, alpha: fade });
      g.rect(x - 1, y - ht / 2 + 6, 2, ht * 0.5).fill({ color: 0x292524, alpha: fade });
      g.rect(x - 5, y - ht / 2 + 9, 10, 2).fill({ color: 0x292524, alpha: fade });
    });
    tl.at(f - 10, () => h.sound('whistle', { rate: 0.7, vol: 0.5 }));
    tl.at(f, () => {
      h.sound('rock', { rate: last ? 0.7 : 0.9 });
      const x = h.knight.x + 6 + dx;
      h.emit(x, h.knight.y - 6, { count: 18, colors: [...SMOKE, 0x78716C, 0xA8A29E], speed: [1, 3.5], angle: -Math.PI / 2, spread: 1.3, gravity: 0.15, size: 3, life: [16, 28] });
      h.shockwave(x, h.knight.y, 0xA8A29E);
      crater(h, x, h.knight.y, last ? 1.3 : 0.9, 'ShockWave_3');
      if (!last) {
        h.shake(9);
        h.sound('impact', { vol: 0.6 });
        if (Math.abs(dx) < 30) h.knightHit(5);
      } else land(h, { kb: 18, shake: 17, stop: 8, flash: 0.45, zoom: 1.28, colors: [0xA8A29E, BONE, BLOOD], sound: 'crack' });
    });
  });
  tl.end(122);
};

const colossusOssuary: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('atk');
    h.sound('rattle', { rate: 0.7 });
    h.sound('spin', { rate: 0.6, vol: 0.5 });
  });
  tl.at(18, () => h.sound('rattle', { rate: 0.6 }));
  // Bones and skulls swirl up and plate its body
  guard(h, tl, 10, BONES, (g, cx, cy, grow, fade, f) => {
    orbitRing(g, cx, cy, lerp(60, 30, grow), 12, f * 0.12, 4, BONES[0], 0xFFFFFF, fade);
    orbitRing(g, cx, cy - 12, lerp(50, 24, grow), 8, -f * 0.16, 3, BONES[2], BONES[0], fade);
  });
  tl.at(26, () => h.tint(0xE7E5E4));
  tl.at(56, () => h.tint(0xFFFFFF));
  tl.end(62);
};

const colossusBile: MoveFn = (h, tl) => {
  const mouth = () => crown(h, 0.75, -14);
  tl.at(0, () => {
    h.anim('idle', true);
    h.camera(1.2, h.home.x - 20, h.home.y - 34, 30);
  });
  // Heaves, gut swelling
  tl.during(0, 30, (t, f) => h.stretch(1 + 0.08 * t + Math.sin(f * 0.8) * 0.02, 1 - 0.05 * t));
  tl.every(0, 30, 10, () => h.sound('gurgle', { rate: 0.6, vol: 0.7 }));
  tl.at(4, () => h.sound('growl', { rate: 0.55, vol: 0.6 }));
  tl.at(30, () => {
    h.stretch(0.95, 1.06);
    h.sound('roar', { rate: 0.8, vol: 0.5 });
    h.sound('squelch', { rate: 0.6 });
    h.sound('gurgle', { rate: 0.8, delay: 0.25 });
    h.camera(1.14, (h.home.x + h.knight.x) / 2, h.knight.y - 30, 40);
  });
  // Arcing stream of bile
  drawSpan(h, tl, 30, 70, (g, t, f) => {
    const s = mouth();
    const e = chest(h);
    const reach = easeOut(Math.min(1, f / 10));
    const fade = f > 30 ? 1 - (f - 30) / 10 : 1;
    const ex = lerp(s.x, e.x, reach);
    const ey = lerp(s.y, e.y, reach);
    const cy = Math.min(s.y, ey) - 30;
    for (const [w, color, a] of [[9, INK, 0.5], [6, 0x4D7C0F, 0.9], [2.5, 0xBEF264, 1]] as const) {
      g.moveTo(s.x, s.y).quadraticCurveTo((s.x + ex) / 2, cy + Math.sin(f * 0.8) * 3, ex, ey).stroke({ width: w, color, alpha: a * fade });
    }
  });
  tl.every(34, 64, 1, () => {
    const p = chest(h);
    h.emit(p.x + 4, p.y, { count: 2, colors: GOO, speed: [1, 2.5], angle: -Math.PI * 0.7, spread: 0.6, gravity: 0.2, size: 2, life: [12, 20] });
  });
  [44, 54].forEach((f) => tl.at(f, () => chip(h, GOO, 2, 4, 'splat')));
  tl.at(64, () => land(h, { kb: 10, shake: 11, stop: 5, flash: 0.3, color: 0x84CC16, colors: [...GOO, BONE], sound: 'splat' }));
  tl.at(54, () => toxic(h, chest(h).x, chest(h).y, 1.1));
  puddle(h, tl, 40, 120, 30, 0x365314, 0x84CC16);
  tl.every(66, 110, 6, () => h.emit(feet(h).x + rand(-20, 20), feet(h).y - 2, { count: 1, colors: [0x65A30D, 0xA8A29E], speed: [0.2, 0.5], angle: -Math.PI / 2, spread: 0.3, gravity: -0.03, size: 4, life: [24, 36] }));
  tl.at(70, () => h.stretch(1, 1));
  tl.end(120);
};

// ---------------------------------------------------------------------------------------------
// BONE GOLEM: an ossuary given legs. Rib-cage jaws, bone spears, skull artillery.

const bgolemOssuaryStrike: MoveFn = (h, tl) => {
  const c = contact(h, 40);
  tl.at(0, () => {
    h.anim('Run', true);
    h.sound('rattle', { rate: 0.6 });
  });
  travel(h, tl, 0, 20, { x: 0, y: 0 }, c, easeIn);
  tl.every(0, 20, 4, () => {
    h.shake(2);
    h.sound('step', { vol: 0.6, rate: 0.8 });
    dustAtFeet(h, 3, 1);
  });
  tl.at(20, () => {
    h.anim('Attack01');
    h.camera(1.25, h.knight.x + 12, h.knight.y - 30, 34);
    h.sound('rattle', { rate: 0.8 });
  });
  // A cage of ribs snaps shut around the knight
  drawSpan(h, tl, 24, 54, (g, t, f) => {
    const p = chest(h);
    const close = easeIn(Math.min(1, f / 12));
    const fade = f > 20 ? 1 - (f - 20) / 10 : 1;
    for (let k = 0; k < 5; k++) {
      const y = p.y - 20 + k * 10;
      for (const side of [-1, 1]) {
        const x0 = p.x + side * lerp(40, 22, close);
        g.moveTo(x0, y - 12).quadraticCurveTo(p.x + side * lerp(30, 14, close), y, p.x + side * lerp(20, 3, close), y + 8).stroke({ width: 4, color: INK, alpha: fade });
        g.moveTo(x0, y - 12).quadraticCurveTo(p.x + side * lerp(30, 14, close), y, p.x + side * lerp(20, 3, close), y + 8).stroke({ width: 2, color: BONES[k % 3], alpha: fade });
      }
    }
  });
  tl.at(36, () => land(h, { kb: 12, shake: 13, stop: 7, flash: 0.35, colors: [...BONES, BLOOD], sound: 'chomp' }));
  tl.at(36, () => h.sound('wood', { rate: 0.7 }));
  tl.at(56, () => h.anim('Run', true));
  retreat(h, tl, 56, 80, c);
  tl.at(80, () => h.idle());
  tl.end(82);
};

const bgolemBoneSpire: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('Attack01');
    h.camera(1.12, h.home.x - 20, h.home.y - 30, 26);
    h.sound('rattle', { rate: 0.6 });
  });
  tl.at(26, () => {
    h.shockwave(h.home.x, h.home.y, 0xE7E5E4);
    crater(h, h.home.x - 8, h.home.y, 1.1, 'ShockWave_3');
    h.shake(10);
    h.sound('crack');
  });
  // A wave of bone spears marches to the knight
  const n = 7;
  for (let i = 0; i < n; i++) {
    const start = 28 + i * 4;
    drawSpan(h, tl, start, start + 20, (g, t) => {
      const u = i / (n - 1);
      const x = lerp(h.home.x - 24, h.knight.x + 30, u);
      const y = lerp(h.home.y, h.knight.y, u) + 2;
      const up = t < 0.3 ? easeOut(t / 0.3) : 1 - easeIn((t - 0.3) / 0.7);
      spike(g, x, y, (18 + i * 3) * up, 5, 0xD6D3D1, 0xFFFBEA, 0xFFFFFF);
    });
    tl.at(start, () => {
      h.shake(2);
      h.sound('rattle', { vol: 0.4, rate: 1.2 - i * 0.04 });
    });
  }
  tl.at(52, () => h.camera(1.3, h.knight.x + 6, h.knight.y - 34, 30));
  // The spire: a great bone spike impales from beneath
  drawSpan(h, tl, 58, 96, (g, t, f) => {
    const up = f < 5 ? easeOut(f / 5) : f > 24 ? 1 - (f - 24) / 14 : 1;
    const x = h.knight.x + 6;
    spike(g, x - 14, h.knight.y + 3, 36 * up, 6, 0xD6D3D1, 0xFFFBEA);
    spike(g, x + 12, h.knight.y + 3, 42 * up, 7, 0xD6D3D1, 0xFFFBEA);
    spike(g, x, h.knight.y + 4, 70 * up, 9, 0xE7E5E4, 0xFFFFFF);
  });
  tl.at(58, () => {
    h.emit(h.knight.x + 6, h.knight.y - 12, { count: 24, colors: [...BONES, 0x78716C], speed: [1.5, 4.5], angle: -Math.PI / 2, spread: 1, gravity: 0.2, size: 3, life: [18, 30] });
    crater(h, h.knight.x + 6, h.knight.y, 1.2, 'ShockWave_3');
    land(h, { kb: 14, shake: 16, stop: 8, flash: 0.45, colors: [...BONES, BLOOD], sound: 'stab' });
    h.sound('rattle', { rate: 0.7 });
  });
  tl.end(98);
};

const bgolemMarrowArmor: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('Attack01');
    h.sound('rattle', { rate: 0.7 });
  });
  tl.at(20, () => h.sound('wood', { rate: 0.8 }));
  chargeTint(h, tl, 0, 30, 0xFFF7ED, 0.4);
  guard(h, tl, 8, [...BONES, BLOOD], (g, cx, cy, grow, fade, f) => {
    // Bone plates clamp over the body like armour
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3;
      const r = lerp(56, 28, grow);
      const x = cx + Math.cos(a) * r * 0.8;
      const y = cy + Math.sin(a) * r;
      g.poly([x - 6, y - 4, x + 6, y - 6, x + 7, y + 4, x - 5, y + 6]).fill({ color: BONES[k % 3], alpha: fade }).stroke({ width: 1.5, color: INK, alpha: fade });
      g.rect(x - 1, y - 1, 2, 2).fill({ color: BLOOD, alpha: fade });
    }
  });
  tl.end(62);
};

const bgolemSkullCannon: MoveFn = (h, tl) => {
  const maw = () => crown(h, 0.7, -16);
  tl.at(0, () => {
    h.anim('Attack01');
    h.camera(1.14, (h.home.x + h.knight.x) / 2, h.knight.y - 40, 90);
    h.sound('rattle', { rate: 0.6 });
  });
  const skull = (g: Graphics, x: number, y: number, r: number) => {
    g.circle(x + 4, y, r + 3).fill({ color: GRAVEFIRE[0], alpha: 0.35 });
    g.circle(x, y, r).fill({ color: BONES[0] }).stroke({ width: 1.5, color: INK });
    g.rect(x - r * 0.6, y - r * 0.2, r * 0.45, r * 0.45).fill({ color: GRAVEFIRE[0] });
    g.rect(x + r * 0.1, y - r * 0.2, r * 0.45, r * 0.45).fill({ color: GRAVEFIRE[0] });
    g.rect(x - r * 0.4, y + r * 0.55, r * 0.8, r * 0.3).fill({ color: INK });
  };
  [22, 36, 50].forEach((f, i) => {
    const last = i === 2;
    tl.at(f - 4, () => {
      h.stretch(0.92, 1.08);
      h.sound('gurgle', { rate: 1.5, vol: 0.4 });
    });
    tl.at(f, () => {
      h.stretch(1.08, 0.94);
      puff(h, maw().x, maw().y + 6, [...GRAVEFIRE, ...SMOKE], 8);
      h.sound('stomp', { rate: 1.5, vol: 0.6 }); // cannon report
      h.sound('wail', { rate: 1.8, vol: 0.3 });
    });
    tl.during(f, f + 6, (t) => h.stretch(lerp(1.08, 1, t), lerp(0.94, 1, t)));
    const target = () => (last ? chest(h) : { x: h.knight.x + (i ? 22 : -18), y: h.knight.y - 4 });
    projectile(h, tl, f, 22, maw, target, 40,
      (g, x, y) => skull(g, x, y, last ? 10 : 7),
      () => {
        const p = target();
        h.emit(p.x, p.y, { count: last ? 34 : 16, colors: [...GRAVEFIRE, ...BONES], speed: [1.5, 4], angle: -Math.PI / 2, spread: 1.3, gravity: 0.12, size: 3, life: [14, 26] });
        h.shockwave(p.x, h.knight.y, 0x22C55E);
        boom(h, p.x, p.y, last ? 1.3 : 0.8);
        if (!last) {
          h.shake(8);
          h.knightHit(4);
          h.sound('impact', { vol: 0.6 });
        } else land(h, { kb: 14, shake: 14, stop: 6, flash: 0.45, color: 0x4ADE80, zoom: 1.26, colors: [...GRAVEFIRE, ...BONES], sound: 'impact_heavy' });
      },
      (x, y) => h.emit(x + 4, y, { count: 2, colors: GRAVEFIRE, speed: [0.3, 0.8], angle: 0, spread: 0.6, gravity: -0.04, size: 3, life: [10, 16] }));
  });
  tl.end(96);
};

// ---------------------------------------------------------------------------------------------
// CRYPT LORD: the lich archmage. Frost, necrotic novas, a phylactery, and a tomb of black ice.

const staff = (h: MoveHost) => crown(h, 1.02, -12);

const lichFrostbolt: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('Attack01');
    h.sound('frost');
  });
  drawSpan(h, tl, 0, 24, (g, t, f) => {
    const p = staff(h);
    fx.crystal(g, p.x, p.y + 6, 6 + 10 * easeOut(t), 3 + 2 * t, fx.pal(0x1E3A8A, 0xBAE6FD, INK), 0, 1);
    orbitRing(g, p.x, p.y, 16 * (1 - t), 6, f * 0.3, 2, FROST[1], 0xFFFFFF, t);
  });
  tl.at(24, () => {
    h.sound('shoot', { rate: 0.8 });
    h.sound('whoosh_fast', { rate: 0.8 });
    h.camera(1.14, (h.home.x + h.knight.x) / 2, h.knight.y - 40, 26);
  });
  projectile(h, tl, 24, 12, () => staff(h), () => chest(h), 10,
    (g, x, y) => {
      g.poly([x - 12, y, x - 2, y - 5, x + 10, y - 2, x + 10, y + 2, x - 2, y + 5]).fill({ color: 0x1E3A8A }).stroke({ width: 1.5, color: INK });
      g.poly([x - 12, y, x - 2, y - 3, x + 4, y]).fill({ color: 0xBAE6FD });
    },
    () => {
      const p = chest(h);
      h.emit(p.x, p.y, { count: 26, colors: [...FROST, 0x1E3A8A], speed: [1.5, 4], spread: Math.PI, gravity: 0.12, size: 3, life: [14, 26] });
      shatter(h, p.x, p.y, 1);
      land(h, { kb: 12, shake: 11, stop: 6, flash: 0.4, color: 0xBAE6FD, zoom: 1.22, colors: [...FROST, 0x1E3A8A], sound: 'ice' });
    },
    (x, y) => h.emit(x + 8, y, { count: 1, colors: FROST, speed: [0.1, 0.4], spread: Math.PI, gravity: 0.03, size: 2, life: [12, 20] }));
  puddle(h, tl, 36, 90, 22, 0x0C4A6E, 0xBAE6FD);
  tl.end(90);
};

const lichDeathNova: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('Skill01');
    h.camera(1.22, h.home.x, h.home.y - 40, 40);
    h.sound('dark');
    h.sound('charge_long', { rate: 1.3, vol: 0.6 });
  });
  dimSpan(h, tl, 0, 116, 0.65, 0x052E16);
  tl.at(0, () => circle(h, h.pos().x, h.pos().y + 1, 1.5, 50, 0x86EFAC));
  tl.at(44, () => portal(h, h.pos().x, h.pos().y - h.height * 0.5, 1.8, 0x86EFAC));
  tl.during(0, 30, (t) => h.lift(easeOut(t) * 18));
  // Necrotic energy spirals in
  tl.every(0, 40, 1, () => {
    const p = h.pos();
    const a = rand(0, Math.PI * 2);
    h.emit(p.x + Math.cos(a) * 60, p.y - h.height * 0.6 + Math.sin(a) * 40, { count: 1, colors: NECRO, speed: [2.4, 3], angle: a + Math.PI, spread: 0.05, gravity: 0, size: 2, life: [18, 22] });
  });
  drawSpan(h, tl, 0, 46, (g, t, f) => {
    const p = h.pos();
    sigil(g, p.x, p.y + 1, 40, Math.min(1, f / 24), f * 0.05, 0x22C55E, 0xDCFCE7);
  }, 'ground');
  tl.at(44, () => {
    h.camera(1.06, 220, 130, 60);
    h.flash(0.6, 0x4ADE80);
    h.shake(10);
    h.sound('explosion', { rate: 0.8 });
    h.sound('wail', { rate: 0.8, vol: 0.6 });
  });
  // The nova: twin rings sweep the whole arena
  drawSpan(h, tl, 44, 80, (g, t) => {
    const p = h.pos();
    const r = easeOut(t) * 260;
    for (const [dr, color] of [[0, 0x4ADE80], [-14, 0xDCFCE7]] as const) {
      g.circle(p.x, p.y - h.height * 0.5, Math.max(1, r + dr)).stroke({ width: 10, color: INK, alpha: 0.3 * (1 - t) });
      g.circle(p.x, p.y - h.height * 0.5, Math.max(1, r + dr)).stroke({ width: 5, color, alpha: 0.85 * (1 - t) });
    }
    fx.groundRing(g, p.x, p.y, r, 4, 0x22C55E, 1 - t);
  });
  tl.at(56, () => {
    h.emit(chest(h).x, chest(h).y, { count: 30, colors: NECRO, speed: [2, 5], angle: Math.PI, spread: 0.9, gravity: -0.02, size: 3, life: [16, 26] });
    land(h, { kb: 18, shake: 17, stop: 8, flash: 0.5, color: 0x22C55E, colors: [...NECRO, BONE], sound: 'impact_crit' });
  });
  tl.during(70, 96, (t) => h.lift(lerp(18, 0, easeInOut(t))));
  tl.end(118);
};

const lichPhylactery: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('Skill01');
    h.sound('dark', { vol: 0.5, rate: 1.2 });
  });
  tl.at(4, () => circle(h, h.pos().x, h.pos().y + 1, 1.3, 54, 0x86EFAC));
  guard(h, tl, 10, [...NECRO, 0xFFFFFF], (g, cx, cy, grow, fade, f) => {
    hexWard(g, cx, cy, 40 * grow, f * 0.02, 0x22C55E, 0xDCFCE7, fade);
    // The phylactery orbits, a glowing soul-gem
    const a = f * 0.12;
    const x = cx + Math.cos(a) * 30 * grow;
    const y = cy + Math.sin(a) * 12 * grow;
    g.poly([x, y - 7, x + 4, y, x, y + 7, x - 4, y]).fill({ color: 0x4ADE80, alpha: fade }).stroke({ width: 1.5, color: INK, alpha: fade });
    g.rect(x - 1, y - 3, 2, 3).fill({ color: 0xFFFFFF, alpha: fade });
  });
  tl.end(62);
};

const lichGlacialTomb: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('Skill01');
    h.camera(1.2, h.home.x, h.home.y - 40, 26);
    h.sound('dark', { rate: 1.1 });
  });
  dimSpan(h, tl, 0, 120, 0.55, 0x0C1A2E);
  tl.at(14, () => circle(h, h.knight.x + 6, h.knight.y + 1, 1.2, 86, 0x9FD8FF));
  // Frost sigil under the knight
  drawSpan(h, tl, 14, 100, (g, t, f) => {
    const p = feet(h);
    const fade = f > 70 ? 1 - (f - 70) / 16 : 1;
    g.alpha = fade;
    sigil(g, p.x, p.y + 1, 34, Math.min(1, f / 22), f * 0.04, 0x7DD3FC, 0xFFFFFF);
  }, 'ground');
  tl.at(26, () => {
    h.camera(1.3, h.knight.x + 6, h.knight.y - 36, 70);
    h.sound('frost', { rate: 0.8 });
  });
  tl.every(16, 40, 2, () => h.emit(feet(h).x + rand(-30, 30), feet(h).y, { count: 1, colors: FROST, speed: [0.5, 1.2], angle: -Math.PI / 2, spread: 0.2, gravity: -0.02, size: 2, life: [16, 26] }));
  // Black-ice crystals entomb the knight
  drawSpan(h, tl, 40, 82, (g, t, f) => {
    const p = feet(h);
    const pal = fx.pal(0x1E3A8A, 0xBAE6FD, INK);
    const grow = (k: number) => easeOut(Math.min(1, Math.max(0, (f - k * 3) / 10)));
    fx.crystal(g, p.x - 18, p.y + 2, 40 * grow(0), 8, pal, -8, 0.95);
    fx.crystal(g, p.x + 18, p.y + 2, 44 * grow(1), 8, pal, 8, 0.95);
    fx.crystal(g, p.x - 6, p.y + 4, 66 * grow(2), 11, pal, -3, 0.85);
    fx.crystal(g, p.x + 8, p.y + 4, 58 * grow(3), 10, pal, 4, 0.85);
  });
  tl.at(44, () => {
    chip(h, FROST, 1, 6);
    h.sound('ice', { rate: 0.7 });
    h.sound('crack', { rate: 1.5, vol: 0.6 });
  });
  tl.every(48, 80, 8, () => {
    h.shake(3);
    h.sound('crack', { rate: 1.8, vol: 0.35 });
  });
  // Shatter
  tl.at(82, () => {
    const p = chest(h);
    h.emit(p.x, p.y, { count: 50, colors: [...FROST, 0x1E3A8A], speed: [2, 5.5], spread: Math.PI, gravity: 0.18, size: 3, life: [18, 32] });
    shatter(h, p.x, p.y, 1.6);
    land(h, { kb: 18, shake: 17, stop: 9, flash: 0.65, color: 0xE0F2FE, colors: [...FROST, 0x1E3A8A], ring: 0x7DD3FC, sound: 'ice' });
    h.sound('impact_crit', { vol: 0.7 });
  });
  drawSpan(h, tl, 82, 96, (g, t) => fx.starburst(g, chest(h).x, chest(h).y, 40 * easeOut(t), 12, 0.2, fx.pal(0x7DD3FC, 0xFFFFFF), 1 - t));
  tl.end(122);
};

export const UNDEAD_MOVES = {
  ghost_chilling_grasp: ghostChillingGrasp,
  ghost_banshee_wail: ghostBansheeWail,
  ghost_phantasmal_bolt: ghostPhantasmalBolt,
  ghost_possession: ghostPossession,

  wraith_soul_siphon: wraithSoulSiphon,
  wraith_shadow_vortex: wraithShadowVortex,
  wraith_death_chill: wraithDeathChill,
  wraith_reaper_scythe: wraithReaperScythe,

  archer_bone_arrow: archerBoneArrow,
  archer_piercing_volley: archerPiercingVolley,
  archer_poison_shaft: archerPoisonShaft,
  archer_soul_arrow: archerSoulArrow,

  skwar_scimitar_slash: skwarScimitarSlash,
  skwar_shield_bash: skwarShieldBash,
  skwar_bone_phalanx: skwarBonePhalanx,
  skwar_bone_ambush: skwarBoneAmbush,

  skknight_dread_lance: skknightDreadLance,
  skknight_phantom_trample: skknightPhantomTrample,
  skknight_death_crest: skknightDeathCrest,
  skknight_grave_hands: skknightGraveHands,

  colossus_corpse_slam: colossusCorpseSlam,
  colossus_tomb_collapse: colossusTombCollapse,
  colossus_ossuary: colossusOssuary,
  colossus_bile: colossusBile,

  bgolem_ossuary_strike: bgolemOssuaryStrike,
  bgolem_bone_spire: bgolemBoneSpire,
  bgolem_marrow_armor: bgolemMarrowArmor,
  bgolem_skull_cannon: bgolemSkullCannon,

  lich_frostbolt: lichFrostbolt,
  lich_death_nova: lichDeathNova,
  lich_phylactery: lichPhylactery,
  lich_glacial_tomb: lichGlacialTomb,
} satisfies Partial<Record<MonsterMoveId, MoveFn>>;
