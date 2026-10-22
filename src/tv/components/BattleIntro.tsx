import React from 'react';
import type { BattleMapId } from '../../types/battle';
import type { BattleQuote } from './battleQuotes';

/**
 * Opening of a fight: letterbox and a vignette tinted to the stage, a knightly quote (battleQuotes.ts), a
 * "GET READY" title plate, then the HUD deals in (BattleScreen) and FIGHT! slams down. BattleScreen runs the
 * timeline (introTimeline) and holds the monster clock and reps until FIGHT; this only draws the current step.
 */
export type IntroStep = 'scene' | 'quote' | 'title' | 'hud' | 'fight' | 'done';

/**
 * When each step starts, in ms from the intro's start (or from `from`, rebased to 0, to resume partway).
 * A full intro holds the quote for `quoteMs`; a short one (encounter 2+ of an expedition) keeps the HUD up.
 */
export function introTimeline(short: boolean, quoteMs = 0, from?: IntroStep): [IntroStep, number][] {
  const quote = quoteMs > 0;
  const steps: [IntroStep, number][] = short
    ? [['fight', 1050], ['done', 1750]]
    : [
        ...(quote ? ([['quote', 350]] as [IntroStep, number][]) : []),
        ['title', quote ? 350 + quoteMs : 450],
      ];
  if (!short) {
    const title = steps[steps.length - 1][1];
    steps.push(['hud', title + 1550], ['fight', title + 2100], ['done', title + 2800]);
  }
  const at = from ? steps.findIndex(([step]) => step === from) : -1;
  if (at < 0) return steps;
  const base = steps[at][1];
  return steps.slice(at).map(([step, t]) => [step, t - base]);
}

interface StageTheme {
  /** Bright accent: rules, kicker text, the lit face of the title */
  accent: string;
  /** Shadow tone of the stage: vignette, the title band, the dark end of the title's gradient */
  deep: string;
  /** Drifting embers / motes */
  ember: string;
}

const THEMES: Record<BattleMapId, StageTheme> = {
  VERDANT_FOREST: { accent: '#9BD46E', deep: '#0E2614', ember: '#D4F58A' },
  DARK_FOREST: { accent: '#6FB08A', deep: '#081812', ember: '#A8EBC4' },
  TOWN_SQUARE: { accent: '#E0B054', deep: '#2E1C0A', ember: '#FFD27A' },
  TOWN_NIGHT: { accent: '#86A8E6', deep: '#0E1530', ember: '#C2D4FF' },
  SUNKEN_CISTERN: { accent: '#55C6CC', deep: '#061F24', ember: '#9AF2F2' },
  CATHEDRAL_CRYPT: { accent: '#BBA8EA', deep: '#18122A', ember: '#E6DBFF' },
  BLOOD_CEMETERY: { accent: '#D9483F', deep: '#240707', ember: '#FF7A5C' },
  BELFRY_RAMPARTS: { accent: '#93B7DC', deep: '#101A28', ember: '#DCEBFF' },
  CATHEDRAL_VAULT: { accent: '#D9B45A', deep: '#261C0A', ember: '#FFE29A' },
  VOLCANIC_FORGE: { accent: '#FF7A2A', deep: '#2A0B03', ember: '#FFB347' },
  ELDRITCH_ALTAR: { accent: '#AC6FE2', deep: '#170926', ember: '#D9A2FF' },
  OBSIDIAN_THRONE: { accent: '#C83E5E', deep: '#12050A', ember: '#FF6F8E' },
};

