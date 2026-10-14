/**
 * Weapon spell choreography: one move per weapon spell card (src/types/weaponSpells.ts), keyed by
 * templateId and merged into KNIGHT_MOVES.
 *
 * Each weapon family has its own motion language:
 *   morning stars  whirl the head overhead on its chain (SKILL2TULUC held at the raise), then hurl or swing
 *                  it; the weapon in his hand is hidden while the head flies (h.weaponShown)
 *   bells          hip-drive swings, cleans and presses that release the bell's element
 *   maces          slow, heavy overhead crushes
 *   swords         blade arts with a spectral beast or elemental edge
 * VFX anchor to the real weapon head on each frame with h.weaponTip().
 *
 * Built on knightKit.ts (land, travel, slashFx, hitFx, ringFx...) and the Graphics primitives in fxKit.ts
 * and monsterKit.ts. Review a spell with
 *   npm run shot -- "encounter:wolf,boar,slime" idle kfilm:<templateId>:12:6:0,1,2
 * (the dev preview swaps the knight to the weapon that grants it).
 */
import type { Graphics } from 'pixi.js';
import {
  Timeline, lerp, easeIn, easeOut, easeInOut, arc, rand,
  INK, BONE, BLOOD, BLOOD_DARK, EMBER, GOLD, DIRT, FIRE, SMOKE, GOO, SHADOW,
} from './choreo';
import {
  pal, type Pal, crescent, starburst, groundRing, bolt, spike, crystal, pillar, runeCircle, orb, wing,
  kettlebell, lance, scorch, hash,
} from './fxKit';
import { tentacle, dart, flier, crawler, graspingHand, beam, shoutRings, clawRake } from './monsterKit';
import {
  type KnightMove, type KnightMoveHost, type KnightTarget, type P,
  each, once, strikeSpot, chest, kChest, kRaised, shoulders, land, travel, here, HOME, backstep, ghostTrail,
  drawSpan, slashFx, hitFx, ringFx, crackFx, chargeFx, motesFx, debris, dust, smoke, shards, embers, projectile,
  P_FIRE, P_EMBER, P_VOID, P_SUN, P_HOLY, P_JADE, P_LIME,
} from './knightKit';

// =============================================================================================
// Spell palettes

const P_IRON = pal(0x94A3B8, 0xF1F5F9, 0x0F172A);
const P_ACID = pal(0x22C55E, 0xD9F99D, 0x052E16);
const P_BROOD = pal(0xA855F7, 0xF5D0FE, 0x2E1065);
const P_SOUL = pal(0x38BDF8, 0xE0F2FE, 0x082F49);
const P_BRIM = pal(0xEF4444, 0xFDE68A, 0x450A0A);
const P_FROST = pal(0x93C5FD, 0xFFFFFF, 0x172554);
const P_STONE = pal(0x78716C, 0xD6D3D1, 0x1C1917);
const P_TIDE = pal(0x14B8A6, 0xCCFBF1, 0x042F2E);
const P_WYRM = pal(0xEF4444, 0xFDE047, 0x3B0505);
const P_LAVA = pal(0xF97316, 0xFEF08A, 0x2A0A02);
const P_COSMOS = pal(0xC084FC, 0xFAF5FF, 0x0A0414);
const P_GRAV = pal(0x7C3AED, 0xEDE9FE, 0x0B0218);
const P_TOLL = pal(0x9CA3AF, 0xF9FAFB, 0x111827);
const P_SPORE = pal(0xC084FC, 0x99F6E4, 0x2E1065);
const P_TALON = pal(0xFCD34D, 0xFFFBEB, 0x422006);
const P_WOOD = pal(0x4ADE80, 0xECFCCB, 0x14290E);
const P_LEY = pal(0x38BDF8, 0xE0F2FE, 0x0C1A2B);
const P_GAZE = pal(0xFBBF24, 0xFFFBEB, 0x2E1065);
const P_ELDRITCH = pal(0x9333EA, 0xE9D5FF, 0x12021F);
const P_DECREE = pal(0xF4B41A, 0xFFFBEA, 0x3B2205);
const P_SCRAP = pal(0xA3E635, 0xF7FEE7, 0x1A2E05);
const P_BONE = pal(0xE2E8F0, 0xFFFFFF, 0x1E293B);
const P_GRAVE = pal(0x94A3B8, 0xE2E8F0, 0x0F172A);
const P_BRONZE = pal(0xD97706, 0xFDE68A, 0x2A1503);
const P_STEELB = pal(0xCBD5E1, 0xFFFFFF, 0x0F172A);
const P_MOON = pal(0x60A5FA, 0xEFF6FF, 0x0B1A33);
const P_TUSK = pal(0xF87171, 0xFFF1F2, 0x450A0A);
const P_BULL = pal(0xF59E0B, 0xFEF3C7, 0x2A1503);
const P_NULL = pal(0x7C3AED, 0xC4B5FD, 0x000000);

// =============================================================================================
// Weapon-themed drawing helpers

/** The hand gripping the weapon: raised overhead (whirls) or at the hip. */
const grip = (h: KnightMoveHost, raised = true): P => (raised ? { x: h.pos().x + 4, y: h.pos().y - 50 } : { x: h.pos().x + 12, y: h.pos().y - 26 });

/** Chain of links from (x0,y0) to (x1,y1), sagging by `sag` px. */
function chain(g: Graphics, x0: number, y0: number, x1: number, y1: number, link: number, sag = 0, alpha = 1) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(2, Math.round(len / 4));
  let px = x0;
  let py = y0;
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    const x = lerp(x0, x1, u);
    const y = lerp(y0, y1, u) + Math.sin(u * Math.PI) * sag;
    g.moveTo(px, py).lineTo(x, y).stroke({ width: 3, color: INK, alpha: 0.8 * alpha });
    g.moveTo(px, py).lineTo(x, y).stroke({ width: 1.5, color: i % 2 ? link : 0xE2E8F0, alpha });
    px = x;
    py = y;
  }
}

/** Spiked flail head: ball with `spikes` points, ink rim, body and highlight. */
function flailHead(g: Graphics, x: number, y: number, r: number, spin: number, p: Pal, spikes = 8, alpha = 1) {
  for (let i = 0; i < spikes; i++) {
    const a = spin + (i / spikes) * Math.PI * 2;
    const bx = x + Math.cos(a) * r * 0.8;
    const by = y + Math.sin(a) * r * 0.8;
    const px = -Math.sin(a) * r * 0.28;
    const py = Math.cos(a) * r * 0.28;
    g.poly([bx + px, by + py, x + Math.cos(a) * r * 1.55, y + Math.sin(a) * r * 1.55, bx - px, by - py]).fill({ color: p.core, alpha }).stroke({ width: 1, color: p.ink, alpha });
  }
  orb(g, x, y, r, p, alpha);
}

/** Flail head on its chain from the hand; the head trails a faint ring of its own colour when fast. */
function flail(g: Graphics, hand: P, head: P, r: number, spin: number, p: Pal, link = 0x64748B, sag = 0) {
  chain(g, hand.x, hand.y, head.x, head.y, link, sag);
  flailHead(g, head.x, head.y, r, spin, p);
}

/**
 * Whirls a flail head overhead on its chain over [from, to], speeding up. `draw` overrides the head (e.g.
 * a censer or anchor). Returns a function giving the head's position on the last drawn frame.
 */
function whirl(
  h: KnightMoveHost, tl: Timeline, from: number, to: number, p: Pal,
  o: { r?: number; reach?: number; link?: number; trail?: number[]; head?: (g: Graphics, x: number, y: number, f: number) => void } = {},
) {
  let last: P = { x: 0, y: 0 };
  const reach = o.reach ?? 24;
  drawSpan(h, tl, from, to, (g, t, f) => {
    const hand = grip(h);
    const ang = f * (0.18 + 0.32 * t) + f * f * 0.004;
    const x = hand.x + Math.cos(ang) * reach;
    const y = hand.y - 4 + Math.sin(ang) * reach * 0.38;
    // Motion ring behind the head
    g.ellipse(hand.x, hand.y - 4, reach, reach * 0.38).stroke({ width: 2 + 3 * t, color: p.body, alpha: 0.15 + 0.35 * t });
    chain(g, hand.x, hand.y, x, y, o.link ?? 0x64748B);
    if (o.head) o.head(g, x, y, f);
    else flailHead(g, x, y, o.r ?? 6, f * 0.4, p);
    last = { x, y };
  });
  if (o.trail) {
    const colors = o.trail;
    tl.every(from, to, 2, () => h.emit(last.x, last.y, { count: 1, colors, speed: [0.2, 0.7], spread: Math.PI, gravity: -0.02, size: 2, life: [10, 18] }));
  }
  tl.every(from + 6, to, 12, () => h.sound('swing'));
  return () => last;
}

/** Holds the knight's arm raised (SKILL2TULUC frozen at its raise) from `at` until released. */
function raiseAndHold(h: KnightMoveHost, tl: Timeline, at: number, until: number) {
  tl.at(at, () => h.anim('SKILL2TULUC'));
  tl.at(at + 10, () => h.animSpeed(0));
  tl.at(until, () => h.animSpeed(1));
}

/** Stylised spectral beast head facing `dir`, `open` 0-1 opens the jaw. */
function beastHead(g: Graphics, x: number, y: number, s: number, kind: 'wolf' | 'boar' | 'bull' | 'dragon', dir: 1 | -1, p: Pal, alpha = 1, open = 0) {
  const X = (dx: number) => x + dx * s * dir;
  const Y = (dy: number) => y + dy * s;
  const fill = (pts: number[], color: number, a = alpha) => g.poly(pts).fill({ color, alpha: a }).stroke({ width: 1.5, color: p.ink, alpha });
  const jaw = open * 0.5;
  if (kind === 'wolf') {
    fill([X(-1), Y(-0.2), X(-0.6), Y(-0.9), X(-0.35), Y(-0.45), X(0.1), Y(-0.6), X(1.3), Y(-0.15), X(1.35), Y(0.05), X(0.2), Y(0.2), X(-0.8), Y(0.5)], p.body);
    fill([X(-0.1), Y(-1.15), X(0.05), Y(-0.55), X(-0.35), Y(-0.5)], p.body); // ears
    fill([X(-0.55), Y(-1.1), X(-0.4), Y(-0.55), X(-0.75), Y(-0.45)], p.body);
    fill([X(0.2), Y(0.15 + jaw * 0.2), X(1.2), Y(0.12 + jaw), X(0.4), Y(0.45 + jaw)], p.body); // lower jaw
    g.rect(X(0.3) - 1, Y(-0.35) - 1, 3, 2).fill({ color: p.core, alpha });
  } else if (kind === 'boar') {
    fill([X(-1), Y(-0.5), X(-0.4), Y(-0.95), X(0.5), Y(-0.7), X(1.1), Y(-0.25), X(1.15), Y(0.3), X(0.2), Y(0.55), X(-0.9), Y(0.4)], p.body);
    g.circle(X(1.1), Y(0.02), s * 0.22).fill({ color: p.ink, alpha }); // snout
    for (const k of [0, 1]) {
      const bx = X(0.75 + k * 0.1);
      const by = Y(0.25);
      g.moveTo(bx, by).quadraticCurveTo(X(1.15 + k * 0.1), Y(0.2), X(1.05 + k * 0.15), Y(-0.45)).stroke({ width: 3.5, color: p.ink, alpha });
      g.moveTo(bx, by).quadraticCurveTo(X(1.15 + k * 0.1), Y(0.2), X(1.05 + k * 0.15), Y(-0.45)).stroke({ width: 2, color: BONE, alpha });
    }
    g.rect(X(0.35) - 1, Y(-0.45) - 1, 3, 2).fill({ color: p.core, alpha });
  } else if (kind === 'bull') {
    fill([X(-0.7), Y(-0.6), X(0.6), Y(-0.6), X(0.85), Y(0.1), X(0.45), Y(0.9), X(-0.45), Y(0.9), X(-0.85), Y(0.1)].map((v, i) => (i % 2 ? v : v)), p.body);
    for (const side of [-1, 1]) {
      const hx = x + side * 0.6 * s;
      g.moveTo(hx, Y(-0.5)).quadraticCurveTo(x + side * 1.6 * s, Y(-0.6), x + side * 1.4 * s, Y(-1.5)).stroke({ width: 5, color: p.ink, alpha });
      g.moveTo(hx, Y(-0.5)).quadraticCurveTo(x + side * 1.6 * s, Y(-0.6), x + side * 1.4 * s, Y(-1.5)).stroke({ width: 3, color: BONE, alpha });
    }
    g.rect(x - 0.4 * s, Y(-0.15), 3, 2).fill({ color: p.core, alpha });
    g.rect(x + 0.3 * s, Y(-0.15), 3, 2).fill({ color: p.core, alpha });
    g.circle(x, Y(0.75), s * 0.18).stroke({ width: 1.5, color: GOLD, alpha }); // nose ring
  } else {
    fill([X(-1.1), Y(-0.3), X(-0.5), Y(-0.75), X(0.4), Y(-0.55), X(1.5), Y(-0.25), X(1.5), Y(0), X(0.3), Y(0.05), X(-1), Y(0.35)], p.body);
    fill([X(0.3), Y(0.05 + jaw * 0.2), X(1.35), Y(0.15 + jaw), X(0.2), Y(0.5 + jaw)], p.body);
    for (let k = 0; k < 4; k++) g.poly([X(0.5 + k * 0.25), Y(0.02), X(0.6 + k * 0.25), Y(0.02), X(0.55 + k * 0.25), Y(0.2)]).fill({ color: BONE, alpha });
    fill([X(-0.5), Y(-0.7), X(-1.4), Y(-1.3), X(-0.8), Y(-0.6)], p.core); // horns
    fill([X(-0.1), Y(-0.65), X(-0.8), Y(-1.4), X(-0.35), Y(-0.6)], p.core);
    g.rect(X(0.25) - 1, Y(-0.4) - 1, 4, 2).fill({ color: GOLD, alpha });
  }
}

/** Tapered fire / gas cone from (x,y) along `ang`, `len` long; flickers per frame. */
function cone(g: Graphics, x: number, y: number, ang: number, len: number, spread: number, f: number, layers: number[], alpha = 1) {
  layers.forEach((color, k) => {
    const s = spread * (1 - k * 0.22);
    const l = len * (1 - k * 0.08);
    const pts = [x, y];
    const n = 10;
    for (let i = 0; i <= n; i++) {
      const a = ang - s + (2 * s * i) / n;
      const jitter = 0.85 + 0.25 * hash(Math.floor(f / 2) * 31 + i + k * 7);
      pts.push(x + Math.cos(a) * l * jitter, y + Math.sin(a) * l * jitter);
    }
    g.poly(pts).fill({ color, alpha: alpha * (k === 0 ? 0.55 : 0.85) });
  });
}

/** Almond eye with lids `open` 0-1, iris looking toward `look` (-1..1 x offset). */
function eye(g: Graphics, x: number, y: number, r: number, open: number, look: number, p: Pal, alpha = 1) {
  if (open <= 0.02) {
    g.moveTo(x - r, y).lineTo(x + r, y).stroke({ width: 3, color: p.ink, alpha });
    return;
  }
  const hgt = r * 0.62 * open;
  // Upper lid left→right, then lower lid right→left: one closed almond outline
  const pts: number[] = [];
  for (let i = 0; i <= 12; i++) pts.push(x - r + (2 * r * i) / 12, y - Math.sin((i / 12) * Math.PI) * hgt);
  for (let i = 11; i >= 1; i--) pts.push(x - r + (2 * r * i) / 12, y + Math.sin((i / 12) * Math.PI) * hgt);
  g.poly(pts).fill({ color: 0xF5E6D3, alpha }).stroke({ width: 3, color: p.ink, alpha });
  // Veins
  for (let k = 0; k < 4; k++) {
    const vx = x + (k < 2 ? -r : r) * 0.85;
    g.moveTo(vx, y + (k % 2 ? 2 : -2)).lineTo(lerp(vx, x, 0.45), y + (k % 2 ? 1 : -1) * hgt * 0.4).stroke({ width: 1, color: BLOOD, alpha: 0.7 * alpha });
  }
  const ix = x + look * r * 0.35;
  const ir = Math.min(r * 0.42, hgt * 0.95);
  g.circle(ix, y, ir).fill({ color: p.body, alpha });
  g.circle(ix, y, ir * 0.7).fill({ color: p.core, alpha: 0.6 * alpha });
  g.ellipse(ix, y, ir * 0.18, ir * 0.85).fill({ color: INK, alpha });
  g.rect(ix - ir * 0.5, y - ir * 0.55, 2, 2).fill({ color: 0xFFFFFF, alpha });
}

/** Phantom cathedral bell, `w` wide at the lip. */
function phantomBell(g: Graphics, x: number, y: number, w: number, p: Pal, alpha = 1) {
  const hgt = w * 0.95;
  const pts = [
    x - w * 0.5, y + hgt * 0.5, x - w * 0.42, y + hgt * 0.35, x - w * 0.3, y - hgt * 0.1, x - w * 0.24, y - hgt * 0.4,
    x, y - hgt * 0.52, x + w * 0.24, y - hgt * 0.4, x + w * 0.3, y - hgt * 0.1, x + w * 0.42, y + hgt * 0.35, x + w * 0.5, y + hgt * 0.5,
  ];
  g.poly(pts).fill({ color: p.body, alpha: 0.16 * alpha }).stroke({ width: 3, color: p.ink, alpha: 0.5 * alpha });
  g.poly(pts).stroke({ width: 1.5, color: p.core, alpha });
  g.moveTo(x - w * 0.36, y + hgt * 0.22).lineTo(x + w * 0.36, y + hgt * 0.22).stroke({ width: 2, color: p.core, alpha: 0.8 * alpha });
  g.circle(x, y + hgt * 0.42, w * 0.07).fill({ color: p.core, alpha });
  g.rect(x - 3, y - hgt * 0.62, 6, hgt * 0.12).fill({ color: p.body, alpha: 0.6 * alpha });
}

/** Weathered tombstone rising `up` 0-1 out of the floor at (x, groundY). */
function tombstone(g: Graphics, x: number, groundY: number, up: number, s = 1, lean = 0) {
  if (up <= 0.02) return;
  const w = 12 * s;
  const hgt = 22 * s * up;
  const top = groundY - hgt;
  const l = lean * hgt;
  g.poly([x - w / 2, groundY, x - w / 2 + l, top + 5 * s, x - w / 4 + l, top, x + w / 4 + l, top, x + w / 2 + l, top + 5 * s, x + w / 2, groundY])
    .fill({ color: 0x57534E }).stroke({ width: 2, color: INK });
  g.poly([x - w / 2 + 1, groundY, x - w / 2 + 1 + l, top + 5 * s, x - w / 4 + l, top + 1, x + l - 1, top + 1, x - 1, groundY]).fill({ color: 0x78716C, alpha: 0.7 });
  // Cross carving
  g.rect(x + l * 0.5 - 1, top + 5 * s, 2, 9 * s * up).fill({ color: 0x292524 });
  g.rect(x + l * 0.5 - 4 * s, top + 8 * s, 8 * s, 2).fill({ color: 0x292524 });
  g.ellipse(x, groundY, w * 0.8, 3).fill({ color: 0x3F2A14, alpha: 0.8 });
}

