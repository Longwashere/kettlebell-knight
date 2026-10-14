// Page-side frame benchmark: steps the ticker one frame at a time while each knight move plays.
// Times ticker.update (game logic + Pixi render submission). Returns per-move stats.
(async () => {
  const ids = __kk.knightMoves().map((m) => m.id);
  const step = () => { const t = performance.now(); __kk.call('step', 1); return performance.now() - t; };
  const stats = (a) => { const s = [...a].sort((x, y) => x - y); return { avg: +(s.reduce((x, y) => x + y, 0) / s.length).toFixed(2), p95: +s[Math.floor(s.length * 0.95)].toFixed(2), max: +s[s.length - 1].toFixed(2) }; };
  __kk.freeze(true);
  step();
  for (let i = 0; i < 60; i++) step();
  const idle = []; for (let i = 0; i < 180; i++) idle.push(step());
  const out = { idle: stats(idle), moves: {} };
  for (const id of ids) {

    __kk.call('knightMove', id, [0, 1, 2]); for (let i = 0; i < 150; i++) step();
    __kk.call('knightMove', id, [0, 1, 2]);
    const a = []; let peak = 0;
    for (let i = 0; i < 130; i++) { a.push(step()); const v = __kk.state().engine.vfx; peak = Math.max(peak, v.particles + v.effects); }
    for (let i = 0; i < 60; i++) step();
    out.moves[id] = { ...stats(a), peakObjs: peak, over16: a.filter((x) => x > 16.7).length, over33: a.filter((x) => x > 33).length };
  }
  __kk.call('resume');
  return out;
})()
