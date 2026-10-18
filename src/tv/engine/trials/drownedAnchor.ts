import type { Sprite, Texture, Ticker } from 'pixi.js';
import { audioManager } from '../../../shared/AudioManager';
import type { StoneHost } from '../excalibellStone';
import { TrialStage, CX, FOOT, W, H, hash, type Frame, type WeaponPose } from '../trialStage';
import { LitCanvas, ramp, type Lighting } from './litArt';

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
const PULLEY_FRAMES = 6; // over a quarter turn (four spokes)
const WELL_OX = AX - 64;
const WELL_OY = FOOT - 32;
const LIP = FOOT - 16; // the well-head's rim
// A grey shaft of light from the vault's grate above; the flooded well glowing teal from below
const VAULT: Lighting = { key: [-0.3, -0.85, 0.45], keyColor: 0x9CC8D0, keyPower: 0.55, ambient: 0.07 };

export class DrownedAnchor extends TrialStage {
  private sink = 0; // the anchor slipping back on a fail
  private haulKick = 0;
  private wheel: Sprite;
  private wheelFrames: Texture[] = [];

  constructor(weapon: Texture | null, ticker: Ticker, host: StoneHost) {
    super(weapon, ticker, host, { night: 0x03141A, dangerNight: 0x021015, dim: 0.74, glow: 0x2DD4BF, core: FOAM, mist: 0x4C7D80, cold: 0x6E8FA0, warm: 0xC7F0E8, turn: Math.PI / 2 });
    this.art(this.bake(beamArt(), VAULT), this.backArt, PULLEY_X - 46, 0);
    for (let i = 0; i < PULLEY_FRAMES; i++) this.wheelFrames.push(this.bake(pulleyArt((i / PULLEY_FRAMES) * (Math.PI / 2)), VAULT));
    this.wheel = this.art(this.wheelFrames[0], this.backArt, PULLEY_X, PULLEY_Y + 6, 15, 15);
    this.shadow(AX, FOOT, 50, 6, 0.6);
    const well: Lighting = {
      ...VAULT, keyPower: 0.45, focus: { x: 64, y: LIP - WELL_OY + 6, r: 80, ry: 46, min: 0.2 },
      lights: [{ x: 64, y: LIP - WELL_OY - 2, z: 6, color: 0x2DD4BF, radius: 50, power: 0.8 }],
    };
    this.art(this.bake(wellArt(false), well), this.setArt, WELL_OX, WELL_OY);
    this.art(this.bake(wellArt(true), well), this.setArt, WELL_OX, WELL_OY);
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
    // The pulley wheel turns as the chain comes up (four spokes: a quarter turn looks the same)
    const spin = this.shown * 12 + this.haulKick * 0.4;
    const q = Math.PI / 2;
    this.wheel.texture = this.wheelFrames[Math.floor(((((spin % q) + q) % q) / q) * PULLEY_FRAMES) % PULLEY_FRAMES];
    // The chain down to the top of the anchor's handle
    const top = this.burstDone ? FOOT : this.anchorY() + HANDLE.y;
    const links = Math.max(0, Math.floor((top - PULLEY_Y - 14) / 4));
    for (let i = 0; i < links; i++) {
      const y = PULLEY_Y + 14 + i * 4 + ((this.shown * 300) % 4);
      if (this.burstDone && i > 8) break;
      // Links alternate face-on (an open ring, lit on its left) and edge-on (a bar)
      if (i % 2) {
        g.rect(PULLEY_X - 1, y - 1, 2, 5).fill({ color: IRON[0] });
        g.rect(PULLEY_X - 1, y, 1, 3).fill({ color: IRON[2] });
      } else {
        g.rect(PULLEY_X - 2, y, 4, 3).fill({ color: IRON[0] });
        g.rect(PULLEY_X - 2, y, 1, 3).fill({ color: IRON[3] });
        g.rect(PULLEY_X + 1, y, 1, 3).fill({ color: IRON[1] });
      }
    }
    // The well mouth (baked) hides the anchor under the floor until it rises
    void s;
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

// --- Art ----------------------------------------------------------------------------------------------------

const WOOD_M = { ramp: ramp(0x3E2C1C, 6, 0x040A0C, 0xD8E8D0), grain: 0.06, gx: 9, gy: 1.5 };
const IRON_M = { ramp: ramp(0x3E3C3A, 6, 0x040A0C, 0xE0F0EC), shine: 0.6, grain: 0.04, gx: 2, gy: 2 };
const STONE_M = { ramp: ramp(0x41504F, 6, 0x03090C, 0xD8F0E8), shine: 0.3, grain: 0.06, gx: 3, gy: 2 };
const MOSS_M = { ramp: ramp(0x2F4A2A, 5, 0x030A08, 0xB8E0A0), grain: 0.08, gx: 2, gy: 2 };

/** The pulley's beam: a rotting timber with iron end-caps and a forked bracket down to the axle. */
function beamArt(): LitCanvas {
  const c = new LitCanvas(92, PULLEY_Y + 10);
  const wood = c.material(WOOD_M);
  const iron = c.material(IRON_M);
  const px = 46;
  c.box(px - 6, PULLEY_Y - 2, 3, 10, iron, 1);
  c.box(px + 3, PULLEY_Y - 2, 3, 10, iron, 1);
  c.box(px - 42, PULLEY_Y - 8, 84, 7, wood, 1);
  for (const x of [px - 42, px + 36]) c.box(x, PULLEY_Y - 9, 6, 9, iron, 1);
  c.box(px - 8, PULLEY_Y - 9, 16, 4, iron, 1);
  return c;
}

/** The pulley wheel at angle `a`: an iron rim with a grooved tread, four spokes, a hub. Anchor (15, 15). */
function pulleyArt(a: number): LitCanvas {
  const c = new LitCanvas(30, 30);
  const iron = c.material(IRON_M);
  c.ring(15, 15, 9, 13, iron);
  c.ring(15, 15, 10.5, 11.5, iron, true);
  for (let k = 0; k < 4; k++) {
    const t = a + (k * Math.PI) / 2;
    c.tube(15, 15, 15 + Math.cos(t) * 10, 15 + Math.sin(t) * 10, 3, iron);
  }
  c.sphere(15, 15, 3.5, iron);
  return c;
}

/**
 * The well-head: a drum of wet, mossy masonry with a black mouth, standing in flagstones that fade into the dark.
 * `near` false is the far rim and the mouth (it hides what is still down the well), true the drum and the near rim.
 */
function wellArt(near: boolean): LitCanvas {
  const c = new LitCanvas(128, H - WELL_OY);
  const stone = c.material(STONE_M);
  const block = c.material({ ...STONE_M, ramp: ramp(0x4A5A57, 6, 0x03090C, 0xD8F0E8) });
  const flag = c.material({ ...STONE_M, ramp: ramp(0x34403F, 6, 0x03090C, 0xC8E0D8) });
  const moss = c.material(MOSS_M);
  const dark = c.material({ ramp: ramp(0x0A1A1C, 4, 0x010304) });
  const wx = AX - WELL_OX;
  const wy = FOOT - WELL_OY; // the floor
  const lip = LIP - WELL_OY;
  const rim = (half: 'far' | 'near') => {
    for (let k = 0; k < 10; k++) {
      const a = (half === 'far' ? Math.PI : 0) + ((k + 0.5) / 10) * Math.PI;
      const x = wx + Math.cos(a) * 30;
      const y = lip + Math.sin(a) * 7;
      c.box(Math.round(x) - 5, Math.round(y) - 3, 10, 6, block, 1);
      if (hash(k, half === 'far' ? 3 : 4) > 0.45) c.ellipse(Math.round(x) - 1, Math.round(y) - 2, 3.5, 1.5, moss, 0.6);
    }
  };
  if (!near) {
    c.ellipse(wx, lip, 27, 6.5, dark, -0.7);
    rim('far');
    return c;
  }
  // Flagstones in rows, inside a rough oval so the floor melts into the backdrop
  const inside = (x: number, y: number) => ((x - wx) / 64) ** 2 + ((y - wy - 8) / 26) ** 2 < 1 + (hash(Math.floor(x / 4), Math.floor(y / 4)) - 0.5) * 0.25;
  c.group(() => {
    for (let row = 0; row < 6; row++) {
      const y0 = wy - 4 + row * 7;
      for (let x = -(row % 2) * 9; x < c.w; x += 18) {
        c.shape(x, y0, x + 17, y0 + 6, flag, (px, py) => {
          if (!inside(px, py)) return null;
          const e = Math.min(px - x, x + 17 - px, py - y0, y0 + 6 - py);
          return e > 1 ? [0, -0.25, 1] : e === py - y0 ? [0, -0.8, 0.6] : e === y0 + 6 - py ? [0, 0.8, 0.6] : e === px - x ? [-0.8, 0, 0.6] : [0.8, 0, 0.6];
        });
      }
    }
  });
  // The drum: a curved wall from the near rim down to the floor, in two courses of blocks
  const R = 33;
  c.shape(wx - R, lip, wx + R + 1, wy + 8, stone, (x, y) => {
    const u = (x - wx) / R;
    if (Math.abs(u) > 1) return null;
    const k = Math.sqrt(1 - u * u);
    if (y < lip + k * 7 || y > wy + k * 6) return null;
    return [u * 0.95, 0.05, k];
  });
  for (const course of [0.5, 1]) {
    for (let x = wx - R + 1; x < wx + R; x++) {
      const k = Math.sqrt(Math.max(0, 1 - ((x - wx) / R) ** 2));
      c.carve(x, lip + k * 7 + (wy - lip) * course * 0.95 + k * (6 - 7) * course, x, lip + k * 7 + (wy - lip) * course * 0.95 + k * (6 - 7) * course, 0.3);
    }
  }
  for (let j = 0; j < 7; j++) {
    const a = ((j + 0.5) / 7) * Math.PI;
    const x = wx - Math.cos(a) * R;
    const k = Math.sin(a);
    const yTop = lip + k * 7;
    const yMid = lip + k * 7 + (wy - lip) * 0.5 * 0.95 - k * 0.5;
    const yBot = wy + k * 6;
    if (j % 2) c.carve(x, yTop + 1, x, yMid, 0.3);
    else c.carve(x + (x < wx ? 2 : -2), yMid + 1, x + (x < wx ? 2 : -2), yBot - 1, 0.3);
  }
  for (let k = 0; k < 5; k++) c.ellipse(wx - R + 6 + hash(k, 9) * (R * 2 - 12), wy - 2 - hash(k, 8) * 8, 3, 2, moss, 0.5);
  rim('near');
  return c;
}
