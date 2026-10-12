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
 * 32-Bit Retro Knight Armor Augmented Reality Renderer.
 * Projects stylized medieval plate armor directly onto MediaPipe Pose landmarks in real-time.
 */
export class KnightArmorRenderer {
  /**
   * Main render call: draws full knight armor overlay on canvas context
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
      heraldryColor = '#F4B41A',
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

    // 1. DRAW CUIRASS & BREASTPLATE (TORSO)
    if (showChestplate && pLHip && pRHip) {
      this.drawCuirass(ctx, pLShoulder, pRShoulder, pLHip, pRHip, heraldryColor, activePhase);
    }

    // 2. DRAW PAULDRONS (SHOULDER PLATES)
    if (showPauldrons) {
      if (pLElbow) this.drawPlauldron(ctx, pLShoulder, pLElbow, shoulderWidth * 0.28, 'LEFT');
      if (pRElbow) this.drawPlauldron(ctx, pRShoulder, pRElbow, shoulderWidth * 0.28, 'RIGHT');
    }

    // 3. DRAW VAMBRACES & GAUNTLETS (ARMS)
    if (showGauntlets) {
      if (pLElbow && pLWrist) this.drawVambrace(ctx, pLElbow, pLWrist, shoulderWidth * 0.16, glowPower);
      if (pRElbow && pRWrist) this.drawVambrace(ctx, pRElbow, pRWrist, shoulderWidth * 0.16, glowPower);
    }

    // 4. DRAW FAULDS, TASSETS & GREAVES (LEGS)
    if (showLegArmor && pLHip && pRHip) {
      this.drawFauldsAndTassets(ctx, pLHip, pRHip, shoulderWidth * 0.35);

      if (pLKnee) this.drawPoleyn(ctx, pLKnee, shoulderWidth * 0.18);
      if (pRKnee) this.drawPoleyn(ctx, pRKnee, shoulderWidth * 0.18);

      if (pLKnee && pLAnkle) this.drawGreaves(ctx, pLKnee, pLAnkle, shoulderWidth * 0.15);
      if (pRKnee && pRAnkle) this.drawGreaves(ctx, pRKnee, pRAnkle, shoulderWidth * 0.15);
    }

    // 5. DRAW GREAT HELM & VISOR (HEAD)
    if (showHelmet && pNose) {
      this.drawGreatHelm(ctx, pNose, chestCenter, shoulderWidth * 0.42, activePhase);
    }

    // 6. DRAW GAUNTLET POWER SPARKS (When attacking / high power)
    if (glowPower > 80 || activePhase === 1) {
      if (pLWrist) this.drawPowerSparks(ctx, pLWrist.x, pLWrist.y, glowPower);
      if (pRWrist) this.drawPowerSparks(ctx, pRWrist.x, pRWrist.y, glowPower);
    }

    ctx.restore();
  }

  /**
   * 1. Great Helm & Glowing Visor
   */
  private static drawGreatHelm(
    ctx: CanvasRenderingContext2D,
    nose: { x: number; y: number },
    chestCenter: { x: number; y: number },
    helmRadius: number,
    phase: number
  ): void {
    const headAngle = Math.atan2(nose.x - chestCenter.x, chestCenter.y - nose.y) * 0.35;
    const helmCenter = { x: nose.x, y: nose.y - helmRadius * 0.2 };

    ctx.save();
    ctx.translate(helmCenter.x, helmCenter.y);
    ctx.rotate(headAngle);

    // Golden Knight Crest / Plume on top
    ctx.fillStyle = '#F4B41A';
    ctx.beginPath();
    ctx.moveTo(-helmRadius * 0.25, -helmRadius * 0.85);
    ctx.lineTo(0, -helmRadius * 1.35);
    ctx.lineTo(helmRadius * 0.25, -helmRadius * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0F0E17';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Steel Helm Dome (Base)
    const gradient = ctx.createLinearGradient(-helmRadius, -helmRadius, helmRadius, helmRadius);
    gradient.addColorStop(0, '#7D82A8');
    gradient.addColorStop(0.3, '#A5A9C9');
    gradient.addColorStop(0.7, '#4A4E69');
    gradient.addColorStop(1, '#2E3047');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    // Rounded barrel helm top, tapering to chin
    ctx.roundRect(-helmRadius * 0.75, -helmRadius * 0.85, helmRadius * 1.5, helmRadius * 1.7, [
      helmRadius * 0.5,
      helmRadius * 0.5,
      helmRadius * 0.3,
      helmRadius * 0.3,
    ]);
    ctx.fill();
    ctx.stroke();

    // Golden Brow Trim Band
    ctx.fillStyle = '#F4B41A';
    ctx.fillRect(-helmRadius * 0.72, -helmRadius * 0.25, helmRadius * 1.44, helmRadius * 0.16);
    ctx.strokeRect(-helmRadius * 0.72, -helmRadius * 0.25, helmRadius * 1.44, helmRadius * 0.16);

    // Glowing Knight Visor Eye Slit
    const visorColor = phase === 1 ? '#FF3366' : '#38B6FF';
    ctx.fillStyle = '#0F0E17';
    ctx.fillRect(-helmRadius * 0.55, -helmRadius * 0.05, helmRadius * 1.1, helmRadius * 0.22);

    // Neon glowing eye slit inside visor
    ctx.fillStyle = visorColor;
    ctx.shadowColor = visorColor;
    ctx.shadowBlur = phase === 1 ? 16 : 8;
    ctx.fillRect(-helmRadius * 0.45, -helmRadius * 0.01, helmRadius * 0.38, helmRadius * 0.12);
    ctx.fillRect(helmRadius * 0.07, -helmRadius * 0.01, helmRadius * 0.38, helmRadius * 0.12);
    ctx.shadowBlur = 0;

    // Medieval Breathing Perforations / Cross Grille on lower faceplate
    ctx.fillStyle = '#222336';
    const holeRadius = Math.max(1.5, helmRadius * 0.04);
    for (let r = 0; r < 3; r++) {
      for (let c = -2; c <= 2; c++) {
        if (Math.abs(c) === 0 && r === 0) continue;
        ctx.beginPath();
        ctx.arc(c * helmRadius * 0.18, helmRadius * 0.35 + r * helmRadius * 0.14, holeRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * 2. Steel Cuirass & Heraldic Breastplate
   */
  private static drawCuirass(
    ctx: CanvasRenderingContext2D,
    lS: { x: number; y: number },
    rS: { x: number; y: number },
    lH: { x: number; y: number },
    rH: { x: number; y: number },
    heraldryColor: string,
    phase: number
  ): void {
    ctx.save();

    // Metallic Steel Gradient
    const gradient = ctx.createLinearGradient(lS.x, lS.y, rH.x, rH.y);
    gradient.addColorStop(0, '#7D82A8');
    gradient.addColorStop(0.2, '#9BA0C5');
    gradient.addColorStop(0.5, '#565A7A');
    gradient.addColorStop(0.8, '#3A3C53');
    gradient.addColorStop(1, '#242533');

    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#0F0E17';
    ctx.lineWidth = 3.5;

    // Segmented Cuirass Polygon
    ctx.beginPath();
    ctx.moveTo(lS.x - 8, lS.y - 4);
    ctx.lineTo(rS.x + 8, rS.y - 4);
    ctx.lineTo(rH.x + 10, rH.y);
    ctx.lineTo(lH.x - 10, lH.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Segmented Abdominal Plate Fluting
    const midChestY = (lS.y + rS.y) / 2 + ((lH.y + rH.y) / 2 - (lS.y + rS.y) / 2) * 0.45;
    ctx.strokeStyle = '#222336';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(lS.x + (lH.x - lS.x) * 0.45, midChestY);
    ctx.lineTo(rS.x + (rH.x - rS.x) * 0.45, midChestY);
    ctx.stroke();

    const lowerChestY = (lS.y + rS.y) / 2 + ((lH.y + rH.y) / 2 - (lS.y + rS.y) / 2) * 0.72;
    ctx.beginPath();
    ctx.moveTo(lS.x + (lH.x - lS.x) * 0.72, lowerChestY);
    ctx.lineTo(rS.x + (rH.x - rS.x) * 0.72, lowerChestY);
    ctx.stroke();

    // Golden Knight Emblem in Center (Golden Kettlebell Crest)
    const chestCenterX = (lS.x + rS.x + lH.x + rH.x) / 4;
    const chestCenterY = (lS.y + rS.y) / 2 + ((lH.y + rH.y) / 2 - (lS.y + rS.y) / 2) * 0.32;
    const emblemSize = Math.max(8, Math.hypot(lS.x - rS.x, lS.y - rS.y) * 0.14);

    ctx.fillStyle = heraldryColor;
    ctx.strokeStyle = '#0F0E17';
    ctx.lineWidth = 2;

    // Emblem Bell Body
    ctx.beginPath();
    ctx.arc(chestCenterX, chestCenterY + emblemSize * 0.3, emblemSize * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Emblem Bell Handle
    ctx.lineWidth = 3;
    ctx.strokeStyle = heraldryColor;
    ctx.beginPath();
    ctx.arc(chestCenterX, chestCenterY - emblemSize * 0.15, emblemSize * 0.45, Math.PI, 0);
    ctx.stroke();

    // Phase 1 (Drive) Chest Shockwave Aura
    if (phase === 1) {
      ctx.strokeStyle = '#F4B41A';
      ctx.shadowColor = '#F4B41A';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(chestCenterX, chestCenterY, emblemSize * 1.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  /**
   * 3. Pauldrons (Layered Shoulder Guards)
   */
  private static drawPlauldron(
    ctx: CanvasRenderingContext2D,
    shoulder: { x: number; y: number },
    elbow: { x: number; y: number },
    size: number,
    side: 'LEFT' | 'RIGHT'
  ): void {
    const angle = Math.atan2(elbow.y - shoulder.y, elbow.x - shoulder.x);

    ctx.save();
    ctx.translate(shoulder.x, shoulder.y);
    ctx.rotate(angle);

    // Multi-tiered layered steel plates
    const layers = [
      { offset: 0, scale: 1.0, color: '#7D82A8' },
      { offset: size * 0.28, scale: 0.85, color: '#5C6079' },
      { offset: size * 0.52, scale: 0.7, color: '#3E405B' },
    ];

    layers.forEach(({ offset, scale, color }) => {
      ctx.fillStyle = color;
      ctx.strokeStyle = '#0F0E17';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.ellipse(offset, 0, size * scale * 0.8, size * scale * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Gold stud / rivet on each tier
      ctx.fillStyle = '#F4B41A';
      ctx.beginPath();
      ctx.arc(offset + size * scale * 0.4, 0, Math.max(2, size * 0.08), 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  /**
   * 4. Vambraces & Gauntlets (Arm Bracers & Hands)
   */
  private static drawVambrace(
    ctx: CanvasRenderingContext2D,
    elbow: { x: number; y: number },
    wrist: { x: number; y: number },
    thickness: number,
    power: number
  ): void {
    const angle = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x);
    const length = Math.hypot(wrist.x - elbow.x, wrist.y - elbow.y);

    ctx.save();
    ctx.translate(elbow.x, elbow.y);
    ctx.rotate(angle);

    // Steel Vambrace Shaft
    const gradient = ctx.createLinearGradient(0, -thickness, 0, thickness);
    gradient.addColorStop(0, '#9BA0C5');
    gradient.addColorStop(0.5, '#565A7A');
    gradient.addColorStop(1, '#2E3047');

    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#0F0E17';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.roundRect(0, -thickness * 0.5, length * 0.82, thickness, [thickness * 0.3]);
    ctx.fill();
    ctx.stroke();

    // Golden Gauntlet Guard at the Wrist
    ctx.fillStyle = '#F4B41A';
    ctx.beginPath();
    ctx.roundRect(length * 0.78, -thickness * 0.65, length * 0.28, thickness * 1.3, [thickness * 0.2]);
    ctx.fill();
    ctx.stroke();

    // Glowing Power Knuckle Gem
    ctx.fillStyle = power > 90 ? '#38B6FF' : '#FF3366';
    ctx.beginPath();
    ctx.arc(length * 0.95, 0, Math.max(3, thickness * 0.28), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * 5. Faulds & Tassets (Armored Belt & Thigh Tasset Plates)
   */
  private static drawFauldsAndTassets(
    ctx: CanvasRenderingContext2D,
    lH: { x: number; y: number },
    rH: { x: number; y: number },
    width: number
  ): void {
    ctx.save();

    // Knight's Gilded War Belt
    const hipCenterX = (lH.x + rH.x) / 2;
    const hipCenterY = (lH.y + rH.y) / 2;
    const beltAngle = Math.atan2(rH.y - lH.y, rH.x - lH.x);

    ctx.translate(hipCenterX, hipCenterY);
    ctx.rotate(beltAngle);

    ctx.fillStyle = '#F4B41A';
    ctx.strokeStyle = '#0F0E17';
    ctx.lineWidth = 2.5;

    const beltWidth = Math.hypot(rH.x - lH.x, rH.y - lH.y) * 1.1;
    ctx.fillRect(-beltWidth * 0.5, -8, beltWidth, 16);
    ctx.strokeRect(-beltWidth * 0.5, -8, beltWidth, 16);

    // Left and Right Hanging Tasset Plates
    ctx.fillStyle = '#5C6079';
    // Left Tasset
    ctx.beginPath();
    ctx.moveTo(-beltWidth * 0.4, 8);
    ctx.lineTo(-beltWidth * 0.1, 8);
    ctx.lineTo(-beltWidth * 0.15, width * 0.65);
    ctx.lineTo(-beltWidth * 0.35, width * 0.65);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Tasset
    ctx.beginPath();
    ctx.moveTo(beltWidth * 0.1, 8);
    ctx.lineTo(beltWidth * 0.4, 8);
    ctx.lineTo(beltWidth * 0.35, width * 0.65);
    ctx.lineTo(beltWidth * 0.15, width * 0.65);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 6. Poleyns (Armored Knee Cops)
   */
  private static drawPoleyn(
    ctx: CanvasRenderingContext2D,
    knee: { x: number; y: number },
    size: number
  ): void {
    ctx.save();
    ctx.translate(knee.x, knee.y);

    // Pointed Steel Diamond Knee Cop
    ctx.fillStyle = '#7D82A8';
    ctx.strokeStyle = '#0F0E17';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(0, -size * 0.65);
    ctx.lineTo(size * 0.65, 0);
    ctx.lineTo(0, size * 0.65);
    ctx.lineTo(-size * 0.65, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Golden Center Stud
    ctx.fillStyle = '#F4B41A';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * 7. Greaves (Lower Shin Armor)
   */
  private static drawGreaves(
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

    ctx.fillStyle = '#4A4E69';
    ctx.strokeStyle = '#0F0E17';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.roundRect(length * 0.15, -thickness * 0.45, length * 0.72, thickness * 0.9, [thickness * 0.2]);
    ctx.fill();
    ctx.stroke();

    // Central Shin Ridge
    ctx.strokeStyle = '#7D82A8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(length * 0.2, 0);
    ctx.lineTo(length * 0.8, 0);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 8. Lightning & Power Sparks on Gauntlets
   */
  private static drawPowerSparks(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    power: number
  ): void {
    ctx.save();
    ctx.strokeStyle = power > 100 ? '#F4B41A' : '#38B6FF';
    ctx.lineWidth = 2;
    ctx.shadowColor = power > 100 ? '#F4B41A' : '#38B6FF';
    ctx.shadowBlur = 10;

    const numSparks = 4;
    const time = performance.now() * 0.008;

    for (let i = 0; i < numSparks; i++) {
      const angle = (i * Math.PI * 2) / numSparks + time;
      const sparkRadius = 16 + (i % 2) * 12;
      const xEnd = x + Math.cos(angle) * sparkRadius;
      const yEnd = y + Math.sin(angle) * sparkRadius;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * (sparkRadius * 0.5), y + Math.sin(angle) * (sparkRadius * 0.5) + (i % 2 ? 4 : -4));
      ctx.lineTo(xEnd, yEnd);
      ctx.stroke();
    }

    ctx.restore();
  }
}
