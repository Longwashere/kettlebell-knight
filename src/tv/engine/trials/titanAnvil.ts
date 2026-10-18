import type { Sprite, Texture, Ticker } from 'pixi.js';
import { audioManager } from '../../../shared/AudioManager';
import type { StoneHost } from '../excalibellStone';
import { TrialStage, CX, FOOT, W, mix, hash, type Frame, type WeaponPose } from '../trialStage';
import { LitCanvas, ramp, type Lighting } from './litArt';

/**
 * The Titan's Anvil (`heartforge`, Volcanic Forge): an unfinished blade lies on the inferno titan's anvil, and a
 * spectral forge-hammer hangs over it. Every clean & press brings the hammer down in a shower of sparks and
 * heats the steel; between reps it cools from white through yellow and red toward black (the danger meter), and
 * cracks spread through it as it goes cold. Lose when it cracks through. Win: the blade is quenched in a burst of
 * steam and rises as the Heartforge.
 */
const AX = CX + 40; // the anvil
const ATOP = FOOT - 30;
const BLADE_Y = ATOP - 8;
const IRON = [0x0D0D10, 0x1F2026, 0x34363F, 0x4E515C];
const LAVA = [0x7C2D12, 0xEA580C, 0xFB923C, 0xFDE68A];
const OX = AX - 56; // the anvil's canvas
const OY = ATOP - 8;
const LAVA_RIM = { dx: 0, dy: 0, color: 0xFF7A2A, power: 0.55 };
// The blade white-hot on the face, the lava behind catching the silhouette
const HOT: Lighting = { key: [-0.4, -0.8, 0.45], keyPower: 0.25, ambient: 0.05, rim: LAVA_RIM, tint: 1.1, lights: [{ x: 56, y: 2, z: 8, color: 0xFFB066, radius: 70, power: 1.3 }] };
const COLD: Lighting = { key: [-0.4, -0.8, 0.45], keyColor: 0x8090B0, keyPower: 0.35, ambient: 0.05, rim: LAVA_RIM };

export class TitanAnvil extends TrialStage {
  private hammer = 0; // 0 raised → 1 struck
  private hammerT = 1; // time since the last strike
  private snapped = false;
  private anvilHot: Sprite;

  constructor(weapon: Texture | null, ticker: Ticker, host: StoneHost) {
    super(weapon, ticker, host, { night: 0x140603, dangerNight: 0x050202, dim: 0.72, glow: LAVA[2], core: LAVA[3], mist: 0x6B3A2A, cold: 0x8A6E66, warm: 0xFFD9B0 });
    this.shadow(AX - 4, FOOT, 50, 5, 0.75);
    const anvil = anvilArt();
    this.art(this.bake(anvil, COLD), this.setArt, OX, OY);
    this.anvilHot = this.art(this.bake(anvil, HOT), this.setArt, OX, OY);
  }

  /** The steel's heat, 1 white-hot → 0 black. */
  private heat(): number {
    if (this.phase === 'sealed') return 0;
    if (this.phase !== 'resting') return 1;
    return 1 - this.dangerShown;
  }

  protected restPose(): WeaponPose | null {
    if (this.snapped) return null;
    const h = this.heat();
    const tint = h > 0.66 ? mix(0xFFD27A, 0xFFFFFF, (h - 0.66) * 3) : h > 0.33 ? mix(0xFF6A2A, 0xFFD27A, (h - 0.33) * 3) : mix(0x3A3A3A, 0xFF6A2A, h * 3);
    return { x: AX, y: BLADE_Y, rot: 0, tint };
  }

  protected onRep(): void {
    this.hammerT = 0;
  }

  protected onBurst(): void {
    // Quenched: a wall of steam, then the blade rises
    for (let i = 0; i < 70; i++) this.mote(AX + (Math.random() - 0.5) * 80, BLADE_Y, (Math.random() - 0.5) * 80, -30 - Math.random() * 80, 1 + Math.random(), 0xF5F5F4, 2);
    this.spray(AX, BLADE_Y, 40, [LAVA[3], LAVA[2], 0xFFFFFF], 140, 220);
    audioManager.play('fire_burst', { vol: 0.7, rate: 0.7 });
    audioManager.play('frost', { vol: 0.6, rate: 0.6 }); // the hiss
    audioManager.play('impact_metal', { vol: 0.8, rate: 0.8 });
  }

