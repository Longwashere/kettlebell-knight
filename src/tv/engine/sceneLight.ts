import type { Texture } from 'pixi.js';

/**
 * A background's key light: its colour, the screen-space direction it shines from (y down, not normalised), and
 * where it sits in the frame (0–1 of the stage).
 */
export interface SceneLight {
  color: number;
  dx: number;
  dy: number;
  x: number;
  y: number;
}

/** Cool moonlight from above, for backgrounds that can't be read (still loading, or a cross-origin image). */
export const DEFAULT_SCENE_LIGHT: SceneLight = { color: 0xc8d2ff, dx: 0.3, dy: -1, x: 0.65, y: 0.1 };

const cache = new Map<string, SceneLight>();

/**
 * Reads a background's key light from its pixels: the brightest few percent of the upper part of the image (the
 * moon, a window, a forge mouth) give the colour, and their centroid the direction, from the fighters' line.
 * Cached per key; the 426×240 backgrounds are sampled at quarter size, so it costs well under a millisecond.
 */
export function measureSceneLight(key: string, texture: Texture): SceneLight {
  const hit = cache.get(key);
  if (hit) return hit;
  let light = DEFAULT_SCENE_LIGHT;
  try {
    const resource = texture.source.resource as CanvasImageSource;
    const w = 106;
    const h = 60;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(resource, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, Math.round(h * 0.7)).data;
    const px: { l: number; i: number }[] = [];
    for (let i = 0; i < data.length; i += 4) px.push({ l: 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2], i });
    px.sort((a, b) => b.l - a.l);
    const top = px.slice(0, Math.max(8, Math.round(px.length * 0.04)));
    let r = 0, g = 0, b = 0, cx = 0, cy = 0;
    for (const { i } of top) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      cx += (i / 4) % w;
      cy += Math.floor(i / 4 / w);
    }
    const n = top.length;
    // Keep the hue, lift it to full brightness, and pull it halfway to white so it reads as light, not paint
    const peak = Math.max(r, g, b) / n || 1;
    const ch = (v: number) => Math.round(Math.min(255, (v / n / peak) * 255 * 0.5 + 255 * 0.5));
    // From the fighters' line (~65% down the frame); always somewhat from above so the rim lands on heads and shoulders
    const dx = cx / n / w - 0.5;
    const dy = Math.min(-0.35, cy / n / h - 0.65);
    light = { color: (ch(r) << 16) | (ch(g) << 8) | ch(b), dx, dy, x: cx / n / w, y: cy / n / h };
  } catch {
    // Unreadable pixels: keep the default light
  }
  cache.set(key, light);
  return light;
}
