import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameEngine } from '../engine/GameEngine';
import { BATTLE_MAPS } from '../engine/battleMaps';
import { TRIAL_SCENES, TRIAL_WIN_SECONDS } from '../engine/trialScenes';
import type { BattleMapId } from '../../types/battle';
import type { ExerciseType } from '../../types/game';
import { SECRET_TRIALS, TrialRun, trialGoal, type SecretTrialId, type TrialRepResult } from '../../shared/secretTrials';
import { EXERCISE_PROFILE } from '../../shared/cardBalance';
import { SECRET_TRIAL_COPY, fillCopy } from './secretTrialCopy';
import { profileManager } from '../../shared/ProfileManager';
import { audioManager } from '../../shared/AudioManager';
import { weaponStats } from '../../shared/progression';
import { ELEMENT_INFO } from '../../shared/elements';
import { WEAPON_SPELLS } from '../../types/weaponSpells';
import { useTVRemote } from '../hooks/useTVRemote';
import { networkManager } from '../../shared/NetworkManager';
import { registerDebug } from '../debug/agentBridge';

type Phase = 'INTRO' | 'TRIAL' | 'WON' | 'LOST';

interface SecretTrialProps {
  trialId: SecretTrialId;
  engineRef: React.RefObject<GameEngine | null>;
  isEngineReady?: boolean;
  /** The map the trial appeared on (its backdrop, if it is one of the trial's maps). */
  mapId: BattleMapId;
  onExit: () => void;
}

/** The victory squat that led here mustn't also start the trial: the intro ignores squats this long. */
const START_GRACE_MS = 1500;

/** What the Hollow Choir shows instead of the truth, now and then. */
const LIES = ['THE RIFT REJECTS THEE', 'TRIAL FAILED', 'THOU HAST ALREADY LOST', 'COUNT AGAIN', 'IT IS NOT LISTENING'];

/**
 * Secret stage (src/shared/secretTrials.ts): one try at the trial, under its mechanic (TrialRun holds the rules).
 * The clock starts on a squat (or Enter); that squat doesn't count. Win or lose, it ends in the town hub. The engine stages the
 * trial's own scene (src/tv/engine/trialScenes.ts); the words come from SECRET_TRIAL_COPY. Per-frame values
 * (clock, meters, the beat) are written straight to the DOM, not React state.
 */
