import { BattleMapId } from '../types/battle';

export interface CinematicScene {
  chapter: string;
  subtitle: string;
  text: string[];
  mood: 'former_glory' | 'ruin' | 'apex_terror' | 'iron_vow';
  image?: string;
}

export interface StageLore {
  mapId: BattleMapId;
  actTitle: string;
  actRoman: string;
  stageName: string;
  epithet: string;
  formerGlory: string;
  theRuin: string;
  apexTerror: string;
  penanceVow: string;
  scenes: CinematicScene[];
}

/**
 * The Comprehensive Dark Fantasy Chronicle of Kettlebell Knight.
 * Records the mythos, the origin of the curse of stagnation, and the ruin of each stage.
 */
export const STAGE_LORE: Record<BattleMapId, StageLore> = {
  VERDANT_FOREST: {
    mapId: 'VERDANT_FOREST',
    actTitle: 'ACT I: THE FESTERING PERIPHERY',
    actRoman: 'ACT I',
    stageName: 'VERDANT FOREST',
    epithet: 'The Weeping Woodlands',
    formerGlory:
      'Once known as the Emerald Cradle, these ancient pines were tended by sylvan guardians and revered as the living heart of the outer realm.',
    theRuin:
      'When the sacred iron bells fell silent, necrotic bile seeped through the root network. Wild beasts grew bloated and rabid upon the rot, while savage scavengers claimed the sacred groves.',
    apexTerror:
      'Apex: Troll Warlord — A moss-clad titan wielding an uprooted pine trunk, crushing any who seek to restore the ancient shrines.',
    penanceVow:
      'Grip the cold iron. Swing with rhythm through the damp loam until the rot shakes loose from the earth.',
    scenes: [
      {
        chapter: 'PROLOGUE: THE WEARY BOUGHS',
        subtitle: 'The Emerald Cradle Before the Fall',
        text: [
          'In the elder age, the Emerald Cradle sang with the rhythm of holy bells.',
          'Pilgrims walked shaded paths beneath golden boughs, undisturbed by claw or venom.',
          'Strength was honored here, rooted in the earth like the great pines of old.',
        ],
        mood: 'former_glory',
        image: '/assets/cinematics/verdant_forest/chapter1_glory.jpg',
      },
      {
        chapter: 'DESCENT: THE NECROTIC SEEP',
        subtitle: 'Why the Forest Lies in Ruin',
        text: [
          'When the Dark Sovereign cast down the consecrated bells, the stillness took hold.',
          'Without the ring of iron, stagnation curdled into poison deep within the soil.',
          'The gentle beasts bloated with black blood, and scavengers turned their fangs upon travelers.',
        ],
        mood: 'ruin',
        image: '/assets/cinematics/verdant_forest/chapter2_ruin.jpg',
      },
      {
        chapter: 'THE APEX: TROLL WARLORD',
        subtitle: 'Terror of the Sylvan Thickets',
        text: [
          'A monstrous moss-troll has uprooted the oldest pine in the cradle.',
          'Flanked by cackling goblins, he butchers all who remember the sunlit days.',
          'Only brute force and unbreakable discipline can fell this mountain of sinew.',
        ],
        mood: 'apex_terror',
        image: '/assets/cinematics/verdant_forest/chapter3_apex.jpg',
      },
      {
        chapter: 'THE SACRAMENT: CLEANSING IRON',
        subtitle: 'The Knight’s Burden',
        text: [
          'Lift the bell. Drive the hips forward. Let the wind of your swing shatter the stagnation.',
          'Step into the woods, Knight of the Bell. Reclaim the cradle.',
        ],
        mood: 'iron_vow',
        image: '/assets/cinematics/verdant_forest/chapter4_sacrament.jpg',
      },
    ],
  },

  DARK_FOREST: {
    mapId: 'DARK_FOREST',
    actTitle: 'ACT I: THE FESTERING PERIPHERY',
    actRoman: 'ACT I',
    stageName: 'DARK FOREST',
    epithet: 'The Corrupted Briars',
    formerGlory:
      'The Silverwood Glade, an enchanted sanctum of silver moss where druids communed with celestial stags under moonlit canopies.',
    theRuin:
      'A suffocating fungal blight choked the canopy, blotting out the sky. The weeping trees tore themselves from the earth as twisted treants, hunting anything that breathes.',
    apexTerror:
      'Apex: Ancient Treant — An ancient grove-father twisted into a weeping monstrosity of thorns, petrified bark, and toxic spores.',
    penanceVow:
      'Clean the weight to your chest. Let your lungs burn hot against the suffocating spores of the briars.',
    scenes: [
      {
        chapter: 'THE MEMORY: MOONLIT SANCTUARY',
        subtitle: 'The Silverwood in Starlight',
        text: [
          'Silver leaves once caught the pale moonlight like scattered coins of silver.',
          'Here the druids whispered to celestial stags, keeping vigil over the borders.',
          'Peace reigned so long as the sacred iron carillon anchored the night.',
        ],
        mood: 'former_glory',
      },
      {
        chapter: 'THE ROT: STRANGLING NIGHT',
        subtitle: 'The Briar Curse',
        text: [
          'Black fungal spores drifted from the citadel, choking the lungs of the woods.',
          'The trees groaned and warped, growing talons and weeping crimson sap.',
          'The celestial stags withered into skeletal nightmares with rotting antlers.',
        ],
        mood: 'ruin',
      },
      {
        chapter: 'THE APEX: ANCIENT TREANT',
        subtitle: 'The Weeping Grove-Father',
        text: [
          'Deep in the corrupted thicket looms the Ancient Treant.',
          'Its trunk is pierced with rusted iron and parasitic thorns that lash like whips.',
          'It weeps tears of boiling amber, crushing intruders into fertilizer for the dark.',
        ],
        mood: 'apex_terror',
      },
      {
        chapter: 'THE SACRAMENT: FIRE OF THE SOUL',
        subtitle: 'Ignite the Briars',
        text: [
          'Rack the bell. Stand tall against the clutching brambles.',
          'No vine can hold a spirit tempered in holy iron.',
        ],
        mood: 'iron_vow',
      },
    ],
  },

  TOWN_SQUARE: {
    mapId: 'TOWN_SQUARE',
    actTitle: 'ACT II: THE BESIEGED BOROUGHS',
    actRoman: 'ACT II',
    stageName: 'TOWN SQUARE',
    epithet: 'The Besieged Boroughs',
    formerGlory:
      'High Oakhaven Market, the vibrant crossroads of the kingdom where blacksmiths, guild masters, and minstrels filled the air with song and craft.',
    theRuin:
      'When the royal court withdrew behind high citadel walls, the outer city was left to starve. Desperation bred savagery; rogue sellswords and circus beasts slaughtered the stranded folk.',
    apexTerror:
      'Apex: Circus Rampage — An armored circus bear driven berserk by hunger, directed by a blood-drenched duelist minstrel.',
    penanceVow:
      'Press the iron overhead. Reclaim every cobblestone from the clutches of anarchy and despair.',
    scenes: [
      {
        chapter: 'CHRONICLE: THE GOLDEN MARKET',
        subtitle: 'The City of Bells and Guilds',
        text: [
          'Ten thousand feet once trod these cobblestones in prosperity.',
          'Guild banners snapped in the morning breeze; the great fountain ran pure and cold.',
          'Oakhaven was the jewel of the realm, proud and welcoming.',
        ],
        mood: 'former_glory',
      },
      {
        chapter: 'ABANDONMENT: THE CLOSED GATES',
        subtitle: 'When the Citadel Turned Away',
        text: [
          'As darkness approached, the sovereign iron gates slammed shut.',
          'The nobility sealed themselves in the heights, leaving common folk to starve.',
          'Minstrels went mad, tavern brawlers formed rabid gangs, and escaped beasts claimed the streets.',
        ],
        mood: 'ruin',
      },
      {
        chapter: 'THE APEX: CARNIVAL OF CARNAGE',
        subtitle: 'The Dancing Bear & The Mad Minstrel',
        text: [
          'In the center of the fountain square, a grotesque circus holds court.',
          'A colossal armored bear mauls survivors to the tune of a crazed bard’s lute.',
          'The music will not stop until their reign of madness is broken.',
        ],
        mood: 'apex_terror',
      },
      {
        chapter: 'THE SACRAMENT: RECLAIM THE STREETS',
        subtitle: 'The Knight’s Retribution',
        text: [
          'Plant your boots on the bloodied stone. Press the iron high into the grey sky.',
          'Silence the discordant strings with the clean ring of tempered steel.',
        ],
        mood: 'iron_vow',
      },
    ],
  },

  TOWN_NIGHT: {
    mapId: 'TOWN_NIGHT',
    actTitle: 'ACT II: THE BESIEGED BOROUGHS',
    actRoman: 'ACT II',
    stageName: 'TOWN SQUARE (NIGHT)',
    epithet: 'The Moonlit Slaughter',
    formerGlory:
      'Nightfall in Oakhaven was once warm with lantern light, tavern carols, and peaceful hearths.',
    theRuin:
      'Under the shroud of darkness, the streets belong to shadows, ghosts of the abandoned, and cutthroats prowling among corpses.',
    apexTerror:
      'Apex: The Midnight Minstrel & War Bear — A macabre duel of blades and fangs beneath the moon.',
    penanceVow:
      'Let your reps be the lantern that cuts through the nocturnal terror.',
    scenes: [
      {
        chapter: 'NIGHTFALL: THE DYING LANTERNS',
        subtitle: 'Darkness Over Oakhaven',
        text: [
          'When night falls over the abandoned city, no hearth fire burns.',
          'Only the glowing eyes of rabid strays and the cold gleam of burglar knives.',
        ],
        mood: 'ruin',
      },
      {
        chapter: 'THE TRIAL: PIERCE THE SHADOWS',
        subtitle: 'The Iron Torch',
        text: [
          'Swing the bell until the heat of your labor glows in the dark.',
          'Bring dawn back to Oakhaven with every resolute breath.',
        ],
        mood: 'iron_vow',
      },
    ],
  },

  SUNKEN_CISTERN: {
    mapId: 'SUNKEN_CISTERN',
    actTitle: 'ACT II: THE BESIEGED BOROUGHS',
    actRoman: 'ACT II',
    stageName: 'SUNKEN CISTERN',
    epithet: 'The Abyssal Sluices',
    formerGlory:
      'The Great Sluice of the Living Springs, a masterpiece of dwarven stonecraft channeling pure subterranean aqueducts to nourish the entire kingdom.',
    theRuin:
      'The lower floodgates collapsed into an oceanic void trench. Chthonic sludge and abyssal predators flooded the conduits, drowning the engineers and breeding monstrosities in the murk.',
    apexTerror:
      'Apex: Abyssal Kraken — A tentacled leviathan risen from the flooded abyss, coiling around aqueduct pillars and crushing stone to dust.',
    penanceVow:
      'Squat deep into the freezing flood. Stand firm against the undertow and smash the kraken’s beak.',
    scenes: [
      {
        chapter: 'THE WORK: THE LIVING WATERWAYS',
        subtitle: 'Engineering of the First Kings',
        text: [
          'Dwarven stonemasons carved these vaulted halls to channel the mountain tears.',
          'Vast bronze sluices once controlled the purest currents in the known world.',
          'The cistern was the kingdom’s lifegiving pulse, silent and dependable.',
        ],
        mood: 'former_glory',
      },
      {
        chapter: 'THE FLOOD: RIFT FROM THE TRENCH',
        subtitle: 'The Waters Turn Black',
        text: [
          'A tremor shattered the lowest floodgate, breaching an uncharted oceanic abyss.',
          'Corrosive black brine surged upward, drowning the overseers in their beds.',
          'Armored dredge-crabs and bioluminescent horrors nested in the stagnant sluices.',
        ],
        mood: 'ruin',
      },
      {
        chapter: 'THE APEX: TERROR OF THE DEEP',
        subtitle: 'The Abyssal Kraken Awakes',
        text: [
          'In the central reservoir churns the Abyssal Kraken.',
          'Its tentacles shatter ancient pillars; its gaze drags the unwary into the black fathom.',
          'It will drown the world above if its coils are not severed.',
        ],
        mood: 'apex_terror',
      },
      {
        chapter: 'THE SACRAMENT: STAND AGAINST THE TIDE',
        subtitle: 'Anchor the Foundation',
        text: [
          'Plant your heels into the silt. Squat against the weight of the water.',
          'Rise with the strength of the mountains that carved this stone.',
        ],
        mood: 'iron_vow',
      },
    ],
  },

  CATHEDRAL_CRYPT: {
    mapId: 'CATHEDRAL_CRYPT',
    actTitle: 'ACT III: THE NECROPOLIS & SEPULCHERS',
    actRoman: 'ACT III',
    stageName: 'CATHEDRAL CRYPT',
    epithet: 'The Osseous Sepulchers',
    formerGlory:
      'The Catacomb of the Iron Martyrs, where generations of holy knights and clerics were entombed in alabaster sepulchers under eternal blessed wards.',
    theRuin:
      'Necromantic frost ruptured the sacred seals. An exiled Lich Archmage awakened the dead, stripping their blessed souls and binding their skeletons into shrieking thralls of rust.',
    apexTerror:
      'Apex: Lich Archmage — Master of death and void frost, hovering over desecrated altars with soul-rending phylacteries.',
    penanceVow:
      'Snatch the kettlebell skyward. Let the resonant clang of iron shatter the cold sleep of the unhallowed dead.',
    scenes: [
      {
        chapter: 'THE HALLOWED: TOMBS OF THE SAINTS',
        subtitle: 'Where the Righteous Rested',
        text: [
          'These alabaster vaults were sealed with prayers of eternal quietude.',
          'Here lay the founders of the Order of the Bell, their iron weapons laid upon their chests.',
          'For centuries, holy incantations kept the shadows at bay.',
        ],
        mood: 'former_glory',
      },
      {
        chapter: 'DESECRATION: THE BROKEN SEALS',
        subtitle: 'The Lich’s Winter',
        text: [
          'An exiled archmage crept into the dark with black grimoires and frost-fire.',
          'He broke the white seals, forcing holy souls to inhabit rotten bone and rust.',
          'Now the martyrs weep as they strike at the living with rusted broadswords.',
        ],
        mood: 'ruin',
      },
      {
        chapter: 'THE APEX: ARCHMAGE OF ASH',
        subtitle: 'The Undying Sovereign of the Crypt',
        text: [
          'At the high mausoleum hovers the Lich Archmage.',
          'Surrounded by floating grimoires and skeletal cavaliers, he freezes the air to ice.',
          'His sorcery feeds upon fear and hesitation.',
        ],
        mood: 'apex_terror',
      },
      {
        chapter: 'THE SACRAMENT: DELIVER THE LIGHT',
        subtitle: 'Lay the Martyrs to Rest',
        text: [
          'Hike the weight between your knees and launch it heavenward.',
          'Let the thunder of your iron crack their false immortality.',
        ],
        mood: 'iron_vow',
      },
    ],
  },

  BLOOD_CEMETERY: {
    mapId: 'BLOOD_CEMETERY',
    actTitle: 'ACT III: THE NECROPOLIS & SEPULCHERS',
    actRoman: 'ACT III',
    stageName: 'BLOOD CEMETERY',
    epithet: 'The Weeping Mausoleums',
    formerGlory:
      'The Rose Garden of Mourning, a serene clifftop cemetery where red blooms grew over peaceful family graves under gentle autumn skies.',
    theRuin:
      'A blood-red eclipse opened a wound across the moon. The very earth began to bleed crimson ichor, fusing hundreds of rotting corpses into a towering Grave Colossus.',
    apexTerror:
      'Apex: Grave Colossus — An abhorrent amalgam of stone mausoleums, corpses, and grave chains that shakes the cliffs with every step.',
    penanceVow:
      'Heave the weight through the scarlet fog. Carry the burden of the dead until the colossus crumbles back to dust.',
    scenes: [
      {
        chapter: 'THE SERENITY: CLOUD AND PETAL',
        subtitle: 'The Gardens of Mourning',
        text: [
          'Families once brought fresh roses to these peaceful hillside terraces.',
          'The bells tolled softly from the chapel above, comforting the bereaved.',
          'Death was dignified, quiet, and sacred.',
        ],
        mood: 'former_glory',
      },
      {
        chapter: 'THE BLEEDING: THE CRIMSON MOON',
        subtitle: 'When the Sky Bled',
        text: [
          'The sky turned to coagulated blood as the moon wept scarlet light.',
          'Soil liquefied into crimson mire; coffins burst through shattered headstones.',
          'Grave dust and rotten marrow fused under an unnatural, malignant hunger.',
        ],
        mood: 'ruin',
      },
      {
        chapter: 'THE APEX: THE GRAVE COLOSSUS',
        subtitle: 'The Living Sepulcher',
        text: [
          'A titan woven of headstones, corpses, and iron chains rises from the earth.',
          'Each blow it strikes sends waves of necrotic gore tearing across the clifftop.',
          'It seeks to drag all living breath beneath its crushing bulk.',
        ],
        mood: 'apex_terror',
      },
      {
        chapter: 'THE SACRAMENT: HEAVY AND UNBOWED',
        subtitle: 'Overcome the Mass',
        text: [
          'Grip the handle with both palms. Hurl the iron into the beast’s rotting core.',
          'You carry the grief of a kingdom. Do not let it bend your spine.',
        ],
        mood: 'iron_vow',
      },
    ],
  },

  BELFRY_RAMPARTS: {
    mapId: 'BELFRY_RAMPARTS',
    actTitle: 'ACT IV: THE HIGH CITADEL & VAULTS',
    actRoman: 'ACT IV',
    stageName: 'BELFRY RAMPARTS',
    epithet: 'The Tempest Spires',
    formerGlory:
      'The High Carillon of the Citadel, whose monumental brass bells rang across seventy leagues to herald victory, dawn, and harvest festivals.',
    theRuin:
      'The bells were cast down by the Sovereign to silence truth. Howling tempests now scream across dizzying battlements where stone gargoyles animate to rip intruders from the parapets.',
    apexTerror:
      'Apex: Storm Vanguard — A lightning-infused champion soaring on tempest winds, wielding electrified lances against all challengers.',
    penanceVow:
      'Hold the rack position. Let hurricane winds lash your breastplate as you advance along the sheer cliff edge.',
    scenes: [
      {
        chapter: 'THE TOWER: THE VOICE OF THE REALM',
        subtitle: 'The Bells of Aethelgard',
        text: [
          'High above the clouds stood the Great Carillon of brass and electrum.',
          'When its bells rang, evil shrank away and courage filled the hearts of men.',
          'The ramparts were the shield of the kingdom, proud and unassailable.',
        ],
        mood: 'former_glory',
      },
      {
        chapter: 'THE SILENCE: THE BELLS CAST DOWN',
        subtitle: 'The Fall from the Clouds',
        text: [
          'The Dark Sovereign ordered the great bells thrown from their mounts.',
          'As they shattered on the rocks below, eternal storm clouds swallowed the towers.',
          'Gargoyles broke from their perches, ravenous for the flesh of the faithful.',
        ],
        mood: 'ruin',
      },
      {
        chapter: 'THE APEX: THE STORM VANGUARD',
        subtitle: 'The Sky-Born Executioner',
        text: [
          'At the apex of the ruined tower perches the Storm Vanguard.',
          'Wielding twin storm lances, he calls lightning from the boiling heavens.',
          'He fights with the fury of a hurricane that knows neither mercy nor fatigue.',
        ],
        mood: 'apex_terror',
      },
      {
        chapter: 'THE SACRAMENT: DEFY THE TEMPEST',
        subtitle: 'Stand Tall on the Precipice',
        text: [
          'Let the gale roar. Ground your stance like an iron pillar.',
          'Each rep calls down your own thunder. Break the vanguard’s wings.',
        ],
        mood: 'iron_vow',
      },
    ],
  },

  CATHEDRAL_VAULT: {
    mapId: 'CATHEDRAL_VAULT',
    actTitle: 'ACT IV: THE HIGH CITADEL & VAULTS',
    actRoman: 'ACT IV',
    stageName: 'CATHEDRAL VAULT',
    epithet: 'The Gilded Treasury',
    formerGlory:
      'The Sacred Reliquary of the Order, holding ancient covenant scrolls, star-metal ingots, and guardian clockwork knights designed to protect holy artifacts.',
    theRuin:
      'Consumed by paranoia and void whispers, the Chief Artificer locked the vault from within. Clockwork sentinels were reprogrammed into ruthless meat-grinders that butcher any who seek entry.',
    apexTerror:
      'Apex: Automaton Overlord — A colossal steam-and-brass juggernaut with rotating diamond saws and impervious runic plate.',
    penanceVow:
      'Iron against brass. Swing with explosive power to crush the clockwork gears that grind without a soul.',
    scenes: [
      {
        chapter: 'THE SANCTUARY: THE TREASURE OF SAINTS',
        subtitle: 'The Vault of Covenant',
        text: [
          'Here the wisdom and wealth of twelve dynasties were locked in golden chests.',
          'Master clocksmiths crafted mechanical guardians powered by solar crystals.',
          'They stood as silent, noble protectors of the kingdom’s greatest treasures.',
        ],
        mood: 'former_glory',
      },
      {
        chapter: 'THE PARANOIA: THE LOCKED TOMB',
        subtitle: 'The Artificer’s Madness',
        text: [
          'Whispers from the obsidian depths convinced the artificers that thieves came.',
          'They sealed the vault doors with molten lead and overwrote the automaton cores.',
          'Now razor gears turn eternally, turning bone to powder in the golden halls.',
        ],
        mood: 'ruin',
      },
      {
        chapter: 'THE APEX: AUTOMATON OVERLORD',
        subtitle: 'The Soulless Juggernaut',
        text: [
          'Before the master vault looms the Automaton Overlord.',
          'Steam hisses from its brass joints; its giant hammer pulverizes granite columns.',
          'It knows no pain, no fear, and no exhaustion.',
        ],
        mood: 'apex_terror',
      },
      {
        chapter: 'THE SACRAMENT: BONE OVER BRASS',
        subtitle: 'The Living Will',
        text: [
          'A machine knows only repetition without spirit. You possess living fire.',
          'Swing the bell until their springs shatter and their gears fly free.',
        ],
        mood: 'iron_vow',
      },
    ],
  },

  VOLCANIC_FORGE: {
    mapId: 'VOLCANIC_FORGE',
    actTitle: 'ACT V: THE CRUCIBLE & THE VOID',
    actRoman: 'ACT V',
    stageName: 'VOLCANIC FORGE',
    epithet: 'The Molten Caldera',
    formerGlory:
      'The Great Subterranean Hearth, where the First Bells were cast in primordial star-fire by master smiths whose hammer blows echoed like thunder.',
    theRuin:
      'The elemental ward ruptured, submerging the workshops in rivers of magma. The smiths burned into cinder fiends, and a primordial Magma Dragon claimed the molten caldera as its nest.',
    apexTerror:
      'Apex: Magma Dragon — An ancient leviathan of molten rock and obsidian scales, exhaling liquid brimstone.',
    penanceVow:
      'Step into the furnace. Push every rep through scorching heat; temper your will in dragon fire.',
    scenes: [
      {
        chapter: 'THE FORGE: WHERE BELLS WERE BORN',
        subtitle: 'The Hearth of the First Kings',
        text: [
          'Deep in the roots of the world, master smiths harnessed the earth’s blood.',
          'Here the sacred bells were hammered from fallen meteorites and blessed iron.',
          'Every swing of the hammer was a prayer; every quench a baptism of strength.',
        ],
        mood: 'former_glory',
      },
      {
        chapter: 'THE CATACLYSM: THE CALDERA BURSTS',
        subtitle: 'Flooded with Dragon’s Breath',
        text: [
          'When the realm’s anchor bells broke, the volcano’s binding wards shattered.',
          'Boiling basalt flooded the grand foundries, vaporizing the master smiths.',
          'From the magma depths crawled cinder imps and hellhounds to dance in the ashes.',
        ],
        mood: 'ruin',
      },
      {
        chapter: 'THE APEX: MAGMA DRAGON',
        subtitle: 'The Primordial Terror',
        text: [
          'Curled in the lake of boiling fire lies the Magma Dragon.',
          'Its wings churn brimstone ash; its breath melts tempered steel on contact.',
          'It guards the descent to the cosmic void with incinerating fury.',
        ],
        mood: 'apex_terror',
      },
      {
        chapter: 'THE SACRAMENT: TEMPER THE SOUL',
        subtitle: 'Become Unbreakable',
        text: [
          'In this furnace, ordinary steel melts. Only pure iron endures.',
          'Drive through the heat. Lift until your sweat boils. Slay the wyrm.',
        ],
        mood: 'iron_vow',
      },
    ],
  },

  ELDRITCH_ALTAR: {
    mapId: 'ELDRITCH_ALTAR',
    actTitle: 'ACT V: THE CRUCIBLE & THE VOID',
    actRoman: 'ACT V',
    stageName: 'ELDRITCH ALTAR',
    epithet: 'The Sacrificial Void Rift',
    formerGlory:
      'The High Astral Observatory, where scholar-astrologers charted celestial harmonies and kept communion with the benevolent stars.',
    theRuin:
      'Corrupted archbishops tore open the dimensional veil to summon non-euclidean elder deities. The temple now floats in a cosmic rift, driving all who look upon it to claw out their eyes.',
    apexTerror:
      'Apex: Eldritch Horror — A cosmic terror of writhing tentacles and weeping eyes that dissolves reality into static void.',
    penanceVow:
      'Anchor your mind to the physical weight of iron. In the face of madness, count every rep to stay tethered to existence.',
    scenes: [
      {
        chapter: 'THE OBSERVATORY: THE HARMONY OF STARS',
        subtitle: 'The Golden Astrolabe',
        text: [
          'Silver telescopes once peered into peaceful, orderly constellations.',
          'Monks chanted celestial hymns that aligned body, mind, and cosmos.',
          'The altar was a place of radiant truth and supreme enlightenment.',
        ],
        mood: 'former_glory',
      },
      {
        chapter: 'THE TEAR: THE EYES IN THE DARK',
        subtitle: 'The Veil Ripped Asunder',
        text: [
          'Mad high priests, desperate for forbidden knowledge, made human sacrifice.',
          'The astrolabe shattered, tearing a jagged scar into the void between stars.',
          'Monstrous cosmic geometry bled into reality, driving the clergy insane.',
        ],
        mood: 'ruin',
      },
      {
        chapter: 'THE APEX: THE ELDRITCH HORROR',
        subtitle: 'That Which Should Not Be',
        text: [
          'Pulsing at the rift center is an impossible entity of tentacles and void eyes.',
          'Its voice is a chorus of weeping souls; its aura bends distance and gravity.',
          'To look upon it is to invite madness; to fight it requires pure physical conviction.',
        ],
        mood: 'apex_terror',
      },
      {
        chapter: 'THE SACRAMENT: THE ANCHOR OF FLESH',
        subtitle: 'Defeat the Void with True Weight',
        text: [
          'The void denies all reality, but it cannot deny the weight in your hands.',
          'Every rep proves you exist. Every swing carves a scar into the abyss.',
        ],
        mood: 'iron_vow',
      },
    ],
  },

  OBSIDIAN_THRONE: {
    mapId: 'OBSIDIAN_THRONE',
    actTitle: 'ACT VI: THE RUINED SOVEREIGN',
    actRoman: 'ACT VI',
    stageName: 'OBSIDIAN THRONE',
    epithet: 'The Pinnacle of Despair',
    formerGlory:
      'The Throne of the Sun King, the highest seat of justice, honor, and sovereign duty, shining with white marble and golden standards.',
    theRuin:
      'The Dark Emperor struck a pact with the Void: to rid himself of all physical pain, labor, and mortality. In exchange, the kingdom atrophied into spiritual rot. His knights turned to obsidian glass.',
    apexTerror:
      'Final Battle: The Dark Emperor — The architect of the realm’s stagnation, wielding void lightning and the crushing gravity of absolute despair.',
    penanceVow:
      'Deliver the full weight of a weeping kingdom onto the emperor’s throne. Swing until the obsidian shatters.',
    scenes: [
      {
        chapter: 'THE PINNACLE: SEAT OF THE SUN',
        subtitle: 'The Throne of the Righteous',
        text: [
          'At the summit of the world sat the Sun King upon polished white marble.',
          'A covenant bound the monarch to his people: to bear the heaviest burden of all.',
          'Under his watchful gaze, the realm prospered for a thousand winters.',
        ],
        mood: 'former_glory',
      },
      {
        chapter: 'THE BETRAYAL: THE UNBURDENING',
        subtitle: 'The Origin of the Curse',
        text: [
          'The last emperor grew cowardly, terrified of sweat, age, and exertion.',
          'He made a pact with the Void: unburden him of toil, effort, and death.',
          'In doing so, he cursed the world to atrophy — a realm where nothing grows and nothing dies.',
        ],
        mood: 'ruin',
      },
      {
        chapter: 'THE SOVEREIGN: THE DARK EMPEROR',
        subtitle: 'Lord of the Stagnant Throne',
        text: [
          'He sits frozen upon a throne of jagged basalt and black glass.',
          'Surrounded by royal guards turned to obsidian statues, he commands void lightning.',
          'He believes effort is meaningless and that all things must surrender to rot.',
        ],
        mood: 'apex_terror',
      },
      {
        chapter: 'THE SACRAMENT: THE FINAL BURDEN',
        subtitle: 'Restore the Weight of the World',
        text: [
          'Step onto the dais. Raise the consecrated iron.',
          'Show the hollow king that through sweat, strain, and suffering, humanity is reborn.',
          'Break his throne. Cleanse the kingdom.',
        ],
        mood: 'iron_vow',
      },
    ],
  },
};

export function getStageLore(mapId: BattleMapId): StageLore {
  return STAGE_LORE[mapId] ?? STAGE_LORE.VERDANT_FOREST;
}
