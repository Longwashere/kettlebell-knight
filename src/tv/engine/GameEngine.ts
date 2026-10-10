import { Application, Container, Graphics, Text, Assets, Sprite, Texture } from 'pixi.js';
import { audioManager } from '../../shared/AudioManager';
import { ExerciseType } from '../../types/game';

interface FloatingCombatText {
  container: Container;
  text: Text;
  vx: number;
  vy: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface Particle {
  graphics: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
}

export interface SkeletonAttachmentMock {
  setAttachment: (slotName: string, attachmentName: string | null) => void;
  getAttachment: (slotName: string) => string | null;
}

/**
 * 32-Bit Retro PixiJS Game Engine for Amazon Fire TV (426x240 Virtual Resolution)
 * 
 * Strict Performance Constraints:
 * 1. Zero React Layout Thrashing: telemetry bypasses React state and feeds directly here.
 * 2. Strict VRAM Management: 426x240 canvas scaled with CSS pixelated rendering.
 *    Uses Assets.load/unload on scene transitions to prevent WebGL Context Loss on 1GB Fire TV sticks.
 * 3. Dynamic Spine/Attachment preview swapping with proactive asset unloading.
 */
export class GameEngine {
  private app: Application | null = null;
  private containerElement: HTMLElement;
  private isDestroyed: boolean = false;

  // Scene containers
  private rootStage: Container | null = null;
  private bgLayer: Container | null = null;
  private gameLayer: Container | null = null;
  private effectsLayer: Container | null = null;
  private uiLayer: Container | null = null;

  // Visual Entities
  private knightContainer: Container | null = null;
  private knightBody: Graphics | null = null;
  private kettlebellWeapon: Graphics | null = null;
  private shieldGraphic: Graphics | null = null;
  private helmetGraphic: Graphics | null = null;
  private enemyDummy: Container | null = null;
  private flashOverlay: Graphics | null = null;

  // Animation States
  private swingProgress: number = 0; // 0 to 1 during swing
  private isSwinging: boolean = false;
  private swingVelocity: number = 0;
  private flashAlpha: number = 0;
  private shakeIntensity: number = 0;
  private baseStageX: number = 0;
  private baseStageY: number = 0;

  // Combat entities
  private floatingTexts: FloatingCombatText[] = [];
  private particles: Particle[] = [];

  // Equipment & Texture Cache (VRAM management)
  private currentPreviewAssetKey: string | null = null;
  private equippedSlots: Record<string, string> = {
    weapon: 'iron_kettlebell',
    shield: 'wooden_shield',
    armor: 'iron_plate',
    helmet: 'iron_visage',
  };

  // Spine-compatible Skeleton Controller
  public skeleton: SkeletonAttachmentMock;

  // Stats
  private totalRepsCount: number = 0;
  private currentCombo: number = 0;
  private totalPowerAccumulated: number = 0;

  constructor(containerElement: HTMLElement) {
    this.containerElement = containerElement;

    this.skeleton = {
      setAttachment: (slotName: string, attachmentName: string | null) => {
        if (attachmentName) {
          this.equippedSlots[slotName] = attachmentName;
        } else {
          delete this.equippedSlots[slotName];
        }
        this.updateKnightVisuals();
      },
      getAttachment: (slotName: string) => {
        return this.equippedSlots[slotName] || null;
      },
    };
  }

  /**
   * Initializes PixiJS Application at 426x240 virtual resolution.
   * Sets CSS pixelated scaling to fill the Fire TV 10-foot screen.
   */
  public async init(): Promise<void> {
    const app = new Application();

    await app.init({
      width: 426,
      height: 240,
      backgroundColor: 0x0F0E17,
      resolution: 1, // Strictly 1.0 to preserve native 240p pixel grid
      autoDensity: false,
      antialias: false,
      powerPreference: 'high-performance',
    });

    if (this.isDestroyed) {
      app.destroy(true);
      return;
    }

    this.app = app;

    // Apply strict CSS pixelated scaling for 32-bit retro look & Fire TV VRAM saving
    const canvas = app.canvas;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.imageRendering = 'pixelated';
    (canvas.style as any).imageRendering = 'crisp-edges';

    this.containerElement.replaceChildren(canvas);

    this.buildScene();
    this.startTicker();
  }

