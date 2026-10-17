/** Battle-wide rules shared by the TV battle screen and the balance simulator. */

/**
 * Gold is earned in battle only: every rep adds to the fight's purse (harder reps add more), and the
 * purse is kept only if the fight is won. Losing forfeits it; reps outside battle earn nothing.
 */
export const GOLD_PER_POWER = 1 / 40;
export const repGold = (power: number) => Math.max(1, Math.round(power * GOLD_PER_POWER));

/**
 * Block crumbles over time, so defensive cards have to be timed against the visible monster intents
 * instead of being stockpiled.
 */
export const BLOCK_DECAY_PER_SECOND = 0;

/** Seconds between a monster's attack timer firing and its hit landing (the move's wind-up). */
export const IMPACT_DELAY_SECONDS = 0.8;

/**
 * Group encounters: each monster in a pack is weaker, so a trio is a harder, longer fight than a
 * solo monster without being three times as deadly.
 */
export const PACK_SCALING: Record<number, { hp: number; damage: number }> = {
  1: { hp: 1, damage: 1 },
  2: { hp: 0.75, damage: 0.7 },
  3: { hp: 0.6, damage: 0.55 },
};
