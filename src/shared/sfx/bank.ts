/**
 * Procedural sound bank: every game sound is a recipe that renders a short mono buffer (dsp.ts) the
 * first time it plays. No audio files ship; the whole bank is ~3 MB of PCM once every sound has played,
 * and battle-only sounds never render on the phone.
 *
 * Style: punchy 16-bit-era foley (layered thumps, filtered-noise swooshes, struck-metal partials) with
 * a touch of grit, rather than pure chiptune beeps. Each recipe normalises to full scale; `vol` in
 * SFX_BANK balances the mix.
 *
 * Audition with `npm run sfx` (writes work/sfx/*.wav and an index.html player).
 */
import {
  SR, type Buf, canvas, mix, noise, tone, modal, pluck, crackle, perc, env, shape, lp, hp, bp, drive,
  ring, reverb, echo, normalize, trim, declick, glide, rng, reverse,
} from './dsp';

// ---------------------------------------------------------------------------------------------
// Building blocks

/** Pitch that drops from f0 toward f1 with time constant `tc` seconds (kick / body thump). */
const drop = (f0: number, f1: number, sec: number, tc: number) => (t: number) => f1 + (f0 - f1) * Math.exp((-t * sec) / tc);

/** Body thump: sine with a fast pitch drop and a percussive tail. */
function thump(sec: number, f0: number, f1: number, tau: number, tc = 0.03): Buf {
  return perc(tone(sec, drop(f0, f1, sec, tc)), 0.002, tau);
}

/** Air swoosh: bandpassed noise whose centre rises then falls, with a bell-shaped level. */
function swoosh(sec: number, lo: number, hi: number, q = 1.2, color: 'white' | 'pink' = 'white', seed = 1, peak = 0.45): Buf {
  const b = noise(sec, color, seed);
  const bell = (t: number) => (t < peak ? Math.sin((t / peak) * Math.PI * 0.5) : Math.cos(((t - peak) / (1 - peak)) * Math.PI * 0.5));
  bp(b, (t) => lo + (hi - lo) * bell(t), q);
  return shape(b, (t) => Math.pow(bell(t), 1.6));
}

/** Short broadband transient (the "tick" at the front of a hit). */
function click(sec = 0.012, hiCut = 1500, seed = 3): Buf {
  return perc(hp(noise(sec, 'white', seed), hiCut), 0.0005, sec / 4);
}

/** Crunchy noise burst (bone, rock, armour) through a band and some drive. */
function crunch(sec: number, freq: number, tau: number, q = 0.9, amount = 4, seed = 5): Buf {
  return drive(perc(bp(noise(sec, 'white', seed), freq, q), 0.001, tau), amount);
}

/** Bubbles: short rising sine chirps at random times. */
function bubbles(sec: number, count: number, lo: number, hi: number, seed = 7): Buf {
  const out = canvas(sec);
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const f = lo + r() * (hi - lo);
    const d = 0.02 + r() * 0.04;
    mix(out, perc(tone(d, glide(f, f * 2.2)), 0.002, d / 3), r() * (sec - d), 0.4 + r() * 0.6);
  }
  return out;
}

/** Struck metal (blade ring, shield, kettlebell iron). */
const METAL: [number, number, number][] = [[1, 0.5, 1], [2.32, 0.32, 0.7], [4.25, 0.2, 0.45], [6.63, 0.12, 0.3], [9.38, 0.07, 0.2]];
const metal = (sec: number, base: number, decay = 1, seed = 2) =>
  modal(sec, base, METAL.map(([r, d, a]) => [r, d * decay, a] as [number, number, number]), seed);

/** Glass/ice ping: high inharmonic partials, very short. */
const ping = (sec: number, base: number, seed = 4) => modal(sec, base, [[1, 0.08, 1], [2.71, 0.05, 0.5], [5.1, 0.03, 0.3]], seed);

/** Formant voice: buzz source through vowel bands (growls, roars, wails). */
function voice(src: Buf, formants: [freq: number, q: number, amp: number][]): Buf {
  const out = new Float32Array(src.length);
  for (const [f, q, a] of formants) mix(out, bp(new Float32Array(src), f, q), 0, a);
  return out;
}

/** Glottal-ish buzz with jitter at a pitch curve (Hz over 0-1). */
function buzz(sec: number, pitch: (t: number) => number, jitter = 0.04, seed = 9): Buf {
  const r = rng(seed);
  let j = 0;
  return tone(sec, (t) => {
    j = j * 0.995 + (r() * 2 - 1) * jitter;
    return pitch(t) * (1 + j);
  }, 'saw');
}

const finish = (b: Buf, peak = 0.95) => trim(normalize(b, peak));

// ---------------------------------------------------------------------------------------------
// UI

const uiMove = () => {
  const b = perc(tone(0.06, 880, 'square'), 0.001, 0.02);
  mix(b, perc(tone(0.06, 1760, 'sine'), 0.001, 0.012), 0, 0.3);
  return finish(lp(b, 5000));
};

const uiSelect = () => {
  const b = canvas(0.22);
  mix(b, perc(tone(0.08, 523, 'square'), 0.001, 0.04), 0, 0.8);
  mix(b, perc(tone(0.14, 1046, 'square'), 0.001, 0.06), 0.06, 0.8);
  return finish(lp(b, 4500));
};

const equip = () => {
  const b = metal(0.5, 1250, 0.6);
  mix(b, click(0.01, 3000), 0, 0.6);
  mix(b, metal(0.4, 1710, 0.4, 5), 0.06, 0.5);
  return finish(reverb(b, 0.3, 0.2, 0.25));
};

const levelUp = () => {
  const b = canvas(0.9);
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
    const n = perc(tone(0.35, f, 'square'), 0.002, 0.12);
    mix(n, perc(tone(0.35, f * 2, 'sine'), 0.002, 0.1), 0, 0.3);
    mix(b, lp(n, 5000), i * 0.07, i === 4 ? 1 : 0.75);
  });
  return finish(reverb(b, 0.5, 0.35, 0.5));
};

const hike = () => finish(thump(0.12, 160, 90, 0.04));

/** Card cast: a snap of card stock and a short rising swish. */
const card = () => {
  const b = canvas(0.25);
  mix(b, perc(bp(noise(0.03, 'white', 11), 3500, 1.5), 0.0005, 0.008), 0, 1);
  mix(b, swoosh(0.18, 900, 3800, 1.4, 'white', 12, 0.7), 0.01, 0.7);
  return finish(b);
};

