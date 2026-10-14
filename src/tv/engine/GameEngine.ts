import { Application, Container, Graphics, Text, Assets, Sprite, Texture, Cache } from 'pixi.js';
import { Spine, SpineTexture } from '@esotericsoftware/spine-pixi-v8';
import type { TextureAtlas } from '@esotericsoftware/spine-core';
import { audioManager } from '../../shared/AudioManager';
import { ExerciseType, EXERCISE_SKILLS } from '../../types/game';
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

interface ActiveProjectile {
  container: Container;
  graphics: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  life: number;
  maxLife: number;
  rotationSpeed?: number;
  trailColors?: number[];
  onHit: () => void;
  onUpdate?: (p: ActiveProjectile, delta: number) => void;
}

interface ActiveCombatEffect {
  container: Container;
  life: number;
  maxLife: number;
  onUpdate: (eff: ActiveCombatEffect, delta: number) => boolean;
  onDestroy?: () => void;
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
// Battle arena background textures (clean 1:1 retro canvas match)
export const BATTLE_MAPS = {
  CATHEDRAL_CRYPT: '/assets/backgrounds/cathedral_crypt.webp',
  DARK_FOREST: '/assets/backgrounds/dark_forest.webp',
  VERDANT_FOREST: '/assets/backgrounds/verdant_forest.webp',
  OBSIDIAN_THRONE: '/assets/backgrounds/obsidian_throne.webp',
  VOLCANIC_FORGE: '/assets/backgrounds/volcanic_forge.webp',
  BLOOD_CEMETERY: '/assets/backgrounds/blood_cemetery.webp',
  SUNKEN_CISTERN: '/assets/backgrounds/sunken_cistern.webp',
  BELFRY_RAMPARTS: '/assets/backgrounds/belfry_ramparts.webp',
  ELDRITCH_ALTAR: '/assets/backgrounds/eldritch_altar.webp',
  CATHEDRAL_VAULT: '/assets/backgrounds/cathedral_vault.webp',
  TOWN_NIGHT: '/assets/backgrounds/town_night.webp',
  TOWN_SQUARE: '/assets/backgrounds/town_square.webp',
} as const;

export type BattleMapId = keyof typeof BATTLE_MAPS;

const BATTLE_BG_KEY = BATTLE_MAPS.CATHEDRAL_CRYPT;
const MONSTER_BACKGROUNDS: Record<MonsterSprite, string> = {
  TREEMON: BATTLE_MAPS.DARK_FOREST,
  SLIME: BATTLE_MAPS.SUNKEN_CISTERN,
  HELLHOUND: BATTLE_MAPS.VOLCANIC_FORGE,
  BOAR: BATTLE_MAPS.VERDANT_FOREST,
  DEMON_MONK: BATTLE_MAPS.ELDRITCH_ALTAR,
  WOLF: BATTLE_MAPS.BLOOD_CEMETERY,
};
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
  flipX?: boolean;
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
  BOAR: {
    skeleton: `${MONSTER_DIR}/boar/monster_3010101.json`,
    atlas: `${MONSTER_DIR}/boar/monster_3010101.atlas`,
    scale: 0.38,
    idle: 'idle',
    attack: 'skill',
    heavyAttack: 'skill2',
    hit: 'hit',
    death: 'die',
    flipX: false, // boar is authored facing left toward the knight
  },
  DEMON_MONK: {
    skeleton: `${MONSTER_DIR}/demonMonk/spine_monster_201150001.json`,
    atlas: `${MONSTER_DIR}/demonMonk/spine_monster_201150001.atlas`,
    scale: 0.26,
    idle: 'idle',
    attack: 'attack',
    heavyAttack: 'bothcast',
    defend: 'selfcast',
    hit: 'hit',
    death: 'hit',
    flipX: false, // demon monk is authored facing left toward the knight
  },
  WOLF: {
    skeleton: `${MONSTER_DIR}/wolf/Unit_Spine_Wolf1.json`,
    atlas: `${MONSTER_DIR}/wolf/Unit_Spine_Wolf1.atlas`,
    scale: 0.13,
    idle: 'stand',
    appear: 'posture',
    attack: 'attack',
    heavyAttack: 'skill1',
    hit: 'hurt',
    death: 'death',
    flipX: false, // wolf is authored facing left toward the knight
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
export interface MonsterSlot {
  container: Container;
  shadow: Graphics;
  spine: Spine | null;
  rig: MonsterRig | null;
  spriteType: MonsterSprite;
  slotIndex: number;
  baseX: number;
  baseY: number;
  isAlive: boolean;
  isLocked: boolean; // true once death animation starts
  lungeT: number;
  shakeX: number;
}

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
  private currentBgKey: string | null = null;
  private monsterLoadToken = 0; // discards stale loads when monsters are switched quickly
  private monsterLocked = false; // true once the death animation starts
  private monsterLungeT = 1; // 0→1 during an attack dash; 1 = idle at home

  // Multi-Monster Encounters (1 to 3 monsters simultaneously)
  private monsterSlots: MonsterSlot[] = [];
  private targetSlotIndex: number = 0;
  private targetReticle: Graphics | null = null;
  private queuedMonsters: MonsterSprite[] = ['SLIME'];
  private flashOverlay: Graphics | null = null;

  // Animation States
  private swingProgress: number = 0; // 0 to 1 during swing
  private isSwinging: boolean = false;
  private swingVelocity: number = 0;
  private flashAlpha: number = 0;
  private shakeIntensity: number = 0;
  private baseStageX: number = 0;
  private baseStageY: number = 0;

  // Dynamic Camera & Zoom (late 90s dark fantasy cinematic action)
  private cameraZoom: number = 1.0;
  private targetCameraZoom: number = 1.0;
  private cameraFocusX: number = 213; // default screen center (426 / 2)
  private cameraFocusY: number = 120; // default screen center (240 / 2)
  private targetCameraFocusX: number = 213;
  private targetCameraFocusY: number = 120;

  // Combat entities
  private floatingTexts: FloatingCombatText[] = [];
  private particles: Particle[] = [];
  private activeProjectiles: ActiveProjectile[] = [];
  private activeEffects: ActiveCombatEffect[] = [];

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
    void this.loadBackground();
  }

  public async loadBackground(bgKey?: string): Promise<void> {
    if (!this.bgLayer) return;
    const targetKey = bgKey ?? MONSTER_BACKGROUNDS[this.monsterSprite] ?? BATTLE_BG_KEY;
    if (this.currentBgKey === targetKey && this.bgLayer.children.length > 0) return;

    try {
      const texture = await Assets.load(targetKey);
      if (this.isDestroyed || !this.bgLayer) return;

      // Unload previous background from VRAM to preserve 1GB Fire TV memory
      if (this.currentBgKey && this.currentBgKey !== targetKey && Assets.cache.has(this.currentBgKey)) {
        try {
          await Assets.unload(this.currentBgKey);
        } catch (e) {}
      }
      this.currentBgKey = targetKey;

      const bgSprite = new Sprite(texture);
      // Exact 1:1 native pixel-perfect mapping on 426x240 retro canvas
      bgSprite.width = 426;
      bgSprite.height = 240;
      bgSprite.x = 0;
      // Shift up by 32px so the floor horizon (y=144 in image) sits at y=112,
      // placing combatants (y=128) firmly 16px deep onto the stone floor tiles.
      bgSprite.y = -32;

      const darkBase = new Graphics();
      darkBase.rect(-50, -30, 526, 300).fill({ color: 0x12101E });

      this.bgLayer.removeChildren();
      this.bgLayer.addChild(darkBase);
      this.bgLayer.addChild(bgSprite);
    } catch (err) {
      console.warn('[GameEngine] Failed to load battle background texture:', err);
    }
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

    this.createTargetReticle();
    void this.setMonsters(this.queuedMonsters);
  }

  private createTargetReticle(): void {
    if (!this.gameLayer) return;
    this.targetReticle = new Graphics();
    // Glowing retro arrow pointing down ▼
    this.targetReticle.poly([-5, -12, 5, -12, 0, -3]).fill({ color: 0xF4B41A });
    this.targetReticle.poly([-3, -10, 3, -10, 0, -4]).fill({ color: 0xFFFBEA });
    this.targetReticle.zIndex = 100;
    this.gameLayer.addChild(this.targetReticle);
  }

