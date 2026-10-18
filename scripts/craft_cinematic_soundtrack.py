#!/usr/bin/env python3
"""
Craft Dark Fantasy Cinematic Prologue Soundtrack
=================================================
Composes an atmospheric, brooding, orchestral dark fantasy prologue soundtrack
specifically tailored for the 64-bit stage cinematics:
  - 72 BPM slow cinematic tempo.
  - Deep church/sanctuary bell tolls with rich harmonic partials.
  - Subterranean bass drones and somber cellos in D minor.
  - Chilling celestial harp/celesta arpeggios.
  - Distant warhorn swells announcing the Apex Terror.
  - Struck iron kettlebell anvil accents.
  - Reverb and atmospheric stereo panning.
"""

import os
import subprocess
import wave
import numpy as np

SR = 44100
ASSETS_DIR = "public/assets/music"
os.makedirs(ASSETS_DIR, exist_ok=True)

# Chromatic scale definitions
NOTES = {}
semis = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
         'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
         'A#': 10, 'Bb': 10, 'B': 11}
for octv in range(0, 9):
    for name, val in semis.items():
        midi = (octv + 1) * 12 + val
        freq = 440.0 * (2.0 ** ((midi - 69) / 12.0))
        NOTES[f"{name}{octv}"] = freq

def write_wav(path, stereo_samples):
    clipped = np.clip(stereo_samples, -1.0, 1.0)
    int16_data = (clipped * 32767).astype(np.int16)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(int16_data.tobytes())

