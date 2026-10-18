import { Container, Graphics, Sprite, Texture, type Ticker } from 'pixi.js';
import type { StoneHost } from './excalibellStone';
import type { TrialRepResult } from '../../shared/secretTrials';

/**
 * Shared stage for the secret-trial hero shots (trialScenes.ts): the backdrop dimmed to night, mist, motes, rings,
 * flashes and flying debris, the knight staged at the left at the scene's zoom and lit by it, and the sealed
 * weapon's flight when the trial is won (strain → launch out of frame → sink back head-up into a halo → into the
 * knight's hand). A scene paints its own centrepiece in `paint()` and reacts in the hooks; `progress` (0–1 toward
 * the win) and `danger` (0–1 toward the loss) arrive from the trial screen every frame.
 *
 * Coordinates are screen pixels (the engine's UI layer, 426×240).
 */
export const W = 426;
export const H = 240;
export const CX = 213;
export const FOOT = 200;
export const ACTOR_X = CX - 84;
const ACTOR_SCALE = 1.6;
const ZOOM = 2;

// Win choreography (seconds into pull()), the same beats as the stone
export const STRAIN = 1.0;
const LAUNCH = 0.22;
const AWAY = 0.55;
const DESCEND = 2.6;
const CLAIM = 0.7;
const SKY_Y = -110;
const HELD_Y = 72;
/** Seconds from pull() until the weapon is in the knight's hand. */
export const STAGE_PULL_SECONDS = STRAIN + LAUNCH + AWAY + DESCEND + CLAIM;

export interface StageLook {
  /** Night colour the backdrop is dimmed to, and what it turns to as the danger rises. */
  night: number;
  dangerNight?: number;
  dim?: number;
  /** Accent light (rings, sparks, halo) and its pale core. */
  glow: number;
  core: number;
  mist: number;
  /** The knight's light: cold at rest, warm once the scene wakes. */
  cold: number;
  warm: number;
  /**
   * Added to every weapon pose's rotation. Default: a quarter turn for upright art (bells), 0 for haft-left art.
   * Morning stars (art: a handle with the head hanging off its chain) pass π/2 so "head up" (−π/2) hangs naturally.
   */
  turn?: number;
}

export interface Mote { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: number; g: number }
interface Ring { x: number; y: number; r: number; grow: number; life: number; max: number; color: number; width: number; flat: number }
interface Fog { x: number; y: number; rx: number; ry: number; v: number; a: number; front: boolean }
interface Chunk { x: number; y: number; vx: number; vy: number; w: number; h: number; color: number; spin: number; vs: number; ground: number; rest: boolean }
export interface WeaponPose { x: number; y: number; rot: number; tint?: number; scale?: number }
export interface Frame { dt: number; charge: number; surge: number; sealed: number; fade: number }

export abstract class TrialStage {
  readonly view = new Container();
  protected dim = new Graphics();
  /** Behind the knight: the scene's backdrop pieces. */
  protected back = new Graphics();
  /** Additive glow behind the knight. */
  protected backGlow = new Graphics();
  /** In front of the knight: the centrepiece. */
  protected set = new Graphics();
  /** Additive glow over the centrepiece. */
  protected glow = new Graphics();
  /** Over everything but the light: rain, darkness, glitches. */
  protected over = new Graphics();
  private fogBack = new Graphics();
  private fogFront = new Graphics();
  private halo = new Graphics();
  private actorLayer = new Container();
  private actor: Container | null = null;
  private sparks = new Graphics();
  private rubble = new Graphics();
  private rings = new Graphics();
  private vignette = new Graphics();
  private flashG = new Graphics();
  protected weapon: Sprite | null = null;
  /** Bells are drawn upright, not haft-left: they turn a quarter less so "head up" stands them upright. */
  private weaponTurn = 0;
  private weaponReach = 20 * ZOOM; // sprite centre to head along its length
  private weaponFront = false;
  private motes: Mote[] = [];
  private ringList: Ring[] = [];
  private fog: Fog[] = [];
  private chunks: Chunk[] = [];
  private claimFrom = { x: CX, y: HELD_Y };
  private launchFrom: { x: number; y: number } | null = null;
  private haloK = 0;
  protected progress = 0;
  /** Eased progress, for drawing. */
  protected shown = 0;
  protected danger = 0;
  protected dangerShown = 0;
  /** 1 on a counted rep, decaying: wobble the centrepiece with it. */
  protected jolt = 0;
  protected t = 0;
  protected phase: 'resting' | 'pulling' | 'claiming' | 'held' | 'sealed' = 'resting';
  protected phaseT = 0;
  protected burstDone = false;
  private dimAlpha = 0;
  private flashAlpha = 0;
  private flashColor = 0xFFFFFF;
  private onPulled: (() => void) | null = null;
  private readonly tick = (ticker: Ticker) => this.update(Math.min(0.05, ticker.deltaMS / 1000));

