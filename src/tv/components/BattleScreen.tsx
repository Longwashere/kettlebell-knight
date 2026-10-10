import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CombatCard, MonsterState, BattleState, MonsterIntent, MONSTER_CATALOG } from '../../types/battle';
import { ExerciseType, RepTelemetry } from '../../types/game';
import { CardDeckManager } from '../../shared/CardDeckManager';
import { audioManager } from '../../shared/AudioManager';
import { GameEngine } from '../engine/GameEngine';
import { useTVRemote } from '../hooks/useTVRemote';
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
  Zap
} from 'lucide-react';

interface BattleScreenProps {
  engineRef: React.RefObject<GameEngine | null>;
  onExitBattle: () => void;
  onBattleStateSync?: (state: {
    hand: CombatCard[];
    monster: MonsterState;
    playerHp: number;
    playerBlock: number;
  }) => void;
}

const MONSTER_INTENTS: Record<string, MonsterIntent[]> = {
  sloth_demon: [
    { type: 'ATTACK', damage: 16, name: 'Sloth Whip', description: 'Fast lash of dark energy', durationSeconds: 4.5, remainingSeconds: 4.5 },
    { type: 'HEAVY_ATTACK', damage: 28, name: 'Nightmare Claws', description: 'Heavy crushing slam', durationSeconds: 6.0, remainingSeconds: 6.0 },
    { type: 'ATTACK', damage: 12, name: 'Torpor Pulse', description: 'Quick draining blast', durationSeconds: 3.5, remainingSeconds: 3.5 },
  ],
  lactate_golem: [
    { type: 'ATTACK', damage: 22, name: 'Iron Pummel', description: 'Heavy stone fist strike', durationSeconds: 4.2, remainingSeconds: 4.2 },
    { type: 'HEAVY_ATTACK', damage: 38, name: 'Anvil Stomp', description: 'Cataclysmic shockwave', durationSeconds: 5.8, remainingSeconds: 5.8 },
    { type: 'DEFEND', damage: 0, name: 'Harden Core', description: 'Fortifies stone armor (+25 Block)', durationSeconds: 4.0, remainingSeconds: 4.0 },
  ],
  orc_warlord: [
    { type: 'HEAVY_ATTACK', damage: 45, name: 'Guillotine Cleave', description: 'Fatal executioner chop', durationSeconds: 5.0, remainingSeconds: 5.0 },
    { type: 'ATTACK', damage: 24, name: 'Savage Frenzy', description: 'Wild flailing strikes', durationSeconds: 3.2, remainingSeconds: 3.2 },
    { type: 'ATTACK', damage: 32, name: 'Blood Roar', description: 'Shockwave of brute force', durationSeconds: 4.5, remainingSeconds: 4.5 },
  ],
};

