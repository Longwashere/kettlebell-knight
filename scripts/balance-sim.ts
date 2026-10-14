/**
 * Balance simulator: plays every encounter many times with the real deck, card resolver, monster
 * movesets and encounter data, using a model of a person actually doing the exercises.
 *
 *   npm run balance            # all encounters, 400 fights each
 *   npm run balance -- 1000    # more fights per encounter
 *   npm run balance -- 400 cards   # also print the card table
 *
 * Tuning knobs (env vars) scale data without editing it: DMG=0.8 (monster damage), HP=1.2 (monster
 * HP), ENC=solo_wolf,boss_trio (only these encounters). Bake the result into the data afterwards.
 *
 * Player model: works one card at a time (the highlighted, nearest-to-cast card, otherwise a random
 * card from the hand), each rep takes the exercise's repSeconds ±15%, switching exercise costs
 * SWITCH_SECONDS, and power/form vary like a real set. Monsters use the battle screen's ATB rules.
 */
import { CardDeckManager } from '../src/shared/CardDeckManager';
import { resolveCard, frontTarget } from '../src/shared/combat';
import { EXERCISE_PROFILE, cardBudget, TARGET_LABEL } from '../src/shared/cardBalance';
import { rollIntent, createEncounterFromTemplate } from '../src/shared/monsterMovesets';
import { CARD_CATALOG, ENCOUNTERS, type CombatCard, type MonsterState } from '../src/types/battle';
import { PLAYER_MAX_HP, BLOCK_DECAY_PER_SECOND, IMPACT_DELAY_SECONDS } from '../src/shared/combatRules';

const RUNS = Number(process.argv[2]) || 400;
// Damage actually delivered (HP + Block stripped) per budget point, by targeting and group size
const delivered: Record<string, { dmg: number; budget: number }> = {};
const SHOW_CARDS = process.argv.includes('cards');
const DT = 0.05;
const SWITCH_SECONDS = 4;
const TIMEOUT = 360;
// Tuning knobs (env): scale monster damage / HP without editing data, to find targets quickly
const DMG = Number(process.env.DMG ?? 1);
const HP = Number(process.env.HP ?? 1);
const ENC = process.env.ENC ? process.env.ENC.split(',') : null;
const WEAPON = process.env.WEAPON; // equipped weapon id: its spell cards join the deck (src/types/weaponSpells.ts)

