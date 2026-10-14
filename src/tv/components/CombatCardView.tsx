import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { CardRarity, CombatCard } from '../../types/battle';
import { getCardArt } from './cardArt';
import { EXERCISE_GUIDES, getExerciseFrames, getExerciseStrip } from './exerciseGuide';
import { TARGET_LABEL } from '../../shared/cardBalance';
import type { CardTarget } from '../../types/battle';

/**
 * Formation diagram: three cells, front to back (left to right). Lit cells are hit at full damage,
 * dim cells for reduced or random damage.
 */
const TARGET_CELLS: Record<CardTarget, ('on' | 'part' | '')[]> = {
  SINGLE: ['on', '', ''],
  BACK: ['', '', 'on'],
  PIERCE: ['on', 'part', ''],
  CHAIN: ['part', 'part', 'part'],
  ALL: ['on', 'on', 'on'],
};

const TargetPips: React.FC<{ target: CardTarget }> = ({ target }) => (
  <span className="kk-target-pips" aria-hidden>
    {TARGET_CELLS[target].map((state, i) => (
      <i key={i} className={state ? `kk-target-pip--${state}` : ''} />
    ))}
  </span>
);

/** Rules text with its keywords (targeting, Block, Stagger, healing) highlighted. */
const KEYWORDS = /(ALL foes|rearmost foe|foe behind|random foes|Ignores Block\.|Stagger [\d.]+s\.|Heal \d+\.|Gain \d+ Block\.)/;
const RulesText: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(KEYWORDS).map((part, i) => (i % 2 ? <b key={i} className="kk-kw">{part}</b> : part))}
  </>
);

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
  /** Card just cast from this slot: plays the shatter animation over the incoming replacement. */
  castGhost?: CombatCard;
  /** Delay before this card deals in (a replacement waits for the cast animation). */
  dealDelayMs?: number;
  onCastDone?: () => void;
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
        <div className="kk-card__name" style={{ fontSize: guide.name.length > 16 ? 10 : 11 }}>{guide.name}</div>
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
        {card.requiredReps} REPS • <b>ENTER</b> FLIP
      </div>
    </div>
  );
};

/**
 * A combat card drawn like a 90s dark-fantasy TCG card: rarity-metal frame with rivets, rep-cost gem,
 * engraved name banner, pixel-art illustration (cardArt.ts), type line, parchment rules text,
 * rep pips and heraldic DMG / BLOCK plaques. Cards fan out in the hand; the focused one lifts.
 */
/** Card face (front side). Also used, clipped into shards, by the cast animation. */
const CardFront: React.FC<{ card: CombatCard; newPip?: number }> = ({ card, newPip = -1 }) => {
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
  const nameSize = card.name.length > 17 ? 10 : card.name.length > 13 ? 11 : 12;

  return (
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
        <span className="kk-card__rarity" title={`${card.rarity} • ${TARGET_LABEL[card.target]}`}>
          {TARGET_LABEL[card.target]}
          {card.target === 'CHAIN' ? ` ×${card.hits}` : ''}
          <TargetPips target={card.target} />
        </span>
      </div>

      <div className="kk-card__text">
        <RulesText text={card.effectDesc} />
      </div>

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
  );
};

/**
 * Shards the cast card shatters into: triangles fanning from a point just above centre to the
 * perimeter. Each flies outward and up toward the battlefield, spinning as it burns away.
 */
const SHARD_CENTER = [50, 42];
const SHARD_RIM = [[0, 0], [52, 0], [100, 0], [100, 55], [100, 100], [48, 100], [0, 100], [0, 50]];
const SHARDS = SHARD_RIM.map((p, i) => {
  const q = SHARD_RIM[(i + 1) % SHARD_RIM.length];
  const cx = (SHARD_CENTER[0] + p[0] + q[0]) / 3;
  const cy = (SHARD_CENTER[1] + p[1] + q[1]) / 3;
  const dx = cx - SHARD_CENTER[0];
  const dy = cy - SHARD_CENTER[1];
  const len = Math.hypot(dx, dy) || 1;
  return {
    clip: `polygon(${SHARD_CENTER[0]}% ${SHARD_CENTER[1]}%, ${p[0]}% ${p[1]}%, ${q[0]}% ${q[1]}%)`,
    dx: `${Math.round((dx / len) * 150)}px`,
    dy: `${Math.round((dy / len) * 110 - 170)}px`, // biased upward, toward the monsters
    rot: `${Math.round((i % 2 ? 1 : -1) * (40 + ((i * 37) % 70)))}deg`,
    delay: `${(i % 4) * 18}ms`,
  };
});
const EMBERS = Array.from({ length: 18 }, (_, i) => {
  const a = (i / 18) * Math.PI * 2;
  const r = 90 + ((i * 53) % 80);
  return { ex: `${Math.round(Math.cos(a) * r)}px`, ey: `${Math.round(Math.sin(a) * r * 0.8 - 120)}px`, delay: `${100 + (i % 5) * 25}ms` };
});
const CHARGE_EMBERS = Array.from({ length: 8 }, (_, i) => ({ x: `${8 + i * 12}%`, delay: `${(i * 137) % 600}ms`, dur: `${700 + ((i * 89) % 400)}ms` }));

