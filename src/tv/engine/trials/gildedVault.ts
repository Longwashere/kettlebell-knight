import type { Sprite, Texture, Ticker } from 'pixi.js';
import { audioManager } from '../../../shared/AudioManager';
import type { StoneHost } from '../excalibellStone';
import { TrialStage, CX, FOOT, type Frame, type WeaponPose } from '../trialStage';
import { LitCanvas, ramp, type Lighting } from './litArt';

/**
 * The Gilded Vault (`midas_bell`, Cathedral Vault): the treasury's round iron door is worked by steam. Every
 * thruster pumps the boiler (a piston thump, the wheel turns a notch, the gauge needle climbs) while a cracked
 * pipe hisses the pressure away (a leak trial: the needle sinks between reps). Full pressure throws the bolts:
 * the door swings open on a flood of gold light and the Midas Bell flies out in a spray of coins.
 */
const DX = CX + 44; // the door's centre
const DY = FOOT - 78;
const R = 60;
const GX = CX + 140; // the gauge
const GY = FOOT - 150;
const STEEL = [0x15181D, 0x272C33, 0x3C434D, 0x59626E, 0x8A94A1];
const GOLD = [0x7C4A03, 0xB7791F, 0xF2B636, 0xFDE68A, 0xFFFBEA];
const STEAM = 0xE5E7EB;
const WHEEL_FRAMES = 8; // over a sixth of a turn (the wheel has six spokes)
const M = 16; // the portal's margin round the door
const ARCH = 40; // the portal's pointed arch above the collar
// A torch off to the upper left, the vault's dark everywhere else
const KEY: Lighting = {
  key: [-0.55, -0.7, 0.5], keyColor: 0xFFB060, keyPower: 0.62, ambient: 0.06,
  focus: { x: R + M - 10, y: R + M + 20, r: 120, ry: 120, min: 0.25 },
};

export class GildedVault extends TrialStage {
  private open = 0; // door swing 0–1 once it bursts
  private thump = 0;
  private door: Sprite;
  private doorLit: Sprite;
  private wheel: Sprite;
  private wheelFrames: Texture[] = [];
  private pipes: Sprite;

  constructor(weapon: Texture | null, ticker: Ticker, host: StoneHost) {
    super(weapon, ticker, host, { night: 0x0C0A06, dim: 0.74, glow: GOLD[2], core: GOLD[4], mist: 0x8A7A5A, cold: 0x8C8170, warm: 0xFFE7A8 });
    this.shadow(DX, FOOT, R + 30, 6, 0.7);
    this.art(this.bake(portal(), KEY), this.backArt, DX - R - M, DY - R - M - ARCH);
    const door = doorArt();
    this.door = this.art(this.bake(door, KEY), this.setArt, DX - R, DY, 2, R + 2);
    // The same door with gold light leaking round its seam, faded in as the pressure builds
    this.doorLit = this.art(this.bake(door, { ...KEY, rim: { dx: 0, dy: 0, color: GOLD[3], power: 1.2 }, lights: [{ x: R + 2, y: R + 2, z: -30, color: GOLD[2], radius: R * 1.5, power: 0.6 }] }), this.setArt, DX - R, DY, 2, R + 2);
    for (let i = 0; i < WHEEL_FRAMES; i++) this.wheelFrames.push(this.bake(wheelArt((i / WHEEL_FRAMES) * (Math.PI / 3)), KEY));
    this.wheel = this.art(this.wheelFrames[0], this.setArt, DX, DY, 32, 32);
    this.pipes = this.art(this.bake(pipeArt(), KEY), this.setArt, GX - 44, GY - 22);
    this.art(this.bake(gaugeArt(), KEY), this.setArt, GX - 20, GY - 20);
  }

  protected restPose(): WeaponPose | null {
    return null; // behind the door
  }

  protected launchPoint() {
    return { x: DX, y: DY };
  }

  protected onRep(): void {
    this.thump = 1;
    this.steam(GX - 4, GY + 30, 10);
    this.ring(DX, DY, GOLD[3], { r: R - 4, grow: 14, life: 0.35, flat: 1 });
    audioManager.play('stomp', { vol: 0.5, rate: 1.3 });
    audioManager.play('gears', { vol: 0.35, rate: 1 + this.progress * 0.5 });
  }

