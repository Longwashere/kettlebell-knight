import { Container, Graphics, Sprite, Texture, type Ticker } from 'pixi.js';
import { audioManager } from '../../shared/AudioManager';
import type { StoneHost } from './excalibellStone';

/**
 * The Pallbearer's Grave (src/shared/secretTrials.ts `dead_weight`), staged as a full-screen hero shot like the
 * Excalibell stone: the cemetery dimmed to a crimson night, a coffin standing in an open grave bound by iron
 * chains to two stakes, and an eclipse turning the moon to blood as the clock runs (setClock). Deadlifts haul the
 * coffin up out of the earth (setProgress) and light the cracks in its lid; pull() snaps the chains, bursts the
 * coffin in a cloud of bats and launches the Dead Weight into the sky, then lets it sink head-up into a crimson
 * halo and the knight's hand; reject() drags the coffin back under as the moon turns red.
 *
 * Coordinates are screen pixels (the engine's UI layer, 426×240); the grave itself is painted at 1× inside a
 * box shown at ZOOM, so it keeps the chunky pixels of the stone.
 */
const W = 426;
const H = 240;
const CX = 213;
const FOOT = 200; // the grave's mouth, on the cemetery path
const ZOOM = 2;
const COFFIN_H = 34; // art px, standing
const REST_TOP = -9; // coffin top at rest (art px above the ground): most of it is still in the earth
const HAUL = 17; // how far the deadlifts raise it before the chains give
const ACTOR_X = CX - 84;
const ACTOR_SCALE = 1.6;

// Win choreography (seconds into pull()), matching the stone's beats
const STRAIN = 1.0;
const LAUNCH = 0.22;
const AWAY = 0.55;
const DESCEND = 2.6;
const CLAIM = 0.7;
const SKY_Y = -110;
const HELD_Y = 72;
/** Seconds from pull() until the Dead Weight is in the knight's hand. */
export const DEAD_WEIGHT_PULL_SECONDS = STRAIN + LAUNCH + AWAY + DESCEND + CLAIM;

const NIGHT = 0x07030A;
const BLOOD_NIGHT = 0x1A0308;
const CRIMSON = 0xE11D48;
const BLOOD = 0x9F1239;
const PALE = 0xFFE4E6;
/**
 * Painted over the moon in the Blood Cemetery backdrop (blood_cemetery.webp, drawn 42px up: its disc spans
 * x 168–258 down to y≈31 on screen), a little larger so none of the original shows: centre and radius in px.
 */
const MOON = { x: 213, y: 26, r: 48 };
/** Its darker seas, as offsets from the centre. */
const MARIA: [number, number, number][] = [[-14, -8, 9], [12, 6, 8], [2, -20, 5], [-10, 16, 7], [22, -12, 4], [-26, 4, 4]];
const MOON_PALE = 0xE9E2DA;
const MOON_RED = 0xB91C1C;
const MIST = 0x9F8A9A;
const INK = 0x0C0507;
const WOOD = [0x1E0E0A, 0x3A1C12, 0x55291A, 0x6E3A24, 0x8A4E30];
const IRON = [0x111317, 0x2A2E35, 0x4B515B, 0x737B86, 0xA3ABB5];
const SOIL = [0x140B08, 0x23140D, 0x352015, 0x4A2E1E, 0x5E3D28];
const GRAVE_STONE = [0x16181C, 0x2B2F36, 0x434852, 0x5F6570, 0x80868F];
const NIGHT_TINT = 0x6A6080;
const BLOOD_TINT = 0xD08A92;

interface Mote { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: number; g: number }
interface Ring { r: number; life: number; max: number; big: boolean }
interface Fog { x: number; y: number; rx: number; ry: number; v: number; a: number; front: boolean }
interface Bat { x: number; y: number; vx: number; vy: number; flap: number; life: number; s: number }
interface Chunk { x: number; y: number; vx: number; vy: number; w: number; h: number; color: number; spin: number; vs: number; ground: number; rest: boolean }
interface HeadPos { x: number; y: number; head: number }

export class DeadWeightGrave {
  readonly view = new Container();
  private dim = new Graphics();
  private moonGlow = new Graphics();
  private moon = new Graphics();
  private moonShade = new Graphics();
  private moonMask = new Graphics();
  private fogBack = new Graphics();
  private halo = new Graphics();
  private weapon: Sprite | null = null;
  private weaponInFront = false;
  private actorLayer = new Container();
  private actor: Container | null = null;
  private box = new Container(); // the grave at 1×, shown at ZOOM
  private backdrop = new Graphics(); // mound, headstones, stakes
  private coffinBox = new Container();
  private coffin = new Graphics();
  private cracks = new Graphics();
  private coffinMask = new Graphics();
  private lip = new Graphics(); // the grave's front edge, over the coffin's foot
  private chains = new Graphics();
  private rubble = new Graphics();
  private batsG = new Graphics();
  private fogFront = new Graphics();
  private sparks = new Graphics();
  private rings = new Graphics();
  private vignette = new Graphics();
  private flashG = new Graphics();
  private motes: Mote[] = [];
  private ringList: Ring[] = [];
  private fog: Fog[] = [];
  private bats: Bat[] = [];
  private chunks: Chunk[] = [];
  private claimFrom = { x: CX, y: HELD_Y };
  private launchFrom = 0;
  private haloK = 0;
  private progress = 0;
  private shown = 0;
  private clock = 0; // 0–1: how far the eclipse has crept
  private moonK = 0; // eased clock
  private jolt = 0;
  private dimAlpha = 0;
  private flashAlpha = 0;
  private flashColor = PALE;
  private t = 0;
  private phase: 'resting' | 'pulling' | 'claiming' | 'held' | 'sealed' = 'resting';
  private phaseT = 0;
  private burstDone = false;
  private onPulled: (() => void) | null = null;
  private readonly tick = (ticker: Ticker) => this.update(Math.min(0.05, ticker.deltaMS / 1000));

