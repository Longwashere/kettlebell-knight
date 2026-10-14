import { ExerciseType } from './game';
import { designCard } from '../shared/cardBalance';

export type CardType = 'ATTACK' | 'DEFENSE' | 'POWER';
export type CardRarity = 'common' | 'rare' | 'epic' | 'legendary';

/**
 * Who a card's damage hits (see src/shared/combat.ts):
 * - SINGLE: the current target (the front foe unless retargeted)
 * - BACK: the rearmost foe, reaching over the front line
 * - PIERCE: the target, then the foe behind it for reduced damage
 * - CHAIN: `hits` separate hits, each on a random living foe
 * - ALL: every living foe
 */
export type CardTarget = 'SINGLE' | 'BACK' | 'PIERCE' | 'CHAIN' | 'ALL';

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
  heal: number;
  target: CardTarget;
  hits?: number;
  shatter?: boolean; // damage ignores Block
  stagger?: number; // seconds added to each hit foe's attack timer
  effectDesc: string;
  rarity: CardRarity;
  colorHex: string;
  icon: string;
  /** Running totals of the reps' power/form, so the cast scales with the whole set, not the last rep. */
  powerSum?: number;
  formSum?: number;
}

/**
 * Choreographed monster moves (src/tv/engine/monsterMoves.ts). Each is a timed sequence of Spine
 * animation, monster movement, camera and VFX; damage/block is applied on the move's impact frame.
 */
export type MonsterMoveId =
  // Green Slime
  | 'slime_slap' | 'slime_acid_spit' | 'slime_ooze_slam' | 'slime_engulf'
  // Razorback Boar
  | 'boar_tusk_slash' | 'boar_gore_charge' | 'boar_earthsplitter' | 'boar_quill_volley' | 'boar_iron_bristles'
  // Shadow Wolf
  | 'wolf_predator_rake' | 'wolf_shadow_pounce' | 'wolf_throat_bite' | 'wolf_phantom_pack'
  // Treemon
  | 'tree_branch_whip' | 'tree_root_stomp' | 'tree_burrow_ambush' | 'tree_spore_burst' | 'tree_bark_skin'
  // Demon Monk
  | 'monk_cursed_palm' | 'monk_hellfire_orb' | 'monk_abyssal_edict' | 'monk_chains_of_penance' | 'monk_forbidden_ward'
  // Hellhound
  | 'hound_twin_maul' | 'hound_savage_frenzy' | 'hound_hellfire_breath' | 'hound_magma_rampage' | 'hound_brimstone_rain';

export interface MonsterIntent {
  type: 'ATTACK' | 'HEAVY_ATTACK' | 'DEFEND' | 'BUFF';
  damage: number;
  name: string;
  description: string;
  move?: MonsterMoveId; // choreography to play; falls back to a generic lunge when absent
  block?: number; // DEFEND: block gained (default 25)
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
  damageScale?: number; // pack scaling applied to rolled intents (see PACK_SCALING)
}

export type MonsterSprite =
  | 'SLIME'
  | 'TREEMON'
  | 'HELLHOUND'
  | 'BOAR'
  | 'DEMON_MONK'
  | 'WOLF'
  | 'BAT'
  | 'BONE_GOLEM'
  | 'CRYPT_LORD'
  | 'DARK_EMPEROR'
  | 'DARK_KNIGHT'
  | 'DARK_MAGE'
  | 'DEMON_ARCHBISHOP'
  | 'ELDRITCH_HORROR'
  | 'GARGOYLE'
  | 'GHOST'
  | 'GIANT_SPIDER'
  | 'GOBLIN'
  | 'GOLEM'
  | 'GRAVE_COLOSSUS'
  | 'HARPY'
  | 'INFERNO_TITAN'
  | 'KRAKEN'
  | 'LIZARDMAN'
  | 'MAGMA_DRAGON'
  | 'MINOTAUR'
  | 'MUSHROOM'
  | 'NIGHTMARE_STAG'
  | 'ORC'
  | 'SKELETON_ARCHER'
  | 'SKELETON_KNIGHT'
  | 'SKELETON_WARRIOR'
  | 'ANCIENT_TREANT'
  | 'TROLL'
  | 'VAULT_GUARDIAN'
  | 'VOID_PROPHET'
  | 'WATER_ELEMENTAL'
  | 'WRAITH';

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

export type CardTemplate = Omit<CombatCard, 'id' | 'currentReps' | 'powerSum' | 'formSum'>;

