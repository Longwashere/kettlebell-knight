import { NormalizedLandmark, POSE_INDEX } from './KinematicTracker';

export interface KnightArmorRenderOptions {
  glowPower?: number; // 0 - 150 (drives aura and weapon sparks)
  activePhase?: number; // 0 (Hike/Prep), 1 (Drive), 2 (Lockout)
  showHelmet?: boolean;
  showChestplate?: boolean;
  showPauldrons?: boolean;
  showGauntlets?: boolean;
  showLegArmor?: boolean;
  showWeapons?: boolean; // defaults to true (Buster Sword & Kettlebell Shield)
  heraldryColor?: string;
  requireFullBody?: boolean; // defaults to true: gatekeeps armor until shoulders, hips, hands, and knees are visible
}

/**
 * Pixel-Perfect Palette matched directly from the 32-bit Kettlebell Knight reference artwork:
 * Heavy Cast-Iron Slate Blue, Weathered Metal Highlights, and Fiery Molten T-Visor Glow.
 */
const KB_PALETTE = {
  // Heavy Cast-Iron Steel
  outline: '#13141C',
  ironDarkest: '#1C1F2B',
  ironShadow: '#282E40',
  ironMid: '#3C445C',
  ironPlate: '#525E7E',
  ironLight: '#7584A6',
  ironHighlight: '#A0B0D1',
  ironGlint: '#D4E0F4',

  // Molten Forge Visor Glow
  visorDark: '#8A1500',
  visorRed: '#C92A00',
  visorOrange: '#FF5900',
  visorAmber: '#FFA71A',
  visorCore: '#FFF4A3',

  // Stamped Weight & Scratch Marks
  stampDark: '#161924',
  stampBevel: '#8291B3',
};

/**
 * 32-Bit Kettlebell Knight Augmented Reality Renderer.
 * Projects the iconic Kettlebell Juggernaut directly onto MediaPipe Pose landmarks:
 * - Giant cast-iron overhead arch handle sweeping over the shoulders and head
 * - Cylindrical barrel helmet with mini kettlebell loop and glowing fiery T-visor
 * - Spherical cast-iron pauldrons stamped with "24kg" and "32kg" weight badges
 * - Massive round spherical kettlebell breastplate with center reinforcement disc & battle scratches
 * - Heavy Kettlebell Heater Shield and Kettlebell-Hilt Buster Greatsword
 * - Chunky spherical knee cops and cast-iron greaves
 */
export class KnightArmorRenderer {
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
      showWeapons = true,
      requireFullBody = true,
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

    // Body Visibility Gatekeeper:
    // Only materialize the Kettlebell Knight armor when the user's body down to the knees is fully visible in frame.
    const isPointValid = (p?: NormalizedLandmark, minVis = 0.40): boolean => {
      if (!p) return false;
      const vis = p.visibility !== undefined ? p.visibility : 1.0;
      const inBounds = p.x >= 0.01 && p.x <= 0.99 && p.y >= 0.01 && p.y <= 0.99;
      return vis >= minVis && inBounds;
    };

    const shouldersVisible = isPointValid(lShoulder, 0.45) && isPointValid(rShoulder, 0.45);
    const hipsVisible = isPointValid(lHip, 0.40) && isPointValid(rHip, 0.40);
    const wristsVisible = isPointValid(lWrist, 0.38) || isPointValid(rWrist, 0.38);
    const kneesVisible = isPointValid(lKnee, 0.38) && isPointValid(rKnee, 0.38);

    const isBodyFullyVisible = shouldersVisible && hipsVisible && wristsVisible && kneesVisible;

    if (requireFullBody && !isBodyFullyVisible) {
      ctx.restore();
      return;
    }

    const isVisible = (p?: NormalizedLandmark, minVis = 0.35) =>
      p && (p.visibility ?? 1) >= minVis;

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

    // 1. GIANT OVERHEAD KETTLEBELL ARCH HANDLE (Drawn in background behind head/body)
    this.drawOverheadKettlebellHandle(ctx, pLShoulder, pRShoulder, pNose, shoulderWidth);

    // 2. ROUND SPHERICAL KETTLEBELL CUIRASS (Belly & Chest)
    if (showChestplate && pLHip && pRHip) {
      this.drawKettlebellCuirass(ctx, pLShoulder, pRShoulder, pLHip, pRHip, activePhase, glowPower);
    }

    // 3. SPHERICAL KETTLEBELL PAULDRONS ("24kg" & "32kg" stamped spheres)
    if (showPauldrons) {
      const pauldronRadius = shoulderWidth * 0.32;
      // Left on screen (user's right shoulder): 24kg
      this.drawKettlebellPauldron(ctx, pLShoulder, pLElbow, pauldronRadius, '24kg', 'LEFT');
      // Right on screen (user's left shoulder): 32kg
      this.drawKettlebellPauldron(ctx, pRShoulder, pRElbow, pauldronRadius, '32kg', 'RIGHT');
    }

