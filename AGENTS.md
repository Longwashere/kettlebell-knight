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
npm run balance [-- campaign|encounters] [N] [cards]  # balance sim: stage win rates by level/effort, or a full campaign playthrough
npm run rigs [-- ids]         # monster rig reference → work/rigs.md: anims + frame lengths + events, moveset, portraits
npm run vfx:shrink            # TV-sized copies of the Spine VFX: public/assets/spine/vfx → vfx-tv (rerun after adding one)
python3 scripts/shrink_monsters.py  # TV-sized monster atlases (monsters → monsters-tv) from `npm run shot -- density`; rerun after adding a rig or changing its scale
npm run sfx [-- ids]          # render the procedural sound bank to work/sfx/*.wav + index.html to audition
npm run music                 # render the Electric Pow Wow workout soundtrack & stems to work/music/ + web asset
python3 scripts/build_phone_armor.py  # cut the knight's armour parts from the Spine atlas for the phone AR overlay
python3 scripts/build_store_art.py   # Amazon Appstore art (store/amazon/) + Fire TV banner & launcher icons from store/cover.png
npm run build:pages  # GitHub Pages build: phone PWA + /tv demo (see Deploy)
npm run tv:sync    # build + copy dist/ into the Capacitor Android (Fire TV) project in android/
(cd android && JAVA_HOME=$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home ./gradlew assembleRelease)  # signed APK → android/app/build/outputs/apk/release/ (needs android/keystore.properties; Gradle 8.14 can't run on JDK 25)
npm run tv:open    # open android/ in Android Studio to build the APK
```

Routes: `/` launcher · `/tv` Fire TV game · `/phone` phone companion · `/test` (alias `/lab`) motion-detection lab.

## Layout

- `src/tv/` — TV app. `engine/GameEngine.ts` is the imperative PixiJS engine; `engine/monsterMoves.ts` holds the
  choreographed monster attacks (frame timelines of Spine anims, movement, camera and VFX; damage lands on `impact()`)
  for the first six monsters and the `MONSTER_MOVES` registry; the rest of the bestiary is in `engine/moves/*.ts`
  (grouped by theme), all built on the helpers in `engine/monsterKit.ts`;
  `engine/knightMoves.ts` does the same for knight attacks (one move per card templateId; the plain-steel starter cards a
  new game begins with are in `engine/starterMoves.ts`; VFX kit in `engine/fxKit.ts`,
  shared primitives in `engine/choreo.ts`, knight host + helpers in `engine/knightKit.ts`); `engine/spellMoves.ts` holds
  the weapon spells' choreography; `components/` are React
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

## Deploy

- The phone companion is on GitHub Pages (https://longwashere.github.io/kettlebell-knight/phone), deployed by
  `.github/workflows/pages.yml` on every push to `main`. `npm run build:pages` (Vite mode `pages`, `.env.pages`) serves
  `/phone`, `/test` and, for demos in a desktop browser, `/tv`, under base `/kettlebell-knight/`. Build every public asset
  URL from `ASSET_ROOT` (src/shared/assetRoot.ts) or `import.meta.env.BASE_URL`, never a bare `/assets/...`. It's an installable PWA: icons + service worker in `pwa/`, manifest written by
  `pagesSitePlugin` in vite.config.ts. The TV keeps its room code across launches and the phone remembers its last
  room (`lastPairedRoom`), so the home-screen app reconnects without the QR code. The Fire TV app is a Capacitor Android shell (`capacitor.config.ts`, `android/`) bundling `dist/`
  (or loading `CAP_SERVER_URL`); `src/tv/native.ts` bridges the remote's Back key and exits from the title menu / hub.
- Release settings are `VITE_*` env vars read in `src/shared/deployConfig.ts` (see `.env.example`): `VITE_PHONE_URL`
  for the pairing QR code (set in `.env.production`; required in the APK, whose origin is `https://localhost`),
  PeerServer host, TURN (for Pages: repo Actions variables).
  Build peers with `peerOptions()`, never inline `new Peer()` options.
- LAN discovery (`/api/discovery`) is dev/preview only (`LAN_DISCOVERY`); production pairs by QR code or room code.

## Hard constraints (Fire TV)

- **Target is a 1 GB RAM Fire TV Stick.** Treat memory and VRAM as scarce.
- **Render at 426×240** and upscale with CSS `image-rendering: pixelated`. Don't raise the internal resolution.
- **Keep high-frequency data out of React state.** Rep telemetry from the phone goes straight into
  `engineRef.current.onRepCompleted()` (or other engine methods). React state is for menus and screens, not per-frame
  or per-rep updates.
- **Unload textures when you're done with them** (`Assets.unload`) on scene changes and equipment previews,
  to avoid WebGL context loss.
- **Graphics setting** (title menu, `src/tv/graphicsMode.ts`; the Fire TV app defaults to PERFORMANCE): the stick is
  GPU-bound, not JS-bound. Put new GPU-heavy overlay effects (backdrop-filter, blend modes, CSS filters, animated
  background-position, big translucent layers) behind a `:root[data-gfx='performance']` override in src/index.css, and
  engine-side extras behind `isPerformanceMode()`. Animate HUD bars with transforms, not width. Profile on the stick with
  `CAP_WEBVIEW_DEBUG=1 npm run tv:sync` + `chrome://inspect`; ship without it.
- **Remote input:** every interactive TV UI must be reachable with the D-pad. Key codes: 13 Enter, 37–40 arrows,
  4 Fire OS Back, 27 Vega OS Back/Escape, 179 or Space = demo-mode swing (battle only, not the town hub).
  Don't depend on mouse/hover.

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

## Combat balance

- Card numbers are derived, not hand-typed: `CARD_CATALOG` (src/types/battle.ts) lists design specs, and
  `designCard` (src/shared/cardBalance.ts) turns each spec's budget (reps × rep seconds × exercise intensity × rarity)
  into scaling: `dmgPct` (multiple of Attack), `blockPct`/`healPct` (shares of max HP), priced for `REFERENCE_KNIGHT`.
  Retune via `EXERCISE_PROFILE` / `BALANCE`, not individual cards. AOE (`ALL`) costs 1.9× per point: less per foe,
  more in total against 2–3 foes.
- Progression (src/shared/progression.ts): STR/HP/SPD; each level-up raises one stat from a shuffled bag (STR/HP +12–15%
  of themselves, SPD +3 up to 20 = −30% reps, 20% dodge). Attack = STR + weapon Attack. `bindCard` turns a template
  into a knight's card (Speed's rep cut, spell level +5%/level from casts, weapon elemental damage as `infusion`);
  `CardDeckManager` binds the deck to a `Loadout` (`loadoutFor(profile)` in ProfileManager) and rebinds mid-fight.
  Weapons: tier = `SHOP_ITEMS` level, Attack pegged to expected STR at its unlock level (`weaponLevelReq`), +6% per
  weapon level from casts. XP is granted per kill (win or lose) plus an expedition clear bonus.
- Gold is earned in battle only: each rep adds `repGold(power)` (src/shared/combatRules.ts) to the fight's purse, banked
  when that fight is won and forfeited on defeat; expedition clears add their `goldReward`.
- Elements (src/shared/elements.ts): FIRE→NATURE→EARTH→STORM→FROST→FIRE, HOLY↔VOID; strong ×1.5, resisted ×0.6.
  Cards/spells carry `element`, monsters get one from `MONSTER_ELEMENTS` (affixes override).
- Stage difficulty (src/shared/stageScaling.ts): each expedition level is normalized to the bestiary average, then
  scaled to the expected knight at its recommended level (1 + 4 × map + level − 1), × `STAGE_BALANCE`. Use
  `createStageEncounter`, not raw `createEncounterFromTemplate`, for anything the player fights.
- Card resolution (targeting, Block, Shatter, Stagger, elements) is the pure `resolveCard` in src/shared/combat.ts;
  `castMultiplier` (power 80 = ×1, up to ×1.5) is the effort axis. The TV battle screen and the simulator share all of it.
- A new game's deck is only the `starter_*` cards (`STARTER_CARD_IDS`, stored in `PlayerProfile.unlockedCards`); saves
  without that field keep the full catalog. Check the new-player deck with `STARTER=1 npm run balance`.
- After any balance change run `npm run balance` (stage table) and `npm run balance -- campaign`, and keep, for an
  on-level average knight: a map's level 1 ~75–95% expedition wins, its boss level ~45–80%; 4 levels under ~10–50%
  but all-in effort ~60–95%; 4 over ≥75%. Campaign: average effort arrives at each map about on level with 1–3 tries
  per stage; all-in clears while slightly under-levelled; casual still progresses by out-levelling.

## Weapon spells

Every weapon in `SHOP_ITEMS` grants 1 spell (legendaries 2), listed in `WEAPON_SPELLS` (src/types/weaponSpells.ts) and
built with `designCard` like any card. `CardDeckManager` shuffles two copies of each into the deck of the equipped
weapon. Each spell needs a choreography in `SPELL_MOVES` (src/tv/engine/spellMoves.ts) and art in `SPELL_ART`
(src/tv/components/cardArt.ts). Moves follow the weapon's motion: morning stars whirl (`whirl()`) and hurl their head
(hide the hand-held one with `h.weaponShown(false)`), bells drive and press, maces crush, swords cut. Anchor VFX to the
real weapon head with `h.weaponTip()`. Check with `kfilm:<id>` (the preview swaps in the granting weapon), `spellart`,
and `WEAPON=<id> npm run balance`: a weapon's deck should stay within a few points of `WEAPON=` (none). Keep spell reps
at 4–6 so big single hits don't overkill.

## Monster moves

Every intent in `MOVESETS` (src/shared/monsterMovesets.ts) names a choreography (`move`), registered in `MONSTER_MOVES`.
Workflow for new or changed moves:

1. `npm run rigs -- <monster>` (or read `work/rigs.md`) for the rig's animation names, frame lengths, Spine events,
   facing and height, and which animations existing moves already use. `work/rigs/<id>.png` shows what it looks like
   (`npm run shot -- portraits` regenerates them). Don't guess animation names: `h.anim()` silently ignores missing ones.
2. Write the move in the matching `engine/moves/*.ts` file with the `monsterKit.ts` helpers: `land()` for the
   damage-dealing contact (hit-stop, shake, flash, camera punch, sparks, `impact()`), `chip()` for lesser hits before it,
   `warnRing()` to telegraph floor strikes, `blink()` teleports, `dimSpan()` / `chargeTint()` / `tremble()` / `lean()`,
   `guard()` for DEFEND moves, and draw primitives (`beam`, `tentacle`, `dart`, `flier`, `crawler`, `graspingHand`,
   `orbitRing`, `hexWard`, plus everything in `fxKit.ts`). Positions: `chest(h)` / `head(h)` / `feet(h)` on the knight,
   `crown(h, up)` on the monster, `contact(h, gap)` for a melee offset.
3. `npm run shot -- movecheck:<ids>` — must report 0 errors. Fix its warnings too: damage landing before anything
   reaches the knight, missing rig animations, the monster not back at rest when the move ends (it visibly snaps),
   lesser hits after the damage label.
4. `npm run shot -- films:<monster>` — one sheet per monster, a row per move with the impact frame boxed in red. Look
   at it: the red frame should show the hit connecting.
5. Spine VFX (`engine/vfx.ts`, rigs in `public/assets/spine/vfx-tv/`) load with the monsters and unload with them
   (~8 MB VRAM). `land()`/`chip()` (monsters) and the knight's `land()` already add a hit spark coloured to the
   attack; for themed bursts use the kit beats `boom` (explosion), `crater` (slam dust), `toxic` (poison),
   `shatter` (ice), `circle` (floor rune), `portal` (ring burst), `flame` (follows a point), `blaze` (fire arc),
   `regen` (heal glow) or `h.vfx(name, x, y, opts)`. Knight cards take `land(h, i, { burst: 'crater' | 'explosion' | … })`.
   `h.vfx()` returns null while rigs load, so keep the Graphics VFX too. Preview/size with `vfxinfo` / `vfxsheet`.
   Ground-layer rigs are hidden behind bodies at their feet; bursts at someone's feet go on the fx layer.
6. New intents change damage per second: keep `damage / durationSeconds` near the monster's existing average and run
   `npm run balance`.

## Sound

- No audio files ship. `src/shared/sfx/bank.ts` holds ~75 procedural recipes (built from `dsp.ts`) that render a small
  mono 22 kHz buffer the first time they play; `AudioManager` prewarms the whole bank when monsters load, caps
  voices at 12, softens or drops the same sound stacked within 45 ms, and runs everything through one compressor.
- Moves call `h.sound(id, { vol, rate, delay })` with a bank id (`chomp`, `claw`, `roar`, `zap`, `splash`, …). The kits
  already add the common layers: `land()` picks an impact by weight (monsters) or rarity/crit plus an iron clang for
  non-sword weapons (knight; pass `sfx:` / `sound:` for the attack's own contact sound), `chip()` takes a sound,
  `slashFx`/`crackFx`/`chargeFx`/`chargeTint`/`warnRing`/`guard`/`backstep` sound themselves, and every `h.vfx()`
  plays its element (explosion, ice, poison, fire, shockwave, portal, rune, heal). Knight impact on the player adds
  `hurt`, or `block` when fully blocked. Use `swingSound(h, big)` for knight weapon swings.
- Give each new move a wind-up/voice cue, a travel or launch cue, and its contact sound. Add a recipe to the bank
  only when nothing fits; audition it with `npm run sfx -- <id>`. `__kk.call('audioReset')` returns and clears the
  per-sound play counts (`state().audio`), which is how to check a move's sounds headlessly.

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
