import { BlurFilter, ColorMatrixFilter, Container, Graphics, Rectangle, Sprite, Texture, type Filter } from 'pixi.js';
import { AdvancedBloomFilter } from 'pixi-filters/advanced-bloom';
import { MotionBlurFilter } from 'pixi-filters/motion-blur';
import { ShockwaveFilter } from 'pixi-filters/shockwave';
import { ZoomBlurFilter } from 'pixi-filters/zoom-blur';
import { BATTLE_MAPS } from './battleMaps';
import { stamp } from './fxAtlas';
import type { SceneLight } from './sceneLight';

/**
 * ULTRA graphics: everything the setting adds on top of QUALITY's look, owned in one place so GameEngine only
 * forwards scene changes, impacts and per-frame updates. Nothing here exists until ULTRA is first switched on.
 *
 * - Scene finish (on the screen-fixed scene host): contrast/saturation grade, vignette, bloom, and impact
 *   distortion: a zoom blur and shockwave ripple centred on heavy hits. Every filter in that chain keeps
 *   antialias 'on', so Pixi renders the scene into a multisampled texture (live MSAA).
 * - Depth of field: a light blur on the background painting, so the fighters read in front of it.
 * - Ambience per map (embers, fog, fireflies, rain…) behind and in front of the fighters, and god rays from the
 *   background's key light on maps whose art has light shafts.
 * - Motion blur on the knight and monsters while they move fast, and smooth (noise) camera shake.
 */

type MapId = keyof typeof BATTLE_MAPS;
type Kind = 'ember' | 'ash' | 'mote' | 'firefly' | 'leaf' | 'drip' | 'rain' | 'void' | 'fog';

interface Emitter {
  kind: Kind;
  n: number;
  color: number;
  front?: boolean; // in front of the fighters (effects layer), else just over the background
}

interface Ambience {
  emitters: Emitter[];
  rays?: boolean;
}

/** What drifts through each map. Rays only where the painting already has light shafts or a strong source. */
const AMBIENCE: Record<MapId, Ambience> = {
  BELFRY_RAMPARTS: { emitters: [{ kind: 'rain', n: 70, color: 0xb8b4e8, front: true }, { kind: 'fog', n: 4, color: 0x6a5e9a }] },
  BLOOD_CEMETERY: { emitters: [{ kind: 'fog', n: 6, color: 0x8a7fa8 }, { kind: 'fog', n: 3, color: 0x6e6488, front: true }, { kind: 'mote', n: 14, color: 0xff6a5a }] },
  CATHEDRAL_CRYPT: { emitters: [{ kind: 'mote', n: 28, color: 0xe8e2c8 }, { kind: 'fog', n: 3, color: 0x4a5058 }], rays: true },
  CATHEDRAL_VAULT: { emitters: [{ kind: 'mote', n: 30, color: 0xe6e8f0 }, { kind: 'fog', n: 3, color: 0x50545c }], rays: true },
  DARK_FOREST: { emitters: [{ kind: 'firefly', n: 16, color: 0x7affd8 }, { kind: 'fog', n: 5, color: 0x3c6a5a }, { kind: 'fog', n: 2, color: 0x2e5448, front: true }] },
  ELDRITCH_ALTAR: { emitters: [{ kind: 'void', n: 30, color: 0xb070ff }, { kind: 'ember', n: 10, color: 0xd28cff }] },
  GUILD_HALL: { emitters: [{ kind: 'mote', n: 24, color: 0xffd9a0 }, { kind: 'ember', n: 6, color: 0xff9a40 }], rays: true },
  OBSIDIAN_THRONE: { emitters: [{ kind: 'ash', n: 26, color: 0x8c8696 }, { kind: 'ember', n: 10, color: 0xff7a3a }, { kind: 'fog', n: 3, color: 0x3a3848 }] },
  SUNKEN_CISTERN: { emitters: [{ kind: 'drip', n: 9, color: 0x9af0ff }, { kind: 'mote', n: 16, color: 0x7ae8e0 }, { kind: 'fog', n: 4, color: 0x2e6a6e }] },
  TOWN_NIGHT: { emitters: [{ kind: 'fog', n: 5, color: 0x4a5a5a }, { kind: 'firefly', n: 8, color: 0xffe08a }] },
  TOWN_SQUARE: { emitters: [{ kind: 'mote', n: 20, color: 0xffd08a }, { kind: 'leaf', n: 5, color: 0xb0743a }], rays: true },
  VERDANT_FOREST: { emitters: [{ kind: 'leaf', n: 10, color: 0x6cb83c }, { kind: 'mote', n: 22, color: 0xfff4b0 }], rays: true },
  VOLCANIC_FORGE: { emitters: [{ kind: 'ember', n: 42, color: 0xff8a2a }, { kind: 'ash', n: 12, color: 0x6a5a58 }] },
};
const DEFAULT_AMBIENCE: Ambience = { emitters: [{ kind: 'mote', n: 18, color: 0xd8d8e8 }] };

