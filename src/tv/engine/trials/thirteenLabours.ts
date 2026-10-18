import type { Sprite, Texture, Ticker } from 'pixi.js';
import { audioManager } from '../../../shared/AudioManager';
import type { StoneHost } from '../excalibellStone';
import { TrialStage, CX, FOOT, hash, type Frame, type WeaponPose } from '../trialStage';
import { LitCanvas, ramp, type Lighting } from './litArt';

/**
 * The Thirteen Labours (`excalibane`, Obsidian Throne): the Dark Emperor's shade still sits his throne, and
 * Excalibane, Excalibell's shadow twin, lies sealed inside the throne before him. Thirteen rune stones
 * ring the dais, one per exercise; every labour completed lights one, and a golden thread from Excalibell in the
 * knight's hand to the black blade brightens with each. The shade fades as the runes fill; the thirteenth
 * shatters the throne.
 */
const TX = CX + 52; // the throne
const RUNES = 13;
const OBSIDIAN = [0x050409, 0x1A1428, 0x2E2445, 0x4A3B6B, 0x6E5C9E];
const VIOLET = 0xA78BFA;
const GOLD = 0xFBBF24;
const SWORD_Y = FOOT - 112; // the buried sword's centre
const THRONE_OX = TX - 60;
const THRONE_OY = FOOT - 146;
const STONES_OX = TX - 130;
const STONES_OY = FOOT - 30;
// Faint moonlight, the throne glowing violet from within and from behind
const THRONE_LIGHT: Lighting = {
  key: [-0.45, -0.75, 0.5], keyColor: 0x8C80B8, keyPower: 0.5, ambient: 0.05,
  rim: { dx: 0, dy: 0, color: VIOLET, power: 0.6 },
  lights: [{ x: 60, y: 80, z: 14, color: VIOLET, radius: 90, power: 0.6 }],
};

export class ThirteenLabours extends TrialStage {
  private flare: number[] = new Array(RUNES).fill(0);
  private lit = 0;
  private throne: Sprite;
  private backrest: Sprite;

  constructor(weapon: Texture | null, ticker: Ticker, host: StoneHost) {
    super(weapon, ticker, host, { night: 0x06030D, dangerNight: 0x020106, dim: 0.8, glow: VIOLET, core: 0xEDE9FE, mist: 0x4C3D6B, cold: 0x6E6390, warm: 0xFFE9B0 });
    this.shadow(TX, FOOT, 70, 6, 0.75);
    this.throne = this.art(this.bake(throneArt(false), THRONE_LIGHT), this.backArt, THRONE_OX, THRONE_OY);
    this.backrest = this.art(this.bake(throneArt(true), THRONE_LIGHT), this.setArt, THRONE_OX, THRONE_OY);
    this.art(this.bake(stonesArt((i) => this.rune(i)), { ...THRONE_LIGHT, rim: { dx: 0, dy: -1, color: VIOLET, power: 0.5 }, lights: [{ x: TX - STONES_OX, y: -40, z: 30, color: VIOLET, radius: 160, power: 0.5 }] }), this.setArt, STONES_OX, STONES_OY);
  }

  protected restPose(): WeaponPose {
    // Point-down, its bell buried in the throne's backrest (the backrest is drawn over it), the blade standing clear
    const j = this.jolt * Math.sin(this.t * 60);
    return { x: TX + j, y: SWORD_Y, rot: Math.PI / 2 };
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
    this.throne.visible = this.backrest.visible = !this.burstDone;
    if (!this.burstDone) {
      // The emperor's shade, fading as the labours mount (looming larger if the knight fails)
      const shade = Math.max(0, 1 - this.shown * 0.9) * (this.phase === 'sealed' ? 1.4 : 1);
      if (shade > 0.05) {
        const rise = this.phase === 'sealed' ? Math.min(30, this.phaseT * 40) : 0;
        s.ellipse(TX, FOOT - 92 - rise, 14, 18).fill({ color: 0x000000, alpha: 0.7 * Math.min(1, shade) });
        s.poly([TX - 24, FOOT - 46, TX - 16, FOOT - 82 - rise, TX + 16, FOOT - 82 - rise, TX + 24, FOOT - 46]).fill({ color: 0x000000, alpha: 0.6 * Math.min(1, shade) });
        for (const ex of [-5, 3]) s.rect(TX + ex, FOOT - 96 - rise, 2, 1).fill({ color: 0xF43F5E, alpha: Math.min(1, shade) });
        // A crown of five points
        for (let k = 0; k < 5; k++) s.rect(TX - 10 + k * 5, FOOT - 112 - rise - (k % 2 ? 2 : 4), 2, 4).fill({ color: VIOLET, alpha: 0.7 * Math.min(1, shade) });
      }
      bg.circle(TX, FOOT - 70, 40 + this.shown * 20).fill({ color: VIOLET, alpha: 0.05 + this.shown * 0.08 });
    }
    // Thirteen rune stones round the dais: lit ones glow gold, the next one waits, pulsing
    for (let i = 0; i < RUNES; i++) {
      const r = this.rune(i);
      const on = i < this.lit || this.phase === 'pulling' || this.phase === 'claiming' || this.phase === 'held';
      const glyph = on ? GOLD : i === this.lit ? VIOLET : OBSIDIAN[1];
      const a = on ? 1 : i === this.lit ? 0.5 + 0.5 * Math.sin(this.t * 5) : 1;
      s.rect(r.x - 1, r.y - 7, 2, 5).fill({ color: glyph, alpha: a });
      s.rect(r.x - 3 + Math.floor(hash(i, 3) * 2), r.y - 6 + Math.floor(hash(i, 4) * 3), 6, 1).fill({ color: glyph, alpha: a });
      if (on) glow.circle(r.x, r.y - 5, 6 + this.flare[i] * 14).fill({ color: GOLD, alpha: 0.25 + this.flare[i] * 0.4 });
    }
    // The golden thread: Excalibell in the knight's hand answering its twin
    const hand = this.host.handPoint?.();
    if (hand && this.phase === 'resting' && this.shown > 0.01) {
      const tip = { x: TX, y: SWORD_Y - 30 };
      const wob = Math.sin(this.t * 6) * 3;
      glow.moveTo(hand.x, hand.y).quadraticCurveTo((hand.x + tip.x) / 2, Math.min(hand.y, tip.y) - 30 + wob, tip.x, tip.y).stroke({ width: 3, color: GOLD, alpha: 0.15 + this.shown * 0.3 });
      glow.moveTo(hand.x, hand.y).quadraticCurveTo((hand.x + tip.x) / 2, Math.min(hand.y, tip.y) - 30 + wob, tip.x, tip.y).stroke({ width: 1, color: 0xFFFBEA, alpha: 0.3 + this.shown * 0.5 });
    }
  }
}

