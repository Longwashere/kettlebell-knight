import type { Texture, Ticker } from 'pixi.js';
import { audioManager } from '../../../shared/AudioManager';
import type { StoneHost } from '../excalibellStone';
import type { TrialRepResult } from '../../../shared/secretTrials';
import { TrialStage, CX, FOOT, W, H, hash, bolt, type Frame, type WeaponPose } from '../trialStage';

/**
 * The Great Bell (`tolling_thunder`, Belfry Ramparts): the belfry's bronze bell hangs in its timber frame in a
 * lashing storm, its rope trailing to the knight. Lightning strikes on a steady beat; a snatch on the beat hauls
 * the rope and the bell tolls (a rune on its rim lights up), a snatch off it only rocks the bell with a dull
 * clank. Tolling Thunder sleeps inside it: the last toll cracks the bell open in a column of lightning.
 */
const BX = CX + 40; // the bell's hang point
const BEAM = 44;
const BRONZE = [0x3A2410, 0x6B4518, 0x9A6A24, 0xC99A3E, 0xF2D27A];
const BOLT = 0xA5F3FC;
const RUNES = 12;

export class GreatBell extends TrialStage {
  private a = 0; // bell swing angle
  private av = 0;
  private strike = 0; // lightning flash left on the current beat
  private strikeX = BX;
  private seed = 0;
  private tolls = 0;

  constructor(weapon: Texture | null, ticker: Ticker, host: StoneHost) {
    super(weapon, ticker, host, { night: 0x0A1020, dim: 0.74, glow: BOLT, core: 0xECFEFF, mist: 0x5B6B86, cold: 0x7C8BAA, warm: 0xE0F7FF });
  }

  protected restPose(): WeaponPose | null {
    return null; // inside the bell
  }

  protected launchPoint() {
    return { x: BX, y: BEAM + 46 };
  }

  protected onBeat(): void {
    this.strike = 1;
    this.seed += 1;
    this.strikeX = BX + (hash(this.seed, 2) - 0.5) * 220;
    this.flash(0.12, 0xE0F7FF);
    audioManager.play('thunder', { vol: 0.25, rate: 1.2 + hash(this.seed, 3) * 0.3 });
  }

  protected onRep(): void {
    this.tolls += 1;
    this.av += 2.4;
    this.ring(BX, BEAM + 40, 0xF2D27A, { r: 14, grow: 90, life: 0.8, flat: 1, width: 2 });
    this.ring(BX, BEAM + 40, BOLT, { r: 6, grow: 60, life: 0.5, flat: 1 });
    this.spray(BX, BEAM + 60, 10, [BOLT, 0xFFFFFF], 70);
    audioManager.play('block', { vol: 0.8, rate: 0.42 }); // the toll
    audioManager.play('zap', { vol: 0.25, rate: 0.8 });
  }

  protected onMiss(kind: TrialRepResult): void {
    if (kind !== 'offbeat') return;
    this.av += 0.6;
    audioManager.play('thud', { vol: 0.5, rate: 0.8 });
  }

  protected onBurst(): void {
    this.flash(0.6, 0xECFEFF);
    this.strike = 1.4;
    this.strikeX = BX;
    this.debris(BX, BEAM + 40, 16, BRONZE, { speed: 200, spread: 40, size: 4 });
    this.spray(BX, BEAM + 40, 60, [BOLT, 0xFFFFFF, 0x67E8F9], 160);
    audioManager.play('thunder', { vol: 1 });
    audioManager.play('crack', { vol: 0.9 });
    audioManager.play('block', { vol: 0.9, rate: 0.35 });
  }

  protected onReject(): void {
    audioManager.play('thunder', { vol: 0.5, rate: 0.7 });
    audioManager.play('crack', { vol: 0.5, rate: 0.6 });
  }

