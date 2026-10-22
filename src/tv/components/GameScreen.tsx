import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '../engine/GameEngine';
import { useTVRemote } from '../hooks/useTVRemote';
import { useDesignZoom } from '../hooks/useDesignZoom';
import { networkManager, NetworkConnectionState } from '../../shared/NetworkManager';
import { discoveryManager } from '../../shared/DiscoveryManager';
import { FOLLOW_URL, phonePairUrl } from '../../shared/deployConfig';
import { exitApp } from '../native';
import { getGraphicsMode, setGraphicsMode, GraphicsMode } from '../graphicsMode';
import { HubMenu, HUB_NODES } from './HubMenu';
import { BlacksmithShop, SHOP_ITEMS, forgeNavigate } from './BlacksmithShop';
import { BattleScreen } from './BattleScreen';
import { TitleScreen } from './TitleScreen';
import { MapSelectScreen } from './MapSelectScreen';
import { StageCinematic } from './StageCinematic';
import { CardCodexScreen } from './CardCodexScreen';
import { SecretTrial } from './SecretTrial';
import { isSecretTrialId, type SecretTrialId } from '../../shared/secretTrials';
import { QRCodeModal } from './QRCodeModal';
import { QRCodeSVG } from 'qrcode.react';
import { EquipmentItem, HubLocation, RepTelemetry } from '../../types/game';
import { profileManager, PlayerProfile } from '../../shared/ProfileManager';
import { audioManager } from '../../shared/AudioManager';
import { registerDebug } from '../debug/agentBridge';
import { type MonsterMoveId, CARD_CATALOG, STARTER_CARD_IDS, type BattleMapId } from '../../types/battle';
import type { VfxName } from '../engine/vfx';
import { BATTLE_MAPS } from '../engine/GameEngine';
import { CAMPAIGN_MAPS, latestUnlockedStage } from '../../shared/expeditionEngine';
import { SPELL_MASTERY_LEVEL, STAT_INFO, castsForWeaponLevel, weaponLevelReq } from '../../shared/progression';
import { PixelSprite, ICON_BELL, ICON_BELL_MUTED, ICON_DOOR, ICON_HELM, ICON_PHONE } from './pixelSprites';

export type TVScreenView = 'HUB' | 'BLACKSMITH' | 'COMBAT' | 'SANCTUARY' | 'TITLE' | 'MAP_SELECT' | 'TRIAL';

