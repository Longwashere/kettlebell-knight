#!/usr/bin/env python3
"""
Craft Signature Thematic Battle Soundtracks for Every Map
=========================================================
Generates 100% instrumental, high-energy workout battle music tailored to each map:
  - NO lyrics, NO voices, NO spoken words. Pure instrumental dark fantasy gaming music.
  - 128 - 136 BPM workout tempo designed for kettlebell cadences.
  - Distinct signature instrumentation for each unique realm:
      1. VERDANT_FOREST   - Primal wood drums, sylvan flute melody, organic forest bounce
      2. DARK_FOREST      - Eerie plucked strings, corrupted briar drones, shadowy 808s
      3. TOWN_SQUARE      - Medieval street skirmish, war snares, market tambourines & lutes
      4. TOWN_NIGHT       - Moonlit siege variant, stealthy nocturnal percussion, dark bells
      5. SUNKEN_CISTERN   - Aquatic metallic gamelan, cavernous reverb, tidal abyss drops
      6. CATHEDRAL_CRYPT  - Tolling crypt bells, bone-xylophone clatter, gothic organ pads
      7. BLOOD_CEMETERY   - Blood-moon horror, aggressive low brass braams, distorted bass
      8. BELFRY_RAMPARTS  - Roaring gale winds, galloping siege drums, soaring heroic brass
      9. CATHEDRAL_VAULT  - Clockwork gears, industrial anvil strikes, automaton stomps
     10. VOLCANIC_FORGE   - Molten forge anvils, blistering synth leads, volcanic sub rumbles
     11. ELDRITCH_ALTAR   - Cosmic void rifts, astral arpeggios, otherworldly dark drones
     12. OBSIDIAN_THRONE  - Supreme imperial warhorns, climactic timpani, royal majesty
"""

import os
import subprocess
import wave
import numpy as np

SR = 44100
ASSETS_DIR = "public/assets/music"
MUSIC_DIR = "work/music"
os.makedirs(ASSETS_DIR, exist_ok=True)
os.makedirs(MUSIC_DIR, exist_ok=True)

# -----------------------------------------------------------------------------
# Core DSP & Synthesis Kit
# -----------------------------------------------------------------------------

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
        "-af", "acompressor=threshold=-12dB:ratio=2.5:attack=5:release=80,loudnorm=I=-14:LRA=7:TP=-1.0",
        mp3_out
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

class TrackBuilder:
    def __init__(self, bpm=132, bars=24):
        self.bpm = bpm
        self.beat_sec = 60.0 / bpm
        self.bar_sec = self.beat_sec * 4.0
        self.total_sec = bars * self.bar_sec
        self.n_samples = int(round(self.total_sec * SR))
        self.left = np.zeros(self.n_samples, dtype=np.float32)
        self.right = np.zeros(self.n_samples, dtype=np.float32)

    def sample_at(self, bar, beat=0, sixteenth=0):
        t = bar * self.bar_sec + beat * self.beat_sec + sixteenth * (self.beat_sec / 4.0)
        return int(round(t * SR))

    def mix_mono(self, src, start_sample, pan=0.0, gain=1.0):
        if start_sample >= self.n_samples or start_sample < 0:
            return
        end = min(self.n_samples, start_sample + len(src))
        s_len = end - start_sample
        ang = ((np.clip(pan, -1.0, 1.0) + 1.0) * np.pi) / 4.0
        g_l = np.cos(ang) * gain
        g_r = np.sin(ang) * gain
        self.left[start_sample:end] += src[:s_len] * g_l
        self.right[start_sample:end] += src[:s_len] * g_r

    def mix_stereo(self, src_l, src_r, start_sample, gain=1.0):
        if start_sample >= self.n_samples or start_sample < 0:
            return
        end = min(self.n_samples, start_sample + len(src_l))
        s_len = end - start_sample
        self.left[start_sample:end] += src_l[:s_len] * gain
        self.right[start_sample:end] += src_r[:s_len] * gain

    def export(self, raw_wav, final_mp3):
        master = np.stack([self.left, self.right], axis=1)
        # Soft saturation & normalise
        master = np.tanh(master * 1.1)
        pk = np.max(np.abs(master))
        if pk > 0:
            master = (master / pk) * 0.95
        write_wav(raw_wav, master)
        convert_to_mp3(raw_wav, final_mp3)

