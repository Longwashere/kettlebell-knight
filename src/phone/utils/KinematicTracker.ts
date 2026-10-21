import { RepTelemetry, ExerciseType, EXERCISE_SKILLS } from '../../types/game';

// Normalized 2D/3D Landmark type from MediaPipe
export interface NormalizedLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

/** Posture calibration (see KinematicTracker.posture). */
const POSTURE = {
  /** A frame where the shin or torso-per-shin jumps more than this share is a landmark glitch and is skipped. */
  glitch: 0.2,
  /**
   * Only a frame with the knees at least this straight (thigh vs standing) can raise the upright reference: a squat
   * tilts the shins toward the camera, shortening them on screen, and would otherwise leave standing tall reading as
   * hunched over for good (no swing would lock out again).
   */
  uprightKnee: 0.92,
};

/** Keeps the swing's body-relative bell height positive in lastMetricY, where 0 means "no previous frame". */
const SWING_REL_OFFSET = 10;

/**
 * Kettlebell swing thresholds. Bell height is in standing-torso lengths below the shoulders (0 = shoulder line,
 * 1 = hip line); hinge and knee are torso / thigh height as a share of standing (1 = upright / straight).
 */
const SWING = {
  /** Hike: bell at least this low, elbows at least this straight, forearms hanging at least this vertically. */
  hikeBell: 0.75,
  hikeElbow: 140,
  hikeForearm: 0.7,
  /** Hike: posture (torso vs upright) at most this, knees not bent below this (deeper is a squat). */
  hikeHinge: 0.88,
  hikeKneeMin: 0.55,
  /** Drive starts when the bell rises at least this fast (torso lengths / s) relative to the shoulders. */
  driveSpeed: 1.2,
  /** Lockout line: the bell has to rise to this height (about the bottom of the chest). */
  lockoutBell: 0.65,
  /** Lockout: standing tall again, locked out straight — posture at least this upright, knees at least this straight. */
  lockoutPosture: 0.9,
  lockoutKnee: 0.7,
  /**
   * Lockout: the shoulders risen at least this far (torso lengths) since the bottom of the hike. Standing up out of
   * the hinge lifts them; a gorilla row pulls the bell just as high toward the hunched shoulders but leaves them put.
   */
  lockoutRise: 0.1,
  /** Standing tall and the bell crossing the line may be this far apart, in either order (the bell staying within lockoutSlack of the line). */
  lockoutGraceMs: 600,
  lockoutSlack: 0.25,
  /** Cancels the drive as a curl only for a forearm clearly standing up at nearly full length on screen. */
  curlForearmLen: 0.8,
  curlForearmUp: -0.5,
  /** After a lockout, the bell has to drop past this before the next hike. */
  resetBell: 0.8,
};

/**
 * Kettlebell clean thresholds (hike → rack, no press). Bell height uses the swing's scale: standing-torso lengths
 * below the shoulders (0 = shoulder line, 1 = hip line).
 */
const CLEAN = {
  /** Hike: the bell at least this low (around the hips or below). */
  hikeBell: 0.85,
  /** Pull starts when the bell rises at least this fast (torso lengths / s). */
  pullSpeed: 1.0,
  /** Rack zone: the bell between these heights (a little above the shoulder line down to the upper chest). */
  rackHigh: -0.3,
  rackLow: 0.45,
  /**
   * Rack: the elbow tucked at least this far below the wrist (torso lengths). A swing reaching chest height has its
   * arm straight out toward the camera, so its elbow sits between shoulder and wrist — level with or above the hand.
   */
  rackElbowTuck: 0.12,
  /** Rack: the bell settled (slower than this, torso lengths / s) for this long. */
  rackStillSpeed: 1.2,
  rackHoldMs: 150,
  /** A pull that hasn't racked by now (or dropped back into the hike) is abandoned. */
  pullTimeoutMs: 1600,
};

/**
 * Clean & press thresholds (normalized screen units). Each wrist runs its own hang → rack → overhead sequence, so the
 * free hand hanging at the side or held up never stands in for the bell.
 */
const CLEAN_PRESS = {
  /** Rack: the wrist within this distance of the shoulder line, held this long. */
  rackBand: 0.12,
  rackHoldMs: 100,
  /** Lockout: the wrist at least this far above the shoulder line. */
  lockout: 0.24,
  /** Pull starts when the wrist rises at least this fast (screen heights / s) from the hang. */
  pullSpeed: 0.4,
  /** A pull that hasn't racked by now is abandoned. */
  pullTimeoutMs: 2000,
  /** Hang → lockout can't be faster than this: anything quicker is a tracking glitch, not a rep. */
  minRepMs: 500,
  /** A wrist moving further than this in one frame (or barely visible) is a tracking glitch: its rep is dropped. */
  maxFrameJump: 0.2,
  minVisibility: 0.3,
};

interface CleanPressArm {
  state: SwingState;
  /** The wrist has hung below the hips since its last rep (a rep has to start from the hang). */
  armed: boolean;
  pullAt: number;
  rackAt: number;
  racked: boolean;
  lastY: number;
  peakSpeed: number;
}

/** Windmill timing. The descent and return are slow, so a hand jittering around the knee line can re-trigger a rep. */
const WINDMILL = {
  /** After a rep, the tracker waits this long before a new descent can start (and between counted reps). */
  cooldownMs: 1200,
};

/**
 * Around-the-body pass. Each orbit is: hands meet in front, bell out to one flank, behind the back, out on the other
 * flank, hands meet again. Distances are shoulder widths from the hip centre; arms hanging still never bring the hands
 * together, so they can't count a rep however much the landmarks jitter.
 */
const AROUND = {
  /**
   * Hands passing the bell: wrists at most this far apart, centred within this of the hips. Loose, because the hand
   * hidden behind the other one is tracked badly; arms hanging at the sides are still ~1.2 apart.
   */
  together: 0.85,
  frontReach: 0.8,
  /** Bell out on a flank: the outer wrist at least this far from the hip centre. */
  flank: 0.5,
  /** Height band (torso lengths): from this far above the shoulder line to this far below the hips (~knees). */
  aboveShoulder: 0.3,
  belowHip: 1.2,
  /** A stage not reached within this resets the orbit. */
  stepMs: 4000,
  cooldownMs: 900,
};

/**
 * Deadlift vs gorilla row. Both start hinged with the bells hanging low, so they're told apart by what moves: a
 * deadlift stands up (the shoulders rise with both hands together), a row keeps the shoulders put while one hand
 * rises past the other. Distances are standing-torso lengths; hinge is torso height vs standing (1 = upright).
 */
const DEADLIFT = {
  /** Lockout: shoulders risen at least this far since the bottom, and the torso back to at least this upright. */
  shoulderRise: 0.2,
  lockoutHinge: 0.8,
  /** Lockout: the two wrists at most this far apart in height (a row has one hand up, one down). */
  maxSplit: 0.3,
  /** Router: standing with both hands low and level, at least this upright. */
  routeHinge: 0.8,
  /**
   * A deadlift's bell stops at the hips; a swing's flies through them on its way to the chest. The rep counts once
   * the bell has settled (rising slower than this, torso lengths / s), and a bell carried this far above the hip
   * line is a swing: the pull is dropped.
   */
  settleSpeed: 0.6,
  swingAboveHip: 0.25,
};

/**
 * Gorilla row, with one bell or two. Each arm is measured against itself: its reach is the wrist's height below its
 * own shoulder, and a row draws the wrist up toward the shoulder (the arm bends). A deadlift keeps the arms straight,
 * so its reach never shrinks, and the free hand (hanging, or braced on a knee or thigh) holds still.
 */
const ROW = {
  /** The pull starts once an arm's reach has shrunk this far from where it hung. */
  startPull: 0.12,
  /** The pull counts once the rowing arm's reach has shrunk at least this far. */
  pull: 0.4,
  /** ...and only hunched over: posture (torso vs upright) at most this. */
  maxPosture: 0.85,
  /**
   * An arm whose reach changes slower than this (torso lengths / s, smoothed over ~0.5 s and signed, so camera
   * jitter averages out while even a slow row keeps drifting one way) is resting: its hang reference settles there.
   */
  stillRate: 0.15,
  settleSeconds: 1.5,
  /**
   * The lower shoulder rising more than this since the hang is standing up (a deadlift or a swing), not a row.
   * Rowing twists the rowing shoulder up, so the other one is the one watched.
   */
  maxShoulderRise: 0.15,
  /** In the hang, the shoulder reference relaxes upward this fast (torso lengths / s) to follow a change of stance. */
  shoulderRelax: 0.1,
  /** Router: torso hinged to at most this. An elbow within rowedElbow of its shoulder line has been rowed up. */
  routeHinge: 0.88,
  rowedElbow: 0.3,
};

const freshCleanPressArm = (): CleanPressArm =>
  ({ state: 0, armed: false, pullAt: 0, rackAt: 0, racked: false, lastY: 0, peakSpeed: 0 });

/**
 * Snatch thresholds. Both wrists are followed: the hands start together on the hike and part on the way up, so a
 * midpoint of the two never reaches overhead. Heights are standing-torso lengths above the shoulder line.
 */
const SNATCH = {
  /** Pull starts when either wrist rises at least this fast (screen heights / s) out of the hike. */
  pullSpeed: 0.55,
  /** Lockout: the higher wrist at least this far above the shoulders. A locked-out arm reaches ~0.9. */
  lockout: 0.6,
  /** After a lockout, the wrist has to drop below this before the next hike. */
  reset: 0.3,
  /** A pull that hasn't locked out by now (or fell back below the hips) is abandoned. */
  pullTimeoutMs: 1500,
};

/**
 * Lunge thresholds. Thighs are read as hip→knee height over the standing thigh (1 = straight down, 0 = level):
 * at the bottom of a lunge the front thigh is about level and the rear one points down, so the knees split apart.
 */
const LUNGE = {
  /** Standing: both thighs at least this upright and the knees split by less than resetSplit. */
  standThigh: 0.8,
  resetSplit: 0.25,
  /** Sinking starts once the knees split this far (standing thighs) or the front thigh folds below this. */
  startSplit: 0.35,
  startThigh: 0.7,
  /** Depth: the front thigh at most this upright with the knees split at least this far. */
  depthThigh: 0.45,
  depthSplit: 0.5,
  /** Drive: the front thigh has risen this far back from its deepest point. */
  driveRise: 0.1,
  /** The torso stays at least this tall (vs standing): a hinge with the leg kicked back is a single-leg RDL. */
  minTorso: 0.72,
};

export type SwingState = 0 | 1 | 2; // Phase 0 (Prep/Start), Phase 1 (Mid/Inflection), Phase 2 (Peak/Lockout)

/** Which hand holds the bell: one arm, or both hands together on the handle (tracked at their midpoint). */
export type ArmSide = 'LEFT' | 'RIGHT' | 'BOTH';

// MediaPipe Pose Landmark Indices (33 Keypoints):
export const POSE_INDEX = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

export interface BodyVisibilityStatus {
  isFullyVisible: boolean;
  missingParts: string[];
  armsVisible: boolean;
  legsVisible: boolean;
  hipsVisible: boolean;
  shouldersVisible: boolean;
  inFrameScore: number;
  reason?: string;
}

export interface KinematicStateUpdate {
  exercise: ExerciseType;
  state: SwingState;
  stateName: string;
  repCount: number;
  power: number;
  form: number;
  primaryY: number;
  referenceY: number;
  velocity: number;
  telemetry?: RepTelemetry;
  debugNotes?: string;
  /** The arm being tracked as the one holding the bell. */
  arm?: ArmSide;
  /** The exercise's stage names in order (state 0, 1, 2). */
  stages?: string[];
  /** In stage 0 with the start position met (e.g. the swing's hike): the next movement can begin a rep. */
  armed?: boolean;
  isFullBodyVisible?: boolean;
  missingBodyParts?: string[];
}

/**
 * Calculates the interior angle in degrees between three points (a -> b -> c) with vertex at b.
 */
export function calculateAngle(
  a: NormalizedLandmark,
  b: NormalizedLandmark,
  c: NormalizedLandmark
): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return angle;
}

/**
 * Full Suite 13-Exercise Kinematic Tracker for Kettlebell Knight.
 * 
 * Features:
 * 1. Dedicated Biomechanical State Machines for all 13 Kettlebell Exercises:
 *    - SWING
 *    - SQUAT (Goblet)
 *    - CLEAN_AND_PRESS
 *    - SNATCH
 *    - WINDMILL
 *    - DEADLIFT
 *    - OVERHEAD_PRESS
 *    - THRUSTER
 *    - GORILLA_ROW
 *    - AROUND_THE_BODY
 *    - SINGLE_LEG_RDL
 *    - CLEAN
 *    - LUNGE
 * 
 * 2. Smart Hand Router:
 *    Restricts detection pool to the active 5 cards in hand to eliminate false positives
 *    and conserve mobile CPU/battery. Automatically routes when user transitions exercise!
 */
export class KinematicTracker {
  private activeExercise: ExerciseType = 'SWING';
  private allowedExercises: ExerciseType[] = ['SWING', 'SQUAT', 'OVERHEAD_PRESS', 'CLEAN_AND_PRESS', 'AROUND_THE_BODY'];
  private autoRouteEnabled: boolean = true;

  private currentState: SwingState = 0;
  private repCount: number = 0;
  private lastTimestamp: number = 0;
  private phaseStartTimestamp: number = 0;
  private lastMetricY: number = 0;
  private lastMetricX: number = 0;
  private maxMovementVelocity: number = 0;
  private maxSquatDepth: number = 0;
  private lastRepTimestamp: number = 0;
  private minRepIntervalMs: number = 650;

  // Multi-phase tracking variables
  private cleanStageCompleted: boolean = false;
  /**
   * Around-the-body: hands have met in front (an orbit can start), the flank the bell first went out on
   * (-1 / 1, 0 = not yet), and when the last stage was reached.
   */
  private aroundArmed: boolean = false;
  private aroundSide: number = 0;
  private aroundStepAt: number = 0;
  private rdlWorkingLeg: 'LEFT' | 'RIGHT' = 'LEFT';