  /**
   * Sets multiple monsters (1 to 3) in formation on the battlefield.
   */
  public async setMonsters(monstersInput: (MonsterSprite | { spriteType: MonsterSprite })[]): Promise<void> {
    const token = ++this.monsterLoadToken;
    const requestedTypes: MonsterSprite[] = monstersInput.map(t => typeof t === 'string' ? t : t.spriteType);
    this.queuedMonsters = requestedTypes;

    if (!this.gameLayer) return;

    this.clearAllMonsters();

    const count = Math.min(3, Math.max(1, requestedTypes.length));
    const formations: { x: number; y: number; zIndex: number }[][] = [
      // 1 monster (Solo boss/target)
      [{ x: 310, y: 168, zIndex: 10 }],
      // 2 monsters (Diagonal depth: front & back)
      [
        { x: 285, y: 175, zIndex: 20 },
        { x: 345, y: 160, zIndex: 10 },
      ],
      // 3 monsters (Staggered triangle formation)
      [
        { x: 280, y: 176, zIndex: 30 },
        { x: 330, y: 158, zIndex: 10 },
        { x: 370, y: 170, zIndex: 20 },
      ],
    ];
    const coords = formations[count - 1];

    // Pick appropriate arena background
    if (requestedTypes.includes('HELLHOUND')) {
      void this.loadBackground(BATTLE_MAPS.VOLCANIC_FORGE);
    } else if (requestedTypes.includes('TREEMON')) {
      void this.loadBackground(BATTLE_MAPS.DARK_FOREST);
    } else {
      void this.loadBackground(BATTLE_MAPS.CATHEDRAL_CRYPT);
    }

    for (let i = 0; i < count; i++) {
      const type = requestedTypes[i];
      const pos = coords[i];

      const slotContainer = new Container();
      slotContainer.x = pos.x;
      slotContainer.y = pos.y;
      slotContainer.zIndex = pos.zIndex;

      // Drop shadow for monster
      const shadow = new Graphics();
      shadow.ellipse(0, 0, 24, 5).fill({ color: 0x000000, alpha: 0.4 });
      slotContainer.addChild(shadow);

      const rig = MONSTER_RIGS[type];
      const slot: MonsterSlot = {
        container: slotContainer,
        shadow,
        spine: null,
        rig,
        spriteType: type,
        slotIndex: i,
        baseX: pos.x,
        baseY: pos.y,
        isAlive: true,
        isLocked: false,
        lungeT: 1,
        shakeX: 0,
      };

      this.monsterSlots.push(slot);
      this.gameLayer.addChild(slotContainer);

      monsterAssetRefs.set(rig.skeleton, (monsterAssetRefs.get(rig.skeleton) ?? 0) + 1);

      try {
        await Assets.load([rig.skeleton, rig.atlas]);
      } catch (err) {
        console.error(`[GameEngine] Failed to load monster rig ${type}:`, err);
        continue;
      }

      if (this.isDestroyed || token !== this.monsterLoadToken) return;

      const spine = Spine.from({ skeleton: rig.skeleton, atlas: rig.atlas, scale: rig.scale, autoUpdate: true });
      if (this.app) spine.ticker = this.app.ticker;
      if (rig.flipX !== false) {
        spine.scale.x *= -1; // face knight on the left
      }

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

      slot.spine = spine;
      slotContainer.addChild(spine);
    }

    // Retain compatibility with legacy single-monster references
    this.monsterSpine = this.monsterSlots[0]?.spine ?? null;
    this.monsterRig = this.monsterSlots[0]?.rig ?? null;
    this.monsterSprite = requestedTypes[0];
    this.targetSlotIndex = 0;
  }

  /**
   * Legacy single-monster setter.
   */
  public setMonster(type: MonsterSprite = 'SLIME'): void {
    void this.setMonsters([type]);
  }

  /**
   * Sets which monster is currently targeted by Sir Kettleburne.
   */
  public setTargetMonster(index: number): void {
    if (index >= 0 && index < this.monsterSlots.length) {
      this.targetSlotIndex = index;
    }
  }

  /**
   * Returns the coordinates of the currently targeted alive monster (or first alive monster).
   */
  public getTargetMonsterPos(): { x: number; y: number } {
    const slot = this.monsterSlots[this.targetSlotIndex] ?? this.monsterSlots.find(s => s.isAlive);
    if (slot && slot.isAlive) {
      return { x: slot.baseX, y: slot.baseY };
    }
    return { x: 300, y: 168 };
  }

  /**
   * Returns positions of all alive monsters for AOE cleave attacks.
   */
  public getAllAliveMonsterPositions(): { x: number; y: number; slotIndex: number }[] {
    return this.monsterSlots
      .filter(s => s.isAlive && !s.isLocked)
      .map(s => ({ x: s.baseX, y: s.baseY, slotIndex: s.slotIndex }));
  }

  /** Destroys all current monster slots and unloads their assets. */
  private clearAllMonsters(): void {
    for (const slot of this.monsterSlots) {
      if (slot.spine) {
        slot.spine.destroy();
        slot.spine = null;
      }
      if (slot.container && this.gameLayer) {
        this.gameLayer.removeChild(slot.container);
        slot.container.destroy({ children: true });
      }
      if (slot.rig) {
        const refs = (monsterAssetRefs.get(slot.rig.skeleton) ?? 1) - 1;
        if (refs > 0) {
          monsterAssetRefs.set(slot.rig.skeleton, refs);
        } else {
          monsterAssetRefs.delete(slot.rig.skeleton);
          void unloadSpineRig(slot.rig.skeleton, slot.rig.atlas, slot.rig.scale);
        }
      }
    }
    this.monsterSlots = [];
    this.monsterSpine = null;
    this.monsterRig = null;
  }

  private clearMonster(): void {
    this.clearAllMonsters();
  }

  /** Plays an animation on a specific monster slot. */
  private playMonsterAnimationOnSlot(slot: MonsterSlot, name: string | undefined): void {
    if (!slot.spine || !slot.rig || !name || slot.isLocked) return;
    if (!slot.spine.skeleton.data.findAnimation(name)) return;
    slot.spine.state.setAnimation(0, name, false);
    slot.spine.state.addAnimation(0, slot.rig.idle, true, 0);
  }

  /** Monster flinches when an attack lands. */
  public playMonsterHit(slotIndex?: number): void {
    const slot = (slotIndex !== undefined ? this.monsterSlots[slotIndex] : null)
      ?? this.monsterSlots[this.targetSlotIndex]
      ?? this.monsterSlots.find(s => s.isAlive);
    if (!slot) return;
    this.playMonsterAnimationOnSlot(slot, slot.rig?.hit);
    slot.shakeX = (Math.random() > 0.5 ? 1 : -1) * 8;
  }

  /** All alive monsters flinch simultaneously from AOE cleave attacks. */
  public playAllMonstersHit(): void {
    for (const slot of this.monsterSlots) {
      if (slot.isAlive && !slot.isLocked) {
        this.playMonsterAnimationOnSlot(slot, slot.rig?.hit);
        slot.shakeX = (Math.random() > 0.5 ? 1 : -1) * 8;
      }
    }
  }

  /** Monster gains block (DEFEND intent). */
  public playMonsterDefend(slotIndex?: number): void {
    const slot = (slotIndex !== undefined ? this.monsterSlots[slotIndex] : null)
      ?? this.monsterSlots[this.targetSlotIndex]
      ?? this.monsterSlots.find(s => s.isAlive);
    if (!slot) return;
    this.playMonsterAnimationOnSlot(slot, slot.rig?.defend);
  }

  /** Monster plays death animation and fades away. */
  public playMonsterDeath(slotIndex?: number): void {
    const slot = (slotIndex !== undefined ? this.monsterSlots[slotIndex] : null)
      ?? this.monsterSlots[this.targetSlotIndex]
      ?? this.monsterSlots.find(s => s.isAlive);
    if (!slot || slot.isLocked) return;
    slot.isLocked = true;
    slot.isAlive = false;
    slot.lungeT = 1;

    if (slot.spine && slot.rig) {
      const deathAnim = slot.rig.death && slot.spine.skeleton.data.findAnimation(slot.rig.death)
        ? slot.rig.death
        : (slot.rig.hit && slot.spine.skeleton.data.findAnimation(slot.rig.hit) ? slot.rig.hit : null);

      if (deathAnim) {
        slot.spine.state.setAnimation(0, deathAnim, false);
      }
      let fadeProgress = 0;
      const interval = setInterval(() => {
        fadeProgress += 0.08;
        if (slot.container) {
          slot.container.alpha = Math.max(0, 1 - fadeProgress);
        }
        if (fadeProgress >= 1) {
          clearInterval(interval);
        }
      }, 50);
    }
  }

