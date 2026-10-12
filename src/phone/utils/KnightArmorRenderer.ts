import { NormalizedLandmark, POSE_INDEX } from './KinematicTracker';

export interface KnightArmorRenderOptions {
  glowPower?: number; // 0 - 150 (drives aura and gauntlet sparks)
  activePhase?: number; // 0 (Hike/Prep), 1 (Drive), 2 (Lockout)
  showHelmet?: boolean;
  showChestplate?: boolean;
  showPauldrons?: boolean;
  showGauntlets?: boolean;
  showLegArmor?: boolean;
  heraldryColor?: string; // default gold '#F4B41A'
}

/**
 * 32-Bit Dark Fantasy Palette:
 * Abyssal Forged Iron, Blood-Iron Highlights, Antique Tarnished Gold Filigree, and Cursed Soulfire.
 */
const PALETTE = {
  // Abyssal Black Iron & Damascus Steel
  abyss: '#0A0910',
  ironShadow: '#151322',
  ironDark: '#221E36',
  ironMid: '#363054',
  ironPlate: '#4C4472',
  ironLight: '#6B619B',
  ironHighlight: '#9A8FD1',
  ironSpecular: '#C4BCF2',

  // Antique Tarnished Gold / Cursed Brass Filigree
  goldDeep: '#3D2403',
  goldShadow: '#6B4208',
  goldMid: '#A86C10',
  goldPlate: '#D9911C',
  goldHighlight: '#F5B738',
  goldGlint: '#FFE885',

  // Blood Embers & Dark Magic Core
  bloodGlow: '#9E0B28',
  bloodFlame: '#E01A4F',
  bloodBright: '#FF3366',
  bloodCore: '#FF6B8B',
  soulCyan: '#00F5D4',
  soulViolet: '#A855F7',
  amberFlame: '#F59E0B',

  // Chainmail & Shadow Insets
  mailShadow: '#0E0D17',
  mailLink: '#201D30',
  rubyGlint: '#FF1744',
};

/**
 * 32-Bit Dark Fantasy Knight Armor Augmented Reality Renderer.
 * Projects imposing gothic plate armor, horned bascinet helm, fluted ribcage cuirass,
 * spired dread pauldrons, bladed gauntlets, and floating soul embers directly onto MediaPipe landmarks.
 */
