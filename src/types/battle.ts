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
  spriteType: MonsterSprite;
  slotIndex?: number;
  instanceId?: string;
  isAlive?: boolean;
}

/** Spine monster rigs in public/assets/spine/monsters (see MONSTER_RIGS in GameEngine). */
export type MonsterSprite = 'SLIME' | 'TREEMON' | 'HELLHOUND' | 'BOAR' | 'DEMON_MONK' | 'WOLF';

export interface BattleState {
  playerHp: number;
  playerMaxHp: number;
  playerBlock: number;
  monster: MonsterState;
  monsters?: MonsterState[];
  targetedMonsterIndex?: number;
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

  // 4. CLEAN & PRESS CARDS
  {
    templateId: 'clean_breaker',
    name: 'Anvil Breaker',
    type: 'ATTACK',
    exercise: 'CLEAN_AND_PRESS',
    exerciseLabel: 'CLEAN & PRESS',
    requiredReps: 4,
    damage: 55,
    block: 15,
    effectDesc: 'Explosive floor-to-rack snap and overhead press. Deals 55 DMG + 15 Block.',
    rarity: 'rare',
    colorHex: '#F97316',
    icon: '💥',
  },
  {
    templateId: 'clean_stormbreaker',
    name: 'Stormbreaker Cleaver',
    type: 'ATTACK',
    exercise: 'CLEAN_AND_PRESS',
    exerciseLabel: 'CLEAN & PRESS',
    requiredReps: 6,
    damage: 92,
    block: 0,
    effectDesc: 'Clean to rack then vertical thrust smashing armor for 92 lightning DMG.',
    rarity: 'epic',
    colorHex: '#EA580C',
    icon: '⚡',
  },

  // 5. SNATCH CARDS
  {
    templateId: 'snatch_phoenix',
    name: 'Phoenix Ascension',
    type: 'ATTACK',
    exercise: 'SNATCH',
    exerciseLabel: 'KETTLEBELL SNATCHES',
    requiredReps: 5,
    damage: 72,
    block: 0,
    effectDesc: 'Single uninterrupted pull directly to overhead. Deals 72 fire DMG.',
    rarity: 'rare',
    colorHex: '#EF4444',
    icon: '🔥',
  },
  {
    templateId: 'snatch_solar',
    name: 'Solar Talon',
    type: 'ATTACK',
    exercise: 'SNATCH',
    exerciseLabel: 'KETTLEBELL SNATCHES',
    requiredReps: 8,
    damage: 115,
    block: 0,
    effectDesc: 'Ballistic overhead snatch eruption unleashing 115 critical DMG.',
    rarity: 'legendary',
    colorHex: '#B91C1C',
    icon: '🦅',
  },

  // 6. WINDMILL CARDS
  {
    templateId: 'windmill_astral',
    name: 'Astral Spire',
    type: 'DEFENSE',
    exercise: 'WINDMILL',
    exerciseLabel: 'KETTLEBELL WINDMILLS',
    requiredReps: 3,
    damage: 22,
    block: 42,
    effectDesc: 'Torso lateral hinge with overhead bell lock. Grants 42 Block + 22 DMG.',
    rarity: 'rare',
    colorHex: '#00EB88',
    icon: '🌌',
  },
  {
    templateId: 'windmill_cosmic',
    name: 'Cosmic Ward',
    type: 'DEFENSE',
    exercise: 'WINDMILL',
    exerciseLabel: 'KETTLEBELL WINDMILLS',
    requiredReps: 5,
    damage: 35,
    block: 65,
    effectDesc: 'Deep ankle reach creating an impenetrable astral barrier: 65 Block.',
    rarity: 'epic',
    colorHex: '#10B981',
    icon: '🛡️',
  },

  // 7. DEADLIFT / HINGE CARDS
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

