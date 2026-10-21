import { Assets, Rectangle, Texture, type Graphics } from 'pixi.js';
import { ASSET_ROOT } from '@/shared/assetRoot';
import type { Pal } from './fxKit';

/**
 * Painted spell-VFX sprites (public/assets/fx, made by `python3 scripts/build_spell_fx.py`): soft blooms,
 * flares, beams, smoke and rune circles on a linear-filtered page, pixel-art embers, shards, flames and rocks
 * on a nearest-filtered one. All white/grey, tinted at draw time. ~0.75 MB of VRAM for both pages; the engine
 * retains them with the battle VFX rigs and releases them with the monsters.
 *
 * The fxKit / spellKit primitives `stamp()` these into the same Graphics they draw into (so moves need no
 * changes) and keep their vector drawing as the fallback while the pages load. Palette sprites come as
 * `<name>.ink` / `.body` / `.core` / `.hot` masks that `stampPal()` stacks in a Pal's colours.
 */

const DIR = `${ASSET_ROOT}/fx`;
const META = `${DIR}/spellfx.json`;

interface Meta {
  pages: Record<string, { file: string; size: [number, number]; scaleMode: 'linear' | 'nearest' }>;
  sprites: Record<string, [number, number, number, number, string]>;
}

let frames: Map<string, Texture> | null = null;
let pageUrls: string[] = [];
let refs = 0;
let loading: Promise<void> | null = null;

/** Loads the pages (shared, ref-counted). Resolves when stamps are available. */
export function retainFxAtlas(): Promise<void> {
  refs++;
  loading ??= (async () => {
    const meta = (await Assets.load(META)) as Meta;
    const pages: Record<string, Texture> = {};
    pageUrls = Object.values(meta.pages).map((p) => `${DIR}/${p.file}`);
    await Promise.all(Object.entries(meta.pages).map(async ([key, p]) => {
      const tex = (await Assets.load(`${DIR}/${p.file}`)) as Texture;
      tex.source.scaleMode = p.scaleMode;
      pages[key] = tex;
    }));
    if (refs <= 0) return; // released while loading
    const map = new Map<string, Texture>();
    for (const [name, [x, y, w, h, page]] of Object.entries(meta.sprites)) {
      map.set(name, new Texture({ source: pages[page].source, frame: new Rectangle(x, y, w, h) }));
    }
    frames = map;
  })().catch((err) => {
    console.warn('[fxAtlas] spell FX pages failed to load; primitives keep their vector look', err);
    loading = null;
  });
  return loading;
}

export function releaseFxAtlas(): void {
  if (refs <= 0) return;
  if (--refs > 0) return;
  if (frames) for (const t of frames.values()) t.destroy(false);
  frames = null;
  loading = null;
  const urls = [...pageUrls, META];
  pageUrls = [];
  void Assets.unload(urls).catch(() => {});
}

export const fxReady = (): boolean => frames !== null;
export const fxTex = (name: string): Texture | null => frames?.get(name) ?? null;

export interface StampOpts {
  rot?: number; // radians
  tint?: number;
  alpha?: number;
  ax?: number; // anchor 0-1 (default 0.5)
  ay?: number;
}

/**
 * Draws sprite `name` into `g`, centred (or anchored) at (x, y), `w`×`h` px, rotated by `rot`. Returns false
 * (drawing nothing) while the pages load, so callers can fall back to vector shapes.
 */
export function stamp(g: Graphics, name: string, x: number, y: number, w: number, h: number, o: StampOpts = {}): boolean {
  const tex = frames?.get(name);
  if (!tex) return false;
  const alpha = o.alpha ?? 1;
  if (alpha <= 0.01 || w <= 0.2 || h <= 0.2) return true;
  const rot = o.rot ?? 0;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  g.setFillStyle({ alpha: Math.min(1, alpha) });
  g.setTransform(c, s, -s, c, x, y);
  g.texture(tex, o.tint ?? 0xFFFFFF, -w * (o.ax ?? 0.5), -h * (o.ay ?? 0.5), w, h);
  g.resetTransform();
  g.setFillStyle({ alpha: 1 });
  return true;
}

/** A palette sprite: its ink, body and core masks tinted by `p`, plus the white-hot specks. */
export function stampPal(g: Graphics, name: string, x: number, y: number, w: number, h: number, p: Pal, o: StampOpts = {}): boolean {
  if (!frames?.has(`${name}.body`)) return false;
  const base = { ...o };
  stamp(g, `${name}.ink`, x, y, w, h, { ...base, tint: p.ink });
  stamp(g, `${name}.body`, x, y, w, h, { ...base, tint: p.body });
  stamp(g, `${name}.core`, x, y, w, h, { ...base, tint: p.core });
  stamp(g, `${name}.hot`, x, y, w, h, { ...base, tint: 0xFFFFFF });
  return true;
}

/** A frame of a looping sprite sequence (`flame0`…`flame3`) for animation frame `f`, `rate` frames per step. */
export const seq = (base: string, n: number, f: number, rate = 4, offset = 0): string => `${base}${Math.floor(f / rate + offset) % n}`;
