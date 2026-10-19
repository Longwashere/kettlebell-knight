/**
 * Exercise technique guides: 2-4 pose keyframes per exercise, short form cues, and a pixel-art
 * renderer that draws the knight (side view, facing right) holding a kettlebell, in the same style as
 * the card art (cardArt.ts). Each frame also shows the bell's path through the whole movement.
 *
 * Poses are forward kinematics on a tiny skeleton, so fixing a pose means editing a few angles.
 * Angles are in degrees:
 *  - stance leg and torso chain upward from the ankle: 0 = vertical, + = leaning toward facing (right)
 *  - arms and the far leg hang from their joint: 0 = straight down, 90 = forward, 180 = straight up
 */
import type { ExerciseType } from '../../types/game';
import { INK, Layer, bayer, glow, mix, shadeAndOutline, toDataUrl } from './cardArt';

export const POSE_W = 72;
export const POSE_H = 50;
const GROUND = 46;

const L = { shin: 9, thigh: 9, torso: 11, neck: 2.2, head: 3.6, upper: 6.5, fore: 6.5 };

interface Pose {
  label: string;
  shin: number;
  thigh: number;
  torso: number;
  arm: [number, number]; // near arm: upper, fore
  armF?: [number, number]; // far arm (default: same as near, i.e. two-handed)
  legB?: [number, number]; // far leg from hip: thigh, shin (default: matches the stance leg)
  bell?: { x: number; y: number }; // bell centre relative to the near hand (default: hangs along the forearm)
  footX?: number; // stance ankle x offset
}

export interface ExerciseGuide {
  name: string;
  tempoMs: number; // per frame
  frames: Pose[];
  cues: string[];
}

const HIKE: Omit<Pose, 'label'> = { shin: 12, thigh: -50, torso: 70, arm: [-20, -25] };
const RACK = { x: 2.5, y: 1.5 };
const OVERHEAD = { x: -2.5, y: 2 };
const GOBLET = { x: 2.5, y: 0 };
const FREE: [number, number] = [12, 14];

