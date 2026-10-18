import type { Texture, Ticker } from 'pixi.js';
import { audioManager } from '../../../shared/AudioManager';
import type { StoneHost } from '../excalibellStone';
import { TrialStage, CX, FOOT, W, H, hash, type Frame, type WeaponPose } from '../trialStage';

/**
 * The Drowned Anchor (`leviathan_anchor`, Sunken Cistern): a chain runs from a rusted pulley in the vault down
 * into a flooded well, and the Leviathan's Anchor hangs at its end, deep under. Floodwater rises across the
 * cistern floor the whole time (the danger meter); every gorilla row hauls a link of chain over the pulley,
 * lifts the anchor a notch and shoves the water back. Lose when it closes over the knight.
 */
const AX = CX + 34; // the well, under the anchor's head
/** The morning-star art: the handle's top and the head, from the sprite's centre at the stage's 2× zoom. */
const HANDLE = { x: -44, y: -32 };
const HEAD = { x: 18, y: 6 };
const PULLEY_X = AX - HEAD.x + HANDLE.x;
const PULLEY_Y = 10;
const DEEP = FOOT + 40; // the anchor's centre at the start: under the floor
const RAISED = FOOT - 84; // where the last row leaves it
const WATER = 0x0E7490;
const FOAM = 0xCCFBF1;
const STONE = [0x1B2426, 0x2B3A3D, 0x3E5154, 0x587073];
const IRON = [0x1C1917, 0x44403C, 0x78716C, 0xA8A29E];

export class DrownedAnchor extends TrialStage {
  private sink = 0; // the anchor slipping back on a fail
  private haulKick = 0;

  constructor(weapon: Texture | null, ticker: Ticker, host: StoneHost) {
    super(weapon, ticker, host, { night: 0x03141A, dangerNight: 0x021015, dim: 0.74, glow: 0x2DD4BF, core: FOAM, mist: 0x4C7D80, cold: 0x6E8FA0, warm: 0xC7F0E8, turn: Math.PI / 2 });
  }

  /** The water line on screen: rises from the floor toward the top of the frame with the danger. */
  private waterY(): number {
    return FOOT + 4 - this.dangerShown * 150 - (this.phase === 'sealed' ? Math.min(60, this.phaseT * 60) : 0);
  }

  private anchorY(): number {
    return DEEP + (RAISED - DEEP) * this.shown - this.haulKick * 4 + this.sink;
  }

  protected restPose(): WeaponPose {
    // Hanging from its handle, the anchor head over the well
    return { x: AX - HEAD.x + Math.sin(this.t * 0.9) * 1.5, y: this.anchorY(), rot: -Math.PI / 2 };
  }

  protected onRep(): void {
    this.haulKick = 1;
    const wy = this.waterY();
    this.spray(AX, Math.min(FOOT - 4, wy), 10, [FOAM, 0x67E8F9, WATER], 60, 200, true);
    this.ring(AX, Math.min(FOOT - 2, wy), FOAM, { r: 6, grow: 40, life: 0.5 });
    audioManager.play('rattle', { vol: 0.45, rate: 0.7 + this.progress * 0.4 });
    audioManager.play('splash', { vol: 0.3, rate: 1.2 });
  }

  protected onBurst(): void {
    // A geyser: the anchor tears out of the well and the chain whips loose
    this.spray(AX, FOOT - 10, 80, [FOAM, 0x67E8F9, WATER, 0xFFFFFF], 160, 260, true);
    this.debris(AX, FOOT - 6, 14, [...STONE, ...IRON], { speed: 180 });
    this.ring(AX, FOOT - 2, FOAM, { r: 14, grow: 200, life: 1, width: 2 });
    audioManager.play('wave', { vol: 0.8 });
    audioManager.play('splash', { vol: 0.9, rate: 0.7 });
    audioManager.play('impact_metal', { vol: 0.7, rate: 0.6 });
    audioManager.play('roar', { vol: 0.35, rate: 0.6, delay: 0.2 }); // something far below answers
  }

  protected onReject(): void {
    audioManager.play('wave', { vol: 0.6, rate: 0.7 });
    audioManager.play('gurgle', { vol: 0.6, delay: 0.3 });
  }

  protected paint(f: Frame): void {
    this.haulKick = Math.max(0, this.haulKick - f.dt * 6);
    if (this.phase === 'sealed') this.sink = Math.min(60, this.sink + f.dt * 50);
    this.paintVault(f);
    this.paintWater(f);
  }