// Master card pool. Numbers come from the balance model (src/shared/cardBalance.ts): each spec sets the
// exercise, reps, rarity, targeting and extras, and damage/Block/heal are derived from its budget.
// Every exercise has at least two cards so the five-unique-exercises hand always has options.
export const CARD_CATALOG: CardTemplate[] = [
  // SWING: fast and ballistic. Bread-and-butter single hits, a whirlwind that clears groups.
  designCard({ templateId: 'swing_cleave', name: 'Iron Cleave', exercise: 'SWING', reps: 5, rarity: 'common', target: 'SINGLE', colorHex: '#F4B41A', icon: '⚔️' }),
  designCard({ templateId: 'swing_whirlwind', name: 'Dragon Whirlwind', exercise: 'SWING', reps: 8, rarity: 'rare', target: 'ALL', colorHex: '#DC2626', icon: '🌪️' }),
  designCard({ templateId: 'swing_flow', name: 'Momentum Flow', exercise: 'SWING', reps: 4, rarity: 'common', target: 'SINGLE', blockShare: 0.6, colorHex: '#38B6FF', icon: '🌊' }),

  // SQUAT: ground shockwaves hit everyone; a pure wall of Block.
  designCard({ templateId: 'squat_slam', name: 'Titan Ground Slam', exercise: 'SQUAT', reps: 4, rarity: 'common', target: 'ALL', colorHex: '#FF3366', icon: '🔨' }),
  designCard({ templateId: 'squat_bastion', name: 'Aegis Fortress', exercise: 'SQUAT', reps: 5, rarity: 'rare', target: 'SINGLE', blockShare: 1, colorHex: '#00EB88', icon: '🛡️' }),
  designCard({ templateId: 'squat_earthquake', name: 'Colossus Quake', exercise: 'SQUAT', reps: 7, rarity: 'epic', target: 'ALL', stagger: 1.5, blockShare: 0.15, colorHex: '#A855F7', icon: '🌋' }),

  // OVERHEAD PRESS: strikes from above, so it can reach the back row or punch through armor.
  designCard({ templateId: 'press_smite', name: 'Thunder Smite', exercise: 'OVERHEAD_PRESS', reps: 4, rarity: 'common', target: 'BACK', colorHex: '#38B6FF', icon: '⚡' }),
  designCard({ templateId: 'press_judgement', name: 'Heavenly Pillar', exercise: 'OVERHEAD_PRESS', reps: 6, rarity: 'epic', target: 'SINGLE', shatter: true, colorHex: '#FBBF24', icon: '☀️' }),
  designCard({ templateId: 'press_sanctuary', name: 'Arcane Scepter', exercise: 'OVERHEAD_PRESS', reps: 3, rarity: 'rare', target: 'SINGLE', blockShare: 0.6, colorHex: '#60A5FA', icon: '✨' }),

  // CLEAN & PRESS: heavy, slow and brutal. Armor-breaking and line-clearing.
  designCard({ templateId: 'clean_breaker', name: 'Anvil Breaker', exercise: 'CLEAN_AND_PRESS', reps: 4, rarity: 'rare', target: 'SINGLE', shatter: true, blockShare: 0.2, colorHex: '#F97316', icon: '💥' }),
  designCard({ templateId: 'clean_stormbreaker', name: 'Stormbreaker Cleaver', exercise: 'CLEAN_AND_PRESS', reps: 6, rarity: 'epic', target: 'PIERCE', stagger: 1, colorHex: '#EA580C', icon: '⚡' }),

  // SNATCH: the most explosive lift. A dive onto the back row and the biggest single hit in the game.
  designCard({ templateId: 'snatch_phoenix', name: 'Phoenix Ascension', exercise: 'SNATCH', reps: 5, rarity: 'rare', target: 'BACK', colorHex: '#EF4444', icon: '🔥' }),
  designCard({ templateId: 'snatch_solar', name: 'Solar Talon', exercise: 'SNATCH', reps: 8, rarity: 'legendary', target: 'SINGLE', stagger: 2, colorHex: '#B91C1C', icon: '🦅' }),

  // WINDMILL: slow and controlled. Defensive, with healing.
  designCard({ templateId: 'windmill_astral', name: 'Astral Spire', exercise: 'WINDMILL', reps: 3, rarity: 'rare', target: 'SINGLE', blockShare: 0.65, colorHex: '#00EB88', icon: '🌌' }),
  designCard({ templateId: 'windmill_cosmic', name: 'Cosmic Ward', exercise: 'WINDMILL', reps: 5, rarity: 'epic', target: 'SINGLE', blockShare: 0.55, healShare: 0.25, colorHex: '#10B981', icon: '🛡️' }),

  // DEADLIFT: rooted strength. Sustain, and a legendary armor-breaking line attack.
  designCard({ templateId: 'deadlift_colossus', name: 'Root of Titans', exercise: 'DEADLIFT', reps: 5, rarity: 'common', target: 'SINGLE', blockShare: 0.55, healShare: 0.2, colorHex: '#84CC16', icon: '🌲' }),
  designCard({ templateId: 'deadlift_sunder', name: 'Mountain Sunder', exercise: 'DEADLIFT', reps: 7, rarity: 'legendary', target: 'PIERCE', shatter: true, colorHex: '#D97706', icon: '⛰️' }),

  // THRUSTER: full-body and exhausting. A meteor onto the back row and the strongest AOE.
  designCard({ templateId: 'thruster_eruption', name: 'Solar Eruption', exercise: 'THRUSTER', reps: 4, rarity: 'rare', target: 'BACK', blockShare: 0.15, colorHex: '#F59E0B', icon: '☄️' }),
  designCard({ templateId: 'thruster_supernova', name: 'Supernova Surge', exercise: 'THRUSTER', reps: 6, rarity: 'epic', target: 'ALL', colorHex: '#D97706', icon: '🌟' }),

  // GORILLA ROW: tearing, alternating pulls. A flurry that spreads across the pack.
  designCard({ templateId: 'row_beast_maw', name: 'Beast Maw', exercise: 'GORILLA_ROW', reps: 5, rarity: 'common', target: 'SINGLE', blockShare: 0.2, colorHex: '#84CC16', icon: '🦍' }),
  designCard({ templateId: 'row_shadow_ripper', name: 'Shadow Ripper', exercise: 'GORILLA_ROW', reps: 8, rarity: 'rare', target: 'CHAIN', hits: 4, colorHex: '#65A30D', icon: '🗡️' }),

  // HALO: mobility. Protection, healing, and a vortex that slows every foe.
  designCard({ templateId: 'halo_barrier', name: 'Celestial Barrier', exercise: 'HALO', reps: 4, rarity: 'rare', target: 'SINGLE', blockShare: 0.75, healShare: 0.25, colorHex: '#818CF8', icon: '💫' }),
  designCard({ templateId: 'halo_vortex', name: 'Astral Vortex', exercise: 'HALO', reps: 5, rarity: 'epic', target: 'ALL', stagger: 1, blockShare: 0.3, colorHex: '#C084FC', icon: '🌀' }),

  // SINGLE-LEG RDL: balance and precision. Guarded strikes and a precise armor-piercing reach.
  designCard({ templateId: 'rdl_valkyrie', name: 'Valkyrie Balance', exercise: 'SINGLE_LEG_RDL', reps: 4, rarity: 'rare', target: 'SINGLE', blockShare: 0.55, colorHex: '#EC4899', icon: '🕊️' }),
  designCard({ templateId: 'rdl_crane', name: 'Crane Strike', exercise: 'SINGLE_LEG_RDL', reps: 6, rarity: 'epic', target: 'BACK', shatter: true, colorHex: '#DB2777', icon: '🦩' }),

  // CLEAN (new): snapping hip drive. An interrupting uppercut and a ricocheting bell.
  designCard({ templateId: 'clean_uppercut', name: 'Iron Uppercut', exercise: 'CLEAN', reps: 4, rarity: 'common', target: 'SINGLE', stagger: 1.5, colorHex: '#FB923C', icon: '👊' }),
  designCard({ templateId: 'clean_ricochet', name: 'Ricochet Bell', exercise: 'CLEAN', reps: 6, rarity: 'rare', target: 'CHAIN', hits: 3, colorHex: '#FACC15', icon: '🔔' }),

  // LUNGE (new): stepping strikes. A spear thrust through the line and a shielded advance.
  designCard({ templateId: 'lunge_lancer', name: "Lancer's Lunge", exercise: 'LUNGE', reps: 4, rarity: 'common', target: 'PIERCE', colorHex: '#22D3EE', icon: '🔱' }),
  designCard({ templateId: 'lunge_vanguard', name: 'Vanguard Step', exercise: 'LUNGE', reps: 5, rarity: 'rare', target: 'SINGLE', blockShare: 0.4, stagger: 1, colorHex: '#94A3B8', icon: '🛡️' }),
];

