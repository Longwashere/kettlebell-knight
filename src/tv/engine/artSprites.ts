/**
 * Pixel sprites for the Monster Arts (monsterArts.ts): bats, a lantern wisp, bone arrows, the Rattle Back
 * armour pieces, a beetle shell, a breaking wave, a tombstone, bramble spikes, a crab claw, a lizard tail,
 * the moonlit stag and the spirit bear. Painted with pixelKit (Layer + shadeAndOutline), 1 texel = 1 stage px.
 *
 * Each builder returns a list of same-sized frames; moves load them through `moveSprites()`, which destroys
 * them when the move ends. Rotating props are pre-rendered at 8 angles instead of rotating the sprite, so
 * the pixels stay crisp.
 */
import type { Texture } from 'pixi.js';
import { bayer } from '../components/cardArt';
import {
  Layer, shadeAndOutline, mix, lerp, ellipse, limb, strand, rotPts, qbez, flame, haunt, clipBelow, toTexture,
} from './pixelKit';

const INK = 0x0F0E17;
const BRONZE = [0x78350F, 0xB45309, 0xD97706, 0xFBBF24];
const IRON = [0x27272A, 0x3F3F46, 0x71717A, 0xA1A1AA];
const BONE = [0x8A94A8, 0xC5CEDC, 0xE7ECF4, 0xFFFFFF];
const WISP = [0x0891B2, 0x67E8F9, 0xCFFAFE, 0xFFFFFF];

const frames = (n: number, paint: (k: number) => Layer): Texture[] => Array.from({ length: n }, (_, k) => toTexture(paint(k)));

// ---------------------------------------------------------------------------------------------
// Echo Shriek: cave bat, 4 wingbeat frames, facing right (30×21, centre 15,10)

export function bats(): Texture[] {
  const S = 1.5;
  return frames(4, (k) => {
    const m = new Layer(30, 21);
    const v = (n: number) => n * S;
    const dy = [-5, -1, 4, -1][k];
    for (const side of [-1, 1]) {
      const sx = 10 + side;
      const tip = { x: 10 + side * 9, y: 6 + dy };
      m.poly([sx, 5, 10 + side * 5, 4 + dy * 0.7, tip.x, tip.y, 10 + side * 7, 8 + dy * 0.4, 10 + side * 6, 7.5, 10 + side * 4, 9, sx, 9].map(v), 0x3B0764);
      m.line(v(sx), v(6), v(tip.x), v(tip.y), 0x6D28D9, 1.2); // wing fingers
      m.line(v(10 + side * 4), v(5 + dy * 0.5), v(10 + side * 5), v(9), 0x581C87);
    }
    ellipse(m, v(10), v(7.5), v(3), v(2.6), 0x2E1065);
    m.disc(v(12.5), v(5.5), v(2.2), 0x2E1065);
    m.poly([11, 4, 11.5, 1.2, 12.5, 4].map(v), 0x2E1065); // ears
    m.poly([13, 4, 14, 1.2, 14.5, 4.5].map(v), 0x2E1065);
    ellipse(m, v(9.5), v(8.2), v(1.6), v(1.2), 0x4C1D95); // belly fur
    shadeAndOutline(m, 0xC4B5FD, 0.35, 0.3);
    m.rect(19, 7, 2, 1, 0xF87171); // eyes
    m.set(22, 7, 0xF87171);
    m.set(21, 10, 0xFFFFFF); // fangs
    m.set(19, 10, 0xFFFFFF);
    return m;
  });
}

// ---------------------------------------------------------------------------------------------
// Will-o'-Lure: lantern wisp, 4 flicker frames + 4 blinking (24×28, centre 12,17)

export function wisps(): Texture[] {
  return frames(8, (k) => {
    const m = new Layer(24, 28);
    const fx = new Layer(24, 28);
    const blink = k >= 4;
    const f = k % 4;
    m.disc(12, 17, 6, WISP[1]);
    m.disc(11, 16, 4, WISP[2]);
    m.disc(10, 15, 2, WISP[3]);
    shadeAndOutline(m, 0xFFFFFF, 0.25, 0.35);
    for (let i = 0; i < 3; i++) flame(fx, 9 + i * 3, 12, -Math.PI / 2 + (i - 1) * 0.35, 7 + ((f + i) % 3) * 2, 2.6, f * 3 + i, [WISP[1], WISP[2], WISP[3], 0xFFFFFF]);
    fx.set(4 + f, 22 - f, WISP[2]); // trailing sparks
    fx.set(19 - f, 24 - (f % 2), WISP[1]);
    m.over(fx);
    if (blink) {
      m.rect(8, 18, 3, 1, INK);
      m.rect(13, 18, 3, 1, INK);
    } else {
      m.rect(9, 16, 2, 3, INK);
      m.rect(14, 16, 2, 3, INK);
      m.set(9, 16, 0xFFFFFF);
      m.set(14, 16, 0xFFFFFF);
    }
    m.rect(11, 21, 2, 1, INK); // little mouth
    return m;
  });
}

// ---------------------------------------------------------------------------------------------
// Bone Volley: bone arrow. Frame 0 falls (angle 1.32), frame 1 points straight up (34×34, centre 17,17)

function paintArrow(angle: number): Layer {
  const m = new Layer(34, 34);
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const px = -dy;
  const py = dx;
  const at = (t: number) => ({ x: 17 + dx * t, y: 17 + dy * t });
  const tail = at(-13);
  const head = at(10);
  limb(m, tail.x, tail.y, head.x, head.y, 2.2, 2.2, BONE[1]);
  for (const t of [-7, -1, 5]) {
    const n = at(t);
    m.disc(n.x, n.y, 1.5, BONE[2]); // knuckles
  }
  // Barbed head
  const tip = at(16);
  m.poly([tip.x, tip.y, head.x + px * 3.5, head.y + py * 3.5, at(12).x, at(12).y, head.x - px * 3.5, head.y - py * 3.5], BONE[2]);
  // Ragged fletching
  for (const s of [-1, 1]) {
    const a = at(-12);
    const b = at(-6);
    m.poly([a.x, a.y, a.x + px * s * 4 - dx * 2, a.y + py * s * 4 - dy * 2, b.x + px * s * 3, b.y + py * s * 3, b.x, b.y], s > 0 ? 0x94A3B8 : 0x64748B);
  }
  shadeAndOutline(m, 0xFFFFFF, 0.3, 0.3);
  m.line(at(-10).x, at(-10).y, at(8).x, at(8).y, BONE[3]);
  return m;
}

