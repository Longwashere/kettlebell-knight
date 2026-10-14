/**
 * Early-dungeon critters: Cave Bat, Goblin Scout, Spore Mushroom, Brood Spider, Cliff Harpy, Lizardman.
 * Small, quick creatures: their moves lean on speed, flight and dirty tricks rather than raw weight.
 */
import type { Graphics } from 'pixi.js';
import type { MonsterMoveId } from '../../../types/battle';
import { lerp, easeIn, easeOut, easeInOut, arc, rand, INK, BONE, BLOOD, BLOOD_DARK, EMBER, GOLD, GOO, DIRT, FIRE, SMOKE } from '../choreo';
import * as fx from '../fxKit';
import {
  type MoveFn, contact, chest, head, travel, dustAtFeet, drawSpan, projectile, clawRake, jaws, spike, orb,
  retreat, crown, feet, land, chip, crater, boom, toxic, shatter, circle, portal, regen, flame, blaze, spark,
  dimSpan, chargeTint, tremble, puff, blink, warnRing, puddle, shoutRings, dart, flier, crawler, hexWard,
  guard, lean, tentacle,
} from '../monsterKit';

const BAT_RED = [0xB91C1C, 0xEF4444, 0x7F1D1D, 0xFCA5A5];
const SONIC = 0xF0ABFC;
const VENOM = [0x65A30D, 0xA3E635, 0x3F6212, 0xECFCCB];
const FEATHER = [0xF9A8D4, 0xF472B6, 0xFFF1F2, 0xBE185D];
const SWAMP = [0x14532D, 0x166534, 0x4D7C0F, 0x86EFAC];
const SPORE_Y = [0xFDE047, 0xFACC15, 0xFEF9C3, 0xA16207];

// ---------------------------------------------------------------------------------------------
// CAVE BAT: erratic flight, sonic screams, a blood-drinker.

const batWingBuffet: MoveFn = (h, tl) => {
  const c = { x: contact(h, 30).x, y: contact(h, 30).y - 6 };
  tl.at(0, () => {
    h.anim('unused_attack1', true);
    h.sound('screech', { vol: 0.6, rate: 1.2 });
  });
  tl.every(0, 22, 9, () => h.sound('flap', { vol: 0.6, rate: 1.3 }));
  // Erratic zig-zag approach
  tl.during(0, 22, (t, f) => {
    const e = easeInOut(t);
    h.offset(lerp(0, c.x, e), lerp(0, c.y, e) + Math.sin(f * 0.7) * 8 * (1 - t));
  });
  tl.every(0, 22, 3, () => h.streaks(h.pos().x + 10, h.pos().y - h.height * 0.6, 20, BAT_RED));
  [26, 36].forEach((f, i) => {
    tl.at(f, () => {
      h.anim('attack');
      h.sound('flap');
      h.sound('whoosh', { rate: 1.2 });
    });
    drawSpan(h, tl, f, f + 12, (g, t) => {
      const p = chest(h);
      // Gust crescents peel off the wingtip
      fx.crescent(g, p.x + 16 - t * 14, p.y - 6 + i * 8, 18 + t * 8, -Math.PI * 0.7, Math.PI * 0.6, 6 * (1 - t) + 1, fx.pal(0xFECDD3, BONE), 1 - t);
    });
    tl.at(f + 4, () => {
      h.emit(chest(h).x, chest(h).y, { count: 10, colors: [0xE7E5E4, 0xFECDD3, 0xA8A29E], speed: [1.5, 3], angle: Math.PI, spread: 0.5, gravity: 0, size: 2, life: [10, 18] });
      if (i === 0) chip(h, BAT_RED, 4, 5, 'claw');
      else land(h, { kb: 8, shake: 8, stop: 3, zoom: 1.18, colors: [...BAT_RED, BONE], sound: 'claw' });
    });
  });
  tl.at(52, () => h.anim('unused_attack1', true));
  tl.every(52, 74, 9, () => h.sound('flap', { vol: 0.5, rate: 1.3 }));
  tl.during(52, 74, (t, f) => {
    const e = easeInOut(t);
    h.offset(lerp(c.x, 0, e), lerp(c.y, 0, e) - arc(t) * 24);
  });
  tl.at(74, () => h.idle());
  tl.end(76);
};

const batScreechDive: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('unused_attack2', true);
    h.camera(1.2, h.home.x, h.home.y - 50, 26);
  });
  // Climb out of frame, screaming
  tl.during(0, 26, (t) => h.lift(easeIn(t) * 200));
  drawSpan(h, tl, 4, 30, (g, t) => {
    const p = h.pos();
    shoutRings(g, p.x - 6, p.y - h.height * 0.7 - easeIn(t) * 200, t, SONIC, 3, 60);
  });
  tl.at(0, () => h.sound('flap', { rate: 1.2 }));
  tl.at(6, () => h.sound('screech'));
  tl.at(30, () => h.sound('screech', { rate: 0.85, vol: 0.8 }));
  dimSpan(h, tl, 10, 84, 0.45, 0x1E0B33);
  // Hang above while a scream ring tightens on the knight
  tl.at(28, () => h.offset(contact(h, 20).x, contact(h, 20).y));
  warnRing(h, tl, 28, 54, SONIC);
  drawSpan(h, tl, 30, 52, (g, t, f) => {
    const p = head(h);
    for (let k = 0; k < 3; k++) {
      const r = lerp(70, 10, (t + k / 3) % 1);
      g.circle(p.x, p.y, r).stroke({ width: 3, color: INK, alpha: 0.4 });
      g.circle(p.x, p.y, r).stroke({ width: 1.5, color: SONIC, alpha: 0.8 });
    }
  });
  tl.every(30, 52, 6, () => h.shake(3));
  tl.at(44, () => h.camera(1.28, h.knight.x + 12, h.knight.y - 40, 30));
  // Dive
  tl.at(52, () => {
    h.anim('attack');
    h.sound('whistle', { rate: 1.6 });
    h.sound('screech', { rate: 1.15, vol: 0.7 });
  });
  tl.during(52, 60, (t) => {
    h.lift(lerp(200, 18, easeIn(t)));
    h.stretch(0.8, 1.3);
  });
  tl.every(52, 60, 1, () => h.streaks(h.pos().x, h.pos().y - 40, 40, [SONIC, ...BAT_RED]));
  tl.at(60, () => {
    h.stretch(1.25, 0.8);
    h.shockwave(h.knight.x + 6, h.knight.y - 30, SONIC);
    crater(h, h.knight.x + 6, h.knight.y, 0.9, 'ShockWave_3');
    land(h, { kb: 12, shake: 13, stop: 6, flash: 0.45, color: SONIC, colors: [...BAT_RED, SONIC, BONE], ring: 0xA855F7, sound: 'claw' });
  });
  tl.during(60, 70, (t) => h.stretch(lerp(1.25, 1, t), lerp(0.8, 1, t)));
  tl.at(70, () => h.anim('unused_attack1', true));
  tl.during(70, 96, (t) => {
    const e = easeInOut(t);
    const c = contact(h, 20);
    h.offset(lerp(c.x, 0, e), lerp(c.y, 0, e));
    h.lift(lerp(18, 0, e) + arc(t) * 40);
  });
  tl.at(96, () => h.idle());
  tl.end(98);
};