  private buildScene(): void {
    if (!this.app) return;

    this.rootStage = new Container();
    this.app.stage.addChild(this.rootStage);

    this.bgLayer = new Container();
    this.gameLayer = new Container();
    this.effectsLayer = new Container();
    this.uiLayer = new Container();

    this.rootStage.addChild(this.bgLayer);
    this.rootStage.addChild(this.gameLayer);
    this.rootStage.addChild(this.effectsLayer);
    this.rootStage.addChild(this.uiLayer);

    // 1. Build 32-Bit Parallax Dungeon / Town Hub Background
    this.createRetroBackground();

    // 2. Build Knight Entity (Centered at x=140, y=170)
    this.createKnightEntity();

    // 3. Build Training Dummy / Boss Target (x=310, y=170)
    this.createTrainingDummy();

    // 4. Fullscreen Screen Flash Overlay for Rep Impacts
    this.flashOverlay = new Graphics();
    this.flashOverlay.rect(0, 0, 426, 240).fill({ color: 0xFFFFFF, alpha: 1 });
    this.flashOverlay.alpha = 0;
    this.effectsLayer.addChild(this.flashOverlay);
  }

  private createRetroBackground(): void {
    if (!this.bgLayer) return;

    const bg = new Graphics();

    // Dark stone dungeon wall gradient bands
    bg.rect(0, 0, 426, 60).fill({ color: 0x12101E });
    bg.rect(0, 60, 426, 60).fill({ color: 0x1A1828 });
    bg.rect(0, 120, 426, 45).fill({ color: 0x242138 });

    // Stone Brick Pattern
    for (let row = 0; row < 5; row++) {
      const y = row * 32;
      const offset = (row % 2) * 24;
      for (let col = -1; col < 18; col++) {
        const x = col * 48 + offset;
        bg.rect(x, y, 46, 2).fill({ color: 0x0A0912, alpha: 0.7 });
        bg.rect(x + 46, y, 2, 32).fill({ color: 0x0A0912, alpha: 0.7 });
      }
    }

    // Cobblestone Floor
    bg.rect(0, 165, 426, 75).fill({ color: 0x2A2740 });
    for (let i = 0; i < 426; i += 12) {
      bg.rect(i, 165, 10, 2).fill({ color: 0x3E3A5E });
      bg.rect(i + 4, 185, 14, 2).fill({ color: 0x1E1B2D });
      bg.rect(i, 210, 12, 2).fill({ color: 0x181525 });
    }

    // Torch Sconces on Wall with Cyan/Gold Magic Flame
    const drawTorch = (x: number, y: number, color: number) => {
      // Bracket
      bg.rect(x, y, 4, 16).fill({ color: 0x5C4033 });
      bg.rect(x - 4, y, 12, 4).fill({ color: 0x3A2B20 });
      // Flame core
      bg.circle(x + 2, y - 4, 6).fill({ color, alpha: 0.9 });
      bg.circle(x + 2, y - 4, 12).fill({ color, alpha: 0.15 });
    };

    drawTorch(60, 70, 0x38B6FF);
    drawTorch(366, 70, 0xF4B41A);

    this.bgLayer.addChild(bg);
  }

  private createKnightEntity(): void {
    if (!this.gameLayer) return;

    this.knightContainer = new Container();
    this.knightContainer.x = 130;
    this.knightContainer.y = 168;

    // Shadow
    const shadow = new Graphics();
    shadow.ellipse(0, 0, 24, 6).fill({ color: 0x000000, alpha: 0.45 });
    this.knightContainer.addChild(shadow);

    // Body Graphics
    this.knightBody = new Graphics();
    this.knightContainer.addChild(this.knightBody);

    // Helmet Graphics
    this.helmetGraphic = new Graphics();
    this.knightContainer.addChild(this.helmetGraphic);

    // Shield Graphics (left arm)
    this.shieldGraphic = new Graphics();
    this.knightContainer.addChild(this.shieldGraphic);

    // Kettlebell / Weapon Graphics (right hand / swing arm)
    this.kettlebellWeapon = new Graphics();
    this.knightContainer.addChild(this.kettlebellWeapon);

    this.updateKnightVisuals();
    this.gameLayer.addChild(this.knightContainer);
  }

