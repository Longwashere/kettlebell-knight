import { BattleMapId, CARD_CATALOG, CardTemplate, STARTER_CARD_IDS } from '../types/battle';
import { ExerciseType } from '../types/game';
import { WEAPON_SPELLS } from '../types/weaponSpells';
import type { PlayerProfile } from './ProfileManager';

export type UnlockCategory = 'MONSTER_ART' | 'MARTIAL_DISCIPLINE' | 'WEAPON_SPELL';

export type UnlockConditionType =
  | 'MONSTER_KILL'       // Slay target monster(s) N times (with optional drop rate)
  | 'EXERCISE_REPS'      // Complete N total reps of an exercise
  | 'MAP_EXERCISE'       // Complete N reps of an exercise in a specific realm/map
  | 'PERFECT_FORM'       // Complete N reps with >= 85% form score
  | 'HIGH_POWER'         // Complete N reps with >= 80 power (or peak power feat)
  | 'MAP_CLEAR'          // Clear a specific level of a map
  | 'DAMAGE_BLOCKED'     // Total damage absorbed by shields
  | 'WEAPON_EQUIPPED';   // Unlocked while granting weapon is equipped

export interface MonsterKillCondition {
  type: 'MONSTER_KILL';
  monsterIds: string[];         // e.g. ['bat'] or ['sewer_lurker', 'water_elemental']
  requiredKills: number;        // Guaranteed unlock at N kills
  dropChance?: number;          // e.g. 0.35 (35% chance on each kill to unlock immediately)
  targetMonsterNames: string;   // e.g. "Cave Bats"
}

export interface ExerciseRepsCondition {
  type: 'EXERCISE_REPS';
  exercise: ExerciseType;
  requiredReps: number;
}

export interface MapExerciseCondition {
  type: 'MAP_EXERCISE';
  exercise: ExerciseType;
  mapIds: BattleMapId[];
  mapNames: string;             // e.g. "Volcanic Forge"
  requiredReps: number;
}

export interface PerfectFormCondition {
  type: 'PERFECT_FORM';
  exercise: ExerciseType;
  requiredReps: number;
  minForm: number;              // e.g. 0.85
}

export interface HighPowerCondition {
  type: 'HIGH_POWER';
  exercise: ExerciseType;
  requiredReps?: number;        // e.g. 10 reps with high power
  minPower: number;             // e.g. 80
  peakPowerFeat?: number;       // e.g. single rep with 90+ power unlocks immediately
}

export interface MapClearCondition {
  type: 'MAP_CLEAR';
  mapId: BattleMapId;
  mapName: string;
  minLevel: number;
}

export interface DamageBlockedCondition {
  type: 'DAMAGE_BLOCKED';
  requiredBlocked: number;
}

export interface WeaponEquippedCondition {
  type: 'WEAPON_EQUIPPED';
  weaponId: string;
  weaponName: string;
}

export type CardUnlockCondition =
  | MonsterKillCondition
  | ExerciseRepsCondition
  | MapExerciseCondition
  | PerfectFormCondition
  | HighPowerCondition
  | MapClearCondition
  | DamageBlockedCondition
  | WeaponEquippedCondition;

export interface CardUnlockDef {
  cardId: string; // matches CardTemplate.templateId
  name: string;
  category: UnlockCategory;
  lore: string;
  requirementText: string;
  dropRateText?: string;
  condition: CardUnlockCondition;
}