  constructor(weaponTexture: Texture | null, private readonly ticker: Ticker, protected readonly host: StoneHost, protected readonly look: StageLook) {
    for (const g of [this.backGlow, this.glow, this.halo, this.sparks, this.rings]) g.blendMode = 'add';
    this.drawVignette();
    for (let i = 0; i < 14; i++) {
      this.fog.push({
        x: Math.random() * (W + 120) - 60, y: FOOT - 8 + Math.random() * 24,
        rx: 40 + Math.random() * 50, ry: 4 + Math.random() * 5,
        v: (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 6), a: 0.04 + Math.random() * 0.05, front: i % 3 === 0,
      });
    }
    this.view.addChild(this.dim, this.back, this.backGlow, this.fogBack, this.halo);
    if (weaponTexture) {
      this.weapon = new Sprite(weaponTexture);
      this.weapon.anchor.set(0.5);
      this.weapon.scale.set(ZOOM);
      this.weapon.visible = false;
      if (look.turn !== undefined || weaponTexture.width / weaponTexture.height < 1.4) {
        this.weaponTurn = look.turn ?? Math.PI / 2;
        this.weaponReach = 0;
      }
      this.view.addChild(this.weapon);
    }
    this.view.addChild(this.actorLayer, this.set, this.glow, this.rubble, this.fogFront, this.sparks, this.rings, this.over, this.vignette, this.flashG);
    this.ticker.add(this.tick);
  }

  // --- Scene hooks ---------------------------------------------------------------------------------------

  /** Paints the centrepiece for this frame (clear your Graphics first). */
  protected abstract paint(f: Frame): void;
  /** A counted rep. */
  protected abstract onRep(power: number): void;
  /** The chains part / the door opens: the weapon launches from `launchPoint()` right after. */
  protected abstract onBurst(): void;
  /** The trial is lost. */
  protected abstract onReject(): void;
  /** Where the sealed weapon rests on this frame (null = hidden until it bursts free). */
  protected abstract restPose(): WeaponPose | null;
  /** Where the weapon launches from (default: its rest pose, or the centre). */
  protected launchPoint(): { x: number; y: number } {
    const r = this.restPose();
    return r ? { x: r.x, y: r.y } : { x: CX, y: FOOT - 60 };
  }
  /** A rep that did not count (too weak, off the beat). */
  protected onMiss(_kind: TrialRepResult, _power: number): void {}
  /** Rhythm trials: the beat. */
  protected onBeat(): void {}
  /** The Hollow Choir: the scene lies for a moment. */
  protected onGlitch(): void {}

  // --- TrialScene ----------------------------------------------------------------------------------------

  attachActor(actor: Container): void {
    this.actor = actor;
    actor.position.set(ACTOR_X, FOOT);
    actor.scale.set(ACTOR_SCALE);
    this.actorLayer.addChild(actor);
  }

  detachActor(): Container | null {
    const actor = this.actor;
    this.actor = null;
    if (actor) {
      actor.tint = 0xFFFFFF;
      this.actorLayer.removeChild(actor);
    }
    return actor;
  }

  setProgress(p: number): void {
    this.progress = Math.max(0, Math.min(1, p));
  }

