import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameEngine } from '../engine/GameEngine';
import { BATTLE_MAPS } from '../engine/battleMaps';
import { EXCALIBELL_PULL_SECONDS } from '../engine/excalibellStone';
import type { BattleMapId } from '../../types/battle';
import type { ExerciseType } from '../../types/game';
import { EXCALIBELL_TRIAL } from '../../shared/excalibellTrial';
import { profileManager } from '../../shared/ProfileManager';
import { audioManager } from '../../shared/AudioManager';
import { weaponStats } from '../../shared/progression';
import { ELEMENT_INFO } from '../../shared/elements';
import { WEAPON_SPELLS } from '../../types/weaponSpells';
import { useTVRemote } from '../hooks/useTVRemote';
import { registerDebug } from '../debug/agentBridge';

type Phase = 'INTRO' | 'TRIAL' | 'WON' | 'LOST';

interface ExcalibellTrialProps {
  engineRef: React.RefObject<GameEngine | null>;
  isEngineReady?: boolean;
  /** The forest the stone appeared in (its backdrop). */
  mapId: BattleMapId;
  onExit: () => void;
}

const { reps: GOAL, seconds: LIMIT, exercise: TRIAL_EXERCISE } = EXCALIBELL_TRIAL;

/**
 * Secret stage: the Enchanted Stone of Excalibell (src/shared/excalibellTrial.ts). One try at 100 goblet squats
 * in 60 seconds; the clock starts on the first squat (or Enter). Win or lose, it ends in the town hub.
 */