    // 4. VAMBRACES & WEAPONS (Buster Sword in right hand, Heater Shield on left arm)
    if (showGauntlets) {
      if (pLElbow && pLWrist) {
        this.drawIronVambrace(ctx, pLElbow, pLWrist, shoulderWidth * 0.16);
        if (showWeapons) {
          // Mount Buster Greatsword on screen-left hand
          this.drawKettlebellBusterSword(ctx, pLElbow, pLWrist, shoulderWidth * 0.45, glowPower, activePhase);
        }
      }
      if (pRElbow && pRWrist) {
        this.drawIronVambrace(ctx, pRElbow, pRWrist, shoulderWidth * 0.16);
        if (showWeapons) {
          // Mount Kettlebell Heater Shield on screen-right forearm
          this.drawKettlebellShield(ctx, pRElbow, pRWrist, shoulderWidth * 0.48, activePhase);
        }
      }
    }

    // 5. LEGS: CHUNKY KNEE COPS & GREAVES
    if (showLegArmor) {
      const kneeSize = shoulderWidth * 0.18;
      if (pLKnee) this.drawKettlebellPoleyn(ctx, pLKnee, kneeSize);
      if (pRKnee) this.drawKettlebellPoleyn(ctx, pRKnee, kneeSize);

      if (pLKnee && pLAnkle) this.drawKettlebellGreave(ctx, pLKnee, pLAnkle, shoulderWidth * 0.16);
      if (pRKnee && pRAnkle) this.drawKettlebellGreave(ctx, pRKnee, pRAnkle, shoulderWidth * 0.16);
    }

    // 6. HELMET & GLOWING T-VISOR (Drawn in front of the handle)
    if (showHelmet && pNose) {
      this.drawKettlebellHelmet(ctx, pNose, chestCenter, shoulderWidth * 0.4, activePhase, glowPower);
    }

    // 7. ATMOSPHERIC FORGE EMBERS (Rising from the T-Visor and Greatsword)
    if (glowPower > 60 || activePhase === 1) {
      if (pNose) this.drawForgeEmbers(ctx, pNose.x, pNose.y, shoulderWidth * 0.5, activePhase);
    }

