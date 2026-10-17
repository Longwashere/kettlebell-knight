import { Container, Graphics, Sprite, Texture, type Ticker } from 'pixi.js';
import { audioManager } from '../../shared/AudioManager';

/**
 * The Enchanted Stone of Excalibell (src/shared/excalibellTrial.ts): a mossy boulder with Excalibell buried
 * bell-first, under a shaft of holy light. Squats loosen it (setProgress lifts the bell a few pixels and
 * brightens the runes); pull() draws it out into the sky, reject() seals it back in.
 *
 * Coordinates are the engine's game layer: `x`/`y` is the stone's foot on the ground line.
 */
export interface StoneHost {
  shake(intensity: number): void;
  flash(alpha: number, color?: number): void;
}

const GOLD = 0xF4B41A;
const PALE_GOLD = 0xFFFBEA;
const BELL_BURY = 22; // pixels of the (rotated) bell hidden in the stone at rest
const BELL_LOOSEN = 9; // how far squats lift it before the pull

interface Mote { x: number; y: number; vy: number; life: number; max: number; size: number }

export class ExcalibellStone {
  readonly view = new Container();
  private light = new Graphics();
  private glow = new Graphics();
  private bell: Sprite | null = null;
  private bellInFront = false;
  private stone = new Graphics();
  private runes = new Graphics();
  private sparks = new Graphics();
  private motes: Mote[] = [];
  private progress = 0;
  private shown = 0; // eased progress
  private jolt = 0; // per-rep wobble
  private t = 0;
  private phase: 'resting' | 'pulling' | 'pulled' | 'sealed' = 'resting';
  private phaseT = 0;
  private readonly tick = (ticker: Ticker) => this.update(ticker.deltaMS / 1000);

  constructor(
    private readonly x: number,
    private readonly y: number,
    bellTexture: Texture | null,
    private readonly ticker: Ticker,
    private readonly host: StoneHost,
  ) {
    this.light.blendMode = 'add';
    this.glow.blendMode = 'add';
    this.sparks.blendMode = 'add';
    this.view.addChild(this.light, this.glow);
    if (bellTexture) {
      // The art lies hilt-left, bell-right: a quarter turn clockwise stands it bell-down
      this.bell = new Sprite(bellTexture);
      this.bell.anchor.set(0.5);
      this.bell.rotation = Math.PI / 2;
      this.view.addChild(this.bell);
    }
    this.drawStone();
    this.view.addChild(this.stone, this.runes, this.sparks);
    this.ticker.add(this.tick);
    this.layoutBell();
  }

  /** Squats done / squats needed, 0–1. */
  setProgress(p: number): void {
    this.progress = Math.max(0, Math.min(1, p));
  }

  /** One squat landed: the stone shudders and sheds light. */
  rep(): void {
    if (this.phase !== 'resting') return;
    this.jolt = 1;
    this.burst(4 + Math.round(this.progress * 6));
    audioManager.play('rock', { vol: 0.35, rate: 1.1 + this.progress * 0.4 });
    audioManager.play('rune', { vol: 0.18 + this.progress * 0.25, rate: 0.8 + this.progress * 0.6 });
  }

  /** The knight wins: the bell tears free and rises into the light. `onDone` fires once it is gone. */
  pull(onDone?: () => void): void {
    if (this.phase !== 'resting') return;
    this.phase = 'pulling';
    this.phaseT = 0;
    this.progress = 1;
    this.host.shake(6);
    audioManager.play('quake', { vol: 0.7 });
    audioManager.play('charge_long', { vol: 0.6, delay: 0.1 });
    audioManager.play('holy', { vol: 0.9, delay: 1.0 });
    audioManager.play('beam', { vol: 0.6, delay: 1.0 });
    window.setTimeout(() => {
      this.host.flash(0.45, PALE_GOLD);
      this.burst(40);
    }, 1000);
    window.setTimeout(() => onDone?.(), 1700);
  }

  /** The knight fails: the bell sinks back and the light goes out. */
  reject(): void {
    if (this.phase !== 'resting') return;
    this.phase = 'sealed';
    this.phaseT = 0;
    this.host.shake(4);
    audioManager.play('quake', { vol: 0.5, rate: 0.8 });
    audioManager.play('dark', { vol: 0.6, delay: 0.2 });
  }