export const BattleScreen: React.FC<BattleScreenProps> = ({
  engineRef,
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

  // Current Monster
  const [currentMonsterIndex, setCurrentMonsterIndex] = useState<number>(0);
  const [monster, setMonster] = useState<MonsterState>(() => {
    const template = MONSTER_CATALOG[0];
    const initialIntent = { ...MONSTER_INTENTS[template.id][0] };
    return {
      ...template,
      currentHp: template.maxHp,
      block: 0,
      intent: initialIntent,
    };
  });

  // Reference for real-time timer calculations
  const monsterRef = useRef<MonsterState>(monster);
  monsterRef.current = monster;
  const playerHpRef = useRef<number>(playerHp);
  playerHpRef.current = playerHp;
  const playerBlockRef = useRef<number>(playerBlock);
  playerBlockRef.current = playerBlock;
  const battleStatusRef = useRef<'FIGHTING' | 'VICTORY' | 'DEFEAT'>(battleStatus);
  battleStatusRef.current = battleStatus;

  // Initialize Battle
  useEffect(() => {
    const initialHand = deckManagerRef.current.dealInitialHand();
    setHand(initialHand);
    const template = MONSTER_CATALOG[currentMonsterIndex];
    engineRef.current?.setMonster?.(template.spriteType);

    audioManager.play('level_up');
  }, [currentMonsterIndex, engineRef]);

  // Sync state to parent / phone WebRTC
  useEffect(() => {
    onBattleStateSync?.({
      hand,
      monster,
      playerHp,
      playerBlock,
    });
  }, [hand, monster, playerHp, playerBlock, onBattleStateSync]);

  // Real-Time Monster Attack ATB Timer Loop
  useEffect(() => {
    if (battleStatus !== 'FIGHTING') return;

    let lastTime = performance.now();
    const interval = setInterval(() => {
      if (battleStatusRef.current !== 'FIGHTING') return;

      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      setMonster((prev) => {
        if (!prev || prev.currentHp <= 0) return prev;

        const newRemaining = prev.intent.remainingSeconds - dt;

        // When monster attack timer reaches 0: Unleash Attack!
        if (newRemaining <= 0) {
          executeMonsterAttack(prev);

          // Select next random intent for this monster
          const intents = MONSTER_INTENTS[prev.id] || MONSTER_INTENTS.sloth_demon;
          const nextIntentTemplate = intents[Math.floor(Math.random() * intents.length)];
          const nextIntent = { ...nextIntentTemplate, remainingSeconds: nextIntentTemplate.durationSeconds };

          return {
            ...prev,
            intent: nextIntent,
          };
        }

        return {
          ...prev,
          intent: {
            ...prev.intent,
            remainingSeconds: newRemaining,
          },
        };
      });
    }, 50);

    return () => clearInterval(interval);
  }, [battleStatus]);

  // Monster Attack Execution
  const executeMonsterAttack = useCallback((m: MonsterState) => {
    const intent = m.intent;

    if (intent.type === 'DEFEND') {
      // Monster buffs armor
      setMonster((prev) => ({ ...prev, block: prev.block + 25 }));
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
        audioManager.play('hit');
      }
      return nextHp;
    });

    // Monster Visual Attack in Engine
    engineRef.current?.monsterAttackLunge?.();
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

      // Apply Damage to Monster
      if (result.damage > 0) {
        setMonster((prev) => {
          let dmg = result.damage;
          let newBlock = prev.block;
          let newHp = prev.currentHp;

          if (newBlock >= dmg) {
            newBlock -= dmg;
          } else {
            dmg -= newBlock;
            newBlock = 0;
            newHp = Math.max(0, newHp - dmg);
          }

          if (newHp <= 0) {
            setBattleStatus('VICTORY');
            setRecentCombatLog(`Victory! ${prev.name} has been vanquished!`);
            audioManager.play('level_up');
          }

          return {
            ...prev,
            block: newBlock,
            currentHp: newHp,
          };
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

  // Restart / Next Monster
  const handleNextMonster = () => {
    const nextIdx = (currentMonsterIndex + 1) % MONSTER_CATALOG.length;
    setCurrentMonsterIndex(nextIdx);
    const template = MONSTER_CATALOG[nextIdx];
    const initialIntent = { ...MONSTER_INTENTS[template.id][0] };

    setMonster({
      ...template,
      currentHp: template.maxHp,
      block: 0,
      intent: initialIntent,
    });
    setPlayerHp(100);
    setPlayerBlock(0);
    setBattleStatus('FIGHTING');
    deckManagerRef.current.initDeck();
    setHand(deckManagerRef.current.dealInitialHand());
  };

  // TV Remote D-Pad Navigation for Hand Cards
  useTVRemote({
    onLeft: () => {
      setFocusedCardIndex((prev) => Math.max(0, prev - 1));
    },
    onRight: () => {
      setFocusedCardIndex((prev) => Math.min(hand.length - 1, prev + 1));
    },
    onSelect: () => {
      if (battleStatus !== 'FIGHTING') {
        handleNextMonster();
      }
    },
    onBack: () => {
      onExitBattle();
    },
    // Demo swing triggers a rep for currently focused card's exercise!
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

        {/* MONSTER STATUS & REAL-TIME ATTACK INTENT (RIGHT) */}
        <div className="bg-[#1A1926]/95 border-4 border-[#FF3366] p-4 rounded shadow-pixel-box backdrop-blur-md max-w-sm w-full text-right">
          <div className="flex items-center justify-between mb-2 flex-row-reverse">
            <div className="text-right">
              <span className="font-pixel text-xs text-[#FF3366] block">{monster.name}</span>
              <span className="font-pixel text-[8px] text-[#A7A9BE]">{monster.title}</span>
            </div>
            {monster.block > 0 && (
              <div className="flex items-center space-x-1 bg-[#FF3366] text-white px-2 py-0.5 rounded font-pixel text-[10px] shadow-pixel-box">
                <Shield className="w-3.5 h-3.5" />
                <span>{monster.block} BLOCK</span>
              </div>
            )}
          </div>

          {/* Monster HP Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-[#A7A9BE] flex-row-reverse">
              <span className="font-bold text-white">{monster.currentHp} / {monster.maxHp}</span>
              <span>ENEMY HP</span>
            </div>
            <div className="w-full h-4 bg-[#0F0E17] border-2 border-[#2E2B44] overflow-hidden p-0.5">
              <div
                className="h-full bg-[#FF3366] transition-all duration-300"
                style={{ width: `${(monster.currentHp / monster.maxHp) * 100}%` }}
              />
            </div>
          </div>

          {/* SLAY THE SPIRE REAL-TIME INTENT & COUNTDOWN */}
          <div className="mt-3 bg-[#0F0E17] border-2 border-[#FF3366] p-2 rounded text-left">
            <div className="flex items-center justify-between text-[9px] font-pixel text-[#FF3366] mb-1">
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-[#FF3366] animate-bounce" />
                INTENT: {monster.intent.name}
              </span>
              <span className="font-bold text-[#F4B41A]">
                {monster.intent.type === 'DEFEND' ? '+25 SHIELD' : `${monster.intent.damage} DMG`}
              </span>
            </div>

            {/* Real-Time Attack Charge Progress Bar */}
            <div className="w-full h-2 bg-[#2E2B44] rounded overflow-hidden">
              <div
                className={`h-full transition-all duration-75 ${
                  monster.intent.remainingSeconds < 1.5 ? 'bg-[#FF3366] animate-pulse' : 'bg-[#F4B41A]'
                }`}
                style={{
                  width: `${Math.max(0, (1 - monster.intent.remainingSeconds / monster.intent.durationSeconds) * 100)}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[8px] font-mono text-[#A7A9BE] mt-1">
              <span>{monster.intent.description}</span>
              <span className="font-bold text-white">
                {Math.max(0, monster.intent.remainingSeconds).toFixed(1)}s
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* VICTORY OR DEFEAT OVERLAY MODAL */}
      {battleStatus !== 'FIGHTING' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1A1926] border-4 border-[#F4B41A] p-8 max-w-md w-full text-center rounded shadow-pixel-box-gold">
            {battleStatus === 'VICTORY' ? (
              <>
                <Trophy className="w-16 h-16 text-[#F4B41A] mx-auto mb-3 animate-bounce" />
                <h2 className="font-pixel text-lg text-[#F4B41A] mb-2">MONSTER VANQUISHED!</h2>
                <p className="text-xs text-[#A7A9BE] font-mono mb-4">
                  Your rapid exercise output destroyed the beast before it could overwhelm you.
                </p>
                <div className="bg-[#0F0E17] border-2 border-[#F4B41A] p-3 rounded text-center mb-6">
                  <span className="text-[10px] font-pixel text-[#00EB88]">+120 GOLD • +350 XP EARNED</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleNextMonster}
                    className="flex-1 bg-[#F4B41A] hover:bg-[#ffe175] text-[#0F0E17] font-pixel text-xs py-3 border-2 border-black shadow-pixel-box"
                  >
                    NEXT MONSTER ▶
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
                <Skull className="w-16 h-16 text-[#FF3366] mx-auto mb-3 animate-pulse" />
                <h2 className="font-pixel text-lg text-[#FF3366] mb-2">YOU HAVE FALLEN</h2>
                <p className="text-xs text-[#A7A9BE] font-mono mb-4">
                  The monster's attacks broke your defense! Pick up the bell and try again.
                </p>
                <button
                  onClick={handleNextMonster}
                  className="w-full bg-[#FF3366] text-white font-pixel text-xs py-3 border-2 border-black shadow-pixel-box"
                >
                  RETRY BATTLE
                </button>
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
