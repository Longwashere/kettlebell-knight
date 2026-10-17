import type { BattleMapId } from '../types/battle';
import type { ExerciseType } from '../types/game';

/**
 * The Enchanted Stone of Excalibell: a secret stage that can appear after clearing a forest expedition level.
 * The knight gets one try at `reps` goblet squats in `seconds`; success pulls Excalibell from the stone,
 * failure sends them back to town. The stone stops appearing once Excalibell is won.
 */
export const EXCALIBELL_TRIAL = {
  weaponId: 'excalibell',
  exercise: 'SQUAT' as ExerciseType,
  reps: 100,
  seconds: 60,
  /** Chance to meet the stone after a level clear on `maps`, plus `chancePerSquat` per squat done that level. */
  baseChance: 0.1,
  chancePerSquat: 0.01,
  maps: ['VERDANT_FOREST', 'DARK_FOREST'] as BattleMapId[],
  /** Every knight meets the stone on clearing this stage if they haven't met it already. */
  guaranteed: { mapId: 'DARK_FOREST' as BattleMapId, level: 1 },
};

/** Saved on the profile: how often the stone appeared and whether Excalibell was pulled. */
export interface ExcalibellTrialRecord {
  encounters: number;
  won: boolean;
}

export const excalibellTrialChance = (squats: number) =>
  Math.min(1, EXCALIBELL_TRIAL.baseChance + EXCALIBELL_TRIAL.chancePerSquat * Math.max(0, squats));

/** Whether clearing `mapId` level `level` with `squats` goblet squats leads to the stone. */
export function rollExcalibellTrial(
  profile: { excalibellTrial?: ExcalibellTrialRecord; unlockedItems?: string[]; equippedItems?: { weapon?: string } } | null,
  mapId: BattleMapId,
  level: number,
  squats: number,
  rand: () => number = Math.random,
): boolean {
  if (!profile) return false;
  // Already holds Excalibell (won, bought before it was sealed, or equipped): the stone never appears
  const id = EXCALIBELL_TRIAL.weaponId;
  if (profile.excalibellTrial?.won || profile.unlockedItems?.includes(id) || profile.equippedItems?.weapon === id) return false;
  if (!EXCALIBELL_TRIAL.maps.includes(mapId)) return false;
  const g = EXCALIBELL_TRIAL.guaranteed;
  if (mapId === g.mapId && level === g.level && !profile.excalibellTrial?.encounters) return true;
  return rand() < excalibellTrialChance(squats);
}
