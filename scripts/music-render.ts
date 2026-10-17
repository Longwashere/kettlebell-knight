/**
 * Modern Powwow-Step Workout Soundtrack Generator — Clean EDM / Club Production
 * -----------------------------------------------------------------------------
 * Eliminates all 32-bit retro chiptune, bitcrushing, and robotic vocal synthesis.
 * Delivers clean, heavy, modern electronic powwow-step:
 *  - Punchy modern club drums (deep kick, massive layered snare/clap, crisp hats)
 *  - Deep acoustic powwow drum circle physical model (warm wood resonance & room space)
 *  - 130 BPM Moombahton / Powwow-step bounce (syncopated kicks and honor beat drops)
 *  - Clean gliding 808 sub-bass (pure, room-shaking low end)
 *  - Melodic Native flute / lead synth with natural breath & vibrato
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SR = 44100;
const BPM = 130;
const BEAT_SEC = 60 / BPM; // ~0.4615s
const BAR_SEC = BEAT_SEC * 4; // ~1.846s
const TOTAL_BARS = 32; // ~59s loop
const TOTAL_SEC = TOTAL_BARS * BAR_SEC;
const TOTAL_SAMPLES = Math.round(TOTAL_SEC * SR);

console.log(`[Music] Rendering clean modern Powwow-Step: ${BPM} BPM, ${TOTAL_BARS} bars (${TOTAL_SEC.toFixed(1)}s)`);

class StereoBuffer {
  readonly left: Float32Array;
  readonly right: Float32Array;
  readonly length: number;

  constructor(length: number) {
    this.length = length;
    this.left = new Float32Array(length);
    this.right = new Float32Array(length);
  }

  mix(srcL: Float32Array, srcR: Float32Array, startSample: number, gain = 1.0) {
    const end = Math.min(this.length, startSample + srcL.length);
    for (let i = Math.max(0, startSample), s = 0; i < end; i++, s++) {
      this.left[i] += srcL[s] * gain;
      this.right[i] += srcR[s] * gain;
    }
  }

  mixMono(src: Float32Array, startSample: number, pan = 0, gain = 1.0) {
    const angle = ((Math.max(-1, Math.min(1, pan)) + 1) * Math.PI) / 4;
    const gainL = Math.cos(angle) * gain;
    const gainR = Math.sin(angle) * gain;
    const end = Math.min(this.length, startSample + src.length);
    for (let i = Math.max(0, startSample), s = 0; i < end; i++, s++) {
      const v = src[s];
      this.left[i] += v * gainL;
      this.right[i] += v * gainR;
    }
  }

  normalize(peak = 0.95) {
    let max = 0;
    for (let i = 0; i < this.length; i++) {
      const al = Math.abs(this.left[i]);
      const ar = Math.abs(this.right[i]);
      if (al > max) max = al;
      if (ar > max) max = ar;
    }
    if (max > 0) {
      const scale = peak / max;
      for (let i = 0; i < this.length; i++) {
        this.left[i] *= scale;
        this.right[i] *= scale;
      }
    }
  }
}

function makeRng(seed = 54321) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = makeRng(101);

// 2-pole clean biquad filter
function biquad(buf: Float32Array, type: 'lp' | 'hp' | 'bp', freq: number, q = 0.707): Float32Array {
  const out = new Float32Array(buf.length);
  const w0 = (2 * Math.PI * Math.min(SR * 0.45, Math.max(20, freq))) / SR;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = sinW0 / (2 * Math.max(0.01, q));

  let b0 = 0, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;
  if (type === 'lp') {
    b0 = (1 - cosW0) / 2; b1 = 1 - cosW0; b2 = (1 - cosW0) / 2;
    a0 = 1 + alpha; a1 = -2 * cosW0; a2 = 1 - alpha;
  } else if (type === 'hp') {
    b0 = (1 + cosW0) / 2; b1 = -(1 + cosW0); b2 = (1 + cosW0) / 2;
    a0 = 1 + alpha; a1 = -2 * cosW0; a2 = 1 - alpha;
  } else {
    b0 = alpha; b1 = 0; b2 = -alpha;
    a0 = 1 + alpha; a1 = -2 * cosW0; a2 = 1 - alpha;
  }

  const invA0 = 1 / a0;
  b0 *= invA0; b1 *= invA0; b2 *= invA0;
  a1 *= invA0; a2 *= invA0;

  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < buf.length; i++) {
    const x0 = buf[i];
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    out[i] = y0;
  }
  return out;
}

// Subtle tape warmth (NOT distortion, just smooth musical saturation)
function warm(buf: Float32Array, gain = 1.2): Float32Array {
  const out = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) {
    const x = buf[i] * gain;
    out[i] = x / (1 + Math.abs(x) * 0.4);
  }
  return out;
}

// Schroeder Reverb for warm room acoustics
function roomReverb(buf: Float32Array, wet = 0.25, decay = 0.6): Float32Array {
  const tail = Math.round(decay * SR);
  const out = new Float32Array(buf.length + tail);
  out.set(buf);

  const delays = [1116, 1188, 1277, 1356].map(d => Math.round((d * SR) / 44100));
  for (const d of delays) {
    const fb = 0.75;
    for (let i = 0; i < buf.length; i++) {
      if (i + d < out.length) out[i + d] += out[i] * fb * wet * 0.25;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Instrument Synthesizers
// ---------------------------------------------------------------------------------------------

/**
 * 1. Warm Acoustic Powwow Grand Drum:
 * Realistic physical model of a 28-inch rawhide drum struck with a soft leather beater.
 */
