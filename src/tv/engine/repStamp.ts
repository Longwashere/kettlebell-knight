/**
 * Rep stamps: the TV's acknowledgement of every counted rep. An iron medallion slams in with the streak
 * count, a crimson banner under it names the exercise, a rune ring turns behind it and a shockwave and
 * embers burst out. Each exercise keeps its own counter and streak (reset after a long pause): a different
 * exercise takes the front spot and pushes the earlier counters left, each fading on its own timer.
 *
 * The card that rep counted toward is credited visibly: when a counter starts to fade, or is pulled back to the
 * front from an older spot, a soul-wisp streams from where it stood into that card, which flares on arrival.
 *
 * Casting a card clears every counter (they'd cover the attack): each sends its credit at once as a quick
 * violet spellfire stream, and reps during the cast stream straight in without a counter.
 *
 * It sits on the app stage, above the camera-transformed scene, so zooms and shakes don't move it. Its two
 * pixel-painted textures are built once (a few KB) and freed in destroy().
 */
import { Container, Graphics, NineSliceSprite, Sprite, Text, type Texture } from 'pixi.js';
import type { ExerciseType } from '../../types/game';
import { Layer, shadeAndOutline, mix, toTexture } from './pixelKit';

const SHORT_LABEL: Record<ExerciseType, string> = {
  SWING: 'SWING',
  SQUAT: 'GOBLET SQUAT',
  CLEAN_AND_PRESS: 'CLEAN & PRESS',
  SNATCH: 'SNATCH',
  WINDMILL: 'WINDMILL',
  DEADLIFT: 'DEADLIFT',
  OVERHEAD_PRESS: 'PRESS',
  THRUSTER: 'THRUSTER',
  GORILLA_ROW: 'GORILLA ROW',
  AROUND_THE_BODY: 'HALO PASS',
  SINGLE_LEG_RDL: 'SINGLE-LEG RDL',
  CLEAN: 'CLEAN',
  LUNGE: 'LUNGE',
};

/** Colours by effort: a weak rep glows cold iron, a normal one gold, a crit (power ≥ 95) hellfire. */
const TIERS = {
  weak: { rune: 0x6FA8DC, numeral: 0xCFE3F5, ember: [0x9CC9F0, 0x5A86B8, 0xFFFFFF] },
  normal: { rune: 0xF4B41A, numeral: 0xFFD866, ember: [0xF4B41A, 0xFF8A1E, 0xFFF1B0] },
  crit: { rune: 0xFF3B2F, numeral: 0xFF6A3D, ember: [0xFF3B2F, 0xFFB01E, 0xFFF1B0] },
};
type Tier = keyof typeof TIERS;
/** Spellfire: the streams sent while a card is being cast, quick and arcane violet. */
const CAST = { rune: 0xB45CFF, ember: [0xD9A6FF, 0x8A3CFF, 0xFFFFFF] };

// Screen position (426×240 stage): the open sky between the knight's panel and the foes' panels
const CX = 200;
const CY = 54;
const MEDAL = 37;
const STREAK_GAP_MS = 12000;
const HOLD = 75; // frames before the fade
const FADE = 22;

const INK = 0x0F0E17;
const FONT = '"Press Start 2P", monospace';

