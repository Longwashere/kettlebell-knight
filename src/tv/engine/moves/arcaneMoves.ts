/**
 * Casters and things from the deep: Corrupted Mage, Void Prophet, Archbishop of Ash, Eldritch Horror,
 * Water Elemental, Abyssal Kraken. Ranged, ritual-heavy moves: telegraph on the floor, then detonate.
 */
import type { Graphics } from 'pixi.js';
import type { MonsterMoveId } from '../../../types/battle';
import { lerp, easeIn, easeOut, easeInOut, arc, rand, INK, BONE, BLOOD, EMBER, GOLD, SHADOW, FIRE, SMOKE } from '../choreo';
import * as fx from '../fxKit';
import {
  type MoveFn, type MoveHost, contact, chest, head, travel, drawSpan, projectile, orb, sigil, retreat,
  crown, feet, land, chip, dimSpan, chargeTint, tremble, puff, warnRing, puddle, shoutRings, beam, tentacle,
  flier, orbitRing, hexWard, guard, lean,
} from '../monsterKit';

const HEX = [0x7C3AED, 0xA855F7, 0xF0ABFC, 0x3B0764];
const COSMIC = [0x312E81, 0x6366F1, 0xC7D2FE, 0xF472B6, 0xFFFFFF];
const ASH = [0x44403C, 0x78716C, 0xA8A29E, 0x1C1917];
const BLACKFIRE = [0x1C1917, 0x7F1D1D, EMBER, GOLD];
const WATER = [0x0EA5E9, 0x38BDF8, 0xBAE6FD, 0x0C4A6E];
const INK_BLK = [0x0F0E17, 0x1E1B4B, 0x312E81, 0x020617];
const ELDER = [0x14532D, 0x166534, 0x22C55E, 0xA7F3D0];

/** Detonating rune glyph (a small rotating sigil square). */
function glyph(g: Graphics, x: number, y: number, s: number, rot: number, color: number, core: number, alpha = 1) {
  const pts: number[] = [];
  for (let k = 0; k < 4; k++) {
    const a = rot + (k * Math.PI) / 2;
    pts.push(x + Math.cos(a) * s, y + Math.sin(a) * s);
  }
  g.poly(pts).fill({ color, alpha: 0.25 * alpha }).stroke({ width: 3, color: INK, alpha: 0.5 * alpha });
  g.poly(pts).stroke({ width: 1.5, color, alpha });
  g.circle(x, y, s * 0.35).stroke({ width: 1, color: core, alpha });
  g.rect(x - 1, y - 1, 2, 2).fill({ color: core, alpha });
}

/** Curling breaker whose crest leads at x (moving left), `hgt` tall and `w` long behind the crest. */
function breaker(g: Graphics, x: number, groundY: number, hgt: number, w: number, f: number, alpha = 1) {
  if (hgt <= 1 || alpha <= 0) return;
  const top = groundY - hgt;
  const lip = { x: x - hgt * 0.45, y: top + hgt * 0.32 };
  const body = (dx: number, dy: number, scale: number) => {
    g.moveTo(x + w, groundY)
      .quadraticCurveTo(x + w * 0.35, top + hgt * 0.15 + dy, x + dx, top + dy)
      .quadraticCurveTo(lip.x + hgt * 0.1 + dx, top - hgt * 0.06 + dy, lip.x + dx * scale, lip.y + dy)
      .quadraticCurveTo(x - hgt * 0.05, top + hgt * 0.45, x - hgt * 0.15, groundY)
      .closePath();
  };
  body(0, 0, 1);
  g.fill({ color: WATER[3], alpha: 0.9 * alpha }).stroke({ width: 2, color: INK, alpha: 0.7 * alpha });
  body(1, hgt * 0.08, 0.8);
  g.fill({ color: WATER[0], alpha: 0.9 * alpha });
  // Lit inner face of the curl
  g.moveTo(x + w * 0.5, groundY).quadraticCurveTo(x + w * 0.15, top + hgt * 0.35, x + 2, top + hgt * 0.2)
    .quadraticCurveTo(x - hgt * 0.02, top + hgt * 0.6, x - hgt * 0.08, groundY).closePath().fill({ color: WATER[1], alpha: 0.8 * alpha });
  // Foam along the crest and dripping off the lip
  for (let k = 0; k < 7; k++) {
    const u = k / 6;
    const fx0 = lerp(x + w * 0.3, lip.x, u);
    const fy0 = lerp(top + hgt * 0.1, lip.y, u * u) - Math.sin(u * Math.PI) * hgt * 0.08 + Math.sin(f * 0.5 + k) * 1.5;
    g.circle(fx0, fy0, Math.max(1.5, hgt * 0.05)).fill({ color: 0xFFFFFF, alpha: 0.95 * alpha });
  }
  for (let k = 0; k < 3; k++) g.circle(lip.x - 1, lip.y + 3 + ((f * 1.5 + k * 6) % 14), 1.5).fill({ color: WATER[2], alpha: alpha });
  g.ellipse(x, groundY, hgt * 0.4, 3).fill({ color: 0xFFFFFF, alpha: 0.6 * alpha });
}

// ---------------------------------------------------------------------------------------------
// CORRUPTED MAGE (bird mage)

const beak = (h: MoveHost) => crown(h, 0.7, -14);

const mageShadowBolt: MoveFn = (h, tl) => {
  tl.at(0, () => h.anim('attack'));
  drawSpan(h, tl, 0, 24, (g, t, f) => {
    const p = beak(h);
    orb(g, p.x, p.y, 2 + 5 * easeOut(t), [HEX[2], HEX[1], HEX[3]]);
    orbitRing(g, p.x, p.y, 14 * (1 - t) + 4, 5, f * 0.35, 2, HEX[1], HEX[2], 1);
  });
  tl.at(24, () => {
    h.sound('swing');
    h.camera(1.12, (h.home.x + h.knight.x) / 2, h.knight.y - 30, 24);
  });
  projectile(h, tl, 24, 16, () => beak(h), () => chest(h), 12,
    (g, x, y) => {
      orb(g, x, y, 7, [HEX[2], HEX[1], HEX[3]]);
      for (let k = 0; k < 3; k++) {
        const a = tl.frame * 0.5 + (k * Math.PI * 2) / 3;
        g.circle(x + Math.cos(a) * 9, y + Math.sin(a) * 9, 1.5).fill({ color: HEX[2] });
      }
    },
    () => {
      const p = chest(h);
      h.emit(p.x, p.y, { count: 24, colors: HEX, speed: [1.5, 4], spread: Math.PI, gravity: -0.02, size: 3, life: [14, 24] });
      h.shockwave(p.x, p.y, 0x7C3AED);
      land(h, { kb: 10, shake: 10, stop: 5, flash: 0.35, color: 0x7C3AED, zoom: 1.2, colors: HEX });
    },
    (x, y) => h.emit(x + 6, y, { count: 1, colors: HEX, speed: [0.2, 0.6], angle: 0, spread: 0.6, gravity: -0.03, size: 2, life: [10, 16] }));
  tl.end(66);
};