# -----------------------------------------------------------------------------
# Modular Instrument Synthesizers (NO VOICES / NO WORDS)
# -----------------------------------------------------------------------------

def synth_kick(punchy=True, dur=0.35):
    n = int(round(dur * SR))
    t = np.linspace(0, dur, n, endpoint=False)
    f0 = 150.0 if punchy else 110.0
    f_end = 46.0
    f = f_end + (f0 - f_end) * np.exp(-t * 36.0)
    phase = 2 * np.pi * np.cumsum(f) / SR
    click = np.random.uniform(-1, 1, n) * np.exp(-t * 260) * 0.4
    body = np.sin(phase) * np.exp(-t / 0.12)
    return (body * 0.9 + click).astype(np.float32)

def synth_snare(tight=True, dur=0.28):
    n = int(round(dur * SR))
    t = np.linspace(0, dur, n, endpoint=False)
    tone = np.sin(2 * np.pi * 210 * t) * np.exp(-t * 35.0) * 0.4
    decay = 18.0 if tight else 12.0
    noise = np.random.uniform(-1, 1, n) * np.exp(-t * decay) * 0.7
    return (tone + noise).astype(np.float32)

def synth_hihat(open_hat=False):
    dur = 0.22 if open_hat else 0.05
    n = int(round(dur * SR))
    t = np.linspace(0, dur, n, endpoint=False)
    env = np.exp(-t * 14.0) if open_hat else np.exp(-t * 70.0)
    noise = np.random.uniform(-1, 1, n) * env
    # Simple high-pass
    return (noise - np.roll(noise, 1)).astype(np.float32) * 0.6

def synth_808(f=55.0, dur=1.0, slide_to=None):
    n = int(round(dur * SR))
    t = np.linspace(0, dur, n, endpoint=False)
    if slide_to:
        f_curve = f + (slide_to - f) * (t / dur)**2
    else:
        f_curve = np.full(n, f)
    phase = 2 * np.pi * np.cumsum(f_curve) / SR
    env = np.minimum(1.0, t / 0.015) * np.exp(-t / (dur * 0.7))
    sub = (np.sin(phase) + 0.25 * np.sin(phase * 2.0)) * env
    return np.tanh(sub * 1.3).astype(np.float32)

def synth_bell(f0=220.0, dur=3.5, dark=True):
    n = int(round(dur * SR))
    t = np.linspace(0, dur, n, endpoint=False)
    partials = [
        (0.5, 0.6, 3.5),
        (1.0, 0.8, 2.5),
        (1.189 if dark else 1.25, 0.7, 2.0),
        (1.5, 0.5, 1.8),
        (2.0, 0.6, 1.2),
        (2.76, 0.4, 0.8),
        (4.07, 0.3, 0.5),
    ]
    out = np.zeros(n, dtype=np.float32)
    for mult, amp, dec in partials:
        out += amp * np.sin(2 * np.pi * f0 * mult * t) * np.exp(-t / dec)
    trans = np.random.uniform(-1, 1, n) * np.exp(-t * 80) * 0.3
    return (out + trans) / (np.max(np.abs(out)) + 1e-6)

def synth_horn(f0=110.0, dur=1.8):
    n = int(round(dur * SR))
    t = np.linspace(0, dur, n, endpoint=False)
    p = f0 * (1.0 + 0.05 * np.exp(-t * 20.0))
    phase = 2 * np.pi * np.cumsum(p) / SR
    raw = np.sin(phase) + 0.6 * np.sin(phase * 2) + 0.8 * np.sin(phase * 3) + 0.3 * np.sin(phase * 5)
    env = np.minimum(1.0, t / 0.06) * np.exp(-t / 1.2)
    return np.tanh(raw * 1.5 * env).astype(np.float32)