/** Ship anchor (shank down, flukes up when `rot` 0). */
function anchor(g: Graphics, x: number, y: number, s: number, rot: number, p: Pal, alpha = 1) {
  const c = Math.cos(rot);
  const sn = Math.sin(rot);
  const T = (dx: number, dy: number): [number, number] => [x + (dx * c - dy * sn) * s, y + (dx * sn + dy * c) * s];
  const line = (a: [number, number], b: [number, number], w: number) => {
    g.moveTo(a[0], a[1]).lineTo(b[0], b[1]).stroke({ width: w + 3, color: p.ink, alpha });
    g.moveTo(a[0], a[1]).lineTo(b[0], b[1]).stroke({ width: w, color: p.body, alpha });
  };
  line(T(0, -10), T(0, 9), 3);
  line(T(-6, -7), T(6, -7), 2.5);
  const arcPts: number[] = [];
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * (0.1 + 0.8 * (i / 10));
    const [px, py] = T(Math.cos(a) * 9, 4 + Math.sin(a) * 6);
    arcPts.push(px, py);
  }
  g.poly(arcPts, false).stroke({ width: 5.5, color: p.ink, alpha });
  g.poly(arcPts, false).stroke({ width: 2.5, color: p.body, alpha });
  for (const side of [-1, 1]) {
    const tip = T(side * 9.5, 1);
    g.poly([tip[0], tip[1], ...T(side * 6.5, 5), ...T(side * 11, 6)]).fill({ color: p.core, alpha }).stroke({ width: 1, color: p.ink, alpha });
  }
  const ring = T(0, -12);
  g.circle(ring[0], ring[1], 2.5 * s).stroke({ width: 1.5, color: p.core, alpha });
  // Barnacles
  for (let k = 0; k < 3; k++) {
    const b = T(-1 + k, -3 + k * 4);
    g.circle(b[0], b[1], 1).fill({ color: 0xE7E5E4, alpha });
  }
}

/** Little flying skull with a chattering jaw. */
function skull(g: Graphics, x: number, y: number, s: number, f: number, p: Pal, alpha = 1) {
  const jaw = Math.abs(Math.sin(f * 0.8)) * s * 0.35;
  g.circle(x, y, s).fill({ color: p.body, alpha }).stroke({ width: 1.5, color: p.ink, alpha });
  g.rect(x - s * 0.6, y + s * 0.5 + jaw, s * 1.2, s * 0.45).fill({ color: p.body, alpha }).stroke({ width: 1, color: p.ink, alpha });
  g.circle(x - s * 0.38, y - s * 0.05, s * 0.28).fill({ color: INK, alpha });
  g.circle(x + s * 0.38, y - s * 0.05, s * 0.28).fill({ color: INK, alpha });
  g.rect(x - s * 0.45, y - s * 0.12, 1, 1).fill({ color: 0x86EFAC, alpha });
  g.rect(x + s * 0.32, y - s * 0.12, 1, 1).fill({ color: 0x86EFAC, alpha });
}

/** Black hole: event horizon, tilted accretion disk and lensing ring. */
function blackHole(g: Graphics, x: number, y: number, r: number, f: number, p: Pal, alpha = 1) {
  if (r <= 0.5) return;
  g.ellipse(x, y, r * 2.6, r * 0.75).stroke({ width: r * 0.5, color: p.body, alpha: 0.5 * alpha });
  for (let k = 0; k < 10; k++) {
    const a = f * 0.25 + (k / 10) * Math.PI * 2;
    g.rect(x + Math.cos(a) * r * 2.6 - 1, y + Math.sin(a) * r * 0.75 - 1, 2, 2).fill({ color: p.core, alpha });
  }
  g.circle(x, y, r * 1.25).stroke({ width: 2, color: p.core, alpha: 0.7 * alpha });
  g.circle(x, y, r).fill({ color: 0x000000, alpha });
  // Front half of the disk passes over the hole
  g.ellipse(x, y + r * 0.18, r * 2.4, r * 0.32).fill({ color: p.body, alpha: 0.85 * alpha });
  g.ellipse(x, y + r * 0.18, r * 1.6, r * 0.16).fill({ color: p.core, alpha: 0.9 * alpha });
}

/** Sun disk with rotating rays. */
function sun(g: Graphics, x: number, y: number, r: number, f: number, p: Pal, alpha = 1) {
  if (r <= 0.5) return;
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + f * 0.05;
    const len = r * (1.6 + 0.35 * Math.sin(f * 0.5 + k));
    g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r).lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len).stroke({ width: 2, color: k % 2 ? p.body : p.core, alpha: 0.9 * alpha });
  }
  orb(g, x, y, r, pal(p.body, 0xFFFFFF, p.ink), alpha);
}

/** Serpent body along `pts` (head first), thinning to the tail, with a dragon head at pts[0]. */
function serpent(g: Graphics, pts: P[], w: number, p: Pal, f: number, dir: 1 | -1 = 1) {
  const n = pts.length;
  // Ink outline, body, then a hot belly stripe: segment strokes tapering to the tail
  for (const [extra, color, scale] of [[3, p.ink, 1], [0, p.body, 1], [0, p.core, 0.35]] as const) {
    for (let i = n - 1; i >= 1; i--) {
      const wd = (w * 2 * (1 - i / n) + 2) * scale + extra;
      g.moveTo(pts[i].x, pts[i].y).lineTo(pts[i - 1].x, pts[i - 1].y).stroke({ width: wd, color, cap: 'round' });
    }
  }
  // Dorsal spines
  for (let i = 2; i < n - 1; i += 2) {
    const dx = pts[i - 1].x - pts[i + 1].x;
    const dy = pts[i - 1].y - pts[i + 1].y;
    const l = Math.hypot(dx, dy) || 1;
    const sx = -dy / l;
    const sy = dx / l;
    const hgt = w * (1 - i / n) + 2;
    g.poly([pts[i].x + sx * hgt * 0.6, pts[i].y + sy * hgt * 0.6 - hgt, pts[i].x - dx / l * 3, pts[i].y - dy / l * 3, pts[i].x + dx / l * 3, pts[i].y + dy / l * 3])
      .fill({ color: p.core }).stroke({ width: 1, color: p.ink });
  }
  beastHead(g, pts[0].x, pts[0].y, w * 1.1, 'dragon', dir, p, 1, 0.4 + 0.4 * Math.abs(Math.sin(f * 0.3)));
}

// =============================================================================================
// MORNING STARS

/** Iron Pendulum: whirl the iron head overhead faster and faster, then bring it down in one great arc. */
function ironPendulum(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const REL = 30;
  const HIT = 42;
  raiseAndHold(h, tl, 0, REL);
  tl.at(2, () => {
    h.weaponShown(false);
    h.camera(1.14, h.home.x + 30, h.home.y - 44, REL);
  });
  const head = whirl(h, tl, 2, REL, P_IRON, { r: 6, trail: [0xF1F5F9, 0x94A3B8] });
  tl.every(10, REL, 4, () => h.shake(1.5));
  // Step in and swing the head down in a widening arc onto the foe
  tl.at(REL, () => h.anim('ATTACK1'));
  travel(h, tl, REL, HIT - 4, HOME, strikeSpot(h, t0, 74), easeInOut);
  const from = once(() => head());
  drawSpan(h, tl, REL, HIT + 1, (g, t) => {
    const hand = grip(h, t > 0.5);
    const s = from();
    const e = easeIn(t);
    const x = lerp(s.x, c.x, e);
    const y = lerp(s.y, c.y, e) - arc(t) * 34;
    flail(g, hand, { x, y }, 7, t * 6, P_IRON);
    if (t > 0.4) crescent(g, hand.x, hand.y, Math.hypot(x - hand.x, y - hand.y), -1.9, Math.atan2(y - hand.y, x - hand.x), 6, P_IRON, (t - 0.4) / 0.6);
  });
  hitFx(h, tl, HIT, c, P_IRON, 18, [0xF1F5F9, 0x94A3B8, 0xFBBF24]);
  ringFx(h, tl, HIT, { x: t0.x, y: t0.y }, 6, 80, 0x94A3B8, 16);
  tl.at(HIT, () => {
    land(h, 0, { scale: 1.15, tint: 0xE2E8F0, burst: 'crater' });
    h.camera(1.26, c.x - 10, c.y, 10, true);
    h.knock(0, 16, 6);
    h.sparks(c.x, c.y, 18, [0xFBBF24, 0xF1F5F9, 0xFFFFFF]);
  });
  // Recoil: the head swings back up to his hand
  drawSpan(h, tl, HIT + 1, HIT + 14, (g, t) => {
    const hand = grip(h, false);
    flail(g, hand, { x: lerp(c.x, hand.x + 14, easeOut(t)), y: lerp(c.y, hand.y + 6, easeOut(t)) - arc(t) * 20 }, 6, t * 4, P_IRON, 0x64748B, 4);
  });
  tl.at(HIT + 14, () => h.weaponShown(true));
  backstep(h, tl, HIT + 14, HIT + 30, 14);
  tl.end(HIT + 32);
}

/** Caustic Deluge: slam the slime bell into the floor; it bursts into acid globs that rain on every foe. */
function causticDeluge(h: KnightMoveHost, tl: Timeline) {
  const SLAM = 12; // ATTACK4 sweep
  const burst = once(() => h.weaponTip());
  tl.at(0, () => {
    h.anim('ATTACK4');
    h.sound('swing');
  });
  tl.every(0, SLAM, 3, () => h.emit(h.weaponTip().x, h.weaponTip().y, { count: 1, colors: GOO, speed: [0.2, 0.6], angle: Math.PI / 2, spread: 0.3, gravity: 0.15, size: 2, life: [10, 16] }));
  tl.at(SLAM, () => {
    const b = burst();
    h.shake(6);
    h.sound('hit');
    h.emit(b.x, b.y, { count: 20, colors: GOO, speed: [1, 3.5], angle: -Math.PI / 2, spread: 1.2, gravity: 0.2, size: 3, life: [14, 26] });
    h.vfx('poison', b.x, b.y, { size: 0.7 });
  });
  drawSpan(h, tl, SLAM, SLAM + 50, (g, t) => {
    const b = burst();
    g.ellipse(b.x, h.home.y + 2, 24 * easeOut(Math.min(1, t * 4)), 5).fill({ color: 0x16A34A, alpha: 0.7 * (1 - t) });
    g.ellipse(b.x, h.home.y + 1, 14 * easeOut(Math.min(1, t * 4)), 2.5).fill({ color: 0xA3E635, alpha: 0.8 * (1 - t) });
  }, 'ground');
  // Acid globs: two per foe, the second lands the damage
  each(h).forEach((t, i) => {
    for (let k = 0; k < 2; k++) {
      const at = SLAM + 2 + i * 3 + k * 5;
      const c = chest(t);
      projectile(h, tl, at, 14, () => burst(), () => ({ x: c.x + rand(-6, 6), y: c.y + rand(-8, 4) }), 46 + i * 8,
        (g, x, y, _t, f) => {
          g.circle(x, y, 4.5).fill({ color: 0x052E16 });
          g.circle(x, y, 3.5).fill({ color: 0x22C55E });
          g.circle(x - 1, y - 1, 1.5).fill({ color: 0xD9F99D });
          g.circle(x + Math.sin(f) * 2, y + 4, 1.5).fill({ color: 0x22C55E, alpha: 0.7 });
        },
        () => {
          if (k === 1) {
            land(h, h.targets.length ? i : undefined, { scale: 0.75, tint: 0xBEF264, burst: 'poison', burstSize: 0.6 });
            h.knock(i, 4);
          } else h.flashTarget(i, 0xBEF264, 4);
          h.emit(c.x, c.y, { count: 6, colors: GOO, speed: [0.5, 2], spread: Math.PI, gravity: 0.15, size: 2, life: [12, 20] });
        });
    }
    // Sizzling fumes on the foe afterwards
    tl.every(SLAM + 22 + i * 3, SLAM + 46, 4, () => smoke(h, { x: t.x + rand(-8, 8), y: t.y - 6 }, 1, [0x4D7C0F, 0x65A30D, 0x3F6212]));
  });
  tl.end(SLAM + 52);
}

/** Brood Sac Hurl: fling the egg-sac head; it bursts on the foe and spiderlings swarm the pack. */
function broodSac(h: KnightMoveHost, tl: Timeline) {
  const hits = h.targets.length ? [...h.targets] : [h.target, h.target, h.target];
  const THROW = 12;
  const BURST = THROW + 12;
  const c0 = chest(hits[0]);
  tl.at(0, () => {
    h.anim('ATTACK1');
    h.sound('swing');
  });
  tl.at(THROW, () => h.weaponShown(false));
  projectile(h, tl, THROW, 12, () => h.weaponTip(), () => c0, 26,
    (g, x, y, t, f) => {
      const pulse = 1 + 0.12 * Math.sin(f * 1.2);
      g.ellipse(x, y, 7 * pulse, 6 * pulse).fill({ color: 0x581C87 }).stroke({ width: 2, color: INK });
      g.ellipse(x - 1, y - 1, 4, 3).fill({ color: 0xC084FC, alpha: 0.7 });
      for (let k = 0; k < 3; k++) g.moveTo(x - 5 + k * 4, y - 4).lineTo(x - 4 + k * 4, y + 4).stroke({ width: 1, color: 0x14B8A6, alpha: 0.8 });
      chain(g, grip(h, false).x, grip(h, false).y, x, y, 0xE9D5FF, 4, 1 - t);
    }, () => undefined);
  // The sac bursts: silk splat and the first bite
  tl.at(BURST, () => {
    land(h, h.targets.length ? 0 : undefined, { scale: 0.8, tint: 0xE9D5FF, burst: 'poison', burstSize: 0.7 });
    h.knock(0, 6);
    h.emit(c0.x, c0.y, { count: 16, colors: [0xA855F7, 0xF5D0FE, 0x14B8A6], speed: [1, 3], spread: Math.PI, gravity: 0.12, size: 2, life: [14, 26] });
  });
  drawSpan(h, tl, BURST, BURST + 44, (g, t) => {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      g.moveTo(c0.x, c0.y).lineTo(c0.x + Math.cos(a) * 18, c0.y + Math.sin(a) * 12).stroke({ width: 1, color: 0xF5F3FF, alpha: 0.7 * (1 - t) });
    }
    g.circle(c0.x, c0.y, 9).stroke({ width: 1, color: 0xF5F3FF, alpha: 0.5 * (1 - t) });
  });
  // Spiderlings skitter along the floor to the next foes
  hits.slice(1).forEach((t, n) => {
    const k = n + 1;
    const from = BURST + 2 + n * 4;
    const dur = 10 + n * 2;
    drawSpan(h, tl, from, from + dur, (g, u, f) => {
      for (let s = 0; s < 3; s++) {
        const x = lerp(hits[0].x, t.x - 6, easeInOut(u)) + s * 5 - 5;
        const y = lerp(hits[0].y, t.y, u) - 2 - Math.abs(Math.sin(f + s)) * 3 - arc(u) * 10;
        crawler(g, x, y, 4, f * 1.2 + s, 0x3B0764, 0xF43F5E);
      }
    });
    tl.at(from + dur, () => {
      land(h, h.targets.length ? k : undefined, { scale: 0.65, tint: 0xE9D5FF });
      h.knock(k, 4, 2);
      h.sparks(chest(t).x, chest(t).y, 6, [0xA855F7, 0xF5D0FE]);
    });
  });
  // A new sac swells on the chain
  tl.at(BURST + 26, () => {
    h.weaponShown(true);
    h.emit(h.weaponTip().x, h.weaponTip().y, { count: 8, colors: [0xA855F7, 0xF5D0FE], speed: [0.4, 1.2], spread: Math.PI, gravity: 0, size: 2, life: [12, 20] });
  });
  tl.end(BURST + 6 + hits.length * 6 + 16);
}

/** Requiem Censer: swing the censer around his head; the souls in its incense drift out to haunt the foe. */
function requiemCenser(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const SOULS = [18, 23, 28, 33];
  raiseAndHold(h, tl, 0, 46);
  tl.at(2, () => {
    h.weaponShown(false);
    h.camera(1.12, (h.home.x + t0.x) / 2, h.home.y - 44, 50);
    h.sound('level_up');
  });
  tl.during(0, 12, (t) => h.dim(0.45 * t, 0x06121C));
  drawSpan(h, tl, 0, 56, (g, t, f) => runeCircle(g, h.pos().x, h.pos().y, 34 * easeOut(Math.min(1, f / 10)), f * 0.04, P_SOUL, t > 0.8 ? 1 - (t - 0.8) / 0.2 : 0.9), 'ground');
  const head = whirl(h, tl, 2, 46, P_SOUL, {
    reach: 22,
    link: 0xCBD5E1,
    trail: [0xE0F2FE, 0x7DD3FC, 0xCBD5E1],
    head: (g, x, y, f) => {
      // Silver censer: domed cage with soul-light through its slots
      g.ellipse(x, y, 6, 7).fill({ color: 0xCBD5E1 }).stroke({ width: 2, color: INK });
      for (let k = -1; k <= 1; k++) g.rect(x + k * 3 - 0.5, y - 4, 1.5, 7).fill({ color: 0x7DD3FC, alpha: 0.7 + 0.3 * Math.sin(f + k) });
      g.rect(x - 2, y - 9, 4, 2).fill({ color: 0xE2E8F0 }).stroke({ width: 1, color: INK });
    },
  });
  tl.every(4, 46, 2, () => {
    const p = head();
    h.emit(p.x, p.y, { count: 1, colors: [0xCBD5E1, 0x94A3B8, 0xE0F2FE], speed: [0.2, 0.5], angle: -Math.PI / 2, spread: 0.6, gravity: -0.03, size: 4, life: [24, 36] });
  });
  // Souls rise from the incense and spiral to the foe
  SOULS.forEach((at, k) => {
    const last = k === SOULS.length - 1;
    const start = once(() => head());
    drawSpan(h, tl, at, at + 16, (g, t, f) => {
      const s = start();
      const x = lerp(s.x, c.x, easeIn(t)) + Math.sin(t * 9 + k) * 6 * (1 - t);
      const y = lerp(s.y - 10, c.y, easeIn(t)) - arc(t) * (20 + k * 6);
      flier(g, x, y, 4, f * 0.6, 0xBAE6FD, 0x0EA5E9, 1);
      g.moveTo(x - 4, y).lineTo(x - 12, y + 2).stroke({ width: 3, color: 0xE0F2FE, alpha: 0.35 });
    });
    tl.at(at + 16, () => {
      if (last) {
        land(h, 0, { tint: 0xBAE6FD, flash: 0xE0F2FE, burst: 'portal', burstSize: 0.8 });
        h.knock(0, 8, 4);
      } else {
        h.flashTarget(0, 0xBAE6FD, 4);
        h.shake(2);
      }
      h.sparks(c.x, c.y, last ? 12 : 4, [0x7DD3FC, 0xE0F2FE]);
    });
  });
  tl.at(36, () => h.vfx('heal', h.pos().x, h.pos().y - 26, { size: 0.9, tint: 0xBAE6FD }));
  motesFx(h, tl, 34, 54, () => h.pos(), [0xBAE6FD, 0xE0F2FE, 0xFFFFFF], 3, 14);
  tl.at(46, () => h.weaponShown(true));
  tl.during(46, 58, (t) => h.dim(0.45 * (1 - t), 0x06121C));
  tl.end(60);
}