  constructor(weaponTexture: Texture | null, private readonly ticker: Ticker, private readonly host: StoneHost) {
    for (const g of [this.moonGlow, this.halo, this.sparks, this.rings, this.cracks]) g.blendMode = 'add';
    this.drawVignette();
    this.drawBackdrop();
    this.drawCoffin();
    this.drawLip();
    // The coffin only shows above the grave's mouth
    this.coffinMask.rect(-40, -80, 80, 80).fill({ color: 0xFFFFFF });
    this.coffinBox.addChild(this.coffin, this.cracks);
    this.coffinBox.mask = this.coffinMask;
    this.box.addChild(this.backdrop, this.coffinBox, this.coffinMask, this.lip, this.chains);
    this.box.position.set(CX, FOOT);
    this.box.scale.set(ZOOM);
    for (let i = 0; i < 14; i++) {
      this.fog.push({
        x: Math.random() * (W + 120) - 60,
        y: FOOT - 8 + Math.random() * 24,
        rx: 40 + Math.random() * 50,
        ry: 4 + Math.random() * 5,
        v: (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 6),
        a: 0.04 + Math.random() * 0.05,
        front: i % 3 === 0,
      });
    }
    this.moonMask.circle(MOON.x, MOON.y, MOON.r).fill({ color: 0xFFFFFF });
    this.moonShade.mask = this.moonMask;
    this.view.addChild(this.dim, this.moonGlow, this.moon, this.moonShade, this.moonMask, this.fogBack, this.halo);
    if (weaponTexture) {
      // The art lies haft-left, head-right: a quarter turn clockwise stands it head-down in the coffin
      this.weapon = new Sprite(weaponTexture);
      this.weapon.anchor.set(0.5);
      this.weapon.scale.set(ZOOM);
      this.weapon.rotation = Math.PI / 2;
      this.weapon.visible = false;
      this.view.addChild(this.weapon);
    }
    this.view.addChild(this.actorLayer, this.box, this.rubble, this.batsG, this.fogFront, this.sparks, this.rings, this.vignette, this.flashG);
    for (let i = 0; i < 3; i++) this.spawnBat(true);
    this.ticker.add(this.tick);
    this.update(0);
  }

  /** Stages the knight beside the grave at the scene's zoom, lit by the moon. Detach before destroying. */
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

  /** Deadlifts done / needed, 0–1. */
  setProgress(p: number): void {
    this.progress = Math.max(0, Math.min(1, p));
  }

  /** Share of the time limit gone, 0–1: how far the eclipse has turned the moon to blood. */
  setClock(k: number): void {
    this.clock = Math.max(0, Math.min(1, k));
  }

  /** One deadlift: the coffin heaves up a notch, the chains rattle and grave dirt spills. */
  rep(): void {
    if (this.phase !== 'resting') return;
    this.jolt = 1;
    this.ringList.push({ r: 24, life: 0.6, max: 0.6, big: false });
    this.spill(4 + Math.round(this.progress * 6));
    if (Math.random() < 0.25 + this.progress * 0.3) this.spawnBat();
    audioManager.play('rattle', { vol: 0.35, rate: 0.8 + this.progress * 0.5 });
    audioManager.play('thud', { vol: 0.3, rate: 0.9 + this.progress * 0.3 });
    if (this.progress > 0.5) audioManager.play('wood', { vol: 0.15 + (this.progress - 0.5) * 0.4, rate: 0.7 });
  }

  /** The knight wins: the chains strain and snap, the coffin bursts, the Dead Weight flies and returns. */
  pull(onDone?: () => void): void {
    if (this.phase !== 'resting') return;
    this.phase = 'pulling';
    this.phaseT = 0;
    this.progress = 1;
    this.onPulled = onDone ?? null;
    this.host.shake(4);
    const down = STRAIN + LAUNCH + AWAY;
    audioManager.play('quake', { vol: 0.6 });
    audioManager.play('rattle', { vol: 0.8, rate: 0.6 });
    audioManager.play('charge_long', { vol: 0.5, delay: 0.05 });
    audioManager.play('impact_metal', { vol: 0.8, delay: STRAIN - 0.05, rate: 0.7 }); // the chains part
    audioManager.play('wood', { vol: 0.9, delay: STRAIN });
    audioManager.play('explosion', { vol: 0.5, delay: STRAIN, rate: 0.8 });
    audioManager.play('swarm', { vol: 0.7, delay: STRAIN + 0.05 });
    audioManager.play('screech', { vol: 0.5, delay: STRAIN + 0.15, rate: 1.3 });
    audioManager.play('whoosh_heavy', { vol: 0.8, delay: STRAIN, rate: 1.1 });
    audioManager.play('dark', { vol: 0.8, delay: down });
    audioManager.play('wail', { vol: 0.35, delay: down + 0.2, rate: 0.8 });
    audioManager.play('heal', { vol: 0.5, delay: down + DESCEND - 0.2, rate: 0.7 });
  }

