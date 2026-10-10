// 32-Bit Retro Fitness RPG Core Types

export type RepEvent = 'REP_TRIGGER' | 'REP_UPDATE' | 'CALIBRATION' | 'HIKE_ENTER' | 'DRIVE_ENTER';

export type ExerciseType = 'SWING' | 'SQUAT' | 'OVERHEAD_PRESS';

export interface ExerciseSkillConfig {
  type: ExerciseType;
  skillName: string;
  description: string;
  rpgElement: 'PHYSICAL' | 'EARTH' | 'LIGHTNING';
  colorHex: string;
  targetMetric: string;
}

export const EXERCISE_SKILLS: Record<ExerciseType, ExerciseSkillConfig> = {
  SWING: {
    type: 'SWING',
    skillName: 'IRON CLEAVE',
    description: 'Explosive hip hinge swing that slices through enemies with raw momentum.',
    rpgElement: 'PHYSICAL',
    colorHex: '#F4B41A',
    targetMetric: 'Drive Velocity',
  },
  SQUAT: {
    type: 'SQUAT',
    skillName: 'TITAN GROUND SLAM',
    description: 'Goblet squat dropping hips below knees. Erupts an earth shockwave.',
    rpgElement: 'EARTH',
    colorHex: '#FF3366',
    targetMetric: 'Squat Depth',
  },
  OVERHEAD_PRESS: {
    type: 'OVERHEAD_PRESS',
    skillName: 'THUNDER SMITE',
    description: 'Vertical push press overhead that calls divine lightning from the heavens.',
    rpgElement: 'LIGHTNING',
    colorHex: '#38B6FF',
    targetMetric: 'Overhead Lockout',
  },
};

export interface RepTelemetry {
  event: RepEvent;
  exercise?: ExerciseType;
  skillName?: string;
  power: number; // 0 - 100+ (calculated from speed, depth, or force)
  form: number;  // 0.0 - 1.0 (form alignment score)
  repCount?: number;
  state?: number; // Phase of the current movement
  timestamp?: number;
  wristVelocity?: number;
  debugInfo?: {
    wristY?: number;
    hipY?: number;
    kneeY?: number;
    shoulderY?: number;
    elapsedMs?: number;
  };
}

export type NetworkRole = 'tv' | 'phone';

export interface PeerMessage {
  type: 'TELEMETRY' | 'HANDSHAKE' | 'CALIBRATE' | 'ACK' | 'PING' | 'PONG' | 'SELECT_SKILL';
  payload: any;
  senderId?: string;
  timestamp: number;
}

export type EquipmentSlot = 'weapon' | 'shield' | 'armor' | 'helmet';

export interface EquipmentItem {
  id: string;
  name: string;
  slot: EquipmentSlot;
  attachmentId: string;
  level: number;
  powerBonus: number;
  formMultiplier: number;
  price: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  description: string;
  colorHex: string;
  spriteIcon?: string;
}

export type HubLocation = 'GATE' | 'BLACKSMITH' | 'ALCHEMIST' | 'SANCTUARY';

export interface KnightStats {
  level: number;
  xp: number;
  maxXp: number;
  gold: number;
  currentHp: number;
  maxHp: number;
  power: number;
  defense: number;
  repsCompleted: number;
  maxCombo: number;
  currentCombo: number;
}
