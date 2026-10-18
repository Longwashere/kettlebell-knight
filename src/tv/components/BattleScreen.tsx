import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CombatCard, MonsterState, BattleState, MonsterIntent, MONSTER_CATALOG, ENCOUNTERS, EncounterTemplate, CARD_CATALOG, BattleMapId } from '../../types/battle';
import { MOVESETS, rollIntent } from '../../shared/monsterMovesets';
import { resolveCard, frontTarget } from '../../shared/combat';
import { createStageEncounter, expeditionClearXp } from '../../shared/stageScaling';
import { repGold } from '../../shared/combatRules';
import { STAT_INFO, type Loadout } from '../../shared/progression';
import { ELEMENT_INFO } from '../../shared/elements';
import type { ImpactResult } from '../engine/monsterMoves';
import { ExerciseType, RepTelemetry } from '../../types/game';
import { CardDeckManager } from '../../shared/CardDeckManager';
import { ALL_WEAPON_SPELLS } from '../../types/weaponSpells';
import { audioManager } from '../../shared/AudioManager';
import { GameEngine, BATTLE_MAPS, getMapBattleMusic } from '../engine/GameEngine';
import { useTVRemote } from '../hooks/useTVRemote';
import { registerDebug } from '../debug/agentBridge';
import { getMapConfig, getExpeditionEncounters, getNextCampaignMap } from '../../shared/expeditionEngine';
import { profileManager, loadoutFor, type LevelUpEvent, type MasteryLevelUp } from '../../shared/ProfileManager';
import { SHOP_ITEMS } from '../../shared/shopItems';
import { CardUnlockCelebration } from './CardUnlockCelebration';
import { MasteryCelebration } from './MasteryCelebration';
import { PauseMenu } from './PauseMenu';
import type { CardUnlockDef } from '../../shared/cardUnlocks';
import { CombatCardView } from './CombatCardView';
import { rollSecretTrial, type SecretTrialId } from '../../shared/secretTrials';
import { SECRET_TRIAL_COPY } from './secretTrialCopy';
import { TRIAL_SCENES } from '../engine/trialScenes';
import { 
  Shield, 
  Swords, 
  Heart, 
  Flame, 
  AlertTriangle, 
  Clock, 
  Sparkles, 
  Trophy, 
  Skull, 
  RotateCcw,
  Zap,
  Users
} from 'lucide-react';

interface BattleScreenProps {
  engineRef: React.RefObject<GameEngine | null>;
  isEngineReady?: boolean;
  weaponId?: string; // equipped weapon: its spells join the deck
  cardIds?: readonly string[]; // the knight's unlocked cards (PlayerProfile.unlockedCards); omitted = full catalog
  expeditionMapId?: BattleMapId;
  expeditionLevel?: number;
  onExitBattle: () => void;
  /** A level clear led to a secret stage (src/shared/secretTrials.ts): leave battle for it. */
  onSecretTrial?: (id: SecretTrialId) => void;
  onBattleStateSync?: (state: {
    hand: CombatCard[];
    monster: MonsterState;
    playerHp: number;
    playerBlock: number;
  }) => void;
}