  /** The knight fails: the moon runs red, the coffin is dragged back under and the earth closes. */
  reject(): void {
    if (this.phase !== 'resting') return;
    this.phase = 'sealed';
    this.phaseT = 0;
    this.clock = 1;
    this.host.shake(3);
    this.flash(0.35, CRIMSON);
    audioManager.play('quake', { vol: 0.5, rate: 0.7 });
    audioManager.play('rattle', { vol: 0.5, rate: 0.5, delay: 0.1 });
    audioManager.play('dark', { vol: 0.6, delay: 0.2 });
  }

  /** For the dev bridge (window.__kk). */
  debugState() {
    const w = this.weapon;
    return {
      phase: this.phase, progress: this.progress, clock: Number(this.clock.toFixed(2)), bats: this.bats.length,
      weapon: w ? { visible: w.visible, x: Math.round(w.x), y: Math.round(w.y), front: this.weaponInFront } : null,
      visible: this.view.visible && Boolean(this.view.parent?.visible),
    };
  }

  destroy(): void {
    this.ticker.remove(this.tick);
    this.detachActor();
    this.view.destroy({ children: true });
  }

  // --- Frame -------------------------------------------------------------------------------------------

  private update(dt: number): void {
    if (this.view.destroyed) return;
    this.t += dt;
    this.phaseT += dt;
    this.shown += (this.progress - this.shown) * Math.min(1, dt * 6);
    this.moonK += (this.clock - this.moonK) * Math.min(1, dt * 3);
    this.jolt = Math.max(0, this.jolt - dt * 5);

    const sealed = this.phase === 'sealed' ? Math.min(1, this.phaseT / 1.4) : 0;
    const surge = this.phase === 'pulling' ? Math.min(1, this.phaseT / 1.1) : this.phase === 'held' || this.phase === 'claiming' ? 1 : 0;
    const charge = Math.min(1, this.shown + surge); // how hard the coffin is fighting back

    const dimTarget = 0.8 + sealed * 0.08 - surge * 0.08;
    this.dimAlpha += (dimTarget - this.dimAlpha) * Math.min(1, dt * 1.5);
    const night = mix(NIGHT, BLOOD_NIGHT, Math.min(1, this.moonK * 0.8 + sealed * 0.5 + surge * 0.4));
    this.dim.clear().rect(0, 0, W, H).fill({ color: night, alpha: this.dimAlpha });
    const floor = 176;
    for (let y = floor; y < H; y += 4) {
      const k = (y - floor) / (H - floor);
      this.dim.rect(0, y, W, 4).fill({ color: NIGHT, alpha: Math.min(0.9, k * 1.1) * Math.min(1, this.dimAlpha / 0.8) });
    }

    this.drawMoon(sealed);
    this.layoutCoffin(charge, sealed);
    const head = this.layoutWeapon();
    this.tintActor(charge, sealed);
    this.drawCracks(charge, 1 - sealed);
    this.drawChains(charge, sealed);
    this.drawHalo(head);
    this.drawFog(dt, sealed);

    // Bats wheel across the sky; the grave breathes red sparks as it wakes
    if (Math.random() < dt * (0.25 + this.moonK * 0.6)) this.spawnBat();
    if (this.phase === 'resting' && Math.random() < dt * (1 + charge * 10)) this.ember();
    if (this.phase === 'pulling' && this.phaseT < STRAIN && Math.random() < dt * 30) this.ember();
    if (this.haloK > 0 && Math.random() < dt * 10) this.emberAt(head.x, head.head);
    if (this.phase === 'pulling' && !this.burstDone && this.phaseT >= STRAIN) {
      this.burstDone = true;
      this.burst();
    }
    this.drawBats(dt);
    this.drawMotes(dt);
    this.drawRings(dt);
    this.drawRubble(dt);

    this.flashAlpha = Math.max(0, this.flashAlpha - dt * 1.6);
    this.flashG.clear();
    if (this.flashAlpha > 0) this.flashG.rect(0, 0, W, H).fill({ color: this.flashColor, alpha: this.flashAlpha });
  }

