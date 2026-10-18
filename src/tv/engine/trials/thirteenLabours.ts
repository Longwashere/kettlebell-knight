import type { Texture, Ticker } from 'pixi.js';
import { audioManager } from '../../../shared/AudioManager';
import type { StoneHost } from '../excalibellStone';
import { TrialStage, CX, FOOT, hash, type Frame, type WeaponPose } from '../trialStage';

/**
 * The Thirteen Labours (`excalibane`, Obsidian Throne): the Dark Emperor's shade still sits his throne, and
 * Excalibane, Excalibell's shadow twin, stands driven point-down into the seat before him. Thirteen rune stones
 * ring the dais, one per exercise; every labour completed lights one, and a golden thread from Excalibell in the
 * knight's hand to the black blade brightens with each. The shade fades as the runes fill; the thirteenth
 * shatters the throne.
 */
const TX = CX + 52; // the throne
const RUNES = 13;
const OBSIDIAN = [0x050409, 0x1A1428, 0x2E2445, 0x4A3B6B, 0x6E5C9E];
const VIOLET = 0xA78BFA;
const GOLD = 0xFBBF24;

export class ThirteenLabours extends TrialStage {
  private flare: number[] = new Array(RUNES).fill(0);
  private lit = 0;

  constructor(weapon: Texture | null, ticker: Ticker, host: StoneHost) {
    super(weapon, ticker, host, { night: 0x06030D, dangerNight: 0x020106, dim: 0.8, glow: VIOLET, core: 0xEDE9FE, mist: 0x4C3D6B, cold: 0x6E6390, warm: 0xFFE9B0 });
  }

  protected restPose(): WeaponPose {
    const j = this.jolt * Math.sin(this.t * 60);
    return { x: TX + j, y: FOOT - 66, rot: Math.PI / 2 }; // point-down in the seat
  }

  protected onRep(): void {
    // A labour is 3 reps: a rune lights when the progress crosses into it
    const now = Math.floor(this.progress * RUNES + 1e-6);
    if (now > this.lit) {
      for (let i = this.lit; i < now; i++) this.flare[i] = 1;
      this.lit = now;
      const r = this.rune(now - 1);
      this.spray(r.x, r.y - 4, 16, [VIOLET, GOLD, 0xFFFFFF], 80, 0, true);
      this.ring(r.x, r.y, GOLD, { r: 4, grow: 30, life: 0.5 });
      audioManager.play('rune', { vol: 0.6, rate: 0.8 + now * 0.05 });
    }
    audioManager.play('impact_metal', { vol: 0.25, rate: 0.6 });
  }

  protected onBurst(): void {
    this.flash(0.6, 0xEDE9FE);
    this.debris(TX, FOOT - 50, 30, OBSIDIAN.slice(1), { speed: 220, spread: 60, size: 4 });
    this.spray(TX, FOOT - 80, 60, [VIOLET, GOLD, 0xFFFFFF], 160);
    audioManager.play('crack', { vol: 1, rate: 0.6 });
    audioManager.play('explosion', { vol: 0.7, rate: 0.6 });
    audioManager.play('roar', { vol: 0.5, rate: 0.6, delay: 0.15 });
  }

  protected onReject(): void {
    audioManager.play('dark', { vol: 0.8, rate: 0.7 });
    audioManager.play('roar', { vol: 0.5, rate: 0.5, delay: 0.3 });
  }

  private rune(i: number): { x: number; y: number } {
    const u = i / (RUNES - 1);
    return { x: Math.round(TX - 120 + u * 230), y: Math.round(FOOT - 2 - Math.sin(u * Math.PI) * 16) };
  }