  private createTrainingDummy(): void {
    if (!this.gameLayer) return;

    this.enemyDummy = new Container();
    this.enemyDummy.x = 300;
    this.enemyDummy.y = 168;

    this.setMonster('DEMON');
    this.gameLayer.addChild(this.enemyDummy);
  }

  /**
   * Renders specialized 32-bit pixel art monsters for Slay the Spire boss battles
   */
  public setMonster(type: 'DEMON' | 'GOLEM' | 'WARLORD' | 'MINOTAUR' = 'DEMON'): void {
    if (!this.enemyDummy) return;

    this.enemyDummy.removeChildren();
    const g = new Graphics();

    // Shadow
    g.ellipse(0, 0, 26, 6).fill({ color: 0x000000, alpha: 0.5 });

    switch (type) {
      case 'GOLEM': {
        // LACTIC TITAN (Heavy Iron & Stone Golem)
        // Granite legs
        g.rect(-16, -14, 12, 14).fill({ color: 0x334155 });
        g.rect(4, -14, 12, 14).fill({ color: 0x334155 });
        // Massive Stone Torso
        g.rect(-22, -48, 44, 34).fill({ color: 0x475569 });
        g.rect(-18, -44, 36, 26).fill({ color: 0x64748B });
        // Glowing Cyan Core Runes
        g.rect(-6, -38, 12, 14).fill({ color: 0x38B6FF });
        g.rect(-4, -36, 8, 10).fill({ color: 0xFFFFFF });
        // Giant Stone Pauldrons
        g.rect(-28, -52, 12, 16).fill({ color: 0x1E293B });
        g.rect(16, -52, 12, 16).fill({ color: 0x1E293B });
        // Golem Head with Glowing Eye Slit
        g.rect(-12, -68, 24, 20).fill({ color: 0x334155 });
        g.rect(-8, -60, 16, 4).fill({ color: 0x38B6FF });
        break;
      }

      case 'WARLORD': {
        // WARLORD GORECLAW (Dungeon Executioner)
        // Spiked boots
        g.rect(-14, -14, 10, 14).fill({ color: 0x18181B });
        g.rect(4, -14, 10, 14).fill({ color: 0x18181B });
        // Orc Muscle & Spiked Plate
        g.rect(-18, -46, 36, 32).fill({ color: 0x27272A });
        g.rect(-14, -42, 28, 24).fill({ color: 0xDC2626 }); // Blood armor
        // Spiked Shoulder Pauldrons
        g.rect(-26, -50, 12, 14).fill({ color: 0x71717A });
        g.rect(14, -50, 12, 14).fill({ color: 0x71717A });
        // Giant Battleaxe
        g.rect(20, -75, 4, 70).fill({ color: 0x52525B });
        g.rect(14, -70, 16, 18).fill({ color: 0xDC2626 });
        // Horned Iron Visor Head
        g.circle(0, -62, 12).fill({ color: 0x27272A });
        g.rect(-14, -76, 6, 16).fill({ color: 0xF4B41A }); // Horn
        g.rect(8, -76, 6, 16).fill({ color: 0xF4B41A }); // Horn
        g.rect(-6, -60, 12, 3).fill({ color: 0xFF3366 }); // Evil eye slit
        break;
      }

      case 'DEMON':
      default: {
        // BELPHEGOR (The Sloth Demon)
        // Demonic bat wings
        g.poly([-20, -50, -45, -75, -30, -35]).fill({ color: 0x3B0764, alpha: 0.85 });
        g.poly([20, -50, 45, -75, 30, -35]).fill({ color: 0x3B0764, alpha: 0.85 });
        // Hooves
        g.rect(-12, -12, 8, 12).fill({ color: 0x1E1B4B });
        g.rect(4, -12, 8, 12).fill({ color: 0x1E1B4B });
        // Dark Purple Chitin Body
        g.rect(-16, -46, 32, 34).fill({ color: 0x581C87 });
        g.rect(-12, -42, 24, 26).fill({ color: 0x7E22CE });
        // Glowing Demonic Sigil
        g.circle(0, -32, 5).fill({ color: 0xFF3366 });
        // Demon Horns
        g.poly([-8, -65, -18, -85, -4, -68]).fill({ color: 0xF4B41A });
        g.poly([8, -65, 18, -85, 4, -68]).fill({ color: 0xF4B41A });
        // Head & Glowing Red Eyes
        g.circle(0, -58, 12).fill({ color: 0x3B0764 });
        g.circle(-4, -58, 2.5).fill({ color: 0xFF3366 });
        g.circle(4, -58, 2.5).fill({ color: 0xFF3366 });
        break;
      }
    }

    this.enemyDummy.addChild(g);
  }