  setClock(k: number): void {
    if (this.phase === 'resting') this.danger = Math.max(0, Math.min(1, k));
  }

  rep(power = 80): void {
    if (this.phase !== 'resting') return;
    this.jolt = 1;
    this.onRep(power);
  }

  miss(kind: TrialRepResult, power = 80): void {
    if (this.phase === 'resting') this.onMiss(kind, power);
  }

  beat(): void {
    if (this.phase === 'resting') this.onBeat();
  }

  glitch(): void {
    if (this.phase === 'resting') this.onGlitch();
  }

  pull(onDone?: () => void): void {
    if (this.phase !== 'resting') return;
    this.phase = 'pulling';
    this.phaseT = 0;
    this.progress = 1;
    this.onPulled = onDone ?? null;
    this.host.shake(4);
  }

  reject(): void {
    if (this.phase !== 'resting') return;
    this.phase = 'sealed';
    this.phaseT = 0;
    this.host.shake(3);
    this.onReject();
  }

  debugState() {
    const w = this.weapon;
    return {
      phase: this.phase, progress: Number(this.progress.toFixed(2)), danger: Number(this.danger.toFixed(2)),
      weapon: w ? { visible: w.visible, x: Math.round(w.x), y: Math.round(w.y) } : null,
      visible: this.view.visible && Boolean(this.view.parent?.visible),
    };
  }

  destroy(): void {
    this.ticker.remove(this.tick);
    this.detachActor();
    this.view.destroy({ children: true });
  }

  // --- Effects for scenes --------------------------------------------------------------------------------

  protected flash(alpha: number, color: number): void {
    this.flashAlpha = alpha;
    this.flashColor = color;
  }

  /** A light mote (additive); `g` > 0 makes it fall. */
  protected mote(x: number, y: number, vx: number, vy: number, life: number, color: number, size = 1, g = 0): void {
    this.motes.push({ x, y, vx, vy, life, max: life, size, color, g });
    if (this.motes.length > 220) this.motes.splice(0, this.motes.length - 220);
  }

  /** `n` motes bursting from (x, y) at up to `speed` px/s. */
  protected spray(x: number, y: number, n: number, colors: number[], speed = 60, g = 0, up = false): void {
    for (let i = 0; i < n; i++) {
      const a = up ? -Math.PI / 2 + (Math.random() - 0.5) * 1.6 : Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      this.mote(x, y, Math.cos(a) * v, Math.sin(a) * v, 0.6 + Math.random() * 1, colors[i % colors.length], Math.random() < 0.3 ? 2 : 1, g);
    }
  }

  /** A ring spreading from (x, y): `flat` < 1 lays it on the floor. */
  protected ring(x: number, y: number, color: number, o: { r?: number; grow?: number; life?: number; width?: number; flat?: number } = {}): void {
    const life = o.life ?? 0.7;
    this.ringList.push({ x, y, r: o.r ?? 10, grow: o.grow ?? 70, life, max: life, color, width: o.width ?? 1, flat: o.flat ?? 0.2 });
  }

  /** Solid pieces flung from (x, y) that fall, bounce and settle on the floor. */
  protected debris(x: number, y: number, n: number, colors: number[], o: { speed?: number; size?: number; spread?: number } = {}): void {
    for (let i = 0; i < n; i++) {
      const size = (1 + Math.floor(Math.random() * (o.size ?? 3))) * ZOOM;
      const px = x + (Math.random() - 0.5) * (o.spread ?? 30);
      this.chunks.push({
        x: px, y,
        vx: (px - x) * 3 + (Math.random() - 0.5) * (o.speed ?? 120),
        vy: -(60 + Math.random() * (o.speed ?? 160)),
        w: size, h: Math.max(ZOOM, size - (Math.random() < 0.5 ? ZOOM : 0)),
        color: colors[i % colors.length], spin: Math.random() * Math.PI, vs: (Math.random() - 0.5) * 20,
        ground: FOOT - 2 - Math.random() * 10, rest: false,
      });
    }
  }

