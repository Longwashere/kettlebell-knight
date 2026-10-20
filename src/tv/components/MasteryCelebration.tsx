import React, { useEffect, useMemo } from 'react';
import type { MasteryLevelUp } from '../../shared/ProfileManager';
import { CARD_CATALOG, CardTemplate } from '../../types/battle';
import { ALL_WEAPON_SPELLS, WEAPON_SPELLS } from '../../types/weaponSpells';
import { SHOP_ITEMS } from '../../shared/shopItems';
import { ELEMENT_INFO } from '../../shared/elements';
import type { EquipmentItem } from '../../types/game';
import {
  CARD_LEVEL_BONUS, CARD_MAX_LEVEL, WEAPON_LEVEL_BONUS, WEAPON_MAX_LEVEL, bindCard, castsForCardLevel,
  castsForWeaponLevel, weaponStats, type Loadout,
} from '../../shared/progression';
import { CardFront, cardStyleVars } from './CombatCardView';
import { audioManager } from '../../shared/AudioManager';
import { networkManager } from '../../shared/NetworkManager';
import { useTVRemote } from '../hooks/useTVRemote';
import { Sparkles, TrendingUp } from 'lucide-react';
import { ASSET_ROOT } from '@/shared/assetRoot';

interface MasteryCelebrationProps {
  levelUps: MasteryLevelUp[];
  /** The knight's loadout, to show each spell with its real numbers before and after. */
  loadout: Loadout;
  onDismiss: () => void;
}

interface MasteryPage {
  kind: 'card' | 'weapon';
  id: string;
  from: number;
  to: number;
}

/** The card as this knight casts it at spell `level`. */
const boundAt = (template: CardTemplate, loadout: Loadout, level: number) =>
  bindCard(template, { ...loadout, cardCasts: { ...loadout.cardCasts, [template.templateId]: castsForCardLevel(level) } });

/** One page per spell or weapon: several level-ups of the same one in a fight collapse into from → to. */
function toPages(levelUps: MasteryLevelUp[]): MasteryPage[] {
  const pages = new Map<string, MasteryPage>();
  for (const u of levelUps) {
    const key = `${u.kind}:${u.id}`;
    const page = pages.get(key);
    if (page) {
      page.from = Math.min(page.from, u.level - 1);
      page.to = Math.max(page.to, u.level);
    } else {
      pages.set(key, { kind: u.kind, id: u.id, from: u.level - 1, to: u.level });
    }
  }
  // Weapons last: the spells first, then the weapon that cast them
  return [...pages.values()].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'card' ? -1 : 1));
}

const pct = (n: number) => `+${Math.round(n * 100)}%`;

/**
 * Weapon card face matching the 90s dark fantasy TCG card aesthetic of CardFront,
 * featuring the weapon's pixel art sprite, rarity frame, tier badge, attack stat, and signature spells.
 */
