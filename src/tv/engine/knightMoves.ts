/**
 * Knight attack choreography.
 *
 * Same model as monsterMoves.ts: each move is a function that schedules work on a frame Timeline
 * (60 fps frames, driven by the engine ticker). It plays knight Spine animations, moves the knight,
 * drives the camera and draws Graphics VFX. `h.impact(i)` is the frame where hit `i` lands. The
 * engine flinches that monster and calls back into BattleScreen (damage numbers, deaths) there. Hits
 * a move never lands are landed when it ends, so a move can't swallow damage.
 *
 * Coordinates are battlefield (gameLayer) space: knight feet at home ≈ (130, 168), monsters to the
 * right at their formation slots (see `h.targets`). The knight rig is ~80px tall and faces right.
 *
 * Review a move with the dev bridge: `npm run shot -- encounter:solo_wolf idle kfilm:swing_cleave`
 * (film strip) and `ksheet` (every knight animation as a contact sheet). The knight anims are short
 * one-shots (ATTACK1-5 ≈ 20 frames); `h.anim()` returns the length in frames so moves can sync to it.
 * `__kk.knightAnims()` lists durations and Spine events (DamToTarget marks hit frames in SKILL2/3).
 *
 * Moves without choreography yet fall back to the legacy `execute*` methods in GameEngine.
 */
import type { Container, Graphics } from 'pixi.js';
import type { ExerciseType } from '../../types/game';
import {
  Timeline, type EmitOptions, type SfxName,
  lerp, easeIn, easeOut, easeInOut,
  BONE, BLOOD, BLOOD_DARK, EMBER, GOLD,
} from './choreo';

export interface KnightTarget {
  slot: number; // monster formation slot
  x: number; // feet
  y: number;
  height: number; // approximate sprite height in px
}

/** The card/rep that triggered the move. */
export interface KnightMoveContext {
  power: number; // 0-100
  form: number; // 0-1
  crit: boolean;
  damage: number; // real damage of the primary hit (battle) or a showcase number
  skillName?: string;
}

/** Engine services available to a knight move. Implemented in GameEngine.playKnightMove. */
export interface KnightMoveHost {
  /** Knight feet at rest. */
  readonly home: { x: number; y: number };
  /** Monsters this move hits, in hit order. Empty outside battle with no monsters. */
  readonly targets: readonly KnightTarget[];
  /** targets[0], or a stand-in point where the solo monster would be. */
  readonly target: KnightTarget;
  readonly ctx: KnightMoveContext;
  /** Current feet position (home + offset, ignoring lift). */
  pos(): { x: number; y: number };
  gfx(layer?: 'fx' | 'ground'): Graphics;
  container(layer?: 'fx' | 'ground'): Container;

  /** Plays a knight Spine animation (returns to IDLE after a one-shot). Returns its length in frames. */
  anim(name: string, loop?: boolean): number;
  /** Spine playback speed (1 = normal). Reset when the move ends. */
  animSpeed(scale: number): void;
  idle(): void;
  /** Displaces the knight from home (battlefield px). */
  offset(x: number, y?: number): void;
  /** Raises the rig off the ground (shadow shrinks). */
  lift(height: number): void;
  stretch(sx: number, sy: number): void;
  /** true = face left (e.g. while dashing back home). */
  face(left: boolean): void;
  alpha(a: number): void;
  tint(color: number): void;
  /** Afterimage of the knight's current pose, additive-tinted, fading over `life` frames. */
  ghost(color: number, alpha?: number, life?: number): void;

  camera(zoom: number, x: number, y: number, holdFrames: number): void;
  shake(intensity: number): void;
  flash(alpha: number, color?: number): void;
  hitStop(frames: number): void;
  dim(alpha: number, color?: number): void;

  /** Lands hit `i` (flinch + damage label + death), or every remaining hit (staggered a few frames) when omitted. */
  impact(i?: number): void;

  sparks(x: number, y: number, count: number, colors?: number[]): void;
  shockwave(x: number, y: number, color: number): void;
  streaks(x: number, y: number, length: number, colors?: number[]): void;
  emit(x: number, y: number, opts: EmitOptions): void;
  slashArc(g: Graphics, cx: number, cy: number, r: number, a0: number, a1: number, shadow: number, body: number, core: number): void;
  text(content: string, x: number, y: number, color: number, size: number): void;
  sound(name: SfxName): void;
}