/** Gothic iron medallion: a spiked studded ring around a dark blood-lit well. */
function paintMedallion(): Layer {
  const m = new Layer(MEDAL, MEDAL);
  const c = (MEDAL - 1) / 2;
  // Eight spikes, the cardinal ones longer
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const len = i % 2 === 0 ? 17.5 : 15.5;
    const ox = Math.cos(a);
    const oy = Math.sin(a);
    const px = -oy * 2.6;
    const py = ox * 2.6;
    m.poly([c + ox * 11 + px, c + oy * 11 + py, c + ox * len, c + oy * len, c + ox * 11 - px, c + oy * 11 - py], 0x4A4860);
  }
  m.disc(c, c, 14, 0x3A3850);
  m.ring(c, c, 13, 0x5E5C78, 1.5);
  m.ring(c, c, 11.2, 0x22202E, 1);
  // Studs between the spikes
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2 + Math.PI / 8;
    m.disc(c + Math.cos(a) * 12.4, c + Math.sin(a) * 12.4, 0.9, 0x8E8CA8);
  }
  // The well: dark crimson, warmer towards the centre
  for (let y = 0; y < MEDAL; y++) {
    for (let x = 0; x < MEDAL; x++) {
      const d = Math.hypot(x - c, y - c);
      if (d <= 10.4) m.set(x, y, mix(0x3A0A14, 0x120A16, Math.min(1, d / 10.4) ** 0.8));
    }
  }
  shadeAndOutline(m, 0xFFF1D6, 0.35, 0.3);
  return m;
}

/** Banner with swallowtail ends folded behind it, 3 px of tail on each side + 9 px of band to stretch from. */
function paintRibbon(): Layer {
  const w = 30;
  const h = 15;
  const m = new Layer(w, h);
  // Tails, folded back (darker)
  m.poly([0, 4, 7, 4, 7, 14, 0, 14, 3, 9], 0x3A0A12);
  m.poly([w, 4, w - 7, 4, w - 7, 14, w, 14, w - 3, 9], 0x3A0A12);
  // Band with a vertical light ramp and gold trim
  for (let y = 2; y <= 11; y++) {
    const col = y === 2 || y === 11 ? 0xC8962E : y === 3 ? 0xA82638 : y <= 6 ? 0x8A1C2A : y <= 9 ? 0x6B1420 : 0x4A0E18;
    m.rect(4, y, w - 8, 1, col);
  }
  shadeAndOutline(m, 0xFFE8C0, 0.25, 0.25);
  return m;
}

interface Ember {
  g: Graphics;
  vx: number;
  vy: number;
  life: number;
  max: number;
}

/** Older counters shrink back (not further: the 8px label goes to mush), with this space between neighbours. */
const BACK_SCALE = 0.8;
const GAP = 4;
const MAX_STAMPS = 3;
/** How far right the row may shift to fit long names (the foes' side of the sky). */
const MAX_SHIFT = 30;
/** A new counter waits (at most this many frames) for the older ones to slide out of its spot. */
const MAX_ENTRY_WAIT = 10;

/** The hand card a rep counted toward (it lives in the DOM, over the canvas). */
export interface RepCardTarget {
  /** The card's page rect, or null once it's gone (cast, discarded, hand hidden). */
  locate(): DOMRect | null;
  /** The stream landed: flare the card in this colour. */
  absorb(color: string): void;
}
/** Page rect → stage coords (null while the canvas isn't laid out). */
export type PageToStage = (rect: DOMRect) => { x: number; y: number; h: number } | null;

const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

/**
 * The stamps on screen, one per exercise. The latest exercise takes the front spot (CX); the others slide
 * left and shrink, each fading on its own timer, and close up when one goes.
 */
export class RepStamp {
  readonly view = new Container();
  private medalTex: Texture;
  private ribbonTex: Texture;
  private stamps: Stamp[] = []; // front first
  private streaks = new Map<ExerciseType, { count: number; lastRepAt: number }>();
  private streams: CardStream[] = [];
  private motes: Mote[] = [];
  private streamG = new Graphics(); // every stream, mote and arrival ring, redrawn each frame

  constructor(private toStage: PageToStage) {
    this.medalTex = toTexture(paintMedallion());
    this.ribbonTex = toTexture(paintRibbon());
    this.view.sortableChildren = true;
    this.streamG.zIndex = 100;
    this.view.addChild(this.streamG);
  }

