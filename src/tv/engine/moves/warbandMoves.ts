/**
 * Brutes and champions: Orc Berserker, Troll Warlord, Labyrinth Minotaur, Dark Knight, Dark Emperor,
 * Nightmare Stag. Heavy anticipation, violent release; the bigger they are, the longer the wind-up.
 */
import type { Graphics } from 'pixi.js';
import type { Spine } from '@esotericsoftware/spine-pixi-v8';
import type { MonsterMoveId } from '../../../types/battle';
import { lerp, easeIn, easeOut, easeInOut, arc, rand, INK, BONE, BLOOD, BLOOD_DARK, EMBER, GOLD, DIRT, SHADOW, SMOKE } from '../choreo';
import * as fx from '../fxKit';
import {
  type MoveFn, type MoveHost, contact, chest, head, travel, dustAtFeet, drawSpan, projectile, spike, orb, sigil, retreat,
  crown, feet, land, chip, dimSpan, chargeTint, tremble, puff, blink, warnRing, shoutRings, beam, hexWard, guard, lean,
} from '../monsterKit';

const STEEL = [0xA8A29E, 0xD6D3D1, 0xFFFFFF, 0x78716C];
const RAGE = [BLOOD, 0xFF3366, EMBER, BONE];
const MOSS = [0x4D7C0F, 0x84CC16, 0x365314, 0xBEF264];
const VOID = [0x1E0B33, 0x3B0764, 0x7C3AED, 0xC084FC];
const SPECTRAL = [0x22D3EE, 0x67E8F9, 0xCFFAFE, 0x0E7490];
const ROCK = [0x57534E, 0x78716C, 0xA8A29E, 0x44403C];

/** Big overhead or horizontal weapon arc landing on the knight. */
function cleave(g: Graphics, h: MoveHost, t: number, a0: number, sweep: number, r: number, thick: number, body: number, core = 0xFFFFFF) {
  const p = chest(h);
  fx.crescent(g, p.x + 10, p.y - 4, r, a0, a0 + sweep * easeOut(Math.min(1, t * 2)), thick, fx.pal(body, core), 1 - t * 0.6);
}

/** Debris raining from the ceiling around the knight over [from, to]. */
function ceilingDust(h: MoveHost, tl: Parameters<MoveFn>[1], from: number, to: number, spread = 70) {
  tl.every(from, to, 2, () => h.emit(h.knight.x + rand(-spread, spread), 50, { count: 1, colors: ROCK, speed: [1, 2], angle: Math.PI / 2, spread: 0.2, gravity: 0.18, size: rand(2, 4), life: [24, 34] }));
}

// ---------------------------------------------------------------------------------------------
// ORC BERSERKER

const orcAxeChop: MoveFn = (h, tl) => {
  const c = contact(h, 38);
  tl.at(0, () => h.anim('Run', true));
  travel(h, tl, 0, 18, { x: 0, y: 0 }, c, easeIn);
  tl.every(0, 18, 3, () => dustAtFeet(h, 3, 1));
  tl.at(18, () => h.anim('Attack'));
  lean(h, tl, 18, 34, 0.15, 6); // rear back
  tl.at(34, () => h.sound('swing'));
  tl.during(34, 42, (t) => h.tilt(lerp(0.15, -0.2, easeIn(t))));
  drawSpan(h, tl, 38, 52, (g, t) => cleave(g, h, t, -Math.PI * 0.6, Math.PI * 0.95, 30, 9, 0xA8A29E));
  tl.at(42, () => {
    h.tilt(-0.2);
    land(h, { kb: 12, shake: 13, stop: 6, flash: 0.3, zoom: 1.24, colors: [...STEEL, BLOOD], ring: 0x8B5A2B });
    h.emit(feet(h).x + 10, feet(h).y, { count: 14, colors: DIRT, speed: [1, 3], angle: -Math.PI / 2, spread: 0.9, gravity: 0.2, size: 3, life: [14, 22] });
  });
  tl.during(46, 56, (t) => h.tilt(lerp(-0.2, 0, t)));
  tl.at(60, () => h.anim('Run', true));
  retreat(h, tl, 60, 80, c);
  tl.at(80, () => h.idle());
  tl.end(82);
};

const orcBloodFrenzy: MoveFn = (h, tl) => {
  const c = contact(h, 36);
  tl.at(0, () => {
    h.anim('Idle', true);
    h.camera(1.25, h.home.x - 10, h.home.y - 34, 30);
    h.sound('level_up');
  });
  // Roar: rage tint, steam, shout rings
  chargeTint(h, tl, 0, 30, 0xFF7070, 0.7);
  tremble(h, tl, 0, 30, { x: 0, y: 0 }, 1.5, 3);
  drawSpan(h, tl, 4, 30, (g, t) => shoutRings(g, crown(h, 0.85).x, crown(h, 0.85).y, t, BLOOD, 3, 60));
  dimSpan(h, tl, 0, 100, 0.4, BLOOD_DARK);
  tl.at(30, () => h.anim('Run', true));
  travel(h, tl, 30, 40, { x: 0, y: 0 }, c, easeIn);
  tl.every(30, 40, 1, () => h.streaks(h.pos().x + 14, h.pos().y - 24, 40, RAGE));
  // Four wild swings from alternating angles
  const swings = [[-0.6, 0.95], [0.6, -0.9], [-0.2, 1.0], [-0.7, 1.2]] as const;
  swings.forEach(([a0, sw], i) => {
    const f = 40 + i * 9;
    tl.at(f, () => {
      h.anim('Attack');
      h.sound('swing');
    });
    lean(h, tl, f, f + 4, i % 2 ? 0.12 : -0.18, 4);
    drawSpan(h, tl, f + 2, f + 12, (g, t) => cleave(g, h, t, Math.PI * a0, Math.PI * sw, 26 + i * 2, 7, i % 2 ? BLOOD : 0xA8A29E));
    tl.at(f + 4, () => (i < 3 ? chip(h, [...RAGE, ...STEEL], 4, 6) : land(h, { kb: 16, shake: 15, stop: 7, flash: 0.5, color: BLOOD, zoom: 1.3, colors: [...RAGE, ...STEEL] })));
  });
  tl.at(84, () => h.anim('Run', true));
  retreat(h, tl, 84, 104, c);
  tl.at(104, () => h.idle());
  tl.end(106);
};

