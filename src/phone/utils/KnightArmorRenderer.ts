import { NormalizedLandmark, POSE_INDEX } from './KinematicTracker';
import ARMOR_FRAMES from '../../../public/assets/phone/knight-armor.json';

export interface KnightArmorRenderOptions {
  glowPower?: number; // 0 - 150 (drives the visor glow, aura and embers)
  activePhase?: number; // 0 (Hike/Prep), 1 (Drive), 2 (Lockout)
  showHelmet?: boolean;
  showChestplate?: boolean;
  showPauldrons?: boolean;
  showGauntlets?: boolean;
  showLegArmor?: boolean;
  showWeapons?: boolean; // defaults to true (the dragon-crest shield)
  heraldryColor?: string; // tints the war-aura (defaults to forge ember)
  requireFullBody?: boolean; // defaults to true: gatekeeps armor until shoulders, hips, hands, and knees are visible
}

type Pt = { x: number; y: number };
type Part = keyof typeof ARMOR_FRAMES;

/**
 * Palette sampled from the TV knight (HulkForm2): blackened steel, gilded bronze trim, crimson cloth
 * and the forge-ember glow of the visor.
 */
const PAL = {
  outline: '#0E0A08',
  steelDark: '#2A2A2E',
  steelMid: '#5E5D63',
  steelLight: '#A9A8A6',
  steelGlint: '#E6E2D6',
  goldDark: '#5E3F12',
  gold: '#B5832A',
  goldLight: '#F2C966',
  crimsonDark: '#3D0A0B',
  crimson: '#7E1716',
  crimsonLight: '#B9302A',
  wineDark: '#1E0508',
  wine: '#4A0C12',
  wineLight: '#6E1520',
  emberRed: '#C92A00',
  ember: '#FF6A00',
  emberAmber: '#FFB12E',
  emberCore: '#FFF2B0',
};

/** Armour is painted into a buffer this many canvas pixels per texel, then upscaled without smoothing. */
const PIXEL = 2;

/**
 * Dark-fantasy pixel-art knight projected onto MediaPipe Pose landmarks.
 * Uses the TV knight's own armour parts (public/assets/phone/knight-armor.png, cut from the Spine atlas by
 * scripts/build_phone_armor.py) as a 2D puppet — crested great helm, gilded cuirass, gauntlets, greaves and
 * the dragon-crest shield — plus hand-painted pauldrons, a crimson cape, a glowing visor and a war-aura.
 * Everything is drawn into a low-res buffer and composited with a dark outline so it reads as one sprite.
 */
export class KnightArmorRenderer {
  private static sheet: HTMLImageElement | null = null;
  private static sheetReady = false;
  private static art: HTMLCanvasElement | null = null;
  private static mask: HTMLCanvasElement | null = null;

  /** Starts loading the armour sheet; drawKnightArmor() draws nothing until it has arrived. */
  public static preload(): void {
    if (this.sheet) return;
    const img = new Image();
    img.onload = () => {
      this.sheetReady = true;
    };
    img.src = `${import.meta.env.BASE_URL}assets/phone/knight-armor.png`;
    this.sheet = img;
  }