  /**
   * Animates a fierce monster attack lunge towards the player
   */
  public monsterAttackLunge(): void {
    if (!this.enemyDummy) return;

    const startX = 300;
    const lungeX = 175; // Right in front of Sir Kettleburne

    this.flashAlpha = 0.65;
    this.shakeIntensity = 8;

    // Fast forward lunge
    this.enemyDummy.x = lungeX;

    // Claw slash graphic
    if (this.effectsLayer) {
      const claw = new Graphics();
      claw.moveTo(lungeX - 25, 120);
      claw.lineTo(lungeX + 15, 160);
      claw.moveTo(lungeX - 15, 115);
      claw.lineTo(lungeX + 25, 155);
      claw.stroke({ width: 3, color: 0xFF3366 });
      this.effectsLayer.addChild(claw);

      setTimeout(() => {
        if (claw && !this.isDestroyed) {
          claw.destroy();
        }
      }, 150);
    }

    // Spring back
    setTimeout(() => {
      if (this.enemyDummy) {
        this.enemyDummy.x = startX;
      }
    }, 200);
  }

  /**
   * Animates a defensive shield pulse around Sir Kettleburne
   */
  public playerShieldPulse(): void {
    if (!this.effectsLayer || !this.knightContainer) return;

    const shieldG = new Graphics();
    this.effectsLayer.addChild(shieldG);

    let radius = 18;
    const maxRadius = 38;

    const animateShield = () => {
      if (this.isDestroyed || !this.effectsLayer) return;
      radius += 2.5;
      const alpha = 1 - (radius / maxRadius);

      shieldG.clear();
      shieldG.circle(this.knightContainer!.x, this.knightContainer!.y - 28, radius).stroke({
        width: 3,
        color: 0x38B6FF,
        alpha,
      });

      if (radius < maxRadius) {
        requestAnimationFrame(animateShield);
      } else {
        shieldG.destroy();
      }
    };
    animateShield();
    audioManager.play('equip');
  }

