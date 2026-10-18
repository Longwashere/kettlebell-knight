import type { Sprite, Texture, Ticker } from 'pixi.js';
import { audioManager } from '../../../shared/AudioManager';
import type { StoneHost } from '../excalibellStone';
import { TrialStage, CX, FOOT, W, H, hash, type Frame, type WeaponPose } from '../trialStage';
import { LitCanvas, ramp, type Lighting } from './litArt';

/**
 * The Hollow Choir (`hollow_bell`, Eldritch Altar): a rift hangs open over the altar, tentacles feeling at its
 * edges, and five hooded singers kneel around it. The Hollow Bell floats before the tear, its eye watching the
 * knight. Single-leg RDLs knit the rift shut a little at a time while the choir lies: the screen jumps and tears
 * (glitch) as the HUD shows false counts and false failures. Win: the rift slams shut and the bell is released.
 */
const RX = CX + 44; // the rift
const RY = FOOT - 96;
const VOID = 0x07020F;
const EDGE = 0xA855F7;
const SICK = 0x4ADE80;
const SINGERS = 5;
const ALTAR_OX = RX - 40;
const ALTAR_OY = FOOT - 34;
const VOIDLIGHT: Lighting = { key: [-0.3, -0.8, 0.5], keyColor: 0x6A5A8A, keyPower: 0.3, ambient: 0.05 };

export class HollowChoir extends TrialStage {
  private glitchT = 0;
  private shut = 0; // rift slammed shut on the win
  private singers: Sprite[] = [];

  constructor(weapon: Texture | null, ticker: Ticker, host: StoneHost) {
    super(weapon, ticker, host, { night: 0x07030F, dangerNight: 0x0B0215, dim: 0.78, glow: EDGE, core: 0xF3E8FF, mist: 0x5B3F7A, cold: 0x7A6A9A, warm: 0xE9D5FF });
    this.shadow(RX, FOOT, 48, 5, 0.6);
    this.art(this.bake(altarArt(), { ...VOIDLIGHT, rim: { dx: 0, dy: -1, color: EDGE, power: 0.8 }, lights: [{ x: 40, y: RY - ALTAR_OY, z: 20, color: EDGE, radius: 130, power: 0.9 }] }), this.backArt, ALTAR_OX, ALTAR_OY);
    // Each singer lit by the rift from where it kneels
    const robe = singerArt();
    for (let i = 0; i < SINGERS; i++) {
      const { x, y } = this.singerAt(i);
      const lx = RX - x + 11;
      const ly = RY - y + 31;
      this.shadow(x, y, 11, 2, 0.6);
      this.singers.push(this.art(this.bake(robe, {
        ...VOIDLIGHT, tint: 1,
        rim: { dx: Math.sign(RX - x), dy: -1, color: EDGE, power: 0.7 },
        lights: [{ x: lx, y: ly, z: 16, color: EDGE, radius: 160, power: 0.9 }],
      }), this.setArt, x, y, 11, 31));
    }
  }

  private singerAt(i: number): { x: number; y: number } {
    const u = i / (SINGERS - 1);
    return { x: Math.round(RX - 96 + u * 192), y: Math.round(FOOT - 2 - Math.sin(u * Math.PI) * 14) };
  }

  protected restPose(): WeaponPose {
    const j = this.glitchT > 0 ? (Math.random() - 0.5) * 6 : 0;
    return { x: RX + j, y: RY + 6 + Math.sin(this.t * 1.4) * 3, rot: -Math.PI / 2 + Math.sin(this.t * 0.7) * 0.08 };
  }

  protected onRep(): void {
    this.ring(RX, RY, EDGE, { r: 10, grow: 50, life: 0.5, flat: 1 });
    this.spray(RX, RY, 8, [EDGE, SICK], 50);
    audioManager.play('portal', { vol: 0.3, rate: 1.2 + this.progress * 0.4 });
  }

  protected onGlitch(): void {
    this.glitchT = 0.35 + Math.random() * 0.3;
    this.flash(0.18, Math.random() < 0.5 ? 0xFF00FF : 0x00FFFF);
    this.host.shake(2);
  }

