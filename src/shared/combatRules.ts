/** Battle-wide rules shared by the TV battle screen and the balance simulator. */

export const PLAYER_MAX_HP = 100;

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