const batBloodDrain: MoveFn = (h, tl) => {
  const c = { x: contact(h, 14).x, y: contact(h, 14).y - 10 };
  tl.at(0, () => {
    h.anim('unused_attack3', true);
    h.sound('screech', { vol: 0.5, rate: 1.3 });
    h.sound('dash');
  });
  travel(h, tl, 0, 16, { x: 0, y: 0 }, c, easeIn);
  tl.every(0, 16, 2, () => h.streaks(h.pos().x + 8, h.pos().y - 30, 30, BAT_RED));
  tl.at(16, () => {
    h.anim('attack', true);
    h.camera(1.32, h.knight.x + 14, h.knight.y - 40, 64);
    h.sound('chomp');
  });
  // Latched on the neck
  drawSpan(h, tl, 16, 26, (g, t) => {
    const p = head(h);
    jaws(g, p.x + 4, p.y + 8, t, BONE, BLOOD);
  });
  tremble(h, tl, 18, 70, c, 1.5, 2.6);
  dimSpan(h, tl, 16, 84, 0.4, BLOOD_DARK);
  chargeTint(h, tl, 26, 70, 0xFF8080, 0.6);
  // Blood motes stream from knight into the bat
  tl.every(26, 66, 2, () => {
    const p = head(h);
    const b = h.pos();
    h.emit(p.x + rand(-6, 6), p.y + rand(4, 14), {
      count: 1, colors: [BLOOD, 0xFF3366, 0x7F1D1D], speed: [1.5, 2.4], angle: Math.atan2(b.y - h.height * 0.5 - p.y, b.x - p.x),
      spread: 0.25, gravity: 0, size: 2, life: [10, 16],
    });
  });
  [34, 48].forEach((f) => tl.at(f, () => chip(h, [BLOOD, 0xFF3366], 1, 3, 'squelch')));
  tl.at(62, () => land(h, { kb: 6, shake: 9, stop: 4, flash: 0.35, color: BLOOD, colors: [BLOOD, 0xFF3366, BONE], sound: 'chomp', at: head(h) }));
  tl.at(70, () => {
    h.anim('unused_attack1', true);
    h.text('+DRAIN', h.pos().x, h.pos().y - h.height - 10, 0xFF3366, 8);
    h.vfx('heal', h.pos().x, h.pos().y - h.height * 0.4, { size: 0.7, tint: 0xFF8080 });
  });
  retreat(h, tl, 70, 92, c, 30);
  tl.at(92, () => h.idle());
  tl.end(94);
};

const batEchoSwarm: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('defend');
    h.camera(1.08, 220, 130, 90);
    h.sound('screech');
    h.sound('dark', { vol: 0.5, rate: 1.3 });
  });
  dimSpan(h, tl, 0, 104, 0.5, 0x1E0B33);
  drawSpan(h, tl, 0, 26, (g, t) => {
    const p = crown(h, 0.6);
    shoutRings(g, p.x, p.y, t, SONIC, 4, 80);
  });
  // A river of bats pours out of the dark on sine lanes
  const n = 14;
  for (let i = 0; i < n; i++) {
    const start = 18 + i * 3;
    const lane = rand(-30, 10);
    const phase = rand(0, Math.PI * 2);
    const size = rand(9, 12);
    drawSpan(h, tl, start, start + 34, (g, t, f) => {
      const x = lerp(440, -20, t);
      const y = h.knight.y - 40 + lane + Math.sin(phase + f * 0.35) * 10;
      g.circle(x, y, size * 1.2).fill({ color: SONIC, alpha: 0.12 });
      flier(g, x, y, size, f * 1.3 + phase, i % 3 ? 0x450A0A : 0x7F1D1D, 0xFFE4E6);
    });
  }
  tl.at(18, () => h.sound('swarm', { rate: 1.6 }));
  tl.every(22, 68, 6, () => h.sound('flap', { vol: 0.6, rate: rand(1.1, 1.5) }));
  tl.at(42, () => h.sound('screech', { rate: 1.3, vol: 0.5 }));
  [36, 46, 56].forEach((f) => tl.at(f, () => chip(h, BAT_RED, 3, 4, 'claw')));
  tl.at(68, () => land(h, { kb: 10, shake: 11, stop: 4, flash: 0.3, color: 0xA855F7, zoom: 1.2, colors: [...BAT_RED, SONIC], sound: 'chomp' }));
  tl.at(90, () => h.idle());
  tl.end(106);
};

// ---------------------------------------------------------------------------------------------
// GOBLIN SCOUT: a cheap-shot artist. Quick stabs, smoke bombs, slings and bombs.

const goblinRustyShank: MoveFn = (h, tl) => {
  const c = contact(h, 28);
  tl.at(0, () => {
    h.anim('Run', true);
    h.sound('chitter');
    h.sound('dash');
  });
  travel(h, tl, 0, 14, { x: 0, y: 0 }, c, easeIn, 8);
  tl.every(0, 14, 2, () => {
    dustAtFeet(h, 2, 1);
    h.streaks(h.pos().x + 10, h.pos().y - 20, 24, [0xA8A29E, BONE]);
  });
  [16, 26, 36].forEach((f, i) => {
    tl.at(f, () => {
      h.anim('Attack');
      h.sound('whoosh_fast');
    });
    tl.during(f, f + 8, (t) => h.offset(c.x - arc(t) * 10, c.y));
    drawSpan(h, tl, f + 3, f + 10, (g, t) => {
      const p = chest(h);
      const y = p.y + (i - 1) * 8;
      fx.lance(g, p.x + 26, y, lerp(p.x + 18, p.x - 6, easeOut(t * 2)), y + 2, 4, fx.pal(0x78716C, 0xD6D3D1), 1 - t);
    });
    tl.at(f + 5, () => (i < 2 ? chip(h, [0xA8A29E, BLOOD, BONE], 3, 5, 'stab') : land(h, { kb: 8, shake: 8, stop: 4, zoom: 1.2, colors: [BLOOD, BONE, 0xA8A29E], sound: 'stab' })));
  });
  tl.at(48, () => {
    h.sound('jump');
    h.sound('chitter', { rate: 1.2 });
  });
  retreat(h, tl, 48, 66, c, 26);
  tl.at(66, () => h.idle());
  tl.end(68);
};

const goblinSneakPounce: MoveFn = (h, tl) => {
  const land0 = { x: contact(h, 18).x, y: contact(h, 18).y };
  tl.at(0, () => {
    h.anim('Attack');
    h.sound('toss');
  });
  // Smoke bomb at its own feet
  projectile(h, tl, 4, 8, () => crown(h, 0.6), () => ({ x: h.home.x - 6, y: h.home.y - 2 }), 10,
    (g, x, y) => orb(g, x, y, 3, [0x57534E, 0x292524, 0x1C1917]),
    () => {
      puff(h, h.home.x, h.home.y, SMOKE, 30);
      puff(h, h.home.x, h.home.y - 16, [...SMOKE, 0x78716C], 20);
      boom(h, h.home.x, h.home.y - 6, 0.7);
      h.sound('poison', { vol: 0.5, rate: 0.7 });
    });
  tl.during(12, 18, (t) => h.alpha(1 - t));
  tl.at(14, () => h.camera(1.16, h.knight.x + 20, h.knight.y - 40, 50));
  tl.at(20, () => {
    h.offset(land0.x, land0.y);
    h.lift(170);
  });
  // A glint above the knight gives the attentive player a beat
  drawSpan(h, tl, 30, 44, (g, t) => {
    const x = h.knight.x + 24;
    const y = h.knight.y - 108;
    const a = arc(t);
    g.moveTo(x - 8 * a, y).lineTo(x + 8 * a, y).stroke({ width: 1.5, color: 0xFFFFFF, alpha: a });
    g.moveTo(x, y - 8 * a).lineTo(x, y + 8 * a).stroke({ width: 1.5, color: 0xFFFFFF, alpha: a });
  });
  tl.at(32, () => h.sound('equip', { vol: 0.4, rate: 1.6 })); // glint
  tl.at(42, () => h.sound('chitter', { rate: 1.1 }));
  tl.at(44, () => {
    h.alpha(1);
    h.anim('Attack');
    h.sound('whistle', { rate: 2 });
  });
  tl.during(44, 52, (t) => {
    h.lift(lerp(170, 0, easeIn(t)));
    h.stretch(0.85, 1.25);
  });
  tl.every(44, 52, 1, () => h.streaks(h.pos().x, h.pos().y - 60, 30, [0xA8A29E, BONE]));
  drawSpan(h, tl, 50, 60, (g, t) => {
    const p = chest(h);
    fx.crescent(g, p.x + 8, p.y - 6, 22, -Math.PI * 0.55, -Math.PI * 0.55 + Math.PI * 1.1 * easeOut(t), 6, fx.pal(0xA8A29E, BONE), 1 - t * 0.6);
  });
  tl.at(52, () => {
    h.stretch(1.3, 0.75);
    crater(h, feet(h).x + 8, feet(h).y, 1, 'ShockWave_3');
    dustAtFeet(h, 10, -1);
    dustAtFeet(h, 10, 1);
    land(h, { kb: 14, shake: 13, stop: 6, flash: 0.35, zoom: 1.3, colors: [BLOOD, BONE, 0xA8A29E], ring: 0xA8A29E, sound: 'slash_heavy' });
    h.sound('thud');
  });
  tl.during(52, 62, (t) => h.stretch(lerp(1.3, 1, t), lerp(0.75, 1, t)));
  tl.at(66, () => h.anim('Run', true));
  retreat(h, tl, 66, 88, land0, 30);
  tl.at(88, () => h.idle());
  tl.end(90);
};

