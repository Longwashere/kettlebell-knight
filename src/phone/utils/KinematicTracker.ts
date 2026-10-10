import { RepTelemetry } from '../../types/game';

// Normalized 2D/3D Landmark type from MediaPipe
export interface NormalizedLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export type SwingState = 0 | 1 | 2; // 0: Hike, 1: Drive, 2: Peak / Lockout

// MediaPipe Pose Landmark Indices:
// 11: left_shoulder, 12: right_shoulder
// 23: left_hip,      24: right_hip
// 15: left_wrist,    16: right_wrist
export const POSE_INDEX = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
} as const;

export interface KinematicStateUpdate {
  state: SwingState;
  stateName: 'HIKE' | 'DRIVE' | 'PEAK_LOCKOUT' | 'IDLE';
  repCount: number;
  power: number;
  form: number;
  wristY: number;
  hipY: number;
  shoulderY: number;
  velocity: number;
  telemetry?: RepTelemetry;
}

/**
 * Frontal Y-Axis Kinematic Tracker for Kettlebell Swings.
 * Uses robust Y-axis deltas to eliminate depth perception jitter when the user faces the screen.
 * 
 * MediaPipe coordinate system: y=0 (top of screen), y=1 (bottom of screen).
 * - State 0 (Hike): (leftWrist.y + rightWrist.y)/2 > (leftHip.y + rightHip.y)/2 (wrists dropped below hips)
 * - State 1 (Drive): Wrists moving rapidly upward (dy < 0 with high velocity)
 * - State 2 (Peak / Lockout): Wrists reach (leftShoulder.y + rightShoulder.y)/2
 */
export class KinematicTracker {
  private currentState: SwingState = 0;
  private repCount: number = 0;
  private lastTimestamp: number = 0;
  private hikeTimestamp: number = 0;
  private driveTimestamp: number = 0;
  private lastWristY: number = 0;
  private maxDriveVelocity: number = 0; // Peak upward speed (normalized units / sec)
  private lastRepTimestamp: number = 0;
  private minRepIntervalMs: number = 650; // Debounce minimum time for a biometric swing cycle

  public onRepCompleted?: (telemetry: RepTelemetry) => void;
  public onStateChange?: (update: KinematicStateUpdate) => void;

  public reset(): void {
    this.currentState = 0;
    this.repCount = 0;
    this.lastTimestamp = 0;
    this.hikeTimestamp = 0;
    this.driveTimestamp = 0;
    this.lastWristY = 0;
    this.maxDriveVelocity = 0;
    this.lastRepTimestamp = 0;
  }

  public getRepCount(): number {
    return this.repCount;
  }

  public getCurrentState(): SwingState {
    return this.currentState;
  }

