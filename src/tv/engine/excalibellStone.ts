import { Container, Graphics, Sprite, Texture, type Ticker } from 'pixi.js';
import { audioManager } from '../../shared/AudioManager';

/**
 * The Enchanted Stone of Excalibell (src/shared/excalibellTrial.ts), staged as a full-screen hero shot: the
 * forest dimmed to night, god rays falling on a mossy stone at 2× with Excalibell buried bell-first, mist on
 * the ground and fireflies in the dark. Squats loosen it (setProgress lifts the bell and lights the runes and
 * cracks); pull() launches it into the sky as the stone shatters, then lets it float back down point-up into a
 * halo; reject() lets the light die.
 *
 * Coordinates are screen pixels (the engine's UI layer, 426×240).
 */
export interface StoneHost {
  shake(intensity: number): void;
}

const W = 426;
const H = 240;
const CX = 213;
const FOOT = 200; // the stone's foot, on the forest path
const ZOOM = 2; // whole-pixel zoom keeps the pixel art crisp
const STONE_H = 31 * ZOOM;
const BELL_BURY = 22 * ZOOM; // bell + a little blade hidden in the stone at rest
const BELL_LOOSEN = 9 * ZOOM; // how far squats lift it before the pull
const HELD_Y = 72; // where the raised bell floats: its pommel clears the stone (top at 138)
const GOLD = 0xF4B41A;
const PALE_GOLD = 0xFFFBEA;
const MIST = 0xC7D2FE;
const FIREFLY = 0xD9F99D;
const NIGHT = 0x05060F;
const STONE_TONES = [0x4B5563, 0x6B7280, 0x374151, 0x9CA3AF];
const MOSS_TONES = [0x3F6212, 0x4D7C0F];

// Win choreography (seconds into pull()): strain, launch off the top as the stone shatters, a beat, descent
const STRAIN = 1.0;
const LAUNCH = 0.22;
const AWAY = 0.55;
const DESCEND = 2.6;
const SKY_Y = -110; // bell centre when it is out of frame above
/** Seconds from pull() until the bell has settled. */
export const EXCALIBELL_PULL_SECONDS = STRAIN + LAUNCH + AWAY + DESCEND;

interface Mote { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: number }
interface Ring { r: number; life: number; max: number; big: boolean }
interface Fog { x: number; y: number; rx: number; ry: number; v: number; a: number; front: boolean }
interface BellPos { x: number; y: number; head: number }
interface Chunk { x: number; y: number; vx: number; vy: number; w: number; h: number; color: number; spin: number; vs: number; ground: number; rest: boolean }
interface Dust { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number }

export class ExcalibellStone {
  readonly view = new Container();
  private dim = new Graphics();
  private vignette = new Graphics();
  private rays = new Graphics();
  private glow = new Graphics();
  private fogBack = new Graphics();
  private fogFront = new Graphics();
  private stoneBox = new Container(); // drawn at 1× around the stone's foot, shown at ZOOM
  private stone = new Graphics();
  private runes = new Graphics();
  private halo = new Graphics();
  private bell: Sprite | null = null;
  private bellInFront = false;
  private sparks = new Graphics();
  private rings = new Graphics();
  private glint = new Graphics();
  private flashG = new Graphics();
  private rubble = new Graphics();
  private chunks: Chunk[] = [];
  private dust: Dust[] = [];
  private haloK = 0; // 0–1: the sunburst around the freed bell
  private launchFrom = 0;
  private motes: Mote[] = [];
  private ringList: Ring[] = [];
  private fog: Fog[] = [];
  private progress = 0;
  private shown = 0; // eased progress
  private jolt = 0; // per-rep wobble
  private dimAlpha = 0;
  private flashAlpha = 0;
  private t = 0;
  private phase: 'resting' | 'pulling' | 'held' | 'sealed' = 'resting';
  private phaseT = 0;
  private burstDone = false;
  private onPulled: (() => void) | null = null;
  private readonly tick = (ticker: Ticker) => this.update(Math.min(0.05, ticker.deltaMS / 1000));

