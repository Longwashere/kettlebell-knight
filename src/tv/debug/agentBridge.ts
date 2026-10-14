/// <reference types="vite/client" />
/**
 * Dev-only automation bridge: `window.__kk`.
 *
 * Lets agents and scripts (scripts/kk-shot.mjs) drive the TV app without a phone or D-pad:
 * jump to a view, start an encounter, inject reps through the real telemetry path,
 * wait for animations to settle, and read game state as JSON.
 *
 * Components register providers while mounted; nothing is installed in production builds.
 */
import type { RepTelemetry, ExerciseType } from '../../types/game';
import { networkManager } from '../../shared/NetworkManager';
import { CARD_CATALOG } from '../../types/battle';
import { getCardArt, CARD_ART_W, CARD_ART_H } from '../components/cardArt';
import { EXERCISE_GUIDES, getExerciseFrames, POSE_W, POSE_H } from '../components/exerciseGuide';

type StateProvider = () => unknown;
type Action = (...args: any[]) => unknown;

const providers = new Map<string, StateProvider>();
const actions = new Map<string, Action>();

/** Registers a state provider and named actions. Returns an unregister function for useEffect cleanup. */
export function registerDebug(name: string, state: StateProvider | null, acts: Record<string, Action> = {}): () => void {
  if (!import.meta.env.DEV) return () => {};
  if (state) providers.set(name, state);
  for (const [key, fn] of Object.entries(acts)) actions.set(key, fn);
  return () => {
    if (state && providers.get(name) === state) providers.delete(name);
    for (const [key, fn] of Object.entries(acts)) {
      if (actions.get(key) === fn) actions.delete(key);
    }
  };
}

function call(name: string, ...args: unknown[]): unknown {
  const fn = actions.get(name);
  if (!fn) throw new Error(`[__kk] "${name}" is unavailable here (registered: ${[...actions.keys()].join(', ') || 'none'})`);
  return fn(...args);
}

function state(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, fn] of providers) {
    try {
      out[name] = fn();
    } catch (err) {
      out[name] = { error: String(err) };
    }
  }
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Polls until `predicate(state())` is truthy. Rejects with the last state on timeout. */
async function waitFor(predicate: (s: any) => unknown, timeoutMs = 10000, intervalMs = 50): Promise<any> {
  const deadline = performance.now() + timeoutMs;
  for (;;) {
    const s = state();
    if (predicate(s)) return s;
    if (performance.now() > deadline) {
      throw new Error(`[__kk] waitFor timed out after ${timeoutMs}ms; state: ${JSON.stringify(s)}`);
    }
    await sleep(intervalMs);
  }
}

