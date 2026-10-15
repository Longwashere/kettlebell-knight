// Persistent Player Profile & Progression Manager for Kettlebell Knight

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
  unlockedEncounters: number;
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
  return Math.round(100 * Math.pow(1.35, level - 1));
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
    currentHp: 100,
    maxHp: 100,
    power: 10,
    defense: 5,
    repsCompleted: 0,
    highestPower: 0,
    workoutSessions: 0,
    equippedItems: {
      weapon: 'iron_kettlebell',
    },
    unlockedItems: ['iron_kettlebell'],
    unlockedEncounters: 1,
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
          this.slots = [0, 1, 2].map((i) => parsed[i] || null);
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