/** Battlefield area particles live in (the camera can pan/zoom a little past the 426x240 stage). */
const AREA = { x0: -30, x1: 456, y0: -20, y1: 250 };

interface Particle {
  e: Emitter;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  seed: number;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** Smooth 1D noise from three incommensurate sines, in about [-1, 1]. */
const wave = (t: number, s: number) => (Math.sin(t * 1.0 + s) * 0.5 + Math.sin(t * 1.73 + s * 2.1) * 0.3 + Math.sin(t * 2.91 + s * 3.7) * 0.2);

/** Vignette: transparent centre darkening toward the corners, stretched over the 426x240 stage. */
function vignetteTexture(): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 213;
  canvas.height = 120;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(1, 120 / 213); // a circle in the square becomes an ellipse fitted to the 16:9 frame
  const g = ctx.createRadialGradient(106.5, 106.5, 50, 106.5, 106.5, 132);
  g.addColorStop(0, 'rgba(8,6,16,0)');
  g.addColorStop(0.55, 'rgba(8,6,16,0.18)');
  g.addColorStop(1, 'rgba(8,6,16,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 213, 213);
  const tex = Texture.from(canvas);
  tex.source.scaleMode = 'linear';
  return tex;
}

export interface UltraStage {
  /** Untransformed, screen-sized host of the camera-moved scene. */
  sceneHost: Container;
  /** The camera-moved scene: background, fighters, effects. */
  rootStage: Container;
  bgLayer: Container;
  effectsLayer: Container;
}

export class UltraFx {
  private on = false;
  private resolution = 1;

  private grade: ColorMatrixFilter | null = null;
  private bloom: AdvancedBloomFilter | null = null;
  private vignette: Sprite | null = null;
  private dof: BlurFilter | null = null;

  private zoom: ZoomBlurFilter | null = null;
  private zoomLeft = 0;
  private zoomPeak = 0;
  private shock: ShockwaveFilter | null = null;
  private shockLeft = 0;
  private chainKey = '';

  private back: Container | null = null;
  private backNormal = new Graphics();
  private backAdd = new Graphics();
  private front: Container | null = null;
  private frontNormal = new Graphics();
  private frontAdd = new Graphics();
  private ambience: Ambience = DEFAULT_AMBIENCE;
  private light: SceneLight | null = null;
  private particles: Particle[] = [];
  private time = 0;

  private blurs = new Map<Container, { f: MotionBlurFilter; prev: { x: number; y: number } | null; vx: number; vy: number; speed: number }>();
  private shakeT = 0;

  constructor(private stage: UltraStage) {
    this.backAdd.blendMode = 'add';
    this.frontAdd.blendMode = 'add';
  }

  get enabled(): boolean {
    return this.on;
  }

  /** Turns ULTRA's extras on or off; `resolution` is the renderer's, for kernels measured in backbuffer texels. */
  setEnabled(on: boolean, resolution: number): void {
    this.on = on;
    this.resolution = resolution;
    const { sceneHost, rootStage, bgLayer, effectsLayer } = this.stage;
    if (on) {
      this.build();
      this.bloom!.pixelSize = resolution;
      sceneHost.filterArea = new Rectangle(0, 0, 426, 240);
      if (!this.back!.parent) rootStage.addChildAt(this.back!, rootStage.getChildIndex(bgLayer) + 1);
      if (!this.front!.parent) effectsLayer.addChildAt(this.front!, 0); // under the flash overlay and every effect
      bgLayer.filters = [this.dof!];
    } else {
      this.back?.removeFromParent();
      this.front?.removeFromParent();
      bgLayer.filters = [];
      for (const [c, b] of this.blurs) this.dropBlur(c, b.f);
      this.blurs.clear();
      this.zoomLeft = this.shockLeft = 0;
    }
    if (this.vignette) this.vignette.visible = on;
    this.chainKey = '';
    this.syncChain();
  }

