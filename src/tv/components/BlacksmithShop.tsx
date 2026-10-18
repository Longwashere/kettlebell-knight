import React from 'react';
import { EquipmentItem } from '../../types/game';
import { SHOP_ITEMS } from '../../shared/shopItems';
import { ELEMENT_INFO } from '../../shared/elements';
import { WEAPON_MAX_LEVEL, castsForWeaponLevel, levelProgress, weaponLevel, weaponLevelReq, weaponStats } from '../../shared/progression';

export { SHOP_ITEMS };
import { Shield, Hammer, Sparkles, Coins, ArrowLeft } from 'lucide-react';


interface BlacksmithShopProps {
  selectedIndex: number;
  onSelectItem: (item: EquipmentItem) => void;
  onHoverItem: (item: EquipmentItem) => void;
  onBack: () => void;
  playerGold: number;
  equippedIds: Set<string>;
  ownedIds: Set<string>;
  knightLevel: number;
  /** Cards cast per weapon: weapon levels. */
  weaponCasts: Record<string, number>;
}

export const BlacksmithShop: React.FC<BlacksmithShopProps> = ({
  selectedIndex,
  onSelectItem,
  onHoverItem,
  onBack,
  playerGold,
  equippedIds,
  ownedIds,
  knightLevel,
  weaponCasts,
}) => {
  return (
    <div className="bg-[#1A1926]/95 border-4 border-[#F4B41A] p-5 w-[min(640px,52vw)] ml-auto rounded shadow-pixel-box-gold backdrop-blur-md">
      {/* Shop Header */}
      <div className="flex items-center justify-between border-b-2 border-[#2E2B44] pb-3 mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-[#F4B41A] text-[#0F0E17] rounded shadow-pixel-box">
            <Hammer className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm font-pixel text-[#F4B41A] flex items-center gap-2">
              BLACKSMITH'S FORGE
            </h2>
            <p className="text-[10px] text-[#A7A9BE] font-mono">
              ◀ Select gear to try it on thy knight
            </p>
          </div>
        </div>

        {/* Gold Counter */}
        <div className="flex items-center space-x-2 bg-[#0F0E17] border-2 border-[#F4B41A] px-3 py-1.5 font-pixel text-xs text-[#F4B41A]">
          <Coins className="w-4 h-4 text-[#F4B41A]" />
          <span>{playerGold} GP</span>
        </div>
      </div>

      {/* Items List (Fire TV D-Pad Spatial Navigation) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1">
        {SHOP_ITEMS.map((item, index) => {
          const isSelected = selectedIndex === index;
          const isEquipped = equippedIds.has(item.id);
          const isOwned = ownedIds.has(item.id);
          const isWeapon = item.slot === 'weapon';
          const levelReq = isWeapon && !item.stoneBound ? weaponLevelReq(item.level) : 1;
          const isLocked = knightLevel < levelReq;
          const inStone = item.stoneBound && !isOwned;
          const wLevel = weaponLevel(weaponCasts[item.id]);
          const w = isWeapon ? weaponStats(item.id, wLevel, undefined, knightLevel) : null;

          return (
            <div
              key={item.id}
              ref={(el) => {
                if (isSelected) {
                  el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
              }}
              onClick={() => onSelectItem(item)}
              onMouseEnter={() => onHoverItem(item)}
              className={`p-3 border-2 transition-all cursor-pointer ${
                isSelected
                  ? 'tv-focused bg-[#242138] border-[#F4B41A]'
                  : 'bg-[#0F0E17]/80 border-[#2E2B44] hover:border-[#38B6FF]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-3 h-3 rounded-sm border border-black"
                      style={{ backgroundColor: item.colorHex }}
                    />
                    <span className="font-pixel text-[11px] text-white">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9px] font-pixel uppercase tracking-widest text-[#38B6FF]">
                      {item.slot} • {item.slot === 'weapon' ? 'TIER' : 'LVL'} {w?.tier ?? item.level}
                    </span>
                    {item.weaponType && (
                      <span className={`text-[8px] font-pixel px-1 py-0.5 rounded border leading-none ${
                        item.weaponType === 'morningstar' ? 'bg-[#EC4899]/20 border-[#EC4899] text-[#EC4899]' :
                        item.weaponType === 'mace' ? 'bg-[#F97316]/20 border-[#F97316] text-[#F97316]' :
                        item.weaponType === 'bell' ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]' :
                        'bg-[#38B6FF]/20 border-[#38B6FF] text-[#38B6FF]'
                      }`}>
                        {item.weaponType.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {inStone ? (
                  <span className="text-[9px] bg-[#F4B41A]/20 border border-[#F4B41A] text-[#F4B41A] font-pixel px-1.5 py-0.5">
                    ⚔ SEALED IN STONE
                  </span>
                ) : isEquipped ? (
                  <span className="text-[9px] bg-[#00EB88]/20 border border-[#00EB88] text-[#00EB88] font-pixel px-1.5 py-0.5">
                    EQUIPPED
                  </span>
                ) : isLocked ? (
                  <span className="text-[9px] bg-[#FF3366]/20 border border-[#FF3366] text-[#FF3366] font-pixel px-1.5 py-0.5">
                    🔒 KNIGHT LV {levelReq}
                  </span>
                ) : isOwned ? (
                  <span className="text-[9px] bg-[#38B6FF]/20 border border-[#38B6FF] text-[#38B6FF] font-pixel px-1.5 py-0.5">
                    OWNED
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-[#F4B41A] font-bold">
                    {item.price > 0 ? `${item.price} GP` : 'FREE'}
                  </span>
                )}
              </div>

              <p className="text-[10px] font-mono text-[#A7A9BE] mt-2 line-clamp-2">
                {item.description}
              </p>

              {w ? (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-3 text-[9px] font-pixel">
                    <span className="text-[#FF3366]">+{w.atk} ATK</span>
                    {w.element ? (
                      <span style={{ color: ELEMENT_INFO[w.element].color }}>
                        {ELEMENT_INFO[w.element].icon} +{w.elemDmg} {ELEMENT_INFO[w.element].label}
                      </span>
                    ) : (
                      <span className="text-[#A7A9BE]">PLAIN STEEL</span>
                    )}
                    <span className="text-[#F4B41A]">WPN LV {wLevel}</span>
                  </div>
                  {(isOwned || isEquipped) && wLevel < WEAPON_MAX_LEVEL && (
                    <div
                      className="w-full h-1 bg-[#0F0E17] border border-[#2E2B44] overflow-hidden"
                      title={`${weaponCasts[item.id] ?? 0} / ${castsForWeaponLevel(wLevel + 1)} casts to weapon level ${wLevel + 1}`}
                    >
                      <div className="h-full bg-[#F4B41A]" style={{ width: `${levelProgress(weaponCasts[item.id] ?? 0, castsForWeaponLevel, WEAPON_MAX_LEVEL) * 100}%` }} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-3 text-[9px] font-pixel text-[#00EB88]">
                  <span>+{item.powerBonus} PWR</span>
                  <span>×{item.formMultiplier} FORM</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer D-Pad Navigation Hint */}
      <div className="mt-4 pt-3 border-t-2 border-[#2E2B44] flex items-center justify-between text-[10px] font-mono text-[#A7A9BE]">
        <button
          onClick={onBack}
          className="flex items-center space-x-1.5 hover:text-white text-[#F4B41A] font-pixel text-[9px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>[BACK / ESC] RETURN TO TOWN</span>
        </button>

        <span className="font-pixel text-[9px] text-[#38B6FF]">
          [ENTER] EQUIP / PREVIEW ITEM
        </span>
      </div>
    </div>
  );
};