def synth_string_saw(f=146.83, dur=0.25):
    n = int(round(dur * SR))
    t = np.linspace(0, dur, n, endpoint=False)
    saw = np.zeros(n, dtype=np.float32)
    for h in range(1, 8):
        saw += (1.0 / h) * np.sin(2 * np.pi * f * h * t)
    env = np.minimum(1.0, t / 0.02) * np.exp(-t / (dur * 0.8))
    return saw * env

def synth_flute(f=293.66, dur=0.6):
    n = int(round(dur * SR))
    t = np.linspace(0, dur, n, endpoint=False)
    vib = np.sin(2 * np.pi * 5.2 * t) * (f * 0.015) if dur > 0.3 else 0
    phase = 2 * np.pi * np.cumsum(f + vib) / SR
    sine = np.sin(phase) + 0.2 * np.sin(phase * 2) + 0.15 * np.sin(phase * 3)
    breath = np.random.uniform(-1, 1, n) * 0.08 * np.exp(-t * 15)
    env = np.minimum(1.0, t / 0.04) * np.maximum(0.0, 1.0 - t / dur)
    return ((sine + breath) * env).astype(np.float32)

def synth_anvil(f=880.0, dur=0.5):
    n = int(round(dur * SR))
    t = np.linspace(0, dur, n, endpoint=False)
    ring = np.sin(2 * np.pi * f * t) + np.sin(2 * np.pi * (f * 1.414) * t) * 0.6 + np.sin(2 * np.pi * (f * 2.73) * t) * 0.4
    env = np.exp(-t * 12.0)
    clang = np.random.uniform(-1, 1, n) * np.exp(-t * 120.0) * 0.6
    return ((ring * env + clang) * 0.8).astype(np.float32)

# Full chromatic note frequencies
class NotesDict(dict):
    def __init__(self):
        super().__init__()
        semis = {'C': 0, 'C#': 1, 'DB': 1, 'D': 2, 'D#': 3, 'EB': 3, 'E': 4,
                 'F': 5, 'F#': 6, 'GB': 6, 'G': 7, 'G#': 8, 'AB': 8, 'A': 9,
                 'A#': 10, 'BB': 10, 'B': 11}
        for octv in range(0, 9):
            for name, val in semis.items():
                midi = (octv + 1) * 12 + val
                freq = 440.0 * (2.0 ** ((midi - 69) / 12.0))
                self[f"{name}{octv}"] = freq

NOTES = NotesDict()

# -----------------------------------------------------------------------------
# Map 1: VERDANT FOREST — Sylvan Woodlands & Primal Thickets
# -----------------------------------------------------------------------------
def build_verdant_forest():
    print("[*] Composing Map 1: VERDANT FOREST...")
    tb = TrackBuilder(bpm=130, bars=28)
    kick = synth_kick(punchy=True)
    snare = synth_snare(tight=True)
    hat_c = synth_hihat(False)
    hat_o = synth_hihat(True)

    for b in range(28):
        # Rhythm: 130 BPM syncopated woodland bounce
        tb.mix_mono(kick, tb.sample_at(b, 0), gain=1.1)
        tb.mix_mono(snare, tb.sample_at(b, 1), gain=0.95, pan=0.05)
        tb.mix_mono(kick, tb.sample_at(b, 1, 2), gain=0.85) # syncopated bounce!
        tb.mix_mono(snare, tb.sample_at(b, 3), gain=0.95, pan=-0.05)
        if b % 2 == 1:
            tb.mix_mono(kick, tb.sample_at(b, 2, 2), gain=0.75)

        for step in range(16):
            if step % 4 == 2:
                tb.mix_mono(hat_o, tb.sample_at(b, 0, step), gain=0.5, pan=0.2)
            else:
                tb.mix_mono(hat_c, tb.sample_at(b, 0, step), gain=0.4, pan=-0.2)

        # Warm Forest 808 Sub in D minor / G
        root = NOTES['D1'] if b % 4 < 2 else NOTES['G1']
        sub = synth_808(root, tb.beat_sec * 1.5)
        tb.mix_mono(sub, tb.sample_at(b, 0), gain=1.0)
        tb.mix_mono(sub, tb.sample_at(b, 2), gain=0.85)

        # Sylvan Wooden Flute Melody (Pentatonic: D4, F4, G4, A4, C5)
        melody_notes = [NOTES['D4'], NOTES['F4'], NOTES['A4'], NOTES['G4'], NOTES['F4'], NOTES['D4']]
        note = melody_notes[(b * 2) % len(melody_notes)]
        fl = synth_flute(note, tb.beat_sec * 1.2)
        tb.mix_mono(fl, tb.sample_at(b, 1), gain=0.9, pan=0.15)

    return tb