  private build(): void {
    if (this.grade) return;
    const aa = <T extends Filter>(f: T): T => {
      f.resolution = 'inherit'; // filters default to resolution 1, which would drop the scene to 426x240
      f.antialias = 'on';
      return f;
    };
    this.grade = aa(new ColorMatrixFilter());
    this.grade.contrast(0.12, false);
    this.grade.saturate(0.15, true);
    this.bloom = aa(new AdvancedBloomFilter({ threshold: 0.8, bloomScale: 1.5, brightness: 1, blur: 4, quality: 4 }));
    this.zoom = aa(new ZoomBlurFilter({ strength: 0, innerRadius: 50, radius: -1 }));
    this.shock = aa(new ShockwaveFilter({ amplitude: 10, wavelength: 46, speed: 420, brightness: 1.08, radius: 150 }));
    this.dof = new BlurFilter({ strength: 0.35, quality: 3 });
    this.dof.resolution = 'inherit';
    this.vignette = new Sprite(vignetteTexture());
    this.vignette.width = 426;
    this.vignette.height = 240;
    this.stage.sceneHost.addChild(this.vignette); // screen-fixed: the host isn't moved by the camera
    this.back = new Container();
    this.back.addChild(this.backNormal, this.backAdd);
    this.front = new Container();
    this.front.addChild(this.frontNormal, this.frontAdd);
  }

  /** Scene-host filters for the current state: impact passes come and go between the grade and the bloom. */
  private syncChain(): void {
    const zoom = this.on && this.zoomLeft > 0;
    const shock = this.on && this.shockLeft > 0;
    const key = `${this.on}${zoom}${shock}`;
    if (key === this.chainKey) return;
    this.chainKey = key;
    this.stage.sceneHost.filters = this.on
      ? [this.grade!, ...(zoom ? [this.zoom!] : []), ...(shock ? [this.shock!] : []), this.bloom!]
      : [];
  }

  /** New background: its map's ambience, lit by its key light. `bgUrl` is the BATTLE_MAPS url. */
  setScene(bgUrl: string | null, light: SceneLight): void {
    const id = (Object.keys(BATTLE_MAPS) as MapId[]).find((k) => BATTLE_MAPS[k] === bgUrl);
    this.ambience = id ? AMBIENCE[id] : DEFAULT_AMBIENCE;
    this.light = light;
    this.particles = [];
    for (const e of this.ambience.emitters) {
      for (let i = 0; i < e.n; i++) this.particles.push(this.spawn(e, true));
    }
  }

  /**
   * A hit at stage point (x, y), by `weight` (its hit-stop frames): 4–5 get a zoom blur toward it, 6+ a shockwave
   * ripple instead. Never both: chained together they fold the ripple's centre into a black blot.
   */
  impact(x: number, y: number, weight: number): void {
    if (!this.on || weight < 4) return;
    if (weight < 6) {
      if (this.shockLeft > 0) return; // a ripple is already running
      this.zoom!.center = { x, y };
      this.zoomPeak = Math.min(0.05, 0.01 * weight);
      this.zoomLeft = 10;
    } else {
      this.zoomLeft = 0;
      this.shock!.center = { x, y };
      this.shock!.amplitude = Math.min(12, 1.3 * weight);
      // Start with the ring already wider than its half-wavelength: smaller, it folds its centre into a dark blot
      this.shock!.time = (this.shock!.wavelength * 0.6) / this.shock!.speed;
      this.shockLeft = 24;
    }
    this.syncChain();
  }

  /** Camera shake offset for `intensity`: rolling noise instead of a fresh random jolt every frame. */
  shake(intensity: number, delta: number): { x: number; y: number } {
    this.shakeT += delta * 1.15;
    return { x: wave(this.shakeT, 0.3) * intensity, y: wave(this.shakeT * 1.07, 5.1) * intensity };
  }