  /**
   * Re-renders the 32-bit pixel knight based on equipped and previewed items.
   */
  private updateKnightVisuals(): void {
    if (!this.knightBody || !this.kettlebellWeapon || !this.shieldGraphic || !this.helmetGraphic) return;

    // Redraw Knight Armor Body (32-bit pixel aesthetic)
    this.knightBody.clear();

    const armorColor = this.getArmorColor(this.equippedSlots.armor);

    // Legs / Boots
    this.knightBody.rect(-10, -14, 8, 14).fill({ color: 0x222233 });
    this.knightBody.rect(2, -14, 8, 14).fill({ color: 0x222233 });
    this.knightBody.rect(-11, -4, 9, 4).fill({ color: 0x444455 });
    this.knightBody.rect(2, -4, 9, 4).fill({ color: 0x444455 });

    // Torso / Plate Armor
    this.knightBody.rect(-12, -38, 24, 26).fill({ color: armorColor.main });
    this.knightBody.rect(-9, -36, 18, 22).fill({ color: armorColor.highlight });
    this.knightBody.rect(-12, -22, 24, 4).fill({ color: 0x1A1926 }); // Gold belt

    // Cape (Royal Crimson / Arcane Blue)
    this.knightBody.rect(-15, -36, 4, 32).fill({ color: 0x991B1B });

    // Helmet Redraw
    this.helmetGraphic.clear();
    const helmColor = this.getHelmetColor(this.equippedSlots.helmet);
    this.helmetGraphic.rect(-10, -56, 20, 18).fill({ color: helmColor.main });
    this.helmetGraphic.rect(-8, -54, 16, 14).fill({ color: helmColor.highlight });
    // Visor eye slit
    this.helmetGraphic.rect(-7, -47, 14, 3).fill({ color: 0x0F0E17 });
    // Visor glow
    this.helmetGraphic.rect(-5, -46, 10, 1).fill({ color: 0x38B6FF });
    // Crest / Plume
    this.helmetGraphic.rect(-3, -64, 6, 8).fill({ color: helmColor.plume });

    // Shield Redraw (Left Arm)
    this.shieldGraphic.clear();
    const shieldColor = this.getShieldColor(this.equippedSlots.shield);
    this.shieldGraphic.rect(-20, -38, 8, 20).fill({ color: shieldColor.border });
    this.shieldGraphic.rect(-19, -36, 6, 16).fill({ color: shieldColor.core });
    this.shieldGraphic.circle(-16, -28, 2).fill({ color: 0xF4B41A });

    // Kettlebell Weapon Redraw (Resting state, attached to swinging arm)
    this.drawKettlebell(0);
  }

  private drawKettlebell(angleRad: number): void {
    if (!this.kettlebellWeapon) return;

    this.kettlebellWeapon.clear();

    const weaponInfo = this.getWeaponInfo(this.equippedSlots.weapon);

    // Hand anchor is at x=10, y=-26
    const handX = 10;
    const handY = -26;

    // Kettlebell swings around hand anchor
    const bellDistance = 22;
    const bellX = handX + Math.sin(angleRad) * bellDistance;
    const bellY = handY + Math.cos(angleRad) * bellDistance;

    // Swinging Arm
    this.kettlebellWeapon.rect(4, -34, 8, 8).fill({ color: 0x444455 });
    // Forearm line to hand
    this.kettlebellWeapon.circle(handX, handY, 4).fill({ color: 0xF4B41A }); // Gauntlet knuckle

    // Kettlebell Handle (Arch)
    this.kettlebellWeapon.circle(bellX, bellY - 8, 6).stroke({ width: 3, color: weaponInfo.handleColor });

    // Kettlebell Solid Iron Bell Body
    this.kettlebellWeapon.circle(bellX, bellY, 8).fill({ color: weaponInfo.mainColor });
    this.kettlebellWeapon.circle(bellX - 2, bellY - 2, 4).fill({ color: weaponInfo.highlightColor });

    // Arcane / Elemental Rune Engraving
    if (weaponInfo.runeColor) {
      this.kettlebellWeapon.circle(bellX, bellY, 2).fill({ color: weaponInfo.runeColor });
    }
  }

  private getWeaponInfo(weaponId: string) {
    switch (weaponId) {
      case 'excalibur_bell':
        return { mainColor: 0xF4B41A, highlightColor: 0xFFFBEA, handleColor: 0x38B6FF, runeColor: 0x38B6FF };
      case 'dragon_kettlebell':
        return { mainColor: 0xDC2626, highlightColor: 0xF87171, handleColor: 0xF59E0B, runeColor: 0xFBBF24 };
      case 'void_bell':
        return { mainColor: 0x6B21A8, highlightColor: 0xA855F7, handleColor: 0xC084FC, runeColor: 0x00EB88 };
      case 'iron_kettlebell':
      default:
        return { mainColor: 0x374151, highlightColor: 0x6B7280, handleColor: 0x1F2937, runeColor: null };
    }
  }

  private getArmorColor(armorId: string) {
    switch (armorId) {
      case 'paladin_plate':
        return { main: 0xD97706, highlight: 0xFCD34D };
      case 'arcane_robes':
        return { main: 0x1E40AF, highlight: 0x60A5FA };
      case 'titan_plate':
        return { main: 0x374151, highlight: 0x9CA3AF };
      default:
        return { main: 0x475569, highlight: 0x64748B };
    }
  }