const mageDoomCurse: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('skill2');
    h.camera(1.2, h.home.x, h.home.y - 30, 30);
    h.sound('level_up');
  });
  dimSpan(h, tl, 0, 110, 0.6, 0x12021F);
  tl.at(30, () => h.camera(1.28, h.knight.x + 6, h.knight.y - 34, 70));
  drawSpan(h, tl, 16, 100, (g, t, f) => {
    const p = feet(h);
    const fade = f > 70 ? 1 - (f - 70) / 14 : 1;
    g.alpha = fade;
    sigil(g, p.x, p.y + 1, 32, Math.min(1, f / 22), f * 0.05, 0xA855F7, 0xF0ABFC);
  }, 'ground');
  // Hex runes rise around the knight, orbiting tighter
  drawSpan(h, tl, 30, 74, (g, t, f) => {
    const p = chest(h);
    for (let k = 0; k < 5; k++) {
      const a = f * 0.08 + (k * Math.PI * 2) / 5;
      const r = lerp(34, 16, easeIn(t));
      glyph(g, p.x + Math.cos(a) * r, p.y + 10 - t * 16 + Math.sin(a) * r * 0.4, 5, f * 0.1, 0xA855F7, 0xF0ABFC);
    }
  });
  tl.every(40, 72, 8, () => h.shake(3));
  tl.at(50, () => chip(h, HEX, 2, 4));
  // Detonation
  tl.at(74, () => {
    const p = chest(h);
    h.emit(p.x, p.y, { count: 40, colors: HEX, speed: [2, 5], spread: Math.PI, gravity: -0.02, size: 3, life: [16, 28] });
    land(h, { kb: 16, shake: 16, stop: 8, flash: 0.6, color: 0xA855F7, colors: [...HEX, BONE], ring: 0x7C3AED });
  });
  drawSpan(h, tl, 74, 90, (g, t) => {
    fx.pillar(g, feet(h).x, h.knight.y - 90, h.knight.y + 2, 26 * (1 - t), fx.pal(0x7C3AED, 0xF0ABFC), 1 - t);
  });
  tl.end(112);
};

const mageNetherWard: MoveFn = (h, tl) => {
  tl.at(0, () => h.anim('skill1'));
  guard(h, tl, 4, HEX, (g, cx, cy, grow, fade, f) => {
    fx.runeCircle(g, cx, cy + h.height * 0.5, 30 * grow, f * 0.05, fx.pal(0x7C3AED, 0xF0ABFC), fade);
    hexWard(g, cx, cy, 36 * grow, f * 0.02, 0xA855F7, 0xF0ABFC, fade);
  });
  tl.end(62);
};

const mageRavenStorm: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('skill3');
    h.camera(1.08, 220, 120, 110);
    h.sound('level_up');
  });
  dimSpan(h, tl, 0, 112, 0.5, 0x12021F);
  // Ravens burst from its feathers, circle overhead, then dive one by one
  const n = 10;
  for (let i = 0; i < n; i++) {
    const birth = 20 + i * 2;
    const dive = 52 + i * 4;
    const phase = (i / n) * Math.PI * 2;
    const last = i === n - 1;
    let dx = 0;
    let dy = 0;
    drawSpan(h, tl, birth, dive + 12, (g, t, f) => {
      const local = tl.frame;
      const cx = (h.home.x + h.knight.x) / 2 + 30;
      const cy = h.knight.y - 80;
      let x: number;
      let y: number;
      if (local < dive) {
        const a = phase + f * 0.12;
        const r = Math.min(1, f / 14) * 56;
        x = cx + Math.cos(a) * r;
        y = cy + Math.sin(a) * r * 0.4;
        dx = x;
        dy = y;
      } else {
        const u = Math.min(1, (local - dive) / 10);
        const p = chest(h);
        x = lerp(dx, p.x + (i % 3 - 1) * 6, easeIn(u));
        y = lerp(dy, p.y + (i % 2 ? -8 : 8), easeIn(u));
      }
      g.circle(x, y, (last ? 14 : 11)).fill({ color: HEX[2], alpha: 0.22 });
      flier(g, x, y, last ? 11 : 9, f * 1.4, 0x0F0E17, 0xFF3366, x > h.knight.x ? -1 : 1);
    });
    tl.at(dive + 10, () => {
      if (!last) {
        h.sparks(chest(h).x, chest(h).y, 4, HEX);
        if (i % 3 === 0) chip(h, HEX, 3, 4);
      } else land(h, { kb: 12, shake: 13, stop: 6, flash: 0.4, color: 0x7C3AED, zoom: 1.24, colors: [...HEX, BONE] });
    });
    tl.at(dive, () => i % 2 === 0 && h.sound('swing'));
  }
  tl.end(114);
};

// ---------------------------------------------------------------------------------------------
// VOID PROPHET

const prophetHand = (h: MoveHost) => crown(h, 0.75, -14);

const prophetEldritchSigil: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('unused/attack');
    h.camera(1.18, h.knight.x + 6, h.knight.y - 34, 80);
  });
  dimSpan(h, tl, 0, 96, 0.5, 0x0B0A1F);
  // Sigils blink into being around the knight in sequence
  const spots = [{ dx: -22, dy: -40 }, { dx: 26, dy: -20 }, { dx: -10, dy: -6 }, { dx: 14, dy: -54 }, { dx: 4, dy: -28 }];
  spots.forEach(({ dx, dy }, i) => {
    const born = 12 + i * 6;
    const pop = 52 + i * 5;
    const last = i === spots.length - 1;
    drawSpan(h, tl, born, pop, (g, t, f) => {
      const p = feet(h);
      glyph(g, p.x + dx, p.y + dy, (last ? 9 : 6) * easeOut(Math.min(1, f / 6)), f * 0.15, 0x6366F1, 0xF472B6);
    });
    tl.at(born, () => h.sound('swing'));
    drawSpan(h, tl, pop, pop + 10, (g, t) => fx.starburst(g, feet(h).x + dx, feet(h).y + dy, (last ? 26 : 14) * easeOut(t), 6, i, fx.pal(0x6366F1, 0xF472B6), 1 - t));
    tl.at(pop, () => {
      h.emit(feet(h).x + dx, feet(h).y + dy, { count: last ? 30 : 10, colors: COSMIC, speed: [1, 3.5], spread: Math.PI, gravity: 0, size: 2, life: [12, 22] });
      if (!last) chip(h, COSMIC, 3, 4);
      else land(h, { kb: 12, shake: 13, stop: 6, flash: 0.45, color: 0x6366F1, colors: COSMIC });
    });
  });
  tl.end(98);
};

