import type { Texture, Ticker } from 'pixi.js';
import { audioManager } from '../../../shared/AudioManager';
import type { StoneHost } from '../excalibellStone';
import { TrialStage, CX, FOOT, type Frame, type WeaponPose } from '../trialStage';

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

export class GildedVault extends TrialStage {
  private open = 0; // door swing 0–1 once it bursts
  private thump = 0;

  constructor(weapon: Texture | null, ticker: Ticker, host: StoneHost) {
    super(weapon, ticker, host, { night: 0x0C0A06, dim: 0.74, glow: GOLD[2], core: GOLD[4], mist: 0x8A7A5A, cold: 0x8C8170, warm: 0xFFE7A8 });
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
    // The vault frame
    b.rect(DX - R - 10, DY - R - 10, (R + 10) * 2, (R + 10) * 2 + (FOOT - DY - R - 10)).fill({ color: STEEL[1] }).stroke({ width: 1, color: STEEL[0] });
    b.circle(DX, DY, R + 4).fill({ color: this.burstDone ? GOLD[1] : 0x050505 });
    if (this.burstDone) b.circle(DX, DY, R).fill({ color: GOLD[3], alpha: 0.8 });
    // The door, swinging out on its left hinge: squashed toward the hinge as it opens
    const w = R * (1 - this.open * 0.85);
    const cx = DX - R + w;
    if (this.open < 1) {
      s.ellipse(cx, DY, w, R).fill({ color: STEEL[3] }).stroke({ width: 2, color: STEEL[0] });
      s.ellipse(cx, DY, w * 0.82, R * 0.82).stroke({ width: 2, color: STEEL[2] });
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        s.rect(Math.round(cx + Math.cos(a) * w * 0.91) - 1, Math.round(DY + Math.sin(a) * R * 0.91) - 1, 2, 2).fill({ color: STEEL[4] });
      }
      // The wheel, turned a notch per thruster
      const spin = this.shown * Math.PI * 3 + this.thump * 0.15;
      for (let k = 0; k < 6; k++) {
        const a = spin + (k / 6) * Math.PI * 2;
        s.moveTo(cx, DY).lineTo(cx + Math.cos(a) * w * 0.42, DY + Math.sin(a) * R * 0.42).stroke({ width: 3, color: STEEL[1] });
        s.circle(cx + Math.cos(a) * w * 0.42, DY + Math.sin(a) * R * 0.42, 2.5).fill({ color: GOLD[2] });
      }
      s.circle(cx, DY, 7).fill({ color: GOLD[1] }).stroke({ width: 1, color: STEEL[0] });
      // Gold seams around the edge
      if (!this.burstDone) s.ellipse(cx, DY, w + 1, R + 1).stroke({ width: 1, color: GOLD[3], alpha: 0.2 + this.shown * 0.7 });
    }
    // The boiler pipe up to the gauge, and the crack that leaks
    const kick = Math.round(this.thump * 2);
    s.rect(GX - 34, GY + 52 + kick, 34, 6).fill({ color: STEEL[2] }).stroke({ width: 1, color: STEEL[0] });
    s.rect(GX - 3, GY + 14, 6, 44 + kick).fill({ color: STEEL[2] }).stroke({ width: 1, color: STEEL[0] });
    s.rect(GX - 38, GY + 50 + kick, 6, 10).fill({ color: GOLD[1] });
    // The gauge: the needle climbs with the pressure
    s.circle(GX, GY, 16).fill({ color: GOLD[1] });
    s.circle(GX, GY, 14).fill({ color: 0xF5F0E1 });
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