  /**
   * Monster attack: plays attack animation while dashing toward the knight and back.
   */
  public monsterAttackLunge(slotIndex?: number, heavy: boolean = false): void {
    const slot = (slotIndex !== undefined ? this.monsterSlots[slotIndex] : null)
      ?? this.monsterSlots[this.targetSlotIndex]
      ?? this.monsterSlots.find(s => s.isAlive);
    if (!slot || !slot.isAlive || slot.isLocked) return;

    this.flashAlpha = 0.65;
    this.shakeIntensity = heavy ? 10 : 8;
    this.playKnightHit();

    this.playMonsterAnimationOnSlot(slot, heavy ? slot.rig?.heavyAttack : slot.rig?.attack);
    slot.lungeT = 0;

    // Claw slash graphic
    if (this.effectsLayer) {
      const lungeX = slot.baseX - MONSTER_LUNGE_DISTANCE;
      const claw = new Graphics();
      claw.moveTo(lungeX - 25, slot.baseY - 48);
      claw.lineTo(lungeX + 15, slot.baseY - 8);
      claw.moveTo(lungeX - 15, slot.baseY - 53);
      claw.lineTo(lungeX + 25, slot.baseY - 13);
      claw.stroke({ width: heavy ? 3.5 : 2, color: heavy ? 0xFF0033 : 0xF97316, alpha: 0.9 });
      this.effectsLayer.addChild(claw);

      setTimeout(() => {
        if (claw && !this.isDestroyed && this.effectsLayer) {
          this.effectsLayer.removeChild(claw);
          claw.destroy();
        }
      }, 180);
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
   * CRITICAL REQUIREMENT:
   * "Zero React Layout Thrashing: The PixiJS game loop must be strictly isolated.
   * High-frequency telemetry (rep coordinates, power) must bypass React useState.
   * The /tv component must hold a useRef<GameEngine> and pass WebRTC payloads directly to
   * engineRef.current.onRepCompleted()."
   */
  /**
   * Dispatches specialized physical melee attacks, dynamic camera zooms, and 32-bit dark fantasy pixel VFX
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
    const nameLower = (skillName || EXERCISE_SKILLS[exercise]?.skillName || '').toLowerCase();

    // 1. Attack type specific physical animations & dynamic camera strikes
    switch (exercise) {
      case 'SWING': {
        const isWhirlwind = nameLower.includes('whirlwind') || nameLower.includes('dragon');
        this.executePhysicalSlash(power, isCrit, damageNum, isWhirlwind);
        break;
      }

      case 'SQUAT': {
        const isQuake = nameLower.includes('quake') || nameLower.includes('colossus');
        this.executeLeapingGroundSlam(power, isCrit, damageNum, isQuake);
        break;
      }

      case 'CLEAN_AND_PRESS': {
        const isCleaver = nameLower.includes('cleaver') || nameLower.includes('stormbreaker');
        this.executeShoulderRamUppercut(power, isCrit, damageNum, isCleaver);
        break;
      }

      case 'SNATCH': {
        const isTalon = nameLower.includes('talon') || nameLower.includes('solar');
        this.executeRisingDragonSlash(power, isCrit, damageNum, isTalon);
        break;
      }

      case 'WINDMILL': {
        const isWard = nameLower.includes('ward') || nameLower.includes('cosmic');
        this.executeParryCounterSlash(power, isCrit, damageNum, isWard);
        break;
      }

      case 'DEADLIFT': {
        this.executeGroundDragSunder(power, isCrit, damageNum);
        break;
      }

      case 'OVERHEAD_PRESS': {
        const isPillar = nameLower.includes('pillar') || nameLower.includes('heavenly') || nameLower.includes('judgement');
        this.executeSkywardSmitePlunge(power, isCrit, damageNum, isPillar);
        break;
      }

      case 'THRUSTER': {
        const isSupernova = nameLower.includes('supernova') || nameLower.includes('surge');
        this.executeCoiledSupernovaSlash(power, isCrit, damageNum, isSupernova);
        break;
      }

      case 'GORILLA_ROW': {
        const isShadow = nameLower.includes('shadow') || nameLower.includes('ripper');
        this.executeFrenziedHackingFlurry(power, isCrit, damageNum, isShadow);
        break;
      }

      case 'HALO': {
        const isVortex = nameLower.includes('vortex') || nameLower.includes('astral');
        this.executeOrbitalCycloneSweep(power, isCrit, damageNum, isVortex);
        break;
      }

      case 'SINGLE_LEG_RDL': {
        const isCrane = nameLower.includes('crane');
        this.executeNeedleLungeThrust(power, isCrit, damageNum, isCrane);
        break;
      }

      case 'CLEAN': {
        this.executeAnvilCrusherCleave(power, isCrit, damageNum);
        break;
      }

      case 'LUNGE': {
        this.executePhantomCrossDash(power, isCrit, damageNum);
        break;
      }

      default: {
        this.executePhysicalSlash(power, isCrit, damageNum, false);
        break;
      }
    }

    // Form feedback text
    if (form >= 0.94) {
      this.spawnFloatingText('PERFECT FORM!', 300, 75, 0x00EB88, 9);
    }
  }

  /**
   * Helper: Trigger dynamic camera zoom and pan towards combat focal point
   */
  public triggerCameraZoom(
    zoom: number = 1.25, 
    focusX: number = 255, 
    focusY: number = 125, 
    holdDurationFrames: number = 16
  ): void {
    this.targetCameraZoom = zoom;
    this.targetCameraFocusX = focusX;
    this.targetCameraFocusY = focusY;

    setTimeout(() => {
      if (this.isDestroyed) return;
      this.targetCameraZoom = 1.0;
      this.targetCameraFocusX = 213;
      this.targetCameraFocusY = 120;
    }, (holdDurationFrames / 60) * 1000);
  }

  /**
   * Helper: Draws a 32-bit painterly dark-fantasy multi-tone slash ribbon
   */
  private drawPainterlySlashArc(
    g: Graphics,
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    shadowColor: number,
    bodyColor: number,
    coreColor: number
  ): void {
    // 1. Dark ink/blood contour (distinct 90s dark fantasy outline)
    g.arc(cx, cy, radius + 4, startAngle, endAngle).stroke({ width: 6, color: shadowColor, alpha: 0.85 });
    // 2. Saturated painterly body
    g.arc(cx, cy, radius, startAngle, endAngle).stroke({ width: 4, color: bodyColor, alpha: 0.95 });
    // 3. Hot radiant core highlight
    g.arc(cx, cy, radius - 1, startAngle + 0.08, endAngle - 0.08).stroke({ width: 1.5, color: coreColor, alpha: 1.0 });
  }

  /**
   * Helper: Spawns high-detail 90s dark fantasy speed streaks radiating from clash point
   */
  private spawnSpeedStreaks(
    x: number, 
    y: number, 
    length: number, 
    colors: number[] = [0xFFFFFF, 0xF59E0B]
  ): void {
    if (!this.effectsLayer) return;
    const g = new Graphics();
    const count = 5;
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() - 0.5) * 0.8;
      const len = length * (0.6 + Math.random() * 0.6);
      const color = colors[i % colors.length];
      const startX = x - (Math.random() * 15);
      const startY = y + (Math.random() - 0.5) * 20;
      g.moveTo(startX, startY)
        .lineTo(startX + Math.cos(angle) * len, startY + Math.sin(angle) * len)
        .stroke({ width: 1.5, color, alpha: 0.9 });
    }
    this.effectsLayer.addChild(g);
    setTimeout(() => {
      if (!this.isDestroyed) g.destroy();
    }, 100);
  }

  /**
   * Helper: Spawns a fading motion afterimage silhouette of the knight during dashes/leaps
   */
  private spawnKnightGhost(x: number, y: number, tint: number, alpha: number = 0.45): void {
    if (!this.effectsLayer) return;
    const g = new Graphics();
    g.roundRect(-12, -45, 24, 45, 4).fill({ color: tint, alpha });
    g.rect(4, -30, 14, 20).fill({ color: tint, alpha: alpha * 0.8 });
    g.x = x;
    g.y = y;
    this.effectsLayer.addChild(g);
    setTimeout(() => {
      if (!this.isDestroyed) g.destroy();
    }, 130);
  }

