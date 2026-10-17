import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '../engine/GameEngine';
import { useTVRemote } from '../hooks/useTVRemote';
import { networkManager, NetworkConnectionState } from '../../shared/NetworkManager';
import { discoveryManager } from '../../shared/DiscoveryManager';
import { HubMenu, HUB_NODES } from './HubMenu';
import { BlacksmithShop, SHOP_ITEMS } from './BlacksmithShop';
import { BattleScreen } from './BattleScreen';
import { TitleScreen } from './TitleScreen';
import { MapSelectScreen } from './MapSelectScreen';
import { CardCodexScreen } from './CardCodexScreen';
import { QRCodeModal } from './QRCodeModal';
import { QRCodeSVG } from 'qrcode.react';
import { EquipmentItem, HubLocation, RepTelemetry } from '../../types/game';
import { profileManager, PlayerProfile } from '../../shared/ProfileManager';
import { audioManager } from '../../shared/AudioManager';
import { registerDebug } from '../debug/agentBridge';
import { type MonsterMoveId, CARD_CATALOG, STARTER_CARD_IDS, type BattleMapId } from '../../types/battle';
import type { VfxName } from '../engine/vfx';
import { BATTLE_MAPS } from '../engine/GameEngine';
import { CAMPAIGN_MAPS } from '../../shared/expeditionEngine';
import { STAT_INFO, weaponLevelReq } from '../../shared/progression';
import { 
  Tv, 
  Smartphone, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Swords, 
  Award, 
  Activity, 
  Shield, 
  Wifi, 
  LogOut 
} from 'lucide-react';

export type TVScreenView = 'HUB' | 'BLACKSMITH' | 'COMBAT' | 'ALCHEMIST' | 'SANCTUARY' | 'TITLE' | 'MAP_SELECT';