  public static drawKnightArmor(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    landmarks: NormalizedLandmark[],
    options: KnightArmorRenderOptions = {}
  ): void {
    if (!landmarks || landmarks.length < 29) return;
    this.preload();
    if (!this.sheetReady) return;

    const {
      glowPower = 50,
      activePhase = 0,
      showHelmet = true,
      showChestplate = true,
      showPauldrons = true,
      showGauntlets = true,
      showLegArmor = true,
      showWeapons = true,
      heraldryColor,
      requireFullBody = true,
    } = options;

    // Body Visibility Gatekeeper: only materialize the armor when the body down to the knees is in frame.
    const isPointValid = (p?: NormalizedLandmark, minVis = 0.4): boolean => {
      if (!p) return false;
      const vis = p.visibility !== undefined ? p.visibility : 1.0;
      const inBounds = p.x >= 0.01 && p.x <= 0.99 && p.y >= 0.01 && p.y <= 0.99;
      return vis >= minVis && inBounds;
    };
    const lm = (i: number) => landmarks[i];
    const shouldersVisible = isPointValid(lm(POSE_INDEX.LEFT_SHOULDER), 0.45) && isPointValid(lm(POSE_INDEX.RIGHT_SHOULDER), 0.45);
    const hipsVisible = isPointValid(lm(POSE_INDEX.LEFT_HIP)) && isPointValid(lm(POSE_INDEX.RIGHT_HIP));
    const wristsVisible = isPointValid(lm(POSE_INDEX.LEFT_WRIST), 0.38) || isPointValid(lm(POSE_INDEX.RIGHT_WRIST), 0.38);
    const kneesVisible = isPointValid(lm(POSE_INDEX.LEFT_KNEE), 0.38) && isPointValid(lm(POSE_INDEX.RIGHT_KNEE), 0.38);
    if (requireFullBody && !(shouldersVisible && hipsVisible && wristsVisible && kneesVisible)) return;

    // Landmarks in buffer texels
    const bw = Math.ceil(w / PIXEL);
    const bh = Math.ceil(h / PIXEL);
    const at = (i: number, minVis = 0.35): Pt | null => {
      const p = landmarks[i];
      if (!p || (p.visibility ?? 1) < minVis) return null;
      return { x: (p.x * w) / PIXEL, y: (p.y * h) / PIXEL };
    };
    const lS = at(POSE_INDEX.LEFT_SHOULDER, 0);
    const rS = at(POSE_INDEX.RIGHT_SHOULDER, 0);
    if (!lS || !rS) return;
    const nose = at(POSE_INDEX.NOSE);
    const lEar = at(POSE_INDEX.LEFT_EAR, 0.2);
    const rEar = at(POSE_INDEX.RIGHT_EAR, 0.2);
    const lE = at(POSE_INDEX.LEFT_ELBOW);
    const rE = at(POSE_INDEX.RIGHT_ELBOW);
    const lW = at(POSE_INDEX.LEFT_WRIST);
    const rW = at(POSE_INDEX.RIGHT_WRIST);
    const lH = at(POSE_INDEX.LEFT_HIP);
    const rH = at(POSE_INDEX.RIGHT_HIP);
    const lK = at(POSE_INDEX.LEFT_KNEE);
    const rK = at(POSE_INDEX.RIGHT_KNEE);
    const lA = at(POSE_INDEX.LEFT_ANKLE);
    const rA = at(POSE_INDEX.RIGHT_ANKLE);
    const lT = at(POSE_INDEX.LEFT_FOOT_INDEX);
    const rT = at(POSE_INDEX.RIGHT_FOOT_INDEX);

    const sw = Math.max(8, dist(lS, rS));
    const neckBase = mid(lS, rS);
    const hipMid = lH && rH ? mid(lH, rH) : { x: neckBase.x, y: neckBase.y + sw * 1.3 };
    const centerX = neckBase.x;
    const time = performance.now() / 1000;
    const surge = Math.min(1, Math.max(0, (glowPower - 40) / 80)) * 0.7 + (activePhase === 1 ? 0.3 : 0);

    const b = this.buffer(bw, bh);
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.clearRect(0, 0, bw, bh);
    b.imageSmoothingEnabled = false;

    // --- Back to front ---
    if (showChestplate) this.drawCape(b, lS, rS, hipMid, lK, rK, sw, time, activePhase);

    if (showLegArmor) {
      for (const [hip, knee, ankle, toe] of [
        [lH, lK, lA, lT],
        [rH, rK, rA, rT],
      ] as const) {
        if (hip && knee) this.limb(b, 'thigh', hip, knee, sw * 0.4, -0.06, 0.12, sideOf(knee, centerX));
        if (knee && ankle) this.limb(b, 'calf', knee, ankle, sw * 0.36, -0.08, 0.06, sideOf(knee, centerX));
        if (ankle) this.foot(b, ankle, toe, knee, sw);
      }
    }

    if (showChestplate && lH && rH) {
      // Gilded cuirass from the collar to just past the hips (its crimson tabard covers the belt line)
      const torsoLen = dist(neckBase, hipMid);
      const tilt = Math.atan2(hipMid.x - neckBase.x, hipMid.y - neckBase.y);
      this.sprite(b, 'body', neckBase.x, neckBase.y - torsoLen * 0.08, sw * 1.18, torsoLen * 1.26, -tilt, 0.5, 0);
    }

    // Arms: plate upper arm, then the gauntlet with the fist past the wrist
    // The shield stays out of the way of two-handed grips and overhead lockouts
    const shieldOnRight = showWeapons && rE && rW && rW.y > rS.y && (!lW || dist(lW, rW) > sw * 0.55);
    for (const [shoulder, elbow, wrist, part] of [
      [lS, lE, lW, 'forearmB'],
      [rS, rE, rW, 'forearm'],
    ] as const) {
      const side = sideOf(shoulder, centerX);
      if (showGauntlets && elbow) this.limb(b, part, shoulder, elbow, sw * 0.34, -0.1, 0.1, side);
      if (showGauntlets && elbow && wrist) this.limb(b, 'arm', elbow, wrist, sw * 0.4, -0.08, 0.5, -side);
    }

    if (showPauldrons) {
      this.pauldron(b, lS, lE, sw, sideOf(lS, centerX));
      this.pauldron(b, rS, rE, sw, sideOf(rS, centerX));
    }

    if (shieldOnRight && rE && rW) this.shield(b, rE, rW, sw, sideOf(rW, centerX));

    if (showHelmet && nose) this.helm(b, nose, lEar, rEar, neckBase, sw, surge, time);

    // --- Composite: outline, optional war-aura, art, then embers on top ---
    const m = this.mask!.getContext('2d')!;
    m.globalCompositeOperation = 'copy';
    m.drawImage(this.art!, 0, 0);
    m.globalCompositeOperation = 'source-in';
    m.fillStyle = PAL.outline;
    m.fillRect(0, 0, bw, bh);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (surge > 0.15) {
      // War-aura: the silhouette, tinted, pulsing two texels out
      m.fillStyle = heraldryColor && activePhase !== 1 ? heraldryColor : PAL.ember;
      m.fillRect(0, 0, bw, bh);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (0.25 + 0.2 * Math.sin(time * 9)) * surge;
      for (const [dx, dy] of RING2) ctx.drawImage(this.mask!, dx * PIXEL, dy * PIXEL, bw * PIXEL, bh * PIXEL);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      m.fillStyle = PAL.outline;
      m.fillRect(0, 0, bw, bh);
    }
    for (const [dx, dy] of RING1) ctx.drawImage(this.mask!, dx * PIXEL, dy * PIXEL, bw * PIXEL, bh * PIXEL);
    ctx.drawImage(this.art!, 0, 0, bw * PIXEL, bh * PIXEL);

    if (surge > 0.25 && nose) this.embers(ctx, neckBase, sw, surge, time);
    ctx.restore();
  }