// --- Art ----------------------------------------------------------------------------------------------------

const GLASS_M = { ramp: ramp(0x2E2445, 7, 0x020106, 0xF0E6FF, 0.8), shine: 1.2 };
const BASALT_M = { ramp: ramp(0x241E30, 6, 0x020106, 0xD8CCF0), grain: 0.05, gx: 3, gy: 2 };
const BONE_M = { ramp: ramp(0x9A9080, 6, 0x0A0610, 0xFFF8E8) };

/**
 * The Dark Emperor's throne: obsidian spires faceted like crystal over a rune-cut backrest, on a two-step dais.
 * `backrest` true paints only the backrest (drawn in front of Excalibane, hiding its buried bell), false the rest.
 */
function throneArt(backrest: boolean): LitCanvas {
  const c = new LitCanvas(120, 146);
  const glass = c.material(GLASS_M);
  const basalt = c.material(BASALT_M);
  const bone = c.material(BONE_M);
  const tx = TX - THRONE_OX;
  const seat = 146 - 46;
  if (backrest) {
    // Backrest panel with violet runes cut in it, cracked where the blade went in
    c.poly([tx - 30, seat, tx - 30, seat - 36, tx, seat - 52, tx + 30, seat - 36, tx + 30, seat], basalt, [0, -0.35, 1]);
    for (let k = 0; k < 5; k++) {
      const y = seat - 38 + k * 8;
      for (const x of [tx - 22, tx + 18]) {
        c.glow(x, y, VIOLET);
        c.glow(x + 1, y + 1, VIOLET);
        c.glow(x + (k % 2 ? 2 : 0), y + 2, 0xC4B5FD);
      }
    }
    c.carve(tx - 3, seat - 48, tx - 8, seat - 38, 0.4);
    c.carve(tx + 3, seat - 48, tx + 9, seat - 40, 0.4);
    c.carve(tx + 9, seat - 40, tx + 7, seat - 33, 0.4);
    return c;
  }
  // Spires, outermost first: each two facets meeting in a lit ridge
  const spires: [number, number, number][] = [[-42, 92, 12], [42, 92, 12], [-29, 112, 14], [29, 112, 14], [-15, 128, 14], [15, 128, 14], [0, 144, 16]];
  for (const [dx, tall, hw] of spires) {
    const cx = tx + dx;
    const tip = 146 - tall;
    c.group(() => {
      c.poly([cx - hw, seat, cx, tip, cx, seat], glass, [-0.65, -0.25, 0.7]);
      c.poly([cx, seat, cx, tip, cx + hw, seat], glass, [0.6, -0.15, 0.75]);
    });
  }
  // Seat, its skirt, and arms capped with skulls
  c.box(tx - 34, seat + 10, 68, 26, basalt, 1);
  c.box(tx - 46, seat, 92, 10, glass, 2);
  for (const side of [-1, 1]) {
    const ax = tx + side * 44 - 6;
    c.box(ax, seat + 10, 12, 26, basalt, 2);
    c.box(ax - 1, seat - 4, 14, 5, glass, 1);
    c.sphere(ax + 6, seat - 8, 4.5, bone);
    c.carve(ax + 4, seat - 8, ax + 4, seat - 8, 0.6);
    c.carve(ax + 8, seat - 8, ax + 8, seat - 8, 0.6);
  }
  // The dais
  c.box(tx - 54, 146 - 10, 108, 5, basalt, 1);
  c.box(tx - 60, 146 - 5, 120, 5, basalt, 1);
  return c;
}

/** Thirteen standing rune stones round the dais, rounded at the top; the glyphs are lit live over them. */
function stonesArt(at: (i: number) => { x: number; y: number }): LitCanvas {
  const c = new LitCanvas(260, 31);
  const stone = c.material(BASALT_M);
  for (let i = 0; i < RUNES; i++) {
    const r = at(i);
    const x = r.x - STONES_OX;
    const y = r.y - STONES_OY;
    c.group(() => {
      c.ellipse(x, y - 9, 5, 3, stone, 0.6);
      c.box(x - 5, y - 10, 10, 10, stone, 1);
    });
    c.carve(x - 2 + hash(i, 5) * 3, y - 3, x + 2, y - 1, 0.25);
  }
  return c;
}
