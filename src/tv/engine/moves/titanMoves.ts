/**
 * Living stone, wood, iron and fire: Stone Golem, Vault Guardian, Stone Gargoyle, Ancient Treant,
 * Inferno Titan, Magma Dragon. Mass is the theme: ground-shaking impacts, things falling from above.
 */
import type { Graphics } from 'pixi.js';
import type { MonsterMoveId } from '../../../types/battle';
import { lerp, easeIn, easeOut, easeInOut, arc, rand, INK, BONE, BLOOD, EMBER, GOLD, DIRT, FIRE, SMOKE } from '../choreo';
import * as fx from '../fxKit';
import {
  type MoveFn, type MoveHost, contact, chest, travel, dustAtFeet, drawSpan, projectile, spike, orb, retreat,
  crown, feet, land, chip, crater, boom, toxic, shatter, circle, portal, regen, flame, blaze, spark, dimSpan, chargeTint, tremble, warnRing, puddle, shoutRings, beam, orbitRing, hexWard,
  guard, lean, tentacle,
} from '../monsterKit';

const CRYSTAL = [0x22D3EE, 0x67E8F9, 0xCFFAFE, 0x0E7490];
const ROCK = [0x57534E, 0x78716C, 0xA8A29E, 0x44403C];
const IRON = [0x71717A, 0xA1A1AA, 0xE4E4E7, 0x3F3F46];
const STEAM = [0xE7E5E4, 0xD6D3D1, 0xF5F5F4];
const WOOD = [0x78350F, 0x92400E, 0xB45309, 0x451A03];
const LEAF = [0x4D7C0F, 0x65A30D, 0x84CC16, 0xD9F99D];
const MAGMA = [GOLD, EMBER, BLOOD, 0x1C1917];

/** Jagged rock chunk. */
function rock(g: Graphics, x: number, y: number, r: number, rot: number, body = ROCK[1], lit = ROCK[2]) {
  const pts: number[] = [];
  for (let k = 0; k < 7; k++) {
    const a = rot + (k / 7) * Math.PI * 2;
    const rr = r * (0.8 + 0.2 * (((k * 53) % 7) / 6));
    pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.poly(pts).fill({ color: body }).stroke({ width: 2, color: INK });
  g.circle(x - r * 0.3, y - r * 0.3, r * 0.35).fill({ color: lit });
}

/** Floor fissure from (x0,y0) to (x1,y1), glowing with `glow`, drawn `grow` of the way. */
function fissure(g: Graphics, x0: number, y0: number, x1: number, y1: number, grow: number, glow: number, core: number, alpha = 1, seed = 1) {
  const n = 14;
  const m = Math.max(1, Math.floor(n * grow));
  const pt = (i: number) => ({ x: lerp(x0, x1, i / n), y: lerp(y0, y1, i / n) + (((i * seed * 7) % 5) - 2) * 2.2 });
  for (const [w, color, a] of [[5, INK, 0.9], [2.5, glow, 0.95], [1, core, 1]] as const) {
    g.moveTo(x0, y0);
    for (let i = 1; i <= m; i++) g.lineTo(pt(i).x, pt(i).y);
    // Short side branches every few segments
    for (let i = 2; i <= m; i += 3) {
      const p = pt(i);
      const dir = (i * seed) % 2 ? 1 : -1;
      g.moveTo(p.x, p.y).lineTo(p.x - 6, p.y + dir * 4).lineTo(p.x - 10, p.y + dir * 5);
    }
    g.stroke({ width: w, color, alpha: a * alpha });
  }
}

/** Meteor falling toward (tx, ty) at progress `t`, from upper right. */
function meteor(g: Graphics, tx: number, ty: number, t: number, r: number) {
  const x = lerp(tx + 70, tx, t);
  const y = lerp(ty - 170, ty, t);
  g.moveTo(x, y).lineTo(x + 40, y - 90).stroke({ width: r * 1.8, color: BLOOD, alpha: 0.4 });
  g.moveTo(x, y).lineTo(x + 26, y - 60).stroke({ width: r, color: EMBER, alpha: 0.85 });
  g.moveTo(x, y).lineTo(x + 14, y - 32).stroke({ width: r * 0.4, color: GOLD });
  g.circle(x, y, r + 2).fill({ color: EMBER, alpha: 0.4 });
  g.circle(x, y, r).fill({ color: 0x1C1917 }).stroke({ width: 2, color: EMBER });
  g.rect(x - r * 0.4, y - r * 0.4, r * 0.5, r * 0.3).fill({ color: GOLD });
}

// ---------------------------------------------------------------------------------------------
// STONE GOLEM (crystal-cored)

const golemStoneHammer: MoveFn = (h, tl) => {
  const c = contact(h, 32);
  tl.at(0, () => h.anim('run', true));
  travel(h, tl, 0, 22, { x: 0, y: 0 }, c, easeInOut);
  tl.every(2, 22, 7, () => {
    h.shake(3);
    dustAtFeet(h, 3, 1);
  });
  tl.at(22, () => {
    h.anim('atk');
    h.camera(1.22, h.knight.x + 14, h.knight.y - 30, 40);
  });
  tl.during(22, 44, (t) => h.lift(easeOut(t) * 16));
  tl.at(40, () => h.sound('swing'));
  tl.during(44, 50, (t) => h.lift(lerp(16, 0, easeIn(t))));
  tl.at(50, () => {
    h.stretch(1.15, 0.88);
    h.emit(feet(h).x + 8, feet(h).y - 6, { count: 20, colors: [...ROCK, ...CRYSTAL], speed: [1.2, 3.5], angle: -Math.PI / 2, spread: 1.2, gravity: 0.2, size: 3, life: [14, 24] });
    crater(h, feet(h).x + 8, feet(h).y, 1.1, 'ShockWave_3');
    land(h, { kb: 14, shake: 15, stop: 7, flash: 0.35, colors: [...ROCK, ...CRYSTAL], ring: 0x78716C });
  });
  drawSpan(h, tl, 50, 64, (g, t) => fx.starburst(g, chest(h).x + 6, chest(h).y - 8, 28 * easeOut(t), 7, 0.4, fx.pal(0x78716C, 0xCFFAFE), 1 - t));
  tl.during(50, 60, (t) => h.stretch(lerp(1.15, 1, t), lerp(0.88, 1, t)));
  tl.at(66, () => h.anim('run', true));
  retreat(h, tl, 66, 90, c);
  tl.at(90, () => h.idle());
  tl.end(92);
};

const golemEarthquake: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('summon');
    h.camera(1.15, h.home.x, h.home.y - 40, 30);
  });
  // Rises high, crystal core flaring
  tl.during(0, 30, (t) => h.lift(easeOut(t) * 50));
  chargeTint(h, tl, 6, 30, 0xA5F3FC, 0.6);
  tl.at(30, () => h.sound('swing'));
  tl.during(30, 36, (t) => h.lift(lerp(50, 0, easeIn(t))));
  tl.at(36, () => {
    h.stretch(1.25, 0.8);
    h.shockwave(h.home.x, h.home.y, 0x78716C);
    h.shockwave(h.home.x, h.home.y, 0x22D3EE);
    crater(h, h.home.x - 8, h.home.y, 1.4, 'ShockWave_2');
    h.flash(0.3);
    h.shake(16);
    h.sound('crit');
    h.camera(1.04, 213, 130, 70);
  });
  tl.during(36, 46, (t) => h.stretch(lerp(1.25, 1, t), lerp(0.8, 1, t)));
  dimSpan(h, tl, 36, 120, 0.3);
  // Fissures race across the whole floor
  const lines = [-10, 0, 10];
  drawSpan(h, tl, 36, 110, (g, t, f) => {
    const grow = easeOut(Math.min(1, f / 18));
    const fade = f > 56 ? 1 - (f - 56) / 18 : 1;
    lines.forEach((dy, i) => fissure(g, h.home.x - 10, h.home.y + dy * 0.2, h.knight.x - 40, h.knight.y + dy * 0.6, grow, 0x22D3EE, 0xCFFAFE, fade, i + 2));
  }, 'ground');
  tl.every(36, 80, 3, () => h.shake(5));
  // Ceiling rocks fall
  [48, 56, 64, 72].forEach((f, i) => {
    const last = i === 3;
    const dx = last ? 6 : [-30, 34, -6][i];
    projectile(h, tl, f - 10, 10, () => ({ x: h.knight.x + dx, y: 40 }), () => ({ x: h.knight.x + dx, y: h.knight.y - 10 }), 0,
      (g, x, y) => rock(g, x, y, last ? 13 : 8, tl.frame * 0.2),
      () => {
        h.emit(h.knight.x + dx, h.knight.y - 6, { count: 12, colors: ROCK, speed: [1, 3], angle: -Math.PI / 2, spread: 1.1, gravity: 0.2, size: 3, life: [14, 22] });
        crater(h, h.knight.x + dx, h.knight.y, last ? 1.1 : 0.7, 'ShockWave_3');
        if (!last) {
          h.sound('hit');
          if (Math.abs(dx) < 20) h.knightHit(4);
        } else land(h, { kb: 16, shake: 17, stop: 8, flash: 0.4, zoom: 1.24, colors: [...ROCK, BONE] });
      });
  });
  tl.at(52, () => chip(h, ROCK, 6, 8));
  tl.end(122);
};