export function boneArrows(): Texture[] {
  return [toTexture(paintArrow(1.32)), toTexture(paintArrow(-Math.PI / 2))];
}

// ---------------------------------------------------------------------------------------------
// Rattle Back: armour pieces, each at 8 angles (24×24, centre 12,12). Sets: frames 8·i … 8·i+7

export const RATTLE_PIECES = ['helm', 'shield', 'bell', 'plate', 'bone'] as const;

function paintPiece(kind: (typeof RATTLE_PIECES)[number], a: number): Layer {
  const m = new Layer(24, 24);
  const c = 12;
  const R = (pts: number[]) => rotPts(pts, c, c, a);
  if (kind === 'helm') {
    m.disc(c, c, 6.5, BRONZE[2]);
    m.poly(R([c - 5, c - 1, c + 6, c - 1, c + 6, c + 1, c - 5, c + 1]), INK); // visor
    m.poly(R([c - 2, c - 6, c + 1, c - 11, c + 6, c - 9, c + 3, c - 5]), 0xDC2626); // plume
    m.poly(R([c - 6, c + 3, c + 6, c + 3, c + 5, c + 6, c - 5, c + 6]), BRONZE[1]);
  } else if (kind === 'shield') {
    m.poly(R([c - 8, c - 9, c + 8, c - 9, c + 8, c + 2, c, c + 10, c - 8, c + 2]), BRONZE[1]);
    m.poly(R([c - 6, c - 7, c + 6, c - 7, c + 6, c + 1, c, c + 7, c - 6, c + 1]), BRONZE[2]);
    m.disc(c, c - 1, 2.2, BRONZE[3]); // boss
  } else if (kind === 'bell') {
    const hd = R([c, c - 7]);
    m.disc(hd[0], hd[1], 4, IRON[2]);
    m.disc(hd[0], hd[1], 2, 0);
    m.disc(c, c + 1, 6, IRON[1]);
    m.disc(c - 2, c - 1, 2.5, IRON[2]);
  } else if (kind === 'plate') {
    m.poly(R([c - 8, c - 3, c + 8, c - 3, c + 7, c + 4, c - 7, c + 4]), BRONZE[2]);
    m.poly(R([c - 7, c - 2, c + 7, c - 2, c + 7, c, c - 7, c]), BRONZE[3]);
    for (const x of [-5, 5]) {
      const r = R([c + x, c + 2]);
      m.set(r[0], r[1], BRONZE[0]); // rivets
    }
  } else {
    const e = R([c - 7, c, c + 7, c]);
    limb(m, e[0], e[1], e[2], e[3], 2.6, 2.6, BONE[1]);
    m.disc(e[0], e[1], 2.4, BONE[2]); // knobbed ends
    m.disc(e[2], e[3], 2.4, BONE[2]);
  }
  shadeAndOutline(m, 0xFFFBEA, 0.4, 0.35);
  return m;
}

export function rattlePieces(): Texture[] {
  const out: Texture[] = [];
  for (const kind of RATTLE_PIECES) for (let k = 0; k < 8; k++) out.push(toTexture(paintPiece(kind, (k / 8) * Math.PI * 2)));
  return out;
}

// ---------------------------------------------------------------------------------------------
// Carapace Roll: beetle shell rolling, 8 spin frames (32×32, centre 16,16)

export function beetleShells(): Texture[] {
  return frames(8, (k) => {
    const m = new Layer(32, 32);
    const spin = (k / 8) * Math.PI * 2;
    const R = 12;
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const dx = x - 16;
        const dy = y - 16;
        const d = Math.hypot(dx, dy);
        if (d > R) continue;
        const ang = Math.atan2(dy, dx) - spin;
        const q = ((Math.floor(((ang % (Math.PI * 2)) + Math.PI * 2) / (Math.PI / 2)) % 4) + 4) % 4;
        let col = q % 2 ? 0x365314 : 0x4D7C0F;
        if (d < 5) col = 0x1A2E05;
        else if (Math.abs(d - 8) < 0.7) col = 0x1A2E05; // inner ring groove
        m.set(x, y, col);
      }
    }
    for (let q = 0; q < 4; q++) {
      const a = spin + (q * Math.PI) / 2;
      m.line(16 + Math.cos(a) * 5, 16 + Math.sin(a) * 5, 16 + Math.cos(a) * R, 16 + Math.sin(a) * R, 0x1A2E05);
    }
    // Horn turning with the shell
    const hx = 16 + Math.cos(spin) * R;
    const hy = 16 + Math.sin(spin) * R;
    m.poly([hx - Math.sin(spin) * 3, hy + Math.cos(spin) * 3, 16 + Math.cos(spin + 0.3) * (R + 5), 16 + Math.sin(spin + 0.3) * (R + 5), hx + Math.sin(spin) * 3, hy - Math.cos(spin) * 3], 0xA3E635);
    shadeAndOutline(m, 0xECFCCB, 0.4, 0.4);
    // Fixed sheen: the light doesn't roll with it
    for (let a = -2.6; a < -1.5; a += 0.08) m.set(16 + Math.cos(a) * 9, 16 + Math.sin(a) * 9, 0xD9F99D);
    m.set(11, 10, 0xFFFFFF);
    return m;
  });
}

// ---------------------------------------------------------------------------------------------
// Undertow: a breaking wave at 6 heights (130×86, lip base at 60,84)

export const WAVE_LIP = { x: 60, y: 84 };