function synthAcousticPowwowDrum(isHonor = false): Float32Array {
  const dur = isHonor ? 1.0 : 0.65;
  const n = Math.round(dur * SR);
  const out = new Float32Array(n);
  const f0 = isHonor ? 48 : 55; // Root pitch in D

  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    // Pitch drops slightly on impact then sustains warmly
    const pitch = f0 + (isHonor ? 60 : 45) * Math.exp(-t * 28);
    ph += (2 * Math.PI * pitch) / SR;

    // Harmonic & inharmonic circular membrane modes:
    // (0,1) fundamental + (1,1) nodal diameter + (0,2) second circle
    const mode1 = Math.sin(ph);
    const mode2 = Math.sin(ph * 1.59) * 0.4;
    const mode3 = Math.sin(ph * 2.14) * 0.2;

    // Leather mallet thud
    const mallet = (rng() * 2 - 1) * Math.exp(-t * 120) * 0.4;

    const env = Math.exp(-t / (isHonor ? 0.35 : 0.2));
    out[i] = (mode1 + mode2 + mode3 + mallet) * env;
  }

  const filtered = biquad(out, 'lp', isHonor ? 650 : 500, 1.2);
  return roomReverb(filtered, 0.3, 0.5);
}

/**
 * 2. Modern EDM Workout Kick:
 * Tight, punchy club kick that drives workout cadence without mud.
 */
function synthModernKick(): Float32Array {
  const dur = 0.35;
  const n = Math.round(dur * SR);
  const out = new Float32Array(n);

  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    // Fast pitch sweep 160Hz -> 50Hz in 35ms
    const f = 50 + 110 * Math.exp(-t * 38);
    ph += (2 * Math.PI * f) / SR;
    const body = Math.sin(ph);
    const click = (rng() * 2 - 1) * Math.exp(-t * 300) * 0.3;
    const env = Math.exp(-t / 0.1);
    out[i] = (body * 0.9 + click) * env;
  }
  return warm(out, 1.3);
}

/**
 * 3. Modern Layered Club Snare & Clap:
 */
function synthModernSnare(): Float32Array {
  const dur = 0.28;
  const n = Math.round(dur * SR);
  const out = new Float32Array(n);

  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    // 200 Hz body tone
    ph += (2 * Math.PI * 210) / SR;
    const tone = Math.sin(ph) * Math.exp(-t * 35);
    // Noise snap
    const noise = (rng() * 2 - 1) * Math.exp(-t * 14);
    // Multi-clap flam
    const clap1 = i > 0.01 * SR && i < 0.04 * SR ? (rng() * 2 - 1) * 0.3 : 0;
    out[i] = tone * 0.45 + noise * 0.7 + clap1;
  }
  return biquad(out, 'hp', 300, 0.8);
}

/**
 * 4. Crisp High-Hats & Shakers:
 */
function synthShaker(accent = false): Float32Array {
  const dur = accent ? 0.1 : 0.06;
  const n = Math.round(dur * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const w = rng() * 2 - 1;
    const env = accent ? Math.sin((i / n) * Math.PI) : Math.exp(-t * 45);
    out[i] = w * env;
  }
  return biquad(biquad(out, 'bp', 6500, 2.5), 'hp', 4000, 1.0);
}