/** Master registry of all thematic card unlocks in Kettlebell Knight. */
export const CARD_UNLOCK_REGISTRY: Record<string, CardUnlockDef> = {
  // =========================================================================
  // 1. MONSTER ARTS (Techniques harvested / learned from the Bestiary)
  // =========================================================================

  art_echo_shriek: {
    cardId: 'art_echo_shriek',
    name: 'Echo Shriek',
    category: 'MONSTER_ART',
    lore: 'Learned by enduring the sonic echolocation pulses of nocturnal cavern bats, redirecting vocal resonance into deadlift drive.',
    requirementText: 'Slay 4 Cave Bats (or 35% drop on kill)',
    dropRateText: '35% drop rate',
    condition: {
      type: 'MONSTER_KILL',
      monsterIds: ['bat'],
      requiredKills: 4,
      dropChance: 0.35,
      targetMonsterNames: 'Cave Bats',
    },
  },

  art_dirty_trick: {
    cardId: 'art_dirty_trick',
    name: 'Dirty Trick',
    category: 'MONSTER_ART',
    lore: 'Stolen from woodland goblin scouts who kick grit beneath knightly visors before delivering a stinging overhead blow.',
    requirementText: 'Slay 5 Goblin Scouts (or 40% drop on kill)',
    dropRateText: '40% drop rate',
    condition: {
      type: 'MONSTER_KILL',
      monsterIds: ['goblin'],
      requiredKills: 5,
      dropChance: 0.4,
      targetMonsterNames: 'Goblin Scouts',
    },
  },

  art_rattle_back: {
    cardId: 'art_rattle_back',
    name: 'Rattle Back',
    category: 'MONSTER_ART',
    lore: 'Studied from the undying legionnaires of crypt floors whose severed ribcages snap violently back into defensive formation.',
    requirementText: 'Slay 4 Skeleton Warriors (or 35% drop on kill)',
    dropRateText: '35% drop rate',
    condition: {
      type: 'MONSTER_KILL',
      monsterIds: ['skeleton_warrior'],
      requiredKills: 4,
      dropChance: 0.35,
      targetMonsterNames: 'Skeleton Warriors',
    },
  },

  art_wisp_lure: {
    cardId: 'art_wisp_lure',
    name: "Will-o'-Lure",
    category: 'MONSTER_ART',
    lore: 'Distilled spectral phosphorus that pulls wandering back-row cowards straight into your revolving halo strike radius.',
    requirementText: 'Slay 3 Lantern Wisps (or 40% drop on kill)',
    dropRateText: '40% drop rate',
    condition: {
      type: 'MONSTER_KILL',
      monsterIds: ['lantern_wisp'],
      requiredKills: 3,
      dropChance: 0.4,
      targetMonsterNames: 'Lantern Wisps',
    },
  },

  art_banshee_step: {
    cardId: 'art_banshee_step',
    name: 'Banshee Step',
    category: 'MONSTER_ART',
    lore: 'An eerie ethereal drift whispered by phantoms, allowing the knight to phase through the frontline and strike rear casters.',
    requirementText: 'Slay 3 Restless Ghosts (or 30% drop on kill)',
    dropRateText: '30% drop rate',
    condition: {
      type: 'MONSTER_KILL',
      monsterIds: ['ghost'],
      requiredKills: 3,
      dropChance: 0.3,
      targetMonsterNames: 'Restless Ghosts',
    },
  },

  art_bone_volley: {
    cardId: 'art_bone_volley',
    name: 'Bone Volley',
    category: 'MONSTER_ART',
    lore: 'Crypt marksman technique hurling splintered rib-fletched projectiles in a whistling chain across the enemy squad.',
    requirementText: 'Slay 4 Skeleton Archers (or 30% drop on kill)',
    dropRateText: '30% drop rate',
    condition: {
      type: 'MONSTER_KILL',
      monsterIds: ['skeleton_archer'],
      requiredKills: 4,
      dropChance: 0.3,
      targetMonsterNames: 'Skeleton Archers',
    },
  },

  art_carapace_roll: {
    cardId: 'art_carapace_roll',
    name: 'Carapace Roll',
    category: 'MONSTER_ART',
    lore: 'Mimics the rolling iron bowling-ball momentum of giant beetles, tucking behind steel to bowl clean through armor.',
    requirementText: 'Slay 3 Giant Beetles (or 30% drop on kill)',
    dropRateText: '30% drop rate',
    condition: {
      type: 'MONSTER_KILL',
      monsterIds: ['giant_beetle'],
      requiredKills: 3,
      dropChance: 0.3,
      targetMonsterNames: 'Giant Beetles',
    },
  },

  art_undertow: {
    cardId: 'art_undertow',
    name: 'Undertow',
    category: 'MONSTER_ART',
    lore: 'Harvested from the deep cistern predators, channeling subterranean sewer currents to drag foes through one another.',
    requirementText: 'Slay 2 Sewer Lurkers or Water Elementals (or 30% drop)',
    dropRateText: '30% drop rate',
    condition: {
      type: 'MONSTER_KILL',
      monsterIds: ['sewer_lurker', 'water_elemental'],
      requiredKills: 2,
      dropChance: 0.3,
      targetMonsterNames: 'Sewer Lurkers or Water Elementals',
    },
  },

  art_tombstone_heave: {
    cardId: 'art_tombstone_heave',
    name: 'Tombstone Heave',
    category: 'MONSTER_ART',
    lore: 'Raw graveyard brute force uprooting granite sarcophagus slabs from cathedral dirt and hurling them at rear sentries.',
    requirementText: 'Slay 2 Grave Colossi or 1 Crypt Lord (or 25% drop)',
    dropRateText: '25% drop rate',
    condition: {
      type: 'MONSTER_KILL',
      monsterIds: ['grave_colossus', 'crypt_lord'],
      requiredKills: 2,
      dropChance: 0.25,
      targetMonsterNames: 'Grave Colossi or Crypt Lords',
    },
  },

  art_troll_blood: {
    cardId: 'art_troll_blood',
    name: 'Troll Blood',
    category: 'MONSTER_ART',
    lore: 'Boiling hyper-regenerative ichor harvested from troll warlords. Deep squatting drives fresh blood through shattered flesh.',
    requirementText: 'Slay 2 Troll Warlords (or 30% drop on kill)',
    dropRateText: '30% drop rate',
    condition: {
      type: 'MONSTER_KILL',
      monsterIds: ['troll'],
      requiredKills: 2,
      dropChance: 0.3,
      targetMonsterNames: 'Troll Warlords',
    },
  },

  art_needle_burst: {
    cardId: 'art_needle_burst',
    name: 'Needle Burst',
    category: 'MONSTER_ART',
    lore: 'Volatile barbed thorn needles gathered from briar stalkers, discharging a four-hit chain upon hitting bottom squat depth.',
    requirementText: 'Slay 4 Spore Mushrooms or Thorn Stalkers (or 30% drop)',
    dropRateText: '30% drop rate',
    condition: {
      type: 'MONSTER_KILL',
      monsterIds: ['mushroom', 'thorn_stalker'],
      requiredKills: 4,
      dropChance: 0.3,
      targetMonsterNames: 'Spore Mushrooms or Thorn Stalkers',
    },
  },

  art_pincer_crack: {
    cardId: 'art_pincer_crack',
    name: 'Pincer Crack',
    category: 'MONSTER_ART',
    lore: 'The devastating hydraulic vice pressure of giant tidal crabs, snapping cleanly upward to shatter reinforced enemy block.',
    requirementText: 'Slay 3 Giant Crabs (or 35% drop on kill)',
    dropRateText: '35% drop rate',
    condition: {
      type: 'MONSTER_KILL',
      monsterIds: ['giant_crab'],
      requiredKills: 3,
      dropChance: 0.35,
      targetMonsterNames: 'Giant Crabs',
    },
  },

  art_tail_sweep: {
    cardId: 'art_tail_sweep',
    name: 'Tail Sweep',
    category: 'MONSTER_ART',
    lore: 'Unilateral serpentine whip perfected by observing reptilian marsh hunters, sweeping low to pierce armored formations.',
    requirementText: 'Slay 3 Lizardmen or Ember Serpents (or 30% drop)',
    dropRateText: '30% drop rate',
    condition: {
      type: 'MONSTER_KILL',
      monsterIds: ['lizardman', 'ember_serpent'],
      requiredKills: 3,
      dropChance: 0.3,
      targetMonsterNames: 'Lizardmen or Ember Serpents',
    },
  },

  art_berserker_rush: {
    cardId: 'art_berserker_rush',
    name: 'Berserker Rush',
    category: 'MONSTER_ART',
    lore: 'Unchecked savage fury harnessed from orc raiders, transforming thruster fatigue into a blood-fueled three-strike frenzy.',
    requirementText: 'Slay 4 Orc Berserkers (or 25% drop on kill)',
    dropRateText: '25% drop rate',
    condition: {
      type: 'MONSTER_KILL',
      monsterIds: ['orc'],
      requiredKills: 4,
      dropChance: 0.25,
      targetMonsterNames: 'Orc Berserkers',
    },
  },

  art_moonlit_leap: {
    cardId: 'art_moonlit_leap',
    name: 'Moonlit Leap',
    category: 'MONSTER_ART',
    lore: 'A silent starry bound through moonlit canopy mists, stepping clean past front shields to stagger vulnerable back-row targets.',
    requirementText: 'Slay 2 Nightmare Stags (or 25% drop on kill)',
    dropRateText: '25% drop rate',
    condition: {
      type: 'MONSTER_KILL',
      monsterIds: ['nightmare_stag'],
      requiredKills: 2,
      dropChance: 0.25,
      targetMonsterNames: 'Nightmare Stags',
    },
  },

  art_stone_skin: {
    cardId: 'art_stone_skin',
    name: 'Stone Skin',
    category: 'MONSTER_ART',
    lore: 'Living granite resonance gifted to warriors who shatter the ancient rampart guardians, fortifying skin with 60% block share.',
    requirementText: 'Slay 2 Stone Golems or Stone Gargoyles (or 25% drop)',
    dropRateText: '25% drop rate',
    condition: {
      type: 'MONSTER_KILL',
      monsterIds: ['golem', 'gargoyle'],
      requiredKills: 2,
      dropChance: 0.25,
      targetMonsterNames: 'Stone Golems or Gargoyles',
    },
  },

  art_black_riposte: {
    cardId: 'art_black_riposte',
    name: 'Black Riposte',
    category: 'MONSTER_ART',
    lore: 'The forbidden defensive counter of fallen knights, pivoting under incoming impact into a devastating windmill riposte.',
    requirementText: 'Slay 2 Dark Knights (or 20% drop on kill)',
    dropRateText: '20% drop rate',
    condition: {
      type: 'MONSTER_KILL',
      monsterIds: ['dark_knight'],
      requiredKills: 2,
      dropChance: 0.2,
      targetMonsterNames: 'Dark Knights',
    },
  },

  art_life_leech: {
    cardId: 'art_life_leech',
    name: 'Life Leech',
    category: 'MONSTER_ART',
    lore: 'Dark necrotic sorcery extracted from corrupted acolytes, siphoning life force directly from the victim into the knight.',
    requirementText: 'Slay 2 Demon Monks or Wraiths (or 20% drop on kill)',
    dropRateText: '20% drop rate',
    condition: {
      type: 'MONSTER_KILL',
      monsterIds: ['demon_monk', 'wraith'],
      requiredKills: 2,
      dropChance: 0.2,
      targetMonsterNames: 'Demon Monks or Wraiths',
    },
  },

  art_grizzly_maul: {
    cardId: 'art_grizzly_maul',
    name: 'Grizzly Maul',
    category: 'MONSTER_ART',
    lore: 'The apex woodland maul of grove bears, combining clean-and-press drive with bone-splintering stagger force.',
    requirementText: 'Slay 3 Forest Bears (or 25% drop on kill)',
    dropRateText: '25% drop rate',
    condition: {
      type: 'MONSTER_KILL',
      monsterIds: ['forest_bear'],
      requiredKills: 3,
      dropChance: 0.25,
      targetMonsterNames: 'Forest Bears',
    },
  },

  art_phantom_cavalry: {
    cardId: 'art_phantom_cavalry',
    name: 'Phantom Cavalry',
    category: 'MONSTER_ART',
    lore: 'The horn call of fallen dread cavaliers, trampling across the entire enemy formation under a thunderous snatch lockout.',
    requirementText: 'Slay 2 Skeleton Knights (or 20% drop on kill)',
    dropRateText: '20% drop rate',
    condition: {
      type: 'MONSTER_KILL',
      monsterIds: ['skeleton_knight'],
      requiredKills: 2,
      dropChance: 0.2,
      targetMonsterNames: 'Skeleton Knights',
    },
  },

  // =========================================================================
  // 2. MARTIAL DISCIPLINES (Physical Milestones, Location Trials & Form Mastery)
  // =========================================================================

  // --- SWING ---
  swing_cleave: {
    cardId: 'swing_cleave',
    name: 'Iron Cleave',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'The foundation of the Iron Vanguard: sharp explosive hip extension slicing clean through front enemies.',
    requirementText: 'Complete 35 total Swings in battle',
    condition: {
      type: 'EXERCISE_REPS',
      exercise: 'SWING',
      requiredReps: 35,
    },
  },

  swing_whirlwind: {
    cardId: 'swing_whirlwind',
    name: 'Dragon Whirlwind',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'Kindled in the infernal heat of the forge, whipping continuous swing revolutions that engulf all enemies.',
    requirementText: 'Perform 20 Swings in the Volcanic Forge',
    condition: {
      type: 'MAP_EXERCISE',
      exercise: 'SWING',
      mapIds: ['VOLCANIC_FORGE'],
      mapNames: 'Volcanic Forge',
      requiredReps: 20,
    },
  },

  swing_flow: {
    cardId: 'swing_flow',
    name: 'Momentum Flow',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'A rhythmic pendulum where kinetic bell energy effortlessly transitions into defensive equilibrium.',
    requirementText: 'Perform 12 Swings with Perfect Form (≥85%)',
    condition: {
      type: 'PERFECT_FORM',
      exercise: 'SWING',
      minForm: 0.85,
      requiredReps: 12,
    },
  },

  // --- SQUAT ---
  squat_slam: {
    cardId: 'squat_slam',
    name: 'Titan Ground Slam',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'Sinking below parallel to erupt a seismic floor tremor that damages all combatants.',
    requirementText: 'Complete 30 total Squats in battle',
    condition: {
      type: 'EXERCISE_REPS',
      exercise: 'SQUAT',
      requiredReps: 30,
    },
  },

  squat_bastion: {
    cardId: 'squat_bastion',
    name: 'Aegis Fortress',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'Rooted immovably like cathedral pillars. Converts 100% of physical squat effort into an impervious wall of Block.',
    requirementText: 'Perform 15 Squats in Cathedral Crypt or Vault',
    condition: {
      type: 'MAP_EXERCISE',
      exercise: 'SQUAT',
      mapIds: ['CATHEDRAL_CRYPT', 'CATHEDRAL_VAULT'],
      mapNames: 'Cathedral Crypt or Vault',
      requiredReps: 15,
    },
  },

  squat_earthquake: {
    cardId: 'squat_earthquake',
    name: 'Colossus Quake',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'A cataclysmic subterranean quake that shakes the entire enemy formation, staggering foes for 1.5 seconds.',
    requirementText: 'Conquer Level 3 of Volcanic Forge or Obsidian Throne',
    condition: {
      type: 'MAP_CLEAR',
      mapId: 'VOLCANIC_FORGE',
      mapName: 'Volcanic Forge',
      minLevel: 3,
    },
  },

  // --- OVERHEAD PRESS ---
  press_smite: {
    cardId: 'press_smite',
    name: 'Thunder Smite',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'A strict vertical drive punching the bell toward the clouds, calling down lightning directly onto back-row enemies.',
    requirementText: 'Complete 30 total Overhead Presses in battle',
    condition: {
      type: 'EXERCISE_REPS',
      exercise: 'OVERHEAD_PRESS',
      requiredReps: 30,
    },
  },

  press_judgement: {
    cardId: 'press_judgement',
    name: 'Heavenly Pillar',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'A blinding pillar of radiant wrath that vaporizes armor and delivers an unblockable Shatter impact.',
    requirementText: 'Perform 15 Overhead Presses in Cathedral Vault',
    condition: {
      type: 'MAP_EXERCISE',
      exercise: 'OVERHEAD_PRESS',
      mapIds: ['CATHEDRAL_VAULT'],
      mapNames: 'Cathedral Vault',
      requiredReps: 15,
    },
  },

  press_sanctuary: {
    cardId: 'press_sanctuary',
    name: 'Arcane Scepter',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'Strict vertical stability casting a shimmering celestial ward that protects the knight while striking.',
    requirementText: 'Perform 12 Overhead Presses with Perfect Form (≥85%)',
    condition: {
      type: 'PERFECT_FORM',
      exercise: 'OVERHEAD_PRESS',
      minForm: 0.85,
      requiredReps: 12,
    },
  },

  // --- CLEAN & PRESS ---
  clean_breaker: {
    cardId: 'clean_breaker',
    name: 'Anvil Breaker',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'Compound floor-to-lockout force that crumples enemy armor on impact like iron upon an anvil.',
    requirementText: 'Complete 25 total Clean & Presses in battle',
    condition: {
      type: 'EXERCISE_REPS',
      exercise: 'CLEAN_AND_PRESS',
      requiredReps: 25,
    },
  },

  clean_stormbreaker: {
    cardId: 'clean_stormbreaker',
    name: 'Stormbreaker Cleaver',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'Forged high on the storm-swept Belfry ramparts; a cleaving lightning stroke that pierces front shields.',
    requirementText: 'Perform 15 Clean & Presses on Belfry Ramparts',
    condition: {
      type: 'MAP_EXERCISE',
      exercise: 'CLEAN_AND_PRESS',
      mapIds: ['BELFRY_RAMPARTS'],
      mapNames: 'Belfry Ramparts',
      requiredReps: 15,
    },
  },

  // --- SNATCH ---
  snatch_phoenix: {
    cardId: 'snatch_phoenix',
    name: 'Phoenix Ascension',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'A single unbroken ballistic pull soaring from floor to overhead lockout like the wings of a rising phoenix.',
    requirementText: 'Complete 25 total Snatches in battle',
    condition: {
      type: 'EXERCISE_REPS',
      exercise: 'SNATCH',
      requiredReps: 25,
    },
  },

  snatch_solar: {
    cardId: 'snatch_solar',
    name: 'Solar Talon',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'The supreme expression of explosive velocity: maximum drive power culminating in a crushing 2-second stagger.',
    requirementText: 'Achieve 85+ Peak Power on a Snatch rep (or 20 Snatches in Obsidian Throne)',
    condition: {
      type: 'HIGH_POWER',
      exercise: 'SNATCH',
      minPower: 85,
      peakPowerFeat: 85,
    },
  },

  // --- WINDMILL ---
  windmill_astral: {
    cardId: 'windmill_astral',
    name: 'Astral Spire',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'Thoracic flexibility and overhead equilibrium harmonized to manifest celestial barrier shields.',
    requirementText: 'Complete 20 total Windmills in battle',
    condition: {
      type: 'EXERCISE_REPS',
      exercise: 'WINDMILL',
      requiredReps: 20,
    },
  },

  windmill_cosmic: {
    cardId: 'windmill_cosmic',
    name: 'Cosmic Ward',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'Aligning body and cosmos amid the dark groves to simultaneously generate deep warding and restorative healing.',
    requirementText: 'Perform 12 Windmills in Dark Forest or Eldritch Altar',
    condition: {
      type: 'MAP_EXERCISE',
      exercise: 'WINDMILL',
      mapIds: ['DARK_FOREST', 'ELDRITCH_ALTAR'],
      mapNames: 'Dark Forest or Eldritch Altar',
      requiredReps: 12,
    },
  },

  // --- DEADLIFT ---
  deadlift_colossus: {
    cardId: 'deadlift_colossus',
    name: 'Root of Titans',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'Heels driven deep into the bedrock; drawing vital stamina and endurance straight up through the posterior chain.',
    requirementText: 'Complete 30 total Deadlifts in battle',
    condition: {
      type: 'EXERCISE_REPS',
      exercise: 'DEADLIFT',
      requiredReps: 30,
    },
  },

  deadlift_sunder: {
    cardId: 'deadlift_sunder',
    name: 'Mountain Sunder',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'Legendary deadlift power capable of sundering mountains and ripping straight through entire formations.',
    requirementText: 'Complete 50 total Deadlifts or conquer Level 5 of any map',
    condition: {
      type: 'EXERCISE_REPS',
      exercise: 'DEADLIFT',
      requiredReps: 50,
    },
  },

  // --- THRUSTER ---
  thruster_eruption: {
    cardId: 'thruster_eruption',
    name: 'Solar Eruption',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'Transferring bottom squat acceleration directly into an overhead solar mortar crashing onto back-row foes.',
    requirementText: 'Complete 25 total Thrusters in battle',
    condition: {
      type: 'EXERCISE_REPS',
      exercise: 'THRUSTER',
      requiredReps: 25,
    },
  },

  thruster_supernova: {
    cardId: 'thruster_supernova',
    name: 'Supernova Surge',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'Full-body metabolic combustion releasing a searing supernova shockwave across the entire battlefield.',
    requirementText: 'Complete 40 total Thrusters in battle',
    condition: {
      type: 'EXERCISE_REPS',
      exercise: 'THRUSTER',
      requiredReps: 40,
    },
  },

  // --- GORILLA ROW ---
  row_beast_maw: {
    cardId: 'row_beast_maw',
    name: 'Beast Maw',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'Hinged low, ripping the bell past the ribs with the predatory ferocity of an untamed woodland beast.',
    requirementText: 'Complete 25 total Gorilla Rows in battle',
    condition: {
      type: 'EXERCISE_REPS',
      exercise: 'GORILLA_ROW',
      requiredReps: 25,
    },
  },

  row_shadow_ripper: {
    cardId: 'row_shadow_ripper',
    name: 'Shadow Ripper',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'A furious four-strike alternating pull tearing through the subterranean shadows of the cistern.',
    requirementText: 'Perform 15 Gorilla Rows in Sunken Cistern or Dark Forest',
    condition: {
      type: 'MAP_EXERCISE',
      exercise: 'GORILLA_ROW',
      mapIds: ['SUNKEN_CISTERN', 'DARK_FOREST'],
      mapNames: 'Sunken Cistern or Dark Forest',
      requiredReps: 15,
    },
  },

  // --- AROUND-THE-BODY PASS ---
  halo_barrier: {
    cardId: 'halo_barrier',
    name: 'Celestial Barrier',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'Weaving a continuous orbital pass around the waist, creating an impenetrable defensive field.',
    requirementText: 'Complete 25 total Around-the-Body Passes in battle',
    condition: {
      type: 'EXERCISE_REPS',
      exercise: 'AROUND_THE_BODY',
      requiredReps: 25,
    },
  },

  halo_vortex: {
    cardId: 'halo_vortex',
    name: 'Astral Vortex',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'Spinning an atmospheric gravitational vortex around the torso that warps airflow, disorienting and slowing all enemies.',
    requirementText: 'Perform 15 Around-the-Body Passes on Belfry Ramparts or Eldritch Altar',
    condition: {
      type: 'MAP_EXERCISE',
      exercise: 'AROUND_THE_BODY',
      mapIds: ['BELFRY_RAMPARTS', 'ELDRITCH_ALTAR'],
      mapNames: 'Belfry Ramparts or Eldritch Altar',
      requiredReps: 15,
    },
  },

  // --- SINGLE-LEG RDL ---
  rdl_valkyrie: {
    cardId: 'rdl_valkyrie',
    name: 'Valkyrie Balance',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'Poised upon a single foot like a descending valkyrie, channeling pure stability into kinetic deflection.',
    requirementText: 'Complete 20 total Single-Leg RDLs in battle',
    condition: {
      type: 'EXERCISE_REPS',
      exercise: 'SINGLE_LEG_RDL',
      requiredReps: 20,
    },
  },

  rdl_crane: {
    cardId: 'rdl_crane',
    name: 'Crane Strike',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'Surgical unilateral precision striking directly past frontlines to shatter the armor of rear commanders.',
    requirementText: 'Perform 10 Single-Leg RDLs with Perfect Form (≥85%)',
    condition: {
      type: 'PERFECT_FORM',
      exercise: 'SINGLE_LEG_RDL',
      minForm: 0.85,
      requiredReps: 10,
    },
  },

  // --- CLEAN ---
  clean_uppercut: {
    cardId: 'clean_uppercut',
    name: 'Iron Uppercut',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'Violent hip extension driving the bell upward in an unstoppable chin-cracking uppercut.',
    requirementText: 'Complete 25 total Cleans in battle',
    condition: {
      type: 'EXERCISE_REPS',
      exercise: 'CLEAN',
      requiredReps: 25,
    },
  },

  clean_ricochet: {
    cardId: 'clean_ricochet',
    name: 'Ricochet Bell',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'Rebounding the bell off stone walls and iron shields in an erratic three-hit ricocheting arc.',
    requirementText: 'Perform 15 Cleans in Cathedral Crypt or Sunken Cistern',
    condition: {
      type: 'MAP_EXERCISE',
      exercise: 'CLEAN',
      mapIds: ['CATHEDRAL_CRYPT', 'SUNKEN_CISTERN'],
      mapNames: 'Cathedral Crypt or Sunken Cistern',
      requiredReps: 15,
    },
  },

  // --- LUNGE ---
  lunge_lancer: {
    cardId: 'lunge_lancer',
    name: "Lancer's Lunge",
    category: 'MARTIAL_DISCIPLINE',
    lore: 'Stepping forward into a low lunge with spear-like kinetic speed that pierces through frontline foes.',
    requirementText: 'Complete 25 total Lunges in battle',
    condition: {
      type: 'EXERCISE_REPS',
      exercise: 'LUNGE',
      requiredReps: 25,
    },
  },

  lunge_vanguard: {
    cardId: 'lunge_vanguard',
    name: 'Vanguard Step',
    category: 'MARTIAL_DISCIPLINE',
    lore: 'The disciplined advance of the Royal Vanguard, stepping into enemy fire while maintaining iron guard.',
    requirementText: 'Perform 15 Lunges in Verdant Forest or Blood Cemetery',
    condition: {
      type: 'MAP_EXERCISE',
      exercise: 'LUNGE',
      mapIds: ['VERDANT_FOREST', 'BLOOD_CEMETERY'],
      mapNames: 'Verdant Forest or Blood Cemetery',
      requiredReps: 15,
    },
  },
};

