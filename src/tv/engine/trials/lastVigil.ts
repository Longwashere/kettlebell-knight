import type { Texture, Ticker } from 'pixi.js';
import { audioManager } from '../../../shared/AudioManager';
import type { StoneHost } from '../excalibellStone';
import { TrialStage, CX, FOOT, W, H, hash, type Frame, type WeaponPose } from '../trialStage';

/**
 * The Last Vigil (`everburning_censer`, Cathedral Crypt): a dead cleric's censer hangs on its chain over a bier,
 * ringed by twelve candles. The candles gutter out one by one (the danger meter) and the dark at the crypt's
 * edges fills with watching eyes and reaching hands; every halo swings the censer, breathes holy smoke and
 * relights the candles. Lose when the last one dies.
 */
const PX = CX + 14; // the chain's pivot in the vault
const LEN = 64; // pivot to the censer's handle
/** The morning-star art: the handle's top, from the sprite's centre at the stage's 2× zoom. */
const HANDLE = { x: -44, y: -32 };
const CANDLES = 12;
const FLAME = 0xFDE68A;
const HOLY = 0x7DD3FC;
const WAX = 0xE7E0CF;
const STONE = [0x14161C, 0x262A33, 0x3A404B, 0x555C68];

export class LastVigil extends TrialStage {
  private swing = 0.05; // pendulum amplitude
  private angle = 0;
  private puffs: { x: number; y: number; life: number }[] = [];

  constructor(weapon: Texture | null, ticker: Ticker, host: StoneHost) {
    super(weapon, ticker, host, { night: 0x070A12, dangerNight: 0x010103, dim: 0.78, glow: HOLY, core: 0xE0F2FE, mist: 0x7A8BA3, cold: 0x5D6E8C, warm: 0xFFF3D6, turn: Math.PI / 2 });
  }

  /** The end of the chain, where the censer's handle hangs. */
  private chainEnd(): { x: number; y: number } {
    return { x: PX + Math.sin(this.angle) * LEN, y: Math.cos(this.angle) * LEN };
  }

  protected restPose(): WeaponPose {
    // The art hangs from its handle: place it so the handle's top sits on the chain's end, swinging with it
    const e = this.chainEnd();
    const r = -this.angle * 0.6;
    const c = Math.cos(r);
    const s = Math.sin(r);
    return { x: e.x - (HANDLE.x * c - HANDLE.y * s), y: e.y - (HANDLE.x * s + HANDLE.y * c), rot: -Math.PI / 2 + r };
  }

  /** The censer's cage, for smoke and glow. */
  private cagePoint(): { x: number; y: number } {
    const p = this.restPose();
    return { x: p.x + 20, y: p.y + 10 };
  }

  /** How many candles still burn. */
  private lit(): number {
    if (this.phase === 'sealed') return 0;
    return Math.ceil((1 - this.dangerShown) * CANDLES - 0.01);
  }

  protected onRep(): void {
    this.swing = Math.min(0.5, this.swing + 0.12);
    const p = this.cagePoint();
    this.puffs.push({ x: p.x, y: p.y, life: 1.4 });
    // A relit wick
    const i = Math.min(CANDLES - 1, this.lit());
    const c = this.candle(i);
    this.spray(c.x, c.y - 6, 6, [FLAME, 0xFFFFFF], 30);
    audioManager.play('rattle', { vol: 0.3, rate: 1.4 });
    audioManager.play('fire', { vol: 0.2, rate: 1.6 });
  }

  protected onBurst(): void {
    this.flash(0.5, 0xFFFBEB);
    for (let i = 0; i < CANDLES; i++) {
      const c = this.candle(i);
      this.spray(c.x, c.y - 8, 6, [FLAME, 0xFFFFFF, HOLY], 90, 0, true);
    }
    this.debris(PX, 8, 8, [0x78716C, 0xA8A29E], { speed: 120, spread: 6 });
    audioManager.play('holy', { vol: 0.9 });
    audioManager.play('fire_burst', { vol: 0.5, rate: 1.3 });
    audioManager.play('impact_metal', { vol: 0.6, rate: 1.3 });
  }

  protected onReject(): void {
    audioManager.play('wail', { vol: 0.5, rate: 0.7 });
    audioManager.play('dark', { vol: 0.6, delay: 0.2 });
  }

  private candle(i: number): { x: number; y: number; h: number } {
    const u = i / (CANDLES - 1);
    const x = PX - 92 + u * 184;
    const y = FOOT - 2 - Math.sin(u * Math.PI) * 8;
    return { x: Math.round(x), y: Math.round(y), h: 6 + Math.round(hash(i, 4) * 8) };
  }