const prophetCosmicRift: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('unused/cast');
    h.camera(1.2, h.home.x, h.home.y - 40, 30);
    h.sound('level_up');
  });
  dimSpan(h, tl, 0, 130, 0.8, 0x02010A);
  tl.at(30, () => h.camera(1.08, h.knight.x + 10, h.knight.y - 60, 90));
  // A tear in the sky above the knight, full of stars
  const stars = Array.from({ length: 18 }, () => ({ x: rand(-30, 30), y: rand(-6, 6), s: rand(0.5, 1.5) }));
  drawSpan(h, tl, 20, 116, (g, t, f) => {
    const open = easeOut(Math.min(1, f / 24));
    const fade = f > 80 ? 1 - (f - 80) / 16 : 1;
    const x = feet(h).x;
    const y = h.knight.y - 130;
    g.poly([x - 40 * open, y, x - 10, y - 9 * open, x + 6, y - 4 * open, x + 40 * open, y, x + 8, y + 10 * open, x - 12, y + 5 * open])
      .fill({ color: 0x020617, alpha: fade }).stroke({ width: 2, color: 0xF472B6, alpha: fade });
    for (const s of stars) g.rect(x + s.x * open, y + s.y * open, s.s, s.s).fill({ color: 0xFFFFFF, alpha: fade * (0.5 + 0.5 * Math.sin(f * 0.3 + s.x)) });
  });
  warnRing(h, tl, 40, 76, 0xF472B6, 28);
  tl.every(40, 76, 6, () => h.shake(3));
  // The void pours down: a starry beam
  drawSpan(h, tl, 76, 108, (g, t, f) => {
    const x = feet(h).x;
    const w = (30 + Math.sin(f * 1.3) * 3) * (f > 22 ? 1 - (f - 22) / 10 : 1);
    beam(g, x, h.knight.y - 128, x, h.knight.y, w, [0x312E81, 0x6366F1, 0xFFFFFF], 1);
  });
  tl.every(76, 102, 1, () => h.emit(feet(h).x + rand(-14, 14), h.knight.y - rand(0, 110), { count: 2, colors: COSMIC, speed: [0.5, 2], angle: rand(0, Math.PI * 2), spread: 0.2, gravity: 0, size: 2, life: [12, 20] }));
  tl.at(78, () => land(h, { kb: 16, shake: 20, stop: 10, flash: 0.75, color: 0xC7D2FE, zoom: 1.24, colors: COSMIC, ring: 0x6366F1 }));
  tl.end(132);
};

const prophetSingularity: MoveFn = (h, tl) => {
  tl.at(0, () => h.anim('pose_defend', true));
  guard(h, tl, 4, COSMIC, (g, cx, cy, grow, fade, f) => {
    // Gravity well: orbiting debris spirals around a black core
    for (let k = 0; k < 14; k++) {
      const a = f * (0.05 + k * 0.006) + k;
      const r = (14 + k * 2.4) * grow;
      g.rect(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.45, 2, 2).fill({ color: COSMIC[k % 5], alpha: fade });
    }
    g.circle(cx - 22, cy, 7 * grow).fill({ color: 0x000000, alpha: fade }).stroke({ width: 2, color: 0xF472B6, alpha: fade });
    g.circle(cx - 22, cy, 12 * grow).stroke({ width: 1, color: 0x6366F1, alpha: 0.6 * fade });
  });
  tl.at(56, () => h.idle());
  tl.end(62);
};

const prophetVoidTendrils: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('unused/cast');
    h.camera(1.16, h.knight.x + 10, h.knight.y - 30, 100);
  });
  dimSpan(h, tl, 0, 110, 0.55, 0x0B0A1F);
  // Portals open on the floor, tendrils lash up
  const roots = [{ dx: -26, curl: -14, f: 26 }, { dx: 30, curl: 18, f: 34 }, { dx: -6, curl: -10, f: 44 }, { dx: 14, curl: 12, f: 54 }];
  roots.forEach(({ dx, curl, f }, i) => {
    drawSpan(h, tl, f - 10, f + 40, (g, t, ff) => {
      const x = feet(h).x + dx;
      const y = h.knight.y + 2;
      g.ellipse(x, y, 10, 3).fill({ color: 0x000000, alpha: 0.9 }).stroke({ width: 1.5, color: 0xF472B6 });
      if (ff < 10) return;
      const up = easeOut(Math.min(1, (ff - 10) / 8));
      const sink = ff > 36 ? (ff - 36) / 14 : 0;
      const p = chest(h);
      const ex = lerp(x, p.x + (i % 2 ? 6 : -6), up * (1 - sink));
      const ey = lerp(y, p.y + (i - 1.5) * 8, up * (1 - sink));
      tentacle(g, x, y, ex, ey, 7, curl * Math.sin(ff * 0.2 + i), 0x312E81, 0xF472B6);
    }, 'fx');
    tl.at(f, () => {
      h.emit(feet(h).x + dx, h.knight.y - 2, { count: 8, colors: COSMIC, speed: [0.6, 2], angle: -Math.PI / 2, spread: 0.6, gravity: 0, size: 2, life: [12, 20] });
      if (i < roots.length - 1) chip(h, COSMIC, 3, 5);
      else land(h, { kb: 12, shake: 13, stop: 6, flash: 0.4, color: 0x6366F1, zoom: 1.26, colors: COSMIC });
    });
  });
  tl.end(112);
};

// ---------------------------------------------------------------------------------------------
// ARCHBISHOP OF ASH: an inquisitor in a burning cathedral. Its rig's anims are long; moves cut them short.

const BISHOP = 'BOSS_Archbishop/';
const mitre = (h: MoveHost) => crown(h, 0.95, -10);

const bishopAshLiturgy: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim(`${BISHOP}006E_PerformanceC`);
    h.camera(1.1, 220, 120, 100);
    h.sound('level_up');
  });
  dimSpan(h, tl, 0, 110, 0.5, 0x1C0A05);
  // Ash falls like snow while burning glyphs of scripture march across the air
  tl.every(0, 100, 2, () => h.emit(rand(60, 400), 50, { count: 1, colors: ASH, speed: [0.3, 0.8], angle: Math.PI / 2, spread: 0.4, gravity: 0.01, size: 2, life: [60, 80] }));
  for (let i = 0; i < 6; i++) {
    const f0 = 16 + i * 6;
    let s = { x: 0, y: 0 };
    tl.at(f0, () => (s = { x: mitre(h).x + rand(-10, 10), y: mitre(h).y + rand(-10, 10) }));
    drawSpan(h, tl, f0, f0 + 34, (g, t, f) => {
      const p = chest(h);
      const x = lerp(s.x, p.x + (i % 3 - 1) * 10, easeInOut(t));
      const y = lerp(s.y, p.y + (i % 2 ? -10 : 10), easeInOut(t)) - arc(t) * 20;
      glyph(g, x, y, 5, f * 0.2, EMBER, GOLD);
    });
    tl.at(f0 + 34, () => {
      h.emit(chest(h).x, chest(h).y, { count: 6, colors: FIRE, speed: [0.8, 2], spread: Math.PI, gravity: -0.03, size: 2, life: [12, 18] });
      if (i < 5) {
        if (i % 2) chip(h, FIRE, 2, 4);
      } else land(h, { kb: 10, shake: 12, stop: 6, flash: 0.4, color: EMBER, zoom: 1.22, colors: [...FIRE, ...ASH] });
    });
  }
  tl.at(90, () => h.idle());
  tl.end(112);
};

