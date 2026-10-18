import type { Sprite, Texture, Ticker } from 'pixi.js';
import { audioManager } from '../../../shared/AudioManager';
import type { StoneHost } from '../excalibellStone';
import type { TrialRepResult } from '../../../shared/secretTrials';
import { TrialStage, CX, FOOT, W, H, hash, bolt, type Frame, type WeaponPose } from '../trialStage';
import { LitCanvas, ramp, type Lighting } from './litArt';

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
const FX = BX - 78; // the belfry frame's canvas
const FY = BEAM - 12;
const STORM: Lighting = { key: [-0.5, -0.75, 0.45], keyColor: 0x9FB4D9, keyPower: 0.55, ambient: 0.06, focus: { x: 78, y: 60, r: 110, min: 0.35 } };
const BELL_STORM: Lighting = { ...STORM, keyPower: 0.5, focus: { x: 24, y: 18, r: 64, min: 0.35 } };
const STRUCK: Lighting = { key: [0.1, -1, 0.35], keyColor: 0xCFFAFE, keyPower: 1.25, ambient: 0.15, rim: { dx: 0, dy: -1, color: 0xE0F7FF, power: 1.2 } };

export class GreatBell extends TrialStage {
  private a = 0; // bell swing angle
  private av = 0;
  private strike = 0; // lightning flash left on the current beat
  private strikeX = BX;
  private seed = 0;
  private tolls = 0;
  private frameLit: Sprite;
  private bell: Sprite;
  private bellLit: Sprite;

