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
  bat: [
    { type: 'ATTACK', damage: 8, name: 'Wing Buffet', description: 'Flapping strike with leathery wings', durationSeconds: 8.5 },
    { type: 'HEAVY_ATTACK', damage: 14, name: 'Screech Dive', description: 'Piercing ultrasonic sonic dive', durationSeconds: 12.0 },
    { type: 'ATTACK', damage: 10, name: 'Blood Drain', description: 'Serrated fangs seek exposed veins', durationSeconds: 10.0 },
  ],
  goblin: [
    { type: 'ATTACK', damage: 9, name: 'Rusty Shank', description: 'Swift jab with a jagged blade', durationSeconds: 9.0 },
    { type: 'HEAVY_ATTACK', damage: 16, name: 'Sneak Pounce', description: 'Leaps from shadows aiming low', durationSeconds: 13.0 },
    { type: 'ATTACK', damage: 11, name: 'Sling Stone', description: 'Hurled flint pebble at high velocity', durationSeconds: 10.5 },
  ],
  mushroom: [
    { type: 'ATTACK', damage: 10, name: 'Spore Cloud', description: 'Puffs choking yellow spores', durationSeconds: 11.0 },
    { type: 'HEAVY_ATTACK', damage: 18, name: 'Toxic Burst', description: 'Cap explodes with corrosive slime', durationSeconds: 14.0 },
    { type: 'DEFEND', damage: 0, block: 18, name: 'Fungal Spores', description: 'Hardens cap with fungal growth (+18 Block)', durationSeconds: 11.5 },
  ],
  ghost: [
    { type: 'ATTACK', damage: 11, name: 'Chilling Grasp', description: 'Spectral cold numbs the body', durationSeconds: 10.0 },
    { type: 'HEAVY_ATTACK', damage: 20, name: 'Banshee Wail', description: 'Terrifying shriek rattles the soul', durationSeconds: 14.5 },
    { type: 'ATTACK', damage: 13, name: 'Phantasmal Bolt', description: 'Hurls swirling ectoplasmic essence', durationSeconds: 11.5 },
  ],
  giant_spider: [
    { type: 'ATTACK', damage: 12, name: 'Venom Fangs', description: 'Drips paralyzing neurotoxin', durationSeconds: 10.0 },
    { type: 'HEAVY_ATTACK', damage: 21, name: 'Silk Cocoon', description: 'Entangling webbing and violent bite', durationSeconds: 15.0 },
    { type: 'ATTACK', damage: 14, name: 'Skittering Lunge', description: 'Multi-legged burst charge', durationSeconds: 11.0 },
  ],
  skeleton_archer: [
    { type: 'ATTACK', damage: 13, name: 'Bone Arrow', description: 'Whistling shot aimed at the chest', durationSeconds: 9.5 },
    { type: 'HEAVY_ATTACK', damage: 22, name: 'Piercing Volley', description: 'Rapid spread of barbed arrows', durationSeconds: 14.0 },
    { type: 'ATTACK', damage: 15, name: 'Poison Shaft', description: 'Tip dipped in crypt venom', durationSeconds: 11.0 },
  ],
  skeleton_warrior: [
    { type: 'ATTACK', damage: 14, name: 'Scimitar Slash', description: 'Rusted steel cleaves bone and flesh', durationSeconds: 10.5 },
    { type: 'HEAVY_ATTACK', damage: 23, name: 'Shield Bash', description: 'Heavy iron boss crashes forward', durationSeconds: 14.5 },
    { type: 'DEFEND', damage: 0, block: 22, name: 'Bone Phalanx', description: 'Locks bone shield into defense (+22 Block)', durationSeconds: 11.5 },
  ],
  harpy: [
    { type: 'ATTACK', damage: 14, name: 'Talon Rake', description: 'Razor talons slice from above', durationSeconds: 9.5 },
    { type: 'HEAVY_ATTACK', damage: 24, name: 'Cyclone Screech', description: 'Buffeting wind and ear-splitting cry', durationSeconds: 14.0 },
    { type: 'ATTACK', damage: 16, name: 'Aerial Dive', description: 'Swoops at high velocity', durationSeconds: 11.5 },
  ],
  lizardman: [
    { type: 'ATTACK', damage: 15, name: 'Trident Thrust', description: 'Pointed tines thrust with marsh force', durationSeconds: 10.5 },
    { type: 'HEAVY_ATTACK', damage: 25, name: 'Tail Whip', description: 'Muscular scaly tail sweeps off feet', durationSeconds: 14.5 },
    { type: 'DEFEND', damage: 0, block: 24, name: 'Reptile Scales', description: 'Hardens armored scales (+24 Block)', durationSeconds: 12.0 },
  ],
  orc: [
    { type: 'ATTACK', damage: 17, name: 'Battleaxe Chop', description: 'Brutal downward cleave', durationSeconds: 11.0 },
    { type: 'HEAVY_ATTACK', damage: 28, name: 'Blood Frenzy', description: 'Berserker fury swings indiscriminately', durationSeconds: 15.5 },
    { type: 'ATTACK', damage: 19, name: 'War Cry Slam', description: 'Ground shaking bash after a roar', durationSeconds: 12.5 },
  ],
  dark_mage: [
    { type: 'ATTACK', damage: 16, name: 'Shadow Bolt', description: 'Dark energy orb crackles forward', durationSeconds: 11.0 },
    { type: 'HEAVY_ATTACK', damage: 27, name: 'Doom Curse', description: 'Hex runes ignite beneath the target', durationSeconds: 15.0 },
    { type: 'DEFEND', damage: 0, block: 26, name: 'Nether Ward', description: 'Conjures a dark sigil (+26 Block)', durationSeconds: 12.0 },
  ],
  water_elemental: [
    { type: 'ATTACK', damage: 16, name: 'Tidal Strike', description: 'High-pressure wave crushes armor', durationSeconds: 11.5 },
    { type: 'HEAVY_ATTACK', damage: 28, name: 'Geyser Eruption', description: 'Volatile geyser explodes underfoot', durationSeconds: 15.5 },
    { type: 'DEFEND', damage: 0, block: 28, name: 'Aqua Barrier', description: 'Vortex of water absorbs blows (+28 Block)', durationSeconds: 12.5 },
  ],
  nightmare_stag: [
    { type: 'ATTACK', damage: 16, name: 'Spectral Antlers', description: 'Luminescent horns stab with astral cold', durationSeconds: 11.0 },
    { type: 'HEAVY_ATTACK', damage: 27, name: 'Ethereal Trample', description: 'Phantoms of the woods stampede forward', durationSeconds: 15.0 },
    { type: 'ATTACK', damage: 18, name: 'Mist Veil', description: 'Dread fog blinds and suffocates', durationSeconds: 12.5 },
  ],
  golem: [
    { type: 'ATTACK', damage: 18, name: 'Stone Hammer', description: 'Monolithic granite fist hammers down', durationSeconds: 12.5 },
    { type: 'HEAVY_ATTACK', damage: 30, name: 'Earthquake Stomp', description: 'Shatters the ground beneath all foes', durationSeconds: 16.5 },
    { type: 'DEFEND', damage: 0, block: 32, name: 'Granite Skin', description: 'Petrifies outermost rocky layer (+32 Block)', durationSeconds: 13.0 },
  ],
  vault_guardian: [
    { type: 'ATTACK', damage: 18, name: 'Iron Cleaver', description: 'Reinforced mechanism slashes mechanically', durationSeconds: 11.5 },
    { type: 'HEAVY_ATTACK', damage: 31, name: 'Core Discharge', description: 'Ancient mana reactor vents scorching steam', durationSeconds: 16.0 },
    { type: 'DEFEND', damage: 0, block: 35, name: 'Aegis Lockdown', description: 'Bulwark plating locks tight (+35 Block)', durationSeconds: 13.0 },
  ],
  wraith: [
    { type: 'ATTACK', damage: 17, name: 'Soul Siphon', description: 'Drains vitality with spectral fingers', durationSeconds: 10.5 },
    { type: 'HEAVY_ATTACK', damage: 29, name: 'Shadow Vortex', description: 'Swirling nether rift tears flesh', durationSeconds: 15.0 },
    { type: 'ATTACK', damage: 20, name: 'Death Chill', description: 'Freezing aura that halts breath', durationSeconds: 12.0 },
  ],
  gargoyle: [
    { type: 'ATTACK', damage: 19, name: 'Gargoyle Talon', description: 'Chiseled stone talons shred mail', durationSeconds: 11.0 },
    { type: 'HEAVY_ATTACK', damage: 32, name: 'Rampart Dive', description: 'Crashes from high battlement with full weight', durationSeconds: 16.0 },
    { type: 'DEFEND', damage: 0, block: 30, name: 'Stone Form', description: 'Becomes living immovable granite (+30 Block)', durationSeconds: 12.5 },
  ],
  dark_knight: [
    { type: 'ATTACK', damage: 20, name: 'Black Blade', description: 'Cursed broadsword cuts with shadow flame', durationSeconds: 11.5 },
    { type: 'HEAVY_ATTACK', damage: 34, name: 'Abyssal Cleave', description: 'Sweeping arc of doom through the line', durationSeconds: 16.5 },
    { type: 'DEFEND', damage: 0, block: 30, name: 'Dread Bastion', description: 'Raises onyx heater shield (+30 Block)', durationSeconds: 12.5 },
  ],
  minotaur: [
    { type: 'ATTACK', damage: 21, name: 'Horn Gore', description: 'Massive hooked horns sweep violently', durationSeconds: 11.5 },
    { type: 'HEAVY_ATTACK', damage: 35, name: 'Labyrinth Charge', description: 'Unstoppable freight-train charge', durationSeconds: 16.5 },
    { type: 'ATTACK', damage: 23, name: 'War Club Crush', description: 'Spiked bludgeon hammers into the ground', durationSeconds: 13.0 },
  ],
  skeleton_knight: [
    { type: 'ATTACK', damage: 20, name: 'Dread Lance', description: 'Mounted thrust through armor plate', durationSeconds: 11.0 },
    { type: 'HEAVY_ATTACK', damage: 33, name: 'Phantom Trample', description: 'Spectral steed rides down the defender', durationSeconds: 15.5 },
    { type: 'DEFEND', damage: 0, block: 28, name: 'Crest of Death', description: 'Shields in unholy sigils (+28 Block)', durationSeconds: 12.0 },
  ],
  grave_colossus: [
    { type: 'ATTACK', damage: 22, name: 'Corpse Slam', description: 'Giant arm of stitched corpses pummels down', durationSeconds: 12.5 },
    { type: 'HEAVY_ATTACK', damage: 36, name: 'Tomb Collapse', description: 'Crushes with the weight of ancient crypts', durationSeconds: 17.0 },
    { type: 'DEFEND', damage: 0, block: 36, name: 'Ossuary Bulwark', description: 'Bones coalesce to deflect strikes (+36 Block)', durationSeconds: 13.5 },
  ],
  void_prophet: [
    { type: 'ATTACK', damage: 21, name: 'Eldritch Sigil', description: 'Runes of madness detonate on impact', durationSeconds: 11.5 },
    { type: 'HEAVY_ATTACK', damage: 35, name: 'Cosmic Rift', description: 'Opens a tear to the cold outer dark', durationSeconds: 16.0 },
    { type: 'DEFEND', damage: 0, block: 32, name: 'Singularity Ward', description: 'Gravity bends incoming force (+32 Block)', durationSeconds: 12.5 },
  ],
  troll: [
    { type: 'ATTACK', damage: 22, name: 'Burl Club', description: 'Tree trunk club smashed horizontally', durationSeconds: 12.0 },
    { type: 'HEAVY_ATTACK', damage: 37, name: 'Berserk Flail', description: 'Flailing fists in berserk fury', durationSeconds: 17.0 },
    { type: 'DEFEND', damage: 0, block: 34, name: 'Flesh Regrowth', description: 'Toughens thick rubbery hide (+34 Block)', durationSeconds: 13.0 },
  ],
  bone_golem: [
    { type: 'ATTACK', damage: 23, name: 'Ossuary Strike', description: 'Cage of jagged ribs closes like teeth', durationSeconds: 12.0 },
    { type: 'HEAVY_ATTACK', damage: 38, name: 'Bone Spire', description: 'Jagged bone spears pierce from below', durationSeconds: 16.5 },
    { type: 'DEFEND', damage: 0, block: 38, name: 'Marrow Armor', description: 'Dense osseous shell solidifies (+38 Block)', durationSeconds: 13.0 },
  ],
  ancient_treant: [
    { type: 'ATTACK', damage: 23, name: 'Elder Bough', description: 'Century-old branch sweeps with crushing mass', durationSeconds: 12.5 },
    { type: 'HEAVY_ATTACK', damage: 39, name: 'Forest Wrath', description: 'Earth ruptures with grasping ancient roots', durationSeconds: 17.5 },
    { type: 'DEFEND', damage: 0, block: 40, name: 'Ironwood Bark', description: 'Iron-hard outer bark absorbs all blows (+40 Block)', durationSeconds: 13.5 },
  ],
  crypt_lord: [
    { type: 'ATTACK', damage: 24, name: 'Lich Frostbolt', description: 'Black ice shard pierces vital organs', durationSeconds: 11.5 },
    { type: 'HEAVY_ATTACK', damage: 41, name: 'Death Nova', description: 'Expanding ring of pure necrotic energy', durationSeconds: 16.5 },
    { type: 'DEFEND', damage: 0, block: 38, name: 'Phylactery Guard', description: 'Soul essence wards off physical harm (+38 Block)', durationSeconds: 13.0 },
  ],
  kraken: [
    { type: 'ATTACK', damage: 25, name: 'Tentacle Lash', description: 'Barbed sucker-covered arm whips hard', durationSeconds: 11.5 },
    { type: 'HEAVY_ATTACK', damage: 42, name: 'Maelstrom Crush', description: 'Drowns and crushes in an abyssal vortex', durationSeconds: 17.0 },
    { type: 'ATTACK', damage: 28, name: 'Ink Cloud', description: 'Corrosive black ink burns eyes and armor', durationSeconds: 13.5 },
  ],
  demon_archbishop: [
    { type: 'ATTACK', damage: 26, name: 'Ash Liturgy', description: 'Chants incinerating unholy litanies', durationSeconds: 12.0 },
    { type: 'HEAVY_ATTACK', damage: 44, name: 'Profane Pillar', description: 'Sky-splitting beam of black solar fire', durationSeconds: 17.0 },
    { type: 'DEFEND', damage: 0, block: 42, name: 'Inquisitor Aegis', description: 'Seal of the Ash Cathedral (+42 Block)', durationSeconds: 13.5 },
  ],
  inferno_titan: [
    { type: 'ATTACK', damage: 27, name: 'Magma Hammer', description: 'Fist of liquid rock and volcanic slag', durationSeconds: 12.0 },
    { type: 'HEAVY_ATTACK', damage: 46, name: 'Apocalypse Flare', description: 'Ground splits open with sea of lava', durationSeconds: 17.5 },
    { type: 'DEFEND', damage: 0, block: 45, name: 'Igneous Plate', description: 'Cooled obsidian shield (+45 Block)', durationSeconds: 14.0 },
  ],
  dark_emperor: [
    { type: 'ATTACK', damage: 28, name: 'Imperial Slash', description: 'Sword of conquest cleaves with royal malice', durationSeconds: 12.0 },
    { type: 'HEAVY_ATTACK', damage: 48, name: 'Sovereign Ruin', description: 'Summons executioner blade from the void', durationSeconds: 17.5 },
    { type: 'DEFEND', damage: 0, block: 45, name: 'Crown of Shadows', description: 'Dark majesty repels mortal weapons (+45 Block)', durationSeconds: 13.5 },
  ],
  magma_dragon: [
    { type: 'ATTACK', damage: 30, name: 'Tail Whip Flame', description: 'Massive spiked tail trailing molten sparks', durationSeconds: 12.0 },
    { type: 'HEAVY_ATTACK', damage: 52, name: 'Inferno Breath', description: 'Cataclysmic torrent of dragon fire', durationSeconds: 18.0 },
    { type: 'DEFEND', damage: 0, block: 48, name: 'Dragon Scales', description: 'Ancient wyrm scales deflect weapons (+48 Block)', durationSeconds: 14.0 },
  ],
  eldritch_horror: [
    { type: 'ATTACK', damage: 32, name: 'Tentacle Grasp', description: 'Writhing cosmic appendages squeeze reality', durationSeconds: 12.5 },
    { type: 'HEAVY_ATTACK', damage: 55, name: 'Cosmic Madness', description: 'Gaze into non-euclidean geometry of pure doom', durationSeconds: 18.5 },
    { type: 'DEFEND', damage: 0, block: 50, name: 'Void Distortion', description: 'Warps local space-time (+50 Block)', durationSeconds: 14.0 },
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
