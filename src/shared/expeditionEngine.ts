import { BattleMapId, EncounterTemplate } from '../types/battle';
import { ENCOUNTERS } from '../types/encounters';
import { BATTLE_MAPS } from '../tv/engine/battleMaps';

export interface LevelExpeditionConfig {
  level: number; // 1 to 5
  title: string;
  subtitle: string;
  encounterIds: string[];
  goldReward: number;
  xpReward: number;
}

export interface CampaignMapConfig {
  id: BattleMapId;
  name: string;
  act: string;
  actNumber: number;
  levelRange: string;
  recommendedPlayerLevel: number;
  theme: string;
  description: string;
  background: string;
  bossName: string;
  levels: LevelExpeditionConfig[];
}

/**
 * 11 Full Campaign Maps in chronological progression order.
 */
export const CAMPAIGN_MAP_ORDER: BattleMapId[] = [
  'VERDANT_FOREST',
  'DARK_FOREST',
  'TOWN_SQUARE',
  'SUNKEN_CISTERN',
  'CATHEDRAL_CRYPT',
  'BLOOD_CEMETERY',
  'BELFRY_RAMPARTS',
  'CATHEDRAL_VAULT',
  'VOLCANIC_FORGE',
  'ELDRITCH_ALTAR',
  'OBSIDIAN_THRONE',
];

/** Map position in the campaign, 0-based (TOWN_NIGHT shares TOWN_SQUARE's). */
export function mapTier(map: BattleMapId | undefined): number {
  if (!map) return 0;
  if (map === 'TOWN_NIGHT') return CAMPAIGN_MAP_ORDER.indexOf('TOWN_SQUARE');
  return Math.max(0, CAMPAIGN_MAP_ORDER.indexOf(map));
}

/**
 * Knight level a stage is balanced for (src/shared/stageScaling.ts): 4 levels per map, 1 per expedition
 * level within it.
 */
export const recommendedLevel = (map: BattleMapId | undefined, level = 1) => 1 + 4 * mapTier(map) + (level - 1);

/**
 * Builds 5 progressive level expeditions for any given map from its curated encounter pool.
 */
function buildMapLevels(
  poolIds: string[],
  baseGold: number,
  baseXp: number,
  bossTitle: string
): LevelExpeditionConfig[] {
  const ids = poolIds;
  const count = ids.length;
  const e = (index: number) => ids[Math.min(index, count - 1)];

  return [
    {
      level: 1,
      title: 'Outer Reconnaissance',
      subtitle: '3 Skirmishes • Introductory Scout',
      encounterIds: [e(0), e(1), e(2)],
      goldReward: baseGold,
      xpReward: baseXp,
    },
    {
      level: 2,
      title: 'Deep Incursion',
      subtitle: '4 Encounters • Patrol Packs',
      encounterIds: [e(1), e(2), e(3), e(4)],
      goldReward: Math.round(baseGold * 1.3),
      xpReward: Math.round(baseXp * 1.3),
    },
    {
      level: 3,
      title: 'Stronghold Breach',
      subtitle: '4 Encounters • Veteran Squads',
      encounterIds: [e(3), e(4), e(5), e(6)],
      goldReward: Math.round(baseGold * 1.7),
      xpReward: Math.round(baseXp * 1.7),
    },
    {
      level: 4,
      title: "Champion's Gauntlet",
      subtitle: '4 Encounters • Elite Affix Fiends',
      encounterIds: [e(5), e(6), e(7), e(8)],
      goldReward: Math.round(baseGold * 2.2),
      xpReward: Math.round(baseXp * 2.2),
    },
    {
      level: 5,
      title: bossTitle,
      subtitle: '5 Encounters • APEX BOSS CLASH',
      encounterIds: [e(5), e(6), e(7), e(8), e(count - 1)],
      goldReward: Math.round(baseGold * 3.0),
      xpReward: Math.round(baseXp * 3.0),
    },
  ];
}

const TOWN_ENCOUNTER_IDS = [
  'town_alley_rat',
  'town_burglar',
  'town_rabid_stray',
  'town_rooftop_flier',
  'town_tavern_brawler',
  'town_chapel_risen',
  'town_clock_ghost',
  'town_hedge_warlock',
  'town_street_zealot',
  'town_rogue_bard',
  'town_duelist_minstrel',
  'town_circus_rampage',
];

/**
 * Registry of all 11 Campaign Maps with verified encounter IDs from ENCOUNTERS catalog.
 */