  constructor(weapon: Texture | null, ticker: Ticker, host: StoneHost) {
    super(weapon, ticker, host, { night: 0x0A1020, dim: 0.74, glow: BOLT, core: 0xECFEFF, mist: 0x5B6B86, cold: 0x7C8BAA, warm: 0xE0F7FF });
    this.shadow(BX, FOOT, 90, 6, 0.6);
    const frame = frameArt();
    this.art(this.bake(frame, STORM), this.backArt, FX, FY);
    this.frameLit = this.art(this.bake(frame, STRUCK), this.backArt, FX, FY);
    const bell = bellArt();
    this.bell = this.art(this.bake(bell, BELL_STORM), this.setArt, BX, BEAM, 36, 0);
    this.bellLit = this.art(this.bake(bell, STRUCK), this.setArt, BX, BEAM, 36, 0);
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
    // The lightning lights up the belfry for a moment
    const lit = Math.min(1, this.strike);
    this.frameLit.alpha = lit;
    // The bell (in pieces once it bursts)
    this.bell.visible = this.bellLit.visible = !this.burstDone;
    if (!this.burstDone) {
      const ang = this.a * 0.25;
      const c = Math.cos(ang);
      const sn = Math.sin(ang);
      const T = (dx: number, dy: number) => [BX + dx * c - dy * sn, BEAM + dx * sn + dy * c] as [number, number];
      this.bell.rotation = this.bellLit.rotation = ang;
      this.bellLit.alpha = Math.max(lit, this.shown * 0.25);
      // The clapper, hanging just below the lip
      const [kx, ky] = T(Math.sin(this.t * 2 + this.a) * 6, 63);
      s.circle(kx, ky, 4).fill({ color: 0x1A1008 });
      s.circle(kx - 1, ky - 1, 2).fill({ color: BRONZE[1] });
      // Runes round the rim: one per toll, lit blue
      for (let i = 0; i < RUNES; i++) {
        const u = i / (RUNES - 1);
        const [rx, ry] = T(-26 + u * 52, 52);
        const on = i < Math.round(this.shown * RUNES);
        if (on) s.rect(Math.round(rx), Math.round(ry), 2, 3).fill({ color: BOLT });
        if (on) glow.circle(rx + 1, ry + 1, 4).fill({ color: BOLT, alpha: 0.35 });
      }
      // The rope to the knight: a twisted hemp line, two tones
      const [rx, ry] = T(0, 62);
      const mx = (rx + CX - 70) / 2;
      const my = FOOT - 30 + Math.sin(this.t * 2) * 4;
      for (let i = 0; i <= 70; i++) {
        const u = i / 70;
        const x = (1 - u) ** 2 * rx + 2 * (1 - u) * u * mx + u * u * (CX - 70);
        const y = (1 - u) ** 2 * (ry + 2) + 2 * (1 - u) * u * my + u * u * (FOOT - 70);
        s.rect(Math.round(x) - 1, Math.round(y) - 1, 2, 2).fill({ color: Math.floor(i / 2) % 2 ? 0x4A3420 : 0x7A6038 });
      }
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

// --- Art ----------------------------------------------------------------------------------------------------

const WOOD = { ramp: ramp(0x4A3020, 6, 0x0A0610, 0xF0D8B0), grain: 0.06, gx: 1.5, gy: 9 };
const IRON = { ramp: ramp(0x3A3E48, 6, 0x06060E, 0xE8EEF8), shine: 0.5 };
const STONE = { ramp: ramp(0x45474F, 6, 0x08070E), grain: 0.05, gx: 3, gy: 3 };
const BRONZE_M = { ramp: ramp(0x7E5A26, 8, 0x0A1414, 0xFFE8B0, 0.75), shine: 0.9 };

/** The belfry: two timber posts on stone plinths, braced, under an iron-strapped headstock beam. */
function frameArt(): LitCanvas {
  const c = new LitCanvas(156, FOOT - FY);
  const wood = c.material(WOOD);
  const dark = c.material({ ...WOOD, ramp: ramp(0x3A2618, 6, 0x0A0610, 0xF0D8B0) });
  const iron = c.material(IRON);
  const stone = c.material(STONE);
  const bx = BX - FX;
  for (const side of [-1, 1]) {
    const px = bx + side * 62;
    c.tube(px - side * 2, c.h - 40, bx + side * 34, 16, 6, dark);
    c.box(px - 4, 12, 9, c.h - 22, wood, 1);
    for (const y of [40, 96]) {
      c.box(px - 5, y, 11, 4, iron, 1);
      c.sphere(px, y + 2, 1.2, iron);
    }
    c.box(px - 9, c.h - 12, 19, 12, stone, 2);
  }
  c.box(2, 3, 152, 11, wood, 2);
  for (const x of [8, 140]) c.box(x, 2, 8, 13, iron, 1);
  c.box(bx - 9, 13, 18, 6, iron, 1);
  c.sphere(bx - 5, 16, 1.2, iron);
  c.sphere(bx + 5, 16, 1.2, iron);
  return c;
}

/** The great bell: a lathed bronze body with a crown loop, cast bands, and a heavy flared lip. Hung from (36, 0). */
function bellArt(): LitCanvas {
  const c = new LitCanvas(72, 66);
  const bronze = c.material(BRONZE_M);
  const dark = c.material({ ...BRONZE_M, ramp: ramp(0x5A3E1A, 8, 0x0A1414, 0xFFE0A0, 0.7) });
  const iron = c.material(IRON);
  c.ring(36, 4, 2, 4.5, iron);
  const half = (y: number) => {
    if (y < 5) return 0;
    if (y < 11) return 8 + ((y - 5) / 6) * 6 - ((y - 8) ** 2) * 0.05; // the shoulder
    if (y < 48) return 14 + ((y - 11) / 37) * 7; // the waist
    if (y < 63) return 21 + ((y - 48) / 15) ** 1.6 * 11; // the flare to the lip
    return 0;
  };
  c.lathe(36, 5, 63, half, bronze);
  // Cast bands: a ridge under the shoulder, two round the sound bow, the lip itself darker
  for (const y of [12, 46, 50]) {
    const hw = half(y);
    c.carve(36 - hw + 1, y, 36 + hw - 1, y, 0.3);
  }
  c.lathe(36, 58, 63, (y) => (y >= 58 && y < 63 ? half(y) : 0), dark);
  return c;
}