  /**
   * Evaluates MediaPipe pose landmarks for the current video frame.
   * Returns KinematicStateUpdate with real-time tracking metrics.
   */
  public processLandmarks(landmarks: NormalizedLandmark[], timestampMs: number = Date.now()): KinematicStateUpdate {
    if (!landmarks || landmarks.length < 25) {
      return {
        state: this.currentState,
        stateName: 'IDLE',
        repCount: this.repCount,
        power: 0,
        form: 1.0,
        wristY: 0,
        hipY: 0,
        shoulderY: 0,
        velocity: 0,
      };
    }

    const lWrist = landmarks[POSE_INDEX.LEFT_WRIST];
    const rWrist = landmarks[POSE_INDEX.RIGHT_WRIST];
    const lHip = landmarks[POSE_INDEX.LEFT_HIP];
    const rHip = landmarks[POSE_INDEX.RIGHT_HIP];
    const lShoulder = landmarks[POSE_INDEX.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_INDEX.RIGHT_SHOULDER];

    // Compute midpoints along vertical frontal Y-axis
    const wristY = (lWrist.y + rWrist.y) / 2;
    const hipY = (lHip.y + rHip.y) / 2;
    const shoulderY = (lShoulder.y + rShoulder.y) / 2;

    const dt = this.lastTimestamp > 0 ? Math.max(0.016, (timestampMs - this.lastTimestamp) / 1000) : 0.033;
    // Positive velocity = moving physically UPWARDS (so dy = lastWristY - wristY > 0)
    const upwardVelocity = (this.lastWristY - wristY) / dt;

    let emittedTelemetry: RepTelemetry | undefined = undefined;

    // STATE MACHINE TRANSITIONS
    switch (this.currentState) {
      case 0: { // STATE 0: HIKE
        // Check if wrists are below hips: (leftWrist.y + rightWrist.y)/2 > (leftHip.y + rightHip.y)/2
        const isHike = wristY > hipY;

        if (isHike) {
          this.hikeTimestamp = timestampMs;
          this.maxDriveVelocity = 0;
        }

        // Transition 0 -> 1 (Drive): Wrists initiate rapid upward movement
        // Moving upward means wristY is decreasing, upwardVelocity > threshold
        if (this.hikeTimestamp > 0 && upwardVelocity > 0.45 && wristY <= hipY + 0.05) {
          this.currentState = 1;
          this.driveTimestamp = timestampMs;
          this.maxDriveVelocity = upwardVelocity;
        }
        break;
      }

      case 1: { // STATE 1: DRIVE
        // Track peak upward velocity during hip explosion
        if (upwardVelocity > this.maxDriveVelocity) {
          this.maxDriveVelocity = upwardVelocity;
        }

        // If the user aborted and wrists fell back below hips, reset to Hike
        if (wristY > hipY + 0.08 && upwardVelocity < -0.2) {
          this.currentState = 0;
          this.maxDriveVelocity = 0;
          break;
        }

        // Transition 1 -> 2 (Peak / Lockout): Wrists reach shoulder height
        // In screen coords: wristY <= shoulderY (or within small margin of shoulder line)
        const reachedPeak = wristY <= shoulderY + 0.08;

        if (reachedPeak) {
          const timeSinceLastRep = timestampMs - this.lastRepTimestamp;
          if (timeSinceLastRep >= this.minRepIntervalMs) {
            this.currentState = 2;
            this.repCount++;
            this.lastRepTimestamp = timestampMs;

            // Form score calculation:
            // 1. Wrist symmetry: difference between left and right wrist height
            const wristDelta = Math.abs(lWrist.y - rWrist.y);
            const symmetryScore = Math.max(0.6, 1.0 - wristDelta * 2.5);

            // 2. Lockout height score (ideal peak right around shoulder line, not wildly overhead or under)
            const heightDeviation = Math.abs(wristY - shoulderY);
            const heightScore = Math.max(0.7, 1.0 - heightDeviation * 1.8);

            const formScore = Number((symmetryScore * 0.5 + heightScore * 0.5).toFixed(2));

            // Power calculation: scaled from maximum drive velocity (normalized speed 0.8 - 3.5 -> 60 - 130 power)
            const baseVelocity = Math.max(0.8, this.maxDriveVelocity);
            const rawPower = Math.round(50 + baseVelocity * 32);
            const finalPower = Math.min(150, Math.max(50, rawPower));

            emittedTelemetry = {
              event: 'REP_TRIGGER',
              power: finalPower,
              form: formScore,
              repCount: this.repCount,
              state: 2,
              timestamp: timestampMs,
              wristVelocity: Number(this.maxDriveVelocity.toFixed(2)),
              debugInfo: {
                wristY: Number(wristY.toFixed(3)),
                hipY: Number(hipY.toFixed(3)),
                shoulderY: Number(shoulderY.toFixed(3)),
                elapsedMs: timestampMs - this.driveTimestamp,
              },
            };

            if (this.onRepCompleted) {
              this.onRepCompleted(emittedTelemetry);
            }
          }
        }
        break;
      }

      case 2: { // STATE 2: PEAK / LOCKOUT
        // As the kettlebell descends from lockout back toward the hike position
        // Once wrists pass down past chest and approach hips, transition back to State 0
        if (wristY > shoulderY + 0.15 || upwardVelocity < -0.3) {
          this.currentState = 0;
          this.maxDriveVelocity = 0;
        }
        break;
      }
    }

    this.lastWristY = wristY;
    this.lastTimestamp = timestampMs;

    const stateNames: Record<SwingState, 'HIKE' | 'DRIVE' | 'PEAK_LOCKOUT'> = {
      0: 'HIKE',
      1: 'DRIVE',
      2: 'PEAK_LOCKOUT',
    };

    const update: KinematicStateUpdate = {
      state: this.currentState,
      stateName: stateNames[this.currentState],
      repCount: this.repCount,
      power: emittedTelemetry?.power || (this.currentState === 1 ? Math.round(50 + this.maxDriveVelocity * 30) : 0),
      form: emittedTelemetry?.form || 1.0,
      wristY,
      hipY,
      shoulderY,
      velocity: upwardVelocity,
      telemetry: emittedTelemetry,
    };

    if (this.onStateChange) {
      this.onStateChange(update);
    }

    return update;
  }
}