const goblinSlingStone: MoveFn = (h, tl) => {
  const hand = () => crown(h, 1.05, 2);
  tl.at(0, () => {
    h.anim('Idle', true);
    h.camera(1.15, h.home.x - 10, h.home.y - 30, 24);
  });
  // Sling whirls overhead, speeding up
  drawSpan(h, tl, 0, 30, (g, t, f) => {
    const p = hand();
    const ang = f * lerp(0.25, 0.8, t);
    const sx = p.x + Math.cos(ang) * 10;
    const sy = p.y - 4 + Math.sin(ang) * 4;
    g.moveTo(p.x, p.y).lineTo(sx, sy).stroke({ width: 1, color: 0x78350F });
    g.ellipse(p.x, p.y - 4, 10, 4).stroke({ width: 1, color: 0xFFFFFF, alpha: 0.3 * t });
    g.circle(sx, sy, 2.5).fill({ color: 0x78716C }).stroke({ width: 1, color: INK });
  });
  tl.every(4, 30, 7, () => h.sound('whoosh_fast', { rate: 0.8 + (tl.frame / 30) * 0.6, vol: 0.4 + (tl.frame / 30) * 0.4 }));
  tl.at(30, () => {
    h.anim('Attack');
    h.sound('toss');
  });
  projectile(h, tl, 32, 10, hand, () => head(h), 6,
    (g, x, y, t) => {
      g.circle(x, y, 3).fill({ color: 0x78716C }).stroke({ width: 1, color: INK });
      g.rect(x - 1.5, y - 1.5, 1.5, 1.5).fill({ color: 0xD6D3D1 });
      g.moveTo(x, y).lineTo(x + 14, y - 1).stroke({ width: 1, color: 0xFFFFFF, alpha: 0.5 });
    },
    () => {
      const p = head(h);
      h.emit(p.x, p.y, { count: 8, colors: [0x78716C, 0xA8A29E], speed: [1, 2.5], spread: Math.PI, gravity: 0.2, size: 2, life: [12, 20] });
      land(h, { kb: 9, shake: 9, stop: 5, zoom: 1.24, colors: [GOLD, BONE, 0xA8A29E], at: p, sound: 'wood' });
    });
  // Bonk stars circle the knight's head
  drawSpan(h, tl, 44, 80, (g, t, f) => {
    const p = head(h);
    for (let k = 0; k < 3; k++) {
      const a = f * 0.2 + (k * Math.PI * 2) / 3;
      fx.starburst(g, p.x + Math.cos(a) * 10, p.y - 10 + Math.sin(a) * 3, 3, 4, f * 0.2, fx.pal(GOLD, 0xFFFFFF), 1 - t);
    }
  });
  tl.at(48, () => h.sound('heal', { rate: 1.8, vol: 0.4 })); // dizzy stars
  tl.at(60, () => {
    h.idle();
    h.sound('chitter');
  });
  tl.end(82);
};

const goblinFirebomb: MoveFn = (h, tl) => {
  const hand = () => crown(h, 0.95, 0);
  const fuse = (g: Graphics, x: number, y: number, f: number) => {
    g.circle(x, y, 5).fill({ color: 0x292524 }).stroke({ width: 1.5, color: INK });
    g.circle(x - 1.5, y - 1.5, 1.5).fill({ color: 0x78716C });
    g.moveTo(x + 2, y - 4).lineTo(x + 4, y - 8).stroke({ width: 1, color: 0xA16207 });
    fx.starburst(g, x + 4, y - 9, 2.5 + (f % 4 < 2 ? 1 : 0), 5, f * 0.5, fx.pal(EMBER, GOLD));
  };
  tl.at(0, () => {
    h.anim('Idle', true);
    h.sound('chitter');
    h.sound('fire_burst', { vol: 0.3, rate: 1.8 });
  });
  // Lights the fuse with a wicked shake
  drawSpan(h, tl, 0, 24, (g, t, f) => {
    const p = hand();
    fuse(g, p.x, p.y, f);
  });
  tremble(h, tl, 4, 24, { x: 0, y: 0 }, 1, 3);
  tl.every(4, 24, 6, () => h.sound('zap', { vol: 0.15, rate: 2 })); // fuse sputter
  tl.every(0, 24, 3, () => h.emit(hand().x + 4, hand().y - 9, { count: 1, colors: FIRE, speed: [0.5, 1.2], angle: -Math.PI / 2, spread: 1, gravity: 0.05, size: 1, life: [6, 10] }));
  tl.at(24, () => {
    h.anim('Attack');
    h.sound('toss');
  });
  tl.at(36, () => h.sound('whistle', { vol: 0.6, rate: 1.3 }));
  warnRing(h, tl, 24, 56, EMBER, 26);
  tl.at(26, () => h.camera(1.18, (h.home.x + h.knight.x) / 2, h.knight.y - 50, 40));
  let spin = 0;
  projectile(h, tl, 26, 28, hand, () => ({ x: h.knight.x + 8, y: h.knight.y - 8 }), 70,
    (g, x, y) => {
      spin += 0.4;
      fuse(g, x, y, spin * 4);
    },
    () => {
      const p = feet(h);
      h.emit(p.x, p.y - 10, { count: 34, colors: [...FIRE, 0x292524], speed: [1.5, 4.5], angle: -Math.PI / 2, spread: 1.3, gravity: 0.12, size: 3, life: [16, 28] });
      h.emit(p.x, p.y - 14, { count: 10, colors: SMOKE, speed: [0.3, 0.9], angle: -Math.PI / 2, spread: 0.7, gravity: -0.04, size: 6, life: [30, 46] });
      h.shockwave(p.x, p.y, EMBER);
      boom(h, p.x, p.y - 10, 1.3);
      land(h, { kb: 14, shake: 14, stop: 6, flash: 0.55, color: EMBER, zoom: 1.28, colors: FIRE, ring: GOLD, sound: 'impact_heavy' });
    },
    (x, y) => h.emit(x, y, { count: 1, colors: SMOKE, speed: [0, 0.3], spread: Math.PI, gravity: -0.02, size: 2, life: [10, 16] }));
  drawSpan(h, tl, 54, 72, (g, t) => fx.starburst(g, feet(h).x, feet(h).y - 16, 30 * easeOut(t), 9, t, fx.pal(EMBER, GOLD), 1 - t));
  puddle(h, tl, 54, 110, 24, 0x1C1917, EMBER);
  // Cackle hop
  tl.at(66, () => h.sound('chitter', { rate: 1.3 }));
  tl.during(64, 80, (t) => h.lift(Math.abs(Math.sin(t * Math.PI * 2)) * 8));
  tl.at(80, () => h.idle());
  tl.end(110);
};

// ---------------------------------------------------------------------------------------------
// SPORE MUSHROOM: big, round and squishy. Spores, swelling caps, a mycelium web under the floor.

