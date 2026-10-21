import { ExerciseType } from './game';
import { designCard } from '../shared/cardBalance';
import type { Element } from '../shared/elements';

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
  weaponId?: string; // weapon spell: granted by this equipped weapon (src/types/weaponSpells.ts)
  icon: string;
  /** Elemental typing of the card's damage (src/shared/elements.ts); absent = physical. */
  element?: Element;
  /**
   * Scaling from the design budget (src/shared/cardBalance.ts): damage as a multiple of the knight's
   * Attack (2 = 200%), Block and heal as a share of max HP. `damage`/`block`/`heal` are these applied to
   * the knight's stats and card level (src/shared/progression.ts bindCard).
   */
  dmgPct: number;
  blockPct: number;
  healPct: number;
  /** Reps before Speed's reduction. */
  baseReps: number;
  /** Spell level from casting it (1 when unbound). */
  level?: number;
  /** The equipped weapon's elemental damage riding on each hit of this card. */
  infusion?: { element: Element; damage: number };
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
  | 'hound_twin_maul' | 'hound_savage_frenzy' | 'hound_hellfire_breath' | 'hound_magma_rampage' | 'hound_brimstone_rain'
  // Cave Bat
  | 'bat_wing_buffet' | 'bat_screech_dive' | 'bat_blood_drain' | 'bat_echo_swarm'
  // Goblin Scout
  | 'goblin_rusty_shank' | 'goblin_sneak_pounce' | 'goblin_sling_stone' | 'goblin_firebomb'
  // Spore Mushroom
  | 'shroom_spore_cloud' | 'shroom_toxic_burst' | 'shroom_fungal_guard' | 'shroom_mycelium_snare'
  // Restless Ghost
  | 'ghost_chilling_grasp' | 'ghost_banshee_wail' | 'ghost_phantasmal_bolt' | 'ghost_possession'
  // Brood Spider
  | 'spider_venom_fangs' | 'spider_silk_cocoon' | 'spider_skitter_lunge' | 'spider_brood_swarm'
  // Skeleton Archer
  | 'archer_bone_arrow' | 'archer_piercing_volley' | 'archer_poison_shaft' | 'archer_soul_arrow'
  // Skeleton Warrior
  | 'skwar_scimitar_slash' | 'skwar_shield_bash' | 'skwar_bone_phalanx' | 'skwar_bone_ambush'
  // Cliff Harpy
  | 'harpy_talon_rake' | 'harpy_cyclone' | 'harpy_aerial_dive' | 'harpy_feather_storm'
  // Lizardman
  | 'lizard_trident_thrust' | 'lizard_tail_whip' | 'lizard_scale_guard' | 'lizard_swamp_ambush'
  // Orc Berserker
  | 'orc_axe_chop' | 'orc_blood_frenzy' | 'orc_war_cry_slam' | 'orc_axe_throw'
  // Corrupted Mage
  | 'mage_shadow_bolt' | 'mage_doom_curse' | 'mage_nether_ward' | 'mage_raven_storm'
  // Water Elemental
  | 'water_tidal_strike' | 'water_geyser' | 'water_aqua_barrier' | 'water_bubble_prison'
  // Nightmare Stag
  | 'stag_spectral_antlers' | 'stag_ethereal_trample' | 'stag_mist_veil' | 'stag_moon_bellow'
  // Stone Golem
  | 'golem_stone_hammer' | 'golem_earthquake' | 'golem_granite_skin' | 'golem_crystal_barrage'
  // Vault Guardian
  | 'vault_iron_cleaver' | 'vault_core_discharge' | 'vault_aegis_lockdown' | 'vault_piston_slam'
  // Dungeon Wraith
  | 'wraith_soul_siphon' | 'wraith_shadow_vortex' | 'wraith_death_chill' | 'wraith_reaper_scythe'
  // Stone Gargoyle
  | 'garg_talon' | 'garg_rampart_dive' | 'garg_stone_form' | 'garg_rubble_hurl'
  // Dark Knight
  | 'dk_black_blade' | 'dk_abyssal_cleave' | 'dk_dread_bastion' | 'dk_shadow_step'
  // Minotaur
  | 'mino_horn_gore' | 'mino_labyrinth_charge' | 'mino_club_crush' | 'mino_bellow'
  // Skeleton Knight
  | 'skknight_dread_lance' | 'skknight_phantom_trample' | 'skknight_death_crest' | 'skknight_grave_hands'
  // Grave Colossus
  | 'colossus_corpse_slam' | 'colossus_tomb_collapse' | 'colossus_ossuary' | 'colossus_bile'
  // Void Prophet
  | 'prophet_eldritch_sigil' | 'prophet_cosmic_rift' | 'prophet_singularity' | 'prophet_void_tendrils'
  // Troll Warlord
  | 'troll_burl_club' | 'troll_berserk_flail' | 'troll_regrowth' | 'troll_boulder_toss'
  // Bone Golem
  | 'bgolem_ossuary_strike' | 'bgolem_bone_spire' | 'bgolem_marrow_armor' | 'bgolem_skull_cannon'
  // Ancient Treant
  | 'treant_elder_bough' | 'treant_forest_wrath' | 'treant_ironwood' | 'treant_seed_meteor'
  // Crypt Lord
  | 'lich_frostbolt' | 'lich_death_nova' | 'lich_phylactery' | 'lich_glacial_tomb'
  // Abyssal Kraken
  | 'kraken_tentacle_lash' | 'kraken_maelstrom' | 'kraken_ink_cloud' | 'kraken_tidal_crash'
  // Archbishop of Ash
  | 'bishop_ash_liturgy' | 'bishop_profane_pillar' | 'bishop_aegis' | 'bishop_brimstone_censer'
  // Inferno Titan
  | 'titan_magma_hammer' | 'titan_apocalypse' | 'titan_igneous' | 'titan_skull_pyre'
  // Dark Emperor
  | 'emperor_imperial_slash' | 'emperor_sovereign_ruin' | 'emperor_crown_shadows' | 'emperor_shadow_legion'
  // Magma Dragon
  | 'dragon_tail_whip' | 'dragon_inferno_breath' | 'dragon_scales' | 'dragon_meteor_storm'
  // Eldritch Horror
  | 'horror_tentacle_grasp' | 'horror_cosmic_madness' | 'horror_void_distortion' | 'horror_abyssal_gaze'
  // Crypt Crawler & Plague Rat
  | 'crawler_mandible_pinch' | 'crawler_burrow_dash' | 'crawler_acid_spurt' | 'crawler_chitin_shell'
  | 'rat_frenzied_gnaw' | 'rat_plague_bite' | 'rat_filth_slash'
  // Ember Serpent & Cinder Imp
  | 'serpent_ember_strike' | 'serpent_lava_spit' | 'serpent_inferno_coil'
  | 'imp_cinder_fireball' | 'imp_scorch_claw' | 'imp_hellfire_eruption'
  // Thorn Stalker
  | 'stalker_thorn_volley' | 'stalker_bramble_lash' | 'stalker_needle_barrage' | 'stalker_prickly_guard'
  // Giant Crab & Sewer Lurker
  | 'crab_pincer_snap' | 'crab_crushing_clamp' | 'crab_bubble_blast' | 'crab_chitin_guard'
  | 'lurker_lure_strike' | 'lurker_abyssal_bite' | 'lurker_sludge_belch'
  // Giant Beetle & Forest Bear
  | 'beetle_horn_toss' | 'beetle_chitin_slam' | 'beetle_carapace_wall'
  | 'bear_crushing_swipe' | 'bear_grizzly_maul' | 'bear_territorial_roar'
  // Cultist Acolyte
  | 'acolyte_void_dagger' | 'acolyte_eldritch_hex' | 'acolyte_sacrificial_blast' | 'acolyte_shadow_ward'
  // Lantern Wisp
  | 'wisp_soul_flame' | 'wisp_spectral_burn' | 'wisp_spirit_veil'
  // Throne Guardian
  | 'guardian_colossal_cleave' | 'guardian_throne_smash' | 'guardian_obsidian_bulwark'
  // Storm Crow
  | 'crow_dive_bomb' | 'crow_tempest_screech' | 'crow_gale_slash'
  // Vault Hound
  | 'hound_vault_pounce' | 'hound_iron_jaw' | 'hound_guard_frenzy'
  // Bard
  | 'bard_dissonant_chord' | 'bard_cutting_ballad' | 'bard_cacophony' | 'bard_tempo_ward';

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

