import React, { useEffect } from 'react';
import { CardUnlockDef } from '../../shared/cardUnlocks';
import { CARD_CATALOG, CardTemplate } from '../../types/battle';
import { CardFront } from './CombatCardView';
import { audioManager } from '../../shared/AudioManager';
import { useTVRemote } from '../hooks/useTVRemote';
import { Sparkles, Trophy } from 'lucide-react';

interface CardUnlockCelebrationProps {
  unlockedCards: CardUnlockDef[];
  onDismiss: () => void;
}

export const CardUnlockCelebration: React.FC<CardUnlockCelebrationProps> = ({
  unlockedCards,
  onDismiss,
}) => {
  const [currentIndex, setCurrentIndex] = React.useState<number>(0);

  const currentDef = unlockedCards[currentIndex];
  const cardTemplate = CARD_CATALOG.find((c) => c.templateId === currentDef?.cardId);

  useEffect(() => {
    if (currentDef) {
      audioManager.play('victory', { delay: 0.05 });
    }
  }, [currentIndex, currentDef]);

  const handleNext = () => {
    if (currentIndex < unlockedCards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      audioManager.play('ui_select');
    } else {
      onDismiss();
    }
  };

  useTVRemote(
    {
      onSelect: handleNext,
      onBack: handleNext,
    },
    { enabled: Boolean(currentDef) }
  );

  if (!currentDef || !cardTemplate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn pointer-events-auto">
      <div className="bg-[#1A1926]/95 border-4 border-[#F4B41A] rounded p-6 max-w-xl w-full text-center shadow-pixel-box-gold relative">
        {/* Glow halo */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#F4B41A] text-[#0F0E17] font-pixel text-xs px-4 py-1.5 rounded-full border-2 border-black flex items-center gap-1.5 shadow-pixel-box">
          <Sparkles className="w-4 h-4 animate-spin" />
          <span>✦ NEW CARD UNLOCKED! ✦</span>
        </div>

        {/* Counter if multiple */}
        {unlockedCards.length > 1 && (
          <div className="text-[10px] font-mono text-[#F4B41A] mb-2 mt-1">
            Unlock {currentIndex + 1} of {unlockedCards.length}
          </div>
        )}

        {/* Category & Name */}
        <div className="mt-3 mb-4">
          <span className="text-[10px] font-pixel px-2 py-0.5 border border-[#38B6FF] text-[#38B6FF] bg-[#38B6FF]/10 uppercase tracking-widest inline-block mb-1">
            {currentDef.category.replace('_', ' ')}
          </span>
          <h2 className="font-pixel text-lg text-white tracking-wide">
            {currentDef.name}
          </h2>
        </div>

        {/* Center: Card Display */}
        <div className="flex justify-center my-4">
          <div className="relative w-[148px] h-[236px] scale-110 shrink-0">
            <CardFront card={cardTemplate} />
          </div>
        </div>

        {/* Thematic Lore Box */}
        <div className="bg-[#0F0E17] border-2 border-[#2E2B44] p-3 rounded text-left mb-5">
          <div className="text-[10px] font-pixel text-[#F4B41A] mb-1 flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5" />
            <span>HOW IT WAS EARNED:</span>
          </div>
          <p className="text-[11px] font-mono text-[#E5E7EB] leading-relaxed italic mb-1.5">
            "{currentDef.lore}"
          </p>
          <div className="text-[10px] font-mono text-[#A7A9BE] flex items-center justify-between border-t border-[#2E2B44]/80 pt-1">
            <span>Trial: {currentDef.requirementText}</span>
            {currentDef.dropRateText && (
              <span className="text-[#38B6FF] font-bold">{currentDef.dropRateText}</span>
            )}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleNext}
          className="w-full bg-[#F4B41A] hover:bg-[#ffe175] text-[#0F0E17] font-pixel text-xs py-3 border-2 border-black shadow-pixel-box flex items-center justify-center gap-2"
        >
          <span>[ENTER / SELECT]</span>
          <span>{currentIndex < unlockedCards.length - 1 ? 'NEXT CARD ▶' : 'ADD TO BATTLE DECK ▶'}</span>
        </button>
      </div>
    </div>
  );
};