def convert_to_mp3(wav_in, mp3_out):
    cmd = [
        "ffmpeg", "-y", "-i", wav_in,
        "-ar", "44100",
        "-b:a", "192k",
        "-af", "acompressor=threshold=-14dB:ratio=3.0:attack=10:release=120,loudnorm=I=-16:LRA=9:TP=-1.5",
        mp3_out
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# -----------------------------------------------------------------------------
# Cinematic DSP Synthesizers
# -----------------------------------------------------------------------------

def synth_bell_toll(f0=146.83, dur=6.0):
    """Deep tolling bronze bell with rich inharmonic overtones and long decay."""
    n = int(round(dur * SR))
    t = np.linspace(0, dur, n, endpoint=False)
    # Historic bell acoustic partial ratios (Hum, Prime, Tierce, Quint, Nominal, Supernominal)
    partials = [
        (0.5, 0.9, 5.5),      # Hum note
        (1.0, 1.0, 4.2),      # Prime (fundamental strike)
        (1.189, 0.8, 3.6),    # Minor third (creates the dark melancholic character)
        (1.506, 0.6, 3.0),    # Fifth
        (2.0, 0.7, 2.2),      # Octave nominal
        (2.614, 0.45, 1.6),
        (3.011, 0.35, 1.2),
        (4.166, 0.25, 0.8),
    ]
    out = np.zeros(n, dtype=np.float32)
    for mult, amp, decay in partials:
        out += amp * np.sin(2 * np.pi * f0 * mult * t) * np.exp(-t / decay)
    # Struck clapper transient
    strike = np.random.uniform(-1, 1, n) * np.exp(-t * 90) * 0.4
    res = out + strike
    return (res / (np.max(np.abs(res)) + 1e-6)).astype(np.float32)

def synth_cello_drone(f0=73.42, dur=4.5):
    """Deep, bowed cello / contrabass note with subtle vibrato and rich warmth."""
    n = int(round(dur * SR))
    t = np.linspace(0, dur, n, endpoint=False)
    vib = np.sin(2 * np.pi * 4.8 * t) * (f0 * 0.012)
    phase = 2 * np.pi * np.cumsum(f0 + vib) / SR
    # Rich bowed string harmonics
    bow = (np.sin(phase) +
           0.65 * np.sin(phase * 2) +
           0.45 * np.sin(phase * 3) +
           0.30 * np.sin(phase * 4) +
           0.18 * np.sin(phase * 5) +
           0.10 * np.sin(phase * 6))
    # Soft bowing attack and natural release
    env = np.minimum(1.0, t / 0.35) * np.maximum(0.0, 1.0 - (t / dur) ** 1.8)
    return np.tanh(bow * 1.2 * env).astype(np.float32)

def synth_harp_pluck(f=293.66, dur=2.5):
    """Crystal clear dark fantasy harp / celesta pluck."""
    n = int(round(dur * SR))
    t = np.linspace(0, dur, n, endpoint=False)
    harmonics = [(1.0, 1.0), (2.0, 0.4), (3.0, 0.2), (4.0, 0.08)]
    out = np.zeros(n, dtype=np.float32)
    for h, amp in harmonics:
        out += amp * np.sin(2 * np.pi * f * h * t) * np.exp(-t * (1.8 * h))
    trans = np.random.uniform(-1, 1, n) * np.exp(-t * 220) * 0.2
    return (out + trans).astype(np.float32)

def synth_sub_impact(dur=3.0):
    """Deep subterranean cinematic boom / impact."""
    n = int(round(dur * SR))
    t = np.linspace(0, dur, n, endpoint=False)
    f = 75.0 * np.exp(-t * 4.0) + 32.0
    phase = 2 * np.pi * np.cumsum(f) / SR
    sub = np.sin(phase) * np.exp(-t / 1.1)
    rumble = np.random.uniform(-1, 1, n) * np.exp(-t * 8.0) * 0.3
    return np.tanh((sub + rumble) * 1.5).astype(np.float32)

def synth_warhorn(f0=110.0, dur=3.5):
    """Haunting distant warhorn echoing across dark mountains."""
    n = int(round(dur * SR))
    t = np.linspace(0, dur, n, endpoint=False)
    pitch_drift = f0 * (1.0 + 0.03 * np.exp(-t * 8.0))
    phase = 2 * np.pi * np.cumsum(pitch_drift) / SR
    raw = (np.sin(phase) +
           0.7 * np.sin(phase * 2) +
           0.85 * np.sin(phase * 3) +
           0.4 * np.sin(phase * 4) +
           0.25 * np.sin(phase * 5))
    env = np.minimum(1.0, t / 0.5) * np.exp(-t / 2.2)
    return np.tanh(raw * 1.4 * env).astype(np.float32)

def synth_anvil_clang(f=660.0, dur=1.8):
    """Struck sacred iron kettlebell clang."""
    n = int(round(dur * SR))
    t = np.linspace(0, dur, n, endpoint=False)
    ring = np.sin(2 * np.pi * f * t) + 0.6 * np.sin(2 * np.pi * (f * 1.414) * t) + 0.35 * np.sin(2 * np.pi * (f * 2.73) * t)
    env = np.exp(-t * 8.0)
    clang = np.random.uniform(-1, 1, n) * np.exp(-t * 150.0) * 0.7
    return ((ring * env + clang) * 0.9).astype(np.float32)

# -----------------------------------------------------------------------------
# Composition: 72 BPM Dark Fantasy Cinematic Score (32 Bars ~ 106 Seconds)
# -----------------------------------------------------------------------------

def compose_cinematic_prologue():
    print("[*] Composing Dark Fantasy Cinematic Prologue Score (72 BPM)...")
    bpm = 72
    beat_sec = 60.0 / bpm
    bar_sec = beat_sec * 4.0
    total_bars = 28
    total_sec = total_bars * bar_sec
    n_samples = int(round(total_sec * SR))

    left = np.zeros(n_samples, dtype=np.float32)
    right = np.zeros(n_samples, dtype=np.float32)

    def mix_mono(src, sample_idx, pan=0.0, gain=1.0):
        if sample_idx >= n_samples or sample_idx < 0:
            return
        end = min(n_samples, sample_idx + len(src))
        length = end - sample_idx
        ang = ((np.clip(pan, -1.0, 1.0) + 1.0) * np.pi) / 4.0
        left[sample_idx:end] += src[:length] * np.cos(ang) * gain
        right[sample_idx:end] += src[:length] * np.sin(ang) * gain

    def at(bar, beat=0, sixteenth=0):
        t = bar * bar_sec + beat * beat_sec + sixteenth * (beat_sec / 4.0)
        return int(round(t * SR))

    # Chord progression: Dm -> Bb -> F -> Am -> Gm -> Dm -> A(maj) -> Dm
    chords = [
        # (Bass Note, Drone Note, Bell Root, Mood)
        (NOTES['D2'], NOTES['D3'], NOTES['D3']),   # Bar 0-3: The Ancient Glory
        (NOTES['D2'], NOTES['A2'], NOTES['D3']),
        (NOTES['Bb1'], NOTES['F2'], NOTES['Bb2']),  # Bar 4-7: The Stillness
        (NOTES['F1'], NOTES['C2'], NOTES['F2']),
        (NOTES['G1'], NOTES['D2'], NOTES['G2']),   # Bar 8-11: The Creeping Rot
        (NOTES['A1'], NOTES['E2'], NOTES['A2']),
        (NOTES['D1'], NOTES['D2'], NOTES['D2']),   # Bar 12-15: The Apex Menace
        (NOTES['D1'], NOTES['A1'], NOTES['D2']),
        (NOTES['Bb1'], NOTES['F2'], NOTES['Bb2']),  # Bar 16-19: Warhorns & Shadow
        (NOTES['G1'], NOTES['D2'], NOTES['G2']),
        (NOTES['A1'], NOTES['E2'], NOTES['A2']),   # Bar 20-23: The Anvil & Vow
        (NOTES['A1'], NOTES['C#3'], NOTES['A2']),
        (NOTES['D1'], NOTES['D2'], NOTES['D3']),   # Bar 24-27: Final Resolution
        (NOTES['D1'], NOTES['A1'], NOTES['D2']),
    ]

    # 1. Sub impacts at key cinematic transitions
    transition_bars = [0, 4, 8, 12, 16, 20, 24]
    sub_boom = synth_sub_impact(dur=4.5)
    for b in transition_bars:
        mix_mono(sub_boom, at(b, 0), pan=0.0, gain=1.1)

    # 2. Tolling Bells at structural milestones
    bell_bars = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26]
    for b in bell_bars:
        chord_idx = min(b // 2, len(chords) - 1)
        root = chords[chord_idx][2]
        bell = synth_bell_toll(root, dur=6.0)
        # Alternate subtle stereo positioning
        pan = -0.3 if (b % 4 == 0) else 0.3
        mix_mono(bell, at(b, 0), pan=pan, gain=0.95)

    # 3. Sustained Deep Cello Drones throughout
    for b in range(total_bars):
        chord_idx = min(b // 2, len(chords) - 1)
        root_bass = chords[chord_idx][0]
        root_mid = chords[chord_idx][1]

        cello_low = synth_cello_drone(root_bass, dur=bar_sec * 1.1)
        cello_mid = synth_cello_drone(root_mid, dur=bar_sec * 1.1)

        mix_mono(cello_low, at(b, 0), pan=-0.2, gain=0.85)
        mix_mono(cello_mid, at(b, 0), pan=0.2, gain=0.75)

    # 4. Eerie Celestial Harp Arpeggios (Bar 4 through 23)
    harp_scale = [
        [NOTES['D4'], NOTES['F4'], NOTES['A4'], NOTES['D5']],
        [NOTES['Bb3'], NOTES['D4'], NOTES['F4'], NOTES['Bb4']],
        [NOTES['G3'], NOTES['Bb3'], NOTES['D4'], NOTES['G4']],
        [NOTES['A3'], NOTES['C#4'], NOTES['E4'], NOTES['A4']],
    ]
    for b in range(4, 24):
        scale = harp_scale[b % len(harp_scale)]
        for beat in range(4):
            note = scale[beat % len(scale)]
            pluck = synth_harp_pluck(note, dur=2.0)
            pan = (beat - 1.5) * 0.35
            mix_mono(pluck, at(b, beat), pan=pan, gain=0.6)

    # 5. Distant Warhorns (Bars 12-20: The Apex Terror Chapter)
    for b in [12, 14, 16, 18]:
        horn_note = NOTES['D3'] if b < 16 else NOTES['A2']
        horn = synth_warhorn(horn_note, dur=3.8)
        mix_mono(horn, at(b, 1), pan=0.25, gain=0.85)

    # 6. Sacred Iron Kettlebell Clangs (Bars 20-27: The Sacrament of Iron)
    for b in range(20, 28):
        if b % 2 == 0:
            clang = synth_anvil_clang(NOTES['D4'], dur=2.0)
            mix_mono(clang, at(b, 0), pan=-0.1, gain=0.9)
            mix_mono(clang, at(b, 2), pan=0.1, gain=0.75)

    master = np.stack([left, right], axis=1)
    # Master soft limiter and normalization
    master = np.tanh(master * 1.15)
    peak = np.max(np.abs(master))
    if peak > 0:
        master = (master / peak) * 0.95

    raw_wav = "work/music/cinematic_prologue.wav"
    out_mp3 = f"{ASSETS_DIR}/cinematic_prologue.mp3"
    os.makedirs("work/music", exist_ok=True)
    write_wav(raw_wav, master)
    convert_to_mp3(raw_wav, out_mp3)
    print(f"[✓] Rendered Dark Fantasy Cinematic Soundtrack -> {out_mp3}")

if __name__ == "__main__":
    compose_cinematic_prologue()