  protected onBurst(): void {
    this.flash(0.6, GOLD[4]);
    this.debris(DX, DY + 20, 26, [GOLD[2], GOLD[3], GOLD[1]], { speed: 220, spread: 60, size: 2 });
    this.spray(DX, DY, 80, [GOLD[2], GOLD[3], GOLD[4]], 170, 160);
    this.steam(DX - R, DY, 30);
    audioManager.play('gears', { vol: 0.9, rate: 0.7 });
    audioManager.play('impact_metal', { vol: 0.9, rate: 0.5 });
    audioManager.play('holy', { vol: 0.6, delay: 0.3 });
  }

  protected onReject(): void {
    audioManager.play('impact_metal', { vol: 0.7, rate: 0.4 });
    this.steam(GX, GY + 30, 20);
  }

  private steam(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) this.mote(x, y, (Math.random() - 0.3) * 40, -20 - Math.random() * 30, 0.8 + Math.random() * 0.6, STEAM, 2);
  }

  protected paint(f: Frame): void {
    const { dt } = f;
    this.thump = Math.max(0, this.thump - dt * 5);
    if (this.burstDone) this.open = Math.min(1, this.open + dt * 1.4);
    // The leak hisses all the time, harder the higher the pressure
    if (this.phase === 'resting' && Math.random() < dt * (3 + this.shown * 12)) this.steam(GX - 30, GY + 52, 1);
    const b = this.back.clear();
    const bg = this.backGlow.clear();
    const s = this.set.clear();
    const glow = this.glow.clear();
    // Gold light behind the door, leaking from its seam as the pressure builds
    const light = this.burstDone ? 1 : this.shown * 0.35;
    if (light > 0.01) for (let i = 4; i >= 1; i--) bg.circle(DX, DY, R * (0.6 + i * 0.25)).fill({ color: GOLD[3], alpha: 0.06 * light });
    // The vault's mouth: dark until it bursts, then a furnace of gold
    if (this.burstDone) {
      b.circle(DX, DY, R + 2).fill({ color: GOLD[1] });
      b.circle(DX, DY, R - 4).fill({ color: GOLD[2] });
      b.circle(DX, DY, R - 16).fill({ color: GOLD[3] });
      b.circle(DX, DY, R - 34).fill({ color: GOLD[4] });
      this.pool(glow, DX, FOOT, 110, 12, GOLD[3], 0.35 * this.open);
    }
    // The door, swinging out on its left hinge: squashed toward the hinge as it opens
    const w = R * (1 - this.open * 0.85);
    const cx = DX - R + w;
    const shut = this.open < 1;
    this.door.visible = this.doorLit.visible = this.wheel.visible = shut;
    if (shut) {
      this.door.scale.x = this.doorLit.scale.x = w / R;
      this.doorLit.alpha = this.burstDone ? 1 : Math.min(1, this.shown * 1.2);
      // The wheel, turned a notch per thruster (six spokes: a sixth of a turn looks the same)
      const spin = this.shown * Math.PI * 3 + this.thump * 0.15;
      const step = ((spin % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3);
      this.wheel.texture = this.wheelFrames[Math.floor((step / (Math.PI / 3)) * WHEEL_FRAMES) % WHEEL_FRAMES];
      this.wheel.position.set(Math.round(cx), DY);
      this.wheel.scale.x = w / R;
      // Gold seams around the edge
      if (!this.burstDone) s.ellipse(cx, DY, w + 1, R + 1).stroke({ width: 1, color: GOLD[3], alpha: 0.2 + this.shown * 0.7 });
    }
    // The boiler pipe up to the gauge kicks on every thump
    const kick = Math.round(this.thump * 2);
    this.pipes.y = GY - 22 + kick;
    // The gauge: the needle climbs with the pressure
    for (let k = 0; k <= 10; k++) {
      const a = Math.PI * 0.8 + (k / 10) * Math.PI * 1.4;
      s.moveTo(GX + Math.cos(a) * 11, GY + Math.sin(a) * 11).lineTo(GX + Math.cos(a) * 13, GY + Math.sin(a) * 13).stroke({ width: 1, color: k > 7 ? 0xB91C1C : 0x1C1917 });
    }
    const na = Math.PI * 0.8 + this.shown * Math.PI * 1.4 + Math.sin(this.t * 30) * 0.02;
    s.moveTo(GX, GY).lineTo(GX + Math.cos(na) * 11, GY + Math.sin(na) * 11).stroke({ width: 1.5, color: 0xB91C1C });
    s.circle(GX, GY, 2).fill({ color: 0x1C1917 });
    if (this.shown > 0.75) glow.circle(GX, GY, 20).fill({ color: 0xF87171, alpha: 0.15 * Math.abs(Math.sin(this.t * 8)) });
  }
}