  /**
   * A rep was counted: bump that exercise's counter (continuing its streak) and bring it to the front.
   * `card` is the hand card it counted toward (null: none in hand, or the rep cast it).
   */
  show(exercise: ExerciseType, power: number, card: RepCardTarget | null = null): void {
    const count = this.nextCount(exercise);

    let stamp = this.stamps.find((st) => st.exercise === exercise);
    if (stamp) {
      // Pulled back to the front: what it held so far goes to its card from the spot it's leaving
      if (this.stamps.indexOf(stamp) > 0) this.release(stamp);
      this.stamps.splice(this.stamps.indexOf(stamp), 1);
    } else {
      stamp = new Stamp(this.medalTex, this.ribbonTex, exercise);
      stamp.view.position.set(CX, CY);
      this.view.addChild(stamp.view);
      // Pushing others aside: hidden until they've cleared its spot (see update)
      if (this.stamps.length > 0) stamp.entryWait = MAX_ENTRY_WAIT;
    }
    this.stamps.unshift(stamp);
    stamp.card = card;
    stamp.released = false;
    if (stamp.entryWait > 0) stamp.pending = { count, power };
    else stamp.bump(count, power);
    // Too many at once: the oldest starts its fade now
    for (const old of this.stamps.slice(MAX_STAMPS)) old.fadeNow();
  }

  /** A card is being cast: every counter goes now, its credit streaming into its card as spellfire. */
  clear(): void {
    for (const st of this.stamps) {
      if (!st.released) this.release(st, true);
      st.view.destroy({ children: true });
    }
    this.stamps = [];
  }

  /** A rep during a cast: no counter (it would cover the attack), just a spellfire stream into its card. */
  streamOnly(exercise: ExerciseType, card: RepCardTarget | null): void {
    this.nextCount(exercise); // the streak still counts
    if (card) this.streamTo(card, CX, CY, true, 'normal');
  }

  private nextCount(exercise: ExerciseType): number {
    const now = performance.now();
    const prev = this.streaks.get(exercise);
    const count = prev && now - prev.lastRepAt < STREAK_GAP_MS ? prev.count + 1 : 1;
    this.streaks.set(exercise, { count, lastRepAt: now });
    return count;
  }

  update(delta: number): void {
    // Packed leftwards from the front spot. When long names don't fit, the row shifts right a little and
    // whatever still runs off the left edge starts fading (held at the edge meanwhile).
    let prevX = CX;
    let prevHalf = 0;
    const slots = this.stamps.map((st, i) => {
      const scale = i === 0 ? 1 : BACK_SCALE;
      const x = i === 0 ? CX : prevX - prevHalf - GAP - st.halfWidth * scale;
      prevX = x;
      prevHalf = st.halfWidth * scale;
      return { x, scale };
    });
    const overflow = Math.max(0, ...this.stamps.map((st, i) => st.halfWidth * slots[i].scale + 2 - slots[i].x));
    const shift = Math.min(overflow, MAX_SHIFT);
    const ease = Math.min(1, 0.35 * delta);
    this.stamps.forEach((st, i) => {
      const { scale } = slots[i];
      const edge = st.halfWidth * scale + 2;
      if (slots[i].x + shift < edge) st.fadeNow();
      const x = Math.max(edge, slots[i].x + shift);
      st.scale += (scale - st.scale) * ease;
      st.x += (x - st.x) * ease;
      st.view.scale.set(st.scale);
      st.view.x = Math.round(st.x); // whole pixels keep the pixel art crisp
      st.view.zIndex = -i;
    });

    // A waiting counter shows once its spot is clear, or right away if a newer one already took the front
    this.stamps.forEach((st, i) => {
      if (!st.pending) return;
      st.entryWait -= delta;
      const clear = this.stamps.slice(1).every((o) => o.x + o.halfWidth * o.scale <= st.x - st.halfWidth);
      if (i > 0 || clear || st.entryWait <= 0) {
        st.entryWait = 0;
        st.bump(st.pending.count, st.pending.power);
        st.pending = null;
      }
    });
    for (const st of this.stamps) {
      if (st.pending) continue;
      st.update(delta);
      if (!st.released && st.fading) this.release(st);
    }
    this.updateStreams(delta);

    for (const st of this.stamps.filter((s) => s.done)) {
      this.stamps.splice(this.stamps.indexOf(st), 1);
      st.view.destroy({ children: true });
    }
  }

