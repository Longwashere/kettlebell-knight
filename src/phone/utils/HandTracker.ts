import { RepTelemetry, ExerciseType, EXERCISE_SKILLS } from '../../types/game';
import { KinematicTracker, NormalizedLandmark, ArmSide } from './KinematicTracker';

/** Live phase of one tracked exercise, for display. */
export interface ExercisePhase {
  stateName: string;
  state: number;
  /** The arm this exercise's tracker follows as the one with the bell. */
  arm: ArmSide;
  /** Live measurements, where the tracker reports them (refreshed a few times a second). */
  detail?: string;
  /** The exercise's stage names in order; absent while the body check holds tracking back. */
  stages?: string[];
  /** Stage 0 with the start position met. */
  armed: boolean;
}

const DETAIL_REFRESH_MS = 250;

/** One exercise moving to a new stage (or meeting / losing its start position), as it happened. */
export interface StageEvent {
  exercise: ExerciseType;
  at: number;
  state: number;
  stateName: string;
  armed: boolean;
  arm: ArmSide;
  /** The tracker's measurements on this exact frame, where it reports them. */
  detail?: string;
  /** False when the body check took over (STEP BACK / stabilizing): the exercise isn't being tracked. */
  tracked: boolean;
}

/**
 * Hands-free battle tracking: one KinematicTracker per exercise in the TV's hand, all fed every frame.
 * Each counts its own reps, so a movement that satisfies two state machines (a thruster is a squat and a
 * press) scores a rep for both cards — compound movements are rewarded.
 *
 * Outside battle (no hand) a single tracker auto-routes across every exercise, so one movement sends
 * one rep (secret trials score other exercises as misses).
 */
export class HandTracker {
  private trackers = new Map<ExerciseType, KinematicTracker>();
  private phases = new Map<ExerciseType, ExercisePhase>();
  private visible = true;
  private missing: string[] = [];
  private midRep = false;
  private handMode = false;
  private lastDetailAt = 0;
  private lastStage = new Map<ExerciseType, string>();

  public onRepCompleted?: (telemetry: RepTelemetry) => void;
  /** Fires only when some exercise's phase name changes. */
  public onPhasesChange?: (phases: Map<ExerciseType, ExercisePhase>) => void;
  /** Fires only when full-body visibility changes. */
  public onVisibilityChange?: (visible: boolean, missingParts: string[]) => void;
  /** Fires on every stage change of every tracked exercise (for the test-mode stage log). */
  public onStageChange?: (event: StageEvent) => void;
  /** Fires when the first tracker leaves rest (state 1) or all return. */
  public onMidRepChange?: (midRep: boolean) => void;

  constructor() {
    this.setExercises(null);
  }

  /** The hand's exercises, or null for free (auto-routed) tracking. Trackers still in hand keep their mid-rep state. */
  public setExercises(exercises: ExerciseType[] | null): void {
    if (exercises) {
      if (!this.handMode) this.trackers.clear();
      const next = new Map<ExerciseType, KinematicTracker>();
      for (const ex of new Set(exercises)) next.set(ex, this.trackers.get(ex) ?? this.createTracker(ex));
      this.trackers = next;
      for (const ex of [...this.phases.keys()]) if (!next.has(ex)) this.phases.delete(ex);
    } else {
      if (this.handMode || this.trackers.size === 0) this.trackers = new Map([['SWING', this.createTracker(null)]]);
      this.phases.clear();
    }
    this.handMode = exercises !== null;
    this.onPhasesChange?.(new Map(this.phases));
  }

  private createTracker(exercise: ExerciseType | null): KinematicTracker {
    const tracker = new KinematicTracker();
    if (exercise) {
      tracker.setAutoRoute(false);
      tracker.setExercise(exercise);
    } else {
      tracker.setAutoRoute(true);
      tracker.setAllowedExercises(Object.keys(EXERCISE_SKILLS) as ExerciseType[]);
    }
    // Credit the card's exercise, in case a machine reports under another name
    tracker.onRepCompleted = (telemetry) =>
      this.onRepCompleted?.({ ...telemetry, exercise: exercise ?? telemetry.exercise });
    return tracker;
  }

  /** The working arm the trackers agree on most (for drawing). */
  public getArm(): ArmSide {
    const votes: Record<ArmSide, number> = { LEFT: 0, RIGHT: 0, BOTH: 0 };
    for (const tracker of this.trackers.values()) votes[tracker.getArmSide()]++;
    return (Object.keys(votes) as ArmSide[]).reduce((a, b) => (votes[b] > votes[a] ? b : a));
  }

  public processLandmarks(landmarks: NormalizedLandmark[], timestampMs: number): void {
    let phasesChanged = false;
    let visible = true;
    let missing: string[] = [];
    let midRep = false;
    const refreshDetail = timestampMs - this.lastDetailAt >= DETAIL_REFRESH_MS;

    for (const [ex, tracker] of this.trackers) {
      const update = tracker.processLandmarks(landmarks, timestampMs);
      if (update.isFullBodyVisible === false) {
        visible = false;
        missing = update.missingBodyParts ?? missing;
      }
      if (update.state === 1) midRep = true;
      const key = this.handMode ? ex : update.exercise;
      const prev = this.phases.get(key);
      const arm = update.arm ?? 'BOTH';
      const detail = refreshDetail ? update.debugNotes : prev?.detail;
      const armed = update.armed ?? false;
      const stageKey = `${update.stateName}|${armed}`;
      if (this.lastStage.get(key) !== stageKey) {
        this.lastStage.set(key, stageKey);
        this.onStageChange?.({
          exercise: key,
          at: timestampMs,
          state: update.state,
          stateName: update.stateName,
          armed,
          arm,
          detail: update.debugNotes,
          tracked: !!update.stages,
        });
      }
      if (!prev || prev.stateName !== update.stateName || prev.arm !== arm || prev.detail !== detail || prev.armed !== armed) {
        if (!this.handMode) this.phases.clear();
        this.phases.set(key, { stateName: update.stateName, state: update.state, arm, detail, stages: update.stages, armed });
        phasesChanged = true;
      }
    }

    if (refreshDetail) this.lastDetailAt = timestampMs;
    if (phasesChanged) this.onPhasesChange?.(new Map(this.phases));
    if (visible !== this.visible || missing.join() !== this.missing.join()) {
      this.visible = visible;
      this.missing = missing;
      this.onVisibilityChange?.(visible, missing);
    }
    if (midRep !== this.midRep) {
      this.midRep = midRep;
      this.onMidRepChange?.(midRep);
    }
  }
}