  private static buffer(bw: number, bh: number): CanvasRenderingContext2D {
    if (!this.art || this.art.width !== bw || this.art.height !== bh) {
      this.art = document.createElement('canvas');
      this.mask = document.createElement('canvas');
      this.art.width = this.mask.width = bw;
      this.art.height = this.mask.height = bh;
    }
    return this.art.getContext('2d')!;
  }

  /** Draws an armour part with its anchor (ax, ay as fractions of the part) at x, y. */
  private static sprite(
    b: CanvasRenderingContext2D,
    part: Part,
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number,
    ax: number,
    ay: number,
    flip = false
  ): void {
    const [sx, sy, sw, sh] = ARMOR_FRAMES[part];
    b.save();
    b.translate(Math.round(x), Math.round(y));
    b.rotate(rotation);
    if (flip) b.scale(-1, 1);
    b.drawImage(this.sheet!, sx, sy, sw, sh, -width * ax, -height * ay, width, height);
    b.restore();
  }

  /** Stretches an upright part (top = joint `a`) along the bone a→b, extended by `head`/`tail` × its length. */
  private static limb(
    b: CanvasRenderingContext2D,
    part: Part,
    a: Pt,
    c: Pt,
    width: number,
    head: number,
    tail: number,
    side: number
  ): void {
    const len = dist(a, c);
    if (len < 2) return;
    const rot = Math.atan2(c.y - a.y, c.x - a.x) - Math.PI / 2;
    const total = len * (1 - head + tail);
    this.sprite(b, part, a.x, a.y, width, total, rot, 0.5, -head / (1 - head + tail), side > 0);
  }