const shroomSporeCloud: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('action_1');
    h.sound('squelch', { rate: 0.7, vol: 0.6 });
  });
  tl.during(0, 16, (t) => h.stretch(1 + 0.12 * easeOut(t), 1 - 0.1 * easeOut(t)));
  tl.at(16, () => {
    h.stretch(0.9, 1.15);
    h.sound('whoosh_heavy', { rate: 0.8 });
    h.sound('poison', { rate: 0.7, vol: 0.6 });
  });
  tl.during(16, 30, (t) => h.stretch(lerp(0.9, 1, t), lerp(1.15, 1, t)));
  // A cloud billows toward the knight
  drawSpan(h, tl, 16, 82, (g, t, f) => {
    const s = crown(h, 0.8, -10);
    const e = chest(h);
    const travelT = easeOut(Math.min(1, f / 30));
    const cx = lerp(s.x, e.x, travelT);
    const cy = lerp(s.y, e.y, travelT);
    const fade = f > 50 ? 1 - (f - 50) / 16 : 1;
    for (let k = 0; k < 7; k++) {
      const a = k * 0.9 + f * 0.04;
      const r = (8 + k * 1.6) * (0.5 + travelT * 0.6);
      g.circle(cx + Math.cos(a) * 12 * travelT, cy + Math.sin(a) * 8 * travelT, r).fill({ color: k % 2 ? 0xFEF08A : 0xCA8A04, alpha: 0.28 * fade });
    }
  });
  tl.every(20, 60, 2, () => {
    const e = chest(h);
    h.emit(e.x + rand(-14, 14), e.y + rand(-14, 14), { count: 1, colors: SPORE_Y, speed: [0.2, 0.6], spread: Math.PI, gravity: -0.01, size: 2, life: [20, 34] });
  });
  [44, 54].forEach((f) => tl.at(f, () => chip(h, SPORE_Y, 2, 3, 'hiss')));
  tl.at(40, () => h.vfx('poison', chest(h).x, chest(h).y, { size: 1.1, tint: 0xFFE680 }));
  tl.at(64, () => {
    h.flash(0.25, 0xFDE047);
    land(h, { kb: 5, shake: 6, colors: SPORE_Y, sound: 'poison' });
  });
  tl.end(84);
};

const shroomToxicBurst: MoveFn = (h, tl) => {
  const c = contact(h, 100);
  tl.at(0, () => {
    h.anim('walk', true);
    h.sound('squelch', { vol: 0.6 });
  });
  // Hop-waddle up to the knight
  travel(h, tl, 0, 30, { x: 0, y: 0 }, c, easeInOut);
  tl.every(0, 30, 10, () => h.sound('squelch', { vol: 0.4, rate: rand(1.1, 1.4) }));
  tl.during(0, 30, (t, f) => {
    h.lift(Math.abs(Math.sin(f * 0.32)) * 10);
    h.stretch(1 + Math.sin(f * 0.64) * 0.06, 1 - Math.sin(f * 0.64) * 0.06);
  });
  tl.at(30, () => {
    h.lift(0);
    h.anim('action_1');
    h.camera(1.12, (h.knight.x + h.pos().x) / 2, h.knight.y - 40, 50);
  });
  // Swells up, cap bulging and flashing toxic
  tl.during(30, 60, (t, f) => {
    const w = Math.sin(f * 1.2) * 0.03 * t;
    h.stretch(1 + 0.14 * easeIn(t) + w, 1 + 0.1 * easeIn(t) - w);
  });
  chargeTint(h, tl, 34, 60, 0xC4F28C, 0.9);
  tl.at(34, () => h.sound('gurgle'));
  tl.every(34, 60, 3, () => h.emit(h.pos().x + rand(-20, 20), h.pos().y - h.height * rand(0.5, 1), { count: 1, colors: VENOM, speed: [0.2, 0.6], angle: -Math.PI / 2, spread: 0.6, gravity: -0.02, size: 2, life: [16, 24] }));
  tl.at(60, () => {
    const p = h.pos();
    h.stretch(0.94, 1.06);
    h.emit(p.x - 24, p.y - h.height * 0.6, { count: 40, colors: [...VENOM, ...GOO], speed: [2, 5], angle: Math.PI, spread: 1.2, gravity: 0.2, size: 3, life: [16, 30] });
    h.shockwave(p.x - 10, p.y - h.height * 0.6, 0xA3E635);
    toxic(h, p.x - 30, p.y - h.height * 0.45, 1.6);
    land(h, { kb: 14, shake: 15, stop: 7, flash: 0.55, color: 0xA3E635, colors: [...VENOM, BONE], ring: 0x65A30D, sound: 'splat' });
    h.sound('explosion', { vol: 0.5, rate: 1.3 });
  });
  drawSpan(h, tl, 60, 74, (g, t) => fx.starburst(g, h.pos().x - 16, h.pos().y - h.height * 0.6, 34 * easeOut(t), 10, 0.3, fx.pal(0x65A30D, 0xECFCCB), 1 - t));
  puddle(h, tl, 62, 130, 30, 0x365314, 0x84CC16);
  tl.every(66, 110, 5, () => h.emit(feet(h).x + rand(-20, 20), feet(h).y - 2, { count: 1, colors: [0x65A30D, 0xA8A29E], speed: [0.2, 0.5], angle: -Math.PI / 2, spread: 0.3, gravity: -0.03, size: 4, life: [24, 36] }));
  tl.during(60, 72, (t) => h.stretch(lerp(0.94, 1, easeOut(t)), lerp(1.06, 1, easeOut(t))));
  tl.at(78, () => h.anim('walk', true));
  retreat(h, tl, 78, 108, c, 16);
  tl.at(108, () => h.idle());
  tl.end(130);
};

const shroomFungalGuard: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('action_1');
    h.sound('squelch', { rate: 0.7, vol: 0.5 });
  });
  tl.at(10, () => h.sound('wood', { rate: 1.4, vol: 0.5 }));
  tl.during(0, 20, (t) => h.stretch(1 + 0.1 * t, 1 - 0.12 * t));
  tl.at(20, () => {
    h.tint(0xE7C9A9);
    h.stretch(1, 1);
  });
  // Toadstools sprout in a ring
  drawSpan(h, tl, 10, 60, (g, t, f) => {
    const p = h.pos();
    const up = f < 12 ? easeOut(f / 12) : f > 40 ? 1 - (f - 40) / 20 : 1;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const x = p.x + Math.cos(a) * 30;
      const y = p.y + Math.sin(a) * 6;
      const hh = (8 + (k % 3) * 3) * up;
      g.rect(x - 1, y - hh, 2, hh).fill({ color: 0xFEF3C7 }).stroke({ width: 1, color: INK });
      g.ellipse(x, y - hh, 5 * up, 3 * up).fill({ color: 0xB91C1C }).stroke({ width: 1, color: INK });
      g.rect(x - 2, y - hh - 1, 1, 1).fill({ color: 0xFFFFFF });
    }
  }, 'ground');
  guard(h, tl, 6, [0xFEF3C7, 0xB91C1C, 0xA16207], (g, cx, cy, grow, fade, f) => {
    hexWard(g, cx, cy, 34 * grow, f * 0.01, 0xD97706, 0xFEF3C7, fade);
  });
  tl.at(56, () => h.tint(0xFFFFFF));
  tl.end(62);
};