  destroy(): void {
    this.ticker.remove(this.tick);
    this.view.destroy({ children: true });
  }

  private update(dt: number): void {
    if (this.view.destroyed) return;
    this.t += dt;
    this.phaseT += dt;
    this.shown += (this.progress - this.shown) * Math.min(1, dt * 6);
    this.jolt = Math.max(0, this.jolt - dt * 5);

    const sealed = this.phase === 'sealed' ? Math.min(1, this.phaseT / 1.2) : 0;
    const charge = this.phase === 'pulling' || this.phase === 'pulled' ? 1 : this.shown;
    const pulse = 0.5 + 0.5 * Math.sin(this.t * (2 + charge * 4));

    this.drawLight(charge, pulse, sealed);
    this.drawRunes(charge, pulse, sealed);
    this.layoutBell();
    if (this.phase === 'resting' && Math.random() < dt * (3 + charge * 14)) this.burst(1);
    this.drawMotes(dt);

    const wobble = this.phase === 'resting' ? Math.sin(this.t * 60) * this.jolt * 1.5 : this.phase === 'pulling' ? (Math.random() - 0.5) * 2 : 0;
    this.stone.x = this.runes.x = Math.round(wobble);
  }

  private layoutBell(): void {
    const bell = this.bell;
    if (!bell) return;
    const half = bell.texture.width / 2; // rotated: its width is now its height
    const restY = this.y - 30 - half + BELL_BURY; // stone top is ~30px up
    let lift = this.shown * BELL_LOOSEN;
    let alpha = 1;
    if (this.phase === 'pulling') {
      // Shudder free, then fly up out of frame
      const k = this.phaseT;
      lift = BELL_LOOSEN + (k < 1 ? k * 16 : 16 + (k - 1) ** 2 * 420);
      bell.rotation = Math.PI / 2 + (k < 1 ? Math.sin(k * 50) * 0.05 * k : 0);
      if (k > 1.4) this.phase = 'pulled';
    } else if (this.phase === 'pulled') {
      alpha = 0;
    } else if (this.phase === 'sealed') {
      lift = this.shown * BELL_LOOSEN * Math.max(0, 1 - this.phaseT * 2);
    }
    bell.alpha = alpha;
    bell.x = this.x + Math.round(Math.sin(this.t * 60) * this.jolt);
    bell.y = Math.round(restY - lift - this.jolt * 1.5);
    // Behind the stone while seated, in front once it is drawn out
    const front = lift > BELL_BURY;
    if (front !== this.bellInFront) {
      this.bellInFront = front;
      this.view.removeChild(bell);
      this.view.addChildAt(bell, front ? this.view.children.length : this.view.getChildIndex(this.stone));
    }
  }

  private drawStone(): void {
    const g = this.stone;
    const { x, y } = this;
    // Shadow, then a craggy boulder in three tones with moss on its shoulders
    g.ellipse(x, y, 34, 5).fill({ color: 0x000000, alpha: 0.5 });
    g.poly([x - 30, y, x - 27, y - 16, x - 18, y - 27, x - 4, y - 31, x + 10, y - 30, x + 22, y - 24, x + 29, y - 12, x + 31, y]).fill({ color: 0x4B5563 });
    g.poly([x - 30, y, x - 27, y - 16, x - 18, y - 27, x - 6, y - 30, x - 10, y - 18, x - 14, y]).fill({ color: 0x6B7280 });
    g.poly([x + 10, y - 30, x + 22, y - 24, x + 29, y - 12, x + 31, y, x + 16, y, x + 18, y - 14]).fill({ color: 0x374151 });
    g.poly([x - 18, y - 27, x - 4, y - 31, x + 10, y - 30, x + 4, y - 27, x - 8, y - 26]).fill({ color: 0x9CA3AF });
    g.rect(x - 22, y - 26, 9, 3).fill({ color: 0x3F6212 });
    g.rect(x - 26, y - 19, 6, 3).fill({ color: 0x4D7C0F });
    g.rect(x + 14, y - 28, 8, 2).fill({ color: 0x3F6212 });
    g.rect(x + 24, y - 18, 4, 3).fill({ color: 0x4D7C0F });
    // Cracks and the slot the blade sits in
    g.rect(x - 6, y - 31, 12, 3).fill({ color: 0x1F2937 });
    g.rect(x - 16, y - 12, 7, 1).fill({ color: 0x1F2937 });
    g.rect(x + 8, y - 8, 1, 6).fill({ color: 0x1F2937 });
    g.rect(x - 2, y - 6, 9, 1).fill({ color: 0x1F2937 });
  }