export type KnightMove = (h: KnightMoveHost, tl: Timeline) => void;

/** One id per exercise attack and its upgraded variant (picked by skill name). */
export const KNIGHT_MOVE_IDS = [
  'swing_cleave', 'swing_whirlwind',
  'squat_ground_slam', 'squat_quake',
  'press_shoulder_ram', 'press_cleaver',
  'snatch_rising_slash', 'snatch_talon',
  'windmill_parry', 'windmill_ward',
  'deadlift_sunder',
  'ohp_smite', 'ohp_pillar',
  'thruster_coiled_slash', 'thruster_supernova',
  'row_flurry', 'row_shadow',
  'halo_cyclone', 'halo_vortex',
  'rdl_needle_thrust', 'rdl_crane',
  'clean_anvil_cleave',
  'lunge_cross_dash',
] as const;

export type KnightMoveId = (typeof KNIGHT_MOVE_IDS)[number];

/** Picks the move for a rep/card: the exercise, upgraded by keywords in the skill/card name. */
export function knightMoveFor(exercise: ExerciseType, skillName = ''): KnightMoveId {
  const n = skillName.toLowerCase();
  const has = (...words: string[]) => words.some((w) => n.includes(w));
  switch (exercise) {
    case 'SWING': return has('whirlwind', 'dragon') ? 'swing_whirlwind' : 'swing_cleave';
    case 'SQUAT': return has('quake', 'colossus') ? 'squat_quake' : 'squat_ground_slam';
    case 'CLEAN_AND_PRESS': return has('cleaver', 'stormbreaker') ? 'press_cleaver' : 'press_shoulder_ram';
    case 'SNATCH': return has('talon', 'solar') ? 'snatch_talon' : 'snatch_rising_slash';
    case 'WINDMILL': return has('ward', 'cosmic') ? 'windmill_ward' : 'windmill_parry';
    case 'DEADLIFT': return 'deadlift_sunder';
    case 'OVERHEAD_PRESS': return has('pillar', 'heavenly', 'judgement') ? 'ohp_pillar' : 'ohp_smite';
    case 'THRUSTER': return has('supernova', 'surge') ? 'thruster_supernova' : 'thruster_coiled_slash';
    case 'GORILLA_ROW': return has('shadow', 'ripper') ? 'row_shadow' : 'row_flurry';
    case 'HALO': return has('vortex', 'astral') ? 'halo_vortex' : 'halo_cyclone';
    case 'SINGLE_LEG_RDL': return has('crane') ? 'rdl_crane' : 'rdl_needle_thrust';
    case 'CLEAN': return 'clean_anvil_cleave';
    case 'LUNGE': return 'lunge_cross_dash';
    default: return 'swing_cleave';
  }
}

// ---------------------------------------------------------------------------------------------
// Shared choreography helpers

/** Offset that puts the knight's feet `gap` px in front of a target (on its lane). */
export function strikeSpot(h: KnightMoveHost, t: KnightTarget = h.target, gap = 58) {
  return { x: t.x - gap - h.home.x, y: t.y - h.home.y };
}

/** Target chest point (where blades and sparks connect). */
export const chest = (t: KnightTarget) => ({ x: t.x - 4, y: t.y - t.height * 0.55 });

/** Moves the knight between two offsets over [from, to], optionally hopping. */
export function travel(
  h: KnightMoveHost, tl: Timeline, from: number, to: number,
  a: { x: number; y: number }, b: { x: number; y: number },
  ease: (t: number) => number = easeInOut, hop = 0,
) {
  tl.during(from, to, (t) => {
    const e = ease(t);
    h.offset(lerp(a.x, b.x, e), lerp(a.y, b.y, e));
    if (hop) h.lift(Math.sin(t * Math.PI) * hop);
  });
  if (hop) tl.at(to, () => h.lift(0));
}

