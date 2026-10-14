import React, { useEffect, useMemo, useRef } from 'react';
import type { CardRarity, CombatCard } from '../../types/battle';
import { getCardArt } from './cardArt';

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
  onSelect: () => void;
}

/**
 * A combat card drawn like a 90s dark-fantasy TCG card: rarity-metal frame with rivets, rep-cost gem,
 * engraved name banner, pixel-art illustration (cardArt.ts), type line, parchment rules text,
 * rep pips and heraldic DMG / BLOCK plaques. Cards fan out in the hand; the focused one lifts.
 */
export const CombatCardView: React.FC<CombatCardViewProps> = ({ card, index, handSize, focused, onSelect }) => {
  const art = useMemo(() => getCardArt(card.templateId), [card.templateId]);
  const rarity = RARITY[card.rarity];

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
      className={`kk-card-slot ${focused ? 'kk-card-slot--focused' : ''} ${primed ? 'kk-card-slot--primed' : ''}`}
      style={style}
      onClick={onSelect}
    >
      <div className="kk-card">
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

        <div className="kk-card__foot">
          <div className="kk-card__exercise">{card.exerciseLabel}</div>
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
    </div>
  );
};