  /**
   * 1. SWING: Dash into melee range, brutal greatsword cleave / dragon whirlwind, camera punch zoom
   */
  private executePhysicalSlash(power: number, isCrit: boolean, damageNum: number, isWhirlwind: boolean): void {
    if (!this.knightContainer || !this.effectsLayer) return;

    this.playKnightAnimation(isWhirlwind ? 'ATTACK4' : KNIGHT_SWING_COMBO[this.attackComboIndex++ % KNIGHT_SWING_COMBO.length]);
    this.triggerCameraZoom(isWhirlwind ? 1.28 : 1.22, 255, 125, 18);

    const container = new Container();
    const g = new Graphics();
    container.addChild(g);
    this.effectsLayer.addChild(container);

    const startX = 130;
    const clashX = 235;
    let impactFired = false;

    this.activeEffects.push({
      container,
      life: 0,
      maxLife: 22,
      onUpdate: (eff) => {
        if (!this.knightContainer) return true;

        if (eff.life <= 6) {
          const forwardT = eff.life / 6;
          this.knightContainer.x = startX + (clashX - startX) * forwardT;
          if (eff.life % 2 === 0) {
            this.spawnKnightGhost(this.knightContainer.x, 168, isWhirlwind ? 0xDC2626 : 0xF4B41A);
          }
        } else {
          const backT = (eff.life - 6) / 16;
          this.knightContainer.x = clashX - (clashX - startX) * backT;
        }

        if (eff.life >= 6 && !impactFired) {
          impactFired = true;
          g.clear();

          if (isWhirlwind) {
            this.drawPainterlySlashArc(g, clashX + 10, 125, 48, -Math.PI * 0.45, Math.PI * 0.45, 0x450A0A, 0xDC2626, 0xFDE047);
            this.drawPainterlySlashArc(g, clashX + 25, 125, 38, Math.PI * 0.55, Math.PI * 1.45, 0x450A0A, 0xF97316, 0xFFFBEA);
            this.spawnSparks(MONSTER_X, 125, 24, [0xDC2626, 0xF97316, 0xFBBF24, 0xFFFFFF]);
          } else {
            this.drawPainterlySlashArc(g, clashX + 15, 125, 45, -Math.PI * 0.35, Math.PI * 0.35, 0x78350F, 0xF59E0B, 0xFFFBEA);
            this.spawnSparks(MONSTER_X, 125, isCrit ? 20 : 12, [0xF4B41A, 0xFFFBEA, 0xDC2626]);
          }

          this.spawnSpeedStreaks(clashX + 30, 125, 45, isWhirlwind ? [0xDC2626, 0xFBBF24] : [0xF4B41A, 0xFFFFFF]);
          this.shakeIntensity = isCrit ? 12 : 9;
          this.flashAlpha = isCrit ? 0.65 : 0.45;
          this.spawnFloatingText(isWhirlwind ? `DRAGON WHIRLWIND! +${damageNum}` : (isCrit ? `CRIT CLEAVE! +${damageNum}` : `IRON CLEAVE! +${damageNum}`), MONSTER_X, 100, isWhirlwind ? 0xDC2626 : 0xF4B41A, isCrit ? 14 : 11);
          audioManager.play(isCrit || isWhirlwind ? 'crit' : 'hit');
          this.playMonsterHit();
        }

        if (eff.life > 10) {
          g.clear();
        }

        return eff.life >= 22;
      },
      onDestroy: () => {
        if (this.knightContainer) {
          this.knightContainer.x = startX;
        }
      },
    });
  }

  /**
   * 2. SQUAT: Vault high into air, downward greatsword ground plunge, erupting rock pillars, camera slam zoom
   */
  private executeLeapingGroundSlam(power: number, isCrit: boolean, damageNum: number, isQuake: boolean): void {
    if (!this.knightContainer || !this.effectsLayer) return;

    this.playKnightAnimation('ATTACK3');
    this.triggerCameraZoom(1.34, 255, 130, 22);

    const container = new Container();
    const g = new Graphics();
    container.addChild(g);
    this.effectsLayer.addChild(container);

    const startX = 130;
    const landX = 240;
    const peakHeight = 85;
    let impactFired = false;
    const accentColor = isQuake ? 0xA855F7 : 0xC49A45;
    const shadowColor = isQuake ? 0x3B0764 : 0x451A03;

    this.activeEffects.push({
      container,
      life: 0,
      maxLife: 28,
      onUpdate: (eff) => {
        if (!this.knightContainer) return true;

        if (eff.life <= 10) {
          const t = eff.life / 10;
          this.knightContainer.x = startX + (landX - startX) * t;
          const arc = Math.sin(t * Math.PI) * peakHeight;
          this.knightContainer.y = 168 - arc;
          if (eff.life % 2 === 0) {
            this.spawnKnightGhost(this.knightContainer.x, this.knightContainer.y, accentColor, 0.4);
          }
        } else {
          this.knightContainer.y = 168;
          const backT = (eff.life - 10) / 18;
          this.knightContainer.x = landX - (landX - startX) * backT;
        }

        if (eff.life >= 10 && !impactFired) {
          impactFired = true;
          g.clear();

          this.drawPainterlySlashArc(g, landX + 10, 160, 52, Math.PI * 0.1, Math.PI * 0.9, shadowColor, accentColor, 0xFFFFFF);
          this.spawnShockwave(MONSTER_X, 168, accentColor);
          this.spawnSparks(MONSTER_X, 155, 26, isQuake ? [0xA855F7, 0xC084FC, 0xFFFFFF] : [0xC49A45, 0x5C2B14, 0xF59E0B, 0xFF3366]);

          this.shakeIntensity = Math.min(16, 10 + (power / 20));
          this.flashAlpha = 0.7;
          this.spawnFloatingText(isQuake ? `COLOSSUS QUAKE! +${damageNum}` : `TITAN SLAM! +${damageNum}`, MONSTER_X, 90, accentColor, isCrit ? 14 : 12);
          audioManager.play('crit');
          this.playMonsterHit();
        }

        if (eff.life >= 10 && eff.life <= 22) {
          const spikeProgress = Math.min(1, (eff.life - 10) / 6);
          const h = 45 * Math.sin(spikeProgress * Math.PI * 0.5);
          const alpha = 1 - Math.max(0, (eff.life - 16) / 6);

          g.clear();
          g.moveTo(landX, 168).lineTo(MONSTER_X + 25, 168).stroke({ width: 3, color: accentColor, alpha });
          g.poly([MONSTER_X - 10, 168, MONSTER_X, 168 - h, MONSTER_X + 10, 168])
            .fill({ color: accentColor, alpha })
            .stroke({ width: 2, color: shadowColor, alpha });
          g.poly([MONSTER_X - 26, 168, MONSTER_X - 18, 168 - h * 0.7, MONSTER_X - 10, 168])
            .fill({ color: accentColor, alpha })
            .stroke({ width: 2, color: shadowColor, alpha });
          g.poly([MONSTER_X + 8, 168, MONSTER_X + 18, 168 - h * 0.75, MONSTER_X + 28, 168])
            .fill({ color: accentColor, alpha })
            .stroke({ width: 2, color: shadowColor, alpha });
        } else if (eff.life > 22) {
          g.clear();
        }

        return eff.life >= 28;
      },
      onDestroy: () => {
        if (this.knightContainer) {
          this.knightContainer.x = startX;
          this.knightContainer.y = 168;
        }
      },
    });
  }

  /**
   * 3. CLEAN & PRESS: Kinetic sprint shoulder ram into explosive rising electric greatsword uppercut
   */
  private executeShoulderRamUppercut(power: number, isCrit: boolean, damageNum: number, isCleaver: boolean): void {
    if (!this.knightContainer || !this.effectsLayer) return;

    this.playKnightAnimation('DASH');
    this.triggerCameraZoom(1.26, 255, 125, 18);

    const container = new Container();
    const g = new Graphics();
    container.addChild(g);
    this.effectsLayer.addChild(container);

    const startX = 130;
    const ramX = 245;
    let ramFired = false;
    let uppercutFired = false;

    this.activeEffects.push({
      container,
      life: 0,
      maxLife: 24,
      onUpdate: (eff) => {
        if (!this.knightContainer) return true;

        if (eff.life <= 6) {
          const t = eff.life / 6;
          this.knightContainer.x = startX + (ramX - startX) * t;
          this.spawnKnightGhost(this.knightContainer.x, 168, 0xF97316, 0.4);
        } else {
          const backT = (eff.life - 6) / 18;
          this.knightContainer.x = ramX - (ramX - startX) * backT;
        }

        if (eff.life >= 6 && !ramFired) {
          ramFired = true;
          this.shakeIntensity = 8;
          audioManager.play('hit');
          this.spawnSparks(ramX + 15, 140, 10, [0xF97316, 0xFFFFFF]);
        }

        if (eff.life >= 8 && !uppercutFired) {
          uppercutFired = true;
          this.playKnightAnimation('SKILL2RADON');
          g.clear();

          this.drawPainterlySlashArc(g, ramX + 10, 130, 50, -Math.PI * 0.7, -Math.PI * 0.05, 0x0369A1, 0x38B6FF, 0xFFFFFF);

          for (let b = 0; b < 3; b++) {
            this.spawnLightningBolt(MONSTER_X + (b - 1) * 14, 125);
          }

          this.spawnSparks(MONSTER_X, 125, 24, [0x38B6FF, 0x80D4FF, 0xFFFFFF, 0xF97316]);
          this.shakeIntensity = 13;
          this.flashAlpha = 0.75;
          this.spawnFloatingText(isCleaver ? `STORMBREAKER! +${damageNum}` : `STORM BREAKER! +${damageNum}`, MONSTER_X, 90, 0xF97316, isCrit ? 14 : 12);
          audioManager.play('crit');
          this.playMonsterHit();
        }

        if (eff.life > 14) {
          g.clear();
        }

        return eff.life >= 24;
      },
      onDestroy: () => {
        if (this.knightContainer) {
          this.knightContainer.x = startX;
          this.knightContainer.y = 168;
        }
      },
    });
  }