  constructor(bellTexture: Texture | null, private readonly ticker: Ticker, private readonly host: StoneHost) {
    for (const g of [this.rays, this.glow, this.halo, this.sparks, this.rings, this.glint]) g.blendMode = 'add';
    this.drawVignette();
    this.drawStone();
    this.stoneBox.addChild(this.stone, this.runes);
    this.stoneBox.position.set(CX, FOOT);
    this.stoneBox.scale.set(ZOOM);
    for (let i = 0; i < 14; i++) {
      this.fog.push({
        x: Math.random() * (W + 120) - 60,
        y: FOOT - 10 + Math.random() * 26,
        rx: 40 + Math.random() * 50,
        ry: 5 + Math.random() * 5,
        v: (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 6),
        a: 0.04 + Math.random() * 0.05,
        front: i % 3 === 0,
      });
    }
    this.view.addChild(this.dim, this.rays, this.glow, this.fogBack, this.halo);
    if (bellTexture) {
      // The art lies hilt-left, bell-right: a quarter turn clockwise stands it bell-down
      this.bell = new Sprite(bellTexture);
      this.bell.anchor.set(0.5);
      this.bell.scale.set(ZOOM);
      this.bell.rotation = Math.PI / 2;
      this.view.addChild(this.bell);
    }
    this.view.addChild(this.stoneBox, this.rubble, this.fogFront, this.sparks, this.rings, this.glint, this.vignette, this.flashG);
    this.ticker.add(this.tick);
    this.update(0);
  }

  /** Squats done / squats needed, 0–1. */
  setProgress(p: number): void {
    this.progress = Math.max(0, Math.min(1, p));
  }

  /** One squat landed: the stone shudders and a ring of light runs across the ground. */
  rep(): void {
    if (this.phase !== 'resting') return;
    this.jolt = 1;
    this.burst(5 + Math.round(this.progress * 8), 'stone');
    this.ringList.push({ r: 30, life: 0.7, max: 0.7, big: false });
    audioManager.play('rock', { vol: 0.35, rate: 1.1 + this.progress * 0.4 });
    audioManager.play('rune', { vol: 0.18 + this.progress * 0.25, rate: 0.8 + this.progress * 0.6 });
  }

  /**
   * The knight wins: the stone strains, the bell launches out of frame as the stone shatters, then floats back
   * down point-up into a halo. `onDone` fires once it has settled (EXCALIBELL_PULL_SECONDS).
   */
  pull(onDone?: () => void): void {
    if (this.phase !== 'resting') return;
    this.phase = 'pulling';
    this.phaseT = 0;
    this.progress = 1;
    this.onPulled = onDone ?? null;
    this.host.shake(4);
    const down = STRAIN + LAUNCH + AWAY;
    audioManager.play('quake', { vol: 0.7 });
    audioManager.play('charge_long', { vol: 0.6, delay: 0.05 });
    audioManager.play('whoosh_heavy', { vol: 0.9, delay: STRAIN - 0.05, rate: 1.2 });
    audioManager.play('explosion', { vol: 0.6, delay: STRAIN });
    audioManager.play('crack', { vol: 0.9, delay: STRAIN });
    audioManager.play('rock', { vol: 0.8, delay: STRAIN + 0.05 });
    audioManager.play('rock', { vol: 0.5, delay: STRAIN + 0.35, rate: 1.3 });
    audioManager.play('holy', { vol: 0.9, delay: down });
    audioManager.play('beam', { vol: 0.4, delay: down });
    audioManager.play('heal', { vol: 0.6, delay: down + DESCEND - 0.2 });
  }