export class KnightArmorRenderer {
  /**
   * Main render call: draws full 32-bit dark fantasy knight armor overlay
   */
  public static drawKnightArmor(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    landmarks: NormalizedLandmark[],
    options: KnightArmorRenderOptions = {}
  ): void {
    if (!landmarks || landmarks.length < 27) return;

    const {
      glowPower = 50,
      activePhase = 0,
      showHelmet = true,
      showChestplate = true,
      showPauldrons = true,
      showGauntlets = true,
      showLegArmor = true,
      heraldryColor = PALETTE.goldHighlight,
    } = options;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Extract landmarks
    const nose = landmarks[POSE_INDEX.NOSE];
    const lShoulder = landmarks[POSE_INDEX.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_INDEX.RIGHT_SHOULDER];
    const lElbow = landmarks[POSE_INDEX.LEFT_ELBOW];
    const rElbow = landmarks[POSE_INDEX.RIGHT_ELBOW];
    const lWrist = landmarks[POSE_INDEX.LEFT_WRIST];
    const rWrist = landmarks[POSE_INDEX.RIGHT_WRIST];
    const lHip = landmarks[POSE_INDEX.LEFT_HIP];
    const rHip = landmarks[POSE_INDEX.RIGHT_HIP];
    const lKnee = landmarks[POSE_INDEX.LEFT_KNEE];
    const rKnee = landmarks[POSE_INDEX.RIGHT_KNEE];
    const lAnkle = landmarks[POSE_INDEX.LEFT_ANKLE];
    const rAnkle = landmarks[POSE_INDEX.RIGHT_ANKLE];

    // Check minimum visibility for core anchors
    const isVisible = (p?: NormalizedLandmark, minVis = 0.35) =>
      p && (p.visibility ?? 1) >= minVis;

    if (!isVisible(lShoulder) || !isVisible(rShoulder)) {
      ctx.restore();
      return;
    }

    // Convert normalized coordinates to screen pixel points
    const pNose = nose ? { x: nose.x * w, y: nose.y * h } : null;
    const pLShoulder = { x: lShoulder.x * w, y: lShoulder.y * h };
    const pRShoulder = { x: rShoulder.x * w, y: rShoulder.y * h };
    const pLElbow = isVisible(lElbow) ? { x: lElbow.x * w, y: lElbow.y * h } : null;
    const pRElbow = isVisible(rElbow) ? { x: rElbow.x * w, y: rElbow.y * h } : null;
    const pLWrist = isVisible(lWrist) ? { x: lWrist.x * w, y: lWrist.y * h } : null;
    const pRWrist = isVisible(rWrist) ? { x: rWrist.x * w, y: rWrist.y * h } : null;
    const pLHip = isVisible(lHip) ? { x: lHip.x * w, y: lHip.y * h } : null;
    const pRHip = isVisible(rHip) ? { x: rHip.x * w, y: rHip.y * h } : null;
    const pLKnee = isVisible(lKnee) ? { x: lKnee.x * w, y: lKnee.y * h } : null;
    const pRKnee = isVisible(rKnee) ? { x: rKnee.x * w, y: rKnee.y * h } : null;
    const pLAnkle = isVisible(lAnkle) ? { x: lAnkle.x * w, y: lAnkle.y * h } : null;
    const pRAnkle = isVisible(rAnkle) ? { x: rAnkle.x * w, y: rAnkle.y * h } : null;

    // Body metric dimensions
    const shoulderWidth = Math.hypot(pLShoulder.x - pRShoulder.x, pLShoulder.y - pRShoulder.y);
    const chestCenter = {
      x: (pLShoulder.x + pRShoulder.x) / 2,
      y: (pLShoulder.y + pRShoulder.y) / 2,
    };

    // 0. AMBIENT DARK SOUL EMBERS (Floating embers around the torso and shoulders)
    this.drawDarkSoulEmbers(ctx, chestCenter, shoulderWidth, glowPower, activePhase);

    // 1. CUIRASS: FLUTED RIBCAGE BREASTPLATE & INFERNAL CORE
    if (showChestplate && pLHip && pRHip) {
      this.drawDarkGothicCuirass(ctx, pLShoulder, pRShoulder, pLHip, pRHip, heraldryColor, activePhase, glowPower);
    }

    // 2. PAULDRONS: SPIRED DREAD-GUARD SHOULDER GUARDS
    if (showPauldrons) {
      if (pLElbow) this.drawDarkPlauldron(ctx, pLShoulder, pLElbow, shoulderWidth * 0.32, 'LEFT');
      if (pRElbow) this.drawDarkPlauldron(ctx, pRShoulder, pRElbow, shoulderWidth * 0.32, 'RIGHT');
    }

    // 3. VAMBRACES & BLADED GAUNTLETS
    if (showGauntlets) {
      if (pLElbow && pLWrist) this.drawDarkVambrace(ctx, pLElbow, pLWrist, shoulderWidth * 0.17, glowPower, activePhase);
      if (pRElbow && pRWrist) this.drawDarkVambrace(ctx, pRElbow, pRWrist, shoulderWidth * 0.17, glowPower, activePhase);
    }

    // 4. FAULDS, TASSETS & GREAVES
    if (showLegArmor && pLHip && pRHip) {
      this.drawDarkFauldsAndTassets(ctx, pLHip, pRHip, shoulderWidth * 0.38);

      if (pLKnee) this.drawDarkPoleyn(ctx, pLKnee, shoulderWidth * 0.2);
      if (pRKnee) this.drawDarkPoleyn(ctx, pRKnee, shoulderWidth * 0.2);

      if (pLKnee && pLAnkle) this.drawDarkGreaves(ctx, pLKnee, pLAnkle, shoulderWidth * 0.16);
      if (pRKnee && pRAnkle) this.drawDarkGreaves(ctx, pRKnee, pRAnkle, shoulderWidth * 0.16);
    }

    // 5. GREAT HELM: THE HORNED DREAD BASCINET & CURSED EYE SLITS
    if (showHelmet && pNose) {
      this.drawDarkGreatHelm(ctx, pNose, chestCenter, shoulderWidth * 0.44, activePhase, glowPower);
    }

    // 6. CURSED BLOOD LIGHTNING & DARK SPARKS (When attacking or high velocity)
    if (glowPower > 70 || activePhase === 1) {
      if (pLWrist) this.drawCursedLightning(ctx, pLWrist.x, pLWrist.y, glowPower, activePhase);
      if (pRWrist) this.drawCursedLightning(ctx, pRWrist.x, pRWrist.y, glowPower, activePhase);
    }

    ctx.restore();
  }

