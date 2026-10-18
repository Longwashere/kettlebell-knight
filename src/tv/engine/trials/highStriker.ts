import type { Sprite, Texture, Ticker } from 'pixi.js';
import { audioManager } from '../../../shared/AudioManager';
import type { StoneHost } from '../excalibellStone';
import type { TrialRepResult } from '../../../shared/secretTrials';
import { TrialStage, CX, FOOT, W, hash, mix, type Frame, type WeaponPose } from '../trialStage';
import { LitCanvas, ramp, type Lighting } from './litArt';

/**
 * The High Striker (`bellringer_mallet`, Town Square by night): the Circus Bear's carnival has pitched its big top
 * off the square. A striped test-your-strength tower stands beside the knight; every swing slams the puck up the
 * pole, and only a hard one (power ≥ the bar) rings the bell at the top and lights another bulb. Weak swings
 * fall short and thud back down. The Bellringer's Mallet leans against the base. String lights go dark one by one
 * as the time runs out.
 */
const TX = CX + 34; // the tower's pole
const TOP = 30; // the bell
const BASE = FOOT - 14; // the strike pad, where the puck rests
const BULBS = 30;
const GRAV = 900;
const GOLD = 0xFBBF24;
const RED = 0xDC2626;
const CREAM = 0xFDF4E3;
const INK = 0x120A0E;
const LIGHTS = [0xF87171, 0xFBBF24, 0x34D399, 0x60A5FA, 0xF472B6];
const TENT_X = W - 66; // the big top's pole
const TENT_OX = TENT_X - 73;
const TENT_OY = 52;
// Cold moonlight from the upper left, the carnival's string lights warming everything from above
const NIGHT: Lighting = {
  key: [-0.5, -0.7, 0.5], keyColor: 0x8C9CC8, keyPower: 0.5, ambient: 0.08,
  lights: [{ x: 60, y: -40, z: 30, color: 0xFFC070, radius: 230, power: 0.45 }],
};

export class HighStriker extends TrialStage {
  private puckY = BASE;
  private puckV = 0;
  private puckGoal = 0; // y it will reach; ringing it if TOP
  private rang = 0; // bell shake after a ring
  private dings = 0; // counted rings of the bell (lit bulbs)
  private dark = 0; // lights out on a fail
  private bell: Sprite;

  constructor(weapon: Texture | null, ticker: Ticker, host: StoneHost) {
    super(weapon, ticker, host, { night: 0x0B0716, dangerNight: 0x050308, dim: 0.72, glow: GOLD, core: 0xFFF7D6, mist: 0x6B5A7A, cold: 0x8079A0, warm: 0xFFE8C2 });
    this.shadow(TENT_X, FOOT - 4, 80, 6, 0.5);
    this.shadow(TX, FOOT, 34, 4, 0.7);
    this.art(this.bake(tentArt(), { ...NIGHT, keyPower: 0.4, focus: { x: 60, y: 120, r: 110, min: 0.3 }, lights: [...NIGHT.lights!, { x: 73, y: 146, z: 14, color: 0xFFB050, radius: 70, power: 0.9 }] }), this.backArt, TENT_OX, TENT_OY);
    this.art(this.bake(towerArt(), { ...NIGHT, lights: [{ x: 20, y: -20, z: 20, color: 0xFFD080, radius: 200, power: 0.5 }] }), this.setArt, TX - 26, TOP - 2);
    this.bell = this.art(this.bake(bellArt(), NIGHT), this.setArt, TX, TOP, 12, 13);
  }

  protected restPose(): WeaponPose {
    // Leaning on the striker's base, head up
    return { x: TX + 44, y: FOOT - 56, rot: -Math.PI / 2 + 0.22 };
  }

  protected launchPoint() {
    return { x: TX + 44, y: FOOT - 56 };
  }

  protected onRep(): void {
    this.dings += 1;
    this.launchPuck(TOP + 12);
    audioManager.play('impact_heavy', { vol: 0.5, rate: 1.1 });
  }

  protected onMiss(kind: TrialRepResult, power: number): void {
    if (kind !== 'weak') return;
    // Short of the bell, by how far short of the bar
    const k = Math.max(0.15, Math.min(0.85, power / 70)) * 0.8;
    this.launchPuck(BASE - (BASE - TOP) * k);
    audioManager.play('thud', { vol: 0.5 });
  }