  getDebugState() {
    return {
      stamps: this.stamps.map((st) => ({ exercise: st.exercise, count: st.count, tier: st.tier, x: Math.round(st.view.x), card: !!st.card })),
      streams: this.streams.length,
    };
  }

  destroy(): void {
    this.view.destroy({ children: true });
    this.stamps = [];
    this.streams = [];
    this.motes = [];
    this.medalTex.destroy(true);
    this.ribbonTex.destroy(true);
  }

  /** Sends the counter's credit to its card as a stream from where the counter stands now. */
  private release(st: Stamp, cast = false): void {
    st.released = true;
    if (st.card) this.streamTo(st.card, st.x, st.view.y, cast, st.tier);
  }

  private streamTo(card: RepCardTarget, x0: number, y0: number, cast: boolean, tier: Tier): void {
    const end = this.cardPoint(card);
    if (!end) return;
    const { rune, ember } = cast ? CAST : TIERS[tier];
    const dist = Math.hypot(end.x - x0, end.y - y0);
    this.streams.push({ card, x0, y0, x1: end.x, y1: end.y, s: 0, dur: cast ? 9 + dist / 40 : 30 + dist / 10, color: rune, ember, phase: Math.random() * 6, cast });
    this.burst(x0, y0, cast ? 12 : 8, ember, cast ? 2 : 1.2, -0.3);
  }

  /** Where a stream enters a card: top centre, just under the edge. */
  private cardPoint(card: RepCardTarget): { x: number; y: number } | null {
    const rect = card.locate();
    const p = rect && this.toStage(rect);
    return p ? { x: p.x, y: p.y + p.h * 0.05 } : null;
  }