export const CAMPAIGN_MAPS: Record<BattleMapId, CampaignMapConfig> = {
  VERDANT_FOREST: {
    id: 'VERDANT_FOREST',
    name: 'VERDANT FOREST',
    act: 'ACT I',
    actNumber: 1,
    levelRange: 'LVL 1–4',
    recommendedPlayerLevel: 1,
    theme: 'Wild Woodlands & Sylvan Thickets',
    description: 'Overgrown pines teeming with savage tuskers, goblin scavengers, and ancient grove sentinels.',
    background: BATTLE_MAPS.VERDANT_FOREST,
    bossName: 'Apex Hunt: Troll Warlord',
    levels: buildMapLevels(
      [
        'verdant_forager',
        'verdant_boar',
        'verdant_goblin',
        'verdant_timber_pack',
        'verdant_canopy',
        'verdant_raiders',
        'verdant_grove_apex',
        'verdant_sylvan_sentinels',
        'verdant_spore_glade',
        'verdant_troll_warlord',
      ],
      80,
      120,
      'Apex: Troll Warlord'
    ),
  },

  DARK_FOREST: {
    id: 'DARK_FOREST',
    name: 'DARK FOREST',
    act: 'ACT I',
    actNumber: 1,
    levelRange: 'LVL 4–7',
    recommendedPlayerLevel: 4,
    theme: 'Corrupted Briars & Bloodwood Pines',
    description: 'Moonless twisted timber haunted by nightmare stags, thorn stalkers, and ancient treants.',
    background: BATTLE_MAPS.DARK_FOREST,
    bossName: 'Apex Hunt: Ancient Treant',
    levels: buildMapLevels(
      [
        'dark_brood_weaver',
        'dark_thorn_stalker',
        'dark_rot_boar',
        'dark_night_flier',
        'dark_shadow_prowlers',
        'dark_corrupted_spores',
        'dark_briar_cabal',
        'dark_nightmare_stag',
        'dark_dire_bear',
        'dark_ancient_treant',
      ],
      120,
      180,
      'Apex: Ancient Treant'
    ),
  },

  TOWN_SQUARE: {
    id: 'TOWN_SQUARE',
    name: 'TOWN SQUARE',
    act: 'ACT II',
    actNumber: 2,
    levelRange: 'LVL 7–10',
    recommendedPlayerLevel: 7,
    theme: 'Besieged City Streets & Market Alleys',
    description: 'Rats scurry across cobbles as raiders and rogue sellswords besiege the citadel outer walls.',
    background: BATTLE_MAPS.TOWN_SQUARE,
    bossName: 'Apex Rampage: Circus Bear & Minstrel',
    levels: buildMapLevels(TOWN_ENCOUNTER_IDS, 160, 250, 'Circus Rampage'),
  },

  TOWN_NIGHT: {
    id: 'TOWN_NIGHT',
    name: 'TOWN NIGHT',
    act: 'ACT II',
    actNumber: 2,
    levelRange: 'LVL 7–10',
    recommendedPlayerLevel: 7,
    theme: 'Besieged City Streets & Market Alleys (Night)',
    description: 'Shadows envelope the market streets under the moonlit siege.',
    background: BATTLE_MAPS.TOWN_NIGHT,
    bossName: 'Apex Rampage: Circus Bear & Minstrel',
    levels: buildMapLevels(TOWN_ENCOUNTER_IDS, 160, 250, 'Circus Rampage'),
  },

  SUNKEN_CISTERN: {
    id: 'SUNKEN_CISTERN',
    name: 'SUNKEN CISTERN',
    act: 'ACT II',
    actNumber: 2,
    levelRange: 'LVL 10–12',
    recommendedPlayerLevel: 10,
    theme: 'Flooded Aqueducts & Abyssal Sluices',
    description: 'Submerged stone tunnels where tidal monstrosities, armored crabs, and leviathans nest.',
    background: BATTLE_MAPS.SUNKEN_CISTERN,
    bossName: 'Apex Hunt: Abyssal Kraken',
    levels: buildMapLevels(
      [
        'cistern_ooze',
        'cistern_sewer_rat',
        'cistern_tidal_crab',
        'cistern_mire_scuttler',
        'cistern_lizard_skirmisher',
        'cistern_dredge_beetle',
        'cistern_water_elemental',
        'cistern_mud_troll',
        'cistern_deep_cultist',
        'cistern_abyssal_deepjaw',
        'cistern_kraken_terror',
      ],
      200,
      320,
      'Apex: Abyssal Kraken'
    ),
  },

  CATHEDRAL_CRYPT: {
    id: 'CATHEDRAL_CRYPT',
    name: 'CATHEDRAL CRYPT',
    act: 'ACT III',
    actNumber: 3,
    levelRange: 'LVL 12–14',
    recommendedPlayerLevel: 12,
    theme: 'Sacred Catacombs & Osseous Sepulchers',
    description: 'Tombs of forgotten clerics haunted by undying sentries, wraiths, and lich archmages.',
    background: BATTLE_MAPS.CATHEDRAL_CRYPT,
    bossName: 'Apex Hunt: Lich Archmage',
    levels: buildMapLevels(
      [
        'crypt_cave_bat',
        'crypt_filth_rat',
        'crypt_scuttler',
        'crypt_undying_sentry',
        'crypt_grave_marksmen',
        'crypt_tomb_weaver',
        'crypt_corpse_ooze',
        'crypt_catacomb_patrol',
        'crypt_dread_cavalier',
        'crypt_bone_monstrosity',
        'crypt_lich_archmage',
      ],
      240,
      400,
      'Apex: Lich Archmage'
    ),
  },

  BLOOD_CEMETERY: {
    id: 'BLOOD_CEMETERY',
    name: 'BLOOD CEMETERY',
    act: 'ACT III',
    actNumber: 3,
    levelRange: 'LVL 12–15',
    recommendedPlayerLevel: 12,
    theme: 'Crimson Moon Graveyard & Mausoleums',
    description: 'The earth weeps blood under a blood-red moon as colossal grave abominations rise from sleep.',
    background: BATTLE_MAPS.BLOOD_CEMETERY,
    bossName: 'Apex Hunt: Grave Colossus',
    levels: buildMapLevels(
      [
        'cemetery_lone_predator',
        'cemetery_spectral_flame',
        'cemetery_blood_bat',
        'cemetery_carrion_pack',
        'cemetery_haunting_specter',
        'cemetery_grave_risen',
        'cemetery_grave_necromancer',
        'cemetery_chilling_phantasm',
        'cemetery_black_cavalier',
        'cemetery_grave_colossus',
      ],
      280,
      480,
      'Apex: Grave Colossus'
    ),
  },

  BELFRY_RAMPARTS: {
    id: 'BELFRY_RAMPARTS',
    name: 'BELFRY RAMPARTS',
    act: 'ACT IV',
    actNumber: 4,
    levelRange: 'LVL 14–16',
    recommendedPlayerLevel: 14,
    theme: 'Gargoyle Parapets & Storm-Lashed Towers',
    description: 'Vicious gale winds roar across dizzying ramparts defended by winged harpies and stone sentinels.',
    background: BATTLE_MAPS.BELFRY_RAMPARTS,
    bossName: 'Apex Hunt: Storm Vanguard',
    levels: buildMapLevels(
      [
        'belfry_flier',
        'belfry_harbinger',
        'belfry_wall_patrol',
        'belfry_stone_gargoyle',
        'belfry_cliff_harpy',
        'belfry_war_hound',
        'belfry_weathered_spire',
        'belfry_duelist',
        'belfry_tempest_screecher',
        'belfry_fallen_champion',
        'belfry_storm_vanguard',
      ],
      320,
      560,
      'Apex: Storm Vanguard'
    ),
  },

  CATHEDRAL_VAULT: {
    id: 'CATHEDRAL_VAULT',
    name: 'CATHEDRAL VAULT',
    act: 'ACT IV',
    actNumber: 4,
    levelRange: 'LVL 16–18',
    recommendedPlayerLevel: 16,
    theme: 'Armored Automaton Vaults & Treasury',
    description: 'Golden relics guarded by steam-powered iron automata, enchanted hounds, and horned minotaurs.',
    background: BATTLE_MAPS.CATHEDRAL_VAULT,
    bossName: 'Apex Hunt: Automaton Overlord',
    levels: buildMapLevels(
      [
        'vault_sentry_hound',
        'vault_weaver',
        'vault_gilded_cavalier',
        'vault_stone_colossus',
        'vault_gargoyle_watch',
        'vault_automaton',
        'vault_runic_golem',
        'vault_templar_patrol',
        'vault_arcane_warden',
        'vault_horned_crusher',
        'vault_sovereign_trio',
      ],
      360,
      640,
      'Apex: Vault Overlord'
    ),
  },

  VOLCANIC_FORGE: {
    id: 'VOLCANIC_FORGE',
    name: 'VOLCANIC FORGE',
    act: 'ACT V',
    actNumber: 5,
    levelRange: 'LVL 18–20',
    recommendedPlayerLevel: 18,
    theme: 'Molten Basalt & Brimstone Caldera',
    description: 'Rivers of boiling magma where cinder imps dance and inferno titans forge weapons of destruction.',
    background: BATTLE_MAPS.VOLCANIC_FORGE,
    bossName: 'Apex Hunt: Magma Dragon',
    levels: buildMapLevels(
      [
        'forge_cinder_imp',
        'forge_cinder_bat',
        'forge_magma_sludge',
        'forge_ember_serpent',
        'forge_scoria_beetle',
        'forge_brimstone_boar',
        'forge_hellhound',
        'forge_ash_inquisitor',
        'forge_magma_golem',
        'forge_inferno_titan',
        'forge_magma_dragon',
      ],
      400,
      740,
      'Apex: Magma Dragon'
    ),
  },

  ELDRITCH_ALTAR: {
    id: 'ELDRITCH_ALTAR',
    name: 'ELDRITCH ALTAR',
    act: 'ACT V',
    actNumber: 5,
    levelRange: 'LVL 20–22',
    recommendedPlayerLevel: 20,
    theme: 'Sacrificial Void Rift & Abyssal Circle',
    description: 'A tearing rift in cosmic space where void prophets commune with elder monstrosities.',
    background: BATTLE_MAPS.ELDRITCH_ALTAR,
    bossName: 'Apex Hunt: Eldritch Horror',
    levels: buildMapLevels(
      [
        'altar_devotee',
        'altar_corrupted_priest',
        'altar_tormented_souls',
        'altar_shadow_caster',
        'altar_void_phantom',
        'altar_abyssal_fanatic',
        'altar_astral_stag',
        'altar_void_bone_amalgam',
        'altar_arch_prophet',
        'altar_archbishop_ash',
        'altar_cthulhu_incarnate',
      ],
      450,
      850,
      'Apex: Eldritch Horror'
    ),
  },

  OBSIDIAN_THRONE: {
    id: 'OBSIDIAN_THRONE',
    name: 'OBSIDIAN THRONE',
    act: 'ACT VI',
    actNumber: 6,
    levelRange: 'LVL 22–25',
    recommendedPlayerLevel: 22,
    theme: 'Imperial Citadel of the Ruined Sovereign',
    description: 'The pinnacle of the dark realm where The Dark Emperor awaits all challengers on his basalt throne.',
    background: BATTLE_MAPS.OBSIDIAN_THRONE,
    bossName: 'Final Battle: The Dark Emperor',
    levels: buildMapLevels(
      [
        'throne_imperial_hound',
        'throne_obsidian_gargoyle',
        'throne_honor_guard',
        'throne_black_hand',
        'throne_court_chancellor',
        'throne_conqueror_colossus',
        'throne_royal_executioner',
        'throne_imperial_inquisitor',
        'throne_obsidian_juggernaut',
        'throne_court_behemoth',
        'throne_dark_emperor_climax',
      ],
      500,
      1000,
      'Apex: The Dark Emperor'
    ),
  },
};