  /**
   * 4. SNATCH: Soaring rising spiral dragon slash with flaming wings, mid-air apex cleave
   */
  private executeRisingDragonSlash(power: number, isCrit: boolean, damageNum: number, isTalon: boolean): void {
    if (!this.knightContainer || !this.effectsLayer) return;

    this.playKnightAnimation('SKILL3TULUC');
    this.triggerCameraZoom(1.30, 255, 95, 20);

    const container = new Container();
    const g = new Graphics();
    container.addChild(g);
    this.effectsLayer.addChild(container);

    const startX = 130;
    const apexX = 250;
    const apexY = 80;
    let apexFired = false;

    this.activeEffects.push({
      container,
      life: 0,
      maxLife: 26,
      onUpdate: (eff) => {
        if (!this.knightContainer) return true;

        if (eff.life <= 9) {
          const t = eff.life / 9;
          this.knightContainer.x = startX + (apexX - startX) * t;
          this.knightContainer.y = 168 - (168 - apexY) * Math.sin(t * Math.PI * 0.5);
          this.spawnKnightGhost(this.knightContainer.x, this.knightContainer.y, 0xEF4444, 0.45);
        } else if (eff.life <= 13) {
          this.knightContainer.x = apexX;
          this.knightContainer.y = apexY;
        } else {
          const tLand = (eff.life - 13) / 13;
          this.knightContainer.y = apexY + (168 - apexY) * tLand;
          this.knightContainer.x = apexX - (apexX - startX) * tLand;
        }

        if (eff.life >= 9 && !apexFired) {
          apexFired = true;
          this.playKnightAnimation('ATTACK4');
          g.clear();

          this.drawPainterlySlashArc(g, apexX + 15, apexY + 25, 52, Math.PI * 0.1, Math.PI * 0.95, 0x450A0A, 0xEF4444, 0xFDE047);
          this.drawPainterlySlashArc(g, apexX + 5, apexY + 15, 38, -Math.PI * 0.8, -Math.PI * 0.1, 0x7C2D12, 0xF97316, 0xFFFBEA);

          this.spawnShockwave(MONSTER_X, 125, 0xEF4444);
          this.spawnSparks(MONSTER_X, 125, 28, [0xEF4444, 0xDC2626, 0xF59E0B, 0xFFFBEA]);
          this.shakeIntensity = 13;
          this.flashAlpha = 0.75;
          this.spawnFloatingText(isTalon ? `SOLAR TALON! +${damageNum}` : `PHOENIX ASCENSION! +${damageNum}`, MONSTER_X, 85, 0xEF4444, isCrit ? 14 : 12);
          audioManager.play('crit');
          this.playMonsterHit();
        }

        if (eff.life > 15) {
          g.clear();
        }

        return eff.life >= 26;
      },
      onDestroy: () => {
        if (this.knightContainer) {
          this.knightContainer.x = startX;
          this.knightContainer.y = 168;
        }
      },
    });
  }

  /**
   * 5. WINDMILL: 360-degree broadsword deflection parry ring into lunging physical counter-thrust
   */
  private executeParryCounterSlash(power: number, isCrit: boolean, damageNum: number, isWard: boolean): void {
    if (!this.knightContainer || !this.effectsLayer) return;

    this.playKnightAnimation('DEFENSE');
    this.triggerCameraZoom(1.20, 245, 125, 18);

    const container = new Container();
    const g = new Graphics();
    container.addChild(g);
    this.effectsLayer.addChild(container);

    const startX = 130;
    const lungeX = 235;
    let parryFired = false;
    let strikeFired = false;

    this.activeEffects.push({
      container,
      life: 0,
      maxLife: 24,
      onUpdate: (eff) => {
        if (!this.knightContainer) return true;

        if (eff.life <= 5) {
          this.knightContainer.x = startX + (180 - startX) * (eff.life / 5);
        } else if (eff.life <= 9) {
          const t = (eff.life - 5) / 4;
          this.knightContainer.x = 180 + (lungeX - 180) * t;
        } else {
          const backT = (eff.life - 9) / 15;
          this.knightContainer.x = lungeX - (lungeX - startX) * backT;
        }

        if (eff.life >= 4 && !parryFired) {
          parryFired = true;
          g.clear();
          g.circle(180, 130, 32).stroke({ width: 3, color: 0x00EB88, alpha: 0.9 });
          g.circle(180, 130, 26).stroke({ width: 2, color: 0x38B6FF, alpha: 0.7 });
          audioManager.play('swing');
        }

        if (eff.life >= 9 && !strikeFired) {
          strikeFired = true;
          this.playKnightAnimation('ATTACK1');
          g.clear();

          this.drawPainterlySlashArc(g, lungeX + 15, 125, 42, -Math.PI * 0.3, Math.PI * 0.3, 0x064E3B, 0x00EB88, 0xFFFFFF);
          this.spawnSpeedStreaks(lungeX + 30, 125, 40, [0x00EB88, 0x38B6FF]);
          this.spawnSparks(MONSTER_X, 125, 20, [0x00EB88, 0x38B6FF, 0x6EE7B7, 0xFFFFFF]);
          this.shakeIntensity = 9;
          this.flashAlpha = 0.5;
          this.spawnFloatingText(isWard ? `COSMIC WARD! +${damageNum}` : `ASTRAL SPIRE! +${damageNum}`, MONSTER_X, 95, 0x00EB88, isCrit ? 13 : 11);
          audioManager.play('hit');
          this.playMonsterHit();
        }

        if (eff.life > 14) {
          g.clear();
        }

        return eff.life >= 24;
      },
      onDestroy: () => {
        if (this.knightContainer) {
          this.knightContainer.x = startX;
          this.knightContainer.y = 168;
        }
      },
    });
  }

  /**
   * 6. DEADLIFT: Low-stance greatsword floor drag with grinding sparks, colossal upward earth sunder
   */
  private executeGroundDragSunder(power: number, isCrit: boolean, damageNum: number): void {
    if (!this.knightContainer || !this.effectsLayer) return;

    this.playKnightAnimation('DASH');
    this.triggerCameraZoom(1.32, 255, 130, 22);

    const container = new Container();
    const g = new Graphics();
    container.addChild(g);
    this.effectsLayer.addChild(container);

    const startX = 130;
    const sunderX = 235;
    let impactFired = false;

    this.activeEffects.push({
      container,
      life: 0,
      maxLife: 28,
      onUpdate: (eff) => {
        if (!this.knightContainer) return true;

        if (eff.life <= 7) {
          const t = eff.life / 7;
          this.knightContainer.x = startX + (sunderX - startX) * t;
          this.spawnSparks(this.knightContainer.x - 10, 168, 2, [0xF59E0B, 0xD97706, 0xFFFFFF]);
        } else {
          const backT = (eff.life - 7) / 21;
          this.knightContainer.x = sunderX - (sunderX - startX) * backT;
        }

        if (eff.life >= 7 && !impactFired) {
          impactFired = true;
          this.playKnightAnimation('ATTACK5');
          g.clear();

          this.drawPainterlySlashArc(g, sunderX + 15, 140, 55, -Math.PI * 0.85, -Math.PI * 0.15, 0x451A03, 0xD97706, 0xFFFBEA);
          this.spawnShockwave(MONSTER_X, 168, 0xD97706);
          this.spawnSparks(MONSTER_X, 140, 26, [0xD97706, 0xF59E0B, 0x78350F, 0xC49A45]);
          this.shakeIntensity = 16;
          this.flashAlpha = 0.7;
          this.spawnFloatingText(`MOUNTAIN SUNDER! +${damageNum}`, MONSTER_X, 85, 0xD97706, isCrit ? 14 : 12);
          audioManager.play('crit');
          this.playMonsterHit();
        }

        if (eff.life >= 7 && eff.life <= 20) {
          const riseT = Math.min(1, (eff.life - 7) / 6);
          const currentYRise = 55 * Math.sin(riseT * Math.PI * 0.5);
          const alpha = 1 - Math.max(0, (eff.life - 14) / 6);

          g.poly([
            MONSTER_X - 22, 175,
            MONSTER_X - 10, 175 - currentYRise,
            MONSTER_X + 5, 175 - currentYRise * 0.9,
            MONSTER_X + 12, 175
          ]).fill({ color: 0xD97706, alpha }).stroke({ width: 2, color: 0x78350F, alpha });

          g.poly([
            MONSTER_X - 2, 175,
            MONSTER_X + 14, 175 - currentYRise * 0.8,
            MONSTER_X + 26, 175 - currentYRise * 0.7,
            MONSTER_X + 22, 175
          ]).fill({ color: 0xB45309, alpha }).stroke({ width: 2, color: 0x5C2B14, alpha });
        } else if (eff.life > 20) {
          g.clear();
        }

        return eff.life >= 28;
      },
      onDestroy: () => {
        if (this.knightContainer) {
          this.knightContainer.x = startX;
          this.knightContainer.y = 168;
        }
      },
    });
  }