  /** The knight fails: the light dies, the mist rolls in and the bell sinks back. */
  reject(): void {
    if (this.phase !== 'resting') return;
    this.phase = 'sealed';
    this.phaseT = 0;
    this.host.shake(3);
    audioManager.play('quake', { vol: 0.5, rate: 0.8 });
    audioManager.play('dark', { vol: 0.6, delay: 0.2 });
  }

  /** For the dev bridge (window.__kk). */
  debugState() {
    return { phase: this.phase, progress: this.progress, dim: Number(this.dimAlpha.toFixed(2)), motes: this.motes.length, visible: this.view.visible && Boolean(this.view.parent?.visible) };
  }

  destroy(): void {
    this.ticker.remove(this.tick);
    this.view.destroy({ children: true });
  }

  // --- Frame -------------------------------------------------------------------------------------------

  private update(dt: number): void {
    if (this.view.destroyed) return;
    this.t += dt;
    this.phaseT += dt;
    this.shown += (this.progress - this.shown) * Math.min(1, dt * 6);
    this.jolt = Math.max(0, this.jolt - dt * 5);

    const sealed = this.phase === 'sealed' ? Math.min(1, this.phaseT / 1.4) : 0;
    const fade = 1 - sealed;
    const surge = this.phase === 'pulling' ? Math.min(1, this.phaseT / 1.1) : this.phase === 'held' ? 1 : 0;
    const charge = Math.min(1, this.shown + surge); // how awake the stone is

    // The night closes in as the stage opens, deeper still when the stone refuses
    const dimTarget = 0.82 + sealed * 0.1 - surge * 0.14;
    this.dimAlpha += (dimTarget - this.dimAlpha) * Math.min(1, dt * 1.5);
    this.dim.clear().rect(0, 0, W, H).fill({ color: NIGHT, alpha: this.dimAlpha });
    // The ground falls away into a dark mist floor (it also hides the backdrop's bottom edge)
    const floor = 176;
    for (let y = floor; y < H; y += 4) {
      const k = (y - floor) / (H - floor);
      this.dim.rect(0, y, W, 4).fill({ color: NIGHT, alpha: Math.min(0.9, k * 1.1) * Math.min(1, this.dimAlpha / 0.8) });
    }

    const bell = this.layoutBell();
    this.drawRays(charge, surge, fade);
    this.drawGlow(bell, charge, surge, fade);
    this.drawRunes(charge, fade);
    this.drawHalo(bell);
    this.drawFog(dt, sealed);
    this.drawGlint(bell, fade);

    // Fireflies in the dark; the stone sheds light as it wakes
    if (fade > 0.2 && Math.random() < dt * 4) this.burst(1, 'firefly');
    if (this.phase === 'resting' && Math.random() < dt * (2 + charge * 16)) this.burst(1, 'stone');
    if (this.phase === 'pulling' && this.phaseT < STRAIN && Math.random() < dt * 30) this.burst(2, 'stone');
    if (this.haloK > 0 && bell.head > 0 && Math.random() < dt * 10) this.burst(1, 'bell', bell);
    this.drawMotes(dt);
    this.drawRings(dt);
    this.drawRubble(dt);

    // The moment it tears free: the stone bursts apart
    if (this.phase === 'pulling' && !this.burstDone && this.phaseT >= STRAIN) {
      this.burstDone = true;
      this.shatter();
    }
    this.flashAlpha = Math.max(0, this.flashAlpha - dt * 1.6);
    this.flashG.clear();
    if (this.flashAlpha > 0) this.flashG.rect(0, 0, W, H).fill({ color: PALE_GOLD, alpha: this.flashAlpha });

    // Shudder in whole screen pixels
    const wobble = this.phase === 'resting' ? Math.sin(this.t * 60) * this.jolt * 2
      : this.phase === 'pulling' && this.phaseT < STRAIN ? (Math.random() - 0.5) * 3 * surge : 0;
    this.stoneBox.x = CX + Math.round(wobble);
  }