export const ExcalibellTrial: React.FC<ExcalibellTrialProps> = ({ engineRef, isEngineReady, mapId, onExit }) => {
  const [phase, setPhase] = useState<Phase>('INTRO');
  const [reps, setReps] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [wrongMove, setWrongMove] = useState(false);
  const phaseRef = useRef<Phase>('INTRO');
  const repsRef = useRef(0);
  const deadlineRef = useRef(0);
  // The clock ticks 10×/s: written straight to the DOM, not React state
  const clockRef = useRef<HTMLSpanElement | null>(null);
  const sandRef = useRef<HTMLDivElement | null>(null);
  const resultTimerRef = useRef<number | null>(null);
  const wrongTimerRef = useRef<number | null>(null);

  const enterPhase = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  // Stage: the forest backdrop, the knight alone with the stone
  useEffect(() => {
    const engine = engineRef.current;
    if (!isEngineReady || !engine) return;
    engine.clearMonsters();
    engine.resetKnight();
    engine.setCharactersVisible(true);
    // The stone only sleeps in the forests: the one the knight came from, else Verdant Forest
    const forest = EXCALIBELL_TRIAL.maps.includes(mapId) ? mapId : 'VERDANT_FOREST';
    void engine.loadBackground(BATTLE_MAPS[forest as keyof typeof BATTLE_MAPS]);
    engine.showExcalibellStone(true);
    audioManager.stopBgm();
    audioManager.play('holy', { vol: 0.8 });
    audioManager.play('magic', { vol: 0.5, delay: 0.4 });
    return () => engineRef.current?.showExcalibellStone(false);
  }, [isEngineReady, engineRef, mapId]);

  useEffect(() => () => {
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
    audioManager.stopBgm();
  }, []);

  const finish = useCallback((won: boolean) => {
    if (phaseRef.current !== 'TRIAL' && phaseRef.current !== 'INTRO') return;
    enterPhase(won ? 'WON' : 'LOST');
    audioManager.stopBgm();
    const engine = engineRef.current;
    if (won) {
      profileManager.claimExcalibell();
      engine?.excalibellPull();
      audioManager.play('victory', { delay: EXCALIBELL_PULL_SECONDS - 0.4 });
    } else {
      engine?.excalibellReject();
      audioManager.play('defeat', { delay: 0.5 });
    }
    resultTimerRef.current = window.setTimeout(() => setShowResult(true), won ? EXCALIBELL_PULL_SECONDS * 1000 + 500 : 1800);
  }, [engineRef]);

  const start = useCallback(() => {
    if (phaseRef.current !== 'INTRO') return;
    deadlineRef.current = performance.now() + LIMIT * 1000;
    enterPhase('TRIAL');
    audioManager.play('charge', { vol: 0.6 });
    audioManager.playBgm(); // the workout soundtrack
  }, []);

  const handleRep = useCallback((exercise: ExerciseType) => {
    if (phaseRef.current === 'INTRO' && exercise === TRIAL_EXERCISE) start();
    if (phaseRef.current !== 'TRIAL') return;
    if (performance.now() > deadlineRef.current) return finish(false);
    if (exercise !== TRIAL_EXERCISE) {
      setWrongMove(true);
      audioManager.play('warn', { vol: 0.5 });
      if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
      wrongTimerRef.current = window.setTimeout(() => setWrongMove(false), 1800);
      return;
    }
    repsRef.current += 1;
    setReps(repsRef.current);
    engineRef.current?.excalibellRep(repsRef.current / GOAL);
    if (repsRef.current >= GOAL) finish(true);
  }, [engineRef, finish, start]);

  // Reps arrive the same way as in battle (GameScreen forwards phone telemetry here)
  useEffect(() => {
    (window as any).__onKettlebellRepCompleted = handleRep;
    return () => {
      if ((window as any).__onKettlebellRepCompleted === handleRep) delete (window as any).__onKettlebellRepCompleted;
    };
  }, [handleRep]);

  // The sands: 60s from the first squat
  useEffect(() => {
    if (phase !== 'TRIAL') return;
    const draw = () => {
      const left = Math.max(0, deadlineRef.current - performance.now()) / 1000;
      if (clockRef.current) clockRef.current.textContent = left.toFixed(1);
      if (sandRef.current) sandRef.current.style.width = `${(left / LIMIT) * 100}%`;
      if (left <= 0) finish(false);
    };
    draw();
    const id = window.setInterval(draw, 100);
    return () => clearInterval(id);
  }, [phase, finish]);

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
    onDemoSwing: () => handleRep(TRIAL_EXERCISE),
  });

  useEffect(() => registerDebug(
    'trial',
    () => ({
      phase,
      reps,
      goal: GOAL,
      secondsLeft: phase === 'TRIAL' ? Number((Math.max(0, deadlineRef.current - performance.now()) / 1000).toFixed(1)) : null,
      showResult,
    }),
    {
      // Lands n squats at once (starts the clock if needed)
      trialReps: (n: number) => { for (let i = 0; i < n; i++) handleRep(TRIAL_EXERCISE); },
      // Runs the clock out
      trialExpire: () => { deadlineRef.current = performance.now() - 1; },
    },
  ), [phase, reps, showResult, handleRep]);

  const level = profileManager.getActiveProfile()?.level ?? 1;
  const blade = weaponStats(EXCALIBELL_TRIAL.weaponId, 1, undefined, level);
  const spells = WEAPON_SPELLS[EXCALIBELL_TRIAL.weaponId] ?? [];
  const pct = Math.min(100, (reps / GOAL) * 100);

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 pointer-events-auto select-none">
      {/* Title plaque: steps aside once the bell is raised, so the bell head has the top of the screen */}
      <div className={`mx-auto text-center kk-hud-dispatch px-6 py-2 transition-opacity duration-700 ${phase === 'WON' ? 'opacity-0' : ''}`}>
        <span className="font-pixel text-[9px] text-[#C084FC] block tracking-widest animate-pulse">✦ SECRET STAGE ✦</span>
        <h1 className="font-pixel text-sm text-[#F4B41A] mt-1">THE ENCHANTED STONE OF EXCALIBELL</h1>
      </div>

      {/* The stone holds the centre and the knight its left: the HUD keeps to the right */}
      {phase === 'INTRO' && (
        <div className="absolute right-6 top-1/2 -translate-y-1/2 w-[30%] max-w-sm bg-[#1A1926]/85 border-4 border-[#F4B41A] p-4 rounded shadow-pixel-box-gold">
          <p className="font-mono text-xs text-[#E6E4EE] leading-snug">
            A golden light led thee to a forgotten glade. Here sleeps <span className="text-[#F4B41A]">Excalibell</span>,
            and the stone yields only to a knight who completes
          </p>
          <p className="font-pixel text-sm text-[#F4B41A] my-3 leading-relaxed">{GOAL} GOBLET SQUATS IN {LIMIT} SECONDS</p>
          <p className="font-mono text-[11px] text-[#FF3366]">Thou hast but one try. Fail, and the glade fades into the mist.</p>
          <p className="font-pixel text-[9px] text-[#00EB88] mt-3 animate-pulse leading-relaxed">SQUAT TO BEGIN THE SANDS<br />[ENTER] START</p>
        </div>
      )}

      {phase !== 'INTRO' && !showResult && (
        <div className="absolute right-6 top-1/2 -translate-y-1/2 w-[24%] max-w-xs flex flex-col gap-3">
          <div className="bg-[#1A1926]/85 border-4 border-[#F4B41A] p-3 rounded shadow-pixel-box-gold font-pixel">
            <span className="text-[8px] text-[#A7A9BE] block tracking-wider">GOBLET SQUATS</span>
            <span className="text-3xl text-[#F4B41A]">{reps}</span>
            <span className="text-sm text-[#A7A9BE]"> / {GOAL}</span>
            <div className="kk-hud-vial h-3 mt-2">
              <div className="kk-hud-vial__bar bg-gradient-to-r from-[#D97706] to-[#FDE047]" style={{ width: `${pct}%` }} />
            </div>
            <p className={`text-[8px] mt-2 leading-relaxed ${wrongMove ? 'text-[#FF3366]' : 'text-[#A7A9BE]'}`}>
              {wrongMove ? 'ONLY GOBLET SQUATS LOOSEN THE STONE!' : 'HIPS BELOW KNEES • DRIVE UP'}
            </p>
          </div>
          <div className="bg-[#1A1926]/85 border-4 border-[#38B6FF] p-3 rounded shadow-pixel-box font-pixel text-right">
            <span className="text-[8px] text-[#A7A9BE] block tracking-wider">SANDS</span>
            <span ref={clockRef} className="text-3xl text-[#38B6FF]">{LIMIT.toFixed(1)}</span>
            <span className="text-sm text-[#A7A9BE]">s</span>
            <div className="h-3 mt-2 bg-[#0F0E17] border border-[#2E2B44] overflow-hidden">
              <div ref={sandRef} className="h-full bg-[#38B6FF] ml-auto" style={{ width: '100%' }} />
            </div>
            <p className="text-[8px] mt-2 text-[#A7A9BE] leading-relaxed">THE STONE IS LISTENING</p>
          </div>
        </div>
      )}

      {showResult && (
        // Won: a low banner, so the raised bell stays the picture. Lost: the scene fades behind the card.
        <div className={`absolute inset-0 z-40 flex justify-center ${phase === 'WON' ? 'items-end pb-6' : 'items-center bg-black/70 backdrop-blur-sm'}`}>
          {phase === 'WON' ? (
            <div className="bg-[#1A1926]/90 border-4 border-[#F4B41A] px-5 py-3 max-w-3xl w-full rounded shadow-pixel-box-gold flex items-center gap-5">
              <div className="flex-1 text-left">
                <h2 className="font-pixel text-base text-[#F4B41A]">⚜️ EXCALIBELL IS THINE!</h2>
                <p className="text-[11px] text-[#A7A9BE] font-mono mt-1">
                  {reps} squats, and the stone let go. The holy bell grows as thou dost.
                </p>
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
                className="bg-[#F4B41A] hover:bg-[#ffe175] text-[#0F0E17] font-pixel text-xs py-3 px-4 border-2 border-black shadow-pixel-box flex-shrink-0"
              >
                RETURN TO TOWN ▶
              </button>
            </div>
          ) : (
            <div className="bg-[#1A1926] border-4 border-[#FF3366] p-8 max-w-md w-full text-center rounded shadow-pixel-box">
              <div className="text-5xl mb-2">🪨</div>
              <h2 className="font-pixel text-lg text-[#FF3366] mb-1">THE STONE HOLDS FAST</h2>
              <p className="font-pixel text-sm text-[#F4B41A] my-3">{reps} / {GOAL} SQUATS</p>
              <p className="text-xs text-[#A7A9BE] font-mono mb-5">
                The light fades and the glade sinks into the mist. Perhaps, after another hard-won battle in the
                forests, it will reveal itself again.
              </p>
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