  /**
   * Motion blur for fast movers. `body` is what's measured (its position in the battlefield, so camera moves don't
   * count), `host` gets the filter. Returns the measured speed in battlefield px/frame.
   */
  track(host: Container, body: Container, delta: number): number {
    if (!this.on || host.destroyed || body.destroyed) return 0;
    const p = this.stage.rootStage.toLocal(body.getGlobalPosition());
    let b = this.blurs.get(host);
    if (!b) {
      const f = new MotionBlurFilter({ velocity: { x: 0, y: 0 }, kernelSize: 15, offset: 0 });
      f.resolution = 'inherit';
      b = { f, prev: null, vx: 0, vy: 0, speed: 0 };
      this.blurs.set(host, b);
    }
    const d = Math.max(0.5, delta);
    const tx = b.prev ? (p.x - b.prev.x) / d : 0;
    const ty = b.prev ? (p.y - b.prev.y) / d : 0;
    b.prev = { x: p.x, y: p.y };
    // Ease toward the measured velocity (teleports and snaps would otherwise smear for a frame)
    const jump = Math.hypot(tx, ty) > 40;
    b.vx += ((jump ? 0 : tx) - b.vx) * 0.5;
    b.vy += ((jump ? 0 : ty) - b.vy) * 0.5;
    b.speed = Math.hypot(b.vx, b.vy);
    const blurring = host.filters?.includes(b.f) ?? false;
    if (b.speed > 2.2) {
      // A short smear (stage px): about half a frame's travel, capped so leaps and dashes don't streak
      const len = Math.min(8, b.speed * 0.5);
      b.f.velocity = { x: (b.vx / b.speed) * len, y: (b.vy / b.speed) * len };
      if (!blurring) host.filters = [...(host.filters ?? []), b.f];
    } else if (blurring && b.speed < 1.2) this.dropBlur(host, b.f);
    return b.speed;
  }

  /** The bloom keeps its last frame's (pooled) glow texture bound: let go of it before the engine empties the pool. */
  releasePooledTextures(): void {
    if (this.bloom) this.bloom.resources.uMapTexture = Texture.EMPTY.source;
  }

  /** Forget a mover (its container is going away). */
  untrack(host: Container): void {
    const b = this.blurs.get(host);
    if (!b) return;
    if (!host.destroyed) this.dropBlur(host, b.f);
    b.f.destroy();
    this.blurs.delete(host);
  }

  private dropBlur(host: Container, f: MotionBlurFilter): void {
    if (host.destroyed) return;
    host.filters = (host.filters ?? []).filter((x) => x !== f);
  }

  /** Per frame. `frozen` during hit-stop: ambience holds still, the impact ripple keeps going. */
  update(delta: number, frozen: boolean): void {
    if (!this.on) return;
    if (this.zoomLeft > 0) {
      this.zoomLeft = Math.max(0, this.zoomLeft - delta);
      this.zoom!.strength = this.zoomPeak * (this.zoomLeft / 10) ** 2;
    }
    if (this.shockLeft > 0) {
      this.shockLeft = Math.max(0, this.shockLeft - delta);
      this.shock!.time += delta / 60;
    }
    this.syncChain();
    if (!frozen) this.time += delta;
    this.drawAmbience(frozen ? 0 : delta);
  }