// --- Art ----------------------------------------------------------------------------------------------------

const STONE_A = { ramp: ramp(0x574C42, 6, 0x0C080A, 0xFFE6C0), grain: 0.05, gx: 4, gy: 3 };
const STONE_B = { ramp: ramp(0x4A4038, 6, 0x0C080A, 0xFFE6C0), grain: 0.05, gx: 4, gy: 3 };
const STEEL_M = { ramp: ramp(0x5A6370, 7, 0x0A0A18, 0xF4F1E8), shine: 0.8 };
const IRON_M = { ramp: ramp(0x3A3F48, 6, 0x07070F), shine: 0.5 };
const GOLD_M = { ramp: ramp(0xC28A22, 7, 0x2A0E08, 0xFFF6CC, 0.9), shine: 1 };

/** The treasury portal: ashlar wall between fluted columns, a bolted steel collar round the dark mouth. */
function portal(): LitCanvas {
  const w = (R + M) * 2;
  const top = ARCH;
  const c = new LitCanvas(w, FOOT - (DY - R - M - top));
  const cx = R + M;
  const cy = R + M + top;
  const a = c.material(STONE_A);
  const b = c.material(STONE_B);
  const steel = c.material(STEEL_M);
  const iron = c.material(IRON_M);
  const gold = c.material(GOLD_M);
  const dark = c.material({ ramp: ramp(0x1A1612, 5, 0x030206) });
  // Ashlar under a pointed arch springing at the door's centre line, its point at the top of the canvas
  const d = ((cy - 2) ** 2 - cx * cx) / (2 * cx);
  const inArch = (x: number, y: number) => y > cy || (Math.hypot(x - (cx - d), y - cy) < cx + d && Math.hypot(x - (cx + d), y - cy) < cx + d);
  c.group(() => {
    for (let row = 0; row * 12 < c.h; row++) {
      for (let x = -((row % 2) * 12); x < w; x += 24) {
        const m = (row + x / 24) % 3 === 0 ? b : a;
        // a pixel short each way: the gaps are inked as mortar by the outline pass
        c.shape(x + 12, row * 12, x + 35, row * 12 + 11, m, (px, py) => {
          if (!inArch(px, py)) return null;
          const e = Math.min(px - x - 12, x + 35 - px, py - row * 12, row * 12 + 11 - py);
          if (e > 1) return [0, 0, 1];
          return e === py - row * 12 ? [0, -0.8, 0.6] : e === row * 12 + 11 - py ? [0, 0.8, 0.6] : e === px - x - 12 ? [-0.8, 0, 0.6] : [0.8, 0, 0.6];
        });
      }
    }
  });
  c.ellipse(cx, cy, R + 2, R + 2, dark, -0.7);
  c.ring(cx, cy, R + 1, R + 12, steel);
  for (let k = 0; k < 12; k++) {
    const t = (k / 12) * Math.PI * 2 + Math.PI / 12;
    c.sphere(cx + Math.cos(t) * (R + 6.5), cy + Math.sin(t) * (R + 6.5), 2, iron);
  }
  const colTop = cy - 10;
  for (const x0 of [2, w - 16]) {
    c.cylV(x0, colTop + 8, 14, c.h - colTop - 16, a);
    for (let f = 3; f < 14; f += 4) c.carve(x0 + f, colTop + 12, x0 + f, c.h - 12, 0.3);
    c.box(x0 - 2, colTop, 18, 9, b, 2);
    c.box(x0 - 2, c.h - 9, 18, 9, b, 2);
  }
  // Keystone with a gold boss at the arch's point
  c.box(cx - 7, top - 12, 14, 16, b, 2);
  c.sphere(cx, top - 4, 3.5, gold);
  return c;
}

