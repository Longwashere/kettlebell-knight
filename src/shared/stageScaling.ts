/**
 * Stage difficulty and experience. A stage is one expedition level: map (in campaign order) × level 1–5.
 *
 * Monster HP and damage come from one curve. Each stage's encounters are first normalized to the same
 * average toughness (bestiary HP and moveset damage differ a lot between stages; who is strong within
 * an encounter is kept), then scaled to a knight at the stage's recommended level
 * (src/shared/progression.ts expectedPower / expectedToughness), times a ramp that makes every map a
 * little harder even for that knight:
 *
 *   recommended level = 1 + 4 × map + (level − 1)        (map 0 = Verdant Forest)
 *   monster HP  ∝ expectedPower(recommended)     × STAGE_BALANCE.hpRamp ^ map
 *   monster dmg ∝ expectedToughness(recommended) × STAGE_BALANCE.dmgRamp ^ map
 *
 * So the numbers jump every map (a fresh map's monsters hit ~1.3× harder and last ~1.4× longer than the
 * last map's), and the way through is levels, spells, weapons, or working harder than the average knight.
 * Tune with `npm run balance` (scripts/balance-sim.ts) and keep its targets.
 */
import { ENCOUNTERS, type BattleMapId, type EncounterTemplate } from '../types/battle';
import { MOVESETS, createEncounterFromTemplate, type StageScaling } from './monsterMovesets';
import { CAMPAIGN_MAP_ORDER, getMapConfig, mapTier, recommendedLevel } from './expeditionEngine';

export { mapTier, recommendedLevel };
import { expectedPower, expectedToughness } from './progression';

export const STAGE_BALANCE = {
  /** Monster HP and damage at the first stage, relative to the bestiary's average encounter. */
  hp: 0.8,
  dmg: 0.75,
  /** Extra monster HP per map, on top of following the expected knight. */
  hpRamp: 1.015,
  /** Extra monster damage per map. */
  dmgRamp: 1.01,
  /** Experience per point of monster max HP. */
  xpPerHp: 0.1,
  /** Clearing an expedition level grants this share of its monsters' experience again. */
  clearBonus: 0.3,
  /** Experience to the next level = this × the HP a monster at that recommended level has, per base HP. */
  xpBase: 155,
};

/** Average total HP and damage per second of an encounter list, before stage scaling. */
function encounterNorm(encounters: EncounterTemplate[]): { hp: number; dps: number } {
  let hp = 0;
  let dps = 0;
  for (const e of encounters) {
    for (const m of createEncounterFromTemplate(e)) {
      const moves = MOVESETS[m.id] ?? MOVESETS.green_slime;
      const dmg = moves.reduce((sum, t) => sum + t.damage, 0);
      const secs = moves.reduce((sum, t) => sum + t.durationSeconds, 0);
      hp += m.maxHp;
      dps += (dmg / secs) * (m.damageScale ?? 1);
    }
  }
  const n = Math.max(1, encounters.length);
  return { hp: hp / n, dps: dps / n };
}

const stageNorms = new Map<string, { hp: number; dps: number }>();
/** A stage's average encounter (an expedition level), or a map's for encounters outside expeditions. */
function stageNorm(tier: number, level: number): { hp: number; dps: number } {
  const key = `${tier}:${level}`;
  let norm = stageNorms.get(key);
  if (!norm) {
    const map = CAMPAIGN_MAP_ORDER[tier];
    const ids = getMapConfig(map).levels.find((l) => l.level === level)?.encounterIds
      ?? getMapConfig(map).levels.flatMap((l) => l.encounterIds);
    norm = encounterNorm(ENCOUNTERS.filter((e) => ids.includes(e.id)));
    stageNorms.set(key, norm);
  }
  return norm;
}

/** The bestiary's average encounter over the whole campaign: what STAGE_BALANCE.hp/dmg are relative to. */
let campaignNorm: { hp: number; dps: number } | null = null;
function referenceNorm(): { hp: number; dps: number } {
  if (!campaignNorm) {
    const all = CAMPAIGN_MAP_ORDER.flatMap((_, t) => [1, 2, 3, 4, 5].map((l) => stageNorm(t, l)));
    campaignNorm = { hp: all.reduce((s, n) => s + n.hp, 0) / all.length, dps: all.reduce((s, n) => s + n.dps, 0) / all.length };
  }
  return campaignNorm;
}

const BASE_POWER = expectedPower(1);
const BASE_TOUGHNESS = expectedToughness(1);

/** Multipliers for a stage's monsters (createEncounterFromTemplate). */
export function stageScaling(map: BattleMapId | undefined, level = 1): StageScaling {
  const tier = mapTier(map);
  const rec = recommendedLevel(map, level);
  const ref = referenceNorm();
  const own = stageNorm(tier, Math.max(1, Math.min(5, level)));
  const hp = STAGE_BALANCE.hp * (ref.hp / own.hp) * (expectedPower(rec) / BASE_POWER) * Math.pow(STAGE_BALANCE.hpRamp, tier);
  return {
    hp,
    damage: STAGE_BALANCE.dmg * (ref.dps / own.dps) * (expectedToughness(rec) / BASE_TOUGHNESS) * Math.pow(STAGE_BALANCE.dmgRamp, tier),
    // Monster Block guards HP, so it follows the HP curve
    block: hp,
    level: rec,
    xpPerHp: STAGE_BALANCE.xpPerHp,
  };
}

/** A stage's monsters, scaled. */
export function createStageEncounter(template: EncounterTemplate, level = 1, map: BattleMapId | undefined = template.map): ReturnType<typeof createEncounterFromTemplate> {
  return createEncounterFromTemplate(template, stageScaling(map, level));
}

/** Experience for clearing an expedition level, on top of the kills. */
export function expeditionClearXp(encounters: EncounterTemplate[], map: BattleMapId, level: number): number {
  const kills = encounters.flatMap((e) => createStageEncounter(e, level, map)).reduce((sum, m) => sum + (m.xp ?? 0), 0);
  return Math.round(kills * STAGE_BALANCE.clearBonus);
}

/**
 * Experience from `level` to the next. Follows the HP of the monsters at the stage recommended for that
 * level, so a level takes about the same number of kills on the stage it belongs to.
 */
export function xpToNext(level: number): number {
  const tierRamp = Math.pow(STAGE_BALANCE.hpRamp, (level - 1) / 4);
  return Math.round(STAGE_BALANCE.xpBase * (expectedPower(level) / BASE_POWER) * tierRamp);
}