  private launchPuck(goalY: number): void {
    this.puckGoal = goalY;
    this.puckY = BASE;
    this.puckV = -Math.sqrt(2 * GRAV * (BASE - goalY));
    this.ring(TX, FOOT - 2, CREAM, { r: 8, grow: 40, life: 0.4 });
  }

  protected onBurst(): void {
    // The bell blows off the top in a shower of confetti and fireworks
    this.flash(0.4, CREAM);
    for (let i = 0; i < 5; i++) this.ring(TX, TOP, LIGHTS[i], { r: 6, grow: 80 + i * 30, life: 0.9 + i * 0.1, flat: 1, width: 2 });
    this.spray(TX, TOP, 70, LIGHTS, 140, 120);
    this.debris(TX, TOP, 10, [GOLD, 0xB45309, RED, CREAM], { speed: 200, spread: 10 });
    audioManager.play('explosion', { vol: 0.7, rate: 1.2 });
    audioManager.play('impact_metal', { vol: 0.9, rate: 1.6 });
    audioManager.play('victory', { vol: 0.3, delay: 0.1, rate: 1.4 });
  }

  protected onReject(): void {
    this.dark = 0.01;
    audioManager.play('thud', { vol: 0.6, rate: 0.6 });
  }

  protected paint(f: Frame): void {
    const { dt } = f;
    if (this.dark > 0) this.dark = Math.min(1, this.dark + dt * 0.8);
    // The puck: flung up, catching the bell if it gets there, then falling back to the pad
    if (this.puckV !== 0 || this.puckY < BASE) {
      this.puckV += GRAV * dt;
      this.puckY += this.puckV * dt;
      if (this.puckGoal <= TOP + 12 && this.puckY <= TOP + 12 && this.puckV < 0) {
        this.puckY = TOP + 12;
        this.puckV = 40;
        this.ding();
      }
      if (this.puckY >= BASE) {
        this.puckY = BASE;
        this.puckV = 0;
      }
    }
    this.rang = Math.max(0, this.rang - dt * 3);
    this.paintBack(f);
    this.paintTower(f);
  }

  private ding(): void {
    this.rang = 1;
    this.ring(TX, TOP, GOLD, { r: 10, grow: 60, life: 0.6, flat: 1, width: 2 });
    this.ring(TX, TOP, CREAM, { r: 4, grow: 34, life: 0.4, flat: 1 });
    this.spray(TX, TOP, 14, [GOLD, CREAM], 80);
    audioManager.play('impact_metal', { vol: 0.8, rate: 1.9 });
    audioManager.play('ui_select', { vol: 0.5, rate: 0.8 });
  }