  /**
   * 7. OVERHEAD PRESS: Vault skyward brandishing broadsword, divine lightning pillar crash onto monster crown
   */
  private executeSkywardSmitePlunge(power: number, isCrit: boolean, damageNum: number, isPillar: boolean): void {
    if (!this.knightContainer || !this.effectsLayer) return;

    this.playKnightAnimation('SKILL1');
    this.triggerCameraZoom(1.28, 255, 120, 20);

    const container = new Container();
    const g = new Graphics();
    container.addChild(g);
    this.effectsLayer.addChild(container);

    const startX = 130;
    const plungeX = 240;
    let impactFired = false;
    const beamColor = isPillar ? 0xFBBF24 : 0x38B6FF;

    this.activeEffects.push({
      container,
      life: 0,
      maxLife: 26,
      onUpdate: (eff) => {
        if (!this.knightContainer) return true;

        if (eff.life <= 8) {
          const t = eff.life / 8;
          this.knightContainer.x = startX + (plungeX - startX) * t;
          this.knightContainer.y = 168 - 65 * Math.sin(t * Math.PI * 0.5);
        } else {
          this.knightContainer.y = 168;
          const backT = (eff.life - 8) / 18;
          this.knightContainer.x = plungeX - (plungeX - startX) * backT;
        }

        if (eff.life >= 8 && !impactFired) {
          impactFired = true;
          this.playKnightAnimation('ATTACK3');
          g.clear();

          g.rect(MONSTER_X - 14, 0, 28, 170).fill({ color: beamColor, alpha: 0.65 });
          g.rect(MONSTER_X - 5, 0, 10, 170).fill({ color: 0xFFFFFF, alpha: 0.95 });

          g.moveTo(MONSTER_X, 0)
            .lineTo(MONSTER_X - 8, 40)
            .lineTo(MONSTER_X + 6, 85)
            .lineTo(MONSTER_X - 4, 130)
            .lineTo(MONSTER_X, 168)
            .stroke({ width: 2, color: 0xFFFFFF, alpha: 0.9 });

          this.drawPainterlySlashArc(g, plungeX + 15, 155, 48, Math.PI * 0.05, Math.PI * 0.95, 0x0369A1, beamColor, 0xFFFFFF);
          this.spawnShockwave(MONSTER_X, 168, beamColor);
          this.spawnSparks(MONSTER_X, 130, 26, [beamColor, 0xFFFFFF, 0x80D4FF]);
          this.shakeIntensity = 14;
          this.flashAlpha = 0.8;
          this.spawnFloatingText(isPillar ? `HEAVENLY PILLAR! +${damageNum}` : `THUNDER SMITE! +${damageNum}`, MONSTER_X, 85, beamColor, isCrit ? 14 : 11);
          audioManager.play('crit');
          this.playMonsterHit();
        }

        if (eff.life > 14) {
          g.clear();
        }

        return eff.life >= 26;
      },
      onDestroy: () => {
        if (this.knightContainer) {
          this.knightContainer.x = startX;
          this.knightContainer.y = 168;
        }
      },
    });
  }

  /**
   * 8. THRUSTER: Coiled deep squat, explosive forward missile leap, molten supernova cleave wave
   */
  private executeCoiledSupernovaSlash(power: number, isCrit: boolean, damageNum: number, isSupernova: boolean): void {
    if (!this.knightContainer || !this.effectsLayer) return;

    this.playKnightAnimation('SKILL3RADON');
    this.triggerCameraZoom(1.30, 255, 125, 20);

    const container = new Container();
    const g = new Graphics();
    container.addChild(g);
    this.effectsLayer.addChild(container);

    const startX = 130;
    const strikeX = 240;
    let slashFired = false;

    this.activeEffects.push({
      container,
      life: 0,
      maxLife: 24,
      onUpdate: (eff) => {
        if (!this.knightContainer) return true;

        if (eff.life <= 4) {
          this.knightContainer.y = 168 + 5;
        } else if (eff.life <= 8) {
          const t = (eff.life - 4) / 4;
          this.knightContainer.x = startX + (strikeX - startX) * t;
          this.knightContainer.y = 168 - 18 * Math.sin(t * Math.PI);
          this.spawnKnightGhost(this.knightContainer.x, this.knightContainer.y, 0xF59E0B, 0.45);
        } else {
          this.knightContainer.y = 168;
          const backT = (eff.life - 8) / 16;
          this.knightContainer.x = strikeX - (strikeX - startX) * backT;
        }

        if (eff.life >= 8 && !slashFired) {
          slashFired = true;
          g.clear();

          this.drawPainterlySlashArc(g, strikeX + 10, 125, 52, -Math.PI * 0.45, Math.PI * 0.45, 0x7F1D1D, 0xF59E0B, 0xFFFBEA);
          this.drawPainterlySlashArc(g, strikeX + 25, 125, 38, -Math.PI * 0.35, Math.PI * 0.35, 0x991B1B, 0xDC2626, 0xFDE047);

          this.spawnShockwave(MONSTER_X, 125, 0xF59E0B);
          this.spawnSparks(MONSTER_X, 125, 28, [0xF59E0B, 0xDC2626, 0xFFFBEA, 0xFDE047]);
          this.shakeIntensity = 14;
          this.flashAlpha = 0.75;
          this.spawnFloatingText(isSupernova ? `SUPERNOVA SURGE! +${damageNum}` : `SOLAR ERUPTION! +${damageNum}`, MONSTER_X, 90, 0xF59E0B, isCrit ? 14 : 12);
          audioManager.play('crit');
          this.playMonsterHit();
        }

        if (eff.life > 14) {
          g.clear();
        }

        return eff.life >= 24;
      },
      onDestroy: () => {
        if (this.knightContainer) {
          this.knightContainer.x = startX;
          this.knightContainer.y = 168;
        }
      },
    });
  }