  protected onBurst(): void {
    this.shut = 0.01;
    this.flash(0.7, 0xF3E8FF);
    this.spray(RX, RY, 60, [EDGE, SICK, 0xF3E8FF], 140);
    audioManager.play('portal', { vol: 0.9, rate: 0.6 });
    audioManager.play('wail', { vol: 0.6, rate: 1.4 });
  }

  protected onReject(): void {
    audioManager.play('portal', { vol: 0.7, rate: 0.4 });
    audioManager.play('roar', { vol: 0.4, rate: 0.5, delay: 0.2 });
  }

  protected paint(f: Frame): void {
    const { dt } = f;
    this.glitchT = Math.max(0, this.glitchT - dt);
    if (this.shut > 0) this.shut = Math.min(1, this.shut + dt * 4);
    const b = this.back.clear();
    const bg = this.backGlow.clear();
    const s = this.set.clear();
    const o = this.over.clear();
    const jx = this.glitchT > 0 ? Math.round((Math.random() - 0.5) * 10) : 0;
    // The rift: narrower with every rep, wider as time runs out, a line of light once it shuts
    const width = this.shut > 0 ? 40 * (1 - this.shut) : Math.max(4, 34 * (1 - this.shown) + 10 + this.dangerShown * 16 + (this.phase === 'sealed' ? this.phaseT * 60 : 0));
    const tall = 120;
    const pts: number[] = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      const half = Math.sin(u * Math.PI) * width * (0.8 + 0.2 * hash(i, Math.floor(this.t * 4)));
      pts.push(RX + jx + half, RY - tall / 2 + u * tall);
    }
    for (let i = 12; i >= 0; i--) {
      const u = i / 12;
      const half = Math.sin(u * Math.PI) * width * (0.8 + 0.2 * hash(i + 20, Math.floor(this.t * 4)));
      pts.push(RX + jx - half, RY - tall / 2 + u * tall);
    }
    for (let i = 4; i >= 1; i--) bg.ellipse(RX + jx, RY, width + i * 10, tall / 2 + i * 6).fill({ color: EDGE, alpha: 0.05 });
    // The void in nested bands, blackest at its heart; a hot edge with a white-violet core
    const scaled = (k: number) => pts.map((v, i) => (i % 2 ? RY + (v - RY) * (0.6 + k * 0.4) : RX + jx + (v - RX - jx) * k));
    b.poly(pts).fill({ color: 0x3B0F66 });
    b.poly(scaled(0.8)).fill({ color: 0x1A0533 });
    b.poly(scaled(0.55)).fill({ color: VOID });
    b.poly(scaled(0.3)).fill({ color: 0x000000 });
    b.poly(pts).stroke({ width: 3, color: EDGE, alpha: 0.55 });
    b.poly(pts).stroke({ width: 1, color: 0xF3E8FF, alpha: 0.9 });
    // Stars inside the void
    for (let i = 0; i < 14; i++) {
      const x = RX + jx + (hash(i, 1) - 0.5) * width * 1.2;
      const y = RY + (hash(i, 2) - 0.5) * tall * 0.8;
      if (Math.abs(x - RX) < width * 0.6) b.rect(Math.round(x), Math.round(y), 1, 1).fill({ color: 0xF3E8FF, alpha: 0.7 });
    }
    // Tentacles feeling out of its edges, longer as the danger grows
    if (this.shut < 0.5) {
      const reach = 18 + this.dangerShown * 50 + (this.phase === 'sealed' ? this.phaseT * 80 : 0);
      for (let k = 0; k < 6; k++) {
        const side = k % 2 ? 1 : -1;
        const y0 = RY - 40 + k * 16;
        const sway = Math.sin(this.t * 1.6 + k) * 10;
        const x0 = RX + jx + side * width * 0.8;
        // Tapered: thick at the rift, a lit upper edge, pale suckers underneath
        const n = Math.max(6, Math.round(reach));
        for (let j = 0; j <= n; j++) {
          const u = j / n;
          const x = (1 - u) ** 2 * x0 + 2 * (1 - u) * u * (x0 + side * reach * 0.5) + u * u * (x0 + side * reach);
          const y = (1 - u) ** 2 * y0 + 2 * (1 - u) * u * (y0 + sway) + u * u * (y0 + sway * 1.6) + Math.sin(this.t * 3 + k + u * 6) * u * 2;
          const r = Math.max(0.6, 2.8 * (1 - u));
          b.circle(x, y, r + 0.8).fill({ color: 0x12031F });
          b.circle(x, y, r).fill({ color: 0x4C1D7A });
          b.rect(Math.round(x - r * 0.5), Math.round(y - r), 1, 1).fill({ color: 0xC4A5F5 });
          if (j % 4 === 2 && r > 1.4) b.rect(Math.round(x), Math.round(y + r - 1), 1, 1).fill({ color: 0xE9D5FF, alpha: 0.7 });
        }
      }
    }
    // The choir: hooded singers kneeling in an arc, mouths open
    const gone = this.burstDone && this.shut > 0.6;
    for (let i = 0; i < SINGERS; i++) {
      this.singers[i].visible = !gone;
      if (gone) continue;
      const { x, y } = this.singerAt(i);
      const sway = Math.round(Math.sin(this.t * 2 + i) * 1);
      this.singers[i].x = x + sway;
      const mouth = 1 + Math.abs(Math.sin(this.t * 5 + i * 1.3)) * 2;
      const eye = this.glitchT > 0 ? 0xFFFFFF : SICK;
      s.rect(x + sway - 2, y - 22, 1, 1).fill({ color: eye });
      s.rect(x + sway + 1, y - 22, 1, 1).fill({ color: eye });
      s.ellipse(x + sway, y - 17, 1.2, mouth).fill({ color: SICK, alpha: 0.8 });
      if (Math.random() < dt * 1.2) this.mote(x + sway, y - 18, (RX - x) * 0.2, -14, 1.6, SICK);
    }
    // The lie: the frame tears into colour-shifted slices
    if (this.glitchT > 0) {
      for (let i = 0; i < 6; i++) {
        const y = Math.floor(Math.random() * H);
        o.rect(0, y, W, 2 + Math.random() * 6).fill({ color: i % 2 ? 0xFF00FF : 0x00FFFF, alpha: 0.12 });
      }
    }
  }
}

