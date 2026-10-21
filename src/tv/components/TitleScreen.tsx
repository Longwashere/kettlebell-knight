import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTVRemote } from '../hooks/useTVRemote';
import { exitApp } from '../native';
import { getGraphicsMode, setGraphicsMode, GraphicsMode } from '../graphicsMode';
import { audioManager } from '../../shared/AudioManager';
import { profileManager, PlayerProfile, DEFAULT_KNIGHT_NAME, TOTAL_SAVE_SLOTS } from '../../shared/ProfileManager';
import { 
  Swords, 
  Shield, 
  Flame, 
  Skull, 
  Award, 
  Clock, 
  Check, 
  Trash2, 
  ArrowLeft,
  Sparkles,
  Play,
  MonitorCog
} from 'lucide-react';

interface TitleScreenProps {
  onStartGame: (profile: PlayerProfile) => void;
}

type TitleMode = 'MAIN_MENU' | 'NAME_ENTRY' | 'LOAD_SLOTS';

const MENU_ITEMS = 4;

// 90s Console RPG on-screen keypad grid
const KEYPAD_ROWS = [
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
  ['K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'],
  ['U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '2', '3'],
  ['4', '5', '6', '7', '8', '9', 'SPACE', 'DEL', 'END'],
];

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStartGame }) => {
  const [mode, setMode] = useState<TitleMode>('MAIN_MENU');
  
  // Menu navigation index: 0 = NEW GAME, 1 = CONTINUE, 2 = LOAD GAME, 3 = GRAPHICS
  const [menuIndex, setMenuIndex] = useState<number>(0);
  const [graphicsMode, setGraphicsModeState] = useState<GraphicsMode>(getGraphicsMode);

  // Keypad state for character creation
  const [knightName, setKnightName] = useState<string>('KETTLEBURNE');
  const [keypadRow, setKeypadRow] = useState<number>(0);
  const [keypadCol, setKeypadCol] = useState<number>(0);
  const [targetNewSlotId, setTargetNewSlotId] = useState<string>('slot_1');

  // Load slots state
  const [slots, setSlots] = useState<(PlayerProfile | null)[]>(() => profileManager.getAllSlots());
  const [slotIndex, setSlotIndex] = useState<number>(0);
  const [slotSubFocus, setSlotSubFocus] = useState<'SLOT' | 'PURGE'>('SLOT');
  const [purgeConfirmSlot, setPurgeConfirmSlot] = useState<string | null>(null);

  const hasActiveSave = useMemo(() => profileManager.hasSavedProfile(), [slots]);

  // Refresh slots on mount
  useEffect(() => {
    setSlots(profileManager.getAllSlots());
  }, []);

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------

  const handleStartNewGameMode = useCallback((slotId?: string) => {
    const chosenSlot = slotId || profileManager.getFirstAvailableSlotId();
    setTargetNewSlotId(chosenSlot);
    setKnightName('KETTLEBURNE');
    setKeypadRow(0);
    setKeypadCol(0);
    setMode('NAME_ENTRY');
    audioManager.play('ui_select');
  }, []);

  const handleContinueGame = useCallback(() => {
    const active = profileManager.getActiveProfile();
    if (active) {
      audioManager.play('ui_select');
      onStartGame(active);
    } else {
      audioManager.play('hurt');
    }
  }, [onStartGame]);

  const handleConfirmKnightName = useCallback(() => {
    const finalName = knightName.trim().toUpperCase() || DEFAULT_KNIGHT_NAME;
    const newProfile = profileManager.createProfile(targetNewSlotId, finalName);
    audioManager.play('level_up');
    onStartGame(newProfile);
  }, [knightName, targetNewSlotId, onStartGame]);

  const handleSelectSlotToLoad = useCallback((profile: PlayerProfile) => {
    const loaded = profileManager.loadProfile(profile.id);
    if (loaded) {
      audioManager.play('ui_select');
      onStartGame(loaded);
    }
  }, [onStartGame]);

  const toggleGraphicsMode = useCallback(() => {
    const next: GraphicsMode = getGraphicsMode() === 'QUALITY' ? 'PERFORMANCE' : 'QUALITY';
    setGraphicsMode(next);
    setGraphicsModeState(next);
    audioManager.play('ui_select');
  }, []);

  const handleDeleteSlot = useCallback((slotId: string) => {
    profileManager.deleteProfile(slotId);
    setSlots(profileManager.getAllSlots());
    setPurgeConfirmSlot(null);
    audioManager.play('defeat');
  }, []);

  // Physical keyboard support for character naming
  useEffect(() => {
    if (mode !== 'NAME_ENTRY') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept function keys or navigation keys
      if (e.key === 'Backspace') {
        e.preventDefault();
        setKnightName((prev) => prev.slice(0, -1));
        audioManager.play('ui_move');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirmKnightName();
      } else if (e.key.length === 1 && /[a-zA-Z0-9 ]/.test(e.key)) {
        if (knightName.length < 14) {
          setKnightName((prev) => (prev + e.key.toUpperCase()).slice(0, 14));
          audioManager.play('ui_move');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, knightName, handleConfirmKnightName]);

  // ---------------------------------------------------------------------------
  // D-Pad Remote Navigation
  // ---------------------------------------------------------------------------
  useTVRemote({
    onUp: () => {
      if (mode === 'MAIN_MENU') {
        setMenuIndex((prev) => {
          const next = prev === 0 ? MENU_ITEMS - 1 : prev - 1;
          audioManager.play('ui_move');
          return next;
        });
      } else if (mode === 'NAME_ENTRY') {
        setKeypadRow((r) => {
          const next = r === 0 ? KEYPAD_ROWS.length - 1 : r - 1;
          const maxCols = KEYPAD_ROWS[next].length;
          setKeypadCol((c) => Math.min(c, maxCols - 1));
          audioManager.play('ui_move');
          return next;
        });
      } else if (mode === 'LOAD_SLOTS') {
        setSlotIndex((prev) => {
          const next = Math.max(0, prev - 1);
          setSlotSubFocus('SLOT');
          setPurgeConfirmSlot(null);
          audioManager.play('ui_move');
          return next;
        });
      }
    },
    onDown: () => {
      if (mode === 'MAIN_MENU') {
        setMenuIndex((prev) => {
          const next = prev === MENU_ITEMS - 1 ? 0 : prev + 1;
          audioManager.play('ui_move');
          return next;
        });
      } else if (mode === 'NAME_ENTRY') {
        setKeypadRow((r) => {
          const next = (r + 1) % KEYPAD_ROWS.length;
          const maxCols = KEYPAD_ROWS[next].length;
          setKeypadCol((c) => Math.min(c, maxCols - 1));
          audioManager.play('ui_move');
          return next;
        });
      } else if (mode === 'LOAD_SLOTS') {
        setSlotIndex((prev) => {
          const next = Math.min(TOTAL_SAVE_SLOTS - 1, prev + 1);
          setSlotSubFocus('SLOT');
          setPurgeConfirmSlot(null);
          audioManager.play('ui_move');
          return next;
        });
      }
    },
    onLeft: () => {
      if (mode === 'MAIN_MENU' && menuIndex === 3) {
        toggleGraphicsMode();
      } else if (mode === 'NAME_ENTRY') {
        setKeypadCol((c) => {
          const cols = KEYPAD_ROWS[keypadRow].length;
          const next = c === 0 ? cols - 1 : c - 1;
          audioManager.play('ui_move');
          return next;
        });
      } else if (mode === 'LOAD_SLOTS') {
        if (slotSubFocus === 'PURGE') {
          setSlotSubFocus('SLOT');
          setPurgeConfirmSlot(null);
          audioManager.play('ui_move');
        }
      }
    },
    onRight: () => {
      if (mode === 'MAIN_MENU' && menuIndex === 3) {
        toggleGraphicsMode();
      } else if (mode === 'NAME_ENTRY') {
        setKeypadCol((c) => {
          const cols = KEYPAD_ROWS[keypadRow].length;
          const next = (c + 1) % cols;
          audioManager.play('ui_move');
          return next;
        });
      } else if (mode === 'LOAD_SLOTS') {
        const currentSlot = slots[slotIndex];
        if (currentSlot && slotSubFocus === 'SLOT') {
          setSlotSubFocus('PURGE');
          audioManager.play('ui_move');
        }
      }
    },
    onSelect: () => {
      if (mode === 'MAIN_MENU') {
        if (menuIndex === 0) {
          handleStartNewGameMode();
        } else if (menuIndex === 1) {
          if (hasActiveSave) {
            handleContinueGame();
          } else {
            audioManager.play('hurt');
          }
        } else if (menuIndex === 2) {
          setMode('LOAD_SLOTS');
          audioManager.play('ui_select');
        } else if (menuIndex === 3) {
          toggleGraphicsMode();
        }
      } else if (mode === 'NAME_ENTRY') {
        const key = KEYPAD_ROWS[keypadRow][keypadCol];
        if (key === 'DEL') {
          setKnightName((prev) => prev.slice(0, -1));
          audioManager.play('ui_move');
        } else if (key === 'SPACE') {
          if (knightName.length < 14) {
            setKnightName((prev) => prev + ' ');
            audioManager.play('ui_move');
          }
        } else if (key === 'END') {
          handleConfirmKnightName();
        } else {
          if (knightName.length < 14) {
            setKnightName((prev) => prev + key);
            audioManager.play('ui_move');
          }
        }
      } else if (mode === 'LOAD_SLOTS') {
        const currentSlot = slots[slotIndex];
        if (slotSubFocus === 'PURGE' && currentSlot) {
          if (purgeConfirmSlot === currentSlot.id) {
            handleDeleteSlot(currentSlot.id);
            setPurgeConfirmSlot(null);
            setSlotSubFocus('SLOT');
          } else {
            setPurgeConfirmSlot(currentSlot.id);
            audioManager.play('ui_move');
          }
        } else {
          if (currentSlot) {
            handleSelectSlotToLoad(currentSlot);
          } else {
            handleStartNewGameMode(`slot_${slotIndex + 1}`);
          }
        }
      }
    },
    onBack: () => {
      if (mode === 'LOAD_SLOTS') {
        if (purgeConfirmSlot) {
          setPurgeConfirmSlot(null);
          audioManager.play('ui_move');
        } else if (slotSubFocus === 'PURGE') {
          setSlotSubFocus('SLOT');
          audioManager.play('ui_move');
        } else {
          setMode('MAIN_MENU');
          setPurgeConfirmSlot(null);
          setSlotSubFocus('SLOT');
          audioManager.play('ui_select');
        }
      } else if (mode === 'NAME_ENTRY') {
        setMode('MAIN_MENU');
        setPurgeConfirmSlot(null);
        audioManager.play('ui_select');
      } else {
        exitApp();
      }
    },
    onDemoSwing: () => {
      // Space / demo swing triggers the currently focused menu button
      if (mode === 'MAIN_MENU') {
        if (menuIndex === 0) handleStartNewGameMode();
        else if (menuIndex === 1 && hasActiveSave) handleContinueGame();
        else if (menuIndex === 2) setMode('LOAD_SLOTS');
        else if (menuIndex === 3) toggleGraphicsMode();
      }
    },
  });

  return (
    <div className="relative z-20 w-full h-full flex flex-col items-center justify-between p-6 pointer-events-auto select-none">
      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TOP GOTHIC BANNER & LORE */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <header className="flex flex-col items-center text-center mt-2 space-y-1">
        <div className="flex items-center gap-2 px-3 py-1 bg-[#1A1926]/90 border-2 border-[#2E2B44] rounded text-[8px] font-pixel text-[#A7A9BE] tracking-widest uppercase">
          <Flame className="w-3 h-3 text-[#F4B41A] animate-pulse" />
          <span>CHRONICLES OF THE IRON SANCTUM • 1996</span>
          <Flame className="w-3 h-3 text-[#F4B41A] animate-pulse" />
        </div>
      </header>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* CENTER VIEW: MAIN MENU, NAME ENTRY KEYPAD, OR TOMB OF SLOTS */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <main className="flex flex-col items-center justify-center my-auto w-full max-w-xl">
        {mode === 'MAIN_MENU' && (
          <div className="flex flex-col items-center text-center space-y-6 w-full animate-in fade-in duration-300">
            {/* 90's Embossed Game Title */}
            <div className="space-y-3">
              <div className="inline-flex items-center justify-center p-3 bg-[#1A1926] border-4 border-[#F4B41A] rounded shadow-pixel-box-gold">
                <Swords className="w-10 h-10 text-[#F4B41A]" />
              </div>
              <h1 className="text-3xl md:text-4xl font-pixel text-[#F4B41A] tracking-wider drop-shadow-[0_4px_0_#0F0E17]">
                KETTLEBELL KNIGHT
              </h1>
              <p className="font-pixel text-[9px] text-[#38B6FF] tracking-widest uppercase">
                32-BIT HEAVY IRON FITNESS RPG
              </p>
            </div>

            {/* Main Menu Options */}
            <div className="flex flex-col gap-3.5 w-full max-w-xs pt-2">
              {/* 1. NEW GAME */}
              <button
                type="button"
                onClick={() => {
                  setMenuIndex(0);
                  handleStartNewGameMode();
                }}
                className={`p-3.5 font-pixel text-xs tracking-wider flex items-center justify-between border-4 transition-all duration-150 ${
                  menuIndex === 0
                    ? 'bg-[#F4B41A] text-[#0F0E17] border-white shadow-pixel-box scale-105'
                    : 'bg-[#1A1926]/95 text-[#F4B41A] border-[#2E2B44] hover:border-[#F4B41A]/70 shadow-pixel-box'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Play className={`w-3.5 h-3.5 ${menuIndex === 0 ? 'fill-[#0F0E17]' : 'text-[#F4B41A]'}`} />
                  NEW GAME
                </span>
                {menuIndex === 0 && <span className="text-[10px] animate-pulse">▶</span>}
              </button>

              {/* 2. CONTINUE */}
              <button
                type="button"
                disabled={!hasActiveSave}
                onClick={() => {
                  setMenuIndex(1);
                  handleContinueGame();
                }}
                className={`p-3.5 font-pixel text-xs tracking-wider flex items-center justify-between border-4 transition-all duration-150 ${
                  !hasActiveSave
                    ? 'bg-[#0F0E17]/80 text-[#555] border-[#252333] cursor-not-allowed opacity-60'
                    : menuIndex === 1
                    ? 'bg-[#38B6FF] text-[#0F0E17] border-white shadow-pixel-box scale-105'
                    : 'bg-[#1A1926]/95 text-[#38B6FF] border-[#2E2B44] hover:border-[#38B6FF]/70 shadow-pixel-box'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Award className="w-3.5 h-3.5" />
                  CONTINUE
                </span>
                {!hasActiveSave ? (
                  <span className="text-[7px] font-mono text-[#FF3366] bg-[#FF3366]/10 px-1.5 py-0.5 border border-[#FF3366]/40">
                    NO SOUL BOUND
                  </span>
                ) : menuIndex === 1 ? (
                  <span className="text-[10px] animate-pulse">▶</span>
                ) : null}
              </button>

              {/* 3. LOAD GAME */}
              <button
                type="button"
                onClick={() => {
                  setMenuIndex(2);
                  setMode('LOAD_SLOTS');
                  audioManager.play('ui_select');
                }}
                className={`p-3.5 font-pixel text-xs tracking-wider flex items-center justify-between border-4 transition-all duration-150 ${
                  menuIndex === 2
                    ? 'bg-[#00EB88] text-[#0F0E17] border-white shadow-pixel-box scale-105'
                    : 'bg-[#1A1926]/95 text-[#00EB88] border-[#2E2B44] hover:border-[#00EB88]/70 shadow-pixel-box'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />
                  LOAD GAME
                </span>
                {menuIndex === 2 && <span className="text-[10px] animate-pulse">▶</span>}
              </button>

              {/* 4. GRAPHICS: Select or Left/Right toggles QUALITY / PERFORMANCE */}
              <button
                type="button"
                onClick={() => {
                  setMenuIndex(3);
                  toggleGraphicsMode();
                }}
                className={`p-3.5 font-pixel text-xs tracking-wider flex items-center justify-between border-4 transition-all duration-150 ${
                  menuIndex === 3
                    ? 'bg-[#A7A9BE] text-[#0F0E17] border-white shadow-pixel-box scale-105'
                    : 'bg-[#1A1926]/95 text-[#A7A9BE] border-[#2E2B44] hover:border-[#A7A9BE]/70 shadow-pixel-box'
                }`}
              >
                <span className="flex items-center gap-2">
                  <MonitorCog className="w-3.5 h-3.5" />
                  GRAPHICS
                </span>
                <span className="text-[9px]">
                  {menuIndex === 3 && '◀ '}
                  {graphicsMode === 'QUALITY' ? 'QUALITY' : 'PERFORMANCE'}
                  {menuIndex === 3 && ' ▶'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* CHARACTER CREATION: RETRO PIXEL KEYPAD */}
        {/* ────────────────────────────────────────────────────────────────── */}
        {mode === 'NAME_ENTRY' && (
          <div className="bg-[#1A1926]/98 border-4 border-[#F4B41A] p-5 rounded shadow-pixel-box-gold w-full text-center backdrop-blur-md animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-[#2E2B44]">
              <span className="font-pixel text-[9px] text-[#F4B41A] flex items-center gap-1.5">
                <Swords className="w-3 h-3 text-[#F4B41A]" />
                ENGRAVE THY KNIGHT'S NAME
              </span>
              <span className="font-mono text-[9px] text-[#A7A9BE]">
                DESTINY SLOT: {targetNewSlotId.toUpperCase()}
              </span>
            </div>

            {/* Name Input Banner */}
            <div className="bg-[#0F0E17] border-2 border-[#F4B41A] p-3 mb-4 rounded flex items-center justify-center shadow-inner">
              <span className="font-pixel text-base md:text-lg text-[#F4B41A] tracking-widest min-h-[1.5rem] flex items-center">
                {knightName || ''}
                <span className="w-2.5 h-4 bg-[#F4B41A] ml-1 animate-pulse" />
              </span>
            </div>

            {/* Keypad Grid */}
            <div className="flex flex-col gap-1.5 mb-4">
              {KEYPAD_ROWS.map((row, rIdx) => (
                <div key={rIdx} className="flex justify-center gap-1.5">
                  {row.map((k, cIdx) => {
                    const isSelected = keypadRow === rIdx && keypadCol === cIdx;
                    const isSpecial = k === 'DEL' || k === 'SPACE' || k === 'END';

                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          setKeypadRow(rIdx);
                          setKeypadCol(cIdx);
                          if (k === 'DEL') setKnightName((prev) => prev.slice(0, -1));
                          else if (k === 'SPACE') setKnightName((prev) => (prev.length < 14 ? prev + ' ' : prev));
                          else if (k === 'END') handleConfirmKnightName();
                          else setKnightName((prev) => (prev.length < 14 ? prev + k : prev));
                          audioManager.play('ui_move');
                        }}
                        className={`font-pixel text-[10px] rounded transition-all duration-100 ${
                          isSpecial ? 'px-3 py-1.5' : 'w-8 h-8'
                        } ${
                          isSelected
                            ? 'bg-[#F4B41A] text-[#0F0E17] border-2 border-white scale-110 shadow-pixel-box'
                            : isSpecial
                            ? 'bg-[#2E2B44] text-[#A7A9BE] border border-[#3E3B5E] hover:text-white'
                            : 'bg-[#0F0E17] text-white border border-[#2E2B44] hover:border-[#F4B41A]'
                        }`}
                      >
                        {k === 'END' ? 'CONFIRM' : k}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Action Bar */}
            <div className="flex justify-between items-center pt-2 border-t border-[#2E2B44]">
              <button
                type="button"
                onClick={() => {
                  setMode('MAIN_MENU');
                  audioManager.play('ui_select');
                }}
                className="bg-[#2E2B44] hover:bg-[#3E3B5E] text-white font-pixel text-[9px] px-3 py-2 border border-black flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                [ESC] CANCEL
              </button>

              <button
                type="button"
                onClick={handleConfirmKnightName}
                className="bg-[#F4B41A] hover:bg-[#ffc636] text-[#0F0E17] font-pixel text-[9px] px-4 py-2 border border-black flex items-center gap-1 shadow-pixel-box font-bold"
              >
                <Check className="w-3.5 h-3.5" />
                START JOURNEY [ENTER]
              </button>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* TOMB OF CHRONICLES: 3 SAVE SLOTS */}
        {/* ────────────────────────────────────────────────────────────────── */}
        {mode === 'LOAD_SLOTS' && (
          <div className="bg-[#1A1926]/98 border-4 border-[#00EB88] p-5 rounded shadow-pixel-box w-full backdrop-blur-md animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-[#2E2B44]">
              <span className="font-pixel text-[10px] text-[#00EB88] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#00EB88]" />
                TOMB OF CHRONICLES — SAVE SLOTS
              </span>
              <span className="font-mono text-[9px] text-[#A7A9BE]">
                SELECT A KNIGHT'S RECORD
              </span>
            </div>

            {/* Slots list */}
            <div className="flex flex-col gap-3 mb-4">
              {slots.map((slot, idx) => {
                const isSelected = slotIndex === idx;
                const slotLabel = `SLOT ${idx === 0 ? 'I' : idx === 1 ? 'II' : 'III'}`;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSlotIndex(idx);
                      if (slot) handleSelectSlotToLoad(slot);
                      else handleStartNewGameMode(`slot_${idx + 1}`);
                    }}
                    className={`p-3 border-2 rounded transition-all cursor-pointer ${
                      isSelected
                        ? slotSubFocus === 'PURGE'
                          ? 'border-[#00EB88]/60 bg-[#22332A]/50 ring-1 ring-[#00EB88]/30 shadow-pixel-box'
                          : 'border-[#00EB88] bg-[#22332A]/90 ring-2 ring-[#00EB88]/40 shadow-pixel-box'
                        : 'border-[#2E2B44] bg-[#0F0E17]/90 hover:border-[#00EB88]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`font-pixel text-[9px] px-1.5 py-0.5 border ${
                          isSelected ? 'bg-[#00EB88] text-[#0F0E17] border-white' : 'bg-[#2E2B44] text-[#A7A9BE] border-[#3E3B5E]'
                        }`}>
                          {slotLabel}
                        </span>
                        {slot ? (
                          <div>
                            <span className="font-pixel text-xs text-white block">
                              {slot.name}
                            </span>
                            <span className="text-[9px] font-mono text-[#00EB88]">
                              LVL {slot.level} {slot.title}
                            </span>
                          </div>
                        ) : (
                          <span className="font-pixel text-[10px] text-[#666]">
                            EMPTY TOMB — NO RECORD FOUND
                          </span>
                        )}
                      </div>

                      {/* Slot Details or New Game Badge */}
                      {slot ? (
                        <div className="flex items-center gap-4 text-right">
                          <div className="text-[9px] font-mono text-[#A7A9BE]">
                            <div>🪙 {slot.gold} GP • ⚡ {slot.repsCompleted} REPS</div>
                            <div className="text-[8px] text-[#777]">
                              {new Date(slot.lastSavedAt).toLocaleDateString()}
                            </div>
                          </div>

                          {/* Purge / Delete Button */}
                          {purgeConfirmSlot === slot.id ? (
                            <div className={`flex items-center gap-1 ${isSelected && slotSubFocus === 'PURGE' ? 'ring-2 ring-[#FF3366] p-0.5 rounded' : ''}`} onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => {
                                  handleDeleteSlot(slot.id);
                                  setPurgeConfirmSlot(null);
                                  setSlotSubFocus('SLOT');
                                }}
                                className="bg-[#FF3366] text-white font-pixel text-[8px] px-2 py-1 border border-black animate-pulse"
                              >
                                PURGE!
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPurgeConfirmSlot(null);
                                  setSlotSubFocus('SLOT');
                                }}
                                className="bg-[#2E2B44] text-white font-pixel text-[8px] px-1.5 py-1 border border-black"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPurgeConfirmSlot(slot.id);
                                setSlotSubFocus('PURGE');
                                audioManager.play('ui_move');
                              }}
                              className={`p-1 border rounded transition-all ${
                                isSelected && slotSubFocus === 'PURGE'
                                  ? 'border-[#FF3366] bg-[#FF3366]/30 text-white ring-2 ring-[#FF3366] scale-110 shadow-pixel-box'
                                  : 'text-[#FF3366] hover:text-white border-transparent hover:border-[#FF3366]'
                              }`}
                              title="Delete Save (D-Pad Right to focus)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="font-pixel text-[8px] text-[#00EB88] bg-[#00EB88]/10 border border-[#00EB88] px-2 py-1">
                          + NEW SOUL
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Back button */}
            <div className="flex justify-between items-center pt-2 border-t border-[#2E2B44]">
              <button
                type="button"
                onClick={() => {
                  setMode('MAIN_MENU');
                  setPurgeConfirmSlot(null);
                  setSlotSubFocus('SLOT');
                  audioManager.play('ui_select');
                }}
                className="bg-[#2E2B44] hover:bg-[#3E3B5E] text-white font-pixel text-[9px] px-3 py-2 border border-black flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                [ESC] BACK TO TITLE
              </button>

              <span className="font-mono text-[9px] text-[#A7A9BE]">
                {purgeConfirmSlot
                  ? '[ENTER] CONFIRM PURGE • [ESC / ◄] CANCEL'
                  : slotSubFocus === 'PURGE'
                  ? '[ENTER] ARM PURGE • [◄] RETURN TO TOMB'
                  : '[▲ / ▼] SELECT • [ENTER] AWAKEN • [►] DELETE SAVE'}
              </span>
            </div>
          </div>
        )}
      </main>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* BOTTOM CONTROLS HINT BAR */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <footer className="border-t-4 border-[#2E2B44] bg-[#1A1926]/90 px-4 py-2.5 rounded shadow-pixel-box flex items-center gap-5 whitespace-nowrap backdrop-blur-sm">
        <div className="flex items-center gap-4">
          {[
            ['D-PAD', 'MOVE'],
            ['ENTER', 'CONFIRM'],
            ['ESC / BACK', 'BACK'],
          ].map(([key, action]) => (
            <span key={key} className="flex items-center gap-1.5 text-white font-pixel text-[8px]">
              <span className="bg-[#2E2B44] px-1.5 py-0.5 border border-[#F4B41A] text-[#F4B41A]">{key}</span>
              <span>{action}</span>
            </span>
          ))}
        </div>

        <div className="border-l-2 border-[#2E2B44] pl-5 text-[#A7A9BE] font-pixel text-[7px] tracking-wider">
          FIRE TV • 10-FOOT UI
        </div>
      </footer>
    </div>
  );
};