export const BattleScreen: React.FC<BattleScreenProps> = ({
  engineRef,
  isEngineReady,
  weaponId,
  cardIds,
  expeditionMapId,
  expeditionLevel,
  onExitBattle,
  onSecretTrial,
  onBattleStateSync,
}) => {
  // The knight's stats, weapon and spell levels: every card's numbers come from it. Rebuilt when the
  // knight levels up (kills grant experience mid-fight) or a card/weapon levels from use.
  const loadoutRef = useRef<Loadout>(loadoutFor(profileManager.getActiveProfile(), weaponId));
  // Deck Manager initialized
  const deckManagerRef = useRef<CardDeckManager>(new CardDeckManager(weaponId, cardIds, loadoutRef.current));
  const weaponIdRef = useRef(weaponId);
  weaponIdRef.current = weaponId;
  const cardIdsRef = useRef(cardIds);
  cardIdsRef.current = cardIds;

  // Combat State
  const [playerMaxHp, setPlayerMaxHp] = useState<number>(loadoutRef.current.maxHp);
  const [playerHp, setPlayerHp] = useState<number>(loadoutRef.current.maxHp);
  const [knightLevel, setKnightLevel] = useState<number>(() => profileManager.getActiveProfile()?.level ?? 1);
  // Experience earned this run (kills count whether the run is won or lost) and the last breather heal
  const [runXp, setRunXp] = useState<number>(0);
  const [runLevelUps, setRunLevelUps] = useState<LevelUpEvent[]>([]);
  const [breatherHeal, setBreatherHeal] = useState<number>(0);
  // Gold: reps fill the current fight's purse; winning the fight banks it, losing forfeits it
  const fightGoldRef = useRef<number>(0);
  const [fightGold, setFightGold] = useState<number>(0);
  const [lastBankedGold, setLastBankedGold] = useState<number>(0);
  const [runGold, setRunGold] = useState<number>(0);
  const [forfeitedGold, setForfeitedGold] = useState<number>(0);
  const [playerBlock, setPlayerBlock] = useState<number>(0);
  const [hand, setHand] = useState<CombatCard[]>([]);
  // Highlighted card. The game is played hands-free, so by default the highlight follows progress:
  // the started card (at least 1 rep) the player is closest to casting, i.e. fewest reps left,
  // leftmost on ties. D-pad/clicks set a manual focus that lasts until the next rep lands.
  // -1 = nothing highlighted (no card has a rep yet).
  const [manualFocus, setManualFocus] = useState<number | null>(null);
  // Cards just cast: each plays a shatter animation over its slot while the replacement deals in
  const [castFx, setCastFx] = useState<{ key: number; index: number; card: CombatCard }[]>([]);
  const handRef = useRef<CombatCard[]>(hand);
  handRef.current = hand;
  const leadCardIndex = useMemo(() => {
    let best = -1;
    const left = (i: number) => hand[i].requiredReps - hand[i].currentReps;
    hand.forEach((c, i) => {
      if (c.currentReps >= 1 && (best === -1 || left(i) < left(best))) best = i;
    });
    return best;
  }, [hand]);
  const focusedCardIndex = manualFocus !== null && manualFocus < hand.length ? manualFocus : leadCardIndex;
  // Remote actions (Enter / Space) need a card even before anything is highlighted
  const actionCardIndex = focusedCardIndex >= 0 ? focusedCardIndex : 0;
  const setFocusedCardIndex = (update: number | ((prev: number) => number)) =>
    setManualFocus((prev) => {
      const current = prev ?? actionCardIndex;
      return typeof update === 'function' ? update(current) : update;
    });

  // Any rep (or a new card being dealt) hands the highlight back to rep progress
  const repSignature = hand.map((c) => `${c.id}:${c.currentReps}`).join('|');
  useEffect(() => {
    setManualFocus(null);
  }, [repSignature]);
  // Card showing its technique side (Enter flips the focused card); flips back on its own
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);
  const [battleStatus, setBattleStatus] = useState<'FIGHTING' | 'VICTORY' | 'DEFEAT' | 'ENCOUNTER_CLEARED' | 'EXPEDITION_VICTORY'>('FIGHTING');
  const [recentCombatLog, setRecentCombatLog] = useState<string>('Battle commenced! Perform exercises to cast cards.');
  // Cards unlocked during the fight, then spells and weapons that levelled up; shown one by one after the
  // reward screen, before its action runs
  const [pendingCardUnlocks, setPendingCardUnlocks] = useState<CardUnlockDef[]>([]);
  const [pendingMastery, setPendingMastery] = useState<MasteryLevelUp[]>([]);
  const [rewardStep, setRewardStep] = useState<'unlocks' | 'mastery' | null>(null);
  const showingUnlocks = rewardStep !== null;
  // Spells and weapons that levelled up (several levels of one count once, like their celebration pages)
  const masteryCount = new Set(pendingMastery.map((u) => `${u.kind}:${u.id}`)).size;
  const afterUnlocksRef = useRef<(() => void) | null>(null);
  const continueReward = (action: () => void) => {
    if (pendingCardUnlocks.length === 0 && pendingMastery.length === 0) return action();
    afterUnlocksRef.current = action;
    setRewardStep(pendingCardUnlocks.length > 0 ? 'unlocks' : 'mastery');
  };
  const finishUnlocks = () => {
    if (rewardStep === 'unlocks' && pendingMastery.length > 0) {
      setPendingCardUnlocks([]);
      setRewardStep('mastery');
      return;
    }
    const action = afterUnlocksRef.current;
    afterUnlocksRef.current = null;
    setRewardStep(null);
    setPendingCardUnlocks([]);
    setPendingMastery([]);
    action?.();
  };

  // Expedition vs Standalone Encounters
  const isExpeditionMode = Boolean(expeditionMapId);
  const [currentMap, setCurrentMap] = useState<BattleMapId>(expeditionMapId || 'VERDANT_FOREST');
  const [currentLevel, setCurrentLevel] = useState<number>(expeditionLevel || 1);
  const [expeditionStep, setExpeditionStep] = useState<number>(0);
  const [totalLevelReps, setTotalLevelReps] = useState<number>(0);
  // Reps per exercise this expedition level: each rep of a secret trial's exercise raises its chance to appear
  const levelRepsRef = useRef<Partial<Record<ExerciseType, number>>>({});
  const [secretCall, setSecretCall] = useState<SecretTrialId | null>(null);

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialEncounterParam = parseInt(searchParams?.get('encounter') || '0', 10);
  const safeEncounterIndex = isNaN(initialEncounterParam) ? 0 : Math.max(0, Math.min(initialEncounterParam, ENCOUNTERS.length - 1));

  const expeditionEncounters = useMemo(() => {
    if (isExpeditionMode) {
      const list = getExpeditionEncounters(currentMap, currentLevel);
      if (list.length > 0) return list;
    }
    return [ENCOUNTERS[safeEncounterIndex]];
  }, [isExpeditionMode, currentMap, currentLevel, safeEncounterIndex]);

  // Sync state when expedition props change
  useEffect(() => {
    if (expeditionMapId) setCurrentMap(expeditionMapId);
    if (expeditionLevel) setCurrentLevel(expeditionLevel);
    if (expeditionMapId && expeditionLevel) {
      setExpeditionStep(0);
      const list = getExpeditionEncounters(expeditionMapId, expeditionLevel);
      if (list.length > 0) {
        const first = list[0];
        const newMonsters = createStageEncounter(first, expeditionLevel, expeditionMapId);
        commitMonsters(newMonsters);
        setPlayerBlock(0);
        setRunXp(0);
        setRunLevelUps([]);
        setRunGold(0);
        levelRepsRef.current = {};
        fightGoldRef.current = 0;
        setFightGold(0);
        setBattleStatus('FIGHTING');
        battleStatusRef.current = 'FIGHTING';
        if (engineRef.current) {
          const customBg = first.background ?? (first.map ? BATTLE_MAPS[first.map] : undefined);
          engineRef.current.setMonsters(newMonsters, customBg);
        }
      }
    }
  }, [expeditionMapId, expeditionLevel]);

  const [currentEncounterIndex, setCurrentEncounterIndex] = useState<number>(safeEncounterIndex);
  const [monsters, setMonsters] = useState<MonsterState[]>(() => {
    if (expeditionMapId && expeditionLevel) {
      const list = getExpeditionEncounters(expeditionMapId, expeditionLevel);
      if (list.length > 0) return createStageEncounter(list[0], expeditionLevel, expeditionMapId);
    }
    return createStageEncounter(ENCOUNTERS[safeEncounterIndex]);
  });
  const [targetedMonsterIndex, setTargetedMonsterIndex] = useState<number>(0);

  // References for real-time timer calculations
  // Latest monsters. The ATB loop, card casts and monster moves all read and write through this ref
  // (commitMonsters) so a 50ms timer tick can never overwrite a change with a stale copy.
  const monstersRef = useRef<MonsterState[]>(monsters);
  const commitMonsters = useCallback((next: MonsterState[] | ((prev: MonsterState[]) => MonsterState[])) => {
    monstersRef.current = typeof next === 'function' ? next(monstersRef.current) : next;
    setMonsters(monstersRef.current);
  }, []);
  const targetedIndexRef = useRef<number>(targetedMonsterIndex);
  targetedIndexRef.current = targetedMonsterIndex;
  const playerHpRef = useRef<number>(playerHp);
  playerHpRef.current = playerHp;
  const playerBlockRef = useRef<number>(playerBlock);
  playerBlockRef.current = playerBlock;
  const battleStatusRef = useRef<'FIGHTING' | 'VICTORY' | 'DEFEAT' | 'ENCOUNTER_CLEARED' | 'EXPEDITION_VICTORY'>(battleStatus);
  battleStatusRef.current = battleStatus;
  const atbFrozenRef = useRef<boolean>(false); // dev bridge: pause monster timers during captures
  const isAwaitingVictoryRef = useRef<boolean>(false);
  // Pause menu (Back / Esc mid-fight): monster timers, the engine and incoming reps all hold
  const [paused, setPaused] = useState<boolean>(false);
  const pausedRef = useRef<boolean>(false);
  pausedRef.current = paused;
  const victoryFallbackTimerRef = useRef<number | null>(null);

  const hasInitializedRef = useRef<boolean>(false);

  // Initialize Battle on mount & Sync with Engine (subsequent transitions are handled by their action functions)
  useEffect(() => {
    if (!isEngineReady || !engineRef.current || hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    isAwaitingVictoryRef.current = false;
    if (victoryFallbackTimerRef.current) {
      clearTimeout(victoryFallbackTimerRef.current);
      victoryFallbackTimerRef.current = null;
    }
    const initialHand = deckManagerRef.current.dealInitialHand();
    setHand(initialHand);
    const curEnc = isExpeditionMode
      ? (expeditionEncounters[expeditionStep] || expeditionEncounters[0])
      : ENCOUNTERS[currentEncounterIndex];
    const customBg = curEnc?.background ?? (curEnc?.map ? BATTLE_MAPS[curEnc.map] : undefined);
    engineRef.current.resetKnight?.();
    engineRef.current.setMonsters(monsters, customBg);
    audioManager.play('level_up');
  }, [isEngineReady, engineRef]);

  // Leaving battle: remove monsters from the stage and free their rigs
  useEffect(() => {
    return () => {
      if (victoryFallbackTimerRef.current) {
        clearTimeout(victoryFallbackTimerRef.current);
        victoryFallbackTimerRef.current = null;
      }
      engineRef.current?.clearMonsters();
    };
  }, [engineRef]);

  // Update engine target when targetedMonsterIndex changes
  useEffect(() => {
    engineRef.current?.setTargetMonster?.(targetedMonsterIndex);
  }, [targetedMonsterIndex, engineRef]);

  // Sync state to parent / phone WebRTC
  useEffect(() => {
    const activeMonster = monsters[targetedMonsterIndex] || monsters.find(m => m.isAlive) || monsters[0];
    onBattleStateSync?.({
      hand,
      monster: activeMonster,
      playerHp,
      playerBlock,
    });
  }, [hand, monsters, targetedMonsterIndex, playerHp, playerBlock, onBattleStateSync]);

  // Background Music: Signature instrumental battle soundtrack for the current map.
  // Kept playing continuously through encounters, victories, defeats, and map select
  // until the player returns to the Town Hub.
  useEffect(() => {
    const musicUrl = getMapBattleMusic(currentMap);
    audioManager.playBgm(musicUrl, 0.65);
  }, [currentMap]);

  // Real-Time Multi-Monster Attack ATB Timer Loop
  useEffect(() => {
    if (battleStatus !== 'FIGHTING') return;

    let lastTime = performance.now();
    const interval = setInterval(() => {
      if (battleStatusRef.current !== 'FIGHTING') return;

      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      if (atbFrozenRef.current || pausedRef.current) return;

      // Advance every attack timer from the latest state; attacks fire outside the state update so
      // they run exactly once (React may replay updater functions)
      const attackers: MonsterState[] = [];
      const next = monstersRef.current.map((m) => {
        if (!m.isAlive || m.currentHp <= 0) return m;
        const remaining = m.intent.remainingSeconds - dt;
        if (remaining <= 0) {
          attackers.push(m);
          return { ...m, intent: rollIntent(m) };
        }
        return { ...m, intent: { ...m.intent, remainingSeconds: remaining } };
      });
      commitMonsters(next);
      attackers.forEach((m) => executeMonsterAttack(m));
    }, 50);

    return () => clearInterval(interval);
  }, [battleStatus]);

  /** Rebuilds the loadout from the saved knight and gives every card (in hand too) its new numbers. */
  const refreshLoadout = useCallback(() => {
    const prevMax = loadoutRef.current.maxHp;
    const next = loadoutFor(profileManager.getActiveProfile(), weaponIdRef.current);
    loadoutRef.current = next;
    deckManagerRef.current.setLoadout(next);
    setHand(deckManagerRef.current.getHand());
    setPlayerMaxHp(next.maxHp);
    if (next.maxHp > prevMax) {
      // More max HP heals by the same amount
      playerHpRef.current = Math.min(next.maxHp, playerHpRef.current + next.maxHp - prevMax);
      setPlayerHp(playerHpRef.current);
    }
    setKnightLevel(profileManager.getActiveProfile()?.level ?? 1);
  }, []);

  /** Experience for kills (win or lose) and the level-ups it buys, announced on the battlefield. */
  const grantXp = useCallback((xp: number) => {
    if (xp <= 0) return;
    const ups = profileManager.awardXp(xp);
    setRunXp((prev) => prev + xp);
    const engine = engineRef.current;
    engine?.spawnKnightText(`+${xp} XP`, 0xC084FC);
    if (ups.length === 0) return;
    setRunLevelUps((prev) => [...prev, ...ups]);
    refreshLoadout();
    const last = ups[ups.length - 1];
    const gains = ups.map((u) => `+${u.gain} ${STAT_INFO[u.stat].label}`).join(', ');
    setRecentCombatLog(`LEVEL UP! Sir Kettleburne reached level ${last.level} (${gains})`);
    audioManager.play('level_up', { delay: 0.3 });
    setTimeout(() => {
      engineRef.current?.spawnKnightText(`LEVEL ${last.level}!`, 0xF4B41A);
      ups.forEach((u, i) => setTimeout(() => engineRef.current?.spawnKnightText(`+${u.gain} ${STAT_INFO[u.stat].label}`, parseInt(STAT_INFO[u.stat].color.slice(1), 16)), 450 * (i + 1)));
    }, 500);
  }, [engineRef, refreshLoadout]);

  /** Spell and weapon levels gained from casting. */
  const announceMastery = useCallback((ups: MasteryLevelUp[]) => {
    if (ups.length === 0) return;
    refreshLoadout();
    setPendingMastery((prev) => [...prev, ...ups]);
    const names = ups.map((u) => {
      const name = u.kind === 'weapon'
        ? SHOP_ITEMS.find((i) => i.id === u.id)?.name ?? u.id
        : [...CARD_CATALOG, ...ALL_WEAPON_SPELLS].find((c) => c.templateId === u.id)?.name ?? u.id;
      return `${name} Lv ${u.level}`;
    });
    setRecentCombatLog(`Mastery! ${names.join(' • ')}`);
    setTimeout(() => engineRef.current?.spawnKnightText(names[0].toUpperCase(), 0x00EB88), 900);
  }, [engineRef, refreshLoadout]);

  /** Fresh run: full HP from the current loadout, run experience cleared. */
  /** Empties the fight's purse; `bank` adds it to the knight's gold (the fight was won). */
  const settleFightGold = (bank: boolean) => {
    const gold = fightGoldRef.current;
    fightGoldRef.current = 0;
    setFightGold(0);
    setLastBankedGold(bank ? gold : 0);
    setForfeitedGold(bank ? 0 : gold);
    if (!bank) return gold;
    const profile = profileManager.getActiveProfile();
    if (profile && gold > 0) profileManager.saveActiveProfile({ gold: profile.gold + gold });
    setRunGold((prev) => prev + gold);
    return gold;
  };

  const resetRun = () => {
    playerHpRef.current = loadoutRef.current.maxHp;
    setPlayerHp(loadoutRef.current.maxHp);
    setPlayerBlock(0);
    playerBlockRef.current = 0;
    setRunXp(0);
    setRunLevelUps([]);
    setRunGold(0);
    fightGoldRef.current = 0;
    setFightGold(0);
    levelRepsRef.current = {};
    setSecretCall(null);
  };

  // Monster Attack Execution: the engine plays the move's choreography and calls back on the
  // impact frame, where damage/block lands. A monster killed mid-wind-up never lands its move.
  const executeMonsterAttack = useCallback((m: MonsterState) => {
    const intent = m.intent;
    setRecentCombatLog(`${m.name} uses ${intent.name}!`);

    const onImpact = (): ImpactResult | void => {
      if (battleStatusRef.current !== 'FIGHTING') return;

      if (intent.type === 'DEFEND') {
        const block = intent.block ?? 25;
        commitMonsters((prev) => prev.map(mon => mon.instanceId === m.instanceId ? { ...mon, block: mon.block + block } : mon));
        setRecentCombatLog(`${m.name} used ${intent.name} (+${block} Block)!`);
        return { label: `+${block} BLOCK`, color: 0x38B6FF, at: 'monster' };
      }

      if (Math.random() < loadoutRef.current.dodge) {
        setRecentCombatLog(`Sir Kettleburne dodged ${m.name}'s ${intent.name}!`);
        return { label: 'DODGE', color: 0x38B6FF, hit: false };
      }

      const rawDamage = intent.damage;
      const currentBlock = playerBlockRef.current;
      const absorbed = Math.min(currentBlock, rawDamage);
      const actualDamageToHp = rawDamage - absorbed;
      const nextHp = Math.max(0, playerHpRef.current - actualDamageToHp);

      playerBlockRef.current = currentBlock - absorbed;
      playerHpRef.current = nextHp;
      setPlayerBlock(currentBlock - absorbed);
      setPlayerHp(nextHp);

      if (nextHp <= 0) {
        battleStatusRef.current = 'DEFEAT';
        settleFightGold(false);
        setBattleStatus('DEFEAT');
        setRecentCombatLog(`Sir Kettleburne was felled by ${intent.name}!`);
        engineRef.current?.playKnightDefeat?.();
        audioManager.play('defeat', { delay: 0.6 });
      } else {
        setRecentCombatLog(`${m.name}'s ${intent.name} hits for ${actualDamageToHp}!${absorbed ? ` (${absorbed} blocked)` : ''}`);
      }

      if (actualDamageToHp === 0) return { label: 'BLOCKED', color: 0x38B6FF, hit: false };
      return { label: `-${actualDamageToHp}`, color: intent.type === 'HEAVY_ATTACK' ? 0xFF3366 : 0xF97316 };
    };

    const engine = engineRef.current;
    if (engine) {
      engine.playMonsterMove(m.slotIndex ?? 0, intent.move, { heavy: intent.type === 'HEAVY_ATTACK', onImpact });
    } else {
      onImpact();
    }
  }, [engineRef]);

  /**
   * Applies an exercise repetition to the matching card in hand.
   * If the card reaches required reps, it activates and damages monster / grants block!
   */
  const handleApplyRep = useCallback((exercise: ExerciseType, power: number = 80, form: number = 1.0) => {
    if (battleStatusRef.current !== 'FIGHTING' || isAwaitingVictoryRef.current || pausedRef.current) return;

    // Record rep progression toward card unlocks
    const repUnlocks = profileManager.recordRepStats(exercise, power, form, currentMap);
    // The Midas Bell pays extra on every rep
    const goldBonus = SHOP_ITEMS.find((i) => i.id === weaponIdRef.current)?.repGoldBonus ?? 0;
    fightGoldRef.current += Math.round(repGold(power) * (1 + goldBonus));
    setFightGold(fightGoldRef.current);
    levelRepsRef.current[exercise] = (levelRepsRef.current[exercise] ?? 0) + 1;
    if (repUnlocks.length > 0) {
      setPendingCardUnlocks((prev) => [...prev, ...repUnlocks]);
    }

    const result = deckManagerRef.current.recordRep(exercise, power, form);

    if (result.activated && result.card) {
      const card = result.card;
      audioManager.play('card'); // the knight move brings its own swings and impacts

      const slotIndex = handRef.current.findIndex((c) => c.id === card.id);
      if (slotIndex !== -1) {
        const fx = { key: performance.now(), index: slotIndex, card: { ...card, currentReps: card.requiredReps } };
        setCastFx((prev) => [...prev.filter((f) => f.index !== slotIndex), fx]);
        // Removed when its animation ends (onCastDone); this is only a fallback
        setTimeout(() => setCastFx((prev) => prev.filter((f) => f !== fx)), 6000);
      }

      // Resolve the card against the current formation (targeting, Block, stagger, kills)
      const before = monstersRef.current;
      const res = resolveCard(card, before, targetedIndexRef.current, { power: result.power, form: result.form });
      const engine = engineRef.current;
      const primary = res.hits[0];
      const fatalHit = res.hits.slice().reverse().find((h) => h.killed) || primary;
      const isVictory = res.monsters.every((m) => m.currentHp <= 0);

      // Check for monster kills toward card unlocks and rare drops
      const killedMonsterIds = res.hits
        .filter((h) => h.killed && before[h.index])
        .map((h) => before[h.index].id);
      if (killedMonsterIds.length > 0) {
        const killUnlocks = profileManager.recordMonsterKills(killedMonsterIds, currentMap);
        if (killUnlocks.length > 0) {
          setPendingCardUnlocks((prev) => [...prev, ...killUnlocks]);
        }
      }
      // Casting levels the card and the equipped weapon; kills pay experience, won or lost
      const mastery = profileManager.recordCast(card.templateId, weaponIdRef.current);
      const killXp = res.hits.filter((h) => h.killed).reduce((sum, h) => sum + (before[h.index]?.xp ?? 0), 0);

      // Define victory completion callback (invoked by engine when kill cam finishes)
      let onFinishVictory: (() => void) | undefined = undefined;

      if (isVictory) {
        isAwaitingVictoryRef.current = true;

        const triggerVictoryModal = () => {
          isAwaitingVictoryRef.current = false;
          if (battleStatusRef.current !== 'FIGHTING') return; // already displayed
          settleFightGold(true);
          if (victoryFallbackTimerRef.current) {
            clearTimeout(victoryFallbackTimerRef.current);
            victoryFallbackTimerRef.current = null;
          }

          if (isExpeditionMode && expeditionStep < expeditionEncounters.length - 1) {
            // Breather between encounters: a fifth of max HP back
            const maxHp = loadoutRef.current.maxHp;
            const heal = Math.min(maxHp, playerHpRef.current + Math.round(maxHp * 0.2)) - playerHpRef.current;
            playerHpRef.current += heal;
            setPlayerHp(playerHpRef.current);
            setBreatherHeal(heal);
            battleStatusRef.current = 'ENCOUNTER_CLEARED';
            setBattleStatus('ENCOUNTER_CLEARED');
            setRecentCombatLog(`Encounter ${expeditionStep + 1} of ${expeditionEncounters.length} Cleared! Catch thy breath (+${heal} HP)!`);
            audioManager.play('victory', { delay: 0.1 });
          } else if (isExpeditionMode) {
            // Entire Level Conquered!
            battleStatusRef.current = 'EXPEDITION_VICTORY';
            setBattleStatus('EXPEDITION_VICTORY');
            setRecentCombatLog(`Level ${currentLevel} Expedition Conquered! All enemies vanquished!`);
            audioManager.play('victory', { delay: 0.1 });

            // Save progression
            const mapCfg = getMapConfig(currentMap);
            const lvlCfg = mapCfg.levels.find((l) => l.level === currentLevel) || mapCfg.levels[0];
            const nextMap = currentLevel >= 5 ? getNextCampaignMap(currentMap) : undefined;
            const clearXp = expeditionClearXp(expeditionEncounters, currentMap, currentLevel);
            profileManager.recordLevelVictory(
              currentMap,
              currentLevel,
              totalLevelReps + 1,
              lvlCfg.goldReward,
              0,
              nextMap || undefined
            );
            grantXp(clearXp);
            const clearUnlocks = profileManager.recordMapClearStats(currentMap, currentLevel);
            if (clearUnlocks.length > 0) {
              setPendingCardUnlocks((prev) => [...prev, ...clearUnlocks]);
            }
            // Secret stage: a trial may call (counted as met now: one try per appearance)
            const secret = onSecretTrial
              ? rollSecretTrial(profileManager.getActiveProfile(), currentMap, currentLevel, (ex) => levelRepsRef.current[ex] ?? 0)
              : null;
            if (secret) {
              profileManager.recordSecretTrialMet(secret);
              setSecretCall(secret);
              audioManager.play(TRIAL_SCENES[secret].intro[0][0], { delay: 1.2, vol: 0.7 });
            }
          } else {
            battleStatusRef.current = 'VICTORY';
            setBattleStatus('VICTORY');
            setRecentCombatLog(`Victory! All enemies in the encounter have been vanquished!`);
            audioManager.play('victory', { delay: 0.1 });
          }
        };

        onFinishVictory = triggerVictoryModal;

        // 10-second safety fallback: show victory screen anyway if kill cam does not signal finish
        victoryFallbackTimerRef.current = window.setTimeout(() => {
          console.warn('[BattleScreen] 10s victory safety fallback fired');
          triggerVictoryModal();
        }, 10000);
      } else if (res.monsters[targetedIndexRef.current]?.currentHp <= 0) {
        // Target died: move to the next living foe, front row first
        const next = frontTarget(res.monsters);
        if (next !== -1) setTargetedMonsterIndex(next);
      }

      // The attack plays at the foes hit, in order (e.g. the back row for BACK cards). The knight move
      // lands each hit on its impact frame; damage labels and deaths show then.
      if (engine) {
        const showHit = (hit: (typeof res.hits)[number]) => {
          const tags = [hit.effect === 'strong' ? 'WEAK!' : hit.effect === 'resisted' ? 'RESIST' : '', hit.blocked ? `(${hit.blocked} blocked)` : '', card.shatter ? 'SHATTER' : '', hit.staggered ? `STAGGER +${hit.staggered}s` : ''].filter(Boolean).join(' ');
          const color = hit.damage <= 0 ? 0x38B6FF : hit.effect === 'strong' ? 0xF4B41A : hit.effect === 'resisted' ? 0xA7A9BE : 0xFF3366;
          engine.spawnMonsterText(hit.index, `-${hit.damage}`, color, hit.effect === 'strong' ? 14 : 12);
          if (tags) engine.spawnMonsterText(hit.index, tags, 0xF4B41A, 7, 14);
          if (hit.killed) engine.playMonsterDeath(hit.index);
        };
        engine.onRepCompleted(result.power, result.form, exercise, card.name, primary ? primary.damage + primary.blocked : 0, {
          move: card.templateId,
          ctx: { block: res.block, heal: res.heal },
          targets: res.hits.map((hit) => hit.index),
          onImpact: (i) => showHit(res.hits[i]),
          onFinish: onFinishVictory,
          isKillCam: isVictory,
          killSlot: fatalHit ? fatalHit.index : targetedMonsterIndex,
          stagger: card.target === 'CHAIN' ? 8 : 2,
        });
      }

      commitMonsters(res.monsters);

      if (res.block > 0) {
        playerBlockRef.current += res.block;
        setPlayerBlock(playerBlockRef.current);
        engine?.playerShieldPulse?.();
        const blockUnlocks = profileManager.recordBlockedDamage(res.block);
        if (blockUnlocks.length > 0) {
          setPendingCardUnlocks((prev) => [...prev, ...blockUnlocks]);
        }
      }
      if (res.heal > 0) {
        const healed = Math.min(loadoutRef.current.maxHp, playerHpRef.current + res.heal) - playerHpRef.current;
        playerHpRef.current += healed;
        setPlayerHp(playerHpRef.current);
        if (healed > 0) engine?.spawnKnightText(`+${healed} HP`, 0x00EB88);
      }

      const dealt = res.hits.reduce((sum, h) => sum + h.damage, 0);
      const kills = res.hits.filter((h) => h.killed).length;
      setRecentCombatLog(
        `[${card.name}] ` +
          [dealt ? `${dealt} DMG${res.hits.length > 1 ? ` across ${res.hits.length} hits` : ''}` : '', kills ? `${kills} slain` : '',
            res.block ? `+${res.block} Block` : '', res.heal ? `+${res.heal} HP` : ''].filter(Boolean).join(' • '),
      );
      // After the cast's own log line, so level-up and mastery news isn't overwritten by it
      grantXp(killXp);
      announceMastery(mastery);
    } else {
      audioManager.play('hike', { vol: 0.7 }); // rep counted toward a card
    }

    // The deck's own hand: a level-up during this rep may have rebound the cards
    setHand(deckManagerRef.current.getHand());
  }, [engineRef, isExpeditionMode, expeditionStep, expeditionEncounters, currentMap, currentLevel, totalLevelReps, grantXp, announceMastery, onSecretTrial]);

  // Expose rep callback for NetworkManager telemetry
  useEffect(() => {
    (window as any).__onKettlebellRepCompleted = handleApplyRep;
    return () => {
      delete (window as any).__onKettlebellRepCompleted;
    };
  }, [handleApplyRep]);

  // Advance to next encounter within current expedition
  const handleNextExpeditionEncounter = () => {
    isAwaitingVictoryRef.current = false;
    if (victoryFallbackTimerRef.current) {
      clearTimeout(victoryFallbackTimerRef.current);
      victoryFallbackTimerRef.current = null;
    }
    const nextStep = expeditionStep + 1;
    if (nextStep < expeditionEncounters.length) {
      setExpeditionStep(nextStep);
      const nextTemplate = expeditionEncounters[nextStep];
      const newMonsters = createStageEncounter(nextTemplate, currentLevel, currentMap);
      commitMonsters(newMonsters);
      setTargetedMonsterIndex(0);
      setPlayerBlock(0); // block resets between fights, but HP carries over!
      setBattleStatus('FIGHTING');
      battleStatusRef.current = 'FIGHTING';
      engineRef.current?.resetKnight?.();
      const customBg = nextTemplate.background ?? (nextTemplate.map ? BATTLE_MAPS[nextTemplate.map] : undefined);
      engineRef.current?.setMonsters(newMonsters, customBg);
      deckManagerRef.current.initDeck(weaponIdRef.current, cardIdsRef.current);
      setHand(deckManagerRef.current.dealInitialHand());
      setRecentCombatLog(`Encounter ${nextStep + 1} of ${expeditionEncounters.length} commenced!`);
      audioManager.play('level_up');
    }
  };

  // Retry failed expedition from encounter 1
  const handleRetryExpedition = () => {
    isAwaitingVictoryRef.current = false;
    if (victoryFallbackTimerRef.current) {
      clearTimeout(victoryFallbackTimerRef.current);
      victoryFallbackTimerRef.current = null;
    }
    setExpeditionStep(0);
    const firstTemplate = expeditionEncounters[0];
    const newMonsters = createStageEncounter(firstTemplate, currentLevel, currentMap);
    commitMonsters(newMonsters);
    setTargetedMonsterIndex(0);
    resetRun();
    setPlayerBlock(0);
    playerBlockRef.current = 0;
    setBattleStatus('FIGHTING');
    battleStatusRef.current = 'FIGHTING';
    engineRef.current?.resetKnight?.();
    const customBg = firstTemplate.background ?? (firstTemplate.map ? BATTLE_MAPS[firstTemplate.map] : undefined);
    engineRef.current?.setMonsters(newMonsters, customBg);
    deckManagerRef.current.initDeck(weaponIdRef.current, cardIdsRef.current);
    setHand(deckManagerRef.current.dealInitialHand());
    setRecentCombatLog('Expedition restarted! Ready thy bell.');
    audioManager.play('level_up');
  };

  // Advance to next Level after conquering current level
  const handleNextLevelExpedition = () => {
    isAwaitingVictoryRef.current = false;
    if (victoryFallbackTimerRef.current) {
      clearTimeout(victoryFallbackTimerRef.current);
      victoryFallbackTimerRef.current = null;
    }
    if (currentLevel < 5) {
      const nextLvl = currentLevel + 1;
      setCurrentLevel(nextLvl);
      setExpeditionStep(0);
      const nextList = getExpeditionEncounters(currentMap, nextLvl);
      const firstTemplate = nextList[0];
      const newMonsters = createStageEncounter(firstTemplate, nextLvl, currentMap);
      commitMonsters(newMonsters);
      setTargetedMonsterIndex(0);
      resetRun();
      setPlayerBlock(0);
      playerBlockRef.current = 0;
      setBattleStatus('FIGHTING');
      battleStatusRef.current = 'FIGHTING';
      engineRef.current?.resetKnight?.();
      const customBg = firstTemplate.background ?? (firstTemplate.map ? BATTLE_MAPS[firstTemplate.map] : undefined);
      engineRef.current?.setMonsters(newMonsters, customBg);
      deckManagerRef.current.initDeck(weaponIdRef.current, cardIdsRef.current);
      setHand(deckManagerRef.current.dealInitialHand());
      setRecentCombatLog(`Level ${nextLvl} Expedition commenced!`);
      audioManager.play('level_up');
    } else {
      onExitBattle();
    }
  };

  // Restart / Next Encounter (Cycles through 1 to 3 monster encounters)
  const handleNextEncounter = () => {
    const nextIdx = (currentEncounterIndex + 1) % ENCOUNTERS.length;
    startEncounter(ENCOUNTERS[nextIdx], nextIdx);
  };

  const startEncounter = (template: EncounterTemplate, index: number) => {
    isAwaitingVictoryRef.current = false;
    if (victoryFallbackTimerRef.current) {
      clearTimeout(victoryFallbackTimerRef.current);
      victoryFallbackTimerRef.current = null;
    }
    setCurrentEncounterIndex(index);
    const newMonsters = createStageEncounter(template);

    commitMonsters(newMonsters);
    setTargetedMonsterIndex(0);
    resetRun();
    setPlayerBlock(0);
    playerBlockRef.current = 0;
    setBattleStatus('FIGHTING');
    battleStatusRef.current = 'FIGHTING';
    engineRef.current?.resetKnight?.();
    const customBg = template.background ?? (template.map ? BATTLE_MAPS[template.map] : undefined);
    engineRef.current?.setMonsters(newMonsters, customBg);
    deckManagerRef.current.initDeck(weaponIdRef.current, cardIdsRef.current);
    setHand(deckManagerRef.current.dealInitialHand());
    audioManager.play('level_up');
  };

  const toggleFlip = useCallback((cardId: string | undefined) => {
    if (!cardId) return;
    setFlippedCardId((cur) => (cur === cardId ? null : cardId));
    audioManager.play('ui_select');
  }, []);

  // Moving focus away, or the card being cast, turns it face-up again; otherwise it flips back after 10s
  useEffect(() => {
    if (!flippedCardId) return;
    if (hand[focusedCardIndex]?.id !== flippedCardId) {
      setFlippedCardId(null);
      return;
    }
    const id = setTimeout(() => setFlippedCardId(null), 10000);
    return () => clearTimeout(id);
  }, [flippedCardId, focusedCardIndex, hand]);

  // Dev automation bridge (window.__kk): battle state + encounter control
  useEffect(() => registerDebug(
    'battle',
    () => ({
      status: battleStatus,
      playerHp,
      playerMaxHp,
      playerBlock,
      knight: {
        level: knightLevel,
        stats: loadoutRef.current.stats,
        attack: loadoutRef.current.attack,
        weapon: loadoutRef.current.weapon,
        repCut: loadoutRef.current.repCut,
        dodge: loadoutRef.current.dodge,
        runXp,
        fightGold,
        runGold,
      },
      encounter: { index: currentEncounterIndex, id: ENCOUNTERS[currentEncounterIndex]?.id },
      target: targetedMonsterIndex,
      monsters: monsters.map((m) => ({
        id: m.id,
        instanceId: m.instanceId,
        name: m.name,
        spriteType: m.spriteType,
        hp: m.currentHp,
        maxHp: m.maxHp,
        block: m.block,
        element: m.element,
        xp: m.xp,
        level: m.level,
        alive: m.isAlive,
        intent: { name: m.intent.name, type: m.intent.type, remaining: Number(m.intent.remainingSeconds.toFixed(2)) },
      })),
      hand: hand.map((c) => ({ name: c.name, exercise: c.exercise, currentReps: c.currentReps, requiredReps: c.requiredReps,
        baseReps: c.baseReps, damage: c.damage, element: c.element, infusion: c.infusion, level: c.level, dmgPct: c.dmgPct })),
      highlightedCard: focusedCardIndex,
      manualFocus,
      // Card that remote actions (Enter / Space / __kk.rep()) target
      focusedCard: hand[actionCardIndex]
        ? { index: actionCardIndex, name: hand[actionCardIndex].name, exercise: hand[actionCardIndex].exercise,
            currentReps: hand[actionCardIndex].currentReps, requiredReps: hand[actionCardIndex].requiredReps }
        : null,
      frozen: atbFrozenRef.current,
      paused,
      flippedCard: flippedCardId,
      rewardStep,
      pendingMastery,
      log: recentCombatLog,
    }),
    {
      // ENCOUNTERS id or index, or an ad-hoc list of MONSTER_CATALOG ids / sprite types (e.g. ['wolf', 'BOAR'])
      encounter: (which: string | number | string[]) => {
        if (typeof which === 'string' && which.includes(',')) {
          which = which.split(',').map((s) => s.trim());
        }
        if (Array.isArray(which)) {
          const monsterIds = which.map((w) => {
            const cat = MONSTER_CATALOG.find((c) => c.id === w || c.spriteType === w.toUpperCase());
            if (!cat) throw new Error(`Unknown monster "${w}". Known: ${MONSTER_CATALOG.map((c) => c.id).join(', ')}`);
            return cat.id;
          });
          const template: EncounterTemplate = { id: 'debug', name: 'Debug Encounter', description: '', monsterIds };
          startEncounter(template, currentEncounterIndex);
          return;
        }
        // A single monster id (e.g. 'kraken') that isn't an encounter id starts a solo fight with it
        if (typeof which === 'string' && !ENCOUNTERS.some((e) => e.id === which) && MONSTER_CATALOG.some((c) => c.id === which || c.spriteType === which.toUpperCase())) {
          const cat = MONSTER_CATALOG.find((c) => c.id === which || c.spriteType === which.toUpperCase())!;
          const template: EncounterTemplate = { id: 'debug', name: 'Debug Encounter', description: '', monsterIds: [cat.id] };
          startEncounter(template, currentEncounterIndex);
          return;
        }
        const index = typeof which === 'number' ? which : ENCOUNTERS.findIndex((e) => e.id === which);
        if (!ENCOUNTERS[index]) throw new Error(`Unknown encounter "${which}". Known: ${ENCOUNTERS.map((e) => e.id).join(', ')}`);
        startEncounter(ENCOUNTERS[index], index);
      },
      // Plays a monster's move now, by move id or name (e.g. attack(0, 'wolf_phantom_pack'))
      attack: (slotIndex: number, move: string) => {
        const m = monstersRef.current[slotIndex];
        if (!m) throw new Error(`No monster in slot ${slotIndex}`);
        const moves = MOVESETS[m.id] ?? [];
        const tmpl = moves.find((t) => t.move === move || t.name.toLowerCase() === move.toLowerCase());
        if (!tmpl) throw new Error(`${m.id} moves: ${moves.map((t) => t.move).join(', ')}`);
        executeMonsterAttack({ ...m, intent: { ...tmpl, remainingSeconds: 0 } });
      },
      moves: (slotIndex: number) => (MOVESETS[monstersRef.current[slotIndex]?.id] ?? []).map((t) => t.move),
      freeze: (on: boolean) => { atbFrozenRef.current = on; },
      pause: (on: boolean) => setPaused(on),
      // Drops every living foe to 1 HP, so the next hit wins the fight (victory screens, secret trial calls)
      weaken: () => commitMonsters((prev) => prev.map((m) => (m.currentHp > 0 ? { ...m, currentHp: 1 } : m))),
      focusCard: (index: number) => setFocusedCardIndex(Math.max(0, Math.min(hand.length - 1, index))),
      // Deck contents (template ids) and the equipped weapon whose spells it carries
      deck: () => ({ weaponId: weaponIdRef.current, unlocked: cardIdsRef.current ?? 'legacy', cards: deckManagerRef.current.debugDeck() }),
      // Puts a card (CARD_CATALOG or weapon spell templateId) in the hand and focuses it, ready to cast()
      giveCard: (templateId: string) => {
        const t = [...CARD_CATALOG, ...ALL_WEAPON_SPELLS].find((c) => c.templateId === templateId);
        if (!t) throw new Error(`Unknown card "${templateId}"`);
        const next = deckManagerRef.current.debugPutInHand(t);
        setHand(next);
        setFocusedCardIndex(next.findIndex((c) => c.templateId === templateId));
      },
      flip: () => {
        setFocusedCardIndex(actionCardIndex);
        toggleFlip(hand[actionCardIndex]?.id);
      },
      target: (index: number) => setTargetedMonsterIndex(index),
      // Queues spell/weapon level-ups as if cast this fight (shown after the card unlocks), e.g.
      // mastery([{ kind: 'card', id: 'starter_swing', level: 2 }, { kind: 'weapon', id: 'iron_bell', level: 3 }])
      mastery: (ups: MasteryLevelUp[]) => announceMastery(ups),
      showMastery: (ups: MasteryLevelUp[]) => {
        setPendingMastery(ups);
        setRewardStep('mastery');
      },
    },
  ));

  // TV Remote D-Pad Navigation for Hand Cards & Target Switching
  useTVRemote({
    onUp: () => {
      // Target previous alive monster
      setTargetedMonsterIndex((prev) => {
        const aliveIndices = monstersRef.current
          .map((m, idx) => ({ idx, isAlive: m.isAlive && m.currentHp > 0 }))
          .filter(m => m.isAlive)
          .map(m => m.idx);
        if (aliveIndices.length <= 1) return prev;
        const currentPos = aliveIndices.indexOf(prev);
        if (currentPos <= 0) return aliveIndices[aliveIndices.length - 1];
        return aliveIndices[currentPos - 1];
      });
    },
    onDown: () => {
      // Target next alive monster
      setTargetedMonsterIndex((prev) => {
        const aliveIndices = monstersRef.current
          .map((m, idx) => ({ idx, isAlive: m.isAlive && m.currentHp > 0 }))
          .filter(m => m.isAlive)
          .map(m => m.idx);
        if (aliveIndices.length <= 1) return prev;
        const currentPos = aliveIndices.indexOf(prev);
        if (currentPos === -1 || currentPos >= aliveIndices.length - 1) return aliveIndices[0];
        return aliveIndices[currentPos + 1];
      });
    },
    onLeft: () => {
      setFocusedCardIndex((prev) => Math.max(0, prev - 1));
    },
    onRight: () => {
      setFocusedCardIndex((prev) => Math.min(hand.length - 1, prev + 1));
    },
    onSelect: () => {
      if (battleStatus !== 'FIGHTING') {
        if (battleStatus === 'ENCOUNTER_CLEARED') {
          continueReward(handleNextExpeditionEncounter);
        } else if (battleStatus === 'EXPEDITION_VICTORY') {
          continueReward(secretCall && onSecretTrial ? () => onSecretTrial(secretCall) : currentLevel < 5 ? handleNextLevelExpedition : onExitBattle);
        } else if (battleStatus === 'DEFEAT') {
          continueReward(isExpeditionMode ? handleRetryExpedition : handleNextEncounter);
        } else {
          continueReward(handleNextEncounter);
        }
      } else {
        setFocusedCardIndex(actionCardIndex);
        toggleFlip(hand[actionCardIndex]?.id);
      }
    },
    onBack: () => {
      if (battleStatus === 'EXPEDITION_VICTORY' && secretCall && onSecretTrial) continueReward(() => onSecretTrial(secretCall));
      else if (battleStatus !== 'FIGHTING') continueReward(onExitBattle);
      else if (!isAwaitingVictoryRef.current) setPaused(true);
    },
    onDemoSwing: () => {
      if (hand.length > 0) {
        const focusedCard = hand[actionCardIndex];
        if (focusedCard) {
          handleApplyRep(focusedCard.exercise, 90 + Math.floor(Math.random() * 20), 1.0);
        }
      }
    },
  }, { enabled: !showingUnlocks && !paused });

  // Freeze the engine with the menu; a fight that ends (or a screen that unmounts) never leaves it stopped
  useEffect(() => {
    if (paused && battleStatus !== 'FIGHTING') setPaused(false);
  }, [paused, battleStatus]);
  useEffect(() => {
    engineRef.current?.setPaused(paused);
  }, [paused, engineRef]);
  useEffect(() => () => engineRef.current?.setPaused(false), [engineRef]);

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 pointer-events-auto select-none">
      {/* TOP COMBAT HUD: PLAYER (LEFT) VS MONSTER (RIGHT) */}
      <div className="flex items-start justify-between w-full">
        {/* PLAYER STATUS (LEFT) */}
        <div className="kk-hud-card kk-hud-card--player p-3 w-[min(384px,34vw)] flex-shrink-0">
          {/* Header row: Gem (Level) + Engraved Banner (Name & Block) */}
          <div className="flex items-center gap-2 mb-2">
            <div className="kk-hud-gem" title={`Knight Level ${knightLevel}`}>
              <span>{knightLevel}</span>
            </div>
            <div className="kk-hud-banner">
              <span className="font-pixel text-[10px] text-[#F4B41A] truncate tracking-wide">
                {profileManager.getActiveProfile()?.name ?? 'SIR KETTLEBURNE'}
              </span>
              {playerBlock > 0 && (
                <div className="flex items-center space-x-1 bg-[#38B6FF] text-[#0F0E17] px-1.5 py-0.5 rounded font-pixel text-[8px] font-bold shadow-sm animate-pulse flex-shrink-0">
                  <Shield className="w-2.5 h-2.5" />
                  <span>{playerBlock}</span>
                </div>
              )}
            </div>
          </div>

          {/* HP Bar Vial */}
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-mono text-[#A7A9BE] px-0.5">
              <span className="font-pixel text-[8px] text-[#38B6FF] tracking-wider">HEALTH</span>
              <span className="font-bold text-white text-[10px]">{playerHp} / {playerMaxHp}</span>
            </div>
            <div className="kk-hud-vial h-3.5">
              <div
                className="kk-hud-vial__bar kk-hud-vial__bar--player"
                style={{ width: `${Math.max(0, Math.min(100, (playerHp / playerMaxHp) * 100))}%` }}
              />
            </div>
            <KnightStatLine loadout={loadoutRef.current} runXp={runXp} fightGold={fightGold} />
          </div>
        </div>

        {/* MONSTER NAMEPLATES (TOP RIGHT): one slim plate per foe, left-to-right in formation order, kept
            short so the squad standing below them stays in view */}
        <div className="flex items-start justify-end gap-2 flex-1 min-w-0 pl-4">
          {monsters.map((m, idx) => {
            const isTargeted = idx === targetedMonsterIndex;
            const isDead = m.currentHp <= 0;
            const cardClass = isDead ? 'kk-hud-card--dead' : isTargeted ? 'kk-hud-card--targeted' : 'kk-hud-card--monster';
            const intentCritical = m.intent.remainingSeconds < 1.2;
            const intentProgress = Math.max(0, Math.min(100, (1 - m.intent.remainingSeconds / m.intent.durationSeconds) * 100));
            const affixColor = m.outlineColor ? `#${m.outlineColor.toString(16).padStart(6, '0')}` : '#F4B41A';

            return (
              <div
                key={m.instanceId || idx}
                onClick={() => !isDead && setTargetedMonsterIndex(idx)}
                className={`kk-hud-card kk-hud-plate ${cardClass} cursor-pointer`}
              >
                {isTargeted && !isDead && <span className="kk-hud-plate__flag">TARGET</span>}

                {/* Level gem, name, element / affix and block */}
                <div className="flex items-center gap-1.5">
                  <div className="kk-hud-gem kk-hud-gem--sm" title={`Level ${m.level}`}>
                    <span>{m.level}</span>
                  </div>
                  <span className={`font-pixel text-[8px] leading-tight truncate flex-1 min-w-0 ${isTargeted && !isDead ? 'text-[#F4B41A]' : 'text-white'}`}>
                    {m.name}
                  </span>
                  {m.element && !isDead && (
                    <span
                      className="kk-hud-plate__chip"
                      style={{ borderColor: ELEMENT_INFO[m.element].color, color: ELEMENT_INFO[m.element].color }}
                      title={`${ELEMENT_INFO[m.element].label} monster`}
                    >
                      {ELEMENT_INFO[m.element].icon}
                    </span>
                  )}
                  {m.block > 0 && !isDead && (
                    <span className="flex items-center gap-0.5 bg-[#38B6FF] text-[#0F0E17] px-1 rounded font-pixel text-[7px] font-bold flex-shrink-0">
                      <Shield className="w-2 h-2" />
                      {m.block}
                    </span>
                  )}
                  {isDead && (
                    <span className="font-pixel text-[7px] text-[#A7A9BE] flex items-center gap-1 flex-shrink-0">
                      <Skull className="w-2.5 h-2.5" /> SLAIN
                    </span>
                  )}
                </div>

                {!isDead && (
                  <>
                    {/* HP vial with the numbers set into it */}
                    <div className="kk-hud-vial h-[11px] mt-1">
                      <div
                        className="kk-hud-vial__bar kk-hud-vial__bar--monster"
                        style={{ width: `${Math.max(0, Math.min(100, (m.currentHp / m.maxHp) * 100))}%` }}
                      />
                      <span className="kk-hud-vial__label">{m.currentHp} / {m.maxHp}</span>
                    </div>

                    {/* Intent: what lands when the charge bar fills */}
                    <div className="kk-hud-intent mt-1">
                      <div className="flex items-center justify-between gap-1 text-[7px] font-pixel text-[#E6E4EE] mb-0.5">
                        <span className="flex items-center gap-1 min-w-0">
                          {m.intent.type === 'DEFEND' ? (
                            <Shield className="w-2.5 h-2.5 text-[#38B6FF] flex-shrink-0" />
                          ) : m.intent.type === 'BUFF' ? (
                            <span className="text-[#F4B41A] flex-shrink-0">✦</span>
                          ) : (
                            <span className="text-[#FF3366] flex-shrink-0">⚔</span>
                          )}
                          <span className="truncate">{m.intent.name}</span>
                        </span>
                        <span className={`font-bold flex-shrink-0 ${m.intent.type === 'DEFEND' ? 'text-[#38B6FF]' : 'text-[#F4B41A]'}`}>
                          {m.intent.type === 'DEFEND' ? `+${m.intent.block ?? 25}` : m.intent.damage}
                        </span>
                      </div>
                      <div className="kk-hud-intent__charge">
                        <div
                          className={`kk-hud-intent__bar ${intentCritical ? 'kk-hud-intent__bar--critical' : ''}`}
                          style={{ width: `${intentProgress}%` }}
                        />
                      </div>
                    </div>

                    {m.affix && (
                      <span className="kk-hud-plate__affix" style={{ borderColor: affixColor, color: affixColor }}>
                        {m.affix}
                      </span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* VICTORY, EXPEDITION PROGRESS, OR DEFEAT OVERLAY MODAL */}
      {battleStatus !== 'FIGHTING' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1A1926] border-4 border-[#F4B41A] p-8 max-w-md w-full text-center rounded shadow-pixel-box-gold">
            {pendingCardUnlocks.length > 0 && (
              <div className="mb-3 text-[10px] font-pixel text-[#F4B41A] animate-pulse">
                ✦ {pendingCardUnlocks.length} NEW CARD{pendingCardUnlocks.length > 1 ? 'S' : ''} UNLOCKED ✦
              </div>
            )}
            {masteryCount > 0 && (
              <div className="mb-3 text-[10px] font-pixel text-[#00EB88] animate-pulse">
                ✦ {masteryCount} MASTERY LEVEL UP{masteryCount > 1 ? 'S' : ''} ✦
              </div>
            )}
            {battleStatus === 'ENCOUNTER_CLEARED' ? (
              <>
                <Swords className="w-14 h-14 text-[#00EB88] mx-auto mb-3 animate-bounce" />
                <h2 className="font-pixel text-base text-[#00EB88] mb-1">
                  ENCOUNTER {expeditionStep + 1} / {expeditionEncounters.length} CLEARED!
                </h2>
                <p className="text-xs text-[#A7A9BE] font-mono mb-4">
                  Squad defeated! Catch thy breath before the next battle.
                </p>
                <div className="bg-[#0F0E17] border-2 border-[#00EB88] p-3 rounded text-center mb-6">
                  {breatherHeal > 0 && (
                    <span className="block text-xs font-pixel text-[#00EB88]">
                      ❤️ +{breatherHeal} HEALTH RESTORED!
                    </span>
                  )}
                  <span className="block text-[11px] font-pixel text-[#F4B41A] mt-1">🪙 +{lastBankedGold} GOLD BANKED</span>
                  <RunXpLine xp={runXp} levelUps={runLevelUps} />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => continueReward(handleNextExpeditionEncounter)}
                    className="flex-1 bg-[#00EB88] hover:bg-[#55ffaa] text-[#0F0E17] font-pixel text-xs py-3 border-2 border-black shadow-pixel-box"
                  >
                    NEXT BATTLE ▶
                  </button>
                  <button
                    onClick={() => continueReward(onExitBattle)}
                    className="bg-[#2E2B44] text-white font-pixel text-xs py-3 px-4 border-2 border-black shadow-pixel-box"
                  >
                    TOWN HUB
                  </button>
                </div>
              </>
            ) : battleStatus === 'EXPEDITION_VICTORY' ? (
              <>
                <Trophy className="w-16 h-16 text-[#F4B41A] mx-auto mb-3 animate-bounce" />
                <h2 className="font-pixel text-lg text-[#F4B41A] mb-1">
                  LEVEL {currentLevel} CONQUERED!
                </h2>
                <p className="text-xs text-[#A7A9BE] font-mono mb-3">
                  All {expeditionEncounters.length} encounters in the expedition vanquished!
                </p>
                {currentLevel >= 5 && (
                  <div className="bg-[#F4B41A]/10 border-2 border-[#F4B41A] p-2 rounded text-center mb-3">
                    <span className="text-[10px] font-pixel text-[#F4B41A] flex items-center justify-center gap-1">
                      👑 MAP CONQUERED! NEW DESTINATION UNLOCKED!
                    </span>
                  </div>
                )}
                <div className="bg-[#0F0E17] border-2 border-[#F4B41A] p-3 rounded text-center mb-6">
                  <span className="text-[11px] font-pixel text-[#00EB88]">
                    🪙 +{(getMapConfig(currentMap).levels.find((l) => l.level === currentLevel)?.goldReward || 200) + runGold} GOLD
                  </span>
                  <span className="block text-[8px] font-pixel text-[#A7A9BE] mt-1">
                    {getMapConfig(currentMap).levels.find((l) => l.level === currentLevel)?.goldReward || 200} CLEAR REWARD • {runGold} FROM REPS
                  </span>
                  <RunXpLine xp={runXp} levelUps={runLevelUps} />
                </div>
                {secretCall && onSecretTrial ? (
                  <>
                    <div
                      className="border-2 p-3 rounded text-center mb-4 -mt-2 animate-pulse"
                      style={{ borderColor: SECRET_TRIAL_COPY[secretCall].bar[1], background: `${SECRET_TRIAL_COPY[secretCall].accent}1A` }}
                    >
                      <span className="block text-[10px] font-pixel" style={{ color: SECRET_TRIAL_COPY[secretCall].bar[1] }}>{SECRET_TRIAL_COPY[secretCall].callTitle}</span>
                      <span className="block text-[9px] font-mono text-[#A7A9BE] mt-1">{SECRET_TRIAL_COPY[secretCall].callLine}</span>
                    </div>
                    <button
                      onClick={() => continueReward(() => onSecretTrial(secretCall))}
                      className="w-full hover:brightness-110 text-[#0F0E17] font-pixel text-xs py-3 border-2 border-black shadow-pixel-box"
                      style={{ background: SECRET_TRIAL_COPY[secretCall].bar[1] }}
                    >
                      {SECRET_TRIAL_COPY[secretCall].callButton}
                    </button>
                  </>
                ) : (
                <div className="flex gap-3">
                  {currentLevel < 5 ? (
                    <button
                      onClick={() => continueReward(handleNextLevelExpedition)}
                      className="flex-1 bg-[#F4B41A] hover:bg-[#ffe175] text-[#0F0E17] font-pixel text-xs py-3 border-2 border-black shadow-pixel-box"
                    >
                      LEVEL {currentLevel + 1} ▶
                    </button>
                  ) : (
                    <button
                      onClick={() => continueReward(onExitBattle)}
                      className="flex-1 bg-[#F4B41A] hover:bg-[#ffe175] text-[#0F0E17] font-pixel text-xs py-3 border-2 border-black shadow-pixel-box"
                    >
                      WORLD MAP ▶
                    </button>
                  )}
                  <button
                    onClick={() => continueReward(onExitBattle)}
                    className="bg-[#2E2B44] text-white font-pixel text-xs py-3 px-4 border-2 border-black shadow-pixel-box"
                  >
                    TOWN HUB
                  </button>
                </div>
                )}
              </>
            ) : battleStatus === 'VICTORY' ? (
              <>
                <Trophy className="w-16 h-16 text-[#F4B41A] mx-auto mb-3 animate-bounce" />
                <h2 className="font-pixel text-lg text-[#F4B41A] mb-2">ENCOUNTER CLEARED!</h2>
                <p className="text-xs text-[#A7A9BE] font-mono mb-4">
                  All monsters in the squad were vanquished by your relentless physical output.
                </p>
                <div className="bg-[#0F0E17] border-2 border-[#F4B41A] p-3 rounded text-center mb-6">
                  <span className="block text-[11px] font-pixel text-[#F4B41A]">🪙 +{lastBankedGold} GOLD BANKED</span>
                  <RunXpLine xp={runXp} levelUps={runLevelUps} />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => continueReward(handleNextEncounter)}
                    className="flex-1 bg-[#F4B41A] hover:bg-[#ffe175] text-[#0F0E17] font-pixel text-xs py-3 border-2 border-black shadow-pixel-box"
                  >
                    NEXT BATTLE ▶
                  </button>
                  <button
                    onClick={() => continueReward(onExitBattle)}
                    className="bg-[#2E2B44] text-white font-pixel text-xs py-3 px-4 border-2 border-black shadow-pixel-box"
                  >
                    TOWN HUB
                  </button>
                </div>
              </>
            ) : (
              <>
                <Skull className="w-16 h-16 text-[#FF3366] mx-auto mb-3" />
                <h2 className="font-pixel text-lg text-[#FF3366] mb-2">EXPEDITION FAILED!</h2>
                <p className="text-xs text-[#A7A9BE] font-mono mb-6">
                  {isExpeditionMode
                    ? `Sir Kettleburne fell on Encounter ${expeditionStep + 1} of ${expeditionEncounters.length}. Rest and recover before attempting the run again.`
                    : 'The monster squad overwhelmed Sir Kettleburne. Rest and recover before trying again.'}
                </p>
                <div className="bg-[#0F0E17] border-2 border-[#C084FC] p-3 rounded text-center mb-6 -mt-3">
                  <RunXpLine xp={runXp} levelUps={runLevelUps} />
                  {forfeitedGold > 0 && (
                    <span className="block text-[10px] font-pixel text-[#FF3366] mt-1">🪙 {forfeitedGold} GOLD FORFEITED</span>
                  )}
                  <span className="block text-[9px] font-mono text-[#A7A9BE] mt-1">
                    Every monster slain still counts. Level up, train thy spells, or swing harder.
                  </span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => continueReward(isExpeditionMode ? handleRetryExpedition : handleNextEncounter)}
                    className="flex-1 bg-[#FF3366] hover:bg-[#ff5588] text-white font-pixel text-xs py-3 border-2 border-black shadow-pixel-box"
                  >
                    RETRY EXPEDITION
                  </button>
                  <button
                    onClick={() => continueReward(onExitBattle)}
                    className="bg-[#2E2B44] text-white font-pixel text-xs py-3 px-4 border-2 border-black shadow-pixel-box"
                  >
                    TOWN HUB
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {paused && (
        <PauseMenu
          fightGold={fightGold}
          onResume={() => setPaused(false)}
          onQuit={() => {
            setPaused(false);
            onExitBattle();
          }}
        />
      )}

      {/* Reward step two: the cards unlocked this fight, one by one */}
      {rewardStep === 'unlocks' && pendingCardUnlocks.length > 0 && (
        <CardUnlockCelebration unlockedCards={pendingCardUnlocks} onDismiss={finishUnlocks} />
      )}
      {/* Reward step three: spells and weapons that levelled up this fight */}
      {rewardStep === 'mastery' && pendingMastery.length > 0 && (
        <MasteryCelebration levelUps={pendingMastery} loadout={loadoutRef.current} onDismiss={finishUnlocks} />
      )}

      {/* BOTTOM SLAY THE SPIRE 5-CARD HAND */}
      <div className="w-full mx-auto">
        <div className="flex items-end justify-between gap-4 px-2 -mb-3">
          {/* BATTLE DISPATCH: where we are and what just happened */}
          <div className="kk-hud-dispatch px-3 py-1.5 min-w-0 max-w-[45%]">
            <span className="font-pixel text-[7px] text-[#A7A9BE] flex items-center gap-1.5 mb-0.5 truncate">
              <Users className="w-2.5 h-2.5 text-[#FF3366] flex-shrink-0" />
              {isExpeditionMode ? (
                <>
                  <span className="text-[#F4B41A]">{currentMap.replace(/_/g, ' ')} • LVL {currentLevel}</span>
                  <span className="text-white">BATTLE {expeditionStep + 1}/{expeditionEncounters.length}</span>
                </>
              ) : (
                <>
                  {ENCOUNTERS[currentEncounterIndex]?.map && (
                    <span className="text-[#FF3366]">{ENCOUNTERS[currentEncounterIndex].map!.replace(/_/g, ' ')}</span>
                  )}
                  <span className="text-white truncate">
                    {ENCOUNTERS[currentEncounterIndex]?.name.toUpperCase() || 'ENCOUNTER'} ({monsters.filter(m => m.currentHp > 0).length}/{monsters.length})
                  </span>
                </>
              )}
            </span>
            <p className="font-mono text-[11px] leading-tight text-[#F4B41A] truncate">{recentCombatLog}</p>
          </div>
          <span className="font-pixel text-[9px] text-[#38B6FF] bg-[#0F0E17]/80 px-2 py-1 border border-[#2E2B44] flex-shrink-0">
            {monsters.filter(m => m.currentHp > 0).length > 1 && <>[▲ / ▼] TARGET • </>}
            [◀ / ▶] SELECT • [ENTER] HOW TO • [SPACE] DEMO REP
          </span>
        </div>

        {/* Hand of cards (CombatCardView), fanned; the focused card lifts */}
        <div className="kk-hand">
          {hand.map((card, index) => (
            <CombatCardView
              key={card.id}
              card={card}
              index={index}
              handSize={hand.length}
              focused={focusedCardIndex === index}
              flipped={flippedCardId === card.id}
              castGhost={castFx.find((f) => f.index === index)?.card}
              dealDelayMs={castFx.some((f) => f.index === index) ? 480 : undefined}
              onCastDone={() => setCastFx((prev) => prev.filter((f) => f.index !== index))}
              onSelect={() => (focusedCardIndex === index ? toggleFlip(card.id) : setFocusedCardIndex(index))}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/** STR / SPD (rep cut and dodge) / Attack under the knight's HP bar, the run's experience and the fight's gold purse. */
/** STR / SPD (rep cut and dodge) / Attack under the knight's HP bar, the run's experience and the fight's gold purse. */
const KnightStatLine: React.FC<{ loadout: Loadout; runXp: number; fightGold: number }> = ({ loadout, runXp, fightGold }) => {
  const profile = profileManager.getActiveProfile();
  const xpPct = profile ? Math.min(100, (profile.xp / Math.max(1, profile.maxXp)) * 100) : 0;
  const w = loadout.weapon;
  return (
    <div className="pt-1.5 space-y-1">
      <div className="kk-hud-vial h-1.5" title={`Experience to next level: ${Math.round(xpPct)}%`}>
        <div className="kk-hud-vial__bar bg-gradient-to-r from-[#9333EA] to-[#C084FC]" style={{ width: `${xpPct}%` }} />
      </div>
      <div className="flex items-center justify-between font-pixel text-[7px] text-[#A7A9BE] px-0.5">
        <span style={{ color: STAT_INFO.str.color }}>ATK {loadout.attack}</span>
        {w.element && (
          <span style={{ color: ELEMENT_INFO[w.element].color }}>
            {ELEMENT_INFO[w.element].icon} +{w.elemDmg}
          </span>
        )}
        <span style={{ color: STAT_INFO.spd.color }}>
          SPD {loadout.stats.spd} (−{Math.round(loadout.repCut * 100)}% REPS)
        </span>
        {runXp > 0 && <span className="text-[#C084FC]">+{runXp} XP</span>}
        <span className="text-[#F4B41A]" title="Gold from this fight's reps: kept only if you win">🪙 {fightGold}</span>
      </div>
    </div>
  );
};

/** Experience earned this run and the level-ups it bought. */
const RunXpLine: React.FC<{ xp: number; levelUps: LevelUpEvent[] }> = ({ xp, levelUps }) => (
  <span className="block text-[11px] font-pixel text-[#C084FC] mt-1">
    +{xp} XP
    {levelUps.length > 0 && (
      <span className="block text-[9px] text-[#F4B41A] mt-1">
        LEVEL {levelUps[levelUps.length - 1].level}! {levelUps.map((u) => `+${u.gain} ${STAT_INFO[u.stat].label}`).join(' • ')}
      </span>
    )}
  </span>
);
