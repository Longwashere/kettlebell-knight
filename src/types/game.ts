// 32-Bit Retro Fitness RPG Core Types

export type RepEvent = 'REP_TRIGGER' | 'REP_UPDATE' | 'CALIBRATION' | 'HIKE_ENTER' | 'DRIVE_ENTER';

export interface RepTelemetry {
  event: RepEvent;
  power: number; // 0 - 100+ (calculated from wrist delta speed)
  form: number;  // 0.0 - 1.0 (lockout & symmetric alignment score)
  repCount?: number;
  state?: number; // 0: Hike, 1: Drive, 2: Peak / Lockout
  timestamp?: number;
  wristVelocity?: number;
  debugInfo?: {
    wristY: number;
    hipY: number;
    shoulderY: number;
    elapsedMs: number;
  };
}

export type NetworkRole = 'tv' | 'phone';

export interface PeerMessage {
  type: 'TELEMETRY' | 'HANDSHAKE' | 'CALIBRATE' | 'ACK' | 'PING' | 'PONG';
  payload: any;
  senderId?: string;
  timestamp: number;
}

export type EquipmentSlot = 'weapon' | 'shield' | 'armor' | 'helmet';

export interface EquipmentItem {
  id: string;
  name: string;
  slot: EquipmentSlot;
  attachmentId: string;
  level: number;
  powerBonus: number;
  formMultiplier: number;
  price: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  description: string;
  colorHex: string;
  spriteIcon?: string;
}

export type HubLocation = 'GATE' | 'BLACKSMITH' | 'ALCHEMIST' | 'SANCTUARY';

export interface KnightStats {
  level: number;
  xp: number;
  maxXp: number;
  gold: number;
  currentHp: number;
  maxHp: number;
  power: number;
  defense: number;
  repsCompleted: number;
  maxCombo: number;
  currentCombo: number;
}