const shroomMyceliumSnare: MoveFn = (h, tl) => {
  tl.at(0, () => h.anim('action_1'));
  tl.during(0, 14, (t) => h.stretch(1 + 0.08 * t, 1 - 0.1 * t));
  tl.at(14, () => {
    h.stretch(1, 1);
    h.shake(4);
    h.sound('crack', { vol: 0.5, rate: 1.4 });
    h.sound('magic', { vol: 0.5, rate: 0.6 });
  });
  // Glowing mycelium threads race across the floor
  const veins = [-6, 0, 5].map((dy) => ({ dy, wob: rand(0, 6) }));
  drawSpan(h, tl, 14, 90, (g, t, f) => {
    const reach = easeOut(Math.min(1, f / 24));
    const fade = f > 60 ? 1 - (f - 60) / 16 : 1;
    for (const v of veins) {
      const x0 = h.home.x - 10;
      const x1 = lerp(x0, h.knight.x + 6, reach);
      g.moveTo(x0, h.home.y + v.dy * 0.3);
      for (let i = 1; i <= 10; i++) {
        const u = i / 10;
        g.lineTo(lerp(x0, x1, u), lerp(h.home.y, h.knight.y, u) + v.dy * 0.4 + Math.sin(u * 9 + v.wob) * 2);
      }
      g.stroke({ width: 2, color: 0x2DD4BF, alpha: 0.85 * fade });
    }
  }, 'ground');
  tl.at(38, () => h.camera(1.24, h.knight.x + 10, h.knight.y - 26, 40));
  // Toadstools burst up around the knight, then pop
  const caps = [-22, -8, 8, 22];
  caps.forEach((dx, i) => {
    const f0 = 38 + i * 4;
    drawSpan(h, tl, f0, 70, (g, t, f) => {
      const x = h.knight.x + 6 + dx;
      const y = h.knight.y + (i % 2 ? 2 : -1);
      const up = easeOut(Math.min(1, f / 6));
      const hh = 14 * up;
      g.rect(x - 1.5, y - hh, 3, hh).fill({ color: 0xFEF3C7 }).stroke({ width: 1, color: INK });
      g.ellipse(x, y - hh, 7 * up, 4 * up).fill({ color: f > 24 && f % 4 < 2 ? 0xFFFFFF : 0x0D9488 }).stroke({ width: 1, color: INK });
      g.rect(x - 3, y - hh - 1, 1.5, 1.5).fill({ color: 0x99F6E4 });
    });
    tl.at(f0, () => {
      h.emit(h.knight.x + 6 + dx, h.knight.y - 2, { count: 4, colors: DIRT, speed: [0.6, 1.6], angle: -Math.PI / 2, spread: 0.6, gravity: 0.15, size: 2, life: [10, 16] });
      h.shake(2);
      h.sound('squelch', { vol: 0.5, rate: 1.2 + i * 0.1 });
    });
  });
  tl.at(70, () => {
    h.vfx('poison', h.knight.x + 6, h.knight.y - 18, { size: 1.3, tint: 0x8CFFEA });
    for (const dx of caps) h.emit(h.knight.x + 6 + dx, h.knight.y - 14, { count: 10, colors: [0x2DD4BF, 0x99F6E4, 0xFFFFFF], speed: [1, 3], spread: Math.PI, gravity: 0.02, size: 2, life: [16, 26] });
    land(h, { kb: 8, shake: 10, stop: 4, flash: 0.3, color: 0x2DD4BF, colors: [0x2DD4BF, 0x99F6E4, BONE], ring: 0x0D9488, sound: 'splat' });
  });
  tl.end(92);
};

// ---------------------------------------------------------------------------------------------
// BROOD SPIDER: the rig only idles, so everything is body language: skitter, rear up, lunge.

const spiderVenomFangs: MoveFn = (h, tl) => {
  const c = contact(h, 34);
  // Skitter in with a jittery gait
  tl.during(0, 18, (t, f) => {
    const e = easeIn(t);
    h.offset(lerp(0, c.x, e), lerp(0, c.y, e) + (f % 4 < 2 ? -1 : 1));
  });
  tl.every(0, 18, 2, () => dustAtFeet(h, 1, 1));
  tl.at(0, () => h.sound('chitter', { rate: 0.7 }));
  tl.at(18, () => h.sound('hiss'));
  // Rear up, fangs bared
  lean(h, tl, 18, 30, 0.35, 8);
  tl.during(18, 30, (t) => h.stretch(1 - 0.1 * t, 1 + 0.15 * t));
  drawSpan(h, tl, 22, 34, (g, t) => {
    const p = crown(h, 0.4, -20);
    g.rect(p.x - 1, p.y + 4, 2, 3 * t).fill({ color: VENOM[1] });
  });
  tl.at(30, () => h.sound('whoosh_fast'));
  tl.during(30, 36, (t) => h.stretch(lerp(0.9, 1.15, t), lerp(1.15, 0.85, t)));
  drawSpan(h, tl, 32, 44, (g, t) => {
    const p = chest(h);
    jaws(g, p.x + 6, p.y, Math.min(1, t * 2.5), 0xECFCCB, 0x3F6212);
  });
  tl.at(36, () => {
    const p = chest(h);
    h.emit(p.x, p.y, { count: 16, colors: VENOM, speed: [1, 3], spread: Math.PI, gravity: 0.15, size: 2, life: [14, 24] });
    toxic(h, p.x, p.y, 0.8);
    land(h, { kb: 8, shake: 9, stop: 5, zoom: 1.24, colors: [...VENOM, BONE], sound: 'chomp' });
  });
  tl.during(36, 46, (t) => h.stretch(lerp(1.15, 1, t), lerp(0.85, 1, t)));
  // Venom drips and bubbles on the knight
  tl.every(40, 80, 5, () => {
    const p = chest(h);
    h.emit(p.x + rand(-8, 8), p.y + rand(-6, 6), { count: 1, colors: VENOM, speed: [0.1, 0.3], angle: Math.PI / 2, spread: 0.2, gravity: 0.08, size: 2, life: [14, 20] });
  });
  retreat(h, tl, 48, 66, c);
  tl.end(80);
};

const spiderSilkCocoon: MoveFn = (h, tl) => {
  const c = contact(h, 32);
  const spinneret = () => crown(h, 0.4, 14);
  tl.at(0, () => h.sound('hiss', { vol: 0.6 }));
  tl.at(0, () => h.camera(1.14, (h.home.x + h.knight.x) / 2, h.knight.y - 30, 70));
  lean(h, tl, 0, 12, -0.25, 6); // rear back
  // Webs shoot in three strands
  [12, 20, 28].forEach((f, i) => {
    tl.at(f, () => h.sound('web', { rate: 1 + i * 0.1 }));
    drawSpan(h, tl, f, 80, (g, t, ff) => {
      const s = spinneret();
      const e = chest(h);
      const reach = easeOut(Math.min(1, ff / 8));
      const ty = e.y + (i - 1) * 12;
      const ex = lerp(s.x, e.x, reach);
      const ey = lerp(s.y, ty, reach);
      const sag = Math.sin(ff * 0.3) * 2 + 6;
      const fade = ff > 52 ? 1 - (ff - 52) / 16 : 1;
      g.moveTo(s.x, s.y).quadraticCurveTo((s.x + ex) / 2, (s.y + ey) / 2 + sag, ex, ey).stroke({ width: 2.5, color: INK, alpha: 0.5 * fade });
      g.moveTo(s.x, s.y).quadraticCurveTo((s.x + ex) / 2, (s.y + ey) / 2 + sag, ex, ey).stroke({ width: 1, color: 0xF5F5F4, alpha: 0.95 * fade });
    });
  });
  // Cocoon wraps the knight
  drawSpan(h, tl, 34, 84, (g, t, f) => {
    const p = chest(h);
    const wrap = easeOut(Math.min(1, f / 18));
    const fade = f > 34 ? 1 - (f - 34) / 16 : 1;
    g.ellipse(p.x, p.y + 4, 18 * wrap, 32 * wrap).fill({ color: 0xE7E5E4, alpha: 0.35 * fade });
    for (let k = 0; k < 9 * wrap; k++) {
      const y = p.y - 26 + k * 6.5;
      g.moveTo(p.x - 17, y).quadraticCurveTo(p.x, y + 5, p.x + 17, y - 2).stroke({ width: 1.2, color: 0xF5F5F4, alpha: 0.9 * fade });
    }
  });
  tl.at(34, () => h.sound('squelch', { rate: 1.3 }));
  tl.at(44, () => chip(h, [0xF5F5F4, 0xA8A29E], 1, 3, 'web'));
  tl.at(56, () => h.sound('chitter', { rate: 0.7 }));
  // Then the bite on the bound knight
  tl.during(56, 66, (t, f) => h.offset(lerp(0, c.x, easeIn(t)), lerp(0, c.y, easeIn(t)) + (f % 4 < 2 ? -1 : 1)));
  lean(h, tl, 62, 68, 0.35, 10);
  drawSpan(h, tl, 64, 76, (g, t) => jaws(g, chest(h).x + 4, chest(h).y, Math.min(1, t * 2.5), 0xECFCCB, 0x3F6212));
  tl.at(68, () => {
    h.emit(chest(h).x, chest(h).y, { count: 24, colors: [0xF5F5F4, ...VENOM], speed: [1.5, 4], spread: Math.PI, gravity: 0.12, size: 2, life: [14, 26] });
    land(h, { kb: 14, shake: 13, stop: 7, flash: 0.4, color: 0xECFCCB, zoom: 1.3, colors: [...VENOM, BONE], sound: 'chomp' });
  });
  retreat(h, tl, 78, 98, c);
  tl.end(100);
};

