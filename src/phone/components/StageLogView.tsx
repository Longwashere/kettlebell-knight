import React, { useState } from 'react';
import type { ExerciseType } from '../../types/game';
import {
  type StageAttempt,
  attemptSeconds,
  clockTime,
  movedAt,
  outcomeText,
  reviewable,
  stageLogText,
  stepMark,
  REP_STEP,
} from '../utils/stageLog';

const label = (ex: ExerciseType): string => ex.replace(/_/g, ' ');

type Filter = 'all' | 'rep' | 'missed';

const OUTCOME_COLOR: Record<StageAttempt['outcome'], string> = {
  rep: 'text-[#F4D35E]',
  missed: 'text-[#FF8FA8]',
  'lost-sight': 'text-[#8A8295]',
  open: 'text-[#38B6FF]',
};

/**
 * Test mode's stage log: every attempt at an exercise with the stages it reached, newest first. Tap an attempt
 * to see each stage's time and the tracker's measurements on that frame; COPY / SAVE export it all as text.
 */
export const StageLogView: React.FC<{ attempts: StageAttempt[] }> = ({ attempts }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const all = reviewable(attempts);
  const shown = all.filter((a) => filter === 'all' || (filter === 'rep' ? a.outcome === 'rep' : a.outcome !== 'rep' && a.outcome !== 'open'));

  const flash = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(null), 1500);
  };
  const save = () => {
    const blob = new Blob([stageLogText(attempts, label)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kk-stage-log-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.txt`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    flash('SAVED');
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(stageLogText(attempts, label));
      flash('COPIED');
    } catch {
      save(); // the clipboard needs a secure context and permission; saving always works
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-5 gap-1.5">
        {(['all', 'rep', 'missed'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`kk-phone-btn kk-phone-btn--sm ${filter === f ? '' : 'kk-phone-btn--iron'}`}
          >
            {f === 'all' ? 'ALL' : f === 'rep' ? 'REPS' : 'MISSED'}
          </button>
        ))}
        <button onClick={copy} disabled={all.length === 0} className="kk-phone-btn kk-phone-btn--iron kk-phone-btn--sm">
          {notice === 'COPIED' ? '✓' : 'COPY'}
        </button>
        <button onClick={save} disabled={all.length === 0} className="kk-phone-btn kk-phone-btn--iron kk-phone-btn--sm">
          {notice === 'SAVED' ? '✓' : 'SAVE'}
        </button>
      </div>

      <div className="max-h-[38dvh] overflow-y-auto pr-0.5 space-y-1">
        {shown.length === 0 ? (
          <div className="kk-phone-tome text-[16px]">
            {all.length === 0 ? 'No attempts yet — each try at an exercise is written here, stage by stage.' : 'None match this filter.'}
          </div>
        ) : (
          shown.map((a) => {
            const open = expanded === a.id;
            const seconds = attemptSeconds(a);
            return (
              <button
                key={a.id}
                onClick={() => setExpanded(open ? null : a.id)}
                className={`w-full text-left px-2 py-1.5 border ${open ? 'border-[#C98A12] bg-[#0B0A10]/90' : 'border-[#2A2633] bg-[#0B0A10]/70'}`}
              >
                <div className="flex items-baseline justify-between gap-2 font-retro text-[16px] leading-tight">
                  <span className="text-[#8A8295] shrink-0">{clockTime(movedAt(a))}</span>
                  <span className="flex-1 truncate text-[#ECE2CA]">{label(a.exercise)}</span>
                  <span className={`shrink-0 ${OUTCOME_COLOR[a.outcome]}`}>
                    {a.outcome === 'rep' ? `★ REP ${a.power}` : a.outcome === 'missed' ? 'MISSED' : a.outcome === 'lost-sight' ? 'LOST SIGHT' : '…'}
                  </span>
                </div>
                {/* The stage path at a glance */}
                <div className="font-retro text-[14px] leading-tight text-[#A7A9BE] truncate">
                  {a.steps
                    .filter((s) => s.state !== REP_STEP)
                    .map((s) => `${stepMark(s)}${s.stateName}`)
                    .join(' → ')}
                  {seconds !== undefined && <span className="text-[#4A4458]"> · {seconds.toFixed(1)}s</span>}
                </div>
                {open && (
                  <div className="mt-1 pt-1 border-t border-[#2A2633] space-y-0.5">
                    <div className={`font-retro text-[14px] ${OUTCOME_COLOR[a.outcome]}`}>{outcomeText(a)}</div>
                    {a.steps.map((s, i) => (
                      <div key={i} className="font-retro text-[14px] leading-tight">
                        <span className="text-[#8A8295]">{clockTime(s.at)} </span>
                        <span className={s.state === REP_STEP ? 'text-[#F4D35E]' : 'text-[#ECE2CA]'}>
                          {stepMark(s)} {s.stateName}
                        </span>
                        {s.detail && <div className="pl-4 text-[#7FA88F]">{s.detail}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