    ctx.restore();
  }

  /**
   * 1. Giant Overhead Cast-Iron Kettlebell Arch Handle
   * Loops high above the head from behind the left shoulder to behind the right shoulder.
   */
  private static drawOverheadKettlebellHandle(
    ctx: CanvasRenderingContext2D,
    lS: { x: number; y: number },
    rS: { x: number; y: number },
    nose: { x: number; y: number } | null,
    shoulderWidth: number
  ): void {
    const chestCenterX = (lS.x + rS.x) / 2;
    const chestCenterY = (lS.y + rS.y) / 2;
    const headTopY = nose ? nose.y - shoulderWidth * 0.35 : chestCenterY - shoulderWidth * 0.7;
    const archApexY = headTopY - shoulderWidth * 0.38;
    const archWidth = shoulderWidth * 0.85;
    const tubeThickness = Math.max(14, shoulderWidth * 0.14);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Path for the big kettlebell arch handle
    const createArchPath = (yOffset = 0) => {
      ctx.beginPath();
      ctx.moveTo(chestCenterX - archWidth * 0.5, lS.y + 10 + yOffset);
      ctx.bezierCurveTo(
        chestCenterX - archWidth * 0.58,
        archApexY + yOffset,
        chestCenterX + archWidth * 0.58,
        archApexY + yOffset,
        chestCenterX + archWidth * 0.5,
        rS.y + 10 + yOffset
      );
    };

    // Black outer outline
    ctx.strokeStyle = KB_PALETTE.outline;
    ctx.lineWidth = tubeThickness + 10;
    createArchPath();
    ctx.stroke();

    // Dark shadow tube base
    ctx.strokeStyle = KB_PALETTE.ironShadow;
    ctx.lineWidth = tubeThickness + 4;
    createArchPath();
    ctx.stroke();

    // Cast-iron plate body
    ctx.strokeStyle = KB_PALETTE.ironPlate;
    ctx.lineWidth = tubeThickness;
    createArchPath();
    ctx.stroke();

    // Metallic highlight stripe along the outer top curve
    ctx.strokeStyle = KB_PALETTE.ironHighlight;
    ctx.lineWidth = tubeThickness * 0.38;
    ctx.beginPath();
    ctx.moveTo(chestCenterX - archWidth * 0.42, archApexY + tubeThickness * 0.6);
    ctx.bezierCurveTo(
      chestCenterX - archWidth * 0.45,
      archApexY - tubeThickness * 0.15,
      chestCenterX + archWidth * 0.45,
      archApexY - tubeThickness * 0.15,
      chestCenterX + archWidth * 0.42,
      archApexY + tubeThickness * 0.6
    );
    ctx.stroke();

    // Specular glint at apex
    ctx.strokeStyle = KB_PALETTE.ironGlint;
    ctx.lineWidth = tubeThickness * 0.16;
    ctx.beginPath();
    ctx.moveTo(chestCenterX - archWidth * 0.18, archApexY - tubeThickness * 0.12);
    ctx.lineTo(chestCenterX + archWidth * 0.18, archApexY - tubeThickness * 0.12);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 2. Cylindrical Barrel Helmet, Mini Handle & Glowing Molten T-Visor
   */
  private static drawKettlebellHelmet(
    ctx: CanvasRenderingContext2D,
    nose: { x: number; y: number },
    chestCenter: { x: number; y: number },
    radius: number,
    phase: number,
    power: number
  ): void {
    const headAngle = Math.atan2(nose.x - chestCenter.x, chestCenter.y - nose.y) * 0.28;
    const helmCenter = { x: nose.x, y: nose.y - radius * 0.15 };

    ctx.save();
    ctx.translate(helmCenter.x, helmCenter.y);
    ctx.rotate(headAngle);

    // --- A. ROUND NECK COLLAR / GORGET (Base under helmet) ---
    const collarW = radius * 1.55;
    const collarH = radius * 0.42;
    const collarY = radius * 0.75;

    ctx.fillStyle = KB_PALETTE.ironDarkest;
    ctx.strokeStyle = KB_PALETTE.outline;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, collarY, collarW * 0.5, collarH * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Collar metallic rim highlight
    ctx.strokeStyle = KB_PALETTE.ironHighlight;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, collarY - 2, collarW * 0.45, collarH * 0.35, 0, 0, Math.PI);
    ctx.stroke();

    // --- B. MINI KETTLEBELL HANDLE ON TOP OF HELMET ---
    const miniHandleW = radius * 0.52;
    const miniHandleH = radius * 0.38;
    const miniThickness = Math.max(5, radius * 0.11);

    ctx.strokeStyle = KB_PALETTE.outline;
    ctx.lineWidth = miniThickness + 4;
    ctx.beginPath();
    ctx.arc(0, -radius * 0.85, miniHandleW * 0.5, Math.PI, 0);
    ctx.stroke();

    ctx.strokeStyle = KB_PALETTE.ironPlate;
    ctx.lineWidth = miniThickness;
    ctx.beginPath();
    ctx.arc(0, -radius * 0.85, miniHandleW * 0.5, Math.PI, 0);
    ctx.stroke();

    ctx.strokeStyle = KB_PALETTE.ironGlint;
    ctx.lineWidth = miniThickness * 0.35;
    ctx.beginPath();
    ctx.arc(0, -radius * 0.85, miniHandleW * 0.5 - 1, Math.PI * 0.8, Math.PI * 0.2, true);
    ctx.stroke();

    // --- C. CYLINDRICAL BARREL DOME HELMET ---
    const helmW = radius * 1.35;
    const helmH = radius * 1.5;

    // Cast-iron shaded cylinder gradient
    const helmGrad = ctx.createLinearGradient(-helmW * 0.5, 0, helmW * 0.5, 0);
    helmGrad.addColorStop(0, KB_PALETTE.ironDarkest);
    helmGrad.addColorStop(0.18, KB_PALETTE.ironShadow);
    helmGrad.addColorStop(0.5, KB_PALETTE.ironPlate);
    helmGrad.addColorStop(0.8, KB_PALETTE.ironLight);
    helmGrad.addColorStop(0.92, KB_PALETTE.ironHighlight);
    helmGrad.addColorStop(1, KB_PALETTE.ironDarkest);

    ctx.fillStyle = helmGrad;
    ctx.strokeStyle = KB_PALETTE.outline;
    ctx.lineWidth = 4;

    ctx.beginPath();
    // Rounded dome top tapering to flat barrel chin
    ctx.roundRect(-helmW * 0.5, -radius * 0.85, helmW, helmH, [
      radius * 0.65,
      radius * 0.65,
      radius * 0.25,
      radius * 0.25,
    ]);
    ctx.fill();
    ctx.stroke();

    // Horizontal ridge band across the brow
    ctx.strokeStyle = KB_PALETTE.outline;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-helmW * 0.48, -radius * 0.28);
    ctx.lineTo(helmW * 0.48, -radius * 0.28);
    ctx.stroke();

    ctx.strokeStyle = KB_PALETTE.ironGlint;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-helmW * 0.45, -radius * 0.31);
    ctx.lineTo(helmW * 0.45, -radius * 0.31);
    ctx.stroke();

    // --- D. GLOWING MOLTEN FIERY T-VISOR SLIT (Key Feature) ---
    const visorW = radius * 0.82;
    const visorBarH = Math.max(7, radius * 0.18);
    const stemW = Math.max(8, radius * 0.24);
    const stemH = radius * 0.44;
    const visorY = -radius * 0.08;

    // Helper: Draws the T-Visor polygon path
    const createTVisorPath = () => {
      ctx.beginPath();
      // Top horizontal bar
      ctx.moveTo(-visorW * 0.5, visorY);
      ctx.lineTo(visorW * 0.5, visorY);
      ctx.lineTo(visorW * 0.5, visorY + visorBarH);
      ctx.lineTo(stemW * 0.5, visorY + visorBarH);
      // Down vertical stem
      ctx.lineTo(stemW * 0.5, visorY + visorBarH + stemH);
      ctx.lineTo(-stemW * 0.5, visorY + visorBarH + stemH);
      ctx.lineTo(-stemW * 0.5, visorY + visorBarH);
      ctx.lineTo(-visorW * 0.5, visorY + visorBarH);
      ctx.closePath();
    };

    // 1. Dark Black Recessed Cavity
    ctx.fillStyle = KB_PALETTE.outline;
    ctx.strokeStyle = KB_PALETTE.outline;
    ctx.lineWidth = 3;
    createTVisorPath();
    ctx.fill();
    ctx.stroke();

    // 2. Fiery Visor Glow & Bloom
    const isDrive = phase === 1;
    ctx.save();
    ctx.shadowColor = KB_PALETTE.visorOrange;
    ctx.shadowBlur = isDrive ? 28 : 16;

    // Visor fiery gradient (bright yellow core, deep orange edges)
    const visorGrad = ctx.createLinearGradient(0, visorY, 0, visorY + visorBarH + stemH);
    visorGrad.addColorStop(0, KB_PALETTE.visorCore);
    visorGrad.addColorStop(0.35, KB_PALETTE.visorAmber);
    visorGrad.addColorStop(0.7, KB_PALETTE.visorOrange);
    visorGrad.addColorStop(1, KB_PALETTE.visorRed);

    ctx.fillStyle = visorGrad;
    createTVisorPath();
    ctx.fill();

    // Superheated white-hot center filament
    ctx.fillStyle = KB_PALETTE.visorCore;
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 8;
    ctx.fillRect(-visorW * 0.42, visorY + 2, visorW * 0.84, visorBarH * 0.45);
    ctx.fillRect(-stemW * 0.25, visorY + visorBarH, stemW * 0.5, stemH * 0.7);

    ctx.restore();

    ctx.restore();
  }

  /**
   * 3. Spherical Cast-Iron Pauldrons ("24kg" & "32kg" Stamped Spheres)
   */
  private static drawKettlebellPauldron(
    ctx: CanvasRenderingContext2D,
    shoulder: { x: number; y: number },
    elbow: { x: number; y: number } | null,
    radius: number,
    weightText: '24kg' | '32kg',
    side: 'LEFT' | 'RIGHT'
  ): void {
    ctx.save();
    ctx.translate(shoulder.x, shoulder.y);

    if (elbow) {
      const angle = Math.atan2(elbow.y - shoulder.y, elbow.x - shoulder.x);
      // Tilt slightly with the arm
      ctx.rotate(angle * 0.4);
    }

    // --- A. UNDER-RING CUFF PLATES (Articulation rings under sphere) ---
    const cuffW = radius * 1.6;
    const cuffH = radius * 0.45;
    ctx.fillStyle = KB_PALETTE.ironDarkest;
    ctx.strokeStyle = KB_PALETTE.outline;
    ctx.lineWidth = 3.5;

    ctx.beginPath();
    ctx.roundRect(-cuffW * 0.5, radius * 0.45, cuffW, cuffH, [6]);
    ctx.fill();
    ctx.stroke();

    // Rivets on cuff
    ctx.fillStyle = KB_PALETTE.ironHighlight;
    ctx.fillRect(-cuffW * 0.35, radius * 0.6, 4, 4);
    ctx.fillRect(0, radius * 0.6, 4, 4);
    ctx.fillRect(cuffW * 0.35 - 4, radius * 0.6, 4, 4);

    // --- B. GIANT SPHERICAL CAST-IRON KETTLEBELL BALL ---
    const sphereGrad = ctx.createRadialGradient(
      radius * 0.2,
      -radius * 0.25,
      radius * 0.1,
      0,
      0,
      radius * 1.05
    );
    sphereGrad.addColorStop(0, KB_PALETTE.ironGlint);
    sphereGrad.addColorStop(0.2, KB_PALETTE.ironHighlight);
    sphereGrad.addColorStop(0.55, KB_PALETTE.ironPlate);
    sphereGrad.addColorStop(0.85, KB_PALETTE.ironShadow);
    sphereGrad.addColorStop(1, KB_PALETTE.ironDarkest);

    ctx.fillStyle = sphereGrad;
    ctx.strokeStyle = KB_PALETTE.outline;
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Outer crescent shadow line for 3D depth
    ctx.strokeStyle = KB_PALETTE.outline;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 2, Math.PI * 0.3, Math.PI * 1.2);
    ctx.stroke();

    // --- C. STAMPED WEIGHT ENGRAVING ("24kg" / "32kg") ---
    const fontSize = Math.max(10, Math.round(radius * 0.42));
    ctx.font = `900 ${fontSize}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textAngle = side === 'LEFT' ? -0.22 : 0.22;
    ctx.save();
    ctx.rotate(textAngle);

    // Embossed shadow (debossed into cast-iron)
    ctx.fillStyle = KB_PALETTE.stampDark;
    ctx.fillText(weightText, 0, 1.5);

    // Light bevel highlight edge
    ctx.fillStyle = KB_PALETTE.stampBevel;
    ctx.fillText(weightText, -0.5, -0.5);

    // Primary dark engraved ink
    ctx.fillStyle = KB_PALETTE.ironDarkest;
    ctx.fillText(weightText, 0, 0);

    ctx.restore();

    ctx.restore();
  }

  /**
   * 4. Massive Round Spherical Kettlebell Cuirass (Breastplate & Belly)
   * The entire torso is a giant cast-iron kettlebell with center circular medallion & battle scars!
   */
  private static drawKettlebellCuirass(
    ctx: CanvasRenderingContext2D,
    lS: { x: number; y: number },
    rS: { x: number; y: number },
    lH: { x: number; y: number },
    rH: { x: number; y: number },
    phase: number,
    power: number
  ): void {
    ctx.save();

    const shoulderDist = Math.hypot(lS.x - rS.x, lS.y - rS.y);
    const chestCenterX = (lS.x + rS.x + lH.x + rH.x) / 4;
    const chestCenterY = (lS.y + rS.y) / 2 + ((lH.y + rH.y) / 2 - (lS.y + rS.y) / 2) * 0.42;
    const bellRadius = shoulderDist * 0.58;

    // --- A. GIANT SPHERICAL KETTLEBELL BELLY (3D Cast-Iron Shading) ---
    const bellGrad = ctx.createRadialGradient(
      chestCenterX + bellRadius * 0.15,
      chestCenterY - bellRadius * 0.25,
      bellRadius * 0.08,
      chestCenterX,
      chestCenterY,
      bellRadius * 1.05
    );
    bellGrad.addColorStop(0, KB_PALETTE.ironGlint);
    bellGrad.addColorStop(0.25, KB_PALETTE.ironHighlight);
    bellGrad.addColorStop(0.6, KB_PALETTE.ironPlate);
    bellGrad.addColorStop(0.85, KB_PALETTE.ironShadow);
    bellGrad.addColorStop(1, KB_PALETTE.ironDarkest);

    ctx.fillStyle = bellGrad;
    ctx.strokeStyle = KB_PALETTE.outline;
    ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.arc(chestCenterX, chestCenterY, bellRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // --- B. CENTRAL CIRCULAR REINFORCEMENT MEDALLION ---
    const medalRadius = bellRadius * 0.46;
    const medalGrad = ctx.createLinearGradient(
      chestCenterX - medalRadius,
      chestCenterY - medalRadius,
      chestCenterX + medalRadius,
      chestCenterY + medalRadius
    );
    medalGrad.addColorStop(0, KB_PALETTE.ironHighlight);
    medalGrad.addColorStop(0.4, KB_PALETTE.ironPlate);
    medalGrad.addColorStop(0.9, KB_PALETTE.ironShadow);
    medalGrad.addColorStop(1, KB_PALETTE.ironDarkest);

    ctx.fillStyle = medalGrad;
    ctx.strokeStyle = KB_PALETTE.outline;
    ctx.lineWidth = 3.5;

    ctx.beginPath();
    ctx.arc(chestCenterX, chestCenterY, medalRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Medallion inner rim bevel
    ctx.strokeStyle = KB_PALETTE.ironGlint;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(chestCenterX, chestCenterY, medalRadius - 2.5, Math.PI * 0.8, Math.PI * 1.8);
    ctx.stroke();

    // --- C. BATTLE SLASH SCRATCHES ACROSS MEDALLION (Just like artwork!) ---
    ctx.strokeStyle = KB_PALETTE.outline;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    // Scratch 1 (long diagonal slash)
    ctx.moveTo(chestCenterX - medalRadius * 0.5, chestCenterY - medalRadius * 0.35);
    ctx.lineTo(chestCenterX + medalRadius * 0.45, chestCenterY + medalRadius * 0.4);
    // Scratch 2 (secondary nick)
    ctx.moveTo(chestCenterX - medalRadius * 0.2, chestCenterY - medalRadius * 0.5);
    ctx.lineTo(chestCenterX + medalRadius * 0.15, chestCenterY - medalRadius * 0.1);
    ctx.stroke();

    // Highlight edge along the scratches
    ctx.strokeStyle = KB_PALETTE.ironGlint;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chestCenterX - medalRadius * 0.5 + 1, chestCenterY - medalRadius * 0.35 + 1);
    ctx.lineTo(chestCenterX + medalRadius * 0.45 + 1, chestCenterY + medalRadius * 0.4 + 1);
    ctx.stroke();

    // --- D. BOTTOM WAIST LIP / RIM BAND ---
    const lipY = chestCenterY + bellRadius * 0.68;
    const lipW = bellRadius * 1.45;

    ctx.fillStyle = KB_PALETTE.ironShadow;
    ctx.strokeStyle = KB_PALETTE.outline;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(chestCenterX - lipW * 0.5, lipY, lipW, bellRadius * 0.22, [8]);
    ctx.fill();
    ctx.stroke();

    // Heavy round rivets on waist lip
    ctx.fillStyle = KB_PALETTE.ironGlint;
    const rivetCount = 5;
    for (let i = 0; i < rivetCount; i++) {
      const rx = chestCenterX - lipW * 0.4 + (i * (lipW * 0.8)) / (rivetCount - 1);
      ctx.beginPath();
      ctx.arc(rx, lipY + bellRadius * 0.11, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- E. DRIVE PHASE FORGE PULSE RING ---
    if (phase === 1 || power > 80) {
      ctx.save();
      ctx.strokeStyle = KB_PALETTE.visorOrange;
      ctx.shadowColor = KB_PALETTE.visorAmber;
      ctx.shadowBlur = 18;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(chestCenterX, chestCenterY, medalRadius * 1.35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * 5. Chunky Cast-Iron Forearm Vambraces & Gauntlets
   */
  private static drawIronVambrace(
    ctx: CanvasRenderingContext2D,
    elbow: { x: number; y: number },
    wrist: { x: number; y: number },
    thickness: number
  ): void {
    const angle = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x);
    const length = Math.hypot(wrist.x - elbow.x, wrist.y - elbow.y);

    ctx.save();
    ctx.translate(elbow.x, elbow.y);
    ctx.rotate(angle);

    // Rounded elbow cop
    ctx.fillStyle = KB_PALETTE.ironPlate;
    ctx.strokeStyle = KB_PALETTE.outline;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, thickness * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Vambrace forearm shaft
    const armGrad = ctx.createLinearGradient(0, -thickness * 0.5, 0, thickness * 0.5);
    armGrad.addColorStop(0, KB_PALETTE.ironGlint);
    armGrad.addColorStop(0.3, KB_PALETTE.ironPlate);
    armGrad.addColorStop(0.8, KB_PALETTE.ironShadow);
    armGrad.addColorStop(1, KB_PALETTE.ironDarkest);

    ctx.fillStyle = armGrad;
    ctx.beginPath();
    ctx.roundRect(0, -thickness * 0.45, length * 0.82, thickness * 0.9, [thickness * 0.25]);
    ctx.fill();
    ctx.stroke();

    // Heavy flared wrist gauntlet cuff
    ctx.fillStyle = KB_PALETTE.ironShadow;
    ctx.beginPath();
    ctx.roundRect(length * 0.78, -thickness * 0.6, length * 0.25, thickness * 1.2, [4]);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 6. Heavy Kettlebell Heater Shield (Left Arm / Screen Right)
   * Sturdy medieval heater shield with thick beveled border and embossed Kettlebell crest!
   */
  private static drawKettlebellShield(
    ctx: CanvasRenderingContext2D,
    elbow: { x: number; y: number },
    wrist: { x: number; y: number },
    size: number,
    phase: number
  ): void {
    const angle = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x);
    const shieldCenter = {
      x: wrist.x + Math.cos(angle) * (size * 0.25),
      y: wrist.y + Math.sin(angle) * (size * 0.25),
    };

    ctx.save();
    ctx.translate(shieldCenter.x, shieldCenter.y);
    ctx.rotate(angle * 0.6);

    const sW = size * 0.9;
    const sH = size * 1.25;

    // Helper: Classic Heater Shield Path
    const createShieldPath = (inset = 0) => {
      const w2 = (sW - inset * 2) * 0.5;
      const hTop = -sH * 0.5 + inset;
      const hMid = sH * 0.05;
      const hBottom = sH * 0.5 - inset;

      ctx.beginPath();
      // Curved top edge
      ctx.moveTo(-w2, hTop + 6);
      ctx.quadraticCurveTo(0, hTop - 8, w2, hTop + 6);
      // Straight upper sides tapering into pointed bottom beak
      ctx.lineTo(w2, hMid);
      ctx.quadraticCurveTo(w2 * 0.85, hBottom * 0.65, 0, hBottom);
      ctx.quadraticCurveTo(-w2 * 0.85, hBottom * 0.65, -w2, hMid);
      ctx.closePath();
    };

    // 1. Black outer border outline
    ctx.fillStyle = KB_PALETTE.outline;
    ctx.strokeStyle = KB_PALETTE.outline;
    ctx.lineWidth = 4;
    createShieldPath(0);
    ctx.fill();
    ctx.stroke();

    // 2. Beveled outer rim
    ctx.fillStyle = KB_PALETTE.ironPlate;
    createShieldPath(4);
    ctx.fill();
    ctx.stroke();

    // 3. Recessed shield field plate
    const fieldGrad = ctx.createLinearGradient(-sW * 0.5, -sH * 0.5, sW * 0.5, sH * 0.5);
    fieldGrad.addColorStop(0, KB_PALETTE.ironLight);
    fieldGrad.addColorStop(0.35, KB_PALETTE.ironPlate);
    fieldGrad.addColorStop(0.8, KB_PALETTE.ironShadow);
    fieldGrad.addColorStop(1, KB_PALETTE.ironDarkest);

    ctx.fillStyle = fieldGrad;
    createShieldPath(10);
    ctx.fill();
    ctx.stroke();

    // 4. EMBOSSED CAST-IRON KETTLEBELL CREST IN CENTER
    const kbIconRadius = sW * 0.22;
    const kbCenterY = -sH * 0.02;

    // Embossed shadow
    ctx.fillStyle = KB_PALETTE.ironDarkest;
    ctx.beginPath();
    ctx.arc(0, kbCenterY + 2, kbIconRadius, 0, Math.PI * 2);
    ctx.fill();

    // Kettlebell body
    ctx.fillStyle = KB_PALETTE.ironGlint;
    ctx.strokeStyle = KB_PALETTE.outline;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, kbCenterY, kbIconRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Kettlebell handle loop
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = KB_PALETTE.ironGlint;
    ctx.beginPath();
    ctx.arc(0, kbCenterY - kbIconRadius * 0.8, kbIconRadius * 0.55, Math.PI * 0.9, Math.PI * 0.1);
    ctx.stroke();

    // Corner rivets along shield rim
    ctx.fillStyle = KB_PALETTE.ironGlint;
    ctx.fillRect(-sW * 0.4, -sH * 0.44, 4, 4);
    ctx.fillRect(sW * 0.4 - 4, -sH * 0.44, 4, 4);
    ctx.fillRect(-2, sH * 0.4 - 4, 4, 4);

    ctx.restore();
  }

  /**
   * 7. The Kettlebell Buster Greatsword (Right Hand / Screen Left)
   * Heavy broad slab blade with rounded kettlebell crossguard & iron pommel!
   */
  private static drawKettlebellBusterSword(
    ctx: CanvasRenderingContext2D,
    elbow: { x: number; y: number },
    wrist: { x: number; y: number },
    size: number,
    power: number,
    phase: number
  ): void {
    const angle = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x);

    ctx.save();
    ctx.translate(wrist.x, wrist.y);
    ctx.rotate(angle);

    const bladeLen = size * 2.2;
    const bladeW = size * 0.45;

    // --- A. KETTLEBELL CROSSGUARD (Hollow Ring Handle Guard) ---
    const guardRadius = bladeW * 0.65;

    // Guard kettlebell bell body
    ctx.fillStyle = KB_PALETTE.ironPlate;
    ctx.strokeStyle = KB_PALETTE.outline;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, guardRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Guard kettlebell handle loops on left and right
    ctx.lineWidth = 4;
    ctx.strokeStyle = KB_PALETTE.ironPlate;
    ctx.beginPath();
    ctx.arc(0, -guardRadius * 0.7, guardRadius * 0.65, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, guardRadius * 0.7, guardRadius * 0.65, 0, Math.PI);
    ctx.stroke();

    // --- B. HEAVY BUSTER SLAB BLADE ---
    const bladeGrad = ctx.createLinearGradient(0, -bladeW * 0.5, 0, bladeW * 0.5);
    bladeGrad.addColorStop(0, KB_PALETTE.ironGlint);
    bladeGrad.addColorStop(0.3, KB_PALETTE.ironLight);
    bladeGrad.addColorStop(0.65, KB_PALETTE.ironPlate);
    bladeGrad.addColorStop(1, KB_PALETTE.ironShadow);

    ctx.fillStyle = bladeGrad;
    ctx.strokeStyle = KB_PALETTE.outline;
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(guardRadius * 0.8, -bladeW * 0.5);
    ctx.lineTo(bladeLen - bladeW * 0.75, -bladeW * 0.5); // Top blade spine
    ctx.lineTo(bladeLen, 0); // Angled clip point tip
    ctx.lineTo(bladeLen - bladeW * 0.75, bladeW * 0.5);
    ctx.lineTo(guardRadius * 0.8, bladeW * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Central fuller ridge line down the blade
    ctx.strokeStyle = KB_PALETTE.ironDarkest;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(guardRadius * 1.2, 0);
    ctx.lineTo(bladeLen - bladeW * 0.8, 0);
    ctx.stroke();

    // Sharp metallic cutting edge highlight
    ctx.strokeStyle = KB_PALETTE.ironGlint;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(guardRadius * 0.9, -bladeW * 0.45);
    ctx.lineTo(bladeLen - bladeW * 0.72, -bladeW * 0.45);
    ctx.stroke();

    // High-power / Drive molten sparks along the blade edge
    if (power > 80 || phase === 1) {
      ctx.save();
      ctx.strokeStyle = KB_PALETTE.visorAmber;
      ctx.shadowColor = KB_PALETTE.visorOrange;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(guardRadius * 1.5, -bladeW * 0.48);
      ctx.lineTo(bladeLen - bladeW * 0.8, -bladeW * 0.48);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * 8. Spherical Kettlebell Poleyns (Knee Cops)
   */
  private static drawKettlebellPoleyn(
    ctx: CanvasRenderingContext2D,
    knee: { x: number; y: number },
    size: number
  ): void {
    ctx.save();
    ctx.translate(knee.x, knee.y);

    const sphereGrad = ctx.createRadialGradient(
      size * 0.2,
      -size * 0.25,
      size * 0.08,
      0,
      0,
      size * 1.05
    );
    sphereGrad.addColorStop(0, KB_PALETTE.ironGlint);
    sphereGrad.addColorStop(0.3, KB_PALETTE.ironHighlight);
    sphereGrad.addColorStop(0.65, KB_PALETTE.ironPlate);
    sphereGrad.addColorStop(1, KB_PALETTE.ironDarkest);

    ctx.fillStyle = sphereGrad;
    ctx.strokeStyle = KB_PALETTE.outline;
    ctx.lineWidth = 3.5;

    ctx.beginPath();
    ctx.arc(0, 0, size * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Center kettlebell iron rivet
    ctx.fillStyle = KB_PALETTE.ironGlint;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.16, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * 9. Heavy Cast-Iron Greaves (Lower Shin & Ankle Armor)
   */
  private static drawKettlebellGreave(
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

    const greaveGrad = ctx.createLinearGradient(0, -thickness * 0.5, 0, thickness * 0.5);
    greaveGrad.addColorStop(0, KB_PALETTE.ironGlint);
    greaveGrad.addColorStop(0.3, KB_PALETTE.ironPlate);
    greaveGrad.addColorStop(0.8, KB_PALETTE.ironShadow);
    greaveGrad.addColorStop(1, KB_PALETTE.ironDarkest);

    ctx.fillStyle = greaveGrad;
    ctx.strokeStyle = KB_PALETTE.outline;
    ctx.lineWidth = 3.5;

    // Segmented contoured shin plate
    ctx.beginPath();
    ctx.roundRect(length * 0.15, -thickness * 0.45, length * 0.72, thickness * 0.9, [thickness * 0.25]);
    ctx.fill();
    ctx.stroke();

    // Ridge plate down center
    ctx.strokeStyle = KB_PALETTE.ironGlint;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(length * 0.22, 0);
    ctx.lineTo(length * 0.78, 0);
    ctx.stroke();

    // Heavy flared boot ring
    ctx.fillStyle = KB_PALETTE.ironDarkest;
    ctx.fillRect(length * 0.78, -thickness * 0.52, length * 0.12, thickness * 1.04);
    ctx.strokeRect(length * 0.78, -thickness * 0.52, length * 0.12, thickness * 1.04);

    ctx.restore();
  }

  /**
   * 10. Atmospheric Molten Forge Embers
   */
  private static drawForgeEmbers(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    phase: number
  ): void {
    const count = 10;
    const time = performance.now() * 0.0018;

    ctx.save();
    for (let i = 0; i < count; i++) {
      const seed = i * 47.13;
      const progress = (time * 0.8 + seed * 0.1) % 1;
      const emberX = x + Math.sin(time + seed) * radius;
      const emberY = y - progress * radius * 1.6;
      const size = 2.5 + (i % 2) * 1.5;
      const alpha = Math.sin(progress * Math.PI) * 0.85;

      ctx.fillStyle = i % 2 === 0 ? KB_PALETTE.visorAmber : KB_PALETTE.visorOrange;
      ctx.shadowColor = KB_PALETTE.visorAmber;
      ctx.shadowBlur = 8;
      ctx.globalAlpha = Math.max(0, alpha);

      ctx.beginPath();
      ctx.fillRect(emberX, emberY, size, size);
    }
    ctx.restore();
  }
}
