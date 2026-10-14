import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CombatCard, MonsterState, BattleState, MonsterIntent, MONSTER_CATALOG, ENCOUNTERS, EncounterTemplate } from '../../types/battle';
import { ExerciseType, RepTelemetry } from '../../types/game';
import { CardDeckManager } from '../../shared/CardDeckManager';
import { audioManager } from '../../shared/AudioManager';
import { GameEngine } from '../engine/GameEngine';
import { useTVRemote } from '../hooks/useTVRemote';
import { registerDebug } from '../debug/agentBridge';
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
  onExitBattle: () => void;
  onBattleStateSync?: (state: {
    hand: CombatCard[];
    monster: MonsterState;
    playerHp: number;
    playerBlock: number;
  }) => void;
}

const MONSTER_INTENTS: Record<string, MonsterIntent[]> = {
  green_slime: [
    { type: 'ATTACK', damage: 16, name: 'Slime Slap', description: 'Fast sticky smack', durationSeconds: 4.5, remainingSeconds: 4.5 },
    { type: 'HEAVY_ATTACK', damage: 28, name: 'Ooze Slam', description: 'Heavy crushing belly flop', durationSeconds: 6.0, remainingSeconds: 6.0 },
    { type: 'ATTACK', damage: 12, name: 'Acid Spit', description: 'Quick corrosive glob', durationSeconds: 3.5, remainingSeconds: 3.5 },
  ],
  treemon: [
    { type: 'ATTACK', damage: 22, name: 'Branch Whip', description: 'Heavy wooden fist strike', durationSeconds: 4.2, remainingSeconds: 4.2 },
    { type: 'HEAVY_ATTACK', damage: 38, name: 'Root Stomp', description: 'Earth-splitting shockwave', durationSeconds: 5.8, remainingSeconds: 5.8 },
    { type: 'DEFEND', damage: 0, name: 'Bark Skin', description: 'Hardens its bark (+25 Block)', durationSeconds: 4.0, remainingSeconds: 4.0 },
  ],
  boar: [
    { type: 'HEAVY_ATTACK', damage: 32, name: 'Gore Charge', description: 'Violent headlong tusk impale', durationSeconds: 5.2, remainingSeconds: 5.2 },
    { type: 'ATTACK', damage: 18, name: 'Tusk Slash', description: 'Quick upward tusk thrust', durationSeconds: 3.6, remainingSeconds: 3.6 },
    { type: 'DEFEND', damage: 0, name: 'Iron Bristles', description: 'Toughens coarse hide (+20 Block)', durationSeconds: 4.2, remainingSeconds: 4.2 },
  ],
  wolf: [
    { type: 'HEAVY_ATTACK', damage: 35, name: 'Throat Bite', description: 'Ferocious neck puncture', durationSeconds: 4.8, remainingSeconds: 4.8 },
    { type: 'ATTACK', damage: 20, name: 'Shadow Pounce', description: 'Agile leap from behind', durationSeconds: 3.2, remainingSeconds: 3.2 },
    { type: 'ATTACK', damage: 24, name: 'Predator Rake', description: 'Razor claw laceration', durationSeconds: 3.8, remainingSeconds: 3.8 },
  ],
  demon_monk: [
    { type: 'HEAVY_ATTACK', damage: 42, name: 'Abyssal Edict', description: 'Dark unholy necrotic blast', durationSeconds: 5.5, remainingSeconds: 5.5 },
    { type: 'ATTACK', damage: 26, name: 'Cursed Palm', description: 'Infused demonic strike', durationSeconds: 3.8, remainingSeconds: 3.8 },
    { type: 'DEFEND', damage: 0, name: 'Forbidden Ward', description: 'Dark sorcery shield (+28 Block)', durationSeconds: 4.0, remainingSeconds: 4.0 },
  ],
  hellhound: [
    { type: 'HEAVY_ATTACK', damage: 45, name: 'Twin Maul', description: 'Both heads bite at once', durationSeconds: 5.0, remainingSeconds: 5.0 },
    { type: 'ATTACK', damage: 24, name: 'Savage Frenzy', description: 'Wild snapping bites', durationSeconds: 3.2, remainingSeconds: 3.2 },
    { type: 'ATTACK', damage: 32, name: 'Hellfire Howl', description: 'Shockwave of scorching breath', durationSeconds: 4.5, remainingSeconds: 4.5 },
  ],
};