function synthHiHat(open = false): Float32Array {
  const dur = open ? 0.22 : 0.05;
  const n = Math.round(dur * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const w = rng() * 2 - 1;
    const env = open ? Math.exp(-t * 16) : Math.exp(-t * 70);
    out[i] = w * env;
  }
  return biquad(out, 'hp', 8500, 1.5);
}

/**
 * 5. Clean Gliding 808 Sub-Bass:
 * Pure, warm low end (D1 = 36.7Hz to A1 = 55Hz) that hits deep in the chest.
 */
function synthClean808(freq: number, dur: number, slideTo?: number): Float32Array {
  const n = Math.round(dur * SR);
  const out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const curF = slideTo ? freq + (slideTo - freq) * Math.pow(t, 2) : freq;
    ph += (2 * Math.PI * curF) / SR;
    const sine = Math.sin(ph);
    const harmonic2 = Math.sin(ph * 2) * 0.2; // Subtle warmth
    const env = Math.min(1, i / (0.01 * SR)) * Math.max(0, 1 - (i / n) * 0.6);
    out[i] = (sine + harmonic2) * env;
  }
  return warm(out, 1.2);
}

/**
 * 6. Expressive Native American Flute / Melody Lead:
 * Natural wooden breath attack, warm acoustic tone, and authentic vibrato.
 */
function synthNativeFlute(freq: number, dur: number): Float32Array {
  const n = Math.round(dur * SR);
  const out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    // Natural woodwind vibrato (~5.5 Hz) starting after 80ms
    const vib = t > 0.08 ? Math.sin(2 * Math.PI * 5.5 * (t - 0.08)) * (freq * 0.02) : 0;
    ph += (2 * Math.PI * (freq + vib)) / SR;

    // Triangle / soft sine with odd harmonics (characteristic of hollow wooden flute)
    const fundamental = Math.sin(ph);
    const harm2 = Math.sin(ph * 2) * 0.15;
    const harm3 = Math.sin(ph * 3) * 0.25;

    // Breath turbulence at the embouchure hole
    const breath = (rng() * 2 - 1) * 0.08 * Math.exp(-t * 20);

    const attack = Math.min(1, t / 0.04);
    const release = Math.max(0, 1 - Math.max(0, t - (dur - 0.08)) / 0.08);

    out[i] = (fundamental + harm2 + harm3 + breath) * attack * release;
  }

  const filtered = biquad(out, 'lp', 3200, 1.2);
  return roomReverb(filtered, 0.35, 0.7);
}

// ---------------------------------------------------------------------------------------------
// Note Frequencies (D Minor Pentatonic: D, F, G, A, C)
// ---------------------------------------------------------------------------------------------

const P = {
  D1: 36.71,
  F1: 43.65,
  G1: 48.99,
  A1: 55.00,
  C2: 65.41,
  D2: 73.42,
  D3: 146.83,
  F3: 174.61,
  G3: 196.00,
  A3: 220.00,
  C4: 261.63,
  D4: 293.66,
  F4: 349.23,
  G4: 392.00,
  A4: 440.00,
  C5: 523.25,
  D5: 587.33,
};

// ---------------------------------------------------------------------------------------------
// Arrange Track
// ---------------------------------------------------------------------------------------------

const master = new StereoBuffer(TOTAL_SAMPLES);
const sampleAt = (bar: number, beat = 0, sixteenth = 0) =>
  Math.round((bar * BAR_SEC + beat * BEAT_SEC + sixteenth * (BEAT_SEC / 4)) * SR);

// Pre-render building blocks
const pwDrum = synthAcousticPowwowDrum(false);
const pwHonor = synthAcousticPowwowDrum(true);
const kick = synthModernKick();
const snare = synthModernSnare();
const shakeQ = synthShaker(false);
const shakeA = synthShaker(true);
const hatC = synthHiHat(false);
const hatO = synthHiHat(true);

