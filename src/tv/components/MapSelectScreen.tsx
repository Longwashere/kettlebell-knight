import React, { useState, useEffect } from 'react';
import { BattleMapId } from '../../types/battle';
import {
  CAMPAIGN_MAP_ORDER,
  CAMPAIGN_MAPS,
  CampaignMapConfig,
  LevelExpeditionConfig,
} from '../../shared/expeditionEngine';
import { profileManager, PlayerProfile } from '../../shared/ProfileManager';
import { getExpeditionEncounters, recommendedLevel } from '../../shared/expeditionEngine';
import { expeditionClearXp } from '../../shared/stageScaling';
import { audioManager } from '../../shared/AudioManager';
import { useTVRemote } from '../hooks/useTVRemote';
import { registerDebug } from '../debug/agentBridge';
import {
  Swords,
  Lock,
  Trophy,
  Skull,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Film,
} from 'lucide-react';
import { StageCinematic } from './StageCinematic';

interface MapSelectScreenProps {
  onStartExpedition: (mapId: BattleMapId, level: number) => void;
  onBackToHub: () => void;
}

export const MapSelectScreen: React.FC<MapSelectScreenProps> = ({
  onStartExpedition,
  onBackToHub,
}) => {
  const [profile, setProfile] = useState<PlayerProfile | null>(() => profileManager.getActiveProfile());
  const [selectedMapIndex, setSelectedMapIndex] = useState<number>(0);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [showCinematic, setShowCinematic] = useState<boolean>(false);
  const [cinematicMode, setCinematicMode] = useState<'MANUAL' | 'AUTO_EMBARK'>('MANUAL');

  // Sync profile updates
  useEffect(() => {
    return profileManager.subscribe((active) => {
      setProfile(active);
    });
  }, []);

  // Dev automation bridge for map select and cinematic
  useEffect(
    () =>
      registerDebug(
        'mapSelect',
        () => ({
          mapId: CAMPAIGN_MAP_ORDER[selectedMapIndex],
          mapIndex: selectedMapIndex,
          level: selectedLevel,
          showCinematic,
        }),
        {
          setMap: (id: string) => {
            const idx = CAMPAIGN_MAP_ORDER.indexOf(id.toUpperCase() as BattleMapId);
            if (idx >= 0) {
              setSelectedMapIndex(idx);
              setSelectedLevel(1);
            }
          },
          cinematic: (open?: boolean) => setShowCinematic(open ?? true),
        }
      ),
    [selectedMapIndex, selectedLevel, showCinematic]
  );

  const currentMapId = CAMPAIGN_MAP_ORDER[selectedMapIndex];
  const currentMapConfig: CampaignMapConfig = CAMPAIGN_MAPS[currentMapId];

  const unlockedMaps: BattleMapId[] = profile?.unlockedMaps || ['VERDANT_FOREST'];
  const isCurrentMapUnlocked = unlockedMaps.includes(currentMapId);
  const mapProgress = profile?.mapProgress?.[currentMapId] || {
    highestLevelCleared: 0,
    totalClears: 0,
    bestReps: 0,
  };

  const isLevelUnlocked = (lvl: number): boolean => {
    if (!isCurrentMapUnlocked) return false;
    if (lvl === 1) return true;
    return mapProgress.highestLevelCleared >= lvl - 1;
  };

  const handlePrevMap = () => {
    setSelectedMapIndex((prev) => {
      const next = prev > 0 ? prev - 1 : CAMPAIGN_MAP_ORDER.length - 1;
      audioManager.play('ui_select');
      return next;
    });
    setSelectedLevel(1);
  };

  const handleNextMap = () => {
    setSelectedMapIndex((prev) => {
      const next = prev < CAMPAIGN_MAP_ORDER.length - 1 ? prev + 1 : 0;
      audioManager.play('ui_select');
      return next;
    });
    setSelectedLevel(1);
  };

  const handleEmbark = () => {
    if (!isCurrentMapUnlocked) {
      audioManager.play('block');
      return;
    }
    if (!isLevelUnlocked(selectedLevel)) {
      audioManager.play('block');
      return;
    }

    // First time embarking on Level 1 of a stage: play the dark fantasy prologue automatically!
    if (selectedLevel === 1 && !profileManager.hasViewedCinematic(currentMapId)) {
      profileManager.markCinematicViewed(currentMapId);
      audioManager.play('ui_select');
      setCinematicMode('AUTO_EMBARK');
      setShowCinematic(true);
      return;
    }

    audioManager.play('equip');
    onStartExpedition(currentMapId, selectedLevel);
  };

  // Keyboard shortcut [C] for stage cinematic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'c' || e.key === 'C') {
        if (!showCinematic) {
          audioManager.play('ui_select');
          setCinematicMode('MANUAL');
          setShowCinematic(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCinematic]);

  // TV Remote D-Pad Navigation (disabled when cinematic modal is active)
  useTVRemote(
    {
      onLeft: handlePrevMap,
      onRight: handleNextMap,
      onUp: () => {
        setSelectedLevel((prev) => Math.max(1, prev - 1));
        audioManager.play('ui_select');
      },
      onDown: () => {
        setSelectedLevel((prev) => Math.min(5, prev + 1));
        audioManager.play('ui_select');
      },
      onSelect: handleEmbark,
      onBack: () => {
        audioManager.play('ui_select');
        onBackToHub();
      },
    },
    { enabled: !showCinematic }
  );

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between p-6 bg-black/80 backdrop-blur-md select-none text-white overflow-hidden">
      {/* TOP HEADER */}
      <div className="flex items-center justify-between border-b-2 border-[#2E2B44] pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHub}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#1A1926] border border-[#2E2B44] hover:border-[#F4B41A] text-[#A7A9BE] hover:text-[#F4B41A] font-pixel text-xs rounded transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>[BACK] CITADEL</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="font-pixel text-sm text-[#F4B41A] tracking-wider">
              🗺️ WORLD EXPEDITIONS
            </span>
            <span className="text-[10px] font-mono text-[#A7A9BE] bg-[#0F0E17] px-2 py-0.5 border border-[#2E2B44] rounded">
              CAMPAIGN MAP {selectedMapIndex + 1} / {CAMPAIGN_MAP_ORDER.length}
            </span>
          </div>
        </div>

        {/* Knight Level & Gold Summary */}
        <div className="flex items-center gap-4 text-xs font-pixel">
          <span className="text-[#38B6FF]">
            HERO LVL {profile?.level || 1}
          </span>
          <span className="text-[#F4B41A]">
            🪙 {profile?.gold || 0} GOLD
          </span>
        </div>
      </div>

      {/* CENTER CONTENT: MAP HERO PREVIEW (LEFT) + 5 LEVEL SELECTOR (RIGHT) */}
      <div className="grid grid-cols-12 gap-6 my-auto items-stretch h-[72vh]">
        {/* LEFT COLUMN: SELECTED MAP CARD & LORE */}
        <div className="col-span-5 flex flex-col justify-between bg-[#1A1926]/95 border-4 border-[#2E2B44] rounded p-5 relative overflow-hidden shadow-pixel-box">
          {/* Background art preview */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity pointer-events-none"
            style={{ backgroundImage: `url(${currentMapConfig.background})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1926] via-[#1A1926]/80 to-transparent pointer-events-none" />

          {/* Map Title & Act */}
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-pixel text-[#FF3366] px-2 py-0.5 border border-[#FF3366]/60 bg-[#FF3366]/10 rounded">
                {currentMapConfig.act} • {currentMapConfig.levelRange}
              </span>
              {mapProgress.highestLevelCleared >= 5 ? (
                <span className="flex items-center gap-1 text-[10px] font-pixel text-[#F4B41A] bg-[#F4B41A]/10 px-2 py-0.5 border border-[#F4B41A] rounded">
                  <Trophy className="w-3 h-3" /> CONQUERED
                </span>
              ) : isCurrentMapUnlocked ? (
                <span className="flex items-center gap-1 text-[10px] font-pixel text-[#00EB88] bg-[#00EB88]/10 px-2 py-0.5 border border-[#00EB88] rounded">
                  <Sparkles className="w-3 h-3" /> UNLOCKED
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-pixel text-[#A7A9BE] bg-black/50 px-2 py-0.5 border border-[#2E2B44] rounded">
                  <Lock className="w-3 h-3" /> LOCKED
                </span>
              )}
            </div>

            <h2 className="font-pixel text-xl text-white tracking-wide mb-1">
              {currentMapConfig.name}
            </h2>
            <p className="font-mono text-xs text-[#F4B41A] mb-3">
              {currentMapConfig.theme}
            </p>
            <p className="font-mono text-[11px] text-[#A7A9BE] leading-relaxed line-clamp-4">
              {currentMapConfig.description}
            </p>

            {/* Stage Cinematic Button */}
            <button
              onClick={() => {
                audioManager.play('ui_select');
                setCinematicMode('MANUAL');
                setShowCinematic(true);
              }}
              className="mt-3 w-full py-2 px-3 bg-[#0F0E17]/90 hover:bg-[#2E2B44] border-2 border-[#F4B41A]/50 hover:border-[#F4B41A] rounded font-pixel text-[11px] text-[#F4B41A] flex items-center justify-center gap-2 transition-all shadow-pixel-box cursor-pointer group"
            >
              <Film className="w-3.5 h-3.5 text-[#F4B41A] group-hover:scale-110 transition-transform" />
              <span>[C] WATCH STAGE CINEMATIC</span>
            </button>
          </div>

          {/* Map Stage Navigation Carousel & Stats */}
          <div className="relative z-10 border-t border-[#2E2B44] pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={handlePrevMap}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#0F0E17] hover:bg-[#2E2B44] border border-[#2E2B44] rounded font-pixel text-[10px] text-[#A7A9BE] hover:text-white"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> PREV MAP
              </button>
              <div className="flex gap-1.5">
                {CAMPAIGN_MAP_ORDER.map((mid, idx) => {
                  const unlocked = unlockedMaps.includes(mid);
                  const isCur = idx === selectedMapIndex;
                  return (
                    <div
                      key={mid}
                      onClick={() => {
                        setSelectedMapIndex(idx);
                        setSelectedLevel(1);
                        audioManager.play('ui_select');
                      }}
                      className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-all ${
                        isCur
                          ? 'bg-[#F4B41A] ring-2 ring-[#F4B41A]/50 scale-125'
                          : unlocked
                          ? 'bg-[#38B6FF]/70 hover:bg-[#38B6FF]'
                          : 'bg-[#2E2B44]'
                      }`}
                    />
                  );
                })}
              </div>
              <button
                onClick={handleNextMap}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#0F0E17] hover:bg-[#2E2B44] border border-[#2E2B44] rounded font-pixel text-[10px] text-[#A7A9BE] hover:text-white"
              >
                NEXT MAP <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-[#A7A9BE] bg-[#0F0E17]/80 p-2.5 rounded border border-[#2E2B44]">
              <span>Clears: {mapProgress.totalClears}</span>
              <span>Best Level: {mapProgress.highestLevelCleared} / 5</span>
              <span>Boss: {currentMapConfig.bossName}</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 5 LEVEL EXPEDITION CARDS */}
        <div className="col-span-7 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="font-pixel text-xs text-[#A7A9BE] tracking-wide">
                SELECT EXPEDITION DIFFICULTY (LEVEL 1 TO 5)
              </span>
              <span className="text-[10px] font-mono text-[#38B6FF]">
                [▲ / ▼] NAVIGATE
              </span>
            </div>

            {currentMapConfig.levels.map((lvlConfig: LevelExpeditionConfig) => {
              const lvlNum = lvlConfig.level;
              const isSelected = selectedLevel === lvlNum;
              const isUnlocked = isLevelUnlocked(lvlNum);
              const isCleared = mapProgress.highestLevelCleared >= lvlNum;
              const isBossLevel = lvlNum === 5;

              return (
                <div
                  key={lvlNum}
                  onClick={() => {
                    setSelectedLevel(lvlNum);
                    audioManager.play('ui_select');
                  }}
                  className={`p-3.5 rounded border-2 transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#242138] border-[#F4B41A] shadow-pixel-box-gold scale-[1.01]'
                      : isUnlocked
                      ? 'bg-[#1A1926]/90 border-[#2E2B44] hover:border-[#38B6FF]'
                      : 'bg-[#111019]/60 border-[#232135] opacity-50'
                  }`}
                >
                  {/* Left: Level Number & Title */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded flex items-center justify-center font-pixel text-sm border-2 ${
                        isBossLevel
                          ? 'border-[#FF3366] bg-[#FF3366]/20 text-[#FF3366]'
                          : isCleared
                          ? 'border-[#00EB88] bg-[#00EB88]/20 text-[#00EB88]'
                          : isUnlocked
                          ? 'border-[#38B6FF] bg-[#38B6FF]/20 text-[#38B6FF]'
                          : 'border-[#2E2B44] bg-[#0F0E17] text-[#A7A9BE]'
                      }`}
                    >
                      {isBossLevel ? <Skull className="w-5 h-5" /> : `L${lvlNum}`}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-pixel text-xs ${
                            isSelected
                              ? 'text-[#F4B41A]'
                              : isBossLevel
                              ? 'text-[#FF3366]'
                              : 'text-white'
                          }`}
                        >
                          {lvlConfig.title}
                        </span>
                        {isCleared && (
                          <span className="flex items-center gap-0.5 text-[8px] font-pixel text-[#00EB88] bg-[#00EB88]/15 px-1.5 py-0.2 rounded border border-[#00EB88]">
                            <CheckCircle2 className="w-2.5 h-2.5" /> CLEARED
                          </span>
                        )}
                        {!isUnlocked && (
                          <span className="flex items-center gap-0.5 text-[8px] font-pixel text-[#A7A9BE] bg-black/40 px-1.5 py-0.2 rounded border border-[#2E2B44]">
                            <Lock className="w-2.5 h-2.5" /> LOCKED
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-[#A7A9BE] block mt-0.5">
                        {lvlConfig.subtitle}
                      </span>
                    </div>
                  </div>

                  {/* Right: Rewards & Status */}
                  <div className="flex items-center gap-4 text-right">
                    <div className="hidden sm:block">
                      <span className="text-[10px] font-pixel text-[#F4B41A] block">
                        +{lvlConfig.goldReward} GOLD
                      </span>
                      <span className="text-[9px] font-pixel text-[#38B6FF] block">
                        +{expeditionClearXp(getExpeditionEncounters(currentMapId, lvlNum), currentMapId, lvlNum)} XP CLEAR
                      </span>
                      <RecommendedLevel rec={recommendedLevel(currentMapId, lvlNum)} knight={profile?.level ?? 1} />
                    </div>

                    {isSelected && isUnlocked && (
                      <span className="font-pixel text-[10px] text-[#F4B41A] animate-pulse">
                        ▶ SELECT
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* EMBARK ACTION BUTTON */}
          <div className="pt-3">
            <button
              onClick={handleEmbark}
              disabled={!isCurrentMapUnlocked || !isLevelUnlocked(selectedLevel)}
              className={`w-full py-4 px-6 rounded font-pixel text-sm flex items-center justify-center gap-2 border-2 shadow-pixel-box transition-all ${
                isCurrentMapUnlocked && isLevelUnlocked(selectedLevel)
                  ? 'bg-[#F4B41A] hover:bg-[#ffe175] text-[#0F0E17] border-black cursor-pointer shadow-pixel-box-gold'
                  : 'bg-[#2E2B44] text-[#A7A9BE] border-[#1A1926] cursor-not-allowed opacity-60'
              }`}
            >
              <Swords className="w-5 h-5" />
              <span>
                {isCurrentMapUnlocked && isLevelUnlocked(selectedLevel)
                  ? `EMBARK EXPEDITION • ${currentMapConfig.name} [LEVEL ${selectedLevel}]`
                  : 'EXPEDITION LOCKED • CLEAR PRECEDING LEVEL FIRST'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM REMOTE GUIDE */}
      <div className="flex items-center justify-between border-t-2 border-[#2E2B44] pt-2 text-[10px] font-pixel text-[#A7A9BE]">
        <span>[◀ / ▶] CHANGE MAP</span>
        <span>[▲ / ▼] SELECT LEVEL</span>
        <span>[C] STAGE CINEMATIC</span>
        <span>[SELECT / ENTER] EMBARK ON RUN</span>
        <span>[BACK / ESC] RETURN TO CITADEL</span>
      </div>

      {/* 64-BIT DARK FANTASY STAGE CINEMATIC MODAL */}
      {showCinematic && (
        <StageCinematic
          key={currentMapId}
          mapId={currentMapId}
          onClose={() => {
            setShowCinematic(false);
            if (cinematicMode === 'AUTO_EMBARK') {
              // Skipped prologue: proceed directly into battle!
              audioManager.play('equip');
              onStartExpedition(currentMapId, selectedLevel);
            }
          }}
          onEmbark={() => {
            setShowCinematic(false);
            audioManager.play('equip');
            onStartExpedition(currentMapId, selectedLevel);
          }}
        />
      )}
    </div>
  );
};

/** The stage's recommended knight level, coloured by how the knight measures up to it. */
const RecommendedLevel: React.FC<{ rec: number; knight: number }> = ({ rec, knight }) => {
  const color = knight >= rec + 2 ? '#00EB88' : knight >= rec - 1 ? '#F4B41A' : '#FF3366';
  return (
    <span className="text-[8px] font-pixel block" style={{ color }} title="Knight level this stage is balanced for">
      REC LV {rec}
    </span>
  );
};
