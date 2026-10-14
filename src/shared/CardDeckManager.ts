import { CombatCard, CardTemplate, CARD_CATALOG } from '../types/battle';
import { ExerciseType } from '../types/game';

/**
 * Slay the Spire Style Card & Deck Manager for Kettlebell Knight.
 * 
 * Strict Constraint:
 * The 5 cards in hand MUST ALWAYS require different exercises from each other.
 * If Card 1 requires Goblet Squats, none of the other 4 cards in hand can be a Goblet Squat.
 */
export class CardDeckManager {
  private drawPile: CombatCard[] = [];
  private hand: CombatCard[] = [];
  private discardPile: CombatCard[] = [];
  private idCounter: number = 0;

  constructor() {
    this.initDeck();
    this.dealInitialHand();
  }

  /**
   * Initializes a balanced 24-card combat deck from the catalog
   */
  public initDeck(): void {
    this.drawPile = [];
    this.hand = [];
    this.discardPile = [];
    this.idCounter = 0;

    // Build draw pile with multiple copies of catalog cards
    const deckTemplates: CardTemplate[] = [
      ...CARD_CATALOG,
      ...CARD_CATALOG.filter(c => c.rarity === 'common'), // Extra commons
    ];

    this.drawPile = deckTemplates.map(template => this.createCardInstance(template));
    this.shuffle(this.drawPile);
  }

  private createCardInstance(template: CardTemplate): CombatCard {
    this.idCounter++;
    return {
      ...template,
      id: `card_${this.idCounter}_${template.templateId}`,
      currentReps: 0,
    };
  }

  private shuffle(array: CombatCard[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Deals the starting hand of exactly 5 cards with 5 completely distinct exercises
   */
  public dealInitialHand(): CombatCard[] {
    this.hand = [];

    while (this.hand.length < 5) {
      const drawn = this.drawUniqueExerciseCard();
      if (drawn) {
        this.hand.push(drawn);
      } else {
        // Fallback safety if pool is exhausted
        break;
      }
    }

    return [...this.hand];
  }

  /**
   * Draws a card whose exercise is NOT currently in the player's hand.
   * Strictly enforces the "different exercises in hand" rule.
   */
  private drawUniqueExerciseCard(): CombatCard | null {
    const currentExercisesInHand = new Set(this.hand.map(c => c.exercise));

    // Search draw pile for a card with an exercise NOT in hand
    let candidateIndex = this.drawPile.findIndex(c => !currentExercisesInHand.has(c.exercise));

    // If no candidate in draw pile, recycle and shuffle discard pile
    if (candidateIndex === -1 && this.discardPile.length > 0) {
      this.drawPile.push(...this.discardPile);
      this.discardPile = [];
      this.shuffle(this.drawPile);
      candidateIndex = this.drawPile.findIndex(c => !currentExercisesInHand.has(c.exercise));
    }

    // If still no candidate, generate fresh card from catalog for a missing exercise
    if (candidateIndex === -1) {
      const allExercises: ExerciseType[] = [
        'SWING',
        'SQUAT',
        'CLEAN_AND_PRESS',
        'SNATCH',
        'WINDMILL',
        'DEADLIFT',
        'OVERHEAD_PRESS',
        'THRUSTER',
        'GORILLA_ROW',
        'HALO',
        'SINGLE_LEG_RDL',
      ];
      const missingExercises = allExercises.filter(ex => !currentExercisesInHand.has(ex));
      if (missingExercises.length > 0) {
        const targetEx = missingExercises[Math.floor(Math.random() * missingExercises.length)];
        const template = CARD_CATALOG.find(c => c.exercise === targetEx) || CARD_CATALOG[0];
        return this.createCardInstance(template);
      }
      return null;
    }

    const [card] = this.drawPile.splice(candidateIndex, 1);
    card.currentReps = 0;
    return card;
  }

  public getHand(): CombatCard[] {
    return [...this.hand];
  }

  public getDrawPileCount(): number {
    return this.drawPile.length;
  }

  public getDiscardPileCount(): number {
    return this.discardPile.length;
  }

  /**
   * Records a completed repetition for an exercise.
   * If the matching card reaches its required reps, it activates and triggers damage/block!
   */
  /**
   * Counts a rep toward the hand's card for `exercise`. When the card completes it is discarded and
   * replaced in the same slot; the result carries the set's average power and form for scaling.
   */
  public recordRep(
    exercise: ExerciseType,
    power: number = 80,
    form: number = 1.0
  ): {
    activated: boolean;
    card: CombatCard | null;
    power: number;
    form: number;
    hand: CombatCard[];
  } {
    const targetCardIndex = this.hand.findIndex(c => c.exercise === exercise);

    if (targetCardIndex === -1) {
      return { activated: false, card: null, power, form, hand: [...this.hand] };
    }

    const card = this.hand[targetCardIndex];
    card.currentReps++;
    card.powerSum = (card.powerSum ?? 0) + power;
    card.formSum = (card.formSum ?? 0) + form;
    const avgPower = card.powerSum / card.currentReps;
    const avgForm = card.formSum / card.currentReps;

    if (card.currentReps >= card.requiredReps) {
      const activatedCard = { ...card };

      // Discard the activated card and draw a replacement into the same slot, keeping the
      // hand at five distinct exercises
      card.currentReps = 0;
      card.powerSum = 0;
      card.formSum = 0;
      this.discardPile.push(card);
      this.hand.splice(targetCardIndex, 1);
      const replacement = this.drawUniqueExerciseCard();
      if (replacement) {
        this.hand.splice(targetCardIndex, 0, replacement);
      }

      return { activated: true, card: activatedCard, power: avgPower, form: avgForm, hand: [...this.hand] };
    }

    return { activated: false, card: { ...card }, power: avgPower, form: avgForm, hand: [...this.hand] };
  }
}
