import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Fire TV app shell (Android WebView). By default the built game in dist/ ships inside the APK.
 * Set CAP_SERVER_URL=https://your-host/tv before `npx cap sync` to load the hosted game instead
 * (updates go live on redeploy, but the TV then needs the network to start).
 */
const serverUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  // Permanent store identity: change it before the first Amazon submission, never after.
  appId: 'com.kettlebellknight.tv',
  appName: 'Kettlebell Knight',
  webDir: 'dist',
  backgroundColor: '#0F0E17',
  server: serverUrl ? { url: serverUrl, cleartext: false } : { androidScheme: 'https' },
  android: {
    // The phone talks to the TV over WebRTC; no WebView debugging in release builds. CAP_WEBVIEW_DEBUG=1 npm run
    // tv:sync turns it on, to profile on the stick via chrome://inspect (or adb forward + CDP).
    webContentsDebuggingEnabled: process.env.CAP_WEBVIEW_DEBUG === '1',
  },
};

export default config;