  /** Places the bell for this frame; returns its centre and its head (where the glow and halo sit). */
  private layoutBell(): BellPos {
    const restY = FOOT - STONE_H - 32 * ZOOM + BELL_BURY;
    let y = restY - this.shown * BELL_LOOSEN;
    let rot = Math.PI / 2;
    let front = false;
    if (this.phase === 'pulling') {
      const k = this.phaseT;
      front = k >= STRAIN;
      if (k < STRAIN) {
        // Straining against the stone
        y = restY - BELL_LOOSEN - k * 10 + (Math.random() - 0.5) * 2;
        rot = Math.PI / 2 + Math.sin(k * 55) * 0.03 * k;
        this.launchFrom = y;
      } else if (k < STRAIN + LAUNCH) {
        // Launched straight up, hilt first, out of frame
        const u = (k - STRAIN) / LAUNCH;
        y = this.launchFrom + (SKY_Y - this.launchFrom) * u * u;
      } else if (k < STRAIN + LAUNCH + AWAY) {
        // Gone into the light; it turns point-up out of sight
        y = SKY_Y;
        rot = -Math.PI / 2;
      } else {
        // Floating back down, slowing as it settles
        const u = Math.min(1, (k - STRAIN - LAUNCH - AWAY) / DESCEND);
        const e = 1 - (1 - u) ** 2.5;
        y = SKY_Y + (HELD_Y - SKY_Y) * e + Math.sin(this.t * 1.6) * 2 * u;
        rot = -Math.PI / 2 + Math.sin(this.t * 2.2) * 0.05 * (1 - u);
        this.haloK = e;
        if (u >= 1) {
          this.phase = 'held';
          this.phaseT = 0;
          const done = this.onPulled;
          this.onPulled = null;
          done?.();
        }
      }
    } else if (this.phase === 'held') {
      y = HELD_Y + Math.sin(this.t * 1.6) * 2;
      rot = -Math.PI / 2;
      front = true;
      this.haloK = 1;
    } else if (this.phase === 'sealed') {
      y = restY - this.shown * BELL_LOOSEN * Math.max(0, 1 - this.phaseT * 1.5) + Math.min(4, this.phaseT * 6);
    }
    y = Math.round(y - this.jolt * 2);
    const x = CX + Math.round(Math.sin(this.t * 60) * this.jolt);

    const bell = this.bell;
    if (bell) {
      bell.position.set(x, y);
      bell.rotation = rot;
      // Behind the stone while seated, in front of everything but the light once drawn out
      if (front !== this.bellInFront) {
        this.bellInFront = front;
        this.view.removeChild(bell);
        this.view.addChildAt(bell, this.view.getChildIndex(front ? this.fogFront : this.stoneBox) + (front ? 1 : 0));
      }
    }
    // The bell head sits 20 art-px from the sprite centre along its length
    return { x, y, head: y + Math.sin(rot) * 20 * ZOOM };
  }

  // --- Light -------------------------------------------------------------------------------------------

  private drawRays(charge: number, surge: number, fade: number): void {
    const g = this.rays.clear();
    if (fade <= 0.01) return;
    const oy = -70;
    const len = FOOT - oy;
    // A fan of god rays from high above, each breathing on its own
    const count = 11;
    for (let i = 0; i < count; i++) {
      const s = i / (count - 1) - 0.5;
      const ang = s * 0.62 + Math.sin(this.t * 0.25 + i * 1.3) * 0.025;
      const lit = 0.5 + 0.5 * Math.sin(this.t * 0.9 + i * 1.7);
      const a = (0.025 + 0.06 * charge + 0.12 * surge) * (0.35 + 0.65 * lit) * fade * (1 - Math.abs(s) * 0.8);
      if (a < 0.004) continue;
      const half = 4 + (i % 3) * 4 + charge * 4;
      const bx = CX + Math.tan(ang) * len;
      g.poly([CX - 1, oy, CX + 1, oy, bx + half, FOOT, bx - half, FOOT]).fill({ color: i % 2 ? GOLD : PALE_GOLD, alpha: a });
    }
    // The pillar falling on the stone itself
    const pa = (0.08 + 0.14 * charge + 0.3 * surge) * fade;
    g.poly([CX - 10, oy, CX + 10, oy, CX + 40, FOOT, CX - 40, FOOT]).fill({ color: GOLD, alpha: pa * 0.35 });
    g.poly([CX - 4, oy, CX + 4, oy, CX + 18, FOOT, CX - 18, FOOT]).fill({ color: PALE_GOLD, alpha: pa * 0.6 });
  }