  // Working arm: the hand that moves is the one with the bell; a raised but still free arm is ignored
  private armSide: ArmSide = 'BOTH';
  private armCandidate: ArmSide = 'BOTH';
  private armCandidateFrames: number = 0;
  private wristMotion = { l: 0, r: 0 };
  private lastWrists: { lx: number; ly: number; rx: number; ry: number; t: number } | null = null;
  /** Forearm length on screen while hanging in the swing's hike (the forearm's full, unforeshortened length). */
  private swingForearmRef: number = 0;
  /** When the bell crossed the swing's lockout line in this drive (0 = not yet). */
  private swingLineAt: number = 0;
  /** When the knight last stood tall in this drive (0 = not yet). */
  private swingTallAt: number = 0;
  /** The best bell / hinge / knee this drive reached (for the miss note). */
  /** Lowest the shoulders got (largest y) in this hike, to measure standing up against. */
  private swingHikeShoulder: number = 0;
  private swingBest = { bell: 9, hinge: 0, knee: 0 };
  /** When the clean's bell settled in the rack zone (0 = not settled). */
  private cleanRackAt: number = 0;
  /** Clean & press progress per wrist. */
  private cleanPressArms = { LEFT: freshCleanPressArm(), RIGHT: freshCleanPressArm() };
  /** Snatch: each wrist's height last frame (null = no reference yet). */
  private snatchLastWrists: { l: number; r: number } | null = null;
  /** Deadlift: lowest shoulder line (largest y) in the setup, to measure the stand-up against (0 = none yet). */
  private deadliftBottomShoulder: number = 0;
  /** Gorilla row: shoulder line in the hang, and each elbow's height last frame (null = no reference yet). */
  private rowHangShoulder: number = 0;
  private rowLastElbows: { l: number; r: number } | null = null;
  /**
   * Each arm's reach (wrist below its own shoulder, torso lengths), where it last hung, and its smoothed rate of
   * change (torso lengths / s). Body calibration like the standing torso, so it's kept across exercise switches and
   * the row can count the very pull that switched to it.
   */
  private armReach = { l: 0, r: 0 };
  private armHangReach: { l: number; r: number } | null = null;
  private armReachRate = { l: 0, r: 0 };
  private armReachAt: number = 0;
  /** Gorilla row: whether the last counted rep was the left arm's, and which arms are back at the hang (a rowed arm
   * has to lower before it counts again). */
  private rowArmLeft: boolean = false;
  private rowReady = { l: true, r: true };
  /**
   * Standing torso (shoulders→hips) and thigh (hips→knees) heights on screen. Facing the camera, a hip hinge
   * shortens the torso and a knee bend shortens the thigh, so each is read as a ratio of its standing length.
   * They follow the tallest recent values and slowly decay, so stepping closer or farther re-calibrates them.
   */
  private standingTorso: number = 0;
  private standingThigh: number = 0;
  /**
   * Posture: torso height on screen over shin height (1 = upright). Shins stay about the same length whether you
   * stand, hinge, row or swing, and scale with distance just like the torso, so unlike standingTorso this never
   * drifts while you stay bent over. torsoPerShin is smoothed over a few frames; uprightTorsoPerShin is the tallest
   * it has been. Without ankles in view, posture falls back to the torso vs standingTorso.
   */
  private posture: number = 1;
  private torsoPerShin: number = 0;
  private uprightTorsoPerShin: number = 0;
  private shinRef: number = 0;

  private requireFullBody: boolean = true;
  private consecutiveFullBodyFrames: number = 0;
  private minFullBodyFramesRequired: number = 3;

  public onRepCompleted?: (telemetry: RepTelemetry) => void;
  public onStateChange?: (update: KinematicStateUpdate) => void;
  public onExerciseAutoSwitched?: (newExercise: ExerciseType) => void;

  public setRequireFullBody(require: boolean): void {
    this.requireFullBody = require;
    if (!require) {
      this.consecutiveFullBodyFrames = this.minFullBodyFramesRequired;
    }
  }

  public getRequireFullBody(): boolean {
    return this.requireFullBody;
  }

  public setAllowedExercises(exercises: ExerciseType[]): void {
    if (exercises && exercises.length > 0) {
      this.allowedExercises = [...exercises];
      if (!this.allowedExercises.includes(this.activeExercise)) {
        this.setExercise(this.allowedExercises[0]);
      }
    }
  }

  public getAllowedExercises(): ExerciseType[] {
    return [...this.allowedExercises];
  }

  public setAutoRoute(enabled: boolean): void {
    this.autoRouteEnabled = enabled;
  }

  public setExercise(exercise: ExerciseType): void {
    this.activeExercise = exercise;
    this.reset();
  }

  public getActiveExercise(): ExerciseType {
    return this.activeExercise;
  }

  public reset(): void {
    this.currentState = 0;
    this.repCount = 0;
    this.lastTimestamp = 0;
    this.phaseStartTimestamp = 0;
    this.lastMetricY = 0;
    this.lastMetricX = 0;
    this.maxMovementVelocity = 0;
    this.maxSquatDepth = 0;
    this.lastRepTimestamp = 0;
    this.cleanStageCompleted = false;
    this.cleanRackAt = 0;
    this.cleanPressArms = { LEFT: freshCleanPressArm(), RIGHT: freshCleanPressArm() };
    this.snatchLastWrists = null;
    this.deadliftBottomShoulder = 0;
    this.rowHangShoulder = 0;
    this.rowLastElbows = null;
    this.rowReady = { l: true, r: true };
    this.aroundArmed = false;
    this.aroundSide = 0;
    this.aroundStepAt = 0;
    this.consecutiveFullBodyFrames = 0;
  }

  public getRepCount(): number {
    return this.repCount;
  }

  public getArmSide(): ArmSide {
    return this.armSide;
  }

  /**
   * Picks the arm holding the bell. Hands closer than shoulder width share the handle (BOTH). Otherwise the
   * wrist with clearly more recent motion (~0.5s average speed) is the working one, so a free arm held up or
   * hanging still never drives a rep. A switch must hold for a few frames and drops any half-finished rep, so
   * the tracked point jumping to the other hand is never read as a burst of speed.
   */
  private updateWorkingArm(landmarks: NormalizedLandmark[], timestampMs: number): void {
    const lWrist = landmarks[POSE_INDEX.LEFT_WRIST];
    const rWrist = landmarks[POSE_INDEX.RIGHT_WRIST];
    const lShoulder = landmarks[POSE_INDEX.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_INDEX.RIGHT_SHOULDER];

    const prev = this.lastWrists;
    if (prev && timestampMs > prev.t) {
      const dt = Math.max(0.016, (timestampMs - prev.t) / 1000);
      const k = Math.min(1, dt / 0.5);
      this.wristMotion.l += (Math.hypot(lWrist.x - prev.lx, lWrist.y - prev.ly) / dt - this.wristMotion.l) * k;
      this.wristMotion.r += (Math.hypot(rWrist.x - prev.rx, rWrist.y - prev.ry) / dt - this.wristMotion.r) * k;
    }
    this.lastWrists = { lx: lWrist.x, ly: lWrist.y, rx: rWrist.x, ry: rWrist.y, t: timestampMs };

    // Side-on the shoulders look narrow, so the grip scale never drops below about half the standing torso
    const shoulderWidth = Math.max(0.08, this.standingTorso * 0.55, Math.abs(lShoulder.x - rShoulder.x));
    const handsTogether = Math.hypot(lWrist.x - rWrist.x, lWrist.y - rWrist.y) < shoulderWidth * 0.9;
    const { l, r } = this.wristMotion;
    let candidate: ArmSide;
    if (handsTogether) candidate = 'BOTH';
    else if (l > r * 1.6 && l > 0.15) candidate = 'LEFT';
    else if (r > l * 1.6 && r > 0.15) candidate = 'RIGHT';
    else candidate = this.armSide; // no clear mover (still, or two bells moving together): keep it

    this.armCandidateFrames = candidate === this.armCandidate ? this.armCandidateFrames + 1 : 0;
    this.armCandidate = candidate;
    if (candidate !== this.armSide && this.armCandidateFrames >= 6) {
      this.armSide = candidate;
      // The snatch and the row follow both wrists themselves, so the hands parting mid-pull mustn't cost them the rep
      if (this.activeExercise === 'SNATCH' || this.activeExercise === 'GORILLA_ROW') return;
      // The tracked point moves: abandon any half rep and drop the velocity reference so the jump isn't read as motion
      this.currentState = 0;
      this.maxMovementVelocity = 0;
      this.phaseStartTimestamp = 0;
      this.cleanStageCompleted = false;
      this.cleanRackAt = 0;
      this.lastMetricY = 0;
      this.lastMetricX = 0;
    }
  }

  private updateStandingRefs(landmarks: NormalizedLandmark[]): void {
    const shoulderY = (landmarks[POSE_INDEX.LEFT_SHOULDER].y + landmarks[POSE_INDEX.RIGHT_SHOULDER].y) / 2;
    const hipY = (landmarks[POSE_INDEX.LEFT_HIP].y + landmarks[POSE_INDEX.RIGHT_HIP].y) / 2;
    const kneeY = (landmarks[POSE_INDEX.LEFT_KNEE].y + landmarks[POSE_INDEX.RIGHT_KNEE].y) / 2;
    this.standingTorso = Math.max(this.standingTorso * 0.9985, hipY - shoulderY);
    this.standingThigh = Math.max(this.standingThigh * 0.9985, kneeY - hipY);
    this.updatePosture(landmarks, hipY - shoulderY, this.standingThigh > 0.02 ? (kneeY - hipY) / this.standingThigh : 1);
  }

  private updatePosture(landmarks: NormalizedLandmark[], torso: number, kneeStraight: number): void {
    // The longer shin (in a lunge the rear one lies flat), from ankles MediaPipe actually sees in frame
    const shinOf = (knee: NormalizedLandmark, ankle: NormalizedLandmark | undefined) =>
      ankle && (ankle.visibility ?? 1) >= 0.3 && ankle.y <= 0.99 ? ankle.y - knee.y : 0;
    const shin = Math.max(
      shinOf(landmarks[POSE_INDEX.LEFT_KNEE], landmarks[POSE_INDEX.LEFT_ANKLE]),
      shinOf(landmarks[POSE_INDEX.RIGHT_KNEE], landmarks[POSE_INDEX.RIGHT_ANKLE]),
    );
    const fallback = torso / Math.max(0.12, this.standingTorso);
    if (shin < 0.03) {
      this.posture = fallback;
      return;
    }
    this.shinRef = this.shinRef > 0 ? this.shinRef + (shin - this.shinRef) * 0.1 : shin;
    const ratio = torso / shin;
    // A landmark glitch (shin or torso jumping a fifth in one frame) must not become the upright reference
    const glitch =
      Math.abs(shin - this.shinRef) > POSTURE.glitch * this.shinRef ||
      (this.torsoPerShin > 0 && Math.abs(ratio - this.torsoPerShin) > POSTURE.glitch * this.torsoPerShin);
    if (!glitch) {
      this.torsoPerShin = this.torsoPerShin > 0 ? this.torsoPerShin + (ratio - this.torsoPerShin) * 0.35 : ratio;
      if (kneeStraight >= POSTURE.uprightKnee || this.uprightTorsoPerShin === 0) {
        this.uprightTorsoPerShin = Math.max(this.uprightTorsoPerShin, this.torsoPerShin);
      }
    }
    this.posture = this.uprightTorsoPerShin > 0 ? this.torsoPerShin / this.uprightTorsoPerShin : fallback;
  }

  /** An elbow drawn up beside its shoulder with the forearm hanging: a row. A deadlift's straight arms never do this. */
  private elbowRowedUp(landmarks: NormalizedLandmark[]): boolean {
    const torso = Math.max(0.12, this.standingTorso);
    const rowed = (shoulder: NormalizedLandmark, elbow: NormalizedLandmark, wrist: NormalizedLandmark) =>
      (elbow.y - shoulder.y) / torso <= ROW.rowedElbow && wrist.y > elbow.y;
    return (
      rowed(landmarks[POSE_INDEX.LEFT_SHOULDER], landmarks[POSE_INDEX.LEFT_ELBOW], landmarks[POSE_INDEX.LEFT_WRIST]) ||
      rowed(landmarks[POSE_INDEX.RIGHT_SHOULDER], landmarks[POSE_INDEX.RIGHT_ELBOW], landmarks[POSE_INDEX.RIGHT_WRIST])
    );
  }

  /**
   * Tracks each arm's reach and where it hangs. The hang reference follows the lowest reach and settles wherever a
   * resting hand stays, so a free hand braced on a knee or thigh doesn't read as rowed up.
   */
  private updateArmReach(landmarks: NormalizedLandmark[], timestampMs: number): void {
    const torso = Math.max(0.12, this.standingTorso);
    const reach = {
      l: (landmarks[POSE_INDEX.LEFT_WRIST].y - landmarks[POSE_INDEX.LEFT_SHOULDER].y) / torso,
      r: (landmarks[POSE_INDEX.RIGHT_WRIST].y - landmarks[POSE_INDEX.RIGHT_SHOULDER].y) / torso,
    };
    const hang = this.armHangReach;
    if (!hang || timestampMs <= this.armReachAt) {
      this.armHangReach ??= { ...reach };
      this.armReach = reach;
      this.armReachAt = timestampMs;
      return;
    }
    const dt = Math.max(0.016, (timestampMs - this.armReachAt) / 1000);
    const settle = Math.min(1, dt / ROW.settleSeconds);
    for (const side of ['l', 'r'] as const) {
      this.armReachRate[side] += ((reach[side] - this.armReach[side]) / dt - this.armReachRate[side]) * Math.min(1, dt / 0.5);
      hang[side] = Math.max(hang[side], reach[side]);
      if (Math.abs(this.armReachRate[side]) < ROW.stillRate) hang[side] += (reach[side] - hang[side]) * settle;
    }
    this.armReach = reach;
    this.armReachAt = timestampMs;
  }

  /** The bell's wrist: the working arm's, or the midpoint of both hands on the handle. */
  private workingWrist(landmarks: NormalizedLandmark[]): NormalizedLandmark {
    const lWrist = landmarks[POSE_INDEX.LEFT_WRIST];
    const rWrist = landmarks[POSE_INDEX.RIGHT_WRIST];
    if (this.armSide === 'LEFT') return lWrist;
    if (this.armSide === 'RIGHT') return rWrist;
    return { x: (lWrist.x + rWrist.x) / 2, y: (lWrist.y + rWrist.y) / 2 };
  }