const golemGraniteSkin: MoveFn = (h, tl) => {
  tl.at(0, () => h.anim('summon'));
  guard(h, tl, 8, [...ROCK, ...CRYSTAL], (g, cx, cy, grow, fade, f) => {
    orbitRing(g, cx, cy, lerp(70, 26, grow), 8, f * 0.1, 6, ROCK[1], ROCK[2], fade);
    hexWard(g, cx, cy, 34 * grow, 0, 0x78716C, 0xCFFAFE, fade);
  });
  tl.at(24, () => h.tint(0xB8B2AC));
  tl.at(56, () => h.tint(0xFFFFFF));
  tl.end(62);
};

const golemCrystalBarrage: MoveFn = (h, tl) => {
  const core = () => crown(h, 0.55, -8);
  tl.at(0, () => {
    h.anim('atk');
    h.camera(1.15, h.home.x - 10, h.home.y - 30, 40);
  });
  // Crystals grow out of its core
  drawSpan(h, tl, 0, 44, (g, t, f) => {
    const p = core();
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI * 0.4 + (k / 5) * Math.PI * 0.8 + Math.PI;
      const len = 10 * easeOut(t);
      fx.crystal(g, p.x + Math.cos(a) * 6, p.y + Math.sin(a) * 6 + len, len, 3, fx.pal(0x0E7490, 0xCFFAFE), Math.cos(a) * 4);
    }
  });
  tl.at(44, () => {
    h.sound('swing');
    h.camera(1.1, (h.home.x + h.knight.x) / 2, h.knight.y - 30, 40);
  });
  // A spray of shards
  for (let i = 0; i < 8; i++) {
    const f = 44 + i * 2;
    const last = i === 7;
    let prev = { x: 0, y: 0 };
    projectile(h, tl, f, 12, core, () => ({ x: chest(h).x + rand(-4, 6), y: chest(h).y + (i - 3.5) * 5 }), (i - 3.5) * 3,
      (g, x, y, t) => {
        if (t === 0) prev = { x: x + 1, y };
        const ang = Math.atan2(y - prev.y, x - prev.x);
        prev = { x, y };
        const dx = Math.cos(ang) * 6;
        const dy = Math.sin(ang) * 6;
        g.poly([x + dx, y + dy, x - dy * 0.4, y + dx * 0.4, x - dx, y - dy, x + dy * 0.4, y - dx * 0.4]).fill({ color: CRYSTAL[1] }).stroke({ width: 1, color: INK });
      },
      () => {
        if (!last) {
          h.sparks(chest(h).x, chest(h).y, 4, CRYSTAL);
          if (i % 3 === 0) chip(h, CRYSTAL, 3, 4);
        } else {
          h.emit(chest(h).x, chest(h).y, { count: 26, colors: CRYSTAL, speed: [1.5, 4], spread: Math.PI, gravity: 0.15, size: 2, life: [14, 24] });
          shatter(h, chest(h).x, chest(h).y, 1);
          land(h, { kb: 12, shake: 12, stop: 6, flash: 0.4, color: 0x67E8F9, colors: [...CRYSTAL, BONE] });
        }
      });
  }
  tl.end(80);
};

// ---------------------------------------------------------------------------------------------
// VAULT GUARDIAN: an armoured automaton. Pistons, steam, and a mana reactor in its chest.

function steam(h: MoveHost, x: number, y: number, dir = -Math.PI / 2, n = 4) {
  h.emit(x, y, { count: n, colors: STEAM, speed: [0.8, 1.8], angle: dir, spread: 0.4, gravity: -0.04, size: 4, life: [16, 26] });
}

const vaultIronCleaver: MoveFn = (h, tl) => {
  const c = contact(h, 42);
  tl.at(0, () => h.anim('move', true));
  travel(h, tl, 0, 24, { x: 0, y: 0 }, c, easeInOut);
  tl.every(2, 24, 8, () => {
    h.shake(3);
    h.sound('hit');
    steam(h, h.pos().x + 10, h.pos().y - h.height * 0.7, -Math.PI / 2, 3);
  });
  // Two mechanical slashes, perfectly identical, timed like a machine
  [26, 40].forEach((f, i) => {
    tl.at(f, () => {
      h.anim('attack');
      h.sound('swing');
    });
    drawSpan(h, tl, f + 10, f + 20, (g, t) => {
      const p = chest(h);
      const a0 = i ? Math.PI * 0.75 : -Math.PI * 0.75;
      fx.crescent(g, p.x + 8, p.y, 30, a0, a0 + (i ? -1 : 1) * Math.PI * 1.2 * easeOut(Math.min(1, t * 2)), 8, fx.pal(0xA1A1AA, 0xFFFFFF), 1 - t * 0.6);
    });
    tl.at(f + 14, () => (i === 0 ? chip(h, [...IRON, BLOOD], 5, 7) : land(h, { kb: 12, shake: 13, stop: 6, flash: 0.3, zoom: 1.24, colors: [...IRON, BLOOD] })));
  });
  tl.at(66, () => h.anim('move', true));
  retreat(h, tl, 66, 92, c);
  tl.at(92, () => h.idle());
  tl.end(94);
};