// 1. POW WOW DRUM CIRCLE & AUXILIARY SHAKERS
for (let bar = 0; bar < TOTAL_BARS; bar++) {
  const isHonor = bar === 16 || bar === 17;

  if (isHonor) {
    // 4 Colossal Honor Beats (Bars 16 & 17)
    master.mixMono(pwHonor, sampleAt(bar, 0), 0, 1.3);
    master.mixMono(pwHonor, sampleAt(bar, 1, 2), -0.2, 1.4);
    master.mixMono(pwHonor, sampleAt(bar, 2, 2), 0.2, 1.4);
    master.mixMono(pwHonor, sampleAt(bar, 3, 2), 0, 1.5);
  } else {
    // Steady heartbeat powwow pulse
    for (let beat = 0; beat < 4; beat++) {
      master.mixMono(pwDrum, sampleAt(bar, beat), (rng() - 0.5) * 0.2, beat === 0 ? 1.0 : 0.8);
      if (bar >= 2) {
        master.mixMono(pwDrum, sampleAt(bar, beat, 2), 0.15, 0.4);
      }
    }
  }

  // Shakers (16th note continuous groove)
  if (bar >= 2 && !isHonor) {
    for (let step = 0; step < 16; step++) {
      const isAccent = step % 4 === 2;
      const pan = Math.sin(step * 0.9) * 0.45;
      master.mixMono(isAccent ? shakeA : shakeQ, sampleAt(bar, 0, step), pan, isAccent ? 0.7 : 0.45);
    }
  }
}

// 2. MODERN EDM GROOVE (130 BPM Powwow-Step Syncopation)
for (let bar = 4; bar < TOTAL_BARS; bar++) {
  const isHonor = bar === 16 || bar === 17;
  const isBuild = bar >= 20 && bar < 24;
  const isDrop = (bar >= 8 && bar < 16) || (bar >= 24 && bar < 32);

  if (isHonor) continue;

  if (isBuild) {
    // Workout Snare Build
    const subDiv = bar >= 22 ? 8 : 4;
    for (let i = 0; i < subDiv * 4; i++) {
      const s = sampleAt(bar) + Math.round((i * (BAR_SEC / (subDiv * 4))) * SR);
      const prog = ((bar - 20) * 4 + i / subDiv) / 16;
      master.mixMono(snare, s, (rng() - 0.5) * 0.3, 0.3 + prog * 0.8);
    }
  } else {
    // ATCR Moombahton bounce: Kick on 1, Snare on 2, Syncopated Kick on 2+, Snare on 4
    master.mixMono(kick, sampleAt(bar, 0), 0, 1.05);
    master.mixMono(snare, sampleAt(bar, 1), 0.05, 1.0);
    master.mixMono(kick, sampleAt(bar, 1, 2), 0, 0.85); // The syncopated bounce!
    master.mixMono(snare, sampleAt(bar, 3), -0.05, 1.0);

    if (isDrop) {
      master.mixMono(kick, sampleAt(bar, 2, 2), 0, 0.75);
    }

    // Rolling Hi-Hats
    for (let step = 0; step < 16; step++) {
      const isOpen = step === 2 || step === 10;
      if (isOpen) {
        master.mixMono(hatO, sampleAt(bar, 0, step), 0.3, 0.65);
      } else {
        master.mixMono(hatC, sampleAt(bar, 0, step), -0.25, step % 2 === 0 ? 0.7 : 0.4);
      }
    }
  }
}

// 3. CLEAN 808 SUB BASS
for (let bar = 4; bar < TOTAL_BARS; bar++) {
  const isHonor = bar === 16 || bar === 17;
  const isBuild = bar >= 20 && bar < 24;
  const isDrop = (bar >= 8 && bar < 16) || (bar >= 24 && bar < 32);

  const root = bar % 4 === 2 ? P.F1 : bar % 4 === 3 ? P.G1 : P.D1;

  if (isHonor) {
    const sH = synthClean808(P.D1, BEAT_SEC * 1.5);
    master.mixMono(sH, sampleAt(bar, 0), 0, 1.2);
    master.mixMono(sH, sampleAt(bar, 2), 0, 1.2);
  } else if (isDrop) {
    // Deep 808 with smooth slide on the "1"
    const sub1 = synthClean808(root, BEAT_SEC * 1.8, bar % 2 === 1 ? root * 1.5 : undefined);
    master.mixMono(sub1, sampleAt(bar, 0), 0, 1.15);

    // Secondary sub punch on beat 2.5
    const sub2 = synthClean808(root, BEAT_SEC * 1.2);
    master.mixMono(sub2, sampleAt(bar, 2, 2), 0, 1.0);
  } else if (!isBuild) {
    const subStd = synthClean808(root, BEAT_SEC * 1.5);
    master.mixMono(subStd, sampleAt(bar, 0), 0, 0.9);
    master.mixMono(subStd, sampleAt(bar, 2), 0, 0.9);
  }
}