  /**
   * Verifies that the user's FULL body (Arms, Legs, Hips, Shoulders) is visible in frame.
   * Suppresses rep counting if the user is too close or body parts are occluded/cut off.
   */
  public checkFullBodyVisibility(landmarks: NormalizedLandmark[]): BodyVisibilityStatus {
    if (!landmarks || landmarks.length < 29) {
      return {
        isFullyVisible: false,
        missingParts: ['ALL JOINTS'],
        armsVisible: false,
        legsVisible: false,
        hipsVisible: false,
        shouldersVisible: false,
        inFrameScore: 0,
        reason: 'No pose landmarks detected in frame',
      };
    }

    const missingParts: string[] = [];

    const lShoulder = landmarks[POSE_INDEX.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_INDEX.RIGHT_SHOULDER];
    const lElbow = landmarks[POSE_INDEX.LEFT_ELBOW];
    const rElbow = landmarks[POSE_INDEX.RIGHT_ELBOW];
    const lWrist = landmarks[POSE_INDEX.LEFT_WRIST];
    const rWrist = landmarks[POSE_INDEX.RIGHT_WRIST];
    const lHip = landmarks[POSE_INDEX.LEFT_HIP];
    const rHip = landmarks[POSE_INDEX.RIGHT_HIP];
    const lKnee = landmarks[POSE_INDEX.LEFT_KNEE];
    const rKnee = landmarks[POSE_INDEX.RIGHT_KNEE];
    const lAnkle = landmarks[POSE_INDEX.LEFT_ANKLE];
    const rAnkle = landmarks[POSE_INDEX.RIGHT_ANKLE];

    const isPointValid = (p?: NormalizedLandmark, minVis = 0.45): boolean => {
      if (!p) return false;
      const vis = p.visibility !== undefined ? p.visibility : 1.0;
      const inBounds = p.x >= 0.01 && p.x <= 0.99 && p.y >= 0.01 && p.y <= 0.99;
      return vis >= minVis && inBounds;
    };

    // Each pair needs only one side clear: standing side-on or at an angle to the phone hides the far limbs,
    // and MediaPipe still estimates them well enough from the near side

    // 1. Shoulders Verification
    const shouldersVisible = isPointValid(lShoulder, 0.42) || isPointValid(rShoulder, 0.42);
    if (!shouldersVisible) missingParts.push('SHOULDERS');

    // 2. Hips / Torso Verification
    const hipsVisible = isPointValid(lHip, 0.40) || isPointValid(rHip, 0.40);
    if (!hipsVisible) missingParts.push('HIPS');

    // 3. Arms Verification (at least one working arm fully clear, wrists in bounds)
    const wristsVisible = isPointValid(lWrist, 0.35) || isPointValid(rWrist, 0.35);
    const armsVisible = shouldersVisible && wristsVisible;
    if (!wristsVisible) missingParts.push('ARMS / HANDS');

    // 4. Legs Verification: KNEES MUST BE VISIBLE (Feet & ankles no longer gatekept)
    const kneesVisible = isPointValid(lKnee, 0.35) || isPointValid(rKnee, 0.35);
    const legsVisible = kneesVisible;
    if (!kneesVisible) missingParts.push('KNEES');

    const isFullyVisible = shouldersVisible && hipsVisible && wristsVisible && legsVisible;

    const keyPoints = [lShoulder, rShoulder, lElbow, rElbow, lWrist, rWrist, lHip, rHip, lKnee, rKnee];
    const validCount = keyPoints.filter((p) => isPointValid(p, 0.38)).length;
    const inFrameScore = Number((validCount / keyPoints.length).toFixed(2));

    return {
      isFullyVisible,
      missingParts,
      armsVisible,
      legsVisible,
      hipsVisible,
      shouldersVisible,
      inFrameScore,
      reason: isFullyVisible ? 'Full body verified' : `Missing: ${missingParts.join(', ')}`,
    };
  }

  /**
   * Main Frame Entrypoint:
   * 1. Evaluates Full Body Visibility Gatekeeper (Arms & Legs required)
   * 2. Evaluates Smart Hand Auto-Router if motion deviates towards another card in hand
   * 3. Executes the active exercise state machine
   */
  public processLandmarks(landmarks: NormalizedLandmark[], timestampMs: number = Date.now()): KinematicStateUpdate {
    if (!landmarks || landmarks.length < 29) {
      return {
        exercise: this.activeExercise,
        state: this.currentState,
        stateName: 'IDLE',
        repCount: this.repCount,
        power: 0,
        form: 1.0,
        primaryY: 0,
        referenceY: 0,
        velocity: 0,
        isFullBodyVisible: false,
        missingBodyParts: ['ALL JOINTS'],
      };
    }

    // 1. Full-Body Visibility Gatekeeper
    if (this.requireFullBody) {
      const visibility = this.checkFullBodyVisibility(landmarks);
      if (!visibility.isFullyVisible) {
        this.consecutiveFullBodyFrames = 0;
        this.lastTimestamp = timestampMs;

        // Reset any partially started rep to avoid hallucinated triggers
        if (this.currentState !== 0) {
          this.currentState = 0;
          this.maxMovementVelocity = 0;
        }

        const stateName = `STEP BACK (${visibility.missingParts.join(', ')})`;
        const update: KinematicStateUpdate = {
          exercise: this.activeExercise,
          state: 0,
          stateName,
          repCount: this.repCount,
          power: 0,
          form: 1.0,
          primaryY: 0,
          referenceY: 0,
          velocity: 0,
          isFullBodyVisible: false,
          missingBodyParts: visibility.missingParts,
          debugNotes: visibility.reason,
        };
        this.onStateChange?.(update);
        return update;
      }

      this.consecutiveFullBodyFrames++;
      if (this.consecutiveFullBodyFrames < this.minFullBodyFramesRequired) {
        // Stabilizing camera framing
        const update: KinematicStateUpdate = {
          exercise: this.activeExercise,
          state: 0,
          stateName: 'STABILIZING FRAMING...',
          repCount: this.repCount,
          power: 0,
          form: 1.0,
          primaryY: 0,
          referenceY: 0,
          velocity: 0,
          isFullBodyVisible: true,
          missingBodyParts: [],
        };
        this.onStateChange?.(update);
        return update;
      }
    }

    // 2. Smart Hand Auto-Routing (not mid-orbit: reaching behind the back bends an elbow up like a row)
    if (this.autoRouteEnabled && this.currentState === 0 && !this.aroundArmed) {
      const detected = this.detectExerciseSignature(landmarks, timestampMs);
      if (detected && detected !== this.activeExercise && this.allowedExercises.includes(detected)) {
        this.activeExercise = detected;
        this.reset();
        this.onExerciseAutoSwitched?.(detected);
      }
    }

    // Clean & press follows each wrist on its own and reports the bell arm itself
    if (this.activeExercise !== 'CLEAN_AND_PRESS') this.updateWorkingArm(landmarks, timestampMs);
    this.updateStandingRefs(landmarks);
    this.updateArmReach(landmarks, timestampMs);
    const update = this.processExercise(landmarks, timestampMs);
    update.arm = this.armSide;
    update.armed = this.currentState === 0 && this.phaseStartTimestamp > 0;
    return update;
  }

  private processExercise(landmarks: NormalizedLandmark[], timestampMs: number): KinematicStateUpdate {
    switch (this.activeExercise) {
      case 'SQUAT':
        return this.processSquat(landmarks, timestampMs);
      case 'OVERHEAD_PRESS':
        return this.processOverheadPress(landmarks, timestampMs);
      case 'CLEAN_AND_PRESS':
        return this.processCleanAndPress(landmarks, timestampMs);
      case 'CLEAN':
        return this.processClean(landmarks, timestampMs);
      case 'SNATCH':
        return this.processSnatch(landmarks, timestampMs);
      case 'WINDMILL':
        return this.processWindmill(landmarks, timestampMs);
      case 'DEADLIFT':
        return this.processDeadlift(landmarks, timestampMs);
      case 'THRUSTER':
        return this.processThruster(landmarks, timestampMs);
      case 'GORILLA_ROW':
        return this.processGorillaRow(landmarks, timestampMs);
      case 'AROUND_THE_BODY':
        return this.processAroundTheBody(landmarks, timestampMs);
      case 'SINGLE_LEG_RDL':
        return this.processSingleLegRDL(landmarks, timestampMs);
      case 'LUNGE':
        return this.processLunge(landmarks, timestampMs);
      case 'SWING':
      default:
        return this.processSwing(landmarks, timestampMs);
    }
  }

  /**
   * Smart Hand Biomechanical Signature Classifier:
   * Inspects posture against active hand cards to auto-route when user begins a specific movement.
   */
  private detectExerciseSignature(landmarks: NormalizedLandmark[], _timestampMs: number): ExerciseType | null {
    const lWrist = landmarks[POSE_INDEX.LEFT_WRIST];
    const rWrist = landmarks[POSE_INDEX.RIGHT_WRIST];
    const lShoulder = landmarks[POSE_INDEX.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_INDEX.RIGHT_SHOULDER];
    const lHip = landmarks[POSE_INDEX.LEFT_HIP];
    const rHip = landmarks[POSE_INDEX.RIGHT_HIP];
    const lKnee = landmarks[POSE_INDEX.LEFT_KNEE];
    const rKnee = landmarks[POSE_INDEX.RIGHT_KNEE];
    const lAnkle = landmarks[POSE_INDEX.LEFT_ANKLE];
    const rAnkle = landmarks[POSE_INDEX.RIGHT_ANKLE];
    const nose = landmarks[POSE_INDEX.NOSE];

    const wristY = (lWrist.y + rWrist.y) / 2;
    const shoulderY = (lShoulder.y + rShoulder.y) / 2;
    const hipY = (lHip.y + rHip.y) / 2;
    const kneeY = (lKnee.y + rKnee.y) / 2;
    const torsoHeight = Math.abs(shoulderY - hipY);

    const topWristY = Math.min(lWrist.y, rWrist.y);
    const bottomWristY = Math.max(lWrist.y, rWrist.y);

    // 1. Around-the-Body Pass Signature: Torso upright, wrists orbiting laterally around waist/hip level
    const hipX = (lHip.x + rHip.x) / 2;
    if (
      this.allowedExercises.includes('AROUND_THE_BODY') &&
      torsoHeight > 0.22 &&
      hipY < kneeY - 0.10 &&
      wristY >= shoulderY + 0.10 &&
      wristY <= hipY + 0.20 &&
      (Math.abs(lWrist.x - hipX) > 0.14 || Math.abs(rWrist.x - hipX) > 0.14)
    ) {
      return 'AROUND_THE_BODY';
    }

    // 2. Windmill Signature: One arm held high overhead, torso tilting sideways
    const shoulderTilt = Math.abs(lShoulder.y - rShoulder.y);
    if (
      this.allowedExercises.includes('WINDMILL') &&
      topWristY < shoulderY - 0.22 &&
      bottomWristY > hipY &&
      shoulderTilt > 0.08
    ) {
      return 'WINDMILL';
    }

    // 3. Lunge Signature: Torso upright, bell held at the chest, one knee dropped well below the other
    if (
      this.allowedExercises.includes('LUNGE') &&
      torsoHeight > 0.2 &&
      Math.abs(lKnee.y - rKnee.y) > 0.1 &&
      wristY < hipY
    ) {
      return 'LUNGE';
    }

    // 4. Single-Leg RDL Signature: One ankle or knee elevated significantly behind
    const legDeltaY =
      lAnkle && rAnkle && (lAnkle.visibility ?? 0) > 0.35 && (rAnkle.visibility ?? 0) > 0.35
        ? Math.abs(lAnkle.y - rAnkle.y)
        : Math.abs(lKnee.y - rKnee.y) * 1.5;
    if (
      this.allowedExercises.includes('SINGLE_LEG_RDL') &&
      legDeltaY > 0.12 &&
      wristY > hipY
    ) {
      return 'SINGLE_LEG_RDL';
    }

    // 5. Gorilla Row Signature: Bent-over torso, an elbow rowed up beside the shoulder with its forearm hanging
    // (a deadlift's straight arms keep the elbows a full upper arm below the shoulders). Hunched over by the shin-based
    // posture too: standing tall, a row can't count anyway, and an arm reaching behind the back looks rowed up.
    const torsoRef = Math.max(0.12, this.standingTorso);
    const hinge = torsoHeight / torsoRef;
    const wristSplit = (bottomWristY - topWristY) / torsoRef;
    if (
      this.allowedExercises.includes('GORILLA_ROW') &&
      hinge <= ROW.routeHinge &&
      this.posture <= ROW.maxPosture &&
      this.elbowRowedUp(landmarks)
    ) {
      return 'GORILLA_ROW';
    }

    // 6. Thruster Signature: Sinking into deep squat with wrists in rack, then pressing overhead
    if (
      this.allowedExercises.includes('THRUSTER') &&
      hipY > kneeY - 0.08 &&
      wristY <= shoulderY + 0.12
    ) {
      return 'THRUSTER';
    }

    // 7. Goblet Squat: Hips sinking deep below knees while wrists anchored at chest
    if (
      this.allowedExercises.includes('SQUAT') &&
      hipY > kneeY - 0.08 &&
      wristY <= shoulderY + 0.15
    ) {
      return 'SQUAT';
    }

    // 8. Overhead Press: Wrists driving high above shoulders while hips stay stable
    if (
      this.allowedExercises.includes('OVERHEAD_PRESS') &&
      wristY < shoulderY - 0.15 &&
      hipY < kneeY - 0.15
    ) {
      return 'OVERHEAD_PRESS';
    }

    // 9. Snatch: Working wrist passes rapidly straight overhead without rack pause
    if (
      this.allowedExercises.includes('SNATCH') &&
      topWristY < shoulderY - 0.20 &&
      bottomWristY > hipY - 0.10
    ) {
      return 'SNATCH';
    }

    // 10. Deadlift: Wrists pulling vertically from mid-shin to hip, never rising to shoulders
    // Both hands stay low: a windmill (one arm overhead, the other at the shin) averages out to the same height.
    // Read standing, bell hanging level in both hands above the knees: hinged over with the bells down is also a
    // gorilla row's hang, and switching mid-way up would count standing up out of a row set as a deadlift.
    if (
      this.allowedExercises.includes('DEADLIFT') &&
      topWristY >= hipY - 0.05 &&
      bottomWristY <= kneeY &&
      wristSplit < DEADLIFT.maxSplit &&
      hinge >= DEADLIFT.routeHinge
    ) {
      return 'DEADLIFT';
    }

    return null;
  }

