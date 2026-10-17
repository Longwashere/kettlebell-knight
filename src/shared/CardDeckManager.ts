import { CombatCard, CardTemplate, CARD_CATALOG, LEGACY_CARD_IDS } from '../types/battle';
import { spellsForWeapon } from '../types/weaponSpells';
import { ExerciseType } from '../types/game';
import { bindCard, rebindCard, buildLoadout, type Loadout } from './progression';

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
  private templates: CardTemplate[] = [];
  /** Unbound templates by templateId, for rebinding live cards. */
  private sources = new Map<string, CardTemplate>();

  /**
   * `weaponId` is the equipped weapon; its spells are shuffled into every deck built. `cardIds` are the
   * player's unlocked cards (PlayerProfile.unlockedCards); omitted, the legacy full catalog. `loadout` is
   * the knight's stats, weapon and spell levels (src/shared/progression.ts) the cards' numbers come from.
   */
  constructor(private weaponId?: string, private cardIds?: readonly string[], private loadout: Loadout = buildLoadout({ weaponId })) {
    this.initDeck();
    this.dealInitialHand();
  }

  /**
   * New stats, weapon or spell levels (a level-up mid-fight): every card, including the ones in hand,
   * takes its new numbers and keeps its rep progress.
   */
  public setLoadout(loadout: Loadout): CombatCard[] {
    this.loadout = loadout;
    this.templates = this.templates.map((t) => bindCard(this.sources.get(t.templateId) ?? t, loadout));
    const rebind = (c: CombatCard) => {
      const src = this.sources.get(c.templateId);
      return src ? rebindCard(c, src, loadout) : c;
    };
    this.drawPile = this.drawPile.map(rebind);
    this.hand = this.hand.map(rebind);
    this.discardPile = this.discardPile.map(rebind);
    return [...this.hand];
  }

  /**
   * Initializes a balanced combat deck from the unlocked cards, plus two copies of each spell the equipped
   * weapon grants (src/types/weaponSpells.ts).
   */
  public initDeck(weaponId: string | undefined = this.weaponId, cardIds: readonly string[] | undefined = this.cardIds): void {
    this.weaponId = weaponId;
    this.cardIds = cardIds;
    const ids = new Set(cardIds?.length ? cardIds : LEGACY_CARD_IDS);
    const spells = spellsForWeapon(weaponId);
    for (const t of [...CARD_CATALOG, ...spells]) this.sources.set(t.templateId, t);
    const pool = CARD_CATALOG.filter((c) => ids.has(c.templateId)).map((c) => bindCard(c, this.loadout));
    this.templates = pool;
    this.drawPile = [];
    this.hand = [];
    this.discardPile = [];
    this.idCounter = 0;

    // Build draw pile with multiple copies of catalog cards
    const deckTemplates: CardTemplate[] = [
      ...pool,
      ...pool.filter(c => c.rarity === 'common'), // Extra commons
      ...spells.map((spell) => bindCard(spell, this.loadout)).flatMap((spell) => [spell, spell]),
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

    // If still no candidate, mint a fresh copy of an unlocked card for an exercise missing from the hand
    if (candidateIndex === -1) {
      const missing = this.templates.filter(c => !currentExercisesInHand.has(c.exercise));
      if (missing.length > 0) {
        return this.createCardInstance(missing[Math.floor(Math.random() * missing.length)]);
      }
      return null;
    }

    const [card] = this.drawPile.splice(candidateIndex, 1);
    card.currentReps = 0;
    return card;
  }

  /** Dev: template ids of every card in the deck (draw pile, hand and discard). */
  public debugDeck(): string[] {
    return [...this.drawPile, ...this.hand, ...this.discardPile].map((c) => c.templateId);
  }

  /** Dev: puts a fresh copy of `template` in the hand, replacing the card with the same exercise (else slot 0). */
  public debugPutInHand(template: CardTemplate): CombatCard[] {
    const i = Math.max(0, this.hand.findIndex((c) => c.exercise === template.exercise));
    this.sources.set(template.templateId, template);
    this.hand[i] = this.createCardInstance(bindCard(template, this.loadout));
    return [...this.hand];
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
