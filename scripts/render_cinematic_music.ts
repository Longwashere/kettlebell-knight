/**
 * Renders the Dark Fantasy Cinematic Prologue Soundtrack
 * Pure TypeScript DSP using src/shared/sfx/dsp.ts and converts to MP3 via ffmpeg.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import {
  SR,
  type Buf,
  buf,
  tone,
  noise,
  modal,
  pluck,
  perc,
  env,
  mix,
  reverb,
  echo,
  normalize,
  drive,
  lp,
  hp,
} from '../src/shared/sfx/dsp';

const OUT_DIR = join(process.cwd(), 'work', 'music');
const ASSETS_DIR = join(process.cwd(), 'public', 'assets', 'music');
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(ASSETS_DIR, { recursive: true });

function wavBuffer(data: Float32Array): Buffer {
  const b = Buffer.alloc(44 + data.length * 2);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + data.length * 2, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); // PCM
  b.writeUInt16LE(1, 22); // Mono
  b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(data.length * 2, 40);
  for (let i = 0; i < data.length; i++) {
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, data[i])) * 32767), 44 + i * 2);
  }
  return b;
}

// -----------------------------------------------------------------------------
// Dark Fantasy Instrument Presets
// -----------------------------------------------------------------------------

/** Deep gothic bronze church bell with inharmonic partials. */
function renderBell(sec: number, f0: number, dark = true): Buf {
  const partials: [number, number, number][] = [
    [0.5, 0.9, 4.5],
    [1.0, 1.0, 3.8],
    [dark ? 1.189 : 1.25, 0.75, 3.2],
    [1.506, 0.55, 2.5],
    [2.0, 0.65, 2.0],
    [2.614, 0.4, 1.4],
    [3.011, 0.3, 1.0],
  ];
  const bell = modal(sec, f0, partials);
  const click = perc(hp(noise(0.04, 'white', 2), 1200), 0.001, 0.008);
  mix(bell, click, 0, 0.4);
  return bell;
}

/** Deep bowed cello / contrabass drone in D minor. */
function renderCello(sec: number, f0: number): Buf {
  const out = buf(sec);
  const harmonics = [1, 2, 3, 4, 5, 6];
  const amps = [1.0, 0.65, 0.45, 0.28, 0.16, 0.08];
  for (let h = 0; h < harmonics.length; h++) {
    const harmFreq = f0 * harmonics[h];
    if (harmFreq < SR / 2 - 100) {
      const harmTone = tone(sec, (t) => harmFreq + Math.sin(t * sec * 28.0) * (harmFreq * 0.008), 'sine');
      mix(out, harmTone, 0, amps[h]);
    }
  }
  // Soft bowing envelope
  env(out, [
    [0, 0],
    [0.4, 1.0],
    [sec - 0.5, 0.9],
    [sec, 0],
  ]);
  drive(out, 1.3);
  lp(out, 2400);
  return out;
}

/** Eerie celestial harp / celesta pluck. */
function renderHarp(sec: number, freq: number, seed = 1): Buf {
  const p = pluck(sec, freq, 0.994, seed);
  const chime = perc(tone(sec, freq * 2, 'sine'), 0.002, 0.4);
  mix(p, chime, 0, 0.35);
  return p;
}

/** Distant warhorn swell. */
function renderWarhorn(sec: number, f0: number): Buf {
  const out = tone(sec, (t) => f0 * (1.0 + 0.03 * Math.exp(-t * 6.0)), 'saw');
  env(out, [
    [0, 0],
    [0.6, 1.0],
    [sec * 0.7, 0.8],
    [sec, 0],
  ]);
  lp(out, 1800);
  drive(out, 1.4);
  return out;
}

/** Sacred iron kettlebell clang. */
function renderIronClang(sec: number, f = 660): Buf {
  const out = modal(sec, f, [
    [1.0, 1.0, 1.6],
    [1.414, 0.6, 1.1],
    [2.73, 0.35, 0.6],
  ]);
  const hit = perc(noise(0.02, 'white', 5), 0.001, 0.005);
  mix(out, hit, 0, 0.6);
  return out;
}

// -----------------------------------------------------------------------------
// Render Track: 72 BPM Dark Fantasy Cinematic Score
// -----------------------------------------------------------------------------
console.log('[*] Synthesizing 72 BPM Dark Fantasy Cinematic Prologue Score...');
const BPM = 72;
const BEAT_SEC = 60.0 / BPM;
const BAR_SEC = BEAT_SEC * 4.0;
const TOTAL_BARS = 24;
const TOTAL_SEC = TOTAL_BARS * BAR_SEC;
const track = buf(TOTAL_SEC);

