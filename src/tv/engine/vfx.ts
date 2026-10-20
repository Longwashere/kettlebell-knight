import { ASSET_ROOT } from '@/shared/assetRoot';
/**
 * Spine VFX rigs (public/assets/spine/vfx-tv, TV-sized copies made by `npm run vfx:shrink` from
 * public/assets/spine/vfx). Moves play them with `h.vfx(name, x, y, opts)`; the engine loads all of them
 * while a battle is up (~8 MB of VRAM together) and unloads them when the monsters are cleared.
 *
 * `scale` normalises each rig so `size: 1` is roughly 64 px across its busiest frame on the 426×240 stage
 * (measured with `npm run shot -- vfxsheet`). `anims` lists what the rig offers; the first is the default.
 */

export type VfxName =
  | 'explosion' | 'fire' | 'heal' | 'hitSpark' | 'ice' | 'poison' | 'shockwave' | 'slash' | 'summon';

export interface VfxRig {
  skeleton: string;
  atlas: string;
  scale: number;
  anims: string[];
  skin?: string;
}

const DIR = `${ASSET_ROOT}/spine/vfx-tv`;

export const VFX_RIGS: Record<VfxName, VfxRig> = {
  explosion: { skeleton: `${DIR}/explosion/BlastTNT.json`, atlas: `${DIR}/explosion/BlastTNT.atlas`, scale: 0.19, anims: ['animation'] },
  fire: { skeleton: `${DIR}/fire-burst/HuoYan.json`, atlas: `${DIR}/fire-burst/HuoYan.atlas`, scale: 0.11, anims: ['Idle'], skin: 'HuoYan' },
  heal: { skeleton: `${DIR}/heal-glow/CommonHeal_2.json`, atlas: `${DIR}/heal-glow/CommonHeal_2.atlas`, scale: 0.13, anims: ['CommonHeal_2'] },
  hitSpark: {
    skeleton: `${DIR}/hit-spark/shouSJ.json`, atlas: `${DIR}/hit-spark/shouSJ.atlas`, scale: 0.065,
    anims: ['1', '2', '3', '4', '5', '1_baoji', '2_baoji', '3_baoji', '4_baoji', '5_baoji'],
  },
  ice: { skeleton: `${DIR}/ice-shards/IceNova.json`, atlas: `${DIR}/ice-shards/IceNova.atlas`, scale: 0.07, anims: ['IceNova', 'IceNova_2'] },
  poison: { skeleton: `${DIR}/poison-cloud/PoisonBlast.json`, atlas: `${DIR}/poison-cloud/PoisonBlast.atlas`, scale: 0.105, anims: ['PoisonBlast'] },
  shockwave: {
    skeleton: `${DIR}/slam-shockwave/ShockWave.json`, atlas: `${DIR}/slam-shockwave/ShockWave.atlas`, scale: 0.11,
    anims: ['ShockWave_1', 'ShockWave_2', 'ShockWave_3'],
  },
  slash: { skeleton: `${DIR}/slash-arc/zhuosao.json`, atlas: `${DIR}/slash-arc/zhuosao.atlas`, scale: 0.21, anims: ['01'] },
  summon: { skeleton: `${DIR}/summoning-circle/eff_shenle_fazhen.json`, atlas: `${DIR}/summoning-circle/eff_shenle_fazhen.atlas`, scale: 0.13, anims: ['animation', 'animation2'] },
};

export const VFX_NAMES = Object.keys(VFX_RIGS) as VfxName[];

export interface VfxOpts {
  anim?: string; // one of the rig's anims (default: the first)
  size?: number; // 1 ≈ 64 px across
  flipX?: boolean; // mirror (e.g. a slash travelling the other way)
  rotation?: number; // radians
  speed?: number; // playback rate
  tint?: number;
  alpha?: number;
  loop?: boolean; // loops until the move ends instead of removing itself when done
  layer?: 'fx' | 'ground' | 'back'; // ground = floor decal layer (circles, rings); back = behind the knight (knight moves only)
  squash?: number; // vertical scale multiplier, e.g. 0.4 lays a circle flat on the floor
  start?: number; // frames into the animation to begin (skip a rig's own wind-up)
  life?: number; // frames until it fades out and is removed (cuts long or looping rigs short)
}

/**
 * hitSpark animation for an attack colour: 1 orange · 2 gold · 3 red · 4 green · 5 blue/violet, or the
 * `_baoji` crit variant (bigger, with a ring and slash) for heavy hits. Greys and whites read as orange.
 */
export function sparkAnim(color: number, heavy = false): string {
  const r = ((color >> 16) & 255) / 255;
  const g = ((color >> 8) & 255) / 255;
  const b = (color & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  let hue = 0;
  if (max !== min) {
    if (max === r) hue = ((g - b) / (max - min)) % 6;
    else if (max === g) hue = (b - r) / (max - min) + 2;
    else hue = (r - g) / (max - min) + 4;
    hue = (hue * 60 + 360) % 360;
  }
  let v = '1';
  if (sat >= 0.3) {
    if (hue < 18 || hue >= 330) v = '3';
    else if (hue < 42) v = '1';
    else if (hue < 70) v = '2';
    else if (hue < 170) v = '4';
    else v = '5';
  }
  return heavy ? `${v}_baoji` : v;
}

/** First saturated colour in a palette (palettes often open with BONE/white), else the fallback. */
export function themeColor(colors: readonly number[] | undefined, fallback: number): number {
  for (const c of colors ?? []) {
    const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
    const max = Math.max(r, g, b);
    if (max > 0 && (max - Math.min(r, g, b)) / max >= 0.3) return c;
  }
  return fallback;
}