export type MonsterAffix = 'FIRE' | 'FROST' | 'TOXIC' | 'VOID' | 'GOLDEN' | 'SHADOW' | 'STORM';

export interface MonsterVariantSpec {
  id: string; // references MONSTER_CATALOG id
  name?: string;
  title?: string;
  level?: number;
  tint?: number;
  scaleMultiplier?: number;
  skin?: string;
  affix?: MonsterAffix;
  aura?: 'fire' | 'ice' | 'poison' | 'summon' | 'void' | 'storm' | 'shadow' | 'golden' | 'holy' | 'earth';
  outlineColor?: number;
  hpMultiplier?: number;
}

/** MINI: shrunk 10–20%, attacks faster. GIANT: grown 10–20%, more HP. */
export type MonsterSizeClass = 'MINI' | 'GIANT';

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
  lane?: number; // left-to-right battlefield position, 0 = nearest the knight (GameEngine formationLanes)
  instanceId?: string;
  isAlive?: boolean;
  damageScale?: number; // pack × affix × stage scaling applied to rolled intents' damage
  blockScale?: number; // stage scaling of DEFEND Block (tracks monster HP, not damage)
  sizeClass?: MonsterSizeClass; // rolled per fight (src/shared/monsterMovesets.ts rollMonsterSize)
  speedScale?: number; // multiplier on rolled intents' charge time (<1 attacks faster)
  element?: Element; // src/shared/elements.ts; absent = physical
  xp?: number; // experience granted to the knight when it dies
  tint?: number;
  scaleMultiplier?: number;
  skin?: string;
  affix?: MonsterAffix;
  aura?: 'fire' | 'ice' | 'poison' | 'summon' | 'void' | 'storm' | 'shadow' | 'golden' | 'holy' | 'earth';
  outlineColor?: number;
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
  | 'WRAITH'
  | 'CRYPT_CRAWLER'
  | 'PLAGUE_RAT'
  | 'EMBER_SERPENT'
  | 'CINDER_IMP'
  | 'THORN_STALKER'
  | 'GIANT_CRAB'
  | 'SEWER_LURKER'
  | 'GIANT_BEETLE'
  | 'FOREST_BEAR'
  | 'CULTIST_ACOLYTE'
  | 'LANTERN_WISP'
  | 'THRONE_GUARDIAN'
  | 'STORM_CROW'
  | 'VAULT_HOUND'
  | 'BARD';

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
  // STARTER: plain steel for a knight starting out. No elements, low reps so a new player casts often.
  // A new game's deck is only these (PlayerProfile.unlockedCards); the rest of the catalog is earned.
  designCard({ templateId: 'starter_swing', name: 'Basic Swing', exercise: 'SWING', reps: 4, rarity: 'common', target: 'SINGLE', colorHex: '#9CA3AF', icon: '🔔' }),
  designCard({ templateId: 'starter_sweep', name: 'Sweep', exercise: 'SWING', reps: 6, rarity: 'common', target: 'ALL', colorHex: '#A8A29E', icon: '〰️' }),
  designCard({ templateId: 'starter_check', name: 'Shoulder Check', exercise: 'LUNGE', reps: 4, rarity: 'common', target: 'SINGLE', stagger: 0.5, colorHex: '#94A3B8', icon: '💢' }),
  designCard({ templateId: 'starter_brace', name: 'Brace', exercise: 'SQUAT', reps: 4, rarity: 'common', target: 'SINGLE', blockShare: 1, colorHex: '#78716C', icon: '🛡️' }),
  designCard({ templateId: 'starter_chop', name: 'Head Crack', exercise: 'OVERHEAD_PRESS', reps: 5, rarity: 'common', target: 'SINGLE', colorHex: '#D6D3D1', icon: '⏬' }),
  designCard({ templateId: 'starter_lob', name: 'Lob', exercise: 'OVERHEAD_PRESS', reps: 5, rarity: 'common', target: 'BACK', colorHex: '#A8A29E', icon: '🪨' }),
  designCard({ templateId: 'starter_stance', name: 'Steady Stance', exercise: 'DEADLIFT', reps: 5, rarity: 'common', target: 'SINGLE', blockShare: 0.5, healShare: 0.15, colorHex: '#A3A3A3', icon: '🦶' }),
  designCard({ templateId: 'starter_haul', name: 'Haul', exercise: 'GORILLA_ROW', reps: 5, rarity: 'common', target: 'CHAIN', hits: 2, colorHex: '#9CA3AF', icon: '✊' }),
  designCard({ templateId: 'starter_hippop', name: 'Hip Pop', exercise: 'CLEAN', reps: 4, rarity: 'common', target: 'SINGLE', blockShare: 0.3, colorHex: '#CBD5E1', icon: '👊' }),
  designCard({ templateId: 'starter_wind', name: 'Second Wind', exercise: 'AROUND_THE_BODY', reps: 4, rarity: 'common', target: 'SINGLE', blockShare: 0.4, healShare: 0.3, colorHex: '#E5E7EB', icon: '💨' }),

  // MONSTER ARTS: techniques learned from the bestiary (choreography in src/tv/engine/monsterArts.ts).
  designCard({ templateId: 'art_echo_shriek', name: 'Echo Shriek', exercise: 'DEADLIFT', reps: 5, rarity: 'common', target: 'ALL', stagger: 0.5, element: 'VOID', colorHex: '#A78BFA', icon: '🦇' }),
  designCard({ templateId: 'art_dirty_trick', name: 'Dirty Trick', exercise: 'OVERHEAD_PRESS', reps: 4, rarity: 'common', target: 'SINGLE', stagger: 1, colorHex: '#A16207', icon: '🥾' }),
  designCard({ templateId: 'art_rattle_back', name: 'Rattle Back', exercise: 'SQUAT', reps: 4, rarity: 'common', target: 'SINGLE', blockShare: 0.75, healShare: 0.25, element: 'VOID', colorHex: '#E2E8F0', icon: '💀' }),
  designCard({ templateId: 'art_wisp_lure', name: "Will-o'-Lure", exercise: 'AROUND_THE_BODY', reps: 4, rarity: 'common', target: 'BACK', element: 'HOLY', colorHex: '#67E8F9', icon: '🏮' }),
  designCard({ templateId: 'art_banshee_step', name: 'Banshee Step', exercise: 'WINDMILL', reps: 5, rarity: 'rare', target: 'BACK', element: 'VOID', colorHex: '#7DD3FC', icon: '👻' }),
  designCard({ templateId: 'art_bone_volley', name: 'Bone Volley', exercise: 'OVERHEAD_PRESS', reps: 5, rarity: 'rare', target: 'CHAIN', hits: 3, element: 'VOID', colorHex: '#F1F5F9', icon: '🏹' }),
  designCard({ templateId: 'art_carapace_roll', name: 'Carapace Roll', exercise: 'SWING', reps: 5, rarity: 'rare', target: 'PIERCE', blockShare: 0.3, element: 'EARTH', colorHex: '#4D7C0F', icon: '🪲' }),
  designCard({ templateId: 'art_undertow', name: 'Undertow', exercise: 'GORILLA_ROW', reps: 5, rarity: 'rare', target: 'PIERCE', blockShare: 0.3, element: 'FROST', colorHex: '#14B8A6', icon: '🌊' }),
  designCard({ templateId: 'art_tombstone_heave', name: 'Tombstone Heave', exercise: 'DEADLIFT', reps: 5, rarity: 'rare', target: 'BACK', element: 'EARTH', colorHex: '#78716C', icon: '🪦' }),
  designCard({ templateId: 'art_troll_blood', name: 'Troll Blood', exercise: 'SQUAT', reps: 5, rarity: 'rare', target: 'SINGLE', healShare: 0.45, element: 'NATURE', colorHex: '#65A30D', icon: '🧌' }),
  designCard({ templateId: 'art_needle_burst', name: 'Needle Burst', exercise: 'SQUAT', reps: 5, rarity: 'rare', target: 'CHAIN', hits: 4, element: 'NATURE', colorHex: '#16A34A', icon: '🌵' }),
  designCard({ templateId: 'art_pincer_crack', name: 'Pincer Crack', exercise: 'CLEAN', reps: 5, rarity: 'rare', target: 'SINGLE', shatter: true, element: 'FROST', colorHex: '#EA580C', icon: '🦀' }),
  designCard({ templateId: 'art_tail_sweep', name: 'Tail Sweep', exercise: 'SINGLE_LEG_RDL', reps: 5, rarity: 'rare', target: 'PIERCE', element: 'NATURE', colorHex: '#059669', icon: '🦎' }),
  designCard({ templateId: 'art_berserker_rush', name: 'Berserker Rush', exercise: 'THRUSTER', reps: 5, rarity: 'epic', target: 'CHAIN', hits: 3, colorHex: '#DC2626', icon: '🪓' }),
  designCard({ templateId: 'art_moonlit_leap', name: 'Moonlit Leap', exercise: 'LUNGE', reps: 5, rarity: 'epic', target: 'BACK', stagger: 1, element: 'HOLY', colorHex: '#C7D2FE', icon: '🦌' }),
  designCard({ templateId: 'art_stone_skin', name: 'Stone Skin', exercise: 'CLEAN_AND_PRESS', reps: 5, rarity: 'epic', target: 'SINGLE', blockShare: 0.6, element: 'EARTH', colorHex: '#A8A29E', icon: '🗿' }),
  designCard({ templateId: 'art_black_riposte', name: 'Black Riposte', exercise: 'WINDMILL', reps: 5, rarity: 'epic', target: 'SINGLE', blockShare: 0.4, stagger: 1, element: 'VOID', colorHex: '#7C3AED', icon: '🗡️' }),
  designCard({ templateId: 'art_life_leech', name: 'Life Leech', exercise: 'GORILLA_ROW', reps: 5, rarity: 'epic', target: 'SINGLE', healShare: 0.35, element: 'VOID', colorHex: '#BE123C', icon: '🩸' }),
  designCard({ templateId: 'art_grizzly_maul', name: 'Grizzly Maul', exercise: 'CLEAN_AND_PRESS', reps: 6, rarity: 'epic', target: 'SINGLE', stagger: 1.5, colorHex: '#92400E', icon: '🐻' }),
  designCard({ templateId: 'art_phantom_cavalry', name: 'Phantom Cavalry', exercise: 'SNATCH', reps: 6, rarity: 'epic', target: 'ALL', stagger: 1, element: 'VOID', colorHex: '#93C5FD', icon: '🐎' }),

  // SWING: fast and ballistic. Bread-and-butter single hits, a whirlwind that clears groups.
  designCard({ templateId: 'swing_cleave', name: 'Iron Cleave', exercise: 'SWING', reps: 5, rarity: 'common', target: 'SINGLE', colorHex: '#F4B41A', icon: '⚔️' }),
  designCard({ templateId: 'swing_whirlwind', name: 'Dragon Whirlwind', exercise: 'SWING', reps: 8, rarity: 'rare', target: 'ALL', element: 'FIRE', colorHex: '#DC2626', icon: '🌪️' }),
  designCard({ templateId: 'swing_flow', name: 'Momentum Flow', exercise: 'SWING', reps: 4, rarity: 'common', target: 'SINGLE', blockShare: 0.6, element: 'FROST', colorHex: '#38B6FF', icon: '🌊' }),

  // SQUAT: ground shockwaves hit everyone; a pure wall of Block.
  designCard({ templateId: 'squat_slam', name: 'Titan Ground Slam', exercise: 'SQUAT', reps: 4, rarity: 'common', target: 'ALL', element: 'EARTH', colorHex: '#FF3366', icon: '🔨' }),
  designCard({ templateId: 'squat_bastion', name: 'Aegis Fortress', exercise: 'SQUAT', reps: 5, rarity: 'rare', target: 'SINGLE', blockShare: 1, colorHex: '#00EB88', icon: '🛡️' }),
  designCard({ templateId: 'squat_earthquake', name: 'Colossus Quake', exercise: 'SQUAT', reps: 7, rarity: 'epic', target: 'ALL', stagger: 1.5, blockShare: 0.15, element: 'EARTH', colorHex: '#A855F7', icon: '🌋' }),

  // OVERHEAD PRESS: strikes from above, so it can reach the back row or punch through armor.
  designCard({ templateId: 'press_smite', name: 'Thunder Smite', exercise: 'OVERHEAD_PRESS', reps: 4, rarity: 'common', target: 'BACK', element: 'STORM', colorHex: '#38B6FF', icon: '⚡' }),
  designCard({ templateId: 'press_judgement', name: 'Heavenly Pillar', exercise: 'OVERHEAD_PRESS', reps: 6, rarity: 'epic', target: 'SINGLE', shatter: true, element: 'HOLY', colorHex: '#FBBF24', icon: '☀️' }),
  designCard({ templateId: 'press_sanctuary', name: 'Arcane Scepter', exercise: 'OVERHEAD_PRESS', reps: 3, rarity: 'rare', target: 'SINGLE', blockShare: 0.6, element: 'HOLY', colorHex: '#60A5FA', icon: '✨' }),

  // CLEAN & PRESS: heavy, slow and brutal. Armor-breaking and line-clearing.
  designCard({ templateId: 'clean_breaker', name: 'Anvil Breaker', exercise: 'CLEAN_AND_PRESS', reps: 4, rarity: 'rare', target: 'SINGLE', shatter: true, blockShare: 0.2, colorHex: '#F97316', icon: '💥' }),
  designCard({ templateId: 'clean_stormbreaker', name: 'Stormbreaker Cleaver', exercise: 'CLEAN_AND_PRESS', reps: 6, rarity: 'epic', target: 'PIERCE', stagger: 1, element: 'STORM', colorHex: '#EA580C', icon: '⚡' }),

  // SNATCH: the most explosive lift. A dive onto the back row and the biggest single hit in the game.
  designCard({ templateId: 'snatch_phoenix', name: 'Phoenix Ascension', exercise: 'SNATCH', reps: 5, rarity: 'rare', target: 'BACK', element: 'FIRE', colorHex: '#EF4444', icon: '🔥' }),
  designCard({ templateId: 'snatch_solar', name: 'Solar Talon', exercise: 'SNATCH', reps: 8, rarity: 'legendary', target: 'SINGLE', stagger: 2, element: 'FIRE', colorHex: '#B91C1C', icon: '🦅' }),

  // WINDMILL: slow and controlled. Defensive, with healing.
  designCard({ templateId: 'windmill_astral', name: 'Astral Spire', exercise: 'WINDMILL', reps: 3, rarity: 'rare', target: 'SINGLE', blockShare: 0.65, element: 'HOLY', colorHex: '#00EB88', icon: '🌌' }),
  designCard({ templateId: 'windmill_cosmic', name: 'Cosmic Ward', exercise: 'WINDMILL', reps: 5, rarity: 'epic', target: 'SINGLE', blockShare: 0.55, healShare: 0.25, element: 'HOLY', colorHex: '#10B981', icon: '🛡️' }),

  // DEADLIFT: rooted strength. Sustain, and a legendary armor-breaking line attack.
  designCard({ templateId: 'deadlift_colossus', name: 'Root of Titans', exercise: 'DEADLIFT', reps: 5, rarity: 'common', target: 'SINGLE', blockShare: 0.55, healShare: 0.2, element: 'NATURE', colorHex: '#84CC16', icon: '🌲' }),
  designCard({ templateId: 'deadlift_sunder', name: 'Mountain Sunder', exercise: 'DEADLIFT', reps: 7, rarity: 'legendary', target: 'PIERCE', shatter: true, element: 'EARTH', colorHex: '#D97706', icon: '⛰️' }),

  // THRUSTER: full-body and exhausting. A meteor onto the back row and the strongest AOE.
  designCard({ templateId: 'thruster_eruption', name: 'Solar Eruption', exercise: 'THRUSTER', reps: 4, rarity: 'rare', target: 'BACK', blockShare: 0.15, element: 'FIRE', colorHex: '#F59E0B', icon: '☄️' }),
  designCard({ templateId: 'thruster_supernova', name: 'Supernova Surge', exercise: 'THRUSTER', reps: 6, rarity: 'epic', target: 'ALL', element: 'HOLY', colorHex: '#D97706', icon: '🌟' }),

  // GORILLA ROW: tearing, alternating pulls. A flurry that spreads across the pack.
  designCard({ templateId: 'row_beast_maw', name: 'Beast Maw', exercise: 'GORILLA_ROW', reps: 5, rarity: 'common', target: 'SINGLE', blockShare: 0.2, colorHex: '#84CC16', icon: '🦍' }),
  designCard({ templateId: 'row_shadow_ripper', name: 'Shadow Ripper', exercise: 'GORILLA_ROW', reps: 8, rarity: 'rare', target: 'CHAIN', hits: 4, element: 'VOID', colorHex: '#65A30D', icon: '🗡️' }),

  // AROUND-THE-BODY PASS: mobility. Protection, healing, and a vortex that slows every foe.
  designCard({ templateId: 'halo_barrier', name: 'Celestial Barrier', exercise: 'AROUND_THE_BODY', reps: 4, rarity: 'rare', target: 'SINGLE', blockShare: 0.75, healShare: 0.25, element: 'HOLY', colorHex: '#818CF8', icon: '💫' }),
  designCard({ templateId: 'halo_vortex', name: 'Astral Vortex', exercise: 'AROUND_THE_BODY', reps: 5, rarity: 'epic', target: 'ALL', stagger: 1, blockShare: 0.3, element: 'STORM', colorHex: '#C084FC', icon: '🌀' }),

  // SINGLE-LEG RDL: balance and precision. Guarded strikes and a precise armor-piercing reach.
  designCard({ templateId: 'rdl_valkyrie', name: 'Valkyrie Balance', exercise: 'SINGLE_LEG_RDL', reps: 4, rarity: 'rare', target: 'SINGLE', blockShare: 0.55, element: 'HOLY', colorHex: '#EC4899', icon: '🕊️' }),
  designCard({ templateId: 'rdl_crane', name: 'Crane Strike', exercise: 'SINGLE_LEG_RDL', reps: 6, rarity: 'epic', target: 'BACK', shatter: true, element: 'STORM', colorHex: '#DB2777', icon: '🦩' }),

  // CLEAN (new): snapping hip drive. An interrupting uppercut and a ricocheting bell.
  designCard({ templateId: 'clean_uppercut', name: 'Iron Uppercut', exercise: 'CLEAN', reps: 4, rarity: 'common', target: 'SINGLE', stagger: 1.5, colorHex: '#FB923C', icon: '👊' }),
  designCard({ templateId: 'clean_ricochet', name: 'Ricochet Bell', exercise: 'CLEAN', reps: 6, rarity: 'rare', target: 'CHAIN', hits: 3, colorHex: '#FACC15', icon: '🔔' }),

  // LUNGE (new): stepping strikes. A spear thrust through the line and a shielded advance.
  designCard({ templateId: 'lunge_lancer', name: "Lancer's Lunge", exercise: 'LUNGE', reps: 4, rarity: 'common', target: 'PIERCE', element: 'FROST', colorHex: '#22D3EE', icon: '🔱' }),
  designCard({ templateId: 'lunge_vanguard', name: 'Vanguard Step', exercise: 'LUNGE', reps: 5, rarity: 'rare', target: 'SINGLE', blockShare: 0.4, stagger: 1, colorHex: '#94A3B8', icon: '🛡️' }),
];

