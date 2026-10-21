import { BattleMapId } from '../types/battle';
import { ASSET_ROOT } from '@/shared/assetRoot';

export interface CinematicScene {
  chapter: string;
  subtitle: string;
  text: string[];
  mood: 'former_glory' | 'ruin' | 'apex_terror' | 'legend' | 'iron_vow';
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
          'Pilgrims walked its shaded paths beneath golden boughs, and sylvan guardians rang iron at every shrine.',
          'So long as the bells kept ringing, the forest had nothing to fear.',
        ],
        mood: 'former_glory',
        image: `${ASSET_ROOT}/cinematics/verdant_forest/chapter1_glory.jpg`,
      },
      {
        chapter: 'DESCENT: THE NECROTIC SEEP',
        subtitle: 'Why the Forest Lies in Ruin',
        text: [
          'Then the Dark Sovereign cast down the consecrated bells, and the ringing stopped.',
          'In the silence, stagnation curdled into poison and seeped through the roots of every pine.',
          'The gentle beasts bloated with black blood, and the scavengers went looking for something larger to follow.',
        ],
        mood: 'ruin',
        image: `${ASSET_ROOT}/cinematics/verdant_forest/chapter2_ruin.jpg`,
      },
      {
        chapter: 'THE APEX: TROLL WARLORD',
        subtitle: 'Terror of the Sylvan Thickets',
        text: [
          'They found it in the Troll Warlord, a moss-clad titan who tore the oldest pine in the cradle from the earth.',
          'Now goblins cackle at his heels as he butchers all who remember the sunlit days.',
          'Brute force alone will not fell this mountain of sinew. It will take something older.',
        ],
        mood: 'apex_terror',
        image: `${ASSET_ROOT}/cinematics/verdant_forest/chapter3_apex.jpg`,
      },
      {
        chapter: 'THE LEGEND: THE SWORD IN THE STONE',
        subtitle: 'What the Old Pines Remember',
        text: [
          'The old pines remember it: a bell-hilted blade asleep in mossy granite. No arm has ever drawn it.',
          'The druids say the stone was never listening for arms. It listens for legs.',
          'Sink low and rise again beneath these pines, a hundred times and a hundred more, and one dusk the stone will rise from the moss to meet you.',
        ],
        mood: 'legend',
        image: `${ASSET_ROOT}/cinematics/verdant_forest/chapter5_legend.jpg`,
      },
      {
        chapter: 'THE SACRAMENT: CLEANSING IRON',
        subtitle: 'The Knight’s Burden',
        text: [
          'Until that dusk, the bells lie silent, and the ringing falls to you.',
          'Lift the bell. Drive the hips forward. Let the wind of your swing shatter the stagnation.',
          'Step into the woods, Knight of the Bell. Make the cradle sing again.',
        ],
        mood: 'iron_vow',
        image: `${ASSET_ROOT}/cinematics/verdant_forest/chapter4_sacrament.jpg`,
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
          'Deeper still lay the Silverwood, where silver leaves caught the moonlight like scattered coins.',
          'Here the druids whispered to celestial stags, keeping vigil over the borders of the realm.',
          'Their peace held only so long as the iron carillon of the citadel rang through the night.',
        ],
        mood: 'former_glory',
        image: `${ASSET_ROOT}/cinematics/dark_forest/chapter1_glory.jpg`,
      },
      {
        chapter: 'THE ROT: STRANGLING NIGHT',
        subtitle: 'The Briar Curse',
        text: [
          'When the carillon fell silent, black spores drifted down from the citadel and choked the lungs of the woods.',
          'The trees groaned and warped, growing talons and weeping crimson sap. The stags withered into skeletal nightmares.',
          'And the oldest tree of all began to move.',
        ],
        mood: 'ruin',
        image: `${ASSET_ROOT}/cinematics/dark_forest/chapter2_ruin.jpg`,
      },
      {
        chapter: 'THE APEX: ANCIENT TREANT',
        subtitle: 'The Weeping Grove-Father',
        text: [
          'The Ancient Treant was once the grove-father, the tree the druids knelt beneath.',
          'Now rusted iron and parasitic thorns pierce its trunk, and its vines lash like whips.',
          'It weeps boiling amber over every intruder, crushing them into fertilizer for the dark.',
        ],
        mood: 'apex_terror',
        image: `${ASSET_ROOT}/cinematics/dark_forest/chapter3_apex.jpg`,
      },
      {
        chapter: 'THE LEGEND: THE BLADE THAT WAITS',
        subtitle: 'Whispers Among the Briars',
        text: [
          'Yet the briars have not swallowed everything. Somewhere in the gloom, a sword of pale light still stands in its stone.',
          'A king who could no longer rise from his throne set it there, for those who still could.',
          'Squat deep in these woods, again and again. The stone is listening for knees that refuse to quit.',
        ],
        mood: 'legend',
        image: `${ASSET_ROOT}/cinematics/dark_forest/chapter5_legend.jpg`,
      },
      {
        chapter: 'THE SACRAMENT: FIRE OF THE SOUL',
        subtitle: 'Ignite the Briars',
        text: [
          'The druids are gone. No one is left to keep the vigil but you.',
          'Rack the bell. Stand tall against the clutching brambles, and let your lungs burn hotter than the spores.',
          'No vine can hold a spirit tempered in holy iron.',
        ],
        mood: 'iron_vow',
        image: `${ASSET_ROOT}/cinematics/dark_forest/chapter4_sacrament.jpg`,
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
          'Ten thousand feet once trod these cobblestones, and the market bell rang the guilds to their trade.',
          'Banners snapped in the morning breeze; minstrels played beside the great fountain while it ran pure and cold.',
          'High above, the citadel watched over Oakhaven like a father over a child.',
        ],
        mood: 'former_glory',
        image: `${ASSET_ROOT}/cinematics/town_square/chapter1_glory.jpg`,
      },
      {
        chapter: 'ABANDONMENT: THE CLOSED GATES',
        subtitle: 'When the Citadel Turned Away',
        text: [
          'But when the darkness came, the father shut the door. The citadel’s iron gates slammed closed.',
          'The nobles sealed themselves in the heights and left the common folk to starve below.',
          'Hunger bred savagery. Brawlers formed rabid gangs, the circus beasts broke their cages, and the minstrels went mad.',
        ],
        mood: 'ruin',
        image: `${ASSET_ROOT}/cinematics/town_square/chapter2_ruin.jpg`,
      },
      {
        chapter: 'THE APEX: CARNIVAL OF CARNAGE',
        subtitle: 'The Dancing Bear & The Mad Minstrel',
        text: [
          'The maddest of them now holds court in the fountain square where he once played for coins.',
          'Beside him, a colossal armored bear, starved berserk, mauls survivors to the tune of his lute.',
          'The music will not stop until someone breaks their reign of madness.',
        ],
        mood: 'apex_terror',
        image: `${ASSET_ROOT}/cinematics/town_square/chapter3_apex.jpg`,
      },
      {
        chapter: 'THE LEGEND: THE HIGH STRIKER',
        subtitle: 'A Carnival Game for Giants',
        text: [
          'The circus once brought joy. When the fair still came to Oakhaven, a striker stood in this square, and the mallet beside it was no toy.',
          'Only one swing in a hundred ever rang its bell. The showman never sold that mallet; he said it picks its owner.',
          'Swing hard in these streets, and swing often. Some night the lanterns will relight, and the bell will be waiting.',
        ],
        mood: 'legend',
        image: `${ASSET_ROOT}/cinematics/town_square/chapter5_legend.jpg`,
      },
      {
        chapter: 'THE SACRAMENT: RECLAIM THE STREETS',
        subtitle: 'The Knight’s Retribution',
        text: [
          'The citadel will not save these streets. The Knight of the Bell will.',
          'Plant your boots on the bloodied stone. Press the iron high into the grey sky.',
          'Drown out the mad lute with the clean ring of tempered steel.',
        ],
        mood: 'iron_vow',
        image: `${ASSET_ROOT}/cinematics/town_square/chapter4_sacrament.jpg`,
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
          'By day, Oakhaven bleeds. By night, it hunts.',
          'No hearth fire burns in the abandoned city, only the eyes of rabid strays and the cold gleam of cutthroat knives.',
          'And under the moon, the minstrel and his bear come out to dance again.',
        ],
        mood: 'ruin',
      },
      {
        chapter: 'THE LEGEND: THE STRIKER AT MIDNIGHT',
        subtitle: 'When the Lanterns Relight',
        text: [
          'Yet on certain nights, a phantom fair returns to the square: striped tents, a painted pole, a brass bell at its peak.',
          'It comes only for knights whose swings are heard across the rooftops.',
          'So swing like you mean to wake the dead. The louder the iron, the sooner the music starts.',
        ],
        mood: 'legend',
        image: `${ASSET_ROOT}/cinematics/town_square/chapter5_legend.jpg`,
      },
      {
        chapter: 'THE TRIAL: PIERCE THE SHADOWS',
        subtitle: 'The Iron Torch',
        text: [
          'Let that iron be your lantern too.',
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
          'Far beneath Oakhaven, dwarven stonemasons carved vaulted halls to channel the mountain’s tears.',
          'Vast bronze sluices carried the purest currents in the known world to every well and fountain above.',
          'And at the very bottom, one great floodgate held back whatever lay below.',
        ],
        mood: 'former_glory',
        image: `${ASSET_ROOT}/cinematics/sunken_cistern/chapter1_glory.jpg`,
      },
      {
        chapter: 'THE FLOOD: RIFT FROM THE TRENCH',
        subtitle: 'The Waters Turn Black',
        text: [
          'Then a tremor shattered that floodgate, and the cistern broke open into an uncharted ocean abyss.',
          'Corrosive black brine surged upward, drowning the overseers in their beds.',
          'Dredge-crabs and glowing horrors nested in the sluices. Something far larger followed them up.',
        ],
        mood: 'ruin',
        image: `${ASSET_ROOT}/cinematics/sunken_cistern/chapter2_ruin.jpg`,
      },
      {
        chapter: 'THE APEX: TERROR OF THE DEEP',
        subtitle: 'The Abyssal Kraken Awakes',
        text: [
          'Now the Abyssal Kraken churns in the central reservoir.',
          'Its tentacles shatter the dwarven pillars; its gaze drags the unwary into the black fathom.',
          'If its coils are not severed, it will drown the world above.',
        ],
        mood: 'apex_terror',
        image: `${ASSET_ROOT}/cinematics/sunken_cistern/chapter3_apex.jpg`,
      },
      {
        chapter: 'THE LEGEND: THE DROWNED ANCHOR',
        subtitle: 'Chained Beneath the Black Water',
        text: [
          'The first kings foresaw such a tide. They sank an anchor at the heart of the cistern to hold the waters still, and its chain still hangs from the vault.',
          'The tide drags it ever downward, and the tide never tires.',
          'Row the iron here, low and hard, until your back burns. Haul enough, and one day the chain will drift within your reach.',
        ],
        mood: 'legend',
        image: `${ASSET_ROOT}/cinematics/sunken_cistern/chapter5_legend.jpg`,
      },
      {
        chapter: 'THE SACRAMENT: STAND AGAINST THE TIDE',
        subtitle: 'Anchor the Foundation',
        text: [
          'What the floodgate could not hold back, you must.',
          'Plant your heels into the silt. Squat against the weight of the water.',
          'Rise with the strength of the mountains that carved this stone.',
        ],
        mood: 'iron_vow',
        image: `${ASSET_ROOT}/cinematics/sunken_cistern/chapter4_sacrament.jpg`,
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
          'Beneath the cathedral, alabaster vaults were sealed with prayers of eternal quietude.',
          'Here lay the founders of the Order of the Bell, their iron weapons laid upon their chests.',
          'For centuries, holy wards kept the shadows at bay, and the martyrs slept without dreaming.',
        ],
        mood: 'former_glory',
        image: `${ASSET_ROOT}/cinematics/cathedral_crypt/chapter1_glory.jpg`,
      },
      {
        chapter: 'DESECRATION: THE BROKEN SEALS',
        subtitle: 'The Lich’s Winter',
        text: [
          'Until an exiled archmage crept into the dark with black grimoires and frost-fire.',
          'He broke the white seals, forcing holy souls back into rotten bone and rust.',
          'Now the martyrs weep as they strike at the living with the broadswords they were buried with.',
        ],
        mood: 'ruin',
        image: `${ASSET_ROOT}/cinematics/cathedral_crypt/chapter2_ruin.jpg`,
      },
      {
        chapter: 'THE APEX: ARCHMAGE OF ASH',
        subtitle: 'The Undying Sovereign of the Crypt',
        text: [
          'Their master hovers above the high mausoleum: the Lich Archmage, who has made himself undying.',
          'Surrounded by floating grimoires and skeletal cavaliers, he freezes the air to ice.',
          'His sorcery feeds upon fear and hesitation, and the crypt has given him plenty of both.',
        ],
        mood: 'apex_terror',
        image: `${ASSET_ROOT}/cinematics/cathedral_crypt/chapter3_apex.jpg`,
      },
      {
        chapter: 'THE LEGEND: THE LAST VIGIL',
        subtitle: 'The Censer That Never Went Out',
        text: [
          'But his winter has not reached everywhere. In the deepest chapel, one censer still swings above a ring of candles that must never go dark.',
          'Through the long cold, the martyrs kept them lit by passing iron around their waists, hour upon hour.',
          'Pass the iron in these halls, round and round. The candles remember the motion, and they will call you to keep the vigil.',
        ],
        mood: 'legend',
        image: `${ASSET_ROOT}/cinematics/cathedral_crypt/chapter5_legend.jpg`,
      },
      {
        chapter: 'THE SACRAMENT: DELIVER THE LIGHT',
        subtitle: 'Lay the Martyrs to Rest',
        text: [
          'The martyrs held the light this long. Carry it the rest of the way.',
          'Hike the weight between your knees and launch it heavenward.',
          'Let the thunder of your iron crack his false immortality, and lay the martyrs to rest.',
        ],
        mood: 'iron_vow',
        image: `${ASSET_ROOT}/cinematics/cathedral_crypt/chapter4_sacrament.jpg`,
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
          'Families once brought fresh roses to these peaceful clifftop terraces.',
          'The bells tolled softly from the chapel above, comforting the bereaved.',
          'Death was dignified, quiet, and sacred, until the night the moon turned red.',
        ],
        mood: 'former_glory',
        image: `${ASSET_ROOT}/cinematics/blood_cemetery/chapter1_glory.jpg`,
      },
      {
        chapter: 'THE BLEEDING: THE CRIMSON MOON',
        subtitle: 'When the Sky Bled',
        text: [
          'That night, an eclipse opened a wound across the sky, and the moon wept scarlet light.',
          'The soil liquefied into crimson mire; coffins burst through shattered headstones.',
          'Grave dust and rotten marrow ran together under a malignant hunger, and began to take shape.',
        ],
        mood: 'ruin',
        image: `${ASSET_ROOT}/cinematics/blood_cemetery/chapter2_ruin.jpg`,
      },
      {
        chapter: 'THE APEX: THE GRAVE COLOSSUS',
        subtitle: 'The Living Sepulcher',
        text: [
          'What rose from the mire was the Grave Colossus, a titan of headstones, corpses, and iron chains.',
          'Each blow it strikes sends waves of necrotic gore tearing across the clifftop.',
          'It will not rest until every living breath lies buried beneath its bulk.',
        ],
        mood: 'apex_terror',
        image: `${ASSET_ROOT}/cinematics/blood_cemetery/chapter3_apex.jpg`,
      },
      {
        chapter: 'THE LEGEND: THE PALLBEARER’S GRAVE',
        subtitle: 'A Coffin No Six Could Carry',
        text: [
          'Not every grave gave up its dead. Beneath the red moon lies a coffin too heavy for six pallbearers, buried with its weapon still inside.',
          'The gravediggers swear it stirs for whoever lifts the most from the earth, back straight, hips driving, again and again.',
          'Pull the dead weight up from this soil. When the eclipse comes, the grave will open for you. Only once.',
        ],
        mood: 'legend',
        image: `${ASSET_ROOT}/cinematics/blood_cemetery/chapter5_legend.jpg`,
      },
      {
        chapter: 'THE SACRAMENT: HEAVY AND UNBOWED',
        subtitle: 'Overcome the Mass',
        text: [
          'Lift for the graves that cannot lift themselves.',
          'Grip the handle with both palms. Hurl the iron into the beast’s rotting core.',
          'You carry the grief of a kingdom. Do not let it bend your spine.',
        ],
        mood: 'iron_vow',
        image: `${ASSET_ROOT}/cinematics/blood_cemetery/chapter4_sacrament.jpg`,
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
          'High above the clouds stood the Great Carillon of Aethelgard, cast in brass and electrum.',
          'When its bells rang across seventy leagues, evil shrank away and courage filled every heart that heard them.',
          'It was the voice of the realm, and the Dark Sovereign wanted it silenced.',
        ],
        mood: 'former_glory',
        image: `${ASSET_ROOT}/cinematics/belfry_ramparts/chapter1_glory.jpg`,
      },
      {
        chapter: 'THE SILENCE: THE BELLS CAST DOWN',
        subtitle: 'The Fall from the Clouds',
        text: [
          'So he ordered the great bells thrown from their mounts.',
          'As they shattered on the rocks below, storm clouds swallowed the towers and never lifted.',
          'Gargoyles broke from their perches, ravenous for the faithful, and a champion of the storm took the heights.',
        ],
        mood: 'ruin',
        image: `${ASSET_ROOT}/cinematics/belfry_ramparts/chapter2_ruin.jpg`,
      },
      {
        chapter: 'THE APEX: THE STORM VANGUARD',
        subtitle: 'The Sky-Born Executioner',
        text: [
          'The Storm Vanguard now perches at the peak of the ruined tower.',
          'Wielding twin storm lances, he calls lightning from the boiling heavens.',
          'He fights with the fury of a hurricane that knows neither mercy nor fatigue.',
        ],
        mood: 'apex_terror',
        image: `${ASSET_ROOT}/cinematics/belfry_ramparts/chapter3_apex.jpg`,
      },
      {
        chapter: 'THE LEGEND: THE GREAT BELL',
        subtitle: 'It Tolls With the Storm',
        text: [
          'Yet one bell escaped the Sovereign. The greatest bell of Aethelgard still hangs alone above the ramparts, and only thunder rings it.',
          'The old bell-wardens learned to snatch their iron skyward in time with the lightning.',
          'Snatch the bell here, high and fast, rep after rep. The storm will hear your rhythm, and then it will test it.',
        ],
        mood: 'legend',
        image: `${ASSET_ROOT}/cinematics/belfry_ramparts/chapter5_legend.jpg`,
      },
      {
        chapter: 'THE SACRAMENT: DEFY THE TEMPEST',
        subtitle: 'Stand Tall on the Precipice',
        text: [
          'Let it test you. Let the gale roar, and ground your stance like an iron pillar.',
          'Each rep calls down your own thunder. Break the vanguard’s wings, and give the realm back its voice.',
        ],
        mood: 'iron_vow',
        image: `${ASSET_ROOT}/cinematics/belfry_ramparts/chapter4_sacrament.jpg`,
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
          'Deep beneath the citadel, the wisdom and wealth of twelve dynasties lay locked in golden chests.',
          'Master clocksmiths built mechanical guardians, powered by solar crystals, to watch over them.',
          'They stood as silent, noble protectors, obedient to every word their makers spoke.',
        ],
        mood: 'former_glory',
        image: `${ASSET_ROOT}/cinematics/cathedral_vault/chapter1_glory.jpg`,
      },
      {
        chapter: 'THE PARANOIA: THE LOCKED TOMB',
        subtitle: 'The Artificer’s Madness',
        text: [
          'So when whispers from the obsidian depths turned their makers’ minds, the guardians obeyed those too.',
          'Convinced that thieves were coming, the artificers sealed the doors with molten lead and rewrote every automaton core.',
          'Now razor gears turn without end, grinding bone to powder in the golden halls.',
        ],
        mood: 'ruin',
        image: `${ASSET_ROOT}/cinematics/cathedral_vault/chapter2_ruin.jpg`,
      },
      {
        chapter: 'THE APEX: AUTOMATON OVERLORD',
        subtitle: 'The Soulless Juggernaut',
        text: [
          'Before the master vault looms the greatest of their works: the Automaton Overlord.',
          'Steam hisses from its brass joints; its giant hammer pulverizes granite columns.',
          'It knows no pain, no fear, and no exhaustion.',
        ],
        mood: 'apex_terror',
        image: `${ASSET_ROOT}/cinematics/cathedral_vault/chapter3_apex.jpg`,
      },
      {
        chapter: 'THE LEGEND: THE GILDED VAULT',
        subtitle: 'The Artificer’s Last Lock',
        text: [
          'There is one door it does not guard. Behind the foundry stands a door with no keyhole, only a gauge of hissing steam.',
          'The artificer swore it would open for a body that could squat and press in a single breath, faster than the pressure fades.',
          'Drive the iron overhead in these halls, thrust upon thrust. Build the steam, and the door may finally show you its gold.',
        ],
        mood: 'legend',
        image: `${ASSET_ROOT}/cinematics/cathedral_vault/chapter5_legend.jpg`,
      },
      {
        chapter: 'THE SACRAMENT: BONE OVER BRASS',
        subtitle: 'The Living Will',
        text: [
          'The Overlord knows only repetition without spirit. You possess living fire.',
          'Swing the bell until its springs shatter and its gears fly free.',
        ],
        mood: 'iron_vow',
        image: `${ASSET_ROOT}/cinematics/cathedral_vault/chapter4_sacrament.jpg`,
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
          'Deep in the roots of the world, master smiths harnessed the earth’s own blood.',
          'Here every sacred bell was hammered from fallen star-iron, and their ringing held the volcano in check.',
          'Every swing of the hammer was a prayer; every quench a baptism of strength.',
        ],
        mood: 'former_glory',
        image: `${ASSET_ROOT}/cinematics/volcanic_forge/chapter1_glory.jpg`,
      },
      {
        chapter: 'THE CATACLYSM: THE CALDERA BURSTS',
        subtitle: 'Flooded with Dragon’s Breath',
        text: [
          'When those bells were broken across the realm, the volcano’s binding wards shattered with them.',
          'Boiling basalt flooded the grand foundries, turning the master smiths to cinders.',
          'From the magma depths crawled cinder imps and hellhounds, and beneath them, something ancient stirred.',
        ],
        mood: 'ruin',
        image: `${ASSET_ROOT}/cinematics/volcanic_forge/chapter2_ruin.jpg`,
      },
      {
        chapter: 'THE APEX: MAGMA DRAGON',
        subtitle: 'The Primordial Terror',
        text: [
          'Curled in the lake of boiling fire now lies the Magma Dragon.',
          'Its wings churn brimstone ash; its breath melts tempered steel on contact.',
          'It guards the descent to the cosmic void with incinerating fury.',
        ],
        mood: 'apex_terror',
        image: `${ASSET_ROOT}/cinematics/volcanic_forge/chapter3_apex.jpg`,
      },
      {
        chapter: 'THE LEGEND: THE TITAN’S ANVIL',
        subtitle: 'A Blade Left Unfinished',
        text: [
          'One work of the first smiths survived the fire. On the oldest anvil lies a blade they never finished, and after a thousand years it still glows.',
          'It wants no hammer. It hardens under hands that clean the iron to the chest and press it to the sky.',
          'Clean and press in the heat of the forge until it becomes your heartbeat. Then the anvil will call, before the metal cools.',
        ],
        mood: 'legend',
        image: `${ASSET_ROOT}/cinematics/volcanic_forge/chapter5_legend.jpg`,
      },
      {
        chapter: 'THE SACRAMENT: TEMPER THE SOUL',
        subtitle: 'Become Unbreakable',
        text: [
          'In this furnace, ordinary steel melts. Only iron tempered by effort endures.',
          'Drive through the heat. Lift until your sweat boils. Slay the wyrm, and open the way below.',
        ],
        mood: 'iron_vow',
        image: `${ASSET_ROOT}/cinematics/volcanic_forge/chapter4_sacrament.jpg`,
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
          'Beyond the forge’s fires stood the Astral Observatory, where silver telescopes charted orderly constellations.',
          'Monks chanted celestial hymns that aligned body, mind, and cosmos.',
          'It was a place of radiant truth, but its high priests wanted more truth than the stars would give.',
        ],
        mood: 'former_glory',
        image: `${ASSET_ROOT}/cinematics/eldritch_altar/chapter1_glory.jpg`,
      },
      {
        chapter: 'THE TEAR: THE EYES IN THE DARK',
        subtitle: 'The Veil Ripped Asunder',
        text: [
          'Desperate for forbidden knowledge, they turned to human sacrifice.',
          'The golden astrolabe shattered, tearing a jagged scar into the void between the stars.',
          'Monstrous geometry bled through into reality, and something on the other side looked back.',
        ],
        mood: 'ruin',
        image: `${ASSET_ROOT}/cinematics/eldritch_altar/chapter2_ruin.jpg`,
      },
      {
        chapter: 'THE APEX: THE ELDRITCH HORROR',
        subtitle: 'That Which Should Not Be',
        text: [
          'That something now pulses at the rift’s center: an impossible entity of tentacles and void eyes.',
          'Its voice is a chorus of weeping souls; its aura bends distance and gravity.',
          'To look upon it is to invite madness; to fight it requires pure physical conviction.',
        ],
        mood: 'apex_terror',
        image: `${ASSET_ROOT}/cinematics/eldritch_altar/chapter3_apex.jpg`,
      },
      {
        chapter: 'THE LEGEND: THE HOLLOW CHOIR',
        subtitle: 'A Bell That Rings Inside Your Skull',
        text: [
          'Even its music lies. Within the rift hangs a bell with an eye where its clapper should be, and its choir sings things that are not true.',
          'Only the balanced hear past the lies: one foot rooted, the body hinged and steady, the mind still.',
          'Hinge on one leg before this altar, over and over. When the rift opens, trust your count, not your eyes.',
        ],
        mood: 'legend',
        image: `${ASSET_ROOT}/cinematics/eldritch_altar/chapter5_legend.jpg`,
      },
      {
        chapter: 'THE SACRAMENT: THE ANCHOR OF FLESH',
        subtitle: 'Defeat the Void with True Weight',
        text: [
          'Your eyes will lie to you here. The weight in your hands will not.',
          'Every rep proves you exist. Every swing carves a scar into the abyss.',
        ],
        mood: 'iron_vow',
        image: `${ASSET_ROOT}/cinematics/eldritch_altar/chapter4_sacrament.jpg`,
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
          'At the summit of the world, the Sun King sat upon polished white marble.',
          'A covenant bound each monarch to the people: to bear the heaviest burden of all.',
          'For a thousand winters the kings kept that vow, and the realm prospered.',
        ],
        mood: 'former_glory',
        image: `${ASSET_ROOT}/cinematics/obsidian_throne/chapter1_glory.jpg`,
      },
      {
        chapter: 'THE BETRAYAL: THE UNBURDENING',
        subtitle: 'The Origin of the Curse',
        text: [
          'Then the last emperor grew afraid of sweat, of age, of exertion itself.',
          'He begged the Void to unburden him of toil, effort, and death. Its price was every bell in the realm.',
          'So he became the Dark Sovereign, and silenced them all: a realm where nothing grows and nothing dies.',
        ],
        mood: 'ruin',
        image: `${ASSET_ROOT}/cinematics/obsidian_throne/chapter2_ruin.jpg`,
      },
      {
        chapter: 'THE SOVEREIGN: THE DARK EMPEROR',
        subtitle: 'Lord of the Stagnant Throne',
        text: [
          'He sits frozen there still, upon a throne of jagged basalt and black glass.',
          'His royal guard stands around him as obsidian statues, and void lightning answers his call.',
          'He believes effort is meaningless, and that all things must surrender to rot.',
        ],
        mood: 'apex_terror',
        image: `${ASSET_ROOT}/cinematics/obsidian_throne/chapter3_apex.jpg`,
      },
      {
        chapter: 'THE LEGEND: THE THIRTEEN LABOURS',
        subtitle: 'The Blade That Answers Excalibell',
        text: [
          'He is wrong, and the proof stands behind his seat: a second sword in a second stone, the dark twin of the forest blade.',
          'It will not stir for a stranger. It wakes only for the knight who already bears Excalibell.',
          'Every rep laid down in this hall is heard. Master all thirteen labours of the iron, and the twin blade will name its trial.',
        ],
        mood: 'legend',
        image: `${ASSET_ROOT}/cinematics/obsidian_throne/chapter5_legend.jpg`,
      },
      {
        chapter: 'THE SACRAMENT: THE FINAL BURDEN',
        subtitle: 'Restore the Weight of the World',
        text: [
          'Every road through the fallen realm has led to this dais. Raise the consecrated iron.',
          'Show the hollow king that through sweat, strain, and suffering, humanity is reborn.',
          'Break his throne. Let the bells ring again.',
        ],
        mood: 'iron_vow',
        image: `${ASSET_ROOT}/cinematics/obsidian_throne/chapter4_sacrament.jpg`,
      },
    ],
  },
};

export function getStageLore(mapId: BattleMapId): StageLore {
  return STAGE_LORE[mapId] ?? STAGE_LORE.VERDANT_FOREST;
}