  private spawn(e: Emitter, anywhere: boolean): Particle {
    const p: Particle = { e, x: rnd(AREA.x0, AREA.x1), y: rnd(AREA.y0, AREA.y1), vx: 0, vy: 0, age: 0, life: rnd(180, 420), size: 1, seed: Math.random() * 100 };
    switch (e.kind) {
      case 'ember':
        p.y = anywhere ? rnd(40, 250) : rnd(200, 260);
        p.vy = -rnd(0.35, 0.9);
        p.size = rnd(1.2, 2.6);
        p.life = rnd(140, 300);
        break;
      case 'void':
        p.y = anywhere ? rnd(30, 240) : rnd(190, 250);
        p.vy = -rnd(0.15, 0.4);
        p.size = rnd(1.2, 2.4);
        break;
      case 'ash':
        p.y = anywhere ? p.y : -10;
        p.vy = rnd(0.15, 0.4);
        p.vx = rnd(-0.15, 0.25);
        p.size = rnd(1, 2);
        p.life = 900;
        break;
      case 'leaf':
        p.y = anywhere ? p.y : -12;
        p.vy = rnd(0.25, 0.5);
        p.vx = rnd(0.1, 0.45);
        p.size = rnd(4, 6);
        p.life = 900;
        break;
      case 'mote':
        p.vx = rnd(-0.08, 0.08);
        p.vy = rnd(-0.1, 0.03);
        p.size = rnd(1, 2.2);
        break;
      case 'firefly':
        p.y = rnd(60, 220);
        p.size = rnd(1.4, 2.4);
        p.life = rnd(300, 600);
        break;
      case 'drip':
        p.y = anywhere ? rnd(-10, 160) : rnd(-20, 0);
        p.vy = rnd(1.5, 2.5);
        p.life = 900;
        break;
      case 'rain':
        p.y = anywhere ? p.y : rnd(-40, -5);
        p.vy = rnd(6, 8);
        p.vx = -p.vy * 0.28;
        p.life = 900;
        break;
      case 'fog':
        p.y = rnd(140, 215);
        p.vx = rnd(0.08, 0.22) * (Math.random() < 0.5 ? -1 : 1);
        p.size = rnd(90, 150);
        p.life = rnd(600, 1100);
        break;
    }
    if (anywhere) p.age = rnd(0, p.life * 0.8);
    return p;
  }

  private drawAmbience(delta: number): void {
    for (const g of [this.backNormal, this.backAdd, this.frontNormal, this.frontAdd]) g.clear();
    if (this.ambience.rays && this.light) this.drawRays();
    const t = this.time;
    for (let i = 0; i < this.particles.length; i++) {
      let p = this.particles[i];
      p.age += delta;
      const floor = 215;
      if (p.e.kind === 'firefly') {
        p.vx = wave(t * 0.02, p.seed) * 0.35;
        p.vy = wave(t * 0.017, p.seed + 9) * 0.25;
      } else if (p.e.kind === 'ember' || p.e.kind === 'void') p.vx = wave(t * 0.03, p.seed) * 0.25;
      else if (p.e.kind === 'leaf' || p.e.kind === 'ash') p.vx += wave(t * 0.02, p.seed) * 0.004;
      else if (p.e.kind === 'drip') p.vy += 0.06 * delta;
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      const out = p.x < AREA.x0 - 80 || p.x > AREA.x1 + 80 || p.y < AREA.y0 - 20 || p.y > AREA.y1 + 20;
      if (p.age > p.life || out || (p.e.kind === 'drip' && p.y > floor)) {
        if (p.e.kind === 'drip' && p.y > floor) this.splash(p.x, floor, p.e.color, p.e.front);
        p = this.particles[i] = this.spawn(p.e, false);
      }
      // Fade in and out over each life (falling kinds just leave the frame)
      const u = p.age / p.life;
      const fade = Math.min(1, u * 6, (1 - u) * 6);
      this.drawParticle(p, fade, t);
    }
  }

