import { RepTelemetry, ExerciseType, EXERCISE_SKILLS } from '../../types/game';

// Normalized 2D/3D Landmark type from MediaPipe
export interface NormalizedLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export type SwingState = 0 | 1 | 2; // Phase 0 (Prep/Hike), Phase 1 (Drive/Descent), Phase 2 (Peak/Lockout)

// MediaPipe Pose Landmark Indices:
export const POSE_INDEX = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

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
}

/**
 * Multi-Exercise Kinematic Tracker for Kettlebell RPG Combat.
 * Maps biometric movements to discrete RPG combat attacks:
 * 
 * 1. SWING -> "IRON CLEAVE" (Hike between hips -> Drive -> Chest/Shoulder lockout)
 * 2. SQUAT -> "TITAN GROUND SLAM" (Goblet rack -> Hips sink to/below knees -> Full standing extension)
 * 3. OVERHEAD_PRESS -> "THUNDER SMITE" (Rack at shoulder -> Vertical thrust high overhead)
 */
export class KinematicTracker {
  private activeExercise: ExerciseType = 'SWING';
  private currentState: SwingState = 0;
  private repCount: number = 0;
  private lastTimestamp: number = 0;
  private phaseStartTimestamp: number = 0;
  private lastMetricY: number = 0;
  private maxMovementVelocity: number = 0;
  private maxSquatDepth: number = 0;
  private lastRepTimestamp: number = 0;
  private minRepIntervalMs: number = 650;