const bishopProfanePillar: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim(`${BISHOP}003C_Attack_B2`);
    h.camera(1.2, h.home.x, h.home.y - 40, 30);
    h.sound('level_up');
  });
  dimSpan(h, tl, 0, 140, 0.8, 0x0A0302);
  tl.at(30, () => h.camera(1.1, h.knight.x + 10, h.knight.y - 60, 100));
  // A black sun appears above the knight
  drawSpan(h, tl, 20, 120, (g, t, f) => {
    const open = easeOut(Math.min(1, f / 24));
    const fade = f > 86 ? 1 - (f - 86) / 14 : 1;
    const x = feet(h).x;
    const y = h.knight.y - 140;
    g.circle(x, y, 22 * open + 6).fill({ color: EMBER, alpha: 0.25 * fade });
    for (let k = 0; k < 12; k++) {
      const a = f * 0.03 + (k / 12) * Math.PI * 2;
      g.moveTo(x + Math.cos(a) * 20 * open, y + Math.sin(a) * 20 * open).lineTo(x + Math.cos(a) * 32 * open, y + Math.sin(a) * 32 * open).stroke({ width: 2, color: GOLD, alpha: fade });
    }
    g.circle(x, y, 18 * open).fill({ color: 0x000000, alpha: fade }).stroke({ width: 2, color: GOLD, alpha: fade });
  });
  drawSpan(h, tl, 34, 120, (g, t, f) => {
    const p = feet(h);
    g.alpha = f > 70 ? 1 - (f - 70) / 16 : 1;
    sigil(g, p.x, p.y + 1, 34, Math.min(1, f / 26), f * 0.04, BLOOD, GOLD);
  }, 'ground');
  tl.every(40, 80, 6, () => h.shake(3));
  // The pillar: black flame with a gold-white core
  drawSpan(h, tl, 80, 116, (g, t, f) => {
    const x = feet(h).x;
    const grow = easeOut(Math.min(1, f / 4));
    const shrink = f > 26 ? 1 - (f - 26) / 10 : 1;
    const w = (22 + Math.sin(f * 1.3) * 2) * shrink;
    const top = h.knight.y - 140 * grow;
    g.rect(x - w - 5, top, (w + 5) * 2, h.knight.y - top).fill({ color: 0x1C1917, alpha: 0.85 });
    g.rect(x - w, top, w * 2, h.knight.y - top).fill({ color: 0x7F1D1D, alpha: 0.9 });
    g.rect(x - w * 0.45, top, w * 0.9, h.knight.y - top).fill({ color: GOLD, alpha: 0.9 });
    g.rect(x - w * 0.15, top, w * 0.3, h.knight.y - top).fill({ color: 0xFFFFFF });
    g.ellipse(x, h.knight.y, w + 12, 7).fill({ color: GOLD, alpha: 0.8 });
  });
  tl.every(80, 110, 1, () => h.emit(feet(h).x + rand(-18, 18), h.knight.y - rand(0, 100), { count: 2, colors: BLACKFIRE, speed: [1, 3], angle: -Math.PI / 2, spread: 0.5, gravity: -0.05, size: 3, life: [12, 22] }));
  tl.at(82, () => land(h, { kb: 14, shake: 20, stop: 10, flash: 0.8, color: GOLD, colors: [...BLACKFIRE, BONE], ring: EMBER }));
  tl.at(120, () => h.idle());
  tl.end(142);
};

const bishopAegis: MoveFn = (h, tl) => {
  tl.at(0, () => h.anim(`${BISHOP}006B_Defense`));
  guard(h, tl, 6, [...FIRE, ...ASH], (g, cx, cy, grow, fade, f) => {
    fx.runeCircle(g, cx, cy + h.height * 0.5, 40 * grow, f * 0.04, fx.pal(BLOOD, GOLD), fade);
    hexWard(g, cx, cy, 46 * grow, f * 0.01, EMBER, GOLD, fade);
    // Cathedral seal: a burning cross
    const x = cx - 26;
    g.rect(x - 2, cy - 14 * grow, 4, 28 * grow).fill({ color: GOLD, alpha: fade });
    g.rect(x - 9 * grow, cy - 6 * grow, 18 * grow, 4).fill({ color: GOLD, alpha: fade });
  });
  tl.at(60, () => h.idle());
  tl.end(64);
};

const bishopBrimstoneCenser: MoveFn = (h, tl) => {
  const c = contact(h, 96);
  const censer = (g: Graphics, ox: number, oy: number, ang: number, len: number) => {
    const x = ox + Math.cos(ang) * len;
    const y = oy + Math.sin(ang) * len;
    g.moveTo(ox, oy).lineTo(x, y).stroke({ width: 2.5, color: INK }).moveTo(ox, oy).lineTo(x, y).stroke({ width: 1, color: 0x9CA3AF });
    g.circle(x, y, 14).fill({ color: EMBER, alpha: 0.35 });
    g.circle(x, y, 9).fill({ color: 0x44403C }).stroke({ width: 2, color: INK });
    g.rect(x - 6, y - 1.5, 12, 3).fill({ color: GOLD });
    g.poly([x - 4, y - 9, x, y - 15, x + 4, y - 9]).fill({ color: GOLD }).stroke({ width: 1, color: INK });
    return { x, y };
  };
  tl.at(0, () => {
    h.anim(`${BISHOP}005D_Break_Attack_A`);
    h.camera(1.16, (h.home.x + h.knight.x) / 2, h.knight.y - 40, 90);
  });
  travel(h, tl, 0, 20, { x: 0, y: 0 }, c, easeInOut);
  // Swings the censer round and round, trailing burning ash, then brings it down
  let tip = { x: 0, y: 0 };
  drawSpan(h, tl, 0, 64, (g, t, f) => {
    const o = mitre(h);
    const ox = o.x + 4;
    const oy = o.y + 10;
    const p = chest(h);
    const strike = easeIn(Math.min(1, Math.max(0, (f - 44) / 8)));
    // Whirls overhead, then the overhead arc comes forward and down onto the knight
    const ang = f < 44 ? f * lerp(0.15, 0.45, f / 44) - Math.PI : lerp(-Math.PI / 2, Math.atan2(p.y - oy, p.x - ox), strike);
    tip = censer(g, ox, oy, ang, lerp(30, Math.hypot(p.x - ox, p.y - oy), strike));
  });
  tl.every(4, 52, 2, () => h.emit(tip.x, tip.y, { count: 2, colors: [...FIRE, ...ASH], speed: [0.2, 0.8], angle: -Math.PI / 2, spread: 1, gravity: -0.02, size: 2, life: [16, 26] }));
  tl.every(10, 44, 9, () => h.sound('swing'));
  tl.at(52, () => {
    h.emit(chest(h).x, chest(h).y, { count: 34, colors: [...FIRE, ...ASH], speed: [1.5, 4.5], spread: Math.PI, gravity: 0.05, size: 3, life: [16, 28] });
    land(h, { kb: 16, shake: 15, stop: 8, flash: 0.5, color: EMBER, zoom: 1.28, colors: [...FIRE, BONE], ring: EMBER });
  });
  puddle(h, tl, 52, 110, 26, 0x1C1917, EMBER);
  tl.at(66, () => h.idle());
  retreat(h, tl, 70, 96, c);
  tl.end(110);
};