const orcWarCrySlam: MoveFn = (h, tl) => {
  const land0 = contact(h, 30);
  tl.at(0, () => {
    h.camera(1.2, h.home.x - 10, h.home.y - 34, 22);
    h.sound('level_up');
  });
  drawSpan(h, tl, 0, 24, (g, t) => shoutRings(g, crown(h, 0.85).x, crown(h, 0.85).y, t, 0xFDE047, 3, 70));
  tl.every(0, 24, 4, () => h.shake(3));
  tl.at(24, () => h.anim('Attack'));
  travel(h, tl, 26, 44, { x: 0, y: 0 }, land0, easeInOut, 70);
  tl.at(30, () => h.camera(1.15, (h.home.x + h.knight.x) / 2, h.knight.y - 50, 30));
  warnRing(h, tl, 26, 44, EMBER);
  tl.at(44, () => {
    h.stretch(1.2, 0.85);
    dustAtFeet(h, 12, -1);
    dustAtFeet(h, 12, 1);
    h.shockwave(h.pos().x, h.pos().y, 0x8B5A2B);
    h.shockwave(h.pos().x, h.pos().y, 0xFDE047);
    land(h, { kb: 16, shake: 16, stop: 7, flash: 0.4, zoom: 1.28, colors: [...DIRT, BONE] });
  });
  // Cracked earth spokes under the impact
  drawSpan(h, tl, 44, 90, (g, t) => {
    const p = h.pos();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3;
      g.moveTo(p.x, p.y).lineTo(p.x + Math.cos(a) * 36, p.y + Math.sin(a) * 8).stroke({ width: 2, color: INK, alpha: 1 - t });
    }
  }, 'ground');
  tl.during(44, 54, (t) => h.stretch(lerp(1.2, 1, t), lerp(0.85, 1, t)));
  tl.at(60, () => h.anim('Run', true));
  retreat(h, tl, 60, 82, land0, 20);
  tl.at(82, () => h.idle());
  tl.end(92);
};

const orcAxeThrow: MoveFn = (h, tl) => {
  const hand = () => crown(h, 0.8, -8);
  const axe = (g: Graphics, x: number, y: number, rot: number) => {
    const hx = Math.cos(rot) * 14;
    const hy = Math.sin(rot) * 14;
    g.moveTo(x - hx, y - hy).lineTo(x + hx, y + hy).stroke({ width: 4, color: INK }).moveTo(x - hx, y - hy).lineTo(x + hx, y + hy).stroke({ width: 2, color: 0x78350F });
    const bx = x + hx;
    const by = y + hy;
    const px = -Math.sin(rot) * 11;
    const py = Math.cos(rot) * 11;
    g.poly([bx, by, bx + px + hx * 0.4, by + py + hy * 0.4, bx + px - hx * 0.3, by + py - hy * 0.3]).fill({ color: 0xD6D3D1 }).stroke({ width: 1.5, color: INK });
  };
  tl.at(0, () => {
    h.anim('Attack');
    h.camera(1.15, h.home.x - 20, h.home.y - 30, 24);
  });
  lean(h, tl, 0, 22, 0.25, 6);
  tl.at(28, () => {
    h.sound('swing');
    h.camera(1.1, (h.home.x + h.knight.x) / 2, h.knight.y - 40, 60);
  });
  // Out: a spinning arc to the knight
  let spin = 0;
  projectile(h, tl, 28, 18, hand, () => chest(h), 30,
    (g, x, y) => {
      spin += 0.6;
      axe(g, x, y, spin);
      fx.crescent(g, x, y, 18, spin, spin + 2.4, 4, fx.pal(0xD6D3D1, 0xFFFFFF), 0.5);
    },
    () => land(h, { kb: 12, shake: 12, stop: 6, flash: 0.3, zoom: 1.22, colors: [...STEEL, BLOOD], sound: 'crit' }));
  tl.every(32, 46, 6, () => h.sound('swing'));
  // Back: boomerangs home low over the floor
  projectile(h, tl, 48, 22, () => chest(h), hand, -24,
    (g, x, y) => {
      spin += 0.6;
      axe(g, x, y, spin);
    }, () => {
      h.anim('Attack');
      h.sparks(hand().x, hand().y, 6, STEEL);
      h.sound('equip');
    });
  tl.end(80);
};

// ---------------------------------------------------------------------------------------------
// TROLL WARLORD: a regenerating brute with a tree-trunk club.

const trollBurlClub: MoveFn = (h, tl) => {
  const c = contact(h, 46);
  tl.at(0, () => h.anim('Run', true));
  travel(h, tl, 0, 24, { x: 0, y: 0 }, c, easeInOut);
  tl.every(0, 24, 8, () => {
    h.shake(3);
    dustAtFeet(h, 4, 1);
  });
  tl.at(24, () => {
    h.anim('Attack01');
    h.camera(1.2, h.knight.x + 16, h.knight.y - 30, 40);
  });
  lean(h, tl, 24, 44, 0.12, 4);
  tl.at(46, () => h.sound('swing'));
  // Horizontal home-run swing
  drawSpan(h, tl, 46, 60, (g, t) => cleave(g, h, t, Math.PI * 1.05, -Math.PI * 0.75, 38, 12, 0x78350F, 0xD6A15A));
  tl.at(50, () => {
    h.emit(chest(h).x, chest(h).y, { count: 16, colors: [...MOSS, 0x78350F], speed: [1.5, 3.5], angle: Math.PI, spread: 0.6, gravity: 0.12, size: 3, life: [16, 28] });
    land(h, { kb: 22, shake: 15, stop: 7, flash: 0.35, colors: [...MOSS, BONE] });
  });
  tl.at(68, () => h.anim('Run', true));
  retreat(h, tl, 68, 94, c);
  tl.at(94, () => h.idle());
  tl.end(96);
};

const trollBerserkFlail: MoveFn = (h, tl) => {
  const c = contact(h, 38);
  tl.at(0, () => {
    h.anim('Idle', true);
    h.camera(1.24, h.home.x, h.home.y - 36, 30);
    h.sound('level_up');
  });
  // Beats its chest
  tl.every(0, 28, 7, () => {
    h.stretch(1.06, 0.95);
    h.shake(4);
    h.sound('hit');
    h.emit(h.pos().x - 6, h.pos().y - h.height * 0.6, { count: 4, colors: MOSS, speed: [0.5, 1.5], spread: Math.PI, gravity: 0.1, size: 2, life: [10, 16] });
  });
  tl.every(3, 28, 7, () => h.stretch(1, 1));
  chargeTint(h, tl, 10, 30, 0xFF9A9A, 0.8);
  dimSpan(h, tl, 10, 120, 0.4, BLOOD_DARK);
  tl.at(30, () => h.anim('Run', true));
  travel(h, tl, 30, 42, { x: 0, y: 0 }, c, easeIn);
  // Five flailing blows: fists and club, alternating overhead and sideways
  for (let i = 0; i < 5; i++) {
    const f = 44 + i * 9;
    tl.at(f, () => h.anim('Attack01'));
    lean(h, tl, f, f + 3, i % 2 ? 0.2 : -0.22, 4);
    tl.during(f, f + 6, (t) => h.offset(c.x - arc(t) * 8, c.y));
    drawSpan(h, tl, f + 2, f + 10, (g, t) => {
      const p = chest(h);
      fx.starburst(g, p.x + rand(-6, 6), p.y + (i - 2) * 6, 16 * easeOut(t), 6, i, fx.pal(i % 2 ? 0x78350F : BLOOD, BONE), 1 - t);
    });
    tl.at(f + 3, () => (i < 4 ? chip(h, [...MOSS, BLOOD, BONE], 4, 7) : land(h, { kb: 20, shake: 18, stop: 8, flash: 0.5, color: BLOOD, zoom: 1.32, colors: [...MOSS, BLOOD, BONE], ring: 0x78350F })));
  }
  tl.at(96, () => h.anim('Run', true));
  retreat(h, tl, 96, 120, c);
  tl.at(120, () => h.idle());
  tl.end(122);
};

