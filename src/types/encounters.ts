import type { BattleMapId, EncounterTemplate } from './battle';

/**
 * 11 Full Environment Encounter Stages.
 * Every encounter has at least 2-3 monsters minimum.
 * Boss encounters always have 1 boss and 2 weaker minions.
 */
export const ENCOUNTERS: EncounterTemplate[] = [
  // =========================================================================
  // STAGE 1: VERDANT FOREST (Wild Woodland, Level 4–8)
  // Background: VERDANT_FOREST
  // Pool: Boar, Goblin, Orc, Troll, Beetle, Bear, Wolf, Crow, Mushroom, Treemon, Field Rat, Bark Spider (12)
  // =========================================================================
  {
    id: 'verdant_forager',
    name: 'Field Foragers',
    description: 'Woodland foraging rats accompanied by a watchful canopy crow.',
    map: 'VERDANT_FOREST',
    monsterIds: [
      { id: 'plague_rat', name: 'FIELD FORAGER', title: 'WOODLAND PEST', tint: 0xFAF5F0, outlineColor: 0x8D6E63, scaleMultiplier: 0.85 },
      'storm_crow',
    ],
  },
  {
    id: 'verdant_boar',
    name: 'Razorback & Forager',
    description: 'A wild boar scraping razor tusks beside a woodland forager.',
    map: 'VERDANT_FOREST',
    monsterIds: [
      'boar',
      { id: 'plague_rat', name: 'FIELD FORAGER', title: 'WOODLAND PEST', tint: 0xFAF5F0, outlineColor: 0x8D6E63, scaleMultiplier: 0.85 },
    ],
  },
  {
    id: 'verdant_goblin',
    name: 'Goblin Scouts',
    description: 'Two stealthy goblin scouts waving jagged flint blades.',
    map: 'VERDANT_FOREST',
    monsterIds: ['goblin', 'goblin'],
  },
  {
    id: 'verdant_timber_pack',
    name: 'Timber Wolf Pack',
    description: 'Two grey timber wolves hunting through the sunlit pines.',
    map: 'VERDANT_FOREST',
    monsterIds: ['wolf', 'wolf'],
  },
  {
    id: 'verdant_canopy',
    name: 'Canopy Ambusher',
    description: 'A green camouflaged bark spider dropping beside a nesting crow.',
    map: 'VERDANT_FOREST',
    monsterIds: [
      { id: 'giant_spider', name: 'BARK SPIDER', title: 'CANOPY LURKER', tint: 0xF1F8E9, outlineColor: 0x4CAF50 },
      'storm_crow',
    ],
  },
  {
    id: 'verdant_raiders',
    name: 'Forest Raiders',
    description: 'A savage orc brawler flanked by a sneaky goblin skirmisher.',
    map: 'VERDANT_FOREST',
    monsterIds: ['orc', 'goblin'],
  },
  {
    id: 'verdant_grove_apex',
    name: 'Grove Apex & Lookout',
    description: 'A massive brown bear asserting dominion, guided by a canopy crow.',
    map: 'VERDANT_FOREST',
    monsterIds: ['forest_bear', 'storm_crow'],
  },
  {
    id: 'verdant_sylvan_sentinels',
    name: 'Sylvan Sentinels',
    description: 'A living mossy treemon supported by a heavy iron beetle.',
    map: 'VERDANT_FOREST',
    monsterIds: ['treemon', 'giant_beetle'],
  },
  {
    id: 'verdant_spore_glade',
    name: 'Fungal Glade',
    description: 'A toxic woodland spore mushroom defended by a wild boar.',
    map: 'VERDANT_FOREST',
    monsterIds: ['mushroom', 'boar'],
  },
  {
    id: 'verdant_troll_warlord',
    name: 'Troll Warlord',
    description: 'A towering moss troll brandishing an uprooted pine trunk, flanked by goblin lackeys.',
    map: 'VERDANT_FOREST',
    monsterIds: ['troll', 'goblin', 'goblin'],
  },

  // =========================================================================
  // STAGE 2: DARK FOREST (Corrupted Woods & Briars, Level 5–14)
  // Background: DARK_FOREST
  // Pool: Treemon, Spider, Mushroom, Stag, Treant, Thorn Stalker, Wolf, Bat, Ghost, Rot Boar, Dire Bear, Briar Cultist (12)
  // =========================================================================
  {
    id: 'dark_brood_weaver',
    name: 'Brood Weaver & Flier',
    description: 'A giant black spider descending from corrupted webs beside a screeching cave bat.',
    map: 'DARK_FOREST',
    monsterIds: ['giant_spider', 'bat'],
  },
  {
    id: 'dark_thorn_stalker',
    name: 'Briar Ambush',
    description: 'A predatory bramble creature camouflaged in black thorns beside a toxic spore mushroom.',
    map: 'DARK_FOREST',
    monsterIds: ['thorn_stalker', 'mushroom'],
  },
  {
    id: 'dark_rot_boar',
    name: 'Blighted Tusker & Flier',
    description: 'A diseased boar seeping caustic green blight fluids, accompanied by a cave bat.',
    map: 'DARK_FOREST',
    monsterIds: [
      { id: 'boar', name: 'BLIGHTED TUSKER', title: 'ROT BOAR', affix: 'TOXIC' },
      'bat',
    ],
  },
  {
    id: 'dark_night_flier',
    name: 'Canopy Stalkers',
    description: 'Two cave bats roosting upside-down in hollow rotten trunks.',
    map: 'DARK_FOREST',
    monsterIds: ['bat', 'bat'],
  },
  {
    id: 'dark_shadow_prowlers',
    name: 'Shadow & Frost Wolves',
    description: 'A twilight shadow wolf stalking beside a frostbitten predator.',
    map: 'DARK_FOREST',
    monsterIds: [
      'wolf',
      { id: 'wolf', name: 'GLACIAL WOLF', title: 'FROSTBITE PREDATOR', affix: 'FROST' },
    ],
  },
  {
    id: 'dark_corrupted_spores',
    name: 'Poison Canopy',
    description: 'A purple spore mushroom and a stinging thorn stalker.',
    map: 'DARK_FOREST',
    monsterIds: ['mushroom', 'thorn_stalker'],
  },
  {
    id: 'dark_briar_cabal',
    name: 'Briar Cultist',
    description: 'A hooded cultist sacrificing essence to ancient tree roots alongside a weeping ghost.',
    map: 'DARK_FOREST',
    monsterIds: [
      { id: 'cultist_acolyte', name: 'BRIAR CULTIST', title: 'BLOODWOOD ZEALOT', skin: 'cooltist2', affix: 'VOID' },
      'ghost',
    ],
  },
  {
    id: 'dark_nightmare_stag',
    name: 'Nightmare Stag & Specter',
    description: 'An ethereal horned phantom galloping across the misty bog with a forest ghost.',
    map: 'DARK_FOREST',
    monsterIds: ['nightmare_stag', 'ghost'],
  },
  {
    id: 'dark_dire_bear',
    name: 'Rabid Dire Bear',
    description: 'A mutated dark bear infused with unholy shadow vitality, shadowed by a cave bat.',
    map: 'DARK_FOREST',
    monsterIds: [
      { id: 'forest_bear', name: 'DIRE BEAR', title: 'RABID APEX', affix: 'SHADOW' },
      'bat',
    ],
  },
  {
    id: 'dark_ancient_treant',
    name: 'Elder of the Grove',
    description: 'The colossal ancient treant surrounded by fungal guardians.',
    map: 'DARK_FOREST',
    monsterIds: ['ancient_treant', 'mushroom', 'mushroom'],
  },

  // =========================================================================
  // STAGE 3: CATHEDRAL CRYPT (Ancient Catacombs, Level 3–15)
  // Background: CATHEDRAL_CRYPT
  // Pool: Bat, Crypt Lord, Skele Archer, Skele Knight, Skele Warrior, Crawler, Rat, Bone Golem, Ghost, Wraith, Tomb Weaver, Corpse Ooze (12)
  // =========================================================================
  {
    id: 'crypt_cave_bat',
    name: 'Cave Stalkers',
    description: 'Two leathery bats dropping silently from the arched crypt ceiling.',
    map: 'CATHEDRAL_CRYPT',
    monsterIds: ['bat', 'bat'],
  },
  {
    id: 'crypt_filth_rat',
    name: 'Filth Swarm',
    description: 'Two diseased rodents scuttling among ancient sarcophagus bones.',
    map: 'CATHEDRAL_CRYPT',
    monsterIds: ['plague_rat', 'plague_rat'],
  },
  {
    id: 'crypt_scuttler',
    name: 'Burrowing Scuttlers',
    description: 'Two multi-legged armored insects erupting from cracked stone floor.',
    map: 'CATHEDRAL_CRYPT',
    monsterIds: ['crypt_crawler', 'crypt_crawler'],
  },
  {
    id: 'crypt_undying_sentry',
    name: 'Undying Patrol',
    description: 'A reanimated skeleton guard clad in rusted mail supported by a bone marksman.',
    map: 'CATHEDRAL_CRYPT',
    monsterIds: ['skeleton_warrior', 'skeleton_archer'],
  },
  {
    id: 'crypt_grave_marksmen',
    name: 'Crypt Marksmen',
    description: 'Two skeletal archers drawing bows from behind stone tombs.',
    map: 'CATHEDRAL_CRYPT',
    monsterIds: ['skeleton_archer', 'skeleton_archer'],
  },
  {
    id: 'crypt_tomb_weaver',
    name: 'Tomb Weaver & Scuttler',
    description: 'A dusty pale spider spinning webs across a sarcophagus beside a crypt crawler.',
    map: 'CATHEDRAL_CRYPT',
    monsterIds: [
      { id: 'giant_spider', name: 'TOMB WEAVER', title: 'COFFIN BROOD', tint: 0xF0F4F8, outlineColor: 0x78909C },
      'crypt_crawler',
    ],
  },
  {
    id: 'crypt_corpse_ooze',
    name: 'Corpse Ooze & Scavenger',
    description: 'A putrid green sludge pool digesting remains alongside a carrion rat.',
    map: 'CATHEDRAL_CRYPT',
    monsterIds: [
      { id: 'green_slime', name: 'CORPSE OOZE', title: 'NECROTIC BILE', affix: 'TOXIC' },
      'plague_rat',
    ],
  },
  {
    id: 'crypt_catacomb_patrol',
    name: 'Catacomb Watch',
    description: 'A skeleton footman backed by a deadly bone marksman.',
    map: 'CATHEDRAL_CRYPT',
    monsterIds: ['skeleton_warrior', 'skeleton_archer'],
  },
  {
    id: 'crypt_dread_cavalier',
    name: 'Dread Cavalier & Marksman',
    description: 'An elite armored skeleton knight clutching an executioner blade, backed by an archer.',
    map: 'CATHEDRAL_CRYPT',
    monsterIds: ['skeleton_knight', 'skeleton_archer'],
  },
  {
    id: 'crypt_bone_monstrosity',
    name: 'Bone Monstrosity',
    description: 'A horrifying construct formed from fused skeletons supported by a skeleton footman.',
    map: 'CATHEDRAL_CRYPT',
    monsterIds: ['bone_golem', 'skeleton_warrior'],
  },
  {
    id: 'crypt_lich_archmage',
    name: 'Crypt Lich',
    description: 'The undying archmage weaving frost and decay, flanked by skeletal guardians.',
    map: 'CATHEDRAL_CRYPT',
    monsterIds: ['crypt_lord', 'skeleton_archer', 'skeleton_warrior'],
  },

  // =========================================================================
  // STAGE 4: BLOOD CEMETERY (Bleeding Moon Graveyard, Level 5–13)
  // Background: BLOOD_CEMETERY
  // Pool: Wolf, Bone Golem, Ghost, Colossus, Wraith, Wisp, Skele Warrior, Skele Archer, Skele Knight, Blood Bat, Carrion Rat, Necromancer (12)
  // =========================================================================
  {
    id: 'cemetery_lone_predator',
    name: 'Grave Stalkers',
    description: 'A pair of shadow wolves lurking near newly dug burial mounds.',
    map: 'BLOOD_CEMETERY',
    monsterIds: ['wolf', 'wolf'],
  },
  {
    id: 'cemetery_spectral_flame',
    name: 'Spectral Flame & Ghost',
    description: 'A floating soul lantern drifting past weathered headstones beside a wailing ghost.',
    map: 'BLOOD_CEMETERY',
    monsterIds: ['lantern_wisp', 'ghost'],
  },
  {
    id: 'cemetery_blood_bat',
    name: 'Vampiric Blood Bat & Wisp',
    description: 'A crimson bat gorged on blood accompanied by a ghostly spirit lantern.',
    map: 'BLOOD_CEMETERY',
    monsterIds: [
      { id: 'bat', name: 'VAMPIRIC BLOOD BAT', title: 'CRIMSON WING', tint: 0xFFF1F0, outlineColor: 0xEF5350 },
      'lantern_wisp',
    ],
  },
  {
    id: 'cemetery_carrion_pack',
    name: 'Carrion Pack',
    description: 'A dark carrion rat accompanied by a hungry shadow wolf.',
    map: 'BLOOD_CEMETERY',
    monsterIds: [
      { id: 'plague_rat', name: 'CARRION RAT', title: 'TOMB FEASTER', tint: 0xFAF0EE, outlineColor: 0xA16207 },
      'wolf',
    ],
  },
  {
    id: 'cemetery_haunting_specter',
    name: 'Haunting Specter',
    description: 'A wailing ghost accompanied by a guiding spirit lantern.',
    map: 'BLOOD_CEMETERY',
    monsterIds: ['ghost', 'lantern_wisp'],
  },
  {
    id: 'cemetery_grave_risen',
    name: 'Grave Risen Footmen',
    description: 'Freshly unearthed skeletons marching under the red moon.',
    map: 'BLOOD_CEMETERY',
    monsterIds: ['skeleton_warrior', 'skeleton_archer'],
  },
  {
    id: 'cemetery_grave_necromancer',
    name: 'Grave Necromancer',
    description: 'A dark wizard performing reanimation rituals beside a raised skeleton.',
    map: 'BLOOD_CEMETERY',
    monsterIds: [
      { id: 'dark_mage', name: 'GRAVE NECROMANCER', title: 'BONE CHANGER', affix: 'VOID', scaleMultiplier: 1.4 },
      'skeleton_warrior',
    ],
  },
  {
    id: 'cemetery_chilling_phantasm',
    name: 'Chilling Phantasm',
    description: 'A freezing wraith chilling graveyard fog to sub-zero alongside a ghost.',
    map: 'BLOOD_CEMETERY',
    monsterIds: ['wraith', 'ghost'],
  },
  {
    id: 'cemetery_black_cavalier',
    name: 'Black Cavalier',
    description: 'A noble skeleton knight guarding the ancestral mausoleum beside a lantern wisp.',
    map: 'BLOOD_CEMETERY',
    monsterIds: ['skeleton_knight', 'lantern_wisp'],
  },
  {
    id: 'cemetery_grave_colossus',
    name: 'Grave Colossus',
    description: 'A titanic amalgamation of graveyard dirt, stone, and bone, escorted by bone archers.',
    map: 'BLOOD_CEMETERY',
    monsterIds: ['grave_colossus', 'skeleton_archer', 'skeleton_archer'],
  },

  // =========================================================================
  // STAGE 5: SUNKEN CISTERN (Flooded Aqueducts & Abyss, Level 5–16)
  // Background: SUNKEN_CISTERN
  // Pool: Slime, Kraken, Lizardman, Water Elemental, Crab, Sewer Lurker, Sewer Rat, Mire Scuttler, Dredge Beetle, Deep Cultist, Mud Troll, Aqua Shroom (12)
  // =========================================================================
  {
    id: 'cistern_ooze',
    name: 'Dungeon Oozes',
    description: 'Two corrosive green slimes swimming in stagnant cistern water.',
    map: 'SUNKEN_CISTERN',
    monsterIds: ['green_slime', 'green_slime'],
  },
  {
    id: 'cistern_sewer_rat',
    name: 'Sewer Rat & Ooze',
    description: 'A wet, dripping rodent gnawing rotten timber pipes beside a pool of green slime.',
    map: 'SUNKEN_CISTERN',
    monsterIds: ['plague_rat', 'green_slime'],
  },
  {
    id: 'cistern_tidal_crab',
    name: 'Tidal Pinch & Ooze',
    description: 'A heavy armored crab with bone-crushing claws, supported by caustic slime.',
    map: 'SUNKEN_CISTERN',
    monsterIds: ['giant_crab', 'green_slime'],
  },
  {
    id: 'cistern_mire_scuttler',
    name: 'Mire Scuttler',
    description: 'An aquatic insect chittering through dark flooded gutters beside green slime.',
    map: 'SUNKEN_CISTERN',
    monsterIds: [
      { id: 'crypt_crawler', name: 'MIRE SCUTTLER', title: 'AQUATIC CHITIN', tint: 0xECFEFF, outlineColor: 0x06B6D4 },
      'green_slime',
    ],
  },
  {
    id: 'cistern_lizard_skirmisher',
    name: 'Swamp Skirmishers',
    description: 'A swift lizardman tracker stalking submerged walkways alongside an armored crab.',
    map: 'SUNKEN_CISTERN',
    monsterIds: ['lizardman', 'giant_crab'],
  },
  {
    id: 'cistern_dredge_beetle',
    name: 'Dredge Beetle',
    description: 'A waterlogged armored beetle supported by a giant crab.',
    map: 'SUNKEN_CISTERN',
    monsterIds: [
      { id: 'giant_beetle', name: 'DREDGE BEETLE', title: 'WATERLOGGED CARAPACE', tint: 0xECFDF5, outlineColor: 0x10B981 },
      'giant_crab',
    ],
  },
  {
    id: 'cistern_water_elemental',
    name: 'Tidal Surge & Slime',
    description: 'A roaring elemental formed from swirling cistern torrents beside green ooze.',
    map: 'SUNKEN_CISTERN',
    monsterIds: ['water_elemental', 'green_slime'],
  },
  {
    id: 'cistern_mud_troll',
    name: 'Mud Troll',
    description: 'A slimy swamp troll wielding an anchor-encrusted club beside green slime.',
    map: 'SUNKEN_CISTERN',
    monsterIds: [
      { id: 'troll', name: 'MUD TROLL', title: 'SWAMP BRUTE', tint: 0xF1F8E9, outlineColor: 0x4CAF50 },
      'green_slime',
    ],
  },
  {
    id: 'cistern_deep_cultist',
    name: 'Deep Cultist',
    description: 'An aquatic acolyte praying to the leviathan beside an abyssal sewer lurker.',
    map: 'SUNKEN_CISTERN',
    monsterIds: [
      { id: 'cultist_acolyte', name: 'DEEP CULTIST', title: 'LEVIATHAN PRIEST', skin: 'cooltist1', affix: 'VOID' },
      'sewer_lurker',
    ],
  },
  {
    id: 'cistern_abyssal_deepjaw',
    name: 'Abyssal Deep-Jaw & Ooze',
    description: 'A bioluminescent angler monstrosity rising from the deep beside green slime.',
    map: 'SUNKEN_CISTERN',
    monsterIds: ['sewer_lurker', 'green_slime'],
  },
  {
    id: 'cistern_kraken_terror',
    name: 'Abyssal Terror',
    description: 'The ancient kraken commanding waves, escorted by an elemental and an armored crab.',
    map: 'SUNKEN_CISTERN',
    monsterIds: ['kraken', 'water_elemental', 'giant_crab'],
  },

  // =========================================================================
  // STAGE 6: VOLCANIC FORGE (Molten Caldera & Brimstone, Level 6–19)
  // Background: VOLCANIC_FORGE
  // Pool: Hellhound, Inferno Titan, Magma Dragon, Ember Serpent, Cinder Imp, Demon Archbishop, Magma Golem, Brimstone Boar, Cinder Bat, Ash Inquisitor, Scoria Beetle, Magma Sludge (12)
  // =========================================================================
  {
    id: 'forge_cinder_imp',
    name: 'Hellfire Pyromancers',
    description: 'Two winged demons flinging burning embers and fiery sparks.',
    map: 'VOLCANIC_FORGE',
    monsterIds: ['cinder_imp', 'cinder_imp'],
  },
  {
    id: 'forge_cinder_bat',
    name: 'Cinder Bat & Imp',
    description: 'A fire-imbued bat and cinder imp leaving smoke trails through the cavern.',
    map: 'VOLCANIC_FORGE',
    monsterIds: [
      { id: 'bat', name: 'CINDER BAT', title: 'BLAZING FLIER', affix: 'FIRE' },
      'cinder_imp',
    ],
  },
  {
    id: 'forge_magma_sludge',
    name: 'Magma Sludge',
    description: 'A boiling pool of living lava accompanied by a fire imp.',
    map: 'VOLCANIC_FORGE',
    monsterIds: [
      { id: 'green_slime', name: 'MAGMA SLUDGE', title: 'BUBBLING LAVA OOZE', affix: 'FIRE' },
      'cinder_imp',
    ],
  },
  {
    id: 'forge_ember_serpent',
    name: 'Pyroclastic Coil & Imp',
    description: 'A serpentine dragon woven from liquid magma escorted by a cinder imp.',
    map: 'VOLCANIC_FORGE',
    monsterIds: ['ember_serpent', 'cinder_imp'],
  },
  {
    id: 'forge_scoria_beetle',
    name: 'Scoria Beetle & Imp',
    description: 'A basalt-armored beetle grazing on thermal vents beside a fire imp.',
    map: 'VOLCANIC_FORGE',
    monsterIds: [
      { id: 'giant_beetle', name: 'SCORIA BEETLE', title: 'HEATPROOF CARAPACE', tint: 0xFF5722, outlineColor: 0xBF360C },
      'cinder_imp',
    ],
  },
  {
    id: 'forge_brimstone_boar',
    name: 'Brimstone Boar & Imp',
    description: 'A furious wild boar with glowing red tusks, accompanied by a fire imp.',
    map: 'VOLCANIC_FORGE',
    monsterIds: [
      { id: 'boar', name: 'BRIMSTONE BOAR', title: 'MOLTEN TUSK', affix: 'FIRE' },
      'cinder_imp',
    ],
  },
  {
    id: 'forge_hellhound',
    name: 'Twin-Headed Beast & Imp',
    description: 'A terrifying two-headed hound breathing sulfurous hellfire beside an imp.',
    map: 'VOLCANIC_FORGE',
    monsterIds: ['hellhound', 'cinder_imp'],
  },
  {
    id: 'forge_ash_inquisitor',
    name: 'Ash Inquisitor',
    description: 'A demonic monk invoking columns of volcanic hellfire beside a cinder imp.',
    map: 'VOLCANIC_FORGE',
    monsterIds: [
      { id: 'demon_monk', name: 'ASH INQUISITOR', title: 'PYRO MONK', affix: 'FIRE' },
      'cinder_imp',
    ],
  },
  {
    id: 'forge_magma_golem',
    name: 'Magma Golem',
    description: 'A towering stone golem burning with internal molten heat, flanked by an ember serpent.',
    map: 'VOLCANIC_FORGE',
    monsterIds: [
      { id: 'golem', name: 'MAGMA GOLEM', title: 'OBSIDIAN CORE', affix: 'FIRE' },
      'ember_serpent',
    ],
  },
  {
    id: 'forge_inferno_titan',
    name: 'Colossus of Flame',
    description: 'An ancient fire titan flanked by a ravenous hellhound and cinder imp.',
    map: 'VOLCANIC_FORGE',
    monsterIds: ['inferno_titan', 'hellhound', 'cinder_imp'],
  },
  {
    id: 'forge_magma_dragon',
    name: 'Scorched Wyrm & Imps',
    description: 'The ancient magma dragon slumbering in the deepest caldera, attended by cinder imps.',
    map: 'VOLCANIC_FORGE',
    monsterIds: ['magma_dragon', 'cinder_imp', 'cinder_imp'],
  },

  // =========================================================================
  // STAGE 7: BELFRY RAMPARTS (High Castle Walls & Parapets, Level 6–11)
  // Background: BELFRY_RAMPARTS
  // Pool: Dark Knight, Gargoyle, Harpy, Crow, Bat, Skele Archer, Skele Warrior, Vault Hound, Tempest Harpy, Storm Vanguard, Weathered Gargoyle, Rampart Duelist (12)
  // =========================================================================
  {
    id: 'belfry_flier',
    name: 'Belfry Flier & Crow',
    description: 'A cave bat and rampart crow swooping in tandem from beneath bronze cathedral bells.',
    map: 'BELFRY_RAMPARTS',
    monsterIds: ['bat', 'storm_crow'],
  },
  {
    id: 'belfry_harbinger',
    name: 'Rampart Harbingers',
    description: 'Two black crows cawing omens from the highest parapet stone.',
    map: 'BELFRY_RAMPARTS',
    monsterIds: ['storm_crow', 'storm_crow'],
  },
  {
    id: 'belfry_wall_patrol',
    name: 'Battlement Watch',
    description: 'A skeleton footman and archer patrolling the windy wall.',
    map: 'BELFRY_RAMPARTS',
    monsterIds: ['skeleton_warrior', 'skeleton_archer'],
  },
  {
    id: 'belfry_stone_gargoyle',
    name: 'Stone Gargoyle & Crow',
    description: 'A living stone gargoyle peeling itself off the gothic tower beside a watcher crow.',
    map: 'BELFRY_RAMPARTS',
    monsterIds: ['gargoyle', 'storm_crow'],
  },
  {
    id: 'belfry_cliff_harpy',
    name: 'Cliff Harpy & Bat',
    description: 'A vicious winged harpy diving with razor-sharp talons beside a swooping bat.',
    map: 'BELFRY_RAMPARTS',
    monsterIds: ['harpy', 'bat'],
  },
  {
    id: 'belfry_war_hound',
    name: 'Rampart War Dog',
    description: 'An armored castle hound and an archer guarding the gate.',
    map: 'BELFRY_RAMPARTS',
    monsterIds: ['vault_hound', 'skeleton_archer'],
  },
  {
    id: 'belfry_weathered_spire',
    name: 'Weathered Gargoyle',
    description: 'An ancient mossy gargoyle watching alongside a storm crow.',
    map: 'BELFRY_RAMPARTS',
    monsterIds: [
      { id: 'gargoyle', name: 'WEATHERED GARGOYLE', title: 'SPIRE DEFENDER', tint: 0x90A4AE, outlineColor: 0x455A64 },
      'storm_crow',
    ],
  },
  {
    id: 'belfry_duelist',
    name: 'Rampart Duelist & Crow',
    description: 'A rogue fencing master balancing on crenellations beside a trained crow.',
    map: 'BELFRY_RAMPARTS',
    monsterIds: [
      { id: 'bard', name: 'RAMPART DUELIST', title: 'FENCING ROGUE', skin: 'Color1_Normal' },
      'storm_crow',
    ],
  },
  {
    id: 'belfry_tempest_screecher',
    name: 'Tempest Screecher',
    description: 'A lightning-charged harpy and a stone gargoyle diving together.',
    map: 'BELFRY_RAMPARTS',
    monsterIds: [
      { id: 'harpy', name: 'TEMPEST HARPY', title: 'LIGHTNING SCREECHER', affix: 'STORM' },
      'gargoyle',
    ],
  },
  {
    id: 'belfry_fallen_champion',
    name: 'Fallen Champion & Archer',
    description: 'A disgraced dark knight holding the gatehouse supported by a skeleton archer.',
    map: 'BELFRY_RAMPARTS',
    monsterIds: ['dark_knight', 'skeleton_archer'],
  },
  {
    id: 'belfry_storm_vanguard',
    name: 'Storm Vanguard',
    description: 'An electrified dark knight leading an aerial strike squadron of harpy and gargoyle.',
    map: 'BELFRY_RAMPARTS',
    monsterIds: [
      { id: 'dark_knight', name: 'STORM VANGUARD', title: 'THUNDER CHAMPION', affix: 'STORM' },
      'harpy',
      'gargoyle',
    ],
  },

  // =========================================================================
  // STAGE 8: CATHEDRAL VAULT (Reliquary & Treasury, Level 10–18)
  // Background: CATHEDRAL_VAULT
  // Pool: Dark Emperor, Golem, Minotaur, Vault Guardian, Vault Hound, Throne Guardian, Dark Knight, Skele Knight, Gargoyle, Runic Golem, Arcane Warden, Vault Weaver (12)
  // =========================================================================
  {
    id: 'vault_sentry_hound',
    name: 'Ironfang Sentries',
    description: 'Two armored guard dogs barking echoes through the gold vaults.',
    map: 'CATHEDRAL_VAULT',
    monsterIds: ['vault_hound', 'vault_hound'],
  },
  {
    id: 'vault_weaver',
    name: 'Vault Weaver',
    description: 'A pale web spinner nesting above golden reliquary chests beside an iron hound.',
    map: 'CATHEDRAL_VAULT',
    monsterIds: [
      { id: 'giant_spider', name: 'VAULT WEAVER', title: 'RAFTER STALKER', tint: 0xCFD8DC, outlineColor: 0x90A4AE },
      'vault_hound',
    ],
  },
  {
    id: 'vault_gilded_cavalier',
    name: 'Gilded Cavalier & Hound',
    description: 'An undying knight sworn to protect relics, flanked by an iron hound.',
    map: 'CATHEDRAL_VAULT',
    monsterIds: ['skeleton_knight', 'vault_hound'],
  },
  {
    id: 'vault_stone_colossus',
    name: 'Stone Colossus & Hound',
    description: 'An ancient earthen sentinel grinding to life beside an armored hound.',
    map: 'CATHEDRAL_VAULT',
    monsterIds: ['golem', 'vault_hound'],
  },
  {
    id: 'vault_gargoyle_watch',
    name: 'Vault Gargoyle',
    description: 'A stone gargoyle perched atop a high gold vault pillar beside a skeleton knight.',
    map: 'CATHEDRAL_VAULT',
    monsterIds: ['gargoyle', 'skeleton_knight'],
  },
  {
    id: 'vault_automaton',
    name: 'Armored Automaton & Hound',
    description: 'A clockwork guardian forged by royal smiths escorted by an iron hound.',
    map: 'CATHEDRAL_VAULT',
    monsterIds: ['vault_guardian', 'vault_hound'],
  },
  {
    id: 'vault_runic_golem',
    name: 'Runic Golem & Gargoyle',
    description: 'An enchanted golem inscribed with glowing runes beside an observant gargoyle.',
    map: 'CATHEDRAL_VAULT',
    monsterIds: [
      { id: 'golem', name: 'RUNIC GOLEM', title: 'ENCHANTED SENTINEL', skin: 'ii', tint: 0x80D8FF, outlineColor: 0x0091EA },
      'gargoyle',
    ],
  },
  {
    id: 'vault_templar_patrol',
    name: 'Vault Templar',
    description: 'A dark knight and an iron hound patrolling the central treasure chamber.',
    map: 'CATHEDRAL_VAULT',
    monsterIds: ['dark_knight', 'vault_hound'],
  },
  {
    id: 'vault_arcane_warden',
    name: 'Arcane Warden',
    description: 'A powerful sorcerer maintaining the vault magic wards beside a vault automaton.',
    map: 'CATHEDRAL_VAULT',
    monsterIds: [
      { id: 'dark_mage', name: 'ARCANE WARDEN', title: 'TREASURY ARCHMAGE', affix: 'VOID' },
      'vault_guardian',
    ],
  },
  {
    id: 'vault_horned_crusher',
    name: 'Labyrinth Minotaur & Hound',
    description: 'A furious horned beast guarding the winding corridors beside an iron hound.',
    map: 'CATHEDRAL_VAULT',
    monsterIds: ['minotaur', 'vault_hound'],
  },
  {
    id: 'vault_sovereign_trio',
    name: 'Sovereign of Ruin',
    description: 'The dark emperor surveying his treasures alongside elite automata and an iron hound.',
    map: 'CATHEDRAL_VAULT',
    monsterIds: ['dark_emperor', 'vault_guardian', 'vault_hound'],
  },

  // =========================================================================
  // STAGE 9: ELDRITCH ALTAR (Sacrificial Void Rift, Level 9–20)
  // Background: ELDRITCH_ALTAR
  // Pool: Demon Monk, Dark Mage, Archbishop, Cthulhu, Void Prophet, Cultist Acolyte, Wraith, Ghost, Nightmare Stag, Abyssal Fanatic, Arch-Prophet, Void Bone Amalgam (12)
  // =========================================================================
  {
    id: 'altar_devotee',
    name: 'Forbidden Devotees',
    description: 'Two hooded zealots chanting beside glowing purple runes.',
    map: 'ELDRITCH_ALTAR',
    monsterIds: ['cultist_acolyte', 'cultist_acolyte'],
  },
  {
    id: 'altar_corrupted_priest',
    name: 'Corrupted Priest & Initiate',
    description: 'A demonic monk channeling abyssal edicts alongside a devoted acolyte.',
    map: 'ELDRITCH_ALTAR',
    monsterIds: ['demon_monk', 'cultist_acolyte'],
  },
  {
    id: 'altar_tormented_souls',
    name: 'Tormented Souls',
    description: 'Sacrificial ghosts swirling around a fanatical acolyte.',
    map: 'ELDRITCH_ALTAR',
    monsterIds: ['ghost', 'cultist_acolyte'],
  },
  {
    id: 'altar_shadow_caster',
    name: 'Corrupted Mage & Acolyte',
    description: 'A dark wizard weaving shadow projectiles beside a void acolyte.',
    map: 'ELDRITCH_ALTAR',
    monsterIds: ['dark_mage', 'cultist_acolyte'],
  },
  {
    id: 'altar_void_phantom',
    name: 'Void Phantom & Acolyte',
    description: 'A chilling wraith manifested from beyond the event horizon beside an acolyte.',
    map: 'ELDRITCH_ALTAR',
    monsterIds: ['wraith', 'cultist_acolyte'],
  },
  {
    id: 'altar_abyssal_fanatic',
    name: 'Abyssal Fanatic & Mage',
    description: 'An elite ritualist draped in ceremonially stained void silks beside a shadow sorcerer.',
    map: 'ELDRITCH_ALTAR',
    monsterIds: [
      { id: 'cultist_acolyte', name: 'ABYSSAL FANATIC', title: 'RITUAL INITIATE', skin: 'cooltist2', affix: 'VOID' },
      'dark_mage',
    ],
  },
  {
    id: 'altar_astral_stag',
    name: 'Astral Stag & Specter',
    description: 'A cosmic stag whose antlers trace constellations, accompanied by a void ghost.',
    map: 'ELDRITCH_ALTAR',
    monsterIds: ['nightmare_stag', 'ghost'],
  },
  {
    id: 'altar_void_bone_amalgam',
    name: 'Void Bone Construct',
    description: 'A massive bone golem animated by purple cosmic energy beside a chilling wraith.',
    map: 'ELDRITCH_ALTAR',
    monsterIds: [
      { id: 'bone_golem', name: 'ELDRITCH BONE AMALGAM', title: 'VILE CONSTRUCT', affix: 'VOID' },
      'wraith',
    ],
  },
  {
    id: 'altar_arch_prophet',
    name: 'Arch-Prophet of Void',
    description: 'The high herald chanting forbidden eldritch prophesies beside a demon monk.',
    map: 'ELDRITCH_ALTAR',
    monsterIds: [
      { id: 'void_prophet', name: 'ARCH-PROPHET', title: 'VOICE OF THE DEEP', skin: 'elite', affix: 'VOID' },
      'demon_monk',
    ],
  },
  {
    id: 'altar_archbishop_ash',
    name: 'Archbishop of Ash',
    description: 'The high inquisitor sacrificing reality on the stone altar beside an acolyte.',
    map: 'ELDRITCH_ALTAR',
    monsterIds: ['demon_archbishop', 'cultist_acolyte'],
  },
  {
    id: 'altar_cthulhu_incarnate',
    name: 'Cthulhu Incarnate & Cultists',
    description: 'The dread elder god breaking through the veil, flanked by fanatical cultist acolytes.',
    map: 'ELDRITCH_ALTAR',
    monsterIds: ['eldritch_horror', 'cultist_acolyte', 'cultist_acolyte'],
  },

  // =========================================================================
  // STAGE 10: OBSIDIAN THRONE (The Sovereign Citadel, Level 10–18)
  // Background: OBSIDIAN_THRONE
  // Pool: Throne Guardian, Dark Emperor, Dark Knight, Archbishop, Dark Mage, Inferno Titan, Minotaur, Emperor Hound, Obsidian Gargoyle, Conqueror Colossus, Imperial Guard, Void Juggernaut (12)
  // =========================================================================
  {
    id: 'throne_imperial_hound',
    name: 'Emperor Hounds',
    description: 'Two ferocious war hounds clad in blackened iron armor.',
    map: 'OBSIDIAN_THRONE',
    monsterIds: [
      { id: 'vault_hound', name: 'EMPEROR HOUND', title: 'ROYAL WAR BEAST', tint: 0xF1F5F9, outlineColor: 0xDC2626 },
      { id: 'vault_hound', name: 'EMPEROR HOUND', title: 'ROYAL WAR BEAST', tint: 0xF1F5F9, outlineColor: 0xDC2626 },
    ],
  },
  {
    id: 'throne_obsidian_gargoyle',
    name: 'Obsidian Gargoyles',
    description: 'Dark polished stone gargoyles guarding the throne pillars beside a war hound.',
    map: 'OBSIDIAN_THRONE',
    monsterIds: [
      { id: 'gargoyle', name: 'OBSIDIAN GARGOYLE', title: 'THRONE ROOST', tint: 0xF8FAFC, outlineColor: 0x475569 },
      { id: 'vault_hound', name: 'EMPEROR HOUND', title: 'ROYAL WAR BEAST', tint: 0xF1F5F9, outlineColor: 0xDC2626 },
    ],
  },
  {
    id: 'throne_honor_guard',
    name: 'Imperial Honor Guard & Hound',
    description: 'An undying champion in royal obsidian plate accompanied by an emperor hound.',
    map: 'OBSIDIAN_THRONE',
    monsterIds: [
      { id: 'skeleton_knight', name: 'IMPERIAL HONOR GUARD', title: 'UNDYING PALADIN', tint: 0xF1F5F9, outlineColor: 0x475569 },
      { id: 'vault_hound', name: 'EMPEROR HOUND', title: 'ROYAL WAR BEAST', tint: 0xF1F5F9, outlineColor: 0xDC2626 },
    ],
  },
  {
    id: 'throne_black_hand',
    name: 'Black Hand Vanguard & Hound',
    description: 'The supreme commander of the royal throne guard and his armored war hound.',
    map: 'OBSIDIAN_THRONE',
    monsterIds: [
      'dark_knight',
      { id: 'vault_hound', name: 'EMPEROR HOUND', title: 'ROYAL WAR BEAST', tint: 0xF1F5F9, outlineColor: 0xDC2626 },
    ],
  },
  {
    id: 'throne_court_chancellor',
    name: 'Court Chancellor',
    description: 'The court sorcerer chanting behind an imperial paladin.',
    map: 'OBSIDIAN_THRONE',
    monsterIds: [
      'dark_mage',
      { id: 'skeleton_knight', name: 'IMPERIAL HONOR GUARD', title: 'UNDYING PALADIN', tint: 0xF1F5F9, outlineColor: 0x475569 },
    ],
  },
  {
    id: 'throne_conqueror_colossus',
    name: 'Conqueror Colossus & Mage',
    description: 'A bone colossus assembled from defeated kings, supported by the court sorcerer.',
    map: 'OBSIDIAN_THRONE',
    monsterIds: [
      { id: 'bone_golem', name: 'CONQUEROR COLOSSUS', title: 'FUSED MONARCHS', tint: 0xFDF2F8, outlineColor: 0xDB2777 },
      'dark_mage',
    ],
  },
  {
    id: 'throne_royal_executioner',
    name: 'Royal Executioner',
    description: 'An enormous minotaur executioner and an elite black knight.',
    map: 'OBSIDIAN_THRONE',
    monsterIds: ['minotaur', 'dark_knight'],
  },
  {
    id: 'throne_imperial_inquisitor',
    name: 'Imperial Inquisitor',
    description: 'The demonic archbishop blessing the royal troops with dark knight guards.',
    map: 'OBSIDIAN_THRONE',
    monsterIds: ['demon_archbishop', 'dark_knight'],
  },
  {
    id: 'throne_obsidian_juggernaut',
    name: 'Obsidian Juggernaut & Hound',
    description: 'An undying armored titan and war hound standing directly before the throne.',
    map: 'OBSIDIAN_THRONE',
    monsterIds: [
      'throne_guardian',
      { id: 'vault_hound', name: 'EMPEROR HOUND', title: 'ROYAL WAR BEAST', tint: 0x424242, outlineColor: 0xC62828 },
    ],
  },
  {
    id: 'throne_court_behemoth',
    name: 'Court Behemoth',
    description: 'An inferno titan bound to the throne alongside the juggernaut.',
    map: 'OBSIDIAN_THRONE',
    monsterIds: ['inferno_titan', 'throne_guardian'],
  },
  {
    id: 'throne_dark_emperor_climax',
    name: 'The Sovereign of Ruin',
    description: 'The dark emperor seated on the throne flanked by his finest warriors.',
    map: 'OBSIDIAN_THRONE',
    monsterIds: ['dark_emperor', 'throne_guardian', 'dark_knight'],
  },

  // =========================================================================
  // STAGE 11: TOWN SQUARE & NIGHT (Besieged City, Level 3–11)
  // Background: TOWN_SQUARE / TOWN_NIGHT
  // Pool: Bard, Plague Rat, Goblin, Orc, Wolf, Skele Warrior, Ghost, Bat, Duelist Minstrel, Hedge Warlock, Street Zealot, Circus Bear (12)
  // =========================================================================
  {
    id: 'town_alley_rat',
    name: 'Alley Guttersnipes',
    description: 'Two large rats foraging through overturned tavern trash barrels.',
    map: 'TOWN_SQUARE',
    monsterIds: ['plague_rat', 'plague_rat'],
  },
  {
    id: 'town_burglar',
    name: 'Town Burglar & Rat',
    description: 'A shifty goblin burglar climbing down a chimney with a trained gutter rat.',
    map: 'TOWN_SQUARE',
    monsterIds: ['goblin', 'plague_rat'],
  },
  {
    id: 'town_rabid_stray',
    name: 'Alley Strays',
    description: 'A mangy street dog hunting alongside a diseased gutter rat.',
    map: 'TOWN_NIGHT',
    monsterIds: ['wolf', 'plague_rat'],
  },
  {
    id: 'town_rooftop_flier',
    name: 'Rooftop Prowlers',
    description: 'A cave bat swooping over an alley while a goblin loots.',
    map: 'TOWN_NIGHT',
    monsterIds: ['bat', 'goblin'],
  },
  {
    id: 'town_tavern_brawler',
    name: 'Tavern Brawler & Crony',
    description: 'A drunken orc mercenary and his goblin companion smashing tavern tables.',
    map: 'TOWN_SQUARE',
    monsterIds: ['orc', 'goblin'],
  },
  {
    id: 'town_chapel_risen',
    name: 'Churchyard Risen',
    description: 'Two unearthed skeletons walking through the chapel courtyard.',
    map: 'TOWN_NIGHT',
    monsterIds: ['skeleton_warrior', 'skeleton_warrior'],
  },
  {
    id: 'town_clock_ghost',
    name: 'Clock Tower Specter & Bat',
    description: 'A weeping phantom haunting the town clock tower bells beside a flitting bat.',
    map: 'TOWN_NIGHT',
    monsterIds: ['ghost', 'bat'],
  },
  {
    id: 'town_hedge_warlock',
    name: 'Hedge Warlock',
    description: 'A back-alley alchemist peddling forbidden curses alongside a sewer rat.',
    map: 'TOWN_NIGHT',
    monsterIds: [
      { id: 'dark_mage', name: 'HEDGE WARLOCK', title: 'ALLEY ALCHEMIST', outlineColor: 0x9333EA, aura: 'void' },
      'plague_rat',
    ],
  },
  {
    id: 'town_street_zealot',
    name: 'Street Zealot',
    description: 'A fanatical doomsday preacher rallying rioting orc brawlers.',
    map: 'TOWN_SQUARE',
    monsterIds: [
      { id: 'cultist_acolyte', name: 'STREET ZEALOT', title: 'DOOM PREACHER', skin: 'cooltist1', tint: 0x5D4037 },
      'orc',
    ],
  },
  {
    id: 'town_rogue_bard',
    name: 'Rogue Bard & Hound',
    description: 'A charismatic minstrel traveling with a trained attack hound.',
    map: 'TOWN_SQUARE',
    monsterIds: ['bard', 'wolf'],
  },
  {
    id: 'town_duelist_minstrel',
    name: 'Duelist Minstrel',
    description: 'A fencing rogue in fine silks accompanied by a trained attack dog.',
    map: 'TOWN_SQUARE',
    monsterIds: [
      { id: 'bard', name: 'DUELIST MINSTREL', title: 'HIGHWAY BLADE', skin: 'Color2_Normal' },
      'wolf',
    ],
  },
  {
    id: 'town_circus_rampage',
    name: 'Marketplace Rampage',
    description: 'An enormous escaped circus bear smashing open fruit stalls, pursued by goblin handlers.',
    map: 'TOWN_SQUARE',
    monsterIds: [
      { id: 'forest_bear', name: 'ESCAPED CIRCUS BEAR', title: 'MARKET CRUSHER', scaleMultiplier: 1.15 },
      'goblin',
      'goblin',
    ],
  },
];
