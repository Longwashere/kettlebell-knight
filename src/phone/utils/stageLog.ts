import type { ExerciseType } from '../../types/game';
import type { ArmSide } from './KinematicTracker';
import type { StageEvent } from './HandTracker';

/** One stage reached during an attempt, with the tracker's measurements on that frame. */
export interface StageStep {
  at: number;
  stateName: string;
  /** The tracker's stage index; REP_STEP marks the moment the rep counted. */
  state: number;
  armed: boolean;
  detail?: string;
}

export type AttemptOutcome = 'rep' | 'missed' | 'lost-sight' | 'open';

/**
 * One try at an exercise: from meeting its start position (or leaving stage 0) until it counts a rep or falls back.
 * Standing in the start position and stepping out again without moving isn't an attempt and isn't kept.
 */
export interface StageAttempt {
  id: number;
  exercise: ExerciseType;
  arm: ArmSide;
  startedAt: number;
  endedAt?: number;
  steps: StageStep[];
  outcome: AttemptOutcome;
  /** Why a missed attempt fell back, where the tracker says (e.g. the swing's best bell / hinge / knee). */
  endNote?: string;
  power?: number;
  form?: number;
}

const MAX_ATTEMPTS = 150;
export const REP_STEP = -1;

/** Builds the test-mode stage log from HandTracker stage events and reps. Newest attempt first. */
export class StageLog {
  private open = new Map<ExerciseType, StageAttempt>();
  private nextId = 1;
  public attempts: StageAttempt[] = [];

  public clear(): void {
    this.open.clear();
    this.attempts = [];
  }

  public onStage(e: StageEvent): void {
    let attempt = this.open.get(e.exercise);

    if (!e.tracked) {
      // The body check took over mid-attempt
      if (attempt) this.close(attempt, attempt.power !== undefined ? 'rep' : 'lost-sight', e.at);
      return;
    }

    if (e.state === 0) {
      if (attempt) {
        const movedOn = attempt.steps.some((s) => s.state > 0);
        if (attempt.power !== undefined) this.close(attempt, 'rep', e.at);
        else if (movedOn) {
          this.close(attempt, 'missed', e.at);
          attempt.endNote = e.detail;
        }
        else if (!e.armed) this.discard(attempt); // stood in the start position and left it without moving
        else return this.addStep(attempt, e);
        attempt = undefined;
      }
      // Start position met: a new attempt begins
      if (e.armed) this.start(e);
      return;
    }

    if (!attempt) attempt = this.start(e);
    else this.addStep(attempt, e);
  }

  public onRep(exercise: ExerciseType, power: number, form: number, at: number): void {
    const attempt = this.open.get(exercise) ?? this.start({ exercise, at, state: 0, stateName: '?', armed: false, arm: 'BOTH', tracked: true });
    attempt.power = power;
    attempt.form = form;
    attempt.outcome = 'rep';
    attempt.steps.push({ at, stateName: 'REP COUNTED', state: REP_STEP, armed: false });
  }

  private start(e: StageEvent): StageAttempt {
    const attempt: StageAttempt = {
      id: this.nextId++,
      exercise: e.exercise,
      arm: e.arm,
      startedAt: e.at,
      steps: [],
      outcome: 'open',
    };
    this.addStep(attempt, e);
    this.open.set(e.exercise, attempt);
    this.attempts = [attempt, ...this.attempts].slice(0, MAX_ATTEMPTS);
    return attempt;
  }

  private addStep(attempt: StageAttempt, e: StageEvent): void {
    attempt.arm = e.arm;
    const step = { at: e.at, stateName: e.stateName, state: e.state, armed: e.armed, detail: e.detail };
    // A rep fires inside the frame that also moves the stage: list the stage first, then the rep
    const last = attempt.steps[attempt.steps.length - 1];
    if (last?.state === REP_STEP && last.at === e.at) attempt.steps.splice(attempt.steps.length - 1, 0, step);
    else attempt.steps.push(step);
  }

  private close(attempt: StageAttempt, outcome: AttemptOutcome, at: number): void {
    attempt.outcome = outcome;
    attempt.endedAt = at;
    this.open.delete(attempt.exercise);
  }

  private discard(attempt: StageAttempt): void {
    this.open.delete(attempt.exercise);
    this.attempts = this.attempts.filter((a) => a !== attempt);
  }
}

/** Has the attempt moved past its start position (an attempt that's only standing ready is not worth listing)? */
export const hasMoved = (a: StageAttempt): boolean => a.steps.some((s) => s.state !== 0);

/** When the attempt first moved out of its start position (when it started, if it never did). */
export const movedAt = (a: StageAttempt): number => a.steps.find((s) => s.state > 0)?.at ?? a.startedAt;

/** Seconds from the first movement out of the start position to the end of the attempt. */
export const attemptSeconds = (a: StageAttempt): number | undefined =>
  a.endedAt ? (a.endedAt - movedAt(a)) / 1000 : undefined;

/** Attempts worth reviewing, newest movement first. */
export const reviewable = (attempts: StageAttempt[]): StageAttempt[] =>
  attempts.filter(hasMoved).sort((a, b) => movedAt(b) - movedAt(a));

const ARM_TEXT: Record<ArmSide, string> = { LEFT: 'left arm', RIGHT: 'right arm', BOTH: 'both hands' };

export const clockTime = (at: number): string =>
  new Date(at).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }) +
  '.' + String(Math.floor((at % 1000) / 100));

export const outcomeText = (a: StageAttempt): string => {
  const last = a.steps[a.steps.length - 1]?.stateName ?? '?';
  switch (a.outcome) {
    case 'rep':
      return `REP • power ${a.power} • form ${Math.round((a.form ?? 0) * 100)}%`;
    case 'missed':
      return `MISSED after ${last}${a.endNote ? ` — ${a.endNote}` : ''}`;
    case 'lost-sight':
      return `LOST SIGHT during ${last}`;
    default:
      return 'in progress';
  }
};

export const stepMark = (s: StageStep) => (s.state === REP_STEP ? '★' : s.state === 0 ? (s.armed ? '✓' : '·') : '▶');

/** Plain-text log (oldest first) to copy or save. */
export const stageLogText = (attempts: StageAttempt[], label: (ex: ExerciseType) => string): string => {
  const lines = [`Kettlebell Knight — stage log (${new Date().toLocaleString()})`, ''];
  for (const a of reviewable(attempts).reverse()) {
    const seconds = attemptSeconds(a);
    const secs = seconds !== undefined ? ` • ${seconds.toFixed(1)}s` : '';
    lines.push(`${clockTime(movedAt(a))}  ${label(a.exercise)} (${ARM_TEXT[a.arm]})  ${outcomeText(a)}${secs}`);
    for (const s of a.steps) {
      lines.push(`    ${clockTime(s.at)} ${stepMark(s)} ${s.stateName.padEnd(16)}${s.detail ? `  ${s.detail}` : ''}`);
    }
  }
  return lines.join('\n');
};