// --- Art ----------------------------------------------------------------------------------------------------

const ROBE_M = { ramp: ramp(0x34224E, 6, 0x05020C, 0xE8D8FF, 0.6), grain: 0.04, gx: 1.5, gy: 8 };
const ALTAR_M = { ramp: ramp(0x3A3446, 6, 0x05020C, 0xE0D0F0), grain: 0.06, gx: 3, gy: 2 };

/** A kneeling singer: a pointed hood over a robe that spills wide on the floor, folds down its length. Anchor (11, 31). */
function singerArt(): LitCanvas {
  const c = new LitCanvas(22, 32);
  const robe = c.material(ROBE_M);
  const hollow = c.material({ ramp: ramp(0x0A0612, 3, 0x010003) });
  c.lathe(11, 1, 31, (y) => (y < 1 ? 0 : y < 11 ? 1 + Math.sqrt((y - 1) / 10) * 5.5 : y < 15 ? 6.5 + (y - 11) * 0.5 : 8.5 + ((y - 15) / 16) ** 1.5 * 2.5), robe);
  for (const x of [7, 11, 15]) c.carve(x, 17, x + (x - 11) * 0.2, 30, 0.2);
  c.ellipse(11, 9, 3.5, 4, hollow, -0.5);
  return c;
}

/** The altar under the rift: a cracked slab on two squat pillars, its face cut with runes that glow sickly green. */
function altarArt(): LitCanvas {
  const c = new LitCanvas(80, FOOT - ALTAR_OY);
  const stone = c.material(ALTAR_M);
  const ax = 40;
  const b = c.h;
  c.box(ax - 30, b - 18, 12, 18, stone, 2);
  c.box(ax + 18, b - 18, 12, 18, stone, 2);
  c.box(ax - 38, b - 26, 76, 8, stone, 2);
  c.carve(ax + 6, b - 26, ax + 2, b - 22);
  c.carve(ax + 2, b - 22, ax + 5, b - 18);
  for (let k = 0; k < 7; k++) {
    const x = ax - 31 + k * 10;
    c.glow(x, b - 23, SICK);
    c.glow(x + 1, b - 22, SICK);
    c.glow(x, b - 21, SICK);
    if (k % 2) c.glow(x + 2, b - 23, 0x86EFAC);
  }
  return c;
}