/**
 * Checks which non-starter cards should be unlocked given the player's profile and recent actions.
 * Returns newly unlocked CardUnlockDefs and updated profile data.
 */
export function evaluateCardUnlocks(
  profile: PlayerProfile,
  context?: {
    slainMonsterIds?: string[];
    slainMonsterSprites?: string[];
    currentMapId?: BattleMapId;
    currentLevel?: number;
    completedExercise?: ExerciseType;
    repPower?: number;
    repForm?: number;
  }
): {
  newlyUnlocked: CardUnlockDef[];
  updatedUnlockedCards: string[];
} {
  const currentUnlocked = new Set<string>(profile.unlockedCards || STARTER_CARD_IDS);
  const newlyUnlocked: CardUnlockDef[] = [];
  const stats = profile.unlockStats || {
    monsterKills: {},
    exerciseReps: {},
    mapExerciseReps: {},
    perfectFormReps: {},
    highPowerReps: {},
    peakPower: {},
    totalBlockedDamage: 0,
  };

  for (const def of Object.values(CARD_UNLOCK_REGISTRY)) {
    if (currentUnlocked.has(def.cardId)) continue;

    let satisfied = false;
    const cond = def.condition;

    switch (cond.type) {
      case 'MONSTER_KILL': {
        // Total kills count across matching monster IDs
        const totalKills = cond.monsterIds.reduce((sum, id) => sum + (stats.monsterKills[id.toLowerCase()] || 0), 0);
        if (totalKills >= cond.requiredKills) {
          satisfied = true;
        } else if (cond.dropChance && context?.slainMonsterIds?.length) {
          // Check if any matching monster was slain in this tick and rolls lucky drop!
          const matchSlain = context.slainMonsterIds.some((id) =>
            cond.monsterIds.some((m) => m.toLowerCase() === id.toLowerCase())
          );
          if (matchSlain && Math.random() < cond.dropChance) {
            satisfied = true;
          }
        }
        break;
      }

      case 'EXERCISE_REPS': {
        const reps = stats.exerciseReps[cond.exercise] || 0;
        if (reps >= cond.requiredReps) satisfied = true;
        break;
      }

      case 'MAP_EXERCISE': {
        let totalMapReps = 0;
        for (const mapId of cond.mapIds) {
          const mapData = stats.mapExerciseReps[mapId];
          if (mapData && mapData[cond.exercise]) {
            totalMapReps += mapData[cond.exercise];
          }
        }
        if (totalMapReps >= cond.requiredReps) satisfied = true;
        break;
      }

      case 'PERFECT_FORM': {
        const reps = stats.perfectFormReps[cond.exercise] || 0;
        if (reps >= cond.requiredReps) satisfied = true;
        break;
      }

      case 'HIGH_POWER': {
        const peak = stats.peakPower[cond.exercise] || 0;
        if (cond.peakPowerFeat && peak >= cond.peakPowerFeat) {
          satisfied = true;
        } else if (cond.requiredReps) {
          const reps = stats.highPowerReps[cond.exercise] || 0;
          if (reps >= cond.requiredReps) satisfied = true;
        }
        break;
      }

      case 'MAP_CLEAR': {
        const prog = profile.mapProgress?.[cond.mapId];
        if (prog && prog.highestLevelCleared >= cond.minLevel) {
          satisfied = true;
        }
        break;
      }

      case 'DAMAGE_BLOCKED': {
        if ((stats.totalBlockedDamage || 0) >= cond.requiredBlocked) {
          satisfied = true;
        }
        break;
      }

      case 'WEAPON_EQUIPPED': {
        // Weapon spells are equipped automatically with weapons
        if (profile.equippedItems?.weapon === cond.weaponId) {
          satisfied = true;
        }
        break;
      }
    }

    if (satisfied) {
      currentUnlocked.add(def.cardId);
      newlyUnlocked.push(def);
    }
  }

  return {
    newlyUnlocked,
    updatedUnlockedCards: Array.from(currentUnlocked),
  };
}

