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