const vaultCoreDischarge: MoveFn = (h, tl) => {
  const core = () => crown(h, 0.5, -6);
  tl.at(0, () => {
    h.anim('idle', true);
    h.camera(1.25, core().x, core().y, 50);
    h.sound('level_up');
  });
  dimSpan(h, tl, 0, 120, 0.5, 0x0A0A12);
  // Reactor spins up: steam vents, core glows hotter
  tl.every(0, 50, 5, () => {
    const p = h.pos();
    steam(h, p.x + rand(-16, 16), p.y - h.height * rand(0.4, 0.9), -Math.PI / 2 + rand(-0.6, 0.6), 3);
    h.shake(2);
  });
  drawSpan(h, tl, 0, 54, (g, t, f) => {
    const p = core();
    orb(g, p.x, p.y, 3 + 8 * easeIn(t) + Math.sin(f * 1.2) * t, [0xFFFFFF, 0x67E8F9, 0x0E7490]);
    for (let k = 0; k < 4; k++) {
      const a = f * 0.3 + (k * Math.PI) / 2;
      fx.bolt(g, p.x, p.y, p.x + Math.cos(a) * 20 * t, p.y + Math.sin(a) * 20 * t, 4, 3, fx.pal(0x67E8F9, 0xFFFFFF), 1, f + k);
    }
  });
  chargeTint(h, tl, 20, 54, 0xA5F3FC, 0.9);
  tl.at(54, () => {
    h.anim('attack');
    h.sound('crit');
    h.camera(1.1, (h.home.x + h.knight.x) / 2, h.knight.y - 34, 50);
  });
  // The discharge: a thick arcing beam with lightning wrapped around it
  drawSpan(h, tl, 54, 92, (g, t, f) => {
    const s = core();
    const e = chest(h);
    const reach = easeOut(Math.min(1, f / 4));
    const fade = f > 28 ? 1 - (f - 28) / 10 : 1;
    const ex = lerp(s.x, e.x - 10, reach);
    const ey = lerp(s.y, e.y, reach);
    beam(g, s.x, s.y, ex, ey, 14 + Math.sin(f * 1.5) * 3, [0x0E7490, 0x67E8F9, 0xFFFFFF], fade);
    fx.bolt(g, s.x, s.y, ex, ey, 8, 8, fx.pal(0xCFFAFE, 0xFFFFFF), 2, f, fade);
  });
  tl.every(54, 84, 1, () => h.shake(4));
  [60, 70].forEach((f) => tl.at(f, () => chip(h, [...CRYSTAL, 0xFFFFFF], 6, 7)));
  tl.at(82, () => boom(h, chest(h).x, chest(h).y, 1.2));
  tl.at(82, () => land(h, { kb: 20, shake: 18, stop: 9, flash: 0.7, color: 0xCFFAFE, colors: [...CRYSTAL, 0xFFFFFF], ring: 0x22D3EE }));
  tl.every(84, 116, 4, () => steam(h, h.pos().x + rand(-16, 16), h.pos().y - h.height * 0.6, -Math.PI / 2, 2));
  tl.end(122);
};

const vaultAegisLockdown: MoveFn = (h, tl) => {
  tl.at(0, () => h.anim('idle', true));
  // Plates slam shut with three heavy clanks
  [6, 14, 22].forEach((f) => tl.at(f, () => {
    h.stretch(1.03, 0.97);
    h.shake(4);
    h.sound('hit');
    steam(h, h.pos().x + rand(-20, 20), h.pos().y - h.height * 0.5, rand(-Math.PI, 0), 4);
  }));
  [9, 17, 25].forEach((f) => tl.at(f, () => h.stretch(1, 1)));
  guard(h, tl, 10, [...IRON, GOLD], (g, cx, cy, grow, fade, f) => {
    // Gear ring with teeth
    const r = 40 * grow;
    g.circle(cx, cy, r).stroke({ width: 4, color: INK, alpha: 0.6 * fade }).circle(cx, cy, r).stroke({ width: 2, color: 0xA1A1AA, alpha: fade });
    for (let k = 0; k < 12; k++) {
      const a = f * 0.04 + (k / 12) * Math.PI * 2;
      g.rect(cx + Math.cos(a) * r - 2, cy + Math.sin(a) * r - 2, 4, 4).fill({ color: GOLD, alpha: fade }).stroke({ width: 1, color: INK, alpha: fade });
    }
    hexWard(g, cx, cy, 30 * grow, 0, 0x71717A, GOLD, fade);
  });
  tl.at(26, () => h.tint(0xD4D4D8));
  tl.at(60, () => h.tint(0xFFFFFF));
  tl.end(64);
};

const vaultPistonSlam: MoveFn = (h, tl) => {
  const c = contact(h, 46);
  tl.at(0, () => h.anim('move', true));
  travel(h, tl, 0, 20, { x: 0, y: 0 }, c, easeInOut);
  tl.at(20, () => {
    h.anim('idle', true);
    h.camera(1.15, h.knight.x + 20, h.knight.y - 40, 70);
  });
  // Hydraulics charge: rises in jerky steps, venting steam
  [22, 30, 38].forEach((f, i) => {
    tl.during(f, f + 4, (t) => h.lift(lerp(i * 14, (i + 1) * 14, easeOut(t))));
    tl.at(f, () => {
      steam(h, h.pos().x - 16, h.pos().y - 4, Math.PI, 5);
      steam(h, h.pos().x + 16, h.pos().y - 4, 0, 5);
      h.sound('hit');
      h.shake(3);
    });
  });
  warnRing(h, tl, 30, 54, GOLD, 30);
  tl.at(52, () => {
    h.anim('attack');
    h.sound('swing');
  });
  tl.during(52, 56, (t) => h.lift(lerp(42, 0, easeIn(t))));
  tl.at(56, () => {
    h.stretch(1.2, 0.82);
    h.shockwave(feet(h).x, feet(h).y, 0xA1A1AA);
    h.shockwave(feet(h).x, feet(h).y, GOLD);
    crater(h, feet(h).x, feet(h).y, 1.4, 'ShockWave_2');
    h.emit(feet(h).x, feet(h).y - 4, { count: 24, colors: [...ROCK, GOLD], speed: [1.5, 4], angle: -Math.PI / 2, spread: 1.4, gravity: 0.2, size: 3, life: [14, 24] });
    land(h, { kb: 16, shake: 18, stop: 9, flash: 0.45, zoom: 1.28, colors: [...IRON, GOLD, BONE] });
  });
  tl.during(56, 66, (t) => h.stretch(lerp(1.2, 1, t), lerp(0.82, 1, t)));
  // Rivets pop off and rattle on the floor
  tl.at(58, () => h.emit(h.pos().x, h.pos().y - h.height * 0.5, { count: 10, colors: [GOLD, 0xA1A1AA], speed: [1.5, 3], angle: -Math.PI / 2, spread: 1.4, gravity: 0.22, size: 2, life: [20, 30] }));
  tl.at(74, () => h.anim('move', true));
  retreat(h, tl, 74, 98, c);
  tl.at(98, () => h.idle());
  tl.end(100);
};

// ---------------------------------------------------------------------------------------------
// STONE GARGOYLE

const gargTalon: MoveFn = (h, tl) => {
  const c = contact(h, 30);
  tl.at(0, () => h.anim('move', true));
  tl.during(0, 18, (t) => {
    const e = easeIn(t);
    h.offset(lerp(0, c.x, e), lerp(0, c.y, e));
    h.lift(arc(t) * 40);
  });
  tl.every(2, 18, 2, () => h.streaks(h.pos().x + 10, h.pos().y - 30, 30, ROCK));
  [20, 30].forEach((f, i) => {
    tl.at(f, () => {
      h.anim('attack');
      h.sound('swing');
    });
    drawSpan(h, tl, f + 4, f + 14, (g, t) => {
      const p = chest(h);
      for (let k = -1; k <= 1; k++) {
        const ox = k * 6;
        g.moveTo(p.x + ox - 10, p.y - 12 + i * 6).lineTo(p.x + ox + 10, p.y + 12 + i * 6).stroke({ width: 5, color: INK, alpha: 1 - t });
        g.moveTo(p.x + ox - 10, p.y - 12 + i * 6).lineTo(p.x + ox + 10, p.y + 12 + i * 6).stroke({ width: 2.5, color: 0xA8A29E, alpha: 1 - t });
      }
    });
    tl.at(f + 6, () => (i === 0 ? chip(h, [...ROCK, BLOOD], 4, 6) : land(h, { kb: 10, shake: 11, stop: 5, zoom: 1.2, colors: [...ROCK, BLOOD, BONE] })));
  });
  tl.at(46, () => h.anim('move', true));
  tl.during(46, 68, (t) => {
    const e = easeInOut(t);
    h.offset(lerp(c.x, 0, e), lerp(c.y, 0, e));
    h.lift(arc(t) * 40);
  });
  tl.end(70);
};