  private drawGlow(b: BellPos, charge: number, surge: number, fade: number): void {
    const g = this.glow.clear();
    // The launch leaves a streak of light from the stone to the sky
    const since = this.phase === 'pulling' ? this.phaseT - STRAIN : -1;
    if (since >= 0 && since < LAUNCH + AWAY) {
      const a = since < LAUNCH ? 0.7 : 0.7 * (1 - (since - LAUNCH) / AWAY);
      const top = Math.max(0, b.y - 64);
      g.rect(CX - 6, top, 12, FOOT - STONE_H - top).fill({ color: GOLD, alpha: a * 0.4 });
      g.rect(CX - 2, top, 4, FOOT - STONE_H - top).fill({ color: PALE_GOLD, alpha: a });
    }
    const a = (0.05 + 0.1 * charge + 0.15 * surge) * fade;
    if (a < 0.004) return;
    const pulse = 0.5 + 0.5 * Math.sin(this.t * (1.5 + charge * 3));
    // Layered discs read as a soft bloom at this resolution: on the stone's mouth, then on the freed bell
    const cy = this.bellInFront ? b.head : FOOT - STONE_H;
    const base = 26 + charge * 22 + pulse * 4 + surge * 16;
    const layers = 9;
    for (let i = layers; i >= 1; i--) {
      g.circle(b.x, cy, base * (i / layers) * 1.6).fill({ color: i > layers / 2 ? GOLD : PALE_GOLD, alpha: a * 0.32 });
    }
    // Light pooling on the ground
    g.ellipse(CX, FOOT - 2, 70 + charge * 30, 10 + charge * 3).fill({ color: GOLD, alpha: a * 0.9 });
  }

  /** A slowly turning sunburst behind the raised bell. */
  private drawHalo(b: BellPos): void {
    const g = this.halo.clear();
    const k = this.haloK;
    if (k <= 0.01) return;
    const spokes = 12;
    for (let i = 0; i < spokes; i++) {
      const a = this.t * 0.35 + (i / spokes) * Math.PI * 2;
      const r1 = 14;
      const r2 = (i % 2 ? 46 : 64) * k;
      const w = 0.06;
      g.poly([
        b.x + Math.cos(a - w) * r1, b.head + Math.sin(a - w) * r1,
        b.x + Math.cos(a) * r2, b.head + Math.sin(a) * r2,
        b.x + Math.cos(a + w) * r1, b.head + Math.sin(a + w) * r1,
      ]).fill({ color: i % 2 ? GOLD : PALE_GOLD, alpha: 0.16 * k });
    }
    g.circle(b.x, b.head, 22 * k).stroke({ width: 1, color: PALE_GOLD, alpha: 0.45 * k });
    g.circle(b.x, b.head, 27 * k).stroke({ width: 1, color: GOLD, alpha: 0.25 * k });
  }