function paintWave(H: number): Layer {
  const m = new Layer(130, 86);
  const x = WAVE_LIP.x;
  const gy = WAVE_LIP.y;
  const w = 46 + H * 0.3;
  const outline = [
    x + w, gy,
    ...qbez(x + w, gy, x + w * 0.35, gy - H * 0.25, x + 4, gy - H),
    ...qbez(x + 4, gy - H, x - H * 0.55, gy - H * 1.15, x - H * 0.75, gy - H * 0.6),
    ...qbez(x - H * 0.75, gy - H * 0.6, x - H * 0.45, gy - H * 0.82, x - H * 0.15, gy - H * 0.55),
    ...qbez(x - H * 0.15, gy - H * 0.55, x - H * 0.05, gy - H * 0.2, x - H * 0.35, gy),
  ];
  m.poly(outline, 0x0F766E);
  m.poly([x + w * 0.55, gy, ...qbez(x + w * 0.55, gy, x + w * 0.15, gy - H * 0.35, x + 1, gy - H * 0.86), ...qbez(x + 1, gy - H * 0.86, x - H * 0.05, gy - H * 0.4, x - H * 0.25, gy)], 0x14B8A6);
  // Water texture: flowing light streaks across the face
  for (let y = Math.floor(gy - H); y < gy; y += 3) {
    for (let xx = 0; xx < 130; xx++) {
      const c = m.get(xx, y);
      if (c && ((xx + y * 2) % 11 < 3)) m.set(xx, y, mix(c & 0xFFFFFF, 0x5EEAD4, 0.45));
    }
  }
  ellipse(m, x - H * 0.35, gy - H * 0.6, H * 0.15, H * 0.09, 0x042F2E); // the barrel under the lip
  shadeAndOutline(m, 0x99F6E4, 0.45, 0.35);
  // Foam along the lip and spray off the crest
  for (let k = 0; k <= 12; k++) {
    const t = k / 12;
    const fx = lerp(x + 6, x - H * 0.75, t);
    const fy = lerp(gy - H * 1.02, gy - H * 0.6, t * t) - Math.sin(t * Math.PI) * H * 0.06;
    m.disc(fx, fy, Math.max(1, 2.6 - t * 1.4), 0xF0FDFA);
  }
  for (let k = 0; k < 8; k++) m.set(x - 4 + k * 5, gy - H - 3 - ((k * 7) % 6), 0xF0FDFA);
  for (let xx = Math.floor(x - H * 0.35); xx < x + w; xx += 2) m.set(xx, gy - 1, 0xCCFBF1); // foam line at the foot
  return m;
}

export const WAVE_HEIGHTS = [16, 28, 40, 52, 62, 72];
export function waves(): Texture[] {
  return WAVE_HEIGHTS.map((H) => toTexture(paintWave(H)));
}

// ---------------------------------------------------------------------------------------------
// Tombstone Heave: 6 frames rising out of the ground, then 8 tumbling angles (40×46, base/centre 20,42 · 20,23)

function paintStone(m: Layer, cx: number, cy: number, a: number) {
  const S = 1.4; // painted at 1.4× its design size
  const R = (pts: number[]) => rotPts(pts.map((p, i) => (i % 2 ? cy + (p - cy) * S : cx + (p - cx) * S)), cx, cy, a);
  m.poly(R([cx - 8, cy + 12, cx - 8, cy - 7, cx - 4, cy - 12, cx + 4, cy - 12, cx + 8, cy - 7, cx + 8, cy + 12]), 0x57534E);
  m.poly(R([cx - 6, cy + 10, cx - 6, cy - 6, cx - 3, cy - 10, cx + 2, cy - 10, cx - 1, cy + 10]), 0x78716C); // lit face
  m.poly(R([cx - 1, cy - 7, cx + 1, cy - 7, cx + 1, cy + 4, cx - 1, cy + 4]), 0x292524); // cross
  m.poly(R([cx - 4, cy - 4, cx + 4, cy - 4, cx + 4, cy - 2, cx - 4, cy - 2]), 0x292524);
  const crack = R([cx + 5, cy - 9, cx + 3, cy - 3, cx + 6, cy + 3]);
  m.line(crack[0], crack[1], crack[2], crack[3], 0x1C1917);
  m.line(crack[2], crack[3], crack[4], crack[5], 0x1C1917);
  for (const [dx, dy] of [[-7, 9], [-5, 11], [6, 10], [7, 7]]) {
    const p = R([cx + dx, cy + dy]);
    m.set(p[0], p[1], 0x4D7C0F); // moss
  }
  shadeAndOutline(m, 0xE7E5E4, 0.35, 0.35);
}

