/**
 * Phantom Steed: procedural 32-bit pixel sprite for Phantom Cavalry — a spectral warhorse in dark barding
 * with a bone skull head, ghost-fire mane and tail, ridden by a caped lancer. Six gallop frames painted
 * pixel by pixel with the card-art painter (Layer + shadeAndOutline: rim light, core shadow, ink outline),
 * then ghost fire composited unshaded on top.
 *
 * Frames are 1 texel = 1 stage pixel (the stage is 426×240), so they sit crisply beside the rigs. They're
 * built per cast (~100 KB of VRAM) and destroyed with `destroySteed()` when the move ends.
 */
import { Texture } from 'pixi.js';
import { Layer, shadeAndOutline, mix } from '../components/cardArt';

export const STEED_W = 100;
export const STEED_H = 64;
/** Hoof line and the horse's centre in frame pixels (sprite anchor). */
export const STEED_GROUND = 61;
export const STEED_CX = 36;
/** Lance tip, relative to the anchor (where hits connect). */
export const STEED_TIP = { x: 99 - STEED_CX, y: 26 - STEED_GROUND };

const INK = 0x0A0F24;
const HIDE = [0x111A3A, 0x1E2A5A, 0x2E4A8C, 0x5B7FD0]; // spectral hide: shadow → highlight
const PLATE = [0x1A2238, 0x2C3754, 0x4A5878, 0x8A9AB8]; // barding & rider armour
const BONE = [0x6B7A99, 0xA9B6CC, 0xD8E2F0, 0xF8FAFF];
const GOLD = [0x8A5A0B, 0xD4A017, 0xFDE68A];
const CAPE = [0x24113D, 0x3B1E5C, 0x5B2E8C];
const GHOST = [0x1D4ED8, 0x60A5FA, 0x93C5FD, 0xE0F2FE, 0xFFFFFF];
const WOOD = [0x3B2414, 0x6B4423, 0x9A6B3C];

type L = Layer;

function ellipse(m: L, cx: number, cy: number, rx: number, ry: number, c: number) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) m.set(x, y, c);
    }
  }
}

/** A tapered limb segment from a to b, width w0 → w1. */
function limb(m: L, ax: number, ay: number, bx: number, by: number, w0: number, w1: number, c: number) {
  const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay)));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    m.disc(ax + (bx - ax) * t, ay + (by - ay) * t, (w0 + (w1 - w0) * t) / 2, c);
  }
}

/** Ghost-fire tongue from (x, y) streaming toward angle `a`, `len` long; `seed` flickers it per frame. */
function flame(fx: L, x: number, y: number, a: number, len: number, w: number, seed: number) {
  const n = Math.ceil(len);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const wob = Math.sin(t * 7 + seed * 1.9) * t * 2.2;
    const px = x + Math.cos(a) * len * t - Math.sin(a) * wob;
    const py = y + Math.sin(a) * len * t + Math.cos(a) * wob;
    const r = w * (1 - t) * (0.85 + 0.25 * Math.sin(seed * 2.3 + i));
    fx.disc(px, py, r + 0.6, GHOST[1]);
    if (r > 1.1) fx.disc(px, py, r * 0.6, GHOST[2]);
    if (r > 2) fx.disc(px, py, r * 0.3, GHOST[3]);
  }
  fx.set(x, y, GHOST[4]);
}