  // =========================================================================
  // EXERCISE 1: KETTLEBELL SWING ("IRON CLEAVE")
  // Tracked by the forearm, hips and knees, relative to the body:
  //   HIKE     straight arms hanging, bell at or below the hips, hips hinged, knees only slightly bent
  //   DRIVE    the bell swings up as the hips open
  //   LOCKOUT  bell at chest height and the knight standing tall (hips and knees extended)
  // A goblet squat moves the bell just as far on screen, but with the elbows bent, the forearms standing up,
  // the knees deeply bent and the whole body rising with it.
  // =========================================================================
  private processSwing(landmarks: NormalizedLandmark[], timestampMs: number): KinematicStateUpdate {
    const lWrist = landmarks[POSE_INDEX.LEFT_WRIST];
    const rWrist = landmarks[POSE_INDEX.RIGHT_WRIST];
    const lElbow = landmarks[POSE_INDEX.LEFT_ELBOW];
    const rElbow = landmarks[POSE_INDEX.RIGHT_ELBOW];
    const lHip = landmarks[POSE_INDEX.LEFT_HIP];
    const rHip = landmarks[POSE_INDEX.RIGHT_HIP];
    const lShoulder = landmarks[POSE_INDEX.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_INDEX.RIGHT_SHOULDER];

    const singleArm = this.armSide !== 'BOTH';
    const mid = (a: NormalizedLandmark, b: NormalizedLandmark) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    const wrist = this.workingWrist(landmarks);
    const elbow = this.armSide === 'LEFT' ? lElbow : this.armSide === 'RIGHT' ? rElbow : mid(lElbow, rElbow);
    const shoulder = this.armSide === 'LEFT' ? lShoulder : this.armSide === 'RIGHT' ? rShoulder : mid(lShoulder, rShoulder);
    const lKnee = landmarks[POSE_INDEX.LEFT_KNEE];
    const rKnee = landmarks[POSE_INDEX.RIGHT_KNEE];
    const hipY = (lHip.y + rHip.y) / 2;
    const shoulderY = (lShoulder.y + rShoulder.y) / 2;
    const kneeY = (lKnee.y + rKnee.y) / 2;
    const torsoHeight = Math.max(0.12, this.standingTorso);

    // Bell height in standing-torso lengths below the shoulders (0 = shoulder line, 1 = hip line): body-relative,
    // so squatting or standing up doesn't move it
    const rel = (wrist.y - shoulderY) / torsoHeight;
    // Hip hinge: posture (1 = upright, lower = leaning forward). Knees: thigh height vs standing (1 = straight,
    // ~0.9 = the swing's soft bend, under ~0.55 = squatting)
    const hinge = this.posture;
    const knee = this.standingThigh > 0.02 ? (kneeY - hipY) / this.standingThigh : 1;
    const hingedHike = hinge <= SWING.hikeHinge && knee >= SWING.hikeKneeMin;
    // Locked out straight: upright, knees extended and the shoulders risen out of the hike (a gorilla row pulls
    // the bell as high, hunched over)
    const shoulderRise = this.swingHikeShoulder > 0 ? (this.swingHikeShoulder - shoulderY) / torsoHeight : 0;
    const standingTall = hinge >= SWING.lockoutPosture && knee >= SWING.lockoutKnee && shoulderRise >= SWING.lockoutRise;
    let note: string | undefined;
    // Arm straightness and forearm direction (+1 hanging straight down, -1 standing straight up)
    const elbowAngle = calculateAngle(shoulder, elbow, wrist);
    const forearmLen = Math.hypot(wrist.x - elbow.x, wrist.y - elbow.y);
    const forearmDown = forearmLen > 0.005 ? (wrist.y - elbow.y) / forearmLen : 0;
    // Forearm standing up at full length = a goblet hold / curl (a swung forearm points at the camera and looks short)
    // A swung forearm points at the camera at the top: elbow and wrist bunch up and the angle between them is noise,
    // so only a forearm still near full length on screen and clearly pointing up reads as a curl. Only below the
    // lockout line: a curl folds the forearm up while the bell is still low, but a swing carried overhead points it
    // straight up too, and that's not a fault
    const curled =
      rel > SWING.lockoutBell &&
      this.swingForearmRef > 0 &&
      forearmLen >= this.swingForearmRef * SWING.curlForearmLen &&
      forearmDown <= SWING.curlForearmUp;

    const dt = this.lastTimestamp > 0 ? Math.max(0.016, (timestampMs - this.lastTimestamp) / 1000) : 0.033;
    // lastMetricY keeps rel offset by SWING_REL_OFFSET so 0 still means "no previous frame" (reset on arm switch)
    const prevRel = this.lastMetricY > 0 ? this.lastMetricY - SWING_REL_OFFSET : null;
    const relVelocity = prevRel !== null ? (prevRel - rel) / dt : 0; // torso lengths/s, upward positive
    const upwardVelocity = relVelocity * torsoHeight;

    let emittedTelemetry: RepTelemetry | undefined = undefined;

    switch (this.currentState) {
      case 0: { // HIKE: straight arms, forearms hanging, bell at or below the hips, hips hinged, soft knees
        if (rel >= SWING.hikeBell && elbowAngle >= SWING.hikeElbow && forearmDown >= SWING.hikeForearm && hingedHike) {
          this.swingHikeShoulder = this.phaseStartTimestamp > 0 ? Math.max(this.swingHikeShoulder, shoulderY) : shoulderY;
          this.phaseStartTimestamp = timestampMs;
          this.maxMovementVelocity = 0;
          this.swingForearmRef = Math.max(this.swingForearmRef * 0.9, forearmLen);
        }
        if (this.phaseStartTimestamp > 0 && relVelocity > SWING.driveSpeed && rel <= 1.0) {
          this.currentState = 1;
          this.maxMovementVelocity = upwardVelocity;
          this.swingLineAt = 0;
          this.swingTallAt = 0;
          this.swingBest = { bell: rel, hinge, knee };
        }
        break;
      }
      case 1: { // DRIVE: the bell swings up and forward as the hips open
        if (upwardVelocity > this.maxMovementVelocity) {
          this.maxMovementVelocity = upwardVelocity;
        }
        this.swingHikeShoulder = Math.max(this.swingHikeShoulder, shoulderY);
        this.swingBest = {
          bell: Math.min(this.swingBest.bell, rel),
          hinge: Math.max(this.swingBest.hinge, hinge),
          knee: Math.max(this.swingBest.knee, knee),
        };
        // Fell back into the hike, or the forearms folded up into a curl: not a swing
        const fellBack = rel > 1.1 && relVelocity < -0.8;
        if (fellBack || curled) {
          const best = this.swingBest;
          note = curled
            ? `cancelled: forearm curled up (${forearmDown.toFixed(2)})`
            : `missed lockout — best: bell ${best.bell.toFixed(2)} posture ${best.hinge.toFixed(2)} knee ${best.knee.toFixed(2)} rise ${shoulderRise.toFixed(2)}`;
          this.currentState = 0;
          this.maxMovementVelocity = 0;
          if (curled) this.phaseStartTimestamp = 0;
          break;
        }
        // Lockout: the bell crosses the line and the hips and knees extend, together or within a short grace either way
        // (the bell usually gets there a beat before the hips finish); a bell floated up while still bent over doesn't count
        if (rel <= SWING.lockoutBell && !this.swingLineAt) this.swingLineAt = timestampMs;
        if (standingTall) this.swingTallAt = timestampMs;
        const nearLine = rel <= SWING.lockoutBell + SWING.lockoutSlack;
        const atLine =
          rel <= SWING.lockoutBell || (this.swingLineAt > 0 && timestampMs - this.swingLineAt <= SWING.lockoutGraceMs && nearLine);
        const wasTall = this.swingTallAt > 0 && timestampMs - this.swingTallAt <= SWING.lockoutGraceMs;
        if (atLine && (standingTall || (wasTall && nearLine))) {
          if (timestampMs - this.lastRepTimestamp >= this.minRepIntervalMs) {
            this.currentState = 2;
            this.repCount++;
            this.lastRepTimestamp = timestampMs;

            const wristDelta = Math.abs(lWrist.y - rWrist.y);
            const formScore = singleArm ? 0.95 : Math.max(0.65, 1.0 - wristDelta * 2.2);
            const rawPower = Math.round(55 + Math.max(0.6, this.maxMovementVelocity) * 38);
            const finalPower = Math.min(150, Math.max(50, rawPower));

            emittedTelemetry = {
              event: 'REP_TRIGGER',
              exercise: 'SWING',
              skillName: EXERCISE_SKILLS.SWING.skillName,
              power: finalPower,
              form: Number(formScore.toFixed(2)),
              repCount: this.repCount,
              state: 2,
              timestamp: timestampMs,
              wristVelocity: Number(this.maxMovementVelocity.toFixed(2)),
            };
            this.onRepCompleted?.(emittedTelemetry);
          }
        }
        break;
      }
      case 2: { // LOCKOUT / PEAK: the next rep needs a fresh hike
        if (rel > SWING.resetBell || relVelocity < -1.0) {
          this.currentState = 0;
          this.maxMovementVelocity = 0;
          this.phaseStartTimestamp = 0;
        }
        break;
      }
    }

    this.lastMetricY = rel + SWING_REL_OFFSET;
    this.lastTimestamp = timestampMs;

    const names = ['HIKE', 'DRIVE', 'LOCKOUT'];
    const update: KinematicStateUpdate = {
      exercise: 'SWING',
      state: this.currentState,
      stateName: names[this.currentState],
      stages: names,
      repCount: this.repCount,
      power: emittedTelemetry?.power || (this.currentState === 1 ? Math.round(50 + this.maxMovementVelocity * 32) : 0),
      form: emittedTelemetry?.form || 1.0,
      primaryY: wrist.y,
      referenceY: shoulderY,
      velocity: upwardVelocity,
      telemetry: emittedTelemetry,
      debugNotes: note ?? `bell ${rel.toFixed(2)} posture ${hinge.toFixed(2)} knee ${knee.toFixed(2)} rise ${shoulderRise.toFixed(2)} elbow ${Math.round(elbowAngle)}°`,
    };
    this.onStateChange?.(update);
    return update;
  }

  // =========================================================================
  // EXERCISE 2: GOBLET SQUAT ("TITAN GROUND SLAM")
  // =========================================================================
  private processSquat(landmarks: NormalizedLandmark[], timestampMs: number): KinematicStateUpdate {
    const lHip = landmarks[POSE_INDEX.LEFT_HIP];
    const rHip = landmarks[POSE_INDEX.RIGHT_HIP];
    const lKnee = landmarks[POSE_INDEX.LEFT_KNEE];
    const rKnee = landmarks[POSE_INDEX.RIGHT_KNEE];

    const hipY = (lHip.y + rHip.y) / 2;
    const kneeY = (lKnee.y + rKnee.y) / 2;

    const dt = this.lastTimestamp > 0 ? Math.max(0.016, (timestampMs - this.lastTimestamp) / 1000) : 0.033;
    const ascentVelocity = this.lastMetricY > 0 ? (this.lastMetricY - hipY) / dt : 0;

    let emittedTelemetry: RepTelemetry | undefined = undefined;
    const parallelDepthThreshold = kneeY - 0.05;

    switch (this.currentState) {
      case 0: { // STANDING
        if (hipY < kneeY - 0.16) {
          this.phaseStartTimestamp = timestampMs;
          this.maxSquatDepth = hipY;
        }
        if (hipY > kneeY - 0.12) {
          this.currentState = 1;
        }
        break;
      }
      case 1: { // SQUAT HOLE
        if (hipY > this.maxSquatDepth) {
          this.maxSquatDepth = hipY;
        }
        const reachedDepth = this.maxSquatDepth >= parallelDepthThreshold;
        if (reachedDepth && ascentVelocity > 0.25) {
          this.currentState = 2;
        }
        break;
      }
      case 2: { // ASCENDING LOCKOUT
        if (hipY <= kneeY - 0.15) {
          if (timestampMs - this.lastRepTimestamp >= this.minRepIntervalMs) {
            this.repCount++;
            this.lastRepTimestamp = timestampMs;

            const depthScore = Math.min(1.0, Math.max(0.7, (this.maxSquatDepth - (kneeY - 0.1)) / 0.1));
            const powerScore = Math.min(150, Math.max(60, Math.round(60 + ascentVelocity * 45)));

            emittedTelemetry = {
              event: 'REP_TRIGGER',
              exercise: 'SQUAT',
              skillName: EXERCISE_SKILLS.SQUAT.skillName,
              power: powerScore,
              form: Number(depthScore.toFixed(2)),
              repCount: this.repCount,
              state: 2,
              timestamp: timestampMs,
            };
            this.onRepCompleted?.(emittedTelemetry);

            this.currentState = 0;
            this.maxSquatDepth = 0;
          }
        }
        break;
      }
    }

    this.lastMetricY = hipY;
    this.lastTimestamp = timestampMs;

    const names = ['STAND', 'SQUAT DEPTH', 'DRIVE UP'];
    const update: KinematicStateUpdate = {
      exercise: 'SQUAT',
      state: this.currentState,
      stateName: names[this.currentState],
      stages: names,
      repCount: this.repCount,
      power: emittedTelemetry?.power || Math.round(50 + ascentVelocity * 30),
      form: emittedTelemetry?.form || 1.0,
      primaryY: hipY,
      referenceY: kneeY,
      velocity: ascentVelocity,
      telemetry: emittedTelemetry,
    };
    this.onStateChange?.(update);
    return update;
  }