const gauss = () => {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

interface Result {
  win: boolean;
  time: number;
  hpLeft: number;
  casts: number;
  taken: number;
}

function fight(encounterIndex: number): Result {
  const deck = new CardDeckManager(WEAPON);
  let hand = deck.dealInitialHand();
  let monsters: MonsterState[] = createEncounterFromTemplate(ENCOUNTERS[encounterIndex]).map((m) => ({
    ...m,
    currentHp: Math.round(m.currentHp * HP),
    maxHp: Math.round(m.maxHp * HP),
  }));
  let hp = PLAYER_MAX_HP;
  let block = 0;
  let taken = 0;
  let casts = 0;
  let current: CombatCard | null = null;
  let repTimer = 0;
  const pending: { at: number; m: MonsterState }[] = [];

  for (let t = 0; t < TIMEOUT; t += DT) {
    // Player
    if (!current || !hand.some((c) => c.id === current!.id)) {
      const lead = [...hand].filter((c) => c.currentReps > 0).sort((a, b) => (a.requiredReps - a.currentReps) - (b.requiredReps - b.currentReps))[0];
      const next = lead ?? hand[Math.floor(Math.random() * hand.length)];
      const switching = !current || current.exercise !== next.exercise;
      current = next;
      repTimer = (switching ? SWITCH_SECONDS : 0) + EXERCISE_PROFILE[next.exercise].repSeconds * (1 + 0.15 * gauss());
    }
    repTimer -= DT;
    if (repTimer <= 0) {
      const power = 80 * (1.05 + 0.12 * gauss());
      const form = Math.min(1, 0.9 + 0.06 * gauss());
      const result = deck.recordRep(current.exercise, power, form);
      hand = result.hand;
      if (result.activated && result.card) {
        casts++;
        const res = resolveCard(result.card, monsters, frontTarget(monsters), { power: result.power, form: result.form });
        const c = result.card;
        if (c.damage > 0) {
          const alive = monsters.filter((m) => m.currentHp > 0).length;
          const key = `${c.target}:${Math.min(3, alive)}`;
          const dmgBudget = cardBudget({ exercise: c.exercise, reps: c.requiredReps, rarity: c.rarity }) * (c.damage / (c.damage + c.block * 0.9 + c.heal * 1.4 || 1));
          const entry = (delivered[key] ??= { dmg: 0, budget: 0 });
          entry.dmg += res.hits.reduce((sum, h) => sum + h.damage + h.blocked, 0);
          entry.budget += dmgBudget;
        }
        monsters = res.monsters;
        block += res.block;
        hp = Math.min(PLAYER_MAX_HP, hp + res.heal);
        current = null;
      } else {
        repTimer = EXERCISE_PROFILE[current.exercise].repSeconds * (1 + 0.15 * gauss());
      }
      if (monsters.every((m) => m.currentHp <= 0)) return { win: true, time: t, hpLeft: hp, casts, taken };
    }

    // Block crumbles over time
    block = Math.max(0, block - BLOCK_DECAY_PER_SECOND * DT);

    // Monsters (same ATB rules as BattleScreen: timer → wind-up → impact)
    monsters = monsters.map((m) => {
      if (m.currentHp <= 0 || m.isAlive === false) return m;
      const remaining = m.intent.remainingSeconds - DT;
      if (remaining > 0) return { ...m, intent: { ...m.intent, remainingSeconds: remaining } };
      pending.push({ at: t + IMPACT_DELAY_SECONDS, m });
      return { ...m, intent: rollIntent(m) };
    });
    for (let i = pending.length - 1; i >= 0; i--) {
      if (pending[i].at > t) continue;
      const { m } = pending.splice(i, 1)[0];
      const live = monsters.find((x) => x.instanceId === m.instanceId);
      if (!live || live.currentHp <= 0) continue; // killed during the wind-up
      if (m.intent.type === 'DEFEND') {
        live.block += m.intent.block ?? 25;
      } else {
        const dmg = Math.round(m.intent.damage * DMG);
        const absorbed = Math.min(block, dmg);
        block -= absorbed;
        hp -= dmg - absorbed;
        taken += dmg - absorbed;
        if (hp <= 0) return { win: false, time: t, hpLeft: 0, casts, taken };
      }
    }
  }
  return { win: false, time: TIMEOUT, hpLeft: hp, casts, taken };
}

const pct = (n: number) => `${Math.round(n * 100)}%`.padStart(5);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

if (SHOW_CARDS) {
  console.log('\nCARDS  (budget = reps × repSeconds × intensity × rate × rarity)');
  console.log('name                   exercise          reps  rarity     target    dmg  blk heal  extras          budget  per-sec');
  for (const c of CARD_CATALOG) {
    const budget = cardBudget({ exercise: c.exercise, reps: c.requiredReps, rarity: c.rarity });
    const secs = c.requiredReps * EXERCISE_PROFILE[c.exercise].repSeconds;
    const extras = [c.target === 'CHAIN' ? `x${c.hits}` : '', c.shatter ? 'shatter' : '', c.stagger ? `stagger ${c.stagger}s` : ''].filter(Boolean).join(' ');
    console.log(
      `${c.name.padEnd(22)} ${c.exercise.padEnd(17)} ${String(c.requiredReps).padStart(4)}  ${c.rarity.padEnd(9)}  ${TARGET_LABEL[c.target].padEnd(8)} ${String(c.damage).padStart(4)} ${String(c.block).padStart(4)} ${String(c.heal).padStart(4)}  ${extras.padEnd(14)} ${budget.toFixed(0).padStart(6)}  ${(budget / secs).toFixed(1).padStart(6)}`,
    );
  }
}

console.log(`\nENCOUNTERS  (${RUNS} fights each; player HP ${PLAYER_MAX_HP}; block decay ${BLOCK_DECAY_PER_SECOND}/s)`);
console.log('encounter               monsters                         win   median   p90   hp left (wins)  dmg taken  casts');
for (const [i, enc] of ENCOUNTERS.entries()) {
  if (ENC && !ENC.includes(enc.id)) continue;
  const results = Array.from({ length: RUNS }, () => fight(i));
  const wins = results.filter((r) => r.win);
  const times = wins.map((r) => r.time);
  const p90 = [...times].sort((a, b) => a - b)[Math.floor(times.length * 0.9)] ?? 0;
  console.log(
    `${enc.name.slice(0, 22).padEnd(22)}  ${enc.monsterIds.join(',').slice(0, 32).padEnd(32)} ${pct(wins.length / RUNS)}  ${median(times).toFixed(0).padStart(5)}s ${p90.toFixed(0).padStart(4)}s  ${pct(median(wins.map((r) => r.hpLeft)) / PLAYER_MAX_HP).padStart(14)}  ${median(results.map((r) => r.taken)).toFixed(0).padStart(9)}  ${median(results.map((r) => r.casts)).toFixed(0).padStart(5)}`,
  );
}

console.log('\nDAMAGE DELIVERED PER BUDGET POINT  (by targeting and number of living foes at cast)');
console.log('target      1 foe   2 foes  3 foes');
for (const t of ['SINGLE', 'BACK', 'PIERCE', 'CHAIN', 'ALL']) {
  const cell = (n: number) => {
    const e = delivered[`${t}:${n}`];
    return e && e.budget > 50 ? (e.dmg / e.budget).toFixed(2).padStart(6) : '    - ';
  };
  console.log(`${TARGET_LABEL[t as keyof typeof TARGET_LABEL].padEnd(9)} ${cell(1)}  ${cell(2)}  ${cell(3)}`);
}
