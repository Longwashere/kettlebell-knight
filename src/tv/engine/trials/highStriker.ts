import type { Texture, Ticker } from 'pixi.js';
import { audioManager } from '../../../shared/AudioManager';
import type { StoneHost } from '../excalibellStone';
import type { TrialRepResult } from '../../../shared/secretTrials';
import { TrialStage, CX, FOOT, W, hash, mix, type Frame, type WeaponPose } from '../trialStage';

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

export class HighStriker extends TrialStage {
  private puckY = BASE;
  private puckV = 0;
  private puckGoal = 0; // y it will reach; ringing it if TOP
  private rang = 0; // bell shake after a ring
  private dings = 0; // counted rings of the bell (lit bulbs)
  private dark = 0; // lights out on a fail

  constructor(weapon: Texture | null, ticker: Ticker, host: StoneHost) {
    super(weapon, ticker, host, { night: 0x0B0716, dangerNight: 0x050308, dim: 0.72, glow: GOLD, core: 0xFFF7D6, mist: 0x6B5A7A, cold: 0x8079A0, warm: 0xFFE8C2 });
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
    // Big top: striped cone with a pennant
    const bx = W - 66;
    for (let i = 0; i < 8; i++) {
      const x0 = bx - 70 + i * 17.5;
      g.poly([bx, 70, x0, FOOT - 30, x0 + 17.5, FOOT - 30]).fill({ color: i % 2 ? RED : CREAM, alpha: 0.85 });
    }
    g.poly([bx - 70, FOOT - 30, bx + 70, FOOT - 30, bx + 70, FOOT - 6, bx - 70, FOOT - 6]).fill({ color: 0x7F1D1D });
    g.poly([bx - 12, FOOT - 6, bx, FOOT - 28, bx + 12, FOOT - 6]).fill({ color: INK });
    g.moveTo(bx, 70).lineTo(bx, 56).stroke({ width: 1, color: CREAM });
    g.poly([bx, 56, bx + 10 + Math.sin(this.t * 4) * 2, 59, bx, 62]).fill({ color: GOLD });
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
    // Base box
    g.rect(TX - 24, FOOT - 14, 48, 14).fill({ color: 0x5B2A12 }).stroke({ width: 1, color: INK });
    g.rect(TX - 24, FOOT - 14, 48, 3).fill({ color: 0x8A4A22 });
    for (let x = TX - 20; x < TX + 22; x += 8) g.rect(x, FOOT - 10, 1, 9).fill({ color: 0x3B1A0B });
    // Strike pad
    g.rect(TX - 20 + shake, BASE - 4, 16, 4).fill({ color: 0x9CA3AF }).stroke({ width: 1, color: INK });
    // Pole with red/cream bands and marks
    g.rect(TX - 5, TOP + 8, 10, BASE - TOP - 8).fill({ color: INK });
    for (let y = TOP + 9; y < BASE; y += 10) {
      g.rect(TX - 4, y, 8, 5).fill({ color: RED });
      g.rect(TX - 4, y + 5, 8, 5).fill({ color: CREAM });
    }
    g.rect(TX - 2, TOP + 9, 1, BASE - TOP - 9).fill({ color: 0xFFFFFF, alpha: 0.25 });
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
    if (!this.burstDone) {
      const bs = Math.round(Math.sin(this.t * 60) * this.rang * 2);
      g.circle(TX + bs, TOP, 10).fill({ color: INK });
      g.circle(TX + bs, TOP, 9).fill({ color: 0xB45309 });
      g.circle(TX + bs - 2, TOP - 2, 6).fill({ color: GOLD });
      g.circle(TX + bs - 4, TOP - 4, 2).fill({ color: 0xFFF7D6 });
      g.rect(TX - 2, TOP - 14, 4, 4).fill({ color: 0x78716C });
      glow.circle(TX, TOP, 14 + this.rang * 14).fill({ color: GOLD, alpha: 0.12 + this.rang * 0.3 });
    }
    // The puck on its rail
    const py = Math.round(this.puckY);
    g.rect(TX - 7, py - 3, 14, 6).fill({ color: INK });
    g.rect(TX - 6, py - 2, 12, 4).fill({ color: mix(0xE5E7EB, GOLD, this.rang) });
    if (this.puckV < -100) glow.rect(TX - 3, py + 3, 6, Math.min(40, -this.puckV / 12)).fill({ color: CREAM, alpha: 0.25 });
  }
}