export const EXERCISE_GUIDES: Record<ExerciseType, ExerciseGuide> = {
  SWING: {
    name: 'Kettlebell Swing',
    tempoMs: 520,
    frames: [
      { label: 'HIKE', ...HIKE },
      { label: 'SNAP', shin: 0, thigh: 0, torso: -5, arm: [40, 45] },
      { label: 'FLOAT', shin: 0, thigh: 0, torso: -5, arm: [88, 90] },
    ],
    cues: ['Hinge at the hips, not a squat', 'Snap the hips to drive the bell', 'Arms are ropes: bell floats to chest'],
  },
  SQUAT: {
    name: 'Goblet Squat',
    tempoMs: 850,
    frames: [
      { label: 'STAND', shin: 0, thigh: 0, torso: 0, arm: [15, 165], bell: GOBLET },
      { label: 'DEEP', shin: 38, thigh: -82, torso: 28, arm: [30, 170], bell: GOBLET },
    ],
    cues: ['Bell at chest, elbows tucked', 'Sit between the heels, hips below knees', 'Drive up through the whole foot'],
  },
  CLEAN_AND_PRESS: {
    name: 'Clean & Press',
    tempoMs: 700,
    frames: [
      { label: 'HIKE', ...HIKE, armF: FREE },
      { label: 'RACK', shin: 0, thigh: 0, torso: 0, arm: [20, 170], armF: FREE, bell: RACK },
      { label: 'PRESS', shin: 0, thigh: 0, torso: 0, arm: [178, 180], armF: FREE, bell: OVERHEAD },
    ],
    cues: ['Hike back, then pull to the rack', 'Rack: bell on forearm, wrist straight', 'Press to lockout, biceps by the ear'],
  },
  SNATCH: {
    name: 'Kettlebell Snatch',
    tempoMs: 600,
    frames: [
      { label: 'HIKE', ...HIKE, armF: FREE },
      { label: 'PULL', shin: 0, thigh: 0, torso: -4, arm: [110, 170], armF: FREE, bell: { x: 1, y: 3 } },
      { label: 'LOCK', shin: 0, thigh: 0, torso: 0, arm: [180, 180], armF: FREE, bell: OVERHEAD },
    ],
    cues: ['Hike, then explode with the hips', 'Keep the bell close: high pull', 'Punch through to lockout, no flop'],
  },
  WINDMILL: {
    name: 'Windmill',
    tempoMs: 1000,
    frames: [
      { label: 'TOP', shin: 0, thigh: 0, torso: 0, arm: [180, 180], armF: [0, 0], bell: OVERHEAD },
      { label: 'REACH', shin: 3, thigh: -15, torso: 65, arm: [180, 180], armF: [0, 0], bell: OVERHEAD },
    ],
    cues: ['Lock the bell overhead, eyes on it', 'Push hips back, slide free hand down', 'Bell arm stays vertical throughout'],
  },
  DEADLIFT: {
    name: 'Kettlebell Deadlift',
    tempoMs: 850,
    frames: [
      { label: 'FLOOR', shin: 18, thigh: -55, torso: 62, arm: [0, 0] },
      { label: 'LOCK', shin: 0, thigh: 0, torso: 0, arm: [0, 0] },
    ],
    cues: ['Bell between your feet', 'Flat back, hips back, chest proud', 'Stand tall and squeeze the glutes'],
  },
  OVERHEAD_PRESS: {
    name: 'Overhead Press',
    tempoMs: 800,
    frames: [
      { label: 'RACK', shin: 0, thigh: 0, torso: 0, arm: [20, 170], armF: FREE, bell: RACK },
      { label: 'DRIVE', shin: 0, thigh: 0, torso: 0, arm: [110, 175], armF: FREE, bell: { x: -1, y: 2 } },
      { label: 'LOCK', shin: 0, thigh: 0, torso: 0, arm: [180, 180], armF: FREE, bell: OVERHEAD },
    ],
    cues: ['Start in the rack, wrist stacked', 'Brace abs and glutes, no leaning back', 'Press straight up to lockout'],
  },
  THRUSTER: {
    name: 'Thruster',
    tempoMs: 650,
    frames: [
      { label: 'SQUAT', shin: 38, thigh: -82, torso: 25, arm: [35, 175], armF: FREE, bell: RACK },
      { label: 'DRIVE', shin: 0, thigh: 0, torso: 0, arm: [100, 175], armF: FREE, bell: { x: -1, y: 2 } },
      { label: 'LOCK', shin: 0, thigh: 0, torso: 0, arm: [180, 180], armF: FREE, bell: OVERHEAD },
    ],
    cues: ['Squat deep with the bell racked', 'Drive up and ride the momentum', 'Finish locked out overhead'],
  },
  GORILLA_ROW: {
    name: 'Gorilla Row',
    tempoMs: 700,
    frames: [
      { label: 'HANG', shin: 15, thigh: -40, torso: 78, arm: [0, 0], armF: [0, 0] },
      { label: 'ROW', shin: 15, thigh: -40, torso: 78, arm: [-95, 0], armF: [0, 0] },
    ],
    cues: ['Wide stance, hinge, flat back', 'Row the bell to your hip', 'Alternate sides without twisting'],
  },
  AROUND_THE_BODY: {
    name: 'Around-the-Body Pass',
    tempoMs: 650,
    frames: [
      { label: 'FRONT', shin: 0, thigh: 0, torso: 0, arm: [20, 45], bell: { x: 2, y: 1 } },
      { label: 'SIDE', shin: 0, thigh: 0, torso: 0, arm: [45, 30], bell: { x: 4, y: 1 } },
      { label: 'BEHIND', shin: 0, thigh: 0, torso: 0, arm: [-25, 20], bell: { x: -3, y: 1 } },
    ],
    cues: ['Stand tall with core braced', 'Pass the bell smoothly around your waist', 'Switch hands behind the back without swaying'],
  },
  SINGLE_LEG_RDL: {
    name: 'Single-Leg RDL',
    tempoMs: 950,
    frames: [
      { label: 'STAND', shin: 0, thigh: 0, torso: 0, arm: [0, 0], legB: [5, -35] },
      { label: 'HINGE', shin: 8, thigh: -12, torso: 85, arm: [0, 0], legB: [-95, -95] },
    ],
    cues: ['Soft knee on the standing leg', 'Hinge until you form a T', 'Squeeze the glute to stand tall'],
  },
  CLEAN: {
    name: 'Kettlebell Clean',
    tempoMs: 600,
    frames: [
      { label: 'HIKE', ...HIKE, armF: FREE },
      { label: 'PULL', shin: 0, thigh: 0, torso: -3, arm: [70, 150], armF: FREE, bell: { x: 1, y: 2 } },
      { label: 'RACK', shin: 0, thigh: 0, torso: 0, arm: [20, 170], armF: FREE, bell: RACK },
    ],
    cues: ['Hike the bell back', 'Hips snap, elbow stays close', 'Catch softly in the rack'],
  },
  LUNGE: {
    name: 'Goblet Lunge',
    tempoMs: 900,
    frames: [
      { label: 'STAND', shin: 0, thigh: 0, torso: 0, arm: [15, 165], bell: GOBLET },
      { label: 'LUNGE', shin: 5, thigh: -88, torso: 0, arm: [15, 165], bell: GOBLET, legB: [-15, -92], footX: 6 },
    ],
    cues: ['Step back, both knees at 90°', 'Back knee hovers above the floor', 'Torso tall, drive through the front heel'],
  },
};

// ---------------------------------------------------------------------------------------------
// Kinematics