  // --- Frame ---------------------------------------------------------------------------------------------

  private update(dt: number): void {
    if (this.view.destroyed) return;
    this.t += dt;
    this.phaseT += dt;
    this.shown += (this.progress - this.shown) * Math.min(1, dt * 6);
    this.dangerShown += (this.danger - this.dangerShown) * Math.min(1, dt * 3);
    this.jolt = Math.max(0, this.jolt - dt * 5);
    const sealed = this.phase === 'sealed' ? Math.min(1, this.phaseT / 1.4) : 0;
    const surge = this.phase === 'pulling' ? Math.min(1, this.phaseT / 1.1) : this.phase === 'held' || this.phase === 'claiming' ? 1 : 0;
    const charge = Math.min(1, this.shown + surge);
    const look = this.look;

    const dimTarget = (look.dim ?? 0.8) + sealed * 0.08 - surge * 0.08;
    this.dimAlpha += (dimTarget - this.dimAlpha) * Math.min(1, dt * 1.5);
    const night = look.dangerNight === undefined ? look.night : mix(look.night, look.dangerNight, Math.min(1, this.dangerShown + sealed * 0.5));
    this.dim.clear().rect(0, 0, W, H).fill({ color: night, alpha: this.dimAlpha });
    for (let y = 176; y < H; y += 4) {
      const k = (y - 176) / (H - 176);
      this.dim.rect(0, y, W, 4).fill({ color: look.night, alpha: Math.min(0.9, k * 1.1) * Math.min(1, this.dimAlpha / 0.8) });
    }

    if (this.phase === 'pulling' && !this.burstDone && this.phaseT >= STRAIN) {
      this.burstDone = true;
      this.launchFrom = this.launchPoint();
      this.flash(0.5, look.core);
      this.host.shake(8);
      this.ring(this.launchFrom.x, FOOT - 2, look.core, { r: 20, grow: 260, life: 1.2, width: 2 });
      this.onBurst();
    }
    this.paint({ dt, charge, surge, sealed, fade: 1 - sealed });
    const head = this.layoutWeapon();
    this.drawHalo(head);
    if (this.haloK > 0 && Math.random() < dt * 10) this.spray(head.x, head.head, 1, [look.glow, look.core], 40);
    this.tintActor(charge, sealed);
    this.drawFog(dt, sealed);
    this.drawMotes(dt);
    this.drawRings(dt);
    this.drawRubble(dt);
    this.flashAlpha = Math.max(0, this.flashAlpha - dt * 1.6);
    this.flashG.clear();
    if (this.flashAlpha > 0) this.flashG.rect(0, 0, W, H).fill({ color: this.flashColor, alpha: this.flashAlpha });
  }

