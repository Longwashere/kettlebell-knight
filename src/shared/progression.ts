/**
 * Knight progression: stats, level-ups, experience, spell and weapon levels, and binding a card to a
 * knight (turning its scaling into real numbers). Pure, so the TV battle screen and the balance
 * simulator (scripts/balance-sim.ts) share it.
 *
 * Two ways past a hard stage, by design:
 * - out-level it: experience (granted per kill, win or lose) raises STR / HP / SPD; casting a card levels
 *   it up; fighting with a weapon levels the weapon; gold and levels buy better weapons.
 * - out-exercise it: the cast multiplier (src/shared/combat.ts castMultiplier) pays up to ×1.5 for
 *   explosive reps, and faster reps cast more often.
 *
 *   Attack  = STR + weapon Attack × weapon level
 *   damage  = card % × Attack × card level  (+ card % × weapon elemental damage, its own element)
 *   Block / heal = card % × max HP × card level
 *   reps    = base reps × (1 − SPD rep cut), at most 30% fewer
 */
import type { CardTemplate, CombatCard } from '../types/battle';
import type { Element } from './elements';
import { describeCard } from './cardBalance';
import { SHOP_ITEMS } from './shopItems';

export type StatKey = 'str' | 'hp' | 'spd';

export interface KnightStats {
  str: number;
  hp: number;
  spd: number;
}

export const BASE_STATS: KnightStats = { str: 20, hp: 100, spd: 0 };
export const MAX_LEVEL = 50;

export const STAT_INFO: Record<StatKey, { label: string; icon: string; color: string; hint: string }> = {
  str: { label: 'STR', icon: '⚔', color: '#FF3366', hint: 'Attack: every card hits for a % of it' },
  hp: { label: 'HP', icon: '♥', color: '#00EB88', hint: 'Max health; Block and heals scale with it' },
  spd: { label: 'SPD', icon: '➶', color: '#38B6FF', hint: 'Fewer reps per card and a chance to dodge' },
};

// --- Speed ---------------------------------------------------------------------------------------

/** SPD at which both of its effects are capped. */
export const SPD_CAP = 20;
export const MAX_REP_CUT = 0.3;
export const MAX_DODGE = 0.2;

/** Share of each card's reps removed by Speed (1.5% per point, at most 30%). */
export const repCut = (spd: number) => Math.min(MAX_REP_CUT, Math.max(0, spd) * (MAX_REP_CUT / SPD_CAP));
/** Chance a monster's attack misses entirely (1% per point, at most 20%). */
export const dodgeChance = (spd: number) => Math.min(MAX_DODGE, Math.max(0, spd) * (MAX_DODGE / SPD_CAP));

// --- Levels and experience -----------------------------------------------------------------------

/**
 * How much one level-up adds to the stat it lands on. STR and HP grow by a share of themselves, so a
 * level is worth about as much at level 40 as at level 4 (and late stages can keep growing); SPD adds
 * flat points up to its cap.
 */
export const STAT_GROWTH = { str: 0.15, hp: 0.12, spd: 3, minStr: 2, minHp: 10 };
export function statGain(stat: StatKey, stats: KnightStats): number {
  if (stat === 'str') return Math.max(STAT_GROWTH.minStr, Math.round(stats.str * STAT_GROWTH.str));
  if (stat === 'hp') return Math.max(STAT_GROWTH.minHp, Math.round(stats.hp * STAT_GROWTH.hp));
  return Math.min(STAT_GROWTH.spd, SPD_CAP - stats.spd);
}

/** The stats a level-up can land on: SPD drops out once capped. */
const rollable = (stats: KnightStats): StatKey[] => (stats.spd >= SPD_CAP ? ['str', 'hp'] : ['str', 'hp', 'spd']);

/**
 * Each level-up raises one random stat. The pick comes from a shuffled bag holding each stat once, so
 * the order is random but no stat is starved for long.
 */
export function rollLevelUp(
  stats: KnightStats,
  bag: StatKey[] | undefined,
  rng: () => number = Math.random,
): { stat: StatKey; gain: number; stats: KnightStats; bag: StatKey[] } {
  const allowed = rollable(stats);
  let pool = (bag ?? []).filter((s) => allowed.includes(s));
  if (pool.length === 0) pool = [...allowed];
  const stat = pool[Math.floor(rng() * pool.length)];
  const gain = statGain(stat, stats);
  return {
    stat,
    gain,
    stats: { ...stats, [stat]: stats[stat] + gain },
    bag: pool.filter((s, i) => i !== pool.indexOf(stat)),
  };
}