/** Afterimages every `step` frames over [from, to). */
export function ghostTrail(h: KnightMoveHost, tl: Timeline, from: number, to: number, color: number, step = 2, alpha = 0.45) {
  tl.every(from, to, step, () => h.ghost(color, alpha));
}

/** A Graphics that redraws every frame over [from, to] and is cleared afterwards. */
export function drawSpan(h: KnightMoveHost, tl: Timeline, from: number, to: number, draw: (g: Graphics, t: number, f: number) => void, layer: 'fx' | 'ground' = 'fx') {
  let g: Graphics | null = null;
  tl.during(from, to, (t, f) => {
    g ??= h.gfx(layer);
    g.clear();
    if (t < 1) draw(g, t, f);
  });
}

// ---------------------------------------------------------------------------------------------
// Moves

const SWING_COMBO = ['ATTACK1', 'ATTACK2', 'ATTACK4'];
let swingComboIndex = 0;

/**
 * SWING (reference move): dash into melee range, cleave on contact, recover home.
 * Whirlwind adds a second, reversed arc and a hotter palette.
 *
 * Timing is synced to the rig: ATTACK1/2/4 wind up for ~10 frames and the blade sweeps through
 * frames 12-16 (see `ksheet:6:ATTACK`), so the dash covers the wind-up and contact lands on 12.
 */
function swing(whirlwind: boolean): KnightMove {
  return (h, tl) => {
    const crit = h.ctx.crit;
    const spot = strikeSpot(h);
    const hit = chest(h.target);
    const trail = whirlwind ? BLOOD : 0xF4B41A;
    const CONTACT = 12;

    tl.at(0, () => {
      h.anim(whirlwind ? 'ATTACK4' : SWING_COMBO[swingComboIndex++ % SWING_COMBO.length]);
      h.sound('swing');
    });
    travel(h, tl, 0, 10, { x: 0, y: 0 }, spot, easeIn);
    ghostTrail(h, tl, 2, 10, trail);
    tl.at(8, () => h.camera(whirlwind ? 1.28 : 1.22, (h.home.x + h.target.x) / 2 + 20, hit.y, 18));

    tl.at(CONTACT, () => {
      h.impact();
      h.hitStop(crit || whirlwind ? 4 : 2);
      h.shake(crit ? 12 : 9);
      h.flash(crit ? 0.45 : 0.3);
      h.sparks(hit.x, hit.y, whirlwind ? 24 : crit ? 20 : 12, whirlwind ? [BLOOD, EMBER, 0xFBBF24, 0xFFFFFF] : [0xF4B41A, BONE, BLOOD]);
      h.streaks(hit.x - 10, hit.y, 45, whirlwind ? [BLOOD, 0xFBBF24] : [0xF4B41A, 0xFFFFFF]);
      const label = whirlwind ? 'DRAGON WHIRLWIND!' : crit ? 'CRIT CLEAVE!' : 'IRON CLEAVE!';
      h.text(`${label} +${h.ctx.damage}`, h.target.x - 60, h.target.y - h.target.height - 30, whirlwind ? BLOOD : 0xF4B41A, crit ? 14 : 11);
      h.sound(crit || whirlwind ? 'crit' : 'hit');
    });
    drawSpan(h, tl, CONTACT, CONTACT + 5, (g) => {
      const cx = h.pos().x + 25;
      if (whirlwind) {
        h.slashArc(g, cx + 10, hit.y, 48, -Math.PI * 0.45, Math.PI * 0.45, BLOOD_DARK, BLOOD, GOLD);
        h.slashArc(g, cx + 25, hit.y, 38, Math.PI * 0.55, Math.PI * 1.45, BLOOD_DARK, EMBER, BONE);
      } else {
        h.slashArc(g, cx + 15, hit.y, 45, -Math.PI * 0.35, Math.PI * 0.35, 0x78350F, 0xF59E0B, BONE);
      }
    });

    travel(h, tl, CONTACT + 6, CONTACT + 22, spot, { x: 0, y: 0 }, easeOut);
    tl.end(CONTACT + 22);
  };
}

export const KNIGHT_MOVES: Partial<Record<KnightMoveId, KnightMove>> = {
  swing_cleave: swing(false),
  swing_whirlwind: swing(true),
};