  /** The coffin's height in the grave this frame: hauled up by the deadlifts, dragged back down on a fail. */
  private layoutCoffin(charge: number, sealed: number): void {
    let lift = this.shown * HAUL;
    let shake = Math.sin(this.t * 60) * this.jolt;
    if (this.phase === 'pulling' && this.phaseT < STRAIN) {
      lift = HAUL + this.phaseT * 6;
      shake = (Math.random() - 0.5) * 2 * charge;
    } else if (this.phase === 'sealed') {
      lift = this.shown * HAUL * Math.max(0, 1 - this.phaseT * 1.2) - Math.min(14, this.phaseT * 16);
    }
    this.coffinBox.position.set(Math.round(shake), Math.round(-lift - this.jolt * 2));
    this.coffinBox.visible = !this.burstDone;
  }

  /** Places the Dead Weight for this frame; returns its centre and head (where the halo sits). */
  private layoutWeapon(): HeadPos {
    const coffinMid = FOOT + (REST_TOP - HAUL - 6 + COFFIN_H / 2) * ZOOM;
    let x = CX;
    let y = coffinMid;
    let rot = Math.PI / 2;
    let visible = false;
    let front = false;
    if (this.phase === 'pulling') {
      const k = this.phaseT;
      if (k >= STRAIN) {
        visible = true;
        front = true;
        if (k < STRAIN + LAUNCH) {
          // Hurled straight up out of the shattered coffin, haft first
          const u = (k - STRAIN) / LAUNCH;
          this.launchFrom = this.launchFrom || coffinMid;
          y = this.launchFrom + (SKY_Y - this.launchFrom) * u * u;
          rot = Math.PI / 2 + u * Math.PI * 3;
        } else if (k < STRAIN + LAUNCH + AWAY) {
          y = SKY_Y;
          rot = -Math.PI / 2;
        } else {
          // Sinking back down head-up, slowing as it settles
          const u = Math.min(1, (k - STRAIN - LAUNCH - AWAY) / DESCEND);
          const e = 1 - (1 - u) ** 2.5;
          y = SKY_Y + (HELD_Y - SKY_Y) * e + Math.sin(this.t * 1.6) * 2 * u;
          rot = -Math.PI / 2 + Math.sin(this.t * 2.2) * 0.06 * (1 - u);
          this.haloK = e;
          if (u >= 1) {
            this.phase = this.host.handPoint ? 'claiming' : 'held';
            this.phaseT = 0;
            this.claimFrom = { x: CX, y };
            if (this.phase === 'held') this.finishPull();
          }
        }
      }
    } else if (this.phase === 'claiming') {
      // Into the knight's waiting hand, shrinking to his grip
      const hand = this.host.handPoint?.() ?? { x: ACTOR_X + 16, y: FOOT - 48 };
      const u = Math.min(1, this.phaseT / CLAIM);
      const e = u * u * (3 - 2 * u);
      x = this.claimFrom.x + (hand.x - this.claimFrom.x) * e;
      y = this.claimFrom.y + (hand.y - this.claimFrom.y) * e - Math.sin(u * Math.PI) * 18;
      this.haloK = 1 - e * 0.4;
      if (this.weapon) {
        this.weapon.visible = true;
        this.weapon.position.set(Math.round(x), Math.round(y));
        this.weapon.rotation = -Math.PI / 2 + e * 0.5;
        this.weapon.scale.set(ZOOM * (1 - e * 0.35));
        this.weapon.alpha = 1 - Math.max(0, u - 0.8) * 5;
      }
      if (u >= 1) {
        this.phase = 'held';
        this.phaseT = 0;
        if (this.weapon) this.weapon.visible = false;
        this.flash(0.3, CRIMSON);
        this.ringList.push({ r: 10, life: 0.9, max: 0.9, big: true });
        for (let i = 0; i < 30; i++) this.emberAt(hand.x, hand.y, 70);
        audioManager.play('dark', { vol: 0.5, rate: 1.2 });
        this.finishPull();
      }
      return { x, y, head: y };
    } else if (this.phase === 'held') {
      const hand = this.host.handPoint?.();
      if (hand) {
        this.haloK += (0.7 - this.haloK) * 0.05;
        return { x: hand.x, y: hand.y, head: hand.y - 10 };
      }
      y = HELD_Y + Math.sin(this.t * 1.6) * 2;
      rot = -Math.PI / 2;
      visible = true;
      front = true;
      this.haloK = 1;
    }
    const w = this.weapon;
    if (w) {
      w.visible = visible;
      w.position.set(Math.round(x), Math.round(y));
      w.rotation = rot;
      if (front !== this.weaponInFront) {
        this.weaponInFront = front;
        this.view.removeChild(w);
        this.view.addChildAt(w, this.view.getChildIndex(front ? this.fogFront : this.actorLayer) + (front ? 1 : 0));
      }
    }
    // The bell head sits ~20 art-px from the sprite centre along its length
    return { x, y, head: y + Math.sin(rot) * 20 * ZOOM };
  }

  private finishPull(): void {
    const done = this.onPulled;
    this.onPulled = null;
    done?.();
  }