// ---------------------------------------------------------------------------------------------
// ELDRITCH HORROR: the dread god. Everything warps; the floor sprouts arms; an eye opens in the sky.

const horrorTentacleGrasp: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('attack');
    h.camera(1.14, (h.home.x + h.knight.x) / 2, h.knight.y - 30, 80);
  });
  // Tentacles burst from the floor under the knight and squeeze
  const roots = [{ dx: -22, curl: -18 }, { dx: 24, curl: 20 }, { dx: -4, curl: 10 }];
  roots.forEach(({ dx, curl }, i) => {
    const f = 14 + i * 6;
    drawSpan(h, tl, f, 80, (g, t, ff) => {
      const x = feet(h).x + dx;
      const y = h.knight.y + 3;
      const up = easeOut(Math.min(1, ff / 10));
      const sink = ff > 50 ? (ff - 50) / 16 : 0;
      const p = chest(h);
      const wrap = ff > 14 ? Math.sin(ff * 0.25) * 4 : 0;
      tentacle(g, x, y, lerp(x, p.x - dx * 0.2 + wrap, up * (1 - sink)), lerp(y, p.y - 10 + i * 10, up * (1 - sink)), 9, curl, 0x166534, 0xA7F3D0);
    });
    tl.at(f, () => h.emit(feet(h).x + dx, h.knight.y, { count: 8, colors: [...ELDER, 0x57534E], speed: [1, 2.5], angle: -Math.PI / 2, spread: 0.7, gravity: 0.15, size: 3, life: [12, 20] }));
  });
  tl.at(34, () => h.camera(1.28, h.knight.x + 6, h.knight.y - 30, 40));
  [38, 48].forEach((f) => tl.at(f, () => chip(h, ELDER, 3, 6)));
  tl.at(60, () => land(h, { kb: 12, shake: 15, stop: 8, flash: 0.45, color: 0x22C55E, colors: [...ELDER, BONE] }));
  tl.end(84);
};

const horrorCosmicMadness: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('bigat');
    h.camera(1.25, h.home.x, h.home.y - 40, 40);
    h.sound('level_up');
  });
  dimSpan(h, tl, 0, 150, 0.85, 0x020617);
  // Colour-cycling flicker: the mind breaks
  tl.every(20, 120, 8, (i) => h.flash(0.12, [0x22C55E, 0xF472B6, 0x6366F1][i % 3]));
  tl.at(40, () => h.camera(1.04, 213, 120, 90));
  // An enormous eye opens in the sky
  drawSpan(h, tl, 24, 136, (g, t, f) => {
    const open = easeInOut(Math.min(1, f / 40));
    const fade = f > 96 ? 1 - (f - 96) / 16 : 1;
    const x = 213;
    const y = 80;
    const w = 90;
    const hh = 34 * open;
    g.poly([x - w, y, x - w * 0.5, y - hh, x + w * 0.5, y - hh, x + w, y, x + w * 0.5, y + hh, x - w * 0.5, y + hh]).fill({ color: 0xFEF3C7, alpha: 0.9 * fade }).stroke({ width: 3, color: 0x14532D, alpha: fade });
    // The pupil tracks the knight
    const px = lerp(x, h.knight.x, 0.25);
    g.circle(px, y + 4, 20 * open).fill({ color: 0x22C55E, alpha: fade });
    g.ellipse(px, y + 4, 5 * open, 18 * open).fill({ color: 0x000000, alpha: fade });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + f * 0.01;
      g.moveTo(x + Math.cos(a) * (w + 4), y + Math.sin(a) * (hh + 4)).lineTo(x + Math.cos(a) * (w + 20), y + Math.sin(a) * (hh + 18)).stroke({ width: 3, color: 0x14532D, alpha: 0.8 * fade * open });
    }
  }, 'ground');
  // Non-euclidean geometry shears the air around the knight
  drawSpan(h, tl, 60, 112, (g, t, f) => {
    const p = chest(h);
    for (let k = 0; k < 4; k++) {
      const s = 14 + k * 9 + Math.sin(f * 0.2 + k) * 4;
      const rot = f * 0.05 * (k % 2 ? 1 : -1);
      const pts: number[] = [];
      for (let j = 0; j < 3; j++) pts.push(p.x + Math.cos(rot + (j * Math.PI * 2) / 3) * s, p.y + Math.sin(rot + (j * Math.PI * 2) / 3) * s);
      g.poly(pts).stroke({ width: 2, color: COSMIC[k + 1], alpha: 0.85 * (1 - t * 0.5) });
    }
  });
  [70, 82, 94].forEach((f) => tl.at(f, () => chip(h, [0x22C55E, 0xF472B6, 0x6366F1], 5, 8)));
  // The gaze lands
  tl.at(96, () => h.sound('crit'));
  drawSpan(h, tl, 100, 118, (g, t) => {
    const x = lerp(213, h.knight.x, 0.25);
    const e = chest(h);
    beam(g, x, 84, e.x, e.y, 14 * (1 - t * 0.5), [0x14532D, 0x22C55E, 0xFFFFFF], 1 - t);
  });
  tl.at(102, () => land(h, { kb: 20, shake: 22, stop: 12, flash: 0.9, color: 0xA7F3D0, zoom: 1.3, colors: [...ELDER, ...COSMIC], ring: 0x22C55E }));
  tl.end(152);
};

const horrorVoidDistortion: MoveFn = (h, tl) => {
  tl.at(0, () => h.anim('move'));
  guard(h, tl, 4, [...ELDER, ...COSMIC], (g, cx, cy, grow, fade, f) => {
    // Space folds: concentric warped rings
    for (let k = 0; k < 4; k++) {
      const r = (24 + k * 9) * grow;
      const pts: number[] = [];
      for (let j = 0; j < 24; j++) {
        const a = (j / 24) * Math.PI * 2;
        const wob = Math.sin(a * 5 + f * 0.15 + k) * 3;
        pts.push(cx + Math.cos(a) * (r + wob) * 0.8, cy + Math.sin(a) * (r + wob));
      }
      g.poly(pts).stroke({ width: 1.5, color: k % 2 ? 0x22C55E : 0x6366F1, alpha: fade * (1 - k * 0.18) });
    }
  });
  tl.end(62);
};

