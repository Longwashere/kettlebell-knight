import type { Texture, Ticker } from 'pixi.js';
import { audioManager } from '../../../shared/AudioManager';
import type { StoneHost } from '../excalibellStone';
import { TrialStage, CX, FOOT, W, H, hash, type Frame, type WeaponPose } from '../trialStage';

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

export class HollowChoir extends TrialStage {
  private glitchT = 0;
  private shut = 0; // rift slammed shut on the win

  constructor(weapon: Texture | null, ticker: Ticker, host: StoneHost) {
    super(weapon, ticker, host, { night: 0x07030F, dangerNight: 0x0B0215, dim: 0.78, glow: EDGE, core: 0xF3E8FF, mist: 0x5B3F7A, cold: 0x7A6A9A, warm: 0xE9D5FF });
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
    b.poly(pts).fill({ color: VOID }).stroke({ width: 2, color: EDGE });
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
        b.moveTo(x0, y0).quadraticCurveTo(x0 + side * reach * 0.5, y0 + sway, x0 + side * reach, y0 + sway * 1.6).stroke({ width: 3, color: 0x3B0764 });
        b.moveTo(x0, y0).quadraticCurveTo(x0 + side * reach * 0.5, y0 + sway, x0 + side * reach, y0 + sway * 1.6).stroke({ width: 1, color: EDGE, alpha: 0.6 });
      }
    }
    // The choir: hooded singers kneeling in an arc, mouths open
    for (let i = 0; i < SINGERS; i++) {
      if (this.burstDone && this.shut > 0.6) break;
      const u = i / (SINGERS - 1);
      const x = RX - 96 + u * 192;
      const y = FOOT - 2 - Math.sin(u * Math.PI) * 14;
      const sway = Math.round(Math.sin(this.t * 2 + i) * 1);
      s.poly([x - 9 + sway, y, x - 6 + sway, y - 20, x + sway, y - 28, x + 6 + sway, y - 20, x + 9 + sway, y]).fill({ color: 0x1E1033 }).stroke({ width: 1, color: 0x0A0414 });
      s.ellipse(x + sway, y - 20, 3.5, 4).fill({ color: VOID });
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
