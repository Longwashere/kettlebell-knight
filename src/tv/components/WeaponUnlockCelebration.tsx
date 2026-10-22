import React, { useEffect } from 'react';
import type { EquipmentItem } from '../../types/game';
import { trophyMonsterNames } from '../../shared/shopItems';
import { weaponStats } from '../../shared/progression';
import { ELEMENT_INFO } from '../../shared/elements';
import { WEAPON_SPELLS } from '../../types/weaponSpells';
import { WeaponCardFront } from './MasteryCelebration';
import { cardStyleVars } from './CombatCardView';
import { audioManager } from '../../shared/AudioManager';
import { networkManager } from '../../shared/NetworkManager';
import { useTVRemote } from '../hooks/useTVRemote';
import { Hammer, Swords } from 'lucide-react';

interface WeaponUnlockCelebrationProps {
  weapons: EquipmentItem[];
  /** The knight's level, for the weapon's Attack as this knight would wield it. */
  knightLevel: number;
  onDismiss: () => void;
}

/**
 * Last post-fight reward step: each monster's weapon this fight's kills put up for sale at the blacksmith
 * (EquipmentItem.trophyOf), one per page, glowing in the weapon's colour so it doesn't read as a level-up.
 */
export const WeaponUnlockCelebration: React.FC<WeaponUnlockCelebrationProps> = ({ weapons, knightLevel, onDismiss }) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const weapon = weapons[currentIndex];
  const isLast = currentIndex >= weapons.length - 1;

  useEffect(() => {
    if (weapon) audioManager.play('victory', { delay: 0.05 });
  }, [currentIndex, weapon]);

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

  useTVRemote({ onSelect: handleNext, onBack: handleNext }, { enabled: Boolean(weapon) });

  if (!weapon) return null;

  const stats = weaponStats(weapon.id, 1, undefined, knightLevel);
  const spells = WEAPON_SPELLS[weapon.id] ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn pointer-events-auto">
      <div
        key={weapon.id}
        className="kk-new-weapon bg-[#1A1926]/95 border-4 rounded px-8 pt-10 pb-6 max-w-3xl w-full"
        style={{ borderColor: weapon.colorHex, '--kk-accent': weapon.colorHex } as React.CSSProperties}
      >
        <div className="kk-new-weapon__sweep" />
        <div className="kk-new-weapon__crest font-pixel text-xs text-[#0F0E17] px-4 py-1.5 rounded-full border-2 border-black whitespace-nowrap">
          ✦ NEW WEAPON AT THE FORGE! ✦
        </div>

        <div className="flex items-center gap-8">
          <div
            className="relative w-[228px] h-[342px] shrink-0"
            style={cardStyleVars({ colorHex: weapon.colorHex, rarity: weapon.rarity })}
          >
            <WeaponCardFront weapon={weapon} level={1} knightLevel={knightLevel} />
          </div>

          <div className="flex-1 min-w-0 flex flex-col text-left">
            {weapons.length > 1 && (
              <div className="text-[10px] font-pixel mb-2" style={{ color: weapon.colorHex }}>
                WEAPON {currentIndex + 1} OF {weapons.length}
              </div>
            )}
            <span
              className="self-start text-[10px] font-pixel px-2 py-0.5 border uppercase tracking-widest mb-2"
              style={{ color: weapon.colorHex, borderColor: weapon.colorHex }}
            >
              MONSTER TROPHY
            </span>
            <h2 className="font-pixel text-lg text-white tracking-wide mb-4">{weapon.name}</h2>

            <div className="bg-[#0F0E17] border-2 border-[#2E2B44] p-3 rounded mb-5">
              <div className="text-[10px] font-pixel mb-1.5 flex items-center gap-1" style={{ color: weapon.colorHex }}>
                <Swords className="w-3.5 h-3.5" />
                <span>THOU SLEW A {trophyMonsterNames(weapon).toUpperCase()}</span>
              </div>
              <p className="text-[11px] font-mono text-[#E5E7EB] leading-relaxed mb-2">
                The blacksmith can now forge its weapon, whatever thy level.
              </p>
              <div className="font-pixel text-[9px] flex flex-wrap gap-x-3 gap-y-1 border-t border-[#2E2B44]/80 pt-1.5">
                <span className="text-[#FF3366]">+{stats.atk} ATK</span>
                {stats.element && (
                  <span style={{ color: ELEMENT_INFO[stats.element].color }}>
                    {ELEMENT_INFO[stats.element].icon} +{stats.elemDmg} {ELEMENT_INFO[stats.element].label}
                  </span>
                )}
                <span className="text-[#38B6FF]">TIER {weapon.level}</span>
                {spells.length > 0 && <span className="text-[#FDE68A]">{spells.map((s) => `${s.icon ?? '✦'} ${s.name}`).join(' • ')}</span>}
              </div>
              <div className="text-[10px] font-pixel text-[#F4B41A] mt-2 flex items-center gap-1">
                <Hammer className="w-3.5 h-3.5" />
                <span>FORGE IT FOR {weapon.price} GP</span>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full hover:brightness-110 text-[#0F0E17] font-pixel text-xs py-3 border-2 border-black shadow-pixel-box flex items-center justify-center"
              style={{ background: weapon.colorHex }}
            >
              <span>{isLast ? 'CONTINUE ▶' : 'NEXT WEAPON ▶'}</span>
            </button>
            <div className="mt-2.5 flex items-center justify-center text-[8.5px] font-pixel tracking-wider animate-pulse" style={{ color: weapon.colorHex }}>
              <span>◆ [ENTER] or SQUAT TO CONTINUE ◆</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
