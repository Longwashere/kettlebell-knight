import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CombatCard, MonsterState, BattleState, MonsterIntent, MONSTER_CATALOG, ENCOUNTERS, EncounterTemplate, CARD_CATALOG, BattleMapId } from '../../types/battle';
import { MOVESETS, rollIntent, createEncounterFromTemplate } from '../../shared/monsterMovesets';
import { resolveCard, frontTarget } from '../../shared/combat';
import { PLAYER_MAX_HP } from '../../shared/combatRules';
import type { ImpactResult } from '../engine/monsterMoves';
import { ExerciseType, RepTelemetry } from '../../types/game';
import { CardDeckManager } from '../../shared/CardDeckManager';
import { ALL_WEAPON_SPELLS } from '../../types/weaponSpells';
import { audioManager } from '../../shared/AudioManager';
import { GameEngine, BATTLE_MAPS } from '../engine/GameEngine';
import { useTVRemote } from '../hooks/useTVRemote';
import { registerDebug } from '../debug/agentBridge';
import { getMapConfig, getExpeditionEncounters, getNextCampaignMap } from '../../shared/expeditionEngine';
import { profileManager } from '../../shared/ProfileManager';
import { CombatCardView } from './CombatCardView';
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
  Target,
  Users
} from 'lucide-react';