  /** Layered gilded spaulder with a back-swept horn, tilting with the upper arm. */
  private static pauldron(b: CanvasRenderingContext2D, s: Pt, elbow: Pt | null, sw: number, side: number): void {
    const r = sw * 0.27;
    const armAngle = elbow ? Math.atan2(elbow.y - s.y, elbow.x - s.x) : Math.PI / 2;
    // 0 when the arm hangs, follows it up to ~50° as the arm raises
    const lift = clamp((Math.PI / 2 - Math.abs(armAngle)) * side, -0.9, 0.9) * 0.5;

    b.save();
    b.translate(Math.round(s.x + side * r * 0.25), Math.round(s.y - r * 0.15));
    b.rotate(-lift * side);
    b.scale(side, 1);

    // Horn: a curved spike sweeping up and out
    b.fillStyle = PAL.steelDark;
    b.beginPath();
    b.moveTo(-r * 0.05, -r * 0.55);
    b.quadraticCurveTo(r * 0.55, -r * 1.25, r * 1.0, -r * 1.45);
    b.quadraticCurveTo(r * 0.75, -r * 0.85, r * 0.55, -r * 0.4);
    b.closePath();
    b.fill();
    b.fillStyle = PAL.steelLight;
    b.fillRect(Math.round(r * 0.5), Math.round(-r * 1.05), 1, Math.max(1, Math.round(r * 0.25)));

    // Three lames, bottom first so the dome overlaps them
    const lames = [
      { y: r * 0.62, rx: r * 0.92, ry: r * 0.42 },
      { y: r * 0.32, rx: r * 1.0, ry: r * 0.5 },
    ];
    for (const l of lames) {
      b.fillStyle = PAL.crimsonDark;
      b.beginPath();
      b.ellipse(r * 0.1, l.y + 1, l.rx, l.ry, 0, 0, Math.PI);
      b.fill();
      b.fillStyle = PAL.steelMid;
      b.beginPath();
      b.ellipse(r * 0.1, l.y, l.rx, l.ry, 0, 0, Math.PI);
      b.fill();
      b.fillStyle = PAL.gold;
      b.beginPath();
      b.ellipse(r * 0.1, l.y, l.rx, l.ry, 0, 0.1, Math.PI - 0.1);
      b.ellipse(r * 0.1, l.y - 1, l.rx - 1, l.ry - 1, 0, Math.PI - 0.1, 0.1, true);
      b.fill();
    }

    // Dome
    const dome = b.createRadialGradient(r * 0.25, -r * 0.35, r * 0.05, 0, 0, r * 1.1);
    dome.addColorStop(0, PAL.steelLight);
    dome.addColorStop(0.35, PAL.steelMid);
    dome.addColorStop(0.75, PAL.steelDark);
    dome.addColorStop(1, PAL.outline);
    b.fillStyle = dome;
    b.beginPath();
    b.ellipse(0, 0, r, r * 0.78, 0, Math.PI * 0.98, Math.PI * 2.02);
    b.quadraticCurveTo(r * 0.2, r * 0.38, -r, r * 0.04);
    b.fill();

    // Gilded rim + fluting
    b.strokeStyle = PAL.gold;
    b.lineWidth = Math.max(1, r * 0.14);
    b.beginPath();
    b.moveTo(-r * 0.98, r * 0.04);
    b.quadraticCurveTo(r * 0.2, r * 0.4, r, 0);
    b.stroke();
    b.strokeStyle = PAL.goldLight;
    b.lineWidth = 1;
    b.beginPath();
    b.moveTo(-r * 0.9, -r * 0.02);
    b.quadraticCurveTo(r * 0.2, r * 0.3, r * 0.92, -r * 0.06);
    b.stroke();
    b.strokeStyle = PAL.steelDark;
    b.beginPath();
    b.moveTo(-r * 0.25, -r * 0.7);
    b.quadraticCurveTo(-r * 0.05, -r * 0.2, -r * 0.1, r * 0.2);
    b.moveTo(r * 0.35, -r * 0.68);
    b.quadraticCurveTo(r * 0.45, -r * 0.2, r * 0.45, r * 0.18);
    b.stroke();

    // Rivets
    b.fillStyle = PAL.goldLight;
    for (const t of [-0.6, 0.15, 0.8]) b.fillRect(Math.round(r * t), Math.round(r * 0.16 + Math.abs(t) * -r * 0.08), 1, 1);

    b.restore();
  }

