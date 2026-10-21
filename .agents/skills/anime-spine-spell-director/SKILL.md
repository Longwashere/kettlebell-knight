---
name: anime-spine-spell-director
description: Directs anime-style (sakuga) spell and combat animation in PixiJS v8 + Spine 2D (@esotericsoftware/spine-pixi-v8) — anticipation camera push-ins, Dutch-angle rolls, trauma shake, hit-stop and impact frames, speed lines, after-images (zanzo), additive bone-anchored lighting and charge-up particles. Use when writing or refactoring a weapon spell, knight attack or monster move that should feel like an anime set piece, or when asked for "anime spell animation", "pixi spine combat fx", "anime camera", "sakuga", "hit stop", "after-images" or "impact frame".
---

# Anime Spell & Combat VFX Director (PixiJS v8 + Spine 2D)

Act as a technical director for Japanese anime combat choreography (sakuga) implemented in WebGL with PixiJS v8
and Spine 2D. Sections 1–7 are the general craft; **section 0 says how it maps onto Kettlebell Knight and wins
wherever they disagree.**

---

## 0. In this repo (read first)

Most of these systems already exist. Build with them; don't add a parallel camera, after-image pool or
post-processing stack.

| Principle | Use in Kettlebell Knight |
|---|---|
| Anticipation push-in + charge motes | `windUp(h, tl, from, to, color, { zoom, slow, at })` (src/tv/engine/spellKit.ts) |
| Camera framing / zoom | `h.camera(zoom, x, y, holdFrames, snap?)` |
| Shake | `h.shake(intensity)` (the engine owns decay) |
| Hit-stop | `h.hitStop(frames)`; `land()` already adds hit-stop, shake, flash and camera punch |
| Impact frame / inverted silhouettes | `impactFrame(h, tl, where, { color, dim, hold, lines })` — once per spell, inside the contact event after `land(…, { glare: 0.2 })` |
| White flash | `h.flash(alpha, color?)`; target hit flash / silhouette: `h.flashTarget(i, color, frames, exact)` |
| Speed lines / focus lines | `speedLines(h, tl, from, to, at, color)`, `focusLines(g, …)` |
| Dutch angle (camera roll) | `h.roll(radians, holdFrames, snap?)` / `dutch(h, tl, at, radians, hold)` on knight moves (±0.12 max; springs level). `h.tilt()` rolls a monster's body |
| After-images (zanzo) | `h.ghost(color, alpha?, life?)` — additive, tinted, self-fading; call it every few frames during a dash |
| Additive light | `lightSpan` + `glow` / `godRay` / `glint` / `shockSphere` / `skyBolt` / `ribbon` |
| Bone-anchored light | anchor to `h.weaponTip()` (knight weapon head), `chest(target)` on knight targets; in monster moves `chest(h)` / `head(h)` / `feet(h)` on the knight and `crown(h, up)` |
| Weapon smear | `weaponTrail(h, tl, from, to, pal)` |
| Ambient dim / color drain | `dimScene(h, tl, from, to, alpha, color)`, `dimSpan()` in monsterKit |
| Themed Spine VFX bursts | `h.vfx(name, x, y, opts)` and kit beats `boom`, `crater`, `shatter`, `portal`, … (returns null while rigs load — keep a Graphics fallback) |
| Sound per beat | `h.sound(id, …)`: a wind-up cue, a travel/launch cue, a contact sound |
| A spell's theme | a `Look` (`LOOK.<ELEMENT>` or `themed(LOOK.X, colour, motif, { sound })`): light/core/deep colours + a motif (flame, flake, bolt, shard, leaf, cross, crescent, bell, coin, note, eye, skull, feather, moon, sun, wave, web, star…) |
| The whole charge in one call | `chargeUp(h, tl, from, to, look, { breath, freeze, circle, aura, at, roll })` = `castCircle` + `aura` + `motes` + `breath` (+ roll on release) |
| Element burst on contact | `signature(h, tl, at, where, look, size)` — inside a contact callback pass `tl.frame` |
| Long anticipation before a fast spell | `staged(n, look, move, { pose, at, circle, lean })` in the registry: an n-frame BUFF/DEFENSE prelude, then the move unchanged on `shifted(tl, n)` |

Hard limits that override the generic numbers below (see AGENTS.md):

- **1 GB Fire TV Stick, GPU-bound, 426×240.** No per-frame `RenderTexture` captures, no filter passes for
  chromatic aberration / bloom / radial blur, no new full-screen translucent layers. Fake them with additive
  Graphics. Thin anything extra under `lite()` / `isPerformanceMode()`.
- **Zoom stays modest.** 1.8–2.5× at 426×240 is a few dozen pixels of mush; the kit uses ~1.2–1.4×. Push in harder
  only for a single held beat and check the frame.
- **Timing is in frames on a `Timeline`** (`tl.at(frame, fn)`, `drawSpan`), not milliseconds or tweens.
- Secondary hits keep `glare` ≤ 0.5 so stacked flashes don't grey the frame.
- Spell reps 4–6; follow the weapon's motion (morning stars whirl and hurl, bells drive and press, maces crush,
  swords cut). Register in `SPELL_MOVES` with art in `SPELL_ART`.
- Monster moves: read the rig first (`npm run rigs -- <id>`); never guess animation names.
- Verify: `npm run shot -- kfilm:<spellId>` (spells), `movecheck:<ids>` + `films:<monster>` (monster moves), and
  look at the impact frame. Use the `kk-verify` skill. `npm run build` alone isn't verification.

