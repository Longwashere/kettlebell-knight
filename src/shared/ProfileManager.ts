import { BattleMapId, STARTER_CARD_IDS } from '../types/battle';
import { ExerciseType } from '../types/game';
import { evaluateCardUnlocks, CardUnlockDef } from './cardUnlocks';
import {
  BASE_STATS, MAX_LEVEL, buildLoadout, cardLevel, rollLevelUp, weaponLevel, weaponLevelReq, weaponStats,
  type KnightStats, type Loadout, type StatKey,
} from './progression';
import { xpToNext } from './stageScaling';
import { SHOP_ITEMS } from './shopItems';
import { trialRecord, type SecretTrialId, type SecretTrialRecord } from './secretTrials';

/** One level gained: which stat the level-up landed on and by how much. */
export interface LevelUpEvent {
  level: number;
  stat: StatKey;
  gain: number;
}

/** A card or weapon reaching a new level from being used. */
export interface MasteryLevelUp {
  kind: 'card' | 'weapon';
  id: string;
  level: number;
}

export interface MapLevelProgress {
  highestLevelCleared: number; // 0 = none, 1..5
  totalClears: number;
  bestReps: number;
}

export interface CardUnlockStats {
  monsterKills: Record<string, number>;
  exerciseReps: Record<string, number>;
  mapExerciseReps: Record<string, Record<string, number>>; // mapId -> exercise -> count
  perfectFormReps: Record<string, number>;
  highPowerReps: Record<string, number>;
  peakPower: Record<string, number>;
  totalBlockedDamage: number;
}

export interface PlayerProfile {
  id: string; // 'slot_1' | 'slot_2' | 'slot_3'
  name: string;
  title: string;
  level: number;
  xp: number;
  maxXp: number;
  gold: number;
  currentHp: number;
  maxHp: number;
  power: number;
  defense: number;
  repsCompleted: number;
  highestPower: number;
  workoutSessions: number;
  equippedItems: {
    weapon: string;
    shield?: string;
    armor?: string;
    helmet?: string;
  };
  unlockedItems: string[];
  /** Battle cards in this knight's deck (CARD_CATALOG templateIds). Starts with STARTER_CARD_IDS. */
  unlockedCards?: string[];
  /** Progression stats toward thematic card unlocks (monster kills, exercise reps, etc.). */
  unlockStats?: CardUnlockStats;
  /** STR / HP / SPD (src/shared/progression.ts). maxHp mirrors stats.hp. */
  stats?: KnightStats;
  /** Stats left in the current level-up bag (each stat once per bag, random order). */
  statBag?: StatKey[];
  /** Times each card (templateId) was cast: its spell level. */
  cardCasts?: Record<string, number>;
  /** Cards cast with each weapon equipped: its weapon level. */
  weaponCasts?: Record<string, number>;
  /** Secret stages (src/shared/secretTrials.ts), per trial: times met, and whether its weapon was won. */
  secretTrials?: Partial<Record<SecretTrialId, SecretTrialRecord>>;
  /** Legacy Excalibell record from saves before secretTrials; read through trialRecord(). */
  excalibellTrial?: SecretTrialRecord;
  unlockedEncounters: number;
  unlockedMaps: BattleMapId[];
  mapProgress: Record<string, MapLevelProgress>;
  /** Stage cinematics viewed by the knight (avoids re-interrupting subsequent embarks). */
  viewedCinematics?: string[];
  createdAt: number;
  lastSavedAt: number;
  playTimeSeconds: number;
}

const STORAGE_KEY_SLOTS = 'kk_save_slots';
const STORAGE_KEY_ACTIVE = 'kk_active_slot';
export const TOTAL_SAVE_SLOTS = 3;

export const DEFAULT_KNIGHT_NAME = 'SIR KETTLEBURNE';
export const DEFAULT_KNIGHT_TITLE = 'IRON VANGUARD';

export function calculateMaxXp(level: number): number {
  return xpToNext(level);
}

/** Everything combat needs from a knight: stats, weapon and its level, spell levels. */
export function loadoutFor(profile: PlayerProfile | null | undefined, weaponId?: string): Loadout {
  return buildLoadout({
    level: profile?.level,
    stats: profile?.stats,
    weaponId: weaponId ?? profile?.equippedItems?.weapon ?? 'iron_kettlebell',
    cardCasts: profile?.cardCasts,
    weaponCasts: profile?.weaponCasts,
  });
}