  /** Crimson cape hanging from behind the shoulders, swaying, ragged at the hem. */
  private static drawCape(
    b: CanvasRenderingContext2D,
    lS: Pt,
    rS: Pt,
    hip: Pt,
    lK: Pt | null,
    rK: Pt | null,
    sw: number,
    time: number,
    phase: number
  ): void {
    const left = lS.x < rS.x ? lS : rS;
    const right = lS.x < rS.x ? rS : lS;
    const hemY = lK && rK ? (lK.y + rK.y) / 2 + sw * 0.15 : hip.y + sw * 0.9;
    const flare = sw * (phase === 1 ? 0.55 : 0.4);
    const sway = Math.sin(time * 1.7) * sw * 0.08;

    const path = () => {
      b.beginPath();
      b.moveTo(left.x + sw * 0.05, left.y);
      b.lineTo(right.x - sw * 0.05, right.y);
      b.quadraticCurveTo(right.x + flare * 0.6, (right.y + hemY) / 2, right.x + flare + sway, hemY);
      const teeth = 7;
      const x0 = right.x + flare + sway;
      const x1 = left.x - flare + sway;
      for (let i = 1; i <= teeth; i++) {
        const x = x0 + ((x1 - x0) * i) / teeth;
        const ragged = (i % 2 ? sw * 0.12 : 0) + Math.sin(time * 2.3 + i * 1.9) * sw * 0.04;
        b.lineTo(x, hemY - ragged);
      }
      b.quadraticCurveTo(left.x - flare * 0.6, (left.y + hemY) / 2, left.x + sw * 0.05, left.y);
      b.closePath();
    };

    const g = b.createLinearGradient(left.x - flare, 0, right.x + flare, 0);
    g.addColorStop(0, PAL.wineDark);
    g.addColorStop(0.3, PAL.wine);
    g.addColorStop(0.55, PAL.wineLight);
    g.addColorStop(0.8, PAL.wine);
    g.addColorStop(1, PAL.wineDark);
    b.fillStyle = g;
    path();
    b.fill();
    // Gilded hem and edges
    b.strokeStyle = PAL.goldDark;
    b.lineWidth = 2;
    path();
    b.stroke();
    b.strokeStyle = PAL.gold;
    b.lineWidth = 1;
    path();
    b.stroke();

    // Folds
    b.strokeStyle = PAL.wineDark;
    b.lineWidth = 1;
    b.beginPath();
    for (const t of [0.2, 0.45, 0.7, 0.9]) {
      const x = left.x + (right.x - left.x) * t;
      const xh = left.x - flare + (right.x - left.x + flare * 2) * t + sway;
      b.moveTo(x, left.y + sw * 0.4);
      b.quadraticCurveTo((x + xh) / 2 + sway * 0.5, (left.y + hemY) / 2, xh, hemY - sw * 0.15);
    }
    b.stroke();
  }

  /** Sabaton: the foot plate pointed from the ankle toward the toes. */
  private static foot(b: CanvasRenderingContext2D, ankle: Pt, toe: Pt | null, knee: Pt | null, sw: number): void {
    const toward = toe ?? { x: ankle.x, y: ankle.y + sw * 0.3 };
    const ang = Math.atan2(toward.y - ankle.y, toward.x - ankle.x);
    const facesLeft = Math.cos(ang) < 0;
    const w = sw * 0.62;
    const hgt = w * 0.55;
    b.save();
    b.translate(Math.round(ankle.x), Math.round(ankle.y));
    // A frontal camera mostly sees toes pointing down-screen: keep the plate level, nudged by the toe direction
    const lean = knee ? clamp((ankle.x - knee.x) / sw, -0.4, 0.4) : 0;
    b.rotate(lean);
    if (facesLeft) b.scale(-1, 1);
    const [sx, sy, fw, fh] = ARMOR_FRAMES.foot;
    b.drawImage(this.sheet!, sx, sy, fw, fh, -w * 0.35, -hgt * 0.35, w, hgt);
    b.restore();
  }

