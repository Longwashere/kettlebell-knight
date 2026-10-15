import { MONSTER_CATALOG, type MonsterAffix, type MonsterState, type MonsterVariantSpec } from '../types/battle';

export interface AffixPreset {
  affix: MonsterAffix;
  namePrefix?: string;
  nameSuffix?: string;
  titlePrefix?: string;
  titleSuffix?: string;
  tint: number;
  outlineColor: number;
  scaleMultiplier: number;
  aura?: 'fire' | 'ice' | 'poison' | 'summon';
  hpMultiplier: number;
  damageMultiplier: number;
  icon: string;
  badge: string;
  description: string;
}

export const AFFIX_PRESETS: Record<MonsterAffix, AffixPreset> = {
  FIRE: {
    affix: 'FIRE',
    namePrefix: 'Cinder ',
    titleSuffix: ' [INFERNAL]',
    tint: 0xFFA07A,
    outlineColor: 0xFF4500,
    scaleMultiplier: 1.0,
    aura: 'fire',
    hpMultiplier: 1.15,
    damageMultiplier: 1.2,
    icon: '🔥',
    badge: 'FIRE',
    description: 'Imbued with raging volcanic fire. Deals increased damage.',
  },
  FROST: {
    affix: 'FROST',
    namePrefix: 'Glacial ',
    titleSuffix: ' [FROSTBORN]',
    tint: 0x80D8FF,
    outlineColor: 0x00B0FF,
    scaleMultiplier: 1.0,
    aura: 'ice',
    hpMultiplier: 1.25,
    damageMultiplier: 1.05,
    icon: '❄️',
    badge: 'FROST',
    description: 'Encased in glacial ice. Highly resistant and durable.',
  },
  TOXIC: {
    affix: 'TOXIC',
    namePrefix: 'Venomous ',
    titleSuffix: ' [BLIGHTED]',
    tint: 0x76FF03,
    outlineColor: 0x64DD17,
    scaleMultiplier: 1.0,
    aura: 'poison',
    hpMultiplier: 1.1,
    damageMultiplier: 1.15,
    icon: '🧪',
    badge: 'TOXIC',
    description: 'Seeping caustic acids and noxious venom.',
  },
  VOID: {
    affix: 'VOID',
    namePrefix: 'Abyssal ',
    titleSuffix: ' [VOID-TOUCHED]',
    tint: 0xCE93D8,
    outlineColor: 0xAA00FF,
    scaleMultiplier: 1.05,
    aura: 'summon',
    hpMultiplier: 1.3,
    damageMultiplier: 1.25,
    icon: '🔮',
    badge: 'VOID',
    description: 'Empowered by forbidden abyssal rituals.',
  },
  GOLDEN: {
    affix: 'GOLDEN',
    namePrefix: 'Gilded ',
    titleSuffix: ' [TREASURE-HOARD]',
    tint: 0xFFD700,
    outlineColor: 0xFFA000,
    scaleMultiplier: 1.12,
    hpMultiplier: 1.5,
    damageMultiplier: 0.85,
    icon: '🪙',
    badge: 'GOLD',
    description: 'A legendary golden creature laden with glittering hoard treasure.',
  },
  SHADOW: {
    affix: 'SHADOW',
    namePrefix: 'Umbral ',
    titleSuffix: ' [SHADOW]',
    tint: 0x78909C,
    outlineColor: 0x263238,
    scaleMultiplier: 0.92,
    hpMultiplier: 0.85,
    damageMultiplier: 1.35,
    icon: '🌑',
    badge: 'SHADOW',
    description: 'Stalks the ethereal dark. Strikes fast and hard.',
  },
  STORM: {
    affix: 'STORM',
    namePrefix: 'Tempest ',
    titleSuffix: ' [STORM-WROUGHT]',
    tint: 0x84FFFF,
    outlineColor: 0x2979FF,
    scaleMultiplier: 1.0,
    hpMultiplier: 1.1,
    damageMultiplier: 1.25,
    icon: '⚡',
    badge: 'STORM',
    description: 'Pulsing with erratic high-voltage lightning.',
  },
};

/**
 * Resolves a monster variant by merging the base catalog entry with optional affix presets
 * and specific variant overrides (tint, skin, scaleMultiplier, aura, outlineColor, stats).
 */
export function resolveMonsterVariant(
  specOrId: string | MonsterVariantSpec,
): Omit<MonsterState, 'currentHp' | 'block' | 'intent'> & {
  damageMultiplier?: number;
} {
  const isSpec = typeof specOrId === 'object' && specOrId !== null;
  const baseId = isSpec ? specOrId.id : specOrId;
  const base = MONSTER_CATALOG.find((m) => m.id === baseId) || MONSTER_CATALOG[0];

  if (!isSpec) {
    return { ...base };
  }

  const affixPreset = specOrId.affix ? AFFIX_PRESETS[specOrId.affix] : null;

  const name = specOrId.name ?? (affixPreset?.namePrefix ? `${affixPreset.namePrefix}${base.name}` : base.name);
  const title = specOrId.title ?? (affixPreset?.titleSuffix ? `${base.title}${affixPreset.titleSuffix}` : base.title);
  const tint = specOrId.tint ?? affixPreset?.tint;
  const scaleMultiplier = (specOrId.scaleMultiplier ?? 1) * (affixPreset?.scaleMultiplier ?? 1);
  const outlineColor = specOrId.outlineColor ?? affixPreset?.outlineColor;
  const aura = specOrId.aura ?? affixPreset?.aura;
  const skin = specOrId.skin;
  const hpMultiplier = (specOrId.hpMultiplier ?? 1) * (affixPreset?.hpMultiplier ?? 1);
  const damageMultiplier = affixPreset?.damageMultiplier ?? 1;

  const maxHp = Math.round(base.maxHp * hpMultiplier);

  return {
    ...base,
    name,
    title,
    level: specOrId.level ?? base.level,
    maxHp,
    tint,
    scaleMultiplier: scaleMultiplier !== 1 ? scaleMultiplier : undefined,
    skin,
    affix: specOrId.affix,
    aura,
    outlineColor,
    damageMultiplier: damageMultiplier !== 1 ? damageMultiplier : undefined,
  };
}