export const STONE_RISE = 6;
export function tombstones(): Texture[] {
  const out: Texture[] = [];
  for (let k = 0; k < STONE_RISE; k++) {
    const m = new Layer(40, 46);
    paintStone(m, 20, 25 + Math.round((1 - (k + 1) / STONE_RISE) * 34), 0);
    clipBelow(m, 43);
    out.push(toTexture(m));
  }
  for (let k = 0; k < 8; k++) {
    const m = new Layer(40, 46);
    paintStone(m, 20, 23, -(k / 8) * Math.PI * 2);
    out.push(toTexture(m));
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Needle Burst: a bramble cluster erupting, 6 growth frames (48×56, base 24,54)

export function brambles(): Texture[] {
  const spikes = [[-15, 30, -0.25], [-7, 44, -0.1], [1, 52, 0.04], [9, 40, 0.18], [17, 26, 0.35]] as const;
  return frames(6, (k) => {
    const m = new Layer(48, 56);
    const grow = (k + 1) / 6;
    const base = 54;
    for (const [dx, hgt, lean] of spikes) {
      const h = hgt * Math.min(1, grow * 1.2 - Math.abs(dx) * 0.006);
      if (h < 2) continue;
      const bx = 24 + dx;
      const tx = bx + Math.sin(lean) * h;
      const ty = base - Math.cos(lean) * h;
      m.poly([bx - 4, base, tx, ty, bx + 4, base], 0x166534);
      m.line(bx - 1, base, tx, ty + 2, 0x22C55E); // lit edge
      for (let t = 0.25; t < 0.9; t += 0.22) {
        const px = lerp(bx, tx, t);
        const py = lerp(base, ty, t);
        const side = Math.round(t * 10) % 2 ? 1 : -1;
        m.poly([px, py, px + side * 4, py - 2, px, py - 2], 0xFEF3C7); // thorns
      }
    }
    // Twisted vine and dirt clods at the root
    for (let x = 6; x < 42; x++) m.set(x, base - 1 - Math.round(Math.sin(x * 0.7) * 1.5), 0x5C2B14);
    for (const x of [8, 16, 30, 40]) m.rect(x, base - 1, 3, 2, 0x3F2A14);
    shadeAndOutline(m, 0xDCFCE7, 0.35, 0.35);
    return m;
  });
}

// ---------------------------------------------------------------------------------------------
// Pincer Crack: giant crab claw, hinged at the right, 5 frames open → shut (76×64, hinge 66,32)

export const CLAW_OPEN = [1, 0.7, 0.42, 0.18, 0.05];
export function crabClaws(): Texture[] {
  return CLAW_OPEN.map((open) => toTexture((() => {
    const m = new Layer(76, 64);
    const x = 66;
    const y = 32;
    const len = 58;
    const jaw = (side: 1 | -1, color: number) => {
      const outer: number[] = [];
      const inner: number[] = [];
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        const bow = Math.sin(t * Math.PI * 0.85) * len * (0.14 + 0.32 * open);
        const hook = t > 0.8 ? (t - 0.8) * len * 0.8 : 0;
        const cx = x - len * t;
        const cy = y + side * (bow - hook);
        const w = len * 0.17 * (1 - t * 0.85);
        outer.push(cx, cy + side * w);
        const tooth = i % 2 && t > 0.15 && t < 0.85 ? 2.5 : 0;
        inner.unshift(cx, cy - side * (w * 0.15 + tooth));
      }
      m.poly([...outer, ...inner], color);
      // Spots on the shell
      for (const t of [0.25, 0.45, 0.62]) m.disc(x - len * t, y + side * (Math.sin(t * Math.PI * 0.85) * len * (0.14 + 0.32 * open) + 3), 1.2, 0xFDBA74);
    };
    jaw(1, 0xC2410C);
    jaw(-1, 0xEA580C);
    m.disc(x, y, 8, 0x9A3412);
    m.disc(x + 4, y, 6, 0x7C2D12);
    shadeAndOutline(m, 0xFFEDD5, 0.45, 0.35);
    // Bone-white serrations along the bite
    for (const side of [-1, 1]) {
      for (let i = 2; i < 12; i += 2) {
        const t = i / 14;
        const bow = Math.sin(t * Math.PI * 0.85) * len * (0.14 + 0.32 * open);
        m.set(x - len * t, y + side * (bow - len * 0.17 * (1 - t * 0.85) * 0.15 - 1), 0xFFF7ED);
      }
    }
    m.set(x - 3, y - 3, 0xFFEDD5);
    return m;
  })()));
}

// ---------------------------------------------------------------------------------------------
// Tail Sweep: lizard tail swinging from behind to in front, foreshortened as it passes the camera
// (8 frames, 250×44, root at 40,16)

export const TAIL_ROOT = { x: 40, y: 16 };
export const TAIL_STEPS = [0, 0.18, 0.34, 0.46, 0.56, 0.7, 0.85, 1];
export function lizardTails(reach = 196): Texture[] {
  return TAIL_STEPS.map((k) => toTexture((() => {
    const m = new Layer(250, 44);
    const front = k >= 0.5;
    const span = front ? (k - 0.5) * 2 : (0.5 - k) * 2; // 1 = fully side-on, 0 = pointing at the camera
    const len = front ? lerp(10, reach, span) : lerp(10, 34, span);
    const dir = front ? 1 : -1;
    const w0 = lerp(16, 11, span); // fatter when coming at the camera
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      pts.push({ x: TAIL_ROOT.x + dir * len * t, y: TAIL_ROOT.y + Math.sin(t * Math.PI) * 6 * span - t * t * 3 });
    }
    strand(m, pts, w0, 2, 0x059669);
    // Belly stripe and dark bands
    strand(m, pts.map((p, i) => ({ x: p.x, y: p.y + lerp(w0, 2, i / 16) * 0.3 })), w0 * 0.4, 1, 0x6EE7B7);
    for (let i = 2; i < 15; i += 2) {
      const p = pts[i];
      const w = lerp(w0, 2, i / 16);
      m.line(p.x, p.y - w / 2, p.x - dir * 1, p.y + w / 2, 0x065F46);
    }
    shadeAndOutline(m, 0xD1FAE5, 0.4, 0.35);
    // Dorsal spines
    for (let i = 1; i < 15; i += 2) {
      const p = pts[i];
      const w = lerp(w0, 2, i / 16);
      m.poly([p.x - 2, p.y - w / 2, p.x + dir, p.y - w / 2 - 3, p.x + 2, p.y - w / 2], 0xD1FAE5);
    }
    return m;
  })()));
}

// ---------------------------------------------------------------------------------------------
// Moonlit Leap: spectral stag, 2 standing + 3 rearing frames (72×92, hooves at 30,90)