  // =========================================================================
  // EXERCISE 3: CLEAN AND PRESS ("STORM BREAKER")
  // Two stages: Floor/Hang -> Rack Clean -> Overhead Lockout
  // Each wrist runs the sequence on its own: the bell hand is whichever one goes hang → rack → overhead, so a free
  // hand hanging at the side or held up still never makes (or breaks) a rep.
  // =========================================================================
  private processCleanAndPress(landmarks: NormalizedLandmark[], timestampMs: number): KinematicStateUpdate {
    const lShoulder = landmarks[POSE_INDEX.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_INDEX.RIGHT_SHOULDER];
    const lHip = landmarks[POSE_INDEX.LEFT_HIP];
    const rHip = landmarks[POSE_INDEX.RIGHT_HIP];

    const shoulderY = (lShoulder.y + rShoulder.y) / 2;
    const hipY = (lHip.y + rHip.y) / 2;
    const lockoutY = shoulderY - CLEAN_PRESS.lockout;

    const dt = this.lastTimestamp > 0 ? Math.max(0.016, (timestampMs - this.lastTimestamp) / 1000) : 0.033;

    let emittedTelemetry: RepTelemetry | undefined = undefined;
    const sides = ['LEFT', 'RIGHT'] as const;

    for (const side of sides) {
      const arm = this.cleanPressArms[side];
      const wrist = landmarks[side === 'LEFT' ? POSE_INDEX.LEFT_WRIST : POSE_INDEX.RIGHT_WRIST];
      const y = wrist.y;

      // Lost or teleporting wrist (e.g. the pose model swapping hands): drop this arm's rep rather than read a jump
      const glitch =
        (wrist.visibility ?? 1) < CLEAN_PRESS.minVisibility ||
        (arm.lastY > 0 && Math.abs(y - arm.lastY) > CLEAN_PRESS.maxFrameJump);
      if (glitch) {
        this.cleanPressArms[side] = { ...freshCleanPressArm(), lastY: y };
        continue;
      }

      const velocity = arm.lastY > 0 ? (arm.lastY - y) / dt : 0; // upward positive
      arm.lastY = y;

      switch (arm.state) {
        case 0: { // HANG SETUP
          if (y > hipY) arm.armed = true;
          // Only from the hang: the bell has to start below the hip
          if (arm.armed && y <= hipY && velocity > CLEAN_PRESS.pullSpeed) {
            arm.state = 1;
            arm.pullAt = timestampMs;
            arm.rackAt = 0;
            arm.racked = false;
            arm.peakSpeed = velocity;
          }
          break;
        }
        case 1: { // RACK CLEAN, then the press
          arm.peakSpeed = Math.max(arm.peakSpeed, velocity);
          if (Math.abs(y - shoulderY) < CLEAN_PRESS.rackBand) {
            if (!arm.rackAt) arm.rackAt = timestampMs;
            if (timestampMs - arm.rackAt >= CLEAN_PRESS.rackHoldMs) arm.racked = true;
          } else if (!arm.racked) {
            arm.rackAt = 0;
          }

          if (y > hipY) {
            arm.state = 0; // dropped back into the hang: start again
          } else if (!arm.racked && timestampMs - arm.pullAt > CLEAN_PRESS.pullTimeoutMs) {
            arm.state = 0;
            arm.armed = false;
          } else if (arm.racked && y <= lockoutY) {
            arm.state = 2;
            arm.armed = false;
            if (
              timestampMs - this.lastRepTimestamp >= this.minRepIntervalMs &&
              timestampMs - arm.pullAt >= CLEAN_PRESS.minRepMs
            ) {
              this.repCount++;
              this.lastRepTimestamp = timestampMs;
              this.armSide = side;

              const powerScore = Math.min(150, Math.max(65, Math.round(65 + arm.peakSpeed * 40)));
              emittedTelemetry = {
                event: 'REP_TRIGGER',
                exercise: 'CLEAN_AND_PRESS',
                skillName: EXERCISE_SKILLS.CLEAN_AND_PRESS.skillName,
                power: powerScore,
                form: 0.95,
                repCount: this.repCount,
                state: 2,
                timestamp: timestampMs,
              };
              this.onRepCompleted?.(emittedTelemetry);

              // Both hands on one bell finish together: the other one's matching run isn't a second rep
              const other = this.cleanPressArms[side === 'LEFT' ? 'RIGHT' : 'LEFT'];
              if (other.state === 1) {
                other.state = 0;
                other.armed = false;
              }
            }
          }
          break;
        }
        case 2: { // OVERHEAD LOCKOUT: back below the shoulders before the next hang
          if (y >= shoulderY) arm.state = 0;
          break;
        }
      }
    }

    // Report the arm furthest into a rep (the last bell arm while both rest)
    const { LEFT: left, RIGHT: right } = this.cleanPressArms;
    if (left.state !== right.state) this.armSide = left.state > right.state ? 'LEFT' : 'RIGHT';
    if (this.armSide === 'BOTH') this.armSide = 'RIGHT';
    const shown = this.cleanPressArms[this.armSide];
    const shownWrist = landmarks[this.armSide === 'LEFT' ? POSE_INDEX.LEFT_WRIST : POSE_INDEX.RIGHT_WRIST];
    this.currentState = shown.state;
    this.phaseStartTimestamp = shown.state === 0 && shown.armed ? timestampMs : 0;

    const velocity = this.lastMetricY > 0 ? (this.lastMetricY - shownWrist.y) / dt : 0;
    this.lastMetricY = shownWrist.y;
    this.lastTimestamp = timestampMs;

    const names = ['HANG', 'RACK CLEAN', 'OVERHEAD'];
    const update: KinematicStateUpdate = {
      exercise: 'CLEAN_AND_PRESS',
      state: this.currentState,
      stateName: names[this.currentState],
      stages: names,
      repCount: this.repCount,
      power: emittedTelemetry?.power || Math.round(55 + velocity * 30),
      form: emittedTelemetry?.form || 1.0,
      primaryY: shownWrist.y,
      referenceY: lockoutY,
      velocity,
      telemetry: emittedTelemetry,
    };
    this.onStateChange?.(update);
    return update;
  }

  // =========================================================================
  // EXERCISE 4: KETTLEBELL SNATCH ("PHOENIX ASCENSION")
  // Single uninterrupted high-velocity pull from hike straight overhead
  // =========================================================================
  private processSnatch(landmarks: NormalizedLandmark[], timestampMs: number): KinematicStateUpdate {
    const lWrist = landmarks[POSE_INDEX.LEFT_WRIST];
    const rWrist = landmarks[POSE_INDEX.RIGHT_WRIST];
    const lShoulder = landmarks[POSE_INDEX.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_INDEX.RIGHT_SHOULDER];
    const lHip = landmarks[POSE_INDEX.LEFT_HIP];
    const rHip = landmarks[POSE_INDEX.RIGHT_HIP];

    const shoulderY = (lShoulder.y + rShoulder.y) / 2;
    const hipY = (lHip.y + rHip.y) / 2;
    const torsoHeight = Math.max(0.12, this.standingTorso);
    const lockoutY = shoulderY - SNATCH.lockout * torsoHeight;

    // The bell is the higher wrist on the way up and the lower one in the hike; speed is the faster-rising wrist
    const topY = Math.min(lWrist.y, rWrist.y);
    const bottomY = Math.max(lWrist.y, rWrist.y);
    const dt = this.lastTimestamp > 0 ? Math.max(0.016, (timestampMs - this.lastTimestamp) / 1000) : 0.033;
    const prev = this.snatchLastWrists;
    const velocity = prev ? Math.max(prev.l - lWrist.y, prev.r - rWrist.y) / dt : 0;

    let emittedTelemetry: RepTelemetry | undefined = undefined;

    switch (this.currentState) {
      case 0: { // BACKSWING / HIKE
        if (bottomY > hipY) {
          this.phaseStartTimestamp = timestampMs;
          this.maxMovementVelocity = 0;
        }
        // Continuous high pull explosive drive
        // Only from the backswing: the bell has to have been below the hip
        if (this.phaseStartTimestamp > 0 && velocity > SNATCH.pullSpeed) {
          this.currentState = 1;
          this.phaseStartTimestamp = timestampMs;
          this.maxMovementVelocity = velocity;
        }
        break;
      }
      case 1: { // HIGH PULL / FLOAT (Bypasses rack)
        if (velocity > this.maxMovementVelocity) {
          this.maxMovementVelocity = velocity;
        }
        // A swing or a pull that died: back to the hike
        if (timestampMs - this.phaseStartTimestamp > SNATCH.pullTimeoutMs || (topY > hipY && velocity < 0)) {
          this.currentState = 0;
          this.phaseStartTimestamp = 0;
          this.maxMovementVelocity = 0;
          break;
        }
        // Punch-through to overhead lockout
        if (topY <= lockoutY) {
          if (timestampMs - this.lastRepTimestamp >= this.minRepIntervalMs) {
            this.currentState = 2;
            this.repCount++;
            this.lastRepTimestamp = timestampMs;

            const powerScore = Math.min(150, Math.max(70, Math.round(70 + this.maxMovementVelocity * 45)));
            emittedTelemetry = {
              event: 'REP_TRIGGER',
              exercise: 'SNATCH',
              skillName: EXERCISE_SKILLS.SNATCH.skillName,
              power: powerScore,
              form: 0.96,
              repCount: this.repCount,
              state: 2,
              timestamp: timestampMs,
            };
            this.onRepCompleted?.(emittedTelemetry);
          }
        }
        break;
      }
      case 2: { // OVERHEAD LOCKOUT RETURN
        if (topY > shoulderY - SNATCH.reset * torsoHeight) {
          this.currentState = 0;
          this.maxMovementVelocity = 0;
          this.phaseStartTimestamp = 0;
        }
        break;
      }
    }

    this.snatchLastWrists = { l: lWrist.y, r: rWrist.y };
    this.lastTimestamp = timestampMs;

    const names = ['HIKE', 'EXPLOSIVE PULL', 'OVERHEAD LOCK'];
    const update: KinematicStateUpdate = {
      exercise: 'SNATCH',
      state: this.currentState,
      stateName: names[this.currentState],
      stages: names,
      repCount: this.repCount,
      power: emittedTelemetry?.power || Math.round(60 + velocity * 35),
      form: emittedTelemetry?.form || 1.0,
      primaryY: topY,
      referenceY: lockoutY,
      velocity,
      telemetry: emittedTelemetry,
    };
    this.onStateChange?.(update);
    return update;
  }

  // =========================================================================
  // EXERCISE 5: KETTLEBELL WINDMILL ("ASTRAL SPIRE")
  // Overhead arm locked; torso lateral hinges until bottom hand touches ankle
  // =========================================================================
  private processWindmill(landmarks: NormalizedLandmark[], timestampMs: number): KinematicStateUpdate {
    const lWrist = landmarks[POSE_INDEX.LEFT_WRIST];
    const rWrist = landmarks[POSE_INDEX.RIGHT_WRIST];
    const lShoulder = landmarks[POSE_INDEX.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_INDEX.RIGHT_SHOULDER];
    const lKnee = landmarks[POSE_INDEX.LEFT_KNEE];
    const rKnee = landmarks[POSE_INDEX.RIGHT_KNEE];
    const lAnkle = landmarks[POSE_INDEX.LEFT_ANKLE];
    const rAnkle = landmarks[POSE_INDEX.RIGHT_ANKLE];

    const isLeftArmTop = lWrist.y < rWrist.y;
    const topWrist = isLeftArmTop ? lWrist : rWrist;
    const bottomWrist = isLeftArmTop ? rWrist : lWrist;

    const shoulderY = (lShoulder.y + rShoulder.y) / 2;
    const kneeY = (lKnee.y + rKnee.y) / 2;
    const ankleY = (lAnkle.y + rAnkle.y) / 2;

    let emittedTelemetry: RepTelemetry | undefined = undefined;

    switch (this.currentState) {
      case 0: { // OVERHEAD START
        // Top arm locked overhead, bottom hand high
        if (topWrist.y < shoulderY - 0.20 && bottomWrist.y < kneeY - 0.15) {
          this.phaseStartTimestamp = timestampMs;
        }
        // Cooldown after a rep: the hand settling back up past the knee line is the same rep, not a new descent
        if (bottomWrist.y > kneeY - 0.08 && timestampMs - this.lastRepTimestamp >= WINDMILL.cooldownMs) {
          this.currentState = 1;
        }
        break;
      }
      case 1: { // LATERAL DESCENT TOWARDS ANKLE
        // Bottom hand reaches ankle while top wrist remains high overhead
        if (bottomWrist.y >= ankleY - 0.12 && topWrist.y < shoulderY - 0.18) {
          this.currentState = 2;
        }
        break;
      }
      case 2: { // RETURN TO UPRIGHT STAND
        if (bottomWrist.y <= kneeY - 0.15) {
          if (timestampMs - this.lastRepTimestamp >= WINDMILL.cooldownMs) {
            this.repCount++;
            this.lastRepTimestamp = timestampMs;

            const stabilityScore = topWrist.y < shoulderY - 0.22 ? 1.0 : 0.85;
            emittedTelemetry = {
              event: 'REP_TRIGGER',
              exercise: 'WINDMILL',
              skillName: EXERCISE_SKILLS.WINDMILL.skillName,
              power: 85,
              form: stabilityScore,
              repCount: this.repCount,
              state: 2,
              timestamp: timestampMs,
            };
            this.onRepCompleted?.(emittedTelemetry);

            this.currentState = 0;
          }
        }
        break;
      }
    }

    this.lastMetricY = bottomWrist.y;
    this.lastTimestamp = timestampMs;

    const names = ['OVERHEAD LOCK', 'LATERAL HINGE', 'RETURN STAND'];
    const update: KinematicStateUpdate = {
      exercise: 'WINDMILL',
      state: this.currentState,
      stateName: names[this.currentState],
      stages: names,
      repCount: this.repCount,
      power: emittedTelemetry?.power || 75,
      form: emittedTelemetry?.form || 1.0,
      primaryY: bottomWrist.y,
      referenceY: ankleY,
      velocity: 0,
      telemetry: emittedTelemetry,
    };
    this.onStateChange?.(update);
    return update;
  }

