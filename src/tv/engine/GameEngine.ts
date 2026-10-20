import { Application, Container, Graphics, Text, Assets, Sprite, Texture, Cache, Rectangle, TexturePool, type BindGroup } from 'pixi.js';
import { Spine, SpineTexture, EventTimeline, RegionAttachment } from '@esotericsoftware/spine-pixi-v8';
import { BATTLE_MAPS, MAP_BATTLE_MUSIC, getMapBattleMusic } from './battleMaps';
import type { TextureAtlas } from '@esotericsoftware/spine-core';
import { audioManager } from '../../shared/AudioManager';
import { ExerciseType, EXERCISE_SKILLS } from '../../types/game';
import type { MonsterSprite, MonsterMoveId, MonsterAffix } from '../../types/battle';
import type { Element } from '../../shared/elements';
import { MONSTER_MOVES, type MoveHost, type ImpactResult } from './monsterMoves';
import { Timeline, lerp, type EmitOptions } from './choreo';
import { ALL_WEAPON_SPELLS } from '../../types/weaponSpells';
import { MoveTracer, type Box, type MoveTraceReport } from './moveTrace';
import { VFX_RIGS, VFX_NAMES, type VfxName, type VfxOpts } from './vfx';
import { OutlineFilter } from './outlineFilter';
import { RepStamp, type RepCardTarget } from './repStamp';
import { TRIAL_SCENES, type TrialScene } from './trialScenes';
import type { SecretTrialId, TrialRepResult } from '../../shared/secretTrials';
import {
  KNIGHT_MOVES, KNIGHT_MOVE_IDS, knightMoveFor, knightMoveCard,
  type KnightMoveId, type KnightMoveHost, type KnightMoveContext, type KnightTarget,
} from './knightMoves';

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
  gravity?: number; // per-frame vy increase; defaults to 0.15
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
/** Knight rig slots a move may hide or recolour (weapon, built-in effects); reset after every move, mirrored on afterimages. */
const KNIGHT_FX_SLOTS = ['sword', 'Normal_Slash', 'Light', 'PunchFx_Skill3', 'Dash_Mash'];
const KNIGHT_SCALE = 0.15;
const KNIGHT_HOME = { x: 130, y: 168 }; // knight feet at rest (battlefield coords)
const MAX_QUEUED_KNIGHT_MOVES = 3; // casts waiting behind the playing move before it gets cut short

/** playKnightMove() options: who it hits, what it shows, and what runs when it lands and ends. */
interface KnightMoveOptions {
  targets?: number[];
  ctx?: Partial<KnightMoveContext>;
  onImpact?: (i: number) => void;
  onStart?: () => void; // when the move begins playing (later than the call if it was queued)
  onFinish?: () => void;
  isKillCam?: boolean;
  killSlot?: number;
  stagger?: number;
  interrupt?: boolean;
}
/** Knight feet and scale in the blacksmith's fitting room (left of the docked shop panel). */
const SHOWCASE_KNIGHT = { x: 100, y: 192, scale: 1.28 };
const MONSTER_OUTLINE_COLOR = 0x0F0E17; // retro.dark
// Battle arena background textures (clean 1:1 retro canvas match): ./battleMaps.ts
export { BATTLE_MAPS, MAP_BATTLE_MUSIC, getMapBattleMusic };

export type BattleMapId = keyof typeof BATTLE_MAPS;

const BATTLE_BG_KEY = BATTLE_MAPS.CATHEDRAL_CRYPT;
const MONSTER_BACKGROUNDS: Record<MonsterSprite, string> = {
  TREEMON: BATTLE_MAPS.DARK_FOREST,
  SLIME: BATTLE_MAPS.SUNKEN_CISTERN,
  HELLHOUND: BATTLE_MAPS.VOLCANIC_FORGE,
  BOAR: BATTLE_MAPS.VERDANT_FOREST,
  DEMON_MONK: BATTLE_MAPS.ELDRITCH_ALTAR,
  WOLF: BATTLE_MAPS.BLOOD_CEMETERY,
  BAT: BATTLE_MAPS.CATHEDRAL_CRYPT,
  BONE_GOLEM: BATTLE_MAPS.BLOOD_CEMETERY,
  CRYPT_LORD: BATTLE_MAPS.CATHEDRAL_CRYPT,
  DARK_EMPEROR: BATTLE_MAPS.CATHEDRAL_VAULT,
  DARK_KNIGHT: BATTLE_MAPS.BELFRY_RAMPARTS,
  DARK_MAGE: BATTLE_MAPS.ELDRITCH_ALTAR,
  DEMON_ARCHBISHOP: BATTLE_MAPS.ELDRITCH_ALTAR,
  ELDRITCH_HORROR: BATTLE_MAPS.ELDRITCH_ALTAR,
  GARGOYLE: BATTLE_MAPS.BELFRY_RAMPARTS,
  GHOST: BATTLE_MAPS.BLOOD_CEMETERY,
  GIANT_SPIDER: BATTLE_MAPS.DARK_FOREST,
  GOBLIN: BATTLE_MAPS.VERDANT_FOREST,
  GOLEM: BATTLE_MAPS.CATHEDRAL_VAULT,
  GRAVE_COLOSSUS: BATTLE_MAPS.BLOOD_CEMETERY,
  HARPY: BATTLE_MAPS.BELFRY_RAMPARTS,
  INFERNO_TITAN: BATTLE_MAPS.VOLCANIC_FORGE,
  KRAKEN: BATTLE_MAPS.SUNKEN_CISTERN,
  LIZARDMAN: BATTLE_MAPS.SUNKEN_CISTERN,
  MAGMA_DRAGON: BATTLE_MAPS.VOLCANIC_FORGE,
  MINOTAUR: BATTLE_MAPS.CATHEDRAL_VAULT,
  MUSHROOM: BATTLE_MAPS.DARK_FOREST,
  NIGHTMARE_STAG: BATTLE_MAPS.DARK_FOREST,
  ORC: BATTLE_MAPS.VERDANT_FOREST,
  SKELETON_ARCHER: BATTLE_MAPS.CATHEDRAL_CRYPT,
  SKELETON_KNIGHT: BATTLE_MAPS.CATHEDRAL_CRYPT,
  SKELETON_WARRIOR: BATTLE_MAPS.CATHEDRAL_CRYPT,
  ANCIENT_TREANT: BATTLE_MAPS.DARK_FOREST,
  TROLL: BATTLE_MAPS.VERDANT_FOREST,
  VAULT_GUARDIAN: BATTLE_MAPS.CATHEDRAL_VAULT,
  VOID_PROPHET: BATTLE_MAPS.ELDRITCH_ALTAR,
  WATER_ELEMENTAL: BATTLE_MAPS.SUNKEN_CISTERN,
  WRAITH: BATTLE_MAPS.BLOOD_CEMETERY,
  CRYPT_CRAWLER: BATTLE_MAPS.CATHEDRAL_CRYPT,
  PLAGUE_RAT: BATTLE_MAPS.CATHEDRAL_CRYPT,
  EMBER_SERPENT: BATTLE_MAPS.VOLCANIC_FORGE,
  CINDER_IMP: BATTLE_MAPS.VOLCANIC_FORGE,
  THORN_STALKER: BATTLE_MAPS.DARK_FOREST,
  GIANT_CRAB: BATTLE_MAPS.SUNKEN_CISTERN,
  SEWER_LURKER: BATTLE_MAPS.SUNKEN_CISTERN,
  GIANT_BEETLE: BATTLE_MAPS.VERDANT_FOREST,
  FOREST_BEAR: BATTLE_MAPS.VERDANT_FOREST,
  CULTIST_ACOLYTE: BATTLE_MAPS.ELDRITCH_ALTAR,
  LANTERN_WISP: BATTLE_MAPS.BLOOD_CEMETERY,
  THRONE_GUARDIAN: BATTLE_MAPS.OBSIDIAN_THRONE,
  STORM_CROW: BATTLE_MAPS.BELFRY_RAMPARTS,
  VAULT_HOUND: BATTLE_MAPS.CATHEDRAL_VAULT,
  BARD: BATTLE_MAPS.TOWN_SQUARE,
};
// Lifts combatants + effects so they stand above the battle card hand (which covers the lower half).
const SCENE_RAISE_Y = 50; // lifts the fighters above the card hand at the bottom of the screen
let knightAssetRefs = 0; // engines currently holding the shared knight assets
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
  height: number; // approximate on-screen height in px, used to aim move VFX at heads/mouths
  skin?: string;
  offY?: number;
}