type V = { x: number; y: number };
const rad = (d: number) => (d * Math.PI) / 180;
const up = (deg: number, len: number): V => ({ x: Math.sin(rad(deg)) * len, y: -Math.cos(rad(deg)) * len });
const hang = (deg: number, len: number): V => ({ x: Math.sin(rad(deg)) * len, y: Math.cos(rad(deg)) * len });
const add = (a: V, b: V): V => ({ x: a.x + b.x, y: a.y + b.y });

function solve(p: Pose) {
  const ankle = { x: 32 + (p.footX ?? 0), y: GROUND };
  const knee = add(ankle, up(p.shin, L.shin));
  const hip = add(knee, up(p.thigh, L.thigh));
  const shoulder = add(hip, up(p.torso, L.torso));
  const headC = add(shoulder, up(p.torso * 0.6, L.neck + L.head));
  const [bt, bs] = p.legB ?? [-p.thigh, -p.shin];
  const kneeB = add(hip, hang(bt, L.thigh));
  const ankleB = add(kneeB, hang(bs, L.shin));
  const arm = (a: [number, number]) => {
    const elbow = add(shoulder, hang(a[0], L.upper));
    return { elbow, hand: add(elbow, hang(a[1], L.fore)) };
  };
  const near = arm(p.arm);
  const far = arm(p.armF ?? p.arm);
  const bell = p.bell ? add(near.hand, p.bell) : add(near.hand, hang(p.arm[1], 3.2));
  return { ankle, knee, hip, shoulder, headC, kneeB, ankleB, near, far, bell, torso: p.torso };
}

// ---------------------------------------------------------------------------------------------
// Rendering

const ARMOR = { dark: 0x475569, mid: 0x94A3B8, light: 0xCBD5E1, far: 0x334155 };
const GOLD = 0xF4B41A;
const PLUME = 0xDC2626;
const IRON = 0x3F3F46;

function stage(): Layer {
  const b = new Layer(POSE_W, POSE_H);
  const sky = [0x07060C, 0x100D1A, 0x1A1528, 0x241C36];
  for (let y = 0; y < POSE_H; y++) {
    for (let x = 0; x < POSE_W; x++) {
      if (y >= GROUND) {
        const stone = ((x >> 2) + (y >> 1)) % 5 === 0 ? 0x1C1917 : y === GROUND ? 0x44403C : 0x292524;
        b.set(x, y, stone);
      } else {
        const t = y / GROUND;
        const v = Math.max(0, Math.min(3, Math.round(t * 3 + bayer(x, y) - 0.5)));
        b.set(x, y, sky[v]);
      }
    }
  }
  glow(b, 34, 26, 26, [0x241C36, 0x33264A, 0x45325F]);
  return b;
}

function drawFigure(m: Layer, s: ReturnType<typeof solve>): void {
  // Far limbs first (darker), then torso and head, then near limbs and the bell
  m.line(s.hip.x - 1, s.hip.y, s.kneeB.x - 1, s.kneeB.y, ARMOR.far, 4);
  m.line(s.kneeB.x - 1, s.kneeB.y, s.ankleB.x - 1, s.ankleB.y, ARMOR.far, 3.5);
  m.rect(s.ankleB.x - 2, s.ankleB.y - 1, 5, 2, 0x1C1917);
  m.line(s.shoulder.x - 1, s.shoulder.y, s.far.elbow.x - 1, s.far.elbow.y, ARMOR.far, 3);
  m.line(s.far.elbow.x - 1, s.far.elbow.y, s.far.hand.x - 1, s.far.hand.y, ARMOR.far, 3);

  // Neck, then torso (breastplate with a highlight stripe and gold belt)
  const neckTop = add(s.shoulder, up(s.torso * 0.6, L.neck + 1));
  m.line(s.shoulder.x, s.shoulder.y, neckTop.x, neckTop.y, ARMOR.dark, 2.5);
  m.line(s.hip.x, s.hip.y, s.shoulder.x, s.shoulder.y, ARMOR.mid, 7.5);
  m.line(s.hip.x, s.hip.y, s.shoulder.x, s.shoulder.y, ARMOR.light, 2.5);
  m.disc(s.hip.x, s.hip.y, 3, GOLD);

  // Great helm: dome, dark visor band toward the facing side, gold brow, red plume
  m.disc(s.headC.x, s.headC.y, L.head, ARMOR.light);
  const fwd = up(s.torso * 0.6 + 90, 1);
  for (let k = 0.6; k <= L.head; k += 0.5) m.set(s.headC.x + fwd.x * k, s.headC.y + fwd.y * k, INK);
  for (let k = 0.6; k <= L.head; k += 0.5) m.set(s.headC.x + fwd.x * k, s.headC.y + fwd.y * k + 1, INK);
  m.set(s.headC.x - fwd.x, s.headC.y - 2, GOLD);
  const crest = up(s.torso * 0.6 - 40, L.head + 3);
  m.line(s.headC.x, s.headC.y - L.head + 1, s.headC.x + crest.x, s.headC.y + crest.y, PLUME, 2.5);

  m.line(s.ankle.x, s.ankle.y, s.knee.x, s.knee.y, ARMOR.mid, 3.5);
  m.line(s.knee.x, s.knee.y, s.hip.x, s.hip.y, ARMOR.mid, 4.5);
  m.disc(s.knee.x, s.knee.y, 1.8, ARMOR.light); // poleyn
  m.rect(s.ankle.x - 1, s.ankle.y - 1, 5, 2, 0x1C1917); // sabaton
  m.line(s.shoulder.x, s.shoulder.y, s.near.elbow.x, s.near.elbow.y, ARMOR.light, 3);
  m.line(s.near.elbow.x, s.near.elbow.y, s.near.hand.x, s.near.hand.y, ARMOR.light, 3);
  m.disc(s.shoulder.x, s.shoulder.y, 2.6, ARMOR.mid); // pauldron
  m.disc(s.near.hand.x, s.near.hand.y, 1.4, ARMOR.dark); // gauntlet

  // Kettlebell: handle loop between hand and bell, then the bell
  const hx = s.near.hand.x + (s.bell.x - s.near.hand.x) * 0.45;
  const hy = s.near.hand.y + (s.bell.y - s.near.hand.y) * 0.45;
  m.ring(hx, hy, 1.4, 0x52525B, 1);
  m.disc(s.bell.x, s.bell.y, 2.7, IRON);
}