const trollRegrowth: MoveFn = (h, tl) => {
  tl.at(0, () => h.anim('Hit'));
  chargeTint(h, tl, 4, 44, 0xB6F09C, 0.5);
  tl.every(4, 44, 2, () => {
    const p = h.pos();
    h.emit(p.x + rand(-16, 16), p.y - rand(4, h.height), { count: 1, colors: [0x86EFAC, 0xBEF264, 0xFFFFFF], speed: [0.3, 0.8], angle: -Math.PI / 2, spread: 0.3, gravity: -0.03, size: 2, life: [16, 26] });
  });
  guard(h, tl, 6, [...MOSS, 0xFFFFFF], (g, cx, cy, grow, fade, f) => {
    // Flesh knits in green pulses
    for (let k = 0; k < 3; k++) {
      const r = ((f * 1.2 + k * 14) % 42) * grow;
      g.ellipse(cx, cy, r, r * 1.2).stroke({ width: 2, color: 0x86EFAC, alpha: (1 - r / 42) * fade });
    }
  });
  tl.at(28, () => h.text('+REGEN', h.pos().x, h.pos().y - h.height - 6, 0x86EFAC, 8));
  tl.end(62);
};

const trollBoulderToss: MoveFn = (h, tl) => {
  const over = () => crown(h, 1.25, 0);
  const boulder = (g: Graphics, x: number, y: number, r: number, rot: number) => {
    const pts: number[] = [];
    for (let k = 0; k < 8; k++) {
      const a = rot + (k / 8) * Math.PI * 2;
      const rr = r * (0.85 + 0.15 * ((k * 37) % 5) / 4);
      pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.poly(pts).fill({ color: ROCK[1] }).stroke({ width: 2, color: INK });
    g.circle(x - r * 0.3, y - r * 0.3, r * 0.4).fill({ color: ROCK[2] });
    g.ellipse(x + r * 0.2, y - r * 0.5, r * 0.5, r * 0.25).fill({ color: MOSS[0] });
  };
  tl.at(0, () => {
    h.anim('Attack01');
    h.camera(1.18, h.home.x, h.home.y - 40, 40);
  });
  // Rips a boulder from the earth and hoists it
  tl.at(6, () => {
    h.emit(h.home.x - 10, h.home.y - 2, { count: 16, colors: DIRT, speed: [1, 2.5], angle: -Math.PI / 2, spread: 0.8, gravity: 0.2, size: 3, life: [14, 22] });
    h.shake(6);
    h.sound('hit');
  });
  drawSpan(h, tl, 6, 36, (g, t) => {
    const p = over();
    const y = lerp(h.home.y - 10, p.y, easeOut(t));
    boulder(g, lerp(h.home.x - 10, p.x, t), y, 14, 0);
  });
  tl.during(6, 36, (t) => h.stretch(1 + 0.05 * t, 1 - 0.06 * t));
  warnRing(h, tl, 30, 62, EMBER, 28);
  tl.at(36, () => {
    h.stretch(1, 1);
    h.sound('swing');
    h.camera(1.1, (h.home.x + h.knight.x) / 2, h.knight.y - 50, 40);
  });
  let rot = 0;
  projectile(h, tl, 38, 24, over, () => ({ x: h.knight.x + 8, y: h.knight.y - 18 }), 60,
    (g, x, y) => {
      rot += 0.2;
      boulder(g, x, y, 14, rot);
    },
    () => {
      const p = feet(h);
      h.emit(p.x, p.y - 10, { count: 34, colors: [...ROCK, ...DIRT, ...MOSS], speed: [1.5, 4.5], angle: -Math.PI / 2, spread: 1.3, gravity: 0.2, size: 3, life: [16, 30] });
      land(h, { kb: 18, shake: 17, stop: 8, flash: 0.4, zoom: 1.28, colors: [...ROCK, BONE], ring: 0x78716C });
    });
  tl.end(96);
};

// ---------------------------------------------------------------------------------------------
// LABYRINTH MINOTAUR

const minoHornGore: MoveFn = (h, tl) => {
  const c = contact(h, 40);
  tl.at(0, () => h.anim('idle', true));
  // Head lowered, hoof scrape
  lean(h, tl, 0, 14, -0.15, 0);
  tl.every(0, 14, 4, () => dustAtFeet(h, 3, 1));
  tl.at(14, () => {
    h.anim('quickly');
    h.sound('swing');
  });
  travel(h, tl, 14, 26, { x: 0, y: 0 }, c, easeIn);
  tl.every(14, 26, 1, () => h.streaks(h.pos().x + 18, h.pos().y - 24, 40, [...STEEL, BLOOD]));
  // Upward hook
  tl.during(26, 34, (t) => h.tilt(lerp(-0.15, 0.25, easeOut(t))));
  drawSpan(h, tl, 26, 38, (g, t) => cleave(g, h, t, Math.PI * 0.7, -Math.PI * 1.0, 28, 9, 0xE7D8B0, BONE));
  tl.at(30, () => {
    h.lift(10);
    land(h, { kb: 16, shake: 13, stop: 6, flash: 0.35, zoom: 1.26, colors: [BONE, BLOOD, 0xE7D8B0] });
  });
  tl.during(34, 44, (t) => {
    h.tilt(lerp(0.25, 0, t));
    h.lift(lerp(10, 0, t));
  });
  tl.at(48, () => h.anim('idle', true));
  retreat(h, tl, 48, 70, c);
  tl.end(72);
};

const minoLabyrinthCharge: MoveFn = (h, tl) => {
  const ram = { x: h.knight.x + 16 - h.home.x, y: h.knight.y - h.home.y };
  tl.at(0, () => {
    h.anim('idle', true);
    h.camera(1.28, h.home.x - 10, h.home.y - 34, 46);
  });
  // A long snorting wind-up: steam from the nostrils, hoof scrapes, red tint
  tl.every(0, 46, 6, () => dustAtFeet(h, 4, 1));
  tl.every(4, 46, 10, () => {
    const p = crown(h, 0.55, -26);
    h.emit(p.x, p.y, { count: 4, colors: [0xE7E5E4, 0xA8A29E], speed: [0.5, 1.2], angle: Math.PI + 0.3, spread: 0.3, gravity: -0.03, size: 3, life: [14, 22] });
    h.sound('hit');
  });
  chargeTint(h, tl, 20, 46, 0xFF8A8A, 0.6);
  lean(h, tl, 10, 46, -0.2, 0);
  dimSpan(h, tl, 20, 100, 0.35, BLOOD_DARK);
  tl.at(46, () => {
    h.anim('quickly', true);
    h.sound('swing');
    h.camera(1.12, (h.home.x + h.knight.x) / 2, h.knight.y - 30, 20);
  });
  travel(h, tl, 46, 58, { x: 0, y: 0 }, ram, easeIn);
  tl.every(46, 58, 1, () => {
    h.streaks(h.pos().x + 22, h.pos().y - 26, 60, [...STEEL, BLOOD]);
    dustAtFeet(h, 4, 1);
    h.shake(4);
  });
  tl.at(58, () => {
    h.tilt(0);
    h.shockwave(h.knight.x, h.knight.y, 0xE7D8B0);
    land(h, { kb: 26, shake: 20, stop: 9, flash: 0.7, zoom: 1.34, colors: [BONE, BLOOD, 0xFFFFFF], ring: 0xA8A29E });
  });
  drawSpan(h, tl, 58, 72, (g, t) => fx.starburst(g, chest(h).x, chest(h).y, 40 * easeOut(t), 10, 0.2, fx.pal(BLOOD, 0xFFFFFF), 1 - t));
  travel(h, tl, 60, 70, ram, { x: ram.x + 30, y: ram.y }, easeOut);
  tl.at(76, () => h.anim('idle', true));
  travel(h, tl, 76, 104, { x: ram.x + 30, y: ram.y }, { x: 0, y: 0 }, easeInOut);
  tl.end(106);
};

const minoClubCrush: MoveFn = (h, tl) => {
  const land0 = contact(h, 36);
  tl.at(0, () => {
    h.anim('active1');
    h.camera(1.16, (h.home.x + h.knight.x) / 2, h.knight.y - 50, 60);
  });
  travel(h, tl, 8, 30, { x: 0, y: 0 }, land0, easeInOut, 60);
  tl.during(8, 30, (t) => h.tilt(lerp(0.2, -0.25, t)));
  warnRing(h, tl, 8, 30, EMBER, 24);
  tl.at(30, () => {
    h.tilt(0);
    h.stretch(1.15, 0.88);
    h.shockwave(feet(h).x, feet(h).y, 0x8B5A2B);
    land(h, { kb: 16, shake: 17, stop: 8, flash: 0.4, zoom: 1.3, colors: [...DIRT, BONE] });
  });
  tl.during(30, 40, (t) => h.stretch(lerp(1.15, 1, t), lerp(0.88, 1, t)));
  // Rock spikes thrown up around the crater
  drawSpan(h, tl, 30, 64, (g, t, f) => {
    const up = f < 5 ? easeOut(f / 5) : f > 20 ? 1 - (f - 20) / 14 : 1;
    const x = feet(h).x;
    spike(g, x - 22, h.knight.y + 3, 26 * up, 7, DIRT[0], DIRT[3]);
    spike(g, x + 20, h.knight.y + 3, 30 * up, 7, DIRT[0], DIRT[3]);
    spike(g, x - 6, h.knight.y + 4, 22 * up, 6, DIRT[1], 0xD6A15A);
  });
  tl.at(30, () => h.emit(feet(h).x, feet(h).y - 6, { count: 24, colors: DIRT, speed: [1.5, 4], angle: -Math.PI / 2, spread: 1, gravity: 0.2, size: 3, life: [16, 26] }));
  retreat(h, tl, 52, 76, land0, 24);
  tl.end(78);
};

const minoBellow: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('eat');
    h.camera(1.3, h.pos().x - 16, h.pos().y - h.height * 0.6, 30);
  });
  // Swells with breath, steam venting
  tl.during(0, 28, (t) => h.stretch(1 + 0.06 * t, 1 + 0.08 * t));
  tl.every(0, 28, 4, () => {
    const p = crown(h, 0.55, -26);
    h.emit(p.x, p.y, { count: 2, colors: [0xE7E5E4, 0xA8A29E], speed: [0.4, 1], angle: Math.PI + 0.3, spread: 0.4, gravity: -0.03, size: 3, life: [14, 22] });
  });
  tl.at(28, () => {
    h.stretch(1, 1);
    h.sound('level_up');
    h.camera(1.06, 220, 130, 70);
  });
  dimSpan(h, tl, 28, 106, 0.35, BLOOD_DARK);
  // The bellow: thick shockwave rings shake the whole labyrinth
  drawSpan(h, tl, 28, 64, (g, t) => {
    const p = crown(h, 0.55, -26);
    shoutRings(g, p.x, p.y, t, BLOOD, 4, 200);
    shoutRings(g, p.x, p.y, t + 0.1, 0xFDE047, 2, 200);
  });
  tl.every(28, 64, 2, () => h.shake(6));
  ceilingDust(h, tl, 32, 86);
  tl.at(40, () => chip(h, RAGE, 6, 8));
  warnRing(h, tl, 44, 74, BLOOD, 26);
  // Then the ceiling comes down on the knight
  [62, 68, 74].forEach((f, i) => {
    const dx = [-18, 22, 4][i];
    projectile(h, tl, f - 10, 10, () => ({ x: h.knight.x + dx, y: 30 }), () => ({ x: h.knight.x + dx, y: h.knight.y - 10 }), 0,
      (g, x, y) => {
        const r = i === 2 ? 11 : 7;
        g.poly([x - r, y - r * 0.6, x + r * 0.4, y - r, x + r, y - r * 0.2, x + r * 0.6, y + r * 0.8, x - r * 0.8, y + r * 0.6]).fill({ color: ROCK[1] }).stroke({ width: 2, color: INK });
        g.rect(x - r * 0.4, y - r * 0.5, r * 0.6, r * 0.3).fill({ color: ROCK[2] });
      },
      () => {
        h.emit(h.knight.x + dx, h.knight.y - 8, { count: 16, colors: ROCK, speed: [1, 3], angle: -Math.PI / 2, spread: 1.2, gravity: 0.2, size: 3, life: [14, 24] });
        if (i < 2) {
          h.shake(8);
          h.sound('hit');
          h.knightHit(4);
        } else land(h, { kb: 14, shake: 16, stop: 7, flash: 0.4, zoom: 1.26, colors: [...ROCK, BONE] });
      });
  });
  tl.end(108);
};