const spiderSkitterLunge: MoveFn = (h, tl) => {
  const c = contact(h, 30);
  // Zig-zag dash across lanes, leaving afterimage dust
  const pts = [{ x: 0, y: 0 }, { x: c.x * 0.35, y: c.y - 12 }, { x: c.x * 0.7, y: c.y + 12 }, c];
  for (let i = 0; i < 3; i++) {
    travel(h, tl, i * 7, i * 7 + 7, pts[i], pts[i + 1], easeIn);
    tl.at(i * 7, () => {
      dustAtFeet(h, 4, 1);
      h.sound('dash', { rate: 1.2 + i * 0.1, vol: 0.7 });
      h.sound('chitter', { rate: 0.7, vol: 0.6 });
    });
  }
  tl.every(0, 21, 1, () => h.streaks(h.pos().x + 16, h.pos().y - 14, 22, [0x57534E, 0x78350F]));
  // Stabbing forelegs
  [22, 28, 34].forEach((f, i) => {
    lean(h, tl, f, f + 3, 0.2 + i * 0.05, 3);
    drawSpan(h, tl, f, f + 8, (g, t) => {
      const p = chest(h);
      const y = p.y + (i - 1) * 10;
      fx.lance(g, p.x + 30, y - 6, lerp(p.x + 20, p.x - 4, easeOut(t * 2)), y + 2, 3, fx.pal(0x44403C, 0xA8A29E), 1 - t);
    });
    tl.at(f + 3, () => (i < 2 ? chip(h, [0x57534E, BLOOD, BONE], 3, 5, 'stab') : land(h, { kb: 10, shake: 10, stop: 4, zoom: 1.2, colors: [BLOOD, BONE], sound: 'stab' })));
  });
  retreat(h, tl, 46, 64, c);
  tl.end(66);
};

const spiderBroodSwarm: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.camera(1.1, 230, h.knight.y - 20, 80);
    h.sound('hiss');
    h.sound('gurgle', { rate: 0.7, vol: 0.6 });
  });
  tremble(h, tl, 0, 24, { x: 0, y: 0 }, 1.2, 3);
  tl.during(0, 24, (t) => h.stretch(1 + 0.1 * t, 1 + 0.06 * t));
  tl.at(24, () => {
    h.stretch(1, 1);
    puff(h, h.home.x, h.home.y, [0x57534E, 0x292524], 12);
    h.sound('squelch');
    h.sound('swarm', { rate: 1.3 });
  });
  // Spiderlings pour out across the floor toward the knight and climb on
  const n = 16;
  for (let i = 0; i < n; i++) {
    const start = 22 + i * 2;
    const lane = rand(-10, 8);
    const sz = rand(4.5, 6.5);
    const climb = rand(4, 40);
    drawSpan(h, tl, start, start + 40, (g, t, f) => {
      const run = Math.min(1, t * 1.5);
      const x = lerp(h.home.x - 10, h.knight.x + 8 + lane * 0.5, easeIn(run));
      const y = lerp(h.home.y + lane * 0.4, h.knight.y + lane * 0.2, run) - (t > 0.66 ? (t - 0.66) * 3 * climb : 0);
      crawler(g, x, y, sz, f * 1.4, i % 2 ? 0x57534E : 0x44403C, 0xFF3366);
    });
  }
  tl.every(26, 66, 6, () => h.sound('chitter', { vol: 0.6, rate: rand(0.6, 0.9) }));
  [50, 58].forEach((f) => tl.at(f, () => chip(h, [0x57534E, BLOOD], 2, 4, 'chomp')));
  tl.at(66, () => {
    h.emit(chest(h).x, chest(h).y, { count: 20, colors: [0x292524, 0x57534E, BLOOD], speed: [1, 3], spread: Math.PI, gravity: 0.15, size: 2, life: [14, 24] });
    land(h, { kb: 10, shake: 10, stop: 4, zoom: 1.22, colors: [BLOOD, 0x57534E, BONE], sound: 'chomp' });
  });
  tl.end(86);
};

// ---------------------------------------------------------------------------------------------
// CLIFF HARPY: aerial, shrill, all swoops and razor feathers.

const harpyTalonRake: MoveFn = (h, tl) => {
  const c = contact(h, 30);
  tl.at(0, () => {
    h.anim('Move', true);
    h.sound('flap');
    h.sound('screech', { vol: 0.6 });
  });
  tl.at(10, () => h.sound('whoosh_heavy', { rate: 1.2 }));
  // Swoop: a low arc that dips toward the knight
  tl.during(0, 20, (t) => {
    const e = easeIn(t);
    h.offset(lerp(0, c.x, e), lerp(0, c.y, e));
    h.lift(arc(t) * 40 + 12 * (1 - t));
  });
  tl.every(4, 20, 2, () => h.streaks(h.pos().x + 10, h.pos().y - 40, 30, FEATHER));
  tl.at(20, () => h.anim('Attack_01'));
  [30, 38].forEach((f, i) => {
    drawSpan(h, tl, f, f + 10, (g, t) => {
      const p = chest(h);
      g.alpha = 1 - t;
      clawRake(g, p.x + i * 4, p.y - 6 + i * 6, i ? -1 : 1, 22 + 8 * easeOut(Math.min(1, t * 3)), 0xBE185D);
    });
    tl.at(f, () => (i === 0 ? chip(h, [...FEATHER, BLOOD], 4, 5, 'claw') : land(h, { kb: 9, shake: 10, stop: 4, zoom: 1.2, colors: [...FEATHER, BLOOD], sound: 'claw' })));
  });
  tl.at(50, () => {
    h.anim('Move', true);
    h.sound('flap');
  });
  tl.during(50, 74, (t) => {
    const e = easeInOut(t);
    h.offset(lerp(c.x, 0, e), lerp(c.y, 0, e));
    h.lift(arc(t) * 50);
  });
  tl.every(52, 70, 4, () => h.emit(h.pos().x, h.pos().y - 30, { count: 1, colors: FEATHER, speed: [0.2, 0.5], angle: Math.PI / 2, spread: 1, gravity: 0.02, size: 2, life: [30, 40] }));
  tl.end(76);
};