export function stags(): Texture[] {
  const rears = [0, 0, 0.35, 0.7, 1];
  return rears.map((rear, k) => toTexture((() => {
    const m = new Layer(72, 92);
    const gy = 90;
    const hip = { x: 22, y: gy - 27 };
    const R = (pts: number[]) => rotPts(pts, hip.x, hip.y, -rear * 0.65);
    const P = (x: number, y: number) => R([x, y]) as [number, number];
    const BODY = [0x4F46E5, 0x818CF8, 0xC7D2FE, 0xEEF2FF];
    // Hind legs (planted)
    for (const [lx, c] of [[18, BODY[1]], [24, BODY[2]]] as const) {
      limb(m, lx, gy - 24, lx - 3, gy - 12, 4, 3, c);
      limb(m, lx - 3, gy - 12, lx, gy - 1, 2.5, 2, c);
      m.rect(lx - 1, gy - 2, 3, 2, BODY[0]);
    }
    // Forelegs: straight when standing, folded and pawing when rearing
    for (const [lx, c, ph] of [[40, BODY[1], 1], [45, BODY[2], 0]] as const) {
      const [sx, sy] = P(lx, gy - 24);
      const fold = rear * (0.9 + ph * 0.4);
      const kx = sx + Math.sin(fold) * 10;
      const ky = sy + Math.cos(fold) * 10;
      limb(m, sx, sy, kx, ky, 4, 3, c);
      limb(m, kx, ky, kx + Math.sin(fold * 1.8 - 0.4) * 10, ky + Math.cos(fold * 1.8 - 0.4) * 10, 2.5, 2, c);
    }
    // Body, neck, head
    m.poly(R([10, gy - 30, 18, gy - 38, 40, gy - 38, 50, gy - 32, 46, gy - 22, 14, gy - 22]), BODY[2]);
    m.poly(R([14, gy - 25, 44, gy - 25, 46, gy - 22, 16, gy - 21]), BODY[1]); // belly shade
    m.poly(R([18, gy - 37, 40, gy - 37, 38, gy - 34, 20, gy - 34]), BODY[3]); // back light
    m.poly(R([42, gy - 36, 50, gy - 52, 56, gy - 50, 52, gy - 32]), BODY[2]); // neck
    m.poly(R([49, gy - 54, 56, gy - 56, 64, gy - 50, 62, gy - 47, 54, gy - 47]), BODY[2]); // head
    m.poly(R([7, gy - 33, 11, gy - 36, 12, gy - 30]), BODY[3]); // tail tuft
    const [ex, ey] = P(56, gy - 52);
    shadeAndOutline(m, 0xFFFFFF, 0.4, 0.3);
    // Antlers (light, drawn over the outline)
    const [ax, ay] = P(52, gy - 56);
    for (const side of [-1, 1]) {
      const tx = ax - 6 + side * 4;
      const ty = ay - 18;
      m.line(ax, ay, tx, ty, 0xFFFFFF, 1.5);
      for (let i = 1; i <= 3; i++) {
        const t = i / 4;
        const px = lerp(ax, tx, t);
        const py = lerp(ay, ty, t);
        m.line(px, py, px + 3 + side, py - 5, i === 3 ? 0xFFFFFF : 0xE0E7FF);
      }
    }
    m.set(ex, ey, 0xFFFFFF);
    m.set(ex + 1, ey, 0xA5B4FC);
    // Clinging moonlight motes
    for (let i = 0; i < 6; i++) m.set(12 + ((i * 9 + k * 5) % 40), gy - 46 + ((i * 13 + k * 3) % 30), 0xFFFFFF);
    haunt(m, 0xC7D2FE, 0.1);
    return m;
  })()));
}

// ---------------------------------------------------------------------------------------------
// Grizzly Maul: a golden spirit bear. Proper side-view anatomy (massive shoulder hump, low wide skull, long
// muzzle, thick limbs, big clawed paws) built on one skeleton: the spine pivots at the hip (`pitch`), so the
// same bear prowls on all fours, rears, stands, roars and mauls. Each part glows from its own white-gold core
// out to deep amber (distance-shaded, Bayer-dithered bands) with a darker contour where it overlaps the body,
// spirit flame licks off its top edges, and a dithered halo per pose goes additive behind it.
// 9 poses (132×112, hip-ground anchor 36,108) and a 5-frame claw rake (72×72, centre).

export const BEAR_FEET = { x: 36, y: 108 };
export const BEAR_POSES = { walk1: 0, walk2: 1, rise: 2, stand: 3, roar: 4, roar2: 5, wind: 6, swipe: 7, maul: 8 } as const;

const GLOW = [0xB45309, 0xD97706, 0xF59E0B, 0xFBBF24, 0xFDE68A, 0xFFF7D6]; // edge → core
const GLOW_FAR = [0x7C2D12, 0x9A3412, 0xB45309, 0xD97706, 0xF59E0B];
const CONTOUR = 0x8A3A06;
const OUTLINE = 0x2E1203;

interface Limb { a1: number; a2: number }
interface BearPose { pitch: number; head: number; jaw: number; near: Limb; far: Limb; hindNear: number; hindFar: number }

const POSES: BearPose[] = [
  { pitch: -0.04, head: 0.22, jaw: 0.12, near: { a1: 1.3, a2: 1.62 }, far: { a1: 1.85, a2: 1.5 }, hindNear: 7, hindFar: -6 }, // walk 1
  { pitch: -0.06, head: 0.18, jaw: 0.12, near: { a1: 1.85, a2: 1.5 }, far: { a1: 1.3, a2: 1.62 }, hindNear: -6, hindFar: 7 }, // walk 2
  { pitch: -0.62, head: -0.25, jaw: 0.35, near: { a1: 0.85, a2: 0.35 }, far: { a1: 1.15, a2: 0.65 }, hindNear: 3, hindFar: -3 }, // rise
  { pitch: -1.22, head: -0.25, jaw: 0.25, near: { a1: 0.95, a2: 0.95 }, far: { a1: 1.25, a2: 1.1 }, hindNear: 4, hindFar: -4 }, // stand
  { pitch: -1.3, head: -0.72, jaw: 1, near: { a1: 0.05, a2: -0.65 }, far: { a1: -2.45, a2: -1.95 }, hindNear: 4, hindFar: -4 }, // roar
  { pitch: -1.27, head: -0.62, jaw: 0.8, near: { a1: 0.15, a2: -0.55 }, far: { a1: -2.35, a2: -1.85 }, hindNear: 4, hindFar: -4 }, // roar 2
  { pitch: -1.42, head: -0.38, jaw: 0.55, near: { a1: -2.25, a2: -2.95 }, far: { a1: -2.55, a2: -3.05 }, hindNear: 2, hindFar: -5 }, // wind-up
  { pitch: -0.95, head: -0.15, jaw: 0.7, near: { a1: -0.35, a2: 0.25 }, far: { a1: -0.85, a2: -0.25 }, hindNear: 6, hindFar: -2 }, // swipe
  { pitch: -0.58, head: 0.05, jaw: 0.9, near: { a1: 0.85, a2: 1.3 }, far: { a1: 0.55, a2: 1.0 }, hindNear: 9, hindFar: 0 }, // maul
];

/** Filled ellipse rotated by `a`. */
function ellipseR(m: Layer, cx: number, cy: number, rx: number, ry: number, a: number, c = 0xFFFFFF) {
  const r = Math.max(rx, ry) + 1;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx;
      const dy = y - cy;
      const lx = dx * ca + dy * sa;
      const ly = -dx * sa + dy * ca;
      if ((lx / rx) ** 2 + (ly / ry) ** 2 <= 1) m.set(x, y, c);
    }
  }
}

/** Chamfer distance to the nearest empty pixel, for every opaque pixel of `m`. */
function distanceField(m: Layer): Float32Array {
  const { w, h } = m;
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = m.px[i] ? 1e6 : 0;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!d[i]) continue;
    d[i] = Math.min(d[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.41, at(x + 1, y - 1) + 1.41);
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x;
    if (!d[i]) continue;
    d[i] = Math.min(d[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.41, at(x - 1, y + 1) + 1.41);
  }
  return d;
}