---

## 1. Scene graph hierarchy & layering

Keep layers strict so z-sorting and camera transforms never fight:

```text
app.stage
└── WorldContainer (driven by the camera)
    ├── BackgroundLayer (parallax, speed lines)
    ├── WorldBackFXLayer (ambient runes, casting circles)
    ├── ShadowLayer
    ├── EntityLayer (Spine skeletons, after-images)
    ├── WorldFrontFXLayer (slashes, projectiles, hit sparks)
    └── WorldLightingLayer (additive lights, glow meshes)
└── ScreenPostProcessingLayer (distortion, aberration, bloom — desktop only)
└── ForegroundLayer (letterbox, lens dirt, UI/subtitles)
```

Here: the move hosts expose `'back' | 'ground' | 'fx'` layers. Ground-layer rigs hide behind bodies at their feet,
so bursts at someone's feet go on `fx`.

---

## 2. Dynamic anime camera

Anime combat never holds a static frame.

- **Anticipation push-in** on the caster (face, hand, weapon head) during the chant/build-up.
- **Dutch angle**: a quick roll (±0.08–0.2 rad) along the release vector sells momentum.
- **Trauma shake**, not sine waves: `offset = trauma² × maxOffset × noise(t)`, trauma ∈ [0, 1] decaying
  exponentially each frame. Hits add trauma; they don't set it.
- **Dynamic framing**: aim at the midpoint between caster and target anchor points (bones via
  `skeleton.findBone(name)`), biased toward whoever acts next.

---

## 3. Sakuga timing

- **Hit-stop**: on contact freeze the rigs (Spine `timeScale = 0`, timeline paused) for 2–5 frames, with a
  single-frame white flash that decays over ~6 frames.
- **Speed lines / radial streaks**: tapered polygons aligned to the travel direction during charge and dash.
- **Impact frame**: on the biggest hit, flash the figures to pure black-on-white (or invert the field) for 1–3
  frames, then snap back.
- **Rhythm**: slow → hold → *snap*. Long anticipation, a held breath, then a release that takes 1–3 frames. Smears
  and after-images fill the frames the eye skipped.

---

## 4. After-images (zanzo)

During fast dashes or cast bursts, every N frames (≈3) while speed is above a threshold:

1. Capture the current pose (here: `h.ghost()`; elsewhere a pooled sprite/RenderTexture of the skeleton).
2. Tint it (cyan `0x00ffff`, magenta `0xff0055`, gold `0xffcc00`, or the spell's element colour).
3. Additive blend (`blendMode = 'add'`).
4. Fade alpha over ~9–18 frames with ease-out, then return it to the pool.

---

## 5. Lighting & aura

- **Rim light**: an additive coloured outline/tint pass on the character during the cast.
- **Point lights**: radial glows (`'add'`) pinned to bones or the weapon head, re-read every frame.
- **Charge accumulation**: motes or converging curves from ambient space into the hand/weapon before the
  release, growing brighter and faster as the charge peaks; end the charge with a glint.
- Light brightens what's under it (additive); smoke, debris and silhouettes stay normal-blended.

---

## 6. Beat template

A spell is five beats. In this repo, express them on the move's `Timeline`:

```ts
// 1. Anticipation — push in, slow the rig, light swells on the weapon, motes converge
windUp(h, tl, 0, 24, color, { zoom: 1.3, slow: 0.5 });
// 2. Charge / travel — speed lines into the target, after-images, weapon trail
const c = chest(t0); // t0 = the move's first target
speedLines(h, tl, 24, 34, () => c, color);
weaponTrail(h, tl, 24, 36, p);
for (let f = 24; f < 34; f += 3) tl.at(f, () => h.ghost(color, 0.5, 12));
// 3. Release — the snap (1–3 frames of motion), camera roll toward the target
// 4. Contact — land() then the one impactFrame(), plus the themed burst and shock sphere
tl.at(36, () => {
  land(h, 0, { glare: 0.2, burst: 'explosion' });
  impactFrame(h, tl, c, { color, dim: [0.35, 0x000000] }); // inside the contact event: it reads tl.frame
});
shockSphere(h, tl, 36, c, 48, color);
// 5. Settle — afterglow, rubble, camera eases back; everyone returns to rest before the move ends
afterglow(h, tl, 38, 60, c.x, c.y, [color, 0xffffff]);
```

Outside this repo, the equivalent standalone structure is a sequence class owning a world container, a camera with
trauma, an after-image pool and an `update(dt)` that decays shake, fades ghosts and re-pins bone lights.

---

## 7. Quality checklist

1. **No leaks**: pooled textures/sprites, every Graphics destroyed or returned when its span ends, Spine VFX
   unloaded with the scene.
2. **Transform sync**: call `skeleton.updateWorldTransform()` before reading bone world positions in the same tick.
3. **Blend modes**: `'add'` for glows, slashes and light streaks; normal for silhouettes, smoke and debris.
4. **Easing**: nothing linear. Steep ease-in for anticipation, ease-out / back for release and settle
   (`easeIn`, `easeOut`, `easeInOut`, `arc` in choreo.ts).
5. **One climax**: a single impact frame per move; lesser hits use `chip()` / low glare.
6. **Readable at 240p**: check the films/screenshots — the red-boxed impact frame should show contact clearly.