const horrorAbyssalGaze: MoveFn = (h, tl) => {
  const eye = () => crown(h, 0.7, -16);
  tl.at(0, () => {
    h.anim('bigat');
    h.camera(1.3, eye().x, eye().y, 44);
    h.sound('level_up');
  });
  dimSpan(h, tl, 0, 124, 0.7, 0x020617);
  // Energy gathers into its eye
  tl.every(0, 44, 1, () => {
    const p = eye();
    const a = rand(0, Math.PI * 2);
    h.emit(p.x + Math.cos(a) * 50, p.y + Math.sin(a) * 34, { count: 1, colors: ELDER, speed: [2.6, 3.2], angle: a + Math.PI, spread: 0.05, gravity: 0, size: 2, life: [16, 20] });
  });
  drawSpan(h, tl, 0, 48, (g, t, f) => orb(g, eye().x, eye().y, 2 + 8 * easeIn(t) + Math.sin(f) * 0.8, [0xFFFFFF, 0x22C55E, 0x14532D]));
  tremble(h, tl, 20, 48, { x: 0, y: 0 }, 1.2, 3);
  tl.at(48, () => {
    h.camera(1.1, (h.home.x + h.knight.x) / 2, h.knight.y - 40, 60);
    h.sound('crit');
  });
  // The beam sweeps the floor from behind the knight up through it
  drawSpan(h, tl, 48, 96, (g, t, f) => {
    const s = eye();
    const sweep = easeInOut(Math.min(1, f / 30));
    const ex = lerp(h.knight.x + 70, h.knight.x - 10, sweep);
    const ey = lerp(h.knight.y + 2, h.knight.y - 30, sweep);
    const fade = f > 38 ? 1 - (f - 38) / 10 : 1;
    beam(g, s.x, s.y, ex, ey, 10 + Math.sin(f * 1.4) * 2, [0x14532D, 0x22C55E, 0xFFFFFF], fade);
  });
  tl.every(48, 80, 1, () => {
    const sweep = easeInOut(Math.min(1, (tl.frame - 48) / 30));
    h.emit(lerp(h.knight.x + 70, h.knight.x - 10, sweep), lerp(h.knight.y, h.knight.y - 30, sweep), { count: 2, colors: [...ELDER, 0xFFFFFF], speed: [1, 3], angle: -Math.PI / 2, spread: 1, gravity: 0.05, size: 2, life: [12, 20] });
    h.shake(3);
  });
  // A scorched trench along the floor
  drawSpan(h, tl, 52, 124, (g, t) => {
    g.moveTo(h.knight.x + 70, h.knight.y + 2).lineTo(h.knight.x, h.knight.y + 1).stroke({ width: 5, color: INK, alpha: 0.7 * (1 - t) });
    g.moveTo(h.knight.x + 70, h.knight.y + 2).lineTo(h.knight.x, h.knight.y + 1).stroke({ width: 2, color: 0x22C55E, alpha: 1 - t });
  }, 'ground');
  tl.at(68, () => chip(h, ELDER, 4, 8));
  tl.at(78, () => land(h, { kb: 18, shake: 18, stop: 10, flash: 0.7, color: 0xA7F3D0, colors: [...ELDER, 0xFFFFFF] }));
  tl.end(126);
};

// ---------------------------------------------------------------------------------------------
// WATER ELEMENTAL

const waterTidalStrike: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('Attack01');
    h.camera(1.12, (h.home.x + h.knight.x) / 2, h.knight.y - 30, 70);
  });
  tl.during(0, 20, (t) => h.stretch(1 + 0.12 * t, 1 - 0.1 * t));
  tl.at(20, () => {
    h.stretch(0.9, 1.1);
    h.sound('swing');
  });
  tl.during(20, 30, (t) => h.stretch(lerp(0.9, 1, t), lerp(1.1, 1, t)));
  // A breaker races across the floor and crashes into the knight
  drawSpan(h, tl, 20, 56, (g, t, f) => {
    const x = lerp(h.pos().x - 20, h.knight.x + 10, easeIn(Math.min(1, t * 1.2)));
    breaker(g, x, h.knight.y + 2, 20 + 30 * Math.min(1, t * 2), 46, f, t > 0.85 ? (1 - t) / 0.15 : 1);
  });
  tl.every(20, 50, 2, () => h.emit(lerp(h.pos().x - 20, h.knight.x + 10, Math.min(1, (tl.frame - 20) / 30)), h.knight.y - 4, { count: 2, colors: WATER, speed: [0.6, 1.6], angle: -Math.PI / 2, spread: 0.6, gravity: 0.15, size: 2, life: [12, 20] }));
  tl.at(48, () => {
    h.emit(chest(h).x, chest(h).y, { count: 34, colors: [...WATER, 0xFFFFFF], speed: [1.5, 4.5], angle: -Math.PI * 0.6, spread: 1.1, gravity: 0.22, size: 3, life: [16, 28] });
    land(h, { kb: 16, shake: 13, stop: 6, flash: 0.35, color: 0xBAE6FD, zoom: 1.24, colors: [...WATER, 0xFFFFFF] });
  });
  puddle(h, tl, 50, 110, 30, 0x0C4A6E, 0x38BDF8);
  tl.end(110);
};

const waterGeyser: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('animation');
    h.camera(1.2, h.knight.x + 6, h.knight.y - 40, 90);
  });
  // Ripples spread under the knight
  drawSpan(h, tl, 6, 54, (g, t, f) => {
    const p = feet(h);
    for (let k = 0; k < 3; k++) {
      const r = ((f * 0.8 + k * 10) % 30) + 4;
      g.ellipse(p.x, p.y + 1, r, r * 0.28).stroke({ width: 1.5, color: WATER[1], alpha: 1 - r / 34 });
    }
  }, 'ground');
  tl.every(10, 54, 4, () => h.emit(feet(h).x + rand(-14, 14), h.knight.y, { count: 1, colors: [0xFFFFFF, WATER[2]], speed: [0.3, 0.8], angle: -Math.PI / 2, spread: 0.2, gravity: 0, size: 2, life: [10, 16] }));
  tl.every(30, 54, 6, () => h.shake(3));
  // Eruption: a column of water launches the knight
  drawSpan(h, tl, 54, 92, (g, t, f) => {
    const x = feet(h).x;
    const grow = easeOut(Math.min(1, f / 5));
    const shrink = f > 24 ? 1 - (f - 24) / 14 : 1;
    const top = h.knight.y - 130 * grow * shrink;
    const w = (16 + Math.sin(f * 1.2) * 2) * Math.max(0.3, shrink);
    g.poly([x - w * 1.3, h.knight.y, x - w * 0.8, top + 10, x, top, x + w * 0.8, top + 10, x + w * 1.3, h.knight.y]).fill({ color: WATER[0], alpha: 0.85 }).stroke({ width: 2, color: WATER[3] });
    g.rect(x - w * 0.3, top + 6, w * 0.6, h.knight.y - top - 6).fill({ color: WATER[2], alpha: 0.9 });
    g.circle(x, top, w * 0.9).fill({ color: 0xFFFFFF, alpha: 0.8 });
  });
  tl.every(54, 84, 1, () => h.emit(feet(h).x + rand(-10, 10), h.knight.y - rand(40, 120), { count: 2, colors: [...WATER, 0xFFFFFF], speed: [1, 3], angle: -Math.PI / 2, spread: 1.4, gravity: 0.2, size: 2, life: [14, 22] }));
  tl.at(56, () => land(h, { kb: 12, shake: 16, stop: 8, flash: 0.5, color: 0xBAE6FD, colors: [...WATER, 0xFFFFFF], ring: 0x0EA5E9 }));
  puddle(h, tl, 60, 120, 34, 0x0C4A6E, 0x38BDF8);
  tl.end(120);
};

