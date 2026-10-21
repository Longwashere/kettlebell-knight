import type { PeerOptions } from 'peerjs';

/**
 * Deployment settings, read from VITE_* env vars at build time (see .env.example).
 * Everything falls back to the dev setup: same-origin phone URL, public PeerJS cloud, Google STUN only.
 */
const env = import.meta.env;

const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/**
 * The link the TV's QR code opens on the phone. Inside the packaged Fire TV app the page's own origin is
 * the app shell (https://localhost), so release builds must set VITE_PHONE_URL.
 */
let warnedPhoneUrl = false;

export function phonePairUrl(roomId: string): string {
  if (!env.VITE_PHONE_URL && !env.DEV && !warnedPhoneUrl) {
    warnedPhoneUrl = true;
    console.warn('[deployConfig] VITE_PHONE_URL is not set: the pairing QR code points at this page\'s own origin.');
  }
  const base = env.VITE_PHONE_URL?.replace(/\/+$/, '') || `${window.location.origin}${env.BASE_URL}phone`;
  return `${base}?room=${encodeURIComponent(roomId)}`;
}

/** Developer's X/Twitter profile, shown as a follow-for-updates QR code on the hub once a phone is paired. */
export const FOLLOW_URL = 'https://x.com/AnotherDevName';

/** STUN, plus TURN from a credentials endpoint or static env vars so strict NATs and cellular phones can relay. */
async function iceServers(): Promise<RTCIceServer[]> {
  const servers = [...STUN_SERVERS];

  if (env.VITE_ICE_SERVERS_URL) {
    try {
      const response = await fetch(env.VITE_ICE_SERVERS_URL, { signal: AbortSignal.timeout(4000) });
      const fetched = await response.json();
      if (Array.isArray(fetched)) servers.push(...fetched);
    } catch (err) {
      console.warn('[deployConfig] Could not fetch TURN credentials, using STUN only:', err);
    }
  }

  if (env.VITE_TURN_URLS) {
    servers.push({
      urls: env.VITE_TURN_URLS.split(',').map((url) => url.trim()).filter(Boolean),
      username: env.VITE_TURN_USERNAME,
      credential: env.VITE_TURN_CREDENTIAL,
    });
  }

  return servers;
}

/** Options for every `new Peer()`: the signalling server and ICE servers. */
export async function peerOptions(): Promise<PeerOptions> {
  const options: PeerOptions = {
    debug: 1,
    config: { iceServers: await iceServers() },
  };

  if (env.VITE_PEER_HOST) {
    options.host = env.VITE_PEER_HOST;
    options.secure = env.VITE_PEER_SECURE !== 'false';
    options.port = env.VITE_PEER_PORT ? Number(env.VITE_PEER_PORT) : options.secure ? 443 : 80;
    options.path = env.VITE_PEER_PATH || '/';
    if (env.VITE_PEER_KEY) options.key = env.VITE_PEER_KEY;
  }

  return options;
}