/** Victory sting: rising arpeggio into a held major chord. */
const victory = () => {
  const b = canvas(1.6);
  [392, 523.25, 659.25, 783.99].forEach((f, i) => mix(b, lp(perc(tone(0.2, f, 'square'), 0.002, 0.08), 4000), i * 0.09, 0.6));
  for (const f of [523.25, 659.25, 783.99, 1046.5]) {
    const n = env(tone(1.1, f, 'square'), [[0, 0], [0.02, 1], [0.6, 0.6], [1.1, 0]]);
    mix(b, lp(n, 3000), 0.36, 0.3);
  }
  return finish(reverb(b, 0.6, 0.35, 0.6));
};

const defeat = () => {
  const b = canvas(1.6);
  [392, 349.23, 311.13, 261.63].forEach((f, i) => mix(b, lp(env(tone(0.45, f, 'square'), [[0, 0], [0.01, 1], [0.4, 0.4], [0.45, 0]]), 2200), i * 0.28, 0.6));
  return finish(reverb(b, 0.6, 0.35, 0.6));
};

// ---------------------------------------------------------------------------------------------
// Movement

const whoosh = () => finish(swoosh(0.3, 350, 1900, 1.1, 'white', 21));

const whooshHeavy = () => {
  const b = swoosh(0.5, 160, 900, 0.9, 'pink', 22, 0.55);
  mix(b, perc(tone(0.5, glide(70, 52)), 0.18, 0.1), 0, 0.35);
  return finish(b);
};

const whooshFast = () => finish(swoosh(0.15, 1200, 4200, 1.4, 'white', 23, 0.4));

/** Whirl: four whooshes climbing in pitch (spinning flails, tornado spins). */
const spin = () => {
  const b = canvas(0.7);
  for (let i = 0; i < 4; i++) mix(b, swoosh(0.2, 400 + i * 180, 1600 + i * 500, 1.2, 'white', 30 + i), i * 0.12, 0.6 + i * 0.13);
  return finish(b);
};

const dash = () => {
  const b = canvas(0.32);
  mix(b, perc(bp(noise(0.06, 'white', 41), 2400, 0.8), 0.001, 0.015), 0, 0.5);
  mix(b, swoosh(0.28, 500, 2600, 1, 'white', 42, 0.3), 0.01, 1);
  return finish(b);
};

const jump = () => {
  const b = canvas(0.25);
  mix(b, perc(lp(noise(0.05, 'pink', 43), 900), 0.001, 0.015), 0, 0.6);
  mix(b, swoosh(0.22, 300, 1300, 1, 'white', 44, 0.35), 0.01, 0.8);
  return finish(b);
};

/** Feet landing / body hitting the floor. */
const thud = () => {
  const b = thump(0.3, 140, 48, 0.08);
  mix(b, perc(lp(noise(0.12, 'pink', 45), 700), 0.001, 0.03), 0, 0.7);
  return finish(b);
};

/** Heavy footsteps of a big monster on approach. */
const step = () => {
  const b = thump(0.25, 90, 40, 0.06, 0.02);
  mix(b, perc(lp(noise(0.1, 'brown', 46), 400), 0.001, 0.03), 0, 0.8);
  return finish(b);
};

// ---------------------------------------------------------------------------------------------
// Blades

/** Blade cut: a hissing swish into a bright steel "shing". */
const slash = () => {
  const b = canvas(0.45);
  mix(b, swoosh(0.14, 1800, 6500, 1.3, 'white', 51, 0.6), 0, 0.9);
  mix(b, metal(0.4, 2150, 0.45, 52), 0.07, 0.28);
  mix(b, perc(hp(noise(0.05, 'white', 53), 3000), 0.001, 0.012), 0.075, 0.5);
  return finish(b);
};

/** Cleave: low swish, a meaty crunch and a ringing edge. */
const slashHeavy = () => {
  const b = canvas(0.6);
  mix(b, swoosh(0.2, 700, 3200, 1.1, 'white', 54, 0.65), 0, 0.8);
  mix(b, crunch(0.12, 1300, 0.03, 0.8, 5, 55), 0.12, 0.8);
  mix(b, thump(0.3, 160, 55, 0.07), 0.12, 0.8);
  mix(b, metal(0.45, 1500, 0.5, 56), 0.12, 0.22);
  return finish(b);
};

/** Pierce: fast whip of air, a sharp tick and a short wet thunk. */
const stab = () => {
  const b = canvas(0.3);
  mix(b, swoosh(0.08, 2000, 5000, 1.5, 'white', 57, 0.8), 0, 0.6);
  mix(b, click(0.01, 2500, 58), 0.07, 0.9);
  mix(b, thump(0.18, 260, 110, 0.04, 0.015), 0.07, 0.8);
  mix(b, perc(bp(noise(0.08, 'white', 59), 900, 2), 0.002, 0.02), 0.075, 0.4);
  return finish(b);
};

/** Claw rake: three fast scrapes. */
const claw = () => {
  const b = canvas(0.36);
  for (let i = 0; i < 3; i++) {
    const s = perc(bp(noise(0.07, 'white', 60 + i), glide(5200 - i * 400, 2200), 2.2), 0.003, 0.018);
    mix(b, s, i * 0.055, 1 - i * 0.12);
    mix(b, click(0.008, 2500, 63 + i), i * 0.055 + 0.01, 0.35);
  }
  mix(b, thump(0.2, 180, 80, 0.04), 0.11, 0.5);
  return finish(b);
};

/** Bite: two tooth clicks and a wet crunch. */
const chomp = () => {
  const b = canvas(0.32);
  mix(b, perc(bp(noise(0.02, 'white', 70), 2600, 3), 0.0005, 0.004), 0, 0.8);
  mix(b, perc(bp(noise(0.02, 'white', 71), 2300, 3), 0.0005, 0.004), 0.035, 1);
  mix(b, crunch(0.15, 900, 0.035, 1.2, 6, 72), 0.035, 0.9);
  mix(b, thump(0.2, 200, 70, 0.05), 0.035, 0.7);
  return finish(b);
};

/** Whip / vine / tentacle lash: a rising swish ending in a sharp crack. */
const lash = () => {
  const b = canvas(0.4);
  mix(b, swoosh(0.16, 500, 3000, 1, 'white', 75, 0.9), 0, 0.7);
  mix(b, perc(hp(noise(0.03, 'white', 76), 1800), 0.0002, 0.004), 0.15, 1);
  mix(b, perc(bp(noise(0.12, 'white', 77), 1500, 1), 0.001, 0.025), 0.152, 0.4);
  return finish(echo(b, 0.07, 0.18, 2));
};

