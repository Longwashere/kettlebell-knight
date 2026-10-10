import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '../engine/GameEngine';
import { useTVRemote } from '../hooks/useTVRemote';
import { networkManager, NetworkConnectionState } from '../../shared/NetworkManager';
import { HubMenu, HUB_NODES } from './HubMenu';
import { BlacksmithShop, SHOP_ITEMS } from './BlacksmithShop';
import { QRCodeModal } from './QRCodeModal';
import { EquipmentItem, HubLocation, RepTelemetry } from '../../types/game';
import { audioManager } from '../../shared/AudioManager';
import { 
  Tv, 
  Smartphone, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Swords, 
  Flame, 
  Award, 
  Activity, 
  Heart, 
  Shield 
} from 'lucide-react';

export const GameScreen: React.FC = () => {
  // GameEngine Reference - Strictly isolated from React re-renders!
  const engineRef = useRef<GameEngine | null>(null);
  const pixiContainerRef = useRef<HTMLDivElement | null>(null);

  // TV UI Views: 'HUB' | 'BLACKSMITH' | 'COMBAT' | 'ALCHEMIST' | 'SANCTUARY'
  const [currentView, setCurrentView] = useState<'HUB' | 'BLACKSMITH' | 'COMBAT' | 'ALCHEMIST' | 'SANCTUARY'>('HUB');

  // Navigation indices
  const [hubIndex, setHubIndex] = useState<number>(1); // Default to Blacksmith
  const [shopIndex, setShopIndex] = useState<number>(0);

  // Networking state
  const [roomId, setRoomId] = useState<string>('');
  const [netState, setNetState] = useState<NetworkConnectionState>('INITIALIZING');
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);

  // RPG Progression state
  const [playerGold, setPlayerGold] = useState<number>(650);
  const [equippedItems, setEquippedItems] = useState<Set<string>>(new Set(['iron_kettlebell']));
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // High-level workout session counters (updated periodically or on reps)
  const [sessionReps, setSessionReps] = useState<number>(0);
  const [highestPower, setHighestPower] = useState<number>(0);

  // 1. Initialize PixiJS GameEngine strictly inside container div
  useEffect(() => {
    let engine: GameEngine | null = null;

    if (pixiContainerRef.current) {
      engine = new GameEngine(pixiContainerRef.current);
      engineRef.current = engine;
      engine.init().catch((err) => {
        console.error('[GameScreen] Pixi engine init error:', err);
      });
    }

    return () => {
      if (engine) {
        engine.destroy();
      }
      engineRef.current = null;
    };
  }, []);

  // 2. Initialize TV Host WebRTC Room via PeerJS
  useEffect(() => {
    let unsubState: (() => void) | undefined;
    let unsubTelemetry: (() => void) | undefined;

    networkManager.initHost().then((generatedRoom) => {
      setRoomId(generatedRoom);
    }).catch((err) => {
      console.error('[GameScreen] Network host error:', err);
    });

    unsubState = networkManager.onStateChange((state) => {
      setNetState(state);
    });

    /**
     * CRITICAL REQUIREMENT:
     * "Zero React Layout Thrashing: The PixiJS game loop must be strictly isolated.
     * High-frequency telemetry (rep coordinates, power) must bypass React useState.
     * The /tv component must hold a useRef<GameEngine> and pass WebRTC payloads directly to
     * engineRef.current.onRepCompleted()."
     */
    unsubTelemetry = networkManager.onTelemetry((telemetry: RepTelemetry) => {
      if (telemetry.event === 'REP_TRIGGER') {
        // Direct zero-overhead pass-through to PixiJS WebGL loop
        if (engineRef.current) {
          engineRef.current.onRepCompleted(telemetry.power, telemetry.form);
        }

        // Lightweight stats increment
        setSessionReps((prev) => prev + 1);
        setHighestPower((prev) => Math.max(prev, telemetry.power));
        setPlayerGold((prev) => prev + Math.round(telemetry.power * 0.5));
      }
    });

    return () => {
      if (unsubState) unsubState();
      if (unsubTelemetry) unsubTelemetry();
      networkManager.cleanup();
    };
  }, []);

  // 3. Blacksmith Equipment Preview Callback
  const handlePreviewShopItem = useCallback((item: EquipmentItem) => {
    if (engineRef.current) {
      engineRef.current.previewEquipment(item.slot, item.attachmentId);
    }
  }, []);

  // Equip item
  const handleEquipShopItem = (item: EquipmentItem) => {
    if (playerGold >= item.price || equippedItems.has(item.id)) {
      if (!equippedItems.has(item.id) && item.price > 0) {
        setPlayerGold((prev) => prev - item.price);
      }
      setEquippedItems((prev) => {
        const next = new Set(prev);
        // Replace items in same slot
        SHOP_ITEMS.forEach((si) => {
          if (si.slot === item.slot) next.delete(si.id);
        });
        next.add(item.id);
        return next;
      });
      handlePreviewShopItem(item);
      audioManager.play('equip');
    }
  };

  /**
   * 4. CRITICAL REQUIREMENT:
   * "Fire TV D-Pad Input: The React overlay must use a custom hook useTVRemote() to handle
   * global spatial navigation using keycodes: 13 (Enter/Select), 37-40 (Arrows), 4 (Fire OS Back),
   * and 27 (Vega OS Back / Escape). Include keyCode: 179 (Play/Pause) or Spacebar as a headless Demo Mode swing trigger."
   */
  useTVRemote({
    onUp: () => {
      if (currentView === 'BLACKSMITH') {
        setShopIndex((prev) => {
          const next = Math.max(0, prev - 2);
          handlePreviewShopItem(SHOP_ITEMS[next]);
          return next;
        });
      }
    },
    onDown: () => {
      if (currentView === 'BLACKSMITH') {
        setShopIndex((prev) => {
          const next = Math.min(SHOP_ITEMS.length - 1, prev + 2);
          handlePreviewShopItem(SHOP_ITEMS[next]);
          return next;
        });
      }
    },
    onLeft: () => {
      if (currentView === 'HUB') {
        setHubIndex((prev) => Math.max(0, prev - 1));
      } else if (currentView === 'BLACKSMITH') {
        setShopIndex((prev) => {
          const next = Math.max(0, prev - 1);
          handlePreviewShopItem(SHOP_ITEMS[next]);
          return next;
        });
      }
    },
    onRight: () => {
      if (currentView === 'HUB') {
        setHubIndex((prev) => Math.min(HUB_NODES.length - 1, prev + 1));
      } else if (currentView === 'BLACKSMITH') {
        setShopIndex((prev) => {
          const next = Math.min(SHOP_ITEMS.length - 1, prev + 1);
          handlePreviewShopItem(SHOP_ITEMS[next]);
          return next;
        });
      }
    },
    onSelect: () => {
      if (isQrModalOpen) {
        setIsQrModalOpen(false);
        return;
      }

      if (currentView === 'HUB') {
        const selectedNode = HUB_NODES[hubIndex].id;
        if (selectedNode === 'BLACKSMITH') {
          setCurrentView('BLACKSMITH');
          setShopIndex(0);
          handlePreviewShopItem(SHOP_ITEMS[0]);
        } else if (selectedNode === 'GATE') {
          setCurrentView('COMBAT');
        } else if (selectedNode === 'ALCHEMIST') {
          setCurrentView('ALCHEMIST');
        } else if (selectedNode === 'SANCTUARY') {
          setCurrentView('SANCTUARY');
        }
      } else if (currentView === 'BLACKSMITH') {
        handleEquipShopItem(SHOP_ITEMS[shopIndex]);
      } else {
        // Return to Hub
        setCurrentView('HUB');
      }
    },
    onBack: () => {
      if (isQrModalOpen) {
        setIsQrModalOpen(false);
      } else if (currentView !== 'HUB') {
        setCurrentView('HUB');
      }
    },
    // Headless Demo Swing Trigger: KeyCode 179 (Play/Pause) or Spacebar
    onDemoSwing: () => {
      const demoPower = 85 + Math.floor(Math.random() * 30);
      const demoForm = Number((0.95 + Math.random() * 0.05).toFixed(2));

      if (engineRef.current) {
        engineRef.current.onRepCompleted(demoPower, demoForm);
      }

      setSessionReps((prev) => prev + 1);
      setHighestPower((prev) => Math.max(prev, demoPower));
      setPlayerGold((prev) => prev + Math.round(demoPower * 0.5));
    },
  });

  const toggleMute = () => {
    const muted = audioManager.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="relative w-screen h-screen bg-[#0F0E17] text-white overflow-hidden select-none crt-overlay">
      {/* 
        CRITICAL REQUIREMENT:
        Base PixiJS WebGL canvas container with strict 426x240 pixel resolution and CSS pixel scaling
      */}
      <div
        id="pixi-container"
        ref={pixiContainerRef}
        className="absolute inset-0 z-0 pointer-events-none"
      />

      {/* 
        CRITICAL REQUIREMENT:
        React DOM Overlay (z-index: 10) for 10-foot Fire TV UI
      */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between p-6 pointer-events-auto">
        {/* Top TV HUD Header */}
        <header className="flex items-center justify-between">
          {/* RPG Knight Profile & Health/XP */}
          <div className="flex items-center space-x-4 bg-[#1A1926]/90 border-4 border-[#2E2B44] px-4 py-2.5 rounded shadow-pixel-box backdrop-blur-sm">
            <div className="w-10 h-10 rounded bg-[#F4B41A] text-[#0F0E17] flex items-center justify-center font-bold text-xl font-pixel shadow-pixel-box">
              ⚔
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-pixel text-xs text-[#F4B41A]">SIR KETTLEBURNE</span>
                <span className="bg-[#38B6FF]/20 text-[#38B6FF] border border-[#38B6FF] text-[9px] font-pixel px-1.5">
                  LVL 12
                </span>
              </div>
              {/* HP & Stamina Bars */}
              <div className="flex items-center gap-3 mt-1.5">
                <div className="flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-[#FF3366] fill-[#FF3366]" />
                  <div className="w-24 h-2.5 bg-[#0F0E17] border border-[#2E2B44] overflow-hidden">
                    <div className="w-[85%] h-full bg-[#FF3366]" />
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-[#F4B41A] fill-[#F4B41A]" />
                  <div className="w-24 h-2.5 bg-[#0F0E17] border border-[#2E2B44] overflow-hidden">
                    <div className="w-[100%] h-full bg-[#F4B41A]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Session Workout Counters & Pairing Pill */}
          <div className="flex items-center space-x-3">
            {/* Live Rep Counter Pill */}
            <div className="bg-[#1A1926]/90 border-4 border-[#F4B41A] px-4 py-2 rounded shadow-pixel-box flex items-center gap-3">
              <Activity className="w-5 h-5 text-[#F4B41A] animate-pulse" />
              <div>
                <span className="text-[9px] font-pixel text-[#A7A9BE] block">SESSION REPS</span>
                <span className="text-sm font-pixel text-[#F4B41A]">{sessionReps}</span>
              </div>
            </div>

            {/* Max Power Pill */}
            <div className="bg-[#1A1926]/90 border-4 border-[#38B6FF] px-4 py-2 rounded shadow-pixel-box flex items-center gap-3">
              <Award className="w-5 h-5 text-[#38B6FF]" />
              <div>
                <span className="text-[9px] font-pixel text-[#A7A9BE] block">MAX POWER</span>
                <span className="text-sm font-pixel text-[#38B6FF]">{highestPower || '--'}</span>
              </div>
            </div>

            {/* WebRTC Mobile Pairing Pill Button */}
            <button
              onClick={() => setIsQrModalOpen(true)}
              className="bg-[#1A1926]/90 hover:bg-[#242138] border-4 border-[#38B6FF] px-4 py-2 rounded shadow-pixel-box flex items-center gap-2.5 transition-transform active:scale-95"
            >
              <Smartphone className="w-5 h-5 text-[#38B6FF]" />
              <div className="text-left">
                <span className="text-[9px] font-pixel text-[#A7A9BE] block">MOBILE PAIR</span>
                <span className="text-[11px] font-pixel text-[#38B6FF]">
                  {netState === 'CONNECTED' ? '● LINKED' : roomId || 'CONNECT'}
                </span>
              </div>
            </button>

            {/* Mute toggle */}
            <button
              onClick={toggleMute}
              className="p-3 bg-[#1A1926]/90 border-4 border-[#2E2B44] hover:border-[#F4B41A] text-white shadow-pixel-box"
              title="Toggle Audio"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-[#FF3366]" /> : <Volume2 className="w-4 h-4 text-[#00EB88]" />}
            </button>
          </div>
        </header>

        {/* Center Active View */}
        <main className="my-auto flex items-center justify-center">
          {currentView === 'HUB' && (
            <HubMenu
              selectedIndex={hubIndex}
              onSelectNode={(node) => {
                if (node === 'BLACKSMITH') {
                  setCurrentView('BLACKSMITH');
                  setShopIndex(0);
                  handlePreviewShopItem(SHOP_ITEMS[0]);
                } else if (node === 'GATE') {
                  setCurrentView('COMBAT');
                } else if (node === 'ALCHEMIST') {
                  setCurrentView('ALCHEMIST');
                } else if (node === 'SANCTUARY') {
                  setCurrentView('SANCTUARY');
                }
              }}
              onHoverNode={(idx) => setHubIndex(idx)}
            />
          )}

          {currentView === 'BLACKSMITH' && (
            <BlacksmithShop
              selectedIndex={shopIndex}
              onSelectItem={(item) => handleEquipShopItem(item)}
              onHoverItem={(item) => {
                setShopIndex(SHOP_ITEMS.findIndex((i) => i.id === item.id));
                handlePreviewShopItem(item);
              }}
              onBack={() => setCurrentView('HUB')}
              playerGold={playerGold}
              equippedIds={equippedItems}
            />
          )}

          {currentView === 'COMBAT' && (
            <div className="bg-[#1A1926]/95 border-4 border-[#FF3366] p-6 max-w-xl w-full text-center rounded shadow-pixel-box backdrop-blur-md">
              <div className="w-12 h-12 mx-auto bg-[#FF3366]/20 border-2 border-[#FF3366] flex items-center justify-center rounded-full mb-3">
                <Swords className="w-6 h-6 text-[#FF3366]" />
              </div>
              <h2 className="text-sm font-pixel text-[#FF3366] mb-1">DUNGEON BATTLE ACTIVE</h2>
              <p className="text-xs text-[#A7A9BE] font-mono mb-4">
                Execute explosive kettlebell swings! High-power lockout hits damage the straw dummy target.
              </p>

              <div className="bg-[#0F0E17] border-2 border-[#2E2B44] p-4 rounded mb-4 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[9px] font-pixel text-[#A7A9BE] block">SESSION REPS</span>
                  <span className="text-xl font-pixel text-[#F4B41A]">{sessionReps}</span>
                </div>
                <div>
                  <span className="text-[9px] font-pixel text-[#A7A9BE] block">GOLD EARNED</span>
                  <span className="text-xl font-pixel text-[#00EB88]">+{sessionReps * 45} GP</span>
                </div>
                <div>
                  <span className="text-[9px] font-pixel text-[#A7A9BE] block">TARGET</span>
                  <span className="text-xl font-pixel text-[#38B6FF]">20 REPS</span>
                </div>
              </div>

              <button
                onClick={() => setCurrentView('HUB')}
                className="bg-[#2E2B44] hover:bg-[#3E3B5E] text-white font-pixel text-[10px] py-2 px-6 border-2 border-black shadow-pixel-box"
              >
                [BACK / ESC] RETURN TO HUB
              </button>
            </div>
          )}

          {currentView === 'ALCHEMIST' && (
            <div className="bg-[#1A1926]/95 border-4 border-[#38B6FF] p-6 max-w-lg w-full text-center rounded shadow-pixel-box backdrop-blur-md">
              <h2 className="text-sm font-pixel text-[#38B6FF] mb-2">ALCHEMIST'S APOTHECARY</h2>
              <p className="text-xs text-[#A7A9BE] font-mono mb-4">
                "Drink this Electrolyte Brew before your sets to maintain hip snap velocity!"
              </p>
              <div className="bg-[#0F0E17] border-2 border-[#2E2B44] p-3 text-left space-y-2 mb-4">
                <div className="text-[11px] font-pixel text-[#F4B41A]">🧪 STAMINA DRAUGHT (50 GP)</div>
                <div className="text-[10px] text-[#A7A9BE] font-mono">Restores 50 Energy. Decreases rest time by 15%.</div>
              </div>
              <button
                onClick={() => setCurrentView('HUB')}
                className="bg-[#38B6FF] text-[#0F0E17] font-pixel text-[10px] py-2 px-6 border-2 border-black shadow-pixel-box"
              >
                [BACK / ESC] RETURN TO HUB
              </button>
            </div>
          )}

          {currentView === 'SANCTUARY' && (
            <div className="bg-[#1A1926]/95 border-4 border-[#00EB88] p-6 max-w-lg w-full text-center rounded shadow-pixel-box backdrop-blur-md">
              <h2 className="text-sm font-pixel text-[#00EB88] mb-2">SANCTUARY OF POWER</h2>
              <p className="text-xs text-[#A7A9BE] font-mono mb-4">
                Kinematic telemetry records: All swings verified via Frontal Y-Axis Delta tracking.
              </p>
              <div className="bg-[#0F0E17] border-2 border-[#2E2B44] p-4 text-left font-mono text-xs space-y-1 mb-4 text-[#A7A9BE]">
                <div>• Total Reps Completed: <span className="text-white font-bold">{sessionReps}</span></div>
                <div>• Peak Power Recorded: <span className="text-[#38B6FF] font-bold">{highestPower}</span></div>
                <div>• Kinematic State Engine: <span className="text-[#00EB88] font-bold">ACTIVE (60 FPS)</span></div>
                <div>• WebRTC RTCDataChannel: <span className="text-[#F4B41A] font-bold">RELIABLE</span></div>
              </div>
              <button
                onClick={() => setCurrentView('HUB')}
                className="bg-[#00EB88] text-[#0F0E17] font-pixel text-[10px] py-2 px-6 border-2 border-black shadow-pixel-box"
              >
                [BACK / ESC] RETURN TO HUB
              </button>
            </div>
          )}
        </main>

        {/* Bottom Fire TV Remote D-Pad Navigation Hint Bar */}
        <footer className="border-t-4 border-[#2E2B44] bg-[#1A1926]/90 p-3 rounded shadow-pixel-box flex items-center justify-between text-[10px] font-mono text-[#A7A9BE] backdrop-blur-sm">
          <div className="flex items-center space-x-4">
            <span className="flex items-center gap-1.5 text-white font-pixel text-[9px]">
              <span className="bg-[#2E2B44] px-1.5 py-0.5 border border-[#F4B41A] text-[#F4B41A]">D-PAD</span>
              <span>NAVIGATE</span>
            </span>
            <span className="flex items-center gap-1.5 text-white font-pixel text-[9px]">
              <span className="bg-[#2E2B44] px-1.5 py-0.5 border border-[#F4B41A] text-[#F4B41A]">SELECT / ENTER</span>
              <span>CONFIRM</span>
            </span>
            <span className="flex items-center gap-1.5 text-white font-pixel text-[9px]">
              <span className="bg-[#2E2B44] px-1.5 py-0.5 border border-[#F4B41A] text-[#F4B41A]">BACK / ESC</span>
              <span>BACK</span>
            </span>
          </div>

          {/* Headless Demo Mode Hint */}
          <div className="flex items-center space-x-2 text-[#F4B41A] font-pixel text-[9px]">
            <span className="bg-[#F4B41A] text-[#0F0E17] px-2 py-0.5 border border-black animate-pulse font-bold">
              SPACEBAR / PLAY-PAUSE
            </span>
            <span>DEMO SWING TRIGGER</span>
          </div>
        </footer>
      </div>

      {/* QR Code Modal for Phone Pairing */}
      <QRCodeModal
        roomId={roomId}
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        isPaired={netState === 'CONNECTED'}
      />
    </div>
  );
};
