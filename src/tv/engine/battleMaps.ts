/** Battle background per map. Plain data (no Pixi), so shared code and node scripts can import it. */
export const BATTLE_MAPS = {
  CATHEDRAL_CRYPT: '/assets/backgrounds/cathedral_crypt.webp',
  DARK_FOREST: '/assets/backgrounds/dark_forest.webp',
  VERDANT_FOREST: '/assets/backgrounds/verdant_forest.webp',
  OBSIDIAN_THRONE: '/assets/backgrounds/obsidian_throne.webp',
  VOLCANIC_FORGE: '/assets/backgrounds/volcanic_forge.webp',
  BLOOD_CEMETERY: '/assets/backgrounds/blood_cemetery.webp',
  SUNKEN_CISTERN: '/assets/backgrounds/sunken_cistern.webp',
  BELFRY_RAMPARTS: '/assets/backgrounds/belfry_ramparts.webp',
  ELDRITCH_ALTAR: '/assets/backgrounds/eldritch_altar.webp',
  CATHEDRAL_VAULT: '/assets/backgrounds/cathedral_vault.webp',
  TOWN_NIGHT: '/assets/backgrounds/town_night.webp',
  TOWN_SQUARE: '/assets/backgrounds/town_square.webp',
  GUILD_HALL: '/assets/backgrounds/guild_hall.webp',
} as const;

/** Signature pure instrumental battle soundtrack per map. */
export const MAP_BATTLE_MUSIC = {
  VERDANT_FOREST: '/assets/music/battle_verdant_forest.mp3',
  DARK_FOREST: '/assets/music/battle_dark_forest.mp3',
  TOWN_SQUARE: '/assets/music/battle_town_square.mp3',
  TOWN_NIGHT: '/assets/music/battle_town_night.mp3',
  SUNKEN_CISTERN: '/assets/music/battle_sunken_cistern.mp3',
  CATHEDRAL_CRYPT: '/assets/music/battle_cathedral_crypt.mp3',
  BLOOD_CEMETERY: '/assets/music/battle_blood_cemetery.mp3',
  BELFRY_RAMPARTS: '/assets/music/battle_belfry_ramparts.mp3',
  CATHEDRAL_VAULT: '/assets/music/battle_cathedral_vault.mp3',
  VOLCANIC_FORGE: '/assets/music/battle_volcanic_forge.mp3',
  ELDRITCH_ALTAR: '/assets/music/battle_eldritch_altar.mp3',
  OBSIDIAN_THRONE: '/assets/music/battle_obsidian_throne.mp3',
  GUILD_HALL: '/assets/music/battle_verdant_forest.mp3',
} as const;

export function getMapBattleMusic(mapId?: string): string {
  if (mapId && mapId in MAP_BATTLE_MUSIC) {
    return MAP_BATTLE_MUSIC[mapId as keyof typeof MAP_BATTLE_MUSIC];
  }
  return MAP_BATTLE_MUSIC.VERDANT_FOREST;
}