// ---------------------------------------------------------------------------------------------
// Impacts

/** Light hit: punchy body thump with a click and a burst of grit. */
const impact = () => {
  const b = canvas(0.3);
  mix(b, thump(0.3, 190, 58, 0.07, 0.02), 0, 1);
  mix(b, click(0.012, 2000, 80), 0, 0.5);
  mix(b, crunch(0.1, 1100, 0.022, 0.7, 3, 81), 0, 0.55);
  return finish(drive(b, 1.6));
};

/** Heavy hit: deeper thump, crunch, snap and a short room. */
const impactHeavy = () => {
  const b = canvas(0.5);
  mix(b, thump(0.5, 150, 38, 0.14, 0.025), 0, 1);
  mix(b, crunch(0.2, 850, 0.05, 0.7, 6, 82), 0, 0.8);
  mix(b, click(0.015, 2500, 83), 0, 0.6);
  mix(b, perc(lp(noise(0.4, 'brown', 84), 300), 0.002, 0.12), 0, 0.5);
  return finish(reverb(drive(b, 2), 0.35, 0.18, 0.3));
};

/** Critical / finisher: heavy hit, a ringing steel accent and a glittering tail. */
const impactCrit = () => {
  const b = canvas(0.9);
  mix(b, thump(0.6, 170, 34, 0.18, 0.03), 0, 1);
  mix(b, crunch(0.25, 1000, 0.06, 0.6, 7, 85), 0, 0.85);
  mix(b, click(0.02, 3000, 86), 0, 0.7);
  mix(b, metal(0.7, 880, 0.9, 87), 0.005, 0.35);
  const sparkle = perc(hp(crackle(0.6, 900, 88, 0.0015), 5000), 0.01, 0.18);
  mix(b, sparkle, 0.02, 0.45);
  return finish(reverb(drive(b, 2.2), 0.45, 0.22, 0.4));
};

/** Iron-on-flesh: kettlebell, mace or flail head connecting. */
const impactMetal = () => {
  const b = canvas(0.7);
  mix(b, thump(0.4, 160, 45, 0.1), 0, 1);
  mix(b, metal(0.7, 330, 0.9, 89), 0, 0.5);
  mix(b, crunch(0.12, 1200, 0.03, 0.8, 4, 90), 0, 0.5);
  return finish(drive(b, 1.5));
};

/** Knight takes a hit: dull thud plus the rattle of his armour plates. */
const hurt = () => {
  const b = canvas(0.32);
  mix(b, thump(0.25, 140, 60, 0.05), 0, 0.8);
  const r = rng(91);
  for (let i = 0; i < 5; i++) mix(b, metal(0.12, 2400 + r() * 1800, 0.12, 92 + i), 0.005 + r() * 0.09, 0.25 + r() * 0.2);
  mix(b, perc(lp(noise(0.08, 'pink', 97), 1400), 0.001, 0.02), 0, 0.5);
  return finish(b);
};

/** Fully blocked hit: bright shield clang with a short ring. */
const block = () => {
  const b = canvas(0.7);
  mix(b, modal(0.7, 620, [[1, 0.35, 1], [1.47, 0.28, 0.7], [2.09, 0.22, 0.6], [2.56, 0.18, 0.45], [3.3, 0.12, 0.35], [4.7, 0.07, 0.25]], 98), 0, 0.7);
  mix(b, click(0.015, 2500, 99), 0, 0.8);
  mix(b, thump(0.15, 220, 120, 0.03), 0, 0.5);
  return finish(reverb(drive(b, 1.4), 0.3, 0.2, 0.3));
};

/** Big stomp / body slam on the floor: sub thump, dirt and a scatter of debris. */
const stomp = () => {
  const b = canvas(0.8);
  mix(b, thump(0.6, 110, 30, 0.16, 0.03), 0, 1);
  mix(b, perc(lp(noise(0.6, 'brown', 100), 350), 0.002, 0.15), 0, 0.8);
  mix(b, crunch(0.1, 700, 0.025, 0.8, 4, 101), 0, 0.5);
  mix(b, perc(bp(crackle(0.5, 60, 102, 0.004), 1600, 1), 0.02, 0.15), 0.04, 0.5);
  return finish(drive(b, 1.6));
};

/** Earthquake: rumbling, shuddering low end with cracking rock. */
const quake = () => {
  const b = canvas(1.3);
  const rum = lp(noise(1.3, 'brown', 103), 220);
  shape(rum, (t, s) => (t < 0.1 ? t / 0.1 : Math.exp(-(s - 0.13) * 2.4)) * (0.7 + 0.3 * Math.sin(s * 2 * Math.PI * 11)));
  mix(b, rum, 0, 1);
  mix(b, thump(0.5, 90, 28, 0.2), 0, 0.9);
  mix(b, perc(bp(crackle(1.1, 45, 104, 0.006), 900, 0.8), 0.05, 0.4), 0.05, 0.6);
  return finish(drive(b, 1.8));
};

/** Ground cracking open: a run of rock snaps over a growl of rumble. */
const crack = () => {
  const b = canvas(0.7);
  const r = rng(105);
  let t = 0;
  for (let i = 0; i < 9; i++) {
    mix(b, crunch(0.04, 900 + r() * 1600, 0.008, 1.5, 5, 106 + i), t, 0.6 + r() * 0.4);
    t += 0.06 - i * 0.004;
  }
  mix(b, perc(lp(noise(0.7, 'brown', 120), 250), 0.05, 0.2), 0, 0.8);
  return finish(b);
};

/** Rock or spike bursting from the floor. */
const rock = () => {
  const b = canvas(0.45);
  mix(b, crunch(0.2, 600, 0.05, 0.7, 6, 121), 0, 1);
  mix(b, thump(0.3, 130, 50, 0.07), 0, 0.8);
  mix(b, perc(bp(crackle(0.35, 120, 122, 0.003), 2000, 1), 0.005, 0.08), 0.02, 0.5);
  return finish(b);
};

/** Wood / bark knock (treant, staves, shields of bark). */
const wood = () => {
  const b = canvas(0.35);
  mix(b, modal(0.3, 280, [[1, 0.06, 1], [2.6, 0.04, 0.6], [4.1, 0.025, 0.4]], 123), 0, 1);
  mix(b, thump(0.2, 150, 70, 0.04), 0, 0.6);
  mix(b, click(0.01, 1500, 124), 0, 0.4);
  return finish(b);
};

