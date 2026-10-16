import React, { useState, useMemo, useEffect } from 'react';
import { CARD_CATALOG, STARTER_CARD_IDS, CardTemplate } from '../../types/battle';
import {
  CARD_UNLOCK_REGISTRY,
  getCardUnlockProgress,
  getWeaponSpellsInfo,
  CardUnlockDef,
  WeaponSpellUnlockInfo,
} from '../../shared/cardUnlocks';
import { profileManager, PlayerProfile } from '../../shared/ProfileManager';
import { SHOP_ITEMS } from './BlacksmithShop';
import { CardFront } from './CombatCardView';
import { audioManager } from '../../shared/AudioManager';
import { useTVRemote } from '../hooks/useTVRemote';
import {
  BookOpen,
  Lock,
  Unlock,
  Sparkles,
  Swords,
  Shield,
  Activity,
  ArrowLeft,
  Flame,
  Search,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

export type CodexTab = 'ALL' | 'MONSTER_ARTS' | 'DISCIPLINES' | 'WEAPON_SPELLS' | 'KINEMATICS';

interface CardCodexScreenProps {
  onBackToHub: () => void;
  sessionReps?: number;
  highestPower?: number;
}

export const CardCodexScreen: React.FC<CardCodexScreenProps> = ({
  onBackToHub,
  sessionReps = 0,
  highestPower = 0,
}) => {
  const [profile, setProfile] = useState<PlayerProfile | null>(() => profileManager.getActiveProfile());
  const [activeTab, setActiveTab] = useState<CodexTab>('ALL');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [filterMode, setFilterMode] = useState<'ALL' | 'UNLOCKED' | 'LOCKED'>('ALL');

  useEffect(() => {
    return profileManager.subscribe((active) => setProfile(active));
  }, []);

  const unlockedSet = useMemo(() => {
    return new Set(profile?.unlockedCards || STARTER_CARD_IDS);
  }, [profile?.unlockedCards]);

  // Catalog items with unlock definitions
  const catalogWithMeta = useMemo(() => {
    return CARD_CATALOG.map((card) => {
      const isStarter = STARTER_CARD_IDS.includes(card.templateId);
      const isUnlocked = isStarter || unlockedSet.has(card.templateId);
      const unlockDef: CardUnlockDef | undefined = CARD_UNLOCK_REGISTRY[card.templateId];
      const progress = unlockDef && profile ? getCardUnlockProgress(unlockDef, profile) : null;

      let category: 'STARTER' | 'MONSTER_ART' | 'MARTIAL_DISCIPLINE' | 'WEAPON_SPELL' = 'STARTER';
      if (unlockDef) {
        category = unlockDef.category;
      }

      return {
        card,
        isStarter,
        isUnlocked,
        unlockDef,
        progress,
        category,
      };
    });
  }, [unlockedSet, profile]);

  // Weapon spells with meta
  const weaponSpellsWithMeta = useMemo(() => {
    if (!profile) return [];
    return getWeaponSpellsInfo(profile);
  }, [profile]);

  // Filtered list based on active tab & filter mode
  const displayedCards = useMemo(() => {
    let list = catalogWithMeta;

    if (activeTab === 'MONSTER_ARTS') {
      list = list.filter((item) => item.category === 'MONSTER_ART');
    } else if (activeTab === 'DISCIPLINES') {
      list = list.filter((item) => item.category === 'MARTIAL_DISCIPLINE');
    }

    if (filterMode === 'UNLOCKED') {
      list = list.filter((item) => item.isUnlocked);
    } else if (filterMode === 'LOCKED') {
      list = list.filter((item) => !item.isUnlocked);
    }

    return list;
  }, [catalogWithMeta, activeTab, filterMode]);

  // Clamp selection index when displayed list changes
  useEffect(() => {
    if (selectedIndex >= displayedCards.length) {
      setSelectedIndex(Math.max(0, displayedCards.length - 1));
    }
  }, [displayedCards.length, selectedIndex]);

  const totalUnlockedCount = useMemo(() => {
    return catalogWithMeta.filter((c) => c.isUnlocked).length;
  }, [catalogWithMeta]);

  const activeCardItem = displayedCards[selectedIndex];

  // D-Pad Navigation
  useTVRemote({
    onUp: () => {
      if (activeTab === 'KINEMATICS') return;
      if (activeTab === 'WEAPON_SPELLS') {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
        return;
      }
      // 3-column grid step up
      setSelectedIndex((prev) => Math.max(0, prev - 3));
    },
    onDown: () => {
      if (activeTab === 'KINEMATICS') return;
      if (activeTab === 'WEAPON_SPELLS') {
        setSelectedIndex((prev) => Math.min(weaponSpellsWithMeta.length - 1, prev + 1));
        return;
      }
      // 3-column grid step down
      setSelectedIndex((prev) => Math.min(displayedCards.length - 1, prev + 3));
    },
    onLeft: () => {
      if (selectedIndex > 0) {
        setSelectedIndex((prev) => prev - 1);
      } else {
        // Cycle tab left
        cycleTab(-1);
      }
    },
    onRight: () => {
      const max = activeTab === 'WEAPON_SPELLS' ? weaponSpellsWithMeta.length - 1 : displayedCards.length - 1;
      if (selectedIndex < max) {
        setSelectedIndex((prev) => prev + 1);
      } else {
        // Cycle tab right
        cycleTab(1);
      }
    },
    onSelect: () => {
      audioManager.play('ui_select');
    },
    onBack: () => {
      onBackToHub();
    },
  });

  const cycleTab = (dir: number) => {
    const tabs: CodexTab[] = ['ALL', 'MONSTER_ARTS', 'DISCIPLINES', 'WEAPON_SPELLS', 'KINEMATICS'];
    const curIdx = tabs.indexOf(activeTab);
    const nextIdx = (curIdx + dir + tabs.length) % tabs.length;
    setActiveTab(tabs[nextIdx]);
    setSelectedIndex(0);
    audioManager.play('ui_select');
  };

  return (
    <div className="bg-[#1A1926]/95 border-4 border-[#00EB88] p-5 max-w-5xl w-full rounded shadow-pixel-box-gold backdrop-blur-md text-left flex flex-col h-[90vh]">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b-2 border-[#2E2B44] pb-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[#00EB88] text-[#0F0E17] flex items-center justify-center font-bold text-xl font-pixel shadow-pixel-box">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-sm font-pixel text-[#00EB88] tracking-wider flex items-center gap-2">
              <span>GRIMOIRE OF THE BELL</span>
              <span className="text-[10px] text-[#A7A9BE] font-mono">• CODEX OF CARDS & LORE</span>
            </h1>
            <p className="text-[10px] text-[#A7A9BE] font-mono">
              Master physical kettlebell techniques and extract secret arts from vanquished monsters.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-[#0F0E17] border border-[#2E2B44] px-3 py-1 rounded text-right">
            <span className="text-[9px] font-mono text-[#A7A9BE] block">CATALOG PROGRESS</span>
            <span className="font-pixel text-xs text-[#F4B41A]">
              ⚔️ {totalUnlockedCount} / {CARD_CATALOG.length} CARDS
            </span>
          </div>

          <button
            onClick={onBackToHub}
            className="bg-[#2E2B44] hover:bg-[#3E3A5A] text-white font-pixel text-[10px] py-2 px-3 border border-black shadow-pixel-box flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>[BACK] HUB</span>
          </button>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center justify-between mb-3 border-b border-[#2E2B44] pb-2">
        <div className="flex gap-2">
          {[
            { id: 'ALL' as CodexTab, label: 'ALL CARDS' },
            { id: 'MONSTER_ARTS' as CodexTab, label: 'MONSTER ARTS' },
            { id: 'DISCIPLINES' as CodexTab, label: 'DISCIPLINES' },
            { id: 'WEAPON_SPELLS' as CodexTab, label: 'WEAPON SPELLS' },
            { id: 'KINEMATICS' as CodexTab, label: 'KINEMATICS & TELEMETRY' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedIndex(0);
                audioManager.play('ui_select');
              }}
              className={`font-pixel text-[10px] px-3 py-1.5 border transition-all ${
                activeTab === tab.id
                  ? 'border-[#00EB88] bg-[#00EB88]/20 text-[#00EB88] shadow-pixel-box'
                  : 'border-[#2E2B44] text-[#A7A9BE] hover:text-white bg-[#0F0E17]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab !== 'KINEMATICS' && activeTab !== 'WEAPON_SPELLS' && (
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-[#A7A9BE]">
            <span>FILTER:</span>
            {(['ALL', 'UNLOCKED', 'LOCKED'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setFilterMode(mode);
                  setSelectedIndex(0);
                  audioManager.play('ui_select');
                }}
                className={`px-2 py-0.5 border ${
                  filterMode === mode
                    ? 'border-[#F4B41A] text-[#F4B41A] bg-[#F4B41A]/10'
                    : 'border-[#2E2B44] text-[#A7A9BE]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === 'KINEMATICS' ? (
        /* Kinematics Telemetry View */
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="bg-[#0F0E17] border-2 border-[#00EB88] p-4 rounded text-left">
            <h3 className="font-pixel text-xs text-[#00EB88] mb-1 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span>KINEMATIC TRACKING TELEMETRY ENGINE</span>
            </h3>
            <p className="text-xs text-[#A7A9BE] font-mono mb-4">
              Frontal and Sagittal MediaPipe biomechanical tracking telemetry recorded across all workout sessions.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
              <div className="bg-[#1A1926] p-3 border border-[#2E2B44] rounded">
                <div className="text-[10px] text-[#A7A9BE]">TOTAL WORKOUT REPS</div>
                <div className="text-lg text-white font-pixel mt-1">{sessionReps}</div>
              </div>
              <div className="bg-[#1A1926] p-3 border border-[#2E2B44] rounded">
                <div className="text-[10px] text-[#A7A9BE]">PEAK DRIVE POWER</div>
                <div className="text-lg text-[#38B6FF] font-pixel mt-1">{highestPower}</div>
              </div>
              <div className="bg-[#1A1926] p-3 border border-[#2E2B44] rounded">
                <div className="text-[10px] text-[#A7A9BE]">SHIELD DAMAGE BLOCKED</div>
                <div className="text-lg text-[#00EB88] font-pixel mt-1">
                  {profile?.unlockStats?.totalBlockedDamage || 0} HP
                </div>
              </div>
              <div className="bg-[#1A1926] p-3 border border-[#2E2B44] rounded">
                <div className="text-[10px] text-[#A7A9BE]">TOTAL MONSTER KILLS</div>
                <div className="text-lg text-[#FF3366] font-pixel mt-1">
                  {Object.values(profile?.unlockStats?.monsterKills || {}).reduce((a, b) => a + b, 0)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#0F0E17] border-2 border-[#2E2B44] p-4 rounded">
            <h4 className="font-pixel text-xs text-[#F4B41A] mb-3">LIFETIME EXERCISE REP BREAKDOWN</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(profile?.unlockStats?.exerciseReps || {}).map(([ex, count]) => (
                <div key={ex} className="flex items-center justify-between p-2 bg-[#1A1926] border border-[#2E2B44]">
                  <span className="font-pixel text-[10px] text-white">{ex.replace(/_/g, ' ')}</span>
                  <span className="font-mono text-xs text-[#38B6FF] font-bold">{count} REPS</span>
                </div>
              ))}
              {Object.keys(profile?.unlockStats?.exerciseReps || {}).length === 0 && (
                <div className="text-xs text-[#A7A9BE] font-mono italic col-span-3">
                  No exercise reps recorded yet. Enter a dungeon expedition to begin tracking!
                </div>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'WEAPON_SPELLS' ? (
        /* Weapon Spells Tab */
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
          {/* Left: Weapon Spells List */}
          <div className="overflow-y-auto pr-2 space-y-2 max-h-[60vh]">
            {weaponSpellsWithMeta.map((spell, idx) => {
              const isSelected = selectedIndex === idx;
              const template = CARD_CATALOG.find((c) => c.templateId === spell.templateId) ||
                Object.values(CARD_UNLOCK_REGISTRY).find((c) => c.cardId === spell.templateId);

              return (
                <div
                  key={spell.templateId}
                  onClick={() => setSelectedIndex(idx)}
                  className={`p-3 rounded border-2 transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-[#F4B41A] bg-[#242138] shadow-pixel-box-gold'
                      : 'border-[#2E2B44] bg-[#0F0E17] hover:border-[#38B6FF]'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-pixel text-xs text-white">{spell.name}</span>
                      <span className="text-[9px] font-pixel px-1.5 py-0.5 border border-[#38B6FF] text-[#38B6FF] uppercase">
                        {spell.rarity}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-[#A7A9BE] mt-1">
                      Granted by: <span className="text-[#F4B41A]">{spell.weaponName}</span>
                    </div>
                  </div>

                  <div>
                    {spell.isEquipped ? (
                      <span className="text-[9px] font-pixel text-[#00EB88] bg-[#00EB88]/20 border border-[#00EB88] px-2 py-0.5">
                        ⚔️ IN DECK
                      </span>
                    ) : spell.isOwned ? (
                      <span className="text-[9px] font-pixel text-[#38B6FF] bg-[#38B6FF]/20 border border-[#38B6FF] px-2 py-0.5">
                        IN ARMORY
                      </span>
                    ) : (
                      <span className="text-[9px] font-pixel text-[#A7A9BE] bg-[#2E2B44] px-2 py-0.5">
                        FORGE AT BLACKSMITH
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Weapon Spell Details */}
          <div className="bg-[#0F0E17] border-2 border-[#2E2B44] p-4 rounded flex flex-col justify-between overflow-y-auto max-h-[60vh]">
            {weaponSpellsWithMeta[selectedIndex] ? (
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-[#2E2B44] pb-2">
                  <div>
                    <span className="text-[9px] font-pixel text-[#F4B41A] uppercase tracking-wider block">
                      SIGNATURE WEAPON SPELL
                    </span>
                    <h3 className="font-pixel text-base text-white">
                      {weaponSpellsWithMeta[selectedIndex].name}
                    </h3>
                  </div>
                  <span className="text-[10px] font-pixel px-2 py-1 bg-[#38B6FF]/20 border border-[#38B6FF] text-[#38B6FF]">
                    {weaponSpellsWithMeta[selectedIndex].rarity.toUpperCase()}
                  </span>
                </div>

                <div className="bg-[#1A1926] p-3 border border-[#2E2B44] rounded mb-4">
                  <div className="text-[10px] font-pixel text-[#F4B41A] mb-1">SIGNATURE WEAPON:</div>
                  <div className="font-pixel text-sm text-white">
                    {weaponSpellsWithMeta[selectedIndex].weaponName}
                  </div>
                  <p className="text-[10px] font-mono text-[#A7A9BE] mt-2">
                    Weapon spells are automatically unlocked and shuffled into your battle deck (two copies) whenever
                    this signature weapon is equipped.
                  </p>
                </div>

                <div className="bg-[#1A1926] p-3 border border-[#2E2B44] rounded">
                  <div className="text-[10px] font-pixel text-[#00EB88] mb-1">EQUIPMENT STATUS:</div>
                  {weaponSpellsWithMeta[selectedIndex].isEquipped ? (
                    <div className="text-xs font-mono text-[#00EB88] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Currently equipped! Two copies are active in your combat hand draw pile.</span>
                    </div>
                  ) : weaponSpellsWithMeta[selectedIndex].isOwned ? (
                    <div className="text-xs font-mono text-[#38B6FF]">
                      Owned in armory! Equip this weapon at the Blacksmith to activate this spell in battle.
                    </div>
                  ) : (
                    <div className="text-xs font-mono text-[#A7A9BE]">
                      Locked. Visit the Blacksmith Forge in the Citadel Hub to purchase and equip this weapon.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs font-mono text-[#A7A9BE] text-center my-auto">
                Select a weapon spell from the list.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Regular Card Catalog Grid & Inspector */
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 overflow-hidden">
          {/* Left Grid: Cards (7 cols) */}
          <div className="md:col-span-7 overflow-y-auto pr-2 max-h-[60vh]">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {displayedCards.map((item, index) => {
                const isSelected = selectedIndex === index;

                return (
                  <div
                    key={item.card.templateId}
                    onClick={() => setSelectedIndex(index)}
                    className={`p-2.5 rounded border-2 transition-all cursor-pointer flex flex-col justify-between h-32 relative ${
                      isSelected
                        ? 'border-[#F4B41A] bg-[#242138] shadow-pixel-box-gold scale-102 z-10'
                        : item.isUnlocked
                        ? 'border-[#2E2B44] bg-[#0F0E17] hover:border-[#38B6FF]'
                        : 'border-[#2E2B44]/60 bg-[#0F0E17]/60 opacity-80 hover:border-[#F4B41A]/50'
                    }`}
                  >
                    {/* Header */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-pixel text-[#F4B41A]">
                          {item.card.icon} {item.card.requiredReps}R
                        </span>
                        {item.isUnlocked ? (
                          <Unlock className="w-3.5 h-3.5 text-[#00EB88]" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-[#FF3366]" />
                        )}
                      </div>

                      <div
                        className={`font-pixel text-[11px] leading-tight line-clamp-2 ${
                          item.isUnlocked ? 'text-white' : 'text-[#A7A9BE]'
                        }`}
                      >
                        {item.card.name}
                      </div>

                      <div className="text-[9px] font-mono text-[#A7A9BE] mt-0.5">
                        {item.card.exerciseLabel}
                      </div>
                    </div>

                    {/* Bottom status / progress */}
                    <div>
                      {item.isStarter ? (
                        <span className="text-[8px] font-pixel text-[#38B6FF] bg-[#38B6FF]/10 border border-[#38B6FF]/40 px-1 py-0.5">
                          STARTER
                        </span>
                      ) : item.isUnlocked ? (
                        <span className="text-[8px] font-pixel text-[#00EB88] bg-[#00EB88]/10 border border-[#00EB88]/40 px-1 py-0.5">
                          UNLOCKED
                        </span>
                      ) : item.progress ? (
                        <div>
                          <div className="flex justify-between text-[8px] font-mono text-[#A7A9BE] mb-0.5">
                            <span>{item.progress.progressText}</span>
                            <span>{item.progress.percent}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-[#2E2B44] overflow-hidden">
                            <div
                              className="h-full bg-[#F4B41A]"
                              style={{ width: `${item.progress.percent}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[8px] font-pixel text-[#FF3366]">LOCKED</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {displayedCards.length === 0 && (
              <div className="text-center py-12 text-[#A7A9BE] font-mono text-xs">
                No cards matching the selected filters.
              </div>
            )}
          </div>

          {/* Right Inspector: Card Details & Unlock Lore (5 cols) */}
          <div className="md:col-span-5 bg-[#0F0E17] border-2 border-[#2E2B44] p-3.5 rounded flex flex-col justify-between overflow-y-auto max-h-[60vh]">
            {activeCardItem ? (
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#2E2B44] pb-2">
                  <div>
                    <span className="text-[9px] font-pixel px-1.5 py-0.5 border border-[#38B6FF] text-[#38B6FF] uppercase">
                      {activeCardItem.category.replace('_', ' ')}
                    </span>
                    <h3 className="font-pixel text-sm text-white mt-1">
                      {activeCardItem.card.name}
                    </h3>
                  </div>

                  <div>
                    {activeCardItem.isUnlocked ? (
                      <span className="text-[9px] font-pixel text-[#00EB88] bg-[#00EB88]/10 border border-[#00EB88] px-2 py-0.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>MASTERED</span>
                      </span>
                    ) : (
                      <span className="text-[9px] font-pixel text-[#FF3366] bg-[#FF3366]/10 border border-[#FF3366] px-2 py-0.5 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>LOCKED</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Face Preview */}
                <div className="flex justify-center my-2">
                  <div className="relative w-[148px] h-[236px] shrink-0">
                    <CardFront card={activeCardItem.card} />
                  </div>
                </div>

                {/* Unlock Requirements & Progress (if locked) */}
                {!activeCardItem.isUnlocked && activeCardItem.unlockDef && (
                  <div className="bg-[#1A1926] border-2 border-[#F4B41A] p-2.5 rounded">
                    <div className="text-[10px] font-pixel text-[#F4B41A] mb-1 flex items-center justify-between">
                      <span>TRIAL REQUIREMENT:</span>
                      {activeCardItem.unlockDef.dropRateText && (
                        <span className="text-[#38B6FF] text-[9px]">{activeCardItem.unlockDef.dropRateText}</span>
                      )}
                    </div>
                    <div className="text-xs font-mono text-white mb-2">
                      {activeCardItem.unlockDef.requirementText}
                    </div>

                    {activeCardItem.progress && (
                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-[#A7A9BE] mb-1">
                          <span>Progress: {activeCardItem.progress.progressText}</span>
                          <span className="text-[#F4B41A] font-bold">{activeCardItem.progress.percent}%</span>
                        </div>
                        <div className="w-full h-2 bg-[#0F0E17] border border-[#2E2B44] overflow-hidden">
                          <div
                            className="h-full bg-[#F4B41A]"
                            style={{ width: `${activeCardItem.progress.percent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Thematic Lore Box */}
                {activeCardItem.unlockDef && (
                  <div className="bg-[#1A1926] border border-[#2E2B44] p-2.5 rounded text-[11px] font-mono text-[#E5E7EB] italic leading-relaxed">
                    "{activeCardItem.unlockDef.lore}"
                  </div>
                )}

                {activeCardItem.isStarter && (
                  <div className="bg-[#1A1926] border border-[#38B6FF] p-2.5 rounded text-[11px] font-mono text-[#38B6FF]">
                    Basic starter card. Forged from plain steel, granted to every knight at the start of their journey.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs font-mono text-[#A7A9BE] text-center my-auto">
                Select a card to view its codex entry.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Navigation Bar */}
      <div className="mt-3 pt-2 border-t border-[#2E2B44] flex items-center justify-between text-[9px] font-pixel text-[#38B6FF]">
        <span>[D-PAD ARROWS] BROWSE CARDS • [SELECT] INSPECT</span>
        <span>[ESC / BACK] RETURN TO CITADEL HUB</span>
      </div>
    </div>
  );
};
