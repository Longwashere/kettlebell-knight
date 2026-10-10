// 32-Bit Retro Fitness RPG Core Types

export type RepEvent = 'REP_TRIGGER' | 'REP_UPDATE' | 'CALIBRATION' | 'HIKE_ENTER' | 'DRIVE_ENTER';

export type ExerciseType = 
  | 'SWING' 
  | 'SQUAT' 
  | 'OVERHEAD_PRESS'
  | 'CLEAN'
  | 'HALO'
  | 'DEADLIFT'
  | 'LUNGE';

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
  CLEAN: {
    type: 'CLEAN',
    skillName: 'ANVIL BREAKER',
    description: 'Explosive floor to shoulder rack snap with immense kinetic force.',
    rpgElement: 'PHYSICAL',
    colorHex: '#F97316',
    targetMetric: 'Triple Extension',
  },
  HALO: {
    type: 'HALO',
    skillName: 'CELESTIAL WARD',
    description: 'Rotational orbit around the crown generating an impenetrable shield.',
    rpgElement: 'LIGHTNING',
    colorHex: '#818CF8',
    targetMetric: 'Orbit Smoothness',
  },
  DEADLIFT: {
    type: 'DEADLIFT',
    skillName: 'MOUNTAIN SUNDER',
    description: 'Heavy posterior hinge anchoring your stance into the bedrock.',
    rpgElement: 'EARTH',
    colorHex: '#D97706',
    targetMetric: 'Lockout Extension',
  },
  LUNGE: {
    type: 'LUNGE',
    skillName: 'VALKYRIE DASH',
    description: 'Dynamic split knee dip balancing agility and striking power.',
    rpgElement: 'PHYSICAL',
    colorHex: '#EC4899',
    targetMetric: 'Lunge Depth',
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