function createEncounterFromTemplate(template: EncounterTemplate): MonsterState[] {
  const counts: Record<string, number> = {};
  return template.monsterIds.map((mId, slotIndex) => {
    const cat = MONSTER_CATALOG.find(c => c.id === mId) || MONSTER_CATALOG[0];
    counts[mId] = (counts[mId] || 0) + 1;
    const count = counts[mId];
    const totalOfThisType = template.monsterIds.filter(id => id === mId).length;
    const suffix = totalOfThisType > 1 ? ` ${String.fromCharCode(64 + count)}` : '';

    const intents = MONSTER_INTENTS[cat.id] || MONSTER_INTENTS.green_slime;
    const rawIntent = intents[slotIndex % intents.length] || intents[0];
    const initialIntent = {
      ...rawIntent,
      remainingSeconds: rawIntent.durationSeconds + slotIndex * 0.85,
    };

    return {
      ...cat,
      name: `${cat.name}${suffix}`,
      instanceId: `${template.id}_${slotIndex}_${Date.now()}`,
      slotIndex,
      isAlive: true,
      currentHp: cat.maxHp,
      block: 0,
      intent: initialIntent,
    };
  });
}

export const BattleScreen: React.FC<BattleScreenProps> = ({
  engineRef,
  isEngineReady,
  onExitBattle,
  onBattleStateSync,
}) => {
  // Deck Manager initialized
  const deckManagerRef = useRef<CardDeckManager>(new CardDeckManager());

  // Combat State
  const [playerHp, setPlayerHp] = useState<number>(100);
  const [playerMaxHp] = useState<number>(100);
  const [playerBlock, setPlayerBlock] = useState<number>(0);
  const [hand, setHand] = useState<CombatCard[]>([]);
  const [focusedCardIndex, setFocusedCardIndex] = useState<number>(0);
  const [battleStatus, setBattleStatus] = useState<'FIGHTING' | 'VICTORY' | 'DEFEAT'>('FIGHTING');
  const [recentCombatLog, setRecentCombatLog] = useState<string>('Battle commenced! Perform exercises to cast cards.');

  // Multi-Monster Encounters (1 to 3 monsters simultaneously)
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialEncounterParam = parseInt(searchParams?.get('encounter') || '0', 10);
  const safeEncounterIndex = isNaN(initialEncounterParam) ? 0 : Math.max(0, Math.min(initialEncounterParam, ENCOUNTERS.length - 1));
  const [currentEncounterIndex, setCurrentEncounterIndex] = useState<number>(safeEncounterIndex);
  const [monsters, setMonsters] = useState<MonsterState[]>(() => {
    return createEncounterFromTemplate(ENCOUNTERS[safeEncounterIndex]);
  });
  const [targetedMonsterIndex, setTargetedMonsterIndex] = useState<number>(0);

  // References for real-time timer calculations
  const monstersRef = useRef<MonsterState[]>(monsters);
  monstersRef.current = monsters;
  const targetedIndexRef = useRef<number>(targetedMonsterIndex);
  targetedIndexRef.current = targetedMonsterIndex;
  const playerHpRef = useRef<number>(playerHp);
  playerHpRef.current = playerHp;
  const playerBlockRef = useRef<number>(playerBlock);
  playerBlockRef.current = playerBlock;
  const battleStatusRef = useRef<'FIGHTING' | 'VICTORY' | 'DEFEAT'>(battleStatus);
  battleStatusRef.current = battleStatus;
  const atbFrozenRef = useRef<boolean>(false); // dev bridge: pause monster timers during captures

  // Initialize Battle & Sync with Engine
  useEffect(() => {
    const initialHand = deckManagerRef.current.dealInitialHand();
    setHand(initialHand);
    if (engineRef.current) {
      engineRef.current.setMonsters(monsters);
    }
    audioManager.play('level_up');
  }, [currentEncounterIndex, isEngineReady, engineRef]);

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

      setMonsters((prevMonsters) => {
        let anyAttacked = false;
        const nextMonsters = prevMonsters.map((m) => {
          if (!m.isAlive || m.currentHp <= 0) return m;

          const newRemaining = m.intent.remainingSeconds - dt;

          // When a monster's attack timer reaches 0: Unleash Attack!
          if (newRemaining <= 0) {
            anyAttacked = true;
            executeMonsterAttack(m);

            // Select next random intent for this monster
            const intents = MONSTER_INTENTS[m.id] || MONSTER_INTENTS.green_slime;
            const nextIntentTemplate = intents[Math.floor(Math.random() * intents.length)];
            const nextIntent = { ...nextIntentTemplate, remainingSeconds: nextIntentTemplate.durationSeconds };

            return {
              ...m,
              intent: nextIntent,
            };
          }

          return {
            ...m,
            intent: {
              ...m.intent,
              remainingSeconds: newRemaining,
            },
          };
        });

        return nextMonsters;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [battleStatus]);

  // Monster Attack Execution
  const executeMonsterAttack = useCallback((m: MonsterState) => {
    const intent = m.intent;

    if (intent.type === 'DEFEND') {
      // Monster buffs armor
      setMonsters((prev) => prev.map(mon => mon.instanceId === m.instanceId ? { ...mon, block: mon.block + 25 } : mon));
      engineRef.current?.playMonsterDefend?.(m.slotIndex);
      engineRef.current?.spawnFloatingText?.(`+25 BLOCK`, 300, 100, 0x38B6FF, 12);
      setRecentCombatLog(`${m.name} hardened their armor (+25 Block)!`);
      audioManager.play('equip');
      return;
    }

    // Monster physical/heavy attack
    const rawDamage = intent.damage;
    const currentBlock = playerBlockRef.current;
    let actualDamageToHp = rawDamage;
    let newBlock = 0;

    if (currentBlock >= rawDamage) {
      newBlock = currentBlock - rawDamage;
      actualDamageToHp = 0;
    } else {
      newBlock = 0;
      actualDamageToHp = rawDamage - currentBlock;
    }

    setPlayerBlock(newBlock);

    // Apply HP damage
    setPlayerHp((prev) => {
      const nextHp = Math.max(0, prev - actualDamageToHp);
      if (nextHp <= 0) {
        setBattleStatus('DEFEAT');
        setRecentCombatLog(`Sir Kettleburne was felled in battle!`);
        engineRef.current?.playKnightDefeat?.();
        audioManager.play('hit');
      }
      return nextHp;
    });

    // Monster Visual Attack in Engine
    engineRef.current?.monsterAttackLunge?.(m.slotIndex, intent.type === 'HEAVY_ATTACK');
    setRecentCombatLog(`${m.name} used ${intent.name}! Dealt ${rawDamage} DMG.`);
    audioManager.play('hit');
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

      // Card activation SFX & VFX in PixiJS Engine
      engineRef.current?.onRepCompleted?.(power, form, exercise, card.name);

      // Apply Damage to Monster(s)
      if (result.damage > 0) {
        const isCleave = card.name.toLowerCase().includes('whirlwind') 
          || card.name.toLowerCase().includes('slam') 
          || card.name.toLowerCase().includes('quake') 
          || card.name.toLowerCase().includes('vortex') 
          || card.name.toLowerCase().includes('phoenix') 
          || card.name.toLowerCase().includes('sunder')
          || card.name.toLowerCase().includes('eruption');

        setMonsters((prevMonsters) => {
          let allDefeated = true;
          const nextMonsters = prevMonsters.map((m, idx) => {
            if (!m.isAlive || m.currentHp <= 0) return m;

            // If not cleave/AOE, only damage the targeted monster
            if (!isCleave && idx !== targetedIndexRef.current) {
              allDefeated = false;
              return m;
            }

            let dmg = result.damage;
            let newBlock = m.block;
            let newHp = m.currentHp;

            if (newBlock >= dmg) {
              newBlock -= dmg;
            } else {
              dmg -= newBlock;
              newBlock = 0;
              newHp = Math.max(0, newHp - dmg);
            }

            if (newHp <= 0) {
              engineRef.current?.playMonsterDeath?.(m.slotIndex);
              return {
                ...m,
                block: 0,
                currentHp: 0,
                isAlive: false,
              };
            } else {
              allDefeated = false;
            }

            return {
              ...m,
              block: newBlock,
              currentHp: newHp,
            };
          });

          // Check for full victory
          if (nextMonsters.every(m => m.currentHp <= 0)) {
            setBattleStatus('VICTORY');
            setRecentCombatLog(`Victory! All enemies in the encounter have been vanquished!`);
            audioManager.play('level_up');
            engineRef.current?.playKnightVictory?.();
          } else {
            // If the targeted monster died, auto-retarget to next alive monster
            const currentTarget = nextMonsters[targetedIndexRef.current];
            if (!currentTarget || currentTarget.currentHp <= 0) {
              const nextAliveIdx = nextMonsters.findIndex(m => m.currentHp > 0);
              if (nextAliveIdx !== -1) {
                setTargetedMonsterIndex(nextAliveIdx);
              }
            }
          }

          return nextMonsters;
        });
      }

      // Apply Block to Player
      if (result.block > 0) {
        setPlayerBlock((prev) => prev + result.block);
        engineRef.current?.playerShieldPulse?.();
      }

      setRecentCombatLog(`ACTIVATED [${card.name}]! ${card.damage ? `Dealt ${result.damage} DMG!` : ''} ${card.block ? `Gained ${result.block} Block!` : ''}`);
      audioManager.play(result.card.rarity === 'legendary' || result.card.rarity === 'epic' ? 'crit' : 'hit');
    }

    setHand(result.hand);
  }, [engineRef]);

  // Expose rep callback for NetworkManager telemetry
  useEffect(() => {
    (window as any).__onKettlebellRepCompleted = handleApplyRep;
    return () => {
      delete (window as any).__onKettlebellRepCompleted;
    };
  }, [handleApplyRep]);

  // Restart / Next Encounter (Cycles through 1 to 3 monster encounters)
  const handleNextEncounter = () => {
    const nextIdx = (currentEncounterIndex + 1) % ENCOUNTERS.length;
    startEncounter(ENCOUNTERS[nextIdx], nextIdx);
  };

  const startEncounter = (template: EncounterTemplate, index: number) => {
    setCurrentEncounterIndex(index);
    const newMonsters = createEncounterFromTemplate(template);

    setMonsters(newMonsters);
    setTargetedMonsterIndex(0);
    setPlayerHp(100);
    setPlayerBlock(0);
    setBattleStatus('FIGHTING');
    engineRef.current?.resetKnight?.();
    deckManagerRef.current.initDeck();
    setHand(deckManagerRef.current.dealInitialHand());
  };

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
      focusedCard: hand[focusedCardIndex]
        ? { index: focusedCardIndex, name: hand[focusedCardIndex].name, exercise: hand[focusedCardIndex].exercise,
            currentReps: hand[focusedCardIndex].currentReps, requiredReps: hand[focusedCardIndex].requiredReps }
        : null,
      frozen: atbFrozenRef.current,
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
        const index = typeof which === 'number' ? which : ENCOUNTERS.findIndex((e) => e.id === which);
        if (!ENCOUNTERS[index]) throw new Error(`Unknown encounter "${which}". Known: ${ENCOUNTERS.map((e) => e.id).join(', ')}`);
        startEncounter(ENCOUNTERS[index], index);
        if (index === currentEncounterIndex) engineRef.current?.setMonsters(createEncounterFromTemplate(ENCOUNTERS[index]));
      },
      freeze: (on: boolean) => { atbFrozenRef.current = on; },
      focusCard: (index: number) => setFocusedCardIndex(Math.max(0, Math.min(hand.length - 1, index))),
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
        handleNextEncounter();
      }
    },
    onBack: () => {
      onExitBattle();
    },
    onDemoSwing: () => {
      if (hand.length > 0) {
        const focusedCard = hand[focusedCardIndex];
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
              {ENCOUNTERS[currentEncounterIndex]?.name.toUpperCase() || 'ENCOUNTER'} ({monsters.filter(m => m.currentHp > 0).length}/{monsters.length})
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
                        {m.intent.type === 'DEFEND' ? '+25 SHIELD' : `${m.intent.damage} DMG`}
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

      {/* VICTORY OR DEFEAT OVERLAY MODAL */}
      {battleStatus !== 'FIGHTING' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1A1926] border-4 border-[#F4B41A] p-8 max-w-md w-full text-center rounded shadow-pixel-box-gold">
            {battleStatus === 'VICTORY' ? (
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
                <h2 className="font-pixel text-lg text-[#FF3366] mb-2">DEFEAT!</h2>
                <p className="text-xs text-[#A7A9BE] font-mono mb-6">
                  The monster squad overwhelmed Sir Kettleburne. Rest and recover before trying again.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleNextEncounter}
                    className="flex-1 bg-[#FF3366] hover:bg-[#ff5588] text-white font-pixel text-xs py-3 border-2 border-black shadow-pixel-box"
                  >
                    RETRY BATTLE
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
      <div className="w-full max-w-6xl mx-auto">
        {/* Hand Title & Exercise Rule Badge */}
        <div className="flex items-center justify-between mb-2 px-2">
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[10px] text-[#F4B41A] flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5" /> 5-CARD COMBAT HAND (SLAY THE SPIRE)
            </span>
            <span className="text-[8px] bg-[#2E2B44] text-[#A7A9BE] font-mono px-2 py-0.5 border border-[#3E3B5E]">
              5 Unique Exercises In Hand
            </span>
          </div>

          <span className="font-pixel text-[9px] text-[#38B6FF]">
            [D-PAD ◀ / ▶] SELECT • [SPACE / PLAY] DEMO SWING
          </span>
        </div>

        {/* 5 Slay The Spire Cards Grid */}
        <div className="grid grid-cols-5 gap-3">
          {hand.map((card, index) => {
            const isFocused = focusedCardIndex === index;
            const progressPercent = Math.min(100, (card.currentReps / card.requiredReps) * 100);

            return (
              <div
                key={card.id}
                onClick={() => setFocusedCardIndex(index)}
                className={`relative p-3 rounded border-4 transition-all duration-150 flex flex-col justify-between h-64 bg-[#1A1926]/95 backdrop-blur-md cursor-pointer ${
                  isFocused
                    ? 'tv-focused scale-105 z-10'
                    : 'hover:scale-102 opacity-95'
                }`}
                style={{
                  borderColor: isFocused ? '#F4B41A' : card.colorHex,
                  boxShadow: isFocused ? `0 0 20px ${card.colorHex}66` : undefined,
                }}
              >
                {/* Top Card Type Badge & Cost */}
                <div>
                  <div className="flex items-center justify-between border-b border-[#2E2B44] pb-1.5 mb-2">
                    <span
                      className="font-pixel text-[8px] uppercase tracking-wider font-bold"
                      style={{ color: card.colorHex }}
                    >
                      {card.type}
                    </span>
                    <span className="text-base">{card.icon}</span>
                  </div>

                  {/* Card Title */}
                  <h3 className="font-pixel text-[11px] text-white leading-tight truncate">
                    {card.name}
                  </h3>
                  <span className="text-[8px] font-pixel text-[#A7A9BE] block mt-0.5 uppercase">
                    {card.rarity}
                  </span>

                  {/* Effect Text */}
                  <p className="text-[10px] font-mono text-[#A7A9BE] mt-2 line-clamp-3">
                    {card.effectDesc}
                  </p>
                </div>

                {/* Bottom Exercise Requirement & Rep Progress */}
                <div>
                  {/* Stats Pill */}
                  <div className="flex items-center justify-between text-[9px] font-pixel mb-2">
                    {card.damage > 0 && (
                      <span className="text-[#FF3366] flex items-center gap-1">
                        ⚔️ {card.damage}
                      </span>
                    )}
                    {card.block > 0 && (
                      <span className="text-[#38B6FF] flex items-center gap-1">
                        🛡️ {card.block}
                      </span>
                    )}
                  </div>

                  {/* Exercise Name Badge */}
                  <div className="bg-[#0F0E17] border border-[#2E2B44] p-1.5 rounded mb-1 text-center">
                    <span className="font-pixel text-[8px] text-[#F4B41A] block truncate">
                      {card.exerciseLabel}
                    </span>
                    <span className="text-[10px] font-mono text-white font-bold">
                      {card.currentReps} / {card.requiredReps} REPS
                    </span>
                  </div>

                  {/* Segmented Rep Progress Bar */}
                  <div className="w-full h-2.5 bg-[#0F0E17] border border-[#2E2B44] overflow-hidden rounded-sm">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${progressPercent}%`,
                        backgroundColor: card.colorHex,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