  private layoutWeapon(): { x: number; y: number; head: number } {
    const w = this.weapon;
    let pose: WeaponPose | null = null;
    let front = false;
    if (this.phase === 'resting' || this.phase === 'sealed' || (this.phase === 'pulling' && this.phaseT < STRAIN)) {
      pose = this.restPose();
      if (pose && this.phase === 'pulling') pose = { ...pose, x: pose.x + (Math.random() - 0.5) * 3, y: pose.y + (Math.random() - 0.5) * 3 };
    } else if (this.phase === 'pulling') {
      const k = this.phaseT;
      const from = this.launchFrom ?? { x: CX, y: FOOT - 60 };
      front = true;
      if (k < STRAIN + LAUNCH) {
        const u = (k - STRAIN) / LAUNCH;
        pose = { x: from.x + (CX - from.x) * u, y: from.y + (SKY_Y - from.y) * u * u, rot: Math.PI / 2 + u * Math.PI * 3 };
      } else if (k < STRAIN + LAUNCH + AWAY) {
        pose = { x: CX, y: SKY_Y, rot: -Math.PI / 2 };
      } else {
        const u = Math.min(1, (k - STRAIN - LAUNCH - AWAY) / DESCEND);
        const e = 1 - (1 - u) ** 2.5;
        const y = SKY_Y + (HELD_Y - SKY_Y) * e + Math.sin(this.t * 1.6) * 2 * u;
        pose = { x: CX, y, rot: -Math.PI / 2 + Math.sin(this.t * 2.2) * 0.06 * (1 - u) };
        this.haloK = e;
        if (u >= 1) {
          this.phase = this.host.handPoint ? 'claiming' : 'held';
          this.phaseT = 0;
          this.claimFrom = { x: CX, y };
          if (this.phase === 'held') this.finishPull();
        }
      }
    } else if (this.phase === 'claiming') {
      const hand = this.host.handPoint?.() ?? { x: ACTOR_X + 16, y: FOOT - 48 };
      const u = Math.min(1, this.phaseT / CLAIM);
      const e = u * u * (3 - 2 * u);
      const x = this.claimFrom.x + (hand.x - this.claimFrom.x) * e;
      const y = this.claimFrom.y + (hand.y - this.claimFrom.y) * e - Math.sin(u * Math.PI) * 18;
      this.haloK = 1 - e * 0.4;
      pose = { x, y, rot: -Math.PI / 2 + e * 0.5, scale: 1 - e * 0.35 };
      front = true;
      if (w) w.alpha = 1 - Math.max(0, u - 0.8) * 5;
      if (u >= 1) {
        this.phase = 'held';
        this.phaseT = 0;
        this.flash(0.3, this.look.core);
        this.ring(hand.x, FOOT - 2, this.look.core, { r: 10, grow: 260, life: 0.9, width: 2 });
        this.spray(hand.x, hand.y, 30, [this.look.glow, this.look.core], 70);
        this.finishPull();
        pose = null;
      }
    } else if (this.phase === 'held') {
      const hand = this.host.handPoint?.();
      this.haloK += (0.7 - this.haloK) * 0.05;
      if (w) w.visible = false;
      return hand ? { x: hand.x, y: hand.y, head: hand.y - 10 } : { x: CX, y: HELD_Y, head: HELD_Y };
    }
    if (w) {
      w.visible = Boolean(pose);
      if (pose) {
        w.position.set(Math.round(pose.x), Math.round(pose.y));
        w.rotation = pose.rot + this.weaponTurn;
        w.scale.set(ZOOM * (pose.scale ?? 1));
        w.tint = pose.tint ?? 0xFFFFFF;
      }
      if (front !== this.weaponFront) {
        this.weaponFront = front;
        this.view.removeChild(w);
        this.view.addChildAt(w, this.view.getChildIndex(front ? this.fogFront : this.actorLayer) + (front ? 1 : 0));
      }
    }
    const p = pose ?? { x: CX, y: HELD_Y, rot: 0 };
    return { x: p.x, y: p.y, head: p.y + Math.sin(p.rot) * this.weaponReach };
  }

  private finishPull(): void {
    const done = this.onPulled;
    this.onPulled = null;
    done?.();
  }

  private tintActor(charge: number, sealed: number): void {
    const k = Math.min(1, 0.2 + charge * 0.6) * (1 - sealed * 0.5);
    if (this.actor) this.actor.tint = mix(this.look.cold, this.look.warm, k);
  }

  private drawHalo(b: { x: number; head: number }): void {
    const g = this.halo.clear();
    const k = this.haloK;
    if (k <= 0.01) return;
    for (let i = 0; i < 12; i++) {
      const a = this.t * 0.35 + (i / 12) * Math.PI * 2;
      const r2 = (i % 2 ? 44 : 60) * k;
      g.poly([
        b.x + Math.cos(a - 0.06) * 13, b.head + Math.sin(a - 0.06) * 13,
        b.x + Math.cos(a) * r2, b.head + Math.sin(a) * r2,
        b.x + Math.cos(a + 0.06) * 13, b.head + Math.sin(a + 0.06) * 13,
      ]).fill({ color: i % 2 ? this.look.glow : this.look.core, alpha: 0.17 * k });
    }
    g.circle(b.x, b.head, 21 * k).stroke({ width: 1, color: this.look.core, alpha: 0.45 * k });
  }

