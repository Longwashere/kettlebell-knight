import type { BattleMapId } from '../types/battle';
import type { ExerciseType } from '../types/game';

/**
 * Secret stages: each seals one stone-bound legendary weapon (SHOP_ITEMS `stoneBound`) on its maps. After an
 * expedition level clear there, the trial may appear; the knight gets one try. Success claims the weapon, failure
 * sends them back to town. A trial stops appearing once its weapon is won. Keyed by the weapon it seals (the id is
 * also its SHOP_ITEMS id).
 *
 *   excalibell          The Enchanted Stone (forests): 100 goblet squats in 60s pull the bell from the stone.
 *   bellringer_mallet   The High Striker (Town Square, by night): 30 swings hard enough to ring the bell, in 45s.
 *   leviathan_anchor    The Drowned Anchor (Sunken Cistern): gorilla rows haul it up before the water closes over.
 *   everburning_censer  The Last Vigil (Cathedral Crypt): halos keep the candles lit until the censer wakes.
 *   dead_weight         The Pallbearer's Grave (Blood Cemetery): 66 deadlifts before an eclipse turns the moon red.
 *   tolling_thunder     The Great Bell (Belfry Ramparts): snatches only count on the storm's beat.
 *   midas_bell          The Gilded Vault (Cathedral Vault): thrusters build steam faster than the door bleeds it.
 *   heartforge          The Titan's Anvil (Volcanic Forge): clean & presses forge the blade before the iron cools.
 *   hollow_bell         The Hollow Choir (Eldritch Altar): single-leg RDLs while the rift lies to the knight.
 *   excalibane          The Thirteen Labours (Obsidian Throne): 3 reps of every exercise; only for Excalibell's bearer.
 */
export type SecretTrialId =
  | 'excalibell' | 'bellringer_mallet' | 'leviathan_anchor' | 'everburning_censer' | 'dead_weight'
  | 'tolling_thunder' | 'midas_bell' | 'heartforge' | 'hollow_bell' | 'excalibane';

/**
 * How a trial is won and lost. Every trial also has a hard time limit (`seconds`).
 *   race      `reps` reps before the time runs out
 *   power     as race, but only reps with power ≥ `minPower` count
 *   drain     a danger meter fills by `fill` per second and each rep pushes it back by `push`; lost when it is full
 *   leak      each rep adds 1/`reps` of progress, which leaks away at `leak` per second; won when it is full
 *   rhythm    a beat every `beat` seconds; only reps within `window` seconds of a beat count
 *   gauntlet  `reps` of each of `exercises`, in order
 */
export type TrialMechanic =
  | { kind: 'race' }
  | { kind: 'power'; minPower: number }
  | { kind: 'drain'; fill: number; push: number }
  | { kind: 'leak'; leak: number }
  | { kind: 'rhythm'; beat: number; window: number }
  | { kind: 'gauntlet'; exercises: ExerciseType[] };

export interface SecretTrialSpec {
  id: SecretTrialId;
  /** The exercise (the first one, for a gauntlet). */
  exercise: ExerciseType;
  reps: number;
  seconds: number;
  mechanic: TrialMechanic;
  /** The screen lies: fake counts and failures flicker over the HUD (the Hollow Choir). */
  lies?: boolean;
  /** Chance to meet the trial after a level clear on `maps`, plus `chancePerRep` per `exercise` rep done that level. */
  baseChance: number;
  chancePerRep: number;
  maps: BattleMapId[];
  /** The trial's backdrop when it is not the map the knight came from (default: maps[0]). */
  backdrop?: BattleMapId;
  /** Every knight meets the trial on clearing this stage if they haven't met it already. */
  guaranteed: { mapId: BattleMapId; level: number };
  /** Only a knight who holds this trial's weapon may meet it. */
  requires?: SecretTrialId;
}

const ALL_EXERCISES: ExerciseType[] = [
  'SWING', 'SQUAT', 'CLEAN_AND_PRESS', 'SNATCH', 'WINDMILL', 'DEADLIFT', 'OVERHEAD_PRESS', 'THRUSTER',
  'GORILLA_ROW', 'AROUND_THE_BODY', 'SINGLE_LEG_RDL', 'CLEAN', 'LUNGE',
];

const trial = (spec: Omit<SecretTrialSpec, 'baseChance' | 'chancePerRep'> & Partial<SecretTrialSpec>): SecretTrialSpec => ({
  baseChance: 0.1,
  chancePerRep: 0.01,
  ...spec,
});