  /**
   * 9. GORILLA ROW: Point-blank 4-hit rapid hacking combo with close-up jittering camera
   */
  private executeFrenziedHackingFlurry(power: number, isCrit: boolean, damageNum: number, isShadow: boolean): void {
    if (!this.knightContainer || !this.effectsLayer) return;

    this.playKnightAnimation('SKILL2TULUC');
    this.triggerCameraZoom(1.32, 260, 125, 24);

    const container = new Container();
    const g = new Graphics();
    container.addChild(g);
    this.effectsLayer.addChild(container);

    const startX = 130;
    const hackX = 245;
    let hitCount = 0;
    const clawColor = isShadow ? 0x65A30D : 0x84CC16;

    this.activeEffects.push({
      container,
      life: 0,
      maxLife: 26,
      onUpdate: (eff) => {
        if (!this.knightContainer) return true;

        if (eff.life <= 4) {
          this.knightContainer.x = startX + (hackX - startX) * (eff.life / 4);
        } else if (eff.life <= 17) {
          this.knightContainer.x = hackX + (Math.random() - 0.5) * 4;
        } else {
          const backT = (eff.life - 17) / 9;
          this.knightContainer.x = hackX - (hackX - startX) * backT;
        }

        if (eff.life >= 5 && hitCount === 0) {
          hitCount = 1;
          g.clear();
          this.drawPainterlySlashArc(g, hackX + 15, 115, 36, -Math.PI * 0.4, 0, 0x14532D, clawColor, 0xFFFFFF);
          this.spawnSparks(MONSTER_X, 115, 8, [clawColor, 0xFFFFFF]);
          this.shakeIntensity = 6;
          audioManager.play('hit');
          this.playMonsterHit();
        } else if (eff.life >= 8 && hitCount === 1) {
          hitCount = 2;
          g.clear();
          this.drawPainterlySlashArc(g, hackX + 15, 135, 36, 0, Math.PI * 0.45, 0x14532D, clawColor, 0xFFFFFF);
          this.spawnSparks(MONSTER_X, 135, 8, [clawColor, 0xFFFFFF]);
          this.shakeIntensity = 7;
          audioManager.play('hit');
          this.playMonsterHit();
        } else if (eff.life >= 12 && hitCount === 2) {
          hitCount = 3;
          g.clear();
          this.drawPainterlySlashArc(g, hackX + 20, 125, 42, -Math.PI * 0.5, Math.PI * 0.5, 0x052E16, clawColor, 0xFFFFFF);
          g.moveTo(MONSTER_X - 18, 105).lineTo(MONSTER_X + 18, 145).stroke({ width: 3.5, color: clawColor });
          g.moveTo(MONSTER_X - 18, 145).lineTo(MONSTER_X + 18, 105).stroke({ width: 3.5, color: clawColor });

          this.spawnSparks(MONSTER_X, 125, 20, [clawColor, 0xBEF264, 0xFFFFFF]);
          this.shakeIntensity = 12;
          this.flashAlpha = 0.55;
          this.spawnFloatingText(isShadow ? `SHADOW RIPPER! +${damageNum}` : `BEAST MAW! +${damageNum}`, MONSTER_X, 90, clawColor, isCrit ? 14 : 11);
          audioManager.play('crit');
          this.playMonsterHit();
        }

        if (eff.life > 16) {
          g.clear();
        }

        return eff.life >= 26;
      },
      onDestroy: () => {
        if (this.knightContainer) {
          this.knightContainer.x = startX;
          this.knightContainer.y = 168;
        }
      },
    });
  }

  /**
   * 10. HALO: Centrifugal 360-degree orbital greatsword cyclone slashing through monster twice
   */
  private executeOrbitalCycloneSweep(power: number, isCrit: boolean, damageNum: number, isVortex: boolean): void {
    if (!this.knightContainer || !this.effectsLayer) return;

    this.playKnightAnimation('ATTACK4');
    this.triggerCameraZoom(1.22, 245, 125, 18);

    const container = new Container();
    const g = new Graphics();
    container.addChild(g);
    this.effectsLayer.addChild(container);

    const startX = 130;
    const sweepX = 230;
    let sweepFired = false;

    this.activeEffects.push({
      container,
      life: 0,
      maxLife: 24,
      onUpdate: (eff) => {
        if (!this.knightContainer) return true;

        if (eff.life <= 7) {
          const t = eff.life / 7;
          this.knightContainer.x = startX + (sweepX - startX) * t;
        } else {
          const backT = (eff.life - 7) / 17;
          this.knightContainer.x = sweepX - (sweepX - startX) * backT;
        }

        if (eff.life >= 7 && !sweepFired) {
          sweepFired = true;
          g.clear();

          this.drawPainterlySlashArc(g, sweepX + 20, 125, 50, -Math.PI * 0.6, Math.PI * 0.6, 0x3B0764, 0x818CF8, 0xFFFFFF);
          this.drawPainterlySlashArc(g, sweepX + 10, 125, 38, Math.PI * 0.4, Math.PI * 1.6, 0x581C87, 0xC084FC, 0xFFFBEA);

          this.spawnShockwave(MONSTER_X, 125, 0x818CF8);
          this.spawnSparks(MONSTER_X, 125, 24, [0x818CF8, 0xC084FC, 0xE9D5FF, 0xFFFFFF]);
          this.shakeIntensity = 10;
          this.flashAlpha = 0.55;
          this.spawnFloatingText(isVortex ? `ASTRAL VORTEX! +${damageNum}` : `CELESTIAL WARD! +${damageNum}`, MONSTER_X, 95, 0x818CF8, isCrit ? 14 : 11);
          audioManager.play('crit');
          this.playMonsterHit();
        }

        if (eff.life > 14) {
          g.clear();
        }

        return eff.life >= 24;
      },
      onDestroy: () => {
        if (this.knightContainer) {
          this.knightContainer.x = startX;
          this.knightContainer.y = 168;
        }
      },
    });
  }

  /**
   * 11. SINGLE-LEG RDL: Deep needle lunge thrust with speed lines and 8-ray starburst flash
   */
  private executeNeedleLungeThrust(power: number, isCrit: boolean, damageNum: number, isCrane: boolean): void {
    if (!this.knightContainer || !this.effectsLayer) return;

    this.playKnightAnimation('ATTACK1');
    this.triggerCameraZoom(1.24, 255, 125, 16);

    const container = new Container();
    const g = new Graphics();
    container.addChild(g);
    this.effectsLayer.addChild(container);

    const startX = 130;
    const lungeX = 242;
    let thrustFired = false;

    this.activeEffects.push({
      container,
      life: 0,
      maxLife: 20,
      onUpdate: (eff) => {
        if (!this.knightContainer) return true;

        if (eff.life <= 5) {
          const t = eff.life / 5;
          this.knightContainer.x = startX + (lungeX - startX) * t;
          this.spawnKnightGhost(this.knightContainer.x, 168, 0xEC4899, 0.4);
        } else {
          const backT = (eff.life - 5) / 15;
          this.knightContainer.x = lungeX - (lungeX - startX) * backT;
        }

        if (eff.life >= 5 && !thrustFired) {
          thrustFired = true;
          g.clear();

          this.spawnSpeedStreaks(lungeX + 15, 125, 55, [0xEC4899, 0xFFFFFF]);

          for (let a = 0; a < 8; a++) {
            const ang = (a * Math.PI) / 4;
            g.moveTo(MONSTER_X, 125)
              .lineTo(MONSTER_X + Math.cos(ang) * 25, 125 + Math.sin(ang) * 25)
              .stroke({ width: 2, color: 0xEC4899, alpha: 0.9 });
          }

          this.spawnSparks(MONSTER_X, 125, 22, [0xEC4899, 0xF472B6, 0xFFFFFF]);
          this.shakeIntensity = 10;
          this.flashAlpha = 0.55;
          this.spawnFloatingText(isCrane ? `CRANE STRIKE! +${damageNum}` : `VALKYRIE BALANCE! +${damageNum}`, MONSTER_X, 95, 0xEC4899, isCrit ? 14 : 11);
          audioManager.play('crit');
          this.playMonsterHit();
        }

        if (eff.life > 10) {
          g.clear();
        }

        return eff.life >= 20;
      },
      onDestroy: () => {
        if (this.knightContainer) {
          this.knightContainer.x = startX;
          this.knightContainer.y = 168;
        }
      },
    });
  }

  /**
   * 12. CLEAN: Stomping heavy stride, 10-ton overhead greatsword hack with concussive anvil ring
   */
  private executeAnvilCrusherCleave(power: number, isCrit: boolean, damageNum: number): void {
    if (!this.knightContainer || !this.effectsLayer) return;

    this.playKnightAnimation('ATTACK5');
    this.triggerCameraZoom(1.28, 255, 130, 20);

    const container = new Container();
    const g = new Graphics();
    container.addChild(g);
    this.effectsLayer.addChild(container);

    const startX = 130;
    const cleaveX = 238;
    let impactFired = false;

    this.activeEffects.push({
      container,
      life: 0,
      maxLife: 24,
      onUpdate: (eff) => {
        if (!this.knightContainer) return true;

        if (eff.life <= 6) {
          const t = eff.life / 6;
          this.knightContainer.x = startX + (cleaveX - startX) * t;
        } else {
          const backT = (eff.life - 6) / 18;
          this.knightContainer.x = cleaveX - (cleaveX - startX) * backT;
        }

        if (eff.life >= 6 && !impactFired) {
          impactFired = true;
          g.clear();

          this.drawPainterlySlashArc(g, cleaveX + 15, 140, 52, Math.PI * 0.1, Math.PI * 0.9, 0x431407, 0xF97316, 0xFFFBEA);
          this.spawnShockwave(MONSTER_X, 125, 0xF97316);
          this.spawnSparks(MONSTER_X, 125, 24, [0xF97316, 0xF4B41A, 0x7584A6, 0xFFFFFF]);
          this.shakeIntensity = 14;
          this.flashAlpha = 0.65;
          this.spawnFloatingText(`ANVIL BREAKER! +${damageNum}`, MONSTER_X, 90, 0xF97316, isCrit ? 14 : 11);
          audioManager.play('hit');
          this.playMonsterHit();
        }

        if (eff.life > 12) {
          g.clear();
        }

        return eff.life >= 24;
      },
      onDestroy: () => {
        if (this.knightContainer) {
          this.knightContainer.x = startX;
          this.knightContainer.y = 168;
        }
      },
    });
  }

