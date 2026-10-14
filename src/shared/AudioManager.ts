import { SFX_BANK, SR, resolveSfx, type SfxName, type SoundId } from './sfx/bank';

export type { SfxName, SoundId } from './sfx/bank';

export interface PlayOptions {
  /** Level multiplier on top of the bank's mix level (default 1). */
  vol?: number;
  /** Playback rate: pitch and speed together (default 1, with the sound's random spread on top). */
  rate?: number;
  /** Stereo position, -1 left (knight side) … 1 right (monster side). */
  pan?: number;
  /** Seconds from now. */
  delay?: number;
}

/** At most this many sounds at once; the oldest is cut when a new one starts (keeps the Fire TV mixer light). */
const MAX_VOICES = 12;
/** The same sound retriggered within this window plays quieter, and is dropped past STACK_LIMIT copies. */
const STACK_WINDOW = 0.045;
const STACK_LIMIT = 3;

interface Voice {
  src: AudioBufferSourceNode;
  started: number;
}

/**
 * Game audio: plays the procedural sound bank (src/shared/sfx/bank.ts). Each sound renders to a
 * small mono AudioBuffer on first use; `prewarm()` renders a set ahead of time, one per tick, so a
 * battle never stalls a frame rendering a sound the first time it's needed.
 */
class AudioManager {
  private static instance: AudioManager;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private isMuted = false;
  private buffers = new Map<SoundId, AudioBuffer>();
  private voices: Voice[] = [];
  private lastPlayed = new Map<SoundId, { at: number; count: number }>();
  private warmQueue: SoundId[] = [];
  private warming = false;
  /** Dev stats: plays per sound (including dropped stack repeats), for the __kk bridge. */
  private playCounts = new Map<SoundId, number>();
  private dropped = 0;

  private constructor() {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      // Gentle bus compression so stacked hits stay loud without clipping on TV speakers
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 8;
      comp.ratio.value = 4;
      comp.attack.value = 0.003;
      comp.release.value = 0.15;
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(comp);
      comp.connect(this.ctx.destination);
    } catch (e) {
      console.warn('AudioContext not available:', e);
    }
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) AudioManager.instance = new AudioManager();
    return AudioManager.instance;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) for (const v of this.voices) this.stop(v);
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private buffer(id: SoundId): AudioBuffer | null {
    const cached = this.buffers.get(id);
    if (cached || !this.ctx) return cached ?? null;
    try {
      const data = SFX_BANK[id].render();
      const b = this.ctx.createBuffer(1, data.length, SR);
      b.getChannelData(0).set(data);
      this.buffers.set(id, b);
      return b;
    } catch (e) {
      console.warn(`[audio] failed to render "${id}"`, e);
      return null;
    }
  }

  /** Renders `ids` (default: the whole bank) in the background, one sound per tick. */
  public prewarm(ids: readonly SfxName[] = Object.keys(SFX_BANK) as SoundId[]): void {
    for (const n of ids) {
      const id = resolveSfx(n);
      if (!this.buffers.has(id) && !this.warmQueue.includes(id)) this.warmQueue.push(id);
    }
    if (this.warming || !this.ctx) return;
    this.warming = true;
    const step = () => {
      const id = this.warmQueue.shift();
      if (!id) {
        this.warming = false;
        return;
      }
      this.buffer(id);
      setTimeout(step, 16);
    };
    setTimeout(step, 16);
  }

  private stop(v: Voice) {
    try {
      v.src.stop();
    } catch {
      /* already stopped */
    }
  }

  /** Dev bridge: context state, rendered buffers and their memory, plays per sound since the last reset. */
  public debugState(reset = false) {
    let bytes = 0;
    for (const b of this.buffers.values()) bytes += b.length * 4;
    const out = {
      context: this.ctx?.state ?? 'none',
      muted: this.isMuted,
      rendered: this.buffers.size,
      bankSize: Object.keys(SFX_BANK).length,
      pcmKB: Math.round(bytes / 1024),
      voices: this.voices.length,
      dropped: this.dropped,
      plays: Object.fromEntries([...this.playCounts].sort((a, b) => b[1] - a[1])),
    };
    if (reset) {
      this.playCounts.clear();
      this.dropped = 0;
    }
    return out;
  }

  /** Plays a sound from the bank (legacy names swing/hit/crit map to whoosh/impact/impact_heavy). */
  public play(name: SfxName, o: PlayOptions = {}): void {
    if (this.isMuted || !this.ctx || !this.master) return;
    const ctx = this.ctx;
    if (ctx.state === 'suspended') void ctx.resume();
    const id = resolveSfx(name);
    const def = SFX_BANK[id];
    if (!def) {
      console.warn(`[audio] unknown sound "${name}"`);
      return;
    }
    this.playCounts.set(id, (this.playCounts.get(id) ?? 0) + 1);
    const buffer = this.buffer(id);
    if (!buffer) return;

    const when = ctx.currentTime + Math.max(0, o.delay ?? 0);
    // Stacking: multi-target hits fire the same sound a couple of frames apart; let a few through, softer
    let vol = def.vol * (o.vol ?? 1);
    const last = this.lastPlayed.get(id);
    if (last && Math.abs(when - last.at) < STACK_WINDOW) {
      if (last.count >= STACK_LIMIT) {
        this.dropped++;
        return;
      }
      last.count++;
      vol *= 0.55;
    } else {
      this.lastPlayed.set(id, { at: when, count: 1 });
    }

    const live = this.voices.filter((v) => v.started + v.src.buffer!.duration / v.src.playbackRate.value > ctx.currentTime);
    this.voices = live;
    if (live.length >= MAX_VOICES) {
      const oldest = live.shift()!;
      this.stop(oldest);
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const spread = (def as { spread?: number }).spread ?? 0.06;
    src.playbackRate.value = (o.rate ?? 1) * (1 + (Math.random() * 2 - 1) * spread);
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(g);
    let out: AudioNode = g;
    if (o.pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, o.pan));
      g.connect(p);
      out = p;
    }
    out.connect(this.master);
    src.start(when);
    const voice = { src, started: when };
    this.voices.push(voice);
    src.onended = () => {
      src.disconnect();
      g.disconnect();
      if (out !== g) out.disconnect();
      const i = this.voices.indexOf(voice);
      if (i >= 0) this.voices.splice(i, 1);
    };
  }
}

export const audioManager = AudioManager.getInstance();
