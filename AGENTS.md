# Kettlebell Knight — Agent Guide

Shared instructions for every AI coding agent (Claude Code, Gemini/Antigravity, etc.).
This file is the single source of truth: `CLAUDE.md` imports it and `GEMINI.md` is a symlink to it.
Edit **this** file, not the others.

## What this is

A 32-bit retro fitness RPG. A Fire TV screen runs the game; a phone acts as a computer-vision
controller that counts kettlebell reps and streams them to the TV peer-to-peer.

Stack: React 19, TypeScript (strict), Vite 6, Tailwind 3, PixiJS v8, Spine (`@esotericsoftware/spine-pixi-v8`),
MediaPipe Tasks Vision, PeerJS (WebRTC), Howler.

## Commands

```bash
npm run dev       # Vite on 0.0.0.0:5173 (reachable from phones on the LAN)
npm run build     # tsc type-check + vite build — run this to verify changes; there is no test suite
npm run preview
npm run shot -- <steps>   # headless /tv run: screenshots + state + console errors → work/shots/ (see kk-verify skill)
```

Routes: `/` launcher · `/tv` Fire TV game · `/phone` phone companion · `/test` (alias `/lab`) motion-detection lab.

## Layout

- `src/tv/` — TV app. `engine/GameEngine.ts` is the imperative PixiJS engine; `engine/monsterMoves.ts` holds the
  choreographed monster attacks (frame timelines of Spine anims, movement, camera and VFX; damage lands on `impact()`); `components/` are React
  overlays (hub, battle, blacksmith, QR pairing); `hooks/useTVRemote.ts` handles D-pad/remote keys.
- `src/phone/` — phone app. `utils/KinematicTracker.ts` is the per-exercise rep state machine (13 exercises);
  `utils/KnightArmorRenderer.ts` draws the knight overlay; `components/PhoneView.tsx` wires camera → tracker → network.
- `src/shared/` — singletons used by both sides: `NetworkManager` (PeerJS data channel), `DiscoveryManager`
  (LAN room discovery), `AudioManager`, `CardDeckManager`.
- `src/types/` — `game.ts` (exercises, telemetry, peer messages, equipment) and `battle.ts`.
- `src/test/MotionTestView.tsx` — calibration lab for the trackers.
- `vite.config.ts` — contains a dev/preview-server middleware for LAN discovery
  (`POST /api/discovery/register`, `GET /api/discovery/rooms`, rooms expire after 25s). It only exists in
  dev/preview; a static production host won't have it.
- `public/assets/spine/<character>/` — generated Spine rigs (`.json` + `.atlas` + `.png`, `config.json`,
  `parts/`, `preview.html`). `images` is a symlink to `parts`.
- `work/` — scratch space for asset-generation scripts (untracked).
- `.agents/skills/` — project skills (PixiJS v8 collection + `spine-animation`). `.claude/skills` symlinks here.

## Hard constraints (Fire TV)

- **Target is a 1 GB RAM Fire TV Stick.** Treat memory and VRAM as scarce.
- **Render at 426×240** and upscale with CSS `image-rendering: pixelated`. Don't raise the internal resolution.
- **Keep high-frequency data out of React state.** Rep telemetry from the phone goes straight into
  `engineRef.current.onRepCompleted()` (or other engine methods). React state is for menus and screens, not per-frame
  or per-rep updates.
- **Unload textures when you're done with them** (`Assets.unload`) on scene changes and equipment previews,
  to avoid WebGL context loss.
- **Remote input:** every interactive TV UI must be reachable with the D-pad. Key codes: 13 Enter, 37–40 arrows,
  4 Fire OS Back, 27 Vega OS Back/Escape, 179 or Space = demo-mode swing. Don't depend on mouse/hover.

## Phone constraints

- Request the screen Wake Lock only inside a user-gesture handler (the "Begin Workout" click).
- The camera (`getUserMedia`) needs a secure context: it works on `localhost`, but a phone hitting the dev
  server over a LAN IP needs HTTPS.
- MediaPipe WASM and the pose model are loaded from CDNs (jsDelivr, storage.googleapis.com).

## Conventions

- Import alias `@/` → `src/`.
- Visual style: dark retro palette and pixel fonts defined in `tailwind.config.js` (`retro.*` colors;
  `font-pixel`, `font-display`, `font-retro`) and pixel borders/CRT effects in `src/index.css`. Reuse them rather
  than adding one-off colors.
- Network messages are typed in `src/types/game.ts` (`PeerMessage`, `RepTelemetry`). Change the types first,
  then both the phone and TV sides.
- PixiJS is **v8**. Don't use v7 APIs (e.g. use `await app.init()`, not constructor options).
- Commits use conventional prefixes: `feat(scope): …`, `fix(scope): …`.

## Spine assets

- The TV engine still draws the knight with `Graphics` plus a `SkeletonAttachmentMock`; the generated Spine rigs
  in `public/assets/spine/` are not wired into `src/` yet.
- Rigs are built with the `spine-animation` skill's Python scripts
  (`.agents/skills/spine-animation/scripts/`): split/position parts → `build_spine_json.py --config config.json`
  → `make_atlas.py` → `generate_spine_player.py` for an HTML preview. Target Spine format 4.2.
- To change a rig, edit its `config.json` and regenerate. Don't hand-edit the generated skeleton JSON.

## Skills

For PixiJS work, start from the `pixijs` skill. It routes to the specific sub-skill. For rigging or animating
characters, use `spine-animation`.
After changing anything rendered on the TV, verify it with the `kk-verify` skill (`npm run shot`) and look at
the screenshots. Don't rely on `npm run build` alone. In dev, `window.__kk` (`src/tv/debug/agentBridge.ts`) exposes
game state and controls. Register new screens and engine systems there.
