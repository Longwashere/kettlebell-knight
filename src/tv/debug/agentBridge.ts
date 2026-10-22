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
import { audioManager } from '../../shared/AudioManager';
import { CARD_CATALOG, MONSTER_CATALOG, STARTER_CARD_IDS } from '../../types/battle';
import { ALL_WEAPON_SPELLS } from '../../types/weaponSpells';
import { MOVESETS } from '../../shared/monsterMovesets';
import type { MoveTraceReport } from '../engine/moveTrace';
import { VFX_NAMES } from '../engine/vfx';
import { getCardArt, CARD_ART_W, CARD_ART_H } from '../components/cardArt';
import { EXERCISE_GUIDES, getExerciseFrames, POSE_W, POSE_H } from '../components/exerciseGuide';

import { profileManager } from '../../shared/ProfileManager';

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

// Sound bank: what played (state().audio), and `call('audioReset')` to count a single move's sounds
registerDebug('audio', () => audioManager.debugState(), { audioReset: () => audioManager.debugState(true) });

// Network: `call('fakePaired', true)` shows the TV as phone-paired (no real peer) to check paired-only UI
registerDebug('network', () => ({ state: networkManager.getState() }), {
  fakePaired: (on = true) => (networkManager as any).setState(on ? 'CONNECTED' : 'WAITING_FOR_PEER', 'debug'),
});

// Player profile: progression data and slot management
registerDebug(
  'profile',
  () => ({
    hasProfile: profileManager.hasSavedProfile(),
    activeProfile: profileManager.getActiveProfile(),
    slots: profileManager.getAllSlots(),
  }),
  {
    'profile.reset': () => {
      profileManager.clearAll();
      return { success: true };
    },
    'profile.create': (name?: string, slotId?: string) => {
      return profileManager.createProfile(slotId || 'slot_1', name || 'TEST KNIGHT');
    },
    'profile.load': (slotId: string) => {
      return profileManager.loadProfile(slotId);
    },
    'profile.delete': (slotId: string) => {
      return profileManager.deleteProfile(slotId);
    },
    // Merges fields into the active profile, e.g. patch({ level: 6, gold: 500, unlockStats: { monsterKills: {} } })
    'profile.patch': (patch: Record<string, unknown>) => {
      profileManager.saveActiveProfile(patch as any);
      return profileManager.getActiveProfile();
    },
    'profile.setProgress':(mapId: string, levelCleared: number, unlockedMaps?: string[]) => {
      const p = profileManager.getActiveProfile();
      if (!p) return null;
      const id = mapId.toUpperCase() as any;
      const maps = unlockedMaps ? (unlockedMaps as any) : p.unlockedMaps.includes(id) ? p.unlockedMaps : [...p.unlockedMaps, id];
      profileManager.saveActiveProfile({
        unlockedMaps: maps,
        mapProgress: {
          ...p.mapProgress,
          [id]: { highestLevelCleared: levelCleared, totalClears: 1, bestReps: 10 },
        },
      });
      return profileManager.getActiveProfile();
    },
  }
);

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
        // Name once per row (long names would overrun the cells), then just the frame
        ctx.fillText(f === 0 ? `${title} ${anim.name} f0/${Math.round(anim.duration * 60)}` : `f${Math.round(t * 60)}`, f * crop.w + 3, y0 + 10);
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

type MoveInfo = { move: string; name: string; type: string };
type TraceState = MoveTraceReport & { done: boolean };

/** The moveset (choreographed moves only) of the monster in `slot`, from MOVESETS. */
function slotMoves(slot: number): { id: string; moves: MoveInfo[] } {
  const m = (state().battle as any)?.monsters?.[slot];
  if (!m) throw new Error(`[__kk] no monster in slot ${slot}`);
  const moves = (MOVESETS[m.id] ?? []).filter((t) => t.move).map((t) => ({ move: t.move as string, name: t.name, type: t.type }));
  return { id: m.id, moves };
}

const selfTargeted = (type: string) => type === 'DEFEND' || type === 'BUFF';

/**
 * Plays `move` on `slot` with the ticker under manual control, one frame at a time, calling `onFrame`
 * after each. Stops when the move's trace is done. Returns the final trace.
 */