# -----------------------------------------------------------------------------
# Map 2: DARK FOREST — Corrupted Briars & Bloodwood Pines
# -----------------------------------------------------------------------------
def build_dark_forest():
    print("[*] Composing Map 2: DARK FOREST...")
    tb = TrackBuilder(bpm=132, bars=28)
    kick = synth_kick(punchy=True)
    snare = synth_snare(tight=False)
    bell = synth_bell(NOTES['B2'], dur=3.0, dark=True)

    for b in range(28):
        tb.mix_mono(kick, tb.sample_at(b, 0), gain=1.1)
        tb.mix_mono(snare, tb.sample_at(b, 1), gain=1.0)
        tb.mix_mono(kick, tb.sample_at(b, 2, 2), gain=0.9)
        tb.mix_mono(snare, tb.sample_at(b, 3), gain=1.0)

        # Creepy Plucked Strings in B minor (B2, D3, F#3)
        for st in range(16):
            if st % 2 == 0:
                n = NOTES['B2'] if st % 4 == 0 else NOTES['D3']
                plk = synth_string_saw(n, tb.beat_sec / 2.0)
                tb.mix_mono(plk, tb.sample_at(b, 0, st), gain=0.6, pan=0.25 if st % 4 == 0 else -0.25)

        # Sub bass glide
        sub = synth_808(NOTES['B1'], tb.beat_sec * 1.8, slide_to=NOTES['F1'] if b % 4 == 3 else None)
        tb.mix_mono(sub, tb.sample_at(b, 0), gain=1.1)

        # Distant ominous bell toll every 4 bars
        if b % 4 == 0:
            tb.mix_mono(bell, tb.sample_at(b, 0), gain=0.85, pan=-0.3)

    return tb