const EMBERS = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 41 + 7) % 100}%`,
  duration: `${2.4 + ((i * 7) % 10) / 6}s`,
  delay: `${-((i * 0.37) % 2.4)}s`,
  size: i % 4 === 0 ? 4 : i % 2 ? 2 : 3,
}));

interface BattleIntroProps {
  step: IntroStep;
  short: boolean;
  map: BattleMapId;
  /** Small line above the title, e.g. "LEVEL 3 • STRONGHOLD BREACH" or "BATTLE 2 / 4" */
  kicker: string;
  stageName: string;
  epithet?: string;
  /** The level's apex: the title plate turns to a boss warning */
  bossName?: string;
  /** A horde fight's name ("Goblin Horde"), shown in place of the stage on the title plate. */
  hordeName?: string;
  quote?: BattleQuote;
  /** A gameplay tip under the quote (gameTips.ts) */
  tip?: string;
  /** Heading over the quote: where in the campaign, e.g. "ACT V • STAGE 9" */
  chapter?: string;
  /** Under the stage name in that heading, e.g. "LEVEL 1 • OUTER RECONNAISSANCE" */
  levelLine?: string;
}

const Rule: React.FC<{ flip?: boolean }> = ({ flip }) => (
  <span className={`kk-intro__rule ${flip ? 'kk-intro__rule--flip' : ''}`} aria-hidden>
    <i />
  </span>
);

/** Each word fades in after the one before it (CSS delay), so the quote reads itself out without re-renders. */
const QUOTE_WORD_MS = 45;

const QuoteCard: React.FC<{ quote: BattleQuote; tip?: string }> = ({ quote, tip }) => {
  let word = 0;
  const words = quote.lines.join(' ').split(/\s+/).length;
  return (
    <div className="kk-intro__quote">
      {/* Each line is one voice, in its own pair of marks; a mark rides with its word so it never wraps alone */}
      {quote.lines.map((line, li) => {
        const lineWords = line.split(/\s+/);
        return (
          <p key={li} className={`kk-intro__quote-line font-tome italic ${li > 0 ? 'kk-intro__quote-line--reply' : ''}`}>
            {lineWords.map((w, wi) => (
              <span key={wi} className="kk-intro__quote-word" style={{ animationDelay: `${300 + word++ * QUOTE_WORD_MS}ms` }}>
                {wi === 0 && <span className="kk-intro__quote-mark kk-intro__quote-mark--open font-gothic">“</span>}
                {w}
                {wi === lineWords.length - 1 ? <span className="kk-intro__quote-mark kk-intro__quote-mark--close font-gothic">”</span> : ' '}
              </span>
            ))}
          </p>
        );
      })}
      <div className="kk-intro__quote-source" style={{ animationDelay: `${600 + words * QUOTE_WORD_MS}ms` }}>
        <Rule />
        <span className="font-gothic font-bold">{quote.source}</span>
        <Rule flip />
      </div>
      {tip && (
        <p className="kk-intro__tip font-mono">
          <span className="kk-intro__tip-label font-pixel">TIP:</span> {tip}
        </p>
      )}
    </div>
  );
};

export const BattleIntro: React.FC<BattleIntroProps> = ({ step, short, map, kicker, stageName, epithet, bossName, hordeName, quote, tip, chapter, levelLine }) => {
  if (step === 'done') return null;
  const theme = THEMES[map] ?? THEMES.VERDANT_FOREST;
  const vars = { '--intro-accent': theme.accent, '--intro-deep': theme.deep, '--intro-ember': theme.ember } as React.CSSProperties;
  const framing = !short && (step === 'scene' || step === 'quote' || step === 'title');
  const boss = Boolean(bossName);
  const horde = !boss && Boolean(hordeName);

  return (
    <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden" style={vars}>
      {/* Letterbox and a stage-tinted vignette while the scene is presented; both withdraw as the HUD comes in */}
      {!short && (
        <>
          <div className={`kk-intro__vignette ${framing ? '' : 'kk-intro__vignette--out'}`} />
          <div className={`kk-intro__bar kk-intro__bar--top ${framing ? '' : 'kk-intro__bar--out'}`} />
          <div className={`kk-intro__bar kk-intro__bar--bottom ${framing ? '' : 'kk-intro__bar--out'}`} />
        </>
      )}

      {step === 'quote' && quote && (
        <div className="kk-intro__quote-scene">
          <div className="kk-intro__embers" aria-hidden>
            {EMBERS.map((e, i) => (
              <i key={i} style={{ left: e.left, width: e.size, height: e.size, animationDuration: e.duration, animationDelay: e.delay }} />
            ))}
          </div>
          {/* Chapter heading: which stage of the campaign, its name and the level being entered */}
          <div className="kk-intro__chapter">
            {chapter && (
              <div className="kk-intro__kicker flex items-center gap-3">
                <Rule />
                <span className="font-pixel">{chapter}</span>
                <Rule flip />
              </div>
            )}
            <h2 className="kk-intro__chapter-name font-gothic font-bold">{stageName}</h2>
            {epithet && <span className="kk-intro__epithet font-tome italic">{epithet}</span>}
            {levelLine && <span className="kk-intro__chapter-level font-gothic font-bold">{levelLine}</span>}
          </div>
          <QuoteCard quote={quote} tip={tip} />
        </div>
      )}

      {step === 'title' && (
        <div className={`kk-intro__plate ${short ? 'kk-intro__plate--short' : ''} ${boss || horde ? 'kk-intro__plate--boss' : ''}`}>
          <div className="kk-intro__band" />
          <div className="kk-intro__embers" aria-hidden>
            {EMBERS.map((e, i) => (
              <i key={i} style={{ left: e.left, width: e.size, height: e.size, animationDuration: e.duration, animationDelay: e.delay }} />
            ))}
          </div>

          <div className="relative flex flex-col items-center">
            <div className="kk-intro__kicker flex items-center gap-3">
              <Rule />
              <span className="font-pixel">{boss ? 'APEX ENCOUNTER' : horde ? 'HORDE ENCOUNTER' : short ? stageName : kicker}</span>
              <Rule flip />
            </div>

            {short ? (
              <h1 className="kk-intro__title kk-intro__title--short font-gothic font-bold">{horde ? hordeName : kicker}</h1>
            ) : (
              <>
                <h1 className="kk-intro__title font-gothic font-bold">{boss ? 'BEWARE' : horde ? 'HORDE!' : 'GET READY'}</h1>
                <div className="kk-intro__stage">
                  <span className="font-gothic font-bold">{boss ? bossName : horde ? hordeName : stageName}</span>
                  {(boss || horde || epithet) && (
                    <span className="kk-intro__epithet font-tome italic">{boss ? `awaits in the ${stageName.toLowerCase()}` : horde ? `swarms the ${stageName.toLowerCase()}` : epithet}</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {step === 'fight' && (
        <div className="kk-intro__fight">
          <div className="kk-intro__flash" />
          <h1 className="kk-intro__fight-word font-gothic font-bold">FIGHT!</h1>
        </div>
      )}
    </div>
  );
};

/** HUD entrance classes for a piece of the battle HUD: hidden before the HUD step, then slid in from `from`. */
export function introHudClass(step: IntroStep, short: boolean, from: 'left' | 'right' | 'up'): string {
  if (short) return '';
  if (step === 'scene' || step === 'quote' || step === 'title') return 'kk-intro-hidden';
  return step === 'done' ? '' : `kk-intro-enter kk-intro-enter--${from}`;
}