/** Stats for a save made before stats existed: its past level-ups, rolled now. */
function migrateStats(level: number): { stats: KnightStats; statBag: StatKey[] } {
  let stats = { ...BASE_STATS };
  let bag: StatKey[] = [];
  for (let l = 2; l <= level; l++) {
    const roll = rollLevelUp(stats, bag);
    stats = roll.stats;
    bag = roll.bag;
  }
  return { stats, statBag: bag };
}

export function createDefaultProfile(slotId: string, name: string = DEFAULT_KNIGHT_NAME): PlayerProfile {
  const now = Date.now();
  return {
    id: slotId,
    name: name.trim().toUpperCase() || DEFAULT_KNIGHT_NAME,
    title: DEFAULT_KNIGHT_TITLE,
    level: 1,
    xp: 0,
    maxXp: calculateMaxXp(1),
    gold: 150,
    currentHp: BASE_STATS.hp,
    maxHp: BASE_STATS.hp,
    stats: { ...BASE_STATS },
    statBag: [],
    cardCasts: {},
    weaponCasts: {},
    power: 10,
    defense: 5,
    repsCompleted: 0,
    highestPower: 0,
    workoutSessions: 0,
    equippedItems: {
      weapon: 'iron_kettlebell',
    },
    unlockedItems: ['iron_kettlebell'],
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
    unlockedEncounters: 1,
    unlockedMaps: ['VERDANT_FOREST'],
    mapProgress: {
      VERDANT_FOREST: { highestLevelCleared: 0, totalClears: 0, bestReps: 0 },
    },
    createdAt: now,
    lastSavedAt: now,
    playTimeSeconds: 0,
  };
}

class ProfileManager {
  private slots: (PlayerProfile | null)[] = [null, null, null];
  private activeSlotId: string | null = null;
  private listeners: Set<(activeProfile: PlayerProfile | null) => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const rawSlots = window.localStorage.getItem(STORAGE_KEY_SLOTS);
      if (rawSlots) {
        const parsed = JSON.parse(rawSlots);
        if (Array.isArray(parsed)) {
          this.slots = [0, 1, 2].map((i) => {
            const slot = parsed[i];
            if (!slot) return null;
            // Migration fallback for existing saves: ensure VERDANT_FOREST is always unlocked
            if (!slot.unlockedMaps || slot.unlockedMaps.length === 0) {
              slot.unlockedMaps = ['VERDANT_FOREST'];
            } else if (!slot.unlockedMaps.includes('VERDANT_FOREST')) {
              slot.unlockedMaps = ['VERDANT_FOREST', ...slot.unlockedMaps];
            }
            if (!slot.mapProgress) {
              slot.mapProgress = {
                VERDANT_FOREST: { highestLevelCleared: 0, totalClears: 0, bestReps: 0 },
              };
            } else if (!slot.mapProgress.VERDANT_FOREST) {
              slot.mapProgress.VERDANT_FOREST = { highestLevelCleared: 0, totalClears: 0, bestReps: 0 };
            }
            if (!slot.unlockedCards || slot.unlockedCards.length === 0) {
              slot.unlockedCards = [...STARTER_CARD_IDS];
            }
            if (!slot.stats) {
              Object.assign(slot, migrateStats(Math.min(MAX_LEVEL, slot.level || 1)));
              slot.cardCasts = slot.cardCasts ?? {};
              slot.weaponCasts = slot.weaponCasts ?? {};
              // The experience curve changed: keep the level, start it fresh
              slot.maxXp = xpToNext(slot.level || 1);
              slot.xp = Math.min(slot.xp || 0, slot.maxXp - 1);
              slot.maxHp = slot.stats.hp;
              slot.currentHp = slot.stats.hp;
            }
            if (!slot.unlockStats) {
              slot.unlockStats = {
                monsterKills: {},
                exerciseReps: {},
                mapExerciseReps: {},
                perfectFormReps: {},
                highPowerReps: {},
                peakPower: {},
                totalBlockedDamage: 0,
              };
            }
            return slot;
          });
        }
      }

