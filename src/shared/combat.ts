/**
 * Card resolution: who a cast card hits and for how much. Pure (no React, no engine) so the battle
 * screen and the balance simulator (scripts/balance-sim.ts) run exactly the same rules.
 */
import type { CombatCard, MonsterState } from '../types/battle';
import { BALANCE } from './cardBalance';

/**
 * Formation depth, front to back, by encounter size. Matches the slot positions in
 * GameEngine.setMonsters (3 monsters: slot 0 front, slot 2 middle, slot 1 back).
 */
const FORMATION_DEPTH: Record<number, number[]> = { 1: [0], 2: [0, 1], 3: [0, 2, 1] };

const isAlive = (m: MonsterState | undefined): m is MonsterState => !!m && m.isAlive !== false && m.currentHp > 0;

/** Indices of living monsters, front row first. */
export function depthOrder(monsters: MonsterState[]): number[] {
  const order = FORMATION_DEPTH[monsters.length] ?? monsters.map((_, i) => i);
  return order.filter((i) => isAlive(monsters[i]));
}

/** Front-most living monster (the default target when playing hands-free). */
export function frontTarget(monsters: MonsterState[]): number {
  return depthOrder(monsters)[0] ?? -1;
}

/**
 * How hard the set was performed scales the cast. Averaged over all the card's reps so one sloppy
 * final rep doesn't spoil it: power 80 = ×1.0, clamped to ×0.75–×1.35, then times form (0–1).
 */
export function castMultiplier(power: number, form: number): number {
  return Math.min(1.35, Math.max(0.75, power / 80)) * Math.max(0, Math.min(1, form));
}

export interface CardHit {
  index: number;
  damage: number; // to HP
  blocked: number; // absorbed by Block
  killed: boolean;
  staggered: number; // seconds added to the monster's attack timer
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

  const strike = (index: number, amount: number) => {
    const m = next[index];
    if (!isAlive(m) || amount <= 0) return;
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
    hits.push({ index, damage: dmg, blocked, killed, staggered });
  };

  const order = depthOrder(next);
  const target = isAlive(next[targetIndex]) ? targetIndex : order[0];

  if (card.damage > 0 && target !== undefined) {
    switch (card.target) {
      case 'SINGLE':
        strike(target, card.damage);
        break;
      case 'BACK':
        strike(order[order.length - 1], card.damage);
        break;
      case 'PIERCE': {
        const behind = order[order.indexOf(target) + 1];
        strike(target, card.damage);
        if (behind !== undefined) strike(behind, card.damage * BALANCE.pierceFalloff);
        break;
      }
      case 'CHAIN':
        for (let h = 0; h < (card.hits ?? 3); h++) {
          const alive = depthOrder(next);
          if (alive.length === 0) break;
          strike(alive[Math.floor(rng() * alive.length)], card.damage);
        }
        break;
      case 'ALL':
        for (const i of order) strike(i, card.damage);
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