// --- Spell (card) and weapon levels --------------------------------------------------------------

export const CARD_MAX_LEVEL = 10;
/** Casts needed to reach `level`: 3, 9, 18, 30, 45 ... 135. */
export const castsForCardLevel = (level: number) => (3 * (level - 1) * level) / 2;
/** Damage, Block and heal per card level above 1. */
export const CARD_LEVEL_BONUS = 0.05;
export const cardLevelMultiplier = (level: number) => 1 + CARD_LEVEL_BONUS * (level - 1);

export const WEAPON_MAX_LEVEL = 10;
/** Cards cast with the weapon equipped to reach `level`: 10, 30, 60, 100 ... 450. */
export const castsForWeaponLevel = (level: number) => (10 * (level - 1) * level) / 2;
/** Weapon Attack and elemental damage per weapon level above 1. */
export const WEAPON_LEVEL_BONUS = 0.06;
export const weaponLevelMultiplier = (level: number) => 1 + WEAPON_LEVEL_BONUS * (level - 1);

function levelFromCasts(casts: number, castsFor: (l: number) => number, max: number): number {
  let level = 1;
  while (level < max && casts >= castsFor(level + 1)) level++;
  return level;
}
export const cardLevel = (casts = 0) => levelFromCasts(casts, castsForCardLevel, CARD_MAX_LEVEL);
export const weaponLevel = (casts = 0) => levelFromCasts(casts, castsForWeaponLevel, WEAPON_MAX_LEVEL);

/** Progress toward the next level, 0–1 (1 at max). */
export function levelProgress(casts: number, castsFor: (l: number) => number, max: number): number {
  const level = levelFromCasts(casts, castsFor, max);
  if (level >= max) return 1;
  const from = castsFor(level);
  return (casts - from) / (castsFor(level + 1) - from);
}

// --- Weapons -------------------------------------------------------------------------------------

/**
 * Weapon damage by tier (SHOP_ITEMS level, 1–10), as a share of the STR a knight is expected to have
 * when the tier unlocks: a new weapon adds half again to Attack, and fades as the knight outgrows it.
 * Plain steel brings the most raw Attack; an elemental weapon brings less Attack plus elemental damage,
 * worth 90% of plain steel against a neutral foe, 120% against one weak to it and 66% against one that
 * resists it.
 */
export const WEAPON_BALANCE = { plainAtk: 0.5, elemAtk: 0.15, elemDmg: 0.3 };

/** Knight level needed to wield a weapon of `tier`: 1, 4, 8, 12 ... 36. */
export const weaponLevelReq = (tier: number) => Math.max(1, 4 * (tier - 1));

export interface WeaponStats {
  tier: number;
  level: number;
  atk: number;
  elemDmg: number;
  element?: Element;
}

/** `tierOverride`: a hypothetical weapon of that tier (the expected-knight model). */
export function weaponStats(weaponId: string | undefined, level = 1, tierOverride?: number): WeaponStats {
  const item = SHOP_ITEMS.find((i) => i.id === weaponId && i.slot === 'weapon');
  const tier = tierOverride ?? item?.level ?? 1;
  const base = expectedStats(weaponLevelReq(tier)).str * weaponLevelMultiplier(level);
  if (item?.element) {
    return {
      tier,
      level,
      atk: Math.round(WEAPON_BALANCE.elemAtk * base),
      elemDmg: Math.round(WEAPON_BALANCE.elemDmg * base),
      element: item.element,
    };
  }
  return { tier, level, atk: Math.round(WEAPON_BALANCE.plainAtk * base), elemDmg: 0 };
}

// --- Loadout: everything combat needs from a knight ----------------------------------------------

export interface Loadout {
  level: number;
  stats: KnightStats;
  weaponId?: string;
  weapon: WeaponStats;
  /** STR + weapon Attack. */
  attack: number;
  maxHp: number;
  repCut: number;
  dodge: number;
  /** Casts per card templateId (spell levels). */
  cardCasts: Record<string, number>;
}

export interface LoadoutSource {
  level?: number;
  stats?: KnightStats;
  weaponId?: string;
  cardCasts?: Record<string, number>;
  weaponCasts?: Record<string, number>;
}