// Spine 4.2 monster rigs (public/assets/spine/monsters).
// Rigs authored facing right are flipped (scale.x *= -1) by default to face the knight.
// Rigs authored facing left have flipX: false to preserve their left-facing orientation.
const MONSTER_DIR = '/assets/spine/monsters';
const MONSTER_RIGS: Record<MonsterSprite, MonsterRig> = {
  SLIME: {
    skeleton: `${MONSTER_DIR}/greenSlime/TuXi01.json`,
    atlas: `${MONSTER_DIR}/greenSlime/TuXi01.atlas`,
    scale: 0.12,
    height: 30,
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
    height: 55,
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
    height: 45,
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
    height: 35,
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
    height: 62,
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
    height: 40,
    idle: 'stand',
    appear: 'posture',
    attack: 'attack',
    heavyAttack: 'skill1',
    hit: 'hurt',
    death: 'death',
    flipX: false, // wolf is authored facing left toward the knight
  },
  BAT: {
    skeleton: `${MONSTER_DIR}/bat/CaveBat.json`,
    atlas: `${MONSTER_DIR}/bat/CaveBat.atlas`,
    scale: 0.0494,
    height: 52,
    idle: 'idle',
    attack: 'attack',
    heavyAttack: 'attack',
    hit: 'hurt',
    death: 'death',
    flipX: false, // authored facing left
    skin: 'normal',
    offY: -15, // float above ground
  },
  BONE_GOLEM: {
    skeleton: `${MONSTER_DIR}/bone-golem/Boss_Swamp_golem.json`,
    atlas: `${MONSTER_DIR}/bone-golem/Boss_Swamp_golem.atlas`,
    scale: 0.058,
    height: 68,
    idle: 'Idle',
    attack: 'Attack01',
    heavyAttack: 'Attack01',
    hit: 'Hit',
    death: 'Dead',
  },
  CRYPT_LORD: {
    skeleton: `${MONSTER_DIR}/crypt-lord/Lich.json`,
    atlas: `${MONSTER_DIR}/crypt-lord/Lich.atlas`,
    scale: 0.029,
    height: 72,
    idle: 'Idle',
    attack: 'Attack01',
    heavyAttack: 'Skill01',
    hit: 'Hit',
    death: 'Dead',
  },
  DARK_EMPEROR: {
    skeleton: `${MONSTER_DIR}/dark-emperor/DeathKnight.json`,
    atlas: `${MONSTER_DIR}/dark-emperor/DeathKnight.atlas`,
    scale: 0.045,
    height: 75,
    idle: 'idle',
    attack: 'pose_attack',
    heavyAttack: 'pose_cast_spell',
    hit: 'pose_hurt',
    death: 'pose_death',
    flipX: false, // authored facing left
    skin: 'normal',
  },
  DARK_KNIGHT: {
    skeleton: `${MONSTER_DIR}/dark-knight/Darkknight_monster05.json`,
    atlas: `${MONSTER_DIR}/dark-knight/Darkknight_monster05.atlas`,
    scale: 0.09,
    height: 65,
    idle: 'Idle',
    attack: 'Attack01',
    heavyAttack: 'Attack01',
    hit: 'Hit',
    death: 'Dead',
  },
  DARK_MAGE: {
    skeleton: `${MONSTER_DIR}/dark-mage/Unit_Spine_BirdMageSpe1Skin1.json`,
    atlas: `${MONSTER_DIR}/dark-mage/Unit_Spine_BirdMageSpe1Skin1.atlas`,
    scale: 0.09,
    height: 52,
    idle: 'stand',
    attack: 'attack',
    heavyAttack: 'skill1',
    hit: 'hurt',
    death: 'death',
  },
  DEMON_ARCHBISHOP: {
    skeleton: `${MONSTER_DIR}/demon-monk/Boss_Archbishop.json`,
    atlas: `${MONSTER_DIR}/demon-monk/Boss_Archbishop.atlas`,
    scale: 0.066,
    height: 75,
    idle: 'BOSS_Archbishop/001A_Idle',
    attack: 'BOSS_Archbishop/003A_Attack_A',
    heavyAttack: 'BOSS_Archbishop/003C_Attack_B',
    hit: 'BOSS_Archbishop/001A_Idle',
    death: 'BOSS_Archbishop/001A_Idle',
    flipX: false, // authored facing left
  },
  ELDRITCH_HORROR: {
    skeleton: `${MONSTER_DIR}/eldritch-horror/BS_Cthulhu.json`,
    atlas: `${MONSTER_DIR}/eldritch-horror/BS_Cthulhu.atlas`,
    scale: 0.024,
    height: 80,
    idle: 'idle',
    attack: 'attack',
    heavyAttack: 'bigat',
    hit: '1Hit',
    death: '1Hit',
    flipX: false, // authored facing left
  },
  GARGOYLE: {
    skeleton: `${MONSTER_DIR}/gargoyle/GargoyleEnemy.json`,
    atlas: `${MONSTER_DIR}/gargoyle/GargoyleEnemy.atlas`,
    scale: 0.016,
    height: 65,
    idle: 'move',
    attack: 'attack',
    heavyAttack: 'attack',
    hit: 'damage',
    death: 'death',
  },
  GHOST: {
    skeleton: `${MONSTER_DIR}/ghost/ghost.json`,
    atlas: `${MONSTER_DIR}/ghost/ghost.atlas`,
    scale: 0.091,
    height: 42,
    idle: 'idle',
    attack: 'attack_middle',
    heavyAttack: 'attack_end',
    hit: 'get_hit',
    death: 'get_hit',
    flipX: false, // authored facing left
    offY: -16, // float above ground
  },
  GIANT_SPIDER: {
    skeleton: `${MONSTER_DIR}/giant-spider/spider_anim_85.json`,
    atlas: `${MONSTER_DIR}/giant-spider/spider_anim_85.atlas`,
    scale: 0.316,
    height: 22,
    idle: 'spider_anim_85_idle',
    attack: 'spider_anim_85_idle',
    heavyAttack: 'spider_anim_85_idle',
    hit: 'spider_anim_85_idle',
    death: 'spider_anim_85_idle',
  },
  GOBLIN: {
    skeleton: `${MONSTER_DIR}/goblin/goblin.json`,
    atlas: `${MONSTER_DIR}/goblin/goblin.atlas`,
    scale: 0.0312,
    height: 40,
    idle: 'Idle',
    attack: 'Attack',
    heavyAttack: 'Attack',
    hit: 'Hit',
    death: 'Dead',
  },
  GOLEM: {
    skeleton: `${MONSTER_DIR}/golem/StoneGolem.json`,
    atlas: `${MONSTER_DIR}/golem/StoneGolem.atlas`,
    scale: 0.715,
    height: 100,
    idle: 'idle',
    attack: 'atk',
    heavyAttack: 'atk',
    hit: 'idle',
    death: 'die',
    skin: 'i',
  },
  GRAVE_COLOSSUS: {
    skeleton: `${MONSTER_DIR}/grave-colossus/zombie_CL_tank.json`,
    atlas: `${MONSTER_DIR}/grave-colossus/zombie_CL_tank.atlas`,
    scale: 0.258,
    height: 65,
    idle: 'idle',
    attack: 'atk',
    heavyAttack: 'atk',
    hit: 'idle',
    death: 'die',
  },
  HARPY: {
    skeleton: `${MONSTER_DIR}/harpy/Harpy.json`,
    atlas: `${MONSTER_DIR}/harpy/Harpy.atlas`,
    scale: 0.4,
    height: 28,
    idle: 'Move',
    attack: 'Attack_01',
    heavyAttack: 'Attack_01',
    hit: 'Move',
    death: 'Die',
    flipX: false, // authored facing left
  },
  INFERNO_TITAN: {
    skeleton: `${MONSTER_DIR}/inferno-titan/Demogorgon.json`,
    atlas: `${MONSTER_DIR}/inferno-titan/Demogorgon.atlas`,
    scale: 0.143,
    height: 75,
    idle: '1_Ready',
    attack: '3_Kill',
    heavyAttack: '4_Summon',
    hit: '1_Ready',
    death: '1_Ready',
  },
  KRAKEN: {
    skeleton: `${MONSTER_DIR}/abyssal-kraken/Octopus_Anim_01.json`,
    atlas: `${MONSTER_DIR}/abyssal-kraken/Octopus_Anim_01.atlas`,
    scale: 0.036,
    height: 75,
    idle: 'Idle',
    attack: 'Action',
    heavyAttack: 'Thirsty Action',
    hit: 'Lose',
    death: 'Lose2 Burn',
    flipX: false, // authored facing left
  },
  LIZARDMAN: {
    skeleton: `${MONSTER_DIR}/lizardman/lizardman.json`,
    atlas: `${MONSTER_DIR}/lizardman/lizardman.atlas`,
    scale: 0.089,
    height: 58,
    idle: 'Idle',
    attack: 'Attack01',
    heavyAttack: 'Attack01',
    hit: 'Hit',
    death: 'Dead',
  },
  MAGMA_DRAGON: {
    skeleton: `${MONSTER_DIR}/magma-dragon/Mission_104_dragon.json`,
    atlas: `${MONSTER_DIR}/magma-dragon/Mission_104_dragon.atlas`,
    scale: 0.212,
    height: 75,
    idle: 'idle1',
    attack: 'attack',
    heavyAttack: 'attack',
    hit: 'idle1',
    death: 'idle1',
  },
  MINOTAUR: {
    skeleton: `${MONSTER_DIR}/minotaur/BlackBullhead.json`,
    atlas: `${MONSTER_DIR}/minotaur/BlackBullhead.atlas`,
    scale: 0.42,
    height: 65,
    idle: 'idle',
    attack: 'active1',
    heavyAttack: 'quickly',
    hit: 'idle',
    death: 'idle',
  },
  MUSHROOM: {
    skeleton: `${MONSTER_DIR}/mushroom-creature/M_Mushroom.json`,
    atlas: `${MONSTER_DIR}/mushroom-creature/M_Mushroom.atlas`,
    scale: 0.102,
    height: 42,
    idle: 'idle',
    attack: 'action_1',
    heavyAttack: 'action_1',
    hit: 'idle',
    death: 'idle',
    flipX: false, // authored facing left
  },
  NIGHTMARE_STAG: {
    skeleton: `${MONSTER_DIR}/nightmare-stag/AnimalAnim5.json`,
    atlas: `${MONSTER_DIR}/nightmare-stag/AnimalAnim5.atlas`,
    scale: 0.293,
    height: 60,
    idle: 'body/idle',
    attack: 'body/action1',
    heavyAttack: 'body/action2',
    hit: 'body/idle',
    death: 'body/idle',
  },
  ORC: {
    skeleton: `${MONSTER_DIR}/orc/orc_warrior.json`,
    atlas: `${MONSTER_DIR}/orc/orc_warrior.atlas`,
    scale: 0.072,
    height: 90,
    idle: 'Idle',
    attack: 'Attack',
    heavyAttack: 'Attack',
    hit: 'Hit',
    death: 'Dead',
  },
  SKELETON_ARCHER: {
    skeleton: `${MONSTER_DIR}/skeleton-archer/skeleton.json`,
    atlas: `${MONSTER_DIR}/skeleton-archer/skeleton.atlas`,
    scale: 0.099,
    height: 55,
    idle: 'Idle',
    attack: 'Attack1',
    heavyAttack: 'Attack1',
    hit: 'Hit',
    death: 'Dead',
  },
  SKELETON_KNIGHT: {
    skeleton: `${MONSTER_DIR}/skeleton-knight/title_knight_740.json`,
    atlas: `${MONSTER_DIR}/skeleton-knight/title_knight_740.atlas`,
    scale: 0.045,
    height: 65,
    idle: 'movement_ide',
    attack: 'movement_ide',
    heavyAttack: 'movement_ide',
    hit: 'movement_ide',
    death: 'movement_ide',
  },
  SKELETON_WARRIOR: {
    skeleton: `${MONSTER_DIR}/skeleton-warrior/skeleton_worrior.json`,
    atlas: `${MONSTER_DIR}/skeleton-warrior/skeleton_worrior.atlas`,
    scale: 0.047,
    height: 58,
    idle: 'Idle',
    attack: 'Attack',
    heavyAttack: 'Attack',
    hit: 'Hit',
    death: 'Dead',
  },
  ANCIENT_TREANT: {
    skeleton: `${MONSTER_DIR}/ancient-treant/Treant.json`,
    atlas: `${MONSTER_DIR}/ancient-treant/Treant.atlas`,
    scale: 0.682,
    height: 70,
    idle: 'Idle',
    attack: 'Atk',
    heavyAttack: 'Skill_A',
    hit: 'Idle',
    death: 'Dead',
  },
  TROLL: {
    skeleton: `${MONSTER_DIR}/troll/troll_boss.json`,
    atlas: `${MONSTER_DIR}/troll/troll_boss.atlas`,
    scale: 0.077,
    height: 100,
    idle: 'Idle',
    attack: 'Attack01',
    heavyAttack: 'Attack01',
    hit: 'Hit',
    death: 'Dead',
  },
  VAULT_GUARDIAN: {
    skeleton: `${MONSTER_DIR}/vault-guardian/BS_small_armormonster_Ani.json`,
    atlas: `${MONSTER_DIR}/vault-guardian/BS_small_armormonster_Ani.atlas`,
    scale: 0.114,
    height: 62,
    idle: 'idle',
    attack: 'attack',
    heavyAttack: 'attack',
    hit: '1Hit',
    death: '1Hit',
  },
  VOID_PROPHET: {
    skeleton: `${MONSTER_DIR}/void-prophet/CultistFollower.json`,
    atlas: `${MONSTER_DIR}/void-prophet/CultistFollower.atlas`,
    scale: 0.048,
    height: 64,
    idle: 'idle',
    attack: 'pose_attack',
    heavyAttack: 'pose_cast_spell',
    hit: 'pose_hurt',
    death: 'pose_death',
    flipX: false, // authored facing left
    skin: 'normal',
  },
  WATER_ELEMENTAL: {
    skeleton: `${MONSTER_DIR}/water-elemental/water_elemental.json`,
    atlas: `${MONSTER_DIR}/water-elemental/water_elemental.atlas`,
    scale: 0.101,
    height: 60,
    idle: 'Idle',
    attack: 'Attack01',
    heavyAttack: 'Attack01',
    hit: 'Hit',
    death: 'Dead',
    flipX: false, // authored facing left
  },
  WRAITH: {
    skeleton: `${MONSTER_DIR}/wraith/specter.json`,
    atlas: `${MONSTER_DIR}/wraith/specter.atlas`,
    scale: 0.37,
    height: 50,
    idle: 'idle',
    attack: 'attack',
    heavyAttack: 'attack',
    hit: 'idle',
    death: 'idle',
  },
  CRYPT_CRAWLER: {
    skeleton: `${MONSTER_DIR}/crypt-crawler/Beetle.json`,
    atlas: `${MONSTER_DIR}/crypt-crawler/Beetle.atlas`,
    scale: 0.105,
    height: 42,
    idle: 'idle',
    appear: 'dash',
    attack: 'attack',
    heavyAttack: 'attack',
    hit: 'hurt',
    death: 'dead',
    flipX: false, // authored facing left
  },
  PLAGUE_RAT: {
    skeleton: `${MONSTER_DIR}/plague-rat/elf_rat.json`,
    atlas: `${MONSTER_DIR}/plague-rat/elf_rat.atlas`,
    scale: 0.182,
    height: 36,
    idle: 'idle',
    attack: 'attack_01',
    heavyAttack: 'attack_02',
    hit: 'hit',
    death: 'die',
    flipX: false, // authored facing left
    skin: 'skin1',
  },
  EMBER_SERPENT: {
    skeleton: `${MONSTER_DIR}/ember-serpent/Serpent_1.json`,
    atlas: `${MONSTER_DIR}/ember-serpent/Serpent_1.atlas`,
    scale: 0.116,
    height: 50,
    idle: 'Hover',
    attack: 'Fly',
    heavyAttack: 'Fly2',
    hit: 'Hover',
    death: 'Ground/Sleep',
    offY: -15,
    flipX: false, // authored facing left
  },
  CINDER_IMP: {
    skeleton: `${MONSTER_DIR}/cinder-imp/Tiefling_Imp.json`,
    atlas: `${MONSTER_DIR}/cinder-imp/Tiefling_Imp.atlas`,
    scale: 0.182,
    height: 42,
    idle: 'idle',
    attack: 'hit',
    heavyAttack: 'hit',
    hit: 'hit',
    death: 'hit',
    offY: -8,
  },
  THORN_STALKER: {
    skeleton: `${MONSTER_DIR}/thorn-stalker/CactusMonster.json`,
    atlas: `${MONSTER_DIR}/thorn-stalker/CactusMonster.atlas`,
    scale: 0.037,
    height: 65,
    idle: 'idle',
    attack: 'idle_mannerism_v1',
    heavyAttack: 'idle_mannerism_v2',
    hit: 'pose_hurt',
    death: 'pose_death',
    defend: 'pose_defend',
    skin: 'normal',
    flipX: false, // authored facing left
  },
  GIANT_CRAB: {
    skeleton: `${MONSTER_DIR}/giant-crab/giant_claw_crab.json`,
    atlas: `${MONSTER_DIR}/giant-crab/giant_claw_crab.atlas`,
    scale: 0.199,
    height: 48,
    idle: 'idle',
    attack: 'attack_01',
    heavyAttack: 'attack_02',
    hit: 'hit',
    death: 'die',
    flipX: false, // authored facing left
    skin: 'skin1',
  },
  SEWER_LURKER: {
    skeleton: `${MONSTER_DIR}/sewer-lurker/Anglerfish_Anim_01.json`,
    atlas: `${MONSTER_DIR}/sewer-lurker/Anglerfish_Anim_01.atlas`,
    scale: 0.029,
    height: 75,
    idle: 'Idle',
    attack: 'Action',
    heavyAttack: 'Thirsty Action',
    hit: 'Lose',
    death: 'Lose2 Burn',
    offY: -10,
    flipX: false, // authored facing left
  },
  GIANT_BEETLE: {
    skeleton: `${MONSTER_DIR}/giant-beetle/Beetle.json`,
    atlas: `${MONSTER_DIR}/giant-beetle/Beetle.atlas`,
    scale: 0.125,
    height: 50,
    idle: 'idle',
    appear: 'dash',
    attack: 'attack',
    heavyAttack: 'attack',
    hit: 'hurt',
    death: 'dead',
    flipX: false, // authored facing left
  },
  FOREST_BEAR: {
    skeleton: `${MONSTER_DIR}/forest-bear/Mission_14_bear.json`,
    atlas: `${MONSTER_DIR}/forest-bear/Mission_14_bear.atlas`,
    scale: 0.55,
    height: 68,
    idle: 'animation',
    attack: 'animation',
    heavyAttack: 'animation',
    hit: 'animation',
    death: 'animation',
  },
  CULTIST_ACOLYTE: {
    skeleton: `${MONSTER_DIR}/cultist-acolyte/cooltist.json`,
    atlas: `${MONSTER_DIR}/cultist-acolyte/cooltist.atlas`,
    scale: 0.083,
    height: 58,
    idle: 'active_idle',
    appear: 'active_start',
    attack: 'active_attack',
    heavyAttack: 'active_attack',
    hit: 'active_hit',
    death: 'active_end',
    flipX: false, // authored facing left
  },
  LANTERN_WISP: {
    skeleton: `${MONSTER_DIR}/lantern-wisp/soul_spine.json`,
    atlas: `${MONSTER_DIR}/lantern-wisp/soul_spine.atlas`,
    scale: 0.221,
    height: 40,
    idle: 'soul',
    attack: 'soul',
    heavyAttack: 'soul',
    hit: 'soul',
    death: 'soul',
    offY: -18,
    flipX: false, // internal bone soul has scaleX: -0.5
  },
  THRONE_GUARDIAN: {
    skeleton: `${MONSTER_DIR}/throne-guardian/zombie_CL_tank.json`,
    atlas: `${MONSTER_DIR}/throne-guardian/zombie_CL_tank.atlas`,
    scale: 0.394,
    height: 68,
    idle: 'idle',
    attack: 'atk',
    heavyAttack: 'atk',
    hit: 'idle',
    death: 'die',
  },
  STORM_CROW: {
    skeleton: `${MONSTER_DIR}/storm-crow/Unit_Spine_Crow3.json`,
    atlas: `${MONSTER_DIR}/storm-crow/Unit_Spine_Crow3.atlas`,
    scale: 0.075,
    height: 48,
    idle: 'stand',
    appear: 'posture',
    attack: 'attack',
    heavyAttack: 'attack',
    hit: 'hurt',
    death: 'death',
    offY: -14,
    flipX: false, // authored facing left
  },
  VAULT_HOUND: {
    skeleton: `${MONSTER_DIR}/vault-hound/Unit_Spine_RebelDog1.json`,
    atlas: `${MONSTER_DIR}/vault-hound/Unit_Spine_RebelDog1.atlas`,
    scale: 0.109,
    height: 48,
    idle: 'stand',
    appear: 'posture',
    attack: 'attack',
    heavyAttack: 'skill1',
    hit: 'hurt',
    death: 'death',
    flipX: false, // authored facing left
  },
  BARD: {
    skeleton: `${MONSTER_DIR}/bard/HeroBard.json`,
    atlas: `${MONSTER_DIR}/bard/HeroBard.atlas`,
    scale: 0.039,
    height: 60,
    idle: 'idle_aggressive',
    appear: 'idle_aggressive_mannerism',
    attack: 'pose_attack_v1',
    heavyAttack: 'pose_cast_spell_v1',
    hit: 'pose_hurt',
    death: 'pose_death',
    defend: 'pose_defend',
    skin: 'Color1_Normal',
  },
};
/** Picks the rig's skin, or its first non-empty skin when the default one has no attachments. */
function applyRigSkin(spine: Spine, rig: MonsterRig): void {
  if (rig.skin) {
    spine.skeleton.setSkinByName(rig.skin);
    spine.skeleton.setSlotsToSetupPose();
  } else if (!spine.skeleton.skin || spine.skeleton.skin.name === 'default') {
    const skins = spine.skeleton.data.skins;
    const nonDefault = skins.find((s) => s.name !== 'default');
    if (nonDefault && (!spine.skeleton.skin || spine.skeleton.skin.attachments.length === 0)) {
      spine.skeleton.setSkin(nonDefault);
      spine.skeleton.setSlotsToSetupPose();
    }
  }
}

/** Applies tint to Pixi Container, skeleton, and all individual Spine slots so the GPU batcher colors every part. */
function setSpineTint(spine: Spine, tint: number, isVfx = false): void {
  let r = (tint >> 16) & 0xFF;
  let g = (tint >> 8) & 0xFF;
  let b = tint & 0xFF;

  // Multiplicative Spine tinting on monster sprites crushes dark pixels into black silhouettes if RGB values are low.
  // For monster sprites, ensure channels stay in a high-luminance range (minimum 210) by soft-blending toward white,
  // preserving the intended hue while guaranteeing 100% of pixel-art textures and shading remain visible.
  if (!isVfx) {
    const minChannel = Math.min(r, g, b);
    const maxChannel = Math.max(r, g, b);
    if (maxChannel < 220 || minChannel < 180) {
      const factor = 0.25; // 25% tint strength, 75% white
      r = Math.round(255 - (255 - r) * factor);
      g = Math.round(255 - (255 - g) * factor);
      b = Math.round(255 - (255 - b) * factor);
      const curMin = Math.min(r, g, b);
      if (curMin < 210) {
        const boost = 210 - curMin;
        r = Math.min(255, r + boost);
        g = Math.min(255, g + boost);
        b = Math.min(255, b + boost);
      }
    }
  }

  const finalTint = (r << 16) | (g << 8) | b;
  spine.tint = finalTint;
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  if (spine.skeleton) {
    spine.skeleton.color?.set(rf, gf, bf, 1);
    if (spine.skeleton.slots) {
      for (const slot of spine.skeleton.slots) {
        slot.color?.set(rf, gf, bf, slot.color?.a ?? 1);
      }
    }
  }
}

