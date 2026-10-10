import { ExerciseType } from './game';

export type CardType = 'ATTACK' | 'DEFENSE' | 'POWER';
export type CardRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface CombatCard {
  id: string;
  templateId: string;
  name: string;
  type: CardType;
  exercise: ExerciseType;
  exerciseLabel: string;
  requiredReps: number;
  currentReps: number;
  damage: number;
  block: number;
  effectDesc: string;
  rarity: CardRarity;
  colorHex: string;
  icon: string;
}

export interface MonsterIntent {
  type: 'ATTACK' | 'HEAVY_ATTACK' | 'DEFEND' | 'BUFF';
  damage: number;
  name: string;
  description: string;
  durationSeconds: number; // total attack charge time
  remainingSeconds: number; // current real-time countdown
}

export interface MonsterState {
  id: string;
  name: string;
  title: string;
  currentHp: number;
  maxHp: number;
  block: number;
  intent: MonsterIntent;
  level: number;
  spriteType: 'DEMON' | 'GOLEM' | 'WARLORD' | 'MINOTAUR';
}

export interface BattleState {
  playerHp: number;
  playerMaxHp: number;
  playerBlock: number;
  monster: MonsterState;
  hand: CombatCard[];
  drawPileCount: number;
  discardPileCount: number;
  status: 'FIGHTING' | 'VICTORY' | 'DEFEAT';
  selectedCardIndex: number;
  combatLogs: string[];
}

export interface CardTemplate {
  templateId: string;
  name: string;
  type: CardType;
  exercise: ExerciseType;
  exerciseLabel: string;
  requiredReps: number;
  damage: number;
  block: number;
  effectDesc: string;
  rarity: CardRarity;
  colorHex: string;
  icon: string;
}