  protected paint(f: Frame): void {
    const { dt } = f;
    this.swing = Math.max(0.05, this.swing - dt * 0.06);
    this.angle = Math.sin(this.t * 1.6) * this.swing;
    this.puffs = this.puffs.filter((p) => (p.life -= dt) > 0);
    const b = this.back.clear();
    const s = this.set.clear();
    const glow = this.glow.clear();
    // The bier
    b.rect(PX - 34, FOOT - 22, 68, 22).fill({ color: STONE[1] }).stroke({ width: 1, color: STONE[0] });
    b.rect(PX - 38, FOOT - 26, 76, 5).fill({ color: STONE[3] });
    b.rect(PX - 6, FOOT - 20, 12, 18).fill({ color: 0x3B4A6B });
    b.rect(PX - 1, FOOT - 18, 2, 12).fill({ color: 0xC7D2FE });
    b.rect(PX - 4, FOOT - 14, 8, 2).fill({ color: 0xC7D2FE });
    // The chain from the vault to the censer's ring
    if (!this.burstDone) {
      const { x: tx, y: ty } = this.chainEnd();
      const n = Math.floor(Math.hypot(tx - PX, ty) / 4);
      for (let i = 0; i < n; i++) {
        const u = i / n;
        b.rect(Math.round(PX + (tx - PX) * u) - 1, Math.round(ty * u), i % 2 ? 2 : 3, 3).fill({ color: i % 2 ? 0x57534E : 0xA8A29E });
      }
    }
    // Candles: wax, wick, and a flame while lit
    const lit = this.lit();
    const flare = this.phase === 'pulling' || this.phase === 'claiming' || this.phase === 'held' ? 1 : 0;
    for (let i = 0; i < CANDLES; i++) {
      const c = this.candle(i);
      s.rect(c.x - 2, c.y - c.h, 4, c.h).fill({ color: WAX }).stroke({ width: 1, color: 0x1C1917 });
      s.rect(c.x - 2, c.y - c.h, 1, c.h).fill({ color: 0xFFFFFF, alpha: 0.4 });
      const on = i < lit || flare;
      const fy = c.y - c.h - 2;
      if (on) {
        const fl = Math.sin(this.t * 13 + i * 2) * 0.8;
        const tall = flare ? 18 + Math.sin(this.t * 9 + i) * 4 : 4;
        s.poly([c.x - 1.5, fy, c.x + fl, fy - tall, c.x + 1.5, fy]).fill({ color: FLAME });
        s.rect(c.x, fy - 2, 1, 2).fill({ color: 0xFFFFFF });
        glow.circle(c.x, fy - 2, 4 + (flare ? 8 : 0)).fill({ color: FLAME, alpha: 0.14 });
        if (flare) glow.rect(c.x - 3, 0, 6, fy).fill({ color: 0xFFFBEB, alpha: 0.06 });
      } else {
        s.rect(c.x, fy, 1, 2).fill({ color: 0x292524 });
        if (Math.random() < dt * 2) this.mote(c.x, fy - 2, (Math.random() - 0.5) * 4, -10, 1.2, 0x6B7280);
      }
    }
    // Holy smoke from the censer
    for (const p of this.puffs) {
      const u = 1 - p.life / 1.4;
      glow.circle(p.x + Math.sin(u * 5) * 4, p.y - u * 30, 6 + u * 14).fill({ color: HOLY, alpha: 0.18 * (1 - u) });
    }
    if (!this.burstDone && this.phase !== 'sealed') {
      const p = this.cagePoint();
      if (Math.random() < dt * 6) this.mote(p.x, p.y - 4, (Math.random() - 0.5) * 6, -14, 1.6, 0xBAE6FD);
      glow.circle(p.x, p.y, 10 + this.shown * 10).fill({ color: HOLY, alpha: 0.1 + this.shown * 0.12 });
    }
    this.paintDark(f);
  }

  /** The dark at the edges: it closes in as candles die, with eyes in it and hands reaching out. */
  private paintDark(f: Frame): void {
    const o = this.over.clear();
    const d = Math.min(1, this.dangerShown + f.sealed);
    if (d < 0.05) return;
    const reach = 40 + d * 120;
    for (let i = 0; i < 8; i++) {
      const k = i / 8;
      o.rect(0, 0, reach * (1 - k), H).fill({ color: 0x000000, alpha: 0.09 * d });
      o.rect(W - reach * (1 - k) * 0.9, 0, reach * (1 - k) * 0.9, H).fill({ color: 0x000000, alpha: 0.09 * d });
    }
    // Eyes in the dark
    const eyes = Math.floor(d * 10);
    for (let i = 0; i < eyes; i++) {
      const left = i % 2 === 0;
      const x = left ? 8 + hash(i, 1) * reach * 0.6 : W - 8 - hash(i, 1) * reach * 0.6;
      const y = 30 + hash(i, 2) * 150;
      const blink = Math.sin(this.t * 0.9 + i * 3) > -0.95;
      if (blink) {
        o.rect(Math.round(x), Math.round(y), 2, 1).fill({ color: 0xFCA5A5, alpha: 0.8 });
        o.rect(Math.round(x) + 4, Math.round(y), 2, 1).fill({ color: 0xFCA5A5, alpha: 0.8 });
      }
    }
    // Bony hands creeping in along the floor
    if (d > 0.4) {
      for (const side of [-1, 1]) {
        const base = side < 0 ? 0 : W;
        const x = base - side * (d - 0.4) * 160;
        for (let k = 0; k < 4; k++) {
          o.moveTo(base, FOOT - 6 - k * 3).lineTo(x - side * k * 3, FOOT - 10 - k * 4 + Math.sin(this.t * 2 + k) * 2).stroke({ width: 1.5, color: 0x9CA3AF, alpha: 0.6 * d });
        }
      }
    }
  }
}