  /**
   * 0. Ambient Floating Dark Soul Embers
   * Simulates atmospheric embers drifting upward from the knight's charred armor plates.
   */
  private static drawDarkSoulEmbers(
    ctx: CanvasRenderingContext2D,
    center: { x: number; y: number },
    bodyWidth: number,
    power: number,
    phase: number
  ): void {
    const time = performance.now() * 0.0015;
    const emberCount = 14 + (phase === 1 ? 10 : 0);
    const emberColor = phase === 1 ? PALETTE.soulCyan : PALETTE.bloodFlame;

    ctx.save();
    for (let i = 0; i < emberCount; i++) {
      const seed = i * 79.19;
      const xOffset = Math.sin(time * 0.8 + seed) * (bodyWidth * 0.7);
      const lifetime = ((time * 0.6 + seed * 0.1) % 1);
      const yOffset = -lifetime * (bodyWidth * 1.5) + bodyWidth * 0.2;
      const alpha = Math.sin(lifetime * Math.PI) * (0.4 + (power / 200));
      const size = (2 + (i % 3) * 1.5) * (phase === 1 ? 1.3 : 1.0);

      ctx.fillStyle = emberColor;
      ctx.shadowColor = emberColor;
      ctx.shadowBlur = 8;
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      // Draw diamond / pixel ember mote
      const px = center.x + xOffset;
      const py = center.y + yOffset;

      ctx.beginPath();
      ctx.moveTo(px, py - size);
      ctx.lineTo(px + size * 0.8, py);
      ctx.lineTo(px, py + size);
      ctx.lineTo(px - size * 0.8, py);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * 1. The Horned Dread Bascinet & Cursed Eye Slits (Helm)
   * Angular blackened steel skull cap, swept-back gothic horn spires,
   * jagged golden crown trim, and burning crimson/cyan eye slits with trailing flares.
   */
  private static drawDarkGreatHelm(
    ctx: CanvasRenderingContext2D,
    nose: { x: number; y: number },
    chestCenter: { x: number; y: number },
    radius: number,
    phase: number,
    power: number
  ): void {
    const headAngle = Math.atan2(nose.x - chestCenter.x, chestCenter.y - nose.y) * 0.35;
    const helmCenter = { x: nose.x, y: nose.y - radius * 0.22 };

    ctx.save();
    ctx.translate(helmCenter.x, helmCenter.y);
    ctx.rotate(headAngle);

    // --- A. TWIN GOTHIC DEMON HORN SPIRES ---
    // Left Horn
    this.drawHornSpire(ctx, -radius * 0.65, -radius * 0.45, -1, radius);
    // Right Horn
    this.drawHornSpire(ctx, radius * 0.65, -radius * 0.45, 1, radius);

    // --- B. CENTRAL RAZOR COMB RIDGE ---
    ctx.fillStyle = PALETTE.goldMid;
    ctx.strokeStyle = PALETTE.abyss;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.12, -radius * 0.7);
    ctx.lineTo(0, -radius * 1.4);
    ctx.lineTo(radius * 0.12, -radius * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Gold highlight on crest edge
    ctx.strokeStyle = PALETTE.goldHighlight;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -radius * 1.35);
    ctx.lineTo(0, -radius * 0.75);
    ctx.stroke();

    // --- C. BLACKENED STEEL SKULL DOME (Angled Gothic Polygon) ---
    const domeGrad = ctx.createLinearGradient(-radius, -radius, radius, radius * 1.2);
    domeGrad.addColorStop(0, PALETTE.ironLight);
    domeGrad.addColorStop(0.25, PALETTE.ironMid);
    domeGrad.addColorStop(0.6, PALETTE.ironDark);
    domeGrad.addColorStop(0.9, PALETTE.ironShadow);
    domeGrad.addColorStop(1, PALETTE.abyss);

    ctx.fillStyle = domeGrad;
    ctx.strokeStyle = PALETTE.abyss;
    ctx.lineWidth = 3.5;

    ctx.beginPath();
    // Angular faceted crown cap
    ctx.moveTo(0, -radius * 0.95);
    ctx.lineTo(radius * 0.7, -radius * 0.6);
    ctx.lineTo(radius * 0.78, radius * 0.1);
    ctx.lineTo(radius * 0.5, radius * 0.85);
    ctx.lineTo(0, radius * 1.05); // Sharp beak chin
    ctx.lineTo(-radius * 0.5, radius * 0.85);
    ctx.lineTo(-radius * 0.78, radius * 0.1);
    ctx.lineTo(-radius * 0.7, -radius * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Specular highlight facet on left skull
    ctx.fillStyle = PALETTE.ironHighlight;
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.9);
    ctx.lineTo(-radius * 0.65, -radius * 0.55);
    ctx.lineTo(-radius * 0.45, -radius * 0.2);
    ctx.lineTo(-radius * 0.1, -radius * 0.5);
    ctx.closePath();
    ctx.globalAlpha = 0.45;
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // --- D. GOTHIC JAGGED CROWN / BROW BAND ---
    ctx.fillStyle = PALETTE.goldPlate;
    ctx.strokeStyle = PALETTE.abyss;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(-radius * 0.74, -radius * 0.22);
    ctx.lineTo(-radius * 0.4, -radius * 0.35);
    ctx.lineTo(0, -radius * 0.2);
    ctx.lineTo(radius * 0.4, -radius * 0.35);
    ctx.lineTo(radius * 0.74, -radius * 0.22);
    ctx.lineTo(radius * 0.72, -radius * 0.08);
    ctx.lineTo(0, -radius * 0.06);
    ctx.lineTo(-radius * 0.72, -radius * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Gold filigree studs on brow band
    ctx.fillStyle = PALETTE.goldGlint;
    for (let c = -3; c <= 3; c++) {
      ctx.fillRect(c * radius * 0.2 - 2, -radius * 0.18 - 2, 4, 4);
    }

    // --- E. VISOR SLIT & BURNING DEMON EYE EMISSION ---
    const eyeColor = phase === 1 ? PALETTE.soulCyan : PALETTE.bloodFlame;
    const eyeCore = phase === 1 ? '#E0FFFF' : PALETTE.bloodBright;

    // Dark Visor Recess
    ctx.fillStyle = PALETTE.abyss;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.62, -radius * 0.04);
    ctx.lineTo(-radius * 0.05, radius * 0.08);
    ctx.lineTo(0, radius * 0.09);
    ctx.lineTo(radius * 0.05, radius * 0.08);
    ctx.lineTo(radius * 0.62, -radius * 0.04);
    ctx.lineTo(radius * 0.58, radius * 0.15);
    ctx.lineTo(0, radius * 0.22);
    ctx.lineTo(-radius * 0.58, radius * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Intense Glowing Slit Eyes with Trailing Wisps
    ctx.save();
    ctx.shadowColor = eyeColor;
    ctx.shadowBlur = phase === 1 ? 22 : 14;

    // Left Eye Flare
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.5, 0);
    ctx.lineTo(-radius * 0.12, radius * 0.07);
    ctx.lineTo(-radius * 0.15, radius * 0.14);
    ctx.lineTo(-radius * 0.52, radius * 0.06);
    ctx.closePath();
    ctx.fill();

    // Right Eye Flare
    ctx.beginPath();
    ctx.moveTo(radius * 0.12, radius * 0.07);
    ctx.lineTo(radius * 0.5, 0);
    ctx.lineTo(radius * 0.52, radius * 0.06);
    ctx.lineTo(radius * 0.15, radius * 0.14);
    ctx.closePath();
    ctx.fill();

    // Superheated Inner Eye Pupil Lines
    ctx.fillStyle = eyeCore;
    ctx.shadowBlur = 8;
    ctx.fillRect(-radius * 0.44, radius * 0.02, radius * 0.28, 3.5);
    ctx.fillRect(radius * 0.16, radius * 0.02, radius * 0.28, 3.5);

    // Trailing soulfire flame wisps outside eye slit
    const flameWisp = Math.sin(performance.now() * 0.012) * 5;
    ctx.strokeStyle = eyeColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.5, 0);
    ctx.quadraticCurveTo(-radius * 0.75, -radius * 0.15 + flameWisp, -radius * 0.95, -radius * 0.3);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(radius * 0.5, 0);
    ctx.quadraticCurveTo(radius * 0.75, -radius * 0.15 - flameWisp, radius * 0.95, -radius * 0.3);
    ctx.stroke();

    ctx.restore();

    // --- F. GOTHIC RESPIRATORY BEVOR (Vertical Breathing Slits) ---
    ctx.fillStyle = PALETTE.abyss;
    const slitWidth = Math.max(2, radius * 0.035);
    const slitSpacing = radius * 0.09;
    for (let r = -3; r <= 3; r++) {
      const slitHeight = radius * 0.26 - Math.abs(r) * radius * 0.04;
      const slitY = radius * 0.38 + Math.abs(r) * 2;
      ctx.fillRect(r * slitSpacing - slitWidth * 0.5, slitY, slitWidth, slitHeight);

      // Faint interior ember glow inside the grille
      ctx.fillStyle = phase === 1 ? PALETTE.soulCyan : PALETTE.bloodGlow;
      ctx.fillRect(r * slitSpacing - slitWidth * 0.5 + 0.5, slitY + 2, slitWidth - 1, slitHeight - 4);
      ctx.fillStyle = PALETTE.abyss;
    }

    // Heavy chin bezel rivets
    ctx.fillStyle = PALETTE.goldPlate;
    ctx.fillRect(-radius * 0.35, radius * 0.78, 4, 4);
    ctx.fillRect(radius * 0.35 - 4, radius * 0.78, 4, 4);
    ctx.fillRect(-2, radius * 0.95, 4, 4);

    ctx.restore();
  }

