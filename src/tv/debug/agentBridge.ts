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

/** Freezes battle ATB timers when a battle is mounted (so monsters don't act during captures). */
function freezeBattle(on: boolean): void {
  if (actions.has('freeze')) call('freeze', on);
}

/**
 * Film strip: takes control of the ticker, runs `start`, then captures the Pixi canvas every `step`
 * 60 fps frames. Returns a PNG data URL (4 columns of 426×240 frames, labelled `label fN`).
 */
async function filmStrip(label: string, start: () => void, count: number, step: number): Promise<string> {
  freezeBattle(true);
  call('step', 1); // take control of the ticker before the move starts
  start();
  const cols = 4;
  const w = 426;
  const h = 240;
  const out = document.createElement('canvas');
  out.width = w * cols;
  out.height = h * Math.ceil(count / cols);
  const ctx = out.getContext('2d')!;
  ctx.font = '12px monospace';
  try {
    for (let i = 0; i < count; i++) {
      call('step', step);
      const img = new Image();
      img.src = await api.snapshot();
      await img.decode();
      const x = (i % cols) * w;
      const y = Math.floor(i / cols) * h;
      ctx.drawImage(img, x, y);
      const text = `${label} f${(i + 1) * step}`;
      ctx.fillStyle = '#0F0E17';
      ctx.fillRect(x, y, ctx.measureText(text).width + 6, 16);
      ctx.fillStyle = '#F4B41A';
      ctx.fillText(text, x + 3, y + 12);
    }
  } finally {
    call('resume');
  }
  return out.toDataURL('image/png');
}

/**
 * Contact sheet of rig animations: one row per animation, `frames` evenly spaced poses, cropped from the
 * canvas. `pose(name, t)` freezes the rig on a pose; `pose(null)` restores it.
 */
async function contactSheet(
  title: string,
  animations: { name: string; duration: number; events?: { name: string; frame: number }[] }[],
  pose: (name: string | null, t?: number) => void,
  crop: { x: number; y: number; w: number; h: number },
  frames: number,
): Promise<string> {
  const labelH = animations.some((a) => a.events?.length) ? 24 : 12; // second line lists Spine events
  const out = document.createElement('canvas');
  out.width = crop.w * frames;
  out.height = (crop.h + labelH) * animations.length;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#0F0E17';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.font = '10px monospace';
  try {
    for (const [row, anim] of animations.entries()) {
      const y0 = row * (crop.h + labelH);
      for (let f = 0; f < frames; f++) {
        const t = frames === 1 ? 0 : (anim.duration * f) / (frames - 1);
        pose(anim.name, Math.min(t, Math.max(0, anim.duration - 0.001)));
        const img = new Image();
        img.src = await api.snapshot();
        await img.decode();
        ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, f * crop.w, y0 + labelH, crop.w, crop.h);
        ctx.fillStyle = '#F4B41A';
        ctx.fillText(`${title} ${anim.name} f${Math.round(t * 60)}/${Math.round(anim.duration * 60)}`, f * crop.w + 3, y0 + 10);
      }
      if (anim.events?.length) {
        ctx.fillStyle = '#38B6FF';
        ctx.fillText(`events: ${anim.events.map((e) => `${e.name}@f${e.frame}`).join('  ')}`, 3, y0 + 21);
      }
    }
  } finally {
    pose(null);
  }
  return out.toDataURL('image/png');
}

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
    return contactSheet(type, animations, (name, t) => call('pose', slot, name, t), crop, frames);
  },

  /**
   * Film strip of a monster move: triggers `move` on `slot`, then captures the Pixi canvas every
   * `step` frames by stepping the ticker deterministically. Returns a PNG data URL (4 columns).
   */
  async film(slot: number, move: string, count = 16, step = 6): Promise<string> {
    return filmStrip(move, () => call('attack', slot, move), count, step);
  },

  /**
   * Knight rig animations with durations and Spine events, in seconds and 60 fps frames
   * (e.g. DamToTarget marks hit frames). Use it to sync knight move timelines to the rig.
   */
  knightAnims: () => call('knightAnims') as { name: string; duration: number; frames: number; events: { name: string; time: number; frame: number }[] }[],
  /** Knight move ids (knightMoves.ts) and whether each is choreographed yet or still a legacy execute* method. */
  knightMoves: () => call('knightMoves') as { id: string; choreographed: boolean }[],
  /**
   * Plays a knight move now without touching battle state (stand-in damage labels). `targets` are monster
   * slots in hit order; default is the targeted monster.
   */
  knightMove: (id: string, targets?: number[], damage?: number) => call('knightMove', id, targets, damage),

  /**
   * Contact sheet of the knight rig's animations (all, or names matching the `filter` regex, e.g.
   * 'ATTACK|SKILL'), `frames` poses per row, cropped around the knight. Event frames are in each row label.
   */
  async knightSheet(frames = 6, filter?: string): Promise<string> {
    freezeBattle(true);
    await waitFor((s) => s.engine?.ready && s.engine.loading === 0);
    const all = call('knightAnims') as { name: string; duration: number; events: { name: string; frame: number }[] }[];
    const re = filter ? new RegExp(filter, 'i') : null;
    const animations = all.filter((a) => a.duration > 0 && (!re || re.test(a.name)));
    if (!animations.length) throw new Error(`[__kk] no knight animation matches /${filter}/; have: ${all.map((a) => a.name).join(', ')}`);
    const crop = { x: 40, y: 10, w: 200, h: 130 }; // knight feet at canvas (130, 118)
    return contactSheet('knight', animations, (name, t) => call('knightPose', name, t), crop, frames);
  },

  /** Film strip of a knight move (deterministic ticker steps), like film() for monsters. */
  async knightFilm(move: string, count = 16, step = 3, targets?: number[]): Promise<string> {
    return filmStrip(move, () => call('knightMove', move, targets), count, step);
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
