/**
 * Balance simulator: plays fights with the real deck, card binding, card resolver, monster movesets,
 * stage scaling and progression rules, using a model of a person actually doing the exercises.
 *
 *   npm run balance                    # stage table: expedition win rates by knight level and effort
 *   npm run balance -- campaign        # an average knight plays the whole campaign, levelling as it goes
 *   npm run balance -- encounters      # every encounter once, a knight at its stage's recommended level
 *   npm run balance -- stages 200      # more runs per cell (default 80)
 *   npm run balance -- stages cards    # also print the card table
 *
 * Env knobs: EFFORT=casual|average|allin (campaign / encounters), STARTER=1 (a new game's starter deck
 * instead of the full catalog), WEAPON=<id> (force a weapon), MAPS=VERDANT_FOREST,DARK_FOREST (only
 * these), DMG=0.8 / HP=1.2 (scale monster damage / HP to find targets fast; bake results into
 * STAGE_BALANCE afterwards).
 *
 * Player model: works one card at a time (the highlighted, nearest-to-cast card, otherwise a random
 * card from the hand), each rep takes the exercise's repSeconds × the effort's tempo ±15%, switching
 * exercise costs a few seconds, and power/form vary like a real set. Monsters use the battle screen's
 * ATB rules; the knight dodges by its SPD.
 */
import { CardDeckManager } from '../src/shared/CardDeckManager';
import { resolveCard, frontTarget } from '../src/shared/combat';
import { EXERCISE_PROFILE, REFERENCE_KNIGHT, cardBudget, TARGET_LABEL } from '../src/shared/cardBalance';
import { rollIntent } from '../src/shared/monsterMovesets';
import { CARD_CATALOG, ENCOUNTERS, LEGACY_CARD_IDS, STARTER_CARD_IDS, type BattleMapId, type CombatCard, type EncounterTemplate, type MonsterState } from '../src/types/battle';
import { ALL_WEAPON_SPELLS } from '../src/types/weaponSpells';
import { BLOCK_DECAY_PER_SECOND, IMPACT_DELAY_SECONDS } from '../src/shared/combatRules';
import { CAMPAIGN_MAP_ORDER, getExpeditionEncounters } from '../src/shared/expeditionEngine';
import { HORDE, createStageEncounter, expeditionClearXp, recommendedLevel, rollHorde, xpToNext } from '../src/shared/stageScaling';
import {
  BASE_STATS, EXPECTED_KNIGHT, buildLoadout, castsForCardLevel, castsForWeaponLevel, expectedStats, rollLevelUp, weaponLevelReq,
  weaponStats, MAX_LEVEL, CARD_MAX_LEVEL, type KnightStats, type Loadout, type StatKey,
} from '../src/shared/progression';
import { SHOP_ITEMS } from '../src/shared/shopItems';
import { elementMultiplier } from '../src/shared/elements';

const args = process.argv.slice(2);
const MODE = args.find((a) => ['stages', 'campaign', 'encounters'].includes(a)) ?? 'stages';
const RUNS = Number(args.find((a) => /^\d+$/.test(a))) || 80;
const SHOW_CARDS = args.includes('cards');
const DT = 0.05;
const TIMEOUT = 420;
const DMG = Number(process.env.DMG ?? 1);
const HP = Number(process.env.HP ?? 1);
const FORCE_WEAPON = process.env.WEAPON;
const STARTER = process.env.STARTER === '1';
/** Chance a non-boss fight is a horde (HORDE=1 makes every one a horde; HORDE=0 none). */
const HORDE_CHANCE = Number(process.env.HORDE ?? HORDE.chance);
const MAPS = process.env.MAPS ? (process.env.MAPS.split(',') as BattleMapId[]) : CAMPAIGN_MAP_ORDER;
/** Share of max HP restored between the encounters of an expedition (BattleScreen does the same). */
const BREATHER_HEAL = 0.2;

