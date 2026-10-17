/**
 * Elemental typing. Cards, weapon infusions and monsters can carry an element; physical (no element)
 * is always neutral.
 *
 * The five natural elements form a cycle, each strong against the next:
 *
 *   FIRE → NATURE → EARTH → STORM → FROST → FIRE
 *   (fire burns roots, roots crack stone, stone grounds lightning, lightning shatters ice and water,
 *   frost quenches fire)
 *
 * HOLY and VOID are strong against each other. An element is resisted by its own kind and by the
 * element that beats it (FIRE into a FROST monster, VOID into a VOID monster).
 */
import type { MonsterAffix } from '../types/battle';

export type Element = 'FIRE' | 'FROST' | 'STORM' | 'EARTH' | 'NATURE' | 'HOLY' | 'VOID';

export const ELEMENTS: readonly Element[] = ['FIRE', 'FROST', 'STORM', 'EARTH', 'NATURE', 'HOLY', 'VOID'];

export const ELEMENT_INFO: Record<Element, { label: string; icon: string; color: string; hex: number }> = {
  FIRE: { label: 'FIRE', icon: '🔥', color: '#F97316', hex: 0xf97316 },
  FROST: { label: 'FROST', icon: '❄️', color: '#7DD3FC', hex: 0x7dd3fc },
  STORM: { label: 'STORM', icon: '⚡', color: '#FACC15', hex: 0xfacc15 },
  EARTH: { label: 'EARTH', icon: '⛰️', color: '#B45309', hex: 0xb45309 },
  NATURE: { label: 'NATURE', icon: '🌿', color: '#4ADE80', hex: 0x4ade80 },
  HOLY: { label: 'HOLY', icon: '✨', color: '#FDE68A', hex: 0xfde68a },
  VOID: { label: 'VOID', icon: '🌑', color: '#A855F7', hex: 0xa855f7 },
};

/** What each element hits for extra damage. */
export const STRONG_AGAINST: Record<Element, Element[]> = {
  FIRE: ['NATURE'],
  NATURE: ['EARTH'],
  EARTH: ['STORM'],
  STORM: ['FROST'],
  FROST: ['FIRE'],
  HOLY: ['VOID'],
  VOID: ['HOLY'],
};

export const ELEMENT_MULTIPLIER = { strong: 1.5, resisted: 0.6 };

export type Effectiveness = 'strong' | 'resisted' | 'neutral';

export function effectiveness(attack: Element | undefined, defend: Element | undefined): Effectiveness {
  if (!attack || !defend) return 'neutral';
  if (STRONG_AGAINST[attack].includes(defend)) return 'strong';
  if (attack === defend || STRONG_AGAINST[defend].includes(attack)) return 'resisted';
  return 'neutral';
}

export function elementMultiplier(attack: Element | undefined, defend: Element | undefined): number {
  const e = effectiveness(attack, defend);
  return e === 'neutral' ? 1 : ELEMENT_MULTIPLIER[e];
}

/** Monster elements by MONSTER_CATALOG id; missing ids are physical. */
export const MONSTER_ELEMENTS: Record<string, Element> = {
  green_slime: 'NATURE',
  boar: 'EARTH',
  wolf: 'VOID',
  treemon: 'NATURE',
  demon_monk: 'FIRE',
  hellhound: 'FIRE',
  bat: 'VOID',
  mushroom: 'NATURE',
  ghost: 'VOID',
  giant_spider: 'NATURE',
  skeleton_archer: 'VOID',
  skeleton_warrior: 'VOID',
  harpy: 'STORM',
  lizardman: 'NATURE',
  orc: 'EARTH',
  dark_mage: 'VOID',
  water_elemental: 'FROST',
  nightmare_stag: 'VOID',
  golem: 'EARTH',
  vault_guardian: 'EARTH',
  wraith: 'FROST',
  gargoyle: 'EARTH',
  dark_knight: 'VOID',
  minotaur: 'EARTH',
  skeleton_knight: 'VOID',
  grave_colossus: 'VOID',
  void_prophet: 'VOID',
  troll: 'NATURE',
  bone_golem: 'VOID',
  ancient_treant: 'NATURE',
  crypt_lord: 'FROST',
  kraken: 'FROST',
  demon_archbishop: 'FIRE',
  inferno_titan: 'FIRE',
  dark_emperor: 'VOID',
  magma_dragon: 'FIRE',
  eldritch_horror: 'VOID',
  plague_rat: 'NATURE',
  lantern_wisp: 'HOLY',
  giant_crab: 'FROST',
  crypt_crawler: 'EARTH',
  cinder_imp: 'FIRE',
  storm_crow: 'STORM',
  giant_beetle: 'EARTH',
  thorn_stalker: 'NATURE',
  bard: 'STORM',
  cultist_acolyte: 'VOID',
  vault_hound: 'EARTH',
  ember_serpent: 'FIRE',
  forest_bear: 'EARTH',
  sewer_lurker: 'FROST',
  throne_guardian: 'HOLY',
};

/** Affixed variants take the affix's element (GOLDEN keeps the base monster's). */
export const AFFIX_ELEMENT: Partial<Record<MonsterAffix, Element>> = {
  FIRE: 'FIRE',
  FROST: 'FROST',
  TOXIC: 'NATURE',
  VOID: 'VOID',
  SHADOW: 'VOID',
  STORM: 'STORM',
};