export const GameScreen: React.FC = () => {
  // GameEngine Reference - Strictly isolated from React re-renders!
  const engineRef = useRef<GameEngine | null>(null);
  const pixiContainerRef = useRef<HTMLDivElement | null>(null);

  // TV UI Views: 'HUB' | 'BLACKSMITH' | 'COMBAT' | 'SANCTUARY' | 'TITLE' | 'MAP_SELECT'
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const urlView = searchParams?.get('view')?.toUpperCase() as TVScreenView | undefined;
  const validViews: TVScreenView[] = ['HUB', 'BLACKSMITH', 'COMBAT', 'SANCTUARY', 'TITLE', 'MAP_SELECT', 'TRIAL'];
  const initialView: TVScreenView = urlView && validViews.includes(urlView)
    ? urlView
    : profileManager.hasSavedProfile()
    ? 'HUB'
    : 'TITLE';

  const [currentView, setCurrentView] = useState<TVScreenView>(initialView);
  // The secret stage shown in the TRIAL view (?view=trial&trial=<id> in dev)
  const urlTrial = searchParams?.get('trial');
  const [secretTrialId, setSecretTrialId] = useState<SecretTrialId>(isSecretTrialId(urlTrial) ? urlTrial : 'excalibell');
  // Read by the telemetry listener (registered once), so it can tell whether a battle is running
  const currentViewRef = useRef(currentView);
  currentViewRef.current = currentView;

  // Where leaving a battle returns to: the map screen, or the hub for a Quick Play run
  const [battleReturnView, setBattleReturnView] = useState<TVScreenView>('MAP_SELECT');

  // Selected expedition state
  const [selectedExpeditionMap, setSelectedExpeditionMap] = useState<BattleMapId>('VERDANT_FOREST');
  const [selectedExpeditionLevel, setSelectedExpeditionLevel] = useState<number>(1);

  // Navigation indices
  const [hubIndex, setHubIndex] = useState<number>(0); // Quick Play
  const zoom = useDesignZoom();
  const [shopIndex, setShopIndex] = useState<number>(0);
  const [hubFocusArea, setHubFocusArea] = useState<'CAROUSEL' | 'TOP_BAR'>('CAROUSEL');
  const [topBarIndex, setTopBarIndex] = useState<number>(0); // 0: Phone, 1: Title Screen, 2: Mute

  // Networking state
  const [roomId, setRoomId] = useState<string>('');
  const [netState, setNetState] = useState<NetworkConnectionState>('INITIALIZING');
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);

  // Dark fantasy stage cinematic state (for prologue when embarking on Level 1 via Quick Play)
  const [showCinematic, setShowCinematic] = useState<boolean>(false);
  const showCinematicRef = useRef<boolean>(false);
  showCinematicRef.current = showCinematic;
  const cinematicMapIdRef = useRef<BattleMapId>('VERDANT_FOREST');
  const [cinematicMapId, setCinematicMapId] = useState<BattleMapId>('VERDANT_FOREST');

  // RPG Progression state
  const [profile, setProfile] = useState<PlayerProfile | null>(() => profileManager.getActiveProfile());
  const [playerGold, setPlayerGold] = useState<number>(() => profileManager.getActiveProfile()?.gold ?? 150);
  const [equippedItems, setEquippedItems] = useState<Set<string>>(() => {
    const active = profileManager.getActiveProfile();
    return new Set(active?.equippedItems ? Object.values(active.equippedItems).filter(Boolean) as string[] : ['iron_kettlebell']);
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [graphicsMode, setGraphicsModeState] = useState<GraphicsMode>(getGraphicsMode);

  // High-level workout session counters (updated periodically or on reps)
  const [sessionReps, setSessionReps] = useState<number>(0);
  const [highestPower, setHighestPower] = useState<number>(0);
  const [isEngineReady, setIsEngineReady] = useState<boolean>(false);

  // Stop background battle soundtrack only when returning to the Town Hub or Title screen
  useEffect(() => {
    if (currentView === 'HUB' || currentView === 'TITLE' || currentView === 'BLACKSMITH') {
      audioManager.stopBgm();
    }
  }, [currentView]);

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
        // plays when a card is cast (BattleScreen), with the real damage, not on every rep; a secret
        // trial plays its own rep beat.
        if (engineRef.current && currentViewRef.current !== 'COMBAT' && currentViewRef.current !== 'TRIAL' && !showCinematicRef.current) {
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
    engineRef.current.setShowcase(currentView === 'BLACKSMITH');
    if (currentView === 'TITLE') {
      engineRef.current.setCharactersVisible(false);
      void engineRef.current.loadBackground(BATTLE_MAPS.OBSIDIAN_THRONE);
    } else if (currentView === 'MAP_SELECT') {
      engineRef.current.setCharactersVisible(false);
      void engineRef.current.loadBackground(BATTLE_MAPS.GUILD_HALL);
    } else if (currentView === 'HUB' || currentView === 'SANCTUARY') {
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

  // Entering the town hub always lands on Quick Play
  useEffect(() => {
    if (currentView === 'HUB') {
      setHubIndex(0);
      setHubFocusArea('CAROUSEL');
    }
  }, [currentView]);

  // Quick Play: jump straight into the furthest unlocked stage
  const handleQuickPlay = useCallback(() => {
    const { mapId, level } = latestUnlockedStage(profileManager.getActiveProfile());
    setSelectedExpeditionMap(mapId);
    setSelectedExpeditionLevel(level);
    setBattleReturnView('HUB');

    // First time embarking on Level 1 of a stage: play the dark fantasy prologue automatically!
    if (level === 1 && !profileManager.hasViewedCinematic(mapId)) {
      profileManager.markCinematicViewed(mapId);
      audioManager.play('ui_select');
      setCinematicMapId(mapId);
      setShowCinematic(true);
      return;
    }

    setCurrentView('COMBAT');
  }, []);

  const handleCinematicClose = useCallback(() => {
    setShowCinematic(false);
    audioManager.play('equip');
    setCurrentView('COMBAT');
  }, []);

  const handleCinematicEmbark = useCallback(() => {
    setShowCinematic(false);
    audioManager.play('equip');
    setCurrentView('COMBAT');
  }, []);

  // Secret stage: a level clear led to a trial (src/shared/secretTrials.ts); win or lose, it ends in the hub
  const handleSecretTrial = useCallback((id: SecretTrialId) => {
    setSecretTrialId(id);
    setCurrentView('TRIAL');
  }, []);
  const handleLeaveSecretTrial = useCallback(() => setCurrentView('HUB'), []);

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
      texelDensity: (slot: number) => engineRef.current?.debugTexelDensity(slot),
      step: (frames: number) => engineRef.current?.debugStep(frames),
      resume: () => engineRef.current?.debugResume(),
      knightPose: (animation: string | null, time?: number) => engineRef.current?.debugPoseKnight(animation, time),
      knightWeapon: (name: string) => engineRef.current?.debugKnightWeapon(name),
      trialActor: (visible: boolean) => engineRef.current?.debugTrialActor(visible),
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
    () => ({ view: currentView, net: netState, roomId, qrOpen: isQrModalOpen, sessionReps, highestPower, gold: playerGold, showCinematic }),
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
      // Opens a secret trial directly (e.g. trial('dead_weight')), as if a level clear had called it
      trial: (id: string) => {
        if (!isSecretTrialId(id)) throw new Error(`Unknown trial "${id}". Known: excalibell, dead_weight`);
        handleSecretTrial(id);
      },
      expedition: (mapId: string, level?: number) => {
        const id = mapId.toUpperCase() as BattleMapId;
        setSelectedExpeditionMap(id);
        setSelectedExpeditionLevel(level ?? 1);
        setCurrentView('COMBAT');
      },
      quickPlay: () => handleQuickPlay(),
      cinematic: (open?: boolean, mapId?: BattleMapId) => {
        if (mapId) setCinematicMapId(mapId);
        setShowCinematic(open ?? true);
      },
      unlockCard: (templateId: string) => profileManager.unlockCard(templateId),
      // Sets a weapon's level (default SPELL_MASTERY_LEVEL: its spells join the deck with any weapon)
      masterWeapon: (id: string, level = SPELL_MASTERY_LEVEL) => {
        const weaponCasts = { ...(profileManager.getActiveProfile()?.weaponCasts ?? {}), [id]: castsForWeaponLevel(level) };
        profileManager.saveActiveProfile({ weaponCasts });
        setProfile(profileManager.getActiveProfile());
      },
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
  ), [currentView, netState, roomId, isQrModalOpen, sessionReps, highestPower, playerGold, showCinematic]);

  // 3. Blacksmith Equipment Preview Callback
  const handlePreviewShopItem = useCallback((item: EquipmentItem) => {
    if (engineRef.current) {
      engineRef.current.previewEquipment(item.slot, item.attachmentId, parseInt(item.colorHex.slice(1), 16));
    }
  }, []);

  // The forge opens on the weapon in the knight's hand
  const openForge = () => {
    const index = Math.max(0, SHOP_ITEMS.findIndex((si) => si.slot === 'weapon' && equippedItems.has(si.id)));
    setCurrentView('BLACKSMITH');
    setShopIndex(index);
    handlePreviewShopItem(SHOP_ITEMS[index]);
  };

  // Equip item: bought once, then owned (weapons keep their level). Weapons need the knight's level.
  const ownedItems = new Set(profile?.unlockedItems ?? ['iron_kettlebell']);
  const handleEquipShopItem = (item: EquipmentItem) => {
    const owned = ownedItems.has(item.id) || equippedItems.has(item.id);
    // Stone-bound weapons (secret trials) are never sold: only their owner can equip them, at any level
    if (item.stoneBound ? !owned : item.slot === 'weapon' && (profile?.level ?? 1) < weaponLevelReq(item.level)) {
      audioManager.play('warn');
      return;
    }
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
      engineRef.current?.previewEquipment(item.slot, item.attachmentId);
      engineRef.current?.showcaseEquipped(parseInt(item.colorHex.slice(1), 16));
      profileManager.saveActiveProfile({
        gold: !owned ? playerGold - item.price : playerGold,
        unlockedItems: owned ? [...ownedItems] : [...ownedItems, item.id],
        equippedItems: {
          ...(profile?.equippedItems || { weapon: 'iron_kettlebell' }),
          [item.slot]: item.id,
        },
      });
    } else {
      audioManager.play('warn');
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
      if (currentView === 'HUB') {
        if (hubFocusArea === 'CAROUSEL') {
          setHubFocusArea('TOP_BAR');
          setTopBarIndex(0);
          audioManager.play('ui_move');
        }
      } else if (currentView === 'BLACKSMITH') {
        setShopIndex((prev) => {
          const next = forgeNavigate(prev, 'up');
          if (next !== prev) handlePreviewShopItem(SHOP_ITEMS[next]);
          return next;
        });
      }
    },
    onDown: () => {
      if (currentView === 'HUB') {
        if (hubFocusArea === 'TOP_BAR') {
          setHubFocusArea('CAROUSEL');
          audioManager.play('ui_move');
        }
      } else if (currentView === 'BLACKSMITH') {
        setShopIndex((prev) => {
          const next = forgeNavigate(prev, 'down');
          if (next !== prev) handlePreviewShopItem(SHOP_ITEMS[next]);
          return next;
        });
      }
    },
    onLeft: () => {
      if (currentView === 'HUB') {
        if (hubFocusArea === 'CAROUSEL') {
          setHubIndex((prev) => Math.max(0, prev - 1));
        } else {
          setTopBarIndex((prev) => Math.max(0, prev - 1));
        }
      } else if (currentView === 'BLACKSMITH') {
        setShopIndex((prev) => {
          const next = forgeNavigate(prev, 'left');
          if (next !== prev) handlePreviewShopItem(SHOP_ITEMS[next]);
          return next;
        });
      }
    },
    onRight: () => {
      if (currentView === 'HUB') {
        if (hubFocusArea === 'CAROUSEL') {
          setHubIndex((prev) => Math.min(HUB_NODES.length - 1, prev + 1));
        } else {
          setTopBarIndex((prev) => Math.min(2, prev + 1));
        }
      } else if (currentView === 'BLACKSMITH') {
        setShopIndex((prev) => {
          const next = forgeNavigate(prev, 'right');
          if (next !== prev) handlePreviewShopItem(SHOP_ITEMS[next]);
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
        if (hubFocusArea === 'TOP_BAR') {
          if (topBarIndex === 0) {
            setIsQrModalOpen(true);
          } else if (topBarIndex === 1) {
            handleGoToTitle();
          } else if (topBarIndex === 2) {
            toggleMute();
          }
          return;
        }

        const selectedNode = HUB_NODES[hubIndex].id;
        if (selectedNode === 'BLACKSMITH') {
          openForge();
        } else if (selectedNode === 'GATE') {
          setCurrentView('MAP_SELECT');
        } else if (selectedNode === 'QUICK_PLAY') {
          handleQuickPlay();
        } else if (selectedNode === 'SANCTUARY') {
          setCurrentView('SANCTUARY');
        } else if (selectedNode === 'GRAPHICS') {
          toggleGraphicsMode();
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
      } else if (currentView === 'HUB' && hubFocusArea === 'TOP_BAR') {
        setHubFocusArea('CAROUSEL');
      } else if (currentView !== 'HUB') {
        setCurrentView('HUB');
      } else {
        exitApp();
      }
    },
  }, { enabled: !showCinematic && currentView !== 'COMBAT' && currentView !== 'TITLE' && currentView !== 'TRIAL' && currentView !== 'MAP_SELECT' && currentView !== 'SANCTUARY' });

  const toggleMute = () => {
    const muted = audioManager.toggleMute();
    setIsMuted(muted);
  };

  // Same setting as the title menu's GRAPHICS item. The CSS savers apply at once; the monster outline from the next fight.
  const toggleGraphicsMode = () => {
    const next: GraphicsMode = getGraphicsMode() === 'QUALITY' ? 'PERFORMANCE' : 'QUALITY';
    setGraphicsMode(next);
    setGraphicsModeState(next);
    audioManager.play('ui_select');
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
            setBattleReturnView('MAP_SELECT');
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
          onExitBattle={() => setCurrentView(battleReturnView)}
          onSecretTrial={handleSecretTrial}
        />
      ) : currentView === 'TRIAL' ? (
        <SecretTrial
          key={secretTrialId}
          trialId={secretTrialId}
          engineRef={engineRef}
          isEngineReady={isEngineReady}
          mapId={selectedExpeditionMap}
          onExit={handleLeaveSecretTrial}
        />
      ) : (
        <div className="relative z-10 w-full h-full flex flex-col justify-between pointer-events-auto" style={{ padding: 24 * zoom }}>
          {currentView === 'HUB' && <div className="kk-hub-vignette absolute inset-0 -z-10 pointer-events-none" />}
          {/* Top HUD: the knight's nameplate, this sitting's tally, and the phone/settings bar */}
          <header className="kk-hud-top" style={{ zoom }}>
            <div className="kk-nameplate">
              <span className="kk-nameplate__portrait">
                <PixelSprite grid={ICON_HELM} px={3} />
              </span>
              <div className="kk-nameplate__body">
                <div className="kk-nameplate__row">
                  <span className="kk-nameplate__name">{profile?.name || 'Sir Kettleburne'}</span>
                  <span className="kk-nameplate__lvl">Lv {profile?.level || 1}</span>
                </div>
                <div className="kk-nameplate__xp" title={`${profile?.xp ?? 0} / ${profile?.maxXp ?? 0} XP to next level`}>
                  <i style={{ transform: `scaleX(${Math.min(1, (profile?.xp ?? 0) / Math.max(1, profile?.maxXp ?? 1))})` }} />
                </div>
                <div className="kk-nameplate__stats">
                  {(['str', 'hp', 'spd'] as const).map((k) => (
                    <span key={k} title={STAT_INFO[k].hint}>
                      <small>{STAT_INFO[k].label}</small> {profile?.stats?.[k] ?? (k === 'str' ? 20 : k === 'hp' ? 100 : 0)}
                    </span>
                  ))}
                  <span className="kk-nameplate__gold">
                    <span className="kk-forge__coin" /> {playerGold}
                  </span>
                </div>
              </div>
            </div>

            {/* The forge takes the whole right side */}
            <div className={`kk-hud-top__right ${currentView === 'BLACKSMITH' ? 'invisible' : ''}`}>
              <div className="kk-tally">
                <span className="kk-tally__over">This sitting</span>
                <span className="kk-tally__line">
                  <b>{sessionReps}</b> reps <i>·</i> mightiest blow <b>{highestPower || '—'}</b>
                </span>
              </div>

              <div className="kk-sysbar">
                {([
                  { icon: ICON_PHONE, onClick: () => setIsQrModalOpen(true), tint: netState === 'CONNECTED' ? '#3DF2A0' : '#4A5068',
                    label: netState === 'CONNECTED' ? 'Phone bound' : `Bind phone · ${roomId || '…'}` },
                  { icon: ICON_DOOR, onClick: handleGoToTitle, label: 'Save & leave' },
                  { icon: isMuted ? ICON_BELL_MUTED : ICON_BELL, onClick: toggleMute, label: isMuted ? 'Sound off' : 'Sound on' },
                ]).map((b, i) => {
                  const focused = currentView === 'HUB' && hubFocusArea === 'TOP_BAR' && topBarIndex === i;
                  return (
                    <button
                      key={i}
                      onClick={b.onClick}
                      className={`kk-sysbar__btn ${focused ? 'kk-sysbar__btn--focused' : ''}`}
                      style={{ color: b.tint }}
                      title={b.label}
                    >
                      <PixelSprite grid={b.icon} px={3} />
                      {focused && <span className="kk-sysbar__caption">{b.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </header>

        {/* Center Active View */}
        <main className="my-auto flex items-center justify-center">
          {currentView === 'HUB' && (
            <div style={{ zoom, width: '100%' }}>
            <HubMenu
              selectedIndex={hubIndex}
              isFocused={hubFocusArea === 'CAROUSEL'}
              quickPlayStage={latestUnlockedStage(profile)}
              graphicsMode={graphicsMode}
              onSelectNode={(node) => {
                if (node === 'BLACKSMITH') {
                  openForge();
                } else if (node === 'GATE') {
                  setCurrentView('MAP_SELECT');
                } else if (node === 'QUICK_PLAY') {
                  handleQuickPlay();
                } else if (node === 'SANCTUARY') {
                  setCurrentView('SANCTUARY');
                } else if (node === 'GRAPHICS') {
                  toggleGraphicsMode();
                }
              }}
              onHoverNode={(idx) => setHubIndex(idx)}
            />
            </div>
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
              profile={profile}
            />
          )}

          {currentView === 'SANCTUARY' && (
            <CardCodexScreen
              onBackToHub={() => setCurrentView('HUB')}
              sessionReps={sessionReps}
              highestPower={highestPower}
            />
          )}
        </main>

        {/* Pairing QR, shown on the hub while no phone is bound */}
        {netState !== 'CONNECTED' && roomId && currentView === 'HUB' && (
          <aside aria-label="Scan QR Code to Pair Mobile Companion" className="kk-hub-qr" style={{ zoom }}>
            <div className="kk-hub-qr__code">
              <QRCodeSVG value={phonePairUrl(roomId)} size={84} level="M" />
            </div>
            <div className="kk-hub-qr__text">
              <span className="kk-hub-qr__title">Bind thy phone</span>
              <span className="kk-hub-qr__sub">Scan with its camera, or enter the code.</span>
              <span className="kk-hub-qr__room">{roomId}</span>
              <span className="kk-hub-qr__wait"><i /> Awaiting</span>
            </div>
          </aside>
        )}

        {/* Once the phone is bound, the corner shows a follow-for-updates QR instead */}
        {netState === 'CONNECTED' && currentView === 'HUB' && (
          <aside aria-label="Scan QR Code to follow the developer on X for updates" className="kk-hub-qr kk-hub-qr--quiet" style={{ zoom }}>
            <div className="kk-hub-qr__code">
              <QRCodeSVG value={FOLLOW_URL} size={64} level="M" />
            </div>
            <div className="kk-hub-qr__text">
              <span className="kk-hub-qr__title">Tidings</span>
              <span className="kk-hub-qr__sub">Follow for updates</span>
              <span className="kk-hub-qr__handle">@AnotherDevName</span>
            </div>
          </aside>
        )}

        {/* Remote hints */}
        <footer className={`kk-hub-hints ${currentView === 'BLACKSMITH' ? 'invisible' : ''}`} style={{ zoom }}>
          <span>
            <kbd className="kk-hub-hints__arrows">◀▶</kbd>
            {currentView === 'HUB' && hubFocusArea === 'TOP_BAR' ? 'Settings' : 'Choose'}
          </span>
          {currentView === 'HUB' && (
            <span>
              <kbd className="kk-hub-hints__arrows">{hubFocusArea === 'TOP_BAR' ? '▼' : '▲'}</kbd>
              {hubFocusArea === 'TOP_BAR' ? 'Town' : 'Phone & sound'}
            </span>
          )}
          <span><kbd>Select</kbd>Enter</span>
          <span><kbd>Back</kbd>{currentView === 'HUB' && hubFocusArea !== 'TOP_BAR' ? 'Quit' : 'Back'}</span>
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

      {/* 64-BIT DARK FANTASY STAGE CINEMATIC MODAL (Auto-played on Level 1 embark) */}
      {showCinematic && (
        <StageCinematic
          key={cinematicMapId}
          mapId={cinematicMapId}
          onClose={handleCinematicClose}
          onEmbark={handleCinematicEmbark}
        />
      )}
    </div>
  );
};
