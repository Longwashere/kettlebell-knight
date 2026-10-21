/**
 * Card resolution: who a cast card hits and for how much. Pure (no React, no engine) so the battle
 * screen and the balance simulator (scripts/balance-sim.ts) run exactly the same rules.
 */
import type { CombatCard, MonsterState } from '../types/battle';
import { BALANCE } from './cardBalance';
import { effectiveness, elementMultiplier, type Effectiveness } from './elements';

const isAlive = (m: MonsterState | undefined): m is MonsterState => !!m && m.isAlive !== false && m.currentHp > 0;

/** Indices of living monsters, left to right: nearest the knight first (by `lane`, else encounter order). */
export function depthOrder(monsters: MonsterState[]): number[] {
  return monsters
    .map((m, i) => ({ i, lane: m.lane ?? i }))
    .sort((a, b) => a.lane - b.lane)
    .map(({ i }) => i)
    .filter((i) => isAlive(monsters[i]));
}

/** Living monster nearest the knight: the knight always targets it. */
export function frontTarget(monsters: MonsterState[]): number {
  return depthOrder(monsters)[0] ?? -1;
}

/**
 * How hard the set was performed scales the cast: the "out-exercise it" half of progression. Averaged
 * over all the card's reps so one sloppy final rep doesn't spoil it: power 80 = ×1.0, clamped to
 * ×0.75–×1.5 (explosive reps, power 120+, pay half again), then times form (0–1).
 */
export const CAST_POWER = { reference: 80, min: 0.75, max: 1.5 };
export function castMultiplier(power: number, form: number): number {
  return Math.min(CAST_POWER.max, Math.max(CAST_POWER.min, power / CAST_POWER.reference)) * Math.max(0, Math.min(1, form));
}

/**
 * Damage of one hit of `card` on `m` before Block: the card's own damage by its element, plus the
 * weapon's elemental damage by the weapon's element.
 */
export function hitDamage(card: Pick<CombatCard, 'damage' | 'element' | 'infusion'>, m: Pick<MonsterState, 'element'>): number {
  const main = card.damage * elementMultiplier(card.element, m.element);
  const infused = card.infusion ? card.infusion.damage * elementMultiplier(card.infusion.element, m.element) : 0;
  return main + infused;
}

/** How a hit's elements fared against the monster, for the hit label (the card's own element first). */
export function hitEffectiveness(card: Pick<CombatCard, 'element' | 'infusion'>, m: Pick<MonsterState, 'element'>): Effectiveness {
  const main = effectiveness(card.element, m.element);
  if (main !== 'neutral') return main;
  return effectiveness(card.infusion?.element, m.element);
}

export interface CardHit {
  index: number;
  damage: number; // to HP
  blocked: number; // absorbed by Block
  killed: boolean;
  staggered: number; // seconds added to the monster's attack timer
  effect: Effectiveness; // elemental matchup of the hit
}

export interface CardResolution {
  monsters: MonsterState[];
  hits: CardHit[];
  block: number;
  heal: number;
}

export function resolveCard(
  card: CombatCard,
  monsters: MonsterState[],
  targetIndex: number,
  opts: { power: number; form: number; rng?: () => number },
): CardResolution {
  const rng = opts.rng ?? Math.random;
  const mult = castMultiplier(opts.power, opts.form);
  const next = monsters.map((m) => ({ ...m, intent: { ...m.intent } }));
  const hits: CardHit[] = [];

  /** `share`: part of the card's damage this hit carries (PIERCE's falloff). */
  const strike = (index: number, share: number) => {
    const m = next[index];
    if (!isAlive(m)) return;
    const amount = hitDamage(card, m) * share;
    if (amount <= 0) return;
    let dmg = Math.round(amount * mult);
    let blocked = 0;
    if (!card.shatter) {
      blocked = Math.min(m.block, dmg);
      m.block -= blocked;
      dmg -= blocked;
    }
    const hpBefore = m.currentHp;
    m.currentHp = Math.max(0, m.currentHp - dmg);
    dmg = hpBefore - m.currentHp; // report HP actually removed (no overkill)
    const killed = m.currentHp <= 0;
    if (killed) {
      m.isAlive = false;
      m.block = 0;
    }
    let staggered = 0;
    if (card.stagger && !killed) {
      staggered = card.stagger;
      m.intent.remainingSeconds += staggered;
    }
    hits.push({ index, damage: dmg, blocked, killed, staggered, effect: hitEffectiveness(card, m) });
  };

  const order = depthOrder(next);
  const target = isAlive(next[targetIndex]) ? targetIndex : order[0];

  if (card.damage > 0 && target !== undefined) {
    switch (card.target) {
      case 'SINGLE':
        strike(target, 1);
        break;
      case 'BACK':
        strike(order[order.length - 1], 1);
        break;
      case 'PIERCE': {
        const behind = order[order.indexOf(target) + 1];
        strike(target, 1);
        if (behind !== undefined) strike(behind, BALANCE.pierceFalloff);
        break;
      }
      case 'CHAIN': {
        // Bounces through every living foe once (random order) before any is struck again, and never strikes
        // the one just hit while another is still standing
        let last = -1;
        let struck = new Set<number>();
        for (let h = 0; h < (card.hits ?? 3); h++) {
          const alive = depthOrder(next);
          if (alive.length === 0) break;
          if (alive.every((i) => struck.has(i))) struck = new Set();
          let pool = alive.filter((i) => !struck.has(i) && i !== last);
          if (pool.length === 0) pool = alive.length > 1 ? alive.filter((i) => i !== last) : alive;
          last = pool[Math.floor(rng() * pool.length)];
          struck.add(last);
          strike(last, 1);
        }
        break;
      }
      case 'ALL':
        for (const i of order) strike(i, 1);
        break;
    }
  }

  const formScale = Math.max(0, Math.min(1, opts.form));
  return {
    monsters: next,
    hits,
    block: Math.round(card.block * formScale),
    heal: Math.round(card.heal * formScale),
  };
}