/**
 * Returns the current progress, target, percentage, and human-readable progress string for any card.
 */
export function getCardUnlockProgress(
  def: CardUnlockDef,
  profile: PlayerProfile
): {
  current: number;
  target: number;
  percent: number;
  progressText: string;
  isUnlocked: boolean;
} {
  const isUnlocked = (profile.unlockedCards || STARTER_CARD_IDS).includes(def.cardId);
  const stats = profile.unlockStats || {
    monsterKills: {},
    exerciseReps: {},
    mapExerciseReps: {},
    perfectFormReps: {},
    highPowerReps: {},
    peakPower: {},
    totalBlockedDamage: 0,
  };

  const cond = def.condition;
  let current = 0;
  let target = 1;

  switch (cond.type) {
    case 'MONSTER_KILL':
      current = cond.monsterIds.reduce((sum, id) => sum + (stats.monsterKills[id.toLowerCase()] || 0), 0);
      target = cond.requiredKills;
      break;

    case 'EXERCISE_REPS':
      current = stats.exerciseReps[cond.exercise] || 0;
      target = cond.requiredReps;
      break;

    case 'MAP_EXERCISE': {
      let totalMapReps = 0;
      for (const mapId of cond.mapIds) {
        const mapData = stats.mapExerciseReps[mapId];
        if (mapData && mapData[cond.exercise]) {
          totalMapReps += mapData[cond.exercise];
        }
      }
      current = totalMapReps;
      target = cond.requiredReps;
      break;
    }

    case 'PERFECT_FORM':
      current = stats.perfectFormReps[cond.exercise] || 0;
      target = cond.requiredReps;
      break;

    case 'HIGH_POWER':
      current = stats.peakPower[cond.exercise] || 0;
      target = cond.peakPowerFeat || cond.minPower;
      break;

    case 'MAP_CLEAR':
      current = profile.mapProgress?.[cond.mapId]?.highestLevelCleared || 0;
      target = cond.minLevel;
      break;

    case 'DAMAGE_BLOCKED':
      current = stats.totalBlockedDamage || 0;
      target = cond.requiredBlocked;
      break;

    case 'WEAPON_EQUIPPED':
      current = profile.equippedItems?.weapon === cond.weaponId ? 1 : 0;
      target = 1;
      break;
  }

  if (isUnlocked) {
    current = target;
  }

  const percent = Math.min(100, Math.round((current / Math.max(1, target)) * 100));
  const progressText = `${Math.min(current, target)} / ${target}`;

  return {
    current,
    target,
    percent,
    progressText,
    isUnlocked,
  };
}

/** Information for weapon spell cards (granted by equipped weapons). */
export interface WeaponSpellUnlockInfo {
  templateId: string;
  name: string;
  weaponId: string;
  weaponName: string;
  rarity: string;
  isEquipped: boolean;
  isOwned: boolean;
}

/** Returns info on all weapon spells and whether the player has their weapon equipped/unlocked. */
export function getWeaponSpellsInfo(profile: PlayerProfile): WeaponSpellUnlockInfo[] {
  const equippedWeapon = profile.equippedItems?.weapon || 'iron_kettlebell';
  const unlockedItems = new Set(profile.unlockedItems || ['iron_kettlebell']);

  const list: WeaponSpellUnlockInfo[] = [];

  for (const [weaponId, spells] of Object.entries(WEAPON_SPELLS)) {
    for (const spell of spells) {
      list.push({
        templateId: spell.templateId,
        name: spell.name,
        weaponId,
        weaponName: weaponId.replace(/_/g, ' ').toUpperCase(),
        rarity: spell.rarity,
        isEquipped: equippedWeapon === weaponId,
        isOwned: unlockedItems.has(weaponId),
      });
    }
  }

  return list;
}