  // =========================================================================
  // EXERCISE 6: KETTLEBELL DEADLIFT ("MOUNTAIN SUNDER")
  // Strict vertical pull from mid-shin to hip; wrists never rise to shoulders
  // =========================================================================
  private processDeadlift(landmarks: NormalizedLandmark[], timestampMs: number): KinematicStateUpdate {
    const lWrist = landmarks[POSE_INDEX.LEFT_WRIST];
    const rWrist = landmarks[POSE_INDEX.RIGHT_WRIST];
    const lHip = landmarks[POSE_INDEX.LEFT_HIP];
    const rHip = landmarks[POSE_INDEX.RIGHT_HIP];
    const lKnee = landmarks[POSE_INDEX.LEFT_KNEE];
    const rKnee = landmarks[POSE_INDEX.RIGHT_KNEE];

    const wrist = this.workingWrist(landmarks);
    const wristY = wrist.y;
    // Arms hang straight through the whole pull (a goblet squat moves the bell as far, with bent elbows)
    const lElbow = landmarks[POSE_INDEX.LEFT_ELBOW];
    const rElbow = landmarks[POSE_INDEX.RIGHT_ELBOW];
    const lShoulder = landmarks[POSE_INDEX.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_INDEX.RIGHT_SHOULDER];
    const elbow = this.armSide === 'LEFT' ? lElbow : this.armSide === 'RIGHT' ? rElbow : { x: (lElbow.x + rElbow.x) / 2, y: (lElbow.y + rElbow.y) / 2 };
    const shoulder = this.armSide === 'LEFT' ? lShoulder : this.armSide === 'RIGHT' ? rShoulder : { x: (lShoulder.x + rShoulder.x) / 2, y: (lShoulder.y + rShoulder.y) / 2 };
    const armsStraight = calculateAngle(shoulder, elbow, wrist) >= 145 && wrist.y > elbow.y;
    const hipY = (lHip.y + rHip.y) / 2;
    const kneeY = (lKnee.y + rKnee.y) / 2;
    // A deadlift stands up with both hands level; a gorilla row keeps the shoulders down and pulls one hand past the other
    const shoulderY = (lShoulder.y + rShoulder.y) / 2;
    const torsoHeight = Math.max(0.12, this.standingTorso);
    const hinge = (hipY - shoulderY) / torsoHeight;
    const split = Math.abs(lWrist.y - rWrist.y) / torsoHeight;
    const shoulderRise = this.deadliftBottomShoulder > 0 ? (this.deadliftBottomShoulder - shoulderY) / torsoHeight : 0;

    const dt = this.lastTimestamp > 0 ? Math.max(0.016, (timestampMs - this.lastTimestamp) / 1000) : 0.033;
    const pullVelocity = this.lastMetricY > 0 ? (this.lastMetricY - wristY) / dt : 0;

    let emittedTelemetry: RepTelemetry | undefined = undefined;
    let note: string | undefined;

    switch (this.currentState) {
      case 0: { // FLOOR / SHIN SETUP
        if (wristY > kneeY && armsStraight) {
          this.phaseStartTimestamp = timestampMs;
          this.maxMovementVelocity = 0;
          this.deadliftBottomShoulder = Math.max(this.deadliftBottomShoulder, shoulderY);
        }
        // Only a pull from below the knee: the bell has to start low
        if (this.phaseStartTimestamp > 0 && pullVelocity > 0.25 && wristY <= kneeY) {
          this.currentState = 1;
        }
        break;
      }
      case 1: { // PULLING PAST KNEES
        if (pullVelocity > this.maxMovementVelocity) {
          this.maxMovementVelocity = pullVelocity;
        }
        // A bent arm (from the side), or an elbow rowed up beside the shoulder (from the front): not a deadlift
        if (!armsStraight || this.elbowRowedUp(landmarks)) {
          this.currentState = 0;
          this.phaseStartTimestamp = 0;
          this.deadliftBottomShoulder = 0;
          break;
        }
        // Sank back to the shin without standing up (a row lowering, or a pull given up): set up again
        if (wristY > kneeY + 0.03) {
          this.currentState = 0;
          break;
        }
        // Carried on up past the hips: a swing
        if (wristY < hipY - DEADLIFT.swingAboveHip * torsoHeight) {
          note = 'cancelled: bell swung past the hips';
          this.currentState = 0;
          this.phaseStartTimestamp = 0;
          this.deadliftBottomShoulder = 0;
          break;
        }
        // Strict hip lockout (wrists at hip level, NOT swinging upward), standing tall with both hands level,
        // the bell settled there
        if (wristY <= hipY + 0.05 && pullVelocity / torsoHeight < DEADLIFT.settleSpeed) {
          if (split > DEADLIFT.maxSplit) {
            note = `not counted: one hand up (split ${split.toFixed(2)}), a row?`;
            break;
          }
          if (shoulderRise < DEADLIFT.shoulderRise || hinge < DEADLIFT.lockoutHinge) {
            note = `stand tall — rise ${shoulderRise.toFixed(2)} hinge ${hinge.toFixed(2)}`;
            break;
          }
          if (timestampMs - this.lastRepTimestamp >= this.minRepIntervalMs) {
            this.currentState = 2;
            this.repCount++;
            this.lastRepTimestamp = timestampMs;

            const powerScore = Math.min(150, Math.max(60, Math.round(60 + this.maxMovementVelocity * 40)));
            emittedTelemetry = {
              event: 'REP_TRIGGER',
              exercise: 'DEADLIFT',
              skillName: EXERCISE_SKILLS.DEADLIFT.skillName,
              power: powerScore,
              form: 0.98,
              repCount: this.repCount,
              state: 2,
              timestamp: timestampMs,
            };
            this.onRepCompleted?.(emittedTelemetry);
          }
        }
        break;
      }
      case 2: { // STANDING HIP LOCKOUT RETURN
        if (wristY > kneeY - 0.05) {
          this.currentState = 0;
          this.maxMovementVelocity = 0;
          this.phaseStartTimestamp = 0;
          this.deadliftBottomShoulder = 0;
        }
        break;
      }
    }

    this.lastMetricY = wristY;
    this.lastTimestamp = timestampMs;

    const names = ['SHIN SETUP', 'DRIVE UP', 'HIP LOCKOUT'];
    const update: KinematicStateUpdate = {
      exercise: 'DEADLIFT',
      state: this.currentState,
      stateName: names[this.currentState],
      stages: names,
      repCount: this.repCount,
      power: emittedTelemetry?.power || Math.round(50 + pullVelocity * 30),
      form: emittedTelemetry?.form || 1.0,
      primaryY: wristY,
      referenceY: hipY,
      velocity: pullVelocity,
      telemetry: emittedTelemetry,
      debugNotes: note ?? `rise ${shoulderRise.toFixed(2)} hinge ${hinge.toFixed(2)} split ${split.toFixed(2)}`,
    };
    this.onStateChange?.(update);
    return update;
  }

  // =========================================================================
  // EXERCISE 7: SINGLE-ARM OVERHEAD PRESS ("THUNDER SMITE")
  // Strict vertical push from rack position to full overhead lockout
  // =========================================================================
  private processOverheadPress(landmarks: NormalizedLandmark[], timestampMs: number): KinematicStateUpdate {
    const lWrist = landmarks[POSE_INDEX.LEFT_WRIST];
    const rWrist = landmarks[POSE_INDEX.RIGHT_WRIST];
    const lShoulder = landmarks[POSE_INDEX.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_INDEX.RIGHT_SHOULDER];

    const workingWrist = this.workingWrist(landmarks);

    const shoulderY = (lShoulder.y + rShoulder.y) / 2;
    const dt = this.lastTimestamp > 0 ? Math.max(0.016, (timestampMs - this.lastTimestamp) / 1000) : 0.033;
    const upwardVelocity = this.lastMetricY > 0 ? (this.lastMetricY - workingWrist.y) / dt : 0;

    let emittedTelemetry: RepTelemetry | undefined = undefined;
    const overheadLockoutY = shoulderY - 0.22;

    switch (this.currentState) {
      case 0: { // RACK POSITION
        // Racked = the bell settles at the shoulder; one sweeping up from below (a snatch or swing) doesn't count
        const inRack = workingWrist.y >= shoulderY - 0.08 && workingWrist.y <= shoulderY + 0.15;
        if (inRack && Math.abs(upwardVelocity) < 1.0) {
          this.phaseStartTimestamp = timestampMs;
          this.maxMovementVelocity = 0;
        } else if (workingWrist.y > shoulderY + 0.15) {
          this.phaseStartTimestamp = 0;
        }
        // Only a press from the rack: the bell has to start at the shoulder
        if (this.phaseStartTimestamp > 0 && workingWrist.y < shoulderY - 0.08 && upwardVelocity > 0.3) {
          this.currentState = 1;
          this.maxMovementVelocity = upwardVelocity;
        }
        break;
      }
      case 1: { // PRESSING UPWARD
        if (upwardVelocity > this.maxMovementVelocity) {
          this.maxMovementVelocity = upwardVelocity;
        }
        if (workingWrist.y <= overheadLockoutY) {
          if (timestampMs - this.lastRepTimestamp >= this.minRepIntervalMs) {
            this.currentState = 2;
            this.repCount++;
            this.lastRepTimestamp = timestampMs;

            const powerScore = Math.min(150, Math.max(55, Math.round(55 + this.maxMovementVelocity * 40)));
            emittedTelemetry = {
              event: 'REP_TRIGGER',
              exercise: 'OVERHEAD_PRESS',
              skillName: EXERCISE_SKILLS.OVERHEAD_PRESS.skillName,
              power: powerScore,
              form: 0.95,
              repCount: this.repCount,
              state: 2,
              timestamp: timestampMs,
            };
            this.onRepCompleted?.(emittedTelemetry);
          }
        }
        break;
      }
      case 2: { // OVERHEAD LOCKOUT RETURN
        if (workingWrist.y >= shoulderY - 0.06 || upwardVelocity < -0.2) {
          this.currentState = 0;
          this.maxMovementVelocity = 0;
          this.phaseStartTimestamp = 0;
        }
        break;
      }
    }

    this.lastMetricY = workingWrist.y;
    this.lastTimestamp = timestampMs;

    const names = ['RACK', 'PRESSING', 'OVERHEAD'];
    const update: KinematicStateUpdate = {
      exercise: 'OVERHEAD_PRESS',
      state: this.currentState,
      stateName: names[this.currentState],
      stages: names,
      repCount: this.repCount,
      power: emittedTelemetry?.power || Math.round(50 + this.maxMovementVelocity * 30),
      form: emittedTelemetry?.form || 1.0,
      primaryY: workingWrist.y,
      referenceY: overheadLockoutY,
      velocity: upwardVelocity,
      telemetry: emittedTelemetry,
    };
    this.onStateChange?.(update);
    return update;
  }

  // =========================================================================
  // EXERCISE 8: KETTLEBELL THRUSTER ("SOLAR ERUPTION")
  // Deep squat hole directly transferring momentum into overhead press
  // =========================================================================
  private processThruster(landmarks: NormalizedLandmark[], timestampMs: number): KinematicStateUpdate {
    const lWrist = landmarks[POSE_INDEX.LEFT_WRIST];
    const rWrist = landmarks[POSE_INDEX.RIGHT_WRIST];
    const lShoulder = landmarks[POSE_INDEX.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_INDEX.RIGHT_SHOULDER];
    const lHip = landmarks[POSE_INDEX.LEFT_HIP];
    const rHip = landmarks[POSE_INDEX.RIGHT_HIP];
    const lKnee = landmarks[POSE_INDEX.LEFT_KNEE];
    const rKnee = landmarks[POSE_INDEX.RIGHT_KNEE];

    const wristY = this.workingWrist(landmarks).y;
    const shoulderY = (lShoulder.y + rShoulder.y) / 2;
    const hipY = (lHip.y + rHip.y) / 2;
    const kneeY = (lKnee.y + rKnee.y) / 2;

    const dt = this.lastTimestamp > 0 ? Math.max(0.016, (timestampMs - this.lastTimestamp) / 1000) : 0.033;
    const upwardVelocity = this.lastMetricY > 0 ? (this.lastMetricY - wristY) / dt : 0;

    let emittedTelemetry: RepTelemetry | undefined = undefined;

    switch (this.currentState) {
      case 0: { // RACK STAND
        if (hipY < kneeY - 0.16 && wristY <= shoulderY + 0.12) {
          this.maxSquatDepth = hipY;
        }
        // Descent begins
        if (hipY > kneeY - 0.10) {
          this.currentState = 1;
        }
        break;
      }
      case 1: { // DEEP SQUAT HOLE
        if (hipY > this.maxSquatDepth) {
          this.maxSquatDepth = hipY;
        }
        // Ascending out of hole into overhead drive
        if (this.maxSquatDepth >= kneeY - 0.05 && upwardVelocity > 0.35) {
          this.currentState = 2;
        }
        break;
      }
      case 2: { // EXPLOSIVE OVERHEAD LOCKOUT
        if (wristY <= shoulderY - 0.22 && hipY <= kneeY - 0.15) {
          if (timestampMs - this.lastRepTimestamp >= this.minRepIntervalMs) {
            this.repCount++;
            this.lastRepTimestamp = timestampMs;

            const powerScore = Math.min(150, Math.max(70, Math.round(70 + upwardVelocity * 45)));
            emittedTelemetry = {
              event: 'REP_TRIGGER',
              exercise: 'THRUSTER',
              skillName: EXERCISE_SKILLS.THRUSTER.skillName,
              power: powerScore,
              form: 0.96,
              repCount: this.repCount,
              state: 2,
              timestamp: timestampMs,
            };
            this.onRepCompleted?.(emittedTelemetry);

            this.currentState = 0;
            this.maxSquatDepth = 0;
          }
        }
        break;
      }
    }

    this.lastMetricY = wristY;
    this.lastTimestamp = timestampMs;

    const names = ['RACK STAND', 'SQUAT HOLE', 'THRUST OVERHEAD'];
    const update: KinematicStateUpdate = {
      exercise: 'THRUSTER',
      state: this.currentState,
      stateName: names[this.currentState],
      stages: names,
      repCount: this.repCount,
      power: emittedTelemetry?.power || Math.round(60 + upwardVelocity * 35),
      form: emittedTelemetry?.form || 1.0,
      primaryY: wristY,
      referenceY: shoulderY - 0.22,
      velocity: upwardVelocity,
      telemetry: emittedTelemetry,
    };
    this.onStateChange?.(update);
    return update;
  }