/** Shades `mask` into `out`: glowing bands by depth from the edge; `contour` darkens its rim where it overlaps. */
function glowPart(out: Layer, mask: Layer, pal: number[], scale: number, contour: boolean) {
  const d = distanceField(mask);
  for (let y = 0; y < mask.h; y++) {
    for (let x = 0; x < mask.w; x++) {
      const dist = d[y * mask.w + x];
      if (!dist) continue;
      if (contour && dist < 1.5 && out.get(x, y)) {
        out.set(x, y, CONTOUR);
        continue;
      }
      const t = Math.min(pal.length - 1, Math.floor((dist - 1) / scale + bayer(x, y) * 0.95));
      out.set(x, y, pal[Math.max(0, t)]);
    }
  }
}

function paintSpiritBear(p: BearPose): { body: Layer; silhouette: Layer } {
  const W = 132;
  const H = 112;
  const hip = { x: 36, y: 84 };
  const cp = Math.cos(p.pitch);
  const sp = Math.sin(p.pitch);
  const T = (lx: number, ly: number): [number, number] => [hip.x + lx * cp - ly * sp, hip.y + lx * sp + ly * cp];
  const out = new Layer(W, H);
  const newMask = () => new Layer(W, H);

  const legMask = (m: Layer, shoulder: [number, number], limb: Limb, w: number) => {
    const [sx, sy] = shoulder;
    const ex = sx + Math.cos(limb.a1) * 15;
    const ey = sy + Math.sin(limb.a1) * 15;
    const hx = ex + Math.cos(limb.a2) * 13;
    const hy = ey + Math.sin(limb.a2) * 13;
    limb3(m, sx, sy, ex, ey, w + 3, w);
    limb3(m, ex, ey, hx, hy, w, w - 2);
    ellipseR(m, hx + Math.cos(limb.a2) * 2, hy + Math.sin(limb.a2) * 2, 7.5, 5, limb.a2 - Math.PI / 2);
    return { x: hx + Math.cos(limb.a2) * 4, y: hy + Math.sin(limb.a2) * 4, a: limb.a2 };
  };
  const hindMask = (m: Layer, footDx: number, w: number) => {
    const [hx, hy] = [hip.x + 2, hip.y + 2];
    const kx = hx + 6 + footDx * 0.3;
    const ky = hy + 11;
    const fx = hx + footDx;
    const fy = 104;
    ellipseR(m, hx + 2, hy - 2, 11, 13, 0.35); // thigh
    limb3(m, kx, ky, fx, fy, w, w - 2);
    ellipseR(m, fx + 3, 106, 8.5, 3.5, 0);
  };

  // Far side: far hind leg and far foreleg, dimmer
  const far = newMask();
  hindMask(far, p.hindFar - 4, 10);
  const farPaw = legMask(far, T(41, -3), p.far, 10);
  glowPart(out, far, GLOW_FAR, 2.2, false);

  // Body: rump, barrel, shoulder hump, chest, neck
  const body = newMask();
  for (const [lx, ly, rx, ry] of [[0, -6, 15, 14], [24, -8, 28, 16], [40, -19, 20, 16], [48, -4, 13, 13]] as const) {
    const [x, y] = T(lx, ly);
    ellipseR(body, x, y, rx, ry, p.pitch);
  }
  const [nx0, ny0] = T(48, -12);
  const [hcx, hcy] = T(64, -12);
  limb3(body, nx0, ny0, hcx - 2, hcy, 18, 15);
  glowPart(out, body, GLOW, 2.6, false);
  // Fur flow: short brighter strokes along the spine direction
  for (let k = 0; k < 38; k++) {
    const n = Math.sin(k * 91.7 + 13.1) * 43758.5453;
    const r = n - Math.floor(n);
    const [x, y] = T(lerp(-8, 50, r), lerp(-24, 4, (Math.sin(k * 7.3) + 1) / 2));
    if (!body.get(Math.round(x), Math.round(y))) continue;
    out.line(x, y, x + cp * 3 + 1, y + sp * 3 + 1, GLOW[4]);
  }

  // Near hind leg
  const hind = newMask();
  hindMask(hind, p.hindNear, 11);
  glowPart(out, hind, GLOW, 2.4, true);

  // Near foreleg (in front of the body, behind the head so a raised paw never hides the face)
  const arm = newMask();
  const nearPaw = legMask(arm, T(46, -2), p.near, 13);
  glowPart(out, arm, GLOW, 2.4, true);

  // Head: low wide skull, heavy brow, long muzzle, dropping jaw, small ears
  const ha = p.head;
  const ch = Math.cos(ha);
  const sh = Math.sin(ha);
  const Hd = (lx: number, ly: number): [number, number] => [hcx + lx * ch - ly * sh, hcy + lx * sh + ly * ch];
  const jawA = p.jaw * 0.6;
  const pivot = Hd(5, 4);
  const J = (lx: number, ly: number): [number, number] => {
    const [x, y] = Hd(lx, ly);
    const c = Math.cos(jawA);
    const s = Math.sin(jawA);
    return [pivot[0] + (x - pivot[0]) * c - (y - pivot[1]) * s, pivot[1] + (x - pivot[0]) * s + (y - pivot[1]) * c];
  };
  const head = newMask();
  for (const [lx, ly] of [[-6, -9], [1, -10.5]] as const) {
    const [x, y] = Hd(lx, ly);
    head.disc(x, y, 4, 0xFFFFFF); // round ears
  }
  const [skx, sky] = Hd(0, 0);
  ellipseR(head, skx, sky, 12.5, 10.5, ha);
  const [mzx, mzy] = Hd(12, 2.5);
  ellipseR(head, mzx, mzy, 8.5, 6, ha + 0.08); // short thick muzzle
  const [jwx, jwy] = J(11, 7);
  ellipseR(head, jwx, jwy, 7.5, 3.2, ha + jawA);
  glowPart(out, head, GLOW, 2.2, true);

  // Silhouette for the halo and the outline
  const silhouette = newMask();
  for (let i = 0; i < out.px.length; i++) if (out.px[i]) silhouette.px[i] = 0xFFFFFFFF;

  // Spirit flame off the top edges (leaning back, as if it streams)
  const src = out.px.slice();
  for (let y = 2; y < H; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (!src[y * W + x] || src[(y - 1) * W + x]) continue;
      const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const r = n - Math.floor(n);
      if (r < 0.42) continue;
      const len = r > 0.9 ? 7 : r > 0.75 ? 4 : r > 0.58 ? 2 : 1;
      for (let k = 1; k <= len; k++) out.set(x - Math.floor(k / 2), y - k, k >= len - 1 ? GLOW[5] : GLOW[3]);
    }
  }
  // 1px outline round the whole silhouette
  const filled = out.px.slice();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (filled[y * W + x]) continue;
      const n = (xx: number, yy: number) => xx >= 0 && yy >= 0 && xx < W && yy < H && filled[yy * W + xx];
      if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) out.set(x, y, OUTLINE);
    }
  }

  // Face: maw, fangs, nose, brow, white-hot eye
  if (p.jaw > 0.2) {
    out.poly([...Hd(5, 4), ...Hd(19, 4), ...J(18, 6), ...J(6, 6)], 0x4A1A02);
    out.poly([...J(8, 5.5), ...J(16, 5.5), ...Hd(14, 5), ...Hd(9, 5)], 0x9A2F0C); // tongue
  }
  for (const k of [9, 13, 17]) {
    const [fx, fy] = Hd(k, 3);
    const [gx, gy] = Hd(k + 0.5, 6);
    out.line(fx, fy, gx, gy, 0xFFFFFF); // upper fangs
    const [lx0, ly0] = J(k - 1, 6);
    const [lx1, ly1] = J(k - 1, 4);
    out.line(lx0, ly0, lx1, ly1, 0xFFF7D6); // lower fangs
  }
  const [nsx, nsy] = Hd(20, 1);
  out.disc(nsx, nsy, 2.4, OUTLINE); // nose
  const [b0x, b0y] = Hd(-3, -5);
  const [b1x, b1y] = Hd(8, -3.5);
  out.line(b0x, b0y, b1x, b1y, CONTOUR, 1.6); // heavy brow
  const [ex, ey] = Hd(4.5, -2);
  out.rect(ex - 1, ey - 1, 3, 2, 0xFFFFFF);
  out.set(ex - 2, ey, 0xFDE68A);
  out.set(ex + 2, ey, 0xFDE68A);
  const [mlx, mly] = Hd(7, 4.5);
  const [mrx, mry] = Hd(18, 4.5);
  if (p.jaw <= 0.2) out.line(mlx, mly, mrx, mry, CONTOUR); // closed mouth line

  // Claws: three white-hot hooks on each paw
  for (const paw of [farPaw, nearPaw]) {
    for (let k = -1; k <= 1; k++) {
      const a = paw.a + k * 0.42 - 0.15;
      const x0 = paw.x + Math.cos(a) * 3;
      const y0 = paw.y + Math.sin(a) * 3;
      const x1 = x0 + Math.cos(a - 0.5) * 6;
      const y1 = y0 + Math.sin(a - 0.5) * 6;
      out.line(x0, y0, x1, y1, OUTLINE, 2.2);
      out.line(x0, y0, x1, y1, 0xFFFFFF);
    }
  }
  return { body: out, silhouette };
}

