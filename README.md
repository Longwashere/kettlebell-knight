# Kettlebell Knight ⚔️
### 32-Bit Retro Fitness RPG for Amazon Fire TV (Vega OS / Fire OS) & Mobile Companion

A high-performance monorepo web application pairing a 10-foot Fire TV UI with an AI computer-vision mobile companion.

---

## 🎮 Architecture Overview

The app is built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, and **PixiJS v8**:

1. **`GET /tv` (Amazon Fire TV 10-Foot UI):**
   - **426x240 Virtual Resolution:** PixiJS v8 canvas rendered at retro 240p widescreen and upscaled via CSS `image-rendering: pixelated` for authentic 32-bit pixel art and minimum VRAM footprint on 1GB RAM Fire TV Sticks.
   - **Zero React Layout Thrashing:** High-frequency WebRTC telemetry bypasses React component state and feeds directly into `engineRef.current.onRepCompleted()`.
   - **Spatial D-Pad Remote Navigation (`useTVRemote`):** Full spatial navigation supporting Fire TV keycodes:
     - `13`: Select / Enter
     - `37-40`: D-Pad Left, Up, Right, Down
     - `4`: Fire OS Back button
     - `27`: Vega OS Back / Escape
     - `179` / `Spacebar`: Headless Demo Mode swing trigger
   - **Spine Equipment Preview:** Live equipment swap on the knight skeleton with automatic VRAM asset unloading (`Assets.unload()`).
   - **Hub Town 4-Node Overlay (`z-index: 10`):** Guild Gate (Dungeon Battles), Blacksmith (Equipment Forge), Alchemist (Potions), Sanctuary (Kinematics & Stats).

2. **`GET /phone` (Mobile Vision Companion):**
   - **MediaPipe Pose Landmarker:** Running real-time computer vision in the browser.
   - **Frontal Y-Axis Kinematic Tracker (`KinematicTracker`):**
     - **State 0 (Hike):** `(leftWrist.y + rightWrist.y)/2 > (leftHip.y + rightHip.y)/2`
     - **State 1 (Drive):** High upward wrist velocity (`dy/dt`)
     - **State 2 (Peak / Lockout):** Wrists reach shoulder plane `(leftShoulder.y + rightShoulder.y)/2`
     - Emits: `{ event: "REP_TRIGGER", power: number, form: number }`
   - **Strict Screen WakeLock:** Requested strictly within the `onClick` handler of the "Begin Workout" button.
   - **WebRTC RTCDataChannel (`NetworkManager`):** Direct peer-to-peer telemetry streaming with Google STUN fallbacks (`stun:stun.l.google.com:19302`).

---

## 🚀 Running the Project

```bash
# Navigate to project directory
cd ~/Desktop/kettlebell-knight

# Start Vite dev server (accessible across local network for phone testing)
npm run dev

# Or build for production
npm run build
```

Open:
- TV interface: `http://localhost:5173/tv`
- Phone companion: `http://localhost:5173/phone`
- Root launcher: `http://localhost:5173/`

---

## 📺 Testing on a Fire TV

The Fire TV app is a Capacitor Android shell (`android/`) that bundles the built game from `dist/`. You build an APK and sideload it over ADB.

### 1. Prepare the Fire TV

1. **Settings → My Fire TV → About**: select the device name 7 times to unlock **Developer Options**.
2. **Settings → My Fire TV → Developer Options**: turn on **ADB debugging** and **Apps from Unknown Sources**.
3. **Settings → My Fire TV → About → Network**: note the TV's IP address. Your computer must be on the same network.

### 2. Build the APK

You need the Android SDK (Android Studio installs it) and JDK 21. Gradle 8.14 doesn't run on JDK 25.

```bash
npm run tv:sync   # build the game and copy dist/ into android/

# Debug APK (no keystore needed) → android/app/build/outputs/apk/debug/app-debug.apk
(cd android && JAVA_HOME=$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home ./gradlew assembleDebug)
```

A signed release build (`./gradlew assembleRelease`) needs `android/keystore.properties`. You can also open the project in Android Studio with `npm run tv:open`.

### 3. Install and launch

```bash
adb connect <TV-IP>:5555          # accept the "Allow USB debugging?" prompt on the TV the first time
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell monkey -p com.kettlebellknight.tv 1   # launch it (or find it under Your Apps & Channels)
```

If the install fails with a signature mismatch (switching between debug and release builds), run `adb uninstall com.kettlebellknight.tv` first.

### 4. Pair a phone

Scan the QR code on the TV with your phone. It opens the phone companion hosted on GitHub Pages (`VITE_PHONE_URL` in `.env`, used by the dev server too). You can also open https://longwashere.github.io/kettlebell-knight/phone and enter the room code. The phone and TV connect peer-to-peer, so LAN discovery isn't needed.

### Debugging on the device

```bash
CAP_WEBVIEW_DEBUG=1 npm run tv:sync   # rebuild with WebView debugging on, then reinstall
```

Open `chrome://inspect` in desktop Chrome to get DevTools (console, performance profiler, memory) for the game running on the stick. Don't ship a build with this flag.

For a quick look without building an APK, open https://longwashere.github.io/kettlebell-knight/tv in the Fire TV's Silk browser. The APK is still the real test for performance and remote input.