  private updateStreams(delta: number): void {
    const g = this.streamG;
    g.clear();

    for (let i = this.streams.length - 1; i >= 0; i--) {
      const st = this.streams[i];
      st.s += delta / st.dur;
      // Home in on the card as it moves (focus lift, fan); keep the last spot if it's gone mid-flight
      const end = this.cardPoint(st.card);
      if (end) {
        st.x1 = end.x;
        st.y1 = end.y;
      }
      if (st.s >= 1) {
        this.streams.splice(i, 1);
        if (end) {
          st.card.absorb(hex(st.color));
          this.burst(st.x1, st.y1, 14, st.ember, 1.8, -1.2);
          this.motes.push({ x: st.x1, y: st.y1, vx: 0, vy: 0, life: 0, max: 14, color: st.color, ring: true });
        }
        continue;
      }
      this.drawStream(st);
    }

    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i];
      m.life += delta;
      if (m.life >= m.max) {
        this.motes.splice(i, 1);
        continue;
      }
      const k = m.life / m.max;
      if (m.ring) {
        g.ellipse(m.x, m.y, 6 + k * 22, 2 + k * 6).stroke({ width: 2 * (1 - k) + 1, color: m.color, alpha: 1 - k });
        continue;
      }
      m.x += m.vx * delta;
      m.y += m.vy * delta;
      m.vx *= Math.pow(0.92, delta);
      m.vy = m.vy * Math.pow(0.92, delta) - 0.02 * delta;
      g.rect(Math.round(m.x), Math.round(m.y), 1, 1).fill({ color: k < 0.3 ? 0xFFFFFF : m.color, alpha: 1 - k });
    }
  }

  /**
   * A soul-wisp: a white-hot head with an inked, tapering trail that rises off the counter, then dives into
   * the card, two motes spiralling around it and sparks shedding behind.
   */
  private drawStream(st: CardStream): void {
    const g = this.streamG;
    const u = st.cast ? st.s : st.s * st.s * 0.65 + st.s * 0.35; // lifts off slowly, then dives (spellfire just goes)
    const at = (v: number) => {
      const p = bezier(st, v);
      // A writhe across the path that dies out as it reaches the card
      const n = normal(st, v);
      const w = Math.sin(v * 16 + st.phase) * 3 * (1 - v);
      return { x: p.x + n.x * w, y: p.y + n.y * w };
    };

    const N = 18;
    const tail = Math.max(0, u - 0.42);
    const pts = Array.from({ length: N + 1 }, (_, j) => at(tail + ((u - tail) * j) / N));
    // Ink first, then the colour, then a white-hot core towards the head
    for (const [pad, color, core] of [[2, INK, false], [0, st.color, false], [0, 0xFFFFFF, true]] as const) {
      for (let j = 1; j <= N; j++) {
        const t = j / N;
        if (core && t < 0.55) continue;
        const width = (core ? 0.45 : 1) * (1.5 + 4.5 * t) + pad;
        g.moveTo(pts[j - 1].x, pts[j - 1].y)
          .lineTo(pts[j].x, pts[j].y)
          .stroke({ width, color, alpha: color === INK ? 0.55 * t : 0.35 + 0.65 * t, cap: 'round' });
      }
    }

    // Twin motes winding round the head
    const p = at(Math.max(0, u - 0.03));
    const n = normal(st, u);
    for (let k = 0; k < 2; k++) {
      const r = Math.sin(st.s * 22 + k * Math.PI) * 6;
      g.rect(Math.round(p.x + n.x * r) - 1, Math.round(p.y + n.y * r) - 1, 2, 2).fill({ color: st.ember[k + 1] ?? st.color });
    }

    const head = pts[N];
    g.circle(head.x, head.y, 9).fill({ color: st.color, alpha: 0.18 });
    g.circle(head.x, head.y, 6).fill({ color: st.color, alpha: 0.35 });
    g.circle(head.x, head.y, 4).fill({ color: INK, alpha: 0.6 });
    g.circle(head.x, head.y, 3.4).fill({ color: st.color });
    g.circle(head.x, head.y, 1.8).fill({ color: 0xFFFFFF });

    if (Math.random() < 0.7) {
      this.motes.push({
        x: head.x, y: head.y, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2,
        life: 0, max: 14 + Math.random() * 12, color: st.ember[Math.floor(Math.random() * st.ember.length)],
      });
    }
  }

  private burst(x: number, y: number, count: number, colors: number[], speed: number, lift: number): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.5 + Math.random());
      this.motes.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + lift, life: 0, max: 18 + Math.random() * 16, color: colors[i % colors.length] });
    }
  }
}

interface CardStream {
  card: RepCardTarget;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  s: number; // 0 → 1 over dur frames
  dur: number;
  color: number;
  ember: number[];
  phase: number;
  /** Spellfire: a flatter, quicker arc. */
  cast: boolean;
}

/** A spark (or, with `ring`, the flat ring where a stream lands). */
interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: number;
  ring?: boolean;
}

/** The stream's arc: up off the counter, across, then straight down into the card. */
function bezier(st: CardStream, v: number): { x: number; y: number } {
  const c1x = st.x0 + (st.x1 - st.x0) * 0.15;
  const c1y = st.y0 - (st.cast ? 10 : 32);
  const c2x = st.x1;
  const c2y = st.y1 - (st.cast ? 35 : 60);
  const a = 1 - v;
  return {
    x: a * a * a * st.x0 + 3 * a * a * v * c1x + 3 * a * v * v * c2x + v * v * v * st.x1,
    y: a * a * a * st.y0 + 3 * a * a * v * c1y + 3 * a * v * v * c2y + v * v * v * st.y1,
  };
}

function normal(st: CardStream, v: number): { x: number; y: number } {
  const a = bezier(st, Math.max(0, v - 0.01));
  const b = bezier(st, Math.min(1, v + 0.01));
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
}