const gargRampartDive: MoveFn = (h, tl) => {
  const over = contact(h, 6);
  tl.at(0, () => {
    h.anim('wakeup');
    h.camera(1.15, h.home.x, h.home.y - 40, 30);
  });
  tl.at(18, () => {
    h.anim('move', true);
    h.sound('swing');
  });
  tl.during(18, 40, (t) => h.lift(easeIn(t) * 220));
  tl.at(40, () => {
    h.offset(over.x, over.y);
    h.camera(1.24, h.knight.x + 8, h.knight.y - 40, 50);
  });
  warnRing(h, tl, 40, 66, BLOOD, 26);
  ceilingDust(h, tl, 44, 66);
  // Plummets like a falling statue: stone tint, no flapping
  tl.at(58, () => {
    h.anim('stun', true);
    h.tint(0xA8A29E);
  });
  tl.during(58, 66, (t) => {
    h.lift(lerp(220, 0, easeIn(t)));
    h.stretch(0.85, 1.2);
  });
  tl.every(58, 66, 1, () => h.streaks(h.pos().x, h.pos().y - 50, 50, ROCK));
  tl.at(66, () => {
    h.stretch(1.35, 0.7);
    h.tint(0xFFFFFF);
    h.emit(feet(h).x, feet(h).y - 6, { count: 34, colors: [...ROCK, ...DIRT], speed: [1.5, 4.5], angle: -Math.PI / 2, spread: 1.3, gravity: 0.2, size: 3, life: [16, 28] });
    h.shockwave(feet(h).x, feet(h).y, 0x78716C);
    crater(h, feet(h).x, feet(h).y, 1.5, 'ShockWave_2');
    land(h, { kb: 18, shake: 20, stop: 10, flash: 0.55, colors: [...ROCK, BONE, BLOOD], ring: 0xA8A29E });
  });
  drawSpan(h, tl, 66, 130, (g, t) => {
    const p = feet(h);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      g.moveTo(p.x, p.y).lineTo(p.x + Math.cos(a) * 34, p.y + Math.sin(a) * 9).stroke({ width: 2, color: INK, alpha: 1 - t });
    }
  }, 'ground');
  tl.during(66, 78, (t) => h.stretch(lerp(1.35, 1, easeOut(t)), lerp(0.7, 1, easeOut(t))));
  tl.at(84, () => h.anim('move', true));
  tl.during(84, 110, (t) => {
    const e = easeInOut(t);
    h.offset(lerp(over.x, 0, e), lerp(over.y, 0, e));
    h.lift(arc(t) * 50);
  });
  tl.end(130);
};

function ceilingDust(h: MoveHost, tl: Parameters<MoveFn>[1], from: number, to: number) {
  tl.every(from, to, 2, () => h.emit(h.knight.x + rand(-40, 40), 50, { count: 1, colors: ROCK, speed: [1, 2], angle: Math.PI / 2, spread: 0.2, gravity: 0.18, size: 2, life: [24, 34] }));
}

const gargStoneForm: MoveFn = (h, tl) => {
  tl.at(0, () => h.anim('immobilization'));
  tl.during(0, 24, (t, f) => h.tint(f % 6 < 3 ? 0xA8A29E : 0xFFFFFF));
  tl.at(24, () => h.tint(0x9CA3AF));
  guard(h, tl, 8, ROCK, (g, cx, cy, grow, fade) => {
    // Stone cracks crawl over it as it petrifies
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.4;
      g.moveTo(cx, cy).lineTo(cx + Math.cos(a) * 22 * grow, cy + Math.sin(a) * 26 * grow).stroke({ width: 1.5, color: INK, alpha: 0.7 * fade });
    }
    hexWard(g, cx, cy, 38 * grow, 0, 0x78716C, 0xE7E5E4, fade);
  });
  tl.at(58, () => {
    h.tint(0xFFFFFF);
    h.idle();
  });
  tl.end(62);
};

const gargRubbleHurl: MoveFn = (h, tl) => {
  const claws = () => crown(h, 1.0, -4);
  tl.at(0, () => {
    h.anim('push');
    h.camera(1.15, h.home.x, h.home.y - 40, 30);
  });
  tl.during(0, 20, (t) => h.lift(easeOut(t) * 30));
  // Tears a chunk of rampart out of the wall behind it
  tl.at(10, () => {
    h.emit(h.home.x + 30, h.home.y - 70, { count: 14, colors: ROCK, speed: [1, 2.5], angle: Math.PI, spread: 0.8, gravity: 0.2, size: 3, life: [14, 22] });
    h.shake(6);
    h.sound('hit');
  });
  drawSpan(h, tl, 10, 32, (g, t) => {
    const p = claws();
    rock(g, lerp(h.home.x + 30, p.x, easeOut(t)), lerp(h.home.y - 70, p.y - 10, easeOut(t)), 12, 0);
  });
  warnRing(h, tl, 28, 54, EMBER, 26);
  tl.at(32, () => {
    h.anim('attack');
    h.sound('swing');
    h.camera(1.1, (h.home.x + h.knight.x) / 2, h.knight.y - 50, 40);
  });
  projectile(h, tl, 32, 20, () => ({ x: claws().x, y: claws().y - 10 }), () => chest(h), 30,
    (g, x, y) => rock(g, x, y, 12, tl.frame * 0.25),
    () => {
      h.emit(chest(h).x, chest(h).y, { count: 30, colors: [...ROCK, ...DIRT], speed: [1.5, 4.5], spread: Math.PI, gravity: 0.2, size: 3, life: [16, 26] });
      land(h, { kb: 16, shake: 15, stop: 7, flash: 0.35, zoom: 1.26, colors: [...ROCK, BONE] });
    },
    (x, y) => h.emit(x, y, { count: 1, colors: ROCK, speed: [0, 0.3], spread: Math.PI, gravity: 0.1, size: 2, life: [8, 12] }));
  tl.during(56, 76, (t) => h.lift(lerp(30, 0, easeInOut(t))));
  tl.at(76, () => h.idle());
  tl.end(80);
};

// ---------------------------------------------------------------------------------------------
// ANCIENT TREANT: the elder of the grove. Slow, enormous, and the forest answers it.