  private drawRunes(charge: number, pulse: number, sealed: number): void {
    const g = this.runes.clear();
    const lit = (0.25 + 0.75 * charge) * (0.6 + 0.4 * pulse) * (1 - sealed);
    if (lit <= 0.01) return;
    const { x, y } = this;
    const color = charge > 0.8 ? PALE_GOLD : GOLD;
    // Four runes across the face; more of them light as the squats add up
    const runes: [number, number][] = [[-19, -14], [-8, -18], [6, -17], [17, -11]];
    runes.forEach(([dx, dy], i) => {
      const on = charge >= i / runes.length || i === 0;
      const a = on ? lit : lit * 0.25;
      g.rect(x + dx, y + dy, 1, 5).fill({ color, alpha: a });
      g.rect(x + dx - 1, y + dy + 1, 3, 1).fill({ color, alpha: a });
      g.rect(x + dx + (i % 2 ? 1 : -1), y + dy + 3, 1, 2).fill({ color, alpha: a });
    });
  }

  private drawLight(charge: number, pulse: number, sealed: number): void {
    const { x, y } = this;
    const top = y - 168; // above the top of the screen
    const fade = 1 - sealed;
    const l = this.light.clear();
    // A wedge of light falling on the stone, widening toward the ground
    const a = (0.14 + 0.2 * charge + 0.06 * pulse) * fade;
    if (a > 0.005) {
      l.poly([x - 8, top, x + 8, top, x + 26, y, x - 26, y]).fill({ color: GOLD, alpha: a * 0.6 });
      l.poly([x - 3, top, x + 3, top, x + 12, y, x - 12, y]).fill({ color: PALE_GOLD, alpha: a });
    }
    if (this.phase === 'pulling' && this.phaseT > 0.9) {
      const b = Math.max(0, 1 - (this.phaseT - 0.9) * 1.2);
      l.rect(x - 10, top, 20, y - top).fill({ color: PALE_GOLD, alpha: 0.7 * b });
    }
    const g = this.glow.clear();
    const r = 18 + charge * 14 + pulse * 3;
    const ga = (0.1 + 0.25 * charge) * fade;
    if (ga > 0.005) {
      g.circle(x, y - 30, r).fill({ color: GOLD, alpha: ga * 0.5 });
      g.circle(x, y - 30, r * 0.55).fill({ color: PALE_GOLD, alpha: ga * 0.6 });
    }
  }

  private burst(n: number): void {
    for (let i = 0; i < n; i++) {
      const max = 0.8 + Math.random() * 1.2;
      this.motes.push({
        x: this.x + (Math.random() - 0.5) * 50,
        y: this.y - 4 - Math.random() * 30,
        vy: -(14 + Math.random() * 30),
        life: max,
        max,
        size: Math.random() < 0.25 ? 2 : 1,
      });
    }
    if (this.motes.length > 90) this.motes.splice(0, this.motes.length - 90);
  }

  private drawMotes(dt: number): void {
    const g = this.sparks.clear();
    this.motes = this.motes.filter((m) => (m.life -= dt) > 0);
    for (const m of this.motes) {
      m.y += m.vy * dt;
      const a = Math.min(1, m.life / m.max * 1.5);
      g.rect(Math.round(m.x + Math.sin(m.y * 0.2) * 2), Math.round(m.y), m.size, m.size).fill({ color: m.size > 1 ? PALE_GOLD : GOLD, alpha: a });
    }
  }
}