// 4. MELODIC NATIVE WOOD FLUTE LEAD (Authentic Pentatonic Melodies)
// Intro Solo Flute (Bars 0-3): Peaceful invocation building to the drop
const f1 = synthNativeFlute(P.D4, BEAT_SEC * 1.6);
const f2 = synthNativeFlute(P.F4, BEAT_SEC * 1.8);
const f3 = synthNativeFlute(P.A4, BEAT_SEC * 2.2);
master.mixMono(f1, sampleAt(0, 1), -0.15, 0.9);
master.mixMono(f2, sampleAt(1, 1), 0.15, 0.95);
master.mixMono(f3, sampleAt(2, 1), 0, 1.05);

// Drop Melody Phrases (Bars 8-15 and 24-31)
function addFluteHook(startBar: number) {
  // Soaring D minor pentatonic hook: D5 -> F5 -> D5 -> C5 -> A4
  const n1 = synthNativeFlute(P.D5, BEAT_SEC * 0.7);
  const n2 = synthNativeFlute(P.F5, BEAT_SEC * 0.7);
  const n3 = synthNativeFlute(P.D5, BEAT_SEC * 0.7);
  const n4 = synthNativeFlute(P.A4, BEAT_SEC * 1.4);

  master.mixMono(n1, sampleAt(startBar, 0), -0.2, 1.0);
  master.mixMono(n2, sampleAt(startBar, 1), 0.2, 1.0);
  master.mixMono(n3, sampleAt(startBar, 2), -0.1, 1.0);
  master.mixMono(n4, sampleAt(startBar, 3), 0.1, 1.1);

  // Answering phrase
  const n5 = synthNativeFlute(P.C5, BEAT_SEC * 0.5);
  const n6 = synthNativeFlute(P.D5, BEAT_SEC * 0.5);
  const n7 = synthNativeFlute(P.F5, BEAT_SEC * 0.7);
  const n8 = synthNativeFlute(P.D5, BEAT_SEC * 1.8);

  master.mixMono(n5, sampleAt(startBar + 2, 0), -0.15, 0.95);
  master.mixMono(n6, sampleAt(startBar + 2, 1), 0.15, 0.95);
  master.mixMono(n7, sampleAt(startBar + 2, 2), 0, 1.0);
  master.mixMono(n8, sampleAt(startBar + 2, 3), 0, 1.15);
}

addFluteHook(8);
addFluteHook(12);
addFluteHook(24);
addFluteHook(28);

master.normalize(0.96);

// ---------------------------------------------------------------------------------------------
// WAV Encode & Export
// ---------------------------------------------------------------------------------------------

function encodeStereoWav(left: Float32Array, right: Float32Array): Buffer {
  const numChannels = 2;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = SR * blockAlign;
  const dataSize = left.length * blockAlign;
  const buf = Buffer.alloc(44 + dataSize);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < left.length; i++) {
    const sL = Math.max(-1, Math.min(1, left[i]));
    buf.writeInt16LE(Math.round(sL * 32767), offset);
    offset += 2;
    const sR = Math.max(-1, Math.min(1, right[i]));
    buf.writeInt16LE(Math.round(sR * 32767), offset);
    offset += 2;
  }
  return buf;
}

const MUSIC_DIR = join(process.cwd(), 'work', 'music');
const ASSETS_MUSIC = join(process.cwd(), 'public', 'assets', 'music');
mkdirSync(MUSIC_DIR, { recursive: true });
mkdirSync(ASSETS_MUSIC, { recursive: true });

const masterWav = encodeStereoWav(master.left, master.right);
const masterPath = join(MUSIC_DIR, 'electric_pow_wow_battle.wav');
writeFileSync(masterPath, masterWav);
writeFileSync(join(ASSETS_MUSIC, 'battle_electric_pow_wow.wav'), masterWav);

console.log(`[Music] Successfully exported clean Powwow-Step track to: ${masterPath}`);
