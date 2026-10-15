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
    { type: 'ATTACK', damage: 8, name: 'Wing Buffet', description: 'Flapping strike with leathery wings', durationSeconds: 8.5, move: 'bat_wing_buffet' },
    { type: 'HEAVY_ATTACK', damage: 14, name: 'Screech Dive', description: 'Piercing ultrasonic sonic dive', durationSeconds: 12.0, move: 'bat_screech_dive' },
    { type: 'ATTACK', damage: 10, name: 'Blood Drain', description: 'Serrated fangs seek exposed veins', durationSeconds: 10.0, move: 'bat_blood_drain' },
    { type: 'ATTACK', damage: 13, name: 'Echo Swarm', description: 'A shrieking swarm of cave bats', durationSeconds: 12.5, move: 'bat_echo_swarm' },
  ],
  goblin: [
    { type: 'ATTACK', damage: 9, name: 'Rusty Shank', description: 'Swift jab with a jagged blade', durationSeconds: 9.0, move: 'goblin_rusty_shank' },
    { type: 'HEAVY_ATTACK', damage: 16, name: 'Sneak Pounce', description: 'Leaps from shadows aiming low', durationSeconds: 13.0, move: 'goblin_sneak_pounce' },
    { type: 'ATTACK', damage: 11, name: 'Sling Stone', description: 'Hurled flint pebble at high velocity', durationSeconds: 10.5, move: 'goblin_sling_stone' },
    { type: 'ATTACK', damage: 14, name: 'Firebomb Toss', description: 'Lobs a sputtering powder keg', durationSeconds: 12.5, move: 'goblin_firebomb' },
  ],
  mushroom: [
    { type: 'ATTACK', damage: 10, name: 'Spore Cloud', description: 'Puffs choking yellow spores', durationSeconds: 11.0, move: 'shroom_spore_cloud' },
    { type: 'HEAVY_ATTACK', damage: 18, name: 'Toxic Burst', description: 'Cap explodes with corrosive slime', durationSeconds: 14.0, move: 'shroom_toxic_burst' },
    { type: 'DEFEND', damage: 0, block: 18, name: 'Fungal Spores', description: 'Hardens cap with fungal growth (+18 Block)', durationSeconds: 11.5, move: 'shroom_fungal_guard' },
    { type: 'ATTACK', damage: 10, name: 'Mycelium Snare', description: 'Glowing roots sprout toadstools underfoot', durationSeconds: 12.5, move: 'shroom_mycelium_snare' },
  ],
  ghost: [
    { type: 'ATTACK', damage: 11, name: 'Chilling Grasp', description: 'Spectral cold numbs the body', durationSeconds: 10.0, move: 'ghost_chilling_grasp' },
    { type: 'HEAVY_ATTACK', damage: 20, name: 'Banshee Wail', description: 'Terrifying shriek rattles the soul', durationSeconds: 14.5, move: 'ghost_banshee_wail' },
    { type: 'ATTACK', damage: 13, name: 'Phantasmal Bolt', description: 'Hurls swirling ectoplasmic essence', durationSeconds: 11.5, move: 'ghost_phantasmal_bolt' },
    { type: 'HEAVY_ATTACK', damage: 17, name: 'Possession', description: 'Phases into your body and tears free', durationSeconds: 14.0, move: 'ghost_possession' },
  ],
  giant_spider: [
    { type: 'ATTACK', damage: 12, name: 'Venom Fangs', description: 'Drips paralyzing neurotoxin', durationSeconds: 10.0, move: 'spider_venom_fangs' },
    { type: 'HEAVY_ATTACK', damage: 21, name: 'Silk Cocoon', description: 'Entangling webbing and violent bite', durationSeconds: 15.0, move: 'spider_silk_cocoon' },
    { type: 'ATTACK', damage: 14, name: 'Skittering Lunge', description: 'Multi-legged burst charge', durationSeconds: 11.0, move: 'spider_skitter_lunge' },
    { type: 'ATTACK', damage: 16, name: 'Brood Swarm', description: 'A tide of skittering spiderlings', durationSeconds: 12.5, move: 'spider_brood_swarm' },
  ],
  skeleton_archer: [
    { type: 'ATTACK', damage: 13, name: 'Bone Arrow', description: 'Whistling shot aimed at the chest', durationSeconds: 9.5, move: 'archer_bone_arrow' },
    { type: 'HEAVY_ATTACK', damage: 22, name: 'Piercing Volley', description: 'Rapid spread of barbed arrows', durationSeconds: 14.0, move: 'archer_piercing_volley' },
    { type: 'ATTACK', damage: 15, name: 'Poison Shaft', description: 'Tip dipped in crypt venom', durationSeconds: 11.0, move: 'archer_poison_shaft' },
    { type: 'HEAVY_ATTACK', damage: 20, name: 'Soul Arrow', description: 'A charged shaft of grave-fire', durationSeconds: 14.0, move: 'archer_soul_arrow' },
  ],
  skeleton_warrior: [
    { type: 'ATTACK', damage: 14, name: 'Scimitar Slash', description: 'Rusted steel cleaves bone and flesh', durationSeconds: 10.5, move: 'skwar_scimitar_slash' },
    { type: 'HEAVY_ATTACK', damage: 23, name: 'Shield Bash', description: 'Heavy iron boss crashes forward', durationSeconds: 14.5, move: 'skwar_shield_bash' },
    { type: 'DEFEND', damage: 0, block: 22, name: 'Bone Phalanx', description: 'Locks bone shield into defense (+22 Block)', durationSeconds: 11.5, move: 'skwar_bone_phalanx' },
    { type: 'ATTACK', damage: 13, name: 'Bone Ambush', description: 'Collapses, crawls beneath you, reassembles', durationSeconds: 12.5, move: 'skwar_bone_ambush' },
  ],
  harpy: [
    { type: 'ATTACK', damage: 14, name: 'Talon Rake', description: 'Razor talons slice from above', durationSeconds: 9.5, move: 'harpy_talon_rake' },
    { type: 'HEAVY_ATTACK', damage: 24, name: 'Cyclone Screech', description: 'Buffeting wind and ear-splitting cry', durationSeconds: 14.0, move: 'harpy_cyclone' },
    { type: 'ATTACK', damage: 16, name: 'Aerial Dive', description: 'Swoops at high velocity', durationSeconds: 11.5, move: 'harpy_aerial_dive' },
    { type: 'ATTACK', damage: 19, name: 'Feather Storm', description: 'A fan of razor quills', durationSeconds: 12.5, move: 'harpy_feather_storm' },
  ],
  lizardman: [
    { type: 'ATTACK', damage: 15, name: 'Trident Thrust', description: 'Pointed tines thrust with marsh force', durationSeconds: 10.5, move: 'lizard_trident_thrust' },
    { type: 'HEAVY_ATTACK', damage: 25, name: 'Tail Whip', description: 'Muscular scaly tail sweeps off feet', durationSeconds: 14.5, move: 'lizard_tail_whip' },
    { type: 'DEFEND', damage: 0, block: 24, name: 'Reptile Scales', description: 'Hardens armored scales (+24 Block)', durationSeconds: 12.0, move: 'lizard_scale_guard' },
    { type: 'ATTACK', damage: 14, name: 'Swamp Ambush', description: 'Sinks into the mire and strikes from below', durationSeconds: 12.5, move: 'lizard_swamp_ambush' },
  ],
  orc: [
    { type: 'ATTACK', damage: 17, name: 'Battleaxe Chop', description: 'Brutal downward cleave', durationSeconds: 11.0, move: 'orc_axe_chop' },
    { type: 'HEAVY_ATTACK', damage: 28, name: 'Blood Frenzy', description: 'Berserker fury swings indiscriminately', durationSeconds: 15.5, move: 'orc_blood_frenzy' },
    { type: 'ATTACK', damage: 19, name: 'War Cry Slam', description: 'Ground shaking bash after a roar', durationSeconds: 12.5, move: 'orc_war_cry_slam' },
    { type: 'ATTACK', damage: 21, name: 'Axe Throw', description: 'Hurls a spinning axe that returns', durationSeconds: 12.5, move: 'orc_axe_throw' },
  ],
  dark_mage: [
    { type: 'ATTACK', damage: 16, name: 'Shadow Bolt', description: 'Dark energy orb crackles forward', durationSeconds: 11.0, move: 'mage_shadow_bolt' },
    { type: 'HEAVY_ATTACK', damage: 27, name: 'Doom Curse', description: 'Hex runes ignite beneath the target', durationSeconds: 15.0, move: 'mage_doom_curse' },
    { type: 'DEFEND', damage: 0, block: 26, name: 'Nether Ward', description: 'Conjures a dark sigil (+26 Block)', durationSeconds: 12.0, move: 'mage_nether_ward' },
    { type: 'ATTACK', damage: 14, name: 'Raven Storm', description: 'Conjures a flock of shadow ravens', durationSeconds: 12.5, move: 'mage_raven_storm' },
  ],
  water_elemental: [
    { type: 'ATTACK', damage: 16, name: 'Tidal Strike', description: 'High-pressure wave crushes armor', durationSeconds: 11.5, move: 'water_tidal_strike' },
    { type: 'HEAVY_ATTACK', damage: 28, name: 'Geyser Eruption', description: 'Volatile geyser explodes underfoot', durationSeconds: 15.5, move: 'water_geyser' },
    { type: 'DEFEND', damage: 0, block: 28, name: 'Aqua Barrier', description: 'Vortex of water absorbs blows (+28 Block)', durationSeconds: 12.5, move: 'water_aqua_barrier' },
    { type: 'ATTACK', damage: 14, name: 'Bubble Prison', description: 'Traps you in a crushing water sphere', durationSeconds: 12.5, move: 'water_bubble_prison' },
  ],
  nightmare_stag: [
    { type: 'ATTACK', damage: 16, name: 'Spectral Antlers', description: 'Luminescent horns stab with astral cold', durationSeconds: 11.0, move: 'stag_spectral_antlers' },
    { type: 'HEAVY_ATTACK', damage: 27, name: 'Ethereal Trample', description: 'Phantoms of the woods stampede forward', durationSeconds: 15.0, move: 'stag_ethereal_trample' },
    { type: 'ATTACK', damage: 18, name: 'Mist Veil', description: 'Dread fog blinds and suffocates', durationSeconds: 12.5, move: 'stag_mist_veil' },
    { type: 'ATTACK', damage: 20, name: 'Moonlit Bellow', description: 'Calls down shafts of cold moonlight', durationSeconds: 12.5, move: 'stag_moon_bellow' },
  ],
  golem: [
    { type: 'ATTACK', damage: 18, name: 'Stone Hammer', description: 'Monolithic granite fist hammers down', durationSeconds: 12.5, move: 'golem_stone_hammer' },
    { type: 'HEAVY_ATTACK', damage: 30, name: 'Earthquake Stomp', description: 'Shatters the ground beneath all foes', durationSeconds: 16.5, move: 'golem_earthquake' },
    { type: 'DEFEND', damage: 0, block: 32, name: 'Granite Skin', description: 'Petrifies outermost rocky layer (+32 Block)', durationSeconds: 13.0, move: 'golem_granite_skin' },
    { type: 'ATTACK', damage: 14, name: 'Crystal Barrage', description: 'Fires a spray of crystal shards', durationSeconds: 12.5, move: 'golem_crystal_barrage' },
  ],
  vault_guardian: [
    { type: 'ATTACK', damage: 18, name: 'Iron Cleaver', description: 'Reinforced mechanism slashes mechanically', durationSeconds: 11.5, move: 'vault_iron_cleaver' },
    { type: 'HEAVY_ATTACK', damage: 31, name: 'Core Discharge', description: 'Ancient mana reactor vents scorching steam', durationSeconds: 16.0, move: 'vault_core_discharge' },
    { type: 'DEFEND', damage: 0, block: 35, name: 'Aegis Lockdown', description: 'Bulwark plating locks tight (+35 Block)', durationSeconds: 13.0, move: 'vault_aegis_lockdown' },
    { type: 'ATTACK', damage: 15, name: 'Piston Slam', description: 'Hydraulic hammer shakes the vault', durationSeconds: 12.5, move: 'vault_piston_slam' },
  ],
  wraith: [
    { type: 'ATTACK', damage: 17, name: 'Soul Siphon', description: 'Drains vitality with spectral fingers', durationSeconds: 10.5, move: 'wraith_soul_siphon' },
    { type: 'HEAVY_ATTACK', damage: 29, name: 'Shadow Vortex', description: 'Swirling nether rift tears flesh', durationSeconds: 15.0, move: 'wraith_shadow_vortex' },
    { type: 'ATTACK', damage: 20, name: 'Death Chill', description: 'Freezing aura that halts breath', durationSeconds: 12.0, move: 'wraith_death_chill' },
    { type: 'HEAVY_ATTACK', damage: 25, name: 'Reaper\'s Scythe', description: 'A phantom scythe from the dark', durationSeconds: 14.0, move: 'wraith_reaper_scythe' },
  ],
  gargoyle: [
    { type: 'ATTACK', damage: 19, name: 'Gargoyle Talon', description: 'Chiseled stone talons shred mail', durationSeconds: 11.0, move: 'garg_talon' },
    { type: 'HEAVY_ATTACK', damage: 32, name: 'Rampart Dive', description: 'Crashes from high battlement with full weight', durationSeconds: 16.0, move: 'garg_rampart_dive' },
    { type: 'DEFEND', damage: 0, block: 30, name: 'Stone Form', description: 'Becomes living immovable granite (+30 Block)', durationSeconds: 12.5, move: 'garg_stone_form' },
    { type: 'ATTACK', damage: 16, name: 'Rubble Hurl', description: 'Rips masonry from the ramparts', durationSeconds: 12.5, move: 'garg_rubble_hurl' },
  ],
  dark_knight: [
    { type: 'ATTACK', damage: 20, name: 'Black Blade', description: 'Cursed broadsword cuts with shadow flame', durationSeconds: 11.5, move: 'dk_black_blade' },
    { type: 'HEAVY_ATTACK', damage: 34, name: 'Abyssal Cleave', description: 'Sweeping arc of doom through the line', durationSeconds: 16.5, move: 'dk_abyssal_cleave' },
    { type: 'DEFEND', damage: 0, block: 30, name: 'Dread Bastion', description: 'Raises onyx heater shield (+30 Block)', durationSeconds: 12.5, move: 'dk_dread_bastion' },
    { type: 'HEAVY_ATTACK', damage: 19, name: 'Shadow Step', description: 'Blinks around you, cutting from every side', durationSeconds: 14.0, move: 'dk_shadow_step' },
  ],
  minotaur: [
    { type: 'ATTACK', damage: 21, name: 'Horn Gore', description: 'Massive hooked horns sweep violently', durationSeconds: 11.5, move: 'mino_horn_gore' },
    { type: 'HEAVY_ATTACK', damage: 35, name: 'Labyrinth Charge', description: 'Unstoppable freight-train charge', durationSeconds: 16.5, move: 'mino_labyrinth_charge' },
    { type: 'ATTACK', damage: 23, name: 'War Club Crush', description: 'Spiked bludgeon hammers into the ground', durationSeconds: 13.0, move: 'mino_club_crush' },
    { type: 'ATTACK', damage: 24, name: 'Raging Bellow', description: 'A roar that brings the ceiling down', durationSeconds: 12.5, move: 'mino_bellow' },
  ],
  skeleton_knight: [
    { type: 'ATTACK', damage: 20, name: 'Dread Lance', description: 'Mounted thrust through armor plate', durationSeconds: 11.0, move: 'skknight_dread_lance' },
    { type: 'HEAVY_ATTACK', damage: 33, name: 'Phantom Trample', description: 'Spectral steed rides down the defender', durationSeconds: 15.5, move: 'skknight_phantom_trample' },
    { type: 'DEFEND', damage: 0, block: 28, name: 'Crest of Death', description: 'Shields in unholy sigils (+28 Block)', durationSeconds: 12.0, move: 'skknight_death_crest' },
    { type: 'ATTACK', damage: 17, name: 'Grave Hands', description: 'The dead claw up from the earth', durationSeconds: 12.5, move: 'skknight_grave_hands' },
  ],
  grave_colossus: [
    { type: 'ATTACK', damage: 22, name: 'Corpse Slam', description: 'Giant arm of stitched corpses pummels down', durationSeconds: 12.5, move: 'colossus_corpse_slam' },
    { type: 'HEAVY_ATTACK', damage: 36, name: 'Tomb Collapse', description: 'Crushes with the weight of ancient crypts', durationSeconds: 17.0, move: 'colossus_tomb_collapse' },
    { type: 'DEFEND', damage: 0, block: 36, name: 'Ossuary Bulwark', description: 'Bones coalesce to deflect strikes (+36 Block)', durationSeconds: 13.5, move: 'colossus_ossuary' },
    { type: 'ATTACK', damage: 17, name: 'Bile Torrent', description: 'Retches a stream of grave bile', durationSeconds: 12.5, move: 'colossus_bile' },
  ],
  void_prophet: [
    { type: 'ATTACK', damage: 21, name: 'Eldritch Sigil', description: 'Runes of madness detonate on impact', durationSeconds: 11.5, move: 'prophet_eldritch_sigil' },
    { type: 'HEAVY_ATTACK', damage: 35, name: 'Cosmic Rift', description: 'Opens a tear to the cold outer dark', durationSeconds: 16.0, move: 'prophet_cosmic_rift' },
    { type: 'DEFEND', damage: 0, block: 32, name: 'Singularity Ward', description: 'Gravity bends incoming force (+32 Block)', durationSeconds: 12.5, move: 'prophet_singularity' },
    { type: 'ATTACK', damage: 18, name: 'Void Tendrils', description: 'Tentacles of the outer dark burst forth', durationSeconds: 12.5, move: 'prophet_void_tendrils' },
  ],
  troll: [
    { type: 'ATTACK', damage: 22, name: 'Burl Club', description: 'Tree trunk club smashed horizontally', durationSeconds: 12.0, move: 'troll_burl_club' },
    { type: 'HEAVY_ATTACK', damage: 37, name: 'Berserk Flail', description: 'Flailing fists in berserk fury', durationSeconds: 17.0, move: 'troll_berserk_flail' },
    { type: 'DEFEND', damage: 0, block: 34, name: 'Flesh Regrowth', description: 'Toughens thick rubbery hide (+34 Block)', durationSeconds: 13.0, move: 'troll_regrowth' },
    { type: 'ATTACK', damage: 18, name: 'Boulder Toss', description: 'Hefts and hurls a mossy boulder', durationSeconds: 12.5, move: 'troll_boulder_toss' },
  ],
  bone_golem: [
    { type: 'ATTACK', damage: 23, name: 'Ossuary Strike', description: 'Cage of jagged ribs closes like teeth', durationSeconds: 12.0, move: 'bgolem_ossuary_strike' },
    { type: 'HEAVY_ATTACK', damage: 38, name: 'Bone Spire', description: 'Jagged bone spears pierce from below', durationSeconds: 16.5, move: 'bgolem_bone_spire' },
    { type: 'DEFEND', damage: 0, block: 38, name: 'Marrow Armor', description: 'Dense osseous shell solidifies (+38 Block)', durationSeconds: 13.0, move: 'bgolem_marrow_armor' },
    { type: 'ATTACK', damage: 18, name: 'Skull Cannon', description: 'Launches a salvo of burning skulls', durationSeconds: 12.5, move: 'bgolem_skull_cannon' },
  ],
  ancient_treant: [
    { type: 'ATTACK', damage: 23, name: 'Elder Bough', description: 'Century-old branch sweeps with crushing mass', durationSeconds: 12.5, move: 'treant_elder_bough' },
    { type: 'HEAVY_ATTACK', damage: 39, name: 'Forest Wrath', description: 'Earth ruptures with grasping ancient roots', durationSeconds: 17.5, move: 'treant_forest_wrath' },
    { type: 'DEFEND', damage: 0, block: 40, name: 'Ironwood Bark', description: 'Iron-hard outer bark absorbs all blows (+40 Block)', durationSeconds: 13.5, move: 'treant_ironwood' },
    { type: 'HEAVY_ATTACK', damage: 20, name: 'Acorn Meteor', description: 'Leaps and rains seed-pods like boulders', durationSeconds: 14.0, move: 'treant_seed_meteor' },
  ],
  crypt_lord: [
    { type: 'ATTACK', damage: 24, name: 'Lich Frostbolt', description: 'Black ice shard pierces vital organs', durationSeconds: 11.5, move: 'lich_frostbolt' },
    { type: 'HEAVY_ATTACK', damage: 41, name: 'Death Nova', description: 'Expanding ring of pure necrotic energy', durationSeconds: 16.5, move: 'lich_death_nova' },
    { type: 'DEFEND', damage: 0, block: 38, name: 'Phylactery Guard', description: 'Soul essence wards off physical harm (+38 Block)', durationSeconds: 13.0, move: 'lich_phylactery' },
    { type: 'HEAVY_ATTACK', damage: 22, name: 'Glacial Tomb', description: 'Entombs you in black ice, then shatters it', durationSeconds: 14.0, move: 'lich_glacial_tomb' },
  ],
  kraken: [
    { type: 'ATTACK', damage: 25, name: 'Tentacle Lash', description: 'Barbed sucker-covered arm whips hard', durationSeconds: 11.5, move: 'kraken_tentacle_lash' },
    { type: 'HEAVY_ATTACK', damage: 42, name: 'Maelstrom Crush', description: 'Drowns and crushes in an abyssal vortex', durationSeconds: 17.0, move: 'kraken_maelstrom' },
    { type: 'ATTACK', damage: 28, name: 'Ink Cloud', description: 'Corrosive black ink burns eyes and armor', durationSeconds: 13.5, move: 'kraken_ink_cloud' },
    { type: 'HEAVY_ATTACK', damage: 32, name: 'Tidal Crash', description: 'Rises and brings down a wall of water', durationSeconds: 14.0, move: 'kraken_tidal_crash' },
  ],
  demon_archbishop: [
    { type: 'ATTACK', damage: 26, name: 'Ash Liturgy', description: 'Chants incinerating unholy litanies', durationSeconds: 12.0, move: 'bishop_ash_liturgy' },
    { type: 'HEAVY_ATTACK', damage: 44, name: 'Profane Pillar', description: 'Sky-splitting beam of black solar fire', durationSeconds: 17.0, move: 'bishop_profane_pillar' },
    { type: 'DEFEND', damage: 0, block: 42, name: 'Inquisitor Aegis', description: 'Seal of the Ash Cathedral (+42 Block)', durationSeconds: 13.5, move: 'bishop_aegis' },
    { type: 'ATTACK', damage: 21, name: 'Brimstone Censer', description: 'Swings a censer of burning ash', durationSeconds: 12.5, move: 'bishop_brimstone_censer' },
  ],
  inferno_titan: [
    { type: 'ATTACK', damage: 27, name: 'Magma Hammer', description: 'Fist of liquid rock and volcanic slag', durationSeconds: 12.0, move: 'titan_magma_hammer' },
    { type: 'HEAVY_ATTACK', damage: 46, name: 'Apocalypse Flare', description: 'Ground splits open with sea of lava', durationSeconds: 17.5, move: 'titan_apocalypse' },
    { type: 'DEFEND', damage: 0, block: 45, name: 'Igneous Plate', description: 'Cooled obsidian shield (+45 Block)', durationSeconds: 14.0, move: 'titan_igneous' },
    { type: 'ATTACK', damage: 21, name: 'Skull Pyre', description: 'Burning skulls orbit, then launch', durationSeconds: 12.5, move: 'titan_skull_pyre' },
  ],
  dark_emperor: [
    { type: 'ATTACK', damage: 28, name: 'Imperial Slash', description: 'Sword of conquest cleaves with royal malice', durationSeconds: 12.0, move: 'emperor_imperial_slash' },
    { type: 'HEAVY_ATTACK', damage: 48, name: 'Sovereign Ruin', description: 'Summons executioner blade from the void', durationSeconds: 17.5, move: 'emperor_sovereign_ruin' },
    { type: 'DEFEND', damage: 0, block: 45, name: 'Crown of Shadows', description: 'Dark majesty repels mortal weapons (+45 Block)', durationSeconds: 13.5, move: 'emperor_crown_shadows' },
    { type: 'HEAVY_ATTACK', damage: 25, name: 'Legion of Ruin', description: 'Shadow knights charge at his command', durationSeconds: 14.0, move: 'emperor_shadow_legion' },
  ],
  magma_dragon: [
    { type: 'ATTACK', damage: 30, name: 'Tail Whip Flame', description: 'Massive spiked tail trailing molten sparks', durationSeconds: 12.0, move: 'dragon_tail_whip' },
    { type: 'HEAVY_ATTACK', damage: 52, name: 'Inferno Breath', description: 'Cataclysmic torrent of dragon fire', durationSeconds: 18.0, move: 'dragon_inferno_breath' },
    { type: 'DEFEND', damage: 0, block: 48, name: 'Dragon Scales', description: 'Ancient wyrm scales deflect weapons (+48 Block)', durationSeconds: 14.0, move: 'dragon_scales' },
    { type: 'HEAVY_ATTACK', damage: 26, name: 'Meteor Wings', description: 'Takes wing and rains molten rock', durationSeconds: 14.0, move: 'dragon_meteor_storm' },
  ],
  eldritch_horror: [
    { type: 'ATTACK', damage: 32, name: 'Tentacle Grasp', description: 'Writhing cosmic appendages squeeze reality', durationSeconds: 12.5, move: 'horror_tentacle_grasp' },
    { type: 'HEAVY_ATTACK', damage: 55, name: 'Cosmic Madness', description: 'Gaze into non-euclidean geometry of pure doom', durationSeconds: 18.5, move: 'horror_cosmic_madness' },
    { type: 'DEFEND', damage: 0, block: 50, name: 'Void Distortion', description: 'Warps local space-time (+50 Block)', durationSeconds: 14.0, move: 'horror_void_distortion' },
    { type: 'HEAVY_ATTACK', damage: 27, name: 'Abyssal Gaze', description: 'A searing beam from the eye beyond', durationSeconds: 14.0, move: 'horror_abyssal_gaze' },
  ],
  crypt_crawler: [
    { type: 'ATTACK', damage: 12, name: 'Mandible Pinch', description: 'Snapping razor jaws crunch down', durationSeconds: 10.5, move: 'crawler_mandible_pinch' },
    { type: 'HEAVY_ATTACK', damage: 20, name: 'Burrow Dash', description: 'Burrows underground and launches forward', durationSeconds: 15.0, move: 'crawler_burrow_dash' },
    { type: 'ATTACK', damage: 14, name: 'Acid Spurt', description: 'Spits corrosive digestive acid', durationSeconds: 11.5, move: 'crawler_acid_spurt' },
    { type: 'DEFEND', damage: 0, block: 22, name: 'Chitin Shell', description: 'Hardens thick carapace (+22 Block)', durationSeconds: 12.0, move: 'crawler_chitin_shell' },
  ],
  plague_rat: [
    { type: 'ATTACK', damage: 10, name: 'Frenzied Gnaw', description: 'Rabid flurry of diseased bites', durationSeconds: 9.5, move: 'rat_frenzied_gnaw' },
    { type: 'HEAVY_ATTACK', damage: 18, name: 'Plague Bite', description: 'Deep bite oozing black pestilence', durationSeconds: 14.0, move: 'rat_plague_bite' },
    { type: 'ATTACK', damage: 12, name: 'Filth Slash', description: 'Rakes jagged claws caked with venom', durationSeconds: 10.5, move: 'rat_filth_slash' },
  ],
  ember_serpent: [
    { type: 'ATTACK', damage: 16, name: 'Ember Strike', description: 'Dives forward with glowing fangs', durationSeconds: 11.0, move: 'serpent_ember_strike' },
    { type: 'ATTACK', damage: 18, name: 'Lava Spit', description: 'Hurls a molten ball of magma', durationSeconds: 12.5, move: 'serpent_lava_spit' },
    { type: 'HEAVY_ATTACK', damage: 26, name: 'Inferno Coil', description: 'Constricts in a searing vortex of flame', durationSeconds: 16.0, move: 'serpent_inferno_coil' },
  ],
  cinder_imp: [
    { type: 'ATTACK', damage: 14, name: 'Cinder Fireball', description: 'Lobs sputtering demonic brimstone', durationSeconds: 11.0, move: 'imp_cinder_fireball' },
    { type: 'ATTACK', damage: 12, name: 'Scorch Claw', description: 'Quick claw slash trailing red embers', durationSeconds: 9.5, move: 'imp_scorch_claw' },
    { type: 'HEAVY_ATTACK', damage: 22, name: 'Hellfire Eruption', description: 'Calls down a geyser of infernal flame', durationSeconds: 15.0, move: 'imp_hellfire_eruption' },
  ],
  thorn_stalker: [
    { type: 'ATTACK', damage: 14, name: 'Thorn Volley', description: 'Launches a barrage of barbed needles', durationSeconds: 11.0, move: 'stalker_thorn_volley' },
    { type: 'ATTACK', damage: 17, name: 'Bramble Lash', description: 'Whips spiked thorny tendril', durationSeconds: 12.5, move: 'stalker_bramble_lash' },
    { type: 'HEAVY_ATTACK', damage: 25, name: 'Needle Barrage', description: 'Furious spray of poisonous quills', durationSeconds: 16.0, move: 'stalker_needle_barrage' },
    { type: 'DEFEND', damage: 0, block: 24, name: 'Prickly Guard', description: 'Braces with defensive spine shield (+24 Block)', durationSeconds: 12.0, move: 'stalker_prickly_guard' },
  ],
  giant_crab: [
    { type: 'ATTACK', damage: 13, name: 'Pincer Snap', description: 'Snaps heavy claw with armor-shattering force', durationSeconds: 10.5, move: 'crab_pincer_snap' },
    { type: 'HEAVY_ATTACK', damage: 23, name: 'Crushing Clamp', description: 'Vice-like grip that grinds steel to dust', durationSeconds: 15.5, move: 'crab_crushing_clamp' },
    { type: 'ATTACK', damage: 11, name: 'Bubble Blast', description: 'Fires high-pressure caustic brine bubbles', durationSeconds: 10.0, move: 'crab_bubble_blast' },
    { type: 'DEFEND', damage: 0, block: 25, name: 'Chitin Guard', description: 'Shelters behind massive primary claw (+25 Block)', durationSeconds: 12.0, move: 'crab_chitin_guard' },
  ],
  sewer_lurker: [
    { type: 'ATTACK', damage: 17, name: 'Lure Strike', description: 'Bait globe flashes blinding light then lunges', durationSeconds: 12.0, move: 'lurker_lure_strike' },
    { type: 'HEAVY_ATTACK', damage: 28, name: 'Abyssal Bite', description: 'Enormous jaws close in a murky tidal wave', durationSeconds: 16.5, move: 'lurker_abyssal_bite' },
    { type: 'ATTACK', damage: 15, name: 'Sludge Belch', description: 'Vomits rancid toxic sewer waste', durationSeconds: 11.5, move: 'lurker_sludge_belch' },
  ],
  giant_beetle: [
    { type: 'ATTACK', damage: 15, name: 'Horn Toss', description: 'Gouging horn toss throws you backward', durationSeconds: 11.5, move: 'beetle_horn_toss' },
    { type: 'HEAVY_ATTACK', damage: 24, name: 'Chitin Slam', description: 'Full-body armored charge impact', durationSeconds: 15.0, move: 'beetle_chitin_slam' },
    { type: 'DEFEND', damage: 0, block: 28, name: 'Carapace Wall', description: 'Hardens wing cases into iron shield (+28 Block)', durationSeconds: 12.5, move: 'beetle_carapace_wall' },
  ],
  forest_bear: [
    { type: 'ATTACK', damage: 18, name: 'Crushing Swipe', description: 'Heavy paw swipe that caves in shields', durationSeconds: 12.0, move: 'bear_crushing_swipe' },
    { type: 'HEAVY_ATTACK', damage: 27, name: 'Grizzly Maul', description: 'Rears up and brings down crushing weight', durationSeconds: 16.0, move: 'bear_grizzly_maul' },
    { type: 'ATTACK', damage: 14, name: 'Territorial Roar', description: 'Intimidating deafening roar that shocks', durationSeconds: 11.0, move: 'bear_territorial_roar' },
  ],
  cultist_acolyte: [
    { type: 'ATTACK', damage: 14, name: 'Void Dagger', description: 'Quick thrust with a curved obsidian blade', durationSeconds: 10.5, move: 'acolyte_void_dagger' },
    { type: 'ATTACK', damage: 16, name: 'Eldritch Hex', description: 'Chants a curse of shadowy tendrils', durationSeconds: 12.0, move: 'acolyte_eldritch_hex' },
    { type: 'HEAVY_ATTACK', damage: 25, name: 'Sacrificial Blast', description: 'Channels dark pact into a concentrated blast', durationSeconds: 16.0, move: 'acolyte_sacrificial_blast' },
    { type: 'DEFEND', damage: 0, block: 22, name: 'Shadow Ward', description: 'Wraps self in shadowy ward (+22 Block)', durationSeconds: 11.5, move: 'acolyte_shadow_ward' },
  ],
  lantern_wisp: [
    { type: 'ATTACK', damage: 12, name: 'Soul Flame', description: 'Eerie blue will-o-wisp flings searing spirit fire', durationSeconds: 10.0, move: 'wisp_soul_flame' },
    { type: 'HEAVY_ATTACK', damage: 20, name: 'Spectral Burn', description: 'Bright cold flare that burns the life force', durationSeconds: 14.5, move: 'wisp_spectral_burn' },
    { type: 'DEFEND', damage: 0, block: 20, name: 'Spirit Veil', description: 'Fades partially into ethereal realm (+20 Block)', durationSeconds: 11.0, move: 'wisp_spirit_veil' },
  ],
  throne_guardian: [
    { type: 'ATTACK', damage: 22, name: 'Colossal Cleave', description: 'Sweeps an enormous stone slab blade', durationSeconds: 13.0, move: 'guardian_colossal_cleave' },
    { type: 'HEAVY_ATTACK', damage: 34, name: 'Throne Smash', description: 'Crushing overhead hammer blow shatters stone', durationSeconds: 17.5, move: 'guardian_throne_smash' },
    { type: 'DEFEND', damage: 0, block: 32, name: 'Obsidian Bulwark', description: 'Braces behind impenetrable dark steel (+32 Block)', durationSeconds: 13.0, move: 'guardian_obsidian_bulwark' },
  ],
  storm_crow: [
    { type: 'ATTACK', damage: 14, name: 'Dive Bomb', description: 'High-speed dive with outstretched talons', durationSeconds: 10.5, move: 'crow_dive_bomb' },
    { type: 'ATTACK', damage: 12, name: 'Tempest Screech', description: 'Harsh sonic caw summons shockwaves', durationSeconds: 10.0, move: 'crow_tempest_screech' },
    { type: 'HEAVY_ATTACK', damage: 22, name: 'Gale Slash', description: 'Wing beats razor wind blades into your chest', durationSeconds: 15.0, move: 'crow_gale_slash' },
  ],
  vault_hound: [
    { type: 'ATTACK', damage: 16, name: 'Vault Pounce', description: 'Steel-armored hound leaps with crushing weight', durationSeconds: 11.0, move: 'hound_vault_pounce' },
    { type: 'HEAVY_ATTACK', damage: 26, name: 'Iron Jaw', description: 'Crushes armor in reinforced steel teeth', durationSeconds: 15.5, move: 'hound_iron_jaw' },
    { type: 'ATTACK', damage: 18, name: 'Guard Frenzy', description: 'Savage guard dog rapid biting flurry', durationSeconds: 12.0, move: 'hound_guard_frenzy' },
  ],
  bard: [
    { type: 'ATTACK', damage: 14, name: 'Dissonant Chord', description: 'Strums a discordant ringing note that ruptures', durationSeconds: 11.0, move: 'bard_dissonant_chord' },
    { type: 'ATTACK', damage: 16, name: 'Cutting Ballad', description: 'Fierce flourish and concealed blade cut', durationSeconds: 12.0, move: 'bard_cutting_ballad' },
    { type: 'HEAVY_ATTACK', damage: 24, name: 'Cacophony', description: 'Deafening crescendo of sonic disruption', durationSeconds: 15.5, move: 'bard_cacophony' },
    { type: 'DEFEND', damage: 0, block: 22, name: 'Tempo Ward', description: 'Nimble footwork dances away (+22 Block)', durationSeconds: 11.5, move: 'bard_tempo_ward' },
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