export const SECRET_TRIALS: Record<SecretTrialId, SecretTrialSpec> = {
  excalibell: trial({
    id: 'excalibell', exercise: 'SQUAT', reps: 100, seconds: 60, mechanic: { kind: 'race' },
    maps: ['VERDANT_FOREST', 'DARK_FOREST'], guaranteed: { mapId: 'DARK_FOREST', level: 1 },
  }),
  bellringer_mallet: trial({
    id: 'bellringer_mallet', exercise: 'SWING', reps: 30, seconds: 45, mechanic: { kind: 'power', minPower: 70 },
    maps: ['TOWN_SQUARE', 'TOWN_NIGHT'], backdrop: 'TOWN_NIGHT', guaranteed: { mapId: 'TOWN_SQUARE', level: 2 },
  }),
  leviathan_anchor: trial({
    id: 'leviathan_anchor', exercise: 'GORILLA_ROW', reps: 50, seconds: 90, mechanic: { kind: 'drain', fill: 1 / 40, push: 0.03 },
    maps: ['SUNKEN_CISTERN'], guaranteed: { mapId: 'SUNKEN_CISTERN', level: 2 },
  }),
  everburning_censer: trial({
    id: 'everburning_censer', exercise: 'AROUND_THE_BODY', reps: 40, seconds: 90, mechanic: { kind: 'drain', fill: 1 / 30, push: 0.045 },
    maps: ['CATHEDRAL_CRYPT'], guaranteed: { mapId: 'CATHEDRAL_CRYPT', level: 2 },
  }),
  dead_weight: trial({
    id: 'dead_weight', exercise: 'DEADLIFT', reps: 66, seconds: 66, mechanic: { kind: 'race' },
    maps: ['BLOOD_CEMETERY'], guaranteed: { mapId: 'BLOOD_CEMETERY', level: 2 },
  }),
  tolling_thunder: trial({
    id: 'tolling_thunder', exercise: 'SNATCH', reps: 30, seconds: 75, mechanic: { kind: 'rhythm', beat: 1.6, window: 0.45 },
    maps: ['BELFRY_RAMPARTS'], guaranteed: { mapId: 'BELFRY_RAMPARTS', level: 2 },
  }),
  midas_bell: trial({
    id: 'midas_bell', exercise: 'THRUSTER', reps: 40, seconds: 90, mechanic: { kind: 'leak', leak: 0.012 },
    maps: ['CATHEDRAL_VAULT'], guaranteed: { mapId: 'CATHEDRAL_VAULT', level: 2 },
  }),
  heartforge: trial({
    id: 'heartforge', exercise: 'CLEAN_AND_PRESS', reps: 45, seconds: 90, mechanic: { kind: 'drain', fill: 1 / 20, push: 0.07 },
    maps: ['VOLCANIC_FORGE'], guaranteed: { mapId: 'VOLCANIC_FORGE', level: 2 },
  }),
  hollow_bell: trial({
    id: 'hollow_bell', exercise: 'SINGLE_LEG_RDL', reps: 40, seconds: 80, mechanic: { kind: 'race' }, lies: true,
    maps: ['ELDRITCH_ALTAR'], guaranteed: { mapId: 'ELDRITCH_ALTAR', level: 2 },
  }),
  excalibane: trial({
    id: 'excalibane', exercise: ALL_EXERCISES[0], reps: 3, seconds: 150, mechanic: { kind: 'gauntlet', exercises: ALL_EXERCISES },
    // Any Obsidian Throne rep counts toward it: the throne answers effort, not one exercise
    chancePerRep: 0.004,
    maps: ['OBSIDIAN_THRONE'], guaranteed: { mapId: 'OBSIDIAN_THRONE', level: 2 }, requires: 'excalibell',
  }),
};

export const SECRET_TRIAL_LIST = Object.values(SECRET_TRIALS);

export const isSecretTrialId = (id: unknown): id is SecretTrialId => typeof id === 'string' && id in SECRET_TRIALS;

/** Reps needed in all: `reps`, or `reps` of each exercise in a gauntlet. */
export const trialGoal = (spec: SecretTrialSpec) =>
  spec.mechanic.kind === 'gauntlet' ? spec.reps * spec.mechanic.exercises.length : spec.reps;

/** Saved on the profile per trial: how often it appeared and whether its weapon was won. */
export interface SecretTrialRecord {
  encounters: number;
  won: boolean;
}

interface TrialProfile {
  secretTrials?: Partial<Record<SecretTrialId, SecretTrialRecord>>;
  /** Saves from before the registry kept the Excalibell record here. */
  excalibellTrial?: SecretTrialRecord;
  unlockedItems?: string[];
  equippedItems?: { weapon?: string };
}

export const trialRecord = (profile: TrialProfile | null | undefined, id: SecretTrialId): SecretTrialRecord | undefined =>
  profile?.secretTrials?.[id] ?? (id === 'excalibell' ? profile?.excalibellTrial : undefined);

