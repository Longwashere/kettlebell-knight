import React, { useEffect } from 'react';
import { CardUnlockDef } from '../../shared/cardUnlocks';
import { CARD_CATALOG } from '../../types/battle';
import { CardFront, cardStyleVars } from './CombatCardView';
import { audioManager } from '../../shared/AudioManager';
import { networkManager } from '../../shared/NetworkManager';
import { useTVRemote } from '../hooks/useTVRemote';
import { Sparkles, Trophy } from 'lucide-react';

interface CardUnlockCelebrationProps {
  unlockedCards: CardUnlockDef[];
  onDismiss: () => void;
}

/** Post-fight reward step: each card unlocked during the fight, one per page, at full hand size. */
export const CardUnlockCelebration: React.FC<CardUnlockCelebrationProps> = ({
  unlockedCards,
  onDismiss,
}) => {
  const [currentIndex, setCurrentIndex] = React.useState<number>(0);

  const currentDef = unlockedCards[currentIndex];
  const cardTemplate = CARD_CATALOG.find((c) => c.templateId === currentDef?.cardId);
  const isLast = currentIndex >= unlockedCards.length - 1;

  useEffect(() => {
    if (currentDef) {
      audioManager.play('victory', { delay: 0.05 });
    }
  }, [currentIndex, currentDef]);

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

  useTVRemote(
    {
      onSelect: handleNext,
      onBack: handleNext,
    },
    { enabled: Boolean(currentDef) }
  );

  // A def without a catalog card can't be shown: skip past it
  useEffect(() => {
    if (currentDef && !cardTemplate) handleNext();
  });

  if (!currentDef || !cardTemplate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn pointer-events-auto">
      <div className="bg-[#1A1926]/95 border-4 border-[#F4B41A] rounded px-8 pt-10 pb-6 max-w-3xl w-full shadow-pixel-box-gold relative">
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#F4B41A] text-[#0F0E17] font-pixel text-xs px-4 py-1.5 rounded-full border-2 border-black flex items-center gap-1.5 shadow-pixel-box">
          <Sparkles className="w-4 h-4 animate-spin" />
          <span>✦ NEW CARD UNLOCKED! ✦</span>
        </div>

        <div className="flex items-center gap-8">
          {/* The card at its in-hand size, so the exercise figure and rep pips have room */}
          <div key={currentDef.cardId} className="relative w-[228px] h-[342px] shrink-0 animate-fadeIn" style={cardStyleVars(cardTemplate)}>
            <CardFront card={cardTemplate} />
          </div>

          <div className="flex-1 min-w-0 flex flex-col text-left">
            {unlockedCards.length > 1 && (
              <div className="text-[10px] font-pixel text-[#F4B41A] mb-2">
                UNLOCK {currentIndex + 1} OF {unlockedCards.length}
              </div>
            )}
            <span className="self-start text-[10px] font-pixel px-2 py-0.5 border border-[#38B6FF] text-[#38B6FF] bg-[#38B6FF]/10 uppercase tracking-widest mb-2">
              {currentDef.category.replace('_', ' ')}
            </span>
            <h2 className="font-pixel text-lg text-white tracking-wide mb-4">{currentDef.name}</h2>

            <div className="bg-[#0F0E17] border-2 border-[#2E2B44] p-3 rounded mb-5">
              <div className="text-[10px] font-pixel text-[#F4B41A] mb-1.5 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" />
                <span>HOW IT WAS EARNED:</span>
              </div>
              <p className="text-[11px] font-mono text-[#E5E7EB] leading-relaxed italic mb-2">"{currentDef.lore}"</p>
              <div className="text-[10px] font-mono text-[#A7A9BE] flex items-center justify-between gap-2 border-t border-[#2E2B44]/80 pt-1.5">
                <span>Trial: {currentDef.requirementText}</span>
                {currentDef.dropRateText && (
                  <span className="text-[#38B6FF] font-bold shrink-0">{currentDef.dropRateText}</span>
                )}
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full bg-[#F4B41A] hover:bg-[#ffe175] text-[#0F0E17] font-pixel text-xs py-3 border-2 border-black shadow-pixel-box flex items-center justify-center"
            >
              <span>{isLast ? 'ADD TO BATTLE DECK ▶' : 'NEXT CARD ▶'}</span>
            </button>
            <div className="mt-2.5 flex items-center justify-center text-[8.5px] font-pixel text-[#F4B41A] tracking-wider animate-pulse">
              <span>◆ [ENTER] or SQUAT TO CONTINUE ◆</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