// Level ranges follow the stage curve, not hand-typed numbers
for (const cfg of Object.values(CAMPAIGN_MAPS)) {
  cfg.recommendedPlayerLevel = recommendedLevel(cfg.id, 1);
  cfg.levelRange = `LVL ${recommendedLevel(cfg.id, 1)}–${recommendedLevel(cfg.id, 5)}`;
}

/**
 * Helper to fetch a map's full configuration.
 */
export function getMapConfig(mapId: BattleMapId): CampaignMapConfig {
  return CAMPAIGN_MAPS[mapId] || CAMPAIGN_MAPS.VERDANT_FOREST;
}

/**
 * Returns the next map to unlock in campaign order after conquering currentMapId.
 */
export function getNextCampaignMap(currentMapId: BattleMapId): BattleMapId | null {
  const currentIndex = CAMPAIGN_MAP_ORDER.indexOf(currentMapId);
  if (currentIndex === -1 || currentIndex >= CAMPAIGN_MAP_ORDER.length - 1) {
    return null; // Completed final map!
  }
  return CAMPAIGN_MAP_ORDER[currentIndex + 1];
}

/**
 * The furthest stage the player can fight: the last unlocked map in campaign order, at the level after its
 * highest clear (capped at the map's final level). Used by the hub's Quick Play.
 */
export function latestUnlockedStage(
  profile: { unlockedMaps?: BattleMapId[]; mapProgress?: Record<string, { highestLevelCleared: number }> } | null,
): { mapId: BattleMapId; level: number } {
  const unlocked = profile?.unlockedMaps ?? [];
  const mapId = [...CAMPAIGN_MAP_ORDER].reverse().find((m) => unlocked.includes(m)) ?? 'VERDANT_FOREST';
  const cleared = profile?.mapProgress?.[mapId]?.highestLevelCleared ?? 0;
  return { mapId, level: Math.min(cleared + 1, getMapConfig(mapId).levels.length) };
}

/**
 * Resolves full EncounterTemplate objects for a given (mapId, level).
 */
export function getExpeditionEncounters(mapId: BattleMapId, level: number): EncounterTemplate[] {
  const mapConfig = getMapConfig(mapId);
  const lvlConfig = mapConfig.levels.find((l) => l.level === level) || mapConfig.levels[0];

  const results: EncounterTemplate[] = [];
  for (const encId of lvlConfig.encounterIds) {
    const enc = ENCOUNTERS.find((e) => e.id === encId);
    if (enc) {
      results.push(enc);
    }
  }
  return results;
}