/** The round door: domed steel plate, a heavy rim, a cut groove, a gold inlay and sixteen rivets. */
function doorArt(): LitCanvas {
  const c = new LitCanvas(R * 2 + 4, R * 2 + 4);
  const o = R + 2;
  const steel = c.material(STEEL_M);
  const rim = c.material({ ...STEEL_M, ramp: ramp(0x4A525E, 7, 0x08081A, 0xF4F1E8) });
  const iron = c.material(IRON_M);
  const gold = c.material(GOLD_M);
  c.ellipse(o, o, R, R, steel, 0.45);
  c.ring(o, o, R - 8, R, rim);
  c.ring(o, o, R * 0.78 - 1.5, R * 0.78 + 1.5, steel, true);
  c.ring(o, o, R * 0.55 - 1.5, R * 0.55 + 1.5, gold);
  for (let k = 0; k < 16; k++) {
    const t = (k / 16) * Math.PI * 2;
    c.sphere(o + Math.cos(t) * (R - 4), o + Math.sin(t) * (R - 4), 2, iron);
  }
  for (let k = 0; k < 12; k++) {
    const t = (k / 12) * Math.PI * 2 + Math.PI / 12;
    c.carve(o + Math.cos(t) * R * 0.6, o + Math.sin(t) * R * 0.6, o + Math.cos(t) * R * 0.74, o + Math.sin(t) * R * 0.74, 0.25);
  }
  c.ellipse(o, o, 12, 12, iron, 0.3);
  return c;
}

/** The locking wheel at angle `a`: six steel spokes, gold grips and hub. */
function wheelArt(a: number): LitCanvas {
  const c = new LitCanvas(64, 64);
  const iron = c.material(IRON_M);
  const steel = c.material(STEEL_M);
  const gold = c.material(GOLD_M);
  c.ring(32, 32, 19, 23, iron);
  for (let k = 0; k < 6; k++) {
    const t = a + (k / 6) * Math.PI * 2;
    c.tube(32, 32, 32 + Math.cos(t) * 25, 32 + Math.sin(t) * 25, 4, steel);
  }
  for (let k = 0; k < 6; k++) {
    const t = a + (k / 6) * Math.PI * 2;
    c.sphere(32 + Math.cos(t) * 26, 32 + Math.sin(t) * 26, 3, gold);
  }
  c.sphere(32, 32, 7, gold);
  c.sphere(32, 32, 2.5, iron);
  return c;
}

/** The boiler pipe: up the wall from a brass valve, round an elbow, up to the gauge. A crack leaks steam. */
function pipeArt(): LitCanvas {
  const c = new LitCanvas(64, 86);
  const pipe = c.material({ ramp: ramp(0x6B7380, 6, 0x0A0A18, 0xF4F1E8), shine: 0.6 });
  const brass = c.material({ ...GOLD_M, ramp: ramp(0xA87A2A, 6, 0x2A0E08, 0xFFF0C0) });
  c.cylH(10, 74, 36, 6, pipe);
  c.cylV(41, 34, 6, 44, pipe);
  c.sphere(44, 77, 4, pipe);
  for (const y of [44, 62]) c.cylH(39, y, 10, 3, brass);
  c.cylV(22, 72, 4, 10, brass);
  c.box(4, 71, 8, 12, brass, 2);
  c.carve(14, 74, 16, 77, 0.5);
  return c;
}

/** The pressure gauge: brass bezel, enamel face, a glint on the glass. Ticks and needle are drawn live over it. */
function gaugeArt(): LitCanvas {
  const c = new LitCanvas(40, 40);
  const brass = c.material({ ...GOLD_M, ramp: ramp(0xB0802A, 6, 0x2A0E08, 0xFFF0C0) });
  const face = c.material({ ramp: ramp(0xD8CFB8, 5, 0x3A3020, 0xFFFDF5), lum: 0.35 });
  c.ring(20, 20, 13, 17, brass);
  c.ellipse(20, 20, 13.5, 13.5, face, 0.35);
  for (const [x, y] of [[13, 13], [14, 12], [15, 12], [12, 14]]) c.glow(x, y, 0xFFFFFF);
  return c;
}