/** Brimstone Comet: spin the slag head white-hot, loose it into the sky, and it falls burning on the back row. */
function brimstoneComet(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const REL = 30;
  const FALL = 44;
  const HIT = 54;
  const heat = (f: number) => pal(f < 16 ? 0xB91C1C : f < 26 ? 0xEF4444 : 0xFDE68A, 0xFFFFFF, 0x450A0A);
  raiseAndHold(h, tl, 0, REL);
  tl.at(2, () => {
    h.weaponShown(false);
    h.camera(1.14, h.home.x + 24, h.home.y - 44, REL);
  });
  tl.during(0, 14, (t) => h.dim(0.35 * t, 0x1A0505));
  const head = whirl(h, tl, 2, REL, P_BRIM, {
    r: 6, link: 0xF97316, trail: FIRE,
    head: (g, x, y, f) => {
      g.circle(x, y, 10 + Math.sin(f) * 1.5).fill({ color: 0xF97316, alpha: 0.25 });
      flailHead(g, x, y, 6, f * 0.5, heat(f));
    },
  });
  tl.every(10, REL, 4, () => h.shake(1.5));
  // Release up and out of frame
  tl.at(REL, () => {
    h.anim('ATTACK4');
    h.sound('swing');
  });
  projectile(h, tl, REL, 8, () => head(), () => ({ x: t0.x - 40, y: 10 }), 0,
    (g, x, y) => {
      lance(g, x, y + 16, x, y, 6, P_BRIM, 0.8);
      flailHead(g, x, y, 6, 0, heat(30));
    }, () => undefined);
  // The comet falls on the back row with a long burning tail
  drawSpan(h, tl, FALL, HIT + 1, (g, t, f) => {
    const x = lerp(t0.x + 70, c.x, easeIn(t));
    const y = lerp(10, c.y, easeIn(t));
    lance(g, x, y, x + 60 * (1 - t * 0.3), y - 70 * (1 - t * 0.3), 14, P_BRIM, 0.85);
    g.circle(x, y, 13).fill({ color: 0xF97316, alpha: 0.3 });
    flailHead(g, x, y, 8, f * 0.6, heat(30));
  });
  tl.every(FALL, HIT, 1, () => embers(h, { x: lerp(t0.x + 70, c.x, 0.5), y: lerp(10, c.y, 0.5) }, 1));
  tl.at(FALL, () => h.camera(1.16, c.x - 10, c.y - 30, 30));
  hitFx(h, tl, HIT, c, P_BRIM, 24, FIRE);
  ringFx(h, tl, HIT, { x: t0.x, y: t0.y }, 8, 130, 0xEF4444, 22, 4);
  drawSpan(h, tl, HIT, HIT + 60, (g, t) => scorch(g, t0.x, t0.y, 24, EMBER, 1 - t), 'ground');
  tl.at(HIT, () => {
    land(h, 0, { scale: 1.2, tint: 0xFFB08A, flash: 0xFFE2B8, burst: 'explosion', burstSize: 1.3 });
    h.camera(1.28, c.x, c.y, 12, true);
    h.knock(0, 10, 16);
    embers(h, c, 24);
  });
  tl.every(HIT + 2, HIT + 30, 4, () => smoke(h, { x: t0.x + rand(-14, 14), y: t0.y - 8 }, 2, [0x854D0E, 0xA16207, 0x57534E]));
  // The chain whips the head back
  drawSpan(h, tl, HIT + 6, HIT + 18, (g, t) => {
    const hand = grip(h, false);
    flail(g, hand, { x: lerp(c.x, hand.x + 12, easeIn(t)), y: lerp(c.y, hand.y + 6, easeIn(t)) - arc(t) * 26 }, 6, t * 5, heat(30), 0xF97316);
  });
  tl.at(HIT + 18, () => h.weaponShown(true));
  tl.during(HIT + 10, HIT + 28, (t) => h.dim(0.35 * (1 - t), 0x1A0505));
  tl.end(HIT + 30);
}

/** Permafrost Shatter: frost gathers on the bell, the slam freezes the floor and entombs every foe, then the ice bursts. */
function permafrostShatter(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const SLAM = 28;
  const BURST = 58;
  raiseAndHold(h, tl, 0, 20);
  tl.at(0, () => h.camera(1.1, h.home.x + 40, h.home.y - 40, 26));
  tl.during(0, 14, (t) => h.dim(0.4 * t, 0x07142B));
  chargeFx(h, tl, 4, 22, () => h.weaponTip(), P_FROST, 30, 12);
  tl.every(2, 22, 3, () => h.emit(h.weaponTip().x, h.weaponTip().y, { count: 1, colors: [0xFFFFFF, 0xBFDBFE], speed: [0.2, 0.6], spread: Math.PI, gravity: 0.03, size: 2, life: [16, 24] }));
  tl.at(22, () => {
    h.anim('SKILL1');
    h.sound('swing');
  });
  tl.at(SLAM, () => {
    const b = { x: h.pos().x + 26, y: h.home.y };
    h.shake(8);
    h.sound('hit');
    h.vfx('ice', b.x, b.y - 10, { size: 0.8, start: 66 });
    shards(h, { x: b.x, y: b.y - 6 }, 10);
  });
  ringFx(h, tl, SLAM, () => ({ x: h.pos().x + 26, y: h.home.y }), 6, 240, 0xBFDBFE, 26, 3);
  // Frost spreads across the floor; ice crystals entomb each foe
  foes.forEach((t, i) => {
    crackFx(h, tl, SLAM, { x: h.home.x + 30, y: h.home.y }, { x: t.x, y: t.y }, P_FROST, 8 + i * 2, BURST - SLAM + 6);
    const enc = SLAM + 8 + i * 3;
    drawSpan(h, tl, enc, BURST, (g, _u, f) => {
      const up = easeOut(Math.min(1, f / 6));
      crystal(g, t.x - 12, t.y + 4, 26 * up, 7, P_FROST, -5, 0.85);
      crystal(g, t.x + 12, t.y + 3, 30 * up, 7, P_FROST, 5, 0.85);
      crystal(g, t.x, t.y + 6, t.height * 0.9 * up, 11, P_FROST, 1, 0.75);
    });
    tl.at(enc, () => {
      h.flashTarget(i, 0xBFDBFE, BURST - enc);
      h.sound('hit');
    });
    tl.at(BURST + i * 2, () => {
      land(h, h.targets.length ? i : undefined, { scale: 0.9, tint: 0xE0F2FE, flash: 0xE0F2FE, burst: 'ice', burstSize: 1.1 });
      h.knock(i, 8, 6);
      shards(h, chest(t), 16);
    });
  });
  tl.at(BURST, () => h.camera(1.16, (foes[0].x + foes[foes.length - 1].x) / 2, h.home.y - 30, 14, true));
  tl.during(BURST + 4, BURST + 20, (t) => h.dim(0.4 * (1 - t), 0x07142B));
  tl.end(BURST + 22);
}

/** Boulder Bowl: an underhand heave sends the boulder rolling through the front foe and bounding into the next. */
function boulderBowl(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h).slice(0, 2);
  const REL = 14; // ATTACK2 sweep
  const R = 14;
  const SPEED = 9;
  const x0 = h.home.x + 34;
  tl.at(0, () => {
    h.anim('ATTACK2');
    h.stretch(1.08, 0.92);
    h.sound('swing');
  });
  tl.at(REL - 2, () => h.stretch(1, 1));
  tl.at(REL, () => {
    h.weaponShown(false);
    dust(h, { x: x0, y: h.home.y }, 8, -1);
    h.shake(5);
  });
  const hit1 = REL + Math.round((foes[0].x - 14 - x0) / SPEED);
  const hit2 = foes[1] ? hit1 + 10 : hit1;
  // Rolling, then a bounce into the second foe, then off-stage
  drawSpan(h, tl, REL, hit2 + 22, (g, _t, f) => {
    const fr = REL + f;
    let x: number;
    let y: number;
    if (fr <= hit1) {
      x = lerp(x0, foes[0].x - 14, (fr - REL) / Math.max(1, hit1 - REL));
      y = h.home.y - R;
    } else if (foes[1] && fr <= hit2) {
      const u = (fr - hit1) / (hit2 - hit1);
      x = lerp(foes[0].x - 14, foes[1].x - 12, u);
      y = lerp(foes[0].y, foes[1].y, u) - R - arc(u) * 30;
    } else {
      const last = foes[foes.length - 1];
      const u = (fr - hit2) / 22;
      x = lerp(last.x - 12, last.x + 80, u);
      y = last.y - R - arc(Math.min(1, u * 2)) * 10;
      if (u > 0.6) return;
    }
    const rot = (x - x0) / R;
    g.circle(x, y, R + 2).fill({ color: INK });
    g.circle(x, y, R).fill({ color: 0x78716C });
    g.circle(x - 3, y - 3, R * 0.5).fill({ color: 0xA8A29E });
    // Warpaint stripes turn with the boulder
    for (let k = 0; k < 2; k++) {
      const a = rot + k * Math.PI;
      g.moveTo(x + Math.cos(a) * R * 0.2, y + Math.sin(a) * R * 0.2).lineTo(x + Math.cos(a) * R * 0.9, y + Math.sin(a) * R * 0.9).stroke({ width: 2, color: 0xB91C1C });
    }
  });
  tl.every(REL, hit1, 2, () => dust(h, { x: lerp(x0, foes[0].x, 0.5), y: h.home.y }, 1, -1));
  hitFx(h, tl, hit1, chest(foes[0]), P_STONE, 18, [0xA8A29E, 0xD6D3D1, 0xB91C1C]);
  tl.at(hit1, () => {
    land(h, h.targets.length ? 0 : undefined, { scale: 1.1, tint: 0xD6D3D1, burst: 'crater' });
    h.knock(0, 18, 10);
    debris(h, { x: foes[0].x, y: foes[0].y }, 12, [...DIRT, 0x78716C]);
    h.camera(1.18, foes[0].x, foes[0].y - 30, 14, true);
  });
  if (foes[1]) {
    hitFx(h, tl, hit2, chest(foes[1]), P_STONE, 15);
    tl.at(hit2, () => {
      land(h, h.targets.length > 1 ? 1 : undefined, { scale: 0.9, tint: 0xD6D3D1, burst: 'crater', burstSize: 0.8 });
      h.knock(1, 14, 8);
      debris(h, { x: foes[1].x, y: foes[1].y }, 8);
    });
  }
  tl.at(hit2 + 18, () => {
    h.weaponShown(true);
    h.anim('DEFENSE');
    dust(h, h.pos(), 6, 1);
  });
  tl.end(hit2 + 26);
}

/** Abyssal Anchor: hurl the anchor on its tentacle chain, drag the foe into a whirlpool, then crush it. */
function abyssalAnchor(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const THROW = 26;
  const HOOK = 36;
  const YANK = 54;
  const CRUSH = 62;
  raiseAndHold(h, tl, 0, THROW);
  tl.at(2, () => {
    h.weaponShown(false);
    h.camera(1.12, h.home.x + 40, h.home.y - 44, THROW);
  });
  tl.during(0, 16, (t) => h.dim(0.5 * t, 0x021614));
  tl.every(0, CRUSH + 20, 3, () => h.emit(rand(40, 400), rand(60, 170), { count: 1, colors: [0x99F6E4, 0x5EEAD4], speed: [0.2, 0.5], angle: -Math.PI / 2, spread: 0.2, gravity: -0.02, size: 1, life: [20, 40] }));
  const head = whirl(h, tl, 2, THROW, P_TIDE, {
    reach: 22, link: 0x0F766E,
    head: (g, x, y, f) => anchor(g, x, y, 0.8, f * 0.3, P_TIDE),
  });
  tl.at(THROW, () => {
    h.anim('ATTACK4');
    h.sound('swing');
  });
  // Anchor in flight, the tentacle chain stretching behind it
  const from = once(() => head());
  drawSpan(h, tl, THROW, YANK + 8, (g, t, f) => {
    const hand = grip(h, false);
    const u = Math.min(1, (THROW + f - THROW) / (HOOK - THROW));
    const s = from();
    const ax = lerp(s.x, c.x, easeOut(u));
    const ay = lerp(s.y, c.y, easeOut(u)) - arc(u) * 30;
    tentacle(g, hand.x, hand.y, ax, ay, 6, 18 * Math.sin(f * 0.2), 0x14B8A6, 0xCCFBF1);
    anchor(g, ax, ay, 0.9, u * 4 + (f > HOOK - THROW ? Math.sin(f * 0.6) * 0.2 : 0), P_TIDE);
  });
  // Whirlpool under the foe drags it down
  drawSpan(h, tl, HOOK, CRUSH + 20, (g, t, f) => {
    const grow = easeOut(Math.min(1, f / 8));
    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
    for (let k = 0; k < 4; k++) {
      const r = (34 - k * 7) * grow;
      g.ellipse(t0.x, t0.y, r, r * 0.28).stroke({ width: 2, color: k % 2 ? 0x14B8A6 : 0x99F6E4, alpha: 0.8 * fade });
      const a = f * 0.3 + k;
      g.rect(t0.x + Math.cos(a) * r - 1, t0.y + Math.sin(a) * r * 0.28 - 1, 2, 2).fill({ color: 0xFFFFFF, alpha: fade });
    }
  }, 'ground');
  tl.every(HOOK, YANK, 4, () => {
    h.knock(0, 0, -4);
    h.flashTarget(0, 0x5EEAD4, 3);
  });
  tl.at(HOOK, () => {
    h.shake(5);
    h.sparks(c.x, c.y, 8, [0x14B8A6, 0x99F6E4]);
  });
  tl.at(YANK, () => {
    h.anim('ATTACK2');
    h.knock(0, -18, 0);
    h.camera(1.2, c.x - 20, c.y - 30, 20);
  });
  // A colossal phantom anchor crashes down out of the dark
  drawSpan(h, tl, YANK, CRUSH + 12, (g, t, f) => {
    const drop = f < CRUSH - YANK ? easeIn(f / (CRUSH - YANK)) : 1;
    const fade = f < CRUSH - YANK ? 0.9 : 1 - (f - (CRUSH - YANK)) / 12;
    anchor(g, t0.x, lerp(20, c.y - 18, drop), 2.4, Math.PI, P_TIDE, fade);
  });
  drawSpan(h, tl, CRUSH, CRUSH + 18, (g, t) => pillar(g, t0.x, t0.y - 90 * easeOut(Math.min(1, t * 3)), t0.y, 26 * (1 - t), P_TIDE, 0.8));
  tl.at(CRUSH, () => {
    land(h, 0, { scale: 1.3, tint: 0x99F6E4, flash: 0xCCFBF1, burst: 'quake', burstSize: 1.3 });
    h.camera(1.32, c.x, c.y, 12, true);
    h.knock(0, 6, -14);
    shards(h, c, 18);
    h.emit(t0.x, t0.y, { count: 26, colors: [0x14B8A6, 0x99F6E4, 0xFFFFFF], speed: [1.5, 4.5], angle: -Math.PI / 2, spread: 0.8, gravity: 0.18, size: 3, life: [16, 30] });
  });
  tl.at(CRUSH + 14, () => h.weaponShown(true));
  tl.during(CRUSH + 10, CRUSH + 26, (t) => h.dim(0.5 * (1 - t), 0x021614));
  tl.end(CRUSH + 28);
}

/** Kraken's Maelstrom: a water vortex spins up around the knight; tentacles burst from the floor and crush every foe. */
function krakensMaelstrom(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const SLAM = 34;
  raiseAndHold(h, tl, 0, 28);
  tl.at(2, () => {
    h.camera(1.06, 250, h.home.y - 40, 80);
    h.sound('level_up');
  });
  tl.during(0, 16, (t) => h.dim(0.5 * t, 0x021614));
  drawSpan(h, tl, 2, SLAM, (g, t, f) => {
    const p = h.pos();
    for (let k = 0; k < 3; k++) {
      const a = f * 0.35 + (k * Math.PI * 2) / 3;
      crescent(g, p.x, p.y - 24, 26 + k * 3, a, a + 1.6, 5, P_TIDE, 0.8 * Math.min(1, t * 2));
    }
  });
  tl.every(4, SLAM, 2, () => h.emit(h.pos().x + rand(-30, 30), h.pos().y - rand(0, 50), { count: 1, colors: [0x99F6E4, 0xFFFFFF, 0x14B8A6], speed: [0.5, 1.5], spread: Math.PI, gravity: 0.08, size: 2, life: [10, 18] }));
  tl.at(28, () => h.anim('SKILL1'));
  tl.at(SLAM, () => {
    h.shake(9);
    h.sound('hit');
    h.vfx('shockwave', h.pos().x + 24, h.home.y - 8, { size: 1, tint: 0x5EEAD4 });
  });
  ringFx(h, tl, SLAM, () => ({ x: h.pos().x + 24, y: h.home.y }), 8, 260, 0x14B8A6, 28, 4);
  // A tentacle rises beside each foe, curls over and slams down
  foes.forEach((t, i) => {
    const up = SLAM + 4 + i * 5;
    const slam = up + 12;
    drawSpan(h, tl, up, slam + 26, (g, u, f) => {
      const rise = easeOut(Math.min(1, f / 8));
      const sink = f > slam - up + 14 ? (f - (slam - up + 14)) / 12 : 0;
      const k = Math.max(0, rise - sink);
      const base = { x: t.x + 22, y: t.y + 4 };
      const down = f >= slam - up ? 1 : 0;
      const tipX = lerp(base.x + 10, t.x - 2, down);
      const tipY = lerp(base.y - 60 * k, t.y - t.height * 0.6, down);
      g.ellipse(base.x, base.y, 14 * k, 4).fill({ color: 0x042F2E, alpha: 0.8 });
      tentacle(g, base.x, base.y, tipX, tipY, 11 * k, 14 * (1 - down), 0x14B8A6, 0xCCFBF1);
    });
    tl.at(up, () => h.emit(t.x + 22, t.y, { count: 10, colors: [0x14B8A6, 0x99F6E4, 0xFFFFFF], speed: [1, 3], angle: -Math.PI / 2, spread: 0.5, gravity: 0.15, size: 2, life: [12, 22] }));
    tl.at(slam, () => {
      land(h, h.targets.length ? i : undefined, { scale: 0.85, tint: 0x99F6E4, burst: 'quake', burstSize: 0.9 });
      h.knock(i, -4, -8);
      h.emit(t.x, t.y, { count: 14, colors: [0x14B8A6, 0x99F6E4, 0xFFFFFF], speed: [1.5, 3.5], angle: -Math.PI / 2, spread: 1.2, gravity: 0.2, size: 2, life: [14, 24] });
    });
  });
  tl.during(SLAM + 40, SLAM + 56, (t) => h.dim(0.5 * (1 - t), 0x021614));
  tl.end(SLAM + 58);
}

