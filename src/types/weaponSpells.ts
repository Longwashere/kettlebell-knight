import { designCard, type CardSpec } from '../shared/cardBalance';
import type { CardTemplate } from './battle';

/**
 * Weapon spells: signature cards granted by the equipped weapon (SHOP_ITEMS id). Equipping a weapon
 * shuffles two copies of each of its spells into the battle deck (CardDeckManager.initDeck). Legendary
 * weapons carry two spells.
 *
 * Numbers come from the same balance model as CARD_CATALOG (designCard), so a spell is worth the same
 * per rep as any card of its rarity; better weapons win by bringing rarer cards. Choreography for each
 * templateId lives in src/tv/engine/spellMoves.ts, card art in src/tv/components/cardArt.ts.
 */
const spell = (weaponId: string, spec: CardSpec): CardTemplate => ({ ...designCard(spec), weaponId });

export const WEAPON_SPELLS: Record<string, CardTemplate[]> = {
  // --- Morning stars: whirled on chains, hurled, lashed ---
  iron_morningstar: [
    spell('iron_morningstar', { templateId: 'spell_iron_pendulum', name: 'Iron Pendulum', exercise: 'SWING', reps: 5, rarity: 'rare', target: 'SINGLE', stagger: 1, colorHex: '#94A3B8', icon: '⛓️' }),
  ],
  slime_morningstar: [
    spell('slime_morningstar', { templateId: 'spell_caustic_deluge', name: 'Caustic Deluge', exercise: 'SWING', reps: 5, rarity: 'common', target: 'ALL', element: 'NATURE', colorHex: '#22C55E', icon: '🧪' }),
  ],
  spider_morningstar: [
    spell('spider_morningstar', { templateId: 'spell_brood_sac', name: 'Brood Sac Hurl', exercise: 'SNATCH', reps: 5, rarity: 'rare', target: 'CHAIN', hits: 3, element: 'NATURE', colorHex: '#A855F7', icon: '🕷️' }),
  ],
  crypt_morningstar: [
    spell('crypt_morningstar', { templateId: 'spell_requiem_censer', name: 'Requiem Censer', exercise: 'AROUND_THE_BODY', reps: 5, rarity: 'rare', target: 'SINGLE', healShare: 0.3, element: 'HOLY', colorHex: '#38BDF8', icon: '🕯️' }),
  ],
  hellhound_morningstar: [
    spell('hellhound_morningstar', { templateId: 'spell_brimstone_comet', name: 'Brimstone Comet', exercise: 'SNATCH', reps: 5, rarity: 'epic', target: 'BACK', element: 'FIRE', colorHex: '#EF4444', icon: '☄️' }),
  ],
  frost_morningstar: [
    spell('frost_morningstar', { templateId: 'spell_permafrost', name: 'Permafrost Shatter', exercise: 'SWING', reps: 6, rarity: 'epic', target: 'ALL', stagger: 1.5, element: 'FROST', colorHex: '#93C5FD', icon: '❄️' }),
  ],
  troll_morningstar: [
    spell('troll_morningstar', { templateId: 'spell_boulder_bowl', name: 'Boulder Bowl', exercise: 'DEADLIFT', reps: 5, rarity: 'epic', target: 'PIERCE', element: 'EARTH', colorHex: '#78716C', icon: '🪨' }),
  ],
  kraken_morningstar: [
    spell('kraken_morningstar', { templateId: 'spell_abyssal_anchor', name: 'Abyssal Anchor', exercise: 'CLEAN_AND_PRESS', reps: 5, rarity: 'legendary', target: 'SINGLE', shatter: true, element: 'FROST', colorHex: '#14B8A6', icon: '⚓' }),
    spell('kraken_morningstar', { templateId: 'spell_maelstrom', name: "Kraken's Maelstrom", exercise: 'AROUND_THE_BODY', reps: 6, rarity: 'legendary', target: 'ALL', stagger: 1, element: 'STORM', colorHex: '#0D9488', icon: '🐙' }),
  ],
  excalibur_morningstar: [
    spell('excalibur_morningstar', { templateId: 'spell_sunflare', name: 'Sunflare Pendulum', exercise: 'AROUND_THE_BODY', reps: 5, rarity: 'epic', target: 'ALL', element: 'HOLY', colorHex: '#FBBF24', icon: '☀️' }),
  ],
  dragon_morningstar: [
    spell('dragon_morningstar', { templateId: 'spell_wyrmchain', name: 'Wyrmchain Inferno', exercise: 'SWING', reps: 6, rarity: 'legendary', target: 'ALL', element: 'FIRE', colorHex: '#EF4444', icon: '🐉' }),
    spell('dragon_morningstar', { templateId: 'spell_molten_meteor', name: 'Molten Meteor', exercise: 'SNATCH', reps: 5, rarity: 'legendary', target: 'SINGLE', shatter: true, element: 'FIRE', colorHex: '#F97316', icon: '🌋' }),
  ],
  void_morningstar: [
    spell('void_morningstar', { templateId: 'spell_event_horizon', name: 'Event Horizon', exercise: 'AROUND_THE_BODY', reps: 6, rarity: 'legendary', target: 'ALL', stagger: 1, element: 'VOID', colorHex: '#C084FC', icon: '🕳️' }),
    spell('void_morningstar', { templateId: 'spell_gravity_well', name: 'Gravity Well', exercise: 'CLEAN_AND_PRESS', reps: 5, rarity: 'legendary', target: 'SINGLE', shatter: true, element: 'VOID', colorHex: '#7C3AED', icon: '🌀' }),
  ],

  // --- Bells: swung, cleaned, snatched and pressed ---
  iron_kettlebell: [
    spell('iron_kettlebell', { templateId: 'spell_iron_toll', name: 'Iron Toll', exercise: 'SWING', reps: 4, rarity: 'common', target: 'SINGLE', stagger: 0.5, colorHex: '#9CA3AF', icon: '🔔' }),
  ],
  mushroom_bell: [
    spell('mushroom_bell', { templateId: 'spell_spore_bloom', name: 'Spore Bloom', exercise: 'CLEAN', reps: 4, rarity: 'common', target: 'SINGLE', healShare: 0.3, element: 'NATURE', colorHex: '#C084FC', icon: '🍄' }),
  ],
  harpy_bell: [
    spell('harpy_bell', { templateId: 'spell_talon_gale', name: 'Talon Gale', exercise: 'SNATCH', reps: 5, rarity: 'rare', target: 'CHAIN', hits: 3, element: 'STORM', colorHex: '#FCD34D', icon: '🪶' }),
  ],
  treemon_bell: [
    spell('treemon_bell', { templateId: 'spell_ironwood_grasp', name: 'Ironwood Grasp', exercise: 'DEADLIFT', reps: 5, rarity: 'rare', target: 'SINGLE', blockShare: 0.4, element: 'NATURE', colorHex: '#4ADE80', icon: '🌳' }),
  ],
  golem_bell: [
    spell('golem_bell', { templateId: 'spell_ley_fault', name: 'Ley-Line Fault', exercise: 'SQUAT', reps: 5, rarity: 'epic', target: 'PIERCE', shatter: true, element: 'EARTH', colorHex: '#38BDF8', icon: '💠' }),
  ],
  eldritch_bell: [
    spell('eldritch_bell', { templateId: 'spell_all_seeing_gaze', name: 'All-Seeing Gaze', exercise: 'OVERHEAD_PRESS', reps: 5, rarity: 'legendary', target: 'SINGLE', shatter: true, element: 'HOLY', colorHex: '#FBBF24', icon: '👁️' }),
    spell('eldritch_bell', { templateId: 'spell_writhing_dark', name: 'Writhing Dark', exercise: 'GORILLA_ROW', reps: 6, rarity: 'legendary', target: 'ALL', element: 'VOID', colorHex: '#9333EA', icon: '🦑' }),
  ],
  excalibur_bell: [
    spell('excalibur_bell', { templateId: 'spell_excalibur_decree', name: "Excalibur's Decree", exercise: 'OVERHEAD_PRESS', reps: 5, rarity: 'epic', target: 'ALL', element: 'HOLY', colorHex: '#F4B41A', icon: '⚜️' }),
  ],
  dragon_kettlebell: [
    spell('dragon_kettlebell', { templateId: 'spell_dragon_breath', name: "Dragon's Breath", exercise: 'SWING', reps: 6, rarity: 'legendary', target: 'ALL', element: 'FIRE', colorHex: '#DC2626', icon: '🔥' }),
    spell('dragon_kettlebell', { templateId: 'spell_wyrmheart_drive', name: 'Wyrmheart Drive', exercise: 'THRUSTER', reps: 5, rarity: 'legendary', target: 'SINGLE', shatter: true, element: 'FIRE', colorHex: '#F97316', icon: '🐲' }),
  ],
  void_bell: [
    spell('void_bell', { templateId: 'spell_fallen_star', name: 'Fallen Star', exercise: 'SNATCH', reps: 5, rarity: 'legendary', target: 'BACK', element: 'VOID', colorHex: '#A855F7', icon: '🌠' }),
    spell('void_bell', { templateId: 'spell_gravity_snap', name: 'Gravity Snap', exercise: 'CLEAN', reps: 6, rarity: 'legendary', target: 'ALL', stagger: 1, element: 'VOID', colorHex: '#6D28D9', icon: '🪐' }),
  ],

  // --- Maces: crushing overhead blows ---
  goblin_mace: [
    spell('goblin_mace', { templateId: 'spell_scrap_shrapnel', name: 'Scrap Shrapnel', exercise: 'CLEAN', reps: 4, rarity: 'common', target: 'CHAIN', hits: 3, colorHex: '#A3E635', icon: '🔩' }),
  ],
  iron_mace: [
    spell('iron_mace', { templateId: 'spell_flanged_crush', name: 'Flanged Crush', exercise: 'CLEAN_AND_PRESS', reps: 5, rarity: 'rare', target: 'SINGLE', shatter: true, colorHex: '#A8A29E', icon: '🔨' }),
  ],
  skeleton_mace: [
    spell('skeleton_mace', { templateId: 'spell_ossuary_rattle', name: 'Ossuary Rattle', exercise: 'CLEAN', reps: 5, rarity: 'rare', target: 'SINGLE', stagger: 1, element: 'VOID', colorHex: '#E2E8F0', icon: '💀' }),
  ],
  cemetery_mace: [
    spell('cemetery_mace', { templateId: 'spell_gravestone_toll', name: 'Gravestone Toll', exercise: 'SQUAT', reps: 5, rarity: 'rare', target: 'ALL', element: 'HOLY', colorHex: '#94A3B8', icon: '🪦' }),
  ],
  belfry_mace: [
    spell('belfry_mace', { templateId: 'spell_cathedral_toll', name: 'Cathedral Toll', exercise: 'OVERHEAD_PRESS', reps: 5, rarity: 'epic', target: 'ALL', stagger: 1, element: 'STORM', colorHex: '#FBBF24', icon: '🛎️' }),
  ],
  inferno_mace: [
    spell('inferno_mace', { templateId: 'spell_basalt_fissure', name: 'Basalt Fissure', exercise: 'SQUAT', reps: 6, rarity: 'legendary', target: 'PIERCE', element: 'EARTH', colorHex: '#EA580C', icon: '🌋' }),
    spell('inferno_mace', { templateId: 'spell_core_breach', name: 'Core Breach', exercise: 'CLEAN_AND_PRESS', reps: 5, rarity: 'legendary', target: 'SINGLE', shatter: true, element: 'FIRE', colorHex: '#F97316', icon: '💥' }),
  ],
  // --- Secret-trial legendaries (src/shared/secretTrials.ts) ---
  bellringer_mallet: [
    spell('bellringer_mallet', { templateId: 'spell_test_your_strength', name: 'Test Your Strength', exercise: 'SWING', reps: 5, rarity: 'legendary', target: 'SINGLE', stagger: 1.5, element: 'EARTH', colorHex: '#FBBF24', icon: '🔔' }),
    spell('bellringer_mallet', { templateId: 'spell_big_top_finale', name: 'Big Top Finale', exercise: 'CLEAN_AND_PRESS', reps: 5, rarity: 'legendary', target: 'ALL', stagger: 1, element: 'EARTH', colorHex: '#F472B6', icon: '🎪' }),
  ],
  leviathan_anchor: [
    spell('leviathan_anchor', { templateId: 'spell_undertow', name: 'Undertow', exercise: 'GORILLA_ROW', reps: 5, rarity: 'legendary', target: 'ALL', stagger: 1, element: 'FROST', colorHex: '#2DD4BF', icon: '🌊' }),
    spell('leviathan_anchor', { templateId: 'spell_leviathans_maw', name: "Leviathan's Maw", exercise: 'SNATCH', reps: 5, rarity: 'legendary', target: 'SINGLE', shatter: true, element: 'FROST', colorHex: '#0E7490', icon: '🐋' }),
  ],
  everburning_censer: [
    spell('everburning_censer', { templateId: 'spell_sanctified_smoke', name: 'Sanctified Smoke', exercise: 'AROUND_THE_BODY', reps: 5, rarity: 'legendary', target: 'SINGLE', blockShare: 0.35, element: 'HOLY', colorHex: '#7DD3FC', icon: '💨' }),
    spell('everburning_censer', { templateId: 'spell_candlemass', name: 'Candlemass', exercise: 'SWING', reps: 6, rarity: 'legendary', target: 'ALL', element: 'HOLY', colorHex: '#FDE68A', icon: '🕯️' }),
  ],
  tolling_thunder: [
    spell('tolling_thunder', { templateId: 'spell_peal', name: 'Peal of Thunder', exercise: 'SNATCH', reps: 5, rarity: 'legendary', target: 'CHAIN', hits: 3, element: 'STORM', colorHex: '#67E8F9', icon: '⚡' }),
    spell('tolling_thunder', { templateId: 'spell_storm_toll', name: 'Storm Toll', exercise: 'CLEAN_AND_PRESS', reps: 5, rarity: 'legendary', target: 'ALL', stagger: 1, element: 'STORM', colorHex: '#93C5FD', icon: '🌩️' }),
  ],
  midas_bell: [
    spell('midas_bell', { templateId: 'spell_golden_touch', name: 'Golden Touch', exercise: 'THRUSTER', reps: 5, rarity: 'legendary', target: 'SINGLE', shatter: true, element: 'EARTH', colorHex: '#F2B636', icon: '✨' }),
    spell('midas_bell', { templateId: 'spell_treasury_rain', name: 'Treasury Rain', exercise: 'SWING', reps: 6, rarity: 'legendary', target: 'ALL', element: 'EARTH', colorHex: '#FDE68A', icon: '💰' }),
  ],
  heartforge: [
    spell('heartforge', { templateId: 'spell_quench', name: 'Quench', exercise: 'CLEAN_AND_PRESS', reps: 5, rarity: 'legendary', target: 'PIERCE', element: 'FIRE', colorHex: '#FB923C', icon: '♨️' }),
    spell('heartforge', { templateId: 'spell_titans_anvil', name: "Titan's Anvil", exercise: 'SWING', reps: 5, rarity: 'legendary', target: 'SINGLE', stagger: 1.5, element: 'FIRE', colorHex: '#EA580C', icon: '🔨' }),
  ],
  hollow_bell: [
    spell('hollow_bell', { templateId: 'spell_stare_back', name: 'Stare Back', exercise: 'SINGLE_LEG_RDL', reps: 5, rarity: 'legendary', target: 'SINGLE', shatter: true, element: 'VOID', colorHex: '#C084FC', icon: '👁️' }),
    spell('hollow_bell', { templateId: 'spell_rift_hymn', name: 'Rift Hymn', exercise: 'AROUND_THE_BODY', reps: 6, rarity: 'legendary', target: 'ALL', stagger: 1, element: 'VOID', colorHex: '#4ADE80', icon: '🎶' }),
  ],
  excalibane: [
    spell('excalibane', { templateId: 'spell_eclipse_edge', name: 'Eclipse Edge', exercise: 'SNATCH', reps: 5, rarity: 'legendary', target: 'PIERCE', element: 'VOID', colorHex: '#A78BFA', icon: '🌑' }),
    spell('excalibane', { templateId: 'spell_twin_sovereigns', name: 'Twin Sovereigns', exercise: 'CLEAN_AND_PRESS', reps: 5, rarity: 'legendary', target: 'ALL', shatter: true, element: 'VOID', colorHex: '#FBBF24', icon: '⚔️' }),
  ],
  // The Dead Weight (secret trial, Blood Cemetery): a coffin-iron bell that feeds on what it buries
  dead_weight: [
    spell('dead_weight', { templateId: 'spell_six_feet_under', name: 'Six Feet Under', exercise: 'DEADLIFT', reps: 5, rarity: 'legendary', target: 'SINGLE', healShare: 0.3, element: 'VOID', colorHex: '#E11D48', icon: '⚰️' }),
    spell('dead_weight', { templateId: 'spell_blood_moon', name: 'Blood Moon Requiem', exercise: 'SNATCH', reps: 5, rarity: 'legendary', target: 'ALL', stagger: 1, element: 'VOID', colorHex: '#9F1239', icon: '🌕' }),
  ],

  // --- Swords: blade arts ---
  knight_sword: [
    spell('knight_sword', { templateId: 'spell_kettleburne_oath', name: "Kettleburne's Oath", exercise: 'LUNGE', reps: 4, rarity: 'common', target: 'SINGLE', blockShare: 0.35, colorHex: '#CBD5E1', icon: '🗡️' }),
  ],
  wolf_sword: [
    spell('wolf_sword', { templateId: 'spell_lunar_hunt', name: 'Lunar Hunt', exercise: 'LUNGE', reps: 5, rarity: 'common', target: 'CHAIN', hits: 2, element: 'FROST', colorHex: '#60A5FA', icon: '🐺' }),
  ],
  boar_sword: [
    spell('boar_sword', { templateId: 'spell_tusk_gore', name: 'Tusk Gore', exercise: 'SINGLE_LEG_RDL', reps: 5, rarity: 'rare', target: 'SINGLE', stagger: 1, element: 'EARTH', colorHex: '#F87171', icon: '🐗' }),
  ],
  minotaur_sword: [
    spell('minotaur_sword', { templateId: 'spell_labyrinth_execution', name: 'Labyrinth Execution', exercise: 'DEADLIFT', reps: 5, rarity: 'epic', target: 'SINGLE', shatter: true, colorHex: '#F59E0B', icon: '🐂' }),
  ],
  dragon_sword: [
    spell('dragon_sword', { templateId: 'spell_dragonheart_rend', name: 'Dragonheart Rend', exercise: 'LUNGE', reps: 5, rarity: 'legendary', target: 'PIERCE', element: 'FIRE', colorHex: '#DC2626', icon: '⚔️' }),
    spell('dragon_sword', { templateId: 'spell_scorched_earth', name: 'Scorched Earth', exercise: 'SQUAT', reps: 6, rarity: 'legendary', target: 'ALL', element: 'FIRE', colorHex: '#EA580C', icon: '🔥' }),
  ],
  void_sword: [
    spell('void_sword', { templateId: 'spell_severed_moment', name: 'Severed Moment', exercise: 'SINGLE_LEG_RDL', reps: 5, rarity: 'legendary', target: 'SINGLE', shatter: true, element: 'VOID', colorHex: '#A855F7', icon: '⏳' }),
    spell('void_sword', { templateId: 'spell_singularity_edge', name: 'Singularity Edge', exercise: 'WINDMILL', reps: 6, rarity: 'legendary', target: 'ALL', element: 'VOID', colorHex: '#7C3AED', icon: '🌑' }),
  ],
  excalibell: [
    spell('excalibell', { templateId: 'spell_heavens_smite', name: "Heaven's Smite", exercise: 'OVERHEAD_PRESS', reps: 5, rarity: 'legendary', target: 'ALL', element: 'HOLY', colorHex: '#FBBF24', icon: '⚜️' }),
    spell('excalibell', { templateId: 'spell_righteous_onslaught', name: 'Righteous Onslaught', exercise: 'SWING', reps: 5, rarity: 'legendary', target: 'CHAIN', hits: 3, element: 'HOLY', colorHex: '#F59E0B', icon: '⚔️' }),
    spell('excalibell', { templateId: 'spell_dawns_aegis', name: "Dawn's Aegis Toll", exercise: 'SQUAT', reps: 5, rarity: 'legendary', target: 'PIERCE', shatter: true, blockShare: 0.35, element: 'HOLY', colorHex: '#FDE047', icon: '🛡️' }),
  ],
};

/** Every weapon spell card, flat. */
export const ALL_WEAPON_SPELLS: CardTemplate[] = Object.values(WEAPON_SPELLS).flat();

/** Spell cards granted by a weapon (none for unknown ids, shields, armour...). */
export const spellsForWeapon = (weaponId: string | undefined): CardTemplate[] => (weaponId ? WEAPON_SPELLS[weaponId] ?? [] : []);