  /** Cold moonlight on the knight and the grave, turning to blood with the eclipse and as the coffin wakes. */
  private tintActor(charge: number, sealed: number): void {
    const k = Math.min(1, 0.2 + this.moonK * 0.4 + charge * 0.35) * (1 - sealed * 0.5);
    const tint = mix(NIGHT_TINT, BLOOD_TINT, k);
    // Only the painted grave takes the light: the seams and chains keep their own glow
    const lit = mix(tint, 0xFFFFFF, 0.3);
    this.backdrop.tint = lit;
    this.coffin.tint = lit;
    this.lip.tint = lit;
    this.rubble.tint = tint;
    if (this.actor) this.actor.tint = tint;
  }

  // --- Sky ---------------------------------------------------------------------------------------------

  /**
   * The moon in the Blood Cemetery backdrop (MOON), painted over as a pale full moon that an eclipse eats from
   * the left as the time runs out: fully blood-red at the deadline. The shadow is masked to the disc.
   */
  private drawMoon(sealed: number): void {
    const k = Math.max(this.moonK, sealed);
    const { x: mx, y: my, r } = MOON;
    const g = this.moon.clear();
    g.circle(mx, my, r + 5).fill({ color: NIGHT, alpha: 0.75 }); // swallows the backdrop moon's rim
    g.circle(mx, my, r + 1).fill({ color: INK, alpha: 0.5 });
    g.circle(mx, my, r).fill({ color: MOON_PALE });
    // Maria and craters, then a lit rim on the upper left
    const dark = mix(MOON_PALE, 0x6B5E5A, 0.35);
    for (const [dx, dy, cr] of MARIA) g.circle(mx + dx, my + dy, cr).fill({ color: dark });
    const a0 = Math.PI * 0.95;
    g.moveTo(mx + Math.cos(a0) * (r - 2), my + Math.sin(a0) * (r - 2))
      .arc(mx, my, r - 2, a0, Math.PI * 1.45)
      .stroke({ width: 2, color: 0xFFFBF5 });
    // The earth's shadow slides in from the left: a soft penumbra, then the blood-red umbra
    const shade = this.moonShade.clear();
    const ux = mx - r * 2.6 + k * r * 2.6; // fully clear of the disc at k = 0
    shade.circle(ux + 6, my, r * 1.25).fill({ color: 0x7F1D1D, alpha: 0.45 });
    shade.circle(ux, my, r * 1.2).fill({ color: MOON_RED, alpha: 0.92 });
    for (const [dx, dy, cr] of MARIA) shade.circle(mx + dx, my + dy, cr).fill({ color: 0x450A0A, alpha: Math.min(1, k * 1.4) * 0.5 });
    const glow = this.moonGlow.clear();
    const pulse = 0.85 + 0.15 * Math.sin(this.t * (1.3 + k * 2));
    for (let i = 6; i >= 1; i--) {
      glow.circle(mx, my, r + i * (4 + k * 4)).fill({ color: mix(0x7F6A6A, BLOOD, k), alpha: (0.03 + k * 0.06) * pulse });
    }
  }

  // --- Grave -------------------------------------------------------------------------------------------

  /** Grave mound, two leaning headstones and the iron stakes the chains are fixed to (grave-local 1× px). */
  private drawBackdrop(): void {
    const g = this.backdrop;
    g.ellipse(0, 1, 52, 6).fill({ color: 0x000000, alpha: 0.55 });
    // Heaped earth behind the grave
    for (let x = -26; x <= 26; x++) {
      const hgt = Math.round(9 * Math.sqrt(Math.max(0, 1 - (x / 26) ** 2)) + (hash(x, 3) - 0.5) * 2);
      for (let y = 0; y < hgt; y++) {
        const top = y === hgt - 1;
        const c = top ? SOIL[0] : y > hgt - 3 ? SOIL[3 + ((x + y) & 1)] : SOIL[1 + (hash(x, y) > 0.6 ? 1 : 0)];
        g.rect(x, -3 - y, 1, 1).fill({ color: c });
      }
    }
    headstone(g, -40, 0, 9, 15, -1);
    headstone(g, 41, 0, 8, 12, 1);
    for (const sx of [-23, 23]) {
      g.rect(sx - 1, -11, 3, 12).fill({ color: IRON[0] });
      g.rect(sx, -10, 1, 10).fill({ color: IRON[2] });
      g.rect(sx - 2, -12, 5, 2).fill({ color: IRON[1] });
      g.rect(sx - 1, -12, 3, 1).fill({ color: IRON[3] });
    }
    // The grave's mouth
    g.ellipse(0, 0, 15, 3).fill({ color: SOIL[0] });
    g.rect(-14, -1, 28, 1).fill({ color: INK });
  }

