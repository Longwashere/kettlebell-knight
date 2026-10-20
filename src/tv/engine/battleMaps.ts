import { ASSET_ROOT } from '@/shared/assetRoot';
/** Battle background per map. Plain data (no Pixi), so shared code and node scripts can import it. */
export const BATTLE_MAPS = {
  CATHEDRAL_CRYPT: `${ASSET_ROOT}/backgrounds/cathedral_crypt.webp`,
  DARK_FOREST: `${ASSET_ROOT}/backgrounds/dark_forest.webp`,
  VERDANT_FOREST: `${ASSET_ROOT}/backgrounds/verdant_forest.webp`,
  OBSIDIAN_THRONE: `${ASSET_ROOT}/backgrounds/obsidian_throne.webp`,
  VOLCANIC_FORGE: `${ASSET_ROOT}/backgrounds/volcanic_forge.webp`,
  BLOOD_CEMETERY: `${ASSET_ROOT}/backgrounds/blood_cemetery.webp`,
  SUNKEN_CISTERN: `${ASSET_ROOT}/backgrounds/sunken_cistern.webp`,
  BELFRY_RAMPARTS: `${ASSET_ROOT}/backgrounds/belfry_ramparts.webp`,
  ELDRITCH_ALTAR: `${ASSET_ROOT}/backgrounds/eldritch_altar.webp`,
  CATHEDRAL_VAULT: `${ASSET_ROOT}/backgrounds/cathedral_vault.webp`,
  TOWN_NIGHT: `${ASSET_ROOT}/backgrounds/town_night.webp`,
  TOWN_SQUARE: `${ASSET_ROOT}/backgrounds/town_square.webp`,
  GUILD_HALL: `${ASSET_ROOT}/backgrounds/guild_hall.webp`,
} as const;

/** Signature pure instrumental battle soundtrack per map. */
export const MAP_BATTLE_MUSIC = {
  VERDANT_FOREST: `${ASSET_ROOT}/music/battle_verdant_forest.mp3`,
  DARK_FOREST: `${ASSET_ROOT}/music/battle_dark_forest.mp3`,
  TOWN_SQUARE: `${ASSET_ROOT}/music/battle_town_square.mp3`,
  TOWN_NIGHT: `${ASSET_ROOT}/music/battle_town_night.mp3`,
  SUNKEN_CISTERN: `${ASSET_ROOT}/music/battle_sunken_cistern.mp3`,
  CATHEDRAL_CRYPT: `${ASSET_ROOT}/music/battle_cathedral_crypt.mp3`,
  BLOOD_CEMETERY: `${ASSET_ROOT}/music/battle_blood_cemetery.mp3`,
  BELFRY_RAMPARTS: `${ASSET_ROOT}/music/battle_belfry_ramparts.mp3`,
  CATHEDRAL_VAULT: `${ASSET_ROOT}/music/battle_cathedral_vault.mp3`,
  VOLCANIC_FORGE: `${ASSET_ROOT}/music/battle_volcanic_forge.mp3`,
  ELDRITCH_ALTAR: `${ASSET_ROOT}/music/battle_eldritch_altar.mp3`,
  OBSIDIAN_THRONE: `${ASSET_ROOT}/music/battle_obsidian_throne.mp3`,
  GUILD_HALL: `${ASSET_ROOT}/music/battle_verdant_forest.mp3`,
} as const;

export function getMapBattleMusic(mapId?: string): string {
  if (mapId && mapId in MAP_BATTLE_MUSIC) {
    return MAP_BATTLE_MUSIC[mapId as keyof typeof MAP_BATTLE_MUSIC];
  }
  return MAP_BATTLE_MUSIC.VERDANT_FOREST;
}