  /**
   * 13. LUNGE: Supersonic phantom dash with 3 afterimages and high-speed cross cleave
   */
  private executePhantomCrossDash(power: number, isCrit: boolean, damageNum: number): void {
    if (!this.knightContainer || !this.effectsLayer) return;

    this.playKnightAnimation('DASH');
    this.triggerCameraZoom(1.24, 255, 125, 18);

    const container = new Container();
    const g = new Graphics();
    container.addChild(g);
    this.effectsLayer.addChild(container);

    const startX = 130;
    const peakX = 245;
    let impactFired = false;

    this.activeEffects.push({
      container,
      life: 0,
      maxLife: 22,
      onUpdate: (eff) => {
        if (!this.knightContainer) return true;

        if (eff.life <= 6) {
          const forwardT = eff.life / 6;
          this.knightContainer.x = startX + (peakX - startX) * forwardT;
          this.spawnKnightGhost(this.knightContainer.x, 168, 0xEC4899, 0.45);
        } else {
          const backT = (eff.life - 6) / 16;
          this.knightContainer.x = peakX - (peakX - startX) * backT;
          if (eff.life === 7) {
            this.playKnightAnimation('DASH_BACK');
          }
        }

        if (eff.life >= 6 && !impactFired) {
          impactFired = true;
          g.clear();

          this.drawPainterlySlashArc(g, peakX + 15, 125, 48, -Math.PI * 0.4, Math.PI * 0.4, 0x831843, 0xEC4899, 0xFFFFFF);
          this.drawPainterlySlashArc(g, peakX + 25, 125, 38, Math.PI * 0.6, Math.PI * 1.4, 0x0369A1, 0x38B6FF, 0xFFFFFF);

          this.spawnSparks(MONSTER_X, 125, 22, [0xEC4899, 0x38B6FF, 0xFFFFFF]);
          this.shakeIntensity = 11;
          this.flashAlpha = 0.55;
          this.spawnFloatingText(`VALKYRIE DASH! +${damageNum}`, MONSTER_X, 95, 0xEC4899, isCrit ? 14 : 11);
          audioManager.play(isCrit ? 'crit' : 'hit');
          this.playMonsterHit();
        }

        if (eff.life > 12) {
          g.clear();
        }

        return eff.life >= 22;
      },
      onDestroy: () => {
        if (this.knightContainer) {
          this.knightContainer.x = startX;
          this.knightContainer.y = 168;
        }
      },
    });
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

      // Update each monster slot (lunges, shakes)
      for (const slot of this.monsterSlots) {
        if (!slot.container) continue;
        if (slot.lungeT < 1) {
          slot.lungeT = Math.min(1, slot.lungeT + ticker.deltaMS / 500);
        }
        const lunge = Math.sin(slot.lungeT * Math.PI) * MONSTER_LUNGE_DISTANCE;
        const shake = (slot.slotIndex === this.targetSlotIndex ? enemyShakeX : 0) + slot.shakeX;
        slot.container.x = slot.baseX - lunge + shake;
        slot.container.y = slot.baseY;
        if (slot.shakeX !== 0) {
          slot.shakeX = slot.shakeX > 0 ? Math.max(0, slot.shakeX - delta) : Math.min(0, slot.shakeX + delta);
        }
      }

      // Update Target Reticle over active monster
      if (this.targetReticle) {
        const targetSlot = this.monsterSlots[this.targetSlotIndex] ?? this.monsterSlots.find(s => s.isAlive);
        if (targetSlot && targetSlot.isAlive && !targetSlot.isLocked) {
          this.targetReticle.visible = true;
          this.targetReticle.x += (targetSlot.baseX - this.targetReticle.x) * 0.25;
          const bobY = Math.sin(performance.now() * 0.007) * 3;
          this.targetReticle.y = targetSlot.baseY - 76 + bobY;
        } else {
          this.targetReticle.visible = false;
        }
      }

      // 2. Update Screen Flash Overlay Fade
      if (this.flashAlpha > 0 && this.flashOverlay) {
        this.flashAlpha = Math.max(0, this.flashAlpha - 0.05 * delta);
        this.flashOverlay.alpha = this.flashAlpha;
      }

      // 3. Update Dynamic Camera Zoom, Pan & Screen Shake
      const zoomEase = 0.14 * delta;
      this.cameraZoom += (this.targetCameraZoom - this.cameraZoom) * Math.min(1, zoomEase);
      this.cameraFocusX += (this.targetCameraFocusX - this.cameraFocusX) * Math.min(1, zoomEase);
      this.cameraFocusY += (this.targetCameraFocusY - this.cameraFocusY) * Math.min(1, zoomEase);

      if (this.targetCameraZoom === 1.0 && Math.abs(this.cameraZoom - 1.0) < 0.005) {
        this.cameraZoom = 1.0;
        this.cameraFocusX = 213;
        this.cameraFocusY = 120;
      }

      if (this.rootStage) {
        let shakeOffsetX = 0;
        let shakeOffsetY = 0;
        if (this.shakeIntensity > 0) {
          shakeOffsetX = (Math.random() - 0.5) * this.shakeIntensity * 2;
          shakeOffsetY = (Math.random() - 0.5) * this.shakeIntensity * 2;
          this.shakeIntensity = Math.max(0, this.shakeIntensity - 0.6 * delta);
        }

        this.rootStage.scale.set(this.cameraZoom);
        this.rootStage.x = (213 - this.cameraFocusX * this.cameraZoom) + shakeOffsetX;
        this.rootStage.y = (120 - this.cameraFocusY * this.cameraZoom) + shakeOffsetY;
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

      // 6. Update Active Projectiles
      for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
        const p = this.activeProjectiles[i];
        p.life += delta;
        p.x += p.vx * delta;
        p.y += p.vy * delta;
        p.container.x = p.x;
        p.container.y = p.y;

        if (p.rotationSpeed) {
          p.graphics.rotation += p.rotationSpeed * delta;
        }
        if (p.onUpdate) {
          p.onUpdate(p, delta);
        }

        // Periodic trail sparks
        if (Math.random() < 0.45 && p.trailColors && this.effectsLayer) {
          this.spawnSparks(p.x, p.y, 1, p.trailColors);
        }

        // Reached target or lifetime expired
        if (p.x >= p.targetX || p.life >= p.maxLife) {
          p.onHit();
          if (this.effectsLayer) {
            this.effectsLayer.removeChild(p.container);
          }
          p.container.destroy({ children: true });
          this.activeProjectiles.splice(i, 1);
        }
      }

      // 7. Update Active Combat Effects
      for (let i = this.activeEffects.length - 1; i >= 0; i--) {
        const eff = this.activeEffects[i];
        eff.life += delta;
        const isComplete = eff.onUpdate(eff, delta) || eff.life >= eff.maxLife;
        if (isComplete) {
          eff.onDestroy?.();
          if (this.effectsLayer) {
            this.effectsLayer.removeChild(eff.container);
          }
          eff.container.destroy({ children: true });
          this.activeEffects.splice(i, 1);
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
    this.clearAllMonsters();
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

    // Unload battle background texture to prevent VRAM leak across scene transitions
    if (this.currentBgKey && Assets.cache.has(this.currentBgKey)) {
      try {
        await Assets.unload(this.currentBgKey);
      } catch (e) {}
      this.currentBgKey = null;
    } else if (Assets.cache.has(BATTLE_BG_KEY)) {
      try {
        await Assets.unload(BATTLE_BG_KEY);
      } catch (e) {}
    }

    // Clean up active projectiles and effects
    for (const p of this.activeProjectiles) {
      p.container.destroy({ children: true });
    }
    this.activeProjectiles = [];

    for (const eff of this.activeEffects) {
      eff.onDestroy?.();
      eff.container.destroy({ children: true });
    }
    this.activeEffects = [];

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