/** Sunflare Pendulum: the golden head becomes a small sun overhead, then bursts into flares that rain on every foe. */
function sunflarePendulum(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const UP = 34;
  const BURST = 42;
  const sunAt = { x: h.home.x + 70, y: h.home.y - 104 };
  raiseAndHold(h, tl, 0, UP);
  tl.at(2, () => {
    h.weaponShown(false);
    h.camera(1.1, h.home.x + 50, h.home.y - 50, BURST);
    h.sound('level_up');
  });
  tl.during(0, 16, (t) => h.dim(0.5 * t, 0x140C02));
  const head = whirl(h, tl, 2, UP, P_SUN, {
    reach: 22, link: 0xFBBF24, trail: [0xFDE68A, 0xFBBF24, 0xFFFFFF],
    head: (g, x, y, f) => sun(g, x, y, 4 + Math.min(6, f * 0.2), f, P_SUN),
  });
  // The sun rises out of the whirl and swells
  projectile(h, tl, UP, BURST - UP, () => head(), () => sunAt, 0, (g, x, y, t, f) => sun(g, x, y, 10 + 6 * t, f, P_SUN), () => undefined);
  drawSpan(h, tl, BURST, BURST + 10, (g, t, f) => sun(g, sunAt.x, sunAt.y, 16 * (1 + t * 0.6), f, P_SUN, 1 - t));
  tl.at(BURST, () => {
    h.flash(0.4, 0xFFF3C4);
    h.shake(6);
    h.sound('crit');
  });
  // Flares lance down onto each foe
  foes.forEach((t, i) => {
    const at = BURST + 2 + i * 3;
    const c = chest(t);
    drawSpan(h, tl, at, at + 10, (g, u) => {
      const reach = Math.min(1, u * 3);
      lance(g, sunAt.x, sunAt.y, lerp(sunAt.x, c.x, reach), lerp(sunAt.y, c.y, reach), 8 * (1 - u * 0.6), P_SUN, 1 - u * 0.4);
    });
    tl.at(at + 3, () => {
      land(h, h.targets.length ? i : undefined, { scale: 0.85, tint: 0xFFE6A0, flash: 0xFFF7D6, burst: 'fire', burstSize: 0.9 });
      h.knock(i, 6, 6);
    });
  });
  for (let k = 0; k < 4; k++) {
    const x = rand(180, 400);
    drawSpan(h, tl, BURST + 1 + k * 2, BURST + 8 + k * 2, (g, u) => lance(g, sunAt.x, sunAt.y, lerp(sunAt.x, x, Math.min(1, u * 3)), lerp(sunAt.y, h.home.y, Math.min(1, u * 3)), 4, P_SUN, 1 - u));
  }
  tl.at(BURST + 14, () => h.weaponShown(true));
  tl.during(BURST + 12, BURST + 28, (t) => h.dim(0.5 * (1 - t), 0x140C02));
  tl.end(BURST + 30);
}

/** Wyrmchain Inferno: the chain wakes as a fire wyrm, coils overhead, then rips through the whole pack. */
function wyrmchainInferno(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const LUNGE = 30;
  const BACK = 54;
  const far = Math.min(410, Math.max(...foes.map((t) => t.x)) + 40);
  const history: P[] = [];
  raiseAndHold(h, tl, 0, LUNGE);
  tl.at(2, () => {
    h.weaponShown(false);
    h.camera(1.08, (h.home.x + far) / 2, h.home.y - 50, BACK + 10);
    h.sound('level_up');
  });
  tl.during(0, 16, (t) => h.dim(0.5 * t, 0x1A0303));
  const wyrmHead = (f: number): P => {
    const hand = grip(h);
    if (f < LUNGE) {
      const a = f * 0.32;
      return { x: hand.x + Math.cos(a) * 30, y: hand.y - 14 + Math.sin(a) * 12 - Math.min(20, f) };
    }
    if (f < BACK) {
      const u = (f - LUNGE) / (BACK - LUNGE);
      return { x: lerp(hand.x + 20, far, easeInOut(u)), y: h.home.y - 34 + Math.sin(u * Math.PI * 3) * 16 };
    }
    const u = Math.min(1, (f - BACK) / 16);
    return { x: lerp(far, hand.x + 10, easeIn(u)), y: lerp(h.home.y - 34, hand.y, u) - arc(u) * 30 };
  };
  drawSpan(h, tl, 2, BACK + 16, (g, _t, f) => {
    const fr = f + 2;
    const p = wyrmHead(fr);
    history.unshift(p);
    if (history.length > 26) history.length = 26;
    const pts = history.filter((_, i) => i % 2 === 0);
    if (pts.length < 2) return;
    const dir: 1 | -1 = fr >= BACK || (history[1] && history[1].x > p.x) ? -1 : 1;
    chain(g, grip(h).x, grip(h).y, pts[pts.length - 1].x, pts[pts.length - 1].y, 0xF97316);
    serpent(g, pts, 6, P_WYRM, fr, dir);
  });
  tl.every(4, BACK + 10, 2, () => embers(h, history[0] ?? h.pos(), 2));
  tl.at(LUNGE, () => {
    h.anim('ATTACK4');
    h.sound('swing');
  });
  // Fire breath along the path; each foe burns as the wyrm passes
  tl.every(LUNGE, BACK, 3, () => {
    const p = history[0];
    if (p) h.emit(p.x + 10, p.y, { count: 4, colors: FIRE, speed: [1.5, 3], angle: 0.4, spread: 0.4, gravity: 0.02, size: 3, life: [12, 20] });
  });
  foes.forEach((t, i) => {
    const u = Math.min(1, Math.max(0, (t.x - (h.home.x + 24)) / (far - h.home.x - 24)));
    const at = LUNGE + Math.round(u * (BACK - LUNGE));
    hitFx(h, tl, at, chest(t), P_WYRM, 16, FIRE);
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: 0.9, tint: 0xFFB08A, burst: 'fire' });
      h.knock(i, 10, 10);
    });
  });
  tl.at(BACK + 16, () => {
    h.weaponShown(true);
    h.idle();
  });
  tl.during(BACK + 6, BACK + 22, (t) => h.dim(0.5 * (1 - t), 0x1A0303));
  tl.end(BACK + 24);
}

/** Molten Meteor: the dragon bell heats to magma; he leaps and hammers it down as a meteor. */
function moltenMeteor(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const LEAP = 14;
  const HIT = 36; // ATTACK4 from 24 sweeps at 36
  tl.at(0, () => h.anim('JUMP_FRONT_START'));
  tl.during(0, LEAP, (t) => h.stretch(1 + 0.12 * t, 1 - 0.12 * t));
  tl.during(0, 14, (t) => h.dim(0.45 * t, 0x1A0303));
  tl.every(0, LEAP, 2, () => h.emit(h.weaponTip().x, h.weaponTip().y, { count: 2, colors: [0xF97316, 0xFDE047, BLOOD], speed: [0.2, 0.8], angle: Math.PI / 2, spread: 0.3, gravity: 0.15, size: 2, life: [10, 18] }));
  drawSpan(h, tl, 0, 30, (g, t, f) => {
    const p = h.weaponTip();
    g.circle(p.x, p.y, 6 + 6 * t + Math.sin(f) * 1.5).fill({ color: 0xF97316, alpha: 0.35 });
  }, 'back');
  tl.at(LEAP, () => {
    h.stretch(0.88, 1.14);
    h.anim('JUMP_FRONT_UP');
    h.sound('swing');
    dust(h, h.pos(), 8, 1);
  });
  travel(h, tl, LEAP, HIT - 6, HOME, { x: (t0.x - 70 - h.home.x) * 0.6, y: 0 }, easeOut);
  tl.during(LEAP, 26, (t) => h.lift(easeOut(t) * 40));
  tl.at(HIT - 12, () => {
    h.stretch(1, 1);
    h.anim('ATTACK4');
    h.weaponShown(false);
    h.camera(1.14, c.x - 30, c.y - 30, 20);
  });
  // The molten head swells overhead, then is hammered down onto the foe
  drawSpan(h, tl, HIT - 12, HIT + 1, (g, t, f) => {
    const hand = grip(h);
    const fall = Math.max(0, (t - 0.5) / 0.5);
    const x = lerp(hand.x + 2, c.x, easeIn(fall));
    const y = lerp(hand.y - 20, c.y, easeIn(fall));
    const r = 6 + 10 * Math.min(1, t * 2);
    if (fall > 0) lance(g, x, y, x - 30, y - 50, r * 1.2, P_LAVA, 0.8);
    chain(g, hand.x, hand.y, x, y, 0xF97316);
    g.circle(x, y, r + 4).fill({ color: 0xF97316, alpha: 0.35 });
    flailHead(g, x, y, r, f * 0.4, P_LAVA, 10);
  });
  travel(h, tl, HIT - 6, HIT, here(h), strikeSpot(h, t0, 54), easeIn);
  tl.during(HIT - 6, HIT, (t) => h.lift(lerp(40, 0, easeIn(t))));
  hitFx(h, tl, HIT, c, P_LAVA, 30, [0xFDE047, 0xF97316, BLOOD, 0xFFFFFF]);
  ringFx(h, tl, HIT, { x: t0.x, y: t0.y }, 10, 150, 0xF97316, 24, 5);
  drawSpan(h, tl, HIT, HIT + 60, (g, t) => {
    scorch(g, t0.x, t0.y, 28, EMBER, 1 - t);
    for (let k = 0; k < 3; k++) g.ellipse(t0.x - 20 + k * 20, t0.y + 2, 7, 2).fill({ color: 0xF97316, alpha: 0.8 * (1 - t) });
  }, 'ground');
  tl.at(HIT, () => {
    h.anim('LANDING_END');
    land(h, 0, { scale: 1.3, tint: 0xFFC48A, flash: 0xFFE2B8, burst: 'explosion', burstSize: 1.5 });
    h.camera(1.34, c.x, c.y, 12, true);
    h.knock(0, 18, 8);
    h.emit(t0.x, t0.y - 6, { count: 30, colors: [0xF97316, 0xFDE047, BLOOD, 0x431407], speed: [1.5, 5], angle: -Math.PI / 2, spread: 1, gravity: 0.22, size: 3, life: [16, 32] });
  });
  tl.at(HIT + 12, () => h.weaponShown(true));
  tl.during(HIT + 14, HIT + 30, (t) => h.dim(0.45 * (1 - t), 0x1A0303));
  backstep(h, tl, HIT + 14, HIT + 32, 22);
  tl.end(HIT + 34);
}

/** Event Horizon: hurl the void head into the pack; it collapses into a black hole that drags them in, then implodes. */
function eventHorizon(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const cx = foes.reduce((s, t) => s + t.x, 0) / foes.length;
  const cy = foes.reduce((s, t) => s + chest(t).y, 0) / foes.length - 6;
  const THROW = 24;
  const OPEN = 34;
  const IMPLODE = 70;
  raiseAndHold(h, tl, 0, THROW);
  tl.at(2, () => {
    h.weaponShown(false);
    h.camera(1.1, h.home.x + 30, h.home.y - 44, THROW);
  });
  tl.during(0, 16, (t) => h.dim(0.65 * t, 0x05010C));
  const head = whirl(h, tl, 2, THROW, P_COSMOS, { r: 6, link: 0x7C3AED, trail: [0xC084FC, 0xFAF5FF, 0x7C3AED] });
  tl.at(THROW, () => {
    h.anim('ATTACK4');
    h.sound('swing');
    h.camera(1.12, cx, cy, IMPLODE - THROW + 10);
  });
  projectile(h, tl, THROW, OPEN - THROW, () => head(), () => ({ x: cx, y: cy }), 18,
    (g, x, y, t, f) => {
      chain(g, grip(h, false).x, grip(h, false).y, x, y, 0x7C3AED, 0, 1 - t);
      flailHead(g, x, y, 6, f * 0.5, P_COSMOS);
    }, () => h.shake(6));
  // The singularity
  drawSpan(h, tl, OPEN, IMPLODE, (g, t, f) => {
    const r = 4 + 12 * easeOut(Math.min(1, f / 10)) + Math.sin(f * 0.5);
    blackHole(g, cx, cy, r * (t > 0.85 ? 1 - (t - 0.85) / 0.15 * 0.8 : 1), f, P_COSMOS);
    for (let k = 0; k < 3; k++) g.circle(cx, cy, r * (3 + k) * (1 - ((f * 0.04 + k / 3) % 1))).stroke({ width: 1, color: 0xC084FC, alpha: 0.35 });
  });
  chargeFx(h, tl, OPEN, IMPLODE, () => ({ x: cx, y: cy }), P_COSMOS, 110, 22);
  tl.every(OPEN + 2, IMPLODE - 4, 3, () => foes.forEach((t, i) => h.knock(i, Math.sign(cx - t.x) * 2.5, 1.5)));
  foes.forEach((t, i) => {
    const at = OPEN + 10 + i * 6;
    tl.at(at, () => land(h, h.targets.length ? i : undefined, { scale: 0.55, tint: 0xE9D5FF, spark: 0xC084FC }));
  });
  // Implosion
  hitFx(h, tl, IMPLODE, { x: cx, y: cy }, P_COSMOS, 34);
  ringFx(h, tl, IMPLODE, { x: cx, y: h.home.y }, 8, 200, 0xC084FC, 22, 4);
  tl.at(IMPLODE, () => {
    h.flash(0.45);
    h.hitStop(6);
    h.shake(13);
    h.sound('crit');
    h.vfx('summon', cx, cy, { anim: 'animation2', size: 1.4, tint: 0xC084FC });
    foes.forEach((t, i) => {
      h.knock(i, Math.sign(t.x - cx || 1) * 16, 12);
      h.flashTarget(i, 0xE9D5FF, 8);
    });
  });
  projectile(h, tl, IMPLODE + 4, 12, () => ({ x: cx, y: cy }), () => grip(h, false), 24,
    (g, x, y, t, f) => {
      chain(g, grip(h, false).x, grip(h, false).y, x, y, 0x7C3AED, 0, t);
      flailHead(g, x, y, 6, f * 0.5, P_COSMOS);
    }, () => h.weaponShown(true));
  tl.during(IMPLODE + 4, IMPLODE + 20, (t) => h.dim(0.65 * (1 - t), 0x05010C));
  tl.end(IMPLODE + 22);
}

/** Gravity Well: rings of crushing gravity pin the foe, then the void head drops on it like a collapsing star. */
function gravityWell(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const DROP = 34;
  const HIT = 44;
  raiseAndHold(h, tl, 0, DROP - 4);
  tl.at(0, () => h.camera(1.14, (h.home.x + t0.x) / 2, h.home.y - 46, HIT));
  tl.during(0, 16, (t) => h.dim(0.55 * t, 0x05010C));
  chargeFx(h, tl, 2, DROP, () => h.weaponTip(), P_GRAV, 30, 12);
  // Gravity rings sink onto the foe, pressing it down
  drawSpan(h, tl, 6, HIT + 2, (g, _t, f) => {
    for (let k = 0; k < 4; k++) {
      const u = ((f * 0.03 + k / 4) % 1);
      const y = lerp(c.y - 70, t0.y, easeIn(u));
      const r = lerp(30, 18, u);
      g.ellipse(t0.x, y, r, r * 0.28).stroke({ width: 2, color: k % 2 ? 0x7C3AED : 0xEDE9FE, alpha: 0.4 + 0.6 * u });
    }
  });
  tl.every(10, HIT, 4, () => {
    h.knock(0, 0, -3);
    h.flashTarget(0, 0xC4B5FD, 2);
  });
  tl.at(DROP - 4, () => {
    h.anim('ATTACK1');
    h.sound('swing');
  });
  tl.at(DROP, () => h.weaponShown(false));
  // The head plummets from above, warping the air around it
  drawSpan(h, tl, DROP, HIT + 1, (g, t, f) => {
    const y = lerp(10, c.y - 4, easeIn(t));
    const r = lerp(8, 18, t);
    for (let k = -2; k <= 2; k++) g.moveTo(t0.x + k * 9, y - 70).lineTo(t0.x + k * 9 * (1 - t * 0.5), y - 20).stroke({ width: 1, color: 0xEDE9FE, alpha: 0.5 });
    g.circle(t0.x, y, r + 6).fill({ color: 0x7C3AED, alpha: 0.25 });
    flailHead(g, t0.x, y, r, f * 0.3, P_GRAV, 10);
  });
  hitFx(h, tl, HIT, c, P_GRAV, 30, [0x7C3AED, 0xEDE9FE, 0xFFFFFF]);
  ringFx(h, tl, HIT, { x: t0.x, y: t0.y }, 10, 140, 0x7C3AED, 22, 5);
  for (let k = 0; k < 5; k++) {
    const a = Math.PI + (k / 4) * Math.PI;
    crackFx(h, tl, HIT, { x: t0.x, y: t0.y }, { x: t0.x + Math.cos(a) * 46, y: t0.y + 6 + Math.sin(a) * -6 }, P_GRAV, 6, 40);
  }
  tl.at(HIT, () => {
    land(h, 0, { scale: 1.35, tint: 0xC4B5FD, flash: 0xEDE9FE, burst: 'quake', burstSize: 1.4 });
    h.camera(1.32, c.x, c.y, 12, true);
    h.knock(0, 0, -16);
    shards(h, c, 18);
    // Gravity inverts: rubble drifts upward
    h.emit(t0.x, t0.y, { count: 24, colors: [...DIRT, 0x7C3AED], speed: [0.4, 1.4], angle: -Math.PI / 2, spread: 1, gravity: -0.05, size: 3, life: [24, 40] });
  });
  tl.at(HIT + 12, () => h.weaponShown(true));
  tl.during(HIT + 12, HIT + 28, (t) => h.dim(0.55 * (1 - t), 0x05010C));
  tl.end(HIT + 30);
}

// =============================================================================================
// BELLS

