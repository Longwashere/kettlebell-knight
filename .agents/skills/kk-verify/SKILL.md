---
name: kk-verify
description: Verify Kettlebell Knight TV changes visually and behaviourally — drive the /tv app headlessly via the window.__kk dev bridge, inject reps, start encounters, take screenshots, and check VRAM/texture usage. Use after any change to the TV engine (GameEngine, VFX, Spine rigs, backgrounds) or TV React screens (battle, hub, blacksmith), when asked to screenshot the game, or to check for texture leaks.
---

# kk-verify

`npm run shot -- <steps...>` opens `/tv` in headless Chrome, runs the steps in order, saves PNGs to
`work/shots/<timestamp>/`, and prints page console errors/exceptions. It starts Vite itself if nothing is
on :5173. Exit code 1 means a step failed or the page threw. Look at the PNGs with the Read tool.

`npm run shot -- --help` lists every step and option.

## Recipes

```bash
# A new attack / VFX: settle, cast the focused card, catch mid-impact and the aftermath
npm run shot -- encounter:solo_wolf freeze idle shot:before cast wait:200 shot:impact idle shot:after

# A specific exercise's attack animation (bypasses cards: engine VFX fire on every rep)
npm run shot -- encounter:solo_boar freeze idle rep:SNATCH wait:250 canvas:snatch

# A new monster rig or formation: ad-hoc encounter from MONSTER_CATALOG ids or sprite types
npm run shot -- "encounter:boar,demon_monk,wolf" bg:BLOOD_CEMETERY freeze idle canvas:formation

# Texture/VRAM leak check across a scene change (Fire TV has 1 GB RAM)
npm run shot -- encounter:solo_monk idle textures goto:HUB idle textures

# Menus via the real D-pad path
npm run shot -- key:ArrowLeft key:Enter idle shot:after-select state
```

- `shot:` is the full 1278×720 page (canvas + React HUD). `canvas:` is the Pixi stage alone at native
  426×240 — smaller, and what to use when judging pixel art, rigs and VFX.
- Use `freeze` in battle so monster timers don't attack or kill the knight mid-capture.
- Use `idle` rather than guessed `wait:` delays; keep `wait:<ms>` only for catching a mid-animation frame.
- `state` prints JSON for screen, engine (animations, VFX counts, camera, loading) and battle (HP, hand,
  intents). Use it to assert outcomes rather than only eyeballing screenshots.

## In-page API (`window.__kk`, dev server only)

Defined in `src/tv/debug/agentBridge.ts`. Components register into it with `registerDebug(name, stateFn,
actions)` from a `useEffect`; the engine exposes `getDebugState()`, `getTextureStats()` and `snapshot()`.
When you add a new screen or engine system, register its state there so it stays observable.

`state() · actions() · call(name, ...args) · goto(view) · encounter(idOrIndexOrList) · rep(exercise?, power?,
form?) · cast(count?) · freeze(on) · background(key) · ready() · idle(timeoutMs?, settleMs?) ·
waitFor(predicate) · textures() · snapshot()`

`rep()` goes through `networkManager.injectTelemetry`, the same listeners real phone telemetry hits.