/** One leg: upper from the joint at angle a1 (radians from straight down, + = forward), lower at a2. */
function leg(m: L, x: number, y: number, a1: number, a2: number, back: boolean) {
  const up = 11;
  const lo = 11;
  const kx = x + Math.sin(a1) * up;
  const ky = y + Math.cos(a1) * up;
  const hx = kx + Math.sin(a2) * lo;
  const hy = ky + Math.cos(a2) * lo;
  const shade = back ? 0 : 1;
  limb(m, x, y, kx, ky, 6, 4, HIDE[shade + 1]);
  limb(m, kx, ky, hx, hy, 3.5, 2.5, HIDE[shade + 1]);
  m.disc(kx, ky, 1.6, back ? HIDE[1] : HIDE[3]); // knee highlight
  // Armoured greave over the cannon and an iron-shod hoof
  limb(m, lerp(kx, hx, 0.35), lerp(ky, hy, 0.35), lerp(kx, hx, 0.8), lerp(ky, hy, 0.8), 3.5, 3, back ? PLATE[1] : PLATE[2]);
  m.rect(hx - 2, hy - 1, 5, 3, back ? BONE[0] : BONE[1]);
  return { x: hx, y: hy };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Rotary gallop: each leg's swing phase; front pair leads, hind pair follows half a stride later. */
function gait(t: number, offset: number, front: boolean) {
  const p = ((t + offset) % 1) * Math.PI * 2;
  const a1 = 0.62 * Math.sin(p);
  const lift = Math.max(0, Math.sin(p + 0.9)); // recovery: knee folds while the leg swings forward
  const a2 = front ? a1 - lift * 1.35 : a1 + 0.25 + lift * 0.9;
  return { a1, a2 };
}

/** Paints gallop frame `k` of `n`. */
function paintFrame(k: number, n: number): Layer {
  const t = k / n;
  const bob = Math.round(-1.5 * Math.sin(t * Math.PI * 4)); // two bounces per stride
  const body = new Layer(STEED_W, STEED_H);
  const fx = new Layer(STEED_W, STEED_H);
  const Y = (y: number) => y + bob;

  // --- far-side legs (darker), behind the body
  leg(body, 46, Y(36), gait(t, 0.1, true).a1, gait(t, 0.1, true).a2, true);
  leg(body, 22, Y(35), gait(t, 0.6, false).a1, gait(t, 0.6, false).a2, true);

  // --- body: barrel, rump, chest, neck
  ellipse(body, 34, Y(30), 17, 8.5, HIDE[2]);
  body.disc(19, Y(29), 9, HIDE[2]); // rump
  body.disc(47, Y(29), 8, HIDE[2]); // chest
  body.poly([44, Y(24), 50, Y(9), 57, Y(7), 60, Y(13), 55, Y(28), 47, Y(34)], HIDE[2]); // neck
  // Belly shadow and back highlight bands
  ellipse(body, 33, Y(35), 14, 3, HIDE[1]);
  ellipse(body, 30, Y(23.5), 12, 2, HIDE[3]);
  body.line(50, Y(12), 46, Y(24), HIDE[3], 1.5);

  // --- barding: a plated caparison over the barrel with gold trim and rivets
  body.poly([22, Y(22), 46, Y(21), 50, Y(30), 44, Y(36), 24, Y(37), 16, Y(31)], PLATE[1]);
  body.poly([24, Y(23), 44, Y(22), 47, Y(28), 26, Y(29)], PLATE[2]);
  body.line(17, Y(32), 44, Y(36), GOLD[1], 1);
  body.line(16, Y(31), 22, Y(22), GOLD[1], 1);
  for (const x of [24, 30, 36, 42]) body.set(x, Y(33) + (x > 34 ? 1 : 0), GOLD[2]);
  // Chest plate (peytral)
  body.poly([48, Y(22), 56, Y(24), 54, Y(34), 47, Y(35)], PLATE[2]);
  body.line(48, Y(23), 55, Y(25), PLATE[3], 1);

  // --- skull head with a horned chanfron
  body.poly([54, Y(9), 58, Y(4), 66, Y(5), 74, Y(11), 76, Y(15), 72, Y(17), 63, Y(15), 57, Y(14)], BONE[1]);
  body.poly([58, Y(5), 66, Y(6), 72, Y(11), 63, Y(11), 58, Y(9)], BONE[2]); // brow highlight
  body.line(64, Y(15), 75, Y(15), BONE[0], 1); // jaw line
  for (const x of [67, 69, 71, 73]) body.set(x, Y(14), BONE[3]); // teeth
  body.poly([56, Y(5), 54, Y(-0) + 1, 59, Y(4)], BONE[2]); // horns
  body.poly([60, Y(4), 60, Y(0) + 1, 63, Y(4)], BONE[2]);
  body.poly([57, Y(6), 61, Y(6), 60, Y(11), 57, Y(10)], PLATE[2]); // chanfron plate
  body.disc(64.5, Y(9), 2, INK); // eye socket
  body.rect(73, Y(12), 2, 1, INK); // nostril

  // --- near-side legs
  const fl = gait(t, 0, true);
  const hl = gait(t, 0.5, false);
  leg(body, 48, Y(37), fl.a1, fl.a2, false);
  leg(body, 20, Y(36), hl.a1, hl.a2, false);

  // --- rider: tattered cape, plated torso, helm, arm and couched lance
  const capeWave = (i: number) => Math.round(Math.sin(t * Math.PI * 2 + i * 0.9) * 2);
  const cape: number[] = [33, Y(9), 36, Y(12), 30, Y(21)];
  for (let i = 0; i <= 4; i++) cape.push(26 - i * 4, Y(19 + i * 1.5) + capeWave(i) + (i % 2 ? 2 : 0));
  cape.push(10, Y(14) + capeWave(5), 22, Y(10) + capeWave(6));
  body.poly(cape, CAPE[1]);
  body.poly([33, Y(10), 26, Y(13) + capeWave(2), 18, Y(13) + capeWave(4), 28, Y(16)], CAPE[2]);
  limb(body, 37, Y(21), 40, Y(30), 4, 3, PLATE[1]); // thigh over the barding
  body.rect(39, Y(29), 3, 4, PLATE[2]); // sabaton in the stirrup
  body.poly([33, Y(8), 41, Y(8), 42, Y(21), 34, Y(22)], PLATE[1]); // torso
  body.poly([34, Y(9), 40, Y(9), 40, Y(14), 35, Y(15)], PLATE[3]); // breastplate shine
  body.line(34, Y(18), 41, Y(18), GOLD[1], 1); // belt
  body.disc(37, Y(4), 4, PLATE[2]); // helm
  body.rect(36, Y(3), 5, 1, INK); // visor slit
  body.disc(34, Y(9), 2.5, PLATE[3]); // pauldron
  limb(body, 38, Y(11), 45, Y(19), 3, 3, PLATE[2]); // lance arm
  // Lance: wooden shaft, vamplate guard, steel tip, pennant
  body.line(28, Y(19), 92, Y(25), WOOD[1], 2.5);
  body.line(42, Y(19.6), 92, Y(24.3), WOOD[2], 1);
  body.poly([45, Y(16), 48, Y(19), 46, Y(24), 43, Y(20)], PLATE[3]); // vamplate
  body.poly([91, Y(22), 99, Y(26), 91, Y(29)], BONE[2]);
  body.line(91, Y(25.5), 98, Y(26), BONE[3], 1);
  const flap = Math.round(Math.sin(t * Math.PI * 4) * 1.5);
  body.poly([84, Y(24), 74, Y(27) + flap, 78, Y(29) + flap, 72, Y(32) + flap, 83, Y(28)], CAPE[2]); // pennant

  shadeAndOutline(body, 0xC7D7FF, 0.4, 0.35);

  // --- ghost fire (unshaded, over the outline): mane, tail, plume, eyes, hoof wisps
  for (let i = 0; i < 5; i++) {
    const px = lerp(56, 48, i / 4);
    const py = Y(lerp(5, 19, i / 4));
    flame(fx, px, py, Math.PI + 0.35 - i * 0.12, 5 + (i % 2) * 2, 2.5, k + i);
  }
  flame(fx, 12, Y(25), Math.PI - 0.15, 14, 4, k + 7); // tail
  flame(fx, 13, Y(27), Math.PI + 0.25, 10, 3, k + 3);
  flame(fx, 36, Y(1), Math.PI + 0.3, 7, 2, k + 5); // helm plume
  fx.set(64, Y(9), GHOST[4]);
  fx.set(65, Y(9), GHOST[3]);
  fx.set(63, Y(9), GHOST[2]);
  fx.set(39, Y(3), GHOST[3]); // eyes behind the visor
  fx.set(40, Y(3), GHOST[2]);

  body.over(fx);
  return body;
}

/** Ghostly rim: every opaque pixel nudged toward pale blue so the whole steed reads spectral. */
function haunt(m: Layer) {
  for (let i = 0; i < m.px.length; i++) {
    const c = m.px[i];
    if (c) m.px[i] = 0xFF000000 | mix(c & 0xFFFFFF, 0x93C5FD, 0.12);
  }
}

function toTexture(m: Layer): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = m.w;
  canvas.height = m.h;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(m.w, m.h);
  for (let i = 0; i < m.px.length; i++) {
    const c = m.px[i];
    if (!c) continue;
    img.data[i * 4] = (c >> 16) & 255;
    img.data[i * 4 + 1] = (c >> 8) & 255;
    img.data[i * 4 + 2] = c & 255;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = Texture.from(canvas);
  tex.source.scaleMode = 'nearest';
  return tex;
}

/** Builds the gallop cycle (6 frames). Call destroySteed() on the result when the move ends. */
export function buildSteed(frames = 6): Texture[] {
  return Array.from({ length: frames }, (_, k) => {
    const m = paintFrame(k, frames);
    haunt(m);
    return toTexture(m);
  });
}

export function destroySteed(textures: Texture[]) {
  for (const t of textures) t.destroy(true);
}