  /** The big top behind, and a sagging line of carnival lights across the sky that go out as time runs down. */
  private paintBack(f: Frame): void {
    const g = this.back.clear();
    const glow = this.backGlow.clear();
    // The big top (baked): its pennant snaps in the wind, and the doorway flickers with lamplight inside
    const bx = TENT_X;
    g.poly([bx, 56, bx + 10 + Math.sin(this.t * 4) * 2, 59, bx, 62]).fill({ color: GOLD });
    g.rect(bx, 54, 1, 16).fill({ color: 0x3A2A1A });
    const flick = 0.5 + 0.5 * Math.sin(this.t * 7) * Math.sin(this.t * 3.1);
    this.pool(glow, bx, FOOT - 14, 14, 10, 0xFFB050, (0.2 + flick * 0.12) * (1 - this.dark));
    // String lights from corner to corner
    const lit = 1 - this.dangerShown * 0.9 - this.dark;
    for (const [x0, x1, y0, sag] of [[0, W, 22, 26], [-20, 230, 40, 18]] as [number, number, number, number][]) {
      const n = 22;
      let px = x0;
      let py = y0;
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const x = x0 + (x1 - x0) * u;
        const y = y0 + Math.sin(u * Math.PI) * sag + Math.sin(this.t * 1.3 + u * 6) * 1;
        g.moveTo(px, py).lineTo(x, y).stroke({ width: 1, color: 0x1F1724 });
        px = x;
        py = y;
        const on = hash(i, x0) < lit && (Math.sin(this.t * 3 + i) > -0.6 || this.dangerShown < 0.5);
        const c = LIGHTS[i % LIGHTS.length];
        g.rect(Math.round(x) - 1, Math.round(y) + 1, 3, 3).fill({ color: on ? c : 0x2A2230 });
        if (on) glow.circle(x, y + 2, 5).fill({ color: c, alpha: 0.18 });
      }
    }
  }

  /** The tower: striped pole, height marks, bulbs up both sides, the bell on top, the pad and the puck. */
  private paintTower(f: Frame): void {
    const g = this.set.clear();
    const glow = this.glow.clear();
    const shake = Math.round(Math.sin(this.t * 50) * this.jolt);
    // The strike pad dips when the puck flies
    if (shake) g.rect(TX - 20 + shake, BASE - 4, 16, 1).fill({ color: 0xFFFFFF, alpha: 0.3 });
    // Bulbs up both sides: one lit per ring, from the bottom
    const lit = this.dings;
    const lightsOn = this.dark < 0.5;
    for (let i = 0; i < BULBS; i++) {
      const side = i % 2 ? 1 : -1;
      const k = Math.floor(i / 2);
      const y = BASE - 6 - k * ((BASE - TOP - 16) / (BULBS / 2));
      const x = TX + side * 9;
      const on = lightsOn && (i < lit || this.phase === 'pulling' || this.phase === 'held' || this.phase === 'claiming');
      const blink = this.phase !== 'resting' ? Math.sin(this.t * 14 + i) > 0 : true;
      const c = on && blink ? GOLD : 0x3A2E1E;
      g.rect(x - 1, Math.round(y) - 1, 3, 3).fill({ color: c });
      if (on && blink) glow.circle(x, y, 4).fill({ color: GOLD, alpha: 0.35 });
    }
    // The bell (gone once it blows off)
    this.bell.visible = !this.burstDone;
    if (!this.burstDone) {
      const bs = Math.round(Math.sin(this.t * 60) * this.rang * 2);
      this.bell.x = TX + bs;
      this.pool(glow, TX, TOP, 14 + this.rang * 14, 14 + this.rang * 14, GOLD, 0.12 + this.rang * 0.3, 3);
    }
    // The puck on its rail
    const py = Math.round(this.puckY);
    const puck = mix(0xB8BEC8, GOLD, this.rang);
    g.rect(TX - 7, py - 3, 14, 6).fill({ color: INK });
    g.rect(TX - 6, py - 2, 12, 4).fill({ color: mix(puck, 0x1A1424, 0.45) });
    g.rect(TX - 6, py - 2, 12, 2).fill({ color: puck });
    g.rect(TX - 5, py - 2, 3, 1).fill({ color: 0xFFFFFF });
    if (this.puckV < -100) glow.rect(TX - 3, py + 3, 6, Math.min(40, -this.puckV / 12)).fill({ color: CREAM, alpha: 0.25 });
  }
}

// --- Art ----------------------------------------------------------------------------------------------------

const RED_M = { ramp: ramp(0x962028, 6, 0x14040F, 0xFFD0B0, 0.55), grain: 0.06, gx: 4, gy: 7 };
const CREAM_M = { ramp: ramp(0xB4A88E, 6, 0x1A1024, 0xFFF4DC, 0.55), grain: 0.06, gx: 4, gy: 7 };
const WOOD_M = { ramp: ramp(0x6A3A1C, 6, 0x10060E, 0xFFD8A8), grain: 0.06, gx: 9, gy: 1.5 };
const IRON_M = { ramp: ramp(0x484C58, 6, 0x08060E, 0xF0F0F8), shine: 0.7 };
const BRASS_M = { ramp: ramp(0xB07A24, 7, 0x20080C, 0xFFF4C8, 0.9), shine: 1 };