const waterAquaBarrier: MoveFn = (h, tl) => {
  tl.at(0, () => h.anim('animation'));
  guard(h, tl, 4, [...WATER, 0xFFFFFF], (g, cx, cy, grow, fade, f) => {
    // Swirling water vortex wrapping the body
    for (let k = 0; k < 3; k++) {
      const r = (30 + k * 6) * grow;
      g.ellipse(cx, cy, r * 0.75, r).stroke({ width: 3 - k * 0.6, color: WATER[k], alpha: 0.8 * fade });
    }
    orbitRing(g, cx, cy, 34 * grow, 10, f * 0.15, 3, WATER[1], 0xFFFFFF, fade);
  });
  tl.end(62);
};

const waterBubblePrison: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('Attack01');
    h.camera(1.15, (h.home.x + h.knight.x) / 2, h.knight.y - 30, 30);
  });
  tl.at(18, () => h.sound('swing'));
  projectile(h, tl, 18, 18, () => crown(h, 0.6, -12), () => chest(h), 16,
    (g, x, y) => {
      g.circle(x, y, 8).fill({ color: WATER[1], alpha: 0.5 }).stroke({ width: 1.5, color: WATER[2] });
      g.circle(x - 3, y - 3, 2).fill({ color: 0xFFFFFF });
    },
    () => {
      h.sound('hit');
      h.camera(1.3, h.knight.x + 6, h.knight.y - 30, 60);
    });
  // The bubble swells around the knight, then contracts, crushing
  drawSpan(h, tl, 36, 90, (g, t, f) => {
    const p = chest(h);
    const r = f < 10 ? lerp(8, 40, easeOut(f / 10)) : lerp(40, 26, easeIn(Math.min(1, (f - 10) / 40)));
    const wob = Math.sin(f * 0.5) * 2;
    g.ellipse(p.x, p.y + 4, r + wob, r * 1.15 - wob).fill({ color: WATER[0], alpha: 0.35 }).stroke({ width: 2, color: WATER[2], alpha: 0.9 });
    g.ellipse(p.x - r * 0.4, p.y - r * 0.4, r * 0.2, r * 0.12).fill({ color: 0xFFFFFF, alpha: 0.8 });
  });
  tl.every(40, 88, 3, () => h.emit(chest(h).x + rand(-16, 16), chest(h).y + 26, { count: 1, colors: [0xFFFFFF, WATER[2]], speed: [0.4, 0.9], angle: -Math.PI / 2, spread: 0.2, gravity: -0.02, size: 2, life: [14, 22] }));
  [52, 68].forEach((f) => tl.at(f, () => chip(h, WATER, 2, 4)));
  tl.at(90, () => {
    h.emit(chest(h).x, chest(h).y, { count: 40, colors: [...WATER, 0xFFFFFF], speed: [2, 5], spread: Math.PI, gravity: 0.2, size: 3, life: [16, 28] });
    land(h, { kb: 12, shake: 13, stop: 7, flash: 0.45, color: 0xBAE6FD, colors: [...WATER, 0xFFFFFF], ring: 0x38BDF8 });
  });
  puddle(h, tl, 90, 130, 30, 0x0C4A6E, 0x38BDF8);
  tl.end(130);
};

// ---------------------------------------------------------------------------------------------
// ABYSSAL KRAKEN

const krakenTentacleLash: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('Action');
    h.camera(1.12, (h.home.x + h.knight.x) / 2, h.knight.y - 30, 70);
  });
  // A huge tentacle rears up from the water beside it and lashes down
  drawSpan(h, tl, 6, 70, (g, t, f) => {
    const bx = h.pos().x - 30;
    const by = h.pos().y + 4;
    const p = chest(h);
    let ex: number;
    let ey: number;
    if (f < 26) {
      const u = easeOut(f / 26);
      ex = lerp(bx, bx - 20, u);
      ey = lerp(by, by - 110, u);
    } else {
      const u = easeIn(Math.min(1, (f - 26) / 8));
      ex = lerp(bx - 20, p.x + 6, u);
      ey = lerp(by - 110, p.y, u);
    }
    const sink = f > 44 ? (f - 44) / 20 : 0;
    tentacle(g, bx, by, lerp(ex, bx, sink), lerp(ey, by, sink), 14, f < 26 ? 30 : -20, 0x7C2D12, 0xFDBA74);
  });
  tl.at(20, () => h.sound('swing'));
  tl.at(40, () => {
    h.emit(chest(h).x, chest(h).y, { count: 26, colors: [...WATER, 0xFDBA74], speed: [1.5, 4], spread: Math.PI, gravity: 0.2, size: 3, life: [14, 26] });
    land(h, { kb: 16, shake: 15, stop: 7, flash: 0.35, zoom: 1.24, colors: [...WATER, 0xFDBA74, BONE] });
  });
  tl.at(84, () => h.idle());
  tl.end(86);
};

const krakenMaelstrom: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('Thirsty Action');
    h.camera(1.2, h.knight.x + 10, h.knight.y - 30, 130);
    h.sound('level_up');
  });
  dimSpan(h, tl, 0, 150, 0.55, 0x041626);
  // A whirlpool opens under the knight
  drawSpan(h, tl, 10, 136, (g, t, f) => {
    const p = feet(h);
    const open = easeOut(Math.min(1, f / 24));
    const fade = f > 110 ? 1 - (f - 110) / 16 : 1;
    for (let arm = 0; arm < 3; arm++) {
      g.moveTo(p.x, p.y);
      for (let i = 1; i <= 20; i++) {
        const u = i / 20;
        const a = arm * ((Math.PI * 2) / 3) + u * 6 - f * 0.16;
        g.lineTo(p.x + Math.cos(a) * u * 60 * open, p.y + Math.sin(a) * u * 16 * open);
      }
      g.stroke({ width: 3, color: WATER[arm], alpha: 0.85 * fade });
    }
    g.ellipse(p.x, p.y, 10 * open, 3 * open).fill({ color: 0x020617, alpha: fade });
  }, 'ground');
  tl.every(16, 120, 2, () => {
    const a = rand(0, Math.PI * 2);
    h.emit(feet(h).x + Math.cos(a) * 50, h.knight.y + Math.sin(a) * 12, { count: 1, colors: [...WATER, 0xFFFFFF], speed: [1, 2], angle: a + Math.PI + 0.6, spread: 0.2, gravity: -0.02, size: 2, life: [12, 18] });
  });
  // Tentacles rise from the vortex and wrap the knight
  const roots = [{ dx: -26, curl: -22 }, { dx: 28, curl: 24 }, { dx: -10, curl: 14 }, { dx: 12, curl: -16 }];
  roots.forEach(({ dx, curl }, i) => {
    const f = 40 + i * 6;
    drawSpan(h, tl, f, 128, (g, t, ff) => {
      const x = feet(h).x + dx;
      const y = h.knight.y + 3;
      const up = easeOut(Math.min(1, ff / 10));
      const sink = ff > 70 ? (ff - 70) / 18 : 0;
      const p = chest(h);
      const squeeze = ff > 20 ? Math.sin(ff * 0.3 + i) * 3 : 0;
      tentacle(g, x, y, lerp(x, p.x + squeeze, up * (1 - sink)), lerp(y, p.y - 14 + i * 8, up * (1 - sink)), 11, curl, 0x7C2D12, 0xFDBA74);
    });
    tl.at(f, () => h.emit(feet(h).x + dx, h.knight.y - 2, { count: 10, colors: [...WATER, 0xFFFFFF], speed: [1, 3], angle: -Math.PI / 2, spread: 0.6, gravity: 0.2, size: 2, life: [12, 20] }));
  });
  tl.every(60, 106, 4, () => h.shake(4));
  [66, 80, 94].forEach((f) => tl.at(f, () => chip(h, [...WATER, 0xFDBA74], 3, 6)));
  tl.at(108, () => land(h, { kb: 18, shake: 20, stop: 10, flash: 0.6, color: 0xBAE6FD, zoom: 1.3, colors: [...WATER, 0xFDBA74, BONE], ring: 0x0EA5E9 }));
  tl.at(140, () => h.idle());
  tl.end(152);
};

