import Peer, { DataConnection } from 'peerjs';
import { HandSyncMode, HandSyncPayload, PeerMessage, RepTelemetry } from '../types/game';
import type { CombatCard } from '../types/battle';
import { peerOptions } from './deployConfig';

export type NetworkConnectionState = 'DISCONNECTED' | 'INITIALIZING' | 'WAITING_FOR_PEER' | 'CONNECTED' | 'ERROR';

export type TelemetryCallback = (telemetry: RepTelemetry) => void;
export type StateChangeCallback = (state: NetworkConnectionState, info?: string) => void;
export type HandCallback = (cards: CombatCard[] | null, mode?: HandSyncMode) => void;

/**
 * WebRTC Network Manager using PeerJS (signalling and STUN/TURN servers configured in deployConfig).
 * Enables zero-latency reliable RTCDataChannel telemetry streaming from Phone to Fire TV.
 */
const TV_ROOM_KEY = 'kk_tv_room';
const PHONE_ROOM_KEY = 'kk_phone_last_room';

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked (private mode): pairing still works, it just isn't remembered
  }
}

/** Phone: the last TV room it paired with, for the home-screen app that opens without ?room=. */
export function lastPairedRoom(): string {
  return readStored(PHONE_ROOM_KEY) || '';
}

export class NetworkManager {
  private static instance: NetworkManager;
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private roomId: string = '';
  private state: NetworkConnectionState = 'DISCONNECTED';
  private telemetryCallbacks: Set<TelemetryCallback> = new Set();
  private stateCallbacks: Set<StateChangeCallback> = new Set();
  private handCallbacks: Set<HandCallback> = new Set();
  /** Latest battle hand: sent by the TV (resent when a phone pairs), received by the phone. */
  private hand: CombatCard[] | null = null;
  private handMode?: HandSyncMode;
  private isHost: boolean = false;

  private constructor() {}

