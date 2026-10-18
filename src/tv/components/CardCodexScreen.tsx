import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CARD_CATALOG, STARTER_CARD_IDS, CardTemplate } from '../../types/battle';
import {
  CARD_UNLOCK_REGISTRY,
  getCardUnlockProgress,
  getWeaponSpellsInfo,
  CardUnlockDef,
  WeaponSpellUnlockInfo,
} from '../../shared/cardUnlocks';
import { profileManager, PlayerProfile, loadoutFor } from '../../shared/ProfileManager';
import { bindCard } from '../../shared/progression';
import { ELEMENT_INFO } from '../../shared/elements';
import { SHOP_ITEMS } from './BlacksmithShop';
import { ALL_WEAPON_SPELLS } from '../../types/weaponSpells';
import { CardFront } from './CombatCardView';
import { audioManager } from '../../shared/AudioManager';
import { useTVRemote } from '../hooks/useTVRemote';
import { TARGET_LABEL } from '../../shared/cardBalance';
import { EXERCISE_SKILLS } from '../../types/game';
import {
  BookOpen,
  Lock,
  Swords,
  Activity,
  ArrowLeft,
  Flame,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Dumbbell,
  Compass,
  Scroll,
  Zap,
  Shield,
  Sparkles,
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
  const carouselContainerRef = useRef<HTMLDivElement>(null);

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

  // Combined weapon spell items with authentic card templates
  const weaponSpellCardItems = useMemo(() => {
    return weaponSpellsWithMeta.map((spell) => {
      const weaponItem = SHOP_ITEMS.find((si) => si.id === spell.weaponId);
      const realCard = ALL_WEAPON_SPELLS.find((s) => s.templateId === spell.templateId);
      const card: CardTemplate = realCard || {
        templateId: spell.templateId,
        name: spell.name,
        exercise: 'SWING',
        requiredReps: 5,
        target: 'SINGLE',
        rarity: spell.rarity as any,
        colorHex: weaponItem?.colorHex || '#F4B41A',
        icon: '⚔️',
        weaponId: spell.weaponId,
        damage: 45,
        block: 0,
        heal: 0,
        dmgPct: 1.9,
        blockPct: 0,
        healPct: 0,
        baseReps: 5,
        type: 'ATTACK',
        exerciseLabel: 'SIGNATURE WEAPON SPELL',
        effectDesc: `Granted by ${spell.weaponName}. Shuffled into battle deck when equipped.`,
      };

      return {
        card,
        isStarter: false,
        isUnlocked: spell.isEquipped || spell.isOwned,
        unlockDef: undefined,
        progress: null,
        category: 'WEAPON_SPELL' as const,
        spellMeta: spell,
        weaponItem,
      };
    });
  }, [weaponSpellsWithMeta]);

  // Filtered list based on active tab & filter mode. Cards show this knight's numbers and spell levels
  // (weapon spells with their own weapon's).
  const displayedCards = useMemo(() => {
    const bind = <T extends { card: CardTemplate }>(items: T[]): T[] =>
      items.map((item) => ({ ...item, card: bindCard(item.card, loadoutFor(profile, item.card.weaponId)) }));
    if (activeTab === 'WEAPON_SPELLS') {
      return bind(weaponSpellCardItems);
    }

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

    return bind(list);
  }, [catalogWithMeta, weaponSpellCardItems, activeTab, filterMode, profile]);

  // Clamp selection index when displayed list changes
  useEffect(() => {
    if (selectedIndex >= displayedCards.length) {
      setSelectedIndex(Math.max(0, displayedCards.length - 1));
    }
  }, [displayedCards.length, selectedIndex]);

  const totalUnlockedCount = useMemo(() => {
    return catalogWithMeta.filter((c) => c.isUnlocked).length;
  }, [catalogWithMeta]);

  const activeItem = displayedCards[selectedIndex];

  const handlePrevCard = () => {
    if (selectedIndex > 0) {
      setSelectedIndex((prev) => prev - 1);
      audioManager.play('ui_select');
    }
  };

  const handleNextCard = () => {
    if (selectedIndex < displayedCards.length - 1) {
      setSelectedIndex((prev) => prev + 1);
      audioManager.play('ui_select');
    }
  };

  const cycleTab = (dir: number) => {
    const tabs: CodexTab[] = ['ALL', 'MONSTER_ARTS', 'DISCIPLINES', 'WEAPON_SPELLS', 'KINEMATICS'];
    const curIdx = tabs.indexOf(activeTab);
    const nextIdx = (curIdx + dir + tabs.length) % tabs.length;
    setActiveTab(tabs[nextIdx]);
    setSelectedIndex(0);
    audioManager.play('ui_select');
  };

  const kinematicsRef = useRef<HTMLDivElement | null>(null);

  // D-Pad Remote Navigation
  useTVRemote({
    onLeft: () => {
      if (activeTab === 'KINEMATICS') {
        kinematicsRef.current?.scrollBy({ top: -100, behavior: 'smooth' });
        return;
      }
      handlePrevCard();
    },
    onRight: () => {
      if (activeTab === 'KINEMATICS') {
        kinematicsRef.current?.scrollBy({ top: 100, behavior: 'smooth' });
        return;
      }
      handleNextCard();
    },
    onUp: () => {
      cycleTab(-1);
    },
    onDown: () => {
      cycleTab(1);
    },
    onSelect: () => {
      if (activeTab !== 'KINEMATICS' && activeTab !== 'WEAPON_SPELLS') {
        const modes = ['ALL', 'UNLOCKED', 'LOCKED'] as const;
        const curIdx = modes.indexOf(filterMode);
        const nextMode = modes[(curIdx + 1) % modes.length];
        setFilterMode(nextMode);
        setSelectedIndex(0);
        audioManager.play('ui_select');
      } else {
        audioManager.play('ui_select');
      }
    },
    onBack: () => {
      onBackToHub();
    },
  });

  // Width and spacing geometry for the top card carousel
  const CARD_WIDTH = 142;
  const CARD_GAP = 14;
  const CARD_SLOT = CARD_WIDTH + CARD_GAP;

  // Resolve entity image, archetype and lore for the 32-bit pedestal
  const entityInfo = useMemo(() => {
    if (!activeItem) return null;

    if (activeItem.category === 'MONSTER_ART') {
      const unlockDef = activeItem.unlockDef;
      let monsterId = 'goblin';
      if (unlockDef?.condition?.type === 'MONSTER_KILL' && unlockDef.condition.monsterIds?.length > 0) {
        monsterId = unlockDef.condition.monsterIds[0];
      }
      const monsterName = unlockDef?.condition?.type === 'MONSTER_KILL'
        ? unlockDef.condition.targetMonsterNames
        : 'Fallen Horror';
      return {
        url: `/assets/codex/monsters/${monsterId}.png`,
        name: monsterName.toUpperCase(),
        tag: 'PATRON HORROR',
        type: 'MONSTER' as const,
        desc: 'Fallen entity whose primal martial fury was carved into this arcane grimoire art.',
      };
    }

    if (activeItem.category === 'WEAPON_SPELL') {
      const weaponId = (activeItem.card as any).weaponId || (activeItem as any).spellMeta?.weaponId;
      const weaponName = (activeItem as any).spellMeta?.weaponName || 'Relic Weapon';
      return {
        url: `/assets/codex/weapons/art_${weaponId}.png`,
        fallbackUrl: `/assets/codex/weapons/kettlebell_iron.png`,
        name: weaponName.toUpperCase(),
        tag: 'FORGED RELIC',
        type: 'WEAPON' as const,
        desc: 'Ancient citadel armory armament imbued with signature physical spellcraft.',
      };
    }

    // Martial Discipline or Starter Card -> 32-bit Painterly Adventurer/Knight
    return {
      url: '/assets/codex/adventurer.png',
      name: 'CITADEL CHAMPION',
      tag: activeItem.isStarter ? 'STARTER DISCIPLINE' : 'MARTIAL MASTERY',
      type: 'KNIGHT' as const,
      desc: 'Knight of the Bell executing high-velocity kinematic force through forged iron.',
    };
  }, [activeItem]);

  return (
    <div className="bg-[#100F17]/95 border-4 border-[#2D2A42] p-3 max-w-6xl w-full rounded shadow-pixel-box-gold backdrop-blur-lg text-left flex flex-col h-[calc(100vh-80px)] max-h-[820px] select-none justify-between">
      {/* 32-Bit Dark Fantasy Header Bar */}
      <header className="flex items-center justify-between border-b-2 border-[#2D2A42] pb-1.5 mb-1.5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-[#F4B41A] text-[#0F0E17] flex items-center justify-center font-bold text-lg font-pixel shadow-pixel-box border border-black">
            <BookOpen className="w-5 h-5 text-[#0F0E17]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs font-pixel text-[#F4B41A] tracking-wider uppercase">
                GRIMOIRE OF THE BELL
              </h1>
              <span className="text-[9px] font-pixel px-1.5 py-0.2 bg-[#00EB88]/15 border border-[#00EB88] text-[#00EB88]">
                CODEX VAULT
              </span>
            </div>
            <p className="text-[10px] text-[#A7A9BE] font-mono">
              Extract secret arts from fallen horrors • Forge martial mastery through physical iron
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Progress Badge */}
          <div className="bg-[#0A0910] border border-[#F4B41A]/50 px-3 py-1 rounded flex items-center gap-2 shadow-pixel-box">
            <Trophy className="w-3.5 h-3.5 text-[#F4B41A]" />
            <div className="text-right">
              <span className="text-[8px] font-mono text-[#A7A9BE] block">CATALOG MASTERED</span>
              <span className="font-pixel text-[11px] text-[#F4B41A]">
                {totalUnlockedCount} / {CARD_CATALOG.length} CARDS
              </span>
            </div>
          </div>

          {/* Hub Back Button */}
          <button
            onClick={onBackToHub}
            className="bg-[#2D2A42] hover:bg-[#3E3A5A] text-white font-pixel text-[10px] py-2 px-3 border-2 border-black shadow-pixel-box flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>[BACK] CITADEL HUB</span>
          </button>
        </div>
      </header>

      {/* Tabs & Filter Bar */}
      <nav aria-label="Codex Categories" className="flex items-center justify-between mb-2.5 border-b border-[#2D2A42]/80 pb-1.5">
        <div className="flex gap-1.5">
          {[
            { id: 'ALL' as CodexTab, label: 'ALL CARDS', icon: <BookOpen className="w-3 h-3" /> },
            { id: 'MONSTER_ARTS' as CodexTab, label: 'MONSTER ARTS', icon: <Flame className="w-3 h-3" /> },
            { id: 'DISCIPLINES' as CodexTab, label: 'DISCIPLINES', icon: <Dumbbell className="w-3 h-3" /> },
            { id: 'WEAPON_SPELLS' as CodexTab, label: 'WEAPON SPELLS', icon: <Swords className="w-3 h-3" /> },
            { id: 'KINEMATICS' as CodexTab, label: 'TELEMETRY', icon: <Activity className="w-3 h-3" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedIndex(0);
                audioManager.play('ui_select');
              }}
              className={`font-pixel text-[9px] px-2.5 py-1.5 border flex items-center gap-1.5 transition-all ${
                activeTab === tab.id
                  ? 'border-[#F4B41A] bg-[#F4B41A]/15 text-[#F4B41A] shadow-pixel-box'
                  : 'border-[#2D2A42] text-[#A7A9BE] hover:text-white bg-[#0A0910]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab !== 'KINEMATICS' && activeTab !== 'WEAPON_SPELLS' && (
          <div className="flex items-center gap-1 text-[9px] font-mono text-[#A7A9BE]">
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
                    ? 'border-[#00EB88] text-[#00EB88] bg-[#00EB88]/15 font-bold'
                    : 'border-[#2D2A42] text-[#A7A9BE] hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      {activeTab === 'KINEMATICS' ? (
        /* Kinematics Telemetry View */
        <div ref={kinematicsRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="bg-[#0A0910] border-2 border-[#00EB88] p-4 rounded text-left">
            <h3 className="font-pixel text-xs text-[#00EB88] mb-1 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span>KINEMATIC TRACKING TELEMETRY ENGINE</span>
            </h3>
            <p className="text-xs text-[#A7A9BE] font-mono mb-4">
              Frontal and Sagittal MediaPipe biomechanical tracking telemetry recorded across all workout sessions.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
              <div className="bg-[#171622] p-3 border border-[#2D2A42] rounded">
                <div className="text-[10px] text-[#A7A9BE]">TOTAL WORKOUT REPS</div>
                <div className="text-lg text-white font-pixel mt-1">{sessionReps}</div>
              </div>
              <div className="bg-[#171622] p-3 border border-[#2D2A42] rounded">
                <div className="text-[10px] text-[#A7A9BE]">PEAK DRIVE POWER</div>
                <div className="text-lg text-[#38B6FF] font-pixel mt-1">{highestPower}</div>
              </div>
              <div className="bg-[#171622] p-3 border border-[#2D2A42] rounded">
                <div className="text-[10px] text-[#A7A9BE]">SHIELD DAMAGE BLOCKED</div>
                <div className="text-lg text-[#00EB88] font-pixel mt-1">
                  {profile?.unlockStats?.totalBlockedDamage || 0} HP
                </div>
              </div>
              <div className="bg-[#171622] p-3 border border-[#2D2A42] rounded">
                <div className="text-[10px] text-[#A7A9BE]">TOTAL MONSTER KILLS</div>
                <div className="text-lg text-[#FF3366] font-pixel mt-1">
                  {Object.values(profile?.unlockStats?.monsterKills || {}).reduce((a, b) => a + b, 0)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#0A0910] border-2 border-[#2D2A42] p-4 rounded">
            <h4 className="font-pixel text-xs text-[#F4B41A] mb-3">LIFETIME EXERCISE REP BREAKDOWN</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(profile?.unlockStats?.exerciseReps || {}).map(([ex, count]) => (
                <div key={ex} className="flex items-center justify-between p-2 bg-[#171622] border border-[#2D2A42]">
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
      ) : (
        /* Top Carousel + Bottom Codex Panels */
        <div className="flex-1 flex flex-col justify-between overflow-hidden gap-2.5">
          {/* ============================================================== */}
          {/* TOP SECTION: FULL-WIDTH 3D OVERLAPPING STACKED CARD CAROUSEL    */}
          {/* ============================================================== */}
          <section
            aria-label="Card Carousel"
            className="relative w-full h-[360px] bg-[#08070D] border-2 border-[#2D2A42] rounded-lg overflow-hidden flex items-center justify-center shadow-2xl"
          >
            {/* Dynamic Ambient Background Glow matched to focused card */}
            <div
              className="absolute inset-0 pointer-events-none transition-all duration-500 ease-out opacity-30"
              style={{
                background: `radial-gradient(circle 260px at 50% 48%, ${
                  activeItem?.card?.colorHex || '#F4B41A'
                } 0%, rgba(13,11,20,0) 75%)`,
              }}
            />

            {/* Subtle Arcane Dais Platform & Atmospheric Lighting */}
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[460px] h-7 bg-[#F4B41A]/10 rounded-full blur-md pointer-events-none" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[340px] h-1.5 bg-gradient-to-r from-transparent via-[#F4B41A]/40 to-transparent pointer-events-none" />

            {/* Top Right Carousel Index Tracker Pill */}
            <div className="absolute top-2.5 right-3.5 z-40 bg-[#0A0910]/95 px-3 py-1 rounded-full border border-[#F4B41A]/40 text-[9px] font-mono text-[#A7A9BE] flex items-center gap-2 shadow-pixel-box">
              <Sparkles className="w-3 h-3 text-[#F4B41A] animate-pulse" />
              <span>CARD {selectedIndex + 1} OF {displayedCards.length}</span>
              <span className="text-[#F4B41A] font-pixel">• [◀ / ▶] SWIPE</span>
            </div>

            {/* Left / Right Carousel Navigation Chevrons */}
            <button
              onClick={handlePrevCard}
              disabled={selectedIndex === 0}
              aria-label="Previous Card"
              className={`absolute left-3.5 z-40 w-10 h-14 bg-[#14121E]/90 border-2 border-[#F4B41A] text-[#F4B41A] flex items-center justify-center rounded-lg shadow-pixel-box transition-all ${
                selectedIndex === 0
                  ? 'opacity-20 cursor-not-allowed'
                  : 'hover:bg-[#F4B41A] hover:text-[#0F0E17] active:scale-95'
              }`}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={handleNextCard}
              disabled={selectedIndex >= displayedCards.length - 1}
              aria-label="Next Card"
              className={`absolute right-3.5 z-40 w-10 h-14 bg-[#14121E]/90 border-2 border-[#F4B41A] text-[#F4B41A] flex items-center justify-center rounded-lg shadow-pixel-box transition-all ${
                selectedIndex >= displayedCards.length - 1
                  ? 'opacity-20 cursor-not-allowed'
                  : 'hover:bg-[#F4B41A] hover:text-[#0F0E17] active:scale-95'
              }`}
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Overlapping 3D Card Stack Container */}
            <div
              ref={carouselContainerRef}
              className="relative w-[228px] h-[330px] flex items-center justify-center"
            >
              {displayedCards.map((item, index) => {
                const offset = index - selectedIndex;
                if (Math.abs(offset) > 2) return null; // Render 5 stacked cards (-2, -1, 0, 1, 2)

                // Overlapping stack geometry
                let xOffset = 0;
                let yOffset = 0;
                let scale = 1.0;
                let rotation = 0;
                let zIndex = 30;
                let opacity = 1.0;
                let filter = 'none';

                if (offset === 0) {
                  // Focused Center Card: Elevated, centered, full size, glowing shadow
                  xOffset = 0;
                  yOffset = 0;
                  scale = 1.02;
                  rotation = 0;
                  zIndex = 30;
                  opacity = 1.0;
                  filter = 'drop-shadow(0 14px 26px rgba(0,0,0,0.85))';
                } else if (offset === -1) {
                  // Immediate Left Card: Tucked behind left edge of center card
                  xOffset = -162;
                  yOffset = 10;
                  scale = 0.92;
                  rotation = -3.5;
                  zIndex = 20;
                  opacity = 0.82;
                  filter = 'brightness(0.68) drop-shadow(0 10px 20px rgba(0,0,0,0.75))';
                } else if (offset === 1) {
                  // Immediate Right Card: Tucked behind right edge of center card
                  xOffset = 162;
                  yOffset = 10;
                  scale = 0.92;
                  rotation = 3.5;
                  zIndex = 20;
                  opacity = 0.82;
                  filter = 'brightness(0.68) drop-shadow(0 10px 20px rgba(0,0,0,0.75))';
                } else if (offset === -2) {
                  // Outer Left Card: Tucked further behind left
                  xOffset = -295;
                  yOffset = 22;
                  scale = 0.82;
                  rotation = -7;
                  zIndex = 10;
                  opacity = 0.45;
                  filter = 'brightness(0.45) drop-shadow(0 6px 14px rgba(0,0,0,0.65))';
                } else if (offset === 2) {
                  // Outer Right Card: Tucked further behind right
                  xOffset = 295;
                  yOffset = 22;
                  scale = 0.82;
                  rotation = 7;
                  zIndex = 10;
                  opacity = 0.45;
                  filter = 'brightness(0.45) drop-shadow(0 6px 14px rgba(0,0,0,0.65))';
                }

                return (
                  <div
                    key={item.card.templateId}
                    onClick={() => {
                      if (offset !== 0) {
                        setSelectedIndex(index);
                        audioManager.play('ui_select');
                      }
                    }}
                    className="absolute top-0 left-0 w-[228px] h-[330px] cursor-pointer"
                    style={{
                      transform: `translateX(${xOffset}px) translateY(${yOffset}px) scale(${scale}) rotate(${rotation}deg)`,
                      zIndex,
                      opacity,
                      filter,
                      transition:
                        'transform 340ms cubic-bezier(0.2, 0.9, 0.3, 1.15), opacity 340ms ease-out, filter 340ms ease-out',
                    }}
                  >
                    {/* Floating Star / Sparkle Emblem for center card (matching reference photo) */}
                    {offset === 0 && (
                      <div className="absolute top-2 left-2 z-40 flex items-center justify-center pointer-events-none">
                        <div className="w-7 h-7 rounded-full bg-white/95 shadow-[0_0_12px_rgba(255,255,255,0.9)] flex items-center justify-center border border-white">
                          <Sparkles className="w-4 h-4 text-[#F4B41A]" />
                        </div>
                      </div>
                    )}

                    {/* Mastered / Unlocked Ribbon */}
                    {item.isUnlocked && offset === 0 && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#00EB88] text-[#0F0E17] text-[7px] leading-none font-pixel px-2 py-1 rounded-sm border border-black shadow-pixel-box z-40 flex items-center gap-1 whitespace-nowrap">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        MASTERED
                      </div>
                    )}

                    {/* Full Battle-Width Card Front (228px x 330px) */}
                    <div className="relative w-full h-full">
                      <CardFront card={item.card} />

                      {/* Locked Chained Shroud Overlay */}
                      {!item.isUnlocked && (
                        <div className="absolute inset-0 bg-black/85 rounded-xl flex flex-col items-center justify-center p-3 text-center border-2 border-[#FF3366]/60 z-30 backdrop-blur-[1px]">
                          <div className="w-10 h-10 rounded-full bg-[#171622] border-2 border-[#FF3366] flex items-center justify-center text-[#FF3366] mb-2 shadow-pixel-box animate-pulse">
                            <Lock className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-pixel text-[#FF3366] tracking-wider uppercase mb-1">
                            TRIAL LOCKED
                          </span>
                          {item.progress && (
                            <div className="w-[180px] bg-[#0A0910] border border-[#2D2A42] p-2 rounded mt-2">
                              <div className="text-[9px] font-mono text-[#F4B41A] font-bold">
                                {item.progress.progressText}
                              </div>
                              <div className="w-full h-2 bg-[#2D2A42] overflow-hidden mt-1 rounded">
                                <div
                                  className="h-full bg-gradient-to-r from-[#F4B41A] to-[#ffda66]"
                                  style={{ width: `${item.progress.percent}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ============================================================== */}
          {/* BOTTOM SECTION: 32-BIT PEDESTAL DAIS + CODEX DOSSIER PANEL     */}
          {/* ============================================================== */}
          {activeItem && (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 md:[grid-template-rows:minmax(0,1fr)] gap-3 min-h-0 overflow-y-auto">
              {/* ============================================================ */}
              {/* LEFT SIDE PANEL: 32-BIT CHIAROSCURO ENTITY PEDESTAL (4 COLS)  */}
              {/* ============================================================ */}
              <div className="md:col-span-4 bg-[#0A0910] border-2 border-[#2D2A42] p-3 rounded flex flex-col relative overflow-hidden shadow-pixel-box">
                {/* Chiaroscuro Atmospheric Spotlight Beam */}
                <div className="absolute top-0 left-[19%] -translate-x-1/2 w-28 h-full bg-gradient-to-b from-[#F4B41A]/20 via-[#38B6FF]/10 to-transparent pointer-events-none blur-sm" />

                {/* Pedestal Header Tag */}
                <div className="relative z-10 flex items-center justify-between border-b border-[#2D2A42] pb-1.5 mb-1.5">
                  <span className="text-[8px] font-pixel px-1.5 py-0.5 border border-[#38B6FF] text-[#38B6FF] bg-[#38B6FF]/10 uppercase">
                    {entityInfo?.tag || 'ORIGIN ENTITY'}
                  </span>
                  <span className="text-[9px] font-mono text-[#A7A9BE]">
                    {activeItem.card.rarity.toUpperCase()}
                  </span>
                </div>

                {/* Portrait on its lit dais beside the nameplate: sized to the panel so it is never cropped */}
                <div className="relative z-10 flex-1 min-h-0 flex items-stretch gap-3">
                  <div className="relative w-[38%] max-w-[120px] min-h-[64px] flex items-end justify-center">
                    <div className="absolute bottom-0 w-[85%] h-3 bg-black/70 rounded-[50%] border border-[#2D2A42]" />
                    <div className="absolute bottom-0.5 w-[60%] h-1.5 bg-[#F4B41A]/25 rounded-[50%] blur-[1px]" />
                    {(() => {
                      const isKnight = entityInfo?.type === 'KNIGHT';
                      const isMonster = entityInfo?.type === 'MONSTER';
                      const fallback = isKnight || isMonster ? '/assets/codex/adventurer.png' : '/assets/codex/weapons/kettlebell_iron.png';
                      return (
                        <img
                          src={entityInfo?.url}
                          alt={entityInfo?.name ?? 'Citadel Adventurer'}
                          className={`relative z-10 max-h-full max-w-full object-contain object-bottom mb-1 ${
                            isKnight || isMonster
                              ? 'drop-shadow-[0_6px_8px_rgba(0,0,0,0.85)]'
                              : 'max-h-[70%] self-center drop-shadow-[0_0_10px_rgba(244,180,26,0.6)]'
                          } ${isMonster ? 'animate-float' : ''}`}
                          style={{ imageRendering: 'pixelated' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = fallback;
                          }}
                        />
                      );
                    })()}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                    <div className="font-pixel text-[10px] text-[#F4B41A] tracking-wider leading-tight">
                      {entityInfo?.name}
                    </div>
                    <div className="text-[9px] font-mono text-[#A7A9BE] italic leading-snug line-clamp-2">
                      {entityInfo?.desc}
                    </div>
                    <div className="text-[8px] font-mono text-[#A7A9BE] leading-snug">
                      {activeItem.card.element ? `${ELEMENT_INFO[activeItem.card.element].icon} ${ELEMENT_INFO[activeItem.card.element].label}` : 'PHYSICAL'} • SPELL LV {activeItem.card.level ?? 1}
                    </div>
                  </div>
                </div>
              </div>

              {/* ============================================================ */}
              {/* RIGHT SIDE PANEL: THE GRIMOIRE CODEX & UNLOCK DOSSIER (8 COLS) */}
              {/* ============================================================ */}
              <div className="md:col-span-8 bg-[#0A0910] border-2 border-[#2D2A42] p-3 rounded flex flex-col justify-between shadow-pixel-box overflow-y-auto">
                <div>
                  {/* Title & Category Header */}
                  <div className="flex items-center justify-between border-b border-[#2D2A42] pb-1.5 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[8.5px] font-pixel px-1.5 py-0.5 border border-[#38B6FF] text-[#38B6FF] bg-[#38B6FF]/10 uppercase">
                        {activeItem.category.replace('_', ' ')}
                      </span>
                      <h2 className="font-pixel text-xs text-white">
                        {activeItem.card.name}
                      </h2>
                    </div>

                    <div>
                      {activeItem.isUnlocked ? (
                        <span className="text-[8.5px] font-pixel text-[#00EB88] bg-[#00EB88]/15 border border-[#00EB88] px-2 py-0.5 flex items-center gap-1 shadow-pixel-box">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>UNLOCKED IN DECK</span>
                        </span>
                      ) : (
                        <span className="text-[8.5px] font-pixel text-[#FF3366] bg-[#FF3366]/15 border border-[#FF3366] px-2 py-0.5 flex items-center gap-1 shadow-pixel-box">
                          <Lock className="w-3 h-3" />
                          <span>LOCKED</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* HOW TO UNLOCK / TRIAL REQUIREMENT SECTION */}
                  {!activeItem.isUnlocked && activeItem.unlockDef && (
                    <div className="bg-[#171622] border-2 border-[#F4B41A] p-2 rounded mb-1.5 shadow-pixel-box">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[9.5px] font-pixel text-[#F4B41A] flex items-center gap-1">
                          <Compass className="w-3 h-3" />
                          <span>TRIAL REQUIREMENT TO UNLOCK:</span>
                        </span>
                        {activeItem.unlockDef.dropRateText && (
                          <span className="text-[8px] font-pixel px-1.5 py-0.2 bg-[#38B6FF]/20 border border-[#38B6FF] text-[#38B6FF] rounded">
                            {activeItem.unlockDef.dropRateText}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] font-mono text-white mb-1.5 font-bold">
                        {activeItem.unlockDef.requirementText}
                      </div>

                      {activeItem.progress && (
                        <div>
                          <div className="flex justify-between text-[9px] font-mono text-[#A7A9BE] mb-0.5">
                            <span>Trial Progress: {activeItem.progress.progressText}</span>
                            <span className="text-[#F4B41A] font-bold">{activeItem.progress.percent}%</span>
                          </div>
                          <div className="w-full h-2 bg-[#0A0910] border border-[#2D2A42] overflow-hidden rounded">
                            <div
                              className="h-full bg-gradient-to-r from-[#F4B41A] to-[#ffda66] transition-all duration-300"
                              style={{ width: `${activeItem.progress.percent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* WEAPON SPELL HOW TO UNLOCK */}
                  {activeItem.category === 'WEAPON_SPELL' && (activeItem as any).spellMeta && (
                    <div className="bg-[#171622] border-2 border-[#38B6FF] p-2 rounded mb-1.5 shadow-pixel-box">
                      <div className="text-[9.5px] font-pixel text-[#38B6FF] mb-0.5 flex items-center gap-1.5">
                        <Swords className="w-3 h-3" />
                        <span>SIGNATURE WEAPON SPELL:</span>
                      </div>
                      <div className="text-[11px] font-mono text-white font-bold mb-0.5">
                        Granted by {(activeItem as any).spellMeta.weaponName}
                      </div>
                      <p className="text-[9.5px] font-mono text-[#A7A9BE] leading-relaxed">
                        Weapon spells are automatically unlocked and shuffled into your battle deck (two copies) whenever this signature weapon is equipped.
                      </p>
                    </div>
                  )}

                  {/* UNLOCKED STARTER BADGE */}
                  {activeItem.isStarter && (
                    <div className="bg-[#171622] border border-[#00EB88] p-1.5 rounded mb-1.5 text-[9.5px] font-mono text-[#00EB88] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span>Ancestral starter technique. Imbued in every knight of the Citadel from the first day of training.</span>
                    </div>
                  )}

                  {/* THEMATIC DARK FANTASY LORE */}
                  {activeItem.unlockDef && (
                    <div className="bg-[#12111B] border border-[#2D2A42] p-2 rounded mb-1.5">
                      <div className="text-[8.5px] font-pixel text-[#F4B41A] mb-0.5 flex items-center gap-1">
                        <Scroll className="w-3 h-3" />
                        <span>CHRONICLES & ORIGIN LORE:</span>
                      </div>
                      <p className="text-[10px] font-mono text-[#E5E7EB] italic leading-relaxed">
                        "{activeItem.unlockDef.lore}"
                      </p>
                    </div>
                  )}

                  {/* COMBAT STATS & KINEMATICS DUAL GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                    {/* Combat Power Sub-Panel */}
                    <div className="bg-[#171622] p-2 border border-[#2D2A42] rounded">
                      <div className="flex items-center justify-between border-b border-[#2D2A42] pb-1 mb-1">
                        <span className="font-pixel text-[9px] text-[#FF3366] flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          <span>COMBAT PROFILE</span>
                        </span>
                        <span className="font-pixel text-[8px] text-[#F4B41A]">
                          {activeItem.card.requiredReps} REPS
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[8.5px] font-mono">
                        <div>
                          <span className="text-[#A7A9BE] block text-[7.5px]">DAMAGE</span>
                          <span className="font-pixel text-[#FF3366] text-[9.5px]">
                            {activeItem.card.damage ? `⚔️ ${activeItem.card.damage}` : '0 DMG'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#A7A9BE] block text-[7.5px]">SHIELD BLOCK</span>
                          <span className="font-pixel text-[#38B6FF] text-[9.5px]">
                            {activeItem.card.block ? `🛡️ +${activeItem.card.block}` : '0 BLK'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#A7A9BE] block text-[7.5px]">FORMATION</span>
                          <span className="text-white font-pixel text-[8.5px]">
                            {TARGET_LABEL[activeItem.card.target]}
                            {activeItem.card.hits ? ` ×${activeItem.card.hits}` : ''}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#A7A9BE] block text-[7.5px]">AFFLICTION</span>
                          <span className="text-[#F4B41A] font-pixel text-[8.5px]">
                            {activeItem.card.shatter ? 'SHATTER ' : ''}
                            {activeItem.card.stagger ? `STAGGER ` : ''}
                            {activeItem.card.heal ? `HEAL ` : ''}
                            {!activeItem.card.shatter && !activeItem.card.stagger && !activeItem.card.heal ? 'NONE' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Biomechanics Sub-Panel */}
                    <div className="bg-[#171622] p-2 border border-[#2D2A42] rounded flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-[#2D2A42] pb-1 mb-1">
                          <span className="font-pixel text-[9px] text-[#38B6FF] flex items-center gap-1">
                            <Dumbbell className="w-3 h-3" />
                            <span>KINEMATIC FORM</span>
                          </span>
                          <span className="font-mono text-[8px] text-[#00EB88]">
                            {activeItem.card.exerciseLabel}
                          </span>
                        </div>
                        {EXERCISE_SKILLS[activeItem.card.exercise] && (
                          <p className="text-[8.5px] font-mono text-[#A7A9BE] leading-relaxed line-clamp-3">
                            {EXERCISE_SKILLS[activeItem.card.exercise].description}
                          </p>
                        )}
                      </div>
                      <div className="text-[7.5px] font-mono text-[#38B6FF] mt-1 pt-0.5 border-t border-[#2D2A42]/60 flex justify-between">
                        <span>CUE: {EXERCISE_SKILLS[activeItem.card.exercise]?.targetMetric || 'Kettlebell Reps'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[8.5px] font-mono text-[#A7A9BE] mt-1.5 pt-1 border-t border-[#2D2A42]/80 flex justify-between">
                  <span>Template: {activeItem.card.templateId}</span>
                  <span className="text-[#F4B41A]">RARITY: {activeItem.card.rarity.toUpperCase()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 32-Bit Dark Fantasy Footer Control Legend */}
      <footer className="mt-2 pt-1.5 border-t border-[#2D2A42] flex items-center justify-between text-[9px] font-pixel text-[#38B6FF]">
        <div className="flex items-center gap-3">
          <span>
            {activeTab === 'KINEMATICS' ? '[◀ / ▶] SCROLL TELEMETRY' : '[◀ / ▶] SWIPE CARDS'}
          </span>
          <span>•</span>
          <span>[▲ / ▼] SWITCH CATEGORIES</span>
          {activeTab !== 'KINEMATICS' && activeTab !== 'WEAPON_SPELLS' && (
            <>
              <span>•</span>
              <span className="text-[#00EB88]">[ENTER] FILTER ({filterMode})</span>
            </>
          )}
        </div>
        <div className="text-[#F4B41A]">
          <span>[ESC / BACK] RETURN TO CITADEL HUB</span>
        </div>
      </footer>
    </div>
  );
};
