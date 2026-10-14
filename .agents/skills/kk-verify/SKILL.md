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

# A monster move, as a deterministic film strip (ticker is stepped frame-by-frame, 16 shots every 6 frames)
npm run shot -- encounter:solo_wolf idle film:0:wolf_phantom_pack
npm run shot -- "encounter:wolf,boar,slime" idle film:2:slime_ooze_slam:10:10   # from a back formation slot

# Every animation in a monster's Spine rig as a contact sheet (pick animations for new moves)
npm run shot -- encounter:solo_boar idle sheet:0

# Knight attacks (knightMoves.ts): list moves + rig timing, see poses, film a move (default 16 shots every 3 frames)
npm run shot -- encounter:solo_wolf idle kmoves kanims
npm run shot -- encounter:solo_wolf idle "ksheet:6:ATTACK|SKILL"
npm run shot -- encounter:solo_wolf idle kfilm:swing_cleave
npm run shot -- "encounter:wolf,boar,slime" idle kfilm:halo_cyclone:16:3:0,1,2   # multi-target, hit order 0,1,2

# Card art and exercise technique poses as review sheets
npm run shot -- cardart
npm run shot -- guides:4

# A card's technique side (Enter flips the focused card)
npm run shot -- encounter:solo_boar freeze idle "eval:__kk.call('focusCard', 2)" key:Enter wait:900 shot:howto

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

Monster moves live in `src/tv/engine/monsterMoves.ts` (one timeline function per move, ids in
`MonsterMoveId`); movesets are `MOVESETS` in `BattleScreen.tsx`. `__kk.call('attack', slot, moveId)` plays one
now; `__kk.call('moves', slot)` lists a slot's moves. Use `film:` to review a move instead of real-time `shot:`s.

Knight moves live in `src/tv/engine/knightMoves.ts`: one Timeline choreography per battle card, keyed by
CARD_CATALOG `templateId`, built from the VFX kit in `fxKit.ts`. Contact goes through `land()` (hit-stop,
shake and flash scaled by rarity). `kmoves` lists them with rarity and targeting. `__kk.knightMove(id, slots?)`
plays one without changing battle state. `kanims` lists rig anim lengths in frames, plus Spine events such as
`DamToTarget` hit frames. Sync `h.impact()` to the frame where the blade connects in `ksheet`, not to a guess.
Film multi-target cards against a trio with their real hit order (ALL `0,1,2`, BACK `1`, PIERCE `0,1`), and keep
leaps under ~40px of lift: the knight is ~65px tall and clips off the top of the screen.

`state() · actions() · call(name, ...args) · film(slot, move, count?, step?) · sheet(slot, frames?) ·
knightFilm(move, count?, step?, slots?) · knightSheet(frames?, regex?) · knightAnims() · knightMoves() ·
knightMove(id, slots?, damage?) · goto(view) · encounter(idOrIndexOrList) · rep(exercise?, power?,
form?) · cast(count?) · freeze(on) · background(key) · ready() · idle(timeoutMs?, settleMs?) ·
waitFor(predicate) · textures() · snapshot()`

`rep()` goes through `networkManager.injectTelemetry`, the same listeners real phone telemetry hits.