// ---------------------------------------------------------------------------------------------
// Elements

const explosion = () => {
  const b = canvas(1.2);
  const n = noise(1.0, 'white', 130);
  lp(n, (t) => 7000 * Math.pow(250 / 7000, Math.pow(t, 0.35)));
  perc(n, 0.004, 0.25);
  mix(b, n, 0, 1);
  mix(b, thump(0.8, 120, 28, 0.25, 0.05), 0, 1);
  mix(b, perc(lp(noise(1.1, 'brown', 131), 180), 0.01, 0.35), 0, 0.7);
  mix(b, perc(hp(crackle(0.9, 140, 132, 0.003), 1500), 0.05, 0.3), 0.06, 0.4);
  return finish(reverb(drive(b, 2.5), 0.6, 0.25, 0.5));
};

/** Fireball launch: a roaring rising whoosh with crackle. */
const fire = () => {
  const b = canvas(0.8);
  const roar = noise(0.75, 'pink', 133);
  bp(roar, glide(250, 1400, 0.7), 0.7);
  env(roar, [[0, 0], [0.15, 1], [0.5, 0.7], [0.75, 0]]);
  mix(b, roar, 0, 1);
  mix(b, perc(hp(crackle(0.7, 70, 134, 0.003), 1200), 0.05, 0.25), 0.03, 0.5);
  mix(b, env(lp(noise(0.7, 'brown', 135), 160), [[0, 0], [0.1, 1], [0.7, 0]]), 0, 0.5);
  return finish(drive(b, 1.5));
};

/** Flames bursting into life: a "fwoomp" opening fast, then crackling out. */
const fireBurst = () => {
  const b = canvas(0.8);
  const n = noise(0.7, 'pink', 136);
  lp(n, (t) => (t < 0.08 ? 200 + 4000 * (t / 0.08) : 4200 * Math.pow(500 / 4200, (t - 0.08) / 0.92)));
  perc(n, 0.02, 0.2);
  mix(b, n, 0, 1);
  mix(b, thump(0.3, 95, 40, 0.1, 0.04), 0.01, 0.7);
  mix(b, perc(hp(crackle(0.7, 110, 137, 0.003), 1000), 0.02, 0.25), 0.05, 0.6);
  return finish(drive(b, 1.6));
};

/** Ice shatter: a cold crunch spraying glassy pings. */
const ice = () => {
  const b = canvas(0.8);
  mix(b, perc(hp(noise(0.06, 'white', 140), 2500), 0.0005, 0.015), 0, 0.9);
  mix(b, thump(0.15, 300, 140, 0.03), 0, 0.4);
  const r = rng(141);
  for (let i = 0; i < 16; i++) {
    const t = Math.pow(r(), 1.8) * 0.5;
    mix(b, ping(0.2, 2400 + r() * 4200, 142 + i), t, (0.35 + r() * 0.5) * (1 - t));
  }
  return finish(reverb(b, 0.4, 0.25, 0.3));
};

/** Freezing cast: icy hiss swelling under a rising crystal glitter. */
const frost = () => {
  const b = canvas(0.9);
  const hiss = env(hp(noise(0.8, 'white', 160), 4500), [[0, 0], [0.5, 0.7], [0.8, 0]]);
  mix(b, hiss, 0, 0.5);
  [1760, 2093, 2637, 3136, 3520, 4186].forEach((f, i) => mix(b, ping(0.25, f, 161 + i), 0.06 + i * 0.09, 0.45 + i * 0.05));
  return finish(reverb(b, 0.55, 0.35, 0.45));
};

/** Toxic hiss with bubbling. */
const poison = () => {
  const b = canvas(0.8);
  const hiss = env(bp(noise(0.7, 'white', 170), 3200, 1.4), [[0, 0], [0.04, 1], [0.25, 0.6], [0.7, 0]]);
  mix(b, hiss, 0, 0.55);
  mix(b, bubbles(0.7, 18, 180, 650, 171), 0.02, 1);
  return finish(b);
};

/** Goo splat (slime, acid, mud). */
const splat = () => {
  const b = canvas(0.4);
  mix(b, perc(lp(noise(0.25, 'white', 172), 1100), 0.002, 0.05), 0, 0.9);
  mix(b, perc(tone(0.25, glide(380, 80, 0.6)), 0.003, 0.06), 0, 0.8);
  mix(b, bubbles(0.3, 6, 250, 500, 173), 0.03, 0.5);
  return finish(drive(b, 1.4));
};

/** Gurgling build-up (slimes swelling, cauldrons, bile). */
const gurgle = () => {
  const b = canvas(0.9);
  const g = bubbles(0.9, 34, 120, 420, 174);
  shape(g, (t) => Math.sin(Math.PI * t));
  mix(b, g, 0, 1);
  mix(b, env(lp(noise(0.9, 'brown', 175), 300), [[0, 0], [0.4, 1], [0.9, 0]]), 0, 0.4);
  return finish(b);
};

/** Spit / glob launch ("ptoo"). */
const spit = () => {
  const b = canvas(0.25);
  mix(b, perc(bp(noise(0.06, 'white', 176), 1600, 1.2), 0.001, 0.015), 0, 0.9);
  mix(b, perc(tone(0.18, glide(520, 180, 0.6)), 0.002, 0.04), 0.005, 0.8);
  mix(b, swoosh(0.15, 800, 2400, 1.2, 'white', 177, 0.3), 0.02, 0.4);
  return finish(b);
};

/** Electric zap: stuttering buzz and a crackling discharge. */
const zap = () => {
  const b = canvas(0.45);
  const r = rng(180);
  let f = 140;
  const z = tone(0.4, (t) => {
    if (r() < 0.004) f = 80 + r() * 260;
    return f;
  }, 'saw');
  shape(z, (t, s) => (Math.sin(s * 2 * Math.PI * 40) > -0.2 ? 1 : 0.2) * Math.exp(-s * 6));
  mix(b, hp(z, 200), 0, 0.7);
  mix(b, perc(hp(crackle(0.4, 900, 181, 0.0012), 2500), 0.001, 0.12), 0, 0.8);
  mix(b, perc(hp(noise(0.03, 'white', 182), 3000), 0.0003, 0.006), 0, 1);
  return finish(drive(b, 3));
};