export const MONSTER_CATALOG: Omit<MonsterState, 'currentHp' | 'block' | 'intent'>[] = [
  {
    id: 'green_slime',
    name: 'GREEN SLIME',
    title: 'DUNGEON OOZE',
    maxHp: 140,
    level: 5,
    spriteType: 'SLIME',
  },
  {
    id: 'boar',
    name: 'RAZORBACK BOAR',
    title: 'TUSKED CHARGER',
    maxHp: 170,
    level: 6,
    spriteType: 'BOAR',
  },
  {
    id: 'wolf',
    name: 'SHADOW WOLF',
    title: 'NOCTURNAL PREDATOR',
    maxHp: 160,
    level: 7,
    spriteType: 'WOLF',
  },
  {
    id: 'treemon',
    name: 'TREEMON',
    title: 'ROOTBOUND GUARDIAN',
    maxHp: 210,
    level: 8,
    spriteType: 'TREEMON',
  },
  {
    id: 'demon_monk',
    name: 'DEMON MONK',
    title: 'CORRUPTED ACOLYTE',
    maxHp: 220,
    level: 10,
    spriteType: 'DEMON_MONK',
  },
  {
    id: 'hellhound',
    name: 'HELLHOUND',
    title: 'TWO-HEADED HOUND',
    maxHp: 260,
    level: 12,
    spriteType: 'HELLHOUND',
  },
  { id: 'bat', name: 'CAVE BAT', title: 'NIGHT STALKER', maxHp: 100, level: 3, spriteType: 'BAT' },
  { id: 'goblin', name: 'GOBLIN SCOUT', title: 'WOODLAND THIEF', maxHp: 120, level: 4, spriteType: 'GOBLIN' },
  { id: 'mushroom', name: 'SPORE MUSHROOM', title: 'TOXIC FUNGUS', maxHp: 130, level: 4, spriteType: 'MUSHROOM' },
  { id: 'ghost', name: 'RESTLESS GHOST', title: 'HAUNTING SPECTER', maxHp: 130, level: 5, spriteType: 'GHOST' },
  { id: 'giant_spider', name: 'BROOD SPIDER', title: 'WEB WEAVER', maxHp: 150, level: 5, spriteType: 'GIANT_SPIDER' },
  { id: 'skeleton_archer', name: 'SKELETON ARCHER', title: 'CRYPT MARKSMAN', maxHp: 140, level: 6, spriteType: 'SKELETON_ARCHER' },
  { id: 'skeleton_warrior', name: 'SKELETON WARRIOR', title: 'UNDYING FOOTMAN', maxHp: 160, level: 6, spriteType: 'SKELETON_WARRIOR' },
  { id: 'harpy', name: 'CLIFF HARPY', title: 'WINGED SCREAMER', maxHp: 150, level: 7, spriteType: 'HARPY' },
  { id: 'lizardman', name: 'LIZARDMAN SLAYER', title: 'SWAMP SKIRMISHER', maxHp: 180, level: 8, spriteType: 'LIZARDMAN' },
  { id: 'orc', name: 'ORC BERSERKER', title: 'SAVAGE WARRIOR', maxHp: 200, level: 8, spriteType: 'ORC' },
  { id: 'dark_mage', name: 'CORRUPTED MAGE', title: 'SHADOW CASTER', maxHp: 170, level: 9, spriteType: 'DARK_MAGE' },
  { id: 'water_elemental', name: 'WATER ELEMENTAL', title: 'TIDAL SURGE', maxHp: 210, level: 9, spriteType: 'WATER_ELEMENTAL' },
  { id: 'nightmare_stag', name: 'NIGHTMARE STAG', title: 'FOREST PHANTOM', maxHp: 190, level: 9, spriteType: 'NIGHTMARE_STAG' },
  { id: 'golem', name: 'STONE GOLEM', title: 'EARTHEN SENTINEL', maxHp: 240, level: 10, spriteType: 'GOLEM' },
  { id: 'vault_guardian', name: 'VAULT GUARDIAN', title: 'ARMORED AUTOMATON', maxHp: 250, level: 10, spriteType: 'VAULT_GUARDIAN' },
  { id: 'wraith', name: 'DUNGEON WRAITH', title: 'CHILLING PHANTASM', maxHp: 190, level: 10, spriteType: 'WRAITH' },
  { id: 'gargoyle', name: 'STONE GARGOYLE', title: 'RAMPART DEFENDER', maxHp: 230, level: 11, spriteType: 'GARGOYLE' },
  { id: 'dark_knight', name: 'DARK KNIGHT', title: 'FALLEN CHAMPION', maxHp: 260, level: 11, spriteType: 'DARK_KNIGHT' },
  { id: 'minotaur', name: 'LABYRINTH MINOTAUR', title: 'HORNED CRUSHER', maxHp: 270, level: 12, spriteType: 'MINOTAUR' },
  { id: 'skeleton_knight', name: 'SKELETON KNIGHT', title: 'DREAD CAVALIER', maxHp: 250, level: 12, spriteType: 'SKELETON_KNIGHT' },
  { id: 'grave_colossus', name: 'GRAVE COLOSSUS', title: 'CORPSE TANK', maxHp: 290, level: 13, spriteType: 'GRAVE_COLOSSUS' },
  { id: 'void_prophet', name: 'VOID PROPHET', title: 'FORBIDDEN HERALD', maxHp: 240, level: 13, spriteType: 'VOID_PROPHET' },
  { id: 'troll', name: 'TROLL WARLORD', title: 'REGENERATING BRUTE', maxHp: 300, level: 13, spriteType: 'TROLL' },
  { id: 'bone_golem', name: 'BONE GOLEM', title: 'OSSEOUS MONSTROSITY', maxHp: 310, level: 14, spriteType: 'BONE_GOLEM' },
  { id: 'ancient_treant', name: 'ANCIENT TREANT', title: 'ELDER OF THE GROVE', maxHp: 320, level: 14, spriteType: 'ANCIENT_TREANT' },
  { id: 'crypt_lord', name: 'CRYPT LORD', title: 'LICH ARCHMAGE', maxHp: 340, level: 15, spriteType: 'CRYPT_LORD' },
  { id: 'kraken', name: 'ABYSSAL KRAKEN', title: 'LEVIATHAN OF THE DEEP', maxHp: 350, level: 16, spriteType: 'KRAKEN' },
  { id: 'demon_archbishop', name: 'ARCHBISHOP OF ASH', title: 'HIGH INQUISITOR', maxHp: 360, level: 16, spriteType: 'DEMON_ARCHBISHOP' },
  { id: 'inferno_titan', name: 'INFERNO TITAN', title: 'COLOSSUS OF FLAME', maxHp: 380, level: 17, spriteType: 'INFERNO_TITAN' },
  { id: 'dark_emperor', name: 'DARK EMPEROR', title: 'SOVEREIGN OF RUIN', maxHp: 400, level: 18, spriteType: 'DARK_EMPEROR' },
  { id: 'magma_dragon', name: 'MAGMA DRAGON', title: 'SCORCHED WYRM', maxHp: 420, level: 19, spriteType: 'MAGMA_DRAGON' },
  { id: 'eldritch_horror', name: 'ELDRITCH HORROR', title: 'CTHULHU INCARNATE', maxHp: 450, level: 20, spriteType: 'ELDRITCH_HORROR' },
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
  { id: 'solo_bat', name: 'Cave Stalker', description: 'A giant cave bat drops silently from the cavern ceiling.', monsterIds: ['bat'] },
  { id: 'solo_goblin', name: 'Goblin Scout', description: 'A sneaky goblin scout waving a jagged blade.', monsterIds: ['goblin'] },
  { id: 'solo_orc', name: 'Orc Berserker', description: 'A towering greenskin warrior hungry for combat.', monsterIds: ['orc'] },
  { id: 'solo_skeleton_warrior', name: 'Undying Sentry', description: 'A reanimated skeleton soldier guarding an ancient crypt.', monsterIds: ['skeleton_warrior'] },
  { id: 'solo_golem', name: 'Stone Colossus', description: 'A heavy ancient stone sentinel grinding to life.', monsterIds: ['golem'] },
  { id: 'solo_troll', name: 'Troll Warlord', description: 'A savage regenerative brute wielding an entire tree trunk.', monsterIds: ['troll'] },
  { id: 'solo_bone_golem', name: 'Bone Monstrosity', description: 'A horrific amalgamation of fused skeletons.', monsterIds: ['bone_golem'] },
  { id: 'solo_crypt_lord', name: 'Crypt Lich', description: 'An undying archmage wielding frost and necrotic curses.', monsterIds: ['crypt_lord'] },
  { id: 'solo_kraken', name: 'Abyssal Terror', description: 'A leviathan from the deep cistern waters.', monsterIds: ['kraken'] },
  { id: 'solo_magma_dragon', name: 'Scorched Wyrm', description: 'A terrifying dragon bathed in flowing lava.', monsterIds: ['magma_dragon'] },
  { id: 'solo_dark_emperor', name: 'Sovereign of Ruin', description: 'The dark emperor clad in shadowed plate armor.', monsterIds: ['dark_emperor'] },
  { id: 'solo_eldritch_horror', name: 'Cthulhu Incarnate', description: 'An ancient dread god that defies comprehension.', monsterIds: ['eldritch_horror'] },

  // 2-Monsters (Duo Encounters)
  { id: 'duo_slimes', name: 'Twin Slimes', description: 'Two corrosive oozes working in tandem.', monsterIds: ['green_slime', 'green_slime'] },
  { id: 'wolf_pack', name: 'Twin Shadow Wolves', description: 'Two cunning wolves flanking from both sides.', monsterIds: ['wolf', 'wolf'] },
  { id: 'wild_stampede', name: 'Wild Beasts', description: 'A rampaging boar charged alongside a shadow wolf.', monsterIds: ['boar', 'wolf'] },
  { id: 'forest_ambush', name: 'Forest Guardians', description: 'A Treemon flanked by a toxic forest slime.', monsterIds: ['treemon', 'green_slime'] },
  { id: 'unholy_covenant', name: 'Unholy Covenant', description: 'A Demon Monk chanting behind a giant Treemon.', monsterIds: ['treemon', 'demon_monk'] },
  { id: 'hound_pack', name: 'Hounds of Fire & Ooze', description: 'A ferocious Hellhound supported by a dungeon slime.', monsterIds: ['hellhound', 'green_slime'] },
  { id: 'iron_tusks_fire', name: 'Tusks of Hellfire', description: 'A brutal duo: Hellhound and Razorback Boar!', monsterIds: ['hellhound', 'boar'] },
  { id: 'crypt_duo', name: 'Grave Watchers', description: 'A Skeleton Warrior backed by a Skeleton Archer.', monsterIds: ['skeleton_warrior', 'skeleton_archer'] },
  { id: 'orc_and_goblin', name: 'Raiding Duo', description: 'A berserk Orc backed by a shifty Goblin Scout.', monsterIds: ['orc', 'goblin'] },
  { id: 'winged_nightmares', name: 'Sky Terrors', description: 'A Cliff Harpy and a Stone Gargoyle dive from above.', monsterIds: ['gargoyle', 'harpy'] },

  // 3-Monsters (Trio Encounters)
  { id: 'slime_swarm', name: 'Ooze Swarm', description: 'A triple swarm of hungry dungeon slimes!', monsterIds: ['green_slime', 'green_slime', 'green_slime'] },
  { id: 'wolf_hunting_pack', name: 'Wolf Hunting Pack', description: 'Three coordinated shadow wolves hunting in the gloom.', monsterIds: ['wolf', 'wolf', 'wolf'] },
  { id: 'beast_stampede', name: 'Woodland Stampede', description: 'Two heavy boars led by a fierce shadow wolf.', monsterIds: ['boar', 'wolf', 'boar'] },
  { id: 'forest_trio', name: 'Sylvan Syndicate', description: 'A fortified Treemon supported by two stinging slimes.', monsterIds: ['green_slime', 'treemon', 'green_slime'] },
  { id: 'demonic_conclave', name: 'Demonic Conclave', description: 'A Demon Monk casting from behind a Hellhound and an acid slime.', monsterIds: ['hellhound', 'demon_monk', 'green_slime'] },
  { id: 'undead_trio', name: 'Catacomb Vanguard', description: 'Skeleton Warrior and Skeleton Archer led by a Dark Knight.', monsterIds: ['skeleton_warrior', 'dark_knight', 'skeleton_archer'] },
  { id: 'boss_trio', name: 'The Dread Menagerie', description: 'A legendary trio: Treemon and Hellhound guard a Demon Monk!', monsterIds: ['treemon', 'demon_monk', 'hellhound'] },
  { id: 'abyssal_trio', name: 'Abyssal Lords', description: 'Bone Golem and Crypt Lord guarding the Void Prophet!', monsterIds: ['bone_golem', 'void_prophet', 'crypt_lord'] },
];