const D1 = 36.71;
const D2 = 73.42;
const A1 = 55.0;
const A2 = 110.0;
const BB1 = 58.27;
const F1 = 43.65;
const G1 = 48.99;
const D3 = 146.83;
const F3 = 174.61;
const A3 = 220.0;
const D4 = 293.66;
const F4 = 349.23;
const A4 = 440.0;
const D5 = 587.33;

const chords: [number, number, number][] = [
  // [Bass, Mid, Bell]
  [D1, D2, D3],   // Bars 0-3: The Ancient Glory
  [D1, A2, D3],
  [BB1, D2, BB1 * 2], // Bars 4-7: The Stillness
  [F1, A2, F1 * 4],
  [G1, D2, G1 * 3],   // Bars 8-11: The Creeping Rot
  [A1, D2, A2],
  [D1, D2, D3],   // Bars 12-15: The Apex Menace
  [D1, A1, D3],
  [BB1, D2, BB1 * 2], // Bars 16-19: Warhorns & Shadow
  [A1, D2, A2],
  [D1, D2, D3],   // Bars 20-23: The Anvil & Vow
  [D1, A1, D3],
];

// 1. Tolling bronze bells every 2 bars
for (let b = 0; b < TOTAL_BARS; b += 2) {
  const chordIdx = Math.min(Math.floor(b / 2), chords.length - 1);
  const bellFreq = chords[chordIdx][2];
  const bell = renderBell(6.5, bellFreq, true);
  mix(track, bell, b * BAR_SEC, 0.7);
}

// 2. Bowed cello drones throughout
for (let b = 0; b < TOTAL_BARS; b++) {
  const chordIdx = Math.min(Math.floor(b / 2), chords.length - 1);
  const bass = chords[chordIdx][0];
  const mid = chords[chordIdx][1];
  const celloBass = renderCello(BAR_SEC * 1.05, bass * 2);
  const celloMid = renderCello(BAR_SEC * 1.05, mid);
  mix(track, celloBass, b * BAR_SEC, 0.6);
  mix(track, celloMid, b * BAR_SEC, 0.45);
}

// 3. Eerie harp plucks (Bars 4 through 20)
const harpNotes = [D4, F4, A4, D5, F4, D4, A3, D4];
for (let b = 4; b < 20; b++) {
  for (let beat = 0; beat < 4; beat++) {
    const note = harpNotes[(b * 4 + beat) % harpNotes.length];
    const harp = renderHarp(2.2, note, b * 4 + beat);
    mix(track, harp, b * BAR_SEC + beat * BEAT_SEC, 0.38);
  }
}

// 4. Distant warhorns (Bars 12-18: The Apex Chapter)
for (let b = 12; b <= 18; b += 2) {
  const horn = renderWarhorn(4.2, A2);
  mix(track, horn, b * BAR_SEC + BEAT_SEC, 0.55);
}

// 5. Iron Kettlebell Clangs (Bars 18-23: Sacrament of Iron)
for (let b = 18; b < TOTAL_BARS; b += 2) {
  const clang = renderIronClang(2.5, 660);
  mix(track, clang, b * BAR_SEC + BEAT_SEC * 0.5, 0.65);
  mix(track, clang, b * BAR_SEC + BEAT_SEC * 2.5, 0.5);
}

// Reverb & echo space
console.log('[*] Applying atmospheric cathedral acoustics...');
echo(track, 0.42, 0.28);
reverb(track, 0.82, 0.35);
normalize(track, 0.92);

const wavPath = join(OUT_DIR, 'cinematic_prologue.wav');
const mp3Path = join(ASSETS_DIR, 'cinematic_prologue.mp3');
writeFileSync(wavPath, wavBuffer(track));
console.log(`[✓] Wrote WAV: ${wavPath} (${(track.length / SR).toFixed(1)}s)`);

console.log('[*] Compressing with ffmpeg into 192k MP3...');
execSync(`ffmpeg -y -i "${wavPath}" -ar 44100 -b:a 192k -af "acompressor=threshold=-12dB:ratio=2.5:attack=5:release=80,loudnorm=I=-14:LRA=7:TP=-1.0" "${mp3Path}"`);
console.log(`[✓] Mastered Dark Fantasy Cinematic Soundtrack -> ${mp3Path}`);