/** One exercise's counter: medallion, banner, runes, halo, shockwave and embers. */
class Stamp {
  readonly view = new Container();
  private crest = new Container(); // medallion + rune ring + numeral, scaled on slam
  private runes = new Graphics();
  private glow = new Graphics();
  private flash = new Graphics();
  private shock = new Graphics();
  private ribbon: NineSliceSprite;
  private label: Text;
  private numeral: Text;
  private embers: Ember[] = [];

  count = 0;
  tier: Tier = 'normal';
  x = CX;
  scale = 1;
  entryWait = 0;
  /** The card its latest rep counted toward, and whether that credit has been streamed to it yet. */
  card: RepCardTarget | null = null;
  released = false;
  /** The rep it was created for, shown once its spot is clear. */
  pending: { count: number; power: number } | null = null;
  /** Half the footprint (banner or halo, whichever is wider), for spacing. */
  halfWidth = 26;
  private t = Infinity; // frames since the last rep
  private slam = Infinity; // frames since the last rep's flash and shockwave
  private punch = 0; // numeral bump, 1 → 0

  constructor(medalTex: Texture, ribbonTex: Texture, readonly exercise: ExerciseType) {
    const medal = new Sprite(medalTex);
    medal.anchor.set(0.5);
    this.numeral = new Text({ text: '1', style: { fontFamily: FONT, fontSize: 16, fill: 0xFFD866, stroke: { color: INK, width: 3 } } });
    this.numeral.anchor.set(0.5);
    this.numeral.y = 1;
    this.crest.addChild(this.glow, this.runes, medal, this.flash, this.numeral);

    this.ribbon = new NineSliceSprite({ texture: ribbonTex, leftWidth: 9, rightWidth: 9, topHeight: 0, bottomHeight: 0 });
    this.label = new Text({ text: SHORT_LABEL[exercise] ?? exercise, style: { fontFamily: FONT, fontSize: 8, fill: 0xF3E9D2, stroke: { color: INK, width: 2 } } });
    this.label.anchor.set(0.5);
    this.label.position.set(0, 22);
    const w = Math.ceil(this.label.width) + 22;
    this.ribbon.width = w;
    this.ribbon.height = 15;
    this.ribbon.position.set(-Math.round(w / 2), 15);
    this.halfWidth = Math.max(w, 52) / 2;

    this.shock.blendMode = 'add';
    this.runes.blendMode = 'add';
    this.flash.blendMode = 'add';
    this.view.addChild(this.shock, this.crest, this.ribbon, this.label);
    this.view.visible = false; // until its first bump
  }

  get fading(): boolean {
    return this.t >= HOLD;
  }

  get done(): boolean {
    return !this.pending && this.t >= HOLD + FADE && this.embers.length === 0;
  }

  /** Starts the fade early (pushed off by newer counters). */
  fadeNow(): void {
    this.t = Math.max(this.t, HOLD);
  }

  bump(count: number, power: number): void {
    const fresh = this.t === Infinity;
    this.count = count;
    this.tier = power >= 95 ? 'crit' : power < 60 ? 'weak' : 'normal';
    const tier = TIERS[this.tier];
    this.numeral.text = String(count);
    this.numeral.style.fontSize = count < 10 ? 16 : count < 100 ? 11 : 8;
    this.numeral.style.fill = tier.numeral;

    // A new counter slams in from big; a repeat while it's still up just bumps
    this.t = fresh ? 0 : 8;
    this.slam = 0;
    this.punch = 1;
    this.view.alpha = 1;
    this.view.visible = true;
    this.drawRunes();
    this.drawGlow();
    this.spawnEmbers(this.tier === 'crit' ? 16 : 10, tier.ember);
  }