const treantElderBough: MoveFn = (h, tl) => {
  const near = contact(h, 70);
  tl.at(0, () => h.anim('Run', true));
  travel(h, tl, 0, 26, { x: 0, y: 0 }, near, easeInOut);
  tl.every(2, 26, 9, () => {
    h.shake(4);
    dustAtFeet(h, 4, 1);
  });
  tl.at(26, () => {
    h.anim('Atk');
    h.camera(1.15, (h.knight.x + h.pos().x) / 2, h.knight.y - 40, 50);
  });
  // A great bough sweeps through in a wide, low arc
  drawSpan(h, tl, 50, 70, (g, t, f) => {
    const p = h.pos();
    const sx = p.x - 10;
    const sy = p.y - h.height * 0.75;
    const ang = lerp(-Math.PI * 0.9, -Math.PI * 1.25, easeIn(Math.min(1, t * 1.5)));
    const len = sx - chest(h).x + 10;
    const ex = sx + Math.cos(-ang) * -len;
    const ey = sy + Math.sin(-ang) * len * 0.8 + 30;
    for (const [w, color] of [[12, INK], [8, WOOD[0]], [3, WOOD[2]]] as const) g.moveTo(sx, sy).quadraticCurveTo((sx + ex) / 2, sy - 20, ex, ey).stroke({ width: w, color, cap: 'round' });
    for (let k = 1; k < 5; k++) {
      const u = k / 5;
      const lx = lerp(sx, ex, u);
      const ly = lerp(sy, ey, u) - 14 * Math.sin(u * Math.PI);
      g.circle(lx, ly - 4, 6).fill({ color: LEAF[k % 3] }).stroke({ width: 1, color: INK });
    }
    fx.crescent(g, chest(h).x + 10, chest(h).y, 34, Math.PI * 1.15, Math.PI * (1.15 - 0.7 * easeOut(t)), 10, fx.pal(0x4D7C0F, 0xD9F99D), 1 - t);
  });
  tl.at(56, () => {
    h.emit(chest(h).x, chest(h).y, { count: 24, colors: [...LEAF, ...WOOD], speed: [1.5, 4], angle: Math.PI, spread: 0.8, gravity: 0.06, size: 3, life: [20, 34] });
    land(h, { kb: 20, shake: 15, stop: 7, flash: 0.3, zoom: 1.24, colors: [...LEAF, BONE] });
  });
  tl.at(74, () => h.anim('Run', true));
  retreat(h, tl, 74, 102, near);
  tl.at(102, () => h.idle());
  tl.end(104);
};

const treantForestWrath: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('Skill_A');
    h.camera(1.15, h.home.x, h.home.y - 40, 26);
    h.sound('level_up');
  });
  dimSpan(h, tl, 0, 130, 0.45, 0x052E16);
  tl.at(22, () => {
    h.shockwave(h.home.x, h.home.y, 0x4D7C0F);
    h.shake(12);
    crater(h, h.home.x - 10, h.home.y, 1.4, 'ShockWave_3');
    h.sound('crit');
    h.camera(1.04, 213, 130, 50);
  });
  // Roots surge across the floor in three waves
  for (let w = 0; w < 3; w++) {
    for (let i = 0; i < 6; i++) {
      const start = 24 + w * 10 + i * 3;
      const lane = (w - 1) * 5;
      drawSpan(h, tl, start, start + 20, (g, t) => {
        const u = i / 5;
        const x = lerp(h.home.x - 30, h.knight.x + 30, u);
        const y = lerp(h.home.y, h.knight.y, u) + lane;
        const up = t < 0.3 ? easeOut(t / 0.3) : 1 - easeIn((t - 0.3) / 0.7);
        spike(g, x, y, (16 + i * 3) * up, 5, WOOD[3], WOOD[1], LEAF[3]);
      });
    }
  }
  tl.every(26, 70, 4, () => h.shake(3));
  tl.at(56, () => h.camera(1.28, h.knight.x + 6, h.knight.y - 34, 40));
  // Ancient roots seize the knight and an elder thorn impales from below
  [-20, 22].forEach((dx, i) => {
    drawSpan(h, tl, 60 + i * 4, 110, (g, t, f) => {
      const x = feet(h).x + dx;
      const up = easeOut(Math.min(1, f / 8));
      const sink = f > 34 ? (f - 34) / 14 : 0;
      const p = chest(h);
      tentacle(g, x, h.knight.y + 3, lerp(x, p.x, up * (1 - sink)), lerp(h.knight.y, p.y + i * 10, up * (1 - sink)), 9, dx * 0.8, WOOD[0], LEAF[2], false);
    });
  });
  tl.at(66, () => chip(h, [...WOOD, ...LEAF], 2, 6));
  drawSpan(h, tl, 78, 112, (g, t, f) => {
    const up = f < 5 ? easeOut(f / 5) : f > 22 ? 1 - (f - 22) / 12 : 1;
    spike(g, feet(h).x, h.knight.y + 4, 74 * up, 10, WOOD[3], WOOD[1], LEAF[3]);
  });
  tl.at(78, () => {
    h.emit(feet(h).x, feet(h).y - 12, { count: 30, colors: [...WOOD, ...LEAF, ...DIRT], speed: [1.5, 4.5], angle: -Math.PI / 2, spread: 1, gravity: 0.18, size: 3, life: [18, 30] });
    crater(h, feet(h).x, feet(h).y, 1.2, 'ShockWave_3');
    land(h, { kb: 16, shake: 18, stop: 9, flash: 0.5, color: 0xD9F99D, colors: [...LEAF, ...WOOD, BONE] });
  });
  tl.end(132);
};

const treantIronwood: MoveFn = (h, tl) => {
  tl.at(0, () => h.anim('Skill_A'));
  const shards = 10;
  for (let i = 0; i < shards; i++) {
    const a = (i / shards) * Math.PI * 2;
    drawSpan(h, tl, 4 + i, 28 + i, (g, t) => {
      const p = h.pos();
      const r = lerp(60, 18, easeOut(t));
      const x = p.x + Math.cos(a) * r;
      const y = p.y - h.height * 0.5 + Math.sin(a) * r * 0.8;
      g.poly([x - 4, y - 5, x + 4, y - 4, x + 3, y + 5, x - 4, y + 4]).fill({ color: WOOD[1] }).stroke({ width: 1, color: INK });
      g.rect(x - 1, y - 3, 1, 6).fill({ color: 0x9CA3AF });
    });
  }
  guard(h, tl, 18, [...WOOD, 0x9CA3AF], (g, cx, cy, grow, fade, f) => {
    hexWard(g, cx, cy, 46 * grow, 0, 0x92400E, 0xD6D3D1, fade);
  });
  tl.at(30, () => h.tint(0xC9B49A));
  tl.at(64, () => h.tint(0xFFFFFF));
  tl.end(70);
};

const treantSeedMeteor: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('Jump_Spawn');
    h.camera(1.06, 213, 120, 120);
  });
  // A colossal leap: the treant vanishes skyward, the canopy shakes loose its seed-pods
  tl.during(4, 22, (t) => h.lift(easeIn(t) * 220));
  tl.at(4, () => {
    h.shockwave(h.home.x, h.home.y, 0x4D7C0F);
    dustAtFeet(h, 12, -1);
    dustAtFeet(h, 12, 1);
    h.sound('swing');
  });
  dimSpan(h, tl, 10, 120, 0.35, 0x052E16);
  tl.every(20, 80, 2, () => h.emit(rand(60, 400), 50, { count: 1, colors: LEAF, speed: [0.5, 1], angle: Math.PI / 2, spread: 0.6, gravity: 0.02, size: 2, life: [50, 70] }));
  const pods = [{ dx: -34, f: 40 }, { dx: 30, f: 48 }, { dx: -10, f: 56 }, { dx: 14, f: 64 }];
  pods.forEach(({ dx, f }) => {
    drawSpan(h, tl, f - 14, f, (g, t) => fx.groundRing(g, h.knight.x + 6 + dx, h.knight.y + 1, 12 + 6 * t, 1.5, LEAF[2], 0.4 + 0.6 * t), 'ground');
    drawSpan(h, tl, f - 14, f, (g, t) => {
      const x = h.knight.x + 6 + dx;
      const y = lerp(30, h.knight.y - 8, easeIn(t));
      g.ellipse(x, y, 7, 9).fill({ color: WOOD[1] }).stroke({ width: 2, color: INK });
      g.ellipse(x, y - 8, 8, 4).fill({ color: WOOD[3] }).stroke({ width: 1, color: INK });
    });
    tl.at(f, () => {
      h.emit(h.knight.x + 6 + dx, h.knight.y - 6, { count: 18, colors: [...WOOD, ...LEAF, ...DIRT], speed: [1.2, 3.5], angle: -Math.PI / 2, spread: 1.2, gravity: 0.2, size: 3, life: [14, 24] });
      h.shockwave(h.knight.x + 6 + dx, h.knight.y, 0x65A30D);
      crater(h, h.knight.x + 6 + dx, h.knight.y, 0.8, 'ShockWave_3');
      h.shake(7);
      h.sound('hit');
      if (Math.abs(dx) < 20) h.knightHit(5);
    });
  });
  // Then the treant itself lands on top
  const over = contact(h, 20);
  tl.at(70, () => {
    h.offset(over.x, over.y);
    h.camera(1.24, h.knight.x + 10, h.knight.y - 40, 40);
  });
  warnRing(h, tl, 70, 86, BLOOD, 30);
  tl.during(80, 88, (t) => h.lift(lerp(220, 0, easeIn(t))));
  tl.at(88, () => {
    h.stretch(1.2, 0.85);
    h.emit(feet(h).x, feet(h).y - 6, { count: 34, colors: [...DIRT, ...LEAF], speed: [1.5, 4.5], angle: -Math.PI / 2, spread: 1.3, gravity: 0.2, size: 3, life: [16, 28] });
    crater(h, feet(h).x, feet(h).y, 1.5, 'ShockWave_2');
    land(h, { kb: 18, shake: 20, stop: 10, flash: 0.45, colors: [...LEAF, ...WOOD, BONE], ring: 0x4D7C0F });
  });
  tl.during(88, 98, (t) => h.stretch(lerp(1.2, 1, t), lerp(0.85, 1, t)));
  tl.at(104, () => h.anim('Run', true));
  retreat(h, tl, 104, 130, over, 20);
  tl.at(130, () => h.idle());
  tl.end(132);
};