  // =========================================================================
  // EXERCISE 9: GORILLA ROW ("BEAST MAW")
  // Hinged bent-over stance; the elbow drives upward past the rib cage, drawing the wrist up toward its shoulder.
  // One bell or two: the free hand may hang, rest on a knee or thigh, or row next. The shoulders stay put
  // (standing up with the bell is a deadlift, whose straight arms never shorten the reach).
  // =========================================================================
  private processGorillaRow(landmarks: NormalizedLandmark[], timestampMs: number): KinematicStateUpdate {
    const lWrist = landmarks[POSE_INDEX.LEFT_WRIST];
    const rWrist = landmarks[POSE_INDEX.RIGHT_WRIST];
    const lElbow = landmarks[POSE_INDEX.LEFT_ELBOW];
    const rElbow = landmarks[POSE_INDEX.RIGHT_ELBOW];
    const lHip = landmarks[POSE_INDEX.LEFT_HIP];
    const rHip = landmarks[POSE_INDEX.RIGHT_HIP];
    const lShoulder = landmarks[POSE_INDEX.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_INDEX.RIGHT_SHOULDER];

    const hipY = (lHip.y + rHip.y) / 2;
    // The lower shoulder: rowing twists the torso up on the rowing side, but only standing up lifts both
    const shoulderY = Math.max(lShoulder.y, rShoulder.y);
    const torsoHeight = Math.max(0.12, this.standingTorso);
    const dt = this.lastTimestamp > 0 ? Math.max(0.016, (timestampMs - this.lastTimestamp) / 1000) : 0.033;

    // How far each arm has drawn up from where it hung (see updateArmReach)
    const hang = this.armHangReach ?? this.armReach;
    const pull = { l: hang.l - this.armReach.l, r: hang.r - this.armReach.r };
    if (pull.l < ROW.startPull) this.rowReady.l = true;
    if (pull.r < ROW.startPull) this.rowReady.r = true;

    // Working arm: in the hang, the one drawing up from its hang right now (a free hand resting on a thigh holds
    // still); once a pull starts, that arm until the rep is done. Each elbow keeps its own velocity reference, so
    // the arms alternating never reads as a jump
    const rising = (side: 'l' | 'r') =>
      this.rowReady[side] && pull[side] >= ROW.startPull && this.armReachRate[side] < -ROW.stillRate;
    // A pull whose arm stalls before counting (a free hand being braced on a thigh) hands over to an arm that's rising
    const stalled = this.currentState === 1 && this.armReachRate[this.rowArmLeft ? 'l' : 'r'] > -ROW.stillRate;
    if ((this.currentState === 0 || stalled) && (rising('l') || rising('r'))) {
      this.rowArmLeft = rising('l') && rising('r') ? pull.l >= pull.r : rising('l');
    }
    const isLeftArmActive = this.rowArmLeft;
    const activePull = isLeftArmActive ? pull.l : pull.r;
    const activeReady = isLeftArmActive ? this.rowReady.l : this.rowReady.r;
    const activeElbow = isLeftArmActive ? lElbow : rElbow;
    const activeWrist = isLeftArmActive ? lWrist : rWrist;
    const shoulderRise = this.rowHangShoulder > 0 ? (this.rowHangShoulder - shoulderY) / torsoHeight : 0;

    const prev = this.rowLastElbows;
    const rowVelocity = prev ? ((isLeftArmActive ? prev.l : prev.r) - activeElbow.y) / dt : 0;

    let emittedTelemetry: RepTelemetry | undefined = undefined;
    let note: string | undefined;

    switch (this.currentState) {
      case 0: { // HANG SETUP
        // Shoulder rise is measured from the lowest the shoulders have recently been, which relaxes slowly: a
        // deadlift's quick stand-up can't creep past it, a slow change of stance between reps can
        this.phaseStartTimestamp = timestampMs;
        this.maxMovementVelocity = 0;
        this.rowHangShoulder = Math.max(shoulderY, this.rowHangShoulder - ROW.shoulderRelax * torsoHeight * dt);
        // The pull starts once an arm draws up from its hang, however slowly (speed only sets the power)
        if (rising(isLeftArmActive ? 'l' : 'r') && activeElbow.y <= hipY + 0.05) {
          this.currentState = 1;
        }
        break;
      }
      case 1: { // ROW PULL
        if (rowVelocity > this.maxMovementVelocity) {
          this.maxMovementVelocity = rowVelocity;
        }
        // Standing up with the bells is a deadlift or a swing
        if (shoulderRise > ROW.maxShoulderRise) {
          note = `cancelled: stood up (rise ${shoulderRise.toFixed(2)}), a deadlift or swing?`;
          this.currentState = 0;
          this.phaseStartTimestamp = 0;
          break;
        }
        // Lowered again without finishing the row
        if (activePull < ROW.startPull) {
          this.currentState = 0;
          break;
        }
        // Elbow drives past rib plane, the wrist drawn well up toward its shoulder
        if (activeReady && activeElbow.y <= hipY - 0.06 && activeWrist.y <= hipY + 0.06 && activePull >= ROW.pull) {
          if (this.posture > ROW.maxPosture) {
            note = `not counted: stand hunched over (posture ${this.posture.toFixed(2)})`;
            break;
          }
          if (timestampMs - this.lastRepTimestamp >= this.minRepIntervalMs) {
            this.currentState = 2;
            this.repCount++;
            this.lastRepTimestamp = timestampMs;
            this.rowReady[isLeftArmActive ? 'l' : 'r'] = false;

            const powerScore = Math.min(150, Math.max(55, Math.round(55 + this.maxMovementVelocity * 40)));
            emittedTelemetry = {
              event: 'REP_TRIGGER',
              exercise: 'GORILLA_ROW',
              skillName: EXERCISE_SKILLS.GORILLA_ROW.skillName,
              power: powerScore,
              form: 0.94,
              repCount: this.repCount,
              state: 2,
              timestamp: timestampMs,
            };
            this.onRepCompleted?.(emittedTelemetry);
          }
        }
        break;
      }
      case 2: { // CONTRACTION RETURN
        // Once the rowed arm lowers past the line; it can't count again until it's back at the hang, but the
        // other arm may already be starting the next rep
        if (activePull < ROW.pull) {
          this.currentState = 0;
          this.maxMovementVelocity = 0;
          this.rowHangShoulder = shoulderY;
        }
        break;
      }
    }

    this.rowLastElbows = { l: lElbow.y, r: rElbow.y };
    this.lastTimestamp = timestampMs;

    const names = ['HANG', 'ROW PULL', 'RIB CONTRACTION'];
    const update: KinematicStateUpdate = {
      exercise: 'GORILLA_ROW',
      state: this.currentState,
      stateName: names[this.currentState],
      stages: names,
      repCount: this.repCount,
      power: emittedTelemetry?.power || Math.round(50 + rowVelocity * 30),
      form: emittedTelemetry?.form || 1.0,
      primaryY: activeElbow.y,
      referenceY: hipY - 0.06,
      velocity: rowVelocity,
      telemetry: emittedTelemetry,
      debugNotes: note ?? `pull L ${pull.l.toFixed(2)} R ${pull.r.toFixed(2)} rise ${shoulderRise.toFixed(2)} posture ${this.posture.toFixed(2)}`,
    };
    this.onStateChange?.(update);
    return update;
  }

  // =========================================================================
  // EXERCISE 10: KETTLEBELL AROUND-THE-BODY PASS ("CELESTIAL WARD")
  // Smooth 360-degree hand-to-hand pass around the waist and hips
  // =========================================================================
  private processAroundTheBody(landmarks: NormalizedLandmark[], timestampMs: number): KinematicStateUpdate {
    const lWrist = landmarks[POSE_INDEX.LEFT_WRIST];
    const rWrist = landmarks[POSE_INDEX.RIGHT_WRIST];
    const lHip = landmarks[POSE_INDEX.LEFT_HIP];
    const rHip = landmarks[POSE_INDEX.RIGHT_HIP];
    const lShoulder = landmarks[POSE_INDEX.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_INDEX.RIGHT_SHOULDER];

    const hipX = (lHip.x + rHip.x) / 2;
    const hipY = (lHip.y + rHip.y) / 2;
    const shoulderY = (lShoulder.y + rShoulder.y) / 2;
    const torso = Math.max(0.05, hipY - shoulderY);
    const unit = Math.max(0.05, Math.abs(lShoulder.x - rShoulder.x));

    // Wrist offsets from the hip centre in shoulder widths; the bell is in the hand held farther out
    const lRel = (lWrist.x - hipX) / unit;
    const rRel = (rWrist.x - hipX) / unit;
    const activeWrist = Math.abs(lRel) > Math.abs(rRel) ? lWrist : rWrist;
    const wristRelX = Math.abs(lRel) > Math.abs(rRel) ? lRel : rRel;
    const wristY = (lWrist.y + rWrist.y) / 2;

    // Orbits run anywhere from chest to knee height; the free hand's height doesn't matter once the bell is out
    const inBand = (y: number) => y >= shoulderY - torso * AROUND.aboveShoulder && y <= hipY + torso * AROUND.belowHip;
    const handsTogether =
      inBand(wristY) && Math.abs(lRel - rRel) <= AROUND.together && Math.abs((lRel + rRel) / 2) <= AROUND.frontReach;
    const flank = inBand(activeWrist.y) && Math.abs(wristRelX) >= AROUND.flank ? Math.sign(wristRelX) : 0;

    // A stage that stalls (arms resting at the sides) drops the orbit; the hands must meet in front again
    if ((this.aroundArmed || this.currentState > 0) && timestampMs - this.aroundStepAt > AROUND.stepMs) {
      this.currentState = 0;
      this.aroundArmed = false;
      this.aroundSide = 0;
    }

    let emittedTelemetry: RepTelemetry | undefined = undefined;

    switch (this.currentState) {
      case 0: { // HANDS MEET in front to pass the bell, then it goes out to one flank
        if (handsTogether) {
          this.aroundArmed = true;
          this.aroundStepAt = timestampMs;
        } else if (this.aroundArmed && flank !== 0) {
          this.aroundSide = flank;
          this.currentState = 1;
          this.aroundStepAt = timestampMs;
        }
        break;
      }
      case 1: { // BEHIND THE BACK -> BELL OUT ON THE OTHER FLANK
        if (flank === -this.aroundSide) {
          this.currentState = 2;
          this.aroundStepAt = timestampMs;
        }
        break;
      }
      case 2: { // BACK TO THE FRONT: hands meet to pass it again
        if (handsTogether && timestampMs - this.lastRepTimestamp >= AROUND.cooldownMs) {
          this.repCount++;
          this.lastRepTimestamp = timestampMs;

          const torsoTilt = Math.abs(lShoulder.y - rShoulder.y);
          const formScore = Math.max(0.7, Number((1.0 - torsoTilt * 2.5).toFixed(2)));
          const powerScore = 80;

          emittedTelemetry = {
            event: 'REP_TRIGGER',
            exercise: 'AROUND_THE_BODY',
            skillName: EXERCISE_SKILLS.AROUND_THE_BODY.skillName,
            power: powerScore,
            form: formScore,
            repCount: this.repCount,
            state: 2,
            timestamp: timestampMs,
          };
          this.onRepCompleted?.(emittedTelemetry);

          // The hands are together, which already starts the next orbit
          this.currentState = 0;
          this.aroundArmed = true;
          this.aroundSide = 0;
          this.aroundStepAt = timestampMs;
        }
        break;
      }
    }

    this.lastMetricX = activeWrist.x;
    this.lastMetricY = wristY;
    this.lastTimestamp = timestampMs;

    const names = ['HANDS MEET', 'BEHIND BACK', 'ORBIT RETURN'];
    const update: KinematicStateUpdate = {
      exercise: 'AROUND_THE_BODY',
      state: this.currentState,
      stateName: names[this.currentState],
      stages: names,
      repCount: this.repCount,
      power: emittedTelemetry?.power || 75,
      form: emittedTelemetry?.form || 1.0,
      primaryY: wristY,
      referenceY: hipY,
      velocity: Math.abs(wristRelX),
      telemetry: emittedTelemetry,
      debugNotes: `bell ${wristRelX.toFixed(2)} gap ${Math.abs(lRel - rRel).toFixed(2)} side ${this.aroundSide}${this.aroundArmed ? ' armed' : ''}`,
    };
    this.onStateChange?.(update);
    return update;
  }