/** Thick round-capped stroke into a mask. */
function limb3(m: Layer, ax: number, ay: number, bx: number, by: number, w0: number, w1: number) {
  limb(m, ax, ay, bx, by, w0, w1, 0xFFFFFF);
}

/** The bear's pose frames and a matching dithered glow halo per pose (draw it additive behind). */
export function spiritBear(haloR = 6): { bear: Texture[]; halo: Texture[] } {
  const bear: Texture[] = [];
  const halo: Texture[] = [];
  for (const p of POSES) {
    const { body, silhouette } = paintSpiritBear(p);
    bear.push(toTexture(body));
    const m = new Layer(body.w, body.h);
    for (let y = 0; y < body.h; y++) {
      for (let x = 0; x < body.w; x++) {
        if (!silhouette.get(x, y)) continue;
        for (let dy = -haloR; dy <= haloR; dy++) {
          for (let dx = -haloR; dx <= haloR; dx++) {
            const d = Math.sqrt(dx * dx + dy * dy) / haloR;
            if (d <= 1 && bayer(x + dx, y + dy) < 1 - d) m.set(x + dx, y + dy, 0xFFFFFF);
          }
        }
      }
    }
    halo.push(toTexture(m));
  }
  return { bear, halo };
}

/** Three golden spirit-claw furrows tearing down and forward; frames 0-2 rip, 3-4 fade. */
export function clawRakes(): Texture[] {
  return frames(5, (k) => {
    const m = new Layer(72, 72);
    const lead = Math.min(1, (k + 1) / 3);
    const tail = k < 3 ? 0 : (k - 2) / 3;
    for (let i = 0; i < 3; i++) {
      const pts = qbez(10 + i * 11, 6, 28 + i * 11, 30, 30 + i * 11, 66, 16);
      const all: { x: number; y: number }[] = [];
      for (let n = 0; n < pts.length; n += 2) all.push({ x: pts[n], y: pts[n + 1] });
      const from = Math.floor(tail * (all.length - 1));
      const to = Math.max(from + 1, Math.ceil(lead * (all.length - 1)));
      const seg = all.slice(from, to + 1);
      if (seg.length < 2) continue;
      const w = (k < 3 ? 6 : 6 - (k - 2) * 1.8) * (i === 1 ? 1.15 : 1);
      strand(m, seg, w + 2, 1.5, INK);
      strand(m, seg, w, 1, 0xD97706);
      strand(m, seg, w * 0.45, 0.6, 0xFFF7D6);
    }
    if (k >= 1 && k <= 3) for (const [x, y] of [[52, 30], [58, 44], [47, 58], [62, 54], [40, 20]]) m.rect(x + k, y + k * 2, 2, 2, 0xFDE68A); // flung spirit sparks
    return m;
  });
}

// ---------------------------------------------------------------------------------------------
// Stone Skin: a gargoyle statue shell over the knight (64×76, feet at 30,74). Frames 0-5: the granite crust
// climbing from the pedestal to the horns; 6-8: the finished statue cracking, light seeping through at 8.
// Plus rubble chunks (3 shapes × 8 angles, 16×16) for the burst.