  protected paint(f: Frame): void {
    const { dt } = f;
    for (let i = 0; i < RUNES; i++) this.flare[i] = Math.max(0, this.flare[i] - dt * 1.5);
    const b = this.back.clear();
    const bg = this.backGlow.clear();
    const s = this.set.clear();
    const glow = this.glow.clear();
    // The throne (gone once it shatters)
    if (!this.burstDone) {
      b.poly([TX - 40, FOOT, TX - 36, FOOT - 92, TX - 26, FOOT - 120, TX - 18, FOOT - 104, TX - 8, FOOT - 140, TX, FOOT - 118, TX + 8, FOOT - 140, TX + 18, FOOT - 104, TX + 26, FOOT - 120, TX + 36, FOOT - 92, TX + 40, FOOT]).fill({ color: OBSIDIAN[2] }).stroke({ width: 1.5, color: VIOLET, alpha: 0.7 });
      b.poly([TX - 30, FOOT, TX - 28, FOOT - 88, TX - 8, FOOT - 120, TX - 4, FOOT - 92, TX - 12, FOOT]).fill({ color: OBSIDIAN[3] });
      b.rect(TX - 46, FOOT - 46, 92, 10).fill({ color: OBSIDIAN[1] }).stroke({ width: 1, color: OBSIDIAN[0] });
      b.rect(TX - 50, FOOT - 36, 12, 36).fill({ color: OBSIDIAN[2] });
      b.rect(TX + 38, FOOT - 36, 12, 36).fill({ color: OBSIDIAN[2] });
      // The emperor's shade, fading as the labours mount (looming larger if the knight fails)
      const shade = Math.max(0, 1 - this.shown * 0.9) * (this.phase === 'sealed' ? 1.4 : 1);
      if (shade > 0.05) {
        const rise = this.phase === 'sealed' ? Math.min(30, this.phaseT * 40) : 0;
        b.ellipse(TX, FOOT - 92 - rise, 14, 18).fill({ color: 0x000000, alpha: 0.7 * Math.min(1, shade) });
        b.poly([TX - 24, FOOT - 46, TX - 16, FOOT - 82 - rise, TX + 16, FOOT - 82 - rise, TX + 24, FOOT - 46]).fill({ color: 0x000000, alpha: 0.6 * Math.min(1, shade) });
        for (const ex of [-5, 3]) b.rect(TX + ex, FOOT - 96 - rise, 2, 1).fill({ color: 0xF43F5E, alpha: Math.min(1, shade) });
        // A crown of five points
        for (let k = 0; k < 5; k++) b.rect(TX - 10 + k * 5, FOOT - 112 - rise - (k % 2 ? 2 : 4), 2, 4).fill({ color: VIOLET, alpha: 0.7 * Math.min(1, shade) });
      }
      bg.circle(TX, FOOT - 70, 40 + this.shown * 20).fill({ color: VIOLET, alpha: 0.05 + this.shown * 0.08 });
    }
    // Thirteen rune stones round the dais: lit ones glow gold, the next one waits, pulsing
    for (let i = 0; i < RUNES; i++) {
      const r = this.rune(i);
      const on = i < this.lit || this.phase === 'pulling' || this.phase === 'claiming' || this.phase === 'held';
      s.rect(r.x - 4, r.y - 9, 8, 9).fill({ color: OBSIDIAN[3] }).stroke({ width: 1, color: OBSIDIAN[0] });
      const glyph = on ? GOLD : i === this.lit ? VIOLET : OBSIDIAN[1];
      const a = on ? 1 : i === this.lit ? 0.5 + 0.5 * Math.sin(this.t * 5) : 1;
      s.rect(r.x - 1, r.y - 7, 2, 5).fill({ color: glyph, alpha: a });
      s.rect(r.x - 3 + Math.floor(hash(i, 3) * 2), r.y - 6 + Math.floor(hash(i, 4) * 3), 6, 1).fill({ color: glyph, alpha: a });
      if (on) glow.circle(r.x, r.y - 5, 6 + this.flare[i] * 14).fill({ color: GOLD, alpha: 0.25 + this.flare[i] * 0.4 });
    }
    // The golden thread: Excalibell in the knight's hand answering its twin
    const hand = this.host.handPoint?.();
    if (hand && this.phase === 'resting' && this.shown > 0.01) {
      const tip = { x: TX, y: FOOT - 100 };
      const wob = Math.sin(this.t * 6) * 3;
      glow.moveTo(hand.x, hand.y).quadraticCurveTo((hand.x + tip.x) / 2, Math.min(hand.y, tip.y) - 30 + wob, tip.x, tip.y).stroke({ width: 3, color: GOLD, alpha: 0.15 + this.shown * 0.3 });
      glow.moveTo(hand.x, hand.y).quadraticCurveTo((hand.x + tip.x) / 2, Math.min(hand.y, tip.y) - 30 + wob, tip.x, tip.y).stroke({ width: 1, color: 0xFFFBEA, alpha: 0.3 + this.shown * 0.5 });
    }
  }
}