const gauss = () => {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

// --- Effort: the "out-exercise it" axis ------------------------------------------------------------

interface Effort {
  power: number; // mean rep power (80 = cast ×1.0)
  form: number;
  tempo: number; // rep time × this
  switchSeconds: number;
}
const EFFORTS: Record<string, Effort> = {
  casual: { power: 70, form: 0.85, tempo: 1.15, switchSeconds: 5 },
  average: { power: 84, form: 0.9, tempo: 1.0, switchSeconds: 4 },
  allin: { power: 118, form: 0.93, tempo: 0.85, switchSeconds: 3 },
};
const EFFORT = EFFORTS[process.env.EFFORT ?? 'average'] ?? EFFORTS.average;

// --- Knights ----------------------------------------------------------------------------------------

const deckIds = STARTER ? STARTER_CARD_IDS : LEGACY_CARD_IDS;
const ALL_CARD_IDS = [...CARD_CATALOG, ...ALL_WEAPON_SPELLS].map((c) => c.templateId);

/** Monster elements an expedition level will field. */
function stageElements(map: BattleMapId, level: number) {
  return getExpeditionEncounters(map, level).flatMap((e) => createStageEncounter(e, level, map)).map((m) => m.element);
}

/** The best weapon a knight of `level` may wield for these foes: highest damage over their elements. */
function pickWeapon(level: number, foes: ReturnType<typeof stageElements>, owned?: Set<string>): string {
  if (FORCE_WEAPON) return FORCE_WEAPON;
  const candidates = SHOP_ITEMS.filter((i) => i.slot === 'weapon' && !i.stoneBound && level >= weaponLevelReq(i.level) && (!owned || owned.has(i.id)));
  const score = (id: string) => {
    const w = weaponStats(id, EXPECTED_KNIGHT.weaponLevel);
    return foes.reduce((sum, el) => sum + w.atk + w.elemDmg * elementMultiplier(w.element, el), 0);
  };
  return candidates.sort((a, b) => score(b.id) - score(a.id))[0]?.id ?? 'iron_kettlebell';
}

/** The expected knight at `level` (progression.ts): even stats, a good weapon at level 4, cards levelled. */
function expectedLoadout(level: number, foes: ReturnType<typeof stageElements>): Loadout {
  const stats = expectedStats(level);
  const rounded: KnightStats = { str: Math.round(stats.str), hp: Math.round(stats.hp), spd: Math.round(stats.spd) };
  const weaponId = pickWeapon(level, foes);
  const cardLvl = Math.min(CARD_MAX_LEVEL, Math.floor(1 + (level - 1) * EXPECTED_KNIGHT.cardLevelsPerKnightLevel));
  const casts = castsForCardLevel(cardLvl);
  return buildLoadout({
    level,
    stats: rounded,
    weaponId,
    cardCasts: Object.fromEntries(ALL_CARD_IDS.map((id) => [id, casts])),
    weaponCasts: { [weaponId]: castsForWeaponLevel(EXPECTED_KNIGHT.weaponLevel) },
  });
}

// --- One fight ----------------------------------------------------------------------------------------

interface FightResult {
  win: boolean;
  time: number;
  hpLeft: number;
  casts: string[]; // templateIds cast
  xp: number; // from kills
  dodged: number;
}

// Damage actually delivered (HP + Block stripped) per budget point, by targeting and group size
const delivered: Record<string, { dmg: number; budget: number }> = {};

function fight(monstersIn: MonsterState[], loadout: Loadout, hpStart: number, effort: Effort): FightResult {
  const deck = new CardDeckManager(loadout.weaponId, deckIds, loadout);
  let hand = deck.dealInitialHand();
  let monsters = monstersIn.map((m) => ({ ...m, currentHp: Math.round(m.currentHp * HP), maxHp: Math.round(m.maxHp * HP) }));
  let hp = hpStart;
  let block = 0;
  let xp = 0;
  let dodged = 0;
  const casts: string[] = [];
  let current: CombatCard | null = null;
  let repTimer = 0;
  const pending: { at: number; m: MonsterState }[] = [];
  const repTime = (c: CombatCard) => EXERCISE_PROFILE[c.exercise].repSeconds * effort.tempo * (1 + 0.15 * gauss());

  for (let t = 0; t < TIMEOUT; t += DT) {
    // Knight
    if (!current || !hand.some((c) => c.id === current!.id)) {
      const lead = [...hand].filter((c) => c.currentReps > 0).sort((a, b) => (a.requiredReps - a.currentReps) - (b.requiredReps - b.currentReps))[0];
      const next = lead ?? hand[Math.floor(Math.random() * hand.length)];
      const switching = !current || current.exercise !== next.exercise;
      current = next;
      repTimer = (switching ? effort.switchSeconds : 0) + repTime(next);
    }
    repTimer -= DT;
    if (repTimer <= 0) {
      const power = effort.power * (1 + 0.12 * gauss());
      const form = Math.min(1, effort.form + 0.06 * gauss());
      const result = deck.recordRep(current.exercise, power, form);
      hand = result.hand;
      if (result.activated && result.card) {
        const c = result.card;
        casts.push(c.templateId);
        const res = resolveCard(c, monsters, frontTarget(monsters), { power: result.power, form: result.form });
        if (c.damage > 0) {
          const alive = monsters.filter((m) => m.currentHp > 0).length;
          const key = `${c.target}:${Math.min(3, alive)}`;
          const dmgBudget = cardBudget({ exercise: c.exercise, reps: c.baseReps, rarity: c.rarity }) * (c.damage / (c.damage + c.block * 0.9 + c.heal * 1.4 || 1));
          const scale = (c.damage + (c.infusion?.damage ?? 0)) / (c.dmgPct * REFERENCE_KNIGHT.attack); // back to the reference knight
          const entry = (delivered[key] ??= { dmg: 0, budget: 0 });
          entry.dmg += res.hits.reduce((sum, h) => sum + h.damage + h.blocked, 0) / scale;
          entry.budget += dmgBudget;
        }
        for (const h of res.hits) if (h.killed) xp += monsters[h.index].xp ?? 0;
        monsters = res.monsters;
        block += res.block;
        hp = Math.min(loadout.maxHp, hp + res.heal);
        current = null;
      } else {
        repTimer = repTime(current);
      }
      if (monsters.every((m) => m.currentHp <= 0)) return { win: true, time: t, hpLeft: hp, casts, xp, dodged };
    }

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
      } else if (Math.random() < loadout.dodge) {
        dodged++;
      } else {
        const dmg = Math.round(m.intent.damage * DMG);
        const absorbed = Math.min(block, dmg);
        block -= absorbed;
        hp -= dmg - absorbed;
        if (hp <= 0) return { win: false, time: t, hpLeft: 0, casts, xp, dodged };
      }
    }
  }
  return { win: false, time: TIMEOUT, hpLeft: hp, casts, xp, dodged };
}

