import React from 'react';
import { EquipmentItem } from '../../types/game';
import { Shield, Hammer, Sparkles, Coins, ArrowLeft } from 'lucide-react';

export const SHOP_ITEMS: EquipmentItem[] = [
  {
    id: 'excalibur_bell',
    name: 'Excalibur Bell',
    slot: 'weapon',
    attachmentId: 'excalibur_bell',
    level: 5,
    powerBonus: 35,
    formMultiplier: 1.25,
    price: 250,
    rarity: 'epic',
    description: 'Forged in holy fire. Blasts golden critical waves on 90+ power lockout.',
    colorHex: '#F4B41A',
  },
  {
    id: 'dragon_kettlebell',
    name: 'Dragon Bell',
    slot: 'weapon',
    attachmentId: 'dragon_kettlebell',
    level: 8,
    powerBonus: 55,
    formMultiplier: 1.4,
    price: 500,
    rarity: 'legendary',
    description: 'Molten dragon core. Emits searing flames with each explosive drive.',
    colorHex: '#DC2626',
  },
  {
    id: 'void_bell',
    name: 'Void Bell',
    slot: 'weapon',
    attachmentId: 'void_bell',
    level: 10,
    powerBonus: 70,
    formMultiplier: 1.5,
    price: 750,
    rarity: 'legendary',
    description: 'Forged from fallen stars. Gravity snap amplifies rep momentum.',
    colorHex: '#A855F7',
  },
  {
    id: 'aegis_shield',
    name: 'Aegis Shield',
    slot: 'shield',
    attachmentId: 'aegis_shield',
    level: 4,
    powerBonus: 15,
    formMultiplier: 1.15,
    price: 300,
    rarity: 'rare',
    description: 'Gleaming divine bulwark. Guards against fatigue during high rep sets.',
    colorHex: '#38B6FF',
  },
  {
    id: 'golden_crown',
    name: 'Golden Crown',
    slot: 'helmet',
    attachmentId: 'golden_crown',
    level: 6,
    powerBonus: 25,
    formMultiplier: 1.2,
    price: 400,
    rarity: 'epic',
    description: 'Royal headpiece. Bestows knightly fervor and +20% gold from workouts.',
    colorHex: '#F59E0B',
  },
  {
    id: 'paladin_plate',
    name: 'Paladin Plate',
    slot: 'armor',
    attachmentId: 'paladin_plate',
    level: 5,
    powerBonus: 30,
    formMultiplier: 1.2,
    price: 350,
    rarity: 'rare',
    description: 'Masterwork armor. Enhances core stability during the hike phase.',
    colorHex: '#D97706',
  },
  {
    id: 'iron_kettlebell',
    name: 'Cast Iron Bell',
    slot: 'weapon',
    attachmentId: 'iron_kettlebell',
    level: 1,
    powerBonus: 0,
    formMultiplier: 1.0,
    price: 0,
    rarity: 'common',
    description: 'Standard 16kg competition bell. Balanced, indestructible.',
    colorHex: '#6B7280',
  },
];

interface BlacksmithShopProps {
  selectedIndex: number;
  onSelectItem: (item: EquipmentItem) => void;
  onHoverItem: (item: EquipmentItem) => void;
  onBack: () => void;
  playerGold: number;
  equippedIds: Set<string>;
}

export const BlacksmithShop: React.FC<BlacksmithShopProps> = ({
  selectedIndex,
  onSelectItem,
  onHoverItem,
  onBack,
  playerGold,
  equippedIds,
}) => {
  return (
    <div className="bg-[#1A1926]/95 border-4 border-[#F4B41A] p-6 max-w-2xl w-full mx-auto rounded shadow-pixel-box-gold backdrop-blur-md">
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
              Hover/Select item to preview live on Knight Skeleton
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

          return (
            <div
              key={item.id}
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
                  <span className="text-[9px] font-pixel uppercase tracking-widest text-[#38B6FF] block mt-0.5">
                    {item.slot} • LVL {item.level}
                  </span>
                </div>

                {isEquipped ? (
                  <span className="text-[9px] bg-[#00EB88]/20 border border-[#00EB88] text-[#00EB88] font-pixel px-1.5 py-0.5">
                    EQUIPPED
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

              <div className="mt-2 flex items-center gap-3 text-[9px] font-pixel text-[#00EB88]">
                <span>+{item.powerBonus} PWR</span>
                <span>×{item.formMultiplier} FORM</span>
              </div>
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