/** Whether the knight already holds a trial's weapon (won, bought before it was sealed, or equipped). */
const holds = (profile: TrialProfile, id: SecretTrialId) =>
  Boolean(trialRecord(profile, id)?.won || profile.unlockedItems?.includes(id) || profile.equippedItems?.weapon === id);

export const secretTrialChance = (spec: SecretTrialSpec, reps: number) =>
  Math.min(1, spec.baseChance + spec.chancePerRep * Math.max(0, reps));

/**
 * Which secret trial (if any) clearing `mapId` level `level` leads to. `repsOf` counts the level's reps of an
 * exercise. At most one trial per clear.
 */
export function rollSecretTrial(
  profile: TrialProfile | null,
  mapId: BattleMapId,
  level: number,
  repsOf: (exercise: ExerciseType) => number,
  rand: () => number = Math.random,
): SecretTrialId | null {
  if (!profile) return null;
  for (const spec of SECRET_TRIAL_LIST) {
    if (!spec.maps.includes(mapId) || holds(profile, spec.id)) continue;
    if (spec.requires && !holds(profile, spec.requires)) continue;
    const g = spec.guaranteed;
    if (g.mapId === mapId && level === g.level && !trialRecord(profile, spec.id)?.encounters) return spec.id;
    const reps = spec.mechanic.kind === 'gauntlet'
      ? spec.mechanic.exercises.reduce((sum, ex) => sum + repsOf(ex), 0)
      : repsOf(spec.exercise);
    if (rand() < secretTrialChance(spec, reps)) return spec.id;
  }
  return null;
}

export type TrialRepResult = 'counted' | 'wrong' | 'weak' | 'offbeat';

/**
 * One attempt at a trial: the rules of its mechanic, independent of the screen. The trial screen ticks it every
 * frame once the clock starts and feeds it reps; the scene reads `progress` and `danger`.
 */
export class TrialRun {
  /** Reps that counted. */
  count = 0;
  /** Seconds since the clock started. */
  elapsed = 0;
  /** 0–1 toward the win (a leak trial's progress also drains). */
  progress = 0;
  /** 0–1 toward the loss: the drain meter, else the share of the time limit gone. */
  danger = 0;
  result: 'won' | 'lost' | null = null;

  constructor(readonly spec: SecretTrialSpec) {}

  get goal(): number {
    return trialGoal(this.spec);
  }

  /** The exercise that counts now (moves along a gauntlet). */
  get exercise(): ExerciseType {
    const m = this.spec.mechanic;
    return m.kind === 'gauntlet' ? m.exercises[Math.min(m.exercises.length - 1, Math.floor(this.count / this.spec.reps))] : this.spec.exercise;
  }

  /** Gauntlet: which exercise (0-based) and how many of its reps are done. */
  get stage(): { index: number; done: number } {
    return { index: Math.floor(this.count / this.spec.reps), done: this.count % this.spec.reps };
  }

  /** Seconds left on the hard limit. */
  get secondsLeft(): number {
    return Math.max(0, this.spec.seconds - this.elapsed);
  }

  /** Rhythm: 0–1 through the current beat (0 = on it). */
  get beatPhase(): number {
    const m = this.spec.mechanic;
    return m.kind === 'rhythm' ? (this.elapsed % m.beat) / m.beat : 0;
  }

  /** Advances the clock; returns the result if the trial just ended. */
  tick(dt: number): 'won' | 'lost' | null {
    if (this.result) return null;
    this.elapsed += dt;
    const m = this.spec.mechanic;
    if (m.kind === 'drain') this.danger = Math.min(1, this.danger + m.fill * dt);
    else this.danger = Math.min(1, this.elapsed / this.spec.seconds);
    if (m.kind === 'leak') this.progress = Math.max(0, this.progress - m.leak * dt);
    if (this.danger >= 1 || this.elapsed >= this.spec.seconds) return (this.result = 'lost');
    return null;
  }

  /** A rep arrives. `won` once the goal is reached. */
  rep(exercise: ExerciseType, power = 80): { result: TrialRepResult; won: boolean } {
    if (this.result) return { result: 'wrong', won: false };
    const m = this.spec.mechanic;
    if (exercise !== this.exercise) return { result: 'wrong', won: false };
    if (m.kind === 'power' && power < m.minPower) return { result: 'weak', won: false };
    if (m.kind === 'rhythm') {
      const into = this.elapsed % m.beat;
      if (Math.min(into, m.beat - into) > m.window) return { result: 'offbeat', won: false };
    }
    this.count += 1;
    if (m.kind === 'drain') this.danger = Math.max(0, this.danger - m.push);
    if (m.kind === 'leak') this.progress = Math.min(1, this.progress + 1 / this.spec.reps);
    else this.progress = Math.min(1, this.count / this.goal);
    const won = this.progress >= 1;
    if (won) this.result = 'won';
    return { result: 'counted', won };
  }
}
