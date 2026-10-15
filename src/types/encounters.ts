import type { BattleMapId, EncounterTemplate } from './battle';

/**
 * 11 Full Environment Encounter Stages.
 * Each stage features a pool of 10-12 distinct monsters / thematic variants
 * providing rich variety and natural atmospheric progression.
 */
export const ENCOUNTERS: EncounterTemplate[] = [
  // =========================================================================
  // STAGE 1: VERDANT FOREST (Wild Woodland, Level 4–8)
  // Background: VERDANT_FOREST
  // Pool: Boar, Goblin, Orc, Troll, Beetle, Bear, Wolf, Crow, Mushroom, Treemon, Field Rat, Bark Spider (12)
  // =========================================================================
  {
    id: 'verdant_forager',
    name: 'Field Forager',
    description: 'A small woodland rat rummaging through berry brambles.',
    map: 'VERDANT_FOREST',
    monsterIds: [{ id: 'plague_rat', name: 'FIELD FORAGER', title: 'WOODLAND PEST', tint: 0x8D6E63, scaleMultiplier: 0.85 }],
  },
  {
    id: 'verdant_boar',
    name: 'Razorback Charger',
    description: 'A wild boar scraping its razor tusks against mossy oaks.',
    map: 'VERDANT_FOREST',
    monsterIds: ['boar'],
  },
  {
    id: 'verdant_goblin',
    name: 'Goblin Scout',
    description: 'A stealthy goblin scout waving a jagged flint blade.',
    map: 'VERDANT_FOREST',
    monsterIds: ['goblin'],
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
      { id: 'giant_spider', name: 'BARK SPIDER', title: 'CANOPY LURKER', tint: 0x558B2F, outlineColor: 0x33691E },
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
    name: 'Grove Apex',
    description: 'A massive brown bear asserting dominion over the glade.',
    map: 'VERDANT_FOREST',
    monsterIds: ['forest_bear'],
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
    description: 'A towering moss troll brandishing an uprooted pine trunk.',
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
    name: 'Brood Weaver',
    description: 'A giant black spider descending from corrupted webs.',
    map: 'DARK_FOREST',
    monsterIds: ['giant_spider'],
  },
  {
    id: 'dark_thorn_stalker',
    name: 'Verdant Ambusher',
    description: 'A predatory bramble creature camouflaged in black thorns.',
    map: 'DARK_FOREST',
    monsterIds: ['thorn_stalker'],
  },
  {
    id: 'dark_rot_boar',
    name: 'Blighted Tusker',
    description: 'A diseased boar seeping caustic green blight fluids.',
    map: 'DARK_FOREST',
    monsterIds: [{ id: 'boar', name: 'BLIGHTED TUSKER', title: 'ROT BOAR', affix: 'TOXIC' }],
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
    description: 'A hooded cultist sacrificing essence to ancient tree roots.',
    map: 'DARK_FOREST',
    monsterIds: [
      { id: 'cultist_acolyte', name: 'BRIAR CULTIST', title: 'BLOODWOOD ZEALOT', skin: 'cooltist2', affix: 'VOID' },
      'ghost',
    ],
  },
  {
    id: 'dark_nightmare_stag',
    name: 'Nightmare Stag',
    description: 'An ethereal horned phantom galloping across the misty bog.',
    map: 'DARK_FOREST',
    monsterIds: ['nightmare_stag'],
  },
  {
    id: 'dark_dire_bear',
    name: 'Rabid Dire Bear',
    description: 'A mutated dark bear infused with unholy shadow vitality.',
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
    name: 'Cave Stalker',
    description: 'A leathery bat dropping silently from the arched crypt ceiling.',
    map: 'CATHEDRAL_CRYPT',
    monsterIds: ['bat'],
  },
  {
    id: 'crypt_filth_rat',
    name: 'Filth Carrier',
    description: 'A diseased rodent scuttling among ancient bones.',
    map: 'CATHEDRAL_CRYPT',
    monsterIds: ['plague_rat'],
  },
  {
    id: 'crypt_scuttler',
    name: 'Burrowing Scuttler',
    description: 'A multi-legged armored insect erupting from cracked stone floor.',
    map: 'CATHEDRAL_CRYPT',
    monsterIds: ['crypt_crawler'],
  },
  {
    id: 'crypt_undying_sentry',
    name: 'Undying Sentry',
    description: 'A reanimated skeleton guard clad in rusted mail.',
    map: 'CATHEDRAL_CRYPT',
    monsterIds: ['skeleton_warrior'],
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
    name: 'Tomb Weaver',
    description: 'A dusty pale spider spinning webs across an open sarcophagus.',
    map: 'CATHEDRAL_CRYPT',
    monsterIds: [
      { id: 'giant_spider', name: 'TOMB WEAVER', title: 'COFFIN BROOD', tint: 0xB0BEC5, outlineColor: 0x78909C },
      'crypt_crawler',
    ],
  },
  {
    id: 'crypt_corpse_ooze',
    name: 'Corpse Ooze',
    description: 'A putrid green sludge pool digesting decomposing remains.',
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
    name: 'Dread Cavalier',
    description: 'An elite armored skeleton knight clutching an executioner blade.',
    map: 'CATHEDRAL_CRYPT',
    monsterIds: ['skeleton_knight'],
  },
  {
    id: 'crypt_bone_monstrosity',
    name: 'Bone Monstrosity',
    description: 'A horrifying construct formed from dozens of fused skeletons.',
    map: 'CATHEDRAL_CRYPT',
    monsterIds: ['bone_golem', 'skeleton_warrior'],
  },
  {
    id: 'crypt_lich_archmage',
    name: 'Crypt Lich',
    description: 'The undying archmage weaving frost and necrotic decay.',
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
    name: 'Grave Stalker',
    description: 'A shadow wolf lurking near newly dug burial mounds.',
    map: 'BLOOD_CEMETERY',
    monsterIds: ['wolf'],
  },
  {
    id: 'cemetery_spectral_flame',
    name: 'Spectral Flame',
    description: 'A floating soul lantern drifting past weathered headstones.',
    map: 'BLOOD_CEMETERY',
    monsterIds: ['lantern_wisp'],
  },
  {
    id: 'cemetery_blood_bat',
    name: 'Vampiric Blood Bat',
    description: 'A crimson bat gorged on the blood of the unburied.',
    map: 'BLOOD_CEMETERY',
    monsterIds: [{ id: 'bat', name: 'VAMPIRIC BLOOD BAT', title: 'CRIMSON WING', tint: 0xEF5350, outlineColor: 0xB71C1C }],
  },
  {
    id: 'cemetery_carrion_pack',
    name: 'Carrion Pack',
    description: 'A dark carrion rat accompanied by a hungry shadow wolf.',
    map: 'BLOOD_CEMETERY',
    monsterIds: [
      { id: 'plague_rat', name: 'CARRION RAT', title: 'TOMB FEASTER', tint: 0x4E342E, outlineColor: 0x3E2723 },
      'wolf',
    ],
  },
  {
    id: 'cemetery_haunting_specter',
    name: 'Haunting Specter',
    description: 'A wailing ghost accompanied by an guiding spirit lantern.',
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
    description: 'A dark wizard performing reanimation rituals in the fog.',
    map: 'BLOOD_CEMETERY',
    monsterIds: [
      { id: 'dark_mage', name: 'GRAVE NECROMANCER', title: 'BONE CHANGER', affix: 'VOID' },
      'skeleton_warrior',
    ],
  },
  {
    id: 'cemetery_chilling_phantasm',
    name: 'Chilling Phantasm',
    description: 'A freezing wraith chilling the graveyard fog to sub-zero.',
    map: 'BLOOD_CEMETERY',
    monsterIds: ['wraith', 'ghost'],
  },
  {
    id: 'cemetery_black_cavalier',
    name: 'Black Cavalier',
    description: 'A noble skeleton knight guarding the ancestral mausoleum.',
    map: 'BLOOD_CEMETERY',
    monsterIds: ['skeleton_knight', 'lantern_wisp'],
  },
  {
    id: 'cemetery_grave_colossus',
    name: 'Grave Colossus',
    description: 'A titanic amalgamation of graveyard dirt, stone, and bone.',
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
    name: 'Dungeon Ooze',
    description: 'A corrosive green slime swimming in stagnant cistern water.',
    map: 'SUNKEN_CISTERN',
    monsterIds: ['green_slime'],
  },
  {
    id: 'cistern_sewer_rat',
    name: 'Sewer Rat',
    description: 'A wet, dripping rodent gnawing on rotten timber pipes.',
    map: 'SUNKEN_CISTERN',
    monsterIds: ['plague_rat'],
  },
  {
    id: 'cistern_tidal_crab',
    name: 'Tidal Pinch',
    description: 'A heavy armored crab brandishing bone-crushing claws.',
    map: 'SUNKEN_CISTERN',
    monsterIds: ['giant_crab'],
  },
  {
    id: 'cistern_mire_scuttler',
    name: 'Mire Scuttler',
    description: 'An aquatic insect chittering through dark flooded gutters.',
    map: 'SUNKEN_CISTERN',
    monsterIds: [
      { id: 'crypt_crawler', name: 'MIRE SCUTTLER', title: 'AQUATIC CHITIN', tint: 0x00838F, outlineColor: 0x006064 },
      'green_slime',
    ],
  },
  {
    id: 'cistern_lizard_skirmisher',
    name: 'Swamp Skirmisher',
    description: 'A swift lizardman tracker stalking submerged walkways.',
    map: 'SUNKEN_CISTERN',
    monsterIds: ['lizardman'],
  },
  {
    id: 'cistern_dredge_beetle',
    name: 'Dredge Beetle',
    description: 'A waterlogged armored beetle supported by a giant crab.',
    map: 'SUNKEN_CISTERN',
    monsterIds: [
      { id: 'giant_beetle', name: 'DREDGE BEETLE', title: 'WATERLOGGED CARAPACE', tint: 0x00695C, outlineColor: 0x004D40 },
      'giant_crab',
    ],
  },
  {
    id: 'cistern_water_elemental',
    name: 'Tidal Surge',
    description: 'A roaring elemental formed from swirling cistern torrents.',
    map: 'SUNKEN_CISTERN',
    monsterIds: ['water_elemental'],
  },
  {
    id: 'cistern_mud_troll',
    name: 'Mud Troll',
    description: 'A slimy swamp troll wielding an anchor-encrusted club.',
    map: 'SUNKEN_CISTERN',
    monsterIds: [
      { id: 'troll', name: 'MUD TROLL', title: 'SWAMP BRUTE', tint: 0x558B2F, outlineColor: 0x33691E },
      'green_slime',
    ],
  },
  {
    id: 'cistern_deep_cultist',
    name: 'Deep Cultist',
    description: 'An aquatic acolyte praying to the leviathan of the depths.',
    map: 'SUNKEN_CISTERN',
    monsterIds: [
      { id: 'cultist_acolyte', name: 'DEEP CULTIST', title: 'LEVIATHAN PRIEST', skin: 'cooltist1', affix: 'VOID' },
      'sewer_lurker',
    ],
  },
  {
    id: 'cistern_abyssal_deepjaw',
    name: 'Abyssal Deep-Jaw',
    description: 'A bioluminescent angler monstrosity rising from the deep.',
    map: 'SUNKEN_CISTERN',
    monsterIds: ['sewer_lurker'],
  },
  {
    id: 'cistern_kraken_terror',
    name: 'Abyssal Terror',
    description: 'The ancient kraken commanding waves and armored crustaceans.',
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
    name: 'Hellfire Pyromancer',
    description: 'A winged demon flinging burning embers and fiery sparks.',
    map: 'VOLCANIC_FORGE',
    monsterIds: ['cinder_imp'],
  },
  {
    id: 'forge_cinder_bat',
    name: 'Cinder Bat',
    description: 'A fire-imbued bat leaving smoke trails through the cavern.',
    map: 'VOLCANIC_FORGE',
    monsterIds: [{ id: 'bat', name: 'CINDER BAT', title: 'BLAZING FLIER', affix: 'FIRE' }],
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
    name: 'Pyroclastic Coil',
    description: 'A serpentine dragon woven from liquid magma and pumice.',
    map: 'VOLCANIC_FORGE',
    monsterIds: ['ember_serpent'],
  },
  {
    id: 'forge_scoria_beetle',
    name: 'Scoria Beetle',
    description: 'A basalt-armored beetle grazing on searing thermal vents.',
    map: 'VOLCANIC_FORGE',
    monsterIds: [{ id: 'giant_beetle', name: 'SCORIA BEETLE', title: 'HEATPROOF CARAPACE', tint: 0xFF5722, outlineColor: 0xBF360C }],
  },
  {
    id: 'forge_brimstone_boar',
    name: 'Brimstone Boar',
    description: 'A furious wild boar with glowing red tusks and scorched hide.',
    map: 'VOLCANIC_FORGE',
    monsterIds: [{ id: 'boar', name: 'BRIMSTONE BOAR', title: 'MOLTEN TUSK', affix: 'FIRE' }],
  },
  {
    id: 'forge_hellhound',
    name: 'Twin-Headed Beast',
    description: 'A terrifying two-headed hound breathing sulfurous hellfire.',
    map: 'VOLCANIC_FORGE',
    monsterIds: ['hellhound'],
  },
  {
    id: 'forge_ash_inquisitor',
    name: 'Ash Inquisitor',
    description: 'A demonic monk invoking columns of volcanic hellfire.',
    map: 'VOLCANIC_FORGE',
    monsterIds: [
      { id: 'demon_monk', name: 'ASH INQUISITOR', title: 'PYRO MONK', affix: 'FIRE' },
      'cinder_imp',
    ],
  },
  {
    id: 'forge_magma_golem',
    name: 'Magma Golem',
    description: 'A towering stone golem burning with internal molten heat.',
    map: 'VOLCANIC_FORGE',
    monsterIds: [
      { id: 'golem', name: 'MAGMA GOLEM', title: 'OBSIDIAN CORE', affix: 'FIRE' },
      'ember_serpent',
    ],
  },
  {
    id: 'forge_inferno_titan',
    name: 'Colossus of Flame',
    description: 'An ancient fire titan flanked by a ravenous hellhound.',
    map: 'VOLCANIC_FORGE',
    monsterIds: ['inferno_titan', 'hellhound'],
  },
  {
    id: 'forge_magma_dragon',
    name: 'Scorched Wyrm',
    description: 'The ancient magma dragon slumbering in the deepest caldera.',
    map: 'VOLCANIC_FORGE',
    monsterIds: ['magma_dragon'],
  },

  // =========================================================================
  // STAGE 7: BELFRY RAMPARTS (High Castle Walls & Parapets, Level 6–11)
  // Background: BELFRY_RAMPARTS
  // Pool: Dark Knight, Gargoyle, Harpy, Crow, Bat, Skele Archer, Skele Warrior, Vault Hound, Tempest Harpy, Storm Vanguard, Weathered Gargoyle, Rampart Duelist (12)
  // =========================================================================
  {
    id: 'belfry_flier',
    name: 'Belfry Flier',
    description: 'A cave bat swooping from beneath the bronze cathedral bells.',
    map: 'BELFRY_RAMPARTS',
    monsterIds: ['bat'],
  },
  {
    id: 'belfry_harbinger',
    name: 'Rampart Harbinger',
    description: 'A black crow cawing omens from the highest parapet stone.',
    map: 'BELFRY_RAMPARTS',
    monsterIds: ['storm_crow'],
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
    name: 'Stone Gargoyle',
    description: 'A living stone gargoyle peeling itself off the gothic tower.',
    map: 'BELFRY_RAMPARTS',
    monsterIds: ['gargoyle'],
  },
  {
    id: 'belfry_cliff_harpy',
    name: 'Cliff Harpy',
    description: 'A vicious winged harpy diving with razor-sharp talons.',
    map: 'BELFRY_RAMPARTS',
    monsterIds: ['harpy'],
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
    name: 'Rampart Duelist',
    description: 'A rogue fencing master balancing on the stone crenellations.',
    map: 'BELFRY_RAMPARTS',
    monsterIds: [{ id: 'bard', name: 'RAMPART DUELIST', title: 'FENCING ROGUE', skin: 'Color1_Normal' }],
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
    name: 'Fallen Champion',
    description: 'A disgraced dark knight holding the gatehouse against all foes.',
    map: 'BELFRY_RAMPARTS',
    monsterIds: ['dark_knight'],
  },
  {
    id: 'belfry_storm_vanguard',
    name: 'Storm Vanguard',
    description: 'An electrified dark knight leading an aerial strike squadron.',
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
    name: 'Ironfang Sentry',
    description: 'An armored guard dog barking echoes through the gold vaults.',
    map: 'CATHEDRAL_VAULT',
    monsterIds: ['vault_hound'],
  },
  {
    id: 'vault_weaver',
    name: 'Vault Weaver',
    description: 'A pale web spinner nesting above golden reliquary chests.',
    map: 'CATHEDRAL_VAULT',
    monsterIds: [
      { id: 'giant_spider', name: 'VAULT WEAVER', title: 'RAFTER STALKER', tint: 0xCFD8DC, outlineColor: 0x90A4AE },
      'vault_hound',
    ],
  },
  {
    id: 'vault_gilded_cavalier',
    name: 'Gilded Cavalier',
    description: 'An undying knight sworn to protect the sacred relics.',
    map: 'CATHEDRAL_VAULT',
    monsterIds: ['skeleton_knight'],
  },
  {
    id: 'vault_stone_colossus',
    name: 'Stone Colossus',
    description: 'An ancient earthen sentinel grinding to life to defend the gate.',
    map: 'CATHEDRAL_VAULT',
    monsterIds: ['golem'],
  },
  {
    id: 'vault_gargoyle_watch',
    name: 'Vault Gargoyle',
    description: 'A stone gargoyle perched atop a high gold vault pillar.',
    map: 'CATHEDRAL_VAULT',
    monsterIds: ['gargoyle', 'skeleton_knight'],
  },
  {
    id: 'vault_automaton',
    name: 'Armored Automaton',
    description: 'A clockwork guardian forged by ancient royal smiths.',
    map: 'CATHEDRAL_VAULT',
    monsterIds: ['vault_guardian'],
  },
  {
    id: 'vault_runic_golem',
    name: 'Runic Golem',
    description: 'An enchanted golem inscribed with glowing arcane protection runes.',
    map: 'CATHEDRAL_VAULT',
    monsterIds: [{ id: 'golem', name: 'RUNIC GOLEM', title: 'ENCHANTED SENTINEL', skin: 'ii', tint: 0x80D8FF, outlineColor: 0x0091EA }],
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
    description: 'A powerful sorcerer maintaining the vault magic wards.',
    map: 'CATHEDRAL_VAULT',
    monsterIds: [
      { id: 'dark_mage', name: 'ARCANE WARDEN', title: 'TREASURY ARCHMAGE', affix: 'VOID' },
      'vault_guardian',
    ],
  },
  {
    id: 'vault_horned_crusher',
    name: 'Labyrinth Minotaur',
    description: 'A furious horned beast guarding the winding vault corridors.',
    map: 'CATHEDRAL_VAULT',
    monsterIds: ['minotaur'],
  },
  {
    id: 'vault_sovereign_trio',
    name: 'Sovereign of Ruin',
    description: 'The dark emperor surveying his treasures alongside elite automata.',
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
    name: 'Forbidden Devotee',
    description: 'A hooded zealot chanting beside glowing purple runes.',
    map: 'ELDRITCH_ALTAR',
    monsterIds: ['cultist_acolyte'],
  },
  {
    id: 'altar_corrupted_priest',
    name: 'Corrupted Priest',
    description: 'A demonic monk channeling abyssal edicts through the floor.',
    map: 'ELDRITCH_ALTAR',
    monsterIds: ['demon_monk'],
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
    name: 'Corrupted Mage',
    description: 'A dark wizard weaving shadow projectiles through the rift.',
    map: 'ELDRITCH_ALTAR',
    monsterIds: ['dark_mage'],
  },
  {
    id: 'altar_void_phantom',
    name: 'Void Phantom',
    description: 'A chilling wraith manifested from beyond the event horizon.',
    map: 'ELDRITCH_ALTAR',
    monsterIds: ['wraith', 'cultist_acolyte'],
  },
  {
    id: 'altar_abyssal_fanatic',
    name: 'Abyssal Fanatic',
    description: 'An elite ritualist draped in ceremonially stained void silks.',
    map: 'ELDRITCH_ALTAR',
    monsterIds: [
      { id: 'cultist_acolyte', name: 'ABYSSAL FANATIC', title: 'RITUAL INITIATE', skin: 'cooltist2', affix: 'VOID' },
      'dark_mage',
    ],
  },
  {
    id: 'altar_astral_stag',
    name: 'Astral Stag',
    description: 'A cosmic stag whose antlers trace constellations in the void.',
    map: 'ELDRITCH_ALTAR',
    monsterIds: ['nightmare_stag'],
  },
  {
    id: 'altar_void_bone_amalgam',
    name: 'Void Bone Construct',
    description: 'A massive bone golem animated by purple cosmic energy.',
    map: 'ELDRITCH_ALTAR',
    monsterIds: [
      { id: 'bone_golem', name: 'ELDRITCH BONE AMALGAM', title: 'VILE CONSTRUCT', affix: 'VOID' },
      'wraith',
    ],
  },
  {
    id: 'altar_arch_prophet',
    name: 'Arch-Prophet of Void',
    description: 'The high herald chanting forbidden eldritch prophesies.',
    map: 'ELDRITCH_ALTAR',
    monsterIds: [
      { id: 'void_prophet', name: 'ARCH-PROPHET', title: 'VOICE OF THE DEEP', skin: 'elite', affix: 'VOID' },
      'demon_monk',
    ],
  },
  {
    id: 'altar_archbishop_ash',
    name: 'Archbishop of Ash',
    description: 'The high inquisitor sacrificing reality on the stone altar.',
    map: 'ELDRITCH_ALTAR',
    monsterIds: ['demon_archbishop', 'demon_monk'],
  },
  {
    id: 'altar_cthulhu_incarnate',
    name: 'Cthulhu Incarnate',
    description: 'The dread elder god breaking through the fragile dimensional veil.',
    map: 'ELDRITCH_ALTAR',
    monsterIds: ['eldritch_horror'],
  },

  // =========================================================================
  // STAGE 10: OBSIDIAN THRONE (The Sovereign Citadel, Level 10–18)
  // Background: OBSIDIAN_THRONE
  // Pool: Throne Guardian, Dark Emperor, Dark Knight, Archbishop, Dark Mage, Inferno Titan, Minotaur, Emperor Hound, Obsidian Gargoyle, Conqueror Colossus, Imperial Guard, Void Juggernaut (12)
  // =========================================================================
  {
    id: 'throne_imperial_hound',
    name: 'Emperor Hound',
    description: 'A ferocious war hound with blackened iron armor.',
    map: 'OBSIDIAN_THRONE',
    monsterIds: [{ id: 'vault_hound', name: 'EMPEROR HOUND', title: 'ROYAL WAR BEAST', tint: 0x424242, outlineColor: 0xC62828 }],
  },
  {
    id: 'throne_obsidian_gargoyle',
    name: 'Obsidian Gargoyles',
    description: 'Dark polished stone gargoyles guarding the throne pillars.',
    map: 'OBSIDIAN_THRONE',
    monsterIds: [
      { id: 'gargoyle', name: 'OBSIDIAN GARGOYLE', title: 'THRONE ROOST', tint: 0x263238, outlineColor: 0x37474F },
      { id: 'vault_hound', name: 'EMPEROR HOUND', title: 'ROYAL WAR BEAST', tint: 0x424242, outlineColor: 0xC62828 },
    ],
  },
  {
    id: 'throne_honor_guard',
    name: 'Imperial Honor Guard',
    description: 'An undying champion in royal obsidian plate armor.',
    map: 'OBSIDIAN_THRONE',
    monsterIds: [{ id: 'skeleton_knight', name: 'IMPERIAL HONOR GUARD', title: 'UNDYING PALADIN', tint: 0x455A64, outlineColor: 0x263238 }],
  },
  {
    id: 'throne_black_hand',
    name: 'Black Hand Vanguard',
    description: 'The supreme commander of the royal throne guard.',
    map: 'OBSIDIAN_THRONE',
    monsterIds: ['dark_knight'],
  },
  {
    id: 'throne_court_chancellor',
    name: 'Court Chancellor',
    description: 'The court sorcerer chanting behind an imperial paladin.',
    map: 'OBSIDIAN_THRONE',
    monsterIds: [
      'dark_mage',
      { id: 'skeleton_knight', name: 'IMPERIAL HONOR GUARD', title: 'UNDYING PALADIN', tint: 0x455A64, outlineColor: 0x263238 },
    ],
  },
  {
    id: 'throne_conqueror_colossus',
    name: 'Conqueror Colossus',
    description: 'A bone colossus assembled from the skeletons of defeated kings.',
    map: 'OBSIDIAN_THRONE',
    monsterIds: [{ id: 'bone_golem', name: 'CONQUEROR COLOSSUS', title: 'FUSED MONARCHS', tint: 0x37474F, outlineColor: 0x880E4F }],
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
    description: 'The demonic archbishop blessing the royal troops.',
    map: 'OBSIDIAN_THRONE',
    monsterIds: ['demon_archbishop', 'dark_knight'],
  },
  {
    id: 'throne_obsidian_juggernaut',
    name: 'Obsidian Juggernaut',
    description: 'An undying armored titan standing directly before the throne.',
    map: 'OBSIDIAN_THRONE',
    monsterIds: ['throne_guardian'],
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
    name: 'Alley Guttersnipe',
    description: 'A large rat foraging through overturned tavern trash barrels.',
    map: 'TOWN_SQUARE',
    monsterIds: ['plague_rat'],
  },
  {
    id: 'town_burglar',
    name: 'Town Thief',
    description: 'A shifty goblin burglar climbing down a baker shop chimney.',
    map: 'TOWN_SQUARE',
    monsterIds: ['goblin'],
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
    name: 'Tavern Brawler',
    description: 'A drunken orc mercenary smashing tavern tables into splinters.',
    map: 'TOWN_SQUARE',
    monsterIds: ['orc'],
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
    name: 'Clock Tower Specter',
    description: 'A weeping phantom haunting the town clock tower bells.',
    map: 'TOWN_NIGHT',
    monsterIds: ['ghost'],
  },
  {
    id: 'town_hedge_warlock',
    name: 'Hedge Warlock',
    description: 'A back-alley alchemist peddling forbidden curses and poisons.',
    map: 'TOWN_NIGHT',
    monsterIds: [
      { id: 'dark_mage', name: 'HEDGE WARLOCK', title: 'ALLEY ALCHEMIST', tint: 0x4A148C, outlineColor: 0x6A1B9A },
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
    name: 'Rogue Bard',
    description: 'A charismatic minstrel challenging all challengers to a musical duel.',
    map: 'TOWN_SQUARE',
    monsterIds: ['bard'],
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
    description: 'An enormous escaped circus bear smashing open fruit stalls.',
    map: 'TOWN_SQUARE',
    monsterIds: [
      { id: 'forest_bear', name: 'ESCAPED CIRCUS BEAR', title: 'MARKET CRUSHER', scaleMultiplier: 1.15 },
      'goblin',
    ],
  },
];