  /** The coffin, standing: a six-sided box with iron bands and a cross on the lid, its top at REST_TOP. */
  private drawCoffin(): void {
    const g = this.coffin;
    const y0 = REST_TOP; // drawn at rest; the deadlifts move its container
    const shoulder = y0 + 9;
    const foot = y0 + COFFIN_H;
    const outline = [-5, y0, 5, y0, 9, shoulder, 6, foot, -6, foot, -9, shoulder];
    g.poly(outline).fill({ color: WOOD[2] }).stroke({ width: 1, color: INK, alignment: 1 });
    // Light from the moon (upper right): right faces lit, left in shade
    g.poly([0, y0 + 1, 4, y0 + 1, 8, shoulder, 5, foot - 1, 0, foot - 1]).fill({ color: WOOD[3] });
    g.poly([4, y0 + 1, 8, shoulder, 7, shoulder + 2, 4, y0 + 3]).fill({ color: WOOD[4] });
    g.poly([-4, y0 + 1, -8, shoulder, -5, foot - 1, -3, foot - 1, -3, y0 + 1]).fill({ color: WOOD[1] });
    // Planks
    for (let y = y0 + 4; y < foot - 1; y += 5) g.rect(-6, y, 12, 1).fill({ color: WOOD[0], alpha: 0.5 });
    // Iron bands the chains bite into
    for (const by of [shoulder + 2, foot - 8]) {
      g.rect(-9, by, 18, 2).fill({ color: IRON[1] });
      g.rect(-8, by, 16, 1).fill({ color: IRON[3] });
      g.rect(-10, by, 2, 2).fill({ color: IRON[2] });
      g.rect(8, by, 2, 2).fill({ color: IRON[2] });
    }
    // The tarnished cross
    g.rect(-1, y0 + 3, 2, 14).fill({ color: IRON[0] });
    g.rect(-4, y0 + 7, 8, 2).fill({ color: IRON[0] });
    g.rect(0, y0 + 3, 1, 14).fill({ color: IRON[3] });
    g.rect(-4, y0 + 7, 8, 1).fill({ color: IRON[3] });
  }

  /** Front lip of the grave: loose earth heaped over the coffin's foot. */
  private drawLip(): void {
    const g = this.lip;
    for (let x = -16; x <= 16; x++) {
      const hgt = 1 + Math.round(hash(x, 9) * 2 + (Math.abs(x) < 10 ? 1 : 0));
      for (let y = 0; y < hgt; y++) g.rect(x, -y, 1, 1).fill({ color: SOIL[y === hgt - 1 ? 4 : 2 + ((x + y) & 1)] });
    }
  }

  /** Crimson light leaking from the lid's seams and the cross, fiercer with every lift. */
  private drawCracks(charge: number, fade: number): void {
    const g = this.cracks.clear();
    const pulse = 0.6 + 0.4 * Math.sin(this.t * (2 + charge * 6));
    const lit = (0.15 + 0.85 * charge) * pulse * fade;
    if (lit <= 0.02) return;
    const y0 = REST_TOP;
    const color = charge > 0.8 ? PALE : CRIMSON;
    SEAMS.forEach(([x, y, w, h], i) => {
      const a = Math.max(0, Math.min(1, charge * SEAMS.length - i + 1)) * lit;
      if (a > 0.02) g.rect(x, y0 + y, w, h).fill({ color: i % 3 ? CRIMSON : color, alpha: a });
    });
    g.rect(0, y0 + 4, 1, 12).fill({ color: CRIMSON, alpha: lit * 0.8 });
    g.rect(-3, y0 + 7, 6, 1).fill({ color: CRIMSON, alpha: lit * 0.8 });
  }