async function runTracedMove(slot: number, move: MoveInfo, onFrame?: (frame: number, trace: TraceState, length: number) => Promise<void> | void): Promise<TraceState> {
  call('step', 1);
  const length = call('monsterMove', slot, move.move, selfTargeted(move.type)) as number | null;
  if (length === null) throw new Error(`[__kk] ${move.move} did not start on slot ${slot}`);
  let trace = call('moveTrace') as TraceState;
  for (let f = 1; f <= length + 60 && !trace.done; f++) {
    call('step', 1);
    trace = call('moveTrace') as TraceState;
    await onFrame?.(f, trace, length);
  }
  call('step', 30); // let hit reactions and particles clear before the next move
  return trace;
}

async function grab(): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = await api.snapshot();
  await img.decode();
  return img;
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

  /** Switch TV view: 'HUB' | 'BLACKSMITH' | 'COMBAT' | 'SANCTUARY'. Resolves when the view is up. */
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
    if (typeof which === 'string' && which.includes(',')) {
      which = which.split(',').map((s) => s.trim());
    }
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
    type Posed = { type: string; animations: { name: string; duration: number }[]; bounds: { x: number; y: number; w: number; h: number } };
    const { animations, type } = call('pose', slot, null) as Posed;
    // Crop to this monster: the union of its bounds across a few poses of every animation
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    try {
      for (const a of animations) {
        for (const u of [0, 0.5, 0.99]) {
          const { bounds: b } = call('pose', slot, a.name, a.duration * u) as Posed;
          if (b.w <= 0 || b.h <= 0) continue;
          x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h);
        }
      }
    } finally {
      call('pose', slot, null);
    }
    const pad = 6;
    const cx = Math.max(0, Math.floor((Number.isFinite(x0) ? x0 : 170) - pad));
    const cy = Math.max(0, Math.floor((Number.isFinite(y0) ? y0 : 0) - pad));
    const crop = {
      x: cx,
      y: cy,
      w: Math.max(60, Math.min(426 - cx, Math.ceil((Number.isFinite(x1) ? x1 : 400) + pad - cx))),
      h: Math.max(60, Math.min(240 - cy, Math.ceil((Number.isFinite(y1) ? y1 : 175) + pad - cy))),
    };
    return contactSheet(type, animations, (name, t) => call('pose', slot, name, t), crop, frames);
  },

  /**
   * Film strip of a monster move: triggers `move` on `slot`, then captures the Pixi canvas every
   * `step` frames by stepping the ticker deterministically. Returns a PNG data URL (4 columns).
   */
  async film(slot: number, move: string, count = 16, step = 6): Promise<string> {
    return filmStrip(move, () => call('attack', slot, move), count, step);
  },

  /** Choreographed moves of the monster in `slot`: [{ move, name, type }]. */
  moves: (slot = 0) => slotMoves(slot).moves,

  /**
   * Plays every move of the monster in `slot` (or just `only`) frame by frame without touching battle
   * state, and returns a trace report per move: impact frame, length, lesser hits, plus errors (threw,
   * never called h.impact) and warnings (missing rig animation, nothing reached the knight just before
   * impact, monster not back at rest, damage label before lesser hits, very long).
   */
  async moveCheck(slot = 0, only?: string[]): Promise<{ monster: string; reports: MoveTraceReport[] }> {
    freezeBattle(true);
    const { id, moves } = slotMoves(slot);
    const reports: MoveTraceReport[] = [];
    try {
      for (const m of moves) {
        if (only?.length && !only.includes(m.move)) continue;
        const { done: _done, ...report } = await runTracedMove(slot, m);
        reports.push(report);
      }
    } finally {
      call('resume');
    }
    return { monster: id, reports };
  },

  /**
   * One sheet with every move of the monster in `slot`: a row per move, `frames` shots spread over the
   * move plus the exact impact frame (red border). Row labels carry the trace findings. PNG data URL.
   */
  async films(slot = 0, frames = 6): Promise<string> {
    freezeBattle(true);
    const { id, moves } = slotMoves(slot);
    const cw = 284; // 2/3 of the 426×240 canvas
    const ch = 160;
    const labelH = 28;
    const cols = frames + 1;
    const out = document.createElement('canvas');
    out.width = cw * cols;
    out.height = (ch + labelH) * moves.length;
    const ctx = out.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0F0E17';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.font = '11px monospace';
    try {
      for (const [row, m] of moves.entries()) {
        const shots: { frame: number; img: HTMLImageElement; impact: boolean }[] = [];
        let schedule: number[] = [];
        let impactSeen = false;
        const trace = await runTracedMove(slot, m, async (f, t, length) => {
          if (!schedule.length) schedule = Array.from({ length: frames }, (_, k) => Math.max(1, Math.round(((k + 0.5) * length) / frames)));
          const isImpact = !impactSeen && t.impactFrame !== null;
          if (isImpact) impactSeen = true;
          if (isImpact || schedule.includes(f)) shots.push({ frame: f, img: await grab(), impact: isImpact });
        });
        shots.sort((a, b) => a.frame - b.frame);
        const y0 = row * (ch + labelH);
        const findings = [...trace.errors.map((e) => `ERR ${e}`), ...trace.warnings];
        ctx.fillStyle = trace.errors.length ? '#FF3366' : findings.length ? '#FBBF24' : '#00EB88';
        ctx.fillText(`${id} · ${m.move} (${m.name}, ${m.type}) · ${trace.length}f · impact @f${trace.impactFrame ?? '—'}`, 4, y0 + 11);
        ctx.fillStyle = '#A8A29E';
        ctx.fillText(findings.length ? findings.join(' | ').slice(0, 220) : 'no findings', 4, y0 + 24);
        for (const [col, shot] of shots.slice(0, cols).entries()) {
          const x = col * cw;
          ctx.drawImage(shot.img, x, y0 + labelH, cw, ch);
          ctx.fillStyle = '#0F0E17';
          ctx.fillRect(x, y0 + labelH, shot.impact ? 70 : 34, 13);
          ctx.fillStyle = shot.impact ? '#FF3366' : '#F4B41A';
          ctx.fillText(shot.impact ? `f${shot.frame} IMPACT` : `f${shot.frame}`, x + 3, y0 + labelH + 10);
          if (shot.impact) {
            ctx.strokeStyle = '#FF3366';
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 1.5, y0 + labelH + 1.5, cw - 3, ch - 3);
          }
        }
      }
    } finally {
      call('resume');
    }
    return out.toDataURL('image/png');
  },

  /** The monster in `slot` cropped tight from the canvas (idle pose), at `scale`x. PNG data URL. */
  async portrait(slot = 0, scale = 2): Promise<string> {
    freezeBattle(true);
    const { bounds } = call('pose', slot, null) as { bounds: { x: number; y: number; w: number; h: number } };
    const pad = 6;
    const x = Math.max(0, bounds.x - pad);
    const y = Math.max(0, bounds.y - pad);
    const w = Math.min(426 - x, bounds.w + pad * 2);
    const h = Math.min(240 - y, bounds.h + pad * 2);
    const img = await grab();
    const out = document.createElement('canvas');
    out.width = w * scale;
    out.height = h * scale;
    const ctx = out.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, x, y, w, h, 0, 0, w * scale, h * scale);
    return out.toDataURL('image/png');
  },

  /**
   * VFX rigs (vfx.ts) measured at size 1: per animation, its length and the largest on-stage bounds over
   * 12 sampled poses. Needs an encounter up (VFX load with the monsters).
   */
  vfxInfo(): { name: string; anim: string; frames: number; w: number; h: number }[] {
    const out: { name: string; anim: string; frames: number; w: number; h: number }[] = [];
    try {
      for (const name of VFX_NAMES) {
        const first = call('vfxPose', name) as { animations: { name: string; duration: number }[] };
        for (const a of first.animations) {
          let w = 0;
          let h = 0;
          for (let k = 0; k < 12; k++) {
            const { bounds } = call('vfxPose', name, a.name, (a.duration * k) / 11) as { bounds: { w: number; h: number } };
            w = Math.max(w, bounds.w);
            h = Math.max(h, bounds.h);
          }
          out.push({ name, anim: a.name, frames: Math.round(a.duration * 60), w, h });
        }
      }
    } finally {
      call('vfxPose', null);
    }
    return out;
  },

  /**
   * Contact sheet of VFX rigs (all, or `name`): a row per animation, `frames` poses at size `size`,
   * shown mid-stage over the current arena so it reads at game scale. PNG data URL.
   */
  async vfxSheet(name?: string, frames = 8, size = 1): Promise<string> {
    freezeBattle(true);
    const names = name ? [name] : VFX_NAMES;
    const rows: { name: string; duration: number; rig: string }[] = [];
    for (const n of names) {
      const { animations } = call('vfxPose', n) as { animations: { name: string; duration: number }[] };
      for (const a of animations) rows.push({ name: a.name, duration: a.duration, rig: n });
    }
    call('vfxPose', null);
    const crop = { x: 213 - 75, y: 130 - 75, w: 150, h: 150 };
    let rig = rows[0]?.rig;
    return contactSheet('', rows.map((r) => ({ name: `${r.rig}/${r.name}`, duration: r.duration })), (anim, t) => {
      if (anim === null) return call('vfxPose', null);
      const [n, a] = anim.split('/');
      rig = n;
      return call('vfxPose', rig, a, t, size);
    }, crop, frames);
  },

  /** MONSTER_CATALOG ids (for looping over the bestiary). */
  monsterIds: () => MONSTER_CATALOG.map((c) => c.id),

  /**
   * Knight rig animations with durations and Spine events, in seconds and 60 fps frames
   * (e.g. DamToTarget marks hit frames). Use it to sync knight move timelines to the rig.
   */
  knightAnims: () => call('knightAnims') as { name: string; duration: number; frames: number; events: { name: string; time: number; frame: number }[] }[],
  /** Knight move ids (knightMoves.ts, one per CARD_CATALOG templateId) with their card's rarity, targeting, Block and heal. */
  knightMoves: () => call('knightMoves') as { id: string; rarity: string; target: string; block: number; heal: number }[],
  /**
   * Plays a knight move now without touching battle state (stand-in damage labels). `targets` are monster
   * slots in hit order; default is the targeted monster.
   */
  /** Equip/preview equipment slot on the knight skeleton. */
  equip: (slot: string, attachment: string) => call('equip', slot, attachment),
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
    const crop = { x: 30, y: 40, w: 200, h: 140 }; // knight feet at canvas (130, 168), head at y~90
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

  /** Every card illustration (cardArt.ts) in a 5-column grid at `scale`x, labelled; `spells` = the weapon spell cards. Returns a PNG data URL. */
  async cardArtSheet(scale = 3, spells = false): Promise<string> {
    const cards = spells ? ALL_WEAPON_SPELLS : CARD_CATALOG;
    const cols = 5;
    const w = CARD_ART_W * scale;
    const h = CARD_ART_H * scale + 14;
    const out = document.createElement('canvas');
    out.width = w * cols;
    out.height = h * Math.ceil(cards.length / cols);
    const ctx = out.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0F0E17';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.font = '11px monospace';
    for (const [i, card] of cards.entries()) {
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

  /** Unlocks a specific card templateId in the active player profile. */
  unlockCard: (templateId: string) => profileManager.unlockCard(templateId),
  /** Unlocks all cards in the master catalog. */
  unlockAllCards: () => {
    const ids = CARD_CATALOG.map((c) => c.templateId);
    profileManager.saveActiveProfile({ unlockedCards: ids });
    return ids.length;
  },
  /** Resets player profile cards back to only starter cards. */
  resetCards: () => {
    profileManager.saveActiveProfile({
      unlockedCards: [...STARTER_CARD_IDS],
      unlockStats: {
        monsterKills: {},
        exerciseReps: {},
        mapExerciseReps: {},
        perfectFormReps: {},
        highPowerReps: {},
        peakPower: {},
        totalBlockedDamage: 0,
      },
    });
    return STARTER_CARD_IDS.length;
  },
  /** Removes cards from the active profile's unlocked list, so their unlock can be earned again. */
  relockCards: (templateIds: string[]) => {
    const unlocked = profileManager.getActiveProfile()?.unlockedCards;
    if (!unlocked) return null;
    return profileManager.saveActiveProfile({ unlockedCards: unlocked.filter((id) => !templateIds.includes(id)) })?.unlockedCards;
  },
  /** Merges unlock progress into the profile (e.g. { exerciseReps: { SWING: 34 } }) so the next rep unlocks a card. */
  primeUnlockStats: (stats: Partial<NonNullable<ReturnType<typeof profileManager.getActiveProfile>>['unlockStats']>) => {
    const current = profileManager.getActiveProfile()?.unlockStats;
    if (!current) return null;
    return profileManager.saveActiveProfile({ unlockStats: { ...current, ...stats } })?.unlockStats;
  },
  /** Returns current unlocked cards and unlock progress stats. */
  getCardUnlocks: () => {
    const p = profileManager.getActiveProfile();
    return {
      unlocked: p?.unlockedCards || [],
      stats: p?.unlockStats,
    };
  },
  /** Navigates to MAP_SELECT and opens the specified stage cinematic (defaults to VERDANT_FOREST). */
  async playCinematic(mapId: string = 'VERDANT_FOREST'): Promise<void> {
    call('goto', 'MAP_SELECT');
    await sleep(200);
    call('setMap', mapId);
    await sleep(50);
    call('cinematic', true);
  },
};

export type KKDebugApi = typeof api;

declare global {
  interface Window {
    __kk?: KKDebugApi;
    playCinematic?: (mapId?: string) => Promise<void>;
  }
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__kk = api;
  window.playCinematic = api.playCinematic;
}