export const WeaponCardFront: React.FC<{
  weapon: EquipmentItem;
  level: number;
  knightLevel?: number;
}> = ({ weapon, level, knightLevel = 1 }) => {
  const stats = useMemo(() => weaponStats(weapon.id, level, undefined, knightLevel), [weapon.id, level, knightLevel]);
  const spells = useMemo(() => WEAPON_SPELLS[weapon.id] ?? [], [weapon.id]);
  const hasFoil = weapon.rarity === 'epic' || weapon.rarity === 'legendary';
  const nameSize = weapon.name.length > 17 ? 10 : weapon.name.length > 13 ? 11 : 12;

  return (
    <div className="kk-card kk-card--front">
      <div className="kk-card__head">
        <div className="kk-card__cost" title={`Weapon Level ${level}`}>
          <span>{level}</span>
        </div>
        <div className="kk-card__name" style={{ fontSize: nameSize }}>{weapon.name}</div>
      </div>

      <div className="kk-card__art">
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-[#0A0910]">
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              background: `radial-gradient(circle at center, ${weapon.colorHex} 0%, transparent 70%)`,
            }}
          />
          <img
            src={`${ASSET_ROOT}/codex/weapons/art_${weapon.id}.png`}
            alt={weapon.name}
            className="relative z-10 max-h-[68px] w-auto max-w-[85%] scale-125 object-contain filter drop-shadow-[0_0_10px_rgba(0,0,0,0.95)] drop-shadow-[0_0_14px_rgba(255,255,255,0.2)] pixelated"
            style={{ imageRendering: 'pixelated', width: 'auto', height: 'auto', objectFit: 'contain' }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = `${ASSET_ROOT}/codex/weapons/kettlebell_iron.png`;
            }}
          />
        </div>
        {hasFoil && <div className="kk-card__foil" />}
        <div className="kk-card__spell">TIER {weapon.level}</div>
        {weapon.element && (
          <div className="kk-card__element" style={{ color: ELEMENT_INFO[weapon.element].color }}>
            {ELEMENT_INFO[weapon.element].icon} {ELEMENT_INFO[weapon.element].label}
          </div>
        )}
        <div className="kk-card__power" title="Attack stat at current level">
          ATK <b>{stats.atk}</b>
        </div>
      </div>

      <div className="kk-card__type">
        <span>
          <span className="kk-card__glyph">⚔</span> {weapon.weaponType ? weapon.weaponType.toUpperCase() : 'WEAPON'}
        </span>
        <span className="kk-card__rarity" title={weapon.rarity.toUpperCase()}>
          {weapon.rarity.toUpperCase()} <i className="kk-card__gem" />
        </span>
      </div>

      <div className="kk-card__text">
        {weapon.description}
      </div>

      <div className="kk-card__foot">
        <div className="flex flex-col justify-center w-full h-full px-2 py-1 text-left bg-[#0A0910]/70 border border-[#2E2B3A] rounded">
          <div className="text-[7.5px] font-pixel text-[#F3E9CF]/70 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>✦ SIGNATURE SPELLS</span>
            <span className="text-[#38B6FF]">{pct(WEAPON_LEVEL_BONUS)} ATK/LV</span>
          </div>
          {spells.length > 0 ? (
            <div className="flex flex-col gap-1">
              {spells.slice(0, 2).map((s) => (
                <div key={s.templateId} className="flex items-center gap-1.5 bg-[#000]/60 border border-[#2E2B3A] px-1.5 py-1 rounded">
                  <span className="text-[10px] leading-none shrink-0">{s.icon ?? '✦'}</span>
                  <span className="font-pixel text-[8px] text-[#FDE68A] truncate">{s.name}</span>
                  <span className="ml-auto text-[7px] font-pixel text-[#A7A9BE] shrink-0">{s.requiredReps} {s.exercise}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-center py-1">
              <span className="font-pixel text-[8px] text-[#FDE68A]">✦ FORGED RELIC ✦</span>
              <span className="font-pixel text-[7px] text-[#A7A9BE] mt-0.5">CITADEL ARMORY ARMAMENT</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/** Post-fight reward step after the card unlocks: each spell and weapon that levelled up this fight. */
export const MasteryCelebration: React.FC<MasteryCelebrationProps> = ({ levelUps, loadout, onDismiss }) => {
  const pages = useMemo(() => toPages(levelUps), [levelUps]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const page = pages[currentIndex];
  const isLast = currentIndex >= pages.length - 1;

  const template: CardTemplate | undefined = page?.kind === 'card'
    ? [...CARD_CATALOG, ...ALL_WEAPON_SPELLS].find((c) => c.templateId === page.id)
    : undefined;
  const card = template && boundAt(template, loadout, page.to);
  const weapon = page?.kind === 'weapon' ? SHOP_ITEMS.find((i) => i.id === page.id) : undefined;

  useEffect(() => {
    if (page) audioManager.play('level_up', { delay: 0.05 });
  }, [currentIndex, page]);

  const handleNext = () => {
    if (!isLast) {
      setCurrentIndex((prev) => prev + 1);
      audioManager.play('ui_select');
    } else {
      onDismiss();
    }
  };

  const handleNextRef = React.useRef(handleNext);
  handleNextRef.current = handleNext;
  const lastSquatAtRef = React.useRef<number>(0);

  useEffect(() => {
    const unsub = networkManager.onTelemetry((telemetry) => {
      if (telemetry.event === 'REP_TRIGGER' && telemetry.exercise === 'SQUAT') {
        if (Date.now() - lastSquatAtRef.current < 750) return;
        lastSquatAtRef.current = Date.now();
        handleNextRef.current();
      }
    });
    return unsub;
  }, []);

  useTVRemote({ onSelect: handleNext, onBack: handleNext }, { enabled: Boolean(page) });

  // A level-up for something no longer in the catalog can't be shown: skip past it
  useEffect(() => {
    if (page && !card && !weapon) handleNext();
  });

  if (!page || (!card && !weapon)) return null;

  const isWeapon = page.kind === 'weapon';
  const maxLevel = isWeapon ? WEAPON_MAX_LEVEL : CARD_MAX_LEVEL;
  const atMax = page.to >= maxLevel;
  const castsToNext = isWeapon ? castsForWeaponLevel(page.to + 1) : castsForCardLevel(page.to + 1);
  const name = card?.name ?? weapon?.name ?? page.id;
  const stats: { label: string; from: string; to: string }[] = [];
  if (weapon) {
    const before = weaponStats(weapon.id, page.from, undefined, loadout.level);
    const after = weaponStats(weapon.id, page.to, undefined, loadout.level);
    stats.push({ label: 'ATTACK', from: `${before.atk}`, to: `${after.atk}` });
    if (after.elemDmg > 0 && after.element) {
      stats.push({ label: `${ELEMENT_INFO[after.element].label} DMG`, from: `${before.elemDmg}`, to: `${after.elemDmg}` });
    }
  } else if (template && card) {
    const before = boundAt(template, loadout, page.from);
    for (const [label, key] of [['DAMAGE', 'damage'], ['BLOCK', 'block'], ['HEAL', 'heal']] as const) {
      if (card[key]) stats.push({ label, from: `${before[key]}`, to: `${card[key]}` });
    }
    stats.push({
      label: 'SPELL BONUS',
      from: pct(CARD_LEVEL_BONUS * (page.from - 1)),
      to: pct(CARD_LEVEL_BONUS * (page.to - 1)),
    });
  }
  const bonusText = isWeapon
    ? `Each weapon level adds ${pct(WEAPON_LEVEL_BONUS)} Attack${weapon?.element ? ' and elemental damage' : ''}.`
    : `Each spell level adds ${pct(CARD_LEVEL_BONUS)} to its damage, Block and healing.`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn pointer-events-auto">
      <div className="bg-[#1A1926]/95 border-4 border-[#00EB88] rounded px-8 pt-10 pb-6 max-w-3xl w-full shadow-pixel-box relative">
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#00EB88] text-[#0F0E17] font-pixel text-xs px-4 py-1.5 rounded-full border-2 border-black flex items-center gap-1.5 shadow-pixel-box">
          <Sparkles className="w-4 h-4 animate-spin" />
          <span>✦ {isWeapon ? 'WEAPON' : 'SPELL'} LEVEL UP! ✦</span>
        </div>

        <div className="flex items-center gap-8">
          {card ? (
            <div key={page.id} className="relative w-[228px] h-[330px] shrink-0 animate-fadeIn" style={cardStyleVars(card)}>
              <CardFront card={card} />
            </div>
          ) : weapon ? (
            <div
              key={page.id}
              className="relative w-[228px] h-[330px] shrink-0 animate-fadeIn"
              style={cardStyleVars({ colorHex: weapon.colorHex, rarity: weapon.rarity ?? 'common' })}
            >
              <WeaponCardFront weapon={weapon} level={page.to} knightLevel={loadout.level} />
            </div>
          ) : null}

          <div className="flex-1 min-w-0 flex flex-col text-left">
            {pages.length > 1 && (
              <div className="text-[10px] font-pixel text-[#00EB88] mb-2">
                LEVEL UP {currentIndex + 1} OF {pages.length}
              </div>
            )}
            <span className="self-start text-[10px] font-pixel px-2 py-0.5 border border-[#38B6FF] text-[#38B6FF] bg-[#38B6FF]/10 uppercase tracking-widest mb-2">
              {isWeapon ? 'WEAPON MASTERY' : 'SPELL MASTERY'}
            </span>
            <h2 className="font-pixel text-lg text-white tracking-wide mb-1">{name}</h2>
            <div className="font-pixel text-sm text-[#F4B41A] mb-4">
              LV {page.from} ▶ LV {page.to}{atMax ? ' (MAX)' : ''}
            </div>

            <div className="bg-[#0F0E17] border-2 border-[#2E2B44] p-3 rounded mb-5">
              <div className="text-[10px] font-pixel text-[#00EB88] mb-2 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>STRONGER:</span>
              </div>
              {stats.map((s) => (
                <div key={s.label} className="flex items-center justify-between text-[11px] font-mono text-[#E5E7EB] mb-1">
                  <span className="text-[#A7A9BE]">{s.label}</span>
                  <span>
                    {s.from} <span className="text-[#A7A9BE]">▶</span> <span className="text-[#00EB88] font-bold">{s.to}</span>
                  </span>
                </div>
              ))}
              <div className="text-[10px] font-mono text-[#A7A9BE] border-t border-[#2E2B44]/80 pt-1.5 mt-2">
                {bonusText}
                {!atMax && ` Next level at ${castsToNext} casts${isWeapon ? ' with it equipped' : ''}.`}
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full bg-[#00EB88] hover:bg-[#5dffb8] text-[#0F0E17] font-pixel text-xs py-3 border-2 border-black shadow-pixel-box flex items-center justify-center"
            >
              <span>{isLast ? 'CONTINUE ▶' : 'NEXT ▶'}</span>
            </button>
            <div className="mt-2.5 flex items-center justify-center text-[8.5px] font-pixel text-[#00EB88] tracking-wider animate-pulse">
              <span>◆ [ENTER] or SQUAT TO CONTINUE ◆</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