export function buildLoadout(src: LoadoutSource = {}): Loadout {
  const stats = src.stats ?? BASE_STATS;
  const weapon = weaponStats(src.weaponId, weaponLevel(src.weaponId ? src.weaponCasts?.[src.weaponId] : 0));
  return {
    level: src.level ?? 1,
    stats,
    weaponId: src.weaponId,
    weapon,
    attack: stats.str + weapon.atk,
    maxHp: stats.hp,
    repCut: repCut(stats.spd),
    dodge: dodgeChance(stats.spd),
    cardCasts: src.cardCasts ?? {},
  };
}

/**
 * A card template with this knight's numbers: reps cut by Speed, damage from Attack, Block and heal
 * from max HP, all raised by the card's level, plus the weapon's elemental damage on each hit.
 *
 * Reps are whole, so Speed's cut is rounded up (never past the 30% cap) and the part of the cut lost to
 * rounding comes back as damage: SPD is worth the same to a 4-rep card as to an 8-rep one.
 */
export function bindCard<T extends CardTemplate>(template: T, loadout: Loadout): T {
  const level = cardLevel(loadout.cardCasts[template.templateId]);
  const baseReps = template.baseReps ?? template.requiredReps;
  const idealReps = baseReps * (1 - loadout.repCut);
  const requiredReps = Math.max(1, Math.ceil(idealReps - 1e-9));
  const tempo = requiredReps / idealReps; // ≥ 1: the rounding loss, paid back as power
  const mult = cardLevelMultiplier(level) * tempo;
  const damage = Math.round(template.dmgPct * loadout.attack * mult);
  const w = loadout.weapon;
  const infusion = w.element && w.elemDmg > 0 && damage > 0
    ? { element: w.element, damage: Math.max(1, Math.round(template.dmgPct * w.elemDmg * mult)) }
    : undefined;
  const bound: T = {
    ...template,
    level,
    baseReps,
    requiredReps,
    damage,
    infusion,
    block: Math.round(template.blockPct * loadout.maxHp * mult),
    heal: Math.round(template.healPct * loadout.maxHp * mult),
  };
  bound.effectDesc = describeCard(bound);
  return bound;
}

/** Same as bindCard for a live card in hand: keeps its id and rep progress. */
export function rebindCard(card: CombatCard, template: CardTemplate, loadout: Loadout): CombatCard {
  return { ...bindCard(template, loadout), id: card.id, currentReps: card.currentReps, powerSum: card.powerSum, formSum: card.formSum };
}

// --- The expected knight -------------------------------------------------------------------------

/**
 * A knight who has levelled normally to `level`: stats from an even split of level-ups, the best weapon
 * its level allows at weapon level 4, and its cards at the level that much fighting gives them. Stages
 * (src/shared/stageScaling.ts) are scaled to this knight at their recommended level, so levelling is
 * always a way through.
 */
export const EXPECTED_KNIGHT = { weaponLevel: 4, cardLevelsPerKnightLevel: 1 / 4 };

const expectedCache: KnightStats[] = [];
export function expectedStats(level: number): KnightStats {
  if (expectedCache[level]) return expectedCache[level];
  const stats = level <= 1 ? { ...BASE_STATS } : { ...expectedStats(level - 1) };
  if (level > 1) {
    const allowed = rollable(stats);
    for (const s of allowed) {
      const gain = s === 'spd' ? Math.min(STAT_GROWTH.spd, SPD_CAP - stats.spd) : stats[s] * STAT_GROWTH[s];
      stats[s] += gain / allowed.length;
    }
  }
  expectedCache[level] = stats;
  return stats;
}

const PLAIN_WEAPON_FOR_MODEL = 'iron_kettlebell';

/** Best weapon tier a knight of `level` may wield. */
export const expectedWeaponTier = (level: number) => Math.min(10, Math.floor(level / 4) + 1);

/** Damage output relative to Attack 1: Attack × card level, sped up by fewer reps. */
export function expectedPower(level: number): number {
  const stats = expectedStats(level);
  const tier = expectedWeaponTier(level);
  const attack = stats.str + weaponStats(PLAIN_WEAPON_FOR_MODEL, EXPECTED_KNIGHT.weaponLevel, tier).atk;
  const card = cardLevelMultiplier(Math.min(CARD_MAX_LEVEL, 1 + (level - 1) * EXPECTED_KNIGHT.cardLevelsPerKnightLevel));
  return (attack * card) / (1 - repCut(stats.spd));
}

/** Damage the knight can take: max HP, stretched by dodging. */
export function expectedToughness(level: number): number {
  const stats = expectedStats(level);
  return stats.hp / (1 - dodgeChance(stats.spd));
}