const harpyCyclone: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('Move', true);
    h.camera(1.12, (h.home.x + h.knight.x) / 2, h.knight.y - 40, 100);
  });
  tl.during(0, 20, (t) => h.lift(easeOut(t) * 30));
  dimSpan(h, tl, 0, 110, 0.3, 0x1E293B);
  // Wing-beats and a shrill scream wind up the cyclone
  tl.every(6, 30, 6, () => {
    h.sound('flap', { vol: 0.7 });
    h.shake(3);
    h.emit(h.pos().x - 10, h.pos().y - 40, { count: 6, colors: [0xE2E8F0, 0x94A3B8], speed: [1.5, 3], angle: Math.PI, spread: 0.4, gravity: 0, size: 2, life: [12, 20] });
  });
  drawSpan(h, tl, 10, 34, (g, t) => shoutRings(g, crown(h, 1).x, crown(h, 1).y - 30, t, 0xF9A8D4, 3, 70));
  tl.at(10, () => h.sound('screech'));
  tl.at(28, () => h.sound('spin', { rate: 0.7 }));
  tl.at(52, () => h.sound('spin', { rate: 0.8 }));
  // Tornado travels to the knight and grinds on it
  drawSpan(h, tl, 28, 96, (g, t, f) => {
    const s = h.pos().x - 20;
    const run = easeInOut(Math.min(1, f / 26));
    const x = lerp(s, h.knight.x + 6, run);
    const base = h.knight.y;
    const fade = f > 56 ? 1 - (f - 56) / 12 : 1;
    for (let k = 0; k < 9; k++) {
      const y = base - k * 9;
      const w = 6 + k * 3.2;
      const sway = Math.sin(f * 0.3 + k * 0.7) * (2 + k * 0.6);
      g.ellipse(x + sway, y, w, w * 0.28).stroke({ width: 3, color: INK, alpha: 0.35 * fade });
      g.ellipse(x + sway, y, w, w * 0.28).stroke({ width: 1.5, color: k % 2 ? 0xE2E8F0 : 0xF9A8D4, alpha: 0.8 * fade });
    }
  });
  tl.every(28, 84, 2, () => {
    const x = h.knight.x + rand(-20, 20);
    h.emit(x, h.knight.y - rand(0, 70), { count: 1, colors: [...FEATHER, 0xE2E8F0], speed: [1.5, 2.5], angle: rand(0, Math.PI * 2), spread: 0.2, gravity: -0.02, size: 2, life: [10, 16] });
  });
  [56, 64, 72].forEach((f) => tl.at(f, () => chip(h, [0xE2E8F0, ...FEATHER], 3, 5, 'whoosh_fast')));
  tl.at(84, () => land(h, { kb: 14, shake: 13, stop: 6, flash: 0.35, color: 0xF9A8D4, zoom: 1.26, colors: [0xE2E8F0, ...FEATHER, BONE], sound: 'whoosh_heavy' }));
  tl.during(90, 108, (t) => h.lift(lerp(30, 0, easeInOut(t))));
  tl.at(108, () => h.idle());
  tl.end(112);
};

const harpyAerialDive: MoveFn = (h, tl) => {
  const c = contact(h, 24);
  tl.at(0, () => {
    h.anim('Move', true);
    h.sound('flap');
    h.sound('flap', { delay: 0.25, rate: 1.1 });
  });
  tl.during(0, 22, (t) => h.lift(easeIn(t) * 200));
  tl.every(0, 22, 4, () => h.emit(h.pos().x, h.pos().y - 30, { count: 2, colors: FEATHER, speed: [0.3, 0.6], angle: Math.PI / 2, spread: 0.8, gravity: 0.02, size: 2, life: [24, 36] }));
  tl.at(22, () => {
    h.offset(c.x + 120, c.y);
    h.camera(1.22, h.knight.x + 20, h.knight.y - 40, 30);
  });
  tl.at(26, () => h.sound('screech'));
  tl.at(32, () => h.sound('whistle', { rate: 1.5 }));
  // Diagonal stoop, like a falcon
  tl.during(34, 44, (t) => {
    const e = easeIn(t);
    h.offset(lerp(c.x + 120, c.x, e), c.y);
    h.lift(lerp(200, 10, e));
    h.tilt(-0.5);
  });
  tl.every(34, 44, 1, () => h.streaks(h.pos().x + 16, h.pos().y - 30, 40, FEATHER));
  tl.at(44, () => {
    h.tilt(0);
    h.anim('Attack_01');
    h.emit(chest(h).x, chest(h).y, { count: 14, colors: FEATHER, speed: [1, 3], spread: Math.PI, gravity: 0.03, size: 2, life: [24, 40] });
    crater(h, h.knight.x + 8, h.knight.y, 0.9, 'ShockWave_3');
    land(h, { kb: 12, shake: 12, stop: 6, flash: 0.35, color: 0xFFF1F2, zoom: 1.28, colors: [...FEATHER, BLOOD], ring: 0xF472B6, sound: 'claw' });
  });
  tl.at(60, () => {
    h.anim('Move', true);
    h.sound('flap');
  });
  tl.during(60, 84, (t) => {
    const e = easeInOut(t);
    h.offset(lerp(c.x, 0, e), lerp(c.y, 0, e));
    h.lift(lerp(10, 0, e) + arc(t) * 40);
  });
  tl.end(86);
};

const harpyFeatherStorm: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('Move', true);
    h.camera(1.15, h.home.x - 20, h.home.y - 40, 24);
    h.sound('flap');
    h.sound('screech', { rate: 0.9, vol: 0.6 });
  });
  tl.during(0, 18, (t) => h.lift(easeOut(t) * 24));
  // Wings flare wide
  drawSpan(h, tl, 4, 30, (g, t) => {
    const p = crown(h, 0.6, 0);
    fx.wing(g, p.x - 6, p.y, 26, -1, easeOut(t), fx.pal(0xF472B6, 0xFFF1F2), 1 - t * 0.5);
    fx.wing(g, p.x + 6, p.y, 26, 1, easeOut(t), fx.pal(0xF472B6, 0xFFF1F2), 1 - t * 0.5);
  });
  tl.at(24, () => {
    h.anim('Attack_01');
    h.camera(1.12, (h.home.x + h.knight.x) / 2, h.knight.y - 30, 50);
  });
  // A fan of quills, released in a ripple
  for (let i = 0; i < 9; i++) {
    const f = 26 + i * 2;
    let prev = { x: 0, y: 0 };
    projectile(h, tl, f, 12, () => crown(h, 0.6, -6), () => ({ x: chest(h).x + rand(-4, 6), y: chest(h).y + (i - 4) * 4 }), (i - 4) * 4,
      (g, x, y, t) => {
        if (t === 0) prev = { x: x + 1, y };
        const ang = Math.atan2(y - prev.y, x - prev.x);
        prev = { x, y };
        dart(g, x, y, ang, 10, 0xF9A8D4, 0xFFFFFF, 2);
      },
      () => {
        if (i < 8) {
          h.sparks(chest(h).x, chest(h).y + (i - 4) * 4, 3, FEATHER);
          if (i % 3 === 0) chip(h, FEATHER, 2, 3, 'stab');
        } else land(h, { kb: 10, shake: 10, stop: 4, flash: 0.25, color: 0xF9A8D4, colors: [...FEATHER, BLOOD], sound: 'stab' });
      });
    tl.at(f, () => i % 2 === 0 && h.sound('arrow', { rate: 1.4 + i * 0.03, vol: 0.6 }));
  }
  tl.during(60, 76, (t) => h.lift(lerp(24, 0, easeInOut(t))));
  tl.end(78);
};

// ---------------------------------------------------------------------------------------------
// LIZARDMAN SLAYER: swamp skirmisher. Trident reach, a crushing tail, and ambush from the mire.

const lizardTridentThrust: MoveFn = (h, tl) => {
  const c = contact(h, 44);
  tl.at(0, () => {
    h.anim('Run', true);
    h.sound('hiss', { vol: 0.6 });
    h.sound('dash');
  });
  travel(h, tl, 0, 14, { x: 0, y: 0 }, c, easeIn);
  tl.every(0, 14, 2, () => dustAtFeet(h, 2, 1));
  tl.at(14, () => h.anim('Attack01'));
  // Draw back, then three rapid tine thrusts
  travel(h, tl, 14, 22, c, { x: c.x + 8, y: c.y }, easeOut);
  [24, 30, 36].forEach((f, i) => {
    tl.during(f, f + 6, (t) => h.offset(c.x + 8 - arc(t) * 14, c.y));
    tl.at(f, () => h.sound('whoosh_fast', { rate: 1 + i * 0.08 }));
    drawSpan(h, tl, f, f + 8, (g, t) => {
      const p = chest(h);
      const y = p.y + (i - 1) * 6;
      const tip = lerp(p.x + 30, p.x - 4, easeOut(t * 2));
      for (const dy of [-4, 0, 4]) fx.lance(g, p.x + 44, y + dy * 0.5, tip, y + dy, 2.5, fx.pal(0x94A3B8, 0xF1F5F9), 1 - t);
    });
    tl.at(f + 3, () => (i < 2 ? chip(h, [0xF1F5F9, BLOOD], 3, 5, 'stab') : land(h, { kb: 10, shake: 10, stop: 4, zoom: 1.2, colors: [BLOOD, BONE, 0x94A3B8], sound: 'stab' })));
  });
  tl.at(48, () => h.anim('Run', true));
  retreat(h, tl, 48, 68, { x: c.x + 8, y: c.y });
  tl.at(68, () => h.idle());
  tl.end(70);
};