interface BattleScreenProps {
  engineRef: React.RefObject<GameEngine | null>;
  isEngineReady?: boolean;
  weaponId?: string; // equipped weapon: its spells join the deck
  expeditionMapId?: BattleMapId;
  expeditionLevel?: number;
  onExitBattle: () => void;
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
  expeditionMapId,
  expeditionLevel,
  onExitBattle,
  onBattleStateSync,
}) => {
  // Deck Manager initialized
  const deckManagerRef = useRef<CardDeckManager>(new CardDeckManager(weaponId));
  const weaponIdRef = useRef(weaponId);
  weaponIdRef.current = weaponId;

  // Combat State
  const [playerHp, setPlayerHp] = useState<number>(PLAYER_MAX_HP);
  const playerMaxHp = PLAYER_MAX_HP;
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

  // Expedition vs Standalone Encounters
  const isExpeditionMode = Boolean(expeditionMapId);
  const [currentMap, setCurrentMap] = useState<BattleMapId>(expeditionMapId || 'VERDANT_FOREST');
  const [currentLevel, setCurrentLevel] = useState<number>(expeditionLevel || 1);
  const [expeditionStep, setExpeditionStep] = useState<number>(0);
  const [totalLevelReps, setTotalLevelReps] = useState<number>(0);

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
        const newMonsters = createEncounterFromTemplate(first);
        commitMonsters(newMonsters);
        setPlayerBlock(0);
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
      if (list.length > 0) return createEncounterFromTemplate(list[0]);
    }
    return createEncounterFromTemplate(ENCOUNTERS[safeEncounterIndex]);
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

  // Initialize Battle & Sync with Engine
  useEffect(() => {
    const initialHand = deckManagerRef.current.dealInitialHand();
    setHand(initialHand);
    if (engineRef.current) {
      const curEnc = isExpeditionMode
        ? (expeditionEncounters[expeditionStep] || expeditionEncounters[0])
        : ENCOUNTERS[currentEncounterIndex];
      const customBg = curEnc?.background ?? (curEnc?.map ? BATTLE_MAPS[curEnc.map] : undefined);
      engineRef.current.setMonsters(monsters, customBg);
    }
    audioManager.play('level_up');
  }, [currentEncounterIndex, expeditionStep, isEngineReady, engineRef]);

  // Leaving battle: remove monsters from the stage and free their rigs
  useEffect(() => {
    return () => engineRef.current?.clearMonsters();
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

  // Real-Time Multi-Monster Attack ATB Timer Loop
  useEffect(() => {
    if (battleStatus !== 'FIGHTING') return;

    let lastTime = performance.now();
    const interval = setInterval(() => {
      if (battleStatusRef.current !== 'FIGHTING') return;

      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      if (atbFrozenRef.current) return;

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
    if (battleStatusRef.current !== 'FIGHTING') return;

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

      // The attack plays at the foes hit, in order (e.g. the back row for BACK cards). The knight move
      // lands each hit on its impact frame; damage labels and deaths show then.
      if (engine) {
        const showHit = (hit: (typeof res.hits)[number]) => {
          const tags = [hit.blocked ? `(${hit.blocked} blocked)` : '', card.shatter ? 'SHATTER' : '', hit.staggered ? `STAGGER +${hit.staggered}s` : ''].filter(Boolean).join(' ');
          engine.spawnMonsterText(hit.index, `-${hit.damage}`, hit.damage > 0 ? 0xFF3366 : 0x38B6FF, 12);
          if (tags) engine.spawnMonsterText(hit.index, tags, 0xF4B41A, 7, 14);
          if (hit.killed) engine.playMonsterDeath(hit.index);
        };
        engine.onRepCompleted(result.power, result.form, exercise, card.name, primary ? primary.damage + primary.blocked : 0, {
          move: card.templateId,
          ctx: { block: res.block, heal: res.heal },
          targets: res.hits.map((hit) => hit.index),
          onImpact: (i) => showHit(res.hits[i]),
          stagger: card.target === 'CHAIN' ? 8 : 2,
        });
      }

      commitMonsters(res.monsters);

      if (res.monsters.every((m) => m.currentHp <= 0)) {
        if (isExpeditionMode && expeditionStep < expeditionEncounters.length - 1) {
          // Breather between encounters: +20 HP catch breath heal
          const heal = Math.min(PLAYER_MAX_HP, playerHpRef.current + 20) - playerHpRef.current;
          playerHpRef.current += heal;
          setPlayerHp(playerHpRef.current);
          battleStatusRef.current = 'ENCOUNTER_CLEARED';
          setBattleStatus('ENCOUNTER_CLEARED');
          setRecentCombatLog(`Encounter ${expeditionStep + 1} of ${expeditionEncounters.length} Cleared! Catch thy breath (+${heal} HP)!`);
          audioManager.play('victory', { delay: 0.3 });
          window.setTimeout(() => engineRef.current?.playKnightVictory?.(), 300);
        } else if (isExpeditionMode) {
          // Entire Level Conquered!
          battleStatusRef.current = 'EXPEDITION_VICTORY';
          setBattleStatus('EXPEDITION_VICTORY');
          setRecentCombatLog(`Level ${currentLevel} Expedition Conquered! All enemies vanquished!`);
          audioManager.play('victory', { delay: 0.5 });
          window.setTimeout(() => engineRef.current?.playKnightVictory?.(), 400);

          // Save progression
          const mapCfg = getMapConfig(currentMap);
          const lvlCfg = mapCfg.levels.find((l) => l.level === currentLevel) || mapCfg.levels[0];
          const nextMap = currentLevel >= 5 ? getNextCampaignMap(currentMap) : undefined;
          profileManager.recordLevelVictory(
            currentMap,
            currentLevel,
            totalLevelReps + 1,
            lvlCfg.goldReward,
            lvlCfg.xpReward,
            nextMap || undefined
          );
        } else {
          battleStatusRef.current = 'VICTORY';
          setBattleStatus('VICTORY');
          setRecentCombatLog(`Victory! All enemies in the encounter have been vanquished!`);
          audioManager.play('victory', { delay: 0.5 });
          window.setTimeout(() => engineRef.current?.playKnightVictory?.(), 400);
        }
      } else if (res.monsters[targetedIndexRef.current]?.currentHp <= 0) {
        // Target died: move to the next living foe, front row first
        const next = frontTarget(res.monsters);
        if (next !== -1) setTargetedMonsterIndex(next);
      }

      if (res.block > 0) {
        playerBlockRef.current += res.block;
        setPlayerBlock(playerBlockRef.current);
        engine?.playerShieldPulse?.();
      }
      if (res.heal > 0) {
        const healed = Math.min(PLAYER_MAX_HP, playerHpRef.current + res.heal) - playerHpRef.current;
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
    } else {
      audioManager.play('hike', { vol: 0.7 }); // rep counted toward a card
    }

    setHand(result.hand);
  }, [engineRef, isExpeditionMode, expeditionStep, expeditionEncounters, currentMap, currentLevel, totalLevelReps]);

  // Expose rep callback for NetworkManager telemetry
  useEffect(() => {
    (window as any).__onKettlebellRepCompleted = handleApplyRep;
    return () => {
      delete (window as any).__onKettlebellRepCompleted;
    };
  }, [handleApplyRep]);

  // Advance to next encounter within current expedition
  const handleNextExpeditionEncounter = () => {
    const nextStep = expeditionStep + 1;
    if (nextStep < expeditionEncounters.length) {
      setExpeditionStep(nextStep);
      const nextTemplate = expeditionEncounters[nextStep];
      const newMonsters = createEncounterFromTemplate(nextTemplate);
      commitMonsters(newMonsters);
      setTargetedMonsterIndex(0);
      setPlayerBlock(0); // block resets between fights, but HP carries over!
      setBattleStatus('FIGHTING');
      battleStatusRef.current = 'FIGHTING';
      engineRef.current?.resetKnight?.();
      const customBg = nextTemplate.background ?? (nextTemplate.map ? BATTLE_MAPS[nextTemplate.map] : undefined);
      engineRef.current?.setMonsters(newMonsters, customBg);
      deckManagerRef.current.initDeck(weaponIdRef.current);
      setHand(deckManagerRef.current.dealInitialHand());
      setRecentCombatLog(`Encounter ${nextStep + 1} of ${expeditionEncounters.length} commenced!`);
      audioManager.play('level_up');
    }
  };

  // Retry failed expedition from encounter 1
  const handleRetryExpedition = () => {
    setExpeditionStep(0);
    const firstTemplate = expeditionEncounters[0];
    const newMonsters = createEncounterFromTemplate(firstTemplate);
    commitMonsters(newMonsters);
    setTargetedMonsterIndex(0);
    setPlayerHp(PLAYER_MAX_HP);
    playerHpRef.current = PLAYER_MAX_HP;
    setPlayerBlock(0);
    playerBlockRef.current = 0;
    setBattleStatus('FIGHTING');
    battleStatusRef.current = 'FIGHTING';
    engineRef.current?.resetKnight?.();
    const customBg = firstTemplate.background ?? (firstTemplate.map ? BATTLE_MAPS[firstTemplate.map] : undefined);
    engineRef.current?.setMonsters(newMonsters, customBg);
    deckManagerRef.current.initDeck(weaponIdRef.current);
    setHand(deckManagerRef.current.dealInitialHand());
    setRecentCombatLog('Expedition restarted! Ready thy bell.');
    audioManager.play('level_up');
  };

  // Advance to next Level after conquering current level
  const handleNextLevelExpedition = () => {
    if (currentLevel < 5) {
      const nextLvl = currentLevel + 1;
      setCurrentLevel(nextLvl);
      setExpeditionStep(0);
      const nextList = getExpeditionEncounters(currentMap, nextLvl);
      const firstTemplate = nextList[0];
      const newMonsters = createEncounterFromTemplate(firstTemplate);
      commitMonsters(newMonsters);
      setTargetedMonsterIndex(0);
      setPlayerHp(PLAYER_MAX_HP);
      playerHpRef.current = PLAYER_MAX_HP;
      setPlayerBlock(0);
      playerBlockRef.current = 0;
      setBattleStatus('FIGHTING');
      battleStatusRef.current = 'FIGHTING';
      engineRef.current?.resetKnight?.();
      const customBg = firstTemplate.background ?? (firstTemplate.map ? BATTLE_MAPS[firstTemplate.map] : undefined);
      engineRef.current?.setMonsters(newMonsters, customBg);
      deckManagerRef.current.initDeck(weaponIdRef.current);
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
    setCurrentEncounterIndex(index);
    const newMonsters = createEncounterFromTemplate(template);

    commitMonsters(newMonsters);
    setTargetedMonsterIndex(0);
    setPlayerHp(100);
    setPlayerBlock(0);
    setBattleStatus('FIGHTING');
    engineRef.current?.resetKnight?.();
    deckManagerRef.current.initDeck(weaponIdRef.current);
    setHand(deckManagerRef.current.dealInitialHand());
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
      playerBlock,
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
        alive: m.isAlive,
        intent: { name: m.intent.name, type: m.intent.type, remaining: Number(m.intent.remainingSeconds.toFixed(2)) },
      })),
      hand: hand.map((c) => ({ name: c.name, exercise: c.exercise, currentReps: c.currentReps, requiredReps: c.requiredReps })),
      highlightedCard: focusedCardIndex,
      manualFocus,
      // Card that remote actions (Enter / Space / __kk.rep()) target
      focusedCard: hand[actionCardIndex]
        ? { index: actionCardIndex, name: hand[actionCardIndex].name, exercise: hand[actionCardIndex].exercise,
            currentReps: hand[actionCardIndex].currentReps, requiredReps: hand[actionCardIndex].requiredReps }
        : null,
      frozen: atbFrozenRef.current,
      flippedCard: flippedCardId,
      log: recentCombatLog,
    }),
    {
      // ENCOUNTERS id or index, or an ad-hoc list of MONSTER_CATALOG ids / sprite types (e.g. ['wolf', 'BOAR'])
      encounter: (which: string | number | string[]) => {
        if (Array.isArray(which)) {
          const monsterIds = which.map((w) => {
            const cat = MONSTER_CATALOG.find((c) => c.id === w || c.spriteType === w.toUpperCase());
            if (!cat) throw new Error(`Unknown monster "${w}". Known: ${MONSTER_CATALOG.map((c) => c.id).join(', ')}`);
            return cat.id;
          });
          const template: EncounterTemplate = { id: 'debug', name: 'Debug Encounter', description: '', monsterIds };
          startEncounter(template, currentEncounterIndex);
          engineRef.current?.setMonsters(createEncounterFromTemplate(template));
          return;
        }
        // A single monster id (e.g. 'kraken') that isn't an encounter id starts a solo fight with it
        if (typeof which === 'string' && !ENCOUNTERS.some((e) => e.id === which) && MONSTER_CATALOG.some((c) => c.id === which || c.spriteType === which.toUpperCase())) {
          const cat = MONSTER_CATALOG.find((c) => c.id === which || c.spriteType === which.toUpperCase())!;
          const template: EncounterTemplate = { id: 'debug', name: 'Debug Encounter', description: '', monsterIds: [cat.id] };
          startEncounter(template, currentEncounterIndex);
          engineRef.current?.setMonsters(createEncounterFromTemplate(template));
          return;
        }
        const index = typeof which === 'number' ? which : ENCOUNTERS.findIndex((e) => e.id === which);
        if (!ENCOUNTERS[index]) throw new Error(`Unknown encounter "${which}". Known: ${ENCOUNTERS.map((e) => e.id).join(', ')}`);
        startEncounter(ENCOUNTERS[index], index);
        if (index === currentEncounterIndex) {
          const enc = ENCOUNTERS[index];
          const customBg = enc?.background ?? (enc?.map ? BATTLE_MAPS[enc.map] : undefined);
          engineRef.current?.setMonsters(createEncounterFromTemplate(ENCOUNTERS[index]), customBg);
        }
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
      focusCard: (index: number) => setFocusedCardIndex(Math.max(0, Math.min(hand.length - 1, index))),
      // Deck contents (template ids) and the equipped weapon whose spells it carries
      deck: () => ({ weaponId: weaponIdRef.current, cards: deckManagerRef.current.debugDeck() }),
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
          handleNextExpeditionEncounter();
        } else if (battleStatus === 'EXPEDITION_VICTORY') {
          handleNextLevelExpedition();
        } else if (battleStatus === 'DEFEAT') {
          if (isExpeditionMode) {
            handleRetryExpedition();
          } else {
            handleNextEncounter();
          }
        } else {
          handleNextEncounter();
        }
      } else {
        setFocusedCardIndex(actionCardIndex);
        toggleFlip(hand[actionCardIndex]?.id);
      }
    },
    onBack: () => {
      onExitBattle();
    },
    onDemoSwing: () => {
      if (hand.length > 0) {
        const focusedCard = hand[actionCardIndex];
        if (focusedCard) {
          handleApplyRep(focusedCard.exercise, 90 + Math.floor(Math.random() * 20), 1.0);
        }
      }
    },
  });

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 pointer-events-auto select-none">
      {/* TOP COMBAT HUD: PLAYER (LEFT) VS MONSTER (RIGHT) */}
      <div className="flex items-start justify-between w-full">
        {/* PLAYER STATUS (LEFT) */}
        <div className="bg-[#1A1926]/95 border-4 border-[#38B6FF] p-4 rounded shadow-pixel-box backdrop-blur-md max-w-sm w-full">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="font-pixel text-xs text-[#F4B41A]">SIR KETTLEBURNE</span>
              <span className="text-[9px] bg-[#38B6FF]/20 text-[#38B6FF] font-pixel px-1.5 border border-[#38B6FF]">
                LVL 12
              </span>
            </div>
            {playerBlock > 0 && (
              <div className="flex items-center space-x-1 bg-[#38B6FF] text-[#0F0E17] px-2 py-0.5 rounded font-pixel text-[10px] shadow-pixel-box animate-pulse">
                <Shield className="w-3.5 h-3.5" />
                <span>{playerBlock} BLOCK</span>
              </div>
            )}
          </div>

          {/* HP Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-[#A7A9BE]">
              <span>HEALTH</span>
              <span className="font-bold text-white">{playerHp} / {playerMaxHp}</span>
            </div>
            <div className="w-full h-4 bg-[#0F0E17] border-2 border-[#2E2B44] overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-[#FF3366] to-[#00EB88] transition-all duration-300"
                style={{ width: `${(playerHp / playerMaxHp) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* COMBAT LOG BANNER (CENTER) */}
        <div className="hidden lg:block bg-[#0F0E17]/90 border-2 border-[#2E2B44] px-4 py-2 rounded shadow-pixel-box max-w-md text-center">
          <span className="font-pixel text-[9px] text-[#A7A9BE] block mb-0.5">BATTLE DISPATCH</span>
          <p className="font-mono text-xs text-[#F4B41A] truncate">{recentCombatLog}</p>
        </div>

        {/* MULTI-MONSTER STATUS & REAL-TIME INTENT SQUAD (RIGHT) */}
        <div className="flex flex-col gap-2 max-w-sm w-full">
          {/* Header indicator */}
          <div className="flex items-center justify-between px-1">
            <span className="font-pixel text-[9px] text-[#A7A9BE] flex items-center gap-1.5">
              <Users className="w-3 h-3 text-[#FF3366]" />
              {isExpeditionMode ? (
                <>
                  <span className="text-[#F4B41A] font-bold">
                    [{currentMap.replace(/_/g, ' ')} • LVL {currentLevel}]
                  </span>
                  <span className="text-white font-bold">
                    BATTLE {expeditionStep + 1}/{expeditionEncounters.length}
                  </span>
                </>
              ) : (
                <>
                  {ENCOUNTERS[currentEncounterIndex]?.map && (
                    <span className="text-[#FF3366] font-bold">
                      [{ENCOUNTERS[currentEncounterIndex].map!.replace(/_/g, ' ')}]
                    </span>
                  )}
                  {ENCOUNTERS[currentEncounterIndex]?.name.toUpperCase() || 'ENCOUNTER'} ({monsters.filter(m => m.currentHp > 0).length}/{monsters.length})
                </>
              )}
            </span>
            {monsters.filter(m => m.currentHp > 0).length > 1 && (
              <span className="font-pixel text-[8px] text-[#F4B41A] flex items-center gap-1">
                <Target className="w-2.5 h-2.5" /> [▲/▼] TARGET
              </span>
            )}
          </div>

          {/* Monster Cards List */}
          {monsters.map((m, idx) => {
            const isTargeted = idx === targetedMonsterIndex;
            const isDead = m.currentHp <= 0;

            return (
              <div
                key={m.instanceId || idx}
                onClick={() => !isDead && setTargetedMonsterIndex(idx)}
                className={`bg-[#1A1926]/95 border-2 rounded p-2.5 shadow-pixel-box backdrop-blur-md transition-all duration-150 cursor-pointer ${
                  isDead
                    ? 'opacity-35 grayscale border-[#2E2B44]'
                    : isTargeted
                    ? 'border-[#F4B41A] ring-2 ring-[#F4B41A]/60 scale-102 bg-[#252238]/95'
                    : 'border-[#FF3366]/60 hover:border-[#FF3366]'
                }`}
              >
                {/* Name, Target Badge, & Block */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {isTargeted && !isDead && (
                      <span className="bg-[#F4B41A] text-[#0F0E17] font-pixel text-[7px] px-1 py-0.2 rounded font-bold animate-pulse">
                        TARGET 🎯
                      </span>
                    )}
                    <span className={`font-pixel text-[10px] ${isTargeted ? 'text-[#F4B41A]' : 'text-[#FF3366]'}`}>
                      {m.name}
                    </span>
                    <span className="font-pixel text-[7px] text-[#A7A9BE]">
                      LVL {m.level}
                    </span>
                    {m.affix && !isDead && (
                      <span
                        className="font-pixel text-[7px] px-1 py-0.2 rounded border uppercase font-bold"
                        style={{
                          borderColor: m.outlineColor ? `#${m.outlineColor.toString(16).padStart(6, '0')}` : '#F4B41A',
                          color: m.outlineColor ? `#${m.outlineColor.toString(16).padStart(6, '0')}` : '#F4B41A',
                          backgroundColor: 'rgba(0,0,0,0.5)',
                        }}
                      >
                        {m.affix}
                      </span>
                    )}
                  </div>

                  {m.block > 0 && !isDead && (
                    <div className="flex items-center space-x-1 bg-[#FF3366] text-white px-1.5 py-0.2 rounded font-pixel text-[8px] shadow-pixel-box">
                      <Shield className="w-2.5 h-2.5" />
                      <span>{m.block}</span>
                    </div>
                  )}

                  {isDead && (
                    <span className="font-pixel text-[8px] text-[#A7A9BE] flex items-center gap-1">
                      <Skull className="w-3 h-3 text-[#A7A9BE]" /> SLAIN
                    </span>
                  )}
                </div>

                {/* HP Bar */}
                {!isDead && (
                  <div className="space-y-0.5 mb-1.5">
                    <div className="flex justify-between text-[8px] font-mono text-[#A7A9BE]">
                      <span>HP</span>
                      <span className="font-bold text-white">{m.currentHp} / {m.maxHp}</span>
                    </div>
                    <div className="w-full h-2.5 bg-[#0F0E17] border border-[#2E2B44] overflow-hidden p-0.2">
                      <div
                        className="h-full bg-gradient-to-r from-[#DC2626] to-[#FF3366] transition-all duration-200"
                        style={{ width: `${(m.currentHp / m.maxHp) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Intent & Countdown Bar */}
                {!isDead && (
                  <div className="bg-[#0F0E17] border border-[#2E2B44] p-1.5 rounded">
                    <div className="flex items-center justify-between text-[8px] font-pixel text-[#FF3366] mb-0.5">
                      <span className="flex items-center gap-1 truncate max-w-[170px]">
                        <AlertTriangle className="w-2.5 h-2.5 text-[#FF3366] flex-shrink-0" />
                        {m.intent.name}
                      </span>
                      <span className="font-bold text-[#F4B41A] flex-shrink-0">
                        {m.intent.type === 'DEFEND' ? `+${m.intent.block ?? 25} SHIELD` : `${m.intent.damage} DMG`}
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-[#2E2B44] rounded overflow-hidden">
                      <div
                        className={`h-full transition-all duration-75 ${
                          m.intent.remainingSeconds < 1.2 ? 'bg-[#FF3366] animate-pulse' : 'bg-[#F4B41A]'
                        }`}
                        style={{
                          width: `${Math.max(0, (1 - m.intent.remainingSeconds / m.intent.durationSeconds) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
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
                  <span className="text-xs font-pixel text-[#00EB88]">
                    ❤️ +20 HEALTH RESTORED!
                  </span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleNextExpeditionEncounter}
                    className="flex-1 bg-[#00EB88] hover:bg-[#55ffaa] text-[#0F0E17] font-pixel text-xs py-3 border-2 border-black shadow-pixel-box"
                  >
                    NEXT BATTLE ▶
                  </button>
                  <button
                    onClick={onExitBattle}
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
                    +{getMapConfig(currentMap).levels.find((l) => l.level === currentLevel)?.goldReward || 200} GOLD • +{getMapConfig(currentMap).levels.find((l) => l.level === currentLevel)?.xpReward || 300} XP EARNED
                  </span>
                </div>
                <div className="flex gap-3">
                  {currentLevel < 5 ? (
                    <button
                      onClick={handleNextLevelExpedition}
                      className="flex-1 bg-[#F4B41A] hover:bg-[#ffe175] text-[#0F0E17] font-pixel text-xs py-3 border-2 border-black shadow-pixel-box"
                    >
                      LEVEL {currentLevel + 1} ▶
                    </button>
                  ) : (
                    <button
                      onClick={onExitBattle}
                      className="flex-1 bg-[#F4B41A] hover:bg-[#ffe175] text-[#0F0E17] font-pixel text-xs py-3 border-2 border-black shadow-pixel-box"
                    >
                      WORLD MAP ▶
                    </button>
                  )}
                  <button
                    onClick={onExitBattle}
                    className="bg-[#2E2B44] text-white font-pixel text-xs py-3 px-4 border-2 border-black shadow-pixel-box"
                  >
                    TOWN HUB
                  </button>
                </div>
              </>
            ) : battleStatus === 'VICTORY' ? (
              <>
                <Trophy className="w-16 h-16 text-[#F4B41A] mx-auto mb-3 animate-bounce" />
                <h2 className="font-pixel text-lg text-[#F4B41A] mb-2">ENCOUNTER CLEARED!</h2>
                <p className="text-xs text-[#A7A9BE] font-mono mb-4">
                  All monsters in the squad were vanquished by your relentless physical output.
                </p>
                <div className="bg-[#0F0E17] border-2 border-[#F4B41A] p-3 rounded text-center mb-6">
                  <span className="text-[10px] font-pixel text-[#00EB88]">+{monsters.length * 90} GOLD • +{monsters.length * 250} XP EARNED</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleNextEncounter}
                    className="flex-1 bg-[#F4B41A] hover:bg-[#ffe175] text-[#0F0E17] font-pixel text-xs py-3 border-2 border-black shadow-pixel-box"
                  >
                    NEXT BATTLE ▶
                  </button>
                  <button
                    onClick={onExitBattle}
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
                <div className="flex gap-3">
                  <button
                    onClick={isExpeditionMode ? handleRetryExpedition : handleNextEncounter}
                    className="flex-1 bg-[#FF3366] hover:bg-[#ff5588] text-white font-pixel text-xs py-3 border-2 border-black shadow-pixel-box"
                  >
                    RETRY EXPEDITION
                  </button>
                  <button
                    onClick={onExitBattle}
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

      {/* BOTTOM SLAY THE SPIRE 5-CARD HAND */}
      <div className="w-full mx-auto">
        <div className="flex justify-end px-2 -mb-3">
          <span className="font-pixel text-[9px] text-[#38B6FF] bg-[#0F0E17]/80 px-2 py-1 border border-[#2E2B44]">
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