/** Thunderbolt: a whip-crack strike rolling into thunder. */
const thunder = () => {
  const b = canvas(1.6);
  mix(b, perc(hp(noise(0.05, 'white', 183), 1500), 0.0002, 0.012), 0, 1);
  mix(b, perc(hp(crackle(0.25, 1400, 184, 0.0015), 1500), 0.001, 0.07), 0, 0.8);
  const roll = lp(noise(1.5, 'brown', 185), 260);
  shape(roll, (t, s) => (s < 0.03 ? s / 0.03 : Math.exp(-(s - 0.03) * 2.2)) * (0.65 + 0.35 * Math.sin(s * 2 * Math.PI * 5 + 1)));
  mix(b, roll, 0.01, 1);
  mix(b, thump(0.6, 80, 30, 0.2), 0, 0.6);
  return finish(reverb(drive(b, 2), 0.7, 0.2, 0.5));
};

/** Energy beam: a detuned humming buzz with a wobbling filter (~0.9 s). */
const beam = () => {
  const sec = 0.95;
  const b = canvas(sec);
  mix(b, tone(sec, 220, 'saw'), 0, 0.5);
  mix(b, tone(sec, 223.5, 'saw'), 0, 0.5);
  mix(b, tone(sec, 110, 'square'), 0, 0.25);
  lp(b, (t) => 1200 + 900 * Math.sin(t * sec * 2 * Math.PI * 16), 2);
  mix(b, hp(noise(sec, 'white', 186), 5000), 0, 0.12);
  env(b, [[0, 0], [0.04, 1], [0.75, 0.85], [sec, 0]]);
  return finish(b);
};

/** Magic bolt launch ("pew"). */
const shoot = () => {
  const b = canvas(0.3);
  mix(b, perc(tone(0.25, glide(1600, 260, 0.5), 'square'), 0.001, 0.06), 0, 0.5);
  mix(b, perc(tone(0.25, glide(2400, 400, 0.5)), 0.001, 0.07), 0, 0.5);
  mix(b, swoosh(0.18, 1500, 4500, 1.3, 'white', 187, 0.2), 0, 0.5);
  return finish(lp(b, 7000));
};

/** Arcane cast: a shimmering arpeggio over a rising air sweep. */
const magic = () => {
  const b = canvas(0.9);
  mix(b, swoosh(0.5, 600, 3500, 1.2, 'white', 190, 0.7), 0, 0.35);
  [659.25, 987.77, 1318.5, 1661.2, 1975.5].forEach((f, i) => {
    const n = perc(tone(0.4, (t) => f * (1 + 0.006 * Math.sin(t * 60))), 0.004, 0.12);
    mix(n, perc(tone(0.4, f * 2.01), 0.004, 0.06), 0, 0.25);
    mix(b, n, i * 0.055, 0.45);
  });
  return finish(reverb(b, 0.6, 0.35, 0.45));
};

/** Holy chime: a bell-like major chord with a bright shimmer. */
const holy = () => {
  const b = canvas(1.4);
  for (const [f, d] of [[523.25, 0], [659.25, 0.03], [783.99, 0.06], [1046.5, 0.09]] as const) {
    mix(b, modal(1.2, f, [[1, 0.6, 1], [2, 0.35, 0.4], [3, 0.2, 0.2], [4.2, 0.1, 0.12]], 200), d, 0.4);
  }
  mix(b, env(hp(noise(1, 'white', 201), 6000), [[0, 0], [0.1, 0.4], [1, 0]]), 0, 0.25);
  return finish(reverb(b, 0.75, 0.4, 0.7));
};

/** Dark curse: a sucking reverse swell into a low detuned drone. */
const dark = () => {
  const b = canvas(1.1);
  const suck = reverse(perc(lp(noise(0.45, 'pink', 210), 1800), 0.001, 0.12));
  mix(b, suck, 0, 0.7);
  const drone = canvas(0.8);
  mix(drone, tone(0.8, glide(70, 46), 'saw'), 0, 0.5);
  mix(drone, tone(0.8, glide(71.5, 47), 'saw'), 0, 0.5);
  mix(drone, tone(0.8, glide(110, 92)), 0, 0.35);
  lp(drone, glide(900, 200));
  env(drone, [[0, 0], [0.03, 1], [0.8, 0]]);
  mix(b, drone, 0.4, 1);
  return finish(reverb(drive(b, 1.8), 0.7, 0.3, 0.5));
};

/** Teleport / portal: a phasing sweep up, then a soft pop out. */
const portal = () => {
  const b = canvas(0.6);
  const up = canvas(0.4);
  mix(up, tone(0.4, glide(180, 1400, 1.4)), 0, 0.5);
  mix(up, tone(0.4, glide(184, 1430, 1.4)), 0, 0.5);
  ring(up, 37, 0.5);
  env(up, [[0, 0], [0.25, 1], [0.4, 0]]);
  mix(b, up, 0, 0.6);
  mix(b, swoosh(0.4, 500, 4000, 1.2, 'white', 211, 0.75), 0, 0.5);
  mix(b, perc(tone(0.15, glide(900, 300)), 0.002, 0.03), 0.38, 0.5);
  return finish(reverb(b, 0.5, 0.3, 0.3));
};

/** Ritual circle humming to life. */
const rune = () => {
  const b = canvas(1.0);
  for (const [f, a] of [[110, 0.6], [165, 0.4], [220, 0.3], [1760, 0.08], [2640, 0.05]] as const) mix(b, tone(1.0, f), 0, a);
  shape(b, (t, s) => (0.75 + 0.25 * Math.sin(s * 2 * Math.PI * 6)) * Math.sin(Math.PI * Math.min(1, t * 1.2)));
  return finish(reverb(b, 0.6, 0.3, 0.4));
};

/** Healing: a soft rising sparkle. */
const heal = () => {
  const b = canvas(1.0);
  [1046.5, 1318.5, 1568, 2093, 2637].forEach((f, i) => {
    const n = env(tone(0.5, f), [[0, 0], [0.02, 1], [0.5, 0]]);
    mix(n, env(tone(0.5, f * 1.5), [[0, 0], [0.02, 0.2], [0.3, 0]]), 0, 1);
    mix(b, n, i * 0.08, 0.35);
  });
  mix(b, env(hp(noise(0.8, 'white', 220), 7000), [[0, 0], [0.3, 0.5], [0.8, 0]]), 0, 0.3);
  return finish(reverb(b, 0.7, 0.4, 0.5));
};