/** A whole expedition level: encounters in order, HP carried over with a breather heal between. */
function expedition(map: BattleMapId, level: number, loadout: Loadout, effort: Effort) {
  const encounters = getExpeditionEncounters(map, level);
  let hp = loadout.maxHp;
  let time = 0;
  let xp = 0;
  const casts: string[] = [];
  for (const [i, enc] of encounters.entries()) {
    const boss = level >= 5 && i === encounters.length - 1;
    const r = fight(createStageEncounter(rollHorde(enc, map, level, boss, HORDE_CHANCE), level, map), loadout, hp, effort);
    time += r.time;
    xp += r.xp;
    casts.push(...r.casts);
    if (!r.win) return { win: false, reached: i, time, xp, casts, hpLeft: 0 };
    hp = Math.min(loadout.maxHp, r.hpLeft + loadout.maxHp * BREATHER_HEAL);
  }
  xp += expeditionClearXp(encounters, map, level);
  return { win: true, reached: encounters.length, time, xp, casts, hpLeft: hp };
}

const pct = (n: number) => `${Math.round(n * 100)}%`.padStart(5);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

// --- Modes ------------------------------------------------------------------------------------------

function stagesTable() {
  console.log(`\nSTAGES  (${RUNS} expedition runs per cell; ${STARTER ? 'starter' : 'full'} deck; expected knight at a level offset from the stage's recommended level)`);
  console.log('                          rec   under (−4)       on level (rec)            over (+4)   minutes     monster  boss');
  console.log('stage                     lvl   avg   all-in   casual  avg   all-in      avg         (rec avg)   HP       dmg');
  for (const map of MAPS) {
    for (const level of [1, 3, 5]) {
      const rec = recommendedLevel(map, level);
      const foes = stageElements(map, level);
      const cell = (offset: number, effort: Effort) => {
        const L = Math.max(1, Math.min(MAX_LEVEL, rec + offset));
        const lo = expectedLoadout(L, foes);
        const runs = Array.from({ length: RUNS }, () => expedition(map, level, lo, effort));
        return { win: runs.filter((r) => r.win).length / RUNS, time: median(runs.filter((r) => r.win).map((r) => r.time)) };
      };
      const onAvg = cell(0, EFFORTS.average);
      const monsters = getExpeditionEncounters(map, level).flatMap((e) => createStageEncounter(e, level, map));
      const avgHp = monsters.reduce((s, m) => s + m.maxHp, 0) / monsters.length;
      const maxHit = Math.max(...monsters.map((m) => m.intent.damage));
      console.log(
        `${`${map} ${level}`.padEnd(24)}  ${String(rec).padStart(3)}  ${pct(cell(-4, EFFORTS.average).win)} ${pct(cell(-4, EFFORTS.allin).win)}    ${pct(cell(0, EFFORTS.casual).win)} ${pct(onAvg.win)} ${pct(cell(0, EFFORTS.allin).win)}     ${pct(cell(4, EFFORTS.average).win)}      ${mmss(onAvg.time).padStart(6)}     ${Math.round(avgHp).toString().padStart(6)}  ${String(maxHit).padStart(5)}`,
      );
    }
  }
}

