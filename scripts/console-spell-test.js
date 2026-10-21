// Spell animation + targeting test. Paste into the DevTools console on http://localhost:5173/tv (npm run dev).
//
// For every weapon spell (or the ids in ONLY) it starts a fresh trio fight with frozen monster timers, puts the
// spell in the hand, casts it through the real battle path (reps → resolveCard → the move's animation), waits
// for the animation to finish, then checks which monsters actually lost HP against what the card's targeting
// should hit:
//   SINGLE  the front foe (nearest the knight)        BACK   the rearmost foe
//   PIERCE  the front foe + the one behind it         ALL    every foe
//   CHAIN   min(hits, foes) different foes, never the same one twice in a row
// Front/behind follow where the monsters stand (their lane), not their slot number.
//
// Options (set before pasting, e.g. `window.SPELL_TEST = { only: ['spell_talon_gale'], watch: 1500 }`):
//   only       array of templateIds to test (default: every spell_*)
//   cards      true to include the battle cards (non-spell knight moves) too
//   formation  monster ids for the fight (default 'wolf,boar,green_slime')
//   watch      ms to pause between spells so you can watch each one (default 600)
// Results print as a table at the end and are left in window.SPELL_TEST_RESULTS.
(async () => {
  const kk = window.__kk;
  if (!kk) return console.error('window.__kk missing: run this on the dev server (npm run dev), /tv route');
  const opts = { formation: 'wolf,boar,green_slime', watch: 600, cards: false, only: null, ...(window.SPELL_TEST || {}) };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const poll = async (pred, ms = 4000) => {
    const end = performance.now() + ms;
    while (performance.now() < end) {
      if (pred(kk.state())) return true;
      await sleep(50);
    }
    return false;
  };

  const moves = kk.knightMoves().filter((m) => (opts.only ? opts.only.includes(m.id) : opts.cards || m.id.startsWith('spell_')));
  console.log(`%cSpell test: ${moves.length} moves vs ${opts.formation}`, 'font-weight:bold');
  const results = [];

  for (const m of moves) {
    // Fresh full-HP fight for every spell, monsters frozen so nothing interferes
    await kk.encounter(opts.formation);
    kk.freeze(true);
    await kk.idle(15000).catch(() => {});

    kk.call('giveCard', m.id);
    // A newly dealt card hands the highlight back to rep progress, so wait for it in the hand, then focus it
    await poll((s) => s.battle?.hand?.some((c) => c.templateId === m.id));
    await sleep(150);
    const focusIt = async () => {
      const idx = kk.state().battle.hand.findIndex((c) => c.templateId === m.id);
      if (idx >= 0) kk.call('focusCard', idx);
      return poll((s) => s.battle?.focusedCard?.templateId === m.id, 1500);
    };
    if (!(await focusIt()) && !(await focusIt())) {
      results.push({ spell: m.id, target: m.target, result: 'SKIP', note: 'card never reached the hand' });
      continue;
    }
    const b0 = kk.state().battle;
    const card = b0.focusedCard;
    const handCard = b0.hand.find((c) => c.templateId === m.id);
    const copies = (s) => s.battle.hand.filter((c) => c.templateId === m.id).length;
    const startCopies = copies(kk.state());
    const before = b0.monsters.map((x) => x.hp);
    // Nearest the knight first, the order PIERCE / BACK / CHAIN use
    const order = b0.monsters.map((x, i) => ({ i, lane: x.lane ?? i })).sort((a, b) => a.lane - b.lane).map((o) => o.i);
    const names = b0.monsters.map((x) => x.name);

    // Cast it: one rep at a time, re-focusing the card if the highlight wanders to another card
    for (let r = 0; r < 30 && copies(kk.state()) >= startCopies; r++) {
      const s = kk.state().battle;
      if (s.focusedCard?.templateId !== m.id) {
        const idx = s.hand.findIndex((c) => c.templateId === m.id);
        if (idx < 0) break;
        kk.call('focusCard', idx);
        await sleep(80);
      }
      kk.rep(card.exercise, 100, 1);
      await sleep(70);
    }
    const fired = copies(kk.state()) < startCopies;
    await kk.idle(20000).catch(() => {});
    await sleep(400);

    const after = kk.state().battle.monsters.map((x) => x.hp);
    const hit = order.filter((i) => after[i] < before[i]);
    const dmg = order.map((i) => `${names[i]} ${before[i] - after[i] ? '-' + (before[i] - after[i]) : '·'}`).join('  ');

    // What the targeting should have hit
    const alive = order.filter((i) => before[i] > 0);
    const hits = handCard?.hits ?? card.hits ?? 3;
    let expect;
    let ok;
    switch (m.target) {
      case 'SINGLE': expect = [alive[0]]; ok = hit.length === 1 && hit[0] === alive[0]; break;
      case 'BACK': expect = [alive[alive.length - 1]]; ok = hit.length === 1 && hit[0] === alive[alive.length - 1]; break;
      case 'PIERCE': expect = alive.slice(0, 2); ok = expect.every((i) => hit.includes(i)) && hit.length === expect.length; break;
      case 'ALL': expect = alive; ok = alive.every((i) => hit.includes(i)); break;
      case 'CHAIN': expect = `${Math.min(hits, alive.length)} different foes`; ok = hit.length === Math.min(hits, alive.length); break;
      default: expect = '?'; ok = hit.length > 0;
    }
    const noDamage = (handCard?.damage ?? 1) === 0; // pure Block / heal cards
    const result = !fired ? 'NOT CAST' : noDamage ? (hit.length ? 'FAIL' : 'PASS') : ok ? 'PASS' : 'FAIL';
    results.push({
      spell: m.id,
      target: m.target + (m.target === 'CHAIN' ? ` x${hits}` : ''),
      result,
      expected: Array.isArray(expect) ? expect.map((i) => names[i]).join(', ') : expect,
      hit: hit.map((i) => names[i]).join(', ') || '(none)',
      damage: dmg,
    });
    console.log(`${result === 'PASS' ? '✅' : result === 'FAIL' ? '❌' : '⚠️'} ${m.id.padEnd(26)} ${m.target.padEnd(6)} hit: ${hit.map((i) => names[i]).join(', ') || '(none)'}`);
    await sleep(opts.watch);
  }

  window.SPELL_TEST_RESULTS = results;
  console.table(results);
  const bad = results.filter((r) => r.result !== 'PASS');
  console.log(`%c${results.length - bad.length}/${results.length} passed`, `font-weight:bold;color:${bad.length ? '#f87171' : '#4ade80'}`);
  if (bad.length) console.table(bad);
  return results;
})();