/** Ward going up: a shimmering glide and a soft plate clank. */
const ward = () => {
  const b = canvas(0.8);
  const sh = env(tone(0.6, glide(500, 1250, 0.6)), [[0, 0], [0.05, 1], [0.6, 0]]);
  ring(sh, 9, 0.35);
  mix(b, sh, 0, 0.45);
  mix(b, modal(0.6, 740, [[1, 0.3, 1], [2.1, 0.2, 0.6], [3.4, 0.1, 0.4]], 221), 0.08, 0.55);
  mix(b, click(0.01, 2500, 222), 0.08, 0.4);
  return finish(reverb(b, 0.5, 0.3, 0.4));
};

/** Power-up / rage: a filter opening on a rising chord into a bright release. */
const buff = () => {
  const b = canvas(1.0);
  const chord = canvas(0.7);
  for (const f of [130.8, 196, 261.6, 329.6]) mix(chord, tone(0.7, glide(f * 0.75, f, 0.5), 'saw'), 0, 0.3);
  lp(chord, glide(300, 5000, 1.2), 1.5);
  env(chord, [[0, 0], [0.4, 1], [0.7, 0]]);
  mix(b, chord, 0, 0.8);
  mix(b, swoosh(0.6, 400, 4000, 1, 'white', 230, 0.9), 0, 0.4);
  mix(b, perc(hp(crackle(0.4, 500, 231, 0.0015), 5000), 0.005, 0.15), 0.55, 0.5);
  return finish(reverb(drive(b, 1.5), 0.5, 0.25, 0.4));
};

/** Charge-up riser (~0.9 s): pitch, filter and tremolo all climbing. */
function riser(sec: number, seed: number): Buf {
  const b = canvas(sec);
  const curve = glide(110, 880, 1.6);
  mix(b, tone(sec, curve, 'saw'), 0, 0.4);
  mix(b, tone(sec, (t) => curve(t) * 1.005, 'saw'), 0, 0.4);
  lp(b, glide(400, 6000, 1.3), 2);
  let ph = 0;
  shape(b, (t) => {
    ph += (6 + 30 * t * t) / SR;
    return t * (0.6 + 0.4 * Math.sin(ph * 2 * Math.PI));
  });
  mix(b, env(bp(noise(sec, 'white', seed), glide(800, 7000), 1.2), [[0, 0], [sec, 0.7]]), 0, 0.6);
  return finish(declick(b, 0.002, 0.03));
}
const charge = () => riser(0.9, 240);
const chargeLong = () => riser(1.7, 241);

/** Telegraph before a floor strike: two ominous low pulses with a glint. */
const warn = () => {
  const b = canvas(0.7);
  for (const t of [0, 0.22]) {
    const p = lp(perc(tone(0.25, glide(140, 90), 'square'), 0.005, 0.08), 600);
    mix(b, p, t, 0.8);
  }
  mix(b, ping(0.3, 1800, 242), 0.01, 0.25);
  return finish(reverb(b, 0.5, 0.25, 0.3));
};

// ---------------------------------------------------------------------------------------------
// Projectiles

/** Throw / launch ("thwip"). */
const toss = () => {
  const b = swoosh(0.18, 900, 3500, 1.3, 'white', 250, 0.3);
  mix(b, click(0.006, 2000, 251), 0, 0.3);
  return finish(b);
};

/** Bow release: string twang plus the arrow's whistle. */
const arrow = () => {
  const b = canvas(0.45);
  mix(b, perc(lp(pluck(0.25, 165, 0.99, 252), 2500), 0.001, 0.06), 0, 0.8);
  const w = env(tone(0.35, glide(2400, 1700)), [[0, 0], [0.04, 1], [0.35, 0]]);
  mix(b, w, 0.02, 0.15);
  mix(b, swoosh(0.3, 1500, 4000, 2, 'white', 253, 0.3), 0.02, 0.5);
  return finish(b);
};

/** Falling projectile whistle (meteors, boulders, dive-bombs). */
const whistle = () => {
  const b = canvas(0.75);
  const w = tone(0.7, glide(1800, 500, 1.2));
  mix(w, hp(noise(0.7, 'white', 254), 2000), 0, 0.15);
  env(w, [[0, 0], [0.15, 0.6], [0.6, 1], [0.7, 0]]);
  mix(b, w, 0, 1);
  return finish(b);
};

/** Web / sticky shot: a rubbery stretch. */
const web = () => {
  const b = canvas(0.4);
  mix(b, perc(tone(0.25, glide(260, 900, 0.7), 'tri'), 0.005, 0.07), 0, 0.6);
  mix(b, swoosh(0.25, 1200, 3000, 2, 'white', 255, 0.4), 0, 0.6);
  mix(b, perc(lp(noise(0.12, 'white', 256), 1400), 0.002, 0.03), 0.18, 0.6);
  return finish(b);
};

/** Wet grab (tentacles, engulfing goo, mummy wraps tightening). */
const squelch = () => {
  const b = canvas(0.45);
  const n = lp(noise(0.4, 'white', 257), (t) => 600 + 900 * Math.sin(t * 25) ** 2, 3);
  perc(n, 0.005, 0.1);
  mix(b, n, 0, 1);
  mix(b, bubbles(0.35, 8, 150, 350, 258), 0, 0.6);
  return finish(drive(b, 1.3));
};

/** Water crashing on a body: a wet slap, a spray of droplets and a bubbling wash. */
const splash = () => {
  const b = canvas(0.8);
  mix(b, perc(lp(noise(0.3, 'white', 290), 2500), 0.002, 0.06), 0, 1);
  mix(b, thump(0.25, 160, 60, 0.05), 0, 0.6);
  const r = rng(291);
  for (let i = 0; i < 14; i++) {
    const f = 1200 + r() * 2600;
    mix(b, perc(tone(0.04, glide(f, f * 1.5)), 0.001, 0.01), 0.04 + r() * 0.4, 0.15 + r() * 0.2);
  }
  mix(b, env(bp(noise(0.7, 'pink', 292), 900, 0.7), [[0, 0], [0.05, 0.6], [0.7, 0]]), 0.03, 0.6);
  mix(b, bubbles(0.5, 10, 200, 600, 293), 0.1, 0.5);
  return finish(b);
};

/** Rushing water: a wave rolling in (~1.2 s). */
const wave = () => {
  const sec = 1.3;
  const w = noise(sec, 'pink', 294);
  lp(w, (t) => 500 + 2500 * Math.sin(Math.PI * Math.min(1, t * 1.2)));
  shape(w, (t, s) => Math.sin(Math.PI * Math.min(1, t * 1.15)) * (0.8 + 0.2 * Math.sin(s * 2 * Math.PI * 3)));
  mix(w, bubbles(sec, 20, 180, 700, 295), 0, 0.3);
  return finish(w);
};