// Master Card Pool (Diverse exercises & Slay the Spire style synergies)
export const CARD_CATALOG: CardTemplate[] = [
  // 1. SWING CARDS
  {
    templateId: 'swing_cleave',
    name: 'Iron Cleave',
    type: 'ATTACK',
    exercise: 'SWING',
    exerciseLabel: 'KETTLEBELL SWINGS',
    requiredReps: 5,
    damage: 35,
    block: 0,
    effectDesc: 'Swift hip snap dealing 35 physical damage.',
    rarity: 'common',
    colorHex: '#F4B41A',
    icon: '⚔️',
  },
  {
    templateId: 'swing_whirlwind',
    name: 'Dragon Whirlwind',
    type: 'ATTACK',
    exercise: 'SWING',
    exerciseLabel: 'KETTLEBELL SWINGS',
    requiredReps: 8,
    damage: 65,
    block: 0,
    effectDesc: 'Massive explosive swings dealing 65 critical fire damage.',
    rarity: 'rare',
    colorHex: '#DC2626',
    icon: '🌪️',
  },
  {
    templateId: 'swing_flow',
    name: 'Momentum Flow',
    type: 'DEFENSE',
    exercise: 'SWING',
    exerciseLabel: 'KETTLEBELL SWINGS',
    requiredReps: 4,
    damage: 15,
    block: 20,
    effectDesc: 'Rhythmic swings granting 20 Block and dealing 15 damage.',
    rarity: 'common',
    colorHex: '#38B6FF',
    icon: '🌊',
  },

  // 2. SQUAT CARDS
  {
    templateId: 'squat_slam',
    name: 'Titan Ground Slam',
    type: 'ATTACK',
    exercise: 'SQUAT',
    exerciseLabel: 'GOBLET SQUATS',
    requiredReps: 4,
    damage: 42,
    block: 0,
    effectDesc: 'Deep parallel squat erupting an earth shockwave for 42 damage.',
    rarity: 'common',
    colorHex: '#FF3366',
    icon: '🔨',
  },
  {
    templateId: 'squat_bastion',
    name: 'Aegis Fortress',
    type: 'DEFENSE',
    exercise: 'SQUAT',
    exerciseLabel: 'GOBLET SQUATS',
    requiredReps: 5,
    damage: 0,
    block: 38,
    effectDesc: 'Brace your core deep in the hole. Gain 38 Block.',
    rarity: 'rare',
    colorHex: '#00EB88',
    icon: '🛡️',
  },
  {
    templateId: 'squat_earthquake',
    name: 'Colossus Quake',
    type: 'ATTACK',
    exercise: 'SQUAT',
    exerciseLabel: 'GOBLET SQUATS',
    requiredReps: 7,
    damage: 75,
    block: 15,
    effectDesc: 'Heavy goblet squats dealing 75 damage and 15 Block.',
    rarity: 'epic',
    colorHex: '#A855F7',
    icon: '🌋',
  },

  // 3. OVERHEAD PRESS CARDS
  {
    templateId: 'press_smite',
    name: 'Thunder Smite',
    type: 'ATTACK',
    exercise: 'OVERHEAD_PRESS',
    exerciseLabel: 'OVERHEAD PRESS',
    requiredReps: 4,
    damage: 48,
    block: 0,
    effectDesc: 'Thrust kettlebell skyward. Calls lightning for 48 damage.',
    rarity: 'common',
    colorHex: '#38B6FF',
    icon: '⚡',
  },
  {
    templateId: 'press_judgement',
    name: 'Heavenly Pillar',
    type: 'ATTACK',
    exercise: 'OVERHEAD_PRESS',
    exerciseLabel: 'OVERHEAD PRESS',
    requiredReps: 6,
    damage: 80,
    block: 0,
    effectDesc: 'Full overhead lockouts. Pierces monster armor for 80 damage.',
    rarity: 'epic',
    colorHex: '#FBBF24',
    icon: '☀️',
  },
  {
    templateId: 'press_sanctuary',
    name: 'Arcane Scepter',
    type: 'DEFENSE',
    exercise: 'OVERHEAD_PRESS',
    exerciseLabel: 'OVERHEAD PRESS',
    requiredReps: 3,
    damage: 18,
    block: 25,
    effectDesc: 'High reach generating a forcefield: 25 Block + 18 damage.',
    rarity: 'rare',
    colorHex: '#60A5FA',
    icon: '✨',
  },

  // 4. CLEAN & RACK CARDS
  {
    templateId: 'clean_breaker',
    name: 'Anvil Breaker',
    type: 'ATTACK',
    exercise: 'CLEAN',
    exerciseLabel: 'KETTLEBELL CLEANS',
    requiredReps: 4,
    damage: 52,
    block: 10,
    effectDesc: 'Explosive floor-to-rack snap. Deals 52 damage + 10 Block.',
    rarity: 'rare',
    colorHex: '#F97316',
    icon: '💥',
  },
  {
    templateId: 'clean_power',
    name: 'Meteor Uppercut',
    type: 'ATTACK',
    exercise: 'CLEAN',
    exerciseLabel: 'KETTLEBELL CLEANS',
    requiredReps: 6,
    damage: 88,
    block: 0,
    effectDesc: 'Triple extension explosion launching 88 crushing damage.',
    rarity: 'epic',
    colorHex: '#EF4444',
    icon: '☄️',
  },

  // 5. HALO CARDS
  {
    templateId: 'halo_barrier',
    name: 'Celestial Barrier',
    type: 'DEFENSE',
    exercise: 'HALO',
    exerciseLabel: 'KETTLEBELL HALOS',
    requiredReps: 4,
    damage: 0,
    block: 45,
    effectDesc: 'Circle the bell around your head. Grants massive 45 Block.',
    rarity: 'rare',
    colorHex: '#818CF8',
    icon: '💫',
  },
  {
    templateId: 'halo_vortex',
    name: 'Astral Vortex',
    type: 'ATTACK',
    exercise: 'HALO',
    exerciseLabel: 'KETTLEBELL HALOS',
    requiredReps: 5,
    damage: 40,
    block: 22,
    effectDesc: 'Rotational core power dealing 40 damage and 22 Block.',
    rarity: 'epic',
    colorHex: '#C084FC',
    icon: '🌀',
  },

  // 6. DEADLIFT / HINGE CARDS
  {
    templateId: 'deadlift_colossus',
    name: 'Root of Titans',
    type: 'DEFENSE',
    exercise: 'DEADLIFT',
    exerciseLabel: 'DEADLIFT HINGES',
    requiredReps: 5,
    damage: 20,
    block: 35,
    effectDesc: 'Heavy posterior hinge anchoring your stance: 35 Block + 20 DMG.',
    rarity: 'common',
    colorHex: '#84CC16',
    icon: '🌲',
  },
  {
    templateId: 'deadlift_sunder',
    name: 'Mountain Sunder',
    type: 'ATTACK',
    exercise: 'DEADLIFT',
    exerciseLabel: 'DEADLIFT HINGES',
    requiredReps: 7,
    damage: 95,
    block: 0,
    effectDesc: 'Full chain deadlift ripping the earth for 95 raw damage.',
    rarity: 'legendary',
    colorHex: '#D97706',
    icon: '⛰️',
  },

  // 7. LUNGE CARDS
  {
    templateId: 'lunge_dash',
    name: 'Valkyrie Dash',
    type: 'ATTACK',
    exercise: 'LUNGE',
    exerciseLabel: 'SPLIT LUNGES',
    requiredReps: 4,
    damage: 46,
    block: 15,
    effectDesc: 'Dynamic split lunge strike: 46 damage + 15 evasion Block.',
    rarity: 'rare',
    colorHex: '#EC4899',
    icon: '🗡️',
  },
  {
    templateId: 'lunge_flurry',
    name: 'Blade Flurry',
    type: 'ATTACK',
    exercise: 'LUNGE',
    exerciseLabel: 'SPLIT LUNGES',
    requiredReps: 6,
    damage: 78,
    block: 0,
    effectDesc: 'Explosive alternating lunges dealing 78 rapid damage.',
    rarity: 'epic',
    colorHex: '#F43F5E',
    icon: '⚔️',
  },
];

export const MONSTER_CATALOG: Omit<MonsterState, 'currentHp' | 'block' | 'intent'>[] = [
  {
    id: 'sloth_demon',
    name: 'BELPHEGOR',
    title: 'THE SLOTH DEMON',
    maxHp: 220,
    level: 5,
    spriteType: 'DEMON',
  },
  {
    id: 'lactate_golem',
    name: 'LACTIC TITAN',
    title: 'HEAVY IRON GOLEM',
    maxHp: 320,
    level: 8,
    spriteType: 'GOLEM',
  },
  {
    id: 'orc_warlord',
    name: 'WARLORD GORECLAW',
    title: 'DUNGEON EXECUTIONER',
    maxHp: 450,
    level: 12,
    spriteType: 'WARLORD',
  },
];