  // =========================================================================
  // EXERCISE 11: SINGLE-LEG ROMANIAN DEADLIFT ("VALKYRIE BALANCE")
  // Unilateral posterior hinge; trail leg extends straight backward horizontally
  // =========================================================================
  private processSingleLegRDL(landmarks: NormalizedLandmark[], timestampMs: number): KinematicStateUpdate {
    const lAnkle = landmarks[POSE_INDEX.LEFT_ANKLE];
    const rAnkle = landmarks[POSE_INDEX.RIGHT_ANKLE];
    const lKnee = landmarks[POSE_INDEX.LEFT_KNEE];
    const rKnee = landmarks[POSE_INDEX.RIGHT_KNEE];
    const lHip = landmarks[POSE_INDEX.LEFT_HIP];
    const rHip = landmarks[POSE_INDEX.RIGHT_HIP];
    const lWrist = landmarks[POSE_INDEX.LEFT_WRIST];
    const rWrist = landmarks[POSE_INDEX.RIGHT_WRIST];

    // Determine planted vs trail leg: trail ankle rises significantly above planted ankle, or trail knee elevates
    const hasAnkles = lAnkle && rAnkle && (lAnkle.visibility ?? 0) > 0.35 && (rAnkle.visibility ?? 0) > 0.35;
    const isLeftPlanted = hasAnkles ? lAnkle.y > rAnkle.y : lKnee.y > rKnee.y;
    const plantedKnee = isLeftPlanted ? lKnee : rKnee;
    const trailKnee = isLeftPlanted ? rKnee : lKnee;
    const hipY = (lHip.y + rHip.y) / 2;
    const wristY = this.workingWrist(landmarks).y;

    const elevationDelta = hasAnkles
      ? (isLeftPlanted ? lAnkle.y - rAnkle.y : rAnkle.y - lAnkle.y)
      : (plantedKnee.y - trailKnee.y) * 1.5;
    let emittedTelemetry: RepTelemetry | undefined = undefined;

    switch (this.currentState) {
      case 0: { // BILATERAL STANDING
        const bilateral = hasAnkles
          ? Math.abs(lAnkle.y - rAnkle.y) < 0.08
          : Math.abs(lKnee.y - rKnee.y) < 0.08;
        if (bilateral) {
          this.phaseStartTimestamp = timestampMs;
        }
        if (elevationDelta > 0.10 && wristY > hipY) {
          this.currentState = 1;
        }
        break;
      }
      case 1: { // HINGING & REAR LEG KICKBACK
        // Trail leg reaches near knee level (horizontal T-position) and wrist lowers to planted knee
        const reachedPeak = hasAnkles
          ? (isLeftPlanted ? rAnkle.y : lAnkle.y) <= plantedKnee.y + 0.05
          : trailKnee.y <= hipY + 0.06;
        if (reachedPeak && wristY >= plantedKnee.y - 0.08) {
          this.currentState = 2;
        }
        break;
      }
      case 2: { // RETURN TO STAND
        const bilateralReturn = hasAnkles
          ? Math.abs(lAnkle.y - rAnkle.y) < 0.08
          : Math.abs(lKnee.y - rKnee.y) < 0.08;
        if (bilateralReturn) {
          if (timestampMs - this.lastRepTimestamp >= this.minRepIntervalMs) {
            this.repCount++;
            this.lastRepTimestamp = timestampMs;

            const balanceScore = Math.min(1.0, Math.max(0.75, elevationDelta * 2.5));
            emittedTelemetry = {
              event: 'REP_TRIGGER',
              exercise: 'SINGLE_LEG_RDL',
              skillName: EXERCISE_SKILLS.SINGLE_LEG_RDL.skillName,
              power: 80,
              form: Number(balanceScore.toFixed(2)),
              repCount: this.repCount,
              state: 2,
              timestamp: timestampMs,
            };
            this.onRepCompleted?.(emittedTelemetry);

            this.currentState = 0;
          }
        }
        break;
      }
    }

    this.lastMetricY = wristY;
    this.lastTimestamp = timestampMs;

    const names = ['STAND', 'HINGE & KICKBACK', 'T-POSITION PEAK'];
    const update: KinematicStateUpdate = {
      exercise: 'SINGLE_LEG_RDL',
      state: this.currentState,
      stateName: names[this.currentState],
      stages: names,
      repCount: this.repCount,
      power: emittedTelemetry?.power || 75,
      form: emittedTelemetry?.form || 1.0,
      primaryY: wristY,
      referenceY: plantedKnee.y,
      velocity: elevationDelta,
      telemetry: emittedTelemetry,
    };
    this.onStateChange?.(update);
    return update;
  }

  // =========================================================================
  // EXERCISE 12: KETTLEBELL CLEAN ("ANVIL BREAKER")
  // Tracked by the bell's height relative to the body and the elbow under it:
  //   HIKE  bell at or below the hips
  //   PULL  the bell snaps up as the hips open
  //   RACK  bell settled at the shoulder with the elbow tucked beneath it (counts here — no press)
  // A swing passes through the same height with a straight arm pointing at the camera, its elbow level with or
  // above the hand, and never settles there.
  // =========================================================================
  private processClean(landmarks: NormalizedLandmark[], timestampMs: number): KinematicStateUpdate {
    const lElbow = landmarks[POSE_INDEX.LEFT_ELBOW];
    const rElbow = landmarks[POSE_INDEX.RIGHT_ELBOW];
    const lShoulder = landmarks[POSE_INDEX.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_INDEX.RIGHT_SHOULDER];

    const wrist = this.workingWrist(landmarks);
    const elbowY = this.armSide === 'LEFT' ? lElbow.y : this.armSide === 'RIGHT' ? rElbow.y : (lElbow.y + rElbow.y) / 2;
    const shoulderY = (lShoulder.y + rShoulder.y) / 2;
    const torsoHeight = Math.max(0.12, this.standingTorso);

    const rel = (wrist.y - shoulderY) / torsoHeight;
    const elbowTuck = (elbowY - wrist.y) / torsoHeight;
    const inRack = rel >= CLEAN.rackHigh && rel <= CLEAN.rackLow && elbowTuck >= CLEAN.rackElbowTuck;

    const dt = this.lastTimestamp > 0 ? Math.max(0.016, (timestampMs - this.lastTimestamp) / 1000) : 0.033;
    const prevRel = this.lastMetricY > 0 ? this.lastMetricY - SWING_REL_OFFSET : null;
    const relVelocity = prevRel !== null ? (prevRel - rel) / dt : 0; // torso lengths/s, upward positive

    let emittedTelemetry: RepTelemetry | undefined = undefined;
    let note: string | undefined;

    switch (this.currentState) {
      case 0: { // HIKE: the bell low, ready to pull
        if (rel >= CLEAN.hikeBell) {
          this.phaseStartTimestamp = timestampMs;
          this.maxMovementVelocity = 0;
        }
        if (this.phaseStartTimestamp > 0 && relVelocity > CLEAN.pullSpeed && rel < CLEAN.hikeBell) {
          this.currentState = 1;
          this.maxMovementVelocity = relVelocity;
          this.cleanRackAt = 0;
        }
        break;
      }
      case 1: { // PULL: the bell rises; it has to settle in the rack with the elbow tucked
        this.maxMovementVelocity = Math.max(this.maxMovementVelocity, relVelocity);
        if (inRack && Math.abs(relVelocity) < CLEAN.rackStillSpeed) {
          if (!this.cleanRackAt) this.cleanRackAt = timestampMs;
        } else {
          this.cleanRackAt = 0;
        }

        // Dropped back into the hike (a swing, or a missed catch), or never settled
        const fellBack = rel >= CLEAN.hikeBell && relVelocity < 0;
        if (fellBack || timestampMs - this.phaseStartTimestamp > CLEAN.pullTimeoutMs) {
          note = fellBack ? 'cancelled: bell fell back without racking' : 'cancelled: no rack';
          this.currentState = 0;
          this.maxMovementVelocity = 0;
          this.cleanRackAt = 0;
          if (!fellBack) this.phaseStartTimestamp = 0;
          break;
        }

        if (this.cleanRackAt && timestampMs - this.cleanRackAt >= CLEAN.rackHoldMs) {
          this.currentState = 2;
          if (timestampMs - this.lastRepTimestamp >= this.minRepIntervalMs) {
            this.repCount++;
            this.lastRepTimestamp = timestampMs;

            // A tighter tuck (elbow well under the bell) is the cleaner catch
            const formScore = Math.min(1.0, Math.max(0.75, 0.75 + (elbowTuck - CLEAN.rackElbowTuck) * 0.8));
            const powerScore = Math.min(150, Math.max(60, Math.round(55 + this.maxMovementVelocity * 22)));
            emittedTelemetry = {
              event: 'REP_TRIGGER',
              exercise: 'CLEAN',
              skillName: EXERCISE_SKILLS.CLEAN.skillName,
              power: powerScore,
              form: Number(formScore.toFixed(2)),
              repCount: this.repCount,
              state: 2,
              timestamp: timestampMs,
              wristVelocity: Number((this.maxMovementVelocity * torsoHeight).toFixed(2)),
            };
            this.onRepCompleted?.(emittedTelemetry);
          }
        }
        break;
      }
      case 2: { // RACK: the next rep starts from the bell back down in the hike (a press from here doesn't count)
        if (rel >= CLEAN.hikeBell) {
          this.currentState = 0;
          this.phaseStartTimestamp = timestampMs;
          this.maxMovementVelocity = 0;
          this.cleanRackAt = 0;
        }
        break;
      }
    }

    this.lastMetricY = rel + SWING_REL_OFFSET;
    this.lastTimestamp = timestampMs;

    const names = ['HIKE', 'PULL', 'RACK'];
    const update: KinematicStateUpdate = {
      exercise: 'CLEAN',
      state: this.currentState,
      stateName: names[this.currentState],
      stages: names,
      repCount: this.repCount,
      power: emittedTelemetry?.power || (this.currentState === 1 ? Math.round(55 + this.maxMovementVelocity * 22) : 0),
      form: emittedTelemetry?.form || 1.0,
      primaryY: wrist.y,
      referenceY: shoulderY,
      velocity: relVelocity * torsoHeight,
      telemetry: emittedTelemetry,
      debugNotes: note ?? `bell ${rel.toFixed(2)} tuck ${elbowTuck.toFixed(2)}`,
    };
    this.onStateChange?.(update);
    return update;
  }

  // =========================================================================
  // EXERCISE 13: GOBLET LUNGE ("VALKYRIE DASH")
  // Tracked by both thighs (hip→knee height vs standing), so it works facing the camera or side-on:
  //   STAND        both thighs upright, knees level
  //   SINK         one knee drops back and down while the front thigh folds toward level
  //   DRIVE UP     depth reached (front thigh about level, knees split); counts once standing tall again
  // A squat folds both thighs together (no split); a single-leg RDL splits them too but hinges the torso over.
  // Either leg may lead, so alternating lunges count every step.
  // =========================================================================
  private processLunge(landmarks: NormalizedLandmark[], timestampMs: number): KinematicStateUpdate {
    const lShoulder = landmarks[POSE_INDEX.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_INDEX.RIGHT_SHOULDER];
    const lHip = landmarks[POSE_INDEX.LEFT_HIP];
    const rHip = landmarks[POSE_INDEX.RIGHT_HIP];
    const lKnee = landmarks[POSE_INDEX.LEFT_KNEE];
    const rKnee = landmarks[POSE_INDEX.RIGHT_KNEE];

    const shoulderY = (lShoulder.y + rShoulder.y) / 2;
    const hipY = (lHip.y + rHip.y) / 2;
    const thighRef = Math.max(0.06, this.standingThigh);
    const torsoHeight = Math.max(0.12, this.standingTorso);

    // The front knee is the higher one on screen (its thigh folds toward level); the rear knee drops toward the floor
    const frontThigh = (Math.min(lKnee.y, rKnee.y) - hipY) / thighRef;
    const rearThigh = (Math.max(lKnee.y, rKnee.y) - hipY) / thighRef;
    const split = rearThigh - frontThigh;
    const torso = (hipY - shoulderY) / torsoHeight;
    const upright = torso >= LUNGE.minTorso;

    const dt = this.lastTimestamp > 0 ? Math.max(0.016, (timestampMs - this.lastTimestamp) / 1000) : 0.033;
    // lastMetricY keeps frontThigh offset so 0 still means "no previous frame"
    const prevFront = this.lastMetricY > 0 ? this.lastMetricY - SWING_REL_OFFSET : null;
    const riseVelocity = prevFront !== null ? (frontThigh - prevFront) / dt : 0; // thigh lengths/s, rising positive

    let emittedTelemetry: RepTelemetry | undefined = undefined;
    let note: string | undefined;
    const standing = frontThigh >= LUNGE.standThigh && split < LUNGE.resetSplit;

    switch (this.currentState) {
      case 0: { // STAND
        if (standing) {
          this.phaseStartTimestamp = timestampMs;
        }
        if (upright && (split >= LUNGE.startSplit || frontThigh < LUNGE.startThigh)) {
          this.currentState = 1;
          this.maxSquatDepth = frontThigh; // shallowest front thigh reached = the lunge's depth
          this.maxMovementVelocity = 0;
        }
        break;
      }
      case 1: { // SINK: the rear knee drops, the front thigh folds toward level
        this.maxSquatDepth = Math.min(this.maxSquatDepth, frontThigh);
        if (!upright) {
          note = `cancelled: torso hinged (${torso.toFixed(2)})`;
          this.currentState = 0;
          this.phaseStartTimestamp = 0;
          break;
        }
        if (standing) {
          note = `missed depth — best: front thigh ${this.maxSquatDepth.toFixed(2)}`;
          this.currentState = 0;
          break;
        }
        const deepEnough = this.maxSquatDepth <= LUNGE.depthThigh && split >= LUNGE.depthSplit;
        if (deepEnough && frontThigh - this.maxSquatDepth >= LUNGE.driveRise) {
          this.currentState = 2;
          this.maxMovementVelocity = riseVelocity;
        }
        break;
      }
      case 2: { // DRIVE UP: push back to standing tall
        this.maxMovementVelocity = Math.max(this.maxMovementVelocity, riseVelocity);
        if (!upright) {
          note = `cancelled: torso hinged (${torso.toFixed(2)})`;
          this.currentState = 0;
          this.phaseStartTimestamp = 0;
          break;
        }
        if (standing) {
          if (timestampMs - this.lastRepTimestamp >= this.minRepIntervalMs) {
            this.repCount++;
            this.lastRepTimestamp = timestampMs;

            // Front thigh level (0) or past it is full depth; 0.45 just scrapes in
            const depthScore = Math.min(1.0, Math.max(0.7, 1.0 - Math.max(0, this.maxSquatDepth) * 0.65));
            const powerScore = Math.min(150, Math.max(60, Math.round(60 + this.maxMovementVelocity * 40)));
            emittedTelemetry = {
              event: 'REP_TRIGGER',
              exercise: 'LUNGE',
              skillName: EXERCISE_SKILLS.LUNGE.skillName,
              power: powerScore,
              form: Number(depthScore.toFixed(2)),
              repCount: this.repCount,
              state: 2,
              timestamp: timestampMs,
            };
            this.onRepCompleted?.(emittedTelemetry);
          }
          this.currentState = 0;
          this.maxSquatDepth = 0;
          this.maxMovementVelocity = 0;
        }
        break;
      }
    }

    this.lastMetricY = frontThigh + SWING_REL_OFFSET;
    this.lastTimestamp = timestampMs;

    const names = ['STAND', 'SINK', 'DRIVE UP'];
    const update: KinematicStateUpdate = {
      exercise: 'LUNGE',
      state: this.currentState,
      stateName: names[this.currentState],
      stages: names,
      repCount: this.repCount,
      power: emittedTelemetry?.power || (this.currentState === 2 ? Math.round(60 + this.maxMovementVelocity * 40) : 0),
      form: emittedTelemetry?.form || 1.0,
      primaryY: hipY,
      referenceY: Math.min(lKnee.y, rKnee.y),
      velocity: riseVelocity,
      telemetry: emittedTelemetry,
      debugNotes: note ?? `front ${frontThigh.toFixed(2)} rear ${rearThigh.toFixed(2)} split ${split.toFixed(2)} torso ${torso.toFixed(2)}`,
    };
    this.onStateChange?.(update);
    return update;
  }
}
