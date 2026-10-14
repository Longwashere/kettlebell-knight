/**
 * Monster movesets (intents) and encounter construction. Shared by the TV battle screen and the
 * balance simulator (scripts/balance-sim.ts). `move` selects the choreography in
 * src/tv/engine/monsterMoves.ts.
 */
import { MONSTER_CATALOG, type EncounterTemplate, type MonsterIntent, type MonsterState } from '../types/battle';
import { PACK_SCALING } from './combatRules';

export type IntentTemplate = Omit<MonsterIntent, 'remainingSeconds'>;

// Each monster's moveset. `move` selects the choreography in src/tv/engine/monsterMoves.ts.
export const MOVESETS: Record<string, IntentTemplate[]> = {
  green_slime: [
    { type: 'ATTACK', damage: 12, name: 'Slime Slap', description: 'Bouncing body-slam', durationSeconds: 13.5, move: 'slime_slap' },
    { type: 'ATTACK', damage: 9, name: 'Acid Spit', description: 'Three corrosive globs', durationSeconds: 10.5, move: 'slime_acid_spit' },
    { type: 'HEAVY_ATTACK', damage: 21, name: 'Ooze Slam', description: 'Leaps skyward and crashes down', durationSeconds: 18.0, move: 'slime_ooze_slam' },
    { type: 'HEAVY_ATTACK', damage: 16, name: 'Corrosive Engulf', description: 'Swallows you in burning acid', durationSeconds: 16.5, move: 'slime_engulf' },
  ],
  treemon: [
    { type: 'ATTACK', damage: 16, name: 'Branch Whip', description: 'Lashing thorned bough', durationSeconds: 12.5, move: 'tree_branch_whip' },
    { type: 'HEAVY_ATTACK', damage: 28, name: 'Root Stomp', description: 'Thorns erupt from the earth', durationSeconds: 17.5, move: 'tree_root_stomp' },
    { type: 'HEAVY_ATTACK', damage: 22, name: 'Burrow Ambush', description: 'Tunnels beneath and erupts', durationSeconds: 16.0, move: 'tree_burrow_ambush' },
    { type: 'ATTACK', damage: 12, name: 'Spore Burst', description: 'Drifting toxic spores', durationSeconds: 11.5, move: 'tree_spore_burst' },
    { type: 'DEFEND', damage: 0, block: 25, name: 'Bark Skin', description: 'Hardens its bark (+25 Block)', durationSeconds: 12.0, move: 'tree_bark_skin' },
  ],
  boar: [
    { type: 'HEAVY_ATTACK', damage: 24, name: 'Gore Charge', description: 'Violent headlong tusk impale', durationSeconds: 15.5, move: 'boar_gore_charge' },
    { type: 'ATTACK', damage: 14, name: 'Tusk Slash', description: 'Quick upward tusk thrust', durationSeconds: 11.0, move: 'boar_tusk_slash' },
    { type: 'ATTACK', damage: 16, name: 'Earthsplitter', description: 'Stomp cracks the earth', durationSeconds: 13.0, move: 'boar_earthsplitter' },
    { type: 'ATTACK', damage: 10, name: 'Quill Volley', description: 'Hurls razor bristles', durationSeconds: 10.0, move: 'boar_quill_volley' },
    { type: 'DEFEND', damage: 0, block: 20, name: 'Iron Bristles', description: 'Toughens coarse hide (+20 Block)', durationSeconds: 12.5, move: 'boar_iron_bristles' },
  ],
  wolf: [
    { type: 'HEAVY_ATTACK', damage: 22, name: 'Throat Bite', description: 'Ferocious neck puncture', durationSeconds: 14.5, move: 'wolf_throat_bite' },
    { type: 'ATTACK', damage: 12, name: 'Shadow Pounce', description: 'Agile leap from the dark', durationSeconds: 9.5, move: 'wolf_shadow_pounce' },
    { type: 'ATTACK', damage: 15, name: 'Predator Rake', description: 'Razor claw laceration', durationSeconds: 11.5, move: 'wolf_predator_rake' },
    { type: 'HEAVY_ATTACK', damage: 19, name: 'Phantom Pack', description: 'Howls spectral wolves from the dark', durationSeconds: 18.0, move: 'wolf_phantom_pack' },
  ],
  demon_monk: [
    { type: 'HEAVY_ATTACK', damage: 29, name: 'Abyssal Edict', description: 'Pillar of hellfire from a ritual circle', durationSeconds: 16.5, move: 'monk_abyssal_edict' },
    { type: 'ATTACK', damage: 18, name: 'Cursed Palm', description: 'Teleporting demonic strike', durationSeconds: 11.5, move: 'monk_cursed_palm' },
    { type: 'ATTACK', damage: 15, name: 'Hellfire Orb', description: 'Hurls a ball of hellfire', durationSeconds: 12.5, move: 'monk_hellfire_orb' },
    { type: 'ATTACK', damage: 13, name: 'Chains of Penance', description: 'Binding infernal chains', durationSeconds: 11.0, move: 'monk_chains_of_penance' },
    { type: 'DEFEND', damage: 0, block: 28, name: 'Forbidden Ward', description: 'Dark sorcery shield (+28 Block)', durationSeconds: 12.0, move: 'monk_forbidden_ward' },
  ],
  hellhound: [
    { type: 'HEAVY_ATTACK', damage: 27, name: 'Twin Maul', description: 'Both heads bite at once', durationSeconds: 15.0, move: 'hound_twin_maul' },
    { type: 'ATTACK', damage: 14, name: 'Savage Frenzy', description: 'Wild snapping bites', durationSeconds: 9.5, move: 'hound_savage_frenzy' },
    { type: 'ATTACK', damage: 19, name: 'Hellfire Breath', description: 'Torrent of scorching flame', durationSeconds: 13.5, move: 'hound_hellfire_breath' },
    { type: 'HEAVY_ATTACK', damage: 24, name: 'Magma Rampage', description: 'Charges through; the ground erupts', durationSeconds: 17.0, move: 'hound_magma_rampage' },
    { type: 'ATTACK', damage: 17, name: 'Brimstone Rain', description: 'Calls down burning meteors', durationSeconds: 14.5, move: 'hound_brimstone_rain' },
  ],
};

