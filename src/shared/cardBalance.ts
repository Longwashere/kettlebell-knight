/**
 * Card balance model.
 *
 * Every card is designed from a spec (exercise, reps, rarity, targeting, extras) and its numbers are
 * derived from one budget, so the whole deck stays consistent when anything is retuned:
 *
 *   budget = reps × repSeconds × intensity × BALANCE.ratePerSecond × rarity
 *
 * - repSeconds: how long one rep takes. Slow exercises pay more per rep, so every second of work is
 *   worth the same before intensity.
 * - intensity: how demanding a second of that exercise is. Explosive full-body lifts (snatch,
 *   thruster) pay the most; mobility drills (halo, windmill) the least.
 *
 * The budget is then spent on effects, each with a price per point (BALANCE.cost). Hitting several
 * enemies costs more per point of damage than hitting one, so AOE cards deal less to each enemy.
 *
 * The points are priced for REFERENCE_KNIGHT (a new knight). A card stores them as scaling: damage as a
 * multiple of Attack (dmgPct, 2 = 200%), Block and heal as shares of max HP. src/shared/progression.ts
 * applies a knight's real stats, card level and weapon to those.
 * Run scripts/balance-sim.ts after changing anything here.
 */
import type { CardRarity, CardTarget, CardTemplate, CardType } from '../types/battle';
import type { ExerciseType } from '../types/game';
import { ELEMENT_INFO, type Element } from './elements';

/** The knight the budget is priced for: level 1 (STR 20) with the Cast Iron Bell (+10 Attack). */
export const REFERENCE_KNIGHT = { attack: 30, maxHp: 100 };

export const EXERCISE_PROFILE: Record<ExerciseType, { label: string; repSeconds: number; intensity: number }> = {
  SNATCH: { label: 'KETTLEBELL SNATCHES', repSeconds: 2.2, intensity: 1.3 },
  THRUSTER: { label: 'KETTLEBELL THRUSTERS', repSeconds: 3.0, intensity: 1.3 },
  CLEAN_AND_PRESS: { label: 'CLEAN & PRESS', repSeconds: 3.5, intensity: 1.25 },
  CLEAN: { label: 'KETTLEBELL CLEANS', repSeconds: 2.2, intensity: 1.15 },
  SWING: { label: 'KETTLEBELL SWINGS', repSeconds: 1.6, intensity: 1.15 },
  SQUAT: { label: 'GOBLET SQUATS', repSeconds: 3.0, intensity: 1.05 },
  LUNGE: { label: 'GOBLET LUNGES', repSeconds: 3.0, intensity: 1.05 },
  DEADLIFT: { label: 'DEADLIFT HINGES', repSeconds: 2.5, intensity: 1.0 },
  OVERHEAD_PRESS: { label: 'OVERHEAD PRESS', repSeconds: 2.5, intensity: 1.0 },
  GORILLA_ROW: { label: 'GORILLA ROWS', repSeconds: 2.5, intensity: 1.0 },
  SINGLE_LEG_RDL: { label: 'SINGLE-LEG RDL', repSeconds: 3.5, intensity: 0.9 },
  WINDMILL: { label: 'KETTLEBELL WINDMILLS', repSeconds: 4.5, intensity: 0.85 },
  HALO: { label: 'KETTLEBELL HALOS', repSeconds: 3.0, intensity: 0.8 },
};

export const BALANCE = {
  /** Budget points earned per second of average-intensity work. */
  ratePerSecond: 6.5,
  /** Rarer cards are slightly more efficient (they show up less often). */
  rarity: { common: 1.0, rare: 1.08, epic: 1.16, legendary: 1.25 } as Record<CardRarity, number>,
  /** Budget cost of one point of damage, by targeting. */
  damageCost: { SINGLE: 1.0, BACK: 1.1, PIERCE: 1.3, CHAIN: 0.95, ALL: 1.9 } as Record<CardTarget, number>,
  /** PIERCE: share of the damage dealt to the enemy behind the target. */
  pierceFalloff: 0.6,
  /** SHATTER (damage ignores Block) multiplies the damage cost. */
  shatterCost: 1.2,
  blockCost: 0.9,
  healCost: 1.4,
  /** Per second of stagger on each enemy it can hit (ALL staggers everyone, so it costs more). */
  staggerCostPerSecond: 3,
  staggerAllMultiplier: 1.6,
};

export interface CardSpec {
  templateId: string;
  name: string;
  exercise: ExerciseType;
  reps: number;
  rarity: CardRarity;
  target: CardTarget;
  hits?: number; // CHAIN only
  shatter?: boolean;
  stagger?: number; // seconds
  /** Shares of the budget spent on Block / healing; the rest becomes damage. */
  blockShare?: number;
  healShare?: number;
  element?: Element;
  colorHex: string;
  icon: string;
}