  /**
   * Helper: Draws an aggressive curved gothic demon horn spire
   */
  private static drawHornSpire(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    direction: number, // -1 (left), 1 (right)
    scale: number
  ): void {
    ctx.save();
    ctx.fillStyle = PALETTE.ironDark;
    ctx.strokeStyle = PALETTE.abyss;
    ctx.lineWidth = 3;

    // Horn silhouette sweeping outward and upward
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(
      startX + direction * scale * 0.5,
      startY - scale * 0.6,
      startX + direction * scale * 0.7,
      startY - scale * 1.15
    );
    // Tip hook
    ctx.lineTo(startX + direction * scale * 0.65, startY - scale * 1.1);
    ctx.quadraticCurveTo(
      startX + direction * scale * 0.35,
      startY - scale * 0.45,
      startX - direction * scale * 0.15,
      startY - scale * 0.1
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Gold filigree tip on the horn
    ctx.fillStyle = PALETTE.goldHighlight;
    ctx.beginPath();
    ctx.moveTo(startX + direction * scale * 0.58, startY - scale * 0.9);
    ctx.lineTo(startX + direction * scale * 0.7, startY - scale * 1.15);
    ctx.lineTo(startX + direction * scale * 0.5, startY - scale * 0.82);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /**
   * 2. The Fluted Ribcage Cuirass & Infernal Relic Core (Torso)
   * High gothic gorget, anatomical ribbed plates, tarnished gold filigree,
   * glowing Kettlebell infernal relic seal, and expanding occult drive shockwave.
   */
  private static drawDarkGothicCuirass(
    ctx: CanvasRenderingContext2D,
    lS: { x: number; y: number },
    rS: { x: number; y: number },
    lH: { x: number; y: number },
    rH: { x: number; y: number },
    heraldryColor: string,
    phase: number,
    power: number
  ): void {
    ctx.save();

    // Body dimensions
    const chestWidth = Math.hypot(lS.x - rS.x, lS.y - rS.y);
    const chestCenterX = (lS.x + rS.x + lH.x + rH.x) / 4;
    const chestCenterY = (lS.y + rS.y) / 2 + ((lH.y + rH.y) / 2 - (lS.y + rS.y) / 2) * 0.35;
    const waistWidth = Math.hypot(lH.x - rH.x, lH.y - rH.y);

    // --- A. UNDERLAYER CHAINMAIL SHROUD ---
    ctx.fillStyle = PALETTE.mailShadow;
    ctx.strokeStyle = PALETTE.abyss;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lS.x - 14, lS.y);
    ctx.lineTo(rS.x + 14, rS.y);
    ctx.lineTo(rH.x + 16, rH.y + 6);
    ctx.lineTo(lH.x - 16, lH.y + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // --- B. BLACKENED IRON CUIRASS SHELL ---
    const cuirassGrad = ctx.createLinearGradient(lS.x, lS.y, rH.x, rH.y);
    cuirassGrad.addColorStop(0, PALETTE.ironLight);
    cuirassGrad.addColorStop(0.2, PALETTE.ironPlate);
    cuirassGrad.addColorStop(0.55, PALETTE.ironDark);
    cuirassGrad.addColorStop(0.85, PALETTE.ironShadow);
    cuirassGrad.addColorStop(1, PALETTE.abyss);

    ctx.fillStyle = cuirassGrad;
    ctx.lineWidth = 3.5;

    // Segmented Gothic Silhouette
    ctx.beginPath();
    ctx.moveTo(lS.x - 10, lS.y - 8); // High gorget corner
    ctx.lineTo(chestCenterX, (lS.y + rS.y) / 2 - 12); // Neck peak
    ctx.lineTo(rS.x + 10, rS.y - 8);
    ctx.lineTo(rS.x + 14, (lS.y + rS.y) / 2 + 30); // Lat taper
    ctx.lineTo(rH.x + 12, rH.y - 4);
    ctx.lineTo(chestCenterX, (lH.y + rH.y) / 2 + 10); // Waist V-point
    ctx.lineTo(lH.x - 12, lH.y - 4);
    ctx.lineTo(lS.x - 14, (lS.y + rS.y) / 2 + 30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // --- C. ANATOMICAL GOTHIC RIBCAGE FLUTING ---
    const ribTiers = [0.3, 0.48, 0.66, 0.82];
    ribTiers.forEach((ratio, idx) => {
      const leftX = lS.x + (lH.x - lS.x) * ratio;
      const rightX = rS.x + (rH.x - rS.x) * ratio;
      const yVal = (lS.y + rS.y) / 2 + ((lH.y + rH.y) / 2 - (lS.y + rS.y) / 2) * ratio;

      // Dark shadow flute groove
      ctx.strokeStyle = PALETTE.abyss;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(leftX, yVal - 4);
      ctx.lineTo(chestCenterX, yVal + 10);
      ctx.lineTo(rightX, yVal - 4);
      ctx.stroke();

      // Sharp metallic highlight edge along each rib crest
      ctx.strokeStyle = PALETTE.ironHighlight;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(leftX + 4, yVal - 7);
      ctx.lineTo(chestCenterX, yVal + 7);
      ctx.lineTo(rightX - 4, yVal - 7);
      ctx.stroke();

      // Gold filigree rivet studs along the rib junctions
      ctx.fillStyle = PALETTE.goldPlate;
      ctx.fillRect(leftX + 6, yVal - 6, 3.5, 3.5);
      ctx.fillRect(rightX - 9, yVal - 6, 3.5, 3.5);
    });

    // --- D. GOTHIC STERNUM KEEL RIDGE ---
    ctx.strokeStyle = PALETTE.goldPlate;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(chestCenterX, (lS.y + rS.y) / 2 - 8);
    ctx.lineTo(chestCenterX, (lH.y + rH.y) / 2 + 8);
    ctx.stroke();

    // --- E. CENTRAL INFERNAL KETTLEBELL RELIC SEAL ---
    const emblemRadius = Math.max(14, chestWidth * 0.16);

    // Relic Arch Diamond Frame (Tarnished Gold)
    ctx.fillStyle = PALETTE.ironDark;
    ctx.strokeStyle = PALETTE.goldHighlight;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(chestCenterX, chestCenterY - emblemRadius * 1.35);
    ctx.lineTo(chestCenterX + emblemRadius * 1.25, chestCenterY);
    ctx.lineTo(chestCenterX, chestCenterY + emblemRadius * 1.35);
    ctx.lineTo(chestCenterX - emblemRadius * 1.25, chestCenterY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing Inner Occult Chamber
    const coreGlow = phase === 1 ? PALETTE.soulCyan : PALETTE.bloodFlame;
    ctx.save();
    ctx.shadowColor = coreGlow;
    ctx.shadowBlur = phase === 1 ? 24 : 12;

    // Glowing Kettlebell Bell Body
    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.arc(chestCenterX, chestCenterY + emblemRadius * 0.28, emblemRadius * 0.68, 0, Math.PI * 2);
    ctx.fill();

    // Kettlebell Horned Demonic Handle
    ctx.lineWidth = 4;
    ctx.strokeStyle = PALETTE.goldHighlight;
    ctx.beginPath();
    ctx.arc(chestCenterX, chestCenterY - emblemRadius * 0.22, emblemRadius * 0.52, Math.PI * 0.9, Math.PI * 0.1);
    ctx.stroke();

    // Occult Crosshair / Seal Runes inside the Kettlebell Core
    ctx.strokeStyle = PALETTE.abyss;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(chestCenterX - emblemRadius * 0.45, chestCenterY + emblemRadius * 0.28);
    ctx.lineTo(chestCenterX + emblemRadius * 0.45, chestCenterY + emblemRadius * 0.28);
    ctx.moveTo(chestCenterX, chestCenterY - emblemRadius * 0.15);
    ctx.lineTo(chestCenterX, chestCenterY + emblemRadius * 0.7);
    ctx.stroke();

    ctx.restore();

    // --- F. DRIVE PHASE / EXPLOSIVE REP OCCULT SHOCKWAVE ---
    if (phase === 1 || power > 80) {
      const pulseTime = (performance.now() * 0.005) % (Math.PI * 2);
      const ringScale = 1.3 + Math.sin(pulseTime) * 0.25;

      ctx.save();
      ctx.strokeStyle = phase === 1 ? PALETTE.soulCyan : PALETTE.bloodBright;
      ctx.shadowColor = phase === 1 ? PALETTE.soulCyan : PALETTE.bloodBright;
      ctx.shadowBlur = 18;
      ctx.lineWidth = 2.5;

      // Outer Runic Shockwave Ring
      ctx.beginPath();
      ctx.arc(chestCenterX, chestCenterY, emblemRadius * ringScale * 1.6, 0, Math.PI * 2);
      ctx.stroke();

      // Cardinal occult spike teeth radiating outward
      for (let a = 0; a < 8; a++) {
        const rad = (a * Math.PI) / 4 + pulseTime * 0.5;
        const innerR = emblemRadius * ringScale * 1.6;
        const outerR = innerR + 10;
        ctx.beginPath();
        ctx.moveTo(chestCenterX + Math.cos(rad) * innerR, chestCenterY + Math.sin(rad) * innerR);
        ctx.lineTo(chestCenterX + Math.cos(rad) * outerR, chestCenterY + Math.sin(rad) * outerR);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * 3. Spired Dread-Guard Pauldrons (Shoulder Guards)
   * High upward-curving gothic sword-breaker spire, tiered scalloped dragon-plates,
   * antique gold filigree trims, and blood-ruby rivet studs.
   */
  private static drawDarkPlauldron(
    ctx: CanvasRenderingContext2D,
    shoulder: { x: number; y: number },
    elbow: { x: number; y: number },
    size: number,
    side: 'LEFT' | 'RIGHT'
  ): void {
    const angle = Math.atan2(elbow.y - shoulder.y, elbow.x - shoulder.x);
    const isLeft = side === 'LEFT';

    ctx.save();
    ctx.translate(shoulder.x, shoulder.y);
    ctx.rotate(angle);

    // --- A. UPWARD GOTHIC SWORD-BREAKER SPIRE (Garde-Bras) ---
    ctx.fillStyle = PALETTE.ironDark;
    ctx.strokeStyle = PALETTE.abyss;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(0, -size * 0.4);
    // Vicious upward-curving horn blade
    ctx.quadraticCurveTo(size * 0.2, -size * 1.25, size * 0.45, -size * 1.65);
    ctx.lineTo(size * 0.35, -size * 1.55);
    ctx.quadraticCurveTo(size * 0.15, -size * 0.9, -size * 0.25, -size * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Gold filigree edge on blade spire
    ctx.strokeStyle = PALETTE.goldHighlight;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.4);
    ctx.quadraticCurveTo(size * 0.2, -size * 1.25, size * 0.45, -size * 1.65);
    ctx.stroke();

    // --- B. TIERED SCALLOPED PLATES (Dragon-Scale Armor) ---
    const tiers = [
      { offset: -size * 0.1, scale: 1.05, color: PALETTE.ironMid, gold: true },
      { offset: size * 0.25, scale: 0.9, color: PALETTE.ironDark, gold: true },
      { offset: size * 0.55, scale: 0.72, color: PALETTE.ironShadow, gold: false },
    ];

    tiers.forEach(({ offset, scale, color, gold }) => {
      // Plate body
      ctx.fillStyle = color;
      ctx.strokeStyle = PALETTE.abyss;
      ctx.lineWidth = 3;

      ctx.beginPath();
      // Scalloped pointed gothic plate
      ctx.ellipse(offset, 0, size * scale * 0.85, size * scale * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Gold filigree rim on top tiers
      if (gold) {
        ctx.strokeStyle = PALETTE.goldPlate;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(offset + size * scale * 0.3, 0, size * scale * 0.48, -Math.PI * 0.5, Math.PI * 0.5);
        ctx.stroke();
      }

      // Blood-ruby rivet stud
      ctx.fillStyle = PALETTE.bloodBright;
      ctx.beginPath();
      ctx.arc(offset + size * scale * 0.45, 0, Math.max(2.5, size * 0.08), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.goldDeep;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    ctx.restore();
  }

  /**
   * 4. Bladed Couters & Vambraces (Elbow & Forearm Armor)
   * Pointed diamond elbow couter with rear thorn spike, outer parrying blade fin,
   * clawed gauntlets, and pulsating knuckle power gems.
   */
  private static drawDarkVambrace(
    ctx: CanvasRenderingContext2D,
    elbow: { x: number; y: number },
    wrist: { x: number; y: number },
    thickness: number,
    power: number,
    phase: number
  ): void {
    const angle = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x);
    const length = Math.hypot(wrist.x - elbow.x, wrist.y - elbow.y);

    ctx.save();
    ctx.translate(elbow.x, elbow.y);
    ctx.rotate(angle);

    // --- A. GOTHIC POINTED ELBOW COUTER (Thorn Spike) ---
    ctx.fillStyle = PALETTE.ironDark;
    ctx.strokeStyle = PALETTE.abyss;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(-thickness * 0.6, -thickness * 0.5);
    ctx.lineTo(-thickness * 1.4, 0); // Pointed thorn spike pointing back
    ctx.lineTo(-thickness * 0.6, thickness * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // --- B. VAMBRACE SHAFT & OUTER PARRYING BLADE FIN ---
    const vambraceGrad = ctx.createLinearGradient(0, -thickness, 0, thickness);
    vambraceGrad.addColorStop(0, PALETTE.ironLight);
    vambraceGrad.addColorStop(0.3, PALETTE.ironPlate);
    vambraceGrad.addColorStop(0.7, PALETTE.ironDark);
    vambraceGrad.addColorStop(1, PALETTE.abyss);

    ctx.fillStyle = vambraceGrad;
    ctx.strokeStyle = PALETTE.abyss;
    ctx.lineWidth = 3;

    // Outer fluted blade fin profile
    ctx.beginPath();
    ctx.moveTo(0, -thickness * 0.5);
    ctx.lineTo(length * 0.45, -thickness * 0.9); // Raised blade crest
    ctx.lineTo(length * 0.8, -thickness * 0.6);
    ctx.lineTo(length * 0.82, thickness * 0.6);
    ctx.lineTo(0, thickness * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Metallic highlight line along the parrying fin
    ctx.strokeStyle = PALETTE.ironHighlight;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(length * 0.1, -thickness * 0.5);
    ctx.lineTo(length * 0.45, -thickness * 0.85);
    ctx.lineTo(length * 0.75, -thickness * 0.58);
    ctx.stroke();

    // --- C. TARNISHED GOLD WRIST CUFF ---
    ctx.fillStyle = PALETTE.goldPlate;
    ctx.strokeStyle = PALETTE.abyss;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(length * 0.76, -thickness * 0.7, length * 0.26, thickness * 1.4, [thickness * 0.2]);
    ctx.fill();
    ctx.stroke();

    // --- D. CLAWED GAUNTLET FINGERS ---
    ctx.fillStyle = PALETTE.ironDark;
    ctx.strokeStyle = PALETTE.abyss;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(length * 0.98, -thickness * 0.5);
    ctx.lineTo(length * 1.25, -thickness * 0.2); // Pointed claw tip
    ctx.lineTo(length * 1.25, thickness * 0.2);
    ctx.lineTo(length * 0.98, thickness * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Gold Claw Tips
    ctx.fillStyle = PALETTE.goldHighlight;
    ctx.beginPath();
    ctx.moveTo(length * 1.15, -thickness * 0.15);
    ctx.lineTo(length * 1.25, -thickness * 0.2);
    ctx.lineTo(length * 1.25, thickness * 0.2);
    ctx.lineTo(length * 1.15, thickness * 0.15);
    ctx.closePath();
    ctx.fill();

    // --- E. PULSING RUNIC POWER GEM ON KNUCKLES ---
    const gemColor = phase === 1 ? PALETTE.soulCyan : power > 80 ? PALETTE.bloodFlame : PALETTE.goldHighlight;
    ctx.save();
    ctx.fillStyle = gemColor;
    ctx.shadowColor = gemColor;
    ctx.shadowBlur = power > 70 ? 14 : 6;
    ctx.beginPath();
    ctx.arc(length * 0.9, 0, Math.max(3.5, thickness * 0.32), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.goldGlint;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  /**
   * 5. The Abyssal War Belt & Fluted Tassets (Hips & Thighs)
   * Ornate tarnished gold belt with horned kettlebell buckle, hanging maille skirt,
   * and dual pointed gothic tasset plates guarding the thighs.
   */
  private static drawDarkFauldsAndTassets(
    ctx: CanvasRenderingContext2D,
    lH: { x: number; y: number },
    rH: { x: number; y: number },
    width: number
  ): void {
    ctx.save();

    const hipCenterX = (lH.x + rH.x) / 2;
    const hipCenterY = (lH.y + rH.y) / 2;
    const beltAngle = Math.atan2(rH.y - lH.y, rH.x - lH.x);
    const beltWidth = Math.hypot(rH.x - lH.x, rH.y - lH.y) * 1.15;

    ctx.translate(hipCenterX, hipCenterY);
    ctx.rotate(beltAngle);

    // --- A. CHAINMAIL FRINGE UNDERLAY ---
    ctx.fillStyle = PALETTE.mailShadow;
    ctx.strokeStyle = PALETTE.abyss;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(-beltWidth * 0.5, 4);
    ctx.lineTo(beltWidth * 0.5, 4);
    ctx.lineTo(beltWidth * 0.42, width * 0.4);
    ctx.lineTo(-beltWidth * 0.42, width * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // --- B. GILDED WAR BELT ---
    ctx.fillStyle = PALETTE.goldMid;
    ctx.strokeStyle = PALETTE.abyss;
    ctx.lineWidth = 3;
    ctx.fillRect(-beltWidth * 0.5, -10, beltWidth, 20);
    ctx.strokeRect(-beltWidth * 0.5, -10, beltWidth, 20);

    // Gold belt studs
    ctx.fillStyle = PALETTE.goldHighlight;
    for (let i = -4; i <= 4; i++) {
      if (Math.abs(i) <= 1) continue; // Leave center for buckle
      ctx.fillRect(i * (beltWidth * 0.1) - 2.5, -2.5, 5, 5);
    }

    // Center Horned Kettlebell Buckle
    ctx.fillStyle = PALETTE.ironDark;
    ctx.strokeStyle = PALETTE.goldHighlight;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Glowing skull / ruby eye in center of buckle
    ctx.fillStyle = PALETTE.bloodBright;
    ctx.fillRect(-3, -2, 2.5, 2.5);
    ctx.fillRect(1, -2, 2.5, 2.5);

    // --- C. DUAL POINTED GOTHIC TASSETS ---
    const drawSingleTasset = (direction: number) => {
      ctx.save();
      const xStart = direction * beltWidth * 0.12;
      const xEnd = direction * beltWidth * 0.44;
      const xTip = direction * beltWidth * 0.28;
      const tassetLen = width * 0.85;

      ctx.fillStyle = PALETTE.ironDark;
      ctx.strokeStyle = PALETTE.abyss;
      ctx.lineWidth = 3;

      // Scalloped pointed gothic tasset polygon
      ctx.beginPath();
      ctx.moveTo(xStart, 10);
      ctx.lineTo(xEnd, 10);
      ctx.lineTo(xEnd - direction * 6, tassetLen * 0.65);
      ctx.lineTo(xTip, tassetLen); // Menacing bottom dagger tip
      ctx.lineTo(xStart + direction * 4, tassetLen * 0.65);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Central reinforcing spine ridge
      ctx.strokeStyle = PALETTE.goldPlate;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(xTip, 10);
      ctx.lineTo(xTip, tassetLen);
      ctx.stroke();

      // Gold stud accents
      ctx.fillStyle = PALETTE.goldGlint;
      ctx.fillRect(xTip - 2, tassetLen * 0.45 - 2, 4, 4);
      ctx.fillRect(xTip - 2, tassetLen * 0.75 - 2, 4, 4);

      ctx.restore();
    };

    drawSingleTasset(-1); // Left Tasset
    drawSingleTasset(1); // Right Tasset

    ctx.restore();
  }

  /**
   * 6. Demon-Thorn Poleyns (Armored Knee Cops)
   * Spiked gothic diamond knee cop with sharp central thorn horn and gold studs.
   */
  private static drawDarkPoleyn(
    ctx: CanvasRenderingContext2D,
    knee: { x: number; y: number },
    size: number
  ): void {
    ctx.save();
    ctx.translate(knee.x, knee.y);

    // Multi-layered diamond steel knee cop
    ctx.fillStyle = PALETTE.ironDark;
    ctx.strokeStyle = PALETTE.abyss;
    ctx.lineWidth = 3;

    // Outer Scalloped Diamond
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.75);
    ctx.lineTo(size * 0.75, 0);
    ctx.lineTo(0, size * 0.85); // Menacing downward thorn
    ctx.lineTo(-size * 0.75, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Central Protruding Thorn Spike
    ctx.fillStyle = PALETTE.ironLight;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.35);
    ctx.lineTo(size * 0.35, 0);
    ctx.lineTo(0, size * 0.45);
    ctx.lineTo(-size * 0.35, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Blood-ruby center gem
    ctx.fillStyle = PALETTE.bloodBright;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(3, size * 0.16), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.goldPlate;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 7. Fluted Gothic Greaves (Shin & Ankle Plates)
   * Contoured blackened steel greaves with sharp vertical keel lines and gold filigree ankles.
   */
  private static drawDarkGreaves(
    ctx: CanvasRenderingContext2D,
    knee: { x: number; y: number },
    ankle: { x: number; y: number },
    thickness: number
  ): void {
    const angle = Math.atan2(ankle.y - knee.y, ankle.x - knee.x);
    const length = Math.hypot(ankle.x - knee.x, ankle.y - knee.y);

    ctx.save();
    ctx.translate(knee.x, knee.y);
    ctx.rotate(angle);

    const greaveGrad = ctx.createLinearGradient(0, -thickness, 0, thickness);
    greaveGrad.addColorStop(0, PALETTE.ironLight);
    greaveGrad.addColorStop(0.3, PALETTE.ironPlate);
    greaveGrad.addColorStop(0.7, PALETTE.ironDark);
    greaveGrad.addColorStop(1, PALETTE.abyss);

    ctx.fillStyle = greaveGrad;
    ctx.strokeStyle = PALETTE.abyss;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.roundRect(length * 0.16, -thickness * 0.5, length * 0.72, thickness, [thickness * 0.25]);
    ctx.fill();
    ctx.stroke();

    // Sharp central shin ridge
    ctx.strokeStyle = PALETTE.ironHighlight;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(length * 0.2, 0);
    ctx.lineTo(length * 0.82, 0);
    ctx.stroke();

    // Gilded Ankle Band with heel spur
    ctx.fillStyle = PALETTE.goldPlate;
    ctx.strokeStyle = PALETTE.abyss;
    ctx.lineWidth = 2;
    ctx.fillRect(length * 0.8, -thickness * 0.55, length * 0.1, thickness * 1.1);
    ctx.strokeRect(length * 0.8, -thickness * 0.55, length * 0.1, thickness * 1.1);

    ctx.restore();
  }

  /**
   * 8. Cursed Blood Lightning & Dark Energy Arcs
   * Jagged dark-red and gold electric arcs surging around the gauntlets during high-velocity reps.
   */
  private static drawCursedLightning(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    power: number,
    phase: number
  ): void {
    ctx.save();
    const isSpectral = phase === 1;
    const lightningColor = isSpectral ? PALETTE.soulCyan : PALETTE.bloodBright;
    const lightningCore = isSpectral ? '#FFFFFF' : PALETTE.goldGlint;

    ctx.strokeStyle = lightningColor;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = lightningColor;
    ctx.shadowBlur = 14;

    const numBolts = 5;
    const time = performance.now() * 0.012;

    for (let i = 0; i < numBolts; i++) {
      const angle = (i * Math.PI * 2) / numBolts + time;
      const reach = 22 + (i % 3) * 14 + (power * 0.15);
      const xMid = x + Math.cos(angle + 0.3) * (reach * 0.55);
      const yMid = y + Math.sin(angle + 0.3) * (reach * 0.55) + ((i % 2 === 0 ? 6 : -6));
      const xEnd = x + Math.cos(angle) * reach;
      const yEnd = y + Math.sin(angle) * reach;

      // Outer colored aura bolt
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(xMid, yMid);
      ctx.lineTo(xEnd, yEnd);
      ctx.stroke();

      // Inner superheated core bolt
      ctx.strokeStyle = lightningCore;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.strokeStyle = lightningColor;
      ctx.lineWidth = 2.5;
    }

    ctx.restore();
  }
}