export const MONSTER_INTENTS: Record<string, MonsterIntent[]> = Object.fromEntries(
  Object.entries(MOVESETS).map(([id, moves]) => [id, moves.map((m) => ({ ...m, remainingSeconds: m.durationSeconds }))]),
);

/** Rolls a monster's next intent, with its pack-scaled damage and Block baked in. */
export function rollIntent(m: Pick<MonsterState, 'id' | 'damageScale'>, pick?: number): MonsterIntent {
  const moves = MOVESETS[m.id] ?? MOVESETS.green_slime;
  const t = moves[pick ?? Math.floor(Math.random() * moves.length)] ?? moves[0];
  const scale = m.damageScale ?? 1;
  return {
    ...t,
    damage: Math.round(t.damage * scale),
    block: t.block !== undefined ? Math.round(t.block * scale) : undefined,
    remainingSeconds: t.durationSeconds,
  };
}

export function createEncounterFromTemplate(template: EncounterTemplate): MonsterState[] {
  const counts: Record<string, number> = {};
  const pack = PACK_SCALING[Math.min(3, template.monsterIds.length)] ?? PACK_SCALING[1];
  return template.monsterIds.map((mId, slotIndex) => {
    const cat = MONSTER_CATALOG.find(c => c.id === mId) || MONSTER_CATALOG[0];
    counts[mId] = (counts[mId] || 0) + 1;
    const count = counts[mId];
    const totalOfThisType = template.monsterIds.filter(id => id === mId).length;
    const suffix = totalOfThisType > 1 ? ` ${String.fromCharCode(64 + count)}` : '';
    const maxHp = Math.round(cat.maxHp * pack.hp);

    // Openers cycle through the moveset by slot; later slots start a little later so attacks stagger
    const opener = rollIntent({ id: cat.id, damageScale: pack.damage }, slotIndex % (MOVESETS[cat.id]?.length ?? 1));
    opener.remainingSeconds += slotIndex * 2.5;

    return {
      ...cat,
      name: `${cat.name}${suffix}`,
      instanceId: `${template.id}_${slotIndex}_${Date.now()}`,
      slotIndex,
      isAlive: true,
      maxHp,
      currentHp: maxHp,
      block: 0,
      damageScale: pack.damage,
      intent: opener,
    };
  });
}