/** Iron Toll: one perfect hip-drive swing; the bell rings on contact and the toll reverberates through the foe. */
function ironToll(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const HIT = 12;
  tl.at(0, () => {
    h.anim('ATTACK1');
    h.sound('swing');
  });
  travel(h, tl, 0, 10, HOME, strikeSpot(h, t0, 64), easeIn);
  ghostTrail(h, tl, 2, 10, 0x9CA3AF, 2, 0.35);
  hitFx(h, tl, HIT, c, P_TOLL, 16);
  tl.at(HIT, () => {
    land(h, 0, { tint: 0xE5E7EB, burst: 'crater', burstSize: 0.8 });
    h.knock(0, 12);
  });
  // The toll: rings pulse out of the foe and the screen throbs in time
  drawSpan(h, tl, HIT, HIT + 30, (g, t) => shoutRings(g, c.x, c.y, t, 0xE5E7EB, 3, 80));
  [HIT + 8, HIT + 16, HIT + 24].forEach((at, k) => tl.at(at, () => {
    h.shake(5 - k * 1.5);
    h.flashTarget(0, 0xE5E7EB, 2);
  }));
  backstep(h, tl, HIT + 12, HIT + 28, 14);
  tl.end(HIT + 32);
}

/** Spore Bloom: the mushroom bell puffs a glowing spore cloud onto the foe; the spores that drift back heal him. */
function sporeBloom(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const PUFF = 12; // ATTACK2 sweep
  const HIT = PUFF + 18;
  tl.at(0, () => {
    h.anim('ATTACK2');
    h.sound('swing');
  });
  tl.at(PUFF, () => h.emit(h.weaponTip().x, h.weaponTip().y, { count: 18, colors: [0xC084FC, 0x99F6E4, 0xF5D0FE, 0x5EEAD4], speed: [0.3, 1.4], spread: Math.PI, gravity: -0.01, size: 2, life: [24, 40] }));
  projectile(h, tl, PUFF, HIT - PUFF, () => h.weaponTip(), () => c, 14,
    (g, x, y, _t, f) => {
      for (let k = 0; k < 6; k++) {
        const a = f * 0.2 + k;
        g.circle(x + Math.cos(a) * 6, y + Math.sin(a) * 4, 3.5).fill({ color: k % 2 ? 0xC084FC : 0x5EEAD4, alpha: 0.55 });
      }
      g.circle(x, y, 3).fill({ color: 0xF5D0FE, alpha: 0.9 });
    },
    () => {
      land(h, 0, { tint: 0xE9D5FF, burst: 'poison', burstSize: 0.8 });
      h.knock(0, 6);
    },
    (x, y) => h.emit(x, y, { count: 1, colors: [0xC084FC, 0x99F6E4], speed: [0.1, 0.3], spread: Math.PI, gravity: -0.01, size: 2, life: [16, 24] }));
  // Glowing caps sprout at his feet and puff healing spores
  drawSpan(h, tl, PUFF + 4, HIT + 22, (g, t, f) => {
    const p = h.pos();
    const up = easeOut(Math.min(1, f / 8)) * (t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1);
    for (let k = 0; k < 3; k++) {
      const x = p.x - 18 + k * 18;
      const hgt = (6 + k * 2) * up;
      g.rect(x - 1, p.y - hgt, 2, hgt).fill({ color: 0xE9D5FF });
      g.ellipse(x, p.y - hgt, 5 * up, 3 * up).fill({ color: 0xA855F7 }).stroke({ width: 1, color: INK });
      g.rect(x - 2, p.y - hgt - 1, 1, 1).fill({ color: 0x5EEAD4 });
    }
  });
  motesFx(h, tl, PUFF + 8, HIT + 18, () => h.pos(), [0x99F6E4, 0xF5D0FE, 0xFFFFFF], 3, 16);
  tl.at(HIT + 2, () => h.vfx('heal', h.pos().x, h.pos().y - 26, { size: 0.8, tint: 0xD8B4FE }));
  tl.end(HIT + 24);
}

/** Talon Gale: a snatch whips raptor-talon wind blades at the pack while the raptor's shadow swoops overhead. */
function talonGale(h: KnightMoveHost, tl: Timeline) {
  const hits = h.targets.length ? [...h.targets] : [h.target, h.target, h.target];
  const THROW = 12; // ATTACK4 sweep
  tl.at(0, () => {
    h.anim('ATTACK4');
    h.sound('swing');
  });
  drawSpan(h, tl, 0, THROW + 4, (g, t, f) => {
    const p = kChest(h);
    for (let k = 0; k < 5; k++) {
      const a = f * 0.4 + k * 1.3;
      const r = 26 * (1 - t * 0.5);
      g.poly([p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.5, p.x + Math.cos(a + 0.2) * (r - 6), p.y + Math.sin(a + 0.2) * (r - 6) * 0.5, p.x + Math.cos(a - 0.1) * (r - 3), p.y + Math.sin(a - 0.1) * (r - 3) * 0.5 + 2]).fill({ color: k % 2 ? 0xFCD34D : 0xFFFBEB });
    }
  });
  // The raptor's shadow sweeps across the sky
  drawSpan(h, tl, 4, THROW + 26, (g, t, f) => flier(g, lerp(60, 420, t), 70 + Math.sin(t * 6) * 8, 10, f * 0.5, 0x78350F, 0xFCD34D, 1));
  hits.forEach((t, k) => {
    const at = THROW + k * 4;
    const c = chest(t);
    drawSpan(h, tl, at, at + 9, (g, u, f) => {
      const s = { x: h.pos().x + 30, y: h.pos().y - 30 };
      const x = lerp(s.x, c.x, easeIn(u));
      const y = lerp(s.y - 10 + k * 8, c.y, u);
      const ang = f * 0.9;
      crescent(g, x, y, 10, ang, ang + 2.2, 4, P_TALON);
      for (let n = 1; n <= 3; n++) g.rect(x - n * 7, y + Math.sin(f + n) * 3, 4, 1).fill({ color: 0xFFFBEB, alpha: 0.6 });
    });
    tl.at(at + 9, () => {
      land(h, h.targets.length ? k : undefined, { scale: 0.7, tint: 0xFEF3C7, burst: 'slash', burstSize: 0.7 });
      h.knock(k, 8, 2);
      h.emit(c.x, c.y, { count: 6, colors: [0xFCD34D, 0xFFFBEB, 0x92400E], speed: [0.6, 1.8], spread: Math.PI, gravity: 0.03, size: 2, life: [18, 28] });
    });
  });
  tl.end(THROW + hits.length * 4 + 24);
}

/** Ironwood Grasp: the ironwood bell takes root; wooden claws burst up and seize the foe while bark armours the knight. */
function ironwoodGrasp(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const ROOT = 6; // SKILL1 chop
  const GRAB = 20;
  tl.at(0, () => {
    h.anim('SKILL1');
    h.sound('swing');
  });
  tl.at(ROOT, () => {
    h.shake(5);
    dust(h, { x: h.weaponTip().x, y: h.home.y }, 6, 1);
    h.emit(h.weaponTip().x, h.home.y - 4, { count: 8, colors: [0x4ADE80, 0x166534, 0xBEF264], speed: [0.6, 2], angle: -Math.PI / 2, spread: 1, gravity: 0.06, size: 2, life: [18, 28] });
  });
  // Roots race across the floor
  drawSpan(h, tl, ROOT, GRAB + 30, (g, t, f) => {
    const reach = Math.min(1, f / (GRAB - ROOT));
    const fade = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
    for (let k = 0; k < 3; k++) {
      const x0 = h.home.x + 24;
      const n = 12;
      const path = () => {
        g.moveTo(x0, h.home.y + k * 2 - 2);
        for (let i = 1; i <= n * reach; i++) g.lineTo(lerp(x0, t0.x, i / n), lerp(h.home.y, t0.y, i / n) + Math.sin(i * 1.4 + k * 2) * 3 + k * 2 - 2);
      };
      path();
      g.stroke({ width: 5 - k, color: INK, alpha: fade });
      path();
      g.stroke({ width: 3 - k, color: k ? 0x4ADE80 : 0x5C2B14, alpha: fade });
    }
  }, 'ground');
  // Ironwood claws seize the foe
  drawSpan(h, tl, GRAB - 4, GRAB + 28, (g, t, f) => {
    const up = easeOut(Math.min(1, f / 5)) * (t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1);
    const gripT = Math.min(1, Math.max(0, (f - 4) / 4));
    graspingHand(g, t0.x - 14, t0.y + 4, up, gripT, 0x8B5A2B, 0x3F2A14, 1.5);
    graspingHand(g, t0.x + 14, t0.y + 4, up, gripT, 0x8B5A2B, 0x3F2A14, 1.3);
    graspingHand(g, t0.x, t0.y + 6, up * 1.2, gripT, 0xA16207, 0x5C2B14, 1.7);
  });
  tl.at(GRAB, () => {
    land(h, 0, { tint: 0xBBF7D0, burst: 'crater', burstSize: 0.8 });
    h.knock(0, 0, -8);
    h.emit(t0.x, t0.y - 14, { count: 12, colors: [0x4ADE80, 0x166534, 0xBEF264], speed: [0.8, 2.6], spread: Math.PI, gravity: 0.06, size: 2, life: [18, 30] });
  });
  tl.every(GRAB + 4, GRAB + 20, 4, () => h.knock(0, 0, -3));
  // Bark plates and moss armour the knight
  tl.at(GRAB + 4, () => h.anim('DEFENSE'));
  drawSpan(h, tl, GRAB + 4, GRAB + 34, (g, t, f) => {
    const p = h.pos();
    const up = easeOut(Math.min(1, f / 6)) * (t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1);
    for (let k = 0; k < 5; k++) spike(g, p.x - 24 + k * 12, p.y + 4, (12 + (k % 2) * 8) * up, 5, 0x3F2A14, 0x5C2B14, 0x4ADE80);
  });
  motesFx(h, tl, GRAB + 6, GRAB + 28, () => h.pos(), [0x4ADE80, 0xBEF264], 3, 18);
  tl.at(GRAB + 8, () => h.guard(0x4ADE80));
  tl.end(GRAB + 36);
}

/** Ley-Line Fault: raise the granite bell, slam it down, and a glowing ley fracture heaves the line up in slabs. */
function leyLineFault(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h).slice(0, 2);
  const SLAM = 20; // SKILL1 from 14
  raiseAndHold(h, tl, 0, 14);
  tl.at(0, () => h.camera(1.12, h.home.x + 40, h.home.y - 40, 30));
  tl.during(0, 12, (t) => h.dim(0.4 * t, 0x05101A));
  drawSpan(h, tl, 2, SLAM, (g, t, f) => {
    const p = h.weaponTip();
    for (let k = 0; k < 4; k++) {
      const a = f * 0.2 + (k * Math.PI) / 2;
      g.rect(p.x + Math.cos(a) * 12 - 2, p.y + Math.sin(a) * 12 - 2, 4, 4).fill({ color: 0x38BDF8, alpha: 0.6 + 0.4 * t }).stroke({ width: 1, color: INK });
    }
    g.circle(p.x, p.y, 5 + 4 * t).fill({ color: 0x38BDF8, alpha: 0.3 });
  });
  tl.at(14, () => {
    h.anim('SKILL1');
    h.sound('swing');
  });
  tl.at(SLAM, () => {
    h.shake(10);
    h.sound('hit');
    debris(h, { x: h.pos().x + 26, y: h.home.y }, 12, [0x57534E, 0x78716C, 0x38BDF8]);
  });
  const end = Math.min(420, foes[foes.length - 1].x + 30);
  crackFx(h, tl, SLAM, { x: h.home.x + 28, y: h.home.y }, { x: end, y: h.home.y }, P_LEY, 12, 54);
  crackFx(h, tl, SLAM + 2, { x: h.home.x + 28, y: h.home.y + 2 }, { x: end - 20, y: h.home.y + 4 }, P_LEY, 14, 50);
  foes.forEach((t, i) => {
    const at = SLAM + 8 + i * 4;
    drawSpan(h, tl, at, at + 34, (g, u, f) => {
      const up = f < 4 ? easeOut(f / 4) : u > 0.65 ? 1 - (u - 0.65) / 0.35 : 1;
      for (let k = -1; k <= 1; k++) {
        const x = t.x + k * 14;
        const hgt = (k === 0 ? 40 : 26) * up;
        const lean = k * 4 * up;
        g.poly([x - 7, t.y + 6, x - 6 + lean, t.y + 6 - hgt, x + 6 + lean, t.y + 2 - hgt, x + 7, t.y + 6]).fill({ color: 0x57534E }).stroke({ width: 2, color: INK });
        g.moveTo(x + lean * 0.5, t.y + 6).lineTo(x + lean, t.y + 4 - hgt).stroke({ width: 1.5, color: 0x38BDF8, alpha: 0.9 * up });
      }
    });
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: i ? 0.9 : 1.1, tint: 0xBAE6FD, flash: 0xE0F2FE, burst: 'quake', burstSize: 1.1 });
      h.knock(i, 4, 26);
      debris(h, { x: t.x, y: t.y }, 12, [0x57534E, 0x78716C, 0x38BDF8]);
    });
  });
  tl.every(SLAM + 6, SLAM + 40, 3, () => h.emit(rand(h.home.x + 40, end), h.home.y - 2, { count: 1, colors: [0x38BDF8, 0xE0F2FE], speed: [0.3, 0.8], angle: -Math.PI / 2, spread: 0.3, gravity: -0.03, size: 2, life: [16, 26] }));
  tl.during(SLAM + 20, SLAM + 36, (t) => h.dim(0.4 * (1 - t), 0x05101A));
  tl.end(SLAM + 42);
}

/** All-Seeing Gaze: a vast golden eye opens above the bell, finds its prey, and sears it with its stare. */
function allSeeingGaze(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const OPEN = 26;
  const GAZE = 36;
  const eyeAt = { x: h.home.x + 34, y: h.home.y - 96 };
  raiseAndHold(h, tl, 0, GAZE + 14);
  tl.at(0, () => {
    h.camera(1.12, (h.home.x + t0.x) / 2, h.home.y - 56, GAZE + 20);
    h.sound('level_up');
  });
  tl.during(0, 16, (t) => h.dim(0.65 * t, 0x0A0314));
  // Tendrils frame the eye as it opens
  drawSpan(h, tl, 4, GAZE + 30, (g, t, f) => {
    const opening = easeOut(Math.min(1, Math.max(0, (f - 6) / (OPEN - 10))));
    const closing = f > GAZE + 18 - 4 ? Math.min(1, (f - (GAZE + 14)) / 8) : 0;
    const open = Math.max(0, opening - closing);
    for (let k = 0; k < 5; k++) {
      const a = Math.PI + (k / 4) * Math.PI;
      tentacle(g, eyeAt.x + Math.cos(a) * 18, eyeAt.y + Math.sin(a) * 8, eyeAt.x + Math.cos(a) * (34 + 4 * Math.sin(f * 0.2 + k)), eyeAt.y + Math.sin(a) * 22 + 8, 3, 8 * Math.sin(f * 0.15 + k), 0x581C87, 0xE9D5FF, false);
    }
    const look = f < OPEN ? 0 : Math.min(1, (f - OPEN) / 8);
    eye(g, eyeAt.x, eyeAt.y, 20, open, look, P_GAZE);
  });
  tl.every(6, GAZE, 3, () => h.emit(eyeAt.x + rand(-30, 30), eyeAt.y + rand(-10, 20), { count: 1, colors: [0x9333EA, 0xFBBF24, 0xE9D5FF], speed: [0.2, 0.6], spread: Math.PI, gravity: 0, size: 2, life: [16, 26] }));
  tl.at(OPEN, () => h.shake(4));
  // The gaze: a searing golden beam
  drawSpan(h, tl, GAZE, GAZE + 16, (g, t, f) => {
    const w = (t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85 * 0.6) * 12 + Math.sin(f * 1.5) * 1.5;
    beam(g, eyeAt.x + 8, eyeAt.y, c.x, c.y, w, [0xFBBF24, 0xFFFBEB, 0xFFFFFF]);
  });
  tl.every(GAZE, GAZE + 16, 2, () => embers(h, { x: c.x + rand(-6, 6), y: c.y }, 2, [0xFBBF24, 0xFFFBEB]));
  tl.at(GAZE + 3, () => {
    land(h, 0, { scale: 1.3, tint: 0xFFE680, flash: 0xFFF7D6, burst: 'fire', burstSize: 1.1 });
    h.camera(1.28, c.x, c.y, 12, true);
    h.knock(0, 14, 4);
    shards(h, c, 18);
  });
  tl.at(GAZE + 6, () => h.flashTarget(0, 0xFFE680, 12));
  tl.during(GAZE + 18, GAZE + 34, (t) => h.dim(0.65 * (1 - t), 0x0A0314));
  tl.end(GAZE + 36);
}

/** Writhing Dark: a rift tears open at his feet and tentacles of the deep lash every foe. */
function writhingDark(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const OPEN = 16;
  const rift = { x: h.home.x + 50, y: h.home.y + 2 };
  tl.at(0, () => {
    h.anim('SKILL3TULUC');
    h.camera(1.06, 240, h.home.y - 40, 70);
  });
  tl.during(0, 14, (t) => h.dim(0.55 * t, 0x0A0218));
  drawSpan(h, tl, 4, OPEN + 60, (g, t, f) => {
    const r = 30 * easeOut(Math.min(1, f / 10)) * (t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1);
    g.ellipse(rift.x, rift.y, r, r * 0.3).fill({ color: 0x000000 }).stroke({ width: 2, color: 0x9333EA });
    g.ellipse(rift.x, rift.y, r * 0.8, r * 0.22).stroke({ width: 1, color: 0xE9D5FF, alpha: 0.5 });
    if (r > 10) eye(g, rift.x + Math.sin(f * 0.1) * 6, rift.y, 5, 0.5 + 0.5 * Math.abs(Math.sin(f * 0.08)), 0.5, P_GAZE);
  }, 'ground');
  tl.every(4, OPEN + 50, 3, () => h.emit(rift.x + rand(-24, 24), rift.y - 2, { count: 1, colors: [0x9333EA, 0xE9D5FF, 0x581C87], speed: [0.3, 0.9], angle: -Math.PI / 2, spread: 0.3, gravity: -0.03, size: 2, life: [18, 28] }));
  foes.forEach((t, i) => {
    const from = OPEN + i * 6;
    const lash = from + 10;
    drawSpan(h, tl, from, lash + 22, (g, u, f) => {
      const reach = f < lash - from ? easeOut(f / (lash - from)) : f > lash - from + 12 ? 1 - (f - (lash - from + 12)) / 10 : 1;
      const c = chest(t);
      const tx = lerp(rift.x, c.x, reach);
      const ty = lerp(rift.y - 10, c.y, reach) - arc(reach) * 40;
      tentacle(g, rift.x - 10 + i * 10, rift.y, tx, ty, 10, 20 * Math.sin(f * 0.25 + i), 0x7E22CE, 0xF0ABFC);
    });
    tl.at(lash, () => {
      land(h, h.targets.length ? i : undefined, { scale: 0.85, tint: 0xE9D5FF, spark: 0x9333EA, burst: 'portal', burstSize: 0.7 });
      h.knock(i, 12, 8);
    });
  });
  tl.during(OPEN + 44, OPEN + 60, (t) => h.dim(0.55 * (1 - t), 0x0A0218));
  tl.end(OPEN + 62);
}