let vfxRefs = 0; // engines holding the battle VFX rigs (see vfx.ts)

const MONSTER_X = 300;
const MONSTER_LUNGE_DISTANCE = 110; // how far toward the knight an attack dashes
const monsterAssetRefs = new Map<string, number>(); // shared rig → slots holding it
const rigQueues = new Map<string, Promise<void>>(); // skeleton key → tail of its load/unload queue

/**
 * Runs load/unload tasks for one rig strictly in order. Without this, an unload issued while a load
 * is in flight finds nothing in the cache, and the load then lands with no owner; and a load issued
 * during an unload can get the cached copy the unload is about to evict. Either way the GPU
 * textures are orphaned and never freed.
 */
function enqueueRigTask(skeleton: string, task: () => Promise<void>): Promise<void> {
  const next = (rigQueues.get(skeleton) ?? Promise.resolve()).catch(() => { }).then(task);
  rigQueues.set(skeleton, next);
  const settle = () => {
    if (rigQueues.get(skeleton) === next) rigQueues.delete(skeleton);
  };
  next.then(settle, settle);
  return next;
}

/** Loads a Spine rig's skeleton + atlas (queued behind any pending unload of the same rig). */
function loadSpineRig(skeleton: string, atlas: string): Promise<void> {
  return enqueueRigTask(skeleton, async () => {
    await Assets.load([skeleton, atlas]);
  });
}

/**
 * Unloads a Spine rig's skeleton + atlas. Spine.from() caches parsed SkeletonData under its own
 * key and never evicts it, so drop that too or a later reload would reuse destroyed textures.
 *
 * The spine-pixi-v8 atlas loader fetches page images through Assets.loader directly, and its unload
 * only destroys the Texture wrapper, so unload the page images as well or their GPU sources leak.
 */
function unloadSpineRig(skeleton: string, atlas: string, scale: number): Promise<void> {
  return enqueueRigTask(skeleton, async () => {
    // Evict all SkeletonData cache keys for this skeleton regardless of scale or variant scale multipliers
    const prefix = `${skeleton}-${atlas}-`;
    const cacheMap = (Cache as any)._cacheMap;
    if (cacheMap instanceof Map) {
      for (const key of [...cacheMap.keys()]) {
        if (typeof key === 'string' && (key.startsWith(prefix) || key === `${skeleton}-${atlas}`)) {
          Cache.remove(key);
        }
      }
    }
    const skeletonDataKey = `${skeleton}-${atlas}-${scale}`;
    if (Cache.has(skeletonDataKey)) Cache.remove(skeletonDataKey);
    const atlasDir = atlas.slice(0, atlas.lastIndexOf('/') + 1);
    const pageUrls = Assets.cache.has(atlas)
      ? Assets.get<TextureAtlas>(atlas).pages.map((page) => atlasDir + page.name)
      : [];
    try {
      await Assets.unload([skeleton, atlas]);
      await Assets.loader.unload(pageUrls);
    } catch (e) { }
  });
}

function retainMonsterRig(rig: MonsterRig): void {
  monsterAssetRefs.set(rig.skeleton, (monsterAssetRefs.get(rig.skeleton) ?? 0) + 1);
}

