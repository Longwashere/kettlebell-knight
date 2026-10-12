import { RepTelemetry, ExerciseType, EXERCISE_SKILLS } from '../../types/game';

// Normalized 2D/3D Landmark type from MediaPipe
export interface NormalizedLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export type SwingState = 0 | 1 | 2; // Phase 0 (Prep/Start), Phase 1 (Mid/Inflection), Phase 2 (Peak/Lockout)

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
 * Full Suite 11-Exercise Kinematic Tracker for Kettlebell Knight.
 * 
 * Features:
 * 1. Dedicated Biomechanical State Machines for all 11 Kettlebell Exercises:
 *    - SWING
 *    - SQUAT (Goblet)
 *    - CLEAN_AND_PRESS
 *    - SNATCH
 *    - WINDMILL
 *    - DEADLIFT
 *    - OVERHEAD_PRESS
 *    - THRUSTER
 *    - GORILLA_ROW
 *    - HALO
 *    - SINGLE_LEG_RDL
 * 
 * 2. Smart Hand Router:
 *    Restricts detection pool to the active 5 cards in hand to eliminate false positives
 *    and conserve mobile CPU/battery. Automatically routes when user transitions exercise!
 */
export class KinematicTracker {
  private activeExercise: ExerciseType = 'SWING';
  private allowedExercises: ExerciseType[] = ['SWING', 'SQUAT', 'OVERHEAD_PRESS', 'CLEAN_AND_PRESS', 'HALO'];
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
  private haloAngleAccumulator: number = 0;
  private lastHaloQuadrant: number = 0;
  private rdlWorkingLeg: 'LEFT' | 'RIGHT' = 'LEFT';

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
    this.haloAngleAccumulator = 0;
    this.lastHaloQuadrant = 0;
    this.consecutiveFullBodyFrames = 0;
  }

  public getRepCount(): number {
    return this.repCount;
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

    // 1. Shoulders Verification
    const shouldersVisible = isPointValid(lShoulder, 0.48) && isPointValid(rShoulder, 0.48);
    if (!shouldersVisible) missingParts.push('SHOULDERS');

    // 2. Hips / Torso Verification
    const hipsVisible = isPointValid(lHip, 0.45) && isPointValid(rHip, 0.45);
    if (!hipsVisible) missingParts.push('HIPS');

    // 3. Arms Verification (at least one working arm fully clear, wrists in bounds)
    const wristsVisible = isPointValid(lWrist, 0.40) || isPointValid(rWrist, 0.40);
    const armsVisible = shouldersVisible && wristsVisible;
    if (!wristsVisible) missingParts.push('ARMS / HANDS');

    // 4. Legs Verification: KNEES MUST BE VISIBLE (Feet & ankles no longer gatekept)
    const kneesVisible = isPointValid(lKnee, 0.40) && isPointValid(rKnee, 0.40);
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

    // 2. Smart Hand Auto-Routing
    if (this.autoRouteEnabled && this.currentState === 0) {
      const detected = this.detectExerciseSignature(landmarks, timestampMs);
      if (detected && detected !== this.activeExercise && this.allowedExercises.includes(detected)) {
        this.activeExercise = detected;
        this.reset();
        this.onExerciseAutoSwitched?.(detected);
      }
    }

    switch (this.activeExercise) {
      case 'SQUAT':
        return this.processSquat(landmarks, timestampMs);
      case 'OVERHEAD_PRESS':
        return this.processOverheadPress(landmarks, timestampMs);
      case 'CLEAN_AND_PRESS':
      case 'CLEAN':
        return this.processCleanAndPress(landmarks, timestampMs);
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
      case 'HALO':
        return this.processHalo(landmarks, timestampMs);
      case 'SINGLE_LEG_RDL':
        return this.processSingleLegRDL(landmarks, timestampMs);
      case 'LUNGE':
        return this.processSquat(landmarks, timestampMs);
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

    const topWristY = Math.min(lWrist.y, rWrist.y);
    const bottomWristY = Math.max(lWrist.y, rWrist.y);

    // 1. Halo Signature: Wrists orbiting near head/face level
    if (
      this.allowedExercises.includes('HALO') &&
      wristY >= nose.y - 0.15 &&
      wristY <= shoulderY + 0.12 &&
      (Math.abs(lWrist.x - nose.x) > 0.14 || Math.abs(rWrist.x - nose.x) > 0.14)
    ) {
      return 'HALO';
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

    // 3. Single-Leg RDL Signature: One ankle or knee elevated significantly behind
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

    // 4. Gorilla Row Signature: Bent-over torso, one elbow pulling high past hip
    const lElbow = landmarks[POSE_INDEX.LEFT_ELBOW];
    const rElbow = landmarks[POSE_INDEX.RIGHT_ELBOW];
    const torsoHeight = Math.abs(shoulderY - hipY);
    if (
      this.allowedExercises.includes('GORILLA_ROW') &&
      torsoHeight < 0.22 &&
      (lElbow.y < hipY - 0.05 || rElbow.y < hipY - 0.05) &&
      wristY > hipY
    ) {
      return 'GORILLA_ROW';
    }

    // 5. Thruster Signature: Sinking into deep squat with wrists in rack, then pressing overhead
    if (
      this.allowedExercises.includes('THRUSTER') &&
      hipY > kneeY - 0.08 &&
      wristY <= shoulderY + 0.12
    ) {
      return 'THRUSTER';
    }

    // 6. Goblet Squat: Hips sinking deep below knees while wrists anchored at chest
    if (
      this.allowedExercises.includes('SQUAT') &&
      hipY > kneeY - 0.08 &&
      wristY <= shoulderY + 0.15
    ) {
      return 'SQUAT';
    }

    // 7. Overhead Press: Wrists driving high above shoulders while hips stay stable
    if (
      this.allowedExercises.includes('OVERHEAD_PRESS') &&
      wristY < shoulderY - 0.15 &&
      hipY < kneeY - 0.15
    ) {
      return 'OVERHEAD_PRESS';
    }

    // 8. Snatch: Working wrist passes rapidly straight overhead without rack pause
    if (
      this.allowedExercises.includes('SNATCH') &&
      topWristY < shoulderY - 0.20 &&
      bottomWristY > hipY - 0.10
    ) {
      return 'SNATCH';
    }

    // 9. Deadlift: Wrists pulling vertically from mid-shin to hip, never rising to shoulders
    if (
      this.allowedExercises.includes('DEADLIFT') &&
      wristY >= hipY - 0.05 &&
      wristY <= kneeY + 0.15
    ) {
      return 'DEADLIFT';
    }

    return null;
  }

  // =========================================================================
  // EXERCISE 1: KETTLEBELL SWING ("IRON CLEAVE")
  // =========================================================================
  private processSwing(landmarks: NormalizedLandmark[], timestampMs: number): KinematicStateUpdate {
    const lWrist = landmarks[POSE_INDEX.LEFT_WRIST];
    const rWrist = landmarks[POSE_INDEX.RIGHT_WRIST];
    const lHip = landmarks[POSE_INDEX.LEFT_HIP];
    const rHip = landmarks[POSE_INDEX.RIGHT_HIP];
    const lShoulder = landmarks[POSE_INDEX.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_INDEX.RIGHT_SHOULDER];

    const avgWristY = (lWrist.y + rWrist.y) / 2;
    const isSingleArmLeft = Math.abs(lWrist.y - rWrist.y) > 0.22 && lWrist.y > lHip.y;
    const isSingleArmRight = Math.abs(lWrist.y - rWrist.y) > 0.22 && rWrist.y > rHip.y;

    const wristY = isSingleArmLeft ? lWrist.y : isSingleArmRight ? rWrist.y : avgWristY;
    const hipY = (lHip.y + rHip.y) / 2;
    const shoulderY = (lShoulder.y + rShoulder.y) / 2;

    const torsoHeight = Math.max(0.15, Math.abs(hipY - shoulderY));
    const hikeThresholdY = hipY - torsoHeight * 0.05;
    const lockoutThresholdY = shoulderY + torsoHeight * 0.18;

    const dt = this.lastTimestamp > 0 ? Math.max(0.016, (timestampMs - this.lastTimestamp) / 1000) : 0.033;
    const upwardVelocity = this.lastMetricY > 0 ? (this.lastMetricY - wristY) / dt : 0;

    let emittedTelemetry: RepTelemetry | undefined = undefined;

    switch (this.currentState) {
      case 0: { // HIKE
        if (wristY > hikeThresholdY) {
          this.phaseStartTimestamp = timestampMs;
          this.maxMovementVelocity = 0;
        }
        if (this.phaseStartTimestamp > 0 && upwardVelocity > 0.35 && wristY <= hipY + 0.08) {
          this.currentState = 1;
          this.maxMovementVelocity = upwardVelocity;
        }
        break;
      }
      case 1: { // DRIVE
        if (upwardVelocity > this.maxMovementVelocity) {
          this.maxMovementVelocity = upwardVelocity;
        }
        if (wristY > hipY + 0.12 && upwardVelocity < -0.2) {
          this.currentState = 0;
          this.maxMovementVelocity = 0;
          break;
        }
        if (wristY <= lockoutThresholdY) {
          if (timestampMs - this.lastRepTimestamp >= this.minRepIntervalMs) {
            this.currentState = 2;
            this.repCount++;
            this.lastRepTimestamp = timestampMs;

            const wristDelta = Math.abs(lWrist.y - rWrist.y);
            const formScore = isSingleArmLeft || isSingleArmRight ? 0.95 : Math.max(0.65, 1.0 - wristDelta * 2.2);
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
      case 2: { // LOCKOUT / PEAK
        if (wristY > lockoutThresholdY + torsoHeight * 0.25 || upwardVelocity < -0.25) {
          this.currentState = 0;
          this.maxMovementVelocity = 0;
        }
        break;
      }
    }

    this.lastMetricY = wristY;
    this.lastTimestamp = timestampMs;

    const names = ['HIKE', 'DRIVE', 'LOCKOUT'];
    const update: KinematicStateUpdate = {
      exercise: 'SWING',
      state: this.currentState,
      stateName: names[this.currentState],
      repCount: this.repCount,
      power: emittedTelemetry?.power || (this.currentState === 1 ? Math.round(50 + this.maxMovementVelocity * 32) : 0),
      form: emittedTelemetry?.form || 1.0,
      primaryY: wristY,
      referenceY: shoulderY,
      velocity: upwardVelocity,
      telemetry: emittedTelemetry,
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
  // =========================================================================
  private processCleanAndPress(landmarks: NormalizedLandmark[], timestampMs: number): KinematicStateUpdate {
    const lWrist = landmarks[POSE_INDEX.LEFT_WRIST];
    const rWrist = landmarks[POSE_INDEX.RIGHT_WRIST];
    const lShoulder = landmarks[POSE_INDEX.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_INDEX.RIGHT_SHOULDER];
    const lHip = landmarks[POSE_INDEX.LEFT_HIP];
    const rHip = landmarks[POSE_INDEX.RIGHT_HIP];

    const wristY = (lWrist.y + rWrist.y) / 2;
    const shoulderY = (lShoulder.y + rShoulder.y) / 2;
    const hipY = (lHip.y + rHip.y) / 2;

    const dt = this.lastTimestamp > 0 ? Math.max(0.016, (timestampMs - this.lastTimestamp) / 1000) : 0.033;
    const velocity = this.lastMetricY > 0 ? (this.lastMetricY - wristY) / dt : 0;

    let emittedTelemetry: RepTelemetry | undefined = undefined;

    switch (this.currentState) {
      case 0: { // HANG SETUP
        this.cleanStageCompleted = false;
        if (wristY > hipY) {
          this.phaseStartTimestamp = timestampMs;
          this.maxMovementVelocity = 0;
        }
        // Rapid upward pull into rack
        if (velocity > 0.4 && wristY <= hipY) {
          this.currentState = 1;
        }
        break;
      }
      case 1: { // RACK POSITION REACHED
        if (Math.abs(wristY - shoulderY) < 0.12) {
          this.cleanStageCompleted = true;
        }
        // From rack, drives overhead
        if (this.cleanStageCompleted && wristY < shoulderY - 0.18 && velocity > 0.3) {
          this.currentState = 2;
        }
        break;
      }
      case 2: { // OVERHEAD LOCKOUT
        if (wristY <= shoulderY - 0.24) {
          if (timestampMs - this.lastRepTimestamp >= this.minRepIntervalMs) {
            this.repCount++;
            this.lastRepTimestamp = timestampMs;

            const powerScore = Math.min(150, Math.max(65, Math.round(65 + this.maxMovementVelocity * 40)));
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
          }
        }
        // Return to hang reset
        if (wristY >= shoulderY) {
          this.currentState = 0;
          this.cleanStageCompleted = false;
        }
        break;
      }
    }

    this.lastMetricY = wristY;
    this.lastTimestamp = timestampMs;

    const names = ['HANG', 'RACK CLEAN', 'OVERHEAD'];
    const update: KinematicStateUpdate = {
      exercise: 'CLEAN_AND_PRESS',
      state: this.currentState,
      stateName: names[this.currentState],
      repCount: this.repCount,
      power: emittedTelemetry?.power || Math.round(55 + velocity * 30),
      form: emittedTelemetry?.form || 1.0,
      primaryY: wristY,
      referenceY: shoulderY - 0.24,
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

    const workingWrist = lWrist.y < rWrist.y ? lWrist : rWrist;
    const shoulderY = (lShoulder.y + rShoulder.y) / 2;
    const hipY = (lHip.y + rHip.y) / 2;

    const dt = this.lastTimestamp > 0 ? Math.max(0.016, (timestampMs - this.lastTimestamp) / 1000) : 0.033;
    const velocity = this.lastMetricY > 0 ? (this.lastMetricY - workingWrist.y) / dt : 0;

    let emittedTelemetry: RepTelemetry | undefined = undefined;

    switch (this.currentState) {
      case 0: { // BACKSWING / HIKE
        if (workingWrist.y > hipY) {
          this.phaseStartTimestamp = timestampMs;
          this.maxMovementVelocity = 0;
        }
        // Continuous high pull explosive drive
        if (velocity > 0.55 && workingWrist.y <= hipY) {
          this.currentState = 1;
          this.maxMovementVelocity = velocity;
        }
        break;
      }
      case 1: { // HIGH PULL / FLOAT (Bypasses rack)
        if (velocity > this.maxMovementVelocity) {
          this.maxMovementVelocity = velocity;
        }
        // Punch-through to overhead lockout
        if (workingWrist.y <= shoulderY - 0.24) {
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
        if (workingWrist.y > shoulderY - 0.10) {
          this.currentState = 0;
          this.maxMovementVelocity = 0;
        }
        break;
      }
    }

    this.lastMetricY = workingWrist.y;
    this.lastTimestamp = timestampMs;

    const names = ['HIKE', 'EXPLOSIVE PULL', 'OVERHEAD LOCK'];
    const update: KinematicStateUpdate = {
      exercise: 'SNATCH',
      state: this.currentState,
      stateName: names[this.currentState],
      repCount: this.repCount,
      power: emittedTelemetry?.power || Math.round(60 + velocity * 35),
      form: emittedTelemetry?.form || 1.0,
      primaryY: workingWrist.y,
      referenceY: shoulderY - 0.24,
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
        if (bottomWrist.y > kneeY - 0.08) {
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
          if (timestampMs - this.lastRepTimestamp >= this.minRepIntervalMs) {
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

    const wristY = (lWrist.y + rWrist.y) / 2;
    const hipY = (lHip.y + rHip.y) / 2;
    const kneeY = (lKnee.y + rKnee.y) / 2;

    const dt = this.lastTimestamp > 0 ? Math.max(0.016, (timestampMs - this.lastTimestamp) / 1000) : 0.033;
    const pullVelocity = this.lastMetricY > 0 ? (this.lastMetricY - wristY) / dt : 0;

    let emittedTelemetry: RepTelemetry | undefined = undefined;

    switch (this.currentState) {
      case 0: { // FLOOR / SHIN SETUP
        if (wristY > kneeY) {
          this.phaseStartTimestamp = timestampMs;
          this.maxMovementVelocity = 0;
        }
        if (pullVelocity > 0.25 && wristY <= kneeY) {
          this.currentState = 1;
        }
        break;
      }
      case 1: { // PULLING PAST KNEES
        if (pullVelocity > this.maxMovementVelocity) {
          this.maxMovementVelocity = pullVelocity;
        }
        // Strict hip lockout (wrists at hip level, NOT swinging upward)
        if (wristY <= hipY + 0.05) {
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
      repCount: this.repCount,
      power: emittedTelemetry?.power || Math.round(50 + pullVelocity * 30),
      form: emittedTelemetry?.form || 1.0,
      primaryY: wristY,
      referenceY: hipY,
      velocity: pullVelocity,
      telemetry: emittedTelemetry,
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

    const isSingleArmLeft = lWrist.y < rWrist.y - 0.15;
    const isSingleArmRight = rWrist.y < lWrist.y - 0.15;
    const workingWrist = isSingleArmLeft ? lWrist : isSingleArmRight ? rWrist : { x: (lWrist.x + rWrist.x) / 2, y: (lWrist.y + rWrist.y) / 2 };

    const shoulderY = (lShoulder.y + rShoulder.y) / 2;
    const dt = this.lastTimestamp > 0 ? Math.max(0.016, (timestampMs - this.lastTimestamp) / 1000) : 0.033;
    const upwardVelocity = this.lastMetricY > 0 ? (this.lastMetricY - workingWrist.y) / dt : 0;

    let emittedTelemetry: RepTelemetry | undefined = undefined;
    const overheadLockoutY = shoulderY - 0.22;

    switch (this.currentState) {
      case 0: { // RACK POSITION
        if (workingWrist.y >= shoulderY - 0.08) {
          this.phaseStartTimestamp = timestampMs;
          this.maxMovementVelocity = 0;
        }
        if (workingWrist.y < shoulderY - 0.08 && upwardVelocity > 0.3) {
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

    const wristY = (lWrist.y + rWrist.y) / 2;
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
  // Hinged bent-over stance; elbow drives upward past rib cage
  // =========================================================================
  private processGorillaRow(landmarks: NormalizedLandmark[], timestampMs: number): KinematicStateUpdate {
    const lWrist = landmarks[POSE_INDEX.LEFT_WRIST];
    const rWrist = landmarks[POSE_INDEX.RIGHT_WRIST];
    const lElbow = landmarks[POSE_INDEX.LEFT_ELBOW];
    const rElbow = landmarks[POSE_INDEX.RIGHT_ELBOW];
    const lHip = landmarks[POSE_INDEX.LEFT_HIP];
    const rHip = landmarks[POSE_INDEX.RIGHT_HIP];

    const hipY = (lHip.y + rHip.y) / 2;
    // Working arm is whichever elbow is pulled highest
    const isLeftArmActive = lElbow.y < rElbow.y;
    const activeElbow = isLeftArmActive ? lElbow : rElbow;
    const activeWrist = isLeftArmActive ? lWrist : rWrist;

    const dt = this.lastTimestamp > 0 ? Math.max(0.016, (timestampMs - this.lastTimestamp) / 1000) : 0.033;
    const rowVelocity = this.lastMetricY > 0 ? (this.lastMetricY - activeElbow.y) / dt : 0;

    let emittedTelemetry: RepTelemetry | undefined = undefined;

    switch (this.currentState) {
      case 0: { // HANG SETUP
        if (activeWrist.y > hipY + 0.10) {
          this.phaseStartTimestamp = timestampMs;
          this.maxMovementVelocity = 0;
        }
        if (rowVelocity > 0.3 && activeElbow.y <= hipY + 0.05) {
          this.currentState = 1;
        }
        break;
      }
      case 1: { // ROW PULL
        if (rowVelocity > this.maxMovementVelocity) {
          this.maxMovementVelocity = rowVelocity;
        }
        // Elbow drives past rib plane
        if (activeElbow.y <= hipY - 0.06 && activeWrist.y <= hipY + 0.06) {
          if (timestampMs - this.lastRepTimestamp >= this.minRepIntervalMs) {
            this.currentState = 2;
            this.repCount++;
            this.lastRepTimestamp = timestampMs;

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
        if (activeWrist.y > hipY + 0.12) {
          this.currentState = 0;
          this.maxMovementVelocity = 0;
        }
        break;
      }
    }

    this.lastMetricY = activeElbow.y;
    this.lastTimestamp = timestampMs;

    const names = ['HANG', 'ROW PULL', 'RIB CONTRACTION'];
    const update: KinematicStateUpdate = {
      exercise: 'GORILLA_ROW',
      state: this.currentState,
      stateName: names[this.currentState],
      repCount: this.repCount,
      power: emittedTelemetry?.power || Math.round(50 + rowVelocity * 30),
      form: emittedTelemetry?.form || 1.0,
      primaryY: activeElbow.y,
      referenceY: hipY - 0.06,
      velocity: rowVelocity,
      telemetry: emittedTelemetry,
    };
    this.onStateChange?.(update);
    return update;
  }

  // =========================================================================
  // EXERCISE 10: KETTLEBELL HALO ("CELESTIAL WARD")
  // Continuous 360-degree orbit around the crown of the head
  // =========================================================================
  private processHalo(landmarks: NormalizedLandmark[], timestampMs: number): KinematicStateUpdate {
    const lWrist = landmarks[POSE_INDEX.LEFT_WRIST];
    const rWrist = landmarks[POSE_INDEX.RIGHT_WRIST];
    const lShoulder = landmarks[POSE_INDEX.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_INDEX.RIGHT_SHOULDER];
    const nose = landmarks[POSE_INDEX.NOSE];

    const wristX = (lWrist.x + rWrist.x) / 2;
    const wristY = (lWrist.y + rWrist.y) / 2;
    const shoulderY = (lShoulder.y + rShoulder.y) / 2;

    const dx = wristX - nose.x;
    const dy = wristY - nose.y;
    const angle = Math.atan2(dy, dx); // [-PI, PI]

    let emittedTelemetry: RepTelemetry | undefined = undefined;

    // Detect quadrant: 1 (Chest), 2 (Left ear), 3 (Behind head), 4 (Right ear)
    let quadrant = 1;
    if (wristY > shoulderY - 0.02) {
      quadrant = 1; // Chest/Front
    } else if (wristX < nose.x - 0.08) {
      quadrant = 2; // Left of head
    } else if (wristY <= nose.y) {
      quadrant = 3; // Crown / Behind
    } else if (wristX > nose.x + 0.08) {
      quadrant = 4; // Right of head
    }

    switch (this.currentState) {
      case 0: { // CHEST CENTER
        if (quadrant === 1) {
          this.haloAngleAccumulator = 0;
          this.lastHaloQuadrant = 1;
        }
        if (quadrant === 2 || quadrant === 4) {
          this.currentState = 1;
          this.lastHaloQuadrant = quadrant;
        }
        break;
      }
      case 1: { // ORBITING PAST EAR / BEHIND HEAD
        if (quadrant === 3) {
          this.currentState = 2; // Halfway behind
        }
        break;
      }
      case 2: { // COMPLETING ORBIT BACK TO CHEST
        if (quadrant === 1 && timestampMs - this.lastRepTimestamp >= this.minRepIntervalMs) {
          this.repCount++;
          this.lastRepTimestamp = timestampMs;

          emittedTelemetry = {
            event: 'REP_TRIGGER',
            exercise: 'HALO',
            skillName: EXERCISE_SKILLS.HALO.skillName,
            power: 82,
            form: 0.98,
            repCount: this.repCount,
            state: 2,
            timestamp: timestampMs,
          };
          this.onRepCompleted?.(emittedTelemetry);

          this.currentState = 0;
        }
        break;
      }
    }

    this.lastMetricX = wristX;
    this.lastMetricY = wristY;
    this.lastTimestamp = timestampMs;

    const names = ['CHEST CENTER', 'ORBITING', 'FULL ORBIT'];
    const update: KinematicStateUpdate = {
      exercise: 'HALO',
      state: this.currentState,
      stateName: names[this.currentState],
      repCount: this.repCount,
      power: emittedTelemetry?.power || 75,
      form: emittedTelemetry?.form || 1.0,
      primaryY: wristY,
      referenceY: nose.y,
      velocity: Math.abs(angle),
      telemetry: emittedTelemetry,
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
    const wristY = (lWrist.y + rWrist.y) / 2;

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
}
