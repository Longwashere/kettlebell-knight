import { Container, FillGradient, Graphics, Sprite, Texture } from 'pixi.js';
import { OutlineFilter } from './outlineFilter';

/**
 * The blacksmith's fitting room, staged around the knight: the room falls into shadow except a pool of forge
 * light, the knight stands on a carved stone dais whose runes burn in the previewed weapon's colour, an aura and
 * a shaft of light frame him from behind, and embers drift up from the forge. Previewing a weapon re-tints it
 * all with a flare and shockwave; buying one sets off a bigger burst.
 *
 * Everything is a handful of Graphics and Sprites over two small generated gradients. The gradients are
 * destroyed with the showcase, so the town hub pays nothing for it.
 */

const FORGE = 0xff8a2a;
const EMBER_COLORS = [0xffb347, 0xff7a1a, 0xfde68a, 0xff5a1f];
const DAIS_RX = 40;
const DAIS_RY = 10;
const DAIS_FACE = 9;

interface Ember {
  s: Sprite;
  vx: number;
  vy: number;
  life: number;
  max: number;
  phase: number;
}

/** A square canvas gradient as a texture (linear filtering: it is meant to be smooth). */
function gradientTexture(w: number, h: number, stops: [number, string][], cx = 0.5, cy = 0.5): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const r = Math.max(w, h) * 0.5;
  const g = ctx.createRadialGradient(cx * w, cy * h, 0, cx * w, cy * h, r);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const tex = Texture.from(canvas);
  tex.source.scaleMode = 'linear';
  return tex;
}