// ---------------------------------------------------------------------------------------------
// DARK KNIGHT: a fallen champion. Cursed shadow-flame on every cut.

const DARKFLAME = [0x7C3AED, 0xA855F7, 0x1E0B33, 0xF0ABFC];

const dkBlackBlade: MoveFn = (h, tl) => {
  const c = contact(h, 34);
  tl.at(0, () => h.anim('Run', true));
  travel(h, tl, 0, 14, { x: 0, y: 0 }, c, easeIn);
  tl.every(0, 14, 1, () => h.streaks(h.pos().x + 12, h.pos().y - 30, 40, DARKFLAME));
  tl.at(14, () => h.anim('Attack01'));
  tl.at(24, () => h.sound('swing'));
  drawSpan(h, tl, 26, 40, (g, t) => cleave(g, h, t, -Math.PI * 0.8, Math.PI * 1.25, 30, 9, 0x7C3AED, 0xF0ABFC));
  tl.at(30, () => {
    h.emit(chest(h).x, chest(h).y, { count: 18, colors: DARKFLAME, speed: [1, 3], angle: -Math.PI / 2, spread: 1.2, gravity: -0.05, size: 3, life: [16, 26] });
    land(h, { kb: 12, shake: 12, stop: 6, flash: 0.4, color: 0x7C3AED, zoom: 1.24, colors: [...DARKFLAME, BONE] });
  });
  // Shadow-flame clings to the knight
  tl.every(34, 70, 3, () => h.emit(chest(h).x + rand(-8, 8), chest(h).y + rand(-10, 10), { count: 1, colors: DARKFLAME, speed: [0.2, 0.6], angle: -Math.PI / 2, spread: 0.3, gravity: -0.04, size: 3, life: [14, 22] }));
  tl.at(44, () => h.anim('Run', true));
  retreat(h, tl, 44, 64, c);
  tl.at(64, () => h.idle());
  tl.end(72);
};

