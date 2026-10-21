import { Container, Sprite } from 'pixi.js';
import type { EmitOptions, ParticleKind } from './choreo';
import { fxTex } from './fxAtlas';

/**
 * Painted battle particles (GameEngine.emitParticles / spawnSparks): glowing embers and spark streaks
 * (additive), smoke and dust puffs, rock chunks, ice shards and droplets, drawn from the fxAtlas pages. Without
 * an explicit `kind` the look is read off the emit's own numbers (colour, size, gravity), so the ~300 existing
 * emit calls upgrade untouched. Returns null while the pages load (the engine then draws its square pixels).
 */

function hsv(color: number): { sat: number; lum: number; r: number; g: number; b: number } {
  const r = ((color >> 16) & 255) / 255;
  const g = ((color >> 8) & 255) / 255;
  const b = (color & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return { sat: max === 0 ? 0 : (max - min) / max, lum: (r + g + b) / 3, r, g, b };
}

/** The particle look an emit implies when it doesn't name one. */
export function inferKind(o: EmitOptions, color: number): ParticleKind {
  if (o.kind) return o.kind;
  const grav = o.gravity ?? 0.15;
  const size = o.size ?? 3;
  const c = hsv(color);
  if (grav >= 0.08) {
    if (c.b >= c.r && c.lum > 0.6) return 'shard'; // frost / glass
    if (c.sat < 0.35 || c.lum < 0.3) return size >= 3 ? 'chunk' : 'spark'; // dirt, stone, bone, soot
    return 'drop'; // blood, ooze, molten metal
  }
  if (c.sat < 0.25 && c.lum < 0.85) return 'smoke'; // dust, ash
  if (size >= 4 && grav <= 0) return 'smoke';
  return 'ember';
}

export interface ParticleView {
  view: Container;
  kind: ParticleKind;
  size: number;
  spin: number;
}

/** Builds a particle's display object, or null while the sprite pages load. */
export function makeParticleView(kind: ParticleKind, color: number, size: number): ParticleView | null {
  const variant = Math.floor(Math.random() * 3);
  const sprite = (name: string, tint: number, w?: number, h?: number) => {
    const tex = fxTex(name);
    if (!tex) return null;
    const s = new Sprite(tex);
    s.anchor.set(0.5);
    s.tint = tint;
    if (w !== undefined && h !== undefined) s.setSize(w, h);
    return s;
  };
  let view: Container | null = null;
  let spin = 0;
  switch (kind) {
    case 'ember': {
      view = sprite(`ember${size <= 2 ? 0 : size <= 3 ? 1 : 2}`, color);
      if (view) view.blendMode = 'add';
      break;
    }
    case 'spark': {
      view = sprite('streak', color, 6 + size * 2, Math.max(2, size));
      if (view) view.blendMode = 'add';
      break;
    }
    case 'smoke': {
      const d = size * 3.2;
      view = sprite(`smoke${variant}`, color, d, d);
      spin = (Math.random() - 0.5) * 0.04;
      break;
    }
    case 'chunk':
    case 'shard':
    case 'drop': {
      const base = kind === 'chunk' ? `rock${variant}` : kind === 'shard' ? 'iceShard' : 'drop';
      const w = kind === 'chunk' ? size * 2.4 : kind === 'shard' ? size * 1.4 : size * 1.6;
      const h = kind === 'chunk' ? size * 2.2 : kind === 'shard' ? size * 2.8 : size * 2.3;
      const ink = sprite(`${base}.ink`, 0x0A0612, w, h);
      const body = sprite(`${base}.body`, color, w, h);
      if (!ink || !body) return null;
      const c = new Container();
      c.addChild(ink, body);
      const core = sprite(`${base}.core`, 0xFFFFFF, w, h);
      if (core) {
        core.alpha = 0.7;
        c.addChild(core);
      }
      view = c;
      spin = kind === 'chunk' ? (Math.random() - 0.5) * 0.3 : 0;
      break;
    }
  }
  return view ? { view, kind, size, spin } : null;
}

/** Per-frame look: streaks and shards/drops point along their motion, smoke swells, embers flicker. */
export function updateParticleView(p: ParticleView, vx: number, vy: number, u: number, delta: number): number {
  const v = p.view;
  switch (p.kind) {
    case 'spark':
    case 'shard':
    case 'drop':
      v.rotation = Math.atan2(vy, vx) + (p.kind === 'spark' ? 0 : Math.PI / 2);
      return 1 - u;
    case 'smoke':
      v.rotation += p.spin * delta;
      v.scale.set(v.scale.x * (1 + 0.012 * delta));
      return 0.75 * (1 - u) * Math.min(1, u * 6 + 0.3);
    case 'ember':
      return (1 - u) * (0.75 + 0.25 * Math.sin(u * 40));
    case 'chunk':
      v.rotation += p.spin * delta;
      return u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3;
  }
}