  protected onReject(): void {
    this.snapped = true;
    this.debris(AX, BLADE_Y, 10, [0x3A3A3A, 0x52525B, 0x18181B], { speed: 120, spread: 50 });
    audioManager.play('crack', { vol: 0.9, rate: 0.8 });
    audioManager.play('frost', { vol: 0.4, rate: 0.5 });
  }

  protected paint(f: Frame): void {
    const { dt } = f;
    this.hammerT += dt;
    // The strike: a quick drop, a ringing impact, a slow lift back
    const prev = this.hammer;
    this.hammer = this.hammerT < 0.1 ? this.hammerT / 0.1 : Math.max(0, 1 - (this.hammerT - 0.1) / 0.45);
    if (prev < 1 && this.hammer >= 1 && this.phase === 'resting') this.clang();
    const b = this.back.clear();
    const bg = this.backGlow.clear();
    const s = this.set.clear();
    const glow = this.glow.clear();
    // A lava river behind: a crust on each bank, the molten core flowing and flickering between them
    for (let x = 0; x < W; x += 2) {
      const y = Math.round(FOOT - 37 + Math.sin(x * 0.05 + this.t) * 1.5);
      const cell = Math.floor((x + this.t * 14) / 5);
      const hot = hash(cell, Math.floor(this.t * 2 + hash(cell, 9) * 4));
      b.rect(x, y, 2, 1).fill({ color: 0x2A0A04 });
      b.rect(x, y + 1, 2, 2).fill({ color: hot > 0.7 ? LAVA[3] : hot > 0.3 ? LAVA[2] : LAVA[1] });
      b.rect(x, y + 3, 2, 2).fill({ color: hot > 0.55 ? LAVA[2] : LAVA[1] });
      b.rect(x, y + 5, 2, 1).fill({ color: LAVA[0] });
      b.rect(x, y + 6, 2, 1).fill({ color: 0x2A0A04 });
    }
    this.pool(bg, W / 2, FOOT - 34, W * 0.7, 14, LAVA[1], 0.22, 3);
    if (Math.random() < dt * 10) this.mote(Math.random() * W, FOOT - 30, (Math.random() - 0.5) * 10, -20 - Math.random() * 30, 2 + Math.random() * 2, LAVA[2 + (Math.random() < 0.3 ? 1 : 0)]);
    // The anvil glows with the blade's heat
    this.anvilHot.alpha = this.snapped ? 0 : this.heat();
    // Heat glow off the blade, and cracks once it runs cold
    const h = this.heat();
    if (!this.snapped) {
      glow.ellipse(AX, BLADE_Y, 56, 6 + h * 4).fill({ color: h > 0.5 ? LAVA[3] : LAVA[1], alpha: 0.06 + h * 0.14 });
      const cracks = Math.max(0, (0.45 - h) / 0.45);
      for (let i = 0; i < Math.floor(cracks * 8); i++) {
        const x = AX - 30 + hash(i, 5) * 70;
        s.moveTo(x, BLADE_Y - 4).lineTo(x + (hash(i, 6) - 0.5) * 6, BLADE_Y).lineTo(x + (hash(i, 7) - 0.5) * 6, BLADE_Y + 4).stroke({ width: 1, color: 0x0A0A0A });
      }
    }
    // The titan's spectral hammer, swinging down on its arc
    if (this.phase === 'resting' || this.phase === 'sealed') {
      const ang = -1.2 + this.hammer * 1.2; // radians from raised to flat
      const pivot = { x: AX + 70, y: ATOP - 50 };
      const hx = pivot.x + Math.cos(Math.PI + ang) * 68;
      const hy = pivot.y + Math.sin(Math.PI + ang) * 68;
      // Haft, then a heavy rectangular head square to it
      glow.moveTo(pivot.x, pivot.y).lineTo(hx, hy).stroke({ width: 7, color: LAVA[1], alpha: 0.45 });
      glow.moveTo(pivot.x, pivot.y).lineTo(hx, hy).stroke({ width: 2, color: LAVA[3], alpha: 0.8 });
      const ux = Math.cos(Math.PI + ang);
      const uy = Math.sin(Math.PI + ang);
      const corners: number[] = [];
      for (const [along, across] of [[-6, -18], [14, -18], [14, 18], [-6, 18]]) corners.push(hx + ux * along - uy * across, hy + uy * along + ux * across);
      glow.poly(corners).fill({ color: LAVA[2], alpha: 0.45 }).stroke({ width: 2, color: LAVA[3], alpha: 0.95 });
      glow.poly(corners).fill({ color: LAVA[3], alpha: 0.12 + this.hammer * 0.3 });
    }
  }

