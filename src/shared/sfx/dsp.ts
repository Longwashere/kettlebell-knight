/**
 * Tiny offline DSP kit for the procedural sound bank (bank.ts). Everything renders into mono
 * Float32Arrays at SR once, on first use, so playback is a plain AudioBufferSourceNode. No WebAudio
 * dependency: `npm run sfx` runs the same code in Node to write WAVs.
 */

/** Bank sample rate: half of 44.1k keeps every buffer small; TV speakers don't miss the top octave. */
export const SR = 22050;

export type Buf = Float32Array;
/** A constant, or a curve over 0-1 of the buffer (or of seconds, see each helper). */
export type Curve = number | ((t: number) => number);

const at = (c: Curve, t: number) => (typeof c === 'number' ? c : c(t));

export const len = (sec: number) => Math.max(1, Math.round(sec * SR));
export const buf = (sec: number): Buf => new Float32Array(len(sec));

/** Deterministic PRNG (mulberry32), so every render of a sound is identical. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------------------------
// Sources

/** White, pink (≈-3 dB/oct) or brown (-6 dB/oct) noise. */
export function noise(sec: number, color: 'white' | 'pink' | 'brown' = 'white', seed = 1): Buf {
  const out = buf(sec);
  const r = rng(seed);
  let b0 = 0, b1 = 0, b2 = 0, br = 0;
  for (let i = 0; i < out.length; i++) {
    const w = r() * 2 - 1;
    if (color === 'white') out[i] = w;
    else if (color === 'pink') {
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      out[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
    } else {
      br = (br + w * 0.04) * 0.996;
      out[i] = br * 3;
    }
  }
  return out;
}

export type Wave = 'sine' | 'tri' | 'saw' | 'square';

/** Oscillator; `freq` in Hz, constant or a curve over 0-1 of the duration. */
export function tone(sec: number, freq: Curve, wave: Wave = 'sine', phase = 0): Buf {
  const out = buf(sec);
  const n = out.length;
  let ph = phase;
  for (let i = 0; i < n; i++) {
    const f = at(freq, i / n);
    ph += f / SR;
    ph -= Math.floor(ph);
    let v: number;
    if (wave === 'sine') v = Math.sin(ph * 2 * Math.PI);
    else if (wave === 'tri') v = 1 - 4 * Math.abs(ph - 0.5);
    else if (wave === 'saw') v = 2 * ph - 1;
    else v = ph < 0.5 ? 1 : -1;
    out[i] = v;
  }
  return out;
}

/**
 * Modal (struck-object) synthesis: decaying sine partials at `base × ratio`, each with its own decay
 * time (s) and level. Inharmonic ratios read as metal, glass or wood depending on the spread.
 */
export function modal(sec: number, base: number, partials: [ratio: number, decay: number, amp: number][], seed = 1): Buf {
  const out = buf(sec);
  const r = rng(seed);
  for (const [ratio, decay, amp] of partials) {
    const f = base * ratio;
    if (f >= SR / 2) continue;
    const ph0 = r();
    const k = Math.exp(-1 / (decay * SR));
    let a = amp;
    const w = (2 * Math.PI * f) / SR;
    for (let i = 0; i < out.length && a > 1e-4; i++) {
      out[i] += Math.sin(ph0 * 6.283 + w * i) * a;
      a *= k;
    }
  }
  return out;
}

/** Karplus-Strong pluck (bow strings, twangs). */
export function pluck(sec: number, freq: number, damp = 0.996, seed = 1): Buf {
  const out = buf(sec);
  const r = rng(seed);
  const p = Math.max(2, Math.round(SR / freq));
  const line = new Float32Array(p);
  for (let i = 0; i < p; i++) line[i] = r() * 2 - 1;
  let idx = 0;
  for (let i = 0; i < out.length; i++) {
    const next = (idx + 1) % p;
    const v = damp * 0.5 * (line[idx] + line[next]);
    out[i] = line[idx];
    line[idx] = v;
    idx = next;
  }
  return out;
}

/** Sparse crackle: `rate` random clicks per second, each a decaying impulse of `click` seconds. */
export function crackle(sec: number, rate: number, seed = 1, click = 0.002): Buf {
  const out = buf(sec);
  const r = rng(seed);
  const p = rate / SR;
  const k = Math.exp(-1 / (click * SR));
  let a = 0;
  let sgn = 1;
  for (let i = 0; i < out.length; i++) {
    if (r() < p) {
      a = 0.3 + r() * 0.7;
      sgn = r() < 0.5 ? -1 : 1;
    }
    out[i] = a * sgn * (r() * 0.6 + 0.4);
    a *= k;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Envelopes (in place, return the buffer)

/** Percussive envelope: linear attack over `atk` s, then exponential decay with time constant `tau` s. */
export function perc(b: Buf, atk: number, tau: number): Buf {
  const a = Math.max(1, atk * SR);
  const k = Math.exp(-1 / (tau * SR));
  let g = 1;
  for (let i = 0; i < b.length; i++) {
    if (i < a) b[i] *= i / a;
    else {
      b[i] *= g;
      g *= k;
    }
  }
  return b;
}

/** Piecewise-linear envelope through [time s, level] points (holds the last level). */
export function env(b: Buf, pts: [number, number][]): Buf {
  let seg = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    while (seg < pts.length - 1 && t > pts[seg + 1][0]) seg++;
    let v: number;
    if (seg >= pts.length - 1) v = pts[pts.length - 1][1];
    else {
      const [t0, v0] = pts[seg];
      const [t1, v1] = pts[seg + 1];
      v = t <= t0 ? v0 : v0 + (v1 - v0) * Math.min(1, (t - t0) / Math.max(1e-6, t1 - t0));
    }
    b[i] *= v;
  }
  return b;
}

/** Multiplies by a curve over 0-1 of the buffer (tremolo, swells). */
export function shape(b: Buf, fn: (t: number, sec: number) => number): Buf {
  for (let i = 0; i < b.length; i++) b[i] *= fn(i / b.length, i / SR);
  return b;
}

/** Short fades at both ends so nothing clicks. */
export function declick(b: Buf, inSec = 0.001, outSec = 0.01): Buf {
  const a = Math.round(inSec * SR);
  const z = Math.round(outSec * SR);
  for (let i = 0; i < a && i < b.length; i++) b[i] *= i / a;
  for (let i = 0; i < z && i < b.length; i++) b[b.length - 1 - i] *= i / z;
  return b;
}

// ---------------------------------------------------------------------------------------------
// Filters (RBJ biquads, coefficients refreshed every 16 samples when the cutoff moves)

type Kind = 'lp' | 'hp' | 'bp';

function biquad(b: Buf, kind: Kind, freq: Curve, q: Curve): Buf {
  let b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const n = b.length;
  const fixed = typeof freq === 'number' && typeof q === 'number';
  for (let i = 0; i < n; i++) {
    if (i === 0 || (!fixed && (i & 15) === 0)) {
      const t = i / n;
      const f = Math.min(SR * 0.45, Math.max(20, at(freq, t)));
      const Q = Math.max(0.1, at(q, t));
      const w = (2 * Math.PI * f) / SR;
      const cs = Math.cos(w);
      const al = Math.sin(w) / (2 * Q);
      const a0 = 1 + al;
      if (kind === 'lp') {
        b0 = (1 - cs) / 2 / a0; b1 = (1 - cs) / a0; b2 = b0;
      } else if (kind === 'hp') {
        b0 = (1 + cs) / 2 / a0; b1 = -(1 + cs) / a0; b2 = b0;
      } else {
        b0 = al / a0; b1 = 0; b2 = -al / a0;
      }
      a1 = (-2 * cs) / a0;
      a2 = (1 - al) / a0;
    }
    const x = b[i];
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    b[i] = y;
  }
  return b;
}

export const lp = (b: Buf, freq: Curve, q: Curve = 0.707) => biquad(b, 'lp', freq, q);
export const hp = (b: Buf, freq: Curve, q: Curve = 0.707) => biquad(b, 'hp', freq, q);
/** Constant-peak bandpass; `q` 0.5 is wide, 10+ rings. */
export const bp = (b: Buf, freq: Curve, q: Curve = 1) => biquad(b, 'bp', freq, q);

// ---------------------------------------------------------------------------------------------
// Colour

/** tanh saturation; `drive` 1 is gentle, 6+ is crunchy. Output is level-matched to the input peak. */
export function drive(b: Buf, amount: number): Buf {
  const norm = Math.tanh(amount);
  for (let i = 0; i < b.length; i++) b[i] = Math.tanh(b[i] * amount) / norm;
  return b;
}

/** Bit and sample-rate reduction for retro grit. */
export function crush(b: Buf, bits = 8, hold = 2): Buf {
  const steps = Math.pow(2, bits - 1);
  let v = 0;
  for (let i = 0; i < b.length; i++) {
    if (i % hold === 0) v = Math.round(b[i] * steps) / steps;
    b[i] = v;
  }
  return b;
}

/** Ring modulation by a sine at `freq` Hz (metallic, robotic, buzzing). */
export function ring(b: Buf, freq: Curve, depth = 1): Buf {
  let ph = 0;
  for (let i = 0; i < b.length; i++) {
    ph += at(freq, i / b.length) / SR;
    b[i] *= 1 - depth + depth * Math.sin(ph * 2 * Math.PI);
  }
  return b;
}

/** Plays `b` at `rate` × speed (pitch and length together), linear interpolation. */
export function resample(b: Buf, rate: number): Buf {
  const out = new Float32Array(Math.max(1, Math.floor(b.length / rate)));
  for (let i = 0; i < out.length; i++) {
    const x = i * rate;
    const i0 = Math.floor(x);
    const f = x - i0;
    out[i] = (b[i0] ?? 0) * (1 - f) + (b[i0 + 1] ?? 0) * f;
  }
  return out;
}

export function reverse(b: Buf): Buf {
  return b.reverse();
}

// ---------------------------------------------------------------------------------------------
// Mixing

/** A silent canvas `sec` long to mix layers into. */
export const canvas = (sec: number) => buf(sec);

/** Adds `src × gain` into `dst` starting at `start` seconds (clipped to dst, with a short fade where it's cut). */
export function mix(dst: Buf, src: Buf, start = 0, gain = 1): Buf {
  const o = Math.round(start * SR);
  const n = Math.min(src.length, dst.length - o);
  const fade = Math.min(n, 96);
  for (let i = Math.max(0, -o); i < n; i++) dst[o + i] += src[i] * gain * (i >= n - fade ? (n - i) / fade : 1);
  return dst;
}

export function gain(b: Buf, g: number): Buf {
  for (let i = 0; i < b.length; i++) b[i] *= g;
  return b;
}

/** Scales to `peak` (0-1). */
export function normalize(b: Buf, peak = 0.95): Buf {
  let m = 0;
  for (let i = 0; i < b.length; i++) m = Math.max(m, Math.abs(b[i]));
  return m > 0 ? gain(b, peak / m) : b;
}

/** Feedback echo: `taps` repeats `delay` s apart, each `fb` quieter, darkening as they go. */
export function echo(b: Buf, delay: number, fb = 0.35, taps = 3): Buf {
  declick(b, 0, 0.008);
  const d = Math.round(delay * SR);
  const out = new Float32Array(b.length + d * taps);
  out.set(b);
  let src: Buf = b;
  let g = 1;
  for (let k = 1; k <= taps; k++) {
    g *= fb;
    src = lp(new Float32Array(src), 3500 - k * 600);
    mix(out, src, (d * k) / SR, g);
  }
  return out;
}

/**
 * Small Schroeder room (4 combs + 2 allpasses). `size` 0-1 scales the room, `wet` the tail level.
 * Returns a longer buffer that includes the tail.
 */
export function reverb(b: Buf, size = 0.5, wet = 0.25, tail = 0.6): Buf {
  declick(b, 0, 0.008);
  const out = new Float32Array(b.length + len(tail));
  out.set(b);
  const scale = 0.6 + size * 0.8;
  const combs = [1116, 1188, 1277, 1356].map((d) => Math.round((d * scale * SR) / 44100));
  const fb = 0.72 + size * 0.2;
  const damp = 0.35;
  const acc = new Float32Array(out.length);
  for (const d of combs) {
    const line = new Float32Array(d);
    let idx = 0;
    let filt = 0;
    for (let i = 0; i < out.length; i++) {
      const y = line[idx];
      filt = y * (1 - damp) + filt * damp;
      line[idx] = (i < b.length ? b[i] : 0) + filt * fb;
      acc[i] += y;
      idx = (idx + 1) % d;
    }
  }
  for (const d of [556, 441].map((x) => Math.round((x * SR) / 44100))) {
    const line = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < acc.length; i++) {
      const y = line[idx];
      const x = acc[i];
      line[idx] = x + y * 0.5;
      acc[i] = y - x * 0.5;
      idx = (idx + 1) % d;
    }
  }
  for (let i = 0; i < out.length; i++) out[i] += acc[i] * wet * 0.25;
  return out;
}

/** Drops the silent end (below `floor`) so buffers stay as short as their audible part. */
export function trim(b: Buf, floor = 0.003): Buf {
  let end = b.length;
  while (end > 1 && Math.abs(b[end - 1]) < floor) end--;
  return declick(b.subarray(0, Math.min(b.length, end + len(0.005))), 0, 0.006);
}

/** Exponential glide from a to b over 0-1 (pitch sweeps). */
export const glide = (a: number, b: number, curve = 1) => (t: number) => a * Math.pow(b / a, Math.pow(t, curve));
/** Linear ramp a→b over 0-1. */
export const ramp = (a: number, b: number) => (t: number) => a + (b - a) * t;