  public static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }

  public getState(): NetworkConnectionState {
    return this.state;
  }

  public getRoomId(): string {
    return this.roomId;
  }

  public isConnected(): boolean {
    return this.state === 'CONNECTED' && this.connection !== null && this.connection.open;
  }

  public onTelemetry(cb: TelemetryCallback): () => void {
    this.telemetryCallbacks.add(cb);
    return () => this.telemetryCallbacks.delete(cb);
  }

  /** Delivers telemetry to local listeners as if it arrived from a phone (dev agent bridge / simulators). */
  public injectTelemetry(telemetry: RepTelemetry): void {
    this.telemetryCallbacks.forEach((cb) => cb(telemetry));
  }

  /** Phone: the TV's battle hand, now and on every change (null outside battle). */
  public onHand(cb: HandCallback): () => void {
    this.handCallbacks.add(cb);
    cb(this.hand, this.handMode);
    return () => this.handCallbacks.delete(cb);
  }

  public onStateChange(cb: StateChangeCallback): () => void {
    this.stateCallbacks.add(cb);
    cb(this.state, this.roomId);
    return () => this.stateCallbacks.delete(cb);
  }

  private setState(newState: NetworkConnectionState, info?: string): void {
    this.state = newState;
    this.stateCallbacks.forEach((cb) => cb(newState, info));
  }

  /**
   * Generates a 4-character high-readability room suffix (e.g., KNIGHT-42, KNIGHT-7A)
   */
  public static generateRoomCode(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed visually ambiguous 0/O, 1/I
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `KNIGHT-${code}`;
  }

  /**
   * Initializes TV host peer listening for incoming phone connections.
   * The TV keeps its room code across launches, so a phone that saved the companion to its home screen
   * (and remembers its last room) reconnects without scanning the QR code again.
   */
  public async initHost(customRoomId?: string): Promise<string> {
    this.isHost = true;
    this.roomId = customRoomId || readStored(TV_ROOM_KEY) || NetworkManager.generateRoomCode();
    this.setState('INITIALIZING', `Setting up room ${this.roomId}...`);
    const options = await peerOptions();

    return new Promise((resolve, reject) => {
      this.cleanup();

      // PeerJS with reliable WebRTC DataChannel; signalling server and STUN/TURN from deployConfig
      this.peer = new Peer(this.roomId, options);

      this.peer.on('open', (id) => {
        this.roomId = id;
        writeStored(TV_ROOM_KEY, id);
        this.setState('WAITING_FOR_PEER', `Room ready: ${id}`);
        resolve(id);
      });

      this.peer.on('connection', (conn) => {
        this.setupConnectionHandlers(conn);
      });

      this.peer.on('error', (err) => {
        console.error('[NetworkManager] Host Peer error:', err);
        // If room ID already in use, try regenerating
        if (err.type === 'unavailable-id') {
          const newRoom = NetworkManager.generateRoomCode();
          this.initHost(newRoom).then(resolve).catch(reject);
          return;
        }
        this.setState('ERROR', err.message);
        reject(err);
      });
    });
  }

  /**
   * Connects phone client to the TV's room
   */
  public async connectToHost(roomId: string): Promise<void> {
    this.isHost = false;
    this.roomId = roomId;
    this.setState('INITIALIZING', `Connecting to ${roomId}...`);
    const options = await peerOptions();

    return new Promise((resolve, reject) => {
      this.cleanup();

      // Unique random peer ID for the phone client
      const clientPeerId = `PHONE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      this.peer = new Peer(clientPeerId, options);

      this.peer.on('open', () => {
        if (!this.peer) return;
        const conn = this.peer.connect(roomId, {
          reliable: true, // RTCDataChannel reliable mode
          serialization: 'json',
        });

        this.setupConnectionHandlers(conn);

        conn.on('open', () => {
          writeStored(PHONE_ROOM_KEY, roomId);
          this.sendHandshake();
          resolve();
        });
      });

      this.peer.on('error', (err) => {
        console.error('[NetworkManager] Client Peer error:', err);
        this.setState('ERROR', err.message);
        reject(err);
      });
    });
  }

  private setupConnectionHandlers(conn: DataConnection): void {
    if (this.connection) {
      try {
        this.connection.close();
      } catch (e) {
        // Ignore close error on previous connection
      }
    }
    this.connection = conn;

    conn.on('open', () => {
      this.setState('CONNECTED', `Paired with ${conn.peer}`);
    });

    conn.on('data', (data: any) => {
      this.handleIncomingData(data);
    });

    conn.on('close', () => {
      this.connection = null;
      if (this.isHost) {
        this.setState('WAITING_FOR_PEER', 'Phone disconnected. Waiting for reconnect...');
      } else {
        this.setState('DISCONNECTED', 'Connection closed');
      }
    });

    conn.on('error', (err) => {
      console.error('[NetworkManager] DataConnection error:', err);
      this.setState('ERROR', err?.message || 'Data channel error');
    });
  }

  private handleIncomingData(data: any): void {
    if (!data) return;

    if (data.type === 'TELEMETRY' && data.payload) {
      const telemetry = data.payload as RepTelemetry;
      // High-frequency telemetry: invoke registered listeners directly
      this.telemetryCallbacks.forEach((cb) => cb(telemetry));
    } else if (data.type === 'HANDSHAKE') {
      if (this.isHost && this.connection) {
        this.connection.send({
          type: 'ACK',
          payload: { status: 'READY', device: 'FIRE_TV' },
          timestamp: Date.now(),
        });
        this.sendHand(this.hand, this.handMode);
      }
    } else if (data.type === 'HAND_SYNC' && data.payload) {
      const payload = data.payload as HandSyncPayload;
      this.hand = payload.cards;
      this.handMode = payload.mode;
      this.handCallbacks.forEach((cb) => cb(this.hand, this.handMode));
    }
  }

  /** TV: tells the phone which cards are in hand so it only shows and tracks those exercises. */
  public sendHand(cards: CombatCard[] | null, mode?: HandSyncMode): void {
    this.hand = cards;
    this.handMode = mode;
    if (!this.connection || !this.connection.open) return;
    const payload: HandSyncPayload = { cards, mode };
    try {
      this.connection.send({ type: 'HAND_SYNC', payload, timestamp: Date.now() } satisfies PeerMessage);
    } catch (err) {
      console.warn('[NetworkManager] Failed to send hand:', err);
    }
  }

  /**
   * Broadcasts high-frequency telemetry from mobile phone
   */
  public sendTelemetry(telemetry: RepTelemetry): boolean {
    if (!this.connection || !this.connection.open) return false;

    const message: PeerMessage = {
      type: 'TELEMETRY',
      payload: telemetry,
      timestamp: Date.now(),
    };

    try {
      this.connection.send(message);
      return true;
    } catch (err) {
      console.warn('[NetworkManager] Failed to send telemetry:', err);
      return false;
    }
  }

  public sendHandshake(): void {
    if (!this.connection || !this.connection.open) return;
    this.connection.send({
      type: 'HANDSHAKE',
      payload: { client: 'MOBILE_VISION' },
      timestamp: Date.now(),
    });
  }

  public cleanup(): void {
    this.hand = null;
    if (this.connection) {
      try {
        this.connection.close();
      } catch (e) {}
      this.connection = null;
    }

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {}
      this.peer = null;
    }

    this.setState('DISCONNECTED');
  }
}

export const networkManager = NetworkManager.getInstance();