// ---------------------------------------------------------------------------------------------
// Monster voices

/** Low beast growl (wolves, boars, beasts). */
const growl = () => {
  const sec = 0.8;
  const src = buzz(sec, glide(78, 64), 0.08, 260);
  mix(src, noise(sec, 'pink', 261), 0, 0.5);
  ring(src, 28, 0.6);
  const v = voice(src, [[420, 3, 1], [900, 4, 0.6], [2300, 6, 0.25]]);
  env(v, [[0, 0], [0.12, 1], [0.55, 0.8], [sec, 0]]);
  return finish(drive(v, 2.5));
};

/** Big roar (bosses, titans, dragons): an opening vowel that drops in pitch. */
const roar = () => {
  const sec = 1.3;
  const src = buzz(sec, (t) => 120 * Math.pow(0.6, t) * (1 + 0.15 * Math.sin(t * 9)), 0.1, 262);
  mix(src, noise(sec, 'pink', 263), 0, 0.7);
  ring(src, 33, 0.5);
  const out = canvas(sec);
  mix(out, bp(new Float32Array(src), (t) => 450 + 350 * Math.sin(Math.PI * Math.min(1, t * 1.4)), 2.5), 0, 1);
  mix(out, bp(new Float32Array(src), (t) => 1000 + 500 * Math.sin(Math.PI * Math.min(1, t * 1.4)), 3), 0, 0.7);
  mix(out, bp(new Float32Array(src), 2600, 5), 0, 0.3);
  mix(out, lp(new Float32Array(src), 160), 0, 0.5);
  env(out, [[0, 0], [0.15, 1], [0.8, 0.8], [sec, 0]]);
  return finish(reverb(drive(out, 3.5), 0.7, 0.25, 0.5));
};

/** High shriek (bats, harpies, wraiths, birds). */
const screech = () => {
  const sec = 0.6;
  const s = tone(sec, (t) => (2000 + 600 * Math.sin(t * Math.PI)) * (1 + 0.04 * Math.sin(t * sec * 2 * Math.PI * 38)), 'saw');
  const v = voice(s, [[2400, 4, 1], [3600, 5, 0.6], [1300, 3, 0.4]]);
  mix(v, bp(noise(sec, 'white', 264), 3200, 2), 0, 0.4);
  env(v, [[0, 0], [0.03, 1], [0.35, 0.7], [sec, 0]]);
  return finish(drive(v, 2.5));
};

/** Hiss (serpents, cats, steam). */
const hiss = () => {
  const b = hp(noise(0.7, 'white', 265), 2800);
  bp(b, 5000, 0.7);
  env(b, [[0, 0], [0.08, 1], [0.45, 0.7], [0.7, 0]]);
  shape(b, (_t, s) => 0.85 + 0.15 * Math.sin(s * 2 * Math.PI * 23));
  return finish(b);
};

/** Bone clatter (skeletons, liches). */
const rattle = () => {
  const b = canvas(0.55);
  const r = rng(266);
  for (let i = 0; i < 14; i++) {
    const f = 900 + r() * 1300;
    const knock = modal(0.06, f, [[1, 0.018, 1], [2.3, 0.01, 0.5]], 267 + i);
    mix(knock, click(0.004, 1500, 300 + i), 0, 0.4);
    mix(b, knock, Math.pow(r(), 1.3) * 0.45, 0.4 + r() * 0.6);
  }
  return finish(b);
};

/** Ghostly wail: a wavering "ooo" with a long cold tail. */
const wail = () => {
  const sec = 1.2;
  const src = tone(sec, (t) => (380 + 160 * Math.sin(t * Math.PI)) * (1 + 0.03 * Math.sin(t * sec * 2 * Math.PI * 5.5)), 'tri');
  mix(src, noise(sec, 'pink', 268), 0, 0.15);
  const v = voice(src, [[350, 4, 1], [800, 5, 0.5], [2400, 8, 0.15]]);
  env(v, [[0, 0], [0.25, 1], [0.8, 0.7], [sec, 0]]);
  return finish(reverb(v, 0.85, 0.5, 0.8));
};

/** Insect swarm buzz. */
const swarm = () => {
  const sec = 0.9;
  const b = canvas(sec);
  const r = rng(269);
  for (let i = 0; i < 6; i++) {
    const f = 170 + r() * 90;
    const v = tone(sec, (t) => f * (1 + 0.03 * Math.sin(t * 20 + i)), 'saw');
    ring(v, 25 + r() * 15, 0.6);
    mix(b, v, 0, 0.3);
  }
  bp(b, 1100, 0.8);
  env(b, [[0, 0], [0.2, 1], [0.6, 0.9], [sec, 0]]);
  return finish(b);
};

/** Two wing beats. */
const flap = () => {
  const b = canvas(0.45);
  for (const t of [0, 0.17]) {
    const f = lp(noise(0.12, 'pink', 270 + t * 10), 900);
    env(f, [[0, 0], [0.03, 1], [0.12, 0]]);
    mix(b, f, t, 1);
    mix(b, thump(0.1, 120, 70, 0.025), t + 0.02, 0.3);
  }
  return finish(b);
};

/** Monster defeated: a sinking groan and a dissolving puff. */
const death = () => {
  const b = canvas(1.0);
  const groan = voice(buzz(0.6, glide(120, 55), 0.06, 271), [[500, 3, 1], [1100, 4, 0.5]]);
  env(groan, [[0, 0], [0.05, 1], [0.6, 0]]);
  mix(b, groan, 0, 0.7);
  mix(b, thump(0.4, 110, 40, 0.12), 0.25, 0.8);
  const puff = env(lp(noise(0.6, 'pink', 272), glide(3000, 300)), [[0, 0], [0.05, 1], [0.6, 0]]);
  mix(b, puff, 0.25, 0.6);
  mix(b, perc(hp(crackle(0.5, 300, 273, 0.002), 4000), 0.05, 0.2), 0.3, 0.35);
  return finish(reverb(drive(b, 1.6), 0.5, 0.25, 0.4));
};