// ---------------------------------------------------------------------------------------------
// INFERNO TITAN: a colossus of flame wearing skulls. Molten everything.

const titanMagmaHammer: MoveFn = (h, tl) => {
  const c = contact(h, 50);
  tl.at(0, () => h.anim('2_2Run', true));
  travel(h, tl, 0, 24, { x: 0, y: 0 }, c, easeInOut);
  tl.every(2, 24, 8, () => {
    h.shake(4);
    h.emit(h.pos().x, h.pos().y - 2, { count: 4, colors: MAGMA, speed: [0.5, 1.5], angle: -Math.PI / 2, spread: 0.8, gravity: 0.1, size: 2, life: [12, 20] });
  });
  tl.at(24, () => {
    h.anim('3_Kill');
    h.camera(1.2, h.knight.x + 20, h.knight.y - 40, 70);
  });
  chargeTint(h, tl, 24, 58, 0xFFC48A, 0.7);
  flame(h, tl, 24, 38, () => crown(h, 0.8, -22), 0.8);
  tl.at(54, () => h.sound('swing'));
  tl.at(62, () => {
    h.emit(feet(h).x + 6, feet(h).y - 6, { count: 34, colors: MAGMA, speed: [1.5, 4.5], angle: -Math.PI / 2, spread: 1.2, gravity: 0.15, size: 3, life: [16, 28] });
    h.shockwave(feet(h).x, feet(h).y, EMBER);
    crater(h, feet(h).x, feet(h).y, 1.4, 'ShockWave_2');
    boom(h, feet(h).x + 4, feet(h).y - 20, 1.2);
    land(h, { kb: 18, shake: 18, stop: 9, flash: 0.55, color: EMBER, colors: [...MAGMA, BONE], ring: GOLD });
  });
  drawSpan(h, tl, 62, 76, (g, t) => fx.starburst(g, chest(h).x + 6, chest(h).y - 6, 36 * easeOut(t), 9, 0.4, fx.pal(EMBER, GOLD), 1 - t));
  puddle(h, tl, 62, 130, 30, 0x7F1D1D, EMBER);
  tl.at(96, () => h.anim('2_2Run', true));
  retreat(h, tl, 96, 124, c);
  tl.at(124, () => h.idle());
  tl.end(130);
};

const titanApocalypse: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('4_Summon');
    h.camera(1.2, h.home.x, h.home.y - 40, 40);
    h.sound('level_up');
  });
  dimSpan(h, tl, 0, 160, 0.6, 0x2A0A0A);
  tremble(h, tl, 10, 50, { x: 0, y: 0 }, 1.5, 3);
  tl.every(10, 140, 3, () => h.shake(3));
  tl.at(40, () => h.camera(1.02, 213, 130, 100));
  // The floor splits open across the whole arena
  const cracks = [{ y: -8, s: 2 }, { y: 0, s: 3 }, { y: 8, s: 5 }];
  drawSpan(h, tl, 40, 140, (g, t, f) => {
    const grow = easeOut(Math.min(1, f / 30));
    const fade = f > 84 ? 1 - (f - 84) / 16 : 1;
    for (const c of cracks) fissure(g, 420, h.knight.y + c.y, 20, h.knight.y + c.y * 0.6, grow, EMBER, GOLD, fade, c.s);
    g.rect(0, h.knight.y - 10, 426, 20).fill({ color: BLOOD, alpha: 0.18 * grow * fade });
  }, 'ground');
  // Lava geysers erupt everywhere, the last right under the knight
  const geysers = [{ x: 380, f: 60 }, { x: 60, f: 66 }, { x: 250, f: 72 }, { x: 190, f: 80 }, { x: 320, f: 86 }];
  geysers.forEach(({ x, f }) => {
    drawSpan(h, tl, f, f + 26, (g, t, ff) => {
      const hgt = (ff < 5 ? easeOut(ff / 5) : Math.max(0, 1 - (ff - 5) / 20)) * 90;
      const y = h.knight.y;
      g.poly([x - 12, y, x - 6, y - hgt, x + 6, y - hgt, x + 12, y]).fill({ color: BLOOD, alpha: 0.65 });
      g.poly([x - 8, y, x - 3, y - hgt * 0.95, x + 3, y - hgt * 0.95, x + 8, y]).fill({ color: EMBER });
      g.rect(x - 1.5, y - hgt * 0.9, 3, hgt * 0.9).fill({ color: GOLD });
    });
    tl.at(f, () => h.emit(x, h.knight.y - 10, { count: 12, colors: MAGMA, speed: [1.5, 4], angle: -Math.PI / 2, spread: 0.4, gravity: 0.15, size: 3, life: [18, 28] }));
  });
  [70, 84].forEach((f) => tl.at(f, () => chip(h, MAGMA, 6, 8)));
  geysers.forEach(({ x, f }) => tl.at(f, () => crater(h, x, h.knight.y, 1, 'ShockWave_2')));
  flame(h, tl, 96, 34, () => ({ x: feet(h).x, y: h.knight.y - 24 }), 1.4);
  tl.at(98, () => boom(h, feet(h).x, h.knight.y - 20, 1.7));
  // The sea of lava swallows the knight
  drawSpan(h, tl, 96, 132, (g, t, f) => {
    const x = feet(h).x;
    const hgt = (f < 6 ? easeOut(f / 6) : Math.max(0, 1 - (f - 6) / 26)) * 140;
    const y = h.knight.y;
    g.poly([x - 26, y, x - 14, y - hgt, x + 14, y - hgt, x + 26, y]).fill({ color: BLOOD, alpha: 0.7 });
    g.poly([x - 18, y, x - 8, y - hgt * 0.95, x + 8, y - hgt * 0.95, x + 18, y]).fill({ color: EMBER });
    g.rect(x - 4, y - hgt * 0.9, 8, hgt * 0.9).fill({ color: GOLD });
    g.circle(x, y - hgt, 14).fill({ color: EMBER, alpha: 0.8 });
  });
  tl.at(98, () => land(h, { kb: 20, shake: 24, stop: 12, flash: 0.85, color: EMBER, zoom: 1.24, colors: [...MAGMA, BONE], ring: GOLD }));
  tl.at(140, () => h.idle());
  tl.end(162);
};