export function cardBudget(spec: Pick<CardSpec, 'exercise' | 'reps' | 'rarity'>): number {
  const p = EXERCISE_PROFILE[spec.exercise];
  return spec.reps * p.repSeconds * p.intensity * BALANCE.ratePerSecond * BALANCE.rarity[spec.rarity];
}

export function designCard(spec: CardSpec): CardTemplate {
  let budget = cardBudget(spec);

  if (spec.stagger) {
    const multiplier = spec.target === 'ALL' ? BALANCE.staggerAllMultiplier : 1;
    budget -= spec.stagger * BALANCE.staggerCostPerSecond * multiplier;
  }
  const block = Math.round((budget * (spec.blockShare ?? 0)) / BALANCE.blockCost);
  const heal = Math.round((budget * (spec.healShare ?? 0)) / BALANCE.healCost);
  const damageBudget = budget * (1 - (spec.blockShare ?? 0) - (spec.healShare ?? 0));
  let damageCost = BALANCE.damageCost[spec.target];
  if (spec.shatter) damageCost *= BALANCE.shatterCost;
  // CHAIN damage is per hit
  const totalDamage = damageBudget / damageCost;
  const rawDamage = Math.max(0, spec.target === 'CHAIN' ? totalDamage / (spec.hits ?? 3) : totalDamage);
  const damage = Math.round(rawDamage);

  const type: CardType = damage === 0 || block + heal > damage * 0.9 ? 'DEFENSE' : 'ATTACK';
  const template: CardTemplate = {
    templateId: spec.templateId,
    name: spec.name,
    type,
    exercise: spec.exercise,
    exerciseLabel: EXERCISE_PROFILE[spec.exercise].label,
    requiredReps: spec.reps,
    damage,
    block,
    heal,
    target: spec.target,
    hits: spec.target === 'CHAIN' ? spec.hits ?? 3 : undefined,
    shatter: spec.shatter || undefined,
    stagger: spec.stagger || undefined,
    effectDesc: '',
    rarity: spec.rarity,
    colorHex: spec.colorHex,
    icon: spec.icon,
    element: spec.element,
    dmgPct: Math.round((rawDamage / REFERENCE_KNIGHT.attack) * 100) / 100,
    blockPct: Math.round((block / REFERENCE_KNIGHT.maxHp) * 100) / 100,
    healPct: Math.round((heal / REFERENCE_KNIGHT.maxHp) * 100) / 100,
    baseReps: spec.reps,
  };
  template.effectDesc = describeCard(template);
  return template;
}

/** Short label for a card's targeting, shown on the type line. */
export const TARGET_LABEL: Record<CardTarget, string> = {
  SINGLE: 'TARGET',
  BACK: 'BACK ROW',
  PIERCE: 'PIERCE',
  CHAIN: 'CHAIN',
  ALL: 'ALL FOES',
};

/** Rules text generated from the numbers, so it can never disagree with them. */
export function describeCard(
  c: Pick<CardTemplate, 'damage' | 'block' | 'heal' | 'target' | 'hits' | 'shatter' | 'stagger' | 'element' | 'infusion'>,
): string {
  const parts: string[] = [];
  if (c.damage > 0) {
    const el = c.element ? ` ${ELEMENT_INFO[c.element].label}` : '';
    switch (c.target) {
      case 'SINGLE':
        parts.push(`Deal ${c.damage}${el} to the target.`);
        break;
      case 'BACK':
        parts.push(`Deal ${c.damage}${el} to the rearmost foe.`);
        break;
      case 'PIERCE':
        parts.push(`Deal ${c.damage}${el} to the target, ${Math.round(c.damage * BALANCE.pierceFalloff)} to the foe behind.`);
        break;
      case 'CHAIN':
        parts.push(`${c.hits ?? 3} hits of ${c.damage}${el} on random foes.`);
        break;
      case 'ALL':
        parts.push(`Deal ${c.damage}${el} to ALL foes.`);
        break;
    }
    if (c.infusion && c.infusion.damage > 0) parts.push(`+${c.infusion.damage} ${ELEMENT_INFO[c.infusion.element].label} per hit.`);
  }
  if (c.shatter) parts.push('Ignores Block.');
  if (c.stagger) parts.push(`Stagger ${c.stagger}s.`);
  if (c.block > 0) parts.push(`Gain ${c.block} Block.`);
  if (c.heal > 0) parts.push(`Heal ${c.heal}.`);
  return parts.join(' ');
}