function releaseMonsterRig(rig: MonsterRig): void {
  const refs = (monsterAssetRefs.get(rig.skeleton) ?? 1) - 1;
  if (refs > 0) {
    monsterAssetRefs.set(rig.skeleton, refs);
  } else {
    monsterAssetRefs.delete(rig.skeleton);
    void unloadSpineRig(rig.skeleton, rig.atlas, rig.scale);
  }
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
export type MonsterAuraName =
  | 'fire'
  | 'ice'
  | 'poison'
  | 'summon'
  | 'void'
  | 'storm'
  | 'shadow'
  | 'golden'
  | 'holy'
  | 'earth';

export interface AuraPresetConfig {
  vfx: VfxName;
  vfxTint?: number;
  vfxSize: number;
  vfxAlpha: number;
  vfxY: number;
  poolColor: number;
  poolAlpha: number;
  outlineColor: number;
}

export const AURA_PRESET_CONFIGS: Record<MonsterAuraName, AuraPresetConfig> = {
  fire: {
    vfx: 'fire',
    vfxTint: 0xFF5722,
    vfxSize: 1.35,
    vfxAlpha: 0.6,
    vfxY: -18,
    poolColor: 0xC2410C,
    poolAlpha: 0.40,
    outlineColor: 0xFF5722,
  },
  ice: {
    vfx: 'ice',
    vfxTint: 0x38BDF8,
    vfxSize: 1.35,
    vfxAlpha: 0.65,
    vfxY: -18,
    poolColor: 0x0284C7,
    poolAlpha: 0.35,
    outlineColor: 0x00B0FF,
  },
  poison: {
    vfx: 'poison',
    vfxTint: 0x4ADE80,
    vfxSize: 1.30,
    vfxAlpha: 0.65,
    vfxY: -18,
    poolColor: 0x15803D,
    poolAlpha: 0.35,
    outlineColor: 0x22C55E,
  },
  void: {
    vfx: 'fire',
    vfxTint: 0x9333EA,
    vfxSize: 1.35,
    vfxAlpha: 0.6,
    vfxY: -18,
    poolColor: 0x4A148C,
    poolAlpha: 0.35,
    outlineColor: 0x9333EA,
  },
  storm: {
    vfx: 'fire',
    vfxTint: 0xFACC15,
    vfxSize: 1.35,
    vfxAlpha: 0.6,
    vfxY: -18,
    poolColor: 0xCA8A04,
    poolAlpha: 0.35,
    outlineColor: 0xEAB308,
  },
  shadow: {
    vfx: 'fire',
    vfxTint: 0x475569,
    vfxSize: 1.35,
    vfxAlpha: 0.55,
    vfxY: -18,
    poolColor: 0x0F172A,
    poolAlpha: 0.45,
    outlineColor: 0x64748B,
  },
  golden: {
    vfx: 'heal',
    vfxTint: 0xFBBF24,
    vfxSize: 1.25,
    vfxAlpha: 0.6,
    vfxY: -16,
    poolColor: 0xD97706,
    poolAlpha: 0.35,
    outlineColor: 0xF59E0B,
  },
  holy: {
    vfx: 'heal',
    vfxTint: 0xFDE68A,
    vfxSize: 1.25,
    vfxAlpha: 0.6,
    vfxY: -16,
    poolColor: 0xD97706,
    poolAlpha: 0.35,
    outlineColor: 0xFBBF24,
  },
  earth: {
    vfx: 'shockwave',
    vfxTint: 0x92400E,
    vfxSize: 1.25,
    vfxAlpha: 0.6,
    vfxY: -8,
    poolColor: 0x78350F,
    poolAlpha: 0.40,
    outlineColor: 0xB45309,
  },
  summon: {
    vfx: 'summon',
    vfxSize: 1.15,
    vfxAlpha: 0.65,
    vfxY: -8,
    poolColor: 0x6D28D9,
    poolAlpha: 0.35,
    outlineColor: 0x7C3AED,
  },
};

const AFFIX_AURA_MAP: Record<MonsterAffix, MonsterAuraName> = {
  FIRE: 'fire',
  FROST: 'ice',
  TOXIC: 'poison',
  VOID: 'void',
  STORM: 'storm',
  SHADOW: 'shadow',
  GOLDEN: 'golden',
};

/**
 * 32-Bit Retro PixiJS Game Engine for Amazon Fire TV (426x240 Virtual Resolution)
 * 
 * Strict Performance Constraints:
 * 1. Zero React Layout Thrashing: telemetry bypasses React state and feeds directly here.
 * 2. Strict VRAM Management: 426x240 canvas scaled with CSS pixelated rendering.
 *    Uses Assets.load/unload on scene transitions to prevent WebGL Context Loss on 1GB Fire TV sticks.
 * 3. Dynamic Spine/Attachment preview swapping with proactive asset unloading.
 */
export type MonsterInputItem =
  | MonsterSprite
  | {
      spriteType: MonsterSprite;
      tint?: number;
      scaleMultiplier?: number;
      skin?: string;
      aura?: MonsterAuraName;
      outlineColor?: number;
      affix?: MonsterAffix;
      element?: Element;
    };

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
  offX: number; // choreography displacement from base (monster moves)
  offY: number;
  kickX: number; // knockback / launch from knight hits, decays back to 0
  kickY: number;
  flashFrames: number; // hit-flash tint countdown (knight hits)
  activeMove: { cancel: () => void; length: number } | null;
  baseTint?: number;
  scaleMultiplier?: number;
  customOutline?: OutlineFilter | null;
  auraSpine?: Spine | null;
  auraPool?: Graphics | null;
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
  private hitReactionIndex: number = 0;
  private holdsKnightAssets: boolean = false;
  private knightLocked: boolean = false; // true while on a terminal pose (victory / defeat)
  private knightShadow: Graphics | null = null;

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
  /** Shared silhouette outline so monsters read against dark, busy backgrounds. */
  private monsterOutline = new OutlineFilter({ color: MONSTER_OUTLINE_COLOR });
  private targetSlotIndex: number = 0;
  private targetReticle: Graphics | null = null;
  private queuedMonsters: MonsterInputItem[] = ['SLIME'];
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
  private repStamp: RepStamp | null = null;
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

  // Monster move choreography (monsterMoves.ts)
  private hitStopFrames: number = 0;
  private spinesFrozen: boolean = false;
  private extraSpines: Set<Spine> = new Set(); // move-spawned rig clones (e.g. phantom wolves)
  private knightKnockX: number = 0;
  private debugClock: number = 0;
  private holdsVfx = false; // this engine's ref on the shared VFX rigs (loaded while monsters are up)
  private vfxReady = false;
  private debugVfx: Spine | null = null;
  private pendingMoveTrace: MoveTracer | null = null; // armed by debugMonsterMove, consumed by the next playMonsterMove
  private activeMoveTrace: MoveTracer | null = null;

  // Knight move choreography (knightMoves.ts)
  private activeKnightMove: { id: KnightMoveId; cancel: () => void } | null = null;
  // Casts made while a move plays wait their turn (playKnightMove), oldest first
  private knightMoveQueue: { id: KnightMoveId; opts: KnightMoveOptions }[] = [];
  private knightVictoryPending = false; // victory pose waits for the finishing blow's move to end
  private knightShieldPending = false; // Block pulse requested during a move
  private knightGuardShown = false; // the current move drew its own Block ward (guard())
  private knightTimeScale = 1; // Spine playback speed set by a move (hit-stop overrides it)
  public isKillCamActive: boolean = false;

  // Secret stage (trialScenes.ts): the scene on stage and which trial it is
  private trialScene: TrialScene | null = null;
  private trialId: SecretTrialId | null = null;
  private trialToken = 0; // a newer showSecretTrial call cancels a pending one
  private bgRequest = 0; // the latest loadBackground call
  private showcaseLight: Graphics | null = null;
  private showcaseHidden: Container[] = [];
  private trialTexture: Texture | null = null;

  // Dev automation (window.__kk): ready once init() finishes; loadsInFlight counts pending asset loads
  private isReady: boolean = false;
  private loadsInFlight: number = 0;

  constructor(containerElement: HTMLElement) {
    this.containerElement = containerElement;

    this.skeleton = {
      setAttachment: (slotName: string, attachmentName: string | null) => {
        if (attachmentName) {
          this.equippedSlots[slotName] = attachmentName;
          if (slotName === 'sword') this.equippedSlots['weapon'] = attachmentName;
          if (slotName === 'weapon') this.equippedSlots['sword'] = attachmentName;
        } else {
          delete this.equippedSlots[slotName];
          if (slotName === 'sword') delete this.equippedSlots['weapon'];
          if (slotName === 'weapon') delete this.equippedSlots['sword'];
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

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('[GameEngine] WebGL context lost; preventing default to allow context restoration');
    });
    canvas.addEventListener('webglcontextrestored', () => {
      console.info('[GameEngine] WebGL context restored; restoring assets');
      void this.loadKnightSpine();
      if (this.queuedMonsters.length > 0) {
        void this.setMonsters(this.queuedMonsters, this.queuedBackground);
      }
    });

    this.containerElement.replaceChildren(canvas);
    this.fitCanvas();
    this.resizeObserver = new ResizeObserver(() => this.fitCanvas());
    this.resizeObserver.observe(this.containerElement);

    this.buildScene();
    await this.loadKnightSpine();
    if (this.isDestroyed) return;
    this.startTicker();
    this.isReady = true;
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

    // 5. Rep stamp, screen-fixed above the camera-transformed scene
    this.repStamp = new RepStamp((rect) => {
      const c = this.app?.canvas.getBoundingClientRect();
      if (!c || !c.width || !c.height) return null;
      return { x: ((rect.left + rect.width / 2 - c.left) * 426) / c.width, y: ((rect.top - c.top) * 240) / c.height, h: (rect.height * 240) / c.height };
    });
    this.app.stage.addChild(this.repStamp.view);
  }

  /**
   * Acknowledges a counted rep on screen: the streak count and the exercise's name, then a stream into the
   * hand card it counted toward (`card`, if any).
   */
  public showRepStamp(exercise: ExerciseType, power: number = 80, card: RepCardTarget | null = null): void {
    // Mid-cast a counter would cover the attack: the rep streams straight into its card instead
    if (this.activeKnightMove) this.repStamp?.streamOnly(exercise, card);
    else this.repStamp?.show(exercise, power, card);
  }

  /** A card is being cast: clears the rep counters off the attack (their credit streams into their cards). */
  public clearRepStamps(): void {
    this.repStamp?.clear();
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

  public setCharactersVisible(visible: boolean): void {
    if (this.gameLayer) this.gameLayer.visible = visible;
    if (this.effectsLayer) this.effectsLayer.visible = visible;
    if (this.uiLayer) this.uiLayer.visible = visible;
  }

  public loadBackground(bgKey?: string): Promise<void> {
    return this.trackLoad(this.loadBackgroundNow(bgKey));
  }

  private async loadBackgroundNow(bgKey?: string): Promise<void> {
    if (!this.bgLayer) return;
    const targetKey = bgKey ?? MONSTER_BACKGROUNDS[this.monsterSprite] ?? BATTLE_BG_KEY;
    if (this.currentBgKey === targetKey && this.bgLayer.children.length > 0) return;
    // The latest request wins: a slower earlier load (e.g. the default at init) must not replace it
    const request = ++this.bgRequest;

    try {
      const texture = await Assets.load(targetKey);
      if (this.isDestroyed || !this.bgLayer || request !== this.bgRequest) return;

      // Unload previous background from VRAM to preserve 1GB Fire TV memory
      if (this.currentBgKey && this.currentBgKey !== targetKey && Assets.cache.has(this.currentBgKey)) {
        try {
          await Assets.unload(this.currentBgKey);
        } catch (e) { }
      }
      this.currentBgKey = targetKey;

      const bgSprite = new Sprite(texture);
      // Horizontal overscan padding (20px per side) so camera shakes (intensity up to 14px)
      // and zoom punch-ins never reveal the flat background edges/seams.
      const overscanX = 20;
      const scale = (426 + overscanX * 2) / 426;
      bgSprite.width = 426 + overscanX * 2;
      bgSprite.height = Math.round(240 * scale);
      bgSprite.x = -overscanX;
      // Shift up proportionally so the floor horizon (y=144 in image) sits at y=102,
      // placing combatants (y=128) firmly 16px deep onto the stone floor tiles.
      bgSprite.y = Math.round(102 - 144 * scale);

      const darkBase = new Graphics();
      darkBase.rect(-50, -30, 526, 300).fill({ color: 0x12101E });

      for (const child of this.bgLayer.children) {
        child.destroy({ children: true });
      }
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
    this.knightShadow = shadow;

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
      await loadSpineRig(KNIGHT_SKELETON_KEY, KNIGHT_ATLAS_KEY);
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
      this.updateKnightVisuals();
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
    if (this.activeKnightMove) {
      this.knightVictoryPending = true;
      return;
    }
    this.knightLocked = true;
    spine.state.setAnimation(0, 'WIN', false);
    spine.state.addAnimation(0, 'IDLE', true, 0);
  }

  /** Defeat: DEAD_START then DEAD_LOOP, held until resetKnight(). */
  public playKnightDefeat(): void {
    const spine = this.knightSpine;
    if (!spine || this.knightLocked) return;
    // A fallen knight casts nothing more: drop the queued casts, then cut the playing one short
    this.knightMoveQueue = [];
    this.activeKnightMove?.cancel();
    this.knightLocked = true;
    audioManager.play('hurt', { pan: -0.3 });
    audioManager.play('thud', { pan: -0.3, delay: 0.45, rate: 0.8 }); // armour hits the floor
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

  /**
   * Shows or removes a secret stage's scene (trialScenes.ts; null removes it): a full-screen hero shot over the
   * dimmed backdrop, with the knight staged beside it at the scene's zoom (borrowed from the battlefield and
   * handed back on removal). The sealed weapon is the knight atlas's own region, so it costs no extra VRAM.
   */
  public showSecretTrial(id: SecretTrialId | null): void {
    const actor = this.trialScene?.detachActor();
    if (actor && this.gameLayer && !actor.destroyed) {
      this.gameLayer.addChild(actor);
      actor.position.set(KNIGHT_HOME.x, KNIGHT_HOME.y);
      actor.scale.set(1);
      actor.visible = true;
      this.playTrialPose('IDLE', true);
    }
    this.trialScene?.destroy();
    this.trialScene = null;
    this.trialId = null;
    this.trialTexture?.destroy(false);
    this.trialTexture = null;
    const token = ++this.trialToken;
    if (!id || !this.app || !this.uiLayer) return;
    // The weapon art is the knight atlas's: wait for the rig if the trial is the first thing shown (dev URL)
    void loadSpineRig(KNIGHT_SKELETON_KEY, KNIGHT_ATLAS_KEY)
      .catch((err) => console.warn('[GameEngine] Knight rig unavailable for the trial:', err))
      .then(() => {
        if (token === this.trialToken && !this.isDestroyed) this.stageSecretTrial(id);
      });
  }

  private stageSecretTrial(id: SecretTrialId): void {
    if (!this.app || !this.uiLayer) return;
    try {
      const region = Assets.get<TextureAtlas>(KNIGHT_ATLAS_KEY)?.findRegion(id);
      if (region) {
        const source = (region.page.texture as SpineTexture).texture.source;
        this.trialTexture = new Texture({ source, frame: new Rectangle(region.x, region.y, region.width, region.height) });
      }
    } catch (err) {
      console.warn('[GameEngine] Trial weapon art unavailable:', id, err);
    }
    const scene: TrialScene = TRIAL_SCENES[id].create(this.trialTexture, this.app.ticker, {
      shake: (n) => this.moveShake(n),
      handPoint: (): { x: number; y: number } | null => this.knightHandIn(scene.view),
    });
    this.trialScene = scene;
    this.trialId = id;
    this.uiLayer.addChildAt(scene.view, 0);
    if (this.knightContainer) {
      this.knightContainer.visible = true;
      scene.attachActor(this.knightContainer);
      this.playTrialPose('IDLE', true);
    }
  }

  /** The knight's weapon hand (the grip bone of the weapon slot) in `space`'s coordinates. */
  private knightHandIn(space: Container): { x: number; y: number } | null {
    const spine = this.knightSpine;
    const bone = spine?.skeleton.findSlot('sword')?.bone;
    if (!spine || spine.destroyed || !bone) return null;
    return space.toLocal(spine.toGlobal({ x: bone.worldX, y: bone.worldY }));
  }

  /** Plays a knight animation during a trial, returning to the idle loop after one-shots. */
  private playTrialPose(anim: string, loop = false, then = 'IDLE'): void {
    const spine = this.knightSpine;
    if (!spine || spine.destroyed || !spine.skeleton.data.findAnimation(anim)) return;
    spine.state.setAnimation(0, anim, loop);
    if (!loop) spine.state.addAnimation(0, then, true, 0);
  }

  /** A trial rep: the scene answers and the knight strains. `progress` = 0–1 toward the win. */
  public secretTrialRep(progress: number, power = 80): void {
    this.trialScene?.setProgress(progress);
    this.trialScene?.rep(power);
    if (this.trialId) this.playTrialPose(TRIAL_SCENES[this.trialId].repPose);
  }

  /** A trial rep that did not count (too weak, off the beat): the scene shrugs it off, the knight still moves. */
  public secretTrialMiss(kind: TrialRepResult, power = 80): void {
    this.trialScene?.miss?.(kind, power);
    if (this.trialId) this.playTrialPose(TRIAL_SCENES[this.trialId].repPose);
  }

  /** Every frame while the clock runs: progress (a leak trial's drains) and danger, both 0–1. */
  public secretTrialFrame(progress: number, danger: number): void {
    this.trialScene?.setProgress(progress);
    this.trialScene?.setClock?.(danger);
  }

  /** Rhythm trials: the beat. */
  public secretTrialBeat(): void {
    this.trialScene?.beat?.();
  }

  /** The Hollow Choir: the scene lies for a moment. */
  public secretTrialGlitch(): void {
    this.trialScene?.glitch?.();
  }

  /** Trial won: the knight strains, the weapon breaks free and rises, then settles into his hand. */
  public secretTrialWin(): void {
    const id = this.trialId;
    this.playTrialPose('SKILL2TULUC');
    this.trialScene?.pull(() => {
      if (this.isDestroyed || !id) return;
      this.skeleton.setAttachment('weapon', id);
      this.playTrialPose('LEVEL_UP', false, 'WIN');
    });
  }

  /** Trial failed: the scene seals and throws the knight back. */
  public secretTrialLose(): void {
    this.trialScene?.reject();
    this.playTrialPose('HIT2');
  }

  /**
   * Blacksmith fitting room: the knight steps forward into a pool of forge light on the left (clear of the shop
   * panel docked on the right) at a larger scale so previewed gear reads, and any monsters left on stage are hidden.
   */
  public setShowcase(on: boolean): void {
    const knight = this.knightContainer;
    if (!knight || !this.gameLayer || on === !!this.showcaseLight) return;
    if (on) {
      this.showcaseHidden = [...this.monsterSlots.map((s) => s.container), this.enemyDummy, this.targetReticle]
        .filter((c): c is Container => !!c && c.visible);
      this.showcaseHidden.forEach((c) => (c.visible = false));
      const light = new Graphics();
      light.ellipse(0, 0, 46, 10).fill({ color: 0xF59E0B, alpha: 0.16 });
      light.ellipse(0, 0, 30, 6).fill({ color: 0xFDE68A, alpha: 0.18 });
      light.poly([-20, -150, 20, -150, 44, 0, -44, 0]).fill({ color: 0xFDE68A, alpha: 0.06 });
      light.blendMode = 'add';
      light.position.set(SHOWCASE_KNIGHT.x, SHOWCASE_KNIGHT.y);
      light.zIndex = -200;
      this.gameLayer.addChild(light);
      this.showcaseLight = light;
      knight.position.set(SHOWCASE_KNIGHT.x, SHOWCASE_KNIGHT.y);
      knight.scale.set(SHOWCASE_KNIGHT.scale);
    } else {
      this.showcaseHidden.forEach((c) => (c.visible = true));
      this.showcaseHidden = [];
      this.showcaseLight?.destroy();
      this.showcaseLight = null;
      knight.position.set(KNIGHT_HOME.x, KNIGHT_HOME.y);
      knight.scale.set(1);
    }
  }

  /** Clears victory/defeat lock and returns the knight to IDLE (new battle). */
  /** Pause menu: stops the render ticker, so rigs, moves, VFX and the frame on screen all hold. */
  public setPaused(paused: boolean): void {
    const ticker = this.app?.ticker;
    if (!ticker || this.isDestroyed) return;
    if (paused) ticker.stop();
    else ticker.start();
  }

  public resetKnight(): void {
    this.knightLocked = false;
    this.knightVictoryPending = false;
    this.isKillCamActive = false;
    this.hitStopFrames = 0;
    this.spinesFrozen = false;
    if (this.app?.ticker) this.app.ticker.speed = 1.0;
    this.targetCameraZoom = 1.0;
    this.cameraZoom = 1.0;
    this.cameraFocusX = 213;
    this.cameraFocusY = 120;
    if (this.knightSpine && !this.knightSpine.destroyed) {
      this.knightSpine.state.timeScale = 1.0;
      this.knightSpine.state.setAnimation(0, 'IDLE', true);
    }
  }

  private createTrainingDummy(): void {
    if (!this.gameLayer) return;

    this.enemyDummy = new Container();
    this.enemyDummy.x = MONSTER_X;
    this.enemyDummy.y = 168;
    this.gameLayer.addChild(this.enemyDummy);

    this.createTargetReticle();
    void this.setMonsters(this.queuedMonsters, this.queuedBackground);
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

  public setMonsters(monstersInput: MonsterInputItem[], customBg?: string): Promise<void> {
    audioManager.prewarm(); // render the sound bank in the background while the rigs load
    return this.trackLoad(this.loadMonsters(monstersInput, customBg));
  }

  private queuedBackground?: string;

  private async loadMonsters(monstersInput: MonsterInputItem[], customBg?: string): Promise<void> {
    const token = ++this.monsterLoadToken;
    const requestedTypes: MonsterSprite[] = monstersInput.map(t => typeof t === 'string' ? t : t.spriteType);
    this.queuedMonsters = monstersInput;
    this.queuedBackground = customBg;

    if (!this.gameLayer) return;

    const count = Math.min(3, Math.max(1, requestedTypes.length));

    // Retain the new rigs before releasing the old ones so a rig shared by both encounters is
    // never unloaded and immediately reloaded. Each ref passes to its slot once the slot is created.
    for (const type of requestedTypes.slice(0, count)) retainMonsterRig(MONSTER_RIGS[type]);
    this.clearAllMonsters();
    this.retainVfx();

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
    const bg = customBg ?? MONSTER_BACKGROUNDS[requestedTypes[0]] ?? BATTLE_MAPS.CATHEDRAL_CRYPT;
    void this.loadBackground(bg);

    for (let i = 0; i < count; i++) {
      const input = monstersInput[i];
      const variant = typeof input === 'object' && input !== null ? input : null;
      const type = requestedTypes[i];
      const pos = coords[i];
      const scaleMult = variant?.scaleMultiplier ?? 1;

      const slotContainer = new Container();
      slotContainer.x = pos.x;
      slotContainer.y = pos.y;
      slotContainer.zIndex = pos.zIndex;

      // Drop shadow for monster (scaled to variant size)
      const shadow = new Graphics();
      shadow.ellipse(0, 0, 24 * scaleMult, 5 * scaleMult).fill({ color: 0x000000, alpha: 0.4 });
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
        offX: 0,
        offY: 0,
        kickX: 0,
        kickY: 0,
        flashFrames: 0,
        activeMove: null,
        baseTint: variant?.tint,
        scaleMultiplier: scaleMult,
        customOutline: null,
        auraSpine: null,
      };

      this.monsterSlots.push(slot);
      this.gameLayer.addChild(slotContainer);

      try {
        await loadSpineRig(rig.skeleton, rig.atlas);
      } catch (err) {
        console.error(`[GameEngine] Failed to load monster rig ${type}:`, err);
        continue;
      }

      if (this.isDestroyed || token !== this.monsterLoadToken) {
        // Superseded: slots already created are released by clearAllMonsters; release the rest here.
        for (const t of requestedTypes.slice(i + 1, count)) releaseMonsterRig(MONSTER_RIGS[t]);
        return;
      }

      const resolvedAura: MonsterAuraName | undefined =
        variant?.aura ??
        (variant?.affix ? AFFIX_AURA_MAP[variant.affix] : undefined) ??
        (variant?.element === 'VOID' ? 'void' : undefined);

      const auraCfg = resolvedAura ? AURA_PRESET_CONFIGS[resolvedAura] : undefined;

      try {
        const spineScale = rig.scale * scaleMult;
        const spine = Spine.from({ skeleton: rig.skeleton, atlas: rig.atlas, scale: spineScale, autoUpdate: true });
        if (this.app) spine.ticker = this.app.ticker;
        if (rig.flipX !== false) {
          spine.scale.x *= -1; // face knight on the left
        }

        // Variant Skin or default rig skin
        if (variant?.skin) {
          try {
            spine.skeleton.setSkinByName(variant.skin);
            spine.skeleton.setSlotsToSetupPose();
          } catch {
            applyRigSkin(spine, rig);
          }
        } else {
          applyRigSkin(spine, rig);
        }

        // Outline filter (variant custom color, aura preset outline, or standard monster outline)
        const outlineColor = variant?.outlineColor !== undefined
          ? variant.outlineColor
          : auraCfg?.outlineColor;

        if (outlineColor !== undefined) {
          const customFilter = new OutlineFilter({ color: outlineColor });
          slot.customOutline = customFilter;
          spine.filters = [customFilter];
        } else {
          spine.filters = [this.monsterOutline];
        }

        // Variant Base Tint (high luminance highlight preserving full sprite pixel art)
        if (variant?.tint !== undefined) {
          setSpineTint(spine, variant.tint);
        }

        if (rig.offY) {
          spine.y += rig.offY * scaleMult;
        }

        const atlasAsset = Assets.get<TextureAtlas>(rig.atlas);
        if (atlasAsset?.pages) {
          for (const page of atlasAsset.pages) {
            const source = (page.texture as SpineTexture)?.texture?.source;
            if (source) {
              source.autoGenerateMipmaps = true;
              source.style.scaleMode = 'linear';
              source.style.mipmapFilter = 'linear';
              source.style.update();
            }
          }
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
      } catch (err) {
        console.error(`[GameEngine] Failed to instantiate monster rig ${type}:`, err);
      }

      // Ambient Elemental Affix Aura & Floor Pool
      if (auraCfg) {
        const attachAura = () => {
          if (this.isDestroyed || !slot.isAlive || slotContainer.destroyed) return;

          // Ambient elemental pool on floor beneath monster drop shadow
          const pool = new Graphics();
          pool.ellipse(0, 0, 22 * scaleMult, 7 * scaleMult);
          pool.fill({ color: auraCfg.poolColor, alpha: auraCfg.poolAlpha });
          slot.auraPool = pool;
          slotContainer.addChildAt(pool, 0);

          // Billowing elemental aura rendered on top of the monster spine
          const auraY = ((rig.offY ?? 0) + auraCfg.vfxY) * scaleMult;
          const aura = this.spawnVfx(slotContainer, auraCfg.vfx, 0, auraY, {
            loop: true,
            size: auraCfg.vfxSize * scaleMult,
            alpha: auraCfg.vfxAlpha,
            tint: auraCfg.vfxTint,
          });
          if (aura) {
            slot.auraSpine = aura;
            // Render on top of the monster spine so the elemental VFX is clearly visible
            slotContainer.setChildIndex(aura, slotContainer.children.length - 1);
          }
        };

        if (this.vfxReady) {
          attachAura();
        } else {
          void Promise.all(VFX_NAMES.map((n) => loadSpineRig(VFX_RIGS[n].skeleton, VFX_RIGS[n].atlas)))
            .then(attachAura)
            .catch(() => {});
        }
      }
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

  /** Destroys all current monster slots and unloads their assets. */
  private clearAllMonsters(): void {
    for (const slot of this.monsterSlots) {
      slot.activeMove?.cancel();
      if (slot.customOutline) {
        slot.customOutline.destroy();
        slot.customOutline = null;
      }
      if (slot.auraPool) {
        slot.auraPool.destroy();
        slot.auraPool = null;
      }
      if (slot.auraSpine) {
        slot.auraSpine.destroy();
        slot.auraSpine = null;
      }
      if (slot.spine) {
        slot.spine.destroy();
        slot.spine = null;
      }
      if (slot.container && this.gameLayer) {
        this.gameLayer.removeChild(slot.container);
        slot.container.destroy({ children: true });
      }
      if (slot.rig) releaseMonsterRig(slot.rig);
    }
    this.isKillCamActive = false;
    this.hitStopFrames = 0;
    this.spinesFrozen = false;
    this.knightMoveQueue = []; // dropped first, or cancelling the move would start the next one
    this.activeKnightMove?.cancel();
    this.activeKnightMove = null;
    this.knightLocked = false;
    this.knightVictoryPending = false;

    for (const eff of this.activeEffects) {
      eff.onDestroy?.();
      eff.container.destroy({ children: true });
    }
    this.activeEffects = [];

    for (const p of this.activeProjectiles) {
      p.container.destroy({ children: true });
    }
    this.activeProjectiles = [];

    for (const p of this.particles) {
      p.graphics.destroy();
    }
    this.particles = [];

    for (const t of this.floatingTexts) {
      t.container.destroy({ children: true });
    }
    this.floatingTexts = [];

    for (const s of this.extraSpines) {
      if (!s.destroyed) s.destroy();
    }
    this.extraSpines.clear();

    if (this.app?.ticker) this.app.ticker.speed = 1.0;
    this.monsterSlots = [];
    this.monsterSpine = null;
    this.monsterRig = null;
    // Free pooled filter render targets after unbinding from global filter group
    const filterSystem = (this.app?.renderer as any)?.filter;
    if (filterSystem?._globalFilterBindGroup) {
      filterSystem._globalFilterBindGroup.setResource(Texture.EMPTY.source, 1);
      filterSystem._globalFilterBindGroup.setResource(Texture.EMPTY.source.style, 2);
      filterSystem._globalFilterBindGroup.setResource(Texture.EMPTY.source, 3);
    }
    TexturePool.clear(true);
  }

  private clearMonster(): void {
    this.clearAllMonsters();
  }

  /**
   * Removes all monsters and frees their rigs (e.g. when leaving battle). Also cancels any
   * in-flight setMonsters() so a late load can't repopulate the stage.
   */
  public clearMonsters(): void {
    this.monsterLoadToken++;
    this.clearAllMonsters();
    this.releaseVfx();
  }

  /** Loads the battle VFX rigs (vfx.ts) once per engine; they stay up until the monsters are cleared. */
  private retainVfx(): void {
    if (this.holdsVfx) return;
    this.holdsVfx = true;
    vfxRefs++;
    void this.trackLoad(
      Promise.all(VFX_NAMES.map((n) => loadSpineRig(VFX_RIGS[n].skeleton, VFX_RIGS[n].atlas)))
        .then(() => {
          if (this.holdsVfx && !this.isDestroyed) this.vfxReady = true;
        })
        .catch((err) => console.warn('[GameEngine] VFX rigs failed to load; moves fall back to Graphics VFX', err)),
    );
  }

  private releaseVfx(): void {
    if (!this.holdsVfx) return;
    this.holdsVfx = false;
    this.vfxReady = false;
    this.debugVfx?.destroy();
    this.debugVfx = null;
    if (--vfxRefs <= 0) {
      vfxRefs = 0;
      for (const n of VFX_NAMES) void unloadSpineRig(VFX_RIGS[n].skeleton, VFX_RIGS[n].atlas, 1);
    }
  }

  /**
   * Plays a VFX rig at (x, y) in `parent` (a move-owned layer, so it never outlives its move). One-shots
   * remove themselves when their animation ends. Returns the Spine, or null while the rigs are loading
   * (callers keep their Graphics VFX, so a missing rig never leaves a move without effects).
   */
  /**
   * The sound each Spine VFX makes when a move spawns it, so every burst, slam and spell is heard even
   * when its move adds nothing of its own. Played even while the rigs load (spawnVfx returns null).
   */
  private vfxSound(name: VfxName, o: VfxOpts, pan: number): void {
    const vol = Math.min(1.2, 0.55 + 0.45 * (o.size ?? 1)) * (o.alpha ?? 1);
    const ground = o.layer === 'ground' || (o.squash ?? 1) < 0.7;
    switch (name) {
      case 'explosion': return audioManager.play('explosion', { vol, pan });
      case 'shockwave': return audioManager.play(o.anim === 'ShockWave_2' ? 'quake' : 'stomp', { vol, pan });
      case 'ice': return audioManager.play('ice', { vol, pan });
      case 'poison': return audioManager.play('poison', { vol, pan });
      case 'fire': return audioManager.play(o.loop ? 'fire' : 'fire_burst', { vol, pan });
      case 'slash': return audioManager.play('slash', { vol: vol * 0.8, pan });
      case 'summon': return audioManager.play(ground ? 'rune' : 'portal', { vol: vol * 0.8, pan });
      case 'heal': return audioManager.play('heal', { vol, pan });
      default: // hitSpark: the hit's own impact sound covers it
    }
  }

  private spawnVfx(parent: Container, name: VfxName, x: number, y: number, o: VfxOpts = {}): Spine | null {
    const rig = VFX_RIGS[name];
    if (!this.vfxReady || !rig || !this.app || parent.destroyed) return null;
    let vfx: Spine;
    try {
      vfx = Spine.from({ skeleton: rig.skeleton, atlas: rig.atlas, scale: 1, autoUpdate: true });
    } catch {
      return null;
    }
    vfx.ticker = this.app.ticker;
    if (rig.skin) {
      vfx.skeleton.setSkinByName(rig.skin);
      vfx.skeleton.setSlotsToSetupPose();
    }
    const anim = o.anim && vfx.skeleton.data.findAnimation(o.anim) ? o.anim : rig.anims[0];
    const entry = vfx.state.setAnimation(0, anim, !!o.loop || o.life !== undefined);
    if (o.start) entry.trackTime = o.start / 60;
    vfx.state.timeScale = o.speed ?? 1;
    const size = rig.scale * (o.size ?? 1);
    vfx.scale.set(size * (o.flipX ? -1 : 1), size * (o.squash ?? 1));
    vfx.rotation = o.rotation ?? 0;
    vfx.position.set(x, y);
    if (o.tint !== undefined) setSpineTint(vfx, o.tint, true);
    vfx.alpha = o.alpha ?? 1;
    parent.addChild(vfx);
    vfx.update(0);
    if (!o.loop || o.life !== undefined) {
      const baseAlpha = vfx.alpha;
      let age = 0;
      this.activeEffects.push({
        container: new Container(),
        life: 0,
        maxLife: Number.POSITIVE_INFINITY,
        onUpdate: (_eff, delta) => {
          if (vfx.destroyed) return true;
          age += delta;
          if (o.life !== undefined) {
            const fade = 8;
            if (age > o.life - fade) vfx.alpha = baseAlpha * Math.max(0, (o.life - age) / fade);
            if (age < o.life) return false;
          } else if (!entry.isComplete()) return false;
          vfx.destroy();
          return true;
        },
      });
    }
    return vfx;
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
    audioManager.play('death', { pan: 0.3, delay: 0.1 });

    if (slot.spine && slot.rig) {
      const deathAnim = slot.rig.death && slot.spine.skeleton.data.findAnimation(slot.rig.death)
        ? slot.rig.death
        : (slot.rig.hit && slot.spine.skeleton.data.findAnimation(slot.rig.hit) ? slot.rig.hit : null);

      if (deathAnim) {
        slot.spine.state.setAnimation(0, deathAnim, false);
      }

      const animDuration = (deathAnim ? slot.spine.skeleton.data.findAnimation(deathAnim)?.duration : 0.6) ?? 0.6;
      // Hold for the duration of the death animation (in 60fps delta frames), then fade out over 25 frames
      const holdFrames = Math.max(30, Math.round(animDuration * 60));
      const fadeFrames = 25;
      let frameCount = 0;

      this.activeEffects.push({
        container: new Container(),
        life: 0,
        maxLife: holdFrames + fadeFrames,
        onUpdate: (_eff, delta) => {
          frameCount += delta;
          if (frameCount >= holdFrames && slot.container) {
            const p = (frameCount - holdFrames) / fadeFrames;
            slot.container.alpha = Math.max(0, 1 - p);
          }
          return frameCount >= holdFrames + fadeFrames;
        },
        onDestroy: () => {
          if (slot.container) slot.container.alpha = 0;
        },
      });
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
   * Plays a choreographed monster move (see monsterMoves.ts). `onImpact` runs on the move's impact
   * frame and applies the battle effect; its result drives the floating label and knight reaction.
   * Moves are cancelled (and never land) if the monster dies or the encounter changes mid-move.
   */
  public playMonsterMove(
    slotIndex: number,
    move: MonsterMoveId | undefined,
    opts: { heavy?: boolean; onImpact?: () => ImpactResult | void } = {},
  ): void {
    const slot = this.monsterSlots[slotIndex];
    const choreo = move ? MONSTER_MOVES[move] : undefined;
    if (!slot || slot.isLocked || !slot.isAlive || !choreo || !this.effectsLayer || !this.gameLayer) {
      // No rig or no choreography: fall back to the generic lunge and land immediately
      if (slot && slot.isAlive && !slot.isLocked && !choreo) this.monsterAttackLunge(slotIndex, !!opts.heavy);
      this.showImpactLabel(opts.onImpact?.(), slot);
      return;
    }

    slot.activeMove?.cancel();

    const fx = new Container();
    this.effectsLayer.addChild(fx);
    const ground = new Container();
    ground.zIndex = -100; // decals: above the dim overlay, below the characters
    this.gameLayer.addChild(ground);
    const dimmer = this.createDimmer();
    const clones: Spine[] = [];
    const spine = slot.spine;
    const rig = slot.rig;
    const restScale = spine ? { x: spine.scale.x, y: spine.scale.y } : { x: 1, y: 1 };
    const knight = { x: this.knightContainer?.x ?? 130, y: this.knightContainer?.y ?? 168 };
    let impacted = false;
    let finished = false;
    const tl = new Timeline();
    const trace = this.pendingMoveTrace;
    this.pendingMoveTrace = null;
    if (trace) this.activeMoveTrace = trace;
    const seen = new Set<Container>(); // move graphics that existed at the previous traced frame

    const impact = (knockback = 8) => {
      if (impacted) return;
      impacted = true;
      trace?.impact(tl.frame, finished);
      const result = opts.onImpact?.();
      if (result?.at !== 'monster' && result?.hit !== false) {
        this.knightHitReaction(knockback);
        audioManager.play('hurt', { pan: -0.3 });
      }
      if (result?.hit === false) {
        this.spawnSparks(knight.x + 6, knight.y - 28, 10, [0x38B6FF, 0xFFFFFF]);
        audioManager.play('block', { pan: -0.3 });
      }
      this.showImpactLabel(result, slot);
    };

    const host: MoveHost = {
      home: { x: slot.baseX, y: slot.baseY },
      knight,
      height: rig?.height ?? 40,
      pos: () => ({ x: slot.baseX + slot.offX, y: slot.baseY + slot.offY }),
      gfx: (layer = 'fx') => (layer === 'ground' ? ground : fx).addChild(new Graphics()),
      vfx: (name, x, y, o = {}) => {
        trace?.vfx(name);
        this.vfxSound(name, o, 0.3);
        return this.spawnVfx(o.layer === 'ground' ? ground : fx, name, x, y, o);
      },
      container: (layer = 'fx') => (layer === 'ground' ? ground : fx).addChild(new Container()),
      anim: (name, loop = false) => {
        if (spine && !spine.skeleton.data.findAnimation(name)) trace?.missingAnim(name);
        if (!spine || !rig || slot.isLocked || !spine.skeleton.data.findAnimation(name)) return;
        spine.state.setAnimation(0, name, loop);
        if (!loop) spine.state.addAnimation(0, rig.idle, true, 0);
      },
      idle: () => {
        if (spine && rig && !slot.isLocked) spine.state.setAnimation(0, rig.idle, true);
      },
      offset: (x, y = 0) => {
        slot.offX = x;
        slot.offY = y;
      },
      lift: (height) => {
        if (spine) spine.y = (rig?.offY ?? 0) - height; // keep floating rigs (rig.offY) at their hover height
        const s = Math.max(0.3, 1 - height / 160);
        slot.shadow.scale.set(s);
        slot.shadow.alpha = s;
      },
      stretch: (sx, sy) => spine?.scale.set(restScale.x * sx, restScale.y * sy),
      tilt: (radians) => {
        if (spine) spine.rotation = radians;
      },
      alpha: (a) => {
        slot.container.alpha = a;
      },
      tint: (color) => {
        if (spine) spine.tint = color;
      },
      clone: () => {
        if (!rig || !this.app) return null;
        try {
          const copy = Spine.from({ skeleton: rig.skeleton, atlas: rig.atlas, scale: rig.scale, autoUpdate: true });
          copy.ticker = this.app.ticker;
          if (rig.flipX !== false) copy.scale.x *= -1;
          applyRigSkin(copy, rig);
          fx.addChild(copy);
          clones.push(copy);
          this.extraSpines.add(copy);
          return copy;
        } catch {
          return null;
        }
      },
      camera: (zoom, x, y, holdFrames) => this.moveCamera(zoom, x, y, holdFrames),
      shake: (intensity) => this.moveShake(intensity),
      flash: (alpha, color) => this.moveFlash(alpha, color),
      hitStop: (frames) => {
        this.hitStopFrames = Math.max(this.hitStopFrames, frames);
      },
      dim: dimmer.dim,
      knightHit: (knockback = 6) => {
        trace?.chip(tl.frame);
        this.knightHitReaction(knockback);
        audioManager.play('hurt', { pan: -0.3, vol: 0.6 });
      },
      impact,
      sparks: (x, y, count, colors) => this.spawnSparks(x, y, count, colors),
      shockwave: (x, y, color) => this.spawnShockwave(x, y, color),
      streaks: (x, y, length, colors) => this.spawnSpeedStreaks(x, y, length, colors),
      emit: (x, y, o) => this.emitParticles(x, y, o),
      slashArc: (g, cx, cy, r, a0, a1, shadow, body, core) => this.drawPainterlySlashArc(g, cx, cy, r, a0, a1, shadow, body, core),
      text: (content, x, y, color, size) => this.spawnFloatingText(content, x, y, color, size),
      sound: (name, o) => audioManager.play(name, { pan: 0.3, ...o }),
    };

    const finish = (cancelled: boolean) => {
      if (finished) return;
      finished = true;
      if (!cancelled && !impacted) impact(); // a move must always land once
      if (trace) {
        trace.length = tl.length;
        trace.finish(spine && !spine.destroyed ? {
          offX: slot.offX,
          offY: slot.offY,
          lift: (rig?.offY ?? 0) - spine.y,
          alpha: slot.container.alpha,
          tint: spine.tint,
          rotation: spine.rotation,
          scaleX: spine.scale.x / restScale.x,
          scaleY: spine.scale.y / restScale.y,
        } : null, cancelled);
        if (this.activeMoveTrace === trace) this.activeMoveTrace = null;
      }
      slot.activeMove = null;
      slot.offX = 0;
      slot.offY = 0;
      slot.shadow.scale.set(1);
      slot.shadow.alpha = 1;
      if (spine && !spine.destroyed) {
        spine.x = 0;
        spine.y = rig?.offY ?? 0;
        spine.rotation = 0;
        spine.scale.set(restScale.x, restScale.y);
        spine.tint = 0xFFFFFF;
        const current = spine.state.getCurrent(0);
        if (rig && !slot.isLocked && current?.loop && current.animation?.name !== rig.idle) {
          spine.state.setAnimation(0, rig.idle, true);
        }
      }
      if (!slot.isLocked && !slot.container.destroyed) slot.container.alpha = 1;
      for (const c of clones) {
        this.extraSpines.delete(c);
      }
      fx.destroy({ children: true });
      ground.destroy({ children: true });
      dimmer.destroy();
    };

    try {
      choreo(host, tl);
    } catch (err) {
      console.error(`[GameEngine] monster move ${move} failed to build:`, err);
      trace?.fail(err);
      finish(false);
      return;
    }
    slot.activeMove = { cancel: () => finish(true), length: tl.length };

    this.activeEffects.push({
      container: new Container(),
      life: 0,
      maxLife: Number.POSITIVE_INFINITY,
      onUpdate: (_eff, delta) => {
        if (finished) return true;
        if (this.isDestroyed || !slot.isAlive || slot.isLocked || slot.container.destroyed) {
          finish(true);
          return true;
        }
        let done: boolean;
        try {
          done = tl.tick(delta);
        } catch (err) {
          // A broken frame ends the move (it still lands) instead of stalling the ticker every frame
          console.error(`[GameEngine] monster move ${move} threw at frame ${Math.round(tl.frame)}:`, err);
          trace?.fail(err);
          done = true;
        }
        if (trace && !finished) this.sampleMoveTrace(trace, tl.frame, [fx, ground], slot.container, seen);
        if (done) finish(false);
        return done;
      },
    });
  }

  /** Dev: records what a traced move put on screen this frame (see moveTrace.ts). */
  private sampleMoveTrace(trace: MoveTracer, frame: number, layers: Container[], monster: Container, seen: Set<Container>): void {
    const box = (c: Container): Box => {
      const b = c.getBounds();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    };
    // Only graphics that were already on screen last frame count, so a burst spawned on the impact
    // frame itself can't pass for the attack reaching the knight
    const fxBoxes: Box[] = [];
    const now = new Set<Container>();
    for (const layer of layers) {
      for (const child of layer.children) {
        now.add(child);
        if (seen.has(child) && child.visible && child.alpha > 0.05) fxBoxes.push(box(child));
      }
    }
    seen.clear();
    for (const c of now) seen.add(c);
    const knight = this.knightContainer ? box(this.knightContainer) : { x: 0, y: 0, w: 0, h: 0 };
    const screen = { x: 0, y: 0, w: this.app?.screen.width ?? 426, h: this.app?.screen.height ?? 240 };
    trace.sample(frame, fxBoxes, monster.alpha > 0.05 ? box(monster) : null, knight, screen);
  }

  /**
   * Dev bridge: plays monster move `move` on a slot without touching battle state and arms a tracer.
   * `selfTarget` marks DEFEND/BUFF moves (no contact check). Read the result with debugMoveTrace().
   * Returns the timeline length in frames, or null if the move didn't start.
   */
  public debugMonsterMove(slotIndex: number, move: MonsterMoveId, selfTarget = false): number | null {
    if (!MONSTER_MOVES[move]) throw new Error(`Unknown monster move "${move}"`);
    const tracer = new MoveTracer(move, selfTarget);
    this.pendingMoveTrace = tracer;
    this.playMonsterMove(slotIndex, move, {
      onImpact: () => (selfTarget ? { label: '+BLOCK', color: 0x38B6FF, at: 'monster' } : { label: '-20', color: 0xF97316 }),
    });
    this.pendingMoveTrace = null;
    this.lastMoveTrace = tracer;
    if (tracer.done) return tracer.length;
    return this.activeMoveTrace === tracer ? (this.monsterSlots[slotIndex]?.activeMove?.length ?? null) : null;
  }

  private lastMoveTrace: MoveTracer | null = null;

  /**
   * Dev bridge: shows VFX rig `name` frozen on `anim` at `time` seconds in the middle of the stage (null hides
   * it). Returns the rig's animations and the current bounds, for contact sheets and size calibration.
   */
  public debugVfxPose(name: VfxName | null, anim?: string, time = 0, size = 1) {
    this.debugVfx?.destroy();
    this.debugVfx = null;
    if (!name) return null;
    const rig = VFX_RIGS[name];
    if (!rig) throw new Error(`Unknown VFX "${name}". Known: ${VFX_NAMES.join(', ')}`);
    if (!this.vfxReady || !this.effectsLayer) throw new Error('VFX rigs are not loaded (start an encounter first)');
    const vfx = this.spawnVfx(this.effectsLayer, name, 213, 130, { anim, size, loop: true });
    if (!vfx) throw new Error(`VFX "${name}" failed to spawn`);
    this.debugVfx = vfx;
    const data = vfx.skeleton.data;
    const animations = data.animations.map((a) => ({ name: a.name, duration: Number(a.duration.toFixed(3)) }));
    const track = vfx.state.getCurrent(0)!;
    track.trackTime = time;
    vfx.state.timeScale = 0;
    vfx.update(0);
    const b = vfx.getBounds();
    return { animations, bounds: { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } };
  }

  /** Dev bridge: the last debugMonsterMove()'s trace (`done` false while it's still playing). */
  public debugMoveTrace(): (MoveTraceReport & { done: boolean }) | null {
    const t = this.lastMoveTrace;
    return t ? { ...t.report(), done: t.done } : null;
  }

  /**
   * Plays a choreographed knight move (see knightMoves.ts) at `targets` (monster slot indices, in hit
   * order; defaults to the targeted monster). `onImpact(i)` runs when hit `i` lands; every hit lands
   * exactly once, even if the move is cut short. When a move lands all hits at once they are spaced
   * `stagger` frames apart (CHAIN cards use a longer stagger).
   * A move requested while another plays is queued and starts when it ends (`interrupt` cuts the
   * playing one short instead). Past MAX_QUEUED_KNIGHT_MOVES waiting, the playing move is cut short.
   */
  public playKnightMove(id: KnightMoveId, opts: KnightMoveOptions = {}): void {
    if (this.activeKnightMove && !opts.interrupt && this.knightContainer && !this.isDestroyed) {
      this.knightMoveQueue.push({ id, opts });
      if (this.knightMoveQueue.length > MAX_QUEUED_KNIGHT_MOVES) this.activeKnightMove.cancel();
      return;
    }
    opts.onStart?.();
    const ctx: KnightMoveContext = { power: 100, form: 1, crit: false, damage: 0, ...knightMoveCard(id), ...opts.ctx };
    const defaultSlot = (this.monsterSlots[this.targetSlotIndex]?.isAlive ? this.monsterSlots[this.targetSlotIndex] : null)
      ?? this.monsterSlots.find((s) => s.isAlive);
    const targets: KnightTarget[] = (opts.targets ?? (defaultSlot ? [defaultSlot.slotIndex] : [])).map((i) => {
      const slot = this.monsterSlots[i];
      return { slot: i, x: slot?.baseX ?? MONSTER_X, y: slot?.baseY ?? 168, height: slot?.rig?.height ?? 40 };
    });

    const landed = new Set<number>();
    const land = (i: number) => {
      if (landed.has(i) || !targets[i]) return;
      landed.add(i);
      this.playMonsterHit(targets[i].slot);
      opts.onImpact?.(i);
      if (opts.isKillCam && (opts.killSlot === undefined || targets[i].slot === opts.killSlot)) {
        this.triggerKillCam(targets[i].slot);
      }
    };
    const landAll = () => targets.forEach((_, i) => land(i));
    const stagger = opts.stagger ?? 2;
    const tl = new Timeline();
    const landStaggered = () => targets.forEach((_, i) => (i === 0 || !stagger ? land(i) : tl.at(tl.frame + i * stagger, () => land(i))));

    const knight = this.knightContainer;
    if (!knight || !this.effectsLayer || !this.gameLayer) {
      landAll();
      this.playNextKnightMove();
      return;
    }
    this.activeKnightMove?.cancel();

    const choreo = KNIGHT_MOVES[id] ?? KNIGHT_MOVES.swing_cleave;

    const spine = this.knightSpine;
    const shadow = this.knightShadow;
    const home = { ...KNIGHT_HOME };
    const fx = new Container();
    this.effectsLayer.addChild(fx);
    const ground = new Container();
    ground.zIndex = -100; // decals: above the dim overlay, below the characters
    this.gameLayer.addChild(ground);
    const back = new Container();
    back.zIndex = -40; // behind the knight (wings, auras), above his afterimages
    this.gameLayer.addChild(back);
    const dimmer = this.createDimmer();
    const restScale = spine ? { x: spine.scale.x, y: spine.scale.y } : { x: 1, y: 1 };
    let offX = 0;
    let offY = 0;
    let liftH = 0;
    let stretchX = 1;
    let stretchY = 1;
    let facing = 1;
    const applyScale = () => spine?.scale.set(restScale.x * stretchX * facing, restScale.y * stretchY);

    const host: KnightMoveHost = {
      home,
      targets,
      target: targets[0] ?? { slot: -1, x: MONSTER_X, y: 168, height: 40 },
      ctx,
      pos: () => ({ x: home.x + offX, y: home.y + offY - liftH }),
      gfx: (layer = 'fx') => ({ fx, ground, back })[layer].addChild(new Graphics()),
      vfx: (name, x, y, o = {}) => {
        this.vfxSound(name, o, 0.25);
        return this.spawnVfx({ fx, ground, back }[o.layer ?? 'fx'], name, x, y, o);
      },
      container: (layer = 'fx') => ({ fx, ground, back })[layer].addChild(new Container()),
      anim: (name, loop = false) => {
        const animation = spine?.skeleton.data.findAnimation(name);
        if (!spine || !animation) {
          if (spine) console.warn(`[GameEngine] knight move ${id}: no knight animation "${name}"`);
          return 0;
        }
        if (this.knightLocked) return 0;
        spine.state.setAnimation(0, name, loop);
        if (!loop) spine.state.addAnimation(0, 'IDLE', true, 0);
        return Math.round((animation.duration * 60) / (this.knightTimeScale || 1));
      },
      animSpeed: (scale) => {
        this.knightTimeScale = scale;
        if (spine && !this.spinesFrozen) spine.state.timeScale = scale;
      },
      idle: () => {
        if (spine && !this.knightLocked) spine.state.setAnimation(0, 'IDLE', true);
      },
      offset: (x, y = 0) => {
        offX = x;
        offY = y;
        knight.x = home.x + x;
        knight.y = home.y + y;
      },
      lift: (height) => {
        liftH = height;
        if (spine) spine.y = -height;
        const s = Math.max(0.3, 1 - height / 160);
        shadow?.scale.set(s);
        if (shadow) shadow.alpha = s;
      },
      stretch: (sx, sy) => {
        stretchX = sx;
        stretchY = sy;
        applyScale();
      },
      face: (left) => {
        facing = left ? -1 : 1;
        applyScale();
      },
      alpha: (a) => {
        knight.alpha = a;
      },
      tint: (color) => {
        if (spine) spine.tint = color;
      },
      ghost: (color, alpha = 0.45, life = 10) => this.spawnKnightAfterimage(color, alpha, life),
      weaponId: this.equippedSlots['weapon'] || this.equippedSlots['sword'] || 'iron_kettlebell',
      weaponTip: () => this.knightWeaponTip() ?? { x: home.x + offX + 26, y: home.y + offY - liftH - 22 },
      weaponShown: (shown) => {
        const slot = spine?.skeleton.findSlot('sword');
        if (slot) slot.color.a = shown ? 1 : 0;
      },
      slashTrail: (shown) => {
        const slot = spine?.skeleton.findSlot('Normal_Slash');
        if (slot) slot.color.a = shown ? 1 : 0;
      },
      fxSlot: (name, color, alpha = 1) => {
        const slot = KNIGHT_FX_SLOTS.includes(name) ? spine?.skeleton.findSlot(name) : null;
        slot?.color.set(((color >> 16) & 255) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255, alpha);
      },
      knock: (i, dx, lift = 0) => {
        const slot = targets[i] ? this.monsterSlots[targets[i].slot] : undefined;
        if (!slot || slot.isLocked) return;
        slot.kickX += dx;
        slot.kickY -= lift;
      },
      flashTarget: (i, color = 0xFF5555, frames = 6) => {
        const slot = targets[i] ? this.monsterSlots[targets[i].slot] : undefined;
        if (!slot?.spine || slot.spine.destroyed) return;
        setSpineTint(slot.spine, color);
        slot.flashFrames = frames;
      },
      guard: (color) => {
        this.knightGuardShown = true;
        this.drawGuardRing(color);
        // Healing cards: restorative glow rising around the knight
        if (ctx.heal > 0 && knight) this.spawnVfx(fx, 'heal', knight.x + 4, knight.y - 30, { size: 1.1 });
      },
      camera: (zoom, x, y, holdFrames, snap) => this.moveCamera(zoom, x, y, holdFrames, snap),
      shake: (intensity) => this.moveShake(intensity),
      flash: (alpha, color) => this.moveFlash(alpha, color),
      hitStop: (frames) => {
        this.hitStopFrames = Math.max(this.hitStopFrames, frames);
      },
      dim: dimmer.dim,
      impact: (i) => (i === undefined ? landStaggered() : land(i)),
      sparks: (x, y, count, colors) => this.spawnSparks(x, y, count, colors),
      shockwave: (x, y, color) => this.spawnShockwave(x, y, color),
      streaks: (x, y, length, colors) => this.spawnSpeedStreaks(x, y, length, colors),
      emit: (x, y, o) => this.emitParticles(x, y, o),
      slashArc: (g, cx, cy, r, a0, a1, shadowColor, body, core) => this.drawPainterlySlashArc(g, cx, cy, r, a0, a1, shadowColor, body, core),
      text: (content, x, y, color, size) => this.spawnFloatingText(content, x, y, color, size),
      sound: (name, o) => audioManager.play(name, { pan: 0.1, ...o }),
    };

    const cleanup = () => {
      if (!this.isDestroyed) landAll(); // a move must always land its hits
      if (!knight.destroyed) {
        knight.x = home.x;
        knight.y = home.y;
        knight.alpha = 1;
      }
      shadow?.scale.set(1);
      if (shadow) shadow.alpha = 1;
      this.knightTimeScale = 1;
      if (spine && !spine.destroyed) {
        for (const name of KNIGHT_FX_SLOTS) spine.skeleton.findSlot(name)?.color.set(1, 1, 1, 1);
        spine.y = 0;
        spine.scale.set(restScale.x, restScale.y);
        spine.tint = 0xFFFFFF;
        spine.state.timeScale = this.spinesFrozen ? 0 : 1;
        const current = spine.state.getCurrent(0);
        if (!this.knightLocked && current?.loop && current.animation?.name !== 'IDLE') {
          spine.state.setAnimation(0, 'IDLE', true);
        }
      }
      fx.destroy({ children: true });
      ground.destroy({ children: true });
      back.destroy({ children: true });
      dimmer.destroy();
    };

    try {
      choreo(host, tl);
    } catch (err) {
      console.error(`[GameEngine] knight move ${id} failed to build:`, err);
      cleanup();
      this.playNextKnightMove();
      return;
    }
    this.runKnightTimeline(id, tl, cleanup, opts.onFinish, opts.isKillCam);
  }

  /** Starts the oldest queued knight move, if any (playKnightMove queues casts made mid-move). */
  private playNextKnightMove(): void {
    const next = this.isDestroyed ? undefined : this.knightMoveQueue.shift();
    if (next) this.playKnightMove(next.id, next.opts);
  }

  /** Ticks a knight move's timeline on the engine loop; `cleanup` runs once when it ends or is cut short. */
  private runKnightTimeline(
    id: KnightMoveId,
    tl: Timeline,
    cleanup: () => void,
    onFinish?: () => void,
    isKillCam?: boolean,
  ): void {
    let finished = false;
    const handle = {
      id,
      cancel: () => {
        if (finished) return;
        finished = true;
        if (this.activeKnightMove === handle) this.activeKnightMove = null;
        cleanup();
        // The next queued cast starts now, so a pending Block pulse or victory pose waits for it too
        this.playNextKnightMove();
        if (this.knightShieldPending && !this.activeKnightMove) {
          this.knightShieldPending = false;
          if (!this.knightGuardShown) this.playerShieldPulse();
        }

        if (isKillCam) {
          // Restore normal engine speed
          if (this.app?.ticker) {
            this.app.ticker.speed = 1.0;
          }
          this.isKillCamActive = false;

          // Pull camera smoothly back to neutral framing
          this.triggerCameraZoom(1.0, 213, 120, 25);

          // Play knight victory celebration pose
          this.playKnightVictory();

          // Wait a brief cinematic beat (800ms) for camera ease and victory flourish, then invoke onFinish
          setTimeout(() => {
            onFinish?.();
          }, 800);
        } else {
          if (this.knightVictoryPending && !this.activeKnightMove) {
            this.knightVictoryPending = false;
            this.playKnightVictory();
          }
          onFinish?.();
        }
      },
    };
    this.activeKnightMove = handle;
    this.knightGuardShown = false;
    this.activeEffects.push({
      container: new Container(),
      life: 0,
      maxLife: Number.POSITIVE_INFINITY,
      onUpdate: (_eff, delta) => {
        if (!finished && !this.isDestroyed && !this.knightContainer?.destroyed && !tl.tick(delta)) return false;
        handle.cancel();
        return true;
      },
    });
  }

  /**
   * Battlefield position of the far end of the knight's weapon (bell, flail head or blade tip) on the
   * current frame: the midpoint of the weapon attachment's edge farthest from the hand bone.
   */
  private knightWeaponTip(): { x: number; y: number } | null {
    const spine = this.knightSpine;
    const slot = spine?.skeleton.findSlot('sword');
    const att = slot?.getAttachment();
    if (!spine || !slot || !(att instanceof RegionAttachment) || !this.gameLayer) return null;
    const v = new Float32Array(8);
    att.computeWorldVertices(slot, v, 0, 2);
    const bx = slot.bone.worldX;
    const by = slot.bone.worldY;
    let best = { x: 0, y: 0 };
    let bestD = -1;
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      const mx = (v[i * 2] + v[j * 2]) / 2;
      const my = (v[i * 2 + 1] + v[j * 2 + 1]) / 2;
      const d = (mx - bx) ** 2 + (my - by) ** 2;
      if (d > bestD) {
        bestD = d;
        best = { x: mx, y: my };
      }
    }
    // Pull back from the very edge toward the weapon's centre, onto the head itself
    const cx = (v[0] + v[2] + v[4] + v[6]) / 4;
    const cy = (v[1] + v[3] + v[5] + v[7]) / 4;
    const p = { x: lerp(best.x, cx, 0.3), y: lerp(best.y, cy, 0.3) };
    spine.skeletonToPixiWorldCoordinates(p);
    return this.gameLayer.toLocal(p);
  }

  /** Afterimage of the knight's current pose: a frozen rig copy (shares textures), additive-tinted and fading. */
  private spawnKnightAfterimage(color: number, alpha: number, life: number): void {
    const src = this.knightSpine;
    const knight = this.knightContainer;
    if (!src || !knight || !this.gameLayer) return;
    let ghost: Spine;
    try {
      ghost = Spine.from({ skeleton: KNIGHT_SKELETON_KEY, atlas: KNIGHT_ATLAS_KEY, scale: KNIGHT_SCALE, autoUpdate: false });
    } catch {
      return;
    }
    const current = src.state.getCurrent(0);
    if (current?.animation) {
      const entry = ghost.state.setAnimation(0, current.animation.name, current.loop);
      entry.trackTime = current.trackTime;
    }
    ghost.update(0);
    // Slots a move hid or recoloured on the knight (his weapon mid-throw, the rig's effects) match on his afterimage
    for (const name of KNIGHT_FX_SLOTS) {
      const from = src.skeleton.findSlot(name);
      const to = ghost.skeleton.findSlot(name);
      if (from && to) to.color.setFromColor(from.color);
    }
    ghost.x = knight.x + src.x;
    ghost.y = knight.y + src.y;
    ghost.scale.copyFrom(src.scale);
    ghost.tint = color;
    ghost.alpha = alpha;
    ghost.blendMode = 'add';
    ghost.zIndex = -50; // behind the fighters, above ground decals
    this.gameLayer.addChild(ghost);
    this.activeEffects.push({
      container: ghost,
      life: 0,
      maxLife: life,
      onUpdate: (eff) => {
        ghost.alpha = alpha * Math.max(0, 1 - eff.life / life);
        return false;
      },
    });
  }

  /** Move camera: battlefield → stage coords, clamped so the zoomed view stays over the background. */
  private moveCamera(zoom: number, x: number, y: number, holdFrames: number, snap = false): void {
    const halfW = 213 / zoom;
    const halfH = 120 / zoom;
    const fx = Math.min(Math.max(x, halfW), 426 - halfW);
    const fy = Math.min(Math.max(y - SCENE_RAISE_Y, halfH - 32), 240 - halfH);
    this.triggerCameraZoom(zoom, fx, fy, holdFrames);
    if (snap) {
      // Hard cut (impact punch-in) instead of easing toward the framing
      this.cameraZoom = zoom;
      this.cameraFocusX = fx;
      this.cameraFocusY = fy;
    }
  }

  /**
   * Cinematic Kill Cam: dramatic slow motion, dynamic punch-in camera zoom,
   * heavy screen impact flash & shake, particle sparks, and fatal blow banner.
   */
  public triggerKillCam(slotIndex?: number): void {
    if (this.isKillCamActive || this.isDestroyed) return;
    this.isKillCamActive = true;

    const slot = (slotIndex !== undefined ? this.monsterSlots[slotIndex] : null)
      ?? this.monsterSlots[this.targetSlotIndex]
      ?? this.monsterSlots.find((s) => s.isAlive || s.isLocked);

    const targetX = slot ? slot.baseX : 280;
    const targetY = slot ? slot.baseY - (slot.rig?.height ?? 40) * 0.45 : 125;

    // 1. Dynamic Camera Zoom Punch-In on the fatal clash
    this.moveCamera(1.55, targetX - 15, targetY, 90, true);

    // 2. Heavy impact punch, flash, shake
    this.moveShake(14);
    this.moveFlash(0.65, 0xFFFFFF);
    audioManager.play('impact_crit', { pan: 0.1, rate: 0.8, vol: 1.2 });

    // 3. Cinematic VFX: sparks, speed streaks, and FATAL FINISH banner
    this.spawnSparks(targetX, targetY, 22, [0xFF3366, 0xF4B41A, 0xFFFFFF, 0xFF1744]);
    this.spawnSpeedStreaks(targetX, targetY, 70, [0xFF3366, 0xF4B41A, 0xFFE082]);
    this.spawnFloatingText('★ FATAL BLOW ★', targetX - 12, targetY - 35, 0xFF3366, 13);

    // 4. Dramatic slow motion on ticker
    if (this.app?.ticker) {
      this.app.ticker.speed = 0.22;
    }
  }

  /** Block ward around the knight in a move's colour: a bright ring that swells and fades. */
  private drawGuardRing(color: number): void {
    const knight = this.knightContainer;
    if (!knight || !this.effectsLayer) return;
    const g = new Graphics();
    this.effectsLayer.addChild(g);
    this.activeEffects.push({
      container: g,
      life: 0,
      maxLife: 22,
      onUpdate: (eff) => {
        const t = eff.life / 22;
        const r = 22 + 14 * (1 - Math.pow(1 - t, 3));
        const cx = knight.x + 2;
        const cy = knight.y - 24;
        g.clear();
        g.ellipse(cx, cy, r, r * 1.08).stroke({ width: 4, color: 0x0F0E17, alpha: 0.6 * (1 - t) });
        g.ellipse(cx, cy, r, r * 1.08).stroke({ width: 2, color, alpha: 0.95 * (1 - t) });
        g.ellipse(cx, cy, r - 3, (r - 3) * 1.08).fill({ color, alpha: 0.12 * (1 - t) });
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + t * 1.5;
          g.rect(cx + Math.cos(a) * r - 1, cy + Math.sin(a) * r * 1.08 - 1, 3, 3).fill({ color: 0xFFFBEA, alpha: 1 - t });
        }
        return false;
      },
    });
    audioManager.play('ward', { pan: -0.2 });
  }

  private moveShake(intensity: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  private moveFlash(alpha: number, color = 0xFFFFFF): void {
    if (!this.flashOverlay) return;
    this.flashOverlay.tint = color;
    // Capped: full-screen flashes above ~0.45 wash out the TV picture and are harsh to look at
    this.flashAlpha = Math.max(this.flashAlpha, Math.min(alpha, 0.45));
  }

  /** Per-move battlefield dim overlay, created on first use. */
  private createDimmer() {
    let overlay: Graphics | null = null;
    let overlayColor = -1;
    return {
      dim: (alpha: number, color = 0x000000) => {
        if (!overlay) {
          if (alpha <= 0 || !this.gameLayer) return;
          overlay = new Graphics();
          overlay.zIndex = -200; // over the background, under decals and characters
          this.gameLayer.addChild(overlay);
        }
        if (color !== overlayColor) {
          overlayColor = color;
          overlay.clear().rect(-80, -20, 586, 320).fill({ color });
        }
        overlay.alpha = alpha;
      },
      destroy: () => overlay?.destroy(),
    };
  }

  /** Floating label above a monster slot (damage numbers, SHATTER / STAGGER tags). */
  public spawnMonsterText(slotIndex: number, content: string, color: number, fontSize: number, yOffset = 0): void {
    const slot = this.monsterSlots[slotIndex];
    if (!slot) return;
    this.spawnFloatingText(content, slot.baseX - 12, slot.baseY - (slot.rig?.height ?? 40) - 8 + yOffset, color, fontSize);
  }

  /** Floating label above the knight (healing). */
  public spawnKnightText(content: string, color: number): void {
    const k = this.knightContainer;
    this.spawnFloatingText(content, (k?.x ?? 130) - 10, (k?.y ?? 168) - 60, color, 10);
  }

  /** Knight flinch with a short knockback slide of the rig. */
  private knightHitReaction(knockback: number): void {
    this.playKnightHit();
    this.knightKnockX = Math.max(this.knightKnockX, knockback);
  }

  /** Floating label from a move's impact (damage on the knight, or block on the monster). */
  private showImpactLabel(result: ImpactResult | void, slot: MonsterSlot | undefined): void {
    if (!result?.label) return;
    const color = result.color ?? 0xFF3366;
    if (result.at === 'monster' && slot) {
      this.spawnFloatingText(result.label, slot.baseX - 10, slot.baseY - (slot.rig?.height ?? 40) - 14, color, 10);
    } else {
      const k = this.knightContainer;
      this.spawnFloatingText(result.label, (k?.x ?? 130) - 6, (k?.y ?? 168) - 72, color, 12);
    }
  }

  /** Square pixel particles with configurable direction, speed, gravity and size. */
  private emitParticles(x: number, y: number, o: EmitOptions): void {
    if (!this.effectsLayer) return;
    const [minSpeed, maxSpeed] = o.speed ?? [1, 3];
    const [minLife, maxLife] = o.life ?? [16, 28];
    const size = o.size ?? 3;
    for (let i = 0; i < o.count; i++) {
      const color = o.colors[Math.floor(Math.random() * o.colors.length)];
      const g = new Graphics();
      g.rect(-size / 2, -size / 2, size, size).fill({ color });
      g.x = x;
      g.y = y;
      this.effectsLayer.addChild(g);
      const angle = (o.angle ?? 0) + (Math.random() * 2 - 1) * (o.spread ?? Math.PI);
      const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
      this.particles.push({
        graphics: g,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: minLife + Math.floor(Math.random() * (maxLife - minLife)),
        color,
        gravity: o.gravity,
      });
    }
  }

  /** Pauses/resumes every Spine rig for hit-stop. */
  private setSpinesFrozen(frozen: boolean): void {
    this.spinesFrozen = frozen;
    const scale = frozen ? 0 : 1;
    if (this.knightSpine) this.knightSpine.state.timeScale = frozen ? 0 : this.knightTimeScale;
    for (const slot of this.monsterSlots) if (slot.spine) slot.spine.state.timeScale = scale;
    for (const s of this.extraSpines) if (!s.destroyed) s.state.timeScale = scale;
  }

  /**
   * Animates a defensive shield pulse around Sir Kettleburne
   */
  public playerShieldPulse(): void {
    if (!this.effectsLayer || !this.knightContainer) return;
    // During a knight move the Block shows when it ends (or not at all if the move drew its own guard())
    if (this.activeKnightMove) {
      this.knightShieldPending = true;
      return;
    }

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
    audioManager.play('ward', { pan: -0.2 });
  }

  /**
   * Equipment hook. Updates the knight's visual attachments on the Spine rig.
   */
  private updateKnightVisuals(): void {
    if (!this.knightSpine) return;
    const weaponId = this.equippedSlots['weapon'] || this.equippedSlots['sword'] || 'iron_kettlebell';
    try {
      const slot = this.knightSpine.skeleton.findSlot('sword');
      if (slot) {
        const attachment =
          this.knightSpine.skeleton.getAttachmentByName('sword', weaponId) ||
          this.knightSpine.skeleton.getAttachmentByName('sword', 'iron_kettlebell') ||
          this.knightSpine.skeleton.getAttachmentByName('sword', 'sword');
        if (attachment) {
          slot.setAttachment(attachment);
        }
      }
    } catch (err) {
      console.warn('[GameEngine] Failed to update knight weapon visual:', weaponId, err);
    }
  }

  private getWeaponInfo(weaponId: string) {
    switch (weaponId) {
      case 'excalibur_bell':
      case 'excalibur_morningstar':
      case 'excalibell':
      case 'belfry_mace':
        return { mainColor: 0xF4B41A, highlightColor: 0xFFFBEA, handleColor: 0x38B6FF, runeColor: 0x38B6FF };
      case 'dragon_kettlebell':
      case 'dragon_morningstar':
      case 'dragon_sword':
      case 'inferno_mace':
      case 'hellhound_morningstar':
        return { mainColor: 0xDC2626, highlightColor: 0xF87171, handleColor: 0xF59E0B, runeColor: 0xFBBF24 };
      case 'void_bell':
      case 'void_morningstar':
      case 'void_sword':
      case 'eldritch_bell':
        return { mainColor: 0x6B21A8, highlightColor: 0xA855F7, handleColor: 0xC084FC, runeColor: 0x00EB88 };
      case 'slime_morningstar':
        return { mainColor: 0x16A34A, highlightColor: 0x86EFAC, handleColor: 0x15803D, runeColor: 0x4ADE80 };
      case 'spider_morningstar':
      case 'mushroom_bell':
        return { mainColor: 0x7E22CE, highlightColor: 0xC084FC, handleColor: 0x581C87, runeColor: 0x14B8A6 };
      case 'crypt_morningstar':
      case 'bellringer_mallet':
        return { mainColor: 0xB45309, highlightColor: 0xFDE68A, handleColor: 0xDC2626, runeColor: 0xFBBF24 };
      case 'leviathan_anchor':
        return { mainColor: 0x0E7490, highlightColor: 0x99F6E4, handleColor: 0x57534E, runeColor: 0x2DD4BF };
      case 'everburning_censer':
        return { mainColor: 0xCBD5E1, highlightColor: 0xE0F2FE, handleColor: 0x94A3B8, runeColor: 0x7DD3FC };
      case 'tolling_thunder':
        return { mainColor: 0x9A6A24, highlightColor: 0xF2D27A, handleColor: 0x67E8F9, runeColor: 0xA5F3FC };
      case 'midas_bell':
        return { mainColor: 0xD99A1F, highlightColor: 0xFFF3C4, handleColor: 0xB7791F, runeColor: 0xFDE68A };
      case 'heartforge':
        return { mainColor: 0xEA580C, highlightColor: 0xFDE68A, handleColor: 0x44403C, runeColor: 0xFB923C };
      case 'hollow_bell':
        return { mainColor: 0x3B0764, highlightColor: 0xC084FC, handleColor: 0x1E1033, runeColor: 0x4ADE80 };
      case 'excalibane':
        return { mainColor: 0x1F1830, highlightColor: 0xA78BFA, handleColor: 0xFBBF24, runeColor: 0xA78BFA };
      case 'dead_weight':
        return { mainColor: 0x9F1239, highlightColor: 0xFB7185, handleColor: 0xE2E8F0, runeColor: 0xE11D48 };
      case 'skeleton_mace':
        return { mainColor: 0x38BDF8, highlightColor: 0xE0F2FE, handleColor: 0x0284C7, runeColor: 0x38BDF8 };
      case 'frost_morningstar':
        return { mainColor: 0x60A5FA, highlightColor: 0xEFF6FF, handleColor: 0x1D4ED8, runeColor: 0x93C5FD };
      case 'kraken_morningstar':
        return { mainColor: 0x0D9488, highlightColor: 0x5EEAD4, handleColor: 0x115E59, runeColor: 0x14B8A6 };
      case 'goblin_mace':
      case 'treemon_bell':
        return { mainColor: 0x65A30D, highlightColor: 0xBEF264, handleColor: 0x3F6212, runeColor: 0x84CC16 };
      case 'golem_bell':
        return { mainColor: 0x64748B, highlightColor: 0x38BDF8, handleColor: 0x334155, runeColor: 0x38BDF8 };
      case 'boar_sword':
        return { mainColor: 0xB91C1C, highlightColor: 0xFCA5A5, handleColor: 0x7F1D1D, runeColor: 0xF87171 };
      case 'wolf_sword':
        return { mainColor: 0x2563EB, highlightColor: 0xBFDBFE, handleColor: 0x1E3A8A, runeColor: 0xF59E0B };
      case 'minotaur_sword':
        return { mainColor: 0xB45309, highlightColor: 0xFDE68A, handleColor: 0x78350F, runeColor: 0xF59E0B };
      case 'harpy_bell':
        return { mainColor: 0xD97706, highlightColor: 0xFEF3C7, handleColor: 0x92400E, runeColor: 0xFBBF24 };
      case 'cemetery_mace':
      case 'troll_morningstar':
      case 'iron_morningstar':
      case 'iron_mace':
        return { mainColor: 0x4B5563, highlightColor: 0x9CA3AF, handleColor: 0x374151, runeColor: null };
      case 'sword':
        return { mainColor: 0x94A3B8, highlightColor: 0xE2E8F0, handleColor: 0x475569, runeColor: 0x38B6FF };
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
      if (this.knightSpine && (slotId === 'sword' || slotId === 'weapon')) {
        const slot = this.knightSpine.skeleton.findSlot('sword');
        if (slot) {
          const attachment =
            this.knightSpine.skeleton.getAttachmentByName('sword', attachmentId) ||
            this.knightSpine.skeleton.getAttachmentByName('sword', 'iron_kettlebell') ||
            this.knightSpine.skeleton.getAttachmentByName('sword', 'sword');
          if (attachment) {
            slot.setAttachment(attachment);
          }
        }
      }
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
   * Plays the exercise's knight attack (knightMoveFor → knightMoves.ts, or a legacy execute* method).
   */
  public onRepCompleted(
    power: number = 80,
    form: number = 1.0,
    exercise: ExerciseType = 'SWING',
    skillName?: string,
    displayDamage?: number, // the real damage dealt (battle); otherwise a showcase number from power/form
    // battle: the card's move (templateId), slots hit in order, Block/heal granted
    hits: {
      move?: string;
      targets?: number[];
      onImpact?: (i: number) => void;
      onStart?: () => void;
      onFinish?: () => void;
      isKillCam?: boolean;
      killSlot?: number;
      stagger?: number;
      ctx?: Partial<KnightMoveContext>;
    } = {},
  ): void {
    this.totalRepsCount++;
    this.currentCombo++;
    this.totalPowerAccumulated += power;

    const isCrit = power >= 95;
    const damageNum = displayDamage ?? Math.round(power * form * 14);
    const name = skillName || EXERCISE_SKILLS[exercise]?.skillName || '';
    const { move, ctx, ...rest } = hits;
    this.playKnightMove(knightMoveFor(exercise, name, move), {
      ...rest,
      ctx: { power, form, crit: isCrit, damage: damageNum, skillName: name, ...ctx },
    });

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

      // Hit-stop: freeze rigs, effects and timelines for a few frames on heavy impacts; only the
      // camera shake keeps going so the freeze reads as a crunch rather than a stall.
      if (this.hitStopFrames > 0) {
        this.hitStopFrames -= delta;
        if (!this.spinesFrozen) this.setSpinesFrozen(true);
        if (this.rootStage && this.shakeIntensity > 0) {
          this.rootStage.scale.set(this.cameraZoom); // a snapped camera cut can land during hit-stop
          this.rootStage.x = (213 - this.cameraFocusX * this.cameraZoom) + (Math.random() - 0.5) * this.shakeIntensity * 2;
          this.rootStage.y = (120 - this.cameraFocusY * this.cameraZoom) + (Math.random() - 0.5) * this.shakeIntensity * 2;
        }
        return;
      }
      if (this.spinesFrozen) this.setSpinesFrozen(false);

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
        slot.container.x = slot.baseX - lunge + shake + slot.offX + slot.kickX;
        slot.container.y = slot.baseY + slot.offY + slot.kickY;
        if (slot.kickX !== 0 || slot.kickY !== 0) {
          slot.kickX = Math.abs(slot.kickX) > 0.3 ? slot.kickX * Math.pow(0.86, delta) : 0;
          slot.kickY = Math.abs(slot.kickY) > 0.3 ? slot.kickY * Math.pow(0.88, delta) : 0; // launches hang a beat
        }
        if (slot.flashFrames > 0) {
          slot.flashFrames -= delta;
          if (slot.flashFrames <= 0 && slot.spine && !slot.spine.destroyed) setSpineTint(slot.spine, slot.baseTint ?? 0xFFFFFF);
        }
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
        if (this.flashAlpha === 0) this.flashOverlay.tint = 0xFFFFFF;
      }

      // Knight knockback from monster hits (offsets the rig inside its container)
      if (this.knightSpine) {
        this.knightKnockX = Math.abs(this.knightKnockX) > 0.2 ? this.knightKnockX * Math.pow(0.82, delta) : 0;
        this.knightSpine.x = -this.knightKnockX;
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

      this.repStamp?.update(delta);

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
        p.vy += (p.gravity ?? 0.15) * delta;

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

  private async trackLoad(load: Promise<void>): Promise<void> {
    this.loadsInFlight++;
    try {
      await load;
    } finally {
      this.loadsInFlight--;
    }
  }

  /**
   * JSON-safe snapshot for the dev automation bridge (window.__kk). Not used by gameplay.
   */
  public getDebugState() {
    const anim = (spine: Spine | null) => spine?.state.getCurrent(0)?.animation?.name ?? null;
    const knightAnimation = anim(this.knightSpine);
    const monsters = this.monsterSlots.map((slot) => ({
      slotIndex: slot.slotIndex,
      type: slot.spriteType,
      loaded: slot.spine !== null,
      alive: slot.isAlive,
      locked: slot.isLocked,
      animation: anim(slot.spine),
    }));
    const vfx = {
      effects: this.activeEffects.length,
      projectiles: this.activeProjectiles.length,
      particles: this.particles.length,
      floatingTexts: this.floatingTexts.length,
    };
    const repStamp = this.repStamp?.getDebugState() ?? null;
    const idle =
      this.isReady &&
      this.loadsInFlight === 0 &&
      !this.isSwinging &&
      vfx.effects + vfx.projectiles + vfx.particles + vfx.floatingTexts === 0 &&
      this.flashAlpha === 0 &&
      this.shakeIntensity === 0 &&
      this.targetCameraZoom === 1.0 &&
      this.cameraZoom === 1.0 &&
      (this.knightLocked || knightAnimation === null || knightAnimation === 'IDLE') &&
      this.monsterSlots.every((s, i) => s.isLocked || !s.spine || monsters[i].animation === s.rig?.idle) &&
      this.monsterSlots.every((s) => s.lungeT >= 1 && s.shakeX === 0 && s.kickX === 0 && s.kickY === 0);

    return {
      ready: this.isReady,
      loading: this.loadsInFlight,
      idle,
      fps: this.app ? Math.round(this.app.ticker.FPS) : 0,
      background: this.currentBgKey,
      trial: this.trialScene ? { id: this.trialId, ...this.trialScene.debugState() } : null,
      knight: { animation: knightAnimation, locked: this.knightLocked, move: this.activeKnightMove?.id ?? null },
      monsters,
      targetSlot: this.targetSlotIndex,
      vfx,
      camera: { zoom: Number(this.cameraZoom.toFixed(3)), shake: Number(this.shakeIntensity.toFixed(2)) },
      equipped: { ...this.equippedSlots },
      reps: { total: this.totalRepsCount, combo: this.currentCombo },
      repStamp,
      assetRefs: { knight: knightAssetRefs, monsters: Object.fromEntries(monsterAssetRefs) },
    };
  }

  /**
   * Dev bridge: freezes a monster slot on `animation` at `time` seconds (or resumes normal playback when
   * animation is null). Returns the rig's animation list so callers can build contact sheets.
   */
  public debugPoseMonster(slotIndex: number, animation: string | null, time = 0) {
    const slot = this.monsterSlots[slotIndex];
    const spine = slot?.spine;
    if (!slot || !spine || !slot.rig) throw new Error(`No loaded monster in slot ${slotIndex}`);
    const animations = spine.skeleton.data.animations.map((a) => ({ name: a.name, duration: Number(a.duration.toFixed(3)) }));
    const bounds = () => {
      const r = slot.container.getBounds();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    if (animation === null) {
      spine.state.timeScale = 1;
      spine.state.setAnimation(0, slot.rig.idle, true);
      return { type: slot.spriteType, animations, bounds: bounds() };
    }
    if (!spine.skeleton.data.findAnimation(animation)) throw new Error(`${slot.spriteType} has no animation "${animation}"`);
    spine.skeleton.setToSetupPose();
    const entry = spine.state.setAnimation(0, animation, false);
    entry.mixDuration = 0;
    entry.trackTime = time;
    spine.state.timeScale = 0;
    spine.update(0);
    return { type: slot.spriteType, animations, bounds: bounds() };
  }

  /**
   * Dev bridge: the knight rig's animations with durations and Spine events, in seconds and 60 fps frames
   * (e.g. SKILL2RADON's DamToTarget events mark its hit frames). Used to sync move timelines to the rig.
   */
  public debugKnightAnimations() {
    const spine = this.knightSpine;
    if (!spine) throw new Error('Knight rig not loaded');
    return spine.skeleton.data.animations.map((a) => {
      const events = a.timelines
        .filter((t): t is EventTimeline => t instanceof EventTimeline)
        .flatMap((t) => t.events.map((e) => ({ name: e.data.name, time: Number(e.time.toFixed(3)), frame: Math.round(e.time * 60) })));
      return { name: a.name, duration: Number(a.duration.toFixed(3)), frames: Math.round(a.duration * 60), events };
    });
  }

  /** Puts a weapon's art on the knight's sword slot (no-op when the rig has no attachment for it). */
  private showWeaponAttachment(weaponId: string): void {
    const spine = this.knightSpine;
    const slot = spine?.skeleton.findSlot('sword');
    const att = spine?.skeleton.getAttachmentByName('sword', weaponId === 'knight_sword' ? 'sword' : weaponId);
    if (slot && att) slot.setAttachment(att);
    this.equippedSlots.weapon = weaponId;
    this.equippedSlots.sword = weaponId;
  }

  /** Hides the knight in the open secret-trial scene (for capturing the empty set, e.g. cinematic art). */
  public debugTrialActor(visible: boolean) {
    const actor = this.trialScene?.detachActor();
    if (!actor) return;
    actor.visible = visible;
    this.trialScene?.attachActor(actor);
  }

  public debugKnightWeapon(name: string) {
    const spine = this.knightSpine;
    if (!spine) throw new Error('Knight rig not loaded');
    const slot = spine.skeleton.findSlot('sword');
    if (!slot) throw new Error('Slot sword not found');
    const attachment = spine.skeleton.getAttachmentByName('sword', name);
    if (!attachment) {
      const slotData = spine.skeleton.data.findSlot('sword');
      const skin = spine.skeleton.data.defaultSkin;
      const atts: string[] = [];
      if (skin && slotData) {
        const skinEntry = skin.attachments[slotData.index];
        if (skinEntry) atts.push(...Object.keys(skinEntry));
      }
      throw new Error(`Attachment "${name}" not found on slot "sword". Available: ${atts.join(', ')}`);
    }
    slot.setAttachment(attachment);
    return attachment.name;
  }

  /**
   * Dev bridge: freezes the knight on `animation` at `time` seconds (or returns it to IDLE when animation is
   * null). Returns the rig's animation list so callers can build contact sheets.
   */
  public debugPoseKnight(animation: string | null, time = 0) {
    const spine = this.knightSpine;
    if (!spine) throw new Error('Knight rig not loaded');
    if (this.gameLayer) this.gameLayer.visible = true;
    const animations = this.debugKnightAnimations();
    if (animation === null) {
      spine.state.timeScale = 1;
      if (!this.knightLocked) spine.state.setAnimation(0, 'IDLE', true);
      return { animations };
    }
    if (!spine.skeleton.data.findAnimation(animation)) throw new Error(`Knight has no animation "${animation}"`);
    spine.skeleton.setToSetupPose();
    const entry = spine.state.setAnimation(0, animation, false);
    entry.mixDuration = 0;
    entry.trackTime = time;
    spine.state.timeScale = 0;
    this.updateKnightVisuals();
    spine.update(0);
    return { animations };
  }

  /** Dev bridge: knight move ids (CARD_CATALOG templateIds) with their card's rarity and targeting. */
  public debugKnightMoves() {
    return KNIGHT_MOVE_IDS.map((id) => ({ id, ...knightMoveCard(id) }));
  }

  /**
   * Dev bridge: plays a knight move without touching battle state, with stand-in damage labels on each
   * hit. `targets` are monster slots in hit order (default: the targeted monster).
   */
  public debugKnightMove(id: string, targets?: number[], damage = 24) {
    if (!KNIGHT_MOVE_IDS.includes(id)) {
      throw new Error(`Unknown knight move "${id}". Known: ${KNIGHT_MOVE_IDS.join(', ')}`);
    }
    // Weapon spells: the dev preview swaps the knight to the weapon that grants them
    const spell = ALL_WEAPON_SPELLS.find((c) => c.templateId === id);
    if (spell?.weaponId) this.showWeaponAttachment(spell.weaponId);
    const slots = targets ?? undefined;
    this.playKnightMove(id, {
      interrupt: true,
      targets: slots,
      ctx: { power: 90, form: 1, crit: false, damage },
      onImpact: (i) => {
        const slot = slots?.[i] ?? this.targetSlotIndex;
        this.spawnMonsterText(slot, `-${damage}`, 0xFF3366, 12);
      },
    });
  }

  /** Dev bridge: stops the ticker and advances exactly `frames` 60 fps frames (deterministic captures). */
  public debugStep(frames: number): void {
    const ticker = this.app?.ticker;
    if (!ticker) return;
    if (ticker.started) {
      ticker.stop();
      this.debugClock = ticker.lastTime;
    }
    for (let i = 0; i < frames; i++) {
      this.debugClock += 1000 / 60;
      ticker.update(this.debugClock);
    }
  }

  /** Dev bridge: resumes real-time ticking after debugStep(). */
  public debugResume(): void {
    if (this.app && !this.app.ticker.started) this.app.ticker.start();
  }

  /**
   * GPU-resident textures with an approximate VRAM total, for spotting leaks against the 1 GB Fire TV budget.
   */
  public getTextureStats() {
    const managed: readonly any[] = (this.app?.renderer as any)?.texture?.managedTextures ?? [];
    const textures = managed.filter(Boolean).map((src) => {
      const w = src.pixelWidth ?? src.width ?? 0;
      const h = src.pixelHeight ?? src.height ?? 0;
      const mipFactor = src.autoGenerateMipmaps ? 4 / 3 : 1;
      const url = src.resource?.currentSrc || src.resource?.src || undefined;
      return { label: src.label || url || 'unnamed', width: w, height: h, bytes: Math.round(w * h * 4 * mipFactor) };
    });
    textures.sort((a, b) => b.bytes - a.bytes);
    const totalBytes = textures.reduce((sum, t) => sum + t.bytes, 0);
    return { count: textures.length, totalMB: Number((totalBytes / 1048576).toFixed(2)), textures };
  }

  /**
   * PNG data URL of the Pixi stage at the native 426x240 resolution (React overlay excluded).
   */
  public async snapshot(): Promise<string> {
    if (!this.app) throw new Error('[GameEngine] snapshot() before init');
    return this.app.renderer.extract.base64({
      target: this.app.stage,
      frame: new Rectangle(0, 0, 426, 240),
      format: 'png',
    });
  }

  /**
   * Safe VRAM and WebGL Context cleanup
   */
  public async destroy(): Promise<void> {
    this.isDestroyed = true;
    this.showSecretTrial(null);
    this.knightSpine = null;
    this.clearAllMonsters();
    this.releaseVfx();
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
      } catch (e) { }
      this.currentPreviewAssetKey = null;
    }

    // Unload battle background texture to prevent VRAM leak across scene transitions
    if (this.currentBgKey && Assets.cache.has(this.currentBgKey)) {
      try {
        await Assets.unload(this.currentBgKey);
      } catch (e) { }
      this.currentBgKey = null;
    } else if (Assets.cache.has(BATTLE_BG_KEY)) {
      try {
        await Assets.unload(BATTLE_BG_KEY);
      } catch (e) { }
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
    this.monsterOutline.destroy();
    this.repStamp?.destroy();
    this.repStamp = null;

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