/** Excalibur's Decree: press the bell to lockout; golden shockwaves roll out and holy blades fall on every foe. */
function excaliburDecree(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const LOCK = 17; // SKILL2TULUC from 6 raises at 17
  tl.at(0, () => h.anim('JUMP_FRONT_START'));
  tl.during(0, 6, (t) => h.stretch(1 + 0.08 * t, 1 - 0.1 * t));
  tl.at(6, () => {
    h.stretch(1, 1);
    h.anim('SKILL2TULUC');
    h.camera(1.08, 250, h.home.y - 50, 50);
  });
  tl.during(6, LOCK, (t) => h.lift(easeOut(t) * 8));
  tl.during(LOCK + 20, LOCK + 30, (t) => h.lift(lerp(8, 0, t)));
  tl.during(0, 14, (t) => h.dim(0.45 * t, 0x140C02));
  chargeFx(h, tl, 6, LOCK, () => h.weaponTip(), P_DECREE, 28, 10);
  // God-rays behind him
  drawSpan(h, tl, LOCK - 2, LOCK + 40, (g, t) => {
    const p = h.pos();
    for (let k = -2; k <= 2; k++) pillar(g, p.x + k * 14, 20, p.y, 6, P_DECREE, 0.22 * (1 - t));
  }, 'back');
  tl.at(LOCK, () => {
    h.flash(0.35, 0xFFF3C4);
    h.shake(7);
    h.sound('crit');
  });
  drawSpan(h, tl, LOCK, LOCK + 22, (g, t) => {
    const p = h.weaponTip();
    for (let k = 0; k < 3; k++) {
      const r = (t * 1.4 - k * 0.2) * 120;
      if (r > 0) g.circle(p.x, p.y, r).stroke({ width: 3 * (1 - t) + 1, color: k % 2 ? 0xFFFBEA : 0xF4B41A, alpha: 1 - t });
    }
  });
  // Holy blades fall and strike
  foes.forEach((t, i) => {
    const at = LOCK + 6 + i * 4;
    const c = chest(t);
    drawSpan(h, tl, at - 6, at + 18, (g, u, f) => {
      const drop = f < 6 ? easeIn(f / 6) : 1;
      const fade = f < 6 ? 1 : 1 - (f - 6) / 18;
      const y = lerp(10, t.y - 4, drop);
      lance(g, t.x + 2, y - 46, t.x + 2, y, 7, P_DECREE, fade);
      g.rect(t.x - 8, y - 40, 20, 3).fill({ color: 0xF4B41A, alpha: fade }).stroke({ width: 1, color: INK, alpha: fade });
    });
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: 0.9, tint: 0xFFF1B8, flash: 0xFFF7D6, burst: 'crater', burstSize: 0.9 });
      h.knock(i, 4, -6);
      h.sparks(c.x, t.y - 6, 10, [0xF4B41A, 0xFFFBEA]);
    });
  });
  tl.during(LOCK + 26, LOCK + 40, (t) => h.dim(0.45 * (1 - t), 0x140C02));
  tl.end(LOCK + 42);
}

/** Dragon's Breath: a wyrm's head flares around the bell, and the drive looses a cone of dragonfire over the pack. */
function dragonsBreath(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const DRIVE = 30; // ATTACK3 from 16 thrusts at 30
  const BREATH = 44;
  tl.at(0, () => {
    h.anim('JUMP_FRONT_START');
    h.camera(1.1, h.home.x + 30, h.home.y - 34, DRIVE);
  });
  tl.during(0, 14, (t) => h.dim(0.45 * t, 0x1A0303));
  chargeFx(h, tl, 0, DRIVE, () => h.weaponTip(), P_WYRM, 34, 14);
  drawSpan(h, tl, 6, DRIVE + BREATH, (g, t, f) => {
    const p = h.weaponTip();
    const a = easeOut(Math.min(1, f / 10)) * (t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1);
    beastHead(g, p.x + 6, p.y, 14, 'dragon', 1, P_WYRM, 0.85 * a, f > DRIVE - 6 ? 1 : 0.2);
  });
  tl.at(16, () => {
    h.anim('ATTACK3');
    h.sound('swing');
  });
  tl.at(DRIVE, () => {
    h.camera(1.04, 250, h.home.y - 30, BREATH);
    h.shake(6);
    h.sound('crit');
  });
  drawSpan(h, tl, DRIVE, DRIVE + BREATH, (g, t, f) => {
    const p = h.weaponTip();
    const len = 280 * easeOut(Math.min(1, t * 2.5)) * (t > 0.8 ? 1 - (t - 0.8) / 0.2 * 0.6 : 1);
    cone(g, p.x + 14, p.y, 0.06, len, 0.15, f, [BLOOD, EMBER, 0xFBBF24, 0xFFFBEA], 0.75 * (t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1));
  });
  tl.every(DRIVE, DRIVE + BREATH - 8, 2, () => {
    const p = h.weaponTip();
    h.emit(p.x + 30, p.y, { count: 3, colors: FIRE, speed: [3, 6], angle: 0.08, spread: 0.2, gravity: -0.02, size: 3, life: [16, 26] });
  });
  foes.forEach((t, i) => {
    const at = DRIVE + 2 + Math.round((t.x - h.home.x) / 40);
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: 0.85, tint: 0xFFB08A, burst: 'fire', burstSize: 1.1 });
      h.knock(i, 10, 2);
    });
    tl.every(at, DRIVE + BREATH, 6, () => h.flashTarget(i, 0xFFB08A, 3));
  });
  tl.every(DRIVE + BREATH - 10, DRIVE + BREATH + 8, 3, () => smoke(h, { x: rand(200, 400), y: h.home.y - rand(10, 40) }, 2));
  tl.during(DRIVE + BREATH - 6, DRIVE + BREATH + 10, (t) => h.dim(0.45 * (1 - t), 0x1A0303));
  tl.end(DRIVE + BREATH + 12);
}

/** Wyrmheart Drive: the bell's molten heart beats three times, then a leaping thrust erupts into a roaring dragon of flame. */
function wyrmheartDrive(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const LEAP = 18;
  const HIT = 34; // ATTACK1 from 22 sweeps at 34
  tl.at(0, () => {
    h.anim('JUMP_FRONT_START');
    h.camera(1.16, h.home.x + 20, h.home.y - 30, LEAP);
  });
  tl.during(0, 14, (t) => h.dim(0.45 * t, 0x1A0303));
  [2, 8, 14].forEach((at, k) => {
    drawSpan(h, tl, at, at + 6, (g, t) => {
      const p = h.weaponTip();
      g.circle(p.x, p.y, 6 + 10 * t + k * 2).stroke({ width: 3 * (1 - t), color: 0xF97316, alpha: 1 - t });
      orb(g, p.x, p.y, 4 + 3 * (1 - t), P_LAVA);
    });
    tl.at(at, () => h.shake(2 + k * 2));
  });
  tl.during(0, LEAP, (t) => h.stretch(1 + 0.1 * t, 1 - 0.12 * t));
  tl.at(LEAP, () => {
    h.stretch(0.9, 1.12);
    h.anim('JUMP_FRONT_UP');
    h.sound('swing');
  });
  travel(h, tl, LEAP, HIT, HOME, strikeSpot(h, t0, 48), easeIn, 30);
  ghostTrail(h, tl, LEAP, HIT, 0xF97316, 2, 0.45);
  tl.at(HIT - 12, () => {
    h.stretch(1, 1);
    h.anim('ATTACK1');
  });
  hitFx(h, tl, HIT, c, P_LAVA, 26, [0xFDE047, 0xF97316, BLOOD, 0xFFFFFF]);
  // A dragon of flame erupts from the impact and roars
  drawSpan(h, tl, HIT, HIT + 22, (g, t, f) => {
    const s = 10 + 16 * easeOut(Math.min(1, t * 3));
    beastHead(g, c.x + 8, c.y - 12 - t * 10, s, 'dragon', 1, P_WYRM, 1 - t, 0.6 + 0.4 * Math.sin(f * 0.6));
  });
  tl.at(HIT, () => {
    land(h, 0, { scale: 1.3, tint: 0xFFB08A, flash: 0xFFE2B8, burst: 'explosion', burstSize: 1.4 });
    h.camera(1.3, c.x, c.y, 12, true);
    h.knock(0, 20, 10);
    h.emit(c.x, c.y, { count: 26, colors: [0xF97316, 0xFDE047, BLOOD], speed: [1.5, 4.5], angle: -0.3, spread: 1.2, gravity: 0.15, size: 3, life: [16, 30] });
  });
  tl.during(HIT + 12, HIT + 28, (t) => h.dim(0.45 * (1 - t), 0x1A0303));
  backstep(h, tl, HIT + 14, HIT + 32, 20);
  tl.end(HIT + 34);
}

/** Fallen Star: snatch the bell skyward, a beam calls the heavens, and a star falls on the back row. */
function fallenStar(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const CALL = 15; // SKILL2TULUC from 4 raises at 15
  const FALL = 30;
  const HIT = 50;
  const stars = Array.from({ length: 18 }, (_, k) => ({ x: 20 + hash(k) * 390, y: 52 + hash(k + 40) * 60, s: hash(k + 80) }));
  tl.at(0, () => h.anim('JUMP_FRONT_START'));
  tl.at(4, () => {
    h.anim('SKILL2TULUC');
    h.camera(1.06, (h.home.x + t0.x) / 2 + 20, h.home.y - 56, HIT);
  });
  tl.during(0, 16, (t) => h.dim(0.65 * t, 0x05010C));
  drawSpan(h, tl, 8, HIT + 30, (g, t, f) => {
    const fade = Math.min(1, f / 10) * (t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1);
    for (const s of stars) {
      const tw = 0.5 + 0.5 * Math.sin(f * 0.3 + s.s * 10);
      g.rect(s.x, s.y, s.s > 0.7 ? 2 : 1, s.s > 0.7 ? 2 : 1).fill({ color: s.s > 0.5 ? 0xFAF5FF : 0xC084FC, alpha: fade * tw });
    }
  });
  drawSpan(h, tl, CALL, CALL + 10, (g, t) => {
    const p = h.weaponTip();
    pillar(g, p.x, 20, p.y, 5 * (1 - t), P_COSMOS, 1 - t);
  });
  tl.at(CALL, () => {
    h.flash(0.25, 0xE9D5FF);
    h.sound('level_up');
  });
  // Gravity ripples gather under the target as the star falls
  drawSpan(h, tl, FALL, HIT, (g, _t, f) => {
    for (let k = 0; k < 3; k++) {
      const u = 1 - ((f * 0.05 + k / 3) % 1);
      groundRing(g, t0.x, t0.y, 10 + 40 * u, 2, 0xC084FC, 1 - u);
    }
  }, 'ground');
  drawSpan(h, tl, FALL, HIT + 1, (g, t, f) => {
    const x = lerp(t0.x - 70, c.x, easeIn(t));
    const y = lerp(30, c.y, easeIn(t));
    const r = 3 + 9 * t;
    lance(g, x, y, x - 50 * (1 - t * 0.4), y - 30, r * 1.4, P_COSMOS, 0.8);
    starburst(g, x, y, r * 1.8, 4, f * 0.2, P_COSMOS);
    orb(g, x, y, r, pal(0xC084FC, 0xFFFFFF, 0x2E1065));
  });
  hitFx(h, tl, HIT, c, P_COSMOS, 30, [0xC084FC, 0xFAF5FF, 0xFFFFFF]);
  ringFx(h, tl, HIT, { x: t0.x, y: t0.y }, 10, 160, 0xC084FC, 24, 5);
  tl.at(HIT, () => {
    land(h, 0, { scale: 1.3, tint: 0xE9D5FF, flash: 0xFAF5FF, burst: 'explosion', burstSize: 1.4 });
    h.camera(1.3, c.x, c.y, 12, true);
    h.knock(0, 12, 10);
    h.emit(c.x, c.y, { count: 24, colors: [0xC084FC, 0xFAF5FF, 0x7C3AED], speed: [1.5, 4.5], spread: Math.PI, gravity: 0.05, size: 2, life: [18, 32] });
  });
  tl.during(HIT + 14, HIT + 30, (t) => h.dim(0.65 * (1 - t), 0x05010C));
  tl.end(HIT + 32);
}

/** Gravity Snap: the fallen-star bell inverts gravity, the pack floats helpless, and the clean snaps them into the floor. */
function gravitySnap(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const FLOAT = 16;
  const SNAP = 40; // SKILL1 from 34 chops at 40
  tl.at(0, () => {
    h.anim('SKILL2TULUC');
    h.camera(1.06, 250, h.home.y - 50, SNAP + 10);
  });
  tl.during(0, 14, (t) => h.dim(0.5 * t, 0x07021A));
  drawSpan(h, tl, 0, SNAP, (g, _t, f) => {
    const p = h.weaponTip();
    for (let k = 0; k < 3; k++) {
      const u = 1 - ((f * 0.05 + k / 3) % 1);
      g.ellipse(p.x, p.y, 8 + 30 * u, (8 + 30 * u) * 0.5).stroke({ width: 2, color: 0x6D28D9, alpha: 1 - u });
    }
  });
  // Weightless: the pack drifts up, pebbles float off the floor
  tl.every(FLOAT, SNAP, 2, () => foes.forEach((_, i) => h.knock(i, 0, 9)));
  tl.every(FLOAT, SNAP, 2, () => h.emit(rand(200, 410), h.home.y, { count: 2, colors: [...DIRT, 0x6D28D9], speed: [0.3, 0.9], angle: -Math.PI / 2, spread: 0.2, gravity: -0.03, size: 2, life: [20, 30] }));
  drawSpan(h, tl, FLOAT, SNAP, (g, t) => {
    for (const ft of foes) {
      for (let k = 0; k < 3; k++) g.moveTo(ft.x - 8 + k * 8, ft.y + 4).lineTo(ft.x - 8 + k * 8, ft.y - 12 - 20 * t).stroke({ width: 1, color: 0xC4B5FD, alpha: 0.5 });
    }
  });
  tl.at(SNAP - 6, () => {
    h.anim('SKILL1');
    h.sound('swing');
  });
  tl.at(SNAP, () => {
    h.flash(0.4, 0xDDD6FE);
    h.camera(1.14, 270, h.home.y - 30, 14, true);
  });
  foes.forEach((t, i) => {
    tl.at(SNAP + i, () => {
      h.knock(i, 0, -48);
      land(h, h.targets.length ? i : undefined, { scale: 0.9, tint: 0xDDD6FE, burst: 'quake', burstSize: 1 });
      debris(h, { x: t.x, y: t.y }, 10, [...DIRT, 0x6D28D9]);
    });
  });
  ringFx(h, tl, SNAP, { x: 290, y: h.home.y }, 10, 200, 0x6D28D9, 24, 4);
  tl.during(SNAP + 10, SNAP + 26, (t) => h.dim(0.5 * (1 - t), 0x07021A));
  tl.end(SNAP + 28);
}

// =============================================================================================
// MACES

/** Scrap Shrapnel: the goblin lashings snap mid-swing and a spray of nails, cogs and scrap rakes the pack. */
function scrapShrapnel(h: KnightMoveHost, tl: Timeline) {
  const hits = h.targets.length ? [...h.targets] : [h.target, h.target, h.target];
  const SNAP = 12;
  tl.at(0, () => {
    h.anim('ATTACK1');
    h.sound('swing');
  });
  tl.at(SNAP, () => {
    const p = h.weaponTip();
    h.shake(4);
    h.emit(p.x, p.y, { count: 14, colors: [0x78716C, 0xA16207, 0xA3E635, 0x57534E], speed: [1, 3.5], angle: 0, spread: 0.8, gravity: 0.2, size: 2, life: [14, 26] });
  });
  hits.forEach((t, k) => {
    const at = SNAP + k * 4;
    const c = chest(t);
    projectile(h, tl, at, 9, () => h.weaponTip(), () => ({ x: c.x + rand(-4, 4), y: c.y + rand(-6, 6) }), 8 + k * 6,
      (g, x, y, _t, f) => {
        if (k % 3 === 0) dart(g, x, y, f * 0.9, 9, 0x78716C, 0xD6D3D1);
        else if (k % 3 === 1) {
          g.circle(x, y, 4).fill({ color: 0xA16207 }).stroke({ width: 1, color: INK });
          for (let n = 0; n < 6; n++) {
            const a = f * 0.6 + (n / 6) * Math.PI * 2;
            g.rect(x + Math.cos(a) * 4.5 - 1, y + Math.sin(a) * 4.5 - 1, 2, 2).fill({ color: 0xA16207 });
          }
          g.circle(x, y, 1.5).fill({ color: INK });
        } else g.poly([x - 4, y - 2, x + 4, y - 3, x + 2, y + 3, x - 3, y + 2]).fill({ color: 0x57534E }).stroke({ width: 1, color: 0xA3E635 });
      },
      () => {
        land(h, h.targets.length ? k : undefined, { scale: 0.6, tint: 0xD9F99D });
        h.knock(k, 6, 2);
        h.sparks(c.x, c.y, 6, [0xD6D3D1, 0xA3E635, 0xFBBF24]);
      });
  });
  tl.end(SNAP + hits.length * 4 + 22);
}

/** Flanged Crush: march in, haul the mace high, and the flanged head stamps through the foe's armour. */
function flangedCrush(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const HIT = 32;
  tl.at(0, () => h.anim('RUN', true));
  travel(h, tl, 0, 12, HOME, strikeSpot(h, t0, 62), easeInOut);
  tl.every(2, 12, 5, () => dust(h, h.pos(), 3, -1));
  tl.at(12, () => {
    h.anim('ATTACK4');
    h.animSpeed(0.45);
    h.camera(1.18, c.x - 30, c.y - 10, 26);
  });
  tl.during(14, HIT - 4, (t) => h.lift(easeOut(t) * 12));
  tl.at(HIT - 4, () => h.animSpeed(1.8));
  tl.during(HIT - 4, HIT, (t) => h.lift(lerp(12, 0, easeIn(t))));
  // The flange stamp: six iron fins hammered into the foe
  drawSpan(h, tl, HIT, HIT + 12, (g, t) => {
    const r = 12 + 10 * easeOut(t);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const x = c.x + Math.cos(a) * r * 0.5;
      const y = c.y + Math.sin(a) * r * 0.5;
      g.poly([x, y, c.x + Math.cos(a - 0.2) * r, c.y + Math.sin(a - 0.2) * r, c.x + Math.cos(a + 0.2) * r, c.y + Math.sin(a + 0.2) * r]).fill({ color: 0xA8A29E, alpha: 1 - t }).stroke({ width: 1.5, color: INK, alpha: 1 - t });
    }
  });
  hitFx(h, tl, HIT, c, P_STONE, 20, [0xD6D3D1, 0xFBBF24, 0xFFFFFF]);
  tl.at(HIT, () => {
    land(h, 0, { scale: 1.2, tint: 0xE7E5E4, burst: 'crater', burstSize: 1.1 });
    h.camera(1.28, c.x - 6, c.y, 10, true);
    h.knock(0, 4, -10);
    h.stretch(1.1, 0.92);
    shards(h, c, 14);
    h.emit(c.x, c.y, { count: 8, colors: [0x78716C, 0xA8A29E, 0x57534E], speed: [1.5, 3.5], spread: Math.PI, gravity: 0.25, size: 4, life: [16, 28] });
  });
  tl.during(HIT, HIT + 6, (t) => h.stretch(lerp(1.1, 1, t), lerp(0.92, 1, t)));
  tl.at(HIT + 6, () => h.animSpeed(1));
  backstep(h, tl, HIT + 10, HIT + 26, 16);
  tl.end(HIT + 28);
}