const titanIgneous: MoveFn = (h, tl) => {
  tl.at(0, () => h.anim('4_Summon'));
  tl.during(0, 20, (t, f) => h.tint(f % 6 < 3 ? 0x6B6B6B : 0xFFFFFF));
  tl.at(20, () => h.tint(0x8A7A7A));
  guard(h, tl, 6, [0x1C1917, 0x44403C, EMBER], (g, cx, cy, grow, fade, f) => {
    // Obsidian plates with molten seams
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + f * 0.01;
      const r = lerp(70, 34, grow);
      const x = cx + Math.cos(a) * r * 0.8;
      const y = cy + Math.sin(a) * r;
      g.poly([x - 7, y - 6, x + 7, y - 8, x + 8, y + 6, x - 6, y + 8]).fill({ color: 0x1C1917, alpha: fade }).stroke({ width: 1.5, color: EMBER, alpha: fade });
    }
  });
  tl.at(60, () => h.tint(0xFFFFFF));
  tl.end(64);
};

const titanSkullPyre: MoveFn = (h, tl) => {
  const centre = () => crown(h, 0.75, 0);
  const skull = (g: Graphics, x: number, y: number, r: number) => {
    g.circle(x + 2, y - 2, r + 4).fill({ color: EMBER, alpha: 0.35 });
    g.circle(x, y, r).fill({ color: BONE }).stroke({ width: 1.5, color: INK });
    g.rect(x - r * 0.6, y - r * 0.2, r * 0.45, r * 0.45).fill({ color: EMBER });
    g.rect(x + r * 0.1, y - r * 0.2, r * 0.45, r * 0.45).fill({ color: EMBER });
    g.rect(x - r * 0.4, y + r * 0.55, r * 0.8, r * 0.3).fill({ color: INK });
  };
  tl.at(0, () => {
    h.anim('4_Summon');
    h.camera(1.18, h.home.x, h.home.y - 40, 50);
    h.sound('level_up');
  });
  dimSpan(h, tl, 0, 120, 0.45, 0x2A0A0A);
  // Five burning skulls orbit the titan
  const n = 5;
  const launch = [56, 62, 68, 74, 80];
  for (let i = 0; i < n; i++) {
    const phase = (i / n) * Math.PI * 2;
    let orbitPos = { x: 0, y: 0 };
    drawSpan(h, tl, 10, launch[i], (g, t, f) => {
      const c = centre();
      const a = phase + f * 0.1;
      const r = 36 * easeOut(Math.min(1, f / 16));
      orbitPos = { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r * 0.5 };
      skull(g, orbitPos.x, orbitPos.y, 5);
    });
    tl.every(14, launch[i], 3, () => h.emit(orbitPos.x, orbitPos.y, { count: 1, colors: FIRE, speed: [0.2, 0.6], angle: -Math.PI / 2, spread: 0.5, gravity: -0.04, size: 2, life: [10, 16] }));
    const last = i === n - 1;
    projectile(h, tl, launch[i], 16, () => orbitPos, () => ({ x: chest(h).x + rand(-4, 4), y: chest(h).y + (i - 2) * 6 }), 20,
      (g, x, y) => skull(g, x, y, last ? 7 : 5),
      () => {
        h.emit(chest(h).x, chest(h).y, { count: last ? 30 : 10, colors: [...FIRE, BONE], speed: [1, 3.5], spread: Math.PI, gravity: -0.02, size: 3, life: [12, 22] });
        boom(h, chest(h).x, chest(h).y, last ? 1.3 : 0.7);
        if (!last) chip(h, FIRE, 4, 6);
        else land(h, { kb: 14, shake: 15, stop: 7, flash: 0.5, color: EMBER, zoom: 1.24, colors: [...FIRE, BONE], ring: EMBER });
      },
      (x, y) => h.emit(x + 4, y, { count: 2, colors: FIRE, speed: [0.3, 0.8], angle: 0, spread: 0.6, gravity: -0.04, size: 3, life: [10, 16] }));
    tl.at(launch[i], () => h.sound('swing'));
  }
  tl.at(110, () => h.idle());
  tl.end(122);
};

// ---------------------------------------------------------------------------------------------
// MAGMA DRAGON: the scorched wyrm. Tail, breath, scales and a sky full of fire.

const dragonMaw = (h: MoveHost) => crown(h, 0.75, -34);

const dragonTailWhip: MoveFn = (h, tl) => {
  const c = contact(h, 56);
  tl.at(0, () => {
    h.anim('idle2');
    h.camera(1.14, (h.home.x + h.knight.x) / 2, h.knight.y - 30, 70);
  });
  travel(h, tl, 0, 20, { x: 0, y: 0 }, c, easeInOut);
  tl.every(0, 20, 6, () => h.shake(3));
  // Turns, the spiked tail whips round low and trails sparks
  tl.at(22, () => {
    h.stretch(-1, 1);
    h.sound('swing');
  });
  drawSpan(h, tl, 26, 44, (g, t) => {
    const p = feet(h);
    fx.crescent(g, p.x + 24, p.y - 14, 44, Math.PI * 0.1, Math.PI * (0.1 + 0.9 * easeOut(t)), 12, fx.pal(EMBER, GOLD), 1 - t * 0.6);
  });
  tl.every(26, 40, 1, () => h.emit(feet(h).x + rand(-20, 30), feet(h).y - rand(0, 30), { count: 2, colors: MAGMA, speed: [1, 3], angle: Math.PI, spread: 0.6, gravity: 0.1, size: 2, life: [12, 20] }));
  tl.at(28, () => blaze(h, feet(h).x + 22, feet(h).y - 18, 1.7, true));
  tl.at(32, () => land(h, { kb: 20, shake: 16, stop: 8, flash: 0.45, color: EMBER, zoom: 1.24, colors: [...MAGMA, BONE], ring: EMBER, at: { x: feet(h).x, y: feet(h).y - 14 } }));
  tl.at(48, () => h.stretch(1, 1));
  retreat(h, tl, 52, 80, c);
  tl.end(82);
};