export const GameScreen: React.FC = () => {
  // GameEngine Reference - Strictly isolated from React re-renders!
  const engineRef = useRef<GameEngine | null>(null);
  const pixiContainerRef = useRef<HTMLDivElement | null>(null);

  // TV UI Views: 'HUB' | 'BLACKSMITH' | 'COMBAT' | 'ALCHEMIST' | 'SANCTUARY' | 'TITLE' | 'MAP_SELECT'
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const urlView = searchParams?.get('view')?.toUpperCase() as TVScreenView | undefined;
  const validViews: TVScreenView[] = ['HUB', 'BLACKSMITH', 'COMBAT', 'ALCHEMIST', 'SANCTUARY', 'TITLE', 'MAP_SELECT'];
  const initialView: TVScreenView = urlView && validViews.includes(urlView)
    ? urlView
    : profileManager.hasSavedProfile()
    ? 'HUB'
    : 'TITLE';

  const [currentView, setCurrentView] = useState<TVScreenView>(initialView);
  // Read by the telemetry listener (registered once), so it can tell whether a battle is running
  const currentViewRef = useRef(currentView);
  currentViewRef.current = currentView;

  // Selected expedition state
  const [selectedExpeditionMap, setSelectedExpeditionMap] = useState<BattleMapId>('VERDANT_FOREST');
  const [selectedExpeditionLevel, setSelectedExpeditionLevel] = useState<number>(1);

  // Navigation indices
  const [hubIndex, setHubIndex] = useState<number>(1); // Default to Blacksmith
  const [shopIndex, setShopIndex] = useState<number>(0);

  // Networking state
  const [roomId, setRoomId] = useState<string>('');
  const [netState, setNetState] = useState<NetworkConnectionState>('INITIALIZING');
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);

  // RPG Progression state
  const [profile, setProfile] = useState<PlayerProfile | null>(() => profileManager.getActiveProfile());
  const [playerGold, setPlayerGold] = useState<number>(() => profileManager.getActiveProfile()?.gold ?? 150);
  const [equippedItems, setEquippedItems] = useState<Set<string>>(() => {
    const active = profileManager.getActiveProfile();
    return new Set(active?.equippedItems ? Object.values(active.equippedItems).filter(Boolean) as string[] : ['iron_kettlebell']);
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // High-level workout session counters (updated periodically or on reps)
  const [sessionReps, setSessionReps] = useState<number>(0);
  const [highestPower, setHighestPower] = useState<number>(0);
  const [isEngineReady, setIsEngineReady] = useState<boolean>(false);

  // 1. Initialize PixiJS GameEngine strictly inside container div
  useEffect(() => {
    let engine: GameEngine | null = null;

    if (pixiContainerRef.current) {
      engine = new GameEngine(pixiContainerRef.current);
      engineRef.current = engine;
      engine.init().then(() => {
        setIsEngineReady(true);
      }).catch((err) => {
        console.error('[GameScreen] Pixi engine init error:', err);
      });
    }

    return () => {
      if (engine) {
        engine.destroy();
      }
      engineRef.current = null;
      setIsEngineReady(false);
    };
  }, []);

  // 2. Initialize TV Host WebRTC Room via PeerJS
  useEffect(() => {
    let unsubState: (() => void) | undefined;
    let unsubTelemetry: (() => void) | undefined;

    networkManager.initHost().then((generatedRoom) => {
      setRoomId(generatedRoom);
      discoveryManager.startBroadcasting(generatedRoom, 'Living Room Fire TV');
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
        // Direct zero-overhead pass-through to PixiJS WebGL loop. In battle the attack animation
        // plays when a card is cast (BattleScreen), with the real damage, not on every rep.
        if (engineRef.current && currentViewRef.current !== 'COMBAT') {
          engineRef.current.onRepCompleted(
            telemetry.power, 
            telemetry.form, 
            telemetry.exercise || 'SWING', 
            telemetry.skillName
          );
        }

        // Forward to Slay the Spire battle card engine if active
        if ((window as any).__onKettlebellRepCompleted) {
          (window as any).__onKettlebellRepCompleted(
            telemetry.exercise || 'SWING',
            telemetry.power,
            telemetry.form
          );
        }

        // Lightweight stats increment
        setSessionReps((prev) => {
          const next = prev + 1;
          profileManager.saveActiveProfile({
            repsCompleted: (profileManager.getActiveProfile()?.repsCompleted || 0) + 1,
          });
          return next;
        });
        setHighestPower((prev) => {
          const next = Math.max(prev, telemetry.power);
          profileManager.saveActiveProfile({ highestPower: next });
          return next;
        });
      }
    });

    return () => {
      if (unsubState) unsubState();
      if (unsubTelemetry) unsubTelemetry();
      discoveryManager.stopBroadcasting();
      networkManager.cleanup();
    };
  }, []);

  // Sync profile changes across components
  useEffect(() => {
    return profileManager.subscribe((active) => {
      setProfile(active);
      if (active) {
        setPlayerGold(active.gold);
        setEquippedItems(new Set(Object.values(active.equippedItems).filter(Boolean) as string[]));
      }
    });
  }, []);

  // Sync 90s dark fantasy background and character visibility to current view
  useEffect(() => {
    if (!isEngineReady || !engineRef.current) return;
    if (currentView === 'TITLE') {
      engineRef.current.setCharactersVisible(false);
      void engineRef.current.loadBackground(BATTLE_MAPS.OBSIDIAN_THRONE);
    } else if (currentView === 'MAP_SELECT') {
      engineRef.current.setCharactersVisible(false);
      void engineRef.current.loadBackground(BATTLE_MAPS.GUILD_HALL);
    } else if (currentView === 'HUB' || currentView === 'ALCHEMIST' || currentView === 'SANCTUARY') {
      // Town menus are pure menus: just the town backdrop, no knight or monster on stage
      engineRef.current.setCharactersVisible(false);
      void engineRef.current.loadBackground(BATTLE_MAPS.GUILD_HALL);
    } else if (currentView === 'BLACKSMITH') {
      engineRef.current.setCharactersVisible(true);
      void engineRef.current.loadBackground(BATTLE_MAPS.GUILD_HALL);
    } else {
      engineRef.current.setCharactersVisible(true);
    }
  }, [currentView, isEngineReady]);

  // Handle transition from Title Screen into the game
  const handleStartGameFromTitle = useCallback((loadedProfile: PlayerProfile) => {
    setProfile(loadedProfile);
    setPlayerGold(loadedProfile.gold);
    setEquippedItems(new Set(Object.values(loadedProfile.equippedItems).filter(Boolean) as string[]));
    setCurrentView('HUB');
    if (engineRef.current) {
      void engineRef.current.loadBackground(BATTLE_MAPS.GUILD_HALL);
    }
  }, []);

  // Handle Save & Quit / Return to Title Screen
  const handleGoToTitle = useCallback(() => {
    if (profile) {
      profileManager.saveActiveProfile({
        gold: playerGold,
        highestPower,
        repsCompleted: (profile.repsCompleted || 0) + sessionReps,
      });
    }
    setCurrentView('TITLE');
    if (engineRef.current) {
      void engineRef.current.loadBackground(BATTLE_MAPS.OBSIDIAN_THRONE);
    }
  }, [profile, playerGold, highestPower, sessionReps]);

  // Dev automation bridge (window.__kk): engine introspection + view navigation for agents/scripts
  useEffect(() => registerDebug(
    'engine',
    () => engineRef.current?.getDebugState() ?? { ready: false, loading: 0, idle: false },
    {
      textures: () => engineRef.current?.getTextureStats(),
      snapshot: () => engineRef.current?.snapshot(),
      pose: (slot: number, animation: string | null, time?: number) => engineRef.current?.debugPoseMonster(slot, animation, time),
      step: (frames: number) => engineRef.current?.debugStep(frames),
      resume: () => engineRef.current?.debugResume(),
      knightPose: (animation: string | null, time?: number) => engineRef.current?.debugPoseKnight(animation, time),
      knightWeapon: (name: string) => engineRef.current?.debugKnightWeapon(name),
      knightAnims: () => engineRef.current?.debugKnightAnimations(),
      knightMoves: () => engineRef.current?.debugKnightMoves(),
      knightMove: (id: string, targets?: number[], damage?: number) => engineRef.current?.debugKnightMove(id, targets, damage),
      monsterMove: (slot: number, move: MonsterMoveId, selfTarget?: boolean) => engineRef.current?.debugMonsterMove(slot, move, selfTarget),
      moveTrace: () => engineRef.current?.debugMoveTrace() ?? null,
      vfxPose: (name: VfxName | null, anim?: string, time?: number, size?: number) => engineRef.current?.debugVfxPose(name, anim, time, size),
      equip: (slot: string, attachment: string) => engineRef.current?.previewEquipment(slot, attachment),
      background: (key: string) =>
        engineRef.current?.loadBackground(BATTLE_MAPS[key.toUpperCase() as BattleMapId] ?? key),
    },
  ), []);

  useEffect(() => registerDebug(
    'screen',
    () => ({ view: currentView, net: netState, roomId, qrOpen: isQrModalOpen, sessionReps, highestPower, gold: playerGold }),
    {
      // Equips a SHOP_ITEMS item for free (its slot's previous item is unequipped), e.g. equip('void_bell')
      equip: (id: string) => {
        const item = SHOP_ITEMS.find((si) => si.id === id);
        if (!item) throw new Error(`Unknown item "${id}". Known: ${SHOP_ITEMS.map((si) => si.id).join(', ')}`);
        setEquippedItems((prev) => new Set([...[...prev].filter((e) => SHOP_ITEMS.find((si) => si.id === e)?.slot !== item.slot), id]));
        engineRef.current?.previewEquipment(item.slot, item.attachmentId);
      },
      goto: (view: TVScreenView) => {
        setIsQrModalOpen(false);
        setCurrentView(view);
        if (view === 'BLACKSMITH') {
          setShopIndex(0);
          engineRef.current?.previewEquipment(SHOP_ITEMS[0].slot, SHOP_ITEMS[0].attachmentId);
          engineRef.current?.loadBackground(BATTLE_MAPS.GUILD_HALL);
        } else if (view === 'TITLE') {
          engineRef.current?.loadBackground(BATTLE_MAPS.OBSIDIAN_THRONE);
        } else if (view === 'HUB' || view === 'MAP_SELECT') {
          engineRef.current?.loadBackground(BATTLE_MAPS.GUILD_HALL);
        }
      },
      expedition: (mapId: string, level?: number) => {
        const id = mapId.toUpperCase() as BattleMapId;
        setSelectedExpeditionMap(id);
        setSelectedExpeditionLevel(level ?? 1);
        setCurrentView('COMBAT');
      },
      unlockCard: (templateId: string) => profileManager.unlockCard(templateId),
      unlockAllCards: () => {
        const ids = CARD_CATALOG.map((c) => c.templateId);
        profileManager.saveActiveProfile({ unlockedCards: ids });
        return ids.length;
      },
      resetCards: () => {
        profileManager.saveActiveProfile({
          unlockedCards: [...STARTER_CARD_IDS],
          unlockStats: {
            monsterKills: {},
            exerciseReps: {},
            mapExerciseReps: {},
            perfectFormReps: {},
            highPowerReps: {},
            peakPower: {},
            totalBlockedDamage: 0,
          },
        });
        return STARTER_CARD_IDS.length;
      },
      getCardUnlocks: () => {
        const p = profileManager.getActiveProfile();
        return {
          unlocked: p?.unlockedCards || [],
          stats: p?.unlockStats,
        };
      },
    },
  ), [currentView, netState, roomId, isQrModalOpen, sessionReps, highestPower, playerGold]);

  // 3. Blacksmith Equipment Preview Callback
  const handlePreviewShopItem = useCallback((item: EquipmentItem) => {
    if (engineRef.current) {
      engineRef.current.previewEquipment(item.slot, item.attachmentId);
    }
  }, []);

  // Equip item: bought once, then owned (weapons keep their level). Weapons need the knight's level.
  const ownedItems = new Set(profile?.unlockedItems ?? ['iron_kettlebell']);
  const handleEquipShopItem = (item: EquipmentItem) => {
    if (item.slot === 'weapon' && (profile?.level ?? 1) < weaponLevelReq(item.level)) {
      audioManager.play('warn');
      return;
    }
    const owned = ownedItems.has(item.id) || equippedItems.has(item.id);
    if (playerGold >= item.price || owned) {
      if (!owned && item.price > 0) {
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
      profileManager.saveActiveProfile({
        gold: !owned ? playerGold - item.price : playerGold,
        unlockedItems: owned ? [...ownedItems] : [...ownedItems, item.id],
        equippedItems: {
          ...(profile?.equippedItems || { weapon: 'iron_kettlebell' }),
          [item.slot]: item.id,
        },
      });
    }
  };

  /**
   * 4. CRITICAL REQUIREMENT:
   * "Fire TV D-Pad Input: The React overlay must use a custom hook useTVRemote() to handle
   * global spatial navigation using keycodes: 13 (Enter/Select), 37-40 (Arrows), 4 (Fire OS Back),
   * and 27 (Vega OS Back / Escape)."
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
          setCurrentView('MAP_SELECT');
        } else if (selectedNode === 'ALCHEMIST') {
          setCurrentView('ALCHEMIST');
        } else if (selectedNode === 'SANCTUARY') {
          setCurrentView('SANCTUARY');
        } else if (selectedNode === 'TITLE') {
          handleGoToTitle();
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
  }, { enabled: currentView !== 'COMBAT' && currentView !== 'TITLE' });

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
      {currentView === 'TITLE' ? (
        <TitleScreen onStartGame={handleStartGameFromTitle} />
      ) : currentView === 'MAP_SELECT' ? (
        <MapSelectScreen
          onStartExpedition={(mapId, level) => {
            setSelectedExpeditionMap(mapId);
            setSelectedExpeditionLevel(level);
            setCurrentView('COMBAT');
          }}
          onBackToHub={() => setCurrentView('HUB')}
        />
      ) : currentView === 'COMBAT' ? (
        <BattleScreen
          engineRef={engineRef}
          isEngineReady={isEngineReady}
          weaponId={SHOP_ITEMS.find((si) => si.slot === 'weapon' && equippedItems.has(si.id))?.id ?? profile?.equippedItems?.weapon ?? 'iron_kettlebell'}
          cardIds={profile?.unlockedCards}
          expeditionMapId={selectedExpeditionMap}
          expeditionLevel={selectedExpeditionLevel}
          onExitBattle={() => setCurrentView('MAP_SELECT')}
        />
      ) : (
        <div className="relative z-10 w-full h-full flex flex-col justify-between p-6 pointer-events-auto">
          {currentView === 'HUB' && <div className="kk-hub-vignette absolute inset-0 -z-10 pointer-events-none" />}
          {/* Top TV HUD Header */}
          <header className="flex items-center justify-between">
          {/* RPG Knight Profile & Health/XP */}
          <div className="flex items-center space-x-4 bg-[#1A1926]/90 border-4 border-[#2E2B44] px-4 py-2.5 rounded shadow-pixel-box backdrop-blur-sm">
            <div className="w-10 h-10 rounded bg-[#F4B41A] text-[#0F0E17] flex items-center justify-center font-bold text-xl font-pixel shadow-pixel-box">
              ⚔
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-pixel text-xs text-[#F4B41A]">
                  {profile?.name || 'SIR KETTLEBURNE'}
                </span>
                <span className="bg-[#38B6FF]/20 text-[#38B6FF] border border-[#38B6FF] text-[9px] font-pixel px-1.5">
                  LVL {profile?.level || 1}
                </span>
                <span className="text-[9px] font-mono text-[#F4B41A] ml-1">
                  🪙 {playerGold} GP
                </span>
              </div>
              {/* Experience bar and the knight's stats */}
              <div className="flex items-center gap-3 mt-1.5">
                <div className="flex items-center gap-1" title={`${profile?.xp ?? 0} / ${profile?.maxXp ?? 0} XP to next level`}>
                  <Sparkles className="w-3.5 h-3.5 text-[#C084FC]" />
                  <div className="w-24 h-2.5 bg-[#0F0E17] border border-[#2E2B44] overflow-hidden">
                    <div className="h-full bg-[#C084FC]" style={{ width: `${Math.min(100, ((profile?.xp ?? 0) / Math.max(1, profile?.maxXp ?? 1)) * 100)}%` }} />
                  </div>
                </div>
                {(['str', 'hp', 'spd'] as const).map((k) => (
                  <span key={k} className="font-pixel text-[9px]" style={{ color: STAT_INFO[k].color }} title={STAT_INFO[k].hint}>
                    {STAT_INFO[k].icon} {STAT_INFO[k].label} {profile?.stats?.[k] ?? (k === 'str' ? 20 : k === 'hp' ? 100 : 0)}
                  </span>
                ))}
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

            {/* Title / Save & Quit button */}
            <button
              onClick={handleGoToTitle}
              className="p-3 bg-[#1A1926]/90 border-4 border-[#2E2B44] hover:border-[#F4B41A] text-white shadow-pixel-box"
              title="Save & Return to Title Screen"
            >
              <LogOut className="w-4 h-4 text-[#F4B41A]" />
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
                  setCurrentView('MAP_SELECT');
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
              ownedIds={ownedItems}
              knightLevel={profile?.level ?? 1}
              weaponCasts={profile?.weaponCasts ?? {}}
            />
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
            <CardCodexScreen
              onBackToHub={() => setCurrentView('HUB')}
              sessionReps={sessionReps}
              highestPower={highestPower}
            />
          )}
        </main>

        {/* On-Screen Instant QR Pairing Widget (Prominently displayed whenever unpaired) */}
        {netState !== 'CONNECTED' && roomId && currentView === 'HUB' && (
          <aside
            aria-label="Scan QR Code to Pair Mobile Companion"
            className="absolute bottom-[76px] right-8 z-40 bg-[#1A1926]/95 border-4 border-[#38B6FF] p-2 rounded shadow-pixel-box flex items-center gap-3 animate-in fade-in"
          >
            {/* High-Contrast QR Code for scanning from across the room */}
            <div className="p-1.5 bg-white border-2 border-black rounded">
              <QRCodeSVG
                value={`${window.location.origin}/phone?room=${roomId}`}
                size={84}
                level="M"
              />
            </div>

            <div className="flex flex-col items-start gap-1.5 pr-1">
              <span className="font-pixel text-[8px] text-[#38B6FF] flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-[#38B6FF]" />
                PAIR PHONE
              </span>
              <span className="font-pixel text-[7px] text-[#F4B41A] animate-pulse flex items-center gap-0.5">
                <Wifi className="w-2.5 h-2.5" /> WAITING
              </span>
              <span className="font-pixel text-[7px] text-[#A7A9BE] leading-tight">
                SCAN WITH<br />PHONE CAMERA
              </span>
              <span className="bg-[#0F0E17] border border-[#F4B41A] py-0.5 px-2 font-mono text-[11px] text-[#F4B41A] font-bold tracking-widest">
                {roomId}
              </span>
            </div>
          </aside>
        )}

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

        </footer>
      </div>
      )}

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