  /** A four-point star that catches on the crossguard gem now and then. */
  private drawGlint(b: BellPos, fade: number): void {
    const g = this.glint.clear();
    if (fade < 0.3 || this.phase === 'pulling') return;
    const period = this.phase === 'held' ? 1.4 : 2.8;
    const k = (this.t % period) / 0.45;
    if (k > 1) return;
    const s = Math.sin(k * Math.PI);
    // Crossguard gem: 11 art-px from the sprite centre toward the hilt (above it seated, below it raised)
    const gy = Math.round(b.y + (this.phase === 'held' ? 1 : -1) * 11 * ZOOM);
    const len = Math.round(3 + s * 9);
    g.rect(b.x - len, gy, len * 2 + 1, 1).fill({ color: PALE_GOLD, alpha: 0.9 * s });
    g.rect(b.x, gy - len, 1, len * 2 + 1).fill({ color: PALE_GOLD, alpha: 0.9 * s });
    g.rect(b.x - 1, gy - 1, 3, 3).fill({ color: 0xFFFFFF, alpha: s });
  }

  // --- Stone -------------------------------------------------------------------------------------------

  private drawStone(): void {
    const g = this.stone;
    g.ellipse(0, 0, 36, 5).fill({ color: 0x000000, alpha: 0.6 });
    g.poly([-30, 0, -27, -16, -18, -27, -4, -31, 10, -30, 22, -24, 29, -12, 31, 0]).fill({ color: 0x4B5563 });
    g.poly([-30, 0, -27, -16, -18, -27, -6, -30, -10, -18, -14, 0]).fill({ color: 0x6B7280 });
    g.poly([10, -30, 22, -24, 29, -12, 31, 0, 16, 0, 18, -14]).fill({ color: 0x374151 });
    g.poly([-18, -27, -4, -31, 10, -30, 4, -27, -8, -26]).fill({ color: 0x9CA3AF });
    g.rect(-22, -26, 9, 3).fill({ color: 0x3F6212 });
    g.rect(-26, -19, 6, 3).fill({ color: 0x4D7C0F });
    g.rect(14, -28, 8, 2).fill({ color: 0x3F6212 });
    g.rect(24, -18, 4, 3).fill({ color: 0x4D7C0F });
    g.rect(-28, -4, 5, 4).fill({ color: 0x3F6212 });
    g.rect(20, -3, 7, 3).fill({ color: 0x4D7C0F });
    // The slot the blade sits in, and the cracks that will light
    g.rect(-6, -31, 12, 3).fill({ color: 0x1F2937 });
    for (const [x, y, w, h] of CRACKS) g.rect(x, y, w, h).fill({ color: 0x1F2937 });
  }

  /** Runes and cracks fill with light as the squats add up. */
  private drawRunes(charge: number, fade: number): void {
    const g = this.runes.clear();
    const pulse = 0.6 + 0.4 * Math.sin(this.t * (2 + charge * 4));
    const lit = (0.2 + 0.8 * charge) * pulse * fade;
    if (lit <= 0.01) return;
    const color = charge > 0.8 ? PALE_GOLD : GOLD;
    RUNES.forEach(([dx, dy], i) => {
      const a = charge >= i / RUNES.length || i === 0 ? lit : lit * 0.2;
      g.rect(dx, dy, 1, 5).fill({ color, alpha: a });
      g.rect(dx - 1, dy + 1, 3, 1).fill({ color, alpha: a });
      g.rect(dx + (i % 2 ? 1 : -1), dy + 3, 1, 2).fill({ color, alpha: a });
    });
    // Cracks light from the slot outward as the squats add up
    CRACKS.forEach(([x, y, w, h], i) => {
      const a = Math.max(0, Math.min(1, charge * CRACKS.length - i)) * pulse * fade;
      if (a > 0.01) g.rect(x, y, w, h).fill({ color: GOLD, alpha: a });
    });
    g.rect(-6, -31, 12, 1).fill({ color: PALE_GOLD, alpha: lit });
  }

  // --- Atmosphere --------------------------------------------------------------------------------------