function encountersTable() {
  console.log(`\nENCOUNTERS  (${RUNS} fights each; knight at the encounter map's recommended level, stage level 1)`);
  console.log('encounter               monsters                         win   median   p90   hp left (wins)');
  for (const enc of ENCOUNTERS) {
    if (enc.map && !MAPS.includes(enc.map)) continue;
    const monsters = () => createStageEncounter(enc, 1);
    const lo = expectedLoadout(recommendedLevel(enc.map, 1), monsters().map((m) => m.element));
    const results = Array.from({ length: RUNS }, () => fight(monsters(), lo, lo.maxHp, EFFORT));
    const wins = results.filter((r) => r.win);
    const times = wins.map((r) => r.time);
    const p90 = [...times].sort((a, b) => a - b)[Math.floor(times.length * 0.9)] ?? 0;
    console.log(
      `${enc.name.slice(0, 22).padEnd(22)}  ${enc.monsterIds.map((m) => (typeof m === 'string' ? m : m.id)).join(',').slice(0, 32).padEnd(32)} ${pct(wins.length / RUNS)}  ${median(times).toFixed(0).padStart(5)}s ${p90.toFixed(0).padStart(4)}s  ${pct(median(wins.map((r) => r.hpLeft)) / lo.maxHp).padStart(14)}`,
    );
  }
}

/**
 * A knight plays the campaign in order: each expedition level is retried until cleared (or 25 tries:
 * stuck). Experience comes from kills win or lose plus clear bonuses; level-ups roll real stats; cards
 * and weapons level from use; it buys the best weapon its level allows for each map's foes.
 */
