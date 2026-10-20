import React, { useState } from 'react';
import { ExerciseType, EXERCISE_SKILLS } from '../../types/game';
import type { ExercisePhase } from '../utils/HandTracker';
import type { ArmSide } from '../utils/KinematicTracker';
import { StageLogView } from './StageLogView';
import { reviewable, type StageAttempt } from '../utils/stageLog';

export const ALL_EXERCISES = Object.keys(EXERCISE_SKILLS) as ExerciseType[];

/** One movement: every exercise that counted a rep within REP_GROUP_MS of the first. */
export interface TestRepEntry {
  id: number;
  at: number;
  exercises: ExerciseType[];
  power: number;
  form: number;
}

export const REP_GROUP_MS = 400;

export const exerciseLabel = (ex: ExerciseType): string => ex.replace(/_/g, ' ');

const ARM_LABEL: Record<ArmSide, string> = { LEFT: '◀ LEFT ARM', RIGHT: 'RIGHT ARM ▶', BOTH: '◆ BOTH HANDS' };

interface TrackingTestPanelProps {
  tracked: ExerciseType[];
  onToggleExercise: (ex: ExerciseType) => void;
  onSetTracked: (exercises: ExerciseType[]) => void;
  counts: Partial<Record<ExerciseType, number>>;
  phases: Map<ExerciseType, ExercisePhase>;
  flashing: ExerciseType[];
  log: TestRepEntry[];
  stageAttempts: StageAttempt[];
  sendToTv: boolean;
  onToggleSendToTv: () => void;
  speak: boolean;
  onToggleSpeak: () => void;
  onReset: () => void;
  onExit: () => void;
}

/** Exercises mid-rep (past stage 0) first, then those holding their start position; at most three. */
const liveStages = (tracked: ExerciseType[], phases: Map<ExerciseType, ExercisePhase>) =>
  tracked
    .map((ex) => ({ ex, phase: phases.get(ex) }))
    .filter((e): e is { ex: ExerciseType; phase: ExercisePhase } => !!e.phase?.stages && (e.phase.state > 0 || e.phase.armed))
    .sort((a, b) => b.phase.state - a.phase.state)
    .slice(0, 3);

/** An exercise's stages in order: done ✓, current ▶ (stage 0 turns green ✓ once its start position is met). */
const StageList: React.FC<{ phase: ExercisePhase; flash: boolean }> = ({ phase, flash }) => (
  <div className="mt-0.5">
    {phase.stages!.map((name, i) => {
      const current = phase.state === i;
      const done = i < phase.state;
      const ready = current && i === 0 && phase.armed;
      const color = flash
        ? 'text-black'
        : ready
        ? 'text-[#00EB88]'
        : current
        ? i === 0
          ? 'text-[#ECE2CA]'
          : 'text-[#F4D35E]'
        : done
        ? 'text-[#7FA88F]'
        : 'text-[#4A4458]';
      const mark = ready ? '✓' : current ? '▶' : done ? '✓' : '·';
      return (
        <div key={name} className={`flex gap-1 font-retro text-[13px] leading-[1.05] uppercase ${color}`}>
          <span className="w-2 shrink-0">{mark}</span>
          <span className="truncate">{name}</span>
        </div>
      );
    })}
  </div>
);

/**
 * Phone test mode: pick which exercises the parallel tracker runs (the same HandTracker battle uses),
 * then move and see which of them count each rep.
 */