  // 8. THRUSTER CARDS
  {
    templateId: 'thruster_eruption',
    name: 'Solar Eruption',
    type: 'ATTACK',
    exercise: 'THRUSTER',
    exerciseLabel: 'KETTLEBELL THRUSTERS',
    requiredReps: 4,
    damage: 62,
    block: 15,
    effectDesc: 'Deep squat hole exploding into overhead press: 62 DMG + 15 Block.',
    rarity: 'rare',
    colorHex: '#F59E0B',
    icon: '☄️',
  },
  {
    templateId: 'thruster_supernova',
    name: 'Supernova Surge',
    type: 'ATTACK',
    exercise: 'THRUSTER',
    exerciseLabel: 'KETTLEBELL THRUSTERS',
    requiredReps: 6,
    damage: 105,
    block: 10,
    effectDesc: 'Dynamic squat-to-overhead blast dealing 105 cataclysmic DMG.',
    rarity: 'epic',
    colorHex: '#D97706',
    icon: '🌟',
  },

  // 9. GORILLA ROW CARDS
  {
    templateId: 'row_beast_maw',
    name: 'Beast Maw',
    type: 'ATTACK',
    exercise: 'GORILLA_ROW',
    exerciseLabel: 'GORILLA ROWS',
    requiredReps: 5,
    damage: 48,
    block: 12,
    effectDesc: 'Bent-over elbow row tearing ribs: 48 DMG + 12 guard Block.',
    rarity: 'common',
    colorHex: '#84CC16',
    icon: '🦍',
  },
  {
    templateId: 'row_shadow_ripper',
    name: 'Shadow Ripper',
    type: 'ATTACK',
    exercise: 'GORILLA_ROW',
    exerciseLabel: 'GORILLA ROWS',
    requiredReps: 8,
    damage: 86,
    block: 0,
    effectDesc: 'Explosive alternating rows dealing 86 armor-piercing damage.',
    rarity: 'rare',
    colorHex: '#65A30D',
    icon: '🗡️',
  },

  // 10. HALO CARDS
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

  // 11. SINGLE-LEG RDL CARDS
  {
    templateId: 'rdl_valkyrie',
    name: 'Valkyrie Balance',
    type: 'DEFENSE',
    exercise: 'SINGLE_LEG_RDL',
    exerciseLabel: 'SINGLE-LEG RDL',
    requiredReps: 4,
    damage: 28,
    block: 36,
    effectDesc: 'Unilateral hinge with horizontal leg extension: 36 Block + 28 DMG.',
    rarity: 'rare',
    colorHex: '#EC4899',
    icon: '🕊️',
  },
  {
    templateId: 'rdl_crane',
    name: 'Crane Strike',
    type: 'ATTACK',
    exercise: 'SINGLE_LEG_RDL',
    exerciseLabel: 'SINGLE-LEG RDL',
    requiredReps: 6,
    damage: 78,
    block: 18,
    effectDesc: 'Disciplined single-leg posterior drive dealing 78 precise damage.',
    rarity: 'epic',
    colorHex: '#DB2777',
    icon: '🦩',
  },
];

export const MONSTER_CATALOG: Omit<MonsterState, 'currentHp' | 'block' | 'intent'>[] = [
  {
    id: 'green_slime',
    name: 'GREEN SLIME',
    title: 'DUNGEON OOZE',
    maxHp: 220,
    level: 5,
    spriteType: 'SLIME',
  },
  {
    id: 'boar',
    name: 'RAZORBACK BOAR',
    title: 'TUSKED CHARGER',
    maxHp: 260,
    level: 6,
    spriteType: 'BOAR',
  },
  {
    id: 'wolf',
    name: 'SHADOW WOLF',
    title: 'NOCTURNAL PREDATOR',
    maxHp: 290,
    level: 7,
    spriteType: 'WOLF',
  },
  {
    id: 'treemon',
    name: 'TREEMON',
    title: 'ROOTBOUND GUARDIAN',
    maxHp: 320,
    level: 8,
    spriteType: 'TREEMON',
  },
  {
    id: 'demon_monk',
    name: 'DEMON MONK',
    title: 'CORRUPTED ACOLYTE',
    maxHp: 390,
    level: 10,
    spriteType: 'DEMON_MONK',
  },
  {
    id: 'hellhound',
    name: 'HELLHOUND',
    title: 'TWO-HEADED HOUND',
    maxHp: 450,
    level: 12,
    spriteType: 'HELLHOUND',
  },
];

