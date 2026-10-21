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
 * Built on knightKit.ts (land, travel, slashFx, hitFx, ringFx...), the Graphics primitives in fxKit.ts and
 * monsterKit.ts, and the cinematic beats in spellKit.ts: every spell's main contact gets an impactFrame (pass
 * land() a low `glare` with it so the screen flash doesn't wash the silhouettes out), its element is drawn as
 * additive light (lightSpan, glow, godRay), and wind-ups, projectiles and dives get windUp / weaponTrail /
 * speedLines. Review a spell with
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
  kettlebell, lance, scorch, hash, jaws, tube, flameTongue,
} from './fxKit';
import { tentacle, dart, flier, crawler, graspingHand, beam, clawRake } from './monsterKit';
import { stamp, stampPal, fxReady, seq } from './fxAtlas';
import {
  type KnightMove, type KnightMoveHost, type KnightTarget, type P,
  each, once, strikeSpot, chest, kChest, kRaised, shoulders, land, travel, here, HOME, backstep, ghostTrail,
  swingSound, chargeSound, drawSpan, slashFx, hitFx, ringFx, crackFx, chargeFx, motesFx, debris, dust, smoke, shards, embers, projectile,
  P_FIRE, P_EMBER, P_VOID, P_SUN, P_HOLY, P_JADE, P_LIME,
} from './knightKit';
import {
  lite, lightSpan, glow, godRay, glint, focusLines, speedLines, impactFrame, shockSphere, groundCracks, windUp, rubble, skyBolt,
  afterglow, mix, weaponTrail, targetRing,
  LOOK, themed, staged, chargeUp, castCircle, aura, motes, breath, dutch, signature,
} from './spellKit';

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
const P_FLAMEWAKE = pal(0xF97316, 0xFDE047, 0x7C1D06);
const P_FLAMEWAKE_HOT = pal(0xFB923C, 0xFEF9C3, 0x9A3412);
const P_PYRE = pal(0xEA580C, 0xFDE047, 0x450A0A);
const P_TALON = pal(0xFCD34D, 0xFFFBEB, 0x422006);
const P_BOLT_TALON = pal(0x7DD3FC, 0xFFFFFF, 0x0B1E3F);
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
const P_CRIMSON = pal(0xE11D48, 0xFFE4E6, 0x1A0308);

// Each spell's look for the director beats (spellKit chargeUp / signature): its element, recoloured to the spell
// and marked with its own motif, so the charge and the contact read as that spell.
const L_CAUSTIC = themed(LOOK.NATURE, 0x84CC16, 'bubble', { deep: 0x041208, sound: 'gurgle' });
const L_BROOD = themed(LOOK.NATURE, 0xA855F7, 'web', { core: 0xF5D0FE, deep: 0x0E0418, sound: 'web' });
const L_REQUIEM = themed(LOOK.HOLY, 0x7DD3FC, 'skull', { core: 0xE0F2FE, deep: 0x06121C, sound: 'wail' });
const L_ABYSS = themed(LOOK.FROST, 0x2DD4BF, 'wave', { core: 0xCCFBF1, deep: 0x021614, sound: 'splash' });
const L_MAELSTROM = themed(LOOK.STORM, 0x14B8A6, 'wave', { core: 0xCCFBF1, deep: 0x021614, sound: 'wave' });
const L_SUN = themed(LOOK.HOLY, 0xFBBF24, 'sun', { deep: 0x140C02 });
const L_MAGMA = themed(LOOK.FIRE, 0xEA580C, 'shard', { deep: 0x1A0303, sound: 'explosion' });
const L_GRAVITY = themed(LOOK.VOID, 0xA78BFA, 'crescent', { deep: 0x05010C });
const L_TOLL = themed(LOOK.STEEL, 0xCBD5E1, 'bell', { sound: 'impact_metal' });
const L_SPORE = themed(LOOK.NATURE, 0xC084FC, 'bubble', { core: 0xF5D0FE, deep: 0x0C0616, sound: 'magic' });
const L_TALON = themed(LOOK.STORM, 0xFCD34D, 'feather', { core: 0xFEF3C7, deep: 0x0A0C18, sound: 'flap' });
const L_IRONWOOD = themed(LOOK.NATURE, 0x4ADE80, 'leaf', { deep: 0x061206, sound: 'wood' });
const L_LEY = themed(LOOK.EARTH, 0x38BDF8, 'shard', { core: 0xE0F2FE, deep: 0x05101A });
const L_GAZE = themed(LOOK.HOLY, 0xFBBF24, 'eye', { deep: 0x0A0314 });
const L_WRITHE = themed(LOOK.VOID, 0x9333EA, 'crescent', { deep: 0x0A0218 });
const L_DECREE = themed(LOOK.HOLY, 0xF4B41A, 'cross', { deep: 0x140C02 });
const L_DRAGON = themed(LOOK.FIRE, 0xDC2626, 'flame', { core: 0xFDE68A, deep: 0x1A0303 });
const L_STAR = themed(LOOK.VOID, 0xC084FC, 'star', { core: 0xFAF5FF, deep: 0x05010C });
const L_SNAP = themed(LOOK.VOID, 0x8B5CF6, 'crescent', { core: 0xDDD6FE, deep: 0x07021A });
const L_SCRAP = themed(LOOK.STEEL, 0xA3E635, 'chevron', { deep: 0x0C1006, sound: 'gears' });
const L_FLANGE = themed(LOOK.STEEL, 0xE7E5E4, 'chevron', { deep: 0x0C0A08, sound: 'impact_metal' });
const L_OSSUARY = themed(LOOK.VOID, 0x86EFAC, 'skull', { core: 0xDCFCE7, deep: 0x060A0A, sound: 'rattle' });
const L_GRAVE = themed(LOOK.HOLY, 0x94A3B8, 'cross', { core: 0xE2E8F0, deep: 0x080A10, sound: 'rock' });
const L_CATHEDRAL = themed(LOOK.STORM, 0xFBBF24, 'bell', { core: 0xFEF3C7, deep: 0x0F0A03, sound: 'thunder' });
const L_BASALT = themed(LOOK.EARTH, 0xEA580C, 'shard', { core: 0xFDE68A, deep: 0x140602, sound: 'explosion' });
const L_CORE = themed(LOOK.FIRE, 0xFDBA74, 'flame', { deep: 0x140602, sound: 'explosion' });
const L_BURIAL = themed(LOOK.VOID, 0xE11D48, 'skull', { core: 0xFFE4E6, deep: 0x12030A, sound: 'wail' });
const L_BLOODMOON = themed(LOOK.VOID, 0xE11D48, 'moon', { core: 0xFFE4E6, deep: 0x1A0308, sound: 'wail' });
const L_OATH = themed(LOOK.STEEL, 0xCBD5E1, 'cross', { sound: 'ward' });
const L_LUNAR = themed(LOOK.FROST, 0x60A5FA, 'moon', { core: 0xEFF6FF, deep: 0x050B1A, sound: 'growl' });
const L_TUSK = themed(LOOK.EARTH, 0xF87171, 'moon', { core: 0xFECACA, deep: 0x140404, sound: 'growl' });
const L_BULL = themed(LOOK.STEEL, 0xF59E0B, 'chevron', { core: 0xFEF3C7, deep: 0x140A02, sound: 'roar' });
const L_TIME = themed(LOOK.VOID, 0xA78BFA, 'star', { core: 0xFFFFFF, deep: 0x08040F, sound: 'portal' });
const L_SINGULARITY = themed(LOOK.VOID, 0x8B5CF6, 'crescent', { deep: 0x05010C });
const L_ONSLAUGHT = themed(LOOK.HOLY, 0xF59E0B, 'cross', { deep: 0x0A0618 });
const L_DAWN = themed(LOOK.HOLY, 0xFDE047, 'sun', { deep: 0x0A0618 });

// =============================================================================================
// Weapon-themed drawing helpers

/** The hand gripping the weapon: raised overhead (whirls) or at the hip. */
export const grip = (h: KnightMoveHost, raised = true): P => (raised ? { x: h.pos().x + 4, y: h.pos().y - 50 } : { x: h.pos().x + 12, y: h.pos().y - 26 });

/** Chain of links from (x0,y0) to (x1,y1), sagging by `sag` px. */
export function chain(g: Graphics, x0: number, y0: number, x1: number, y1: number, link: number, sag = 0, alpha = 1) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(2, Math.round(len / 4));
  let px = x0;
  let py = y0;
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    const x = lerp(x0, x1, u);
    const y = lerp(y0, y1, u) + Math.sin(u * Math.PI) * sag;
    if (i % 2) {
      // Face-on link: an inked ring, lit on its upper edge
      const mx = (px + x) / 2;
      const my = (py + y) / 2;
      g.circle(mx, my, 2.2).stroke({ width: 2.2, color: INK, alpha: 0.8 * alpha });
      g.circle(mx, my, 1.7).stroke({ width: 1, color: link, alpha });
      g.rect(mx - 1, my - 2.2, 2, 1).fill({ color: 0xF1F5F9, alpha: 0.9 * alpha });
    } else {
      // Edge-on link: a short bar with a highlight
      g.moveTo(px, py).lineTo(x, y).stroke({ width: 3, color: INK, alpha: 0.8 * alpha });
      g.moveTo(px, py).lineTo(x, y).stroke({ width: 1.5, color: 0xCBD5E1, alpha });
    }
    px = x;
    py = y;
  }
}

/** Spiked flail head: ball with `spikes` points, ink rim, body and highlight. */
export function flailHead(g: Graphics, x: number, y: number, r: number, spin: number, p: Pal, spikes = 8, alpha = 1) {
  for (let i = 0; i < spikes; i++) {
    const a = spin + (i / spikes) * Math.PI * 2;
    const bx = x + Math.cos(a) * r * 0.8;
    const by = y + Math.sin(a) * r * 0.8;
    const px = -Math.sin(a) * r * 0.28;
    const py = Math.cos(a) * r * 0.28;
    const tx = x + Math.cos(a) * r * 1.55;
    const ty = y + Math.sin(a) * r * 1.55;
    // Two-facet spike: the half facing the upper-left light in the core colour, the other in the body
    const lit = Math.cos(a) * -0.6 + Math.sin(a) * -0.8 > 0 ? 1 : -1;
    g.poly([bx + px, by + py, tx, ty, bx - px, by - py]).fill({ color: p.body, alpha }).stroke({ width: 1, color: p.ink, alpha: 0.8 * alpha });
    g.poly([bx + px * lit, by + py * lit, tx, ty, bx, by]).fill({ color: p.core, alpha });
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
export function whirl(
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
  // The chain rattles out, then each revolution whooshes a little faster and higher
  tl.at(from, () => h.sound('rattle', { rate: 1.5, vol: 0.4 }));
  tl.every(from + 6, to, 12, (i) => h.sound('whoosh', { rate: 0.75 + i * 0.12, vol: 0.5 + i * 0.1 }));
  return () => last;
}

/** Holds the knight's arm raised (SKILL2TULUC frozen at its raise) from `at` until released. */
export function raiseAndHold(h: KnightMoveHost, tl: Timeline, at: number, until: number) {
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
  // Spectral: a cold bloom around the head and a burning eye (drawn under / over the silhouette)
  if (fxReady()) stamp(g, 'bloom', x + 0.2 * s * dir, y - 0.2 * s, s * 4, s * 3.4, { tint: p.body, alpha: 0.45 * alpha });
  const eyeAt = kind === 'bull' ? null : { x: X(kind === 'dragon' ? 0.25 : kind === 'boar' ? 0.35 : 0.3), y: Y(kind === 'dragon' ? -0.4 : kind === 'boar' ? -0.45 : -0.35) };
  const burnEye = () => {
    if (eyeAt && fxReady()) {
      stamp(g, 'bloomHot', eyeAt.x, eyeAt.y, s * 1.1, s * 1.1, { tint: p.core, alpha });
      stamp(g, 'flare', eyeAt.x, eyeAt.y, s * 1.6, s * 1.6, { tint: 0xFFFFFF, alpha: 0.8 * alpha });
    }
  };
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
  burnEye();
}

/** Tapered fire / gas cone from (x,y) along `ang`, `len` long; flickers per frame. */
function cone(g: Graphics, x: number, y: number, ang: number, len: number, spread: number, f: number, layers: number[], alpha = 1) {
  if (fxReady() && len > 4) {
    // Painted jet: haze blooms widening down the axis, then a stream of licking fireball sprites rushing out
    const p = { ink: layers[0], body: layers[Math.min(1, layers.length - 1)], core: layers[layers.length - 1] };
    for (let k = 0; k <= 5; k++) {
      const d = (len * k) / 5;
      const w = 10 + d * Math.tan(spread) * 2.6;
      stamp(g, 'bloom', x + Math.cos(ang) * d, y + Math.sin(ang) * d, w * 1.4, w, { rot: ang, tint: layers[0], alpha: 0.4 * alpha });
    }
    const n = lite() ? 12 : 22;
    for (let i = 0; i < n; i++) {
      const ph = (f * 0.055 + i / n) % 1;
      const d = len * (0.04 + 0.96 * ph);
      const a = ang + (hash(i * 13 + 7) * 2 - 1) * spread * 0.85;
      const w = 6 + d * Math.tan(spread) * 1.7;
      stampPal(g, seq('fireball', 4, f + i, 3), x + Math.cos(a) * d, y + Math.sin(a) * d, w * 1.7, w, p, { rot: a, alpha: alpha * (1 - ph * 0.55) });
    }
    stamp(g, 'bloomHot', x, y, 22, 22, { tint: p.core, alpha });
    return;
  }
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
export function eye(g: Graphics, x: number, y: number, r: number, open: number, look: number, p: Pal, alpha = 1) {
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
export function phantomBell(g: Graphics, x: number, y: number, w: number, p: Pal, alpha = 1) {
  const hgt = w * 0.95;
  const pts = [
    x - w * 0.5, y + hgt * 0.5, x - w * 0.42, y + hgt * 0.35, x - w * 0.3, y - hgt * 0.1, x - w * 0.24, y - hgt * 0.4,
    x, y - hgt * 0.52, x + w * 0.24, y - hgt * 0.4, x + w * 0.3, y - hgt * 0.1, x + w * 0.42, y + hgt * 0.35, x + w * 0.5, y + hgt * 0.5,
  ];
  if (fxReady()) {
    // Spectral bronze: an inner bloom, light banded down the bell (bright shoulder, dim waist, glowing lip)
    stamp(g, 'bloom', x, y, w * 2, w * 2, { tint: p.body, alpha: 0.5 * alpha });
    g.poly(pts).fill({ color: p.body, alpha: 0.22 * alpha });
    g.poly([x - w * 0.24, y - hgt * 0.4, x, y - hgt * 0.52, x - w * 0.05, y + hgt * 0.45, x - w * 0.42, y + hgt * 0.35, x - w * 0.3, y - hgt * 0.1])
      .fill({ color: p.core, alpha: 0.18 * alpha });
    // Volume: the bell's shadowed right flank, a lit shoulder band and the sound-bow ring near the lip
    g.poly([x + w * 0.1, y - hgt * 0.48, x + w * 0.24, y - hgt * 0.4, x + w * 0.3, y - hgt * 0.1, x + w * 0.42, y + hgt * 0.35, x + w * 0.2, y + hgt * 0.4])
      .fill({ color: p.ink, alpha: 0.3 * alpha });
    g.moveTo(x - w * 0.27, y - hgt * 0.22).lineTo(x + w * 0.27, y - hgt * 0.22).stroke({ width: 2, color: p.core, alpha: 0.5 * alpha });
    stamp(g, 'beam', x, y, hgt, w * 0.7, { rot: Math.PI / 2, tint: p.core, alpha: 0.25 * alpha });
    stamp(g, 'beamCore', x, y + hgt * 0.42, w * 1.1, Math.max(4, w * 0.18), { tint: p.core, alpha: 0.8 * alpha });
    g.poly(pts).stroke({ width: 3, color: p.body, alpha: 0.35 * alpha });
  } else {
    g.poly(pts).fill({ color: p.body, alpha: 0.16 * alpha }).stroke({ width: 3, color: p.ink, alpha: 0.5 * alpha });
  }
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
export function anchor(g: Graphics, x: number, y: number, s: number, rot: number, p: Pal, alpha = 1) {
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
export function skull(g: Graphics, x: number, y: number, s: number, f: number, p: Pal, alpha = 1) {
  const jaw = Math.abs(Math.sin(f * 0.8)) * s * 0.35;
  g.circle(x, y, s).fill({ color: p.body, alpha }).stroke({ width: 1.5, color: p.ink, alpha });
  g.rect(x - s * 0.6, y + s * 0.5 + jaw, s * 1.2, s * 0.45).fill({ color: p.body, alpha }).stroke({ width: 1, color: p.ink, alpha });
  g.circle(x - s * 0.38, y - s * 0.05, s * 0.28).fill({ color: INK, alpha });
  g.circle(x + s * 0.38, y - s * 0.05, s * 0.28).fill({ color: INK, alpha });
  g.rect(x - s * 0.45, y - s * 0.12, 1, 1).fill({ color: 0x86EFAC, alpha });
  g.rect(x + s * 0.32, y - s * 0.12, 1, 1).fill({ color: 0x86EFAC, alpha });
}

/** Black hole: event horizon, tilted accretion disk and lensing ring. */
export function blackHole(g: Graphics, x: number, y: number, r: number, f: number, p: Pal, alpha = 1) {
  if (r <= 0.5) return;
  if (fxReady()) {
    // Painted: a haze of infalling light, the disk's glowing band and a hot lensing ring around the hole
    stamp(g, 'mist0', x, y, r * 6, r * 3, { tint: p.body, alpha: 0.6 * alpha, rot: f * 0.02 });
    stamp(g, 'ringSoft', x, y, (r * 2.6 * 2) / 0.7, (r * 0.75 * 2) / 0.7, { tint: p.body, alpha: 0.85 * alpha });
    stamp(g, 'ring', x, y, (r * 1.3 * 2) / 0.78, (r * 1.3 * 2) / 0.78, { tint: p.core, alpha: 0.9 * alpha });
  }
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
  if (fxReady()) stamp(g, 'beamCore', x, y + r * 0.18, r * 4.4, r * 0.4, { tint: 0xFFFFFF, alpha: 0.7 * alpha });
}

/** Sun disk with rotating rays. */
export function sun(g: Graphics, x: number, y: number, r: number, f: number, p: Pal, alpha = 1) {
  if (r <= 0.5) return;
  if (fxReady()) {
    // Painted: corona bloom, a slow-turning eight-point flare, then the rays and the disk over them
    stamp(g, 'bloom', x, y, r * 7, r * 7, { tint: p.body, alpha: 0.65 * alpha });
    stamp(g, 'flare8', x, y, r * 6.5, r * 6.5, { tint: p.core, alpha: 0.85 * alpha, rot: f * 0.01 });
  }
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + f * 0.05;
    const len = r * (1.6 + 0.35 * Math.sin(f * 0.5 + k));
    g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r).lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len).stroke({ width: 2, color: k % 2 ? p.body : p.core, alpha: 0.9 * alpha });
  }
  orb(g, x, y, r, pal(p.body, 0xFFFFFF, p.ink), alpha);
  if (fxReady()) stamp(g, 'bloomHot', x, y, r * 2.6, r * 2.6, { tint: 0xFFFFFF, alpha });
}

/** Serpent body along `pts` (head first), thinning to the tail, with a dragon head at pts[0]. */
function serpent(g: Graphics, pts: P[], w: number, p: Pal, f: number, dir: 1 | -1 = 1) {
  const n = pts.length;
  // Ink outline, body, then a hot belly stripe: segment strokes tapering to the tail
  if (fxReady()) {
    // Scaled body (fxKit.tube) under a heat bloom that runs down its spine
    tube(g, pts, pts.map((_, i) => w * 2 * (1 - i / n) + 2), p);
    for (let i = 0; i < n; i += 3) stamp(g, 'bloom', pts[i].x, pts[i].y, w * 3 * (1 - i / n) + 6, w * 3 * (1 - i / n) + 6, { tint: p.body, alpha: 0.3 });
  } else {
    for (const [extra, color, scale] of [[3, p.ink, 1], [0, p.body, 1], [0, p.core, 0.35]] as const) {
      for (let i = n - 1; i >= 1; i--) {
        const wd = (w * 2 * (1 - i / n) + 2) * scale + extra;
        g.moveTo(pts[i].x, pts[i].y).lineTo(pts[i - 1].x, pts[i - 1].y).stroke({ width: wd, color, cap: 'round' });
      }
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
  const DIM = 0x0A0D14;
  raiseAndHold(h, tl, 0, REL);
  tl.at(2, () => {
    h.weaponShown(false);
    h.camera(1.16, h.home.x + 30, h.home.y - 44, REL);
  });
  tl.during(0, 14, (t) => h.dim(0.35 * t, DIM));
  const head = whirl(h, tl, 2, REL, P_IRON, { r: 6, trail: [0xF1F5F9, 0x94A3B8] });
  chargeUp(h, tl, 2, REL, LOOK.STEEL, { at: head, breath: 6, freeze: false, circle: 30 });
  // The whirl screams: a blur disc of iron and sparks shed off the chain
  lightSpan(h, tl, 10, REL, (g, t, f) => {
    const hand = grip(h);
    g.ellipse(hand.x, hand.y - 4, 24, 9).stroke({ width: 4 + 4 * t, color: 0x94A3B8, alpha: 0.25 * t });
    glow(g, head().x, head().y, 10 + 6 * t, 0xCBD5E1, 0.4 + 0.4 * t);
    if (f % 4 === 0) h.sparks(head().x, head().y, 2, [0xFBBF24, 0xFFFFFF]);
  });
  speedLines(h, tl, REL - 10, REL, () => grip(h), 0xCBD5E1, { alpha: 0.3, inner: 40 });
  tl.every(10, REL, 4, () => h.shake(1.5));
  // Step in and swing the head down in a widening arc onto the foe
  tl.at(REL, () => {
    h.anim('ATTACK1');
    swingSound(h, true);
    h.camera(1.2, (h.home.x + c.x) / 2 + 20, c.y - 20, HIT - REL + 4);
  });
  travel(h, tl, REL, HIT - 4, HOME, strikeSpot(h, t0, 74), easeInOut);
  ghostTrail(h, tl, REL + 2, HIT - 2, 0xCBD5E1, 2, 0.4);
  dutch(h, tl, REL, 0.07, HIT - REL);
  const from = once(() => head());
  const headAt = (t: number): P => {
    const s = from();
    const e = easeIn(t);
    return { x: lerp(s.x, c.x, e), y: lerp(s.y, c.y, e) - arc(t) * 34 };
  };
  let swingT = 0;
  drawSpan(h, tl, REL, HIT + 1, (g, t) => {
    swingT = t;
    const hand = grip(h, t > 0.5);
    const p = headAt(t);
    flail(g, hand, p, 7, t * 6, P_IRON);
    if (t > 0.4) crescent(g, hand.x, hand.y, Math.hypot(p.x - hand.x, p.y - hand.y), -1.9, Math.atan2(p.y - hand.y, p.x - hand.x), 6, P_IRON, (t - 0.4) / 0.6);
  });
  weaponTrail(h, tl, REL + 2, HIT + 1, pal(0xCBD5E1, 0xFFFFFF, 0x0F172A), 12, 7, () => headAt(swingT));
  hitFx(h, tl, HIT, c, P_IRON, 20, [0xF1F5F9, 0x94A3B8, 0xFBBF24]);
  ringFx(h, tl, HIT, { x: t0.x, y: t0.y }, 6, 90, 0x94A3B8, 16);
  shockSphere(h, tl, HIT, c, 54, 0xCBD5E1, 14);
  drawSpan(h, tl, HIT, HIT + 44, (g, t) => groundCracks(g, t0.x, t0.y + 2, 46, 7, 3, pal(0x64748B, 0xF1F5F9, INK), Math.min(1, t * 6), 1 - t), 'ground');
  tl.at(HIT, () => {
    land(h, 0, { scale: 1.2, tint: 0xE2E8F0, burst: 'crater', glare: 0.25 });
    impactFrame(h, tl, c, { dim: [0.35, DIM] });
    h.camera(1.32, c.x - 10, c.y, 12, true);
    h.roll(-0.09, 8, true);
    h.knock(0, 18, 6);
    h.sparks(c.x, c.y, 22, [0xFBBF24, 0xF1F5F9, 0xFFFFFF]);
    rubble(h, { x: t0.x, y: t0.y }, 12, [0x57534E, 0x78716C, 0xA8A29E]);
  });
  // Recoil: the head swings back up to his hand
  drawSpan(h, tl, HIT + 1, HIT + 14, (g, t) => {
    const hand = grip(h, false);
    flail(g, hand, { x: lerp(c.x, hand.x + 14, easeOut(t)), y: lerp(c.y, hand.y + 6, easeOut(t)) - arc(t) * 20 }, 6, t * 4, P_IRON, 0x64748B, 4);
  });
  tl.at(HIT + 14, () => h.weaponShown(true));
  backstep(h, tl, HIT + 14, HIT + 30, 14);
  tl.during(HIT + 16, HIT + 32, (t) => h.dim(0.35 * (1 - t), DIM));
  tl.end(HIT + 34);
}

/** Caustic Deluge: slam the slime bell into the floor; an acid geyser bursts up and its globs rain on every foe. */
function causticDeluge(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const SLAM = 12; // ATTACK4 sweep
  const DIM = 0x041208;
  const burst = once(() => ({ x: h.weaponTip().x, y: h.home.y }));
  tl.at(0, () => {
    h.anim('ATTACK4');
    swingSound(h);
    h.camera(1.14, h.home.x + 40, h.home.y - 34, SLAM + 6);
    h.roll(-0.05, SLAM, false);
  });
  tl.during(0, 10, (t) => h.dim(0.35 * t, DIM));
  tl.every(0, SLAM, 3, () => h.emit(h.weaponTip().x, h.weaponTip().y, { count: 1, colors: GOO, speed: [0.2, 0.6], angle: Math.PI / 2, spread: 0.3, gravity: 0.15, size: 2, life: [10, 16] }));
  lightSpan(h, tl, 0, SLAM, (g, t) => glow(g, h.weaponTip().x, h.weaponTip().y, 8 + 8 * t, 0x84CC16, 0.6));
  tl.at(SLAM, () => {
    const b = burst();
    h.shake(7);
    h.hitStop(3);
    h.sound('splat');
    h.sound('impact_metal', { vol: 0.5 });
    h.sound('spit', { rate: 0.6 });
    h.emit(b.x, b.y, { count: 24, colors: GOO, speed: [1.5, 4], angle: -Math.PI / 2, spread: 0.7, gravity: 0.2, size: 3, life: [14, 26] });
    h.vfx('poison', b.x, b.y - 10, { size: 0.9 });
    h.roll(0.07, 12, true);
    h.camera(1.04, (h.home.x + foes[foes.length - 1].x) / 2, h.home.y - 50, 44);
  });
  // The geyser: a column of acid punches up out of the floor and collapses
  lightSpan(h, tl, SLAM, SLAM + 16, (g, t) => {
    const b = burst();
    const up = t < 0.3 ? easeOut(t / 0.3) : 1 - easeIn((t - 0.3) / 0.7);
    const hgt = 104 * up;
    g.poly([b.x - 18, b.y, b.x - 8, b.y - hgt, b.x + 8, b.y - hgt, b.x + 18, b.y]).fill({ color: 0x16A34A, alpha: 0.45 });
    g.poly([b.x - 9, b.y, b.x - 4, b.y - hgt * 0.97, b.x + 4, b.y - hgt * 0.97, b.x + 9, b.y]).fill({ color: 0x84CC16, alpha: 0.6 });
    g.poly([b.x - 3, b.y, b.x - 1.5, b.y - hgt * 0.9, b.x + 1.5, b.y - hgt * 0.9, b.x + 3, b.y]).fill({ color: 0xF7FEE7, alpha: 0.9 });
    glow(g, b.x, b.y - hgt, 22 * up, 0x84CC16, up);
    glow(g, b.x, b.y - 4, 26 * up, 0x22C55E, 0.6 * up);
  });
  drawSpan(h, tl, SLAM, SLAM + 54, (g, t) => {
    const b = burst();
    g.ellipse(b.x, h.home.y + 2, 28 * easeOut(Math.min(1, t * 4)), 5).fill({ color: 0x16A34A, alpha: 0.7 * (1 - t) });
    g.ellipse(b.x, h.home.y + 1, 16 * easeOut(Math.min(1, t * 4)), 2.5).fill({ color: 0xA3E635, alpha: 0.8 * (1 - t) });
  }, 'ground');
  // Acid globs: two per foe, the second lands the damage
  const last = foes.length - 1;
  each(h).forEach((t, i) => {
    const c = chest(t);
    for (let k = 0; k < 2; k++) {
      const at = SLAM + 4 + i * 3 + k * 5;
      if (k === 0 && i === 0) tl.at(at, () => h.sound('spit', { rate: 0.8 }));
      projectile(h, tl, at, 14, () => ({ x: burst().x, y: burst().y - 60 }), () => ({ x: c.x + rand(-6, 6), y: c.y + rand(-8, 4) }), 40 + i * 8,
        (g, x, y, _t, f) => {
          g.circle(x, y, 9).fill({ color: 0x84CC16, alpha: 0.18 });
          g.circle(x, y, 4.5).fill({ color: 0x052E16 });
          g.circle(x, y, 3.5).fill({ color: 0x22C55E });
          g.circle(x - 1, y - 1, 1.5).fill({ color: 0xD9F99D });
          g.circle(x + Math.sin(f) * 2, y + 4, 1.5).fill({ color: 0x22C55E, alpha: 0.7 });
        },
        () => {
          if (k === 1) {
            land(h, h.targets.length ? i : undefined, { scale: i === last ? 0.95 : 0.75, tint: 0xBEF264, burst: 'poison', burstSize: 0.7, glare: i === last ? 0.2 : 0.5 });
            if (i === last) {
              impactFrame(h, tl, c, { color: 0xA3E635, hold: 2, dim: [0.35, DIM] });
              h.roll(-0.08, 8, true);
              signature(h, tl, tl.frame, c, L_CAUSTIC, 40);
            }
            h.knock(i, 6, 2);
          } else {
            h.flashTarget(i, 0xBEF264, 4);
            h.sound('splat', { vol: 0.5, rate: 1.2 });
          }
          h.emit(c.x, c.y, { count: 8, colors: GOO, speed: [0.5, 2.4], spread: Math.PI, gravity: 0.15, size: 2, life: [12, 20] });
        },
        (x, y) => { if (Math.random() < 0.5) h.emit(x, y, { count: 1, colors: GOO, speed: [0, 0.2], angle: Math.PI / 2, spread: 0.2, gravity: 0.12, size: 2, life: [8, 14] }); });
    }
    // A bubbling acid pool eats the floor under each foe, fuming
    const pool = SLAM + 18 + i * 3;
    lightSpan(h, tl, pool, SLAM + 70, (g, u, f) => {
      const r = 22 * easeOut(Math.min(1, f / 8)) * (u > 0.75 ? 1 - (u - 0.75) / 0.25 : 1);
      g.ellipse(t.x, t.y + 2, r, r * 0.26).fill({ color: 0x22C55E, alpha: 0.4 });
      g.ellipse(t.x, t.y + 2, r * 0.6, r * 0.14).fill({ color: 0xD9F99D, alpha: 0.4 });
      for (let k = 0; k < 4; k++) {
        const ph = ((f + k * 7) % 14) / 14;
        g.circle(t.x - r * 0.6 + k * r * 0.4, t.y + 2 - ph * 3, 1.5 * (1 - ph) + 0.5).stroke({ width: 1, color: 0xD9F99D, alpha: 1 - ph });
      }
    }, 'ground');
    tl.at(pool + 4, () => h.sound('hiss', { vol: 0.35, rate: 1.2 }));
    tl.every(pool + 4, SLAM + 60, 4, () => smoke(h, { x: t.x + rand(-8, 8), y: t.y - 6 }, 1, [0x4D7C0F, 0x65A30D, 0x3F6212]));
  });
  tl.during(SLAM + 54, SLAM + 70, (t) => h.dim(0.35 * (1 - t), DIM));
  tl.end(SLAM + 72);
}

/** Brood Sac Hurl: fling the egg-sac head; it bursts on the foe in a web of silk and spiderlings swarm the pack. */
function broodSac(h: KnightMoveHost, tl: Timeline) {
  const hits = h.targets.length ? [...h.targets] : [h.target, h.target, h.target];
  const THROW = 12;
  const BURST = THROW + 12;
  const DIM = 0x0E0418;
  const c0 = chest(hits[0]);
  tl.at(0, () => {
    h.anim('ATTACK1');
    swingSound(h);
    h.camera(1.12, (h.home.x + c0.x) / 2, c0.y - 10, BURST + 4);
  });
  tl.during(0, 12, (t) => h.dim(0.4 * t, DIM));
  tl.at(THROW, () => {
    h.weaponShown(false);
    h.sound('toss', { rate: 0.8 });
    h.roll(0.06, BURST - THROW, true);
  });
  // The sac in flight, its veins pulsing with venom-light
  projectile(h, tl, THROW, 12, () => h.weaponTip(), () => c0, 26,
    (g, x, y, t, f) => {
      const pulse = 1 + 0.15 * Math.sin(f * 1.4);
      g.ellipse(x, y, 7 * pulse, 6 * pulse).fill({ color: 0x581C87 }).stroke({ width: 2, color: INK });
      g.ellipse(x - 1, y - 1, 4, 3).fill({ color: 0xC084FC, alpha: 0.7 });
      for (let k = 0; k < 3; k++) g.moveTo(x - 5 + k * 4, y - 4).lineTo(x - 4 + k * 4, y + 4).stroke({ width: 1, color: 0x14B8A6, alpha: 0.8 });
      chain(g, grip(h, false).x, grip(h, false).y, x, y, 0xE9D5FF, 4, 1 - t);
    }, () => undefined);
  lightSpan(h, tl, THROW, BURST, (g, t) => {
    const s = h.weaponTip();
    const x = lerp(s.x, c0.x, t);
    const y = lerp(s.y, c0.y, t) - arc(t) * 26;
    glow(g, x, y, 12 + 4 * Math.sin(t * 20), 0xA855F7, 0.8);
  });
  // The sac bursts: an impact frame, a silk web slapped across the foe, and the first bite
  tl.at(BURST, () => {
    land(h, h.targets.length ? 0 : undefined, { scale: 0.9, tint: 0xE9D5FF, burst: 'poison', burstSize: 0.8, sfx: 'splat', glare: 0.2 });
    impactFrame(h, tl, c0, { color: 0xC084FC, hold: 2, dim: [0.4, DIM], targets: h.targets.length ? [0] : [] });
    h.roll(-0.09, 8, true);
    h.sound('web', { rate: 0.8 });
    h.sound('chitter', { delay: 0.1, rate: 0.8 });
    h.camera(1.26, c0.x, c0.y, 10, true);
    h.knock(0, 8);
    signature(h, tl, BURST, c0, L_BROOD, 40);
    h.emit(c0.x, c0.y, { count: 20, colors: [0xA855F7, 0xF5D0FE, 0x14B8A6], speed: [1, 3.5], spread: Math.PI, gravity: 0.12, size: 2, life: [14, 26] });
  });
  drawSpan(h, tl, BURST, BURST + 50, (g, t) => {
    const r = 26 * easeOut(Math.min(1, t * 6));
    const a = 0.85 * (t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1);
    for (let k = 0; k < 10; k++) {
      const ang = (k / 10) * Math.PI * 2;
      g.moveTo(c0.x, c0.y).lineTo(c0.x + Math.cos(ang) * r, c0.y + Math.sin(ang) * r * 0.75).stroke({ width: 1, color: 0xF5F3FF, alpha: a });
    }
    for (const s of [0.35, 0.65, 0.95]) {
      const pts: number[] = [];
      for (let k = 0; k <= 10; k++) {
        const ang = (k / 10) * Math.PI * 2;
        const sag = k % 2 ? 0.9 : 1;
        pts.push(c0.x + Math.cos(ang) * r * s * sag, c0.y + Math.sin(ang) * r * s * 0.75 * sag);
      }
      g.poly(pts, false).stroke({ width: 1, color: 0xF5F3FF, alpha: a * 0.8 });
    }
  });
  // Spiderlings skitter along the floor to the next foes, eyes burning
  hits.slice(1).forEach((t, n) => {
    const k = n + 1;
    const from = BURST + 4 + n * 5;
    const dur = 10 + n * 2;
    drawSpan(h, tl, from, from + dur, (g, u, f) => {
      for (let s = 0; s < 4; s++) {
        const x = lerp(hits[0].x, t.x - 6, easeInOut(u)) + s * 5 - 7;
        const y = lerp(hits[0].y, t.y, u) - 2 - Math.abs(Math.sin(f + s)) * 3 - arc(u) * 12;
        crawler(g, x, y, 4, f * 1.2 + s, 0x3B0764, 0xF43F5E);
      }
    });
    lightSpan(h, tl, from, from + dur, (g, u) => {
      const x = lerp(hits[0].x, t.x - 6, easeInOut(u));
      const y = lerp(hits[0].y, t.y, u) - 4 - arc(u) * 12;
      glow(g, x, y, 10, 0xF43F5E, 0.5);
    });
    tl.at(from + dur, () => {
      land(h, h.targets.length ? k : undefined, { scale: 0.7, tint: 0xE9D5FF, sfx: 'chomp' });
      h.knock(k, 5, 2);
      h.sparks(chest(t).x, chest(t).y, 8, [0xA855F7, 0xF5D0FE, 0xF43F5E]);
    });
  });
  // A new sac swells on the chain
  tl.at(BURST + 26, () => {
    h.weaponShown(true);
    h.emit(h.weaponTip().x, h.weaponTip().y, { count: 8, colors: [0xA855F7, 0xF5D0FE], speed: [0.4, 1.2], spread: Math.PI, gravity: 0, size: 2, life: [12, 20] });
  });
  const end = BURST + 10 + hits.length * 7 + 16;
  tl.during(end - 16, end, (t) => h.dim(0.4 * (1 - t), DIM));
  tl.end(end);
}

/** Requiem Censer: swing the censer around his head; the souls in its incense drift out to haunt the foe. */
function requiemCenser(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const SOULS = [18, 23, 28, 33];
  const DIM = 0x06121C;
  raiseAndHold(h, tl, 0, 46);
  tl.at(2, () => {
    h.weaponShown(false);
    h.camera(1.12, (h.home.x + t0.x) / 2, h.home.y - 44, 50);
    h.sound('wail', { rate: 1.1, vol: 0.5 });
  });
  tl.during(0, 12, (t) => h.dim(0.55 * t, DIM));
  castCircle(h, tl, 0, 56, L_REQUIEM, { r: 36, flare: false });
  aura(h, tl, 2, 46, L_REQUIEM);
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
  motes(h, tl, 4, 30, L_REQUIEM, { at: head, reach: 50 });
  lightSpan(h, tl, 4, 46, (g, t, f) => glow(g, head().x, head().y, 14 + Math.sin(f * 0.5) * 2, 0x7DD3FC, 0.7));
  tl.every(4, 46, 2, () => {
    const p = head();
    h.emit(p.x, p.y, { count: 1, colors: [0xCBD5E1, 0x94A3B8, 0xE0F2FE], speed: [0.2, 0.5], angle: -Math.PI / 2, spread: 0.6, gravity: -0.03, size: 4, life: [24, 36] });
  });
  // Souls rise from the incense and spiral to the foe on trails of cold light
  SOULS.forEach((at, k) => {
    const last = k === SOULS.length - 1;
    const start = once(() => head());
    const soulAt = (t: number): P => {
      const s = start();
      return { x: lerp(s.x, c.x, easeIn(t)) + Math.sin(t * 9 + k) * 6 * (1 - t), y: lerp(s.y - 10, c.y, easeIn(t)) - arc(t) * (20 + k * 6) };
    };
    let st = 0;
    drawSpan(h, tl, at, at + 16, (g, t, f) => {
      st = t;
      const p = soulAt(t);
      flier(g, p.x, p.y, last ? 5 : 4, f * 0.6, 0xBAE6FD, 0x0EA5E9, 1);
    });
    weaponTrail(h, tl, at, at + 16, P_SOUL, last ? 8 : 5, 8, () => soulAt(st));
    tl.at(at, () => h.sound('wail', { rate: 1.5 + k * 0.1, vol: 0.25 }));
    tl.at(at + 16, () => {
      if (last) {
        land(h, 0, { tint: 0xBAE6FD, flash: 0xE0F2FE, burst: 'portal', burstSize: 0.9, sfx: 'frost', glare: 0.2 });
        impactFrame(h, tl, c, { color: 0x7DD3FC, hold: 2, dim: [0.55, DIM] });
        h.roll(-0.08, 8, true);
        h.camera(1.26, c.x, c.y, 10, true);
        h.knock(0, 10, 4);
      } else {
        h.flashTarget(0, 0xBAE6FD, 4);
        h.sound('frost', { vol: 0.4, rate: 1.5 });
        h.shake(2);
      }
      h.sparks(c.x, c.y, last ? 14 : 4, [0x7DD3FC, 0xE0F2FE]);
    });
  });
  shockSphere(h, tl, SOULS[3] + 16, c, 40, 0x7DD3FC, 14);
  signature(h, tl, SOULS[3] + 16, c, L_REQUIEM, 40);
  // The censer's mercy: a shaft of cold light falls on the knight
  lightSpan(h, tl, 36, 58, (g, t) => godRay(g, h.pos().x, 0, h.pos().y, 10 * (1 - t) + 4, 22 * (1 - t) + 6, 0x7DD3FC, Math.min(1, t * 5) * (1 - t)), 'back');
  tl.at(36, () => h.vfx('heal', h.pos().x, h.pos().y - 26, { size: 0.9, tint: 0xBAE6FD }));
  motesFx(h, tl, 34, 54, () => h.pos(), [0xBAE6FD, 0xE0F2FE, 0xFFFFFF], 3, 14);
  tl.at(46, () => h.weaponShown(true));
  tl.during(46, 58, (t) => h.dim(0.55 * (1 - t), DIM));
  tl.end(60);
}

/** Brimstone Comet: spin the slag head white-hot, loose it into the sky, and it falls burning on the back row. */
function brimstoneComet(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const REL = 30;
  const FALL = 40;
  const HIT = 56;
  const DIM = 0x1A0505;
  const heat = (f: number) => pal(f < 16 ? 0xB91C1C : f < 26 ? 0xEF4444 : 0xFDE68A, 0xFFFFFF, 0x450A0A);
  raiseAndHold(h, tl, 0, REL);
  tl.at(2, () => {
    h.weaponShown(false);
    h.camera(1.16, h.home.x + 24, h.home.y - 44, REL);
  });
  tl.during(0, 14, (t) => h.dim(0.5 * t, DIM));
  tl.at(10, () => h.sound('fire', { rate: 0.7, vol: 0.6 }));
  const head = whirl(h, tl, 2, REL, P_BRIM, {
    r: 6, link: 0xF97316, trail: FIRE,
    head: (g, x, y, f) => flailHead(g, x, y, 6, f * 0.5, heat(f)),
  });
  chargeUp(h, tl, 2, REL, LOOK.FIRE, { at: head, breath: 6, freeze: false, circle: 32, roll: -0.06, rollHold: 8 });
  // The slag heats from red to white: a swelling bloom on the whirling head
  lightSpan(h, tl, 4, REL, (g, t, f) => {
    const p = head();
    glow(g, p.x, p.y, 10 + 14 * t + Math.sin(f) * 1.5, mix(0xB91C1C, 0xFDE68A, t), 0.6 + 0.4 * t);
    g.ellipse(grip(h).x, grip(h).y - 4, 24, 9).stroke({ width: 3 + 4 * t, color: 0xF97316, alpha: 0.3 * t });
  });
  tl.every(10, REL, 4, () => h.shake(1.5));
  // Release up and out of frame
  tl.at(REL, () => {
    h.anim('ATTACK4');
    swingSound(h, true);
    h.sound('fire', { rate: 1.2 });
  });
  projectile(h, tl, REL, 8, () => head(), () => ({ x: t0.x - 40, y: -10 }), 0,
    (g, x, y) => {
      lance(g, x, y + 16, x, y, 6, P_BRIM, 0.8);
      flailHead(g, x, y, 6, 0, heat(30));
    }, () => undefined);
  // The sky answers: a warning ring under the back row, then the comet with its burning tail
  targetRing(h, tl, FALL - 8, HIT, t0.x, t0.y, 26, 0xEF4444);
  tl.at(FALL - 4, () => h.sound('whistle', { rate: 0.8 }));
  tl.at(FALL, () => h.camera(1.14, c.x - 20, c.y - 36, HIT - FALL));
  dutch(h, tl, FALL, 0.08, HIT - FALL, false);
  const cometAt = (t: number): P => ({ x: lerp(t0.x + 34, c.x, easeIn(t)), y: lerp(-10, c.y, easeIn(t)) });
  let ct = 0;
  drawSpan(h, tl, FALL, HIT + 1, (g, t, f) => {
    ct = t;
    const p = cometAt(t);
    flailHead(g, p.x, p.y, 8, f * 0.6, heat(30));
  });
  weaponTrail(h, tl, FALL, HIT + 1, P_BRIM, 20, 12, () => cometAt(ct));
  lightSpan(h, tl, FALL, HIT + 1, (g, t) => {
    const p = cometAt(t);
    glow(g, p.x, p.y, 22 + 10 * t, 0xF97316, 1);
  });
  speedLines(h, tl, HIT - 8, HIT, () => c, 0xFDE68A, { alpha: 0.4, inner: 40 });
  tl.every(FALL, HIT, 1, () => embers(h, cometAt(ct), 2));
  hitFx(h, tl, HIT, c, P_BRIM, 26, FIRE);
  ringFx(h, tl, HIT, { x: t0.x, y: t0.y }, 8, 140, 0xEF4444, 22, 4);
  shockSphere(h, tl, HIT, c, 70, 0xF97316, 18, 0xFDE68A);
  drawSpan(h, tl, HIT, HIT + 70, (g, t) => {
    scorch(g, t0.x, t0.y, 28, EMBER, 1 - t);
    groundCracks(g, t0.x, t0.y + 2, 56, 8, 11, P_LAVA, Math.min(1, t * 8), 1 - t);
  }, 'ground');
  tl.at(HIT, () => {
    land(h, 0, { scale: 1.3, tint: 0xFFB08A, flash: 0xFFE2B8, burst: 'explosion', burstSize: 1.4, glare: 0.2 });
    impactFrame(h, tl, c, { color: 0xF97316, dim: [0.5, DIM] });
    h.camera(1.3, c.x, c.y, 12, true);
    h.roll(-0.1, 8, true);
    h.knock(0, 10, 18);
    embers(h, c, 28);
    rubble(h, { x: t0.x, y: t0.y }, 14, [0x292524, 0x7C2D12, 0xF97316]);
  });
  signature(h, tl, HIT + 4, c, LOOK.FIRE, 48, 22);
  afterglow(h, tl, HIT + 4, HIT + 40, t0.x, t0.y - 4, FIRE, 22);
  tl.every(HIT + 2, HIT + 30, 4, () => smoke(h, { x: t0.x + rand(-14, 14), y: t0.y - 8 }, 2, [0x854D0E, 0xA16207, 0x57534E]));
  // The chain whips the head back
  tl.at(HIT + 8, () => h.sound('rattle', { rate: 1.4, vol: 0.4 }));
  drawSpan(h, tl, HIT + 8, HIT + 20, (g, t) => {
    const hand = grip(h, false);
    flail(g, hand, { x: lerp(c.x, hand.x + 12, easeIn(t)), y: lerp(c.y, hand.y + 6, easeIn(t)) - arc(t) * 26 }, 6, t * 5, heat(30), 0xF97316);
  });
  tl.at(HIT + 20, () => h.weaponShown(true));
  tl.during(HIT + 14, HIT + 32, (t) => h.dim(0.5 * (1 - t), DIM));
  tl.end(HIT + 34);
}

/** Permafrost Shatter: frost gathers on the bell, the slam freezes the floor and entombs every foe, then the ice bursts. */
function permafrostShatter(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const SLAM = 28;
  const BURST = 58;
  const DIM = 0x07142B;
  raiseAndHold(h, tl, 0, 20);
  tl.at(0, () => h.sound('frost'));
  tl.during(0, 14, (t) => h.dim(0.5 * t, DIM));
  windUp(h, tl, 2, 22, 0xBFDBFE, { zoom: 1.2 });
  chargeUp(h, tl, 2, 20, LOOK.FROST, { motes: false, breath: 5, circle: 36 });
  tl.every(2, 22, 3, () => h.emit(h.weaponTip().x, h.weaponTip().y, { count: 1, colors: [0xFFFFFF, 0xBFDBFE], speed: [0.2, 0.6], spread: Math.PI, gravity: 0.03, size: 2, life: [16, 24] }));
  tl.at(22, () => {
    h.anim('SKILL1');
    swingSound(h, true);
    h.roll(0.07, SLAM - 22 + 8, true);
  });
  const slamAt = once(() => ({ x: h.pos().x + 26, y: h.home.y }));
  tl.at(SLAM, () => {
    const b = slamAt();
    h.shake(9);
    h.hitStop(4);
    h.sound('stomp', { vol: 0.7 });
    h.sound('impact_metal', { vol: 0.5 });
    h.vfx('ice', b.x, b.y - 10, { size: 0.9, start: 66 });
    shards(h, { x: b.x, y: b.y - 6 }, 14);
    h.camera(1.04, (h.home.x + foes[foes.length - 1].x) / 2, h.home.y - 40, BURST - SLAM);
  });
  shockSphere(h, tl, SLAM, () => ({ x: slamAt().x, y: slamAt().y - 6 }), 40, 0xBFDBFE, 12);
  ringFx(h, tl, SLAM, () => slamAt(), 6, 240, 0xBFDBFE, 26, 3);
  // An ice sheet races across the floor, glinting
  const far = Math.max(...foes.map((t) => t.x)) + 40;
  lightSpan(h, tl, SLAM, BURST + 20, (g, t, f) => {
    const b = slamAt();
    const reach = easeOut(Math.min(1, f / 14));
    const fade = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
    const x1 = lerp(b.x, far, reach);
    g.ellipse((b.x + x1) / 2, b.y + 2, (x1 - b.x) / 2 + 10, 9).fill({ color: 0x93C5FD, alpha: 0.18 * fade });
    g.ellipse((b.x + x1) / 2, b.y + 1, (x1 - b.x) / 2, 3).fill({ color: 0xFFFFFF, alpha: 0.18 * fade });
    for (let k = 0; k < 6; k++) {
      const x = lerp(b.x, x1, hash(k * 3 + 1));
      if (Math.sin(f * 0.4 + k * 2) > 0.6) glint(g, x, b.y + (hash(k) - 0.5) * 6, 5, 0, 0xE0F2FE, fade);
    }
  }, 'ground');
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
    // Light caught inside the ice, brightening as the tomb strains to hold
    lightSpan(h, tl, enc, BURST, (g, u, f) => {
      glow(g, t.x, t.y - t.height * 0.4, t.height * 0.5 + 6 * u, 0x93C5FD, 0.3 + 0.5 * u);
      if (f % 6 === 0) glint(g, t.x + (hash(f + i) - 0.5) * 20, t.y - hash(f * 3) * t.height, 6, 0, 0xFFFFFF, 1);
    });
    tl.at(enc, () => {
      h.flashTarget(i, 0xBFDBFE, BURST - enc);
      h.sound('frost', { rate: 1.4 + i * 0.1, vol: 0.5 });
      h.sound('crack', { rate: 1.6, vol: 0.4 });
    });
    tl.every(enc + 6, BURST, 6, (n) => {
      h.knock(i, n % 2 ? 1.5 : -1.5);
      if (n > 1) h.sound('crack', { rate: 1.8 + n * 0.1, vol: 0.25 });
    });
    shockSphere(h, tl, BURST + i * 2, chest(t), 36, 0xBFDBFE, 14);
    tl.at(BURST + i * 2, () => {
      land(h, h.targets.length ? i : undefined, { scale: 0.95, tint: 0xE0F2FE, flash: 0xE0F2FE, burst: 'ice', burstSize: 1.1, glare: 0.2 });
      h.knock(i, 8, 6);
      shards(h, chest(t), 20);
    });
  });
  tl.at(BURST, () => {
    impactFrame(h, tl, { x: (foes[0].x + foes[foes.length - 1].x) / 2, y: h.home.y - 30 }, { color: 0x93C5FD, dim: [0.5, DIM] });
    h.roll(-0.1, 10, true);
    h.camera(1.18, (foes[0].x + foes[foes.length - 1].x) / 2, h.home.y - 30, 14, true);
  });
  tl.every(BURST + 4, BURST + 24, 3, () => h.emit(rand(foes[0].x - 30, far), h.home.y - 2, { count: 1, colors: [0xE0F2FE, 0xBFDBFE, 0xFFFFFF], speed: [0.2, 0.5], angle: -Math.PI / 2, spread: 0.6, gravity: -0.01, size: 3, life: [20, 32] }));
  signature(h, tl, BURST, { x: (foes[0].x + foes[foes.length - 1].x) / 2, y: h.home.y - 30 }, LOOK.FROST, 56, 24);
  tl.during(BURST + 8, BURST + 24, (t) => h.dim(0.5 * (1 - t), DIM));
  tl.end(BURST + 26);
}

/** Boulder Bowl: an underhand heave sends the rune-boulder rolling through the front foe and bounding into the next. */
function boulderBowl(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h).slice(0, 2);
  const REL = 14; // ATTACK2 sweep
  const R = 14;
  const SPEED = 9;
  const x0 = h.home.x + 34;
  const DIM = 0x120A06;
  tl.at(0, () => {
    h.anim('ATTACK2');
    h.stretch(1.08, 0.92);
    swingSound(h, true);
    h.camera(1.14, h.home.x + 40, h.home.y - 30, REL + 4);
    h.roll(-0.04, REL, false);
  });
  tl.during(0, 10, (t) => h.dim(0.35 * t, DIM));
  tl.at(REL - 2, () => h.stretch(1, 1));
  tl.at(REL, () => {
    h.weaponShown(false);
    h.roll(0.06, 14, true);
    h.sound('thud');
    h.sound('quake', { rate: 1.6, vol: 0.5 }); // the roll
    dust(h, { x: x0, y: h.home.y }, 8, -1);
    h.shake(5);
    h.camera(1.06, (x0 + foes[foes.length - 1].x) / 2, h.home.y - 30, 30);
  });
  const hit1 = REL + Math.round((foes[0].x - 14 - x0) / SPEED);
  const hit2 = foes[1] ? hit1 + 10 : hit1;
  const ballAt = (fr: number): P | null => {
    if (fr <= hit1) return { x: lerp(x0, foes[0].x - 14, (fr - REL) / Math.max(1, hit1 - REL)), y: h.home.y - R };
    if (foes[1] && fr <= hit2) {
      const u = (fr - hit1) / (hit2 - hit1);
      return { x: lerp(foes[0].x - 14, foes[1].x - 12, u), y: lerp(foes[0].y, foes[1].y, u) - R - arc(u) * 30 };
    }
    const last = foes[foes.length - 1];
    const u = (fr - hit2) / 22;
    if (u > 0.6) return null;
    return { x: lerp(last.x - 12, last.x + 80, u), y: last.y - R - arc(Math.min(1, u * 2)) * 10 };
  };
  // Rolling, then a bounce into the second foe, then off-stage; its war-runes blaze as it gathers speed
  drawSpan(h, tl, REL, hit2 + 22, (g, _t, f) => {
    const p = ballAt(REL + f);
    if (!p) return;
    const rot = (p.x - x0) / R;
    g.circle(p.x, p.y, R + 2).fill({ color: INK });
    g.circle(p.x, p.y, R).fill({ color: 0x78716C });
    g.circle(p.x - 3, p.y - 3, R * 0.5).fill({ color: 0xA8A29E });
    for (let k = 0; k < 3; k++) {
      const a = rot + (k * Math.PI * 2) / 3;
      g.moveTo(p.x + Math.cos(a) * R * 0.2, p.y + Math.sin(a) * R * 0.2).lineTo(p.x + Math.cos(a) * R * 0.9, p.y + Math.sin(a) * R * 0.9).stroke({ width: 2, color: 0xF97316 });
    }
  });
  lightSpan(h, tl, REL, hit2 + 14, (g, t, f) => {
    const p = ballAt(REL + f);
    if (!p) return;
    glow(g, p.x, p.y, R + 6, 0xF97316, 0.35 + 0.3 * Math.min(1, t * 2));
    // Motion streaks behind it
    for (let k = 0; k < 4; k++) g.rect(p.x - R - 8 - k * 7, p.y - R * 0.6 + k * 4, 10, 1.5).fill({ color: 0xFED7AA, alpha: 0.5 - k * 0.1 });
  });
  tl.every(REL, hit1, 2, () => {
    const p = ballAt(tl.frame);
    if (p) dust(h, { x: p.x - R, y: h.home.y }, 2, -1);
  });
  speedLines(h, tl, hit1 - 6, hit1, () => chest(foes[0]), 0xFED7AA, { alpha: 0.35 });
  hitFx(h, tl, hit1, chest(foes[0]), P_STONE, 20, [0xA8A29E, 0xD6D3D1, 0xF97316]);
  shockSphere(h, tl, hit1, chest(foes[0]), 50, 0xF97316, 14, 0xFED7AA);
  drawSpan(h, tl, hit1, hit1 + 44, (g, t) => groundCracks(g, foes[0].x, foes[0].y + 2, 40, 6, 5, P_STONE, Math.min(1, t * 6), 1 - t), 'ground');
  tl.at(hit1, () => {
    land(h, h.targets.length ? 0 : undefined, { scale: 1.15, tint: 0xD6D3D1, burst: 'crater', sfx: 'rock', glare: 0.2 });
    impactFrame(h, tl, chest(foes[0]), { color: 0xFDBA74, dim: [0.35, DIM] });
    h.roll(-0.1, 10, true);
    signature(h, tl, tl.frame, { x: foes[0].x, y: foes[0].y - 6 }, LOOK.EARTH, 42);
    h.knock(0, 20, 12);
    rubble(h, { x: foes[0].x, y: foes[0].y }, 14, [...DIRT, 0x78716C]);
    h.camera(1.22, foes[0].x, foes[0].y - 30, 14, true);
  });
  if (foes[1]) {
    hitFx(h, tl, hit2, chest(foes[1]), P_STONE, 16);
    shockSphere(h, tl, hit2, chest(foes[1]), 36, 0xF97316, 12);
    tl.at(hit2, () => {
      land(h, h.targets.length > 1 ? 1 : undefined, { scale: 0.95, tint: 0xD6D3D1, burst: 'crater', burstSize: 0.8, sfx: 'rock' });
      h.knock(1, 16, 10);
      rubble(h, { x: foes[1].x, y: foes[1].y }, 10, DIRT);
    });
  }
  tl.at(hit2 + 18, () => {
    h.weaponShown(true);
    h.anim('DEFENSE');
    dust(h, h.pos(), 6, 1);
  });
  tl.during(hit2 + 12, hit2 + 26, (t) => h.dim(0.35 * (1 - t), DIM));
  tl.end(hit2 + 28);
}

/** Abyssal Anchor: hurl the anchor on its tentacle chain, drag the foe into a whirlpool, then crush it under a phantom anchor. */
function abyssalAnchor(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const THROW = 26;
  const HOOK = 36;
  const YANK = 54;
  const CRUSH = 64;
  const DIM = 0x021614;
  raiseAndHold(h, tl, 0, THROW);
  tl.at(2, () => {
    h.weaponShown(false);
    h.camera(1.14, h.home.x + 40, h.home.y - 44, THROW);
  });
  tl.during(0, 16, (t) => h.dim(0.6 * t, DIM));
  tl.at(0, () => h.sound('wave', { rate: 0.8, vol: 0.5 }));
  tl.every(0, CRUSH + 20, 3, () => h.emit(rand(40, 400), rand(60, 170), { count: 1, colors: [0x99F6E4, 0x5EEAD4], speed: [0.2, 0.5], angle: -Math.PI / 2, spread: 0.2, gravity: -0.02, size: 1, life: [20, 40] }));
  const head = whirl(h, tl, 2, THROW, P_TIDE, {
    reach: 22, link: 0x0F766E,
    head: (g, x, y, f) => anchor(g, x, y, 0.8, f * 0.3, P_TIDE),
  });
  chargeUp(h, tl, 2, THROW, L_ABYSS, { at: head, breath: 6, freeze: false, circle: 34, roll: 0.06, rollHold: HOOK - THROW });
  lightSpan(h, tl, 6, THROW, (g, t) => glow(g, head().x, head().y, 12 + 8 * t, 0x14B8A6, 0.5 + 0.4 * t));
  tl.at(THROW, () => {
    h.anim('ATTACK4');
    swingSound(h, true);
    h.sound('squelch', { rate: 0.7 });
    h.camera(1.1, (h.home.x + c.x) / 2, c.y - 20, CRUSH - THROW);
  });
  // Anchor in flight, the tentacle chain stretching behind it
  const from = once(() => head());
  const anchorAt = (f: number): P => {
    const u = Math.min(1, f / (HOOK - THROW));
    const s = from();
    return { x: lerp(s.x, c.x, easeOut(u)), y: lerp(s.y, c.y, easeOut(u)) - arc(u) * 30 };
  };
  drawSpan(h, tl, THROW, YANK + 8, (g, _t, f) => {
    const hand = grip(h, false);
    const a = anchorAt(f);
    tentacle(g, hand.x, hand.y, a.x, a.y, 6, 18 * Math.sin(f * 0.2), 0x14B8A6, 0xCCFBF1);
    anchor(g, a.x, a.y, 0.9, Math.min(1, f / (HOOK - THROW)) * 4 + (f > HOOK - THROW ? Math.sin(f * 0.6) * 0.2 : 0), P_TIDE);
  });
  weaponTrail(h, tl, THROW, HOOK + 1, P_TIDE, 8, 8, () => anchorAt(tl.frame - THROW));
  // Whirlpool under the foe drags it down: a dark eye with bright spiral arms
  drawSpan(h, tl, HOOK, CRUSH + 24, (g, t, f) => {
    const grow = easeOut(Math.min(1, f / 8));
    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
    g.ellipse(t0.x, t0.y + 1, 38 * grow, 10 * grow).fill({ color: 0x021614, alpha: 0.85 * fade });
  }, 'ground');
  lightSpan(h, tl, HOOK, CRUSH + 24, (g, t, f) => {
    const grow = easeOut(Math.min(1, f / 8));
    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
    for (let arm = 0; arm < 3; arm++) {
      const pts: number[] = [];
      for (let k = 0; k <= 12; k++) {
        const u = k / 12;
        const a = f * 0.22 + arm * 2.1 + u * 4;
        const r = (6 + 34 * u) * grow;
        pts.push(t0.x + Math.cos(a) * r, t0.y + 1 + Math.sin(a) * r * 0.27);
      }
      g.poly(pts, false).stroke({ width: 2, color: arm % 2 ? 0x14B8A6 : 0x99F6E4, alpha: 0.8 * fade });
    }
    glow(g, t0.x, t0.y, 24 * grow, 0x14B8A6, 0.4 * fade);
  }, 'ground');
  tl.every(HOOK, YANK, 4, () => {
    h.knock(0, 0, -4);
    h.flashTarget(0, 0x5EEAD4, 3);
  });
  tl.at(HOOK, () => {
    h.shake(6);
    h.hitStop(3);
    h.sound('impact_metal', { rate: 0.7 }); // the anchor bites
    h.sound('gurgle');
    h.sparks(c.x, c.y, 10, [0x14B8A6, 0x99F6E4]);
    h.camera(1.2, c.x - 10, c.y - 10, 8, true);
  });
  shockSphere(h, tl, HOOK, c, 26, 0x14B8A6, 10);
  tl.at(YANK, () => {
    h.anim('ATTACK2');
    h.roll(-0.07, CRUSH - YANK, true);
    h.sound('lash', { rate: 0.7 });
    h.sound('whistle', { rate: 0.6, vol: 0.6 });
    h.knock(0, -18, 0);
    h.camera(1.16, c.x - 20, c.y - 40, CRUSH - YANK + 4);
  });
  // A colossal phantom anchor crashes down out of the dark
  targetRing(h, tl, YANK, CRUSH, t0.x, t0.y, 30, 0x5EEAD4);
  const dropY = (f: number) => lerp(-30, c.y - 18, f < CRUSH - YANK ? easeIn(f / (CRUSH - YANK)) : 1);
  lightSpan(h, tl, YANK, CRUSH + 1, (g, _t, f) => {
    const y = dropY(f);
    glow(g, t0.x, y, 40, 0x14B8A6, 0.6);
    for (let k = -2; k <= 2; k++) g.rect(t0.x + k * 10 - 0.5, y - 90, 1, 60).fill({ color: 0xCCFBF1, alpha: 0.35 });
  });
  drawSpan(h, tl, YANK, CRUSH + 14, (g, _t, f) => {
    const fade = f < CRUSH - YANK ? 0.95 : 1 - (f - (CRUSH - YANK)) / 14;
    anchor(g, t0.x, dropY(f), 2.6, Math.PI, P_TIDE, fade);
  });
  speedLines(h, tl, CRUSH - 6, CRUSH, () => c, 0xCCFBF1, { alpha: 0.4 });
  // The crash: a water column erupts through the foe
  lightSpan(h, tl, CRUSH, CRUSH + 22, (g, t) => {
    const up = easeOut(Math.min(1, t * 3));
    godRay(g, t0.x, t0.y - 120 * up, t0.y, 30 * (1 - t) + 4, 40 * (1 - t) + 6, 0x14B8A6, 1 - t);
  });
  shockSphere(h, tl, CRUSH, c, 64, 0x14B8A6, 18, 0xCCFBF1);
  drawSpan(h, tl, CRUSH, CRUSH + 44, (g, t) => groundCracks(g, t0.x, t0.y + 2, 50, 8, 17, P_TIDE, Math.min(1, t * 6), 1 - t), 'ground');
  tl.at(CRUSH, () => {
    land(h, 0, { scale: 1.35, tint: 0x99F6E4, flash: 0xCCFBF1, burst: 'quake', burstSize: 1.3, sfx: 'splash', glare: 0.2 });
    impactFrame(h, tl, c, { color: 0x2DD4BF, dim: [0.6, DIM] });
    h.roll(0.1, 10, true);
    h.camera(1.34, c.x, c.y, 12, true);
    h.knock(0, 6, -14);
    shards(h, c, 18);
    h.emit(t0.x, t0.y, { count: 34, colors: [0x14B8A6, 0x99F6E4, 0xFFFFFF], speed: [1.5, 5], angle: -Math.PI / 2, spread: 0.6, gravity: 0.18, size: 3, life: [16, 30] });
  });
  signature(h, tl, CRUSH, c, L_ABYSS, 50, 22);
  tl.at(CRUSH + 14, () => h.weaponShown(true));
  tl.during(CRUSH + 12, CRUSH + 28, (t) => h.dim(0.6 * (1 - t), DIM));
  tl.end(CRUSH + 30);
}

/** Kraken's Maelstrom: a water vortex spins up around the knight; tentacles burst from the floor and crush every foe. */
function krakensMaelstrom(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const SLAM = 34;
  const DIM = 0x021614;
  raiseAndHold(h, tl, 0, 28);
  tl.at(2, () => {
    h.camera(1.18, h.home.x + 10, h.home.y - 36, SLAM - 4);
    h.sound('wave', { rate: 0.8 });
    h.sound('spin', { rate: 0.6, delay: 0.2 });
  });
  tl.during(0, 16, (t) => h.dim(0.6 * t, DIM));
  chargeUp(h, tl, 2, 28, L_MAELSTROM, { breath: 6, freeze: false, circle: 44, aura: 1.1, roll: -0.07, rollHold: 10 });
  // The vortex: water ribbons tightening round him, glowing from within
  drawSpan(h, tl, 2, SLAM, (g, t, f) => {
    const p = h.pos();
    for (let k = 0; k < 4; k++) {
      const a = f * (0.3 + 0.2 * t) + (k * Math.PI) / 2;
      crescent(g, p.x, p.y - 26, 30 - t * 6 + k * 3, a, a + 1.5, 5 + 3 * t, P_TIDE, 0.85 * Math.min(1, t * 2));
    }
  });
  lightSpan(h, tl, 2, SLAM, (g, t) => {
    const p = h.pos();
    glow(g, p.x, p.y - 26, 34 + 10 * t, 0x14B8A6, 0.5 * t);
    g.ellipse(p.x, p.y, 34 * t, 8 * t).stroke({ width: 2, color: 0x99F6E4, alpha: 0.7 * t });
  });
  tl.every(4, SLAM, 2, () => h.emit(h.pos().x + rand(-30, 30), h.pos().y - rand(0, 50), { count: 1, colors: [0x99F6E4, 0xFFFFFF, 0x14B8A6], speed: [0.5, 1.5], spread: Math.PI, gravity: 0.08, size: 2, life: [10, 18] }));
  tl.at(28, () => h.anim('SKILL1'));
  tl.at(SLAM, () => {
    h.shake(10);
    h.hitStop(4);
    h.sound('stomp', { vol: 0.7 });
    h.sound('splash');
    h.vfx('shockwave', h.pos().x + 24, h.home.y - 8, { size: 1.1, tint: 0x5EEAD4 });
    h.camera(1.04, (h.home.x + foes[foes.length - 1].x) / 2 + 20, h.home.y - 46, 50);
  });
  shockSphere(h, tl, SLAM, () => ({ x: h.pos().x + 24, y: h.home.y - 10 }), 50, 0x14B8A6, 14);
  ringFx(h, tl, SLAM, () => ({ x: h.pos().x + 24, y: h.home.y }), 8, 260, 0x14B8A6, 28, 4);
  // A tentacle rises beside each foe, curls over and slams down
  const last = foes.length - 1;
  foes.forEach((t, i) => {
    const up = SLAM + 4 + i * 5;
    const slam = up + 12;
    drawSpan(h, tl, up, slam + 26, (g, _u, f) => {
      const rise = easeOut(Math.min(1, f / 8));
      const sink = f > slam - up + 14 ? (f - (slam - up + 14)) / 12 : 0;
      const k = Math.max(0, rise - sink);
      const base = { x: t.x + 22, y: t.y + 4 };
      const down = f >= slam - up ? 1 : easeIn(Math.max(0, (f - 8) / (slam - up - 8)));
      const tipX = lerp(base.x + 10, t.x - 2, down);
      const tipY = lerp(base.y - 64 * k, t.y - t.height * 0.6, down);
      g.ellipse(base.x, base.y, 14 * k, 4).fill({ color: 0x042F2E, alpha: 0.8 });
      tentacle(g, base.x, base.y, tipX, tipY, 12 * k, 14 * (1 - down), 0x14B8A6, 0xCCFBF1);
    });
    lightSpan(h, tl, up, up + 10, (g, u) => glow(g, t.x + 22, t.y, 20 * (1 - u) + 4, 0x5EEAD4, 1 - u), 'ground');
    tl.at(up, () => h.sound('squelch', { rate: 0.8 + i * 0.1 }));
    tl.at(slam - 2, () => h.sound('lash', { rate: 0.8 }));
    tl.at(up, () => h.emit(t.x + 22, t.y, { count: 12, colors: [0x14B8A6, 0x99F6E4, 0xFFFFFF], speed: [1, 3.5], angle: -Math.PI / 2, spread: 0.5, gravity: 0.15, size: 2, life: [12, 22] }));
    shockSphere(h, tl, slam, chest(t), 34, 0x14B8A6, 12);
    tl.at(slam, () => {
      land(h, h.targets.length ? i : undefined, { scale: i === last ? 1 : 0.85, tint: 0x99F6E4, burst: 'quake', burstSize: 0.9, glare: i === last ? 0.2 : 0.5 });
      if (i === last) {
        impactFrame(h, tl, chest(t), { color: 0x2DD4BF, dim: [0.6, DIM] });
        h.roll(0.09, 10, true);
        signature(h, tl, tl.frame, chest(t), L_MAELSTROM, 44);
        h.camera(1.2, (foes[0].x + t.x) / 2, h.home.y - 40, 12, true);
      }
      h.knock(i, -4, -8);
      h.emit(t.x, t.y, { count: 16, colors: [0x14B8A6, 0x99F6E4, 0xFFFFFF], speed: [1.5, 4], angle: -Math.PI / 2, spread: 1.1, gravity: 0.2, size: 2, life: [14, 24] });
    });
  });
  tl.during(SLAM + 40, SLAM + 56, (t) => h.dim(0.6 * (1 - t), DIM));
  tl.end(SLAM + 58);
}

/** Sunflare Pendulum: the golden head becomes a small sun overhead, then bursts into flares that rain on every foe. */
function sunflarePendulum(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const UP = 34;
  const BURST = 44;
  const DIM = 0x140C02;
  const sunAt = { x: h.home.x + 74, y: h.home.y - 110 };
  raiseAndHold(h, tl, 0, UP);
  tl.at(2, () => {
    h.weaponShown(false);
    h.camera(1.14, h.home.x + 40, h.home.y - 50, UP);
    h.sound('holy', { rate: 0.8, vol: 0.6 });
  });
  tl.during(0, 16, (t) => h.dim(0.6 * t, DIM));
  const head = whirl(h, tl, 2, UP, P_SUN, {
    reach: 22, link: 0xFBBF24, trail: [0xFDE68A, 0xFBBF24, 0xFFFFFF],
    head: (g, x, y, f) => sun(g, x, y, 4 + Math.min(6, f * 0.2), f, P_SUN),
  });
  chargeUp(h, tl, 2, UP, L_SUN, { at: head, breath: 6, freeze: false, circle: 36, roll: -0.06, rollHold: BURST - UP });
  lightSpan(h, tl, 4, UP, (g, t) => glow(g, head().x, head().y, 12 + 14 * t, 0xFBBF24, 0.5 + 0.5 * t));
  // The sun rises out of the whirl and swells, its light flooding the field
  tl.at(UP, () => {
    h.sound('fire', { rate: 0.8 });
    h.camera(1.02, 230, h.home.y - 70, BURST - UP + 30);
  });
  const rise = once(() => head());
  const sunPos = (t: number): P => ({ x: lerp(rise().x, sunAt.x, easeOut(t)), y: lerp(rise().y, sunAt.y, easeOut(t)) });
  drawSpan(h, tl, UP, BURST, (g, t, f) => {
    const p = sunPos(t);
    sun(g, p.x, p.y, 10 + 8 * t, f, P_SUN);
  });
  lightSpan(h, tl, UP, BURST + 16, (g, t, f) => {
    const tt = Math.min(1, (f) / (BURST - UP));
    const p = sunPos(tt);
    const blaze = f > BURST - UP ? 1 - (f - (BURST - UP)) / 16 : tt;
    glow(g, p.x, p.y, 34 + 40 * blaze, 0xFBBF24, 0.4 + 0.6 * blaze);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + f * 0.03;
      const len = (40 + 50 * blaze) * (0.7 + 0.3 * Math.sin(f * 0.4 + k));
      g.poly([p.x, p.y, p.x + Math.cos(a - 0.06) * len, p.y + Math.sin(a - 0.06) * len, p.x + Math.cos(a + 0.06) * len, p.y + Math.sin(a + 0.06) * len]).fill({ color: 0xFDE68A, alpha: 0.25 * blaze });
    }
  });
  tl.at(BURST, () => {
    h.flash(0.3, 0xFFF3C4);
    h.shake(7);
    h.hitStop(3);
    h.sound('explosion', { rate: 1.1, vol: 0.8 });
  });
  shockSphere(h, tl, BURST, sunAt, 60, 0xFBBF24, 14, 0xFFFBEB);
  // Flares lance down onto each foe
  foes.forEach((t, i) => {
    const at = BURST + 2 + i * 4;
    const c = chest(t);
    tl.at(at, () => h.sound('beam', { rate: 2.2, vol: 0.35 }));
    lightSpan(h, tl, at, at + 14, (g, u) => {
      const reach = Math.min(1, u * 4);
      const x = lerp(sunAt.x, c.x, reach);
      const y = lerp(sunAt.y, c.y, reach);
      lance(g, sunAt.x, sunAt.y, x, y, 10 * (1 - u * 0.6), P_SUN, 1 - u * 0.4);
      glow(g, x, y, 18 * (1 - u) + 6, 0xFBBF24, 1 - u);
    });
    drawSpan(h, tl, at + 3, at + 60, (g, u) => scorch(g, t.x, t.y, 18, 0xF59E0B, 1 - u), 'ground');
    tl.at(at + 3, () => {
      land(h, h.targets.length ? i : undefined, { scale: 0.9, tint: 0xFFE6A0, flash: 0xFFF7D6, burst: 'fire', burstSize: 0.9, glare: i === 0 ? 0.2 : 0.6 });
      if (i === 0) {
        impactFrame(h, tl, c, { color: 0xFBBF24, dim: [0.6, DIM] });
        h.roll(0.09, 10, true);
        signature(h, tl, tl.frame, c, L_SUN, 46);
      }
      h.knock(i, 6, 6);
    });
  });
  for (let k = 0; k < 5; k++) {
    const x = rand(180, 410);
    lightSpan(h, tl, BURST + 1 + k * 2, BURST + 10 + k * 2, (g, u) => lance(g, sunAt.x, sunAt.y, lerp(sunAt.x, x, Math.min(1, u * 3)), lerp(sunAt.y, h.home.y, Math.min(1, u * 3)), 4, P_SUN, 1 - u));
  }
  tl.at(BURST + 14, () => h.weaponShown(true));
  tl.during(BURST + 14, BURST + 30, (t) => h.dim(0.6 * (1 - t), DIM));
  tl.end(BURST + 32);
}

/** Wyrmchain Inferno: the chain wakes as a fire wyrm, coils overhead, then rips through the whole pack. */
function wyrmchainInferno(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const LUNGE = 30;
  const BACK = 54;
  const DIM = 0x1A0303;
  const far = Math.min(410, Math.max(...foes.map((t) => t.x)) + 40);
  const trail: P[] = [];
  raiseAndHold(h, tl, 0, LUNGE);
  tl.at(2, () => {
    h.weaponShown(false);
    h.camera(1.2, h.home.x + 10, h.home.y - 50, LUNGE - 2);
    h.sound('roar', { rate: 1.2, vol: 0.6 });
    h.sound('fire', { rate: 0.7, delay: 0.2 });
  });
  tl.during(0, 16, (t) => h.dim(0.6 * t, DIM));
  chargeUp(h, tl, 2, LUNGE, LOOK.FIRE, { at: () => wyrmHead(tl.frame), breath: 6, freeze: false, circle: 38, aura: 1.1, roll: 0.08, rollHold: 14 });
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
    trail.unshift(p);
    if (trail.length > 26) trail.length = 26;
    const pts = trail.filter((_, i) => i % 2 === 0);
    if (pts.length < 2) return;
    const dir: 1 | -1 = fr >= BACK || (trail[1] && trail[1].x > p.x) ? -1 : 1;
    chain(g, grip(h).x, grip(h).y, pts[pts.length - 1].x, pts[pts.length - 1].y, 0xF97316);
    serpent(g, pts, 6, P_WYRM, fr, dir);
  });
  // The wyrm burns: a bloom along its body
  lightSpan(h, tl, 4, BACK + 14, (g, t) => {
    for (let i = 0; i < trail.length; i += 4) glow(g, trail[i].x, trail[i].y, 16 - i * 0.4, 0xF97316, 0.5 * (1 - i / 30));
    if (trail[0]) glow(g, trail[0].x, trail[0].y, 22, 0xFDE047, 0.6 * (t > 0.9 ? (1 - t) / 0.1 : 1));
  });
  tl.every(4, BACK + 10, 2, () => embers(h, trail[0] ?? h.pos(), 2));
  tl.at(LUNGE, () => {
    h.anim('ATTACK4');
    h.sound('roar', { rate: 1.4, vol: 0.6 });
    h.sound('fire');
    h.sound('fire', { rate: 0.8, delay: 0.25 });
    h.camera(1.06, (h.home.x + far) / 2, h.home.y - 46, BACK - LUNGE + 12);
  });
  // Fire breath along the path, and the floor it passes over left burning
  tl.every(LUNGE, BACK, 3, () => {
    const p = trail[0];
    if (p) h.emit(p.x + 10, p.y, { count: 4, colors: FIRE, speed: [1.5, 3], angle: 0.4, spread: 0.4, gravity: 0.02, size: 3, life: [12, 20] });
  });
  lightSpan(h, tl, LUNGE + 4, BACK + 40, (g, t, f) => {
    const reach = Math.min(1, (f) / (BACK - LUNGE - 4));
    const x0 = h.home.x + 40;
    const fade = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
    for (let k = 0; k < 12; k++) {
      const x = lerp(x0, far, (k / 12) * reach);
      const hgt = (6 + 8 * hash(k + Math.floor(f / 3))) * fade;
      flameTongue(g, x, h.home.y + 2, hgt * 1.3, 4, k % 2 ? P_FLAMEWAKE : P_FLAMEWAKE_HOT, f, k, 0.75 * fade);
    }
  }, 'ground');
  const last = foes.length - 1;
  foes.forEach((t, i) => {
    const u = Math.min(1, Math.max(0, (t.x - (h.home.x + 24)) / (far - h.home.x - 24)));
    const at = LUNGE + Math.round(u * (BACK - LUNGE));
    hitFx(h, tl, at, chest(t), P_WYRM, 18, FIRE);
    shockSphere(h, tl, at, chest(t), 34, 0xF97316, 12);
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: i === last ? 1.05 : 0.9, tint: 0xFFB08A, burst: 'fire', glare: i === last ? 0.2 : 0.5 });
      if (i === last) {
        impactFrame(h, tl, chest(t), { color: 0xF97316, dim: [0.6, DIM] });
        h.roll(-0.1, 10, true);
        signature(h, tl, tl.frame, chest(t), LOOK.FIRE, 46);
      }
      h.knock(i, 12, 10);
    });
  });
  tl.at(BACK + 16, () => {
    h.weaponShown(true);
    h.idle();
  });
  tl.during(BACK + 8, BACK + 24, (t) => h.dim(0.6 * (1 - t), DIM));
  tl.end(BACK + 26);
}

/** Molten Meteor: the dragon bell heats to magma; he leaps and hammers it down as a meteor. */
function moltenMeteor(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const LEAP = 16;
  const HIT = 38;
  const DIM = 0x1A0303;
  tl.at(0, () => {
    h.anim('JUMP_FRONT_START');
    h.sound('fire', { rate: 0.6, vol: 0.6 });
  });
  windUp(h, tl, 0, LEAP, 0xF97316, { zoom: 1.24, reach: 36 });
  chargeUp(h, tl, 0, LEAP, LOOK.FIRE, { motes: false, circle: 36, aura: 1.1 });
  dutch(h, tl, LEAP, -0.06, HIT - 6 - LEAP, false);
  dutch(h, tl, HIT - 6, 0.09, 6);
  tl.during(0, LEAP, (t) => h.stretch(1 + 0.12 * t, 1 - 0.12 * t));
  tl.during(0, 14, (t) => h.dim(0.55 * t, DIM));
  tl.every(0, LEAP, 2, () => h.emit(h.weaponTip().x, h.weaponTip().y, { count: 2, colors: [0xF97316, 0xFDE047, BLOOD], speed: [0.2, 0.8], angle: Math.PI / 2, spread: 0.3, gravity: 0.15, size: 2, life: [10, 18] }));
  tl.at(LEAP, () => {
    h.stretch(0.88, 1.14);
    h.anim('JUMP_FRONT_UP');
    h.sound('jump');
    dust(h, h.pos(), 10, 1);
    h.camera(1.1, (h.home.x + c.x) / 2, c.y - 40, HIT - LEAP);
  });
  travel(h, tl, LEAP, HIT - 6, HOME, { x: (t0.x - 70 - h.home.x) * 0.6, y: 0 }, easeOut);
  tl.during(LEAP, 28, (t) => h.lift(easeOut(t) * 40));
  ghostTrail(h, tl, LEAP, HIT, 0xF97316, 2, 0.4);
  targetRing(h, tl, LEAP + 4, HIT, t0.x, t0.y, 26, 0xF97316);
  tl.at(HIT - 12, () => {
    h.stretch(1, 1);
    h.anim('ATTACK4');
    h.weaponShown(false);
    swingSound(h, true);
    h.sound('whistle', { rate: 1.1, delay: 0.1 });
  });
  // The molten head swells overhead, then is hammered down onto the foe
  const meteorAt = (t: number) => {
    const hand = grip(h);
    const fall = Math.max(0, (t - 0.5) / 0.5);
    return { x: lerp(hand.x + 2, c.x, easeIn(fall)), y: lerp(hand.y - 20, c.y, easeIn(fall)), r: 6 + 10 * Math.min(1, t * 2), fall };
  };
  let mt = 0;
  drawSpan(h, tl, HIT - 12, HIT + 1, (g, t, f) => {
    mt = t;
    const hand = grip(h);
    const m = meteorAt(t);
    chain(g, hand.x, hand.y, m.x, m.y, 0xF97316);
    flailHead(g, m.x, m.y, m.r, f * 0.4, P_LAVA, 10);
  });
  weaponTrail(h, tl, HIT - 6, HIT + 1, P_LAVA, 22, 8, () => meteorAt(mt));
  lightSpan(h, tl, HIT - 12, HIT + 1, (g, t) => {
    const m = meteorAt(t);
    glow(g, m.x, m.y, m.r * 2.4, 0xF97316, 1);
  });
  speedLines(h, tl, HIT - 6, HIT, () => c, 0xFDE68A, { alpha: 0.45, inner: 36 });
  travel(h, tl, HIT - 6, HIT, here(h), strikeSpot(h, t0, 54), easeIn);
  tl.during(HIT - 6, HIT, (t) => h.lift(lerp(40, 0, easeIn(t))));
  hitFx(h, tl, HIT, c, P_LAVA, 32, [0xFDE047, 0xF97316, BLOOD, 0xFFFFFF]);
  ringFx(h, tl, HIT, { x: t0.x, y: t0.y }, 10, 160, 0xF97316, 24, 5);
  shockSphere(h, tl, HIT, c, 80, 0xF97316, 18, 0xFDE047);
  drawSpan(h, tl, HIT, HIT + 70, (g, t) => {
    scorch(g, t0.x, t0.y, 30, EMBER, 1 - t);
    groundCracks(g, t0.x, t0.y + 2, 64, 9, 23, P_LAVA, Math.min(1, t * 8), 1 - t);
  }, 'ground');
  tl.at(HIT, () => {
    h.anim('LANDING_END');
    land(h, 0, { scale: 1.35, tint: 0xFFC48A, flash: 0xFFE2B8, burst: 'explosion', burstSize: 1.6, glare: 0.2 });
    impactFrame(h, tl, c, { color: 0xF97316, dim: [0.55, DIM] });
    h.roll(-0.11, 10, true);
    h.camera(1.36, c.x, c.y, 12, true);
    h.knock(0, 18, 8);
    rubble(h, { x: t0.x, y: t0.y - 6 }, 18, [0x292524, 0xF97316, 0xFDE047]);
    h.emit(t0.x, t0.y - 6, { count: 30, colors: [0xF97316, 0xFDE047, BLOOD, 0x431407], speed: [1.5, 5], angle: -Math.PI / 2, spread: 1, gravity: 0.22, size: 3, life: [16, 32] });
  });
  afterglow(h, tl, HIT + 4, HIT + 40, t0.x, t0.y - 4, FIRE, 24);
  signature(h, tl, HIT, c, L_MAGMA, 52, 24);
  tl.at(HIT + 12, () => h.weaponShown(true));
  tl.during(HIT + 14, HIT + 30, (t) => h.dim(0.55 * (1 - t), DIM));
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
  const IMPLODE = 72;
  const DIM = 0x05010C;
  raiseAndHold(h, tl, 0, THROW);
  tl.at(2, () => {
    h.weaponShown(false);
    h.camera(1.14, h.home.x + 30, h.home.y - 44, THROW);
  });
  tl.during(0, 16, (t) => h.dim(0.7 * t, DIM));
  const head = whirl(h, tl, 2, THROW, P_COSMOS, { r: 6, link: 0x7C3AED, trail: [0xC084FC, 0xFAF5FF, 0x7C3AED] });
  chargeUp(h, tl, 2, THROW, LOOK.VOID, { at: head, breath: 6, freeze: false, circle: 36, roll: 0.06, rollHold: OPEN - THROW });
  lightSpan(h, tl, 6, THROW, (g, t) => glow(g, head().x, head().y, 12 + 10 * t, 0xA855F7, 0.5 + 0.4 * t));
  tl.at(THROW, () => {
    h.anim('ATTACK4');
    swingSound(h, true);
    h.sound('toss', { rate: 0.7 });
    h.camera(1.12, cx, cy, IMPLODE - THROW + 10);
  });
  projectile(h, tl, THROW, OPEN - THROW, () => head(), () => ({ x: cx, y: cy }), 18,
    (g, x, y, t, f) => {
      chain(g, grip(h, false).x, grip(h, false).y, x, y, 0x7C3AED, 0, 1 - t);
      flailHead(g, x, y, 6, f * 0.5, P_COSMOS);
    }, () => h.shake(6));
  // The singularity: lensed light, a burning accretion disk, and space itself streaming in
  tl.at(OPEN, () => {
    h.sound('dark');
    h.sound('spin', { rate: 0.45 });
    h.hitStop(3);
  });
  tl.at(OPEN + 18, () => h.sound('spin', { rate: 0.5 }));
  const radius = (t: number, f: number) => (4 + 14 * easeOut(Math.min(1, f / 10)) + Math.sin(f * 0.5)) * (t > 0.85 ? 1 - (t - 0.85) / 0.15 * 0.8 : 1);
  lightSpan(h, tl, OPEN, IMPLODE, (g, t, f) => {
    const r = radius(t, f);
    glow(g, cx, cy, r * 4.5, 0x7C3AED, 0.6);
    g.ellipse(cx, cy, r * 3, r * 0.9).stroke({ width: r * 0.6, color: 0xC084FC, alpha: 0.35 });
    for (let k = 0; k < 12; k++) {
      const a = -f * 0.18 + (k / 12) * Math.PI * 2;
      const rr = r * (5 - ((f * 0.08 + k * 0.37) % 1) * 4);
      g.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.6).lineTo(cx + Math.cos(a + 0.3) * (rr - 8), cy + Math.sin(a + 0.3) * (rr - 8) * 0.6).stroke({ width: 1.5, color: 0xFAF5FF, alpha: 0.6 });
    }
  });
  drawSpan(h, tl, OPEN, IMPLODE, (g, t, f) => blackHole(g, cx, cy, radius(t, f), f, P_COSMOS));
  drawSpan(h, tl, OPEN + 6, IMPLODE, (g, t, f) => focusLines(g, cx, cy, Math.floor(f / 2), 0xC084FC, 0.25 * Math.min(1, t * 4), { inner: 50, n: 20, width: 2 }));
  chargeFx(h, tl, OPEN, IMPLODE, () => ({ x: cx, y: cy }), P_COSMOS, 110, 22);
  tl.every(OPEN + 2, IMPLODE - 4, 3, () => foes.forEach((t, i) => h.knock(i, Math.sign(cx - t.x) * 2.5, 1.5)));
  foes.forEach((t, i) => {
    const at = OPEN + 10 + i * 6;
    tl.at(at, () => land(h, h.targets.length ? i : undefined, { scale: 0.55, tint: 0xE9D5FF, spark: 0xC084FC, sfx: 'dark' }));
  });
  // Implosion: a beat of total silence-black, then the release
  tl.at(IMPLODE - 3, () => h.dim(0.95, 0x000000));
  hitFx(h, tl, IMPLODE, { x: cx, y: cy }, P_COSMOS, 36);
  ringFx(h, tl, IMPLODE, { x: cx, y: h.home.y }, 8, 220, 0xC084FC, 22, 4);
  shockSphere(h, tl, IMPLODE, { x: cx, y: cy }, 130, 0xA855F7, 22, 0xFAF5FF);
  tl.at(IMPLODE, () => {
    h.flash(0.25);
    h.hitStop(8);
    h.shake(14);
    impactFrame(h, tl, { x: cx, y: cy }, { color: 0xC084FC, dim: [0.7, DIM], hold: 4 });
    h.roll(-0.11, 12, true);
    h.sound('explosion', { rate: 0.7 });
    h.sound('impact_crit', { vol: 0.7 });
    h.vfx('summon', cx, cy, { anim: 'animation2', size: 1.5, tint: 0xC084FC });
    h.camera(1.22, cx, cy, 14, true);
    foes.forEach((t, i) => {
      h.knock(i, Math.sign(t.x - cx || 1) * 18, 14);
      h.flashTarget(i, 0xE9D5FF, 8);
    });
  });
  projectile(h, tl, IMPLODE + 4, 12, () => ({ x: cx, y: cy }), () => grip(h, false), 24,
    (g, x, y, t, f) => {
      chain(g, grip(h, false).x, grip(h, false).y, x, y, 0x7C3AED, 0, t);
      flailHead(g, x, y, 6, f * 0.5, P_COSMOS);
    }, () => {
      h.weaponShown(true);
      h.sound('equip', { rate: 0.7, vol: 0.5 }); // caught
    });
  signature(h, tl, IMPLODE, { x: cx, y: cy }, LOOK.VOID, 60, 24);
  tl.during(IMPLODE + 8, IMPLODE + 24, (t) => h.dim(0.7 * (1 - t), DIM));
  tl.end(IMPLODE + 26);
}

/** Gravity Well: rings of crushing gravity pin the foe, then the void head drops on it like a collapsing star. */
function gravityWell(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const DROP = 34;
  const HIT = 46;
  const DIM = 0x05010C;
  raiseAndHold(h, tl, 0, DROP - 4);
  chargeUp(h, tl, 2, DROP - 4, L_GRAVITY, { at: () => c, breath: 6, circle: 36, roll: 0.05, rollHold: HIT - DROP + 4 });
  tl.at(4, () => h.sound('dark', { rate: 0.9 }));
  tl.at(0, () => h.camera(1.14, (h.home.x + t0.x) / 2, h.home.y - 46, DROP));
  tl.during(0, 16, (t) => h.dim(0.65 * t, DIM));
  chargeFx(h, tl, 2, DROP, () => h.weaponTip(), P_GRAV, 30, 12);
  lightSpan(h, tl, 2, DROP, (g, t) => glow(g, h.weaponTip().x, h.weaponTip().y, 10 + 14 * t, 0x7C3AED, 0.5 + 0.5 * t));
  // Gravity rings sink onto the foe, pressing it down; the floor sags under it
  lightSpan(h, tl, 6, HIT + 2, (g, _t, f) => {
    for (let k = 0; k < 5; k++) {
      const u = ((f * 0.03 + k / 5) % 1);
      const y = lerp(c.y - 80, t0.y, easeIn(u));
      const r = lerp(34, 18, u);
      g.ellipse(t0.x, y, r, r * 0.28).stroke({ width: 2, color: k % 2 ? 0x7C3AED : 0xEDE9FE, alpha: 0.4 + 0.6 * u });
    }
    glow(g, t0.x, t0.y, 26, 0x7C3AED, 0.4);
  });
  tl.every(10, HIT, 4, () => {
    h.knock(0, 0, -3);
    h.flashTarget(0, 0xC4B5FD, 2);
  });
  tl.at(DROP - 4, () => {
    h.anim('ATTACK1');
    swingSound(h, true);
  });
  tl.at(DROP, () => {
    h.weaponShown(false);
    h.sound('whistle', { rate: 0.7 });
    h.camera(1.18, c.x, c.y - 40, HIT - DROP);
  });
  // The head plummets from above, warping the air around it
  const yAt = (t: number) => lerp(-10, c.y - 4, easeIn(t));
  drawSpan(h, tl, DROP, HIT + 1, (g, t, f) => {
    const y = yAt(t);
    const r = lerp(8, 18, t);
    for (let k = -2; k <= 2; k++) g.moveTo(t0.x + k * 9, y - 70).lineTo(t0.x + k * 9 * (1 - t * 0.5), y - 20).stroke({ width: 1, color: 0xEDE9FE, alpha: 0.5 });
    flailHead(g, t0.x, y, r, f * 0.3, P_GRAV, 10);
  });
  lightSpan(h, tl, DROP, HIT + 1, (g, t) => glow(g, t0.x, yAt(t), lerp(18, 40, t), 0x7C3AED, 1));
  speedLines(h, tl, HIT - 8, HIT, () => c, 0xEDE9FE, { alpha: 0.45 });
  hitFx(h, tl, HIT, c, P_GRAV, 32, [0x7C3AED, 0xEDE9FE, 0xFFFFFF]);
  ringFx(h, tl, HIT, { x: t0.x, y: t0.y }, 10, 150, 0x7C3AED, 22, 5);
  shockSphere(h, tl, HIT, c, 70, 0x7C3AED, 18, 0xEDE9FE);
  drawSpan(h, tl, HIT, HIT + 50, (g, t) => groundCracks(g, t0.x, t0.y + 2, 60, 9, 29, P_GRAV, Math.min(1, t * 8), 1 - t), 'ground');
  tl.at(HIT, () => {
    land(h, 0, { scale: 1.4, tint: 0xC4B5FD, flash: 0xEDE9FE, burst: 'quake', burstSize: 1.4, glare: 0.2 });
    impactFrame(h, tl, c, { color: 0xA78BFA, dim: [0.65, DIM] });
    h.roll(-0.11, 10, true);
    h.sound('stomp');
    h.camera(1.34, c.x, c.y, 12, true);
    h.knock(0, 0, -16);
    shards(h, c, 18);
    // Gravity inverts: rubble drifts upward
    h.emit(t0.x, t0.y, { count: 28, colors: [...DIRT, 0x7C3AED], speed: [0.4, 1.4], angle: -Math.PI / 2, spread: 1, gravity: -0.05, size: 3, life: [24, 40] });
  });
  signature(h, tl, HIT, c, L_GRAVITY, 54, 22);
  tl.at(HIT + 12, () => h.weaponShown(true));
  tl.during(HIT + 12, HIT + 28, (t) => h.dim(0.65 * (1 - t), DIM));
  tl.end(HIT + 30);
}

// =============================================================================================
// BELLS

/** Iron Toll: one perfect hip-drive swing; the bell rings on contact and the toll reverberates through the foe. */
function ironToll(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const HIT = 16;
  // Coil: a squat behind the bell, then the hip snaps through
  tl.at(0, () => {
    h.anim('JUMP_FRONT_START');
    h.camera(1.18, h.home.x + 40, h.home.y - 30, HIT);
  });
  tl.during(0, 5, (t) => h.stretch(1 + 0.1 * t, 1 - 0.1 * t));
  tl.at(5, () => {
    h.stretch(0.94, 1.06);
    h.anim('ATTACK1');
    swingSound(h, true);
  });
  tl.at(9, () => h.stretch(1, 1));
  travel(h, tl, 5, HIT - 2, HOME, strikeSpot(h, t0, 64), easeIn);
  dutch(h, tl, 5, 0.06, HIT - 5);
  ghostTrail(h, tl, 6, HIT, 0x9CA3AF, 2, 0.35);
  speedLines(h, tl, 6, HIT, () => c, 0xE5E7EB, { alpha: 0.35, inner: 50 });
  // The bell's arc: an iron ribbon with a gold rim chasing the head
  weaponTrail(h, tl, 6, HIT, P_TOLL, 9, 6);
  hitFx(h, tl, HIT, c, P_TOLL, 18);
  shockSphere(h, tl, HIT, c, 46, 0xE5E7EB, 14);
  tl.at(HIT, () => {
    land(h, 0, { tint: 0xE5E7EB, burst: 'crater', burstSize: 0.8, glare: 0.2 });
    impactFrame(h, tl, c, { hold: 2 });
    h.roll(-0.09, 10, true);
    h.sound('block', { rate: 0.5, vol: 1.1 }); // the bell's toll
    h.camera(1.3, c.x - 8, c.y, 10, true);
    h.knock(0, 14);
  });
  // The toll: rings of sound roll out of the foe, each echo a shudder
  lightSpan(h, tl, HIT + 2, HIT + 40, (g, t) => {
    for (let k = 0; k < 3; k++) {
      const u = (t * 1.5 - k * 0.22);
      if (u <= 0 || u >= 1) continue;
      const r = 10 + 90 * easeOut(u);
      g.circle(c.x - 1, c.y, r).stroke({ width: 3 * (1 - u) + 1, color: 0x9CA3AF, alpha: 0.7 * (1 - u) });
      g.circle(c.x + 1, c.y, r * 0.96).stroke({ width: 1, color: 0xFFFFFF, alpha: 0.8 * (1 - u) });
    }
  });
  [HIT + 10, HIT + 18, HIT + 26].forEach((at, k) => tl.at(at, () => {
    h.shake(5 - k * 1.5);
    h.sound('impact_metal', { rate: 0.5, vol: 0.5 - k * 0.12 }); // reverberation
    h.flashTarget(0, 0xE5E7EB, 2);
    h.knock(0, k % 2 ? 3 : -3);
    h.emit(c.x, t0.y - t0.height, { count: 3, colors: [0x78716C, 0xA8A29E], speed: [0.2, 0.6], angle: Math.PI / 2, spread: 0.6, gravity: 0.15, size: 2, life: [12, 20] });
  }));
  signature(h, tl, HIT, c, L_TOLL, 40);
  backstep(h, tl, HIT + 14, HIT + 30, 14);
  tl.end(HIT + 42);
}

/**
 * A glowing mushroom growing from (x, y) along `lean` (radians from straight up): a pale stem and a domed cap
 * with luminous spots. `grow` 0-1 is its height (overshoot it for a springy sprout); `squash` flattens the cap.
 */
function mushroom(g: Graphics, x: number, y: number, s: number, grow: number, lean: number, squash = 1, alpha = 1) {
  if (grow <= 0.02 || alpha <= 0) return;
  const len = s * 1.3 * grow;
  const tx = x + Math.sin(lean) * len;
  const ty = y - Math.cos(lean) * len;
  g.moveTo(x, y).quadraticCurveTo(x + Math.sin(lean) * len * 0.3, y - len * 0.6, tx, ty).stroke({ width: s * 0.5 + 2, color: INK, alpha });
  g.moveTo(x, y).quadraticCurveTo(x + Math.sin(lean) * len * 0.3, y - len * 0.6, tx, ty).stroke({ width: s * 0.5, color: 0xF5E9FF, alpha });
  const cw = s * grow * (1 + 0.15 * (1 - squash));
  const ch = s * 0.62 * grow * squash;
  // Bioluminescent glow under the cap, then a domed cap: dark rim, shadowed underside, lit crown, wet sheen
  if (fxReady()) stamp(g, 'bloom', tx, ty + ch * 0.4, cw * 3, ch * 3, { tint: 0x2DD4BF, alpha: 0.45 * alpha });
  g.ellipse(tx, ty, cw + 1.5, ch + 1.5).fill({ color: INK, alpha });
  g.ellipse(tx, ty, cw, ch).fill({ color: 0x6B21A8, alpha });
  g.ellipse(tx - cw * 0.08, ty - ch * 0.12, cw * 0.88, ch * 0.78).fill({ color: 0x9333EA, alpha });
  g.ellipse(tx - cw * 0.22, ty - ch * 0.3, cw * 0.58, ch * 0.48).fill({ color: 0xC084FC, alpha });
  g.ellipse(tx - cw * 0.35, ty - ch * 0.45, cw * 0.22, ch * 0.18).fill({ color: 0xF3E8FF, alpha });
  g.rect(tx - cw * 0.92, ty + ch * 0.1, cw * 1.84, Math.max(1, ch * 0.3)).fill({ color: 0x0F766E, alpha }); // gills in shadow
  g.rect(tx - cw * 0.7, ty + ch * 0.1, cw * 1.4, 1).fill({ color: 0x5EEAD4, alpha: 0.9 * alpha }); // lit gill edge
  for (let k = 0; k < 3; k++) {
    const sx = tx - cw * 0.5 + k * cw * 0.5;
    const sy = ty - ch * 0.35 + (k % 2) * ch * 0.25;
    g.circle(sx, sy, Math.max(0.8, s * 0.12)).fill({ color: 0x99F6E4, alpha });
    if (fxReady()) stamp(g, 'bloomHot', sx, sy, s * 0.8, s * 0.8, { tint: 0x99F6E4, alpha: 0.8 * alpha });
  }
}

/**
 * Spore Bloom: the mushroom bell puffs a glowing spore cloud onto the foe. The spores take root: mushrooms burst
 * out of its body and the ground around it, swell, and blow a second cloud through it, and the spores drifting
 * back off the bloom heal the knight before the crop wilts.
 */
function sporeBloom(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const PUFF = 12; // ATTACK2 sweep
  const HIT = PUFF + 18;
  const SPROUT = HIT + 4; // the first caps break through
  const BLOW = SPROUT + 22; // the bloom puffs
  const WILT = BLOW + 26;
  const DIM = 0x0C0616;
  const SPORES = [0xC084FC, 0x99F6E4, 0xF5D0FE, 0x5EEAD4];
  tl.at(0, () => {
    h.anim('ATTACK2');
    swingSound(h);
    h.camera(1.12, (h.home.x + c.x) / 2, c.y - 10, HIT);
  });
  tl.during(0, 10, (t) => h.dim(0.45 * t, DIM));
  lightSpan(h, tl, 0, PUFF, (g, t) => glow(g, h.weaponTip().x, h.weaponTip().y, 8 + 10 * t, 0xC084FC, 0.6));
  tl.at(PUFF, () => {
    h.sound('poison', { rate: 0.6, vol: 0.7 });
    h.emit(h.weaponTip().x, h.weaponTip().y, { count: 22, colors: SPORES, speed: [0.3, 1.6], spread: Math.PI, gravity: -0.01, size: 2, life: [24, 40] });
  });
  // A rolling cloud of bioluminescent spores
  const from = once(() => h.weaponTip());
  const cloudAt = (t: number): P => ({ x: lerp(from().x, c.x, easeInOut(t)), y: lerp(from().y, c.y, t) - arc(t) * 14 });
  lightSpan(h, tl, PUFF, HIT + 1, (g, t, f) => {
    const p = cloudAt(t);
    const s = 1 + t * 0.6;
    for (let k = 0; k < 7; k++) {
      const a = f * 0.15 + k * 0.9;
      glow(g, p.x + Math.cos(a) * 8 * s, p.y + Math.sin(a) * 5 * s, 7 * s, k % 2 ? 0xC084FC : 0x2DD4BF, 0.5);
    }
  });
  drawSpan(h, tl, PUFF, HIT + 1, (g, t, f) => {
    const p = cloudAt(t);
    for (let k = 0; k < 8; k++) {
      const a = f * 0.25 + k * 0.8;
      g.rect(p.x + Math.cos(a) * 10 - 1, p.y + Math.sin(a) * 7 - 1, 2, 2).fill({ color: k % 2 ? 0xF5D0FE : 0x99F6E4 });
    }
  });
  shockSphere(h, tl, HIT, c, 40, 0xC084FC, 14, 0x99F6E4);
  tl.at(HIT, () => {
    land(h, 0, { tint: 0xE9D5FF, burst: 'poison', burstSize: 0.9, sfx: 'splat', glare: 0.2 });
    impactFrame(h, tl, c, { color: 0xC084FC, hold: 2, dim: [0.45, DIM] });
    h.roll(-0.07, 10, true);
    signature(h, tl, HIT, c, L_SPORE, 40);
    h.camera(1.3, c.x, c.y - 6, BLOW - HIT, true);
    h.knock(0, 6);
    h.emit(c.x, c.y, { count: 20, colors: SPORES, speed: [0.6, 2.2], spread: Math.PI, gravity: -0.02, size: 2, life: [20, 34] });
  });

  // --- The spores take root ----------------------------------------------------------------------
  // Caps break out of the foe's body (top, shoulders, flanks) and a ring of them out of the ground round it
  const top = t0.y - t0.height;
  const S = 1.5 * Math.min(1.5, Math.max(1, t0.height / 40)); // the crop scales with the foe
  const w = Math.max(14, t0.height * 0.4); // half-width of the body to sprout across
  const body = [
    { x: t0.x - 2, y: top + t0.height * 0.12, s: 9 * S, lean: -0.1, at: 0 },
    { x: t0.x - w * 0.7, y: top + t0.height * 0.32, s: 7 * S, lean: -0.75, at: 3 },
    { x: t0.x + w * 0.55, y: top + t0.height * 0.26, s: 7.5 * S, lean: 0.65, at: 5 },
    { x: t0.x - w, y: top + t0.height * 0.62, s: 5 * S, lean: -1.25, at: 8 },
    { x: t0.x + w * 0.9, y: top + t0.height * 0.58, s: 5.5 * S, lean: 1.15, at: 10 },
    { x: t0.x + w * 0.15, y: top + t0.height * 0.18, s: 4.5 * S, lean: 0.3, at: 12 },
  ];
  const ground = [-34, -22, 22, 36, -9, 11].map((dx, k) => ({ x: t0.x + dx * S * 0.8, y: t0.y + 3 + (k % 2) * 2, s: (4 + (k % 3)) * S, lean: dx * 0.012, at: 4 + k * 2 }));
  const crop = [...body, ...ground];
  /** Springy sprout: overshoots then settles; pulses on the blow, then wilts. */
  const size = (m: { at: number }, f: number) => {
    const u = (f - m.at) / 7;
    if (u <= 0) return 0;
    const sprout = u < 1 ? 1 + 0.35 * Math.sin(u * Math.PI) * (1 - u) + (easeOut(u) - 1) : 1;
    const pulse = f >= BLOW - SPROUT - 4 && f < BLOW - SPROUT ? 1 + 0.25 * ((f - (BLOW - SPROUT - 4)) / 4) : f >= BLOW - SPROUT && f < BLOW - SPROUT + 4 ? 1.25 - 0.25 * ((f - BLOW + SPROUT) / 4) : 1;
    const wilt = f > WILT - SPROUT ? Math.max(0, 1 - (f - (WILT - SPROUT)) / 12) : 1;
    return Math.max(0, sprout) * pulse * wilt;
  };
  const squashAt = (m: { at: number }, f: number) => {
    const u = (f - m.at) / 7;
    return u > 0 && u < 1 ? 0.7 + 0.3 * u : f > WILT - SPROUT ? 0.6 + 0.4 * Math.max(0, 1 - (f - (WILT - SPROUT)) / 12) : 1;
  };
  const droop = (f: number) => (f > WILT - SPROUT ? Math.min(1, (f - (WILT - SPROUT)) / 12) * 0.9 : 0);
  drawSpan(h, tl, SPROUT, WILT + 14, (g, _t, f) => {
    for (const m of ground) mushroom(g, m.x, m.y, m.s, size(m, f), m.lean + Math.sign(m.lean || 1) * droop(f), squashAt(m, f));
  }, 'ground');
  drawSpan(h, tl, SPROUT, WILT + 14, (g, _t, f) => {
    for (const m of body) mushroom(g, m.x, m.y, m.s, size(m, f), m.lean + Math.sign(m.lean || 1) * droop(f) + Math.sin(f * 0.3 + m.at) * 0.06, squashAt(m, f));
  });
  const k = (m: { at: number }) => m.at % 2 === 0;
  // The crop glows, brightest as it swells to blow
  lightSpan(h, tl, SPROUT, WILT + 14, (g, _t, f) => {
    const swell = f >= BLOW - SPROUT - 6 && f < BLOW - SPROUT + 6 ? 1 - Math.abs(f - (BLOW - SPROUT)) / 6 : 0;
    for (const m of crop) {
      const s = size(m, f);
      if (s <= 0.05) continue;
      const len = m.s * 1.3 * s;
      glow(g, m.x + Math.sin(m.lean) * len, m.y - Math.cos(m.lean) * len, m.s * 1.2 * s + 4 * swell, k(m) ? 0xC084FC : 0x2DD4BF, 0.22 + 0.3 * swell, k(m) ? 0xF5D0FE : 0x99F6E4);
    }
  });
  crop.forEach((m) => {
    tl.at(SPROUT + m.at, () => {
      h.emit(m.x, m.y, { count: 4, colors: [0x5C2B14, 0xA855F7, 0x99F6E4], speed: [0.6, 1.8], angle: -Math.PI / 2 + m.lean, spread: 0.6, gravity: 0.12, size: 2, life: [10, 18] });
      if (body.includes(m)) h.flashTarget(0, 0xE9D5FF, 2);
    });
  });
  [0, 3, 5, 8, 10, 12].forEach((at, n) => tl.at(SPROUT + at, () => h.sound('squelch', { rate: 1.4 + n * 0.12, vol: 0.35 })));
  tl.every(SPROUT, BLOW, 3, () => h.knock(0, 0, -1.5));

  // --- The bloom blows ----------------------------------------------------------------------------
  tl.at(BLOW - 4, () => h.sound('charge', { rate: 2, vol: 0.3 }));
  tl.at(BLOW, () => {
    h.sound('poison', { rate: 0.8, vol: 0.8 });
    h.sound('splat', { rate: 1.3, vol: 0.5 });
    h.flashTarget(0, 0xC084FC, 6);
    h.shake(4);
    h.hitStop(2);
    h.knock(0, 4, 3);
    for (const m of crop) {
      const len = m.s * 1.3;
      h.emit(m.x + Math.sin(m.lean) * len, m.y - Math.cos(m.lean) * len, { count: 6, colors: SPORES, speed: [0.5, 1.8], angle: -Math.PI / 2 + m.lean, spread: 0.9, gravity: -0.015, size: 2, life: [22, 36] });
    }
    h.camera(1.1, (h.home.x + c.x) / 2, c.y - 16, WILT - BLOW + 10);
  });
  shockSphere(h, tl, BLOW, c, 56, 0x2DD4BF, 18, 0xF5D0FE);
  lightSpan(h, tl, BLOW, BLOW + 20, (g, t) => {
    for (let n = 0; n < 9; n++) {
      const a = (n / 9) * Math.PI * 2 + t;
      glow(g, c.x + Math.cos(a) * 30 * easeOut(t), c.y + Math.sin(a) * 20 * easeOut(t), 10 * (1 - t) + 3, n % 2 ? 0xC084FC : 0x2DD4BF, 0.6 * (1 - t));
    }
  });
  // Spores drift back off the bloom and heal the knight
  for (let n = 0; n < 7; n++) {
    const at = BLOW + 2 + n * 2;
    const start = { x: c.x + rand(-14, 14), y: c.y - rand(0, t0.height * 0.5) };
    projectile(h, tl, at, 16, () => start, () => ({ x: h.pos().x + rand(-8, 8), y: h.pos().y - 26 + rand(-8, 8) }), 16 + n * 3,
      (g, x, y) => {
        g.circle(x, y, 2.5).fill({ color: n % 2 ? 0x99F6E4 : 0xF5D0FE });
        g.circle(x, y, 1).fill({ color: 0xFFFFFF });
      },
      () => { if (n % 2 === 0) h.sound('heal', { rate: 1.4 + n * 0.05, vol: 0.2 }); },
      (x, y) => { if (Math.random() < 0.5) h.emit(x, y, { count: 1, colors: SPORES, speed: [0, 0.2], spread: Math.PI, gravity: -0.01, size: 1, life: [8, 14] }); });
  }
  tl.at(BLOW + 18, () => {
    h.vfx('heal', h.pos().x, h.pos().y - 26, { size: 0.9, tint: 0xD8B4FE });
    h.ghost(0x99F6E4, 0.45, 16);
  });
  lightSpan(h, tl, BLOW + 16, WILT + 10, (g, t) => godRay(g, h.pos().x, h.pos().y - 80, h.pos().y, 8, 26, 0x99F6E4, 0.4 * Math.min(1, t * 4) * (1 - t)), 'back');
  motesFx(h, tl, BLOW + 16, WILT + 6, () => h.pos(), [0x99F6E4, 0xF5D0FE, 0xFFFFFF], 3, 16);
  // The crop wilts and its last spores drift away
  tl.at(WILT, () => h.sound('hiss', { rate: 1.6, vol: 0.25 }));
  tl.every(WILT, WILT + 12, 3, () => h.emit(t0.x + rand(-20, 20), top + rand(0, t0.height), { count: 1, colors: SPORES, speed: [0.2, 0.5], angle: -Math.PI / 2, spread: 0.6, gravity: -0.02, size: 2, life: [20, 30] }));
  tl.during(WILT + 2, WILT + 16, (t) => h.dim(0.45 * (1 - t), DIM));
  tl.end(WILT + 16);
}

/**
 * Spectral storm-raptor. Two poses that read at pixel scale: `stoop` 0 is a heraldic spread-eagle (wings wide,
 * head in profile toward `dir`, `flap` -1..1 beating them, `talons` 0-1 swinging the feet forward to strike);
 * `stoop` 1 folds it into a swept-back dart pointing along `ang` (radians) for the dive.
 */
function stormRaptor(g: Graphics, x: number, y: number, s: number, flap: number, dir: 1 | -1, ang: number, talons: number, alpha = 1, stoop = 0) {
  if (alpha <= 0 || s <= 0.5) return;
  const ink = { width: 1.5, color: INK, alpha };
  if (stoop > 0.5) {
    const c = Math.cos(ang);
    const sn = Math.sin(ang);
    const T = (dx: number, dy: number) => [x + (dx * c - dy * sn) * s, y + (dx * sn + dy * c) * s];
    const P = (list: number[][]) => list.flatMap(([dx, dy]) => T(dx, dy));
    for (const side of [-1, 1]) {
      g.poly(P([[0.3, side * 0.12], [-0.4, side * 0.5], [-1.9, side * 0.75], [-1.1, side * 0.28], [-0.6, side * 0.1]])).fill({ color: side < 0 ? 0xB45309 : 0xF59E0B, alpha }).stroke(ink);
      g.poly(P([[0.1, side * 0.15], [-0.5, side * 0.42], [-1.5, side * 0.62], [-0.8, side * 0.25]])).fill({ color: 0xFDE68A, alpha: 0.8 * alpha });
    }
    g.poly(P([[1.5, 0], [0.9, -0.22], [-0.6, -0.16], [-1.5, -0.3], [-1.3, 0], [-1.5, 0.3], [-0.6, 0.16], [0.9, 0.22]])).fill({ color: 0xF59E0B, alpha }).stroke(ink);
    g.poly(P([[1.5, 0], [1.85, 0.12], [1.45, 0.16]])).fill({ color: 0xFFFBEB, alpha }).stroke({ width: 1, color: INK, alpha });
    const [ex, ey] = T(1.15, -0.06);
    g.rect(ex - 1, ey - 1, 2.5, 2).fill({ color: 0x7DD3FC, alpha });
    return;
  }
  const X = (dx: number) => x + dx * s;
  const Y = (dy: number) => y + dy * s;
  // Wings: leading edge to the wrist and tip, then a ragged trailing edge of primary feathers
  for (const side of [-1, 1]) {
    const wy = -0.75 - flap * 0.55;
    const ty = -0.45 - flap * 1.15;
    const pts = [X(0.25 * side), Y(-0.3), X(1.35 * side), Y(wy), X(2.7 * side), Y(ty)];
    for (let k = 1; k <= 6; k++) {
      const u = k / 6;
      const bx = lerp(2.7, 0.55, u) * side;
      const by = lerp(ty, 0.45 - flap * 0.15, u);
      pts.push(X(bx + 0.12 * side), Y(by + 0.42), X(bx - 0.08 * side), Y(by + 0.1));
    }
    g.poly(pts).fill({ color: 0xF59E0B, alpha }).stroke(ink);
    g.poly([X(0.25 * side), Y(-0.25), X(1.35 * side), Y(wy + 0.05), X(2.2 * side), Y(ty + 0.3), X(0.7 * side), Y(0.15)]).fill({ color: 0xFDE68A, alpha: 0.85 * alpha });
    for (let k = 0; k < 3; k++) g.moveTo(X((1.0 + k * 0.5) * side), Y(lerp(wy, ty, k / 3) + 0.25)).lineTo(X((1.2 + k * 0.5) * side), Y(lerp(wy, ty, k / 3) + 0.7)).stroke({ width: 1, color: 0x7DD3FC, alpha });
  }
  // Tail fan and body
  for (const tx of [-0.3, 0, 0.3]) g.poly([X(0), Y(0.6), X(tx - 0.16), Y(1.45), X(tx + 0.16), Y(1.45)]).fill({ color: tx ? 0xD97706 : 0xFDE68A, alpha }).stroke(ink);
  g.ellipse(X(0), Y(0.1), 0.45 * s, 0.78 * s).fill({ color: 0xD97706, alpha }).stroke(ink);
  g.ellipse(X(0), Y(0.2), 0.26 * s, 0.5 * s).fill({ color: 0xFEF3C7, alpha: 0.85 * alpha });
  // Feet: tucked, or thrown forward to rake
  for (const off of [-0.16, 0.16]) {
    const fx = off + dir * 0.55 * talons;
    const fy = 0.75 + 0.35 * talons;
    g.moveTo(X(off), Y(0.6)).lineTo(X(fx), Y(fy)).stroke({ width: 0.14 * s + 2, color: INK, alpha }).moveTo(X(off), Y(0.6)).lineTo(X(fx), Y(fy)).stroke({ width: 0.14 * s, color: 0xFDE68A, alpha });
    for (let k = -1; k <= 1; k++) g.poly([X(fx), Y(fy), X(fx + (dir * 0.2 + k * 0.12)), Y(fy + 0.22), X(fx + k * 0.05), Y(fy + 0.08)]).fill({ color: 0xFFFBEB, alpha }).stroke({ width: 1, color: INK, alpha });
  }
  // Head in profile with a hooked beak and storm-blue eye
  g.circle(X(0.08 * dir), Y(-0.78), 0.34 * s).fill({ color: 0xFDE68A, alpha }).stroke(ink);
  g.poly([X(0.32 * dir), Y(-0.9), X(0.72 * dir), Y(-0.72), X(0.62 * dir), Y(-0.5), X(0.35 * dir), Y(-0.62)]).fill({ color: 0xFFFBEB, alpha }).stroke({ width: 1, color: INK, alpha });
  g.rect(X(0.18 * dir) - 1.5, Y(-0.86) - 1, 3, 2).fill({ color: 0x0EA5E9, alpha });
}

/**
 * Talon Gale: the snatch flings the Sky-Raptor bell into the clouds on a gust; a storm-raptor of gold feathers
 * and lightning takes shape around it, screams, and dives through the pack, raking a foe with its talons on
 * every pass, banking back up between strikes. On the last rake it bursts into feathers and the bell spins
 * back down into the knight's hand.
 */
function talonGale(h: KnightMoveHost, tl: Timeline) {
  const hits = h.targets.length ? [...h.targets] : [h.target, h.target, h.target];
  const n = hits.length;
  const SNATCH = 12;
  const UP = 16; // the bell leaves his hands
  const FORM = 26; // the raptor takes shape round it
  const DIVE = 40; // the first dive begins
  const D = 10; // frames per dive
  const B = 6; // frames per bank back up
  const hitAt = (i: number) => DIVE + i * (D + B) + D;
  const LAST = hitAt(n - 1);
  const GONE = LAST + 14; // bursts into feathers
  const END = GONE + 18;
  const DIM = 0x0A0C18;
  const sky = { x: h.home.x + 70, y: h.home.y - 86 };
  const S = 17; // raptor scale

  // --- Coil: wind and feathers gather on the bell --------------------------------------------------
  tl.at(0, () => {
    h.anim('JUMP_FRONT_START');
    h.sound('screech', { rate: 0.7, vol: 0.35 });
    h.sound('whoosh', { rate: 0.6, vol: 0.5 });
  });
  tl.during(0, 10, (t) => h.dim(0.5 * t, DIM));
  tl.during(0, SNATCH, (t) => h.stretch(1 + 0.1 * t, 1 - 0.12 * t));
  windUp(h, tl, 0, SNATCH, 0xFCD34D, { zoom: 1.24, reach: 44 });
  chargeUp(h, tl, 0, SNATCH, L_TALON, { motes: false, circle: 34 });
  dutch(h, tl, DIVE, 0.08, LAST - DIVE, false);
  drawSpan(h, tl, 0, SNATCH + 2, (g, t, f) => {
    const p = h.weaponTip();
    for (let k = 0; k < 6; k++) {
      const a = f * 0.35 + k * 1.05;
      const r = 34 * (1 - t * 0.7);
      const x = p.x + Math.cos(a) * r;
      const y = p.y + Math.sin(a) * r * 0.6;
      g.poly([x, y, x + Math.cos(a + 1.8) * 6, y + Math.sin(a + 1.8) * 3, x + Math.cos(a + 1.4) * 3, y + Math.sin(a + 1.4) * 1.5 + 1.5]).fill({ color: k % 2 ? 0xFCD34D : 0xFFFBEB }).stroke({ width: 1, color: INK, alpha: 0.6 });
    }
  });

  // --- Snatch: the bell rockets into the sky on a gust ---------------------------------------------
  tl.at(SNATCH, () => {
    h.stretch(0.9, 1.12);
    h.anim('SKILL2TULUC');
    swingSound(h, true);
    h.sound('whoosh_heavy', { rate: 0.8 });
    dust(h, h.pos(), 10, 1);
    dust(h, h.pos(), 10, -1);
  });
  tl.at(SNATCH + 4, () => h.stretch(1, 1));
  tl.at(UP, () => {
    h.weaponShown(false);
    h.camera(1.06, sky.x + 20, h.home.y - 66, DIVE - UP + 6);
  });
  ringFx(h, tl, SNATCH, () => h.pos(), 6, 70, 0xFCD34D, 16, 2);
  const launch = once(() => h.weaponTip());
  const bellAt = (t: number): P => ({ x: lerp(launch().x, sky.x, easeOut(t)), y: lerp(launch().y, sky.y, easeOut(t)) });
  drawSpan(h, tl, UP, FORM + 1, (g, t, f) => kettlebell(g, bellAt(t).x, bellAt(t).y, 5, f * 0.6, 0xFCD34D));
  weaponTrail(h, tl, UP, FORM + 1, P_TALON, 10, 9, () => bellAt(Math.min(1, (tl.frame - UP) / (FORM - UP))));
  lightSpan(h, tl, UP, FORM + 1, (g, t) => {
    const p = bellAt(t);
    glow(g, p.x, p.y, 16, 0xFCD34D, 0.8);
    for (let k = 0; k < 3; k++) {
      const u = (t * 2 + k / 3) % 1;
      g.ellipse(launch().x, lerp(launch().y, p.y, u), 12 + 10 * u, 4 + 3 * u).stroke({ width: 1.5, color: 0xFFFBEB, alpha: 0.7 * (1 - u) });
    }
  });

  // --- The raptor takes shape round the bell -------------------------------------------------------
  tl.at(FORM, () => {
    h.sound('screech', { rate: 0.9, vol: 0.7 });
    h.sound('thunder', { rate: 1.2, vol: 0.4 });
    h.sound('flap', { rate: 0.7 });
    h.flash(0.2, 0xFFF7D6);
    h.shake(5);
    h.emit(sky.x, sky.y, { count: 30, colors: [0xFCD34D, 0xFFFBEB, 0xF59E0B, 0x7DD3FC], speed: [1, 3.5], spread: Math.PI, gravity: 0.02, size: 2, life: [20, 36] });
  });
  lightSpan(h, tl, FORM, FORM + 16, (g, t) => {
    godRay(g, sky.x, -40, sky.y + 10, 30 * (1 - t) + 6, 50 * (1 - t) + 8, 0xFCD34D, 1 - t);
    glint(g, sky.x, sky.y, 40 * (1 - t) + 8, t, 0xFFFBEB, 1 - t);
  });

  // The flight path: hover in the sky, then a dive onto each foe and a bank back up after it
  const bankTo = (i: number): P => ({ x: chest(hits[i]).x + 26, y: chest(hits[i]).y - 64 });
  const pathAt = (fr: number): { p: P; talons: number } => {
    if (fr < DIVE) {
      const u = Math.min(1, Math.max(0, (fr - FORM) / (DIVE - FORM)));
      return { p: { x: sky.x + Math.sin(fr * 0.15) * 4, y: sky.y - u * 6 + Math.sin(fr * 0.2) * 2 }, talons: 0 };
    }
    for (let i = 0; i < n; i++) {
      const d0 = DIVE + i * (D + B);
      const from = i === 0 ? { x: sky.x, y: sky.y - 6 } : bankTo(i - 1);
      const c = chest(hits[i]);
      if (fr <= d0 + D) {
        // Dive: a curving stoop, swinging wide before it drops on the foe
        const u = Math.max(0, (fr - d0) / D);
        const e = easeIn(u);
        const ctl = { x: (from.x + c.x) / 2 - 30, y: from.y - 10 };
        const x = (1 - e) * (1 - e) * from.x + 2 * (1 - e) * e * ctl.x + e * e * (c.x - 6);
        const y = (1 - e) * (1 - e) * from.y + 2 * (1 - e) * e * ctl.y + e * e * (c.y - 8);
        return { p: { x, y }, talons: Math.max(0, (u - 0.55) / 0.45) };
      }
      if (fr <= d0 + D + B || i === n - 1) {
        // Bank: sweep up and past, ready for the next stoop (the last one climbs away)
        const u = Math.min(1, (fr - d0 - D) / (i === n - 1 ? GONE - LAST : B));
        const to = i === n - 1 ? { x: c.x + 70, y: c.y - 110 } : bankTo(i);
        return { p: { x: lerp(c.x - 6, to.x, easeOut(u)), y: lerp(c.y - 8, to.y, easeOut(u)) }, talons: Math.max(0, 1 - u * 3) };
      }
    }
    return { p: sky, talons: 0 };
  };
  const tiltAt = (fr: number) => {
    const a = pathAt(fr).p;
    const b = pathAt(fr + 1).p;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return { dir: (dx < -0.5 ? -1 : 1) as 1 | -1, tilt: Math.max(-0.9, Math.min(1.1, Math.atan2(dy, Math.abs(dx) + 0.01))) * (Math.hypot(dx, dy) > 1 ? 1 : 0) };
  };
  const formA = (fr: number) => Math.min(1, (fr - FORM) / 8) * (fr > GONE - 4 ? Math.max(0, 1 - (fr - GONE + 4) / 4) : 1);
  drawSpan(h, tl, FORM, GONE + 1, (g, _t, f) => {
    const fr = FORM + f;
    const { p, talons } = pathAt(fr);
    const { dir, tilt } = tiltAt(fr);
    // Stoop (folded dart) on the way down, spread wings to rake and to climb back out
    const a = pathAt(fr + 1).p;
    const stoop = fr >= DIVE && talons < 0.15 && a.y > p.y + 0.5 ? 1 : 0;
    const flap = Math.sin(fr * 0.45) * (fr < FORM + 8 ? (fr - FORM) / 8 : 1);
    const grow = easeOut(Math.min(1, (fr - FORM) / 8));
    stormRaptor(g, p.x, p.y, S * (0.5 + 0.5 * grow), talons > 0 ? -0.8 : flap, dir, Math.atan2(a.y - p.y, a.x - p.x), talons, formA(fr), stoop);
    void tilt;
  });
  // Its storm-light: a bloom round the body and lightning crawling through the wings
  lightSpan(h, tl, FORM, GONE + 1, (g, _t, f) => {
    const fr = FORM + f;
    const { p } = pathAt(fr);
    const a = formA(fr);
    glow(g, p.x, p.y, S * 2.2, 0xF59E0B, 0.3 * a, 0xFCD34D);
    if (f % 4 < 2) skyBolt(g, p.x - S * 1.4, p.y - S * 0.9, p.x + S * 0.8, p.y + S * 0.2, f, P_BOLT_TALON, 1.2, 0.8 * a);
  });
  weaponTrail(h, tl, DIVE, GONE, pal(0xB45309, 0xFCD34D, 0x1C0A02), 9, 10, () => pathAt(tl.frame).p);
  tl.every(FORM + 4, GONE, 3, () => {
    const { p } = pathAt(tl.frame);
    h.emit(p.x - 6, p.y, { count: 1, colors: [0xFCD34D, 0xFFFBEB, 0xF59E0B], speed: [0.2, 0.6], angle: Math.PI / 2, spread: 1.2, gravity: 0.01, size: 2, life: [24, 40] });
  });
  tl.every(FORM + 8, DIVE, 9, (k) => h.sound('flap', { rate: 0.8 + k * 0.05, vol: 0.5 }));

  // --- The dives ----------------------------------------------------------------------------------
  tl.at(DIVE - 2, () => {
    h.sound('screech', { rate: 1.1, vol: 0.6 });
    h.camera(1.06, (sky.x + hits[0].x) / 2 + 20, h.home.y - 60, LAST - DIVE + 10);
  });
  hits.forEach((t, i) => {
    const at = hitAt(i);
    const c = chest(t);
    const last = i === n - 1;
    tl.at(at - D, () => h.sound('whoosh_fast', { rate: 0.8 + i * 0.1, vol: 0.7 }));
    speedLines(h, tl, at - 6, at, () => c, 0xFDE68A, { alpha: last ? 0.5 : 0.35 });
    // The rake: three gold talon gashes and a burst of feathers
    lightSpan(h, tl, at, at + 12, (g, u) => {
      for (let k = -1; k <= 1; k++) crescent(g, c.x + k * 6, c.y, 18 + k * 2, -2.3, 0.4, 7 * (1 - u), P_TALON, 1 - u);
      glow(g, c.x, c.y, 26 * (1 - u) + 6, 0xFCD34D, 1 - u);
    });
    drawSpan(h, tl, at, at + 10, (g) => clawRake(g, c.x, c.y, 1, 26, 0xFCD34D));
    shockSphere(h, tl, at, c, last ? 54 : 34, 0xFCD34D, 14, 0x7DD3FC);
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: last ? 1.15 : 0.8, tint: 0xFEF3C7, burst: 'slash', burstSize: last ? 1.1 : 0.8, sfx: 'claw', glare: last ? 0.2 : 0.5 });
      if (last) {
        impactFrame(h, tl, c, { color: 0xFCD34D, dim: [0.5, DIM] });
        h.roll(-0.1, 10, true);
        signature(h, tl, tl.frame, c, L_TALON, 46);
        h.camera(1.26, c.x, c.y - 10, 12, true);
        h.sound('screech', { rate: 1.3, vol: 0.7 });
        h.sound('zap', { vol: 0.5 });
      } else h.sound('flap', { rate: 1.3, vol: 0.5 });
      h.knock(i, 12, last ? 14 : 6);
      h.emit(c.x, c.y, { count: last ? 22 : 12, colors: [0xFCD34D, 0xFFFBEB, 0x92400E, 0x7DD3FC], speed: [0.8, 2.6], spread: Math.PI, gravity: 0.03, size: 2, life: [18, 32] });
    });
  });

  // --- The raptor bursts into feathers and the bell comes home ------------------------------------
  const burstAt = once(() => pathAt(GONE).p);
  tl.at(GONE, () => {
    const p = burstAt();
    h.sound('flap', { rate: 0.6, vol: 0.7 });
    h.emit(p.x, p.y, { count: 36, colors: [0xFCD34D, 0xFFFBEB, 0xF59E0B], speed: [0.6, 2.6], spread: Math.PI, gravity: 0.02, size: 2, life: [26, 44] });
    h.camera(1.04, (h.home.x + p.x) / 2, h.home.y - 50, END - GONE);
  });
  lightSpan(h, tl, GONE, GONE + 12, (g, t) => glint(g, burstAt().x, burstAt().y, 30 * (1 - t) + 4, t, 0xFFFBEB, 1 - t));
  projectile(h, tl, GONE, 14, () => burstAt(), () => h.weaponTip(), 30,
    (g, x, y, _t, f) => kettlebell(g, x, y, 5, f * 0.8, 0xFCD34D),
    () => {
      h.weaponShown(true);
      h.anim('DEFENSE');
      h.sound('equip', { rate: 0.8, vol: 0.6 }); // caught
      h.shake(2);
    },
    (x, y) => h.emit(x, y, { count: 1, colors: [0xFCD34D, 0xFFFBEB], speed: [0, 0.3], spread: Math.PI, gravity: 0.02, size: 2, life: [10, 16] }));
  tl.every(GONE, END, 3, () => h.emit(rand(150, 400), rand(20, 80), { count: 1, colors: [0xFCD34D, 0xFFFBEB], speed: [0.2, 0.5], angle: Math.PI / 2, spread: 1, gravity: 0.01, size: 2, life: [30, 50] }));
  tl.during(END - 14, END, (t) => h.dim(0.5 * (1 - t), DIM));
  tl.end(END);
}

/** Ironwood Grasp: the ironwood bell takes root; wooden claws burst up and seize the foe while bark armours the knight. */
function ironwoodGrasp(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const ROOT = 8; // SKILL1 chop
  const GRAB = 24;
  const DIM = 0x061206;
  tl.at(0, () => {
    h.anim('SKILL1');
    swingSound(h);
    h.camera(1.1, (h.home.x + t0.x) / 2, h.home.y - 36, GRAB + 10);
  });
  tl.during(0, 10, (t) => h.dim(0.45 * t, DIM));
  tl.at(ROOT, () => {
    h.sound('stomp', { vol: 0.6 });
    h.sound('crack', { vol: 0.6 });
    h.shake(6);
    h.hitStop(2);
    dust(h, { x: h.weaponTip().x, y: h.home.y }, 8, 1);
    h.emit(h.weaponTip().x, h.home.y - 4, { count: 10, colors: [0x4ADE80, 0x166534, 0xBEF264], speed: [0.6, 2.2], angle: -Math.PI / 2, spread: 1, gravity: 0.06, size: 2, life: [18, 28] });
  });
  // Roots race across the floor, their tips glowing with sap
  const x0 = h.home.x + 24;
  const rootTip = (k: number, reach: number): P => ({ x: lerp(x0, t0.x, reach), y: lerp(h.home.y, t0.y, reach) + k * 2 - 2 });
  drawSpan(h, tl, ROOT, GRAB + 34, (g, t, f) => {
    const reach = Math.min(1, f / (GRAB - ROOT));
    const fade = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
    for (let k = 0; k < 3; k++) {
      const n = 12;
      const path = () => {
        g.moveTo(x0, h.home.y + k * 2 - 2);
        for (let i = 1; i <= n * reach; i++) g.lineTo(lerp(x0, t0.x, i / n), lerp(h.home.y, t0.y, i / n) + Math.sin(i * 1.4 + k * 2) * 3 + k * 2 - 2);
      };
      path();
      g.stroke({ width: 6 - k, color: INK, alpha: fade });
      path();
      g.stroke({ width: 4 - k, color: k ? 0x4ADE80 : 0x5C2B14, alpha: fade });
    }
  }, 'ground');
  lightSpan(h, tl, ROOT, GRAB, (g, t) => {
    for (let k = 0; k < 3; k++) {
      const p = rootTip(k, t);
      glow(g, p.x, p.y, 10, 0x4ADE80, 0.8);
    }
  }, 'ground');
  // Ironwood claws seize the foe
  drawSpan(h, tl, GRAB - 4, GRAB + 30, (g, t, f) => {
    const up = easeOut(Math.min(1, f / 5)) * (t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1);
    const gripT = Math.min(1, Math.max(0, (f - 4) / 4));
    graspingHand(g, t0.x - 14, t0.y + 4, up, gripT, 0x8B5A2B, 0x3F2A14, 1.6);
    graspingHand(g, t0.x + 14, t0.y + 4, up, gripT, 0x8B5A2B, 0x3F2A14, 1.4);
    graspingHand(g, t0.x, t0.y + 6, up * 1.2, gripT, 0xA16207, 0x5C2B14, 1.8);
  });
  lightSpan(h, tl, GRAB - 4, GRAB + 20, (g, t) => glow(g, t0.x, t0.y - 10, 30 * (1 - t) + 10, 0x4ADE80, 0.6 * (1 - t)));
  drawSpan(h, tl, GRAB, GRAB + 44, (g, t) => groundCracks(g, t0.x, t0.y + 3, 44, 7, 31, P_WOOD, Math.min(1, t * 6), 1 - t), 'ground');
  tl.at(GRAB, () => {
    land(h, 0, { tint: 0xBBF7D0, burst: 'crater', burstSize: 0.9, sfx: 'wood', glare: 0.2 });
    impactFrame(h, tl, c, { color: 0x4ADE80, hold: 2, dim: [0.45, DIM] });
    h.roll(-0.08, 10, true);
    signature(h, tl, GRAB, c, L_IRONWOOD, 44);
    h.sound('squelch', { rate: 0.6 });
    h.camera(1.26, c.x, c.y, 10, true);
    h.knock(0, 0, -8);
    h.emit(t0.x, t0.y - 14, { count: 16, colors: [0x4ADE80, 0x166534, 0xBEF264], speed: [0.8, 2.8], spread: Math.PI, gravity: 0.06, size: 2, life: [18, 30] });
    rubble(h, { x: t0.x, y: t0.y }, 10, [0x5C2B14, 0x3F2A14, 0x8B5A2B]);
  });
  tl.every(GRAB + 4, GRAB + 20, 4, () => {
    h.knock(0, 0, -3);
    h.sound('wood', { rate: 1.4, vol: 0.3 });
  });
  // Bark plates and moss armour the knight
  tl.at(GRAB + 6, () => {
    h.anim('DEFENSE');
    h.sound('wood', { rate: 0.7 });
    h.camera(1.18, h.home.x + 10, h.home.y - 34, 26);
  });
  drawSpan(h, tl, GRAB + 6, GRAB + 38, (g, t, f) => {
    const p = h.pos();
    const up = easeOut(Math.min(1, f / 6)) * (t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1);
    for (let k = 0; k < 5; k++) spike(g, p.x - 24 + k * 12, p.y + 4, (12 + (k % 2) * 8) * up, 5, 0x3F2A14, 0x5C2B14, 0x4ADE80);
  });
  lightSpan(h, tl, GRAB + 6, GRAB + 38, (g, t) => glow(g, h.pos().x, h.pos().y - 20, 34, 0x4ADE80, 0.4 * (t > 0.7 ? 1 - (t - 0.7) / 0.3 : Math.min(1, t * 4))), 'back');
  motesFx(h, tl, GRAB + 8, GRAB + 30, () => h.pos(), [0x4ADE80, 0xBEF264], 3, 18);
  tl.at(GRAB + 10, () => h.guard(0x4ADE80));
  tl.during(GRAB + 26, GRAB + 40, (t) => h.dim(0.45 * (1 - t), DIM));
  tl.end(GRAB + 40);
}

/** Ley-Line Fault: raise the granite bell, slam it down, and a glowing ley fracture heaves the line up in slabs. */
function leyLineFault(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h).slice(0, 2);
  const SLAM = 22; // SKILL1 from 16
  const DIM = 0x05101A;
  raiseAndHold(h, tl, 0, 16);
  tl.at(0, () => h.sound('rune', { rate: 1.2 }));
  tl.during(0, 12, (t) => h.dim(0.55 * t, DIM));
  windUp(h, tl, 0, 16, 0x38BDF8, { zoom: 1.2 });
  chargeUp(h, tl, 0, 16, L_LEY, { motes: false, breath: 4, circle: 36 });
  dutch(h, tl, SLAM, 0.08, 12);
  drawSpan(h, tl, 2, SLAM, (g, t, f) => {
    const p = h.weaponTip();
    for (let k = 0; k < 4; k++) {
      const a = f * 0.2 + (k * Math.PI) / 2;
      g.rect(p.x + Math.cos(a) * 13 - 2, p.y + Math.sin(a) * 13 - 2, 4, 4).fill({ color: 0x38BDF8, alpha: 0.6 + 0.4 * t }).stroke({ width: 1, color: INK });
    }
  });
  tl.at(16, () => {
    h.anim('SKILL1');
    swingSound(h, true);
  });
  const end = Math.min(420, foes[foes.length - 1].x + 30);
  tl.at(SLAM, () => {
    h.shake(11);
    h.hitStop(4);
    h.sound('stomp');
    h.sound('impact_metal', { vol: 0.5, rate: 0.8 });
    rubble(h, { x: h.pos().x + 26, y: h.home.y }, 12, [0x57534E, 0x78716C, 0x38BDF8]);
    h.camera(1.04, (h.home.x + end) / 2, h.home.y - 40, 40);
  });
  shockSphere(h, tl, SLAM, () => ({ x: h.pos().x + 26, y: h.home.y - 6 }), 40, 0x38BDF8, 12);
  crackFx(h, tl, SLAM, { x: h.home.x + 28, y: h.home.y }, { x: end, y: h.home.y }, P_LEY, 12, 54);
  crackFx(h, tl, SLAM + 2, { x: h.home.x + 28, y: h.home.y + 2 }, { x: end - 20, y: h.home.y + 4 }, P_LEY, 14, 50);
  // The ley line itself: a seam of light running under the floor
  lightSpan(h, tl, SLAM, SLAM + 56, (g, t, f) => {
    const reach = Math.min(1, f / 12);
    const fade = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
    const x0 = h.home.x + 28;
    g.rect(x0, h.home.y - 3, (end - x0) * reach, 6).fill({ color: 0x38BDF8, alpha: 0.3 * fade });
    g.rect(x0, h.home.y - 1, (end - x0) * reach, 2).fill({ color: 0xFFFFFF, alpha: 0.7 * fade });
    glow(g, x0 + (end - x0) * reach, h.home.y, 20, 0x38BDF8, fade);
  }, 'ground');
  foes.forEach((t, i) => {
    const at = SLAM + 8 + i * 5;
    // Slabs heave up, light pouring out of the seams between them
    drawSpan(h, tl, at, at + 36, (g, u, f) => {
      const up = f < 4 ? easeOut(f / 4) : u > 0.65 ? 1 - (u - 0.65) / 0.35 : 1;
      for (let k = -1; k <= 1; k++) {
        const x = t.x + k * 15;
        const hgt = (k === 0 ? 46 : 30) * up;
        const lean = k * 5 * up;
        g.poly([x - 8, t.y + 6, x - 7 + lean, t.y + 6 - hgt, x + 7 + lean, t.y + 2 - hgt, x + 8, t.y + 6]).fill({ color: 0x57534E }).stroke({ width: 2, color: INK });
        g.poly([x - 8, t.y + 6, x - 7 + lean, t.y + 6 - hgt, x - 2 + lean, t.y + 4 - hgt, x - 3, t.y + 6]).fill({ color: 0x78716C, alpha: 0.8 });
        g.moveTo(x + lean * 0.5, t.y + 6).lineTo(x + lean, t.y + 4 - hgt).stroke({ width: 1.5, color: 0x38BDF8, alpha: 0.9 * up });
      }
    });
    lightSpan(h, tl, at, at + 30, (g, u) => {
      const a = u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85;
      godRay(g, t.x, t.y - 90, t.y + 4, 10 * a, 34 * a, 0x38BDF8, a);
    });
    shockSphere(h, tl, at, { x: t.x, y: t.y - 10 }, 44, 0x38BDF8, 14);
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: i ? 0.95 : 1.15, tint: 0xBAE6FD, flash: 0xE0F2FE, burst: 'quake', burstSize: 1.1, sfx: 'rock', glare: i ? 0.6 : 0.2 });
      if (i === 0) {
        impactFrame(h, tl, chest(t), { color: 0x38BDF8, dim: [0.55, DIM] });
        h.roll(-0.1, 10, true);
        signature(h, tl, SLAM, chest(t), L_LEY, 46);
      }
      h.knock(i, 4, 28);
      rubble(h, { x: t.x, y: t.y }, 14, [0x57534E, 0x78716C, 0x38BDF8]);
    });
  });
  tl.every(SLAM + 6, SLAM + 40, 3, () => h.emit(rand(h.home.x + 40, end), h.home.y - 2, { count: 1, colors: [0x38BDF8, 0xE0F2FE], speed: [0.3, 0.8], angle: -Math.PI / 2, spread: 0.3, gravity: -0.03, size: 2, life: [16, 26] }));
  tl.during(SLAM + 24, SLAM + 40, (t) => h.dim(0.55 * (1 - t), DIM));
  tl.end(SLAM + 44);
}

/** All-Seeing Gaze: a vast golden eye opens above the bell, finds its prey, and sears it with its stare. */
function allSeeingGaze(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const OPEN = 26;
  const GAZE = 38;
  const DIM = 0x0A0314;
  const eyeAt = { x: h.home.x + 40, y: h.home.y - 100 };
  raiseAndHold(h, tl, 0, GAZE + 14);
  chargeUp(h, tl, 2, OPEN, L_GAZE, { at: () => eyeAt, breath: 6, freeze: false, circle: 36 });
  dutch(h, tl, GAZE - 6, -0.08, 14, false);
  tl.at(0, () => {
    h.camera(1.16, eyeAt.x + 10, eyeAt.y + 30, GAZE - 4);
    h.sound('dark', { rate: 1.1 });
  });
  tl.during(0, 16, (t) => h.dim(0.75 * t, DIM));
  // A tether of light from the bell to where the eye will open
  lightSpan(h, tl, 4, OPEN, (g, t) => {
    const p = h.weaponTip();
    g.moveTo(p.x, p.y).lineTo(eyeAt.x, eyeAt.y).stroke({ width: 1 + 3 * t, color: 0xFBBF24, alpha: 0.3 + 0.5 * t });
    glow(g, eyeAt.x, eyeAt.y, 10 + 30 * t, 0x9333EA, 0.4 + 0.4 * t);
  });
  // Tendrils frame the eye as it opens
  const openAt = (f: number) => {
    const opening = easeOut(Math.min(1, Math.max(0, (f - 6) / (OPEN - 10))));
    const closing = f > GAZE + 14 ? Math.min(1, (f - (GAZE + 14)) / 8) : 0;
    return Math.max(0, opening - closing);
  };
  drawSpan(h, tl, 4, GAZE + 30, (g, _t, f) => {
    const open = openAt(f);
    for (let k = 0; k < 7; k++) {
      const a = Math.PI * 0.9 + (k / 6) * Math.PI * 1.2;
      tentacle(g, eyeAt.x + Math.cos(a) * 20, eyeAt.y + Math.sin(a) * 9, eyeAt.x + Math.cos(a) * (40 + 5 * Math.sin(f * 0.2 + k)), eyeAt.y + Math.sin(a) * 26 + 8, 3.5, 8 * Math.sin(f * 0.15 + k), 0x581C87, 0xE9D5FF, false);
    }
    const look = f < OPEN ? 0 : Math.min(1, (f - OPEN) / 8);
    eye(g, eyeAt.x, eyeAt.y, 22, open, look, P_GAZE);
  });
  lightSpan(h, tl, OPEN, GAZE + 30, (g, _t, f) => glow(g, eyeAt.x + 6, eyeAt.y, 30 * openAt(f), 0xFBBF24, 0.6 * openAt(f)), 'back');
  tl.every(6, GAZE, 3, () => h.emit(eyeAt.x + rand(-34, 34), eyeAt.y + rand(-10, 22), { count: 1, colors: [0x9333EA, 0xFBBF24, 0xE9D5FF], speed: [0.2, 0.6], spread: Math.PI, gravity: 0, size: 2, life: [16, 26] }));
  tl.at(OPEN, () => {
    h.shake(5);
    h.hitStop(3);
    h.sound('squelch', { rate: 0.5 }); // the eye opens
    h.sound('holy', { rate: 0.6, vol: 0.5 });
  });
  // The eye finds its prey: the camera swings to the foe and the air ripples
  tl.at(OPEN + 6, () => h.camera(1.06, (eyeAt.x + c.x) / 2, (eyeAt.y + c.y) / 2 + 10, 24));
  drawSpan(h, tl, OPEN + 6, GAZE, (g, _t, f) => focusLines(g, c.x, c.y, Math.floor(f / 2), 0xFBBF24, 0.3, { inner: 40, n: 18, width: 2 }));
  tl.at(GAZE, () => h.sound('beam', { rate: 1.1 }));
  // The gaze: a searing golden beam
  lightSpan(h, tl, GAZE, GAZE + 18, (g, t, f) => {
    const w = (t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85 * 0.6) * 14 + Math.sin(f * 1.5) * 1.5;
    lance(g, eyeAt.x + 8, eyeAt.y, c.x, c.y, w * 1.8, pal(0x9333EA, 0xFBBF24, 0x2E1065), 0.4);
    glow(g, c.x, c.y, 26 + w, 0xFBBF24, 0.8);
  });
  drawSpan(h, tl, GAZE, GAZE + 18, (g, t, f) => {
    const w = (t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85 * 0.6) * 12 + Math.sin(f * 1.5) * 1.5;
    beam(g, eyeAt.x + 8, eyeAt.y, c.x, c.y, w, [0xFBBF24, 0xFFFBEB, 0xFFFFFF]);
  });
  tl.every(GAZE, GAZE + 18, 2, () => embers(h, { x: c.x + rand(-6, 6), y: c.y }, 2, [0xFBBF24, 0xFFFBEB]));
  shockSphere(h, tl, GAZE + 3, c, 54, 0xFBBF24, 16, 0xFFFBEB);
  drawSpan(h, tl, GAZE + 3, GAZE + 60, (g, u) => scorch(g, t0.x, t0.y, 26, 0xFBBF24, 1 - u), 'ground');
  tl.at(GAZE + 3, () => {
    land(h, 0, { scale: 1.35, tint: 0xFFE680, flash: 0xFFF7D6, burst: 'fire', burstSize: 1.2, sfx: 'fire_burst', glare: 0.2 });
    impactFrame(h, tl, c, { color: 0xFBBF24, dim: [0.75, DIM] });
    h.roll(0.1, 10, true);
    signature(h, tl, GAZE, c, L_GAZE, 50);
    h.camera(1.3, c.x, c.y, 12, true);
    h.knock(0, 14, 4);
    shards(h, c, 18);
  });
  tl.at(GAZE + 8, () => h.flashTarget(0, 0xFFE680, 12));
  tl.during(GAZE + 20, GAZE + 36, (t) => h.dim(0.75 * (1 - t), DIM));
  tl.end(GAZE + 38);
}

/** Writhing Dark: a rift tears open at his feet and tentacles of the deep lash every foe. */
function writhingDark(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const OPEN = 18;
  const DIM = 0x0A0218;
  const rift = { x: h.home.x + 50, y: h.home.y + 2 };
  tl.at(0, () => {
    h.anim('SKILL3TULUC');
    h.camera(1.2, rift.x - 10, h.home.y - 30, OPEN);
    h.sound('dark');
    h.sound('crack', { rate: 0.8, vol: 0.5 });
  });
  tl.during(0, 14, (t) => h.dim(0.7 * t, DIM));
  // The rift: torn floor, an abyss with an eye in it, lit violet from below
  drawSpan(h, tl, 4, OPEN + 62, (g, t, f) => {
    const r = 34 * easeOut(Math.min(1, f / 10)) * (t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1);
    g.ellipse(rift.x, rift.y, r, r * 0.3).fill({ color: 0x000000 }).stroke({ width: 2, color: 0x9333EA });
    g.ellipse(rift.x, rift.y, r * 0.8, r * 0.22).stroke({ width: 1, color: 0xE9D5FF, alpha: 0.5 });
    if (r > 10) eye(g, rift.x + Math.sin(f * 0.1) * 6, rift.y, 6, 0.5 + 0.5 * Math.abs(Math.sin(f * 0.08)), 0.5, P_GAZE);
  }, 'ground');
  lightSpan(h, tl, 4, OPEN + 62, (g, t, f) => {
    const r = 34 * easeOut(Math.min(1, f / 10)) * (t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1);
    godRay(g, rift.x, rift.y - 70, rift.y, r * 0.8, r * 1.4, 0x9333EA, 0.45);
    groundCracks(g, rift.x, rift.y, r * 2, 6, 37, P_ELDRITCH, 1, 0.8);
  }, 'ground');
  dutch(h, tl, OPEN - 2, 0.07, 30, false);
  tl.at(OPEN - 2, () => h.camera(1.04, (rift.x + foes[foes.length - 1].x) / 2, h.home.y - 44, 60));
  tl.every(4, OPEN + 50, 3, () => h.emit(rift.x + rand(-26, 26), rift.y - 2, { count: 1, colors: [0x9333EA, 0xE9D5FF, 0x581C87], speed: [0.3, 0.9], angle: -Math.PI / 2, spread: 0.3, gravity: -0.03, size: 2, life: [18, 28] }));
  const last = foes.length - 1;
  foes.forEach((t, i) => {
    const from = OPEN + i * 6;
    const lash = from + 10;
    const c = chest(t);
    const tipAt = (f: number): P => {
      const reach = f < lash - from ? easeOut(f / (lash - from)) : f > lash - from + 12 ? 1 - (f - (lash - from + 12)) / 10 : 1;
      return { x: lerp(rift.x, c.x, reach), y: lerp(rift.y - 10, c.y, reach) - arc(reach) * 44 };
    };
    drawSpan(h, tl, from, lash + 22, (g, _u, f) => {
      const p = tipAt(f);
      tentacle(g, rift.x - 10 + i * 10, rift.y, p.x, p.y, 11, 20 * Math.sin(f * 0.25 + i), 0x7E22CE, 0xF0ABFC);
    });
    lightSpan(h, tl, from, lash + 2, (g, _u, f) => glow(g, tipAt(f).x, tipAt(f).y, 12, 0xC084FC, 0.6));
    tl.at(from, () => h.sound('squelch', { rate: 0.7 + i * 0.1 }));
    shockSphere(h, tl, lash, c, 32, 0x9333EA, 12);
    tl.at(lash, () => {
      land(h, h.targets.length ? i : undefined, { scale: i === last ? 1 : 0.85, tint: 0xE9D5FF, spark: 0x9333EA, burst: 'portal', burstSize: 0.8, sfx: 'lash', glare: i === last ? 0.2 : 0.5 });
      if (i === last) {
        impactFrame(h, tl, c, { color: 0xA855F7, dim: [0.7, DIM] });
        h.roll(-0.1, 10, true);
        signature(h, tl, tl.frame, c, L_WRITHE, 46);
        h.camera(1.16, (foes[0].x + t.x) / 2, h.home.y - 40, 12, true);
      }
      h.knock(i, 12, 8);
    });
  });
  tl.during(OPEN + 46, OPEN + 62, (t) => h.dim(0.7 * (1 - t), DIM));
  tl.end(OPEN + 64);
}

/** Excalibur's Decree: press the bell to lockout; golden shockwaves roll out and holy blades fall on every foe. */
function excaliburDecree(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const LOCK = 17; // SKILL2TULUC from 6 raises at 17
  const DIM = 0x140C02;
  tl.at(0, () => {
    h.anim('JUMP_FRONT_START');
    h.camera(1.24, h.home.x + 10, h.home.y - 40, LOCK);
  });
  tl.during(0, 6, (t) => h.stretch(1 + 0.08 * t, 1 - 0.1 * t));
  tl.at(6, () => {
    h.stretch(1, 1);
    h.anim('SKILL2TULUC');
    h.sound('holy', { rate: 0.8 });
  });
  tl.during(6, LOCK, (t) => h.lift(easeOut(t) * 8));
  tl.during(LOCK + 24, LOCK + 34, (t) => h.lift(lerp(8, 0, t)));
  tl.during(0, 14, (t) => h.dim(0.6 * t, DIM));
  chargeUp(h, tl, 0, LOCK, L_DECREE, { breath: 5, freeze: false, circle: 38, aura: 1.1, roll: -0.06, rollHold: 12 });
  chargeFx(h, tl, 6, LOCK, () => h.weaponTip(), P_DECREE, 28, 10);
  // God-rays behind him
  lightSpan(h, tl, LOCK - 2, LOCK + 44, (g, t) => {
    const p = h.pos();
    for (let k = -2; k <= 2; k++) godRay(g, p.x + k * 16, 0, p.y, 6, 12, HOLY_GOLD, 0.5 * (1 - t));
  }, 'back');
  tl.at(LOCK, () => {
    h.flash(0.3, 0xFFF3C4);
    h.shake(8);
    h.hitStop(4);
    h.sound('impact_crit', { vol: 0.6 });
    h.sound('holy');
    h.camera(1.02, 240, h.home.y - 50, 40);
  });
  lightSpan(h, tl, LOCK, LOCK + 24, (g, t) => {
    const p = h.weaponTip();
    for (let k = 0; k < 3; k++) {
      const r = (t * 1.4 - k * 0.2) * 130;
      if (r > 0) g.circle(p.x, p.y, r).stroke({ width: 3 * (1 - t) + 1, color: k % 2 ? 0xFFFBEA : 0xF4B41A, alpha: 1 - t });
    }
    glint(g, p.x, p.y, 30 * (1 - t) + 6, 0, HOLY_WHITE, 1 - t);
  });
  // Holy blades fall and strike
  const last = foes.length - 1;
  foes.forEach((t, i) => {
    const at = LOCK + 8 + i * 5;
    const c = chest(t);
    tl.at(at - 7, () => h.sound('whistle', { rate: 2, vol: 0.35 }));
    const tipAt = (f: number) => lerp(-10, t.y + 4, f < 7 ? easeIn(f / 7) : 1);
    lightSpan(h, tl, at - 7, at + 1, (g, _u, f) => godRay(g, t.x, 0, tipAt(f), 6, 12, HOLY_GOLD, 0.6));
    drawSpan(h, tl, at - 7, at + 22, (g, _u, f) => {
      const fade = f <= 17 ? 1 : 1 - (f - 17) / 12;
      holyBlade(g, t.x, tipAt(f), 64, fade);
    });
    lightSpan(h, tl, at, at + 18, (g, u) => {
      godRay(g, t.x, 20, t.y, 24 * (1 - u) * 0.6, 24 * (1 - u) + 2, 0xFFF3C4, 1 - u);
      glint(g, c.x, c.y, 26 * (1 - u) + 4, 0.3, HOLY_WHITE, 1 - u);
    });
    ringFx(h, tl, at, { x: t.x, y: t.y }, 6, 60, HOLY_PALE, 18, 3);
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: i === last ? 1.05 : 0.9, tint: 0xFFF1B8, flash: 0xFFF7D6, burst: 'crater', burstSize: 0.9, sfx: 'stab', glare: 0.3 });
      if (i === last) {
        impactFrame(h, tl, c, { color: HOLY_GOLD, dim: [0.6, DIM] });
        h.roll(0.09, 10, true);
        signature(h, tl, tl.frame, c, L_DECREE, 50);
      }
      h.knock(i, 4, -6);
      holySparks(h, t.x, t.y - 6, 14);
    });
  });
  tl.during(LOCK + 30, LOCK + 44, (t) => h.dim(0.6 * (1 - t), DIM));
  tl.end(LOCK + 46);
}

/** Dragon's Breath: a wyrm's head flares around the bell, and the drive looses a cone of dragonfire over the pack. */
function dragonsBreath(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const DRIVE = 30; // ATTACK3 from 16 thrusts at 30
  const BREATH = 44;
  const DIM = 0x1A0303;
  tl.at(0, () => {
    h.anim('JUMP_FRONT_START');
    h.sound('growl', { rate: 0.7, vol: 0.7 });
  });
  windUp(h, tl, 0, DRIVE, 0xEF4444, { zoom: 1.2, reach: 40 });
  chargeUp(h, tl, 0, DRIVE, L_DRAGON, { motes: false, breath: 6, freeze: false, circle: 38, aura: 1.15, roll: 0.08, rollHold: 14 });
  tl.during(0, 14, (t) => h.dim(0.6 * t, DIM));
  drawSpan(h, tl, 6, DRIVE + BREATH, (g, t, f) => {
    const p = h.weaponTip();
    const a = easeOut(Math.min(1, f / 10)) * (t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1);
    beastHead(g, p.x + 6, p.y, 15, 'dragon', 1, P_WYRM, 0.9 * a, f > DRIVE - 6 ? 1 : 0.2);
  });
  tl.at(16, () => {
    h.anim('ATTACK3');
    swingSound(h, true);
  });
  tl.at(DRIVE, () => {
    h.camera(1.04, 250, h.home.y - 30, BREATH);
    h.shake(7);
    h.hitStop(3);
    h.sound('roar', { rate: 0.9 });
    h.sound('fire');
    h.sound('fire', { rate: 0.85, delay: 0.3 });
  });
  const breathLen = (t: number) => 280 * easeOut(Math.min(1, t * 2.5)) * (t > 0.8 ? 1 - (t - 0.8) / 0.2 * 0.6 : 1);
  drawSpan(h, tl, DRIVE, DRIVE + BREATH, (g, t, f) => {
    const p = h.weaponTip();
    cone(g, p.x + 14, p.y, 0.06, breathLen(t), 0.16, f, [BLOOD, EMBER, 0xFBBF24, 0xFFFBEA], 0.75 * (t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1));
  });
  // The fire lights the whole field
  lightSpan(h, tl, DRIVE, DRIVE + BREATH, (g, t, f) => {
    const p = h.weaponTip();
    const a = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
    cone(g, p.x + 14, p.y, 0.06, breathLen(t) * 1.05, 0.22, f + 3, [0xF97316, 0xFDE047], 0.35 * a);
    glow(g, p.x + 20, p.y, 30, 0xFDE047, a);
  });
  tl.every(DRIVE, DRIVE + BREATH - 8, 2, () => {
    const p = h.weaponTip();
    h.emit(p.x + 30, p.y, { count: 3, colors: FIRE, speed: [3, 6], angle: 0.08, spread: 0.2, gravity: -0.02, size: 3, life: [16, 26] });
  });
  foes.forEach((t, i) => {
    const at = DRIVE + 2 + Math.round((t.x - h.home.x) / 40);
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: 0.9, tint: 0xFFB08A, burst: 'fire', burstSize: 1.1, glare: i === 0 ? 0.2 : 0.5 });
      if (i === 0) {
        impactFrame(h, tl, chest(t), { color: 0xF97316, dim: [0.6, DIM] });
        h.roll(-0.08, 10, true);
        signature(h, tl, tl.frame, chest(t), L_DRAGON, 44);
      }
      h.knock(i, 12, 2);
    });
    tl.every(at, DRIVE + BREATH, 6, () => h.flashTarget(i, 0xFFB08A, 3));
    drawSpan(h, tl, at, DRIVE + BREATH + 40, (g, u) => scorch(g, t.x, t.y, 22, EMBER, 1 - u), 'ground');
  });
  tl.every(DRIVE + BREATH - 10, DRIVE + BREATH + 8, 3, () => smoke(h, { x: rand(200, 400), y: h.home.y - rand(10, 40) }, 2));
  tl.during(DRIVE + BREATH - 6, DRIVE + BREATH + 10, (t) => h.dim(0.6 * (1 - t), DIM));
  tl.end(DRIVE + BREATH + 12);
}

/** Wyrmheart Drive: the bell's molten heart beats three times, then a leaping thrust erupts into a roaring dragon of flame. */
function wyrmheartDrive(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const LEAP = 18;
  const HIT = 34; // ATTACK1 from 22 sweeps at 34
  const DIM = 0x1A0303;
  tl.at(0, () => {
    h.anim('JUMP_FRONT_START');
    h.camera(1.26, h.home.x + 16, h.home.y - 30, LEAP);
  });
  tl.during(0, 14, (t) => h.dim(0.6 * t, DIM));
  chargeUp(h, tl, 0, LEAP, LOOK.FIRE, { breath: 5, freeze: false, circle: 36, aura: 1.15 });
  dutch(h, tl, LEAP, 0.07, HIT - LEAP, false);
  // Three heartbeats: each a throb of magma light from the bell
  [2, 8, 14].forEach((at, k) => {
    lightSpan(h, tl, at, at + 7, (g, t) => {
      const p = h.weaponTip();
      g.circle(p.x, p.y, 6 + 16 * t + k * 4).stroke({ width: 3 * (1 - t), color: 0xF97316, alpha: 1 - t });
      glow(g, p.x, p.y, 14 + k * 6, 0xF97316, 1 - t * 0.6);
    });
    drawSpan(h, tl, at, at + 6, (g, t) => orb(g, h.weaponTip().x, h.weaponTip().y, 4 + 3 * (1 - t), P_LAVA));
    tl.at(at, () => {
      h.shake(2 + k * 2);
      h.dim(0.6 + k * 0.08, DIM);
      h.sound('thud', { rate: 0.6, vol: 0.5 + k * 0.2 }); // heartbeat
    });
  });
  tl.during(0, LEAP, (t) => h.stretch(1 + 0.1 * t, 1 - 0.12 * t));
  tl.at(LEAP, () => {
    h.stretch(0.9, 1.12);
    h.anim('JUMP_FRONT_UP');
    h.sound('jump');
    h.sound('fire', { rate: 0.9 });
    h.dim(0.6, DIM);
    h.camera(1.14, (h.home.x + c.x) / 2, c.y - 24, HIT - LEAP);
  });
  travel(h, tl, LEAP, HIT, HOME, strikeSpot(h, t0, 48), easeIn, 30);
  ghostTrail(h, tl, LEAP, HIT, 0xF97316, 2, 0.5);
  speedLines(h, tl, LEAP + 4, HIT, () => c, 0xFDBA74, { alpha: 0.35 });
  weaponTrail(h, tl, LEAP, HIT, P_LAVA, 10, 8);
  tl.at(HIT - 12, () => {
    h.stretch(1, 1);
    h.anim('ATTACK1');
    swingSound(h, true, { delay: 0.1 });
  });
  hitFx(h, tl, HIT, c, P_LAVA, 28, [0xFDE047, 0xF97316, BLOOD, 0xFFFFFF]);
  shockSphere(h, tl, HIT, c, 70, 0xF97316, 18, 0xFDE047);
  // A dragon of flame erupts from the impact and roars
  drawSpan(h, tl, HIT, HIT + 26, (g, t, f) => {
    const s = 10 + 20 * easeOut(Math.min(1, t * 3));
    beastHead(g, c.x + 8, c.y - 12 - t * 14, s, 'dragon', 1, P_WYRM, 1 - t, 0.6 + 0.4 * Math.sin(f * 0.6));
  });
  lightSpan(h, tl, HIT, HIT + 26, (g, t) => glow(g, c.x + 14, c.y - 14 - t * 14, 40 * (1 - t) + 10, 0xF97316, 1 - t));
  tl.at(HIT, () => {
    land(h, 0, { scale: 1.35, tint: 0xFFB08A, flash: 0xFFE2B8, burst: 'explosion', burstSize: 1.4, glare: 0.2 });
    impactFrame(h, tl, c, { color: 0xF97316, dim: [0.6, DIM] });
    h.roll(-0.11, 10, true);
    h.sound('roar', { rate: 1.1, vol: 0.7 });
    h.camera(1.32, c.x, c.y, 12, true);
    h.knock(0, 22, 10);
    h.emit(c.x, c.y, { count: 30, colors: [0xF97316, 0xFDE047, BLOOD], speed: [1.5, 5], angle: -0.3, spread: 1.2, gravity: 0.15, size: 3, life: [16, 30] });
  });
  afterglow(h, tl, HIT + 4, HIT + 30, t0.x, t0.y - 6, FIRE, 20);
  tl.during(HIT + 14, HIT + 30, (t) => h.dim(0.6 * (1 - t), DIM));
  signature(h, tl, HIT, c, L_DRAGON, 52, 24);
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
  const DIM = 0x05010C;
  const stars = Array.from({ length: 22 }, (_, k) => ({ x: 20 + hash(k) * 390, y: 40 + hash(k + 40) * 70, s: hash(k + 80) }));
  tl.at(0, () => {
    h.anim('JUMP_FRONT_START');
    swingSound(h, true);
    h.camera(1.2, h.home.x + 10, h.home.y - 44, CALL);
  });
  tl.at(4, () => h.anim('SKILL2TULUC'));
  tl.during(0, 16, (t) => h.dim(0.78 * t, DIM));
  chargeUp(h, tl, 0, CALL, L_STAR, { breath: 4, freeze: false, circle: 36 });
  dutch(h, tl, FALL, 0.08, HIT - FALL, false);
  // Night falls and the stars come out
  lightSpan(h, tl, 8, HIT + 30, (g, t, f) => {
    const fade = Math.min(1, f / 10) * (t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1);
    for (const s of stars) {
      const tw = 0.5 + 0.5 * Math.sin(f * 0.3 + s.s * 10);
      if (s.s > 0.85) glint(g, s.x, s.y, 4, 0, 0xFAF5FF, fade * tw);
      else g.rect(s.x, s.y, s.s > 0.6 ? 2 : 1, s.s > 0.6 ? 2 : 1).fill({ color: s.s > 0.4 ? 0xFAF5FF : 0xC084FC, alpha: fade * tw });
    }
  }, 'back');
  lightSpan(h, tl, CALL, CALL + 14, (g, t) => {
    const p = h.weaponTip();
    godRay(g, p.x, -20, p.y, 8 * (1 - t) + 1, 10 * (1 - t) + 2, 0xC084FC, 1 - t);
    glint(g, p.x, p.y, 24 * (1 - t) + 4, 0, 0xFAF5FF, 1 - t);
  });
  tl.at(CALL, () => {
    h.flash(0.25, 0xE9D5FF);
    h.sound('beam', { rate: 2, vol: 0.5 });
    h.sound('holy', { rate: 1.2, vol: 0.5 });
    h.camera(1.04, (h.home.x + t0.x) / 2 + 30, h.home.y - 60, HIT - CALL);
  });
  // Gravity ripples gather under the target as the star falls
  lightSpan(h, tl, FALL, HIT, (g, _t, f) => {
    for (let k = 0; k < 3; k++) {
      const u = 1 - ((f * 0.05 + k / 3) % 1);
      groundRing(g, t0.x, t0.y, 10 + 44 * u, 2, 0xC084FC, 1 - u);
    }
  }, 'ground');
  targetRing(h, tl, FALL, HIT, t0.x, t0.y, 24, 0xC084FC);
  tl.at(FALL, () => h.sound('whistle', { rate: 0.85 }));
  const starAt = (t: number) => ({ x: lerp(t0.x - 90, c.x, easeIn(t)), y: lerp(-10, c.y, easeIn(t)), r: 3 + 9 * t });
  let st = 0;
  drawSpan(h, tl, FALL, HIT + 1, (g, t, f) => {
    st = t;
    const s = starAt(t);
    starburst(g, s.x, s.y, s.r * 1.8, 4, f * 0.2, P_COSMOS);
    orb(g, s.x, s.y, s.r, pal(0xC084FC, 0xFFFFFF, 0x2E1065));
  });
  weaponTrail(h, tl, FALL, HIT + 1, P_COSMOS, 18, 12, () => starAt(st));
  lightSpan(h, tl, FALL, HIT + 1, (g, t) => {
    const s = starAt(t);
    glow(g, s.x, s.y, s.r * 3 + 10, 0xC084FC, 1);
    glint(g, s.x, s.y, s.r * 3, t * 2, 0xFAF5FF, 0.8);
  });
  speedLines(h, tl, HIT - 8, HIT, () => c, 0xE9D5FF, { alpha: 0.45 });
  hitFx(h, tl, HIT, c, P_COSMOS, 32, [0xC084FC, 0xFAF5FF, 0xFFFFFF]);
  ringFx(h, tl, HIT, { x: t0.x, y: t0.y }, 10, 170, 0xC084FC, 24, 5);
  shockSphere(h, tl, HIT, c, 84, 0xC084FC, 20, 0xFAF5FF);
  drawSpan(h, tl, HIT, HIT + 50, (g, t) => groundCracks(g, t0.x, t0.y + 2, 60, 9, 41, P_COSMOS, Math.min(1, t * 8), 1 - t), 'ground');
  tl.at(HIT, () => {
    land(h, 0, { scale: 1.35, tint: 0xE9D5FF, flash: 0xFAF5FF, burst: 'explosion', burstSize: 1.4, glare: 0.2 });
    impactFrame(h, tl, c, { color: 0xC084FC, dim: [0.78, DIM] });
    h.roll(-0.11, 10, true);
    signature(h, tl, HIT, c, L_STAR, 54, 24);
    h.camera(1.32, c.x, c.y, 12, true);
    h.knock(0, 12, 10);
    h.emit(c.x, c.y, { count: 30, colors: [0xC084FC, 0xFAF5FF, 0x7C3AED], speed: [1.5, 5], spread: Math.PI, gravity: 0.05, size: 2, life: [18, 32] });
  });
  afterglow(h, tl, HIT + 4, HIT + 30, t0.x, t0.y - 8, [0xC084FC, 0xFAF5FF], 22);
  tl.during(HIT + 14, HIT + 30, (t) => h.dim(0.78 * (1 - t), DIM));
  tl.end(HIT + 32);
}

/** Gravity Snap: the fallen-star bell inverts gravity, the pack floats helpless, and the clean snaps them into the floor. */
function gravitySnap(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const FLOAT = 16;
  const SNAP = 40; // SKILL1 from 34 chops at 40
  const DIM = 0x07021A;
  const cx = (foes[0].x + foes[foes.length - 1].x) / 2;
  tl.at(0, () => {
    h.anim('SKILL2TULUC');
    h.camera(1.06, 250, h.home.y - 50, SNAP - 8);
    h.sound('dark', { rate: 1.3 });
  });
  tl.during(0, 14, (t) => h.dim(0.6 * t, DIM));
  chargeUp(h, tl, 0, FLOAT, L_SNAP, { breath: 4, freeze: false, circle: 40, aura: 1.1 });
  dutch(h, tl, SNAP - 6, -0.06, 6);
  lightSpan(h, tl, 0, SNAP, (g, _t, f) => {
    const p = h.weaponTip();
    for (let k = 0; k < 3; k++) {
      const u = 1 - ((f * 0.05 + k / 3) % 1);
      g.ellipse(p.x, p.y, 8 + 30 * u, (8 + 30 * u) * 0.5).stroke({ width: 2, color: 0x6D28D9, alpha: 1 - u });
    }
    glow(g, p.x, p.y, 16, 0x7C3AED, 0.6);
  });
  // Weightless: the pack drifts up in violet light, pebbles float off the floor
  tl.at(FLOAT, () => h.sound('portal', { rate: 0.5 }));
  tl.every(FLOAT, SNAP - 4, 2, () => foes.forEach((_, i) => h.knock(i, 0, 9)));
  tl.every(FLOAT, SNAP, 2, () => h.emit(rand(200, 410), h.home.y, { count: 2, colors: [...DIRT, 0x6D28D9], speed: [0.3, 0.9], angle: -Math.PI / 2, spread: 0.2, gravity: -0.03, size: 2, life: [20, 30] }));
  lightSpan(h, tl, FLOAT, SNAP, (g, t) => {
    for (const ft of foes) {
      godRay(g, ft.x, ft.y - ft.height - 30 * t, ft.y + 4, 14, 26, 0x7C3AED, 0.4 + 0.3 * t);
      for (let k = 0; k < 3; k++) g.moveTo(ft.x - 8 + k * 8, ft.y + 4).lineTo(ft.x - 8 + k * 8, ft.y - 12 - 24 * t).stroke({ width: 1, color: 0xC4B5FD, alpha: 0.6 });
    }
  });
  // Time hangs at the top of the float
  tl.at(SNAP - 10, () => {
    h.camera(1.14, cx, h.home.y - 56, 8);
    h.sound('charge', { rate: 1.6, vol: 0.5 });
  });
  tl.at(SNAP - 6, () => {
    h.anim('SKILL1');
    swingSound(h, true);
  });
  drawSpan(h, tl, SNAP - 6, SNAP, (g, _t, f) => focusLines(g, cx, h.home.y - 30, f, 0xDDD6FE, 0.4, { inner: 50, n: 22, width: 2 }));
  tl.at(SNAP, () => {
    h.camera(1.16, cx + 10, h.home.y - 30, 14, true);
    impactFrame(h, tl, { x: cx, y: h.home.y - 10 }, { color: 0xA78BFA, dim: [0.6, DIM] });
    h.roll(0.1, 10, true);
    signature(h, tl, SNAP, { x: cx, y: h.home.y - 10 }, L_SNAP, 56, 22);
  });
  foes.forEach((t, i) => {
    shockSphere(h, tl, SNAP + i, { x: t.x, y: t.y - 6 }, 40, 0x7C3AED, 14);
    drawSpan(h, tl, SNAP + i, SNAP + 50, (g, u) => groundCracks(g, t.x, t.y + 2, 40, 7, 43 + i, P_GRAV, Math.min(1, u * 8), 1 - u), 'ground');
    tl.at(SNAP + i, () => {
      h.knock(i, 0, -50);
      land(h, h.targets.length ? i : undefined, { scale: 0.95, tint: 0xDDD6FE, burst: 'quake', burstSize: 1, sfx: 'stomp', glare: 0.2 });
      rubble(h, { x: t.x, y: t.y }, 12, [...DIRT, 0x6D28D9]);
    });
  });
  ringFx(h, tl, SNAP, { x: cx, y: h.home.y }, 10, 220, 0x6D28D9, 24, 4);
  tl.during(SNAP + 12, SNAP + 28, (t) => h.dim(0.6 * (1 - t), DIM));
  tl.end(SNAP + 30);
}

// =============================================================================================
// MACES

/** Scrap Shrapnel: the goblin lashings snap mid-swing and a spray of nails, cogs and scrap rakes the pack. */
function scrapShrapnel(h: KnightMoveHost, tl: Timeline) {
  const hits = h.targets.length ? [...h.targets] : [h.target, h.target, h.target];
  const SNAP = 14;
  const DIM = 0x0C1006;
  tl.at(0, () => {
    h.anim('ATTACK1');
    h.animSpeed(0.8);
    swingSound(h);
    h.camera(1.18, h.home.x + 30, h.home.y - 30, SNAP);
    h.roll(-0.04, SNAP, false);
  });
  tl.during(0, 10, (t) => h.dim(0.35 * t, DIM));
  dutch(h, tl, SNAP, 0.06, 12);
  // The lashings strain: sparks spit off the head as it swings
  tl.every(4, SNAP, 2, () => h.sparks(h.weaponTip().x, h.weaponTip().y, 2, [0xFBBF24, 0xA3E635]));
  lightSpan(h, tl, 4, SNAP, (g, t) => glow(g, h.weaponTip().x, h.weaponTip().y, 6 + 10 * t, 0xFBBF24, t));
  tl.at(SNAP, () => {
    const p = h.weaponTip();
    h.animSpeed(1);
    h.shake(6);
    h.hitStop(3);
    h.sound('explosion', { rate: 1.6, vol: 0.6 });
    h.sound('gears', { rate: 1.4 });
    h.vfx('explosion', p.x + 6, p.y, { size: 0.5, life: 16 });
    h.emit(p.x, p.y, { count: 18, colors: [0x78716C, 0xA16207, 0xA3E635, 0x57534E], speed: [1, 4], angle: 0, spread: 0.8, gravity: 0.2, size: 2, life: [14, 26] });
    h.camera(1.06, (h.home.x + hits[hits.length - 1].x) / 2, h.home.y - 34, 30);
  });
  shockSphere(h, tl, SNAP, () => h.weaponTip(), 30, 0xFBBF24, 10);
  hits.forEach((t, k) => {
    const at = SNAP + 1 + k * 4;
    const c = chest(t);
    const last = k === hits.length - 1;
    const aim = { x: c.x + rand(-4, 4), y: c.y + rand(-6, 6) };
    projectile(h, tl, at, 8, () => h.weaponTip(), () => aim, 8 + k * 6,
      (g, x, y, _t, f) => {
        if (k % 3 === 0) dart(g, x, y, f * 0.9, 10, 0x78716C, 0xD6D3D1);
        else if (k % 3 === 1) {
          g.circle(x, y, 4.5).fill({ color: 0xA16207 }).stroke({ width: 1, color: INK });
          for (let n = 0; n < 6; n++) {
            const a = f * 0.6 + (n / 6) * Math.PI * 2;
            g.rect(x + Math.cos(a) * 5 - 1, y + Math.sin(a) * 5 - 1, 2, 2).fill({ color: 0xA16207 });
          }
          g.circle(x, y, 1.5).fill({ color: INK });
        } else g.poly([x - 5, y - 2, x + 5, y - 3, x + 2, y + 3, x - 3, y + 2]).fill({ color: 0x57534E }).stroke({ width: 1, color: 0xA3E635 });
      },
      () => {
        land(h, h.targets.length ? k : undefined, { scale: last ? 0.85 : 0.6, tint: 0xD9F99D, sfx: 'stab', glare: last ? 0.2 : 0.5 });
        if (last) {
          impactFrame(h, tl, c, { color: 0xA3E635, hold: 2, dim: [0.35, DIM] });
          h.roll(-0.08, 8, true);
          signature(h, tl, tl.frame, c, L_SCRAP, 40);
        }
        h.knock(k, 7, 2);
        h.sparks(c.x, c.y, 8, [0xD6D3D1, 0xA3E635, 0xFBBF24]);
      },
      (x, y) => h.emit(x, y, { count: 1, colors: [0xFBBF24, 0xFDE68A], speed: [0, 0.2], spread: Math.PI, gravity: 0.05, size: 1, life: [6, 10] }));
    lightSpan(h, tl, at, at + 8, (g, u) => {
      const s = h.weaponTip();
      const x = lerp(s.x, aim.x, u);
      const y = lerp(s.y, aim.y, u) - arc(u) * (8 + k * 6);
      g.moveTo(x, y).lineTo(x - 16, y + (aim.y - s.y) * -0.05).stroke({ width: 2, color: 0xFBBF24, alpha: 0.7 });
    });
  });
  const end = SNAP + hits.length * 4 + 24;
  tl.during(end - 14, end, (t) => h.dim(0.35 * (1 - t), DIM));
  tl.end(end);
}

/** Flanged Crush: march in, haul the mace high, and the flanged head stamps through the foe's armour. */
function flangedCrush(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const HIT = 34;
  const DIM = 0x0C0A08;
  tl.at(0, () => h.anim('RUN', true));
  tl.every(0, 12, 6, () => h.sound('step', { vol: 0.4, rate: 1.2 }));
  travel(h, tl, 0, 12, HOME, strikeSpot(h, t0, 62), easeInOut);
  ghostTrail(h, tl, 0, 12, 0xA8A29E, 2, 0.35);
  tl.every(2, 12, 5, () => dust(h, h.pos(), 3, -1));
  tl.during(4, 16, (t) => h.dim(0.45 * t, DIM));
  tl.at(12, () => {
    h.anim('ATTACK4');
    h.animSpeed(0.4);
  });
  // The haul: slow, the head gleaming at the top of the arc
  windUp(h, tl, 12, HIT - 4, 0xE7E5E4, { zoom: 1.26, reach: 34, at: () => h.weaponTip() });
  chargeUp(h, tl, 12, HIT - 4, L_FLANGE, { motes: false, breath: 6, freeze: false, circle: 30 });
  dutch(h, tl, HIT - 4, 0.08, 6);
  tl.during(14, HIT - 4, (t) => h.lift(easeOut(t) * 12));
  tl.at(HIT - 4, () => {
    h.animSpeed(1.8);
    swingSound(h, true);
  });
  weaponTrail(h, tl, HIT - 4, HIT, P_STONE, 14, 5);
  tl.during(HIT - 4, HIT, (t) => h.lift(lerp(12, 0, easeIn(t))));
  // The flange stamp: six iron fins hammered into the foe
  drawSpan(h, tl, HIT, HIT + 14, (g, t) => {
    const r = 14 + 12 * easeOut(t);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const x = c.x + Math.cos(a) * r * 0.5;
      const y = c.y + Math.sin(a) * r * 0.5;
      g.poly([x, y, c.x + Math.cos(a - 0.2) * r, c.y + Math.sin(a - 0.2) * r, c.x + Math.cos(a + 0.2) * r, c.y + Math.sin(a + 0.2) * r]).fill({ color: 0xA8A29E, alpha: 1 - t }).stroke({ width: 1.5, color: INK, alpha: 1 - t });
    }
  });
  hitFx(h, tl, HIT, c, P_STONE, 22, [0xD6D3D1, 0xFBBF24, 0xFFFFFF]);
  shockSphere(h, tl, HIT, c, 50, 0xE7E5E4, 14, 0xFBBF24);
  drawSpan(h, tl, HIT, HIT + 44, (g, t) => groundCracks(g, t0.x, t0.y + 2, 44, 7, 47, P_STONE, Math.min(1, t * 6), 1 - t), 'ground');
  tl.at(HIT, () => {
    h.animSpeed(1);
    land(h, 0, { scale: 1.25, tint: 0xE7E5E4, burst: 'crater', burstSize: 1.1, glare: 0.2 });
    impactFrame(h, tl, c, { dim: [0.45, DIM] });
    h.roll(-0.11, 10, true);
    signature(h, tl, HIT, c, L_FLANGE, 48);
    h.sound('crack', { rate: 1.5, vol: 0.6 }); // armour gives
    h.camera(1.32, c.x - 6, c.y, 10, true);
    h.knock(0, 4, -12);
    h.stretch(1.12, 0.9);
    shards(h, c, 14);
    rubble(h, { x: t0.x, y: t0.y }, 12, [0x78716C, 0xA8A29E, 0x57534E]);
  });
  tl.during(HIT, HIT + 6, (t) => h.stretch(lerp(1.12, 1, t), lerp(0.9, 1, t)));
  backstep(h, tl, HIT + 10, HIT + 26, 16);
  tl.during(HIT + 12, HIT + 28, (t) => h.dim(0.45 * (1 - t), DIM));
  tl.end(HIT + 28);
}

/** Ossuary Rattle: the skull-bell cracks and the dead inside pour out in a shrieking stream to gnaw the foe. */
function ossuaryRattle(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const OPEN = 12; // ATTACK2 sweep
  const N = 6;
  const FLY = 8;
  const launch = (k: number) => OPEN + 2 + k * 3;
  const LAST = launch(N - 1) + FLY;
  const DIM = 0x060A0A;
  tl.at(0, () => {
    h.anim('ATTACK2');
    swingSound(h);
    h.camera(1.16, (h.home.x + c.x) / 2, c.y - 14, LAST + 4);
  });
  tl.during(0, 10, (t) => h.dim(0.55 * t, DIM));
  dutch(h, tl, OPEN, 0.05, LAST - OPEN, false);
  const mouth = once(() => ({ x: h.pos().x + 24, y: h.pos().y - 28 }));
  tl.at(OPEN, () => {
    const p = mouth();
    h.shake(5);
    h.hitStop(2);
    h.sound('crack', { rate: 1.6, vol: 0.5 });
    h.sound('rattle');
    h.sound('wail', { rate: 1.3, vol: 0.4 });
    h.emit(p.x, p.y, { count: 16, colors: [0xE2E8F0, 0x86EFAC, 0x94A3B8], speed: [0.5, 2.4], spread: Math.PI, gravity: 0.05, size: 2, life: [14, 24] });
  });
  // The current of the dead: a ghost-light stream from the bell to the foe
  lightSpan(h, tl, OPEN, LAST + 6, (g, t, f) => {
    const p = mouth();
    const a = Math.min(1, t * 6) * (t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1);
    glow(g, p.x, p.y, 20, 0x86EFAC, a);
    for (let k = 0; k < 3; k++) {
      const pts: number[] = [];
      for (let i = 0; i <= 10; i++) {
        const u = i / 10;
        pts.push(lerp(p.x, c.x, u), lerp(p.y, c.y, u) - arc(u) * 14 + Math.sin(u * 9 + f * 0.5 + k * 2) * 4);
      }
      g.poly(pts, false).stroke({ width: 3 - k, color: k ? 0xF0FDF4 : 0x86EFAC, alpha: 0.5 * a });
    }
  });
  for (let k = 0; k < N; k++) {
    const at = launch(k);
    const last = k === N - 1;
    const skullAt = (t: number): P => {
      const s = mouth();
      return { x: lerp(s.x, c.x, easeIn(t)), y: lerp(s.y, c.y + ((k % 3) - 1) * 6, easeIn(t)) - arc(t) * (10 + (k % 3) * 6) + Math.sin(t * 10 + k) * 3 };
    };
    let sk = 0;
    drawSpan(h, tl, at, at + FLY + 1, (g, t, f) => {
      sk = t;
      const p = skullAt(t);
      skull(g, p.x, p.y, last ? 7 : 4.5, f * 2 + k, P_BONE);
    });
    weaponTrail(h, tl, at, at + FLY + 1, pal(0x86EFAC, 0xF0FDF4, 0x052E16), last ? 10 : 6, 6, () => skullAt(sk));
    tl.at(at, () => h.sound('chitter', { rate: 0.6 + k * 0.08, vol: 0.5 }));
    tl.at(at + FLY, () => {
      if (last) {
        land(h, 0, { tint: 0xDCFCE7, burst: 'slash', burstSize: 1, sfx: 'chomp', glare: 0.2 });
        impactFrame(h, tl, c, { color: 0x86EFAC, hold: 2, dim: [0.55, DIM] });
        h.roll(-0.08, 10, true);
        signature(h, tl, tl.frame, c, L_OSSUARY, 42);
        h.camera(1.3, c.x, c.y, 10, true);
        h.knock(0, 14, 4);
      } else {
        h.flashTarget(0, 0xDCFCE7, 3);
        h.shake(2.5);
        h.knock(0, 3);
        h.sound('chomp', { vol: 0.55, rate: 1.1 + k * 0.05 });
      }
      h.emit(c.x, c.y, { count: last ? 14 : 5, colors: [0xE2E8F0, 0xF8FAFC, 0x86EFAC], speed: [1, 2.8], spread: Math.PI, gravity: 0.2, size: 2, life: [12, 20] });
    });
    drawSpan(h, tl, at + FLY, at + FLY + 8, (g, t) => jawsSnap(g, c.x + ((k % 3) - 1) * 5, c.y + ((k % 3) - 1) * 5, t, last ? 13 : 8));
  }
  shockSphere(h, tl, LAST, c, 40, 0x86EFAC, 12);
  backstep(h, tl, LAST + 6, LAST + 22, 14);
  tl.during(LAST + 8, LAST + 24, (t) => h.dim(0.55 * (1 - t), DIM));
  tl.end(LAST + 24);
}

/** Bone jaws snapping shut on a point, `t` 0-1 over the bite. */
function jawsSnap(g: Graphics, x: number, y: number, t: number, s: number) {
  const shut = t < 0.3 ? t / 0.3 : 1;
  const a = 1 - Math.max(0, (t - 0.4) / 0.6);
  jaws(g, x, y, shut, s, P_BONE, a);
}

/** Gravestone Toll: the cemetery mace strikes the earth; graves split open and tombstones burst up under every foe. */
function gravestoneToll(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const SLAM = 10; // SKILL1 chop from 4
  const DIM = 0x080A10;
  tl.at(0, () => {
    h.anim('JUMP_FRONT_START');
    h.camera(1.2, h.home.x + 20, h.home.y - 34, SLAM);
  });
  tl.at(4, () => {
    h.anim('SKILL1');
    swingSound(h, true);
  });
  tl.during(0, 10, (t) => h.dim(0.5 * t, DIM));
  dutch(h, tl, SLAM, 0.07, 14);
  tl.at(SLAM, () => {
    h.shake(10);
    h.hitStop(3);
    h.sound('stomp');
    h.sound('block', { rate: 0.45, vol: 0.7 }); // a toll
    h.sound('wail', { rate: 0.7, vol: 0.35, delay: 0.2 });
    h.vfx('shockwave', h.pos().x + 24, h.home.y - 8, { size: 1, tint: 0x94A3B8 });
    h.camera(1.04, (h.home.x + foes[foes.length - 1].x) / 2 + 20, h.home.y - 40, 50);
  });
  shockSphere(h, tl, SLAM, () => ({ x: h.pos().x + 24, y: h.home.y - 6 }), 36, 0x94A3B8, 12);
  ringFx(h, tl, SLAM, () => ({ x: h.pos().x + 24, y: h.home.y }), 8, 230, 0x94A3B8, 24, 3);
  // Grave mist rolls across the floor
  tl.every(SLAM, SLAM + 44, 2, () => h.emit(rand(h.home.x + 20, 410), h.home.y + 2, { count: 1, colors: [0x94A3B8, 0xCBD5E1, 0x64748B], speed: [0.2, 0.6], angle: Math.PI, spread: 0.4, gravity: -0.005, size: 5, life: [26, 40] }));
  foes.forEach((t, i) => {
    const at = SLAM + 6 + i * 4;
    // The grave opens: cold light from below, then the stone and the dead's hands
    lightSpan(h, tl, at - 4, at + 24, (g, u) => {
      const a = u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85;
      godRay(g, t.x - 4, t.y - 70, t.y + 6, 10 * a, 30 * a, 0x94A3B8, a);
      groundCracks(g, t.x - 4, t.y + 6, 36, 6, 53 + i, P_GRAVE, Math.min(1, u * 5), a);
    }, 'ground');
    drawSpan(h, tl, at, at + 40, (g, u, f) => {
      const up = f < 5 ? easeOut(f / 5) : u > 0.65 ? 1 - (u - 0.65) / 0.35 : 1;
      tombstone(g, t.x - 4, t.y + 6, up, 1.3, -0.1);
      graspingHand(g, t.x - 18, t.y + 5, up * 0.9, Math.min(1, f / 8), 0xE2E8F0, 0x94A3B8);
      graspingHand(g, t.x + 14, t.y + 5, up * 0.8, Math.min(1, f / 8), 0xE2E8F0, 0x94A3B8);
    });
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: 0.9, tint: 0xE2E8F0, burst: 'crater', burstSize: 0.9, sfx: 'rock', glare: i === 0 ? 0.2 : 0.5 });
      if (i === 0) {
        impactFrame(h, tl, chest(t), { color: 0x94A3B8, hold: 2, dim: [0.5, DIM] });
        h.roll(-0.09, 10, true);
        signature(h, tl, tl.frame, chest(t), L_GRAVE, 42);
      }
      h.sound('rattle', { vol: 0.4, rate: 0.9 });
      h.knock(i, 4, 22);
      rubble(h, { x: t.x, y: t.y }, 12, [...DIRT, 0x57534E]);
    });
  });
  tl.during(SLAM + 36, SLAM + 52, (t) => h.dim(0.5 * (1 - t), DIM));
  tl.end(SLAM + 54);
}

/** Cathedral Toll: a phantom belfry bell descends over the pack; the mace strikes and its toll staggers them all. */
function cathedralToll(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const cx = foes.reduce((s, t) => s + t.x, 0) / foes.length;
  const cy = h.home.y - 40;
  const STRIKE = 26; // SKILL1 from 20 chops at 26
  const DIM = 0x0F0A03;
  tl.at(0, () => {
    h.anim('SKILL2TULUC');
    h.camera(1.02, (h.home.x + cx) / 2 + 20, h.home.y - 56, STRIKE);
    h.sound('holy', { rate: 0.5 });
  });
  tl.during(0, 14, (t) => h.dim(0.6 * t, DIM));
  chargeUp(h, tl, 0, STRIKE, L_CATHEDRAL, { breath: 5, freeze: false, circle: 38 });
  dutch(h, tl, STRIKE, 0.08, 14);
  // The bell descends out of the dark on beams of light
  const bellY = (f: number) => lerp(-30, cy - 46, easeInOut(Math.min(1, f / STRIKE)));
  const swing = (f: number, t: number) => (f > STRIKE ? Math.sin((f - STRIKE) * 0.35) * 5 * (1 - t) : 0);
  lightSpan(h, tl, 0, STRIKE + 44, (g, t, f) => {
    const fade = f < 10 ? f / 10 : t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
    const y = bellY(f);
    godRay(g, cx + swing(f, t), -20, y + 20, 16, 70, 0xFDE68A, 0.25 * fade);
    glow(g, cx + swing(f, t), y + 10, 60, 0xD97706, 0.35 * fade);
  }, 'back');
  drawSpan(h, tl, 0, STRIKE + 44, (g, t, f) => {
    const fade = f < 10 ? f / 10 : t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
    phantomBell(g, cx + swing(f, t), bellY(f), 82, P_BRONZE, fade);
  });
  tl.at(STRIKE - 6, () => {
    h.anim('SKILL1');
    swingSound(h, true);
  });
  // The toll: three deep rings; damage on the first
  [STRIKE, STRIKE + 12, STRIKE + 24].forEach((at, k) => {
    lightSpan(h, tl, at, at + 22, (g, t) => {
      for (let j = 0; j < 2; j++) {
        const u = t - j * 0.18;
        if (u <= 0) continue;
        const r = 20 + (170 - k * 30) * easeOut(u);
        g.circle(cx - 1.5, cy - 6, r).stroke({ width: 4 * (1 - u) + 1, color: k ? 0xFDE68A : 0xD97706, alpha: 0.8 * (1 - u) });
        g.circle(cx + 1.5, cy - 6, r * 0.97).stroke({ width: 1.5, color: 0xFFFFFF, alpha: 0.7 * (1 - u) });
      }
    });
    tl.at(at, () => {
      h.shake(11 - k * 3);
      h.sound('block', { rate: 0.38, vol: 1.1 - k * 0.3 }); // BONG
      if (k) h.flash(0.18 - k * 0.05, 0xFDE68A);
      foes.forEach((_, i) => h.flashTarget(i, 0xFDE68A, 4));
    });
  });
  tl.at(STRIKE, () => {
    impactFrame(h, tl, { x: cx, y: cy }, { color: 0xF59E0B, dim: [0.6, DIM] });
    h.roll(-0.1, 10, true);
    signature(h, tl, STRIKE, { x: cx, y: cy }, L_CATHEDRAL, 56, 24);
    h.camera(1.12, cx, cy - 10, 14, true);
  });
  foes.forEach((t, i) => tl.at(STRIKE + i * 2, () => {
    land(h, h.targets.length ? i : undefined, { scale: 0.9, tint: 0xFDE68A, burst: 'crater', burstSize: 0.8, glare: 0.2 });
    h.knock(i, Math.sign(t.x - cx || 1) * 12, 4);
  }));
  tl.during(STRIKE + 32, STRIKE + 46, (t) => h.dim(0.6 * (1 - t), DIM));
  tl.end(STRIKE + 48);
}

/** Basalt Fissure: the molten mace splits the floor; magma races down the line and erupts under each foe. */
function basaltFissure(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h).slice(0, 2);
  const SLAM = 16; // SKILL1 from 10
  const DIM = 0x140602;
  const end = Math.min(420, foes[foes.length - 1].x + 30);
  tl.at(0, () => {
    h.anim('JUMP_FRONT_START');
    h.sound('fire', { rate: 0.6, vol: 0.5 });
  });
  windUp(h, tl, 0, 10, 0xF97316, { zoom: 1.22, sound: false });
  tl.during(0, 12, (t) => h.dim(0.6 * t, DIM));
  dutch(h, tl, SLAM, 0.08, 14);
  tl.every(0, SLAM, 2, () => h.emit(h.weaponTip().x, h.weaponTip().y, { count: 1, colors: [0xF97316, 0xFDE047], speed: [0.2, 0.6], angle: -Math.PI / 2, spread: 0.4, gravity: -0.03, size: 2, life: [12, 20] }));
  tl.at(10, () => {
    h.anim('SKILL1');
    swingSound(h, true);
  });
  tl.at(SLAM, () => {
    h.shake(11);
    h.hitStop(4);
    h.sound('stomp');
    h.sound('impact_metal', { vol: 0.5 });
    h.camera(1.04, (h.home.x + end) / 2, h.home.y - 44, 50);
    rubble(h, { x: h.pos().x + 26, y: h.home.y }, 14, [0x292524, 0x44403C, 0xF97316]);
  });
  shockSphere(h, tl, SLAM, () => ({ x: h.pos().x + 26, y: h.home.y - 6 }), 40, 0xF97316, 12);
  crackFx(h, tl, SLAM, { x: h.home.x + 28, y: h.home.y }, { x: end, y: h.home.y }, P_LAVA, 12, 60);
  lightSpan(h, tl, SLAM, SLAM + 60, (g, t, f) => {
    const reach = Math.min(1, f / 12);
    const fade = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
    const x0 = h.home.x + 28;
    g.rect(x0, h.home.y - 3, (end - x0) * reach, 6).fill({ color: 0xF97316, alpha: 0.4 * fade });
    g.rect(x0, h.home.y - 1, (end - x0) * reach, 2).fill({ color: 0xFDE047, alpha: 0.8 * fade });
    glow(g, x0 + (end - x0) * reach, h.home.y, 22, 0xF97316, fade);
  }, 'ground');
  foes.forEach((t, i) => {
    const at = SLAM + 10 + i * 5;
    drawSpan(h, tl, at, at + 28, (g, u, f) => {
      const up = f < 4 ? easeOut(f / 4) : 1 - Math.max(0, (u - 0.45) / 0.55);
      pillar(g, t.x, t.y - 100 * up, t.y + 2, 22 * up, P_LAVA, 1);
      for (let k = 0; k < 5; k++) {
        const x = t.x + (hash(k + f) - 0.5) * 24;
        g.circle(x, t.y - 100 * up + hash(k * 3 + f) * 24, 3).fill({ color: 0xFDE047, alpha: up });
      }
    });
    lightSpan(h, tl, at, at + 28, (g, u) => {
      const up = u < 0.15 ? u / 0.15 : 1 - Math.max(0, (u - 0.45) / 0.55);
      godRay(g, t.x, t.y - 110 * up, t.y + 2, 30 * up, 40 * up, 0xF97316, up);
      glow(g, t.x, t.y - 20, 40 * up, 0xFDE047, up);
    });
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: i ? 1 : 1.2, tint: 0xFFC48A, flash: 0xFFE2B8, burst: 'fire', burstSize: 1.2, glare: i ? 0.6 : 0.2 });
      if (i === 0) {
        impactFrame(h, tl, chest(t), { color: 0xF97316, dim: [0.6, DIM] });
        h.roll(-0.1, 10, true);
        signature(h, tl, tl.frame, chest(t), L_BASALT, 46);
      }
      h.sound('rock', { vol: 0.6 });
      h.knock(i, 2, 32);
      rubble(h, { x: t.x, y: t.y - 10 }, 16, [0xF97316, 0xFDE047, 0x292524]);
    });
    drawSpan(h, tl, at, at + 60, (g, u) => {
      scorch(g, t.x, t.y, 22, EMBER, 1 - u);
      groundCracks(g, t.x, t.y + 2, 40, 7, 59 + i, P_LAVA, Math.min(1, u * 8), 1 - u);
    }, 'ground');
  });
  tl.during(SLAM + 36, SLAM + 52, (t) => h.dim(0.6 * (1 - t), DIM));
  tl.end(SLAM + 54);
}

/** Core Breach: crack the basalt head open against the foe and let its molten core detonate point-blank. */
function coreBreach(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const HIT = 36;
  const DIM = 0x140602;
  tl.at(0, () => h.anim('RUN', true));
  tl.every(0, 14, 7, () => h.sound('step', { vol: 0.4, rate: 1.2 }));
  travel(h, tl, 0, 14, HOME, strikeSpot(h, t0, 56), easeInOut);
  ghostTrail(h, tl, 0, 14, 0xF97316, 2, 0.4);
  chargeUp(h, tl, 14, HIT - 2, L_CORE, { breath: 6, freeze: false, circle: 32, aura: 1.1 });
  dutch(h, tl, HIT - 8, 0.06, 8, false);
  tl.at(14, () => {
    h.anim('ATTACK4');
    h.animSpeed(0.45);
    h.camera(1.26, c.x - 26, c.y - 10, 24);
    chargeSound(h, HIT - 14);
    h.sound('crack', { rate: 1.3, vol: 0.5, delay: 0.15 });
  });
  tl.during(10, 26, (t) => h.dim(0.7 * t, DIM));
  // The head cracks: light leaks from the fissures, faster and brighter
  lightSpan(h, tl, 14, HIT, (g, t, f) => {
    const p = h.weaponTip();
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + f * 0.05;
      const len = 8 + 30 * t * (0.6 + 0.4 * hash(k + Math.floor(f / 3)));
      g.moveTo(p.x, p.y).lineTo(p.x + Math.cos(a) * len, p.y + Math.sin(a) * len).stroke({ width: 1 + 3 * t, color: k % 2 ? 0xFDE047 : 0xF97316, alpha: 0.5 + 0.5 * t });
    }
    glow(g, p.x, p.y, 10 + 22 * t, 0xF97316, 0.5 + 0.5 * t);
  });
  tl.every(16, HIT, 3, (i) => h.shake(1 + i * 0.5));
  tl.at(HIT - 3, () => {
    h.animSpeed(1.8);
    swingSound(h, true);
  });
  // A beat of darkness before the detonation
  tl.at(HIT - 2, () => h.dim(0.92, 0x000000));
  hitFx(h, tl, HIT, c, P_LAVA, 38, [0xFFFBEB, 0xFDE047, 0xF97316, BLOOD]);
  ringFx(h, tl, HIT, { x: t0.x - 10, y: t0.y }, 10, 180, 0xF97316, 26, 5);
  ringFx(h, tl, HIT + 3, { x: t0.x - 10, y: t0.y }, 6, 120, 0xFFFBEB, 20, 2);
  shockSphere(h, tl, HIT, { x: c.x - 10, y: c.y }, 110, 0xF97316, 22, 0xFDE047);
  drawSpan(h, tl, HIT, HIT + 70, (g, t) => {
    scorch(g, t0.x - 10, t0.y, 36, EMBER, 1 - t);
    groundCracks(g, t0.x - 10, t0.y + 2, 70, 10, 61, P_LAVA, Math.min(1, t * 8), 1 - t);
  }, 'ground');
  tl.at(HIT, () => {
    h.animSpeed(1);
    land(h, 0, { scale: 1.45, tint: 0xFFE2B8, flash: 0xFFF3D6, burst: 'explosion', burstSize: 1.9, glare: 0.2 });
    impactFrame(h, tl, c, { color: 0xFDBA74, dim: [0.7, DIM], hold: 4 });
    h.roll(-0.12, 12, true);
    signature(h, tl, HIT, c, L_CORE, 60, 24);
    h.sound('thunder', { vol: 0.6 });
    h.camera(1.38, c.x - 10, c.y, 12, true);
    h.knock(0, 26, 16);
    h.emit(c.x - 10, c.y, { count: 40, colors: [0xF97316, 0xFDE047, BLOOD, 0x292524], speed: [2, 6], spread: Math.PI, gravity: 0.2, size: 3, life: [16, 34] });
    rubble(h, { x: t0.x - 10, y: t0.y }, 16, [0x292524, 0x44403C, 0xF97316]);
  });
  afterglow(h, tl, HIT + 4, HIT + 40, t0.x - 10, t0.y - 4, FIRE, 26);
  // The blast throws the knight back home
  tl.at(HIT + 2, () => h.anim('HIT2'));
  travel(h, tl, HIT + 2, HIT + 16, here(h), HOME, easeOut, 16);
  tl.at(HIT + 16, () => {
    h.anim('LANDING_END');
    h.sound('thud');
    dust(h, h.pos(), 8, 1);
  });
  tl.during(HIT + 14, HIT + 32, (t) => h.dim(0.7 * (1 - t), DIM));
  tl.end(HIT + 34);
}

// The Dead Weight (secret trial): grave chains, open earth, blood under a red moon.

/**
 * A crimson wraith: hooded head with burning eyes, a tail of soul-smoke trailing `trail` px behind it, and a
 * spectral kettlebell in its claws. `raise` 1 holds the bell overhead, 0 has it slammed down in front (facing +x).
 */
export function wraith(g: Graphics, x: number, y: number, s: number, f: number, raise: number, alpha = 1, trail = 0) {
  const sway = Math.sin(f * 0.35) * s * 0.3;
  // Halo of soul-light
  g.circle(x, y - s * 0.2, s * 1.6).fill({ color: 0xE11D48, alpha: 0.1 * alpha });
  g.circle(x, y - s * 0.2, s * 1.1).fill({ color: 0xE11D48, alpha: 0.12 * alpha });
  // A tattered hooded robe, its hem shredding into smoke behind it
  const hem = y + s * 1.1 + trail * 0.4;
  const robe: number[] = [x + s * 0.15, y - s * 1.4, x + s * 0.8, y - s * 0.5, x + s * 0.95 + sway, hem];
  const tatters = 5;
  for (let k = 1; k < tatters; k++) {
    const u = k / tatters;
    const deep = k % 2 ? s * 0.55 + trail * 0.6 : 0;
    robe.push(x + s * 0.95 - u * s * 1.9 + sway * (1 - u) + Math.sin(f * 0.5 + k) * s * 0.12, hem + deep);
  }
  robe.push(x - s * 0.95 + sway * 0.4, hem, x - s * 0.7, y - s * 0.45);
  g.poly(robe).fill({ color: 0x881337, alpha: 0.7 * alpha }).stroke({ width: 1.5, color: 0xFB7185, alpha: 0.9 * alpha });
  // Folds of light down the robe
  g.moveTo(x + s * 0.1, y - s * 0.2).lineTo(x + s * 0.2 + sway * 0.5, hem).stroke({ width: 1, color: 0xFDA4AF, alpha: 0.5 * alpha });
  g.moveTo(x - s * 0.4, y - s * 0.2).lineTo(x - s * 0.5 + sway * 0.3, hem).stroke({ width: 1, color: 0xFDA4AF, alpha: 0.35 * alpha });
  // The hollow under the hood, and two burning eyes
  g.ellipse(x + s * 0.2, y - s * 0.75, s * 0.4, s * 0.45).fill({ color: 0x1A0308, alpha });
  for (const ex of [0.02, 0.38]) {
    g.rect(x + s * ex - 1, y - s * 0.8, 2, 2).fill({ color: 0xFFE4E6, alpha });
    g.rect(x + s * ex - 2, y - s * 0.8 - 0.5, 4, 3).fill({ color: 0xE11D48, alpha: 0.5 * alpha });
  }
  // The bell: overhead, or driven down in front
  const bx = x + s * 1.2 * (1 - raise) + s * 0.15;
  const by = y - s * 2.1 * raise + s * 0.4 * (1 - raise);
  for (const side of [-1, 1]) {
    g.moveTo(x + side * s * 0.6, y - s * 0.35).lineTo(bx + side * s * 0.3, by + s * 0.35).stroke({ width: 2.5, color: 0x9F1239, alpha: 0.85 * alpha });
    g.moveTo(x + side * s * 0.6, y - s * 0.35).lineTo(bx + side * s * 0.3, by + s * 0.35).stroke({ width: 1, color: 0xFDA4AF, alpha: 0.7 * alpha });
  }
  const r = s * 0.5;
  g.circle(bx, by - r * 0.95, r * 0.5).stroke({ width: 2, color: 0xFDA4AF, alpha: 0.85 * alpha });
  g.circle(bx, by, r + 1.5).fill({ color: 0x4C0519, alpha: 0.8 * alpha });
  g.circle(bx, by, r).fill({ color: 0xE11D48, alpha: 0.7 * alpha }).stroke({ width: 1.5, color: 0xFFE4E6, alpha });
  g.rect(bx - 0.5, by - r * 0.5, 1, r).fill({ color: 0xFFE4E6, alpha: 0.8 * alpha });
  g.rect(bx - r * 0.35, by - r * 0.15, r * 0.7, 1).fill({ color: 0xFFE4E6, alpha: 0.8 * alpha });
}

/** An iron chain bursting up out of the earth at (x, groundY) and hooking toward (tx, ty), `t` 0–1 of its reach. */
function graveChain(g: Graphics, x: number, groundY: number, tx: number, ty: number, t: number, f: number, alpha = 1) {
  if (t <= 0.02) return;
  const ex = lerp(x, tx, t);
  const ey = lerp(groundY, ty, t) - Math.sin(t * Math.PI) * 6;
  chain(g, x, groundY, ex, ey, 0x4B515B, Math.sin(f * 0.4) * 2, alpha);
  // The hook at its end
  g.moveTo(ex, ey).lineTo(ex + 3, ey - 2).lineTo(ex + 3, ey + 3).stroke({ width: 1.5, color: 0xA3ABB5, alpha });
  g.ellipse(x, groundY, 4, 1.5).fill({ color: 0x140B08, alpha: 0.9 * alpha });
}

/** Open grave under a foe: a dark pit that yawns `open` 0–1, with crimson light at its bottom. */
function openGrave(g: Graphics, x: number, groundY: number, open: number, alpha = 1) {
  if (open <= 0.02) return;
  const w = 26 * open;
  g.ellipse(x, groundY, w + 3, 5 * open + 1).fill({ color: 0x352015, alpha });
  g.ellipse(x, groundY, w, 4 * open).fill({ color: 0x07030A, alpha });
  g.ellipse(x, groundY + 1, w * 0.6, 2 * open).fill({ color: 0xE11D48, alpha: 0.5 * alpha });
}

/**
 * Six Feet Under, in three beats:
 *   summoning  the knight marches in under a crimson dim; a blood rune opens at their feet and three wraiths of
 *              the cemetery's dead claw up out of the earth behind them, spectral kettlebells in hand
 *   volley     the wraiths hurl themselves in arcs to hang over the foe while the knight winds the Dead Weight
 *              up and looses three soul-skulls at it; the camera creeps in
 *   slam       wraiths and knight bring their bells down on the same frame (the damage): snap punch-in,
 *              crimson blast and quake, then the grave opens, chains drag the foe under, and its life streams
 *              back to the knight as soul orbs while the camera pulls back to them
 */
function sixFeetUnder(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const ground = t0.y + 4;
  const RISE = 14; // the wraiths break the earth
  const HIT = 48; // knight and wraiths connect together
  const DIVE = HIT - 6;
  const DIM = 0x12030A;
  const SOUL = [0xE11D48, 0xFB7185, 0xFFE4E6];
  const WS = 13; // wraith size

  // --- Summoning --------------------------------------------------------------------------------
  tl.at(0, () => {
    h.anim('RUN', true);
    h.sound('rattle', { rate: 0.7, vol: 0.5 });
    h.sound('dark', { vol: 0.6 });
  });
  tl.every(0, 12, 6, () => h.sound('step', { vol: 0.4, rate: 1.1 }));
  travel(h, tl, 0, 12, HOME, strikeSpot(h, t0, 60), easeInOut);
  ghostTrail(h, tl, 2, 12, 0xE11D48, 3, 0.35);
  chargeUp(h, tl, 14, DIVE, L_BURIAL, { breath: 6, freeze: false, circle: 36 });
  dutch(h, tl, DIVE, 0.08, 6);
  tl.during(0, 14, (t) => h.dim(0.62 * t, DIM));
  // Wide two-shot: the knight, the risen dead and the foe
  tl.at(10, () => h.camera(1.08, (strikeSpot(h, t0, 60).x + HOME.x + h.home.x * 2 + t0.x) / 3, h.home.y - 46, 30));
  // The blood rune under the knight
  drawSpan(h, tl, 10, HIT + 4, (g, t, f) => {
    const p = h.pos();
    const open = easeOut(Math.min(1, f / 8));
    runeCircle(g, p.x - 6, p.y + 1, 38 * open, f * 0.05, P_CRIMSON, t > 0.85 ? 1 - (t - 0.85) / 0.15 : 0.9);
  }, 'ground');
  tl.at(10, () => {
    const p = h.pos();
    h.vfx('summon', p.x - 6, p.y - 2, { anim: 'animation2', size: 0.9, tint: 0xE11D48, layer: 'ground', squash: 0.45, life: HIT - 6 });
  });

  // Three wraiths: where each breaks the earth, and where it hangs over the foe
  const ghosts = [0, 1, 2].map((k) => {
    const up = RISE + k * 3;
    const launch = 24 + k * 3;
    const arrive = launch + 11;
    const rise = once(() => ({ x: h.pos().x - 40 + k * 20, y: h.home.y - 2 }));
    const hover = { x: c.x - 34 + k * 30, y: c.y - 66 - (k === 1 ? 12 : 0) };
    const strike = { x: c.x - 16 + k * 14, y: c.y - 8 + (k === 1 ? -4 : 2) };
    return { k, up, launch, arrive, rise, hover, strike };
  });
  for (const gh of ghosts) {
    const { k, up, launch, arrive, rise, hover, strike } = gh;
    tl.at(up, () => {
      const p = rise();
      h.sound('wail', { rate: 0.75 + k * 0.12, vol: 0.4 });
      h.emit(p.x, p.y, { count: 10, colors: [0x352015, 0x5C2B14, 0xE11D48], speed: [1, 2.5], angle: -Math.PI / 2, spread: 1, gravity: 0.2, size: 2, life: [12, 22] });
    });
    // Clawing up out of the ground
    drawSpan(h, tl, up, launch, (g, t, f) => {
      if (f === 0) g.blendMode = 'add';
      const p = rise();
      const e = easeOut(t);
      wraith(g, p.x, p.y - 40 * e, WS, f + k * 5, 0.4 + 0.6 * e, Math.min(1, t * 3), 10 * (1 - e));
      g.ellipse(p.x, p.y, 12, 3).fill({ color: 0x07030A, alpha: 0.8 * (1 - t) });
    });
    // Hurled in an arc over the foe (a projectile with a soul-smoke wake)
    projectile(h, tl, launch, arrive - launch, () => ({ x: rise().x, y: rise().y - 40 }), () => hover, 30 + k * 8,
      (g, x, y, _t, f) => {
        g.blendMode = 'add';
        wraith(g, x, y, WS, f + k * 5, 1, 1, 14);
      },
      () => h.sound('whoosh', { rate: 1.3 + k * 0.1, vol: 0.4 }),
      (x, y) => { if (Math.random() < 0.6) h.emit(x, y + 8, { count: 1, colors: SOUL, speed: [0.1, 0.4], spread: Math.PI, gravity: -0.01, size: 2, life: [10, 18] }); },
    );
    tl.at(launch, () => h.sound('whoosh_heavy', { rate: 1.4, vol: 0.35 }));
    // Hanging over the foe, trembling, bell raised, until the dive
    drawSpan(h, tl, arrive, DIVE, (g, _t, f) => {
      if (f === 0) g.blendMode = 'add';
      const shiver = Math.sin(f * 1.7 + k) * 1.2;
      wraith(g, hover.x + shiver, hover.y + Math.sin(f * 0.25 + k) * 2, WS, f + k * 5, 1, 1);
      g.circle(hover.x, hover.y - 18, 12 + Math.sin(f * 0.5) * 2).fill({ color: 0xE11D48, alpha: 0.12 });
    });
    // The dive: stretched into a streak, bell coming down, landing on HIT
    drawSpan(h, tl, DIVE, HIT + 1, (g, t, f) => {
      if (f === 0) g.blendMode = 'add';
      const e = easeIn(t);
      const x = lerp(hover.x, strike.x, e);
      const y = lerp(hover.y, strike.y, e);
      g.moveTo(hover.x, hover.y).lineTo(x, y).stroke({ width: 8, color: 0xE11D48, alpha: 0.25 * t });
      g.moveTo(hover.x, hover.y).lineTo(x, y).stroke({ width: 1.5, color: 0xFFE4E6, alpha: 0.5 * t });
      wraith(g, x, y, WS + 2 * e, f + k * 5, 1 - e, 1, 8 + 18 * e);
    });
  }

  // --- Volley: the knight winds up and fires soul-skulls ----------------------------------------
  tl.at(12, () => {
    h.anim('ATTACK4');
    h.animSpeed(0.32);
    h.fxSlot('Normal_Slash', 0xE11D48); // the rig's swing trail burns crimson
    chargeSound(h, HIT - 12);
  });
  tl.during(14, HIT - 4, (t) => h.lift(easeOut(t) * 10));
  chargeFx(h, tl, 16, HIT - 4, () => h.weaponTip(), P_CRIMSON, 36, 12);
  // Crimson seeps from the coffin-bell's seams as it rises
  drawSpan(h, tl, 12, HIT, (g, t, f) => {
    const p = h.weaponTip();
    for (let k = 0; k < 4; k++) g.rect(p.x - 4 + k * 3, p.y + 3 + ((f + k * 3) % 8), 1, 2).fill({ color: 0xE11D48, alpha: 0.4 + 0.5 * t });
    g.circle(p.x, p.y, 4 + 7 * t).fill({ color: 0xE11D48, alpha: 0.15 + 0.3 * t });
  });
  // The camera creeps in as the dead gather over the foe
  tl.at(30, () => h.camera(1.18, (h.pos().x + c.x) / 2 + 10, c.y - 30, HIT - 30));
  [22, 28, 34].forEach((at, k) => {
    const aim = { x: c.x + rand(-3, 3), y: c.y + (k - 1) * 5 };
    projectile(h, tl, at, 9, () => h.weaponTip(), () => aim, 10 + k * 5,
      (g, x, y, _t, f) => {
        g.circle(x, y, 6).fill({ color: 0xE11D48, alpha: 0.25 });
        skull(g, x, y, 3.5, f, P_CRIMSON);
      },
      () => {
        h.flashTarget(0, 0xFB7185, 4);
        h.shake(1.5);
        h.sound('wail', { rate: 1.6 + k * 0.1, vol: 0.25 });
        h.sound('chomp', { rate: 1.3, vol: 0.4 });
        h.sparks(aim.x, aim.y, 5, SOUL);
      },
      (x, y) => h.emit(x, y, { count: 1, colors: SOUL, speed: [0.1, 0.3], spread: Math.PI, gravity: 0, size: 2, life: [6, 12] }),
    );
    tl.at(at, () => h.sound('shoot', { rate: 0.8, vol: 0.35 }));
  });
  tl.every(36, DIVE, 2, (i) => h.shake(0.5 + i * 0.25)); // the air thickens before the drop
  tl.at(HIT - 4, () => {
    h.animSpeed(1.8);
    swingSound(h, true);
    h.sound('wail', { rate: 0.6, vol: 0.6 }); // the dead scream as they fall
  });
  tl.during(HIT - 4, HIT, (t) => h.lift(lerp(10, 0, easeIn(t))));

  // --- Slam: knight and wraiths together --------------------------------------------------------
  for (const gh of ghosts) hitFx(h, tl, HIT, gh.strike, P_CRIMSON, 9, SOUL);
  hitFx(h, tl, HIT, c, P_CRIMSON, 26, [0xFFE4E6, 0xE11D48, 0x9F1239, BLOOD_DARK]);
  ringFx(h, tl, HIT, { x: t0.x - 4, y: ground }, 10, 150, 0xE11D48, 22, 5);
  ringFx(h, tl, HIT + 3, { x: t0.x - 4, y: ground }, 6, 90, 0xFFE4E6, 16, 2);
  tl.at(HIT, () => {
    h.animSpeed(1);
    land(h, 0, { scale: 1.45, tint: 0xFECDD3, flash: 0xFFE4E6, glare: 0.25, burst: 'quake', burstSize: 1.3, sfx: 'wood' });
    impactFrame(h, tl, c, { color: 0xE11D48, dim: [0.62, DIM], hold: 4 });
    h.roll(-0.12, 12, true);
    signature(h, tl, HIT, c, L_BURIAL, 56, 24);
    h.vfx('explosion', c.x, c.y - 4, { size: 0.75, tint: 0xF43F5E, life: 18 });
    h.camera(1.42, c.x - 6, c.y - 4, 12, true);
    h.sound('crack', { rate: 0.8, vol: 0.6 });
    h.sound('rattle', { rate: 0.6, vol: 0.8, delay: 0.08 });
    h.sound('explosion', { rate: 0.7, vol: 0.5 });
    h.stretch(1.12, 0.9);
    debris(h, { x: t0.x, y: ground }, 18, [...DIRT, 0x352015]);
    // The wraiths burst into soul-smoke on contact
    for (const gh of ghosts) h.emit(gh.strike.x, gh.strike.y, { count: 14, colors: SOUL, speed: [1, 3.5], spread: Math.PI, gravity: -0.02, size: 2, life: [14, 26] });
  });
  tl.during(HIT, HIT + 6, (t) => h.stretch(lerp(1.12, 1, t), lerp(0.9, 1, t)));
  // The earth opens and the chains come for it
  drawSpan(h, tl, HIT, HIT + 36, (g, t) => openGrave(g, t0.x - 4, ground, t < 0.15 ? easeOut(t / 0.15) : t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1), 'ground');
  drawSpan(h, tl, HIT + 2, HIT + 32, (g, t, f) => {
    const reach = t < 0.3 ? easeOut(t / 0.3) : t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
    graveChain(g, t0.x - 26, ground, c.x - 6, c.y + 2, reach, f);
    graveChain(g, t0.x + 16, ground, c.x + 2, c.y - 4, reach * 0.95, f + 3);
    graveChain(g, t0.x - 8, ground + 2, c.x - 2, c.y + 8, reach * 0.9, f + 6);
  });
  // Dragged half under, then spat back up
  tl.at(HIT + 8, () => {
    h.knock(0, 2, -8);
    h.flashTarget(0, 0xE11D48, 6);
    h.sound('gurgle', { rate: 0.7, vol: 0.5 });
  });

  // --- Its life streams back to the knight ------------------------------------------------------
  tl.at(HIT + 14, () => h.camera(1.14, (h.pos().x + c.x) / 2 - 20, h.home.y - 40, 26));
  for (let k = 0; k < 6; k++) {
    const at = HIT + 10 + k * 2;
    projectile(h, tl, at, 14, () => ({ x: c.x + rand(-6, 6), y: c.y + rand(-6, 6) }), () => kChest(h), 18 + k * 4,
      (g, x, y) => {
        g.circle(x, y, 4).fill({ color: 0xE11D48, alpha: 0.3 });
        g.circle(x, y, 2.5).fill({ color: 0xE11D48 }).stroke({ width: 1, color: 0x4C0519 });
        g.rect(x - 0.5, y - 0.5, 1, 1).fill({ color: 0xFFE4E6 });
      },
      () => { if (k % 2 === 0) h.sound('heal', { rate: 1.3 + k * 0.05, vol: 0.2 }); },
      (x, y) => { if (Math.random() < 0.5) h.emit(x, y, { count: 1, colors: SOUL, speed: [0.1, 0.3], spread: Math.PI, gravity: -0.02, size: 1, life: [8, 14] }); },
    );
  }
  tl.at(HIT + 26, () => {
    h.vfx('heal', h.pos().x, h.pos().y - 26, { size: 0.9, tint: 0xFB7185 });
    h.sound('heal', { rate: 0.8, vol: 0.6 });
    h.ghost(0xE11D48, 0.5, 18);
  });
  motesFx(h, tl, HIT + 26, HIT + 40, () => h.pos(), SOUL, 3, 14);
  backstep(h, tl, HIT + 30, HIT + 46, 16);
  tl.during(HIT + 36, HIT + 50, (t) => h.dim(0.62 * (1 - t), DIM));
  tl.end(HIT + 52);
}

/**
 * Blood Moon Requiem: the knight snatches the Dead Weight overhead and a blood moon swells behind it; its toll
 * shakes a swarm of bats loose from the moon, who fall on every foe, and the graveyard earth splits red under them.
 */
function bloodMoonRequiem(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const cx = foes.reduce((sum, t) => sum + t.x, 0) / foes.length;
  // Top centre, where the Blood Cemetery's own moon hangs: there it swells over it, elsewhere it is a new one
  const moon = { x: 213, y: 30 };
  const TOLL = 26;
  const DIM = 0x1A0308;
  raiseAndHold(h, tl, 0, TOLL + 8);
  tl.at(0, () => {
    h.camera(1.04, (h.home.x + cx) / 2, h.home.y - 56, 60);
    h.sound('dark', { vol: 0.7 });
    h.sound('wail', { rate: 0.7, vol: 0.35, delay: 0.3 });
  });
  tl.during(0, 14, (t) => h.dim(0.7 * t, DIM));
  chargeUp(h, tl, 2, TOLL, L_BLOODMOON, { breath: 6, freeze: false, circle: 40 });
  dutch(h, tl, TOLL, -0.07, 14, false);
  // The moon swells and reddens over the field, bleeding light
  lightSpan(h, tl, 0, TOLL + 44, (g, t, f) => {
    const grow = easeOut(Math.min(1, f / 18));
    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
    const blaze = f > TOLL ? Math.max(0, 1 - (f - TOLL) / 20) : 0;
    glow(g, moon.x, moon.y, (50 + 30 * blaze) * grow, 0xE11D48, (0.6 + 0.4 * blaze) * fade);
  }, 'back');
  drawSpan(h, tl, 0, TOLL + 44, (g, t, f) => {
    const grow = easeOut(Math.min(1, f / 18));
    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
    const r = 30 * grow;
    g.circle(moon.x, moon.y, r).fill({ color: f > TOLL ? 0xB91C1C : 0xC2410C, alpha: fade });
    g.circle(moon.x - r * 0.3, moon.y - r * 0.2, r * 0.28).fill({ color: 0x7F1D1D, alpha: 0.6 * fade });
    g.circle(moon.x + r * 0.35, moon.y + r * 0.25, r * 0.22).fill({ color: 0x7F1D1D, alpha: 0.6 * fade });
  }, 'back');
  // A tether of crimson from the raised bell to the moon
  lightSpan(h, tl, 10, TOLL, (g, t) => {
    const p = h.weaponTip();
    g.moveTo(p.x, p.y).lineTo(moon.x, moon.y).stroke({ width: 1 + 3 * t, color: 0xE11D48, alpha: 0.4 + 0.5 * t });
    glow(g, p.x, p.y, 8 + 10 * t, 0xE11D48, 0.5 + 0.5 * t);
  });
  tl.every(10, TOLL, 4, (i) => h.sound('rattle', { rate: 0.6 + i * 0.08, vol: 0.3 }));
  tl.at(TOLL, () => {
    h.shake(7);
    h.hitStop(3);
    h.sound('block', { rate: 0.4, vol: 0.8 }); // the toll
    h.sound('swarm', { vol: 0.7 });
    h.sound('screech', { rate: 1.3, vol: 0.4, delay: 0.1 });
  });
  shockSphere(h, tl, TOLL, moon, 90, 0xE11D48, 18, 0xFECDD3);
  // Bats pour off the moon onto each foe
  const last = foes.length - 1;
  foes.forEach((t, i) => {
    const c = chest(t);
    for (let b = 0; b < 5; b++) {
      const at = TOLL + 2 + i * 5 + b * 2;
      drawSpan(h, tl, at, at + 14, (g, u, f) => {
        const x = lerp(moon.x, c.x + (b - 2) * 6, easeIn(u)) + Math.sin(u * 10 + b) * 10 * (1 - u);
        const y = lerp(moon.y, c.y + (b % 2) * 6, easeIn(u)) - arc(u) * 10;
        flier(g, x, y, 6 + (b % 2), f * 0.9 + b, 0x1A0308, 0xE11D48, x > moon.x ? 1 : -1);
      });
    }
    const hit = TOLL + 16 + i * 5 + 8;
    tl.at(hit, () => {
      land(h, h.targets.length ? i : undefined, { scale: i === last ? 1 : 0.9, tint: 0xFECDD3, burst: 'slash', burstSize: 0.8, sfx: 'chomp', glare: i === last ? 0.2 : 0.5 });
      if (i === last) {
        impactFrame(h, tl, c, { color: 0xE11D48, dim: [0.7, DIM] });
        h.roll(0.1, 10, true);
        signature(h, tl, tl.frame, c, L_BLOODMOON, 48);
      }
      h.sound('flap', { vol: 0.5, rate: 1.2 });
      h.knock(i, 6, 6);
      h.emit(c.x, c.y, { count: 10, colors: [0xE11D48, 0x9F1239, 0xFB7185], speed: [1, 2.5], spread: Math.PI, gravity: 0.15, size: 2, life: [12, 22] });
    });
    // The earth splits red beneath them
    lightSpan(h, tl, hit, hit + 30, (g, u) => {
      const a = u > 0.6 ? 1 - (u - 0.6) / 0.4 : 1;
      groundCracks(g, t.x, t.y + 3, 40, 7, 67 + i, P_CRIMSON, Math.min(1, u * 5), a);
      godRay(g, t.x, t.y - 50, t.y + 3, 6 * a, 22 * a, 0xE11D48, 0.5 * a);
    }, 'ground');
  });
  const end = TOLL + 24 + (foes.length - 1) * 5;
  tl.during(end + 6, end + 20, (t) => h.dim(0.7 * (1 - t), DIM));
  tl.end(end + 22);
}

// =============================================================================================
// SWORDS

/** Kettleburne's Oath: a sworn guard, a five-cut flurry from every angle, an X-cut finisher, then the shield is raised again. */
function kettleburneOath(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  // Six swings: five cuts of the flurry (rig at 1.5x, so each ATTACK connects 8 frames in) and the finisher
  const CUTS = [16, 25, 34, 43, 52];
  const FIN = 68; // ATTACK2 at normal speed from 56 connects at 68
  const ANIMS = ['ATTACK1', 'ATTACK3', 'ATTACK2', 'ATTACK4', 'ATTACK5'];
  const ARCS: [number, number, number, number, number][] = [ // a0, a1, radius, dx, dy: alternating fore- and backhand
    [-2.2, 0.6, 26, -6, -2],
    [1.4, -1.5, 28, -8, 3],
    [-1.6, 1.2, 24, -4, -6],
    [2.3, -0.4, 27, -10, 0],
    [-2.6, 0.2, 30, -6, 4],
  ];
  const DIM = 0x0A0D14;
  tl.at(0, () => {
    h.anim('DEFENSE');
    h.slashTrail(false); // plain steel: no fire smear on the ATTACK swings
    h.sound('equip', { rate: 1.2, vol: 0.6 }); // sworn: a ring of steel
    h.camera(1.22, h.home.x + 12, h.home.y - 34, 8);
  });
  tl.during(0, 10, (t) => h.dim(0.45 * t, DIM));
  lightSpan(h, tl, 2, 14, (g, t) => glint(g, h.weaponTip().x, h.weaponTip().y, 16 * arc(t) + 2, t * 2, 0xF8FAFC, arc(t)));
  tl.at(4, () => {
    h.anim('ATTACK1');
    h.sound('dash', { vol: 0.6 });
    h.camera(1.16, (h.home.x + c.x) / 2 + 10, c.y - 10, CUTS[1] - 4);
  });
  travel(h, tl, 6, CUTS[0] - 2, HOME, strikeSpot(h, t0, 54), easeIn);
  ghostTrail(h, tl, 6, CUTS[0], 0xCBD5E1, 2, 0.35);
  dutch(h, tl, 6, 0.05, CUTS[0] - 6);
  speedLines(h, tl, 6, CUTS[0], () => c, 0xE2E8F0, { alpha: 0.3 });

  // --- The flurry: five cuts, each a different angle, each harder and closer -----------------------
  tl.at(CUTS[0] + 1, () => h.animSpeed(1.5));
  CUTS.forEach((at, k) => {
    if (k > 0) tl.at(at - 8, () => h.anim(ANIMS[k]));
    const [a0, a1, r, dx, dy] = ARCS[k];
    slashFx(h, tl, at - 1, { x: c.x + dx, y: c.y + dy, r, a0, a1, thick: 6 + k, p: P_STEELB, dur: 7, sound: false });
    tl.at(at, () => {
      h.sound(k % 2 ? 'slash' : 'slash_heavy', { rate: 1 + k * 0.08, vol: 0.7 });
      h.flashTarget(0, 0xF1F5F9, 2);
      h.shake(2 + k);
      h.hitStop(1);
      h.knock(0, 3 + k, 0);
      h.sparks(c.x + dx * 0.5, c.y + dy, 5 + k, [0xF1F5F9, 0xFBBF24, 0xFFFFFF]);
      h.camera(1.18 + k * 0.025, c.x - 12, c.y - 8, 9);
      if (k % 2) h.roll(k % 4 === 1 ? 0.04 : -0.04, 6, true);
    });
  });
  ghostTrail(h, tl, CUTS[0], CUTS[4] + 2, 0xCBD5E1, 3, 0.28);
  tl.every(CUTS[0], CUTS[4] + 1, 3, () => h.emit(c.x - 4, c.y, { count: 2, colors: [0xF1F5F9, 0xFBBF24], speed: [1.5, 3], angle: -Math.PI / 2, spread: 1.4, gravity: 0.12, size: 2, life: [10, 16], kind: 'spark' }));

  // --- The held beat, then the finisher: an X-cut through the foe ---------------------------------
  tl.at(CUTS[4] + 4, () => {
    h.animSpeed(1);
    h.sound('charge', { rate: 1.9, vol: 0.4 });
  });
  lightSpan(h, tl, CUTS[4] + 2, FIN, (g, t) => {
    const p = h.weaponTip();
    glow(g, p.x, p.y, 8 + 16 * t, 0xE2E8F0, 0.5 + 0.5 * t, 0xFFFBEB);
    glint(g, p.x, p.y, 6 + 20 * easeIn(t), t * 1.5, 0xFFFFFF, 0.4 + 0.6 * t);
  });
  tl.at(FIN - 12, () => {
    h.anim('ATTACK2');
    swingSound(h, true);
  });
  slashFx(h, tl, FIN - 1, { x: c.x - 8, y: c.y + 4, r: 34, a0: 1.3, a1: -1.6, thick: 11, p: P_STEELB });
  slashFx(h, tl, FIN + 1, { x: c.x - 4, y: c.y - 4, r: 34, a0: -1.9, a1: 1.1, thick: 10, p: P_STEELB, sound: false });
  lightSpan(h, tl, FIN - 1, FIN + 12, (g, u) => {
    crescent(g, c.x - 8, c.y + 4, 40, 1.3, -1.6, 18 * (1 - u), P_STEELB, 0.45 * (1 - u));
    crescent(g, c.x - 4, c.y - 4, 40, -1.9, 1.1, 16 * (1 - u), P_STEELB, 0.45 * (1 - u));
  });
  hitFx(h, tl, FIN, c, P_STEELB, 20, [0xF1F5F9, 0xFBBF24, 0xFFFFFF]);
  tl.at(FIN, () => {
    land(h, 0, { tint: 0xF1F5F9, glare: 0.2 });
    impactFrame(h, tl, c, { hold: 3, dim: [0.45, DIM] });
    h.roll(-0.09, 10, true);
    signature(h, tl, tl.frame, c, L_OATH, 46);
    h.camera(1.3, c.x, c.y, 12, true);
    h.knock(0, 16, 6);
  });
  shockSphere(h, tl, FIN, c, 44, 0xE2E8F0, 14, 0xFBBF24);
  backstep(h, tl, FIN + 8, FIN + 24, 14);
  tl.at(FIN + 24, () => {
    h.anim('DEFENSE');
    h.guard(0xCBD5E1);
  });
  lightSpan(h, tl, FIN + 24, FIN + 34, (g, t) => glint(g, h.weaponTip().x, h.weaponTip().y, 14 * (1 - t) + 2, 0, 0xF8FAFC, 1 - t));
  tl.during(FIN + 16, FIN + 30, (t) => h.dim(0.45 * (1 - t), DIM));
  tl.end(FIN + 34);
}

/** Lunar Hunt: under a cold moon the knight runs the pack down, a spectral wolf leaping ahead of every cut. */
function lunarHunt(h: KnightMoveHost, tl: Timeline) {
  const hits = h.targets.length ? [...h.targets] : [h.target, h.target];
  const STEP = 16;
  const START = 10;
  const DIM = 0x050B1A;
  const moon = { x: 360, y: 60 };
  tl.at(0, () => {
    h.anim('DASH');
    h.camera(1.06, 260, h.home.y - 44, START + hits.length * STEP + 10);
    h.sound('wail', { rate: 1.6, vol: 0.4 }); // a distant howl
    h.sound('dash');
  });
  tl.during(0, 10, (t) => h.dim(0.55 * t, DIM));
  // A cold moon rises and floods the field with blue light
  const fadeAt = (t: number) => Math.min(1, t * 4) * (t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1);
  lightSpan(h, tl, 2, START + hits.length * STEP + 16, (g, t) => {
    const a = fadeAt(t);
    glow(g, moon.x, moon.y, 50, 0x60A5FA, 0.6 * a);
    godRay(g, moon.x - 40, moon.y, h.home.y + 10, 20, 120, 0x60A5FA, 0.18 * a);
  }, 'back');
  drawSpan(h, tl, 2, START + hits.length * STEP + 16, (g, t) => {
    const a = fadeAt(t);
    g.circle(moon.x, moon.y, 13).fill({ color: 0xEFF6FF, alpha: 0.95 * a });
    g.circle(moon.x + 6, moon.y - 4, 12).fill({ color: 0x050B1A, alpha: 0.95 * a });
  }, 'back');
  const last = hits.length - 1;
  hits.forEach((t, k) => {
    const at = START + k * STEP;
    const c = chest(t);
    tl.at(at, () => {
      h.anim('SKILL1');
      swingSound(h);
      h.sound('growl', { rate: 1.3 + k * 0.1, vol: 0.5 });
    });
    travel(h, tl, at, at + 6, here(h), strikeSpot(h, t, 44), easeIn);
    dutch(h, tl, at, k % 2 ? -0.06 : 0.06, 8);
    ghostTrail(h, tl, at, at + 6, 0x60A5FA, 1, 0.5);
    // The spirit wolf lunges at the throat a beat ahead of the blade
    const wolfAt = (u: number): P => {
      const e = Math.min(1, u * 1.6);
      return { x: lerp(h.pos().x, c.x, easeOut(e)), y: c.y - 4 - arc(e) * 12 };
    };
    drawSpan(h, tl, at, at + 12, (g, u) => {
      const p = wolfAt(u);
      beastHead(g, p.x, p.y, 11, 'wolf', 1, P_MOON, 0.9 * (1 - Math.max(0, u - 0.6) / 0.4), u > 0.4 ? 1 : 0.3);
    });
    lightSpan(h, tl, at, at + 12, (g, u) => {
      const p = wolfAt(u);
      glow(g, p.x, p.y, 16, 0x60A5FA, 0.7 * (1 - u));
    });
    weaponTrail(h, tl, at, at + 9, P_MOON, 8, 6, () => wolfAt((tl.frame - at) / 12));
    tl.at(at + 6, () => {
      land(h, h.targets.length ? k : undefined, { scale: k === last ? 0.95 : 0.8, tint: 0xBFDBFE, burst: 'slash', burstSize: 0.8, sfx: 'claw', glare: k === last ? 0.2 : 0.5 });
      if (k === last) {
        impactFrame(h, tl, c, { color: 0x60A5FA, hold: 2, dim: [0.55, DIM] });
        h.roll(-0.1, 10, true);
        signature(h, tl, tl.frame, c, L_LUNAR, 44);
        h.camera(1.22, c.x, c.y, 10, true);
      }
      h.knock(k, 10, 2);
    });
    lightSpan(h, tl, at + 6, at + 16, (g, u) => crescent(g, c.x, c.y, 22, -2.4, 0.8, 10 * (1 - u), P_MOON, 1 - u));
    drawSpan(h, tl, at + 6, at + 14, (g) => clawRake(g, c.x, c.y, 1, 24, 0x60A5FA));
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
  tl.during(END, END + 14, (t) => h.dim(0.55 * (1 - t), DIM));
  tl.end(END + 16);
}

/** Tusk Gore: head down, the boar spirit charges with him, and the tusked blade gores the foe upward. */
function tuskGore(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const HIT = 20; // ATTACK3 from 6 thrusts at 20
  const DIM = 0x140404;
  tl.at(0, () => {
    h.anim('JUMP_FRONT_START');
    h.sound('growl', { rate: 1.1, vol: 0.6 }); // the boar spirit
    h.camera(1.22, h.home.x + 16, h.home.y - 28, 6);
  });
  tl.during(0, 6, (t) => h.stretch(1 + 0.1 * t, 1 - 0.12 * t));
  tl.during(0, 8, (t) => h.dim(0.45 * t, DIM));
  tl.at(4, () => {
    h.stretch(1, 1);
    h.anim('DASH');
    h.sound('dash');
    h.camera(1.14, (h.home.x + c.x) / 2 + 10, c.y - 10, HIT - 4);
  });
  tl.every(4, 10, 2, () => dust(h, h.pos(), 3, -1));
  tl.at(6, () => {
    h.anim('ATTACK3');
    h.sound('step', { rate: 1.1 });
    h.sound('step', { rate: 1.2, delay: 0.1 });
  });
  travel(h, tl, 6, HIT - 1, HOME, strikeSpot(h, t0, 40), easeIn);
  ghostTrail(h, tl, 6, HIT, 0xF87171, 2, 0.45);
  dutch(h, tl, 6, 0.07, HIT - 6, false);
  speedLines(h, tl, 6, HIT, () => c, 0xFECACA, { alpha: 0.35 });
  drawSpan(h, tl, 4, HIT + 6, (g, t) => {
    const p = h.pos();
    beastHead(g, p.x + 20 + t * 12, p.y - 18, 14, 'boar', 1, P_TUSK, 0.85 * (1 - Math.max(0, t - 0.7) / 0.3));
  }, 'back');
  lightSpan(h, tl, 4, HIT + 6, (g, t) => glow(g, h.pos().x + 22 + t * 12, h.pos().y - 18, 22, 0xF87171, 0.5 * (1 - Math.max(0, t - 0.7) / 0.3)), 'back');
  // Two gore arcs hooking up through the foe
  slashFx(h, tl, HIT - 1, { x: c.x - 10, y: c.y + 10, r: 24, a0: 1.6, a1: -1.0, thick: 7, p: P_TUSK, dur: 9 });
  slashFx(h, tl, HIT, { x: c.x - 2, y: c.y + 12, r: 24, a0: 1.6, a1: -1.0, thick: 6, p: pal(0xFFF1F2, 0xFFFFFF, 0x450A0A), dur: 9 });
  hitFx(h, tl, HIT, c, P_TUSK, 19);
  shockSphere(h, tl, HIT, c, 40, 0xF87171, 12);
  tl.at(HIT, () => {
    land(h, 0, { tint: 0xFECACA, burst: 'slash', burstSize: 1, sfx: 'stab', glare: 0.2 });
    impactFrame(h, tl, c, { color: 0xF87171, hold: 2, dim: [0.45, DIM] });
    h.roll(-0.1, 10, true);
    signature(h, tl, HIT, c, L_TUSK, 44);
    h.knock(0, 20, 30);
    h.camera(1.26, c.x - 10, c.y - 14, 12, true);
    h.emit(c.x, c.y, { count: 12, colors: [0xF87171, 0xFFF1F2, BLOOD], speed: [1.5, 3.5], angle: -Math.PI / 2, spread: 0.8, gravity: 0.15, size: 2, life: [14, 24] });
  });
  backstep(h, tl, HIT + 10, HIT + 26, 14);
  tl.during(HIT + 12, HIT + 28, (t) => h.dim(0.45 * (1 - t), DIM));
  tl.end(HIT + 28);
}

/** Labyrinth Execution: the Minotaur looms behind the knight as he raises the cleaver and brings down the sentence. */
function labyrinthExecution(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const HIT = 40;
  const DIM = 0x140A02;
  tl.at(4, () => h.sound('roar', { rate: 0.8, vol: 0.6 })); // the Minotaur looms
  tl.at(0, () => h.camera(1.1, (h.home.x + t0.x) / 2, h.home.y - 50, 20));
  tl.during(0, 14, (t) => h.dim(0.6 * t, DIM));
  const bullA = (f: number, t: number) => Math.min(1, f / 12) * (t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1);
  drawSpan(h, tl, 2, HIT + 16, (g, t, f) => {
    const p = h.pos();
    beastHead(g, p.x - 6, p.y - 66, 20 + (f > HIT - 4 ? 4 : 0), 'bull', 1, P_BULL, 0.6 * bullA(f, t));
  }, 'back');
  // Its eyes burn as the sentence is passed
  lightSpan(h, tl, 2, HIT + 16, (g, t, f) => {
    const p = h.pos();
    const a = bullA(f, t);
    glow(g, p.x - 6, p.y - 66, 40, 0xF59E0B, 0.35 * a);
    glow(g, p.x - 6 - 8, p.y - 69, 6, 0xFDE047, a);
    glow(g, p.x - 6 + 6, p.y - 69, 6, 0xFDE047, a);
  }, 'back');
  // A labyrinth sigil brands the floor under the condemned
  lightSpan(h, tl, 4, HIT + 22, (g, t, f) => {
    const s = 28 * easeOut(Math.min(1, f / 12));
    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
    for (let k = 0; k < 4; k++) {
      const r = s * (1 - k * 0.22);
      g.rect(t0.x - r, t0.y - r * 0.28, r * 2, r * 0.56).stroke({ width: 1.5, color: k % 2 ? 0xFEF3C7 : 0xF59E0B, alpha: 0.85 * fade });
    }
    g.moveTo(t0.x, t0.y - s * 0.28).lineTo(t0.x, t0.y).stroke({ width: 1.5, color: 0xF59E0B, alpha: fade });
    glow(g, t0.x, t0.y, s, 0xF59E0B, 0.3 * fade);
  }, 'ground');
  tl.at(6, () => h.anim('RUN', true));
  tl.every(6, 20, 7, () => h.sound('step', { vol: 0.4, rate: 1.2 }));
  travel(h, tl, 6, 20, HOME, strikeSpot(h, t0, 64), easeInOut);
  ghostTrail(h, tl, 6, 20, 0xF59E0B, 2, 0.35);
  tl.at(20, () => {
    h.anim('ATTACK1');
    h.animSpeed(0.45);
  });
  windUp(h, tl, 20, HIT - 2, 0xF59E0B, { zoom: 1.26, reach: 40 });
  chargeUp(h, tl, 20, HIT - 2, L_BULL, { motes: false, breath: 6, freeze: false, circle: 34, aura: 1.2 });
  dutch(h, tl, HIT - 2, 0.08, 4);
  tl.during(22, HIT - 2, (t) => h.lift(easeOut(t) * 12));
  tl.at(HIT - 2, () => {
    h.animSpeed(1.8);
    swingSound(h, true);
  });
  tl.during(HIT - 2, HIT, (t) => h.lift(lerp(12, 0, t)));
  slashFx(h, tl, HIT - 1, { x: c.x - 6, y: c.y - 6, r: 34, a0: -1.9, a1: 1.35, thick: 12, p: P_BULL, dur: 12 });
  lightSpan(h, tl, HIT - 1, HIT + 12, (g, u) => crescent(g, c.x - 6, c.y - 6, 40, -1.9, 1.35, 22 * (1 - u), P_BULL, 0.45 * (1 - u)));
  hitFx(h, tl, HIT, c, P_BULL, 24, [0xF59E0B, 0xFEF3C7, 0xFFFFFF]);
  shockSphere(h, tl, HIT, c, 60, 0xF59E0B, 16, 0xFEF3C7);
  drawSpan(h, tl, HIT, HIT + 44, (g, t) => groundCracks(g, t0.x, t0.y + 2, 50, 8, 71, P_BULL, Math.min(1, t * 6), 1 - t), 'ground');
  tl.at(HIT, () => {
    land(h, 0, { scale: 1.3, tint: 0xFDE68A, flash: 0xFFF1D0, burst: 'crater', burstSize: 1.2, glare: 0.2 });
    impactFrame(h, tl, c, { color: 0xF59E0B, dim: [0.6, DIM] });
    h.roll(-0.11, 10, true);
    signature(h, tl, HIT, c, L_BULL, 52);
    h.camera(1.34, c.x, c.y, 12, true);
    h.knock(0, 4, -12);
    shards(h, c, 16);
    rubble(h, { x: t0.x, y: t0.y }, 12, [0x78716C, 0xA8A29E, 0xF59E0B]);
  });
  tl.at(HIT + 6, () => h.animSpeed(1));
  tl.during(HIT + 12, HIT + 28, (t) => h.dim(0.6 * (1 - t), DIM));
  backstep(h, tl, HIT + 12, HIT + 28, 16);
  tl.end(HIT + 30);
}

/** Dragonheart Rend: the blade drinks the dragon's heart-fire, and one sweep sends a burning crescent through the line. */
function dragonheartRend(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h).slice(0, 2);
  const SWEEP = 32; // ATTACK4 from 20 sweeps at 32
  const DIM = 0x1A0303;
  const far = Math.min(430, foes[foes.length - 1].x + 50);
  tl.at(0, () => {
    h.anim('SKILL3TULUC');
    h.sound('fire', { rate: 0.7, vol: 0.6 });
  });
  windUp(h, tl, 0, 20, 0xDC2626, { zoom: 1.22, reach: 36 });
  chargeUp(h, tl, 0, 20, L_DRAGON, { motes: false, breath: 5, freeze: false, circle: 36, aura: 1.1 });
  dutch(h, tl, SWEEP, 0.08, 12);
  tl.during(0, 14, (t) => h.dim(0.6 * t, DIM));
  tl.every(0, SWEEP, 1, () => {
    const p = h.weaponTip();
    h.emit(p.x + rand(-8, 8), p.y + rand(-3, 3), { count: 1, colors: FIRE, speed: [0.3, 1], angle: -Math.PI / 2, spread: 0.5, gravity: -0.05, size: 2, life: [10, 18] });
  });
  [4, 12].forEach((at) => tl.at(at, () => h.sound('thud', { rate: 0.6, vol: 0.6 }))); // heart-fire pulses
  [4, 12].forEach((at) => lightSpan(h, tl, at, at + 8, (g, t) => {
    g.circle(kChest(h).x, kChest(h).y, 6 + 20 * t).stroke({ width: 3 * (1 - t) + 1, color: 0xDC2626, alpha: 1 - t });
    glow(g, kChest(h).x, kChest(h).y, 18, 0xDC2626, 1 - t);
  }));
  tl.at(20, () => {
    h.anim('ATTACK4');
    swingSound(h, true);
  });
  weaponTrail(h, tl, SWEEP - 3, SWEEP + 2, P_WYRM, 12, 4);
  tl.at(SWEEP, () => {
    h.camera(1.04, (h.home.x + far) / 2, h.home.y - 30, 30);
    h.shake(7);
    h.hitStop(3);
    h.sound('fire');
    h.sound('slash_heavy', { rate: 0.8 });
  });
  // The crescent wave of fire travels through the line, scorching a furrow behind it
  const waveX = (t: number) => lerp(h.pos().x + 30, far, easeIn(t));
  drawSpan(h, tl, SWEEP, SWEEP + 20, (g, t) => {
    const x = waveX(t);
    crescent(g, x - 20, h.home.y - 26, 34, -1.15, 1.15, 14, P_WYRM, 1 - t * 0.3);
    crescent(g, x - 26, h.home.y - 26, 28, -1.0, 1.0, 7, P_EMBER, 0.85);
    h.emit(x - 4, h.home.y - 26 + rand(-24, 24), { count: 1, colors: FIRE, speed: [0.3, 1], angle: Math.PI, spread: 0.4, gravity: -0.03, size: 2, life: [10, 16] });
  });
  lightSpan(h, tl, SWEEP, SWEEP + 20, (g, t) => {
    const x = waveX(t);
    crescent(g, x - 18, h.home.y - 26, 42, -1.2, 1.2, 26, P_WYRM, 0.4 * (1 - t * 0.5));
    glow(g, x - 6, h.home.y - 26, 34, 0xF97316, 0.6);
  });
  lightSpan(h, tl, SWEEP + 2, SWEEP + 60, (g, t, f) => {
    const reach = Math.min(1, f / 18);
    const x0 = h.home.x + 40;
    const fade = t > 0.5 ? 1 - (t - 0.5) / 0.5 : 1;
    for (let k = 0; k < 14; k++) {
      const x = lerp(x0, far, (k / 14) * reach);
      const hgt = (5 + 7 * hash(k + Math.floor(f / 3))) * fade;
      flameTongue(g, x, h.home.y + 2, hgt * 1.3, 3.5, k % 2 ? P_FLAMEWAKE : P_FLAMEWAKE_HOT, f, k, 0.75 * fade);
    }
  }, 'ground');
  foes.forEach((t, i) => {
    const u = Math.min(1, Math.max(0, (t.x - (h.pos().x + 30)) / (far - h.home.x - 30)));
    const at = SWEEP + Math.max(2, Math.round(Math.sqrt(u) * 20));
    shockSphere(h, tl, at, chest(t), 40, 0xF97316, 12);
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: i ? 0.95 : 1.2, tint: 0xFFB08A, burst: 'fire', burstSize: 1.1, glare: i ? 0.6 : 0.2 });
      if (i === 0) {
        impactFrame(h, tl, chest(t), { color: 0xF97316, dim: [0.6, DIM] });
        h.roll(-0.1, 10, true);
        signature(h, tl, tl.frame, chest(t), L_DRAGON, 46);
      }
      h.knock(i, 16, 6);
    });
  });
  tl.during(SWEEP + 22, SWEEP + 38, (t) => h.dim(0.6 * (1 - t), DIM));
  tl.end(SWEEP + 40);
}

/** Scorched Earth: the flameblade is driven into the ground and walls of dragonfire erupt beneath the whole pack. */
function scorchedEarth(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const PLUNGE = 22; // SKILL1 from 16 chops at 22
  const DIM = 0x1A0303;
  raiseAndHold(h, tl, 0, 16);
  tl.at(0, () => h.sound('fire', { rate: 0.7, vol: 0.5 }));
  windUp(h, tl, 0, 16, 0xEF4444, { zoom: 1.2 });
  chargeUp(h, tl, 0, 16, LOOK.FIRE, { motes: false, breath: 4, circle: 38 });
  dutch(h, tl, PLUNGE, 0.08, 14);
  tl.during(0, 14, (t) => h.dim(0.6 * t, DIM));
  tl.at(16, () => {
    h.anim('SKILL1');
    swingSound(h, true);
  });
  tl.at(PLUNGE, () => {
    h.shake(11);
    h.hitStop(4);
    h.sound('stab');
    h.sound('stomp', { vol: 0.7 });
    h.camera(1.02, 260, h.home.y - 44, 50);
    h.vfx('fire', h.pos().x + 24, h.home.y - 16, { size: 0.8, life: 24 });
  });
  shockSphere(h, tl, PLUNGE, () => ({ x: h.pos().x + 24, y: h.home.y - 6 }), 44, 0xEF4444, 12, 0xFDE047);
  const last = foes.length - 1;
  foes.forEach((t, i) => {
    crackFx(h, tl, PLUNGE, { x: h.home.x + 28, y: h.home.y }, { x: t.x, y: t.y }, P_LAVA, 8 + i * 2, 60);
    const at = PLUNGE + 8 + i * 4;
    const flameH = (u: number, f: number) => (f < 4 ? easeOut(f / 4) : 1 - Math.max(0, (u - 0.5) / 0.5));
    drawSpan(h, tl, at, at + 36, (g, u, f) => {
      const up = flameH(u, f);
      for (let k = -2; k <= 2; k++) {
        const x = t.x + k * 10;
        const hgt = (40 + 16 * hash(k + Math.floor(f / 2) + i * 5)) * up * (k === 0 ? 1.4 : 1);
        if (fxReady()) flameTongue(g, x, t.y + 4, hgt, 8, P_PYRE, f, k + i * 3);
        else {
          g.poly([x - 7, t.y + 4, x, t.y + 4 - hgt, x + 7, t.y + 4]).fill({ color: BLOOD, alpha: 0.85 });
          g.poly([x - 5, t.y + 4, x, t.y + 4 - hgt * 0.7, x + 5, t.y + 4]).fill({ color: EMBER });
          g.poly([x - 2, t.y + 4, x, t.y + 4 - hgt * 0.4, x + 2, t.y + 4]).fill({ color: 0xFDE047 });
        }
      }
    });
    lightSpan(h, tl, at, at + 36, (g, u, f) => {
      const up = flameH(u, f);
      glow(g, t.x, t.y - 20, 46 * up, 0xF97316, up);
      godRay(g, t.x, t.y - 90 * up, t.y + 4, 20 * up, 50 * up, 0xEF4444, 0.6 * up);
    });
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: 1, tint: 0xFFB08A, burst: 'fire', burstSize: 1.1, glare: i === last ? 0.2 : 0.5 });
      if (i === last) {
        impactFrame(h, tl, chest(t), { color: 0xEF4444, dim: [0.6, DIM] });
        h.roll(-0.1, 10, true);
        signature(h, tl, tl.frame, chest(t), L_DRAGON, 46);
      }
      h.knock(i, 2, 18);
    });
    drawSpan(h, tl, at, at + 60, (g, u) => {
      scorch(g, t.x, t.y, 24, EMBER, 1 - u);
      groundCracks(g, t.x, t.y + 2, 40, 7, 73 + i, P_LAVA, Math.min(1, u * 8), 1 - u);
    }, 'ground');
  });
  tl.every(PLUNGE + 8, PLUNGE + 50, 2, () => embers(h, { x: rand(200, 410), y: h.home.y }, 1));
  tl.during(PLUNGE + 36, PLUNGE + 52, (t) => h.dim(0.6 * (1 - t), DIM));
  tl.end(PLUNGE + 54);
}

/** Severed Moment: time stops; the knight is suddenly behind the foe, a hairline crack hangs in the air, and then time resumes. */
function severedMoment(h: KnightMoveHost, tl: Timeline) {
  const t0 = h.target;
  const c = chest(t0);
  const VANISH = 14;
  const RESUME = 44;
  const DIM = 0x08040F;
  tl.at(0, () => {
    h.anim('ATTACK5');
    h.camera(1.14, (h.home.x + t0.x) / 2, h.home.y - 40, VANISH + 4);
    h.sound('charge', { rate: 1.6, vol: 0.4 });
  });
  tl.during(0, 12, (t) => h.dim(0.75 * t, DIM));
  lightSpan(h, tl, 0, RESUME + 4, (g, t, f) => {
    const p = h.pos();
    runeCircle(g, p.x, p.y, 30 * easeOut(Math.min(1, f / 8)), f * 0.02, P_NULL, f < VANISH ? 1 : 0.4);
    // A clock hand sweeps once and stops
    const a = -Math.PI / 2 + Math.min(1, f / VANISH) * Math.PI * 2;
    g.moveTo(p.x, p.y).lineTo(p.x + Math.cos(a) * 22, p.y + Math.sin(a) * 6).stroke({ width: 1.5, color: 0xC4B5FD, alpha: f < VANISH ? 1 : 0.4 });
  }, 'ground');
  tl.at(VANISH, () => {
    smoke(h, kChest(h), 10, [...SHADOW, 0x000000]);
    h.alpha(0);
    h.sound('portal', { rate: 1.8, vol: 0.6 });
    h.sound('dark', { rate: 2, vol: 0.4 }); // time stops
    // The world loses its colour: everything stills under a grey-violet veil
    h.dim(0.85, 0x1A1625);
    h.camera(1.24, c.x + 10, c.y - 4, RESUME - VANISH);
  });
  // Stopped time: motes hang in the air and a ring of frozen light locks round the foe
  lightSpan(h, tl, VANISH, RESUME, (g, t, f) => {
    for (let k = 0; k < 14; k++) {
      const x = c.x - 60 + hash(k) * 120;
      const y = c.y - 50 + hash(k + 20) * 90;
      g.rect(x, y, 1.5, 1.5).fill({ color: 0xC4B5FD, alpha: 0.6 + 0.4 * Math.sin(k) });
    }
    g.circle(c.x, c.y, 34).stroke({ width: 1, color: 0xC4B5FD, alpha: 0.5 * Math.min(1, t * 4) });
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      g.rect(c.x + Math.cos(a) * 34 - 1, c.y + Math.sin(a) * 34 - 1, 2, 2).fill({ color: 0xEDE9FE, alpha: Math.min(1, t * 4) });
    }
    if (f % 20 < 2) focusLines(g, c.x, c.y, f, 0xC4B5FD, 0.3, { inner: 40, n: 16, width: 2 });
  });
  tl.at(VANISH + 3, () => {
    h.offset(t0.x + 46 - h.home.x, t0.y - h.home.y);
    h.face(true);
    h.alpha(1);
    h.anim('ATTACK3');
    h.sound('slash', { rate: 1.2 });
    smoke(h, kChest(h), 6, [...SHADOW, 0x000000]);
  });
  tl.at(VANISH + 15, () => h.animSpeed(0)); // frozen at the end of the stroke
  // The cut hangs in stopped time
  drawSpan(h, tl, VANISH + 4, RESUME, (g, t) => {
    const reach = easeOut(Math.min(1, t * 5));
    g.moveTo(c.x - 26, c.y - 18).lineTo(lerp(c.x - 26, c.x + 26, reach), lerp(c.y - 18, c.y + 16, reach)).stroke({ width: 2, color: 0xFFFFFF });
  });
  lightSpan(h, tl, VANISH + 4, RESUME, (g, t) => {
    const reach = easeOut(Math.min(1, t * 5));
    g.moveTo(c.x - 26, c.y - 18).lineTo(lerp(c.x - 26, c.x + 26, reach), lerp(c.y - 18, c.y + 16, reach)).stroke({ width: 7, color: 0x7C3AED, alpha: 0.5 });
  });
  tl.at(VANISH + 4, () => h.flashTarget(0, 0xC4B5FD, RESUME - VANISH - 4));
  tl.at(RESUME - 6, () => h.sound('charge', { rate: 2.2, vol: 0.4 }));
  // Time resumes: the cut detonates along its length
  drawSpan(h, tl, RESUME, RESUME + 16, (g, t) => {
    lance(g, c.x - 32, c.y - 22, c.x + 32, c.y + 20, 16 * (1 - t), P_NULL, 1);
    for (let k = 0; k < 7; k++) {
      const u = k / 6;
      const x = lerp(c.x - 32, c.x + 32, u);
      const y = lerp(c.y - 22, c.y + 20, u);
      g.poly([x, y, x + 6 * t + 3, y - 9 * t - 2, x + 10 * t + 2, y + 2]).fill({ color: 0x000000, alpha: 1 - t }).stroke({ width: 1, color: 0xC4B5FD, alpha: 1 - t });
    }
  });
  shockSphere(h, tl, RESUME, c, 60, 0x7C3AED, 16, 0xFFFFFF);
  tl.at(RESUME, () => {
    h.animSpeed(1);
    land(h, 0, { scale: 1.35, tint: 0xC4B5FD, flash: 0xFFFFFF, burst: 'slash', burstSize: 1.4, glare: 0.2 });
    impactFrame(h, tl, c, { color: 0xA78BFA, dim: [0.75, DIM], hold: 4 });
    h.roll(-0.12, 12, true);
    signature(h, tl, tl.frame, c, L_TIME, 54, 24);
    h.sound('slash_heavy', { rate: 0.7 });
    h.sound('portal', { rate: 0.5, vol: 0.5 }); // time resumes
    h.camera(1.32, c.x, c.y, 12, true);
    h.knock(0, -16, 6);
    shards(h, c, 22);
  });
  tl.during(RESUME + 6, RESUME + 18, (t) => h.dim(0.75 * (1 - t), DIM));
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
  const SWEEP = 26;
  const DIM = 0x05010C;
  tl.at(0, () => {
    h.anim('ATTACK4');
    h.animSpeed(0.45);
    h.sound('dark', { rate: 1.1 });
  });
  windUp(h, tl, 0, SWEEP - 4, 0x7C3AED, { zoom: 1.24, reach: 56 });
  chargeUp(h, tl, 0, SWEEP - 4, L_SINGULARITY, { motes: false, breath: 5, freeze: false, circle: 40, aura: 1.1 });
  dutch(h, tl, SWEEP, 0.08, 14);
  tl.during(0, 18, (t) => h.dim(0.8 * t, DIM));
  // The blade drinks the light: a black core with a violet rim on the edge
  drawSpan(h, tl, 4, SWEEP, (g, t) => {
    const p = h.weaponTip();
    g.circle(p.x, p.y, 3 + 6 * t).fill({ color: 0x000000 }).stroke({ width: 1.5, color: 0xC4B5FD });
  });
  chargeFx(h, tl, 0, SWEEP, () => h.weaponTip(), pal(0x000000, 0xC4B5FD, 0x7C3AED), 50, 16);
  tl.at(SWEEP - 4, () => {
    h.animSpeed(1.6);
    swingSound(h, true);
  });
  tl.at(SWEEP, () => {
    h.animSpeed(1);
    h.sound('slash_heavy', { rate: 0.6 });
    h.sound('beam', { rate: 0.5, vol: 0.6 });
    h.shake(9);
    h.hitStop(4);
    h.camera(1.02, 250, h.home.y - 34, 30);
  });
  drawSpan(h, tl, SWEEP, SWEEP + 24, (g, t) => {
    const p = { x: h.pos().x + 10, y: h.pos().y - 26 };
    const r = lerp(30, 320, easeOut(t));
    crescent(g, p.x, p.y, r, -0.9, 0.9, 20 * (1 - t * 0.5), pal(0x000000, 0x7C3AED, 0xC4B5FD), 1 - t * 0.6);
  });
  lightSpan(h, tl, SWEEP, SWEEP + 24, (g, t) => {
    const p = { x: h.pos().x + 10, y: h.pos().y - 26 };
    const r = lerp(30, 320, easeOut(t));
    crescent(g, p.x, p.y, r + 4, -0.95, 0.95, 10, P_NULL, 0.7 * (1 - t));
    crescent(g, p.x, p.y, r - 6, -0.8, 0.8, 4, P_NULL, 1 - t);
  });
  const last = foes.length - 1;
  foes.forEach((t, i) => {
    const d = Math.hypot(t.x - (h.home.x + 10), chest(t).y - (h.home.y - 26));
    const u = Math.min(1, Math.max(0, (d - 30) / 290));
    const at = SWEEP + Math.max(1, Math.round((1 - Math.cbrt(1 - u)) * 24));
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: i === last ? 1 : 0.9, tint: 0xC4B5FD, burst: 'portal', burstSize: 0.9, glare: i === last ? 0.2 : 0.5 });
      if (i === last) {
        impactFrame(h, tl, chest(t), { color: 0x7C3AED, dim: [0.8, DIM] });
        h.roll(-0.1, 10, true);
        signature(h, tl, tl.frame, chest(t), L_SINGULARITY, 50);
      }
      h.knock(i, 16, 4);
    });
  });
  // The rift scars left behind collapse
  drawSpan(h, tl, SWEEP + 16, SWEEP + 38, (g, t) => {
    for (const f of foes) g.ellipse(f.x, chest(f).y, 16 * (1 - t), 4 * (1 - t)).fill({ color: 0x000000, alpha: 0.9 }).stroke({ width: 1, color: 0xC4B5FD });
  });
  lightSpan(h, tl, SWEEP + 16, SWEEP + 38, (g, t) => {
    for (const f of foes) glow(g, f.x, chest(f).y, 20 * (1 - t), 0x7C3AED, 1 - t);
  });
  tl.during(SWEEP + 22, SWEEP + 38, (t) => h.dim(0.8 * (1 - t), DIM));
  tl.end(SWEEP + 40);
}

// ---------------------------------------------------------------------------------------------
// Excalibell: holy light. Light is drawn additively (lightSpan) over a darkened field, so it glows
// instead of painting flat colour over the scene.

const HOLY_NIGHT = 0x04030C;
const HOLY_GOLD = 0xF4B41A;
const HOLY_PALE = 0xFDE68A;
const HOLY_WHITE = 0xFFFBEA;

/** Angelic halo ring seen slightly from above, with a spark running round it. */
function halo(g: Graphics, x: number, y: number, r: number, f: number, alpha = 1) {
  if (r <= 1 || alpha <= 0) return;
  if (fxReady()) {
    stamp(g, 'bloom', x, y, r * 2.6, r * 0.9, { tint: HOLY_GOLD, alpha: 0.45 * alpha });
    stamp(g, 'ringSoft', x, y, (r * 2) / 0.7, (r * 0.6) / 0.7, { tint: HOLY_GOLD, alpha: 0.8 * alpha });
    g.ellipse(x, y, r, r * 0.3).stroke({ width: 1.5, color: HOLY_PALE, alpha });
    g.ellipse(x, y - 0.5, r, r * 0.3).stroke({ width: 0.8, color: 0xFFFFFF, alpha });
    const a = f * 0.2;
    stamp(g, 'twinkle', x + Math.cos(a) * r, y + Math.sin(a) * r * 0.3, 7, 7, { tint: 0xFFFFFF, alpha });
    return;
  }
  g.ellipse(x, y, r + 2, r * 0.3 + 2).stroke({ width: 5, color: HOLY_GOLD, alpha: 0.25 * alpha });
  g.ellipse(x, y, r, r * 0.3).stroke({ width: 2, color: HOLY_PALE, alpha });
  g.ellipse(x, y - 0.5, r, r * 0.3).stroke({ width: 1, color: 0xFFFFFF, alpha });
  const a = f * 0.2;
  g.rect(x + Math.cos(a) * r - 1, y + Math.sin(a) * r * 0.3 - 1, 2, 2).fill({ color: 0xFFFFFF, alpha });
}

/** Radiant greatsword pointing down, its tip at (x, tip): winged crossguard, sapphire, pommel. */
function holyBlade(g: Graphics, x: number, tip: number, len: number, alpha = 1) {
  if (alpha <= 0) return;
  const guardY = tip - len * 0.7;
  const w = Math.max(3, len * 0.085);
  if (fxReady()) {
    // Radiance along the blade, then a two-facet edge: lit left facet, cool right facet, white fuller
    stamp(g, 'beam', x, (tip + guardY) / 2, len * 0.75, w * 6, { rot: Math.PI / 2, tint: HOLY_GOLD, alpha: 0.45 * alpha });
    g.poly([x, tip, x + w, tip - len * 0.16, x + w, guardY, x - w, guardY, x - w, tip - len * 0.16])
      .fill({ color: 0x94A3B8, alpha }).stroke({ width: 1.5, color: INK, alpha });
    g.poly([x, tip, x - w, tip - len * 0.16, x - w, guardY, x, guardY]).fill({ color: 0xF1F5F9, alpha });
    g.poly([x, tip - 3, x + w * 0.25, tip - len * 0.16, x + w * 0.25, guardY, x - w * 0.25, guardY, x - w * 0.25, tip - len * 0.16])
      .fill({ color: 0xFFFFFF, alpha });
    stamp(g, 'flare', x, tip, w * 7, w * 7, { tint: HOLY_PALE, alpha });
  } else {
    g.poly([x, tip, x + w, tip - len * 0.16, x + w, guardY, x - w, guardY, x - w, tip - len * 0.16])
      .fill({ color: 0xE2E8F0, alpha }).stroke({ width: 1.5, color: INK, alpha });
    g.poly([x, tip - 3, x + w * 0.4, tip - len * 0.16, x + w * 0.4, guardY, x - w * 0.4, guardY, x - w * 0.4, tip - len * 0.16])
      .fill({ color: 0xFFFFFF, alpha });
  }
  const span = len * 0.3;
  g.poly([x - span, guardY - 7, x - w * 1.3, guardY + 1, x + w * 1.3, guardY + 1, x + span, guardY - 7, x + w * 1.3, guardY - 3, x - w * 1.3, guardY - 3])
    .fill({ color: HOLY_GOLD, alpha }).stroke({ width: 1.5, color: INK, alpha });
  g.rect(x - w * 0.55, guardY - len * 0.2, w * 1.1, len * 0.2 - 3).fill({ color: 0x92400E, alpha }).stroke({ width: 1, color: INK, alpha });
  orb(g, x, guardY - len * 0.22, w * 0.9, P_DECREE, alpha);
  g.circle(x, guardY - 1, w * 0.5).fill({ color: 0x38BDF8, alpha }).stroke({ width: 1, color: INK, alpha });
}

/** Hexagonal aegis tile, `r` across, flattened by `squash` as it turns edge-on. */
function hexTile(g: Graphics, x: number, y: number, r: number, squash: number, alpha = 1) {
  if (r <= 0.5 || alpha <= 0) return;
  const pts: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    pts.push(x + Math.cos(a) * r * squash, y + Math.sin(a) * r);
  }
  if (fxReady()) stamp(g, 'bloom', x, y, r * 2.6 * squash, r * 2.6, { tint: HOLY_GOLD, alpha: 0.5 * alpha });
  g.poly(pts).fill({ color: HOLY_GOLD, alpha: 0.45 * alpha }).stroke({ width: 3, color: HOLY_GOLD, alpha: 0.6 * alpha });
  g.poly(pts).stroke({ width: 1, color: 0xFFFFFF, alpha });
  g.circle(x, y, 1.5).fill({ color: 0xFFFFFF, alpha });
}

/** Feathers of light drifting down around a point. */
const feathers = (h: KnightMoveHost, x: number, y: number, n = 2, spread = 26) =>
  h.emit(x + rand(-spread, spread), y + rand(-10, 6), { count: n, colors: [HOLY_WHITE, HOLY_PALE, 0xFFFFFF], speed: [0.15, 0.5], angle: Math.PI / 2, spread: 1.2, gravity: 0.006, size: 2, life: [30, 50] });

/** Golden grit bursting from a holy impact. */
const holySparks = (h: KnightMoveHost, x: number, y: number, n: number, power = 1) =>
  h.emit(x, y, { count: n, colors: [HOLY_WHITE, HOLY_PALE, HOLY_GOLD, 0xFFFFFF], speed: [1.4 * power, 4.2 * power], angle: -Math.PI / 2, spread: 1.3, gravity: 0.12, size: 2, life: [14, 28] });

/**
 * Heaven's Smite: the knight presses Excalibell to lockout and rises on wings of light; a beam from the bell
 * opens the sky, judgement shafts lock onto every foe, and colossal holy blades plunge down on each in turn.
 */
function heavensSmite(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h);
  const cx = foes.reduce((s, t) => s + t.x, 0) / foes.length;
  const RAISE = 6; // SKILL2TULUC from 6 is locked out overhead by 16 (raiseAndHold freezes it there)
  const CALL = 24; // the bell's beam pierces the sky
  const OPEN = 32; // the heavens open over the foes
  const SMITE = 50; // the first blade lands
  const GAP = 6;
  const LAST = SMITE + GAP * (foes.length - 1);
  const END = LAST + 34;
  const SKY = 66; // just under the top of the frame

  tl.at(0, () => {
    h.anim('JUMP_FRONT_START');
    h.camera(1.32, h.home.x + 6, h.home.y - 34, CALL - 2);
    h.sound('holy', { rate: 0.55, vol: 0.7 });
  });
  tl.during(0, RAISE, (t) => h.stretch(1 + 0.1 * t, 1 - 0.12 * t));
  tl.during(RAISE, RAISE + 6, (t) => h.stretch(lerp(0.92, 1, t), lerp(1.1, 1, t)));
  raiseAndHold(h, tl, RAISE, LAST + 10);
  castCircle(h, tl, 0, CALL + 4, L_DECREE, { r: 40 });
  aura(h, tl, 0, CALL + 2, L_DECREE, { scale: 1.1 });
  breath(h, tl, CALL - 6, 6, L_DECREE, { freeze: false });
  dutch(h, tl, CALL, -0.06, OPEN - CALL + 6, false);
  dutch(h, tl, SMITE, 0.08, LAST - SMITE + 8);
  tl.during(RAISE, CALL, (t) => h.lift(easeOut(t) * 16));
  tl.during(LAST + 10, END - 10, (t) => h.lift(lerp(16, 0, easeInOut(t))));
  tl.at(END - 10, () => h.sound('thud', { vol: 0.4 }));
  tl.during(0, 16, (t) => h.dim(0.74 * t, HOLY_NIGHT));
  tl.during(END - 20, END, (t) => h.dim(0.74 * (1 - t), HOLY_NIGHT));
  tl.every(RAISE, CALL, 3, () => h.ghost(HOLY_GOLD, 0.45, 16));
  chargeFx(h, tl, RAISE, CALL, () => h.weaponTip(), P_DECREE, 36, 14);

  // Wings of light and a halo open behind him and stay for the whole judgement
  lightSpan(h, tl, RAISE, END - 6, (g, t, f) => {
    const p = h.pos();
    const open = easeOut(Math.min(1, f / 14));
    const fade = t > 0.82 ? 1 - (t - 0.82) / 0.18 : 1;
    const beat = Math.sin(f * 0.22) * 0.08;
    wing(g, p.x - 8, p.y - 46, 62 * open, -1, open * (0.95 + beat), P_DECREE, 0.95 * fade);
    wing(g, p.x + 8, p.y - 46, 48 * open, 1, open * (0.85 + beat), P_DECREE, 0.7 * fade);
    halo(g, p.x + 1, p.y - 70, 10 * open, f, fade);
  }, 'back');
  tl.every(RAISE + 8, LAST + 10, 4, () => feathers(h, h.pos().x, h.pos().y - 40));

  // The call: a beam from the bell punches through the sky; cut wide to reveal the heavens
  tl.at(CALL, () => {
    h.flash(0.2, 0xFFF3C4);
    h.shake(6);
    h.camera(1.0, 213, h.home.y - 60, LAST - CALL + 14);
    h.sound('beam', { rate: 0.7 });
    h.sound('holy', { rate: 1.1 });
    h.sound('impact_metal', { rate: 0.6, vol: 0.6 });
  });
  lightSpan(h, tl, CALL, OPEN + 14, (g, t) => {
    const p = h.weaponTip();
    const w = t < 0.12 ? lerp(2, 14, t / 0.12) : lerp(14, 1, easeIn((t - 0.12) / 0.88));
    godRay(g, p.x, 0, p.y, w, w * 0.8, HOLY_GOLD, 1 - t * 0.4);
    glint(g, p.x, p.y, 22 * (1 - t) + 6, t * 0.6, HOLY_WHITE, 1 - t * 0.3);
  });

  // The sky opens: a radiant gate turning over the foes
  tl.at(OPEN, () => h.sound('portal', { rate: 0.7, vol: 0.6 }));
  lightSpan(h, tl, OPEN, END - 6, (g, t, f) => {
    const a = easeOut(Math.min(1, f / 12)) * (t > 0.78 ? 1 - (t - 0.78) / 0.22 : 1);
    const flare = f >= LAST - OPEN && f < LAST - OPEN + 12 ? 1 - (f - (LAST - OPEN)) / 12 : 0;
    const s = a * (1 + flare * 0.25);
    for (let k = 0; k < 9; k++) {
      const x = cx + (k - 4) * 26 * s;
      godRay(g, x, SKY, SKY + 70 + 20 * hash(k), 4 * s, 16 * s, HOLY_GOLD, (0.16 + 0.3 * flare) * a * (0.6 + 0.4 * Math.sin(f * 0.1 + k)));
    }
    g.ellipse(cx, SKY, 110 * s, 12 * s).fill({ color: HOLY_GOLD, alpha: 0.3 * a + 0.3 * flare });
    for (let k = 0; k < 3; k++) {
      g.ellipse(cx, SKY, (52 + k * 30) * s, (6 + k * 3) * s).stroke({ width: 2 - k * 0.5, color: k ? HOLY_PALE : 0xFFFFFF, alpha: a * (0.9 - k * 0.25) });
    }
    for (let k = 0; k < 16; k++) {
      const ang = f * 0.03 + (k / 16) * Math.PI * 2;
      g.rect(cx + Math.cos(ang) * 82 * s - 1, SKY + Math.sin(ang) * 9 * s - 1, 2, 2).fill({ color: 0xFFFFFF, alpha: a });
    }
    g.ellipse(cx, SKY, 40 * s, 4 * s).fill({ color: HOLY_PALE, alpha: 0.5 * a });
  });

  foes.forEach((t, i) => {
    const at = SMITE + i * GAP;
    const c = chest(t);
    const big = i === foes.length - 1;
    // Judgement locks on: a thin shaft behind the foe and a rune closing round its feet
    lightSpan(h, tl, OPEN + 4 + i * 3, at, (g, u) => godRay(g, t.x, SKY, t.y, 2 + 4 * u, 4 + 18 * easeIn(u), HOLY_PALE, 0.35 + 0.4 * u), 'back');
    lightSpan(h, tl, OPEN + 4 + i * 3, at + 2, (g, u, f) => runeCircle(g, t.x, t.y, lerp(42, 20, easeIn(u)), f * 0.08, P_DECREE, Math.min(1, f / 8)), 'ground');
    tl.at(OPEN + 4 + i * 3, () => h.sound('rune', { rate: 1 + i * 0.15, vol: 0.4 }));

    // A colossal blade plunges from the gate, trailing light
    const DROP = 7;
    tl.at(at - DROP, () => h.sound('whistle', { rate: 1.6, vol: 0.45 }));
    const tipAt = (u: number) => lerp(SKY - 20, t.y + 4, easeIn(u));
    lightSpan(h, tl, at - DROP, at + 1, (g, u) => {
      const tip = tipAt(u);
      godRay(g, t.x, SKY, tip, 6, 12, HOLY_GOLD, 0.6);
      for (let k = 1; k <= 3; k++) holyBlade(g, t.x, tipAt(Math.max(0, u - k * 0.12)), 84, 0.3 / k);
    });
    // Its glow stays on while it stands embedded
    lightSpan(h, tl, at - DROP, at + 26, (g, _u, f) => {
      const fade = f <= DROP + 10 ? 1 : 1 - (f - DROP - 10) / 16;
      const tip = tipAt(Math.min(1, f / DROP));
      g.ellipse(t.x, tip - 34, 12, 46).fill({ color: HOLY_GOLD, alpha: 0.3 * fade });
      g.ellipse(t.x, tip - 30, 5, 38).fill({ color: HOLY_PALE, alpha: 0.35 * fade });
    }, 'back');
    drawSpan(h, tl, at - DROP, at + 26, (g, _u, f) => {
      const u = Math.min(1, f / DROP);
      const fade = f <= DROP + 10 ? 1 : 1 - (f - DROP - 10) / 16;
      holyBlade(g, t.x, tipAt(u), 84, fade);
    });
    tl.every(at + 14, at + 26, 3, () => h.emit(t.x + rand(-4, 4), t.y - rand(10, 50), { count: 2, colors: [HOLY_WHITE, HOLY_PALE], speed: [0.2, 0.6], angle: -Math.PI / 2, spread: 0.5, gravity: -0.02, size: 2, life: [18, 30] }));

    // Contact: a pillar of light detonates on the foe
    lightSpan(h, tl, at, at + 20, (g, u) => {
      const w = 34 * (1 - easeOut(u)) + 2;
      godRay(g, t.x, 30, t.y, w * 0.6, w, 0xFFF3C4, 1 - u);
      glint(g, c.x, c.y, 34 * (1 - u) + 6, u * 0.4, HOLY_WHITE, 1 - u);
    });
    ringFx(h, tl, at, { x: t.x, y: t.y }, 6, big ? 90 : 60, HOLY_PALE, 20, 4);
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: big ? 1.2 : 0.8, glare: big ? 0.15 : 0.35, tint: 0xFFF1B8, flash: 0xFFF7D6, burst: 'crater', burstSize: big ? 1.3 : 1, sfx: 'stab' });
      if (big) {
        impactFrame(h, tl, c, { color: HOLY_GOLD, dim: [0.74, HOLY_NIGHT], hold: 4 });
        h.roll(-0.1, 10, true);
        signature(h, tl, tl.frame, c, L_DECREE, 50);
      }
      h.knock(i, 3, -8);
      h.sound('holy', { rate: 1 + i * 0.12, vol: 0.7 });
      holySparks(h, t.x, t.y - 6, big ? 22 : 14);
      if (i === 0) h.camera(1.14, cx, h.home.y - 50, 10, true);
    });
  });

  // Finale: the gate flares and every foe burns white
  tl.at(LAST + 4, () => {
    h.flash(0.1, 0xFFF7D6);
    h.shake(10);
    h.sound('impact_crit', { rate: 0.8, vol: 0.8 });
    foes.forEach((_, i) => h.flashTarget(i, 0xFFFFFF, 8));
  });
  tl.end(END);
}

/**
 * Righteous Onslaught: SKILL3RADON's barrage reforged in light. He blinks onto the first foe and cuts twice,
 * leaps out of sight and descends down a shaft of judgement on the next for a four-cut flurry, then falls from
 * heaven once more to brand the last with a cross. Gold afterimages chase every cut; the rig's fire trails and
 * blue burst are hidden and redrawn as holy light. One chain hit lands at the end of each phase.
 */
function righteousOnslaught(h: KnightMoveHost, tl: Timeline) {
  const hits = each(h); // CHAIN: one entry per strike, a foe can repeat
  const n = hits.length;
  const SPEED = 1.2;
  const R = (rigFrame: number) => Math.round(rigFrame / SPEED); // SKILL3RADON frame → move frame
  // Three phases (opening pair, flurry after the first dive, crash after the second); the chain hit each lands
  const seg = [0, Math.min(1, n - 1), n - 1];
  const lands = n >= 3 ? [0, 1, 2] : n === 2 ? [0, -1, 1] : [-1, -1, 0];
  const spot = seg.map((i) => strikeSpot(h, hits[i], 46));
  const GHOST = 0xFFD86B;

  // The rig's own cuts are fire (PunchFx_Skill3 sweeps, Normal_Slash thrust) and its landing burst is blue
  const reskin = () => {
    h.fxSlot('PunchFx_Skill3', 0, 0);
    h.fxSlot('Normal_Slash', 0, 0);
    h.fxSlot('Light', 0, 0);
    h.fxSlot('Dash_Mash', 0xFFC53D, 0.55);
  };

  /** A cut that doesn't deal the chain hit: flash, spark, a sliver of hit-stop. */
  const chip = (i: number) => {
    const c = chest(hits[i]);
    h.flashTarget(i, 0xFFF1B8, 4);
    h.knock(i, 4, 1);
    h.shake(4);
    h.hitStop(2);
    h.sound('impact', { rate: 1.2, vol: 0.55 });
    holySparks(h, c.x, c.y, 8);
  };
  const strike = (s: number, big: boolean) => {
    const i = seg[s];
    const c = chest(hits[i]);
    if (lands[s] < 0) return chip(i);
    land(h, h.targets.length ? lands[s] : undefined, { scale: big ? 1.45 : 1, glare: big ? 0.3 : 0.35, tint: 0xFFFFFF, flash: 0xFFF3C4, burst: big ? 'crater' : 'slash', burstSize: big ? 1.4 : 1, sfx: big ? 'impact_crit' : undefined });
    h.knock(i, big ? 16 : 10, big ? -6 : 3);
    h.sound('holy', { rate: big ? 0.9 : 1.3, vol: 0.6 });
    holySparks(h, c.x, c.y, big ? 26 : 14, big ? 1.2 : 1);
  };

  tl.at(0, () => {
    h.anim('SKILL3RADON');
    h.animSpeed(SPEED);
    reskin();
    h.sound('holy', { rate: 0.8, vol: 0.6 });
    h.sound('portal', { rate: 1.4, vol: 0.5 });
  });
  tl.during(0, 12, (t) => h.dim(0.75 * t, HOLY_NIGHT));

  // Blink in: he leaves home in a column of light and resolves out of one in front of the first foe
  const homeX = h.home.x;
  lightSpan(h, tl, 0, 12, (g, t) => {
    godRay(g, homeX, 40, h.home.y, 10 * (1 - t), 18 * (1 - t), HOLY_GOLD, 1 - t);
    glint(g, homeX, h.home.y - 30, 26 * (1 - t), 0, HOLY_WHITE, 1 - t);
  });
  tl.at(1, () => h.offset(spot[0].x, spot[0].y));
  lightSpan(h, tl, R(2), R(20), (g, t, f) => {
    const p = h.pos();
    godRay(g, p.x + 2, 40, p.y, 6 + 6 * t, 14 + 12 * (1 - t), HOLY_GOLD, 1 - t * t);
    halo(g, p.x + 1, p.y - 70, 10 * easeOut(Math.min(1, f / 6)), f, 1 - t);
  });
  tl.at(R(14), () => {
    h.camera(1.25, hits[seg[0]].x - 40, h.home.y - 32, R(56) - R(14));
    h.sound('magic', { rate: 1.5, vol: 0.5 });
  });

  // The cuts: the rig's sweeps (rig frames), low rising / high falling, redrawn as gold crescents
  const SWEEPS: { at: number; s: number; low: boolean; hit: number }[] = [
    { at: 22, s: 0, low: true, hit: 28 }, { at: 42, s: 0, low: false, hit: 48 },
    { at: 82, s: 1, low: true, hit: 86 }, { at: 94, s: 1, low: false, hit: 98 },
    { at: 108, s: 1, low: true, hit: 112 }, { at: 120, s: 1, low: false, hit: 124 },
  ];
  SWEEPS.forEach((w, k) => {
    const c = chest(hits[seg[w.s]]);
    const arcO = w.low
      ? { x: c.x - 16, y: c.y - 4, r: 36, a0: 2.5, a1: -0.7, thick: 13, p: P_DECREE, dur: R(14) }
      : { x: c.x - 16, y: c.y + 2, r: 36, a0: -2.5, a1: 0.7, thick: 13, p: P_DECREE, dur: R(14) };
    tl.at(R(w.at), () => swingSound(h, k % 2 === 1, { rate: 1.05 + k * 0.04 }));
    slashFx(h, tl, R(w.hit) - 3, arcO);
    lightSpan(h, tl, R(w.hit) - 2, R(w.hit) + 10, (g, u) => {
      crescent(g, arcO.x, arcO.y, arcO.r + 8, arcO.a0, arcO.a1, 22 * (1 - u), P_DECREE, 0.45 * (1 - u));
      glint(g, c.x, c.y, 26 * (1 - u) + 4, 0.4, HOLY_WHITE, 1 - u);
    });
    // A bright echo of the cutting pose hangs in the air
    tl.at(R(w.hit), () => {
      h.ghost(0xFFFBEA, 0.75, 22);
      const last = k === 1 || k === SWEEPS.length - 1;
      if (last) {
        strike(w.s, false);
        h.camera(1.32, c.x - 26, c.y + 4, 10, true);
      } else chip(seg[w.s]);
    });
  });
  // The gold trail behind every move he makes
  for (const [a, b] of [[16, 56], [66, 130]]) tl.every(R(a), R(b), 2, () => h.ghost(GHOST, 0.5, 14));

  // Two descents from heaven: he leaps out of frame, the next foe is marked by a shaft of judgement, and he
  // dives down it (rig: up by 62 / 142, down by 66 / 146)
  const dive = (s: number, up: number, top: number, down: number) => {
    const t = hits[seg[s]];
    tl.at(R(up), () => {
      h.sound('jump', { vol: 0.7 });
      swingSound(h, true);
    });
    tl.every(R(up), R(top), 1, () => h.ghost(0xFFF3C4, 0.5, 12));
    lightSpan(h, tl, R(up), R(down) + 1, (g, u) => godRay(g, t.x - 20, 40, t.y, 4 + 10 * u, 10 + 30 * easeIn(u), HOLY_PALE, 0.4 + 0.5 * u), 'back');
    lightSpan(h, tl, R(up), R(down) + 4, (g, u, f) => runeCircle(g, t.x - 20, t.y, lerp(46, 24, easeIn(u)), f * 0.1, P_DECREE, Math.min(1, f / 6)), 'ground');
    tl.at(R(top) - 1, () => {
      h.offset(spot[s].x, spot[s].y);
      h.sound('whistle', { rate: 1.7, vol: 0.5 });
      h.camera(1.15, t.x - 30, h.home.y - 44, 14);
    });
    tl.every(R(top), R(down) + 1, 1, () => h.ghost(0xFFFBEA, 0.6, 12));
    lightSpan(h, tl, R(top), R(down) + 3, (g, u) => {
      const p = h.pos();
      godRay(g, p.x, 40, p.y, 8, 20, HOLY_GOLD, 0.8 * (1 - u * 0.5));
    });
  };
  dive(1, 54, 62, 66);
  dive(2, 128, 142, 146);

  // First landing: the blue burst becomes a crown of gold light
  tl.at(R(66), () => {
    const p = h.pos();
    h.shake(9);
    h.hitStop(4);
    h.camera(1.2, p.x + 20, p.y - 30, R(130) - R(66), true);
    h.sound('impact_heavy', { vol: 0.8 });
    h.sound('holy', { rate: 1.1, vol: 0.6 });
    h.sound('block', { rate: 0.5, vol: 0.6 });
    h.vfx('shockwave', p.x + 8, p.y - 8, { size: 1.1 });
    holySparks(h, p.x + 8, p.y - 4, 18, 1.1);
  });
  lightSpan(h, tl, R(66), R(66) + 16, (g, u) => {
    const p = h.pos();
    starburst(g, p.x + 6, p.y - 30, 44 * easeOut(u) + 6, 12, u * 0.6, P_DECREE, 0.6 * (1 - u));
    glint(g, p.x + 6, p.y - 30, 40 * (1 - u) + 6, 0, HOLY_WHITE, 1 - u);
  });
  ringFx(h, tl, R(66), () => ({ x: h.pos().x + 6, y: h.pos().y }), 8, 80, HOLY_PALE, 18, 4);

  // Final crash: a lance of light rides the dive, and a cross is seared through the last foe
  const fin = hits[seg[2]];
  const fc = chest(fin);
  const HIT = R(148);
  lightSpan(h, tl, R(142), HIT - 1, (g, u) => {
    const tip = h.weaponTip();
    lance(g, tip.x - 14, tip.y - 50, tip.x, tip.y, 10, P_DECREE, 0.8);
    glint(g, tip.x, tip.y, 16, u, HOLY_WHITE);
  });
  tl.at(HIT - 4, () => swingSound(h, true));
  lightSpan(h, tl, HIT, HIT + 26, (g, u) => {
    const v = easeOut(Math.min(1, u * 4));
    const a = u < 0.4 ? 1 : 1 - (u - 0.4) / 0.6;
    godRay(g, fc.x, fc.y - 70 * v, fc.y + 40 * v, 10, 10, HOLY_GOLD, a);
    g.rect(fc.x - 40 * v, fc.y - 12, 80 * v, 10).fill({ color: HOLY_GOLD, alpha: 0.35 * a });
    g.rect(fc.x - 36 * v, fc.y - 9, 72 * v, 4).fill({ color: 0xFFFFFF, alpha: 0.9 * a });
    glint(g, fc.x, fc.y - 7, 46 * (1 - u) + 8, 0, HOLY_WHITE, a);
  });
  ringFx(h, tl, HIT, { x: fin.x, y: fin.y }, 8, 100, HOLY_PALE, 22, 5);
  tl.at(HIT, () => {
    strike(2, true);
    impactFrame(h, tl, fc, { color: HOLY_GOLD, dim: [0.85, HOLY_NIGHT], hold: 4 });
    h.roll(-0.12, 12, true);
    signature(h, tl, HIT, fc, L_ONSLAUGHT, 58, 24);
    h.ghost(0xFFFBEA, 0.8, 26);
    h.camera(1.4, fc.x - 14, fc.y, 16, true);
    h.sound('block', { rate: 0.42, vol: 0.9 }); // the bell rings out
  });
  tl.every(HIT + 2, HIT + 20, 3, () => feathers(h, fc.x, fc.y - 10, 2, 20));

  // Blink home: a column of light where he stood, and he resolves out of another at home
  const BACK = R(160) + 2;
  lightSpan(h, tl, BACK, BACK + 14, (g, t) => {
    godRay(g, h.home.x, 40, h.home.y, 10 * (1 - t), 18 * (1 - t), HOLY_GOLD, 1 - t);
    glint(g, h.home.x, h.home.y - 30, 22 * (1 - t), 0, HOLY_WHITE, 1 - t);
  });
  tl.at(BACK, () => {
    h.ghost(0xFFF3C4, 0.7, 18);
    h.offset(0, 0);
    h.idle();
    h.sound('portal', { rate: 1.6, vol: 0.4 });
  });
  tl.during(BACK - 6, BACK + 12, (t) => h.dim(0.85 * (1 - t), HOLY_NIGHT));
  tl.end(BACK + 14);
}

/**
 * Dawn's Aegis Toll: in the dark before dawn the knight slams Excalibell into the stone like a cathedral bell;
 * the sun rises behind him, a wall of dawnlight rolls through the foe and the one behind it, shattering
 * their guard, and the light settles round him as a hexagonal aegis.
 */
function dawnsAegis(h: KnightMoveHost, tl: Timeline) {
  const foes = each(h); // PIERCE: the target, then the foe behind it
  const PLANT = 30; // ANIME_METEOR_SLAM lands at f30
  const ox = h.home.x + 30; // where the bell strikes the floor
  const oy = h.home.y;
  const DAWN = 0x0A0618;
  const reach = Math.max(...foes.map((t) => t.x)) + 70 - ox;
  const WAVE = 24;
  const front = (u: number) => ox + 10 + (reach - 10) * easeOut(u);
  const AEGIS = PLANT + 22;
  const GUARD = AEGIS + 22;
  const END = GUARD + 18;

  tl.at(0, () => {
    h.anim('ANIME_METEOR_SLAM');
    h.camera(1.32, h.home.x + 14, h.home.y - 36, PLANT - 2);
    h.sound('holy', { rate: 0.5, vol: 0.6 });
    chargeSound(h, PLANT);
  });
  tl.during(0, 18, (t) => h.dim(0.75 * t, DAWN));
  chargeUp(h, tl, 0, PLANT - 2, L_DAWN, { circle: 40, aura: 1.1 });
  dutch(h, tl, PLANT, 0.08, 12);
  tl.every(16, PLANT - 2, 3, () => h.ghost(HOLY_GOLD, 0.4, 14));
  chargeFx(h, tl, 8, PLANT, () => h.weaponTip(), P_DECREE, 34, 14);
  tl.at(PLANT - 6, () => swingSound(h, true));

  // The sun rises behind him: a slow climb, then it blazes up on the toll
  lightSpan(h, tl, 2, END - 4, (g, t, f) => {
    const rise = easeOut(Math.min(1, f / PLANT));
    const blaze = f > PLANT ? Math.max(0, 1 - (f - PLANT) / 30) : 0;
    const fade = t > 0.72 ? 1 - (t - 0.72) / 0.28 : 1;
    const x = h.home.x - 8;
    const y = h.home.y - 10 - rise * 26;
    const r = 18 + 10 * rise + 16 * blaze;
    for (let k = 0; k < 14; k++) {
      const a = Math.PI + ((k + 0.5) / 14) * Math.PI + Math.sin(f * 0.02) * 0.06;
      const len = r * (2.4 + 0.8 * hash(k)) * (0.6 + 0.4 * rise);
      const s = 0.07;
      g.poly([x + Math.cos(a - s) * r, y + Math.sin(a - s) * r, x + Math.cos(a) * len, y + Math.sin(a) * len, x + Math.cos(a + s) * r, y + Math.sin(a + s) * r])
        .fill({ color: k % 2 ? HOLY_PALE : HOLY_GOLD, alpha: (0.14 + 0.2 * blaze) * fade * rise });
    }
    g.circle(x, y, r * 1.6).fill({ color: 0xF97316, alpha: 0.1 * fade * rise });
    g.circle(x, y, r).fill({ color: HOLY_GOLD, alpha: (0.3 + 0.3 * blaze) * fade * rise });
    g.circle(x, y, r * 0.65).fill({ color: HOLY_WHITE, alpha: (0.35 + 0.4 * blaze) * fade * rise });
    // Horizon line of first light along the floor
    g.ellipse(x + 40, oy - 2, 120 * rise, 4).fill({ color: HOLY_GOLD, alpha: (0.2 + 0.25 * blaze) * fade });
  }, 'back');

  // The toll: the bell meets the stone
  tl.at(PLANT, () => {
    h.hitStop(6);
    h.stretch(1.14, 0.86);
    h.flash(0.2, 0xFFF3C4);
    h.shake(12);
    h.camera(1.0, 213, h.home.y - 50, GUARD - PLANT, true);
    h.dim(0.8, DAWN);
    h.sound('block', { rate: 0.36, vol: 1.15 }); // BONG
    h.sound('impact_heavy', { vol: 0.8 });
    h.sound('holy');
    h.sound('quake', { vol: 0.5 });
    h.vfx('shockwave', ox, oy - 8, { size: 1.3 });
    h.vfx('summon', h.home.x + 4, oy, { anim: 'animation2', size: 1.5, squash: 0.35, layer: 'ground', tint: 0xFDE047 });
    holySparks(h, ox, oy - 4, 22, 1.1);
  });
  tl.at(PLANT + 5, () => h.stretch(1, 1));
  lightSpan(h, tl, PLANT, PLANT + 16, (g, u) => {
    godRay(g, ox, 40, oy, 8 * (1 - u) + 1, 26 * (1 - u) + 2, HOLY_GOLD, 1 - u);
    glint(g, ox, oy - 8, 40 * (1 - u) + 6, 0, HOLY_WHITE, 1 - u);
  });
  // Echoes of the bell
  [PLANT + 14, PLANT + 28].forEach((at, k) => {
    tl.at(at, () => {
      h.sound('block', { rate: 0.4 + k * 0.04, vol: 0.55 - k * 0.2 });
      h.shake(4 - k * 2);
    });
    lightSpan(h, tl, at, at + 18, (g, u) => {
      for (let j = 0; j < 2; j++) {
        const r = (12 + 70 * easeOut(u)) * (1 - j * 0.3);
        g.ellipse(ox, oy - 4, r, r * 0.28).stroke({ width: 2, color: HOLY_PALE, alpha: (1 - u) * (0.7 - k * 0.25) });
      }
    }, 'ground');
  });

  // A wall of dawnlight rolls down the line
  crackFx(h, tl, PLANT, { x: ox, y: oy + 2 }, { x: ox + reach, y: oy + 2 }, P_DECREE, WAVE * 0.6, 50);
  tl.at(PLANT + 2, () => h.sound('wave', { rate: 1.4, vol: 0.5 }));
  lightSpan(h, tl, PLANT, PLANT + WAVE + 8, (g, t, f) => {
    const u = Math.min(1, f / WAVE);
    const fade = f > WAVE ? 1 - (f - WAVE) / 8 : 1;
    const x = front(u);
    const grow = 0.5 + 0.5 * Math.min(1, f / 6);
    // A standing wall of dawnlight, brightest at its leading edge, smearing back toward the knight
    const tail = Math.min(70, x - ox - 6);
    if (tail > 0) {
      g.poly([x - tail, oy, x - tail * 0.5, oy - 30 * grow, x, oy - 74 * grow, x + 6, oy - 60 * grow, x + 8, oy]).fill({ color: HOLY_GOLD, alpha: 0.28 * fade });
      g.poly([x - tail * 0.5, oy, x - tail * 0.2, oy - 26 * grow, x + 1, oy - 64 * grow, x + 5, oy]).fill({ color: HOLY_PALE, alpha: 0.4 * fade });
    }
    g.ellipse(x + 2, oy - 34 * grow, 4, 34 * grow).fill({ color: 0xFFFFFF, alpha: 0.85 * fade });
    g.ellipse(x + 2, oy - 34 * grow, 12, 40 * grow).fill({ color: HOLY_GOLD, alpha: 0.3 * fade });
    g.rect(ox + 6, oy - 7, Math.max(0, x - ox - 6), 8).fill({ color: HOLY_GOLD, alpha: 0.3 * fade });
    g.rect(ox + 6, oy - 4, Math.max(0, x - ox - 6), 2).fill({ color: 0xFFFFFF, alpha: 0.8 * fade });
  });
  tl.every(PLANT + 2, PLANT + WAVE, 2, (i) => {
    const x = front(Math.min(1, (i * 2 + 2) / WAVE));
    h.emit(x, oy - 2, { count: 2, colors: [HOLY_WHITE, HOLY_PALE, HOLY_GOLD], speed: [0.8, 2.2], angle: -Math.PI / 2, spread: 0.5, gravity: -0.02, size: 2, life: [14, 24] });
  });

  // Each foe the wave reaches: light erupts through it and its guard shatters
  foes.forEach((t, i) => {
    const v = Math.min(1, Math.max(0, (t.x - 10 - ox - 10) / (reach - 10)));
    const at = PLANT + Math.max(2, Math.round((1 - Math.cbrt(1 - v)) * WAVE));
    const c = chest(t);
    lightSpan(h, tl, at, at + 18, (g, u) => {
      godRay(g, t.x, t.y - t.height - 40 * easeOut(u), t.y, 14 * (1 - u) + 2, 26 * (1 - u) + 2, HOLY_GOLD, 1 - u);
      glint(g, c.x, c.y, 30 * (1 - u) + 6, 0.2, HOLY_WHITE, 1 - u);
    });
    if (h.ctx.shatter) {
      // Its guard flashes up as a hex ward and splinters outward
      lightSpan(h, tl, at, at + 18, (g, u) => {
        for (let k = 0; k < 7; k++) {
          const ang = (k / 7) * Math.PI * 2 + u * 0.8;
          const r = lerp(10, 44, easeOut(u));
          hexTile(g, c.x + Math.cos(ang) * r, c.y + Math.sin(ang) * r * 0.8 + u * u * 20, 8 * (1 - u * 0.5), Math.abs(Math.cos(ang + u * 6)) * 0.7 + 0.3, 1 - u);
        }
      });
    }
    tl.at(at, () => {
      land(h, h.targets.length ? i : undefined, { scale: i ? 0.9 : 1.1, glare: i ? 0.35 : 0.15, tint: 0xFFF1B8, flash: 0xFFFFFF, sfx: 'impact_metal' });
      if (i === 0) {
        impactFrame(h, tl, c, { color: HOLY_GOLD, dim: [0.8, DAWN] });
        h.roll(-0.08, 10, true);
        signature(h, tl, tl.frame, c, L_DAWN, 48);
      }
      h.knock(i, 12, 6);
      h.sound('holy', { rate: 1.2 + i * 0.15, vol: 0.5 });
      if (h.ctx.shatter) {
        h.emit(c.x, c.y, { count: 16, colors: [0xFDE68A, 0xFFFFFF, HOLY_GOLD], speed: [2, 4.5], angle: -Math.PI / 2, spread: Math.PI, gravity: 0.18, size: 3, life: [14, 26] });
        h.sound('ice', { rate: 1.3, vol: 0.5 });
      }
    });
  });

  // The aegis: tiles of light gather from the dawn and lock into a dome around him
  tl.at(AEGIS - 2, () => {
    h.anim('DEFENSE');
    h.camera(1.25, h.home.x + 6, h.home.y - 32, END - AEGIS);
    h.sound('ward', { rate: 0.8, vol: 0.6 });
  });
  const tiles = Array.from({ length: 8 }, (_, k) => ({ a: (k / 8) * Math.PI * 2, row: k % 2 }));
  lightSpan(h, tl, AEGIS, GUARD + 8, (g, t, f) => {
    const p = { x: h.home.x + 2, y: h.home.y - 30 };
    const gather = easeOut(Math.min(1, f / 18));
    const lock = f > GUARD - AEGIS ? 1 - (f - (GUARD - AEGIS)) / 8 : 1;
    tiles.forEach((tile, k) => {
      const ang = tile.a + (1 - gather) * 2.2 + f * 0.01;
      const rx = lerp(70, 30, gather);
      const x = p.x + Math.cos(ang) * rx;
      const y = p.y + (tile.row ? -10 : 10) + Math.sin(ang) * 6 * gather;
      const depth = 0.55 + 0.45 * Math.abs(Math.cos(ang));
      hexTile(g, x, y, 11 * depth, Math.abs(Math.sin(ang)) * 0.6 + 0.4, lock * (0.5 + 0.5 * gather) * (k % 2 ? 0.9 : 1));
    });
    g.ellipse(p.x, p.y, 32 * gather, 38 * gather).fill({ color: HOLY_GOLD, alpha: 0.16 * gather * lock });
    g.ellipse(p.x, p.y, 34 * gather, 40 * gather).stroke({ width: 2, color: HOLY_PALE, alpha: 0.8 * gather * lock });
  });
  tl.every(AEGIS, GUARD, 4, () => feathers(h, h.home.x + 2, h.home.y - 50, 1, 30));
  tl.at(GUARD, () => {
    h.guard(0xFDE047);
    h.flash(0.25, 0xFFF3C4);
    h.sound('holy', { rate: 1.4, vol: 0.5 });
  });
  tl.during(GUARD - 4, END, (t) => h.dim(0.8 * (1 - t), DAWN));
  tl.end(END);
}

// ---------------------------------------------------------------------------------------------

/** One move per weapon spell templateId (src/types/weaponSpells.ts). */
export const SPELL_MOVES: Record<string, KnightMove> = {
  spell_iron_pendulum: ironPendulum,
  spell_caustic_deluge: staged(16, L_CAUSTIC, causticDeluge),
  spell_brood_sac: staged(14, L_BROOD, broodSac),
  spell_requiem_censer: requiemCenser,
  spell_brimstone_comet: brimstoneComet,
  spell_permafrost: permafrostShatter,
  spell_boulder_bowl: staged(18, LOOK.EARTH, boulderBowl, { circle: 36 }),
  spell_abyssal_anchor: abyssalAnchor,
  spell_maelstrom: krakensMaelstrom,
  spell_sunflare: sunflarePendulum,
  spell_wyrmchain: wyrmchainInferno,
  spell_molten_meteor: moltenMeteor,
  spell_event_horizon: eventHorizon,
  spell_gravity_well: gravityWell,

  spell_iron_toll: staged(16, L_TOLL, ironToll, { circle: 30 }),
  spell_spore_bloom: staged(16, L_SPORE, sporeBloom),
  spell_talon_gale: talonGale,
  spell_ironwood_grasp: staged(16, L_IRONWOOD, ironwoodGrasp, { circle: 38 }),
  spell_ley_fault: leyLineFault,
  spell_all_seeing_gaze: allSeeingGaze,
  spell_writhing_dark: staged(16, L_WRITHE, writhingDark, { circle: 40, lean: 0.04 }),
  spell_excalibur_decree: excaliburDecree,
  spell_dragon_breath: dragonsBreath,
  spell_wyrmheart_drive: wyrmheartDrive,
  spell_fallen_star: fallenStar,
  spell_gravity_snap: gravitySnap,

  spell_scrap_shrapnel: staged(14, L_SCRAP, scrapShrapnel, { circle: 30 }),
  spell_flanged_crush: flangedCrush,
  spell_ossuary_rattle: staged(16, L_OSSUARY, ossuaryRattle),
  spell_gravestone_toll: staged(16, L_GRAVE, gravestoneToll, { circle: 38 }),
  spell_cathedral_toll: cathedralToll,
  spell_basalt_fissure: staged(14, L_BASALT, basaltFissure, { circle: 38 }),
  spell_core_breach: coreBreach,
  spell_six_feet_under: sixFeetUnder,
  spell_blood_moon: bloodMoonRequiem,

  spell_kettleburne_oath: staged(14, L_OATH, kettleburneOath, { pose: 'DEFENSE', hold: 10, circle: 30 }),
  spell_lunar_hunt: staged(14, L_LUNAR, lunarHunt),
  spell_tusk_gore: staged(14, L_TUSK, tuskGore, { circle: 32 }),
  spell_labyrinth_execution: labyrinthExecution,
  spell_dragonheart_rend: dragonheartRend,
  spell_scorched_earth: scorchedEarth,
  spell_severed_moment: staged(14, L_TIME, severedMoment, { lean: 0 }),
  spell_singularity_edge: singularityEdge,

  spell_heavens_smite: heavensSmite,
  spell_righteous_onslaught: righteousOnslaught,
  spell_dawns_aegis: dawnsAegis,
};