  /** Two chains from the stakes to the coffin's bands: slack at rest, taut and glowing as it rises. */
  private drawChains(charge: number, sealed: number): void {
    const g = this.chains.clear();
    if (this.burstDone) return;
    const off = this.coffinBox.position;
    const bandY = REST_TOP + 3 + off.y; // hooked under the lid's head, always above ground
    for (const side of [-1, 1]) {
      const x0 = side * 23;
      const y0 = -11;
      const x1 = side * 6 + off.x;
      const y1 = bandY;
      // Slack and drooping at rest, drawn taut as the coffin climbs
      const sag = Math.max(0, 6 * (1 - charge) + sealed * 3);
      const n = 9;
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const x = Math.round(x0 + (x1 - x0) * u);
        const y = Math.min(-2, Math.round(y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * sag + (this.jolt > 0.5 ? (Math.random() - 0.5) : 0)));
        const link = i % 2 === 0;
        g.rect(x - 2, y - 2, 4, 4).fill({ color: INK, alpha: 0.7 });
        g.rect(x - 1, y - (link ? 1 : 0), link ? 2 : 1, link ? 2 : 1).fill({ color: IRON[link ? 4 : 2] });
        if (charge > 0.6) g.rect(x, y, 1, 1).fill({ color: CRIMSON, alpha: (charge - 0.6) * 2 * (0.6 + 0.4 * Math.sin(this.t * 9 + i)) });
      }
    }
  }

  /** A slowly turning crimson corona behind the raised Dead Weight. */
  private drawHalo(b: HeadPos): void {
    const g = this.halo.clear();
    const k = this.haloK;
    if (k <= 0.01) return;
    const spokes = 10;
    for (let i = 0; i < spokes; i++) {
      const a = -this.t * 0.3 + (i / spokes) * Math.PI * 2;
      const r1 = 12;
      const r2 = (i % 2 ? 40 : 58) * k;
      const w = 0.07;
      g.poly([
        b.x + Math.cos(a - w) * r1, b.head + Math.sin(a - w) * r1,
        b.x + Math.cos(a) * r2, b.head + Math.sin(a) * r2,
        b.x + Math.cos(a + w) * r1, b.head + Math.sin(a + w) * r1,
      ]).fill({ color: i % 2 ? BLOOD : CRIMSON, alpha: 0.2 * k });
    }
    g.circle(b.x, b.head, 20 * k).stroke({ width: 1, color: CRIMSON, alpha: 0.5 * k });
    g.circle(b.x, b.head, 25 * k).stroke({ width: 1, color: BLOOD, alpha: 0.3 * k });
  }

  // --- Atmosphere --------------------------------------------------------------------------------------

  private drawFog(dt: number, sealed: number): void {
    const back = this.fogBack.clear();
    const front = this.fogFront.clear();
    const thick = 1 + sealed * 1.6;
    const color = mix(MIST, BLOOD, this.moonK * 0.5);
    for (const f of this.fog) {
      f.x += f.v * dt;
      if (f.x > W + 80) f.x = -80;
      if (f.x < -80) f.x = W + 80;
      (f.front ? front : back).ellipse(f.x, f.y, f.rx, f.ry).fill({ color, alpha: f.a * thick * (f.front ? 0.8 : 1) });
    }
  }

  private spawnBat(anywhere = false): void {
    if (this.bats.length > 60) return;
    const dir = Math.random() < 0.5 ? -1 : 1;
    this.bats.push({
      x: anywhere ? Math.random() * W : dir > 0 ? -10 : W + 10,
      y: 30 + Math.random() * 90,
      vx: dir * (30 + Math.random() * 40),
      vy: (Math.random() - 0.5) * 10,
      flap: Math.random() * 6,
      life: 14,
      s: Math.random() < 0.3 ? 2 : 1,
    });
  }

  private drawBats(dt: number): void {
    const g = this.batsG.clear();
    this.bats = this.bats.filter((b) => (b.life -= dt) > 0 && b.x > -30 && b.x < W + 30 && b.y > -40);
    for (const b of this.bats) {
      b.flap += dt * 18;
      b.x += b.vx * dt;
      b.y += b.vy * dt + Math.sin(b.flap * 0.3) * 0.3;
      const x = Math.round(b.x);
      const y = Math.round(b.y);
      const up = Math.sin(b.flap) > 0;
      const s = b.s;
      // A body and two wings that beat up and down
      g.rect(x - s, y - s, 2 * s, 2 * s).fill({ color: INK });
      g.rect(x - 4 * s, y + (up ? -2 : 1) * s, 3 * s, s).fill({ color: INK });
      g.rect(x + s, y + (up ? -2 : 1) * s, 3 * s, s).fill({ color: INK });
      g.rect(x - 2 * s, y + (up ? -1 : 0) * s, s, s).fill({ color: INK });
      g.rect(x + s, y + (up ? -1 : 0) * s, s, s).fill({ color: INK });
    }
  }

  /** A red ember rising off the grave. */
  private ember(): void {
    this.emberAt(CX + (Math.random() - 0.5) * 50, FOOT - 6 - Math.random() * 40, 0);
  }

  private emberAt(x: number, y: number, speed = 0): void {
    const max = 0.8 + Math.random() * 1.4;
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.7);
    this.motes.push({
      x, y, vx: Math.cos(a) * v + (Math.random() - 0.5) * 6, vy: Math.sin(a) * v - (speed ? 0 : 14 + Math.random() * 30),
      life: max, max, size: Math.random() < 0.25 ? 2 : 1, color: Math.random() < 0.3 ? PALE : CRIMSON, g: 0,
    });
    if (this.motes.length > 180) this.motes.splice(0, this.motes.length - 180);
  }

  /** Grave dirt kicked up by the coffin as it lurches. */
  private spill(n: number): void {
    for (let i = 0; i < n; i++) {
      const max = 0.6 + Math.random() * 0.5;
      this.motes.push({
        x: CX + (Math.random() - 0.5) * 34, y: FOOT - 2, vx: (Math.random() - 0.5) * 50, vy: -(30 + Math.random() * 50),
        life: max, max, size: ZOOM, color: SOIL[2 + (i % 3)], g: 260,
      });
    }
  }

  private drawMotes(dt: number): void {
    const g = this.sparks.clear();
    // Grave dirt lands back on the ground; embers fade out
    this.motes = this.motes.filter((m) => (m.life -= dt) > 0 && !(m.g && m.vy > 0 && m.y > FOOT + 2));
    for (const m of this.motes) {
      m.vy += m.g * dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      const u = m.life / m.max;
      if (m.g) continue; // grave dirt: drawn on the rubble layer
      const a = Math.min(1, u * 1.5) * Math.min(1, (1 - u) * 6);
      g.rect(Math.round(m.x + Math.sin(m.y * 0.15) * 1.5), Math.round(m.y), m.size, m.size).fill({ color: m.color, alpha: a });
    }
  }

  private drawRings(dt: number): void {
    const g = this.rings.clear();
    this.ringList = this.ringList.filter((r) => (r.life -= dt) > 0);
    for (const r of this.ringList) {
      const u = 1 - r.life / r.max;
      const rad = r.r + u * (r.big ? 260 : 60);
      g.ellipse(CX, FOOT - 2, rad, rad * 0.18).stroke({ width: r.big ? 2 : 1, color: r.big ? PALE : CRIMSON, alpha: (1 - u) * (r.big ? 0.9 : 0.6) });
    }
  }

  private flash(a: number, color: number): void {
    this.flashAlpha = a;
    this.flashColor = color;
  }

  /** The chains part and the coffin bursts: planks, links and the lid fly, a cloud of bats pours out. */
  private burst(): void {
    this.flash(0.55, CRIMSON);
    this.host.shake(9);
    this.ringList.push({ r: 20, life: 1.2, max: 1.2, big: true });
    const top = FOOT + (REST_TOP - HAUL - 6) * ZOOM;
    for (let i = 0; i < 40; i++) {
      const x = CX + (Math.random() - 0.5) * 36;
      const y = top + Math.random() * COFFIN_H * ZOOM * 0.7;
      const plank = i < 14;
      const link = !plank && i < 24;
      const w = (plank ? 2 + Math.floor(Math.random() * 5) : 1) * ZOOM;
      const h = (plank ? 1 : 1) * ZOOM;
      this.chunks.push({
        x, y,
        vx: (x - CX) * 4 + (Math.random() - 0.5) * 90,
        vy: -(70 + Math.random() * 170),
        w, h,
        color: link ? IRON[2 + (i % 2)] : plank ? WOOD[2 + (i % 3)] : SOIL[2 + (i % 3)],
        spin: Math.random() * Math.PI, vs: (Math.random() - 0.5) * 20,
        ground: FOOT - 2 - Math.random() * 10, rest: false,
      });
    }
    // The lid, spinning away whole
    this.chunks.push({ x: CX, y: top, vx: 70 + Math.random() * 30, vy: -200, w: 8 * ZOOM, h: 3 * ZOOM, color: WOOD[3], spin: 0, vs: 9, ground: FOOT - 4, rest: false });
    for (let i = 0; i < 26; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const v = 60 + Math.random() * 90;
      this.bats.push({ x: CX + (Math.random() - 0.5) * 16, y: top + 10, vx: Math.cos(a) * v, vy: Math.sin(a) * v, flap: Math.random() * 6, life: 4 + Math.random() * 2, s: Math.random() < 0.4 ? 2 : 1 });
    }
    for (let i = 0; i < 40; i++) this.emberAt(CX, top + 20, 90);
    this.spill(18);
  }

  private drawRubble(dt: number): void {
    const g = this.rubble.clear();
    // Kicked-up grave dirt (gravity motes)
    for (const m of this.motes) {
      if (!m.g) continue;
      g.rect(Math.round(m.x / ZOOM) * ZOOM, Math.round(m.y / ZOOM) * ZOOM, m.size, m.size).fill({ color: m.color });
    }
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
      g.rect(x - 1, y - 1, w + 2, h + 2).fill({ color: INK });
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

/** Seams in the coffin lid that leak light, lit in this order (coffin-local px from its top). */
const SEAMS: [number, number, number, number][] = [
  [-5, 0, 10, 1], [-9, 9, 1, 4], [8, 9, 1, 4], [-3, 18, 1, 5], [2, 22, 4, 1], [-6, 26, 1, 4], [4, 14, 1, 3], [-5, 30, 10, 1],
];

/** A weathered headstone (rounded top), its foot centred on (x, foot), leaning a pixel `lean` at the top. */
function headstone(g: Graphics, x: number, foot: number, w: number, h: number, lean: number): void {
  const half = Math.floor(w / 2);
  for (let y = 0; y < h; y++) {
    const shift = Math.round((y / h) * lean);
    const round = y > h - 3 ? (y - (h - 3)) : 0; // shoulders
    for (let dx = -half + round; dx <= half - round; dx++) {
      const edge = dx === -half + round || dx === half - round || y === h - 1;
      const lit = dx > 0;
      const c = edge ? GRAVE_STONE[0] : lit ? GRAVE_STONE[3 + (hash(dx, y) > 0.8 ? 1 : 0)] : GRAVE_STONE[2 - (hash(dx, y) > 0.85 ? 1 : 0)];
      g.rect(x + dx + shift, foot - 1 - y, 1, 1).fill({ color: c });
    }
  }
  // An engraved cross
  g.rect(x + Math.round(lean * 0.6), foot - h + 3, 1, 6).fill({ color: GRAVE_STONE[0] });
  g.rect(x - 1 + Math.round(lean * 0.6), foot - h + 5, 3, 1).fill({ color: GRAVE_STONE[0] });
}

/** Deterministic 0–1 noise for a cell. */
function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function mix(a: number, b: number, k: number): number {
  const ch = (s: number) => {
    const x = (a >> s) & 255;
    return Math.round(x + (((b >> s) & 255) - x) * k) << s;
  };
  return ch(16) | ch(8) | ch(0);
}