function campaign() {
  console.log(`\nCAMPAIGN  (${process.env.EFFORT ?? 'average'} effort; ${STARTER ? 'starter' : 'full'} deck; ${RUNS > 20 ? 20 : RUNS} playthroughs)`);
  console.log('map                  arrive lvl  rec  leave lvl   tries per level (1..5)        fights   hours   weapon');
  const playthroughs = Math.min(RUNS, 20);
  const rows = new Map<BattleMapId, { arrive: number[]; leave: number[]; tries: number[][]; fights: number[]; secs: number[]; weapon: string[] }>();
  for (let p = 0; p < playthroughs; p++) {
    let level = 1;
    let xp = 0;
    let stats: KnightStats = { ...BASE_STATS };
    let bag: StatKey[] = [];
    const cardCasts: Record<string, number> = {};
    const weaponCasts: Record<string, number> = {};
    let stuck = false;
    for (const map of MAPS) {
      if (stuck) break;
      const row = rows.get(map) ?? { arrive: [], leave: [], tries: [[], [], [], [], []], fights: [], secs: [], weapon: [] };
      rows.set(map, row);
      row.arrive.push(level);
      let fights = 0;
      let secs = 0;
      let weaponId = 'iron_kettlebell';
      for (let lvl = 1; lvl <= 5 && !stuck; lvl++) {
        let tries = 0;
        for (;;) {
          tries++;
          weaponId = pickWeapon(level, stageElements(map, lvl));
          const lo = buildLoadout({ level, stats, weaponId, cardCasts, weaponCasts });
          const r = expedition(map, lvl, lo, EFFORT);
          fights += r.reached + (r.win ? 0 : 1);
          secs += r.time;
          for (const id of r.casts) {
            cardCasts[id] = (cardCasts[id] ?? 0) + 1;
            weaponCasts[weaponId] = (weaponCasts[weaponId] ?? 0) + 1;
          }
          xp += r.xp;
          while (level < MAX_LEVEL && xp >= xpToNext(level)) {
            xp -= xpToNext(level);
            level++;
            const roll = rollLevelUp(stats, bag);
            stats = roll.stats;
            bag = roll.bag;
          }
          if (r.win) break;
          if (tries >= 25) {
            stuck = true;
            break;
          }
        }
        row.tries[lvl - 1].push(tries);
      }
      row.leave.push(level);
      row.fights.push(fights);
      row.secs.push(secs);
      row.weapon.push(weaponId);
    }
  }
  for (const [map, row] of rows) {
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
    const mode = (xs: string[]) => [...xs].sort((a, b) => xs.filter((x) => x === b).length - xs.filter((x) => x === a).length)[0] ?? '';
    console.log(
      `${map.padEnd(20)} ${avg(row.arrive).toFixed(1).padStart(9)}  ${String(recommendedLevel(map, 1)).padStart(4)}  ${avg(row.leave).toFixed(1).padStart(9)}   ${row.tries.map((t) => avg(t).toFixed(1).padStart(4)).join(' ')}   ${avg(row.fights).toFixed(0).padStart(9)}  ${(avg(row.secs) / 3600).toFixed(1).padStart(6)}   ${mode(row.weapon)}${row.arrive.length < playthroughs ? `  (${playthroughs - row.arrive.length} stuck before)` : ''}`,
    );
  }
}

if (SHOW_CARDS) {
  console.log('\nCARDS  (budget = reps × repSeconds × intensity × rate × rarity; % of Attack / of max HP)');
  console.log('name                   exercise          reps  rarity     target    elem     dmg%  blk%  heal%  extras          budget  per-sec');
  for (const c of [...CARD_CATALOG, ...ALL_WEAPON_SPELLS]) {
    const budget = cardBudget({ exercise: c.exercise, reps: c.baseReps, rarity: c.rarity });
    const secs = c.baseReps * EXERCISE_PROFILE[c.exercise].repSeconds;
    const extras = [c.target === 'CHAIN' ? `x${c.hits}` : '', c.shatter ? 'shatter' : '', c.stagger ? `stagger ${c.stagger}s` : ''].filter(Boolean).join(' ');
    console.log(
      `${c.name.slice(0, 22).padEnd(22)} ${c.exercise.padEnd(17)} ${String(c.baseReps).padStart(4)}  ${c.rarity.padEnd(9)}  ${TARGET_LABEL[c.target].padEnd(8)} ${(c.element ?? '-').padEnd(7)} ${String(Math.round(c.dmgPct * 100)).padStart(5)} ${String(Math.round(c.blockPct * 100)).padStart(5)} ${String(Math.round(c.healPct * 100)).padStart(5)}  ${extras.padEnd(14)} ${budget.toFixed(0).padStart(6)}  ${(budget / secs).toFixed(1).padStart(6)}`,
    );
  }
}

if (MODE === 'campaign') campaign();
else if (MODE === 'encounters') encountersTable();
else stagesTable();

if (MODE !== 'campaign') {
  console.log('\nDAMAGE DELIVERED PER BUDGET POINT  (by targeting and number of living foes at cast; at the reference Attack)');
  console.log('target      1 foe   2 foes  3 foes');
  for (const t of ['SINGLE', 'BACK', 'PIERCE', 'CHAIN', 'ALL']) {
    const cell = (n: number) => {
      const e = delivered[`${t}:${n}`];
      return e && e.budget > 50 ? (e.dmg / e.budget).toFixed(2).padStart(6) : '    - ';
    };
    console.log(`${TARGET_LABEL[t as keyof typeof TARGET_LABEL].padEnd(9)} ${cell(1)}  ${cell(2)}  ${cell(3)}`);
  }
}

export type { EncounterTemplate };
