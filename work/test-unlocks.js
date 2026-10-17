// Card unlock reward flow test. Paste into the DevTools console on http://localhost:5173/tv (dev server).
// Sets up a fight where one swing unlocks 2 cards, checks no popup appears mid-fight, then wins the fight.
// Then press Enter on the reward screen and step through the unlock screens yourself.
(async () => {
  const kk = window.__kk;
  if (!kk) return console.error('window.__kk missing: run this on the dev server (npm run dev), /tv route');
  if (!kk.state().profile?.activeProfile) kk.call('profile.create');

  // 1. Relock the two Swing cards and put their progress one rep short
  kk.relockCards(['swing_cleave', 'swing_flow']);
  const stats = kk.getCardUnlocks().stats;
  kk.primeUnlockStats({
    exerciseReps: { ...stats.exerciseReps, SWING: 34 },        // Iron Cleave: 35 Swings
    perfectFormReps: { ...stats.perfectFormReps, SWING: 11 },  // Momentum Flow: 12 perfect Swings
  });

  // 2. Start a fight and freeze monster timers
  await kk.encounter('verdant_forager');
  kk.freeze(true);

  // 3. One perfect swing: both cards unlock, but no popup should show yet
  kk.rep('SWING', 95, 1.0);
  await new Promise((r) => setTimeout(r, 800));
  console.log('Unlocked now:', kk.getCardUnlocks().unlocked.filter((id) => id === 'swing_cleave' || id === 'swing_flow'));
  console.log('Popup mid-fight?', document.body.innerText.includes('NEW CARD UNLOCKED!') ? 'YES (bug)' : 'no (good)');

  // 4. Cast cards until the fight is won
  for (let i = 0; i < 40 && kk.state().battle?.status === 'FIGHTING'; i++) {
    await kk.cast();
    await kk.idle();
  }
  await new Promise((r) => setTimeout(r, 2500));
  console.log('Battle status:', kk.state().battle?.status, '→ press Enter to see the 2 unlocks, one per screen');
})();
