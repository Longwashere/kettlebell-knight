export interface DiscoveredTV {
  roomId: string;
  name: string;
  timestamp: number;
  source: 'WIFI_LAN' | 'BROADCAST_CHANNEL' | 'LOCAL_CACHE';
}

/**
 * DiscoveryManager: Automatic Local WiFi & LAN Discovery for Kettlebell Knight.
 * 
 * Enables the Mobile Vision Companion to scan the local network for an active Fire TV app
 * and pair with 1 tap (or zero-tap auto-pair) without having to manually type the room code.
 *
 * Employs a 3-tier discovery mechanism:
 * 1. Local Network HTTP Beacon: Registered via Vite LAN middleware /api/discovery (dev/preview server only)
 * 2. Cross-Tab / Local Device BroadcastChannel: Zero-latency discovery across tabs on same device
 * 3. LocalStorage Beacon: Fallback persistence with timestamps
 */
/** The /api/discovery middleware only exists on the Vite dev/preview server, not on a static host or in the TV app. */
export const LAN_DISCOVERY = import.meta.env.DEV;

export class DiscoveryManager {
  private static instance: DiscoveryManager;
  private broadcastChannel: BroadcastChannel | null = null;
  private heartbeatInterval: any = null;
  private currentRoomId: string = '';
  private currentDeviceName: string = 'Fire TV';

  private constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('kettlebell_knight_discovery');
      } catch (e) {
        console.warn('[DiscoveryManager] BroadcastChannel not supported:', e);
      }
    }
  }

  public static getInstance(): DiscoveryManager {
    if (!DiscoveryManager.instance) {
      DiscoveryManager.instance = new DiscoveryManager();
    }
    return DiscoveryManager.instance;
  }

  /**
   * Starts broadcasting the TV's active room code on the local WiFi network.
   * Runs a periodic heartbeat every 4 seconds.
   */
  public startBroadcasting(roomId: string, deviceName = 'Living Room Fire TV'): void {
    if (!roomId) return;
    this.stopBroadcasting();

    this.currentRoomId = roomId;
    this.currentDeviceName = deviceName;

    // 1. Initial Broadcast
    this.sendBeacon(roomId, deviceName);

    // 2. Heartbeat every 4 seconds
    this.heartbeatInterval = setInterval(() => {
      this.sendBeacon(roomId, deviceName);
    }, 4000);
  }

  /**
   * Stops broadcasting when the TV app exits or disconnects
   */
  public stopBroadcasting(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.broadcastChannel && this.currentRoomId) {
      try {
        this.broadcastChannel.postMessage({
          type: 'ROOM_CLOSED',
          roomId: this.currentRoomId,
        });
      } catch (e) {}
    }

    this.currentRoomId = '';
  }

  private sendBeacon(roomId: string, name: string): void {
    const payload = { roomId, name, timestamp: Date.now() };

    // A. Local API endpoint on LAN server (Vite middleware)
    if (LAN_DISCOVERY) {
      fetch('/api/discovery/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {
        // Server endpoint not available
      });
    }

    // B. Web BroadcastChannel (for same-device / multi-tab testing)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'ROOM_ANNOUNCE',
          ...payload,
        });
      } catch (e) {}
    }

    // C. LocalStorage timestamp beacon
    try {
      localStorage.setItem('kettlebell_knight_active_room', JSON.stringify(payload));
    } catch (e) {}
  }

  /**
   * Scans local WiFi network for active Fire TV hosts.
   * Returns a deduplicated list of active TV rooms discovered.
   */
  public async scanForTVs(): Promise<DiscoveredTV[]> {
    const results = new Map<string, DiscoveredTV>();
    const now = Date.now();

    // 1. Query Local LAN Server endpoint
    if (LAN_DISCOVERY) {
      try {
        const response = await fetch('/api/discovery/rooms', {
          signal: AbortSignal.timeout(3000),
        });
        if (response.ok) {
          const rooms = await response.json();
          if (Array.isArray(rooms)) {
            rooms.forEach((r: any) => {
              if (r.roomId && now - r.timestamp < 25000) {
                results.set(r.roomId, {
                  roomId: r.roomId,
                  name: r.name || 'Fire TV',
                  timestamp: r.timestamp,
                  source: 'WIFI_LAN',
                });
              }
            });
          }
        }
      } catch (e) {
        // Local API endpoint timed out or offline
      }
    }

    // 2. Query LocalStorage beacon (for local dev / same device)
    try {
      const cached = localStorage.getItem('kettlebell_knight_active_room');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.roomId && now - parsed.timestamp < 15000) {
          if (!results.has(parsed.roomId)) {
            results.set(parsed.roomId, {
              roomId: parsed.roomId,
              name: parsed.name || 'Local TV (Tab)',
              timestamp: parsed.timestamp,
              source: 'LOCAL_CACHE',
            });
          }
        }
      }
    } catch (e) {}

    return Array.from(results.values()).sort((a, b) => b.timestamp - a.timestamp);
  }
}

export const discoveryManager = DiscoveryManager.getInstance();