export interface EncounterTemplate {
  id: string;
  name: string;
  description: string;
  monsterIds: string[]; // references MONSTER_CATALOG id
}

export const ENCOUNTERS: EncounterTemplate[] = [
  // 1-Monster (Solo Encounters)
  { id: 'solo_slime', name: 'Dungeon Ooze', description: 'A lone acid slime blocks the path.', monsterIds: ['green_slime'] },
  { id: 'solo_boar', name: 'Razorback Charger', description: 'A furious wild boar scrapes its hooves on the dirt.', monsterIds: ['boar'] },
  { id: 'solo_wolf', name: 'The Lone Predator', description: 'A solitary shadow wolf stalking in the darkness.', monsterIds: ['wolf'] },
  { id: 'solo_treemon', name: 'Rootbound Guardian', description: 'An ancient animated wood golem emerges from the roots.', monsterIds: ['treemon'] },
  { id: 'solo_monk', name: 'The Corrupted Priest', description: 'A demonic monk chanting forbidden curses.', monsterIds: ['demon_monk'] },
  { id: 'solo_hellhound', name: 'The Twin-Headed Beast', description: 'A terrifying volcanic hellhound hungry for flesh.', monsterIds: ['hellhound'] },

  // 2-Monsters (Duo Encounters)
  { id: 'duo_slimes', name: 'Twin Slimes', description: 'Two corrosive oozes working in tandem.', monsterIds: ['green_slime', 'green_slime'] },
  { id: 'wolf_pack', name: 'Twin Shadow Wolves', description: 'Two cunning wolves flanking from both sides.', monsterIds: ['wolf', 'wolf'] },
  { id: 'wild_stampede', name: 'Wild Beasts', description: 'A rampaging boar charged alongside a shadow wolf.', monsterIds: ['boar', 'wolf'] },
  { id: 'forest_ambush', name: 'Forest Guardians', description: 'A Treemon flanked by a toxic forest slime.', monsterIds: ['treemon', 'green_slime'] },
  { id: 'unholy_covenant', name: 'Unholy Covenant', description: 'A Demon Monk shielded by a giant Treemon.', monsterIds: ['demon_monk', 'treemon'] },
  { id: 'hound_pack', name: 'Hounds of Fire & Ooze', description: 'A ferocious Hellhound supported by a dungeon slime.', monsterIds: ['hellhound', 'green_slime'] },
  { id: 'iron_tusks_fire', name: 'Tusks of Hellfire', description: 'A brutal duo: Hellhound and Razorback Boar!', monsterIds: ['hellhound', 'boar'] },

  // 3-Monsters (Trio Encounters)
  { id: 'slime_swarm', name: 'Ooze Swarm', description: 'A triple swarm of hungry dungeon slimes!', monsterIds: ['green_slime', 'green_slime', 'green_slime'] },
  { id: 'wolf_hunting_pack', name: 'Wolf Hunting Pack', description: 'Three coordinated shadow wolves hunting in the gloom.', monsterIds: ['wolf', 'wolf', 'wolf'] },
  { id: 'beast_stampede', name: 'Woodland Stampede', description: 'Two heavy boars led by a fierce shadow wolf.', monsterIds: ['boar', 'wolf', 'boar'] },
  { id: 'forest_trio', name: 'Sylvan Syndicate', description: 'A fortified Treemon supported by two stinging slimes.', monsterIds: ['green_slime', 'treemon', 'green_slime'] },
  { id: 'demonic_conclave', name: 'Demonic Conclave', description: 'A Demon Monk backed by a Hellhound and an acid slime.', monsterIds: ['demon_monk', 'hellhound', 'green_slime'] },
  { id: 'boss_trio', name: 'The Dread Menagerie', description: 'A legendary trio: Hellhound, Demon Monk, and Treemon!', monsterIds: ['demon_monk', 'treemon', 'hellhound'] },
];
