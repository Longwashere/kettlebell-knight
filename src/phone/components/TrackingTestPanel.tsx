import React from 'react';
import { ExerciseType, EXERCISE_SKILLS } from '../../types/game';
import type { ExercisePhase } from '../utils/HandTracker';

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

interface TrackingTestPanelProps {
  tracked: ExerciseType[];
  onToggleExercise: (ex: ExerciseType) => void;
  onSetTracked: (exercises: ExerciseType[]) => void;
  counts: Partial<Record<ExerciseType, number>>;
  phases: Map<ExerciseType, ExercisePhase>;
  flashing: ExerciseType[];
  log: TestRepEntry[];
  sendToTv: boolean;
  onToggleSendToTv: () => void;
  speak: boolean;
  onToggleSpeak: () => void;
  onReset: () => void;
  onExit: () => void;
}

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
  sendToTv,
  onToggleSendToTv,
  speak,
  onToggleSpeak,
  onReset,
  onExit,
}) => {
  const total = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);
  const compound = log.filter((e) => e.exercises.length > 1).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[8px] font-pixel text-[#FF3366]">
        <span>🧪 TRACKING TEST • {tracked.length} TRACKED</span>
        <button onClick={onExit} className="text-[#38B6FF] border border-[#38B6FF] px-1.5 py-0.5">
          EXIT TEST
        </button>
      </div>

      <div className="flex gap-1 text-[7px] font-pixel">
        <button onClick={() => onSetTracked(ALL_EXERCISES)} className="flex-1 bg-[#2E2B44] text-white py-1.5 border border-black">
          ALL
        </button>
        <button onClick={() => onSetTracked([])} className="flex-1 bg-[#2E2B44] text-white py-1.5 border border-black">
          NONE
        </button>
        <button onClick={onReset} className="flex-1 bg-[#2E2B44] text-[#F4B41A] py-1.5 border border-black">
          RESET
        </button>
        <button
          onClick={onToggleSpeak}
          className={`flex-1 py-1.5 border border-black ${speak ? 'bg-[#00EB88] text-black' : 'bg-[#2E2B44] text-[#A7A9BE]'}`}
        >
          {speak ? '🔊 VOICE' : '🔇 VOICE'}
        </button>
        <button
          onClick={onToggleSendToTv}
          className={`flex-1 py-1.5 border border-black ${sendToTv ? 'bg-[#38B6FF] text-black' : 'bg-[#2E2B44] text-[#A7A9BE]'}`}
        >
          {sendToTv ? 'TV: ON' : 'TV: OFF'}
        </button>
      </div>

      {/* Tap to track / untrack; each tile shows its live phase and reps counted */}
      <div className="grid grid-cols-3 gap-1">
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
              className={`p-1 border-2 text-left transition-colors ${
                flash ? 'bg-[#F4B41A] text-black' : on ? 'bg-[#1A1926] text-white' : 'bg-[#0F0E17] text-[#2E2B44]'
              }`}
              style={{ borderColor: on ? (moving || flash ? '#F4B41A' : color) : '#2E2B44' }}
            >
              <div className="flex justify-between items-center">
                <span className="font-pixel text-[6px] truncate">{exerciseLabel(ex)}</span>
                <span className="font-pixel text-[9px]">{counts[ex] ?? 0}</span>
              </div>
              <div
                className={`text-[6px] font-mono uppercase truncate ${
                  flash ? 'text-black' : moving ? 'text-[#F4B41A]' : 'text-[#A7A9BE]'
                }`}
              >
                {on ? phase?.stateName ?? '—' : 'OFF'}
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-[#1A1926] border-2 border-[#2E2B44] p-2 space-y-1">
        <div className="flex justify-between text-[7px] font-pixel text-[#A7A9BE]">
          <span>REP LOG</span>
          <span>
            {total} REPS • {log.length} MOVES • {compound} COMPOUND
          </span>
        </div>
        {log.length === 0 ? (
          <div className="text-[9px] font-mono text-[#A7A9BE]">Move in front of the camera — counted reps appear here.</div>
        ) : (
          <div className="max-h-40 overflow-y-auto space-y-0.5">
            {log.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-[9px] font-mono">
                <span className="text-[#A7A9BE] w-14 shrink-0">
                  {new Date(entry.at).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })}
                </span>
                <span className={`flex-1 truncate ${entry.exercises.length > 1 ? 'text-[#F4B41A]' : 'text-white'}`}>
                  {entry.exercises.map(exerciseLabel).join(' + ')}
                </span>
                <span className="text-[#38B6FF] shrink-0">
                  ⚡{entry.power} • {Math.round(entry.form * 100)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