/** Ossuary Rattle: the skull-bell cracks and the dead inside pour out, chattering, to gnaw the foe. */
function ossuaryRattle(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const OPEN = 12; // ATTACK2 sweep
  const BITES = [OPEN + 10, OPEN + 14, OPEN + 18];
  tl.at(0, () => {
    h.anim('ATTACK2');
    h.sound('swing');
    h.dim(0.25, 0x060A0A);
  });
  travel(h, tl, 0, 8, HOME, strikeSpot(h, t0, 70), easeIn);
  tl.at(OPEN, () => {
    const p = h.weaponTip();
    h.shake(4);
    h.emit(p.x, p.y, { count: 10, colors: [0xE2E8F0, 0x86EFAC, 0x94A3B8], speed: [0.5, 2], spread: Math.PI, gravity: 0.05, size: 2, life: [14, 24] });
  });
  BITES.forEach((at, k) => {
    const start = once(() => h.weaponTip());
    drawSpan(h, tl, OPEN, at + 1, (g, t, f) => {
      const s = start();
      const x = lerp(s.x, c.x, easeIn(t)) + Math.sin(t * 8 + k * 2) * 8 * (1 - t);
      const y = lerp(s.y - 6 * k, c.y + (k - 1) * 6, easeIn(t)) - arc(t) * (12 + k * 8);
      g.moveTo(x - 6, y + 2).lineTo(x - 18, y + 4).stroke({ width: 4, color: 0x86EFAC, alpha: 0.3 });
      skull(g, x, y, 4 + (k === 2 ? 1 : 0), f + k, P_BONE);
    });
    tl.at(at, () => {
      if (k === BITES.length - 1) {
        land(h, 0, { tint: 0xDCFCE7, burst: 'slash', burstSize: 0.8 });
        h.knock(0, 12, 4);
      } else {
        h.flashTarget(0, 0xDCFCE7, 3);
        h.shake(3);
      }
      h.emit(c.x, c.y, { count: 5, colors: [0xE2E8F0, 0xF8FAFC, 0x94A3B8], speed: [1, 2.5], spread: Math.PI, gravity: 0.2, size: 2, life: [12, 20] });
    });
  });
  tl.at(BITES[2] + 4, () => h.dim(0, 0x060A0A));
  backstep(h, tl, BITES[2] + 6, BITES[2] + 22, 14);
  tl.end(BITES[2] + 24);
}

/** Gravestone Toll: the cemetery mace strikes the earth; graves split open and tombstones burst up under every foe. */
function gravestoneToll(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const SLAM = 6; // SKILL1 chop
  tl.at(0, () => {
    h.anim('SKILL1');
    h.sound('swing');
    h.camera(1.06, 260, h.home.y - 34, 50);
  });
  tl.during(0, 10, (t) => h.dim(0.35 * t, 0x080A10));
  tl.at(SLAM, () => {
    h.shake(9);
    h.sound('hit');
    h.vfx('shockwave', h.pos().x + 24, h.home.y - 8, { size: 0.9, tint: 0x94A3B8 });
  });
  ringFx(h, tl, SLAM, () => ({ x: h.pos().x + 24, y: h.home.y }), 8, 230, 0x94A3B8, 24, 3);
  // Grave mist rolls across the floor
  tl.every(SLAM, SLAM + 40, 2, () => h.emit(rand(h.home.x + 20, 410), h.home.y + 2, { count: 1, colors: [0x94A3B8, 0xCBD5E1, 0x64748B], speed: [0.2, 0.6], angle: Math.PI, spread: 0.4, gravity: -0.005, size: 5, life: [26, 40] }));
  foes.forEach((t, i) => {
    const at = SLAM + 6 + i * 4;
    drawSpan(h, tl, at, at + 40, (g, u, f) => {
      const up = f < 5 ? easeOut(f / 5) : u > 0.65 ? 1 - (u - 0.65) / 0.35 : 1;
      tombstone(g, t.x - 4, t.y + 6, up, 1.2, -0.1);
      graspingHand(g, t.x - 18, t.y + 5, up * 0.9, Math.min(1, f / 8), 0xE2E8F0, 0x94A3B8);
      graspingHand(g, t.x + 14, t.y + 5, up * 0.8, Math.min(1, f / 8), 0xE2E8F0, 0x94A3B8);
    });
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: 0.85, tint: 0xE2E8F0, burst: 'crater', burstSize: 0.9 });
      h.knock(i, 4, 20);
      debris(h, { x: t.x, y: t.y }, 10, [...DIRT, 0x57534E]);
    });
  });
  tl.during(SLAM + 34, SLAM + 50, (t) => h.dim(0.35 * (1 - t), 0x080A10));
  tl.end(SLAM + 52);
}

/** Cathedral Toll: a phantom belfry bell descends over the pack; the mace strikes and its toll staggers them all. */
function cathedralToll(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const cx = foes.reduce((s, t) => s + t.x, 0) / foes.length;
  const cy = h.home.y - 40;
  const STRIKE = 24; // SKILL1 from 18 chops at 24
  tl.at(0, () => {
    h.anim('SKILL2TULUC');
    h.camera(1.04, (h.home.x + cx) / 2 + 20, h.home.y - 50, 60);
    h.sound('level_up');
  });
  tl.during(0, 14, (t) => h.dim(0.45 * t, 0x0F0A03));
  drawSpan(h, tl, 0, STRIKE + 40, (g, t, f) => {
    const drop = easeInOut(Math.min(1, f / STRIKE));
    const fade = f < 10 ? f / 10 : t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
    const swing = f > STRIKE ? Math.sin((f - STRIKE) * 0.35) * 4 * (1 - t) : 0;
    phantomBell(g, cx + swing, lerp(0, cy - 46, drop), 76, P_BRONZE, fade);
  });
  tl.at(STRIKE - 6, () => {
    h.anim('SKILL1');
    h.sound('swing');
  });
  // The toll: three deep rings; damage on the first
  [STRIKE, STRIKE + 12, STRIKE + 24].forEach((at, k) => {
    drawSpan(h, tl, at, at + 20, (g, t) => shoutRings(g, cx, cy - 6, t, k ? 0xFDE68A : 0xD97706, 3, 160 - k * 30));
    tl.at(at, () => {
      h.shake(10 - k * 3);
      h.flash(0.25 - k * 0.07, 0xFDE68A);
      foes.forEach((_, i) => h.flashTarget(i, 0xFDE68A, 4));
    });
  });
  foes.forEach((t, i) => tl.at(STRIKE + i * 2, () => {
    land(h, h.targets.length ? i : undefined, { scale: 0.85, tint: 0xFDE68A, burst: 'crater', burstSize: 0.8 });
    h.knock(i, Math.sign(t.x - cx || 1) * 10, 4);
  }));
  tl.during(STRIKE + 30, STRIKE + 44, (t) => h.dim(0.45 * (1 - t), 0x0F0A03));
  tl.end(STRIKE + 46);
}

/** Basalt Fissure: the molten mace splits the floor; magma races down the line and erupts under each foe. */
function basaltFissure(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h).slice(0, 2);
  const SLAM = 14; // SKILL1 from 8
  const end = Math.min(420, foes[foes.length - 1].x + 30);
  tl.at(0, () => {
    h.anim('JUMP_FRONT_START');
    h.camera(1.1, h.home.x + 30, h.home.y - 34, 20);
  });
  tl.during(0, 12, (t) => h.dim(0.45 * t, 0x140602));
  tl.every(0, SLAM, 2, () => h.emit(h.weaponTip().x, h.weaponTip().y, { count: 1, colors: [0xF97316, 0xFDE047], speed: [0.2, 0.6], angle: -Math.PI / 2, spread: 0.4, gravity: -0.03, size: 2, life: [12, 20] }));
  tl.at(8, () => {
    h.anim('SKILL1');
    h.sound('swing');
  });
  tl.at(SLAM, () => {
    h.shake(10);
    h.sound('hit');
    h.camera(1.04, (h.home.x + end) / 2, h.home.y - 40, 50);
    debris(h, { x: h.pos().x + 26, y: h.home.y }, 12, [0x292524, 0x44403C, 0xF97316]);
  });
  crackFx(h, tl, SLAM, { x: h.home.x + 28, y: h.home.y }, { x: end, y: h.home.y }, P_LAVA, 12, 60);
  drawSpan(h, tl, SLAM, SLAM + 60, (g, t, f) => {
    const reach = Math.min(1, f / 12);
    const fade = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
    g.rect(h.home.x + 28, h.home.y - 2, (end - h.home.x - 28) * reach, 4).fill({ color: 0xF97316, alpha: 0.5 * fade });
  }, 'ground');
  foes.forEach((t, i) => {
    const at = SLAM + 10 + i * 5;
    drawSpan(h, tl, at, at + 26, (g, u, f) => {
      const up = f < 4 ? easeOut(f / 4) : 1 - Math.max(0, (u - 0.45) / 0.55);
      pillar(g, t.x, t.y - 90 * up, t.y + 2, 18 * up, P_LAVA, 1);
      for (let k = 0; k < 4; k++) {
        const x = t.x + (hash(k + f) - 0.5) * 20;
        g.circle(x, t.y - 90 * up + hash(k * 3 + f) * 20, 3).fill({ color: 0xFDE047, alpha: up });
      }
    });
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: i ? 0.95 : 1.15, tint: 0xFFC48A, flash: 0xFFE2B8, burst: 'fire', burstSize: 1.2 });
      h.knock(i, 2, 30);
      h.emit(t.x, t.y - 20, { count: 20, colors: [0xF97316, 0xFDE047, BLOOD, 0x292524], speed: [1.5, 4.5], angle: -Math.PI / 2, spread: 0.7, gravity: 0.2, size: 3, life: [16, 30] });
    });
    drawSpan(h, tl, at, at + 60, (g, u) => scorch(g, t.x, t.y, 20, EMBER, 1 - u), 'ground');
  });
  tl.during(SLAM + 34, SLAM + 50, (t) => h.dim(0.45 * (1 - t), 0x140602));
  tl.end(SLAM + 52);
}

/** Core Breach: crack the basalt head open against the foe and let its molten core detonate point-blank. */
function coreBreach(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const HIT = 36;
  tl.at(0, () => h.anim('RUN', true));
  travel(h, tl, 0, 14, HOME, strikeSpot(h, t0, 56), easeInOut);
  tl.at(14, () => {
    h.anim('ATTACK4');
    h.animSpeed(0.45);
    h.camera(1.22, c.x - 26, c.y - 10, 24);
  });
  tl.during(10, 26, (t) => h.dim(0.6 * t, 0x140602));
  // The head cracks: light leaks from the fissures, faster and brighter
  drawSpan(h, tl, 14, HIT, (g, t, f) => {
    const p = h.weaponTip();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + f * 0.05;
      const len = 6 + 20 * t * (0.6 + 0.4 * hash(k + Math.floor(f / 3)));
      g.moveTo(p.x, p.y).lineTo(p.x + Math.cos(a) * len, p.y + Math.sin(a) * len).stroke({ width: 1 + 2 * t, color: k % 2 ? 0xFDE047 : 0xF97316, alpha: 0.5 + 0.5 * t });
    }
    g.circle(p.x, p.y, 5 + 6 * t).fill({ color: 0xFFFBEB, alpha: 0.3 + 0.5 * t });
  });
  tl.every(16, HIT, 3, (i) => h.shake(1 + i * 0.5));
  tl.at(HIT - 3, () => h.animSpeed(1.8));
  hitFx(h, tl, HIT, c, P_LAVA, 36, [0xFFFBEB, 0xFDE047, 0xF97316, BLOOD]);
  ringFx(h, tl, HIT, { x: t0.x - 10, y: t0.y }, 10, 170, 0xF97316, 26, 5);
  ringFx(h, tl, HIT + 3, { x: t0.x - 10, y: t0.y }, 6, 110, 0xFFFBEB, 20, 2);
  drawSpan(h, tl, HIT, HIT + 60, (g, t) => scorch(g, t0.x - 10, t0.y, 34, EMBER, 1 - t), 'ground');
  tl.at(HIT, () => {
    h.animSpeed(1);
    land(h, 0, { scale: 1.4, tint: 0xFFE2B8, flash: 0xFFF3D6, burst: 'explosion', burstSize: 1.8 });
    h.camera(1.36, c.x - 10, c.y, 12, true);
    h.knock(0, 24, 14);
    h.emit(c.x - 10, c.y, { count: 36, colors: [0xF97316, 0xFDE047, BLOOD, 0x292524], speed: [2, 5.5], spread: Math.PI, gravity: 0.2, size: 3, life: [16, 34] });
  });
  // The blast throws the knight back home
  tl.at(HIT + 2, () => h.anim('HIT2'));
  travel(h, tl, HIT + 2, HIT + 16, here(h), HOME, easeOut, 16);
  tl.at(HIT + 16, () => {
    h.anim('LANDING_END');
    dust(h, h.pos(), 8, 1);
  });
  tl.during(HIT + 14, HIT + 32, (t) => h.dim(0.6 * (1 - t), 0x140602));
  tl.end(HIT + 34);
}

// =============================================================================================
// SWORDS

/** Kettleburne's Oath: a sworn guard, a cut and a rising riposte, then the shield is raised again. */
function kettleburneOath(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const CUT1 = 16;
  const CUT2 = 30;
  tl.at(0, () => h.anim('DEFENSE'));
  drawSpan(h, tl, 2, 12, (g, t) => starburst(g, h.weaponTip().x, h.weaponTip().y, 8 * arc(t), 4, t * 2, P_STEELB));
  tl.at(4, () => {
    h.anim('ATTACK1');
    h.sound('swing');
  });
  travel(h, tl, 6, CUT1 - 2, HOME, strikeSpot(h, t0, 54), easeIn);
  ghostTrail(h, tl, 6, CUT1, 0xCBD5E1, 3, 0.3);
  slashFx(h, tl, CUT1 - 1, { x: c.x - 6, y: c.y - 2, r: 24, a0: -2.2, a1: 0.6, thick: 6, p: P_STEELB, dur: 8 });
  tl.at(CUT1, () => {
    h.flashTarget(0, 0xF1F5F9, 3);
    h.shake(4);
    h.sparks(c.x, c.y, 6, [0xF1F5F9, 0xFBBF24]);
  });
  tl.at(CUT1 + 2, () => h.anim('ATTACK2'));
  slashFx(h, tl, CUT2 - 1, { x: c.x - 8, y: c.y + 4, r: 28, a0: 1.3, a1: -1.6, thick: 8, p: P_STEELB });
  hitFx(h, tl, CUT2, c, P_STEELB, 15, [0xF1F5F9, 0xFBBF24, 0xFFFFFF]);
  tl.at(CUT2, () => {
    land(h, 0, { tint: 0xF1F5F9 });
    h.knock(0, 12, 4);
  });
  backstep(h, tl, CUT2 + 6, CUT2 + 22, 14);
  tl.at(CUT2 + 22, () => {
    h.anim('DEFENSE');
    h.guard(0xCBD5E1);
  });
  tl.end(CUT2 + 26);
}

/** Lunar Hunt: under a cold moon the knight runs the pack down, a spectral wolf leaping ahead of every cut. */
function lunarHunt(h: KnightMoveHost, tl: Timeline) {
  const hits = h.targets.length ? [...h.targets] : [h.target, h.target];
  const STEP = 16;
  const START = 8;
  tl.at(0, () => {
    h.anim('DASH');
    h.camera(1.06, 260, h.home.y - 40, START + hits.length * STEP + 10);
  });
  tl.during(0, 10, (t) => h.dim(0.4 * t, 0x050B1A));
  drawSpan(h, tl, 2, START + hits.length * STEP + 16, (g, t) => {
    const a = Math.min(1, t * 4) * (t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1);
    g.circle(360, 66, 12).fill({ color: 0xEFF6FF, alpha: 0.9 * a });
    g.circle(366, 62, 11).fill({ color: 0x050B1A, alpha: 0.95 * a });
    g.circle(360, 66, 18).stroke({ width: 1, color: 0x60A5FA, alpha: 0.4 * a });
  });
  hits.forEach((t, k) => {
    const at = START + k * STEP;
    const c = chest(t);
    tl.at(at, () => {
      h.anim('SKILL1');
      h.sound('swing');
    });
    travel(h, tl, at, at + 6, here(h), strikeSpot(h, t, 44), easeIn);
    ghostTrail(h, tl, at, at + 6, 0x60A5FA, 1, 0.45);
    // The spirit wolf lunges at the throat a beat ahead of the blade
    drawSpan(h, tl, at, at + 12, (g, u) => {
      const x = lerp(h.pos().x, c.x, easeOut(Math.min(1, u * 1.6)));
      beastHead(g, x, c.y - 4 - arc(Math.min(1, u * 1.6)) * 10, 10, 'wolf', 1, P_MOON, 0.85 * (1 - Math.max(0, u - 0.6) / 0.4), u > 0.4 ? 1 : 0.3);
    });
    tl.at(at + 6, () => {
      land(h, h.targets.length ? k : undefined, { scale: 0.8, tint: 0xBFDBFE, burst: 'slash', burstSize: 0.8 });
      h.knock(k, 8, 2);
    });
    drawSpan(h, tl, at + 6, at + 14, (g, u) => clawRake(g, c.x, c.y, 1, 22, 0x60A5FA));
  });
  const END = START + hits.length * STEP;
  tl.at(END, () => {
    h.face(true);
    h.anim('RUN', true);
  });
  travel(h, tl, END, END + 14, here(h), HOME, easeInOut);
  tl.at(END + 14, () => {
    h.face(false);
    h.idle();
  });
  tl.during(END, END + 14, (t) => h.dim(0.4 * (1 - t), 0x050B1A));
  tl.end(END + 16);
}

