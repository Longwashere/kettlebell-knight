import React, { useState } from 'react';
import { Swords, Music, Volume2, DoorOpen } from 'lucide-react';
import { audioManager } from '../../shared/AudioManager';
import { useTVRemote } from '../hooks/useTVRemote';

interface PauseMenuProps {
  /** Unbanked gold from this fight, lost if the knight quits. */
  fightGold: number;
  onResume: () => void;
  onQuit: () => void;
}

type Row = 'CONTINUE' | 'MUSIC' | 'SFX' | 'QUIT';
const ROWS: Row[] = ['CONTINUE', 'MUSIC', 'SFX', 'QUIT'];
const STEPS = 10;

/**
 * Battle pause menu (Back / Esc mid-fight): continue, music and sound volume, or quit the battle.
 * The battle's own remote handler is off while this is open; Back resumes (or cancels the quit prompt).
 */
export const PauseMenu: React.FC<PauseMenuProps> = ({ fightGold, onResume, onQuit }) => {
  const [index, setIndex] = useState(0);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [confirmIndex, setConfirmIndex] = useState(0); // 0 STAY, 1 ABANDON
  const [music, setMusic] = useState(() => Math.round(audioManager.getMusicLevel() * STEPS));
  const [sfx, setSfx] = useState(() => Math.round(audioManager.getSfxLevel() * STEPS));

  const row = ROWS[index];

  const adjust = (which: 'MUSIC' | 'SFX', delta: number) => {
    if (which === 'MUSIC') {
      const next = Math.max(0, Math.min(STEPS, music + delta));
      setMusic(next);
      audioManager.setMusicLevel(next / STEPS);
    } else {
      const next = Math.max(0, Math.min(STEPS, sfx + delta));
      setSfx(next);
      audioManager.setSfxLevel(next / STEPS);
      // A sample at the new level (the D-pad tick already played at the old one)
      audioManager.play('ui_select', { delay: 0.06 });
    }
  };

  const select = (r: Row) => {
    if (r === 'CONTINUE') onResume();
    else if (r === 'QUIT') {
      setConfirmQuit(true);
      setConfirmIndex(0);
    }
  };

  useTVRemote({
    onUp: () => (confirmQuit ? undefined : setIndex((i) => (i + ROWS.length - 1) % ROWS.length)),
    onDown: () => (confirmQuit ? undefined : setIndex((i) => (i + 1) % ROWS.length)),
    onLeft: () => {
      if (confirmQuit) setConfirmIndex(0);
      else if (row === 'MUSIC' || row === 'SFX') adjust(row, -1);
    },
    onRight: () => {
      if (confirmQuit) setConfirmIndex(1);
      else if (row === 'MUSIC' || row === 'SFX') adjust(row, 1);
    },
    onSelect: () => {
      if (confirmQuit) {
        if (confirmIndex === 1) onQuit();
        else setConfirmQuit(false);
      } else select(row);
    },
    onBack: () => (confirmQuit ? setConfirmQuit(false) : onResume()),
  });

  const volumeRow = (r: 'MUSIC' | 'SFX', label: string, Icon: typeof Music, level: number) => (
    <div
      key={r}
      className={`kk-pause__row ${row === r ? 'kk-pause__row--on' : ''}`}
      onClick={() => setIndex(ROWS.indexOf(r))}
    >
      <Icon className="kk-pause__icon" />
      <span className="kk-pause__label">{label}</span>
      <div className="kk-pause__volume">
        <button className="kk-pause__arrow" onClick={(e) => { e.stopPropagation(); setIndex(ROWS.indexOf(r)); adjust(r, -1); }}>◀</button>
        <div className="kk-pause__pips">
          {Array.from({ length: STEPS }, (_, i) => (
            <i key={i} className={i < level ? 'kk-pause__pip--on' : ''} />
          ))}
        </div>
        <button className="kk-pause__arrow" onClick={(e) => { e.stopPropagation(); setIndex(ROWS.indexOf(r)); adjust(r, 1); }}>▶</button>
        <span className="kk-pause__value">{level === 0 ? 'OFF' : `${level * 10}%`}</span>
      </div>
    </div>
  );

  return (
    <div className="kk-pause">
      <div className="kk-pause__backdrop" />
      <div className="kk-hud-card kk-pause__panel">
        <div className="kk-pause__crest">
          <span className="kk-pause__bar" />
          <span className="kk-pause__bar" />
        </div>
        <h2 className="kk-pause__title">PAUSED</h2>
        <p className="kk-pause__subtitle">The foe holds its ground. Catch your breath, knight.</p>

        {confirmQuit ? (
          <div className="kk-pause__confirm">
            <p className="font-pixel text-[10px] text-[#FF3366] tracking-wide">ABANDON THE BATTLE?</p>
            <p className="font-retro text-[18px] leading-tight text-[#A7A9BE] mt-2">
              You return to camp.
              {fightGold > 0 ? <> The <span className="text-[#F4B41A]">{fightGold} gold</span> in this fight's purse is forfeit.</> : ' Progress in this fight is lost.'}
            </p>
            <div className="flex gap-3 mt-4 justify-center">
              <button
                className={`kk-pause__choice ${confirmIndex === 0 ? 'kk-pause__choice--on' : ''}`}
                onClick={() => setConfirmQuit(false)}
              >
                STAY AND FIGHT
              </button>
              <button
                className={`kk-pause__choice kk-pause__choice--danger ${confirmIndex === 1 ? 'kk-pause__choice--on' : ''}`}
                onClick={onQuit}
              >
                ABANDON
              </button>
            </div>
          </div>
        ) : (
          <div className="kk-pause__rows">
            <div
              className={`kk-pause__row ${row === 'CONTINUE' ? 'kk-pause__row--on' : ''}`}
              onClick={() => select('CONTINUE')}
            >
              <Swords className="kk-pause__icon" />
              <span className="kk-pause__label">CONTINUE</span>
            </div>
            {volumeRow('MUSIC', 'MUSIC', Music, music)}
            {volumeRow('SFX', 'SOUND FX', Volume2, sfx)}
            <div
              className={`kk-pause__row kk-pause__row--danger ${row === 'QUIT' ? 'kk-pause__row--on' : ''}`}
              onClick={() => { setIndex(ROWS.indexOf('QUIT')); select('QUIT'); }}
            >
              <DoorOpen className="kk-pause__icon" />
              <span className="kk-pause__label">QUIT BATTLE</span>
            </div>
          </div>
        )}

        <div className="kk-pause__hint">
          {confirmQuit
            ? '[◀ / ▶] CHOOSE • [ENTER] CONFIRM • [BACK] CANCEL'
            : '[▲ / ▼] SELECT • [◀ / ▶] VOLUME • [ENTER] CHOOSE • [BACK] RESUME'}
        </div>
      </div>
    </div>
  );
};