const lizardTailWhip: MoveFn = (h, tl) => {
  const c = contact(h, 30);
  tl.at(0, () => {
    h.anim('Run', true);
    h.camera(1.16, (h.home.x + h.knight.x) / 2, h.knight.y - 30, 50);
  });
  travel(h, tl, 0, 18, { x: 0, y: 0 }, c, easeIn);
  tl.at(0, () => h.sound('dash'));
  // Pivot: turn its back, the tail comes round
  tl.at(18, () => {
    h.stretch(-1, 1);
    h.sound('hiss', { vol: 0.6 });
    h.sound('whoosh_heavy');
  });
  tl.during(18, 24, (t) => h.stretch(lerp(-1, -0.7, t), 1));
  drawSpan(h, tl, 24, 38, (g, t) => {
    const p = feet(h);
    fx.crescent(g, p.x + 20, p.y - 12, 34, Math.PI * 0.15, Math.PI * (0.15 + 0.85 * easeOut(t)), 8, fx.pal(0x4D7C0F, 0xD9F99D), 1 - t * 0.5);
  });
  tl.at(28, () => {
    h.emit(feet(h).x, feet(h).y - 8, { count: 18, colors: [...SWAMP, 0x78716C], speed: [1.5, 3.5], angle: Math.PI, spread: 0.7, gravity: 0.15, size: 3, life: [14, 26] });
    land(h, { kb: 16, shake: 14, stop: 6, flash: 0.35, zoom: 1.28, colors: [...SWAMP, BONE], ring: 0x4D7C0F, at: { x: feet(h).x, y: feet(h).y - 12 }, sound: 'lash' });
    h.sound('splat', { vol: 0.5 });
  });
  tl.at(38, () => h.stretch(1, 1));
  tl.at(42, () => h.anim('Run', true));
  retreat(h, tl, 42, 62, c);
  tl.at(62, () => h.idle());
  tl.end(64);
};

const lizardScaleGuard: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('animation');
    h.sound('hiss', { vol: 0.6 });
  });
  tl.at(20, () => h.sound('rattle', { rate: 0.6, vol: 0.6 }));
  chargeTint(h, tl, 0, 40, 0x9AE6B4, 0.5);
  guard(h, tl, 4, [...SWAMP, 0xFFFFFF], (g, cx, cy, grow, fade, f) => {
    // Overlapping scale plates close in rows
    for (let row = 0; row < 4; row++) {
      for (let k = 0; k < 4; k++) {
        const x = cx - 18 + k * 12 + (row % 2) * 6;
        const y = cy - 22 + row * 12;
        const s = 7 * grow;
        g.poly([x, y - s, x + s * 0.8, y, x, y + s * 0.7, x - s * 0.8, y]).fill({ color: SWAMP[row % 2 + 1], alpha: 0.55 * fade }).stroke({ width: 1, color: SWAMP[3], alpha: fade });
      }
    }
  });
  tl.at(60, () => h.idle());
  tl.end(62);
};

const lizardSwampAmbush: MoveFn = (h, tl) => {
  const under = { x: contact(h, 22).x, y: contact(h, 22).y };
  tl.at(0, () => h.anim('Hit'));
  // Sinks into a swamp pool
  drawSpan(h, tl, 0, 26, (g, t) => {
    g.ellipse(h.home.x, h.home.y + 1, 26 * easeOut(Math.min(1, t * 3)), 6).fill({ color: SWAMP[0], alpha: 0.85 * (1 - easeIn(t)) });
  }, 'ground');
  tl.during(0, 20, (t) => {
    h.stretch(1 + 0.2 * t, 1 - easeIn(t));
    if (t >= 1) h.alpha(0);
  });
  tl.every(0, 20, 3, () => h.emit(h.home.x + rand(-14, 14), h.home.y - 2, { count: 2, colors: SWAMP, speed: [0.5, 1.5], angle: -Math.PI / 2, spread: 0.7, gravity: 0.15, size: 2, life: [10, 16] }));
  tl.at(2, () => h.sound('splat'));
  tl.at(6, () => h.sound('gurgle', { vol: 0.6 }));
  tl.at(24, () => h.sound('gurgle', { vol: 0.5, rate: 1.2 }));
  // A bubble trail stalks the knight
  tl.every(20, 50, 3, () => {
    const t = (tl.frame - 20) / 30;
    const x = lerp(h.home.x, h.knight.x + 20, easeInOut(Math.min(1, t)));
    h.emit(x, h.knight.y, { count: 2, colors: [0x86EFAC, 0xD1FAE5], speed: [0.3, 0.7], angle: -Math.PI / 2, spread: 0.4, gravity: -0.02, size: 2, life: [10, 16] });
  });
  tl.at(36, () => h.camera(1.24, h.knight.x + 10, h.knight.y - 30, 40));
  warnRing(h, tl, 40, 54, 0x86EFAC);
  // Bursts up out of the water, trident first
  tl.at(54, () => {
    h.offset(under.x, under.y);
    h.stretch(1, 1);
    h.alpha(1);
    h.anim('Attack01');
    h.emit(h.knight.x + 16, h.knight.y - 4, { count: 30, colors: [...SWAMP, 0xD1FAE5], speed: [1.5, 4.5], angle: -Math.PI / 2, spread: 0.9, gravity: 0.2, size: 3, life: [16, 28] });
    toxic(h, h.knight.x + 16, h.knight.y - 12, 0.9);
    h.sound('splat');
    h.sound('hiss');
  });
  tl.during(54, 64, (t) => h.lift(arc(t) * 24));
  drawSpan(h, tl, 54, 64, (g, t) => {
    const p = chest(h);
    fx.lance(g, p.x + 12, h.knight.y + 4, p.x + 2, lerp(h.knight.y, p.y - 30, easeOut(t)), 4, fx.pal(0x94A3B8, 0xF1F5F9), 1 - t * 0.5);
  });
  tl.at(58, () => land(h, { kb: 14, shake: 13, stop: 6, flash: 0.35, color: 0xD1FAE5, colors: [...SWAMP, BLOOD, BONE], ring: 0x166534, sound: 'stab' }));
  puddle(h, tl, 54, 110, 30, SWAMP[0], SWAMP[2]);
  tl.at(74, () => h.anim('Run', true));
  retreat(h, tl, 74, 96, under);
  tl.at(96, () => h.idle());
  tl.end(110);
};

export const CRITTER_MOVES = {
  bat_wing_buffet: batWingBuffet,
  bat_screech_dive: batScreechDive,
  bat_blood_drain: batBloodDrain,
  bat_echo_swarm: batEchoSwarm,

  goblin_rusty_shank: goblinRustyShank,
  goblin_sneak_pounce: goblinSneakPounce,
  goblin_sling_stone: goblinSlingStone,
  goblin_firebomb: goblinFirebomb,

  shroom_spore_cloud: shroomSporeCloud,
  shroom_toxic_burst: shroomToxicBurst,
  shroom_fungal_guard: shroomFungalGuard,
  shroom_mycelium_snare: shroomMyceliumSnare,

  spider_venom_fangs: spiderVenomFangs,
  spider_silk_cocoon: spiderSilkCocoon,
  spider_skitter_lunge: spiderSkitterLunge,
  spider_brood_swarm: spiderBroodSwarm,

  harpy_talon_rake: harpyTalonRake,
  harpy_cyclone: harpyCyclone,
  harpy_aerial_dive: harpyAerialDive,
  harpy_feather_storm: harpyFeatherStorm,

  lizard_trident_thrust: lizardTridentThrust,
  lizard_tail_whip: lizardTailWhip,
  lizard_scale_guard: lizardScaleGuard,
  lizard_swamp_ambush: lizardSwampAmbush,
} satisfies Partial<Record<MonsterMoveId, MoveFn>>;