const dkAbyssalCleave: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('Idle', true);
    h.camera(1.26, h.home.x - 10, h.home.y - 40, 40);
    h.sound('level_up');
  });
  dimSpan(h, tl, 0, 104, 0.6, 0x0B0414);
  // Dark aura gathers on the blade
  drawSpan(h, tl, 0, 40, (g, t, f) => {
    const p = crown(h, 0.75, -14);
    for (let k = 0; k < 6; k++) {
      const a = f * 0.2 + k;
      const r = 30 * (1 - t);
      g.circle(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.6, 2.5).fill({ color: DARKFLAME[k % 2] });
    }
    fx.lance(g, p.x + 4, p.y + 20, p.x - 6, p.y - 26, 4 + 3 * t, fx.pal(0x7C3AED, 0xF0ABFC), 1);
  });
  chargeTint(h, tl, 10, 40, 0xC4B5FD, 0.8);
  tl.at(40, () => {
    h.anim('Attack01');
    h.camera(1.08, (h.home.x + h.knight.x) / 2, h.knight.y - 40, 50);
  });
  tl.at(50, () => h.sound('crit'));
  // A crescent wave of shadow travels across the floor
  drawSpan(h, tl, 50, 74, (g, t) => {
    const x = lerp(h.pos().x - 30, h.knight.x - 10, easeIn(t));
    const y = h.knight.y - 30;
    fx.crescent(g, x + 30, y, 40, Math.PI * 0.6, Math.PI * 1.4, 14, fx.pal(0x7C3AED, 0xF0ABFC), 1);
  });
  tl.every(50, 70, 1, () => h.emit(lerp(h.pos().x - 10, h.knight.x + 20, (tl.frame - 50) / 20), h.knight.y - rand(0, 50), { count: 2, colors: DARKFLAME, speed: [0.5, 1.5], angle: 0, spread: 0.6, gravity: -0.04, size: 3, life: [14, 22] }));
  tl.at(66, () => land(h, { kb: 20, shake: 17, stop: 8, flash: 0.6, color: 0x7C3AED, zoom: 1.28, colors: [...DARKFLAME, BONE], ring: 0xA855F7 }));
  // A scar of shadow left on the floor
  drawSpan(h, tl, 50, 104, (g, t) => {
    g.moveTo(h.home.x - 30, h.home.y).lineTo(h.knight.x - 20, h.knight.y).stroke({ width: 4, color: INK, alpha: 0.7 * (1 - t) });
    g.moveTo(h.home.x - 30, h.home.y).lineTo(h.knight.x - 20, h.knight.y).stroke({ width: 2, color: 0xA855F7, alpha: 1 - t });
  }, 'ground');
  tl.end(106);
};

const dkDreadBastion: MoveFn = (h, tl) => {
  tl.at(0, () => h.anim('Hit'));
  chargeTint(h, tl, 0, 36, 0x9CA3AF, 0.4);
  guard(h, tl, 6, [...DARKFLAME, 0x9CA3AF], (g, cx, cy, grow, fade, f) => {
    const x = cx - 22;
    const s = 22 * grow;
    g.poly([x - s * 0.7, cy - s, x + s * 0.7, cy - s, x + s * 0.7, cy, x, cy + s, x - s * 0.7, cy]).fill({ color: 0x18181B, alpha: 0.8 * fade }).stroke({ width: 3, color: INK, alpha: fade });
    g.poly([x - s * 0.7, cy - s, x + s * 0.7, cy - s, x + s * 0.7, cy, x, cy + s, x - s * 0.7, cy]).stroke({ width: 1.5, color: 0xA855F7, alpha: fade });
    g.rect(x - 1, cy - s * 0.8, 2, s * 1.5).fill({ color: 0xA855F7, alpha: fade });
    g.rect(x - s * 0.5, cy - s * 0.35, s, 2).fill({ color: 0xA855F7, alpha: fade });
    hexWard(g, cx, cy, 40 * grow, f * 0.01, 0x7C3AED, 0xF0ABFC, fade * 0.6);
  });
  tl.end(62);
};

