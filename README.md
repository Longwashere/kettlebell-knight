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
cd /Users/longm4/.gemini/antigravity/scratch/kettlebell-knight

# Start Vite dev server (accessible across local network for phone testing)
npm run dev

# Or build for production
npm run build
```

Open:
- TV interface: `http://localhost:5173/tv`
- Phone companion: `http://localhost:5173/phone`
- Root launcher: `http://localhost:5173/`
