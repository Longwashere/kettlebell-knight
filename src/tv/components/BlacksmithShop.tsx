import React from 'react';
import { EquipmentItem } from '../../types/game';
import { Shield, Hammer, Sparkles, Coins, ArrowLeft } from 'lucide-react';

export const SHOP_ITEMS: EquipmentItem[] = [
  // --- MORNING STAR TYPES (Handle + chains + spiked kettlebell) ---
  {
    id: 'iron_morningstar',
    name: 'Iron Morning Star',
    slot: 'weapon',
    weaponType: 'morningstar',
    attachmentId: 'iron_morningstar',
    level: 3,
    powerBonus: 25,
    formMultiplier: 1.15,
    price: 150,
    rarity: 'rare',
    description: '32kg spiked kettlebell swung from heavy forged iron chain links.',
    colorHex: '#94A3B8',
  },
  {
    id: 'excalibur_morningstar',
    name: 'Solar Morning Star',
    slot: 'weapon',
    weaponType: 'morningstar',
    attachmentId: 'excalibur_morningstar',
    level: 6,
    powerBonus: 45,
    formMultiplier: 1.3,
    price: 350,
    rarity: 'epic',
    description: '48kg spiked sun-core bell bound by enchanted golden chain links.',
    colorHex: '#FBBF24',
  },
  {
    id: 'dragon_morningstar',
    name: 'Dragon Morning Star',
    slot: 'weapon',
    weaponType: 'morningstar',
    attachmentId: 'dragon_morningstar',
    level: 8,
    powerBonus: 65,
    formMultiplier: 1.45,
    price: 600,
    rarity: 'legendary',
    description: '64kg molten spiked bell connected by searing dragon inferno chains.',
    colorHex: '#EF4444',
  },
  {
    id: 'void_morningstar',
    name: 'Void Morning Star',
    slot: 'weapon',
    weaponType: 'morningstar',
    attachmentId: 'void_morningstar',
    level: 10,
    powerBonus: 85,
    formMultiplier: 1.6,
    price: 900,
    rarity: 'legendary',
    description: '100kg cosmic spiked sphere tethered by gravitational warp chains.',
    colorHex: '#C084FC',
  },

  // --- BELL TYPES (Pure compact kettlebells gripped by top handle) ---
  {
    id: 'iron_kettlebell',
    name: 'Cast Iron Bell',
    slot: 'weapon',
    weaponType: 'bell',
    attachmentId: 'iron_kettlebell',
    level: 1,
    powerBonus: 0,
    formMultiplier: 1.0,
    price: 0,
    rarity: 'common',
    description: 'Standard 32kg competition cast iron bell. Indestructible grip.',
    colorHex: '#6B7280',
  },
  {
    id: 'excalibur_bell',
    name: 'Excalibur Bell',
    slot: 'weapon',
    weaponType: 'bell',
    attachmentId: 'excalibur_bell',
    level: 5,
    powerBonus: 35,
    formMultiplier: 1.25,
    price: 250,
    rarity: 'epic',
    description: '48kg bell forged in holy fire. Blasts golden shockwaves on lockout.',
    colorHex: '#F4B41A',
  },
  {
    id: 'dragon_kettlebell',
    name: 'Dragon Bell',
    slot: 'weapon',
    weaponType: 'bell',
    attachmentId: 'dragon_kettlebell',
    level: 8,
    powerBonus: 55,
    formMultiplier: 1.4,
    price: 500,
    rarity: 'legendary',
    description: '64kg molten dragon core. Emits searing flames with each explosive drive.',
    colorHex: '#DC2626',
  },
  {
    id: 'void_bell',
    name: 'Void Bell',
    slot: 'weapon',
    weaponType: 'bell',
    attachmentId: 'void_bell',
    level: 10,
    powerBonus: 70,
    formMultiplier: 1.5,
    price: 750,
    rarity: 'legendary',
    description: '100kg fallen star bell. Gravity snap amplifies rep momentum.',
    colorHex: '#A855F7',
  },

  // --- MACE TYPES (Rigid haft with welded kettlebell head) ---
  {
    id: 'iron_mace',
    name: 'Iron Kettle Mace',
    slot: 'weapon',
    weaponType: 'mace',
    attachmentId: 'iron_mace',
    level: 4,
    powerBonus: 30,
    formMultiplier: 1.2,
    price: 200,
    rarity: 'rare',
    description: 'Rigid oak haft with steel collar welded to a 32kg flanged kettlebell head.',
    colorHex: '#78716C',
  },

  // --- SWORD TYPES (Classic blades) ---
  {
    id: 'knight_sword',
    name: "Knight's Greatsword",
    slot: 'weapon',
    weaponType: 'sword',
    attachmentId: 'sword',
    level: 1,
    powerBonus: 10,
    formMultiplier: 1.05,
    price: 50,
    rarity: 'common',
    description: 'The tempered steel broadsword carried by Sir Kettleburne.',
    colorHex: '#94A3B8',
  },

  // --- DEFENSIVE GEAR ---
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
                      {item.slot} • LVL {item.level}
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