const dkShadowStep: MoveFn = (h, tl) => {
  const k = contact(h, 0);
  // Three stations around the knight: front-high, front-low, and a final drop from above
  const spots = [
    { x: k.x + 34, y: k.y - 4 },
    { x: k.x + 28, y: k.y + 8 },
    { x: k.x + 30, y: k.y },
  ];
  tl.at(0, () => h.camera(1.22, h.knight.x + 20, h.knight.y - 34, 110));
  dimSpan(h, tl, 0, 110, 0.6, 0x0B0414);
  let at = 4;
  spots.forEach((s, i) => {
    blink(h, tl, at, s, [...DARKFLAME, INK], 5);
    const strike = at + 14;
    tl.at(strike, () => {
      h.anim('Attack01');
      h.sound('swing');
    });
    drawSpan(h, tl, strike + 2, strike + 12, (g, t) => cleave(g, h, t, i === 1 ? Math.PI * 0.7 : -Math.PI * 0.7, i === 1 ? -Math.PI * 1.1 : Math.PI * 1.1, 26 + i * 4, 8, 0x7C3AED, 0xF0ABFC));
    if (i === 2) tl.during(at + 7, strike + 4, (t) => h.lift(lerp(60, 0, easeIn(t))));
    tl.at(strike + 4, () => (i < 2 ? chip(h, [...DARKFLAME, BONE], 5, 7) : land(h, { kb: 16, shake: 16, stop: 8, flash: 0.55, color: 0x7C3AED, zoom: 1.32, colors: [...DARKFLAME, BONE], ring: 0xA855F7 })));
    at += 26;
  });
  blink(h, tl, at + 4, { x: 0, y: 0 }, [...DARKFLAME, INK], 6);
  tl.end(at + 24);
};

// ---------------------------------------------------------------------------------------------
// DARK EMPEROR: the sovereign. Every move is a held pose and a terrible summons.

const emperorImperialSlash: MoveFn = (h, tl) => {
  const c = contact(h, 36);
  tl.at(0, () => {
    h.anim('pose_move_front', true);
    h.camera(1.15, h.home.x, h.home.y - 40, 20);
  });
  travel(h, tl, 4, 18, { x: 0, y: 0 }, c, easeIn);
  tl.every(4, 18, 1, () => h.streaks(h.pos().x + 12, h.pos().y - 40, 46, [GOLD, ...VOID]));
  tl.at(18, () => {
    h.anim('pose_attack', true);
    h.sound('swing');
  });
  // Twin royal arcs: gold then void
  drawSpan(h, tl, 20, 32, (g, t) => cleave(g, h, t, -Math.PI * 0.75, Math.PI * 1.2, 30, 9, GOLD, 0xFFFFFF));
  drawSpan(h, tl, 28, 40, (g, t) => cleave(g, h, t, Math.PI * 0.6, -Math.PI * 1.1, 34, 9, 0x7C3AED, 0xF0ABFC));
  tl.at(22, () => chip(h, [GOLD, BONE], 5, 7));
  tl.at(30, () => land(h, { kb: 14, shake: 14, stop: 7, flash: 0.45, color: GOLD, zoom: 1.28, colors: [GOLD, ...VOID, BONE] }));
  tl.at(44, () => h.anim('pose_move_back', true));
  retreat(h, tl, 44, 66, c);
  tl.at(66, () => h.idle());
  tl.end(68);
};

const emperorSovereignRuin: MoveFn = (h, tl) => {
  const kx = () => h.knight.x + 6;
  tl.at(0, () => {
    h.anim('pose_cast_spell', true);
    h.camera(1.25, h.home.x, h.home.y - 50, 30);
    h.sound('level_up');
  });
  dimSpan(h, tl, 0, 130, 0.75, 0x05010A);
  // A void portal tears open above the knight
  tl.at(26, () => h.camera(1.12, h.knight.x + 10, h.knight.y - 60, 80));
  drawSpan(h, tl, 20, 110, (g, t, f) => {
    const open = easeOut(Math.min(1, f / 20));
    const fade = f > 74 ? 1 - (f - 74) / 16 : 1;
    const y = h.knight.y - 130;
    g.ellipse(kx(), y, 40 * open, 10 * open).fill({ color: 0x000000, alpha: 0.95 * fade }).stroke({ width: 3, color: 0x7C3AED, alpha: fade });
    g.ellipse(kx(), y, 46 * open, 13 * open).stroke({ width: 1.5, color: 0xF0ABFC, alpha: 0.6 * fade });
  });
  tl.every(24, 60, 2, () => h.emit(kx() + rand(-40, 40), h.knight.y - 130, { count: 1, colors: VOID, speed: [0.3, 0.8], angle: Math.PI / 2, spread: 0.3, gravity: 0.02, size: 2, life: [20, 30] }));
  warnRing(h, tl, 40, 76, 0xF0ABFC, 26);
  // The executioner's blade descends point-first, slowly, then all at once
  drawSpan(h, tl, 40, 100, (g, t, f) => {
    const drop = f < 30 ? easeOut(f / 30) * 0.3 : 0.3 + easeIn(Math.min(1, (f - 30) / 6)) * 0.7;
    const tipY = lerp(h.knight.y - 130, h.knight.y - 4, drop);
    const fade = f > 48 ? 1 - (f - 48) / 12 : 1;
    const x = kx();
    g.poly([x - 9, tipY - 70, x + 9, tipY - 70, x + 6, tipY - 10, x, tipY, x - 6, tipY - 10]).fill({ color: 0x27272A, alpha: fade }).stroke({ width: 2, color: INK, alpha: fade });
    g.poly([x - 2, tipY - 70, x + 2, tipY - 70, x + 1, tipY - 6, x, tipY]).fill({ color: 0xE9D5FF, alpha: fade });
    g.rect(x - 20, tipY - 76, 40, 6).fill({ color: GOLD, alpha: fade }).stroke({ width: 1.5, color: INK, alpha: fade });
    g.rect(x - 3, tipY - 96, 6, 20).fill({ color: 0x44403C, alpha: fade }).stroke({ width: 1, color: INK, alpha: fade });
  });
  tl.at(70, () => h.sound('swing'));
  tl.at(76, () => {
    h.emit(kx(), h.knight.y - 10, { count: 44, colors: [...VOID, GOLD, BONE], speed: [2, 5.5], angle: -Math.PI / 2, spread: 1.4, gravity: 0.15, size: 3, life: [18, 32] });
    h.shockwave(kx(), h.knight.y, 0xA855F7);
    h.shockwave(kx(), h.knight.y, GOLD);
    land(h, { kb: 20, shake: 22, stop: 12, flash: 0.8, color: 0xF0ABFC, zoom: 1.34, colors: [...VOID, GOLD, BONE] });
  });
  drawSpan(h, tl, 76, 92, (g, t) => fx.starburst(g, kx(), h.knight.y - 20, 50 * easeOut(t), 12, 0.2, fx.pal(0x7C3AED, 0xFFFFFF), 1 - t));
  tl.at(110, () => h.idle());
  tl.end(132);
};