  private drawParticle(p: Particle, fade: number, t: number): void {
    const add = p.e.front ? this.frontAdd : this.backAdd;
    const normal = p.e.front ? this.frontNormal : this.backNormal;
    const c = p.e.color;
    const s = p.size;
    switch (p.e.kind) {
      case 'ember': {
        const flick = 0.6 + 0.4 * Math.sin(t * 0.4 + p.seed * 5);
        if (!stamp(add, 'bloom', p.x, p.y, s * 9, s * 9, { tint: c, alpha: 0.7 * fade * flick })) add.circle(p.x, p.y, s * 2.5).fill({ color: c, alpha: 0.3 * fade });
        add.circle(p.x, p.y, s * 0.8).fill({ color: 0xfff0c0, alpha: fade * flick });
        break;
      }
      case 'void':
        if (!stamp(add, 'bloom', p.x, p.y, s * 10, s * 10, { tint: c, alpha: 0.6 * fade })) add.circle(p.x, p.y, s * 2.5).fill({ color: c, alpha: 0.3 * fade });
        add.circle(p.x, p.y, s * 0.75).fill({ color: 0xf0d8ff, alpha: fade });
        break;
      case 'mote': {
        const tw = 0.5 + 0.5 * Math.sin(t * 0.05 + p.seed * 3);
        add.circle(p.x, p.y, s * 0.7).fill({ color: c, alpha: 0.85 * fade * tw });
        stamp(add, 'bloom', p.x, p.y, s * 7, s * 7, { tint: c, alpha: 0.4 * fade * tw });
        break;
      }
      case 'firefly': {
        const pulse = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.03 + p.seed * 7)) ** 3; // a dim glow between brighter blinks
        if (!stamp(add, 'bloom', p.x, p.y, s * 14, s * 14, { tint: c, alpha: 0.9 * fade * pulse })) add.circle(p.x, p.y, s * 4).fill({ color: c, alpha: 0.35 * fade * pulse });
        add.circle(p.x, p.y, s * 0.8).fill({ color: 0xffffff, alpha: fade * (0.35 + 0.65 * pulse) });
        break;
      }
      case 'ash':
        normal.rect(p.x, p.y, s * 1.3, s).fill({ color: c, alpha: 0.8 * fade });
        break;
      case 'leaf': {
        const rot = t * 0.04 + p.seed;
        const flip = Math.abs(Math.sin(t * 0.05 + p.seed)) * 0.7 + 0.3;
        if (!stamp(normal, 'leaf.body', p.x, p.y, s * flip, s, { tint: c, rot, alpha: 0.9 * fade }))
          normal.ellipse(p.x, p.y, s * 0.5 * flip, s * 0.3).fill({ color: c, alpha: 0.8 * fade });
        else stamp(normal, 'leaf.core', p.x, p.y, s * flip, s, { tint: 0xd8f0a0, rot, alpha: 0.5 * fade });
        break;
      }
      case 'drip':
        if (!stamp(add, 'streak', p.x, p.y, 8, 1.4, { tint: c, rot: Math.PI / 2, alpha: 0.6 }))
          add.rect(p.x - 0.5, p.y - 4, 1, 6).fill({ color: c, alpha: 0.5 });
        break;
      case 'rain':
        add.moveTo(p.x, p.y).lineTo(p.x - p.vx * 2, p.y - p.vy * 2).stroke({ width: 0.9, color: c, alpha: 0.35 });
        break;
      case 'fog': {
        const name = p.seed > 50 ? 'mist0' : 'mist1';
        if (!stamp(normal, name, p.x, p.y, s, s * 0.32, { tint: c, alpha: 0.32 * fade }))
          normal.ellipse(p.x, p.y, s * 0.5, s * 0.12).fill({ color: c, alpha: 0.1 * fade });
        break;
      }
    }
  }

  /** Short-lived splash ring where a drip lands (drawn on the frame it lands; the ring is the next drip's spawn). */
  private splash(x: number, y: number, color: number, front?: boolean): void {
    const g = front ? this.frontAdd : this.backAdd;
    g.ellipse(x, y, 4, 1.2).stroke({ width: 0.8, color, alpha: 0.6 });
  }

  /** Slow, breathing shafts from the key light toward the fighters' floor. */
  private drawRays(): void {
    const l = this.light!;
    const lx = l.x * 426;
    const ly = Math.min(l.y * 240, 60) - 30;
    const t = this.time;
    for (let k = 0; k < 4; k++) {
      const tx = 120 + k * 70 + Math.sin(t * 0.004 + k * 2) * 10;
      const ty = 215;
      const ang = Math.atan2(ty - ly, tx - lx);
      const len = Math.hypot(tx - lx, ty - ly) * 1.1;
      const breathe = 0.6 + 0.4 * Math.sin(t * 0.012 + k * 1.7);
      const mx = lx + Math.cos(ang) * len * 0.5;
      const my = ly + Math.sin(ang) * len * 0.5;
      const w = 26 + k * 8;
      if (!stamp(this.backAdd, 'beam', mx, my, len, w, { rot: ang, tint: l.color, alpha: 0.26 * breathe }))
        this.backAdd.poly([lx - 3, ly, lx + 3, ly, tx + w / 2, ty, tx - w / 2, ty]).fill({ color: l.color, alpha: 0.04 * breathe });
    }
  }

  destroy(): void {
    for (const [, b] of this.blurs) b.f.destroy();
    this.blurs.clear();
    this.grade?.destroy();
    this.bloom?.destroy();
    this.zoom?.destroy();
    this.shock?.destroy();
    this.dof?.destroy();
    this.back?.destroy({ children: true });
    this.front?.destroy({ children: true });
  }
}