const dragonInfernoBreath: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('open');
    h.camera(1.25, dragonMaw(h).x, dragonMaw(h).y, 40);
  });
  // A deep inhale pulling embers from the whole arena
  tl.every(0, 44, 1, () => {
    const m = dragonMaw(h);
    const a = rand(-Math.PI, Math.PI);
    h.emit(m.x + Math.cos(a) * 60, m.y + Math.sin(a) * 40, { count: 1, colors: FIRE, speed: [2.6, 3.2], angle: a + Math.PI, spread: 0.05, gravity: 0, size: 2, life: [18, 22] });
  });
  chargeTint(h, tl, 10, 44, 0xFFC48A, 0.8);
  tremble(h, tl, 20, 44, { x: 0, y: 0 }, 1.2, 3);
  tl.at(44, () => {
    h.anim('attack');
    h.sound('crit');
    h.camera(1.05, 213, 130, 80);
  });
  dimSpan(h, tl, 40, 130, 0.45, 0x2A0A0A);
  // Cataclysmic breath cone, sweeping slightly
  drawSpan(h, tl, 48, 112, (g, t, f) => {
    const m = dragonMaw(h);
    const e = chest(h);
    const reach = easeOut(Math.min(1, f / 8));
    const ex = lerp(m.x, e.x - 30, reach);
    const ey = e.y + Math.sin(f * 0.1) * 10;
    const spread = 10 + 30 * reach + Math.sin(f * 1.7) * 3;
    const fade = f > 54 ? 1 - (f - 54) / 10 : 1;
    g.poly([m.x, m.y - 4, ex, ey - spread, ex - 10, ey + spread, m.x, m.y + 4]).fill({ color: BLOOD, alpha: 0.5 * fade });
    g.poly([m.x, m.y - 3, ex, ey - spread * 0.65, ex - 6, ey + spread * 0.6, m.x, m.y + 3]).fill({ color: EMBER, alpha: 0.8 * fade });
    g.poly([m.x, m.y - 1.5, ex, ey - spread * 0.3, ex - 3, ey + spread * 0.25, m.x, m.y + 1.5]).fill({ color: GOLD, alpha: 0.95 * fade });
    // Billowing flame tongues along the cone and a rolling fireball front
    for (let k = 1; k <= 6; k++) {
      const u = k / 6;
      const bx = lerp(m.x, ex, u);
      const by = lerp(m.y, ey, u) + Math.sin(f * 0.9 + k * 1.7) * spread * 0.35 * u;
      const r = 3 + spread * 0.45 * u;
      g.circle(bx, by, r).fill({ color: k % 2 ? EMBER : BLOOD, alpha: 0.55 * fade });
      g.circle(bx, by, r * 0.5).fill({ color: GOLD, alpha: 0.8 * fade });
    }
    g.circle(ex - 2, ey, spread * 0.45).fill({ color: EMBER, alpha: 0.45 * fade });
  });
  tl.every(48, 108, 1, () => {
    const m = dragonMaw(h);
    const e = chest(h);
    h.emit(m.x, m.y, { count: 3, colors: FIRE, speed: [5, 8], angle: Math.atan2(e.y - m.y, e.x - m.x), spread: 0.22, gravity: -0.05, size: 4, life: [16, 22] });
    h.shake(4);
  });
  [60, 74, 88].forEach((f) => tl.at(f, () => chip(h, FIRE, 4, 7)));
  flame(h, tl, 56, 56, () => chest(h), 1.3);
  tl.at(102, () => boom(h, chest(h).x, chest(h).y, 1.5));
  tl.at(102, () => land(h, { kb: 18, shake: 18, stop: 8, flash: 0.6, color: EMBER, colors: [...FIRE, BONE], ring: GOLD }));
  puddle(h, tl, 70, 150, 40, 0x1C1917, EMBER);
  tl.every(108, 140, 3, () => h.emit(chest(h).x + rand(-14, 14), chest(h).y, { count: 2, colors: SMOKE, speed: [0.3, 0.7], angle: -Math.PI / 2, spread: 0.4, gravity: -0.03, size: 5, life: [26, 40] }));
  tl.end(150);
};

const dragonScales: MoveFn = (h, tl) => {
  tl.at(0, () => h.anim('idle2'));
  guard(h, tl, 4, MAGMA, (g, cx, cy, grow, fade, f) => {
    // Scales flare open in rows of glowing plates
    for (let row = 0; row < 3; row++) {
      for (let k = 0; k < 6; k++) {
        const x = cx - 30 + k * 12 + (row % 2) * 6;
        const y = cy - 16 + row * 14;
        const s = 7 * grow;
        g.poly([x, y - s, x + s * 0.8, y, x, y + s * 0.7, x - s * 0.8, y]).fill({ color: row % 2 ? 0x7F1D1D : 0x9A3412, alpha: 0.8 * fade }).stroke({ width: 1, color: GOLD, alpha: fade });
      }
    }
  });
  tl.at(16, () => {
    h.emit(h.pos().x, h.pos().y - h.height * 0.5, { count: 20, colors: MAGMA, speed: [1, 3], spread: Math.PI, gravity: -0.03, size: 2, life: [14, 22] });
  });
  tl.end(62);
};

const dragonMeteorStorm: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('open');
    h.camera(1.15, h.home.x, h.home.y - 40, 26);
    h.sound('level_up');
  });
  // Takes wing, shaking the arena with each beat
  tl.during(10, 36, (t) => h.lift(easeIn(t) * 220));
  tl.every(10, 36, 6, () => {
    h.shake(5);
    dustAtFeet(h, 8, -1);
    dustAtFeet(h, 8, 1);
  });
  tl.at(36, () => h.camera(1.03, 213, 120, 110));
  dimSpan(h, tl, 20, 150, 0.55, 0x2A0A0A);
  // Meteors rain in a tightening pattern
  const falls = [{ dx: -44, f: 50 }, { dx: 40, f: 56 }, { dx: -18, f: 62 }, { dx: 24, f: 68 }, { dx: -4, f: 76 }, { dx: 6, f: 86 }];
  falls.forEach(({ dx, f }, i) => {
    const last = i === falls.length - 1;
    const tx = () => h.knight.x + 6 + dx;
    drawSpan(h, tl, f - 14, f + 4, (g, t) => fx.groundRing(g, tx(), h.knight.y + 1, 10 + 6 * t, 1.5, EMBER, 0.4 + 0.6 * t), 'ground');
    drawSpan(h, tl, f - 12, f, (g, t) => meteor(g, tx(), h.knight.y - 6, easeIn(t), last ? 10 : 7));
    tl.at(f, () => {
      h.emit(tx(), h.knight.y - 6, { count: last ? 40 : 20, colors: [...MAGMA, 0x1C1917], speed: [1.5, 4.5], angle: -Math.PI / 2, spread: 1.2, gravity: 0.18, size: 3, life: [14, 26] });
      h.shockwave(tx(), h.knight.y, EMBER);
      boom(h, tx(), h.knight.y - 8, last ? 1.6 : 1);
      crater(h, tx(), h.knight.y, last ? 1.4 : 0.9, 'ShockWave_2');
      if (!last) {
        h.shake(8);
        h.sound('hit');
        if (Math.abs(dx) < 26) h.knightHit(5);
      } else land(h, { kb: 18, shake: 20, stop: 10, flash: 0.7, color: EMBER, zoom: 1.24, colors: [...MAGMA, BONE], ring: GOLD });
    });
    drawSpan(h, tl, f, f + 60, (g, t) => fx.scorch(g, tx(), h.knight.y + 1, last ? 20 : 12, EMBER, 1 - t), 'ground');
  });
  // Returns to its perch
  tl.during(104, 130, (t) => h.lift(lerp(220, 0, easeInOut(t))));
  tl.at(130, () => {
    h.shockwave(h.home.x, h.home.y, EMBER);
    h.shake(8);
  });
  tl.end(152);
};

export const TITAN_MOVES = {
  golem_stone_hammer: golemStoneHammer,
  golem_earthquake: golemEarthquake,
  golem_granite_skin: golemGraniteSkin,
  golem_crystal_barrage: golemCrystalBarrage,

  vault_iron_cleaver: vaultIronCleaver,
  vault_core_discharge: vaultCoreDischarge,
  vault_aegis_lockdown: vaultAegisLockdown,
  vault_piston_slam: vaultPistonSlam,

  garg_talon: gargTalon,
  garg_rampart_dive: gargRampartDive,
  garg_stone_form: gargStoneForm,
  garg_rubble_hurl: gargRubbleHurl,

  treant_elder_bough: treantElderBough,
  treant_forest_wrath: treantForestWrath,
  treant_ironwood: treantIronwood,
  treant_seed_meteor: treantSeedMeteor,

  titan_magma_hammer: titanMagmaHammer,
  titan_apocalypse: titanApocalypse,
  titan_igneous: titanIgneous,
  titan_skull_pyre: titanSkullPyre,

  dragon_tail_whip: dragonTailWhip,
  dragon_inferno_breath: dragonInfernoBreath,
  dragon_scales: dragonScales,
  dragon_meteor_storm: dragonMeteorStorm,
} satisfies Partial<Record<MonsterMoveId, MoveFn>>;
