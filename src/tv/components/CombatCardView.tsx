import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { CardRarity, CombatCard } from '../../types/battle';
import { getCardArt } from './cardArt';
import { EXERCISE_GUIDES, getExerciseFrames, getExerciseStrip } from './exerciseGuide';

/** Frame metal per rarity: iron, blued silver, amethyst, gilded. */
const RARITY: Record<CardRarity, { rim: string; rimDark: string; gem: string; foil: string | null }> = {
  common: { rim: '#8A8698', rimDark: '#2E2B3A', gem: '#A8A29E', foil: null },
  rare: { rim: '#9CC6E8', rimDark: '#1E3A5F', gem: '#38B6FF', foil: null },
  epic: { rim: '#C084FC', rimDark: '#3B0764', gem: '#A855F7', foil: '192, 132, 252' },
  legendary: { rim: '#F4B41A', rimDark: '#78350F', gem: '#F4B41A', foil: '244, 180, 26' },
};

const TYPE_GLYPH: Record<CombatCard['type'], string> = { ATTACK: '⚔', DEFENSE: '⛨', POWER: '✦' };

function rgb(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

interface CombatCardViewProps {
  card: CombatCard;
  index: number;
  handSize: number;
  focused: boolean;
  flipped: boolean;
  onSelect: () => void;
}

/**
 * Card back: how to perform the card's exercise. A looping pixel flipbook of the key positions at
 * the movement's tempo, a step strip naming each position, and short form cues.
 */
const TechniqueSide: React.FC<{ card: CombatCard; active: boolean }> = ({ card, active }) => {
  const guide = EXERCISE_GUIDES[card.exercise];
  const frames = useMemo(() => getExerciseFrames(card.exercise, parseInt(card.colorHex.slice(1), 16)), [card.exercise, card.colorHex]);
  const [frame, setFrame] = useState(0);

  // Only tick while the back is showing; UI-rate state (a few changes per second), not per-frame
  useEffect(() => {
    if (!active) {
      setFrame(0);
      return;
    }
    const id = setInterval(() => setFrame((f) => (f + 1) % frames.length), guide.tempoMs);
    return () => clearInterval(id);
  }, [active, frames.length, guide.tempoMs]);

  return (
    <div className="kk-card kk-card--back">
      <div className="kk-card__head">
        <div className="kk-card__cost" title={`${card.requiredReps} reps to cast`}>
          <span>{card.requiredReps}</span>
        </div>
        <div className="kk-card__name" style={{ fontSize: guide.name.length > 16 ? 8 : 9 }}>{guide.name}</div>
      </div>

      <div className="kk-card__art kk-card__art--guide">
        {frames.map((url, i) => (
          <img key={i} src={url} alt="" className="pixelated" draggable={false} style={{ opacity: i === frame ? 1 : 0 }} />
        ))}
        <div className="kk-guide__label">
          <span>{frame + 1}</span>
          {guide.frames[frame].label}
        </div>
      </div>

      <div className="kk-guide__steps">
        {guide.frames.map((f, i) => (
          <React.Fragment key={f.label}>
            {i > 0 && <i className="kk-guide__arrow">▸</i>}
            <span className={`kk-guide__step ${i === frame ? 'kk-guide__step--on' : ''}`}>{f.label}</span>
          </React.Fragment>
        ))}
      </div>

      <ul className="kk-guide__cues">
        {guide.cues.map((cue) => (
          <li key={cue}>{cue}</li>
        ))}
      </ul>

      <div className="kk-guide__foot">
        {card.requiredReps} REPS TO CAST • <b>ENTER</b> FLIP
      </div>
    </div>
  );
};

/**
 * A combat card drawn like a 90s dark-fantasy TCG card: rarity-metal frame with rivets, rep-cost gem,
 * engraved name banner, pixel-art illustration (cardArt.ts), type line, parchment rules text,
 * rep pips and heraldic DMG / BLOCK plaques. Cards fan out in the hand; the focused one lifts.
 */
export const CombatCardView: React.FC<CombatCardViewProps> = ({ card, index, handSize, focused, flipped, onSelect }) => {
  const art = useMemo(() => getCardArt(card.templateId), [card.templateId]);
  const rarity = RARITY[card.rarity];
  const guide = EXERCISE_GUIDES[card.exercise];
  const strip = useMemo(() => getExerciseStrip(card.exercise, parseInt(card.colorHex.slice(1), 16)), [card.exercise, card.colorHex]);
  // The figure and its step label loop with the same stepped CSS animation, so they stay in sync
  const loopStyle = {
    '--strip': `url(${strip})`,
    '--n': guide.frames.length,
    '--dur': `${guide.frames.length * guide.tempoMs}ms`,
  } as React.CSSProperties;

  // Animate only the pip that was just earned
  const prevReps = useRef(card.currentReps);
  const newPip = card.currentReps > prevReps.current ? card.currentReps - 1 : -1;
  useEffect(() => {
    prevReps.current = card.currentReps;
  }, [card.currentReps]);

  const offset = index - (handSize - 1) / 2;
  const primed = card.currentReps === card.requiredReps - 1;
  const nameSize = card.name.length > 17 ? 8 : card.name.length > 13 ? 9 : 10;

  const style = {
    '--accent': card.colorHex,
    '--accent-rgb': rgb(card.colorHex),
    '--rim': rarity.rim,
    '--rim-dark': rarity.rimDark,
    '--gem': rarity.gem,
    '--foil-rgb': rarity.foil ?? '255, 255, 255',
    '--fan-rot': `${offset * 2.5}deg`,
    '--fan-y': `${Math.abs(offset) * 4 + 2}px`,
    '--deal-i': index,
  } as React.CSSProperties;

  return (
    <div
      className={`kk-card-slot ${focused ? 'kk-card-slot--focused' : ''} ${primed ? 'kk-card-slot--primed' : ''} ${flipped ? 'kk-card-slot--flipped' : ''}`}
      style={style}
      onClick={onSelect}
    >
      <div className="kk-card-flip">
      <div className="kk-card kk-card--front">
        <div className="kk-card__head">
          <div className="kk-card__cost" title={`${card.requiredReps} reps to cast`}>
            <span>{card.requiredReps}</span>
          </div>
          <div className="kk-card__name" style={{ fontSize: nameSize }}>{card.name}</div>
        </div>

        <div className="kk-card__art">
          <img src={art} alt="" className="pixelated" draggable={false} />
          {rarity.foil && <div className="kk-card__foil" />}
        </div>

        <div className="kk-card__type">
          <span>
            <span className="kk-card__glyph">{TYPE_GLYPH[card.type]}</span> {card.type}
          </span>
          <span className="kk-card__rarity">
            {card.rarity}
            <i className="kk-card__gem" />
          </span>
        </div>

        <div className="kk-card__text">{card.effectDesc}</div>

        <div className="kk-card__foot" style={loopStyle}>
          <div className="kk-loop" aria-label={`How to: ${guide.name}`}>
            <div className="kk-loop__img pixelated" />
          </div>
          <div className="kk-card__how">
            <div className="kk-card__exercise">{card.exerciseLabel}</div>
            <div className="kk-loop__steps">
              <div className="kk-loop__track">
                {guide.frames.map((f, i) => (
                  <span key={f.label}>
                    <b>{i + 1}</b>
                    {f.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="kk-card__pips" aria-label={`${card.currentReps} of ${card.requiredReps} reps`}>
              {Array.from({ length: card.requiredReps }, (_, i) => (
                <i
                  key={i}
                  className={`kk-pip ${i < card.currentReps ? 'kk-pip--on' : ''} ${i === newPip ? 'kk-pip--new' : ''}`}
                />
              ))}
            </div>
            <div className="kk-card__count">
              {card.currentReps}/{card.requiredReps} REPS
            </div>
          </div>
        </div>

        {card.damage > 0 && (
          <div className="kk-stat kk-stat--dmg" title="Damage">
            <div className="kk-stat__inner">
              <span className="kk-stat__glyph">⚔</span>
              {card.damage}
            </div>
          </div>
        )}
        {card.block > 0 && (
          <div className="kk-stat kk-stat--block" title="Block">
            <div className="kk-stat__inner">
              <span className="kk-stat__glyph">⛨</span>
              {card.block}
            </div>
          </div>
        )}
        </div>
        <TechniqueSide card={card} active={flipped} />
      </div>
    </div>
  );
};