/** The cards a new game starts with. */
export const STARTER_CARD_IDS: readonly string[] = CARD_CATALOG.filter((c) => c.templateId.startsWith('starter_')).map((c) => c.templateId);

/** Deck of a save made before card unlocks existed: the full catalog minus the starters. */
export const LEGACY_CARD_IDS: readonly string[] = CARD_CATALOG.filter((c) => !c.templateId.startsWith('starter_')).map((c) => c.templateId);

export const MONSTER_CATALOG: Omit<MonsterState, 'currentHp' | 'block' | 'intent'>[] = [
  {
    id: 'green_slime',
    name: 'GREEN SLIME',
    title: 'DUNGEON OOZE',
    maxHp: 420,
    level: 5,
    spriteType: 'SLIME',
  },
  {
    id: 'boar',
    name: 'RAZORBACK BOAR',
    title: 'TUSKED CHARGER',
    maxHp: 510,
    level: 6,
    spriteType: 'BOAR',
  },
  {
    id: 'wolf',
    name: 'SHADOW WOLF',
    title: 'NOCTURNAL PREDATOR',
    maxHp: 480,
    level: 7,
    spriteType: 'WOLF',
  },
  {
    id: 'treemon',
    name: 'TREEMON',
    title: 'ROOTBOUND GUARDIAN',
    maxHp: 630,
    level: 8,
    spriteType: 'TREEMON',
  },
  {
    id: 'demon_monk',
    name: 'DEMON MONK',
    title: 'CORRUPTED ACOLYTE',
    maxHp: 660,
    level: 10,
    spriteType: 'DEMON_MONK',
  },
  {
    id: 'hellhound',
    name: 'HELLHOUND',
    title: 'TWO-HEADED HOUND',
    maxHp: 780,
    level: 12,
    spriteType: 'HELLHOUND',
  },
  { id: 'bat', name: 'CAVE BAT', title: 'NIGHT STALKER', maxHp: 300, level: 3, spriteType: 'BAT' },
  { id: 'goblin', name: 'GOBLIN SCOUT', title: 'WOODLAND THIEF', maxHp: 360, level: 4, spriteType: 'GOBLIN' },
  { id: 'mushroom', name: 'SPORE MUSHROOM', title: 'TOXIC FUNGUS', maxHp: 390, level: 4, spriteType: 'MUSHROOM' },
  { id: 'ghost', name: 'RESTLESS GHOST', title: 'HAUNTING SPECTER', maxHp: 390, level: 5, spriteType: 'GHOST' },
  { id: 'giant_spider', name: 'BROOD SPIDER', title: 'WEB WEAVER', maxHp: 450, level: 5, spriteType: 'GIANT_SPIDER' },
  { id: 'skeleton_archer', name: 'SKELETON ARCHER', title: 'CRYPT MARKSMAN', maxHp: 420, level: 6, spriteType: 'SKELETON_ARCHER' },
  { id: 'skeleton_warrior', name: 'SKELETON WARRIOR', title: 'UNDYING FOOTMAN', maxHp: 480, level: 6, spriteType: 'SKELETON_WARRIOR' },
  { id: 'harpy', name: 'CLIFF HARPY', title: 'WINGED SCREAMER', maxHp: 450, level: 7, spriteType: 'HARPY' },
  { id: 'lizardman', name: 'LIZARDMAN SLAYER', title: 'SWAMP SKIRMISHER', maxHp: 540, level: 8, spriteType: 'LIZARDMAN' },
  { id: 'orc', name: 'ORC BERSERKER', title: 'SAVAGE WARRIOR', maxHp: 600, level: 8, spriteType: 'ORC' },
  { id: 'dark_mage', name: 'CORRUPTED MAGE', title: 'SHADOW CASTER', maxHp: 510, level: 9, spriteType: 'DARK_MAGE' },
  { id: 'water_elemental', name: 'WATER ELEMENTAL', title: 'TIDAL SURGE', maxHp: 630, level: 9, spriteType: 'WATER_ELEMENTAL' },
  { id: 'nightmare_stag', name: 'NIGHTMARE STAG', title: 'FOREST PHANTOM', maxHp: 570, level: 9, spriteType: 'NIGHTMARE_STAG' },
  { id: 'golem', name: 'STONE GOLEM', title: 'EARTHEN SENTINEL', maxHp: 720, level: 10, spriteType: 'GOLEM' },
  { id: 'vault_guardian', name: 'VAULT GUARDIAN', title: 'ARMORED AUTOMATON', maxHp: 750, level: 10, spriteType: 'VAULT_GUARDIAN' },
  { id: 'wraith', name: 'DUNGEON WRAITH', title: 'CHILLING PHANTASM', maxHp: 570, level: 10, spriteType: 'WRAITH' },
  { id: 'gargoyle', name: 'STONE GARGOYLE', title: 'RAMPART DEFENDER', maxHp: 690, level: 11, spriteType: 'GARGOYLE' },
  { id: 'dark_knight', name: 'DARK KNIGHT', title: 'FALLEN CHAMPION', maxHp: 780, level: 11, spriteType: 'DARK_KNIGHT' },
  { id: 'minotaur', name: 'LABYRINTH MINOTAUR', title: 'HORNED CRUSHER', maxHp: 810, level: 12, spriteType: 'MINOTAUR' },
  { id: 'skeleton_knight', name: 'SKELETON KNIGHT', title: 'DREAD CAVALIER', maxHp: 750, level: 12, spriteType: 'SKELETON_KNIGHT' },
  { id: 'grave_colossus', name: 'GRAVE COLOSSUS', title: 'CORPSE TANK', maxHp: 870, level: 13, spriteType: 'GRAVE_COLOSSUS' },
  { id: 'void_prophet', name: 'VOID PROPHET', title: 'FORBIDDEN HERALD', maxHp: 720, level: 13, spriteType: 'VOID_PROPHET' },
  { id: 'troll', name: 'TROLL WARLORD', title: 'REGENERATING BRUTE', maxHp: 900, level: 13, spriteType: 'TROLL' },
  { id: 'bone_golem', name: 'BONE GOLEM', title: 'OSSEOUS MONSTROSITY', maxHp: 930, level: 14, spriteType: 'BONE_GOLEM' },
  { id: 'ancient_treant', name: 'ANCIENT TREANT', title: 'ELDER OF THE GROVE', maxHp: 960, level: 14, spriteType: 'ANCIENT_TREANT' },
  { id: 'crypt_lord', name: 'CRYPT LORD', title: 'LICH ARCHMAGE', maxHp: 1020, level: 15, spriteType: 'CRYPT_LORD' },
  { id: 'kraken', name: 'ABYSSAL KRAKEN', title: 'LEVIATHAN OF THE DEEP', maxHp: 1050, level: 16, spriteType: 'KRAKEN' },
  { id: 'demon_archbishop', name: 'ARCHBISHOP OF ASH', title: 'HIGH INQUISITOR', maxHp: 1080, level: 16, spriteType: 'DEMON_ARCHBISHOP' },
  { id: 'inferno_titan', name: 'INFERNO TITAN', title: 'COLOSSUS OF FLAME', maxHp: 1140, level: 17, spriteType: 'INFERNO_TITAN' },
  { id: 'dark_emperor', name: 'DARK EMPEROR', title: 'SOVEREIGN OF RUIN', maxHp: 1200, level: 18, spriteType: 'DARK_EMPEROR' },
  { id: 'magma_dragon', name: 'MAGMA DRAGON', title: 'SCORCHED WYRM', maxHp: 1260, level: 19, spriteType: 'MAGMA_DRAGON' },
  { id: 'eldritch_horror', name: 'ELDRITCH HORROR', title: 'CTHULHU INCARNATE', maxHp: 1350, level: 20, spriteType: 'ELDRITCH_HORROR' },

  // New expansion monsters
  { id: 'plague_rat', name: 'PLAGUE RAT', title: 'FILTH CARRIER', maxHp: 330, level: 3, spriteType: 'PLAGUE_RAT' },
  { id: 'lantern_wisp', name: 'LANTERN WISP', title: 'SPECTRAL FLAME', maxHp: 360, level: 4, spriteType: 'LANTERN_WISP' },
  { id: 'giant_crab', name: 'GIANT CRAB', title: 'TIDAL PINCH', maxHp: 450, level: 5, spriteType: 'GIANT_CRAB' },
  { id: 'crypt_crawler', name: 'CRYPT CRAWLER', title: 'BURROWING SCUTTLER', maxHp: 450, level: 6, spriteType: 'CRYPT_CRAWLER' },
  { id: 'cinder_imp', name: 'CINDER IMP', title: 'HELLFIRE PYROMANCER', maxHp: 450, level: 6, spriteType: 'CINDER_IMP' },
  { id: 'storm_crow', name: 'STORM CROW', title: 'RAMPART HARBINGER', maxHp: 480, level: 7, spriteType: 'STORM_CROW' },
  { id: 'giant_beetle', name: 'GIANT BEETLE', title: 'IRON CARAPACE', maxHp: 570, level: 8, spriteType: 'GIANT_BEETLE' },
  { id: 'thorn_stalker', name: 'THORN STALKER', title: 'VERDANT AMBUSHER', maxHp: 570, level: 8, spriteType: 'THORN_STALKER' },
  { id: 'bard', name: 'ROGUE BARD', title: 'DISCORDANT MINSTREL', maxHp: 540, level: 9, spriteType: 'BARD' },
  { id: 'cultist_acolyte', name: 'CULTIST ACOLYTE', title: 'FORBIDDEN DEVOTEE', maxHp: 540, level: 9, spriteType: 'CULTIST_ACOLYTE' },
  { id: 'vault_hound', name: 'VAULT HOUND', title: 'IRONFANG SENTRY', maxHp: 660, level: 10, spriteType: 'VAULT_HOUND' },
  { id: 'ember_serpent', name: 'EMBER SERPENT', title: 'PYROCLASTIC COIL', maxHp: 660, level: 11, spriteType: 'EMBER_SERPENT' },
  { id: 'forest_bear', name: 'FOREST BEAR', title: 'GROVE APEX', maxHp: 750, level: 11, spriteType: 'FOREST_BEAR' },
  { id: 'sewer_lurker', name: 'SEWER LURKER', title: 'ABYSSAL DEEP-JAW', maxHp: 810, level: 12, spriteType: 'SEWER_LURKER' },
  { id: 'throne_guardian', name: 'THRONE GUARDIAN', title: 'OBSIDIAN JUGGERNAUT', maxHp: 960, level: 14, spriteType: 'THRONE_GUARDIAN' },
];

export type BattleMapId =
  | 'CATHEDRAL_CRYPT'
  | 'DARK_FOREST'
  | 'VERDANT_FOREST'
  | 'OBSIDIAN_THRONE'
  | 'VOLCANIC_FORGE'
  | 'BLOOD_CEMETERY'
  | 'SUNKEN_CISTERN'
  | 'BELFRY_RAMPARTS'
  | 'ELDRITCH_ALTAR'
  | 'CATHEDRAL_VAULT'
  | 'TOWN_NIGHT'
  | 'TOWN_SQUARE';

export interface EncounterTemplate {
  id: string;
  name: string;
  description: string;
  map?: BattleMapId;
  background?: string;
  monsterIds: (string | MonsterVariantSpec)[]; // references MONSTER_CATALOG id or a customized variant spec
  /** Five of one monster (stageScaling rollHorde). */
  horde?: boolean;
}

export { ENCOUNTERS } from './encounters';