/** The cast card bursting: white-hot flash, shatter into shards, rune ring and ember spray. */
export const CastBurst: React.FC<{ card: CombatCard; onDone?: () => void }> = ({ card, onDone }) => (
  <div className="kk-cast" aria-hidden>
    <div className="kk-cast__ring" />
    {SHARDS.map((sh, i) => (
      <div
        key={i}
        className="kk-cast__shard"
        style={{ clipPath: sh.clip, '--dx': sh.dx, '--dy': sh.dy, '--rot': sh.rot, animationDelay: sh.delay } as React.CSSProperties}
      >
        <CardFront card={card} />
      </div>
    ))}
    <div className="kk-cast__flash" />
    {EMBERS.map((e, i) => (
      <i key={i} className="kk-cast__ember" style={{ '--ex': e.ex, '--ey': e.ey, animationDelay: e.delay } as React.CSSProperties} />
    ))}
    <div className="kk-cast__name" onAnimationEnd={onDone}>{card.name}!</div>
  </div>
);

export const CombatCardView: React.FC<CombatCardViewProps> = ({ card, index, handSize, focused, flipped, onSelect, castGhost, dealDelayMs, onCastDone }) => {
  const rarity = RARITY[card.rarity];

  // Animate only the pip that was just earned
  const prevReps = useRef(card.currentReps);
  const newPip = card.currentReps > prevReps.current ? card.currentReps - 1 : -1;
  useEffect(() => {
    prevReps.current = card.currentReps;
  }, [card.currentReps]);

  const offset = index - (handSize - 1) / 2;
  const repsLeft = card.requiredReps - card.currentReps;
  const primed = repsLeft === 1;
  // The highlighted card gets more and more excited the closer it is to being cast
  const charge = !focused || card.currentReps === 0 ? '' : repsLeft <= 1 ? 'charged' : repsLeft === 2 ? 'tremble' : 'hum';

  const style = {
    '--accent': card.colorHex,
    '--accent-rgb': rgb(card.colorHex),
    '--rim': rarity.rim,
    '--rim-dark': rarity.rimDark,
    '--gem': rarity.gem,
    '--foil-rgb': rarity.foil ?? '255, 255, 255',
    '--fan-rot': `${offset * 2.5}deg`,
    '--fan-y': `${Math.abs(offset) * 4 + 2}px`,
    '--deal-delay': `${dealDelayMs ?? index * 70}ms`,
  } as React.CSSProperties;

  return (
    <div
      className={`kk-card-slot ${focused ? 'kk-card-slot--focused' : ''} ${primed ? 'kk-card-slot--primed' : ''} ${flipped ? 'kk-card-slot--flipped' : ''}`}
      style={style}
      onClick={onSelect}
    >
      {charge === 'charged' && (
        <div className="kk-charge" aria-hidden>
          {CHARGE_EMBERS.map((e, i) => (
            <i key={i} style={{ left: e.x, animationDelay: e.delay, animationDuration: e.dur }} />
          ))}
        </div>
      )}
      <div className={`kk-card-shaker ${charge ? `kk-card-shaker--${charge}` : ''}`}>
        <div className="kk-card-flip">
          <CardFront card={card} newPip={newPip} />
          <TechniqueSide card={card} active={flipped} />
        </div>
      </div>
      {castGhost && (
        <div
          key={castGhost.id}
          className="kk-cast-anchor"
          style={{ '--accent': castGhost.colorHex, '--accent-rgb': rgb(castGhost.colorHex) } as React.CSSProperties}
        >
          <CastBurst card={castGhost} onDone={onCastDone} />
        </div>
      )}
    </div>
  );
};
