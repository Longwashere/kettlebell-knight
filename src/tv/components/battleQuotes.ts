/**
 * Knightly maxims shown before a fight's title plate (BattleIntro, the 'quote' step). `lines` are separate
 * speakers or stanzas; quotation marks are added when drawn.
 */
export interface BattleQuote {
  lines: string[];
  source: string;
}

export const BATTLE_QUOTES: BattleQuote[] = [
  {
    lines: ['Be without fear in the face of the heavy iron. Brace thy core and stand upright that the Forge may favor thee. Lock out every rep always, even if thy lungs burn like dragonfire. Safeguard thy spine and do no half-reps.'],
    source: 'The Oath of the Iron Vanguard',
  },
  {
    lines: ['Better to collapse upon the gym floor with honor than to rack the weight in shame.'],
    source: 'The Song of the Last Set',
  },
  {
    lines: ['A knight is sworn to the grind, his heart knows only grit, his grip defends the handle, his hips uphold the swing, his form speaks only truth, his snatch undoes the weak.'],
    source: 'The Old Code of the Cast Iron',
  },
  {
    lines: ['I will not yield, nor drop this bell before the final chime… Lay on, thou cruel timer, and damned be he that first cries, ‘Hold, my grip fails!’'],
    source: 'Sir Macbeth of the Bloodied Callus',
  },
  {
    lines: ['He who fears the 48-kilo beast will never perform the lifts worthy of a living champion.'],
    source: "Geoffroi de Chalk-Dust, A Knight's Book of Heavy Lifting",
  },
  {
    lines: ['Once more unto the squat rack, dear friends, once more; or floor the hall with our exhausted dead!'],
    source: 'King Henry V, prior to the Battle of Leg Day',
  },
  {
    lines: ['DOMS before dishonor.'],
    source: 'Ancient maxim of the Knights of the Round Bell',
  },
  {
    lines: ['My calluses may be torn, and my shoulders may tremble, but my core remains braced. While I draw breath, I shall press overhead.'],
    source: 'Godfrey of the Golden Goblet Squat',
  },
  {
    lines: ['I would rather perish grinding through Turkish Get-Ups beside my brethren than save my breath upon a cushioned treadmill.'],
    source: 'Sir Bertrand, Constable of the Iron Sanctuary',
  },
  {
    lines: ['A quitter drops the bell a thousand times before his workout ends, but the valiant taste failure but once—on the final rep.'],
    source: 'Chronicles of the Heavy Set',
  },
  {
    lines: ['He that shall survive this EMOM, and see old age, will yearly feast on protein with his neighbors and say, ‘Tomorrow is the Festival of the Snatch’… We few, we happy few, we band of lifters.'],
    source: "The St. Crispian's Day Warm-Up",
  },
  {
    lines: ['To lift the impossible weight, to conquer the unbeatable workout, to bear with unbearable lactic acid, to swing where the weak dare not go.'],
    source: 'The Knight of the Rusted Bell',
  },
  {
    lines: ['Root thy heels fast, and look upon the rows of cast iron without trembling; for he who hinges with righteous form need fear no mortal burden.'],
    source: 'Chronicle of Sir William the Unbroken',
  },
  {
    lines: [
      'Drop the weight, Roland, and the trainer will blow the whistle and grant thee rest!',
      'The Gods forbid that my bloodline should ever be shamed by a missed rep, or that this sacred gym should fall into mediocrity!',
    ],
    source: 'The Ballad of the Endless AMRAP',
  },
  {
    lines: ['A knight who skips his warm-up is dead to the arena, though his limbs still walk toward the rack.'],
    source: 'Parzival and the Quest for Mobility',
  },
  {
    lines: ['Fear not the mountain of iron before you, for victory in the gauntlet does not depend on the size of the muscle, but on the explosive drive that comes from the hips.'],
    source: 'Motto of the Knights Templar of Tension',
  },
  {
    lines: ['I care not for the burn against me; where the program commands and honor calls, there will I chalk my hands and plant my feet.'],
    source: "Le Morte d'Barbell",
  },
  {
    lines: ['It is not the size of the bicep, but the fortitude of the posterior chain, that makes a man a true Knight of the Bell.'],
    source: 'The Book of the Order of Ballistics',
  },
  {
    lines: ['When the lungs burn fiercely and the grip grows slick with sweat, that is the hour when true knights show their mettle and clean the weight again.'],
    source: 'Chronicles of the Hundred-Rep War',
  },
  {
    lines: ['Let us meet the iron boldly on the rubber mats, so that whether we set a personal record or fail under the load, our gains will be spoken of with honor by those who lift after us.'],
    source: 'The Black Iron Prince',
  },
];

/** Shuffle bag: every quote shows once before any repeats. */
let bag: number[] = [];
export function nextBattleQuote(): BattleQuote {
  if (bag.length === 0) {
    bag = BATTLE_QUOTES.map((_, i) => i);
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }
  return BATTLE_QUOTES[bag.pop()!];
}

/** How long the quote holds: the words fade in, then long enough to read at a relaxed pace. */
export function quoteHoldMs(q: BattleQuote): number {
  const words = q.lines.join(' ').split(/\s+/).length;
  return Math.round(Math.min(14000, Math.max(4200, 1800 + words * 260)));
}