  private clang(): void {
    this.spray(AX - 10, BLADE_Y - 4, 22, [LAVA[3], LAVA[2], 0xFFFFFF], 150, 260, true);
    this.ring(AX, BLADE_Y, LAVA[3], { r: 6, grow: 60, life: 0.4, flat: 0.4, width: 2 });
    this.flash(0.12, LAVA[3]);
    this.host.shake(2);
    audioManager.play('impact_metal', { vol: 0.8, rate: 1.1 + this.progress * 0.3 });
    audioManager.play('fire', { vol: 0.25, rate: 1.5 });
  }
}

// --- Art ----------------------------------------------------------------------------------------------------

/** The titan's anvil: a broad face with a hardy hole, a horn tapering right, a pinched waist and a flared foot. */
function anvilArt(): LitCanvas {
  const c = new LitCanvas(112, FOOT - OY + 1);
  const iron = c.material({ ramp: ramp(0x3A3840, 7, 0x0A0408, 0xFFC890, 0.6), shine: 0.6, grain: 0.03, gx: 5, gy: 2 });
  const face = c.material({ ramp: ramp(0x4A4850, 7, 0x0A0408, 0xFFE8C8), shine: 1 });
  const ax = AX - OX;
  const top = ATOP - OY;
  const foot = c.h - 1;
  // Horn: a cone lying to the right, its tip turned up a touch
  c.shape(ax + 30, top - 2, ax + 56, top + 10, iron, (x, y) => {
    const u = (x - ax - 30) / 24;
    const hh = 4.6 * Math.pow(1 - u, 0.7) + 0.4;
    const cy = top + 4 - u * u * 3;
    const v = (y - cy) / hh;
    if (Math.abs(v) > 1) return null;
    return [0.25, v * 0.95, Math.sqrt(Math.max(0.05, 1 - v * v))];
  });
  // The body under the face: waist pinched in, then flaring to the foot
  const halfAt = (y: number) => {
    const k = (y - top - 8) / (foot - top - 8);
    return k < 0.55 ? 30 - k * 30 : 13.5 + ((k - 0.55) / 0.45) ** 1.4 * 20;
  };
  c.shape(ax - 34, top + 8, ax + 34, foot, iron, (x, y) => {
    const hw = halfAt(y);
    const u = (x - ax + 4) / hw;
    if (Math.abs(u) > 1) return null;
    const slope = halfAt(y + 0.5) - halfAt(y - 0.5);
    return [u * 0.8, -slope * 0.6, Math.sqrt(Math.max(0.1, 1 - u * u * 0.64))];
  });
  c.box(ax - 48, top, 84, 9, face, 2);
  c.box(ax - 52, top + 1, 6, 6, iron, 1); // the heel
  c.carve(ax - 40, top + 3, ax - 37, top + 3, 0.5); // hardy hole
  c.carve(ax - 40, top + 4, ax - 37, top + 4, 0.5);
  c.carve(ax + 20, top + 3, ax + 21, top + 3, 0.5); // pritchel hole
  // The titan's mark struck into the waist
  c.carve(ax - 8, top + 13, ax - 4, top + 19, 0.3);
  c.carve(ax - 4, top + 19, ax, top + 13, 0.3);
  return c;
}