  /** The pulley in the vault, the chain into the well, and the well's stone mouth (hiding the anchor under the floor). */
  private paintVault(f: Frame): void {
    const g = this.back.clear();
    const s = this.set.clear();
    // Pulley beam and wheel, turning as the chain comes up
    g.rect(PULLEY_X - 40, PULLEY_Y - 6, 80, 6).fill({ color: 0x2B1E14 }).stroke({ width: 1, color: 0x0A0705 });
    const spin = this.shown * 12 + this.haulKick * 0.4;
    g.circle(PULLEY_X, PULLEY_Y + 6, 9).fill({ color: IRON[0] });
    g.circle(PULLEY_X, PULLEY_Y + 6, 7).stroke({ width: 2, color: IRON[2] });
    for (let k = 0; k < 4; k++) {
      const a = spin + (k * Math.PI) / 2;
      g.moveTo(PULLEY_X, PULLEY_Y + 6).lineTo(PULLEY_X + Math.cos(a) * 7, PULLEY_Y + 6 + Math.sin(a) * 7).stroke({ width: 1, color: IRON[2] });
    }
    // The chain down to the top of the anchor's handle
    const top = this.burstDone ? FOOT : this.anchorY() + HANDLE.y;
    const links = Math.max(0, Math.floor((top - PULLEY_Y - 14) / 4));
    for (let i = 0; i < links; i++) {
      const y = PULLEY_Y + 14 + i * 4 + ((this.shown * 300) % 4);
      if (this.burstDone && i > 8) break;
      const odd = i % 2 === 1;
      g.rect(PULLEY_X - (odd ? 1 : 2), y, odd ? 2 : 4, 3).fill({ color: IRON[odd ? 1 : 3] });
    }
    // Well mouth in front: the floor around it hides the anchor until it rises
    s.rect(AX - 60, FOOT - 1, 120, H - FOOT + 1).fill({ color: STONE[0] });
    s.ellipse(AX, FOOT, 26, 6).fill({ color: 0x020809 });
    for (let k = 0; k < 9; k++) {
      const a = Math.PI + (k / 8) * Math.PI;
      const x = AX + Math.cos(a) * 30;
      const y = FOOT + Math.sin(a) * 7;
      s.rect(Math.round(x) - 4, Math.round(y) - 3, 8, 5).fill({ color: STONE[2 + (k % 2)] }).stroke({ width: 1, color: STONE[0] });
    }
    for (let k = 0; k < 9; k++) {
      const a = (k / 8) * Math.PI;
      const x = AX + Math.cos(a) * 30;
      const y = FOOT + Math.sin(a) * 7 + 2;
      s.rect(Math.round(x) - 4, Math.round(y) - 3, 8, 6).fill({ color: STONE[1 + (k % 2)] }).stroke({ width: 1, color: STONE[0] });
    }
  }

  /** Floodwater over the floor (in front of the knight), its surface rippling, bubbles rising through it. */
  private paintWater(f: Frame): void {
    const o = this.over.clear();
    const glow = this.glow.clear();
    const wy = this.waterY();
    if (wy > H) return;
    o.rect(0, wy, W, H - wy).fill({ color: WATER, alpha: 0.42 });
    o.rect(0, wy + 6, W, H - wy).fill({ color: 0x083344, alpha: 0.25 });
    // Surface: a bright rippling line
    for (let x = 0; x < W; x += 3) {
      const y = wy + Math.sin(x * 0.08 + this.t * 3) * 1.5 + Math.sin(x * 0.03 - this.t * 1.7) * 1;
      o.rect(x, Math.round(y), 3, 1).fill({ color: FOAM, alpha: 0.7 });
    }
    // Bubbles
    for (let i = 0; i < 18; i++) {
      const x = (hash(i, 3) * W + this.t * 6 * (hash(i, 7) - 0.5)) % W;
      const rise = (this.t * (14 + hash(i, 5) * 20) + hash(i, 9) * 200) % Math.max(1, H - wy);
      const y = H - rise;
      if (y > wy + 2) o.circle(x, y, hash(i, 11) < 0.3 ? 1.5 : 1).stroke({ width: 1, color: FOAM, alpha: 0.5 });
    }
    glow.rect(0, wy - 2, W, 4).fill({ color: 0x2DD4BF, alpha: 0.12 });
  }
}