  protected paint(f: Frame): void {
    const { dt } = f;
    // A damped pendulum
    this.av += -this.a * 30 * dt;
    this.av *= 1 - dt * 1.2;
    this.a += this.av * dt;
    this.strike = Math.max(0, this.strike - dt * 3);
    const b = this.back.clear();
    const s = this.set.clear();
    const glow = this.glow.clear();
    const o = this.over.clear();
    // Lightning on the beat, behind the belfry
    if (this.strike > 0.1) {
      bolt(this.backGlow.clear(), this.strikeX, -4, this.burstDone ? BX : this.strikeX + 20, this.burstDone ? BEAM + 40 : 110, BOLT, 0xFFFFFF, Math.min(1, this.strike), this.seed);
    } else this.backGlow.clear();
    // Timber frame
    b.rect(BX - 66, BEAM, 8, FOOT - BEAM).fill({ color: 0x2A1A0E }).stroke({ width: 1, color: 0x0A0603 });
    b.rect(BX + 58, BEAM, 8, FOOT - BEAM).fill({ color: 0x2A1A0E }).stroke({ width: 1, color: 0x0A0603 });
    b.rect(BX - 74, BEAM - 8, 148, 9).fill({ color: 0x3B2614 }).stroke({ width: 1, color: 0x0A0603 });
    b.poly([BX - 66, FOOT - 40, BX - 40, BEAM, BX - 34, BEAM, BX - 60, FOOT - 40]).fill({ color: 0x24160B });
    b.poly([BX + 66, FOOT - 40, BX + 40, BEAM, BX + 34, BEAM, BX + 60, FOOT - 40]).fill({ color: 0x24160B });
    // The bell (in pieces once it bursts)
    if (!this.burstDone) {
      const ang = this.a * 0.25;
      const c = Math.cos(ang);
      const sn = Math.sin(ang);
      const T = (dx: number, dy: number) => [BX + dx * c - dy * sn, BEAM + dx * sn + dy * c] as [number, number];
      const outline: number[] = [];
      const profile: [number, number][] = [[-8, 4], [-14, 10], [-18, 30], [-22, 50], [-32, 62], [32, 62], [22, 50], [18, 30], [14, 10], [8, 4]];
      for (const [x, y] of profile) outline.push(...T(x, y));
      s.poly(outline).fill({ color: BRONZE[2] }).stroke({ width: 1.5, color: BRONZE[0] });
      const lit: number[] = [];
      for (const [x, y] of [[-6, 6], [-11, 12], [-14, 30], [-17, 50], [-24, 60], [-4, 60], [-2, 12]] as [number, number][]) lit.push(...T(x, y));
      s.poly(lit).fill({ color: BRONZE[3] });
      const [lx0, ly0] = T(-30, 56);
      const [lx1, ly1] = T(30, 56);
      s.moveTo(lx0, ly0).lineTo(lx1, ly1).stroke({ width: 2, color: BRONZE[1] });
      // Runes round the rim: one per toll, lit blue
      for (let i = 0; i < RUNES; i++) {
        const u = i / (RUNES - 1);
        const [rx, ry] = T(-26 + u * 52, 52);
        const on = i < Math.round(this.shown * RUNES);
        s.rect(Math.round(rx), Math.round(ry), 2, 3).fill({ color: on ? BOLT : BRONZE[1] });
        if (on) glow.circle(rx + 1, ry + 1, 4).fill({ color: BOLT, alpha: 0.35 });
      }
      // The clapper
      const [kx, ky] = T(Math.sin(this.t * 2 + this.a) * 6, 58);
      s.circle(kx, ky + 4, 4).fill({ color: BRONZE[0] });
      // The rope to the knight
      const [rx, ry] = T(0, 62);
      s.moveTo(rx, ry + 2).quadraticCurveTo((rx + CX - 70) / 2, FOOT - 30 + Math.sin(this.t * 2) * 4, CX - 70, FOOT - 70).stroke({ width: 2, color: 0x8B6B3E });
      glow.circle(BX, BEAM + 36, 30 + this.strike * 20).fill({ color: BOLT, alpha: 0.04 + this.strike * 0.1 + this.shown * 0.06 });
    }
    // Rain, driven sideways
    for (let i = 0; i < 70; i++) {
      const x = (hash(i, 1) * (W + 60) + this.t * 260) % (W + 60) - 30;
      const y = (hash(i, 2) * H + this.t * 420 * (0.8 + hash(i, 3) * 0.4)) % H;
      o.moveTo(x, y).lineTo(x - 5, y + 9).stroke({ width: 1, color: 0x9FB4D9, alpha: 0.35 });
    }
  }
}