  private drawFog(dt: number, sealed: number): void {
    const back = this.fogBack.clear();
    const front = this.fogFront.clear();
    const thick = 1 + sealed * 1.6; // the mist rolls in when the stone refuses
    for (const f of this.fog) {
      f.x += f.v * dt;
      if (f.x > W + 80) f.x = -80;
      if (f.x < -80) f.x = W + 80;
      (f.front ? front : back).ellipse(f.x, f.y, f.rx, f.ry).fill({ color: MIST, alpha: f.a * thick * (f.front ? 0.8 : 1) });
    }
  }

  private burst(n: number, kind: 'stone' | 'firefly' | 'bell', at?: BellPos): void {
    for (let i = 0; i < n; i++) {
      const max = kind === 'firefly' ? 2.5 + Math.random() * 2 : 0.8 + Math.random() * 1.4;
      if (kind === 'firefly') {
        this.motes.push({ x: Math.random() * W, y: 60 + Math.random() * 150, vx: (Math.random() - 0.5) * 8, vy: -2 - Math.random() * 5, life: max, max, size: 1, color: FIREFLY });
      } else if (kind === 'bell' && at) {
        const a = Math.random() * Math.PI * 2;
        const v = 20 + Math.random() * 70;
        this.motes.push({ x: at.x, y: at.head, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: max, max, size: Math.random() < 0.3 ? 2 : 1, color: Math.random() < 0.5 ? PALE_GOLD : GOLD });
      } else {
        this.motes.push({
          x: CX + (Math.random() - 0.5) * 100, y: FOOT - 6 - Math.random() * (STONE_H - 6),
          vx: (Math.random() - 0.5) * 6, vy: -(16 + Math.random() * 36), life: max, max,
          size: Math.random() < 0.25 ? 2 : 1, color: Math.random() < 0.3 ? PALE_GOLD : GOLD,
        });
      }
    }
    if (this.motes.length > 160) this.motes.splice(0, this.motes.length - 160);
  }

  private drawMotes(dt: number): void {
    const g = this.sparks.clear();
    this.motes = this.motes.filter((m) => (m.life -= dt) > 0);
    for (const m of this.motes) {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      const u = m.life / m.max;
      const twinkle = m.color === FIREFLY ? 0.5 + 0.5 * Math.sin(this.t * 6 + m.x) : 1;
      const a = Math.min(1, u * 1.5) * Math.min(1, (1 - u) * 6) * twinkle;
      g.rect(Math.round(m.x + Math.sin(m.y * 0.15) * 1.5), Math.round(m.y), m.size, m.size).fill({ color: m.color, alpha: a });
    }
  }

  private drawRings(dt: number): void {
    const g = this.rings.clear();
    this.ringList = this.ringList.filter((r) => (r.life -= dt) > 0);
    for (const r of this.ringList) {
      const u = 1 - r.life / r.max;
      const rad = r.r + u * (r.big ? 260 : 70);
      g.ellipse(CX, FOOT - 2, rad, rad * 0.18).stroke({ width: r.big ? 2 : 1, color: r.big ? PALE_GOLD : GOLD, alpha: (1 - u) * (r.big ? 0.9 : 0.6) });
    }
  }

