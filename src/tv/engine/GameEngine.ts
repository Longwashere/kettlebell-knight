import { Application, Container, Graphics, Text, Assets, Sprite, Texture, Cache } from 'pixi.js';
import { Spine, SpineTexture } from '@esotericsoftware/spine-pixi-v8';
import type { TextureAtlas } from '@esotericsoftware/spine-core';
import { audioManager } from '../../shared/AudioManager';
import { ExerciseType } from '../../types/game';
import type { MonsterSprite } from '../../types/battle';

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

// Spine knight rig (public/assets/spine/knight, Spine 4.2). Skeleton is ~540 units tall;
// 0.15 gives a ~80px knight on the 426x240 canvas.
const KNIGHT_SKELETON_KEY = '/assets/spine/knight/HulkForm2.json';
const KNIGHT_ATLAS_KEY = '/assets/spine/knight/HulkForm2.atlas';
const KNIGHT_SCALE = 0.15;
// Lifts combatants + effects so they stand above the battle card hand (which covers the lower half).
const SCENE_RAISE_Y = 40;
let knightAssetRefs = 0; // engines currently holding the shared knight assets
const KNIGHT_SWING_COMBO = ['ATTACK1', 'ATTACK2', 'ATTACK4'];
const KNIGHT_HIT_REACTIONS = ['HIT1', 'HIT2', 'HIT3'];

interface MonsterRig {
  skeleton: string;
  atlas: string;
  scale: number; // sized against the ~80px knight; rigs carry their own ground shadow
  idle: string;
  appear?: string;
  attack: string;
  heavyAttack: string;
  defend?: string;
  hit: string;
  death: string;
}

// Spine 4.2 monster rigs (public/assets/spine/monsters). They're authored facing right (or
// front-on), so they're mirrored to face the knight. Only the current monster's rig is loaded.
const MONSTER_DIR = '/assets/spine/monsters';
const MONSTER_RIGS: Record<MonsterSprite, MonsterRig> = {
  SLIME: {
    skeleton: `${MONSTER_DIR}/greenSlime/TuXi01.json`,
    atlas: `${MONSTER_DIR}/greenSlime/TuXi01.atlas`,
    scale: 0.12,
    idle: 'Idle',
    attack: 'Atk1',
    heavyAttack: 'Skl1',
    hit: 'Hit',
    death: 'Death',
  },
  TREEMON: {
    skeleton: `${MONSTER_DIR}/Treemon/XiaoShuRen.json`,
    atlas: `${MONSTER_DIR}/Treemon/XiaoShuRen.atlas`,
    scale: 0.14,
    idle: 'Idle',
    appear: 'Appear',
    attack: 'Atk1',
    heavyAttack: 'Atk1',
    defend: 'Stun',
    hit: 'Hit',
    death: 'Death',
  },
  HELLHOUND: {
    skeleton: `${MONSTER_DIR}/2headedDog/DiYuShuangTouQuan.json`,
    atlas: `${MONSTER_DIR}/2headedDog/DiYuShuangTouQuan.atlas`,
    scale: 0.16,
    idle: 'Idle',
    appear: 'Appear_03',
    attack: 'Attack',
    heavyAttack: 'Skill',
    hit: 'Hit',
    death: 'Death',
  },
};
const MONSTER_X = 300;
const MONSTER_LUNGE_DISTANCE = 110; // how far toward the knight an attack dashes
const monsterAssetRefs = new Map<string, number>(); // shared rig → engines holding it

/**
 * Unloads a Spine rig's skeleton + atlas. Spine.from() caches parsed SkeletonData under its own
 * key and never evicts it, so drop that too or a later reload would reuse destroyed textures.
 */
