// 32-Bit Retro Fitness RPG Core Types
import type { Element } from '../shared/elements';
import type { CombatCard } from './battle';

export type RepEvent = 'REP_TRIGGER' | 'REP_UPDATE' | 'CALIBRATION' | 'HIKE_ENTER' | 'DRIVE_ENTER';

export type ExerciseType = 
  | 'SWING' 
  | 'SQUAT' 
  | 'CLEAN_AND_PRESS'
  | 'SNATCH'
  | 'WINDMILL'
  | 'DEADLIFT'
  | 'OVERHEAD_PRESS'
  | 'THRUSTER'
  | 'GORILLA_ROW'
  | 'AROUND_THE_BODY'
  | 'SINGLE_LEG_RDL'
  | 'CLEAN'
  | 'LUNGE';

export type RpgElement = 'PHYSICAL' | 'EARTH' | 'LIGHTNING' | 'FIRE' | 'ARCANE';

export interface ExerciseSkillConfig {
  type: ExerciseType;
  skillName: string;
  description: string;
  rpgElement: RpgElement;
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
  CLEAN_AND_PRESS: {
    type: 'CLEAN_AND_PRESS',
    skillName: 'STORM BREAKER',
    description: 'Two-stage compound clean to rack followed by a thunderous overhead press.',
    rpgElement: 'LIGHTNING',
    colorHex: '#F97316',
    targetMetric: 'Rack to Lockout',
  },
  SNATCH: {
    type: 'SNATCH',
    skillName: 'PHOENIX ASCENSION',
    description: 'Continuous ballistic pull from floor directly to overhead lockout without pausing.',
    rpgElement: 'FIRE',
    colorHex: '#EF4444',
    targetMetric: 'Explosive Pull',
  },
  WINDMILL: {
    type: 'WINDMILL',
    skillName: 'ASTRAL SPIRE',
    description: 'Lateral hip hinge with bell locked overhead. Channels celestial cosmic ward.',
    rpgElement: 'ARCANE',
    colorHex: '#00EB88',
    targetMetric: 'Lateral Flexibility',
  },
  DEADLIFT: {
    type: 'DEADLIFT',
    skillName: 'MOUNTAIN SUNDER',
    description: 'Heavy posterior hinge pulling strictly from mid-shin to full standing hip lockout.',
    rpgElement: 'EARTH',
    colorHex: '#D97706',
    targetMetric: 'Posterior Drive',
  },
  OVERHEAD_PRESS: {
    type: 'OVERHEAD_PRESS',
    skillName: 'THUNDER SMITE',
    description: 'Strict unilateral push press overhead that calls divine lightning.',
    rpgElement: 'LIGHTNING',
    colorHex: '#38B6FF',
    targetMetric: 'Overhead Lockout',
  },
  THRUSTER: {
    type: 'THRUSTER',
    skillName: 'SOLAR ERUPTION',
    description: 'Deep goblet squat directly transferring momentum into an explosive press.',
    rpgElement: 'FIRE',
    colorHex: '#F59E0B',
    targetMetric: 'Squat-to-Press Flow',
  },
  GORILLA_ROW: {
    type: 'GORILLA_ROW',
    skillName: 'BEAST MAW',
    description: 'Hinged bent-over pull driving elbow high past the ribs with predatory power.',
    rpgElement: 'PHYSICAL',
    colorHex: '#84CC16',
    targetMetric: 'Elbow Row Drive',
  },
  AROUND_THE_BODY: {
    type: 'AROUND_THE_BODY',
    skillName: 'CELESTIAL WARD',
    description: 'Rotational 360-degree pass around the waist generating a swirling kinetic barrier.',
    rpgElement: 'LIGHTNING',
    colorHex: '#818CF8',
    targetMetric: 'Orbit Cadence',
  },
  SINGLE_LEG_RDL: {
    type: 'SINGLE_LEG_RDL',
    skillName: 'VALKYRIE BALANCE',
    description: 'Unilateral hinge with horizontal rear-leg extension testing true knightly equilibrium.',
    rpgElement: 'ARCANE',
    colorHex: '#EC4899',
    targetMetric: 'Single-Leg Balance',
  },
  CLEAN: {
    type: 'CLEAN',
    skillName: 'ANVIL BREAKER',
    description: 'Explosive floor to shoulder rack snap with immense kinetic force.',
    rpgElement: 'PHYSICAL',
    colorHex: '#F97316',
    targetMetric: 'Triple Extension',
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
  type: 'TELEMETRY' | 'HANDSHAKE' | 'CALIBRATE' | 'ACK' | 'PING' | 'PONG' | 'SELECT_SKILL' | 'HAND_SYNC';
  payload: any;
  senderId?: string;
  timestamp: number;
}

export type HandSyncMode = 'BATTLE' | 'VICTORY' | 'CINEMATIC';

/** TV → phone: the battle's current hand, or null outside battle (the phone then tracks every exercise). */
export interface HandSyncPayload {
  cards: CombatCard[] | null;
  mode?: HandSyncMode;
}

export type EquipmentSlot = 'weapon' | 'shield' | 'armor' | 'helmet';
export type WeaponType = 'bell' | 'sword' | 'mace' | 'morningstar';

export interface EquipmentItem {
  id: string;
  name: string;
  slot: EquipmentSlot;
  weaponType?: WeaponType;
  /** Elemental weapon: trades raw Attack for elemental damage on every hit (src/shared/elements.ts). */
  element?: Element;
  attachmentId: string;
  level: number;
  powerBonus: number;
  formMultiplier: number;
  price: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  description: string;
  colorHex: string;
  spriteIcon?: string;
  /**
   * Sealed in a secret trial (src/shared/secretTrials.ts): never sold, won only in its trial. Wieldable
   * at any knight level; its tier follows the bearer (stoneBoundTier in src/shared/progression.ts).
   */
  stoneBound?: boolean;
  /**
   * A monster's weapon: the blacksmith sells it only once the knight has slain one of these monsters
   * (MONSTER_CATALOG ids; affixed variants keep their monster's id), at any knight level. See trophyLocked in
   * src/shared/shopItems.ts.
   */
  trophyOf?: string[];
  /** Extra share of gold from every rep while equipped (the Midas Bell: 0.5 = +50%). */
  repGoldBonus?: number;
}

export type HubLocation = 'QUICK_PLAY' | 'GATE' | 'BLACKSMITH' | 'SANCTUARY' | 'GRAPHICS';

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