  /** The stone bursts: chunks and moss fly out and settle as rubble, dust billows, light floods the glade. */
  private shatter(): void {
    this.stoneBox.visible = false;
    this.flashAlpha = 0.6;
    this.host.shake(9);
    this.ringList.push({ r: 20, life: 1.2, max: 1.2, big: true });
    for (let i = 0; i < 48; i++) {
      // Spawned over the stone's silhouette, flung away from its heart
      const x = CX + (Math.random() - 0.5) * 112;
      const y = FOOT - 4 - Math.random() * (STONE_H - 8) * (1 - Math.abs(x - CX) / 70);
      const big = i < 14; // a few boulder-sized pieces, then gravel
      const size = (big ? 6 + Math.floor(Math.random() * 5) : 1 + Math.floor(Math.random() * 4)) * ZOOM;
      const moss = Math.random() < 0.15;
      this.chunks.push({
        x, y,
        vx: (x - CX) * (big ? 1.4 : 2.6) + (Math.random() - 0.5) * 60,
        vy: -(big ? 60 : 110) - Math.random() * (big ? 120 : 170),
        w: size, h: Math.max(ZOOM, size - (Math.random() < 0.5 ? ZOOM : 0)),
        color: moss ? MOSS_TONES[i % 2] : STONE_TONES[i % STONE_TONES.length],
        spin: Math.random() * Math.PI, vs: (Math.random() - 0.5) * 20,
        ground: FOOT - 2 - Math.random() * 10, rest: false,
      });
    }
    for (let i = 0; i < 34; i++) {
      const a = Math.PI + Math.random() * Math.PI; // upward half
      const v = 20 + Math.random() * 60;
      const max = 1.2 + Math.random() * 1.2;
      this.dust.push({ x: CX + (Math.random() - 0.5) * 60, y: FOOT - 10 - Math.random() * 30, vx: Math.cos(a) * v * 1.6, vy: Math.sin(a) * v * 0.5, r: 6 + Math.random() * 8, life: max, max });
    }
    // Glowing rune shards
    this.burst(40, 'bell', { x: CX, y: FOOT - 30, head: FOOT - 30 });
    this.burst(30, 'stone');
  }

  private drawRubble(dt: number): void {
    const g = this.rubble.clear();
    if (this.chunks.length === 0 && this.dust.length === 0) return;
    this.dust = this.dust.filter((d) => (d.life -= dt) > 0);
    for (const d of this.dust) {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vx *= 1 - dt * 1.5;
      d.vy *= 1 - dt * 1.5;
      const u = d.life / d.max;
      g.circle(d.x, d.y, d.r * (1.8 - u)).fill({ color: 0x9CA3AF, alpha: 0.38 * u });
    }
    for (const c of this.chunks) {
      if (!c.rest) {
        c.vy += 520 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.spin += c.vs * dt;
        if (c.y >= c.ground && c.vy > 0) {
          c.y = c.ground;
          if (c.vy < 70) {
            c.rest = true;
          } else {
            c.vy *= -0.35;
            c.vx *= 0.5;
            c.vs *= 0.5;
          }
        }
      }
      // Tumbling: the chunk's footprint flips as it turns; snapped to the 2× pixel grid
      const flip = Math.floor(c.spin / (Math.PI / 2)) % 2 !== 0;
      const w = flip ? c.h : c.w;
      const h = flip ? c.w : c.h;
      const x = Math.round((c.x - w / 2) / ZOOM) * ZOOM;
      const y = Math.round((c.y - h) / ZOOM) * ZOOM;
      g.rect(x, y, w, h).fill({ color: c.color });
      if (w > ZOOM && h > ZOOM) g.rect(x, y, w, ZOOM).fill({ color: 0xFFFFFF, alpha: 0.15 });
    }
  }

  private drawVignette(): void {
    const g = this.vignette;
    // Nested frames, darkest at the edge, pull the eye to the stone
    for (let i = 0; i < 14; i++) {
      const inset = i * 5;
      g.rect(inset, inset * 0.6, W - inset * 2, H - inset * 1.2).stroke({ width: 5, color: 0x000000, alpha: 0.11 * (1 - i / 14), alignment: 1 });
    }
  }
}

/** Glyphs carved across the stone's face (stone-local px). */
const RUNES: [number, number][] = [[-19, -14], [-8, -18], [6, -17], [17, -11]];
/** Cracks running out from the slot, lit in this order. */
const CRACKS: [number, number, number, number][] = [
  [-1, -28, 1, 5], [2, -24, 1, 4], [-4, -22, 4, 1], [-16, -12, 7, 1], [8, -8, 1, 6], [-2, -6, 9, 1], [12, -20, 5, 1], [-12, -18, 1, 5],
];