/** Mechanical/clockwork whirr (golems, constructs, siege gear). */
const gears = () => {
  const b = canvas(0.6);
  const r = rng(274);
  for (let i = 0; i < 12; i++) mix(b, modal(0.05, 1800 + r() * 800, [[1, 0.01, 1], [1.9, 0.008, 0.5]], 275 + i), i * 0.04, 0.6);
  mix(b, env(bp(tone(0.6, glide(90, 140), 'square'), 500, 2), [[0, 0], [0.1, 1], [0.5, 0.6], [0.6, 0]]), 0, 0.4);
  return finish(b);
};

/** Crow caw / harsh call (ravens, cultist familiars). */
const caw = () => {
  const b = canvas(0.5);
  for (const t of [0, 0.22]) {
    const v = voice(buzz(0.18, glide(620, 480), 0.05, 276), [[1400, 3, 1], [2600, 4, 0.5]]);
    mix(v, bp(noise(0.18, 'white', 277), 2000, 2), 0, 0.3);
    env(v, [[0, 0], [0.02, 1], [0.18, 0]]);
    mix(b, drive(v, 3), t, 1);
  }
  return finish(b);
};

/** Squeaky critter chitter (rats, imps, goblins). */
const chitter = () => {
  const b = canvas(0.4);
  const r = rng(278);
  for (let i = 0; i < 5; i++) {
    const f = 1800 + r() * 900;
    mix(b, perc(tone(0.05, glide(f, f * 1.3), 'square'), 0.002, 0.015), i * 0.06, 0.6);
  }
  return finish(lp(b, 6000));
};

// ---------------------------------------------------------------------------------------------
// Registry

export interface SfxDef {
  render: () => Buf;
  /** Mix level (recipes normalise to full scale). */
  vol: number;
  /** Random ± playback-rate spread so repeats don't sound stamped out. */
  spread?: number;
}

export const SFX_BANK = {
  // UI
  ui_move: { render: uiMove, vol: 0.22, spread: 0 },
  ui_select: { render: uiSelect, vol: 0.28, spread: 0 },
  equip: { render: equip, vol: 0.4 },
  level_up: { render: levelUp, vol: 0.4, spread: 0 },
  hike: { render: hike, vol: 0.3 },
  card: { render: card, vol: 0.35 },
  victory: { render: victory, vol: 0.45, spread: 0 },
  defeat: { render: defeat, vol: 0.45, spread: 0 },
  // movement
  whoosh: { render: whoosh, vol: 0.45 },
  whoosh_heavy: { render: whooshHeavy, vol: 0.55 },
  whoosh_fast: { render: whooshFast, vol: 0.4 },
  spin: { render: spin, vol: 0.5 },
  dash: { render: dash, vol: 0.45 },
  jump: { render: jump, vol: 0.4 },
  thud: { render: thud, vol: 0.55 },
  step: { render: step, vol: 0.5 },
  // blades & natural weapons
  slash: { render: slash, vol: 0.55 },
  slash_heavy: { render: slashHeavy, vol: 0.65 },
  stab: { render: stab, vol: 0.55 },
  claw: { render: claw, vol: 0.55 },
  chomp: { render: chomp, vol: 0.65 },
  lash: { render: lash, vol: 0.55 },
  // impacts
  impact: { render: impact, vol: 0.6 },
  impact_heavy: { render: impactHeavy, vol: 0.75 },
  impact_crit: { render: impactCrit, vol: 0.8 },
  impact_metal: { render: impactMetal, vol: 0.6 },
  hurt: { render: hurt, vol: 0.4 },
  block: { render: block, vol: 0.6 },
  stomp: { render: stomp, vol: 0.75 },
  quake: { render: quake, vol: 0.75 },
  crack: { render: crack, vol: 0.6 },
  rock: { render: rock, vol: 0.55 },
  wood: { render: wood, vol: 0.55 },
  // elements & magic
  explosion: { render: explosion, vol: 0.8 },
  fire: { render: fire, vol: 0.55 },
  fire_burst: { render: fireBurst, vol: 0.65 },
  ice: { render: ice, vol: 0.55 },
  frost: { render: frost, vol: 0.45 },
  poison: { render: poison, vol: 0.5 },
  splat: { render: splat, vol: 0.55 },
  gurgle: { render: gurgle, vol: 0.45 },
  spit: { render: spit, vol: 0.5 },
  zap: { render: zap, vol: 0.5 },
  thunder: { render: thunder, vol: 0.75 },
  beam: { render: beam, vol: 0.4 },
  shoot: { render: shoot, vol: 0.4 },
  magic: { render: magic, vol: 0.45 },
  holy: { render: holy, vol: 0.45 },
  dark: { render: dark, vol: 0.6 },
  portal: { render: portal, vol: 0.45 },
  rune: { render: rune, vol: 0.4 },
  heal: { render: heal, vol: 0.4 },
  ward: { render: ward, vol: 0.45 },
  buff: { render: buff, vol: 0.5 },
  charge: { render: charge, vol: 0.4, spread: 0 },
  charge_long: { render: chargeLong, vol: 0.4, spread: 0 },
  warn: { render: warn, vol: 0.45 },
  // projectiles
  toss: { render: toss, vol: 0.4 },
  arrow: { render: arrow, vol: 0.5 },
  whistle: { render: whistle, vol: 0.35 },
  web: { render: web, vol: 0.5 },
  squelch: { render: squelch, vol: 0.5 },
  splash: { render: splash, vol: 0.6 },
  wave: { render: wave, vol: 0.55 },
  // monster voices
  growl: { render: growl, vol: 0.5 },
  roar: { render: roar, vol: 0.6 },
  screech: { render: screech, vol: 0.4 },
  hiss: { render: hiss, vol: 0.4 },
  rattle: { render: rattle, vol: 0.5 },
  wail: { render: wail, vol: 0.45 },
  swarm: { render: swarm, vol: 0.4 },
  flap: { render: flap, vol: 0.5 },
  caw: { render: caw, vol: 0.4 },
  chitter: { render: chitter, vol: 0.3 },
  gears: { render: gears, vol: 0.4 },
  death: { render: death, vol: 0.55 },
} satisfies Record<string, SfxDef>;

export type SoundId = keyof typeof SFX_BANK;

/** Legacy names kept for the phone/lab call sites. */
export const SFX_ALIASES = { swing: 'whoosh', hit: 'impact', crit: 'impact_heavy' } as const satisfies Record<string, SoundId>;

export type SfxName = SoundId | keyof typeof SFX_ALIASES;

export const resolveSfx = (name: SfxName): SoundId => (name in SFX_ALIASES ? SFX_ALIASES[name as keyof typeof SFX_ALIASES] : name as SoundId);

export { SR };