  update(delta: number): void {
    this.t += delta;
    this.slam += delta;
    const t = this.t;

    // Slam: 1.9× → 1 with an overshoot over 8 frames
    const s = t < 8 ? 1 + 0.9 * (1 - easeOutBack(t / 8)) : 1;
    this.crest.scale.set(s);
    this.view.y = CY + (t > HOLD ? -Math.min(1, (t - HOLD) / FADE) * 5 : 0);
    this.view.alpha = t > HOLD ? Math.max(0, 1 - (t - HOLD) / FADE) : 1;

    this.punch = Math.max(0, this.punch - delta / 10);
    this.numeral.scale.set(1 + this.punch * this.punch * 0.7);

    this.runes.rotation += delta * (this.tier === 'crit' ? 0.05 : 0.025);
    this.runes.alpha = 0.85 + Math.sin(t * 0.18) * 0.15;
    this.glow.alpha = 0.75 + Math.sin(t * 0.12) * 0.25 + Math.max(0, 1 - this.slam / 14);

    // Inner flash and the shockwave ring off the slam
    const f = Math.max(0, 1 - this.slam / 10);
    this.flash.clear();
    if (f > 0) this.flash.circle(0, 0, 10).fill({ color: 0xFFFFFF, alpha: f * 0.85 });
    const k = this.slam / 18;
    this.shock.clear();
    if (k < 1) {
      const r = 16 + k * 26;
      this.shock.circle(0, 0, r).stroke({ width: 3 * (1 - k) + 1, color: TIERS[this.tier].rune, alpha: 1 - k });
      this.shock.circle(0, 0, r * 0.82).stroke({ width: 1, color: 0xFFFFFF, alpha: (1 - k) * 0.6 });
    }

    for (let i = this.embers.length - 1; i >= 0; i--) {
      const e = this.embers[i];
      e.life += delta;
      e.g.x += e.vx * delta;
      e.g.y += e.vy * delta;
      e.vx *= Math.pow(0.93, delta);
      e.vy = e.vy * Math.pow(0.93, delta) - 0.03 * delta; // embers rise
      e.g.alpha = 1 - e.life / e.max;
      if (e.life >= e.max) {
        e.g.destroy();
        this.embers.splice(i, 1);
      }
    }

  }

  /** A ring of 12 rune marks behind the medallion, in the effort colour. */
  private drawRunes(): void {
    const g = this.runes;
    const color = TIERS[this.tier].rune;
    g.clear();
    g.circle(0, 0, 21).stroke({ width: 1, color, alpha: 0.8 });
    g.circle(0, 0, 24).stroke({ width: 1, color, alpha: 0.35 });
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      const x = Math.cos(a) * 21;
      const y = Math.sin(a) * 21;
      if (i % 3 === 0) g.rect(x - 1.5, y - 1.5, 3, 3).fill({ color });
      else g.moveTo(x - Math.sin(a) * 2, y + Math.cos(a) * 2).lineTo(x + Math.sin(a) * 2, y - Math.cos(a) * 2).stroke({ width: 1, color });
    }
  }

  /** A banded halo (no blur: stepped rings read as pixel-art light). Normal blend: additive red vanishes on bright backgrounds. */
  private drawGlow(): void {
    const color = TIERS[this.tier].rune;
    this.glow.clear();
    for (const [r, a] of [[30, 0.1], [25, 0.14], [20, 0.2], [16, 0.3]]) this.glow.circle(0, 0, r).fill({ color, alpha: a });
  }

  private spawnEmbers(count: number, colors: number[]): void {
    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      const size = Math.random() < 0.3 ? 2 : 1;
      g.rect(-size / 2, -size / 2, size, size).fill({ color: colors[i % colors.length] });
      const a = Math.random() * Math.PI * 2;
      const r = 12 + Math.random() * 4;
      g.position.set(Math.cos(a) * r, Math.sin(a) * r);
      g.blendMode = 'add';
      const speed = 1.2 + Math.random() * 1.6;
      this.view.addChildAt(g, 0);
      this.embers.push({ g, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 0.4, life: 0, max: 28 + Math.random() * 24 });
    }
  }
}

function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}
