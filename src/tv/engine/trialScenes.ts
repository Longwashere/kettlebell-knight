import type { Container, Texture, Ticker } from 'pixi.js';
import type { SecretTrialId, TrialRepResult } from '../../shared/secretTrials';
import type { SfxName } from '../../shared/sfx/bank';
import { ExcalibellStone, EXCALIBELL_PULL_SECONDS, type StoneHost } from './excalibellStone';
import { DeadWeightGrave, DEAD_WEIGHT_PULL_SECONDS } from './deadWeightGrave';
import { STAGE_PULL_SECONDS } from './trialStage';
import { HighStriker } from './trials/highStriker';
import { DrownedAnchor } from './trials/drownedAnchor';
import { LastVigil } from './trials/lastVigil';
import { GreatBell } from './trials/greatBell';
import { GildedVault } from './trials/gildedVault';
import { TitanAnvil } from './trials/titanAnvil';
import { HollowChoir } from './trials/hollowChoir';
import { ThirteenLabours } from './trials/thirteenLabours';

/**
 * The hero-shot scene of each secret stage (src/shared/secretTrials.ts). GameEngine.showSecretTrial stages one
 * over the dimmed backdrop and lends it the knight; the trial screen drives it rep by rep and frame by frame.
 * Scenes after the first two are built on TrialStage (trialStage.ts).
 */
export interface TrialScene {
  readonly view: Container;
  attachActor(actor: Container): void;
  detachActor(): Container | null;
  /** 0–1 toward the win. */
  setProgress(p: number): void;
  /** 0–1 toward the loss: the drain meter, else the share of the time limit gone. */
  setClock?(k: number): void;
  rep(power?: number): void;
  /** A rep that did not count (too weak, off the beat). */
  miss?(kind: TrialRepResult, power?: number): void;
  /** Rhythm trials: the beat. */
  beat?(): void;
  /** The Hollow Choir: the scene lies for a moment. */
  glitch?(): void;
  /** Won: the weapon breaks free and ends in the knight's hand; `onDone` fires then (TRIAL_WIN_SECONDS). */
  pull(onDone?: () => void): void;
  reject(): void;
  debugState(): Record<string, unknown>;
  destroy(): void;
}

type Cue = [SfxName, { vol?: number; rate?: number; delay?: number }];

/**
 * `weapon` is the knight atlas's own region of the sealed weapon (no extra VRAM). `repPose` is the knight
 * animation each trial rep plays; `intro` the sounds as the scene opens.
 */
export const TRIAL_SCENES: Record<SecretTrialId, {
  create: (weapon: Texture | null, ticker: Ticker, host: StoneHost) => TrialScene;
  repPose: string;
  intro: Cue[];
}> = {
  excalibell: { create: (w, t, h) => new ExcalibellStone(w, t, h), repPose: 'DEFENSE', intro: [['holy', { vol: 0.8 }], ['magic', { vol: 0.5, delay: 0.4 }]] },
  bellringer_mallet: { create: (w, t, h) => new HighStriker(w, t, h), repPose: 'ATTACK4', intro: [['victory', { vol: 0.3, rate: 0.8 }], ['ui_select', { vol: 0.5, delay: 0.5 }]] },
  leviathan_anchor: { create: (w, t, h) => new DrownedAnchor(w, t, h), repPose: 'DEFENSE', intro: [['wave', { vol: 0.6 }], ['rattle', { vol: 0.5, delay: 0.4, rate: 0.6 }]] },
  everburning_censer: { create: (w, t, h) => new LastVigil(w, t, h), repPose: 'BUFF', intro: [['holy', { vol: 0.6, rate: 0.8 }], ['wail', { vol: 0.3, delay: 0.5 }]] },
  dead_weight: { create: (w, t, h) => new DeadWeightGrave(w, t, h), repPose: 'LANDING_END', intro: [['dark', { vol: 0.8 }], ['rattle', { vol: 0.5, delay: 0.5, rate: 0.7 }]] },
  tolling_thunder: { create: (w, t, h) => new GreatBell(w, t, h), repPose: 'SKILL1', intro: [['thunder', { vol: 0.7 }], ['block', { vol: 0.6, rate: 0.4, delay: 0.6 }]] },
  midas_bell: { create: (w, t, h) => new GildedVault(w, t, h), repPose: 'BUFF', intro: [['gears', { vol: 0.6 }], ['impact_metal', { vol: 0.5, rate: 0.5, delay: 0.4 }]] },
  heartforge: { create: (w, t, h) => new TitanAnvil(w, t, h), repPose: 'BUFF', intro: [['fire', { vol: 0.6 }], ['impact_metal', { vol: 0.6, delay: 0.4 }]] },
  hollow_bell: { create: (w, t, h) => new HollowChoir(w, t, h), repPose: 'DEFENSE', intro: [['portal', { vol: 0.7, rate: 0.6 }], ['wail', { vol: 0.4, delay: 0.5, rate: 1.4 }]] },
  excalibane: { create: (w, t, h) => new ThirteenLabours(w, t, h), repPose: 'DEFENSE', intro: [['dark', { vol: 0.8 }], ['roar', { vol: 0.35, delay: 0.6, rate: 0.5 }]] },
};

/** Seconds from the win until the weapon is in the knight's hand. */
export const TRIAL_WIN_SECONDS: Record<SecretTrialId, number> = {
  excalibell: EXCALIBELL_PULL_SECONDS,
  dead_weight: DEAD_WEIGHT_PULL_SECONDS,
  bellringer_mallet: STAGE_PULL_SECONDS,
  leviathan_anchor: STAGE_PULL_SECONDS,
  everburning_censer: STAGE_PULL_SECONDS,
  tolling_thunder: STAGE_PULL_SECONDS,
  midas_bell: STAGE_PULL_SECONDS,
  heartforge: STAGE_PULL_SECONDS,
  hollow_bell: STAGE_PULL_SECONDS,
  excalibane: STAGE_PULL_SECONDS,
};