const lerpColor = (a: number, b: number, t: number): number => {
  const ch = (s: number) => Math.round(((a >> s) & 255) + ((((b >> s) & 255) - ((a >> s) & 255)) * t));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

export class ForgeShowcase {
  private root = new Container();
  private back = new Container(); // behind the knight
  private front = new Container(); // over the knight (embers, flares)
  private glowTex: Texture;
  private vignetteTex: Texture;
  private halo: Sprite;
  private flare: Sprite;
  private rays = new Graphics();
  private rayFill: FillGradient | null = null;
  private rim: OutlineFilter | null = null;
  private dais = new Graphics();
  private runes = new Graphics();
  private wave = new Graphics();
  private embers: Ember[] = [];
  private accent = FORGE;
  private shownAccent = FORGE;
  private t = 0;
  private flareT = 1;
  private waveT = 1;
  private waveBig = false;

  /**
   * @param layer the game layer (the knight's own parent); the showcase sorts itself around the knight
   * @param x,y the knight's feet in that layer
   * @param screenTop the layer's y for the top of the screen (the game layer is raised above the card hand)
   * @param knight the knight's container: it gets a 1px rim light in the item's colour (not in performance mode)
   */
  constructor(layer: Container, private x: number, private y: number, screenTop: number, lite: boolean, private knight: Container) {
    this.glowTex = gradientTexture(64, 64, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]);
    // Shadow everywhere but the knight's pool of light (centred on him: x/426, a little above his feet)
    this.vignetteTex = gradientTexture(
      128, 72,
      [[0, 'rgba(6,5,12,0)'], [0.22, 'rgba(6,5,12,0.1)'], [0.5, 'rgba(6,5,12,0.66)'], [0.8, 'rgba(6,5,12,0.88)'], [1, 'rgba(6,5,12,0.94)']],
      x / 426, (y - screenTop - 40) / 240,
    );
    const vignette = new Sprite(this.vignetteTex);
    vignette.position.set(0, screenTop);
    vignette.setSize(426, 240);

    this.root.zIndex = -300;
    this.back.zIndex = -150;
    this.front.zIndex = 500;

    this.halo = new Sprite(this.glowTex);
    this.halo.anchor.set(0.5);
    this.halo.blendMode = 'add';
    this.halo.position.set(x, y - 46);
    this.flare = new Sprite(this.glowTex);
    this.flare.anchor.set(0.5);
    this.flare.blendMode = 'add';
    this.flare.position.set(x, y - 40);
    this.flare.alpha = 0;
    this.rays.blendMode = 'add';
    this.drawRays();
    this.runes.blendMode = 'add';
    this.wave.blendMode = 'add';

    this.drawDais();
    this.root.addChild(vignette);
    this.back.addChild(this.rays, this.halo, this.dais, this.runes, this.wave);
    this.front.addChild(this.flare);
    layer.addChild(this.root, this.back, this.front);

    if (!lite) {
      this.rim = new OutlineFilter({ color: FORGE, opacity: 0.55 });
      knight.filters = [this.rim];
    }

    const count = lite ? 10 : 26;
    for (let i = 0; i < count; i++) {
      const s = new Sprite(Texture.WHITE);
      s.anchor.set(0.5);
      s.blendMode = 'add';
      this.front.addChild(s);
      const e: Ember = { s, vx: 0, vy: 0, life: 0, max: 1, phase: 0 };
      this.spawnEmber(e, Math.random());
      this.embers.push(e);
    }
  }

  /** Stone dais: a two-tier carved plinth seen slightly from above, top flush with the knight's feet. */
  private drawDais(): void {
    const g = this.dais;
    const { x, y } = this;
    // Contact shadow on the floor
    g.ellipse(x, y + DAIS_FACE + 3, DAIS_RX + 9, DAIS_RY + 4).fill({ color: 0x000000, alpha: 0.55 });
    // Lower tier
    g.ellipse(x, y + DAIS_FACE, DAIS_RX + 5, DAIS_RY + 2).fill(0x1a1622);
    g.rect(x - DAIS_RX - 5, y + 4, (DAIS_RX + 5) * 2, DAIS_FACE - 4).fill(0x1a1622);
    g.ellipse(x, y + 4, DAIS_RX + 5, DAIS_RY + 2).fill(0x2b2533);
    // Upper tier face: dark stone with block seams, lit warm from the front
    g.ellipse(x, y + 5, DAIS_RX, DAIS_RY).fill(0x231d2b);
    g.rect(x - DAIS_RX, y, DAIS_RX * 2, 5).fill(0x2e2637);
    for (let i = -3; i <= 3; i++) {
      const sx = x + i * 11 + (i % 2 ? 0 : 3);
      g.rect(sx, y + 1 + Math.abs(i) * 0.6, 1, 6 - Math.abs(i) * 0.6).fill({ color: 0x0f0c14, alpha: 0.8 });
    }
    g.rect(x - DAIS_RX, y + 3, DAIS_RX * 2, 1).fill({ color: 0x0f0c14, alpha: 0.5 });
    // Top surface: worn flagstone, rim highlight, inner ring groove
    g.ellipse(x, y, DAIS_RX, DAIS_RY).fill(0x4a4152);
    g.ellipse(x, y + 0.5, DAIS_RX - 2, DAIS_RY - 1.5).fill(0x3a3242);
    g.ellipse(x, y - 1, DAIS_RX - 5, DAIS_RY - 3).fill({ color: 0x5a4f62, alpha: 0.35 });
    g.ellipse(x, y, DAIS_RX - 8, DAIS_RY - 2.5).stroke({ color: 0x15111a, width: 1, alpha: 0.9 });
    g.ellipse(x, y, DAIS_RX, DAIS_RY).stroke({ color: 0x6f6478, width: 1, alpha: 0.7 });
    // Cracks and chips
    g.moveTo(x - 24, y - 3).lineTo(x - 18, y - 1).lineTo(x - 19, y + 3).stroke({ color: 0x15111a, width: 1, alpha: 0.7 });
    g.moveTo(x + 20, y + 4).lineTo(x + 26, y + 1).stroke({ color: 0x15111a, width: 1, alpha: 0.7 });
  }

  /** God rays falling from a high window onto the dais: cones fading in toward the floor (tinted per frame). */
  private drawRays(): void {
    const { x, y } = this;
    this.rayFill = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: 'rgba(255,255,255,0)' },
        { offset: 0.45, color: 'rgba(255,255,255,0.45)' },
        { offset: 0.92, color: 'rgba(255,255,255,1)' },
        { offset: 1, color: 'rgba(255,255,255,0.4)' },
      ],
      textureSpace: 'local',
    });
    const sx = x - 26;
    const sy = y - 200;
    const cone = (w0: number, w1: number, alpha: number, dx = 0) =>
      this.rays.poly([sx - w0 + dx, sy, sx + w0 + dx, sy, x + w1 + dx * 0.4, y + 3, x - w1 + dx * 0.4, y + 3]).fill({ fill: this.rayFill!, alpha });
    cone(10, 50, 0.11);
    cone(6, 34, 0.13);
    cone(3, 18, 0.14, 4);
    cone(1.5, 7, 0.12, -12);
  }

  /** Re-tints the runes, aura and embers to the previewed item and flares them. */
  setAccent(color: number, big = false): void {
    this.accent = color;
    this.flareT = 0;
    this.waveT = 0;
    this.waveBig = big;
    this.flare.tint = color;
    // A gust of embers in the new colour
    const n = big ? this.embers.length : Math.ceil(this.embers.length / 2);
    for (let i = 0; i < n; i++) this.spawnEmber(this.embers[i], 0, true);
  }

  private spawnEmber(e: Ember, age: number, burst = false): void {
    const fromDais = burst || Math.random() < 0.6;
    const sx = fromDais ? this.x + (Math.random() - 0.5) * DAIS_RX * 2 : this.x - 90 + Math.random() * 180;
    const sy = fromDais ? this.y + (Math.random() - 0.5) * DAIS_RY : this.y + 30;
    e.s.position.set(sx, sy);
    e.vx = (Math.random() - 0.5) * (burst ? 0.9 : 0.25);
    e.vy = -(burst ? 0.8 + Math.random() * 1.1 : 0.25 + Math.random() * 0.45);
    e.max = burst ? 50 + Math.random() * 40 : 120 + Math.random() * 140;
    e.life = e.max * age;
    e.phase = Math.random() * Math.PI * 2;
    const tinted = burst || Math.random() < 0.4;
    e.s.tint = tinted ? lerpColor(this.accent, 0xffffff, Math.random() * 0.3) : EMBER_COLORS[(Math.random() * EMBER_COLORS.length) | 0];
    e.s.scale.set(Math.random() < 0.25 ? 2 : 1);
    if (age > 0) {
      e.s.x += e.vx * e.life;
      e.s.y += e.vy * e.life;
    }
  }

  update(delta: number): void {
    this.t += delta;
    const t = this.t;
    const { x, y } = this;
    // Ease the shown colour toward the accent (a quick blend, not a cut)
    this.shownAccent = lerpColor(this.shownAccent, this.accent, Math.min(1, 0.12 * delta));
    const accent = this.shownAccent;
    const flicker = 0.9 + Math.sin(t * 0.21) * 0.05 + Math.sin(t * 0.53) * 0.04 + Math.sin(t * 1.37) * 0.02;

    // Aura behind the knight
    this.halo.tint = lerpColor(accent, FORGE, 0.3);
    this.halo.alpha = 0.7 * flicker + (1 - Math.min(1, this.flareT)) * 0.4;
    if (this.rim) this.rim.color = lerpColor(lerpColor(accent, FORGE, 0.25), 0xffffff, 0.2 + (1 - Math.min(1, this.flareT)) * 0.6);
    this.halo.setSize(110 + Math.sin(t * 0.05) * 5, 150 + Math.sin(t * 0.05) * 6);

    // Light shaft from the high windows
    this.rays.tint = lerpColor(0xfde68a, accent, 0.4);
    this.rays.alpha = flicker;

    // Rune ring carved in the dais top, slowly turning
    const g = this.runes;
    g.clear();
    const pulse = 0.55 + Math.sin(t * 0.08) * 0.2 + (1 - Math.min(1, this.flareT)) * 0.5;
    g.ellipse(x, y, DAIS_RX - 8, DAIS_RY - 2.5).stroke({ color: accent, width: 1, alpha: 0.35 * pulse });
    const marks = 14;
    for (let i = 0; i < marks; i++) {
      const a = (i / marks) * Math.PI * 2 + t * 0.006;
      const px = x + Math.cos(a) * (DAIS_RX - 8);
      const py = y + Math.sin(a) * (DAIS_RY - 2.5);
      const facing = 0.45 + Math.max(0, Math.sin(a)) * 0.55; // the near side reads brighter
      const w = i % 3 === 0 ? 3 : 2;
      g.rect(Math.round(px - w / 2), Math.round(py - (i % 2 ? 1 : 0)), w, i % 2 ? 2 : 1).fill({ color: lerpColor(accent, 0xffffff, 0.35), alpha: Math.min(1, pulse * facing) });
    }
    // The light spilling onto the dais face
    g.ellipse(x, y + 1, DAIS_RX - 10, DAIS_RY - 4).fill({ color: accent, alpha: 0.08 * pulse });

    // Preview flare and floor shockwave
    if (this.flareT < 1) {
      this.flareT = Math.min(1, this.flareT + delta / (this.waveBig ? 50 : 30));
      const k = 1 - this.flareT;
      this.flare.alpha = k * k * (this.waveBig ? 1 : 0.75);
      this.flare.setSize(60 + this.flareT * 70, 90 + this.flareT * 60);
    } else this.flare.alpha = 0;
    const w = this.wave;
    w.clear();
    if (this.waveT < 1) {
      this.waveT = Math.min(1, this.waveT + delta / (this.waveBig ? 40 : 26));
      const e = 1 - (1 - this.waveT) ** 3;
      const reach = this.waveBig ? 90 : 60;
      const rx = DAIS_RX * 0.6 + e * reach;
      w.ellipse(x, y + 2, rx, rx * 0.25).stroke({ color: accent, width: 2, alpha: (1 - this.waveT) * 0.8 });
      w.ellipse(x, y + 2, rx * 0.8, rx * 0.2).stroke({ color: 0xffffff, width: 1, alpha: (1 - this.waveT) * 0.5 });
    }

    // Embers: rise, sway, flicker out
    for (const e of this.embers) {
      e.life += delta;
      if (e.life >= e.max) {
        this.spawnEmber(e, 0);
        continue;
      }
      e.vy *= 0.995;
      e.s.x += (e.vx + Math.sin(e.phase + e.life * 0.06) * 0.18) * delta;
      e.s.y += e.vy * delta;
      const u = e.life / e.max;
      e.s.alpha = Math.min(1, u * 8) * (1 - u) * (0.65 + Math.sin(e.phase + e.life * 0.4) * 0.35);
    }
  }

  destroy(): void {
    if (this.rim) {
      this.knight.filters = [];
      this.rim.destroy();
    }
    this.root.destroy({ children: true });
    this.back.destroy({ children: true });
    this.front.destroy({ children: true });
    this.glowTex.destroy(true);
    this.vignetteTex.destroy(true);
    this.rayFill?.destroy();
  }
}
