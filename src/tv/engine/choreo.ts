/**
 * Shared choreography primitives for monster moves (monsterMoves.ts) and knight moves (knightMoves.ts):
 * the frame Timeline both run on, particle options, easing and the battle VFX palette.
 */

import type { SfxName, PlayOptions } from '../../shared/AudioManager';

/** Any sound in the procedural bank (src/shared/sfx/bank.ts); `npm run sfx` renders them to listen to. */
export type { SfxName };
/** Per-call level / pitch / delay for h.sound(). */
export type SoundOpts = Pick<PlayOptions, 'vol' | 'rate' | 'delay'>;

export interface EmitOptions {
  count: number;
  colors: number[];
  speed?: [number, number];
  angle?: number; // radians, 0 = right, -PI/2 = up
  spread?: number; // radians either side of angle
  gravity?: number; // per-frame vy increase (negative rises)
  size?: number;
  life?: [number, number]; // frames
  /** Painted look (fxAtlas); inferred from colour, size and gravity when omitted. */
  kind?: ParticleKind;
}

/** ember/spark glow (additive), smoke puffs, rock chunks, ice shards, droplets. */
export type ParticleKind = 'ember' | 'spark' | 'smoke' | 'chunk' | 'shard' | 'drop';

/** Frame-based scheduler. `during` callbacks always receive a final t=1 call. */
export class Timeline {
  frame = 0;
  length = 0;
  private events: { at: number; fn: () => void; done: boolean }[] = [];
  private spans: { from: number; to: number; fn: (t: number, f: number) => void; done: boolean }[] = [];

  at(frame: number, fn: () => void): void {
    this.events.push({ at: frame, fn, done: false });
    this.length = Math.max(this.length, frame);
  }

  during(from: number, to: number, fn: (t: number, f: number) => void): void {
    this.spans.push({ from, to, fn, done: false });
    this.length = Math.max(this.length, to);
  }

  /** Repeats `fn(i)` every `step` frames in [from, to). */
  every(from: number, to: number, step: number, fn: (i: number) => void): void {
    for (let f = from, i = 0; f < to; f += step, i++) this.at(f, () => fn(i));
  }

  end(frame: number): void {
    this.length = Math.max(this.length, frame);
  }

  /** Advances by `delta` frames; returns true when finished. */
  tick(delta: number): boolean {
    this.frame += delta;
    for (const s of this.spans) {
      if (s.done || this.frame < s.from) continue;
      const t = Math.min(1, (this.frame - s.from) / Math.max(1, s.to - s.from));
      s.fn(t, this.frame - s.from);
      if (t >= 1) s.done = true;
    }
    for (const e of this.events) {
      if (!e.done && this.frame >= e.at) {
        e.done = true;
        e.fn();
      }
    }
    return this.frame >= this.length;
  }
}

/**
 * A view of `tl` that runs `n` frames later: every frame passed in is shifted by `n` and `frame` reads back
 * relative, so a move written from frame 0 (including helpers that schedule from `tl.frame` at run time) plays
 * unchanged after a prelude.
 */
export function shifted(tl: Timeline, n: number): Timeline {
  return {
    get frame() { return tl.frame - n; },
    get length() { return tl.length - n; },
    at: (f: number, fn: () => void) => tl.at(f + n, fn),
    during: (a: number, b: number, fn: (t: number, f: number) => void) => tl.during(a + n, b + n, fn),
    every: (a: number, b: number, step: number, fn: (i: number) => void) => tl.every(a + n, b + n, step, fn),
    end: (f: number) => tl.end(f + n),
    tick: (d: number) => tl.tick(d),
  } as unknown as Timeline;
}

// ---------------------------------------------------------------------------------------------
// Easing & math

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeIn = (t: number) => t * t * t;
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const arc = (t: number) => Math.sin(t * Math.PI);
export const rand = (a: number, b: number) => a + Math.random() * (b - a);

// ---------------------------------------------------------------------------------------------
// Palette

export const INK = 0x0F0E17;
export const BONE = 0xFFFBEA;
export const BLOOD = 0xDC2626;
export const BLOOD_DARK = 0x450A0A;
export const EMBER = 0xF97316;
export const GOLD = 0xFDE047;
export const GOO = [0x84CC16, 0xA3E635, 0x365314, 0xD9F99D];
export const DIRT = [0x5C2B14, 0x8B5A2B, 0x3F2A14, 0xA16207];
export const SHADOW = [0x3B0764, 0x7C3AED, 0xA855F7, 0x1E0B33];
export const FIRE = [GOLD, EMBER, BLOOD, 0xFBBF24];
export const SPORE = [0x2DD4BF, 0x99F6E4, 0x5EEAD4, 0xFFFFFF];
export const SMOKE = [0x44403C, 0x57534E, 0x292524];
