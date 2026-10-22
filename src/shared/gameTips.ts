import GAME_TIPS from './gameTips.json';
import type { PlayerProfile } from './ProfileManager';

/**
 * Loading-screen style tips (gameTips.json), shown under the stage intro's quote and on the encounter-cleared
 * screen. Spoiler tips (the secret trials) stay hidden until the knight has met a trial.
 */
export interface GameTip {
  id: string;
  category: string;
  spoiler: boolean;
  text: string;
}

export const TIPS: GameTip[] = GAME_TIPS.tips;

const metSecretTrial = (profile: PlayerProfile | null | undefined) =>
  Boolean(profile?.excalibellTrial?.encounters || Object.values(profile?.secretTrials ?? {}).some((r) => r?.encounters));

/** Shuffle bag: every eligible tip shows once before any repeats. */
let bag: GameTip[] = [];
export function nextGameTip(profile: PlayerProfile | null | undefined): GameTip {
  const spoilers = metSecretTrial(profile);
  bag = bag.filter((t) => spoilers || !t.spoiler);
  if (bag.length === 0) {
    bag = TIPS.filter((t) => spoilers || !t.spoiler);
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }
  return bag.pop()!;
}

/** Extra time the stage intro holds so the tip can be read. */
export function tipHoldMs(tip: GameTip): number {
  return Math.round(Math.min(7000, 1000 + tip.text.split(/\s+/).length * 150));
}