/** The big top: a striped cone with soft folds, a scalloped valance, striped walls and a lamplit doorway. */
function tentArt(): LitCanvas {
  const c = new LitCanvas(146, FOOT - TENT_OY - 4);
  const red = c.material(RED_M);
  const cream = c.material(CREAM_M);
  const pole = c.material(WOOD_M);
  const ax = 73;
  const ay = 18;
  const eave = 112; // where the cone meets the valance
  const wall = 124;
  const cone = (want: number) => (x: number, y: number): [number, number, number] | null => {
    if (y < ay || y > eave + 4) return null;
    const hw = 70 * ((y - ay) / (eave - ay));
    const u = (x - ax) / Math.max(1, hw);
    if (Math.abs(u) > 1) return null;
    const k = (u + 1) * 4; // eight panels
    if ((Math.floor(k) % 2) !== want) return null;
    const fold = Math.cos((k % 1) * Math.PI * 2) * 0.25; // each panel sags between its seams
    return [u * 0.85 + fold * 0.3, -0.5, Math.sqrt(Math.max(0.05, 1 - u * u)) * 0.7];
  };
  c.group(() => {
    c.shape(0, ay, 146, eave + 4, red, cone(0));
    c.shape(0, ay, 146, eave + 4, cream, cone(1));
  });
  // Walls: wider vertical stripes on a drum
  const drum = (want: number) => (x: number): [number, number, number] | null => {
    const u = (x - ax) / 66;
    if (Math.abs(u) > 1) return null;
    if (Math.floor((u + 1) * 7) % 2 !== want) return null;
    return [u * 0.9, 0, Math.sqrt(Math.max(0.05, 1 - u * u))];
  };
  c.group(() => {
    c.shape(ax - 66, wall, ax + 67, c.h, red, drum(0));
    c.shape(ax - 66, wall, ax + 67, c.h, cream, drum(1));
  });
  // Valance: a red band round the eave with a scalloped hem
  c.shape(ax - 72, eave, ax + 73, wall + 6, red, (x, y) => {
    const u = (x - ax) / 72;
    if (Math.abs(u) > 1) return null;
    const hem = wall + 1 + Math.abs(Math.sin(((x - ax) / 9) * Math.PI)) * 4;
    if (y > hem) return null;
    const v = (y - eave) / (hem - eave);
    return [u * 0.8, v * 0.6 - 0.3, Math.sqrt(Math.max(0.05, 1 - u * u)) * 0.8];
  });
  for (let x = ax - 66; x < ax + 67; x += 9) c.sphere(x, eave + 4, 1.3, cream);
  // The doorway: flaps tied back on a warm, lamplit inside
  const top = wall - 2;
  c.poly([ax - 13, c.h, ax, top, ax + 13, c.h], red, [0, 0, 1], -0.5);
  for (let y = top + 3; y < c.h; y++) {
    const hw = ((y - top) / (c.h - top)) * 9;
    for (let x = Math.ceil(ax - hw); x <= ax + hw; x++) c.glow(x, y, y > c.h - 6 ? 0xFFD08A : y > c.h - 14 ? 0xF0A050 : 0xB86030);
  }
  c.tube(ax, 2, ax, ay + 2, 2, pole);
  return c;
}

/** The striker's tower: a planked base box with iron corners, a strike pad, and a barber-striped pole. */
function towerArt(): LitCanvas {
  const c = new LitCanvas(52, FOOT - TOP + 2);
  const wood = c.material(WOOD_M);
  const iron = c.material(IRON_M);
  const red = c.material({ ...RED_M, shine: 0.4, grain: 0 });
  const cream = c.material({ ...CREAM_M, shine: 0.4, grain: 0 });
  const tx = 26;
  const base = FOOT - TOP + 2 - 14;
  const top = 10;
  const stripe = (want: number) => (x: number, y: number): [number, number, number] | null => {
    const u = ((x - tx + 5) / 10) * 2 - 1;
    if (Math.abs(u) > 1) return null;
    if (Math.floor((y + u * 4) / 6) % 2 !== want) return null;
    return [u * 0.95, 0, Math.sqrt(Math.max(0.05, 1 - u * u))];
  };
  c.group(() => {
    c.shape(tx - 5, top, tx + 5, base, red, stripe(0));
    c.shape(tx - 5, top, tx + 5, base, cream, stripe(1));
  });
  c.cylV(tx - 6, top - 2, 12, 3, iron);
  c.box(tx - 24, base, 48, 14, wood, 1);
  for (let x = tx - 24; x < tx + 24; x += 8) c.carve(x, base + 3, x, base + 13, 0.3);
  for (const x of [tx - 24, tx + 20]) c.box(x, base, 4, 14, iron, 1);
  c.box(tx - 20, base - 4, 16, 4, iron, 1);
  return c;
}

/** The brass bell atop the striker: a squat dome with a lip, on its bracket. Anchor (12, 13). */
function bellArt(): LitCanvas {
  const c = new LitCanvas(24, 26);
  const brass = c.material(BRASS_M);
  const iron = c.material(IRON_M);
  c.box(10, 0, 4, 5, iron, 1);
  c.lathe(12, 4, 22, (y) => (y < 4 ? 0 : y < 19 ? 4 + Math.sqrt(Math.max(0, (y - 4) / 15)) * 6 : 10.5), brass);
  c.sphere(12, 23, 2, iron);
  return c;
}