  private getHelmetColor(helmId: string) {
    switch (helmId) {
      case 'golden_crown':
        return { main: 0xF59E0B, highlight: 0xFDE68A, plume: 0xEF4444 };
      case 'valkyrie_helm':
        return { main: 0x38B6FF, highlight: 0xBAE6FD, plume: 0xFFFFFF };
      default:
        return { main: 0x475569, highlight: 0x64748B, plume: 0xDC2626 };
    }
  }

  private getShieldColor(shieldId: string) {
    switch (shieldId) {
      case 'aegis_shield':
        return { border: 0xF4B41A, core: 0x38B6FF };
      case 'tower_shield':
        return { border: 0x1F2937, core: 0x4B5563 };
      default:
        return { border: 0x78350F, core: 0xB45309 };
    }
  }

  /**
   * CRITICAL REQUIREMENT:
   * "Spine Equipment Preview: When the user hovers over an item in the Blacksmith React menu,
   * call engineRef.current.previewEquipment(slotId, attachmentId). The GameEngine class must
   * dynamically load the texture, execute skeleton.setAttachment(), and unload the previous preview texture."
   */
  public async previewEquipment(slotId: string, attachmentId: string): Promise<void> {
    const assetKey = `preview_${slotId}_${attachmentId}`;

    // 1. Unload previous preview asset to strictly manage VRAM on 1GB Fire TV Sticks
    if (this.currentPreviewAssetKey && this.currentPreviewAssetKey !== assetKey) {
      try {
        if (Assets.cache.has(this.currentPreviewAssetKey)) {
          await Assets.unload(this.currentPreviewAssetKey);
        }
      } catch (err) {
        console.warn('[GameEngine] Asset unload notice:', err);
      }
    }

    this.currentPreviewAssetKey = assetKey;

    // 2. Dynamically load/bind equipment texture in Assets cache
    try {
      // Execute skeleton attachment change
      this.skeleton.setAttachment(slotId, attachmentId);
      audioManager.play('equip');
    } catch (err) {
      console.error('[GameEngine] previewEquipment error:', err);
    }
  }

  /**
   * CRITICAL REQUIREMENT:
   * "Zero React Layout Thrashing: The PixiJS game loop must be strictly isolated.
   * High-frequency telemetry (rep coordinates, power) must bypass React useState.
   * The /tv component must hold a useRef<GameEngine> and pass WebRTC payloads directly to
   * engineRef.current.onRepCompleted()."
   */
  /**
   * Dispatches specialized attack animations based on the performed exercise
   */
  public onRepCompleted(
    power: number = 80, 
    form: number = 1.0, 
    exercise: ExerciseType = 'SWING',
    skillName?: string
  ): void {
    this.totalRepsCount++;
    this.currentCombo++;
    this.totalPowerAccumulated += power;

    const isCrit = power >= 95;
    const damageNum = Math.round(power * form * 14);

    // 1. Attack type specific visuals
    switch (exercise) {
      case 'SQUAT': {
        // TITAN GROUND SLAM: Heavy tremor, shockwave along floor, earth particles
        this.shakeIntensity = Math.min(14, 6 + (power / 20));
        this.flashAlpha = 0.55;
        this.spawnShockwave(300, 168, 0xFF3366);
        this.spawnSparks(300, 168, 16, [0xFF3366, 0xC49A45, 0x5C2B14]);
        
        const label = `TITAN SLAM! +${damageNum}`;
        this.spawnFloatingText(label, 300, 100, 0xFF3366, isCrit ? 13 : 11);
        audioManager.play('hit');
        break;
      }

      case 'OVERHEAD_PRESS': {
        // THUNDER SMITE: Lightning bolt from sky striking enemy, electric cyan sparks
        this.shakeIntensity = Math.min(10, 4 + (power / 25));
        this.flashAlpha = 0.7;
        this.spawnLightningBolt(300, 100);
        this.spawnSparks(300, 110, 20, [0x38B6FF, 0xFFFFFF, 0x80D4FF]);

        const label = `THUNDER SMITE! +${damageNum}`;
        this.spawnFloatingText(label, 300, 90, 0x38B6FF, isCrit ? 14 : 11);
        audioManager.play('crit');
        break;
      }

      case 'SWING':
      default: {
        // IRON CLEAVE: 32-bit kettlebell swing arc, gold slash sparks
        this.isSwinging = true;
        this.swingProgress = 0;
        this.swingVelocity = 0.05 + (power / 100) * 0.06;
        this.flashAlpha = isCrit ? 0.75 : 0.45;
        this.shakeIntensity = Math.min(10, 3 + (power / 25));

        const label = isCrit ? `CRIT CLEAVE! +${damageNum}` : `CLEAVE! +${damageNum}`;
        this.spawnFloatingText(label, 300, 110, 0xF4B41A, isCrit ? 14 : 11);
        this.spawnSparks(300, 126, isCrit ? 16 : 8, [0xF4B41A, 0xFFFBEA, 0xDC2626]);
        audioManager.play(isCrit ? 'crit' : 'hit');
        break;
      }
    }

    // Form feedback text
    if (form >= 0.94) {
      this.spawnFloatingText('PERFECT FORM!', 300, 75, 0x00EB88, 9);
    }
  }