# -----------------------------------------------------------------------------
# Map 3 & 4: TOWN SQUARE / TOWN NIGHT — Besieged Streets & Market Alleys
# -----------------------------------------------------------------------------
def build_town_square(is_night=False):
    name = "TOWN NIGHT" if is_night else "TOWN SQUARE"
    print(f"[*] Composing Map: {name}...")
    bpm = 129 if is_night else 131
    tb = TrackBuilder(bpm=bpm, bars=28)
    kick = synth_kick(punchy=True)
    snare = synth_snare(tight=True)
    anvil = synth_anvil(700.0 if is_night else 880.0)

    for b in range(28):
        tb.mix_mono(kick, tb.sample_at(b, 0), gain=1.05)
        tb.mix_mono(snare, tb.sample_at(b, 1), gain=1.0)
        tb.mix_mono(kick, tb.sample_at(b, 1, 2), gain=0.8)
        tb.mix_mono(snare, tb.sample_at(b, 3), gain=1.0)

        # Tambourine / market metal rattle
        for st in range(16):
            if st % 2 == 1:
                tb.mix_mono(anvil, tb.sample_at(b, 0, st), gain=0.35 if is_night else 0.45, pan=0.2)

        # Lute/Dulcimer battle motif in A minor
        chord = [NOTES['A2'], NOTES['C3'], NOTES['E3']]
        for step in [0, 4, 8, 12]:
            note = chord[(step // 4) % len(chord)]
            plk = synth_string_saw(note, tb.beat_sec * 0.8)
            tb.mix_mono(plk, tb.sample_at(b, 0, step), gain=0.75, pan=-0.15)

        # Punchy marching bass
        sub = synth_808(NOTES['A1'], tb.beat_sec * 1.4)
        tb.mix_mono(sub, tb.sample_at(b, 0), gain=1.0)
        tb.mix_mono(sub, tb.sample_at(b, 2), gain=0.8)

    return tb

# -----------------------------------------------------------------------------
# Map 5: SUNKEN CISTERN — Subterranean Aqueducts & Abyssal Sluices
# -----------------------------------------------------------------------------
def build_sunken_cistern():
    print("[*] Composing Map 5: SUNKEN CISTERN...")
    tb = TrackBuilder(bpm=130, bars=28)
    kick = synth_kick(punchy=False) # deeper sub kick
    snare = synth_snare(tight=False) # wet splashy snare
    gamelan = synth_bell(NOTES['E3'], dur=2.0, dark=False) # resonant water droplet tone

    for b in range(28):
        tb.mix_mono(kick, tb.sample_at(b, 0), gain=1.15)
        tb.mix_mono(snare, tb.sample_at(b, 1), gain=0.9, pan=-0.1)
        tb.mix_mono(kick, tb.sample_at(b, 2, 2), gain=0.85)
        tb.mix_mono(snare, tb.sample_at(b, 3), gain=0.95, pan=0.1)

        # Aquatic metallic gamelan strikes
        if b % 2 == 0:
            tb.mix_mono(gamelan, tb.sample_at(b, 0), gain=0.8, pan=-0.25)
            tb.mix_mono(gamelan, tb.sample_at(b, 2), gain=0.6, pan=0.25)
        else:
            tb.mix_mono(gamelan, tb.sample_at(b, 1, 2), gain=0.75, pan=0.2)

        # Deep tidal sub sweep (E minor / C)
        root = NOTES['E1'] if b % 4 < 2 else NOTES['C1']
        sub = synth_808(root, tb.beat_sec * 1.8)
        tb.mix_mono(sub, tb.sample_at(b, 0), gain=1.15)

    return tb

# -----------------------------------------------------------------------------
# Map 6: CATHEDRAL CRYPT — Catacombs & Osseous Sepulchers
# -----------------------------------------------------------------------------
def build_cathedral_crypt():
    print("[*] Composing Map 6: CATHEDRAL CRYPT...")
    tb = TrackBuilder(bpm=132, bars=28)
    kick = synth_kick(punchy=True)
    snare = synth_snare(tight=True)
    crypt_bell = synth_bell(NOTES['C2'], dur=3.5, dark=True)
    horn = synth_horn(NOTES['C2'], dur=2.0)

    for b in range(28):
        tb.mix_mono(kick, tb.sample_at(b, 0), gain=1.1)
        tb.mix_mono(snare, tb.sample_at(b, 1), gain=1.0)
        tb.mix_mono(kick, tb.sample_at(b, 1, 2), gain=0.85)
        tb.mix_mono(snare, tb.sample_at(b, 3), gain=1.0)

        # Bone-xylophone clatter
        for st in range(16):
            if st % 4 in [1, 3]:
                bone = synth_anvil(1200.0 + (st * 80), dur=0.12)
                tb.mix_mono(bone, tb.sample_at(b, 0, st), gain=0.45, pan=-0.2 if st % 2 == 0 else 0.2)

        # Funeral Bell toll every 4 bars
        if b % 4 == 0:
            tb.mix_mono(crypt_bell, tb.sample_at(b, 0), gain=1.0, pan=0.0)

        # Dark brass horn call on bar 2 of every 4 bars
        if b % 4 == 2:
            tb.mix_mono(horn, tb.sample_at(b, 0), gain=0.9, pan=0.15)

        # Heavy crypt sub in C minor
        sub = synth_808(NOTES['C1'], tb.beat_sec * 1.6)
        tb.mix_mono(sub, tb.sample_at(b, 0), gain=1.1)

    return tb

# -----------------------------------------------------------------------------
# Map 7: BLOOD CEMETERY — Crimson Moon & Mausoleums
# -----------------------------------------------------------------------------
def build_blood_cemetery():
    print("[*] Composing Map 7: BLOOD CEMETERY...")
    tb = TrackBuilder(bpm=134, bars=28)
    kick = synth_kick(punchy=True)
    snare = synth_snare(tight=True)
    warhorn = synth_horn(NOTES['D2'], dur=2.2)

    for b in range(28):
        tb.mix_mono(kick, tb.sample_at(b, 0), gain=1.2)
        tb.mix_mono(snare, tb.sample_at(b, 1), gain=1.05)
        tb.mix_mono(kick, tb.sample_at(b, 1, 2), gain=0.9)
        tb.mix_mono(snare, tb.sample_at(b, 3), gain=1.05)
        if b % 2 == 1:
            tb.mix_mono(kick, tb.sample_at(b, 2, 2), gain=0.85)

        # Relentless blood-moon braam brass every 2 bars
        if b % 2 == 0:
            tb.mix_mono(warhorn, tb.sample_at(b, 0), gain=1.0, pan=-0.15)
        else:
            tb.mix_mono(warhorn, tb.sample_at(b, 2), gain=0.9, pan=0.15)

        # Distorted 808 sub in D minor
        sub = synth_808(NOTES['D1'], tb.beat_sec * 1.5)
        tb.mix_mono(sub, tb.sample_at(b, 0), gain=1.2)
        tb.mix_mono(sub, tb.sample_at(b, 2), gain=0.9)

    return tb

# -----------------------------------------------------------------------------
# Map 8: BELFRY RAMPARTS — Storm-Lashed Towers & Parapets
# -----------------------------------------------------------------------------
def build_belfry_ramparts():
    print("[*] Composing Map 8: BELFRY RAMPARTS...")
    # Fast 136 BPM cardio pace for high rampart storm winds!
    tb = TrackBuilder(bpm=136, bars=28)
    kick = synth_kick(punchy=True)
    snare = synth_snare(tight=True)
    hat_c = synth_hihat(False)
    high_bell = synth_bell(NOTES['G3'], dur=2.0, dark=False)

    for b in range(28):
        # Galloping siege rhythm
        tb.mix_mono(kick, tb.sample_at(b, 0), gain=1.1)
        tb.mix_mono(snare, tb.sample_at(b, 1), gain=1.0)
        tb.mix_mono(kick, tb.sample_at(b, 1, 2), gain=0.85)
        tb.mix_mono(kick, tb.sample_at(b, 2), gain=0.8)
        tb.mix_mono(snare, tb.sample_at(b, 3), gain=1.0)

        # Rapid rolling storm percussion
        for st in range(16):
            tb.mix_mono(hat_c, tb.sample_at(b, 0, st), gain=0.5, pan=np.sin(st))

        # High clarion tower bell
        if b % 4 == 0:
            tb.mix_mono(high_bell, tb.sample_at(b, 0), gain=0.9, pan=0.2)
        elif b % 4 == 2:
            tb.mix_mono(high_bell, tb.sample_at(b, 0), gain=0.85, pan=-0.2)

        # Driving sub bass in G minor
        sub = synth_808(NOTES['G1'], tb.beat_sec * 1.4)
        tb.mix_mono(sub, tb.sample_at(b, 0), gain=1.1)

    return tb

# -----------------------------------------------------------------------------
# Map 9: CATHEDRAL VAULT — Clockwork Automata & Armored Treasury
# -----------------------------------------------------------------------------
def build_cathedral_vault():
    print("[*] Composing Map 9: CATHEDRAL VAULT...")
    tb = TrackBuilder(bpm=131, bars=28)
    kick = synth_kick(punchy=True)
    snare = synth_snare(tight=True)
    anvil = synth_anvil(650.0)

    for b in range(28):
        tb.mix_mono(kick, tb.sample_at(b, 0), gain=1.15)
        tb.mix_mono(snare, tb.sample_at(b, 1), gain=0.95)
        tb.mix_mono(kick, tb.sample_at(b, 1, 2), gain=0.8)
        tb.mix_mono(snare, tb.sample_at(b, 3), gain=0.95)

        # Clockwork gear tick-tock & industrial anvil strikes
        for st in range(16):
            if st % 2 == 0:
                tb.mix_mono(anvil, tb.sample_at(b, 0, st), gain=0.5 if st in [0, 8] else 0.3, pan=-0.2 if st % 4 == 0 else 0.2)

        # Mechanical bass groove in F minor
        sub = synth_808(NOTES['F1'], tb.beat_sec * 1.5)
        tb.mix_mono(sub, tb.sample_at(b, 0), gain=1.1)
        tb.mix_mono(sub, tb.sample_at(b, 2), gain=0.9)

    return tb

# -----------------------------------------------------------------------------
# Map 10: VOLCANIC FORGE — Molten Basalt & Brimstone Caldera
# -----------------------------------------------------------------------------
def build_volcanic_forge():
    print("[*] Composing Map 10: VOLCANIC FORGE...")
    tb = TrackBuilder(bpm=134, bars=28)
    kick = synth_kick(punchy=True)
    snare = synth_snare(tight=True)
    heavy_anvil = synth_anvil(440.0)
    forge_horn = synth_horn(NOTES['E2'], dur=2.0)

    for b in range(28):
        tb.mix_mono(kick, tb.sample_at(b, 0), gain=1.2)
        tb.mix_mono(snare, tb.sample_at(b, 1), gain=1.05)
        tb.mix_mono(kick, tb.sample_at(b, 1, 2), gain=0.9)
        tb.mix_mono(snare, tb.sample_at(b, 3), gain=1.05)
        if b % 2 == 1:
            tb.mix_mono(kick, tb.sample_at(b, 2, 2), gain=0.85)

        # Titan's hammer anvil smashes on downbeats
        if b % 2 == 0:
            tb.mix_mono(heavy_anvil, tb.sample_at(b, 0), gain=0.9, pan=0.0)

        # Molten brass warhorn in E minor
        if b % 4 in [1, 3]:
            tb.mix_mono(forge_horn, tb.sample_at(b, 1), gain=0.95, pan=0.2)

        # Scorching low sub bass
        sub = synth_808(NOTES['E1'], tb.beat_sec * 1.6)
        tb.mix_mono(sub, tb.sample_at(b, 0), gain=1.2)

    return tb

# -----------------------------------------------------------------------------
# Map 11: ELDRITCH ALTAR — Sacrificial Void Rift & Abyssal Circle
# -----------------------------------------------------------------------------
def build_eldritch_altar():
    print("[*] Composing Map 11: ELDRITCH ALTAR...")
    tb = TrackBuilder(bpm=132, bars=28)
    kick = synth_kick(punchy=False)
    snare = synth_snare(tight=False)
    altar_bell = synth_bell(NOTES['F#2'], dur=3.8, dark=True)

    for b in range(28):
        tb.mix_mono(kick, tb.sample_at(b, 0), gain=1.1)
        tb.mix_mono(snare, tb.sample_at(b, 1), gain=0.95)
        tb.mix_mono(kick, tb.sample_at(b, 2, 2), gain=0.85)
        tb.mix_mono(snare, tb.sample_at(b, 3), gain=0.95)

        # Dissonant cosmic arpeggio in F# diminished (F#3, A3, C4)
        dim_notes = [NOTES['F#3'], NOTES['A3'], NOTES['C4'], NOTES['D#4']]
        for st in range(16):
            if st % 2 == 0:
                n = dim_notes[(st // 2) % len(dim_notes)]
                fl = synth_string_saw(n, tb.beat_sec * 0.4)
                tb.mix_mono(fl, tb.sample_at(b, 0, st), gain=0.55, pan=-0.25 if st % 4 == 0 else 0.25)

        # Eerie cosmic bell
        if b % 4 == 0:
            tb.mix_mono(altar_bell, tb.sample_at(b, 0), gain=0.9, pan=0.0)

        # Pitch-sliding black hole 808 sub
        slide = NOTES['C1'] if b % 2 == 1 else None
        sub = synth_808(NOTES['F1'], tb.beat_sec * 1.8, slide_to=slide)
        tb.mix_mono(sub, tb.sample_at(b, 0), gain=1.2)

    return tb

# -----------------------------------------------------------------------------
# Map 12: OBSIDIAN THRONE — Citadel of the Ruined Sovereign (Climax)
# -----------------------------------------------------------------------------
def build_obsidian_throne():
    print("[*] Composing Map 12: OBSIDIAN THRONE...")
    tb = TrackBuilder(bpm=135, bars=32)
    kick = synth_kick(punchy=True)
    snare = synth_snare(tight=True)
    throne_bell = synth_bell(NOTES['D2'], dur=4.0, dark=True)
    royal_horn_D = synth_horn(NOTES['D2'], dur=2.4)
    royal_horn_A = synth_horn(NOTES['A2'], dur=2.4)

    for b in range(32):
        # Climax battle pulse
        tb.mix_mono(kick, tb.sample_at(b, 0), gain=1.25)
        tb.mix_mono(snare, tb.sample_at(b, 1), gain=1.1)
        tb.mix_mono(kick, tb.sample_at(b, 1, 2), gain=0.95)
        tb.mix_mono(snare, tb.sample_at(b, 3), gain=1.1)
        if b % 2 == 1:
            tb.mix_mono(kick, tb.sample_at(b, 2, 2), gain=0.9)

        # Tolling imperial bell on key cadences
        if b % 4 == 0:
            tb.mix_mono(throne_bell, tb.sample_at(b, 0), gain=1.1, pan=-0.2)

        # Supreme brass warhorns in royal D minor
        if b % 4 in [0, 2]:
            tb.mix_mono(royal_horn_D, tb.sample_at(b, 0), gain=1.05, pan=-0.1)
        else:
            tb.mix_mono(royal_horn_A, tb.sample_at(b, 2), gain=1.05, pan=0.1)

        # Chugging string ostinatos (bars 8 to 32)
        if b >= 8:
            for st in range(16):
                saw = synth_string_saw(NOTES['D3'] if st % 2 == 0 else NOTES['A2'], tb.beat_sec * 0.3)
                tb.mix_mono(saw, tb.sample_at(b, 0, st), gain=0.55, pan=0.0)

        # Earth-shaking sub drops
        sub = synth_808(NOTES['D1'], tb.beat_sec * 1.6)
        tb.mix_mono(sub, tb.sample_at(b, 0), gain=1.25)

    return tb

# -----------------------------------------------------------------------------
# Batch Render All Map Soundtracks
# -----------------------------------------------------------------------------

MAP_BUILDERS = {
    'verdant_forest': build_verdant_forest,
    'dark_forest': build_dark_forest,
    'town_square': lambda: build_town_square(is_night=False),
    'town_night': lambda: build_town_square(is_night=True),
    'sunken_cistern': build_sunken_cistern,
    'cathedral_crypt': build_cathedral_crypt,
    'blood_cemetery': build_blood_cemetery,
    'belfry_ramparts': build_belfry_ramparts,
    'cathedral_vault': build_cathedral_vault,
    'volcanic_forge': build_volcanic_forge,
    'eldritch_altar': build_eldritch_altar,
    'obsidian_throne': build_obsidian_throne,
}

def render_all():
    print(f"\n{'='*70}\nRendering 12 Pure Instrumental Signature Map Battle Soundtracks\n{'='*70}")
    for map_key, builder_fn in MAP_BUILDERS.items():
        raw_wav = os.path.join(MUSIC_DIR, f"battle_{map_key}.wav")
        final_mp3 = os.path.join(ASSETS_DIR, f"battle_{map_key}.mp3")
        work_mp3 = os.path.join(MUSIC_DIR, f"battle_{map_key}.mp3")
        
        tb = builder_fn()
        tb.export(raw_wav, final_mp3)
        # Also copy to work/music
        subprocess.run(["cp", final_mp3, work_mp3], check=True)
        size_kb = os.path.getsize(final_mp3) / 1024
        print(f"  [+] {map_key.upper():20s} -> {final_mp3} ({size_kb:.0f} KB, {tb.total_sec:.1f}s @ {tb.bpm} BPM)")

    print(f"\n{'='*70}\n[+] SUCCESS! All map soundtracks rendered with zero lyrics/words.\n{'='*70}")

if __name__ == '__main__':
    render_all()