const frameCache = new Map<string, string[]>();
const stripCache = new Map<string, string>();

/** Paints each keyframe of an exercise as a full 72x50 scene layer. */
function renderFrames(exercise: ExerciseType, accent: number): Layer[] {
  const guide = EXERCISE_GUIDES[exercise];
  const solved = guide.frames.map(solve);
  const path = solved.map((s) => s.bell);

  return solved.map((s, i) => {
    const base = stage();
    for (let x = s.ankle.x - 7; x <= s.ankle.x + 8; x++) base.set(x, GROUND, 0x0C0A09); // contact shadow

    // Bell path through every keyframe, dotted, with the current position ringed
    for (let k = 0; k < path.length; k++) {
      const a = path[k];
      const b = path[(k + 1) % path.length];
      if (path.length === 2 && k === 1) break;
      const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
      for (let j = 0; j <= steps; j += 2) {
        base.set(a.x + ((b.x - a.x) * j) / steps, a.y + ((b.y - a.y) * j) / steps, mix(accent, 0x241C36, 0.45));
      }
    }
    for (const [k, p] of path.entries()) if (k !== i) base.disc(p.x, p.y, 1, mix(accent, 0x241C36, 0.3));

    const fig = new Layer(POSE_W, POSE_H);
    drawFigure(fig, s);
    shadeAndOutline(fig, 0xFFFBEA, 0.4, 0.3);
    base.over(fig);
    base.ring(s.bell.x, s.bell.y, 4.5, accent, 1);
    return base;
  });
}

/** PNG data URLs for each keyframe of an exercise (72x50 each), cached. */
export function getExerciseFrames(exercise: ExerciseType, accent = 0xF4B41A): string[] {
  const key = `${exercise}:${accent}`;
  const hit = frameCache.get(key);
  if (hit) return hit;
  const urls = renderFrames(exercise, accent).map(toDataUrl);
  frameCache.set(key, urls);
  return urls;
}

/** Crop of each frame around the figure, used for the always-on loop on the card front. */
export const STRIP_FRAME_W = 44;
export const STRIP_FRAME_H = 48;
const STRIP_X0 = 12; // the figure's ankle sits at x=32; RDL's back leg reaches ~x=12

/**
 * All keyframes side by side in one image (STRIP_FRAME_W x STRIP_FRAME_H each), so the card front can
 * loop them with a stepped CSS background animation: no timers or React updates per card.
 */
export function getExerciseStrip(exercise: ExerciseType, accent = 0xF4B41A): string {
  const key = `${exercise}:${accent}`;
  const hit = stripCache.get(key);
  if (hit) return hit;
  const frames = renderFrames(exercise, accent);
  const strip = new Layer(STRIP_FRAME_W * frames.length, STRIP_FRAME_H);
  frames.forEach((f, i) => {
    for (let y = 0; y < STRIP_FRAME_H; y++) {
      for (let x = 0; x < STRIP_FRAME_W; x++) {
        const c = f.get(STRIP_X0 + x, y);
        if (c) strip.set(i * STRIP_FRAME_W + x, y, c & 0xFFFFFF);
      }
    }
  });
  const url = toDataUrl(strip);
  stripCache.set(key, url);
  return url;
}