const emperorCrownShadows: MoveFn = (h, tl) => {
  tl.at(0, () => h.anim('pose_defend', true));
  guard(h, tl, 4, [...VOID, GOLD], (g, cx, cy, grow, fade, f) => {
    // A crown of shadow spikes above, a void ward around
    const top = cy - h.height * 0.6;
    for (let k = 0; k < 5; k++) {
      const x = cx - 16 + k * 8;
      const hh = (k % 2 ? 8 : 14) * grow;
      g.poly([x - 3, top, x, top - hh, x + 3, top]).fill({ color: 0x3B0764, alpha: fade }).stroke({ width: 1, color: GOLD, alpha: fade });
    }
    g.rect(cx - 19, top, 38, 3).fill({ color: GOLD, alpha: fade });
    hexWard(g, cx, cy, 44 * grow, -f * 0.015, 0x7C3AED, GOLD, fade);
  });
  tl.at(56, () => h.idle());
  tl.end(62);
};

const emperorShadowLegion: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('pose_cast_spell', true);
    h.camera(1.06, 220, 130, 120);
    h.sound('level_up');
  });
  dimSpan(h, tl, 0, 124, 0.6, 0x05010A);
  // Sigils open on the floor behind the knight's line
  drawSpan(h, tl, 6, 60, (g, t, f) => {
    for (let i = 0; i < 3; i++) sigil(g, 380 - i * 10, h.knight.y + [-6, 6, 0][i], 18, Math.min(1, f / 18), f * 0.06, 0x7C3AED, 0xF0ABFC);
  }, 'ground');
  // Three shadow knights charge through in turn
  [26, 40, 54].forEach((f, i) => {
    let ghost: Spine | null = null;
    const lane = h.knight.y + [-6, 6, 0][i];
    tl.at(f, () => {
      ghost = h.clone();
      if (!ghost) return;
      ghost.tint = 0x6D28D9;
      ghost.alpha = 0.75;
      ghost.state.setAnimation(0, 'pose_attack', true);
      ghost.x = 380 - i * 10;
      ghost.y = lane;
      h.sound('swing');
    });
    tl.during(f, f + 22, (t) => {
      if (!ghost) return;
      ghost.x = lerp(380 - i * 10, -40, easeIn(t));
      ghost.alpha = 0.75 * (t < 0.85 ? 1 : (1 - t) / 0.15);
      if (Math.random() < 0.5) h.streaks(ghost.x + 16, lane - 36, 40, VOID);
    });
    tl.at(f + 13, () => {
      const p = chest(h);
      h.sparks(p.x, p.y, 10, [...VOID, GOLD]);
      if (i < 2) chip(h, [...VOID, BONE], 6, 8);
      else land(h, { kb: 16, shake: 16, stop: 8, flash: 0.55, color: 0x7C3AED, zoom: 1.24, colors: [...VOID, GOLD, BONE] });
    });
    drawSpan(h, tl, f + 12, f + 22, (g, t) => cleave(g, h, t, -Math.PI * 0.6 + i * 0.4, Math.PI * 1.1, 28, 8, 0x7C3AED, 0xF0ABFC));
  });
  tl.at(100, () => h.idle());
  tl.end(126);
};

// ---------------------------------------------------------------------------------------------
// NIGHTMARE STAG: a forest phantom. Cold spectral light, fog, and a stampede of ghosts.

const stagSpectralAntlers: MoveFn = (h, tl) => {
  const c = contact(h, 36);
  tl.at(0, () => h.anim('body/action2'));
  lean(h, tl, 0, 16, -0.18, 0);
  // Antlers ignite with cold light
  drawSpan(h, tl, 4, 44, (g, t, f) => {
    const p = crown(h, 1.02, -10);
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k - 2) * 0.4;
      g.moveTo(p.x, p.y).lineTo(p.x + Math.cos(a) * 14, p.y + Math.sin(a) * 14).stroke({ width: 2, color: SPECTRAL[1], alpha: 0.6 + 0.4 * Math.sin(f + k) });
    }
  });
  tl.at(16, () => h.sound('swing'));
  travel(h, tl, 16, 28, { x: 0, y: 0 }, c, easeIn);
  tl.every(16, 28, 1, () => h.streaks(h.pos().x + 16, h.pos().y - 30, 44, SPECTRAL));
  tl.during(28, 36, (t) => h.tilt(lerp(-0.18, 0.15, easeOut(t))));
  drawSpan(h, tl, 28, 40, (g, t) => cleave(g, h, t, Math.PI * 0.75, -Math.PI * 1.05, 30, 9, 0x22D3EE, 0xFFFFFF));
  tl.at(30, () => land(h, { kb: 14, shake: 12, stop: 6, flash: 0.4, color: 0x67E8F9, zoom: 1.24, colors: [...SPECTRAL, BONE] }));
  tl.during(36, 46, (t) => h.tilt(lerp(0.15, 0, t)));
  retreat(h, tl, 48, 72, c);
  tl.end(74);
};

const stagEtherealTrample: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('body/action1');
    h.camera(1.08, 220, 130, 120);
    h.sound('level_up');
  });
  dimSpan(h, tl, 0, 124, 0.6, 0x041019);
  tl.during(0, 20, (t) => h.lift(arc(t) * 14)); // rears
  tl.every(20, 100, 6, () => h.shake(3));
  // Three phantom stags stampede through the knight
  [24, 38, 52].forEach((f, i) => {
    let ghost: Spine | null = null;
    const lane = h.knight.y + [-6, 6, 0][i];
    tl.at(f, () => {
      ghost = h.clone();
      if (!ghost) return;
      ghost.tint = 0x67E8F9;
      ghost.alpha = 0.6;
      ghost.state.setAnimation(0, 'body/idle', true);
      ghost.y = lane;
      ghost.x = 450;
      h.sound('swing');
    });
    tl.during(f, f + 22, (t, ff) => {
      if (!ghost) return;
      ghost.x = lerp(450, -50, t);
      ghost.y = lane - Math.abs(Math.sin(ff * 0.5)) * 6;
      if (Math.random() < 0.5) h.streaks(ghost.x + 20, lane - 30, 40, SPECTRAL);
    });
    tl.at(f + 12, () => (i < 2 ? chip(h, [...SPECTRAL, BONE], 6, 8) : land(h, { kb: 16, shake: 16, stop: 8, flash: 0.5, color: 0x67E8F9, zoom: 1.24, colors: [...SPECTRAL, BONE] })));
  });
  // Glowing hoofprints across the floor
  drawSpan(h, tl, 30, 120, (g, t) => {
    for (let k = 0; k < 10; k++) {
      const x = 400 - k * 30;
      const y = h.knight.y + (k % 2 ? 3 : -3);
      g.ellipse(x, y, 3, 1.2).fill({ color: 0x67E8F9, alpha: 0.8 * (1 - t) });
    }
  }, 'ground');
  tl.end(126);
};

