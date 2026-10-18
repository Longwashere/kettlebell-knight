import React, { useState, useEffect, useRef } from 'react';
import { BattleMapId } from '../../types/battle';
import { getStageLore, StageLore, CinematicScene } from '../../shared/stageLore';
import { BATTLE_MAPS, getMapBattleMusic } from '../engine/battleMaps';
import { audioManager } from '../../shared/AudioManager';
import { useTVRemote } from '../hooks/useTVRemote';
import {
  Sparkles,
  Skull,
  Shield,
  Swords,
  ChevronRight,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface StageCinematicProps {
  mapId: BattleMapId;
  onClose: () => void;
  onEmbark?: () => void;
}

export const StageCinematic: React.FC<StageCinematicProps> = ({
  mapId,
  onClose,
  onEmbark,
}) => {
  const lore: StageLore = getStageLore(mapId);
  const [sceneIndex, setSceneIndex] = useState<number>(0);
  const [displayedChars, setDisplayedChars] = useState<number>(0);
  const [isTypingComplete, setIsTypingComplete] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const currentScene: CinematicScene = lore.scenes[sceneIndex] || lore.scenes[0];
  const bgImage = currentScene.image || BATTLE_MAPS[mapId] || BATTLE_MAPS.VERDANT_FOREST;
  const fullSceneText = currentScene.text.join(' ');
  const typewriterTimerRef = useRef<number | null>(null);

  // Play BGM on mount
  useEffect(() => {
    const musicUrl = '/assets/music/cinematic_prologue.mp3';
    audioManager.playBgm(musicUrl, 0.75);
    audioManager.play('ui_select');

    return () => {
      if (typewriterTimerRef.current) {
        clearInterval(typewriterTimerRef.current);
      }
    };
  }, [mapId]);

  // Typewriter effect
  useEffect(() => {
    setDisplayedChars(0);
    setIsTypingComplete(false);

    if (typewriterTimerRef.current) {
      clearInterval(typewriterTimerRef.current);
    }

    let charCount = 0;
    const totalChars = fullSceneText.length;

    typewriterTimerRef.current = window.setInterval(() => {
      charCount += 2;
      if (charCount >= totalChars) {
        charCount = totalChars;
        setIsTypingComplete(true);
        if (typewriterTimerRef.current) {
          clearInterval(typewriterTimerRef.current);
          typewriterTimerRef.current = null;
        }
      }
      setDisplayedChars(charCount);

      // Subtle audio feedback every 6 characters
      if (charCount % 6 === 0 && !isMuted) {
        audioManager.play('ui_move', { vol: 0.12, rate: 1.2 });
      }
    }, 28);

    return () => {
      if (typewriterTimerRef.current) {
        clearInterval(typewriterTimerRef.current);
      }
    };
  }, [sceneIndex, fullSceneText, isMuted]);

  const handleNext = () => {
    if (!isTypingComplete) {
      // Fast-forward text
      if (typewriterTimerRef.current) {
        clearInterval(typewriterTimerRef.current);
        typewriterTimerRef.current = null;
      }
      setDisplayedChars(fullSceneText.length);
      setIsTypingComplete(true);
      audioManager.play('ui_select');
      return;
    }

    if (sceneIndex < lore.scenes.length - 1) {
      setSceneIndex((prev) => prev + 1);
      audioManager.play('card');
    } else {
      // Completed all scenes
      audioManager.play('equip');
      if (onEmbark) {
        onEmbark();
      } else {
        onClose();
      }
    }
  };

  const handlePrev = () => {
    if (sceneIndex > 0) {
      setSceneIndex((prev) => prev - 1);
      audioManager.play('ui_move');
    }
  };

  const handleNextChapter = () => {
    if (sceneIndex < lore.scenes.length - 1) {
      setSceneIndex((prev) => prev + 1);
      audioManager.play('card');
    }
  };

  // Remote controls
  useTVRemote({
    onSelect: handleNext,
    onBack: onClose,
    onRight: handleNextChapter,
    onLeft: handlePrev,
  });

  const getMoodBadge = (mood: CinematicScene['mood']) => {
    switch (mood) {
      case 'former_glory':
        return (
          <span className="flex items-center gap-1 text-[10px] font-pixel text-[#F4B41A] bg-[#F4B41A]/10 border border-[#F4B41A]/40 px-2 py-0.5 rounded tracking-wider">
            <Sparkles className="w-3 h-3 text-[#F4B41A]" /> ANCIENT GLORY
          </span>
        );
      case 'ruin':
        return (
          <span className="flex items-center gap-1 text-[10px] font-pixel text-[#FF3366] bg-[#FF3366]/10 border border-[#FF3366]/40 px-2 py-0.5 rounded tracking-wider">
            <Skull className="w-3 h-3 text-[#FF3366]" /> THE RUIN & ROT
          </span>
        );
      case 'apex_terror':
        return (
          <span className="flex items-center gap-1 text-[10px] font-pixel text-[#C084FC] bg-[#C084FC]/10 border border-[#C084FC]/40 px-2 py-0.5 rounded tracking-wider">
            <Swords className="w-3 h-3 text-[#C084FC]" /> APEX TERROR
          </span>
        );
      case 'iron_vow':
        return (
          <span className="flex items-center gap-1 text-[10px] font-pixel text-[#38B6FF] bg-[#38B6FF]/10 border border-[#38B6FF]/40 px-2 py-0.5 rounded tracking-wider">
            <Shield className="w-3 h-3 text-[#38B6FF]" /> SACRAMENT OF IRON
          </span>
        );
    }
  };

  const isFinalScene = sceneIndex === lore.scenes.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-black select-none overflow-hidden text-white font-mono">
      {/* 64-BIT PIXEL ART BACKGROUND WITH CINEMATIC KEN BURNS PAN/ZOOM */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          key={bgImage}
          className="absolute inset-[-8%] w-[116%] h-[116%] bg-cover bg-center transition-all duration-700 ease-in-out will-change-transform"
          style={{
            backgroundImage: `url(${bgImage})`,
            imageRendering: 'pixelated',
            transform: `scale(${1.06 + (sceneIndex % 2) * 0.04}) translate(${
              sceneIndex % 2 === 0 ? '-1.5%' : '1.5%'
            }, ${(sceneIndex % 2) * -1.2}%)`,
          }}
        />
        {/* Dark Vignette & Atmospheric Fog Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black pointer-events-none" />
        <div className="absolute inset-0 bg-radial-vignette opacity-80 pointer-events-none" />

        {/* CRT Scanline & Pixel Grain Filter */}
        <div
          className="absolute inset-0 pointer-events-none opacity-25 mix-blend-overlay"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.7) 3px)',
          }}
        />

        {/* Floating Atmospheric Motes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
          <div className="absolute top-1/4 left-1/3 w-1.5 h-1.5 bg-[#F4B41A] rounded-full blur-[0.5px] animate-pulse" />
          <div className="absolute top-2/3 right-1/4 w-1 h-1 bg-[#38B6FF] rounded-full blur-[0.5px] animate-ping" />
          <div className="absolute bottom-1/3 left-1/5 w-2 h-2 bg-[#FF3366] rounded-full blur-[1px] animate-pulse" />
        </div>
      </div>

      {/* TOP ANAMORPHIC LETTERBOX BAR */}
      <div className="relative z-10 w-full h-[14vh] bg-[#0A0912] border-b-2 border-[#2E2B44] flex items-center justify-between px-8 shadow-2xl">
        <div className="flex items-center gap-4">
          <span className="font-pixel text-xs text-[#F4B41A] tracking-widest bg-[#1A1926] px-3 py-1 border border-[#F4B41A]/50 rounded">
            {lore.actRoman}
          </span>
          <div>
            <h1 className="font-pixel text-base text-white tracking-wider flex items-center gap-2">
              <span>{lore.stageName}</span>
              <span className="text-[#A7A9BE] text-xs font-mono font-normal">
                • {lore.epithet}
              </span>
            </h1>
            <p className="text-[10px] font-mono text-[#F4B41A] uppercase tracking-widest">
              {lore.actTitle}
            </p>
          </div>
        </div>

        {/* Progress Dots & Close Button */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            {lore.scenes.map((_, idx) => (
              <div
                key={idx}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  idx === sceneIndex
                    ? 'w-6 h-2 bg-[#F4B41A] ring-2 ring-[#F4B41A]/60'
                    : idx < sceneIndex
                    ? 'w-2 h-2 bg-[#38B6FF]'
                    : 'w-2 h-2 bg-[#2E2B44]'
                }`}
                onClick={() => {
                  setSceneIndex(idx);
                  audioManager.play('ui_select');
                }}
              />
            ))}
          </div>

          <button
            onClick={() => {
              const muted = audioManager.toggleMute();
              setIsMuted(muted);
            }}
            className="p-1.5 bg-[#1A1926] border border-[#2E2B44] hover:border-[#F4B41A] text-[#A7A9BE] hover:text-white rounded"
            title="Toggle Sound"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1926] border border-[#2E2B44] hover:border-[#FF3366] text-[#A7A9BE] hover:text-[#FF3366] font-pixel text-xs rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>[ESC] SKIP</span>
          </button>
        </div>
      </div>

      {/* CENTER NARRATIVE CARD: DRAMATIC PIXEL LETTERBOX DIALOGUE */}
      <div className="relative z-10 max-w-4xl mx-auto my-auto px-6 w-full">
        <div className="bg-[#0A0912]/92 border-4 border-[#2E2B44] shadow-pixel-box rounded p-6 backdrop-blur-md relative overflow-hidden transition-all duration-500">
          {/* Subtle Golden/Crimson Corner Accents */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#F4B41A]" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#F4B41A]" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#F4B41A]" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#F4B41A]" />

          {/* Chapter Header */}
          <div className="flex items-center justify-between border-b border-[#2E2B44] pb-3 mb-4">
            <div className="flex items-center gap-3">
              {getMoodBadge(currentScene.mood)}
              <span className="font-pixel text-xs text-[#E0E2EC] tracking-wider">
                {currentScene.chapter}
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#A7A9BE]">
              {sceneIndex + 1} / {lore.scenes.length}
            </span>
          </div>

          <h2 className="font-pixel text-sm text-[#F4B41A] mb-3 tracking-wide">
            {currentScene.subtitle}
          </h2>

          {/* Typewriter Narrative Text */}
          <div className="min-h-[90px] flex items-center">
            <p className="font-mono text-sm leading-relaxed text-[#D1D5DB] tracking-wide whitespace-pre-line">
              {fullSceneText.slice(0, displayedChars)}
              {!isTypingComplete && (
                <span className="inline-block w-2 h-4 bg-[#F4B41A] ml-1 animate-pulse" />
              )}
            </p>
          </div>

          {/* Stage Lore Details at bottom of card */}
          {currentScene.mood === 'apex_terror' && (
            <div className="mt-4 p-3 bg-red-950/40 border border-[#FF3366]/40 rounded text-xs font-mono text-[#FCA5A5] flex items-center gap-2">
              <Skull className="w-4 h-4 text-[#FF3366] shrink-0" />
              <span>{lore.apexTerror}</span>
            </div>
          )}

          {currentScene.mood === 'iron_vow' && (
            <div className="mt-4 p-3 bg-cyan-950/40 border border-[#38B6FF]/40 rounded text-xs font-mono text-[#7DD3FC] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#38B6FF] shrink-0" />
              <span>"{lore.penanceVow}"</span>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM ANAMORPHIC LETTERBOX BAR & ACTION CONTROLS */}
      <div className="relative z-10 w-full h-[14vh] bg-[#0A0912] border-t-2 border-[#2E2B44] flex items-center justify-between px-8 shadow-2xl">
        <div className="flex items-center gap-6 text-[10px] font-pixel text-[#A7A9BE]">
          <span>[SELECT / ENTER / SPACE] ADVANCE</span>
          <span>[◀ / ▶] CHAPTERS</span>
          <span>[BACK / ESC] RETURN</span>
        </div>

        <div className="flex items-center gap-4">
          {sceneIndex > 0 && (
            <button
              onClick={handlePrev}
              className="px-4 py-2 bg-[#1A1926] border border-[#2E2B44] hover:border-[#A7A9BE] text-[#A7A9BE] hover:text-white font-pixel text-xs rounded transition-colors"
            >
              ◀ PREV
            </button>
          )}

          <button
            onClick={handleNext}
            className={`px-6 py-2.5 rounded font-pixel text-xs flex items-center gap-2 border-2 shadow-pixel-box transition-all cursor-pointer ${
              isFinalScene
                ? 'bg-[#00EB88] hover:bg-[#5affb8] text-black border-black shadow-pixel-box-green'
                : 'bg-[#F4B41A] hover:bg-[#ffe175] text-black border-black shadow-pixel-box-gold'
            }`}
          >
            <span>
              {isFinalScene
                ? onEmbark
                  ? 'EMBARK EXPEDITION'
                  : 'FINISH CHRONICLE'
                : isTypingComplete
                ? 'NEXT CHAPTER'
                : 'REVEAL TEXT'}
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