export const TrackingTestPanel: React.FC<TrackingTestPanelProps> = ({
  tracked,
  onToggleExercise,
  onSetTracked,
  counts,
  phases,
  flashing,
  log,
  stageAttempts,
  sendToTv,
  onToggleSendToTv,
  speak,
  onToggleSpeak,
  onReset,
  onExit,
}) => {
  const total = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);
  const compound = log.filter((e) => e.exercises.length > 1).length;
  // Folded, only the header and the latest movement show, so the camera keeps the screen
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<'exercises' | 'stages'>('exercises');
  const latest = log[0];
  const live = liveStages(tracked, phases);

  return (
    <div className="kk-phone-slab kk-phone-slab--glass px-3 pt-3 pb-3 space-y-2">
      <div className="flex justify-center -mt-7">
        <button onClick={() => setOpen((v) => !v)} className="kk-phone-plate kk-phone-plate--sm">
          TRIAL OF FORM {open ? '▼' : '▲'}
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="font-pixel text-[8px] text-[#A7A9BE]">
          {tracked.length} WATCHED • {total} REPS • {compound} COMPOUND
        </span>
        <button onClick={onExit} className="kk-phone-btn kk-phone-btn--blood kk-phone-btn--sm">
          END TEST
        </button>
      </div>

      <div className="kk-phone-heading text-[12px] leading-snug min-h-[1.5em]">
        <span className="text-[#8A8295]">NOW </span>
        {live.length === 0 ? (
          <span className="text-[#8A8295]">standing still</span>
        ) : (
          live.map(({ ex, phase }, i) => (
            <span key={ex}>
              {i > 0 && <span className="text-[#4A4458]"> · </span>}
              <span className="text-[#ECE2CA]">{exerciseLabel(ex)} </span>
              <span className={phase.state > 0 ? 'text-[#F4D35E]' : 'text-[#00EB88]'}>
                {phase.state > 0 ? '▶' : '✓'} {phase.stateName}
              </span>
            </span>
          ))
        )}
      </div>

      {!open ? (
        <div className="kk-phone-tome text-[16px] truncate">
          {latest ? `Last rep: ${latest.exercises.map(exerciseLabel).join(' + ')}` : 'No rep struck yet.'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-1.5">
            <button onClick={() => onSetTracked(ALL_EXERCISES)} className="kk-phone-btn kk-phone-btn--iron kk-phone-btn--sm">
              ALL
            </button>
            <button onClick={() => onSetTracked([])} className="kk-phone-btn kk-phone-btn--iron kk-phone-btn--sm">
              NONE
            </button>
            <button onClick={onReset} className="kk-phone-btn kk-phone-btn--iron kk-phone-btn--sm">
              RESET
            </button>
            <button
              onClick={onToggleSpeak}
              className={`kk-phone-btn kk-phone-btn--sm ${speak ? '' : 'kk-phone-btn--iron'}`}
            >
              VOICE
            </button>
            <button
              onClick={onToggleSendToTv}
              className={`kk-phone-btn kk-phone-btn--sm ${sendToTv ? '' : 'kk-phone-btn--iron'}`}
            >
              TV
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setTab('exercises')}
              className={`kk-phone-btn kk-phone-btn--sm ${tab === 'exercises' ? '' : 'kk-phone-btn--iron'}`}
            >
              EXERCISES
            </button>
            <button
              onClick={() => setTab('stages')}
              className={`kk-phone-btn kk-phone-btn--sm ${tab === 'stages' ? '' : 'kk-phone-btn--iron'}`}
            >
              STAGE LOG ({reviewable(stageAttempts).length})
            </button>
          </div>

          {tab === 'stages' ? (
            <StageLogView attempts={stageAttempts} />
          ) : (
            <>
            {/* Tap to watch / ignore; each tile shows its arm, live phase and reps counted */}
            <div className="grid grid-cols-3 gap-1.5 max-h-[30dvh] overflow-y-auto pr-0.5">
              {ALL_EXERCISES.map((ex) => {
                const on = tracked.includes(ex);
                const phase = on ? phases.get(ex) : undefined;
                const moving = (phase?.state ?? 0) > 0;
                const flash = flashing.includes(ex);
                const color = EXERCISE_SKILLS[ex].colorHex;
                return (
                  <button
                    key={ex}
                    onClick={() => onToggleExercise(ex)}
                    className={`p-1.5 border-2 text-left transition-colors ${
                      flash ? 'bg-[#F4B41A] text-black' : on ? 'bg-[#0B0A10]/85 text-[#ECE2CA]' : 'bg-[#0B0A10]/60 text-[#4A4458]'
                    }`}
                    style={{
                      borderColor: on ? (moving || flash ? '#F4B41A' : color) : '#2A2633',
                      boxShadow: moving && !flash ? '0 0 10px rgba(244, 180, 26, 0.45)' : undefined,
                    }}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <span className="font-pixel text-[6px] leading-snug">{exerciseLabel(ex)}</span>
                      <span className="kk-phone-heading text-[13px] leading-none">{counts[ex] ?? 0}</span>
                    </div>
                    {on && phase?.stages ? (
                      <StageList phase={phase} flash={flash} />
                    ) : (
                      <div className={`font-retro text-[14px] leading-none uppercase truncate mt-0.5 ${flash ? 'text-black' : 'text-[#8A8295]'}`}>
                        {on ? phase?.stateName ?? '—' : 'ignored'}
                      </div>
                    )}
                    {phase && (
                      <div className={`font-pixel text-[5px] mt-0.5 ${flash ? 'text-black' : 'text-[#38B6FF]'}`}>
                        {ARM_LABEL[phase.arm]}
                      </div>
                    )}
                    {phase?.detail && (
                      <div className={`font-retro text-[12px] leading-none mt-0.5 ${flash ? 'text-black' : 'text-[#A7A9BE]'}`}>
                        {phase.detail}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="max-h-[14dvh] overflow-y-auto border-t border-[#4A4458] pt-1.5">
              {log.length === 0 ? (
                <div className="kk-phone-tome text-[16px]">Move before the eye — counted reps are written here.</div>
              ) : (
                log.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-2 font-retro text-[16px] leading-tight">
                    <span className="text-[#8A8295] w-12 shrink-0">
                      {new Date(entry.at).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className={`flex-1 truncate ${entry.exercises.length > 1 ? 'text-[#F4D35E]' : 'text-[#ECE2CA]'}`}>
                      {entry.exercises.map(exerciseLabel).join(' + ')}
                    </span>
                    <span className="text-[#38B6FF] shrink-0">
                      {entry.power} • {Math.round(entry.form * 100)}%
                    </span>
                  </div>
                ))
              )}
            </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