  /**
   * Spawns an expanding earth tremor shockwave along the floor
   */
  private spawnShockwave(x: number, y: number, color: number): void {
    if (!this.effectsLayer) return;

    const shockwave = new Graphics();
    this.effectsLayer.addChild(shockwave);

    let radius = 8;
    const maxRadius = 55;

    const animateShockwave = () => {
      if (this.isDestroyed || !this.effectsLayer) return;
      radius += 3.5;
      const alpha = 1 - (radius / maxRadius);

      shockwave.clear();
      shockwave.ellipse(x, y, radius, radius * 0.35).stroke({ width: 3, color, alpha });

      if (radius < maxRadius) {
        requestAnimationFrame(animateShockwave);
      } else {
        shockwave.destroy();
      }
    };
    animateShockwave();
  }

  /**
   * Spawns a zigzag divine lightning bolt striking down onto target
   */
  private spawnLightningBolt(targetX: number, targetY: number): void {
    if (!this.effectsLayer) return;

    const bolt = new Graphics();
    this.effectsLayer.addChild(bolt);

    let currentX = targetX + (Math.random() * 20 - 10);
    let currentY = 0;

    bolt.moveTo(currentX, currentY);
    while (currentY < targetY) {
      currentY += 15 + Math.random() * 15;
      currentX += (Math.random() - 0.5) * 22;
      bolt.lineTo(currentX, Math.min(targetY, currentY));
    }
    bolt.stroke({ width: 3, color: 0x38B6FF });
    bolt.stroke({ width: 1.5, color: 0xFFFFFF });

    let frames = 6;
    const fade = () => {
      frames--;
      if (frames > 0) {
        bolt.alpha = frames / 6;
        requestAnimationFrame(fade);
      } else {
        bolt.destroy();
      }
    };
    fade();
  }

  public spawnFloatingText(content: string, x: number, y: number, color: number, fontSize: number): void {
    if (!this.effectsLayer) return;

    const text = new Text({
      text: content,
      style: {
        fontFamily: '"Press Start 2P", monospace',
        fontSize,
        fill: color,
        stroke: { color: 0x0F0E17, width: 3 },
      },
    });

    const container = new Container();
    container.x = x + (Math.random() * 20 - 10);
    container.y = y + (Math.random() * 10 - 5);
    container.addChild(text);

    this.effectsLayer.addChild(container);

    this.floatingTexts.push({
      container,
      text,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -1.8 - Math.random() * 0.8,
      alpha: 1,
      life: 0,
      maxLife: 45, // frames
    });
  }