const api = {
  /** Snapshot of every registered provider (screen, engine, battle). */
  state,
  /** Lists the actions available on the current screen. */
  actions: () => [...actions.keys()],
  /** Invokes a registered action by name. */
  call,

  /** Switch TV view: 'HUB' | 'BLACKSMITH' | 'COMBAT' | 'ALCHEMIST' | 'SANCTUARY'. Resolves when the view is up. */
  async goto(view: string): Promise<unknown> {
    const target = view.toUpperCase();
    call('goto', target);
    return waitFor((s) => s.screen?.view === target && (target !== 'COMBAT' || s.battle));
  },

  /**
   * Starts a battle encounter by ENCOUNTERS id or index, or an ad-hoc list of MONSTER_CATALOG ids
   * (e.g. ['wolf', 'boar']). Switches to COMBAT first if needed and waits for monster rigs to load.
   */
  async encounter(which: string | number | string[]): Promise<unknown> {
    if (state().screen && (state().screen as any).view !== 'COMBAT') await api.goto('COMBAT');
    await waitFor((s) => s.engine?.ready && s.battle);
    const before = (state().battle as any)?.monsters?.[0]?.instanceId;
    call('encounter', which);
    // Wait for React to commit the new encounter and for the engine to load the matching rigs.
    return waitFor((s) => {
      const battle = s.battle;
      const engine = s.engine;
      if (!battle?.monsters?.length || battle.monsters[0].instanceId === before) return false;
      const want = battle.monsters.map((m: any) => m.spriteType).join();
      const have = engine.monsters.map((m: any) => m.type).join();
      return want === have && engine.loading === 0 && engine.monsters.every((m: any) => m.loaded);
    }, 15000);
  },

  /**
   * Injects a rep through the same path as phone telemetry. In battle, `exercise` defaults to the
   * focused card's exercise so the rep counts toward a card.
   */
  rep(exercise?: ExerciseType, power = 100, form = 1.0, skillName?: string): void {
    const ex = exercise ?? ((state().battle as any)?.focusedCard?.exercise as ExerciseType | undefined) ?? 'SWING';
    const telemetry: RepTelemetry = { event: 'REP_TRIGGER', exercise: ex, power, form, skillName, timestamp: Date.now() };
    networkManager.injectTelemetry(telemetry);
  },

  /** Repeats reps until the focused card fires (or `count` reps are sent). */
  async cast(count?: number, power = 100): Promise<unknown> {
    const battle = state().battle as any;
    const card = battle?.focusedCard;
    const n = count ?? (card ? card.requiredReps - card.currentReps : 1);
    for (let i = 0; i < n; i++) {
      api.rep(undefined, power);
      await sleep(30);
    }
    return state();
  },

  /** Freezes or resumes the battle ATB timers so monsters don't act during captures. */
  freeze: (on = true) => call('freeze', on),
  /** Loads a background by BATTLE_MAPS key (e.g. 'BLOOD_CEMETERY') or asset URL. */
  background: (key: string) => call('background', key),

  /** Resolves when the engine is initialised and no assets are loading. */
  ready: (timeoutMs = 15000) => waitFor((s) => s.engine?.ready && s.engine.loading === 0, timeoutMs),
  /**
   * Resolves when no VFX, projectiles, swings, camera moves or one-shot animations are in flight,
   * continuously for `settleMs` (some effects are spawned on timers, so a single idle frame isn't enough).
   */
  async idle(timeoutMs = 10000, settleMs = 300): Promise<unknown> {
    let idleSince: number | null = null;
    return waitFor((s) => {
      if (!(s.engine?.ready && s.engine.idle)) {
        idleSince = null;
        return false;
      }
      idleSince ??= performance.now();
      return performance.now() - idleSince >= settleMs;
    }, timeoutMs);
  },
  waitFor,
  sleep,

  /**
   * Contact sheet of every animation on a monster slot: one row per animation, `frames` evenly spaced
   * poses per row, cropped around the monster. Returns a PNG data URL. Freeze battle timers first.
   */
  async sheet(slot = 0, frames = 6): Promise<string> {
    const engine = (state().engine as any);
    const monster = engine?.monsters?.[slot];
    if (!monster?.loaded) throw new Error(`[__kk] no loaded monster in slot ${slot}`);
    const { animations, type } = call('pose', slot, null) as { type: string; animations: { name: string; duration: number }[] };
    const crop = { x: 170, y: 0, w: 230, h: 175 }; // around the solo formation slot (x≈310)
    const labelH = 12;
    const out = document.createElement('canvas');
    out.width = crop.w * frames;
    out.height = (crop.h + labelH) * animations.length;
    const ctx = out.getContext('2d')!;
    ctx.fillStyle = '#0F0E17';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.font = '10px monospace';
    for (const [row, anim] of animations.entries()) {
      const y0 = row * (crop.h + labelH);
      for (let f = 0; f < frames; f++) {
        const t = frames === 1 ? 0 : (anim.duration * f) / (frames - 1);
        call('pose', slot, anim.name, Math.min(t, Math.max(0, anim.duration - 0.001)));
        const img = new Image();
        img.src = await api.snapshot();
        await img.decode();
        ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, f * crop.w, y0 + labelH, crop.w, crop.h);
        ctx.fillStyle = '#F4B41A';
        ctx.fillText(`${type} ${anim.name} t=${t.toFixed(2)}/${anim.duration}s`, f * crop.w + 3, y0 + 10);
      }
    }
    call('pose', slot, null);
    return out.toDataURL('image/png');
  },

  /**
   * Film strip of a monster move: triggers `move` on `slot`, then captures the Pixi canvas every
   * `step` frames by stepping the ticker deterministically. Returns a PNG data URL (4 columns).
   */
  async film(slot: number, move: string, count = 16, step = 6): Promise<string> {
    call('freeze', true);
    call('step', 1); // take control of the ticker before the move starts
    call('attack', slot, move);
    const cols = 4;
    const w = 426;
    const h = 240;
    const out = document.createElement('canvas');
    out.width = w * cols;
    out.height = h * Math.ceil(count / cols);
    const ctx = out.getContext('2d')!;
    ctx.font = '12px monospace';
    for (let i = 0; i < count; i++) {
      call('step', step);
      const img = new Image();
      img.src = await api.snapshot();
      await img.decode();
      const x = (i % cols) * w;
      const y = Math.floor(i / cols) * h;
      ctx.drawImage(img, x, y);
      ctx.fillStyle = '#0F0E17';
      ctx.fillRect(x, y, 120, 16);
      ctx.fillStyle = '#F4B41A';
      ctx.fillText(`${move} f${(i + 1) * step}`, x + 3, y + 12);
    }
    call('resume');
    return out.toDataURL('image/png');
  },

  /** Every exercise guide (exerciseGuide.ts): one row per exercise, its keyframes left to right. */
  async guideSheet(scale = 3): Promise<string> {
    const entries = Object.entries(EXERCISE_GUIDES);
    const w = POSE_W * scale;
    const h = POSE_H * scale + 14;
    const out = document.createElement('canvas');
    out.width = w * 3;
    out.height = h * entries.length;
    const ctx = out.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0F0E17';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.font = '11px monospace';
    for (const [row, [exercise, guide]] of entries.entries()) {
      const frames = getExerciseFrames(exercise as keyof typeof EXERCISE_GUIDES);
      for (const [col, url] of frames.entries()) {
        const img = new Image();
        img.src = url;
        await img.decode();
        ctx.drawImage(img, col * w, row * h + 14, w, POSE_H * scale);
        ctx.fillStyle = '#F4B41A';
        ctx.fillText(`${guide.name}: ${guide.frames[col].label}`, col * w + 3, row * h + 11);
      }
    }
    return out.toDataURL('image/png');
  },

  /** Every card illustration (cardArt.ts) in a 5-column grid at `scale`x, labelled. Returns a PNG data URL. */
  async cardArtSheet(scale = 3): Promise<string> {
    const cols = 5;
    const w = CARD_ART_W * scale;
    const h = CARD_ART_H * scale + 14;
    const out = document.createElement('canvas');
    out.width = w * cols;
    out.height = h * Math.ceil(CARD_CATALOG.length / cols);
    const ctx = out.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0F0E17';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.font = '11px monospace';
    for (const [i, card] of CARD_CATALOG.entries()) {
      const img = new Image();
      img.src = getCardArt(card.templateId);
      await img.decode();
      const x = (i % cols) * w;
      const y = Math.floor(i / cols) * h;
      ctx.drawImage(img, x, y + 14, CARD_ART_W * scale, CARD_ART_H * scale);
      ctx.fillStyle = '#F4B41A';
      ctx.fillText(`${card.name} (${card.templateId})`, x + 3, y + 11);
    }
    return out.toDataURL('image/png');
  },

  /** Textures currently held on the GPU, with an approximate VRAM total. */
  textures: () => call('textures'),
  /** PNG data URL of the Pixi canvas at native 426×240 (no React overlay). */
  snapshot: () => call('snapshot') as Promise<string>,
};

export type KKDebugApi = typeof api;

declare global {
  interface Window {
    __kk?: KKDebugApi;
  }
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__kk = api;
}