const krakenInkCloud: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('Thirsty');
    h.camera(1.2, h.home.x, h.home.y - 30, 30);
  });
  tl.during(0, 26, (t, f) => h.stretch(1 + 0.12 * t + Math.sin(f * 0.8) * 0.02, 1 - 0.08 * t));
  tl.at(26, () => {
    h.stretch(0.9, 1.1);
    h.sound('crit');
    h.camera(1.06, 213, 120, 60);
  });
  tl.during(26, 36, (t) => h.stretch(lerp(0.9, 1, t), lerp(1.1, 1, t)));
  // A jet of ink floods the screen
  drawSpan(h, tl, 26, 110, (g, t, f) => {
    const reach = easeOut(Math.min(1, f / 18));
    const fade = f > 64 ? 1 - (f - 64) / 20 : 1;
    const s = h.pos();
    for (let k = 0; k < 16; k++) {
      const u = k / 15;
      const x = lerp(s.x - 20, h.knight.x - 40, u * reach);
      const y = lerp(s.y - h.height * 0.4, h.knight.y - 30, u * reach) + Math.sin(k * 1.7 + f * 0.08) * 16;
      g.circle(x, y, 10 + u * 22).fill({ color: INK_BLK[k % 4], alpha: 0.55 * fade });
    }
  });
  tl.during(30, 90, (t) => h.dim(0.4 * arc(t), 0x020617));
  tl.every(30, 70, 2, () => h.emit(chest(h).x + rand(-20, 20), chest(h).y + rand(-20, 20), { count: 1, colors: [0x312E81, 0x6366F1], speed: [0.2, 0.8], spread: Math.PI, gravity: 0.06, size: 2, life: [14, 22] }));
  [42, 54].forEach((f) => tl.at(f, () => chip(h, INK_BLK, 3, 5)));
  tl.at(66, () => land(h, { kb: 12, shake: 13, stop: 6, flash: 0.3, color: 0x6366F1, colors: [...INK_BLK, 0x6366F1, BONE] }));
  puddle(h, tl, 60, 130, 34, 0x020617, 0x312E81);
  tl.end(130);
};

const krakenTidalCrash: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('Thirsty Action');
    h.camera(1.15, h.home.x, h.home.y - 50, 40);
    h.sound('level_up');
  });
  dimSpan(h, tl, 0, 130, 0.5, 0x041626);
  tl.during(0, 36, (t) => h.lift(easeOut(t) * 16));
  tl.every(0, 36, 5, () => h.shake(4));
  tl.at(36, () => {
    h.camera(1.02, 213, 120, 70);
    h.sound('swing');
  });
  [62, 72].forEach((f) => tl.at(f, () => h.shake(8)));
  // A wall of water rises behind it and crashes across the whole arena
  drawSpan(h, tl, 30, 100, (g, t, f) => {
    const rise = easeOut(Math.min(1, f / 18));
    const x = lerp(h.home.x + 40, h.knight.x - 60, easeIn(Math.min(1, Math.max(0, (f - 14) / 40))));
    const fade = f > 60 ? 1 - (f - 60) / 10 : 1;
    breaker(g, x, h.knight.y + 4, 120 * rise, 260, f, fade);
  });
  tl.every(44, 90, 1, () => h.emit(rand(60, 400), rand(60, 170), { count: 1, colors: [...WATER, 0xFFFFFF], speed: [1, 3], angle: Math.PI, spread: 0.6, gravity: 0.1, size: 2, life: [12, 20] }));
  tl.at(80, () => {
    h.emit(chest(h).x, chest(h).y, { count: 40, colors: [...WATER, 0xFFFFFF], speed: [2, 5], angle: Math.PI, spread: 1, gravity: 0.2, size: 3, life: [16, 28] });
    land(h, { kb: 24, shake: 22, stop: 10, flash: 0.6, color: 0xBAE6FD, colors: [...WATER, 0xFFFFFF], ring: 0x38BDF8 });
  });
  tl.during(80, 106, (t) => h.lift(lerp(16, 0, easeInOut(t))));
  puddle(h, tl, 80, 132, 60, 0x0C4A6E, 0x38BDF8);
  tl.at(110, () => h.idle());
  tl.end(132);
};

export const ARCANE_MOVES = {
  mage_shadow_bolt: mageShadowBolt,
  mage_doom_curse: mageDoomCurse,
  mage_nether_ward: mageNetherWard,
  mage_raven_storm: mageRavenStorm,

  prophet_eldritch_sigil: prophetEldritchSigil,
  prophet_cosmic_rift: prophetCosmicRift,
  prophet_singularity: prophetSingularity,
  prophet_void_tendrils: prophetVoidTendrils,

  bishop_ash_liturgy: bishopAshLiturgy,
  bishop_profane_pillar: bishopProfanePillar,
  bishop_aegis: bishopAegis,
  bishop_brimstone_censer: bishopBrimstoneCenser,

  horror_tentacle_grasp: horrorTentacleGrasp,
  horror_cosmic_madness: horrorCosmicMadness,
  horror_void_distortion: horrorVoidDistortion,
  horror_abyssal_gaze: horrorAbyssalGaze,

  water_tidal_strike: waterTidalStrike,
  water_geyser: waterGeyser,
  water_aqua_barrier: waterAquaBarrier,
  water_bubble_prison: waterBubblePrison,

  kraken_tentacle_lash: krakenTentacleLash,
  kraken_maelstrom: krakenMaelstrom,
  kraken_ink_cloud: krakenInkCloud,
  kraken_tidal_crash: krakenTidalCrash,
} satisfies Partial<Record<MonsterMoveId, MoveFn>>;