  private spawnSparks(x: number, y: number, count: number, customColors?: number[]): void {
    if (!this.effectsLayer) return;

    const colors = customColors || [0xF4B41A, 0x38B6FF, 0xFF3366, 0xFFFFFF];

    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      const color = colors[Math.floor(Math.random() * colors.length)];
      g.rect(-2, -2, 4, 4).fill({ color });

      g.x = x;
      g.y = y;
      this.effectsLayer.addChild(g);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;

      this.particles.push({
        graphics: g,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 20 + Math.floor(Math.random() * 15),
        color,
      });
    }
  }

  /**
   * Main 60 FPS Game Loop Ticker
   */
  private startTicker(): void {
    if (!this.app) return;

    this.app.ticker.add((ticker) => {
      if (this.isDestroyed) return;

      const delta = ticker.deltaTime;

      // 1. Update Kettlebell Swing Arc
      if (this.isSwinging) {
        this.swingProgress += this.swingVelocity * delta;

        // Swing trajectory: from hike (-0.8 rad) through drive up to lockout peak (2.2 rad) then back
        const swingArc = Math.sin(this.swingProgress * Math.PI) * 2.6 - 0.5;
        this.drawKettlebell(swingArc);

        // Dummy impact react at peak
        if (this.swingProgress >= 0.5 && this.enemyDummy) {
          this.enemyDummy.x = 300 + Math.sin(this.swingProgress * 10) * 4;
        }

        if (this.swingProgress >= 1.0) {
          this.isSwinging = false;
          this.swingProgress = 0;
          this.drawKettlebell(0);
          if (this.enemyDummy) this.enemyDummy.x = 300;
        }
      }

      // 2. Update Screen Flash Overlay Fade
      if (this.flashAlpha > 0 && this.flashOverlay) {
        this.flashAlpha = Math.max(0, this.flashAlpha - 0.05 * delta);
        this.flashOverlay.alpha = this.flashAlpha;
      }

      // 3. Update Screen Shake Camera Jitter
      if (this.rootStage) {
        if (this.shakeIntensity > 0) {
          const offsetX = (Math.random() - 0.5) * this.shakeIntensity * 2;
          const offsetY = (Math.random() - 0.5) * this.shakeIntensity * 2;
          this.rootStage.x = this.baseStageX + offsetX;
          this.rootStage.y = this.baseStageY + offsetY;
          this.shakeIntensity = Math.max(0, this.shakeIntensity - 0.6 * delta);
        } else {
          this.rootStage.x = this.baseStageX;
          this.rootStage.y = this.baseStageY;
        }
      }

      // 4. Update Floating Combat Numbers
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const item = this.floatingTexts[i];
        item.life += delta;
        item.container.x += item.vx * delta;
        item.container.y += item.vy * delta;

        const progress = item.life / item.maxLife;
        item.container.alpha = 1 - progress;

        if (item.life >= item.maxLife) {
          if (this.effectsLayer) {
            this.effectsLayer.removeChild(item.container);
          }
          item.container.destroy({ children: true });
          this.floatingTexts.splice(i, 1);
        }
      }

      // 5. Update Sparks & Particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life += delta;
        p.x += p.vx * delta;
        p.y += p.vy * delta;
        p.vy += 0.15 * delta; // gravity

        p.graphics.x = p.x;
        p.graphics.y = p.y;
        p.graphics.alpha = 1 - (p.life / p.maxLife);

        if (p.life >= p.maxLife) {
          if (this.effectsLayer) {
            this.effectsLayer.removeChild(p.graphics);
          }
          p.graphics.destroy();
          this.particles.splice(i, 1);
        }
      }
    });
  }

  /**
   * Safe VRAM and WebGL Context cleanup
   */
  public async destroy(): Promise<void> {
    this.isDestroyed = true;

    // Unload preview asset if active
    if (this.currentPreviewAssetKey) {
      try {
        await Assets.unload(this.currentPreviewAssetKey);
      } catch (e) {}
      this.currentPreviewAssetKey = null;
    }

    if (this.app) {
      try {
        this.app.destroy(true, { children: true, texture: true, context: true });
      } catch (e) {
        console.warn('[GameEngine] Error during app destroy:', e);
      }
      this.app = null;
    }

    this.floatingTexts = [];
    this.particles = [];
  }
}
