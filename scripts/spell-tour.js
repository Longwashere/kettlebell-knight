// Card tour: plays every card the knight can use (all CARD_CATALOG attacks incl. starters, then every weapon
// spell incl. secret-trial spells) against goblins and an orc in the Verdant Forest, with a 3-second on-screen
// countdown before the first one, then back to back.
//
// Usage: `npm run dev`, open http://localhost:5173/tv, open DevTools and paste this whole file into the console.
//   window.__spellTour.stop()      stop after the current card
//   window.__spellTour.start(12)   restart from card #12 (1-based)
//   window.__spellTour.only('spell_undertow', 'starter_swing')   play just these
//   window.__spellTour.cards() / .spells()   play only the attack cards / only the weapon spells
(() => {
  const kk = window.__kk;
  if (!kk) throw new Error('window.__kk is missing: run the dev server (npm run dev) and open /tv');

  const MONSTERS = ['goblin', 'orc', 'goblin']; // there's no ogre in the bestiary; the Orc Berserker stands in
  const MAP = 'VERDANT_FOREST';
  const COUNTDOWN = 3;

  let stopped = false;

  const banner = document.getElementById('kk-spell-tour') ?? document.createElement('div');
  banner.id = 'kk-spell-tour';
  Object.assign(banner.style, {
    // Far left, in the sky between the knight's HUD and the battle log, clear of the fighters
    position: 'fixed', top: '26%', left: '8px', zIndex: 99999, maxWidth: '22vw',
    padding: '8px 10px', background: 'rgba(15,14,23,0.85)', border: '2px solid #F4B41A', color: '#F4B41A',
    font: 'bold 14px monospace', textAlign: 'left', pointerEvents: 'none', whiteSpace: 'pre-wrap',
  });
  document.body.appendChild(banner);
  const show = (text) => { banner.textContent = text; banner.style.display = text ? 'block' : 'none'; };

  // The game's own targeting (src/shared/combat.ts), loaded through the dev server
  const rules = Promise.all([
    import('/src/shared/combat.ts'),
    import('/src/types/battle.ts'),
    import('/src/types/weaponSpells.ts'),
  ]).then(([combat, { CARD_CATALOG }, { ALL_WEAPON_SPELLS }]) => ({
    combat,
    templates: new Map([...CARD_CATALOG, ...ALL_WEAPON_SPELLS].map((c) => [c.templateId, c])),
  }));

  /** Slots a real cast of `id` hits, in order: resolveCard from the front target, as BattleScreen does. */
  async function naturalTargets(id) {
    const { combat, templates } = await rules;
    const card = templates.get(id);
    if (!card) return undefined;
    // Untouchable stand-ins of the current lineup, so nothing dies or blocks and every hit is reported
    const monsters = kk.state().battle.monsters.map((m, i) => ({
      ...m, lane: m.lane ?? i, isAlive: true, currentHp: 1e9, maxHp: 1e9, block: 0, intent: { ...m.intent },
    }));
    const res = combat.resolveCard(card, monsters, combat.frontTarget(monsters), { power: 80, form: 1 });
    return res.hits.map((h) => h.index);
  }

  async function setup() {
    show('Loading goblins & orc…');
    await kk.encounter(MONSTERS);
    kk.background(MAP);
    kk.freeze(true); // monsters don't take turns while we watch
    await kk.ready();
  }

  async function play(ids, from = 1) {
    stopped = false;
    await setup();
    const moves = kk.knightMoves();
    const rarityOf = Object.fromEntries(moves.map((m) => [m.id, m.rarity]));
    for (let i = from - 1; i < ids.length && !stopped; i++) {
      const id = ids[i];
      const kind = id.startsWith('spell_') ? 'SPELL' : 'CARD';
      const name = id.replace(/^spell_/, '').replace(/_/g, ' ').toUpperCase();
      const label = `#${i + 1}/${ids.length}  ${name}\n${kind} · ${(rarityOf[id] ?? '').toUpperCase()}`;
      // Countdown only before the first cast (time to start recording), then everything plays back to back
      for (let n = i === from - 1 ? COUNTDOWN : 0; n > 0 && !stopped; n--) {
        show(`${label}\n${n}`);
        await kk.sleep(1000);
      }
      if (stopped) break;
      show(label);
      console.log(`%c[spell tour] ${label} (${id})`, 'color:#F4B41A;font-weight:bold');
      try {
        kk.knightMove(id, await naturalTargets(id));
        await kk.sleep(50);
        await kk.idle(20000, 150);
      } catch (err) {
        console.error(`[spell tour] ${id} failed:`, err);
      }
    }
    show(stopped ? 'Spell tour stopped' : 'Spell tour done');
    console.log('[spell tour]', stopped ? 'stopped' : 'done');
    setTimeout(() => show(''), 3000);
  }

  // Every knight move is a card: CARD_CATALOG attacks first, then weapon spells
  const isSpell = (id) => id.startsWith('spell_');
  const allCards = () => {
    const ids = kk.knightMoves().map((m) => m.id);
    return [...ids.filter((id) => !isSpell(id)), ...ids.filter(isSpell)];
  };

  window.__spellTour = {
    stop: () => { stopped = true; },
    start: (from = 1) => play(allCards(), from),
    only: (...ids) => play(ids),
    cards: (from = 1) => play(allCards().filter((id) => !isSpell(id)), from),
    spells: (from = 1) => play(allCards().filter(isSpell), from),
    list: allCards,
  };

  const ids = allCards();
  console.log(`[spell tour] ${ids.length} cards (${ids.filter((id) => !isSpell(id)).length} attacks, ${ids.filter(isSpell).length} spells):`, ids);
  play(ids);
})();
