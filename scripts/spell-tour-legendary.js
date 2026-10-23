// Legendary spell tour: plays only the legendary-rarity weapon spells against goblins and an orc in the
// Verdant Forest, with a 3-second on-screen countdown before the first one, then back to back. (scripts/spell-tour.js plays them all.)
//
// Usage: `npm run dev`, open http://localhost:5173/tv, open DevTools and paste this whole file into the console.
//   window.__legendaryTour.stop()      stop after the current spell
//   window.__legendaryTour.start(12)   restart from spell #12 (1-based)
//   window.__legendaryTour.only('spell_undertow', 'spell_brood_sac')   play just these
(() => {
  const kk = window.__kk;
  if (!kk) throw new Error('window.__kk is missing: run the dev server (npm run dev) and open /tv');

  const MONSTERS = ['goblin', 'orc', 'goblin']; // there's no ogre in the bestiary; the Orc Berserker stands in
  const MAP = 'VERDANT_FOREST';
  const COUNTDOWN = 3;

  let stopped = false;

  const banner = document.getElementById('kk-legendary-tour') ?? document.createElement('div');
  banner.id = 'kk-legendary-tour';
  Object.assign(banner.style, {
    // Far left, in the sky between the knight's HUD and the battle log, clear of the fighters
    position: 'fixed', top: '26%', left: '8px', zIndex: 99999, maxWidth: '22vw',
    padding: '8px 10px', background: 'rgba(15,14,23,0.85)', border: '2px solid #FF8A00', color: '#FF8A00',
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
    for (let i = from - 1; i < ids.length && !stopped; i++) {
      const id = ids[i];
      const label = `#${i + 1}/${ids.length}  ${id.replace(/^spell_/, '').replace(/_/g, ' ').toUpperCase()}`;
      // Countdown only before the first cast (time to start recording), then everything plays back to back
      for (let n = i === from - 1 ? COUNTDOWN : 0; n > 0 && !stopped; n--) {
        show(`${label}\n${n}`);
        await kk.sleep(1000);
      }
      if (stopped) break;
      show(label);
      console.log(`%c[legendary tour] ${label} (${id})`, 'color:#FF8A00;font-weight:bold');
      try {
        kk.knightMove(id, await naturalTargets(id));
        await kk.sleep(50);
        await kk.idle(20000, 150);
      } catch (err) {
        console.error(`[legendary tour] ${id} failed:`, err);
      }
    }
    show(stopped ? 'Legendary tour stopped' : 'Legendary tour done');
    console.log('[legendary tour]', stopped ? 'stopped' : 'done');
    setTimeout(() => show(''), 3000);
  }

  const allSpells = () => kk.knightMoves().filter((m) => m.id.startsWith('spell_') && m.rarity === 'legendary').map((m) => m.id);

  window.__legendaryTour = {
    stop: () => { stopped = true; },
    start: (from = 1) => play(allSpells(), from),
    only: (...ids) => play(ids),
    list: allSpells,
  };

  const ids = allSpells();
  console.log(`[legendary tour] ${ids.length} spells:`, ids);
  play(ids);
})();