  public onRepCompleted?: (telemetry: RepTelemetry) => void;
  public onStateChange?: (update: KinematicStateUpdate) => void;

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
    this.maxMovementVelocity = 0;
    this.maxSquatDepth = 0;
    this.lastRepTimestamp = 0;
  }

  public getRepCount(): number {
    return this.repCount;
  }

  public processLandmarks(landmarks: NormalizedLandmark[], timestampMs: number = Date.now()): KinematicStateUpdate {
    if (!landmarks || landmarks.length < 27) {
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
      };
    }

    switch (this.activeExercise) {
      case 'SQUAT':
        return this.processSquat(landmarks, timestampMs);
      case 'OVERHEAD_PRESS':
        return this.processOverheadPress(landmarks, timestampMs);
      case 'SWING':
      default:
        return this.processSwing(landmarks, timestampMs);
    }
  }

  /**
   * 1. KETTLEBELL SWING -> "IRON CLEAVE"
   */
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
            const formScore = (isSingleArmLeft || isSingleArmRight) ? 0.95 : Math.max(0.65, 1.0 - wristDelta * 2.2);
            const rawPower = Math.round(55 + Math.max(0.6, this.maxMovementVelocity) * 38);
            const finalPower = Math.min(150, Math.max(50, rawPower));

            emittedTelemetry = {
              event: 'REP_TRIGGER',
              exercise: 'SWING',
              skillName: EXERCISE_SKILLS.SWING.skillName,
              power: finalPower,
              form: formScore,
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
      case 2: { // PEAK
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

  /**
   * 2. GOBLET SQUAT -> "TITAN GROUND SLAM"
   * Hips sink relative to knees, then ascend back to standing lockout.
   */
  private processSquat(landmarks: NormalizedLandmark[], timestampMs: number): KinematicStateUpdate {
    const lHip = landmarks[POSE_INDEX.LEFT_HIP];
    const rHip = landmarks[POSE_INDEX.RIGHT_HIP];
    const lKnee = landmarks[POSE_INDEX.LEFT_KNEE];
    const rKnee = landmarks[POSE_INDEX.RIGHT_KNEE];

    const hipY = (lHip.y + rHip.y) / 2;
    const kneeY = (lKnee.y + rKnee.y) / 2;

    const dt = this.lastTimestamp > 0 ? Math.max(0.016, (timestampMs - this.lastTimestamp) / 1000) : 0.033;
    // Positive velocity = standing up (hipY decreasing)
    const ascentVelocity = this.lastMetricY > 0 ? (this.lastMetricY - hipY) / dt : 0;

    let emittedTelemetry: RepTelemetry | undefined = undefined;

    // Parallel squat depth threshold: hip crease reaches within 6% of knee height
    const parallelDepthThreshold = kneeY - 0.05;

    switch (this.currentState) {
      case 0: { // STANDING (Hips well above knees)
        if (hipY < kneeY - 0.16) {
          this.phaseStartTimestamp = timestampMs;
          this.maxSquatDepth = hipY;
        }
        // Descent begins
        if (hipY > kneeY - 0.12) {
          this.currentState = 1;
        }
        break;
      }
      case 1: { // DESCENDING / SQUAT HOLE
        if (hipY > this.maxSquatDepth) {
          this.maxSquatDepth = hipY;
        }
        // Check if deep squat reached (hips near or past knees) and user begins ascending
        const reachedDepth = this.maxSquatDepth >= parallelDepthThreshold;
        if (reachedDepth && ascentVelocity > 0.25) {
          this.currentState = 2;
        }
        break;
      }
      case 2: { // ASCENDING TO STANDING LOCKOUT
        // When hips return to full standing height (hipY < kneeY - 0.16)
        if (hipY <= kneeY - 0.15) {
          if (timestampMs - this.lastRepTimestamp >= this.minRepIntervalMs) {
            this.repCount++;
            this.lastRepTimestamp = timestampMs;

            // Form score: based on squat depth (deeper = higher form score)
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

            // Reset back to standing
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

  /**
   * 3. OVERHEAD PRESS -> "THUNDER SMITE"
   * Wrists start at shoulder rack position and drive high overhead.
   */
  private processOverheadPress(landmarks: NormalizedLandmark[], timestampMs: number): KinematicStateUpdate {
    const lWrist = landmarks[POSE_INDEX.LEFT_WRIST];
    const rWrist = landmarks[POSE_INDEX.RIGHT_WRIST];
    const lShoulder = landmarks[POSE_INDEX.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_INDEX.RIGHT_SHOULDER];

    const wristY = (lWrist.y + rWrist.y) / 2;
    const shoulderY = (lShoulder.y + rShoulder.y) / 2;

    const dt = this.lastTimestamp > 0 ? Math.max(0.016, (timestampMs - this.lastTimestamp) / 1000) : 0.033;
    const upwardPressVelocity = this.lastMetricY > 0 ? (this.lastMetricY - wristY) / dt : 0;

    let emittedTelemetry: RepTelemetry | undefined = undefined;

    // Overhead lockout threshold: wrists are significantly above shoulders
    const overheadLockoutY = shoulderY - 0.22;
    const shoulderRackY = shoulderY + 0.05;

    switch (this.currentState) {
      case 0: { // RACK POSITION (Wrists near shoulders/collarbone)
        if (wristY >= shoulderY - 0.08) {
          this.phaseStartTimestamp = timestampMs;
          this.maxMovementVelocity = 0;
        }
        if (wristY < shoulderY - 0.08 && upwardPressVelocity > 0.3) {
          this.currentState = 1;
          this.maxMovementVelocity = upwardPressVelocity;
        }
        break;
      }
      case 1: { // PRESSING UPWARD
        if (upwardPressVelocity > this.maxMovementVelocity) {
          this.maxMovementVelocity = upwardPressVelocity;
        }
        // Reached overhead lockout!
        if (wristY <= overheadLockoutY) {
          if (timestampMs - this.lastRepTimestamp >= this.minRepIntervalMs) {
            this.currentState = 2;
            this.repCount++;
            this.lastRepTimestamp = timestampMs;

            const wristDelta = Math.abs(lWrist.y - rWrist.y);
            const formScore = Math.max(0.7, 1.0 - wristDelta * 2.0);
            const powerScore = Math.min(150, Math.max(55, Math.round(55 + this.maxMovementVelocity * 40)));

            emittedTelemetry = {
              event: 'REP_TRIGGER',
              exercise: 'OVERHEAD_PRESS',
              skillName: EXERCISE_SKILLS.OVERHEAD_PRESS.skillName,
              power: powerScore,
              form: Number(formScore.toFixed(2)),
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
        // When wrists descend back down to shoulder rack
        if (wristY >= shoulderY - 0.06 || upwardPressVelocity < -0.2) {
          this.currentState = 0;
          this.maxMovementVelocity = 0;
        }
        break;
      }
    }

    this.lastMetricY = wristY;
    this.lastTimestamp = timestampMs;

    const names = ['RACK', 'PRESSING', 'OVERHEAD'];
    const update: KinematicStateUpdate = {
      exercise: 'OVERHEAD_PRESS',
      state: this.currentState,
      stateName: names[this.currentState],
      repCount: this.repCount,
      power: emittedTelemetry?.power || Math.round(50 + this.maxMovementVelocity * 30),
      form: emittedTelemetry?.form || 1.0,
      primaryY: wristY,
      referenceY: overheadLockoutY,
      velocity: upwardPressVelocity,
      telemetry: emittedTelemetry,
    };
    this.onStateChange?.(update);
    return update;
  }
}