export const SecretTrial: React.FC<SecretTrialProps> = ({ trialId, engineRef, isEngineReady, mapId, onExit }) => {
  const spec = SECRET_TRIALS[trialId];
  const copy = SECRET_TRIAL_COPY[trialId];
  const mech = spec.mechanic;
  const GOAL = trialGoal(spec);
  const LIMIT = spec.seconds;
  const WIN_SECONDS = TRIAL_WIN_SECONDS[trialId];
  const runRef = useRef(new TrialRun(spec));
  const [phase, setPhase] = useState<Phase>('INTRO');
  const [reps, setReps] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [miss, setMiss] = useState<TrialRepResult | null>(null);
  const [lie, setLie] = useState<string | null>(null);
  const phaseRef = useRef<Phase>('INTRO');
  const shownAtRef = useRef(performance.now());
  const clockRef = useRef<HTMLSpanElement | null>(null);
  const sandRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const beatRef = useRef<HTMLDivElement | null>(null);
  const resultTimerRef = useRef<number | null>(null);
  const missTimerRef = useRef<number | null>(null);
  const lieTimerRef = useRef<number | null>(null);

  const enterPhase = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  // Stage: the trial's map as backdrop, the knight alone with its scene
  useEffect(() => {
    const engine = engineRef.current;
    if (!isEngineReady || !engine) return;
    engine.clearMonsters();
    engine.resetKnight();
    engine.setCharactersVisible(true);
    // The trial only appears on its own maps: the one the knight came from, else its own backdrop
    const backdrop = spec.backdrop ?? (spec.maps.includes(mapId) ? mapId : spec.maps[0]);
    void engine.loadBackground(BATTLE_MAPS[backdrop as keyof typeof BATTLE_MAPS]);
    engine.showSecretTrial(trialId);
    audioManager.stopBgm();
    for (const [name, o] of TRIAL_SCENES[trialId].intro) audioManager.play(name, o);
    return () => engineRef.current?.showSecretTrial(null);
  }, [isEngineReady, engineRef, mapId, trialId, spec]);

  // The phone watches only the starting squat on the intro, then the exercise that counts now
  useEffect(() => {
    networkManager.sendHand(null, 'TRIAL');
    return () => networkManager.sendHand(null);
  }, []);

  useEffect(() => () => {
    for (const t of [resultTimerRef, missTimerRef, lieTimerRef]) if (t.current) clearTimeout(t.current);
    audioManager.stopBgm();
  }, []);

  const finish = useCallback((won: boolean) => {
    if (phaseRef.current !== 'TRIAL' && phaseRef.current !== 'INTRO') return;
    enterPhase(won ? 'WON' : 'LOST');
    audioManager.stopBgm();
    const engine = engineRef.current;
    if (won) {
      profileManager.claimSecretTrial(trialId);
      engine?.secretTrialWin();
      audioManager.play('victory', { delay: WIN_SECONDS - 0.4 });
    } else {
      engine?.secretTrialLose();
      audioManager.play('defeat', { delay: 0.5 });
    }
    resultTimerRef.current = window.setTimeout(() => setShowResult(true), won ? WIN_SECONDS * 1000 + 500 : 1800);
  }, [engineRef, trialId, WIN_SECONDS]);

  const start = useCallback(() => {
    if (phaseRef.current !== 'INTRO') return;
    enterPhase('TRIAL');
    networkManager.sendHand(null, 'TRIAL', [runRef.current.exercise]);
    audioManager.play('charge', { vol: 0.6 });
    audioManager.playBgm(); // the workout soundtrack
  }, []);

  const flagMiss = (kind: TrialRepResult) => {
    setMiss(kind);
    if (missTimerRef.current) clearTimeout(missTimerRef.current);
    missTimerRef.current = window.setTimeout(() => setMiss(null), 1800);
  };

  const handleRep = useCallback((exercise: ExerciseType, power = 80) => {
    const run = runRef.current;
    if (phaseRef.current === 'INTRO') {
      if (exercise === 'SQUAT' && performance.now() - shownAtRef.current >= START_GRACE_MS) start();
      return;
    }
    if (phaseRef.current !== 'TRIAL') return;
    const { result, won } = run.rep(exercise, power);
    if (result !== 'counted') {
      flagMiss(result);
      if (result === 'wrong') audioManager.play('warn', { vol: 0.5 });
      else engineRef.current?.secretTrialMiss(result, power);
      return;
    }
    setMiss(null);
    setReps(run.count);
    // A gauntlet moved on to its next exercise: the phone watches that one now
    if (!won && run.exercise !== exercise) networkManager.sendHand(null, 'TRIAL', [run.exercise]);
    engineRef.current?.secretTrialRep(run.progress, power);
    if (won) finish(true);
  }, [engineRef, finish, start]);

  // Reps arrive the same way as in battle (GameScreen forwards phone telemetry here)
  useEffect(() => {
    (window as any).__onKettlebellRepCompleted = handleRep;
    return () => {
      if ((window as any).__onKettlebellRepCompleted === handleRep) delete (window as any).__onKettlebellRepCompleted;
    };
  }, [handleRep]);

  // The clock and the meters, every frame once it starts
  useEffect(() => {
    if (phase !== 'TRIAL') return;
    const run = runRef.current;
    let last = performance.now();
    let lastBeat = -1;
    let raf = 0;
    const frame = (now: number) => {
      const ended = run.tick(Math.min(0.1, (now - last) / 1000));
      last = now;
      const drain = mech.kind === 'drain';
      if (clockRef.current) clockRef.current.textContent = drain ? `${Math.round(run.danger * 100)}` : run.secondsLeft.toFixed(1);
      if (sandRef.current) sandRef.current.style.width = `${(drain ? run.danger : run.secondsLeft / LIMIT) * 100}%`;
      if (barRef.current) barRef.current.style.width = `${run.progress * 100}%`;
      if (mech.kind === 'rhythm') {
        const beat = Math.floor(run.elapsed / mech.beat);
        if (beat !== lastBeat) {
          lastBeat = beat;
          engineRef.current?.secretTrialBeat();
        }
        if (beatRef.current) {
          const near = Math.min(run.beatPhase, 1 - run.beatPhase) * mech.beat <= mech.window;
          beatRef.current.style.transform = `scale(${1.5 - run.beatPhase * 0.5})`;
          beatRef.current.style.background = near ? copy.accent : '#2E2B44';
        }
      }
      engineRef.current?.secretTrialFrame(run.progress, run.danger);
      if (ended === 'lost') return finish(false);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase, finish, LIMIT, engineRef, mech, copy.accent]);

  // The Hollow Choir lies: a false count or a false failure every few seconds
  useEffect(() => {
    if (phase !== 'TRIAL' || !spec.lies) return;
    const id = window.setInterval(() => {
      if (Math.random() < 0.55) return;
      const fake = Math.random() < 0.5
        ? `${Math.max(0, runRef.current.count - 3 - Math.floor(Math.random() * 9))}`
        : LIES[Math.floor(Math.random() * LIES.length)];
      setLie(fake);
      engineRef.current?.secretTrialGlitch();
      audioManager.play('warn', { vol: 0.3, rate: 0.6 });
      if (lieTimerRef.current) clearTimeout(lieTimerRef.current);
      lieTimerRef.current = window.setTimeout(() => setLie(null), 700 + Math.random() * 500);
    }, 2200);
    return () => clearInterval(id);
  }, [phase, spec.lies, engineRef]);

  useTVRemote({
    onSelect: () => {
      if (phaseRef.current === 'INTRO') start();
      else if (showResult) onExit();
    },
    onBack: () => {
      // Walking away is the one try spent
      if (phaseRef.current === 'INTRO' || phaseRef.current === 'TRIAL') finish(false);
      else if (showResult) onExit();
    },
    onDemoSwing: () => (phaseRef.current === 'INTRO' ? start() : handleRep(runRef.current.exercise, 100)),
  });

  useEffect(() => registerDebug(
    'trial',
    () => {
      const run = runRef.current;
      return {
        trial: trialId,
        mechanic: mech.kind,
        phase,
        reps,
        goal: GOAL,
        exercise: run.exercise,
        progress: Number(run.progress.toFixed(2)),
        danger: Number(run.danger.toFixed(2)),
        secondsLeft: phase === 'TRIAL' ? Number(run.secondsLeft.toFixed(1)) : null,
        showResult,
      };
    },
    {
      // Lands n perfect trial reps at once (starts the clock if needed): full power, on the beat
      trialReps: (n: number) => {
        start();
        for (let i = 0; i < n; i++) {
          const run = runRef.current;
          if (mech.kind === 'rhythm' && phaseRef.current === 'TRIAL') run.elapsed = Math.ceil(run.elapsed / mech.beat) * mech.beat + 0.01;
          handleRep(run.exercise, 100);
        }
      },
      // Runs the clock out
      trialExpire: () => { runRef.current.elapsed = LIMIT; },
    },
  ), [trialId, phase, reps, showResult, handleRep, GOAL, LIMIT, mech]);

  const level = profileManager.getActiveProfile()?.level ?? 1;
  const blade = weaponStats(trialId, 1, undefined, level);
  const spells = WEAPON_SPELLS[trialId] ?? [];
  const run = runRef.current;
  const exLabel = EXERCISE_PROFILE[run.exercise].label;
  const gauntlet = mech.kind === 'gauntlet' ? run.stage : null;
  const pct = run.progress * 100;
  const missLine = miss === 'wrong' ? copy.wrongMove : miss === 'weak' ? copy.weakRep ?? copy.wrongMove : miss === 'offbeat' ? copy.offBeat ?? copy.wrongMove : null;
  const vars = { reps: spec.reps, seconds: LIMIT, done: reps };
  // The panels take the trial's accent: border, title and a hard pixel shadow in its colour
  const panel = { borderColor: copy.accent, boxShadow: `4px 4px 0px 0px ${copy.accent}` };

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 pointer-events-auto select-none">
      {/* Title plaque: steps aside once the weapon is raised, so it has the top of the screen */}
      <div className={`mx-auto text-center kk-hud-dispatch px-6 py-2 transition-opacity duration-700 ${phase === 'WON' ? 'opacity-0' : ''}`}>
        <span className="font-pixel text-[9px] text-[#C084FC] block tracking-widest animate-pulse">✦ SECRET STAGE ✦</span>
        <h1 className="font-pixel text-sm mt-1" style={{ color: copy.accent }}>{copy.title}</h1>
      </div>

      {/* The scene holds the centre and the knight its left: the HUD keeps to the right */}
      {phase === 'INTRO' && (
        <div className="absolute right-6 top-1/2 -translate-y-1/2 w-[30%] max-w-sm bg-[#1A1926]/85 border-4 p-4 rounded" style={panel}>
          <p className="font-mono text-xs text-[#E6E4EE] leading-snug">
            {copy.introLead} <span style={{ color: copy.accent }}>{copy.weaponName}</span>{copy.introAfter}
          </p>
          <p className="font-pixel text-sm my-3 leading-relaxed" style={{ color: copy.accent }}>{fillCopy(copy.goalLine, vars)}</p>
          <p className="font-mono text-[11px] text-[#FF3366]">{copy.warning}</p>
          <p className="font-pixel text-[9px] text-[#00EB88] mt-3 animate-pulse leading-relaxed">{copy.startLine}<br />[ENTER] START</p>
        </div>
      )}

      {phase !== 'INTRO' && !showResult && (
        <div className="absolute right-6 top-1/2 -translate-y-1/2 w-[24%] max-w-xs flex flex-col gap-3">
          <div className="bg-[#1A1926]/85 border-4 p-3 rounded font-pixel" style={{ ...panel, transform: lie ? `skewX(${Math.random() < 0.5 ? -6 : 6}deg)` : undefined }}>
            <span className="text-[8px] text-[#A7A9BE] block tracking-wider">
              {gauntlet ? `LABOUR ${Math.min(gauntlet.index + 1, 13)} / 13 • ${exLabel}` : copy.repLabel}
            </span>
            <span className="text-3xl" style={{ color: copy.accent }}>{lie && /^\d+$/.test(lie) ? lie : reps}</span>
            <span className="text-sm text-[#A7A9BE]"> / {GOAL}</span>
            <div className="kk-hud-vial h-3 mt-2">
              <div ref={barRef} className="kk-hud-vial__bar" style={{ width: `${pct}%`, background: `linear-gradient(to right, ${copy.bar[0]}, ${copy.bar[1]})` }} />
            </div>
            <p className={`text-[8px] mt-2 leading-relaxed ${missLine ? 'text-[#FF3366]' : 'text-[#A7A9BE]'}`}>
              {missLine ?? (gauntlet ? `${spec.reps - gauntlet.done} MORE ${exLabel}` : copy.formHint)}
            </p>
            {mech.kind === 'rhythm' && (
              <div className="flex items-center gap-2 mt-2">
                <div ref={beatRef} className="w-3 h-3 rounded-full border border-black" />
                <span className="text-[8px] text-[#A7A9BE]">REP WHEN IT FLASHES</span>
              </div>
            )}
          </div>
          <div className="bg-[#1A1926]/85 border-4 p-3 rounded shadow-pixel-box font-pixel text-right" style={{ borderColor: copy.clock }}>
            <span className="text-[8px] text-[#A7A9BE] block tracking-wider">{copy.clockLabel}</span>
            <span ref={clockRef} className="text-3xl" style={{ color: copy.clock }}>{mech.kind === 'drain' ? '0' : LIMIT.toFixed(1)}</span>
            <span className="text-sm text-[#A7A9BE]">{mech.kind === 'drain' ? '%' : 's'}</span>
            <div className="h-3 mt-2 bg-[#0F0E17] border border-[#2E2B44] overflow-hidden">
              <div ref={sandRef} className={`h-full ${mech.kind === 'drain' ? '' : 'ml-auto'}`} style={{ width: mech.kind === 'drain' ? '0%' : '100%', background: copy.clock }} />
            </div>
            <p className="text-[8px] mt-2 text-[#A7A9BE] leading-relaxed">{copy.clockCaption}</p>
          </div>
        </div>
      )}

      {lie && !/^\d+$/.test(lie) && phase === 'TRIAL' && (
        <div className="absolute inset-x-0 top-1/3 flex justify-center pointer-events-none" style={{ transform: 'rotate(-3deg)' }}>
          <span className="font-pixel text-2xl text-[#FF3366] bg-black/70 px-4 py-2 border-2 border-[#FF3366] animate-pulse">{lie}</span>
        </div>
      )}

      {showResult && (
        // Won: a low banner, so the raised weapon stays the picture. Lost: the scene fades behind the card.
        <div className={`absolute inset-0 z-40 flex justify-center ${phase === 'WON' ? 'items-end pb-6' : 'items-center bg-black/70 backdrop-blur-sm'}`}>
          {phase === 'WON' ? (
            // A new weapon, not a level-up: the banner glows in the trial's accent under a crest
            <div
              className="kk-new-weapon bg-[#1A1926]/90 border-4 px-5 pt-5 pb-3 max-w-3xl w-full rounded flex items-center gap-5"
              style={{ ...panel, '--kk-accent': copy.accent } as React.CSSProperties}
            >
              <div className="kk-new-weapon__crest font-pixel text-xs text-[#0F0E17] px-4 py-1.5 rounded-full border-2 border-black whitespace-nowrap">
                ✦ NEW WEAPON ACQUIRED! ✦
              </div>
              <div className="kk-new-weapon__sweep" />
              <div className="flex-1 text-left">
                <h2 className="font-pixel text-base" style={{ color: copy.accent }}>{copy.wonTitle}</h2>
                <p className="text-[11px] text-[#A7A9BE] font-mono mt-1">{fillCopy(copy.wonLine, vars)}</p>
                <div className="font-pixel text-[9px] mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  <span className="text-[#FF3366]">+{blade.atk} ATK</span>
                  {blade.element && (
                    <span style={{ color: ELEMENT_INFO[blade.element].color }}>
                      {ELEMENT_INFO[blade.element].icon} +{blade.elemDmg} {ELEMENT_INFO[blade.element].label}
                    </span>
                  )}
                  <span className="text-[#38B6FF]">TIER {blade.tier}</span>
                  <span className="text-[#00EB88]">EQUIPPED • {spells.length} LEGENDARY SPELLS</span>
                </div>
                <div className="font-pixel text-[8px] text-[#A7A9BE] mt-1">{spells.map((s) => s.name.toUpperCase()).join(' • ')}</div>
              </div>
              <button
                onClick={onExit}
                className="hover:brightness-110 text-[#0F0E17] font-pixel text-xs py-3 px-4 border-2 border-black shadow-pixel-box flex-shrink-0"
                style={{ background: copy.accent }}
              >
                RETURN TO TOWN ▶
              </button>
            </div>
          ) : (
            <div className="bg-[#1A1926] border-4 border-[#FF3366] p-8 max-w-md w-full text-center rounded shadow-pixel-box">
              <div className="text-5xl mb-2">{copy.lostIcon}</div>
              <h2 className="font-pixel text-lg text-[#FF3366] mb-1">{copy.lostTitle}</h2>
              <p className="font-pixel text-sm my-3" style={{ color: copy.accent }}>{reps} / {GOAL} {gauntlet ? 'REPS' : copy.repLabel}</p>
              <p className="text-xs text-[#A7A9BE] font-mono mb-5">{copy.lostLine}</p>
              <button
                onClick={onExit}
                className="w-full bg-[#2E2B44] text-white font-pixel text-xs py-3 border-2 border-black shadow-pixel-box"
              >
                RETURN TO TOWN ▶
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