async function unloadSpineRig(skeleton: string, atlas: string, scale: number): Promise<void> {
  const skeletonDataKey = `${skeleton}-${atlas}-${scale}`;
  if (Cache.has(skeletonDataKey)) Cache.remove(skeletonDataKey);
  try {
    await Assets.unload([skeleton, atlas]);
  } catch (e) {}
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
  private resizeObserver: ResizeObserver | null = null;
  private isDestroyed: boolean = false;

  // Scene containers
  private rootStage: Container | null = null;
  private bgLayer: Container | null = null;
  private gameLayer: Container | null = null;
  private effectsLayer: Container | null = null;
  private uiLayer: Container | null = null;

  // Visual Entities
  private knightContainer: Container | null = null;
  private knightSpine: Spine | null = null;
  private attackComboIndex: number = 0;
  private hitReactionIndex: number = 0;
  private holdsKnightAssets: boolean = false;
  private knightLocked: boolean = false; // true while on a terminal pose (victory / defeat)
  private enemyDummy: Container | null = null;
  private monsterSpine: Spine | null = null;
  private monsterRig: MonsterRig | null = null;
  private monsterSprite: MonsterSprite = 'SLIME'; // requested monster; may arrive before init()
  private heldMonsterRig: MonsterRig | null = null; // rig this engine holds an asset ref on
  private monsterLoadToken = 0; // discards stale loads when monsters are switched quickly
  private monsterLocked = false; // true once the death animation starts
  private monsterLungeT = 1; // 0→1 during an attack dash; 1 = idle at home
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
    canvas.style.position = 'absolute';
    canvas.style.display = 'block';
    canvas.style.imageRendering = 'pixelated';

    this.containerElement.replaceChildren(canvas);
    this.fitCanvas();
    this.resizeObserver = new ResizeObserver(() => this.fitCanvas());
    this.resizeObserver.observe(this.containerElement);

    this.buildScene();
    await this.loadKnightSpine();
    if (this.isDestroyed) return;
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

    this.gameLayer.y = -SCENE_RAISE_Y;
    this.effectsLayer.y = -SCENE_RAISE_Y;

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
    this.flashOverlay.y = SCENE_RAISE_Y; // cancel the effects-layer raise so the flash stays fullscreen
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
    shadow.ellipse(0, 0, 28, 6).fill({ color: 0x000000, alpha: 0.45 });
    this.knightContainer.addChild(shadow);

    this.gameLayer.addChild(this.knightContainer);
  }

  /**
   * Scales the 426x240 canvas by the largest whole number that fits and centres it on whole pixels.
   * A fractional stretch (e.g. 4.507x at 1080p) makes some pixel columns wider than others.
   */
  private fitCanvas(): void {
    if (!this.app) return;
    const canvas = this.app.canvas;
    const { width, height } = this.app.screen;
    const boxW = this.containerElement.clientWidth;
    const boxH = this.containerElement.clientHeight;
    const fit = Math.min(boxW / width, boxH / height);
    const scale = fit >= 1 ? Math.floor(fit) : fit; // tiny windows fall back to a fractional fit
    const cssW = Math.round(width * scale);
    const cssH = Math.round(height * scale);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.style.left = `${Math.floor((boxW - cssW) / 2)}px`;
    canvas.style.top = `${Math.floor((boxH - cssH) / 2)}px`;
  }

  /**
   * Loads the Spine knight rig (HulkForm2, Spine 4.2) and mounts it in the knight container.
   * Feet sit on the container origin; the rig faces right toward the enemy.
   */
  private async loadKnightSpine(): Promise<void> {
    if (!this.knightContainer) return;

    try {
      // Asset URLs double as cache keys (no aliases), so Spine.from can resolve them directly.
      knightAssetRefs++;
      this.holdsKnightAssets = true;
      await Assets.load([KNIGHT_SKELETON_KEY, KNIGHT_ATLAS_KEY]);
      if (this.isDestroyed || !this.knightContainer) return;

      const spine = Spine.from({
        skeleton: KNIGHT_SKELETON_KEY,
        atlas: KNIGHT_ATLAS_KEY,
        scale: KNIGHT_SCALE,
        autoUpdate: true,
      });
      // Animate on the same ticker that renders (default is Ticker.shared, a separate rAF loop).
      if (this.app) spine.ticker = this.app.ticker;
      // Atlas is exported at KNIGHT_SCALE (texel ≈ canvas pixel); re-export it if KNIGHT_SCALE changes.
      // Linear, not nearest: the rig's parts are rotated, and nearest sampling of rotated texels
      // drops/duplicates pixels into jagged cross-hatching. No mipmaps needed at ~1:1.
      for (const page of Assets.get<TextureAtlas>(KNIGHT_ATLAS_KEY).pages) {
        const source = (page.texture as SpineTexture).texture.source;
        source.autoGenerateMipmaps = false;
        source.style.scaleMode = 'linear';
        source.style.update(); // invalidate the cached GPU sampler so the new filter applies
      }
      spine.state.data.defaultMix = 0.08;
      spine.state.setAnimation(0, 'IDLE', true);

      this.knightSpine = spine;
      this.knightContainer.addChild(spine);
    } catch (err) {
      console.error('[GameEngine] Failed to load knight Spine rig:', err);
    }
  }

  /**
   * Plays a one-shot knight animation and returns to IDLE afterwards.
   */
  private playKnightAnimation(name: string): void {
    const spine = this.knightSpine;
    if (!spine || this.knightLocked) return;
    if (!spine.skeleton.data.findAnimation(name)) return;

    spine.state.setAnimation(0, name, false);
    spine.state.addAnimation(0, 'IDLE', true, 0);
  }

  /** Knight hit reaction; cycles HIT1-3 so repeated hits don't look identical. */
  public playKnightHit(): void {
    this.playKnightAnimation(KNIGHT_HIT_REACTIONS[this.hitReactionIndex++ % KNIGHT_HIT_REACTIONS.length]);
  }

  /** Victory pose (WIN), held until resetKnight(). */
  public playKnightVictory(): void {
    const spine = this.knightSpine;
    if (!spine || this.knightLocked) return;
    this.knightLocked = true;
    spine.state.setAnimation(0, 'WIN', false);
    spine.state.addAnimation(0, 'IDLE', true, 0);
  }

  /** Defeat: DEAD_START then DEAD_LOOP, held until resetKnight(). */
  public playKnightDefeat(): void {
    const spine = this.knightSpine;
    if (!spine || this.knightLocked) return;
    this.knightLocked = true;
    spine.state.setAnimation(0, 'DEAD_START', false);
    spine.state.addAnimation(0, 'DEAD_LOOP', true, 0);
  }

  /** Level-up celebration (LEVEL_UP), then back to IDLE. */
  public playKnightLevelUp(): void {
    this.playKnightAnimation('LEVEL_UP');
  }

  /** Power-up / buff cast (BUFF), then back to IDLE. */
  public playKnightBuff(): void {
    this.playKnightAnimation('BUFF');
  }

  /** Clears victory/defeat lock and returns the knight to IDLE (new battle). */
  public resetKnight(): void {
    this.knightLocked = false;
    this.knightSpine?.state.setAnimation(0, 'IDLE', true);
  }

  private createTrainingDummy(): void {
    if (!this.gameLayer) return;

    this.enemyDummy = new Container();
    this.enemyDummy.x = MONSTER_X;
    this.enemyDummy.y = 168;
    this.gameLayer.addChild(this.enemyDummy);

    void this.loadMonster(this.monsterSprite);
  }

  /**
   * Swaps the enemy to the given Spine monster. Safe to call before init(): the request is
   * remembered and loaded once the scene exists.
   */
  public setMonster(type: MonsterSprite = 'SLIME'): void {
    // Already showing (or loading) this monster alive: nothing to do.
    if (this.heldMonsterRig === MONSTER_RIGS[type] && !this.monsterLocked) return;
    this.monsterSprite = type;
    if (this.enemyDummy) void this.loadMonster(type);
  }

  /**
   * Loads a monster rig, mounts it facing the knight, and releases the previous rig's
   * textures so only one monster atlas is resident on the Fire TV at a time.
   */
  private async loadMonster(type: MonsterSprite): Promise<void> {
    const token = ++this.monsterLoadToken;
    const rig = MONSTER_RIGS[type];

    this.clearMonster();
    monsterAssetRefs.set(rig.skeleton, (monsterAssetRefs.get(rig.skeleton) ?? 0) + 1);
    this.heldMonsterRig = rig;

    try {
      await Assets.load([rig.skeleton, rig.atlas]);
    } catch (err) {
      console.error(`[GameEngine] Failed to load monster rig ${type}:`, err);
      return;
    }
    if (this.isDestroyed || token !== this.monsterLoadToken || !this.enemyDummy) return;

    const spine = Spine.from({ skeleton: rig.skeleton, atlas: rig.atlas, scale: rig.scale, autoUpdate: true });
    if (this.app) spine.ticker = this.app.ticker;
    spine.scale.x *= -1; // face the knight
    // Full-resolution atlases drawn at ~15-30%: linear mipmaps keep them from shimmering.
    // (Pixi skips mipmaps where WebGL1 can't do them for non-power-of-two pages.)
    for (const page of Assets.get<TextureAtlas>(rig.atlas).pages) {
      const source = (page.texture as SpineTexture).texture.source;
      source.autoGenerateMipmaps = true;
      source.style.scaleMode = 'linear';
      source.style.mipmapFilter = 'linear';
      source.style.update();
    }
    spine.state.data.defaultMix = 0.1;
    if (rig.appear) {
      spine.state.setAnimation(0, rig.appear, false);
      spine.state.addAnimation(0, rig.idle, true, 0);
    } else {
      spine.state.setAnimation(0, rig.idle, true);
    }

    this.monsterSpine = spine;
    this.monsterRig = rig;
    this.monsterLocked = false;
    this.monsterLungeT = 1;
    this.enemyDummy.addChild(spine);
  }

  /** Destroys the current monster and unloads its assets once no engine holds them. */
  private clearMonster(): void {
    this.monsterSpine?.destroy();
    this.monsterSpine = null;
    this.monsterRig = null;

    const held = this.heldMonsterRig;
    if (!held) return;
    this.heldMonsterRig = null;
    const refs = (monsterAssetRefs.get(held.skeleton) ?? 1) - 1;
    if (refs > 0) {
      monsterAssetRefs.set(held.skeleton, refs);
    } else {
      monsterAssetRefs.delete(held.skeleton);
      void unloadSpineRig(held.skeleton, held.atlas, held.scale);
    }
  }

  /** Plays a one-shot monster animation and returns to idle afterwards. */
  private playMonsterAnimation(name: string | undefined): void {
    const spine = this.monsterSpine;
    const rig = this.monsterRig;
    if (!spine || !rig || !name || this.monsterLocked) return;
    spine.state.setAnimation(0, name, false);
    spine.state.addAnimation(0, rig.idle, true, 0);
  }

  /** Monster flinches when a card lands. */
  public playMonsterHit(): void {
    this.playMonsterAnimation(this.monsterRig?.hit);
  }

  /** Monster gains block (DEFEND intent). */
  public playMonsterDefend(): void {
    this.playMonsterAnimation(this.monsterRig?.defend);
  }

  /** Death animation, held on its last frame until the next monster loads. */
  public playMonsterDeath(): void {
    const spine = this.monsterSpine;
    const rig = this.monsterRig;
    if (!spine || !rig || this.monsterLocked) return;
    this.monsterLocked = true;
    this.monsterLungeT = 1;
    spine.state.setAnimation(0, rig.death, false);
  }

  /**
   * Monster attack: plays its attack animation while dashing toward the knight and back.
   */
  public monsterAttackLunge(heavy: boolean = false): void {
    if (!this.enemyDummy || this.monsterLocked) return;

    this.flashAlpha = 0.65;
    this.shakeIntensity = heavy ? 10 : 8;

    // Knight reels from the hit
    this.playKnightHit();

    this.playMonsterAnimation(heavy ? this.monsterRig?.heavyAttack : this.monsterRig?.attack);
    this.monsterLungeT = 0;

    // Claw slash graphic
    if (this.effectsLayer) {
      const lungeX = MONSTER_X - MONSTER_LUNGE_DISTANCE;
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
  }

  /**
   * Animates a defensive shield pulse around Sir Kettleburne
   */
  public playerShieldPulse(): void {
    if (!this.effectsLayer || !this.knightContainer) return;

    this.playKnightAnimation('DEFENSE');

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
   * Equipment hook. The Spine knight currently ships a single fixed skin (sword, shield, helm),
   * so equipped item ids are tracked in `equippedSlots` but not yet re-skinned on the rig.
   */
  private updateKnightVisuals(): void {
    // Intentionally empty until equipment attachments exist on the Spine rig.
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
        this.playKnightAnimation('ATTACK3');
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
        this.playKnightAnimation('SKILL1');
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
        // IRON CLEAVE: knight sword combo (ATTACK1/2/4 alternate), gold slash sparks
        this.playKnightAnimation(KNIGHT_SWING_COMBO[this.attackComboIndex++ % KNIGHT_SWING_COMBO.length]);
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

    this.playMonsterHit();

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

      // 1. Update swing timing (drives enemy impact reaction; the knight arc is a Spine animation)
      let enemyShakeX = 0;
      if (this.isSwinging) {
        this.swingProgress += this.swingVelocity * delta;

        // Monster impact react at peak
        if (this.swingProgress >= 0.5) {
          enemyShakeX = Math.sin(this.swingProgress * 10) * 4;
        }

        if (this.swingProgress >= 1.0) {
          this.isSwinging = false;
          this.swingProgress = 0;
          enemyShakeX = 0;
        }
      }

      // Monster attack dash: out toward the knight and back over ~0.5s
      if (this.monsterLungeT < 1) {
        this.monsterLungeT = Math.min(1, this.monsterLungeT + ticker.deltaMS / 500);
      }
      if (this.enemyDummy) {
        const lunge = Math.sin(this.monsterLungeT * Math.PI) * MONSTER_LUNGE_DISTANCE;
        this.enemyDummy.x = MONSTER_X - lunge + enemyShakeX;
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
    this.knightSpine = null;
    this.clearMonster();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    // Unload Spine knight textures/data to avoid VRAM leaks across scene changes
    if (this.holdsKnightAssets) {
      this.holdsKnightAssets = false;
      knightAssetRefs--;
      if (knightAssetRefs <= 0) {
        await unloadSpineRig(KNIGHT_SKELETON_KEY, KNIGHT_ATLAS_KEY, KNIGHT_SCALE);
      }
    }

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