export const SHELL_FEET = { x: 30, y: 74 };
export const SHELL_GROW = 6;

/** Deterministic 0-1 noise per pixel. */
const noise = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

/** Granite speckle over every opaque pixel of `m` whose colour is `base`. */
function granite(m: Layer, base: number) {
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      if ((m.get(x, y) & 0xFFFFFF) !== base) continue;
      const n = noise(x, y);
      if (n < 0.12) m.set(x, y, mix(base, 0x292524, 0.3));
      else if (n > 0.9) m.set(x, y, mix(base, 0xE7E5E4, 0.3));
    }
  }
}

function paintStatue(): Layer {
  const m = new Layer(64, 76);
  const G = 0x78716C;
  const DARK = 0x57534E;
  const DEEP = 0x44403C;
  // Folded stone wings behind the shoulders
  m.poly([22, 28, 10, 4, 4, 8, 2, 22, 6, 38, 14, 48, 22, 44], DARK);
  m.poly([20, 26, 12, 10, 8, 14, 8, 28, 14, 40, 20, 40], G);
  for (const [x0, y0, x1, y1] of [[20, 27, 9, 8], [19, 30, 5, 22], [19, 34, 8, 36]]) m.line(x0, y0, x1, y1, DEEP); // wing ribs
  // Pedestal block
  m.rect(8, 66, 46, 10, DARK);
  m.rect(6, 64, 50, 3, G);
  m.line(8, 70, 53, 70, DEEP);
  // Hulking body and haunches
  m.poly([16, 65, 14, 50, 13, 36, 19, 24, 31, 19, 42, 23, 47, 36, 46, 52, 48, 65], G);
  ellipse(m, 20, 58, 7, 8, G); // crouched haunch
  ellipse(m, 40, 58, 7, 8, G);
  m.poly([22, 40, 40, 40, 38, 44, 24, 44], DARK); // belt band
  // Horned helm with a snarling gargoyle face
  m.disc(32, 15, 8, G);
  m.poly([26, 10, 18, 1, 22, 0, 29, 8], DARK); // horns
  m.poly([37, 8, 42, 0, 46, 1, 39, 11], DARK);
  m.poly([27, 12, 40, 12, 41, 15, 26, 15], DARK); // heavy brow
  // Shield slab in front, with a carved boss
  m.poly([40, 26, 56, 26, 56, 47, 48, 56, 40, 47], G);
  m.poly([42, 28, 54, 28, 54, 46, 48, 53, 42, 46], DARK);
  m.disc(48, 38, 3, G);
  // Clawed stone hand over the shield rim
  m.poly([38, 30, 44, 26, 46, 30, 42, 33], G);
  granite(m, G);
  granite(m, DARK);
  shadeAndOutline(m, 0xE7E5E4, 0.4, 0.4);
  // Over the outline: glowing-hollow eyes, fangs, moss in the crevices
  m.rect(29, 13, 2, 1, 0x1C1917);
  m.rect(34, 13, 2, 1, 0x1C1917);
  for (const x of [30, 32, 34]) m.set(x, 19, 0xD6D3D1);
  m.line(29, 18, 36, 18, 0x1C1917);
  for (const [x, y] of [[10, 66], [12, 65], [50, 66], [24, 64], [44, 63], [15, 50], [9, 30], [47, 52]]) m.set(x, y, 0x4D7C0F);
  return m;
}

const CRACKS: number[][] = [
  [31, 22, 29, 30, 33, 37, 30, 44],
  [44, 30, 49, 36, 46, 42],
  [18, 40, 22, 48, 18, 56, 21, 62],
  [36, 46, 40, 52, 37, 60, 41, 65],
  [26, 8, 30, 12, 28, 17],
  [10, 14, 14, 22, 11, 30],
];

export function stoneShells(): Texture[] {
  const full = paintStatue();
  const out: Texture[] = [];
  // Growth: the crust rises row by row; its leading edge is pale fresh stone
  for (let k = 0; k < SHELL_GROW; k++) {
    const m = new Layer(64, 76);
    m.px.set(full.px);
    const top = Math.round(lerp(64, -1, (k + 1) / SHELL_GROW));
    for (let y = 0; y < Math.max(0, top); y++) for (let x = 0; x < 64; x++) m.px[y * 64 + x] = 0;
    if (top > 0) {
      for (let x = 0; x < 64; x++) {
        const edge = top + Math.round(noise(x, k) * 2);
        for (let y = top; y < Math.min(76, edge); y++) m.px[y * 64 + x] = 0;
        if (m.get(x, edge)) m.set(x, edge, (x + k) % 3 ? 0xE7E5E4 : 0xA8A29E);
      }
    }
    out.push(toTexture(m));
  }
  // Cracking: 2, 4, then 6 fissures, the last stage leaking light
  for (const [n, glow] of [[2, false], [4, false], [6, true]] as const) {
    const m = new Layer(64, 76);
    m.px.set(full.px);
    for (const pts of CRACKS.slice(0, n)) {
      for (let i = 2; i < pts.length; i += 2) {
        m.line(pts[i - 2], pts[i - 1], pts[i], pts[i + 1], glow ? 0xFDE68A : 0x1C1917, glow ? 1.6 : 1);
        if (glow) m.line(pts[i - 2], pts[i - 1], pts[i], pts[i + 1], 0xFFFBEA);
      }
    }
    out.push(toTexture(m));
  }
  return out;
}

export function rubble(): Texture[] {
  const shapes = [
    [-6, -3, -1, -6, 5, -4, 6, 2, 1, 6, -5, 4],
    [-4, -5, 4, -4, 5, 3, -2, 5, -5, 1],
    [-7, -1, -3, -4, 3, -3, 7, 0, 4, 4, -4, 3],
  ];
  const out: Texture[] = [];
  for (const shape of shapes) {
    for (let k = 0; k < 8; k++) {
      const m = new Layer(16, 16);
      m.poly(rotPts(shape.map((v, i) => v + 8 + (i % 2 ? 0 : 0)), 8, 8, (k / 8) * Math.PI * 2), 0x78716C);
      granite(m, 0x78716C);
      shadeAndOutline(m, 0xE7E5E4, 0.4, 0.4);
      out.push(toTexture(m));
    }
  }
  return out;
}
