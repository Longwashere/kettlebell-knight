/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public URL of the phone companion, e.g. https://play.example.com/phone. The TV's QR code points here. */
  readonly VITE_PHONE_URL?: string;
  /** Self-hosted PeerServer (`peer` npm package). Unset = the free public PeerJS cloud. */
  readonly VITE_PEER_HOST?: string;
  readonly VITE_PEER_PORT?: string;
  readonly VITE_PEER_PATH?: string;
  readonly VITE_PEER_KEY?: string;
  /** 'false' for a plain-http PeerServer (local testing only). */
  readonly VITE_PEER_SECURE?: string;
  /** URL that returns a JSON array of RTCIceServer (e.g. Metered's TURN credentials endpoint). */
  readonly VITE_ICE_SERVERS_URL?: string;
  /** Static TURN relay: comma-separated turn:/turns: URLs plus credentials. */
  readonly VITE_TURN_URLS?: string;
  readonly VITE_TURN_USERNAME?: string;
  readonly VITE_TURN_CREDENTIAL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