const stagMistVeil: MoveFn = (h, tl) => {
  const c = contact(h, 30);
  tl.at(0, () => {
    h.anim('body/action2');
    h.camera(1.15, (h.home.x + h.knight.x) / 2, h.knight.y - 30, 90);
  });
  dimSpan(h, tl, 0, 112, 0.55, 0x041019);
  // Dread fog rolls in from the stag
  drawSpan(h, tl, 6, 100, (g, t, f) => {
    const a = f < 20 ? f / 20 : f > 78 ? 1 - (f - 78) / 16 : 1;
    for (let k = 0; k < 14; k++) {
      const x = lerp(h.home.x, h.knight.x - 40, ((k * 0.13 + f * 0.004) % 1)) + Math.sin(f * 0.03 + k) * 10;
      const y = h.knight.y - 10 - (k % 4) * 12;
      g.ellipse(x, y, 30, 12).fill({ color: k % 2 ? 0x94A3B8 : 0x64748B, alpha: 0.2 * a });
    }
  });
  tl.at(20, () => h.alpha(0.25));
  // Eyes glint from inside the fog, then it strikes out of it
  drawSpan(h, tl, 30, 50, (g, t) => {
    const p = { x: h.knight.x + 50, y: h.knight.y - 50 };
    const a = arc(t);
    g.rect(p.x - 4, p.y, 3, 2).fill({ color: 0x22D3EE, alpha: a });
    g.rect(p.x + 3, p.y, 3, 2).fill({ color: 0x22D3EE, alpha: a });
  });
  tl.at(34, () => h.sound('swing'));
  [52, 64].forEach((f, i) => {
    tl.at(f - 6, () => h.offset(c.x, c.y));
    tl.during(f - 6, f + 4, (t) => h.alpha(t < 0.5 ? lerp(0.25, 1, t * 2) : lerp(1, 0.25, (t - 0.5) * 2)));
    drawSpan(h, tl, f, f + 10, (g, t) => cleave(g, h, t, i ? Math.PI * 0.7 : -Math.PI * 0.7, i ? -Math.PI : Math.PI, 26, 8, 0x22D3EE, 0xFFFFFF));
    tl.at(f, () => (i === 0 ? chip(h, SPECTRAL, 5, 6) : land(h, { kb: 14, shake: 13, stop: 6, flash: 0.35, color: 0x67E8F9, colors: [...SPECTRAL, BONE] })));
  });
  tl.at(80, () => h.offset(0, 0));
  tl.during(80, 100, (t) => h.alpha(lerp(0.25, 1, t)));
  tl.end(114);
};

const stagMoonBellow: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('body/action1');
    h.camera(1.06, 220, 120, 100);
    h.sound('level_up');
  });
  dimSpan(h, tl, 0, 110, 0.65, 0x041019);
  // A pale moon rises behind it
  drawSpan(h, tl, 0, 104, (g, t, f) => {
    const a = f < 20 ? f / 20 : f > 84 ? 1 - (f - 84) / 20 : 1;
    const mx = h.home.x + 30;
    const my = 96 - easeOut(Math.min(1, f / 30)) * 14;
    g.circle(mx, my, 26).fill({ color: 0xCFFAFE, alpha: 0.15 * a });
    g.circle(mx, my, 17).fill({ color: 0xE0F2FE, alpha: 0.9 * a }).stroke({ width: 2, color: INK, alpha: a });
    g.circle(mx + 4, my - 3, 4).fill({ color: 0xBAE6FD, alpha: a });
  }, 'ground');
  drawSpan(h, tl, 10, 40, (g, t) => shoutRings(g, crown(h, 0.9).x, crown(h, 0.9).y, t, 0xCFFAFE, 3, 70));
  // Moonbeams fall in a pattern that closes on the knight
  const beams = [{ dx: -34, f: 40 }, { dx: 30, f: 50 }, { dx: -10, f: 58 }, { dx: 6, f: 68 }];
  beams.forEach(({ dx, f }, i) => {
    const last = i === beams.length - 1;
    drawSpan(h, tl, f - 12, f, (g, t) => fx.groundRing(g, h.knight.x + 6 + dx, h.knight.y + 1, 10 + 4 * t, 1.5, 0x67E8F9, 0.4 + 0.6 * t), 'ground');
    drawSpan(h, tl, f, f + 16, (g, t) => fx.pillar(g, h.knight.x + 6 + dx, 40, h.knight.y + 2, (last ? 22 : 14) * (1 - t * 0.6), fx.pal(0x67E8F9, 0xFFFFFF), 1 - t));
    tl.at(f, () => {
      h.emit(h.knight.x + 6 + dx, h.knight.y - 4, { count: 14, colors: SPECTRAL, speed: [1, 3], angle: -Math.PI / 2, spread: 1, gravity: -0.02, size: 2, life: [14, 24] });
      if (!last) {
        h.shake(6);
        h.sound('hit');
        if (Math.abs(dx) < 20) h.knightHit(4);
      } else land(h, { kb: 12, shake: 14, stop: 7, flash: 0.55, color: 0xCFFAFE, zoom: 1.26, colors: [...SPECTRAL, 0xFFFFFF] });
    });
  });
  tl.end(112);
};

export const WARBAND_MOVES = {
  orc_axe_chop: orcAxeChop,
  orc_blood_frenzy: orcBloodFrenzy,
  orc_war_cry_slam: orcWarCrySlam,
  orc_axe_throw: orcAxeThrow,

  troll_burl_club: trollBurlClub,
  troll_berserk_flail: trollBerserkFlail,
  troll_regrowth: trollRegrowth,
  troll_boulder_toss: trollBoulderToss,

  mino_horn_gore: minoHornGore,
  mino_labyrinth_charge: minoLabyrinthCharge,
  mino_club_crush: minoClubCrush,
  mino_bellow: minoBellow,

  dk_black_blade: dkBlackBlade,
  dk_abyssal_cleave: dkAbyssalCleave,
  dk_dread_bastion: dkDreadBastion,
  dk_shadow_step: dkShadowStep,

  emperor_imperial_slash: emperorImperialSlash,
  emperor_sovereign_ruin: emperorSovereignRuin,
  emperor_crown_shadows: emperorCrownShadows,
  emperor_shadow_legion: emperorShadowLegion,

  stag_spectral_antlers: stagSpectralAntlers,
  stag_ethereal_trample: stagEtherealTrample,
  stag_mist_veil: stagMistVeil,
  stag_moon_bellow: stagMoonBellow,
} satisfies Partial<Record<MonsterMoveId, MoveFn>>;