  /** The dragon-crest heater shield strapped to the forearm. */
  private static shield(b: CanvasRenderingContext2D, elbow: Pt, wrist: Pt, sw: number, side: number): void {
    const c = { x: elbow.x * 0.4 + wrist.x * 0.6 + side * sw * 0.12, y: elbow.y * 0.4 + wrist.y * 0.6 };
    const fore = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x) - Math.PI / 2;
    const size = sw * 0.95;
    this.sprite(b, 'shield', c.x, c.y, size * (41 / 49), size, fore * 0.25, 0.5, 0.5, side < 0);
  }

  /** Crested great helm, tilted with the ears, with a forge-lit eye slit. */
  private static helm(
    b: CanvasRenderingContext2D,
    nose: Pt,
    lEar: Pt | null,
    rEar: Pt | null,
    neck: Pt,
    sw: number,
    surge: number,
    time: number
  ): void {
    const earSpan = lEar && rEar ? dist(lEar, rEar) : sw * 0.5;
    const width = clamp(earSpan * 1.75, sw * 0.6, sw * 0.95);
    const height = width * (27 / 19);
    const center = lEar && rEar ? { x: (mid(lEar, rEar).x + nose.x) / 2, y: (lEar.y + rEar.y) / 2 } : nose;
    let roll = lEar && rEar ? Math.atan2(rEar.y - lEar.y, rEar.x - lEar.x) : 0;
    if (Math.abs(roll) > Math.PI / 2) roll -= Math.sign(roll) * Math.PI;
    roll = clamp(roll, -0.5, 0.5);

    // Gorget: steel collar bridging helm and cuirass
    const gorget = b.createLinearGradient(neck.x - sw * 0.3, 0, neck.x + sw * 0.3, 0);
    gorget.addColorStop(0, PAL.steelDark);
    gorget.addColorStop(0.6, PAL.steelMid);
    gorget.addColorStop(1, PAL.steelDark);
    b.fillStyle = gorget;
    b.beginPath();
    b.ellipse(neck.x, neck.y - sw * 0.1, sw * 0.3, sw * 0.16, 0, 0, Math.PI * 2);
    b.fill();
    b.fillStyle = PAL.gold;
    b.fillRect(Math.round(neck.x - sw * 0.26), Math.round(neck.y - sw * 0.04), Math.round(sw * 0.52), 1);
    b.fillRect(Math.round(neck.x - sw * 0.2), Math.round(neck.y - sw * 0.17), Math.round(sw * 0.4), 1);

    // Sprite: the helm face sits at 55% of its height; put that on the eye line
    b.save();
    b.translate(Math.round(center.x), Math.round(center.y));
    b.rotate(roll);
    const [sx, sy, fw, fh] = ARMOR_FRAMES.head;
    b.drawImage(this.sheet!, sx, sy, fw, fh, -width / 2, -height * 0.55, width, height);

    // Eye slit glow (always lit, flares with effort)
    const flicker = 0.85 + 0.15 * Math.sin(time * 23) * Math.sin(time * 7);
    const glow = (0.55 + surge * 0.45) * flicker;
    const slitW = Math.max(3, Math.round(width * 0.62));
    const slitY = Math.round(-height * 0.1);
    b.globalCompositeOperation = 'lighter';
    b.globalAlpha = glow * 0.5;
    b.fillStyle = PAL.ember;
    b.fillRect(-Math.round(slitW / 2) - 1, slitY - 1, slitW + 2, 3);
    b.globalAlpha = glow;
    b.fillStyle = PAL.emberAmber;
    b.fillRect(-Math.round(slitW / 2), slitY, Math.round(slitW * 0.4), 1);
    b.fillRect(Math.round(slitW / 2) - Math.round(slitW * 0.4), slitY, Math.round(slitW * 0.4), 1);
    if (surge > 0.4) {
      b.fillStyle = PAL.emberCore;
      b.fillRect(-Math.round(slitW * 0.3), slitY, 1, 1);
      b.fillRect(Math.round(slitW * 0.3) - 1, slitY, 1, 1);
    }
    b.restore();
  }

  /** Forge embers drifting up around the knight (drawn at canvas scale as chunky pixels). */
  private static embers(ctx: CanvasRenderingContext2D, neck: Pt, sw: number, surge: number, time: number): void {
    const count = Math.round(6 + surge * 10);
    const spread = sw * 1.3 * PIXEL;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < count; i++) {
      const seed = i * 12.9898;
      const progress = (time * (0.35 + (i % 3) * 0.08) + (Math.sin(seed) * 0.5 + 0.5)) % 1;
      const x = neck.x * PIXEL + Math.sin(seed * 3.1) * spread + Math.sin(time * 2 + seed) * sw * 0.15 * PIXEL;
      const y = neck.y * PIXEL + sw * 1.4 * PIXEL - progress * sw * 3 * PIXEL;
      const size = PIXEL * (i % 4 === 0 ? 2 : 1);
      ctx.globalAlpha = Math.sin(progress * Math.PI) * surge;
      ctx.fillStyle = i % 3 === 0 ? PAL.emberCore : i % 3 === 1 ? PAL.emberAmber : PAL.ember;
      ctx.fillRect(Math.round(x / PIXEL) * PIXEL, Math.round(y / PIXEL) * PIXEL, size, size);
    }
    ctx.restore();
  }
}

const RING1: ReadonlyArray<[number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const RING2: ReadonlyArray<[number, number]> = [
  [-2, 0],
  [2, 0],
  [0, -2],
  [0, 2],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** -1 for points left of the body's centre line, 1 for points right of it. */
const sideOf = (p: Pt, centerX: number) => (p.x < centerX ? -1 : 1);