  private drawFog(dt: number, sealed: number): void {
    const back = this.fogBack.clear();
    const front = this.fogFront.clear();
    const thick = 1 + sealed * 1.6;
    for (const f of this.fog) {
      f.x += f.v * dt;
      if (f.x > W + 80) f.x = -80;
      if (f.x < -80) f.x = W + 80;
      (f.front ? front : back).ellipse(f.x, f.y, f.rx, f.ry).fill({ color: this.look.mist, alpha: f.a * thick * (f.front ? 0.8 : 1) });
    }
  }

  private drawMotes(dt: number): void {
    const g = this.sparks.clear();
    this.motes = this.motes.filter((m) => (m.life -= dt) > 0 && !(m.g && m.vy > 0 && m.y > FOOT + 2));
    for (const m of this.motes) {
      m.vy += m.g * dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      const u = m.life / m.max;
      const a = Math.min(1, u * 1.5) * Math.min(1, (1 - u) * 6);
      g.rect(Math.round(m.x), Math.round(m.y), m.size, m.size).fill({ color: m.color, alpha: a });
    }
  }

  private drawRings(dt: number): void {
    const g = this.rings.clear();
    this.ringList = this.ringList.filter((r) => (r.life -= dt) > 0);
    for (const r of this.ringList) {
      const u = 1 - r.life / r.max;
      const rad = r.r + u * r.grow;
      g.ellipse(r.x, r.y, rad, rad * r.flat).stroke({ width: r.width, color: r.color, alpha: (1 - u) * 0.8 });
    }
  }

  private drawRubble(dt: number): void {
    const g = this.rubble.clear();
    for (const c of this.chunks) {
      if (!c.rest) {
        c.vy += 520 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.spin += c.vs * dt;
        if (c.y >= c.ground && c.vy > 0) {
          c.y = c.ground;
          if (c.vy < 70) c.rest = true;
          else {
            c.vy *= -0.35;
            c.vx *= 0.5;
            c.vs *= 0.5;
          }
        }
      }
      const flip = Math.floor(c.spin / (Math.PI / 2)) % 2 !== 0;
      const w = flip ? c.h : c.w;
      const h = flip ? c.w : c.h;
      const x = Math.round((c.x - w / 2) / ZOOM) * ZOOM;
      const y = Math.round((c.y - h) / ZOOM) * ZOOM;
      g.rect(x - 1, y - 1, w + 2, h + 2).fill({ color: 0x0A0608 });
      g.rect(x, y, w, h).fill({ color: c.color });
    }
  }

  private drawVignette(): void {
    const g = this.vignette;
    for (let i = 0; i < 14; i++) {
      const inset = i * 5;
      g.rect(inset, inset * 0.6, W - inset * 2, H - inset * 1.2).stroke({ width: 5, color: 0x000000, alpha: 0.12 * (1 - i / 14), alignment: 1 });
    }
  }
}

/** Deterministic 0–1 noise for a cell. */
export function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export function mix(a: number, b: number, k: number): number {
  const ch = (s: number) => {
    const x = (a >> s) & 255;
    return Math.round(x + (((b >> s) & 255) - x) * Math.max(0, Math.min(1, k))) << s;
  };
  return ch(16) | ch(8) | ch(0);
}

/** A jagged lightning bolt from (x0, y0) to (x1, y1). */
export function bolt(g: Graphics, x0: number, y0: number, x1: number, y1: number, color: number, core: number, alpha = 1, seed = 0): void {
  const n = 8;
  const pts: number[] = [x0, y0];
  for (let i = 1; i < n; i++) {
    const u = i / n;
    pts.push(x0 + (x1 - x0) * u + (hash(i, seed) - 0.5) * 22, y0 + (y1 - y0) * u);
  }
  pts.push(x1, y1);
  g.poly(pts, false).stroke({ width: 5, color, alpha: 0.35 * alpha });
  g.poly(pts, false).stroke({ width: 2, color, alpha });
  g.poly(pts, false).stroke({ width: 1, color: core, alpha });
}