/** Tusk Gore: head down, the boar spirit charges with him, and the tusked blade gores the foe upward. */
function tuskGore(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const HIT = 18; // ATTACK3 from 4 thrusts at 18
  tl.at(0, () => h.anim('DASH'));
  tl.every(0, 6, 2, () => dust(h, h.pos(), 2, -1));
  tl.at(4, () => {
    h.anim('ATTACK3');
    h.sound('swing');
  });
  travel(h, tl, 6, HIT - 1, HOME, strikeSpot(h, t0, 40), easeIn);
  ghostTrail(h, tl, 6, HIT, 0xF87171, 2, 0.4);
  drawSpan(h, tl, 6, HIT + 6, (g, t) => {
    const p = h.pos();
    beastHead(g, p.x + 20 + t * 10, p.y - 18, 12, 'boar', 1, P_TUSK, 0.75 * (1 - Math.max(0, t - 0.7) / 0.3));
  }, 'back');
  // Two gore arcs hooking up through the foe
  slashFx(h, tl, HIT - 1, { x: c.x - 10, y: c.y + 10, r: 22, a0: 1.6, a1: -1.0, thick: 6, p: P_TUSK, dur: 9 });
  slashFx(h, tl, HIT, { x: c.x - 2, y: c.y + 12, r: 22, a0: 1.6, a1: -1.0, thick: 5, p: pal(0xFFF1F2, 0xFFFFFF, 0x450A0A), dur: 9 });
  hitFx(h, tl, HIT, c, P_TUSK, 17);
  tl.at(HIT, () => {
    land(h, 0, { tint: 0xFECACA, burst: 'slash', burstSize: 0.9 });
    h.knock(0, 18, 26);
    h.camera(1.2, c.x - 10, c.y - 10, 12, true);
  });
  backstep(h, tl, HIT + 10, HIT + 26, 14);
  tl.end(HIT + 28);
}

/** Labyrinth Execution: the Minotaur looms behind the knight as he raises the cleaver and brings down the sentence. */
function labyrinthExecution(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const HIT = 38;
  tl.at(0, () => h.camera(1.1, (h.home.x + t0.x) / 2, h.home.y - 44, 30));
  tl.during(0, 14, (t) => h.dim(0.5 * t, 0x140A02));
  drawSpan(h, tl, 2, HIT + 16, (g, t, f) => {
    const p = h.pos();
    const a = Math.min(1, f / 12) * (t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1);
    beastHead(g, p.x - 6, p.y - 64, 18 + (f > HIT - 2 ? 3 : 0), 'bull', 1, P_BULL, 0.55 * a);
  }, 'back');
  // A labyrinth sigil brands the floor under the condemned
  drawSpan(h, tl, 4, HIT + 20, (g, t, f) => {
    const s = 26 * easeOut(Math.min(1, f / 12));
    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
    for (let k = 0; k < 4; k++) {
      const r = s * (1 - k * 0.22);
      g.rect(t0.x - r, t0.y - r * 0.28, r * 2, r * 0.56).stroke({ width: 1.5, color: k % 2 ? 0xFEF3C7 : 0xF59E0B, alpha: 0.8 * fade });
    }
    g.moveTo(t0.x, t0.y - s * 0.28).lineTo(t0.x, t0.y).stroke({ width: 1.5, color: 0xF59E0B, alpha: fade });
  }, 'ground');
  tl.at(6, () => h.anim('RUN', true));
  travel(h, tl, 6, 20, HOME, strikeSpot(h, t0, 64), easeInOut);
  tl.at(20, () => {
    h.anim('ATTACK1');
    h.animSpeed(0.45);
    h.camera(1.2, c.x - 24, c.y - 14, 24);
  });
  tl.during(22, HIT - 2, (t) => h.lift(easeOut(t) * 10));
  tl.at(HIT - 2, () => h.animSpeed(1.8));
  tl.during(HIT - 2, HIT, (t) => h.lift(lerp(10, 0, t)));
  slashFx(h, tl, HIT - 1, { x: c.x - 6, y: c.y - 6, r: 32, a0: -1.9, a1: 1.35, thick: 11, p: P_BULL, dur: 11 });
  hitFx(h, tl, HIT, c, P_BULL, 22, [0xF59E0B, 0xFEF3C7, 0xFFFFFF]);
  tl.at(HIT, () => {
    land(h, 0, { scale: 1.25, tint: 0xFDE68A, flash: 0xFFF1D0, burst: 'crater', burstSize: 1.2 });
    h.camera(1.3, c.x, c.y, 12, true);
    h.knock(0, 4, -12);
    shards(h, c, 16);
  });
  tl.at(HIT + 6, () => h.animSpeed(1));
  tl.during(HIT + 12, HIT + 28, (t) => h.dim(0.5 * (1 - t), 0x140A02));
  backstep(h, tl, HIT + 12, HIT + 28, 16);
  tl.end(HIT + 30);
}

/** Dragonheart Rend: the blade drinks the dragon's heart-fire, and one sweep sends a burning crescent through the line. */
function dragonheartRend(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h).slice(0, 2);
  const SWEEP = 32; // ATTACK4 from 20 sweeps at 32
  const far = Math.min(430, foes[foes.length - 1].x + 50);
  tl.at(0, () => {
    h.anim('SKILL3TULUC');
    h.camera(1.14, h.home.x + 30, h.home.y - 36, SWEEP);
  });
  tl.during(0, 14, (t) => h.dim(0.45 * t, 0x1A0303));
  tl.every(0, SWEEP, 1, () => {
    const p = h.weaponTip();
    h.emit(p.x + rand(-8, 8), p.y + rand(-3, 3), { count: 1, colors: FIRE, speed: [0.3, 1], angle: -Math.PI / 2, spread: 0.5, gravity: -0.05, size: 2, life: [10, 18] });
  });
  [4, 12].forEach((at) => drawSpan(h, tl, at, at + 6, (g, t) => g.circle(kChest(h).x, kChest(h).y, 6 + 16 * t).stroke({ width: 2 * (1 - t) + 1, color: 0xDC2626, alpha: 1 - t })));
  tl.at(20, () => {
    h.anim('ATTACK4');
    h.sound('swing');
  });
  tl.at(SWEEP, () => {
    h.camera(1.04, (h.home.x + far) / 2, h.home.y - 30, 30);
    h.shake(6);
  });
  // The crescent wave of fire travels through the line
  drawSpan(h, tl, SWEEP, SWEEP + 20, (g, t, f) => {
    const x = lerp(h.pos().x + 30, far, easeIn(t));
    crescent(g, x - 20, h.home.y - 26, 30, -1.1, 1.1, 12, P_WYRM, 1 - t * 0.3);
    crescent(g, x - 26, h.home.y - 26, 26, -1.0, 1.0, 6, P_EMBER, 0.8);
    h.emit(x - 4, h.home.y - 26 + rand(-20, 20), { count: 1, colors: FIRE, speed: [0.3, 1], angle: Math.PI, spread: 0.4, gravity: -0.03, size: 2, life: [10, 16] });
  });
  foes.forEach((t, i) => {
    const u = Math.min(1, Math.max(0, (t.x - (h.pos().x + 30)) / (far - h.home.x - 30)));
    const at = SWEEP + Math.max(2, Math.round(Math.sqrt(u) * 20));
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: i ? 0.95 : 1.15, tint: 0xFFB08A, burst: 'fire', burstSize: 1.1 });
      h.knock(i, 14, 6);
    });
  });
  tl.during(SWEEP + 20, SWEEP + 36, (t) => h.dim(0.45 * (1 - t), 0x1A0303));
  tl.end(SWEEP + 38);
}

/** Scorched Earth: the flameblade is driven into the ground and walls of dragonfire erupt beneath the whole pack. */
function scorchedEarth(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const PLUNGE = 22; // SKILL1 from 16 chops at 22
  raiseAndHold(h, tl, 0, 16);
  tl.at(0, () => h.camera(1.1, h.home.x + 30, h.home.y - 40, 26));
  tl.during(0, 14, (t) => h.dim(0.5 * t, 0x1A0303));
  chargeFx(h, tl, 2, 16, () => h.weaponTip(), P_WYRM, 30, 12);
  tl.at(16, () => {
    h.anim('SKILL1');
    h.sound('swing');
  });
  tl.at(PLUNGE, () => {
    h.shake(10);
    h.sound('crit');
    h.camera(1.02, 260, h.home.y - 40, 50);
    h.vfx('fire', h.pos().x + 24, h.home.y - 16, { size: 0.7, life: 24 });
  });
  foes.forEach((t, i) => {
    crackFx(h, tl, PLUNGE, { x: h.home.x + 28, y: h.home.y }, { x: t.x, y: t.y }, P_LAVA, 8 + i * 2, 60);
    const at = PLUNGE + 8 + i * 4;
    drawSpan(h, tl, at, at + 34, (g, u, f) => {
      const up = f < 4 ? easeOut(f / 4) : 1 - Math.max(0, (u - 0.5) / 0.5);
      for (let k = -2; k <= 2; k++) {
        const x = t.x + k * 9;
        const hgt = (34 + 14 * hash(k + Math.floor(f / 2) + i * 5)) * up * (k === 0 ? 1.4 : 1);
        g.poly([x - 6, t.y + 4, x, t.y + 4 - hgt, x + 6, t.y + 4]).fill({ color: BLOOD, alpha: 0.85 });
        g.poly([x - 4, t.y + 4, x, t.y + 4 - hgt * 0.7, x + 4, t.y + 4]).fill({ color: EMBER });
        g.poly([x - 2, t.y + 4, x, t.y + 4 - hgt * 0.4, x + 2, t.y + 4]).fill({ color: 0xFDE047 });
      }
    });
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: 0.95, tint: 0xFFB08A, burst: 'fire', burstSize: 1.1 });
      h.knock(i, 2, 16);
    });
    drawSpan(h, tl, at, at + 60, (g, u) => scorch(g, t.x, t.y, 22, EMBER, 1 - u), 'ground');
  });
  tl.every(PLUNGE + 8, PLUNGE + 50, 2, () => embers(h, { x: rand(200, 410), y: h.home.y }, 1));
  tl.during(PLUNGE + 34, PLUNGE + 50, (t) => h.dim(0.5 * (1 - t), 0x1A0303));
  tl.end(PLUNGE + 52);
}

/** Severed Moment: time stops; the knight is suddenly behind the foe, a hairline crack hangs in the air, and then time resumes. */
function severedMoment(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const VANISH = 14;
  const RESUME = 42;
  tl.at(0, () => {
    h.anim('ATTACK5');
    h.camera(1.14, (h.home.x + t0.x) / 2, h.home.y - 40, RESUME + 10);
  });
  tl.during(0, 12, (t) => h.dim(0.7 * t, 0x08040F));
  drawSpan(h, tl, 0, RESUME + 4, (g, t, f) => {
    const p = h.pos();
    runeCircle(g, p.x, p.y, 30 * easeOut(Math.min(1, f / 8)), f * 0.02, P_NULL, f < VANISH ? 1 : 0.4);
    // A clock hand sweeps once and stops
    const a = -Math.PI / 2 + Math.min(1, f / VANISH) * Math.PI * 2;
    g.moveTo(p.x, p.y).lineTo(p.x + Math.cos(a) * 22, p.y + Math.sin(a) * 6).stroke({ width: 1.5, color: 0xC4B5FD, alpha: f < VANISH ? 1 : 0.4 });
  }, 'ground');
  tl.at(VANISH, () => {
    smoke(h, kChest(h), 10, [...SHADOW, 0x000000]);
    h.alpha(0);
    h.sound('swing');
  });
  tl.at(VANISH + 3, () => {
    h.offset(t0.x + 46 - h.home.x, t0.y - h.home.y);
    h.face(true);
    h.alpha(1);
    h.anim('ATTACK3');
    smoke(h, kChest(h), 6, [...SHADOW, 0x000000]);
  });
  tl.at(VANISH + 15, () => h.animSpeed(0)); // frozen at the end of the stroke
  // The cut hangs in stopped time
  drawSpan(h, tl, VANISH + 4, RESUME, (g, t) => {
    const reach = easeOut(Math.min(1, t * 5));
    g.moveTo(c.x - 26, c.y - 18).lineTo(lerp(c.x - 26, c.x + 26, reach), lerp(c.y - 18, c.y + 16, reach)).stroke({ width: 2, color: 0xFFFFFF });
    g.moveTo(c.x - 26, c.y - 18).lineTo(lerp(c.x - 26, c.x + 26, reach), lerp(c.y - 18, c.y + 16, reach)).stroke({ width: 5, color: 0x7C3AED, alpha: 0.35 });
  });
  tl.at(VANISH + 4, () => h.flashTarget(0, 0xC4B5FD, RESUME - VANISH - 4));
  // Time resumes: the cut detonates along its length
  drawSpan(h, tl, RESUME, RESUME + 14, (g, t) => {
    lance(g, c.x - 30, c.y - 20, c.x + 30, c.y + 18, 14 * (1 - t), P_NULL, 1);
    for (let k = 0; k < 6; k++) {
      const u = k / 5;
      const x = lerp(c.x - 30, c.x + 30, u);
      const y = lerp(c.y - 20, c.y + 18, u);
      g.poly([x, y, x + 6 * t + 3, y - 8 * t - 2, x + 9 * t + 2, y + 2]).fill({ color: 0x000000, alpha: 1 - t }).stroke({ width: 1, color: 0xC4B5FD, alpha: 1 - t });
    }
  });
  tl.at(RESUME, () => {
    h.animSpeed(1);
    land(h, 0, { scale: 1.3, tint: 0xC4B5FD, flash: 0xFFFFFF, burst: 'slash', burstSize: 1.4 });
    h.camera(1.3, c.x, c.y, 12, true);
    h.knock(0, -14, 6);
    shards(h, c, 20);
  });
  tl.during(RESUME, RESUME + 14, (t) => h.dim(0.7 * (1 - t), 0x08040F));
  tl.at(RESUME + 12, () => {
    smoke(h, kChest(h), 8, [...SHADOW, 0x000000]);
    h.alpha(0);
  });
  tl.at(RESUME + 15, () => {
    h.offset(0, 0);
    h.face(false);
    h.idle();
    smoke(h, kChest(h), 8, [...SHADOW, 0x000000]);
  });
  tl.during(RESUME + 15, RESUME + 22, (t) => h.alpha(t));
  tl.end(RESUME + 24);
}

/** Singularity Edge: the voidblade swallows the light, then one stroke releases a widening crescent of nothing. */
function singularityEdge(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const SWEEP = 24;
  tl.at(0, () => {
    h.anim('ATTACK4');
    h.animSpeed(0.5);
    h.camera(1.14, h.home.x + 26, h.home.y - 36, SWEEP);
  });
  tl.during(0, 18, (t) => h.dim(0.6 * t, 0x05010C));
  chargeFx(h, tl, 0, SWEEP, () => h.weaponTip(), pal(0x000000, 0xC4B5FD, 0x7C3AED), 50, 16);
  tl.at(SWEEP - 4, () => h.animSpeed(1.6));
  tl.at(SWEEP, () => {
    h.animSpeed(1);
    h.sound('crit');
    h.shake(8);
    h.camera(1.02, 250, h.home.y - 34, 30);
  });
  drawSpan(h, tl, SWEEP, SWEEP + 22, (g, t) => {
    const p = { x: h.pos().x + 10, y: h.pos().y - 26 };
    const r = lerp(30, 300, easeOut(t));
    crescent(g, p.x, p.y, r, -0.9, 0.9, 18 * (1 - t * 0.5), pal(0x000000, 0x7C3AED, 0xC4B5FD), 1 - t * 0.6);
    crescent(g, p.x, p.y, r - 6, -0.8, 0.8, 4, P_NULL, 1 - t);
  });
  foes.forEach((t, i) => {
    const d = Math.hypot(t.x - (h.home.x + 10), chest(t).y - (h.home.y - 26));
    const u = Math.min(1, Math.max(0, (d - 30) / 270));
    const at = SWEEP + Math.max(1, Math.round((1 - Math.cbrt(1 - u)) * 22));
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: 0.9, tint: 0xC4B5FD, burst: 'portal', burstSize: 0.9 });
      h.knock(i, 14, 4);
    });
  });
  // The rift ring left behind collapses
  drawSpan(h, tl, SWEEP + 16, SWEEP + 36, (g, t) => {
    for (const f of foes) g.ellipse(f.x, chest(f).y, 14 * (1 - t), 4 * (1 - t)).fill({ color: 0x000000, alpha: 0.9 }).stroke({ width: 1, color: 0xC4B5FD });
  });
  tl.during(SWEEP + 20, SWEEP + 36, (t) => h.dim(0.6 * (1 - t), 0x05010C));
  tl.end(SWEEP + 38);
}

// ---------------------------------------------------------------------------------------------

/** One move per weapon spell templateId (src/types/weaponSpells.ts). */
export const SPELL_MOVES: Record<string, KnightMove> = {
  spell_iron_pendulum: ironPendulum,
  spell_caustic_deluge: causticDeluge,
  spell_brood_sac: broodSac,
  spell_requiem_censer: requiemCenser,
  spell_brimstone_comet: brimstoneComet,
  spell_permafrost: permafrostShatter,
  spell_boulder_bowl: boulderBowl,
  spell_abyssal_anchor: abyssalAnchor,
  spell_maelstrom: krakensMaelstrom,
  spell_sunflare: sunflarePendulum,
  spell_wyrmchain: wyrmchainInferno,
  spell_molten_meteor: moltenMeteor,
  spell_event_horizon: eventHorizon,
  spell_gravity_well: gravityWell,

  spell_iron_toll: ironToll,
  spell_spore_bloom: sporeBloom,
  spell_talon_gale: talonGale,
  spell_ironwood_grasp: ironwoodGrasp,
  spell_ley_fault: leyLineFault,
  spell_all_seeing_gaze: allSeeingGaze,
  spell_writhing_dark: writhingDark,
  spell_excalibur_decree: excaliburDecree,
  spell_dragon_breath: dragonsBreath,
  spell_wyrmheart_drive: wyrmheartDrive,
  spell_fallen_star: fallenStar,
  spell_gravity_snap: gravitySnap,

  spell_scrap_shrapnel: scrapShrapnel,
  spell_flanged_crush: flangedCrush,
  spell_ossuary_rattle: ossuaryRattle,
  spell_gravestone_toll: gravestoneToll,
  spell_cathedral_toll: cathedralToll,
  spell_basalt_fissure: basaltFissure,
  spell_core_breach: coreBreach,

  spell_kettleburne_oath: kettleburneOath,
  spell_lunar_hunt: lunarHunt,
  spell_tusk_gore: tuskGore,
  spell_labyrinth_execution: labyrinthExecution,
  spell_dragonheart_rend: dragonheartRend,
  spell_scorched_earth: scorchedEarth,
  spell_severed_moment: severedMoment,
  spell_singularity_edge: singularityEdge,
};