      const active = window.localStorage.getItem(STORAGE_KEY_ACTIVE);
      if (active && this.getSlotById(active)) {
        this.activeSlotId = active;
      } else {
        // Fallback to first existing slot if any
        const first = this.slots.find((s) => s !== null);
        this.activeSlotId = first ? first.id : null;
      }
    } catch (err) {
      console.warn('[ProfileManager] Failed to read localStorage:', err);
      this.slots = [null, null, null];
      this.activeSlotId = null;
    }
  }

  private persist(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(this.slots));
      if (this.activeSlotId) {
        window.localStorage.setItem(STORAGE_KEY_ACTIVE, this.activeSlotId);
      } else {
        window.localStorage.removeItem(STORAGE_KEY_ACTIVE);
      }
    } catch (err) {
      console.warn('[ProfileManager] Failed to write localStorage:', err);
    }
  }

  private notify(): void {
    const active = this.getActiveProfile();
    this.listeners.forEach((fn) => fn(active));
  }

  public subscribe(listener: (activeProfile: PlayerProfile | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public hasSavedProfile(): boolean {
    return this.slots.some((s) => s !== null);
  }

  public getActiveProfile(): PlayerProfile | null {
    if (!this.activeSlotId) return null;
    return this.getSlotById(this.activeSlotId);
  }

  public getAllSlots(): (PlayerProfile | null)[] {
    return [...this.slots];
  }

  public getSlotById(slotId: string): PlayerProfile | null {
    return this.slots.find((s) => s && s.id === slotId) || null;
  }

  public getFirstAvailableSlotId(): string {
    const emptyIndex = this.slots.findIndex((s) => s === null);
    if (emptyIndex !== -1) {
      return `slot_${emptyIndex + 1}`;
    }
    return 'slot_1';
  }

  public createProfile(slotId: string, name: string): PlayerProfile {
    const slotIdx = parseInt(slotId.replace('slot_', ''), 10) - 1;
    const targetIdx = slotIdx >= 0 && slotIdx < TOTAL_SAVE_SLOTS ? slotIdx : 0;
    const realSlotId = `slot_${targetIdx + 1}`;

    const newProfile = createDefaultProfile(realSlotId, name);
    this.slots[targetIdx] = newProfile;
    this.activeSlotId = realSlotId;
    this.persist();
    this.notify();
    return newProfile;
  }

  public loadProfile(slotId: string): PlayerProfile | null {
    const profile = this.getSlotById(slotId);
    if (profile) {
      this.activeSlotId = profile.id;
      this.persist();
      this.notify();
      return profile;
    }
    return null;
  }

  public saveActiveProfile(updates?: Partial<PlayerProfile>): PlayerProfile | null {
    const current = this.getActiveProfile();
    if (!current) return null;

    const slotIdx = this.slots.findIndex((s) => s && s.id === current.id);
    if (slotIdx === -1) return null;

    const updated: PlayerProfile = {
      ...current,
      ...(updates || {}),
      lastSavedAt: Date.now(),
    };

    this.slots[slotIdx] = updated;
    this.persist();
    this.notify();
    return updated;
  }

  public unlockMap(mapId: BattleMapId): boolean {
    const profile = this.getActiveProfile();
    if (!profile) return false;
    if (profile.unlockedMaps.includes(mapId)) return false;

    const nextUnlocked = [...profile.unlockedMaps, mapId];
    this.saveActiveProfile({ unlockedMaps: nextUnlocked });
    return true;
  }

  public getMapProgress(mapId: BattleMapId): MapLevelProgress {
    const profile = this.getActiveProfile();
    return profile?.mapProgress?.[mapId] || { highestLevelCleared: 0, totalClears: 0, bestReps: 0 };
  }

  public hasViewedCinematic(mapId: string): boolean {
    const profile = this.getActiveProfile();
    return Boolean(profile?.viewedCinematics?.includes(mapId));
  }

  public markCinematicViewed(mapId: string): void {
    const profile = this.getActiveProfile();
    if (!profile) return;
    const current = profile.viewedCinematics || [];
    if (!current.includes(mapId)) {
      this.saveActiveProfile({ viewedCinematics: [...current, mapId] });
    }
  }

  public recordLevelVictory(
    mapId: BattleMapId,
    level: number,
    reps: number,
    goldEarned: number,
    xpEarned: number,
    nextMapToUnlock?: BattleMapId
  ): PlayerProfile | null {
    const profile = this.getActiveProfile();
    if (!profile) return null;

    const curProgress = profile.mapProgress?.[mapId] || { highestLevelCleared: 0, totalClears: 0, bestReps: 0 };
    const nextHighest = Math.max(curProgress.highestLevelCleared, level);
    const nextClears = curProgress.totalClears + 1;
    const nextBestReps = curProgress.bestReps ? Math.min(curProgress.bestReps, reps) : reps;

    const nextMapProgress: Record<string, MapLevelProgress> = {
      ...(profile.mapProgress || {}),
      [mapId]: {
        highestLevelCleared: nextHighest,
        totalClears: nextClears,
        bestReps: nextBestReps,
      },
    };

    let nextUnlockedMaps = [...(profile.unlockedMaps || ['VERDANT_FOREST'])];
    if (level >= 5 && nextMapToUnlock && !nextUnlockedMaps.includes(nextMapToUnlock)) {
      nextUnlockedMaps.push(nextMapToUnlock);
    }

    this.saveActiveProfile({
      gold: profile.gold + goldEarned,
      mapProgress: nextMapProgress,
      unlockedMaps: nextUnlockedMaps,
      repsCompleted: (profile.repsCompleted || 0) + reps,
      workoutSessions: (profile.workoutSessions || 0) + 1,
    });
    this.awardXp(xpEarned);
    return this.getActiveProfile();
  }

  /**
   * Adds experience (kills grant it as they happen, win or lose). Each level gained raises one random
   * stat; returns the level-ups in order.
   */
  public awardXp(amount: number): LevelUpEvent[] {
    const profile = this.getActiveProfile();
    if (!profile || amount <= 0) return [];
    let { level, xp } = profile;
    let stats = profile.stats ?? { ...BASE_STATS };
    let bag = profile.statBag ?? [];
    const events: LevelUpEvent[] = [];
    xp += Math.round(amount);
    while (level < MAX_LEVEL && xp >= xpToNext(level)) {
      xp -= xpToNext(level);
      level += 1;
      const roll = rollLevelUp(stats, bag);
      stats = roll.stats;
      bag = roll.bag;
      events.push({ level, stat: roll.stat, gain: roll.gain });
    }
    if (level >= MAX_LEVEL) xp = Math.min(xp, xpToNext(level));
    const hpGain = stats.hp - (profile.stats?.hp ?? BASE_STATS.hp);
    this.saveActiveProfile({
      level,
      xp,
      maxXp: xpToNext(level),
      stats,
      statBag: bag,
      maxHp: stats.hp,
      currentHp: Math.min(stats.hp, (profile.currentHp ?? stats.hp) + hpGain),
    });
    return events;
  }

  /**
   * A card was cast: counts toward its spell level and the equipped weapon's level. Returns what
   * levelled up.
   */
  public recordCast(templateId: string, weaponId?: string): MasteryLevelUp[] {
    const profile = this.getActiveProfile();
    if (!profile) return [];
    const ups: MasteryLevelUp[] = [];
    const cardCasts = { ...(profile.cardCasts ?? {}) };
    const before = cardLevel(cardCasts[templateId]);
    cardCasts[templateId] = (cardCasts[templateId] ?? 0) + 1;
    const after = cardLevel(cardCasts[templateId]);
    if (after > before) ups.push({ kind: 'card', id: templateId, level: after });

    const weaponCasts = { ...(profile.weaponCasts ?? {}) };
    if (weaponId) {
      const wBefore = weaponLevel(weaponCasts[weaponId]);
      weaponCasts[weaponId] = (weaponCasts[weaponId] ?? 0) + 1;
      const wAfter = weaponLevel(weaponCasts[weaponId]);
      if (wAfter > wBefore) ups.push({ kind: 'weapon', id: weaponId, level: wAfter });
    }
    this.saveActiveProfile({ cardCasts, weaponCasts });
    return ups;
  }

  /** Whether the active knight's level allows wielding a weapon (its tier sets the requirement). */
  public canWield(weaponId: string): boolean {
    const profile = this.getActiveProfile();
    if (SHOP_ITEMS.find((i) => i.id === weaponId)?.stoneBound) return Boolean(profile?.unlockedItems.includes(weaponId));
    return (profile?.level ?? 1) >= weaponLevelReq(weaponStats(weaponId).tier);
  }

  /** A secret trial appeared: it is no longer owed to this knight (one try per meeting). */
  public recordSecretTrialMet(id: SecretTrialId): void {
    const profile = this.getActiveProfile();
    if (!profile) return;
    const rec = trialRecord(profile, id) ?? { encounters: 0, won: false };
    this.saveActiveProfile({ secretTrials: { ...profile.secretTrials, [id]: { ...rec, encounters: rec.encounters + 1 } } });
  }

  /** A secret trial won: its weapon is owned and equipped. */
  public claimSecretTrial(id: SecretTrialId): void {
    const profile = this.getActiveProfile();
    if (!profile) return;
    this.saveActiveProfile({
      secretTrials: { ...profile.secretTrials, [id]: { encounters: trialRecord(profile, id)?.encounters ?? 1, won: true } },
      unlockedItems: profile.unlockedItems.includes(id) ? profile.unlockedItems : [...profile.unlockedItems, id],
      equippedItems: { ...profile.equippedItems, weapon: id },
    });
  }

  /** Records rep telemetry toward card unlock progress, returning any newly unlocked cards. */
  public recordRepStats(
    exercise: ExerciseType,
    power: number,
    form: number,
    mapId?: BattleMapId
  ): CardUnlockDef[] {
    const profile = this.getActiveProfile();
    if (!profile) return [];

    const stats: CardUnlockStats = {
      monsterKills: { ...(profile.unlockStats?.monsterKills || {}) },
      exerciseReps: { ...(profile.unlockStats?.exerciseReps || {}) },
      mapExerciseReps: { ...(profile.unlockStats?.mapExerciseReps || {}) },
      perfectFormReps: { ...(profile.unlockStats?.perfectFormReps || {}) },
      highPowerReps: { ...(profile.unlockStats?.highPowerReps || {}) },
      peakPower: { ...(profile.unlockStats?.peakPower || {}) },
      totalBlockedDamage: profile.unlockStats?.totalBlockedDamage || 0,
    };

    // Update exercise reps
    stats.exerciseReps[exercise] = (stats.exerciseReps[exercise] || 0) + 1;

    // Update map exercise reps
    if (mapId) {
      if (!stats.mapExerciseReps[mapId]) stats.mapExerciseReps[mapId] = {};
      stats.mapExerciseReps[mapId][exercise] = (stats.mapExerciseReps[mapId][exercise] || 0) + 1;
    }

    // Update form and power milestones
    if (form >= 0.85) {
      stats.perfectFormReps[exercise] = (stats.perfectFormReps[exercise] || 0) + 1;
    }
    if (power >= 80) {
      stats.highPowerReps[exercise] = (stats.highPowerReps[exercise] || 0) + 1;
    }
    stats.peakPower[exercise] = Math.max(stats.peakPower[exercise] || 0, power);

    const tempProfile: PlayerProfile = {
      ...profile,
      unlockStats: stats,
    };

    const { newlyUnlocked, updatedUnlockedCards } = evaluateCardUnlocks(tempProfile, {
      completedExercise: exercise,
      repPower: power,
      repForm: form,
      currentMapId: mapId,
    });

    this.saveActiveProfile({
      unlockStats: stats,
      unlockedCards: updatedUnlockedCards,
      highestPower: Math.max(profile.highestPower || 0, power),
    });

    return newlyUnlocked;
  }

  /** Records monster kills toward card unlock progress & drops, returning newly unlocked cards. */
  public recordMonsterKills(monsterIds: string[], mapId?: BattleMapId): CardUnlockDef[] {
    const profile = this.getActiveProfile();
    if (!profile || monsterIds.length === 0) return [];

    const stats: CardUnlockStats = {
      monsterKills: { ...(profile.unlockStats?.monsterKills || {}) },
      exerciseReps: { ...(profile.unlockStats?.exerciseReps || {}) },
      mapExerciseReps: { ...(profile.unlockStats?.mapExerciseReps || {}) },
      perfectFormReps: { ...(profile.unlockStats?.perfectFormReps || {}) },
      highPowerReps: { ...(profile.unlockStats?.highPowerReps || {}) },
      peakPower: { ...(profile.unlockStats?.peakPower || {}) },
      totalBlockedDamage: profile.unlockStats?.totalBlockedDamage || 0,
    };

    for (const id of monsterIds) {
      const key = id.toLowerCase();
      stats.monsterKills[key] = (stats.monsterKills[key] || 0) + 1;
    }

    const tempProfile: PlayerProfile = {
      ...profile,
      unlockStats: stats,
    };

    const { newlyUnlocked, updatedUnlockedCards } = evaluateCardUnlocks(tempProfile, {
      slainMonsterIds: monsterIds,
      currentMapId: mapId,
    });

    this.saveActiveProfile({
      unlockStats: stats,
      unlockedCards: updatedUnlockedCards,
    });

    return newlyUnlocked;
  }

  /** Records damage blocked toward defensive card unlocks. */
  public recordBlockedDamage(amount: number): CardUnlockDef[] {
    const profile = this.getActiveProfile();
    if (!profile || amount <= 0) return [];

    const stats: CardUnlockStats = {
      monsterKills: { ...(profile.unlockStats?.monsterKills || {}) },
      exerciseReps: { ...(profile.unlockStats?.exerciseReps || {}) },
      mapExerciseReps: { ...(profile.unlockStats?.mapExerciseReps || {}) },
      perfectFormReps: { ...(profile.unlockStats?.perfectFormReps || {}) },
      highPowerReps: { ...(profile.unlockStats?.highPowerReps || {}) },
      peakPower: { ...(profile.unlockStats?.peakPower || {}) },
      totalBlockedDamage: (profile.unlockStats?.totalBlockedDamage || 0) + amount,
    };

    const tempProfile: PlayerProfile = {
      ...profile,
      unlockStats: stats,
    };

    const { newlyUnlocked, updatedUnlockedCards } = evaluateCardUnlocks(tempProfile);

    this.saveActiveProfile({
      unlockStats: stats,
      unlockedCards: updatedUnlockedCards,
    });

    return newlyUnlocked;
  }

  /** Evaluates map-clear card unlocks after completing an expedition level. */
  public recordMapClearStats(mapId: BattleMapId, level: number): CardUnlockDef[] {
    const profile = this.getActiveProfile();
    if (!profile) return [];

    const { newlyUnlocked, updatedUnlockedCards } = evaluateCardUnlocks(profile, {
      currentMapId: mapId,
      currentLevel: level,
    });

    if (newlyUnlocked.length > 0) {
      this.saveActiveProfile({
        unlockedCards: updatedUnlockedCards,
      });
    }

    return newlyUnlocked;
  }

  /** Manually unlocks a card by templateId. Returns true if newly unlocked. */
  public unlockCard(cardId: string): boolean {
    const profile = this.getActiveProfile();
    if (!profile) return false;

    const current = new Set(profile.unlockedCards || STARTER_CARD_IDS);
    if (current.has(cardId)) return false;

    current.add(cardId);
    this.saveActiveProfile({
      unlockedCards: Array.from(current),
    });
    return true;
  }

  /** Checks if a card is currently unlocked. */
  public isCardUnlocked(cardId: string): boolean {
    const profile = this.getActiveProfile();
    return (profile?.unlockedCards || STARTER_CARD_IDS).includes(cardId);
  }

  public deleteProfile(slotId: string): boolean {
    const slotIdx = this.slots.findIndex((s) => s && s.id === slotId);
    if (slotIdx === -1) return false;

    this.slots[slotIdx] = null;
    if (this.activeSlotId === slotId) {
      const remaining = this.slots.find((s) => s !== null);
      this.activeSlotId = remaining ? remaining.id : null;
    }
    this.persist();
    this.notify();
    return true;
  }

  public clearAll(): void {
    this.slots = [null, null, null];
    this.activeSlotId = null;
    this.persist();
    this.notify();
  }
}

export const profileManager = new ProfileManager();
